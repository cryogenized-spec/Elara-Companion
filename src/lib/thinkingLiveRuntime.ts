import type { ThoughtStep, MemoryAction } from '../types';
import type { ThinkingEvent } from './thinkingEvents';
import { createThinkingStreamBuffer, pushThought, pushToolActivity, snapshotThinkingStream, completeThinkingStream, type ThinkingStreamBuffer, type ThinkingToolChunk } from './thinkingStream';
import { flushLiveThinkingEvents, persistLiveThinkingEvents } from './thinkingEventPersistence';

let activeStream: ThinkingStreamBuffer | null = null;
const thoughtStepEvents = new Map<string, ThinkingEvent>();

function snapshotAndPersist(): ThinkingEvent[] {
  const events = activeStream ? snapshotThinkingStream(activeStream) : [];
  persistLiveThinkingEvents(events);
  return events;
}

export function beginLiveThinkingStream(): void {
  activeStream = createThinkingStreamBuffer();
  thoughtStepEvents.clear();
  persistLiveThinkingEvents([]);
}

export function syncLiveThoughtSteps(steps: ThoughtStep[]): ThinkingEvent[] {
  if (!activeStream) beginLiveThinkingStream();

  for (const step of steps) {
    const key = step.id;
    if (thoughtStepEvents.has(key)) continue;

    const latest = activeStream!.events.at(-1);
    if (latest?.type === 'thought' && latest.status === 'active') {
      latest.status = 'completed';
    }

    const event = pushThought(activeStream!, step.step_title, step.summary, step.timestamp);
    thoughtStepEvents.set(key, event);
  }

  return snapshotAndPersist();
}

export function recordLiveToolActivity(chunk: ThinkingToolChunk): ThinkingEvent[] {
  if (!activeStream) beginLiveThinkingStream();
  pushToolActivity(activeStream!, chunk);
  return snapshotAndPersist();
}

export function recordLiveMemoryActivity(action: Pick<MemoryAction, 'type' | 'targetId' | 'reason'>, summary?: string): ThinkingEvent[] {
  if (!activeStream) beginLiveThinkingStream();

  const label = action.type === 'CREATE' || action.type === 'ADD'
    ? 'Memory note created'
    : action.type === 'UPDATE'
      ? 'Memory note updated'
      : action.type === 'MERGE'
        ? 'Memories consolidated'
        : action.type === 'DELETE'
          ? 'Memory note removed'
          : 'Memory reviewed';

  pushToolActivity(activeStream!, {
    name: 'memory_scratchpad',
    service: 'memory',
    operation: action.type.toLowerCase(),
    result: summary || action.reason || label,
  });

  const events = snapshotThinkingStream(activeStream!);
  const result = events.at(-1);
  if (result?.type === 'tool_result') {
    result.type = 'memory_result';
    result.source = 'memory';
    result.title = label;
  }
  const call = events.at(-2);
  if (call?.type === 'tool_call') {
    call.type = 'memory';
    call.source = 'memory';
    call.title = label;
  }
  persistLiveThinkingEvents(events);
  return snapshotThinkingStream(activeStream!);
}

export function completeLiveThinkingStream(durationMs?: number): ThinkingEvent[] {
  if (!activeStream) return [];
  completeThinkingStream(activeStream, durationMs);
  const events = snapshotAndPersist();
  void flushLiveThinkingEvents();
  return events;
}

export function getLiveThinkingEvents(): ThinkingEvent[] {
  return activeStream ? snapshotThinkingStream(activeStream) : [];
}

export function clearLiveThinkingStream(): void {
  activeStream = null;
  thoughtStepEvents.clear();
}
