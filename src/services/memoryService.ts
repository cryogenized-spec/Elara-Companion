import type { MemoryAction, MemoryScratchpadState } from '../types';
import { getDbMemoryState, setDbMemoryState } from '../lib/db';
import { applyMemoryActions } from '../lib/memoryProcessor';

/** Canonical application boundary for Elara memory. */
export async function loadMemoryState(): Promise<MemoryScratchpadState> {
  return getDbMemoryState();
}

export async function saveMemoryState(state: MemoryScratchpadState): Promise<void> {
  await setDbMemoryState(state);
}

export function reduceMemoryActions(
  state: MemoryScratchpadState,
  actions: MemoryAction[],
  conversationId?: string,
): MemoryScratchpadState {
  return applyMemoryActions(state, actions, conversationId);
}
