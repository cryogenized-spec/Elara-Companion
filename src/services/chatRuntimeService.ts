import type {
  BackgroundRuntimeContract,
  GeminiHistoryMessage,
  GeminiRuntimeContract,
  GeminiStreamChunk,
} from '../contracts';
import { googleContract } from '../contracts/implementations';
import { executeBackgroundChatJob } from './chatBackgroundService';

export interface ChatRuntimeExecutionRequest {
  conversationId: string;
  assistantMessageId: string;
  message: string;
  image?: string;
  history: GeminiHistoryMessage[];
  systemPrompt: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  thinkingBudget?: number;
  apiKey?: string;
  workspace?: import('../types').Workspace;
  signal?: AbortSignal;
  runtime: GeminiRuntimeContract;
  background: Pick<BackgroundRuntimeContract,
    'isEnabled' | 'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'
  >;
  onChunk: (chunk: GeminiStreamChunk) => void;
}

function normalizeBackendErrorText(raw: string, status: number): string {
  let text = raw;
  try {
    const parsed = JSON.parse(raw);
    text = parsed?.error?.message || parsed?.error || parsed?.message || 'API request failed';
  } catch {
    if (raw.trim().startsWith('<') || raw.includes('<html>')) {
      text = `Service unavailable (HTTP ${status})`;
    }
  }
  return text || `Server returned HTTP ${status}`;
}

async function streamBackendChat(
  request: ChatRuntimeExecutionRequest,
  googleToken: string,
): Promise<void> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: request.signal,
    body: JSON.stringify({
      message: request.message,
      image: request.image,
      history: request.history,
      systemPrompt: request.systemPrompt,
      model: request.model,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      topP: request.topP,
      topK: request.topK,
      thinkingBudget: request.thinkingBudget,
      workspace: request.workspace,
      googleToken,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Backend route not found. If hosting as a static GitHub Page, please enter your Gemini API Key in Settings.');
    }
    throw new Error(normalizeBackendErrorText(await response.text().catch(() => ''), response.status));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response stream not readable');

  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.error) throw new Error(data.error);
          request.onChunk({
            text: data.text,
            thoughtText: data.thoughtText,
            finishReason: data.finishReason,
            safetyRatings: data.safetyRatings,
            toolCall: data.toolCall,
            workspace: data.workspace,
            artifactIds: data.artifactIds,
          });
          if (data.done) return;
        } catch (error) {
          if (error instanceof Error && !error.message.includes('JSON')) throw error;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Owns the model/background execution choice for Chat.
 * Durable job choreography lives in chatBackgroundService; provider transport remains here.
 */
export async function executeChatRuntime(
  request: ChatRuntimeExecutionRequest,
): Promise<{ durable: boolean }> {
  const googleToken = googleContract.getAccessToken();

  if (request.background.isEnabled()) {
    const result = await executeBackgroundChatJob({
      conversationId: request.conversationId,
      assistantMessageId: request.assistantMessageId,
      request: {
        message: request.message,
        image: request.image,
        history: request.history.map((item) => ({
          role: item.role === 'model' ? 'assistant' : 'user',
          content: item.content,
          image: item.image,
        })),
        systemPrompt: request.systemPrompt,
        model: request.model,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
        topP: request.topP,
        topK: request.topK,
        workspace: request.workspace,
      },
      background: request.background,
      onChunk: request.onChunk,
    });
    return result;
  }

  if (request.apiKey?.trim()) {
    await request.runtime.stream({
      apiKey: request.apiKey.trim(),
      model: request.model,
      systemPrompt: request.systemPrompt,
      history: request.history,
      message: request.message,
      image: request.image,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      topP: request.topP,
      topK: request.topK,
      thinkingBudget: request.thinkingBudget,
      workspace: request.workspace,
      googleToken,
      signal: request.signal,
      onChunk: request.onChunk,
    });
    return { durable: false };
  }

  await streamBackendChat(request, googleToken);
  return { durable: false };
}
