export type ThinkingEventType =
  | 'thought'
  | 'tool_call'
  | 'tool_result'
  | 'memory'
  | 'memory_result'
  | 'revision'
  | 'completion';

export type ThinkingEventStatus = 'active' | 'completed' | 'failed' | 'cancelled';
export type ThinkingEventSource = 'model' | 'tool' | 'memory' | 'system';

export interface ThinkingToolDescriptor {
  name: string;
  label?: string;
  service?:
    | 'google_calendar'
    | 'gmail'
    | 'google_docs'
    | 'google_sheets'
    | 'google_drive'
    | 'google_keep'
    | 'google_search'
    | 'web'
    | 'memory'
    | 'internal'
    | 'generic';
  operation?: string;
}

export interface ThinkingEvent {
  id: string;
  sequence: number;
  timestamp: number;
  type: ThinkingEventType;
  source: ThinkingEventSource;
  status: ThinkingEventStatus;
  title: string;
  summary?: string;
  detail?: string;
  tool?: ThinkingToolDescriptor;
  relatedEventId?: string;
  durationMs?: number;
}

export interface ThinkingEventInput {
  type: ThinkingEventType;
  source?: ThinkingEventSource;
  status?: ThinkingEventStatus;
  title: string;
  summary?: string;
  detail?: string;
  tool?: ThinkingToolDescriptor;
  relatedEventId?: string;
  durationMs?: number;
}

let fallbackSequence = 0;

export function createThinkingEvent(input: ThinkingEventInput, timestamp = Date.now()): ThinkingEvent {
  const sequence = ++fallbackSequence;
  return {
    id: `thinking_${timestamp}_${sequence}`,
    sequence,
    timestamp,
    type: input.type,
    source: input.source ?? 'system',
    status: input.status ?? 'active',
    title: input.title.trim(),
    ...(input.summary?.trim() ? { summary: input.summary.trim() } : {}),
    ...(input.detail?.trim() ? { detail: input.detail.trim() } : {}),
    ...(input.tool ? { tool: input.tool } : {}),
    ...(input.relatedEventId ? { relatedEventId: input.relatedEventId } : {}),
    ...(typeof input.durationMs === 'number' ? { durationMs: Math.max(0, input.durationMs) } : {}),
  };
}

export function orderThinkingEvents(events: ThinkingEvent[]): ThinkingEvent[] {
  return [...events].sort((a, b) => a.sequence - b.sequence || a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}
