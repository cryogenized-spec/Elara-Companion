import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCalendarEventInstancesWithToken,
  getCalendarFreeBusyWithToken,
  getCalendarListWithToken,
  createCalendarEventWithToken,
} from '../../infrastructure/googleCalendarApi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('CalendarList discovery follows nextPageToken and normalizes metadata', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    if (requests.length === 1) {
      return jsonResponse({
        items: [{ id: 'primary', summary: 'Gareth', primary: true, selected: true, accessRole: 'owner', timeZone: 'Africa/Johannesburg' }],
        nextPageToken: 'page-2',
      });
    }
    return jsonResponse({
      items: [{ id: 'work@example.com', summary: 'Work', selected: true, accessRole: 'writer' }],
    });
  };

  try {
    const result = await getCalendarListWithToken('token', 2);
    assert.deepEqual(result.items.map((item) => item.id), ['primary', 'work@example.com']);
    assert.equal(result.items[0].primary, true);
    assert.equal(result.items[0].timeZone, 'Africa/Johannesburg');
    assert.match(requests[1], /pageToken=page-2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('FreeBusy sends a bounded multi-calendar availability query', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://www.googleapis.com/calendar/v3/freeBusy');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer token');
    assert.deepEqual(JSON.parse(String(init?.body)), {
      timeMin: '2026-09-02T06:00:00.000Z',
      timeMax: '2026-09-02T14:00:00.000Z',
      calendarExpansionMax: 2,
      items: [{ id: 'primary' }, { id: 'work@example.com' }],
    });
    return jsonResponse({
      timeMin: '2026-09-02T06:00:00.000Z',
      timeMax: '2026-09-02T14:00:00.000Z',
      calendars: {
        primary: { busy: [{ start: '2026-09-02T08:00:00.000Z', end: '2026-09-02T09:00:00.000Z' }] },
        'work@example.com': { busy: [], errors: [{ domain: 'calendar', reason: 'notFound' }] },
      },
    });
  };

  try {
    const result = await getCalendarFreeBusyWithToken(
      'token',
      '2026-09-02T06:00:00Z',
      '2026-09-02T14:00:00Z',
      ['primary', 'work@example.com'],
    );
    assert.deepEqual(result.calendars.primary.busy, [{ start: '2026-09-02T08:00:00.000Z', end: '2026-09-02T09:00:00.000Z' }]);
    assert.equal(result.calendars['work@example.com'].errors?.[0].reason, 'notFound');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('FreeBusy rejects invalid windows and more than 50 calendars locally', async () => {
  const ids = Array.from({ length: 51 }, (_, index) => `calendar-${index}`);
  await assert.rejects(
    getCalendarFreeBusyWithToken('token', '2026-09-02T10:00:00Z', '2026-09-02T09:00:00Z', ['primary']),
    /timeMax must be after timeMin/,
  );
  await assert.rejects(
    getCalendarFreeBusyWithToken('token', '2026-09-02T09:00:00Z', '2026-09-02T10:00:00Z', ids),
    /At most 50 calendar ids/,
  );
});

test('recurring event instances paginate and preserve recurrence identity fields', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    if (requests.length === 1) {
      return jsonResponse({
        items: [{
          id: 'instance-1',
          summary: 'Standup',
          recurringEventId: 'series-1',
          originalStartTime: { dateTime: '2026-09-03T08:00:00+02:00', timeZone: 'Africa/Johannesburg' },
          start: { dateTime: '2026-09-03T08:30:00+02:00', timeZone: 'Africa/Johannesburg' },
          end: { dateTime: '2026-09-03T09:00:00+02:00', timeZone: 'Africa/Johannesburg' },
        }],
        nextPageToken: 'page-2',
      });
    }
    return jsonResponse({
      items: [{
        id: 'instance-2',
        summary: 'Standup',
        recurringEventId: 'series-1',
        originalStartTime: { dateTime: '2026-09-04T08:00:00+02:00', timeZone: 'Africa/Johannesburg' },
        start: { dateTime: '2026-09-04T08:00:00+02:00', timeZone: 'Africa/Johannesburg' },
        end: { dateTime: '2026-09-04T08:30:00+02:00', timeZone: 'Africa/Johannesburg' },
      }],
    });
  };

  try {
    const result = await getCalendarEventInstancesWithToken('token', 'series-1', {
      timeMin: '2026-09-03T00:00:00Z',
      timeMax: '2026-09-05T00:00:00Z',
      maxResults: 2,
    });
    assert.deepEqual(result.items.map((item) => item.id), ['instance-1', 'instance-2']);
    assert.equal(result.items[0].recurringEventId, 'series-1');
    assert.equal(result.items[0].originalStartTime?.timeZone, 'Africa/Johannesburg');
    assert.match(requests[0], /timeMin=2026-09-03T00%3A00%3A00.000Z/);
    assert.match(requests[1], /pageToken=page-2/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('recurring event creation includes RRULE and explicit event time zone', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /calendars\/primary\/events$/);
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), {
      summary: 'Weekly planning',
      start: { dateTime: '2026-09-07T09:00:00+02:00', timeZone: 'Africa/Johannesburg' },
      end: { dateTime: '2026-09-07T10:00:00+02:00', timeZone: 'Africa/Johannesburg' },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
    });
    return jsonResponse({
      id: 'series-2',
      summary: 'Weekly planning',
      start: { dateTime: '2026-09-07T09:00:00+02:00', timeZone: 'Africa/Johannesburg' },
      end: { dateTime: '2026-09-07T10:00:00+02:00', timeZone: 'Africa/Johannesburg' },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
    });
  };

  try {
    const result = await createCalendarEventWithToken(
      'token',
      'Weekly planning',
      '2026-09-07T09:00:00+02:00',
      '2026-09-07T10:00:00+02:00',
      undefined,
      undefined,
      { recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'], timeZone: 'Africa/Johannesburg' },
    );
    assert.deepEqual(result.recurrence, ['RRULE:FREQ=WEEKLY;BYDAY=MO']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('recurring instance and FreeBusy validation rejects missing identifiers', async () => {
  await assert.rejects(getCalendarEventInstancesWithToken('token', ''), /recurringEventId is required/);
  await assert.rejects(getCalendarFreeBusyWithToken('token', '2026-09-02T09:00:00Z', '2026-09-02T10:00:00Z', []), /At least one calendar id/);
});
