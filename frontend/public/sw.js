// Service Worker for Web Push. It does not cache anything: it only receives push
// events and turns them into OS notifications.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // ignore malformed payloads
  }
  const title = data.title || 'NextEducation';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data.data || {},
    tag: data.data?.threadId ? `thread-${data.data.threadId}` : undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';
  if (data.threadId) url = `/messages/${data.threadId}`;
  else if (data.announcementId) url = '/annonces';
  else if (data.paymentId) url = '/parent/paiements';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url)) return client.focus();
      }
      return clients.openWindow(url);
    }),
  );
});