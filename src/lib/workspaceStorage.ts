import { Workspace, WorkspaceArtifact, ArtifactRevision } from '../types';
import { generateUniqueId } from './storage';
import { createCheckpoint } from './revisionUtils';

const WORKSPACE_STORAGE_KEY = 'elara_workspace_data';
const WORKSPACE_SCHEMA_KEY = 'elara_workspace_schema_v1';
const WORKSPACE_SCHEMA_VERSION = 1;
const ARTIFACT_EVENT = 'elara:artifact-created';

const EMPTY_WORKSPACE: Workspace = {
  id: 'default-workspace',
  name: 'My Workspace',
  artifacts: [],
  activeArtifactId: null,
};

let workspaceCache: Workspace | null = null;

function safeGetStoredWorkspace(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(WORKSPACE_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function normalizeRevision(value: unknown, artifactId: string): ArtifactRevision | null {
  if (!value || typeof value !== 'object') return null;
  const revision = value as Partial<ArtifactRevision>;
  if (typeof revision.id !== 'string' || typeof revision.content !== 'string') return null;
  if (revision.artifactId !== artifactId || typeof revision.revisionNumber !== 'number') return null;
  if (typeof revision.createdAt !== 'number' || typeof revision.contentHash !== 'string') return null;
  if (!['user', 'agent', 'system'].includes(revision.author || '')) return null;
  if (!['user', 'agent', 'google_sync', 'restore', 'system'].includes(revision.source || '')) return null;
  return revision as ArtifactRevision;
}

function normalizeArtifact(value: unknown): WorkspaceArtifact | null {
  if (!value || typeof value !== 'object') return null;
  const artifact = value as Partial<WorkspaceArtifact>;
  if (typeof artifact.id !== 'string' || typeof artifact.name !== 'string') return null;
  if (typeof artifact.content !== 'string' || typeof artifact.createdAt !== 'number' || typeof artifact.updatedAt !== 'number') return null;
  if (typeof artifact.type !== 'string') return null;
  const revisions = Array.isArray(artifact.revisions)
    ? artifact.revisions.map((revision) => normalizeRevision(revision, artifact.id)).filter(Boolean) as ArtifactRevision[]
    : [];

  return {
    ...artifact,
    revisions,
    provider: artifact.provider,
  } as WorkspaceArtifact;
}

function normalizeWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== 'object') return { ...EMPTY_WORKSPACE, artifacts: [] };
  const parsed = value as Partial<Workspace>;
  const artifacts = Array.isArray(parsed.artifacts)
    ? parsed.artifacts.map(normalizeArtifact).filter(Boolean) as WorkspaceArtifact[]
    : [];
  const activeArtifactId = typeof parsed.activeArtifactId === 'string' && artifacts.some((artifact) => artifact.id === parsed.activeArtifactId)
    ? parsed.activeArtifactId
    : artifacts[0]?.id || null;

  return {
    id: typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : EMPTY_WORKSPACE.id,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : EMPTY_WORKSPACE.name,
    artifacts,
    activeArtifactId,
  };
}

export const getWorkspace = (): Workspace => {
  if (workspaceCache) return workspaceCache;

  const stored = safeGetStoredWorkspace();
  if (!stored) {
    workspaceCache = { ...EMPTY_WORKSPACE, artifacts: [] };
    return workspaceCache;
  }

  try {
    const workspace = normalizeWorkspace(JSON.parse(stored));
    workspaceCache = workspace;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(WORKSPACE_SCHEMA_KEY, String(WORKSPACE_SCHEMA_VERSION)); } catch { /* best effort */ }
    }
    return workspace;
  } catch (error) {
    console.warn('Failed to load workspace data; falling back to an empty workspace.', error);
    workspaceCache = { ...EMPTY_WORKSPACE, artifacts: [] };
    return workspaceCache;
  }
};

export const saveWorkspace = (workspace: Workspace): void => {
  const normalized = normalizeWorkspace(workspace);
  workspaceCache = normalized;
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem(WORKSPACE_SCHEMA_KEY, String(WORKSPACE_SCHEMA_VERSION));
  } catch (error) {
    console.error('Failed to save workspace data:', error);
  }
};

