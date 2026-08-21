const VIEWPORT_HEIGHT_VAR = '--elara-viewport-height';
const RESUME_SETTLE_DELAYS_MS = [0, 120] as const;

export function installMobileViewportSync(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  let resumeTimers: number[] = [];

  const update = () => {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty(VIEWPORT_HEIGHT_VAR, `${Math.round(height)}px`);
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
    }

    resumeTimers = RESUME_SETTLE_DELAYS_MS
      .filter((delay) => delay > 0)
      .map((delay) => window.setTimeout(update, delay));
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      resyncAfterResume();
    }
  };

  const handlePageShow = () => {
    resyncAfterResume();
  };

  update();
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);

  return () => {
    clearResumeTimers();
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
  };
}
