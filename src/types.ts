export type Role = 'user' | 'assistant' | 'model';

export interface ThoughtStep { id: string; step_title: string; summary: string; timestamp: number; }
export interface CanvasData { title: string; content: string; artifactId?: string; }
export interface Message {
  id: string; role: Role; content: string; timestamp: number; image?: string; isError?: boolean; errorMessage?: string;
  isStreaming?: boolean; isThinking?: boolean; thoughts?: ThoughtStep[]; rawThoughts?: string; currentThoughtSentence?: string;
  thoughtDurationMs?: number; canvases?: CanvasData[]; artifactIds?: string[]; backgroundJobId?: string;
}
export interface Folder { id: string; name: string; isExpanded?: boolean; }
export interface Conversation { id: string; title: string; createdAt: number; updatedAt: number; messages: Message[]; model?: string; temperature?: number; maxOutputTokens?: number; folderId?: string; }

import type { VoiceSettings } from './lib/voiceSettings';
import type { ReliabilitySettings } from './lib/reliabilitySettings';

export interface ElaraSettings {
  systemPrompt: string; personaProtocol: string; intimacyModule: string; runtimeRules: string;
  /** When true, injects adultFictionModule into the system payload. Default true. */
  adultFictionEnabled?: boolean;
  /** Framing text that treats adult/NSFW content as consensual fiction & roleplay. */
  adultFictionModule?: string;
  userName: string; model: string;
  temperature: number; maxOutputTokens: number; topP: number; topK: number; includeHistory: boolean;
  theme: 'dark' | 'light'; themeMode?: 'dark' | 'light' | 'system';
  portraitScale: number; backdropImage: string | null; backdropOpacity: number; backdropBlur: number; timezone: string;
  fontSize?: number; textBackground?: 'slate' | 'deep-onyx' | 'midnight-blue' | 'cyber-violet' | 'emerald-terminal' | 'frosted-glass' | 'high-contrast';
  userFontFamily?: string; userFontSource?: 'system' | 'google'; userFontWeight?: 300 | 400 | 500 | 600 | 700; userTextColor?: string; userFontSize?: number;
  assistantFontFamily?: string; assistantFontSource?: 'system' | 'google'; assistantFontWeight?: 300 | 400 | 500 | 600 | 700; assistantTextColor?: string; assistantFontSize?: number;
  thinkingBudget?: number; thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'; sendOnEnter?: boolean; apiKey?: string; customBackendUrl?: string;
  /** Canonical voice configuration. Legacy flat speech fields remain for export/migration compatibility. */
  voiceSettings?: VoiceSettings;
  /** Canonical user-owned retry/failover policy. Runtime health remains temporary and is never persisted here. */
  reliabilitySettings?: ReliabilitySettings;
  speechLanguage?: string; speechAutoSend?: boolean; speechAutoCapitalize?: boolean; speechPauseTimeout?: number;
}

export interface RoomLocation { id: string; name: string; description: string; objects: string[]; notes?: string; }
export interface HouseStructure { generalDescription: string; rooms: RoomLocation[]; specialLocations: string[]; }
export interface InventoryItem { id: string; name: string; category: string; location: string; description: string; ownership: 'elara' | 'user' | 'shared'; importance?: 'high' | 'medium' | 'low'; notes?: string; }
export interface RoutineEntry { id: string; timeRange: string; daysOfWeek: string; activity: string; location: string; flexibility: 'fixed' | 'flexible' | 'variable'; notes?: string; }
export interface LiveState { userLocation: string; elaraLocation: string; currentActivity: string; currentClothing: string; currentPlans: string; objectsInUse: string; temporaryConditions: string; }
export interface TemporaryEvent { id: string; title: string; description: string; startTime?: string; endTimeOrExpiry?: string; participants: string; location: string; notes?: string; }
export interface SharedMemory { id: string; date: string; title: string; description: string; participants: string; importance: 'high' | 'medium' | 'low'; tags: string[]; }
export interface ElaraPersonalLife { personalProjects: string[]; booksReading: string[]; subjectsResearching: string[]; curiosities: string[]; ideasDeveloping: string[]; thingsToShowUser: string[]; intendedActivities: string[]; ongoingGoals: string[]; }
export interface PreferenceEntry { id: string; category: string; detail: string; owner: 'elara' | 'user' | 'shared'; }
export interface WorldState { house: HouseStructure; elaraBelongings: InventoryItem[]; userBelongings: InventoryItem[]; sharedPossessions: InventoryItem[]; elaraRoutine: RoutineEntry[]; userRoutine: RoutineEntry[]; liveState: LiveState; temporaryEvents: TemporaryEvent[]; sharedMemories: SharedMemory[]; elaraPersonalLife: ElaraPersonalLife; preferences: PreferenceEntry[]; }

