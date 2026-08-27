import type {
  GoogleHubCapabilityDescriptor,
  GoogleHubCapabilityId,
  GoogleHubCapabilityRegistry,
  GoogleHubCategory,
} from '../contracts/googleHub';

const INITIAL_CAPABILITIES: readonly GoogleHubCapabilityDescriptor[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Search and work with email, drafts, and messages.',
    category: 'communication',
    iconKey: 'mail',
    requiredCapabilities: ['gmail.read'],
    externalUrl: 'https://mail.google.com/',
    panelKey: 'google.gmail',
    actions: [
      { id: 'search', label: 'Search mail', kind: 'search' },
      { id: 'open', label: 'Open Gmail', kind: 'open' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'View schedules and manage calendar events.',
    category: 'scheduling',
    iconKey: 'calendar',
    requiredCapabilities: ['calendar.read'],
    externalUrl: 'https://calendar.google.com/',
    panelKey: 'google.calendar',
    actions: [
      { id: 'upcoming', label: 'View upcoming', kind: 'open' },
      { id: 'create', label: 'Create event', kind: 'create' },
      { id: 'open', label: 'Open Calendar', kind: 'open' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'drive',
    name: 'Drive',
    description: 'Find, inspect, and organize files in Google Drive.',
    category: 'files',
    iconKey: 'folder',
    requiredCapabilities: ['drive.read'],
    externalUrl: 'https://drive.google.com/',
    panelKey: 'google.drive',
    actions: [
      { id: 'search', label: 'Search Drive', kind: 'search' },
      { id: 'open', label: 'Open Drive', kind: 'open' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'docs',
    name: 'Docs',
    description: 'Read, create, and work with Google Docs documents.',
    category: 'documents',
    iconKey: 'file-text',
    requiredCapabilities: ['docs'],
    externalUrl: 'https://docs.google.com/',
    panelKey: 'google.docs',
    actions: [
      { id: 'create', label: 'Create document', kind: 'create' },
      { id: 'open', label: 'Open Docs', kind: 'open' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'sheets',
    name: 'Sheets',
    description: 'Inspect and work with structured spreadsheet data.',
    category: 'data',
    iconKey: 'table',
    requiredCapabilities: ['sheets.read'],
    externalUrl: 'https://sheets.google.com/',
    panelKey: 'google.sheets',
    actions: [
      { id: 'open', label: 'Open Sheets', kind: 'open' },
      { id: 'create', label: 'Create spreadsheet', kind: 'create' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    description: 'View, create, and complete Google Tasks.',
    category: 'tasks',
    iconKey: 'check-square',
    requiredCapabilities: ['tasks'],
    externalUrl: 'https://tasks.google.com/',
    panelKey: 'google.tasks',
    actions: [
      { id: 'open', label: 'Open Tasks', kind: 'open' },
      { id: 'create', label: 'Create task', kind: 'create' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'keep',
    name: 'Keep',
    description: 'Work with notes and Elara’s reference archive.',
    category: 'notes',
    iconKey: 'bookmark',
    requiredCapabilities: ['keep.read'],
    externalUrl: 'https://keep.google.com/',
    panelKey: 'google.keep',
    actions: [
      { id: 'search', label: 'Search notes', kind: 'search' },
      { id: 'create', label: 'Create note', kind: 'create' },
      { id: 'open', label: 'Open Keep', kind: 'open' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'contacts',
    name: 'Contacts',
    description: 'Find people and contact information.',
    category: 'people',
    iconKey: 'users',
    requiredCapabilities: ['contacts.read'],
    externalUrl: 'https://contacts.google.com/',
    panelKey: 'google.contacts',
    actions: [
      { id: 'search', label: 'Search contacts', kind: 'search' },
      { id: 'open', label: 'Open Contacts', kind: 'open' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
  {
    id: 'chat',
    name: 'Google Chat',
    description: 'Read and send messages in Google Chat spaces.',
    category: 'collaboration',
    iconKey: 'message-square',
    requiredCapabilities: ['chat.read'],
    externalUrl: 'https://chat.google.com/',
    panelKey: 'google.chat',
    actions: [
      { id: 'open', label: 'Open Google Chat', kind: 'open' },
      { id: 'manage', label: 'Manage spaces', kind: 'manage' },
      { id: 'ask', label: 'Ask Elara', kind: 'ask' },
    ],
  },
];

class DefaultGoogleHubCapabilityRegistry implements GoogleHubCapabilityRegistry {
  private readonly capabilities = new Map<GoogleHubCapabilityId, GoogleHubCapabilityDescriptor>();

  constructor(initial: readonly GoogleHubCapabilityDescriptor[] = INITIAL_CAPABILITIES) {
    initial.forEach((descriptor) => this.register(descriptor));
  }

  register(descriptor: GoogleHubCapabilityDescriptor): void {
    if (this.capabilities.has(descriptor.id)) {
      throw new Error(`Google Hub capability already registered: ${descriptor.id}`);
    }
    this.capabilities.set(descriptor.id, descriptor);
  }

  unregister(id: GoogleHubCapabilityId): void {
    this.capabilities.delete(id);
  }

  get(id: GoogleHubCapabilityId): GoogleHubCapabilityDescriptor | undefined {
    return this.capabilities.get(id);
  }

  has(id: GoogleHubCapabilityId): boolean {
    return this.capabilities.has(id);
  }

  list(): readonly GoogleHubCapabilityDescriptor[] {
    return Array.from(this.capabilities.values());
  }

  listByCategory(category: GoogleHubCategory): readonly GoogleHubCapabilityDescriptor[] {
    return this.list().filter((descriptor) => descriptor.category === category);
  }
}

export const googleHubCapabilityRegistry: GoogleHubCapabilityRegistry =
  new DefaultGoogleHubCapabilityRegistry();

export function createGoogleHubCapabilityRegistry(
  initial: readonly GoogleHubCapabilityDescriptor[] = INITIAL_CAPABILITIES,
): GoogleHubCapabilityRegistry {
  return new DefaultGoogleHubCapabilityRegistry(initial);
}

export { INITIAL_CAPABILITIES };
