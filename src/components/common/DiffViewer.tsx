import React, { useState } from 'react';
import { BranchDiff, ChangedFile } from '../../types';
import { FileCode, Plus, Minus, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface DiffViewerProps {
  diff: BranchDiff;
  forbiddenPaths?: string[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, forbiddenPaths = [] }) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const files = diff?.files || [];
  const selectedFile = files[selectedFileIndex] || files[0];

  const handleCopyPatch = () => {
    if (!selectedFile?.patch) return;
    navigator.clipboard.writeText(selectedFile.patch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!files || files.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
        No changed files detected in this branch comparison.
      </div>
    );
  }

  return (
    <div id="branch-diff-viewer" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Diff Metrics Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-slate-800">
            {diff.totalFiles || files.length} changed files
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Plus className="w-3 h-3" />
              {diff.totalAdditions}
            </span>
            <span className="inline-flex items-center gap-0.5 text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <Minus className="w-3 h-3" />
              {diff.totalDeletions}
            </span>
          </div>
        </div>

        {selectedFile && (
          <button
            id="btn-copy-diff-patch"
            onClick={handleCopyPatch}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            {copied ? 'Copied Patch' : 'Copy File Patch'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
        {/* File Navigator Sidebar */}
        <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/50 p-2 overflow-y-auto max-h-[500px]">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
            Changed Files
          </div>
          <div className="space-y-1">
            {files.map((file, idx) => {
              const isSelected = idx === selectedFileIndex;
              const isForbidden = forbiddenPaths.some(fp => file.filename.startsWith(fp) || file.filename.includes(fp));
              const isTest = file.filename.includes('test') || file.filename.includes('spec');

              return (
                <button
                  key={file.filename}
                  id={`diff-file-${idx}`}
                  onClick={() => setSelectedFileIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-medium border border-blue-200 shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate font-mono" title={file.filename}>
                      {file.filename}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isForbidden && (
                      <span className="p-0.5 text-rose-600 bg-rose-50 border border-rose-200 rounded" title="Forbidden path modified">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                    {isTest && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-sans font-medium">
                        test
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      +{file.additions} -{file.deletions}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Patch Content View */}
        <div className="lg:col-span-8 p-4 overflow-x-auto max-h-[500px] bg-slate-900 text-slate-100 font-mono text-xs">
          {selectedFile ? (
            <div>
              <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-slate-300 font-semibold">{selectedFile.filename}</span>
                <span className="text-[11px] px-2 py-0.5 bg-slate-800 rounded text-slate-400 uppercase">
                  {selectedFile.status}
                </span>
              </div>

              {selectedFile.patch ? (
                <pre className="leading-relaxed whitespace-pre-wrap select-text">
                  {selectedFile.patch.split('\n').map((line, lIdx) => {
                    const isAdded = line.startsWith('+') && !line.startsWith('+++');
                    const isRemoved = line.startsWith('-') && !line.startsWith('---');
                    const isHeader = line.startsWith('@@');

                    let lineStyle = 'text-slate-300';
                    let bgStyle = '';

                    if (isAdded) {
                      lineStyle = 'text-emerald-400';
                      bgStyle = 'bg-emerald-950/40';
                    } else if (isRemoved) {
                      lineStyle = 'text-rose-400';
                      bgStyle = 'bg-rose-950/40';
                    } else if (isHeader) {
                      lineStyle = 'text-cyan-400 font-semibold';
                      bgStyle = 'bg-cyan-950/30';
                    }

                    return (
                      <div key={lIdx} className={`px-2 py-0.5 rounded-xs ${lineStyle} ${bgStyle}`}>
                        {line}
                      </div>
                    );
                  })}
                </pre>
              ) : (
                <div className="text-slate-500 py-12 text-center italic">
                  Binary file or empty diff patch.
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 py-12 text-center">Select a file to inspect diff lines.</div>
          )}
        </div>
      </div>
    </div>
  );
};
