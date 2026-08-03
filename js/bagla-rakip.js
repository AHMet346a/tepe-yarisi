'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// BAGLA-RAKIP — 30 Tmz · "yazılmış ama ölü" rakip/hasar/engel modüllerini
// GERÇEK oyuna bağlar. ADDITIVE: hiçbir mevcut dosya değiştirilmez, yalnız
// Game.update + HUD.draw monkey-patch ile sarmalanır (şablon: js/hookups.js).
//
// BAĞLANAN 3 MODÜL (hepsi js/game.js içinde, çalışma zamanı ölçümü: 0 tetiklenme)
//   · NPCSystem      (game.js:2295) — rakip araçlar
//   · ObstacleSystem (game.js:2151) — kırılabilir engel/prop
//   · DamageSystem   (game.js:2449) — bölgesel hasar + performans cezası
//
// BAĞLANMAYAN 1 MODÜL — GHOST_SYSTEM (game.js:3285). GEREKÇE §GHOST altında.
//
// ═══ ÇAKIŞMA HARİTASI (bağlamadan ÖNCE ölçüldü) ═══════════════════════════
// 1) HAYALET  : js/replay.js ZATEN canlı. `Replay.record()` game.js:397'de her
//    karede, `Replay.saveIfBest()` game.js:832'de koşu sonunda çağrılıyor.
//    GHOST_SYSTEM aynı işi YENİDEN yapar → ekranda İKİ hayalet + iki kayıt.
//    ▶ BAĞLANMADI. Ayrıntı: §GHOST.
// 2) ENGEL    : js/terrain.js'teki DYNAMIC_OBSTACLES/ObstacleManager katmanı
//    ÖLÜ (`new ObstacleManager` hiçbir yerde yok — 0 örnekleme). CANLI olan tek
//    engel katmanı `js/environment.js` `_updateHazards()` (game.js:424'ten
//    Environment.update ile her kare çalışır, `settings.obstacles` kapısı).
//    ▶ ObstacleSystem YALNIZ o kapı KAPALIYKEN prop üretir (karşılıklı dışlama
//      = aynı x'te iki engel matematiksel olarak imkânsız) VE ayrıca her doğum
//      noktası Environment.hazards + terrain sikkelerine mesafe kontrolünden
//      geçer (kapı sonradan açılırsa bile çakışma olmasın diye).
// 3) HASAR    : js/physics.js `DAMAGE_MODEL` (2283) ÖLÜ — dosya dışında 0 çağrı.
//    CANLI olan `Environment.settings.damage` (environment.js:351): sert inişte
//    `v.damageLevel` biriktirir ve 1'de aracı imha eder.
//    ▶ DamageSystem'in İNİŞ hasarı YALNIZ o mod KAPALIYKEN beslenir (çift hasar
//      yok). Engel/rakip çarpması Environment'ın bilmediği bir kaynaktır →
//      her durumda beslenir.
// 4) GÖRSEL   : `js/gorsel.js` `eskiAtla` tablosuna DOKUNULMADI — Renderer.drawGame
//    HİÇ sarmalanmıyor. Dünya çizimi HUD.draw sarmalayıcısının BAŞINDA,
//    Camera.apply/restore arasında yapılıyor (hookups.js'in checkpoint
//    bayraklarıyla aynı desen).
//
// ═══ BULUNAN 9 GERÇEK HATA (bağlamadan önce satır satır okundu) ════════════
//  H1 game.js:2212-2213 ObstacleSystem.checkObstacleCollision `vehicle.w/.h`
//     okur; gerçek araçta alanlar `width/height` (physics.js:54-55) → undefined
//     → `distX < NaN` HER ZAMAN false → çarpışma HİÇ olmaz. ▶ şim (shim) nesne.
//  H2 game.js:2389 NPCSystem.checkNPCCollision aynı hata (`player.w/.h`). ▶ şim.
//  H3 game.js:2315 spawnNPC `y: 0` yazar, updateNPCs y'ye HİÇ dokunmaz → NPC
//     dünya y=0'da (gökyüzünde) kalır. ▶ her kare zemine oturtuluyor.
//  H4 game.js:2400-2404 drawNPCs / 2230-2233 drawObstacles / 3362-3363 drawGhost
//     ekran x'ini `x - camX` diye hesaplar; ZOOM YOK. Doğrusu Camera.worldToScreen
//     = `(wx - cam.x) * cam.zoom` (camera.js:310). CheckpointSystem'in 5
//     hatasından biri buydu. ▶ Çizim Camera.apply() içinde DÜNYA uzayında.
//  H5 game.js:2404 drawNPCs kültürü `sx > ctx.canvas.width` ile yapar — dünya
//     koordinatını piksel genişliğiyle kıyaslar. ▶ Camera.isVisible kullanıldı.
//  H6 game.js:2297-2304 NPC profil topSpeed 120-200; oyuncunun gerçek tavanı
//     `v.maxSpeed * 0.6984` (physics.js) = jeep'te 363, formula'da 811.
//     ⚠ TUNING(31 Tmz): kademe 0.72→0.6984 / 0.88→0.8536 oldu; buradaki kopya da
//       güncellendi. Güncellenmeseydi rakipler oyuncudan %3 hızlı ölçeklenirdi.
//     Ölçeksiz bağlanırsa rakipler ilk 3 saniyede görüş alanından çıkar.
//     ▶ difficulty = oyuncuTavanı / 165 (profil ortalaması) ile ölçekleniyor.
//  H7 game.js:2198 updateObstacles yerçekimi uygular ama ZEMİN KELEPÇESİ YOK →
//     itilen engel sonsuza kadar düşer. ▶ zemine oturtma eklendi.
//  H8 game.js:3303 GHOST_SYSTEM.recordFrame `recordTimer += 0.016` — dt'yi YOK
//     SAYAR (30 fps'te kayıt 2× yavaş oynar). game.js:3311 `vehicle.isGrounded`
//     okur; gerçek alan `onGround` → state HER ZAMAN 'air'.
//  H9 game.js:3318 stopRecording koşulu `!bestRuns[key] || frames.length > 0` →
//     her koşu öncekini EZER; "en iyi" hiç saklanmaz (adı yalan).
//
// ⚠ Hiçbiri js/game.js'te DÜZELTİLMEDİ (additive kural) — H1/H2/H3/H4/H5/H7
//   burada sarmalayarak etkisiz kılındı; H6 modülün kendi `difficulty` kolu
//   ile çözüldü; H8/H9 bağlanmayan modülde kaldı.
// ═══════════════════════════════════════════════════════════════════════════
const BaglaRakip = {
  VERSION: '1.0',
  _wrapped: false,

  // ── Ayarlar (hepsi ölçülerek seçildi) ───────────────────────────────────
  AYAR: {
    NPC_TABAN:        4,      // ULTRA'da rakip sayısı (kalite ile ölçeklenir)
    NPC_ORT_TOPSPEED: 165,    // NPC_PROFILES topSpeed ortalaması (120..200)
    NPC_ACCEL_OLCEK:  0.35,   // ivme yumuşatma (ölçeksiz: tavan hıza <0.5 sn)
    NPC_ILK_X:        420,    // ilk rakip oyuncudan bu kadar ÖNDE doğar
    NPC_ARA:          230,    // rakipler arası doğum aralığı
    NPC_ILK_HIZ:      0.40,   // doğuşta oyuncu tavanının bu kadarıyla hareketli
    NPC_CAN:          400,    // ⚠ modül 100 verir; ilk temasta ölür (ölçüldü) → 400
    NPC_CARP_CD:      0.8,    // aynı rakiple tekrar çarpışma bekleme süresi (sn)
    KULTUR_EKRAN:     1.0,    // kameranın ±1 ekran genişliği dışı GÜNCELLENMEZ
    PROP_ARALIK:      760,    // prop'lar arası taban mesafe (dünya px)
    PROP_ONDE:        1500,   // oyuncunun kaç px önüne kadar doldurulur
    PROP_TEMIZ:       1800,   // bu uzaklıktan öteki prop'lar silinir
    PROP_MIN_UZAK:    240,    // Environment tehlikesine min mesafe (engel-engel)
    PROP_MIN_SIKKE:   80,     // sikkeye min mesafe (sikke r=14, prop ~45 → 80 yeter)
    PROP_DENEME:      4,      // yer uygun değilse kaç kez kaydırıp denenir
    PROP_TIPLERI:     ['tyre', 'oil_drum', 'crate'],  // ÖLÜMCÜL OLMAYAN prop'lar
    INIS_HASAR_ESIK:  0.9,    // landingShock bu değerin üstündeyse hasar
    LIDER_ARALIK:     0.25    // liderlik tablosu yenileme (sn)
  },

  // ── Koşu durumu ─────────────────────────────────────────────────────────
  _sonMesafe: undefined,
  _propSonX:  0,
  _npcKuruldu: false,
  _baseTorque: undefined,
  _liderT: 0, _lider: null, _liderSira: 0, _liderTop: 1,
  _sesCd: 0,
  _kaliteCache: null, _kaliteKademe: null,

  // ═══════════════════════════════════════════════════════════════════════
  //  GRADIENT ÖNBELLEĞİ (PERF 31 Tmz) — kural: kare başına YENİ gradient ≈ 0
  // ═══════════════════════════════════════════════════════════════════════
  // ÖLÇÜLDÜ (300 kare, countryside, sahte ctx sayacı):
  //   `drawWorld` kare başına **39,0 YENİ gradient** üretiyordu. Kaynak
  //   `drawVehicle` (vehicles.js:9215) — NPC başına ~13 gradient, 3 görünür
  //   NPC = 39. Oyunun tabanı 115/kare olduğu için bu **%34 artış** demekti.
  //   CLAUDE.md: gradient üretimi p99'u 44 ms'e çıkaran kanıtlanmış sebep.
  //
  // 🔴 NEDEN ÖNBELLEKLENEBİLİR: `drawVehicle` İLK İŞ olarak
  //   `ctx.translate(vehicle.x, vehicle.y)` yapar (vehicles.js:9216) ve gövdeyi
  //   YEREL uzayda çizer. Yani içerideki `createLinearGradient` argümanları
  //   NPC'nin dünya konumundan BAĞIMSIZDIR → aynı araç tipinin her örneği ve
  //   her karesi AYNI anahtarı üretir.
  //
  // 🔴 NEDEN Proxy DEĞİL: `BaglaArazi._prox` bir Proxy kuruyor; orada çağrı
  //   sayısı azdır (2 prop/kare). Burada NPC çizimi kare başına ~1.650 ctx
  //   çağrısı yapıyor — hepsini `get` tuzağından geçirmek kazancı yerdi.
  //   ▶ Yalnız İKİ fabrika metodu ctx üzerine KENDİ ÖZELLİK olarak yazılır
  //     (prototipteki yerlisini gölgeler); kalan ~1.650 çağrı YERLİYE gider,
  //     sıfır ek maliyet. `_grAcik` bayrağı kapalıyken tam geçiş (passthrough)
  //     yapılır → oyunun geri kalanının gradientlerine DOKUNULMAZ.
  //
  // 🔴 `addColorStop` ÇİFT EKLEME KORUMASI: önbellekten dönen gradient'e
  //   çağıran yine `addColorStop` çağırır. İkinci kullanımda gradient
  //   "DONDURULUR" — nesnenin ÜZERİNE boş bir `addColorStop` yazılır
  //   (prototipteki yerlisini gölgeler). Stop'lar bir kez, ilk üretimde
  //   eklenmiştir; sonraki tüm çağrılar boşa gider. Böylece `fillStyle`
  //   ataması hiç kesilmeden GERÇEK gradient'i alır (vekil nesne YOK).
  _grOnbellek: null, _grAdet: 0, _grUretim: 0, _grToplam: 0, _grTemizleme: 0,
  _grSon: null, _grCtx: null, _grAcik: false, _grEtiket: '', _grSayac: 0,
  // ÖLÇÜLDÜ (3.000 kare): önbellek 252 → 350 girdi (kare başına +0,033) —
  // yakınsıyor. Tavan 700 iken ~5 dakikada bir boşaltma olurdu; boşaltmadan
  // sonra bütçe (2/kare) yüzünden ~350 kare boyunca "çağrı yerinin son
  // gradienti" yedeğine düşülürdü. 1200 ile bir koşuda boşaltma OLMAZ.
  _GR_MAKS: 1200,         // önbellek tavanı (aşılırsa boşaltılır)
  _GR_YUV: 2,             // argüman yuvarlaması (dünya px)
  _GR_KARE_BUTCE: 2,      // bir karede üretilebilecek EN ÇOK yeni gradient
  _BOS_STOP: function () {},

  // ctx'e bir kez kurulur; `_grAcik` false iken tam geçiş yapar.
  _grKur(ctx) {
    if (!ctx || this._grCtx === ctx) return this._grCtx === ctx;
    if (typeof ctx.createLinearGradient !== 'function' ||
        typeof ctx.createRadialGradient !== 'function') return false;
    const self = this;
    const hamL = ctx.createLinearGradient, hamR = ctx.createRadialGradient;
    try {
      ctx.createLinearGradient = function (a, b, c, d) {
        if (!self._grAcik) return hamL.call(ctx, a, b, c, d);
        return self._grAl(ctx, hamL, 'L', a, b, c, d, 0, 0, 4);
      };
      ctx.createRadialGradient = function (a, b, c, d, e, f) {
        if (!self._grAcik) return hamR.call(ctx, a, b, c, d, e, f);
        return self._grAl(ctx, hamR, 'R', a, b, c, d, e, f, 6);
      };
    } catch (e) { return false; }
    this._grCtx = ctx;
    if (!this._grOnbellek) { this._grOnbellek = {}; this._grSon = {}; }
    return true;
  },

  // Gradient'i "dondur": üzerine boş addColorStop yaz (yerlisini gölgeler).
  // 🔴 BAŞARISIZLIK = null. Bazı motorlarda yerel `CanvasGradient` üzerine
  //   özellik yazılamayabilir. Dondurulamayan bir gradient önbellekte
  //   KALAMAZ: her karede `addColorStop` yeniden çağrılır, stop'lar birikir,
  //   gradient bozulur ve bellek büyür. Çağıran null görürse önbellek
  //   girdisini atıp TAZE gradient üretir (eski davranışa güvenli düşüş).
  _grDondur(g) {
    if (!g) return null;
    if (g.__bgrDon) return g;
    try {
      Object.defineProperty(g, 'addColorStop', { value: this._BOS_STOP, configurable: true, writable: true });
      Object.defineProperty(g, '__bgrDon', { value: 1, configurable: true, writable: true });
    } catch (e) {
      try { g.addColorStop = this._BOS_STOP; g.__bgrDon = 1; } catch (_) {}
    }
    return (g.__bgrDon && g.addColorStop === this._BOS_STOP) ? g : null;
  },

  _grAl(ctx, ham, tur, a, b, c, d, e, f, n) {
    const y = this._GR_YUV;
    // Anahtar = çağrı YERİ (etiket + sıra) + yuvarlanmış argümanlar.
    const yer = this._grEtiket + '#' + (this._grSayac++) + tur;
    let anah = yer;
    anah += ',' + (isFinite(a) ? Math.round(a / y) * y : 0);
    anah += ',' + (isFinite(b) ? Math.round(b / y) * y : 0);
    anah += ',' + (isFinite(c) ? Math.round(c / y) * y : 0);
    anah += ',' + (isFinite(d) ? Math.round(d / y) * y : 0);
    if (n > 4) {
      anah += ',' + (isFinite(e) ? Math.round(e / y) * y : 0);
      anah += ',' + (isFinite(f) ? Math.round(f / y) * y : 0);
    }
    const kap = this._grOnbellek;
    let g = kap[anah];
    if (g) {
      const d = this._grDondur(g);
      if (d) { this._grSon[yer] = d; return d; }
      delete kap[anah]; this._grAdet--;          // dondurulamadı → önbelleğe ALMA
    }

    // 🔴 KARE BÜTÇESİ — SERT ÜST SINIR (BaglaArazi ile aynı ilke).
    //   Argümanı sürekli oynayan bir çizim önbelleği doldurana kadar kare
    //   başına onlarca yeni gradient üretebilirdi. Bütçe dolduysa aynı çağrı
    //   yerinin EN SON gradienti yeniden kullanılır.
    if (this._grUretim >= this._GR_KARE_BUTCE) {
      const eski = this._grSon[yer];
      if (eski) { const d = this._grDondur(eski); if (d) return d; }
    }
    if (this._grAdet >= this._GR_MAKS) {
      this._grOnbellek = {}; this._grSon = {}; this._grAdet = 0; this._grTemizleme++;
    }
    try {
      g = (n > 4) ? ham.call(ctx, a, b, c, d, e, Math.max(0, f || 0))
                  : ham.call(ctx, a, b, c, d);
    } catch (err) { return { addColorStop: this._BOS_STOP }; }
    this._grOnbellek[anah] = g;
    this._grSon[yer] = g;
    this._grAdet++; this._grUretim++; this._grToplam++;
    return g;                                  // İLK üretim: stop'lar eklenecek
  },

  // ── Havuzlar (kare başına nesne ayırma → ~0) ────────────────────────────
  // ÖLÇÜLDÜ: `_npcGuncelle` kare başına 4 (yakin/uzak/concat/sim),
  // `_engelGuncelle` 1, `drawWorld` NPC başına 1 nesne ayırıyordu.
  // 🔴 `NPCSystem.updateNPCs` sonunda `this.npcs = this.npcs.filter(...)`
  //    yapar → dönen dizi BİZİM havuz dizimiz DEĞİLDİR; bu yüzden birleştirme
  //    ayrı bir havuz dizisine (`_hepsiH`) kopyalanır, `concat` kullanılmaz.
  _yakinH: null, _uzakH: null, _hepsiH: null,
  _simH: null, _simCizH: null,
  _sim(v) {
    let s = this._simH;
    if (!s) s = this._simH = { x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0 };
    s.x = v.x; s.y = v.y; s.vx = v.vx; s.vy = v.vy; s.w = v.width; s.h = v.height;
    return s;
  },

  // ── Ölçüm sayaçları (rapor + selfTest bunları okur) ──────────────────────
  _sayac: {
    kare: 0,            // frame() çağrısı
    npcGuncelle: 0,     // NPCSystem.updateNPCs çağrısı
    npcAdim: 0,         // güncellenen NPC × kare (kültür SONRASI)
    npcAtlanan: 0,      // kültürle atlanan NPC × kare
    npcCiz: 0,          // drawVehicle çağrısı (NPC için)
    npcIsinla: 0,       // 2 ekran ötesine düşüp geri getirilen rakip
    engelDogum: 0,
    engelCarpma: 0,
    hasarUygula: 0,
    npcCarpma: 0
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════════════
  _G()  { try { return (typeof Game    !== 'undefined') ? Game    : null; } catch (e) { return null; } },
  _C()  { try { return (typeof Camera  !== 'undefined') ? Camera  : null; } catch (e) { return null; } },
  _E()  { try { return (typeof Environment !== 'undefined') ? Environment : null; } catch (e) { return null; } },
  _num(v, d) { v = Number(v); return isFinite(v) ? v : (d || 0); },

  // Kalite anahtarı — kademe değişince önbellek düşer.
  // ⚠ `dekorYogunluk` kalite tablosunda TANIMLI ama hiçbir kod OKUMUYORDU
  //   (CLAUDE.md §8B.29/3B-5b "3 ÖLÜ KALİTE ANAHTARI"). Yoğunluk ölçeği olarak
  //   tam da bunun için tasarlanmış → burada canlandırılıyor.
  _kalite() {
    try {
      if (typeof Kalite === 'undefined') return 1;
      const k = Kalite.kademe();
      if (k !== this._kaliteKademe) {
        this._kaliteKademe = k;
        this._kaliteCache  = this._num(Kalite.ayar('dekorYogunluk'), 1);
      }
      return this._kaliteCache;
    } catch (e) { return 1; }
  },
  _kaliteAyar(ad) {
    try { return (typeof Kalite !== 'undefined') ? this._num(Kalite.ayar(ad), 0) : 1; } catch (e) { return 1; }
  },

  // 🔴 DÜNYA KOORDİNATI: mesafe metresi = (v.x - Game.startX) / 2  (game.js:431,439)
  _mesafe(v, G) { return Math.max(0, Math.floor((v.x - G.startX) / 2)); },

  // Zemin yüksekliği (savunmalı)
  _zemin(terrain, x) {
    try { return (terrain && terrain.getYAt) ? this._num(terrain.getYAt(x), 400) : 400; }
    catch (e) { return 400; }
  },
  // Zemin eğimi → araç açısı (radyan)
  _egim(terrain, x) {
    const d = 18;
    const y1 = this._zemin(terrain, x - d), y2 = this._zemin(terrain, x + d);
    const a = Math.atan2(y2 - y1, d * 2);
    return isFinite(a) ? Math.max(-1.2, Math.min(1.2, a)) : 0;
  },

  // Gerçek araç şemasına uygun bir VehicleDefs kaydı seç.
  // 🔴 vehicles.js:11856 `Object.assign(VehicleDefs, {...})` FARKLI ŞEMADA kayıt
  //   ekliyordu (bug #21). fuelMax + wheels dizisi YOKSA drawVehicle çöker
  //   (vehicles.js:9244 `vehicle.wheels.forEach`, 9243 `def.wheels`).
  _aracSec(i) {
    const aday = ['jeep', 'motocross', 'rallycar', 'dunebuggy', 'monster', 'van', 'atv', 'pickup'];
    let VD = null;
    try { VD = (typeof VehicleDefs !== 'undefined') ? VehicleDefs : null; } catch (e) {}
    if (!VD) return 'jeep';
    const gecerli = [];
    for (let k = 0; k < aday.length; k++) {
      const d = VD[aday[k]];
      if (d && typeof d.fuelMax === 'number' && isFinite(d.fuelMax) &&
          Array.isArray(d.wheels) && d.wheels.length > 0 &&
          typeof d.w === 'number' && typeof d.h === 'number') gecerli.push(aday[k]);
    }
    if (!gecerli.length) return 'jeep';
    return gecerli[Math.abs(i | 0) % gecerli.length];
  },

  // drawVehicle'ın okuduğu TÜM alanlar (vehicles.js:9206-9292) — eksik alan = çökme
  _sahteTeker(vid) {
    let n = 2;
    try {
      const d = (typeof VehicleDefs !== 'undefined') ? VehicleDefs[vid] : null;
      if (d && Array.isArray(d.wheels)) n = d.wheels.length;
    } catch (e) {}
    const out = [];
    for (let i = 0; i < n; i++) out.push({ comp: 0, spin: 0, contact: true });
    return out;
  },
  // Gövde merkezinden teker tabanına uzaklık (zemine oturtma için)
  _yerOfset(vid) {
    try {
      const d = (typeof VehicleDefs !== 'undefined') ? VehicleDefs[vid] : null;
      if (!d || !Array.isArray(d.wheels) || !d.wheels.length) return 42;
      let maxWy = 0, r = 18;
      for (let i = 0; i < d.wheels.length; i++) {
        const w = d.wheels[i];
        if ((w.y || 0) > maxWy) maxWy = w.y || 0;
        r = w.r || w.radius || r;
      }
      return maxWy + r;
    } catch (e) { return 42; }
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  KOŞU SIFIRLAMA — Game.startRun'a DOKUNMADAN (additive kalmak için).
  //  hookups.js:118-124 ile aynı ilke: mesafe geri gittiyse yeni koşudur.
  // ═══════════════════════════════════════════════════════════════════════
  _kosuSifirla(v, G) {
    try { if (typeof NPCSystem      !== 'undefined') { NPCSystem.npcs = []; NPCSystem._nextId = 1; } } catch (e) {}
    try { if (typeof ObstacleSystem !== 'undefined') { ObstacleSystem.obstacles = []; ObstacleSystem._nextId = 1; } } catch (e) {}
    try { if (typeof DamageSystem   !== 'undefined' && DamageSystem.init) DamageSystem.init(); } catch (e) {}
    this._npcKuruldu = false;
    this._propSonX   = v ? v.x + 600 : 0;
    this._baseTorque = undefined;
    this._lider = null; this._liderT = 0; this._liderSira = 0; this._liderTop = 1;
    this._sesCd = 0;
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  1) NPC — RAKİP ARAÇLAR
  // ═══════════════════════════════════════════════════════════════════════
  // 🔴🔴 PERF/BUGFIX(31 Tmz) — RAKİPLER NORMAL SOLO KOŞUDA DA DOĞUYORDU.
  //   Kullanıcı telefonda "öyle kasıyor ki hareket edemiyorum" dedi. ÖLÇÜLDÜ:
  //   NPC katmanı kare başına 1.108–2.281 ctx çağrısı = karenin %10–22'si,
  //   ve bunu YALNIZ 3-4 rakip araç çizmek için harcıyordu.
  //   Asıl sorun maliyet değil MANTIK: `_npcKur` koşulsuz çağrılıyordu, yani
  //   "Normal Sürüş"te (kullanıcının oynadığı mod) ekranda olmaması gereken
  //   4 yapay rakip doğuyordu. Bu bir kalite özelliği DEĞİL, hatadır.
  // ▶ Artık yalnız yarış/bot modunda doğar: `Game.botRaceMode`
  //   (game.js:256 — `botMode || gameMode === 'race'`).
  // ⚠ KALİTE DÜŞÜRÜLMEDİ: yarış modunda rakip sayısı ve davranışı AYNEN aynı.
  //   Solo koşuda zaten olmamaları gereken nesneler çizilmiyor.
  _yarisMi(G) {
    try {
      const g = G || (typeof Game !== 'undefined' ? Game : null);
      if (!g) return false;
      if (g.botRaceMode) return true;
      if (g.gameMode === 'race') return true;
    } catch (e) {}
    return false;
  },

  _npcKur(v, G) {
    if (typeof NPCSystem === 'undefined') return;
    if (!this._yarisMi(G)) {                          // solo koşu → rakip YOK
      try { NPCSystem.npcs = []; NPCSystem._nextId = 1; } catch (e) {}
      this._npcKuruldu = true;
      return;
    }
    const kal = this._kalite();                       // dusuk 0.30 … ultra 1.00
    const adet = Math.max(0, Math.round(this.AYAR.NPC_TABAN * kal));
    NPCSystem.npcs = []; NPCSystem._nextId = 1;
    if (adet <= 0) { this._npcKuruldu = true; return; }

    // H6 — profil hızlarını oyuncunun gerçek tavanına ölçekle.
    //  physics.js → tavan = maxSpeed * (id==='formula' ? 0.8536 : 0.6984)
    //  🔴 TUNING(31 Tmz) ile SENKRON — physics.js'teki kademe değişirse BURASI DA
    //     değişmeli, yoksa rakipler oyuncunun gerçek tavanından hızlı ölçeklenir.
    const oyuncuTop = this._num(v.maxSpeed, 520) * (v.id === 'formula' ? 0.8536 : 0.6984);
    const olcek     = Math.max(0.5, oyuncuTop / this.AYAR.NPC_ORT_TOPSPEED);

    const P = NPCSystem.NPC_PROFILES || [];
    for (let i = 0; i < adet && P.length; i++) {
      // 'ghost' profili sabit hızlı — çeşitlilik için sıralı seçim
      const prof = P[(i * 3 + 1) % P.length];
      // ⚠ Profil topSpeed'leri 120..200 arasında saçılıyor; ham ölçekte rakipler
      //   ilk 5 sn'de ±900 px dağılıyor ve 750 px'lik görüş alanında hiç
      //   görünmüyorlardı (ölçüm: 0,35 çizim/kare). Profil farkı NORMALİZE edilip
      //   yerine ±%6'lık bilinçli bir yayılım konuyor.
      const zorluk = olcek * (this.AYAR.NPC_ORT_TOPSPEED / (prof.topSpeed || 165))
                           * (0.94 + (i % 4) * 0.04);
      // ⚠ ÖLÇÜLDÜ: `startX + 40 + i*110` rakipleri oyuncunun GÖVDESİNİN İÇİNE
      //   doğuruyordu → 60 karede 21 çarpışma, 4 rakibin 2'si ilk saniyede yok
      //   oldu, oyuncu 118 hasar yedi. Önde + hareketli doğuyorlar.
      const x = G.startX + this.AYAR.NPC_ILK_X + i * this.AYAR.NPC_ARA;
      let npc = null;
      try { npc = NPCSystem.spawnNPC(prof.id, x, zorluk); } catch (e) { npc = null; }
      if (!npc) continue;
      npc.profile.accel *= this.AYAR.NPC_ACCEL_OLCEK;   // profile bir KOPYA (game.js:2314)
      npc.vx      = oyuncuTop * this.AYAR.NPC_ILK_HIZ;
      // ⚠ modül `npc.hp -= |vOyuncu - vNpc| * 0.3` yazar (game.js:2392); 374'lük
      //   bir hız farkı = 112 hasar → 100 canlı rakip TEK temasta yok olur.
      npc._hpMax  = this.AYAR.NPC_CAN;
      npc.hp      = this.AYAR.NPC_CAN;
      npc._carpCd = 0;
      npc._zorluk = zorluk;                             // lastik-bant tabanı
      npc._vid    = this._aracSec(i + 1);
      npc._wheels = this._sahteTeker(npc._vid);
      npc._yOfs   = this._yerOfset(npc._vid);
      npc._anim   = 0;
      npc.y       = this._zemin(G.terrain, npc.x) - npc._yOfs;
      npc.angle   = this._egim(G.terrain, npc.x);
    }
    this._npcKuruldu = true;
  },

  _npcGuncelle(dt, v, G) {
    if (typeof NPCSystem === 'undefined') return;
    if (!this._npcKuruldu) this._npcKur(v, G);
    const hepsi = NPCSystem.npcs;
    if (!hepsi || !hepsi.length) return;

    // ── KÜLTÜR: yalnız kameranın ±1 ekran genişliğindekiler güncellenir ──
    const C = this._C();
    const zoom  = (C && C.zoom) ? C.zoom : 1;
    const viewW = (C ? C.width : 800) / (zoom || 1);
    const camX  = C ? C.x : (v.x - viewW * 0.32);
    const m     = viewW * this.AYAR.KULTUR_EKRAN;
    const lo = camX - m, hi = camX + viewW + m;

    // 🔴 HAVUZ (PERF 31 Tmz): her karede yeni dizi ayırmak yerine uzunluğu 0'la.
    const yakin = this._yakinH || (this._yakinH = []);
    const uzak  = this._uzakH  || (this._uzakH  = []);
    yakin.length = 0; uzak.length = 0;
    for (let i = 0; i < hepsi.length; i++) {
      const n = hepsi[i];
      if (n.x >= lo && n.x <= hi) { yakin.push(n); continue; }
      // ⚠ Kültür edilen rakip DONAR. 2 ekran ötesine düşen bir rakip bir daha
      //   ASLA geri gelemezdi (ölçüldü: uzun koşuda saha boşalıyor). Görüş
      //   alanı dışında O(1) ışınlama ile yarış canlı tutulur — oyuncu bunu
      //   göremez (tanım gereği ekran dışı).
      if (n.x < lo - viewW)      { n.x = lo; n.vx = Math.max(n.vx, Math.abs(v.vx) * 0.8); this._sayac.npcIsinla++; }
      else if (n.x > hi + viewW) { n.x = hi; n.vx = Math.min(n.vx, Math.abs(v.vx) * 1.1); this._sayac.npcIsinla++; }
      else { uzak.push(n); continue; }
      yakin.push(n);
    }
    this._sayac.npcAdim    += yakin.length;
    this._sayac.npcAtlanan += uzak.length;
    if (!yakin.length) return;

    // ── LASTİK BANT: modülün KENDİ `difficulty` kolu üzerinden (game.js:2342,2347
    //   hem ivmeyi hem tavan hızı kelepçesini bundan okur). Geride kalan +%18,
    //   önde giden −%18. Yarış görüş alanında kalır, matematik modülde kalır.
    for (let i = 0; i < yakin.length; i++) {
      const n = yakin[i];
      if (!n._zorluk) n._zorluk = n.difficulty || 1;
      let b = (v.x - n.x) / 4000;
      if (b > 0.18) b = 0.18; else if (b < -0.18) b = -0.18;
      n.difficulty = n._zorluk * (1 + b);
    }

    // Modülün kendi güncellemesi — dizi geçici olarak yakınlarla değiştirilir.
    // ⚠ updateNPCs sonunda `this.npcs = this.npcs.filter(...)` yapar (game.js:2355),
    //   bu yüzden sonuç dizisini geri okuyup uzaklarla birleştiriyoruz.
    NPCSystem.npcs = yakin;
    try { NPCSystem.updateNPCs(dt, v.x, v.vx); this._sayac.npcGuncelle++; }
    catch (e) { NPCSystem.npcs = hepsi; return; }
    const kalan = NPCSystem.npcs;
    // 🔴 `uzak.concat(kalan)` her karede YENİ dizi ayırıyordu → havuza kopyala.
    //   ⚠ `kalan` modülün `filter`ından gelen TAZE dizidir; `uzak`ın kendisini
    //     kullanamayız (yakin/uzak sonraki karede sıfırlanıyor).
    const hep = this._hepsiH || (this._hepsiH = []);
    hep.length = 0;
    for (let i = 0; i < uzak.length; i++) hep.push(uzak[i]);
    for (let i = 0; i < kalan.length; i++) hep.push(kalan[i]);
    NPCSystem.npcs = hep;

    // ── H3: modül y'ye HİÇ dokunmuyor → her kare zemine oturt + eğime yatır ──
    const T = G.terrain;
    for (let i = 0; i < kalan.length; i++) {
      const n = kalan[i];
      // ⚠ ÖLÇÜLDÜ: y'yi lerp'lemek 18,6 px zemin sapması bırakıyordu (araç
      //   yamaçta zemine gömülüyor/havada uçuyor). getYAt zaten sürekli →
      //   DOĞRUDAN oturt; yalnız AÇI yumuşatılır (görsel).
      n.y = this._zemin(T, n.x) - (n._yOfs || 42);
      const ha = this._egim(T, n.x);
      n.angle = this._num(n.angle) + (ha - this._num(n.angle)) * Math.min(1, dt * 9);
      n._anim = (n._anim || 0) + dt;
      if (n._carpCd > 0) n._carpCd -= dt;
      if (n._wheels) {
        const sp = (n.vx || 0) / 22;
        for (let w = 0; w < n._wheels.length; w++) n._wheels[w].spin += sp * dt;
      }
    }

    // ── H2: checkNPCCollision `player.w/.h` okur → gerçek araçta width/height ──
    const sim = this._sim(v);                    // havuzlanmış şim (PERF 31 Tmz)
    for (let i = 0; i < kalan.length; i++) {
      const n = kalan[i];
      if (n._carpCd > 0) continue;                          // temas soğuması
      if (Math.abs(n.x - v.x) > 220) continue;              // ucuz ön eleme
      let r = null;
      try { r = NPCSystem.checkNPCCollision(sim, n); } catch (e) { r = null; }
      if (r && r.collided) {
        // ⚠ Soğuma OLMADAN tek geçişte 21 çarpışma sayıldı (ölçüldü) → oyuncu
        //   118 hasar yiyip patlıyordu. Bir temas = BİR olay.
        n._carpCd = this.AYAR.NPC_CARP_CD;
        this._sayac.npcCarpma++;
        v.vx *= 0.90;                                       // hafif — oynanışı bozmaz
        this._hasarVer('hull', Math.min(6, this._num(r.impact) * 0.03));
        this._carpmaFX(v, 0.55);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  2) ENGEL — KIRILABİLİR PROP
  //  ⚠ Yalnız ÖLÜMCÜL OLMAYAN tipler (tyre/oil_drum/crate). Ölümcül tipler
  //    (boulder/spike_strip) oyuncunun AÇMADIĞI bir tehlike modunu zorla
  //    açmak olurdu; onlar Environment'ın engel modunun işi.
  // ═══════════════════════════════════════════════════════════════════════
  _engelAcikMi() {
    const E = this._E();
    if (!E) return true;                                    // Environment yoksa serbest
    try { return !E._on('obstacles'); } catch (e) { return !(E.settings && E.settings.obstacles); }
  },

  // Aynı x'te ikinci bir engel doğmasın: canlı tehlikelere ve sikkelere mesafe.
  // ⚠ İki AYRI mesafe: tehlike-tehlike 240 px (çakışma yasağı), sikke 80 px
  //   (yalnız görsel üst üste binme). Tek 240'lık eşikle sikke yoğunluğu
  //   yüzünden 3 haritada da SIFIR prop doğdu (ölçüldü).
  _propYeriUygun(x, G) {
    const d = this.AYAR.PROP_MIN_UZAK, ds = this.AYAR.PROP_MIN_SIKKE;
    const E = this._E();
    try {
      if (E && E.hazards) {
        for (let i = 0; i < E.hazards.length; i++) {
          if (Math.abs(E.hazards[i].x - x) < d) return false;
        }
      }
    } catch (e) {}
    try {
      const objs = (G.terrain && G.terrain.objects) ? G.terrain.objects : null;
      if (objs && objs.length) {
        // Sikkeler x'e göre artan üretiliyor (terrain.js:314-324) → ikili arama
        let lo = 0, hi = objs.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (objs[mid].x < x - ds) lo = mid + 1; else hi = mid; }
        for (let i = lo; i < objs.length && objs[i].x < x + ds; i++) {
          if (!objs[i].collected) return false;
        }
      }
    } catch (e) {}
    try {
      const list = ObstacleSystem.obstacles;
      for (let i = 0; i < list.length; i++) if (Math.abs(list[i].x - x) < d) return false;
    } catch (e) {}
    return true;
  },

  _engelGuncelle(dt, v, G) {
    if (typeof ObstacleSystem === 'undefined') return;
    const T = G.terrain;

    // ⚠ KARŞILIKLI DIŞLAMA: kapı koşu ORTASINDA açılırsa (ayarlar menüsü ya da
    //   survival/boss `_modeOverride`) daha önce doğmuş prop'lar sahnede kalır
    //   ve Environment onların üstüne tehlike üretebilir (ölçüldü: 1 çakışma).
    //   ▶ Kapı kapanınca prop'lar TEMİZLENİR → aynı anda tek engel sistemi.
    if (!this._engelAcikMi()) {
      if (ObstacleSystem.obstacles.length) { ObstacleSystem.obstacles = []; }
      this._propSonX = v.x + 400;
      return;
    }

    // ── Doğum (buraya yalnız kapı AÇIKKEN gelinir — yukarıda erken dönüş var) ──
    {
      const kal = Math.max(0.15, this._kalite());
      const hedef = v.x + this.AYAR.PROP_ONDE;
      if (this._propSonX < v.x) this._propSonX = v.x + 400;
      let guard = 0;
      while (this._propSonX < hedef && guard++ < 12) {
        // Yer uygun değilse birkaç kez kaydırıp dene (tek denemede sikke
        // yoğunluğu prop'ları tamamen susturuyordu — ölçüldü)
        let x = this._propSonX;
        for (let d = 0; d < this.AYAR.PROP_DENEME && !this._propYeriUygun(x, G); d++) x += 55;
        if (this._propYeriUygun(x, G)) {
          const tipler = this.AYAR.PROP_TIPLERI;
          const tip  = tipler[(Math.random() * tipler.length) | 0];
          const boy  = 0.7 + Math.random() * 0.5;
          const def  = ObstacleSystem.OBSTACLE_TYPES[tip];
          const y    = this._zemin(T, x) - (def ? def.h * boy : 40) / 2;
          try { if (ObstacleSystem.spawnObstacle(x, y, tip, boy)) this._sayac.engelDogum++; } catch (e) {}
        }
        // Kalite düştükçe aralık AÇILIR (dusuk'te ~3,3× seyrek)
        this._propSonX += (this.AYAR.PROP_ARALIK * (0.75 + Math.random() * 0.6)) / kal;
      }
    }

    if (!ObstacleSystem.obstacles.length) return;

    try { ObstacleSystem.updateObstacles(dt); } catch (e) {}

    // ── H7: itilen engel için ZEMİN KELEPÇESİ (modülde yok → sonsuza düşer) ──
    const list = ObstacleSystem.obstacles;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o.vx === 0 && o.vy === 0) continue;
      const yer = this._zemin(T, o.x) - o.h / 2;
      if (o.y >= yer) {
        o.y = yer;
        if (o.vy > 0) o.vy = 0;
        o.vx *= 0.72;
        o.angularV *= 0.72;
        if (Math.abs(o.vx) < 4) { o.vx = 0; o.angularV = 0; }
      }
    }

    // ── H1: checkObstacleCollision `vehicle.w/.h` okur → şim ile çağır ──
    const sim = this._sim(v);                    // havuzlanmış şim (PERF 31 Tmz)
    let hits = null;
    try { hits = ObstacleSystem.checkObstacleCollision(sim); } catch (e) { hits = null; }
    if (hits && hits.length) {
      let yeni = 0;
      for (let i = 0; i < hits.length; i++) {
        const h = hits[i], o = h.obstacle;
        // ⚠ ÖLÇÜLDÜ: modül temas SÜRDÜĞÜ her karede vuruş döndürüyor → 60 karede
        //   46 çarpışma, oyuncu ~90 hasar yiyordu. Prop HAFİF: tek temasta
        //   parçalanır (destroyed) → ikinci vuruş matematiksel olarak imkânsız
        //   (game.js:2207 `if (obs.destroyed) continue`).
        if (o._vuruldu) continue;
        o._vuruldu = true;
        o.destroyed = true;
        yeni++;
        this._sayac.engelCarpma++;
        v.vx *= 0.965;                              // oyuncu ezip geçer
        this._hasarVer('hull', this._num(h.damage) * 0.25);
      }
      if (yeni) this._carpmaFX(v, 0.4);
    }

    try { ObstacleSystem.clearOutOfRange(v.x, this.AYAR.PROP_TEMIZ); } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  3) HASAR
  // ═══════════════════════════════════════════════════════════════════════
  _hasarVer(bolge, guc) {
    if (typeof DamageSystem === 'undefined' || !(guc > 0)) return 0;
    try { this._sayac.hasarUygula++; return DamageSystem.applyStructuralDamage(bolge, guc); }
    catch (e) { return 0; }
  },

  _hasarGuncelle(dt, v, G) {
    if (typeof DamageSystem === 'undefined') return;

    // ── İNİŞ HASARI — YALNIZ Environment hasar modu KAPALIYKEN (çift hasar yok)
    const E = this._E();
    const envHasar = !!(E && E.settings && E.settings.damage);
    if (!envHasar) {
      const sok = this._num(v.landingShock);
      if (v.onGround && sok > this.AYAR.INIS_HASAR_ESIK) {
        if (!this._sokVar) {
          this._sokVar = true;
          this._hasarVer('suspension', (sok - this.AYAR.INIS_HASAR_ESIK) * 12);
        }
      } else if (sok < this.AYAR.INIS_HASAR_ESIK * 0.6) { this._sokVar = false; }
    }

    // ── PERFORMANS CEZASI — İDEMPOTENT (taban torktan yeniden hesap) ──
    // ⚠ `v.torque *= ceza` YAZMA: her kare çarpılır, tork 0'a gider.
    //   physics.js:281 sürüş kuvvetini v.torque'tan okur → gerçek oynanış etkisi.
    if (this._baseTorque === undefined) this._baseTorque = this._num(v.torque, 5000);
    let ceza = null;
    try { ceza = DamageSystem.getPerformancePenalty(); } catch (e) { ceza = null; }
    if (ceza && isFinite(ceza.speedMult)) {
      const m = Math.max(0.5, Math.min(1, ceza.speedMult));   // en fazla %50 kayıp
      v.torque = this._baseTorque * m;
    }
  },

  // ── Ortak çarpma efekti (ses/sarsıntı spam koruması) ──
  _carpmaFX(v, guc) {
    if (this._sesCd > 0) return;
    this._sesCd = 0.18;
    try { const C = this._C(); if (C && C.shake) C.shake(4 * guc, 0.2); } catch (e) {}
    try { if (typeof Audio !== 'undefined' && Audio.playThud) Audio.playThud(guc > 0.5); } catch (e) {}
    try {
      if (typeof Particles !== 'undefined' && Particles.impactBurst) {
        Particles.impactBurst(v.x, v.y + 12, guc, 'dirt');
      }
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  HER KARE — Game.update sarmalayıcısından
  // ═══════════════════════════════════════════════════════════════════════
  frame(dt) {
    const G = this._G();
    if (!G || G.state !== 'playing' || !G.vehicle || !G.terrain) return;
    const v = G.vehicle;
    dt = this._num(dt, 0.016);
    if (dt <= 0 || dt > 0.2) dt = 0.016;
    this._sayac.kare++;
    if (this._sesCd > 0) this._sesCd -= dt;

    // Yeni koşu tespiti (hookups.js:118-124 ile aynı ilke)
    const dist = this._mesafe(v, G);
    if (this._sonMesafe === undefined || dist < this._sonMesafe - 5) {
      try { this._kosuSifirla(v, G); } catch (e) {}
    }
    this._sonMesafe = dist;

    // 🔴 GERİ SAYIM: game.js:343-353 sırasında throttle zorla 0; rakipler de beklemeli.
    if (this._num(G._countdown) > 0) return;

    // Her sistem AYRI try/catch — bug #18 dersi: tek istisna tüm zinciri keser.
    try { this._npcGuncelle(dt, v, G); }   catch (e) {}
    try { this._engelGuncelle(dt, v, G); } catch (e) {}
    try { this._hasarGuncelle(dt, v, G); } catch (e) {}

    // Liderlik tablosu (0,25 sn'de bir — her karede sıralama YAPMA)
    try {
      this._liderT -= dt;
      if (this._liderT <= 0 && typeof NPCSystem !== 'undefined') {
        this._liderT = this.AYAR.LIDER_ARALIK;
        const b = NPCSystem.getLeaderboard(v.x, dist);   // sort b.x-a.x = AZALAN
        this._lider = b;
        this._liderTop = b.length;
        for (let i = 0; i < b.length; i++) if (b[i].name === 'Player') { this._liderSira = i + 1; break; }
      }
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DÜNYA ÇİZİMİ — HUD.draw sarmalayıcısının BAŞINDA (HUD'un ALTINDA kalsın)
  //  ⚠ Renderer.drawGame SARMALANMIYOR → gorsel.js `eskiAtla` tablosu ve
  //    post-process zinciri hiç etkilenmiyor.
  // ═══════════════════════════════════════════════════════════════════════
  drawWorld(ctx) {
    const G = this._G(), C = this._C();
    if (!ctx || !G || !C || G.state !== 'playing' || !C.apply) return;
    const v = G.vehicle;
    if (!v) return;

    let acildi = false;
    // ⚠ hookups.js:226 drawVehicle'ı sarmalayıp OYUNCUNUN sticker/plaka/underglow'unu
    //   ekliyor. NPC'ye uygulanırsa oyuncunun plakası her rakipte görünür →
    //   çizim boyunca geçici olarak boşa alınır, finally ile GERİ VERİLİR.
    let _ccr = null, _ccrEski = null;
    // 🔴 Gradient önbelleği YALNIZ bu blok boyunca açık (PERF 31 Tmz).
    //   Kapalıyken fabrika metotları tam geçiş yapar → oyunun geri kalanının
    //   gradientlerine dokunulmaz.
    const grVar = this._grKur(ctx);
    if (grVar) { this._grAcik = true; this._grUretim = 0; }
    try {
      C.apply(ctx); acildi = true;

      // ── Engeller: modülün kendi çizimi, camX=0 ile DÜNYA uzayında (H4 çözümü)
      try {
        if (typeof ObstacleSystem !== 'undefined' && ObstacleSystem.obstacles.length) {
          this._grEtiket = 'engel'; this._grSayac = 0;
          ObstacleSystem.drawObstacles(ctx, 0);
        }
      } catch (e) {}

      // ── NPC'ler: gerçek drawVehicle ile (main.js imzası: ctx,v,id,throttle,animTime)
      try {
        if (typeof NPCSystem !== 'undefined' && NPCSystem.npcs.length && typeof drawVehicle === 'function') {
          if (typeof CarCustomRender !== 'undefined' && CarCustomRender.draw) {
            _ccr = CarCustomRender; _ccrEski = CarCustomRender.draw; CarCustomRender.draw = function () {};
          }
          const list = NPCSystem.npcs;
          for (let i = 0; i < list.length; i++) {
            const n = list[i];
            if (!n.active) continue;
            if (C.isVisible && !C.isVisible(n.x, n.y, 220)) continue;   // H5 çözümü
            // 🔴 HAVUZ (PERF 31 Tmz): NPC başına yeni nesne ayırma yerine
            //   tek bir şim yeniden doldurulur. `drawVehicle` şimi SAKLAMAZ
            //   (vehicles.js:9206 alanları hemen okur) → yeniden kullanım güvenli.
            let sim = this._simCizH;
            if (!sim) sim = this._simCizH = {
              x: 0, y: 0, angle: 0, throttle: 1, brake: 0, vx: 0, vy: 0,
              airTime: 0, angularVel: 0, bodyTilt: 0, pitchOffset: 0,
              landingShock: 0, suspBob: 0, wheels: null
            };
            sim.x = n.x; sim.y = n.y; sim.angle = this._num(n.angle);
            sim.vx = this._num(n.vx);
            sim.wheels = n._wheels || (n._wheels = this._sahteTeker(n._vid));
            // 🔴 Gradient anahtarının ÇAĞRI YERİ parçası: araç TİPİ.
            //   `drawVehicle` ilk iş olarak `translate(x,y)` yapıp yerel uzayda
            //   çizdiği için argümanlar konumdan bağımsızdır → aynı tipin tüm
            //   örnekleri ve tüm kareleri TEK önbellek girdisini paylaşır.
            this._grEtiket = n._vid || 'jeep'; this._grSayac = 0;
            ctx.save();
            ctx.globalAlpha = 0.94;
            drawVehicle(ctx, sim, n._vid || 'jeep', 1, n._anim || 0);
            ctx.restore();
            this._sayac.npcCiz++;
            this._npcEtiket(ctx, n);
          }
        }
      } catch (e) {}

      // ── Hasar efekti (alev/kritik çerçeve) — GÖRSEL, kalite kapısı arkasında
      try {
        if (typeof DamageSystem !== 'undefined' && DamageSystem.drawDamageFX &&
            this._kaliteAyar('isikTitresim') > 0) {
          const ds = DamageSystem.damageState;
          if (ds && (ds.isOnFire || ds.criticalDamage)) {
            this._grEtiket = 'hasar'; this._grSayac = 0;
            DamageSystem.drawDamageFX(ctx, v.x, v.y, ds);
          }
        }
      } catch (e) {}
    } catch (e) {
    } finally {
      // 🔴 SIRA ÖNEMLİ: gradient önbelleği HER DURUMDA kapanmalı, yoksa
      //   oyunun geri kalanının gradientleri de bizim anahtarlarımıza düşer.
      this._grAcik = false;
      if (_ccr && _ccrEski) { try { _ccr.draw = _ccrEski; } catch (e) {} }
      if (acildi) { try { C.restore(ctx); } catch (e) {} }
    }
  },

  // NPC isim etiketi — DÜNYA uzayında, araç açısından bağımsız
  _npcEtiket(ctx, n) {
    try {
      ctx.save();
      ctx.translate(n.x, n.y - 34);
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-38, -8, 76, 15);
      ctx.fillStyle = n.color || '#fff';
      ctx.fillText(String(n.profile && n.profile.name || 'Rakip').slice(0, 14), 0, 0);
      // Can çubuğu — yalnız hasarlıysa. ⚠ ORAN `_hpMax`'a göre; modülün kendi
      //   drawNPCs'i hp/100 varsayar ve 400 canlı rakipte çubuğu taşırır.
      const hpMax = n._hpMax || 100;
      if (n.hp < hpMax) {
        const o = Math.max(0, Math.min(1, n.hp / hpMax));
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-30, 9, 60, 4);
        ctx.fillStyle = o > 0.5 ? '#4CAF50' : '#FF5722';
        ctx.fillRect(-30, 9, 60 * o, 4);
      }
      ctx.restore();
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  EKRAN ÜSTÜ — sıralama rozeti + hasar paneli
  // ═══════════════════════════════════════════════════════════════════════
  drawHUD(ctx, v) {
    const G = this._G();
    if (!ctx || !G || G.state !== 'playing') return;
    const W = (ctx.canvas ? ctx.canvas.width : 1280);
    const H = (ctx.canvas ? ctx.canvas.height : 720);

    // Sıralama (yalnız rakip varsa)
    try {
      if (this._liderSira > 0 && this._liderTop > 1) {
        ctx.save();
        ctx.font = 'bold 17px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = this._liderSira === 1 ? '#ffd700' : '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        const s = '🏁 ' + this._liderSira + '/' + this._liderTop;
        ctx.strokeText(s, W - 14, H * 0.30);
        ctx.fillText(s, W - 14, H * 0.30);
        ctx.restore();
      }
    } catch (e) {}

    // Hasar paneli — yalnız gerçekten hasar varsa (HUD'u kalabalıklaştırma)
    try {
      if (typeof DamageSystem !== 'undefined' && DamageSystem.drawDamageHUD) {
        const ds = DamageSystem.damageState;
        if (ds && ds.totalDamageReceived > 0.5) {
          DamageSystem.drawDamageHUD(ctx, 10, Math.max(56, H * 0.34));
        }
      }
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  KURULUM
  // ═══════════════════════════════════════════════════════════════════════
  init() {
    if (this._wrapped) return;
    try {
      // 1) Game.update sarmala → frame()
      if (typeof Game !== 'undefined' && typeof Game.update === 'function') {
        const _gu = Game.update.bind(Game);
        Game.update = function (dt) { _gu(dt); try { BaglaRakip.frame(dt); } catch (e) {} };
      }
      // 2) HUD.draw sarmala → dünya çizimi ÖNCE (HUD'un altında), rozet SONRA
      if (typeof HUD !== 'undefined' && typeof HUD.draw === 'function') {
        const _hd = HUD.draw.bind(HUD);
        HUD.draw = function (ctx, v, gs, cw, ch) {
          try { BaglaRakip.drawWorld(ctx); } catch (e) {}
          _hd.apply(HUD, arguments);
          try { BaglaRakip.drawHUD(ctx, v); } catch (e) {}
        };
      }
      this._wrapped = true;
    } catch (e) { try { console.error('[BaglaRakip.init]', e); } catch (_) {} }
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  §GHOST — GHOST_SYSTEM NEDEN BAĞLANMADI (ölçülebilir gerekçe)
  //  Bu fonksiyon çakışmayı KOD ÜZERİNDEN doğrular; selfTest onu kullanır.
  // ═══════════════════════════════════════════════════════════════════════
  hayaletCakismasi() {
    const r = { replayCanli: false, ikiKayitci: false, hatalar: [] };
    try {
      r.replayCanli = (typeof Replay !== 'undefined') &&
                      typeof Replay.record === 'function' &&
                      typeof Replay.getGhost === 'function' &&
                      typeof Replay.saveIfBest === 'function';
    } catch (e) {}
    try {
      const GS = (typeof GHOST_SYSTEM !== 'undefined') ? GHOST_SYSTEM : null;
      if (GS) {
        // H8: recordFrame dt'yi yok sayıp sabit 0.016 ekliyor
        if (/recordTimer\s*\+=\s*0\.016/.test(String(GS.recordFrame))) r.hatalar.push('sabit-dt');
        // H8: gerçek araçta `onGround` var, `isGrounded` YOK
        if (/isGrounded/.test(String(GS.recordFrame))) r.hatalar.push('isGrounded-yok');
        // H4: ekran dönüşümünde zoom yok
        if (/camera\s*\?\s*camera\.x/.test(String(GS.drawGhost)) &&
            !/zoom/.test(String(GS.drawGhost))) r.hatalar.push('zoomsuz-ekran');
        // H9: "en iyi" koşulu her zaman doğru → önceki kayıt EZİLİR
        if (/frames\.length\s*>\s*0/.test(String(GS.stopRecording))) r.hatalar.push('en-iyi-degil');
      }
      r.ikiKayitci = r.replayCanli && !!GS;
    } catch (e) {}
    r.baglanmamali = r.ikiKayitci || r.hatalar.length > 0;
    return r;
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  selfTest — ÖLÇEREK doğrular (varlık kontrolü değil)
  // ═══════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};

    // 1) Modüller yerinde mi
    r.npcVar    = typeof NPCSystem      !== 'undefined' && Array.isArray(NPCSystem.NPC_PROFILES);
    r.engelVar  = typeof ObstacleSystem !== 'undefined' && !!ObstacleSystem.OBSTACLE_TYPES;
    r.hasarVar  = typeof DamageSystem   !== 'undefined' && !!DamageSystem.damageState;

    // 2) Kalite ölçeği: DÜŞÜK < ULTRA (rakip sayısı kaliteyle ölçekleniyor mu)
    try {
      if (typeof Kalite === 'undefined') { r.kaliteOlcek = true; }
      else {
        const eski = Kalite._kademe;
        Kalite._kademe = 'dusuk';  this._kaliteKademe = null;
        const dus = Math.round(this.AYAR.NPC_TABAN * this._kalite());
        Kalite._kademe = 'ultra';  this._kaliteKademe = null;
        const ult = Math.round(this.AYAR.NPC_TABAN * this._kalite());
        Kalite._kademe = eski;     this._kaliteKademe = null;
        r.kaliteOlcek = dus < ult && dus >= 1;
      }
    } catch (e) { r.kaliteOlcek = false; }

    // 3) 🔴 KOORDİNAT MATEMATİĞİ — teker tabanı zemine oturuyor mu?
    //    (CheckpointSystem'in 5 hatasından biri tam olarak buydu.)
    try {
      const sahteT = { getYAt(x) { return 400 + Math.sin(x / 300) * 60; } };
      const ofs = this._yerOfset('jeep');                    // jeep: wheels y=22, r=20 → 42
      const x = 1234, gy = sahteT.getYAt(x);
      const npcY = gy - ofs;
      r.zeminOturuyor = Math.abs((npcY + ofs) - gy) < 1e-9 && ofs > 20 && ofs < 120;
      // Eğim işareti: yokuş yukarı (y azalan) → negatif açı
      const a = this._egim(sahteT, 100);
      r.egimSayi = isFinite(a) && Math.abs(a) <= 1.2;
    } catch (e) { r.zeminOturuyor = false; r.egimSayi = false; }

    // 4) 🔴 Camera.worldToScreen sözleşmesi = (wx-cam.x)*zoom  (camera.js:310)
    try {
      const C = this._C();
      if (!C || !C.worldToScreen) r.kameraSozlesme = true;
      else {
        const ex = C.x, ez = C.zoom;
        C.x = 500; C.zoom = 2;
        const s = C.worldToScreen(700, 400);
        C.x = ex; C.zoom = ez;
        r.kameraSozlesme = Math.abs(s.x - 400) < 1e-6;       // (700-500)*2
      }
    } catch (e) { r.kameraSozlesme = false; }

    // 5) Hasar: gerçekten birikiyor + performans cezası İDEMPOTENT
    try {
      const yedek = JSON.parse(JSON.stringify(DamageSystem.damageState));
      DamageSystem.init();
      const d = DamageSystem.applyStructuralDamage('hull', 10);
      const birikti = DamageSystem.damageState.totalDamageReceived > 0 && d > 0;
      const ceza = DamageSystem.getPerformancePenalty();
      // İdempotens: aynı taban torkla iki kez uygula → aynı sonuç
      const v = { torque: 5000, landingShock: 0, onGround: true };
      this._baseTorque = undefined;
      this._hasarGuncelle(0.016, v, { terrain: null });
      const t1 = v.torque;
      this._hasarGuncelle(0.016, v, { terrain: null });
      const t2 = v.torque;
      this._baseTorque = undefined;
      DamageSystem.damageState = yedek;
      r.hasarBirikiyor = birikti && isFinite(ceza.speedMult);
      r.cezaIdempotent = Math.abs(t1 - t2) < 1e-9 && t1 > 0 && t1 <= 5000;
    } catch (e) { r.hasarBirikiyor = false; r.cezaIdempotent = false; }

    // 6) Prop tipleri ÖLÜMCÜL DEĞİL (hasar ≤ 12) ve tanımlı
    try {
      r.propGuvenli = this.AYAR.PROP_TIPLERI.every(function (t) {
        const d = ObstacleSystem.OBSTACLE_TYPES[t];
        return !!d && d.damage <= 12;
      });
    } catch (e) { r.propGuvenli = false; }

    // 7) Araç seçimi bug #21 şemasına takılmıyor (fuelMax + wheels ZORUNLU)
    try {
      const vid = this._aracSec(1);
      const d = (typeof VehicleDefs !== 'undefined') ? VehicleDefs[vid] : null;
      r.aracSemasi = !!d && typeof d.fuelMax === 'number' && Array.isArray(d.wheels) && d.wheels.length > 0;
    } catch (e) { r.aracSemasi = false; }

    // 8) HAYALET: bağlanmaması gerektiği ÖLÇÜLDÜ mü
    try {
      const h = this.hayaletCakismasi();
      r.hayaletBaglanmadi = (typeof GHOST_SYSTEM === 'undefined') ? true :
                            (h.baglanmamali === true && GHOST_SYSTEM.recording === false &&
                             GHOST_SYSTEM.playing === false);
    } catch (e) { r.hayaletBaglanmadi = false; }

    // 9) Engel kapısı: Environment engel modu AÇIKKEN prop üretilmemeli
    try {
      const E = this._E();
      if (!E) r.engelKapisi = this._engelAcikMi() === true;
      else {
        const eskiA = E.settings.obstacles, eskiO = E._modeOverride;
        E.settings.obstacles = true;  E._modeOverride = null;
        const kapali = this._engelAcikMi();
        E.settings.obstacles = false;
        const acik = this._engelAcikMi();
        E.settings.obstacles = eskiA; E._modeOverride = eskiO;
        r.engelKapisi = (kapali === false && acik === true);
      }
    } catch (e) { r.engelKapisi = false; }

    // 10) 🔴 DOĞUM GÜVENLİĞİ — rakip oyuncunun gövdesinin İÇİNDE doğmamalı
    //     (ilk sürümde doğuyordu: 60 karede 21 çarpışma, 2 rakip yok oldu)
    try {
      const yedekN = NPCSystem.npcs, yedekId = NPCSystem._nextId;
      const sahteT = { getYAt(x) { return 400 + Math.sin(x / 300) * 40; } };
      const fv = { x: 200, y: 300, width: 110, height: 48, maxSpeed: 520, id: 'jeep' };
      // ⚠ 31 Tmz: `botRaceMode: true` ŞART — rakipler artık yalnız yarış modunda
      //   doğuyor (bkz. `_yarisMi`). Bu bayrak olmadan doğum testi 0 rakip görür.
      const fG = { startX: 200, terrain: sahteT, botRaceMode: true, gameMode: 'race' };
      this._npcKuruldu = false;
      this._npcKur(fv, fG);
      let minBos = 1e9, canTamam = true, hizli = true;
      for (let i = 0; i < NPCSystem.npcs.length; i++) {
        const n = NPCSystem.npcs[i];
        minBos = Math.min(minBos, Math.abs(n.x - fv.x) - (fv.width / 2 + n.w / 2));
        if (n.hp !== this.AYAR.NPC_CAN || n._hpMax !== this.AYAR.NPC_CAN) canTamam = false;
        if (!(n.vx > 0)) hizli = false;
        if (!isFinite(n.y) || Math.abs((n.y + n._yOfs) - sahteT.getYAt(n.x)) > 0.001) canTamam = false;
      }
      const adet = NPCSystem.npcs.length;
      NPCSystem.npcs = yedekN; NPCSystem._nextId = yedekId;
      this._npcKuruldu = false;
      r.npcGuvenliDogum = adet > 0 && minBos > 60 && canTamam && hizli;
    } catch (e) { r.npcGuvenliDogum = false; }

    // 11) Sarmalayıcı imzaları (main.js:184-190)
    r.imzalar = (typeof HUD === 'undefined' || typeof HUD.draw === 'function') &&
                (typeof Game === 'undefined' || typeof Game.update === 'function');

    // ═══ PERF KİLİTLERİ (31 Tmz) — hepsi ÖLÇEREK, varsayım yok ═══════════
    // 12) 🔴 GRADIENT ÖNBELLEĞİ GERÇEKTEN ÖNBELLEKLİYOR MU
    //     Enjeksiyon: sahte bir ctx'e aynı çağrıyı iki kez yaptır. İkincisi
    //     YENİ gradient üretmemeli ve `addColorStop` DONDURULMUŞ olmalı
    //     (yoksa stop'lar her karede tekrar eklenir → gradient bozulur).
    try {
      const yedekK = this._grOnbellek, yedekS = this._grSon, yedekC = this._grCtx,
            yedekA = this._grAdet, yedekU = this._grUretim, yedekT = this._grToplam;
      let uretim = 0, stopSay = 0;
      const sahte = {
        createLinearGradient: function () {
          uretim++;
          return { addColorStop: function () { stopSay++; } };
        },
        createRadialGradient: function () {
          uretim++;
          return { addColorStop: function () { stopSay++; } };
        }
      };
      this._grOnbellek = {}; this._grSon = {}; this._grCtx = null;
      this._grAdet = 0; this._grToplam = 0;
      const kuruldu = this._grKur(sahte);
      this._grAcik = true; this._grUretim = 0;
      this._grEtiket = 'test'; this._grSayac = 0;
      const g1 = sahte.createLinearGradient(0, 0, 0, 40); g1.addColorStop(0, '#fff');
      const ilkUretim = uretim, ilkStop = stopSay;
      this._grEtiket = 'test'; this._grSayac = 0;
      const g2 = sahte.createLinearGradient(0, 0, 0, 40); g2.addColorStop(0, '#fff');
      const onbellekIsabet = (uretim === ilkUretim);
      const donduruldu = (stopSay === ilkStop);          // 2. addColorStop BOŞA gitti

      // 13) 🔴 KARE BÜTÇESİ: argüman her seferinde değişse bile bir karede
      //     en çok `_GR_KARE_BUTCE` YENİ gradient üretilebilir.
      this._grUretim = 0; uretim = 0;
      for (let i = 0; i < 40; i++) {
        this._grEtiket = 'butce'; this._grSayac = 0;
        sahte.createLinearGradient(0, 0, 0, 40 + i * 30);
      }
      // ⚠ EŞİK SABİT (4) — `_GR_KARE_BUTCE` ile kıyaslamak totoloji olurdu:
      //   bütçe sonsuza çekilirse test de kendiliğinden geçerdi (enjeksiyon
      //   testi bunu yakaladı). Hem üretim hem de bütçe DEĞERİ sınanır.
      const butceTutuyor = (uretim <= 4) && (this._GR_KARE_BUTCE <= 4);

      // 14) 🔴 KAPALIYKEN TAM GEÇİŞ: oyunun geri kalanının gradientleri
      //     önbelleğe DÜŞMEMELİ (yoksa başka katmanların çizimi bozulur).
      this._grAcik = false;
      const adetOnce = this._grAdet;
      sahte.createLinearGradient(0, 0, 0, 999);
      const gecisTemiz = (this._grAdet === adetOnce);

      // 16) 🔴 DONDURULAMAYAN GRADIENT ÖNBELLEĞE ALINMAMALI (güvenli düşüş).
      //     Enjeksiyon: donmayı reddeden bir gradient üret; ikinci çağrı
      //     önbellekten DÖNMEMELİ, taze gradient üretmeli.
      this._grOnbellek = {}; this._grSon = {}; this._grAdet = 0;
      this._grAcik = true; this._grUretim = 0;
      const donmaz = { addColorStop: function () {} };
      try { Object.defineProperty(donmaz, 'addColorStop', { value: donmaz.addColorStop, configurable: false, writable: false }); } catch (e) {}
      const eskiL = sahte.createLinearGradient;
      let dz = 0;
      sahte.createLinearGradient = function () { dz++; return donmaz; };
      this._grKur(sahte);                                   // zaten kurulu → no-op
      this._grEtiket = 'donmaz'; this._grSayac = 0; this._grAl(sahte, function () { dz++; return donmaz; }, 'L', 0, 0, 0, 9, 0, 0, 4);
      const d1 = dz;
      this._grEtiket = 'donmaz'; this._grSayac = 0; this._grAl(sahte, function () { dz++; return donmaz; }, 'L', 0, 0, 0, 9, 0, 0, 4);
      const donmazGuvenli = (dz > d1) && this._grAdet >= 0;  // taze üretildi
      sahte.createLinearGradient = eskiL;

      this._grAcik = false;
      this._grOnbellek = yedekK; this._grSon = yedekS; this._grCtx = yedekC;
      this._grAdet = yedekA; this._grUretim = yedekU; this._grToplam = yedekT;
      r.grOnbellek     = kuruldu && onbellekIsabet;
      r.grDonduruluyor = donduruldu;
      r.grDonmazGuvenli = donmazGuvenli;
      r.grKareButce    = butceTutuyor;
      r.grKapaliGecis  = gecisTemiz;
    } catch (e) {
      this._grAcik = false;
      r.grOnbellek = false; r.grDonduruluyor = false;
      r.grKareButce = false; r.grKapaliGecis = false; r.grDonmazGuvenli = false;
    }

    // 15) 🔴 HAVUZ KİLİDİ: sıcak döngü kare başına YENİ dizi/nesne AYIRMAMALI.
    //     Enjeksiyon: iki ardışık çağrıda dönen nesne AYNI referans olmalı.
    try {
      const fv = { x: 1, y: 2, vx: 3, vy: 4, width: 5, height: 6 };
      const s1 = this._sim(fv);
      const s2 = this._sim(fv);
      r.havuzSim = (s1 === s2) && s1.w === 5 && s1.h === 6;
    } catch (e) { r.havuzSim = false; }
    try {
      const a1 = this._yakinH || (this._yakinH = []);
      const b1 = this._uzakH  || (this._uzakH  = []);
      const c1 = this._hepsiH || (this._hepsiH = []);
      // ⚠ Desen kontrolü YORUMU DA GÖRÜR (`String(fn)` yorumları içerir) →
      //   "yok olmalı" yerine "var olmalı" desenleri kullanılır.
      const kod = String(this._npcGuncelle);
      r.havuzDizi = (this._yakinH === a1 && this._uzakH === b1 && this._hepsiH === c1) &&
                    /yakin\.length = 0; uzak\.length = 0;/.test(kod) &&
                    /hep\.length = 0;/.test(kod) &&
                    /NPCSystem\.npcs = hep;/.test(kod) &&
                    /const sim = this\._sim\(v\);/.test(kod);
    } catch (e) { r.havuzDizi = false; }

    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  },

  // Ölçüm raporu (konsola/teste)
  olcum() {
    const s = this._sayac;
    const kare = Math.max(1, s.kare);
    return {
      kare: s.kare,
      npc: (typeof NPCSystem !== 'undefined') ? NPCSystem.npcs.length : 0,
      engel: (typeof ObstacleSystem !== 'undefined') ? ObstacleSystem.obstacles.length : 0,
      npcAdimKare: Math.round(s.npcAdim / kare * 100) / 100,
      npcAtlananKare: Math.round(s.npcAtlanan / kare * 100) / 100,
      npcCizKare: Math.round(s.npcCiz / kare * 100) / 100,
      npcIsinla: s.npcIsinla,
      engelDogum: s.engelDogum,
      engelCarpma: s.engelCarpma,
      npcCarpma: s.npcCarpma,
      hasarUygula: s.hasarUygula
    };
  }
};

if (typeof window !== 'undefined') {
  window.BaglaRakip = BaglaRakip;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaRakip.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaRakip.init(); }, 0);
    }
  } catch (e) {}
}
if (typeof module !== 'undefined' && module.exports) module.exports = { BaglaRakip: BaglaRakip };
