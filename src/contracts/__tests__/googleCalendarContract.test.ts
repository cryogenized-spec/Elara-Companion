import assert from 'node:assert/strict';
import test from 'node:test';
import { googleCalendarContract } from '../implementations';

test('calendar contract exposes canonical service operations', () => {
  assert.equal(typeof googleCalendarContract.getUpcoming, 'function');
  assert.equal(typeof googleCalendarContract.create, 'function');
});
