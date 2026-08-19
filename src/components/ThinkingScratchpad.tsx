import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { ThoughtStep } from '../types';
import { ThoughtLogModal } from './ThoughtLogModal';
import { DEFAULT_THINKING_DISPLAY_MODE, loadThinkingDisplayMode, saveThinkingDisplayMode, THINKING_DISPLAY_EVENT, type ThinkingDisplayMode } from '../lib/thinkingDisplay';

interface ThinkingScratchpadProps {
  isThinking: boolean;
  isStreaming: boolean;
  activeSentence?: string;
  thoughts?: ThoughtStep[];
  rawThoughts?: string;
  thoughtDurationMs?: number;
}

export const ThinkingScratchpad: React.FC<ThinkingScratchpadProps> = ({
  isThinking,
  isStreaming,
  activeSentence,
  thoughts = [],
  rawThoughts,
  thoughtDurationMs,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<ThinkingDisplayMode>(DEFAULT_THINKING_DISPLAY_MODE);

  useEffect(() => {
    setDisplayMode(loadThinkingDisplayMode());
    const handlePreferenceChange = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: ThinkingDisplayMode }>).detail?.mode;
      if (mode === 'off' || mode === 'steps' || mode === 'summaries') setDisplayMode(mode);
    };
    window.addEventListener(THINKING_DISPLAY_EVENT, handlePreferenceChange);
    return () => window.removeEventListener(THINKING_DISPLAY_EVENT, handlePreferenceChange);
  }, []);

  if (displayMode === 'off') return null;

  const hasThoughts = (thoughts && thoughts.length > 0) || (rawThoughts && rawThoughts.trim().length > 0);
  if (!isThinking && !hasThoughts) return null;

  const liveStep = thoughts.length > 0
    ? thoughts[thoughts.length - 1].step_title
    : 'Evaluating parameters and synthesizing response...';
  const liveSummary = activeSentence || liveStep;
  const formattedDuration = thoughtDurationMs ? `${(thoughtDurationMs / 1000).toFixed(1)}s` : null;
  const isStepOnly = displayMode === 'steps';

  const handleOpen = () => {
    if (isStepOnly) return;
    setModalOpen(true);
  };

  return (
    <>
      <div
        onClick={handleOpen}
        role={isStepOnly ? undefined : 'button'}
        tabIndex={isStepOnly ? undefined : 0}
        onKeyDown={(e) => {
          if (!isStepOnly && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
        title={isStepOnly ? 'Thinking steps' : 'Open thinking summary'}
        className={`w-full mb-2.5 px-3.5 py-2 rounded-xl transition-all duration-300 select-none group border backdrop-blur-md ${
          !isStepOnly ? 'cursor-pointer' : ''
        } ${
          isThinking
            ? 'bg-sky-950/40 border-sky-500/40 hover:border-sky-400/70 shadow-[0_0_15px_rgba(112,161,255,0.12)]'
            : 'bg-zinc-900/65 border-zinc-800/80 hover:border-sky-500/30 hover:bg-zinc-900/85'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            {isThinking ? (
              <div className="relative flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#70A1FF] animate-ping absolute" />
                <Sparkles className="w-3.5 h-3.5 text-[#70A1FF] animate-pulse" />
              </div>
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/90 shrink-0" />
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[11px] font-semibold tracking-wide uppercase font-mono ${isThinking ? 'text-[#70A1FF]' : 'text-zinc-400 group-hover:text-sky-300'}`}>
                {isStepOnly ? (isThinking ? 'Thinking steps' : 'Steps completed') : (isThinking ? 'Thinking...' : 'Thinking completed')}
              </span>
              {thoughts.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/70 border border-sky-800/40 text-sky-300 font-mono">
                  {thoughts.length} {thoughts.length === 1 ? 'step' : 'steps'}
                </span>
              )}
              {formattedDuration && !isThinking && (
                <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">• {formattedDuration}</span>
              )}
            </div>
          </div>

          {!isStepOnly && (
            <div className="flex items-center space-x-1 text-[11px] text-zinc-500 group-hover:text-sky-300 transition-colors shrink-0">
              <span className="text-[10px] hidden sm:inline">View summary</span>
              <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-sky-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>

        <div className="mt-1 pl-5 overflow-hidden">
          <p
            key={isStepOnly ? liveStep : liveSummary}
            className="text-xs truncate transition-opacity duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-1 font-sans leading-normal"
            style={{ color: isThinking ? 'rgba(112, 161, 255, 0.88)' : 'rgba(148, 163, 184, 0.8)' }}
          >
            {isStepOnly ? liveStep : `“${liveSummary}”`}
          </p>
        </div>
      </div>

      {!isStepOnly && (
        <ThoughtLogModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          thoughts={thoughts}
          rawThoughts={rawThoughts}
          isStreaming={isThinking || isStreaming}
          thoughtDurationMs={thoughtDurationMs}
        />
      )}
    </>
  );
};
