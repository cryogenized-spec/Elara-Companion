import { googleIdentity } from './googleWorkspaceService';
export { getTasks } from './googleTasksService';
export type { TaskItem } from './googleTasksService';
export { createGoogleDoc, editGoogleDoc, getGoogleDoc, searchGoogleDriveDocs } from './googleDocsDriveService';
export type { GoogleDocSummary } from './googleDocsDriveService';
export { searchContacts } from './googleContactsService';
export type { ContactPerson } from './googleContactsService';
export { createGoogleSheet } from './googleSheetsService';
export { listGmailMessages, sendGmailMessage, createGmailDraft } from './googleGmailService';
export type { GmailMessageSummary } from './googleGmailService';
export { listChatSpaces, createChatSpace, listChatMessages, sendChatMessage, sendChatCardMessage, postChatWebhook, buildTaskApprovalCard, buildDraftPreviewCard, buildScheduleSweepCard, buildSystemAlertCard, loadSpaceWebhooks, saveSpaceWebhooks } from './googleChatService';
export type { ChatSpace, ChatMessageResult, SpaceWebhookConfig } from './googleChatService';
export { createKeepNote, searchKeepNotes, listKeepNotes, getKeepNote, updateKeepNote, deleteKeepNote } from '../legacy/googleKeepArchive';
export type { KeepNoteItem } from '../legacy/googleKeepArchive';

export const requestGoogleAuth = (forcePrompt = false) => googleIdentity.requestBaseAuthorization(forcePrompt);
export const isGoogleConnected = () => googleIdentity.isAuthorized();
