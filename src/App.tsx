import { DEFAULT_ELARA_PORTRAIT } from "./constants/defaultPortrait";
import { Menu, Download, BookOpen, Globe, Settings, Sparkles } from "lucide-react";

import React, { useState, useEffect, useRef } from 'react';
import { CanvasPanel } from './components/CanvasPanel';
import { CanvasData } from './types';
import { DEFAULT_PERSONA_PROTOCOL, DEFAULT_INTIMACY_MODULE, DEFAULT_RUNTIME_RULES } from './constants/defaultPrompt';

import { exportConversationMarkdown, incrementRateLimit } from './lib/storage';
import { resetWorldState, exportWorldStateJSON, importWorldStateJSON } from './lib/worldStorage';
import { resetMemoryState, exportMemoryJSON, importMemoryJSON } from './lib/memoryStorage';

import {
  setDbPortrait,
  setDbMemoryState,
  setDbWorldState,
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
import { useWorkspaceController } from './features/workspace/useWorkspaceController';
import { useSettingsController } from './features/settings/useSettingsController';
import { useApplicationStateController } from './app/useApplicationStateController';
import { useChatCommandController } from './features/chat/useChatCommandController';
import { useBackgroundRuntimeController } from './runtime/useBackgroundRuntimeController';

export default function App() {
