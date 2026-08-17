import React, { useState } from 'react';
import {
  GoalInput,
  FullVerificationResult,
  PlanTask,
  SettingsState,
} from '../../types';
import {
  FileText,
  Copy,
  Check,
  Download,
  GitPullRequest,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { GeminiService } from '../../services/geminiService';
import { GitHubService } from '../../services/githubService';

interface ReportTabProps {
  goalInput: GoalInput;
  verificationResult: FullVerificationResult | null;
  tasks: PlanTask[];
  settings: SettingsState;
}

export const ReportTab: React.FC<ReportTabProps> = ({
  goalInput,
  verificationResult,
  tasks,
  settings,
}) => {
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [isCreatingPr, setIsCreatingPr] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [prCreatedResult, setPrCreatedResult] = useState<any | null>(null);
  const [commentResult, setCommentResult] = useState<any | null>(null);
  const [prNumberInput, setPrNumberInput] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { title: prTitle, body: prBody } = GeminiService.generatePullRequestBody(
    goalInput,
    verificationResult,
    tasks
  );

  const handleCopyBody = () => {
    navigator.clipboard.writeText(prBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(prTitle);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleDownloadJson = () => {
    const reportData = {
      generator: 'Jules RepoMission Studio',
      generated_at: new Date().toISOString(),
      goalInput,
      tasks,
      verificationResult,
      prTitle,
      prBody,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jules-verification-report-${goalInput.repo.replace('/', '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([prBody], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PULL_REQUEST_${goalInput.repo.replace('/', '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreatePr = async () => {
    setActionError(null);
    setIsCreatingPr(true);
    try {
      const head = verificationResult?.headBranch || `jules/${goalInput.repo.split('/')[1] || 'repo'}/task-1`;
      const res = await GitHubService.createPullRequest({
        repo: goalInput.repo,
        title: prTitle,
        body: prBody,
        head,
        base: goalInput.baseBranch || 'main',
        token: settings.githubToken,
        baseUrl: settings.githubBaseUrl,
      });
      setPrCreatedResult(res);
      if (res.pullRequest?.number) {
        setPrNumberInput(String(res.pullRequest.number));
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to create pull request on GitHub');
    } finally {
      setIsCreatingPr(false);
    }
  };

  const handlePostComment = async () => {
    const issueNum = parseInt(prNumberInput.trim());
    if (!issueNum || isNaN(issueNum)) {
      setActionError('Please specify a valid Pull Request number to post comment to.');
      return;
    }

    setActionError(null);
    setIsPostingComment(true);
    try {
      const res = await GitHubService.addIssueComment({
        repo: goalInput.repo,
        issueNumber: issueNum,
        commentBody: prBody,
        token: settings.githubToken,
        baseUrl: settings.githubBaseUrl,
      });
      setCommentResult(res);
    } catch (err: any) {
      setActionError(err.message || 'Failed to post verification comment to PR');
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Report Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200">
                Step 5 of 5
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Verification & Release Gate Report</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Export verified pull request metadata, open an automated GitHub PR, or post the release gate audit trail directly to your repository.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-download-json-report"
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download JSON
            </button>
            <button
              id="btn-download-md-report"
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Download Markdown
            </button>
            <button
              id="btn-open-pr-github"
              type="button"
              onClick={handleCreatePr}
              disabled={isCreatingPr}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              <GitPullRequest className={`w-3.5 h-3.5 ${isCreatingPr ? 'animate-spin' : ''}`} />
              {isCreatingPr ? 'Creating PR...' : 'Open GitHub PR'}
            </button>
          </div>
        </div>

        {/* Action Alerts & Result Banners */}
        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {prCreatedResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {prCreatedResult.message || 'Pull Request created successfully!'}
              </span>
              {prCreatedResult.pullRequest?.html_url && (
                <a
                  href={prCreatedResult.pullRequest.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded hover:bg-emerald-700"
                >
                  View PR #{prCreatedResult.pullRequest.number} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {commentResult && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {commentResult.message || 'Verification comment posted to PR.'}
            </span>
          </div>
        )}
      </div>

      {/* Suggested Pull Request Title */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Suggested Pull Request Title
          </label>
          <button
            id="btn-copy-pr-title"
            type="button"
            onClick={handleCopyTitle}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedTitle ? 'Copied' : 'Copy Title'}
          </button>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-semibold text-slate-900">
          {prTitle}
        </div>
      </div>

      {/* Suggested Pull Request Markdown Body */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Suggested Pull Request Body (Markdown)
          </label>
          <button
            id="btn-copy-pr-body"
            type="button"
            onClick={handleCopyBody}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 transition-colors"
          >
            {copiedBody ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedBody ? 'Copied to Clipboard!' : 'Copy PR Body'}
          </button>
        </div>

        <div className="p-4 bg-slate-950 text-slate-200 rounded-lg font-mono text-xs leading-relaxed max-h-[480px] overflow-y-auto whitespace-pre-wrap select-text border border-slate-800">
          {prBody}
        </div>
      </div>

      {/* Post Comment on Existing PR Utility */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-600" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
            Post Audit Report as Issue / PR Comment
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="input-target-pr-number"
            type="number"
            value={prNumberInput}
            onChange={e => setPrNumberInput(e.target.value)}
            placeholder="e.g. 142"
            className="w-36 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <button
            id="btn-post-pr-comment"
            type="button"
            onClick={handlePostComment}
            disabled={isPostingComment || !prNumberInput}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isPostingComment ? 'Posting...' : 'Post Comment to PR'}
          </button>
        </div>
      </div>
    </div>
  );
};
