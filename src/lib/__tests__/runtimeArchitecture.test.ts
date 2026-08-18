import { strict as assert } from 'node:assert';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const APP_PATH = new URL('../../App.tsx', import.meta.url);

const LEGACY_MARKERS = [
  'Background Google Workspace Autonomous Sync Detection',
  'AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE TASKS',
  'AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE CALENDAR',
  'AUTONOMOUS BACKGROUND TOOL SYNC - GMAIL INBOX',
  'AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE CONTACTS',
  'AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE KEEP / ARCHIVE NOTES',
  'AUTONOMOUS BACKGROUND TOOL SYNC - GOOGLE DOCS',
];

test('chat runtime must not retain regex-triggered Google background prefetch', async () => {
  const source = await readFile(APP_PATH, 'utf8');
  const found = LEGACY_MARKERS.filter((marker) => source.includes(marker));
  assert.deepEqual(found, [], `Legacy Google prefetch markers remain in App.tsx: ${found.join(', ')}`);
});
