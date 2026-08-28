import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, MessageCircle, ShieldCheck } from 'lucide-react';
import { GoogleHub } from './GoogleHub';
import { createGoogleCapabilityModules } from './googleCapabilityModules';
import { googleHubCapabilityRegistry } from '../../services/googleCapabilityRegistry';
import { createCanonicalGoogleHubAuthorizationState } from '../../services/googleHubAuthorizationProvider';
import { googleCapabilities, googleIdentity } from '../../services/googleWorkspaceService';
import { googleActivityRecorder } from '../../services/googleActivityService';
import type { GoogleCapability } from '../../contracts';
import type { GoogleHubCapabilityDescriptor } from '../../contracts/googleHub';

interface GoogleHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskElara?: (prompt: string) => void;
}

export function GoogleHubModal({ isOpen, onClose, onAskElara }: GoogleHubModalProps) {
  const capabilities = useMemo(() => googleHubCapabilityRegistry.list(), []);
  const modules = useMemo(() => createGoogleCapabilityModules(capabilities), [capabilities]);
  const [authorization, setAuthorization] = useState(() => createCanonicalGoogleHubAuthorizationState(capabilities).snapshot());
  const [activityTick, setActivityTick] = useState(0);
  const [accountEmail, setAccountEmail] = useState<string | undefined>();

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

  useEffect(() => {
    if (!isOpen || !authorization.authorized) {
      setAccountEmail(undefined);
      return;
    }
    let cancelled = false;
    googleIdentity.getAccountEmail()
      .then((email) => { if (!cancelled) setAccountEmail(email || undefined); })
      .catch(() => { if (!cancelled) setAccountEmail(undefined); });
    return () => { cancelled = true; };
  }, [authorization.authorized, isOpen]);

  if (!isOpen) return null;

  const isGranted = (capability: GoogleCapability) =>
    googleCapabilities.isGranted(googleCapabilities.getGrantedScopes(), capability);

  const enableCapability = async (descriptor: GoogleHubCapabilityDescriptor) => {
    try {
      if (!authorization.authorized) {
        await googleIdentity.requestBaseAuthorization(true);
      }
      for (const capability of descriptor.requiredCapabilities.filter((item) => !isGranted(item))) {
        await googleIdentity.requestCapabilityAuthorization(googleCapabilities.getScopes(capability), false);
      }
      refresh();
    } catch (error) {
      console.warn('Google capability authorization failed:', error);
      refresh();
    }
  };

  const revokeAll = async () => {
    await googleIdentity.revoke();
    setAccountEmail(undefined);
    refresh();
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

  const context = (descriptor: GoogleHubCapabilityDescriptor) => ({
    descriptor,
    isGranted,
    recordActivity,
  });

  const panels = Object.fromEntries(modules.map((module) => [module.descriptor.id, module.renderPanel(context(module.descriptor))]));
  void activityTick;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-4" role="dialog" aria-modal="true" aria-label="Google Hub">
      <div className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">Elara</p>
            <h2 className="text-base font-semibold text-white">Google Hub</h2>
          </div>
          <div className="flex items-center gap-2">
            {onAskElara && (
              <button type="button" onClick={() => onAskElara('Ask Elara about my Google data. Start by considering my connected Gmail, Calendar, Drive, Tasks, Sheets, Docs, Keep, Contacts, and Chat capabilities.')} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/75 hover:bg-white/[0.06]">
                <MessageCircle className="h-4 w-4" /> Ask Elara
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Close Google Hub"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <GoogleHub
            accountEmail={accountEmail}
            authorization={authorization}
            capabilities={capabilities}
            activity={activity}
            capabilityPanels={panels}
            onOpenCapability={() => undefined}
            onEnableCapability={enableCapability}
            onDisconnect={revokeAll}
            onOpenGoogleAccount={() => window.open('https://myaccount.google.com/', '_blank', 'noopener,noreferrer')}
            onAskElara={onAskElara}
            onRevokeAll={revokeAll}
          />
        </div>
      </div>
    </div>
  );
}
