const CACHE = 'invoice-core-shell-v2'
const shellPath = '/'
const publicFiles = new Set([
  '/invoice.webmanifest',
  '/invoice-mark.svg',
  '/invoice-192.png',
  '/invoice-512.png',
])

function staticPath(url) {
  return (
    url.origin === self.location.origin &&
    !url.search &&
    (publicFiles.has(url.pathname) ||
      /^\/assets\/[a-z0-9_.-]+-[a-z0-9_-]{8,}\.(?:m?js|css|woff2|ttf)$/i.test(url.pathname))
  )
}

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith('invoice-core-shell-') && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  )
})

self.addEventListener('message', (event) => {
  const reply = event.ports[0]
  const source = event.source?.url && new URL(event.source.url)
  if (
    !source ||
    source.origin !== self.location.origin ||
    source.pathname !== shellPath ||
    event.data?.type !== 'prepare-invoice-shell' ||
    !reply ||
    !Array.isArray(event.data.paths)
  )
    return
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      try {
        const paths = new Set(publicFiles)
        for (const candidate of event.data.paths.slice(0, 128)) {
          if (typeof candidate !== 'string') continue
          try {
            const url = new URL(candidate, self.location.origin)
            if (staticPath(url)) paths.add(url.pathname)
          } catch {
            continue
          }
        }
        const requests = Array.from(
          paths,
          (path) => new Request(new URL(path, self.location.origin), { credentials: 'omit' }),
        )
        const missing = (
          await Promise.all(
            requests.map(async (request) => ((await cache.match(request)) ? null : request)),
          )
        ).filter(Boolean)
        if (missing.length) await cache.addAll(missing)
        // Store only the public invoice shell; never cache user data or mutations.
        const shell = await fetch(shellPath, { credentials: 'omit', cache: 'reload' })
        const shellHtml = shell.ok && !shell.redirected ? await shell.clone().text() : ''
        if (
          !shellHtml ||
          !(
            shellHtml.includes('data-invoice-shell="loading"') ||
            shellHtml.includes('Opening the local workspace')
          )
        ) {
          reply.postMessage(false)
          return
        }
        await cache.put(shellPath, shell)
        reply.postMessage(true)
      } catch {
        reply.postMessage(Boolean(await cache.match(shellPath)))
      }
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('Range')) return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.search) return
  if (request.mode === 'navigate' && url.pathname === shellPath) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE)
        return (await cache.match(shellPath)) ?? Response.error()
      }),
    )
  } else if (staticPath(url)) {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(url.pathname)) ??
            fetch(new Request(url.pathname, { credentials: 'omit' })),
        ),
    )
  }
})
