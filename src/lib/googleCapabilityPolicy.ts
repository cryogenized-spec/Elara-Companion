export type GoogleCapability =
  | 'gmail.read' | 'gmail.compose' | 'gmail.send' | 'gmail.modify'
  | 'calendar.read' | 'calendar.write' | 'calendar.list' | 'calendar.freebusy'
  | 'tasks' | 'docs' | 'drive.read' | 'drive.file'
  | 'sheets.read' | 'sheets.write' | 'contacts.read' | 'chat.read' | 'chat.send' | 'chat.manage';

const CAPABILITY_SCOPES: Record<GoogleCapability, readonly string[]> = {
  'gmail.read': ['https://www.googleapis.com/auth/gmail.readonly'], 'gmail.compose': ['https://www.googleapis.com/auth/gmail.compose'], 'gmail.send': ['https://www.googleapis.com/auth/gmail.send'], 'gmail.modify': ['https://www.googleapis.com/auth/gmail.modify'],
  'calendar.read': ['https://www.googleapis.com/auth/calendar.readonly'], 'calendar.write': ['https://www.googleapis.com/auth/calendar.events'],
  'calendar.list': ['https://www.googleapis.com/auth/calendar.calendarlist.readonly'], 'calendar.freebusy': ['https://www.googleapis.com/auth/calendar.freebusy'],
  tasks: ['https://www.googleapis.com/auth/tasks'], docs: ['https://www.googleapis.com/auth/documents'], 'drive.read': ['https://www.googleapis.com/auth/drive.readonly'], 'drive.file': ['https://www.googleapis.com/auth/drive.file'],
  'sheets.read': ['https://www.googleapis.com/auth/spreadsheets.readonly'], 'sheets.write': ['https://www.googleapis.com/auth/spreadsheets'], 'contacts.read': ['https://www.googleapis.com/auth/contacts.readonly'],
  'chat.read': ['https://www.googleapis.com/auth/chat.spaces.readonly', 'https://www.googleapis.com/auth/chat.messages.readonly', 'https://www.googleapis.com/auth/chat.memberships.readonly'], 'chat.send': ['https://www.googleapis.com/auth/chat.messages.create'], 'chat.manage': ['https://www.googleapis.com/auth/chat.spaces', 'https://www.googleapis.com/auth/chat.spaces.create', 'https://www.googleapis.com/auth/chat.messages', 'https://www.googleapis.com/auth/chat.memberships'],
};

export function getGoogleCapabilityScopes(capability: GoogleCapability): string[] { return [...(CAPABILITY_SCOPES[capability] || [])]; }
export function isGoogleCapabilityGranted(grantedScopes: string, capability: GoogleCapability): boolean {
  const granted = new Set(grantedScopes.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean));
  return getGoogleCapabilityScopes(capability).every((scope) => granted.has(scope));
}
