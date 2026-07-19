/* Web Push handlers for notify-hub (N-13).
 * Layered onto the Workbox-generated service worker via vite.config.ts
 * (workbox.importScripts: ['push-sw.js']). Kept dependency-free.
 *
 * Payload shape (built by @block65/webcrypto-web-push on the Worker):
 *   event.data.json() === { title, body, url }
 */
/* global self */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { title: 'Lifeタスク', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Lifeタスク'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'life-task-notify',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus()
          if (target && target !== '/' && 'navigate' in client) {
            try {
              await client.navigate(target)
            } catch (_e) {
              /* cross-origin or blocked navigation: leave the focused tab as-is */
            }
          }
          return
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target)
    })(),
  )
})
