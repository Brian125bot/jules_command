# 📡 Jules RepoMission Studio — REST API Reference

This document provides a comprehensive reference for all backend endpoints hosted on `server.ts`.

---

## 🔐 Authentication Headers

All requests originating from the client can optionally supply authentication credentials via HTTP headers:

| Header Name | Type | Description |
|---|---|---|
| `X-GitHub-Token` | `string` | Personal Access Token (PAT) for GitHub REST API calls (needs `repo` scope). |
| `X-Jules-Key` | `string` | API Key for Jules Agent Runtime endpoints. |
| `Content-Type` | `string` | Must be `application/json` for POST requests. |

---

## 🗂️ 1. Repository Context Endpoints

### `POST /api/repo/fetch-context`
Fetches and caches directory tree, package manifests, test configurations, and README files.

#### Request Body
```json
{
  "repo": "acme/dashboard",
  "baseBranch": "main",
  "baseUrl": "https://api.github.com",
  "mode": "live",
  "forceRefresh": false
}
```

#### Headers
- `X-GitHub-Token`: (Optional) GitHub PAT.

#### Response `200 OK`
```json
{
  "summary": "Repository acme/dashboard loaded with full tree, manifests, and test suites.",
  "defaultBranch": "main",
  "treeSummary": ["src/index.ts", "src/components/Table.tsx", "tests/export.test.ts"],
  "relevantFiles": ["package.json", "tsconfig.json", "src/App.tsx"],
  "testDirs": ["tests", "src/__tests__"],
  "hasCI": true,
  "ciDetails": ".github/workflows/ci.yml",
  "manifestType": "package.json",
  "manifestContent": "{\"dependencies\": { ... }}",
  "rawReadmeSnippet": "# Acme Dashboard\n\nAnalytics and telemetry...",
  "fetchedAt": "2026-08-16T13:40:00.000Z",
  "cached": true
}
```

---

## 🤖 2. Gemini AI Endpoints

### `POST /api/gemini/generate-criteria`
Autogenerates testable, unambiguous acceptance criteria and suggested constraints based on a high-level goal and repository context.

#### Request Body
```json
{
  "goal": "Add CSV export to analytics dashboard so users can download metrics as formatted spreadsheets",
  "repo": "acme/dashboard",
  "repoContext": {
    "summary": "Repository context summary...",
    "manifestType": "package.json",
    "testDirs": ["tests/"]
  },
  "existingCriteria": ["Export button in table header"],
  "constraints": ["No heavy third-party dependencies"],
  "model": "gemini-3.7-flash",
  "temperature": 0.2
}
```

#### Response `200 OK`
```json
{
  "criteria": [
    "Export button is rendered in the analytics table header and triggers file download on click",
    "Generated CSV complies with RFC 4180 format, including proper escaping for commas and quotes",
    "Empty and filtered table views generate corresponding valid CSV files without errors",
    "Automated unit tests in tests/ verify CSV serialization logic across edge-case data schemas"
  ],
  "rationale": "Focuses on RFC 4180 compliance, edge-case data serialization, and regression test coverage.",
  "suggestedConstraints": [
    "Ensure zero modifications to .github/workflows/ and core authentication logic"
  ]
}
```

---

### `POST /api/gemini/plan`
Decomposes a high-level goal into structured discrete tasks.

#### Request Body
```json
{
  "goalInput": {
    "repo": "acme/dashboard",
    "baseBranch": "main",
    "goal": "Add CSV export to analytics dashboard",
    "acceptanceCriteria": ["Export button in table header", "RFC 4180 format"],
    "constraints": ["No new heavy npm packages"],
    "allowedPaths": ["src/components/Table.tsx", "src/utils/csv.ts", "tests/csv.test.ts"],
    "forbiddenPaths": ["package.json", ".github/workflows/"],
    "testFirstMode": true
  },
  "repoContext": { ... },
  "temperature": 0.2,
  "model": "gemini-3.7-flash"
}
```

