// 拾光 · 灵感备忘录 — service worker
// 部署在 GitHub Pages 子路径 /luma-memo/ 下，因此所有路径都基于注册作用域推导。
const CACHE_VERSION = 'v2';
const BASE = new URL(self.registration.scope).pathname; // 形如 /luma-memo/，始终以 / 结尾
const CACHE_NAME = `luma-memo-shell-${CACHE_VERSION}`;
const SHELL_ASSETS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon.svg`,
  `${BASE}icons/icon-192.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept cross-origin requests (e.g. AI API endpoints or Ollama)
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first with shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(`${BASE}index.html`).then((cached) => cached || caches.match(BASE)))
    );
    return;
  }

  // Static same-origin assets: cache-first, update in background
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
