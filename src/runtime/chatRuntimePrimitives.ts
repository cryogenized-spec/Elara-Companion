import { parseRuntimeDataUrl } from './geminiRuntimeConfigService';

export const MAX_AGENT_ITERATIONS = 5;

export interface ChatHistoryMessage {
  role: string;
  content?: string;
  image?: string;
}

export { parseRuntimeDataUrl } from './geminiRuntimeConfigService';

export function buildConversationContents(
  history: ChatHistoryMessage[] = [],
  message?: string,
  image?: string,
) {
  const contents: any[] = [];
  for (const item of history) {
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
      if (parsed) parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
    parts.push({ text: message || 'Please look at this image and share your thoughts as Elara.' });
    contents.push({ role: 'user', parts });
  }
  return contents;
}
