const CACHE = 'ember-music-v3'

const PRECACHE_URLS = ['/', '/buscar', '/biblioteca', '/login', '/offline']

const isDev =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Dev: assets não têm hash e mudam a cada edição — nunca servir do cache,
  // senão o F5 roda código antigo (Ctrl+Shift+R funcionava só porque ignora o SW).
  if (isDev) return

  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return
  }

  // Links de autenticação/OAuth (callback da Supabase/GoTrue) NÃO devem ser
  // cacheados nem interceptados pelo SW. O `?code=...` é one-shot e a tentativa de
  // servir o HTML cached amarra o fluxo.
  let parsedUrl
  try { parsedUrl = new URL(event.request.url) } catch { return }
  if (parsedUrl.search.includes('code=') || parsedUrl.search.includes('state=')) {
    return
  }

  if (event.request.mode === 'navigate') {
    // Network-first: o HTML sempre é o mais novo; cache só como fallback offline.
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        return response
      }).catch(() => caches.match(event.request))
    )
    return
  }

  // Assets: cache-first (/_next/static/ tem hash no prod; em dev já não cacheamos).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return response
      }).catch(() => cached)

      return cached || fetchPromise
    })
  )
})
