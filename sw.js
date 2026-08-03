/* ============================================================================
   Ahmet — Tepe Yarışı · Service Worker
   Telefon · Tablet · Windows/Mac/Linux masaüstü (tek kod, cihaza göre ayrılır)

   ── ÖNBELLEK STRATEJİSİ (28 Tmz'de yeniden yazıldı) ────────────────────────
   Eskiden HER dosya "önce ağ" (network-first) idi: çevrimiçiyken 79 dosyanın
   her biri için ağ turu bekleniyordu → açılış yavaştı ve zayıf bağlantıda
   oyun geç açılıyordu.

   Artık kaynak türüne göre AYRI strateji:
     · index.html + manifest.json → ÖNCE AĞ  (sürüm tespiti taze olsun)
     · js / css / ikon           → ÖNCE ÖNBELLEK + ARKA PLANDA TAZELE
                                    (anında açılır, yeni sürüm sessizce iner)
     · diğer her şey             → önce ağ, ağ yoksa önbellek

   ── OTOMATİK GÜNCELLEME NASIL ÇALIŞIR ─────────────────────────────────────
   1. Yeni sürüm yayınlanınca `SURUM` değişir (OYUNU-YAYINLA.bat OTOMATİK artırır).
   2. Tarayıcı her açılışta sw.js'i kontrol eder, değiştiğini görür.
   3. Yeni SW kurulur → `skipWaiting()` ile BEKLEMEDEN devreye girer.
   4. `activate` eski önbellekleri siler ve tüm sekmelere "YENI_SURUM" mesajı yollar.
   5. `js/guncelleme.js` bu mesajı alır; oyuncu menüdeyse sayfayı sessizce
      yeniler, oyun ortasındaysa "Yeni sürüm hazır" rozeti gösterir.
   ▶ Sonuç: kullanıcı hiçbir şey yapmadan, uygulamayı bir kez açıp kapatmasıyla
     en güncel sürüme geçer. Mağaza/güncelleme indirmesi YOK.
   ============================================================================ */

const SURUM = 'v63';
const CACHE = 'ahmet-tepe-yarisi-' + SURUM;

// Her cihaza inen ortak dosyalar
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png',
  './icon-maskable-512.png',
  './css/style.css',
  './js/accessibility.js', './js/achievements.js', './js/ai.js', './js/analytics.js', './js/audio.js', './js/blackmarket.js', './js/camera.js', './js/campaign.js', './js/cardcollection.js', './js/career.js', './js/dailyquests.js', './js/dda.js', './js/drivephysics.js', './js/dynamicaudio.js', './js/economy.js', './js/engine.js', './js/environment.js', './js/game.js', './js/hud.js', './js/i18n-src-tr.js', './js/i18n-src-en.js', './js/i18n.js', './js/intro.js', './js/liveops.js', './js/loops.js', './js/luckwheel.js', './js/mobilhedef.js', './js/main.js', './js/mapsettings.js', './js/missions.js', './js/modes.js', './js/mp-config.js', './js/mprooms.js', './js/multiplayer.js', './js/netcode.js', './js/openworld.js', './js/paintshop.js', './js/particles.js', './js/perf.js', './js/physics.js', './js/powermodes.js', './js/prestige.js', './js/procgen.js', './js/profile.js', './js/quality.js', './js/renderer.js', './js/replay.js', './js/responsive.js', './js/rewards.js', './js/safety.js', './js/savedata.js', './js/savemigrate.js', './js/seasonevents.js', './js/security.js', './js/selftest.js', './js/settings.js', './js/shopoffers.js', './js/skilltree.js', './js/statspanel.js', './js/telemetry.js', './js/terrain.js', './js/terrain_extra.js', './js/tuning.js', './js/ui.js', './js/vehicles.js',
  './js/customization.js', './js/gamemodes2.js', './js/social.js', './js/progression2.js', './js/economy2.js', './js/mapenv.js', './js/gameplay2.js', './js/visualaudio.js', './js/meta2.js', './js/funextra.js',
  // KLAN SİSTEMİ (2 Ağu) — index.html'de social.js'ten SONRA, hookups.js'ten ÖNCE
  './js/klan.js', './js/klan-sim.js', './js/klan-kutu.js', './js/klan-etkinlik.js',
  './js/klan-savas.js', './js/klan-ui.js', './js/etkinlikler.js',
  // HCR2 REFERANS EKRANLARI (3 Agu) — SIRA: ekran-sandik.js, ekran-garaj.js'ten SONRA
  './js/ekran-ana.js', './js/ekran-garaj.js', './js/ekran-cups.js', './js/ekran-sandik.js',
  './js/kalite.js',
  './js/gorsel-isik.js', './js/gorsel-lens.js', './js/gorsel-atmosfer.js', './js/gorsel-yansima.js', './js/gorsel-renk.js', './js/gorsel-hareket.js', './js/gorsel-hava.js',
  './js/gorsel.js',
  './js/install.js', './js/guncelleme.js', './js/hookups.js', './js/modeselect.js', './js/uitheme.js',
  // Ölü modül bağlama katmanı (30 Tmz, 9 ajan) — index.html'de hookups.js'ten SONRA yüklenir
  './js/bagla-hud.js', './js/bagla-kamera.js', './js/bagla-parcacik.js', './js/bagla-arazi.js',
  './js/bagla-dunya.js', './js/bagla-rakip.js', './js/bagla-oynanis.js', './js/bagla-etkinlik.js',
  './js/bagla-arayuz.js',
  // Ülke seçimi + 193 bayrak (31 Tmz) — SIRA: motor, 4 kıta verisi, ekran
  './js/bayraklar.js', './js/bayrak-avrupa.js', './js/bayrak-asya.js',
  './js/bayrak-afrika.js', './js/bayrak-amerika.js', './js/ulke.js',
];

