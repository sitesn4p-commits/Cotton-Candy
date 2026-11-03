import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const adminManifest = {
  id: '/manage-cotton-candy/',
  name: 'Cotton Candy Admin',
  short_name: 'Cotton Candy',
  description: 'Private Cotton Candy Event Deco admin workspace.',
  start_url: '/manage-cotton-candy/sign-in?source=homescreen',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone'],
  background_color: '#F7F3EC',
  theme_color: '#3E443B',
  icons: [{ src: '/cotton-candy-logo-web.png', sizes: '1563x1563', type: 'image/png', purpose: 'any' }],
}

const adminServiceWorker = `
const SHELL_CACHE = 'cotton-candy-admin-shell-v1';
const ASSET_CACHE = 'cotton-candy-admin-assets-v1';
const CACHE_PREFIX = 'cotton-candy-admin-';

self.addEventListener('push', (event) => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch { message = { body: event.data?.text() || '' }; }
  const title = typeof message.title === 'string' ? message.title : 'Cotton Candy Admin';
  const body = typeof message.body === 'string' ? message.body : 'There is an update for an order.';
  const url = typeof message.url === 'string' && message.url.startsWith('/') ? message.url : '/manage-cotton-candy';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/cotton-candy-logo-web.png',
    badge: '/cotton-candy-logo-web.png',
    data: { url },
    tag: 'cotton-candy-order-update',
    renotify: true,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = typeof event.notification.data?.url === 'string' && event.notification.data.url.startsWith('/')
    ? event.notification.data.url
    : '/manage-cotton-candy';
  const target = new URL(path, self.location.origin);
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    for (const client of clients) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.navigate(target.href);
      return client.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', '/cotton-candy-logo-web.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, ASSET_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match('/index.html')) || (await caches.match('/'))),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
`

function adminPwaPlugin(): Plugin {
  return {
    name: 'cotton-candy-admin-pwa',
    apply: 'build',
    transformIndexHtml(html) {
      const adminHead = [
        '<meta name="description" content="Private Cotton Candy Event Deco admin workspace." />',
        '<meta name="theme-color" content="#3E443B" />',
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
        '<meta name="apple-mobile-web-app-title" content="Cotton Candy" />',
        '<link rel="manifest" href="/admin.webmanifest" />',
        '<link rel="apple-touch-icon" href="/cotton-candy-logo-web.png" />',
      ].join('\n    ')
      return html
        .replace(/<meta name="description"[^>]*\/>/, '')
        .replace('<title>Cotton Candy | Event Deco & Hire</title>', '<title>Cotton Candy Admin</title>')
        .replace('</head>', `    ${adminHead}\n  </head>`)
        .replace('</body>', `    <script>if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/admin-service-worker.js', { scope: '/' }).catch(() => undefined));</script>\n  </body>`)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'admin.webmanifest', source: JSON.stringify(adminManifest, null, 2) })
      this.emitFile({ type: 'asset', fileName: 'admin-service-worker.js', source: adminServiceWorker })
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd())
  const isAdminBuild = environment.VITE_APP_MODE === 'admin'

  return {
    plugins: [react(), ...(isAdminBuild ? [adminPwaPlugin()] : [])],
    server: {
      fs: {
        allow: ['..'],
      },
    },
  }
})
