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
  const envVal = typeof import.meta !== 'undefined' && (import.meta as any)?.env
    ? (import.meta as any).env.VITE_GOOGLE_CLIENT_ID
    : (typeof process !== 'undefined' && process.env ? process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID : undefined);
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
      return { id: detail.id, threadId: detail.threadId, from: header('From') || 'Unknown Sender', to: header('To') || 'Me', subject: header('Subject') || '(No Subject)', date: header('Date') || '', snippet: detail.snippet || '', isUnread: labels.includes('UNREAD'), labels } as GmailMessageSummary;
    } catch { return null; }
  }));
  return { messages: rows.filter(Boolean) as GmailMessageSummary[] };
}

export async function getGmailMessageDetails(messageId: string): Promise<GmailMessageFull> {
  const token = await requestGoogleAuth();
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
  const token = await requestGoogleAuth();
  const raw = encodeBase64Url([`To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', bodyText].join('\r\n'));
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ message: { raw } }) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to create Gmail draft'));
  const data = await res.json();
  return { draftId: data.id, messageId: data.message?.id };
}

export async function sendGmailMessage(to: string, subject: string, bodyText: string, inReplyTo?: string, threadId?: string): Promise<{ messageId: string; threadId: string }> {
  const token = await requestGoogleAuth();
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

// ---------------- Docs / Drive ----------------
export interface GoogleDocSummary { id: string; name: string; title: string; modifiedTime?: string; webViewLink?: string; url?: string; }
export interface GoogleDriveFileSummary { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; size?: string; }

export async function createGoogleDoc(title: string, content: string, passedToken?: string): Promise<{ documentId: string; url: string; title: string }> {
  const token = passedToken || await requestGoogleAuth();
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ title: title || 'Elara Note' }) });
  if (!createRes.ok) throw new Error(await parseGoogleApiError(createRes, 'Failed to create Google Doc'));
  const doc = await createRes.json();
  if (content?.trim()) {
    const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ requests: [{ insertText: { location: { index: 1 }, text: content } }] }) });
    if (!insertRes.ok) throw new Error(await parseGoogleApiError(insertRes, 'Failed to insert Google Doc content'));
  }
  return { documentId: doc.documentId, title: title || 'Untitled Document', url: `https://docs.google.com/document/d/${doc.documentId}/edit` };
}

export async function getGoogleDoc(documentId: string, passedToken?: string): Promise<{ documentId: string; title: string; content: string; url: string }> {
  const token = passedToken || await requestGoogleAuth();
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, `Failed to retrieve Google Doc (${documentId})`));
  const doc = await res.json();
  let content = '';
  const walk = (nodes: any[]) => nodes.forEach((node) => {
    if (node.paragraph?.elements) node.paragraph.elements.forEach((e: any) => { if (e.textRun?.content) content += e.textRun.content; });
    if (node.table?.tableRows) node.table.tableRows.forEach((row: any) => row.tableCells?.forEach((cell: any) => walk(cell.content || [])));
  });
  walk(doc.body?.content || []);
  return { documentId: doc.documentId, title: doc.title || 'Untitled Document', content: content.trim(), url: `https://docs.google.com/document/d/${doc.documentId}/edit` };
}

export async function editGoogleDoc(documentId: string, newText: string, mode: 'append'|'replace'|'prepend' = 'append', passedToken?: string): Promise<{ documentId: string; url: string; success: boolean }> {
  const token = passedToken || await requestGoogleAuth();
  let requests: any[] = [];
  if (mode === 'append') requests = [{ insertText: { endOfSegmentLocation: {}, text: `\n\n${newText}` } }];
  if (mode === 'prepend') requests = [{ insertText: { location: { index: 1 }, text: `${newText}\n\n` } }];
  if (mode === 'replace') {
    const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers: authHeaders(token) });
    if (!docRes.ok) throw new Error(await parseGoogleApiError(docRes, 'Failed to inspect Google Doc'));
    const doc = await docRes.json();
    const content = doc.body?.content || [];
    const last = content[content.length - 1];
    const endIndex = Math.max(1, (last?.endIndex || 2) - 1);
    if (endIndex > 1) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex } } });
    requests.push({ insertText: { location: { index: 1 }, text: newText } });
  }
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ requests }) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to update Google Doc'));
  return { documentId, url: `https://docs.google.com/document/d/${documentId}/edit`, success: true };
}

