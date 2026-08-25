import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDispatchClaim,
  executionKeyFor,
  isFreshLease,
  shouldDispatch,
  shouldStartExecutor,
} from './automation-runtime.mjs';

test('execution keys are stable per automation and schedule', () => {
  assert.equal(
    executionKeyFor('auto-1', '2026-08-25T12:00:00.000Z'),
    'auto-1:2026-08-25T12:00:00.000Z',
  );
});

test('dispatcher refuses a fresh active claim', () => {
  const now = Date.parse('2026-08-25T12:05:00.000Z');
  const job = createDispatchClaim({
    automationId: 'auto-1',
    scheduledFor: '2026-08-25T12:00:00.000Z',
    executionKey: 'auto-1:2026-08-25T12:00:00.000Z',
    nowIso: '2026-08-25T12:00:00.000Z',
    dispatcherRunId: '123',
  });

  assert.equal(isFreshLease(job, now, 15 * 60 * 1000), true);
  assert.equal(shouldDispatch(job, now, { due: true, manual: false }), false);
});

test('dispatcher can recover an expired dispatch claim', () => {
  const now = Date.parse('2026-08-25T12:31:00.000Z');
  const job = {
    status: 'dispatching',
    updatedAt: '2026-08-25T12:00:00.000Z',
  };

  assert.equal(isFreshLease(job, now, 15 * 60 * 1000), false);
  assert.equal(shouldDispatch(job, now, { due: true, manual: false }), true);
});

test('successful executions are never re-dispatched', () => {
  const now = Date.now();
  assert.equal(shouldDispatch({ status: 'success' }, now, { due: true, manual: false }), false);
  assert.equal(shouldDispatch({ status: 'succeeded' }, now, { due: true, manual: true }), false);
});

test('executor refuses a fresh running execution but can recover a stale one', () => {
  const now = Date.parse('2026-08-25T13:00:00.000Z');
  assert.equal(
    shouldStartExecutor({ status: 'running', updatedAt: '2026-08-25T12:45:00.000Z' }, now),
    false,
  );
  assert.equal(
    shouldStartExecutor({ status: 'running', updatedAt: '2026-08-25T11:00:00.000Z' }, now),
    true,
  );
});

test('executor starts dispatched work', () => {
  assert.equal(
    shouldStartExecutor({ status: 'dispatched', updatedAt: '2026-08-25T12:59:00.000Z' }, Date.parse('2026-08-25T13:00:00.000Z')),
    true,
  );
});
