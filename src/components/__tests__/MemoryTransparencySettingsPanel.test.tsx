import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem } from '../../types';
import {
  MEMORY_TRANSPARENCY_READ_OPTIONS,
  countMemoryResolutions,
  getMemoryResolution,
} from '../MemoryTransparencySettingsPanel';

const memory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: `mem-${Math.random()}`,
  content: 'Memory',
  kind: 'fact',
  lifecycle: 'persistent',
  confidence: 'certain',
  importance: 'normal',
  isPrivate: true,
  category: 'User',
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  ...overrides,
});

describe('memory transparency inspection boundary', () => {
  it('disables maintenance and derived projection writes', () => {
    assert.deepEqual(MEMORY_TRANSPARENCY_READ_OPTIONS, {
      runMaintenance: false,
      updateProjections: false,
    });
  });

  it('classifies legacy memories into a stable hierarchy', () => {
    assert.equal(getMemoryResolution(memory({ lifecycle: 'core', importance: 'core' })), 'core');
    assert.equal(getMemoryResolution(memory({ kind: 'observation' })), 'observation');
    assert.equal(getMemoryResolution(memory({ kind: 'episode' })), 'episodic');
    assert.equal(getMemoryResolution(memory({ kind: 'fact' })), 'contextual');
  });

  it('counts every resolution and preserves the all-memory total', () => {
    const counts = countMemoryResolutions([
      memory({ resolution: 'core' }),
      memory({ resolution: 'contextual' }),
      memory({ resolution: 'contextual' }),
      memory({ resolution: 'episodic' }),
      memory({ resolution: 'observation' }),
      memory({ resolution: 'synthesized' }),
    ]);
    assert.equal(counts.all, 6);
    assert.equal(counts.core, 1);
    assert.equal(counts.contextual, 2);
    assert.equal(counts.episodic, 1);
    assert.equal(counts.observation, 1);
    assert.equal(counts.synthesized, 1);
  });
});
