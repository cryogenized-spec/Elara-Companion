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
  Search,
  Settings2,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { ThinkingEvent, ThinkingEventStatus } from '../lib/thinkingEvents';
import { ElaraMindSigil } from './ElaraMindSigil';

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
      if (event.type === 'completion') return <CheckCircle2 className={`${iconClass} text-emerald-300`} />;
      return <Wrench className={`${iconClass} text-zinc-400`} />;
  }
}

function compactDuration(durationMs?: number): string | null {
  if (typeof durationMs !== 'number') return null;
  if (durationMs < 1000) return `${Math.max(0, Math.round(durationMs))}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function serviceLabel(service?: string): string | null {
  if (!service) return null;
  switch (service) {
    case 'google_calendar': return 'Google Calendar';
    case 'gmail': return 'Gmail';
    case 'google_docs': return 'Google Docs';
    case 'google_sheets': return 'Google Sheets';
    case 'google_drive': return 'Google Drive';
    case 'google_keep': return 'Google Keep';
    case 'google_search': return 'Google Search';
    case 'memory': return 'Memory';
    case 'web': return 'Web';
    case 'internal': return 'Elara';
    default: return service.replaceAll('_', ' ');
  }
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
    <div className="w-full mb-3 rounded-xl border border-pink-500/10 bg-zinc-950/45 px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-pink-400/[0.035] focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-400/60"
        aria-expanded={!collapsed}
      >
        <span className="shrink-0">
          <ElaraMindSigil active={isStreaming} size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-200">
              {isStreaming ? 'Thinking' : 'Thought for'}
            </span>
            {isStreaming && <Sparkles className="h-3 w-3 text-pink-300/80 animate-pulse" />}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {isStreaming
              ? `${ordered.length} ${ordered.length === 1 ? 'event' : 'events'}${duration ? ` · ${duration}` : ''}`
              : duration ? duration : `${ordered.length} ${ordered.length === 1 ? 'event' : 'events'}`}
          </div>
        </div>
        {collapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-pink-300/80" /> : <ChevronDown className="h-4 w-4 shrink-0 text-pink-300/80" />}
      </button>

      {!collapsed && (
        <div className="relative mt-2 pl-6 sm:pl-7">
          <div className="absolute left-[9px] sm:left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-pink-300/55 via-pink-500/20 to-zinc-800" />
          <div className="space-y-0.5 sm:space-y-1">
            {ordered.map((event, index) => {
              const isOpen = expanded[event.id] ?? false;
              const eventDuration = compactDuration(event.durationMs);
              const hasExpandableBody = Boolean(event.summary || event.detail || event.tool?.operation);
              const label = event.tool?.label || event.title;
              const service = serviceLabel(event.tool?.service);

              return (
                <div key={event.id} className="relative">
                  <div className="absolute -left-6 sm:-left-7 top-2.5 z-10 flex h-[18px] w-[18px] sm:h-5 sm:w-5 items-center justify-center rounded-full border border-pink-400/30 bg-zinc-950">
                    <ServiceIcon event={event} />
                  </div>
                  <button
                    type="button"
                    onClick={() => hasExpandableBody && toggleEvent(event.id)}
                    disabled={!hasExpandableBody}
                    className={`group flex w-full items-start gap-1.5 sm:gap-2 rounded-lg px-1.5 sm:px-2 py-1.5 sm:py-2 text-left transition-colors ${hasExpandableBody ? 'hover:bg-white/[0.035] cursor-pointer' : 'cursor-default'} focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-400/60`}
                    aria-expanded={hasExpandableBody ? isOpen : undefined}
                  >
                    <span className="mt-0.5 shrink-0 text-pink-300/70">
                      {hasExpandableBody ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="block w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs font-medium ${statusClasses[event.status]}`}>
                        <span className="truncate">{label}</span>
                        {service && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/75 px-1.5 py-0.5 text-[8px] sm:text-[9px] uppercase tracking-wide text-zinc-500">
                            <ServiceIcon event={event} />
                            <span>{service}</span>
                          </span>
                        )}
                        {eventDuration && <span className="text-[9px] font-mono text-zinc-600">{eventDuration}</span>}
                      </span>
                      {isOpen && (
                        <span className="mt-1.5 block whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-400">
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
                  {index < ordered.length - 1 && <span aria-hidden="true" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
