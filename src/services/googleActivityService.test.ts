import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleActivityRecorder, inferActivityAction, recordGoogleToolActivity } from './googleActivityService';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.data.keys())[index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

test('activity recorder keeps newest entries first and caps the history', () => {
  const recorder = createGoogleActivityRecorder(new MemoryStorage());
  for (let i = 0; i < 205; i += 1) {
    recorder.record({ id: String(i), timestamp: i, capabilityId: 'gmail', action: 'read', description: `Read ${i}`, reversible: false, external: true, consequential: false });
  }
  const entries = recorder.list(500);
  assert.equal(entries.length, 200);
  assert.equal(entries[0].id, '204');
  assert.equal(entries.at(-1)?.id, '5');
});

test('activity survives recorder recreation with persistent storage', () => {
  const storage = new MemoryStorage();
  const first = createGoogleActivityRecorder(storage);
  first.record({ id: 'persist-1', timestamp: 123, capabilityId: 'calendar', action: 'create', description: 'Created Calendar event', reversible: true, external: true, consequential: true, resource: { type: 'event', id: 'event_123', url: 'https://calendar.google.com/calendar/u/0/r/event?token=secret&foo=1' } });
  const second = createGoogleActivityRecorder(storage);
  const entry = second.list()[0];
  assert.equal(entry.id, 'persist-1');
  assert.equal(entry.description, 'Created Calendar event');
  assert.equal(entry.resource?.id, 'event_123');
  assert.equal(entry.resource?.url, 'https://calendar.google.com/calendar/u/0/r/event?foo=1');
});

test('activity recorder returns defensive copies and supports clear', () => {
  const recorder = createGoogleActivityRecorder(new MemoryStorage());
  recorder.record({ id: '1', timestamp: 1, capabilityId: 'drive', action: 'open', description: 'Opened Drive', reversible: false, external: true, consequential: false, resource: { type: 'file', id: 'abc' } });
  const listed = recorder.list();
  assert.equal(listed.length, 1);
  listed[0].resource!.id = 'changed';
  assert.equal(recorder.list()[0].resource?.id, 'abc');
  recorder.clear();
  assert.equal(recorder.list().length, 0);
});

test('activity scrubbing removes credential-shaped values without altering normal resource ids', () => {
  const recorder = createGoogleActivityRecorder(new MemoryStorage());
  recorder.record({ id: '2', timestamp: 2, capabilityId: 'gmail', action: 'read', description: 'Read Gmail with access_token=super-secret', reversible: false, external: true, consequential: false, resource: { type: 'message', id: '01HABC123XYZ9876543210' } });
  const entry = recorder.list()[0];
  assert.doesNotMatch(entry.description, /access_token=super-secret/);
  assert.equal(entry.resource?.id, '01HABC123XYZ9876543210');
  const persisted = new MemoryStorage();
  createGoogleActivityRecorder(persisted).record({ id: '3', timestamp: 3, capabilityId: 'drive', action: 'read', description: 'Bearer abcdefghijklmnopqrstuvwxyz', reversible: false, external: true, consequential: false });
  assert.doesNotMatch(persisted.getItem('elara_google_activity_v1') || '', /abcdefghijklmnopqrstuvwxyz/);
});

test('activity action inference distinguishes meaningful operation descriptions', () => {
  assert.equal(inferActivityAction('Read Gmail messages'), 'read');
  assert.equal(inferActivityAction('Created Gmail draft'), 'create');
  assert.equal(inferActivityAction('Sent Gmail message'), 'send');
  assert.equal(inferActivityAction('Updated Google Doc'), 'update');
  assert.equal(inferActivityAction('Deleted Google Keep note'), 'delete');
  assert.equal(inferActivityAction('Opened Google Drive'), 'open');
});

test('agent tool audit creates a differentiated event with safe resource metadata', () => {
  const recorder = createGoogleActivityRecorder(new MemoryStorage());
  recordGoogleToolActivity(recorder, 'create_google_doc', { success: true, provider: 'google_docs', operation: 'create', documentId: 'doc-123', documentUrl: 'https://docs.google.com/document/d/doc-123/edit?access_token=secret' });
  const entry = recorder.list()[0];
  assert.equal(entry.capabilityId, 'docs');
  assert.equal(entry.action, 'create');
  assert.equal(entry.description, 'Created Google Docs item');
  assert.equal(entry.consequential, true);
  assert.equal(entry.resource?.id, 'doc-123');
  assert.equal(entry.resource?.url, 'https://docs.google.com/document/d/doc-123/edit');
});
