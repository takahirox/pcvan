/* Build substitutions contain only files emitted by Vite, never model URLs. */
const scope = self.registration.scope;
const prefix = `pcvan-shell:${scope}:`;
const cacheName = `${prefix}__VERSION__`;
const shell = __SHELL__.map((path) => new URL(path, scope).href);
const assets = new Map(__ASSETS__.map(({ path, integrity }) => [new URL(path, scope).href, integrity]));

async function saveShell() {
  const cache = await caches.open(cacheName);
  await cache.addAll(shell.map((url) => new Request(url, { cache: 'reload', integrity: assets.get(url) })));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      // addAll is atomic; failed installs leave the active release usable.
      await saveShell();
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
  // Keep a new release waiting until all older app tabs are closed. Never reload
  // an editor or combine a new HTML shell with an old page's lazy chunks.
});

self.addEventListener('message', (event) => {
  if (!['SHELL_STATUS', 'SAVE_SHELL'].includes(event.data) || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      if (event.data === 'SAVE_SHELL') await saveShell();
      const cache = await caches.open(cacheName);
      const saved = (await Promise.all(shell.map((url) => cache.match(url)))).every(Boolean);
      event.ports[0].postMessage(saved);
    } catch { event.ports[0].postMessage(false); }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isShell = request.mode === 'navigate' &&
    (url.pathname === new URL(scope).pathname || url.pathname === new URL('index.html', scope).pathname);
  // No catch-all, external resources, model weights, or arbitrary navigations.
  if (!isShell && !assets.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const key = isShell ? new URL('index.html', scope).href : url.href;
    const cached = await cache.match(key);
    if (cached) return cached;
    // A mutable index.html may already belong to a newer deployment. Reject
    // mismatched bytes instead of repairing an old cache with a mixed release.
    const response = await fetch(new Request(key, { integrity: assets.get(key) }));
    if (response.ok && response.type === 'basic') {
      // Optional asset cache failure must not break a successful online load.
      try { await cache.put(key, response.clone()); } catch { /* storage denied/full */ }
    }
    return response;
  })());
});
