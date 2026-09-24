// DIGIZORT Real-Time Web Push & Background Service Worker
// Handles background notifications, action clicks, and app window focusing

const DIGIZORT_LOGO = 'https://i.postimg.cc/mgr8Ptsv/Chat-GPT-Image-Jul-31-2026-08-44-25-PM.png';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for other tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Push Event handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: 'DIGIZORT Alert',
    body: 'You have a new update in DIGIZORT.',
    icon: DIGIZORT_LOGO,
    badge: DIGIZORT_LOGO,
    tag: 'digizort-push',
    data: {},
  };

  try {
    const json = event.data.json();
    payload = { ...payload, ...json };
  } catch (e) {
    payload.body = event.data.text() || payload.body;
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || DIGIZORT_LOGO,
    badge: payload.badge || DIGIZORT_LOGO,
    tag: payload.tag || `digizort-${Date.now()}`,
    data: payload.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// Notification Click Event handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickActionUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickActionUrl);
      }
    })
  );
});
