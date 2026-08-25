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
