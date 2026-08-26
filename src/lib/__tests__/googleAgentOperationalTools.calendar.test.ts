import assert from 'node:assert/strict';
import test from 'node:test';
import { executeGoogleOperationalTool } from '../googleAgentOperationalTools';

test('operational calendar range tool delegates through canonical calendar service', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /calendar\/v3\/calendars\/primary\/events/);
    return new Response(JSON.stringify({
      items: [{ id: 'event-1', summary: 'Delegated Event', start: { dateTime: '2026-08-26T10:00:00Z' }, end: { dateTime: '2026-08-26T11:00:00Z' } }],
    }), { status: 200 });
  };

  try {
    const result = await executeGoogleOperationalTool(
      'get_calendar_events_range',
      { startTime: '2026-08-26T00:00:00Z', endTime: '2026-08-27T00:00:00Z', maxResults: 10 },
      'explicit-test-token',
    );
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.provider, 'google_calendar');
      assert.equal(result.operation, 'range_read');
      assert.equal(result.count, 1);
      assert.equal(result.events[0]?.id, 'event-1');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('operational calendar create tool delegates through canonical calendar service', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /calendar\/v3\/calendars\/primary\/events/);
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({
      id: 'event-2',
      summary: 'Created Event',
      start: { dateTime: '2026-08-26T12:00:00Z' },
      end: { dateTime: '2026-08-26T13:00:00Z' },
      htmlLink: 'https://calendar.google.com/event-2',
    }), { status: 200 });
  };

  try {
    const result = await executeGoogleOperationalTool(
      'create_calendar_event',
      { summary: 'Created Event', startTime: '2026-08-26T12:00:00Z', endTime: '2026-08-26T13:00:00Z' },
      'explicit-test-token',
    );
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.provider, 'google_calendar');
      assert.equal(result.operation, 'create');
      assert.equal(result.eventId, 'event-2');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
