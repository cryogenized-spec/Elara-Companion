// Google Workspace compatibility façade. Canonical implementations live in src/services and authorization is owned by the Google capability layer.

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
