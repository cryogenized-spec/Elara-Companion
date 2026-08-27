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

// Local reference archive remains supported as a user-facing feature, but no longer lives under a legacy Google implementation.
export {
  createReferenceNote as createKeepNote,
  searchReferenceNotes as searchKeepNotes,
  listReferenceNotes as listKeepNotes,
  getReferenceNote as getKeepNote,
  updateReferenceNote as updateKeepNote,
  deleteReferenceNote as deleteKeepNote,
} from './referenceArchiveService';
export type { ReferenceNoteItem as KeepNoteItem } from './referenceArchiveService';

export const requestGoogleAuth = (forcePrompt = false) => googleIdentity.requestBaseAuthorization(forcePrompt);
export const isGoogleConnected = () => googleIdentity.isAuthorized();
