/* Service worker Connect Team : notifications Web Push (rappels, demandes de one-to-one). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Connect Team', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Connect Team', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'connect-team',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  );
});

// Au clic : on réutilise un onglet ouvert de l'application, sinon on en ouvre un.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin)) {
          client.focus();
          return client.navigate(url);
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
