import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../../', import.meta.url);

async function read(path: string): Promise<string> {
  return readFile(new URL(path, repoRoot), 'utf8');
}

test('legacy Calendar implementation has been removed from the compatibility module and Settings', async () => {
  const settings = await read('src/components/SettingsModal.tsx');
  const googleApi = await read('src/lib/googleApi.ts');

  assert.doesNotMatch(settings, /from ['\"]\.\.\/lib\/googleApi['\"]/);
  assert.doesNotMatch(settings, /googleCalendarContract/);
  assert.doesNotMatch(settings, /CalendarEventItem/);
  assert.match(settings, /getUpcomingCalendarEvents/);
  assert.doesNotMatch(googleApi, /export async function getUpcomingCalendarEvents/);
  assert.doesNotMatch(googleApi, /export async function createCalendarEvent/);
  assert.doesNotMatch(googleApi, /case ['\"]get_calendar_events['\"]:/);
});

test('new Calendar service and contract remain independent of the legacy provider module', async () => {
  const service = await read('src/services/googleCalendarService.ts');
  const implementations = await read('src/contracts/implementations.ts');

  assert.doesNotMatch(service, /from ['\"].*googleApi['\"]/);
  assert.match(service, /googleCalendarApi/);
  assert.match(implementations, /googleCalendarContract/);
  assert.match(implementations, /from ['\"].*googleCalendarService['\"]/);
});
