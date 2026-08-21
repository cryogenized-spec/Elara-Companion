import test from 'node:test';
import assert from 'node:assert/strict';
import { clearResilienceStatus, emitResilienceStatus, getResilienceStatus, subscribeResilienceStatus } from './resilienceStatus';

test('resilience status publishes and clears through the repository test runner', () => {
  clearResilienceStatus();
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

  assert.equal(getResilienceStatus()?.model, 'gemini-3.6-flash');
  assert.equal(seen.length, 1);

  clearResilienceStatus();
  assert.equal(getResilienceStatus(), null);
  assert.equal(seen.at(-1), null);
  unsubscribe();
});
