import assert from 'node:assert/strict';
import test from 'node:test';
import { googleHubCapabilityRegistry } from './googleCapabilityRegistry';
import { projectGoogleHubCapabilityState } from './googleHubCapabilityState';

test('Google Hub capability state is unavailable when Google is unauthorized', () => {
  const descriptor = googleHubCapabilityRegistry.get('gmail');
  assert.ok(descriptor);
  const state = projectGoogleHubCapabilityState(descriptor, new Set(), false);
  assert.equal(state.status, 'unavailable');
  assert.deepEqual(state.enabledActions, ['Open Gmail', 'Ask Elara']);
  assert.deepEqual(state.blockedActions, ['Search mail', 'Create draft', 'Send mail']);
});

test('Google Hub capability state is needs-access for an authorized account missing base access', () => {
  const descriptor = googleHubCapabilityRegistry.get('calendar');
  assert.ok(descriptor);
  const state = projectGoogleHubCapabilityState(descriptor, new Set(), true);
  assert.equal(state.status, 'needs-access');
  assert.deepEqual(state.missingBaseCapabilities, ['calendar.read']);
  assert.deepEqual(state.blockedActions, ['Sync now', 'Find availability', 'Create event']);
});

test('Google Hub capability state is limited when base access is granted but action access is partial', () => {
  const descriptor = googleHubCapabilityRegistry.get('gmail');
  assert.ok(descriptor);
  const state = projectGoogleHubCapabilityState(descriptor, new Set(['gmail.read']), true);
  assert.equal(state.status, 'limited');
  assert.deepEqual(state.enabledActions, ['Search mail', 'Open Gmail', 'Ask Elara']);
  assert.deepEqual(state.blockedActions, ['Create draft', 'Send mail']);
});

test('Google Hub capability state is enabled when every actionable requirement is granted', () => {
  const descriptor = googleHubCapabilityRegistry.get('gmail');
  assert.ok(descriptor);
  const state = projectGoogleHubCapabilityState(descriptor, new Set(['gmail.read', 'gmail.compose', 'gmail.send']), true);
  assert.equal(state.status, 'enabled');
  assert.deepEqual(state.blockedActions, []);
  assert.deepEqual(state.enabledActions, ['Search mail', 'Create draft', 'Send mail', 'Open Gmail', 'Ask Elara']);
});

test('Google Hub action state retains requirements and safety metadata', () => {
  const descriptor = googleHubCapabilityRegistry.get('gmail');
  assert.ok(descriptor);
  const state = projectGoogleHubCapabilityState(descriptor, new Set(['gmail.read']), true);
  const sendAction = state.actions.find(action => action.id === 'send');
  const openAction = state.actions.find(action => action.id === 'open');
  assert.deepEqual(sendAction?.requiredCapabilities, ['gmail.send']);
  assert.equal(sendAction?.requiresConfirmation, true);
  assert.equal(sendAction?.destructive, false);
  assert.equal(openAction?.available, true);
});
