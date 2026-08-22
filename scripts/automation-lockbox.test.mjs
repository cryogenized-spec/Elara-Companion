import assert from 'node:assert/strict';
import test from 'node:test';
import { createAutomationLockbox } from './automation-lockbox.mjs';

test('automation Lockbox accepts only CI-approved secrets and config', () => {
  const lockbox = createAutomationLockbox({
    ELARA_STATE_TOKEN: 'state-token',
    GEMINI_API_KEY: 'gemini-key',
    ELARA_STATE_REPO: 'owner/private-state',
    AUTOMATION_ID: 'auto-1',
    EXECUTION_KEY: 'auto-1:2026-08-22T05:00:00.000Z',
  });

  assert.equal(lockbox.secret('ELARA_STATE_TOKEN'), 'state-token');
  assert.equal(lockbox.secret('GEMINI_API_KEY'), 'gemini-key');
  assert.equal(lockbox.requireConfig('ELARA_STATE_REPO'), 'owner/private-state');
  assert.equal(lockbox.requireConfig('AUTOMATION_ID'), 'auto-1');
  assert.equal(lockbox.requireConfig('EXECUTION_KEY'), 'auto-1:2026-08-22T05:00:00.000Z');
});

test('automation Lockbox rejects browser-only or worker-only entries', () => {
  const lockbox = createAutomationLockbox({
    VITE_GOOGLE_CLIENT_ID: 'public-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'worker-secret',
  });

  assert.throws(() => lockbox.config('VITE_GOOGLE_CLIENT_ID'), /not approved for CI exposure/);
  assert.throws(() => lockbox.secret('GOOGLE_OAUTH_CLIENT_SECRET'), /not approved for CI exposure/);
});

test('automation Lockbox fails closed for missing critical values', () => {
  const lockbox = createAutomationLockbox({});
  assert.throws(() => lockbox.secret('ELARA_STATE_TOKEN'), /not configured/);
  assert.throws(() => lockbox.requireConfig('AUTOMATION_ID'), /not configured/);
});
