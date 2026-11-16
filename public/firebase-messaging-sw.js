/* Firebase Cloud Messaging Service Worker for Radiotecnica easy */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Radiotecnica easy', body: event.data.text() } };
  }

  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'Radiotecnica easy · Promemoria di studio';
  const body =
    notif.body ||
    data.body ||
    'È il momento della tua sessione quotidiana di radiotecnica!';
  const icon = notif.icon || '/pwa-192x192.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/pwa-192x192.png',
      tag: 'radiotecnica-fcm-reminder',
      renotify: true,
      data: {
        url: data.url || '/',
      },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
