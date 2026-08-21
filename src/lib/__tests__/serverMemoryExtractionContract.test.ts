import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeObservationActions } from '../../../server/routes/memory';

describe('server memory extraction contract', () => {
  it('rejects destructive actions and forces observation metadata', () => {
    const result = sanitizeObservationActions({
      actions: [
        { type: 'DELETE', targetId: 'dangerous' },
        { type: 'MERGE', mergeTargetIds: ['a', 'b'] },
        {
          type: 'ADD',
          memory: {
            content: 'User mentioned working on a roof.',
            kind: 'preference',
            lifecycle: 'core',
            source: 'system',
            importance: 'core',
            confidence: 'certain',
            isPrivate: false,
            category: 'Home',
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

  it('accepts UPDATE only when an existing target is present', () => {
    const result = sanitizeObservationActions({
      actions: [
        { type: 'UPDATE', memory: { content: 'missing target' } },
        { type: 'UPDATE', targetId: 'mem-1', memory: { content: 'updated observation' } },
      ],
    });

    assert.equal(result.actions.length, 1);
    assert.equal(result.actions[0].type, 'UPDATE');
    assert.equal(result.actions[0].targetId, 'mem-1');
    assert.equal(result.actions[0].memory?.resolution, 'observation');
  });
});
