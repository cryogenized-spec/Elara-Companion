const DEFAULT_CLIENT_ID = '988991302383-rj8vah445mk9r991k10pc4knk2omk2p4.apps.googleusercontent.com';
const BASE_SCOPES = ['openid', 'email', 'profile'].join(' ');
const IDENTITY_TOKEN_KEY = 'elara_google_identity_access_token_v1';

let tokenClient: any = null;
let accessToken = '';
let grantedScopes = '';

function getClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('elara_custom_google_client_id');
    if (custom?.trim()) return custom.trim();
  }
  const env = typeof import.meta !== 'undefined' && (import.meta as any)?.env
    ? (import.meta as any).env
    : undefined;
  return env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
}

function persistToken(token: string): void {
  // The token remains memory-first. Storage is only an explicit recovery marker;
  // do not persist the access token itself because it is short-lived credential material.
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(IDENTITY_TOKEN_KEY, token); } catch {}
}

function readToken(): string {
  if (accessToken) return accessToken;
  if (typeof window === 'undefined') return '';
  try {
    const token = sessionStorage.getItem(IDENTITY_TOKEN_KEY) || '';
    accessToken = token;
    return token;
  } catch { return ''; }
}

export function getGoogleBaseScopes(): string { return BASE_SCOPES; }
export function getGoogleAuthorizationClientId(): string { return getClientId(); }
export function getGoogleIdentityAccessToken(): string { return readToken(); }
export function isGoogleIdentityAuthorized(): boolean { return Boolean(readToken()); }
export function getGrantedGoogleScopes(): string { return grantedScopes; }

export function initGoogleBaseAuthorization(): void {
  if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) return;
  try {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: BASE_SCOPES,
      callback: () => {},
    });
  } catch (error) {
    console.warn('Could not initialize Google base authorization:', error);
    tokenClient = null;
  }
}

export async function requestGoogleBaseAuthorization(forcePrompt = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) initGoogleBaseAuthorization();
    if (!tokenClient) return reject(new Error('Google Identity Services authorization is not loaded.'));

    tokenClient.callback = (response: any) => {
      if (response?.error) return reject(new Error(response.error_description || response.error || 'Google authorization was rejected.'));
      accessToken = response.access_token || '';
      grantedScopes = response.scope || BASE_SCOPES;
      persistToken(accessToken);
      resolve(accessToken);
    };

    tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
}

export async function requestGoogleCapabilityAuthorization(scopes: string[], forcePrompt = false): Promise<string> {
  const normalized = [...new Set(scopes.map(scope => scope.trim()).filter(Boolean))];
  if (!normalized.length) return requestGoogleBaseAuthorization(forcePrompt);
  if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
    throw new Error('Google Identity Services authorization is not loaded.');
  }

  const client = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: normalized.join(' '),
    include_granted_scopes: true,
    callback: () => {},
  });

  return new Promise((resolve, reject) => {
    client.callback = (response: any) => {
      if (response?.error) return reject(new Error(response.error_description || response.error || 'Google capability authorization was rejected.'));
      accessToken = response.access_token || accessToken;
      grantedScopes = response.scope || grantedScopes;
      persistToken(accessToken);
      resolve(accessToken);
    };
    client.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
}

export async function revokeGoogleBaseAuthorization(): Promise<{ success: boolean; message: string }> {
  const token = readToken();
  accessToken = '';
  grantedScopes = '';
  if (typeof window !== 'undefined') {
    try { sessionStorage.removeItem(IDENTITY_TOKEN_KEY); } catch {}
  }
  if (!token) return { success: true, message: 'Google authorization was already cleared locally.' };
  try {
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `token=${encodeURIComponent(token)}`,
    });
    return response.ok
      ? { success: true, message: 'Google authorization was revoked.' }
      : { success: false, message: `Google revocation returned HTTP ${response.status}. Local authorization was cleared.` };
  } catch (error: any) {
    return { success: false, message: `Google revocation failed: ${String(error?.message || error || 'network error')}. Local authorization was cleared.` };
  }
}
