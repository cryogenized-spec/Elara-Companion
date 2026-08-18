import { strict as assert } from 'node:assert';
import test from 'node:test';
import { compareSyncState, computeLineDiff, hashString } from '../syncUtils';

test('hashString normalizes line endings and trailing whitespace', () => {
  assert.equal(hashString('a\r\nb  '), hashString('a\nb'));
});

test('compareSyncState detects local and remote changes against a baseline', () => {
  const baseline = hashString('one\ntwo');
  const localAhead = compareSyncState('one\ntwo\nthree', 'one\ntwo', baseline);
  assert.equal(localAhead.status, 'local_ahead');
  assert.equal(localAhead.localChanged, true);
  assert.equal(localAhead.remoteChanged, false);

  const remoteAhead = compareSyncState('one\ntwo', 'one\ntwo\nthree', baseline);
  assert.equal(remoteAhead.status, 'remote_ahead');
  assert.equal(remoteAhead.localChanged, false);
  assert.equal(remoteAhead.remoteChanged, true);

  const conflict = compareSyncState('local', 'remote', baseline);
  assert.equal(conflict.status, 'conflict');
});

test('computeLineDiff exposes UI-compatible classifications', () => {
  const hunks = computeLineDiff('alpha\nbeta', 'alpha\ngamma');
  assert.ok(hunks.some((h) => h.type === 'context' && h.value.includes('alpha')));
  assert.ok(hunks.some((h) => h.type === 'remote_removed' && h.value.includes('beta')));
  assert.ok(hunks.some((h) => h.type === 'local_added' && h.value.includes('gamma')));
});
