import type {
  BackgroundRuntimeContract,
  ChatCapabilityBundle,
  GeminiRuntimeContract,
  GoogleContract,
  MemoryContract,
  WorkspaceContract,
} from './index';
import { backgroundRuntimeService } from '../services/backgroundRuntimeService';
import { googleCapabilities, googleIdentity } from '../services/googleWorkspaceService';
import { getLoadedMemoryState, loadMemoryState, reduceMemoryActions, saveMemoryState } from '../services/memoryService';
import { streamGemini, normalizeGeminiWorkspace } from '../runtime/geminiRuntimeService';
import { workspaceService } from '../services/workspaceService';

export const memoryContract: MemoryContract = {
  load: loadMemoryState,
  save: saveMemoryState,
  getLoaded: getLoadedMemoryState,
  reduce: reduceMemoryActions,
};

export const workspaceContract: WorkspaceContract = {
  getWorkspace: workspaceService.getWorkspace,
  saveWorkspace: workspaceService.saveWorkspace,
  getArtifactById: workspaceService.getArtifactById,
  setActiveArtifact: (artifactId) => workspaceService.setActiveArtifact(artifactId),
  createArtifact: (name, content, type = 'text') => {
    const updated = workspaceService.createArtifact(workspaceService.getWorkspace(), name, type);
    const created = updated.artifacts.find((artifact) => artifact.id === updated.activeArtifactId);
    if (!created) throw new Error(`Workspace artifact '${name}' could not be created.`);
    if (content) {
      workspaceService.saveWorkspace({
        ...updated,
        artifacts: updated.artifacts.map((artifact) => artifact.id === created.id ? { ...artifact, content } : artifact),
      });
    }
    return content ? { ...created, content } : created;
  },
  updateArtifact: (artifactId, patch) => {
    const updated = workspaceService.updateArtifact(workspaceService.getWorkspace(), artifactId, patch);
    return updated.artifacts.find((artifact) => artifact.id === artifactId) || null;
  },
  deleteArtifact: (artifactId) => {
    const before = workspaceService.getArtifactById(artifactId);
    if (!before) return false;
    workspaceService.deleteArtifact(workspaceService.getWorkspace(), artifactId);
    return true;
  },
  saveAgentArtifact: workspaceService.saveAgentArtifact,
};

export const googleContract: GoogleContract = {
  getAccessToken: googleIdentity.getAccessToken,
  isAuthorized: googleIdentity.isAuthorized,
  getClientId: googleIdentity.getClientId,
  getGrantedScopes: googleCapabilities.getGrantedScopes,
  isCapabilityGranted: (capability) => googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability),
  requestCapabilityAuthorization: async (capability) => {
    try {
      const scopes = googleCapabilities.getScopes(capability);
      await googleIdentity.requestCapabilityAuthorization(scopes, true);
      return { success: true, message: `Google capability '${capability}' authorized.` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },
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
