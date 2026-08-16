import { getWorkspace, createArtifact, updateArtifact, deleteArtifact } from './workspaceStorage';

export const executeWorkspaceOperation = (toolCall: { name: string; args: any }) => {
  const { name, args } = toolCall;
  try {
    const workspace = getWorkspace();
    
    switch (name) {
      case 'create_artifact': {
        const { name: artifactName, type, content } = args;
        if (!artifactName || !type || typeof content !== 'string') {
          return { success: false, error: 'Missing required parameters (name, type, content)' };
        }
        const updated = createArtifact(workspace, artifactName, type);
        // Find the newly created artifact (it's the active one now)
        const newArtifact = updated.artifacts.find(a => a.id === updated.activeArtifactId);
        if (!newArtifact) {
           return { success: false, error: 'Failed to create artifact' };
        }
        const finalWorkspace = updateArtifact(updated, newArtifact.id, { content });
        return { success: true, operation: name, artifactId: newArtifact.id };
      }
      
      case 'update_artifact': {
        const { artifact_id, content } = args;
        if (!artifact_id || typeof content !== 'string') {
          return { success: false, error: 'Missing required parameters (artifact_id, content)' };
        }
        const existing = workspace.artifacts.find(a => a.id === artifact_id);
        if (!existing) {
          return { success: false, error: 'Artifact not found' };
        }
        updateArtifact(workspace, artifact_id, { content });
        return { success: true, operation: name, artifactId: artifact_id };
      }
      
      case 'read_artifact': {
        const { artifact_id } = args;
        if (!artifact_id) {
          return { success: false, error: 'Missing artifact_id' };
        }
        const existing = workspace.artifacts.find(a => a.id === artifact_id);
        if (!existing) {
          return { success: false, error: 'Artifact not found' };
        }
        return { success: true, operation: name, artifactId: artifact_id, content: existing.content };
      }
      
      case 'list_artifacts': {
        return { 
          success: true, 
          operation: name, 
          artifacts: workspace.artifacts.map(a => ({ id: a.id, name: a.name, type: a.type, createdAt: a.createdAt, updatedAt: a.updatedAt })) 
        };
      }
      
      case 'rename_artifact': {
        const { artifact_id, name: newName } = args;
        if (!artifact_id || !newName) {
          return { success: false, error: 'Missing parameters (artifact_id, name)' };
        }
        const existing = workspace.artifacts.find(a => a.id === artifact_id);
        if (!existing) {
          return { success: false, error: 'Artifact not found' };
        }
        updateArtifact(workspace, artifact_id, { name: newName });
        return { success: true, operation: name, artifactId: artifact_id };
      }
      
      case 'delete_artifact': {
        const { artifact_id } = args;
        if (!artifact_id) {
          return { success: false, error: 'Missing artifact_id' };
        }
        const existing = workspace.artifacts.find(a => a.id === artifact_id);
        if (!existing) {
          return { success: false, error: 'Artifact not found' };
        }
        // Requirement: "Do not allow an agent-generated delete request to bypass application safety mechanisms. For now, it is acceptable for destructive agent operations to require explicit user confirmation."
        // We will just fail deletion here, or we can prompt a native browser confirm!
        if (window.confirm(`Elara wants to delete artifact "${existing.name}". Allow?`)) {
           deleteArtifact(workspace, artifact_id);
           return { success: true, operation: name, artifactId: artifact_id };
        } else {
           return { success: false, error: 'User denied deletion confirmation.' };
        }
      }
      
      default:
        return { success: false, error: `Unknown operation: ${name}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Internal storage error' };
  }
};
