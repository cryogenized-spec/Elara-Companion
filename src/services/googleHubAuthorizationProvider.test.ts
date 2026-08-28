import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';

// The provider adapter is intentionally a very small seam; exercise its state
// contract independently so provider credential details never become part of Hub state.
test('Google Hub authorization projection remains token-free and capability-based', () => {
  const state = createGoogleHubAuthorizationState(
    [
      {
        id: 'gmail',
        name: 'Gmail',
        description: 'Mail',
        category: 'communication',
        iconKey: 'mail',
        requiredCapabilities: ['gmail.read', 'gmail.compose'],
        panelKey: 'google.gmail',
        actions: [],
      },
    ],
    () => true,
    (capability) => capability === 'gmail.read',
    () => 42,
  );

  const snapshot = state.snapshot();
  assert.equal(snapshot.status, 'partially-authorized');
  assert.deepEqual(snapshot.grantedCapabilities, ['gmail.read']);
  assert.deepEqual(snapshot.missingCapabilities, ['gmail.compose']);
  assert.equal('accessToken' in snapshot, false);
  assert.equal('token' in snapshot, false);
});
