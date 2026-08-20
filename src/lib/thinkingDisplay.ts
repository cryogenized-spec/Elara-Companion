export type ThinkingDisplayMode = 'off' | 'steps' | 'summaries';

const THINKING_DISPLAY_KEY = 'elara_thinking_display_mode_v1';
export const THINKING_DISPLAY_EVENT = 'elara:thinking-display-changed';
export const DEFAULT_THINKING_DISPLAY_MODE: ThinkingDisplayMode = 'summaries';

export function loadThinkingDisplayMode(): ThinkingDisplayMode {
  try {
    const stored = localStorage.getItem(THINKING_DISPLAY_KEY);
    return stored === 'off' || stored === 'steps' || stored === 'summaries'
      ? stored
      : DEFAULT_THINKING_DISPLAY_MODE;
  } catch {
    return DEFAULT_THINKING_DISPLAY_MODE;
  }
}

export function saveThinkingDisplayMode(mode: ThinkingDisplayMode): void {
  try {
    localStorage.setItem(THINKING_DISPLAY_KEY, mode);
    window.dispatchEvent(new CustomEvent(THINKING_DISPLAY_EVENT, { detail: { mode } }));
  } catch (error) {
    console.warn('Unable to persist thinking display preference:', error);
  }
}
