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

export interface ContactPerson { resourceName:string; displayName:string; familyName?:string; givenName?:string; emailAddresses:string[]; phoneNumbers:string[]; organizations?:string[]; photoUrl?:string; }
export async function searchContacts(query:string,pageSize=10):Promise<{contacts:ContactPerson[]}>{const token=await getGoogleFamilyAccessToken('contacts.read');if(!query.trim())return listContacts(pageSize);const res=await fetch(`https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to search Google Contacts'));const d=await res.json();return {contacts:(d.results||[]).map((r:any)=>{const p=r.person||{},n=p.names?.[0]||{};return {resourceName:p.resourceName||'',displayName:n.displayName||n.unstructuredName||'Unknown Contact',givenName:n.givenName,familyName:n.familyName,emailAddresses:(p.emailAddresses||[]).map((e:any)=>e.value).filter(Boolean),phoneNumbers:(p.phoneNumbers||[]).map((x:any)=>x.value).filter(Boolean),organizations:(p.organizations||[]).map((o:any)=>o.name||o.title).filter(Boolean),photoUrl:p.photos?.[0]?.url};})};}
export async function listContacts(pageSize=20):Promise<{contacts:ContactPerson[]}>{const token=await getGoogleFamilyAccessToken('contacts.read');const res=await fetch(`https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos&pageSize=${pageSize}&sortOrder=FIRST_NAME_ASCENDING`,{headers:authHeaders(token)});if(!res.ok)throw new Error(await parseGoogleApiError(res,'Failed to list Google Contacts'));const d=await res.json();return {contacts:(d.connections||[]).map((p:any)=>{const n=p.names?.[0]||{};return {resourceName:p.resourceName||'',displayName:n.displayName||n.unstructuredName||'Unknown Contact',givenName:n.givenName,familyName:n.familyName,emailAddresses:(p.emailAddresses||[]).map((e:any)=>e.value).filter(Boolean),phoneNumbers:(p.phoneNumbers||[]).map((x:any)=>x.value).filter(Boolean),organizations:(p.organizations||[]).map((o:any)=>o.name||o.title).filter(Boolean),photoUrl:p.photos?.[0]?.url};})};}
