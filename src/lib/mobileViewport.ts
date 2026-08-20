const VIEWPORT_HEIGHT_VAR = '--elara-viewport-height';
const VIEWPORT_SYNC_EVENT = 'elara:mobile-viewport-sync';

export function installMobileViewportSync(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let resumeTimer: number | null = null;
  let delayedResumeTimer: number | null = null;

  const update = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${Math.round(height)}px`);
    window.dispatchEvent(new CustomEvent(VIEWPORT_SYNC_EVENT));
  };

  const scheduleResumeSync = () => {
    if (resumeTimer !== null) window.cancelAnimationFrame(resumeTimer);
    if (delayedResumeTimer !== null) window.clearTimeout(delayedResumeTimer);

    // Android can restore the IME after the page becomes visible. Re-measure
    // immediately, on the next frame, and once more after the browser settles.
    update();
    resumeTimer = window.requestAnimationFrame(() => {
      resumeTimer = null;
      update();
      delayedResumeTimer = window.setTimeout(() => {
        delayedResumeTimer = null;
        update();
      }, 120);
    });
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') scheduleResumeSync();
  };

  const handlePageShow = () => scheduleResumeSync();

  update();
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);

  return () => {
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
    if (resumeTimer !== null) window.cancelAnimationFrame(resumeTimer);
    if (delayedResumeTimer !== null) window.clearTimeout(delayedResumeTimer);
  };
}

export const ELARA_MOBILE_VIEWPORT_SYNC_EVENT = VIEWPORT_SYNC_EVENT;
