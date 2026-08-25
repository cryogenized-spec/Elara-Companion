import type {
  Conversation,
  MemoryAction,
  MemoryScratchpadState,
  Message,
  Workspace,
  WorkspaceArtifact,
} from '../types';
import type {
  BackgroundChatJobRequest,
  BackgroundJobStatus,
  PersistedBackgroundJob,
} from '../lib/backgroundChatClient';
import type {
  GeminiStreamChunk,
  GeminiStreamRequest,
} from '../runtime/geminiRuntimeService';
import type { GoogleCapability } from '../services/googleWorkspaceService';

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
  save(state: MemoryScratchpadState): Promise<void>;
  getLoaded(): MemoryScratchpadState | null;
  reduce(state: MemoryScratchpadState, actions: MemoryAction[], conversationId?: string): MemoryScratchpadState;
}

/** Stable application contract for Workspace ownership. */
export interface WorkspaceContract {
  get(): Workspace;
  save(workspace: Workspace): void;
  getArtifactById(artifactId: string): WorkspaceArtifact | null;
  setActiveArtifact(artifactId: string | null): Workspace;
  createArtifact(name: string, content: string, type?: string): WorkspaceArtifact;
  updateArtifact(artifactId: string, patch: Partial<WorkspaceArtifact>): WorkspaceArtifact | null;
  deleteArtifact(artifactId: string): boolean;
  saveAgentArtifact(name: string, content: string, type?: string, artifactId?: string): WorkspaceArtifact;
}

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

/** Stable model/runtime contract for streaming generation. */
export interface GeminiRuntimeContract {
  stream(request: GeminiStreamRequest): Promise<void>;
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
