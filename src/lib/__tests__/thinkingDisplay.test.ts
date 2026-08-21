import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_THINKING_DISPLAY_MODE } from '../thinkingDisplay';

test('thinking display defaults to summaries', () => {
  assert.equal(DEFAULT_THINKING_DISPLAY_MODE, 'summaries');
});
