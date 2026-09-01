import { strict as assert } from 'node:assert';
import test from 'node:test';
import { authorizeGoogleAction, classifyGoogleAction } from '../googleAuthorizationPolicy';

test('Google authorization policy classifies external actions', () => {
  assert.equal(classifyGoogleAction('read_google_keep_note'), 'read');
  assert.equal(classifyGoogleAction('create_calendar_event'), 'write');
  assert.equal(classifyGoogleAction('complete_google_task'), 'write');
  assert.equal(classifyGoogleAction('move_google_task'), 'write');
  assert.equal(classifyGoogleAction('delete_google_keep_note'), 'destructive');
});

test('Google writes require an authenticated token and explicit confirmation', () => {
  const unauthenticated = authorizeGoogleAction('create_calendar_event', { userConfirmed: true });
  assert.equal(unauthenticated.allowed, false);
  assert.equal(unauthenticated.errorCode, 'GOOGLE_AUTH_REQUIRED');

  const unconfirmed = authorizeGoogleAction('create_calendar_event', {}, 'token');
  assert.equal(unconfirmed.allowed, false);
  assert.equal(unconfirmed.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');

  const confirmed = authorizeGoogleAction('create_calendar_event', { userConfirmed: true }, 'token');
  assert.equal(confirmed.allowed, true);
});

test('Task completion and movement require the same explicit confirmation guard', () => {
  const completion = authorizeGoogleAction('complete_google_task', {}, 'token');
  assert.equal(completion.allowed, false);
  assert.equal(completion.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');

  const move = authorizeGoogleAction('move_google_task', {}, 'token');
  assert.equal(move.allowed, false);
  assert.equal(move.errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');

  assert.equal(authorizeGoogleAction('complete_google_task', { userConfirmed: true }, 'token').allowed, true);
  assert.equal(authorizeGoogleAction('move_google_task', { userConfirmed: true }, 'token').allowed, true);
});

test('Read-only Google actions do not require confirmation', () => {
  const result = authorizeGoogleAction('read_google_keep_note', { noteName: 'notes/123' }, 'token');
  assert.equal(result.allowed, true);
});
