import { saveWorkspace } from './workspaceStorage';
import { Workspace, WorkspaceArtifact, ArtifactRevision, RevisionSource } from '../types';
import { hashString } from './syncUtils';
import { generateUniqueId } from './storage';

export function createRevisionForArtifact(
  artifact: WorkspaceArtifact,
  source: RevisionSource,
  author: 'user' | 'agent' | 'system'
): WorkspaceArtifact {
  const currentContentHash = hashString(artifact.content);
  
  // Initialize revisions if undefined
  const revisions = artifact.revisions ? [...artifact.revisions] : [];
  
  if (revisions.length > 0) {
    const latestRevision = revisions[revisions.length - 1];
    
    // Duplicate prevention: If the content is identical to the latest revision, do not create a new one.
    if (latestRevision.contentHash === currentContentHash) {
      return artifact; // No changes needed
    }
  } else {
    // If there are no revisions, but the artifact has existing content, we MIGHT want to backfill it 
    // before the new change. However, this function is called AT the checkpoint.
    // So the current content IS what we want to save as a revision.
    // If the content is empty, maybe we don't save a revision?
    // "Do not create meaningless revisions for an empty Untitled artifact unless necessary."
    if (artifact.content.trim() === '') {
      return artifact;
    }
  }

  const nextRevisionNumber = revisions.length > 0 ? revisions[revisions.length - 1].revisionNumber + 1 : 1;

  const newRevision: ArtifactRevision = {
    id: generateUniqueId('rev'),
    artifactId: artifact.id,
    revisionNumber: nextRevisionNumber,
    content: artifact.content,
    createdAt: Date.now(),
    author,
    source,
    contentHash: currentContentHash
  };

  return {
    ...artifact,
    revisions: [...revisions, newRevision]
  };
}

export function restoreRevision(
  workspace: Workspace,
  artifactId: string,
  revisionId: string
): Workspace {
  const artifact = workspace.artifacts.find(a => a.id === artifactId);
  if (!artifact) return workspace;

  const revisions = artifact.revisions || [];
  const revisionToRestore = revisions.find(r => r.id === revisionId);
  if (!revisionToRestore) return workspace;

  // Set the current content to the restored revision's content
  const updatedArtifact = {
    ...artifact,
    content: revisionToRestore.content,
    updatedAt: Date.now()
  };

  // Create a new revision representing this restore
  const artifactWithRestoreRev = createRevisionForArtifact(updatedArtifact, 'restore', 'user');

  const updatedWs = {
    ...workspace,
    artifacts: workspace.artifacts.map(a => a.id === artifactId ? artifactWithRestoreRev : a)
  };
  saveWorkspace(updatedWs);
  return updatedWs;
}

export function createCheckpoint(
  workspace: Workspace,
  artifactId: string,
  source: RevisionSource,
  author: 'user' | 'agent' | 'system'
): Workspace {
  const artifact = workspace.artifacts.find(a => a.id === artifactId);
  if (!artifact) return workspace;

  const artifactWithRevision = createRevisionForArtifact(artifact, source, author);
  
  if (artifactWithRevision === artifact) {
    return workspace; // No new revision was created
  }

  const updatedWs = {
    ...workspace,
    artifacts: workspace.artifacts.map(a => a.id === artifactId ? artifactWithRevision : a)
  };
  saveWorkspace(updatedWs);
  return updatedWs;
}
