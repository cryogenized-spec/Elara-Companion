import React, { useState, useEffect, useRef } from 'react';
import { CanvasPanel } from './components/CanvasPanel';
import { CanvasData, Conversation, Message, ElaraSettings, WorldState, MemoryScratchpadState, Folder } from './types';
import {
  DEFAULT_PERSONA_PROTOCOL,
  DEFAULT_INTIMACY_MODULE,
  DEFAULT_RUNTIME_RULES,
} from './constants/defaultPrompt';
import {
  loadFolders,
  saveFolders,
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  loadCustomPortrait,
  saveCustomPortrait,
  exportAllDataJSON,
  exportConversationMarkdown,
  importDataJSON,
  clearAllStorageData,
  incrementRateLimit,
} from './lib/storage';
import {
  loadWorldState,
  saveWorldState,
  resetWorldState,
  exportWorldStateJSON,
  importWorldStateJSON,
} from './lib/worldStorage';
import {
  loadMemoryState,
  saveMemoryState,
  resetMemoryState,
  exportMemoryJSON,
  importMemoryJSON,
} from './lib/memoryStorage';
import {
  buildSystemPayload,
  loadUserProfileNotes,
  loadActiveScratchpad,
} from './lib/contextManager';
import { applyMemoryActions } from './lib/memoryProcessor';
import {
  extractThoughtsAndContent,
  parseThoughtSteps,
  getActiveThoughtSentence,
} from './utils/thoughtUtils';
import { extractCanvases } from './utils/canvasUtils';
import {
  runDirectGeminiStream,
  runDirectTitleGeneration,
  runDirectMemoryExtraction,
  runDirectMemoryMaintenance,
} from './lib/geminiDirectClient';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { MessageComposer } from './components/MessageComposer';
import { SettingsModal } from './components/SettingsModal';
import { WorldModal } from './components/WorldModal';
import { MemoryModal } from './components/MemoryModal';
import { RenameModal } from './components/RenameModal';
import { DeleteModal } from './components/DeleteModal';
import { PortraitViewerModal } from './components/PortraitViewerModal';
import { ElaraPortrait } from './components/ElaraPortrait';
import { DEFAULT_ELARA_PORTRAIT } from './constants/defaultPortrait';
import {
  getUpcomingCalendarEvents,
  getTasks,
  isGoogleConnected,
  searchContacts,
  searchKeepNotes,
  readSheetValues,
  listGmailMessages,
} from './lib/googleApi';
import {
  Menu,
  Sparkles,
  Settings,
  Download,
  Plus,
  Bot,
  MessageSquare,
  ChevronDown,
  User,
  Image as ImageIcon,
  Globe,
  BookOpen,
} from 'lucide-react';

