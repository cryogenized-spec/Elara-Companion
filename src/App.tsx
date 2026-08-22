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
import { getDbConversations, setDbConversations, getDbSettings, setDbSettings, getDbFolders, setDbFolders, getDbPortrait, setDbPortrait, getDbWorldState, setDbWorldState, getDbMemoryState, setDbMemoryState, clearDbStorage, migrateFromLocalStorage } from './lib/db';
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
      setMemoryState(await getDbMemoryState());
      setCustomPortrait(await getDbPortrait());
      const loadedConvs = await getDbConversations();
      if (loadedConvs.length > 0) { setConversations(loadedConvs); setActiveId(loadedConvs[0].id); }
      else { const initialConv: Conversation = { id: generateUniqueId('conv'), title: 'New Conversation', messages: [], createdAt: Date.now(), updatedAt: Date.now() }; setConversations([initialConv]); setActiveId(initialConv.id); }
      setIsLoaded(true);
    });
  }, []);

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
            setConversations((prev) => prev.map((c) => c.id !== job.conversationId ? c : ({ ...c, updatedAt: Date.now(), messages: c.messages.map((m) => m.id === job.assistantMessageId ? { ...m, content: text, isStreaming: false, isThinking: false, backgroundJobId: undefined } : m) })));
            removePersistedBackgroundJob(job.conversationId); void notifyBackgroundCompletion('Elara finished', text.slice(0, 160) || 'Your background response is ready.');
          } else if (['errored', 'failed', 'terminated'].includes(status.status)) {
            setConversations((prev) => prev.map((c) => c.id !== job.conversationId ? c : ({ ...c, messages: c.messages.map((m) => m.id === job.assistantMessageId ? { ...m, isStreaming: false, isThinking: false, isError: true, errorMessage: 'Background execution failed. Please retry.', backgroundJobId: undefined } : m) })));
            removePersistedBackgroundJob(job.conversationId);
          }
        } catch (error) { console.warn('Durable background job resume deferred:', error); }
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

  /* Existing App implementation continues unchanged below this point. */
