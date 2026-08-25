import type {
  BackgroundRuntimeContract,
  ChatCapabilityBundle,
  GeminiRuntimeContract,
  GoogleContract,
  MemoryContract,
  WorkspaceContract,
} from './index';
import {
  backgroundRuntimeService,
} from '../services/backgroundRuntimeService';
import {
  googleCapabilities,
  googleIdentity,
} from '../services/googleWorkspaceService';
import {
  getLoadedMemoryState,
  loadMemoryState,
  reduceMemoryActions,
  saveMemoryState,
} from '../services/memoryService';
import {
  streamGemini,
  normalizeGeminiWorkspace,
} from '../runtime/geminiRuntimeService';
import { workspaceService } from '../services/workspaceService';

export const memoryContract: MemoryContract = {
  load: loadMemoryState,
  save: saveMemoryState,
  getLoaded: getLoadedMemoryState,
  reduce: reduceMemoryActions,
};

export const workspaceContract: WorkspaceContract = workspaceService;

export const googleContract: GoogleContract = {
  getAccessToken: googleIdentity.getAccessToken,
  isAuthorized: googleIdentity.isAuthorized,
  getClientId: googleIdentity.getClientId,
  getGrantedScopes: googleCapabilities.getGrantedScopes,
  isCapabilityGranted: (capability) => (
    googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability)
  ),
  requestCapabilityAuthorization: googleIdentity.requestCapabilityAuthorization,
  revoke: googleIdentity.revoke,
};

export const backgroundRuntimeContract: BackgroundRuntimeContract = {
  isEnabled: backgroundRuntimeService.isEnabled,
  isConfigured: backgroundRuntimeService.isConfigured,
  loadPersistedJobs: backgroundRuntimeService.loadPersistedJobs,
  persistJob: backgroundRuntimeService.persistJob,
  removeJob: backgroundRuntimeService.removeJob,
  createChatJob: backgroundRuntimeService.createChatJob,
  getJob: backgroundRuntimeService.getJob,
  waitForJob: backgroundRuntimeService.waitForJob,
};

export const geminiRuntimeContract: GeminiRuntimeContract = {
  stream: streamGemini,
  normalizeWorkspace: normalizeGeminiWorkspace,
};

/** Stable capability bundle for feature-level dependency injection. */
export function createChatCapabilityBundle(): ChatCapabilityBundle {
  return {
    memory: memoryContract,
    workspace: workspaceContract,
    google: googleContract,
    background: backgroundRuntimeContract,
    runtime: geminiRuntimeContract,
  };
}
