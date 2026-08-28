import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { GoogleHub } from './GoogleHub';
import { GmailCapabilityPanel } from './GmailCapabilityPanel';
import { CalendarCapabilityPanel } from './CalendarCapabilityPanel';
import { TasksCapabilityPanel } from './TasksCapabilityPanel';
import { DriveCapabilityPanel } from './DriveCapabilityPanel';
import { DocsCapabilityPanel } from './DocsCapabilityPanel';
import { SheetsCapabilityPanel } from './SheetsCapabilityPanel';
import { KeepCapabilityPanel } from './KeepCapabilityPanel';
import { ContactsCapabilityPanel } from './ContactsCapabilityPanel';
import { ChatCapabilityPanel } from './ChatCapabilityPanel';
import { googleHubCapabilityRegistry } from '../../services/googleCapabilityRegistry';
import { createCanonicalGoogleHubAuthorizationState } from '../../services/googleHubAuthorizationProvider';
import { googleCapabilities, googleIdentity } from '../../services/googleWorkspaceService';
import { googleActivityRecorder } from '../../services/googleActivityService';
import type { GoogleCapability } from '../../contracts';
import type { GoogleHubCapabilityDescriptor } from '../../contracts/googleHub';

interface GoogleHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleHubModal({ isOpen, onClose }: GoogleHubModalProps) {
  const capabilities = useMemo(() => googleHubCapabilityRegistry.list(), []);
  const [authorization, setAuthorization] = useState(() =>
    createCanonicalGoogleHubAuthorizationState(capabilities).snapshot(),
  );
  const [activityTick, setActivityTick] = useState(0);

  const refresh = useCallback(() => {
    setAuthorization(createCanonicalGoogleHubAuthorizationState(capabilities).snapshot());
    setActivityTick((value) => value + 1);
  }, [capabilities]);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const isGranted = (capability: GoogleCapability) =>
    googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability);

  const enableCapability = async (descriptor: GoogleHubCapabilityDescriptor) => {
    try {
      const missing = descriptor.requiredCapabilities.filter((capability) => !isGranted(capability));
      if (missing.length === 0) return;
      for (const capability of missing) {
        await googleIdentity.requestCapabilityAuthorization(googleCapabilities.getScopes(capability), false);
      }
      refresh();
    } catch (error) {
      console.warn('Google capability authorization failed:', error);
      refresh();
    }
  };

  const activity = googleActivityRecorder.list(50).map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    service: entry.capabilityId,
    description: entry.description,
    reversible: entry.reversible,
  }));

  const recordActivity = (capabilityId: string, action: 'read' | 'create' | 'update' | 'delete' | 'send' | 'open', description: string, reversible = false) => {
    googleActivityRecorder.record({
      id: `gha_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      capabilityId,
      action,
      description,
      reversible,
      external: action !== 'open',
    });
    setActivityTick((value) => value + 1);
  };

  const renderPanel = (descriptor: GoogleHubCapabilityDescriptor) => {
    const onRead = (description: string) => recordActivity(descriptor.id, 'read', description);
    const onCreate = (description: string, reversible?: boolean) => recordActivity(descriptor.id, 'create', description, reversible);
    if (descriptor.id === 'gmail') {
      return <GmailCapabilityPanel canRead={isGranted('gmail.read')} canCompose={isGranted('gmail.compose')} canSend={isGranted('gmail.send')} onActivity={onRead} />;
    }
    if (descriptor.id === 'calendar') {
      return <CalendarCapabilityPanel canRead={isGranted('calendar.read')} onActivity={onRead} />;
    }
    if (descriptor.id === 'tasks') {
      return <TasksCapabilityPanel canUse={isGranted('tasks')} onActivity={onCreate} />;
    }
    if (descriptor.id === 'drive') {
      return <DriveCapabilityPanel canRead={isGranted('drive.read')} onActivity={onRead} />;
    }
    if (descriptor.id === 'docs') {
      return <DocsCapabilityPanel canUse={isGranted('docs')} onActivity={onCreate} />;
    }
    if (descriptor.id === 'sheets') {
      return <SheetsCapabilityPanel canRead={isGranted('sheets.read')} canWrite={isGranted('sheets.write')} onActivity={onCreate} />;
    }
    if (descriptor.id === 'keep') {
      return <KeepCapabilityPanel canRead={isGranted('keep.read')} canWrite={isGranted('keep.write')} onActivity={onCreate} />;
    }
    if (descriptor.id === 'contacts') {
      return <ContactsCapabilityPanel canRead={isGranted('contacts.read')} onActivity={onRead} />;
    }
    if (descriptor.id === 'chat') {
      return <ChatCapabilityPanel canRead={isGranted('chat.read')} canSend={isGranted('chat.send')} onActivity={onRead} />;
    }
    return null;
  };

  const panels = Object.fromEntries(capabilities.map((descriptor) => [descriptor.id, renderPanel(descriptor)]));

  void activityTick;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4" role="dialog" aria-modal="true" aria-label="Google Hub">
      <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Elara</p>
            <h2 className="text-base font-semibold text-white">Google Hub</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Close Google Hub"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1">
          <GoogleHub
            authorization={authorization}
            capabilities={capabilities}
            activity={activity}
            capabilityPanels={panels}
            onOpenCapability={() => undefined}
            onEnableCapability={enableCapability}
            onDisconnect={() => { googleIdentity.revoke(); refresh(); }}
            onOpenGoogleAccount={() => window.open('https://myaccount.google.com/', '_blank', 'noopener,noreferrer')}
          />
        </div>
      </div>
    </div>
  );
}
