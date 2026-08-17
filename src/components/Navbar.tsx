import React from 'react';
import { Target, CheckSquare, Play, ShieldAlert, FileText, Settings, Sparkles, RefreshCw, FolderGit2, CheckCircle2 } from 'lucide-react';
import { GoalInput } from '../types';
import { SAMPLE_GOAL_PRESETS } from '../data/mockData';

export type TabKey = 'goal' | 'plan' | 'execute' | 'verify' | 'report' | 'settings';

interface NavbarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  goalInput: GoalInput;
  onSelectPreset: (preset: GoalInput) => void;
  onResetWorkspace: () => void;
  isExecuting?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  goalInput,
  onSelectPreset,
  onResetWorkspace,
  isExecuting = false,
}) => {
  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'goal', label: 'Goal', icon: Target },
    { key: 'plan', label: 'Plan', icon: CheckSquare },
    { key: 'execute', label: 'Execute', icon: Play },
    { key: 'verify', label: 'Verify', icon: ShieldAlert },
    { key: 'report', label: 'Report', icon: FileText },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-[#0F172A] border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white shadow-xs">
              JRS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm tracking-tight text-white">REPOMISSION STUDIO</h1>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border tracking-tight ${
                    goalInput.mode === 'live'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {goalInput.mode === 'live' ? 'Live' : 'Demo'}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Mission Control v1.0
              </div>
            </div>
          </div>

          {/* Center Tabs for quick top-level navigation */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`nav-tab-${tab.key}`}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-colors text-xs font-medium ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.key === 'execute' && isExecuting && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button
                id="btn-presets-dropdown"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Presets
              </button>
              <div className="absolute right-0 mt-1.5 w-72 bg-[#0F172A] border border-slate-800 rounded-lg shadow-2xl py-2 hidden group-hover:block z-50">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Sample Missions
                </div>
                {SAMPLE_GOAL_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    id={`preset-item-${idx}`}
                    onClick={() => onSelectPreset(p.data)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="font-semibold text-slate-200">{p.name}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-reset-mission"
              onClick={onResetWorkspace}
              title="Reset mission workspace"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Tabs */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto no-scrollbar py-2 border-t border-slate-800">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`nav-tab-mobile-${tab.key}`}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

