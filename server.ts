import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// PILLAR 4: SAFETY & LOG SANITIZATION MIDDLEWARE
// ==========================================
// Mask sensitive headers in logs and console outputs
app.use((req: Request, res: Response, next: NextFunction) => {
  const sanitizedHeaders = { ...req.headers };
  const sensitiveHeaderKeys = [
    'authorization',
    'x-github-token',
    'x-jules-key',
    'x-api-key',
    'x-auth-token',
  ];

  for (const key of Object.keys(sanitizedHeaders)) {
    if (sensitiveHeaderKeys.includes(key.toLowerCase())) {
      sanitizedHeaders[key] = '[REDACTED_SECRET]';
    }
  }

  // Request logger with sanitized credentials
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.url.startsWith('/@') && !req.url.startsWith('/node_modules') && !req.url.startsWith('/src')) {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
});

// ==========================================
// PILLAR 4: RATE LIMITING
// ==========================================
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded on Gemini API proxy. Please wait a moment.' },
});

const githubLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Max 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded on GitHub API proxy. Please wait a moment.' },
});

app.use('/api/gemini/', geminiLimiter);
app.use('/api/github/', githubLimiter);

// ==========================================
// PILLAR 1: IN-MEMORY CONTEXT CACHE
// ==========================================
interface CachedRepoData {
  summary: string;
  defaultBranch: string;
  treeSummary: string[];
  relevantFiles: string[];
  testDirs: string[];
  hasCI: boolean;
  ciDetails: string;
  manifestType: string;
  manifestContent: string;
  rawReadmeSnippet: string;
  fetchedAt: string;
  cachedAt: number;
}
const repoContextCache = new Map<string, CachedRepoData>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes session cache

