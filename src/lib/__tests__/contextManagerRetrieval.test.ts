import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { buildSystemPayload, MEMORY_CONTEXT_MIRROR_KEY } from '../contextManager';

const originalLocalStorage = (globalThis as any).localStorage;
const originalDocument = (globalThis as any).document;

function installBrowserStubs(query: string, memories: unknown[]) {
  const store = new Map<string, string>();
  store.set(MEMORY_CONTEXT_MIRROR_KEY, JSON.stringify({ schemaVersion: 3, memories }));
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  const textarea = { value: query } as HTMLTextAreaElement;
  (globalThis as any).document = {
    activeElement: textarea,
    querySelector: () => textarea,
  };
}

afterEach(() => {
  (globalThis as any).localStorage = originalLocalStorage;
  (globalThis as any).document = originalDocument;
});

describe('contextual memory integration', () => {
  it('injects relevant memory and omits the legacy flat scratchpad', () => {
    installBrowserStubs('what was I doing with the roof?', [
      {
        id: 'core-1', content: 'User prefers concise technical explanations.', kind: 'preference', lifecycle: 'core', resolution: 'core', state: 'active',
        confidence: 'certain', importance: 'core', isPrivate: true, category: 'Preferences', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', reinforcementCount: 4, evidenceCount: 4,
      },
      {
        id: 'roof-1', content: 'User was painting the roof and was concerned about rain.', kind: 'observation', lifecycle: 'persistent', resolution: 'observation', state: 'active',
        confidence: 'likely', importance: 'normal', isPrivate: true, category: 'Home', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', lastObservedAt: '2026-08-21T00:00:00.000Z', evidenceCount: 2,
      },
    ]);

    const payload = buildSystemPayload({
      baseSystemInstruction: 'Base',
      personaProtocol: 'Persona',
      intimacyModule: 'Intimacy',
      runtimeRules: 'Runtime',
      activeModelId: 'gemini-3.7-flash',
      uiSettingsSummary: 'test',
      userProfileNotes: 'User profile',
      activeScratchpad: 'LEGACY SCRATCHPAD SHOULD NOT APPEAR',
    });

    assert.match(payload, /\[RETRIEVED MEMORY CONTEXT\]/);
    assert.match(payload, /User was painting the roof/);
    assert.match(payload, /User prefers concise technical explanations/);
    assert.doesNotMatch(payload, /LEGACY SCRATCHPAD SHOULD NOT APPEAR/);
  });
});