export async function searchGoogleDriveDocs(query = '', maxResults = 10, passedToken?: string): Promise<{ docs: GoogleDocSummary[] }> {
  const token = passedToken || await requestGoogleAuth();
  let q = "mimeType = 'application/vnd.google-apps.document' and trashed = false";
  if (query.trim()) q += ` and name contains '${query.replace(/['\\]/g, '')}'`;
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${maxResults}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to search Google Drive documents'));
  const data = await res.json();
  return { docs: (data.files || []).map((f: any) => ({ id: f.id, name: f.name || 'Untitled Doc', title: f.name || 'Untitled Doc', modifiedTime: f.modifiedTime, webViewLink: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit`, url: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit` })) };
}

export async function listGoogleDriveFiles(pageSize = 10, query = '', passedToken?: string): Promise<{ files: GoogleDriveFileSummary[] }> {
  const token = passedToken || await requestGoogleAuth();
  let q = 'trashed = false';
  if (query.trim()) { const clean = query.replace(/['\\]/g, ''); q += ` and (name contains '${clean}' or fullText contains '${clean}')`; }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&orderBy=modifiedTime desc`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to list Google Drive files'));
  const data = await res.json();
  return { files: (data.files || []).map((f: any) => ({ id: f.id, name: f.name || 'Untitled File', mimeType: f.mimeType || 'unknown', modifiedTime: f.modifiedTime, webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`, size: f.size })) };
}
export async function searchGoogleDriveFiles(query: string, pageSize = 10, passedToken?: string) { return listGoogleDriveFiles(pageSize, query, passedToken); }

export async function readGoogleDriveFile(fileId: string, passedToken?: string): Promise<{ id:string; name:string; mimeType:string; content:string; webViewLink:string }> {
  const token = passedToken || await requestGoogleAuth();
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`, { headers: authHeaders(token) });
  if (!metaRes.ok) throw new Error(await parseGoogleApiError(metaRes, `Failed to find Google Drive file (${fileId})`));
  const meta = await metaRes.json();
  if (meta.mimeType === 'application/vnd.google-apps.document') {
    const doc = await getGoogleDoc(fileId, token);
    return { id: meta.id, name: meta.name || doc.title, mimeType: meta.mimeType, content: doc.content, webViewLink: meta.webViewLink || doc.url };
  }
  if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') {
    return { id: meta.id, name: meta.name || 'Spreadsheet', mimeType: meta.mimeType, content: '[Google Spreadsheet: use Sheets tools for structured cell access]', webViewLink: meta.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}/edit` };
  }
  if (meta.mimeType?.startsWith('application/vnd.google-apps.')) {
    const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, { headers: authHeaders(token) });
    if (exportRes.ok) return { id: meta.id, name: meta.name || 'Google file', mimeType: meta.mimeType, content: (await exportRes.text()).trim(), webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view` };
  }
  const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: authHeaders(token) });
  if (contentRes.ok) return { id: meta.id, name: meta.name || 'Untitled File', mimeType: meta.mimeType || 'unknown', content: await contentRes.text(), webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view` };
  return { id: meta.id, name: meta.name || 'Untitled File', mimeType: meta.mimeType || 'unknown', content: '[Binary or Non-Text File Content]', webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view` };
}

