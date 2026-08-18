export type Role = 'user' | 'assistant';

export interface ThoughtStep {
  id: string;
  step_title: string;
  summary: string;
  timestamp: number;
}

export interface CanvasData {
  title: string;
  content: string;
  artifactId?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  image?: string;
  isError?: boolean;
  errorMessage?: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  thoughts?: ThoughtStep[];
  rawThoughts?: string;
  currentThoughtSentence?: string;
  thoughtDurationMs?: number;
  canvases?: CanvasData[];
  artifactIds?: string[];
}

export interface Folder {
  id: string;
  name: string;
  isExpanded?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  folderId?: string;
}

export interface ElaraSettings {
  systemPrompt: string;
  personaProtocol: string;
  intimacyModule: string;
  runtimeRules: string;
  userName: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  includeHistory: boolean;
  theme: 'dark' | 'light';
  portraitScale: number;
  backdropImage: string | null;
  backdropOpacity: number;
  backdropBlur: number;
  timezone: string;
  fontSize?: number;
  textBackground?: 'slate' | 'deep-onyx' | 'midnight-blue' | 'cyber-violet' | 'emerald-terminal' | 'frosted-glass' | 'high-contrast';
  thinkingBudget?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  sendOnEnter?: boolean;
  apiKey?: string;
  customBackendUrl?: string;
  speechLanguage?: string;
  speechAutoSend?: boolean;
  speechAutoCapitalize?: boolean;
  speechPauseTimeout?: number;
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

export type MemoryConfidence = 'certain' | 'likely' | 'uncertain';
export type MemoryImportance = 'low' | 'normal' | 'important' | 'core';
export type MemoryCategory = 'User' | 'Elara' | 'Relationship' | 'Home' | 'Work' | 'Projects' | 'Preferences' | 'People' | 'Places' | 'Experiences' | 'Observations' | 'Plans' | 'Other';

export interface MemoryItem {
  id: string;
  content: string;
  confidence: MemoryConfidence;
  importance: MemoryImportance;
  isPrivate: boolean;
  category: MemoryCategory;
  createdAt: string;
  updatedAt: string;
  eventDate?: string;
  pinned?: boolean;
  tags?: string[];
  sourceConversationId?: string;
}

export interface MemoryScratchpadState { memories: MemoryItem[]; lastMaintenanceAt?: string; autoMaintenanceEnabled: boolean; }
export type MemoryActionType = 'ADD' | 'UPDATE' | 'MERGE' | 'DELETE' | 'NO_ACTION';
export interface MemoryAction {
  type: MemoryActionType;
  targetId?: string;
  mergeTargetIds?: string[];
  memory?: { content: string; confidence: MemoryConfidence; importance: MemoryImportance; isPrivate: boolean; category: MemoryCategory; eventDate?: string; tags?: string[]; };
  reason?: string;
}

export const AVAILABLE_MODELS: GeminiModelOption[] = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', description: 'Current stable Flash for fast multimodal, general-purpose and agentic work.', isDefault: true },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', description: 'Current stable Flash for sustained agentic and coding workloads.' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', description: 'Current stable fast, cost-efficient Flash-Lite execution.' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', description: 'Stable lightweight Flash-Lite model for throughput and low latency.' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', description: 'Preview high-intelligence model for complex reasoning and coding.' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Preview Flash model for high-quality reasoning and lower cost.' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Legacy stable Flash; retained for compatibility while still available.' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: 'Legacy stable Flash-Lite; retained for compatibility while still available.' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Stable advanced reasoning model for complex tasks.' },
];

export type ArtifactProvider = 'local' | 'google_docs' | 'google_keep';
export type SyncStatus = 'unlinked' | 'linked' | 'local_ahead' | 'remote_ahead' | 'synchronized' | 'conflict' | 'error';
export type RevisionSource = 'user' | 'agent' | 'google_sync' | 'restore' | 'system';

export interface ArtifactRevision {
  id: string;
  artifactId: string;
  revisionNumber: number;
  content: string;
  createdAt: number;
  author: 'user' | 'agent' | 'system';
  source: RevisionSource;
  contentHash: string;
}

export interface WorkspaceArtifact {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  type: string;
  provider?: ArtifactProvider;
  externalId?: string;
  url?: string;
  linkedAt?: number;
  lastSyncedAt?: number;
  syncStatus?: SyncStatus;
  syncBaselineHash?: string;
  revisions?: ArtifactRevision[];
}

export interface Workspace { id: string; name: string; artifacts: WorkspaceArtifact[]; activeArtifactId: string | null; }
export interface PersonaSnapshot { id: string; name: string; timestamp: number; systemPrompt: string; personaProtocol: string; intimacyModule: string; runtimeRules: string; }
