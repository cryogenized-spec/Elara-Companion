export const durableGoogleTools = [
  {
    name: 'list_google_calendar_events',
    description: 'List upcoming Google Calendar events for the user.',
    parameters: { type: 'OBJECT', properties: { maxResults: { type: 'INTEGER' } } },
  },
  {
    name: 'list_google_tasks',
    description: 'List the user\'s Google Tasks.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'list_gmail_messages',
    description: 'List recent Gmail messages. Read-only background access.',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' }, maxResults: { type: 'INTEGER' } } },
  },
  {
    name: 'read_gmail_message',
    description: 'Read a Gmail message by message ID. Read-only background access.',
    parameters: { type: 'OBJECT', properties: { messageId: { type: 'STRING' } }, required: ['messageId'] },
  },
  {
    name: 'search_google_drive',
    description: 'Search Google Drive files by name or query. Read-only background access.',
    parameters: { type: 'OBJECT', properties: { query: { type: 'STRING' }, pageSize: { type: 'INTEGER' } }, required: ['query'] },
  },
  {
    name: 'read_google_drive_file',
    description: 'Read a Google Drive file by file ID. Read-only background access.',
    parameters: { type: 'OBJECT', properties: { fileId: { type: 'STRING' } }, required: ['fileId'] },
  },
  {
    name: 'read_google_doc',
    description: 'Read a Google Doc by document ID. Read-only background access.',
    parameters: { type: 'OBJECT', properties: { documentId: { type: 'STRING' } }, required: ['documentId'] },
  },
] as const;

async function googleFetch(accessToken: string, url: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const raw = await response.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error(`Google API returned non-JSON response (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(data?.error?.message || `Google API request failed (HTTP ${response.status}).`);
  return data;
}

function safeLimit(value: unknown, fallback: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(max, Math.floor(n))) : fallback;
}

export async function executeDurableGoogleReadTool(toolName: string, args: any, accessToken: string): Promise<any> {
  const safeArgs = args && typeof args === 'object' ? args : {};
  switch (toolName) {
    case 'list_google_calendar_events': {
      const maxResults = safeLimit(safeArgs.maxResults, 15, 50);
      const timeMin = encodeURIComponent(new Date().toISOString());
      const data = await googleFetch(accessToken, `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&maxResults=${maxResults}`);
      return { success: true, events: (data.items || []).map((item: any) => ({ id: item.id, summary: item.summary, description: item.description, start: item.start, end: item.end, htmlLink: item.htmlLink })) };
    }
    case 'list_google_tasks': {
      const lists = await googleFetch(accessToken, 'https://tasks.googleapis.com/tasks/v1/users/@me/lists');
      const taskList = (lists.items || [])[0];
      if (!taskList) return { success: true, tasks: [] };
      const tasks = await googleFetch(accessToken, `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskList.id)}/tasks?showCompleted=false&showHidden=false&maxResults=100`);
      return { success: true, taskList: { id: taskList.id, title: taskList.title }, tasks: (tasks.items || []).map((item: any) => ({ id: item.id, title: item.title, notes: item.notes, due: item.due, status: item.status, updated: item.updated })) };
    }
    case 'list_gmail_messages': {
      const maxResults = safeLimit(safeArgs.maxResults, 20, 50);
      const query = encodeURIComponent(typeof safeArgs.query === 'string' ? safeArgs.query : '');
      const list = await googleFetch(accessToken, `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${query ? `&q=${query}` : ''}`);
      const messages = [];
      for (const item of (list.messages || []).slice(0, maxResults)) {
        const data = await googleFetch(accessToken, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
        const headers = Object.fromEntries((data.payload?.headers || []).map((h: any) => [h.name, h.value]));
        messages.push({ id: data.id, threadId: data.threadId, snippet: data.snippet, subject: headers.Subject, from: headers.From, date: headers.Date, labelIds: data.labelIds });
      }
      return { success: true, messages };
    }
    case 'read_gmail_message': {
      const id = String(safeArgs.messageId || '').trim();
      if (!id) return { success: false, error: 'messageId is required.' };
      const data = await googleFetch(accessToken, `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`);
      return { success: true, id: data.id, threadId: data.threadId, snippet: data.snippet, payload: data.payload, labelIds: data.labelIds, internalDate: data.internalDate };
    }
    case 'search_google_drive': {
      const query = String(safeArgs.query || '').trim().replace(/'/g, "\\'");
      if (!query) return { success: false, error: 'query is required.' };
      const pageSize = safeLimit(safeArgs.pageSize, 20, 50);
      const q = encodeURIComponent(`name contains '${query}' and trashed = false`);
      const data = await googleFetch(accessToken, `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink,description)`);
      return { success: true, files: data.files || [] };
    }
    case 'read_google_drive_file': {
      const id = String(safeArgs.fileId || '').trim();
      if (!id) return { success: false, error: 'fileId is required.' };
      const meta = await googleFetch(accessToken, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,name,mimeType,modifiedTime,webViewLink,description`);
      let content: string | null = null;
      if (meta.mimeType === 'application/vnd.google-apps.document') {
        const doc = await googleFetch(accessToken, `https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}`);
        content = (doc.body?.content || []).flatMap((block: any) => block.paragraph?.elements || []).map((el: any) => el.textRun?.content || '').join('');
      } else if (meta.mimeType === 'text/plain') {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
        content = await response.text();
      }
      return { success: true, metadata: meta, content };
    }
    case 'read_google_doc': {
      const id = String(safeArgs.documentId || '').trim();
      if (!id) return { success: false, error: 'documentId is required.' };
      const doc = await googleFetch(accessToken, `https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}`);
      const text = (doc.body?.content || []).flatMap((block: any) => block.paragraph?.elements || []).map((el: any) => el.textRun?.content || '').join('');
      return { success: true, documentId: doc.documentId, title: doc.title, text };
    }
    default:
      return { success: false, error: `Unsupported durable Google read tool: ${toolName}` };
  }
}
