/* عامل خدمة للإيقاف: يمسح كل ملفات النسخة القديمة المخزنة ويلغي نفسه،
   ثم يعيد فتح الصفحات المفتوحة حتى تصل إلى صفحة التحويل للرابط الجديد. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try { const cs = await self.clients.matchAll({ type: 'window' }); cs.forEach((c) => c.navigate(c.url)); } catch (err) {}
  })());
});
