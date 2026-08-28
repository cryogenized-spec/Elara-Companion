import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

async function getGoogleDocsDriveAccessToken(capability: GoogleCapability): Promise<string> {
  const token = googleIdentity.getAccessToken();
  if (token && googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability)) return token;
  return googleIdentity.requestCapabilityAuthorization(googleCapabilities.getScopes(capability), false);
}

async function parseGoogleApiError(res: Response, prefix: string): Promise<string> {
  const raw = await res.text().catch(() => '');
  try { const json = JSON.parse(raw); return `${prefix}: ${json?.error?.message || json?.error || `HTTP ${res.status}`}`; }
  catch { return `${prefix}: ${raw || `HTTP ${res.status}`}`; }
}

function authHeaders(token: string) { return { Authorization: `Bearer ${token}` }; }
function jsonHeaders(token: string) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

export interface GoogleDocSummary { id: string; name: string; title: string; modifiedTime?: string; webViewLink?: string; url?: string; }
export interface GoogleDriveFileSummary { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; size?: string; }

export async function createGoogleDoc(title: string, content: string, passedToken?: string): Promise<{ documentId: string; url: string; title: string }> {
  const token = passedToken || await getGoogleDocsDriveAccessToken('docs');
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
  const token = passedToken || await getGoogleDocsDriveAccessToken('docs');
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, `Failed to retrieve Google Doc (${documentId})`));
  const doc = await res.json(); let content = '';
  const walk = (nodes: any[]) => nodes.forEach((node) => { if (node.paragraph?.elements) node.paragraph.elements.forEach((e: any) => { if (e.textRun?.content) content += e.textRun.content; }); if (node.table?.tableRows) node.table.tableRows.forEach((row: any) => row.tableCells?.forEach((cell: any) => walk(cell.content || []))); });
  walk(doc.body?.content || []);
  return { documentId: doc.documentId, title: doc.title || 'Untitled Document', content: content.trim(), url: `https://docs.google.com/document/d/${doc.documentId}/edit` };
}

export async function editGoogleDoc(documentId: string, newText: string, mode: 'append'|'replace'|'prepend' = 'append', passedToken?: string): Promise<{ documentId: string; url: string; success: boolean }> {
  const token = passedToken || await getGoogleDocsDriveAccessToken('docs'); let requests: any[] = [];
  if (mode === 'append') requests = [{ insertText: { endOfSegmentLocation: {}, text: `\n\n${newText}` } }];
  if (mode === 'prepend') requests = [{ insertText: { location: { index: 1 }, text: `${newText}\n\n` } }];
  if (mode === 'replace') { const docRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers: authHeaders(token) }); if (!docRes.ok) throw new Error(await parseGoogleApiError(docRes, 'Failed to inspect Google Doc')); const doc = await docRes.json(); const content = doc.body?.content || []; const last = content[content.length - 1]; const endIndex = Math.max(1, (last?.endIndex || 2) - 1); if (endIndex > 1) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex } } }); requests.push({ insertText: { location: { index: 1 }, text: newText } }); }
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify({ requests }) });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to update Google Doc'));
  return { documentId, url: `https://docs.google.com/document/d/${documentId}/edit`, success: true };
}

export async function searchGoogleDriveDocs(query = '', maxResults = 10, passedToken?: string): Promise<{ docs: GoogleDocSummary[] }> { const token = passedToken || await getGoogleDocsDriveAccessToken('drive.read'); let q = "mimeType = 'application/vnd.google-apps.document' and trashed = false"; if (query.trim()) q += ` and name contains '${query.replace(/['\\]/g, '')}'`; const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${maxResults}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`, { headers: authHeaders(token) }); if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to search Google Drive documents')); const data = await res.json(); return { docs: (data.files || []).map((f: any) => ({ id: f.id, name: f.name || 'Untitled Doc', title: f.name || 'Untitled Doc', modifiedTime: f.modifiedTime, webViewLink: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit`, url: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit` })) }; }

export async function listGoogleDriveFiles(pageSize = 10, query = '', passedToken?: string): Promise<{ files: GoogleDriveFileSummary[] }> { const token = passedToken || await getGoogleDocsDriveAccessToken('drive.read'); let q = 'trashed = false'; if (query.trim()) { const clean = query.replace(/['\\]/g, ''); q += ` and (name contains '${clean}' or fullText contains '${clean}')`; } const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size)&orderBy=modifiedTime desc`, { headers: authHeaders(token) }); if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to list Google Drive files')); const data = await res.json(); return { files: (data.files || []).map((f: any) => ({ id: f.id, name: f.name || 'Untitled File', mimeType: f.mimeType || 'unknown', modifiedTime: f.modifiedTime, webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`, size: f.size })) }; }
export async function searchGoogleDriveFiles(query: string, pageSize = 10, passedToken?: string) { return listGoogleDriveFiles(pageSize, query, passedToken); }

export async function uploadGoogleDriveFile(file: File, passedToken?: string): Promise<GoogleDriveFileSummary> {
  const token = passedToken || await getGoogleDocsDriveAccessToken('drive.file');
  const metadata = { name: file.name, mimeType: file.type || 'application/octet-stream' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file, file.name);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink,size', { method: 'POST', headers: authHeaders(token), body: form });
  if (!res.ok) throw new Error(await parseGoogleApiError(res, 'Failed to upload Google Drive file'));
  const data = await res.json();
  return { id: data.id, name: data.name || file.name, mimeType: data.mimeType || metadata.mimeType, modifiedTime: data.modifiedTime, webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`, size: data.size };
}

export async function readGoogleDriveFile(fileId: string, passedToken?: string): Promise<{ id:string; name:string; mimeType:string; content:string; webViewLink:string }> {
  const token = passedToken || await getGoogleDocsDriveAccessToken('drive.read'); const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink`, { headers: authHeaders(token) }); if (!metaRes.ok) throw new Error(await parseGoogleApiError(metaRes, `Failed to find Google Drive file (${fileId})`)); const meta = await metaRes.json(); if (meta.mimeType === 'application/vnd.google-apps.document') { const doc = await getGoogleDoc(fileId, token); return { id: meta.id, name: meta.name || doc.title, mimeType: meta.mimeType, content: doc.content, webViewLink: meta.webViewLink || doc.url }; } if (meta.mimeType === 'application/vnd.google-apps.spreadsheet') return { id: meta.id, name: meta.name || 'Spreadsheet', mimeType: meta.mimeType, content: '[Google Spreadsheet: use Sheets tools for structured cell access]', webViewLink: meta.webViewLink || `https://docs.google.com/spreadsheets/d/${fileId}/edit` }; if (meta.mimeType?.startsWith('application/vnd.google-apps.')) { const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, { headers: authHeaders(token) }); if (exportRes.ok) return { id: meta.id, name: meta.name || 'Google file', mimeType: meta.mimeType, content: (await exportRes.text()).trim(), webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view` }; } const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: authHeaders(token) }); if (contentRes.ok) return { id: meta.id, name: meta.name || 'Untitled File', mimeType: meta.mimeType || 'unknown', content: await contentRes.text(), webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view` }; return { id: meta.id, name: meta.name || 'Untitled File', mimeType: meta.mimeType || 'unknown', content: '[Binary or Non-Text File Content]', webViewLink: meta.webViewLink || `https://drive.google.com/file/d/${fileId}/view` };
}
