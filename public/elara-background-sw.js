self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'ELARA_BACKGROUND_COMPLETE') return;

  const title = data.title || 'Elara finished thinking';
  const body = data.body || 'Your response is ready.';
  const url = data.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: 'elara-response',
      renotify: true,
      icon: './pwa-192x192.png',
      badge: './pwa-192x192.png',
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const target = clients.find((client) => 'focus' in client);
      if (target) {
        target.focus();
        if ('navigate' in target) return target.navigate(url);
      }
      return self.clients.openWindow(url);
    })
  );
});
