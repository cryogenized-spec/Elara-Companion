let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export async function prepareBackgroundService(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // Permission prompts are optional; background execution must not depend on them.
    }
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register('./elara-background-sw.js', { scope: './elara-bg/' })
      .then((registration) => registration)
      .catch(() => null);
  }

  await registrationPromise;
}

export async function notifyBackgroundCompletion(title: string, body: string): Promise<void> {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await (registrationPromise || navigator.serviceWorker.ready);
    const payload = {
      type: 'ELARA_BACKGROUND_COMPLETE',
      title,
      body,
      url: window.location.href,
      timestamp: Date.now(),
    };
    registration?.active?.postMessage(payload);
  } catch {
    // Notification delivery is best effort.
  }
}
