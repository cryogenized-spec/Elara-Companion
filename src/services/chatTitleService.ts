import { runDirectTitleGeneration } from '../lib/geminiDirectClient';

export interface ChatTitleRequest {
  apiKey?: string;
  userMessage: string;
  assistantResponse: string;
}

const GENERIC_TITLES = /^(new conversation|new chat|conversation|chat|discussion|untitled|general discussion|miscellaneous|a fresh thread)$/i;
const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'with', 'is', 'it', 'this', 'that', 'i', 'me', 'my', 'we', 'you', 'can', 'please', 'help', 'about']);

function normalizeThreadTitle(raw: string, fallbackSource: string): string {
  const cleaned = raw
    .replace(/^[\"'`]+|[\"'`]+$/g, '')
    .replace(/^(title|conversation title)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 3 && words.length <= 10 && !GENERIC_TITLES.test(cleaned)) return cleaned;

  const fallbackWords = fallbackSource
    .replace(/[#*`_>\[\]]/g, ' ')
    .replace(/[^\p{L}\p{N}'-]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word && !STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 10);

  const candidateWords = (words.length > 0 && !GENERIC_TITLES.test(cleaned) ? words : fallbackWords).slice(0, 10);
  const titleWords = candidateWords.length >= 3 ? candidateWords : [...candidateWords, 'New', 'Conversation'].slice(0, 3);
  return titleWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
    let title: string | null = null;
    if (apiKey?.trim()) {
      title = await runDirectTitleGeneration(apiKey.trim(), userMessage, assistantResponse);
    } else {
      const response = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstUserMessage: userMessage,
          firstAssistantResponse: assistantResponse,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        title = typeof data?.title === 'string' && data.title.trim() ? data.title.trim() : null;
      }
    }
    return normalizeThreadTitle(title || '', userMessage);
  } catch (error) {
    console.warn('Title generation skipped or offline:', error);
    return normalizeThreadTitle('', userMessage);
  }
}
