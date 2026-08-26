import type { Workspace, WorkspaceArtifact } from '../types';
import {
  createArtifact,
  deleteArtifact,
  getArtifactById,
  getWorkspace,
  saveAgentArtifact,
  saveWorkspace,
  setActiveArtifact,
  updateArtifact,
} from '../lib/workspaceStorage';

/** Application-facing Workspace capability boundary. */
export const workspaceService = {
  getWorkspace,
  saveWorkspace,
  getArtifactById,
  setActiveArtifact,
  saveAgentArtifact,
  createArtifact,
  updateArtifact,
  deleteArtifact,
  selectArtifact(artifactId: string): Workspace {
    return setActiveArtifact(artifactId);
  },
  removeArtifact(artifactId: string): boolean {
    const current = getWorkspace();
    if (!current.artifacts.some((artifact) => artifact.id === artifactId)) return false;
    deleteArtifact(current, artifactId);
    return true;
  },
  updateArtifactById(artifactId: string, patch: Partial<WorkspaceArtifact>): WorkspaceArtifact | null {
    const updated = updateArtifact(getWorkspace(), artifactId, patch);
    return updated.artifacts.find((artifact) => artifact.id === artifactId) || null;
  },
} as const;

export type WorkspaceService = typeof workspaceService;
export type { Workspace, WorkspaceArtifact };