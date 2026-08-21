import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MemoryItem } from '../../types';
import { formatRetrievedMemoryContext, retrieveRelevantMemories } from '../memoryRetrieval';

const makeMemory = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({ id: 'm1', content: 'The user is working on the roof repair project.', kind: 'project', lifecycle: 'contextual', source: 'conversation', confidence: 'certain', importance: 'normal', isPrivate: true, category: 'Projects', createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z', pinned: false, resolution: 'contextual', state: 'active', reinforcementCount: 0, evidenceCount: 1, ...overrides });

describe('memory retrieval', () => {
  it('ranks semantically relevant memories above unrelated memories', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'roof', content: 'The user is painting the roof and watching the weather.', tags: ['roof', 'weather'] }), makeMemory({ id: 'music', content: 'The user recently listened to a jazz album.', category: 'Experiences' })], 'What was Gareth worried about with the roof?', { now: new Date('2026-08-21T00:00:00.000Z') });
    assert.equal(results[0].memory.id, 'roof');
  });
  it('uses recency and importance to break otherwise similar ties', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'old', content: 'The user likes this project.', updatedAt: '2026-01-01T00:00:00.000Z', importance: 'normal' }), makeMemory({ id: 'recent', content: 'The user likes this project.', updatedAt: '2026-08-20T00:00:00.000Z', importance: 'important' })], 'Tell me about this project.', { now: new Date('2026-08-21T00:00:00.000Z') });
    assert.equal(results[0].memory.id, 'recent');
  });
  it('uses memory id as the final deterministic tie-breaker', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'b', content: 'The user likes this project.', updatedAt: '2026-08-20T00:00:00.000Z' }), makeMemory({ id: 'a', content: 'The user likes this project.', updatedAt: '2026-08-20T00:00:00.000Z' })], 'Tell me about this project.', { now: new Date('2026-08-21T00:00:00.000Z') });
    assert.deepEqual(results.map((result) => result.memory.id), ['a', 'b']);
  });
  it('boosts a matching project relationship', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'linked', content: 'A general note about repairs.', sourceArtifactId: 'project-42' }), makeMemory({ id: 'unlinked', content: 'A more similar note about repairs.' })], 'repair work', { projectId: 'project-42' });
    assert.equal(results[0].memory.id, 'linked');
  });
  it('filters archived, superseded, and conflicted memories by default', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'archived', state: 'archived' }), makeMemory({ id: 'superseded', state: 'superseded' }), makeMemory({ id: 'conflicted', state: 'conflicted' }), makeMemory({ id: 'active', content: 'The user is working on the roof repair project.' })], 'roof repair');
    assert.deepEqual(results.map((result) => result.memory.id), ['active']);
  });
  it('respects the result limit and formats the ranked context', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'a', content: 'roof repair work' }), makeMemory({ id: 'b', content: 'roof maintenance work' }), makeMemory({ id: 'c', content: 'roof inspection work' })], 'roof work', { limit: 2 });
    assert.equal(results.length, 2); assert.match(formatRetrievedMemoryContext(results), /relevance/); assert.equal(formatRetrievedMemoryContext([]), '');
  });
  it('caps the formatted context even when memory content is very large', () => {
    const results = retrieveRelevantMemories([makeMemory({ id: 'long', content: 'roof '.repeat(5000) })], 'roof', { minimumScore: 0 });
    const formatted = formatRetrievedMemoryContext(results, 600);
    assert.ok(formatted.length <= 600); assert.match(formatted, /relevance/);
  });
});
