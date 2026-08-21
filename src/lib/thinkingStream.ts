import type { ThinkingEvent, ThinkingEventInput, ThinkingToolDescriptor } from './thinkingEvents';

export interface ThinkingStreamBuffer {
  events: ThinkingEvent[];
  nextSequence: number;
}

export interface ThinkingToolChunk {
  name: string;
  args?: unknown;
  result?: unknown;
  error?: string;
  service?: ThinkingToolDescriptor['service'];
  operation?: string;
}

export function createThinkingStreamBuffer(): ThinkingStreamBuffer {
  return { events: [], nextSequence: 1 };
}

function createEvent(
  stream: ThinkingStreamBuffer,
  input: ThinkingEventInput,
  timestamp = Date.now(),
): ThinkingEvent {
  const sequence = stream.nextSequence++;
  const event: ThinkingEvent = {
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
  stream.events.push(event);
  return event;
}

export function pushThought(
  stream: ThinkingStreamBuffer,
  title: string,
  summary: string,
  timestamp = Date.now(),
): ThinkingEvent {
  const latest = stream.events.at(-1);
  if (latest?.type === 'thought' && latest.status === 'active') {
    latest.title = title.trim() || latest.title;
    latest.summary = summary.trim() || latest.summary;
    return latest;
  }

  return createEvent(stream, {
    type: 'thought',
    source: 'model',
    status: 'active',
    title,
    summary,
  }, timestamp);
}

function inferService(toolName: string): ThinkingToolDescriptor['service'] {
  const name = toolName.toLowerCase();
  if (name.includes('calendar')) return 'google_calendar';
  if (name.includes('gmail') || name.includes('mail')) return 'gmail';
  if (name.includes('google_doc') || name.includes('docs')) return 'google_docs';
  if (name.includes('google_sheet') || name.includes('sheets')) return 'google_sheets';
  if (name.includes('google_drive') || name.includes('drive')) return 'google_drive';
  if (name.includes('google_keep') || name.includes('keep')) return 'google_keep';
  if (name.includes('search') || name.includes('web')) return name.includes('google') ? 'google_search' : 'web';
  if (name.includes('memory')) return 'memory';
  return 'generic';
}

export function createToolDescriptor(chunk: ThinkingToolChunk): ThinkingToolDescriptor {
  return {
    name: chunk.name,
    label: chunk.name.replace(/_/g, ' '),
    service: chunk.service ?? inferService(chunk.name),
    operation: chunk.operation,
  };
}

function summarizeToolResult(chunk: ThinkingToolChunk): string {
  if (chunk.error) return chunk.error;
  if (typeof chunk.result === 'string' && chunk.result.trim()) return chunk.result.trim().slice(0, 240);
  if (chunk.result && typeof chunk.result === 'object') return 'Tool returned a result.';
  return 'Tool completed successfully.';
}

export function pushToolActivity(
  stream: ThinkingStreamBuffer,
  chunk: ThinkingToolChunk,
  timestamp = Date.now(),
): ThinkingEvent {
  const tool = createToolDescriptor(chunk);
  const call = createEvent(stream, {
    type: 'tool_call',
    source: 'tool',
    status: 'completed',
    title: tool.label || tool.name,
    summary: `Called ${tool.label || tool.name}.`,
    tool,
  }, timestamp);

  createEvent(stream, {
    type: 'tool_result',
    source: 'tool',
    status: chunk.error ? 'failed' : 'completed',
    title: `${tool.label || tool.name} result`,
    summary: summarizeToolResult(chunk),
    tool,
    relatedEventId: call.id,
  }, timestamp);

  return call;
}

export function completeThinkingStream(
  stream: ThinkingStreamBuffer,
  durationMs?: number,
  timestamp = Date.now(),
): ThinkingEvent {
  for (const event of stream.events) {
    if (event.status === 'active') event.status = 'completed';
  }

  return createEvent(stream, {
    type: 'completion',
    source: 'system',
    status: 'completed',
    title: 'Response ready',
    summary: 'Finished formulating the response.',
    durationMs,
  }, timestamp);
}

export function snapshotThinkingStream(stream: ThinkingStreamBuffer): ThinkingEvent[] {
  return [...stream.events].sort(
    (a, b) => a.sequence - b.sequence || a.timestamp - b.timestamp || a.id.localeCompare(b.id),
  );
}
