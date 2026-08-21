import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { ThoughtStep } from '../types';
import { ThinkingTimeline } from './ThinkingTimeline';
import { DEFAULT_THINKING_DISPLAY_MODE, loadThinkingDisplayMode, THINKING_DISPLAY_EVENT, type ThinkingDisplayMode } from '../lib/thinkingDisplay';

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

  const hasThoughts = thoughts.length > 0 || Boolean(rawThoughts?.trim());
  if (!isThinking && !hasThoughts) return null;

  const liveStep = thoughts.length > 0
    ? thoughts[thoughts.length - 1].step_title
    : 'Evaluating parameters and synthesizing response...';
  const liveSummary = activeSentence || liveStep;
  const isStepOnly = displayMode === 'steps';

  if (isStepOnly) {
    return (
      <div className="w-full mb-2.5 px-3.5 py-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/45 shadow-sm">
        <div className="flex items-center gap-2 min-h-7">
          {isThinking ? (
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping absolute" />
              <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
            </div>
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/90 shrink-0" />
          )}
          <span className="text-[11px] font-semibold tracking-wide uppercase font-mono text-pink-300">
            {isThinking ? 'Thinking steps' : 'Steps completed'}
          </span>
        </div>
        <p className="mt-1 pl-5 text-xs text-zinc-400 truncate">{liveStep}</p>
      </div>
    );
  }

  return (
    <>
      <ThinkingTimeline
        thoughts={thoughts}
        isStreaming={isThinking || isStreaming}
        thoughtDurationMs={thoughtDurationMs}
      />
      {thoughts.length === 0 && (
        <div className="w-full mb-2.5 px-3.5 py-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/45">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-pink-300">Thinking</span>
          </div>
          <p className="mt-1 pl-5 text-xs text-zinc-400 truncate">“{liveSummary}”</p>
        </div>
      )}
    </>
  );
};
