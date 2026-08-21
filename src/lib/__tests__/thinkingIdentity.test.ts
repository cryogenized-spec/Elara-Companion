import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const timelinePath = path.join(root, 'src/components/ThinkingEventTimeline.tsx');
const sigilPath = path.join(root, 'src/components/ElaraMindSigil.tsx');

test('Pass 9 thinking timeline keeps Elara identity and service affordances', () => {
  const timeline = fs.readFileSync(timelinePath, 'utf8');
  const sigil = fs.readFileSync(sigilPath, 'utf8');

  assert.match(timeline, /<ElaraMindSigil active=\{isStreaming\} size=\{22\} \/>/);
  assert.match(timeline, /Google Calendar/);
  assert.match(timeline, /Gmail/);
  assert.match(timeline, /Memory/);
  assert.match(sigil, /text-pink-400/);
  assert.match(sigil, /animate-\[spin_5s_linear_infinite\]/);
});
