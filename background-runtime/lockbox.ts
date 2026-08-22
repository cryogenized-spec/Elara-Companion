export type CloudflareLockboxEnv = {
  GOOGLE_VAULT_KV: KVNamespace;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_OAUTH_REDIRECT_URI: string;
};

function requiredString(env: Record<string, unknown>, key: string): string {
  const value = env[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Required Lockbox binding ${key} is not configured.`);
  }
  return value.trim();
}

export function createCloudflareLockbox(env: CloudflareLockboxEnv) {
  return {
    googleOAuthClientId: () => requiredString(env, 'GOOGLE_OAUTH_CLIENT_ID'),
    googleOAuthClientSecret: () => requiredString(env, 'GOOGLE_OAUTH_CLIENT_SECRET'),
    googleOAuthRedirectUri: () => requiredString(env, 'GOOGLE_OAUTH_REDIRECT_URI'),
    googleVaultKv: () => env.GOOGLE_VAULT_KV,
  };
}
