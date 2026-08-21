import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clearLiveThinkingStream, getLiveThinkingEvents, syncLiveThoughtSteps } from '../thinkingLiveRuntime';

describe('live thinking runtime bridge', () => {
  it('keeps only the latest active thought event while preserving canonical ordering', () => {
    clearLiveThinkingStream();
    const first = syncLiveThoughtSteps([
      { id: 'a', step_title: 'Understand request', summary: 'Reading the request.', timestamp: 1 },
    ]);
    const second = syncLiveThoughtSteps([
      { id: 'a', step_title: 'Understand request', summary: 'Reading the request carefully.', timestamp: 2 },
      { id: 'b', step_title: 'Formulate response', summary: 'Preparing the response.', timestamp: 3 },
    ]);

    assert.equal(first.length, 1);
    assert.equal(second.length, 2);
    assert.equal(second[0].type, 'thought');
    assert.equal(second[0].summary, 'Preparing the response.');
    assert.equal(second[0].sequence, 1);
    assert.equal(second[1].sequence, 2);
    assert.deepEqual(getLiveThinkingEvents().map((event) => event.sequence), [1, 2]);
  });
});
