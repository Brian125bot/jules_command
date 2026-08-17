import React, { useState } from 'react';
import { PlanResponse, PlanTask, RiskLevel, ComplexityLevel } from '../../types';
import {
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Edit3,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Layers,
  FileCode,
  Shield,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';

interface PlanTabProps {
  plan: PlanResponse | null;
  onUpdateTaskStatus: (taskId: string, status: 'approved' | 'rejected' | 'draft') => void;
  onUpdateTask: (updatedTask: PlanTask) => void;
  onApproveAllSafeTasks: () => void;
  onRequestHumanReviewHighRisk: () => void;
  onProceedToExecution: () => void;
  onRegeneratePlan: () => Promise<void>;
  isGeneratingPlan: boolean;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  plan,
  onUpdateTaskStatus,
  onUpdateTask,
  onApproveAllSafeTasks,
  onRequestHumanReviewHighRisk,
  onProceedToExecution,
  onRegeneratePlan,
  isGeneratingPlan,
}) => {
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [viewingPromptTaskId, setViewingPromptTaskId] = useState<string | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

  if (!plan || !plan.tasks || plan.tasks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-white text-blue-600 rounded-xl flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
          <CheckSquare className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">No Implementation Plan Generated Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Configure your goal and acceptance criteria in the <strong className="text-slate-700">Goal tab</strong> to synthesize an autonomous task decomposition.
          </p>
        </div>
      </div>
    );
  }

  const tasks = plan.tasks;
  const approvedTasksCount = tasks.filter(t => t.approvalStatus === 'approved').length;
  const safeTasksCount = tasks.filter(t => t.risk === 'low').length;
  const highRiskTasksCount = tasks.filter(t => t.risk === 'high').length;
  const mediumRiskTasksCount = tasks.filter(t => t.risk === 'medium').length;

  const handleCopyPrompt = (taskId: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedTaskId(taskId);
    setTimeout(() => setCopiedTaskId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 12-Column Main Plan Grid */}
      <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Task List Area (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-bold text-slate-900">Task Decomposition Queue</h2>
              <p className="text-xs text-slate-500">
                {approvedTasksCount} of {tasks.length} tasks approved for autonomous execution
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-approve-all-safe-list"
                onClick={onApproveAllSafeTasks}
                className="text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors"
              >
                Approve All Safe ({safeTasksCount})
              </button>
            </div>
          </div>

          {tasks.map(task => {
            const isApproved = task.approvalStatus === 'approved';
            const isRejected = task.approvalStatus === 'rejected';

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`bg-white p-6 rounded-xl border transition-all shadow-xs ${
                  isApproved
                    ? 'border-emerald-300 ring-1 ring-emerald-400/20'
                    : isRejected
                    ? 'border-slate-200 opacity-60 bg-slate-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{task.id}</span>
                      <h3 className="font-bold text-sm text-slate-900">{task.title}</h3>
                      {task.is_test_task && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tight border border-purple-200">
                          TDD Failing Test
                        </span>
                      )}
                      {task.is_repair_task && (
                        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tight border border-orange-200">
                          Repair Attempt #{task.repair_attempt || 1}
                        </span>
                      )}
                      {task.risk === 'low' ? (
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tight">
                          Safe
                        </span>
                      ) : task.risk === 'medium' ? (
                        <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tight">
                          Medium Risk
                        </span>
                      ) : (
                        <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-tight">
                          High Risk
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{task.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Complexity</div>
                    <div className="text-xs font-semibold text-slate-800 capitalize">{task.estimated_complexity}</div>
                  </div>
                </div>

                {/* Rationale / Why */}
                {task.why && (
                  <div className="mb-3 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong className="text-slate-800">Rationale: </strong>
                    {task.why}
                  </div>
                )}

                {/* Card Meta & Actions Bar */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap text-xs">
                  {task.depends_on && task.depends_on.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Depends On:</span>
                      {task.depends_on.map(dep => (
                        <span key={dep} className="text-[10px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}

                  {task.expected_paths && task.expected_paths.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Expected Paths:</span>
                      {task.expected_paths.slice(0, 2).map((path, idx) => (
                        <span key={idx} className="text-[10px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {path}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 min-w-[20px]" />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`btn-view-prompt-${task.id}`}
                      type="button"
                      onClick={() => setViewingPromptTaskId(viewingPromptTaskId === task.id ? null : task.id)}
                      className="text-xs font-bold text-slate-600 px-3 py-1.5 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                    >
                      {viewingPromptTaskId === task.id ? 'Hide Prompt' : 'Jules Prompt'}
                    </button>

                    <button
                      id={`btn-edit-task-${task.id}`}
                      type="button"
                      onClick={() => setEditingTask(task)}
                      className="text-xs font-bold text-slate-600 px-3 py-1.5 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                    >
                      Edit
                    </button>

                    <button
                      id={`btn-approve-task-${task.id}`}
                      type="button"
                      onClick={() => onUpdateTaskStatus(task.id, isApproved ? 'draft' : 'approved')}
                      className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${
                        isApproved
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100'
                      }`}
                    >
                      {isApproved ? 'Approved ✓' : 'Approve Task'}
                    </button>
                  </div>
                </div>

                {/* Expandable Jules Prompt Drawer */}
                {viewingPromptTaskId === task.id && (
                  <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 space-y-2 font-mono text-xs animate-in fade-in">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                      <span className="font-sans font-semibold text-slate-300 text-[11px]">Synthesized Agent Prompt</span>
                      <button
                        id={`btn-copy-prompt-${task.id}`}
                        type="button"
                        onClick={() => handleCopyPrompt(task.id, task.jules_prompt)}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors font-sans"
                      >
                        {copiedTaskId === task.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedTaskId === task.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 max-h-56 overflow-y-auto">
                      {task.jules_prompt}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Summary & Intelligence Panel (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Plan Intelligence Panel */}
          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Plan Intelligence</h4>
            <div className="space-y-4 relative z-10">
              <div>
                <div className="text-[11px] text-slate-400 mb-1 uppercase font-bold">Strategy Summary</div>
                <p className="text-xs text-slate-300 leading-relaxed">{plan.summary}</p>
              </div>

              {plan.risks && plan.risks.length > 0 && (
                <div>
                  <div className="text-[11px] text-slate-400 mb-1 uppercase font-bold">Detected Risks</div>
                  <ul className="text-[11px] list-disc list-inside text-amber-400 space-y-1">
                    {plan.risks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.open_questions && plan.open_questions.length > 0 && (
                <div>
                  <div className="text-[11px] text-slate-400 mb-1 uppercase font-bold">Open Questions</div>
                  <ul className="text-[11px] list-disc list-inside text-slate-300 space-y-1">
                    {plan.open_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <div className="text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
                  Jules Agent Readiness ({approvedTasksCount}/{tasks.length} Tasks)
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(approvedTasksCount / tasks.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Goal Context Panel */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Goal Context</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-500">Decomposed Tasks</span>
                <span className="font-semibold text-slate-800">{tasks.length} total</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-500">Low Risk (Safe)</span>
                <span className="font-bold text-blue-600">{safeTasksCount}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-500">Medium / High Risk</span>
                <span className="font-bold text-amber-600">{mediumRiskTasksCount + highRiskTasksCount}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-500">Approved for Queue</span>
                <span className="font-bold text-emerald-600">{approvedTasksCount}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                id="btn-proceed-execute-sidebar"
                onClick={onProceedToExecution}
                disabled={approvedTasksCount === 0}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
              >
                <span>Proceed to Execution</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-regenerate-plan-sidebar"
                onClick={onRegeneratePlan}
                disabled={isGeneratingPlan}
                className="w-full inline-flex items-center justify-center gap-1.5 text-slate-600 hover:bg-slate-50 border border-slate-200 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingPlan ? 'animate-spin text-blue-600' : ''}`} />
                <span>Regenerate Plan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in">
          <div
            id="edit-task-modal"
            className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Edit Task {editingTask.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Risk Level</label>
                  <select
                    value={editingTask.risk}
                    onChange={e => setEditingTask({ ...editingTask, risk: e.target.value as RiskLevel })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="low">Low Risk (Safe)</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Complexity</label>
                  <select
                    value={editingTask.estimated_complexity}
                    onChange={e => setEditingTask({ ...editingTask, estimated_complexity: e.target.value as ComplexityLevel })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Description</label>
                <textarea
                  rows={3}
                  value={editingTask.description}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Rationale (Why)</label>
                <textarea
                  rows={2}
                  value={editingTask.why}
                  onChange={e => setEditingTask({ ...editingTask, why: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Synthesized Jules Agent Prompt</label>
                <textarea
                  rows={4}
                  value={editingTask.jules_prompt}
                  onChange={e => setEditingTask({ ...editingTask, jules_prompt: e.target.value })}
                  className="w-full p-2 font-mono border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="btn-save-task-edit"
                type="button"
                onClick={() => {
                  onUpdateTask(editingTask);
                  setEditingTask(null);
                }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
