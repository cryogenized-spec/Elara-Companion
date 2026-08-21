import type { ThinkingEvent } from './thinkingEvents';

declare module '../types' {
  interface Message {
    thinkingEvents?: ThinkingEvent[];
  }
}

export type MessageThinkingEvents = ThinkingEvent[];
