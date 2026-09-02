import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoogleBaseScopes, getGrantedGoogleScopes, isGoogleIdentityAuthorized } from '../googleAuthorization';
import { getGoogleCapabilityScopes } from '../googleCapabilityPolicy';

test('base Google authorization remains identity-only', () => {
  assert.equal(getGoogleBaseScopes(), 'openid email profile');
});

test('capability authorization scopes come from the canonical policy', () => {
  assert.deepEqual(getGoogleCapabilityScopes('gmail.read'), ['https://www.googleapis.com/auth/gmail.readonly']);
  assert.deepEqual(getGoogleCapabilityScopes('calendar.list'), ['https://www.googleapis.com/auth/calendar.calendarlist.readonly']);
  assert.deepEqual(getGoogleCapabilityScopes('calendar.freebusy'), ['https://www.googleapis.com/auth/calendar.freebusy']);
});

test('calendar discovery and availability scopes remain narrower than broad calendar access', () => {
  assert.notDeepEqual(getGoogleCapabilityScopes('calendar.list'), ['https://www.googleapis.com/auth/calendar']);
  assert.notDeepEqual(getGoogleCapabilityScopes('calendar.freebusy'), ['https://www.googleapis.com/auth/calendar']);
});

test('authorization starts disconnected in a clean process', () => {
  assert.equal(isGoogleIdentityAuthorized(), false);
  assert.equal(getGrantedGoogleScopes(), '');
});
