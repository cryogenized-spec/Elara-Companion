export type LockboxClassification = 'public' | 'config' | 'internal' | 'secret' | 'sensitive' | 'critical';

export type LockboxNamespace = 'app' | 'gemini' | 'google' | 'cloudflare' | 'automation';

export type LockboxEntry = {
  key: string;
  namespace: LockboxNamespace;
  classification: LockboxClassification;
  requiredBy: string[];
  exposure: 'browser' | 'server' | 'worker' | 'ci';
};

export const LOCKBOX_MANIFEST = [
  { key: 'APP_URL', namespace: 'app', classification: 'config', requiredBy: ['server', 'oauth callbacks'], exposure: 'server' },
  { key: 'GEMINI_API_KEY', namespace: 'gemini', classification: 'secret', requiredBy: ['server Gemini', 'automation executor'], exposure: 'server' },
  { key: 'GEMINI_MODEL', namespace: 'gemini', classification: 'config', requiredBy: ['server Gemini', 'automation executor'], exposure: 'server' },
  { key: 'VITE_GOOGLE_CLIENT_ID', namespace: 'google', classification: 'public', requiredBy: ['browser Google OAuth'], exposure: 'browser' },
  { key: 'GOOGLE_CLIENT_ID', namespace: 'google', classification: 'public', requiredBy: ['browser OAuth compatibility'], exposure: 'browser' },
  { key: 'GOOGLE_OAUTH_CLIENT_ID', namespace: 'google', classification: 'config', requiredBy: ['background Google auth worker'], exposure: 'worker' },
  { key: 'GOOGLE_OAUTH_CLIENT_SECRET', namespace: 'google', classification: 'critical', requiredBy: ['background Google auth worker'], exposure: 'worker' },
  { key: 'GOOGLE_OAUTH_REDIRECT_URI', namespace: 'google', classification: 'config', requiredBy: ['background Google auth worker'], exposure: 'worker' },
  { key: 'GOOGLE_VAULT_KV_NAMESPACE_ID', namespace: 'google', classification: 'internal', requiredBy: ['Google auth worker deployment'], exposure: 'ci' },
  { key: 'CLOUDFLARE_API_TOKEN', namespace: 'cloudflare', classification: 'critical', requiredBy: ['Worker deployment'], exposure: 'ci' },
  { key: 'CLOUDFLARE_ACCOUNT_ID', namespace: 'cloudflare', classification: 'internal', requiredBy: ['Worker deployment'], exposure: 'ci' },
  { key: 'ELARA_STATE_REPO', namespace: 'automation', classification: 'config', requiredBy: ['automation dispatcher', 'automation executor'], exposure: 'ci' },
  { key: 'ELARA_STATE_TOKEN', namespace: 'automation', classification: 'critical', requiredBy: ['automation dispatcher', 'automation executor'], exposure: 'ci' },
  { key: 'ELARA_GOOGLE_TOKEN', namespace: 'automation', classification: 'critical', requiredBy: ['automation executor'], exposure: 'ci' },
  { key: 'AUTOMATION_ID', namespace: 'automation', classification: 'internal', requiredBy: ['automation executor'], exposure: 'ci' },
  { key: 'EXECUTION_KEY', namespace: 'automation', classification: 'internal', requiredBy: ['automation executor'], exposure: 'ci' },
] as const satisfies readonly LockboxEntry[];

export function findLockboxEntry(key: string): LockboxEntry | undefined {
  return LOCKBOX_MANIFEST.find((entry) => entry.key === key);
}

export function assertLockboxEntry(key: string, expected: Partial<Pick<LockboxEntry, 'classification' | 'exposure'>> = {}): LockboxEntry {
  const entry = findLockboxEntry(key);
  if (!entry) throw new Error(`Unknown Lockbox key: ${key}`);
  if (expected.classification && entry.classification !== expected.classification) {
    throw new Error(`Lockbox classification mismatch for ${key}: expected ${expected.classification}, got ${entry.classification}`);
  }
  if (expected.exposure && entry.exposure !== expected.exposure) {
    throw new Error(`Lockbox exposure mismatch for ${key}: expected ${expected.exposure}, got ${entry.exposure}`);
  }
  return entry;
}
