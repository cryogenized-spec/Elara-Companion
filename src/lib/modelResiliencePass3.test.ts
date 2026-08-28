import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import { ModelHealthState, createModelHealthState } from './modelHealth';
import { runWithModelResilience, ModelResilienceStateStore } from './modelResilience';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings } from './reliabilitySettings';

function testStore(initial?: ModelHealthState): ModelResilienceStateStore {
  let state = initial || createModelHealthState();
  return {
    get: () => state,
    set: (next) => { state = next; },
  };
}

const fastRetry = {
  maxAttempts: 3,
  baseDelayMs: 0,
  maxDelayMs: 0,
  jitterRatio: 0,
};

test('retries the preferred model up to three attempts before failing over', async () => {
  const store = testStore();
  const calls: string[] = [];

  const result = await runWithModelResilience(
    'gemini-3.7-flash',
    async (model) => {
      calls.push(model);
      if (model === 'gemini-3.7-flash') {
        throw Object.assign(new Error('HTTP 503'), {
          apiError: classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }), model),
        });
      }
      return { value: 'fallback-success' };
    },
    { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'] },
    store,
  );

  assert.equal(result.value, 'fallback-success');
  assert.equal(result.context.model, 'gemini-3.6-flash');
  assert.deepEqual(calls, [
    'gemini-3.7-flash',
    'gemini-3.7-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
  ]);
});

test('fails over an unclassified Gemini SDK error instead of surfacing a stuck UNKNOWN_API_ERROR', async () => {
  const store = testStore();
  const calls: string[] = [];
  const unknownFailure = Object.assign(new Error('unexpected Gemini SDK response'), {
    apiError: {
      code: 'UNKNOWN_API_ERROR' as const,
      message: 'Gemini returned an unexpected error.',
      retryable: true,
      rawMessage: 'unexpected Gemini SDK response',
    },
  });

  const result = await runWithModelResilience(
    'gemini-3.5-flash',
    async (model) => {
      calls.push(model);
      if (model === 'gemini-3.5-flash') throw unknownFailure;
      return { value: 'recovered-on-fallback' };
    },
    { retryPolicy: { ...fastRetry, maxAttempts: 1 }, fallbackModels: ['gemini-3.7-flash'] },
    store,
  );

  assert.equal(result.value, 'recovered-on-fallback');
  assert.equal(result.context.model, 'gemini-3.7-flash');
  assert.deepEqual(calls, ['gemini-3.5-flash', 'gemini-3.7-flash']);
});

test('existing stored reliability settings gain UNKNOWN_API_ERROR resilience without losing their choices', () => {
  const normalized = normalizeReliabilitySettings({
    ...DEFAULT_RELIABILITY_SETTINGS,
    retryableErrorCodes: ['NETWORK_ERROR'],
    failoverErrorCodes: ['MODEL_NOT_FOUND_404'],
  });

  assert.deepEqual(normalized.retryableErrorCodes, ['NETWORK_ERROR', 'UNKNOWN_API_ERROR']);
  assert.deepEqual(normalized.failoverErrorCodes, ['MODEL_NOT_FOUND_404', 'UNKNOWN_API_ERROR']);
});

test('restores the preferred model after its cooldown expires', async () => {
  const store = testStore();
  const originalDateNow = Date.now;
  let now = 10_000;
  Date.now = () => now;

  try {
    const first = await runWithModelResilience(
      'gemini-3.7-flash',
      async (model) => {
        if (model === 'gemini-3.7-flash') {
          throw Object.assign(new Error('HTTP 503'), {
            apiError: classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }), model),
          });
        }
        return { value: 'fallback-success' };
      },
      { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'], cooldownMs: 60_000 },
      store,
    );

    assert.equal(first.context.usedFallback, true);
    now = 70_001;

    const second = await runWithModelResilience(
      'gemini-3.7-flash',
      async (model) => ({ value: model }),
      { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'] },
      store,
    );

    assert.equal(second.context.model, 'gemini-3.7-flash');
    assert.equal(second.value, 'gemini-3.7-flash');
  } finally {
    Date.now = originalDateNow;
  }
});

test('does not retry or fail over after partial output has been emitted', async () => {
  const store = testStore();
  let calls = 0;

  await assert.rejects(
    () => runWithModelResilience(
      'gemini-3.7-flash',
      async () => {
        calls += 1;
        throw Object.assign(new Error('partial stream failed'), {
          apiError: {
            ...classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }), 'gemini-3.7-flash'),
            retryable: false,
            failoverOverride: false,
          },
        });
      },
      { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'] },
      store,
    ),
  );

  assert.equal(calls, 1);
});

test('does not fail over authentication errors', async () => {
  const store = testStore();
  let calls = 0;

  await assert.rejects(
    () => runWithModelResilience(
      'gemini-3.7-flash',
      async () => {
        calls += 1;
        throw Object.assign(new Error('HTTP 401'), {
          apiError: classifyApiError(Object.assign(new Error('HTTP 401'), { status: 401 }), 'gemini-3.7-flash'),
        });
      },
      { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'] },
      store,
    ),
  );

  assert.equal(calls, 1);
});
