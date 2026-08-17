import React, { useState } from 'react';
import { ExecutionItem, PlanTask, GoalInput, SettingsState } from '../../types';
import {
  Play,
  RotateCw,
  Terminal,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  GitBranch,
  Layers,
  Pause,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { TerminalLogs } from '../common/TerminalLogs';

interface ExecuteTabProps {
  executionQueue: ExecutionItem[];
  approvedTasks: PlanTask[];
  goalInput: GoalInput;
  settings: SettingsState;
  onExecuteTask: (taskId: string, forceHighRisk?: boolean) => Promise<void>;
  onExecuteAllApproved: () => Promise<void>;
  onRetryTask: (taskId: string) => Promise<void>;
  onProceedToVerify: (branchName: string) => void;
  isExecutingAll: boolean;
}

export const ExecuteTab: React.FC<ExecuteTabProps> = ({
  executionQueue,
  approvedTasks,
  goalInput,
  settings,
  onExecuteTask,
  onExecuteAllApproved,
  onRetryTask,
  onProceedToVerify,
  isExecutingAll,
}) => {
  const [selectedLogTask, setSelectedLogTask] = useState<ExecutionItem | null>(null);
  const [viewingPromptTask, setViewingPromptTask] = useState<PlanTask | null>(null);
  const [highRiskConfirmTask, setHighRiskConfirmTask] = useState<PlanTask | null>(null);

  if (approvedTasks.length === 0 && executionQueue.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 shadow-xs">
          <Play className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800">No Approved Tasks in Queue</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Please switch to the <strong className="text-slate-700">Plan tab</strong> and approve one or more tasks to begin autonomous execution.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = executionQueue.filter(i => i.status === 'completed').length;
  const runningCount = executionQueue.filter(i => i.status === 'running' || i.status === 'submitted').length;

  const handleStartTask = (task: PlanTask) => {
    if (task.risk === 'high' && settings.requireHumanForHighRisk) {
      setHighRiskConfirmTask(task);
      return;
    }
    onExecuteTask(task.id);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Execution Dashboard Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200">
                Step 3 of 5
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Jules Autonomous Execution Queue</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Jules launches sandboxed environments, synthesizes code adhering to path boundaries, executes unit tests, and creates isolated Git branches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-execute-all-queue"
              type="button"
              onClick={onExecuteAllApproved}
              disabled={isExecutingAll || approvedTasks.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isExecutingAll ? 'animate-spin' : ''}`} />
              {isExecutingAll ? 'Executing Queue...' : 'Execute All in Sequence'}
            </button>
          </div>
        </div>

        {/* Status Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs font-medium">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Approved Tasks</span>
            <span className="text-sm font-bold text-slate-900">{approvedTasks.length}</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200">
            <span className="text-amber-700 block text-[10px] uppercase font-bold">Running / In Queue</span>
            <span className="text-sm font-bold text-amber-900">{runningCount}</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200">
            <span className="text-emerald-700 block text-[10px] uppercase font-bold">Completed Branches</span>
            <span className="text-sm font-bold text-emerald-900">{completedCount}</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
            <span className="text-blue-700 block text-[10px] uppercase font-bold">Agent Mode</span>
            <span className="text-sm font-bold text-blue-900">
              Live API
            </span>
          </div>
        </div>
      </div>

      {/* Execution Queue Items List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 px-1">
          Execution Runs ({approvedTasks.length})
        </h3>

        {approvedTasks.map(task => {
          const item = executionQueue.find(q => q.taskId === task.id);
          const isSubmitted = item?.status === 'submitted';
          const isRunning = item?.status === 'running';
          const isCompleted = item?.status === 'completed';
          const isFailed = item?.status === 'failed';
          const isCancelled = item?.status === 'cancelled';
          const isPending = !item || item.status === 'pending';

          // Dependency check: are all parent tasks completed?
          const missingDeps = (task.depends_on || []).filter(depId => {
            const depItem = executionQueue.find(q => q.taskId === depId);
            return !depItem || depItem.status !== 'completed';
          });
          const hasUnmetDependencies = missingDeps.length > 0;

          const branchName = item?.branchName || `jules/${goalInput.repo.split('/')[1] || 'repo'}/${task.id.toLowerCase()}`;

          return (
            <div
              key={task.id}
              id={`exec-card-${task.id}`}
              className={`bg-white rounded-xl border p-5 space-y-4 shadow-xs transition-all ${
                isRunning
                  ? 'border-blue-400 ring-2 ring-blue-500/10'
                  : isCompleted
                  ? 'border-emerald-300 bg-emerald-50/10'
                  : isFailed
                  ? 'border-rose-300'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 font-mono text-[11px] font-bold rounded bg-slate-900 text-white">
                      {task.id}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-blue-600 font-semibold">{branchName}</span>
                    {item?.julesTaskId && (
                      <span className="text-slate-400">• Task ID: {item.julesTaskId}</span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {isPending && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded border border-slate-300">
                      Pending Trigger
                    </span>
                  )}
                  {isRunning && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded border border-blue-300 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      Running ({item?.progress}%)
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </span>
                  )}
                  {isFailed && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded border border-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Failed
                    </span>
                  )}
                  {isCancelled && (
                    <span className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded border border-slate-300">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar & Stage Status */}
              {(isRunning || isCompleted || isSubmitted) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item?.currentStage || 'Executing...'}</span>
                    <span className="text-slate-500 font-mono">{item?.progress || 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : isFailed ? 'bg-rose-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${item?.progress || 5}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Dependency Warning if blocked */}
              {isPending && hasUnmetDependencies && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Waiting on parent dependencies: <strong className="font-mono">{missingDeps.join(', ')}</strong>
                  </span>
                </div>
              )}

              {/* Action Controls Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    id={`btn-view-prompt-${task.id}`}
                    type="button"
                    onClick={() => setViewingPromptTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    View Prompt
                  </button>

                  {item && (
                    <button
                      id={`btn-view-logs-${task.id}`}
                      type="button"
                      onClick={() => setSelectedLogTask(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      View Logs ({item.logs?.length || 0})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isPending && (
                    <button
                      id={`btn-start-task-${task.id}`}
                      type="button"
                      disabled={hasUnmetDependencies}
                      onClick={() => handleStartTask(task)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs transition-colors disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Launch Jules Task
                    </button>
                  )}

                  {(isFailed || isCancelled) && (
                    <button
                      id={`btn-retry-task-${task.id}`}
                      type="button"
                      onClick={() => onRetryTask(task.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 font-semibold transition-colors"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Retry Task
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      id={`btn-verify-branch-${task.id}`}
                      type="button"
                      onClick={() => onProceedToVerify(branchName)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify Branch
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Logs Drawer / Modal */}
      {selectedLogTask && (
        <TerminalLogs
          logs={selectedLogTask.logs || []}
          title={`Jules Logs • ${selectedLogTask.taskTitle} (${selectedLogTask.branchName})`}
          isOpen={true}
          onClose={() => setSelectedLogTask(null)}
          isRunning={selectedLogTask.status === 'running'}
        />
      )}

      {/* Prompt Preview Modal */}
      {viewingPromptTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            id="view-prompt-modal"
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>Jules Autonomous Prompt • {viewingPromptTask.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPromptTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed">
              <pre className="whitespace-pre-wrap">{viewingPromptTask.jules_prompt}</pre>
            </div>
            <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingPromptTask(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Risk Confirmation Modal */}
      {highRiskConfirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            id="high-risk-confirm-modal"
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">High-Risk Task Confirmation</h3>
                <p className="text-xs text-slate-500">Explicit human operator approval is required.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <div className="font-bold">{highRiskConfirmTask.title}</div>
              <p className="text-slate-600">{highRiskConfirmTask.why}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHighRiskConfirmTask(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-high-risk-exec"
                type="button"
                onClick={() => {
                  const taskId = highRiskConfirmTask.id;
                  setHighRiskConfirmTask(null);
                  onExecuteTask(taskId, true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirm & Launch Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
