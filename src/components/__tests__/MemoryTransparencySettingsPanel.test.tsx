import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MEMORY_TRANSPARENCY_READ_OPTIONS } from '../MemoryTransparencySettingsPanel';

describe('memory transparency inspection boundary', () => {
  it('disables maintenance and derived projection writes', () => {
    assert.deepEqual(MEMORY_TRANSPARENCY_READ_OPTIONS, {
      runMaintenance: false,
      updateProjections: false,
    });
  });
});
