import assert from 'node:assert/strict';
import test from 'node:test';
import { createCloudflareLockbox } from '../../../background-runtime/lockbox';

test('Cloudflare Lockbox fails closed on missing runtime credentials', () => {
  const env: any = { GOOGLE_VAULT_KV: { put() {}, get() {}, delete() {} } };
  const lockbox = createCloudflareLockbox(env);
  assert.throws(() => lockbox.googleOAuthClientSecret(), /not configured/);
  assert.throws(() => lockbox.geminiApiKey(), /not configured/);
  assert.throws(() => lockbox.backgroundToken(), /not configured/);
});

test('Cloudflare Lockbox exposes only configured values', () => {
  const env: any = {
    GOOGLE_VAULT_KV: { put() {}, get() {}, delete() {} },
    GOOGLE_OAUTH_CLIENT_ID: 'client-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'https://example.test/callback',
    GEMINI_API_KEY: 'gemini-key',
    ELARA_BACKGROUND_TOKEN: 'background-token',
  };
  const lockbox = createCloudflareLockbox(env);
  assert.equal(lockbox.googleOAuthClientId(), 'client-id');
  assert.equal(lockbox.googleOAuthClientSecret(), 'secret');
  assert.equal(lockbox.googleOAuthRedirectUri(), 'https://example.test/callback');
  assert.equal(lockbox.geminiApiKey(), 'gemini-key');
  assert.equal(lockbox.backgroundToken(), 'background-token');
});
