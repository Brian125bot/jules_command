import { GoalInput, RepoContext, PlanResponse, BranchDiff, FullVerificationResult, SettingsState } from '../types';

export const DEFAULT_SETTINGS: SettingsState = {
  githubToken: '',
  githubBaseUrl: 'https://api.github.com',
  julesApiKey: '',
  julesBaseUrl: 'https://api.jules.dev',
  julesMode: 'mock',
  maxAutoRepairs: 2,
  requireHumanForHighRisk: true,
  requireCiPass: true,
  requireTests: true,
  maxFilesChanged: 15,
  maxAdditions: 800,
  maxDeletions: 400,
  defaultAllowedPaths: ['src/', 'lib/', 'tests/'],
  defaultForbiddenPaths: ['.github/workflows/', 'infrastructure/', 'secrets/', 'migrations/'],
  geminiModel: 'gemini-2.5-flash',
  geminiTemperature: 0.2,
};

export const SAMPLE_GOAL_PRESETS: { name: string; description: string; data: GoalInput }[] = [
  {
    name: 'Add CSV Export to Analytics Dashboard',
    description: 'Decompose and build client-side data export on acme/dashboard with unit tests and formatting.',
    data: {
      repo: 'acme/dashboard',
      baseBranch: 'main',
      goal: 'Add CSV export to the analytics dashboard so users can download their metrics and chart tables as structured CSV files.',
      acceptanceCriteria: [
        'Export button appears on the analytics dashboard header',
        'Clicking export generates and downloads a clean CSV file in the browser',
        'Filename includes the current ISO date and metric range (e.g. analytics-report-2026-08-16.csv)',
        'CSV contains proper column headers, escaped strings, and numerical formatting',
        'Unit tests are added covering CSV escaping, date stamp generation, and export trigger',
      ],
      constraints: [
        'Do not modify authentication or session layers',
        'Follow existing React and Tailwind design patterns',
        'Do not add heavy external export libraries if standard Blob API is sufficient',
        'Add comprehensive unit tests in tests/analytics/',
      ],
      allowedPaths: ['src/pages/analytics/', 'src/components/analytics/', 'src/utils/', 'tests/analytics/'],
      forbiddenPaths: ['.github/workflows/', 'infrastructure/', 'secrets/', 'migrations/', 'src/auth/'],
      mode: 'demo',
    },
  },
  {
    name: 'Implement Rate Limiting Middleware',
    description: 'Add token bucket rate limiter to API gateway with Redis fallback and telemetry headers.',
    data: {
      repo: 'acme/api-gateway',
      baseBranch: 'main',
      goal: 'Implement configurable token bucket rate-limiting middleware for high-traffic public API endpoints to protect backend microservices from denial of service.',
      acceptanceCriteria: [
        'Middleware intercepts all incoming HTTP requests to /api/v1/*',
        'Returns HTTP 429 Too Many Requests with Retry-After and X-RateLimit headers when quota exceeded',
        'Configurable rate window (requests per minute) based on API tier',
        'Graceful in-memory fallback if Redis connection is unavailable',
        'Unit and integration tests testing quota exhaustion and header format',
      ],
      constraints: [
        'Do not break existing healthcheck endpoint at /api/health',
        'Keep latency overhead under 2ms per request',
        'Do not alter database migration scripts',
        'Ensure thread-safe memory storage for fallback counter',
      ],
      allowedPaths: ['src/middleware/', 'src/config/', 'src/services/', 'tests/middleware/'],
      forbiddenPaths: ['.github/workflows/', 'infrastructure/terraform/', 'migrations/', 'secrets/'],
      mode: 'demo',
    },
  },
  {
    name: 'Add Dark Mode Theme Switcher',
    description: 'Add system-aware dark mode with localStorage persistence and smooth color transitions.',
    data: {
      repo: 'acme/webapp-core',
      baseBranch: 'main',
      goal: 'Implement system-aware dark mode theme switcher with user toggle preference and zero flash of unstyled theme on load.',
      acceptanceCriteria: [
        'Theme switcher toggle placed in user navigation bar',
        'Supports Light, Dark, and System preference options',
        'Preferences stored in localStorage and syncs with CSS class on root <html>',
        'Colors adhere to WCAG AA contrast standards',
        'Includes unit tests for ThemeProvider context and hook',
      ],
      constraints: [
        'Follow Tailwind CSS v4 color token architecture',
        'Zero layout shifts or hydration mismatches',
        'Do not modify backend API contracts',
      ],
      allowedPaths: ['src/components/theme/', 'src/context/', 'src/hooks/', 'tests/theme/'],
      forbiddenPaths: ['.github/workflows/', 'infrastructure/', 'database/'],
      mode: 'demo',
    },
  },
];

