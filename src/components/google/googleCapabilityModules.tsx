import React from 'react';
import type { GoogleCapability } from '../../contracts';
import type { GoogleHubCapabilityDescriptor, GoogleHubCapabilityId } from '../../contracts/googleHub';
import type { GoogleHubSelectedResource } from '../../services/googleHubContextService';
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
  askElara: (prompt: string, selectedResource?: GoogleHubSelectedResource) => void;
  recordActivity: (capabilityId: string, action: 'read' | 'create' | 'update' | 'delete' | 'send' | 'open', description: string, reversible?: boolean) => void;
}
export interface GoogleCapabilityModule { descriptor: GoogleHubCapabilityDescriptor; renderPanel: (context: GoogleHubPanelContext) => React.ReactNode; }
export type GoogleCapabilityModuleFactory = (context: GoogleHubPanelContext) => React.ReactNode;
export interface GoogleCapabilityModuleRegistry { register(id: GoogleHubCapabilityId, factory: GoogleCapabilityModuleFactory): void; unregister(id: GoogleHubCapabilityId): void; has(id: GoogleHubCapabilityId): boolean; render(descriptor: GoogleHubCapabilityDescriptor, context: GoogleHubPanelContext): React.ReactNode; }

class DefaultGoogleCapabilityModuleRegistry implements GoogleCapabilityModuleRegistry {
  private readonly factories = new Map<GoogleHubCapabilityId, GoogleCapabilityModuleFactory>();
  register(id: GoogleHubCapabilityId, factory: GoogleCapabilityModuleFactory): void { if (!id.trim()) throw new Error('Google capability module id must not be empty'); if (this.factories.has(id)) throw new Error(`Google capability module already registered: ${id}`); this.factories.set(id, factory); }
  unregister(id: GoogleHubCapabilityId): void { this.factories.delete(id); }
  has(id: GoogleHubCapabilityId): boolean { return this.factories.has(id); }
  render(descriptor: GoogleHubCapabilityDescriptor, context: GoogleHubPanelContext): React.ReactNode { const factory = this.factories.get(descriptor.id); if (!factory) throw new Error(`No Google capability module registered for ${descriptor.id}`); return factory(context); }
}

export function createGoogleCapabilityModuleRegistry(): GoogleCapabilityModuleRegistry { return new DefaultGoogleCapabilityModuleRegistry(); }
export const googleCapabilityModuleRegistry = createGoogleCapabilityModuleRegistry();

googleCapabilityModuleRegistry.register('gmail', c => <GmailCapabilityPanel canRead={c.isGranted('gmail.read')} canCompose={c.isGranted('gmail.compose')} canSend={c.isGranted('gmail.send')} onActivity={d=>c.recordActivity('gmail','read',d)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('calendar', c => <CalendarCapabilityPanel canRead={c.isGranted('calendar.read')} canWrite={c.isGranted('calendar.write')} onActivity={(d,r)=>c.recordActivity('calendar','create',d,r)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('tasks', c => <TasksCapabilityPanel canUse={c.isGranted('tasks')} onActivity={(d,r)=>c.recordActivity('tasks','create',d,r)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('drive', c => <DriveCapabilityPanel canRead={c.isGranted('drive.read')} canUpload={c.isGranted('drive.file')} onActivity={(d,r)=>c.recordActivity('drive','create',d,r)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('docs', c => <DocsCapabilityPanel canUse={c.isGranted('docs')} onActivity={(d,r)=>c.recordActivity('docs','update',d,r)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('sheets', c => <SheetsCapabilityPanel canRead={c.isGranted('sheets.read')} canWrite={c.isGranted('sheets.write')} onActivity={(d,r)=>c.recordActivity('sheets','update',d,r)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('keep', c => <KeepCapabilityPanel canRead={c.isGranted('keep.read')} canWrite={c.isGranted('keep.write')} onActivity={(d,r)=>c.recordActivity('keep','create',d,r)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('contacts', c => <ContactsCapabilityPanel canRead={c.isGranted('contacts.read')} onActivity={d=>c.recordActivity('contacts','read',d)} onAskElara={c.askElara}/>);
googleCapabilityModuleRegistry.register('chat', c => <ChatCapabilityPanel canRead={c.isGranted('chat.read')} canSend={c.isGranted('chat.send')} canManage={c.isGranted('chat.manage')} onActivity={d=>c.recordActivity('chat','read',d)} onAskElara={c.askElara}/>);

export function createGoogleCapabilityModule(descriptor: GoogleHubCapabilityDescriptor): GoogleCapabilityModule { return { descriptor, renderPanel: context => googleCapabilityModuleRegistry.render(descriptor, context) }; }
export function createGoogleCapabilityModules(descriptors: readonly GoogleHubCapabilityDescriptor[]): readonly GoogleCapabilityModule[] { return descriptors.map(createGoogleCapabilityModule); }
