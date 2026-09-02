import type {
  BackgroundRuntimeContract,
  GeminiHistoryMessage,
  GeminiRuntimeContract,
  GeminiStreamChunk,
} from '../contracts';
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
  /** Deprecated client-side Gemini key retained only for call-site compatibility. */
  apiKey?: string;
  workspace?: import('../types').Workspace;
  signal?: AbortSignal;
  runtime: GeminiRuntimeContract;
  background: Pick<BackgroundRuntimeContract,
    'isEnabled' | 'isConfigured' | 'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'
  >;
  onChunk: (chunk: GeminiStreamChunk) => void;
  forceBackground?: boolean;
}

/**
 * Chat uses the durable Cloudflare background runtime whenever it is configured. This is
 * deliberate: a browser tab/app can be suspended or killed without completing an in-flight
 * request, so the only reliable closure-safe handoff is to queue the work before waiting for it.
 * When no background runtime is configured, foreground browser Gemini streaming remains available.
 */
export async function executeChatRuntime(request: ChatRuntimeExecutionRequest): Promise<{ durable: boolean }> {
  if (request.forceBackground || request.background.isEnabled() || request.background.isConfigured()) {
    if (!request.background.isConfigured()) throw new Error('Elara background runtime is not configured.');
    return executeBackgroundChatJob({
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
  }

  await request.runtime.stream({
    apiKey: request.apiKey || '',
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
    signal: request.signal,
    onChunk: request.onChunk,
  });
  return { durable: false };
}
