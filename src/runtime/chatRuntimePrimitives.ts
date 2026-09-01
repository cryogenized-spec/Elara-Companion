import { parseRuntimeDataUrl } from './geminiRuntimeConfigService';

export const MAX_AGENT_ITERATIONS = 5;
export const MAX_HISTORY_CHARACTERS = 32000;
export const MAX_HISTORY_MESSAGES = 16;
export const MAX_MESSAGE_CHARACTERS = 6000;

export interface ChatHistoryMessage {
  role: string;
  content?: string;
  image?: string;
}

export { parseRuntimeDataUrl } from './geminiRuntimeConfigService';

function trimMessageContent(content: string): string {
  if (content.length <= MAX_MESSAGE_CHARACTERS) return content;
  return `${content.slice(0, MAX_MESSAGE_CHARACTERS)}\n[…older content omitted to preserve context…]`;
}

function boundHistory(history: ChatHistoryMessage[]): ChatHistoryMessage[] {
  if (history.length === 0) return [];
  const firstUserIndex = history.findIndex((item) => item.role === 'user');
  const selected: { item: ChatHistoryMessage; index: number; cost: number }[] = [];
  let remaining = MAX_HISTORY_CHARACTERS;

  if (firstUserIndex >= 0) {
    const first = history[firstUserIndex];
    const content = first.content ? trimMessageContent(first.content) : '';
    const cost = content.length + (first.image ? 1200 : 0);
    selected.push({ item: { ...first, ...(content ? { content } : {}) }, index: firstUserIndex, cost });
    remaining -= cost;
  }

  for (let index = history.length - 1; index >= 0 && selected.length < MAX_HISTORY_MESSAGES && remaining > 0; index--) {
    if (index === firstUserIndex) continue;
    const item = history[index];
    const content = item.content ? trimMessageContent(item.content) : '';
    if (!content && !item.image) continue;
    const cost = content.length + (item.image ? 1200 : 0);
    if (cost > remaining && selected.length > 1) continue;
    selected.push({ item: { ...item, ...(content ? { content } : {}) }, index, cost });
    remaining -= cost;
  }

  return selected.sort((a, b) => a.index - b.index).map(({ item }) => item);
}

export function buildConversationContents(
  history: ChatHistoryMessage[] = [],
  message?: string,
  image?: string,
) {
  const contents: any[] = [];
  for (const item of boundHistory(history)) {
    const parts: any[] = [];
    if (item.image) {
      const parsed = parseRuntimeDataUrl(item.image);
      if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
    if (item.content) parts.push({ text: item.content });
    if (parts.length) contents.push({ role: item.role === 'assistant' ? 'model' : 'user', parts });
  }

  if (message || image) {
    const parts: any[] = [];
    if (image) {
      const parsed = parseRuntimeDataUrl(image);
      if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data });
    }
    parts.push({ text: message || 'Please look at this image and share your thoughts as Elara.' });
    contents.push({ role: 'user', parts });
  }
  return contents;
}
