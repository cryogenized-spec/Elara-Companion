import React, { useCallback, useState } from 'react';
import {
  createGmailDraft,
  getGmailMessageDetails,
  listGmailMessages,
  sendGmailMessage,
} from '../../services/googleGmailService';
import type { GmailMessageFull, GmailMessageSummary } from '../../services/googleGmailService';

export interface GmailCapabilityPanelProps {
  canRead: boolean;
  canCompose: boolean;
  canSend: boolean;
  onActivity?: (description: string, reversible?: boolean) => void;
}

export function GmailCapabilityPanel({ canRead, canCompose, canSend, onActivity }: GmailCapabilityPanelProps) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selected, setSelected] = useState<GmailMessageFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await listGmailMessages(query, 10);
      setMessages(result.messages);
      setSelected(null);
      onActivity?.(`Read ${result.messages.length} Gmail message${result.messages.length === 1 ? '' : 's'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read Gmail.');
    } finally {
      setLoading(false);
    }
  }, [canRead, onActivity, query]);

  const openMessage = async (message: GmailMessageSummary) => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getGmailMessageDetails(message.id);
      setSelected(detail);
      onActivity?.(`Opened Gmail message “${detail.subject}”`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open Gmail message.');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!canCompose || !to.trim()) return;
    setError(null);
    try {
      const result = await createGmailDraft(to.trim(), subject.trim(), body);
      setNotice(`Draft saved (${result.draftId}).`);
      onActivity?.(`Created Gmail draft to ${to.trim()}`, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create Gmail draft.');
    }
  };

  const send = async () => {
    if (!canSend || !to.trim()) return;
    setError(null);
    try {
      const result = await sendGmailMessage(to.trim(), subject.trim(), body);
      setNotice(`Message sent (${result.messageId}).`);
      onActivity?.(`Sent Gmail message to ${to.trim()}`);
      setTo('');
      setSubject('');
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send Gmail message.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Communication</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">Gmail</h3>
        <p className="mt-1 text-sm text-white/50">Read, search, draft, and—only when explicitly authorised—send mail.</p>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {canRead ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }}
              placeholder="Search your mail…"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25 focus:border-white/25"
            />
            <button type="button" onClick={() => void runSearch()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-50">
              {loading ? 'Reading…' : 'Search'}
            </button>
          </div>

          {messages.length === 0 && <p className="py-5 text-center text-sm text-white/35">No messages loaded yet. Search to retrieve up to 10 messages.</p>}

          <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
            {messages.map((message) => (
              <button key={message.id} type="button" onClick={() => void openMessage(message)} className="block w-full px-3 py-3 text-left hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-3">
                  <span className={`min-w-0 truncate text-sm ${message.isUnread ? 'font-semibold text-white' : 'font-medium text-white/80'}`}>{message.subject}</span>
                  <span className="shrink-0 text-[11px] text-white/30">{message.date}</span>
                </div>
                <p className="mt-1 truncate text-xs text-white/45">{message.from}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/40">{message.snippet}</p>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">
          Gmail read access is not enabled. Enable the Gmail capability from the Hub’s Permissions view.
        </section>
      )}

      {selected && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-white/35">{selected.from}</p>
              <h4 className="mt-1 text-base font-semibold">{selected.subject}</h4>
            </div>
            <span className="text-xs text-white/35">{selected.date}</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/75">{selected.bodyText}</p>
        </section>
      )}

      {canCompose && (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div>
            <h4 className="text-sm font-semibold">Compose</h4>
            <p className="mt-1 text-xs text-white/40">Drafting is separate from sending. Sending requires the explicit Gmail send capability.</p>
          </div>
          <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="To" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25" />
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm outline-none placeholder:text-white/25" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Message" className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-white/25" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveDraft()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06]">Save draft</button>
            <button type="button" onClick={() => void send()} disabled={!canSend || !to.trim()} className="rounded-xl border border-red-300/20 bg-red-300/[0.06] px-4 py-2.5 text-sm font-medium text-red-100 hover:bg-red-300/[0.10] disabled:cursor-not-allowed disabled:opacity-40">{canSend ? 'Send' : 'Send disabled'}</button>
          </div>
        </section>
      )}
    </div>
  );
}
