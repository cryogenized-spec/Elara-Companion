import { runDirectTitleGeneration } from '../lib/geminiDirectClient';

export interface ChatTitleRequest {
  apiKey?: string;
  userMessage: string;
  assistantResponse: string;
}

/**
 * Owns Chat conversation-title provider selection and transport.
 * The Chat feature receives a title result; it does not know which provider produced it.
 */
export async function generateChatConversationTitle({
  apiKey,
  userMessage,
  assistantResponse,
}: ChatTitleRequest): Promise<string | null> {
  try {
    if (apiKey?.trim()) {
      return await runDirectTitleGeneration(apiKey.trim(), userMessage, assistantResponse);
    }

    const response = await fetch('/api/chat/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstUserMessage: userMessage,
        firstAssistantResponse: assistantResponse,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.title === 'string' && data.title.trim() ? data.title.trim() : null;
  } catch (error) {
    console.warn('Title generation skipped or offline:', error);
    return null;
  }
}
