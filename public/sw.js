// Service worker toi gian cho PWA: KHONG cache du lieu dong (don hang, hoa
// don, luong...) de tranh hien du lieu cu/sai — chi cache 1 trang offline.html
// tinh, dung lam fallback khi mat mang luc dieu huong trang.
const CACHE = "chp-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png"])).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
