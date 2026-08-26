import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createCalendarEventWithToken,
  getCalendarEventsRangeWithToken,
  getUpcomingCalendarEventsWithToken,
} from '../../infrastructure/googleCalendarApi';

test('shared calendar infrastructure uses explicit token for upcoming events', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /calendar\/v3\/calendars\/primary\/events/);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer worker-token');
    return new Response(JSON.stringify({ items: [{ id: 'evt1', summary: 'Worker Event', start: {}, end: {} }] }), { status: 200 });
  };

  try {
    const result = await getUpcomingCalendarEventsWithToken('worker-token', 5);
    assert.equal(result.items[0]?.id, 'evt1');
    assert.equal(result.items[0]?.summary, 'Worker Event');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('shared calendar infrastructure validates ranged queries and normalizes timestamps', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /timeMin=2026-01-01T10%3A00%3A00.000Z/);
    assert.match(String(input), /timeMax=2026-01-01T11%3A00%3A00.000Z/);
    return new Response(JSON.stringify({ items: [{ id: 'evt2', summary: 'Ranged Event', start: { dateTime: '2026-01-01T10:15:00Z' }, end: { dateTime: '2026-01-01T10:45:00Z' } }] }), { status: 200 });
  };

  try {
    const result = await getCalendarEventsRangeWithToken('worker-token', '2026-01-01T10:00:00+00:00', '2026-01-01T11:00:00+00:00', 10);
    assert.equal(result.startTime, '2026-01-01T10:00:00.000Z');
    assert.equal(result.endTime, '2026-01-01T11:00:00.000Z');
    assert.equal(result.items[0]?.id, 'evt2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('shared calendar infrastructure rejects an inverted range before calling Google', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response('{}');
  };

  try {
    await assert.rejects(
      getCalendarEventsRangeWithToken('worker-token', '2026-01-01T11:00:00Z', '2026-01-01T10:00:00Z'),
      /endTime must be after startTime/,
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('shared calendar infrastructure preserves explicit token on writes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer worker-token');
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({ id: 'evt3', summary: 'Created', start: {}, end: {} }), { status: 200 });
  };

  try {
    const result = await createCalendarEventWithToken('worker-token', 'Created', '2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z');
    assert.equal(result.id, 'evt3');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('background Google tools contain no direct Calendar REST implementation', async () => {
  const source = await readFile(new URL('../../../background-runtime/src/googleTools.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /calendar\/v3\/calendars\/primary\/events/);
  assert.match(source, /getUpcomingCalendarEventsWithToken/);
});
