import type { ArtifactRevision, Workspace, WorkspaceArtifact } from '../types';
import { workspacePersistenceService } from './workspacePersistenceService';
import { workspaceService } from './workspaceService';
import { compareRevisions, createCheckpoint, restoreRevision } from '../lib/revisionUtils';

export const workspaceEditorService = {
  getWorkspace: workspacePersistenceService.getWorkspace,
  saveWorkspace: workspacePersistenceService.saveWorkspace,
  selectArtifact: workspaceService.selectArtifact,
  createArtifact: workspaceService.createArtifact,
  deleteArtifact: workspaceService.removeArtifact,
  updateArtifact: (workspace: Workspace, artifactId: string, updates: Partial<WorkspaceArtifact>): Workspace =>
    workspaceService.updateArtifactById(artifactId, updates) ? workspaceService.getWorkspace() : workspace,
  checkpoint: createCheckpoint,
  restoreRevision,
  compareRevisions,
} as const;

export type WorkspaceEditorService = typeof workspaceEditorService;
export type { ArtifactRevision, Workspace, WorkspaceArtifact };
