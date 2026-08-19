import { strict as assert } from 'node:assert';
import test, { beforeEach } from 'node:test';
import { createArtifact, getWorkspace, saveWorkspace, setActiveArtifact } from '../workspaceStorage';
import { Workspace } from '../../types';

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

test('Workspace persists through the same browser storage used for reads and writes', () => {
  const workspace: Workspace = {
    id: 'ws',
    name: 'Workspace',
    artifacts: [],
    activeArtifactId: null,
  };

  saveWorkspace(workspace);
  const loaded = getWorkspace();
  assert.equal(loaded.id, 'ws');
  assert.equal(loaded.name, 'Workspace');
});

test('createArtifact persists the new active artifact', () => {
  const workspace = { id: 'ws', name: 'Workspace', artifacts: [], activeArtifactId: null } satisfies Workspace;
  const updated = createArtifact(workspace, 'Notes.md', 'markdown');
  const reloaded = getWorkspace();

  assert.equal(reloaded.activeArtifactId, updated.activeArtifactId);
  assert.equal(reloaded.artifacts.length, 1);
  assert.equal(reloaded.artifacts[0].name, 'Notes.md');
});

test('malformed stored Workspace falls back safely', () => {
  storage.setItem('elara_workspace_data', '{not-json');
  const loaded = getWorkspace();
  assert.equal(loaded.id, 'default-workspace');
  assert.deepEqual(loaded.artifacts, []);
});

test('stored Workspace is normalized and dangling activeArtifactId is repaired', () => {
  storage.setItem('elara_workspace_data', JSON.stringify({
    id: 'ws',
    name: 'Workspace',
    activeArtifactId: 'missing',
    artifacts: [
      { id: 'valid', name: 'Valid.md', content: 'hello', createdAt: 1, updatedAt: 2, type: 'markdown', revisions: [] },
      { id: 'invalid' },
    ],
  }));

  const loaded = getWorkspace();
  assert.equal(loaded.artifacts.length, 1);
  assert.equal(loaded.artifacts[0].id, 'valid');
  assert.equal(loaded.activeArtifactId, 'valid');
});

test('setActiveArtifact ignores unknown IDs instead of corrupting active state', () => {
  const workspace = { id: 'ws', name: 'Workspace', artifacts: [], activeArtifactId: null } satisfies Workspace;
  createArtifact(workspace, 'Notes.md', 'markdown');
  const updated = setActiveArtifact('missing');
  assert.notEqual(updated.activeArtifactId, 'missing');
});
