import { performance } from 'node:perf_hooks';
import type { MemoryItem } from '../src/types';
import { consolidateMemories, getConsolidationCandidateStats } from '../src/lib/memoryConsolidation';

const makeMemory = (index: number, mode: 'unique' | 'clustered'): MemoryItem => ({
  id: `bench-${mode}-${index}`,
  content: mode === 'clustered'
    ? `cluster${Math.floor(index / 50)} note${index % 50}`
    : `topic${index} detail${index} context${index}`,
  kind: 'observation',
  lifecycle: 'persistent',
  source: 'conversation',
  confidence: 'likely',
  importance: 'normal',
  isPrivate: true,
  category: 'Benchmark',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  resolution: 'observation',
  state: 'active',
});

const sizes = [100, 1000, 5000, 10000];

for (const size of sizes) {
  for (const mode of ['unique', 'clustered'] as const) {
    const memories = Array.from({ length: size }, (_, index) => makeMemory(index, mode));
    const statsStart = performance.now();
    const stats = getConsolidationCandidateStats(memories);
    const statsMs = performance.now() - statsStart;

    const consolidateStart = performance.now();
    consolidateMemories(memories, new Date('2026-08-21T00:00:00.000Z'));
    const consolidateMs = performance.now() - consolidateStart;

    console.log(JSON.stringify({
      size,
      mode,
      theoreticalPairs: stats.theoreticalPairCount,
      candidatePairs: stats.candidatePairCount,
      candidateReduction: stats.theoreticalPairCount === 0 ? 1 : 1 - (stats.candidatePairCount / stats.theoreticalPairCount),
      statsMs: Number(statsMs.toFixed(2)),
      consolidateMs: Number(consolidateMs.toFixed(2)),
    }));
  }
}
