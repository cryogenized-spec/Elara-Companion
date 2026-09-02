import { getFreshGoogleAccessToken } from './googleVault';
import { stopCalendarWatch, watchCalendarEvents, type CalendarWatchChannel } from '../src/services/googleCalendarService';
import { createCloudflareLockbox, type CloudflareLockboxEnv } from './lockbox';
import type { KVNamespace } from '@cloudflare/workers-types';

type Env = CloudflareLockboxEnv;
type ChannelRecord = { channel: CalendarWatchChannel; calendarId: string; verificationToken: string; createdAt: number };
type SafeChannelRecord = { channel: Omit<CalendarWatchChannel, 'token'>; calendarId: string; createdAt: number };
export type CalendarChangeSignal = { calendarId: string; channelId: string; resourceId: string; resourceState: 'sync' | 'exists' | 'not_exists'; messageNumber: string; receivedAt: number };

const CHANNEL_PREFIX = 'elara:calendar:channel:';
const SIGNAL_PREFIX = 'elara:calendar:signal:';
const CHANNEL_TTL_SECONDS = 60 * 60 * 24 * 14;
const SIGNAL_TTL_SECONDS = 60 * 60 * 24;
const kv = (env: Env): KVNamespace => createCloudflareLockbox(env).googleVaultKv();
const normalizeCalendarId = (calendarId?: string) => String(calendarId || 'primary').trim() || 'primary';

export async function createCalendarWatch(env: Env, calendarId = 'primary', notificationAddress: string, requestedExpiration?: string): Promise<CalendarWatchChannel> {
  const id = normalizeCalendarId(calendarId);
  const verificationToken = crypto.randomUUID();
  const accessToken = await getFreshGoogleAccessToken(env);
  const channel = await watchCalendarEvents(id, { notificationAddress, token: verificationToken, expiration: requestedExpiration }, accessToken);
  const record: ChannelRecord = { channel, calendarId: id, verificationToken, createdAt: Date.now() };
  await kv(env).put(`${CHANNEL_PREFIX}${channel.id}`, JSON.stringify(record), { expirationTtl: CHANNEL_TTL_SECONDS });
  const { token: _token, ...safeChannel } = channel;
  void _token;
  return safeChannel;
}

export async function stopCalendarWatchChannel(env: Env, channelId: string, resourceId: string): Promise<void> {
  const id = String(channelId || '').trim();
  const resource = String(resourceId || '').trim();
  if (!id || !resource) throw new Error('channelId and resourceId are required.');
  await stopCalendarWatch(id, resource, await getFreshGoogleAccessToken(env));
  await kv(env).delete(`${CHANNEL_PREFIX}${id}`);
}

export async function receiveCalendarNotification(env: Env, request: Request): Promise<Response> {
  const store = kv(env);
  const channelId = request.headers.get('X-Goog-Channel-ID')?.trim() || '';
  const resourceId = request.headers.get('X-Goog-Resource-ID')?.trim() || '';
  const resourceState = request.headers.get('X-Goog-Resource-State')?.trim() as CalendarChangeSignal['resourceState'];
  const verificationToken = request.headers.get('X-Goog-Channel-Token') || '';
  const messageNumber = request.headers.get('X-Goog-Message-Number') || '';
  if (!channelId || !resourceId || !['sync', 'exists', 'not_exists'].includes(resourceState)) return new Response(null, { status: 400 });
  const raw = await store.get(`${CHANNEL_PREFIX}${channelId}`);
  if (!raw) return new Response(null, { status: 404 });
  let record: ChannelRecord;
  try { record = JSON.parse(raw) as ChannelRecord; } catch { return new Response(null, { status: 500 }); }
  if (record.verificationToken !== verificationToken || record.channel.resourceId !== resourceId) return new Response(null, { status: 403 });
  const signal: CalendarChangeSignal = { calendarId: record.calendarId, channelId, resourceId, resourceState, messageNumber, receivedAt: Date.now() };
  await store.put(`${SIGNAL_PREFIX}${record.calendarId}`, JSON.stringify(signal), { expirationTtl: SIGNAL_TTL_SECONDS });
  return new Response(null, { status: 204 });
}

export async function getCalendarChangeSignal(env: Env, calendarId = 'primary'): Promise<CalendarChangeSignal | null> {
  const raw = await kv(env).get(`${SIGNAL_PREFIX}${normalizeCalendarId(calendarId)}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as CalendarChangeSignal; } catch { return null; }
}

export async function getCalendarChannel(env: Env, channelId: string): Promise<SafeChannelRecord | null> {
  const raw = await kv(env).get(`${CHANNEL_PREFIX}${String(channelId || '').trim()}`);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as ChannelRecord;
    const { token: _token, ...safeChannel } = record.channel;
    void _token;
    return { channel: safeChannel, calendarId: record.calendarId, createdAt: record.createdAt };
  } catch { return null; }
}
