import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileBackgroundWorkspaceResult } from '../workspaceBackgroundService';

const workspace = {
  id: 'workspace-1',
  name: 'Workspace',
  activeArtifactId: 'artifact-1',
  artifacts: [
    { id: 'artifact-1', name: 'Created', type: 'text', content: 'created', createdAt: 1, updatedAt: 1 },
    { id: 'artifact-2', name: 'Updated', type: 'text', content: 'updated', createdAt: 1, updatedAt: 2 },
  ],
};

test('background reconciliation saves workspace and emits created/updated artifact events', () => {
  const saved: unknown[] = [];
  const events: Array<{ id: string; action: string }> = [];

  reconcileBackgroundWorkspaceResult({
    id: 'job-1',
    status: 'completed',
    output: { result: {
      workspace,
      createdArtifactIds: ['artifact-1'],
      modifiedArtifactIds: ['artifact-1', 'artifact-2'],
    } },
  }, {
    saveWorkspace: (value) => saved.push(value),
    publishArtifactChanged: (artifact, action) => events.push({ id: artifact.id, action }),
  });

  assert.deepEqual(saved, [workspace]);
  assert.deepEqual(events, [
    { id: 'artifact-1', action: 'created' },
    { id: 'artifact-2', action: 'updated' },
  ]);
});

test('background reconciliation ignores missing artifacts and jobs without workspace output', () => {
  let saves = 0;
  let events = 0;
  const dependencies = {
    saveWorkspace: () => { saves += 1; },
    publishArtifactChanged: () => { events += 1; },
  };

  reconcileBackgroundWorkspaceResult({ id: 'job-empty', status: 'completed' }, dependencies);
  reconcileBackgroundWorkspaceResult({
    id: 'job-missing',
    status: 'completed',
    output: { result: { workspace, createdArtifactIds: ['does-not-exist'] } },
  }, dependencies);

  assert.equal(saves, 1);
  assert.equal(events, 0);
});
