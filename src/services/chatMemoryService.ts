import type { MemoryContract } from '../contracts';
import { runDirectMemoryExtraction } from '../lib/geminiDirectClient';

type ChatMemoryExtractionRequest = {
  apiKey?: string;
  userMessage: string;
  assistantResponse: string;
  userName: string;
  conversationId: string;
  memory: MemoryContract;
};

/**
 * Owns Chat's post-response memory extraction path.
 * Provider selection stays here; authoritative state and persistence stay behind MemoryContract.
 */
export async function extractAndPersistConversationMemory({
  apiKey,
  userMessage,
  assistantResponse,
  userName,
  conversationId,
  memory,
}: ChatMemoryExtractionRequest): Promise<void> {
  if (!assistantResponse.trim()) return;

  try {
    const trimmedApiKey = apiKey?.trim();
    const currentState = await memory.load();
    let actions: any[] = [];

    if (trimmedApiKey) {
      actions = await runDirectMemoryExtraction(
        trimmedApiKey,
        userMessage,
        assistantResponse,
        currentState.memories,
        userName || 'User',
      );
    } else {
      const response = await fetch('/api/memory/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          assistantResponse,
          currentMemories: currentState.memories,
          userName: userName || 'User',
        }),
      });

      const data = await response.json();
      actions = Array.isArray(data?.actions) ? data.actions : [];
    }

    if (actions.length === 0) return;

    const updatedState = memory.reduce(currentState, actions, conversationId);
    await memory.save(updatedState, conversationId);
  } catch (error) {
    console.warn('Background memory extraction notice:', error);
  }
}
