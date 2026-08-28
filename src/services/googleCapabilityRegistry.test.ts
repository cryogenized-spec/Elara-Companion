import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGoogleHubCapabilityRegistry,
  googleHubCapabilityRegistry,
  INITIAL_CAPABILITIES,
} from './googleCapabilityRegistry';
import {
  createGoogleCapabilityModuleRegistry,
} from '../components/google/googleCapabilityModules';

const capability = (id: string, name = 'Test Capability') => ({
  id,
  name,
  description: 'Test capability module',
  category: 'collaboration' as const,
  iconKey: 'test',
  requiredCapabilities: [],
  panelKey: `test.${id}`,
  actions: [{ id: 'ask', label: 'Ask Elara', kind: 'ask' as const }],
});

test('Google Hub capability registry registers the current capability set', () => {
  const ids = googleHubCapabilityRegistry.list().map((item) => item.id);
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

test('Google Hub registry accepts a future capability without changing core code', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  registry.register(capability('meet'));
  assert.equal(registry.get('meet')?.name, 'Test Capability');
  registry.unregister('meet');
  assert.equal(registry.has('meet'), false);
});

test('Google Hub module registry accepts and renders a future module independently', () => {
  const modules = createGoogleCapabilityModuleRegistry();
  modules.register('future.meet', () => 'future-panel');
  assert.equal(modules.has('future.meet'), true);
  const descriptor = capability('future.meet');
  assert.equal(modules.render(descriptor, {
    descriptor,
    isGranted: () => false,
    askElara: () => undefined,
    recordActivity: () => undefined,
  }), 'future-panel');
  modules.unregister('future.meet');
  assert.equal(modules.has('future.meet'), false);
});

test('Google Hub module registry rejects duplicate factories', () => {
  const modules = createGoogleCapabilityModuleRegistry();
  modules.register('future.meet', () => 'one');
  assert.throws(() => modules.register('future.meet', () => 'two'), /Google capability module already registered: future.meet/);
});
