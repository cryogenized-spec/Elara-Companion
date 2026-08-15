// googleApi.ts - Comprehensive Google Workspace API client and Tool executor
// Integrates Gmail, Calendar, Tasks, Docs, Drive, Sheets, and People/Contacts

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
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

export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('elara_custom_google_client_id');
    if (custom && custom.trim().length > 0) return custom.trim();
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
}

export function setCustomGoogleClientId(id: string | null) {
  if (typeof window !== 'undefined') {
    if (id && id.trim().length > 0) {
      localStorage.setItem('elara_custom_google_client_id', id.trim());
    } else {
      localStorage.removeItem('elara_custom_google_client_id');
    }
  }
  tokenClient = null;
  initGoogleAuth();
}

let tokenClient: any = null;
let accessToken = '';

export function getAccessToken(): string {
  return accessToken;
}

export function isGoogleConnected(): boolean {
  return Boolean(accessToken && accessToken.length > 0);
}

export function initGoogleAuth() {
  if (typeof window !== 'undefined' && (window as any).google) {
    try {
      const activeClientId = getGoogleClientId();
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            console.error('OAuth token error:', tokenResponse);
            return;
          }
          accessToken = tokenResponse.access_token;
        },
      });
    } catch (e) {
      console.warn('Could not initialize Google Identity Services client:', e);
    }
  }
}

export async function requestGoogleAuth(forcePrompt = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      initGoogleAuth();
    }
    if (!tokenClient) {
      reject(new Error('Google Identity Services not loaded or not initialized.'));
      return;
    }

    tokenClient.callback = (resp: any) => {
      if (resp.error !== undefined) {
        reject(new Error(resp.error_description || resp.error || 'Authentication rejected'));
        return;
      }
      accessToken = resp.access_token;
      resolve(accessToken);
    };

    if (accessToken && !forcePrompt) {
      resolve(accessToken);
    } else {
      tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
    }
  });
}

// ----------------------------------------------------
// Base64 URL Helpers for RFC 2822 Email Encoding
// ----------------------------------------------------

function encodeBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

// ----------------------------------------------------
// Gmail API (Inbox, Reading, Composing, Sending)
// ----------------------------------------------------

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  labels: string[];
}

export interface GmailMessageFull extends GmailMessageSummary {
  bodyText: string;
  bodyHtml?: string;
}

async function parseGoogleApiError(res: Response, fallbackPrefix: string): Promise<string> {
  const errText = await res.text().catch(() => '');
  try {
    const json = JSON.parse(errText);
    return `${fallbackPrefix}: ${json.error?.message || json.error || 'Unknown error'}`;
  } catch {
    if (errText.trim().startsWith('<') || errText.includes('<html>')) {
      return `${fallbackPrefix}: Service unavailable (HTTP ${res.status})`;
    }
    return `${fallbackPrefix}: ${errText || `HTTP ${res.status}`}`;
  }
}

export async function listGmailMessages(query = '', maxResults = 10): Promise<{ messages: GmailMessageSummary[] }> {
  const token = await requestGoogleAuth();

  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (query && query.trim()) {
    url += `&q=${encodeURIComponent(query.trim())}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to list Gmail messages'));
  }

  const data = await res.json();
  const rawList: { id: string; threadId: string }[] = data.messages || [];

  if (rawList.length === 0) {
    return { messages: [] };
  }

  // Fetch header metadata for each message concurrently
  const messagePromises = rawList.slice(0, maxResults).map(async (item) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];

      const getHeader = (name: string) => {
        const found = headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase());
        return found ? found.value : '';
      };

      const labels: string[] = detail.labelIds || [];

      return {
        id: detail.id,
        threadId: detail.threadId,
        from: getHeader('From') || 'Unknown Sender',
        to: getHeader('To') || 'Me',
        subject: getHeader('Subject') || '(No Subject)',
        date: getHeader('Date') || '',
        snippet: detail.snippet || '',
        isUnread: labels.includes('UNREAD'),
        labels,
      } as GmailMessageSummary;
    } catch (e) {
      console.warn('Failed to fetch message summary:', item.id, e);
      return null;
    }
  });

  const resolved = await Promise.all(messagePromises);
  return {
    messages: resolved.filter((m): m is GmailMessageSummary => m !== null),
  };
}

export async function getGmailMessageDetails(messageId: string): Promise<GmailMessageFull> {
  const token = await requestGoogleAuth();

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to fetch email details'));
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];
  const getHeader = (name: string) => {
    const found = headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase());
    return found ? found.value : '';
  };

  let bodyText = '';
  let bodyHtml = '';

  const extractBody = (part: any) => {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += decodeBase64Url(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      for (const subPart of part.parts) {
        extractBody(subPart);
      }
    }
  };

  if (data.payload) {
    if (data.payload.body?.data) {
      const mime = data.payload.mimeType || 'text/plain';
      if (mime.includes('html')) {
        bodyHtml = decodeBase64Url(data.payload.body.data);
      } else {
        bodyText = decodeBase64Url(data.payload.body.data);
      }
    }
    if (data.payload.parts) {
      for (const part of data.payload.parts) {
        extractBody(part);
      }
    }
  }

  if (!bodyText && data.snippet) {
    bodyText = data.snippet;
  }

  return {
    id: data.id,
    threadId: data.threadId,
    from: getHeader('From') || 'Unknown Sender',
    to: getHeader('To') || 'Me',
    subject: getHeader('Subject') || '(No Subject)',
    date: getHeader('Date') || '',
    snippet: data.snippet || '',
    isUnread: (data.labelIds || []).includes('UNREAD'),
    labels: data.labelIds || [],
    bodyText: bodyText.trim(),
    bodyHtml: bodyHtml.trim() || undefined,
  };
}

export async function createGmailDraft(to: string, subject: string, bodyText: string): Promise<{ draftId: string; messageId: string }> {
  const token = await requestGoogleAuth();

  const rfc2822 = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    bodyText,
  ].join('\r\n');

  const raw = encodeBase64Url(rfc2822);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to create Gmail draft'));
  }

  const data = await res.json();
  return {
    draftId: data.id,
    messageId: data.message?.id,
  };
}

export async function sendGmailMessage(
  to: string,
  subject: string,
  bodyText: string,
  inReplyTo?: string,
  threadId?: string
): Promise<{ messageId: string; threadId: string }> {
  const token = await requestGoogleAuth();

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
  ];

  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  headers.push('');
  headers.push(bodyText);

  const rfc2822 = headers.join('\r\n');
  const raw = encodeBase64Url(rfc2822);

  const payload: any = { raw };
  if (threadId) {
    payload.threadId = threadId;
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to send Gmail message'));
  }

  const data = await res.json();
  return {
    messageId: data.id,
    threadId: data.threadId,
  };
}

// ----------------------------------------------------
// Google Docs API
// ----------------------------------------------------

export async function createGoogleDoc(title: string, markdownContent: string): Promise<{ documentId: string; url: string }> {
  const token = await requestGoogleAuth();

  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title || 'Elara Note',
    }),
  });

  if (!createRes.ok) {
    throw new Error(await parseGoogleApiError(createRes, 'Failed to create Google Doc'));
  }
  const doc = await createRes.json();
  const documentId = doc.documentId;

  if (markdownContent && markdownContent.trim()) {
    const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: markdownContent,
            },
          },
        ],
      }),
    });

    if (!insertRes.ok) {
      console.warn('Failed to insert initial text into document');
    }
  }

  return {
    documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

// ----------------------------------------------------
// Calendar API
// ----------------------------------------------------

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

export async function getUpcomingCalendarEvents(maxResults = 10): Promise<{ items: CalendarEventItem[] }> {
  const token = await requestGoogleAuth();
  const timeMin = new Date().toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to fetch calendar events'));
  }

  const data = await res.json();
  const items: CalendarEventItem[] = (data.items || []).map((e: any) => ({
    id: e.id,
    summary: e.summary || '(Untitled Event)',
    description: e.description,
    start: e.start || {},
    end: e.end || {},
    location: e.location,
    htmlLink: e.htmlLink,
  }));

  return { items };
}

export async function createCalendarEvent(
  summary: string,
  startTime: string,
  endTime: string,
  description?: string,
  location?: string
): Promise<CalendarEventItem> {
  const token = await requestGoogleAuth();

  const body: any = {
    summary,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
  };
  if (description) body.description = description;
  if (location) body.location = location;

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to create calendar event'));
  }

  return res.json();
}

// ----------------------------------------------------
// Tasks API
// ----------------------------------------------------

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export async function getTaskLists(): Promise<{ items: { id: string; title: string }[] }> {
  const token = await requestGoogleAuth();

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to fetch task lists'));
  }

  const data = await res.json();
  return {
    items: (data.items || []).map((l: any) => ({
      id: l.id,
      title: l.title || 'Tasks',
    })),
  };
}

export async function getTasks(taskListId?: string): Promise<{ items: TaskItem[]; listTitle?: string }> {
  const token = await requestGoogleAuth();

  let targetListId = taskListId;
  let targetListTitle = 'My Tasks';

  if (!targetListId) {
    const lists = await getTaskLists();
    if (!lists.items || lists.items.length === 0) {
      return { items: [], listTitle: 'None' };
    }
    targetListId = lists.items[0].id;
    targetListTitle = lists.items[0].title;
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${targetListId}/tasks?showCompleted=true&maxResults=20`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to fetch tasks'));
  }

  const data = await res.json();
  const items: TaskItem[] = (data.items || []).map((t: any) => ({
    id: t.id,
    title: t.title || '(Untitled Task)',
    notes: t.notes,
    status: t.status || 'needsAction',
    due: t.due,
    updated: t.updated,
  }));

  return { items, listTitle: targetListTitle };
}

