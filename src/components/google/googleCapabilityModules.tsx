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
import { ContactsCapabilityPanel } from './ContactsCapabilityPanel';
import { ChatCapabilityPanel } from './ChatCapabilityPanel';

export interface GoogleHubPanelContext { descriptor: GoogleHubCapabilityDescriptor; isGranted: (capability: GoogleCapability) => boolean; askElara: (prompt: string, selectedResource?: GoogleHubSelectedResource) => void; recordActivity: (capabilityId: string, actionOrDescription: 'read' | 'create' | 'update' | 'delete' | 'send' | 'open' | string, descriptionOrReversible?: string | boolean, reversible?: boolean, resource?: { type: string; id: string; url?: string }) => void; }
export interface GoogleCapabilityModule { descriptor: GoogleHubCapabilityDescriptor; renderPanel: (context: GoogleHubPanelContext) => React.ReactNode; }
export type GoogleCapabilityModuleFactory = (context: GoogleHubPanelContext) => React.ReactNode;
export interface GoogleCapabilityModuleRegistry { register(id: GoogleHubCapabilityId, factory: GoogleCapabilityModuleFactory): void; unregister(id: GoogleHubCapabilityId): void; has(id: GoogleHubCapabilityId): boolean; render(descriptor: GoogleHubCapabilityDescriptor, context: GoogleHubPanelContext): React.ReactNode; }
class DefaultGoogleCapabilityModuleRegistry implements GoogleCapabilityModuleRegistry {
  private readonly factories = new Map<GoogleHubCapabilityId, GoogleCapabilityModuleFactory>();
  register(id: string, factory: GoogleCapabilityModuleFactory): void { if (!id.trim()) throw new Error('Google capability module id must not be empty'); if (this.factories.has(id)) throw new Error(`Google capability module already registered: ${id}`); this.factories.set(id, factory); }
  unregister(id: string): void { this.factories.delete(id); }
  has(id: string): boolean { return this.factories.has(id); }
  render(descriptor: GoogleHubCapabilityDescriptor, context: GoogleHubPanelContext): React.ReactNode { const factory = this.factories.get(descriptor.id); if (!factory) throw new Error(`No Google capability module registered for ${descriptor.id}`); return factory(context); }
}
export function createGoogleCapabilityModuleRegistry(): GoogleCapabilityModuleRegistry { return new DefaultGoogleCapabilityModuleRegistry(); }
export const googleCapabilityModuleRegistry = createGoogleCapabilityModuleRegistry();
const askFor = (context: GoogleHubPanelContext) => (prompt: string) => context.askElara(prompt, { capabilityId: context.descriptor.id, resourceType: 'capability', resourceId: context.descriptor.id, name: context.descriptor.name });
googleCapabilityModuleRegistry.register('gmail', c => <GmailCapabilityPanel canRead={c.isGranted('gmail.read')} canCompose={c.isGranted('gmail.compose')} canSend={c.isGranted('gmail.send')} onActivity={d=>c.recordActivity('gmail',d)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('calendar', c => <CalendarCapabilityPanel canRead={c.isGranted('calendar.read')} canWrite={c.isGranted('calendar.write')} onActivity={(d,r)=>c.recordActivity('calendar',d,r)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('tasks', c => <TasksCapabilityPanel canUse={c.isGranted('tasks')} onActivity={(d,r)=>c.recordActivity('tasks',d,r)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('drive', c => <DriveCapabilityPanel canRead={c.isGranted('drive.read')} canUpload={c.isGranted('drive.file')} onActivity={(d,r)=>c.recordActivity('drive',d,r)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('docs', c => <DocsCapabilityPanel canUse={c.isGranted('docs')} onActivity={(d,r)=>c.recordActivity('docs',d,r)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('sheets', c => <SheetsCapabilityPanel canRead={c.isGranted('sheets.read')} canWrite={c.isGranted('sheets.write')} onActivity={(d,r)=>c.recordActivity('sheets',d,r)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('contacts', c => <ContactsCapabilityPanel canRead={c.isGranted('contacts.read')} onActivity={d=>c.recordActivity('contacts',d)} onAskElara={askFor(c)}/>);
googleCapabilityModuleRegistry.register('chat', c => <ChatCapabilityPanel canRead={c.isGranted('chat.read')} canSend={c.isGranted('chat.send')} canManage={c.isGranted('chat.manage')} onActivity={d=>c.recordActivity('chat',d)} onAskElara={askFor(c)}/>);
export function createGoogleCapabilityModule(descriptor: GoogleHubCapabilityDescriptor): GoogleCapabilityModule { return { descriptor, renderPanel: context => googleCapabilityModuleRegistry.render(descriptor, context) }; }
export function createGoogleCapabilityModules(descriptors: readonly GoogleHubCapabilityDescriptor[]): readonly GoogleCapabilityModule[] { return descriptors.map(createGoogleCapabilityModule); }
