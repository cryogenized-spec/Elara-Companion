import assert from 'node:assert/strict';
import test from 'node:test';
import { GOOGLE_HUB_CAPABILITIES, createGoogleCapabilityRegistry } from '../googleHub';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';
import { createGoogleActivityRecorder } from './googleActivityService';

test('Google Hub integration matrix stays registry-driven and token-free', () => {
  const registry = createGoogleCapabilityRegistry();
  const descriptors = registry.getAll();
  assert.equal(descriptors.length, 9);
  assert.deepEqual(descriptors.map(item => item.id), ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'tasks', 'keep', 'contacts', 'chat']);

  const authorization = createGoogleHubAuthorizationState(
    descriptors,
    () => true,
    () => true,
    () => 42,
  ).snapshot();

  assert.equal(authorization.status, 'authorized');
  assert.equal(Object.prototype.hasOwnProperty.call(authorization, 'accessToken'), false);

  const activity = createGoogleActivityRecorder();
  activity.record({ id: '1', timestamp: 42, capabilityId: 'gmail', action: 'read', description: 'Read mail', reversible: false, external: false });
  assert.equal(activity.list(1)[0].capabilityId, 'gmail');
  assert.equal(Object.prototype.hasOwnProperty.call(activity.list(1)[0], 'accessToken'), false);

  assert.equal(GOOGLE_HUB_CAPABILITIES.length, 9);
});