export const MOCK_REPO_CONTEXT: RepoContext = {
  summary: 'Modern TypeScript React analytics dashboard built with Vite, Tailwind CSS, Lucide icons, and Vitest.',
  defaultBranch: 'main',
  treeSummary: [
    'src/main.tsx',
    'src/App.tsx',
    'src/pages/analytics/AnalyticsDashboard.tsx',
    'src/pages/analytics/MetricCard.tsx',
    'src/components/analytics/DataTable.tsx',
    'src/components/analytics/TimeSeriesChart.tsx',
    'src/utils/formatters.ts',
    'src/utils/date.ts',
    'tests/analytics/AnalyticsDashboard.test.tsx',
    'tests/setup.ts',
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    '.github/workflows/ci.yml',
  ],
  relevantFiles: [
    'src/pages/analytics/AnalyticsDashboard.tsx',
    'src/components/analytics/DataTable.tsx',
    'src/utils/formatters.ts',
    'tests/analytics/AnalyticsDashboard.test.tsx',
    'package.json',
  ],
  testDirs: ['tests/', 'tests/analytics/'],
  hasCI: true,
  ciDetails: 'GitHub Actions workflow .github/workflows/ci.yml (runs lint, tsc, and vitest run)',
  manifestType: 'package.json (Node.js / React)',
  manifestContent: `{\n  "name": "acme-dashboard",\n  "dependencies": {\n    "react": "^19.0.0",\n    "lucide-react": "^0.540.0"\n  },\n  "devDependencies": {\n    "vitest": "^3.0.0",\n    "@testing-library/react": "^16.0.0"\n  }\n}`,
  rawReadmeSnippet: `# Acme Dashboard\nInternal business analytics telemetry interface for tracking customer conversion, daily active queries, and revenue trends.\n\n## Structure\n- \`src/pages/analytics\`: Core dashboard views and chart renderers\n- \`src/utils\`: Shared formatting and calculation routines\n- \`tests/\`: Vitest test suites`,
  fetchedAt: new Date().toISOString(),
  isMock: true,
};

