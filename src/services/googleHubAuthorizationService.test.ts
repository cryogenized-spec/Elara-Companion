import assert from 'node:assert/strict';
import test from 'node:test';
import type { GoogleHubCapabilityDescriptor } from '../contracts/googleHub';
import { createGoogleHubAuthorizationState } from './googleHubAuthorizationService';

const capabilities: GoogleHubCapabilityDescriptor[] = [
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
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Calendar',
    category: 'scheduling',
    iconKey: 'calendar',
    requiredCapabilities: ['calendar.read', 'calendar.write', 'gmail.read'],
    panelKey: 'google.calendar',
    actions: [],
  },
];

test('Google Hub authorization reports full authorization', () => {
  const state = createGoogleHubAuthorizationState(capabilities, () => true, () => true, () => 123);
  assert.deepEqual(state.snapshot(), {
    status: 'authorized',
    authorized: true,
    grantedCapabilities: ['gmail.read', 'gmail.compose', 'calendar.read', 'calendar.write'],
    missingCapabilities: [],
    updatedAt: 123,
  });
});

test('Google Hub authorization reports partial capability coverage', () => {
  const state = createGoogleHubAuthorizationState(capabilities, () => true, (capability) => capability === 'gmail.read' || capability === 'calendar.read', () => 456);
  assert.equal(state.snapshot().status, 'partially-authorized');
  assert.equal(state.snapshot().authorized, true);
  assert.deepEqual(state.snapshot().grantedCapabilities, ['gmail.read', 'calendar.read']);
  assert.deepEqual(state.snapshot().missingCapabilities, ['gmail.compose', 'calendar.write']);
});

test('Google Hub authorization reports unauthorized when identity is not authorized', () => {
  const state = createGoogleHubAuthorizationState(capabilities, () => false, () => false, () => 789);
  assert.equal(state.snapshot().status, 'unauthorized');
  assert.equal(state.snapshot().authorized, false);
  assert.deepEqual(state.snapshot().missingCapabilities, ['gmail.read', 'gmail.compose', 'calendar.read', 'calendar.write']);
});

test('Google Hub authorization treats a valid identity with no capability scopes as partial, not unknown', () => {
  const state = createGoogleHubAuthorizationState(capabilities, () => true, () => false, () => 800);
  const snapshot = state.snapshot();
  assert.equal(snapshot.status, 'partially-authorized');
  assert.equal(snapshot.authorized, true);
  assert.deepEqual(snapshot.grantedCapabilities, []);
  assert.deepEqual(snapshot.missingCapabilities, ['gmail.read', 'gmail.compose', 'calendar.read', 'calendar.write']);
});

test('Google Hub authorization deduplicates shared capability requirements', () => {
  const state = createGoogleHubAuthorizationState(capabilities, () => true, (capability) => capability === 'gmail.read', () => 1000);
  assert.deepEqual(state.snapshot().grantedCapabilities, ['gmail.read']);
  assert.equal(state.snapshot().missingCapabilities.includes('gmail.read'), false);
});

test('Google Hub authorization snapshot contains no credential field', () => {
  const state = createGoogleHubAuthorizationState(capabilities, () => true, () => true);
  const snapshot = state.snapshot() as unknown as Record<string, unknown>;
  assert.equal('accessToken' in snapshot, false);
  assert.equal('token' in snapshot, false);
});
