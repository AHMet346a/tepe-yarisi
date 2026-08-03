'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// BAGLA-HUD — js/hud.js içindeki ÖLÜ HUD modüllerini gerçek oyuna bağlar.
//
// Şablon: js/hookups.js (HUD.draw sarmalanır, orijinal ÖNCE çağrılır, her
// ekleme kendi try/catch'inde). Bu dosya ADDITIVE'dir: js/hud.js'e, gorsel*.js'e,
// index.html'e ve sw.js'e HİÇ dokunmaz.
//
// ── BAĞLANANLAR (5 modül) ─────────────────────────────────────────────────
//   ADVANCED_SPEEDOMETER.drawAnalogSpeedo   → sağ boş şerit, analog kadran
//   TACHOMETER_SYSTEM.drawTachometer        → sağ boş şerit, devir kadranı
//   MINIMAP_ADVANCED.drawMinimap            → sol boş şerit, yerel arazi haritası
//   RACE_HUD.drawRaceTimer                  → sol boş şerit, koşu süresi + rekor
//   RACE_HUD.drawLapCounter                 → sol boş şerit, "CP n/m"
//   RACE_HUD.drawCheckpointIndicator        → ekran DIŞI checkpoint oku
//   DAMAGE_HUD.drawDamageIndicator          → hasar kızıllığı (tam ekran)
//   DAMAGE_HUD.drawCrashWarning             → çarpma alarmı (geçici)
//
// ── BİLEREK BAĞLANMAYANLAR (sebep raporda) ────────────────────────────────
//   NITRO_HUD.drawNitroMeter   — HUD'da ZATEN 3 nitro/turbo göstergesi var
//                                (dikey nitro çubuğu · turbo çubuğu · şarj halkası
//                                 · "BOOST READY" hapı). Dördüncüsü kalabalık.
//   NITRO_HUD.drawNitroFlame   — kare başına 8 ÖNBELLEKSİZ radyal gradient
//                                (geometri t ile sürekli değişiyor → önbelleklenemez).
//   COMBO_DISPLAY.drawComboText— konumu `translate(W/2, H*0.38)` ile SABİT kodlu;
//                                HUD'un takla bildirimi H*0.35+20'de → BİREBİR ÇAKIŞMA.
//   COMBO_DISPLAY.drawComboMeter— kombo zaten 4 yerde gösteriliyor
//                                (takla rozeti · trick popup · kombo serisi ·
//                                 hookups.js "KOMBO xN").
//   TACHOMETER_SYSTEM.drawGearIndicator — HUD._drawEngineGauge'ın GEAR kutusunun
//                                aynısı (sağ alt).
//   RACE_HUD.drawBotPosition   — HUD'un "🤖 ±Nm" Bot Race Indicator'ının aynısı.
//   ADVANCED_SPEEDOMETER.drawDigitalSpeedo — sağ üstteki dijital hız panelinin aynısı.
//   ADVANCED_SPEEDOMETER.drawNeedleGauge   — genel amaçlı yardımcı, veri kaynağı yok.
//
// ── 🔴 GRADIENT KURALI ────────────────────────────────────────────────────
//   Kadranlar kare başına 5 gradient üretiyordu (4 speedo + 1 tako) ve
//   hasar kızıllığı 1 tane daha. `_blit()` ile ÇÖZÜLDÜ: her kadran kendi
//   ekran-dışı tuvaline YALNIZ değeri değişince çizilir, sonra `drawImage`
//   ile basılır. Durağan karede üretilen gradient = **0**.
//   ⚠ Yeni bir modül bağlarken gradient üretiyorsa `_blit()` ile sarmala.
//   ⚠ `getImageData` KULLANILMIYOR.
//
// ── 🔴 YERLEŞİM KURALI ────────────────────────────────────────────────────
//   HUD kalabalık. `_yerlesim()` mevcut HUD elemanlarının ÖLÇÜLEN kutularından
//   iki boş şerit hesaplar ve bir widget ancak SIĞIYORSA çizilir:
//     SOL  şerit: yakıt/nitro/turbo çubuklarının ALTI (y≥192) …
//                 koşu-istatistik bloğunun (H-166) ve fren düğmesinin ÜSTÜ,
//                 ayrıca checkpoint oku hattının (H*0.50) ÜSTÜ.
//     SAĞ  şerit: turbo şarj halkasının ALTI (y≥148) … kombo serisinin (H*0.44) ÜSTÜ.
//   Yatay telefonda (H≈390) iki şerit de negatif çıkar → HİÇBİR ŞEY çizilmez.
//   ⚠ Bu dosya dokunmatik hedef EKLEMEZ (hepsi salt görsel), bu yüzden 44 px
//     kuralı uygulanmaz; ama fren/gaz düğmelerinin üstüne binmemesi ölçülür.
// ═══════════════════════════════════════════════════════════════════════════

