import React, { useState } from 'react';
import { getUpcomingCalendarEvents } from '../../services/settingsCalendarService';
import type { GoogleCalendarEvent } from '../../contracts';

export interface CalendarCapabilityPanelProps { canRead: boolean; onActivity?: (description: string, reversible?: boolean) => void; }

export function CalendarCapabilityPanel({ canRead, onActivity }: CalendarCapabilityPanelProps) {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!canRead) return;
    setLoading(true); setError(null);
    try {
      const result = await getUpcomingCalendarEvents(10);
      setEvents(result.items);
      onActivity?.(`Read ${result.items.length} upcoming Calendar event${result.items.length === 1 ? '' : 's'}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to read Calendar.'); }
    finally { setLoading(false); }
  };

  return <div className="space-y-5">
    <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-white/35">Scheduling</p><h3 className="mt-1 text-lg font-semibold">Calendar</h3><p className="mt-1 text-sm text-white/50">Inspect upcoming events without recreating the full Google Calendar client.</p></div>
    {!canRead ? <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm text-amber-100">Calendar read access is not enabled. Enable the capability from Permissions.</div> : <>
      <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/[0.06] disabled:opacity-50">{loading ? 'Loading…' : 'Refresh upcoming'}</button>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>}
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {events.length === 0 ? <div className="px-4 py-8 text-center text-sm text-white/35">No events loaded yet.</div> : events.map(event => <div key={event.id} className="px-4 py-4"><p className="text-sm font-medium">{event.summary || '(Untitled event)'}</p><p className="mt-1 text-xs text-white/45">{event.start.dateTime || event.start.date || ''}</p>{event.location && <p className="mt-1 text-xs text-white/35">{event.location}</p>}</div>)}
      </div>
    </>}
  </div>;
}