export async function createTask(
  title: string,
  notes?: string,
  taskListId?: string
): Promise<TaskItem> {
  const token = await requestGoogleAuth();

  let targetListId = taskListId;
  if (!targetListId) {
    const lists = await getTaskLists();
    if (!lists.items || lists.items.length === 0) {
      throw new Error('No Google Task lists found in your account.');
    }
    targetListId = lists.items[0].id;
  }

  const payload: any = { title };
  if (notes) payload.notes = notes;

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${targetListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to create task'));
  }

  return res.json();
}

// ----------------------------------------------------
// Google Sheets API (Structured Data & Logs)
// ----------------------------------------------------

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: { sheetId: number; title: string; index: number }[];
  spreadsheetUrl: string;
}

export async function createGoogleSheet(title: string, headerRow?: string[]): Promise<SheetMetadata> {
  const token = await requestGoogleAuth();

  const payload: any = {
    properties: {
      title: title || 'Elara Data Log',
    },
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    throw new Error(await parseGoogleApiError(createRes, 'Failed to create Google Sheet'));
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  if (headerRow && headerRow.length > 0) {
    await appendSheetRow(spreadsheetId, 'A1', [headerRow]);
  }

  return {
    spreadsheetId,
    title: sheetData.properties?.title || title,
    sheets: (sheetData.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || 'Sheet1',
      index: s.properties?.index || 0,
    })),
    spreadsheetUrl: sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

export async function getSpreadsheetDetails(spreadsheetId: string): Promise<SheetMetadata> {
  const token = await requestGoogleAuth();

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to fetch spreadsheet details'));
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || 'Sheet1',
      index: s.properties?.index || 0,
    })),
  };
}

export async function readSheetValues(spreadsheetId: string, range = 'A1:Z100'): Promise<{ range: string; values: any[][] }> {
  const token = await requestGoogleAuth();

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to read sheet values'));
  }

  const data = await res.json();
  return {
    range: data.range || range,
    values: data.values || [],
  };
}

export async function appendSheetRow(
  spreadsheetId: string,
  range: string = 'A1',
  rows: any[][]
): Promise<{ updatedRange: string; updatedRows: number }> {
  const token = await requestGoogleAuth();

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to append row to Google Sheet'));
  }

  const data = await res.json();
  return {
    updatedRange: data.updates?.updatedRange || range,
    updatedRows: data.updates?.updatedRows || rows.length,
  };
}

// ----------------------------------------------------
// Google Contacts / People API (Contact Resolution)
// ----------------------------------------------------

export interface ContactPerson {
  resourceName: string;
  displayName: string;
  familyName?: string;
  givenName?: string;
  emailAddresses: string[];
  phoneNumbers: string[];
  organizations?: string[];
  photoUrl?: string;
}

