type ToolResult = { success: true; provider: string; operation: string; [key: string]: any } | { success: false; provider: string; errorCode: string; message: string; requiresUserAuth?: boolean };

function requireToken(token?: string): string | null {
  return token && token.trim() ? token.trim() : null;
}

async function parseGoogleError(response: Response, provider: string): Promise<ToolResult> {
  let message = `Google ${provider} request failed (HTTP ${response.status}).`;
  try {
    const body = await response.json();
    message = body?.error?.message || message;
  } catch {
    // keep generic message
  }
  const status = response.status;
  const errorCode = status === 401 ? 'GOOGLE_AUTH_REQUIRED'
    : status === 403 ? 'GOOGLE_PERMISSION_DENIED'
      : status === 404 ? 'GOOGLE_NOT_FOUND'
        : status === 429 ? 'GOOGLE_RATE_LIMIT'
          : status === 400 ? 'GOOGLE_BAD_REQUEST'
            : status >= 500 ? 'GOOGLE_SERVICE_UNAVAILABLE'
              : 'GOOGLE_UNKNOWN_ERROR';
  return {
    success: false,
    provider,
    errorCode,
    message,
    requiresUserAuth: status === 401 || (status === 403 && /scope|permission|authorization/i.test(message)),
  };
}

export const googleAgentToolDeclarations = [
  {
    name: 'create_google_sheet',
    description: 'Create a real Google Spreadsheet. Use this when the user explicitly asks for a spreadsheet/sheet.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Spreadsheet title.' },
        headers: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Optional first-row headers.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'read_google_sheet',
    description: 'Read metadata and sheet tab names from a Google Spreadsheet.',
    parameters: {
      type: 'OBJECT',
      properties: { spreadsheetId: { type: 'STRING', description: 'Spreadsheet ID.' } },
      required: ['spreadsheetId'],
    },
  },
  {
    name: 'read_google_sheet_range',
    description: 'Read cell values from a Google Spreadsheet using A1 notation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spreadsheetId: { type: 'STRING', description: 'Spreadsheet ID.' },
        range: { type: 'STRING', description: 'A1 range such as Sheet1!A1:D20.' },
      },
      required: ['spreadsheetId', 'range'],
    },
  },
  {
    name: 'write_google_sheet_range',
    description: 'Write values to a Google Spreadsheet range. This replaces the addressed cells only; never clear unrelated ranges.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spreadsheetId: { type: 'STRING', description: 'Spreadsheet ID.' },
        range: { type: 'STRING', description: 'A1 range such as Sheet1!A1:D4.' },
        values: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } }, description: '2D values to write.' },
      },
      required: ['spreadsheetId', 'range', 'values'],
    },
  },
  {
    name: 'append_google_sheet_row',
    description: 'Append one or more rows to a Google Spreadsheet table/range.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spreadsheetId: { type: 'STRING', description: 'Spreadsheet ID.' },
        range: { type: 'STRING', description: 'A1 table/range anchor, e.g. Sheet1!A1.' },
        rows: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } }, description: 'Rows to append.' },
      },
      required: ['spreadsheetId', 'rows'],
    },
  },
  {
    name: 'batch_update_google_sheet',
    description: 'Apply supported structural Google Sheets requests atomically. Use only documented Sheets API request objects.',
    parameters: {
      type: 'OBJECT',
      properties: {
        spreadsheetId: { type: 'STRING', description: 'Spreadsheet ID.' },
        requests: { type: 'ARRAY', items: { type: 'OBJECT' }, description: 'Google Sheets batchUpdate request objects.' },
      },
      required: ['spreadsheetId', 'requests'],
    },
  },
  {
    name: 'create_google_keep_note',
    description: 'Create a genuine Google Keep text note using the official Google Keep API.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Keep note title.' },
        content: { type: 'STRING', description: 'Keep note text content. Keep text sections are limited by the official API.' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'list_google_keep_notes',
    description: 'List real Google Keep notes accessible to the authenticated user.',
    parameters: {
      type: 'OBJECT',
      properties: { pageSize: { type: 'INTEGER', description: 'Maximum number of notes to return.' } },
    },
  },
  {
    name: 'read_google_keep_note',
    description: 'Read a real Google Keep note by resource name (notes/ID).',
    parameters: {
      type: 'OBJECT',
      properties: { noteName: { type: 'STRING', description: 'Keep note resource name, e.g. notes/abc123.' } },
      required: ['noteName'],
    },
  },
  {
    name: 'delete_google_keep_note',
    description: 'Delete a real Google Keep note. This is irreversible and requires explicit user intent.',
    parameters: {
      type: 'OBJECT',
      properties: { noteName: { type: 'STRING', description: 'Keep note resource name, e.g. notes/abc123.' } },
      required: ['noteName'],
    },
  },
];

export const GOOGLE_AGENT_TOOL_NAMES = new Set(googleAgentToolDeclarations.map((tool) => tool.name));

