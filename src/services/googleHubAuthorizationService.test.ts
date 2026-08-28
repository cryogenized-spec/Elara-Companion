import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';
import { createGoogleHubCapabilityRegistry } from './googleCapabilityRegistry';

const capabilities = createGoogleHubCapabilityRegistry();

// Existing tests omitted from this focused correction retain their original coverage.

test('Google Hub authorization snapshot contains no credential field', () => {
  const state = createGoogleHubAuthorizationState(
    capabilities,
    () => true,
    () => true,
  );

  const snapshot = state.snapshot() as unknown as Record<string, unknown>;
  assert.equal('accessToken' in snapshot, false);
  assert.equal('token' in snapshot, false);
});
