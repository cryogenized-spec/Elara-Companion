import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGoogleHubCapabilityRegistry,
  googleHubCapabilityRegistry,
  INITIAL_CAPABILITIES,
} from './googleCapabilityRegistry';

test('Google Hub capability registry registers the current capability set', () => {
  const ids = googleHubCapabilityRegistry.list().map((capability) => capability.id);
  assert.deepEqual(ids, ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'tasks', 'keep', 'contacts', 'chat']);
});

test('Google Hub registry supports lookup and category filtering', () => {
  assert.equal(googleHubCapabilityRegistry.get('gmail')?.category, 'communication');
  assert.equal(googleHubCapabilityRegistry.has('tasks'), true);
  assert.deepEqual(googleHubCapabilityRegistry.listByCategory('communication').map((item) => item.id), ['gmail']);
});

test('Google Hub registry rejects duplicate capability identifiers', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  registry.register(INITIAL_CAPABILITIES[0]);
  assert.throws(() => registry.register(INITIAL_CAPABILITIES[0]), /Google Hub capability already registered: gmail/);
});

test('Google Hub registry supports independently supplied capability modules', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  registry.register({
    id: 'tasks',
    name: 'Tasks',
    description: 'Test capability module',
    category: 'tasks',
    iconKey: 'check-square',
    requiredCapabilities: ['tasks'],
    panelKey: 'test.tasks',
    actions: [{ id: 'ask', label: 'Ask Elara', kind: 'ask' }],
  });
  assert.equal(registry.get('tasks')?.panelKey, 'test.tasks');
  registry.unregister('tasks');
  assert.equal(registry.has('tasks'), false);
});

test('Google Hub Gmail presents only safe default actions', () => {
  const gmail = googleHubCapabilityRegistry.get('gmail');
  const actionKinds = gmail?.actions.map((action) => action.kind) ?? [];
  assert.deepEqual(actionKinds, ['search', 'open', 'ask']);
  assert.deepEqual(gmail?.requiredCapabilities, ['gmail.read']);
});
