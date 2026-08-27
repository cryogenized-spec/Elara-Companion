import type { WorkspaceArtifact } from '../types';
import type { BackgroundJobStatus } from '../lib/backgroundChatClient';
import { publishApplicationEvent } from '../events/applicationEventBus';
import { workspacePersistenceService } from './workspacePersistenceService';

interface ReconciliationDependencies {
  saveWorkspace: typeof workspacePersistenceService.saveWorkspace;
  publishArtifactChanged: (artifact: WorkspaceArtifact, action: 'created' | 'updated') => void;
}

const defaultDependencies: ReconciliationDependencies = {
  saveWorkspace: workspacePersistenceService.saveWorkspace,
  publishArtifactChanged: (artifact, action) => {
    publishApplicationEvent({
      type: 'artifact.changed',
      payload: { artifact, action },
    });
  },
};

export function reconcileBackgroundWorkspaceResult(
  status: BackgroundJobStatus,
  dependencies: ReconciliationDependencies = defaultDependencies,
): void {
  const result = status.output?.result;
  const workspace = result?.workspace;
  if (!workspace) return;

  dependencies.saveWorkspace(workspace);

  const changedIds = new Map<string, 'created' | 'updated'>();
  for (const artifactId of result.createdArtifactIds || []) changedIds.set(artifactId, 'created');
  for (const artifactId of result.modifiedArtifactIds || []) {
    if (!changedIds.has(artifactId)) changedIds.set(artifactId, 'updated');
  }

  for (const [artifactId, action] of changedIds) {
    const artifact = workspace.artifacts.find((item) => item.id === artifactId);
    if (!artifact) continue;
    dependencies.publishArtifactChanged(artifact, action);
  }
}
