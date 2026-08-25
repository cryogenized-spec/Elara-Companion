import type {
  BackgroundChatJobRequest,
  BackgroundJobStatus,
  BackgroundRuntimeContract,
  GeminiStreamChunk,
} from '../contracts';
import { publishApplicationEvent } from '../events/applicationEventBus';

export interface ChatBackgroundExecutionRequest {
  conversationId: string;
  assistantMessageId: string;
  request: BackgroundChatJobRequest;
  background: Pick<BackgroundRuntimeContract,
    'createChatJob' | 'persistJob' | 'waitForJob' | 'removeJob'
  >;
  onChunk: (chunk: GeminiStreamChunk) => void;
}

function assertCompleted(status: BackgroundJobStatus): NonNullable<BackgroundJobStatus['output']>['result'] {
  if (!['complete', 'completed'].includes(status.status)) {
    throw new Error(
      status.error
        ? String(status.error)
        : `Background execution ended with status ${status.status}.`,
    );
  }
  return status.output?.result;
}

/**
 * Owns the durable Chat background-job lifecycle.
 * ChatRuntime delegates here instead of implementing persistence/recovery choreography itself.
 */
export async function executeBackgroundChatJob({
  conversationId,
  assistantMessageId,
  request,
  background,
  onChunk,
}: ChatBackgroundExecutionRequest): Promise<{ durable: true }> {
  const durableJob = await background.createChatJob(request);

  background.persistJob({
    conversationId,
    assistantMessageId,
    jobId: durableJob.id,
    createdAt: Date.now(),
  });

  const status = await background.waitForJob(durableJob.id);
  const result = assertCompleted(status);

  onChunk({
    text: result?.text || '',
    finishReason: result?.finishReason || undefined,
    workspace: result?.workspace,
    artifactIds: [
      ...(result?.createdArtifactIds || []),
      ...(result?.modifiedArtifactIds || []),
    ],
  });

  background.removeJob(durableJob.id);
  publishApplicationEvent({
    type: 'background.job.completed',
    payload: {
      jobId: durableJob.id,
      conversationId,
      status: status.status,
    },
  });

  return { durable: true };
}
