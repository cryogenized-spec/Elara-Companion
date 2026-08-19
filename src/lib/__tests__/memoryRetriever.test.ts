import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem, MemoryScratchpadState } from '../../types';
import { retrieveRelevantMemories, scoreMemory } from '../memoryRetriever';

const baseMemory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: 'memory-1',
  content: 'Gareth is building the Elara project.',
  kind: 'project',
  lifecycle: 'persistent',
  source: 'conversation',
  confidence: 'certain',
  importance: 'normal',
  isPrivate: true,
  category: 'Projects',
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
  pinned: false,
  tags: ['Elara', 'coding'],
  reinforcementCount: 0,
  ...overrides,
});

const state = (...memories: MemoryItem[]): MemoryScratchpadState => ({
  memories,
  autoMaintenanceEnabled: true,
  schemaVersion: 2,
});

describe('context-aware memory retrieval', () => {
  it('never retrieves archived memories', () => {
    const memories = retrieveRelevantMemories(
      state(
        baseMemory({ id: 'archived', lifecycle: 'archived', content: 'Elara project archived note' }),
        baseMemory({ id: 'active', content: 'Elara project active note' }),
      ),
      'Elara project',
    );

    assert.ok(memories.some((memory) => memory.id === 'active'));
    assert.ok(!memories.some((memory) => memory.id === 'archived'));
  });

  it('retains core or pinned memory in ready state', () => {
    const memories = retrieveRelevantMemories(
      state(
        baseMemory({ id: 'core', importance: 'core', lifecycle: 'core', content: 'Gareth is the creator of Elara.' }),
        baseMemory({ id: 'relevant', content: 'The current task is Canvas refinement.' }),
      ),
      'Canvas refinement',
    );

    assert.equal(memories[0].id, 'core');
  });

  it('boosts project taxonomy for project-oriented queries', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const project = baseMemory({ id: 'project', kind: 'project', category: 'Projects', content: 'A general long-term note.' });
    const generic = baseMemory({ id: 'generic', kind: 'observation', category: 'Observations', content: 'A general long-term note.' });
    const queryTokens = new Set(['project', 'feature']);

    assert.ok(scoreMemory(project, queryTokens, 'project feature', ['project'], now) > scoreMemory(generic, queryTokens, 'project feature', ['project'], now));
  });

  it('uses reinforcement to strengthen repeatedly useful memories', () => {
    const now = new Date('2026-08-19T00:00:00.000Z');
    const query = new Set(['elara', 'project']);
    const lightlyReinforced = baseMemory({ reinforcementCount: 0, updatedAt: '2026-08-15T00:00:00.000Z' });
    const reinforced = baseMemory({ reinforcementCount: 5, updatedAt: '2026-08-15T00:00:00.000Z' });

    assert.ok(scoreMemory(reinforced, query, 'Elara project', ['elara', 'project'], now) > scoreMemory(lightlyReinforced, query, 'Elara project', ['elara', 'project'], now));
  });

  it('uses a diversity cap before filling remaining slots', () => {
    const memories = retrieveRelevantMemories(
      state(
        baseMemory({ id: 'a', content: 'Elara project alpha', category: 'Projects' }),
        baseMemory({ id: 'b', content: 'Elara project beta', category: 'Projects' }),
        baseMemory({ id: 'c', content: 'Elara project gamma', category: 'Projects' }),
        baseMemory({ id: 'd', content: 'Elara preference for concise project notes', kind: 'preference', category: 'Preferences' }),
      ),
      'Elara project',
      '',
      4,
    );

    assert.ok(memories.length >= 2);
    assert.ok(memories.filter((memory) => memory.category === 'Preferences').length >= 1);
  });
});
