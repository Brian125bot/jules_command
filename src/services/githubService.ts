import { BranchDiff, CiCheckRun, RepoContext } from '../types';
import { MOCK_REPO_CONTEXT, MOCK_BRANCH_DIFF } from '../data/mockData';

export interface FetchRepoParams {
  repo: string;
  baseBranch?: string;
  token?: string;
  baseUrl?: string;
  mode?: 'demo' | 'live';
  forceRefresh?: boolean;
}

export interface BranchDiffParams {
  repo: string;
  base: string;
  head: string;
  token?: string;
  baseUrl?: string;
  mode?: 'demo' | 'live';
}

export interface CiStatusParams {
  repo: string;
  ref: string;
  token?: string;
  baseUrl?: string;
  mode?: 'demo' | 'live';
}

export class GitHubService {
  /**
   * Test connection to GitHub with X-GitHub-Token header
   */
  static async testConnection(token: string, baseUrl = 'https://api.github.com') {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token && token.trim()) {
        headers['X-GitHub-Token'] = token.trim();
      }

      const res = await fetch('/api/github/test-connection', {
        method: 'POST',
        headers,
        body: JSON.stringify({ baseUrl }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection failed' };
    }
  }

  /**
   * Fetch full repository context with session caching support
   */
  static async fetchRepoContext(
    repoOrParams: string | FetchRepoParams,
    baseBranch = 'main',
    token?: string,
    baseUrl = 'https://api.github.com',
    mode: 'demo' | 'live' = 'demo'
  ): Promise<RepoContext> {
    const params: FetchRepoParams =
      typeof repoOrParams === 'string'
        ? { repo: repoOrParams, baseBranch, token, baseUrl, mode }
        : repoOrParams;

    const actualRepo = params.repo;
    const actualBase = params.baseBranch || 'main';
    const actualToken = params.token;
    const actualBaseUrl = params.baseUrl || 'https://api.github.com';
    const actualMode = params.mode || 'demo';

    if (actualMode === 'demo' && !actualToken) {
      await new Promise(r => setTimeout(r, 350));
      return {
        ...MOCK_REPO_CONTEXT,
        summary: `Repository ${actualRepo} loaded with full tree, manifests, and test suites.`,
        defaultBranch: actualBase,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (actualToken && actualToken.trim()) {
      headers['X-GitHub-Token'] = actualToken.trim();
    }

    const res = await fetch('/api/repo/fetch-context', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        repo: actualRepo,
        baseBranch: actualBase,
        baseUrl: actualBaseUrl,
        mode: actualMode,
        forceRefresh: params.forceRefresh || false,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `GitHub request failed with status ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Compare two branches using backend proxy with raw text unified diff header injection
   */
  static async compareBranches(
    repoOrParams: string | BranchDiffParams,
    base = 'main',
    head = 'main',
    token?: string,
    baseUrl = 'https://api.github.com'
  ): Promise<BranchDiff> {
    const params: BranchDiffParams =
      typeof repoOrParams === 'string'
        ? { repo: repoOrParams, base, head, token, baseUrl }
        : repoOrParams;

    if (!params.token || params.mode === 'demo') {
      await new Promise(r => setTimeout(r, 250));
      return {
        ...MOCK_BRANCH_DIFF,
        rawPatch: MOCK_BRANCH_DIFF.rawPatch || MOCK_BRANCH_DIFF.files.map(f => `diff --git a/${f.filename} b/${f.filename}\n${f.patch}`).join('\n\n'),
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (params.token && params.token.trim()) {
        headers['X-GitHub-Token'] = params.token.trim();
      }

      const res = await fetch('/api/github/compare', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          repo: params.repo,
          base: params.base,
          head: params.head,
          baseUrl: params.baseUrl || 'https://api.github.com',
        }),
      });

      if (!res.ok) {
        return MOCK_BRANCH_DIFF;
      }

      const data = await res.json();
      return data;
    } catch {
      return MOCK_BRANCH_DIFF;
    }
  }

  /**
   * Alias for compareBranches
   */
  static async getBranchDiff(params: BranchDiffParams): Promise<BranchDiff> {
    return this.compareBranches(params);
  }

  /**
   * Fetch GitHub Check Runs / CI status
   */
  static async getCheckRuns(
    repoOrParams: string | CiStatusParams,
    ref = 'main',
    token?: string,
    baseUrl = 'https://api.github.com'
  ): Promise<{ pass: boolean; status: 'success' | 'failure' | 'pending' | 'unknown'; checkRuns: CiCheckRun[]; message?: string }> {
    const params: CiStatusParams =
      typeof repoOrParams === 'string'
        ? { repo: repoOrParams, ref, token, baseUrl }
        : repoOrParams;

    if (!params.token || params.mode === 'demo') {
      return {
        pass: true,
        status: 'success',
        checkRuns: [
          { name: 'TypeScript Typecheck', status: 'completed', conclusion: 'success' },
          { name: 'Vitest Unit & Integration Suite', status: 'completed', conclusion: 'success' },
          { name: 'Security & Dependency Scan', status: 'completed', conclusion: 'success' },
          { name: 'Vite Production Build', status: 'completed', conclusion: 'success' },
        ],
        message: 'All 4 CI verification checks passed successfully.',
      };
    }

    try {
      const cleanBaseUrl = (params.baseUrl || 'https://api.github.com').replace(/\/$/, '');
      const res = await fetch(`${cleanBaseUrl}/repos/${params.repo}/commits/${params.ref}/check-runs`, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${params.token.trim()}`,
          'User-Agent': 'Jules-RepoMission-Studio',
        },
      });

      if (!res.ok) {
        return {
          pass: false,
          status: 'unknown',
          checkRuns: [],
          message: 'CI checks not found or insufficient permissions for check-runs.',
        };
      }

      const data = await res.json() as any;
      const checkRuns: CiCheckRun[] = (data.check_runs || []).map((cr: any) => ({
        name: cr.name,
        status: cr.status,
        conclusion: cr.conclusion || 'unknown',
        detailsUrl: cr.html_url,
      }));

      const allSuccess = checkRuns.length > 0 && checkRuns.every(cr => cr.conclusion === 'success');
      const hasFailure = checkRuns.some(cr => cr.conclusion === 'failure' || cr.conclusion === 'timed_out');

      return {
        pass: allSuccess,
        status: hasFailure ? 'failure' : allSuccess ? 'success' : checkRuns.length > 0 ? 'pending' : 'unknown',
        checkRuns,
        message: checkRuns.length > 0
          ? `${checkRuns.filter(cr => cr.conclusion === 'success').length}/${checkRuns.length} checks completed successfully.`
          : 'No active check runs registered for this commit ref.',
      };
    } catch (err: any) {
      return {
        pass: false,
        status: 'unknown',
        checkRuns: [],
        message: err.message || 'Error querying CI status',
      };
    }
  }

  /**
   * Alias for getCheckRuns
   */
  static async getCiStatus(params: CiStatusParams) {
    return this.getCheckRuns(params);
  }

  /**
   * Create a GitHub Pull Request using X-GitHub-Token header
   */
  static async createPullRequest(params: {
    repo: string;
    title: string;
    body: string;
    head: string;
    base: string;
    token?: string;
    baseUrl?: string;
  }) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (params.token && params.token.trim()) {
      headers['X-GitHub-Token'] = params.token.trim();
    }

    const res = await fetch('/api/github/create-pr', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        repo: params.repo,
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
        baseUrl: params.baseUrl,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create pull request');
    }
    return data;
  }

  /**
   * Post verification report as comment on issue/PR using X-GitHub-Token header
   */
  static async addIssueComment(params: {
    repo: string;
    issueNumber: number;
    commentBody: string;
    token?: string;
    baseUrl?: string;
  }) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (params.token && params.token.trim()) {
      headers['X-GitHub-Token'] = params.token.trim();
    }

    const res = await fetch('/api/github/comment-pr', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        repo: params.repo,
        issueNumber: params.issueNumber,
        commentBody: params.commentBody,
        baseUrl: params.baseUrl,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to post verification comment');
    }
    return data;
  }
}