const BaglaHud = {
  version: '1.0',
  aktif: true,
  _wrapped: false,

  // ── ekran-dışı önbellek (gradient çöpünü sıfırlar) ──
  _ob: {},

  // ── koşu durumu ──
  _kosuT: 0,          // koşu başından beri saniye (duvar saati, dt biriktirme YOK)
  _sonKare: 0,
  _sonMesafe: undefined,
  _sonHasar: 0,
  _carpmaT: 0,
  _rpmLerp: null,
  _cpSayi: 0,
  _kosuCp: {},        // bu koşuda ulaşılan cp -> saniye
  _enIyi: {},         // 'mapId|cpSayisi' -> saniye (ÖNCEKİ koşular)

  // ── ölçüm sayaçları (dogrulama/rapor için) ──
  _sayac: {
    kare: 0, speedo: 0, tako: 0, minimap: 0, timer: 0, cpSayac: 0,
    cpOk: 0, hasar: 0, carpma: 0, yenidenCiz: 0, hata: 0
  },

  // ── bare global erişimi (window.X ÇALIŞMAZ — CLAUDE.md "Bare global'ler") ──
  // ⚠ `_gTest` YALNIZ selfTest içindir: `Game` bir bare `const` olduğu için
  //   test sırasında geçici olarak değiştirilemez; menüdeyken selfTest çalışsın
  //   diye sahte bir oyun durumu enjekte edilir (sonra null'a çekilir).
  _gTest: null,
  _G()  { if (this._gTest) return this._gTest;
          try { return (typeof Game    !== 'undefined') ? Game    : null; } catch (e) { return null; } },
  _Cam(){ try { return (typeof Camera  !== 'undefined') ? Camera  : null; } catch (e) { return null; } },
  _SD() { try { return (typeof SaveData!== 'undefined') ? SaveData: null; } catch (e) { return null; } },
  _CS() { try { return (typeof CheckpointSystem !== 'undefined') ? CheckpointSystem : null; } catch (e) { return null; } },
  _GM() { try { return (typeof GameModes !== 'undefined') ? GameModes : null; } catch (e) { return null; } },

  // Kalite kademesi indeksi: 0=dusuk … 5=ultra (Kalite yoksa ultra varsay).
  // ⚠ kalite.js'e yeni anahtar EKLENMEDİ (kural 7) — mevcut kademe okunup
  //   kendi eşiğimiz konuyor.
  _kad() {
    try {
      if (typeof Kalite === 'undefined' || !Kalite.KADEMELER) return 5;
      const i = Kalite.KADEMELER.indexOf(Kalite.kademe());
      return i < 0 ? 5 : i;
    } catch (e) { return 5; }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // EKRAN-DIŞI ÖNBELLEK — gradient/metin/yay çizimini değer değişmedikçe atlar
  // ═════════════════════════════════════════════════════════════════════════
  _tuval(ad, w, h) {
    let e = this._ob[ad];
    if (e && e.w === w && e.h === h) return e;
    let cv = null;
    try {
      if (typeof document !== 'undefined' && document.createElement) cv = document.createElement('canvas');
    } catch (er) { cv = null; }
    if (!cv) return null;
    cv.width = w; cv.height = h;
    let c2 = null;
    try { c2 = cv.getContext('2d'); } catch (er) { c2 = null; }
    if (!c2) return null;
    e = { cv: cv, c2: c2, w: w, h: h, sig: null };
    this._ob[ad] = e;
    return e;
  },

  // sig değişmedikçe YENİDEN ÇİZMEZ; her karede yalnız drawImage yapılır.
  _blit(ctx, ad, w, h, sig, ciz, dx, dy, dw, dh) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    const e = this._tuval(ad, w, h);
    if (!e) return false;
    if (e.sig !== sig) {
      try { e.c2.setTransform(1, 0, 0, 1, 0, 0); } catch (er) {}
      e.c2.clearRect(0, 0, w, h);
      ciz(e.c2, w, h);
      e.sig = sig;
      this._sayac.yenidenCiz++;
    }
    if (dw === undefined) ctx.drawImage(e.cv, dx, dy);
    else ctx.drawImage(e.cv, 0, 0, w, h, dx, dy, dw, dh);
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YERLEŞİM — mevcut HUD elemanlarının ÖLÇÜLEN kutularından boş şerit üretir
  // ═════════════════════════════════════════════════════════════════════════
  // Dolu bölgeler (js/hud.js draw() + hookups.js drawHUD okunarak çıkarıldı):
  //   sol üst  x 14..102  y  60..192  yakıt/nitro/turbo çubukları + etiketleri
  //   üst orta x W/2±80   y  14..96   mesafe rozeti · kilometre tik · sikke sayacı
  //   sağ üst  x W-110..W y   8..138  hız paneli · duraklat · bot rozeti · şarj halkası
  //   sağ orta (W-74, H*0.44)         kombo serisi
  //   alt sol  y H-166..H-32          koşu istatistikleri · rota şeridi · başarım tostu
  //   alt orta y H-58, H-26           turbo hazır hapı · harita rekoru
  //   alt sağ  x W-146..W-14 y H-50   motor göstergesi
  //   alt köşe fren/gaz düğmeleri: r = min(60, W*0.1), merkez y = H-r-16
  // 🔴 PERF(31 Tmz): yerleşim YALNIZ (W,H)'ye bağlıdır — koşu boyunca SABİT.
  //   Eskiden her karede yeniden hesaplanıp YENİ nesne ayrılıyordu. Artık
  //   (W,H) değişmedikçe aynı nesne döner (ekran döndürme/yeniden boyutlama
  //   anahtarı bozar → yeniden hesaplanır). Değerler birebir aynı.
  _yerA: null, _yerW: -1, _yerH: -1,
  _yerlesim(W, H) {
    if (this._yerA && this._yerW === W && this._yerH === H) return this._yerA;
    const btnR = Math.min(60, W * 0.1);
    // Checkpoint oku hattı (x = 60 / W-60). Kombo serisi hapı (W-74, H*0.44)
    // ölçüldü: 60×54, en fazla ×1.35 ölçekleniyor → yarı yüksekliği 37 px.
    // Ok, o hapın ALTINDA kalmalı; sığmıyorsa HİÇ çizilmez.
    const okY = Math.max(H * 0.52 + 8, H * 0.44 + 78);
    const y = {
      // SOL şerit
      solUst: 192,
      solAlt: Math.min(H - 176,                // koşu istatistik bloğu (H-166)
                       H - (2 * btnR + 46),    // fren düğmesi + pay
                       okY - 30),              // checkpoint oku hattı
      // SAĞ şerit
      sagUst: 148,                             // turbo şarj halkası altı
      sagAlt: H * 0.44 - 26,                   // kombo serisi üstü
      okY: okY,
      okGecerli: (okY >= H * 0.44 + 78) && (okY + 26 <= H - (2 * btnR + 30)),
      btnR: btnR
    };
    y.solYuk = y.solAlt - y.solUst;
    y.sagYuk = y.sagAlt - y.sagUst;
    this._yerA = y; this._yerW = W; this._yerH = H;
    return y;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM — HUD.draw sarmalayıcısından, dünya dönüşümü KAPALI iken
  // ═════════════════════════════════════════════════════════════════════════
  drawHUD(ctx, v, W, H) {
    if (!this.aktif || !ctx || !v) return;
    const G = this._G();
    if (!G || G.state !== 'playing') return;

    W = W || (ctx.canvas ? ctx.canvas.width  : 0);
    H = H || (ctx.canvas ? ctx.canvas.height : 0);
    if (!(W > 0) || !(H > 0)) return;

    const kad = this._kad();
    if (kad <= 0) return;                 // DÜŞÜK kademe → bu katman tamamen kapalı
    const zengin = kad >= 2;              // ORTA-ÜSTÜ ve üstü → kadranlar + mini harita

    // ── zaman: DUVAR SAATİ. (intro.js dersi: dt biriktirme güvenilmez) ──
    const simdi = Date.now();
    let dt = this._sonKare ? (simdi - this._sonKare) / 1000 : 0.016;
    if (!(dt > 0) || dt > 0.1) dt = 0.016;
    this._sonKare = simdi;

    // ── koşu tespiti: mesafe geri gittiyse yeni koşu (hookups.js ile aynı yordam) ──
    const dist = Math.max(0, Math.floor((v.x - (G.startX || 0)) / 2));
    if (this._sonMesafe === undefined || dist < this._sonMesafe - 5) this._kosuSifirla(G);
    this._sonMesafe = dist;
    this._kosuT += dt;
    this._sayac.kare++;

    const yer = this._yerlesim(W, H);
    const genisMi = W >= 320;

    ctx.save();
    try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {}
    ctx.globalAlpha = 1;
    try { ctx.globalCompositeOperation = 'source-over'; } catch (e) {}

    // ── 1) DAMAGE_HUD.drawDamageIndicator — hasar kızıllığı ────────────────
    // Ekranın tamamını kaplar → şerit hesabına girmez. ÇEYREK çözünürlükte
    // çizilip büyütülür: yumuşak radyal gradient ölçeklenince fark edilmez,
    // gradient yalnız hasar 0,05 adım değişince yeniden üretilir.
    let hasar = 0;
    try {
      hasar = Math.max(0, Math.min(1, v.damageLevel || 0));
      if (hasar > 0.04 && typeof DAMAGE_HUD !== 'undefined') {
        const q = Math.round(hasar * 20) / 20;
        const qw = Math.max(8, W >> 2), qh = Math.max(8, H >> 2);
        const ok = this._blit(ctx, 'hasar', qw, qh, W + 'x' + H + '|' + q,
          function (c2, cw, ch) { DAMAGE_HUD.drawDamageIndicator(c2, cw, ch, q); },
          0, 0, W, H);
        if (ok) this._sayac.hasar++;
      }
    } catch (e) { this._sayac.hata++; }

    // ── 2) DAMAGE_HUD.drawCrashWarning — çarpma alarmı ─────────────────────
    // Hasar SIÇRAMASINDA 0,7 sn. Modül yazıyı H*0.07'ye SABİT kodluyor; orada
    // mesafe rozeti + sikke sayacı var → tamamı `dy` kadar aşağı ötelenir ve
    // `scale(1, (H-dy)/H)` ile geri sığdırılır (kenarlık ekran dışına taşmaz).
    // 🔴 ÖLÇÜM: environment.js:353 sert inişte kare başına EN FAZLA
    //   (1,0-0,9)*0,08 = **0,008** hasar ekliyor. "delta > 0,012" gibi bir eşik
    //   gerçek oyunda HİÇ tetiklenmezdi. Gerçek büyük darbeler tek seferde
    //   gelir: engel çarpması +0,5 (environment.js:885) · boss hamlesi +0,55/1,0
    //   (modes.js:294). Bu yüzden iki ölçüt: TEK KARELİK büyük sıçrama, ya da
    //   birikmiş hasarın 0,25/0,50/0,75 eşiklerini GEÇMESİ.
    try {
      const artis = hasar - this._sonHasar;
      if (artis >= 0.08) this._carpmaT = 0.7;
      else if (artis > 0) {
        const esik = [0.25, 0.5, 0.75];
        for (let i = 0; i < esik.length; i++) {
          if (this._sonHasar < esik[i] && hasar >= esik[i]) { this._carpmaT = 0.7; break; }
        }
      }
      this._sonHasar = hasar;
      if (this._carpmaT > 0) {
        this._carpmaT = Math.max(0, this._carpmaT - dt);
        if (this._carpmaT > 0 && typeof DAMAGE_HUD !== 'undefined') {
          const dy = Math.max(0, 106 - H * 0.07);
          const sy = (H - dy) / H;
          ctx.save();
          ctx.translate(0, dy);
          if (sy > 0 && sy < 1) ctx.scale(1, sy);
          DAMAGE_HUD.drawCrashWarning(ctx, W, H, this._kosuT);
          ctx.restore();
          this._sayac.carpma++;
        }
      }
    } catch (e) { this._sayac.hata++; }

    // ── 3) SOL ŞERİT: koşu süresi · CP sayacı · mini harita ────────────────
    let solY = yer.solUst;
    const modNormal = this._modNormal();
    if (genisMi && yer.solYuk > 0) {
      // 3a) RACE_HUD.drawRaceTimer — kutu (x-5, y-22, 160, 50)
      // ⚠ GameModes race/timetrial ZATEN üst-ortada ⏱ sayacı çiziyor
      //   (modes.js:941) → o modlarda çizilmez.
      try {
        if (modNormal && typeof RACE_HUD !== 'undefined' && solY + 54 <= yer.solAlt) {
          const enIyi = this._enIyiSure(G);
          RACE_HUD.drawRaceTimer(ctx, 19, solY + 22, this._kosuT * 1000,
                                 enIyi === null ? null : enIyi * 1000);
          solY += 54 + 6;
          this._sayac.timer++;
        }
      } catch (e) { this._sayac.hata++; }

      // 3b) RACE_HUD.drawLapCounter — kutu (x-5, y-20, 100, 36)
      // ⚠ Etiket 'CP' verilir; oyunda tur yok (modülün `label` parametresi
      //   30 Tmz'de tam bunun için eklenmiş).
      try {
        const CS = this._CS();
        if (modNormal && CS && typeof RACE_HUD !== 'undefined' && solY + 40 <= yer.solAlt) {
          const g = this._cpDurum(G, CS);
          RACE_HUD.drawLapCounter(ctx, 19, solY + 20, g.gecti, g.toplam, 'CP');
          solY += 40 + 8;
          this._sayac.cpSayac++;
        }
      } catch (e) { this._sayac.hata++; }

      // 3c) MINIMAP_ADVANCED.drawMinimap — yerel arazi + yön oku
      // ⚠ Rota şeridi (sol alt) yalnız ÖNÜ gösterir; bu modül ±600 px'i ve
      //   aracın AÇISINI gösterir → bilgi aynı değil.
      try {
        const mmH = 62, mmW = Math.min(150, Math.round(W * 0.36));
        if (zengin && typeof MINIMAP_ADVANCED !== 'undefined' && solY + mmH <= yer.solAlt) {
          MINIMAP_ADVANCED.drawMinimap(ctx, 14, solY, mmW, mmH, v, G.terrain, this._Cam());
          solY += mmH + 8;
          this._sayac.minimap++;
        }
      } catch (e) { this._sayac.hata++; }
    }

    // ── 4) SAĞ ŞERİT: analog hız kadranı + devir kadranı ───────────────────
    // Kadranlar ekran-dışı tuvale çizilip basılır → durağan karede 0 gradient.
    if (zengin && genisMi && yer.sagYuk >= 100) {
      const r = Math.max(22, Math.min(40, Math.floor(W * 0.10), Math.floor((yer.sagYuk - 8) / 4)));
      const cap = r * 2, kutu = cap + 24;      // +24 = gölge payı (shadowBlur 12)
      const sagX = W - 14 - cap;
      let sagY = yer.sagUst;

      // 4a) ADVANCED_SPEEDOMETER.drawAnalogSpeedo
      try {
        if (typeof ADVANCED_SPEEDOMETER !== 'undefined' && sagY + cap <= yer.sagAlt) {
          const kmh = Math.abs(v.vx || 0) * 0.36;                 // hud.js ile AYNI formül
          const tavan = Math.max(60, Math.ceil(((v.maxSpeed || 500) * 0.36 * 1.06) / 20) * 20);
          // ⚠ 2 km/h'ye YUVARLA: önbellek anahtarı budur. 1 km/h'de hızlanırken
          //   her kare yeniden çizilirdi (önbellek işe yaramaz). 40 px'lik
          //   kadranda 2 km/h ≈ 2,7° ibre farkı — görünmez. Kesin değer zaten
          //   sağ üstteki dijital panelde yazıyor.
          const q = Math.max(0, Math.min(tavan, Math.round(kmh / 2) * 2));
          const ok = this._blit(ctx, 'speedo', kutu, kutu, r + '|' + q + '|' + tavan,
            function (c2, cw) { ADVANCED_SPEEDOMETER.drawAnalogSpeedo(c2, cw / 2, cw / 2, r, q, tavan); },
            sagX - 12, sagY - 12);
          if (ok) { sagY += cap + 8; this._sayac.speedo++; }
        }
      } catch (e) { this._sayac.hata++; }

      // 4b) TACHOMETER_SYSTEM.drawTachometer
      // ⚠ Modül maxRpm'i 8000'e SABİT kodlamış → araçta maxRpm varsa ölçeklenir.
      // ⚠ RPM, HUD._drawEngineGauge ile BİREBİR aynı formülden türetilir;
      //   yoksa iki gösterge farklı devir gösterir ve bozuk görünür.
      try {
        if (typeof TACHOMETER_SYSTEM !== 'undefined' && sagY + cap <= yer.sagAlt) {
          const rpm8 = this._rpm8(v, dt);
          const q = Math.round(rpm8 / 80) * 80;   // önbellek adımı (bkz. speedo notu)
          const ok = this._blit(ctx, 'tako', kutu, kutu, r + '|' + q,
            function (c2, cw) { TACHOMETER_SYSTEM.drawTachometer(c2, cw / 2, cw / 2, r, q, 6560); },
            sagX - 12, sagY - 12);
          if (ok) this._sayac.tako++;
        }
      } catch (e) { this._sayac.hata++; }
    }

    // ── 5) RACE_HUD.drawCheckpointIndicator — YALNIZ ekran dışındayken ok ──
    // CheckpointSystem.drawCheckpoints (hookups.js) bayrağı ZATEN ekranda
    // çiziyor; ok yalnız bayrak görünmezken anlamlı. İki ölçüt de aynı anda
    // "dışarıda" demezse HİÇ çizilmez (modül kendi içinde de test ediyor;
    // ayrışırlarsa yanlış dalı çizerdi).
    try {
      const CS = this._CS(), cam = this._Cam();
      if (CS && cam && typeof RACE_HUD !== 'undefined' && CS.getNextCheckpointDistance) {
        const m = CS.getNextCheckpointDistance(dist);
        const cpX = m * 2 + (G.startX || 0);                    // dünya px (pxPerM = 2)
        const zoom = (typeof cam.zoom === 'number' && cam.zoom > 0) ? cam.zoom : 1;
        const modulDisi = Math.abs(cpX - v.x) * zoom >= W * 0.4;
        let ekranDisi = true;
        if (cam.worldToScreen) {
          let gy = v.y;
          try { if (G.terrain && G.terrain.getYAt) gy = G.terrain.getYAt(cpX); } catch (e2) {}
          const p = cam.worldToScreen(cpX, gy);
          if (p && isFinite(p.x)) ekranDisi = (p.x < 40 || p.x > W - 40);
        }
        if (modulDisi && ekranDisi && yer.okGecerli && yer.okY > 120) {
          RACE_HUD.drawCheckpointIndicator(ctx, W / 2, yer.okY, cpX, v.x, W,
                                           { pxPerM: 2, zoom: zoom });
          this._sayac.cpOk++;
        }
      }
    } catch (e) { this._sayac.hata++; }

    ctx.restore();
  },

  // ── koşu sıfırlama: en iyi süreleri devret, sayaçları temizle ────────────
  _kosuSifirla(G) {
    try {
      const mid = (G && G.mapId) ? G.mapId : '?';
      for (const k in this._kosuCp) {
        if (!Object.prototype.hasOwnProperty.call(this._kosuCp, k)) continue;
        const a = mid + '|' + k, t = this._kosuCp[k];
        if (this._enIyi[a] === undefined || t < this._enIyi[a]) this._enIyi[a] = t;
      }
    } catch (e) {}
    this._kosuCp = {};
    this._kosuT = 0;
    this._cpSayi = 0;
    this._carpmaT = 0;
    this._sonHasar = 0;
    this._rpmLerp = null;
  },

  // ── checkpoint durumu: geçilen / hedef ───────────────────────────────────
  // toplam = harita rekorunun kaç checkpoint'e denk geldiği (anlamlı hedef);
  // rekor yoksa "bir sonraki".
  _cpDurum(G, CS) {
    let gecti = 0, toplam = 1;
    try {
      const st = CS.checkpointState || {};
      gecti = (st.passed || []).length;
      // yeni checkpoint → bu koşunun süresini kaydet (en iyiye koşu SONUNDA taşınır)
      if (gecti > this._cpSayi) {
        const t = (st.times || [])[gecti - 1];
        if (typeof t === 'number' && isFinite(t)) this._kosuCp[gecti] = t;
        this._cpSayi = gecti;
      }
      const aralik = CS.CP_ARALIK || 500;
      let rekor = 0;
      const SD = this._SD();
      if (SD && SD.data && SD.data.highScores && G.mapId) rekor = SD.data.highScores[G.mapId] || 0;
      toplam = Math.max(gecti + 1, Math.ceil(rekor / aralik));
    } catch (e) {}
    return { gecti: gecti, toplam: toplam };
  },

  // ── en iyi süre: AYNI checkpoint sayısına ÖNCEKİ koşularda ulaşma süresi ──
  _enIyiSure(G) {
    try {
      if (this._cpSayi <= 0) return null;
      const a = ((G && G.mapId) ? G.mapId : '?') + '|' + this._cpSayi;
      const t = this._enIyi[a];
      return (typeof t === 'number' && isFinite(t)) ? t : null;
    } catch (e) { return null; }
  },

  // ── GameModes kendi ⏱/CP HUD'unu çiziyor mu? (modes.js:931 drawHUD) ──────
  _modNormal() {
    try {
      const M = this._GM();
      if (!M) return true;
      if (M.active === false) return true;
      return !(M.mode === 'race' || M.mode === 'timetrial');
    } catch (e) { return true; }
  },

  // ── RPM (8000 ölçeğinde) — HUD._drawEngineGauge ile BİREBİR aynı türetme ─
  _rpm8(v, dt) {
    const maxRpm = (typeof v.maxRpm === 'number' && v.maxRpm > 0) ? v.maxRpm : 8000;
    let rpm = (typeof v.rpm === 'number' && isFinite(v.rpm)) ? v.rpm : null;
    if (rpm === null) {
      const throttle  = Math.max(0, Math.min(1, v.throttle || 0));
      const speedTop  = Math.max(1, (v.maxSpeed || 500) * 0.75);
      const speedNorm = Math.min(1, Math.abs(v.vx || 0) / speedTop);
      const withinGear = (speedNorm * 5) % 1;
      rpm = 900 + (maxRpm - 900) * (0.30 + 0.70 * withinGear) * (0.45 + 0.55 * throttle);
    }
    if (this._rpmLerp === null) this._rpmLerp = rpm;
    const k = Math.min(1, (dt || 0.016) * 9);
    this._rpmLerp += (rpm - this._rpmLerp) * k;
    const r = (maxRpm === 8000) ? this._rpmLerp : this._rpmLerp * 8000 / maxRpm;
    return Math.max(0, Math.min(8000, isFinite(r) ? r : 0));
  },

  olcum() {
    const o = {};
    for (const k in this._sayac) if (Object.prototype.hasOwnProperty.call(this._sayac, k)) o[k] = this._sayac[k];
    return o;
  },

  // ═════════════════════════════════════════════════════════════════════════
  init() {
    if (this._wrapped) return false;
    try {
      if (typeof HUD === 'undefined' || typeof HUD.draw !== 'function') return false;
      const _hd = HUD.draw.bind(HUD);
      const self = this;
      // ⚠ İMZA: HUD.draw(ctx, vehicle, gameState, canvasW, canvasH)
      HUD.draw = function (ctx, vehicle, gameState, canvasW, canvasH) {
        _hd.apply(HUD, arguments);
        try {
          self.drawHUD(ctx, vehicle || (typeof Game !== 'undefined' ? Game.vehicle : null),
                       canvasW, canvasH);
        } catch (e) {}
      };
      this._wrapped = true;
      return true;
    } catch (e) {
      try { console.error('[BaglaHud.init]', e); } catch (_) {}
      return false;
    }
  },

  selfTest() {
    const r = {};
    const sahteCtx = function (W, H) {
      const c = {
        canvas: { width: W, height: H },
        _cizim: 0, _img: 0, _grad: 0, _derinlik: 0, _enDerin: 0,
        save() { this._derinlik++; if (this._derinlik > this._enDerin) this._enDerin = this._derinlik; },
        restore() { this._derinlik--; },
        setTransform() {}, translate() {}, rotate() {}, scale() {}, clip() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, ellipse() {},
        roundRect() {}, quadraticCurveTo() {}, rect() {},
        fill() { this._cizim++; }, stroke() { this._cizim++; },
        fillRect() { this._cizim++; }, strokeRect() { this._cizim++; }, clearRect() {},
        fillText() { this._cizim++; }, strokeText() { this._cizim++; },
        measureText() { return { width: 10 }; },
        drawImage() { this._img++; },
        createLinearGradient() { this._grad++; return { addColorStop() {} }; },
        createRadialGradient() { this._grad++; return { addColorStop() {} }; },
        getImageData() { throw new Error('getImageData KULLANILMAMALI'); },
        set fillStyle(v) {}, get fillStyle() { return '#000'; },
        set strokeStyle(v) {}, get strokeStyle() { return '#000'; },
        set lineWidth(v) {}, set lineCap(v) {}, set lineJoin(v) {},
        set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
        set globalAlpha(v) {}, set globalCompositeOperation(v) {},
        set shadowColor(v) {}, set shadowBlur(v) {}, set shadowOffsetX(v) {}, set shadowOffsetY(v) {},
        set filter(v) {}
      };
      return c;
    };

    // 1) 7 modülün hepsi yüklü mü (bağlanmayanlar da varlık olarak aranır)
    // ⚠ `eval` KULLANILMIYOR — PWA'da CSP eval'i engelleyebilir ve selfTest
    //   sessizce "modül yok" derdi.
    try {
      r.moduller = (typeof ADVANCED_SPEEDOMETER === 'object' && !!ADVANCED_SPEEDOMETER)
                && (typeof TACHOMETER_SYSTEM    === 'object' && !!TACHOMETER_SYSTEM)
                && (typeof NITRO_HUD            === 'object' && !!NITRO_HUD)
                && (typeof MINIMAP_ADVANCED     === 'object' && !!MINIMAP_ADVANCED)
                && (typeof RACE_HUD             === 'object' && !!RACE_HUD)
                && (typeof DAMAGE_HUD           === 'object' && !!DAMAGE_HUD)
                && (typeof COMBO_DISPLAY        === 'object' && !!COMBO_DISPLAY);
    } catch (e) { r.moduller = false; }

    // 2) Bağlanan 5 modülün KULLANDIĞIMIZ metotları gerçekten var mı (imza doğrulaması)
    try {
      r.imzalar = typeof ADVANCED_SPEEDOMETER.drawAnalogSpeedo === 'function'
               && ADVANCED_SPEEDOMETER.drawAnalogSpeedo.length === 6
               && typeof TACHOMETER_SYSTEM.drawTachometer === 'function'
               && typeof MINIMAP_ADVANCED.drawMinimap === 'function'
               && MINIMAP_ADVANCED.drawMinimap.length === 8
               && typeof RACE_HUD.drawRaceTimer === 'function'
               && typeof RACE_HUD.drawLapCounter === 'function'
               && typeof RACE_HUD.drawCheckpointIndicator === 'function'
               && typeof DAMAGE_HUD.drawDamageIndicator === 'function'
               && typeof DAMAGE_HUD.drawCrashWarning === 'function';
    } catch (e) { r.imzalar = false; }

    // 3) Yerleşim: yatay telefonda (H=390) sol/sağ şerit NEGATİF olmalı (hiçbir şey çizilmez)
    try {
      const y1 = this._yerlesim(1280, 390);
      const y2 = this._yerlesim(390, 844);
      // Yatay telefon: en küçük widget bile (süre kutusu 54 px / kadran çifti 100 px)
      // sığmamalı → o ekranda bu katman HİÇBİR ŞEY çizmez.
      r.yerlesimDar   = y1.solYuk < 54 && y1.sagYuk < 100;
      r.yerlesimGenis = y2.solYuk > 100 && y2.sagYuk > 100;
      // fren düğmesinin üstünde kalıyor mu?
      const btnUst = 844 - (2 * Math.min(60, 390 * 0.1) + 16);
      r.frenCakismaz = y2.solAlt < btnUst;
      // checkpoint oku kombo serisi hapının (H*0.44 ± 37) ALTINDA mı?
      r.okKomboAltinda = (y2.okY - 26) > (844 * 0.44 + 37) && y2.okGecerli === true;
      // yatay telefonda ok için yer yok → çizilmemeli
      r.okDarEkranKapali = y1.okGecerli === false;
    } catch (e) { r.yerlesimDar = r.yerlesimGenis = r.frenCakismaz = false;
                  r.okKomboAltinda = r.okDarEkranKapali = false; }

    // 4) 3 ekran boyutunda çizim çöküyor mu + gradient/getImageData kaçağı var mı
    // ⚠ Canlı durumu KİRLETME: koşu sayaçları yedeklenip geri yüklenir
    //   (hookups.js selfTest'inin popup yedekleme dersi — aksi halde oyuna
    //    girişte sahte süre/hasar durumu görünürdü).
    try {
      const boyutlar = [[390, 844], [1280, 720], [1280, 390]];
      let cizimVar = false, gradKacak = 0;
      const yedek = {
        kosuT: this._kosuT, sonMesafe: this._sonMesafe, sonKare: this._sonKare,
        sonHasar: this._sonHasar, carpmaT: this._carpmaT, rpmLerp: this._rpmLerp,
        cpSayi: this._cpSayi, kosuCp: this._kosuCp, sayac: this._sayac, ob: this._ob
      };
      this._sayac = { kare: 0, speedo: 0, tako: 0, minimap: 0, timer: 0, cpSayac: 0,
                      cpOk: 0, hasar: 0, carpma: 0, yenidenCiz: 0, hata: 0 };
      this._ob = {};
      this._gTest = { state: 'playing', startX: 200, mapId: '__test__', terrain: null };
      for (let i = 0; i < boyutlar.length; i++) {
        const W = boyutlar[i][0], H = boyutlar[i][1];
        const c = sahteCtx(W, H);
        const v = { x: 4000, y: 300, vx: 260, vy: 0, angle: 0.2, throttle: 1, brake: 0,
                    onGround: true, airTime: 0, fuel: 40, fuelMax: 80, maxSpeed: 520,
                    damageLevel: 0.3, flipCount: 0 };
        this._sonMesafe = undefined;
        for (let f = 0; f < 30; f++) { this._sonKare = 0; this.drawHUD(c, v, W, H); }
        if (c._cizim > 0 || c._img > 0) cizimVar = true;
        gradKacak += c._grad;       // gradient DOĞRUDAN ana ctx'e üretilmemeli
        if (c._derinlik !== 0) gradKacak += 1000;   // save/restore dengesizliği
      }
      this._gTest = null;
      this._kosuT = yedek.kosuT; this._sonMesafe = yedek.sonMesafe; this._sonKare = yedek.sonKare;
      this._sonHasar = yedek.sonHasar; this._carpmaT = yedek.carpmaT; this._rpmLerp = yedek.rpmLerp;
      this._cpSayi = yedek.cpSayi; this._kosuCp = yedek.kosuCp;
      this._sayac = yedek.sayac; this._ob = yedek.ob;
      r.cizimCalisiyor = cizimVar;
      r.anaCtxGradientYok = gradKacak === 0;
    } catch (e) {
      this._gTest = null;
      r.cizimCalisiyor = false; r.anaCtxGradientYok = false;
    }

    // 5) Bilerek bağlanmayanlar GERÇEKTEN çağrılmıyor mu (çift gösterge koruması)
    try {
      const kaynak = String(BaglaHud.drawHUD) + String(BaglaHud._cpDurum);
      r.cakismaYok = kaynak.indexOf('NITRO_HUD') < 0
                  && kaynak.indexOf('COMBO_DISPLAY') < 0
                  && kaynak.indexOf('drawGearIndicator') < 0
                  && kaynak.indexOf('drawBotPosition') < 0
                  && kaynak.indexOf('drawDigitalSpeedo') < 0
                  && kaynak.indexOf('getImageData') < 0;
    } catch (e) { r.cakismaYok = false; }

    // 6) 🔴 PERF KİLİDİ (31 Tmz): yerleşim koşu boyunca SABİT → her karede
    //    yeniden hesaplanmamalı. Enjeksiyon: aynı (W,H) ile iki çağrı AYNI
    //    nesneyi döndürmeli; boyut değişince YENİ nesne gelmeli VE değerler
    //    önbelleksiz hesapla BİREBİR AYNI olmalı.
    try {
      const eA = this._yerA, eW = this._yerW, eH = this._yerH;
      this._yerA = null;
      const a1 = this._yerlesim(390, 844);
      const a2 = this._yerlesim(390, 844);
      const b1 = this._yerlesim(844, 390);
      this._yerA = null;                              // önbelleksiz yeniden hesap
      const ham = this._yerlesim(390, 844);
      let ayni = true;
      for (const k in ham) if (ham[k] !== a1[k]) ayni = false;
      this._yerA = eA; this._yerW = eW; this._yerH = eH;
      r.yerlesimOnbellek = (a1 === a2) && (b1 !== a1) && ayni;
    } catch (e) { r.yerlesimOnbellek = false; }

    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaHud = BaglaHud;
  try {
    // hookups.js / uitheme.js ile aynı desen: DOMContentLoaded → setTimeout(0).
    // HUD henüz yoksa kısa aralıklarla 20 kez dener (script sırası değişse de bağlanır).
    var _bhDene = function (kalan) {
      if (BaglaHud.init()) return;
      if (kalan > 0) setTimeout(function () { _bhDene(kalan - 1); }, 50);
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { _bhDene(20); }, 0); });
    } else {
      setTimeout(function () { _bhDene(20); }, 0);
    }
  } catch (e) {}
}
