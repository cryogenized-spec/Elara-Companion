import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TEXT_PROCESSING_POLICY } from '../../constants/textProcessingPolicy';

describe('text-processing runtime policy', () => {
  it('contains the neutral transformation instructions', () => {
    assert.match(TEXT_PROCESSING_POLICY, /neutral, objective text-processing engine/i);
    assert.match(TEXT_PROCESSING_POLICY, /Do not evaluate the text morally/i);
    assert.match(TEXT_PROCESSING_POLICY, /pre-existing, fictional, or administrative string data/i);
  });
});
