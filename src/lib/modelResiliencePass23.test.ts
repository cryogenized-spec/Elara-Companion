import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import { createModelHealthState, recordModelFailure, selectRuntimeModel } from './modelHealth';
import { isFailoverEligible, runWithModelResilience } from './modelResilience';

const fastRetry = { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitterRatio: 0 };

function errorFor(status: number, message = `HTTP ${status}`) {
  return classifyApiError(Object.assign(new Error(message), { status }), 'gemini-3.7-flash');
}

test('Pass 23 classifies the full provider failure taxonomy', () => {
  assert.equal(errorFor(429).code, 'API_RATE_LIMIT_RPM_429');
  assert.equal(errorFor(408).code, 'REQUEST_TIMEOUT_408');
  assert.equal(errorFor(500).code, 'SERVER_ERROR_500');
  assert.equal(errorFor(502).code, 'BAD_GATEWAY_502');
  assert.equal(errorFor(503).code, 'SERVICE_UNAVAILABLE_503');
  assert.equal(errorFor(504).code, 'GATEWAY_TIMEOUT_504');
  assert.equal(errorFor(401).code, 'API_AUTH_401');
  assert.equal(errorFor(403).code, 'API_FORBIDDEN_403');
  assert.equal(errorFor(404).code, 'MODEL_NOT_FOUND_404');
  assert.equal(errorFor(400).code, 'INVALID_REQUEST_400');
  assert.equal(classifyApiError(new TypeError('Failed to fetch'), 'gemini-3.7-flash').code, 'NETWORK_ERROR');
  assert.equal(classifyApiError(new Error('unexpected SDK response'), 'gemini-3.7-flash').code, 'UNKNOWN_API_ERROR');
  assert.equal(classifyApiError(new Error('blocked by safety controls'), 'gemini-3.7-flash').code, 'CONTENT_SAFETY_400');
  assert.equal(classifyApiError(Object.assign(new Error('cancelled'), { name: 'AbortError' }), 'gemini-3.7-flash').code, 'CLIENT_RUNTIME_ERROR');
});

test('Pass 23 default fallback eligibility is explicit and excludes auth, permission, validation, safety, cancellation and unknown errors', () => {
  assert.equal(isFailoverEligible(errorFor(429)), true);
  assert.equal(isFailoverEligible(errorFor(500)), true);
  assert.equal(isFailoverEligible(errorFor(503)), true);
  assert.equal(isFailoverEligible(errorFor(404)), true);
  assert.equal(isFailoverEligible(errorFor(401)), false);
  assert.equal(isFailoverEligible(errorFor(403)), false);
  assert.equal(isFailoverEligible(errorFor(400)), false);
  assert.equal(isFailoverEligible(classifyApiError(new Error('blocked by safety'), 'gemini-3.7-flash')), false);
  assert.equal(isFailoverEligible(classifyApiError(Object.assign(new Error('cancelled'), { name: 'AbortError' }), 'gemini-3.7-flash')), false);
  assert.equal(isFailoverEligible(classifyApiError(new Error('unexpected SDK response'), 'gemini-3.7-flash')), false);
  assert.equal(isFailoverEligible(classifyApiError(new Error('unexpected SDK response'), 'gemini-3.7-flash'), ['UNKNOWN_API_ERROR']), true);
});

test('Pass 23 falls back in preference order and does not rewrite that order', async () => {
  const stateStore = {
    state: createModelHealthState(),
    get() { return this.state; },
    set(next: ReturnType<typeof createModelHealthState>) { this.state = next; },
  };
  const calls: string[] = [];

  const result = await runWithModelResilience(
    'gemini-3.7-flash',
    async (model) => {
      calls.push(model);
      if (model === 'gemini-3.7-flash') throw Object.assign(new Error('HTTP 429'), { status: 429 });
      return { value: model };
    },
    {
      retryPolicy: { ...fastRetry, maxAttempts: 1 },
      preferenceOrder: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
      fallbackModels: ['gemini-3.5-flash'],
      failoverErrorCodes: ['API_RATE_LIMIT_RPM_429'],
      cooldownMs: 60_000,
    },
    stateStore,
  );

  assert.equal(result.context.model, 'gemini-3.6-flash');
  assert.deepEqual(calls, ['gemini-3.7-flash', 'gemini-3.6-flash']);
});

test('Pass 23 only skips a cooling next tier when the policy explicitly allows it', () => {
  const now = 1000;
  let state = createModelHealthState();
  state = recordModelFailure(state, 'gemini-3.7-flash', errorFor(503), now, 60_000);
  state = recordModelFailure(state, 'gemini-3.6-flash', errorFor(503), now, 60_000);

  const keepTierTwo = selectRuntimeModel({
    preferredModel: 'gemini-3.7-flash',
    fallbackModels: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
    state,
    now,
    skipUnhealthyFallbackModels: false,
  });
  assert.equal(keepTierTwo.model, 'gemini-3.6-flash');

  const skipTierTwo = selectRuntimeModel({
    preferredModel: 'gemini-3.7-flash',
    fallbackModels: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
    state,
    now,
    skipUnhealthyFallbackModels: true,
  });
  assert.equal(skipTierTwo.model, 'gemini-3.5-flash');
});
