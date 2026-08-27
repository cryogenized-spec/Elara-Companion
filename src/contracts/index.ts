import type {
  Conversation,
  MemoryAction,
  MemoryScratchpadState,
  Message,
  Workspace,
  WorkspaceArtifact,
} from '../types';

/** Stable application contract for conversation ownership. */
export interface ConversationContract {
  getActive(conversations: Conversation[]): Conversation | null;
  create(title?: string): Conversation;
  rename(conversationId: string, title: string): void;
  delete(conversationId: string): void;
  update(conversationId: string, updater: (conversation: Conversation) => Conversation): void;
}

/** Stable application contract for canonical memory ownership. */
export interface MemoryContract {
  load(): Promise<MemoryScratchpadState>;
  save(state: MemoryScratchpadState, conversationId?: string): Promise<void>;
  getLoaded(): MemoryScratchpadState | null;
  reduce(state: MemoryScratchpadState, actions: MemoryAction[], conversationId?: string): MemoryScratchpadState;
}

/** Stable application contract for Workspace ownership. */
export interface WorkspaceContract {
  getWorkspace(): Workspace;
  saveWorkspace(workspace: Workspace): void;
  getArtifactById(artifactId: string): WorkspaceArtifact | null;
  setActiveArtifact(artifactId: string | null): Workspace;
  createArtifact(name: string, content: string, type?: string): WorkspaceArtifact;
  updateArtifact(artifactId: string, patch: Partial<WorkspaceArtifact>): WorkspaceArtifact | null;
  deleteArtifact(artifactId: string): boolean;
  saveAgentArtifact(name: string, content: string, type?: string, artifactId?: string): WorkspaceArtifact;
}

/** Canonical Google capabilities. This type belongs to the application contract, not the OAuth implementation. */
export type GoogleCapability =
  | 'gmail.read' | 'gmail.compose' | 'gmail.send' | 'gmail.modify'
  | 'calendar.read' | 'calendar.write' | 'tasks'
  | 'docs' | 'drive.read' | 'drive.file'
  | 'sheets.read' | 'sheets.write'
  | 'keep.read' | 'keep.write'
  | 'contacts.read' | 'chat.read' | 'chat.send' | 'chat.manage';

/** Stable external-state contract for Google identity/capabilities. */
export interface GoogleContract {
  getAccessToken(): string;
  isAuthorized(): boolean;
  getClientId(): string;
  getGrantedScopes(): string;
  isCapabilityGranted(capability: GoogleCapability): boolean;
  requestCapabilityAuthorization(capability: GoogleCapability): Promise<{ success: boolean; message: string }>;
  revoke(): Promise<{ success: boolean; message: string }>;
}

/** Stable application contract for Google Calendar operations. */
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

export interface GoogleCalendarContract {
  getUpcoming(maxResults?: number): Promise<{ items: GoogleCalendarEvent[] }>;
  create(
    summary: string,
    startTime: string,
    endTime: string,
    description?: string,
    location?: string,
  ): Promise<GoogleCalendarEvent>;
}

export interface BackgroundHistoryMessage {
  role: 'user' | 'assistant';
  content?: string;
  image?: string;
}

export interface BackgroundChatJobRequest {
  message: string;
  image?: string;
  history?: BackgroundHistoryMessage[];
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  workspace?: Workspace;
}

export interface BackgroundJobStatus {
  id: string;
  status: string;
  output?: {
    status?: string;
    completedAt?: string;
    result?: {
      text?: string;
      model?: string;
      finishReason?: string | null;
      responseId?: string | null;
      workspace?: Workspace;
      createdArtifactIds?: string[];
      modifiedArtifactIds?: string[];
      toolRounds?: number;
    };
  };
  error?: unknown;
}

export interface PersistedBackgroundJob {
  conversationId: string;
  assistantMessageId: string;
  jobId: string;
  createdAt: number;
}

/** Stable application contract for durable background execution. */
export interface BackgroundRuntimeContract {
  isEnabled(): boolean;
  isConfigured(): boolean;
  loadPersistedJobs(): PersistedBackgroundJob[];
  persistJob(job: PersistedBackgroundJob): void;
  removeJob(jobId: string): void;
  createChatJob(request: BackgroundChatJobRequest): Promise<{ id: string }>;
  getJob(jobId: string): Promise<BackgroundJobStatus>;
  waitForJob(jobId: string): Promise<BackgroundJobStatus>;
}

export interface GeminiStreamChunk {
  text?: string;
  thoughtText?: string;
  finishReason?: string;
  safetyRatings?: unknown;
  toolCall?: unknown;
  workspace?: Workspace;
  artifactIds?: string[];
}

export interface GeminiHistoryMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
  image?: string;
}

export interface GeminiRuntimeRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: GeminiHistoryMessage[];
  message: string;
  image?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  thinkingBudget?: number;
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  workspace?: Workspace;
  googleToken?: string;
  enableTools?: boolean;
  onChunk: (chunk: GeminiStreamChunk) => void;
  signal?: AbortSignal;
}

/** Stable model/runtime contract for streaming generation. */
export interface GeminiRuntimeContract {
  stream(request: GeminiRuntimeRequest): Promise<void>;
  normalizeWorkspace(workspace?: Workspace): Workspace | undefined;
}

/** Chat consumes capabilities; it does not own their implementation. */
export interface ChatCapabilityBundle {
  memory: MemoryContract;
  workspace: WorkspaceContract;
  google: GoogleContract;
  background: BackgroundRuntimeContract;
  runtime: GeminiRuntimeContract;
}

/** Message data emitted by the chat runtime is a domain event payload, not a provider object. */
export interface AssistantStreamUpdate {
  conversationId: string;
  assistantMessageId: string;
  patch: Partial<Message>;
  chunk?: GeminiStreamChunk;
}

export * from './googleHub';
