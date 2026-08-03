'use strict';
// ============================================================================
// Guncelleme — OTOMATİK GÜNCELLEME YÖNETİCİSİ (telefon + masaüstü, 28 Tmz)
//
// SORUN: Kurulu PWA'da service worker yeni sürümü indirse bile, AÇIK olan sayfa
//   hâlâ ESKİ JavaScript'i çalıştırır. Kullanıcı uygulamayı kapatıp açana kadar
//   değişiklikleri görmez ve bunu bilmez.
//
// ÇÖZÜM — üç katman:
//   1. Sayfa açılışında ve her 30 dakikada bir `registration.update()` → sunucuda
//      yeni sw.js var mı diye bakar (kullanıcı hiçbir şey yapmadan).
//   2. Yeni SW devreye girince `controllerchange` tetiklenir.
//   3. O anda oyuncu NE YAPIYOR ona bakılır:
//        · Menüdeyse / oyun oynamıyorsa → sayfa SESSİZCE yenilenir, hiç fark etmez.
//        · Oyunun ortasındaysa → koşuyu KESMEZ; üstte "Yeni sürüm hazır" rozeti
//          çıkar, dokununca yeniler. Koşu bitince de kendiliğinden yenilenir.
//
// ⚠ SONSUZ YENİLEME KORUMASI: `controllerchange` bazı tarayıcılarda ilk SW
//   devralmasında da tetiklenir. `_yenilendi` bayrağı + sessionStorage damgası
//   ile sayfa oturum başına EN FAZLA BİR KEZ otomatik yenilenir.
//
// ⚠ Bu dosya HER cihazda yüklenir (masaüstü dahil) — sw.js ASSETS ortak listesinde.
// ============================================================================

