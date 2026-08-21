import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem } from '../../types';
import { buildMemoryInsightSummary } from '../memoryInsights';

const memory: MemoryItem = {
  id: 'roof-1',
  content: 'User was painting the roof and was concerned about rain.',
  kind: 'observation',
  lifecycle: 'persistent',
  resolution: 'observation',
  state: 'active',
  source: 'conversation',
  confidence: 'likely',
  importance: 'normal',
  isPrivate: true,
  category: 'Home',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
  lastObservedAt: '2026-08-21T00:00:00.000Z',
  reinforcementCount: 2,
  evidenceCount: 3,
  evidenceMemoryIds: ['e1', 'e2'],
  sourceConversationId: 'conv-123',
  conflictMemoryIds: ['conflict-1'],
  supersedesMemoryId: 'older-1',
};

describe('memory insights', () => {
  it('explains why an observation exists and exposes evidence/provenance', () => {
    const insight = buildMemoryInsightSummary(memory);
    assert.match(insight.whySaved, /observation/i);
    assert.equal(insight.resolutionLabel, 'Observation');
    assert.equal(insight.stateLabel, 'Active');
    assert.match(insight.evidenceSummary, /3 supporting memory records/);
    assert.match(insight.provenanceSummary, /Conversation: conv-123/);
    assert.match(insight.relationshipSummary, /conflict:conflict-1/);
    assert.match(insight.relationshipSummary, /supersedes:older-1/);
  });

  it('uses stable defaults when additive metadata is absent', () => {
    const legacy = { ...memory, resolution: undefined, state: undefined, evidenceCount: undefined, evidenceMemoryIds: undefined, conflictMemoryIds: undefined, supersedesMemoryId: undefined };
    const insight = buildMemoryInsightSummary(legacy);
    assert.equal(insight.resolutionLabel, 'Contextual');
    assert.equal(insight.stateLabel, 'Active');
    assert.match(insight.evidenceSummary, /0 reinforcements/);
  });
});
