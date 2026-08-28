import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RELIABILITY_SETTINGS, normalizeReliabilitySettings } from './reliabilitySettings';
import {
  applyModelPreferenceOrder,
  createModelPreferenceState,
  getModelPreferenceOptions,
  isKnownModel,
  resolveModelPreferenceOrder,
} from './modelPreference';

test('creates a deterministic preference order with the current primary first', () => {
  const state = createModelPreferenceState('gemini-3.6-flash', {
    preferredModelOrder: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
  });

  assert.equal(state.preferredModel, 'gemini-3.6-flash');
  assert.deepEqual(state.preferredModelOrder, [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
  ]);
});

test('does not mutate preference order when runtime failover uses another model', () => {
  const original = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
  const state = createModelPreferenceState('gemini-3.7-flash', {
    preferredModelOrder: original,
  });

  const fallbackInUse = 'gemini-3.6-flash';
  assert.equal(fallbackInUse, state.preferredModelOrder[1]);
  assert.deepEqual(state.preferredModelOrder, original);
});

test('ignores unknown or deleted models while preserving valid preference entries', () => {
  const order = resolveModelPreferenceOrder('gemini-2.5-pro', {
    preferredModelOrder: ['deleted-model', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'],
  });

  assert.deepEqual(order, ['gemini-2.5-pro', 'gemini-3.6-flash', 'gemini-3.7-flash']);
  assert.equal(isKnownModel('gemini-2.5-pro'), true);
  assert.equal(isKnownModel('deleted-model'), false);
});

test('normalizes legacy settings with no preferredModelOrder', () => {
  const normalized = normalizeReliabilitySettings({
    maxAttempts: 2,
    fallbackModels: ['gemini-3.6-flash'],
  });

  assert.deepEqual(normalized.preferredModelOrder, DEFAULT_RELIABILITY_SETTINGS.preferredModelOrder);
  assert.deepEqual(normalized.fallbackModels, ['gemini-3.6-flash']);
});

test('preserves extensible known models in preference order even when they are not fallback models', () => {
  const settings = normalizeReliabilitySettings({
    preferredModelOrder: ['gemini-2.5-pro', 'gemini-3.7-flash'],
    fallbackModels: ['gemini-3.6-flash'],
  });

  assert.deepEqual(settings.preferredModelOrder, ['gemini-2.5-pro', 'gemini-3.7-flash']);
  assert.deepEqual(settings.fallbackModels, ['gemini-3.6-flash']);
});

test('applies a user order without creating a second persisted store', () => {
  const next = applyModelPreferenceOrder(DEFAULT_RELIABILITY_SETTINGS, [
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
  ]);

  assert.deepEqual(next.preferredModelOrder, [
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
  ]);
  assert.equal(next.fallbackModels.length, DEFAULT_RELIABILITY_SETTINGS.fallbackModels.length);
});

test('exposes friendly model options with preference ranks', () => {
  const state = createModelPreferenceState('gemini-3.7-flash', {
    preferredModelOrder: ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'],
  });
  const options = getModelPreferenceOptions(state);
  const primary = options.find((option) => option.id === 'gemini-3.7-flash');
  const secondary = options.find((option) => option.id === 'gemini-3.6-flash');

  assert.equal(primary?.name, 'Gemini 3.7 Flash');
  assert.equal(primary?.preferenceRank, 1);
  assert.equal(primary?.isPreferred, true);
  assert.equal(secondary?.preferenceRank, 2);
  assert.equal(secondary?.isPreferred, false);
});
