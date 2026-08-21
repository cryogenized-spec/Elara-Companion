const VIEWPORT_HEIGHT_VAR = '--elara-viewport-height';
const RESUME_SETTLE_DELAYS_MS = [0, 120, 350, 700] as const;

export function installMobileViewportSync(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let resumeTimers: number[] = [];

  const update = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${Math.round(height)}px`);
  };

  const isEditableElement = (element: Element | null): element is HTMLElement => {
    return element instanceof HTMLElement && element.matches('textarea, input, [contenteditable="true"]');
  };

  const blurActiveEditor = () => {
    const activeElement = document.activeElement;
    if (!isEditableElement(activeElement)) return;
    activeElement.blur();
  };

  const scrollActiveEditorIntoView = () => {
    const activeElement = document.activeElement;
    if (!isEditableElement(activeElement)) return;

    activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  };

  const clearResumeTimers = () => {
    resumeTimers.forEach((timer) => window.clearTimeout(timer));
    resumeTimers = [];
  };

  const resyncAfterResume = () => {
    clearResumeTimers();
    update();

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(update);
      window.requestAnimationFrame(scrollActiveEditorIntoView);
    }

    resumeTimers = RESUME_SETTLE_DELAYS_MS
      .filter((delay) => delay > 0)
      .map((delay) => window.setTimeout(() => {
        update();
        scrollActiveEditorIntoView();
      }, delay));
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Android can otherwise restore focus to the composer when the PWA resumes,
      // which may reopen the IME over the editor even when the user dismissed it.
      clearResumeTimers();
      blurActiveEditor();
      return;
    }

    if (document.visibilityState === 'visible') {
      resyncAfterResume();
    }
  };

  const handlePageShow = () => {
    // Do not focus or reopen the IME on pageshow. Only resync viewport geometry.
    resyncAfterResume();
  };

  const handleFocusIn = () => {
    update();
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(update);
    }
    window.setTimeout(update, 120);
    window.setTimeout(() => {
      update();
      scrollActiveEditorIntoView();
    }, 350);
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