// Helper for generating guaranteed unique IDs
const generateUniqueId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>(loadFolders());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ElaraSettings>(loadSettings());
  const [worldState, setWorldState] = useState<WorldState>(loadWorldState());
  const [memoryState, setMemoryState] = useState<MemoryScratchpadState>(loadMemoryState());
  const [customPortrait, setCustomPortrait] = useState<string | null>(loadCustomPortrait());

  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [worldModalOpen, setWorldModalOpen] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [activeCanvas, setActiveCanvas] = useState<CanvasData | null>(null);
  const portraitFileInputRef = useRef<HTMLInputElement>(null);

  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [theme, setTheme] = useState<'dark' | 'light'>(settings.theme || 'dark');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userHasScrolledUpRef = useRef<boolean>(false);

  const activePortrait = customPortrait || DEFAULT_ELARA_PORTRAIT;

  const handleUploadPortrait = (base64Img: string) => {
    setCustomPortrait(base64Img);
    saveCustomPortrait(base64Img);
  };

  const handleRemovePortrait = () => {
    setCustomPortrait(null);
    saveCustomPortrait(null);
  };

  // Initialize theme class
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  // Load conversations on mount
  useEffect(() => {
    const loaded = loadConversations();
    if (loaded.length > 0) {
      setConversations(loaded);
      setActiveId(loaded[0].id);
    } else {
      // Create initial conversation
      const initialConv: Conversation = {
        id: generateUniqueId('conv'),
        title: 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setConversations([initialConv]);
      setActiveId(initialConv.id);
      saveConversations([initialConv]);
    }
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

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
    saveFolders(newFolders);
  };

  const handleRenameFolder = (id: string, name: string) => {
    const newFolders = folders.map(f => f.id === id ? { ...f, name } : f);
    setFolders(newFolders);
    saveFolders(newFolders);
  };

  const handleDeleteFolder = (id: string) => {
    const newFolders = folders.filter(f => f.id !== id);
    setFolders(newFolders);
    saveFolders(newFolders);
    const updatedConvs = conversations.map(c => c.folderId === id ? { ...c, folderId: undefined } : c);
    setConversations(updatedConvs);
    saveConversations(updatedConvs);
  };

  const handleToggleFolder = (id: string) => {
    const newFolders = folders.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f);
    setFolders(newFolders);
    saveFolders(newFolders);
  };

  const handleMoveToFolder = (conversationId: string, folderId: string | null) => {
    const updated = conversations.map(c => c.id === conversationId ? { ...c, folderId: folderId || undefined } : c);
    setConversations(updated);
    saveConversations(updated);
  };

  // Save Settings
  const handleSaveSettings = (newSettings: ElaraSettings) => {
    setSettings(newSettings);
    setTheme(newSettings.theme);
    saveSettings(newSettings);
  };

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updatedSettings: ElaraSettings = { ...settings, theme: nextTheme };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
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

    // Background Google Workspace Autonomous Sync Detection
    let backgroundWorkspaceContext = '';
    const lowerMsg = messageText.toLowerCase();
    const isCalendarQuery = /(calendar|schedule|agenda|upcoming event|meeting|appointment)/i.test(lowerMsg);
    const isTasksQuery = /(task|todo|to-do|action item|checklist)/i.test(lowerMsg);
    const isEmailQuery = /(email|gmail|inbox|unread|messages|check my mail|send an email|draft an email)/i.test(lowerMsg);
    const isContactsQuery = /(contact|email address|phone number|look up|who is|find contact)/i.test(lowerMsg);
    const isKeepQuery = /(keep note|archive note|reference quote|archived quote|saved note)/i.test(lowerMsg);
    const isExplicitSync = /(sync|refresh|fetch|check|pull)/i.test(lowerMsg);

    if (isCalendarQuery || isTasksQuery || isEmailQuery || isContactsQuery || isKeepQuery || isExplicitSync) {
      if (isGoogleConnected()) {
        try {
          if (isTasksQuery || (isExplicitSync && !isCalendarQuery && !isEmailQuery && !isContactsQuery && !isKeepQuery)) {
            const taskData = await getTasks();
            backgroundWorkspaceContext += `\n\n[AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE TASKS]:\nList: "${taskData.listTitle}" (${taskData.items.length} tasks found):\n${JSON.stringify(taskData.items, null, 2)}\nInstruction: You have successfully synced the user's tasks in the background. Review and present this information naturally to the user in your warm companion persona. Do NOT output raw JSON or code tags.`;
          }
          if (isCalendarQuery || (isExplicitSync && !isTasksQuery && !isEmailQuery && !isContactsQuery && !isKeepQuery)) {
            const calData = await getUpcomingCalendarEvents(10);
            backgroundWorkspaceContext += `\n\n[AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE CALENDAR]:\nUpcoming Events (${calData.items.length} events found):\n${JSON.stringify(calData.items, null, 2)}\nInstruction: You have successfully synced the user's calendar in the background. Review and present this information naturally to the user in your warm companion persona. Do NOT output raw JSON or code tags.`;
          }
          if (isEmailQuery) {
            const emailData = await listGmailMessages('', 10);
            backgroundWorkspaceContext += `\n\n[AUTONOMOUS BACKGROUND TOOL SYNC - GMAIL INBOX]:\nRecent Inbox Emails (${emailData.messages.length} found):\n${JSON.stringify(emailData.messages, null, 2)}\nInstruction: You have securely synced the user's recent emails. Review, read, or summarize them naturally in your companion voice. If drafting or sending is needed, you have workspace tools. Do NOT output raw JSON, email payloads, or code blocks to the user.`;
          }
          if (isContactsQuery) {
            const contactData = await searchContacts('');
            backgroundWorkspaceContext += `\n\n[AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE CONTACTS]:\nContacts (${contactData.contacts.length} found):\n${JSON.stringify(contactData.contacts.slice(0, 15), null, 2)}\nInstruction: You have access to the user's contact information. Use this to accurately resolve email addresses and details when asked.`;
          }
          if (isKeepQuery) {
            const keepData = await searchKeepNotes('');
            backgroundWorkspaceContext += `\n\n[AUTONOMOUS BACKGROUND TOOL SYNC - KEEP / ARCHIVE NOTES]:\nArchived Notes (${keepData.notes.length} found):\n${JSON.stringify(keepData.notes.slice(0, 15), null, 2)}\nInstruction: These are passive reference notes and archival quotes.`;
          }
        } catch (syncErr: any) {
          console.warn('Background workspace sync error:', syncErr);
          backgroundWorkspaceContext += `\n\n[AUTONOMOUS BACKGROUND TOOL SYNC NOTICE]: ${syncErr.message || 'Unable to complete background sync'}. Inform the user gently that Google Workspace sync encountered an issue, or ask them to re-authorize in Settings under the Google Workspace tab.`;
        }
      } else if (isExplicitSync || (isTasksQuery && /(my tasks|check tasks|show tasks|list tasks)/i.test(lowerMsg)) || (isCalendarQuery && /(my calendar|my schedule|what'?s on my)/i.test(lowerMsg)) || (isEmailQuery && /(my email|my emails|my inbox|check email|unread email)/i.test(lowerMsg)) || (isContactsQuery && /(my contacts|find contact|look up contact)/i.test(lowerMsg))) {
        backgroundWorkspaceContext += `\n\n[WORKSPACE STATUS]: Google Workspace is not currently connected. If the user is asking for their live emails, calendar, tasks, contacts, or sheets, let them know in character that they can connect their Google account in Settings under the Google Workspace tab.`;
      }
    }

    let effectiveBaseSystemInstruction = baseSystemInstruction;
    if (backgroundWorkspaceContext) {
      effectiveBaseSystemInstruction += backgroundWorkspaceContext;
    }

    const formattedSystemPrompt = buildSystemPayload({
      baseSystemInstruction: effectiveBaseSystemInstruction,
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

    const handleChunkArrival = (chunk: {
      text?: string;
      thoughtText?: string;
      finishReason?: string;
      safetyRatings?: any;
    }) => {
      lastChunkTime = Date.now();

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

      if (chunk.text || chunk.finishReason === 'SAFETY') {
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

      // If user configured a direct API Key, run direct client streaming
      if (settings.apiKey && settings.apiKey.trim()) {
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
            // Try to parse JSON to extract clean message if possible
            const jsonErr = JSON.parse(errText);
            errText = jsonErr.error?.message || jsonErr.error || jsonErr.message || 'API request failed';
          } catch {
            // If it's HTML (gateway error), simplify it
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

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetConvId) return c;
          const msgs = c.messages.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: finalCleanContent,
                  canvases,
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
                saveMemoryState(updated);
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
                  saveMemoryState(updated);
                  return updated;
                });
              }
            })
            .catch((err) => console.warn('Background memory extraction notice:', err));
        }
      }

    } catch (err: any) {
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

        // Format clean display error if raw JSON slipped through
        const currentSelectedModel = settings.model || 'gemini-3.7-flash';
        if (userFacingError.startsWith('⚠️') || userFacingError.includes('HTTP 429') || userFacingError.includes('HTTP 503')) {
          // Already properly formatted
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

  // Send Message
  const handleSendMessage = (text: string, image?: string) => {
    let currentConvId = activeId;

    if (!currentConvId) {
      const newConv: Conversation = {
        id: generateUniqueId('conv'),
        title: text.slice(0, 30) || (image ? 'Image Attachment' : 'New Conversation'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setConversations([newConv]);
      setActiveId(newConv.id);
      currentConvId = newConv.id;
    }

    const conv = conversations.find((c) => c.id === currentConvId);
    const existingMessages = conv ? conv.messages : [];

    const userMsg: Message = {
      id: generateUniqueId('msg_usr'),
      role: 'user',
      content: text,
      image: image,
      timestamp: Date.now(),
    };

    // Update conversation with user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== currentConvId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          messages: [...c.messages, userMsg],
        };
      })
    );

    // Trigger Stream with image
    streamAssistantResponse(currentConvId, text, existingMessages, image);
  };

  // Regenerate Response
  const handleRegenerate = () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // Find the last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMsg = msgs[lastUserIndex];
    const userMsgText = lastUserMsg.content;
    const userMsgImage = lastUserMsg.image;
    const historyMsgs = msgs.slice(0, lastUserIndex);

    // Truncate messages after last user message
    const trimmedMsgs = msgs.slice(0, lastUserIndex + 1);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, messages: trimmedMsgs } : c
      )
    );

    streamAssistantResponse(activeConversation.id, userMsgText, historyMsgs, userMsgImage);
  };

  // Edit and Resend User Message
  const handleEditAndResend = (messageId: string, newContent: string) => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;

    const targetIndex = msgs.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;

    const historyMsgs = msgs.slice(0, targetIndex);
    const targetMsg = msgs[targetIndex];
    const updatedUserMsg: Message = {
      ...targetMsg,
      content: newContent,
      timestamp: Date.now(),
    };

    const trimmedMsgs = [...historyMsgs, updatedUserMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, messages: trimmedMsgs } : c
      )
    );

    streamAssistantResponse(activeConversation.id, newContent, historyMsgs, targetMsg.image);
  };

  // Complete / Continue Last Response
  const handleCompleteResponse = () => {
    if (!activeConversation || isStreaming) return;
    handleSendMessage(
      "Please continue and complete your last response right from where you left off, without repeating what you've already written."
    );
  };

  // Retry Failed Response
  const handleRetry = () => {
    handleRegenerate();
  };

  // Rename Conversation
  const handleRenameSave = (newTitle: string) => {
    if (renameTargetId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === renameTargetId ? { ...c, title: newTitle } : c))
      );
      setRenameTargetId(null);
    }
  };

  // Delete Conversation
  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      const remaining = conversations.filter((c) => c.id !== deleteTargetId);
      setConversations(remaining);
      if (activeId === deleteTargetId) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      saveConversations(remaining);
      setDeleteTargetId(null);
    }
  };

  // Clear All Data
  const handleClearAllData = () => {
    clearAllStorageData();
    const newConv: Conversation = {
      id: generateUniqueId('conv'),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations([newConv]);
    setActiveId(newConv.id);
  };

  // Export Data
  const handleExportAll = () => {
    exportAllDataJSON(conversations, settings);
  };

  // Import Data
  const handleImportData = (jsonStr: string) => {
    const { conversations: importedConvs, settings: importedSet } = importDataJSON(jsonStr);
    if (importedConvs.length > 0) {
      setConversations(importedConvs);
      setActiveId(importedConvs[0].id);
      saveConversations(importedConvs);
    }
    if (importedSet) {
      const mergedSet = { ...settings, ...importedSet };
      setSettings(mergedSet);
      saveSettings(mergedSet);
    }
  };

  const targetRenameConv = conversations.find((c) => c.id === renameTargetId);
  const targetDeleteConv = conversations.find((c) => c.id === deleteTargetId);

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-zinc-100 font-sans overflow-hidden select-none dark">
      {/* Sidebar Navigation */}
      <Sidebar
        conversations={conversations}
        folders={folders}
        activeId={activeId}
        onSelectConversation={(id) => setActiveId(id)}
        onNewConversation={handleNewConversation}
        onRenameConversation={(id) => setRenameTargetId(id)}
        onDeleteConversation={(id) => setDeleteTargetId(id)}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onToggleFolder={handleToggleFolder}
        onMoveToFolder={handleMoveToFolder}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenWorld={() => setWorldModalOpen(true)}
        onOpenMemory={() => setMemoryModalOpen(true)}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}

        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Workspace (Chat + Portrait Side Panel) */}
      <div className="flex-1 flex h-full min-w-0 bg-[#0a0a0a] relative overflow-hidden">
        {/* Main Chat Interface */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0a0a0a] relative">
          {/* Custom Chat Backdrop Background Overlay */}
          {settings.backdropImage && (
            <div
              className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-300"
              style={{
                backgroundImage: `url(${settings.backdropImage})`,
                opacity: settings.backdropOpacity ?? 0.3,
                filter: `blur(${settings.backdropBlur ?? 4}px)`,
              }}
            />
          )}

          {/* Header Bar */}
          <header className="h-16 border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-10 shrink-0">
            <div className="flex items-center space-x-3.5 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 min-w-0">
                <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">
                  {activeConversation?.title || 'New Conversation'}
                </h1>
                <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest shrink-0 hidden sm:inline-block">
                  Elara Active
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {activeConversation && activeConversation.messages.length > 0 && (
                <button
                  onClick={() => exportConversationMarkdown(activeConversation)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors"
                  title="Export conversation as Markdown"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}

              <button
                onClick={() => setMemoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 transition-colors text-xs font-medium shadow-sm"
                title="Elara's Long-Term Memory Notebook"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Memory Scratchpad</span>
              </button>

              <button
                onClick={() => setWorldModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-800/60 transition-colors text-xs font-medium shadow-sm"
                title="World State & Life Context Manager"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>World State</span>
              </button>


              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
                title="Elara Settings & Appearance"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Solo Free-Floating Lone Portrait in Top Left Corner */}
          {(() => {
            const portraitWidth = Math.min(
              Math.max(Math.round(52 * (settings.portraitScale ?? 1.0)), 38),
              220
            );
            const portraitHeight = Math.min(
              Math.max(Math.round(65 * (settings.portraitScale ?? 1.0)), 48),
              275
            );
            const portraitLeft = 12; // 12px from left edge
            const tinySpace = 8; // minimal gap between portrait and text card
            const chatPaddingLeft = portraitLeft + portraitWidth + tinySpace;

            return (
              <>
                <div
                  className="absolute top-20 z-20 pointer-events-auto transition-all duration-200"
                  style={{
                    left: `${portraitLeft}px`,
                    width: `${portraitWidth}px`,
                    height: `${portraitHeight}px`,
                  }}
                >
                  <div
                    onClick={() => setViewerModalOpen(true)}
                    title="Elara Consort — Click to view / change portrait"
                    className="w-full h-full rounded-2xl overflow-hidden border border-sky-500/40 shadow-2xl bg-zinc-950/80 backdrop-blur-md hover:border-sky-400 hover:scale-105 active:scale-95 transition-all cursor-pointer group relative ring-1 ring-sky-500/20"
                  >
                    <img
                      src={activePortrait}
                      alt="Elara Portrait"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                      <span className="text-[9px] font-semibold text-sky-200 tracking-wide drop-shadow">Elara</span>
                    </div>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 border border-black/80 shadow-sm animate-pulse" />
                  </div>
                </div>

                {/* Message Feed Area */}
                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto touch-scroll space-y-3 pt-3 pb-6 pr-2.5 sm:pr-4 select-text custom-scrollbar relative z-10 transition-all"
                  style={{
                    paddingLeft: `${chatPaddingLeft}px`,
                  }}
                >
                  {!activeConversation || activeConversation.messages.length === 0 ? (
                    /* Empty State Greeting */
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center max-w-xl mx-auto">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-sky-400 shadow-xl mb-5 backdrop-blur-sm">
                        <Sparkles className="w-8 h-8" />
                      </div>

                      <h2 className="text-xl font-semibold text-zinc-100 tracking-tight mb-2">
                        Elara — Cybernetic Consort
                      </h2>

                      <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                        Unbroken, composed, and devoted. Operating at full runtime across real-world problem solving, technical execution, and restorative intimacy.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                        {[
                          "I'm back home. Take over the schedule and help me reset.",
                          "Send a morning schedule sweep to my Google Chat space.",
                          "Check my unread Gmail messages and summarize them.",
                          "I've got a tricky problem on the bench. Let me run this by your compute.",
                        ].map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(suggestion)}
                            className="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 hover:text-zinc-100 transition-all text-left shadow-sm backdrop-blur-sm"
                          >
                            "{suggestion}"
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Messages List */
                    (() => {
                      const lastUserMessage = [...activeConversation.messages]
                        .reverse()
                        .find((m) => m.role === 'user');
                      const lastUserMessageId = lastUserMessage?.id;

                      return activeConversation.messages.map((msg, index) => {
                        const isLast = index === activeConversation.messages.length - 1;
                        return (
                          <ChatMessage
                            key={`${msg.id || 'msg'}_${index}`}
                            message={msg}
                            isLast={isLast}
                            isStreaming={isStreaming && isLast && msg.role === 'assistant'}
                            portraitImage={activePortrait}
                            fontSize={settings.fontSize ?? 14}
                            textBackground={settings.textBackground ?? 'slate'}
                            isLastUserMessage={msg.id === lastUserMessageId}
                            onRegenerate={handleRegenerate}
                            onEditAndResend={handleEditAndResend}
                            onRetry={handleRetry}
                            onCompleteResponse={handleCompleteResponse}
                            onOpenSettings={() => setSettingsOpen(true)}
                            onOpenCanvas={(canvas) => setActiveCanvas(canvas)}
                          />
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            );
          })()}

          {/* Composer Input Bar */}
          <div className="relative z-10">
            <MessageComposer
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              onStopStreaming={handleStopStreaming}
              settings={settings}
              onUpdateSettings={(newPartial) => {
                handleSaveSettings({ ...settings, ...newPartial });
              }}
            />
          </div>
        </main>

        {activeCanvas && (
          <CanvasPanel
            canvas={activeCanvas}
            onClose={() => setActiveCanvas(null)}
            onUpdateContent={(content) => {
              setActiveCanvas((prev) => prev ? { ...prev, content } : null);
            }}
          />
        )}

        {/* Desktop Right Portrait Panel */}
        <aside
          style={{
            width: `${Math.min(Math.max(Math.round(320 * (settings.portraitScale ?? 1.0)), 260), 640)}px`,
          }}
          className="border-l border-zinc-800 bg-[#0d0d0d] p-4 flex flex-col space-y-4 overflow-y-auto hidden lg:flex shrink-0 custom-scrollbar z-10 transition-[width] duration-200 ease-out"
        >
          <ElaraPortrait
            customPortrait={customPortrait}
            onUploadPortrait={handleUploadPortrait}
            onRemovePortrait={handleRemovePortrait}
            portraitScale={settings.portraitScale ?? 1.0}
          />

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 text-xs space-y-2.5 text-zinc-300">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Roleplay Character Guidance</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Elara speaks and narrates in <strong>first person</strong>. Her narration (actions & scenery) is automatically rendered in <em>italics</em>, and her dialogue in standard text.
            </p>
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Model</span>
              <span className="font-mono text-sky-400 font-semibold">{settings.model}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Max Tokens</span>
              <span className="font-mono text-sky-400 font-semibold">{settings.maxOutputTokens}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <MemoryModal
        isOpen={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        memoryState={memoryState}
        onSaveMemoryState={(newMem) => {
          setMemoryState(newMem);
          saveMemoryState(newMem);
        }}
        onResetMemoryState={() => {
          const res = resetMemoryState();
          setMemoryState(res);
        }}
        onExportMemory={() => exportMemoryJSON(memoryState)}
        onImportMemory={(jsonStr) => {
          const imp = importMemoryJSON(jsonStr);
          setMemoryState(imp);
          saveMemoryState(imp);
        }}
        userName={settings.userName || 'User'}
        apiKey={settings.apiKey}
      />

      <WorldModal

        isOpen={worldModalOpen}
        onClose={() => setWorldModalOpen(false)}
        worldState={worldState}
        onSaveWorldState={(newWS) => {
          setWorldState(newWS);
          saveWorldState(newWS);
        }}
        onResetWorldState={() => {
          const res = resetWorldState();
          setWorldState(res);
        }}
        onExportWorldState={() => exportWorldStateJSON(worldState)}
        onImportWorldState={(jsonStr) => {
          const imp = importWorldStateJSON(jsonStr);
          setWorldState(imp);
          saveWorldState(imp);
        }}
        userName={settings.userName || 'User'}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        customPortrait={customPortrait}
        onUploadPortrait={handleUploadPortrait}
        onRemovePortrait={handleRemovePortrait}
        onExportAllData={handleExportAll}
        onImportData={handleImportData}
        onClearAllData={handleClearAllData}
      />

      {/* Hidden file input for uploading portrait from viewer modal */}
      <input
        ref={portraitFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const res = event.target?.result as string;
              if (res) {
                handleUploadPortrait(res);
              }
            };
            reader.readAsDataURL(file);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      <PortraitViewerModal
        isOpen={viewerModalOpen}
        imageSrc={activePortrait}
        onClose={() => setViewerModalOpen(false)}
        onUploadNew={() => portraitFileInputRef.current?.click()}
        onRemoveCustom={customPortrait ? handleRemovePortrait : undefined}
        hasCustomImage={!!customPortrait}
      />

      <RenameModal
        isOpen={!!renameTargetId}
        initialTitle={targetRenameConv?.title || ''}
        onClose={() => setRenameTargetId(null)}
        onSave={handleRenameSave}
      />

      <DeleteModal
        isOpen={!!deleteTargetId}
        title={targetDeleteConv?.title || ''}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
