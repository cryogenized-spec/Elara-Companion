import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

async function getGoogleGmailAccessToken(capability: GoogleCapability): Promise<string> {
  const token = googleIdentity.getAccessToken();
  if (token && googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability)) return token;
  return googleIdentity.requestCapabilityAuthorization(googleCapabilities.getScopes(capability), false);
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

export interface GmailMessageSummary { id: string; threadId: string; from: string; to: string; subject: string; date: string; snippet: string; isUnread: boolean; labels: string[]; }
export interface GmailMessageFull extends GmailMessageSummary { bodyText: string; bodyHtml?: string; }

export async function listGmailMessages(query = '', maxResults = 10): Promise<{ messages: GmailMessageSummary[] }> {
  const token = await getGoogleGmailAccessToken('gmail.read');
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
      return { id: detail.id, threadId: detail.threadId, from: header('From') || 'Unknown Sender', to: header('To') || 'Me', subject: header('Subject') || '(No Subject)', date: header('Date') || '', snippet: detail.snippet || '', isUnread: labels.includes('UNREAD'), labels } as GmailMessageSummary;
    } catch { return null; }
  }));
  return { messages: rows.filter(Boolean) as GmailMessageSummary[] };
}

export async function getGmailMessageDetails(messageId: string): Promise<GmailMessageFull> {
  const token = await getGoogleGmailAccessToken('gmail.read');
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to fetch email details'));
  const data = await res.json();
  const headers = data.payload?.headers || [];
  const header = (name: string) => headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
  let bodyText = data.snippet || '';
  const decode = (s: string) => { try { let b = s.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const bin = atob(b); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); } catch { return ''; } };
  const walk = (part: any) => { if (!part) return; if (part.mimeType === 'text/plain' && part.body?.data) bodyText = decode(part.body.data); (part.parts || []).forEach(walk); };
  walk(data.payload);
  const labels = data.labelIds || [];
  return { id: data.id, threadId: data.threadId, from: header('From') || 'Unknown Sender', to: header('To') || 'Me', subject: header('Subject') || '(No Subject)', date: header('Date') || '', snippet: data.snippet || '', isUnread: labels.includes('UNREAD'), labels, bodyText };
}

export async function createGmailDraft(to: string, subject: string, bodyText: string): Promise<{ draftId: string; messageId: string }> {
  const token = await getGoogleGmailAccessToken('gmail.compose');
  const raw = encodeBase64Url([`To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', bodyText].join('\r\n'));
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ message: { raw } }) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to create Gmail draft'));
  const data = await res.json();
  return { draftId: data.id, messageId: data.message?.id };
}

export async function sendGmailMessage(to: string, subject: string, bodyText: string, inReplyTo?: string, threadId?: string): Promise<{ messageId: string; threadId: string }> {
  const token = await getGoogleGmailAccessToken('gmail.send');
  const headers = [`To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8'];
  if (inReplyTo) { headers.push(`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`); }
  headers.push('', bodyText);
  const payload: any = { raw: encodeBase64Url(headers.join('\r\n')) };
  if (threadId) payload.threadId = threadId;
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to send Gmail message'));
  const data = await res.json();
  return { messageId: data.id, threadId: data.threadId };
}