export async function searchContacts(query: string, pageSize = 10): Promise<{ contacts: ContactPerson[] }> {
  const token = await requestGoogleAuth();

  if (!query || !query.trim()) {
    return listContacts(pageSize);
  }

  const res = await fetch(
    `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to search Google Contacts'));
  }

  const data = await res.json();
  const results = data.results || [];

  const contacts: ContactPerson[] = results.map((r: any) => {
    const person = r.person || {};
    const primaryName = person.names?.[0] || {};
    return {
      resourceName: person.resourceName || '',
      displayName: primaryName.displayName || primaryName.unstructuredName || 'Unknown Contact',
      givenName: primaryName.givenName,
      familyName: primaryName.familyName,
      emailAddresses: (person.emailAddresses || []).map((e: any) => e.value).filter(Boolean),
      phoneNumbers: (person.phoneNumbers || []).map((p: any) => p.value).filter(Boolean),
      organizations: (person.organizations || []).map((o: any) => o.name || o.title).filter(Boolean),
      photoUrl: person.photos?.[0]?.url,
    };
  });

  return { contacts };
}

export async function listContacts(pageSize = 20): Promise<{ contacts: ContactPerson[] }> {
  const token = await requestGoogleAuth();

  const res = await fetch(
    `https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}&sortOrder=FIRST_NAME_ASCENDING`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to list Google Contacts'));
  }

  const data = await res.json();
  const connections = data.connections || [];

  const contacts: ContactPerson[] = connections.map((person: any) => {
    const primaryName = person.names?.[0] || {};
    return {
      resourceName: person.resourceName || '',
      displayName: primaryName.displayName || primaryName.unstructuredName || 'Unknown Contact',
      givenName: primaryName.givenName,
      familyName: primaryName.familyName,
      emailAddresses: (person.emailAddresses || []).map((e: any) => e.value).filter(Boolean),
      phoneNumbers: (person.phoneNumbers || []).map((p: any) => p.value).filter(Boolean),
      organizations: (person.organizations || []).map((o: any) => o.name || o.title).filter(Boolean),
      photoUrl: person.photos?.[0]?.url,
    };
  });

  return { contacts };
}

// ----------------------------------------------------
// Google Keep / Archive Notes Integration
// ----------------------------------------------------

export interface KeepNoteItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
  url?: string;
}

const LOCAL_KEEP_ARCHIVE_KEY = 'elara_passive_keep_archive_v1';

export function loadLocalKeepArchive(): KeepNoteItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEEP_ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveLocalKeepArchive(notes: KeepNoteItem[]): void {
  try {
    localStorage.setItem(LOCAL_KEEP_ARCHIVE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.warn('Failed to persist local keep archive:', e);
  }
}

export async function createKeepNote(title: string, content: string, tags: string[] = []): Promise<KeepNoteItem> {
  let docUrl: string | undefined;

  if (isGoogleConnected()) {
    try {
      const doc = await createGoogleDoc(`[Keep Note] ${title}`, content);
      docUrl = doc.url;
    } catch (e) {
      console.warn('Could not mirror Keep note to Docs:', e);
    }
  }

  const newNote: KeepNoteItem = {
    id: `keep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: title || 'Untitled Note',
    content: content || '',
    tags: tags || [],
    updatedAt: new Date().toISOString(),
    url: docUrl,
  };

  const current = loadLocalKeepArchive();
  const updated = [newNote, ...current];
  saveLocalKeepArchive(updated);

  return newNote;
}

export async function searchKeepNotes(query: string): Promise<{ notes: KeepNoteItem[] }> {
  const notes = loadLocalKeepArchive();
  if (!query || !query.trim()) {
    return { notes };
  }
  const q = query.toLowerCase();
  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
  );
  return { notes: filtered };
}

export async function listKeepNotes(): Promise<{ notes: KeepNoteItem[] }> {
  const notes = loadLocalKeepArchive();
  return { notes };
}

