/* Minimal service worker: offline shell for install / home-screen use */
var CACHE = "velocity-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./services.html",
  "./about.html",
  "./contracting.html",
  "./contact.html",
  "./privacy.html",
  "./styles.css",
  "./main.js",
  "./favicon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).then(function (response) {
        return response;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