// Initialize Gemini Client (Lazy / Safe)
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Helper for extracting credentials safely from Headers first
function extractGitHubToken(req: Request): string | undefined {
  const headerToken = req.headers['x-github-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return undefined;
}

function extractJulesKey(req: Request): string | undefined {
  const headerKey = req.headers['x-jules-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  return undefined;
}

function getGitHubHeaders(token?: string, rawDiff = false) {
  const headers: Record<string, string> = {
    'Accept': rawDiff ? 'application/vnd.github.v3.diff' : 'application/vnd.github+json',
    'User-Agent': 'Jules-RepoMission-Studio',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }
  return headers;
}

// ==========================================
// 1. API: Test GitHub Connection
// ==========================================
app.post('/api/github/test-connection', async (req, res) => {
  try {
    const token = extractGitHubToken(req) || req.body?.token;
    const { baseUrl = 'https://api.github.com' } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'No GitHub token provided in X-GitHub-Token header' });
    }
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/user`, {
      headers: getGitHubHeaders(token),
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, message: `GitHub API error: ${response.statusText}`, detail: errText });
    }
    const userData = await response.json() as { login?: string; name?: string; html_url?: string };
    return res.json({
      success: true,
      user: {
        login: userData.login,
        name: userData.name,
        html_url: userData.html_url,
      },
      scopes: response.headers.get('x-oauth-scopes') || 'fine-grained/read-write',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to connect to GitHub' });
  }
});

// ==========================================
// 2. API: Fetch Repository Context with In-Memory Caching
// ==========================================
app.post('/api/repo/fetch-context', async (req, res) => {
  try {
    const token = extractGitHubToken(req) || req.body?.token;
    const { repo, baseBranch = 'main', baseUrl = 'https://api.github.com', forceRefresh = false } = req.body;
    if (!repo) {
      return res.status(400).json({ error: 'Repository owner/name is required' });
    }

    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required for live mode' });
    }

    const cacheKey = `${repo}:${baseBranch}`;
    const cached = repoContextCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      return res.json({
        ...cached,
        cached: true,
      });
    }

    // Live mode with GitHub REST API
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const repoRes = await fetch(`${cleanBaseUrl}/repos/${repo}`, {
      headers: getGitHubHeaders(token),
    });

    if (!repoRes.ok) {
      return res.status(repoRes.status).json({
        error: `Could not fetch repo ${repo}: ${repoRes.statusText}`,
      });
    }

    const repoData = await repoRes.json() as any;
    const defaultBranch = repoData.default_branch || baseBranch;

    // Fetch Readme
    let readmeSnippet = '';
    try {
      const readmeRes = await fetch(`${cleanBaseUrl}/repos/${repo}/readme`, {
        headers: getGitHubHeaders(token),
      });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json() as any;
        if (readmeData.content) {
          readmeSnippet = Buffer.from(readmeData.content, 'base64').toString('utf-8').slice(0, 1500);
        }
      }
    } catch {
      // ignore
    }

    // Fetch Manifest
    let manifestType = 'Unknown';
    let manifestContent = '';
    try {
      const manifestRes = await fetch(`${cleanBaseUrl}/repos/${repo}/contents/package.json?ref=${defaultBranch}`, {
        headers: getGitHubHeaders(token),
      });
      if (manifestRes.ok) {
        const manData = await manifestRes.json() as any;
        if (manData.content) {
          manifestType = 'package.json (Node.js/TS)';
          manifestContent = Buffer.from(manData.content, 'base64').toString('utf-8').slice(0, 2000);
        }
      }
    } catch {
      // ignore
    }

    // Fetch Repo Tree
    let treeSummary: string[] = [];
    let relevantFiles: string[] = [];
    let testDirs: string[] = [];
    let hasCI = false;

    try {
      const treeRes = await fetch(`${cleanBaseUrl}/repos/${repo}/git/trees/${defaultBranch}?recursive=1`, {
        headers: getGitHubHeaders(token),
      });
      if (treeRes.ok) {
        const treeData = await treeRes.json() as any;
        const allPaths = (treeData.tree || []).map((t: any) => t.path as string);
        treeSummary = allPaths.slice(0, 80);

        hasCI = allPaths.some((p: string) => p.startsWith('.github/workflows/'));
        testDirs = Array.from(new Set<string>(allPaths.filter((p: string) => p.includes('test') || p.includes('spec') || p.startsWith('tests/')))).slice(0, 5);

        relevantFiles = allPaths.filter((p: string) =>
          (p.startsWith('src/') || p.startsWith('lib/') || p.startsWith('app/')) &&
          (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.py') || p.endsWith('.go') || p.endsWith('.rs'))
        ).slice(0, 20);
      }
    } catch {
      // ignore
    }

    const fetchedContext: CachedRepoData = {
      summary: repoData.description || `GitHub repository ${repo} (${manifestType})`,
      defaultBranch,
      treeSummary,
      relevantFiles,
      testDirs,
      hasCI,
      ciDetails: hasCI ? 'GitHub Actions workflows detected' : 'No CI workflow detected in default branch',
      manifestType,
      manifestContent,
      rawReadmeSnippet: readmeSnippet,
      fetchedAt: new Date().toISOString(),
      cachedAt: Date.now(),
    };

    repoContextCache.set(cacheKey, fetchedContext);
    return res.json(fetchedContext);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error fetching repository context' });
  }
});

// ==========================================
// 3. API: Gemini Acceptance Criteria Generation
// ==========================================
const CRITERIA_SYSTEM_INSTRUCTION = `You are a Principal Software Architect and QA Lead specializing in autonomous agent specifications.
Given an engineering goal, repository context, and existing constraints, generate concrete, unambiguous, and testable acceptance criteria.
Each criterion must describe an observable outcome, edge case, schema contract, or error handling expectation that can be validated via tests and code diffs.
Return strictly the structured JSON object.`;

app.post('/api/gemini/generate-criteria', async (req, res) => {
  try {
    const {
      goal,
      repo,
      repoContext,
      existingCriteria = [],
      constraints = [],
      model = 'gemini-3.7-flash',
      temperature = 0.2,
    } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({ error: 'A goal statement is required to generate acceptance criteria.' });
    }

    const ai = getGeminiClient();

    const userPrompt = `
Goal: ${goal}
Repository: ${repo || 'Standard application codebase'}
Repository Context:
- Summary: ${repoContext?.summary || 'N/A'}
- Manifest: ${repoContext?.manifestType || 'N/A'}
- Test Directories: ${(repoContext?.testDirs || []).join(', ') || 'tests/'}

Existing Acceptance Criteria:
${existingCriteria.length > 0 ? existingCriteria.map((c: string, i: number) => `${i + 1}. ${c}`).join('\n') : '(None defined yet)'}

Constraints:
${constraints.length > 0 ? constraints.map((c: string) => `- ${c}`).join('\n') : '(None defined)'}

Generate 4 to 6 concise, comprehensive, and testable acceptance criteria for this goal. Avoid redundant duplicates of existing criteria. Also suggest 1-2 relevant engineering constraints if applicable.
`;

    if (ai) {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: CRITERIA_SYSTEM_INSTRUCTION,
          temperature,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              criteria: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of specific, verifiable acceptance criteria',
              },
              rationale: {
                type: Type.STRING,
                description: 'Brief rationale explaining the verification focus',
              },
              suggestedConstraints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Recommended engineering safeguards or path constraints',
              },
            },
            required: ['criteria', 'rationale'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json({
        criteria: Array.isArray(parsed.criteria) ? parsed.criteria : [],
        rationale: parsed.rationale || 'Synthesized based on goal objectives and repository conventions.',
        suggestedConstraints: Array.isArray(parsed.suggestedConstraints) ? parsed.suggestedConstraints : [],
      });
    } else {
      return res.status(503).json({ error: 'GEMINI_API_KEY is required to generate acceptance criteria in live mode.' });
    }
  } catch (err: any) {
    console.error('Criteria generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate acceptance criteria' });
  }
});

// ==========================================
// 4. API: Gemini Plan Generation (Standard & Stream SSE)
// ==========================================
const PLANNER_SYSTEM_INSTRUCTION = `You are a Principal Engineer decomposing a goal for an autonomous agent.
Rules:
1. Break into tasks < 200 lines of code.
2. Identify exact \`expected_paths\` and \`forbidden_paths\`.
3. If a task requires database schema changes or critical auth changes, flag it as \`high_risk\` (risk: "high") and require human approval.
4. If test_first_mode is requested, split each feature task into: (a) write failing test suite, then (b) implement logic to satisfy tests.
Output strictly as the provided JSON schema.`;

app.post('/api/gemini/plan', async (req, res) => {
  try {
    const { goalInput, repoContext, temperature = 0.2, model = 'gemini-3.7-flash' } = req.body;
    const ai = getGeminiClient();

    const userPrompt = `
Repository: ${goalInput.repo}
Base branch: ${goalInput.baseBranch}
Goal: ${goalInput.goal}
Test-First Execution Mode: ${goalInput.testFirstMode ? 'ENABLED (Split every feature into failing test task + code implementation task)' : 'Disabled'}

Acceptance Criteria:
${(goalInput.acceptanceCriteria || []).map((c: string, idx: number) => `${idx + 1}. ${c}`).join('\n')}

Constraints:
${(goalInput.constraints || []).map((c: string) => `- ${c}`).join('\n')}

Allowed paths:
${(goalInput.allowedPaths || []).join(', ') || 'Any safe application path'}

Forbidden paths:
${(goalInput.forbiddenPaths || []).join(', ') || '.github/workflows/, infrastructure/, secrets/, migrations/'}

Repository Context:
- Summary: ${repoContext?.summary || 'N/A'}
- Manifest: ${repoContext?.manifestType || 'N/A'}
- Manifest Content: ${repoContext?.manifestContent || 'N/A'}
- Tree Files: ${(repoContext?.treeSummary || []).slice(0, 30).join(', ')}
- Test Directories: ${(repoContext?.testDirs || []).join(', ')}
- CI: ${repoContext?.hasCI ? 'Active' : 'Not configured'}
`;

    if (ai) {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
          temperature,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: 'Executive summary of the decomposed plan' },
              open_questions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Open questions or ambiguities requiring clarification',
              },
              risks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Technical risks, edge cases, or potential breaking changes',
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: 'Unique task identifier, e.g. TASK-01' },
                    title: { type: Type.STRING, description: 'Clear action-oriented task title' },
                    description: { type: Type.STRING, description: 'Technical description of what to implement' },
                    why: { type: Type.STRING, description: 'Why this task is necessary' },
                    risk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    estimated_complexity: { type: Type.STRING, enum: ['small', 'medium', 'large'] },
                    depends_on: { type: Type.ARRAY, items: { type: Type.STRING } },
                    expected_paths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    forbidden_paths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    acceptance_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                    jules_prompt: { type: Type.STRING, description: 'Precision prompt for the autonomous Jules agent' },
                    is_test_task: { type: Type.BOOLEAN },
                    is_high_risk: { type: Type.BOOLEAN },
                  },
                  required: [
                    'id',
                    'title',
                    'description',
                    'why',
                    'risk',
                    'estimated_complexity',
                    'depends_on',
                    'expected_paths',
                    'forbidden_paths',
                    'acceptance_criteria',
                    'jules_prompt',
                  ],
                },
              },
            },
            required: ['summary', 'open_questions', 'risks', 'tasks'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } else {
      return res.status(503).json({ error: 'GEMINI_API_KEY is required to generate a plan in live mode.' });
    }
  } catch (err: any) {
    console.error('Plan generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate plan' });
  }
});

