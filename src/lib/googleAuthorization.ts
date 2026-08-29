const DEFAULT_CLIENT_ID = '988991302383-rj8vah445mk9r991k10pc4knk2omk2p4.apps.googleusercontent.com';
const BASE_SCOPES = ['openid', 'email', 'profile'].join(' ');
const CUSTOM_CLIENT_ID_KEY = 'elara_custom_google_client_id';

let tokenClient: any = null;
let accessToken = '';
let grantedScopes = '';
let accessTokenExpiresAt = 0;

export interface GoogleAuthorizationState {
  clientId: string;
  authorized: boolean;
  accessToken: string;
  expiresAt: number;
  grantedScopes: string;
}

export interface GoogleAuthorizationErrorDetails {
  kind: 'oauth_error' | 'authorization_rejected' | 'authorization_unavailable';
  error: string;
  errorDescription?: string;
  errorUri?: string;
  clientId: string;
  requestedScopes: string[];
  origin: string;
  incremental: boolean;
}

export class GoogleAuthorizationError extends Error {
  readonly details: GoogleAuthorizationErrorDetails;

  constructor(details: GoogleAuthorizationErrorDetails) {
    super(details.errorDescription || details.error || 'Google authorization failed.');
    this.name = 'GoogleAuthorizationError';
    this.details = details;
  }
}

function getClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(CUSTOM_CLIENT_ID_KEY);
    if (custom?.trim()) return custom.trim();
  }
  const env = typeof import.meta !== 'undefined' && (import.meta as any)?.env
    ? (import.meta as any).env
    : undefined;
  return env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
}

function getOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'unknown';
}

function clearAuthorizationState(): void {
  accessToken = '';
  grantedScopes = '';
  accessTokenExpiresAt = 0;
}

function applyAuthorizationResponse(response: any, fallbackScopes: string): string {
  accessToken = response?.access_token || '';
  grantedScopes = response?.scope || fallbackScopes || '';
  const expiresInSeconds = Number(response?.expires_in);
  accessTokenExpiresAt = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? Date.now() + (expiresInSeconds * 1000)
    : 0;
  return accessToken;
}

function buildAuthorizationError(response: any, scopes: string[], incremental: boolean): GoogleAuthorizationError {
  const error = String(response?.error || 'authorization_rejected');
  const errorDescription = response?.error_description ? String(response.error_description) : undefined;
  const errorUri = response?.error_uri ? String(response.error_uri) : undefined;
  return new GoogleAuthorizationError({
    kind: response?.error ? 'oauth_error' : 'authorization_rejected',
    error,
    ...(errorDescription ? { errorDescription } : {}),
    ...(errorUri ? { errorUri } : {}),
    clientId: getClientId(),
    requestedScopes: [...scopes],
    origin: getOrigin(),
    incremental,
  });
}

export function getGoogleBaseScopes(): string { return BASE_SCOPES; }
export function getGoogleAuthorizationClientId(): string { return getClientId(); }
export function getGoogleIdentityAccessToken(): string {
  if (accessTokenExpiresAt > 0 && Date.now() >= accessTokenExpiresAt) {
    clearAuthorizationState();
  }
  return accessToken;
}
export function isGoogleIdentityAuthorized(): boolean { return Boolean(getGoogleIdentityAccessToken()); }
export function getGrantedGoogleScopes(): string { return isGoogleIdentityAuthorized() ? grantedScopes : ''; }
export function getGoogleAuthorizationState(): GoogleAuthorizationState {
  const token = getGoogleIdentityAccessToken();
  return {
    clientId: getClientId(),
    authorized: Boolean(token),
    accessToken: token,
    expiresAt: accessTokenExpiresAt,
    grantedScopes: token ? grantedScopes : '',
  };
}

export function setCustomGoogleClientId(id: string | null): void {
  if (typeof window !== 'undefined') {
    if (id?.trim()) localStorage.setItem(CUSTOM_CLIENT_ID_KEY, id.trim());
    else localStorage.removeItem(CUSTOM_CLIENT_ID_KEY);
  }
  tokenClient = null;
}

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
    if (!tokenClient) return reject(new GoogleAuthorizationError({ kind: 'authorization_unavailable', error: 'gis_unavailable', clientId: getClientId(), requestedScopes: BASE_SCOPES.split(' '), origin: getOrigin(), incremental: false }));

    tokenClient.callback = (response: any) => {
      if (response?.error) return reject(buildAuthorizationError(response, BASE_SCOPES.split(' '), false));
      if (!response?.access_token) return reject(buildAuthorizationError({ error: 'missing_access_token', error_description: 'Google Identity Services completed without returning an access token.' }, BASE_SCOPES.split(' '), false));
      resolve(applyAuthorizationResponse(response, BASE_SCOPES));
    };
    tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
}

export async function requestGoogleCapabilityAuthorization(scopes: string[], forcePrompt = false): Promise<string> {
  const normalized = [...new Set(scopes.map(scope => scope.trim()).filter(Boolean))];
  if (!normalized.length) return requestGoogleBaseAuthorization(forcePrompt);
  if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
    throw new GoogleAuthorizationError({ kind: 'authorization_unavailable', error: 'gis_unavailable', clientId: getClientId(), requestedScopes: normalized, origin: getOrigin(), incremental: true });
  }
  const client = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: normalized.join(' '),
    include_granted_scopes: true,
    callback: () => {},
  });
  return new Promise((resolve, reject) => {
    client.callback = (response: any) => {
      if (response?.error) return reject(buildAuthorizationError(response, normalized, true));
      if (!response?.access_token) return reject(buildAuthorizationError({ error: 'missing_access_token', error_description: 'Google Identity Services completed without returning an access token.' }, normalized, true));
      resolve(applyAuthorizationResponse(response, grantedScopes));
    };
    client.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
}

export async function revokeGoogleBaseAuthorization(): Promise<{ success: boolean; message: string }> {
  const token = getGoogleIdentityAccessToken();
  clearAuthorizationState();
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
