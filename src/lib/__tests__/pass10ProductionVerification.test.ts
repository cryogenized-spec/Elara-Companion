import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeObservationActions } from '../../../server/routes/memory';

describe('Pass 10 production verification contract', () => {
  it('keeps destructive and direct-promotion memory actions out of the server adapter', () => {
    const result = sanitizeObservationActions({
      actions: [
        { type: 'DELETE', targetId: 'mem_1' },
        { type: 'MERGE', targetId: 'mem_2' },
        {
          type: 'CREATE',
          memory: {
            content: 'User mentioned a current project.',
            kind: 'fact',
            lifecycle: 'core',
            source: 'system',
            category: 'User',
            importance: 'core',
            confidence: 'certain',
            isPrivate: false,
          },
        },
      ],
    });

    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].type, 'CREATE');
    assert.equal(result.actions[0].memory?.resolution, 'observation');
    assert.equal(result.actions[0].memory?.state, 'active');
    assert.equal(result.actions[0].memory?.lifecycle, 'contextual');
    assert.equal(result.actions[0].memory?.importance, 'normal');
    assert.equal(result.actions[0].memory?.source, 'conversation');
    assert.equal(result.actions[0].memory?.isPrivate, true);
  });
});
