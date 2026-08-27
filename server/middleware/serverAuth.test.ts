import test from 'node:test';
import assert from 'node:assert/strict';

function authorize(isProduction: boolean, configuredToken: string | undefined, suppliedHeader: string | undefined): { status?: number; next: boolean } {
  if (!isProduction) return { next: true };
  if (!configuredToken) return { status: 503, next: false };
  const supplied = suppliedHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!supplied || supplied !== configuredToken) return { status: 401, next: false };
  return { next: true };
}

test('production backend rejects missing trust token', () => {
  assert.deepEqual(authorize(true, undefined, undefined), { status: 503, next: false });
});

test('production backend rejects missing or incorrect bearer token', () => {
  assert.deepEqual(authorize(true, 'secret', undefined), { status: 401, next: false });
  assert.deepEqual(authorize(true, 'secret', 'Bearer wrong'), { status: 401, next: false });
});

test('production backend accepts exact bearer token', () => {
  assert.deepEqual(authorize(true, 'secret', 'Bearer secret'), { next: true });
});

test('local development does not require the production bearer token', () => {
  assert.deepEqual(authorize(false, undefined, undefined), { next: true });
});
