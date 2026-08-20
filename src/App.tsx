import { DEFAULT_ELARA_PORTRAIT } from "./constants/defaultPortrait";
import { Menu, Download, BookOpen, Globe, Settings, Sparkles } from "lucide-react";

import React, { useState, useEffect, useRef } from 'react';
import { CanvasPanel } from './components/CanvasPanel';
import { CanvasData, Conversation, Message, ElaraSettings, WorldState, MemoryScratchpadState, Folder } from './types';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from './constants/defaultPrompt';
import { DEFAULT_WORLD_STATE } from './constants/defaultWorldState';

import { exportAllDataJSON, exportConversationMarkdown, importDataJSON, incrementRateLimit, DEFAULT_SETTINGS, generateUniqueId } from './lib/storage';
import { resetWorldState, exportWorldStateJSON, importWorldStateJSON } from './lib/worldStorage';
import { resetMemoryState, exportMemoryJSON, importMemoryJSON, DEFAULT_MEMORY_STATE, normalizeMemoryState } from './lib/memoryStorage';
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
import { ThoughtLogModal } from './components/ThoughtLogModal';
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
      setMemoryState(normalizeMemoryState(await getDbMemoryState()));
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
  useEffect(() => { if (isLoaded) setDbMemoryState(normalizeMemoryState(memoryState)); }, [memoryState, isLoaded]);
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

  const handleMemoryStateChange = (nextState: MemoryScratchpadState) => {
    const normalized = normalizeMemoryState(nextState);
    setMemoryState(normalized);
    setDbMemoryState(normalized);
  };