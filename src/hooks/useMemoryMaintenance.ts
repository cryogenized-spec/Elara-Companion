import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoryScratchpadState } from '../types';
import {
  MEMORY_MAINTENANCE_INTERVAL_MS,
  runMemoryMaintenanceCycle,
  type MemoryMaintenanceCycleResult,
} from '../lib/memoryMaintenanceScheduler';

export interface UseMemoryMaintenanceOptions {
  memoryState: MemoryScratchpadState;
  isLoaded: boolean;
  onSaveMemoryState: (state: MemoryScratchpadState) => Promise<void> | void;
  intervalMs?: number;
}

export interface UseMemoryMaintenanceResult {
  lastResult: MemoryMaintenanceCycleResult | null;
  runNow: () => Promise<MemoryMaintenanceCycleResult>;
}

export function useMemoryMaintenance({
  memoryState,
  isLoaded,
  onSaveMemoryState,
  intervalMs = MEMORY_MAINTENANCE_INTERVAL_MS,
}: UseMemoryMaintenanceOptions): UseMemoryMaintenanceResult {
  const stateRef = useRef(memoryState);
  const onSaveRef = useRef(onSaveMemoryState);
  const runningRef = useRef(false);
  const lastResultRef = useRef<MemoryMaintenanceCycleResult | null>(null);
  const [lastResult, setLastResult] = useState<MemoryMaintenanceCycleResult | null>(null);

  stateRef.current = memoryState;
  onSaveRef.current = onSaveMemoryState;

  const runNow = useCallback(async () => {
    if (runningRef.current) {
      return lastResultRef.current || {
        state: stateRef.current,
        plan: null,
        ran: false,
        skippedReason: 'not-due' as const,
      };
    }

    runningRef.current = true;
    try {
      const result = runMemoryMaintenanceCycle(stateRef.current, { intervalMs });
      lastResultRef.current = result;
      setLastResult(result);
      if (result.ran) {
        stateRef.current = result.state;
        await onSaveRef.current(result.state);
      }
      return result;
    } finally {
      runningRef.current = false;
    }
  }, [intervalMs]);

  useEffect(() => {
    if (!isLoaded) return;

    void runNow();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void runNow();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isLoaded, runNow]);

  return { lastResult, runNow };
}
