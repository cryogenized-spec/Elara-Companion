import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceService } from '../workspaceService';

test('workspace service exposes application-shaped artifact mutation commands', () => {
  assert.equal(typeof workspaceService.selectArtifact, 'function');
  assert.equal(typeof workspaceService.removeArtifact, 'function');
  assert.equal(typeof workspaceService.updateArtifactById, 'function');
});

test('workspace service mutation commands do not require callers to provide a Workspace snapshot', () => {
  const selectSource = workspaceService.selectArtifact.toString();
  const removeSource = workspaceService.removeArtifact.toString();
  const updateSource = workspaceService.updateArtifactById.toString();

  assert.doesNotMatch(selectSource, /workspaceService\.getWorkspace\(\)/);
  assert.doesNotMatch(removeSource, /deleteArtifact\(current,/);
  assert.doesNotMatch(updateSource, /updateArtifact\(getWorkspace\(\),/);
});
