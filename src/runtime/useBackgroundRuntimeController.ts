import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Conversation } from '../types';
import { backgroundRuntimeService } from '../services/backgroundRuntimeService';
import { notifyBackgroundCompletion } from '../lib/backgroundService';

const TERMINAL_SUCCESS_STATUSES = new Set(['complete', 'completed']);
const TERMINAL_FAILURE_STATUSES = new Set(['errored', 'failed', 'terminated']);

export type BackgroundRuntimeControllerArgs = {
  isLoaded: boolean;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
};

export function useBackgroundRuntimeController({ isLoaded, setConversations }: BackgroundRuntimeControllerArgs) {
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    const reconcileConversationMessage = (
      job: { conversationId: string; assistantMessageId: string },
      status: Awaited<ReturnType<typeof backgroundRuntimeService.waitForJob>>,
    ) => {
      if (cancelled) return;
      const succeeded = TERMINAL_SUCCESS_STATUSES.has(status.status);
      const failed = TERMINAL_FAILURE_STATUSES.has(status.status);
      if (!succeeded && !failed) return;

      const text = status.output?.result?.text || '';
      setConversations((prev) => prev.map((conversation) => {
        if (conversation.id !== job.conversationId) return conversation;
        return {
          ...conversation,
          updatedAt: Date.now(),
          messages: conversation.messages.map((message) => {
            if (message.id !== job.assistantMessageId) return message;
            return succeeded
              ? { ...message, content: text, isStreaming: false, isThinking: false, backgroundJobId: undefined }
              : { ...message, isStreaming: false, isThinking: false, isError: true, errorMessage: 'Background execution failed. Please retry.', backgroundJobId: undefined };
          }),
        };
      }));
    };

    const resumeJobs = async () => {
      const jobs = backgroundRuntimeService.loadPersistedJobs();
      for (const job of jobs) {
        try {
          const status = await backgroundRuntimeService.waitForJob(job.jobId);
          const terminal = TERMINAL_SUCCESS_STATUSES.has(status.status) || TERMINAL_FAILURE_STATUSES.has(status.status);
          if (!terminal) continue;

          reconcileConversationMessage(job, status);
          backgroundRuntimeService.removeJob(job.jobId);

          if (!cancelled && TERMINAL_SUCCESS_STATUSES.has(status.status)) {
            const text = status.output?.result?.text || '';
            void notifyBackgroundCompletion('Elara finished', text.slice(0, 160) || 'Your background response is ready.');
          }
        } catch (error) {
          console.warn('Durable background job resume deferred:', error);
        }
      }
    };

    void resumeJobs();
    return () => { cancelled = true; };
  }, [isLoaded, setConversations]);
}
