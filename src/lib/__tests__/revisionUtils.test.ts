import { strict as assert } from 'node:assert';
import test, { beforeEach } from 'node:test';
import { compareRevisions, createRevisionForArtifact, restoreRevision } from '../revisionUtils';
import { WorkspaceArtifact } from '../../types';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

beforeEach(() => storage.clear());

function artifact(content: string): WorkspaceArtifact {
  return {
    id: 'art_test',
    name: 'Test.md',
    content,
    createdAt: 1,
    updatedAt: 1,
    type: 'markdown',
    provider: 'local',
    revisions: [],
  };
}

test('createRevisionForArtifact creates the first non-empty revision and prevents duplicates', () => {
  const first = createRevisionForArtifact(artifact('one'), 'user', 'user');
  assert.equal(first.revisions?.length, 1);
  assert.equal(first.revisions?.[0].revisionNumber, 1);

  const duplicate = createRevisionForArtifact(first, 'user', 'user');
  assert.equal(duplicate.revisions?.length, 1);
  assert.equal(duplicate, first);
});

test('compareRevisions supports revision-to-revision and revision-to-current comparisons', () => {
  let current = createRevisionForArtifact(artifact('alpha\nbeta'), 'user', 'user');
  current = createRevisionForArtifact({ ...current, content: 'alpha\ngamma' }, 'user', 'user');
  const revisions = current.revisions || [];

  const comparison = compareRevisions(
    { id: 'ws', name: 'Workspace', artifacts: [current], activeArtifactId: current.id },
    current.id,
    revisions[0].id,
    revisions[1].id
  );

  assert.equal(comparison.success, true);
  assert.equal(comparison.identical, false);
  assert.ok(comparison.hunks?.some((h) => h.type === 'local_added'));
  assert.ok(comparison.hunks?.some((h) => h.type === 'remote_removed'));

  const currentComparison = compareRevisions(
    { id: 'ws', name: 'Workspace', artifacts: [current], activeArtifactId: current.id },
    current.id,
    revisions[0].id,
    null
  );
  assert.equal(currentComparison.success, true);
  assert.equal(currentComparison.targetB?.kind, 'current');
});

test('restoreRevision creates a new restore revision instead of rewriting history', () => {
  let current = createRevisionForArtifact(artifact('original'), 'user', 'user');
  current = createRevisionForArtifact({ ...current, content: 'changed' }, 'user', 'user');
  const workspace = { id: 'ws', name: 'Workspace', artifacts: [current], activeArtifactId: current.id };
  const restored = restoreRevision(workspace, current.id, current.revisions![0].id);

  const restoredArtifact = restored.artifacts[0];
  assert.equal(restoredArtifact.content, 'original');
  assert.equal(restoredArtifact.revisions?.length, 3);
  assert.equal(restoredArtifact.revisions?.[2].source, 'restore');
});
