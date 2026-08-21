import type { ThoughtStep } from '../types';
import type { ThinkingEvent } from './thinkingEvents';
import { createThinkingStreamBuffer, pushThought, snapshotThinkingStream, type ThinkingStreamBuffer } from './thinkingStream';

let activeStream: ThinkingStreamBuffer | null = null;

export function beginLiveThinkingStream(): void {
  activeStream = createThinkingStreamBuffer();
}

export function syncLiveThoughtSteps(steps: ThoughtStep[]): ThinkingEvent[] {
  if (!activeStream) beginLiveThinkingStream();

  const stream = activeStream!;
  const incoming = steps.slice(-1)[0];
  if (incoming) {
    pushThought(stream, incoming.step_title, incoming.summary, incoming.timestamp);
  }

  return snapshotThinkingStream(stream);
}

export function getLiveThinkingEvents(): ThinkingEvent[] {
  return activeStream ? snapshotThinkingStream(activeStream) : [];
}

export function clearLiveThinkingStream(): void {
  activeStream = null;
}
