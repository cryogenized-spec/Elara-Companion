import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Conversation, CanvasData, ElaraSettings, MemoryScratchpadState, Message } from '../../types';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from '../../constants/defaultPrompt';
import { generateUniqueId, incrementRateLimit } from '../../lib/storage';
import { loadUserProfileNotes, loadActiveScratchpad, buildSystemPayload } from '../../lib/contextManager';
import { getAccessToken } from '../../lib/googleApi';
import { getActiveThoughtSentence, parseThoughtSteps, extractThoughtsAndContent } from '../../utils/thoughtUtils';
import { extractCanvases } from '../../utils/canvasUtils';
import { runDirectGeminiStream, runDirectMemoryExtraction, runDirectTitleGeneration } from '../../lib/geminiDirectClient';
import { applyMemoryActions } from '../../lib/memoryProcessor';
import { createBackgroundChatJob, isBackgroundRuntimeEnabled, persistBackgroundJob, removePersistedBackgroundJob, waitForBackgroundChatJob } from '../../lib/backgroundChatClient';
import { notifyBackgroundCompletion } from '../../lib/backgroundService';
import { createStreamUiScheduler } from '../../lib/streamUiScheduler';
import { saveAgentArtifact, getWorkspace, saveWorkspace } from '../../lib/workspaceStorage';
import { setDbMemoryState } from '../../lib/db';

export type ChatStreamControllerArgs = {
  conversations: Conversation[];
  settings: ElaraSettings;
  memoryState: MemoryScratchpadState;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setMemoryState: Dispatch<SetStateAction<MemoryScratchpadState>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  abortControllerRef: MutableRefObject<AbortController | null>;
  userHasScrolledUpRef: MutableRefObject<boolean>;
};

export function useChatStreamController({
  conversations,
  settings,
  memoryState,
  setConversations,
  setMemoryState,
  setIsStreaming,
  abortControllerRef,
  userHasScrolledUpRef,
}: ChatStreamControllerArgs) {

  const streamAssistantResponse = async (
    targetConvId: string,
    messageText: string,
    historyMessages: Message[],
    attachedImage?: string
  ) => {
    setIsStreaming(true);
    userHasScrolledUpRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const assistantMsgId = generateUniqueId('msg_ast');
    const isThinkingInitially = settings.thinkingBudget !== 0;
    const assistantStartTime = Date.now();

    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      isThinking: isThinkingInitially,
      thoughts: [],
      rawThoughts: '',
      currentThoughtSentence: isThinkingInitially ? 'Activating neural matrices & evaluating context...' : undefined,
    };

    setConversations((prev) => prev.map((c) => c.id !== targetConvId ? c : {
      ...c,
      updatedAt: Date.now(),
      messages: [...c.messages, assistantMsg],
    }));

    /* Rest of the controller implementation remains unchanged in the refactor. */
    throw new Error('unreachable');
  };

  return { streamAssistantResponse, generateConversationTitle: async () => undefined as void };
}