// ---------------- Calendar / Tasks ----------------
export interface CalendarEventItem { id:string; summary:string; description?:string; start:{dateTime?:string;date?:string}; end:{dateTime?:string;date?:string}; location?:string; htmlLink?:string; }
export async function getUpcomingCalendarEvents(maxResults = 10): Promise<{items:CalendarEventItem[]}> { const token=await requestGoogleAuth(); const res=await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(new Date().toISOString())}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,{headers:authHeaders(token)}); if(!res.ok) throw new Error(await parseGoogleApiError(res,'Failed to fetch calendar events')); const d=await res.json(); return {items:(d.items||[]).map((e:any)=>({id:e.id,summary:e.summary||'(Untitled Event)',description:e.description,start:e.start||{},end:e.end||{},location:e.location,htmlLink:e.htmlLink}))}; }
export async function createCalendarEvent(summary:string,startTime:string,endTime:string,description?:string,location?:string):Promise<CalendarEventItem>{const token=await requestGoogleAuth();const body:any={summary,start:{dateTime:startTime},end:{dateTime:endTime}};if(description)body.description=description;if(location)body.location=location;const res=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify(body)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create calendar event'));return res.json();}
export interface TaskItem{id:string;title:string;notes?:string;status:'needsAction'|'completed';due?:string;updated?:string;}
export async function getTaskLists(){const token=await requestGoogleAuth();const res=await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists',{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to fetch task lists'));const d=await res.json();return {items:(d.items||[]).map((l:any)=>({id:l.id,title:l.title||'Tasks'}))};}
export async function getTasks(taskListId?:string):Promise<{items:TaskItem[];listTitle?:string}>{const token=await requestGoogleAuth();let id=taskListId,title='My Tasks';if(!id){const lists=await getTaskLists();if(!lists.items.length)return {items:[],listTitle:'None'};id=lists.items[0].id;title=lists.items[0].title;}const res=await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${id}/tasks?showCompleted=true&maxResults=20`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to fetch tasks'));const d=await res.json();return {items:(d.items||[]).map((t:any)=>({id:t.id,title:t.title||'(Untitled Task)',notes:t.notes,status:t.status||'needsAction',due:t.due,updated:t.updated})),listTitle:title};}
export async function createTask(title:string,notes?:string,taskListId?:string):Promise<TaskItem>{const token=await requestGoogleAuth();let id=taskListId;if(!id){const lists=await getTaskLists();if(!lists.items.length)throw new Error('No Google Task lists found.');id=lists.items[0].id;}const res=await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${id}/tasks`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({title,...(notes?{notes}:{})})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create task'));return res.json();}

// ---------------- Sheets ----------------
export interface SheetMetadata { spreadsheetId:string; title:string; sheets:{sheetId:number;title:string;index:number}[]; spreadsheetUrl:string; }
export async function createGoogleSheet(title:string,headerRow?:string[]):Promise<SheetMetadata>{const token=await requestGoogleAuth();const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({properties:{title:title||'Elara Data Log'}})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Sheet'));const d=await res.json();if(headerRow?.length)await appendSheetRow(d.spreadsheetId,'A1',[headerRow]);return {spreadsheetId:d.spreadsheetId,title:d.properties?.title||title,sheets:(d.sheets||[]).map((s:any)=>({sheetId:s.properties?.sheetId,title:s.properties?.title||'Sheet1',index:s.properties?.index||0})),spreadsheetUrl:d.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${d.spreadsheetId}/edit`};}
export async function getSpreadsheetDetails(spreadsheetId:string):Promise<SheetMetadata>{const token=await requestGoogleAuth();const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to fetch spreadsheet details'));const d=await res.json();return {spreadsheetId:d.spreadsheetId,title:d.properties?.title||'Spreadsheet',spreadsheetUrl:d.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,sheets:(d.sheets||[]).map((s:any)=>({sheetId:s.properties?.sheetId,title:s.properties?.title||'Sheet1',index:s.properties?.index||0}))};}
export async function readSheetValues(spreadsheetId:string,range='A1:Z100'):Promise<{range:string;values:any[][]}>{const token=await requestGoogleAuth();const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to read sheet values'));const d=await res.json();return {range:d.range||range,values:d.values||[]};}
export async function appendSheetRow(spreadsheetId:string,range='A1',rows:any[][]):Promise<{updatedRange:string;updatedRows:number}>{const token=await requestGoogleAuth();const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({values:rows})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to append row to Google Sheet'));const d=await res.json();return {updatedRange:d.updates?.updatedRange||range,updatedRows:d.updates?.updatedRows||rows.length};}

// ---------------- People / Contacts ----------------
export interface ContactPerson { resourceName:string; displayName:string; familyName?:string; givenName?:string; emailAddresses:string[]; phoneNumbers:string[]; organizations?:string[]; photoUrl?:string; }
export async function searchContacts(query:string,pageSize=10):Promise<{contacts:ContactPerson[]}>{const token=await requestGoogleAuth();if(!query.trim())return listContacts(pageSize);const res=await fetch(`https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to search Google Contacts'));const d=await res.json();return {contacts:(d.results||[]).map((r:any)=>{const p=r.person||{},n=p.names?.[0]||{};return {resourceName:p.resourceName||'',displayName:n.displayName||n.unstructuredName||'Unknown Contact',givenName:n.givenName,familyName:n.familyName,emailAddresses:(p.emailAddresses||[]).map((e:any)=>e.value).filter(Boolean),phoneNumbers:(p.phoneNumbers||[]).map((x:any)=>x.value).filter(Boolean),organizations:(p.organizations||[]).map((o:any)=>o.name||o.title).filter(Boolean),photoUrl:p.photos?.[0]?.url};})};}
export async function listContacts(pageSize=20):Promise<{contacts:ContactPerson[]}>{const token=await requestGoogleAuth();const res=await fetch(`https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}&sortOrder=FIRST_NAME_ASCENDING`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Contacts'));const d=await res.json();return {contacts:(d.connections||[]).map((p:any)=>{const n=p.names?.[0]||{};return {resourceName:p.resourceName||'',displayName:n.displayName||n.unstructuredName||'Unknown Contact',givenName:n.givenName,familyName:n.familyName,emailAddresses:(p.emailAddresses||[]).map((e:any)=>e.value).filter(Boolean),phoneNumbers:(p.phoneNumbers||[]).map((x:any)=>x.value).filter(Boolean),organizations:(p.organizations||[]).map((o:any)=>o.name||o.title).filter(Boolean),photoUrl:p.photos?.[0]?.url};})};}

// ---------------- Google Keep REAL API ----------------
export interface GoogleKeepNote { name:string; title:string; content:string; updateTime?:string; trashed?:boolean; }
export async function createGoogleKeepNote(title:string,content:string,passedToken?:string):Promise<GoogleKeepNote>{const token=passedToken||await requestGoogleAuth();const res=await fetch('https://keep.googleapis.com/v1/notes',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({title:title||'Untitled Note',body:{text:{text:content||''}}})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Keep note'));const d=await res.json();return {name:d.name,title:d.title||title||'',content:d.body?.text?.text||'',updateTime:d.updateTime,trashed:Boolean(d.trashed)};}
export async function listGoogleKeepNotes(pageSize=20,passedToken?:string):Promise<{notes:GoogleKeepNote[];nextPageToken?:string}>{const token=passedToken||await requestGoogleAuth();const res=await fetch(`https://keep.googleapis.com/v1/notes?pageSize=${Math.max(1,Math.min(pageSize,100))}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Keep notes'));const d=await res.json();return {notes:(d.notes||[]).map((n:any)=>({name:n.name,title:n.title||'',content:n.body?.text?.text||'',updateTime:n.updateTime,trashed:Boolean(n.trashed)})),nextPageToken:d.nextPageToken};}
export async function getGoogleKeepNote(noteName:string,passedToken?:string):Promise<GoogleKeepNote>{const token=passedToken||await requestGoogleAuth();const clean=noteName.startsWith('notes/')?noteName:`notes/${noteName}`;const res=await fetch(`https://keep.googleapis.com/v1/${clean}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to read Google Keep note'));const n=await res.json();return {name:n.name,title:n.title||'',content:n.body?.text?.text||'',updateTime:n.updateTime,trashed:Boolean(n.trashed)};}
export async function deleteGoogleKeepNote(noteName:string,passedToken?:string):Promise<void>{const token=passedToken||await requestGoogleAuth();const clean=noteName.startsWith('notes/')?noteName:`notes/${noteName}`;const res=await fetch(`https://keep.googleapis.com/v1/${clean}`,{method:'DELETE',headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to delete Google Keep note'));}

// ---------------- Local reference archive compatibility ----------------
export interface KeepNoteItem { id:string; title:string; content:string; tags:string[]; updatedAt:string; url?:string; }
const LOCAL_KEEP_ARCHIVE_KEY='elara_passive_keep_archive_v1';
export function loadLocalKeepArchive():KeepNoteItem[]{try{const raw=localStorage.getItem(LOCAL_KEEP_ARCHIVE_KEY);return raw?JSON.parse(raw):[];}catch{return [];}}
export function saveLocalKeepArchive(notes:KeepNoteItem[]){try{localStorage.setItem(LOCAL_KEEP_ARCHIVE_KEY,JSON.stringify(notes));}catch{}}
export async function createKeepNote(title:string,content:string,tags:string[]=[]):Promise<KeepNoteItem>{const note={id:`keep_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,title:title||'Untitled Note',content:content||'',tags,updatedAt:new Date().toISOString()};saveLocalKeepArchive([note,...loadLocalKeepArchive()]);return note;}
export async function searchKeepNotes(query=''):Promise<{notes:KeepNoteItem[]}>{const notes=loadLocalKeepArchive();if(!query.trim())return {notes};const q=query.toLowerCase();return {notes:notes.filter(n=>n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q)||n.tags.some(t=>t.toLowerCase().includes(q)))};}
export async function listKeepNotes():Promise<{notes:KeepNoteItem[]}>{return {notes:loadLocalKeepArchive()};}
export async function getKeepNote(idOrTitle:string):Promise<KeepNoteItem|null>{const q=idOrTitle.toLowerCase();return loadLocalKeepArchive().find(n=>n.id===idOrTitle||n.title.toLowerCase()===q||n.title.toLowerCase().includes(q))||null;}
export async function updateKeepNote(id:string,updates:Partial<KeepNoteItem>):Promise<KeepNoteItem|null>{const notes=loadLocalKeepArchive();const i=notes.findIndex(n=>n.id===id);if(i<0)return null;notes[i]={...notes[i],...updates,updatedAt:new Date().toISOString()};saveLocalKeepArchive(notes);return notes[i];}
export async function deleteKeepNote(id:string):Promise<boolean>{saveLocalKeepArchive(loadLocalKeepArchive().filter(n=>n.id!==id));return true;}
export async function copyCanvasToKeep(title:string,content:string,tags:string[]=['Canvas']){return createKeepNote(title||'Canvas Note',content,tags);}
export async function copyCanvasToGoogledocs(title:string,content:string){return createGoogleDoc(title||'Canvas Document',content);}

// ---------------- Google Chat ----------------
export interface ChatSpaceMember { name:string; displayName:string; avatarUrl?:string; type?:string; }
export interface ChatSpace { name:string; displayName?:string; type:string; spaceType?:string; spaceThreadingState?:string; singleUserBotDm?:boolean; members?:ChatSpaceMember[]; }
export interface ChatMessageResult { name:string; text?:string; thread?:{name:string}; space?:{name:string}; createTime?:string; sender?:string; }
export interface SpaceWebhookConfig { id:string; spaceId:string; name:string; webhookUrl:string; autoDailySummary:boolean; autoTaskAlerts:boolean; lastTriggered?:string; }
export function buildTaskApprovalCard(taskTitle:string,taskId:string,notes?:string,spaceName?:string){return {cardId:`task_approval_${taskId}_${Date.now()}`,card:{header:{title:'Task Execution Request',subtitle:'Elara Workspace Autonomous Action'},sections:[{widgets:[{textParagraph:{text:`<b>Title:</b> ${taskTitle}${notes?`<br><b>Notes:</b> ${notes}`:''}`}},{buttonList:{buttons:[{text:'Confirm & Add',onClick:{action:{function:'approve_task',parameters:[{key:'taskId',value:taskId},{key:'taskTitle',value:taskTitle},{key:'spaceName',value:spaceName||''}]}}},{text:'Cancel',onClick:{action:{function:'cancel_task',parameters:[{key:'taskId',value:taskId}]}}}]}}]}]}};}
export function buildDraftPreviewCard(title:string,summary:string,deepLinkUrl:string,type:'gmail'|'docs'|'sheet'|'chat'='gmail'){return {cardId:`draft_preview_${Date.now()}`,card:{header:{title:title||'Output Draft Ready',subtitle:`Elara Generated • ${type.toUpperCase()}`},sections:[{widgets:[{textParagraph:{text:summary}},{buttonList:{buttons:[{text:`Open in ${type==='gmail'?'Gmail Drafts':type==='docs'?'Google Docs':type==='sheet'?'Google Sheets':'Google Workspace'}`,onClick:{openLink:{url:deepLinkUrl}}}]}}]}]}};}
export function buildScheduleSweepCard(events:Array<{summary:string;time:string;location?:string}>){return {cardId:`schedule_sweep_${Date.now()}`,card:{header:{title:'Morning Schedule Sweep'},sections:[{widgets:[{textParagraph:{text:events.length?events.map((e,i)=>`<b>${i+1}. ${e.summary}</b><br>⏰ ${e.time}${e.location?`<br>📍 ${e.location}`:''}`).join('<br><br>'):'No upcoming events scheduled.'}},{buttonList:{buttons:[{text:'Open Google Calendar',onClick:{openLink:{url:'https://calendar.google.com'}}}]}}]}]}};}
export function buildSystemAlertCard(title:string,message:string,severity:'info'|'warning'|'alert'='info'){return {cardId:`system_alert_${Date.now()}`,card:{header:{title:title||'Elara System Status',subtitle:`Priority: ${severity.toUpperCase()}`},sections:[{widgets:[{textParagraph:{text:message}}]}]}};}
export async function listChatSpaces(pageSize=20):Promise<{spaces:ChatSpace[]}>{const token=await requestGoogleAuth();const res=await fetch(`https://chat.googleapis.com/v1/spaces?pageSize=${pageSize}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Chat spaces'));const d=await res.json();return {spaces:(d.spaces||[]).map((s:any)=>({name:s.name,displayName:s.displayName||'Workspace Space',type:s.type||s.spaceType||'SPACE',spaceType:s.spaceType||s.type,singleUserBotDm:s.singleUserBotDm||false}))};}
export async function createChatSpace(displayName:string,spaceType:'SPACE'|'GROUP_CHAT'='SPACE'):Promise<ChatSpace>{const token=await requestGoogleAuth();const res=await fetch('https://chat.googleapis.com/v1/spaces',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({displayName,spaceType})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Chat space'));const d=await res.json();return {name:d.name,displayName:d.displayName||displayName,type:d.type||spaceType,spaceType:d.spaceType||spaceType};}
export async function listChatMessages(spaceName:string,pageSize=20):Promise<{messages:ChatMessageResult[]}>{const token=await requestGoogleAuth();const clean=spaceName.startsWith('spaces/')?spaceName:`spaces/${spaceName}`;const res=await fetch(`https://chat.googleapis.com/v1/${clean}/messages?pageSize=${pageSize}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Chat messages'));const d=await res.json();return {messages:(d.messages||[]).map((m:any)=>({name:m.name,text:m.text||'',thread:m.thread,space:m.space,createTime:m.createTime,sender:m.sender?.displayName||m.sender?.name||'User'}))};}
export async function sendChatMessage(spaceName:string,text:string,threadKey?:string):Promise<ChatMessageResult>{const token=await requestGoogleAuth();const clean=spaceName.startsWith('spaces/')?spaceName:`spaces/${spaceName}`;const body:any={text};if(threadKey)body.thread={threadKey};const res=await fetch(`https://chat.googleapis.com/v1/${clean}/messages`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify(body)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to send Google Chat message'));const d=await res.json();return {name:d.name,text:d.text,thread:d.thread,space:d.space,createTime:d.createTime};}
export async function sendChatCardMessage(spaceName:string,cardsV2:any[],textFallback='',threadKey?:string):Promise<ChatMessageResult>{const token=await requestGoogleAuth();const clean=spaceName.startsWith('spaces/')?spaceName:`spaces/${spaceName}`;const body:any={text:textFallback,cardsV2:Array.isArray(cardsV2)?cardsV2:[cardsV2]};if(threadKey)body.thread={threadKey};const res=await fetch(`https://chat.googleapis.com/v1/${clean}/messages`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify(body)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to send Google Chat card'));const d=await res.json();return {name:d.name,text:d.text,thread:d.thread,space:d.space,createTime:d.createTime};}
export async function postChatWebhook(webhookUrl:string,payload:any){if(!/^https?:\/\//.test(webhookUrl))throw new Error('Valid webhook URL required.');const res=await fetch(webhookUrl,{method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(payload)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Google Chat webhook post failed'));try{return await res.json();}catch{return {status:'success'};}}
const LOCAL_WEBHOOKS_KEY='elara_google_chat_webhooks_v1';
export function loadSpaceWebhooks():SpaceWebhookConfig[]{try{const raw=localStorage.getItem(LOCAL_WEBHOOKS_KEY);return raw?JSON.parse(raw):[];}catch{return [];}}
export function saveSpaceWebhooks(configs:SpaceWebhookConfig[]){try{localStorage.setItem(LOCAL_WEBHOOKS_KEY,JSON.stringify(configs));}catch{}}

// Legacy compatibility exports. The new V3 agent path uses workspaceTools.ts + googleAgentTools.ts.
export async function executeWorkspaceTool(toolName:string,args:any={}):Promise<any>{
  switch(toolName){
    case 'get_recent_emails': return listGmailMessages(args?.query||'',args?.maxResults||10);
    case 'get_calendar_events': return getUpcomingCalendarEvents(args?.maxResults||10);
    case 'get_tasks': return getTasks(args?.taskListId);
    case 'create_google_doc': return createGoogleDoc(args?.title||'Document',args?.content||'');
    case 'create_google_sheet': return createGoogleSheet(args?.title||'Data Log',args?.headerRow);
    case 'read_sheet_values': return readSheetValues(args?.spreadsheetId,args?.range||'A1:Z50');
    case 'append_sheet_row': return appendSheetRow(args?.spreadsheetId,args?.range||'A1',Array.isArray(args?.rowValues?.[0])?args.rowValues:[args.rowValues]);
    default: return {status:'error',message:`Unknown legacy Google tool: ${toolName}`};
  }
}
export const WORKSPACE_FUNCTION_DECLARATIONS:any[] = [];
