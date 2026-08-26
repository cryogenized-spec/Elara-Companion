import type { BackgroundJobStatus } from '../lib/backgroundChatClient';
import { publishApplicationEvent } from '../events/applicationEventBus';
import { saveWorkspace } from '../lib/workspaceStorage';

export function reconcileBackgroundWorkspaceResult(status: BackgroundJobStatus): void {
  const result = status.output?.result;
  const workspace = result?.workspace;
  if (!workspace) return;

  saveWorkspace(workspace);

  const changedIds = new Map<string, 'created' | 'updated'>();
  for (const artifactId of result.createdArtifactIds || []) changedIds.set(artifactId, 'created');
  for (const artifactId of result.modifiedArtifactIds || []) {
    if (!changedIds.has(artifactId)) changedIds.set(artifactId, 'updated');
  }

  for (const [artifactId, action] of changedIds) {
    const artifact = workspace.artifacts.find((item) => item.id === artifactId);
    if (!artifact) continue;
    publishApplicationEvent({
      type: 'artifact.changed',
      payload: { artifact, action },
    });
  }
}

export function publishBackgroundCompletion(status: BackgroundJobStatus, jobId: string): void {
  publishApplicationEvent({
    type: 'background.job.completed',
    payload: { jobId, status: status.status },
  });
}
