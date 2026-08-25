import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerLockbox } from '../../../server/services/lockbox';

test('server Lockbox diagnostics report state without exposing values', () => {
  const lockbox = createServerLockbox({
    GEMINI_API_KEY: 'super-secret-value',
    GEMINI_MODEL: 'gemini-test',
  });
  const diagnostics = lockbox.diagnostics();
  const apiKey = diagnostics.find((entry) => entry.key === 'GEMINI_API_KEY');
  const model = diagnostics.find((entry) => entry.key === 'GEMINI_MODEL');

  assert.equal(apiKey?.status, 'configured');
  assert.equal(apiKey?.classification, 'secret');
  assert.deepEqual(apiKey?.exposures, ['server']);
  assert.equal(model?.status, 'configured');
  assert.equal(JSON.stringify(diagnostics).includes('super-secret-value'), false);
});
