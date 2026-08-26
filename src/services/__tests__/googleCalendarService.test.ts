import assert from 'node:assert/strict';
import test from 'node:test';
import { googleCapabilities, googleIdentity } from '../googleWorkspaceService';
import { createCalendarEvent, getUpcomingCalendarEvents } from '../googleCalendarService';

test('calendar read adapter requests the calendar.read capability and normalizes events', async () => {
  const originalAuthorized = googleIdentity.isAuthorized;
  const originalGranted = googleCapabilities.getGrantedScopes;
  const originalIsGranted = googleCapabilities.isGranted;
  const originalGetScopes = googleCapabilities.getScopes;
  const originalRequest = googleIdentity.requestCapabilityAuthorization;
  const originalToken = googleIdentity.getAccessToken;
  const originalFetch = globalThis.fetch;
  const calls: string[][] = [];

  googleIdentity.isAuthorized = () => false;
  googleCapabilities.getGrantedScopes = () => '';
  googleCapabilities.isGranted = () => false;
  googleCapabilities.getScopes = (capability) => {
    assert.equal(capability, 'calendar.read');
    return ['calendar.read.scope'];
  };
  googleIdentity.requestCapabilityAuthorization = async (scopes) => {
    calls.push(scopes);
    return 'authorized-token';
  };
  googleIdentity.getAccessToken = () => 'test-token';
  globalThis.fetch = async (input) => {
    assert.match(String(input), /calendar\/v3\/calendars\/primary\/events/);
    return new Response(JSON.stringify({ items: [{ id: 'evt1', summary: 'Test Event', start: { dateTime: '2026-01-01T10:00:00Z' }, end: { dateTime: '2026-01-01T11:00:00Z' } }] }), { status: 200 });
  };

  try {
    const result = await getUpcomingCalendarEvents(5);
    assert.deepEqual(calls, [['calendar.read.scope']]);
    assert.equal(result.items[0]?.id, 'evt1');
    assert.equal(result.items[0]?.summary, 'Test Event');
  } finally {
    googleIdentity.isAuthorized = originalAuthorized;
    googleCapabilities.getGrantedScopes = originalGranted;
    googleCapabilities.isGranted = originalIsGranted;
    googleCapabilities.getScopes = originalGetScopes;
    googleIdentity.requestCapabilityAuthorization = originalRequest;
    googleIdentity.getAccessToken = originalToken;
    globalThis.fetch = originalFetch;
  }
});

test('calendar write adapter requests calendar.write capability', async () => {
  const originalAuthorized = googleIdentity.isAuthorized;
  const originalGranted = googleCapabilities.getGrantedScopes;
  const originalIsGranted = googleCapabilities.isGranted;
  const originalGetScopes = googleCapabilities.getScopes;
  const originalRequest = googleIdentity.requestCapabilityAuthorization;
  const originalToken = googleIdentity.getAccessToken;
  const originalFetch = globalThis.fetch;

  googleIdentity.isAuthorized = () => false;
  googleCapabilities.getGrantedScopes = () => '';
  googleCapabilities.isGranted = () => false;
  googleCapabilities.getScopes = (capability) => {
    assert.equal(capability, 'calendar.write');
    return ['calendar.write.scope'];
  };
  googleIdentity.requestCapabilityAuthorization = async (scopes) => {
    assert.deepEqual(scopes, ['calendar.write.scope']);
    return 'authorized-token';
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
    googleCapabilities.getGrantedScopes = originalGranted;
    googleCapabilities.isGranted = originalIsGranted;
    googleCapabilities.getScopes = originalGetScopes;
    googleIdentity.requestCapabilityAuthorization = originalRequest;
    googleIdentity.getAccessToken = originalToken;
    globalThis.fetch = originalFetch;
  }
});
