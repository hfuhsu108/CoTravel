// Web Push 事件處理（由 Workbox SW 透過 importScripts 載入）
// eslint-disable-next-line no-restricted-globals
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    // eslint-disable-next-line no-restricted-globals
    self.registration.showNotification(data.title || '同行提醒', {
      body: data.body || '',
      icon: '/CoTravel/pwa-192x192.png',
      badge: '/CoTravel/pwa-64x64.png',
      data: { url: data.url || '/CoTravel/' },
      tag: data.tag || 'reminder',
    }),
  )
})

// eslint-disable-next-line no-restricted-globals
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/CoTravel/'
  event.waitUntil(
    // eslint-disable-next-line no-restricted-globals
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/CoTravel/') && 'focus' in client) {
          return client.focus()
        }
      }
      // eslint-disable-next-line no-restricted-globals
      return clients.openWindow(url)
    }),
  )
})
