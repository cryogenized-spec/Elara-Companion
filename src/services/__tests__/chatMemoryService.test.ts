import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAndPersistConversationMemory } from '../chatMemoryService';
import type { MemoryContract } from '../../contracts';
import type { MemoryScratchpadState } from '../../types';

function createMemoryContract(initial: MemoryScratchpadState) {
  let loaded = initial;
  let savedConversationId: string | undefined;
  let savedState: MemoryScratchpadState | null = null;

  const contract: MemoryContract = {
    async load() {
      return loaded;
    },
    async save(state, conversationId) {
      loaded = state;
      savedState = state;
      savedConversationId = conversationId;
    },
    getLoaded() {
      return loaded;
    },
    reduce(state, actions, conversationId) {
      return {
        ...state,
        memories: [
          ...state.memories,
          ...actions.map((action) => ({
            id: `memory-${state.memories.length + 1}`,
            ...action.memory,
            conversationId,
          } as any)),
        ],
      };
    },
  };

  return {
    contract,
    getSaved() {
      return { state: savedState, conversationId: savedConversationId };
    },
  };
}

test('memory extraction loads current authoritative state from MemoryContract', async () => {
  const originalFetch = globalThis.fetch;
  const authoritativeState = {
    memories: [{ id: 'existing', content: 'Authoritative memory' }],
  } as unknown as MemoryScratchpadState;
  const { contract, getSaved } = createMemoryContract(authoritativeState);

  globalThis.fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body));
    assert.deepEqual(payload.currentMemories, authoritativeState.memories);
    return new Response(JSON.stringify({
      actions: [{
        type: 'CREATE',
        memory: { content: 'The user is working on Elara.' },
      }],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await extractAndPersistConversationMemory({
      userMessage: 'I am working on Elara.',
      assistantResponse: 'That sounds good.',
      userName: 'User',
      conversationId: 'conv_43',
      memory: contract,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  const saved = getSaved();
  assert.equal(saved.conversationId, 'conv_43');
  assert.equal(saved.state?.memories.length, 2);
  assert.equal((saved.state?.memories[1] as any).content, 'The user is working on Elara.');
});
