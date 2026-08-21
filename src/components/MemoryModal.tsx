import React, { useState } from 'react';
import type { MemoryScratchpadState, MemoryItem, MemoryConfidence } from '../types';
import { MemoryModal as MemoryModalView } from './MemoryModalLegacy';
import { MemoryInsightPanel } from './MemoryInsightPanel';

export type MemoryModalProps = React.ComponentProps<typeof MemoryModalView>;

const VALID_CONFIDENCE: readonly MemoryConfidence[] = ['certain', 'likely', 'uncertain'];

function isMemoryConfidence(value: unknown): value is MemoryConfidence {
  return typeof value === 'string' && (VALID_CONFIDENCE as readonly string[]).includes(value);
}

function normalizeMemoryStateForView(state: MemoryScratchpadState): MemoryScratchpadState {
  const memories = Array.isArray(state?.memories) ? state.memories : [];
  return {
    ...state,
    memories: memories
      .filter((memory): memory is MemoryItem => Boolean(memory) && typeof memory === 'object')
      .map((memory) => ({
        ...memory,
        content: typeof memory.content === 'string' ? memory.content : String(memory.content ?? ''),
        confidence: isMemoryConfidence(memory.confidence) ? memory.confidence : 'uncertain',
        tags: Array.isArray(memory.tags) ? memory.tags.filter((tag) => typeof tag === 'string') : [],
        links: Array.isArray(memory.links) ? memory.links : [],
      })),
  };
}

/** Stable mount boundary and host for the read-only memory transparency view. */
export const MemoryModal: React.FC<MemoryModalProps> = (props) => {
  const [showInsights, setShowInsights] = useState(false);
  if (!props.isOpen) return null;

  const safeMemoryState = normalizeMemoryStateForView(props.memoryState);
  return (
    <>
      <MemoryModalView {...props} isOpen={true} memoryState={safeMemoryState} />
      <button
        type="button"
        onClick={() => setShowInsights((value) => !value)}
        className="fixed bottom-4 right-4 z-[65] rounded-xl border border-zinc-700 bg-zinc-950/90 px-3 py-2 text-[11px] font-medium text-zinc-300 shadow-lg backdrop-blur-xl hover:border-amber-500/40 hover:text-zinc-100"
        aria-expanded={showInsights}
        aria-controls="elara-memory-insights"
      >
        {showInsights ? 'Close insights' : 'Insights'}
      </button>
      {showInsights && <div id="elara-memory-insights"><MemoryInsightPanel memories={safeMemoryState.memories} onClose={() => setShowInsights(false)} /></div>}
    </>
  );
};
