import type { ThoughtStep } from '../types';
import type { ThinkingEvent } from './thinkingEvents';
import { createThinkingStreamBuffer, pushThought, snapshotThinkingStream, type ThinkingStreamBuffer } from './thinkingStream';

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

export function getLiveThinkingEvents(): ThinkingEvent[] {
  return activeStream ? snapshotThinkingStream(activeStream) : [];
}

export function clearLiveThinkingStream(): void {
  activeStream = null;
}
