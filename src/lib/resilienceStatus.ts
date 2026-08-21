export type ResilienceStatusKind = 'retrying' | 'fallback' | 'recovered';

export interface ResilienceStatus {
  kind: ResilienceStatusKind;
  model: string;
  preferredModel: string;
  attempts: number;
  usedFallback: boolean;
  probingPreferred: boolean;
  timestamp: number;
}

const listeners = new Set<(status: ResilienceStatus | null) => void>();
let currentStatus: ResilienceStatus | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export function emitResilienceStatus(status: Omit<ResilienceStatus, 'timestamp'>): void {
  currentStatus = { ...status, timestamp: Date.now() };
  listeners.forEach((listener) => listener(currentStatus));

  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    currentStatus = null;
    listeners.forEach((listener) => listener(null));
  }, status.kind === 'fallback' ? 7000 : 4500);
}

export function subscribeResilienceStatus(listener: (status: ResilienceStatus | null) => void): () => void {
  listeners.add(listener);
  if (currentStatus) listener(currentStatus);
  return () => listeners.delete(listener);
}

export function getResilienceStatus(): ResilienceStatus | null {
  return currentStatus;
}

export function clearResilienceStatus(): void {
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = null;
  currentStatus = null;
  listeners.forEach((listener) => listener(null));
}
