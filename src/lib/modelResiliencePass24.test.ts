import test from 'node:test';
import assert from 'node:assert/strict';
import { runWithModelResilience } from './modelResilience';
import { clearResilienceDiagnosticHistory, getResilienceDiagnosticHistory } from './resilienceDiagnostics';
import { classifyApiError } from './apiError';
import { createModelHealthState } from './modelHealth';

const fastRetry = { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0 };

test('Pass 24 diagnostic stream is emitted by the canonical routing path', async () => {
  clearResilienceDiagnosticHistory();
  let state = createModelHealthState();
  const stateStore = { get: () => state, set: (next: typeof state) => { state = next; } };

  const result = await runWithModelResilience(
    'gemini-3.7-flash',
    async (model) => {
      if (model === 'gemini-3.7-flash') {
        const error = classifyApiError(Object.assign(new Error('HTTP 429'), { status: 429 }), model);
        throw Object.assign(new Error(error.message), { apiError: error });
      }
      return { value: model };
    },
    {
      retryPolicy: fastRetry,
      preferenceOrder: ['gemini-3.7-flash', 'gemini-3.6-flash'],
      failoverEnabled: true,
      failoverErrorCodes: ['API_RATE_LIMIT_RPM_429'],
    },
    stateStore,
  );

  assert.equal(result.context.model, 'gemini-3.6-flash');
  const events = getResilienceDiagnosticHistory();
  assert.ok(events.some((event) => event.kind === 'REQUEST'));
  assert.ok(events.some((event) => event.kind === 'ERROR' && event.errorCode === 'API_RATE_LIMIT_RPM_429'));
  assert.ok(events.some((event) => event.kind === 'POLICY' && event.fallbackAllowed === true));
  assert.ok(events.some((event) => event.kind === 'ROUTE' && event.fallbackTarget === 'gemini-3.6-flash'));
});
