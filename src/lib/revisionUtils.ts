import { saveWorkspace } from './workspaceStorage';
import { Workspace, WorkspaceArtifact, ArtifactRevision, RevisionSource } from '../types';
import { hashString, computeLineDiff, DiffResult } from './syncUtils';
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

export type ComparisonTarget =
  | { kind: 'revision'; revision: ArtifactRevision }
  | { kind: 'current'; contentHash: string; content: string };

export interface RevisionComparisonResult {
  success: boolean;
  error?: string;
  targetA?: ComparisonTarget;
  targetB?: ComparisonTarget;
  identical?: boolean;
  hunks?: DiffResult[];
}

export function compareRevisions(
  workspace: Workspace,
  artifactId: string,
  revisionAId: string | null,
  revisionBId: string | null
): RevisionComparisonResult {
  const artifact = workspace.artifacts.find(a => a.id === artifactId);
  if (!artifact) {
    return { success: false, error: 'Artifact not found' };
  }

  const revisions = artifact.revisions || [];
  
  const getTargetInfo = (id: string | null): ComparisonTarget | undefined => {
    if (id === null) {
      return {
        kind: 'current',
        contentHash: hashString(artifact.content),
        content: artifact.content
      };
    }
    const rev = revisions.find(r => r.id === id);
    if (rev) {
      return { kind: 'revision', revision: rev };
    }
    return undefined;
  };

  const targetA = getTargetInfo(revisionAId);
  if (!targetA) {
    return { success: false, error: 'Revision A not found in this artifact' };
  }

  const targetB = getTargetInfo(revisionBId);
  if (!targetB) {
    return { success: false, error: 'Revision B not found in this artifact' };
  }

  const hashA = targetA.kind === 'revision' ? targetA.revision.contentHash : targetA.contentHash;
  const hashB = targetB.kind === 'revision' ? targetB.revision.contentHash : targetB.contentHash;

  const identical = hashA === hashB;
  let hunks: DiffResult[] = [];
  
  if (!identical) {
    const contentA = targetA.kind === 'revision' ? targetA.revision.content : targetA.content;
    const contentB = targetB.kind === 'revision' ? targetB.revision.content : targetB.content;
    hunks = computeLineDiff(contentA, contentB);
  }

  return {
    success: true,
    targetA,
    targetB,
    identical,
    hunks
  };
}