export interface GeminiModelOption { id: string; name: string; description: string; isDefault?: boolean; }

/** Canonical taxonomy for Elara's persistent memory layer. */
export type MemoryKind = 'fact' | 'preference' | 'observation' | 'episode' | 'project' | 'relationship' | 'plan' | 'working' | 'context';
export type MemoryLifecycle = 'working' | 'contextual' | 'persistent' | 'core' | 'archived';
export type MemorySource = 'user' | 'elara' | 'conversation' | 'artifact' | 'system' | 'imported';
export type MemoryConfidence = 'certain' | 'likely' | 'uncertain';
export type MemoryImportance = 'low' | 'normal' | 'important' | 'core';
export type MemoryCategory = 'User' | 'Elara' | 'Relationship' | 'Home' | 'Work' | 'Projects' | 'Preferences' | 'People' | 'Places' | 'Experiences' | 'Observations' | 'Plans' | 'Other';

export interface MemoryLink {
  type: 'conversation' | 'artifact' | 'memory';
  id: string;
  label?: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  kind?: MemoryKind;
  lifecycle?: MemoryLifecycle;
  source?: MemorySource;
  confidence: MemoryConfidence;
  importance: MemoryImportance;
  isPrivate: boolean;
  category: MemoryCategory;
  createdAt: string;
  updatedAt: string;
  eventDate?: string;
  expiresAt?: string;
  lastRecalledAt?: string;
  reinforcementCount?: number;
  pinned?: boolean;
  tags?: string[];
  sourceConversationId?: string;
  sourceArtifactId?: string;
  relatedMemoryIds?: string[];
  links?: MemoryLink[];
}

export interface MemoryScratchpadState {
  memories: MemoryItem[];
  lastMaintenanceAt?: string;
  autoMaintenanceEnabled: boolean;
  schemaVersion?: number;
}

export type MemoryActionType = 'ADD' | 'CREATE' | 'UPDATE' | 'MERGE' | 'DELETE' | 'NO_ACTION';
export interface MemoryAction {
  type: MemoryActionType;
  targetId?: string;
  mergeTargetIds?: string[];
  memory?: {
    content: string;
    kind?: MemoryKind;
    lifecycle?: MemoryLifecycle;
    source?: MemorySource;
    confidence: MemoryConfidence;
    importance: MemoryImportance;
    isPrivate: boolean;
    category: MemoryCategory;
    eventDate?: string;
    expiresAt?: string;
    sourceArtifactId?: string;
    relatedMemoryIds?: string[];
    tags?: string[];
    links?: MemoryLink[];
  };
  reason?: string;
}

export const AVAILABLE_MODELS: GeminiModelOption[] = [
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', description: 'Latest stable Flash for fast multimodal, general-purpose and agentic work.', isDefault: true },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Stable Flash for fast multimodal, general-purpose and agentic work.' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Current stable Flash for sustained agentic and coding workloads.' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Current stable fast, cost-efficient Flash-Lite execution.' },
];