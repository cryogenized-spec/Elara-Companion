import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Conversation, CanvasData, ElaraSettings, MemoryScratchpadState, Message } from '../../types';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from '../../constants/defaultPrompt';
import { incrementRateLimit } from '../../lib/storage';
import { loadUserProfileNotes, loadActiveScratchpad, buildSystemPayload } from '../../lib/contextManager';
import { getActiveThoughtSentence, parseThoughtSteps, extractThoughtsAndContent } from '../../utils/thoughtUtils';
import { extractCanvases } from '../../utils/canvasUtils';
import { runDirectMemoryExtraction, runDirectTitleGeneration } from '../../lib/geminiDirectClient';
import { applyMemoryActions } from '../../lib/memoryProcessor';
import { createStreamUiScheduler } from '../../lib/streamUiScheduler';
import { saveAgentArtifact, getWorkspace, saveWorkspace } from '../../lib/workspaceStorage';
import { geminiRuntimeContract, backgroundRuntimeContract } from '../../contracts/implementations';
import { executeChatRuntime } from '../../services/chatRuntimeService';
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

    // Create abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Create Assistant Placeholder Message
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
      currentThoughtSentence: isThinkingInitially
        ? 'Activating neural matrices & evaluating context...'
        : undefined,
    };

    // Add assistant message to conversation
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== targetConvId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          messages: [...c.messages, assistantMsg],
        };
      })
    );

    const baseSystemInstruction = settings.systemPrompt.replaceAll(
      '[[user]]',
      settings.userName || 'User'
    );

    const activeModelId = settings.model || 'gemini-3.7-flash';
    const uiSettingsSummary = `Theme: ${settings.theme}, User: ${settings.userName || 'User'}, Timezone: ${settings.timezone}`;

    const userProfileNotes = loadUserProfileNotes();
    const activeScratchpad = loadActiveScratchpad();

    // Live Google data is agent-selected through the canonical tool registry.

    const formattedSystemPrompt = buildSystemPayload({
      baseSystemInstruction,
      personaProtocol: settings.personaProtocol || DEFAULT_PERSONA_PROTOCOL,
      intimacyModule: settings.intimacyModule || DEFAULT_INTIMACY_MODULE,
      runtimeRules: settings.runtimeRules || DEFAULT_RUNTIME_RULES,
      activeModelId,
      uiSettingsSummary,
      userProfileNotes,
      activeScratchpad,
    });

    // Filter history if enabled
    const historyPayload = settings.includeHistory
      ? historyMessages.map((m) => {
          let reconstructedContent = m.content;
          if (m.canvases && m.canvases.length > 0) {
            reconstructedContent += '\n\n' + m.canvases.map(c => `<canvas title="${c.title}">\n${c.content}\n</canvas>`).join('\n\n');
          }
          return {
            role: m.role,
            content: reconstructedContent,
            image: m.image,
          };
        })
      : [];

    let accumulatedText = '';
    let streamedThoughts = '';

    let lastChunkTime = Date.now();
    let isDone = false;
    let durableJobAccepted = false;

    const streamUiScheduler = createStreamUiScheduler<Partial<Message>>((patch) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const msgs = c.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, ...patch } : m
          );
          return { ...c, messages: msgs };
        })
      );
    });

    // Watchdog interval to catch stalled background processes on mobile
    const WATCHDOG_TIMEOUT_MS = 20000;
    const watchdogInterval = setInterval(() => {
      if (isDone) {
        clearInterval(watchdogInterval);
        return;
      }
      if (Date.now() - lastChunkTime > WATCHDOG_TIMEOUT_MS) {
        console.warn('Stream watchdog timeout: No chunks received in 20s. Aborting.');
        controller.abort(new Error('Connection lost or timed out in background.'));
        clearInterval(watchdogInterval);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isDone) {
        if (Date.now() - lastChunkTime > WATCHDOG_TIMEOUT_MS) {
          console.warn('Stream stale after waking up from background. Aborting.');
          controller.abort(new Error('Connection lost while in background.'));
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const streamArtifactIds: string[] = [];

    const handleChunkArrival = (chunk: {
      text?: string;
      thoughtText?: string;
      finishReason?: string;
      safetyRatings?: any;
      toolCall?: any;
      workspace?: any;
      artifactIds?: string[];
    }) => {
      lastChunkTime = Date.now();

      if (chunk.toolCall?.workspace) {
        saveWorkspace(chunk.toolCall.workspace);
      }
      if (chunk.toolCall?.createdArtifactId) {
        streamArtifactIds.push(chunk.toolCall.createdArtifactId);
      }
      if (chunk.toolCall?.modifiedArtifactId) {
        streamArtifactIds.push(chunk.toolCall.modifiedArtifactId);
      }
      if (chunk.workspace) {
        saveWorkspace(chunk.workspace);
      }
      if (chunk.artifactIds && Array.isArray(chunk.artifactIds)) {
        streamArtifactIds.push(...chunk.artifactIds);
      }

      if (chunk.finishReason === 'SAFETY') {
        console.warn('[Gemini Safety Cutoff Triggered]', {
          finishReason: chunk.finishReason,
          safetyRatings: chunk.safetyRatings,
        });
        const cutoffNotice = '\n\n⚠️ *(Response ended early due to API content guardrails)*';
        if (!accumulatedText.includes('Response ended early due to API content guardrails')) {
          accumulatedText += cutoffNotice;
        }
      } else if (chunk.finishReason === 'MAX_TOKENS') {
        console.info('[Gemini Max Tokens Reached]', {
          finishReason: chunk.finishReason,
        });
      }

      if (chunk.text) {
        accumulatedText += chunk.text;
      }

      let combinedThoughts = streamedThoughts;
      let finalCleanContent = '';
      let canvases: CanvasData[] = [];
      let isThinking = false;

      if (accumulatedText || chunk.finishReason === 'SAFETY' || chunk.toolCall || (chunk.artifactIds && chunk.artifactIds.length > 0) || chunk.thoughtText) {
        const extracted = extractThoughtsAndContent(accumulatedText, streamedThoughts);
        combinedThoughts = extracted.combinedThoughts;
        const canvasResult = extractCanvases(extracted.cleanContent);
        finalCleanContent = canvasResult.cleanContent;
        canvases = canvasResult.canvases;
        isThinking = extracted.isInsideThoughtTag || (finalCleanContent.length === 0 && Boolean(streamedThoughts));
      }

      if (chunk.thoughtText) {
        streamedThoughts += chunk.thoughtText;
        combinedThoughts = streamedThoughts;
        const activeSentence = getActiveThoughtSentence(streamedThoughts);
        const thoughtSteps = parseThoughtSteps(streamedThoughts);

        streamUiScheduler.enqueue({
          isThinking: true,
          rawThoughts: streamedThoughts,
          currentThoughtSentence: activeSentence,
          thoughts: thoughtSteps,
          thoughtDurationMs: Date.now() - assistantStartTime,
          artifactIds: Array.from(new Set(streamArtifactIds)),
        });
      }

      if (chunk.text || chunk.finishReason === 'SAFETY' || chunk.toolCall || (chunk.artifactIds && chunk.artifactIds.length > 0)) {
        const activeSentence = getActiveThoughtSentence(combinedThoughts);
        const thoughtSteps = parseThoughtSteps(combinedThoughts);
        isThinking = extractedIsThinkingSafe(combinedThoughts, finalCleanContent, isThinking);

        streamUiScheduler.enqueue({
          content: finalCleanContent,
          canvases,
          artifactIds: Array.from(new Set(streamArtifactIds)),
          isThinking,
          rawThoughts: combinedThoughts,
          currentThoughtSentence: activeSentence,
          thoughts: thoughtSteps,
          thoughtDurationMs: Date.now() - assistantStartTime,
        });
      }
    };

    function extractedIsThinkingSafe(combinedThoughts: string, cleanContent: string, fallback: boolean): boolean {
      if (!combinedThoughts) return false;
      return fallback || (cleanContent.length === 0 && Boolean(combinedThoughts));
    }

    try {
      // Increment API rate limit
      incrementRateLimit(settings.model || 'gemini-3.7-flash');

      // Runtime execution is owned by the application runtime boundary.
      const runtimeResult = await executeChatRuntime({
        conversationId: targetConvId,
        assistantMessageId: assistantMsgId,
        message: messageText,
        image: attachedImage,
        history: historyPayload,
        systemPrompt: formattedSystemPrompt,
        model: settings.model || 'gemini-3.7-flash',
        temperature: settings.temperature,
        maxOutputTokens: settings.maxOutputTokens,
        topP: settings.topP,
        topK: settings.topK,
        thinkingBudget: settings.thinkingBudget,
        apiKey: settings.apiKey?.trim(),
        workspace: getWorkspace(),
        signal: controller.signal,
        runtime: geminiRuntimeContract,
        background: backgroundRuntimeContract,
        onChunk: handleChunkArrival,
      });
      durableJobAccepted = runtimeResult.durable;

      isDone = true;
      clearInterval(watchdogInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      streamUiScheduler.flush();

      // Mark streaming and thinking completed & finalize structured steps
      let { cleanContent, combinedThoughts } = extractThoughtsAndContent(
        accumulatedText,
        streamedThoughts
      );
      const { cleanContent: finalCleanContent, canvases } = extractCanvases(cleanContent);
      const finalSteps = parseThoughtSteps(combinedThoughts);

      // TRANSITIONAL BRIDGE: Persist agent-generated canvases to WorkspaceArtifact
      const persistedCanvases = canvases && canvases.length > 0
        ? canvases.map((c) => {
            const artifact = saveAgentArtifact(c.title || 'Canvas Document', c.content, 'markdown', c.artifactId);
            return {
              ...c,
              artifactId: artifact.id,
            };
          })
        : [];

      const combinedFinalArtifactIds = Array.from(
        new Set([
          ...streamArtifactIds,
          ...persistedCanvases.map((pc) => pc.artifactId!).filter(Boolean),
        ])
      );

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const msgs = c.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: finalCleanContent,
                  canvases: persistedCanvases,
                  artifactIds: combinedFinalArtifactIds,
                  isStreaming: false,
                  isThinking: false,
                  rawThoughts: combinedThoughts,
                  thoughts: finalSteps,
                  thoughtDurationMs: Date.now() - assistantStartTime,
                }
              : m
          );
          return { ...c, messages: msgs };
        })
      );

      // Automatically generate a conversation title if it's new
      const targetConv = conversations.find((c) => c.id === targetConvId);
      if (
        targetConv &&
        (targetConv.title === 'New Conversation' || targetConv.messages.length <= 2)
      ) {
        generateConversationTitle(targetConvId, messageText, accumulatedText);
      }

      // Autonomous Background Long-Term Memory Extraction
      if (accumulatedText && accumulatedText.trim()) {
        if (settings.apiKey && settings.apiKey.trim()) {
          runDirectMemoryExtraction(
            settings.apiKey.trim(),
            messageText,
            accumulatedText,
            memoryState.memories,
            settings.userName || 'User'
          ).then((actions) => {
            if (actions && Array.isArray(actions) && actions.length > 0) {
              setMemoryState((prev) => {
                const updated = applyMemoryActions(prev, actions, targetConvId);
                setDbMemoryState(updated);
                return updated;
              });
            }
          });
        } else {
          fetch('/api/memory/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMessage: messageText,
              assistantResponse: accumulatedText,
              currentMemories: memoryState.memories,
              userName: settings.userName || 'User',
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
                setMemoryState((prev) => {
                  const updated = applyMemoryActions(prev, data.actions, targetConvId);
                  setDbMemoryState(updated);
                  return updated;
                });
              }
            })
            .catch((err) => console.warn('Background memory extraction notice:', err));
        }
      }

    } catch (err: any) {
      if (durableJobAccepted) {
        console.error('Durable background execution failed after acceptance:', err);
      }
      streamUiScheduler.flush();
      if (err.name === 'AbortError' && !err.message?.includes('Connection lost')) {
        console.log('Stream generation stopped by user');
      } else {
        console.error('Streaming error:', err);
        let userFacingError = err?.message || 'Failed to connect to Gemini API.';
        try {
          if (userFacingError.includes('{') && userFacingError.includes('}')) {
            const start = userFacingError.indexOf('{');
            const end = userFacingError.lastIndexOf('}');
            const parsed = JSON.parse(userFacingError.slice(start, end + 1));
            const inner = parsed?.error || parsed;
            if (inner?.message) {
              if (typeof inner.message === 'string' && inner.message.includes('{')) {
                const nestedParsed = JSON.parse(inner.message);
                userFacingError = nestedParsed?.error?.message || inner.message;
              } else {
                userFacingError = inner.message;
              }
            }
          }
        } catch (_) {}

        const currentSelectedModel = settings.model || 'gemini-3.7-flash';
        if (userFacingError.startsWith('⚠️') || userFacingError.includes('HTTP 429') || userFacingError.includes('HTTP 503')) {
        } else if (userFacingError.includes('Connection lost')) {
          userFacingError = `⚠️ ${userFacingError} Please check your connection and retry.`;
        } else if (userFacingError.includes('Quota exceeded') || userFacingError.includes('429') || userFacingError.includes('RESOURCE_EXHAUSTED')) {
          userFacingError = `⚠️ API Call Rate Exceeded (HTTP 429): Quota limit reached for [${currentSelectedModel}]. Please wait a moment or manually select a different model.`;
        } else if (userFacingError.includes('503') || userFacingError.includes('UNAVAILABLE')) {
          userFacingError = `⚠️ Service Unavailable (HTTP 503): High demand or temporary service interruption for [${currentSelectedModel}]. Please wait a moment or select a different model.`;
        }

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    isThinking: false,
                    isError: true,
                    errorMessage: userFacingError,
                  }
                : m
            );
            return { ...c, messages: msgs };
          })
        );
      }
    } finally {
      isDone = true;
      clearInterval(watchdogInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      streamUiScheduler.flush();
      streamUiScheduler.cancel();
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Generate Title via Server API or Direct Client
  const generateConversationTitle = async (
    convId: string,
    userMsg: string,
    assistantMsg: string
  ) => {
    try {
      if (settings.apiKey && settings.apiKey.trim()) {
        const title = await runDirectTitleGeneration(
          settings.apiKey.trim(),
          userMsg,
          assistantMsg
        );
        if (title) {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, title } : c))
          );
        }
        return;
      }

      const res = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstUserMessage: userMsg,
          firstAssistantResponse: assistantMsg,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, title: data.title } : c))
          );
        }
      }
    } catch (e) {
      console.warn('Title generation skipped or offline:', e);
    }
  };


  return { streamAssistantResponse, generateConversationTitle };
}
