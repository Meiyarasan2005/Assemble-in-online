const CACHE = 'assembleonline-shell-v8'
const STATIC_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/logo.jpeg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
      /* Force every already-open tab to load the newest bundle. */
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      await Promise.all(clients.map((c) => c.navigate(c.url).catch(() => c.reload())))
    })(),
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
      const copy = res.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return res
  } catch {
    return caches.match('/index.html')
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request)
    if (res && res.status === 200) {
      const copy = res.clone()
      caches.open(CACHE).then((cache) => cache.put(request, copy))
    }
    return res
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return caches.match('/index.html')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }),
    )
    return
  }

  event.respondWith(cacheFirst(request))
})