// Streaming Plan Generation SSE Endpoint (PILLAR 1)
app.post('/api/gemini/plan-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { goalInput, repoContext, temperature = 0.2, model = 'gemini-3.7-flash' } = req.body;
    const ai = getGeminiClient();

    const userPrompt = `
Repository: ${goalInput.repo}
Base branch: ${goalInput.baseBranch}
Goal: ${goalInput.goal}
Test-First Mode: ${goalInput.testFirstMode ? 'Enabled' : 'Disabled'}

Acceptance Criteria:
${(goalInput.acceptanceCriteria || []).map((c: string, idx: number) => `${idx + 1}. ${c}`).join('\n')}

Constraints:
${(goalInput.constraints || []).map((c: string) => `- ${c}`).join('\n')}

Allowed paths:
${(goalInput.allowedPaths || []).join(', ') || 'Any safe application path'}

Forbidden paths:
${(goalInput.forbiddenPaths || []).join(', ') || '.github/workflows/, infrastructure/, secrets/, migrations/'}

Repository Context:
- Summary: ${repoContext?.summary || 'N/A'}
- Tree Files: ${(repoContext?.treeSummary || []).slice(0, 30).join(', ')}
`;

    if (ai) {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
          temperature,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              open_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    why: { type: Type.STRING },
                    risk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                    estimated_complexity: { type: Type.STRING, enum: ['small', 'medium', 'large'] },
                    depends_on: { type: Type.ARRAY, items: { type: Type.STRING } },
                    expected_paths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    forbidden_paths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    acceptance_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                    jules_prompt: { type: Type.STRING },
                    is_test_task: { type: Type.BOOLEAN },
                    is_high_risk: { type: Type.BOOLEAN },
                  },
                  required: ['id', 'title', 'description', 'why', 'risk', 'estimated_complexity', 'depends_on', 'expected_paths', 'forbidden_paths', 'acceptance_criteria', 'jules_prompt'],
                },
              },
            },
            required: ['summary', 'open_questions', 'risks', 'tasks'],
          },
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    } else {
      res.write(`data: ${JSON.stringify({ error: 'GEMINI_API_KEY is required to stream a plan in live mode.' })}\n\n`);
      return res.end();
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    return res.end();
  }
});

