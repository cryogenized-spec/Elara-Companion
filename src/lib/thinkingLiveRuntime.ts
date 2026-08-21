import type { ThoughtStep, MemoryAction } from '../types';
import type { ThinkingEvent } from './thinkingEvents';
import { createThinkingStreamBuffer, pushThought, pushToolActivity, snapshotThinkingStream, completeThinkingStream, type ThinkingStreamBuffer, type ThinkingToolChunk } from './thinkingStream';

let activeStream: ThinkingStreamBuffer | null = null;

export function beginLiveThinkingStream(): void {
  activeStream = createThinkingStreamBuffer();
}

export function syncLiveThoughtSteps(steps: ThoughtStep[]): ThinkingEvent[] {
  if (!activeStream) beginLiveThinkingStream();
  const incoming = steps.at(-1);
  if (incoming) pushThought(activeStream!, incoming.step_title, incoming.summary, incoming.timestamp);
  return snapshotThinkingStream(activeStream!);
}

export function recordLiveToolActivity(chunk: ThinkingToolChunk): ThinkingEvent[] {
  if (typeof window === 'undefined') return getLiveThinkingEvents();
  if (!activeStream) beginLiveThinkingStream();
  pushToolActivity(activeStream!, chunk);
  return snapshotThinkingStream(activeStream!);
}

export function recordLiveMemoryActivity(action: Pick<MemoryAction, 'type' | 'targetId' | 'reason'>, summary?: string): ThinkingEvent[] {
  if (typeof window === 'undefined') return getLiveThinkingEvents();
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
  return snapshotThinkingStream(activeStream!);
}

export function completeLiveThinkingStream(durationMs?: number): ThinkingEvent[] {
  if (!activeStream) return [];
  completeThinkingStream(activeStream, durationMs);
  return snapshotThinkingStream(activeStream);
}

export function getLiveThinkingEvents(): ThinkingEvent[] {
  return activeStream ? snapshotThinkingStream(activeStream) : [];
}

export function clearLiveThinkingStream(): void {
  activeStream = null;
}
