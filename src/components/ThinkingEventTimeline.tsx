import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  HardDrive,
  Mail,
  Brain,
  Search,
  Settings2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { ThinkingEvent, ThinkingEventStatus } from '../lib/thinkingEvents';

interface ThinkingEventTimelineProps {
  events: ThinkingEvent[];
  isStreaming?: boolean;
  thoughtDurationMs?: number;
  defaultCollapsed?: boolean;
}

const statusClasses: Record<ThinkingEventStatus, string> = {
  active: 'text-pink-200',
  completed: 'text-zinc-200',
  failed: 'text-rose-300',
  cancelled: 'text-amber-300',
};

function ServiceIcon({ event }: { event: ThinkingEvent }) {
  const service = event.tool?.service;
  const iconClass = 'h-3.5 w-3.5';

  switch (service) {
    case 'google_calendar': return <CalendarDays className={`${iconClass} text-blue-300`} />;
    case 'gmail': return <Mail className={`${iconClass} text-red-300`} />;
    case 'google_docs': return <FileText className={`${iconClass} text-blue-300`} />;
    case 'google_sheets': return <FileText className={`${iconClass} text-emerald-300`} />;
    case 'google_drive': return <HardDrive className={`${iconClass} text-yellow-300`} />;
    case 'google_keep': return <BookOpen className={`${iconClass} text-yellow-300`} />;
    case 'google_search': return <Search className={`${iconClass} text-blue-300`} />;
    case 'memory': return <BookOpen className={`${iconClass} text-amber-300`} />;
    case 'web': return <Globe2 className={`${iconClass} text-cyan-300`} />;
    case 'internal': return <Settings2 className={`${iconClass} text-violet-300`} />;
    default:
      if (event.type === 'thought') return <Brain className={`${iconClass} text-pink-300`} />;
      if (event.type === 'completion') return <CheckCircle2 className={`${iconClass} text-emerald-300`} />;
      return <Wrench className={`${iconClass} text-zinc-400`} />;
  }
}

function compactDuration(durationMs?: number): string | null {
  if (typeof durationMs !== 'number') return null;
  if (durationMs < 1000) return `${Math.max(0, Math.round(durationMs))}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export const ThinkingEventTimeline: React.FC<ThinkingEventTimelineProps> = ({
  events,
  isStreaming = false,
  thoughtDurationMs,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ordered = useMemo(
    () => [...events].sort((a, b) => a.sequence - b.sequence || a.timestamp - b.timestamp || a.id.localeCompare(b.id)),
    [events],
  );

  const derivedDurationMs = thoughtDurationMs ?? (() => {
    if (ordered.length < 2) return undefined;
    const first = ordered[0]?.timestamp;
    const last = ordered[ordered.length - 1]?.timestamp;
    if (typeof first !== 'number' || typeof last !== 'number') return undefined;
    return Math.max(0, last - first);
  })();

  const duration = compactDuration(derivedDurationMs);
  if (ordered.length === 0) return null;

  const toggleEvent = (id: string) => setExpanded((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className="w-full mb-3 rounded-xl border border-zinc-800/80 bg-zinc-950/45 px-3 py-2.5 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white/[0.025] focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-400/60"
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-pink-300" /> : <ChevronDown className="h-3.5 w-3.5 text-pink-300" />}
        <div className="relative flex h-5 w-5 items-center justify-center shrink-0">
          <span className={`absolute h-2.5 w-2.5 rounded-full ${isStreaming ? 'bg-pink-400 animate-pulse' : 'bg-pink-400/80'}`} />
          {isStreaming && <span className="absolute h-5 w-5 rounded-full border border-pink-400/25 animate-ping" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-300">
            {isStreaming ? 'Thinking' : 'Thought for'}
          </div>
          <div className="text-[10px] text-zinc-500">
            {isStreaming
              ? `${ordered.length} ${ordered.length === 1 ? 'event' : 'events'}${duration ? ` · ${duration}` : ''}`
              : duration ? `${duration}` : `${ordered.length} ${ordered.length === 1 ? 'event' : 'events'}`}
          </div>
        </div>
        {isStreaming && <Sparkles className="h-3.5 w-3.5 shrink-0 text-pink-300 animate-pulse" />}
      </button>

      {!collapsed && (
        <div className="relative mt-2 pl-7">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-pink-400/60 via-pink-500/25 to-zinc-800" />
          <div className="space-y-1">
            {ordered.map((event) => {
              const isOpen = expanded[event.id] ?? false;
              const eventDuration = compactDuration(event.durationMs);
              const hasExpandableBody = Boolean(event.summary || event.detail || event.tool?.operation);
              const label = event.tool?.label || event.title;

              return (
                <div key={event.id} className="relative">
                  <div className="absolute -left-7 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-pink-400/45 bg-zinc-950">
                    <ServiceIcon event={event} />
                  </div>
                  <button
                    type="button"
                    onClick={() => hasExpandableBody && toggleEvent(event.id)}
                    disabled={!hasExpandableBody}
                    className={`group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${hasExpandableBody ? 'hover:bg-white/[0.035] cursor-pointer' : 'cursor-default'} focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-400/60`}
                    aria-expanded={hasExpandableBody ? isOpen : undefined}
                  >
                    <span className="mt-0.5 shrink-0 text-pink-300/80">
                      {hasExpandableBody ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="block w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-medium ${statusClasses[event.status]}`}>
                        <span>{label}</span>
                        {event.tool?.service && <span className="text-[9px] uppercase tracking-wide text-zinc-500">{event.tool.service.replace('google_', 'Google ')}</span>}
                        {eventDuration && <span className="text-[9px] font-mono text-zinc-600">{eventDuration}</span>}
                      </span>
                      {isOpen && (
                        <span className="mt-1 block whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-400">
                          {event.summary || event.detail || event.tool?.operation || 'No additional detail.'}
                        </span>
                      )}
                    </span>
                    {event.status === 'failed' ? (
                      <span className="mt-1 text-[9px] font-semibold uppercase text-rose-400">Failed</span>
                    ) : event.type === 'completion' ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Clock3 className={`mt-1 h-3 w-3 shrink-0 ${event.status === 'active' ? 'text-pink-300' : 'text-zinc-700'}`} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
