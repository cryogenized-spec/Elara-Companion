import { workspaceContract } from '../contracts/implementations';
import type { CanvasData } from '../types';

export type ChatRuntimeWorkspaceChunk = {
  toolCall?: {
    workspace?: unknown;
    createdArtifactId?: string;
    modifiedArtifactId?: string;
  };
  workspace?: unknown;
  artifactIds?: string[];
};

/**
 * Owns Workspace side effects produced by Chat runtime chunks.
 * Chat may interpret the returned artifact ids, but it does not persist Workspace state itself.
 */
export function applyChatRuntimeWorkspaceUpdate(chunk: ChatRuntimeWorkspaceChunk): string[] {
  const touchedArtifactIds = new Set<string>();

  if (chunk.toolCall?.workspace) {
    workspaceContract.saveWorkspace(chunk.toolCall.workspace as Parameters<typeof workspaceContract.saveWorkspace>[0]);
  }
  if (chunk.workspace) {
    workspaceContract.saveWorkspace(chunk.workspace as Parameters<typeof workspaceContract.saveWorkspace>[0]);
  }

  if (chunk.toolCall?.createdArtifactId) touchedArtifactIds.add(chunk.toolCall.createdArtifactId);
  if (chunk.toolCall?.modifiedArtifactId) touchedArtifactIds.add(chunk.toolCall.modifiedArtifactId);
  for (const artifactId of chunk.artifactIds || []) touchedArtifactIds.add(artifactId);

  return Array.from(touchedArtifactIds);
}

/** Persist Chat-generated canvases through the canonical Workspace contract. */
export function persistChatCanvases(canvases: CanvasData[]): CanvasData[] {
  return canvases.map((canvas) => {
    const artifact = workspaceContract.saveAgentArtifact(
      canvas.title || 'Canvas Document',
      canvas.content,
      'markdown',
      canvas.artifactId,
    );
    return {
      ...canvas,
      artifactId: artifact.id,
    };
  });
}
