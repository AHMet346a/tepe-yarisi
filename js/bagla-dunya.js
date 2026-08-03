'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// BAGLA-DUNYA — 4 ölü dünya/ortam modülünü gerçek oyuna bağlar (30 Tmz)
//
// NE BAĞLANDI (hepsi `js/game.js` içinde YAZILMIŞ ama HİÇBİR YERDEN
// çağrılmıyordu — çalışma zamanı ölçümü: 0 tetiklenme):
//   · WEATHER_SYSTEM_EXT  (game.js:2994)  → hava DURUM makinesi
//   · DayCycleSystem      (game.js:2600)  → gün/gece ZAMAN durumu
//   · TERRAIN_INTERACTION (game.js:3930)  → araç altındaki YÜZEY durumu
//   · EventSystem         (game.js:1677)  → dinamik olay (deprem/meteor/sel…)
//
// ── 🔴🔴 ÇAKIŞMA KONTROLÜ (EN KRİTİK BÖLÜM) ────────────────────────────────
// Bu dosya EKRANA HİÇBİR ŞEY ÇİZMEZ. Tek bir `ctx` çağrısı yoktur.
// Sebep: dört modülün de kendi çizim kodu var ve hepsinin GELİŞMİŞ hâli
// zaten `gorsel-*.js` katmanında çalışıyor. İkisi birden çalışırsa efekt
// ÇİFT uygulanır (30 Tmz'de yaşandı: ekran bembeyaz patladı).
//
//   BAĞLANMAYAN çizim              | ÇÜNKÜ zaten çizen
//   -------------------------------|----------------------------------------
//   WEATHER_SYSTEM_EXT             | gorsel-hava.js — yağmur çizgisi, kar
//     .drawWeatherOverlay (3146)   |   tanesi, tipi perdesi, kum fırtınası,
//                                  |   şimşek, cam damlası, cam buzu, kor/kül
//   WEATHER_SYSTEM_EXT             | gorsel-atmosfer.js — katmanlı sis,
//     fogAlpha dolgusu (3151)      |   atmosferik perspektif, ufuk parlaması
//   DayCycleSystem                 | gorsel-renk.js — `gunDongusu` anahtarı
//     .drawSkyGradient (2654)      |   (şafak/gündüz/alacakaranlık/gece renk
//     .getAmbientLight (2690)      |   kayması) + gorsel-isik.js güneş diski
//   TERRAIN_INTERACTION            | HUD zaten kalabalık (hookups.js notu);
//     .drawSurfaceIndicator (3975) |   ayrıca `roundRect` her tarayıcıda yok
//   EventSystem                    | dünya-uzayı çizimi; `drawEvents(ctx,camX)`
//     .drawEvents (1764)           |   kamera Y'sini hiç kullanmıyor → yanlış
//                                  |   yerde çizerdi. Olay SARSINTIYLA hissedilir.
//
// ▶ `gorsel.js`'in `eskiAtla` tablosuna DOKUNULMADI, hiçbir modül adı
//   eklenmedi/çıkarılmadı. Bu dosya `Gorsel`'in çizim akışına hiç girmez.
//
// ── ASIL DEĞER: HAVA ARTIK TETİKLENİYOR ────────────────────────────────────
// `gorsel-hava.js:118 _profil(mapId)` hava türünü YALNIZ harita kimliğinden
// türetiyor ve sonucu `_profilOnbellek`te saklıyordu. Tablosunda 20 harita
// var; kalan 31'i (countryside · city · beach · autumn · neon_city …)
// TAMAMEN HAVASIZ. Oyuncu en çok oynanan haritalarda hiçbir hava olayı
// göremiyordu — kullanıcının "hava efektleri hiç görülmedi" şikâyeti budur.
//
// ▶ ÇÖZÜM: `WEATHER_SYSTEM_EXT`in durumu her karede `_profilOnbellek[mapId]`
//   içine YAZILIR. `_profil()` önce önbelleğe baktığı için (gorsel-hava.js:121)
//   çizim katmanı artık CANLI havayı okur. Dosyaya tek satır dokunulmadı.
//   Taban her zaman `GorselHava.HAVA[mapId]`tir; hava onu ÖLÇEKLER/EKLER,
//   ASLA sıfırlamaz (mağara damlası, kristal buzu yerinde kalır).
//
// ── BİYOM TUTARLILIĞI ──────────────────────────────────────────────────────
// `WEATHER_SYSTEM_EXT.updateWeather` (3026-3034) havayı 8 tür arasından
// KÖRLEMESİNE seçiyor: çölde kar, Ay'da yağmur. Modül düzeltilmedi (additive
// kalmak için); bunun yerine otomatik seçim ÖNDEN engelleniyor — `next`
// alanı biz doldurunca `!this.next` koşulu düşer ve modülün kendi kör kurası
// hiç çalışmaz. Seçim `BIYOM` + `BIYOM_HAVA` tablolarından yapılır.
//
// ── OKURKEN BULUNAN 7 GERÇEK HATA (bu yüzden bazı metotlar ÇAĞRILMIYOR) ────
//  1. game.js:3094 `vehicle.grip = Math.max(0.2, vehicle.grip*0.88)` — HER
//     KAREDE çarpıyor. 60 kare sonra 0.88^60 ≈ 0.0004 → tutuş ~1 saniyede
//     tabana çakılır. (Üstel birikme; `applyWeatherToPhysics` bu yüzden
//     ÇAĞRILMIYOR.)
//  2. game.js:3076 `vehicle.frictionMod = w.friction` — ÜZERİNE YAZMA (bug #6
//     kalıbı). Ayrıca `frictionMod` alanını okuyan TEK BİR kod yok → ölü yazma.
//  3. game.js:3084 rüzgâr `vx`'e uçan/süzülen araç ayrımı yapmadan biniyor
//     (bug #10 kalıbı). Burada `ability==='fly'/'hover'` MUAF tutuldu.
//  4. game.js:3138 `p.x += wind*0.5` — `dt` YOK, kare hızına bağlı.
//  5. game.js:3963 `vehicle.hp` — araçta `hp` alanı YOK (physics.js'te hiç
//     geçmiyor) → lava hasarı fiilen ölü. Zaten hiçbir haritanın yüzeyi
//     'lava' değil (Terrain.MAPS: asfalt/grass/rock/sand/snow/ice/mud/metal).
//  6. game.js:3938 yüzey adı `asphalt`, oysa `Terrain.getSurfaceAt` `asfalt`
//     döndürüyor → eşleşmiyordu, her zeminde 'normal' çıkıyordu. `_YUZEY_AD`
//     tablosu bunu çevirir. ('rock'/'water'/'dirt' de tabloda yoktu.)
//  7. game.js:3956 buz kayması `vx`'i saniyede ~%50 SÖNDÜRÜYOR. Buz düşük
//     sürtünmedir (hızlı+kaygan), hız yutucu DEĞİL; ayrıca `physics.js:151`
//     `SURFACE_FRICTION` ile yüzey sürtünmesini ZATEN uyguluyor → çift
//     uygulama olurdu. (`applyToVehicle` bu yüzden ÇAĞRILMIYOR; yüzeyin
//     `slip` değeri yalnız havanın etkisini ÖLÇEKLEMEK için okunur.)
//
// ── KURALLAR ───────────────────────────────────────────────────────────────
//   · Gradient ÜRETİLMEZ, `getImageData` YOK (hiç çizim yok).
//   · Her alt sistem AYRI try/catch — biri patlarsa diğerleri çalışır (bug #18).
//   · `Kalite.ayar()` ile geçitli; DÜŞÜK kademede 8 hava anahtarı da 0 olduğu
//     için modül tamamen kapanır ve yazdığı profilleri GERİ ALIR.
//   · Bare global tuzağı: `window.Game` YOKTUR → `typeof X !== 'undefined'`.
//   · Alan adları: `fuelMax` · `onGround` · `width/height` · `ability`.
//   · Tutuş EZİLMEZ, ÇARPILIR (bug #6): koşu başındaki `_gripMul` taban alınır.
// ═══════════════════════════════════════════════════════════════════════════
const BaglaDunya = {
  ad: 'bagla-dunya',
  surum: '1.0',

  // ── iç durum ────────────────────────────────────────────────────────────
  _sarildi: false,
  _arac: null,             // koşu kimliği (araç nesnesi referansı)
  _mapId: null,
  _tabanGrip: 1,           // koşu başındaki `_gripMul` (araç+harita çarpanı)
  _guc: 0,                 // kalite geçidi (0..1) — 0 ise her şey kapalı
  _profilim: {},           // mapId → BENİM yazdığım profil nesnesi (yerinde güncellenir)
  _etkinImza: '',          // hangi efektler açık (değişince ön ısıtma tazelenir)
  _yuzey: 'normal',
  _tutus: 1,
  _olayGuc: 0,
  _kare: 0,

  // ═════════════════════════════════════════════════════════════════════════
  // BİYOM TABLOSU — 51 haritanın tamamı sınıflandırıldı
  // Kaynak: `Terrain.MAPS[*].surface` (45 harita) + `Gorsel.PALET` (51 anahtar;
  // volcano/underwater/moon/neon_city/wasteland/canyon MAPS'te yok ama
  // `Terrain.generate` `this.mapId`'yi koşulsuz atadığı için geçerli kimliktir).
  //   kapali   = kapalı/havasız (mağara, su altı, Ay, sanal ızgara) → HİÇ hava yok
  //   soguk    = kar/tipi/buz
  //   kurak    = kum fırtınası/sıcak dalgası
  //   volkanik = kor/kül/sıcak
  //   ilik     = yağmur/fırtına/sis (varsayılan)
  // ═════════════════════════════════════════════════════════════════════════
  BIYOM: {
    // kapalı — gökyüzü yok, hava olayı FİZİKSEL OLARAK anlamsız
    cave: 'kapali', crystal_cave: 'kapali', underwater: 'kapali',
    moon: 'kapali', cyber_grid: 'kapali', rainbow_road: 'kapali',
    // soğuk
    winter: 'soguk', arctic: 'soguk', glacier: 'soguk',
    blizzard: 'soguk', aurora_peak: 'soguk',
    // kurak
    desert: 'kurak', sandstorm: 'kurak', wasteland: 'kurak',
    canyon: 'kurak', mars: 'kurak', savanna: 'kurak', desert_oasis: 'kurak',
    // volkanik
    volcano: 'volkanik', lava_river: 'volkanik', meteor_field: 'volkanik'
    // kalan 30 harita → 'ilik' (varsayılan, `_biyom()` içinde)
  },

  // Biyom → izinli hava türleri ve ağırlıkları (WEATHER_TYPES anahtarları).
  // ⚠ `clear` bilerek baskın: hava bir DEĞİŞİKLİK olmalı, sürekli hâl değil.
  BIYOM_HAVA: {
    ilik:     [['clear', 46], ['cloudy', 24], ['rain', 18], ['storm', 6], ['fog', 6]],
    soguk:    [['clear', 38], ['cloudy', 24], ['snow', 28], ['fog', 10]],
    kurak:    [['clear', 46], ['cloudy', 16], ['sandstorm', 20], ['heatwave', 18]],
    volkanik: [['clear', 44], ['cloudy', 20], ['heatwave', 26], ['fog', 10]],
    kapali:   [['clear', 100]]
  },

  // Biyom → izinli olay türleri (EventSystem.EVENTS). Hava'ya bağlı olanlar
  // `_OLAY_HAVA` ile ayrıca kapılır: görülmeyen bir sel/ tipi sarsıntısı
  // oyuncuya "bug" gibi gelir; olay ancak havası varsa tetiklenir.
  BIYOM_OLAY: {
    ilik:     ['earthquake', 'falling_rock', 'storm', 'flood'],
    soguk:    ['falling_rock', 'ice_storm', 'storm'],
    kurak:    ['earthquake', 'sand_storm', 'meteor'],
    volkanik: ['falling_rock', 'meteor', 'earthquake'],
    kapali:   ['falling_rock', 'earthquake']
  },
  // Olay → çalışması için gereken hava türleri (yoksa her havada olabilir).
  _OLAY_HAVA: {
    storm:     ['rain', 'storm'],
    flood:     ['rain', 'storm'],
    ice_storm: ['snow'],
    sand_storm: ['sandstorm']
  },

  // `Terrain.getSurfaceAt` adı → `TERRAIN_INTERACTION.SURFACES` anahtarı.
  // 🔴 Hata 6: modül 'asphalt' yazıyor, arazi 'asfalt' döndürüyor.
  _YUZEY_AD: {
    asfalt: 'asphalt', asphalt: 'asphalt', grass: 'grass', sand: 'sand',
    snow: 'snow', ice: 'ice', mud: 'mud', metal: 'metal',
    rock: 'gravel',    // en yakın karşılık (sürtünme 0.7, kayma 0.05)
    water: 'mud',      // ıslak/sürükleyici — TERRAIN_INTERACTION'da 'water' yok
    dirt: 'normal', lava: 'lava'
  },

  // Hava türü → 8 görsel efekt şiddeti. Taban profil bununla ÖLÇEKLENİR/EKLENİR.
  // `carp` = taban profile uygulanan çarpan, `en` = alt sınır (havanın kendisi).
  _HAVA_ETKI: {
    clear:     { carp: 0.55, en: null },
    cloudy:    { carp: 0.80, en: null },
    fog:       { carp: 0.55, en: null },
    heatwave:  { carp: 0.40, en: null },
    rain:      { carp: 1.00, en: { yagmur: 0.55, damla: 0.60, ruzgar: 0.30 } },
    storm:     { carp: 1.00, en: { yagmur: 0.90, damla: 0.85, simsek: 0.70, ruzgar: 0.85 } },
    snow:      { carp: 1.00, en: { kar: 0.70, buz: 0.35, ruzgar: 0.30 } },
    sandstorm: { carp: 1.00, en: { kum: 0.85, ruzgar: 0.90 } }
  },

  _ANAHTAR: ['yagmur', 'damla', 'kar', 'tipi', 'kum', 'kor', 'kul', 'simsek', 'buz', 'ruzgar'],
  // Kalite geçidi bu 8 anahtarın EN BÜYÜĞÜ. DÜŞÜK kademede hepsi 0 → modül kapalı.
  _KALITE_ANAHTAR: ['yagmurCizgi', 'karTanesi', 'kumFirtina', 'korKul',
                    'simsek', 'camDamla', 'tipiPerde', 'camBuz'],

  // ═════════════════════════════════════════════════════════════════════════
  // BARE GLOBAL ERİŞİMİ — `window.Game` YOKTUR (CLAUDE.md "Kritik tuzaklar")
  // ⚠ `window.Audio` tarayıcının KENDİ sınıfıdır; burada ses kullanılmıyor.
  // ═════════════════════════════════════════════════════════════════════════
  _oyun()   { try { return (typeof Game !== 'undefined') ? Game : null; } catch (e) { return null; } },
  _arazi()  { try { const g = this._oyun(); if (g && g.terrain) return g.terrain;
                    return (typeof Terrain !== 'undefined') ? Terrain : null; } catch (e) { return null; } },
  _kamera() { try { return (typeof Camera !== 'undefined') ? Camera : null; } catch (e) { return null; } },
  _hava()   { try { return (typeof WEATHER_SYSTEM_EXT !== 'undefined') ? WEATHER_SYSTEM_EXT : null; } catch (e) { return null; } },
  _gun()    { try { return (typeof DayCycleSystem !== 'undefined') ? DayCycleSystem : null; } catch (e) { return null; } },
  _zemin()  { try { return (typeof TERRAIN_INTERACTION !== 'undefined') ? TERRAIN_INTERACTION : null; } catch (e) { return null; } },
  _olay()   { try { return (typeof EventSystem !== 'undefined') ? EventSystem : null; } catch (e) { return null; } },
  _gorHava(){ try { return (typeof GorselHava !== 'undefined') ? GorselHava : null; } catch (e) { return null; } },
  _gorsel() { try { return (typeof Gorsel !== 'undefined') ? Gorsel : null; } catch (e) { return null; } },

  _kalite(ad) {
    try { if (typeof Kalite !== 'undefined' && Kalite.ayar) return Kalite.ayar(ad) || 0; } catch (e) {}
    return 0;
  },
  // Kalite geçidi: 8 hava anahtarının en büyüğü (dusuk → 0).
  _guclac() {
    let m = 0;
    for (let i = 0; i < this._KALITE_ANAHTAR.length; i++) {
      const v = this._kalite(this._KALITE_ANAHTAR[i]);
      if (v > m) m = v;
    }
    return Math.max(0, Math.min(1, m));
  },

  _biyom(mapId) { return this.BIYOM[mapId] || 'ilik'; },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA KARE — `Game.update` sarmalayıcısından (hookups.js şablonu)
  // ═════════════════════════════════════════════════════════════════════════
  frame(dt) {
    const G = this._oyun();
    if (!G || G.state !== 'playing' || !G.vehicle) return;
    const v = G.vehicle;
    if (v.dead) return;
    dt = (typeof dt === 'number' && isFinite(dt)) ? Math.max(0, Math.min(0.05, dt)) : 0.016;
    const mapId = (G.terrain && G.terrain.mapId) || G.mapId || 'countryside';

    // Yeni koşu tespiti (Game.startRun'a DOKUNMADAN, additive kalmak için):
    // araç nesnesi veya harita değiştiyse yeni koşudur.
    if (this._arac !== v || this._mapId !== mapId) {
      try { this._kosuBasla(v, mapId); } catch (e) {}
    }
    this._kare++;
    this._guc = this._guclac();

    // DÜŞÜK kademe → tüm dünya katmanı kapalı; yazdığımız profilleri geri al.
    if (this._guc <= 0) {
      try { this.geriAl(); } catch (e) {}
      try { if (v._gripMul !== undefined) v._gripMul = this._tabanGrip; } catch (e) {}
      return;
    }

    try { this.zamanGuncelle(dt, mapId); } catch (e) {}
    try { this.yuzeyGuncelle(v, mapId); } catch (e) {}
    try { this.havaGuncelle(dt, mapId); } catch (e) {}
    try { this.profilBesle(mapId); } catch (e) {}
    try { this.fizikUygula(v, dt); } catch (e) {}
    try { this.olayGuncelle(dt, v, mapId); } catch (e) {}
  },

  _kosuBasla(v, mapId) {
    this._arac = v;
    this._mapId = mapId;
    // 🔴 Tutuş TABANI: `startRun` (game.js:289) araç çarpanını harita
    //    çarpanıyla zaten ÇARPMIŞ durumda. Hava bunu EZMEZ, üstüne çarpar.
    this._tabanGrip = (typeof v._gripMul === 'number' && isFinite(v._gripMul) && v._gripMul > 0)
      ? v._gripMul : 1;
    this._yuzey = 'normal';
    this._tutus = 1;
    this._olayGuc = 0;
    this._etkinImza = '';

    const W = this._hava();
    if (W) {
      // Koşu HAVAYLA başlayabilsin: eskiden ilk değişim 45 sn sonraydı ve
      // tipik koşu ondan önce bitiyordu → oyuncu hiç hava görmüyordu.
      const ilk = this._havaSec(mapId, this.geceMi(), null);
      W.startWeather(ilk);
      W.timer = 0;
      W.changeInterval = 22 + Math.random() * 40;
    }
    const E = this._olay();
    if (E) {
      try { E.clearAllEvents(); } catch (e) {}
      E.eventState.timer = 0;
      E.eventState.nextSpawn = 18 + Math.random() * 22;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) ZAMAN — DayCycleSystem (YALNIZ DURUM; gökyüzü/ışık ÇİZİLMEZ)
  // ═════════════════════════════════════════════════════════════════════════
  // Modülün kendi `updateTimeOfDay`'i çalıştırılır (arctic 0.5× / desert 1.3×
  // hız kuralları dahil), sonra sonuç EKRANDAKİ gün evresine yumuşakça
  // çekilir. Sebep: `gorsel-renk.js` gün döngüsünü KENDİ saatiyle çiziyor
  // (GUN_HIZI 0.0175 rad/sn ≈ 359 sn tam tur). İki saat farklı gösterirse
  // "gece" mantıkta başlar ama ekran gündüz kalır — sahne kendisiyle çelişir.
  // ⚠ Renk ÇİZİMİNE dokunulmaz; yalnız MANTIK saati ekrana UYDURULUR.
  zamanGuncelle(dt, mapId) {
    const D = this._gun();
    if (!D) return;
    // Görsel katmanla aynı periyot (359 sn) — modülün 2000 sn'lik varsayılanı
    // bir koşuda (1-3 dk) hiç gece göstermiyordu.
    D.daySpeed = 1 / 359;
    D.updateTimeOfDay(dt, mapId);

    const hedef = this._gorselFaz();
    if (hedef !== null) {
      // En kısa yoldan yaklaş (0/1 sınırında geri sarma yok).
      let d = hedef - D.timeOfDay;
      if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
      let t = D.timeOfDay + d * Math.min(1, dt * 0.5);
      t = t - Math.floor(t);
      D.setTimeOfDay(t);
    }
  },

  // `gorsel-renk.js` evre fazı → DayCycleSystem zamanı.
  // Görsel evreler: u=0 şafak · 0.25 gündüz · 0.5 alacakaranlık · 0.75 gece
  // DayCycle:       0.10 şafak · 0.45 gündüz · 0.75 alacakaranlık · 0.90 gece
  // (`getDaylight`: <0.2 şafak rampası, 0.2-0.7 tam gün, 0.7-0.8 akşam, >0.8 gece)
  // Aralar parça parça DOĞRUSAL eşlenir → dört evre de birebir örtüşür.
  _FAZ_U: [0, 0.25, 0.50, 0.75, 1.00],
  _FAZ_T: [0.10, 0.45, 0.75, 0.90, 1.10],
  _gorselFaz() {
    let t = null;
    try {
      const R = (typeof GorselRenk !== 'undefined') ? GorselRenk : null;
      const g = this._gorsel();
      if (R && g && typeof g._t === 'number' && isFinite(g._t)) {
        let u = ((g._t * (R.GUN_HIZI || 0.0175)) / (Math.PI * 2)) % 1;
        if (!isFinite(u)) return null;
        if (u < 0) u += 1;
        for (let i = 0; i < 4; i++) {
          if (u <= this._FAZ_U[i + 1]) {
            const k = (u - this._FAZ_U[i]) / (this._FAZ_U[i + 1] - this._FAZ_U[i]);
            t = this._FAZ_T[i] + (this._FAZ_T[i + 1] - this._FAZ_T[i]) * k;
            break;
          }
        }
        if (t === null) return null;
        t = t - Math.floor(t);
      }
    } catch (e) { return null; }
    return t;
  },

  geceMi() {
    const D = this._gun();
    try { return !!(D && D.isNightTime()); } catch (e) { return false; }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) YÜZEY — TERRAIN_INTERACTION (YALNIZ ALGILAMA)
  // ═════════════════════════════════════════════════════════════════════════
  // ⚠ `applyToVehicle` ÇAĞRILMAZ (başlıktaki hata 5 + 7): `hp` alanı yok,
  //    buz kayması hızı saniyede ~%50 söndürüyor ve `physics.js:151`
  //    `SURFACE_FRICTION` yüzey sürtünmesini ZATEN uyguluyor (çift uygulama).
  //    Buradan yalnız `currentSurface` canlı tutulur; `slip` değeri havanın
  //    tutuş etkisini ÖLÇEKLEMEK için okunur.
  yuzeyGuncelle(v, mapId) {
    const T = this._zemin();
    if (!T) return;
    let ad = null;
    try {
      const ar = this._arazi();
      if (ar && typeof ar.getSurfaceAt === 'function') ad = ar.getSurfaceAt(v.x);
    } catch (e) { ad = null; }
    const anahtar = this._YUZEY_AD[ad] || 'normal';
    T.detectSurface(anahtar);
    this._yuzey = T.currentSurface;
  },

  _yuzeyKayma() {
    const T = this._zemin();
    try {
      const s = T && (T.SURFACES[T.currentSurface] || T.SURFACES.normal);
      return s && typeof s.slip === 'number' ? s.slip : 0;
    } catch (e) { return 0; }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) HAVA — WEATHER_SYSTEM_EXT durum makinesi (biyom kilidiyle)
  // ═════════════════════════════════════════════════════════════════════════
  havaGuncelle(dt, mapId) {
    const W = this._hava();
    if (!W) return;
    // 🔴 ÖNDEN ENGELLEME: modülün kendi kör kurası (game.js:3026-3034) 8 tür
    //    arasından rastgele seçiyor. `next` alanını BİZ doldurunca `!this.next`
    //    koşulu düşer ve o dal hiç çalışmaz — modüle dokunmadan biyom kilidi.
    if (!W.next && (W.timer + dt) > W.changeInterval) {
      const yeni = this._havaSec(mapId, this.geceMi(), W.current);
      if (yeni && yeni !== W.current) {
        W.weatherTransition(W.current, yeni, 6 + Math.random() * 5);
      }
      W.timer = 0;
      W.changeInterval = 25 + Math.random() * 45;
    }
    W.updateWeather(dt);
  },

  // Ağırlıklı biyom seçimi. Gece sisi artırır, sıcak dalgasını kısar
  // (DayCycleSystem'in ÖLÇÜLEBİLİR oynanış etkisi — çizim değil).
  _havaSec(mapId, gece, kacin) {
    const liste = this.BIYOM_HAVA[this._biyom(mapId)] || this.BIYOM_HAVA.ilik;
    let toplam = 0;
    const ag = [];
    for (let i = 0; i < liste.length; i++) {
      const tip = liste[i][0];
      let w = liste[i][1];
      if (tip === 'fog')      w *= gece ? 2.2 : 1;
      if (tip === 'heatwave') w *= gece ? 0.35 : 1.3;
      if (tip === kacin)      w *= 0.35;      // aynı havayı üst üste seçme
      ag.push(w); toplam += w;
    }
    if (toplam <= 0) return 'clear';
    let r = Math.random() * toplam;
    for (let i = 0; i < ag.length; i++) { r -= ag[i]; if (r <= 0) return liste[i][0]; }
    return liste[liste.length - 1][0];
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) BESLEME — canlı havayı `gorsel-hava.js` profil önbelleğine yaz
  // ═════════════════════════════════════════════════════════════════════════
  // `GorselHava._profil(mapId)` önce `_profilOnbellek[mapId]`e bakar
  // (gorsel-hava.js:120-121). Oraya BİZİM nesnemizi koyunca çizim katmanı
  // canlı havayı okur — dosyada tek satır değişmeden.
  // ⚠ Nesne bir kez kurulur, YERİNDE güncellenir (kare başına çöp üretme).
  // ⚠ `GorselHava._BOS` PAYLAŞILAN nesnedir — asla mutasyona uğratılmaz.
  profilBesle(mapId) {
    const GH = this._gorHava();
    const W = this._hava();
    if (!GH || !W) return;

    const taban = GH.HAVA[mapId] || null;
    const biyom = this._biyom(mapId);
    const hv = W.getCurrentBlended();
    const tip = (W.next && W.transitionProgress < 0.5) ? W.current : (W.next || W.current);
    const etki = this._HAVA_ETKI[tip] || this._HAVA_ETKI.clear;

    // Geçiş sırasında havanın "ağırlığı" (0..1) — ani sıçrama olmasın.
    let gecis = 1;
    if (W.next) {
      const t = Math.max(0, Math.min(1, W.transitionProgress));
      gecis = (tip === W.next) ? t : (1 - t);
    }

    let pr = this._profilim[mapId];
    if (!pr) {
      pr = { yagmur: 0, damla: 0, kar: 0, tipi: 0, kum: 0, kor: 0, kul: 0,
             simsek: 0, buz: 0, ruzgar: 0, aktif: false };
      this._profilim[mapId] = pr;
    }

    // Kapalı biyomda hava YOK: taban aynen korunur (mağara damlası, kristal buzu).
    const kapali = (biyom === 'kapali');

    // 🔴 BİYOM KİLİDİ — 2. KAT. `_havaSec` zaten biyoma uygun seçiyor, ama
    //    başka bir kod `WEATHER_SYSTEM_EXT.startWeather('snow')` diye DOĞRUDAN
    //    zorlayabilir (modül global ve public). O durumda yağış YAZILMAZ:
    //    çölde kar, Ay'da yağmur olmaz. Taban profil olduğu gibi kalır.
    let izinli = false;
    const lst = this.BIYOM_HAVA[biyom] || [];
    for (let i = 0; i < lst.length; i++) { if (lst[i][0] === tip) { izinli = true; break; } }

    const carp = (kapali || !izinli) ? 1 : etki.carp;
    const en = (kapali || !izinli) ? null : etki.en;

    let acik = 0;
    for (let i = 0; i < this._ANAHTAR.length; i++) {
      const a = this._ANAHTAR[i];
      let d = (taban && typeof taban[a] === 'number') ? taban[a] : 0;
      d *= carp;
      if (en && typeof en[a] === 'number') {
        // Havanın kendi tabanı: MAKS ile birleştirilir (haritanınkini silmez),
        // sonra geçiş ağırlığıyla ölçeklenir.
        const h = en[a] * gecis;
        if (h > d) d = h;
      }
      // Tipi yalnız kar + yüksek rüzgâr birlikteyken; tabanında tipi olmayan
      // haritada kendiliğinden tipi başlatma (arctic/blizzard hariç kalır).
      if (a === 'tipi' && (!taban || !taban.tipi)) d = 0;
      d = Math.max(0, Math.min(1, d));
      pr[a] = d;
      if (a !== 'ruzgar' && d > 0.001) acik++;
    }
    pr.aktif = acik > 0;

    // Etkin efekt KÜMESİ değiştiyse gradient ön ısıtmasını bir kez tazele.
    // (`_onIsit` imzası profili görmez — gorsel-hava.js:1188. İmzayı
    //  sıfırlamak yeni efektin gradientini TEK SEFER üretir; sonraki
    //  karelerde üretim yine 0'dır çünkü `Gorsel._gr` anahtarla önbelleklidir.)
    let imza = mapId + '|';
    for (let i = 0; i < this._ANAHTAR.length; i++) imza += (pr[this._ANAHTAR[i]] > 0.001 ? '1' : '0');
    if (imza !== this._etkinImza) {
      this._etkinImza = imza;
      try { GH._onIsitImza = null; } catch (e) {}
    }

    GH._profilOnbellek[mapId] = pr;
  },

  // Yazdığımız profilleri geri al (DÜŞÜK kademe / kapatma).
  geriAl() {
    const GH = this._gorHava();
    const ids = Object.keys(this._profilim);
    if (!ids.length) return false;
    for (let i = 0; i < ids.length; i++) {
      try {
        if (GH && GH._profilOnbellek[ids[i]] === this._profilim[ids[i]]) {
          delete GH._profilOnbellek[ids[i]];   // `_profil()` özgününü yeniden kurar
        }
      } catch (e) {}
      delete this._profilim[ids[i]];
    }
    try { if (GH) GH._onIsitImza = null; } catch (e) {}
    this._etkinImza = '';
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) FİZİK — hava + yüzey tutuşa ÇARPARAK biner (bug #6 dersi)
  // ═════════════════════════════════════════════════════════════════════════
  fizikUygula(v, dt) {
    const W = this._hava();
    if (!W || !v) return;
    const w = W.getCurrentBlended();

    // `WEATHER_TYPES.friction` 0.55..1.0 arası çok sert (fırtınada %45 kayıp).
    // %30'a sıkıştırılır → en kötü durum ≈ %13,5 tutuş kaybı.
    let tutus = 1 - (1 - (w.friction || 1)) * 0.30;
    // Kaygan zemin havanın etkisini BÜYÜTÜR (yüzey sürtünmesini TEKRAR uygulamaz).
    tutus = 1 - (1 - tutus) * (1 + this._yuzeyKayma() * 0.5);
    tutus = Math.max(0.75, Math.min(1, tutus));
    this._tutus = tutus;

    // 🔴 EZME YOK — koşu başındaki taban ÇARPILIR (bug #6: `v._gripMul = X`
    //    araçtan+haritadan gelen tutuşu siliyordu).
    if (typeof v._gripMul === 'number') {
      v._gripMul = this._tabanGrip * (1 - (1 - tutus) * this._guc);
    }

    // Rüzgâr: yalnız HAVADAYKEN ve uçan/süzülen araçlar MUAF (bug #10 dersi:
    // 28 Tmz'deki hava direnci `fly`/`hover`'ı da vurmuş, Moonlander/UfoDisc
    // saniyede ~%20 yavaşlamıştı).
    if (!v.onGround && v.ability !== 'fly' && v.ability !== 'hover' &&
        typeof v.vx === 'number') {
      v.vx += (w.windX || 0) * 26 * this._guc * dt;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) OLAY — EventSystem (çizim YOK; sarsıntı + hafif yavaşlama ile hissedilir)
  // ═════════════════════════════════════════════════════════════════════════
  olayGuncelle(dt, v, mapId) {
    const E = this._olay();
    if (!E) return;
    const W = this._hava();
    const suAn = W ? W.current : 'clear';

    // Önden engelleme: modülün kendi kurası (game.js:1734) 7 olaydan
    // rastgele seçiyor (çölde sel, kutupta kum fırtınası). Biz zamanı
    // sıfırlayıp uygun olayı kendimiz doğuruyoruz.
    const st = E.eventState;
    if ((st.timer + dt) >= st.nextSpawn) {
      const tip = this._olaySec(mapId, suAn);
      st.timer = 0;
      if (tip) {
        const def = E.EVENTS.filter(function (e) { return e.type === tip; })[0];
        // `spawnEvent` içinde `console.log` var (game.js:1726) — koşu boyunca
        // konsolu kirletmesin diye TEK ÇAĞRI süresince susturulur.
        const eskiLog = (typeof console !== 'undefined') ? console.log : null;
        try {
          if (eskiLog) console.log = function () {};
          E.spawnEvent(tip, v.x + 420 + Math.random() * 560, v.y - 40);
        } catch (e) {
        } finally {
          try { if (eskiLog) console.log = eskiLog; } catch (e2) {}
        }
        st.nextSpawn = (def ? def.interval : 30) * (0.8 + Math.random() * 0.6);
      } else {
        st.nextSpawn = 20 + Math.random() * 25;
      }
    }
    E.updateEvents(dt, v.x, v.y);

    // Çarpışma → sarsıntı + çok hafif yavaşlama. HASAR/ÖLÜM YOK: olay
    // ekranda çizilmediği için oyuncuyu öldürmesi haksızlık olurdu.
    let guc = 0;
    const vur = E.checkEventCollision(v);
    for (let i = 0; i < vur.length; i++) {
      const im = vur[i].impact || 0;
      if (im > guc) guc = im;
    }
    this._olayGuc = guc;
    if (guc > 0) {
      const sars = this._kalite('carpmaSarsinti');
      const C = this._kamera();
      if (C && sars > 0) {
        const mag = Math.min(9, guc * 0.35) * sars;
        if (mag > (C.shakeMag || 0)) C.shakeMag = mag;   // camera.js:145 kalıbı
      }
      // ≤ %2,5/sn sürükleme; uçan/süzülen MUAF (bug #10).
      if (v.ability !== 'fly' && v.ability !== 'hover' && typeof v.vx === 'number') {
        v.vx *= (1 - Math.min(0.025, guc * 0.0012) * this._guc * dt);
      }
    }
  },

  _olaySec(mapId, suAnkiHava) {
    const liste = this.BIYOM_OLAY[this._biyom(mapId)] || this.BIYOM_OLAY.ilik;
    const uygun = [];
    for (let i = 0; i < liste.length; i++) {
      const t = liste[i];
      const gerek = this._OLAY_HAVA[t];
      if (gerek && gerek.indexOf(suAnkiHava) < 0) continue;
      uygun.push(t);
    }
    if (!uygun.length) return null;
    return uygun[Math.floor(Math.random() * uygun.length)];
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DIŞARI AÇILAN DURUM (HUD/başka sistem okuyabilsin diye; çizim YOK)
  // ═════════════════════════════════════════════════════════════════════════
  durum() {
    const W = this._hava(), D = this._gun(), E = this._olay();
    let tip = 'clear', ad = 'Clear', ikon = '';
    try { if (W) { tip = W.current; const b = W.getCurrentBlended(); ad = b.name; ikon = b.icon; } } catch (e) {}
    return {
      harita: this._mapId,
      biyom: this._biyom(this._mapId),
      hava: tip,
      havaAdi: ad,
      ikon: ikon,
      gecis: W ? (W.next ? W.transitionProgress : 1) : 1,
      saat: (function (d) { try { return d ? d.getTimeString() : '--:--'; } catch (e) { return '--:--'; } })(D),
      gunIsigi: (function (d) { try { return d ? d.getDaylight() : 1; } catch (e) { return 1; } })(D),
      gece: this.geceMi(),
      yuzey: this._yuzey,
      tutus: this._tutus,
      olayAdet: E ? E.eventState.active.length : 0,
      olayGuc: this._olayGuc,
      guc: this._guc
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KURULUM — `Game.update` additive sarmalanır (hookups.js şablonu)
  // ⚠ İmza `Game.update(dt)` (game.js:337). Renderer/HUD/UI'ye DOKUNULMAZ.
  // ═════════════════════════════════════════════════════════════════════════
  init() {
    if (this._sarildi) return false;
    try {
      if (typeof Game === 'undefined' || typeof Game.update !== 'function') return false;
      const orj = Game.update.bind(Game);
      const self = this;
      Game.update = function (dt) {
        orj(dt);
        try { self.frame(dt); } catch (e) {}
      };
      this._sarildi = true;
      return true;
    } catch (e) { return false; }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELFTEST — ÖLÇEREK doğrular (canlı durumu kirletmez: sonda geri alınır)
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const GH = this._gorHava(), W = this._hava(), D = this._gun(),
          T = this._zemin(), E = this._olay();

    // Yedekle (test canlı durumu bozmasın)
    const yd = {
      arac: this._arac, mapId: this._mapId, taban: this._tabanGrip,
      guc: this._guc, imza: this._etkinImza,
      wCur: W ? W.current : null, wNext: W ? W.next : null,
      wProg: W ? W.transitionProgress : 0, wTimer: W ? W.timer : 0,
      tod: D ? D.timeOfDay : 0, hiz: D ? D.daySpeed : 0,
      yuzey: T ? T.currentSurface : null
    };
    let eskiKademe = null;
    try { if (typeof Kalite !== 'undefined') eskiKademe = Kalite._kademe; } catch (e) {}

    try {
      r.modullerVar = !!(W && D && T && E);

      // 1) BİYOM TABLOSU — bilinen her harita sınıflandırılmış olmalı
      let hepsi = [];
      try {
        const g = this._gorsel();
        if (g && g.PALET) hepsi = Object.keys(g.PALET);
      } catch (e) {}
      if (!hepsi.length) hepsi = Object.keys(this.BIYOM);
      const gecerli = { ilik: 1, soguk: 1, kurak: 1, volkanik: 1, kapali: 1 };
      r.biyomTam = hepsi.length > 0 && hepsi.every(function (k) {
        return !!gecerli[BaglaDunya._biyom(k)];
      }, this);
      r.biyomHavaTam = Object.keys(this.BIYOM_HAVA).every(function (b) {
        const l = BaglaDunya.BIYOM_HAVA[b];
        return l && l.length > 0 && l.every(function (x) {
          return typeof x[0] === 'string' && x[1] > 0 &&
                 (typeof WEATHER_TYPES === 'undefined' || !!WEATHER_TYPES[x[0]]);
        });
      });

      // 2) BİYOM KİLİDİ — 400 çekimde çölde kar / kutupta kum ÇIKMAMALI
      let colKar = 0, kutupKum = 0, ayHava = 0;
      for (let i = 0; i < 400; i++) {
        const a = this._havaSec('desert', false, null);
        if (a === 'snow' || a === 'rain' || a === 'storm') colKar++;
        const b = this._havaSec('arctic', false, null);
        if (b === 'sandstorm' || b === 'heatwave') kutupKum++;
        const c = this._havaSec('moon', false, null);
        if (c !== 'clear') ayHava++;
      }
      r.coldeKarYok = colKar === 0;
      r.kutuptaKumYok = kutupKum === 0;
      r.aydaHavaYok = ayHava === 0;

      // 3) YÜZEY AD EŞLEMESİ — `asfalt`→`asphalt` (hata 6) gerçekten çözülüyor mu
      r.yuzeyEslesme = !!(T && T.SURFACES[this._YUZEY_AD.asfalt] &&
                          this._YUZEY_AD.asfalt === 'asphalt' &&
                          T.SURFACES[this._YUZEY_AD.rock] &&
                          T.SURFACES[this._YUZEY_AD.water]);

      // 4) PROFİL BESLEME — yağmur açılınca `yagmur` gerçekten > 0 olmalı
      if (GH && W) {
        this._mapId = 'countryside';
        this._guc = 1;
        W.startWeather('rain'); W.next = null; W.transitionProgress = 1;
        this.profilBesle('countryside');
        const p1 = GH._profil('countryside');
        r.havaBesleniyor = !!(p1 && p1.aktif === true && p1.yagmur > 0.3 && p1.damla > 0.3);

        // Açık havada aynı harita SAKİN olmalı (taban yok → aktif değil)
        W.startWeather('clear'); W.next = null; W.transitionProgress = 1;
        this.profilBesle('countryside');
        const p2 = GH._profil('countryside');
        r.acikHavaSakin = !!(p2 && p2.yagmur === 0 && p2.aktif === false);

        // Kapalı biyom: mağara damlası KORUNUR, yağmur EKLENMEZ
        W.startWeather('storm'); W.next = null; W.transitionProgress = 1;
        this.profilBesle('cave');
        const p3 = GH._profil('cave');
        const tabanCave = GH.HAVA.cave || {};
        r.magaraKorundu = !!(p3 && p3.yagmur === 0 &&
                             Math.abs(p3.damla - (tabanCave.damla || 0)) < 1e-9);

        // Taban SİLİNMEZ: kar biyomunda haritanın buzu yerinde kalmalı
        W.startWeather('snow'); W.next = null; W.transitionProgress = 1;
        this.profilBesle('arctic');
        const p4 = GH._profil('arctic');
        r.tabanSilinmiyor = !!(p4 && p4.buz >= (GH.HAVA.arctic.buz || 0) - 1e-9 && p4.kar > 0);

        // Geri alma: özgün profil geri gelmeli
        this.geriAl();
        const p5 = GH._profil('countryside');
        r.geriAlmaCalisiyor = !!(p5 && p5.aktif === false && Object.keys(this._profilim).length === 0);
      } else {
        r.havaBesleniyor = false; r.acikHavaSakin = false;
        r.magaraKorundu = false; r.tabanSilinmiyor = false; r.geriAlmaCalisiyor = false;
      }

      // 5) TUTUŞ ÇARPILIYOR (EZİLMİYOR) — bug #6 regresyon kilidi
      if (W) {
        this._guc = 1; this._tabanGrip = 2;
        this._yuzey = 'normal'; if (T) T.detectSurface('normal');
        W.startWeather('storm'); W.next = null; W.transitionProgress = 1;
        const araba = { _gripMul: 2, vx: 300, onGround: true, ability: null, x: 0, y: 0 };
        this.fizikUygula(araba, 0.016);
        r.tutusCarpiliyor = araba._gripMul > 1.4 && araba._gripMul < 2.0;

        // Uçan araç rüzgârdan MUAF (bug #10 regresyon kilidi)
        const ucan = { _gripMul: 1, vx: 300, onGround: false, ability: 'fly', x: 0, y: 0 };
        this.fizikUygula(ucan, 0.5);
        r.ucanRuzgardanMuaf = ucan.vx === 300;
        const kara = { _gripMul: 1, vx: 300, onGround: false, ability: null, x: 0, y: 0 };
        this.fizikUygula(kara, 0.5);
        r.karaAracRuzgarAliyor = kara.vx !== 300;

        // Tutuş ASLA sıfırlanmaz (game.js:3094 üstel birikme hatası burada YOK)
        const uzun = { _gripMul: 2, vx: 300, onGround: true, ability: null, x: 0, y: 0 };
        for (let i = 0; i < 600; i++) this.fizikUygula(uzun, 0.016);
        r.tutusBirikmiyor = uzun._gripMul > 1.4;
      } else {
        r.tutusCarpiliyor = false; r.ucanRuzgardanMuaf = false;
        r.karaAracRuzgarAliyor = false; r.tutusBirikmiyor = false;
      }

      // 6) OLAY BİYOM/HAVA KİLİDİ
      let kotuOlay = 0;
      for (let i = 0; i < 200; i++) {
        if (this._olaySec('desert', 'clear') === 'flood') kotuOlay++;
        if (this._olaySec('arctic', 'clear') === 'sand_storm') kotuOlay++;
        if (this._olaySec('countryside', 'clear') === 'flood') kotuOlay++;  // yağmursuz sel YOK
      }
      r.olayKiliti = kotuOlay === 0;
      r.olaySelYagmurda = (function (s) {
        for (let i = 0; i < 200; i++) if (s._olaySec('countryside', 'storm') === 'flood') return true;
        return false;
      })(this);

      // 7) KALİTE GEÇİDİ — DÜŞÜK kademede modül tamamen kapanmalı
      if (typeof Kalite !== 'undefined') {
        Kalite._kademe = 'dusuk';
        r.dusuktKapali = this._guclac() === 0;
        Kalite._kademe = 'ultra';
        r.ultradaAcik = this._guclac() > 0;
        Kalite._kademe = eskiKademe;
      } else { r.dusuktKapali = false; r.ultradaAcik = false; }

      // 8) ZAMAN — faz eşlemesi monoton ve [0,1) aralığında
      let fazTamam = true;
      for (let i = 0; i < 4; i++) {
        if (!(this._FAZ_T[i + 1] > this._FAZ_T[i]) || !(this._FAZ_U[i + 1] > this._FAZ_U[i])) fazTamam = false;
      }
      r.fazMonoton = fazTamam;
      if (D) {
        D.setTimeOfDay(0.9);
        r.geceAlgilaniyor = D.isNightTime() === true;
        D.setTimeOfDay(0.45);
        r.gunduzAlgilaniyor = D.isDaytime() === true;
      } else { r.geceAlgilaniyor = false; r.gunduzAlgilaniyor = false; }

      // 9) ÇİZİM YASAĞI — bu modül hiçbir çizim metodunu çağırmamalı
      r.cizimYok = (typeof this.draw === 'undefined') && (typeof this.ciz === 'undefined');

      r.durumCalisiyor = (function (s) {
        try { const d = s.durum(); return !!d && typeof d.hava === 'string'; } catch (e) { return false; }
      })(this);

    } catch (e) {
      r.hataYok = false;
    }

    // ── Geri yükle ────────────────────────────────────────────────────────
    try { this.geriAl(); } catch (e) {}
    try {
      this._arac = yd.arac; this._mapId = yd.mapId; this._tabanGrip = yd.taban;
      this._guc = yd.guc; this._etkinImza = yd.imza;
      if (W) { W.current = yd.wCur || 'clear'; W.next = yd.wNext; W.transitionProgress = yd.wProg; W.timer = yd.wTimer; }
      if (D) { D.timeOfDay = yd.tod; D.daySpeed = yd.hiz; }
      if (T && yd.yuzey) T.currentSurface = yd.yuzey;
      if (typeof Kalite !== 'undefined') Kalite._kademe = eskiKademe;
    } catch (e) {}

    if (r.hataYok === undefined) r.hataYok = true;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaDunya = BaglaDunya;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaDunya.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaDunya.init(); }, 0);
    }
  } catch (e) {}
}
if (typeof module !== 'undefined' && module.exports) module.exports = { BaglaDunya: BaglaDunya };
