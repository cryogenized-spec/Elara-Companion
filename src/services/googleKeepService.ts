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

export interface GoogleKeepNote { name:string; title:string; content:string; updateTime?:string; trashed?:boolean; }
export async function createGoogleKeepNote(title:string,content:string,passedToken?:string):Promise<GoogleKeepNote>{const token=passedToken||await getGoogleFamilyAccessToken('keep.write');const res=await fetch('https://keep.googleapis.com/v1/notes',{method:'POST',headers:jsonHeaders(token),body:JSON.stringify({title:title||'Untitled Note',body:{text:{text:content||''}}})});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to create Google Keep note'));const d=await res.json();return {name:d.name,title:d.title||title||'',content:d.body?.text?.text||'',updateTime:d.updateTime,trashed:Boolean(d.trashed)};}
export async function listGoogleKeepNotes(pageSize=20,passedToken?:string):Promise<{notes:GoogleKeepNote[];nextPageToken?:string}>{const token=passedToken||await getGoogleFamilyAccessToken('keep.read');const res=await fetch(`https://keep.googleapis.com/v1/notes?pageSize=${Math.max(1,Math.min(pageSize,100))}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Keep notes'));const d=await res.json();return {notes:(d.notes||[]).map((n:any)=>({name:n.name,title:n.title||'',content:n.body?.text?.text||'',updateTime:n.updateTime,trashed:Boolean(n.trashed)})),nextPageToken:d.nextPageToken};}
export async function getGoogleKeepNote(noteName:string,passedToken?:string):Promise<GoogleKeepNote>{const token=passedToken||await getGoogleFamilyAccessToken('keep.read');const clean=noteName.startsWith('notes/')?noteName:`notes/${noteName}`;const res=await fetch(`https://keep.googleapis.com/v1/${clean}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to read Google Keep note'));const n=await res.json();return {name:n.name,title:n.title||'',content:n.body?.text?.text||'',updateTime:n.updateTime,trashed:Boolean(n.trashed)};}
export async function deleteGoogleKeepNote(noteName:string,passedToken?:string):Promise<void>{const token=passedToken||await getGoogleFamilyAccessToken('keep.write');const clean=noteName.startsWith('notes/')?noteName:`notes/${noteName}`;const res=await fetch(`https://keep.googleapis.com/v1/${clean}`,{method:'DELETE',headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to delete Google Keep note'));}
