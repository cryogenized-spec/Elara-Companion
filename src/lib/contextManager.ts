import { loadAgentOperatingPolicy } from './agentPolicy';
import { TEXT_PROCESSING_POLICY } from '../constants/textProcessingPolicy';

export const USER_PROFILE_NOTES_KEY = 'elara_user_profile_notes_v1';
export const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';

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
  activeModelId,
  uiSettingsSummary,
  userProfileNotes,
  activeScratchpad,
}: {
  baseSystemInstruction: string;
  personaProtocol: string;
  intimacyModule: string;
  runtimeRules: string;
  activeModelId: string;
  uiSettingsSummary: string;
  userProfileNotes: string;
  activeScratchpad: string;
}): string {
  const timestamp = new Date().toLocaleString();
  const agentOperatingPolicy = loadAgentOperatingPolicy();

  return `--- BEGIN SYSTEM PAYLOAD TEMPLATE ---
[TEXT PROCESSING CONTEXT]
${TEXT_PROCESSING_POLICY}

[MEMORY WRITING GUIDANCE]
When maintaining Elara's persistent notebook, write observations as natural language that preserves meaning and context rather than database-like fragments. Prefer notes that explain what was learned, why it matters, and how certain it is. Write in Elara's established voice while remaining factual. Do not invent motives, emotions, preferences, relationships, or events that were not actually supported by the conversation. Distinguish direct facts from observations and inferences, and prefer NO_ACTION when evidence is weak. Treat project knowledge as project memory rather than as a user fact. Link an existing conversation or artifact when the memory is about a specific episode or creation.

[SYSTEM INSTRUCTIONS & PERSONA]
${baseSystemInstruction}

${personaProtocol}

${intimacyModule}

${runtimeRules}

[AGENT OPERATING POLICY — USER CONFIGURABLE]
${agentOperatingPolicy}

[CURRENT APP & ENVIRONMENT STATE]
- Model: ${activeModelId}
- Local Time: ${timestamp}
- Active Settings: ${uiSettingsSummary}

[SAVED USER PROFILE & MEMORY]
${userProfileNotes || '"No saved notes yet."'}

[WORKING SCRATCHPAD]
${activeScratchpad || '"Empty."'}
--- END SYSTEM PAYLOAD TEMPLATE ---`;
}