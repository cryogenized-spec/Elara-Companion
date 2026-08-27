import type { ArtifactRevision, Workspace, WorkspaceArtifact } from '../types';
import { workspacePersistenceService } from './workspacePersistenceService';
import {
  createArtifact,
  deleteArtifact,
  setActiveArtifact,
  updateArtifact,
} from '../lib/workspaceStorage';
import { compareRevisions, createCheckpoint, restoreRevision } from '../lib/revisionUtils';

export const workspaceEditorService = {
  getWorkspace: workspacePersistenceService.getWorkspace,
  saveWorkspace: workspacePersistenceService.saveWorkspace,
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
