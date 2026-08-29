// Google Workspace compatibility facade.
// Canonical implementations live in src/services; Google authorization is owned by googleWorkspaceService.
import { googleCapabilities, googleIdentity, getGoogleAgentAccessToken } from '../services/googleWorkspaceService';

export const getGoogleClientId = googleIdentity.getClientId;
export const setCustomGoogleClientId = googleIdentity.setCustomClientId;
export const getAccessToken = getGoogleAgentAccessToken;
export const isGoogleConnected = googleIdentity.isAuthorized;
export const initGoogleAuth = googleIdentity.init;
export const requestGoogleAuth = (forcePrompt = false) => googleIdentity.requestBaseAuthorization(forcePrompt);
export const getGrantedGoogleScopes = googleCapabilities.getGrantedScopes;

export { listGmailMessages, getGmailMessageDetails, createGmailDraft, sendGmailMessage } from '../services/googleGmailService';
export type { GmailMessageSummary, GmailMessageFull } from '../services/googleGmailService';
export { createGoogleDoc, getGoogleDoc, editGoogleDoc, searchGoogleDriveDocs, listGoogleDriveFiles, searchGoogleDriveFiles, readGoogleDriveFile } from '../services/googleDocsDriveService';
export type { GoogleDocSummary, GoogleDriveFileSummary } from '../services/googleDocsDriveService';
export { getTaskLists, getTasks, createTask } from '../services/googleTasksService';
export type { TaskItem } from '../services/googleTasksService';
export { createGoogleSheet, getSpreadsheetDetails, readSheetValues, appendSheetRow } from '../services/googleSheetsService';
export type { SheetMetadata } from '../services/googleSheetsService';
export { searchContacts, listContacts } from '../services/googleContactsService';
export type { ContactPerson } from '../services/googleContactsService';
export { listChatSpaces, createChatSpace, listChatMessages, sendChatMessage, sendChatCardMessage, postChatWebhook, loadSpaceWebhooks, saveSpaceWebhooks, buildTaskApprovalCard, buildDraftPreviewCard, buildScheduleSweepCard, buildSystemAlertCard } from '../services/googleChatService';
export type { ChatSpaceMember, ChatSpace, ChatMessageResult, SpaceWebhookConfig } from '../services/googleChatService';

export async function executeWorkspaceTool(toolName:string,args:any={}):Promise<any>{
  switch(toolName){
    case 'get_recent_emails': return (await import('../services/googleGmailService')).listGmailMessages(args?.query||'',args?.maxResults||10);
    case 'get_tasks': return (await import('../services/googleTasksService')).getTasks(args?.taskListId);
    case 'create_google_doc': return (await import('../services/googleDocsDriveService')).createGoogleDoc(args?.title||'Document',args?.content||'');
    case 'create_google_sheet': return (await import('../services/googleSheetsService')).createGoogleSheet(args?.title||'Data Log',args?.headerRow);
    case 'read_sheet_values': return (await import('../services/googleSheetsService')).readSheetValues(args?.spreadsheetId,args?.range||'A1:Z50');
    case 'append_sheet_row': return (await import('../services/googleSheetsService')).appendSheetRow(args?.spreadsheetId,args?.range||'A1',Array.isArray(args?.rowValues?.[0])?args.rowValues:[args.rowValues]);
    default: return {status:'error',message:`Unknown Google tool: ${toolName}`};
  }
}
export const WORKSPACE_FUNCTION_DECLARATIONS:any[] = [];
