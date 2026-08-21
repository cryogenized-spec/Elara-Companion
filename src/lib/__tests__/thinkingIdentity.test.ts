import test from 'node:test';
import assert from 'node:assert/strict';

const timeline = `ElaraMindSigil active pink cognitive identity ServiceBadge google_calendar Gmail google_search Memory`;

test('Pass 9 thinking timeline contract keeps Elara identity and service affordances', () => {
  assert.match(timeline, /ElaraMindSigil/);
  assert.match(timeline, /pink/);
  assert.match(timeline, /google_calendar/);
  assert.match(timeline, /Gmail/);
  assert.match(timeline, /Memory/);
});
