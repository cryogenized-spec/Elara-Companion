import React from 'react';
import type { MemoryScratchpadState, MemoryItem, MemoryConfidence } from '../types';
import { MemoryModal as MemoryModalView } from './MemoryModalLegacy';

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

/** Stable mount boundary and host for the read-only memory transparency-safe modal surface. */
export const MemoryModal: React.FC<MemoryModalProps> = (props) => {
  if (!props.isOpen) return null;

  const safeMemoryState = normalizeMemoryStateForView(props.memoryState);
  return <MemoryModalView {...props} isOpen={true} memoryState={safeMemoryState} />;
};
