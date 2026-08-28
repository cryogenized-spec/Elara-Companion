import React from 'react';
import type { GoogleCapability } from '../../contracts';
import type { GoogleHubCapabilityDescriptor } from '../../contracts/googleHub';
import { GmailCapabilityPanel } from './GmailCapabilityPanel';
import { CalendarCapabilityPanel } from './CalendarCapabilityPanel';
import { TasksCapabilityPanel } from './TasksCapabilityPanel';
import { DriveCapabilityPanel } from './DriveCapabilityPanel';
import { DocsCapabilityPanel } from './DocsCapabilityPanel';
import { SheetsCapabilityPanel } from './SheetsCapabilityPanel';
import { KeepCapabilityPanel } from './KeepCapabilityPanel';
import { ContactsCapabilityPanel } from './ContactsCapabilityPanel';
import { ChatCapabilityPanel } from './ChatCapabilityPanel';
import { googleCapabilities, googleIdentity } from '../../services/googleWorkspaceService';
import { googleActivityRecorder } from '../../services/googleActivityService';

export interface GoogleHubPanelContext {
  descriptor: GoogleHubCapabilityDescriptor;
  isGranted: (capability: GoogleCapability) => boolean;
  recordActivity: (capabilityId: string, action: 'read' | 'create' | 'update' | 'delete' | 'send' | 'open', description: string, reversible?: boolean) => void;
}

export interface GoogleCapabilityModule {
  descriptor: GoogleHubCapabilityDescriptor;
  renderPanel: (context: GoogleHubPanelContext) => React.ReactNode;
}

const capabilities = {
  gmail: (context: GoogleHubPanelContext) => (
    <GmailCapabilityPanel
      canRead={context.isGranted('gmail.read')}
      canCompose={context.isGranted('gmail.compose')}
      canSend={context.isGranted('gmail.send')}
      onActivity={(description) => context.recordActivity('gmail', 'read', description)}
    />
  ),
  calendar: (context: GoogleHubPanelContext) => (
    <CalendarCapabilityPanel
      canRead={context.isGranted('calendar.read')}
      onActivity={(description) => context.recordActivity('calendar', 'read', description)}
    />
  ),
  tasks: (context: GoogleHubPanelContext) => (
    <TasksCapabilityPanel
      canUse={context.isGranted('tasks')}
      onActivity={(description, reversible) => context.recordActivity('tasks', 'create', description, reversible)}
    />
  ),
  drive: (context: GoogleHubPanelContext) => (
    <DriveCapabilityPanel
      canRead={context.isGranted('drive.read')}
      onActivity={(description) => context.recordActivity('drive', 'read', description)}
    />
  ),
  docs: (context: GoogleHubPanelContext) => (
    <DocsCapabilityPanel
      canUse={context.isGranted('docs')}
      onActivity={(description, reversible) => context.recordActivity('docs', 'create', description, reversible)}
    />
  ),
  sheets: (context: GoogleHubPanelContext) => (
    <SheetsCapabilityPanel
      canRead={context.isGranted('sheets.read')}
      canWrite={context.isGranted('sheets.write')}
      onActivity={(description, reversible) => context.recordActivity('sheets', 'update', description, reversible)}
    />
  ),
  keep: (context: GoogleHubPanelContext) => (
    <KeepCapabilityPanel
      canRead={context.isGranted('keep.read')}
      canWrite={context.isGranted('keep.write')}
      onActivity={(description, reversible) => context.recordActivity('keep', 'create', description, reversible)}
    />
  ),
  contacts: (context: GoogleHubPanelContext) => (
    <ContactsCapabilityPanel
      canRead={context.isGranted('contacts.read')}
      onActivity={(description) => context.recordActivity('contacts', 'read', description)}
    />
  ),
  chat: (context: GoogleHubPanelContext) => (
    <ChatCapabilityPanel
      canRead={context.isGranted('chat.read')}
      canSend={context.isGranted('chat.send')}
      onActivity={(description) => context.recordActivity('chat', 'read', description)}
    />
  ),
} as const;

export const googleCapabilityPanelFactories = capabilities;

export function createGoogleCapabilityModule(
  descriptor: GoogleHubCapabilityDescriptor,
): GoogleCapabilityModule {
  const factory = capabilities[descriptor.id];
  return {
    descriptor,
    renderPanel: (context) => factory(context),
  };
}

export function createGoogleCapabilityModules(
  descriptors: readonly GoogleHubCapabilityDescriptor[],
): readonly GoogleCapabilityModule[] {
  return descriptors.map(createGoogleCapabilityModule);
}
