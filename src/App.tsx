import { DEFAULT_ELARA_PORTRAIT } from "./constants/defaultPortrait";
import { Menu, Download, BookOpen, Globe, Settings, Sparkles } from "lucide-react";

import React, { useState, useEffect, useRef } from 'react';
import { CanvasPanel } from './components/CanvasPanel';
import { CanvasData, Conversation, Message, ElaraSettings, WorldState, MemoryScratchpadState, Folder } from './types';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from './constants/defaultPrompt';
import { DEFAULT_WORLD_STATE } from './constants/defaultWorldState';

import { exportAllDataJSON, exportConversationMarkdown, importDataJSON, incrementRateLimit, DEFAULT_SETTINGS, generateUniqueId } from './lib/storage';
import { resetWorldState, exportWorldStateJSON, importWorldStateJSON } from './lib/worldStorage';
import { resetMemoryState, exportMemoryJSON, importMemoryJSON, DEFAULT_MEMORY_STATE } from './lib/memoryStorage';
import { loadUserProfileNotes, loadActiveScratchpad, buildSystemPayload } from './lib/contextManager';
import { getAccessToken } from './lib/googleApi';
import { getActiveThoughtSentence, parseThoughtSteps, extractThoughtsAndContent } from './utils/thoughtUtils';
import { extractCanvases } from './utils/canvasUtils';
import { runDirectGeminiStream, runDirectMemoryExtraction, runDirectTitleGeneration } from './lib/geminiDirectClient';
import { applyMemoryActions } from './lib/memoryProcessor';
import { createBackgroundChatJob, isBackgroundRuntimeEnabled, loadPersistedBackgroundJobs, persistBackgroundJob, removePersistedBackgroundJob, waitForBackgroundChatJob } from './lib/backgroundChatClient';
import { notifyBackgroundCompletion } from './lib/backgroundService';

import { 
  getDbConversations, setDbConversations,
  getDbSettings, setDbSettings,
  getDbFolders, setDbFolders,
  getDbPortrait, setDbPortrait,
  getDbWorldState, setDbWorldState,
  getDbMemoryState, setDbMemoryState,
  clearDbStorage, migrateFromLocalStorage
} from './lib/db';

import { Sidebar } from './components/Sidebar';
import { MessageComposer } from './components/MessageComposer';
import { SettingsModal } from './components/SettingsModal';
import { WorldModal } from './components/WorldModal';
import { MemoryModal } from './components/MemoryModal';
import { ChatMessage } from './components/ChatMessage';
import { ThinkingScratchpad } from './components/ThinkingScratchpad';
import { CameraModal } from './components/CameraModal';
import { DeleteModal } from './components/DeleteModal';
import { RenameModal } from './components/RenameModal';
import { PortraitViewerModal } from './components/PortraitViewerModal';
import { ElaraPortrait } from './components/ElaraPortrait';
import { WorkspaceView } from './components/WorkspaceView';
import { saveAgentArtifact, setActiveArtifact, getWorkspace, saveWorkspace } from './lib/workspaceStorage';

