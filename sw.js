/* Service worker — eCO2RR FE Calculator */
importScripts("./version.js");
var CACHE = "fecalc-" + self.APP_VERSION;
var ASSETS = [
  "./", "./index.html", "./styles.css", "./design-tokens.css", "./app.js", "./version.js", "./pwa.js",
  "./manifest.webmanifest", "./vendor/xlsx.full.min.js",
  "./fonts/IBMPlexSans-Variable.ttf", "./fonts/IBMPlexMono-Regular.ttf", "./fonts/IBMPlexMono-Medium.ttf",
  "./fonts/IBMPlexMono-SemiBold.ttf", "./fonts/IBMPlexMono-Bold.ttf",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon-32.png"
];

self.addEventListener("install", function (e) {
  // cache: "reload" bypasses the HTTP cache so a new version gets fresh files
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }));
  // no skipWaiting here: the page shows "Update available" and asks us to activate
});

self.addEventListener("message", function (e) { if (e.data === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("fecalc-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  var isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  if (isPage) {
    // network-first for the HTML shell
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", copy); }); return res;
    }).catch(function () { return caches.match("./index.html", { ignoreSearch: true }); }));
    return;
  }
  // cache-first for static assets
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
