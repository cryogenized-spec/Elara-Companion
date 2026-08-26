import assert from 'node:assert/strict';
import test from 'node:test';
import { googleIdentity } from '../googleWorkspaceService';
import { createCalendarEvent, getUpcomingCalendarEvents } from '../googleCalendarService';

test('calendar read adapter requests the calendar.read capability and normalizes events', async () => {
  const originalAuthorized = googleIdentity.isAuthorized;
  const originalGranted = googleIdentity.getGrantedScopes;
  const originalRequest = googleIdentity.requestCapabilityAuthorization;
  const originalToken = googleIdentity.getAccessToken;
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  googleIdentity.isAuthorized = () => false;
  googleIdentity.getGrantedScopes = () => '';
  googleIdentity.requestCapabilityAuthorization = async (capability) => {
    calls.push(capability);
    return { success: true, message: 'authorized' };
  };
  googleIdentity.getAccessToken = () => 'test-token';
  globalThis.fetch = async (input) => {
    assert.match(String(input), /calendar\/v3\/calendars\/primary\/events/);
    return new Response(JSON.stringify({ items: [{ id: 'evt1', summary: 'Test Event', start: { dateTime: '2026-01-01T10:00:00Z' }, end: { dateTime: '2026-01-01T11:00:00Z' } }] }), { status: 200 });
  };

  try {
    const result = await getUpcomingCalendarEvents(5);
    assert.deepEqual(calls, ['calendar.read']);
    assert.equal(result.items[0]?.id, 'evt1');
    assert.equal(result.items[0]?.summary, 'Test Event');
  } finally {
    googleIdentity.isAuthorized = originalAuthorized;
    googleIdentity.getGrantedScopes = originalGranted;
    googleIdentity.requestCapabilityAuthorization = originalRequest;
    googleIdentity.getAccessToken = originalToken;
    globalThis.fetch = originalFetch;
  }
});

test('calendar write adapter requests calendar.write capability', async () => {
  const originalAuthorized = googleIdentity.isAuthorized;
  const originalGranted = googleIdentity.getGrantedScopes;
  const originalRequest = googleIdentity.requestCapabilityAuthorization;
  const originalToken = googleIdentity.getAccessToken;
  const originalFetch = globalThis.fetch;

  googleIdentity.isAuthorized = () => false;
  googleIdentity.getGrantedScopes = () => '';
  googleIdentity.requestCapabilityAuthorization = async (capability) => {
    assert.equal(capability, 'calendar.write');
    return { success: true, message: 'authorized' };
  };
  googleIdentity.getAccessToken = () => 'test-token';
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.method, 'POST');
    return new Response(JSON.stringify({ id: 'evt2', summary: 'Created Event', start: { dateTime: '2026-01-01T12:00:00Z' }, end: { dateTime: '2026-01-01T13:00:00Z' } }), { status: 200 });
  };

  try {
    const result = await createCalendarEvent('Created Event', '2026-01-01T12:00:00Z', '2026-01-01T13:00:00Z');
    assert.equal(result.id, 'evt2');
  } finally {
    googleIdentity.isAuthorized = originalAuthorized;
    googleIdentity.getGrantedScopes = originalGranted;
    googleIdentity.requestCapabilityAuthorization = originalRequest;
    googleIdentity.getAccessToken = originalToken;
    globalThis.fetch = originalFetch;
  }
});
