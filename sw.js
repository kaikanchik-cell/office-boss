// Офис BOSS — service worker
// Оболочка (index.html, иконки, manifest) кешируется для работы офлайн.
// state.json ВСЕГДА берётся из сети (network-first, cache: 'no-store'); кеш — только запасной вариант офлайн.
const VERSION = "office-boss-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png",
               "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.endsWith("/state.json")) {
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put("./state.json", copy)); } return r; })
        .catch(() => caches.match("./state.json").then(r => r || new Response("{}", { status: 503, headers: { "Content-Type": "application/json" } })))
    );
    return;
  }
  // оболочка: сначала сеть (чтобы обновления index.html приходили), при офлайне — кеш
  e.respondWith(
    fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
  );
});
