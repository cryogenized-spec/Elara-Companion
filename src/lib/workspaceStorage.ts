import { Workspace, WorkspaceArtifact } from '../types';
import { generateUniqueId } from './storage';

const WORKSPACE_STORAGE_KEY = 'elara_workspace_data';

export const getWorkspace = (): Workspace => {
  const data = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data) as Workspace;
    } catch (e) {
      console.error('Failed to parse workspace data', e);
    }
  }
  return {
    id: 'default-workspace',
    name: 'My Workspace',
    artifacts: [],
    activeArtifactId: null,
  };
};

export const saveWorkspace = (workspace: Workspace): void => {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
};

export const getArtifactById = (id: string): WorkspaceArtifact | null => {
  const ws = getWorkspace();
  return ws.artifacts.find((a) => a.id === id) || null;
};

export const setActiveArtifact = (id: string): Workspace => {
  const ws = getWorkspace();
  const updated = {
    ...ws,
    activeArtifactId: id,
  };
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
      const updatedWs = updateArtifact(ws, existingId, {
        name: name || existing.name,
        content,
        type: type || existing.type,
      });
      return updatedWs.artifacts.find((a) => a.id === existingId)!;
    }
  }

  const newArtifact: WorkspaceArtifact = {
    id: existingId || generateUniqueId('art'),
    name: name || 'Untitled Document',
    content: content || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type: type || 'markdown',
  };

  const updated: Workspace = {
    ...ws,
    artifacts: [...ws.artifacts, newArtifact],
    activeArtifactId: newArtifact.id,
  };
  saveWorkspace(updated);
  return newArtifact;
};

export const createArtifact = (workspace: Workspace, name: string = 'Untitled', type: string = 'text'): Workspace => {
  const newArtifact: WorkspaceArtifact = {
    id: generateUniqueId('art'),
    name,
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    type,
  };
  
  const updated = {
    ...workspace,
    artifacts: [...workspace.artifacts, newArtifact],
    activeArtifactId: newArtifact.id,
  };
  saveWorkspace(updated);
  return updated;
};

export const updateArtifact = (workspace: Workspace, artifactId: string, updates: Partial<WorkspaceArtifact>): Workspace => {
  const updated = {
    ...workspace,
    artifacts: workspace.artifacts.map(a => 
      a.id === artifactId ? { ...a, ...updates, updatedAt: Date.now() } : a
    )
  };
  saveWorkspace(updated);
  return updated;
};

export const deleteArtifact = (workspace: Workspace, artifactId: string): Workspace => {
  const updatedArtifacts = workspace.artifacts.filter(a => a.id !== artifactId);
  const activeId = workspace.activeArtifactId === artifactId 
    ? (updatedArtifacts.length > 0 ? updatedArtifacts[0].id : null) 
    : workspace.activeArtifactId;
    
  const updated = {
    ...workspace,
    artifacts: updatedArtifacts,
    activeArtifactId: activeId,
  };
  saveWorkspace(updated);
  return updated;
};
