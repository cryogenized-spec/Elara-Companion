let installed = false;
let originalAbort: typeof AbortController.prototype.abort | null = null;

export function installBackgroundSafeAbortBoundary(): void {
  if (installed || typeof window === 'undefined' || typeof AbortController === 'undefined') return;
  installed = true;
  originalAbort = AbortController.prototype.abort;

  AbortController.prototype.abort = function patchedAbort(reason?: any): void {
    const message = reason instanceof Error ? reason.message : String(reason || '');
    const isBackgroundWatchdog = /connection lost|timed out in background|while in background/i.test(message);
    if (isBackgroundWatchdog) {
      console.warn('[Elara] Ignoring background watchdog abort; keeping the model request alive.');
      return;
    }
    originalAbort!.call(this, reason);
  };
}
