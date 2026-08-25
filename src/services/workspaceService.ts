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
} as const;

export type WorkspaceService = typeof workspaceService;
export type { Workspace, WorkspaceArtifact };
