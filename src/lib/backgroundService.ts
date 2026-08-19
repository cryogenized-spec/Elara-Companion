let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let registrationAttempted = false;

export type BackgroundNotificationState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getBackgroundNotificationState(): BackgroundNotificationState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestBackgroundNotifications(): Promise<BackgroundNotificationState> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }
  return Notification.permission;
}

export async function prepareBackgroundService(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  if (!registrationPromise && !registrationAttempted) {
    registrationAttempted = true;
    registrationPromise = navigator.serviceWorker
      .register('./elara-background-sw.js')
      .then((registration) => registration)
      .catch(() => null);
  }

  await registrationPromise;
}

export async function notifyBackgroundCompletion(title: string, body: string): Promise<void> {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const payload = {
    type: 'ELARA_BACKGROUND_COMPLETE',
    title,
    body,
    url: window.location.href,
    timestamp: Date.now(),
  };

  try {
    await prepareBackgroundService();
    const registration = await registrationPromise;
    if (registration?.active) {
      registration.active.postMessage(payload);
      return;
    }
  } catch {
    // Fall through to the browser notification fallback.
  }

  try {
    new Notification(title, { body });
  } catch {
    // Notification delivery is best effort.
  }
}
