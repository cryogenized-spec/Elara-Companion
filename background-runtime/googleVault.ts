const GOOGLE_VAULT_KEY = 'elara:google:v1';
const GOOGLE_OAUTH_STATE_PREFIX = 'elara:google:oauth-state:';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/keep',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.spaces.create',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.memberships.readonly',
].join(' ');

type GoogleVaultRecord = {
  refreshToken: string;
  scope?: string;
  tokenType?: string;
  createdAt: string;
  updatedAt: string;
};

type OAuthStateRecord = {
  value: string;
  createdAt: number;
};

export type GoogleVaultEnv = {
  GOOGLE_VAULT_KV: KVNamespace;
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_OAUTH_REDIRECT_URI: string;
};

export async function createOAuthState(env: GoogleVaultEnv): Promise<string> {
  const state = crypto.randomUUID();
  const key = `${GOOGLE_OAUTH_STATE_PREFIX}${state}`;
  const record: OAuthStateRecord = { value: state, createdAt: Date.now() };
  await env.GOOGLE_VAULT_KV.put(key, JSON.stringify(record), { expirationTtl: 10 * 60 });
  return state;
}

export function buildGoogleAuthorizationUrl(env: GoogleVaultEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function consumeOAuthState(env: GoogleVaultEnv, state: string): Promise<boolean> {
  if (!state) return false;
  const key = `${GOOGLE_OAUTH_STATE_PREFIX}${state}`;
  const record = await env.GOOGLE_VAULT_KV.get<OAuthStateRecord>(key, 'json');
  await env.GOOGLE_VAULT_KV.delete(key);
  return Boolean(record?.value === state);
}

export async function exchangeAuthorizationCode(env: GoogleVaultEnv, code: string): Promise<void> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const raw = await response.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch {}
  if (!response.ok || !data?.refresh_token) {
    throw new Error(data?.error_description || data?.error || `Google token exchange failed (HTTP ${response.status}).`);
  }

  const now = new Date().toISOString();
  const existing = await getVaultRecord(env);
  const record: GoogleVaultRecord = {
    refreshToken: data.refresh_token,
    scope: data.scope || existing?.scope,
    tokenType: data.token_type || existing?.tokenType || 'Bearer',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await env.GOOGLE_VAULT_KV.put(GOOGLE_VAULT_KEY, JSON.stringify(record));
}

async function getVaultRecord(env: GoogleVaultEnv): Promise<GoogleVaultRecord | null> {
  return env.GOOGLE_VAULT_KV.get<GoogleVaultRecord>(GOOGLE_VAULT_KEY, 'json');
}

export async function getFreshGoogleAccessToken(env: GoogleVaultEnv): Promise<string> {
  const record = await getVaultRecord(env);
  if (!record?.refreshToken) throw new Error('Google Workspace is not connected to the background runtime.');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: record.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const raw = await response.text();
  let data: any = null;
  try { data = JSON.parse(raw); } catch {}
  if (!response.ok || !data?.access_token) {
    if (data?.error === 'invalid_grant') await clearGoogleVault(env);
    throw new Error(data?.error_description || data?.error || `Google token refresh failed (HTTP ${response.status}).`);
  }
  return data.access_token;
}

export async function getGoogleConnectionStatus(env: GoogleVaultEnv): Promise<{ connected: boolean; updatedAt?: string }> {
  const record = await getVaultRecord(env);
  return { connected: Boolean(record?.refreshToken), updatedAt: record?.updatedAt };
}

export async function clearGoogleVault(env: GoogleVaultEnv): Promise<void> {
  const record = await getVaultRecord(env);
  if (record?.refreshToken) {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: record.refreshToken }).toString(),
    }).catch(() => undefined);
  }
  await env.GOOGLE_VAULT_KV.delete(GOOGLE_VAULT_KEY);
}
