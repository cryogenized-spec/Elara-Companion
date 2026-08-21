import { loadAgentOperatingPolicy } from './agentPolicy';
import { TEXT_PROCESSING_POLICY } from '../constants/textProcessingPolicy';
import { retrieveRelevantMemories, formatRetrievedMemoryContext } from './memoryRetrieval';

export const USER_PROFILE_NOTES_KEY = 'elara_user_profile_notes_v1';
export const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';
export const MEMORY_CONTEXT_MIRROR_KEY = 'elara_memory_context_mirror_v3';

function getStructuredMemoryMirror(): any[] {
  try {
    const raw = localStorage.getItem(MEMORY_CONTEXT_MIRROR_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.memories) ? parsed.memories : [];
  } catch {
    return [];
  }
}

function getLiveRetrievalQuery(): string {
  try {
    const active = document.activeElement;
    if (active instanceof HTMLTextAreaElement && active.value.trim()) return active.value.trim();
    const textarea = document.querySelector('textarea');
    return textarea?.value?.trim() || '';
  } catch {
    return '';
  }
}

function buildRetrievedMemoryContext(): string {
  const memories = getStructuredMemoryMirror();
  const query = getLiveRetrievalQuery();
  if (memories.length === 0 || !query) return '';

  const typedMemories = memories.filter((memory) => memory && typeof memory === 'object' && typeof memory.content === 'string');
  const core = typedMemories
    .filter((memory) => memory.resolution === 'core' || memory.lifecycle === 'core' || memory.importance === 'core')
    .sort((a, b) => (b.importance === 'core' ? 1 : 0) - (a.importance === 'core' ? 1 : 0) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .slice(0, 4);

  const retrieved = retrieveRelevantMemories(typedMemories as any, query, {
    limit: 6,
    minimumScore: 0.18,
  });

  const combined = [...core.map((memory) => ({ memory, score: 1, reasons: ['stable core memory'] })), ...retrieved]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.memory.id === item.memory.id) === index)
    .slice(0, 8);

  return formatRetrievedMemoryContext(combined);
}

export function loadUserProfileNotes(): string {
  try {
    return localStorage.getItem(USER_PROFILE_NOTES_KEY) || '';
  } catch {
    return '';
  }
}

export function saveUserProfileNotes(notes: string): void {
  try {
    localStorage.setItem(USER_PROFILE_NOTES_KEY, notes);
  } catch (e) {
    console.error('Failed to save user profile notes', e);
  }
}

export function appendUserProfileNotes(newNotes: string): void {
  const current = loadUserProfileNotes();
  saveUserProfileNotes(current ? `${current}\n${newNotes}` : newNotes);
}

export function clearUserProfileNotes(): void {
  try {
    localStorage.removeItem(USER_PROFILE_NOTES_KEY);
  } catch (e) {
    console.error('Failed to clear user profile notes', e);
  }
}

export function loadActiveScratchpad(): string {
  try {
    return localStorage.getItem(ACTIVE_SCRATCHPAD_KEY) || '';
  } catch {
    return '';
  }
}

export function saveActiveScratchpad(scratchpad: string): void {
  try {
    localStorage.setItem(ACTIVE_SCRATCHPAD_KEY, scratchpad);
  } catch (e) {
    console.error('Failed to save active scratchpad', e);
  }
}

export function appendActiveScratchpad(newNotes: string): void {
  const current = loadActiveScratchpad();
  saveActiveScratchpad(current ? `${current}\n${newNotes}` : newNotes);
}

export function clearActiveScratchpad(): void {
  try {
    localStorage.removeItem(ACTIVE_SCRATCHPAD_KEY);
  } catch (e) {
    console.error('Failed to clear active scratchpad', e);
  }
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
}): string {
  const timestamp = new Date().toLocaleString();
  const agentOperatingPolicy = loadAgentOperatingPolicy();
  const retrievedMemoryContext = buildRetrievedMemoryContext();

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
