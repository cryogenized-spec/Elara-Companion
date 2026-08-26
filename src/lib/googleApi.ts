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

import { listGmailMessages, getGmailMessageDetails, createGmailDraft, sendGmailMessage } from '../services/googleGmailService';
export { listGmailMessages, getGmailMessageDetails, createGmailDraft, sendGmailMessage } from '../services/googleGmailService';
export type { GmailMessageSummary, GmailMessageFull } from '../services/googleGmailService';

import { createGoogleDoc, getGoogleDoc, editGoogleDoc, searchGoogleDriveDocs, listGoogleDriveFiles, searchGoogleDriveFiles, readGoogleDriveFile } from '../services/googleDocsDriveService';
export { createGoogleDoc, getGoogleDoc, editGoogleDoc, searchGoogleDriveDocs, listGoogleDriveFiles, searchGoogleDriveFiles, readGoogleDriveFile } from '../services/googleDocsDriveService';
export type { GoogleDocSummary, GoogleDriveFileSummary } from '../services/googleDocsDriveService';

import { getTaskLists, getTasks, createTask } from '../services/googleTasksService';
import { createGoogleSheet, getSpreadsheetDetails, readSheetValues, appendSheetRow } from '../services/googleSheetsService';
import { searchContacts, listContacts } from '../services/googleContactsService';
import { createGoogleKeepNote, listGoogleKeepNotes, getGoogleKeepNote, deleteGoogleKeepNote } from '../services/googleKeepService';

export { getTaskLists, getTasks, createTask } from '../services/googleTasksService';
export type { TaskItem } from '../services/googleTasksService';

export { createGoogleSheet, getSpreadsheetDetails, readSheetValues, appendSheetRow } from '../services/googleSheetsService';
export type { SheetMetadata } from '../services/googleSheetsService';

export { searchContacts, listContacts } from '../services/googleContactsService';
export type { ContactPerson } from '../services/googleContactsService';

export { createGoogleKeepNote, listGoogleKeepNotes, getGoogleKeepNote, deleteGoogleKeepNote } from '../services/googleKeepService';
export type { GoogleKeepNote } from '../services/googleKeepService';

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

import { listChatSpaces, createChatSpace, listChatMessages, sendChatMessage, sendChatCardMessage, postChatWebhook, loadSpaceWebhooks, saveSpaceWebhooks, buildTaskApprovalCard, buildDraftPreviewCard, buildScheduleSweepCard, buildSystemAlertCard } from '../services/googleChatService';
export { listChatSpaces, createChatSpace, listChatMessages, sendChatMessage, sendChatCardMessage, postChatWebhook, loadSpaceWebhooks, saveSpaceWebhooks, buildTaskApprovalCard, buildDraftPreviewCard, buildScheduleSweepCard, buildSystemAlertCard } from '../services/googleChatService';
export type { ChatSpaceMember, ChatSpace, ChatMessageResult, SpaceWebhookConfig } from '../services/googleChatService';

// Legacy compatibility exports. The new V3 agent path uses workspaceTools.ts + googleAgentTools.ts.
export async function executeWorkspaceTool(toolName:string,args:any={}):Promise<any>{
  switch(toolName){
    case 'get_recent_emails': return listGmailMessages(args?.query||'',args?.maxResults||10);
    case 'get_tasks': return getTasks(args?.taskListId);
    case 'create_google_doc': return createGoogleDoc(args?.title||'Document',args?.content||'');
    case 'create_google_sheet': return createGoogleSheet(args?.title||'Data Log',args?.headerRow);
    case 'read_sheet_values': return readSheetValues(args?.spreadsheetId,args?.range||'A1:Z50');
    case 'append_sheet_row': return appendSheetRow(args?.spreadsheetId,args?.range||'A1',Array.isArray(args?.rowValues?.[0])?args.rowValues:[args.rowValues]);
    default: return {status:'error',message:`Unknown legacy Google tool: ${toolName}`};
  }
}
export const WORKSPACE_FUNCTION_DECLARATIONS:any[] = [];
