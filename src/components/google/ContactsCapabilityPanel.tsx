import React, { useState } from 'react';
import { listContacts, searchContacts, type ContactPerson } from '../../services/googleContactsService';

export interface ContactsCapabilityPanelProps { canRead: boolean; onActivity?: (description: string) => void; onAskElara?: (prompt: string) => void; }

export function ContactsCapabilityPanel({ canRead, onActivity, onAskElara }: ContactsCapabilityPanelProps) {
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    if (!canRead) return;
    setLoading(true); setError(null);
    try { const result = query.trim() ? await searchContacts(query, 20) : await listContacts(20); setContacts(result.contacts); onActivity?.(`Read ${result.contacts.length} Google Contact${result.contacts.length === 1 ? '' : 's'}`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to read Contacts.'); }
    finally { setLoading(false); }
  };
  return <div className="space-y-5"><div><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">People</p><h3 className="mt-1 text-lg font-semibold">Google Contacts</h3></div>{onAskElara&&<button type="button" onClick={()=>onAskElara('Help me with Google Contacts. Use the currently loaded people data and do not alter anything without my instruction.')} className="rounded-xl border border-sky-300/15 bg-sky-300/[0.04] px-3 py-2 text-xs text-sky-100">Ask Elara</button>}</div><p className="mt-1 text-sm text-white/50">Search people without turning Elara into a full contacts client.</p></div>{!canRead ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Contacts read access is not enabled.</div> : <><div className="flex flex-wrap gap-2"><div className="flex min-w-0 flex-1 gap-2"><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load(); }} placeholder="Search contacts…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25"/><button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium">{loading ? 'Loading…' : 'Search'}</button></div><a href="https://contacts.google.com/" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium">Open Contacts</a></div>{error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}<div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{contacts.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No contacts loaded yet.</div> : contacts.map(contact => <div key={contact.resourceName || contact.displayName} className="px-4 py-3"><p className="text-sm font-medium">{contact.displayName}</p>{contact.emailAddresses[0] && <p className="mt-1 text-xs text-white/45">{contact.emailAddresses[0]}</p>}{contact.phoneNumbers[0] && <p className="mt-1 text-xs text-white/35">{contact.phoneNumbers[0]}</p>}</div>)}</div></>}</div>;
}
