import { loadActiveScratchpad, saveActiveScratchpad } from '../lib/contextProjectionStorage';
import { loadMemoryState } from './memoryService';
import type { MemoryScratchpadState } from '../types';

/** Application-facing boundary for the derived Scratchpad projection. */
export function loadScratchpadProjection(): string {
  return loadActiveScratchpad();
}

export function saveScratchpadProjection(value: string): void {
  saveActiveScratchpad(value);
}

export async function loadScratchpadMemoryState(): Promise<MemoryScratchpadState> {
  return loadMemoryState();
}
