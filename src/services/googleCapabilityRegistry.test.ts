import { describe, expect, it } from 'vitest';
import {
  createGoogleHubCapabilityRegistry,
  googleHubCapabilityRegistry,
  INITIAL_CAPABILITIES,
} from './googleCapabilityRegistry';

describe('Google Hub capability registry', () => {
  it('registers the current Google capability set', () => {
    const ids = googleHubCapabilityRegistry.list().map((capability) => capability.id);

    expect(ids).toEqual([
      'gmail',
      'calendar',
      'drive',
      'docs',
      'sheets',
      'tasks',
      'keep',
      'contacts',
      'chat',
    ]);
  });

  it('supports lookup and category filtering without knowing provider internals', () => {
    expect(googleHubCapabilityRegistry.get('gmail')?.category).toBe('communication');
    expect(googleHubCapabilityRegistry.has('tasks')).toBe(true);
    expect(googleHubCapabilityRegistry.listByCategory('communication').map((item) => item.id)).toEqual(['gmail']);
  });

  it('rejects duplicate capability identifiers', () => {
    const registry = createGoogleHubCapabilityRegistry([]);
    registry.register(INITIAL_CAPABILITIES[0]);

    expect(() => registry.register(INITIAL_CAPABILITIES[0])).toThrow(
      'Google Hub capability already registered: gmail',
    );
  });

  it('allows independently supplied capability modules to be registered', () => {
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

    expect(registry.get('tasks')?.panelKey).toBe('test.tasks');
    registry.unregister('tasks');
    expect(registry.has('tasks')).toBe(false);
  });

  it('keeps consequential actions explicit', () => {
    const gmail = googleHubCapabilityRegistry.get('gmail');
    const actionKinds = gmail?.actions.map((action) => action.kind) ?? [];

    expect(actionKinds).toContain('search');
    expect(actionKinds).toContain('open');
    expect(actionKinds).toContain('ask');
    expect(actionKinds).not.toContain('send');
  });
});
