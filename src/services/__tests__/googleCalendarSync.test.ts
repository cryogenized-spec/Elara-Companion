import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CalendarSyncTokenExpiredError,
  syncCalendarEventsWithToken,
} from '../../infrastructure/googleCalendarApi';
import { setCalendarTokenProvider } from '../googleCalendarService';
import {
  getLocalGoogleCalendarSyncState,
  syncGoogleCalendar,
} from '../googleCalendarSyncService';
import { clearAllCalendarSyncState } from '../../lib/calendarSyncStorage';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const event = (id: string, summary: string, status = 'confirmed') => ({
  id,
  summary,
  status,
  start: { dateTime: `2026-09-02T0${id === 'a' ? '8' : '9'}:00:00Z` },
  end: { dateTime: `2026-09-02T0${id === 'a' ? '9' : '10'}:00:00Z` },
});

test('calendar sync performs a full paginated synchronization and persists nextSyncToken', async () => {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (!url.includes('pageToken=next')) {
      return response({ items: [event('a', 'First')], nextPageToken: 'next' });
    }
    return response({ items: [event('b', 'Second')], nextSyncToken: 'sync-1' });
  };

  try {
    await clearAllCalendarSyncState();
    setCalendarTokenProvider(async (capability) => {
      assert.equal(capability, 'calendar.read');
      return 'token-1';
    });

    const result = await syncGoogleCalendar('primary');
    assert.equal(result.mode, 'full');
    assert.equal(result.reset, false);
    assert.equal(result.upserted, 2);
    assert.equal(result.removed, 0);
    assert.equal(result.total, 2);
    assert.equal(result.syncToken, 'sync-1');
    assert.equal(requests.length, 2);
    assert.match(requests[0], /showDeleted=true/);
    assert.doesNotMatch(requests[0], /singleEvents=/);
    assert.doesNotMatch(requests[0], /orderBy=/);

    const local = await getLocalGoogleCalendarSyncState('primary');
    assert.equal(local?.syncToken, 'sync-1');
    assert.deepEqual(local?.events.map((item) => item.id), ['a', 'b']);
  } finally {
    globalThis.fetch = originalFetch;
    setCalendarTokenProvider(null);
  }
});

test('calendar incremental sync applies updates and removals against the stored snapshot', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) return response({ items: [event('a', 'First'), event('b', 'Second')], nextSyncToken: 'sync-1' });
    return response({ items: [event('a', 'Updated'), event('b', 'Second', 'cancelled'), event('c', 'Third')], nextSyncToken: 'sync-2' });
  };

  try {
    await clearAllCalendarSyncState();
    setCalendarTokenProvider(async () => 'token-2');

    const first = await syncGoogleCalendar('primary');
    assert.equal(first.mode, 'full');

    const second = await syncGoogleCalendar('primary');
    assert.equal(second.mode, 'incremental');
    assert.equal(second.reset, false);
    assert.equal(second.upserted, 2);
    assert.equal(second.removed, 1);
    assert.equal(second.total, 2);
    assert.equal(second.syncToken, 'sync-2');

    const local = await getLocalGoogleCalendarSyncState('primary');
    assert.deepEqual(local?.events.map((item) => [item.id, item.summary]), [['a', 'Updated'], ['c', 'Third']]);
  } finally {
    globalThis.fetch = originalFetch;
    setCalendarTokenProvider(null);
  }
});

test('expired sync tokens trigger a clean full resynchronization without losing the canonical boundary', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async (input) => {
    call += 1;
    const params = new URL(String(input)).searchParams;
    if (call === 1) return response({ items: [event('a', 'Original')], nextSyncToken: 'sync-old' });
    if (params.get('syncToken') === 'sync-old') return response({ error: { message: 'token expired' } }, 410);
    assert.equal(params.get('syncToken'), null);
    assert.equal(params.get('showDeleted'), 'true');
    return response({ items: [event('z', 'Fresh')], nextSyncToken: 'sync-new' });
  };

  try {
    await clearAllCalendarSyncState();
    setCalendarTokenProvider(async () => 'token-3');

    await syncGoogleCalendar('primary');
    const result = await syncGoogleCalendar('primary');
    assert.equal(result.mode, 'full');
    assert.equal(result.reset, true);
    assert.deepEqual((await getLocalGoogleCalendarSyncState('primary'))?.events.map((item) => item.id), ['z']);
    assert.equal(result.syncToken, 'sync-new');
  } finally {
    globalThis.fetch = originalFetch;
    setCalendarTokenProvider(null);
  }
});

test('transport raises a typed expiry error only when a supplied syncToken becomes invalid', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => response({ error: { message: 'expired' } }, 410);
  try {
    await assert.rejects(
      syncCalendarEventsWithToken('token-4', 'primary', 'sync-expired'),
      (error: unknown) => error instanceof CalendarSyncTokenExpiredError,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('calendar sync uses the canonical service token provider', async () => {
  setCalendarTokenProvider(async (capability) => {
    assert.equal(capability, 'calendar.read');
    return 'provider-token';
  });
  try {
    const originalFetch = globalThis.fetch;
    let seenAuth = '';
    globalThis.fetch = async (_input, init) => {
      seenAuth = String((init?.headers as Record<string, string> | undefined)?.Authorization || '');
      return response({ items: [], nextSyncToken: 'sync-provider' });
    };
    try {
      await clearAllCalendarSyncState();
      await syncGoogleCalendar('primary');
      assert.equal(seenAuth, 'Bearer provider-token');
    } finally {
      globalThis.fetch = originalFetch;
    }
  } finally {
    setCalendarTokenProvider(null);
  }
});
