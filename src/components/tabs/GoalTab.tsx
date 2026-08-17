import React, { useState } from 'react';
import { GoalInput, RepoContext, SettingsState } from '../../types';
import { GeminiService, GeneratedCriteriaResponse } from '../../services/geminiService';
import {
  FolderGit2,
  GitBranch,
  Target,
  CheckCircle,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Database,
  Terminal,
  FileCode,
  Check,
  Zap,
  Info,
  Wand2,
  Loader2,
  CheckCheck,
  Lightbulb,
  X,
} from 'lucide-react';

interface GoalTabProps {
  goalInput: GoalInput;
  onGoalInputChange: (updater: (prev: GoalInput) => GoalInput) => void;
  repoContext: RepoContext | null;
  onFetchRepoContext: () => Promise<void>;
  onGeneratePlan: () => Promise<void>;
  isFetchingRepo: boolean;
  isGeneratingPlan: boolean;
  settings: SettingsState;
}

export const GoalTab: React.FC<GoalTabProps> = ({
  goalInput,
  onGoalInputChange,
  repoContext,
  onFetchRepoContext,
  onGeneratePlan,
  isFetchingRepo,
  isGeneratingPlan,
  settings,
}) => {
  const [newCriterion, setNewCriterion] = useState('');
  const [newConstraint, setNewConstraint] = useState('');
  const [newAllowedPath, setNewAllowedPath] = useState('');
  const [newForbiddenPath, setNewForbiddenPath] = useState('');
  const [isRepoContextExpanded, setIsRepoContextExpanded] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Acceptance Criteria LLM Autogeneration state
  const [isGeneratingCriteria, setIsGeneratingCriteria] = useState(false);
  const [criteriaSuggestions, setCriteriaSuggestions] = useState<GeneratedCriteriaResponse | null>(null);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [criteriaFeedback, setCriteriaFeedback] = useState<string | null>(null);

  // Add acceptance criterion item
  const handleAddCriterion = () => {
    if (!newCriterion.trim()) return;
    onGoalInputChange(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, newCriterion.trim()],
    }));
    setNewCriterion('');
  };

  const handleRemoveCriterion = (index: number) => {
    onGoalInputChange(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }));
  };

  // LLM Autogenerate Acceptance Criteria from Goal
  const handleAutogenerateCriteria = async () => {
    if (!goalInput.goal.trim()) {
      setValidationError('Please enter a High-Level Goal before generating acceptance criteria.');
      return;
    }
    setValidationError(null);
    setIsGeneratingCriteria(true);
    setCriteriaFeedback(null);

    try {
      const response = await GeminiService.generateAcceptanceCriteria({
        goal: goalInput.goal,
        repo: goalInput.repo,
        repoContext,
        existingCriteria: goalInput.acceptanceCriteria,
        constraints: goalInput.constraints,
        settings,
      });

      if (response.criteria && response.criteria.length > 0) {
        setCriteriaSuggestions(response);
        // By default select all new criteria that are not already present
        const unadded = response.criteria.filter(c => !goalInput.acceptanceCriteria.includes(c));
        setSelectedCriteria(unadded.length > 0 ? unadded : response.criteria);
        setCriteriaFeedback(`Generated ${response.criteria.length} testable criteria.`);
      } else {
        setValidationError('No criteria returned from model. Please try again.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to autogenerate acceptance criteria.');
    } finally {
      setIsGeneratingCriteria(false);
    }
  };

  // Toggle selection of a suggested criterion
  const toggleSelectCriterion = (criterion: string) => {
    setSelectedCriteria(prev =>
      prev.includes(criterion) ? prev.filter(c => c !== criterion) : [...prev, criterion]
    );
  };

  // Apply selected suggested criteria (Append)
  const handleApplySelectedCriteria = () => {
    if (selectedCriteria.length === 0) return;
    onGoalInputChange(prev => {
      const merged = [...prev.acceptanceCriteria];
      selectedCriteria.forEach(c => {
        if (!merged.includes(c)) {
          merged.push(c);
        }
      });
      return { ...prev, acceptanceCriteria: merged };
    });
    setCriteriaFeedback(`Added ${selectedCriteria.length} acceptance criteria.`);
    setCriteriaSuggestions(null);
  };

  // Replace existing criteria with selected
  const handleReplaceAllCriteria = () => {
    if (selectedCriteria.length === 0) return;
    onGoalInputChange(prev => ({
      ...prev,
      acceptanceCriteria: [...selectedCriteria],
    }));
    setCriteriaFeedback(`Replaced acceptance criteria with ${selectedCriteria.length} items.`);
    setCriteriaSuggestions(null);
  };

  // Quick-add suggested constraint from LLM response
  const handleAddSuggestedConstraint = (constraint: string) => {
    if (!goalInput.constraints.includes(constraint)) {
      onGoalInputChange(prev => ({
        ...prev,
        constraints: [...prev.constraints, constraint],
      }));
    }
  };

  // Add constraint item
  const handleAddConstraint = () => {
    if (!newConstraint.trim()) return;
    onGoalInputChange(prev => ({
      ...prev,
      constraints: [...prev.constraints, newConstraint.trim()],
    }));
    setNewConstraint('');
  };

  const handleRemoveConstraint = (index: number) => {
    onGoalInputChange(prev => ({
      ...prev,
      constraints: prev.constraints.filter((_, i) => i !== index),
    }));
  };

  // Add allowed path
  const handleAddAllowedPath = () => {
    if (!newAllowedPath.trim()) return;
    onGoalInputChange(prev => ({
      ...prev,
      allowedPaths: [...prev.allowedPaths, newAllowedPath.trim()],
    }));
    setNewAllowedPath('');
  };

  const handleRemoveAllowedPath = (index: number) => {
    onGoalInputChange(prev => ({
      ...prev,
      allowedPaths: prev.allowedPaths.filter((_, i) => i !== index),
    }));
  };

  // Add forbidden path
  const handleAddForbiddenPath = () => {
    if (!newForbiddenPath.trim()) return;
    onGoalInputChange(prev => ({
      ...prev,
      forbiddenPaths: [...prev.forbiddenPaths, newForbiddenPath.trim()],
    }));
    setNewForbiddenPath('');
  };

  const handleRemoveForbiddenPath = (index: number) => {
    onGoalInputChange(prev => ({
      ...prev,
      forbiddenPaths: prev.forbiddenPaths.filter((_, i) => i !== index),
    }));
  };

  const validateAndGeneratePlan = async () => {
    setValidationError(null);
    if (!goalInput.repo?.trim()) {
      setValidationError('Repository owner/name is required (e.g. acme/dashboard).');
      return;
    }
    if (!goalInput.baseBranch?.trim()) {
      setValidationError('Base branch is required (e.g. main).');
      return;
    }
    if (!goalInput.goal?.trim()) {
      setValidationError('High-level repository goal is required.');
      return;
    }
    if (!goalInput.acceptanceCriteria || goalInput.acceptanceCriteria.length === 0) {
      setValidationError('Please provide at least one acceptance criterion.');
      return;
    }

    await onGeneratePlan();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Guidance Card */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/30">
                Step 1 of 5
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">Define Repository Mission Goal</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Specify your repository, target goal, acceptance criteria, and security guardrails. Jules and Gemini will decompose your goal into verifiable, isolated agent tasks.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              Live Mode
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Security Notice:</strong> In Live Mode, credentials are proxy-routed server-side. Minimal repository scopes (<code className="text-slate-300">contents:write</code>, <code className="text-slate-300">pull-requests:write</code>) are enforced.
          </span>
        </div>
      </div>

      {validationError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Goal Configuration Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Repo & Base Branch */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 space-y-1.5">
            <label htmlFor="input-repo-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              GitHub Repository (owner/name) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FolderGit2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="input-repo-name"
                type="text"
                value={goalInput.repo}
                onChange={e => onGoalInputChange(prev => ({ ...prev, repo: e.target.value }))}
                placeholder="acme/dashboard"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-500">e.g. acme/dashboard, vercel/next.js, or your repository</p>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label htmlFor="input-base-branch" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Base Branch <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <GitBranch className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                id="input-base-branch"
                type="text"
                value={goalInput.baseBranch}
                onChange={e => onGoalInputChange(prev => ({ ...prev, baseBranch: e.target.value }))}
                placeholder="main"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-500">Branch to base autonomous changes on</p>
          </div>
        </div>

        {/* High-Level Goal */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="input-goal-text" className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              High-Level Goal <span className="text-rose-500">*</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                id="checkbox-test-first-mode"
                type="checkbox"
                checked={goalInput.testFirstMode || false}
                onChange={e => onGoalInputChange(prev => ({ ...prev, testFirstMode: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-semibold text-slate-700">
                <span className="text-blue-600 font-bold">Test-First (TDD)</span> Decomposition Mode
              </span>
            </label>
          </div>
          <textarea
            id="input-goal-text"
            rows={3}
            value={goalInput.goal}
            onChange={e => onGoalInputChange(prev => ({ ...prev, goal: e.target.value }))}
            placeholder="e.g. Add CSV export to the analytics dashboard so users can download their metrics tables as structured CSV files."
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors leading-relaxed"
          />
          <p className="text-[10px] text-slate-500">State the primary user outcome or architectural requirement. When Test-First mode is enabled, Gemini generates explicit failing test creation tasks before feature implementation.</p>
        </div>

        {/* Acceptance Criteria */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Acceptance Criteria <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-500">
                {goalInput.acceptanceCriteria.length} {goalInput.acceptanceCriteria.length === 1 ? 'criterion' : 'criteria'} defined
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-autogenerate-criteria"
                type="button"
                onClick={handleAutogenerateCriteria}
                disabled={isGeneratingCriteria || !goalInput.goal.trim()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                  isGeneratingCriteria || !goalInput.goal.trim()
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-95'
                }`}
                title={!goalInput.goal.trim() ? 'Enter a high-level goal first' : 'Autogenerate testable acceptance criteria with Gemini'}
              >
                {isGeneratingCriteria ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Criteria...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Auto-Generate Criteria</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {criteriaFeedback && (
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{criteriaFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setCriteriaFeedback(null)}
                className="text-blue-500 hover:text-blue-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* AI Suggestions Review Drawer / Card */}
          {criteriaSuggestions && (
            <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white border border-indigo-200 rounded-xl shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-md">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">AI-Generated Acceptance Criteria</h4>
                    <p className="text-[11px] text-slate-600">{criteriaSuggestions.rationale}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCriteriaSuggestions(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-indigo-100/50"
                  title="Dismiss suggestions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Checklist */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {criteriaSuggestions.criteria.map((sug, idx) => {
                  const isChecked = selectedCriteria.includes(sug);
                  const isAlreadyAdded = goalInput.acceptanceCriteria.includes(sug);

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelectCriterion(sug)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 font-medium'
                          : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by div onClick
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex-1 leading-relaxed">{sug}</span>
                      {isAlreadyAdded && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          Already in list
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Suggested Constraints Chips if any */}
              {criteriaSuggestions.suggestedConstraints && criteriaSuggestions.suggestedConstraints.length > 0 && (
                <div className="pt-2 border-t border-indigo-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Suggested Constraints:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {criteriaSuggestions.suggestedConstraints.map((sc, idx) => {
                      const alreadyHasConstraint = goalInput.constraints.includes(sc);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddSuggestedConstraint(sc)}
                          disabled={alreadyHasConstraint}
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                            alreadyHasConstraint
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                              : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 active:scale-95'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>{sc}</span>
                          {alreadyHasConstraint && <Check className="w-3 h-3 text-emerald-500 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCriteria(
                        selectedCriteria.length === criteriaSuggestions.criteria.length
                          ? []
                          : [...criteriaSuggestions.criteria]
                      )
                    }
                    className="text-[11px] text-indigo-700 hover:underline font-medium"
                  >
                    {selectedCriteria.length === criteriaSuggestions.criteria.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReplaceAllCriteria}
                    disabled={selectedCriteria.length === 0}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Replace All
                  </button>
                  <button
                    type="button"
                    onClick={handleApplySelectedCriteria}
                    disabled={selectedCriteria.length === 0}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Add Selected ({selectedCriteria.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Criteria List */}
          <div className="space-y-2">
            {goalInput.acceptanceCriteria.length === 0 && (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center space-y-2">
                <p className="text-xs text-slate-500">No acceptance criteria defined yet.</p>
                {goalInput.goal.trim() ? (
                  <button
                    type="button"
                    onClick={handleAutogenerateCriteria}
                    disabled={isGeneratingCriteria}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Generate Criteria from Goal with Gemini</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-400">Type a goal above to unlock one-click AI criteria generation.</p>
                )}
              </div>
            )}

            {goalInput.acceptanceCriteria.map((criterion, idx) => (
              <div
                key={idx}
                id={`criterion-row-${idx}`}
                className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 group hover:border-slate-300 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="flex-1 font-medium">{criterion}</span>
                <button
                  id={`btn-remove-criterion-${idx}`}
                  type="button"
                  onClick={() => handleRemoveCriterion(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                  title="Delete criterion"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <input
                id="input-new-criterion"
                type="text"
                value={newCriterion}
                onChange={e => setNewCriterion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCriterion();
                  }
                }}
                placeholder="Add an acceptance criterion (e.g. Export button downloads RFC 4180 CSV)..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                id="btn-add-criterion"
                type="button"
                onClick={handleAddCriterion}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Constraints */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Constraints & Safeguards
            </label>
            <span className="text-[10px] text-slate-500">{goalInput.constraints.length} constraints</span>
          </div>

          <div className="space-y-2">
            {goalInput.constraints.map((constraint, idx) => (
              <div
                key={idx}
                id={`constraint-row-${idx}`}
                className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 group hover:border-slate-300"
              >
                <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="flex-1">{constraint}</span>
                <button
                  id={`btn-remove-constraint-${idx}`}
                  type="button"
                  onClick={() => handleRemoveConstraint(idx)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                id="input-new-constraint"
                type="text"
                value={newConstraint}
                onChange={e => setNewConstraint(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddConstraint();
                  }
                }}
                placeholder="Add constraint (e.g. Do not modify authentication, Keep latency <2ms)..."
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                id="btn-add-constraint"
                type="button"
                onClick={handleAddConstraint}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Path Guardrails (Allowed & Forbidden) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* Allowed Paths */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Allowed Paths (Scope Boundary)
            </label>
            <div className="space-y-1.5">
              {goalInput.allowedPaths.map((path, idx) => (
                <div
                  key={idx}
                  id={`allowed-path-${idx}`}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-blue-50/60 border border-blue-200 text-blue-900 font-mono text-xs rounded-md"
                >
                  <span>{path}</span>
                  <button
                    id={`btn-remove-allowed-${idx}`}
                    type="button"
                    onClick={() => handleRemoveAllowedPath(idx)}
                    className="text-blue-700 hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  id="input-new-allowed-path"
                  type="text"
                  value={newAllowedPath}
                  onChange={e => setNewAllowedPath(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAllowedPath();
                    }
                  }}
                  placeholder="src/pages/, tests/"
                  className="flex-1 px-2.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  id="btn-add-allowed-path"
                  type="button"
                  onClick={handleAddAllowedPath}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-md font-medium"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Forbidden Paths */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Forbidden Paths (Strict Guardrails)
            </label>
            <div className="space-y-1.5">
              {goalInput.forbiddenPaths.map((path, idx) => (
                <div
                  key={idx}
                  id={`forbidden-path-${idx}`}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-rose-50/70 border border-rose-200 text-rose-900 font-mono text-xs rounded-md"
                >
                  <span>{path}</span>
                  <button
                    id={`btn-remove-forbidden-${idx}`}
                    type="button"
                    onClick={() => handleRemoveForbiddenPath(idx)}
                    className="text-rose-700 hover:text-rose-900"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <input
                  id="input-new-forbidden-path"
                  type="text"
                  value={newForbiddenPath}
                  onChange={e => setNewForbiddenPath(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddForbiddenPath();
                    }
                  }}
                  placeholder=".github/workflows/, secrets/"
                  className="flex-1 px-2.5 py-1.5 font-mono text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <button
                  id="btn-add-forbidden-path"
                  type="button"
                  onClick={handleAddForbiddenPath}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-md font-medium"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            id="btn-fetch-repo-context"
            type="button"
            onClick={onFetchRepoContext}
            disabled={isFetchingRepo || !goalInput.repo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Database className={`w-3.5 h-3.5 ${isFetchingRepo ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            {isFetchingRepo ? 'Fetching Repo AST...' : 'Fetch Repo Context'}
          </button>

          <button
            id="btn-generate-plan"
            type="button"
            onClick={validateAndGeneratePlan}
            disabled={isGeneratingPlan || !goalInput.goal || !goalInput.repo}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
            {isGeneratingPlan ? 'Decomposing with Gemini...' : 'Generate Implementation Plan'}
          </button>
        </div>
      </div>

      {/* Collapsible Fetched Repo Context Panel */}
      {repoContext && (
        <div id="repo-context-panel" className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setIsRepoContextExpanded(!isRepoContextExpanded)}
            className="w-full px-5 py-3 bg-slate-900 hover:bg-slate-800/80 flex items-center justify-between text-left transition-colors border-b border-slate-800"
          >
            <div className="flex items-center gap-3">
              <FileCode className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Repository Context Summary</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {repoContext.manifestType} • Default branch: <span className="font-mono text-slate-300">{repoContext.defaultBranch}</span>
                </div>
              </div>
            </div>
            {isRepoContextExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {isRepoContextExpanded && (
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Summary */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Overview</div>
                  <p className="text-slate-200 leading-relaxed text-xs">{repoContext.summary}</p>
                </div>

                {/* CI & Manifest */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">CI & Environment</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <Zap className={`w-3.5 h-3.5 ${repoContext.hasCI ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span>{repoContext.ciDetails || (repoContext.hasCI ? 'CI Workflows Active' : 'No CI detected')}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Test Dirs: <span className="font-mono text-slate-300">{(repoContext.testDirs || []).join(', ') || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Relevant Files Detected */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Relevant Entry Points</div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-300 max-h-24 overflow-y-auto">
                    {(repoContext.relevantFiles || []).map((rf, idx) => (
                      <div key={idx} className="truncate">• {rf}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Readme Snippet */}
              {repoContext.rawReadmeSnippet && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400 font-bold uppercase text-[10px] mb-1">README Overview</div>
                  <pre className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                    {repoContext.rawReadmeSnippet}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