// ==========================================
// 4. API: GitHub Raw Diff & Branch Compare Proxy
// ==========================================
app.post('/api/github/compare', async (req, res) => {
  try {
    const token = extractGitHubToken(req) || req.body?.token;
    const { repo, base, head, baseUrl = 'https://api.github.com' } = req.body;

    if (!repo || !base || !head) {
      return res.status(400).json({ error: 'Missing required parameters: repo, base, head' });
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    // 1. Fetch JSON structured comparison
    const jsonRes = await fetch(`${cleanBaseUrl}/repos/${repo}/compare/${base}...${head}`, {
      headers: getGitHubHeaders(token, false),
    });

    if (!jsonRes.ok) {
      const errJson = await jsonRes.json().catch(() => ({})) as any;
      return res.status(jsonRes.status).json({
        error: errJson.message || `GitHub compare failed with status ${jsonRes.statusText}`,
      });
    }

    const jsonData = await jsonRes.json() as any;

    // 2. Fetch Raw Text Unified Diff (Accept: application/vnd.github.v3.diff)
    let rawPatchText = '';
    try {
      const rawDiffRes = await fetch(`${cleanBaseUrl}/repos/${repo}/compare/${base}...${head}`, {
        headers: getGitHubHeaders(token, true),
      });
      if (rawDiffRes.ok) {
        rawPatchText = await rawDiffRes.text();
      }
    } catch {
      // ignore
    }

    const files = (jsonData.files || []).map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch || '',
    }));

    return res.json({
      files,
      totalAdditions: jsonData.files?.reduce((acc: number, f: any) => acc + (f.additions || 0), 0) || 0,
      totalDeletions: jsonData.files?.reduce((acc: number, f: any) => acc + (f.deletions || 0), 0) || 0,
      totalFiles: files.length,
      rawPatch: rawPatchText || files.map((f: any) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch || ''}`).join('\n\n'),
      baseCommit: jsonData.base_commit?.sha,
      headCommit: jsonData.merge_base_commit?.sha,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to compare branches' });
  }
});

// ==========================================
// 5. API: Semantic & Blast Radius Verification Gate
// ==========================================
const VERIFIER_SYSTEM_INSTRUCTION = `You are an adversarial code reviewer. You are given a raw unified diff and acceptance criteria.
First, think step-by-step inside <thinking> tags. Map every line of the diff to the acceptance criteria. Look for edge cases, missing error handling, and scope violations.
Then, output the final JSON. If a criterion is not explicitly proven by the diff, mark it as 'fail'.`;

app.post('/api/gemini/verify', async (req, res) => {
  try {
    const {
      goal,
      acceptanceCriteria,
      constraints,
      diff,
      changedFiles,
      ciStatus,
      forbiddenPaths = ['.github/workflows/', 'infrastructure/', 'secrets/', 'migrations/'],
      requireTests = true,
      model = 'gemini-3.7-flash',
    } = req.body;

    const fileList = changedFiles || diff?.files || [];

    // ==========================================
    // PILLAR 3: BLAST RADIUS CONTAINMENT INTERCEPTOR
    // Fast-fail before calling LLM if forbidden paths modified
    // ==========================================
    const forbiddenTouched = fileList.filter((f: any) =>
      forbiddenPaths.some((fp: string) => f.filename?.startsWith(fp) || f.filename?.includes(fp))
    ).map((f: any) => f.filename);

    if (forbiddenTouched.length > 0) {
      console.warn(`[BLAST RADIUS CONTAINMENT] Scope violation detected on forbidden paths: ${forbiddenTouched.join(', ')}`);
      return res.json({
        structural: {
          pass: false,
          fileCount: fileList.length,
          additions: fileList.reduce((s: number, f: any) => s + (f.additions || 0), 0),
          deletions: fileList.reduce((s: number, f: any) => s + (f.deletions || 0), 0),
          forbiddenPathsTouched: forbiddenTouched,
          testsAddedOrUpdated: false,
          docsUpdated: false,
          warnings: [`Critical Blast Radius Violation: Modified protected paths: ${forbiddenTouched.join(', ')}`],
          scopeViolation: true,
        },
        semantic: {
          pass: false,
          score: 0.0,
          summary: `Blast radius containment triggered: The automated agent modified forbidden system paths (${forbiddenTouched.join(', ')}). Verification halted immediately.`,
          criteria_results: (acceptanceCriteria || []).map((c: string) => ({
            criterion: c,
            status: 'fail',
            evidence: `Halted: Scope violation in forbidden path ${forbiddenTouched[0]}`,
          })),
          risks: ['Unauthorized modifications to protected repository infrastructure or workflows.'],
          scope_violations: forbiddenTouched.map((p: string) => `Forbidden path modified: ${p}`),
          missing_requirements: ['Revert changes to forbidden paths and isolate edits to allowed directories.'],
          recommended_action: 'request_fixes',
          thinking: `<thinking>\nScope violation detected: The patch modified ${forbiddenTouched.join(', ')}. These paths match forbidden patterns. Rejecting immediately to protect repository security.\n</thinking>`,
        },
        overallAction: 'request_fixes',
        scopeViolation: true,
      });
    }

    const hasTests = fileList.some((f: any) =>
      f.filename?.includes('test') || f.filename?.includes('spec') || f.filename?.startsWith('tests/')
    );

    const totalAdditions = fileList.reduce((sum: number, f: any) => sum + (f.additions || 0), 0);
    const totalDeletions = fileList.reduce((sum: number, f: any) => sum + (f.deletions || 0), 0);

    const structuralWarnings: string[] = [];
    if (requireTests && !hasTests) {
      structuralWarnings.push('Warning: No unit or integration test files were detected in this change set.');
    }
    if (fileList.length > 15) {
      structuralWarnings.push(`Caution: Large change set with ${fileList.length} modified files.`);
    }

    const structuralResult = {
      pass: !requireTests || hasTests,
      fileCount: fileList.length,
      additions: totalAdditions,
      deletions: totalDeletions,
      forbiddenPathsTouched: [],
      testsAddedOrUpdated: hasTests,
      docsUpdated: fileList.some((f: any) => f.filename?.endsWith('.md') || f.filename?.startsWith('docs/')),
      warnings: structuralWarnings,
    };

    const ai = getGeminiClient();

    const userPrompt = `
Goal: ${goal}

Acceptance Criteria:
${(acceptanceCriteria || []).map((c: string, i: number) => `${i + 1}. ${c}`).join('\n')}

Constraints:
${(constraints || []).map((c: string) => `- ${c}`).join('\n')}

Changed Files:
${fileList.map((f: any) => `- ${f.filename} (+${f.additions}, -${f.deletions})`).join('\n')}

CI Check Run Status:
${JSON.stringify(ciStatus || { status: 'success' }, null, 2)}

RAW UNIFIED DIFF:
${(diff?.rawPatch || fileList.map((f: any) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch || ''}`).join('\n\n')).slice(0, 18000)}
`;

    let semanticResult;

    if (ai) {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: VERIFIER_SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              thinking: { type: Type.STRING, description: 'Chain-of-thought analysis step-by-step inside <thinking> tags' },
              pass: { type: Type.BOOLEAN },
              score: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              criteria_results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    criterion: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['pass', 'fail', 'unclear'] },
                    evidence: { type: Type.STRING },
                  },
                  required: ['criterion', 'status', 'evidence'],
                },
              },
              risks: { type: Type.ARRAY, items: { type: Type.STRING } },
              scope_violations: { type: Type.ARRAY, items: { type: Type.STRING } },
              missing_requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommended_action: { type: Type.STRING, enum: ['approve', 'request_fixes', 'request_human_review'] },
            },
            required: ['pass', 'score', 'summary', 'criteria_results', 'risks', 'scope_violations', 'missing_requirements', 'recommended_action'],
          },
        },
      });

      semanticResult = JSON.parse(response.text?.trim() || '{}');
    } else {
      return res.status(503).json({ error: 'GEMINI_API_KEY is required to verify changes in live mode.' });
    }

    let overallAction = semanticResult.recommended_action;
    if (!semanticResult.pass) {
      overallAction = 'request_fixes';
    } else if (structuralWarnings.length > 1 && overallAction === 'approve') {
      overallAction = 'request_human_review';
    }

    return res.json({
      structural: structuralResult,
      semantic: semanticResult,
      overallAction,
    });
  } catch (err: any) {
    console.error('Verification error:', err);
    return res.status(500).json({ error: err.message || 'Failed to verify change' });
  }
});

