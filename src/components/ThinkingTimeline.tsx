import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Circle } from 'lucide-react';
import type { ThoughtStep } from '../types';

interface ThinkingTimelineProps {
  thoughts: ThoughtStep[];
  isStreaming?: boolean;
  thoughtDurationMs?: number;
}

const areThinkingTimelinePropsEqual = (previous: ThinkingTimelineProps, next: ThinkingTimelineProps) => {
  if (previous.isStreaming !== next.isStreaming || previous.thoughtDurationMs !== next.thoughtDurationMs) return false;
  if (previous.thoughts === next.thoughts) return true;
  if (previous.thoughts.length !== next.thoughts.length) return false;
  if (previous.thoughts.length === 0) return true;
  const previousLast = previous.thoughts[previous.thoughts.length - 1];
  const nextLast = next.thoughts[next.thoughts.length - 1];
  return previousLast.id === nextLast.id
    && previousLast.timestamp === nextLast.timestamp
    && previousLast.step_title === nextLast.step_title
    && previousLast.summary === nextLast.summary;
};

const ThinkingTimelineBase: React.FC<ThinkingTimelineProps> = ({ thoughts, isStreaming = false, thoughtDurationMs }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (!thoughts.length) return null;

  const duration = typeof thoughtDurationMs === 'number' ? `${(thoughtDurationMs / 1000).toFixed(1)}s` : null;
  const toggle = (id: string) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className="w-full mb-3 rounded-xl border border-zinc-800/80 bg-zinc-950/45 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 px-1 pb-2">
        <div className="relative flex h-5 w-5 items-center justify-center shrink-0">
          <span className={`absolute h-2.5 w-2.5 rounded-full ${isStreaming ? 'bg-pink-400 animate-pulse' : 'bg-pink-400/80'}`} />
          {isStreaming && <span className="absolute h-5 w-5 rounded-full border border-pink-400/25 animate-ping" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-300">Thinking</div>
          <div className="text-[10px] text-zinc-500">{thoughts.length} {thoughts.length === 1 ? 'step' : 'steps'}{duration ? ` · ${duration}` : ''}</div>
        </div>
      </div>

      <div className="relative pl-7">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-pink-400/60 via-pink-500/25 to-zinc-800" />
        <div className="space-y-1">
          {thoughts.map((step, index) => {
            const key = step.id || `${step.timestamp}-${index}`;
            const isOpen = expanded[key] ?? false;
            const isLast = index === thoughts.length - 1;
            return (
              <div key={key} className="relative">
                <div className="absolute -left-7 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-pink-400/60 bg-zinc-950 text-[9px] font-semibold text-pink-300">{index + 1}</div>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.035] focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-400/60"
                  aria-expanded={isOpen}
                >
                  <span className="mt-0.5 shrink-0 text-pink-300/80">{isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-medium ${isLast && isStreaming ? 'text-pink-200' : 'text-zinc-200'}`}>{step.step_title}</span>
                    {isOpen && <span className="mt-1 block whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-400">{step.summary}</span>}
                  </span>
                  <Circle className={`mt-1 h-2 w-2 shrink-0 ${isLast && isStreaming ? 'fill-pink-400 text-pink-400' : 'fill-zinc-700 text-zinc-700'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ThinkingTimeline = React.memo(ThinkingTimelineBase, areThinkingTimelinePropsEqual);
