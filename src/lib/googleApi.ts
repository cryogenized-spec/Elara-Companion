// googleApi.ts - Comprehensive Google Workspace API client and Tool executor
// Integrates Gmail, Calendar, Tasks, Docs, Drive, Sheets, Keep, and People/Contacts

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

export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('elara_custom_google_client_id');
    if (custom && custom.trim().length > 0) return custom.trim();
  }
  const envVal = typeof import.meta !== 'undefined' && (import.meta as any)?.env
    ? (import.meta as any).env.VITE_GOOGLE_CLIENT_ID
    : (typeof process !== 'undefined' && process.env ? process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID : undefined);
  return envVal || DEFAULT_CLIENT_ID;
}
