import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ThoughtStep } from '../../types';

describe('thinking timeline UI contract', () => {
  const steps: ThoughtStep[] = [
    { id: '1', step_title: 'Understand request', summary: 'Reviewing the request.', timestamp: 1 },
    { id: '2', step_title: 'Check context', summary: 'Checking relevant context.', timestamp: 2 },
    { id: '3', step_title: 'Formulate response', summary: 'Preparing the final answer.', timestamp: 3 },
  ];

  it('preserves chronological thought order for numbered rendering', () => {
    assert.deepEqual(steps.map((step) => step.id), ['1', '2', '3']);
  });

  it('keeps user-facing titles separate from expandable summaries', () => {
    assert.equal(steps[1].step_title, 'Check context');
    assert.equal(steps[1].summary, 'Checking relevant context.');
  });
});
