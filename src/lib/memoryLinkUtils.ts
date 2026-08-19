import type { MemoryItem, MemoryLink } from '../types';

export function getMemoryProvenanceLinks(memory: MemoryItem): MemoryLink[] {
  const links: MemoryLink[] = [];
  const pushUnique = (link: MemoryLink) => {
    if (!link.id || links.some((existing) => existing.type === link.type && existing.id === link.id)) return;
    links.push(link);
  };

  if (memory.sourceConversationId) pushUnique({ type: 'conversation', id: memory.sourceConversationId, label: 'Source conversation' });
  if (memory.sourceArtifactId) pushUnique({ type: 'artifact', id: memory.sourceArtifactId, label: 'Source artifact' });
  for (const link of memory.links || []) pushUnique(link);
  return links;
}
