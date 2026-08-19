import React, { useEffect, useState } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  ListTree,
  ChevronRight,
} from 'lucide-react';
import { ThoughtStep } from '../types';

interface ThoughtLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  thoughts: ThoughtStep[];
  isStreaming?: boolean;
  thoughtDurationMs?: number;
}

export const ThoughtLogModal: React.FC<ThoughtLogModalProps> = ({
  isOpen,
  onClose,
  thoughts,
  isStreaming = false,
  thoughtDurationMs,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    const textToCopy = thoughts
      .map((step, idx) => `[Step ${idx + 1}] ${step.step_title}\n${step.summary}`)
      .join('\n\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDuration = thoughtDurationMs ? `${(thoughtDurationMs / 1000).toFixed(1)}s` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-sky-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-zinc-100 ring-1 ring-sky-500/20 animate-in zoom-in-95 duration-200"
      >
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-inner">
              <Brain className="w-5 h-5 text-[#70A1FF] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <span>Thinking Summary</span>
                </h2>
                {isStreaming ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/20 text-[#70A1FF] border border-sky-400/30 animate-pulse">
                    <Sparkles className="w-2.5 h-2.5 animate-spin" />
                    <span>Live</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Completed</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                <span>{thoughts.length} sequential {thoughts.length === 1 ? 'step' : 'steps'}</span>
                {formattedDuration && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{formattedDuration} compute</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleCopyAll}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Copy thinking summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors" title="Close modal (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/70 text-[#70A1FF] border border-sky-800/50 shadow-sm">
            <ListTree className="w-3.5 h-3.5" />
            <span>Summary Steps</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">User-facing reasoning summary</span>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar">
          {thoughts.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Brain className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
              <p className="text-xs">No explicit thinking steps were recorded for this turn.</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-sky-500 before:via-sky-900/60 before:to-zinc-800">
              {thoughts.map((step, idx) => (
                <div key={step.id || idx} className="relative group">
                  <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 rounded-full bg-zinc-950 border-2 border-sky-400 flex items-center justify-center text-[10px] font-mono font-bold text-[#70A1FF] shadow-md group-hover:scale-110 transition-transform">
                    {idx + 1}
                  </div>
                  <div className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/90 hover:border-sky-500/40 rounded-xl p-3.5 transition-all shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-[#70A1FF] shrink-0" />
                        <span>{step.step_title}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">Step {idx + 1}</span>
                    </div>
                    <div className="pl-5 border-l-2 border-sky-500/30 mt-2 py-0.5 text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap">
                      {step.summary}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5 bg-zinc-900/40 border-t border-zinc-800/80 flex items-center justify-between gap-3 text-xs text-zinc-400">
          <span className="text-[11px]">Only concise user-facing summaries are shown here.</span>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
