import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { MemoryScratchpadState } from '../../types';
import { applyMemoryActions } from '../memoryProcessor';
import { buildSystemPayload, MEMORY_CONTEXT_MIRROR_KEY, clearNextMemoryRetrievalQuery, setNextMemoryRetrievalQuery } from '../contextManager';
import { retrieveRelevantMemories } from '../memoryRetrieval';

const originalLocalStorage = (globalThis as any).localStorage;
const originalWindow = (globalThis as any).window;

function installBrowserStubs(): void {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  (globalThis as any).window = {
    dispatchEvent: () => true,
  };
}

function emptyState(): MemoryScratchpadState {
  return { schemaVersion: 3, memories: [] } as MemoryScratchpadState;
}

afterEach(() => {
  clearNextMemoryRetrievalQuery();
  (globalThis as any).localStorage = originalLocalStorage;
  (globalThis as any).window = originalWindow;
});

describe('memory lifecycle end-to-end', () => {
  it('flows observation -> reinforcement -> promotion -> retrieval -> prompt injection', () => {
    installBrowserStubs();
    let state = emptyState();
    const actions = [
      { type: 'ADD' as const, memory: { content: 'User prefers coffee in the morning.', kind: 'preference' as const, resolution: 'observation' as const, evidenceMemoryIds: [] } },
      { type: 'ADD' as const, memory: { content: 'User prefers coffee in the morning!', kind: 'preference' as const, resolution: 'observation' as const, evidenceMemoryIds: [] } },
      { type: 'ADD' as const, memory: { content: 'User prefers coffee in the morning before work.', kind: 'preference' as const, resolution: 'observation' as const, evidenceMemoryIds: [] } },
    ];

    for (const action of actions) state = applyMemoryActions(state, [action], 'conv-memory-e2e');

    const promoted = state.memories.find((memory) => memory.resolution === 'core' && memory.content.includes('prefers coffee'));
    assert.ok(promoted, 'repeated evidence should promote a preference to core');
    assert.ok((promoted.reinforcementCount || 0) >= 3, 'promotion should retain reinforcement evidence');

    const storedMirror = JSON.parse((globalThis as any).localStorage.getItem(MEMORY_CONTEXT_MIRROR_KEY) || '{}');
    assert.equal(storedMirror.schemaVersion, 3);
    assert.ok(Array.isArray(storedMirror.memories));

    setNextMemoryRetrievalQuery('What does the user prefer to drink in the morning?');
    const payload = buildSystemPayload({
      baseSystemInstruction: 'Base',
      personaProtocol: 'Persona',
      intimacyModule: 'Intimacy',
      runtimeRules: 'Runtime',
      activeModelId: 'gemini-test',
      uiSettingsSummary: 'test',
      userProfileNotes: '',
      activeScratchpad: 'LEGACY SHOULD NOT BE USED',
    });

    assert.match(payload, /\[RETRIEVED MEMORY CONTEXT\]/);
    assert.match(payload, /prefers coffee in the morning/);
    assert.doesNotMatch(payload, /LEGACY SHOULD NOT BE USED/);
  });

  it('detects contradictory preferences and excludes conflicted memories from retrieval by default', () => {
    installBrowserStubs();
    let state = emptyState();
    state = applyMemoryActions(state, [
      { type: 'ADD', memory: { content: 'User prefers coffee.', kind: 'preference' as const, resolution: 'observation' as const } },
      { type: 'ADD', memory: { content: 'User avoids coffee.', kind: 'preference' as const, resolution: 'observation' as const } },
    ], 'conv-conflict-e2e');

    const conflicted = state.memories.filter((memory) => memory.state === 'conflicted');
    assert.equal(conflicted.length, 2);
    assert.deepEqual(new Set(conflicted.map((memory) => memory.conflictMemoryIds?.length || 0)), new Set([1]));

    const retrieved = retrieveRelevantMemories(state.memories, 'coffee preference', { minimumScore: 0 });
    assert.equal(retrieved.some((result) => result.memory.state === 'conflicted'), false);
  });

  it('allows an old episode to regain retrieval relevance after being observed again', () => {
    const old = {
      id: 'old-roof',
      content: 'User worked on the roof repair.',
      kind: 'episode' as const,
      lifecycle: 'persistent' as const,
      source: 'conversation' as const,
      confidence: 'likely' as const,
      importance: 'normal' as const,
      isPrivate: true,
      category: 'Home',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      resolution: 'episodic' as const,
      state: 'active' as const,
      lastObservedAt: '2025-01-01T00:00:00.000Z',
    };
    const renewed = { ...old, lastObservedAt: '2026-08-21T12:00:00.000Z', updatedAt: '2026-08-21T12:00:00.000Z' };
    const query = 'roof repair';

    const oldResult = retrieveRelevantMemories([old], query, { now: new Date('2026-08-21T12:00:00.000Z'), minimumScore: 0 });
    const renewedResult = retrieveRelevantMemories([renewed], query, { now: new Date('2026-08-21T12:00:00.000Z'), minimumScore: 0 });

    assert.ok(renewedResult[0].score > oldResult[0].score);
    assert.ok(renewedResult[0].reasons.includes('recent'));
  });
});