export async function updateKeepNote(id: string, updates: Partial<KeepNoteItem>): Promise<KeepNoteItem | null> {
  const current = loadLocalKeepArchive();
  const idx = current.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const updated: KeepNoteItem = {
    ...current[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  current[idx] = updated;
  saveLocalKeepArchive(current);
  return updated;
}

export async function deleteKeepNote(id: string): Promise<boolean> {
  const current = loadLocalKeepArchive();
  const filtered = current.filter((n) => n.id !== id);
  saveLocalKeepArchive(filtered);
  return true;
}

// ----------------------------------------------------
// Google Chat API & Webhooks Engine
// ----------------------------------------------------

export interface ChatSpaceMember {
  name: string;
  displayName: string;
  avatarUrl?: string;
  type?: string;
}

export interface ChatSpace {
  name: string; // e.g. "spaces/AAAAAAAAAAA"
  displayName?: string;
  type: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE' | string;
  spaceType?: 'SPACE' | 'DIRECT_MESSAGE' | 'GROUP_CHAT';
  spaceThreadingState?: string;
  singleUserBotDm?: boolean;
  members?: ChatSpaceMember[];
}

export interface ChatMessageResult {
  name: string;
  text?: string;
  thread?: { name: string };
  space?: { name: string };
  createTime?: string;
  sender?: string;
}

export interface SpaceWebhookConfig {
  id: string;
  spaceId: string;
  name: string;
  webhookUrl: string;
  autoDailySummary: boolean;
  autoTaskAlerts: boolean;
  lastTriggered?: string;
}

// Card Builder Helpers (Google Chat CardV2 Schema)
export function buildTaskApprovalCard(taskTitle: string, taskId: string, notes?: string, spaceName?: string) {
  return {
    cardId: `task_approval_${taskId}_${Date.now()}`,
    card: {
      header: {
        title: 'Task Execution Request',
        subtitle: 'Elara Workspace Autonomous Action',
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/tasks/default/24px.svg',
        imageType: 'CIRCLE',
      },
      sections: [
        {
          header: 'Proposed Task Details',
          widgets: [
            {
              textParagraph: {
                text: `<b>Title:</b> ${taskTitle}${notes ? `<br><b>Notes:</b> ${notes}` : ''}`,
              },
            },
            {
              buttonList: {
                buttons: [
                  {
                    text: 'Confirm & Add',
                    color: { red: 0.1, green: 0.7, blue: 0.3, alpha: 1 },
                    onClick: {
                      action: {
                        function: 'approve_task',
                        parameters: [
                          { key: 'taskId', value: taskId },
                          { key: 'taskTitle', value: taskTitle },
                          { key: 'spaceName', value: spaceName || '' },
                        ],
                      },
                    },
                  },
                  {
                    text: 'Cancel',
                    color: { red: 0.8, green: 0.2, blue: 0.2, alpha: 1 },
                    onClick: {
                      action: {
                        function: 'cancel_task',
                        parameters: [
                          { key: 'taskId', value: taskId },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

export function buildDraftPreviewCard(
  title: string,
  summary: string,
  deepLinkUrl: string,
  type: 'gmail' | 'docs' | 'sheet' | 'chat' = 'gmail'
) {
  const typeIcons: Record<string, string> = {
    gmail: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/gmail/default/24px.svg',
    docs: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/docs/default/24px.svg',
    sheet: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/sheets/default/24px.svg',
    chat: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/chat/default/24px.svg',
  };

  return {
    cardId: `draft_preview_${Date.now()}`,
    card: {
      header: {
        title: title || 'Output Draft Ready',
        subtitle: `Elara Generated • ${type.toUpperCase()}`,
        imageUrl: typeIcons[type] || typeIcons.gmail,
        imageType: 'CIRCLE',
      },
      sections: [
        {
          widgets: [
            {
              textParagraph: {
                text: summary,
              },
            },
            {
              buttonList: {
                buttons: [
                  {
                    text: `Open in ${type === 'gmail' ? 'Gmail Drafts' : type === 'docs' ? 'Google Docs' : type === 'sheet' ? 'Google Sheets' : 'Google Workspace'}`,
                    onClick: {
                      openLink: {
                        url: deepLinkUrl,
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

export function buildScheduleSweepCard(events: Array<{ summary: string; time: string; location?: string }>) {
  const eventLines = events.length === 0
    ? 'No upcoming events scheduled.'
    : events.map((e, idx) => `<b>${idx + 1}. ${e.summary}</b><br>⏰ ${e.time}${e.location ? `<br>📍 ${e.location}` : ''}`).join('<br><br>');

  return {
    cardId: `schedule_sweep_${Date.now()}`,
    card: {
      header: {
        title: 'Morning Schedule Sweep',
        subtitle: `Elara Proactive Briefing • ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`,
        imageUrl: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/calendar/default/24px.svg',
        imageType: 'CIRCLE',
      },
      sections: [
        {
          header: `Upcoming Schedule (${events.length} items)`,
          widgets: [
            {
              textParagraph: {
                text: eventLines,
              },
            },
            {
              buttonList: {
                buttons: [
                  {
                    text: 'Open Google Calendar',
                    onClick: {
                      openLink: {
                        url: 'https://calendar.google.com',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

export function buildSystemAlertCard(title: string, message: string, severity: 'info' | 'warning' | 'alert' = 'info') {
  const colors: Record<string, string> = {
    info: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/info/default/24px.svg',
    warning: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/warning/default/24px.svg',
    alert: 'https://fonts.gstatic.com/s/i/short-term/release/googlestudios/error/default/24px.svg',
  };

  return {
    cardId: `system_alert_${Date.now()}`,
    card: {
      header: {
        title: title || 'Elara System Status',
        subtitle: `Priority: ${severity.toUpperCase()}`,
        imageUrl: colors[severity] || colors.info,
        imageType: 'CIRCLE',
      },
      sections: [
        {
          widgets: [
            {
              textParagraph: {
                text: message,
              },
            },
          ],
        },
      ],
    },
  };
}

// Google Chat REST API calls
export async function listSpaceMembers(
  spaceName: string,
  passedToken?: string
): Promise<ChatSpaceMember[]> {
  try {
    const token = passedToken || (await requestGoogleAuth());
    const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;

    const res = await fetch(`https://chat.googleapis.com/v1/${cleanSpace}/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const rawMemberships = data.memberships || [];
    return rawMemberships.map((m: any) => ({
      name: m.member?.name || m.name || '',
      displayName: m.member?.displayName || m.member?.name || 'Contact',
      avatarUrl: m.member?.avatarUrl,
      type: m.member?.type || 'HUMAN',
    }));
  } catch {
    return [];
  }
}

export async function listChatSpaces(pageSize = 40): Promise<{ spaces: ChatSpace[] }> {
  const token = await requestGoogleAuth();

  const res = await fetch(`https://chat.googleapis.com/v1/spaces?pageSize=${pageSize}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to list Google Chat spaces'));
  }

  const data = await res.json();
  const rawSpaces = data.spaces || [];

  // Parallel resolve members for spaces to extract contact names for DMs and Group Chats
  const resolvedSpaces: ChatSpace[] = await Promise.all(
    rawSpaces.map(async (s: any) => {
      const spaceType = s.spaceType || s.type || 'SPACE';
      let displayName = (s.displayName || '').trim();
      let members: ChatSpaceMember[] = [];

      const needsMemberResolution =
        !displayName ||
        spaceType === 'DIRECT_MESSAGE' ||
        spaceType === 'DM' ||
        spaceType === 'GROUP_CHAT' ||
        s.singleUserBotDm;

      if (needsMemberResolution) {
        members = await listSpaceMembers(s.name, token);

        if (members.length > 0) {
          const humans = members.filter((m) => m.type !== 'BOT' && m.displayName && m.displayName !== 'User');
          const chosen = humans.length > 0 ? humans : members;
          const memberNames = chosen.map((m) => m.displayName).filter(Boolean);

          if (memberNames.length > 0) {
            displayName = memberNames.join(', ');
          }
        }
      }

      if (!displayName) {
        displayName =
          spaceType === 'DIRECT_MESSAGE' || spaceType === 'DM'
            ? '1-on-1 Direct Message'
            : spaceType === 'GROUP_CHAT'
            ? 'Group Conversation'
            : 'Workspace Space';
      }

      return {
        name: s.name,
        displayName,
        type: s.type || spaceType,
        spaceType: spaceType === 'DM' ? 'DIRECT_MESSAGE' : spaceType,
        spaceThreadingState: s.spaceThreadingState,
        singleUserBotDm: s.singleUserBotDm || false,
        members,
      };
    })
  );

  return { spaces: resolvedSpaces };
}

export async function createChatSpace(
  displayName: string,
  spaceType: 'SPACE' | 'GROUP_CHAT' = 'SPACE'
): Promise<ChatSpace> {
  const token = await requestGoogleAuth();

  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName,
      spaceType,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to create Google Chat space'));
  }

  const data = await res.json();
  return {
    name: data.name,
    displayName: data.displayName || displayName,
    type: data.type || data.spaceType || spaceType,
    spaceType: data.spaceType || spaceType,
  };
}

export async function getChatSpace(spaceName: string): Promise<ChatSpace> {
  const token = await requestGoogleAuth();
  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;

  const res = await fetch(`https://chat.googleapis.com/v1/${cleanSpace}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to fetch Google Chat space'));
  }

  const data = await res.json();
  return {
    name: data.name,
    displayName: data.displayName || 'Space',
    type: data.type || data.spaceType || 'SPACE',
    spaceType: data.spaceType || data.type,
    spaceThreadingState: data.spaceThreadingState,
  };
}

export async function listChatMessages(
  spaceName: string,
  pageSize = 20
): Promise<{ messages: ChatMessageResult[] }> {
  const token = await requestGoogleAuth();
  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;

  const res = await fetch(`https://chat.googleapis.com/v1/${cleanSpace}/messages?pageSize=${pageSize}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to list Google Chat space messages'));
  }

  const data = await res.json();
  const raw = data.messages || [];
  const messages: ChatMessageResult[] = raw.map((m: any) => ({
    name: m.name,
    text: m.text || (m.cardsV2 ? '[Interactive Card]' : ''),
    thread: m.thread,
    space: m.space,
    createTime: m.createTime,
    sender: m.sender?.displayName || m.sender?.name || 'User',
  }));

  return { messages };
}

export async function sendChatMessage(
  spaceName: string,
  text: string,
  threadKey?: string
): Promise<ChatMessageResult> {
  const token = await requestGoogleAuth();

  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  const url = threadKey
    ? `https://chat.googleapis.com/v1/${cleanSpace}/messages?messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`
    : `https://chat.googleapis.com/v1/${cleanSpace}/messages`;

  const body: any = { text };
  if (threadKey) {
    body.thread = { threadKey };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to send Google Chat message'));
  }

  const data = await res.json();
  return {
    name: data.name,
    text: data.text,
    thread: data.thread,
    space: data.space,
    createTime: data.createTime,
  };
}

export async function sendChatCardMessage(
  spaceName: string,
  cardsV2: any[],
  textFallback = '',
  threadKey?: string
): Promise<ChatMessageResult> {
  const token = await requestGoogleAuth();

  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  const url = `https://chat.googleapis.com/v1/${cleanSpace}/messages`;

  const body: any = {
    text: textFallback,
    cardsV2: Array.isArray(cardsV2) ? cardsV2 : [cardsV2],
  };
  if (threadKey) {
    body.thread = { threadKey };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Failed to send Google Chat card message'));
  }

  const data = await res.json();
  return {
    name: data.name,
    text: data.text,
    thread: data.thread,
    space: data.space,
    createTime: data.createTime,
  };
}

export async function postChatWebhook(
  webhookUrl: string,
  payload: { text?: string; cardsV2?: any[]; threadKey?: string }
): Promise<any> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('Valid webhook URL required.');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseGoogleApiError(res, 'Google Chat webhook post failed'));
  }

  try {
    return await res.json();
  } catch {
    return { status: 'success' };
  }
}

// Local space webhook configurations
const LOCAL_WEBHOOKS_KEY = 'elara_google_chat_webhooks_v1';

export function loadSpaceWebhooks(): SpaceWebhookConfig[] {
  try {
    const stored = localStorage.getItem(LOCAL_WEBHOOKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSpaceWebhooks(configs: SpaceWebhookConfig[]): void {
  try {
    localStorage.setItem(LOCAL_WEBHOOKS_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Failed to save space webhooks:', err);
  }
}

// ----------------------------------------------------
// Unified Tool Executor
// ----------------------------------------------------

export async function executeWorkspaceTool(toolName: string, args: any = {}): Promise<any> {
  try {
    switch (toolName) {
      case 'get_recent_emails': {
        const query = args?.query || '';
        const limit = args?.maxResults || 10;
        const result = await listGmailMessages(query, limit);
        return {
          status: 'success',
          count: result.messages.length,
          emails: result.messages.map((m) => ({
            id: m.id,
            threadId: m.threadId,
            from: m.from,
            to: m.to,
            subject: m.subject,
            date: m.date,
            snippet: m.snippet,
            isUnread: m.isUnread,
          })),
        };
      }

      case 'get_email_content': {
        const { messageId } = args;
        if (!messageId) {
          return { status: 'error', message: 'Missing required parameter: messageId' };
        }
        const msg = await getGmailMessageDetails(messageId);
        return {
          status: 'success',
          id: msg.id,
          threadId: msg.threadId,
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          date: msg.date,
          bodyText: msg.bodyText,
          isUnread: msg.isUnread,
        };
      }

      case 'create_email_draft': {
        const { to, subject, body } = args;
        if (!to || !subject || !body) {
          return { status: 'error', message: 'Missing required parameters: to, subject, and body' };
        }
        const draft = await createGmailDraft(to, subject, body);
        return {
          status: 'success',
          message: `Created email draft to ${to} with subject "${subject}"`,
          draftId: draft.draftId,
          messageId: draft.messageId,
        };
      }

      case 'send_email': {
        const { to, subject, body, inReplyTo, threadId } = args;
        if (!to || !subject || !body) {
          return { status: 'error', message: 'Missing required parameters: to, subject, and body' };
        }
        const sent = await sendGmailMessage(to, subject, body, inReplyTo, threadId);
        return {
          status: 'success',
          message: `Successfully sent email to ${to} with subject "${subject}"`,
          messageId: sent.messageId,
          threadId: sent.threadId,
        };
      }

      case 'get_calendar_events': {
        const limit = args?.maxResults || 10;
        const result = await getUpcomingCalendarEvents(limit);
        return {
          status: 'success',
          count: result.items.length,
          events: result.items.map((e) => ({
            title: e.summary,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date,
            description: e.description,
            location: e.location,
          })),
        };
      }

      case 'create_calendar_event': {
        const { summary, startTime, endTime, description, location } = args;
        if (!summary || !startTime || !endTime) {
          return { status: 'error', message: 'Missing required parameters: summary, startTime, endTime' };
        }
        const event = await createCalendarEvent(summary, startTime, endTime, description, location);
        return {
          status: 'success',
          message: `Created calendar event: ${event.summary}`,
          event: {
            title: event.summary,
            start: event.start,
            end: event.end,
          },
        };
      }

      case 'get_tasks': {
        const result = await getTasks(args?.taskListId);
        return {
          status: 'success',
          listTitle: result.listTitle,
          count: result.items.length,
          tasks: result.items.map((t) => ({
            id: t.id,
            title: t.title,
            notes: t.notes,
            status: t.status === 'completed' ? 'Completed' : 'Pending',
            due: t.due,
          })),
        };
      }

      case 'create_task': {
        const { title, notes, taskListId } = args;
        if (!title) {
          return { status: 'error', message: 'Missing required parameter: title' };
        }
        const created = await createTask(title, notes, taskListId);
        return {
          status: 'success',
          message: `Created task: ${created.title}`,
          task: {
            title: created.title,
            notes: created.notes,
            status: created.status,
          },
        };
      }

      case 'create_google_doc': {
        const { title, content } = args;
        const doc = await createGoogleDoc(title || 'Document', content || '');
        return {
          status: 'success',
          message: `Created Google Document: ${title}`,
          url: doc.url,
        };
      }

      case 'create_google_sheet': {
        const { title, headerRow } = args;
        const sheet = await createGoogleSheet(title || 'Data Log', headerRow);
        return {
          status: 'success',
          message: `Created Google Spreadsheet: ${sheet.title}`,
          spreadsheetId: sheet.spreadsheetId,
          url: sheet.spreadsheetUrl,
        };
      }

      case 'read_sheet_values': {
        const { spreadsheetId, range } = args;
        if (!spreadsheetId) {
          return { status: 'error', message: 'Missing required parameter: spreadsheetId' };
        }
        const result = await readSheetValues(spreadsheetId, range || 'A1:Z50');
        return {
          status: 'success',
          range: result.range,
          rowsCount: result.values.length,
          data: result.values,
        };
      }

      case 'append_sheet_row': {
        const { spreadsheetId, range, rowValues } = args;
        if (!spreadsheetId || !rowValues || !Array.isArray(rowValues)) {
          return { status: 'error', message: 'Missing required parameters: spreadsheetId and rowValues array' };
        }
        const formattedRows = Array.isArray(rowValues[0]) ? rowValues : [rowValues];
        const res = await appendSheetRow(spreadsheetId, range || 'A1', formattedRows);
        return {
          status: 'success',
          message: `Appended ${res.updatedRows} row(s) to spreadsheet.`,
          updatedRange: res.updatedRange,
        };
      }

      case 'search_contacts': {
        const { query, maxResults } = args;
        const result = await searchContacts(query || '', maxResults || 10);
        return {
          status: 'success',
          count: result.contacts.length,
          contacts: result.contacts.map((c) => ({
            name: c.displayName,
            emails: c.emailAddresses,
            phones: c.phoneNumbers,
            organizations: c.organizations,
          })),
        };
      }

      case 'create_keep_note': {
        const { title, content, tags } = args;
        if (!title && !content) {
          return { status: 'error', message: 'Missing note title or content' };
        }
        const note = await createKeepNote(title || 'Note', content || '', tags || []);
        return {
          status: 'success',
          message: `Created Keep archive note: ${note.title}`,
          noteId: note.id,
          url: note.url,
        };
      }

      case 'search_keep_notes': {
        const { query } = args;
        const result = await searchKeepNotes(query || '');
        return {
          status: 'success',
          count: result.notes.length,
          notes: result.notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            tags: n.tags,
            updatedAt: n.updatedAt,
          })),
        };
      }

      case 'list_keep_notes': {
        const result = await listKeepNotes();
        return {
          status: 'success',
          count: result.notes.length,
          notes: result.notes,
        };
      }

      case 'update_keep_note': {
        const { noteId, title, content, tags } = args;
        if (!noteId) {
          return { status: 'error', message: 'Missing noteId' };
        }
        const updated = await updateKeepNote(noteId, { title, content, tags });
        if (!updated) {
          return { status: 'error', message: `Note with id "${noteId}" not found.` };
        }
        return {
          status: 'success',
          message: `Updated note: ${updated.title}`,
          note: updated,
        };
      }

      case 'delete_keep_note': {
        const { noteId } = args;
        if (!noteId) {
          return { status: 'error', message: 'Missing noteId' };
        }
        await deleteKeepNote(noteId);
        return {
          status: 'success',
          message: `Deleted Keep archive note: ${noteId}`,
        };
      }

      case 'list_chat_spaces': {
        const result = await listChatSpaces(args?.pageSize || 20);
        return {
          status: 'success',
          count: result.spaces.length,
          spaces: result.spaces.map((s) => ({
            name: s.name,
            displayName: s.displayName,
            type: s.type,
            spaceType: s.spaceType,
          })),
        };
      }

      case 'create_chat_space': {
        const { displayName, spaceType } = args;
        if (!displayName) {
          return { status: 'error', message: 'Missing displayName for Google Chat space' };
        }
        const created = await createChatSpace(displayName, spaceType || 'SPACE');
        return {
          status: 'success',
          message: `Created Google Chat Space: "${created.displayName}" (${created.name})`,
          space: created,
        };
      }

      case 'list_chat_messages': {
        const { spaceName, pageSize } = args;
        if (!spaceName) {
          return { status: 'error', message: 'Missing spaceName' };
        }
        const result = await listChatMessages(spaceName, pageSize || 20);
        return {
          status: 'success',
          count: result.messages.length,
          messages: result.messages,
        };
      }

      case 'send_chat_message': {
        const { spaceName, text, threadKey } = args;
        if (!spaceName || !text) {
          return { status: 'error', message: 'Missing required parameters: spaceName and text' };
        }
        const result = await sendChatMessage(spaceName, text, threadKey);
        return {
          status: 'success',
          message: `Successfully posted message to ${spaceName}`,
          messageName: result.name,
          thread: result.thread,
        };
      }

      case 'send_chat_card': {
        const { spaceName, cardType, title, summary, actionId, deepLinkUrl, threadKey } = args;
        if (!spaceName) {
          return { status: 'error', message: 'Missing required parameter: spaceName' };
        }
        let cardPayload: any;
        if (cardType === 'task_approval') {
          cardPayload = buildTaskApprovalCard(title || 'Execute Workspace Task', actionId || 'task_1', summary, spaceName);
        } else if (cardType === 'draft_preview') {
          cardPayload = buildDraftPreviewCard(title || 'Draft Summary', summary || '', deepLinkUrl || 'https://mail.google.com', 'gmail');
        } else if (cardType === 'schedule_sweep') {
          const events = await getUpcomingCalendarEvents(5);
          cardPayload = buildScheduleSweepCard(
            events.items.map((e) => ({
              summary: e.summary,
              time: e.start.dateTime || e.start.date || 'TBD',
              location: e.location,
            }))
          );
        } else {
          cardPayload = buildSystemAlertCard(title || 'System Status', summary || 'Operational alert', 'info');
        }

        const result = await sendChatCardMessage(spaceName, [cardPayload], title || 'Elara Workspace Card', threadKey);
        return {
          status: 'success',
          message: `Sent ${cardType || 'custom'} interactive card to ${spaceName}`,
          messageName: result.name,
        };
      }

      case 'post_chat_webhook': {
        const { webhookUrl, text, cardType, title, summary, deepLinkUrl } = args;
        if (!webhookUrl) {
          return { status: 'error', message: 'Missing required parameter: webhookUrl' };
        }
        let payload: any = {};
        if (text) {
          payload.text = text;
        }
        if (cardType === 'task_approval') {
          payload.cardsV2 = [buildTaskApprovalCard(title || 'Task Approval', 'task_hook', summary)];
        } else if (cardType === 'draft_preview') {
          payload.cardsV2 = [buildDraftPreviewCard(title || 'Draft Preview', summary || '', deepLinkUrl || 'https://docs.google.com', 'docs')];
        } else if (cardType === 'schedule_sweep') {
          const events = await getUpcomingCalendarEvents(5);
          payload.cardsV2 = [
            buildScheduleSweepCard(
              events.items.map((e) => ({
                summary: e.summary,
                time: e.start.dateTime || e.start.date || 'TBD',
                location: e.location,
              }))
            ),
          ];
        } else if (cardType === 'system_alert') {
          payload.cardsV2 = [buildSystemAlertCard(title || 'System Alert', summary || 'Alert payload', 'warning')];
        }

        await postChatWebhook(webhookUrl, payload);
        return {
          status: 'success',
          message: `Dispatched message payload to Google Chat webhook successfully.`,
        };
      }

      case 'trigger_proactive_notification': {
        const { notificationType, targetSpace, webhookUrl, customNote } = args;
        let cardPayload: any;
        let subject = '';

        if (notificationType === 'morning_sweep') {
          subject = 'Morning Schedule & Priorities Sweep';
          const events = await getUpcomingCalendarEvents(5);
          cardPayload = buildScheduleSweepCard(
            events.items.map((e) => ({
              summary: e.summary,
              time: e.start.dateTime || e.start.date || 'TBD',
              location: e.location,
            }))
          );
        } else if (notificationType === 'task_summary') {
          subject = 'Background Task Status';
          const tasks = await getTasks();
          const pending = tasks.items.filter((t) => t.status === 'needsAction');
          cardPayload = buildSystemAlertCard(
            'Google Tasks Status',
            `You have ${pending.length} pending task(s) on your agenda.${customNote ? `\n\nNote: ${customNote}` : ''}`,
            'info'
          );
        } else {
          subject = 'Elara Proactive Alert';
          cardPayload = buildSystemAlertCard('System Notification', customNote || 'Operational update from Elara.', 'info');
        }

        if (webhookUrl) {
          await postChatWebhook(webhookUrl, { cardsV2: [cardPayload] });
        } else if (targetSpace) {
          await sendChatCardMessage(targetSpace, [cardPayload], subject);
        } else {
          // Send to first available space or default
          const spaces = await listChatSpaces(5);
          if (spaces.spaces.length > 0) {
            await sendChatCardMessage(spaces.spaces[0].name, [cardPayload], subject);
          } else {
            return { status: 'error', message: 'No Google Chat spaces or webhook URLs configured.' };
          }
        }

        return {
          status: 'success',
          message: `Proactive notification "${subject}" delivered successfully to Google Chat.`,
        };
      }

      default:
        return { status: 'error', message: `Unknown tool: ${toolName}` };
    }
  } catch (err: any) {
    return {
      status: 'error',
      message: err.message || 'Failed to execute workspace tool. Authentication may be required.',
    };
  }
}

// ----------------------------------------------------
// Tool Declarations for Gemini API Function Calling
// ----------------------------------------------------

export const WORKSPACE_FUNCTION_DECLARATIONS = [
  {
    name: 'get_recent_emails',
    description: "Search or list recent emails in the user's Gmail inbox.",
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Optional search query, e.g. "from:alice", "is:unread", "subject:meeting", or empty to list recent inbox.',
        },
        maxResults: {
          type: 'INTEGER',
          description: 'Maximum number of emails to retrieve (default 10).',
        },
      },
    },
  },
  {
    name: 'get_email_content',
    description: "Retrieve the full text and details of a specific email message using its messageId.",
    parameters: {
      type: 'OBJECT',
      properties: {
        messageId: {
          type: 'STRING',
          description: 'The unique Gmail message ID to read.',
        },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'create_email_draft',
    description: "Create an email draft in the user's Gmail without sending it immediately.",
    parameters: {
      type: 'OBJECT',
      properties: {
        to: {
          type: 'STRING',
          description: 'Recipient email address (e.g. "alex@example.com").',
        },
        subject: {
          type: 'STRING',
          description: 'Email subject line.',
        },
        body: {
          type: 'STRING',
          description: 'The text content of the email message.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'send_email',
    description: "Send an email directly from the user's Gmail account.",
    parameters: {
      type: 'OBJECT',
      properties: {
        to: {
          type: 'STRING',
          description: 'Recipient email address.',
        },
        subject: {
          type: 'STRING',
          description: 'Email subject line.',
        },
        body: {
          type: 'STRING',
          description: 'The text content of the email to send.',
        },
        inReplyTo: {
          type: 'STRING',
          description: 'Optional Message-ID or message ID to reply to.',
        },
        threadId: {
          type: 'STRING',
          description: 'Optional Gmail threadId to keep the reply in the same email conversation thread.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'get_calendar_events',
    description: "Fetch the user's upcoming Google Calendar events to view their schedule, appointments, or availability.",
    parameters: {
      type: 'OBJECT',
      properties: {
        maxResults: {
          type: 'INTEGER',
          description: 'Maximum number of calendar events to return (default is 10).',
        },
      },
    },
  },
  {
    name: 'create_calendar_event',
    description: "Add a new appointment or event to the user's primary Google Calendar.",
    parameters: {
      type: 'OBJECT',
      properties: {
        summary: {
          type: 'STRING',
          description: 'Title of the event.',
        },
        startTime: {
          type: 'STRING',
          description: 'Start time in ISO 8601 string format (e.g. 2026-08-15T14:00:00Z or with timezone offset).',
        },
        endTime: {
          type: 'STRING',
          description: 'End time in ISO 8601 string format (e.g. 2026-08-15T15:00:00Z or with timezone offset).',
        },
        description: {
          type: 'STRING',
          description: 'Optional event description or notes.',
        },
        location: {
          type: 'STRING',
          description: 'Optional event location or meeting link.',
        },
      },
      required: ['summary', 'startTime', 'endTime'],
    },
  },
  {
    name: 'get_tasks',
    description: "Fetch the user's to-do items and task lists from Google Tasks.",
    parameters: {
      type: 'OBJECT',
      properties: {
        taskListId: {
          type: 'STRING',
          description: 'Optional ID of a specific Google Task list.',
        },
      },
    },
  },
  {
    name: 'create_task',
    description: "Create a new to-do task item in the user's Google Tasks.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Title or summary of the task to create.',
        },
        notes: {
          type: 'STRING',
          description: 'Optional notes, sub-bullet points, or details for the task.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_google_doc',
    description: 'Export notes, summaries, or content into a new Google Document.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Title for the new Google Document.',
        },
        content: {
          type: 'STRING',
          description: 'Text or markdown content to insert into the document.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'create_google_sheet',
    description: 'Create a new structured Google Spreadsheet to record tabular data, indices, or logs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Title for the new spreadsheet.',
        },
        headerRow: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Optional column header labels (e.g. ["Timestamp", "Item", "Category", "Quantity"]).',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'read_sheet_values',
    description: 'Read tabular rows and cells from an existing Google Sheet.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spreadsheetId: {
          type: 'STRING',
          description: 'The unique ID of the Google Spreadsheet.',
        },
        range: {
          type: 'STRING',
          description: 'Cell range to read, e.g., "Sheet1!A1:E20" or "A1:Z50".',
        },
      },
      required: ['spreadsheetId'],
    },
  },
  {
    name: 'append_sheet_row',
    description: 'Append a new row of data to an existing Google Spreadsheet.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spreadsheetId: {
          type: 'STRING',
          description: 'The unique ID of the Google Spreadsheet.',
        },
        rowValues: {
          type: 'ARRAY',
          description: 'Array of cell values representing the row to append (e.g. ["2026-08-15", "Meeting Notes", "Done"]).',
        },
        range: {
          type: 'STRING',
          description: 'Optional starting range/sheet name (defaults to "A1").',
        },
      },
      required: ['spreadsheetId', 'rowValues'],
    },
  },
  {
    name: 'search_contacts',
    description: 'Search the user\'s Google Contacts by name, nickname, or organization to find email addresses and contact info.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The name or search term to look up in contacts.',
        },
        maxResults: {
          type: 'INTEGER',
          description: 'Maximum number of contact matches to return (default 10).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_keep_note',
    description: 'Create a passive reference note, spec, or quote in the archive (distinct from actionable Google Tasks).',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'Title of the archival note.',
        },
        content: {
          type: 'STRING',
          description: 'Body content of the note.',
        },
        tags: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Optional tags for categorization.',
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'search_keep_notes',
    description: 'Search passive reference notes and archival specs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Search term for notes.',
        },
      },
    },
  },
  {
    name: 'list_keep_notes',
    description: 'List all stored Keep archive notes and research specs.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'update_keep_note',
    description: 'Update the title, content, or tags of an existing Keep archive note.',
    parameters: {
      type: 'OBJECT',
      properties: {
        noteId: {
          type: 'STRING',
          description: 'The unique ID of the note to update.',
        },
        title: {
          type: 'STRING',
          description: 'New title for the note.',
        },
        content: {
          type: 'STRING',
          description: 'New text content for the note.',
        },
        tags: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'Updated tags for categorization.',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'delete_keep_note',
    description: 'Delete a note from the Keep archive.',
    parameters: {
      type: 'OBJECT',
      properties: {
        noteId: {
          type: 'STRING',
          description: 'The unique ID of the note to delete.',
        },
      },
      required: ['noteId'],
    },
  },
  {
    name: 'list_chat_spaces',
    description: "List the user's available Google Chat Spaces and 1-on-1 Direct Message channels.",
    parameters: {
      type: 'OBJECT',
      properties: {
        pageSize: {
          type: 'INTEGER',
          description: 'Maximum number of spaces to return (default 20).',
        },
      },
    },
  },
  {
    name: 'create_chat_space',
    description: 'Create a new Google Chat Space for group collaboration or project topic threads.',
    parameters: {
      type: 'OBJECT',
      properties: {
        displayName: {
          type: 'STRING',
          description: 'The display name for the new Chat Space.',
        },
        spaceType: {
          type: 'STRING',
          description: 'The type of space: "SPACE" (default) or "GROUP_CHAT".',
        },
      },
      required: ['displayName'],
    },
  },
  {
    name: 'list_chat_messages',
    description: 'List recent chat messages from a specific Google Chat space or 1-on-1 DM channel.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spaceName: {
          type: 'STRING',
          description: 'The resource name of the space (e.g. "spaces/AAAAAAAAAAA").',
        },
        pageSize: {
          type: 'INTEGER',
          description: 'Number of recent messages to retrieve (default 20).',
        },
      },
      required: ['spaceName'],
    },
  },
  {
    name: 'send_chat_message',
    description: 'Send a message or reply to a Google Chat Space or 1-on-1 Direct Message (DM).',
    parameters: {
      type: 'OBJECT',
      properties: {
        spaceName: {
          type: 'STRING',
          description: 'The resource name of the space (e.g. "spaces/AAAAAAAAAAA").',
        },
        text: {
          type: 'STRING',
          description: 'The message text content to send.',
        },
        threadKey: {
          type: 'STRING',
          description: 'Optional thread key for creating or replying to a threaded discussion.',
        },
      },
      required: ['spaceName', 'text'],
    },
  },
  {
    name: 'send_chat_card',
    description: 'Send an interactive structured CardV2 component to a Google Chat space or DM (e.g. Task approval card with action buttons, draft preview card with deep links, or morning schedule sweep).',
    parameters: {
      type: 'OBJECT',
      properties: {
        spaceName: {
          type: 'STRING',
          description: 'The resource name of the space (e.g. "spaces/AAAAAAAAAAA").',
        },
        cardType: {
          type: 'STRING',
          description: 'The template type of card: "task_approval", "draft_preview", "schedule_sweep", or "system_alert".',
        },
        title: {
          type: 'STRING',
          description: 'The card header title.',
        },
        summary: {
          type: 'STRING',
          description: 'Descriptive body text or summary details.',
        },
        actionId: {
          type: 'STRING',
          description: 'Identifier for task approvals or interactive action handling.',
        },
        deepLinkUrl: {
          type: 'STRING',
          description: 'URL for draft deep-linking (e.g. Gmail draft URL, Google Doc link).',
        },
        threadKey: {
          type: 'STRING',
          description: 'Optional thread key.',
        },
      },
      required: ['spaceName', 'cardType'],
    },
  },
  {
    name: 'post_chat_webhook',
    description: 'Post an automated report, message, or interactive CardV2 payload directly to a Google Chat Space incoming Webhook URL.',
    parameters: {
      type: 'OBJECT',
      properties: {
        webhookUrl: {
          type: 'STRING',
          description: 'The full Google Chat webhook URL.',
        },
        text: {
          type: 'STRING',
          description: 'Optional plain-text message fallback.',
        },
        cardType: {
          type: 'STRING',
          description: 'Optional card template: "task_approval", "draft_preview", "schedule_sweep", or "system_alert".',
        },
        title: {
          type: 'STRING',
          description: 'Title for the card header.',
        },
        summary: {
          type: 'STRING',
          description: 'Detailed text content or event breakdown.',
        },
        deepLinkUrl: {
          type: 'STRING',
          description: 'Optional link destination.',
        },
      },
      required: ['webhookUrl'],
    },
  },
  {
    name: 'trigger_proactive_notification',
    description: 'Trigger an autonomous proactive outbound briefing or alert (e.g. morning schedule sweep, task summary, or status alert) to Google Chat.',
    parameters: {
      type: 'OBJECT',
      properties: {
        notificationType: {
          type: 'STRING',
          description: 'Type of notification: "morning_sweep", "task_summary", or "system_alert".',
        },
        targetSpace: {
          type: 'STRING',
          description: 'Optional target space name (e.g. "spaces/AAAAAAAAAAA").',
        },
        webhookUrl: {
          type: 'STRING',
          description: 'Optional space webhook URL.',
        },
        customNote: {
          type: 'STRING',
          description: 'Optional additional context or instructions.',
        },
      },
      required: ['notificationType'],
    },
  },
];
