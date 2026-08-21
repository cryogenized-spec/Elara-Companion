import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timelinePath = path.join(root, 'src/components/ThinkingEventTimeline.tsx');
const sigilPath = path.join(root, 'src/components/ElaraMindSigil.tsx');

test('Thinking timeline uses the canonical Elara mind sigil and named services', () => {
  const timeline = fs.readFileSync(timelinePath, 'utf8');
  const sigil = fs.readFileSync(sigilPath, 'utf8');

  assert.match(timeline, /<ElaraMindSigil active=\{isStreaming\} size=\{24\} \/>/);
  assert.match(timeline, /case 'google_calendar': return 'Google Calendar'/);
  assert.match(timeline, /case 'gmail': return 'Gmail'/);
  assert.match(timeline, /case 'memory': return 'Memory'/);
  assert.match(sigil, /text-pink-400/);
  assert.match(sigil, /elara-sigil-motion/);
});
