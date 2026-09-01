import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import { calculateRetryDelay, DEFAULT_RETRY_POLICY, runWithRetry } from './retryPolicy';

const error = (status: number, message = '') => Object.assign(new Error(message || `HTTP ${status}`), { status });

test('classifies retryable transient Gemini failures', () => {
  assert.equal(classifyApiError(error(408), 'gemini-3.7-flash').code, 'REQUEST_TIMEOUT_408');
  assert.equal(classifyApiError(error(429, 'rate limit exceeded'), 'gemini-3.7-flash').code, 'API_RATE_LIMIT_RPM_429');
  assert.equal(classifyApiError(error(500), 'gemini-3.7-flash').code, 'SERVER_ERROR_500');
  assert.equal(classifyApiError(error(502), 'gemini-3.7-flash').code, 'BAD_GATEWAY_502');
  assert.equal(classifyApiError(error(503), 'gemini-3.7-flash').code, 'SERVICE_UNAVAILABLE_503');
  assert.equal(classifyApiError(error(504), 'gemini-3.7-flash').code, 'GATEWAY_TIMEOUT_504');
  assert.equal(classifyApiError(new Error('Failed to fetch'), 'gemini-3.7-flash').code, 'NETWORK_ERROR');
});

test('distinguishes genuine context-limit messages from unrelated context errors', () => {
  assert.equal(
    classifyApiError(error(400, 'Request exceeds the maximum number of input tokens for this model'), 'gemini-3.7-flash').code,
    'CONTEXT_LIMIT_400',
  );
  assert.equal(
    classifyApiError(error(400, 'Invalid request: context must be provided for this operation'), 'gemini-3.7-flash').code,
    'INVALID_REQUEST_400',
  );
  assert.equal(
    classifyApiError(error(400, 'Invalid request: function call missing thought signature'), 'gemini-3.7-flash').code,
    'INVALID_REQUEST_400',
  );
});

test('does not retry authentication, permission, invalid-request, quota, or cancellation failures', () => {
  assert.equal(classifyApiError(error(401), 'gemini-3.7-flash').retryable, false);
  assert.equal(classifyApiError(error(403), 'gemini-3.7-flash').retryable, false);
  assert.equal(classifyApiError(error(400), 'gemini-3.7-flash').retryable, false);
  assert.equal(classifyApiError(error(429, 'daily quota exceeded'), 'gemini-3.7-flash').retryable, false);
  assert.equal(classifyApiError(Object.assign(new Error('Aborted'), { name: 'AbortError' }), 'gemini-3.7-flash').retryable, false);
});

test('honours Retry-After while clamping to policy maximum', () => {
  const classified = classifyApiError(
    Object.assign(error(503), { headers: new Headers({ 'retry-after': '7' }) }),
    'gemini-3.7-flash',
  );
  assert.equal(classified.retryAfterMs, 7000);
  assert.equal(
    calculateRetryDelay(1, classified, { ...DEFAULT_RETRY_POLICY, maxDelayMs: 5000 }, () => 0.5),
    5000,
  );
});

test('retries transient failures and eventually succeeds', async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await runWithRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw error(503);
      return 'ok';
    },
    {
      policy: { maxAttempts: 3 },
      sleep: async (delayMs) => { delays.push(delayMs); },
      random: () => 0.5,
    },
  );

  assert.equal(result.value, 'ok');
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [5000, 5000]);
});

test('stops immediately on a non-retryable failure', async () => {
  let calls = 0;
  await assert.rejects(
    () => runWithRetry(
      async () => {
        calls += 1;
        throw error(401);
      },
      { sleep: async () => { throw new Error('sleep should not run'); } },
    ),
    (caught: any) => caught?.apiError?.code === 'API_AUTH_401',
  );
  assert.equal(calls, 1);
});

test('never exceeds the configured total attempt count', async () => {
  let calls = 0;
  await assert.rejects(
    () => runWithRetry(
      async () => {
        calls += 1;
        throw error(503);
      },
      {
        policy: { maxAttempts: 2 },
        sleep: async () => {},
        random: () => 0.5,
      },
    ),
    (caught: any) => caught?.apiError?.code === 'SERVICE_UNAVAILABLE_503',
  );
  assert.equal(calls, 2);
});
