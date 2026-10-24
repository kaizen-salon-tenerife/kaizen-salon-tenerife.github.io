// Notification-only worker: never caches private pages or intercepts requests.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Show a safe fallback. */ }
  event.waitUntil(self.registration.showNotification(payload.title || 'Nueva cita · MB Nurme Beauty', {
    body: payload.body || 'Hay una nueva reserva. Abre el panel para verla.',
    icon: '/brand/logo/mb-nurme-beauty-icon-192.png',
    tag: payload.tag || 'mb-booking',
    data: { url: payload.url || '/panel/avisos' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let url = new URL('/panel/avisos', self.location.origin);
  try {
    const candidate = new URL(event.notification.data?.url || '', self.location.origin);
    if (candidate.origin === self.location.origin && candidate.pathname.startsWith('/panel')) url = candidate;
  } catch { /* Keep the safe panel URL. */ }
  event.waitUntil(clients.openWindow(url.href));
});
