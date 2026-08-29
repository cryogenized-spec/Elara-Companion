import {
  appendSheetRow,
  batchUpdateGoogleSheet,
  createGoogleSheet,
  getSpreadsheetDetails,
  readSheetValues,
  writeSheetValues,
} from '../services/googleSheetsService';

type ToolResult = { success: true; provider: string; operation: string; [key: string]: any } | { success: false; provider: string; errorCode: string; message: string; requiresUserAuth?: boolean };

function requireToken(token?: string): string | null {
  return token && token.trim() ? token.trim() : null;
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
];

export const GOOGLE_AGENT_TOOL_NAMES = new Set(googleAgentToolDeclarations.map((tool) => tool.name));

export async function executeGoogleAgentTool(toolName: string, args: any, accessToken?: string): Promise<ToolResult> {
  const token = requireToken(accessToken);
  if (!token) {
    return {
      success: false,
      provider: 'google_sheets',
      errorCode: 'GOOGLE_AUTH_REQUIRED',
      message: 'Google authorization is required before this tool can run.',
      requiresUserAuth: true,
    };
  }

  const safeArgs = args && typeof args === 'object' ? args : {};

  try {
    switch (toolName) {
      case 'create_google_sheet': {
        const data = await createGoogleSheet(
          String(safeArgs.title || 'Elara Spreadsheet'),
          Array.isArray(safeArgs.headers) ? safeArgs.headers.map(String) : undefined,
          token,
        );
        return { success: true, provider: 'google_sheets', operation: 'create', spreadsheetId: data.spreadsheetId, title: data.title, spreadsheetUrl: data.spreadsheetUrl };
      }
      case 'read_google_sheet': {
        const data = await getSpreadsheetDetails(String(safeArgs.spreadsheetId || '').trim(), token);
        return { success: true, provider: 'google_sheets', operation: 'read_metadata', spreadsheetId: data.spreadsheetId, title: data.title, spreadsheetUrl: data.spreadsheetUrl, sheets: data.sheets };
      }
      case 'read_google_sheet_range': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const data = await readSheetValues(id, String(safeArgs.range || '').trim(), token);
        return { success: true, provider: 'google_sheets', operation: 'read_range', spreadsheetId: id, range: data.range, values: data.values };
      }
      case 'write_google_sheet_range': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const data = await writeSheetValues(id, String(safeArgs.range || '').trim(), Array.isArray(safeArgs.values) ? safeArgs.values : [], token);
        return { success: true, provider: 'google_sheets', operation: 'write_range', spreadsheetId: id, range: data.updatedRange, updatedCells: data.updatedCells, updatedRows: data.updatedRows };
      }
      case 'append_google_sheet_row': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const data = await appendSheetRow(id, String(safeArgs.range || 'A1').trim(), Array.isArray(safeArgs.rows) ? safeArgs.rows : [], token);
        return { success: true, provider: 'google_sheets', operation: 'append_rows', spreadsheetId: id, updatedRange: data.updatedRange, updatedRows: data.updatedRows };
      }
      case 'batch_update_google_sheet': {
        const id = String(safeArgs.spreadsheetId || '').trim();
        const data = await batchUpdateGoogleSheet(id, Array.isArray(safeArgs.requests) ? safeArgs.requests : [], token);
        return { success: true, provider: 'google_sheets', operation: 'batch_update', spreadsheetId: id, replies: data.replies };
      }
      default:
        return { success: false, provider: 'google', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: `Unknown Google agent tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, provider: 'google_sheets', errorCode: 'GOOGLE_UNKNOWN_ERROR', message: String(error?.message || error || 'Google operation failed') };
  }
}
