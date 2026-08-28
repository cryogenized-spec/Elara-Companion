import React, { useState } from 'react';
import { createCalendarEvent, getCalendarEventsRange, getUpcomingCalendarEvents } from '../../services/googleCalendarService';
import type { GoogleCalendarEvent } from '../../contracts';

export interface CalendarCapabilityPanelProps { canRead: boolean; onActivity?: (description: string, reversible?: boolean) => void; }

function toIsoLocal(value: string): string { return new Date(value).toISOString(); }

export function CalendarCapabilityPanel({ canRead, onActivity }: CalendarCapabilityPanelProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [range, setRange] = useState<'today' | 'tomorrow' | 'next7'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');

  const load = async () => {
    if (!canRead) return;
    setLoading(true); setError(null);
    try {
      const now = new Date();
      let startTime = new Date(now); let endTime = new Date(now);
      if (range === 'today') { startTime.setHours(0,0,0,0); endTime.setHours(23,59,59,999); }
      else if (range === 'tomorrow') { startTime.setDate(startTime.getDate() + 1); startTime.setHours(0,0,0,0); endTime = new Date(startTime); endTime.setHours(23,59,59,999); }
      else { startTime.setHours(0,0,0,0); endTime.setDate(endTime.getDate() + 7); }
      const result = range === 'next7' ? await getCalendarEventsRange(toIsoLocal(startTime.toISOString().slice(0,16)), toIsoLocal(endTime.toISOString().slice(0,16)), 50) : await getCalendarEventsRange(startTime.toISOString(), endTime.toISOString(), 50);
      setEvents(result.items as GoogleCalendarEvent[]);
      onActivity?.(`Read ${result.items.length} Calendar event${result.items.length === 1 ? '' : 's'}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read Calendar.'); }
    finally { setLoading(false); }
  };

  const create = async () => {
    if (!title.trim() || !start || !end) return;
    setError(null);
    try { const event = await createCalendarEvent(title.trim(), new Date(start).toISOString(), new Date(end).toISOString(), undefined, location.trim() || undefined); setEvents(prev => [...prev, event as GoogleCalendarEvent]); setTitle(''); setStart(''); setEnd(''); setLocation(''); setNotice(`Created “${event.summary || title}”.`); onActivity?.(`Created Calendar event “${event.summary || title}”`, true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to create Calendar event.'); }
  };

  return <div className="space-y-5">
    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Scheduling</p><h3 className="mt-1 text-lg font-semibold">Google Calendar</h3><p className="mt-1 text-sm text-white/50">Inspect today, tomorrow, or the next seven days, with lightweight event creation.</p></div>
    {!canRead ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Calendar read access is not enabled. Enable the capability from Permissions.</div> : <>
      <div className="flex flex-wrap gap-2">{(['today','tomorrow','next7'] as const).map(item => <button key={item} type="button" onClick={() => setRange(item)} className={`rounded-lg border px-3 py-2 text-xs ${range === item ? 'border-white/20 bg-white/10' : 'border-white/10'}`}>{item === 'today' ? 'Today' : item === 'tomorrow' ? 'Tomorrow' : 'Next 7 days'}</button>)}<button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-white/10 px-3 py-2 text-xs">{loading ? 'Loading…' : 'Refresh'}</button><a href="https://calendar.google.com/" target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs">Open Calendar</a></div>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}{notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h4 className="text-sm font-semibold">Create event</h4><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><div className="grid gap-2 sm:grid-cols-2"><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/></div><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm"/><button type="button" onClick={() => void create()} disabled={!title.trim() || !start || !end} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium disabled:opacity-40">Create event</button></section>
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{events.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No events loaded yet.</div> : events.map(event => <div key={event.id} className="px-4 py-4"><p className="text-sm font-medium">{event.summary || '(Untitled event)'}</p><p className="mt-1 text-xs text-white/45">{event.start.dateTime || event.start.date || ''}</p>{event.location && <p className="mt-1 text-xs text-white/35">{event.location}</p>}</div>)}</div>
    </>}
  </div>;
}
