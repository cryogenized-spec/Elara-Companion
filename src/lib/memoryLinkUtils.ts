import type { MemoryItem, MemoryLink } from '../types';

/** Build navigation links for a persisted memory without inventing provenance. */
export function getMemoryProvenanceLinks(memory: MemoryItem): MemoryLink[] {
  const links: MemoryLink[] = [];
  const push = (link: MemoryLink) => {
    if (!link.id) return;
    if (links.some((existing) => existing.type === link.type && existing.id === link.id)) return;
    links.push(link);
  };

  if (memory.sourceConversationId) {
    push({ type: 'conversation', id: memory.sourceConversationId, label: 'Source conversation' });
  }
  if (memory.sourceArtifactId) {
    push({ type: 'artifact', id: memory.sourceArtifactId, label: 'Source artifact' });
  }
  for (const link of memory.links || []) push(link);

  return links;
}
