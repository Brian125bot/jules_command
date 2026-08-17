# 🚀 Jules RepoMission Studio

> **Autonomous Repository Engineering & Mission Control Center**  
> Decompose high-level engineering goals, orchestrate Jules AI coding agents, enforce multi-layer verification with blast-radius containment, and ship verified Pull Requests.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/Gemini-3.7--Flash-orange?logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Capabilities](#-key-capabilities)
- [The 5-Stage Mission Lifecycle](#-the-5-stage-mission-lifecycle)
- [System Architecture](#-system-architecture)
- [Quickstart Guide](#-quickstart-guide)
- [Environment Configuration](#-environment-configuration)
- [Running in Production & Deployment](#-running-in-production--deployment)
  - [Docker & Container Deployment](#docker--container-deployment)
  - [Cloud Run / AWS ECS / VPS](#cloud-run--aws-ecs--vps)
  - [Local PM2 / Systemd](#local-pm2--systemd)
- [Security & Credential Isolation](#-security--credential-isolation)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [License](#-license)

---

## 🌟 Overview

Modern autonomous software engineering requires more than sending code prompts into a single chat window. Complex codebase changes demand **systematic decomposition**, **strict dependency ordering**, **blast-radius containment**, and **adversarial verification** before code touches production branches.

**Jules RepoMission Studio** is a full-stack mission control platform designed to safely pilot AI coding agents (such as Jules) across real repositories:

1. **Plan**: Ingest repository manifests, directory trees, and READMEs to decompose user goals into atomic, dependency-aware tasks.
2. **Execute**: Dispatch tasks concurrently or sequentially to autonomous coding agents with strict file path boundaries.
3. **Verify**: Apply a 3-tier adversarial validation model (Structural checks, CI status, and Gemini Chain-of-Thought semantic review).
4. **Repair**: Synthesize targeted repair prompts automatically when verification or CI checks fail.
5. **Ship**: Bundle changes into structured, traceable GitHub Pull Requests containing verification evidence and audit logs.

---

## ⚡ Key Capabilities

### 1. Progressive Task Decomposition & Streaming (PILLAR 1)
- **Autogeneration of Acceptance Criteria**: Analyzes the high-level goal and repository tree to synthesize clear, testable, outcome-driven criteria and safety constraints with one-click review and append/replace options.
- Leverages Gemini with Server-Sent Events (`/api/gemini/plan-stream`) for instant, progressive task rendering.
- Decomposes high-level intent into atomic tasks complete with:
  - Estimated risk (`low`, `medium`, `high`) and complexity (`small`, `medium`, `large`).
  - Explicit dependency graph (`depends_on: ["TASK-1"]`).
  - Strict filesystem guardrails (`expected_paths`, `forbidden_paths`).
  - High-precision prompts tailored for agent execution.
- **Test-First (TDD) Mode**: Splits feature requests into explicit failing test creation tasks followed by implementation tasks.

### 2. Autonomous Execution with Jules Engine
- Live-only dispatch to the **Google Jules API** — every task is a real, remotely-executed session; there is no simulated or demo execution path.
- After dispatch, the session id is returned so progress can be tracked at jules.google.

### 3. Multi-Layer Adversarial Verification (PILLAR 2)
Before any pull request is generated, changes undergo three layers of scrutiny:
1. **Structural Verification**:
   - **Blast Radius Containment**: Instant fast-fail if protected paths (e.g. `.github/workflows/`, `db/migrations/`, `auth/`) are modified without explicit authorization.
   - Threshold enforcement for maximum files touched, line additions, and deletions.
   - Verification that unit/integration tests were added or updated.
2. **CI Check Status**:
   - Live querying of GitHub Check Runs and Actions workflow conclusions.
3. **Semantic & Adversarial Review**:
   - Chain-of-Thought (CoT) reasoning where Gemini evaluates the raw git patch against each acceptance criterion individually (`pass` / `fail` / `unclear`) with concrete line-by-line evidence.

### 4. Automated Self-Healing Repair Loop
- When tests fail or verification catches regressions, the system generates a targeted **Repair Mission**.
- Combines failed criteria, diff summaries, and compiler logs to guide the agent toward the minimal corrective patch without human intervention.
- Configurable maximum repair attempts before escalating to human review.

### 5. GitHub Pull Request & Audit Orchestration
- Generates standardized PR descriptions containing acceptance criteria checklists, verification summaries, risk assessments, and collapsible CoT audit traces.
- One-click PR creation and automated verification comment publishing via GitHub REST API.

---

## 🔄 The 5-Stage Mission Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   1. GOAL    │ ──> │   2. PLAN    │ ──> │  3. EXECUTE  │ ──> │  4. VERIFY   │ ──> │  5. REPORT   │
│ Define repo, │     │ Decompose &  │     │ Run Jules AI │     │ 3-tier checks│     │ Export PR,   │
│ criteria, &  │     │ build graph  │     │ agent on     │     │ & adversarial│     │ publish audit│
│ constraints  │     │ (TDD toggle) │     │ work branch  │     │ review (CoT) │     │ to GitHub    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘     └──────────────┘
                                                                      │ (Failed)
                                                                      ▼
                                                              ┌──────────────┐
                                                              │ AUTO REPAIR  │
                                                              │ Synthesize   │
                                                              │ fix & retry  │
                                                              └──────────────┘
```

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT (React 19 + Vite)                │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Goal Tab     │  │ Plan Tab     │  │ Execute Tab  │  │ Verify Tab │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ State Store & API Services (GitHubService, JulesService, Gemini)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP / SSE / Custom Headers
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVER (Express + Node.js)                 │
│                                                                        │
│  • Rate Limiting & Header Sanitization (Masks Tokens in Logs)          │
│  • 15-Minute In-Memory Repository Context Cache                        │
│  • Blast Radius Containment Engine (Instant Scope Violation Check)     │
│                                                                        │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────┐  │
│  │ /api/repo/*     │    │ /api/gemini/*    │    │ /api/jules/*      │  │
│  │ Context fetcher │    │ Plan, SSE stream,│    │ Task create proxy │  │
│  │ & Tree caching  │    │ CoT verification │    │ (live dispatch)   │  │
│  └────────┬────────┘    └────────┬─────────┘    └────────┬──────────┘  │
└───────────┼──────────────────────┼───────────────────────┼─────────────┘
            │                      │                       │
            ▼                      ▼                       ▼
    ┌──────────────┐       ┌──────────────┐        ┌──────────────┐
    │  GitHub API  │       │  Gemini API  │        │  Jules API   │
    │  (REST / v3) │       │ (3.7 Flash)  │        │ (Agent Run)  │
    └──────────────┘       └──────────────┘        └──────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **bun** / **yarn**
- **Gemini API Key** (Free or Paid tier from Google AI Studio / Vertex AI)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/jules-repomission-studio.git
cd jules-repomission-studio
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and provide your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=3000
```

### 3. Launch Development Server
```bash
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## ⚙️ Environment Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **Yes** | `""` | Google Gemini API key used for task decomposition and verification. |
| `PORT` | No | `3000` | Port for the Express server and Vite reverse proxy. |
| `NODE_ENV` | No | `development` | Environment mode (`development` / `production`). |
| `APP_URL` | No | `http://localhost:3000` | Publicly accessible base URL for the server. |
| `GITHUB_TOKEN` | No | `""` | Optional server-level GitHub personal access token fallback. |
| `JULES_API_KEY` | No | `""` | Optional server-level Jules API key fallback. |
| `JULES_BASE_URL`| No | `https://jules.googleapis.com` | Base endpoint for the Jules agent runtime. |

> 💡 **Tip**: Developers can also supply their `GitHub Token` and `Jules API Key` directly in the application's **Settings Tab**. Client-provided keys are sent via secure custom headers (`X-GitHub-Token`, `X-Jules-Key`) and are never written to disk or logged.

---

## 🚢 Running in Production & Deployment

### Build Command
Compile the client assets with Vite and bundle the backend server with `esbuild`:
```bash
npm run build
```
This produces:
- `dist/` containing optimized static client assets.
- `dist/server.cjs` containing the standalone Node server bundle.

### Start Command
```bash
npm start
```

---

### Docker & Container Deployment

Create a `Dockerfile` in the root directory:

```dockerfile
# Multi-stage production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

Build and run with Docker:
```bash
docker build -t jules-repomission-studio .
docker run -p 3000:3000 -e GEMINI_API_KEY="your_key" jules-repomission-studio
```

---

### Cloud Run / AWS ECS / VPS
Because the server listens on `0.0.0.0:3000` and automatically mounts Vite middleware in development while serving pre-built static assets from `dist/` in production, it is fully compatible with:
- **Google Cloud Run**
- **AWS App Runner / ECS**
- **Railway / Render / Fly.io**
- **Standard Linux VPS** (with Nginx + PM2)

---

## 🔒 Security & Credential Isolation

1. **Zero-Leak Header Sanitization**:
   All incoming requests with `X-GitHub-Token`, `X-Jules-Key`, or `Authorization` headers are scrubbed before logging.
2. **Server-Side API Key Concealment**:
   The `GEMINI_API_KEY` is strictly accessed in backend routes (`server.ts`) and is never delivered to the client bundle.
3. **Blast Radius Guardrails**:
   The verifier compares the git diff's `changedFiles` against `forbiddenPaths` (e.g. `package.json`, `.github/workflows/`, `security/`, `db/migrations/`). Any unauthorized modification triggers an immediate `scope_violation` verdict.
4. **Rate Limiting**:
   Protected by `express-rate-limit` (60 req/min for Gemini AI endpoints, 120 req/min for GitHub proxy).

---

## 📂 Project Structure

```
├── .env.example             # Platform-agnostic environment variable template
├── package.json             # Dependencies, build, and run scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite + TailwindCSS 4 configuration
├── server.ts                # Express backend (API routes, rate-limits, context cache)
├── index.html               # Main HTML entry point
├── src/
│   ├── main.tsx             # React DOM root entry
│   ├── App.tsx              # Application state machine & tab router
│   ├── index.css            # Global Tailwind CSS imports
│   ├── types/
│   │   └── index.ts         # Shared TypeScript interfaces & types
│   ├── data/
│   │   └── defaultSettings.ts # Default live-mode settings & guardrail paths
│   ├── services/
│   │   ├── geminiService.ts # Task decomposition, SSE stream, CoT verification
│   │   ├── githubService.ts # Context fetcher, branch compare, PR & CI integration
│   │   └── julesService.ts  # Jules session dispatch to the live API
│   └── components/
│       ├── Navbar.tsx       # Mission control header
│       ├── common/
│       │   ├── DiffViewer.tsx   # Unified git patch visualizer with syntax styling
│       │   └── TerminalLogs.tsx # Real-time execution log terminal
│       └── tabs/
│           ├── GoalTab.tsx      # Goal specification, acceptance criteria & TDD toggle
│           ├── PlanTab.tsx      # Decomposed task cards, dependency graph & approvals
│           ├── ExecuteTab.tsx   # Jules execution queue & live telemetry
│           ├── VerifyTab.tsx    # 3-tier adversarial verification & repair loop
│           ├── ReportTab.tsx    # Pull Request exporter & GitHub publish workflow
│           └── SettingsTab.tsx  # API credentials, temperature, safety thresholds
├── ARCHITECTURE.md          # In-depth architectural design & data flow diagrams
└── API.md                   # Complete REST API endpoint documentation
```

---

## 📚 API Reference

See the full API specification in [**API.md**](./API.md).

Quick summary of endpoints:
- `POST /api/repo/fetch-context` — Fetch and cache tree, manifests, and test directories.
- `POST /api/gemini/plan` — Decompose goals into structured task objects.
- `POST /api/gemini/plan-stream` — Stream plan chunks in real time via SSE.
- `POST /api/gemini/verify` — Execute structural and adversarial CoT verification on git patches.
- `POST /api/gemini/repair` — Synthesize minimal corrective repair instructions for failed tasks.
- `POST /api/jules/task/create` — Queue coding tasks to Jules agent.
- `GET /api/jules/task/:id` — Poll task execution progress and logs.
- `POST /api/github/compare` — Retrieve branch comparison and unified diffs.
- `POST /api/github/create-pr` — Create pull request on GitHub repository.
- `POST /api/github/comment-pr` — Post verification audit report as a PR comment.

---

## ❓ Troubleshooting & FAQ

### 1. "Failed to generate plan from Gemini"
- Ensure `GEMINI_API_KEY` is correctly defined in `.env` or passed via your host environment.
- Check rate limits or quota on your Gemini API account.

### 2. "GitHub compare returned 404 or empty diff"
- Verify that your GitHub Personal Access Token possesses `repo` scope.
- The branch you are comparing must exist on the remote; comparisons always run against the live GitHub API.

### 3. Why do I get "GitHub token is required for live mode"?
- RepoMission Studio is live-only: repository context, diffs, PR creation, and commenting all require a valid GitHub token (`contents:read` and `pull_requests:write` scopes for fine-grained PATs).
- There is no demo/simulated fallback — any missing credential returns an explicit error instead of fabricated data.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
