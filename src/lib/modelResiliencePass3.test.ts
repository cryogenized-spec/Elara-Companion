import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import { ModelHealthState, createModelHealthState } from './modelHealth';
import { runWithModelResilience, ModelResilienceStateStore } from './modelResilience';

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

test('restores the preferred model after its cooldown expires', async () => {
  const store = testStore();
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
    { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'], cooldownMs: 0 },
    store,
  );

  assert.equal(first.context.usedFallback, true);

  const second = await runWithModelResilience(
    'gemini-3.7-flash',
    async (model) => ({ value: model }),
    { retryPolicy: fastRetry, fallbackModels: ['gemini-3.6-flash'] },
    store,
  );

  assert.equal(second.context.model, 'gemini-3.7-flash');
  assert.equal(second.value, 'gemini-3.7-flash');
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
