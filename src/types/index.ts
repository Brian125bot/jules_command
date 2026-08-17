export type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'jules_running'
  | 'running'
  | 'submitted'
  | 'verifying'
  | 'passed'
  | 'completed'
  | 'failed'
  | 'failed_verification'
  | 'repairing'
  | 'escalated_to_human'
  | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ComplexityLevel = 'small' | 'medium' | 'large';
export type TaskApprovalStatus = 'draft' | 'approved' | 'rejected';
export type RecommendedAction = 'approve' | 'request_fixes' | 'request_human_review';

export interface GoalInput {
  repo: string; // e.g. "acme/dashboard"
  baseBranch: string; // e.g. "main"
  goal: string;
  acceptanceCriteria: string[];
  constraints: string[];
  allowedPaths: string[];
  forbiddenPaths: string[];
  mode: 'demo' | 'live';
  testFirstMode?: boolean; // v1: split feature tasks into failing test + implementation
}

export interface RepoContext {
  summary: string;
  defaultBranch: string;
  treeSummary: string[];
  relevantFiles: string[];
  testDirs: string[];
  hasCI: boolean;
  ciDetails?: string;
  manifestType?: string;
  manifestContent?: string;
  rawReadmeSnippet?: string;
  fetchedAt?: string;
  isMock?: boolean;
  cached?: boolean;
}

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  why: string;
  risk: RiskLevel;
  estimated_complexity: ComplexityLevel;
  depends_on: string[];
  expected_paths: string[];
  forbidden_paths: string[];
  acceptance_criteria: string[];
  jules_prompt: string;
  approvalStatus?: TaskApprovalStatus;
  is_high_risk?: boolean;
  is_test_task?: boolean;
  is_repair_task?: boolean;
  repair_attempt?: number;
}

export interface PlanResponse {
  summary: string;
  open_questions: string[];
  risks: string[];
  tasks: PlanTask[];
}

export interface ChangedFile {
  filename: string;
  status: 'modified' | 'added' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch?: string;
  isForbidden?: boolean;
  isTest?: boolean;
  isDoc?: boolean;
}

export interface BranchDiff {
  files: ChangedFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  rawPatch?: string;
  baseCommit?: string;
  headCommit?: string;
  scopeViolation?: boolean;
  scopeViolationDetails?: string;
}

export interface ExecutionItem {
  taskId: string;
  taskTitle: string;
  branchName: string;
  julesTaskId?: string;
  status: ExecutionStatus;
  progress: number;
  currentStage: string;
  logs: string[];
  startedAt?: string;
  completedAt?: string;
  diff?: BranchDiff;
  error?: string;
  repairCount?: number;
  verificationResult?: FullVerificationResult;
}

export interface CriterionResult {
  criterion: string;
  status: 'pass' | 'fail' | 'unclear';
  evidence: string;
}

export interface StructuralVerification {
  pass: boolean;
  fileCount: number;
  additions: number;
  deletions: number;
  forbiddenPathsTouched: string[];
  testsAddedOrUpdated: boolean;
  docsUpdated: boolean;
  warnings: string[];
  scopeViolation?: boolean;
}

export interface CiCheckRun {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | 'unknown';
  detailsUrl?: string;
}

export interface CiVerification {
  pass: boolean;
  status: 'success' | 'failure' | 'pending' | 'unknown';
  checkRuns: CiCheckRun[];
  message?: string;
}

export interface SemanticVerification {
  pass: boolean;
  score: number;
  criteriaResults: CriterionResult[];
  summary: string;
  risks: string[];
  suggestedFixes: string[];
  thinking?: string;
}

export interface FullVerificationResult {
  headBranch: string;
  baseBranch: string;
  timestamp: string;
  structural: StructuralVerification;
  ci: CiVerification;
  semantic: SemanticVerification;
  overallAction: RecommendedAction;
  diff: BranchDiff;
}

export interface SettingsState {
  githubToken: string;
  githubBaseUrl: string;
  julesApiKey: string;
  julesBaseUrl: string;
  julesMode?: 'mock' | 'live';
  maxAutoRepairs: number;
  requireHumanForHighRisk: boolean;
  requireCiPass: boolean;
  requireTests: boolean;
  maxFilesChanged: number;
  maxAdditions: number;
  maxDeletions: number;
  defaultAllowedPaths: string[];
  defaultForbiddenPaths: string[];
  geminiModel: string;
  geminiTemperature: number;
}
