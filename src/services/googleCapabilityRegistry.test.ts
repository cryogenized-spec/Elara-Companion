import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleHubCapabilityRegistry, googleHubCapabilityRegistry, INITIAL_CAPABILITIES } from './googleCapabilityRegistry';
import { createGoogleCapabilityModuleRegistry } from '../components/google/googleCapabilityModules';

const capability = (id: string, name = 'Test Capability') => ({
  id, name, description: 'Test capability module', category: 'collaboration' as const, iconKey: 'test', requiredCapabilities: [], panelKey: `test.${id}`,
  actions: [{ id: 'ask', label: 'Ask Elara', kind: 'ask' as const }],
});

test('Google Hub capability registry registers the current capability set', () => {
  assert.deepEqual(googleHubCapabilityRegistry.list().map(item => item.id), ['gmail','calendar','drive','docs','sheets','tasks','contacts','chat']);
});

test('Google Hub registry supports lookup and category filtering', () => {
  assert.equal(googleHubCapabilityRegistry.get('gmail')?.category, 'communication');
  assert.equal(googleHubCapabilityRegistry.has('tasks'), true);
  assert.deepEqual(googleHubCapabilityRegistry.listByCategory('communication').map(item => item.id), ['gmail']);
});

test('Google Hub registry rejects duplicate capability identifiers', () => {
  const registry = createGoogleHubCapabilityRegistry([]); registry.register(INITIAL_CAPABILITIES[0]);
  assert.throws(() => registry.register(INITIAL_CAPABILITIES[0]), /Google Hub capability already registered: gmail/);
});

test('Google Hub registry accepts a future capability without changing core code', () => {
  const registry = createGoogleHubCapabilityRegistry([]); registry.register(capability('meet'));
  assert.equal(registry.get('meet')?.name, 'Test Capability'); registry.unregister('meet'); assert.equal(registry.has('meet'), false);
});

test('Google Hub registry rejects malformed descriptors instead of silently accepting drift', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  assert.throws(() => registry.register(capability('')), /id must not be empty/);
  assert.throws(() => registry.register({ ...capability('future.calendar'), actions: [{ id: 'ask', label: 'Ask', kind: 'ask' as const }, { id: 'ask', label: 'Duplicate', kind: 'ask' as const }] }), /Duplicate Google Hub action: future.calendar.ask/);
  assert.throws(() => registry.register({ ...capability('future.docs'), actionRequirements: { search: ['docs'] } }), /has no declared action: future.docs.search/);
});

test('Google Hub module registry accepts and renders a future module independently', () => {
  const modules = createGoogleCapabilityModuleRegistry(); modules.register('future.meet', () => 'future-panel');
  const descriptor = capability('future.meet');
  assert.equal(modules.has('future.meet'), true);
  assert.equal(modules.render(descriptor, { descriptor, isGranted: () => false, askElara: () => undefined, recordActivity: () => undefined }), 'future-panel');
  modules.unregister('future.meet'); assert.equal(modules.has('future.meet'), false);
});

test('Google Hub module registry rejects duplicate factories and missing modules fail explicitly', () => {
  const modules = createGoogleCapabilityModuleRegistry(); modules.register('future.meet', () => 'one');
  assert.throws(() => modules.register('future.meet', () => 'two'), /Google capability module already registered: future.meet/);
  assert.throws(() => modules.render(capability('future.drive'), { descriptor: capability('future.drive'), isGranted: () => false, askElara: () => undefined, recordActivity: () => undefined }), /No Google capability module registered for future.drive/);
});

test('Google Hub capability descriptors cover the current UX actions', () => {
  const expected: Record<string, string[]> = {
    gmail: ['search','compose','send','open','ask'],
    calendar: ['upcoming','availability','create','open','ask'],
    drive: ['search','work-with','upload','open','ask'],
    docs: ['create','work-with','open','ask'],
    sheets: ['inspect','write','create','open','ask'],
    tasks: ['list','create','complete','open','ask'],
    contacts: ['search','open','ask'],
    chat: ['read','send','manage','open','ask'],
  };
  for (const [id, actionIds] of Object.entries(expected)) {
    const descriptor = googleHubCapabilityRegistry.get(id);
    assert.ok(descriptor, `Missing capability descriptor: ${id}`);
    assert.deepEqual(descriptor.actions.map(action => action.id), actionIds, `Unexpected actions for ${id}`);
  }
});
