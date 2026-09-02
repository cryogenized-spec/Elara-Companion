import assert from 'node:assert/strict';
import test from 'node:test';
import { stopCalendarWatchWithToken, watchCalendarEventsWithToken } from '../googleCalendarWatchApi';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('Calendar watch creates a webhook channel with an HTTPS address', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return response({ id: 'channel-1', resourceId: 'resource-1', resourceUri: 'calendar-uri', token: 'verify-1', expiration: '1788319000000' });
  };
  try {
    const result = await watchCalendarEventsWithToken('access-token', 'primary', {
      notificationAddress: 'https://example.test/google/calendar/notifications',
      channelId: 'channel-1',
      token: 'verify-1',
      expiration: 1788319000000,
    });
    assert.match(requestUrl, /\/calendars\/primary\/events\/watch$/);
    assert.equal((requestInit?.method || ''), 'POST');
    assert.equal((JSON.parse(String(requestInit?.body)) as any).type, 'web_hook');
    assert.equal((JSON.parse(String(requestInit?.body)) as any).address, 'https://example.test/google/calendar/notifications');
    assert.equal(result.id, 'channel-1');
    assert.equal(result.resourceId, 'resource-1');
  } finally { globalThis.fetch = originalFetch; }
});

test('Calendar watch rejects non-HTTPS webhook addresses', async () => {
  await assert.rejects(
    watchCalendarEventsWithToken('access-token', 'primary', { notificationAddress: 'http://example.test/notifications' }),
    /must use HTTPS/,
  );
});

test('Calendar watch stop sends the channel and resource identifiers to the shared stop endpoint', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(null, { status: 200 });
  };
  try {
    await stopCalendarWatchWithToken('access-token', 'channel-2', 'resource-2');
    assert.equal(requestUrl, 'https://www.googleapis.com/calendar/v3/channels/stop');
    assert.equal(requestInit?.method, 'POST');
    assert.deepEqual(JSON.parse(String(requestInit?.body)), { id: 'channel-2', resourceId: 'resource-2' });
  } finally { globalThis.fetch = originalFetch; }
});
