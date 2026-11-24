/* v5: os assets passam a ser network-first (ver handler de fetch abaixo), para
   que o botão de recarregar do navegador traga código novo sem depender do
   Ctrl+Shift+R. O `activate` apaga os caches das versões anteriores. */
const CACHE = 'ember-music-v5'

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

  // Ignora requisições cross-origin (YouTube, Google OAuth, APIs externas)
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

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
      }).catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        const offlinePage = await caches.match('/offline')
        return offlinePage || new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      })
    )
    return
  }

  /* Assets: network-first. Assim, ao clicar no botão de recarregar do
     navegador, o SW busca a versão mais recente no servidor antes de usar o
     cache — o reload normal passa a se comportar como um hard reload. O cache
     continua como fallback offline, então o app não quebra sem rede.
     Custo: uma requisição a mais por asset em cada carregamento. */
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(async () => (await caches.match(event.request)) || new Response('', { status: 504 }))
  )
})
