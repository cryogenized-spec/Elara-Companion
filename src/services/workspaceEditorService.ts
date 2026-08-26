import type { ArtifactRevision, Workspace, WorkspaceArtifact } from '../types';
import {
  createArtifact,
  deleteArtifact,
  getWorkspace,
  saveWorkspace,
  setActiveArtifact,
  updateArtifact,
} from '../lib/workspaceStorage';
import { compareRevisions, createCheckpoint, restoreRevision } from '../lib/revisionUtils';

export const workspaceEditorService = {
  getWorkspace,
  saveWorkspace,
  selectArtifact: setActiveArtifact,
  createArtifact,
  deleteArtifact,
  updateArtifact,
  checkpoint: createCheckpoint,
  restoreRevision,
  compareRevisions,
} as const;

export type WorkspaceEditorService = typeof workspaceEditorService;
export type { ArtifactRevision, Workspace, WorkspaceArtifact };
