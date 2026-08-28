import React, { useState } from 'react';

export interface SimpleGoogleCapabilityPanelProps {
  name: string;
  category: string;
  description: string;
  externalUrl: string;
  enabled: boolean;
  onEnable?: () => void;
  onActivity?: (description: string) => void;
}

/** Lightweight capability surface for provider modules whose rich UI is introduced later. */
export function SimpleGoogleCapabilityPanel({ name, category, description, externalUrl, enabled, onEnable, onActivity }: SimpleGoogleCapabilityPanelProps) {
  const [opened, setOpened] = useState(false);
  return <div className="space-y-5">
    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">{category}</p><h3 className="mt-1 text-lg font-semibold">{name}</h3><p className="mt-1 text-sm text-white/50">{description}</p></div>
    {!enabled && <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4"><p className="text-sm text-amber-100">This capability is not enabled yet.</p>{onEnable && <button type="button" onClick={onEnable} className="mt-3 rounded-xl border border-amber-300/20 px-4 py-2 text-xs font-medium text-amber-100">Enable access</button>}</div>}
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-white/70">Elara can use this service through its registered provider contract. Rich in-app operations can be added without changing the Hub shell.</p><div className="mt-4 flex flex-wrap gap-2"><a href={externalUrl} target="_blank" rel="noreferrer" onClick={() => onActivity?.(`Opened ${name} in Google`)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06]">Open in Google</a><button type="button" onClick={() => { setOpened(value => !value); onActivity?.(`${opened ? 'Closed' : 'Opened'} ${name} capability details`); }} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06]">{opened ? 'Hide capability details' : 'Capability details'}</button></div>{opened && <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3 text-xs leading-5 text-white/45">This module intentionally keeps provider-specific implementation out of the Google Hub shell. Its richer operations can be attached later through the same capability registry and panel injection seam.</div>}</div>
  </div>;
}