// ─────────── CİHAZ AYRIMI ───────────
// Bu iki dosya SADECE telefon/tablette kullanılıyor (dokunmatik pedallar, mobil UI).
// index.html onları masaüstünde hiç yüklemez; burada da masaüstüne indirmiyoruz.
// ⚠ './js/install.js' ve './js/guncelleme.js' bilinçli olarak ORTAK listede —
//   kurulum ve güncelleme cihaza özel değil, masaüstünde de gerekli.
const MOBIL_ASSETS = ['./js/mobile.js', './js/mobileui.js'];

function _mobilMi() {
  try {
    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile|Silk/i
      .test(self.navigator.userAgent);
  } catch (e) { return true; }   // emin değilsek indir (eksik kalmasın)
}

// Bu istek "statik varlık" mı? (js/css/ikon → önce önbellek)
function _statikMi(url) {
  return /\.(js|css|png|svg|jpg|jpeg|webp|woff2?|ttf)$/i.test(url.pathname);
}
// Sürüm tespiti için TAZE olması gerekenler
function _tazeGerek(url) {
  return url.pathname.endsWith('/') ||
         url.pathname.endsWith('index.html') ||
         url.pathname.endsWith('manifest.json');
}

self.addEventListener('install', e => {
  const liste = _mobilMi() ? ASSETS.concat(MOBIL_ASSETS) : ASSETS;
  // 🔴 BUGFIX(31 Tmz) — `cache.addAll(liste)` HEP-YA-HİÇTİR.
  //   100+ dosyadan BİRİ bile inmezse (mobil şebeke, VPN, tünel kopması)
  //   TÜM önbellek işlemi düşüyordu ve `.catch(() => {})` bunu SESSİZCE yutuyordu
  //   → önbellek BOMBOŞ kalıyor. Sonra her istek ağa düşüyor ve ağ da tökezlerse
  //   aşağıdaki geri dönüş devreye giriyordu (telefonda görülen hatanın yarısı).
  // ▶ Artık dosyalar TEK TEK önbelleğe alınır; biri inmezse yalnız O atlanır.
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(
      liste.map(u => fetch(u, { cache: 'reload' })
        .then(r => (r && r.status === 200) ? c.put(u, r) : null)
        .catch(() => null))
    )).catch(() => {})
  );
  self.skipWaiting();           // beklemeden devreye gir
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Eski sürümlerin önbelleklerini sil
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Açık sekmelere haber ver → js/guncelleme.js yakalar
    const cl = await self.clients.matchAll({ type: 'window' });
    for (const c of cl) {
      try { c.postMessage({ tip: 'YENI_SURUM', surum: SURUM }); } catch (e) {}
    }
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  let url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // dış kaynaklara karışma

  // ── 1) index.html / manifest → ÖNCE AĞ (sürüm taze görülsün) ──
  if (_tazeGerek(url)) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const kopya = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, kopya)).catch(() => {});
        return resp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // ── 2) js/css/ikon → ÖNCE ÖNBELLEK, ARKA PLANDA TAZELE ──
  //    Anında açılır; yeni dosya sessizce inip bir sonraki açılışta devreye girer.
  //    (Sürüm atlayınca zaten yeni CACHE kurulduğu için kod hep tutarlıdır.)
  if (_statikMi(url)) {
    e.respondWith(
      caches.match(e.request).then(onbellek => {
        const agdan = fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            const kopya = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, kopya)).catch(() => {});
          }
          return resp;
        }).catch(() => null);
        // 🔴🔴 BUGFIX(31 Tmz) — TELEFONDA "Uncaught SyntaxError: Unexpected
        //   token '<' [gorsel.js:1]" HATASININ SEBEBİ BURASIYDI.
        //   Burada `caches.match('./index.html')` dönülüyordu: yani bir **.js**
        //   isteğine **HTML** cevabı veriliyordu. Tarayıcı o HTML'i JavaScript
        //   sanıp ayrıştırmaya çalışıyor ve ilk `<` karakterinde patlıyor.
        //   Aynı şey .css için de sessiz bozulma üretiyordu.
        // ▶ Statik varlıkta index.html'e ASLA düşme. Dürüst bir 504 dön:
        //   betik çalışmaz ama SÖZDİZİMİ HATASI ATMAZ, oyunun geri kalanı ayakta
        //   kalır (index.html'deki global hata ağı da yanlış alarm vermez).
        return onbellek || agdan.then(r => r ||
          new Response('', { status: 504, statusText: 'Cevrimdisi' }));
      })
    );
    return;
  }

  // ── 3) Diğer her şey → önce ağ, ağ yoksa önbellek ──
  e.respondWith(
    fetch(e.request).then(resp => {
      const kopya = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, kopya)).catch(() => {});
      return resp;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});

// Sayfadan "hemen devreye gir" isteği (js/guncelleme.js gönderir)
self.addEventListener('message', e => {
  if (e.data && e.data.tip === 'HEMEN_GEC') self.skipWaiting();
});
