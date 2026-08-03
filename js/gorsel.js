'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL — Ultra görsel katmanı (30 Tmz)
//
// NE YAPAR: `Renderer.drawGame` bittikten sonra ekrana son-işlem (post-process)
// uygular. Çizim koduna HİÇ DOKUNMAZ — hookups.js şablonuyla sarmalanır.
//
// EFEKTLER (hepsi Kalite kademesine bağlı, ULTRA varsayılan):
//   · Biyoma özel renk derecelendirme (51 harita, ayrı palet)
//   · Bloom / parlama          · Hacimsel ışık huzmesi
//   · Vinyet                   · Film grain
//   · Islak zemin yansıması    · Hız bulanıklığı
//   · Kromatik sapma           · Derinlik sisi
//
// 🔴 PERFORMANS KURALI — BU DOSYADA GRADIENT ÜRETME.
//    Ölçüldü (§8B.27/B5): oyun kare başına zaten 83 gradient üretiyor ve
//    `_drawPollen` tek başına 26 tanesini üretiyordu. Buradaki TÜM gradientler
//    `_gr()` ile ÖNBELLEKLENİR; anahtar (tip + boyut + palet) değişmedikçe
//    yeniden üretilmez. Yeni efekt eklerken `ctx.createLinearGradient` ÇAĞIRMA,
//    `this._gr(...)` kullan. Doğrulayıcı bunu kontrol eder.
//
// 🔴 getImageData KULLANMA. Piksel okumak ana iş parçacığını durdurur ve
//    §C1'de ölçülen "sahte 1.699 ms kare" artefaktını üretir. Tüm efektler
//    `drawImage` + `globalCompositeOperation` + `ctx.filter` ile yapılır
//    (GPU hızlandırmalı).
// ═══════════════════════════════════════════════════════════════════════════
const Gorsel = {
  _hazir: false,
  _sarildi: false,
  _grOnbellek: {},
  _grUretim: 0,          // ölçüm: bu karede kaç YENİ gradient üretildi
  _tampon: null,         // bloom için küçük offscreen
  _tampon2: null,
  _eskiAtla: null,       // PERF(31 Tmz): kare başına nesne üretmemek için
  _eskiAtlaKaynak: null,
  _grainKare: null,
  _t: 0,
  _sonVx: 0,
  _sonW: 0,              // BUGFIX(30 Tmz denetim): son çizim boyutu — bkz. sonIslem
  _sonH: 0,

  // ── 51 HARİTA İÇİN BİYOM PALETİ ────────────────────────────────────────
  // tint: renk katmanı · pow: yoğunluk · doy: doygunluk · kon: kontrast
  // bloom: parlama rengi · sis: derinlik sisi rengi · gun: güneş rengi
  PALET: {
    countryside:    { tint:'#7fc24a', pow:0.10, doy:1.18, kon:1.06, bloom:'#fff3c4', sis:'#cfe8ff', gun:'#fff0b0' },
    desert:         { tint:'#e8a24a', pow:0.18, doy:1.12, kon:1.10, bloom:'#ffdf9a', sis:'#f6dcae', gun:'#ffd070' },
    winter:         { tint:'#7fb0e8', pow:0.20, doy:0.92, kon:1.12, bloom:'#dff0ff', sis:'#e8f4ff', gun:'#cfe4ff' },
    beach:          { tint:'#4fc3e8', pow:0.14, doy:1.22, kon:1.05, bloom:'#fff6d0', sis:'#d4f0ff', gun:'#ffe9a8' },
    mountains:      { tint:'#8fa2b8', pow:0.16, doy:1.02, kon:1.10, bloom:'#e6f0ff', sis:'#c8d6e6', gun:'#ffe6c0' },
    city:           { tint:'#9fb4c8', pow:0.12, doy:1.06, kon:1.08, bloom:'#ffeec0', sis:'#d8e4f0', gun:'#ffe4a0' },
    arctic:         { tint:'#8ed8f0', pow:0.24, doy:0.88, kon:1.16, bloom:'#eafaff', sis:'#e0f6ff', gun:'#d0eaff' },
    jungle:         { tint:'#3f9a3a', pow:0.22, doy:1.24, kon:1.08, bloom:'#e8ffc0', sis:'#a8d8a0', gun:'#f0ffb0' },
    mars:           { tint:'#d4622a', pow:0.28, doy:1.10, kon:1.14, bloom:'#ffb070', sis:'#e0a070', gun:'#ff9050' },
    cave:           { tint:'#3a4a6a', pow:0.34, doy:0.86, kon:1.24, bloom:'#8fd0ff', sis:'#20304a', gun:'#6090c0' },
    highland:       { tint:'#6ea86a', pow:0.14, doy:1.10, kon:1.08, bloom:'#f0ffd0', sis:'#c0dcc8', gun:'#fff0c0' },
    swamp:          { tint:'#4a6a3a', pow:0.28, doy:0.94, kon:1.10, bloom:'#c8e890', sis:'#7a9068', gun:'#d8e8a0' },
    volcano:        { tint:'#e04a1a', pow:0.32, doy:1.16, kon:1.22, bloom:'#ffa040', sis:'#5a2418', gun:'#ff7030' },
    underwater:     { tint:'#1a7ab0', pow:0.38, doy:0.96, kon:1.10, bloom:'#70e0ff', sis:'#0e5a88', gun:'#80d8ff' },
    moon:           { tint:'#8a90a8', pow:0.26, doy:0.72, kon:1.20, bloom:'#dfe8ff', sis:'#2a3048', gun:'#e8f0ff' },
    neon_city:      { tint:'#c040e0', pow:0.30, doy:1.34, kon:1.20, bloom:'#ff60ff', sis:'#2a1040', gun:'#a050ff' },
    wasteland:      { tint:'#9a8a5a', pow:0.26, doy:0.88, kon:1.12, bloom:'#e8d8a0', sis:'#8a7a58', gun:'#e0c880' },
    canyon:         { tint:'#c07040', pow:0.22, doy:1.12, kon:1.10, bloom:'#ffc890', sis:'#c89870', gun:'#ffb060' },
    otoyol:         { tint:'#8090a8', pow:0.12, doy:1.04, kon:1.08, bloom:'#ffeec8', sis:'#c0ccdc', gun:'#ffe0a0' },
    dag:            { tint:'#7a8fa8', pow:0.18, doy:1.00, kon:1.12, bloom:'#e8f2ff', sis:'#b8c8dc', gun:'#ffe8c0' },
    hotwheels:      { tint:'#ff5a20', pow:0.24, doy:1.40, kon:1.18, bloom:'#ffb040', sis:'#402018', gun:'#ff8030' },
    construction:   { tint:'#d8a830', pow:0.20, doy:1.10, kon:1.10, bloom:'#ffe090', sis:'#c8b080', gun:'#ffd060' },
    blizzard:       { tint:'#a8c8e8', pow:0.30, doy:0.82, kon:1.14, bloom:'#f0faff', sis:'#dcecff', gun:'#c8e0f8' },
    candy:          { tint:'#ff70c0', pow:0.24, doy:1.42, kon:1.06, bloom:'#ffd0f0', sis:'#ffd8ec', gun:'#fff0c0' },
    toxic:          { tint:'#7ae02a', pow:0.32, doy:1.30, kon:1.18, bloom:'#c0ff40', sis:'#3a5018', gun:'#a0ff50' },
    rollercoaster:  { tint:'#e05a90', pow:0.20, doy:1.30, kon:1.10, bloom:'#ffc0e0', sis:'#e8b8d0', gun:'#ffd090' },
    skyland:        { tint:'#7fd0ff', pow:0.18, doy:1.20, kon:1.06, bloom:'#ffffff', sis:'#d8f0ff', gun:'#fff6d0' },
    lava_river:     { tint:'#ff3a10', pow:0.36, doy:1.24, kon:1.26, bloom:'#ff9020', sis:'#601c10', gun:'#ff6020' },
    crystal_cave:   { tint:'#60a0ff', pow:0.34, doy:1.18, kon:1.20, bloom:'#b0e0ff', sis:'#182848', gun:'#90c0ff' },
    cyber_grid:     { tint:'#20e0d0', pow:0.32, doy:1.36, kon:1.24, bloom:'#40ffe8', sis:'#0a2030', gun:'#30ffd8' },
    autumn:         { tint:'#e08a30', pow:0.24, doy:1.22, kon:1.08, bloom:'#ffd090', sis:'#e0c098', gun:'#ffc070' },
    glacier:        { tint:'#78c8f0', pow:0.28, doy:0.92, kon:1.18, bloom:'#e8faff', sis:'#d0eeff', gun:'#c0e8ff' },
    savanna:        { tint:'#d8b050', pow:0.22, doy:1.16, kon:1.08, bloom:'#ffe8a0', sis:'#dcc890', gun:'#ffcc60' },
    ruins:          { tint:'#a89878', pow:0.24, doy:1.02, kon:1.12, bloom:'#f0e0b8', sis:'#b8a888', gun:'#f0d8a0' },
    mushroom:       { tint:'#b060d0', pow:0.30, doy:1.30, kon:1.14, bloom:'#e0a0ff', sis:'#4a2858', gun:'#c080e0' },
    stormpeak:      { tint:'#5a7090', pow:0.32, doy:0.86, kon:1.22, bloom:'#c0e0ff', sis:'#48586e', gun:'#a0c0e0' },
    sakura:         { tint:'#ff9ec8', pow:0.22, doy:1.26, kon:1.04, bloom:'#ffe0ee', sis:'#ffd8e6', gun:'#fff0d8' },
    graveyard:      { tint:'#5a6a80', pow:0.34, doy:0.80, kon:1.22, bloom:'#a0d0c0', sis:'#28303e', gun:'#88a8b8' },
    carnival:       { tint:'#ff50a0', pow:0.26, doy:1.44, kon:1.14, bloom:'#ffd060', sis:'#3a1830', gun:'#ffb040' },
    windmill:       { tint:'#8ec050', pow:0.16, doy:1.16, kon:1.06, bloom:'#fff0c0', sis:'#cfe4c0', gun:'#ffe8a8' },
    bamboo:         { tint:'#4aa860', pow:0.24, doy:1.20, kon:1.08, bloom:'#d8ffb0', sis:'#98c0a0', gun:'#e8ffb8' },
    rainbow_road:   { tint:'#a060ff', pow:0.26, doy:1.50, kon:1.16, bloom:'#ffffff', sis:'#2a1848', gun:'#ff80ff' },
    sandstorm:      { tint:'#c8a060', pow:0.40, doy:0.94, kon:1.06, bloom:'#e8d0a0', sis:'#c0a878', gun:'#e0b878' },
    crystal_forest: { tint:'#70d0e0', pow:0.30, doy:1.26, kon:1.18, bloom:'#c0f8ff', sis:'#2a4a58', gun:'#a0e8ff' },
    desert_oasis:   { tint:'#40c0a0', pow:0.20, doy:1.24, kon:1.08, bloom:'#ffe8b0', sis:'#c8dcc0', gun:'#ffd888' },
    junkyard:       { tint:'#8a7a60', pow:0.28, doy:0.94, kon:1.14, bloom:'#d8c090', sis:'#7a6c54', gun:'#d0b070' },
    cyberpunk_roofs:{ tint:'#e030a0', pow:0.34, doy:1.38, kon:1.24, bloom:'#ff50d0', sis:'#180a28', gun:'#c040ff' },
    cloud_kingdom:  { tint:'#b0d8ff', pow:0.18, doy:1.14, kon:1.02, bloom:'#ffffff', sis:'#e8f4ff', gun:'#fff8e0' },
    meteor_field:   { tint:'#ff7030', pow:0.32, doy:1.20, kon:1.22, bloom:'#ffb060', sis:'#301828', gun:'#ff9040' },
    firefly_forest: { tint:'#40a860', pow:0.34, doy:1.16, kon:1.18, bloom:'#d8ff70', sis:'#18301e', gun:'#a0e060' },
    aurora_peak:    { tint:'#50e0b0', pow:0.30, doy:1.24, kon:1.16, bloom:'#a0ffe0', sis:'#182a3a', gun:'#80ffd0' }
  },
  _VARSAYILAN_PALET: { tint:'#8fa8c0', pow:0.14, doy:1.10, kon:1.08, bloom:'#ffeec8', sis:'#cfe0f0', gun:'#ffe8b0' },

  palet(mapId) { return this.PALET[mapId] || this._VARSAYILAN_PALET; },

  // ── ÖNBELLEKLİ GRADIENT ────────────────────────────────────────────────
  // ⚠ Bu dosyada gradient ÜRETMEK yalnız buradan geçer. Anahtar aynıysa
  //   yeniden üretilmez — kare başına gradient sayısı sabit kalır.
  _gr(ctx, anahtar, uret) {
    let g = this._grOnbellek[anahtar];
    if (!g) { g = uret(ctx); this._grOnbellek[anahtar] = g; this._grUretim++; }
    return g;
  },
  // ⚠ Tam sıfırlama: gradientlerle birlikte modül listesi önbelleği de düşer
  //   (yeniden boyutlandırma / kalite değişimi sonrası taze tarama).
  _onbellekTemizle() { this._grOnbellek = {}; this._modulOnbellek = null; },

  _kalite(ad) {
    try { if (typeof Kalite !== 'undefined') return Kalite.ayar(ad); } catch (e) {}
    return 0;
  },

  // ── Offscreen tamponlar (bloom/bulanıklık için) ────────────────────────
  _tamponHazirla(W, H) {
    const bw = Math.max(32, Math.round(W / 4)), bh = Math.max(32, Math.round(H / 4));
    if (!this._tampon || this._tampon.width !== bw || this._tampon.height !== bh) {
      try {
        this._tampon = document.createElement('canvas');
        this._tampon.width = bw; this._tampon.height = bh;
        this._tampon2 = document.createElement('canvas');
        this._tampon2.width = bw; this._tampon2.height = bh;
      } catch (e) { this._tampon = null; }
      this._onbellekTemizle();     // boyut değişti → ekran-uzayı gradientleri geçersiz
    }
    return !!this._tampon;
  },

  // ═════════════════════════════════════════════════════════════════════
  // ANA GİRİŞ — Renderer.drawGame'den SONRA çağrılır (dünya dönüşümü KAPALI)
  // ═════════════════════════════════════════════════════════════════════
  // ── AĞIR EFEKT MODÜLLERİ (30 Tmz) ────────────────────────────────────────
  // 7 ayrı dosya, 49 efekt. Her biri `{ad, hazir(W,H), ciz(ctx,W,H,ba), selfTest()}`
  // arayüzünü uygular. Burada SIRAYLA çağrılırlar — SIRA ÖNEMLİDİR:
  //   atmosfer (arka plan sisi/huzme) → ışık (güneş, gölge) → yansıma (zemin)
  //   → hava (parçacık) → hareket (bulanıklık) → lens (bloom/flare) → renk (derecelendirme)
  // Renk EN SONDA çünkü tüm katmanları birlikte derecelendirmeli.
  _MODUL_SIRA: ['GorselAtmosfer', 'GorselIsik', 'GorselYansima', 'GorselHava',
                'GorselHareket', 'GorselLens', 'GorselRenk'],

  // 🔴 PERF(31 Tmz · §8B.33) — `eval` SICAK YOLDAN ÇIKARILDI.
  //   Eskiden bu fonksiyon KARE BAŞINA 7 kez `eval()` çağırıyordu. `eval`
  //   yalnız yavaş değildir; içinde geçtiği fonksiyonun tamamının JIT
  //   iyileştirmesini iptal eder (V8 "eval içeren kapsam" = sözlük modu).
  //   ÖLÇÜLDÜ: 7 eval/kare → 0 eval/kare. Çizim çağrısı DEĞİŞMEZ.
  //   ⚠ Liste ÖNBELLEKLENİR ama 7 modülün hepsi bulunana kadar yeniden
  //     taranır — modüller `index.html`'de bu dosyadan ÖNCE yüklenir, yine de
  //     geç yüklenen bir modülü kaçırmamak için eksikken önbellek dondurulmaz.
  _modulOnbellek: null,
  _MODUL_TAM: 7,

  _modulBul() {
    const o = this._modulOnbellek;
    if (o && o.length >= this._MODUL_TAM) return o;
    const m = [];
    const g = (typeof window !== 'undefined') ? window : null;
    for (const ad of this._MODUL_SIRA) {
      let x = null;
      // `typeof` ile ara (bare global tuzağı: `window.GorselIsik` OLMAYABİLİR).
      try { x = (g && g[ad]) || null; } catch (e) { x = null; }
      if (!x) { try { x = (0, eval)('typeof ' + ad + " !== 'undefined' ? " + ad + ' : null'); } catch (e) { x = null; } }
      if (x && typeof x.ciz === 'function') m.push(x);
    }
    this._modulOnbellek = m;
    return m;
  },

  // Modüllere geçirilen bağlam. ⚠ `gr` bizim ÖNBELLEĞİMİZ — modüller kendi
  // gradient önbelleğini tutmaz, hepsi tek yerden sayılır (kare başına 0 hedefi).
  // 🔴 PERF(31 Tmz) — nesne + 2 kapanış (closure) KARE BAŞINA üretiliyordu.
  //   Artık TEK nesne yeniden kullanılır, alanları tazelenir. Modüller bağlamı
  //   saklamaz (yalnız okur), bu yüzden paylaşım güvenlidir.
  //   ⚠ `gorsel-hava.js` `_onIsitGr` ile `ba.gr` REFERANSINI karşılaştırıyor;
  //     referans artık SABİT kaldığı için ön ısıtma da gereksiz tekrarlanmaz.
  _baglamNesne: null,
  _baglam(mapId, p, vehicle, dt) {
    let b = this._baglamNesne;
    if (!b) {
      const self = this;
      b = this._baglamNesne = {
        mapId: '', palet: null, vehicle: null, camera: null, terrain: null,
        t: 0, dt: 0.016,
        kalite: function (ad) { return self._kalite(ad); },
        gr: function (anahtar, uretici) { return self._gr(self._sonCtx, anahtar, uretici); }
      };
    }
    b.mapId = mapId;
    b.palet = p;
    b.vehicle = vehicle || null;
    b.camera  = (typeof Camera  !== 'undefined') ? Camera  : null;
    b.terrain = (typeof Terrain !== 'undefined') ? Terrain : null;
    b.t = this._t;
    b.dt = dt || 0.016;
    return b;
  },

  sonIslem(ctx, W, H, mapId, vehicle, dt) {
    if (!ctx || !W || !H) return;
    // 🔴 BUGFIX(30 Tmz · denetim) — SINIRSIZ BÜYÜYEN GRADIENT ÖNBELLEĞİ.
    //   Ekran-uzayı gradientlerinin anahtarı `W+'x'+H` içerir; boyut değişince
    //   eskiler bir daha ASLA kullanılmaz ama önbellekte kalırdı.
    //   `_onbellekTemizle()`nin tek çağırıcısı `_tamponHazirla` idi; 7 ağır
    //   modül yüklüyken `_bloom`/`_hizEfekti` `eskiAtla` ile ATLANDIĞI için
    //   o yol hiç koşmuyor. ÖLÇÜLDÜ: `_tamponHazirla` 0 çağrı, her yeni W×H
    //   +17,1 gradient, 300 yeniden boyutlandırmadan sonra 5.650 nesne.
    //   (Aynı sınıf hata daha önce `UI._toasts`/`pendingToast` ile yaşandı.)
    //   ⚠ Her karede DEĞİL, yalnız boyut DEĞİŞİNCE temizlenir — yoksa önbellek
    //     anlamsızlaşır ve kare başına gradient sayısı 0'dan fırlar.
    if (this._sonW !== W || this._sonH !== H) {
      this._sonW = W; this._sonH = H;
      this._onbellekTemizle();
    }
    this._grUretim = 0;
    this._t += (dt || 0.016);
    this._sonCtx = ctx;
    const p = this.palet(mapId);

    const moduller = this._modulBul();
    const ba = this._baglam(mapId, p, vehicle, dt);

    // ⚠ ÇAKIŞMA YÖNETİMİ: yeni modüller eski efektlerin GELİŞMİŞ hâli.
    //   İkisi birden çalışırsa efekt ÇİFT uygulanır (bloom iki kez → ekran patlar).
    //   Modül varsa eski karşılığı ATLANIR.
    // 🔴 PERF(31 Tmz) — `varMi` + `eskiAtla` KARE BAŞINA iki nesne üretiyordu.
    //   Modül listesi artık önbellekli olduğu için tablo da önbelleklenir;
    //   liste referansı değişmedikçe yeniden hesaplanmaz. TABLO İÇERİĞİ AYNI.
    let eskiAtla = this._eskiAtla;
    if (!eskiAtla || this._eskiAtlaKaynak !== moduller) {
      const varMi = {};
      for (const m of moduller) varMi[m.ad] = true;
      eskiAtla = this._eskiAtla = {
        islakZemin:  !!varMi.yansima,
        derinlikSis: !!varMi.atmosfer,
        isikHuzmesi: !!varMi.atmosfer,
        bloom:       !!varMi.lens,
        grade:       !!varMi.renk,
        hiz:         !!(varMi.hareket || varMi.lens),
        vinyet:      !!varMi.renk
      };
      this._eskiAtlaKaynak = moduller;
    }

    if (!eskiAtla.islakZemin)  { try { this._islakZemin(ctx, W, H, p, vehicle); } catch (e) {} }
    if (!eskiAtla.derinlikSis) { try { this._derinlikSis(ctx, W, H, p); } catch (e) {} }

    for (const m of moduller) {
      try { if (m.hazir) m.hazir(W, H); } catch (e) {}
      try { m.ciz(ctx, W, H, ba); } catch (e) {}
    }

    if (!eskiAtla.bloom)       { try { this._bloom(ctx, W, H, p); } catch (e) {} }
    if (!eskiAtla.isikHuzmesi) { try { this._isikHuzmesi(ctx, W, H, p); } catch (e) {} }
    if (!eskiAtla.grade)       { try { this._renkDerece(ctx, W, H, p); } catch (e) {} }
    if (!eskiAtla.hiz)         { try { this._hizEfekti(ctx, W, H, vehicle); } catch (e) {} }
    if (!eskiAtla.vinyet)      { try { this._vinyet(ctx, W, H, p); } catch (e) {} }
    // Film grain'in modül karşılığı YOK — her zaman en sonda çalışır.
    try { this._grain(ctx, W, H); } catch (e) {}
  },

  // ── 1) BLOOM / PARLAMA ─────────────────────────────────────────────────
  // Parlak bölgeleri küçült → bulanıklaştır → 'lighter' ile geri bindir.
  // getImageData YOK; ctx.filter GPU'da çalışır.
  _bloom(ctx, W, H, p) {
    const g = this._kalite('bloom');
    if (g <= 0 || !this._tamponHazirla(W, H)) return;
    const t = this._tampon, tc = t.getContext('2d');
    const t2 = this._tampon2, t2c = t2.getContext('2d');
    tc.clearRect(0, 0, t.width, t.height);
    // 🔴 PARLAK-GEÇİR EŞİĞİ — canlı ekran görüntüsüyle ayarlandı (30 Tmz).
    //    İlk değer `brightness(1.35) contrast(2.1)` idi: TÜM sahneyi geçiriyordu,
    //    ekran bembeyaz patlıyor ve arazi seçilmiyordu (oynanamaz hâle geldi).
    //    Doğru yaklaşım: önce KARART (brightness<1), sonra sert kontrastla yalnız
    //    gerçekten parlak pikselleri ayakta bırak.
    try { tc.filter = 'brightness(0.78) contrast(3.4) saturate(1.25)'; } catch (e) {}
    tc.drawImage(ctx.canvas, 0, 0, t.width, t.height);
    tc.filter = 'none';
    // iki geçişli bulanıklaştırma (yatay+dikey yerine tek geniş blur — daha ucuz)
    t2c.clearRect(0, 0, t2.width, t2.height);
    try { t2c.filter = 'blur(' + (5 * g).toFixed(1) + 'px)'; } catch (e) {}
    t2c.drawImage(t, 0, 0);
    t2c.filter = 'none';

    const eski = ctx.globalCompositeOperation, ea = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    // ⚠ 0.42 → 0.20: ilk değer sahneyi yıkıyordu (canlı ekran görüntüsü kanıtı).
    ctx.globalAlpha = 0.20 * g;
    ctx.drawImage(t2, 0, 0, W, H);
    // ikinci, daha geniş "hale" katı — yalnız ULTRA'da ve çok hafif
    if (g >= 0.9) {
      ctx.globalAlpha = 0.08 * g;
      ctx.drawImage(t2, -W * 0.01, -H * 0.01, W * 1.02, H * 1.02);
    }
    ctx.globalCompositeOperation = eski; ctx.globalAlpha = ea;
  },

  // ── 2) BİYOM RENK DERECELENDİRME ───────────────────────────────────────
  _renkDerece(ctx, W, H, p) {
    const g = this._kalite('grade');
    if (g <= 0) return;
    const eski = ctx.globalCompositeOperation, ea = ctx.globalAlpha;

    // a) renk tonu (biyom kimliği)
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = Math.min(0.85, p.pow * g * 2.0);
    ctx.fillStyle = p.tint;
    ctx.fillRect(0, 0, W, H);

    // b) doygunluk/kontrast — üst-alt ışık kaldırma (lift/gamma yerine gradyan)
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(0.6, (p.kon - 1) * 3.2 * g);
    ctx.fillStyle = this._gr(ctx, 'kon|' + W + 'x' + H + '|' + p.tint, (c) => {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.5, 'rgba(128,128,128,0.0)');
      gr.addColorStop(1, 'rgba(0,0,0,0.55)');
      return gr;
    });
    ctx.fillRect(0, 0, W, H);

    // c) sıcak üst / soğuk alt ayrımı (sinematik split-tone)
    if (g >= 0.8) {
      ctx.globalCompositeOperation = 'color-dodge';
      ctx.globalAlpha = 0.06 * g;
      ctx.fillStyle = this._gr(ctx, 'split|' + W + 'x' + H + '|' + p.gun, (c) => {
        const gr = c.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, p.gun);
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        return gr;
      });
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = eski; ctx.globalAlpha = ea;
  },

  // ── 3) HACİMSEL IŞIK HUZMESİ ───────────────────────────────────────────
  _isikHuzmesi(ctx, W, H, p) {
    const g = this._kalite('isikHuzmesi');
    if (g <= 0) return;
    const eski = ctx.globalCompositeOperation, ea = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.09 * g;   // 0.16 → 0.09
    ctx.fillStyle = this._gr(ctx, 'huzme|' + W + 'x' + H + '|' + p.gun, (c) => {
      const gr = c.createRadialGradient(W * 0.78, H * 0.14, 0, W * 0.78, H * 0.14, Math.max(W, H) * 0.62);
      gr.addColorStop(0, p.gun);
      gr.addColorStop(0.35, 'rgba(255,240,200,0.16)');
      gr.addColorStop(1, 'rgba(255,240,200,0)');
      return gr;
    });
    ctx.fillRect(0, 0, W, H);

    // ince huzme çizgileri (ultra) — hafif salınımlı
    if (g >= 0.9) {
      ctx.globalAlpha = 0.028 * g;  // 0.05 → 0.028
      ctx.fillStyle = p.gun;
      const sx = W * 0.78, sy = H * 0.14;
      for (let i = 0; i < 6; i++) {
        const a = -0.95 + i * 0.16 + Math.sin(this._t * 0.25 + i) * 0.015;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);
        ctx.fillRect(0, -3 - i * 0.6, Math.max(W, H) * 1.25, 6 + i * 1.2);
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = eski; ctx.globalAlpha = ea;
  },

  // ── 4) DERİNLİK SİSİ ───────────────────────────────────────────────────
  _derinlikSis(ctx, W, H, p) {
    const g = this._kalite('derinlikSis');
    if (g <= 0) return;
    const ea = ctx.globalAlpha;
    ctx.globalAlpha = 0.18 * g;   // 0.30 → 0.18
    ctx.fillStyle = this._gr(ctx, 'sis|' + W + 'x' + H + '|' + p.sis, (c) => {
      const gr = c.createLinearGradient(0, H * 0.30, 0, H * 0.92);
      gr.addColorStop(0, this._rgba(p.sis, 0.55));
      gr.addColorStop(0.55, this._rgba(p.sis, 0.18));
      gr.addColorStop(1, this._rgba(p.sis, 0));
      return gr;
    });
    ctx.fillRect(0, H * 0.30, W, H * 0.62);
    ctx.globalAlpha = ea;
  },

  // ── 5) ISLAK ZEMİN YANSIMASI ───────────────────────────────────────────
  // Ekranın alt şeridini dikey aynalayıp düşük alfayla bindirir → ıslak asfalt.
  _islakZemin(ctx, W, H, p, vehicle) {
    const g = this._kalite('islakZemin');
    if (g <= 0) return;
    const ea = ctx.globalAlpha, eski = ctx.globalCompositeOperation;
    const yerY = H * 0.72;
    ctx.save();
    ctx.globalAlpha = 0.07 * g;   // 0.16 → 0.07 (canlı görüntü: yansıma sahneyi bastırıyordu)
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(0, yerY * 2);
    ctx.scale(1, -1);
    try { ctx.drawImage(ctx.canvas, 0, 0, W, yerY, 0, 0, W, yerY); } catch (e) {}
    ctx.restore();
    // yansımayı aşağı doğru sönümle
    ctx.globalCompositeOperation = 'destination-over';
    ctx.globalAlpha = ea;
    ctx.globalCompositeOperation = eski;
  },

  // ── 6) HIZ BULANIKLIĞI + KROMATİK SAPMA ────────────────────────────────
  _hizEfekti(ctx, W, H, vehicle) {
    const gb = this._kalite('hizBulaniklik');
    const gk = this._kalite('kromatik');
    if (!vehicle) return;
    const vx = Math.abs(vehicle.vx || 0);
    this._sonVx = this._sonVx * 0.9 + vx * 0.1;
    const hiz = Math.min(1, Math.max(0, (this._sonVx - 260) / 620));   // 260'tan sonra başlar
    if (hiz <= 0.01) return;
    const eski = ctx.globalCompositeOperation, ea = ctx.globalAlpha;

    // kenar hız çizgileri (radyal bulanıklık taklidi — ucuz)
    if (gb > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.10 * gb * hiz;
      ctx.fillStyle = this._gr(ctx, 'hizkenar|' + W + 'x' + H, (c) => {
        const gr = c.createRadialGradient(W * 0.5, H * 0.55, Math.min(W, H) * 0.24, W * 0.5, H * 0.55, Math.max(W, H) * 0.72);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(1, 'rgba(255,255,255,0.5)');
        return gr;
      });
      ctx.fillRect(0, 0, W, H);
    }

    // kromatik sapma: ekranı iki kez, minik kaymayla, renk süzgeciyle bindir
    if (gk > 0 && this._tamponHazirla(W, H)) {
      const k = 2.2 * gk * hiz;
      const t = this._tampon, tc = t.getContext('2d');
      tc.clearRect(0, 0, t.width, t.height);
      tc.drawImage(ctx.canvas, 0, 0, t.width, t.height);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 * gk * hiz;
      ctx.drawImage(t, -k, 0, W, H);
      ctx.drawImage(t, k, 0, W, H);
    }
    ctx.globalCompositeOperation = eski; ctx.globalAlpha = ea;
  },

  // ── 7) VİNYET ──────────────────────────────────────────────────────────
  _vinyet(ctx, W, H, p) {
    const g = this._kalite('vignette');
    if (g <= 0) return;
    const ea = ctx.globalAlpha;
    ctx.globalAlpha = g;
    ctx.fillStyle = this._gr(ctx, 'vinyet|' + W + 'x' + H, (c) => {
      const gr = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.76);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.7, 'rgba(0,0,0,0.16)');
      gr.addColorStop(1, 'rgba(0,0,0,0.62)');
      return gr;
    });
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = ea;
  },

  // ── 8) FİLM GRAIN ──────────────────────────────────────────────────────
  // ⚠ Her karede gürültü ÜRETME — bir kez üretilip kaydırılarak kullanılır.
  _grain(ctx, W, H) {
    const g = this._kalite('grain');
    if (g <= 0) return;
    if (!this._grainKare) {
      try {
        const n = 128, c = document.createElement('canvas');
        c.width = n; c.height = n;
        const cc = c.getContext('2d');
        const img = cc.createImageData(n, n);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 128 + ((Math.random() * 2 - 1) * 60);
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        cc.putImageData(img, 0, 0);
        this._grainKare = c;
      } catch (e) { this._grainKare = null; return; }
    }
    // 🔴 DESEN ÖNBELLEĞİ (2 Ağu) — `dogrula-dolgu.js` ölçtü: burası kare başına
    // 1 yeni `createPattern` üretiyordu ("yeni desen/kare: 1.00"). Gradyan
    // tarafında kare başına üretim 0 iken desen kaçaktı. `_grainKare` ömür boyu
    // DEĞİŞMEDİĞİ için desen de değişmez; bir kez üretilip saklanır.
    // ⚠ Anahtar `ctx` — konak tuvali değiştirirse (boyut/bağlam yenilenmesi)
    //   desen yeniden üretilir. Aynı ctx ile kare başına üretim = 0.
    if (!this._grainDesen || this._grainDesenCtx !== ctx) {
      try {
        this._grainDesen = ctx.createPattern(this._grainKare, 'repeat');
        this._grainDesenCtx = ctx;
      } catch (e) { this._grainDesen = null; this._grainDesenCtx = null; }
    }
    const pat = this._grainDesen;
    if (!pat) return;
    const eski = ctx.globalCompositeOperation, ea = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = g;
    const ox = (this._t * 137) % 128, oy = (this._t * 211) % 128;
    ctx.save();
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat; ctx.fillRect(0, 0, W + 128, H + 128);
    ctx.restore();
    ctx.globalCompositeOperation = eski; ctx.globalAlpha = ea;
  },

  // ── yardımcı ───────────────────────────────────────────────────────────
  _rgba(hex, a) {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  },

  // ── KURULUM: Renderer.drawGame'i additive sarmala ──────────────────────
  // ⚠ hookups.js şablonu: orijinal fonksiyon KORUNUR, sonrasına eklenir.
  //   İmza main.js:184'tekiyle AYNI olmalı:
  //   drawGame(vehicle, vehicleId, terrain, camera, particles, animTime)
  init() {
    if (this._sarildi) return false;
    if (typeof Renderer === 'undefined' || typeof Renderer.drawGame !== 'function') return false;
    const orj = Renderer.drawGame.bind(Renderer);
    const self = this;
    Renderer.drawGame = function (vehicle, vehicleId, terrain, camera, particles, animTime) {
      orj(vehicle, vehicleId, terrain, camera, particles, animTime);
      try {
        const ctx = Renderer.ctx, cv = Renderer.canvas;
        if (ctx && cv) {
          const mapId = (terrain && terrain.mapId) || 'countryside';
          self.sonIslem(ctx, cv.width, cv.height, mapId, vehicle, 0.016);
        }
      } catch (e) {}
    };
    this._sarildi = true;
    return true;
  },

  selfTest() {
    const r = {};
    r.paletSayisi = Object.keys(this.PALET).length >= 51;
    r.paletAlanlariTam = Object.keys(this.PALET).every(k => {
      const p = this.PALET[k];
      return p && p.tint && typeof p.pow === 'number' && typeof p.doy === 'number' &&
             typeof p.kon === 'number' && p.bloom && p.sis && p.gun;
    });
    r.rgbaCalisiyor = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.varsayilanPalet = !!this.palet('boyle_bir_harita_yok').tint;
    r.gradientOnbellek = (function (s) {
      s._onbellekTemizle();
      const sahte = { createLinearGradient: () => ({ addColorStop() {} }) };
      s._gr(sahte, 'test', c => c.createLinearGradient());
      const ilk = s._grUretim;
      s._gr(sahte, 'test', c => c.createLinearGradient());
      return s._grUretim === ilk;             // ikinci çağrı YENİ üretmemeli
    })(this);
    r.allPass = Object.keys(r).every(k => k === 'allPass' || r[k] === true);
    return r;
  }
};

if (typeof window !== 'undefined') window.Gorsel = Gorsel;
