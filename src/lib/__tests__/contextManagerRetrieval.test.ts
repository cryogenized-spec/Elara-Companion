import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { buildSystemPayload, setNextMemoryRetrievalQuery, clearNextMemoryRetrievalQuery } from '../contextManager';

const originalLocalStorage = (globalThis as any).localStorage;
const originalDocument = (globalThis as any).document;

function installBrowserStubs() {
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };
  (globalThis as any).document = {
    activeElement: { value: 'STALE DOM QUERY SHOULD NOT BE USED' },
    querySelector: () => ({ value: 'STALE DOM QUERY SHOULD NOT BE USED' }),
  };
}

afterEach(() => {
  clearNextMemoryRetrievalQuery();
  (globalThis as any).localStorage = originalLocalStorage;
  (globalThis as any).document = originalDocument;
});

describe('contextual memory integration', () => {
  it('uses authoritative runtime memory state and omits the legacy flat scratchpad', () => {
    installBrowserStubs();
    setNextMemoryRetrievalQuery('what was I doing with the roof?');

    const payload = buildSystemPayload({
      baseSystemInstruction: 'Base',
      personaProtocol: 'Persona',
      intimacyModule: 'Intimacy',
      runtimeRules: 'Runtime',
      activeModelId: 'gemini-3.7-flash',
      uiSettingsSummary: 'test',
      userProfileNotes: 'User profile',
      activeScratchpad: 'LEGACY SCRATCHPAD SHOULD NOT APPEAR',
      memoryState: {
        schemaVersion: 3,
        memories: [
          {
            id: 'core-1', content: 'User prefers concise technical explanations.', kind: 'preference', lifecycle: 'core', resolution: 'core', state: 'active',
            confidence: 'certain', importance: 'core', isPrivate: true, category: 'Preferences', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', reinforcementCount: 4, evidenceCount: 4,
          },
          {
            id: 'roof-1', content: 'User was painting the roof and was concerned about rain.', kind: 'observation', lifecycle: 'persistent', resolution: 'observation', state: 'active',
            confidence: 'likely', importance: 'normal', isPrivate: true, category: 'Home', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', lastObservedAt: '2026-08-21T00:00:00.000Z', evidenceCount: 2,
          },
        ],
      },
    });

    assert.match(payload, /\[RETRIEVED MEMORY CONTEXT\]/);
    assert.match(payload, /User was painting the roof/);
    assert.match(payload, /User prefers concise technical explanations/);
    assert.doesNotMatch(payload, /LEGACY SCRATCHPAD SHOULD NOT APPEAR/);
    assert.doesNotMatch(payload, /STALE DOM QUERY SHOULD NOT BE USED/);
  });
});
