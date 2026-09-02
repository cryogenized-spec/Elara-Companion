import assert from 'node:assert/strict';
import test from 'node:test';
import { receiveCalendarNotification, getCalendarChangeSignal } from '../googleCalendarPush';

type RecordValue = string;
function fakeKv(initial: Record<string, string> = {}) {
  const values = new Map<string, RecordValue>(Object.entries(initial));
  return {
    async get(key: string) { return values.get(key) || null; },
    async put(key: string, value: string) { values.set(key, value); },
    async delete(key: string) { values.delete(key); },
  } as any;
}

const env = (kv: any) => ({
  GOOGLE_VAULT_KV: kv,
  GOOGLE_OAUTH_CLIENT_ID: 'client',
  GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'https://example.test/callback',
  GEMINI_API_KEY: 'gemini',
  ELARA_BACKGROUND_TOKEN: 'background',
});

test('Calendar webhook accepts a verified Google change notification and stores a signal', async () => {
  const store = fakeKv({
    'elara:calendar:channel:channel-1': JSON.stringify({
      channel: { id: 'channel-1', resourceId: 'resource-1' },
      calendarId: 'primary',
      verificationToken: 'verify-1',
      createdAt: Date.now(),
    }),
  });
  const request = new Request('https://example.test/google/calendar/notifications', { method: 'POST', headers: {
    'X-Goog-Channel-ID': 'channel-1',
    'X-Goog-Resource-ID': 'resource-1',
    'X-Goog-Resource-State': 'exists',
    'X-Goog-Channel-Token': 'verify-1',
    'X-Goog-Message-Number': '7',
  } });

  const result = await receiveCalendarNotification(env(store) as any, request);
  assert.equal(result.status, 204);
  assert.deepEqual(await getCalendarChangeSignal(env(store) as any, 'primary'), {
    calendarId: 'primary',
    channelId: 'channel-1',
    resourceId: 'resource-1',
    resourceState: 'exists',
    messageNumber: '7',
    receivedAt: assert.any(Number),
  });
});

test('Calendar webhook rejects an unknown channel', async () => {
  const store = fakeKv();
  const request = new Request('https://example.test/google/calendar/notifications', { method: 'POST', headers: {
    'X-Goog-Channel-ID': 'missing',
    'X-Goog-Resource-ID': 'resource-1',
    'X-Goog-Resource-State': 'exists',
    'X-Goog-Channel-Token': 'verify-1',
  } });
  assert.equal((await receiveCalendarNotification(env(store) as any, request)).status, 404);
});

test('Calendar webhook rejects token or resource mismatches', async () => {
  const store = fakeKv({
    'elara:calendar:channel:channel-1': JSON.stringify({ channel: { id: 'channel-1', resourceId: 'resource-1' }, calendarId: 'primary', verificationToken: 'verify-1', createdAt: Date.now() }),
  });
  const request = new Request('https://example.test/google/calendar/notifications', { method: 'POST', headers: {
    'X-Goog-Channel-ID': 'channel-1',
    'X-Goog-Resource-ID': 'wrong',
    'X-Goog-Resource-State': 'exists',
    'X-Goog-Channel-Token': 'wrong',
  } });
  assert.equal((await receiveCalendarNotification(env(store) as any, request)).status, 403);
});
