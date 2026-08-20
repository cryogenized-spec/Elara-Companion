import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyApiError } from './apiError';
import { createModelHealthState, recordModelFailure, selectRuntimeModel } from './modelHealth';
import { buildModelResiliencePolicy } from './modelResilience';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings, toRetryPolicy } from './reliabilitySettings';

test('normalizes reliability settings into bounded user-safe values', () => {
  const normalized = normalizeReliabilitySettings({
    maxAttempts: 99,
    baseDelayMs: -4,
    maxDelayMs: 999999,
    jitterRatio: 4,
    cooldownMs: 999999999,
    fallbackModels: [' GEMINI-3.6-FLASH ', 'gemini-3.6-flash', 'not-a-model'],
  });

  assert.equal(normalized.maxAttempts, 5);
  assert.equal(normalized.baseDelayMs, 0);
  assert.equal(normalized.maxDelayMs, 120000);
  assert.equal(normalized.jitterRatio, 1);
  assert.equal(normalized.cooldownMs, 900000);
  assert.deepEqual(normalized.fallbackModels, ['gemini-3.6-flash']);
});

test('maps persisted reliability settings into the runtime resilience policy', () => {
  const settings = normalizeReliabilitySettings({
    ...DEFAULT_RELIABILITY_SETTINGS,
    autoRetryEnabled: false,
    maxAttempts: 4,
    fallbackModels: ['gemini-3.5-flash'],
    autoFailoverEnabled: false,
    cooldownMs: 120000,
  });

  const policy = buildModelResiliencePolicy(settings);
  assert.equal(policy.retryPolicy?.maxAttempts, 1);
  assert.deepEqual(policy.fallbackModels, ['gemini-3.5-flash']);
  assert.equal(policy.failoverEnabled, false);
  assert.equal(policy.cooldownMs, 120000);
  assert.equal(policy.autoRestorePreferredModel, true);
  assert.deepEqual(policy.retryableErrorCodes, settings.retryableErrorCodes);
  assert.deepEqual(policy.failoverErrorCodes, settings.failoverErrorCodes);
});

test('supports staying on a healthy fallback when automatic preferred restoration is disabled', () => {
  const failure = classifyApiError(Object.assign(new Error('HTTP 503'), { status: 503 }));
  let state = recordModelFailure(createModelHealthState(), 'gemini-3.7-flash', failure, 0, 1000);

  const result = selectRuntimeModel({
    preferredModel: 'gemini-3.7-flash',
    fallbackModels: ['gemini-3.6-flash'],
    state,
    now: 2000,
    autoRestorePreferredModel: false,
  });

  assert.deepEqual(result, {
    model: 'gemini-3.6-flash',
    usedFallback: true,
    probingPreferred: false,
  });
});

test('disables retry attempts while preserving failover policy when auto-retry is off', () => {
  const settings = normalizeReliabilitySettings({ autoRetryEnabled: false, autoFailoverEnabled: true });
  const retryPolicy = toRetryPolicy(settings);
  assert.equal(retryPolicy.maxAttempts, 1);
  assert.equal(settings.autoFailoverEnabled, true);
});