export const MOCK_PLAN_RESPONSE: PlanResponse = {
  summary: 'Decompose CSV Export feature into 3 safe, additive tasks with isolated unit testing and UI integration.',
  open_questions: [
    'Should the CSV export include filtered views only or the complete raw dataset?',
    'Is UTF-8 BOM encoding needed for legacy Excel compatibility on Windows?',
  ],
  risks: [
    'Large datasets (>50k rows) might cause UI thread freeze during synchronous CSV stringification.',
    'Special characters in metric labels (commas, quotes, newlines) need RFC 4180 escaping.',
  ],
  tasks: [
    {
      id: 'TASK-01',
      title: 'Implement RFC 4180 CSV serializer and download helper utility',
      description: 'Create src/utils/csvExport.ts containing pure utility functions for escaping values, appending headers, formatting ISO filenames, and initiating browser Blob downloads.',
      why: 'Separates pure data transformation logic from UI components, making it 100% unit-testable and reusable.',
      risk: 'low',
      estimated_complexity: 'small',
      depends_on: [],
      expected_paths: ['src/utils/csvExport.ts', 'tests/utils/csvExport.test.ts'],
      forbidden_paths: ['src/auth/', '.github/workflows/', 'infrastructure/'],
      acceptance_criteria: [
        'Properly quotes strings containing commas, quotes, and newlines per RFC 4180',
        'Generates filename with format analytics-metrics-YYYY-MM-DD.csv',
        'Creates and revokes temporary Object URL for clean browser download',
        'Includes comprehensive unit tests covering edge cases and empty data',
      ],
      jules_prompt: `You are working on the repository acme/dashboard to add CSV export capability.

TASK OBJECTIVE:
Create a new utility module at src/utils/csvExport.ts and unit tests at tests/utils/csvExport.test.ts.

REQUIREMENTS:
1. Export a function \`exportToCsv<T>(data: T[], columns: { header: string; key: keyof T | ((item: T) => string | number) }[], filenamePrefix: string): void\`
2. Ensure values with commas, double quotes, or newlines are properly escaped with double quotes.
3. Automatically append the current UTC/ISO date to the generated filename.
4. Use standard browser \`Blob\` and \`URL.createObjectURL\` to trigger download, and invoke \`URL.revokeObjectURL\` after triggering.
5. Write full Vitest unit tests in tests/utils/csvExport.test.ts testing escaping, formatting, and edge cases.

CONSTRAINTS:
- Allowed paths: src/utils/csvExport.ts, tests/utils/csvExport.test.ts
- Forbidden paths: src/auth/, .github/workflows/, infrastructure/
- Do not import external CSV libraries; standard TypeScript/DOM is required.`,
      approvalStatus: 'approved',
    },
    {
      id: 'TASK-02',
      title: 'Integrate Export Button & Trigger into Analytics Dashboard',
      description: 'Update src/pages/analytics/AnalyticsDashboard.tsx to include an "Export CSV" action button in the action toolbar and wire it to table telemetry data.',
      why: 'Provides the visual user entry point and connects the UI state to the CSV generator.',
      risk: 'low',
      estimated_complexity: 'small',
      depends_on: ['TASK-01'],
      expected_paths: ['src/pages/analytics/AnalyticsDashboard.tsx', 'src/components/analytics/ExportButton.tsx'],
      forbidden_paths: ['src/auth/', '.github/workflows/'],
      acceptance_criteria: [
        'Export button with Download/FileSpreadsheet icon renders in analytics toolbar',
        'Clicking button reads current metrics table data and triggers exportToCsv',
        'Shows active loading or tooltip feedback while generating',
        'Disabled state when no metrics are loaded',
      ],
      jules_prompt: `You are working on the repository acme/dashboard.

TASK OBJECTIVE:
Add an Export CSV button component and integrate it into the Analytics Dashboard header.

REQUIREMENTS:
1. Create or update the header toolbar in src/pages/analytics/AnalyticsDashboard.tsx.
2. Render an "Export CSV" button using the existing Lucide Download icon and Tailwind styling consistent with surrounding buttons.
3. Wire the onClick event to call \`exportToCsv\` with the active analytics table dataset and formatted column definitions.
4. Ensure the button is disabled with an explanatory tooltip if dataset is empty.

CONSTRAINTS:
- Allowed paths: src/pages/analytics/AnalyticsDashboard.tsx, src/components/analytics/ExportButton.tsx
- Do not modify authentication, routing, or global state stores.`,
      approvalStatus: 'approved',
    },
    {
      id: 'TASK-03',
      title: 'Add component integration tests for export workflow',
      description: 'Write integration test in tests/analytics/AnalyticsExport.test.tsx verifying the full click-to-download lifecycle with mocked URL.createObjectURL.',
      why: 'Guarantees acceptance criteria pass without manual regression testing.',
      risk: 'low',
      estimated_complexity: 'small',
      depends_on: ['TASK-01', 'TASK-02'],
      expected_paths: ['tests/analytics/AnalyticsExport.test.tsx'],
      forbidden_paths: ['.github/workflows/', 'infrastructure/'],
      acceptance_criteria: [
        'Simulates user click on Export CSV button',
        'Verifies mock Blob creation and download click',
        'Verifies expected CSV header columns in generated payload',
      ],
      jules_prompt: `You are writing automated tests on acme/dashboard.

TASK OBJECTIVE:
Create integration test file tests/analytics/AnalyticsExport.test.tsx using Vitest and @testing-library/react.

REQUIREMENTS:
1. Mock \`URL.createObjectURL\` and \`URL.revokeObjectURL\` cleanly in setup.
2. Render AnalyticsDashboard with mock metrics data.
3. Simulate user clicking the "Export CSV" button.
4. Assert that URL.createObjectURL was invoked with a Blob containing the expected CSV string.

CONSTRAINTS:
- Allowed paths: tests/analytics/AnalyticsExport.test.tsx
- Do not modify production source code in this task.`,
      approvalStatus: 'approved',
    },
  ],
};

