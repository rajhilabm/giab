/* عامل الخدمة (Service Worker) لنظام تحضير الطلاب
   - يخزّن ملفات الواجهة ليعمل التطبيق بعد تثبيته وحتى عند ضعف الاتصال.
   - لا يخزّن أبداً طلبات قاعدة البيانات (Supabase) حتى تبقى البيانات لحظية.
   عند تعديل index.html غيّر رقم النسخة في السطر التالي ليأخذ المستخدمون النسخة الجديدة فوراً. */
const VER = 'att-v2';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    /* نخزّن كل ملف على حدة حتى لا يفشل التخزين كله بسبب ملف واحد */
    await Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

const skipHost = h => /supabase\.(co|in)$/.test(h) || h.endsWith('supabase.co');

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (skipHost(url.hostname)) return;                 /* قاعدة البيانات: من الشبكة دائماً */

  /* فتح الصفحة: الشبكة أولاً ثم النسخة المخزّنة عند انقطاع الاتصال */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(VER);
        c.put('./index.html', net.clone());
        return net;
      } catch (err) {
        const c = await caches.open(VER);
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  /* بقية الملفات: من المخزن فوراً مع تحديثه في الخلفية */
  e.respondWith((async () => {
    const c = await caches.open(VER);
    const hit = await c.match(req, { ignoreVary: true });
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
      return r;
    }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
