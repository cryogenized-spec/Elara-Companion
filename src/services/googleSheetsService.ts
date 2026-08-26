import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

async function getGoogleFamilyAccessToken(capability: GoogleCapability): Promise<string> {
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

export interface SheetMetadata { spreadsheetId:string; title:string; sheets:{sheetId:number;title:string;index:number}[]; spreadsheetUrl:string; }
export async function createGoogleSheet(title:string,headerRow?:string[]):Promise<SheetMetadata>{const token=await getGoogleFamilyAccessToken('sheets.write');const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({properties:{title:title||'Elara Data Log'}})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Sheet'));const d=await res.json();if(headerRow?.length)await appendSheetRow(d.spreadsheetId,'A1',[headerRow]);return {spreadsheetId:d.spreadsheetId,title:d.properties?.title||title,sheets:(d.sheets||[]).map((s:any)=>({sheetId:s.properties?.sheetId,title:s.properties?.title||'Sheet1',index:s.properties?.index||0})),spreadsheetUrl:d.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${d.spreadsheetId}/edit`};}
export async function getSpreadsheetDetails(spreadsheetId:string):Promise<SheetMetadata>{const token=await getGoogleFamilyAccessToken('sheets.read');const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to fetch spreadsheet details'));const d=await res.json();return {spreadsheetId:d.spreadsheetId,title:d.properties?.title||'Spreadsheet',spreadsheetUrl:d.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,sheets:(d.sheets||[]).map((s:any)=>({sheetId:s.properties?.sheetId,title:s.properties?.title||'Sheet1',index:s.properties?.index||0}))};}
export async function readSheetValues(spreadsheetId:string,range='A1:Z100'):Promise<{range:string;values:any[][]}>{const token=await getGoogleFamilyAccessToken('sheets.read');const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to read sheet values'));const d=await res.json();return {range:d.range||range,values:d.values||[]};}
export async function appendSheetRow(spreadsheetId:string,range='A1',rows:any[][]):Promise<{updatedRange:string;updatedRows:number}>{const token=await getGoogleFamilyAccessToken('sheets.write');const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({values:rows})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to append row to Google Sheet'));const d=await res.json();return {updatedRange:d.updates?.updatedRange||range,updatedRows:d.updates?.updatedRows||rows.length};}
