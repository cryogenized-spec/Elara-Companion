import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GEMINI_MODEL_PROFILES } from '../modelRegistry';
import { discoverGeminiModels } from '../modelDiscovery';

describe('Gemini model discovery', () => {
  it('does not expose duplicate model IDs when API discovery is unavailable', async () => {
    const models = await discoverGeminiModels('');
    const ids = models.map((model) => model.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(ids, GEMINI_MODEL_PROFILES.map((model) => model.id));
  });
});
