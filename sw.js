// Push-notification service worker for Phoenix EU168.
// Registered from push-alerts.html once a member opts in. Kept deliberately
// minimal — this project has no other offline/caching needs, so the only
// jobs here are "show the push" and "focus/open the app on tap."

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: 'Phoenix EU168', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'Phoenix EU168';
  const options = {
    body: data.body || '',
    icon: '/icon-eu168.png',
    badge: '/icon-eu168.png',
    tag: data.tag || 'phx-broadcast',
    renotify: true,
    data: { url: data.url || '/push-alerts.html' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientPath = new URL(client.url).pathname;
        if (clientPath === new URL(targetUrl, self.location.origin).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
