import { loadRateLimits } from '../lib/storage';

/** Settings-owned diagnostics boundary. Low-level rate-limit storage remains hidden from UI. */
export function getSettingsRateLimits(): { date: string; counts: Record<string, number> } {
  return loadRateLimits();
}
