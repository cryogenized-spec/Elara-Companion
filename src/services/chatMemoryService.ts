import type { MemoryContract } from '../contracts';
import type { MemoryScratchpadState } from '../types';
import { runDirectMemoryExtraction } from '../lib/geminiDirectClient';

type ChatMemoryExtractionRequest = {
  apiKey?: string;
  userMessage: string;
  assistantResponse: string;
  memoryState: MemoryScratchpadState;
  userName: string;
  conversationId: string;
  memory: MemoryContract;
};

/**
 * Owns Chat's post-response memory extraction path.
 * Provider selection stays here; authoritative persistence stays behind MemoryContract.
 */
export async function extractAndPersistConversationMemory({
  apiKey,
  userMessage,
  assistantResponse,
  memoryState,
  userName,
  conversationId,
  memory,
}: ChatMemoryExtractionRequest): Promise<void> {
  if (!assistantResponse.trim()) return;

  try {
    const trimmedApiKey = apiKey?.trim();
    let actions: any[] = [];

    if (trimmedApiKey) {
      actions = await runDirectMemoryExtraction(
        trimmedApiKey,
        userMessage,
        assistantResponse,
        memoryState.memories,
        userName || 'User',
      );
    } else {
      const response = await fetch('/api/memory/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          assistantResponse,
          currentMemories: memoryState.memories,
          userName: userName || 'User',
        }),
      });

      const data = await response.json();
      actions = Array.isArray(data?.actions) ? data.actions : [];
    }

    if (actions.length === 0) return;

    const currentState = memory.getLoaded() ?? memoryState;
    const updatedState = memory.reduce(currentState, actions, conversationId);
    await memory.save(updatedState, conversationId);
  } catch (error) {
    console.warn('Background memory extraction notice:', error);
  }
}
