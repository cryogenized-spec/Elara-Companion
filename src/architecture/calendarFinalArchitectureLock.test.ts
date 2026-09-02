import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));

async function readText(path: string): Promise<string> {
  return readFile(join(root, path), 'utf8');
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(relative));
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) files.push(relative);
  }
  return files;
}

test('final Calendar lock: legacy Calendar facade surface is gone', async () => {
  const googleApi = await readText('src/lib/googleApi.ts');
  const components = await collectSourceFiles('src/components');
  const legacyConsumers = components.filter((file) => /getUpcomingCalendarEvents|CalendarEventItem|Google Calendar/.test(await readText(file)));

  assert.doesNotMatch(googleApi, /getUpcomingCalendarEvents|getCalendarEventsRange|getCalendarEvent|CalendarEventItem|get_calendar_events/);
  assert.deepEqual(legacyConsumers, []);
});

test('final Calendar lock: REST ownership remains limited to Calendar infrastructure adapters', async () => {
  const files = await collectSourceFiles('src');
  const allowed = new Set(['src/infrastructure/googleCalendarApi.ts', 'src/infrastructure/googleCalendarWatchApi.ts']);
  const offenders: string[] = [];
  for (const file of files) {
    const source = await readText(file);
    if (/https:\/\/www\.googleapis\.com\/calendar\//.test(source) && !allowed.has(file)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

test('final Calendar lock: push signals cannot become a second event-state authority', async () => {
  const push = await readText('background-runtime/googleCalendarPush.ts');
  assert.match(push, /CalendarChangeSignal/);
  assert.match(push, /SIGNAL_PREFIX/);
  assert.match(push, /return new Response\(null, \{ status: 204 \}\)/);
  assert.doesNotMatch(push, /setCalendarSyncState|calendarSyncStorage/);
});

test('final Calendar lock: Google Hub exposes durable sync as a read capability', async () => {
  const registry = await readText('src/services/googleCapabilityRegistry.ts');
  assert.match(registry, /id: 'sync', label: 'Sync now'/);
  assert.match(registry, /sync: \['calendar\.read'\]/);
});
