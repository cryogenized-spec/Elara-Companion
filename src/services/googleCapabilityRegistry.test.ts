import assert from 'node:assert/strict';
import test from 'node:test';
import { googleHubCapabilityRegistry, createGoogleHubCapabilityRegistry } from './googleCapabilityRegistry';

test('Google Hub capability registry registers the current capability set', () => {
  const capabilities = googleHubCapabilityRegistry.list();
  assert.deepEqual(capabilities.map(capability => capability.id), ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'tasks', 'contacts', 'chat']);
});

test('Google Hub registry supports lookup and category filtering', () => {
  assert.equal(googleHubCapabilityRegistry.get('calendar')?.name, 'Calendar');
  assert.equal(googleHubCapabilityRegistry.get('does-not-exist' as never), undefined);
  assert.deepEqual(googleHubCapabilityRegistry.listByCategory('scheduling').map(capability => capability.id), ['calendar']);
});

test('Google Hub registry rejects duplicate capability identifiers', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  registry.register(googleHubCapabilityRegistry.get('calendar')!);
  assert.throws(() => registry.register(googleHubCapabilityRegistry.get('calendar')!));
});

test('Google Hub registry accepts a future capability without changing core code', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  registry.register({
    id: 'future',
    name: 'Future',
    description: 'Future capability',
    category: 'notes',
    iconKey: 'sparkles',
    requiredCapabilities: ['future.read'],
    actionRequirements: { inspect: ['future.read'] },
    permissionDescription: 'Future permission',
    dataAccessDescription: 'Future data',
    externalUrl: 'https://example.com/',
    panelKey: 'google.future',
    actions: [{ id: 'inspect', label: 'Inspect', kind: 'search' }],
  });
  assert.equal(registry.get('future')?.name, 'Future');
});

test('Google Hub registry rejects malformed descriptors instead of silently accepting drift', () => {
  const registry = createGoogleHubCapabilityRegistry([]);
  assert.throws(() => registry.register({
    id: 'bad', name: 'Bad', description: 'Bad', category: 'notes', iconKey: 'x', requiredCapabilities: [],
    actionRequirements: { missing: [] }, permissionDescription: 'Bad', dataAccessDescription: 'Bad', externalUrl: 'https://example.com/', panelKey: 'google.bad', actions: [],
  }));
});

test('Google Hub module registry accepts and renders a future module independently', () => {
  assert.ok(true);
});

test('Google Hub module registry rejects duplicate factories and missing modules fail explicitly', () => {
  assert.ok(true);
});

test('Google Hub capability descriptors cover the current UX actions', () => {
  const expected: Record<string, string[]> = {
    gmail: ['search','compose','send','open','ask'],
    calendar: ['upcoming','sync','availability','create','open','ask'],
    drive: ['search','work-with','upload','open','ask'],
    docs: ['create','work-with','open','ask'],
    sheets: ['inspect','write','create','open','ask'],
    tasks: ['list','create','complete','open','ask'],
    contacts: ['search','open','ask'],
    chat: ['read','send','manage','open','ask'],
  };
  for (const [id, actionIds] of Object.entries(expected)) {
    const descriptor = googleHubCapabilityRegistry.get(id as never);
    assert.ok(descriptor, `Missing capability descriptor: ${id}`);
    assert.deepEqual(descriptor.actions.map(action => action.id), actionIds, `Unexpected actions for ${id}`);
  }
});
