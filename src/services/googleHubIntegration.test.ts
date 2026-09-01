import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleHubCapabilityRegistry } from './googleCapabilityRegistry';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';
import { createGoogleActivityRecorder } from './googleActivityService';

test('Google Hub integration matrix stays registry-driven and token-free', () => {
  const registry = createGoogleHubCapabilityRegistry();
  const descriptors = registry.list();
  assert.equal(descriptors.length, 8);
  assert.deepEqual(descriptors.map(item => item.id), ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'tasks', 'contacts', 'chat']);

  const authorization = createGoogleHubAuthorizationState(
    descriptors,
    () => true,
    () => true,
    () => 42,
  ).snapshot();

  assert.equal(authorization.status, 'authorized');
  assert.equal(Object.prototype.hasOwnProperty.call(authorization, 'accessToken'), false);

  const activity = createGoogleActivityRecorder();
  activity.record({ id: '1', timestamp: 42, capabilityId: 'gmail', action: 'read', description: 'Read mail', reversible: false, external: true, consequential: false });
  assert.equal(activity.list(1)[0].capabilityId, 'gmail');
  assert.equal(activity.list(1)[0].external, true);
  assert.equal(Object.prototype.hasOwnProperty.call(activity.list(1)[0], 'accessToken'), false);
});
