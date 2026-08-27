import React, { useMemo, useState } from 'react';
import type {
  GoogleHubAuthorizationSnapshot,
  GoogleHubCapabilityDescriptor,
} from '../../contracts/googleHub';

export type GoogleHubSection = 'account' | 'services' | 'activity' | 'permissions';

export interface GoogleHubActivityEntry {
  id: string;
  timestamp: number;
  service: string;
  description: string;
  reversible?: boolean;
}

export interface GoogleHubProps {
  accountEmail?: string;
  authorization: GoogleHubAuthorizationSnapshot;
  capabilities: readonly GoogleHubCapabilityDescriptor[];
  activity?: readonly GoogleHubActivityEntry[];
  onOpenCapability: (capability: GoogleHubCapabilityDescriptor) => void;
  onEnableCapability?: (capability: GoogleHubCapabilityDescriptor) => void;
  onDisconnect?: () => void;
  onOpenGoogleAccount?: () => void;
}

const SECTIONS: readonly { id: GoogleHubSection; label: string; description: string }[] = [
  { id: 'account', label: 'Account', description: 'Identity and connection status' },
  { id: 'services', label: 'Services', description: 'What Elara can use' },
  { id: 'activity', label: 'Activity', description: 'Recent Google operations' },
  { id: 'permissions', label: 'Permissions', description: 'Access granted to Elara' },
];