const Guncelleme = {
  _reg: null,
  _yenilendi: false,
  _rozet: null,
  _bekleyen: false,

  // Kontrol sıklığı: 30 dk. Uygulama açık kalırsa da güncellemeyi yakalar.
  ARALIK_MS: 30 * 60 * 1000,

  init() {
    try {
      if (!('serviceWorker' in navigator)) return;

      // 🔴 BUGFIX(31 Tmz) — "OYUNA GİRİNCE KENDİLİĞİNDEN BİR KEZ YENİDEN BAŞLIYOR"
      //   Sayfa AÇILDIĞI ANDA bir kontrolcü var mıydı? `controllerchange` olayı
      //   İLK KURULUMDA da tetiklenir (`clients.claim()` yüzünden): kontrolcü
      //   yokken bir SW devralınca da ateşlenir. Eski kod bunu "yeni sürüm geldi"
      //   sanıp `location.reload()` çağırıyordu → oyuncu açılışta oyunun bir kez
      //   kendiliğinden yeniden başladığını görüyordu.
      //   ⚠ Giriş yükleme ekranı 6,5 sn olduğu için bu, ikinci bir 6,5 sn
      //     bekleme demekti — bu yüzden çok göze batıyordu.
      //   ▶ Kontrolcü YOKTU ise bu ilk kurulumdur: sayfa ZATEN en yeni dosyalarla
      //     çalışıyor, yenilemeye GEREK YOK.
      this._ilkKontrolcuVardi = !!navigator.serviceWorker.controller;

      navigator.serviceWorker.register('sw.js').then((reg) => {
        this._reg = reg;

        // Açılışta bir kez kontrol et
        try { reg.update(); } catch (e) {}

        // Periyodik kontrol — uygulama uzun süre açık kalırsa
        setInterval(() => { try { reg.update(); } catch (e) {} }, this.ARALIK_MS);

        // Sekme tekrar öne gelince de kontrol et (telefonda en sık senaryo)
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) { try { reg.update(); } catch (e) {} }
        });

        // Yeni bir SW kuruluyor mu?
        reg.addEventListener('updatefound', () => {
          const yeni = reg.installing;
          if (!yeni) return;
          yeni.addEventListener('statechange', () => {
            // 'installed' + zaten bir kontrolcü varsa → bu bir GÜNCELLEME
            if (yeni.state === 'installed' && navigator.serviceWorker.controller) {
              this._bekleyen = true;
              try { yeni.postMessage({ tip: 'HEMEN_GEC' }); } catch (e) {}
            }
          });
        });
      }).catch(() => {});

      // SW devraldı → yeni sürüm aktif
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this._yeniSurumGeldi();
      });

      // SW'den doğrudan mesaj (activate içinde yollanır)
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.tip === 'YENI_SURUM') this._yeniSurumGeldi();
      });
    } catch (e) {}
  },

  // Oyuncu şu an aktif koşuda mı? (koşuyu kesmemek için)
  _oyunda() {
    try {
      const G = (typeof Game !== 'undefined' && Game) ? Game : (window.Game || null);
      if (G && G.state === 'playing') return true;
      const U = (typeof UI !== 'undefined' && UI) ? UI : (window.UI || null);
      if (U && U.currentScreen === 'game') return true;
    } catch (e) {}
    return false;
  },

  _yeniSurumGeldi() {
    if (this._yenilendi) return;
    // 🔴 BUGFIX(31 Tmz) — İLK KURULUMDA YENİLEME YOK.
    //   Sayfa açılırken kontrolcü yoktuysa bu bir "güncelleme" değil, ilk
    //   kurulumdur; dosyalar zaten taze. Yenilemek yalnız oyunu baştan başlatır.
    if (!this._ilkKontrolcuVardi) { this._ilkKurulumAtlandi = true; return; }
    // Oturum başına tek otomatik yenileme — sonsuz döngü koruması
    try {
      if (sessionStorage.getItem('ahmet_sw_yenilendi') === '1') return;
    } catch (e) {}

    // 🔴 BUGFIX(31 Tmz) — ARTIK ZORLA YENİLEME YOK, HER DURUMDA ROZET.
    //   Eskiden oyuncu menüdeyse sayfa SESSİZCE yenileniyordu. Oyuncunun
    //   bakış açısından bu "oyun kendi kendine yeniden başladı"dır ve 6,5 sn'lik
    //   giriş ekranını tekrar izletir. Güncelleme zaten önbelleğe indi:
    //   uygulamayı bir dahaki açışta yeni sürüm KENDİLİĞİNDEN devreye girer.
    //   ▶ Rozet gösterilir; oyuncu isterse dokunup hemen geçer (`_yenile`).
    //   ⚠ `_kosuSonuBekle()` BİLEREK ÇAĞRILMIYOR: o da koşu bitince
    //     `_yenile()` → `location.reload()` yapıyordu, yani aynı "kendiliğinden
    //     yeniden başladı" şikâyetini koşu sonrasına ötelemekten ibaretti.
    //     Fonksiyon duruyor (rozete elle bağlanabilir) ama otomatik tetiklenmiyor.
    this._rozetGoster();
  },

  _yenile() {
    if (this._yenilendi) return;
    this._yenilendi = true;
    try { sessionStorage.setItem('ahmet_sw_yenilendi', '1'); } catch (e) {}
    try { location.reload(); } catch (e) {}
  },

  // Koşu bitene kadar bekle, sonra sessizce yenile
  _kosuSonuBekle() {
    if (this._bekliyor) return;
    this._bekliyor = true;
    const t = setInterval(() => {
      if (!this._oyunda()) { clearInterval(t); this._yenile(); }
    }, 3000);
  },

  _rozetGoster() {
    try {
      if (this._rozet) return;
      const css = '#ahmet_upd{position:fixed;top:calc(52px + env(safe-area-inset-top,0px));' +
        'left:50%;transform:translateX(-50%);z-index:9800;background:#2e7d32;color:#fff;' +
        'font:700 13px system-ui,sans-serif;padding:8px 14px;border-radius:18px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer;white-space:nowrap}';
      if (!document.getElementById('ahmet_upd_css')) {
        const s = document.createElement('style');
        s.id = 'ahmet_upd_css'; s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
      }
      const b = document.createElement('div');
      b.id = 'ahmet_upd';
      b.textContent = '↻ Yeni sürüm hazır — dokun';
      b.addEventListener('click', () => this._yenile());
      document.body.appendChild(b);
      this._rozet = b;
      // Rozet metni de çevrilsin
      try { if (window.I18N && window.I18N.dom) window.I18N.dom(b); } catch (e) {}
    } catch (e) {}
  },

  // Ayarlardan elle tetiklenebilir
  simdiKontrolEt() {
    try { if (this._reg) this._reg.update(); } catch (e) {}
    return true;
  },

  selfTest() {
    const r = {
      varMi: typeof Guncelleme === 'object',
      initVar: typeof Guncelleme.init === 'function',
      oyundaVar: typeof Guncelleme._oyunda === 'function',
      dongudenKorumali: typeof Guncelleme._yenilendi === 'boolean'
    };
    r.allPass = r.varMi && r.initVar && r.oyundaVar && r.dongudenKorumali;
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.Guncelleme = Guncelleme;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Guncelleme.init());
  } else {
    Guncelleme.init();
  }
}
