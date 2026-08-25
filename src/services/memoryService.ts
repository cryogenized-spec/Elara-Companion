import type { MemoryAction, MemoryScratchpadState } from '../types';
import { getDbMemoryState, setDbMemoryState } from '../lib/db';
import { applyMemoryActions } from '../lib/memoryProcessor';

let currentMemoryState: MemoryScratchpadState | null = null;

/** Canonical application boundary for Elara memory. */
export async function loadMemoryState(): Promise<MemoryScratchpadState> {
  const state = await getDbMemoryState();
  currentMemoryState = state;
  return state;
}

export async function saveMemoryState(state: MemoryScratchpadState): Promise<void> {
  currentMemoryState = state;
  await setDbMemoryState(state);
}

/** Returns the most recently loaded authoritative memory state for synchronous payload construction. */
export function getLoadedMemoryState(): MemoryScratchpadState | null {
  return currentMemoryState;
}

export function reduceMemoryActions(
  state: MemoryScratchpadState,
  actions: MemoryAction[],
  conversationId?: string,
): MemoryScratchpadState {
  return applyMemoryActions(state, actions, conversationId);
}
