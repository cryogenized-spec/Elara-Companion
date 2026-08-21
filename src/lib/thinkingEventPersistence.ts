import type { ThinkingEvent } from './thinkingEvents';
import { getDbConversations, setDbConversations } from './db';

let pendingEvents: ThinkingEvent[] | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

async function flush(): Promise<void> {
  const events = pendingEvents;
  pendingEvents = null;
  persistTimer = null;
  if (!events || typeof window === 'undefined') return;

  try {
    const conversations = await getDbConversations();
    let changed = false;
    const now = Date.now();
    const next = conversations.map((conversation) => {
      let conversationChanged = false;
      const messages = conversation.messages.map((message) => {
        if (message.role !== 'assistant' || !message.isStreaming) return message;
        conversationChanged = true;
        changed = true;
        return {
          ...message,
          thinkingEvents: events,
          thoughtDurationMs: now - message.timestamp,
        };
      });
      return conversationChanged ? { ...conversation, updatedAt: now, messages } : conversation;
    });

    if (changed) await setDbConversations(next);
  } catch (error) {
    console.warn('Thinking-event persistence deferred:', error);
  }
}

export function persistLiveThinkingEvents(events: ThinkingEvent[]): void {
  if (typeof window === 'undefined') return;
  pendingEvents = events.map((event) => ({ ...event }));
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    void flush();
  }, 180);
}

export async function flushLiveThinkingEvents(): Promise<void> {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await flush();
}
