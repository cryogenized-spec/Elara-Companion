import { googleCapabilities, googleIdentity } from './googleWorkspaceService';
import type { GoogleCapability } from './googleWorkspaceService';

async function getGoogleFamilyAccessToken(capability: GoogleCapability, passedToken?: string): Promise<string> {
  if (passedToken?.trim()) return passedToken.trim();
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
export async function createGoogleSheet(title:string,headerRow?:string[],passedToken?:string):Promise<SheetMetadata>{const token=await getGoogleFamilyAccessToken('sheets.write',passedToken);const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({properties:{title:title||'Elara Data Log'}})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Sheet'));const d=await res.json();if(headerRow?.length)await appendSheetRow(d.spreadsheetId,'A1',[headerRow],token);return {spreadsheetId:d.spreadsheetId,title:d.properties?.title||title,sheets:(d.sheets||[]).map((s:any)=>({sheetId:s.properties?.sheetId,title:s.properties?.title||'Sheet1',index:s.properties?.index||0})),spreadsheetUrl:d.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${d.spreadsheetId}/edit`};}
export async function getSpreadsheetDetails(spreadsheetId:string,passedToken?:string):Promise<SheetMetadata>{const token=await getGoogleFamilyAccessToken('sheets.read',passedToken);const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to fetch spreadsheet details'));const d=await res.json();return {spreadsheetId:d.spreadsheetId,title:d.properties?.title||'Spreadsheet',spreadsheetUrl:d.spreadsheetUrl||`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,sheets:(d.sheets||[]).map((s:any)=>({sheetId:s.properties?.sheetId,title:s.properties?.title||'Sheet1',index:s.properties?.index||0}))};}
export async function readSheetValues(spreadsheetId:string,range='A1:Z100',passedToken?:string):Promise<{range:string;values:any[][]}>{const token=await getGoogleFamilyAccessToken('sheets.read',passedToken);const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to read sheet values'));const d=await res.json();return {range:d.range||range,values:d.values||[]};}
export async function appendSheetRow(spreadsheetId:string,range='A1',rows:any[][],passedToken?:string):Promise<{updatedRange:string;updatedRows:number}>{const token=await getGoogleFamilyAccessToken('sheets.write',passedToken);const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({values:rows})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to append row to Google Sheet'));const d=await res.json();return {updatedRange:d.updates?.updatedRange||range,updatedRows:d.updates?.updatedRows||rows.length};}
export async function writeSheetValues(spreadsheetId:string,range:string,values:any[][],passedToken?:string):Promise<{updatedRange:string;updatedCells:number;updatedRows:number}>{const token=await getGoogleFamilyAccessToken('sheets.write',passedToken);const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,{method:'PUT',headers:jsonHeaders(token),body:JSON.stringify({range,majorDimension:'ROWS',values})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to write Google Sheet range'));const d=await res.json();return {updatedRange:d.updatedRange||range,updatedCells:d.updatedCells||0,updatedRows:d.updatedRows||values.length};}
export async function batchUpdateGoogleSheet(spreadsheetId:string,requests:any[],passedToken?:string):Promise<{replies:any[]}>{const token=await getGoogleFamilyAccessToken('sheets.write',passedToken);const res=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({requests})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to batch update Google Sheet'));const d=await res.json();return {replies:d.replies||[]};}
