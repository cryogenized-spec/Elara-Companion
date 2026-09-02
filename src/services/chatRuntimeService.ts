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
    'isEnabled' | 'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'
  >;
  onChunk: (chunk: GeminiStreamChunk) => void;
}

/**
 * Foreground execution stays in the browser for immediate streaming. Background execution
 * is durable and is selected by the controller when the app cannot safely remain foreground.
 */
export async function executeChatRuntime(request: ChatRuntimeExecutionRequest): Promise<{ durable: boolean }> {
  if (request.background.isEnabled()) {
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

  await request.runtime.generateContentStream({
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
