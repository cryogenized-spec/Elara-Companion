import type { MemoryItem } from '../types';

export interface MemoryInsightSummary {
  whySaved: string;
  resolutionLabel: string;
  stateLabel: string;
  evidenceSummary: string;
  provenanceSummary: string;
  freshnessSummary: string;
  relationshipSummary: string;
}

const RESOLUTION_LABELS: Record<string, string> = {
  core: 'Core',
  contextual: 'Contextual',
  episodic: 'Episodic',
  observation: 'Observation',
  synthesized: 'Synthesized',
};

const STATE_LABELS: Record<string, string> = {
  active: 'Active',
  stale: 'Stale',
  archived: 'Archived',
  superseded: 'Superseded',
  conflicted: 'Conflicted',
};

function formatDate(value?: string): string {
  if (!value) return 'Not recorded';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : 'Not recorded';
}

export function buildMemoryInsightSummary(memory: MemoryItem): MemoryInsightSummary {
  const resolution = memory.resolution || (memory.lifecycle === 'core' ? 'core' : 'contextual');
  const state = memory.state || (memory.lifecycle === 'archived' ? 'archived' : 'active');
  const evidenceCount = Math.max(memory.evidenceCount || 0, memory.evidenceMemoryIds?.length || 0);
  const reinforcementCount = memory.reinforcementCount || 0;

  let whySaved = 'Saved as useful conversational context.';
  if (resolution === 'observation') whySaved = 'Saved as a small observation that may become more useful if it is confirmed later.';
  if (resolution === 'core') whySaved = 'Kept as stable long-term information because it has been treated as durable and important.';
  if (resolution === 'synthesized') whySaved = 'Synthesized from repeated observations or episodes into a higher-level pattern.';
  if (resolution === 'episodic') whySaved = 'Retained as a recoverable event or episode rather than a permanent fact.';
  if (resolution === 'contextual') whySaved = 'Kept because it describes an ongoing project, circumstance, plan, interest, or concern.';

  const evidenceSummary = evidenceCount > 0
    ? `${evidenceCount} supporting memory record${evidenceCount === 1 ? '' : 's'}; ${reinforcementCount} reinforcement${reinforcementCount === 1 ? '' : 's'}.`
    : `${reinforcementCount} reinforcement${reinforcementCount === 1 ? '' : 's'}; no separate evidence records recorded.`;

  let provenanceSummary = 'Source not recorded.';
  if (memory.source === 'user') provenanceSummary = 'Entered directly by the user.';
  else if (memory.source === 'elara') provenanceSummary = 'Created by Elara.';
  else if (memory.source === 'conversation') provenanceSummary = 'Extracted from a conversation.';
  else if (memory.source === 'artifact') provenanceSummary = 'Derived from a workspace artifact.';
  else if (memory.source === 'system') provenanceSummary = 'Created by the application/system.';
  else if (memory.source === 'imported') provenanceSummary = 'Imported from another memory source.';

  if (memory.sourceConversationId) provenanceSummary += ` Conversation: ${memory.sourceConversationId}.`;
  if (memory.sourceArtifactId) provenanceSummary += ` Artifact: ${memory.sourceArtifactId}.`;

  const relationships = [
    ...(memory.relatedMemoryIds || []).map((id) => `related:${id}`),
    ...(memory.conflictMemoryIds || []).map((id) => `conflict:${id}`),
  ];
  if (memory.supersedesMemoryId) relationships.push(`supersedes:${memory.supersedesMemoryId}`);
  if (memory.supersededByMemoryId) relationships.push(`superseded-by:${memory.supersededByMemoryId}`);

  return {
    whySaved,
    resolutionLabel: RESOLUTION_LABELS[resolution] || 'Unknown',
    stateLabel: STATE_LABELS[state] || 'Unknown',
    evidenceSummary,
    provenanceSummary,
    freshnessSummary: `Created ${formatDate(memory.createdAt)} · updated ${formatDate(memory.updatedAt)}${memory.lastObservedAt ? ` · last observed ${formatDate(memory.lastObservedAt)}` : ''}${memory.lastRecalledAt ? ` · last recalled ${formatDate(memory.lastRecalledAt)}` : ''}`,
    relationshipSummary: relationships.length > 0 ? relationships.join(' · ') : 'No linked, conflicting, or superseding memories recorded.',
  };
}
