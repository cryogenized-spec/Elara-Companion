import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCalendarEventWithToken,
  syncCalendarEventsWithToken,
} from '../../infrastructure/googleCalendarApi';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('Calendar event normalization preserves high-value scheduling metadata and the full Google resource', async () => {
  const originalFetch = globalThis.fetch;
  const sourceEvent = {
    id: 'evt-rich',
    iCalUID: 'ical-rich@example.com',
    summary: 'Rich event',
    description: '<p>Details</p>',
    location: 'Cape Town',
    start: { dateTime: '2026-09-02T09:00:00Z', timeZone: 'Africa/Johannesburg' },
    end: { dateTime: '2026-09-02T10:00:00Z', timeZone: 'Africa/Johannesburg' },
    status: 'confirmed',
    eventType: 'default',
    sequence: 4,
    created: '2026-08-01T08:00:00Z',
    updated: '2026-09-01T12:00:00Z',
    colorId: '9',
    organizer: { email: 'organizer@example.com', displayName: 'Organizer', self: true },
    creator: { email: 'creator@example.com', displayName: 'Creator', self: true },
    attendees: [{ email: 'guest@example.com', displayName: 'Guest', responseStatus: 'accepted', optional: true }],
    conferenceData: {
      conferenceId: 'conf-123',
      entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/example' }],
    },
    attachments: [{ fileId: 'file-123', title: 'Agenda', mimeType: 'application/pdf' }],
    extendedProperties: { private: { source: 'elara' } },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
    guestsCanModify: false,
    privateCopy: false,
    customFutureField: { nested: true },
  };

  globalThis.fetch = async () => jsonResponse(sourceEvent);

  try {
    const event = await getCalendarEventWithToken('token', 'evt-rich');
    assert.equal(event.id, 'evt-rich');
    assert.equal(event.iCalUID, 'ical-rich@example.com');
    assert.equal(event.sequence, 4);
    assert.equal(event.organizer?.email, 'organizer@example.com');
    assert.equal(event.attendees?.[0]?.responseStatus, 'accepted');
    assert.equal(event.conferenceData?.conferenceId, 'conf-123');
    assert.equal(event.attachments?.[0]?.fileId, 'file-123');
    assert.equal(
      event.extendedProperties?.private &&
        (event.extendedProperties.private as Record<string, unknown>).source,
      'elara',
    );
    assert.equal(event.reminders?.useDefault, false);
    assert.deepEqual(event.raw, sourceEvent);
    assert.deepEqual(event.raw.customFutureField, { nested: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Calendar incremental sync retains full event resources for durable snapshots', async () => {
  const originalFetch = globalThis.fetch;
  const sourceEvent = {
    id: 'evt-sync-rich',
    summary: 'Synced event',
    start: { date: '2026-09-02' },
    end: { date: '2026-09-03' },
    eventType: 'workingLocation',
    workingLocationProperties: { type: 'officeLocation', officeLocation: { buildingId: 'B1' } },
    customSyncField: 'preserve-me',
  };

  globalThis.fetch = async () =>
    jsonResponse({
      items: [sourceEvent],
      nextSyncToken: 'sync-token-2',
    });

  try {
    const result = await syncCalendarEventsWithToken('token', 'primary');
    const event = result.items[0];
    const workingLocationProperties = event?.workingLocationProperties as
      | { type?: string; officeLocation?: { buildingId?: string } }
      | undefined;

    assert.equal(result.nextSyncToken, 'sync-token-2');
    assert.deepEqual(event?.raw, sourceEvent);
    assert.equal(workingLocationProperties?.type, 'officeLocation');
    assert.equal(workingLocationProperties?.officeLocation?.buildingId, 'B1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