export function GoogleHub({
  accountEmail,
  authorization,
  capabilities,
  activity = [],
  onOpenCapability,
  onEnableCapability,
  onDisconnect,
  onOpenGoogleAccount,
}: GoogleHubProps) {
  const [section, setSection] = useState<GoogleHubSection>('account');

  const capabilityState = useMemo(() => {
    return new Map(
      capabilities.map((capability) => [
        capability.id,
        authorization.grantedCapabilities.some((granted) =>
          capability.requiredCapabilities.includes(granted),
        ),
      ]),
    );
  }, [authorization.grantedCapabilities, capabilities]);

  const enabledCount = capabilities.filter((capability) => capabilityState.get(capability.id)).length;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-white">
      <header className="border-b border-white/10 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">Google</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">Google Hub</h2>
            <p className="mt-1 max-w-xl text-sm text-white/60">
              One Google account, modular capabilities, and a clear record of what Elara can access.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              authorization.status === 'authorized'
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
                : authorization.status === 'partially-authorized'
                  ? 'border-amber-400/25 bg-amber-400/10 text-amber-200'
                  : 'border-white/10 bg-white/5 text-white/55'
            }`}
          >
            {authorization.status === 'authorized'
              ? 'Connected'
              : authorization.status === 'partially-authorized'
                ? 'Partially connected'
                : 'Not connected'}
          </span>
        </div>

        <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Google Hub sections">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                section === item.id
                  ? 'border-white/20 bg-white/10'
                  : 'border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-white/45">{item.description}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        {section === 'account' && (
          <AccountPanel
            accountEmail={accountEmail}
            authorization={authorization}
            enabledCount={enabledCount}
            onDisconnect={onDisconnect}
            onOpenGoogleAccount={onOpenGoogleAccount}
          />
        )}

        {section === 'services' && (
          <ServicesPanel
            capabilities={capabilities}
            capabilityState={capabilityState}
            onOpenCapability={onOpenCapability}
            onEnableCapability={onEnableCapability}
          />
        )}

        {section === 'activity' && <ActivityPanel activity={activity} />}

        {section === 'permissions' && (
          <PermissionsPanel
            capabilities={capabilities}
            capabilityState={capabilityState}
            authorization={authorization}
            onOpenCapability={onOpenCapability}
            onEnableCapability={onEnableCapability}
          />
        )}
      </div>
    </section>
  );
}

function AccountPanel({
  accountEmail,
  authorization,
  enabledCount,
  onDisconnect,
  onOpenGoogleAccount,
}: {
  accountEmail?: string;
  authorization: GoogleHubAuthorizationSnapshot;
  enabledCount: number;
  onDisconnect?: () => void;
  onOpenGoogleAccount?: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PanelTitle eyebrow="Account" title="Google account" description="Identity belongs here; individual service permissions belong elsewhere." />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold">G</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium">{accountEmail || 'Google account'}</p>
            <p className="mt-1 text-sm text-white/50">
              {authorization.status === 'authorized'
                ? 'Connected'
                : authorization.status === 'partially-authorized'
                  ? 'Connected with limited capabilities'
                  : 'Not connected'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Stat label="Capabilities enabled" value={String(enabledCount)} />
          <Stat label="Authorization state" value={authorization.status} />
          <Stat label="Last updated" value={new Date(authorization.updatedAt).toLocaleString()} />
          <Stat label="Credential state" value="Provider-managed" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenGoogleAccount}
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-medium hover:bg-white/[0.08]"
        >
          Manage Google account
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={!authorization.authorized || !onDisconnect}
          className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2.5 text-sm font-medium text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Disconnect Google
        </button>
      </div>
    </div>
  );
}

function ServicesPanel({
  capabilities,
  capabilityState,
  onOpenCapability,
  onEnableCapability,
}: {
  capabilities: readonly GoogleHubCapabilityDescriptor[];
  capabilityState: Map<GoogleHubCapabilityDescriptor['id'], boolean>;
  onOpenCapability: (capability: GoogleHubCapabilityDescriptor) => void;
  onEnableCapability?: (capability: GoogleHubCapabilityDescriptor) => void;
}) {
  return (
    <div className="space-y-5">
      <PanelTitle eyebrow="Services" title="Google services" description="Each capability is a replaceable module with its own authorization and actions." />

      <div className="grid gap-3 md:grid-cols-2">
        {capabilities.map((capability) => {
          const enabled = capabilityState.get(capability.id) === true;
          return (
            <article key={capability.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[11px] font-semibold uppercase text-white/65">
                  {capability.iconKey.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{capability.name}</h3>
                    <span className={`text-xs ${enabled ? 'text-emerald-300' : 'text-white/40'}`}>
                      {enabled ? 'Enabled' : 'Needs access'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-white/50">{capability.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenCapability(capability)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/[0.06]"
                >
                  Open
                </button>
                {!enabled && onEnableCapability && (
                  <button
                    type="button"
                    onClick={() => onEnableCapability(capability)}
                    className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-300/[0.10]"
                  >
                    Enable
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ActivityPanel({ activity }: { activity: readonly GoogleHubActivityEntry[] }) {
  return (
    <div className="space-y-5">
      <PanelTitle eyebrow="Activity" title="Agent activity" description="A factual record of Google operations performed through Elara." />
      {activity.length === 0 ? (
        <EmptyState text="No Google activity recorded yet." />
      ) : (
        <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {activity.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-4 py-4">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/40" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{entry.service}</span>
                  <span className="text-white/50"> — {entry.description}</span>
                </p>
                <p className="mt-1 text-xs text-white/35">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
              {entry.reversible && <span className="shrink-0 text-xs text-emerald-300/80">Reversible</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PermissionsPanel({
  capabilities,
  capabilityState,
  authorization,
  onOpenCapability,
  onEnableCapability,
}: {
  capabilities: readonly GoogleHubCapabilityDescriptor[];
  capabilityState: Map<GoogleHubCapabilityDescriptor['id'], boolean>;
  authorization: GoogleHubAuthorizationSnapshot;
  onOpenCapability: (capability: GoogleHubCapabilityDescriptor) => void;
  onEnableCapability?: (capability: GoogleHubCapabilityDescriptor) => void;
}) {
  return (
    <div className="space-y-5">
      <PanelTitle eyebrow="Permissions" title="Google permissions" description="Capability access is explicit and independent; credentials never live in this UI state." />
      <div className="space-y-2">
        {capabilities.map((capability) => {
          const enabled = capabilityState.get(capability.id) === true;
          const missing = authorization.missingCapabilities.filter((item) => capability.requiredCapabilities.includes(item));
          return (
            <div key={capability.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className={`h-2.5 w-2.5 rounded-full ${enabled ? 'bg-emerald-300' : 'bg-white/20'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{capability.name}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {enabled ? 'Access granted' : missing.length ? `${missing.length} permission${missing.length === 1 ? '' : 's'} missing` : 'Unavailable'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenCapability(capability)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium hover:bg-white/[0.06]"
              >
                Details
              </button>
              {!enabled && onEnableCapability && (
                <button
                  type="button"
                  onClick={() => onEnableCapability(capability)}
                  className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs font-medium text-amber-100 hover:bg-amber-300/[0.10]"
                >
                  Enable
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-white/50">{description}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
      <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
      <p className="mt-1 truncate text-sm text-white/80">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/40">{text}</div>;
}
