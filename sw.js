// Service worker: deixa o app abrir sem internet (no barco, na praia)
// e guarda as fotos dos peixes depois da primeira vez que aparecem.
const VERSAO = "pesca-v2";
const ARQUIVOS = [
  "./", "index.html", "estilo.css", "manifest.webmanifest",
  "icone.svg", "icone-192.png", "icone-512.png",
  "especies.js", "mare.js", "fotos.js", "app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO && k !== "pesca-fotos").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fotos do Wikimedia: cache primeiro
  if (url.hostname === "upload.wikimedia.org") {
    e.respondWith(
      caches.open("pesca-fotos").then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const r = await fetch(req);
        if (r.ok || r.type === "opaque") c.put(req, r.clone());
        return r;
      })
    );
    return;
  }

  // Arquivos do próprio app: rede primeiro (pega atualizações), cache se estiver offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
          return r;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
    );
  }
  // APIs (maré, mapa, Wikipedia): sempre pela rede; o app trata a falta de internet.
});