export async function executeGoogleAgentTool(toolName: string, args: any, accessToken?: string): Promise<ToolResult> {
  const token = requireToken(accessToken);
  if (!token) {
    return { success: false, provider: toolName.startsWith('create_google_keep') || toolName.includes('keep') ? 'google_keep' : 'google_sheets', errorCode: 'GOOGLE_AUTH_REQUIRED', message: 'Google authorization is required before this tool can run.', requiresUserAuth: true };
  }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const safeArgs = args && typeof args === 'object' ? args : {};

  try {
    switch (toolName) {
      case 'create_google_sheet': {
        const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST', headers, body: JSON.stringify({ properties: { title: String(safeArgs.title || 'Elara Spreadsheet') } }),
        });
        if (!res.ok) return await parseGoogleError(res, 'google_sheets');
        const data = await res.json();
        if (Array.isArray(safeArgs.headers) && safeArgs.headers.length > 0 && data.spreadsheetId) {
          await writeSheetValues(data.spreadsheetId, 'Sheet1!A1', [safeArgs.headers], token);
        }
        return { success: true, provider: 'google_sheets', operation: 'create', spreadsheetId: data.spreadsheetId, title: data.properties?.title, spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit` };
      }
      case 'read_google_sheet': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`, { headers });
        if (!res.ok) return await parseGoogleError(res, 'google_sheets');
        const data = await res.json();
        return { success: true, provider: 'google_sheets', operation: 'read_metadata', spreadsheetId: data.spreadsheetId, title: data.properties?.title, spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}/edit`, sheets: (data.sheets || []).map((s: any) => s.properties) };
      }
      case 'read_google_sheet_range': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const range = String(safeArgs.range || '').trim();
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return await parseGoogleError(res, 'google_sheets');
        const data = await res.json();
        return { success: true, provider: 'google_sheets', operation: 'read_range', spreadsheetId: id, range: data.range || range, values: data.values || [] };
      }
      case 'write_google_sheet_range': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const range = String(safeArgs.range || '').trim();
        const values = Array.isArray(safeArgs.values) ? safeArgs.values : [];
        const result = await writeSheetValues(id, range, values, token);
        return result;
      }
      case 'append_google_sheet_row': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const range = String(safeArgs.range || 'A1').trim();
        const rows = Array.isArray(safeArgs.rows) ? safeArgs.rows : [];
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', headers, body: JSON.stringify({ values: rows }) });
        if (!res.ok) return await parseGoogleError(res, 'google_sheets');
        const data = await res.json();
        return { success: true, provider: 'google_sheets', operation: 'append_rows', spreadsheetId: id, updatedRange: data.updates?.updatedRange || range, updatedRows: data.updates?.updatedRows || rows.length };
      }
      case 'batch_update_google_sheet': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const requests = Array.isArray(safeArgs.requests) ? safeArgs.requests : [];
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}:batchUpdate`, { method: 'POST', headers, body: JSON.stringify({ requests }) });
        if (!res.ok) return await parseGoogleError(res, 'google_sheets');
        const data = await res.json();
        return { success: true, provider: 'google_sheets', operation: 'batch_update', spreadsheetId: id, replies: data.replies || [] };
      }
      case 'create_google_keep_note': {
        const title = String(safeArgs.title || 'Untitled Note').slice(0, 999);
        const content = String(safeArgs.content || '').slice(0, 19999);
        const res = await fetch('https://keep.googleapis.com/v1/notes', { method: 'POST', headers, body: JSON.stringify({ title, body: { text: { text: content } } }) });
        if (!res.ok) return await parseGoogleError(res, 'google_keep');
        const data = await res.json();
        return { success: true, provider: 'google_keep', operation: 'create', noteName: data.name, title: data.title, content: data.body?.text?.text || '', updateTime: data.updateTime };
      }
      case 'list_google_keep_notes': {
        const pageSize = Math.max(1, Math.min(Number(safeArgs.pageSize || 20), 100));
        const url = `https://keep.googleapis.com/v1/notes?pageSize=${pageSize}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return await parseGoogleError(res, 'google_keep');
        const data = await res.json();
        return { success: true, provider: 'google_keep', operation: 'list', notes: (data.notes || []).map((n: any) => ({ noteName: n.name, title: n.title || '', content: n.body?.text?.text || '', updateTime: n.updateTime, trashed: Boolean(n.trashed) })), nextPageToken: data.nextPageToken };
      }
      case 'read_google_keep_note': {
        const name = String(safeArgs.noteName || '').trim();
        const cleanName = name.startsWith('notes/') ? name : `notes/${name}`;
        const res = await fetch(`https://keep.googleapis.com/v1/${cleanName}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return await parseGoogleError(res, 'google_keep');
        const data = await res.json();
        return { success: true, provider: 'google_keep', operation: 'read', noteName: data.name, title: data.title || '', content: data.body?.text?.text || '', updateTime: data.updateTime, trashed: Boolean(data.trashed) };
      }
      case 'delete_google_keep_note': {
        const name = String(safeArgs.noteName || '').trim();
        const cleanName = name.startsWith('notes/') ? name : `notes/${name}`;
        const res = await fetch(`https://keep.googleapis.com/v1/${cleanName}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return await parseGoogleError(res, 'google_keep');
        return { success: true, provider: 'google_keep', operation: 'delete', noteName: cleanName };
      }
      default:
        return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown Google agent tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: toolName.includes('keep') ? 'google_keep' : 'google_sheets', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google operation failed') };
  }
}

async function writeSheetValues(spreadsheetId: string, range: string, values: any[][], token: string): Promise<ToolResult> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!res.ok) return await parseGoogleError(res, 'google_sheets');
  const data = await res.json();
  return { success: true, provider: 'google_sheets', operation: 'write_range', spreadsheetId, range: data.updatedRange || range, updatedCells: data.updatedCells || 0, updatedRows: data.updatedRows || values.length };
}
