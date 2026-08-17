# 🏛️ Jules RepoMission Studio — Architecture & Technical Design

This document details the system design, data structures, state machines, adversarial verification mechanisms, and security model of **Jules RepoMission Studio**.

---

## 📐 High-Level Architecture Overview

Jules RepoMission Studio operates on a **modular client-server model**:
- **Client (React 19 + TypeScript + Tailwind CSS)**: Manages the interactive state machine across the 5 mission lifecycle stages, renders real-time execution terminals, displays interactive unified diffs, and orchestrates user approval flows.
- **Backend (Express + Node.js)**: Acts as an authenticated gateway, rate-limiting proxy, repository context caching layer, and security interceptor for Gemini, GitHub, and Jules APIs.

```
+-----------------------------------------------------------------------------------+
|                                  BROWSER CLIENT                                   |
|                                                                                   |
|  +------------------+  +------------------+  +------------------+  +-----------+  |
|  | Goal Definition  |  | Plan Generation  |  | Jules Dispatcher |  | Verifier  |  |
|  +------------------+  +------------------+  +------------------+  +-----------+  |
|                                     |                                             |
|                             Client State Store                                    |
+-------------------------------------|---------------------------------------------+
                                      | HTTP / SSE
                                      v
+-----------------------------------------------------------------------------------+
|                               EXPRESS BACKEND (server.ts)                         |
|                                                                                   |
|  [Rate Limiter] ---> [Header Sanitizer] ---> [Blast Radius Fast-Fail Interceptor] |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Context Cache Engine (LRU/TTL in-memory cache for GitHub repos, 15m expiry) |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                  |                           |          |
|         v                                  v                           v          |
|  GitHub REST Proxy                  Gemini API Engine           Jules API Gateway |
|  - Compare diffs                    - JSON Schemas              - Task queue      |
|  - Raw patch extractor              - Plan SSE Streaming        - State polling   |
|  - PR & comment poster              - CoT Verification          - Log stream      |
+---------|----------------------------------|---------------------------|----------+
          |                                  |                           |
          v                                  v                           v
   GitHub API (v3)                    Gemini 3.7 Flash             Jules AI Runtime
```

---

## 🔁 Mission State Machine & Lifecycle

The application enforces a deterministic progression across 5 primary phases:

```
[INIT]
  |
  v
(1. GOAL DEFINITION)
  - Target Repository (`owner/repo`) & Base Branch (`main`)
  - User Outcome Goal
  - Explicit Acceptance Criteria (`- [ ] ...`)
  - Hard Constraints & Allowed / Forbidden Paths
  - Test-First (TDD) Decomposition Toggle
  |
  v [Generate Plan / SSE Stream]
(2. PLAN & DECOMPOSITION)
  - Dependency-ordered discrete tasks (`TASK-1`, `TASK-2`, ...)
  - Risk classification (`low`, `medium`, `high`)
  - Complexity estimation (`small`, `medium`, `large`)
  - Path boundaries (`expected_paths`, `forbidden_paths`)
  - Human review / approval of high-risk tasks
  |
  v [Approve & Dispatch]
(3. AGENT EXECUTION)
  - Branch creation: `jules/<task-id>-<hash>`
  - Payload formulation & submission to Jules API
  - Real-time polling & terminal log streaming
  - States: `queued` -> `jules_running` -> `completed` / `failed`
  |
  v [Execution Finished]
(4. MULTI-LAYER VERIFICATION)
  - Layer 1: Blast Radius & Structural Diff Checks (Fast Fail)
  - Layer 2: Live GitHub Check Runs / CI Status Query
  - Layer 3: Adversarial Chain-of-Thought (CoT) Semantic Review
  |
  +---------> [Fail / Regressions Detected] ---> (AUTO-REPAIR LOOP)
  |                                                  - Synthesize targeted fix
  |                                                  - Re-dispatch to Jules
  |                                                  - Retry count tracking
  v [All Layers Passed]
(5. SHIP & PR ORCHESTRATION)
  - Automated PR title & markdown summary compilation
  - Include verification matrix & collapsible CoT traces
  - Direct GitHub PR creation & comment logging
```

---

## 🛡️ Three-Tier Adversarial Verification Architecture

Unlike standard AI coding assistants that perform optimistic approvals, RepoMission Studio enforces **adversarial verification** modeled after senior staff engineering reviews:

