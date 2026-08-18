import { DEFAULT_AGENT_BEHAVIOR_POLICY } from '../constants/defaultAgentBehaviorPolicy';

export const USER_PROFILE_NOTES_KEY = 'elara_user_profile_notes_v1';
export const ACTIVE_SCRATCHPAD_KEY = 'elara_active_scratchpad_v1';
export const AGENT_BEHAVIOR_POLICY_RUNTIME_KEY = 'elara_agent_behavior_policy_runtime_v1';

export function loadUserProfileNotes(): string {
  try { return localStorage.getItem(USER_PROFILE_NOTES_KEY) || ''; } catch { return ''; }
}
export function saveUserProfileNotes(notes: string): void {
  try { localStorage.setItem(USER_PROFILE_NOTES_KEY, notes); } catch (e) { console.error('Failed to save user profile notes', e); }
}
export function appendUserProfileNotes(newNotes: string): void {
  const current = loadUserProfileNotes();
  saveUserProfileNotes(current ? `${current}\n${newNotes}` : newNotes);
}
export function clearUserProfileNotes(): void { try { localStorage.removeItem(USER_PROFILE_NOTES_KEY); } catch (e) { console.error('Failed to clear user profile notes', e); } }

export function loadActiveScratchpad(): string {
  try { return localStorage.getItem(ACTIVE_SCRATCHPAD_KEY) || ''; } catch { return ''; }
}
export function saveActiveScratchpad(scratchpad: string): void {
  try { localStorage.setItem(ACTIVE_SCRATCHPAD_KEY, scratchpad); } catch (e) { console.error('Failed to save active scratchpad', e); }
}
export function appendActiveScratchpad(newNotes: string): void {
  const current = loadActiveScratchpad();
  saveActiveScratchpad(current ? `${current}\n${newNotes}` : newNotes);
}
export function clearActiveScratchpad(): void { try { localStorage.removeItem(ACTIVE_SCRATCHPAD_KEY); } catch (e) { console.error('Failed to clear active scratchpad', e); } }

export function loadAgentBehaviorPolicy(): string {
  try { return localStorage.getItem(AGENT_BEHAVIOR_POLICY_RUNTIME_KEY)?.trim() || DEFAULT_AGENT_BEHAVIOR_POLICY; }
  catch { return DEFAULT_AGENT_BEHAVIOR_POLICY; }
}

export function saveAgentBehaviorPolicyRuntime(policy: string): void {
  try { localStorage.setItem(AGENT_BEHAVIOR_POLICY_RUNTIME_KEY, policy?.trim() || DEFAULT_AGENT_BEHAVIOR_POLICY); }
  catch (e) { console.error('Failed to mirror agent behavior policy', e); }
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
  const agentBehaviorPolicy = loadAgentBehaviorPolicy();

  return `--- BEGIN SYSTEM PAYLOAD TEMPLATE ---
[SYSTEM INSTRUCTIONS & PERSONA]
${baseSystemInstruction}

${personaProtocol}

${intimacyModule}

${runtimeRules}

[AGENT OPERATING POLICY — USER CONFIGURABLE]
${agentBehaviorPolicy}

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