// ==========================================
// 6. API: Generate Repair Prompt
// ==========================================
app.post('/api/gemini/repair', async (req, res) => {
  try {
    const { task, failedCriteria, issues, diffSummary, model = 'gemini-3.7-flash' } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are a specialist coding agent repair planner.
A previous automated change failed verification.
Your job is to generate a concise, targeted instruction for the agent to fix only the failed criteria and issues without touching unrelated code or forbidden paths.`;

    const userPrompt = `A previous automated change failed verification.

Original task:
${typeof task === 'string' ? task : JSON.stringify(task, null, 2)}

Failed criteria:
${(failedCriteria || []).join('\n')}

Issues found:
${(issues || []).join('\n')}

Diff summary:
${diffSummary || 'N/A'}

Make the minimum changes required to fix the failed criteria.
Do not refactor unrelated code.
Do not modify forbidden paths.
Add or update tests to prove the fix.`;

    if (ai) {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.1,
        },
      });
      return res.json({ repairPrompt: response.text?.trim() });
    } else {
      return res.status(503).json({ error: 'GEMINI_API_KEY is required to generate a repair prompt in live mode.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate repair prompt' });
  }
});

// ==========================================
// 7. API: Jules Task Dispatch
// ==========================================
app.post('/api/jules/task/create', async (req, res) => {
  try {
    const julesKey = extractJulesKey(req);
    const { payload, julesBaseUrl = 'https://jules.googleapis.com' } = req.body;

    if (!julesKey) {
      return res.status(400).json({ error: 'JULES_API_KEY is required to dispatch a task in live mode.' });
    }

    // 1. Append path constraints to the prompt since Jules relies on natural language instructions
    const constraintText = (payload.constraints?.forbidden_paths?.length || payload.constraints?.allowed_paths?.length)
      ? `\n\nSTRICT CONSTRAINTS:\n- Allowed paths: ${(payload.constraints.allowed_paths || []).join(', ') || 'Any safe app path'}\n- FORBIDDEN paths (DO NOT TOUCH): ${(payload.constraints.forbidden_paths || []).join(', ')}`
      : '';

    // 2. Format payload for Google Jules API
    const julesPayload = {
      title: payload.title || `Jules Task ${payload.task_id}`,
      prompt: `${payload.prompt}${constraintText}`,
      sourceContext: {
        source: `sources/github/${payload.repository}`, // Must match installed app
        githubRepoContext: {
          startingBranch: payload.base_branch || 'main'
        }
      }
    };

    // 3. Clean the base URL and append the correct API path
    const cleanBaseUrl = (julesBaseUrl || 'https://jules.googleapis.com')
      .replace(/\/v1\/?$/, '')
      .replace(/\/$/, '');

    const julesRes = await fetch(`${cleanBaseUrl}/v1alpha/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': julesKey, // Jules uses this header, NOT Bearer
      },
      body: JSON.stringify(julesPayload),
    });

    if (!julesRes.ok) {
      const errText = await julesRes.text();
      console.error('[JULES API ERROR]', errText);
      return res.status(julesRes.status).json({ error: errText || `Jules API rejected the request with status ${julesRes.status}` });
    }

    const liveData = await julesRes.json() as any;
    // Jules returns a name like "sessions/abc123-def456"
    const sessionId = liveData.name?.split('/')[1] || liveData.id;

    return res.json({
      taskId: sessionId,
      status: 'jules_running',
      message: 'Task successfully submitted to Jules Live API',
      isLive: true,
      liveData
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to dispatch Jules task' });
  }
});

