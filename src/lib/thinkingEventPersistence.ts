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
    const streamingAssistantMessages = conversations.flatMap((conversation) =>
      conversation.messages
        .filter((message) => message.role === 'assistant' && message.isStreaming)
        .map((message) => ({ conversationId: conversation.id, message }))
    );

    const target = streamingAssistantMessages.reduce<typeof streamingAssistantMessages[number] | null>(
      (latest, candidate) => (!latest || candidate.message.timestamp > latest.message.timestamp ? candidate : latest),
      null,
    );

    if (!target) return;

    const now = Date.now();
    const next = conversations.map((conversation) => {
      if (conversation.id !== target.conversationId) return conversation;
      const messages = conversation.messages.map((message) =>
        message.id === target.message.id
          ? { ...message, thinkingEvents: events, thoughtDurationMs: Math.max(0, now - message.timestamp) }
          : message,
      );
      return { ...conversation, updatedAt: now, messages };
    });

    await setDbConversations(next);
  } catch (error) {
    console.warn('Thinking-event persistence deferred:', error);
  }
}

export function persistLiveThinkingEvents(events: ThinkingEvent[]): void {
  if (typeof window === 'undefined') return;
  pendingEvents = events.map((event) => ({ ...event }));
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => { void flush(); }, 180);
}

export async function flushLiveThinkingEvents(): Promise<void> {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await flush();
}
