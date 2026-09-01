import assert from 'node:assert/strict';
import test from 'node:test';
import { googleHubCapabilityRegistry } from './googleCapabilityRegistry';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';

test('Google Hub composition exposes all registered capability ids with complete permission semantics', () => {
  const capabilities = googleHubCapabilityRegistry.list();
  assert.deepEqual(
    capabilities.map((capability) => capability.id),
    ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'tasks', 'contacts', 'chat'],
  );

  const state = createGoogleHubAuthorizationState(
    capabilities,
    () => true,
    (capability) => capability === 'gmail.read' || capability === 'gmail.send',
    () => 1,
  ).snapshot();

  assert.equal(state.status, 'partially-authorized');
  assert.equal(state.grantedCapabilities.includes('gmail.read'), true);
  assert.equal(state.missingCapabilities.includes('gmail.read'), false);
  assert.equal(state.missingCapabilities.includes('gmail.compose'), false);
  assert.equal(state.missingCapabilities.includes('gmail.send'), false);
});

test('Google Hub identity-only authorization remains connected but partially authorized', () => {
  const capabilities = googleHubCapabilityRegistry.list();
  const snapshot = createGoogleHubAuthorizationState(capabilities, () => true, () => false, () => 2).snapshot();
  assert.equal(snapshot.authorized, true);
  assert.equal(snapshot.status, 'partially-authorized');
});
