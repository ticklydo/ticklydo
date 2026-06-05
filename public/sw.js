const CACHE_NAME = "ticklydo-v3";
const STATIC = ["/", "/home", "/LOGO.png", "/IKONA.png", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Ignoruj non-GET a chrome-extension requesty
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith("http")) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Len cachuj úspešné odpovede
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback — vráť z cache ak existuje
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Pre navigáciu vráť home page
          if (e.request.mode === "navigate") {
            return caches.match("/home") || new Response("Offline", { status: 503 });
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});