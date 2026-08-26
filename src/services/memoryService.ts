import type { MemoryAction, MemoryScratchpadState } from '../types';
import { publishApplicationEvent } from '../events/applicationEventBus';
import { getDbMemoryState, registerMemoryStateListener, setDbMemoryState } from '../lib/db';
import { applyMemoryActions } from '../lib/memoryProcessor';

let currentMemoryState: MemoryScratchpadState | null = null;

registerMemoryStateListener((state) => {
  currentMemoryState = state;
});

/** Canonical application boundary for Elara memory. */
export async function loadMemoryState(): Promise<MemoryScratchpadState> {
  const state = await getDbMemoryState();
  currentMemoryState = state;
  publishApplicationEvent({
    type: 'memory.changed',
    payload: { state, reason: 'load' },
  });
  return state;
}

/** Read-only application boundary for memory transparency and diagnostics UI. */
export async function loadMemoryTransparencyState(
  options: { runMaintenance?: boolean; updateProjections?: boolean } = { runMaintenance: false, updateProjections: false },
): Promise<MemoryScratchpadState> {
  return getDbMemoryState(options);
}

export async function saveMemoryState(state: MemoryScratchpadState, conversationId?: string): Promise<void> {
  currentMemoryState = state;
  await setDbMemoryState(state);
  publishApplicationEvent({
    type: 'memory.changed',
    payload: { conversationId, state, reason: 'save' },
  });
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
