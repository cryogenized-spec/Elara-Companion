import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import {
  clearExpiredModelHealth,
  createModelHealthState,
  isModelCoolingDown,
  recordModelFailure,
  recordModelSuccess,
  selectRuntimeModel,
} from './modelHealth';

test('records a temporary model cooldown after a failure', () => {
  const state = recordModelFailure(
    createModelHealthState(),
    'Gemini-3.7-Flash',
    classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }), 'gemini-3.7-flash'),
    10_000,
    60_000,
  );

  assert.equal(isModelCoolingDown(state, 'gemini-3.7-flash', 10_001), true);
  assert.equal(isModelCoolingDown(state, 'gemini-3.7-flash', 70_000), false);
  assert.equal(state.models['gemini-3.7-flash'].failureCount, 1);
});

test('selects the first healthy fallback while preferred model is cooling down', () => {
  let state = createModelHealthState();
  state = recordModelFailure(
    state,
    'gemini-3.7-flash',
    classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }), 'gemini-3.7-flash'),
    10_000,
    60_000,
  );

  const result = selectRuntimeModel({
    preferredModel: 'gemini-3.7-flash',
    fallbackModels: ['gemini-3.6-flash', 'gemini-3.5-flash'],
    state,
    now: 10_001,
  });

  assert.deepEqual(result, {
    model: 'gemini-3.6-flash',
    usedFallback: true,
    probingPreferred: false,
  });
});

test('skips unhealthy fallback entries and preserves configured order', () => {
  let state = createModelHealthState();
  const failure = classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }));
  state = recordModelFailure(state, 'gemini-3.7-flash', failure, 0, 60_000);
  state = recordModelFailure(state, 'gemini-3.6-flash', failure, 1, 60_000);

  const result = selectRuntimeModel({
    preferredModel: 'gemini-3.7-flash',
    fallbackModels: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash'],
    state,
    now: 2,
  });

  assert.equal(result.model, 'gemini-3.5-flash');
  assert.equal(result.usedFallback, true);
});

test('probes the preferred model after its cooldown expires', () => {
  const failure = classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }));
  const state = recordModelFailure(createModelHealthState(), 'gemini-3.7-flash', failure, 10_000, 60_000);

  const result = selectRuntimeModel({
    preferredModel: 'gemini-3.7-flash',
    fallbackModels: ['gemini-3.6-flash'],
    state,
    now: 70_000,
  });

  assert.deepEqual(result, {
    model: 'gemini-3.7-flash',
    usedFallback: false,
    probingPreferred: true,
  });
});

test('clears expired health records without disturbing active cooldowns', () => {
  let state = createModelHealthState();
  const failure = classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }));
  state = recordModelFailure(state, 'gemini-3.7-flash', failure, 0, 10_000);
  state = recordModelFailure(state, 'gemini-3.6-flash', failure, 5_000, 10_000);

  const cleaned = clearExpiredModelHealth(state, 10_000);
  assert.equal(cleaned.models['gemini-3.7-flash'], undefined);
  assert.ok(cleaned.models['gemini-3.6-flash']);
});

test('success fully restores a model to healthy state', () => {
  const failure = classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }));
  let state = recordModelFailure(createModelHealthState(), 'gemini-3.7-flash', failure, 0, 60_000);
  state = recordModelSuccess(state, 'gemini-3.7-flash');
  assert.equal(state.models['gemini-3.7-flash'], undefined);
});
