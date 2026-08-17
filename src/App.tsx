import React, { useState, useEffect, useRef } from 'react';
import {
  GoalInput,
  PlanResponse,
  PlanTask,
  ExecutionItem,
  FullVerificationResult,
  BranchDiff,
  SettingsState,
  RepoContext,
} from './types';
import {
  DEFAULT_SETTINGS,
  SAMPLE_GOAL_PRESETS,
  MOCK_REPO_CONTEXT,
  MOCK_BRANCH_DIFF,
  MOCK_VERIFICATION_RESULT,
} from './data/mockData';
import { Navbar, TabKey } from './components/Navbar';
import { GoalTab } from './components/tabs/GoalTab';
import { PlanTab } from './components/tabs/PlanTab';
import { ExecuteTab } from './components/tabs/ExecuteTab';
import { VerifyTab } from './components/tabs/VerifyTab';
import { ReportTab } from './components/tabs/ReportTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { GitHubService } from './services/githubService';
import { JulesService } from './services/julesService';
import { GeminiService } from './services/geminiService';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('goal');
  const [goalInput, setGoalInput] = useState<GoalInput>(SAMPLE_GOAL_PRESETS[0].data);
  const [repoContext, setRepoContext] = useState<RepoContext | null>(MOCK_REPO_CONTEXT);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [executionQueue, setExecutionQueue] = useState<ExecutionItem[]>([]);
  const [verificationResult, setVerificationResult] = useState<FullVerificationResult | null>(null);
  const [branchDiff, setBranchDiff] = useState<BranchDiff | null>(MOCK_BRANCH_DIFF);
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  // Loading states
  const [isFetchingRepo, setIsFetchingRepo] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Polling tracker for running Jules tasks
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervals.current.forEach(timer => clearInterval(timer));
      pollingIntervals.current.clear();
    };
  }, []);

  // Preset Selection
  const handleSelectPreset = (preset: GoalInput) => {
    setGoalInput(preset);
    setRepoContext(MOCK_REPO_CONTEXT);
    setPlan(null);
    setExecutionQueue([]);
    setVerificationResult(null);
    setActiveTab('goal');
    showToast(`Loaded preset goal: "${preset.goal.slice(0, 45)}..."`, 'info');
  };

  // Reset workspace
  const handleResetWorkspace = () => {
    setGoalInput(SAMPLE_GOAL_PRESETS[0].data);
    setRepoContext(null);
    setPlan(null);
    setExecutionQueue([]);
    setVerificationResult(null);
    setBranchDiff(null);
    setActiveTab('goal');
    showToast('Workspace reset to defaults.', 'info');
  };

  // Fetch Repo Context
  const handleFetchRepoContext = async () => {
    setIsFetchingRepo(true);
    try {
      const context = await GitHubService.fetchRepoContext({
        repo: goalInput.repo,
        baseBranch: goalInput.baseBranch,
        token: settings.githubToken,
        baseUrl: settings.githubBaseUrl,
        mode: goalInput.mode,
      });
      setRepoContext(context);
      showToast(`Repository context loaded for ${goalInput.repo}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch repository context', 'warning');
    } finally {
      setIsFetchingRepo(false);
    }
  };

  // Generate Plan via Gemini
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const generatedPlan = await GeminiService.decomposeGoal({
        goalInput,
        repoContext,
        settings,
      });

      // Default safe tasks to approved, high risk to draft
      const tasksWithApprovals: PlanTask[] = generatedPlan.tasks.map(t => ({
        ...t,
        approvalStatus: t.risk === 'low' ? 'approved' : 'draft',
      }));

      setPlan({
        ...generatedPlan,
        tasks: tasksWithApprovals,
      });

      // Seed initial execution queue items
      const initialQueue: ExecutionItem[] = tasksWithApprovals.map(t => {
        const slug = goalInput.goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
        return {
          taskId: t.id,
          taskTitle: t.title,
          branchName: `jules/${slug}/${t.id.toLowerCase()}`,
          status: 'pending',
          progress: 0,
          currentStage: 'Pending approval & trigger',
          logs: [],
        };
      });
      setExecutionQueue(initialQueue);

      setActiveTab('plan');
      showToast(`Generated ${generatedPlan.tasks.length} task implementation plan!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to decompose goal with Gemini', 'warning');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = (taskId: string, status: 'approved' | 'rejected' | 'draft') => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map(t =>
      t.id === taskId ? { ...t, approvalStatus: status } : t
    );
    setPlan({ ...plan, tasks: updatedTasks });
    showToast(`Task ${taskId} marked as ${status}`, 'info');
  };

  // Update Task Contents
  const handleUpdateTask = (updatedTask: PlanTask) => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t));
    setPlan({ ...plan, tasks: updatedTasks });
    showToast(`Task ${updatedTask.id} updated`, 'success');
  };

  // Approve all safe tasks
  const handleApproveAllSafeTasks = () => {
    if (!plan) return;
    const updatedTasks = plan.tasks.map(t =>
      t.risk === 'low' ? { ...t, approvalStatus: 'approved' as const } : t
    );
    setPlan({ ...plan, tasks: updatedTasks });
    showToast('Approved all low-risk safe tasks.', 'success');
  };

  // Request human review for high risk
  const handleRequestHumanReviewHighRisk = () => {
    showToast('High-risk tasks marked for explicit operator review.', 'info');
  };

  // Start polling a specific Jules task until completion
  const startTaskPolling = (taskId: string, julesTaskId: string) => {
    if (pollingIntervals.current.has(taskId)) {
      clearInterval(pollingIntervals.current.get(taskId)!);
    }

    const interval = setInterval(async () => {
      try {
        const statusRes = await JulesService.getTaskStatus({
          taskId: julesTaskId,
          apiKey: settings.julesApiKey,
          baseUrl: settings.julesBaseUrl,
        });

        setExecutionQueue(prev =>
          prev.map(item => {
            if (item.taskId === taskId) {
              return {
                ...item,
                status: statusRes.status,
                progress: statusRes.progress,
                currentStage: statusRes.currentStage,
                logs: statusRes.logs || item.logs,
                error: statusRes.error,
              };
            }
            return item;
          })
        );

        if (statusRes.status === 'completed' || statusRes.status === 'failed' || statusRes.status === 'cancelled') {
          clearInterval(interval);
          pollingIntervals.current.delete(taskId);
          if (statusRes.status === 'completed') {
            showToast(`Jules task ${taskId} completed successfully!`, 'success');
          } else if (statusRes.status === 'failed') {
            showToast(`Jules task ${taskId} failed. Check execution logs.`, 'warning');
          }
        }
      } catch {
        // Continue polling
      }
    }, 1500);

    pollingIntervals.current.set(taskId, interval);
  };

  // Execute a single task
  const handleExecuteTask = async (taskId: string, forceHighRisk: boolean = false) => {
    if (!plan) return;
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) return;

    const slug = goalInput.goal.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
    const branchName = `jules/${slug}/${task.id.toLowerCase()}`;

    setExecutionQueue(prev =>
      prev.map(item =>
        item.taskId === taskId
          ? {
              ...item,
              status: 'submitted',
              progress: 5,
              currentStage: 'Submitting sandbox job to Jules API...',
              logs: [`[${new Date().toLocaleTimeString()}] Submitting task ${taskId} to Jules agent...`],
            }
          : item
      )
    );

    try {
      const res = await JulesService.startTask({
        task,
        repo: goalInput.repo,
        baseBranch: goalInput.baseBranch,
        branchName,
        apiKey: settings.julesApiKey,
        baseUrl: settings.julesBaseUrl,
        mode: goalInput.mode,
      });

      setExecutionQueue(prev =>
        prev.map(item =>
          item.taskId === taskId
            ? {
                ...item,
                julesTaskId: res.taskId,
                status: 'running',
                progress: 15,
                currentStage: 'Cloning repository into isolated container...',
              }
            : item
        )
      );

      startTaskPolling(taskId, res.taskId);
    } catch (err: any) {
      setExecutionQueue(prev =>
        prev.map(item =>
          item.taskId === taskId
            ? {
                ...item,
                status: 'failed',
                error: err.message || 'Execution failed to launch',
              }
            : item
        )
      );
      showToast(`Failed to launch Jules task ${taskId}`, 'warning');
    }
  };

  // Execute all approved tasks in sequence
  const handleExecuteAllApproved = async () => {
    if (!plan) return;
    setIsExecutingAll(true);
    const approvedTasks = plan.tasks.filter(t => t.approvalStatus === 'approved');

    for (const task of approvedTasks) {
      await handleExecuteTask(task.id);
      // Brief spacing between dispatches
      await new Promise(r => setTimeout(r, 600));
    }
    setIsExecutingAll(false);
    showToast(`Dispatched ${approvedTasks.length} tasks to Jules execution queue.`, 'info');
  };

  // Cancel running task
  const handleCancelTask = async (taskId: string) => {
    const item = executionQueue.find(i => i.taskId === taskId);
    if (!item || !item.julesTaskId) return;

    if (pollingIntervals.current.has(taskId)) {
      clearInterval(pollingIntervals.current.get(taskId)!);
      pollingIntervals.current.delete(taskId);
    }

    try {
      await JulesService.cancelTask({
        taskId: item.julesTaskId,
        apiKey: settings.julesApiKey,
        baseUrl: settings.julesBaseUrl,
      });
      setExecutionQueue(prev =>
        prev.map(i => (i.taskId === taskId ? { ...i, status: 'cancelled', currentStage: 'Execution cancelled by operator' } : i))
      );
      showToast(`Task ${taskId} cancelled.`, 'info');
    } catch {
      showToast(`Unable to cancel task ${taskId}`, 'warning');
    }
  };

  // Retry task
  const handleRetryTask = async (taskId: string) => {
    await handleExecuteTask(taskId);
  };

  // Run full multi-layer verification
  const handleRunVerification = async (headBranch: string, baseBranch: string) => {
    setIsVerifying(true);
    try {
      // 1. Fetch Diff
      const diff = await GitHubService.getBranchDiff({
        repo: goalInput.repo,
        base: baseBranch,
        head: headBranch,
        token: settings.githubToken,
        baseUrl: settings.githubBaseUrl,
        mode: goalInput.mode,
      });
      setBranchDiff(diff);

      // 2. Fetch CI status
      const ciStatus = await GitHubService.getCiStatus({
        repo: goalInput.repo,
        ref: headBranch,
        token: settings.githubToken,
        baseUrl: settings.githubBaseUrl,
        mode: goalInput.mode,
      });

      // 3. Run semantic verification via Gemini
      const result = await GeminiService.verifyBranch({
        goalInput,
        diff,
        ciStatus,
        settings,
        headBranch,
        baseBranch,
      });

      setVerificationResult(result);
      showToast('Multi-layer verification gate completed!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Verification encountered an issue', 'warning');
    } finally {
      setIsVerifying(false);
    }
  };

  // Generate repair prompt
  const handleGenerateRepairPrompt = async (failedCriteria: string[], issues: string[]) => {
    return await GeminiService.generateRepairPrompt(goalInput, failedCriteria, issues);
  };

  // Quick navigation helpers
  const handleProceedToExecution = () => {
    setActiveTab('execute');
  };

  const handleProceedToVerify = (branchName: string) => {
    setActiveTab('verify');
    handleRunVerification(branchName, goalInput.baseBranch);
  };

  const handleProceedToReport = () => {
    setActiveTab('report');
  };

  const approvedTasks = (plan?.tasks || []).filter(t => t.approvalStatus === 'approved');
  const isExecuting = executionQueue.some(i => i.status === 'running' || i.status === 'submitted');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="global-toast-notification"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all animate-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toastMessage.type === 'warning'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Mission Control Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        goalInput={goalInput}
        onSelectPreset={handleSelectPreset}
        onResetWorkspace={handleResetWorkspace}
        isExecuting={isExecuting}
      />

      {/* Sub Header Bar */}
      <div className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700 font-semibold border border-slate-200/80 shrink-0">
            {goalInput.repo || 'acme/analytics-api'}
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-800 truncate">
            Mission: {goalInput.goal.length > 60 ? `${goalInput.goal.slice(0, 60)}...` : goalInput.goal}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-tight ${
              goalInput.mode === 'live'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                goalInput.mode === 'live' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            {goalInput.mode === 'live' ? 'Live Mode Active' : 'Demo Mode Active'}
          </div>
          {activeTab === 'plan' && plan && plan.tasks.length > 0 && (
            <button
              onClick={handleApproveAllSafeTasks}
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded text-xs font-bold transition-colors"
            >
              Approve All Safe Tasks
            </button>
          )}
        </div>
      </div>

      {/* Main Mission Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'goal' && (
          <GoalTab
            goalInput={goalInput}
            onGoalInputChange={setGoalInput}
            repoContext={repoContext}
            onFetchRepoContext={handleFetchRepoContext}
            onGeneratePlan={handleGeneratePlan}
            isFetchingRepo={isFetchingRepo}
            isGeneratingPlan={isGeneratingPlan}
            settings={settings}
          />
        )}

        {activeTab === 'plan' && (
          <PlanTab
            plan={plan}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onUpdateTask={handleUpdateTask}
            onApproveAllSafeTasks={handleApproveAllSafeTasks}
            onRequestHumanReviewHighRisk={handleRequestHumanReviewHighRisk}
            onProceedToExecution={handleProceedToExecution}
            onRegeneratePlan={handleGeneratePlan}
            isGeneratingPlan={isGeneratingPlan}
          />
        )}

        {activeTab === 'execute' && (
          <ExecuteTab
            executionQueue={executionQueue}
            approvedTasks={approvedTasks}
            goalInput={goalInput}
            settings={settings}
            onExecuteTask={handleExecuteTask}
            onExecuteAllApproved={handleExecuteAllApproved}
            onCancelTask={handleCancelTask}
            onRetryTask={handleRetryTask}
            onProceedToVerify={handleProceedToVerify}
            isExecutingAll={isExecutingAll}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyTab
            verificationResult={verificationResult}
            goalInput={goalInput}
            settings={settings}
            branchDiff={branchDiff}
            onRunVerification={handleRunVerification}
            onGenerateRepairPrompt={handleGenerateRepairPrompt}
            onProceedToReport={handleProceedToReport}
            isVerifying={isVerifying}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            goalInput={goalInput}
            verificationResult={verificationResult}
            tasks={plan?.tasks || []}
            settings={settings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={setSettings}
            onResetSettings={() => setSettings(DEFAULT_SETTINGS)}
          />
        )}
      </main>

      {/* Clean Minimalism Status Bar */}
      <footer className="h-9 bg-slate-50 border-t border-slate-200 flex items-center px-4 sm:px-6 lg:px-8 justify-between text-[10px] font-medium text-slate-500 font-mono shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>GITHUB: CONNECTED</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            <span>JULES API: {isExecuting ? 'EXECUTING' : 'READY'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span>GEMINI: OPERATIONAL</span>
          </div>
        </div>
        <div className="text-slate-400">
          LATENCY: 86MS | SESSION: JRS-{goalInput.repo.replace('/', '_').toUpperCase().slice(0, 10)}
        </div>
      </footer>
    </div>
  );
}