#### Response `200 OK`
```json
{
  "summary": "Decomposed CSV export feature into 3 sequential tasks.",
  "open_questions": [],
  "risks": ["Browser memory limits on massive datasets (>50k rows)."],
  "tasks": [
    {
      "id": "TASK-1",
      "title": "Add Unit Tests for RFC 4180 CSV Serializer",
      "description": "Write comprehensive unit tests asserting proper escaping and delimiters.",
      "why": "Enforce Test-First TDD verification.",
      "risk": "low",
      "estimated_complexity": "small",
      "depends_on": [],
      "expected_paths": ["tests/utils/csv.test.ts"],
      "forbidden_paths": ["package.json"],
      "acceptance_criteria": ["Test quotes and commas escaping"],
      "jules_prompt": "Write unit tests in tests/utils/csv.test.ts...",
      "is_test_task": true
    }
  ]
}
```

---

### `POST /api/gemini/plan-stream`
Server-Sent Events (SSE) stream emitting progressive chunks during task decomposition.

#### Request Body
Same as `/api/gemini/plan`.

#### Response Stream
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"chunk":"{\n  \"summary\": \"Decomposing..."}

data: {"chunk":"\n  \"tasks\": ["}

data: {"done":true}
```

---

### `POST /api/gemini/verify`
Runs structural checks and Chain-of-Thought adversarial semantic review on a raw git unified diff.

#### Request Body
```json
{
  "goal": "Add CSV export",
  "acceptanceCriteria": ["Export button renders", "Valid CSV generated"],
  "constraints": ["Zero forbidden paths"],
  "diff": {
    "files": [
      {
        "filename": "src/utils/csv.ts",
        "status": "added",
        "additions": 45,
        "deletions": 0,
        "patch": "@@ -0,0 +1,45 @@\n+export function toCsv(data) { ... }"
      }
    ]
  },
  "changedFiles": [ ... ],
  "ciStatus": { "pass": true, "status": "success", "checkRuns": [] },
  "forbiddenPaths": ["package.json", ".github/workflows/"],
  "requireTests": true,
  "model": "gemini-3.7-flash"
}
```

#### Response `200 OK`
```json
{
  "structural": {
    "pass": true,
    "forbiddenPathsTouched": [],
    "testsAddedOrUpdated": true,
    "warnings": []
  },
  "semantic": {
    "pass": true,
    "score": 0.96,
    "summary": "Clean implementation with dedicated CSV serializer and test suite.",
    "criteriaResults": [
      {
        "criterion": "Export button renders",
        "status": "pass",
        "evidence": "Line 24 in src/components/Table.tsx attaches onClick={handleExportCsv}."
      }
    ],
    "risks": [],
    "suggestedFixes": [],
    "thinking": "1. Inspected modified files. No forbidden files touched.\n2. Checked RFC 4180 compliance in src/utils/csv.ts..."
  },
  "overallAction": "approve"
}
```

---

### `POST /api/gemini/repair`
Synthesizes a minimal corrective repair prompt for failed tasks or regressions.

#### Request Body
```json
{
  "task": "Add CSV export",
  "failedCriteria": ["Quotes inside fields must be escaped as double-quotes"],
  "issues": ["Test failed at line 14: assertion expected '\"Hello \"\"World\"\"\"'"],
  "diffSummary": "src/utils/csv.ts line 12 misses quote escaping replace(/\"/g, '\"\"')",
  "model": "gemini-3.7-flash"
}
```

#### Response `200 OK`
```json
{
  "repairPrompt": "REPAIR INSTRUCTION:\nThe previous implementation failed the following criteria:\n- Quotes inside fields must be escaped as double-quotes\n\nRequired action: In src/utils/csv.ts, update string escaping to replace double-quotes with RFC 4180 double-quotes. Re-run tests to ensure all cases pass."
}
```

---

## 🤖 3. Jules Agent Endpoints

### `POST /api/jules/task/create`
Submits a coding task to the Jules agent runtime or local mock simulator.

#### Request Body
```json
{
  "payload": {
    "repository": "acme/dashboard",
    "base_branch": "main",
    "head_branch": "jules/task-1-csv-export",
    "prompt": "Implement CSV export button and utility in src/utils/csv.ts",
    "constraints": {
      "allowed_paths": ["src/utils/csv.ts", "tests/csv.test.ts"],
      "forbidden_paths": ["package.json"]
    },
    "task_id": "TASK-1",
    "title": "Implement CSV Export Utility"
  },
  "julesBaseUrl": "https://api.jules.ai/v1",
  "mode": "live"
}
```

#### Response `200 OK`
```json
{
  "taskId": "jules_live_987213456",
  "status": "jules_running",
  "isLive": true,
  "message": "Task queued in Jules runtime"
}
```

---

### `GET /api/jules/task/:id`
Polls the execution state, progress percentage, and log history of a Jules task.

#### Response `200 OK`
```json
{
  "id": "jules_live_987213456",
  "status": "passed",
  "progress": 100,
  "currentStage": "Task verified and tests passed",
  "logs": [
    "[13:42:01] Initializing container runtime...",
    "[13:42:04] Checking out branch jules/task-1-csv-export...",
    "[13:42:08] Applying code modifications to src/utils/csv.ts...",
    "[13:42:15] Running vitest run tests/csv.test.ts (2 tests passed)...",
    "[13:42:18] Generated git diff patch (45 additions, 0 deletions)"
  ],
  "diff": {
    "files": [ ... ],
    "totalAdditions": 45,
    "totalDeletions": 0,
    "totalFiles": 1
  }
}
```

---

## 🐙 4. GitHub Proxy Endpoints

### `POST /api/github/compare`
Compares base and head branches, returning structured changed files and raw unified git patch.

#### Request Body
```json
{
  "repo": "acme/dashboard",
  "base": "main",
  "head": "jules/task-1-csv-export",
  "baseUrl": "https://api.github.com"
}
```

#### Headers
- `X-GitHub-Token`: (Optional) Personal access token.

#### Response `200 OK`
```json
{
  "files": [
    {
      "filename": "src/utils/csv.ts",
      "status": "added",
      "additions": 45,
      "deletions": 0,
      "patch": "@@ -0,0 +1,45 @@..."
    }
  ],
  "totalAdditions": 45,
  "totalDeletions": 0,
  "totalFiles": 1,
  "rawPatch": "diff --git a/src/utils/csv.ts b/src/utils/csv.ts\nnew file mode 100644\n..."
}
```

---

### `POST /api/github/create-pr`
Creates a GitHub Pull Request for the verified branch.

#### Request Body
```json
{
  "repo": "acme/dashboard",
  "title": "feat: Add CSV export to analytics dashboard",
  "body": "## Automated change\n\nVerified by Jules RepoMission Studio...",
  "head": "jules/task-1-csv-export",
  "base": "main",
  "baseUrl": "https://api.github.com"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "prNumber": 42,
  "prUrl": "https://github.com/acme/dashboard/pull/42",
  "data": { ... }
}
```

---

### `POST /api/github/comment-pr`
Posts an audit verification comment to an existing issue or pull request.

#### Request Body
```json
{
  "repo": "acme/dashboard",
  "issueNumber": 42,
  "commentBody": "### 🛡️ RepoMission Studio Verification Audit\n\n- Structural Checks: ✅ Passed\n- CI Checks: ✅ 4/4 Passed\n- Semantic Review: ✅ 96% Score",
  "baseUrl": "https://api.github.com"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "commentId": 987654321,
  "commentUrl": "https://github.com/acme/dashboard/pull/42#issuecomment-987654321"
}
```
