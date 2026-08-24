import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Conversation } from '../types';
import { loadPersistedBackgroundJobs, removePersistedBackgroundJob, waitForBackgroundChatJob } from '../lib/backgroundChatClient';
import { notifyBackgroundCompletion } from '../lib/backgroundService';

export type BackgroundRuntimeControllerArgs = {
  isLoaded: boolean;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
};

export function useBackgroundRuntimeController({ isLoaded, setConversations }: BackgroundRuntimeControllerArgs) {
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    const resumeJobs = async () => {
      const jobs = loadPersistedBackgroundJobs();
      for (const job of jobs) {
        try {
          const status = await waitForBackgroundChatJob(job.jobId);
          if (cancelled) return;
          if (['complete', 'completed'].includes(status.status)) {
            const text = status.output?.result?.text || '';
            setConversations((prev) => prev.map((c) => c.id !== job.conversationId ? c : ({
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) => m.id === job.assistantMessageId ? { ...m, content: text, isStreaming: false, isThinking: false, backgroundJobId: undefined } : m),
            })));
            removePersistedBackgroundJob(job.conversationId);
            void notifyBackgroundCompletion('Elara finished', text.slice(0, 160) || 'Your background response is ready.');
          } else if (['errored', 'failed', 'terminated'].includes(status.status)) {
            setConversations((prev) => prev.map((c) => c.id !== job.conversationId ? c : ({
              ...c,
              messages: c.messages.map((m) => m.id === job.assistantMessageId ? { ...m, isStreaming: false, isThinking: false, isError: true, errorMessage: 'Background execution failed. Please retry.', backgroundJobId: undefined } : m),
            })));
            removePersistedBackgroundJob(job.conversationId);
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