export const clearWorkspace = (): void => {
  workspaceCache = null;
  try {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    localStorage.removeItem(WORKSPACE_SCHEMA_KEY);
  } catch (error) {
    console.error('Failed to clear workspace data:', error);
  }
};

export const getArtifactById = (id: string): WorkspaceArtifact | null => {
  const ws = getWorkspace();
  return ws.artifacts.find((a) => a.id === id) || null;
};

function announceArtifact(artifact: WorkspaceArtifact, action: 'created' | 'updated'): void {
  try {
    window.dispatchEvent(new CustomEvent(ARTIFACT_EVENT, { detail: { artifact, action } }));
  } catch {
    // Best-effort UI signal only; persistence remains authoritative.
  }
}

export const setActiveArtifact = (id: string): Workspace => {
  const ws = getWorkspace();
  const updated = { ...ws, activeArtifactId: ws.artifacts.some((artifact) => artifact.id === id) ? id : ws.activeArtifactId };
  saveWorkspace(updated);
  return updated;
};

export const saveAgentArtifact = (
  name: string = 'Untitled Document',
  content: string = '',
  type: string = 'markdown',
  existingId?: string
): WorkspaceArtifact => {
  const ws = getWorkspace();

  if (existingId) {
    const existing = ws.artifacts.find((a) => a.id === existingId);
    if (existing) {
      let updatedWs = updateArtifact(ws, existingId, {
        name: name || existing.name,
        content,
        type: type || existing.type,
      });
      updatedWs = createCheckpoint(updatedWs, existingId, 'agent', 'agent');
      const updatedArtifact = updatedWs.artifacts.find((a) => a.id === existingId)!;
      announceArtifact(updatedArtifact, 'updated');
      return updatedArtifact;
    }
  }

  const now = Date.now();
  const newArtifact: WorkspaceArtifact = {
    id: existingId || generateUniqueId('art'),
    name: name || 'Untitled Document',
    content: content || '',
    createdAt: now,
    updatedAt: now,
    type: type || 'markdown',
  };

  let updated: Workspace = {
    ...ws,
    artifacts: [...ws.artifacts, newArtifact],
    activeArtifactId: newArtifact.id,
  };
  updated = createCheckpoint(updated, newArtifact.id, 'agent', 'agent');
  saveWorkspace(updated);
  const artifact = updated.artifacts.find((a) => a.id === newArtifact.id) || newArtifact;
  announceArtifact(artifact, 'created');
  return artifact;
};

export const createArtifact = (workspace: Workspace, name: string = 'Untitled', type: string = 'text'): Workspace => {
  const now = Date.now();
  const newArtifact: WorkspaceArtifact = {
    id: generateUniqueId('art'),
    name,
    content: '',
    createdAt: now,
    updatedAt: now,
    type,
  };

  const updated = { ...workspace, artifacts: [...workspace.artifacts, newArtifact], activeArtifactId: newArtifact.id };
  saveWorkspace(updated);
  announceArtifact(newArtifact, 'created');
  return updated;
};

export const updateArtifact = (workspace: Workspace, artifactId: string, updates: Partial<WorkspaceArtifact>): Workspace => {
  const updated = {
    ...workspace,
    artifacts: workspace.artifacts.map((a) =>
      a.id === artifactId ? { ...a, ...updates, updatedAt: Date.now() } : a
    ),
  };
  saveWorkspace(updated);
  return updated;
};

export const deleteArtifact = (workspace: Workspace, artifactId: string): Workspace => {
  const updatedArtifacts = workspace.artifacts.filter((a) => a.id !== artifactId);
  const activeId = workspace.activeArtifactId === artifactId
    ? (updatedArtifacts.length > 0 ? updatedArtifacts[0].id : null)
    : workspace.activeArtifactId;

  const updated = { ...workspace, artifacts: updatedArtifacts, activeArtifactId: activeId };
  saveWorkspace(updated);
  return updated;
};
