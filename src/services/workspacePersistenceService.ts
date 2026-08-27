import type { Workspace } from '../types';
import {
  getWorkspace,
  saveWorkspace,
  clearWorkspace,
} from '../lib/workspaceStorage';

/** Application-owned persistence boundary for Workspace state. */
export const workspacePersistenceService = {
  getWorkspace,
  saveWorkspace,
  clearWorkspace,
} as const;

export type WorkspacePersistenceService = typeof workspacePersistenceService;
export type { Workspace };
