import type {
  GoogleHubCapabilityDescriptor,
  GoogleHubCapabilityId,
  GoogleHubCapabilityRegistry,
  GoogleHubCategory,
} from '../contracts/googleHub';

const INITIAL_CAPABILITIES: readonly GoogleHubCapabilityDescriptor[] = [
  {
    id: 'gmail', name: 'Gmail', description: 'Search and work with email, drafts, and messages.', category: 'communication', iconKey: 'mail',
    requiredCapabilities: ['gmail.read'], actionRequirements: { search: ['gmail.read'], open: [], ask: [], compose: ['gmail.compose'], send: ['gmail.send'] },
    permissionDescription: 'Read mail metadata/content; optional compose and send permissions are requested only for those actions.',
    dataAccessDescription: 'Gmail messages available to the connected account, limited by the granted Gmail scopes.', externalUrl: 'https://mail.google.com/', panelKey: 'google.gmail',
    actions: [
      { id: 'search', label: 'Search mail', kind: 'search' }, { id: 'compose', label: 'Create draft', kind: 'create' },
      { id: 'send', label: 'Send mail', kind: 'create', requiresConfirmation: true }, { id: 'open', label: 'Open Gmail', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'calendar', name: 'Calendar', description: 'View schedules and manage calendar events.', category: 'scheduling', iconKey: 'calendar', requiredCapabilities: ['calendar.read'],
    actionRequirements: { upcoming: ['calendar.read'], create: ['calendar.write'], availability: ['calendar.read'], open: [], ask: [] }, permissionDescription: 'Read calendar events; calendar write permission is required only to create or modify events.',
    dataAccessDescription: 'Calendar events and scheduling metadata exposed by the granted Calendar scopes.', externalUrl: 'https://calendar.google.com/', panelKey: 'google.calendar',
    actions: [
      { id: 'upcoming', label: 'Upcoming', kind: 'open' }, { id: 'availability', label: 'Find availability', kind: 'search' },
      { id: 'create', label: 'Create event', kind: 'create', requiresConfirmation: true }, { id: 'open', label: 'Open Calendar', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'drive', name: 'Drive', description: 'Find, inspect, and organize files in Google Drive.', category: 'files', iconKey: 'folder', requiredCapabilities: ['drive.read'],
    actionRequirements: { search: ['drive.read'], open: [], 'work-with': ['drive.read'], upload: ['drive.file'], ask: [] }, permissionDescription: 'Read Drive files; Drive file-write permission is only required for uploads/created files.',
    dataAccessDescription: 'File metadata and readable file content within the connected Google Drive account.', externalUrl: 'https://drive.google.com/', panelKey: 'google.drive',
    actions: [
      { id: 'search', label: 'Search Drive', kind: 'search' }, { id: 'work-with', label: 'Work with file', kind: 'open' }, { id: 'upload', label: 'Upload', kind: 'create' }, { id: 'open', label: 'Open Drive', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'docs', name: 'Docs', description: 'Read, create, and work with Google Docs documents.', category: 'documents', iconKey: 'file-text', requiredCapabilities: ['docs'],
    actionRequirements: { create: ['docs'], 'work-with': ['docs'], open: [], ask: [] }, permissionDescription: 'Read and edit Google Docs through the Docs capability requested by Elara.',
    dataAccessDescription: 'Google Docs content that Elara explicitly opens or modifies.', externalUrl: 'https://docs.google.com/', panelKey: 'google.docs',
    actions: [
      { id: 'create', label: 'Create document', kind: 'create', requiresConfirmation: true }, { id: 'work-with', label: 'Work with document', kind: 'open' }, { id: 'open', label: 'Open Docs', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'sheets', name: 'Sheets', description: 'Inspect and work with structured spreadsheet data.', category: 'data', iconKey: 'table', requiredCapabilities: ['sheets.read'],
    actionRequirements: { open: [], inspect: ['sheets.read'], create: ['sheets.write'], write: ['sheets.write'], ask: [] }, permissionDescription: 'Read spreadsheet values by default; write permission is separate for creating or changing cells.',
    dataAccessDescription: 'Spreadsheet metadata and values in ranges Elara explicitly reads or writes.', externalUrl: 'https://sheets.google.com/', panelKey: 'google.sheets',
    actions: [
      { id: 'inspect', label: 'Inspect data', kind: 'search' }, { id: 'write', label: 'Save changes', kind: 'create', requiresConfirmation: true }, { id: 'create', label: 'Create spreadsheet', kind: 'create', requiresConfirmation: true }, { id: 'open', label: 'Open Sheets', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'tasks', name: 'Tasks', description: 'View, create, and complete Google Tasks.', category: 'tasks', iconKey: 'check-square', requiredCapabilities: ['tasks'],
    actionRequirements: { open: [], list: ['tasks'], create: ['tasks'], complete: ['tasks'], ask: [] }, permissionDescription: 'Access Google Tasks lists and task state so Elara can inspect or update tasks.',
    dataAccessDescription: 'Task titles, notes, due dates, completion state and list metadata returned by Google Tasks.', externalUrl: 'https://tasks.google.com/', panelKey: 'google.tasks',
    actions: [
      { id: 'list', label: 'View tasks', kind: 'open' }, { id: 'create', label: 'Create task', kind: 'create', requiresConfirmation: true }, { id: 'complete', label: 'Complete task', kind: 'manage', requiresConfirmation: true }, { id: 'open', label: 'Open Tasks', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'keep', name: 'Keep', description: 'Work with notes in Google Keep.', category: 'notes', iconKey: 'bookmark', requiredCapabilities: ['keep.read'],
    actionRequirements: { search: ['keep.read'], create: ['keep.write'], delete: ['keep.write'], open: [], 'pin-to-elara': ['keep.read'], ask: [] }, permissionDescription: 'Read Keep notes by default; write permission is needed to create/delete notes.',
    dataAccessDescription: 'Google Keep notes Elara explicitly reads or changes.', externalUrl: 'https://keep.google.com/', panelKey: 'google.keep',
    actions: [
      { id: 'search', label: 'Search notes', kind: 'search' }, { id: 'create', label: 'Create note', kind: 'create', requiresConfirmation: true }, { id: 'delete', label: 'Delete note', kind: 'manage', requiresConfirmation: true, destructive: true }, { id: 'pin-to-elara', label: 'Pin to Elara', kind: 'manage' }, { id: 'open', label: 'Open Keep', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'contacts', name: 'Contacts', description: 'Find people and contact information.', category: 'people', iconKey: 'users', requiredCapabilities: ['contacts.read'],
    actionRequirements: { search: ['contacts.read'], open: [], ask: [] }, permissionDescription: 'Read Google Contacts so Elara can find people when needed.', dataAccessDescription: 'Names and available email/phone contact information returned by Google People API.', externalUrl: 'https://contacts.google.com/', panelKey: 'google.contacts',
    actions: [
      { id: 'search', label: 'Search contacts', kind: 'search' }, { id: 'open', label: 'Open Contacts', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'chat', name: 'Google Chat', description: 'Read and send messages in Google Chat spaces.', category: 'collaboration', iconKey: 'message-square', requiredCapabilities: ['chat.read'],
    actionRequirements: { open: [], read: ['chat.read'], manage: ['chat.manage'], send: ['chat.send'], ask: [] }, permissionDescription: 'Read Chat spaces/messages by default; sending and space management are separate permissions.', dataAccessDescription: 'Chat spaces, messages and related collaboration metadata available through granted Chat scopes.', externalUrl: 'https://chat.google.com/', panelKey: 'google.chat',
    actions: [
      { id: 'read', label: 'Read messages', kind: 'open' }, { id: 'send', label: 'Send message', kind: 'create', requiresConfirmation: true }, { id: 'manage', label: 'Manage spaces', kind: 'manage', requiresConfirmation: true }, { id: 'open', label: 'Open Google Chat', kind: 'open' }, { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
];

const CATEGORIES = new Set<GoogleHubCategory>(['communication', 'scheduling', 'files', 'documents', 'data', 'tasks', 'notes', 'people', 'collaboration']);

function validateDescriptor(descriptor: GoogleHubCapabilityDescriptor): void {
  if (!descriptor.id.trim()) throw new Error('Google Hub capability id must not be empty');
  if (!descriptor.name.trim()) throw new Error(`Google Hub capability name must not be empty: ${descriptor.id}`);
  if (!CATEGORIES.has(descriptor.category)) throw new Error(`Unknown Google Hub capability category: ${descriptor.category}`);
  if (!descriptor.panelKey.trim()) throw new Error(`Google Hub capability panelKey must not be empty: ${descriptor.id}`);
  const actionIds = new Set<string>();
  descriptor.actions.forEach((action) => {
    if (!action.id.trim()) throw new Error(`Google Hub action id must not be empty: ${descriptor.id}`);
    if (actionIds.has(action.id)) throw new Error(`Duplicate Google Hub action: ${descriptor.id}.${action.id}`);
    actionIds.add(action.id);
  });
  Object.keys(descriptor.actionRequirements ?? {}).forEach((actionId) => {
    if (!actionIds.has(actionId)) throw new Error(`Google Hub action requirement has no declared action: ${descriptor.id}.${actionId}`);
  });
}

class DefaultGoogleHubCapabilityRegistry implements GoogleHubCapabilityRegistry {
  private readonly capabilities = new Map<GoogleHubCapabilityId, GoogleHubCapabilityDescriptor>();
  constructor(initial: readonly GoogleHubCapabilityDescriptor[] = INITIAL_CAPABILITIES) { initial.forEach((descriptor) => this.register(descriptor)); }
  register(descriptor: GoogleHubCapabilityDescriptor): void { validateDescriptor(descriptor); if (this.capabilities.has(descriptor.id)) throw new Error(`Google Hub capability already registered: ${descriptor.id}`); this.capabilities.set(descriptor.id, descriptor); }
  unregister(id: GoogleHubCapabilityId): void { this.capabilities.delete(id); }
  get(id: GoogleHubCapabilityId): GoogleHubCapabilityDescriptor | undefined { return this.capabilities.get(id); }
  has(id: GoogleHubCapabilityId): boolean { return this.capabilities.has(id); }
  list(): readonly GoogleHubCapabilityDescriptor[] { return Array.from(this.capabilities.values()); }
  listByCategory(category: GoogleHubCategory): readonly GoogleHubCapabilityDescriptor[] { return this.list().filter((descriptor) => descriptor.category === category); }
}

export const googleHubCapabilityRegistry: GoogleHubCapabilityRegistry = new DefaultGoogleHubCapabilityRegistry();
export function createGoogleHubCapabilityRegistry(initial: readonly GoogleHubCapabilityDescriptor[] = INITIAL_CAPABILITIES): GoogleHubCapabilityRegistry { return new DefaultGoogleHubCapabilityRegistry(initial); }
export { INITIAL_CAPABILITIES };
