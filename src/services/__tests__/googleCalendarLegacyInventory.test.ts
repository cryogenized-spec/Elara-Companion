import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../../', import.meta.url);

async function read(path: string): Promise<string> {
  return readFile(new URL(path, repoRoot), 'utf8');
}

test('legacy Calendar implementation is confined to the expected compatibility surfaces', async () => {
  const settings = await read('src/components/SettingsModal.tsx');
  const googleApi = await read('src/lib/googleApi.ts');

  assert.match(settings, /getUpcomingCalendarEvents/);
  assert.match(settings, /CalendarEventItem/);
  assert.match(googleApi, /export async function getUpcomingCalendarEvents/);
  assert.match(googleApi, /export async function createCalendarEvent/);
  assert.match(googleApi, /case ['\"]get_calendar_events['\"]:/);
});

test('new Calendar service and contract remain independent of the legacy provider module', async () => {
  const service = await read('src/services/googleCalendarService.ts');
  const implementations = await read('src/contracts/implementations.ts');

  assert.doesNotMatch(service, /from ['\"].*googleApi['\"]/);
  assert.match(service, /googleCalendarApi/);
  assert.match(implementations, /googleCalendarContract/);
  assert.match(implementations, /from ['\"].*googleCalendarService['\"]/);
});
