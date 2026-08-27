import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeBackendToken } from './serverAuth';

test('production backend fails closed when access token is not configured', () => {
  assert.equal(authorizeBackendToken(undefined, undefined), 'missing-configuration');
});

test('backend rejects missing or incorrect bearer token', () => {
  assert.equal(authorizeBackendToken('secret', undefined), 'unauthorized');
  assert.equal(authorizeBackendToken('secret', 'Bearer wrong'), 'unauthorized');
});

test('backend accepts the exact bearer token', () => {
  assert.equal(authorizeBackendToken('secret', 'Bearer secret'), 'authorized');
});

test('token comparison handles different lengths safely', () => {
  assert.equal(authorizeBackendToken('secret', 'Bearer sec'), 'unauthorized');
  assert.equal(authorizeBackendToken('secret', 'Bearer secret-extra'), 'unauthorized');
});
