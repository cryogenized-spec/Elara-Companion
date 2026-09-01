import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCalendarEventWithToken,
  deleteCalendarEventWithToken,
  getCalendarEventWithToken,
  getCalendarEventsRangeWithToken,
  getUpcomingCalendarEventsWithToken,
  patchCalendarEventWithToken,
} from '../../infrastructure/googleCalendarApi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('upcoming Calendar events follow nextPageToken until maxResults is satisfied', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  let call = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    call += 1;
    if (call === 1) {
      return jsonResponse({
        items: [
          { id: 'evt-1', summary: 'One', start: { dateTime: '2026-01-01T09:00:00Z' }, end: { dateTime: '2026-01-01T10:00:00Z' } },
          { id: 'evt-2', summary: 'Two', start: { dateTime: '2026-01-01T10:00:00Z' }, end: { dateTime: '2026-01-01T11:00:00Z' } },
        ],
        nextPageToken: 'page-2',
      });
    }
    return jsonResponse({
      items: [
        { id: 'evt-3', summary: 'Three', start: { dateTime: '2026-01-01T11:00:00Z' }, end: { dateTime: '2026-01-01T12:00:00Z' } },
      ],
      nextPageToken: 'page-3',
    });
  };

  try {
    const result = await getUpcomingCalendarEventsWithToken('token', 3);
    assert.deepEqual(result.items.map((item) => item.id), ['evt-1', 'evt-2', 'evt-3']);
    assert.equal(requests.length, 2);
    assert.match(requests[1], /pageToken=page-2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('range Calendar events paginate and stop when the requested maximum is reached', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (requests.length === 1) {
      return jsonResponse({
        items: [{ id: 'evt-1', summary: 'One', start: {}, end: {} }],
        nextPageToken: 'page-2',
      });
    }
    return jsonResponse({
      items: [
        { id: 'evt-2', summary: 'Two', start: {}, end: {} },
        { id: 'evt-3', summary: 'Three', start: {}, end: {} },
      ],
      nextPageToken: 'page-3',
    });
  };

  try {
    const result = await getCalendarEventsRangeWithToken('token', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z', 2);
    assert.deepEqual(result.items.map((item) => item.id), ['evt-1', 'evt-2']);
    assert.equal(requests.length, 2);
    assert.match(requests[1], /pageToken=page-2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('single event GET uses the primary Calendar event resource', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /calendars\/primary\/events\/evt-42$/);
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer token');
    return jsonResponse({ id: 'evt-42', summary: 'Read me', start: {}, end: {} });
  };

  try {
    const result = await getCalendarEventWithToken('token', 'evt-42');
    assert.equal(result.id, 'evt-42');
    assert.equal(result.summary, 'Read me');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('event PATCH sends only the requested partial update', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /calendars\/primary\/events\/evt-42$/);
    assert.equal(init?.method, 'PATCH');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer token');
    assert.deepEqual(JSON.parse(String(init?.body)), { summary: 'Updated title' });
    return jsonResponse({ id: 'evt-42', summary: 'Updated title', start: {}, end: {} });
  };

  try {
    const result = await patchCalendarEventWithToken('token', 'evt-42', { summary: 'Updated title' });
    assert.equal(result.summary, 'Updated title');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('event DELETE uses DELETE and does not require a response body', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async (input, init) => {
    called = true;
    assert.match(String(input), /calendars\/primary\/events\/evt-42$/);
    assert.equal(init?.method, 'DELETE');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer token');
    return new Response(null, { status: 204 });
  };

  try {
    await deleteCalendarEventWithToken('token', 'evt-42');
    assert.equal(called, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('event CRUD rejects an empty event id before calling Google', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response('{}');
  };

  try {
    await assert.rejects(getCalendarEventWithToken('token', ''), /eventId is required/);
    await assert.rejects(patchCalendarEventWithToken('token', '', { summary: 'x' }), /eventId is required/);
    await assert.rejects(deleteCalendarEventWithToken('token', ''), /eventId is required/);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('event create remains available in the same canonical infrastructure boundary', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /calendars\/primary\/events$/);
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer token');
    return jsonResponse({ id: 'evt-new', summary: 'Created', start: {}, end: {} });
  };

  try {
    const result = await createCalendarEventWithToken('token', 'Created', '2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z');
    assert.equal(result.id, 'evt-new');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
