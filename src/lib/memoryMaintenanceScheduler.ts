import type { MemoryScratchpadState } from '../types';
import {
  DEFAULT_MEMORY_MAINTENANCE_CONFIG,
  applySafeMemoryMaintenance,
  buildMemoryMaintenancePlan,
  type MemoryMaintenanceConfig,
  type MemoryMaintenancePlan,
} from './memoryMaintenance';

export const MEMORY_MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface MemoryMaintenanceCycleOptions {
  now?: Date;
  intervalMs?: number;
  config?: MemoryMaintenanceConfig;
}

export interface MemoryMaintenanceCycleResult {
  state: MemoryScratchpadState;
  plan: MemoryMaintenancePlan | null;
  ran: boolean;
  skippedReason: 'disabled' | 'not-due' | 'error' | null;
}

export function shouldRunMemoryMaintenance(
  state: MemoryScratchpadState,
  now = new Date(),
  intervalMs = MEMORY_MAINTENANCE_INTERVAL_MS,
): boolean {
  if (!state.autoMaintenanceEnabled) return false;
  if (!state.lastMaintenanceAt) return true;

  const timestamp = Date.parse(state.lastMaintenanceAt);
  if (!Number.isFinite(timestamp)) return true;

  return now.getTime() - timestamp >= intervalMs;
}

export function runMemoryMaintenanceCycle(
  state: MemoryScratchpadState,
  options: MemoryMaintenanceCycleOptions = {},
): MemoryMaintenanceCycleResult {
  const now = options.now || new Date();
  const intervalMs = options.intervalMs ?? MEMORY_MAINTENANCE_INTERVAL_MS;

  if (!state.autoMaintenanceEnabled) {
    return { state, plan: null, ran: false, skippedReason: 'disabled' };
  }

  if (!shouldRunMemoryMaintenance(state, now, intervalMs)) {
    return { state, plan: null, ran: false, skippedReason: 'not-due' };
  }

  try {
    const config: MemoryMaintenanceConfig = {
      ...DEFAULT_MEMORY_MAINTENANCE_CONFIG,
      ...(options.config || {}),
      now,
    };
    const plan = buildMemoryMaintenancePlan(state.memories, config);
    const maintained = applySafeMemoryMaintenance(state, plan, config);

    return {
      state: maintained,
      plan,
      ran: true,
      skippedReason: null,
    };
  } catch (error) {
    console.warn('Memory maintenance skipped after an internal failure:', error);
    return {
      state,
      plan: null,
      ran: false,
      skippedReason: 'error',
    };
  }
}
