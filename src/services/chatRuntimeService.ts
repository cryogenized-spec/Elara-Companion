import type {
  BackgroundRuntimeContract,
  GeminiHistoryMessage,
  GeminiRuntimeContract,
  GeminiStreamChunk,
} from '../contracts';

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
  googleToken?: string;
  signal?: AbortSignal;
  runtime: GeminiRuntimeContract;
  background: Pick<BackgroundRuntimeContract,
    'isEnabled' | 'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'
  >;
  onChunk: (chunk: GeminiStreamChunk) => void;
}

/**
 * Owns the model/background execution decision for Chat.
 * The Chat feature supplies a request and receives normalized runtime chunks;
 * provider-specific Gemini and durable-job mechanics stay behind this boundary.
 */
export async function executeChatRuntime(
  request: ChatRuntimeExecutionRequest,
): Promise<{ durable: boolean }> {
  if (request.background.isEnabled()) {
    const durableJob = await request.background.createChatJob({
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
    });

    request.background.persistJob({
      conversationId: request.conversationId,
      assistantMessageId: request.assistantMessageId,
      jobId: durableJob.id,
      createdAt: Date.now(),
    });

    const status = await request.background.waitForJob(durableJob.id);
    if (!['complete', 'completed'].includes(status.status)) {
      throw new Error(status.error ? String(status.error) : `Background execution ended with status ${status.status}.`);
    }

    const result = status.output?.result;
    request.onChunk({
      text: result?.text || '',
      finishReason: result?.finishReason || undefined,
      workspace: result?.workspace,
      artifactIds: [
        ...(result?.createdArtifactIds || []),
        ...(result?.modifiedArtifactIds || []),
      ],
    });
    request.background.removeJob(durableJob.id);
    return { durable: true };
  }

  await request.runtime.stream({
    apiKey: request.apiKey || '',
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
    googleToken: request.googleToken,
    signal: request.signal,
    onChunk: request.onChunk,
  });
  return { durable: false };
}
