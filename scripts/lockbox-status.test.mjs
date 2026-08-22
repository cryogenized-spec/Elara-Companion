import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLockboxStatus } from './lockbox-status.mjs';

test('status reports configured without exposing values', () => {
  const rows = buildLockboxStatus({ GEMINI_API_KEY: 'super-secret' });
  const row = rows.find((item) => item.name === 'GEMINI_API_KEY');
  assert.equal(row.status, 'configured');
  assert.equal(JSON.stringify(row).includes('super-secret'), false);
});

test('status reports missing and runtime-managed entries safely', () => {
  const rows = buildLockboxStatus({});
  assert.equal(rows.find((item) => item.name === 'ELARA_STATE_TOKEN').status, 'missing');
  assert.equal(rows.find((item) => item.name === 'GOOGLE_VAULT_KV').status, 'managed-by-runtime');
});
