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
import { createStreamUiScheduler } from './lib/streamUiScheduler';

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
import { ThoughtLogModal } from './components/ThoughtLogModal';
import { ElaraPortrait } from './components/ElaraPortrait';
import { WorkspaceView } from './components/WorkspaceView';
import { saveAgentArtifact, setActiveArtifact, getWorkspace, saveWorkspace } from './lib/workspaceStorage';
import { useConversationController } from './features/conversations/useConversationController';
import { useChatStreamController } from './features/chat/useChatStreamController';

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

  const scrollToBottom = (force = false, behavior: ScrollBehavior = 'smooth') => {
    if ((force || !userHasScrolledUpRef.current) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    scrollToBottom(false, isStreaming ? 'auto' : 'smooth');
  }, [activeConversation?.messages, isStreaming]);

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
          );  const {
    streamAssistantResponse,
    generateConversationTitle,
  } = useChatStreamController({
    conversations,
    settings,
    memoryState,
    setConversations,
    setMemoryState,
    setIsStreaming,
    abortControllerRef,
    userHasScrolledUpRef,
  });

h (e) {
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

  const {
    handleNewConversation,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleToggleFolder,
    handleMoveToFolder,
    renameConversation,
    deleteConversation,
    clearAllData: handleClearAllData,
    exportAll: handleExportAll,
    importData: handleImportData,
  } = useConversationController({
    conversations,
    folders,
    settings,
    activeId,
    isStreaming,
    setConversations,
    setFolders,
    setActiveId,
    setSettings,
    setTheme,
    setRenameTargetId,
    setDeleteTargetId,
    stopStreaming: handleStopStreaming,
    userHasScrolledUpRef,
  });

  const handleRenameSave = (newTitle: string) => {
    renameConversation(renameTargetId, newTitle);
  };

  const handleDeleteConfirm = () => {
    deleteConversation(deleteTargetId);
  };

  if (!isLoaded) return <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-500 font-sans tracking-wide">Initializing memory core...</div>;

  const targetRenameConv = conversations.find((c) => c.id === renameTargetId);
  const targetDeleteConv = conversations.find((c) => c.id === deleteTargetId);

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-zinc-100 font-sans overflow-hidden select-none dark">
      <Sidebar
        conversations={conversations}
        folders={folders}
        activeId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          setCurrentView('chat');
        }}
        onNewConversation={() => {
          handleNewConversation();
          setCurrentView('chat');
        }}
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
        onOpenWorkspace={() => setCurrentView('workspace')}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-1 flex h-full min-w-0 bg-[#0a0a0a] relative overflow-hidden">
        {currentView === 'chat' ? (
          <>
            <main className="flex-1 flex flex-col h-full min-w-0 bg-[#0a0a0a] relative">
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

          {(() => {
            const portraitWidth = Math.min(
              Math.max(Math.round(52 * (settings.portraitScale ?? 1.0)), 38),
              220
            );
            const portraitHeight = Math.min(
              Math.max(Math.round(65 * (settings.portraitScale ?? 1.0)), 48),
              275
            );
            const portraitLeft = 12;
            const tinySpace = 8;
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
                    <img src={activePortrait} alt="Elara Portrait" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-1">
                      <span className="text-[9px] font-semibold text-sky-200 tracking-wide drop-shadow">Elara</span>
                    </div>
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 border border-black/80 shadow-sm animate-pulse" />
                  </div>
                </div>

                <div
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto touch-scroll space-y-3 pt-3 pb-6 pr-2.5 sm:pr-4 select-text custom-scrollbar relative z-10 transition-all"
                  style={{ paddingLeft: `${chatPaddingLeft}px` }}
                >
                  {!activeConversation || activeConversation.messages.length === 0 ? (
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
                            onOpenArtifact={handleOpenArtifact}
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
          </>
        ) : (
          <WorkspaceView
            activeArtifactId={activeArtifactId}
            onSelectArtifact={(id) => setActiveArtifactId(id)}
            onBackToChat={() => setCurrentView('chat')}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
      </div>

      <MemoryModal
        isOpen={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        memoryState={memoryState}
        onSaveMemoryState={(newMem) => {
          setMemoryState(newMem);
          setDbMemoryState(newMem);
        }}
        onResetMemoryState={() => {
          const res = resetMemoryState();
          setMemoryState(res);
        }}
        onExportMemory={() => exportMemoryJSON(memoryState)}
        onImportMemory={(jsonStr) => {
          const imp = importMemoryJSON(jsonStr);
          setMemoryState(imp);
          setDbMemoryState(imp);
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
          setDbWorldState(newWS);
        }}
        onResetWorldState={() => {
          const res = resetWorldState();
          setWorldState(res);
        }}
        onExportWorldState={() => exportWorldStateJSON(worldState)}
        onImportWorldState={(jsonStr) => {
          const imp = importWorldStateJSON(jsonStr);
          setWorldState(imp);
          setDbWorldState(imp);
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
