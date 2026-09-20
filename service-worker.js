// Minimal service worker: makes the app shell (this page, its icons, the
// manifest) installable and able to reopen without a network connection.
// It deliberately does NOT touch calendar-sync, weather, or CORS-proxy
// requests (those are cross-origin), so synced data is never served stale.
const CACHE_NAME = "my-family-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}) // don't fail install if one asset can't be pre-cached
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Only manage same-origin GET requests for the app shell itself.
  // Everything else (Google/Outlook sync, weather, geocoding, CORS proxy)
  // is left completely alone and always goes straight to the network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
