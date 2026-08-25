import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeTouchedArtifactIds } from '../agentToolExecutionService';

test('tool boundary merges created and modified artifact ids without duplicates', () => {
  const merged = mergeTouchedArtifactIds(
    ['artifact-1'],
    {
      result: { ok: true },
      updatedWorkspace: { artifacts: [], activeArtifactId: null } as any,
      createdArtifactId: 'artifact-2',
      modifiedArtifactId: 'artifact-1',
    } as any,
  );

  assert.deepEqual(merged, ['artifact-1', 'artifact-2']);
});
