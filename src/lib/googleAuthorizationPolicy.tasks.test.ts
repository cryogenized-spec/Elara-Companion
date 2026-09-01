import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeGoogleAction, classifyGoogleAction } from './googleAuthorizationPolicy';

test('Google task completion and movement are writes requiring confirmation', () => {
  assert.equal(classifyGoogleAction('complete_google_task'), 'write');
  assert.equal(classifyGoogleAction('move_google_task'), 'write');
  assert.equal(classifyGoogleAction('reorder_google_task'), 'write');
  assert.equal(authorizeGoogleAction('complete_google_task', { userConfirmed: false }, 'token').errorCode, 'GOOGLE_ACTION_CONFIRMATION_REQUIRED');
  assert.equal(authorizeGoogleAction('move_google_task', { userConfirmed: true }, 'token').allowed, true);
});
