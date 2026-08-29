import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoogleBaseScopes, getGrantedGoogleScopes, isGoogleIdentityAuthorized } from '../googleAuthorization';
import { getGoogleCapabilityScopes } from '../googleCapabilityPolicy';

test('base Google authorization remains identity-only', () => {
  assert.equal(getGoogleBaseScopes(), 'openid email profile');
});

test('capability authorization scopes come from the canonical policy', () => {
  assert.deepEqual(getGoogleCapabilityScopes('gmail.read'), ['https://www.googleapis.com/auth/gmail.readonly']);
});

test('authorization starts disconnected in a clean process', () => {
  assert.equal(isGoogleIdentityAuthorized(), false);
  assert.equal(getGrantedGoogleScopes(), '');
});
