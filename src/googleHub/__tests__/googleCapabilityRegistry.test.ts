import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoogleCapabilityScopes } from '../../lib/googleCapabilityPolicy';
import { GOOGLE_HUB_CAPABILITIES, GoogleCapabilityRegistry, createGoogleCapabilityRegistry } from '../index';

const workspace = () => createGoogleCapabilityRegistry();

test('default Google Hub registry contains the planned initial capabilities', () => {
  const registry = workspace();
  const ids = registry.getAll().map((capability) => capability.id);

  assert.deepEqual(ids, ['gmail', 'calendar', 'drive', 'docs', 'sheets', 'tasks', 'keep', 'contacts', 'chat']);
  assert.equal(new Set(ids).size, ids.length);
});

test('capabilities expose stable UI metadata without importing React', () => {
  for (const capability of GOOGLE_HUB_CAPABILITIES) {
    assert.equal(capability.version, 1);
    assert.equal(capability.provider, 'google');
    assert.ok(capability.name.length > 0);
    assert.ok(capability.category.length > 0);
    assert.ok(capability.panelKey.length > 0);
    assert.ok(capability.iconKey.length > 0);
  }
});

test('required scopes are derived from the canonical capability policy', () => {
  const registry = workspace();
  const gmailScopes = registry.getRequiredScopes('gmail');
  const chatScopes = registry.getRequiredScopes('chat');

  assert.deepEqual(gmailScopes, getGoogleCapabilityScopes('gmail.read'));
  assert.deepEqual(chatScopes, getGoogleCapabilityScopes('chat.read'));
});

test('authorization requires every permission group declared by a capability', () => {
  const registry = workspace();
  const calendarScopes = registry.getRequiredScopes('calendar');
  assert.equal(registry.isAuthorized('calendar', ''), false);
  assert.equal(registry.isAuthorized('calendar', calendarScopes[0]), true);
  assert.equal(registry.isAuthorized('missing', calendarScopes[0]), false);
});

test('mutation actions declare their stronger capabilities and confirmation policy', () => {
  const registry = workspace();
  const gmailSend = registry.get('gmail')?.actions.find((action) => action.id === 'gmail.send');
  const calendarCreate = registry.get('calendar')?.actions.find((action) => action.id === 'calendar.create');

  assert.deepEqual(gmailSend?.requiredCapabilities, ['gmail.send']);
  assert.equal(gmailSend?.effect, 'external-write');
  assert.equal(gmailSend?.confirmation, 'user');
  assert.deepEqual(calendarCreate?.requiredCapabilities, ['calendar.write']);
  assert.equal(calendarCreate?.confirmation, 'user');
});

test('registry rejects duplicate capability ids and globally duplicate action ids', () => {
  const registry = new GoogleCapabilityRegistry();
  const base = GOOGLE_HUB_CAPABILITIES[0];

  registry.register(base);
  assert.throws(() => registry.register(base), /already registered/);
  assert.throws(
    () => registry.register({
      ...GOOGLE_HUB_CAPABILITIES[1],
      actions: [{ ...GOOGLE_HUB_CAPABILITIES[1].actions[0], id: base.actions[0].id }],
    }),
    /already owned/,
  );
});

test('registry rejects unmapped policy capabilities instead of silently accepting drift', () => {
  const registry = new GoogleCapabilityRegistry();
  assert.throws(
    () => registry.register({
      id: 'broken',
      version: 1,
      provider: 'google',
      name: 'Broken',
      description: 'Invalid test capability.',
      category: 'test',
      iconKey: 'bug',
      panelKey: 'broken',
      authorization: { mode: 'capability', requiredCapabilities: ['not-a-real-capability' as never] },
      actions: [],
    }),
    /unmapped capability/,
  );
});
