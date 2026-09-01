import assert from 'node:assert/strict';
import test from 'node:test';
import { setCalendarTokenProvider } from '../googleCalendarService';
import { createCalendarEvent, getUpcomingCalendarEvents } from '../googleCalendarService';

function installTestTokenProvider(token = 'authorized-token') {
  setCalendarTokenProvider(async (capability) => {
    assert.ok(capability === 'calendar.read' || capability === 'calendar.write');
    return token;
  });
}

test('calendar read service requests its capability from the environment provider and normalizes events', async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  setCalendarTokenProvider(async (capability) => {
    requested.push(capability);
    return 'authorized-token';
  });
  globalThis.fetch = async (input) => {
    assert.match(String(input), /calendar\/v3\/calendars\/primary\/events/);
    return new Response(JSON.stringify({ items: [{ id: 'evt1', summary: 'Test Event', start: { dateTime: '2026-01-01T10:00:00Z' }, end: { dateTime: '2026-01-01T11:00:00Z' } }] }), { status: 200 });
  };

  try {
    const result = await getUpcomingCalendarEvents(5);
    assert.deepEqual(requested, ['calendar.read']);
    assert.equal(result.items[0]?.id, 'evt1');
    assert.equal(result.items[0]?.summary, 'Test Event');
  } finally {
    globalThis.fetch = originalFetch;
    setCalendarTokenProvider(null);
  }
});

test('calendar service passes an explicit token directly without invoking the provider', async () => {
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  setCalendarTokenProvider(async () => {
    providerCalls += 1;
    return 'unexpected-provider-token';
  });
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.headers && new Headers(init.headers).get('authorization'), 'Bearer explicit-token');
    return new Response(JSON.stringify({ items: [{ id: 'evt-explicit', summary: 'Explicit Token Event', start: { dateTime: '2026-01-01T12:00:00Z' }, end: { dateTime: '2026-01-01T13:00:00Z' } }] }), { status: 200 });
  };

  try {
    const result = await getUpcomingCalendarEvents(5, 'explicit-token');
    assert.equal(providerCalls, 0);
    assert.equal(result.items[0]?.id, 'evt-explicit');
  } finally {
    globalThis.fetch = originalFetch;
    setCalendarTokenProvider(null);
  }
});

test('calendar write service requests calendar.write capability', async () => {
  const originalFetch = globalThis.fetch;
  const requested: string[] = [];
  setCalendarTokenProvider(async (capability) => {
    requested.push(capability);
    return 'authorized-token';
  });
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({ id: 'evt2', summary: 'Created Event', start: { dateTime: '2026-01-01T12:00:00Z' }, end: { dateTime: '2026-01-01T13:00:00Z' } }), { status: 200 });
  };

  try {
    const result = await createCalendarEvent('Created Event', '2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z');
    assert.deepEqual(requested, ['calendar.write']);
    assert.equal(result.id, 'evt2');
  } finally {
    globalThis.fetch = originalFetch;
    setCalendarTokenProvider(null);
  }
});
