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
  adultFictionEnabled,
  adultFictionModule,
  activeModelId,
  uiSettingsSummary,
  userProfileNotes,
  activeScratchpad,
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
  activeScratchpad: string;
}): string {
  const timestamp = new Date().toLocaleString();
  const agentOperatingPolicy = loadAgentOperatingPolicy();

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

[SAVED USER PROFILE & MEMORY]
${userProfileNotes || '"No saved notes yet."'}

[WORKING SCRATCHPAD]
${activeScratchpad || '"Empty."'}
--- END SYSTEM PAYLOAD TEMPLATE ---`;
}
