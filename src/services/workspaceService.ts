import type { Workspace, WorkspaceArtifact } from '../types';
import {
  createArtifact as createStoredArtifact,
  deleteArtifact as deleteStoredArtifact,
  getArtifactById,
  getWorkspace,
  saveAgentArtifact,
  saveWorkspace,
  setActiveArtifact as setStoredActiveArtifact,
  updateArtifact as updateStoredArtifact,
} from '../lib/workspaceStorage';

/** Application-facing Workspace capability boundary. */
export const workspaceService = {
  getWorkspace,
  saveWorkspace,
  getArtifactById,
  setActiveArtifact(artifactId: string): Workspace {
    return setStoredActiveArtifact(artifactId);
  },
  createArtifact(name: string = 'Untitled', content: string = '', type: string = 'text'): WorkspaceArtifact {
    const workspace = createStoredArtifact(getWorkspace(), name, type);
    const artifactId = workspace.activeArtifactId;
    const created = artifactId ? workspace.artifacts.find((artifact) => artifact.id === artifactId) : undefined;
    if (!created) throw new Error(`Workspace artifact '${name}' could not be created.`);
    if (content) {
      const updated = updateStoredArtifact(workspace, artifactId!, { content });
      return updated.artifacts.find((artifact) => artifact.id === artifactId) || { ...created, content };
    }
    return created;
  },
  updateArtifact(artifactId: string, patch: Partial<WorkspaceArtifact>): WorkspaceArtifact | null {
    const updated = updateStoredArtifact(getWorkspace(), artifactId, patch);
    return updated.artifacts.find((artifact) => artifact.id === artifactId) || null;
  },
  deleteArtifact(artifactId: string): boolean {
    if (!getArtifactById(artifactId)) return false;
    deleteStoredArtifact(getWorkspace(), artifactId);
    return true;
  },
  saveAgentArtifact,
} as const;

export type WorkspaceService = typeof workspaceService;
export type { Workspace, WorkspaceArtifact };