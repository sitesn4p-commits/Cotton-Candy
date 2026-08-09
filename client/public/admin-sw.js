const CACHE_NAME = 'cotton-candy-admin-v2'
const FIREBASE_CONFIG = null
const APP_SHELL = [
  '/',
  '/index.html',
  '/cotton-candy-logo-web.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('cotton-candy-admin-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
        return response
      }).catch(() => caches.match('/index.html')),
    )
    return
  }

  const requestUrl = new URL(request.url)
  if (requestUrl.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font')) {
        const copy = response.clone()
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
      }
      return response
    })),
  )
})

if (FIREBASE_CONFIG?.apiKey) {
  importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/12.5.0/firebase-messaging-compat.js')
  firebase.initializeApp(FIREBASE_CONFIG)
  firebase.messaging().onBackgroundMessage((payload) => {
    const route = payload.data?.route || '/manage-cotton-candy/requests'
    return self.registration.showNotification(payload.notification?.title || payload.data?.title || 'Cotton Candy Admin', {
      body: payload.notification?.body || payload.data?.body || 'There is a new update in your dashboard.',
      icon: '/cotton-candy-logo-web.png',
      data: { route },
    })
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const route = event.notification.data?.route || '/manage-cotton-candy'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const matchingClient = clients.find((client) => client.url.includes('/manage-cotton-candy'))
    if (matchingClient) return matchingClient.focus().then(() => matchingClient.navigate(route))
    return self.clients.openWindow(route)
  }))
})
