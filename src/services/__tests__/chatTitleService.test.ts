import assert from 'node:assert/strict';
import test from 'node:test';
import { generateChatConversationTitle } from '../chatTitleService';

test('chat title service uses the backend provider when no BYOK key is supplied', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/chat/title');
    assert.equal(init?.method, 'POST');

    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, {
      firstUserMessage: 'Hello Elara',
      firstAssistantResponse: 'Hello there.',
    });

    return new Response(JSON.stringify({ title: 'A New Conversation' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const title = await generateChatConversationTitle({
      userMessage: 'Hello Elara',
      assistantResponse: 'Hello there.',
    });
    assert.equal(title, 'A New Conversation');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('chat title service returns a deterministic fallback for an unsuccessful backend response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 503 });

  try {
    const title = await generateChatConversationTitle({
      userMessage: 'Hello New Conversation',
      assistantResponse: 'Hi',
    });
    assert.equal(title, 'Hello New Conversation');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
