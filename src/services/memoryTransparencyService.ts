import type { MemoryScratchpadState } from '../types';
import { getDbMemoryState } from '../lib/db';

export interface MemoryTransparencyReadOptions {
  runMaintenance?: boolean;
  updateProjections?: boolean;
}

const DEFAULT_READ_OPTIONS: Readonly<MemoryTransparencyReadOptions> = Object.freeze({
  runMaintenance: false,
  updateProjections: false,
});

/** Read-only application boundary for memory inspection UI. */
export async function loadMemoryTransparencyState(
  options: MemoryTransparencyReadOptions = DEFAULT_READ_OPTIONS,
): Promise<MemoryScratchpadState> {
  return getDbMemoryState(options);
}

export const memoryTransparencyService = {
  load: loadMemoryTransparencyState,
};
