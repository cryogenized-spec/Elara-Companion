import type { LockboxEntry } from './lockbox';

export type LockboxStatus = 'configured' | 'missing';

export type LockboxStatusEntry = {
  key: string;
  namespace: LockboxEntry['namespace'];
  classification: LockboxEntry['classification'];
  exposures: readonly string[];
  status: LockboxStatus;
};

export function evaluateLockboxStatus(
  entries: readonly LockboxEntry[],
  env: Record<string, unknown>,
  exposures: readonly string[] = [],
): LockboxStatusEntry[] {
  return entries
    .filter((entry) => exposures.length === 0 || exposures.some((exposure) => entry.exposures.includes(exposure as never)))
    .map((entry) => ({
      key: entry.key,
      namespace: entry.namespace,
      classification: entry.classification,
      exposures: entry.exposures,
      status: typeof env[entry.key] === 'string' && Boolean((env[entry.key] as string).trim()) ? 'configured' : 'missing',
    }));
}

export function summarizeLockboxStatus(entries: readonly LockboxStatusEntry[]) {
  return {
    total: entries.length,
    configured: entries.filter((entry) => entry.status === 'configured').length,
    missing: entries.filter((entry) => entry.status === 'missing').length,
  };
}
