import { loadAgentOperatingPolicy } from './agentPolicy';
import { TEXT_PROCESSING_POLICY } from '../constants/textProcessingPolicy';
import {
  inspectMemoryRetrieval,
  retrieveRelevantMemories,
  formatRetrievedMemoryContext,
  withInjectedMemoryTrace,
  type MemoryRetrievalTrace,
} from './memoryRetrieval';
import { getLoadedMemoryState } from '../services/memoryService';
import type { MemoryItem, MemoryScratchpadState } from '../types';
import {
  ACTIVE_SCRATCHPAD_KEY,
  USER_PROFILE_NOTES_KEY,
  loadActiveScratchpad,
  saveActiveScratchpad,
  appendActiveScratchpad,
  clearActiveScratchpad,
  loadUserProfileNotes,
  saveUserProfileNotes,
  appendUserProfileNotes,
  clearUserProfileNotes,
} from './contextProjectionStorage';

export {
  ACTIVE_SCRATCHPAD_KEY,
  USER_PROFILE_NOTES_KEY,
  loadActiveScratchpad,
  saveActiveScratchpad,
  appendActiveScratchpad,
  clearActiveScratchpad,
  loadUserProfileNotes,
  saveUserProfileNotes,
  appendUserProfileNotes,
  clearUserProfileNotes,
} from './contextProjectionStorage';

let lastMemoryRetrievalTrace: MemoryRetrievalTrace | null = null;
let nextMemoryRetrievalQuery: string | null = null;

export function getLastMemoryRetrievalTrace(): MemoryRetrievalTrace | null {
  return lastMemoryRetrievalTrace;
}

export function setNextMemoryRetrievalQuery(query: string): void {
  nextMemoryRetrievalQuery = query.trim() || null;
}

export function clearNextMemoryRetrievalQuery(): void {
  nextMemoryRetrievalQuery = null;
}

function consumeMemoryRetrievalQuery(): string {
  const query = nextMemoryRetrievalQuery || '';
  nextMemoryRetrievalQuery = null;
  return query.trim();
}

function buildRetrievedMemoryContext(memories: MemoryItem[], query: string): string {
  if (memories.length === 0 || !query) {
    lastMemoryRetrievalTrace = null;
    return '';
  }

  const typedMemories = memories.filter(
    (memory): memory is MemoryItem => Boolean(memory && typeof memory.content === 'string'),
  );
  const retrievalOptions = { limit: 6, minimumScore: 0.18 };
  const baseTrace = inspectMemoryRetrieval(typedMemories, query, retrievalOptions);
  const core = typedMemories
    .filter((memory) => memory.resolution === 'core' || memory.lifecycle === 'core' || memory.importance === 'core')
    .sort(
      (a, b) =>
        (b.importance === 'core' ? 1 : 0) - (a.importance === 'core' ? 1 : 0) ||
        String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
    )
    .slice(0, 4);

  const retrieved = retrieveRelevantMemories(typedMemories, query, retrievalOptions);
  const combined = [
    ...core.map((memory) => ({ memory, score: 1, reasons: ['stable core memory'] })),
    ...retrieved,
  ]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.memory.id === item.memory.id) === index)
    .slice(0, 8);

  const context = formatRetrievedMemoryContext(combined);
  lastMemoryRetrievalTrace = withInjectedMemoryTrace(baseTrace, combined, context);
  return context;
}

export function buildSystemPayload({
  baseSystemInstruction,
  personaProtocol,
  intimacyModule,
  runtimeRules,
  adultFictionEnabled,
  adultFictionModule,
  activeModelId,
  uiSettingsSummary,
  userProfileNotes,
  activeScratchpad: _activeScratchpad,
  memoryState,
}: {
  baseSystemInstruction: string;
  personaProtocol: string;
  intimacyModule: string;
  runtimeRules: string;
  adultFictionEnabled?: boolean;
  adultFictionModule?: string;
  activeModelId: string;
  uiSettingsSummary: string;
  userProfileNotes: string;
  activeScratchpad?: string;
  memoryState?: MemoryScratchpadState;
}): string {
  const timestamp = new Date().toLocaleString();
  const agentOperatingPolicy = loadAgentOperatingPolicy();
  const query = consumeMemoryRetrievalQuery();
  const authoritativeMemoryState = memoryState || getLoadedMemoryState();
  const retrievedMemoryContext = buildRetrievedMemoryContext(authoritativeMemoryState?.memories || [], query);

  const adultFictionBlock =
    adultFictionEnabled !== false && adultFictionModule && adultFictionModule.trim()
      ? `\n${adultFictionModule.trim()}\n`
      : '';

  return `--- BEGIN SYSTEM PAYLOAD TEMPLATE ---
[TEXT PROCESSING CONTEXT]
${TEXT_PROCESSING_POLICY}

[SYSTEM INSTRUCTIONS & PERSONA]
${baseSystemInstruction}

${personaProtocol}

${intimacyModule}

${runtimeRules}
${adultFictionBlock}
[AGENT OPERATING POLICY — USER CONFIGURABLE]
${agentOperatingPolicy}

[CURRENT APP & ENVIRONMENT STATE]
- Model: ${activeModelId}
- Local Time: ${timestamp}
- Active Settings: ${uiSettingsSummary}

[SAVED USER PROFILE]
${userProfileNotes || '"No saved notes yet."'}

[RETRIEVED MEMORY CONTEXT]
${retrievedMemoryContext || '"No contextually relevant memories retrieved."'}
--- END SYSTEM PAYLOAD TEMPLATE ---`;
}