// ==========================================
// 8. API: GitHub PR Creation & Commenting
// ==========================================
app.post('/api/github/create-pr', async (req, res) => {
  try {
    const token = extractGitHubToken(req) || req.body?.token;
    const { repo, title, body, head, base = 'main', baseUrl = 'https://api.github.com' } = req.body;
    if (!repo || !title || !head) {
      return res.status(400).json({ error: 'Missing required parameters (repo, title, head)' });
    }

    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required to create a pull request in live mode.' });
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const prRes = await fetch(`${cleanBaseUrl}/repos/${repo}/pulls`, {
      method: 'POST',
      headers: {
        ...getGitHubHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });

    if (!prRes.ok) {
      const errJson = await prRes.json().catch(() => ({})) as any;
      return res.status(prRes.status).json({
        error: errJson.message || `GitHub returned status ${prRes.statusText}`,
        details: errJson,
      });
    }

    const prData = await prRes.json() as any;
    return res.json({
      success: true,
      pullRequest: prData,
      message: `Pull Request #${prData.number} successfully created on GitHub!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create pull request' });
  }
});

app.post('/api/github/comment-pr', async (req, res) => {
  try {
    const token = extractGitHubToken(req) || req.body?.token;
    const { repo, issueNumber, commentBody, baseUrl = 'https://api.github.com' } = req.body;
    if (!repo || !issueNumber || !commentBody) {
      return res.status(400).json({ error: 'Missing required parameters (repo, issueNumber, commentBody)' });
    }

    if (!token) {
      return res.status(400).json({ error: 'GitHub token is required to post a comment in live mode.' });
    }

    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const commentRes = await fetch(`${cleanBaseUrl}/repos/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        ...getGitHubHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: commentBody }),
    });

    if (!commentRes.ok) {
      const errJson = await commentRes.json().catch(() => ({})) as any;
      return res.status(commentRes.status).json({
        error: errJson.message || `GitHub comment failed with status ${commentRes.statusText}`,
      });
    }

    const commentData = await commentRes.json() as any;
    return res.json({
      success: true,
      comment: commentData,
      message: 'Verification comment successfully posted to GitHub Pull Request!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to post comment' });
  }
});

// Vite & Static Asset Handling
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jules RepoMission Studio running at http://localhost:${PORT}`);
  });
}

setupServer();
