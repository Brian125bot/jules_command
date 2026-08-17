import React, { useState } from 'react';
import { SettingsState } from '../../types';
import {
  Settings,
  Key,
  Shield,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Cpu,
  Server,
  Zap,
} from 'lucide-react';
import { GitHubService } from '../../services/githubService';

interface SettingsTabProps {
  settings: SettingsState;
  onUpdateSettings: (updater: (prev: SettingsState) => SettingsState) => void;
  onResetSettings: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [newAllowedPath, setNewAllowedPath] = useState('');
  const [newForbiddenPath, setNewForbiddenPath] = useState('');

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      if (!settings.githubToken || !settings.githubToken.trim()) {
        setTestStatus('No GitHub token configured. A token is required for live mode.');
        return;
      }
      const data = await GitHubService.testConnection(settings.githubToken, settings.githubBaseUrl);
      if (data.success) {
        setTestStatus(`Connected as ${data.user?.login || 'user'} — credentials operational.`);
      } else {
        setTestStatus(data.message || 'Connection failed. Please check your token and network.');
      }
    } catch {
      setTestStatus('Connection failed. Please check your token and network.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddAllowed = () => {
    if (!newAllowedPath.trim()) return;
    onUpdateSettings(prev => ({
      ...prev,
      defaultAllowedPaths: [...prev.defaultAllowedPaths, newAllowedPath.trim()],
    }));
    setNewAllowedPath('');
  };

  const handleRemoveAllowed = (idx: number) => {
    onUpdateSettings(prev => ({
      ...prev,
      defaultAllowedPaths: prev.defaultAllowedPaths.filter((_, i) => i !== idx),
    }));
  };

  const handleAddForbidden = () => {
    if (!newForbiddenPath.trim()) return;
    onUpdateSettings(prev => ({
      ...prev,
      defaultForbiddenPaths: [...prev.defaultForbiddenPaths, newForbiddenPath.trim()],
    }));
    setNewForbiddenPath('');
  };

  const handleRemoveForbidden = (idx: number) => {
    onUpdateSettings(prev => ({
      ...prev,
      defaultForbiddenPaths: prev.defaultForbiddenPaths.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Settings Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-300">
                Studio Configuration
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Studio & API Settings</h2>
            </div>
            <p className="text-xs text-slate-500">
              Configure credentials, guardrail thresholds, Jules agent parameters, and model options.
            </p>
          </div>

          <button
            id="btn-reset-default-settings"
            type="button"
            onClick={onResetSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Security & Credentials Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
        <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900">Credential Handling & Privacy</span>
          <p className="text-slate-600 leading-relaxed">
            All GitHub tokens and Jules credentials are sent securely to backend endpoints or stored only in local session memory. Recommended GitHub Personal Access Token fine-grained scopes: <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">contents:read</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">contents:write</code>, <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">pull_requests:write</code>.
          </p>
        </div>
      </div>

      {/* 1. GitHub Integration Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          <Server className="w-4 h-4 text-blue-600" />
          <span>GitHub API Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Personal Access Token (PAT)</label>
            <input
              id="input-settings-gh-token"
              type="password"
              value={settings.githubToken}
              onChange={e => onUpdateSettings(prev => ({ ...prev, githubToken: e.target.value }))}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-500 block">Required for live mode. Use a fine-grained PAT with <code>contents:read</code> and <code>pull_requests:write</code> scopes.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">GitHub API Base URL</label>
            <input
              id="input-settings-gh-base-url"
              type="text"
              value={settings.githubBaseUrl}
              onChange={e => onUpdateSettings(prev => ({ ...prev, githubBaseUrl: e.target.value }))}
              placeholder="https://api.github.com"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-[10px] text-slate-500 block">For GitHub Enterprise Server: <code>https://github.corp.com/api/v3</code></span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            id="btn-test-gh-connection"
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          {testStatus && <span className="text-xs font-semibold text-emerald-700">{testStatus}</span>}
        </div>
      </div>

      {/* 2. Jules Agent Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>Jules Coding Agent Runtime</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Jules API Key</label>
            <input
              id="input-settings-jules-key"
              type="password"
              value={settings.julesApiKey}
              onChange={e => onUpdateSettings(prev => ({ ...prev, julesApiKey: e.target.value }))}
              placeholder="jules_live_xxxxxxxx"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Jules Base URL</label>
            <input
              id="input-settings-jules-url"
              type="text"
              value={settings.julesBaseUrl}
              onChange={e => onUpdateSettings(prev => ({ ...prev, julesBaseUrl: e.target.value }))}
              placeholder="https://jules.googleapis.com"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Max Autonomous Repairs</label>
            <input
              id="input-settings-max-repairs"
              type="number"
              min={0}
              max={5}
              value={settings.maxAutoRepairs}
              onChange={e => onUpdateSettings(prev => ({ ...prev, maxAutoRepairs: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="pt-2 space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="checkbox-require-human-high-risk"
              type="checkbox"
              checked={settings.requireHumanForHighRisk}
              onChange={e => onUpdateSettings(prev => ({ ...prev, requireHumanForHighRisk: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-800">
              Require explicit human confirmation for <strong>High-Risk</strong> tasks before launching Jules sandbox.
            </span>
          </label>
        </div>
      </div>

      {/* 3. Verification Guardrails & Policy Thresholds */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Verification Guardrail Thresholds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Max Allowed Changed Files</label>
            <input
              id="input-settings-max-files"
              type="number"
              value={settings.maxFilesChanged}
              onChange={e => onUpdateSettings(prev => ({ ...prev, maxFilesChanged: parseInt(e.target.value) || 15 }))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Max Additions (Lines)</label>
            <input
              id="input-settings-max-additions"
              type="number"
              value={settings.maxAdditions}
              onChange={e => onUpdateSettings(prev => ({ ...prev, maxAdditions: parseInt(e.target.value) || 800 }))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Max Deletions (Lines)</label>
            <input
              id="input-settings-max-deletions"
              type="number"
              value={settings.maxDeletions}
              onChange={e => onUpdateSettings(prev => ({ ...prev, maxDeletions: parseInt(e.target.value) || 400 }))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="pt-2 space-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="checkbox-require-ci-pass"
              type="checkbox"
              checked={settings.requireCiPass}
              onChange={e => onUpdateSettings(prev => ({ ...prev, requireCiPass: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-800">
              Strict Gate: Require all CI Check Runs to pass before approval.
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="checkbox-require-tests"
              type="checkbox"
              checked={settings.requireTests}
              onChange={e => onUpdateSettings(prev => ({ ...prev, requireTests: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-800">
              Strict Gate: Require corresponding unit or integration tests to be modified or added.
            </span>
          </label>
        </div>
      </div>

      {/* 4. Gemini AI Model Configuration */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Gemini AI Intelligence Layer</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Decomposition & Reasoning Model</label>
            <select
              value={settings.geminiModel}
              onChange={e => onUpdateSettings(prev => ({ ...prev, geminiModel: e.target.value }))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Fast decomposition & verification)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Deep architectural reasoning)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">Task Decomposition Temperature</label>
            <div className="flex items-center gap-3">
              <input
                id="range-gemini-temp"
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={settings.geminiTemperature}
                onChange={e => onUpdateSettings(prev => ({ ...prev, geminiTemperature: parseFloat(e.target.value) }))}
                className="flex-1"
              />
              <span className="font-mono text-xs text-slate-700 w-8">{settings.geminiTemperature}</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Lower temperature ensures deterministic, structured task breakdown.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
