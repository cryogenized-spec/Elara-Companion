const VIEWPORT_HEIGHT_VAR = '--elara-viewport-height';
const VIEWPORT_SYNC_EVENT = 'elara:mobile-viewport-sync';
const RESUME_SETTLE_DELAYS_MS = [0, 120, 350, 700] as const;
const EDITABLE_SELECTOR = 'textarea, input, [contenteditable="true"]';

function getEditableElement(): HTMLElement | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  return active.matches(EDITABLE_SELECTOR) ? active : null;
}

function scrollActiveEditorIntoView(): void {
  const editor = getEditableElement();
  if (!editor) return;
  try {
    editor.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch {
    // Some Android WebView implementations can reject scrollIntoView during IME transitions.
  }
}

export function installMobileViewportSync(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const resumeTimers: number[] = [];

  const update = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${Math.round(height)}px`);
    window.dispatchEvent(new CustomEvent(VIEWPORT_SYNC_EVENT));
  };

  const clearResumeTimers = () => {
    while (resumeTimers.length > 0) {
      const timer = resumeTimers.pop();
      if (timer === undefined) continue;
      if (timer < 0) window.cancelAnimationFrame(Math.abs(timer));
      else window.clearTimeout(timer);
    }
  };

  const scheduleResumeSync = () => {
    clearResumeTimers();
    update();

    const frame = window.requestAnimationFrame(() => {
      update();
      scrollActiveEditorIntoView();
    });
    resumeTimers.push(-frame);

    for (const delay of RESUME_SETTLE_DELAYS_MS.slice(1)) {
      const timer = window.setTimeout(() => {
        update();
        scrollActiveEditorIntoView();
      }, delay);
      resumeTimers.push(timer);
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const activeEditor = getEditableElement();
      activeEditor?.blur();
      clearResumeTimers();
      return;
    }
    scheduleResumeSync();
  };

  const handlePageShow = () => scheduleResumeSync();
  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(EDITABLE_SELECTOR)) return;
    window.setTimeout(() => {
      update();
      scrollActiveEditorIntoView();
    }, 0);
  };

  update();
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('focusin', handleFocusIn);
  window.addEventListener('pageshow', handlePageShow);

  return () => {
    clearResumeTimers();
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('focusin', handleFocusIn);
    window.removeEventListener('pageshow', handlePageShow);
  };
}

export const ELARA_MOBILE_VIEWPORT_SYNC_EVENT = VIEWPORT_SYNC_EVENT;
