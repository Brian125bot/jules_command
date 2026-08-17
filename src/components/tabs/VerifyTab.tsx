import React, { useState } from 'react';
import {
  FullVerificationResult,
  GoalInput,
  SettingsState,
  BranchDiff,
  RecommendedAction,
} from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RotateCw,
  FileCode,
  Check,
  ArrowRight,
  GitCompare,
  Terminal,
  Zap,
  Info,
  Wrench,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { DiffViewer } from '../common/DiffViewer';

interface VerifyTabProps {
  verificationResult: FullVerificationResult | null;
  goalInput: GoalInput;
  settings: SettingsState;
  branchDiff: BranchDiff | null;
  onRunVerification: (headBranch: string, baseBranch: string) => Promise<void>;
  onGenerateRepairPrompt: (failedCriteria: string[], issues: string[]) => Promise<string>;
  onProceedToReport: () => void;
  isVerifying: boolean;
}

export const VerifyTab: React.FC<VerifyTabProps> = ({
  verificationResult,
  goalInput,
  settings,
  branchDiff,
  onRunVerification,
  onGenerateRepairPrompt,
  onProceedToReport,
  isVerifying,
}) => {
  const [headBranchInput, setHeadBranchInput] = useState(
    verificationResult?.headBranch || `jules/${goalInput.repo.split('/')[1] || 'repo'}/task-1`
  );
  const [baseBranchInput, setBaseBranchInput] = useState(
    verificationResult?.baseBranch || goalInput.baseBranch || 'main'
  );
  const [activeDiffTab, setActiveDiffTab] = useState<'criteria' | 'structural' | 'ci' | 'diff'>('criteria');
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairPromptText, setRepairPromptText] = useState<string | null>(null);
  const [isGeneratingRepair, setIsGeneratingRepair] = useState(false);
  const [copiedRepair, setCopiedRepair] = useState(false);

  const handleOpenRepair = async () => {
    if (!verificationResult) return;
    setRepairModalOpen(true);
    setIsGeneratingRepair(true);

    const failedCriteria = (verificationResult.semantic.criteriaResults || [])
      .filter(c => c.status === 'fail' || c.status === 'unclear')
      .map(c => c.criterion);

    const issues = [
      ...(verificationResult.structural.warnings || []),
      ...(verificationResult.semantic.risks || []),
      ...(verificationResult.semantic.suggestedFixes || []),
    ];

    try {
      const prompt = await onGenerateRepairPrompt(failedCriteria, issues);
      setRepairPromptText(prompt);
    } catch {
      setRepairPromptText('Unable to synthesize automated repair prompt.');
    } finally {
      setIsGeneratingRepair(false);
    }
  };

  const handleCopyRepair = () => {
    if (!repairPromptText) return;
    navigator.clipboard.writeText(repairPromptText);
    setCopiedRepair(true);
    setTimeout(() => setCopiedRepair(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Verification Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-200">
                Step 4 of 5
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Multi-Layer Verification Gate</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Verify the autonomous branch against structural guardrails, CI status, and semantic acceptance criteria using Gemini.
            </p>
          </div>

          <button
            id="btn-run-verification"
            type="button"
            onClick={() => onRunVerification(headBranchInput, baseBranchInput)}
            disabled={isVerifying || !headBranchInput}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50 shrink-0"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verifying Branch...' : 'Run Full Verification'}
          </button>
        </div>

        {/* Branch Compare Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Base Branch</label>
            <input
              id="input-verify-base-branch"
              type="text"
              value={baseBranchInput}
              onChange={e => setBaseBranchInput(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="main"
            />
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Head Branch (Jules Output)</label>
            <input
              id="input-verify-head-branch"
              type="text"
              value={headBranchInput}
              onChange={e => setHeadBranchInput(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              placeholder="jules/add-csv-export/task-1"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <div className="w-full px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-mono text-center text-xs border border-slate-200 truncate">
              {goalInput.repo}
            </div>
          </div>
        </div>
      </div>

      {verificationResult ? (
        <div className="space-y-6">
          {/* Overall Verdict Banner */}
          {(() => {
            const isApproved = verificationResult.overallAction === 'approve';
            const isFixes = verificationResult.overallAction === 'request_fixes';
            const scorePercent = Math.round((verificationResult.semantic.score || 0) * 100);

            return (
              <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-white/10 rounded">
                        {isApproved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isFixes ? (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        Verification Verdict
                      </span>
                    </div>
                    <h3 className="text-lg font-bold tracking-tight text-white">
                      {isApproved
                        ? 'RECOMMENDED: APPROVE & MERGE'
                        : isFixes
                        ? 'RECOMMENDED: REQUEST FIXES'
                        : 'RECOMMENDED: HUMAN REVIEW'}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      {verificationResult.semantic.summary}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-center min-w-[100px]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Score</span>
                      <span className="text-xl font-bold font-mono text-white">{scorePercent}%</span>
                    </div>

                    <div className="space-y-2">
                      {!isApproved && (
                        <button
                          id="btn-generate-repair-prompt"
                          type="button"
                          onClick={handleOpenRepair}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          Repair Prompt
                        </button>
                      )}
                      <button
                        id="btn-proceed-to-report"
                        type="button"
                        onClick={onProceedToReport}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all"
                      >
                        <span>Final Report</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Verification Layer Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs flex-wrap">
            <button
              id="tab-btn-criteria"
              type="button"
              onClick={() => setActiveDiffTab('criteria')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                activeDiffTab === 'criteria'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Acceptance Criteria ({verificationResult.semantic.criteriaResults?.length || 0})
            </button>
            <button
              id="tab-btn-structural"
              type="button"
              onClick={() => setActiveDiffTab('structural')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                activeDiffTab === 'structural'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Structural Guardrails ({verificationResult.structural.fileCount} files)
            </button>
            <button
              id="tab-btn-ci"
              type="button"
              onClick={() => setActiveDiffTab('ci')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                activeDiffTab === 'ci'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              CI & Checks ({verificationResult.ci.checkRuns?.length || 0})
            </button>
            <button
              id="tab-btn-diff"
              type="button"
              onClick={() => setActiveDiffTab('diff')}
              className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                activeDiffTab === 'diff'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Diff Viewer
            </button>
          </div>

          {/* Tab 1: Criteria Verification */}
          {activeDiffTab === 'criteria' && (
            <div className="space-y-3">
              {verificationResult.semantic.thinking && (
                <div className="p-4 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold uppercase tracking-wider text-[10px]">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Gemini Chain-of-Thought Verification Reasoning</span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                    {verificationResult.semantic.thinking}
                  </p>
                </div>
              )}

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Criterion-by-Criterion Evaluation
              </h4>
              <div className="space-y-3">
                {(verificationResult.semantic.criteriaResults || []).map((cr, idx) => {
                  const isPass = cr.status === 'pass';
                  const isFail = cr.status === 'fail';

                  return (
                    <div
                      key={idx}
                      id={`criterion-result-${idx}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isPass
                          ? 'bg-white border-emerald-200'
                          : isFail
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {isPass ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : isFail ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : (
                            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-slate-900 block">{cr.criterion}</span>
                            <p className="text-xs text-slate-600 leading-relaxed font-sans">{cr.evidence}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full shrink-0 border ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isFail
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {cr.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Semantic Review Notes & Scope Violations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                {/* Suggested Fixes */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-slate-900 block">Suggested Fixes</span>
                  {verificationResult.semantic.suggestedFixes && verificationResult.semantic.suggestedFixes.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 text-rose-700">
                      {verificationResult.semantic.suggestedFixes.map((sv, i) => (
                        <li key={i}>{sv}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Zero required fixes detected
                    </span>
                  )}
                </div>

                {/* Technical Risks */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-slate-900 block">Residual Risks</span>
                  {verificationResult.semantic.risks && verificationResult.semantic.risks.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1 text-slate-600">
                      {verificationResult.semantic.risks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-500 italic">No residual risks flagged.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Structural Verification */}
          {activeDiffTab === 'structural' && (
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Structural Guardrails & Policy Matrix
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Total Files Changed</span>
                  <span className="text-lg font-bold text-slate-900">
                    {verificationResult.structural.fileCount} / {settings.maxFilesChanged} limit
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Total Additions</span>
                  <span className="text-lg font-bold text-emerald-600">
                    +{verificationResult.structural.additions} lines
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Total Deletions</span>
                  <span className="text-lg font-bold text-rose-600">
                    -{verificationResult.structural.deletions} lines
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-medium text-slate-700">Forbidden Paths Modified</span>
                  {verificationResult.structural.forbiddenPathsTouched?.length === 0 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> None Touched (0 violations)
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Violations: {verificationResult.structural.forbiddenPathsTouched.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-medium text-slate-700">Unit / Integration Tests Included</span>
                  {verificationResult.structural.testsAddedOrUpdated ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Tests Added & Updated
                    </span>
                  ) : (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> No Test Files Found
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-medium text-slate-700">Documentation Updated</span>
                  <span className="text-slate-600 font-semibold">
                    {verificationResult.structural.docsUpdated ? 'Yes (Docs Updated)' : 'Not Required'}
                  </span>
                </div>
              </div>

              {verificationResult.structural.warnings && verificationResult.structural.warnings.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <span className="font-bold block">Structural Warnings</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {verificationResult.structural.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: CI Status */}
          {activeDiffTab === 'ci' && (
            <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  GitHub Actions & CI Status
                </h4>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                    verificationResult.ci.pass
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {verificationResult.ci.status.toUpperCase()}
                </span>
              </div>

              <p className="text-xs text-slate-500">{verificationResult.ci.message}</p>

              <div className="space-y-2 text-xs">
                {(verificationResult.ci.checkRuns || []).map((cr, idx) => (
                  <div
                    key={idx}
                    id={`ci-check-${idx}`}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{cr.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-medium rounded text-[11px]">
                        {cr.conclusion}
                      </span>
                      {cr.detailsUrl && (
                        <a
                          href={cr.detailsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                        >
                          Logs <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Diff Viewer */}
          {activeDiffTab === 'diff' && (
            <DiffViewer
              diff={verificationResult.diff || branchDiff!}
              forbiddenPaths={goalInput.forbiddenPaths}
            />
          )}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800">Ready to Verify Autonomous Branch</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click <strong className="text-slate-700">"Run Full Verification"</strong> above to evaluate git diff against acceptance criteria, CI runs, and safety guardrails.
            </p>
          </div>
        </div>
      )}

      {/* Repair Instruction Modal */}
      {repairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            id="repair-modal"
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>Autonomous Repair Instruction</span>
              </div>
              <button
                type="button"
                onClick={() => setRepairModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed space-y-3">
              {isGeneratingRepair ? (
                <div className="py-12 text-center text-slate-400">
                  Synthesizing repair prompt with Gemini...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{repairPromptText}</pre>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <button
                id="btn-copy-repair-prompt"
                type="button"
                onClick={handleCopyRepair}
                disabled={isGeneratingRepair || !repairPromptText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              >
                {copiedRepair ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedRepair ? 'Copied' : 'Copy Prompt'}
              </button>

              <button
                type="button"
                onClick={() => setRepairModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