```
                          ┌──────────────────────────┐
                          │   Raw Git Branch Patch   │
                          └─────────────┬────────────┘
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
             │       LAYER 1: Structural & Blast Radius Check      │
             │                                                     │
             │  • Are any forbidden paths modified?                │
             │    (e.g., .github/, auth/, migrations/)             │
             │  • Did diff exceed maxFiles / maxAdditions limits?  │
             │  • Were corresponding test files added/updated?     │
             └──────────────────────────┬──────────────────────────┘
                                        │
                         [Pass] ────────┴──────── [Violation] ──> Instant Scope Rejection
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
             │            LAYER 2: GitHub CI / Check Runs          │
             │                                                     │
             │  • Query check runs on commit ref                   │
             │  • Confirm typecheck, vitest/jest, lint status      │
             └──────────────────────────┬──────────────────────────┘
                                        │
                         [Pass] ────────┴──────── [Failure] ────> Trigger Repair Loop
                                        │
                                        ▼
             ┌─────────────────────────────────────────────────────┐
             │        LAYER 3: Semantic Adversarial Review (CoT)   │
             │                                                     │
             │  • Gemini 3.7 Flash analyzes unified diff patch     │
             │  • Evaluates each acceptance criterion individually │
             │  • Requires line-by-line evidence citation          │
             │  • Detects hallucinations, regression risks         │
             └──────────────────────────┬──────────────────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────────┐
                        │   FINAL VERDICT & ACTION     │
                        │   APPROVE | REQUEST_FIXES |  │
                        │   REQUEST_HUMAN_REVIEW       │
                        └──────────────────────────────┘
```

---

## 🧠 Structured JSON Enforcements & Prompts

### 1. Plan Decomposition Prompt Specification
The backend prompts Gemini with strict JSON formatting to guarantee parsed integrity:

```typescript
const systemPrompt = `You are a Principal Software Architect. Decompose the high-level goal into an ordered array of discrete engineering tasks for an autonomous coding agent (Jules).
Return ONLY valid JSON matching this schema:
{
  "summary": string,
  "open_questions": string[],
  "risks": string[],
  "tasks": [
    {
      "id": "TASK-1",
      "title": string,
      "description": string,
      "why": string,
      "risk": "low" | "medium" | "high",
      "estimated_complexity": "small" | "medium" | "large",
      "depends_on": string[],
      "expected_paths": string[],
      "forbidden_paths": string[],
      "acceptance_criteria": string[],
      "jules_prompt": string
    }
  ]
}`;
```

### 2. Adversarial Verification Prompt Specification
The verifier is instructed to think adversarially inside `<thinking>` tags before rendering JSON:

```typescript
const verifierPrompt = `You are an Adversarial Principal Security & Code Reviewer.
Analyze the git unified diff against the stated goal and acceptance criteria.
Be skeptical. Look for:
1. Hardcoded mock returns or missing edge cases.
2. Incomplete or skipped acceptance criteria.
3. Unintended side-effects or regressions in unmodified modules.

Provide your internal step-by-step reasoning in a <thinking> block, followed by valid JSON:
{
  "structural": {
    "pass": boolean,
    "forbiddenPathsTouched": string[],
    "testsAddedOrUpdated": boolean,
    "warnings": string[]
  },
  "semantic": {
    "pass": boolean,
    "score": number, // 0.0 to 1.0
    "summary": string,
    "criteriaResults": [
      {
        "criterion": string,
        "status": "pass" | "fail" | "unclear",
        "evidence": string
      }
    ],
    "risks": string[],
    "suggestedFixes": string[]
  },
  "overallAction": "approve" | "request_fixes" | "request_human_review"
}`;
```

---

## ⚡ Server Caching & Rate Limiting Strategy

1. **Repository Context Cache**:
   - Keys: `${owner}/${repo}:${baseBranch}`
   - TTL: 15 minutes (900,000 ms)
   - Eliminates redundant GitHub API rate-limit consumption when exploring goals and generating tasks.
   - Force refresh option available (`forceRefresh: true`).

2. **Rate Limiting**:
   - `express-rate-limit` configured per IP:
     - `/api/gemini/*`: 60 requests / minute
     - `/api/github/*`: 120 requests / minute
     - `/api/jules/*`: 120 requests / minute

3. **Log Sanitization**:
   - Header sanitizer removes sensitive tokens (`X-GitHub-Token`, `X-Jules-Key`, `Authorization`) from console output to prevent credential leaking in cloud logging backends.
