import React, { useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Cloud, FileText, Inbox, Loader2, LogOut, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { getGrantedGoogleScopes, isGoogleIdentityAuthorized, requestGoogleBaseAuthorization, requestGoogleCapabilityAuthorization, revokeGoogleBaseAuthorization } from '../lib/googleAuthorization';
import { getGoogleCapabilityScopes, isGoogleCapabilityGranted, type GoogleCapability } from '../lib/googleCapabilityPolicy';

type ServiceState = 'idle' | 'loading' | 'success' | 'error';
type ServiceMeta = { key: string; label: string; capability: GoogleCapability; extraCapabilities?: GoogleCapability[]; icon: React.ComponentType<{ className?: string }> };

const SERVICES: ServiceMeta[] = [
  { key: 'calendar', label: 'Calendar', capability: 'calendar.read', icon: Calendar },
  { key: 'tasks', label: 'Tasks', capability: 'tasks', icon: CheckCircle2 },
  { key: 'gmail', label: 'Gmail', capability: 'gmail.read', icon: Inbox },
  { key: 'drive', label: 'Drive & Docs', capability: 'drive.read', extraCapabilities: ['docs'], icon: FileText },
  { key: 'keep', label: 'Keep', capability: 'keep.read', icon: FileText },
  { key: 'contacts', label: 'Contacts', capability: 'contacts.read', icon: Users },
  { key: 'chat', label: 'Google Chat', capability: 'chat.read', icon: MessageSquare },
];

const initialState = Object.fromEntries(SERVICES.map(({ key }) => [key, 'idle'])) as Record<string, ServiceState>;

function scopesForService(service: ServiceMeta): string[] {
  return [...new Set([service.capability, ...(service.extraCapabilities || [])].flatMap(getGoogleCapabilityScopes))];
}

function grantedForService(grantedScopes: string, service: ServiceMeta): boolean {
  return [service.capability, ...(service.extraCapabilities || [])].every((capability) => isGoogleCapabilityGranted(grantedScopes, capability));
}

export const GoogleCapabilitySettingsPanel: React.FC = () => {
  const [connected, setConnected] = useState(isGoogleIdentityAuthorized());
  const [grantedScopes, setGrantedScopes] = useState(getGrantedGoogleScopes());
  const [states, setStates] = useState<Record<string, ServiceState>>(initialState);
  const [message, setMessage] = useState<string | null>(null);
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const grantedCount = useMemo(() => SERVICES.filter((service) => grantedForService(grantedScopes, service)).length, [grantedScopes, states]);

  const connect = async () => {
    setMessage(null);
    try {
      await requestGoogleBaseAuthorization(true);
      setConnected(true);
      setGrantedScopes(getGrantedGoogleScopes());
      setMessage('Google identity authorization completed. Workspace access remains separate.');
    } catch (error: any) {
      setConnected(false);
      setMessage(error?.message || 'Google authorization could not be completed.');
    }
  };

  const authorize = async (service: ServiceMeta) => {
    setStates((current) => ({ ...current, [service.key]: 'loading' }));
    setMessage(null);
    try {
      await requestGoogleCapabilityAuthorization(scopesForService(service), true);
      setGrantedScopes(getGrantedGoogleScopes());
      setStates((current) => ({ ...current, [service.key]: 'success' }));
      setMessage(`${service.label} authorization completed.`);
    } catch (error: any) {
      setStates((current) => ({ ...current, [service.key]: 'error' }));
      setMessage(error?.message || `Could not authorize ${service.label}.`);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    setMessage(null);
    try {
      const result = await revokeGoogleBaseAuthorization();
      setConnected(false);
      setGrantedScopes('');
      setStates(initialState);
      setShowDisconnectWarning(false);
      setMessage(result.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><Cloud className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100">Google Workspace</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>{connected ? 'Identity connected' : 'Disconnected'}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Google identity is separate from Workspace permissions. Elara asks for each service only when needed.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-5 text-zinc-400">
          <div className="flex items-center gap-2 font-medium text-sky-300"><ShieldCheck className="h-4 w-4" />Least-privilege authorization</div>
          <p className="mt-1">Initial connection: openid, email and profile. Workspace permissions are granted individually and can be revoked by disconnecting Google.</p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {!connected ? (
            <button onClick={connect} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-500"><ShieldCheck className="h-4 w-4" />Connect Google</button>
          ) : (
            <button onClick={() => setShowDisconnectWarning(true)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-red-950/20 px-4 text-sm font-semibold text-red-300 hover:bg-red-950/40"><LogOut className="h-4 w-4" />Disconnect Google</button>
          )}
          <div className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 text-xs text-zinc-500">{grantedCount}/{SERVICES.length} capabilities authorized</div>
        </div>
        {message && <p className="mt-3 text-xs text-zinc-400">{message}</p>}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-zinc-100">Workspace capabilities</h3>
        <p className="mt-1 text-[11px] text-zinc-500">Each authorization button requests only the scopes required by that service.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const granted = grantedForService(grantedScopes, service);
            const state = states[service.key];
            return (
              <div key={service.key} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-3">
                <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1"><div className="text-xs font-medium text-zinc-200">{service.label}</div><div className="mt-0.5 text-[10px] text-zinc-600">{granted ? 'Authorized' : state === 'error' ? 'Authorization failed' : 'Not authorized'}</div></div>
                {granted ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <button disabled={!connected || state === 'loading'} onClick={() => authorize(service)} className="inline-flex min-h-8 items-center justify-center rounded-lg border border-sky-800/60 bg-sky-950/30 px-2.5 text-[10px] font-semibold text-sky-300 hover:bg-sky-900/50 disabled:opacity-40">{state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Authorize'}</button>}
              </div>
            );
          })}
        </div>
      </section>

      {showDisconnectWarning && (
        <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-4 sm:p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-red-200">Disconnect Google authorization?</h3><p className="mt-1 text-xs leading-5 text-red-200/70">Elara will clear the current Google authorization. Local Elara artifacts and conversations are not deleted.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><button disabled={disconnecting} onClick={disconnect} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">{disconnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Confirm disconnect</button><button onClick={() => setShowDisconnectWarning(false)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-700 px-3 text-xs text-zinc-300">Keep connected</button></div></div></div></div>
      )}
    </div>
  );
};
