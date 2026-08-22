import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoogleBaseScopes, getGrantedGoogleScopes, isGoogleIdentityAuthorized } from '../googleAuthorization';

test('Google base authorization is identity-only', () => {
  assert.equal(getGoogleBaseScopes(), 'openid email profile');
});

test('Google authorization starts disconnected in a clean test process', () => {
  assert.equal(isGoogleIdentityAuthorized(), false);
  assert.equal(getGrantedGoogleScopes(), '');
});
