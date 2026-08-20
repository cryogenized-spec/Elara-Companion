import { describe, expect, it, vi } from 'vitest';
import { emitResilienceStatus, getResilienceStatus, subscribeResilienceStatus } from './resilienceStatus';

describe('resilienceStatus', () => {
  it('publishes and clears a fallback status', () => {
    vi.useFakeTimers();
    const seen: Array<unknown> = [];
    const unsubscribe = subscribeResilienceStatus((status) => seen.push(status));

    emitResilienceStatus({
      kind: 'fallback',
      model: 'gemini-3.6-flash',
      preferredModel: 'gemini-3.7-flash',
      attempts: 3,
      usedFallback: true,
      probingPreferred: false,
    });

    expect(getResilienceStatus()?.model).toBe('gemini-3.6-flash');
    expect(seen.length).toBe(1);

    vi.advanceTimersByTime(7000);
    expect(getResilienceStatus()).toBeNull();
    expect(seen.at(-1)).toBeNull();
    unsubscribe();
    vi.useRealTimers();
  });
});