export const MOCK_BRANCH_DIFF: BranchDiff = {
  totalAdditions: 142,
  totalDeletions: 4,
  totalFiles: 3,
  baseCommit: 'a1b2c3d',
  headCommit: 'e4f5g6h',
  files: [
    {
      filename: 'src/utils/csvExport.ts',
      status: 'added',
      additions: 68,
      deletions: 0,
      isForbidden: false,
      isTest: false,
      isDoc: false,
      patch: `@@ -0,0 +1,68 @@
+/**
+ * RFC 4180 Compliant CSV Export Utility
+ */
+export interface CsvColumn<T> {
+  header: string;
+  accessor: keyof T | ((row: T) => string | number | null | undefined);
+}
+
+export function escapeCsvCell(value: unknown): string {
+  if (value === null || value === undefined) return '';
+  const str = String(value);
+  if (str.includes(',') || str.includes('"') || str.includes('\\n') || str.includes('\\r')) {
+    return \`"\${str.replace(/"/g, '""')}"\`;
+  }
+  return str;
+}
+
+export function generateCsvString<T>(data: T[], columns: CsvColumn<T>[]): string {
+  const headerRow = columns.map(c => escapeCsvCell(c.header)).join(',');
+  const bodyRows = data.map(row => {
+    return columns.map(col => {
+      const raw = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
+      return escapeCsvCell(raw);
+    }).join(',');
+  });
+  return [headerRow, ...bodyRows].join('\\r\\n');
+}
+
+export function exportToCsv<T>(
+  data: T[],
+  columns: CsvColumn<T>[],
+  filenamePrefix = 'analytics-report'
+): void {
+  const csvContent = generateCsvString(data, columns);
+  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
+  const url = URL.createObjectURL(blob);
+  const dateStr = new Date().toISOString().split('T')[0];
+  const filename = \`\${filenamePrefix}-\${dateStr}.csv\`;
+
+  const link = document.createElement('a');
+  link.setAttribute('href', url);
+  link.setAttribute('download', filename);
+  link.style.visibility = 'hidden';
+  document.body.appendChild(link);
+  link.click();
+  document.body.removeChild(link);
+  URL.revokeObjectURL(url);
+}`,
    },
    {
      filename: 'src/pages/analytics/AnalyticsDashboard.tsx',
      status: 'modified',
      additions: 26,
      deletions: 4,
      isForbidden: false,
      isTest: false,
      isDoc: false,
      patch: `@@ -12,6 +12,7 @@ import { TimeSeriesChart } from '../../components/analytics/TimeSeriesChart';
 import { DataTable } from '../../components/analytics/DataTable';
-import { RefreshCw, Filter } from 'lucide-react';
+import { RefreshCw, Filter, Download } from 'lucide-react';
+import { exportToCsv, CsvColumn } from '../../utils/csvExport';
 
 export function AnalyticsDashboard() {
   const [metrics, setMetrics] = useState<MetricRow[]>([]);
+
+  const handleExportCsv = () => {
+    if (!metrics.length) return;
+    const columns: CsvColumn<MetricRow>[] = [
+      { header: 'Metric ID', accessor: 'id' },
+      { header: 'Dimension Name', accessor: 'name' },
+      { header: 'Total Visitors', accessor: 'visitors' },
+      { header: 'Conversion Rate (%)', accessor: row => (row.conversionRate * 100).toFixed(2) },
+      { header: 'Timestamp', accessor: 'recordedAt' },
+    ];
+    exportToCsv(metrics, columns, 'analytics-metrics');
+  };
+
   return (
     <div className="p-6 space-y-6">
       <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold">Analytics Overview</h1>
         <div className="flex items-center gap-3">
+          <button
+            id="btn-export-csv"
+            onClick={handleExportCsv}
+            disabled={metrics.length === 0}
+            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
+          >
+            <Download className="w-4 h-4 text-slate-500" />
+            Export CSV
+          </button>
           <button className="btn-secondary">Filter</button>
         </div>
       </div>`,
    },
    {
      filename: 'tests/analytics/AnalyticsExport.test.tsx',
      status: 'added',
      additions: 48,
      deletions: 0,
      isForbidden: false,
      isTest: true,
      isDoc: false,
      patch: `@@ -0,0 +1,48 @@
+import { describe, it, expect, vi, beforeEach } from 'vitest';
+import { render, screen, fireEvent } from '@testing-library/react';
+import { AnalyticsDashboard } from '../../src/pages/analytics/AnalyticsDashboard';
+import * as csvExport from '../../src/utils/csvExport';
+
+describe('Analytics Dashboard CSV Export', () => {
+  beforeEach(() => {
+    vi.restoreAllMocks();
+  });
+
+  it('renders Export CSV button with download icon', () => {
+    render(<AnalyticsDashboard />);
+    const exportBtn = screen.getByRole('button', { name: /export csv/i });
+    expect(exportBtn).toBeInTheDocument();
+  });
+
+  it('calls exportToCsv with correct dataset and column schema on click', async () => {
+    const exportSpy = vi.spyOn(csvExport, 'exportToCsv').mockImplementation(() => {});
+    render(<AnalyticsDashboard />);
+    
+    const exportBtn = screen.getByRole('button', { name: /export csv/i });
+    fireEvent.click(exportBtn);
+
+    expect(exportSpy).toHaveBeenCalledTimes(1);
+    expect(exportSpy.mock.calls[0][2]).toBe('analytics-metrics');
+  });
+
+  it('escapes cells containing commas and quotes properly', () => {
+    const sampleData = [{ id: '1', name: 'Sales, "Enterprise"', visitors: 100 }];
+    const columns = [
+      { header: 'ID', accessor: 'id' as const },
+      { header: 'Name', accessor: 'name' as const },
+    ];
+    const csv = csvExport.generateCsvString(sampleData, columns);
+    expect(csv).toContain('"Sales, ""Enterprise"""');
+  });
+});`,
    },
  ],
};

