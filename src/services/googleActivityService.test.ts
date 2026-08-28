import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleActivityRecorder } from './googleActivityService';

test('activity recorder keeps newest entries first and caps the history', () => {
  const recorder = createGoogleActivityRecorder();
  for (let i = 0; i < 205; i += 1) {
    recorder.record({ id: String(i), timestamp: i, capabilityId: 'gmail', action: 'read', description: `Read ${i}`, reversible: false, external: true });
  }
  const entries = recorder.list(500);
  assert.equal(entries.length, 200);
  assert.equal(entries[0].id, '204');
  assert.equal(entries.at(-1)?.id, '5');
});

test('activity recorder returns defensive copies and supports clear', () => {
  const recorder = createGoogleActivityRecorder();
  recorder.record({ id: '1', timestamp: 1, capabilityId: 'drive', action: 'open', description: 'Opened Drive', reversible: false, external: true });
  const listed = recorder.list();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].description, 'Opened Drive');
  recorder.clear();
  assert.equal(recorder.list().length, 0);
});
