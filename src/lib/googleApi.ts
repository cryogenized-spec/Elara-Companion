// Google Workspace provider. V3 keeps one client layer for the UI and agent.

const SCOPES = [
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

const DEFAULT_CLIENT_ID = '988991302383-rj8vah445mk9r991k10pc4knk2omk2p4.apps.googleusercontent.com';
let tokenClient: any = null;
let accessToken = '';

export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('elara_custom_google_client_id');
    if (custom?.trim()) return custom.trim();
  }
  const envVal = (import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID;
  return envVal || DEFAULT_CLIENT_ID;
}

export function setCustomGoogleClientId(id: string | null) {
  if (typeof window !== 'undefined') {
    if (id?.trim()) localStorage.setItem('elara_custom_google_client_id', id.trim());
    else localStorage.removeItem('elara_custom_google_client_id');
  }
  tokenClient = null;
  initGoogleAuth();
}

export function getAccessToken(): string { return accessToken; }
export function isGoogleConnected(): boolean { return Boolean(accessToken); }

export function initGoogleAuth() {
  if (typeof window === 'undefined' || !(window as any).google) return;
  try {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: getGoogleClientId(),
      scope: SCOPES,
      callback: (resp: any) => {
        if (!resp?.error) accessToken = resp.access_token || '';
        else console.error('OAuth token error:', resp);
      },
    });
  } catch (error) {
    console.warn('Could not initialize Google Identity Services:', error);
  }
}

export async function requestGoogleAuth(forcePrompt = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) initGoogleAuth();
    if (!tokenClient) return reject(new Error('Google Identity Services not loaded or initialized.'));
    tokenClient.callback = (resp: any) => {
      if (resp?.error) return reject(new Error(resp.error_description || resp.error || 'Authentication rejected'));
      accessToken = resp.access_token || '';
      resolve(accessToken);
    };
    if (accessToken && !forcePrompt) resolve(accessToken);
    else tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
  });
}

async function parseGoogleApiError(res: Response, prefix: string): Promise<string> {
  const raw = await res.text().catch(() => '');
  try {
    const json = JSON.parse(raw);
    return `${prefix}: ${json?.error?.message || json?.error || `HTTP ${res.status}`}`;
  } catch {
    return `${prefix}: ${raw || `HTTP ${res.status}`}`;
  }
}

function authHeaders(token: string) { return { Authorization: `Bearer ${token}` }; }
function jsonHeaders(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------------- Gmail ----------------
export interface GmailMessageSummary { id: string; threadId: string; from: string; to: string; subject: string; date: string; snippet: string; isUnread: boolean; labels: string[]; }
export interface GmailMessageFull extends GmailMessageSummary { bodyText: string; bodyHtml?: string; }

export async function listGmailMessages(query = '', maxResults = 10): Promise<{ messages: GmailMessageSummary[] }> {
  const token = await requestGoogleAuth();
  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to list Gmail messages'));
  const data = await res.json();
  const rows = await Promise.all((data.messages || []).slice(0, maxResults).map(async (item: any) => {
    try {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, { headers: authHeaders(token) });
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];
      const header = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      const labels = detail.labelIds || [];