export default function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'workspace'>('chat');
  const [isLoaded, setIsLoaded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ElaraSettings>(DEFAULT_SETTINGS);
  const [worldState, setWorldState] = useState<WorldState>(DEFAULT_WORLD_STATE);
  const [memoryState, setMemoryState] = useState<MemoryScratchpadState>(DEFAULT_MEMORY_STATE);
  const [customPortrait, setCustomPortrait] = useState<string | null>(null);

  useEffect(() => {
    migrateFromLocalStorage().then(async () => {
      setFolders(await getDbFolders());
      setSettings(await getDbSettings());
      setWorldState(await getDbWorldState());
      setMemoryState(await getDbMemoryState());
      setCustomPortrait(await getDbPortrait());
      
      const loadedConvs = await getDbConversations();
      if (loadedConvs.length > 0) {
        setConversations(loadedConvs);
        setActiveId(loadedConvs[0].id);
      } else {
        const initialConv: Conversation = {
          id: generateUniqueId('conv'),
          title: 'New Conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations([initialConv]);
        setActiveId(initialConv.id);
      }
      setIsLoaded(true);
    });
  }, []);

  // Resume durable background jobs after page reload
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
              messages: c.messages.map((m) => m.id === job.assistantMessageId ? { ...m, isStreaming: false, isThinking: false, isError: true, errorMessage: 'Background execution failed. Please retry.' , backgroundJobId: undefined } : m),
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
  }, [isLoaded]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [worldModalOpen, setWorldModalOpen] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<CanvasData | null>(null);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const portraitFileInputRef = useRef<HTMLInputElement>(null);

  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');

  const handleOpenArtifact = (artifactId: string) => {
    setActiveArtifact(artifactId);
    setActiveArtifactId(artifactId);
    setCurrentView('workspace');
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userHasScrolledUpRef = useRef<boolean>(false);

  const activePortrait = customPortrait || DEFAULT_ELARA_PORTRAIT;

  const handleUploadPortrait = (base64Img: string) => {
    setCustomPortrait(base64Img);
    setDbPortrait(base64Img);
  };

  const handleRemovePortrait = () => {
    setCustomPortrait(null);
    setDbPortrait(null);
  };

  // Initialize theme class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Save data whenever it changes
  useEffect(() => { if (isLoaded) setDbConversations(conversations); }, [conversations, isLoaded]);
  useEffect(() => { if (isLoaded) setDbFolders(folders); }, [folders, isLoaded]);
  useEffect(() => { if (isLoaded) setDbSettings(settings); }, [settings, isLoaded]);
  useEffect(() => { if (isLoaded) setDbWorldState(worldState); }, [worldState, isLoaded]);
  useEffect(() => { if (isLoaded) setDbMemoryState(memoryState); }, [memoryState, isLoaded]);
  useEffect(() => { if (isLoaded) setDbPortrait(customPortrait); }, [customPortrait, isLoaded]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Handle Scroll behavior
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    // If user is more than 120px away from bottom, mark userHasScrolledUp
    userHasScrolledUpRef.current = distanceToBottom > 120;
  };

  const scrollToBottom = (force = false) => {
    if ((force || !userHasScrolledUpRef.current) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  // Handle New Conversation
  const handleNewConversation = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    const newConv: Conversation = {
      id: generateUniqueId('conv'),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    userHasScrolledUpRef.current = false;
  };

  const handleCreateFolder = (name: string) => {
    const newFolder: Folder = { id: generateUniqueId('folder'), name, isExpanded: true };
    const newFolders = [...folders, newFolder];
    setFolders(newFolders);
    setDbFolders(newFolders);
  };

  const handleRenameFolder = (id: string, name: string) => {
    const newFolders = folders.map(f => f.id === id ? { ...f, name } : f);
    setFolders(newFolders);
    setDbFolders(newFolders);
  };

  const handleDeleteFolder = (id: string) => {
    const newFolders = folders.filter(f => f.id !== id);
    setFolders(newFolders);
    setDbFolders(newFolders);
    const updatedConvs = conversations.map(c => c.folderId === id ? { ...c, folderId: undefined } : c);
    setConversations(updatedConvs);
    setDbConversations(updatedConvs);
  };

  const handleToggleFolder = (id: string) => {
    const newFolders = folders.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f);
    setFolders(newFolders);
    setDbFolders(newFolders);
  };

  const handleMoveToFolder = (conversationId: string, folderId: string | null) => {
    const updated = conversations.map(c => c.id === conversationId ? { ...c, folderId: folderId || undefined } : c);
    setConversations(updated);
    setDbConversations(updated);
  };

  // Save Settings
  const handleSaveSettings = (newSettings: ElaraSettings) => {
    setSettings(newSettings);
    setTheme(newSettings.theme);
    setDbSettings(newSettings);
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updatedSettings: ElaraSettings = { ...settings, theme: nextTheme };
    setSettings(updatedSettings);
    setDbSettings(updatedSettings);
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    // Mark active streaming message as complete
    if (activeId) {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          const updatedMsgs = c.messages.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          );
          return { ...c, messages: updatedMsgs };
        })
      );
    }
  };

  // Stream Response from Server API
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

      // Handle streaming thought chunks
      if (chunk.thoughtText) {
        streamedThoughts += chunk.thoughtText;
        const activeSentence = getActiveThoughtSentence(streamedThoughts);
        const thoughtSteps = parseThoughtSteps(streamedThoughts);

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isThinking: true,
                    rawThoughts: streamedThoughts,
                    currentThoughtSentence: activeSentence,
                    thoughts: thoughtSteps,
                    thoughtDurationMs: Date.now() - assistantStartTime,
                    artifactIds: Array.from(new Set([...(m.artifactIds || []), ...streamArtifactIds])),
                  }
                : m
            );
            return { ...c, messages: msgs };
          })
        );
        scrollToBottom();
      }

      // Handle content text chunks
      if (chunk.text) {
        accumulatedText += chunk.text;
      }

      if (chunk.text || chunk.finishReason === 'SAFETY' || chunk.toolCall || (chunk.artifactIds && chunk.artifactIds.length > 0)) {
        let { cleanContent, combinedThoughts, isInsideThoughtTag } =
          extractThoughtsAndContent(accumulatedText, streamedThoughts);
        const { cleanContent: finalCleanContent, canvases } = extractCanvases(cleanContent);
        
        const activeSentence = getActiveThoughtSentence(combinedThoughts);
        const thoughtSteps = parseThoughtSteps(combinedThoughts);

        const isThinking =
          isInsideThoughtTag || (finalCleanContent.length === 0 && Boolean(streamedThoughts));

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: finalCleanContent,
                    canvases,
                    artifactIds: Array.from(new Set([...(m.artifactIds || []), ...streamArtifactIds])),
                    isThinking: isThinking,
                    rawThoughts: combinedThoughts,
                    currentThoughtSentence: activeSentence,
                    thoughts: thoughtSteps,
                    thoughtDurationMs: Date.now() - assistantStartTime,
                  }
                : m
            );
            return { ...c, messages: msgs };
          })
        );
        scrollToBottom();
      }
    };

    try {
      // Increment API rate limit
      incrementRateLimit(settings.model || 'gemini-3.7-flash');

      // Optional durable server-side execution. Once accepted, never fall back to another Gemini call.
      if (isBackgroundRuntimeEnabled()) {
        const durableJob = await createBackgroundChatJob({
          message: messageText,
          image: attachedImage,
          history: historyPayload.map((item) => ({ role: item.role === 'model' ? 'assistant' : 'user', content: item.content, image: item.image })),
          systemPrompt: formattedSystemPrompt,
          model: settings.model || 'gemini-3.7-flash',
          temperature: settings.temperature,
          maxOutputTokens: settings.maxOutputTokens,
          topP: settings.topP,
          topK: settings.topK,
        });
        durableJobAccepted = true;
        persistBackgroundJob({ conversationId: targetConvId, assistantMessageId: assistantMsgId, jobId: durableJob.id, createdAt: Date.now() });
        setConversations((prev) => prev.map((c) => c.id !== targetConvId ? c : ({
          ...c,
          messages: c.messages.map((m) => m.id === assistantMsgId ? { ...m, backgroundJobId: durableJob.id, currentThoughtSentence: 'Elara is working in the background…' } : m),
        })));
        const durableStatus = await waitForBackgroundChatJob(durableJob.id);
        if (!['complete', 'completed'].includes(durableStatus.status)) {
          throw new Error(durableStatus.error ? String(durableStatus.error) : `Background execution ended with status ${durableStatus.status}.`);
        }
        const durableText = durableStatus.output?.result?.text || '';
        accumulatedText = durableText;
        handleChunkArrival({ text: durableText, finishReason: durableStatus.output?.result?.finishReason || undefined });
        removePersistedBackgroundJob(targetConvId);
      } else if (settings.apiKey && settings.apiKey.trim()) {
        await runDirectGeminiStream({
          apiKey: settings.apiKey.trim(),
          model: settings.model || 'gemini-3.7-flash',
          systemPrompt: formattedSystemPrompt,
          history: historyPayload,
          message: messageText,
          image: attachedImage,
          temperature: settings.temperature,
          maxOutputTokens: settings.maxOutputTokens,
          topP: settings.topP,
          topK: settings.topK,
          thinkingBudget: settings.thinkingBudget,
          workspace: getWorkspace(),
          googleToken: getAccessToken(),
          onChunk: handleChunkArrival,
          signal: controller.signal,
        });
      } else {
        // Attempt backend endpoint /api/chat/stream
        let response: Response;
        try {
          response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              message: messageText,
              image: attachedImage,
              history: historyPayload,
              systemPrompt: formattedSystemPrompt,
              model: settings.model,
              temperature: settings.temperature,
              maxOutputTokens: settings.maxOutputTokens,
              topP: settings.topP,
              topK: settings.topK,
              thinkingBudget: settings.thinkingBudget,
              workspace: getWorkspace(),
              googleToken: getAccessToken(),
            }),
          });
        } catch (fetchErr: any) {
          if (fetchErr.name === 'AbortError') throw fetchErr;
          // If network fetch failed (static GitHub Pages hosting without backend)
          throw new Error(
            'Cannot reach backend server. If running on GitHub Pages, please enter your Gemini API Key in Settings (Model & API tab).'
          );
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              'Backend route not found. If hosting as a static GitHub Page, please enter your Gemini API Key in Settings.'
            );
          }
          let errText = await response.text().catch(() => '');
          try {
            const jsonErr = JSON.parse(errText);
            errText = jsonErr.error?.message || jsonErr.error || jsonErr.message || 'API request failed';
          } catch {
            if (errText.trim().startsWith('<') || errText.includes('<html>')) {
               errText = `Service unavailable (HTTP ${response.status})`;
            }
          }
          throw new Error(errText || `Server returned HTTP ${response.status}`);
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
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.replace('data: ', '');
                try {
                  const data = JSON.parse(jsonStr);

                  if (data.error) {
                    throw new Error(data.error);
                  }

                  handleChunkArrival({
                    text: data.text,
                    thoughtText: data.thoughtText,
                    finishReason: data.finishReason,
                    safetyRatings: data.safetyRatings,
                    toolCall: data.toolCall,
                    workspace: data.workspace,
                    artifactIds: data.artifactIds,
                  });

                  if (data.done) {
                    break;
                  }
                } catch (e: any) {
                  if (e.message && !e.message.includes('JSON')) {
                    throw e;
                  }
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      isDone = true;
      clearInterval(watchdogInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Mark streaming and thinking completed & finalize structured steps
      let { cleanContent, combinedThoughts } = extractThoughtsAndContent(
        accumulatedText,
        streamedThoughts
      );
      const { cleanContent: finalCleanContent, canvases } = extractCanvases(cleanContent);
      const finalSteps = parseThoughtSteps(combinedThoughts);

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
            .catch((err) => console.error('Background memory extraction error:', err));
        }
      }
    } catch (error: any) {
      isDone = true;
      clearInterval(watchdogInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (error.name === 'AbortError') {
        console.warn('Stream aborted by user.');
        return;
      }
      console.error('Streaming error:', error);
      setConversations((prev) => prev.map((c) => c.id !== targetConvId ? c : ({
        ...c,
        messages: c.messages.map((m) => m.id === assistantMsgId ? { ...m, isStreaming: false, isThinking: false, isError: true, errorMessage: error.message || 'Failed to generate response.' } : m),
      })));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (messageText: string, image?: string) => {
    if (!activeId || isStreaming || (!messageText.trim() && !image)) return;
    const active = conversations.find(c => c.id === activeId);
    if (!active) return;

    const historyMessages = [...active.messages];
    setConversations((prev) => prev.map(c => c.id === activeId ? { ...c, updatedAt: Date.now(), messages: [...c.messages, { id: generateUniqueId('msg_user'), role: 'user' as const, content: messageText, timestamp: Date.now(), image }] } : c));
    await streamAssistantResponse(activeId, messageText, historyMessages, image);
  };

  const generateConversationTitle = async (conversationId: string, firstUserMessage: string, firstAssistantResponse: string) => {
    try {
      const apiKey = settings.apiKey?.trim();
      if (apiKey) {
        const titleResult = await runDirectTitleGeneration(apiKey, firstUserMessage, firstAssistantResponse, settings.userName || 'User');
        if (titleResult) setConversations((prev) => prev.map(c => c.id === conversationId ? { ...c, title: titleResult } : c));
        return;
      }
      const response = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstUserMessage, firstAssistantResponse }),
      });
      const data = await response.json();
      if (data.title) setConversations((prev) => prev.map(c => c.id === conversationId ? { ...c, title: data.title } : c));
    } catch (error) {
      console.warn('Conversation title generation failed:', error);
    }
  };

  const handleOpenCanvas = (canvas: CanvasData) => setActiveCanvas(canvas);
  const handleOpenArtifact = (artifactId: string) => {
    setActiveArtifact(artifactId);
    setActiveArtifactId(artifactId);
    setCurrentView('workspace');
  };

  const handleEditAndResend = (messageId: string, newContent: string) => {
    if (!activeId) return;
    const currentConv = conversations.find(c => c.id === activeId);
    if (!currentConv) return;
    const msgIndex = currentConv.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const historyMessages = currentConv.messages.slice(0, msgIndex);
    const updatedMessages = currentConv.messages.slice(0, msgIndex + 1).map(m => m.id === messageId ? { ...m, content: newContent } : m);
    setConversations((prev) => prev.map(c => c.id === activeId ? { ...c, messages: updatedMessages } : c));
    void streamAssistantResponse(activeId, newContent, historyMessages);
  };

  const handleRetry = (messageId: string) => {
    if (!activeId || isStreaming) return;
    const active = conversations.find(c => c.id === activeId);
    if (!active) return;
    const idx = active.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const previousUser = [...active.messages.slice(0, idx)].reverse().find(m => m.role === 'user');
    if (!previousUser) return;
    void streamAssistantResponse(activeId, previousUser.content, active.messages.slice(0, idx));
  };

  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter(c => c.id !== id);
    const nextConversations = remaining.length > 0 ? remaining : [{ id: generateUniqueId('conv'), title: 'New Conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() }];
    setConversations(nextConversations);
    setActiveId(nextConversations[0].id);
  };

  const handleDeleteAllConversations = () => {
    const newConv = { id: generateUniqueId('conv'), title: 'New Conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setConversations([newConv]);
    setActiveId(newConv.id);
  };

  const handleOpenMemory = () => {
    setMemoryModalOpen(true);
  };

  const handleExportAll = () => {
    exportAllDataJSON(conversations, settings, memoryState, worldState);
  };

  const handleImportAll = (json: string) => {
    const data = importDataJSON(json);
    if (data.conversations) setConversations(data.conversations);
    if (data.settings) setSettings(data.settings);
    if (data.memoryState) setMemoryState(data.memoryState);
    if (data.worldState) setWorldState(data.worldState);
    setIsLoaded(true);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} conversations={conversations} folders={folders} activeId={activeId} onSelectConversation={setActiveId} onNewConversation={handleNewConversation} onCreateFolder={handleCreateFolder} onRenameFolder={handleRenameFolder} onDeleteFolder={handleDeleteFolder} onToggleFolder={handleToggleFolder} onMoveToFolder={handleMoveToFolder} onOpenMemory={handleOpenMemory} onSettings={() => setSettingsOpen(true)} onToggleTheme={handleToggleTheme} onImportAll={handleImportAll} onExportAll={handleExportAll} theme={theme} setTheme={setTheme} onUploadPortrait={handleUploadPortrait} onRemovePortrait={handleRemovePortrait} userName={settings.userName || 'User'} customPortrait={customPortrait} />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between px-3 sm:px-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 z-20">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" aria-label="Open navigation"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-sky-400" /><h1 className="text-sm font-semibold tracking-wide">Elara</h1></div>
          <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200" aria-label="Open settings"><Settings className="w-5 h-5" /></button>
        </header>

        {currentView === 'chat' ? (
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 pb-5">
            <div className="max-w-4xl mx-auto pt-4 sm:pt-6 pb-24 space-y-1.5">
              {activeConversation?.messages.map((message, idx) => (
                <ChatMessage key={message.id} message={message} isLast={idx === activeConversation.messages.length - 1} isStreaming={isStreaming} portraitImage={activePortrait} fontSize={settings.assistantFontSize || settings.fontSize || 14} textBackground={settings.textBackground} isLastUserMessage={message.role === 'user' && idx === activeConversation.messages.map(m => m.role).lastIndexOf('user')} onRegenerate={() => handleRetry(message.id)} onRetry={() => handleRetry(message.id)} onEditAndResend={handleEditAndResend} onCompleteResponse={() => setIsStreaming(false)} onOpenSettings={() => setSettingsOpen(true)} onOpenCanvas={handleOpenCanvas} onOpenArtifact={handleOpenArtifact} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 pb-5">
            <WorkspaceView onOpenArtifact={handleOpenArtifact} />
          </div>
        )}
      </main>

      {activeCanvas && <CanvasPanel canvas={activeCanvas} onClose={() => setActiveCanvas(null)} />}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
      <WorldModal isOpen={worldModalOpen} onClose={() => setWorldModalOpen(false)} worldState={worldState} onSave={(next) => { setWorldState(next); setDbWorldState(next); }} onReset={() => { const next = resetWorldState(); setWorldState(next); setDbWorldState(next); }} />
      <MemoryModal isOpen={memoryModalOpen} onClose={() => setMemoryModalOpen(false)} state={memoryState} onUpdate={(next) => { setMemoryState(next); setDbMemoryState(next); }} onReset={() => { const next = resetMemoryState(); setMemoryState(next); setDbMemoryState(next); }} onImport={importMemoryJSON} onExport={exportMemoryJSON} />
      <CameraModal isOpen={false} onClose={() => {}} onCapture={() => {}} />
      <DeleteModal isOpen={!!deleteTargetId} onClose={() => setDeleteTargetId(null)} onConfirm={() => { if (deleteTargetId) { handleDeleteConversation(deleteTargetId); setDeleteTargetId(null); } }} />
      <RenameModal isOpen={!!renameTargetId} onClose={() => setRenameTargetId(null)} onConfirm={(name) => { if (renameTargetId) { setConversations((prev) => prev.map(c => c.id === renameTargetId ? { ...c, title: name } : c)); setRenameTargetId(null); } }} initialValue={renameTargetId ? (conversations.find(c => c.id === renameTargetId)?.title || '') : ''} />
      <PortraitViewerModal isOpen={viewerModalOpen} onClose={() => setViewerModalOpen(false)} portraitImage={activePortrait} />
    </div>
  );
}
