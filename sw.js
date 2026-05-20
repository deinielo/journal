self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // dejamos pasar todo normal
  event.respondWith(fetch(event.request));
});