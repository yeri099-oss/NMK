// 한식페스타 앱 오프라인 저장 (서비스 워커)
// - 앱 화면(HTML)은 인터넷이 되면 항상 새로 받고, 안 되면 저장해둔 화면을 띄움
// - 파이어베이스 프로그램·글꼴·사진은 한 번 받으면 저장해두고 사용
// - 판매 데이터 통신(googleapis.com)은 건드리지 않음 (파이어베이스가 직접 오프라인 대기·업로드 처리)
const CACHE = "festa-app-v4";
const PRECACHE = [
  "./", "./index.html", "./menu.html", "./manifest.webmanifest",
  "./favicon.png", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./botanical-l.svg", "./botanical-r.svg", "./qr-menu-code.png",
  "./img/bojagi-castella-box.jpg", "./img/gim-bugak.jpg", "./img/gyul-carrot-juice-photo.jpg",
  "./img/lemon-juice-styled.jpg", "./img/saesongi-bugak.jpg", "./img/soy-10y.jpg",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 하나가 실패해도 나머지는 저장
    await Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function isPage(req, url) {
  return req.mode === "navigate" || (url.origin === location.origin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html")));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("googleapis.com") && url.hostname !== "fonts.googleapis.com") return; // 데이터 통신은 그대로
  if (url.searchParams.has("check")) return; // 새 버전 확인은 항상 인터넷으로

  if (isPage(req, url)) {
    // 화면: 인터넷 우선(4초), 안 되면 같은 화면의 저장본 (앱 화면과 고객용 상품 소개 화면을 따로 저장)
    const key = url.pathname.endsWith("menu.html") ? "./menu.html" : "./index.html";
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))]);
        if (res && res.ok) c.put(key, res.clone());
        return res;
      } catch {
        return (await c.match(key)) || Response.error();
      }
    })());
    return;
  }

  // 나머지(프로그램·글꼴·사진): 저장본을 바로 쓰고 뒤에서 새로 받아 갱신
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: url.origin === location.origin });
    const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
