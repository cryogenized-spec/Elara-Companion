import type { MemoryItem, MemoryLink } from '../types';

export interface MemoryLinkContext {
  conversationId?: string;
  conversationLabel?: string;
  artifactIds?: string[];
  artifactLabels?: Record<string, string>;
}

export function normalizeMemoryLinks(memory: Pick<MemoryItem, 'links' | 'sourceConversationId' | 'sourceArtifactId'>): MemoryLink[] {
  const links = new Map<string, MemoryLink>();

  for (const link of memory.links || []) {
    if (!link || !link.id || !['conversation', 'artifact', 'memory'].includes(link.type)) continue;
    links.set(`${link.type}:${link.id}`, { type: link.type, id: link.id, label: link.label });
  }

  if (memory.sourceConversationId) {
    links.set(`conversation:${memory.sourceConversationId}`, {
      type: 'conversation',
      id: memory.sourceConversationId,
    });
  }

  if (memory.sourceArtifactId) {
    links.set(`artifact:${memory.sourceArtifactId}`, {
      type: 'artifact',
      id: memory.sourceArtifactId,
    });
  }

  return [...links.values()];
}

export function buildMemoryLinks(context: MemoryLinkContext): MemoryLink[] {
  const links: MemoryLink[] = [];

  if (context.conversationId) {
    links.push({ type: 'conversation', id: context.conversationId, label: context.conversationLabel });
  }

  for (const artifactId of context.artifactIds || []) {
    links.push({
      type: 'artifact',
      id: artifactId,
      label: context.artifactLabels?.[artifactId],
    });
  }

  return links.filter((link) => Boolean(link.id));
}

export function getMemoryLinks(memory: MemoryItem, type?: MemoryLink['type']): MemoryLink[] {
  return normalizeMemoryLinks(memory).filter((link) => !type || link.type === type);
}

export function memoriesLinkedTo(
  memories: MemoryItem[],
  linkType: MemoryLink['type'],
  linkId: string,
): MemoryItem[] {
  if (!linkId) return [];
  return memories.filter((memory) =>
    getMemoryLinks(memory, linkType).some((link) => link.id === linkId),
  );
}
