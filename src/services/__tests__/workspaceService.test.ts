import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceService } from '../workspaceService';

test('workspace service exposes application-shaped artifact mutation commands', () => {
  assert.equal(typeof workspaceService.selectArtifact, 'function');
  assert.equal(typeof workspaceService.removeArtifact, 'function');
  assert.equal(typeof workspaceService.updateArtifactById, 'function');
});

test('workspace commands own workspace lookup internally', () => {
  assert.equal(workspaceService.selectArtifact.length, 1);
  assert.equal(workspaceService.removeArtifact.length, 1);
  assert.equal(workspaceService.updateArtifactById.length, 2);
});
