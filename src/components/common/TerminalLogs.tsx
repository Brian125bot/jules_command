import React from 'react';
import { Terminal, Copy, Check, Download, RefreshCw, X } from 'lucide-react';

interface TerminalLogsProps {
  logs: string[];
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  isRunning?: boolean;
}

export const TerminalLogs: React.FC<TerminalLogsProps> = ({
  logs,
  title = 'Jules Agent Execution Logs',
  isOpen,
  onClose,
  isRunning = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        id="terminal-logs-modal"
        className="w-full max-w-4xl bg-slate-950 text-slate-100 rounded-xl shadow-2xl border border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>{title}</span>
              {isRunning && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active Stream
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-terminal-logs"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Logs'}
            </button>
            <button
              id="btn-close-terminal-logs"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={scrollRef}
          className="p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 bg-slate-950 select-text flex-1 min-h-[300px]"
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 italic py-8 text-center">Initializing telemetry connection...</div>
          ) : (
            logs.map((log, index) => {
              const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail');
              const isSuccess = log.toLowerCase().includes('pass') || log.toLowerCase().includes('success') || log.toLowerCase().includes('completed');
              const isStage = log.toLowerCase().includes('provision') || log.toLowerCase().includes('cloned') || log.toLowerCase().includes('synthesizing');

              return (
                <div
                  key={index}
                  className={`leading-relaxed ${
                    isError
                      ? 'text-rose-400 font-semibold'
                      : isSuccess
                      ? 'text-emerald-400 font-medium'
                      : isStage
                      ? 'text-cyan-300'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              );
            })
          )}
          {isRunning && (
            <div className="flex items-center gap-2 text-emerald-400 animate-pulse pt-2">
              <span className="w-2 h-3.5 bg-emerald-400 inline-block"></span>
              <span className="text-slate-500">Awaiting container events...</span>
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Lines: {logs.length}</span>
          <span>Buffer: UTF-8 standard stream</span>
        </div>
      </div>
    </div>
  );
};
