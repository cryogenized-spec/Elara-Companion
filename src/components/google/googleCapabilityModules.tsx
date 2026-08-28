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

export interface GoogleHubPanelContext {
  descriptor: GoogleHubCapabilityDescriptor;
  isGranted: (capability: GoogleCapability) => boolean;
  askElara: (prompt: string) => void;
  recordActivity: (capabilityId: string, action: 'read' | 'create' | 'update' | 'delete' | 'send' | 'open', description: string, reversible?: boolean) => void;
}
export interface GoogleCapabilityModule { descriptor: GoogleHubCapabilityDescriptor; renderPanel: (context: GoogleHubPanelContext) => React.ReactNode; }

const panelFactories: Record<GoogleHubCapabilityDescriptor['id'], (context: GoogleHubPanelContext) => React.ReactNode> = {
  gmail: c => <GmailCapabilityPanel canRead={c.isGranted('gmail.read')} canCompose={c.isGranted('gmail.compose')} canSend={c.isGranted('gmail.send')} onActivity={d=>c.recordActivity('gmail','read',d)} onAskElara={c.askElara}/>,
  calendar: c => <CalendarCapabilityPanel canRead={c.isGranted('calendar.read')} canWrite={c.isGranted('calendar.write')} onActivity={(d,r)=>c.recordActivity('calendar','create',d,r)} onAskElara={c.askElara}/>,
  tasks: c => <TasksCapabilityPanel canUse={c.isGranted('tasks')} onActivity={(d,r)=>c.recordActivity('tasks','create',d,r)} onAskElara={c.askElara}/>,
  drive: c => <DriveCapabilityPanel canRead={c.isGranted('drive.read')} canUpload={c.isGranted('drive.file')} onActivity={(d,r)=>c.recordActivity('drive','create',d,r)} onAskElara={c.askElara}/>,
  docs: c => <DocsCapabilityPanel canUse={c.isGranted('docs')} onActivity={(d,r)=>c.recordActivity('docs','update',d,r)} onAskElara={c.askElara}/>,
  sheets: c => <SheetsCapabilityPanel canRead={c.isGranted('sheets.read')} canWrite={c.isGranted('sheets.write')} onActivity={(d,r)=>c.recordActivity('sheets','update',d,r)}/>,
  keep: c => <KeepCapabilityPanel canRead={c.isGranted('keep.read')} canWrite={c.isGranted('keep.write')} onActivity={(d,r)=>c.recordActivity('keep','create',d,r)} onAskElara={c.askElara}/>,
  contacts: c => <ContactsCapabilityPanel canRead={c.isGranted('contacts.read')} onActivity={d=>c.recordActivity('contacts','read',d)}/>,
  chat: c => <ChatCapabilityPanel canRead={c.isGranted('chat.read')} canSend={c.isGranted('chat.send')} canManage={c.isGranted('chat.manage')} onActivity={d=>c.recordActivity('chat','read',d)} onAskElara={c.askElara}/>,
};

export function createGoogleCapabilityModule(descriptor: GoogleHubCapabilityDescriptor): GoogleCapabilityModule {
  const factory = panelFactories[descriptor.id];
  if (!factory) throw new Error(`No Google capability module registered for ${descriptor.id}`);
  return { descriptor, renderPanel: context => factory(context) };
}
export function createGoogleCapabilityModules(descriptors: readonly GoogleHubCapabilityDescriptor[]): readonly GoogleCapabilityModule[] { return descriptors.map(createGoogleCapabilityModule); }
