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
import { ElaraMindSigil } from './ElaraMindSigil';

interface ThinkingEventTimelineProps {
  events: ThinkingEvent[];
  isStreaming?: boolean;
  thoughtDurationMs?: number;
  defaultCollapsed?: boolean;
}

const statusClasses: Record<ThinkingEventStatus, string> = {
  active: 'text-pink-100',
  completed: 'text-zinc-200',
  failed: 'text-rose-300',
  cancelled: 'text-amber-300',
};

function ServiceBadge({ event }: { event: ThinkingEvent }) {
  const service = event.tool?.service;
  const iconClass = 'h-3.5 w-3.5';
  switch (service) {
    case 'google_calendar': return <span className="flex items-center gap-1 text-blue-200"><CalendarDays className={`${iconClass} text-blue-300`} /><span className="hidden sm:inline">Calendar</span></span>;
    case 'gmail': return <span className="flex items-center gap-1 text-red-200"><Mail className={`${iconClass} text-red-300`} /><span className="hidden sm:inline">Gmail</span></span>;
    case 'google_docs': return <span className="flex items-center gap-1 text-blue-200"><FileText className={`${iconClass} text-blue-300`} /><span className="hidden sm:inline">Docs</span></span>;
    case 'google_sheets': return <span className="flex items-center gap-1 text-emerald-200"><span className="text-[11px] font-black leading-none text-emerald-300">S</span><span className="hidden sm:inline">Sheets</span></span>;
    case 'google_drive': return <span className="flex items-center gap-1 text-yellow-200"><HardDrive className={`${iconClass} text-yellow-300`} /><span className="hidden sm:inline">Drive</span></span>;
    case 'google_keep': return <span className="flex items-center gap-1 text-yellow-200"><BookOpen className={`${iconClass} text-yellow-300`} /><span className="hidden sm:inline">Keep</span></span>;
    case 'google_search': return <span className="flex items-center gap-1 text-blue-200"><span className="font-black text-[11px] bg-gradient-to-r from-blue-300 via-red-300 to-yellow-300 bg-clip-text text-transparent">G</span><Search className={`${iconClass} text-blue-300`} /><span className="hidden sm:inline">Search</span></span>;
    case 'memory': return <span className="flex items-center gap-1 text-amber-200"><BookOpen className={`${iconClass} text-amber-300`} /><span className="hidden sm:inline">Memory</span></span>;
    case 'web': return <span className="flex items-center gap-1 text-cyan-200"><Globe2 className={`${iconClass} text-cyan-300`} /><span className="hidden sm:inline">Web</span></span>;
    case 'internal': return <span className="flex items-center gap-1 text-violet-200"><Settings2 className={`${iconClass} text-violet-300`} /><span className="hidden sm:inline">Elara</span></span>;
    default: return null;
  }
}

function EventIcon({ event }: { event: ThinkingEvent }) {
  const iconClass = 'h-3.5 w-3.5';
  if (event.type === 'thought') return <Brain className={`${iconClass} text-pink-200`} />;
  if (event.type === 'completion') return <CheckCircle2 className={`${iconClass} text-emerald-300`} />;
  if (event.tool?.service === 'memory' || event.type === 'memory' || event.type === 'memory_result') return <BookOpen className={`${iconClass} text-amber-300`} />;
  if (event.tool?.service === 'google_calendar') return <CalendarDays className={`${iconClass} text-blue-300`} />;
  if (event.tool?.service === 'gmail') return <Mail className={`${iconClass} text-red-300`} />;
  if (event.tool?.service === 'google_search') return <Search className={`${iconClass} text-blue-300`} />;
  if (event.tool?.service === 'web') return <Globe2 className={`${iconClass} text-cyan-300`} />;
  if (event.tool?.service === 'internal') return <Settings2 className={`${iconClass} text-violet-300`} />;
  return <Wrench className={`${iconClass} text-zinc-400`} />;
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
    <div className="w-full mb-3 rounded-2xl border border-pink-500/15 bg-zinc-950/55 px-3 py-2.5 shadow-[0_8px_30px_rgba(244,114,182,0.06)] backdrop-blur-sm sm:px-3.5">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-xl px-1 py-0.5 text-left hover:bg-pink-400/[0.035] focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-300/60"
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-pink-300" /> : <ChevronDown className="h-3.5 w-3.5 text-pink-300" />}
        <ElaraMindSigil active={isStreaming} size={22} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-200">
            <span>{isStreaming ? 'Thinking' : 'Thought for'}</span>
            {isStreaming && <span className="h-1.5 w-1.5 rounded-full bg-pink-300 shadow-[0_0_8px_rgba(244,114,182,0.8)] motion-safe:animate-pulse" />}
          </div>
          <div className="text-[10px] text-zinc-500">
            {isStreaming
              ? `${ordered.length} ${ordered.length === 1 ? 'event' : 'events'}${duration ? ` · ${duration}` : ''}`
              : duration ? duration : `${ordered.length} ${ordered.length === 1 ? 'event' : 'events'}`}
          </div>
        </div>
        {isStreaming && <Sparkles className="h-3.5 w-3.5 shrink-0 text-pink-300 motion-safe:animate-pulse" />}
      </button>

      {!collapsed && (
        <div className="relative mt-2.5 pl-7 sm:pl-8">
          <div className="absolute left-[12px] top-2 bottom-2 w-px bg-gradient-to-b from-pink-300/70 via-pink-500/20 to-zinc-800" />
          <div className="space-y-0.5">
            {ordered.map((event, index) => {
              const isOpen = expanded[event.id] ?? false;
              const eventDuration = compactDuration(event.durationMs);
              const hasExpandableBody = Boolean(event.summary || event.detail || event.tool?.operation);
              const label = event.tool?.label || event.title;
              const isActive = event.status === 'active';

              return (
                <div key={event.id} className="relative motion-safe:animate-[fadeIn_180ms_ease-out]">
                  <div className={`absolute -left-7 sm:-left-8 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border ${isActive ? 'border-pink-300/80 bg-pink-500/10 shadow-[0_0_12px_rgba(244,114,182,0.22)]' : 'border-pink-400/30 bg-zinc-950'} transition-all duration-300`}>
                    <EventIcon event={event} />
                  </div>
                  <button
                    type="button"
                    onClick={() => hasExpandableBody && toggleEvent(event.id)}
                    disabled={!hasExpandableBody}
                    className={`group flex w-full items-start gap-2 rounded-xl px-2 py-2.5 text-left transition-all duration-200 ${hasExpandableBody ? 'hover:bg-white/[0.035] cursor-pointer' : 'cursor-default'} focus:outline-none focus-visible:ring-1 focus-visible:ring-pink-400/60`}
                    aria-expanded={hasExpandableBody ? isOpen : undefined}
                  >
                    <span className="mt-0.5 shrink-0 text-pink-300/75">
                      {hasExpandableBody ? (isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : <span className="block w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium ${statusClasses[event.status]}`}>
                        <span className="min-w-0 flex-1">{label}</span>
                        {event.tool?.service && <ServiceBadge event={event} />}
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
                      <Clock3 className={`mt-1 h-3 w-3 shrink-0 ${isActive ? 'text-pink-300 motion-safe:animate-pulse' : 'text-zinc-700'}`} />
                    )}
                  </button>
                  {index < ordered.length - 1 && <span className="sr-only">Next event</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