export const MOCK_VERIFICATION_RESULT: FullVerificationResult = {
  headBranch: 'jules/add-csv-export/task-1',
  baseBranch: 'main',
  timestamp: new Date().toISOString(),
  structural: {
    pass: true,
    fileCount: 3,
    additions: 142,
    deletions: 4,
    forbiddenPathsTouched: [],
    testsAddedOrUpdated: true,
    docsUpdated: false,
    warnings: [],
  },
  ci: {
    pass: true,
    status: 'success',
    checkRuns: [
      { name: 'Lint (ESLint + TypeScript)', status: 'completed', conclusion: 'success' },
      { name: 'Unit & Component Tests (Vitest)', status: 'completed', conclusion: 'success' },
      { name: 'Security Audit (npm audit)', status: 'completed', conclusion: 'success' },
      { name: 'Build (Vite bundle verification)', status: 'completed', conclusion: 'success' },
    ],
    message: 'All 4 CI checks passed cleanly in 28s.',
  },
  semantic: {
    pass: true,
    score: 0.96,
    summary: 'The branch successfully implements the CSV export feature. Clean separation of concerns with a dedicated RFC 4180 compliant utility, seamless UI button integration, and high test coverage. No forbidden paths were modified.',
    criteriaResults: [
      {
        criterion: 'Export button appears on the analytics dashboard',
        status: 'pass',
        evidence: 'Added Download button to AnalyticsDashboard.tsx header with id="btn-export-csv" and icon.',
      },
      {
        criterion: 'Clicking export downloads a CSV file',
        status: 'pass',
        evidence: 'exportToCsv creates a Blob with text/csv mime type and triggers browser download anchor click.',
      },
      {
        criterion: 'Filename includes the current date',
        status: 'pass',
        evidence: 'Filename generator dynamically inserts new Date().toISOString().split("T")[0] into analytics-metrics-YYYY-MM-DD.csv.',
      },
      {
        criterion: 'CSV contains column headers and escaped cells',
        status: 'pass',
        evidence: 'generateCsvString maps column definitions into header line and escapes commas and double-quotes with RFC 4180 quotes.',
      },
      {
        criterion: 'Tests added covering CSV export',
        status: 'pass',
        evidence: 'Added tests/analytics/AnalyticsExport.test.tsx with unit and component integration test coverage.',
      },
    ],
    risks: [
      'For massive telemetry tables (>100k rows), in-memory string concat could benefit from streaming in future iterations.',
    ],
    suggestedFixes: [],
  },
  overallAction: 'approve',
  diff: MOCK_BRANCH_DIFF,
};
