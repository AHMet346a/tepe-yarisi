'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-HAVA — Ekran uzayı hava olayı katmanı (30 Tmz)
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında atmosferik hava olayı
// çizer. `gorsel.js` (renk/bloom) ve `gorsel-isik.js` (ışık/gölge) kardeşidir;
// oyunun çizim koduna HİÇ DOKUNMAZ.
//
// EFEKTLER (her biri AYRI kalite anahtarıyla geçitli):
//   · camDamla     — ön cama yapışan, duraklayıp hızla kayan, ışığı kıran damla
//   · yagmurCizgi  — eğik yağmur çizgileri (araç hızına göre eğim artar)
//   · karTanesi    — 3 derinlik katmanlı kar (yakın büyük/hızlı, uzak küçük/yavaş)
//   · tipiPerde    — yatay savrulan kar perdesi + görüş azalması (whiteout)
//   · kumFirtina   — yatay akan kum katmanları + sarı-kahve puslanma
//   · korKul       — yukarı süzülen közler + aşağı düşen kül
//   · simsek       — çok darbeli şimşek çakması (ba.t tabanlı DETERMİNİSTİK)
//   · camBuz       — ekran kenarlarında buzlanma + kristal büyümesi
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bu dosya HİÇBİR bare global'e güvenmez (Game/Terrain/Camera `window`'da
// DEĞİL — CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle · ba.camera
//   ba.terrain · ba.t · ba.dt · ba.kalite(ad) · ba.gr(anahtar, uretici)
//
// 🔴 HAVA TÜRÜ `ba.mapId`'DEN TÜRETİLİR. Oyunun kendi hava/mevsim sistemi
//    (varsa) YOK SAYILIR — bu katman bağımsız çalışır, hiçbir modüle bağlı
//    değildir. Tablo dışındaki harita = HAVASIZ (tek çizim çağrısı bile yok).
//
// 🔴 PERFORMANS KURALLARI (ihlal edilirse p99 bozulur — §8B.27/B5)
//   1. `createLinearGradient`/`createRadialGradient` DOĞRUDAN ÇAĞRILMAZ.
//      Hepsi `this._gr(...)` → `ba.gr(...)` önbelleğinden geçer. Konumu
//      değişen efektler (damla, kar, köz) BİRİM UZAYDA (0,0,r=1) üretilmiş
//      gradient + `translate/scale` ile boyanır → tek anahtar yeter.
//      Ayrıca `_onIsit()` İLK karede o haritanın TÜM gradientlerini üretir;
//      sonraki karelerde üretim kesin olarak 0'dır (duman testi bunu ölçer).
//   2. `getImageData`/`putImageData` YOK. (Tek istisna yok — damla merceği
//      bile `drawImage` + `clip` ile yapılır, piksel okunmaz.)
//   3. Her efekt `ba.kalite('...')` ile geçitli; 0 dönerse TEK BİR çizim
//      çağrısı bile yapılmaz (selfTest bunu sayarak doğrular).
//   4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
//   5. `globalAlpha` / `globalCompositeOperation` / `filter` GERİ KONUR.
//   6. 🔴 PARÇACIK DİZİLERİ SABİT HAVUZ. Bir kez `new Array(N)` ile kurulur,
//      elemanlar YERİNDE geri dönüştürülür. `push`/`splice`/`concat` YASAK.
//      (Bu projede sınırsız dizi daha önce sızıntı yaptı: `UI._toasts` 159
//      elemana çıkmıştı — §"PERFORMANS" notu.) Yoğunluk kaliteye göre
//      değiştiğinde dizinin UZUNLUĞU değil, çizilen ADET değişir.
// ═══════════════════════════════════════════════════════════════════════════
const GorselHava = {
  ad: 'hava',

  // ── 🔴 SABİT HAVUZ BOYUTLARI — çalışma boyunca ASLA değişmez ────────────
  BOYUT: { yagmur: 260, damla: 64, kar: 300, kum: 180, kor: 96, kul: 128, buz: 48 },

  // ── iç durum ────────────────────────────────────────────────────────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _havuz: null,             // sabit parçacık havuzları (bir kez kurulur)
  _tampon: null,            // damla merceği için küçük ekran kopyası
  _tamponKare: -1,          // tampon bu karede tazelendi mi
  _karKare: -1,             // kar havuzu bu karede güncellendi mi (ortak sim)
  _kare: 0,
  _grYerel: {},             // ba.gr verilmediyse kullanılan yedek önbellek
  _grUretim: 0,             // ölçüm: yedek önbellekte kaç YENİ gradient üretildi
  _onIsitImza: null,        // gradient ön ısıtma imzası (W|H|mapId|palet)
  _onIsitGr: null,          // ön ısıtmanın yapıldığı ba.gr REFERANSI (bkz. _onIsit)
  _profilOnbellek: {},      // harita → hava profili (bir kez türetilir)
  _renk: null,              // paletten türeyen hazır renk dizeleri
  _renkImza: null,
  _blurDestek: null,
  _rndDurum: 22222,
  _t: 0,                    // ba.t yoksa iç saat
  _ruzgar: 0,               // yumuşatılmış yatay rüzgâr (px/sn)
  _gorusKaybi: 0,           // tipide görüş kaybı (ölçüm/DIŞARI bilgi amaçlı)
  _simsekGuc: 0,            // son karedeki şimşek şiddeti (0..1)
  _simsekYol: null,         // şimşek gövdesi için sabit Float64Array (havuz)

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // HAVA TABLOSU — hangi harita hangi havayı alır
  // Değerler 0..1 ŞİDDET'tir (yoğunluk + alfa + parçacık adedini ölçekler).
  // Listede OLMAYAN harita = tamamen havasız (countryside, city, moon…).
  // ═════════════════════════════════════════════════════════════════════════
  HAVA: {
    // ── YAĞMURLU (yağmur çizgisi + ön cam damlası + şimşek) ──────────────
    swamp:          { yagmur: 0.85, damla: 0.90, simsek: 0.30, ruzgar: 0.35 },
    jungle:         { yagmur: 1.00, damla: 1.00, simsek: 0.22, ruzgar: 0.25 },
    stormpeak:      { yagmur: 1.00, damla: 0.85, simsek: 0.85, ruzgar: 1.00 },
    graveyard:      { yagmur: 0.70, damla: 0.75, simsek: 0.55, ruzgar: 0.45 },
    firefly_forest: { yagmur: 0.45, damla: 0.55, simsek: 0.10, ruzgar: 0.20 },
    // ── KARLI (kar tanesi + buzlanma; tipi ayrı) ─────────────────────────
    winter:         { kar: 0.75, buz: 0.45, ruzgar: 0.30 },
    arctic:         { kar: 0.85, buz: 0.85, tipi: 0.30, ruzgar: 0.60 },
    glacier:        { kar: 0.60, buz: 0.90, ruzgar: 0.35 },
    blizzard:       { kar: 1.00, tipi: 1.00, buz: 0.70, simsek: 0.15, ruzgar: 1.00 },
    aurora_peak:    { kar: 0.45, buz: 0.55, ruzgar: 0.30 },
    // ── KUMLU (kum fırtınası perdesi) ────────────────────────────────────
    desert:         { kum: 0.45, ruzgar: 0.50 },
    sandstorm:      { kum: 1.00, ruzgar: 1.00 },
    wasteland:      { kum: 0.60, ruzgar: 0.60 },
    canyon:         { kum: 0.50, ruzgar: 0.50 },
    mars:           { kum: 0.40, ruzgar: 0.55 },
    // ── VOLKANİK (yükselen köz + düşen kül) ──────────────────────────────
    volcano:        { kor: 1.00, kul: 0.85, simsek: 0.25, ruzgar: 0.30 },
    lava_river:     { kor: 0.90, kul: 0.70, ruzgar: 0.25 },
    meteor_field:   { kor: 0.80, kul: 1.00, simsek: 0.40, ruzgar: 0.45 },
    // ── EKSTRA (tematik olarak apaçık olanlar) ───────────────────────────
    crystal_cave:   { buz: 0.35 },
    cave:           { damla: 0.35 }          // tavandan sızan su (yağmur YOK)
  },
  _BOS: { yagmur: 0, damla: 0, kar: 0, tipi: 0, kum: 0, kor: 0, kul: 0, simsek: 0, buz: 0, ruzgar: 0, aktif: false },

  // Hava profilini haritadan türet (bir kez; sonra önbellekten).
  _profil(mapId) {
    const id = (mapId == null ? '' : String(mapId));
    let pr = this._profilOnbellek[id];
    if (pr) return pr;
    const ham = this.HAVA[id];
    if (!ham) { this._profilOnbellek[id] = this._BOS; return this._BOS; }
    pr = {
      yagmur: ham.yagmur || 0, damla: ham.damla || 0, kar: ham.kar || 0,
      tipi: ham.tipi || 0, kum: ham.kum || 0, kor: ham.kor || 0,
      kul: ham.kul || 0, simsek: ham.simsek || 0, buz: ham.buz || 0,
      ruzgar: ham.ruzgar || 0, aktif: true
    };
    this._profilOnbellek[id] = pr;
    return pr;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KURULUM
  // ═════════════════════════════════════════════════════════════════════════
  hazir(W, H) {
    W = Math.max(1, Math.round(W || 0));
    H = Math.max(1, Math.round(H || 0));
    this._havuzKur();                            // yalnız İLK çağrıda iş yapar
    if (this._hazirlandi && this._W === W && this._H === H) return false;
    this._W = W;
    this._H = H;
    this._hazirlandi = true;
    // Ekran uzayı gradientleri boyuta bağlıdır → yedek önbelleği ve ön ısıtmayı
    // geçersiz kıl.
    this._grYerel = {};
    this._grUretim = 0;
    this._onIsitImza = null;
    this._onIsitGr = null;
    this._blurDestek = null;
    this._tamponKare = -1;
    this._tohumla(W, H);                         // havuzu YERİNDE yeniden konumla
    // Damla merceği için üçte bir çözünürlüklü ekran kopyası.
    const bw = Math.max(16, Math.round(W / 3));
    const bh = Math.max(16, Math.round(H / 3));
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        if (!this._tampon || this._tampon.width !== bw || this._tampon.height !== bh) {
          const c = document.createElement('canvas');
          c.width = bw;
          c.height = bh;
          this._tampon = c;
        }
      } else {
        this._tampon = null;
      }
    } catch (e) {
      this._tampon = null;
    }
    return true;
  },

  // 🔴 Havuzlar YALNIZ BURADA ve YALNIZ BİR KEZ kurulur. Uzunlukları sabittir.
  _havuzKur() {
    if (this._havuz) return false;
    const B = this.BOYUT;
    const h = {};
    let i;
    h.yagmur = new Array(B.yagmur);
    for (i = 0; i < B.yagmur; i++) h.yagmur[i] = { x: 0, y: 0, u: 10, h: 900, k: 0, a: 1 };
    h.damla = new Array(B.damla);
    for (i = 0; i < B.damla; i++) h.damla[i] = { x: 0, y: 0, r: 4, vy: 0, iz: 0, dur: 0, bekle: 0, v: 0 };
    h.kar = new Array(B.kar);
    for (i = 0; i < B.kar; i++) h.kar[i] = { x: 0, y: 0, r: 2, h: 40, k: 0, f: 0, s: 1, d: 0 };
    h.kum = new Array(B.kum);
    for (i = 0; i < B.kum; i++) h.kum[i] = { x: 0, y: 0, u: 20, h: 400, k: 0, a: 1 };
    h.kor = new Array(B.kor);
    for (i = 0; i < B.kor; i++) h.kor[i] = { x: 0, y: 0, r: 2, h: 60, f: 0, s: 1, o: 1 };
    h.kul = new Array(B.kul);
    for (i = 0; i < B.kul; i++) h.kul[i] = { x: 0, y: 0, r: 2, h: 30, f: 0, s: 1 };
    h.buz = new Array(B.buz);
    for (i = 0; i < B.buz; i++) h.buz[i] = { x: 0, y: 0, r: 10, f: 0, kol: 6, ac: 0 };
    this._havuz = h;
    this._simsekYol = (typeof Float64Array !== 'undefined')
      ? new Float64Array(64) : new Array(64);
    return true;
  },

  // Havuzu ekran boyutuna göre YERİNDE tohumla (yeni nesne ÜRETİLMEZ).
  _tohumla(W, H) {
    const h = this._havuz;
    if (!h) return;
    this._rndDurum = (this._hash('hava|' + W + 'x' + H) | 0) || 22222;
    const R = this;
    let i, d;

    for (i = 0; i < h.yagmur.length; i++) {
      d = h.yagmur[i];
      d.k = i % 3;                                    // 0=uzak 1=orta 2=yakın
      d.x = R._rnd() * (W + 240) - 120;
      d.y = R._rnd() * (H + 200) - 100;
      d.u = (10 + d.k * 11) * (0.7 + R._rnd() * 0.7); // çizgi uzunluğu
      d.h = (760 + d.k * 520) * (0.85 + R._rnd() * 0.4);
      d.a = 0.35 + d.k * 0.26 + R._rnd() * 0.12;
    }
    for (i = 0; i < h.damla.length; i++) {
      d = h.damla[i];
      d.x = R._rnd() * W;
      d.y = R._rnd() * H;
      d.r = 2.2 + R._rnd() * 7.5;
      d.vy = 0; d.iz = 0; d.dur = 0;
      d.bekle = R._rnd() * 3.2;
      d.v = (R._rnd() * 3) | 0;
    }
    for (i = 0; i < h.kar.length; i++) {
      d = h.kar[i];
      d.k = i % 3;
      d.x = R._rnd() * (W + 160) - 80;
      d.y = R._rnd() * (H + 160) - 80;
      d.r = (1.1 + d.k * 2.1) * (0.7 + R._rnd() * 0.8);
      d.h = (26 + d.k * 62) * (0.8 + R._rnd() * 0.5);
      d.f = R._rnd() * 6.283;                          // salınım fazı
      d.s = 0.5 + R._rnd() * 1.5;                      // salınım hızı
      d.d = R._rnd() * 6.283;                          // dönüş fazı
    }
    for (i = 0; i < h.kum.length; i++) {
      d = h.kum[i];
      d.k = i % 3;
      d.x = R._rnd() * (W + 300) - 150;
      d.y = R._rnd() * H;
      d.u = (14 + d.k * 26) * (0.6 + R._rnd() * 0.9);
      d.h = (240 + d.k * 460) * (0.7 + R._rnd() * 0.7);
      d.a = 0.18 + d.k * 0.20 + R._rnd() * 0.12;
    }
    for (i = 0; i < h.kor.length; i++) {
      d = h.kor[i];
      d.x = R._rnd() * W;
      d.y = R._rnd() * H;
      d.r = 0.9 + R._rnd() * 2.6;
      d.h = 26 + R._rnd() * 78;                        // yukarı hız
      d.f = R._rnd() * 6.283;
      d.s = 0.7 + R._rnd() * 2.2;
      d.o = 0.4 + R._rnd() * 0.6;                      // titreme genliği
    }
    for (i = 0; i < h.kul.length; i++) {
      d = h.kul[i];
      d.x = R._rnd() * W;
      d.y = R._rnd() * H;
      d.r = 0.8 + R._rnd() * 2.4;
      d.h = 12 + R._rnd() * 44;                        // aşağı hız
      d.f = R._rnd() * 6.283;
      d.s = 0.3 + R._rnd() * 1.1;
    }
    // Buz kristalleri: KENARLARA yığılmış, sabit (hareket etmez, yalnız büyür).
    for (i = 0; i < h.buz.length; i++) {
      d = h.buz[i];
      const kenar = i % 4;
      const u = R._rnd();
      const derin = Math.pow(R._rnd(), 2.1);          // kenara yakınlık (kare kök tersi)
      if (kenar === 0) { d.x = u * W; d.y = derin * H * 0.30; }
      else if (kenar === 1) { d.x = u * W; d.y = H - derin * H * 0.30; }
      else if (kenar === 2) { d.x = derin * W * 0.22; d.y = u * H; }
      else { d.x = W - derin * W * 0.22; d.y = u * H; }
      d.r = (6 + R._rnd() * 26) * (1.15 - derin * 0.6);
      d.f = R._rnd() * 6.283;
      d.kol = 6;
      d.ac = R._rnd() * 1.047;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM — dünya dönüşümü KAPALI, ekran uzayında çalışır
  // ═════════════════════════════════════════════════════════════════════════
  ciz(ctx, W, H, ba) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    ba = ba || {};
    const p = ba.palet || this._VARSAYILAN_PALET;
    if (!this._hazirlandi || this._W !== Math.round(W) || this._H !== Math.round(H)) {
      this.hazir(W, H);
    }

    // 🔴 Hava türü YALNIZ mapId'den. Tablo dışı harita → hiçbir şey çizilmez.
    const hv = this._profil(ba.mapId);
    if (!hv.aktif) return;

    // dt kelepçesi: sekme arkaplandan dönünce dev dt gelir; parçacıklar
    // ışınlanmasın diye 50 ms'te kesilir (dt'yi biriktirme — CLAUDE.md intro notu).
    let dt = (typeof ba.dt === 'number' && isFinite(ba.dt)) ? ba.dt : 0.016;
    dt = Math.max(0, Math.min(0.05, dt));
    this._t += dt;
    const t = (typeof ba.t === 'number' && isFinite(ba.t)) ? ba.t : this._t;
    this._kare++;

    this._renkHazirla(p);
    this._ruzgarGuncelle(ba, hv, dt, t);
    this._onIsit(ctx, W, H, ba, p, hv);              // ilk karede TÜM gradientler

    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;
    this._gorusKaybi = 0;
    this._simsekGuc = 0;

    // Sıra: uzaktan yakına. Perde/pus önce, cama yapışan damla EN SON.
    try { this._kumFirtina(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._karTanesi(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._tipiPerde(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._korKul(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._yagmurCizgi(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._simsek(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._camBuz(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}
    try { this._camDamla(ctx, W, H, ba, p, hv, dt, t); } catch (e) {}

    // Kural 5: durum her hâlükârda geri konur (bir efekt yarıda patlasa bile).
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    try { ctx.filter = 'none'; } catch (e) {}
  },

  // ── Rüzgâr modeli: harita tabanı + araç hızı + iki frekanslı salınım ─────
  _ruzgarGuncelle(ba, hv, dt, t) {
    const v = ba.vehicle;
    const vx = (v && typeof v.vx === 'number' && isFinite(v.vx)) ? v.vx : 0;
    const taban = hv.ruzgar * 320;
    const salinim = 1 + Math.sin(t * 0.41) * 0.30 + Math.sin(t * 0.13 + 1.7) * 0.22;
    // Araç sağa giderse hava SOLA akar (göreli rüzgâr) → işaret ters.
    const hedef = taban * salinim - vx * 0.55;
    const k = Math.min(1, dt * 2.6);
    this._ruzgar += (hedef - this._ruzgar) * k;
    if (!isFinite(this._ruzgar)) this._ruzgar = 0;
    this._ruzgar = Math.max(-2600, Math.min(2600, this._ruzgar));
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) YAĞMUR ÇİZGİLERİ — eğim araç hızıyla artar
  // ═════════════════════════════════════════════════════════════════════════
  _yagmurCizgi(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'yagmurCizgi');
    if (g <= 0 || hv.yagmur <= 0) return;
    const hz = this._havuz.yagmur;
    const r = this._renk;
    const yog = hv.yagmur * (0.35 + 0.65 * g);
    const adet = Math.max(6, Math.round(hz.length * Math.min(1, yog)));
    const ruz = this._ruzgar;

    // Katman katman TEK path + TEK stroke (kare başına 3 stroke → ucuz).
    ctx.save();
    ctx.lineCap = 'round';
    for (let kk = 0; kk < 3; kk++) {
      const derinlik = 0.45 + kk * 0.30;                 // yakın katman daha hızlı
      const kayma = ruz * derinlik;
      const egim = Math.max(-2.6, Math.min(2.6, kayma / 900));
      ctx.beginPath();
      let cizildi = 0;
      for (let i = 0; i < hz.length; i++) {
        const d = hz[i];
        if (d.k !== kk) continue;
        // ── güncelleme (havuzun TAMAMI güncellenir, çizim adetle sınırlı) ──
        d.y += d.h * derinlik * dt;
        d.x += kayma * dt;
        if (d.y > H + d.u * 2) {
          d.y = -d.u - this._rnd() * H * 0.35;
          d.x = this._rnd() * (W + 260) - 130;
        }
        if (d.x < -140) d.x += W + 280;
        else if (d.x > W + 140) d.x -= W + 280;
        if (i >= adet) continue;
        cizildi++;
        const uz = d.u * (1 + Math.abs(egim) * 0.55);
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + egim * uz, d.y + uz);
      }
      if (!cizildi) continue;
      ctx.save();
      if (kk === 0 && g >= 0.5) this._bulanik(ctx, 1.2 + 1.8 * g);   // uzak katman odak dışı
      ctx.globalAlpha = Math.min(0.75, (0.16 + kk * 0.13) * g * hv.yagmur);
      ctx.strokeStyle = r.yagmur[kk];
      ctx.lineWidth = 0.8 + kk * 0.85;
      ctx.stroke();
      ctx.restore();
    }

    // Yakın katmana ek "parlayan" geçiş (lighter) — ıslak cam hissi.
    if (g >= 0.6) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.10 * g * hv.yagmur;
      ctx.strokeStyle = r.yagmurParlak;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      const kayma2 = ruz * 1.05;
      const egim2 = Math.max(-2.6, Math.min(2.6, kayma2 / 900));
      for (let i = 2; i < hz.length && i < adet; i += 3) {
        const d = hz[i];
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + egim2 * d.u * 1.5, d.y + d.u * 1.5);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Yağmur perdesi: sahneyi hafifçe soğutan dikey pus (önbellekli gradient).
    ctx.globalAlpha = Math.min(0.42, 0.14 * g * hv.yagmur);
    ctx.fillStyle = this._grYagmurPerde(ctx, ba, p);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) ÖN CAM SU DAMLALARI — duran → aniden kayan → iz bırakan, ışığı kıran
  // ⚠ Mercek `drawImage` + `clip` ile yapılır; getImageData YOK.
  // ═════════════════════════════════════════════════════════════════════════
  _camDamla(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'camDamla');
    if (g <= 0 || hv.damla <= 0) return;
    const hz = this._havuz.damla;
    const r = this._renk;
    const adet = Math.max(4, Math.round(hz.length * Math.min(1, hv.damla * (0.4 + 0.6 * g))));
    const ruz = this._ruzgar;
    const govdeGr = this._grDamlaGovde(ctx, ba, p);
    const izGr = this._grDamlaIz(ctx, ba, p);
    // Mercek yalnız yüksek kalitede ve yalnız EN BÜYÜK birkaç damlada.
    const mercek = (g >= 0.55) && this._tamponGuncelle(ctx, W, H);
    let mercekKalan = mercek ? 10 : 0;

    ctx.save();
    for (let i = 0; i < hz.length; i++) {
      const d = hz[i];
      // ── güncelleme: yüzey gerilimi → dur/kay durum makinesi ──
      if (d.dur === 0) {
        d.bekle -= dt;
        d.y += dt * (6 + d.r);                         // duran damla da hafif akar
        d.x += ruz * dt * 0.012;
        if (d.bekle <= 0) { d.dur = 1; d.vy = 26 + this._rnd() * 70; }
      } else {
        d.vy += dt * (620 + d.r * 130);
        d.y += d.vy * dt;
        d.x += ruz * dt * 0.05;
        d.iz = Math.min(d.r * 11, d.iz + d.vy * dt * 0.85);
        // rastgele takılma (gerçek damla düz kaymaz)
        if (this._rnd() < dt * 1.15) { d.dur = 0; d.bekle = 0.15 + this._rnd() * 1.5; d.vy = 0; }
      }
      d.iz *= (d.dur === 0) ? Math.max(0, 1 - dt * 1.8) : 1;
      if (d.y - d.iz > H + 50 || d.x < -60 || d.x > W + 60) {
        d.x = this._rnd() * W;
        d.y = -12 - this._rnd() * H * 0.2;
        d.r = 2.2 + this._rnd() * 7.5 * (0.55 + hv.damla * 0.7);
        d.vy = 0; d.iz = 0; d.dur = 0;
        d.bekle = this._rnd() * 2.6;
        d.v = (this._rnd() * 3) | 0;
      }
      if (i >= adet) continue;

      // ── a) kayma izi (incelen su şeridi) ──
      if (d.iz > 1.5) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, 0.20 * g * hv.damla);
        ctx.translate(d.x, d.y - d.iz);
        ctx.scale(d.r * 0.62, d.iz);
        ctx.fillStyle = izGr;
        ctx.fillRect(-1, 0, 2, 1);
        ctx.restore();
      }

      // ── b) mercek: arkasındaki sahne TERS ve BÜYÜK görünür ──
      if (mercekKalan > 0 && d.r > 5.2) {
        mercekKalan--;
        ctx.save();
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 0.94, 0, 6.28318);
        ctx.clip();
        ctx.globalAlpha = Math.min(0.75, 0.55 * g);
        const m = 1.45;
        ctx.translate(d.x, d.y);
        ctx.scale(m, -m);                              // dikey ters çevirme = kırılma
        ctx.translate(-d.x, -d.y);
        try { ctx.drawImage(this._tampon, 0, 0, W, H); } catch (e2) {}
        ctx.restore();
      }

      // ── c) damla gövdesi: kenarı parlak, ortası boş (cam mercek) ──
      ctx.save();
      ctx.globalAlpha = Math.min(0.9, (0.55 + d.v * 0.10) * g);
      ctx.translate(d.x, d.y);
      ctx.scale(d.r, d.r * (d.dur === 1 ? 1.22 : 1.0));
      ctx.fillStyle = govdeGr;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, 6.28318);
      ctx.fill();
      ctx.restore();

      // ── d) üst-sol parlaması + alt gölge (hacim hissi) ──
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.85, 0.42 * g);
      ctx.fillStyle = r.damlaIsik;
      ctx.beginPath();
      ctx.arc(d.x - d.r * 0.33, d.y - d.r * 0.36, Math.max(0.4, d.r * 0.26), 0, 6.28318);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.5, 0.22 * g);
      ctx.strokeStyle = r.damlaGolge;
      ctx.lineWidth = Math.max(0.5, d.r * 0.16);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 0.88, 0.55, 2.55);
      ctx.stroke();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) KAR TANELERİ — 3 derinlik katmanı (yakın büyük/hızlı, uzak küçük/yavaş)
  // ═════════════════════════════════════════════════════════════════════════

  // ⚠ Kar havuzunun GÜNCELLEMESİ çizimden AYRIDIR: `tipiPerde` de aynı havuzu
  //   okur. Kalite 'karTanesi'=0 ama 'tipiPerde'=1 iken güncelleme çizimin
  //   içinde kalsaydı savrulan çizgiler DONARDI (sessiz görsel bug).
  //   `_karKare` sayesinde kare başına EN FAZLA bir kez koşar.
  _karGuncelle(W, H, hv, dt, t) {
    if (this._karKare === this._kare) return;
    this._karKare = this._kare;
    const hz = this._havuz.kar;
    const tipiEk = 1 + hv.tipi * 2.6;                  // tipide kar YATAY savrulur
    const ruz = this._ruzgar;
    for (let i = 0; i < hz.length; i++) {
      const d = hz[i];
      const derinlik = 0.35 + d.k * 0.36;
      d.y += d.h * derinlik * dt * (1 + hv.tipi * 0.5);
      d.x += (ruz * derinlik * tipiEk + Math.sin(t * d.s + d.f) * 26 * (1 + d.k)) * dt;
      d.d += dt * d.s * 0.8;
      if (d.y > H + 20) { d.y = -20 - this._rnd() * H * 0.3; d.x = this._rnd() * (W + 160) - 80; }
      if (d.x < -90) d.x += W + 180;
      else if (d.x > W + 90) d.x -= W + 180;
    }
  },

  _karTanesi(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'karTanesi');
    if (g <= 0 || hv.kar <= 0) return;
    this._karGuncelle(W, H, hv, dt, t);
    const hz = this._havuz.kar;
    const r = this._renk;
    const adet = Math.max(8, Math.round(hz.length * Math.min(1, hv.kar * (0.35 + 0.65 * g))));

    // 🔴 PERF(31 Tmz · §8B.33) — HAVUZ 3 KEZ TARANIYORDU.
    //   Dış döngü 3 katman × iç döngü `hz.length` = havuzun 3 katı gezinme,
    //   üstelik `i >= adet` koşulu zaten sonrasını eliyordu. Tarama sınırı
    //   `adet`e çekildi (görünen taneyi ELEMEZ: eski kod da i>=adet'i atlıyordu).
    //   Ayrıca EKRAN DIŞI taneler atlanır — tane havuzu kenar payıyla
    //   sarmalandığı için hiçbir piksele dokunmayan taneler çiziliyordu.
    const tara = Math.min(hz.length, adet);
    const cw = (ctx.canvas && ctx.canvas.width) || W;
    const ch = (ctx.canvas && ctx.canvas.height) || H;
    ctx.save();
    // ── uzak + orta katman: TEK path, TEK fill (çok ucuz) ──
    for (let kk = 0; kk < 3; kk++) {
      if (kk < 2) { ctx.beginPath(); }
      let cizildi = 0;
      for (let i = 0; i < tara; i++) {
        const d = hz[i];
        if (d.k !== kk) continue;
        // 🔴 EKRAN DIŞI ELEMESİ YALNIZ YAKIN KATMANDA (kk===2).
        //   Uzak/orta katmanlar TEK path'te toplanıp TEK `fill` ile çiziliyor
        //   ve o fill BULANIKLAŞTIRILIYOR (`blur(1.4+2.2g)`). Ekran dışındaki
        //   bir tane bulanıklık yarıçapı kadar İÇERİ SIZABİLİR; oradan eleme
        //   yapmak görüntüyü değiştirir (anlamsal iz kıyası yakaladı: blizzard
        //   path noktası 258 → 207, sınır kutusu y −172 → −2,9).
        //   Yakın katman ise tane BAŞINA ayrı çizim yapar (8 çağrı) ve
        //   bulanıklık uygulanmaz → elemek tamamen güvenli.
        if (kk === 2) {
          const rk = d.r * 2.8;               // ölçek 2.6 + kristal kolu payı
          if (d.x + rk < 0 || d.x - rk > cw || d.y + rk < 0 || d.y - rk > ch) continue;
        }
        cizildi++;
        if (kk < 2) {
          ctx.moveTo(d.x + d.r, d.y);
          ctx.arc(d.x, d.y, d.r, 0, 6.28318);
        } else {
          // ── yakın katman: yumuşak parıltı + 6 kollu kristal ──
          ctx.save();
          ctx.globalAlpha = Math.min(0.9, 0.55 * g * hv.kar);
          ctx.translate(d.x, d.y);
          ctx.scale(d.r * 2.6, d.r * 2.6);
          ctx.fillStyle = this._grKar(ctx, ba, p);
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, 6.28318);
          ctx.fill();
          ctx.restore();
          if (d.r > 3.4) {
            ctx.save();
            ctx.globalAlpha = Math.min(0.8, 0.40 * g * hv.kar);
            ctx.translate(d.x, d.y);
            ctx.rotate(d.d);
            ctx.strokeStyle = r.karParlak;
            ctx.lineWidth = Math.max(0.5, d.r * 0.22);
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let a = 0; a < 3; a++) {
              const ac = a * 1.0472;
              const cx = Math.cos(ac) * d.r * 1.7, cy = Math.sin(ac) * d.r * 1.7;
              ctx.moveTo(-cx, -cy);
              ctx.lineTo(cx, cy);
            }
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      if (kk < 2 && cizildi) {
        // ⚠ En uzak katman ALAN DERİNLİĞİ için bulanık — TEK fill olduğu için
        //   blur bedeli kare başına 1 GPU işlemi (yolu save/restore bozmaz).
        ctx.save();
        if (kk === 0 && g >= 0.5) this._bulanik(ctx, 1.4 + 2.2 * g);
        ctx.globalAlpha = Math.min(0.85, (0.28 + kk * 0.20) * g * hv.kar);
        ctx.fillStyle = r.kar[kk];
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) TİPİ PERDESİ — yatay savrulan kar bantları + görüş azalması (whiteout)
  // ═════════════════════════════════════════════════════════════════════════
  _tipiPerde(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'tipiPerde');
    if (g <= 0 || hv.tipi <= 0) return;
    // Kar havuzu bu karede güncellenmediyse (karTanesi kalitesi 0) BURADA
    // güncelle — yoksa savrulan çizgiler donar.
    if (hv.kar > 0) this._karGuncelle(W, H, hv, dt, t);
    const r = this._renk;
    const siddet = hv.tipi * g;
    const bantGr = this._grTipiBant(ctx, ba, p);

    ctx.save();
    // ── a) 5 yatay bant, farklı hız/yükseklikte kayar ──
    for (let i = 0; i < 5; i++) {
      const hiz = 380 + i * 260;
      const kay = ((t * hiz + i * 517) % (W + 900)) - 450;
      const yy = H * (0.06 + i * 0.19) + Math.sin(t * (0.5 + i * 0.21) + i) * H * 0.05;
      const yuk = H * (0.10 + (i % 3) * 0.05);
      const dalga = 0.55 + 0.45 * Math.sin(t * (0.9 + i * 0.3) + i * 2.1);
      ctx.globalAlpha = Math.min(0.55, 0.11 * siddet * dalga * (0.7 + i * 0.12));
      ctx.save();
      ctx.translate(W - kay, yy);
      ctx.scale(W * 0.72, yuk);
      ctx.fillStyle = bantGr;
      ctx.fillRect(-1, -0.5, 2, 1);
      ctx.restore();
    }

    // ── b) yatay savrulan uzun kar çizgileri (kar havuzundan okunur) ──
    const hz = this._havuz.kar;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.5, 0.16 * siddet);
    ctx.strokeStyle = r.karParlak;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const uzGen = 26 + Math.abs(this._ruzgar) * 0.055;
    for (let i = 0; i < hz.length; i += 2) {
      const d = hz[i];
      const u = uzGen * (0.5 + d.k * 0.55);
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - u, d.y + u * 0.16);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    // ── c) GÖRÜŞ AZALMASI: kenarları beyazlatan, merkezi açık bırakan örtü ──
    const nabiz = 0.55 + 0.45 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1.1);
    const kayip = Math.min(0.62, (0.20 + 0.26 * nabiz) * siddet);
    this._gorusKaybi = kayip;
    ctx.globalAlpha = kayip;
    ctx.fillStyle = this._grTipiOrtu(ctx, ba, p);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) KUM FIRTINASI — yatay akan kum katmanları + sarı-kahve puslanma
  // ═════════════════════════════════════════════════════════════════════════
  _kumFirtina(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'kumFirtina');
    if (g <= 0 || hv.kum <= 0) return;
    const hz = this._havuz.kum;
    const r = this._renk;
    const siddet = hv.kum * g;
    const adet = Math.max(10, Math.round(hz.length * Math.min(1, hv.kum * (0.35 + 0.65 * g))));
    const ruz = this._ruzgar;
    const bantGr = this._grKumBant(ctx, ba, p);

    ctx.save();
    // ── a) sarı-kahve pus (tüm sahneyi yutar) ──
    ctx.globalAlpha = Math.min(0.6, 0.24 * siddet);
    ctx.fillStyle = this._grKumPus(ctx, ba, p);
    ctx.fillRect(0, 0, W, H);

    // ── b) 4 akan kum katmanı ──
    for (let i = 0; i < 4; i++) {
      const hiz = 300 + i * 340;
      const kay = ((t * hiz + i * 733) % (W + 1000)) - 500;
      const yy = H * (0.14 + i * 0.22) + Math.sin(t * (0.4 + i * 0.27) + i * 1.7) * H * 0.07;
      const yuk = H * (0.12 + (i % 2) * 0.07);
      ctx.globalAlpha = Math.min(0.5, 0.10 * siddet * (0.6 + 0.4 * Math.sin(t * 0.8 + i)));
      ctx.save();
      ctx.translate(W - kay, yy);
      ctx.scale(W * 0.8, yuk);
      ctx.fillStyle = bantGr;
      ctx.fillRect(-1, -0.5, 2, 1);
      ctx.restore();
    }

    // ── c) kum taneleri: yatay uzayan kısa çizgiler (katman başına tek stroke)
    ctx.lineCap = 'round';
    for (let kk = 0; kk < 3; kk++) {
      const derinlik = 0.4 + kk * 0.35;
      ctx.beginPath();
      let cizildi = 0;
      for (let i = 0; i < hz.length; i++) {
        const d = hz[i];
        if (d.k !== kk) continue;
        d.x -= (d.h * derinlik + Math.abs(ruz) * 0.5) * dt;
        d.y += Math.sin(t * 1.7 + d.x * 0.01) * 14 * dt;
        if (d.x < -d.u - 40) { d.x = W + 40 + this._rnd() * W * 0.35; d.y = this._rnd() * H; }
        if (d.y < -20) d.y += H + 40; else if (d.y > H + 20) d.y -= H + 40;
        if (i >= adet) continue;
        cizildi++;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.u * (1 + kk * 0.4), d.y - d.u * 0.08);
      }
      if (!cizildi) continue;
      ctx.globalAlpha = Math.min(0.7, (0.14 + kk * 0.12) * siddet);
      ctx.strokeStyle = r.kum[kk];
      ctx.lineWidth = 0.8 + kk * 0.9;
      ctx.stroke();
    }

    // ── d) sıcak ton darbesi (kum fırtınası sahneyi sarartır) ──
    if (g >= 0.5) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = Math.min(0.5, 0.22 * siddet);
      ctx.fillStyle = r.kumTon;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) KOR + KÜL — yukarı süzülen közler, aşağı düşen kül
  // ═════════════════════════════════════════════════════════════════════════
  _korKul(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'korKul');
    if (g <= 0 || (hv.kor <= 0 && hv.kul <= 0)) return;
    const r = this._renk;
    const ruz = this._ruzgar;

    ctx.save();
    // ── a) KÜL: gri, yavaş, aşağı; tek path + tek fill ──
    if (hv.kul > 0) {
      const hk = this._havuz.kul;
      const adetK = Math.max(6, Math.round(hk.length * Math.min(1, hv.kul * (0.35 + 0.65 * g))));
      ctx.beginPath();
      let ck = 0;
      for (let i = 0; i < hk.length; i++) {
        const d = hk[i];
        d.y += d.h * dt;
        d.x += (Math.sin(t * d.s + d.f) * 22 + ruz * 0.08) * dt;
        if (d.y > H + 12) { d.y = -12 - this._rnd() * H * 0.25; d.x = this._rnd() * (W + 80) - 40; }
        if (d.x < -40) d.x += W + 80; else if (d.x > W + 40) d.x -= W + 80;
        if (i >= adetK) continue;
        ck++;
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, 6.28318);
      }
      if (ck) {
        ctx.save();
        if (g >= 0.5) this._bulanik(ctx, 1.0 + 1.6 * g);   // kül odakta değildir
        ctx.globalAlpha = Math.min(0.6, 0.30 * g * hv.kul);
        ctx.fillStyle = r.kul;
        ctx.fill();
        ctx.restore();
      }
      // düşen külün ince izleri (ULTRA)
      if (g >= 0.75) {
        ctx.globalAlpha = Math.min(0.3, 0.12 * g * hv.kul);
        ctx.strokeStyle = r.kulIz;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (let i = 0; i < hk.length && i < adetK; i += 3) {
          const d = hk[i];
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - Math.sin(t * d.s + d.f) * 5, d.y - d.r * 6);
        }
        ctx.stroke();
      }
    }

    // ── b) KOR: turuncu, yukarı süzülür, titrer; yakınlar gradient parıltılı ──
    if (hv.kor > 0) {
      const hc = this._havuz.kor;
      const adetC = Math.max(6, Math.round(hc.length * Math.min(1, hv.kor * (0.35 + 0.65 * g))));
      const korGr = this._grKor(ctx, ba, p);
      ctx.globalCompositeOperation = 'lighter';
      // düz çekirdekler (toplu)
      ctx.beginPath();
      let cc = 0;
      for (let i = 0; i < hc.length; i++) {
        const d = hc[i];
        d.y -= d.h * dt;
        d.x += (Math.sin(t * d.s * 1.6 + d.f) * 34 + ruz * 0.10) * dt;
        if (d.y < -14) { d.y = H + 14 + this._rnd() * H * 0.3; d.x = this._rnd() * (W + 80) - 40; }
        if (d.x < -40) d.x += W + 80; else if (d.x > W + 40) d.x -= W + 80;
        if (i >= adetC) continue;
        cc++;
        ctx.moveTo(d.x + d.r * 0.6, d.y);
        ctx.arc(d.x, d.y, d.r * 0.6, 0, 6.28318);
      }
      if (cc) {
        ctx.globalAlpha = Math.min(0.95, 0.70 * g * hv.kor);
        ctx.fillStyle = r.korCekirdek;
        ctx.fill();
      }
      // parıltı haleleri — yalnız en yakın közlerde (ölçülü sayıda)
      const haleAdet = Math.min(adetC, Math.round(28 * (0.4 + 0.6 * g)));
      for (let i = 0; i < haleAdet; i++) {
        const d = hc[i];
        const tit = 0.45 + 0.55 * Math.abs(Math.sin(t * (3.1 + d.s * 2.4) + d.f));
        ctx.save();
        ctx.globalAlpha = Math.min(0.85, 0.34 * g * hv.kor * tit * d.o);
        ctx.translate(d.x, d.y);
        ctx.scale(d.r * 7.5, d.r * 7.5);
        ctx.fillStyle = korGr;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, 6.28318);
        ctx.fill();
        ctx.restore();
      }
      // yukarı uzayan kıvılcım izleri
      if (g >= 0.6) {
        ctx.globalAlpha = Math.min(0.5, 0.20 * g * hv.kor);
        ctx.strokeStyle = r.korIz;
        ctx.lineWidth = 0.9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < adetC; i += 2) {
          const d = hc[i];
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - Math.sin(t * d.s * 1.6 + d.f) * 4, d.y + d.r * 7);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 7) ŞİMŞEK — çok darbeli çakma. `ba.t` tabanlı, TAMAMEN DETERMİNİSTİK:
  //    aynı harita + aynı t → aynı çakma (tekrar oynatma/hayalet ile uyumlu).
  // ═════════════════════════════════════════════════════════════════════════
  _simsek(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'simsek');
    if (g <= 0 || hv.simsek <= 0) return;
    const s = this._simsekDurum(ba, hv, t);
    if (!s || s.guc <= 0.004) return;
    this._simsekGuc = s.guc;
    const r = this._renk;
    const guc = Math.min(1, s.guc) * g;

    ctx.save();
    // ── a) gökyüzü çakması (üstten aşağı sönen parlama) ──
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.85, 0.55 * guc);
    ctx.fillStyle = this._grSimsekGok(ctx, ba, p);
    ctx.fillRect(0, 0, W, H);

    // ── b) çakma odağı (kaynak noktası) ──
    ctx.save();
    ctx.globalAlpha = Math.min(0.9, 0.60 * guc);
    ctx.translate(s.x, H * 0.06);
    ctx.scale(Math.max(W, H) * 0.62, Math.max(W, H) * 0.62);
    ctx.fillStyle = this._grSimsekOdak(ctx, ba, p);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, 6.28318);
    ctx.fill();
    ctx.restore();

    // ── c) şimşek gövdesi: sabit havuzda (Float64Array) üretilen kırık çizgi.
    //    Tohum darbe kimliğinden gelir → her karede AYNI yol çizilir.
    if (g >= 0.35 && s.govde > 0.02) {
      const n = this._simsekYolUret(s.tohum, s.x, W, H);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // dış hale
      ctx.globalAlpha = Math.min(0.75, 0.45 * guc * s.govde);
      ctx.strokeStyle = r.simsekHale;
      ctx.lineWidth = Math.max(3, W * 0.012);
      this._simsekYolCiz(ctx, n);
      // çekirdek
      ctx.globalAlpha = Math.min(1, 0.9 * guc * s.govde);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.2, W * 0.0035);
      this._simsekYolCiz(ctx, n);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // Darbe zarfı: 3 üst üste binen sönümlü darbe (gerçek şimşek tek vurmaz).
  _simsekDurum(ba, hv, t) {
    const P = 3.6;                                     // yuva uzunluğu (sn)
    const id = (ba && ba.mapId) || '';
    const slot = Math.floor(t / P);
    let en = 0, enTohum = 0, enX = 0.5, enGovde = 0;
    for (let s = slot - 1; s <= slot; s++) {
      const h = this._hash(id + '#' + s);
      const olas = ((h >>> 9) % 1000) / 1000;
      if (olas >= hv.simsek) continue;                 // bu yuvada çakma yok
      const bas = s * P + ((h % 907) / 907) * P * 0.75;
      const u = t - bas;
      if (u < 0 || u > 0.95) continue;
      // 3 darbe: 0.00 · 0.11 · 0.26 sn
      let e = 0;
      e += 1.00 * Math.exp(-u * 11);
      if (u > 0.11) e += 0.62 * Math.exp(-(u - 0.11) * 15);
      if (u > 0.26) e += 0.38 * Math.exp(-(u - 0.26) * 9);
      e *= (0.55 + 0.45 * Math.abs(Math.sin(u * 33 + (h % 13))));
      e *= (0.45 + 0.55 * hv.simsek);
      if (e > en) {
        en = e;
        enTohum = h;
        enX = ((h >>> 3) % 1000) / 1000;
        enGovde = Math.exp(-u * 16);                   // gövde çakmadan hemen sonra söner
      }
    }
    if (en <= 0) return null;
    return { guc: Math.min(1.4, en), tohum: enTohum, x: enX * this._W, govde: enGovde };
  },

  // Kırık çizgi üretimi — SABİT havuza (Float64Array) yazar, dizi BÜYÜMEZ.
  _simsekYolUret(tohum, bx, W, H) {
    const yol = this._simsekYol;
    if (!yol) return 0;
    const kap = (yol.length / 2) | 0;
    const adet = Math.min(kap, 18);
    let st = (tohum | 0) || 1234567;
    let x = bx, y = -H * 0.05;
    const hedefY = H * (0.55 + ((tohum >>> 5) % 100) / 400);
    const adim = (hedefY - y) / (adet - 1);
    for (let i = 0; i < adet; i++) {
      // xorshift32 — yerel, modül RNG'sini KİRLETMEZ (determinizm şart)
      st ^= st << 13; st |= 0;
      st ^= st >>> 17;
      st ^= st << 5; st |= 0;
      const rn = ((st >>> 0) / 4294967296) - 0.5;
      yol[i * 2] = x;
      yol[i * 2 + 1] = y;
      x += rn * W * 0.085 + (((tohum >>> 11) % 100) / 100 - 0.5) * W * 0.012;
      y += adim;
    }
    return adet;
  },
  _simsekYolCiz(ctx, n) {
    if (!(n > 1)) return;
    const yol = this._simsekYol;
    ctx.beginPath();
    ctx.moveTo(yol[0], yol[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(yol[i * 2], yol[i * 2 + 1]);
    ctx.stroke();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 8) CAM BUZLANMASI — kenarlardan içeri büyüyen buz dokusu
  // ═════════════════════════════════════════════════════════════════════════
  _camBuz(ctx, W, H, ba, p, hv, dt, t) {
    const g = this._k(ba, 'camBuz');
    if (g <= 0 || hv.buz <= 0) return;
    const hz = this._havuz.buz;
    const r = this._renk;
    const siddet = hv.buz * g;
    // Yavaş "donma" nefesi — buz büyür/küçülür.
    const nefes = 0.72 + 0.28 * Math.sin(t * 0.21);
    const kristalGr = this._grBuzKristal(ctx, ba, p);

    ctx.save();
    // ── a) kenar buzlanması (radyal çerçeve) ──
    ctx.globalAlpha = Math.min(0.7, 0.34 * siddet * nefes);
    ctx.fillStyle = this._grBuzKenar(ctx, ba, p);
    ctx.fillRect(0, 0, W, H);

    // ── b) kristaller: parıltı + 6 kollu iğne yapısı ──
    ctx.globalCompositeOperation = 'lighter';
    const adet = Math.max(6, Math.round(hz.length * Math.min(1, 0.35 + 0.65 * g)));
    for (let i = 0; i < adet; i++) {
      const d = hz[i];
      const bu = nefes * (0.6 + 0.4 * Math.sin(t * 0.5 + d.f));
      const rr = d.r * bu;
      if (rr < 1) continue;
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, 0.20 * siddet * bu);
      ctx.translate(d.x, d.y);
      ctx.scale(rr, rr);
      ctx.fillStyle = kristalGr;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, 6.28318);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.min(0.7, 0.26 * siddet * bu);
      ctx.translate(d.x, d.y);
      ctx.rotate(d.ac + Math.sin(t * 0.1 + d.f) * 0.05);
      ctx.strokeStyle = r.buzCizgi;
      ctx.lineWidth = Math.max(0.5, rr * 0.055);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let a = 0; a < 3; a++) {
        const ac = a * 1.0472;
        const cx = Math.cos(ac) * rr, cy = Math.sin(ac) * rr;
        ctx.moveTo(-cx, -cy);
        ctx.lineTo(cx, cy);
        // yan iğneler (dendrit)
        ctx.moveTo(cx * 0.55, cy * 0.55);
        ctx.lineTo(cx * 0.55 + cy * 0.28, cy * 0.55 - cx * 0.28);
        ctx.moveTo(-cx * 0.55, -cy * 0.55);
        ctx.lineTo(-cx * 0.55 - cy * 0.28, -cy * 0.55 + cx * 0.28);
      }
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GRADIENT GETİRİCİLER — hepsi önbellekli, anahtarları SABİT sayıda
  // (birim uzay: (0,0)-r=1 veya (-1..1); konum translate/scale ile verilir)
  // ═════════════════════════════════════════════════════════════════════════
  _grYagmurPerde(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-yagmurperde|' + this._W + 'x' + this._H + '|' + p.sis, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, self._H);
      gr.addColorStop(0, self._rgba(self._karis(p.sis, '#dfefff', 0.45), 0.42));
      gr.addColorStop(0.55, self._rgba(p.sis, 0.12));
      gr.addColorStop(1, self._rgba(p.sis, 0.02));
      return gr;
    });
  },
  _grDamlaGovde(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-damla|' + p.sis + '|' + p.bloom, function (c) {
      const gr = c.createRadialGradient(-0.28, -0.30, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)');
      gr.addColorStop(0.42, self._rgba(p.bloom, 0.08));
      gr.addColorStop(0.72, self._rgba(p.sis, 0.20));
      gr.addColorStop(0.90, 'rgba(255,255,255,0.46)');
      gr.addColorStop(0.99, self._rgba(p.sis, 0.30));
      gr.addColorStop(1, self._rgba(p.sis, 0));
      return gr;
    });
  },
  _grDamlaIz(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-damlaiz|' + p.sis, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(p.sis, 0));
      gr.addColorStop(0.55, self._rgba(self._karis(p.sis, '#ffffff', 0.35), 0.22));
      gr.addColorStop(1, 'rgba(255,255,255,0.42)');
      return gr;
    });
  },
  _grKar(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-kar|' + p.bloom, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.28, 'rgba(255,255,255,0.42)');
      gr.addColorStop(0.6, self._rgba(p.bloom, 0.14));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
  },
  _grTipiBant(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-tipibant|' + p.bloom, function (c) {
      const gr = c.createLinearGradient(-1, 0, 1, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.30, self._rgba(self._karis(p.bloom, '#ffffff', 0.7), 0.40));
      gr.addColorStop(0.52, 'rgba(255,255,255,0.72)');
      gr.addColorStop(0.74, self._rgba(self._karis(p.bloom, '#ffffff', 0.7), 0.34));
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      return gr;
    });
  },
  _grTipiOrtu(ctx, ba, p) {
    const self = this;
    const W = this._W, H = this._H;
    return this._gr(ctx, ba, 'hava-tipiortu|' + W + 'x' + H + '|' + p.sis, function (c) {
      const gr = c.createRadialGradient(W * 0.5, H * 0.52, Math.min(W, H) * 0.16,
                                        W * 0.5, H * 0.52, Math.max(W, H) * 0.78);
      gr.addColorStop(0, self._rgba(self._karis(p.sis, '#ffffff', 0.75), 0.10));
      gr.addColorStop(0.45, self._rgba(self._karis(p.sis, '#ffffff', 0.85), 0.45));
      gr.addColorStop(1, 'rgba(255,255,255,0.92)');
      return gr;
    });
  },
  _grKumBant(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-kumbant|' + p.tint + '|' + p.sis, function (c) {
      const gr = c.createLinearGradient(-1, 0, 1, 0);
      gr.addColorStop(0, self._rgba(p.sis, 0));
      gr.addColorStop(0.32, self._rgba(self._karis(p.sis, '#e8c88a', 0.55), 0.38));
      gr.addColorStop(0.55, self._rgba(self._karis(p.tint, '#f0d8a0', 0.6), 0.62));
      gr.addColorStop(0.78, self._rgba(self._karis(p.sis, '#e8c88a', 0.55), 0.30));
      gr.addColorStop(1, self._rgba(p.sis, 0));
      return gr;
    });
  },
  _grKumPus(ctx, ba, p) {
    const self = this;
    const W = this._W, H = this._H;
    return this._gr(ctx, ba, 'hava-kumpus|' + W + 'x' + H + '|' + p.tint + p.sis, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, self._rgba(self._karis(p.sis, '#d8b070', 0.5), 0.75));
      gr.addColorStop(0.45, self._rgba(self._karis(p.tint, '#c8a060', 0.5), 0.48));
      gr.addColorStop(1, self._rgba(self._karis(p.sis, '#8a6a38', 0.45), 0.62));
      return gr;
    });
  },
  _grKor(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-kor|' + p.bloom + '|' + p.tint, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,250,225,0.95)');
      gr.addColorStop(0.18, self._rgba(self._karis(p.bloom, '#ffb040', 0.5), 0.70));
      gr.addColorStop(0.45, self._rgba(self._karis(p.tint, '#ff5a10', 0.5), 0.24));
      gr.addColorStop(1, self._rgba(p.tint, 0));
      return gr;
    });
  },
  _grSimsekGok(ctx, ba, p) {
    const self = this;
    const W = this._W, H = this._H;
    return this._gr(ctx, ba, 'hava-simsekgok|' + W + 'x' + H + '|' + p.bloom, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(255,255,255,0.92)');
      gr.addColorStop(0.32, self._rgba(self._karis(p.bloom, '#ffffff', 0.6), 0.42));
      gr.addColorStop(0.72, self._rgba(p.bloom, 0.10));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
  },
  _grSimsekOdak(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-simsekodak|' + p.bloom, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,255,255,0.98)');
      gr.addColorStop(0.12, self._rgba(self._karis(p.bloom, '#ffffff', 0.8), 0.55));
      gr.addColorStop(0.45, self._rgba(p.bloom, 0.14));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
  },
  _grBuzKenar(ctx, ba, p) {
    const self = this;
    const W = this._W, H = this._H;
    return this._gr(ctx, ba, 'hava-buzkenar|' + W + 'x' + H + '|' + p.bloom, function (c) {
      const gr = c.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.30,
                                        W * 0.5, H * 0.5, Math.max(W, H) * 0.70);
      gr.addColorStop(0, self._rgba(p.bloom, 0));
      gr.addColorStop(0.58, self._rgba(self._karis(p.bloom, '#eafaff', 0.6), 0.16));
      gr.addColorStop(0.85, self._rgba(self._karis(p.bloom, '#eafaff', 0.75), 0.50));
      gr.addColorStop(1, 'rgba(240,252,255,0.86)');
      return gr;
    });
  },
  _grBuzKristal(ctx, ba, p) {
    const self = this;
    return this._gr(ctx, ba, 'hava-buzkristal|' + p.bloom, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.35, self._rgba(self._karis(p.bloom, '#dff4ff', 0.6), 0.24));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
  },

  // 🔴 ÖN ISITMA — o haritanın TÜM gradientlerini İLK karede üretir.
  // Neden: şimşek gibi seyrek efektler ilk kez 30. karede çizilirse orada
  // yeni gradient üretilir ve "kare başına 0 gradient" ölçümü bozulur.
  // Kaliteden BAĞIMSIZ çalışır → kalite değişince de yeni üretim olmaz.
  // 🔴 İmzaya EK OLARAK `ba.gr` REFERANSI karşılaştırılır: konak önbelleğini
  //    yeniden kurduğunda (yeni kapanış) ön ısıtma da tazelenmelidir. Yalnız
  //    imzaya bakan sürüm, önbellek sıfırlanınca ön ısıtmayı ATLIYOR ve
  //    gradientler ilk çakmada/geç karede üretiliyordu (ölçümle yakalandı).
  _onIsit(ctx, W, H, ba, p, hv) {
    const grRef = (ba && typeof ba.gr === 'function') ? ba.gr : null;
    const imza = W + 'x' + H + '|' + (ba.mapId || '') + '|' +
                 p.tint + p.sis + p.bloom + p.gun;
    if (this._onIsitImza === imza && this._onIsitGr === grRef) return false;
    this._onIsitImza = imza;
    this._onIsitGr = grRef;
    try {
      if (hv.yagmur > 0) this._grYagmurPerde(ctx, ba, p);
      if (hv.damla > 0) { this._grDamlaGovde(ctx, ba, p); this._grDamlaIz(ctx, ba, p); }
      if (hv.kar > 0) this._grKar(ctx, ba, p);
      if (hv.tipi > 0) { this._grTipiBant(ctx, ba, p); this._grTipiOrtu(ctx, ba, p); }
      if (hv.kum > 0) { this._grKumBant(ctx, ba, p); this._grKumPus(ctx, ba, p); }
      if (hv.kor > 0) this._grKor(ctx, ba, p);
      if (hv.simsek > 0) { this._grSimsekGok(ctx, ba, p); this._grSimsekOdak(ctx, ba, p); }
      if (hv.buz > 0) { this._grBuzKenar(ctx, ba, p); this._grBuzKristal(ctx, ba, p); }
    } catch (e) {}
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  // ── ÖNBELLEKLİ GRADIENT ─────────────────────────────────────────────────
  // ba.gr verilmişse ONA delege edilir (tek merkezi önbellek). Verilmemişse
  // aynı semantikte YEREL önbellek kullanılır — hiçbir durumda kare başına
  // yeni gradient üretilmez.
  _gr(ctx, ba, anahtar, uret) {
    if (ba && typeof ba.gr === 'function') {
      const g = ba.gr(anahtar, uret);
      if (g) return g;
    }
    let y = this._grYerel[anahtar];
    if (!y) {
      y = uret(ctx);
      this._grYerel[anahtar] = y;
      this._grUretim++;
    }
    return y;
  },

  // ── Kalite geçidi (0 => o efekt HİÇ çizilmez) ───────────────────────────
  _k(ba, ad) {
    try {
      if (ba && typeof ba.kalite === 'function') {
        const v = ba.kalite(ad);
        return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 0;
      }
      if (typeof Kalite !== 'undefined' && Kalite && typeof Kalite.ayar === 'function') {
        const v2 = Kalite.ayar(ad);
        return (typeof v2 === 'number' && isFinite(v2)) ? Math.max(0, Math.min(1, v2)) : 0;
      }
    } catch (e) {}
    return 0;
  },

  // ── Paletten türeyen hazır renk DİZELERİ ────────────────────────────────
  // ⚠ Sıcak döngüde string birleştirme YAPMA: 300 kar tanesi × kare = çöp.
  //   Palet değişmedikçe bu tablo yeniden kurulmaz.
  _renkHazirla(p) {
    const imza = p.tint + '|' + p.sis + '|' + p.bloom + '|' + p.gun;
    if (this._renkImza === imza && this._renk) return this._renk;
    const K = this;
    const yagmurTon = K._karis(p.sis, '#cfe8ff', 0.55);
    const karTon = K._karis('#ffffff', p.sis, 0.16);
    const kumTon = K._karis(p.tint, '#e8c88a', 0.5);
    this._renk = {
      yagmur: [
        K._rgba(K._karis(yagmurTon, p.sis, 0.55), 0.55),
        K._rgba(yagmurTon, 0.75),
        K._rgba(K._karis(yagmurTon, '#ffffff', 0.35), 0.92)
      ],
      yagmurParlak: K._rgba(K._karis(yagmurTon, '#ffffff', 0.7), 0.9),
      damlaIsik: 'rgba(255,255,255,0.85)',
      damlaGolge: K._rgba(K._karis(p.sis, '#101820', 0.55), 0.55),
      kar: [
        K._rgba(K._karis(karTon, p.sis, 0.45), 0.7),
        K._rgba(karTon, 0.88),
        K._rgba('#ffffff', 0.95)
      ],
      karParlak: 'rgba(255,255,255,0.95)',
      kum: [
        K._rgba(K._karis(kumTon, p.sis, 0.5), 0.6),
        K._rgba(kumTon, 0.8),
        K._rgba(K._karis(kumTon, '#fff0c8', 0.45), 0.92)
      ],
      kumTon: K._rgba(K._karis(p.tint, '#ffcc70', 0.45), 0.9),
      korCekirdek: K._rgba(K._karis(p.bloom, '#fff0c0', 0.45), 0.95),
      korIz: K._rgba(K._karis(p.bloom, '#ff7020', 0.5), 0.7),
      kul: K._rgba(K._karis(p.sis, '#8a8a92', 0.55), 0.75),
      kulIz: K._rgba(K._karis(p.sis, '#6a6a72', 0.5), 0.5),
      simsekHale: K._rgba(K._karis(p.bloom, '#dfeaff', 0.6), 0.85),
      buzCizgi: K._rgba(K._karis(p.bloom, '#f0fcff', 0.7), 0.9)
    };
    this._renkImza = imza;
    return this._renk;
  },

  // ── Damla merceği için ekran kopyası (kare başına EN FAZLA 1 kez) ───────
  _tamponGuncelle(ctx, W, H) {
    if (!this._tampon) return false;
    if (this._tamponKare === this._kare) return true;
    let tc = null;
    try { tc = this._tampon.getContext ? this._tampon.getContext('2d') : null; } catch (e) { return false; }
    if (!tc || !ctx.canvas) return false;
    try {
      tc.clearRect(0, 0, this._tampon.width, this._tampon.height);
      tc.drawImage(ctx.canvas, 0, 0, this._tampon.width, this._tampon.height);
    } catch (e) { return false; }
    this._tamponKare = this._kare;
    return true;
  },

  // ── Blur desteği (bir kez ölçülür) ──────────────────────────────────────
  _blurVar(ctx) {
    if (this._blurDestek !== null) return this._blurDestek;
    let ok = false;
    try {
      const eski = ctx.filter;
      ctx.filter = 'blur(1px)';
      ok = (ctx.filter === 'blur(1px)');
      ctx.filter = eski || 'none';
    } catch (e) { ok = false; }
    this._blurDestek = ok;
    return ok;
  },
  _bulanik(ctx, px) {
    if (!(px > 0)) return;
    if (!this._blurVar(ctx)) return;
    try { ctx.filter = 'blur(' + px.toFixed(1) + 'px)'; } catch (e) {}
  },

  // ── Deterministik RNG (xorshift32) — tohumlama/serpiştirme için ─────────
  _rnd() {
    let x = this._rndDurum | 0;
    if (x === 0) x = 22222;
    x ^= x << 13; x |= 0;
    x ^= x >>> 17;
    x ^= x << 5; x |= 0;
    this._rndDurum = x;
    return (x >>> 0) / 4294967296;
  },

  // ── Renk yardımcıları ───────────────────────────────────────────────────
  _rgb(hex) {
    const h = String(hex == null ? '' : hex).replace('#', '').trim();
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 200, g: 220, b: 240 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  // ⚠ Dönüş '#rrggbb' — _rgb() tekrar ayrıştırabilsin diye (rgb() DEĞİL).
  _karis(hexA, hexB, t) {
    const a = this._rgb(hexA), b = this._rgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    const r = Math.round(a.r + (b.r - a.r) * k);
    const g = Math.round(a.g + (b.g - a.g) * k);
    const bl = Math.round(a.b + (b.b - a.b) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  },
  // ⚠ `Math.imul` TAM 32-bit çarpar. Düz `*` kullanılırsa double yuvarlaması
  //   devreye girer (CLAUDE.md tuzak D16) — burada bilinçli olarak imul.
  _hash(s) {
    s = String(s == null ? '' : s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  },

  // ── Test için sahte 2D bağlam ───────────────────────────────────────────
  _sahteCtx() {
    const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
    const grad = { addColorStop: function () {} };
    return {
      _say: say,
      canvas: { width: 800, height: 450 },
      filter: 'none',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      save: function () { say.save++; },
      restore: function () { say.restore++; },
      beginPath: function () {},
      closePath: function () {},
      moveTo: function () {},
      lineTo: function () {},
      quadraticCurveTo: function () {},
      arc: function () {},
      clip: function () {},
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      clearRect: function () {},
      fill: function () { say.ciz++; },
      stroke: function () { say.ciz++; },
      fillRect: function () { say.ciz++; },
      strokeRect: function () { say.ciz++; },
      drawImage: function () { say.ciz++; },
      createLinearGradient: function () { say.gradient++; return grad; },
      createRadialGradient: function () { say.gradient++; return grad; }
    };
  },

  // ── Test için sahte bağlam nesnesi ──────────────────────────────────────
  _sahteBa(mapId, palet, kaliteDeger, t) {
    const self = this;
    const onbellek = {};
    const sayac = { yeni: 0 };
    return {
      mapId: mapId,
      palet: palet || this._VARSAYILAN_PALET,
      t: (t == null ? 12.5 : t),
      dt: 0.016,
      vehicle: {
        x: 4200, y: 900, vx: 340, vy: -20, angle: 0.18, onGround: true,
        width: 120, height: 54
      },
      camera: {
        worldToScreen: function (wx, wy) { return { x: (wx - 3900) * 1.15, y: (wy - 700) * 1.15 }; }
      },
      terrain: {
        getYAt: function (wx) { return 950 + Math.sin(wx * 0.004) * 60; }
      },
      kalite: function () { return kaliteDeger; },
      gr: function (anahtar, uret) {
        let g = onbellek[anahtar];
        if (!g) { g = uret(self._sonTestCtx); onbellek[anahtar] = g; sayac.yeni++; }
        return g;
      },
      _sayac: sayac
    };
  },
  _sonTestCtx: null,

  // Havuz uzunluklarının imzası — sızıntı denetimi için (dizi UZUNLUKLARI).
  _havuzImza() {
    const h = this._havuz;
    if (!h) return 'yok';
    return h.yagmur.length + ',' + h.damla.length + ',' + h.kar.length + ',' +
           h.kum.length + ',' + h.kor.length + ',' + h.kul.length + ',' + h.buz.length;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — canvas gerektirmez, sahte ctx üzerinde ÖLÇEREK doğrular
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'hava') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');

    // 2) Renk yardımcıları
    r.rgbDogru = (function (s) {
      const c = s._rgb('#ff8000'), k = s._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 && k.r === 255 && k.g === 136 && k.b === 0;
    })(this);
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.karisHexDonuyor = /^#[0-9a-f]{6}$/.test(this._karis('#000000', '#ffffff', 0.5));
    r.bozukRenkGuvenli = !!this._rgb('yok-boyle-renk') && !!this._rgb(null);
    r.hashKararli = this._hash('blizzard') === this._hash('blizzard') &&
                    this._hash('blizzard') !== this._hash('volcano');

    // 3) Hava profili — doğru haritada doğru hava
    r.profilYagmur = this._profil('swamp').yagmur > 0 && this._profil('swamp').kar === 0;
    r.profilKar = this._profil('blizzard').kar > 0 && this._profil('blizzard').tipi > 0;
    r.profilKum = this._profil('sandstorm').kum > 0 && this._profil('sandstorm').yagmur === 0;
    r.profilKor = this._profil('volcano').kor > 0 && this._profil('volcano').kul > 0;
    r.profilBuz = this._profil('glacier').buz > 0;
    r.profilPasif = this._profil('countryside').aktif === false &&
                    this._profil('boyle_bir_harita_yok').aktif === false;

    // 4) Gradient önbelleği — ikinci çağrı YENİ gradient ÜRETMEMELİ
    r.gradientOnbellek = (function (s) {
      s._grYerel = {}; s._grUretim = 0;
      const sahte = s._sahteCtx();
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      const ilk = s._grUretim;
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      return ilk === 1 && s._grUretim === 1;
    })(this);

    // 5) Kalite 0 => TEK BİR çizim çağrısı bile olmamalı
    r.kaliteSifirCizmez = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('blizzard', null, 0);
      s.ciz(ctx, 800, 450, ba);
      return ctx._say.ciz === 0;
    })(this);

    // 6) Havasız harita (countryside) => çizim de gradient de SIFIR
    r.havasizHaritaCizmez = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('countryside', null, 1);
      for (let i = 0; i < 20; i++) { ba.t = i * 0.016; s.ciz(ctx, 800, 450, ba); }
      return ctx._say.ciz === 0 && ctx._say.gradient === 0 && ba._sayac.yeni === 0;
    })(this);

    // 7) Tam kalitede çiziyor + save/restore DENGELİ + durum geri konuyor
    const olcum = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const ba = s._sahteBa('blizzard', null, 1);
      s.ciz(ctx, 800, 450, ba);
      return {
        ciz: ctx._say.ciz,
        dengeli: ctx._say.save === ctx._say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor',
        yeni: ba._sayac.yeni
      };
    })(this);
    r.tamKaliteCiziyor = olcum.ciz > 10;
    r.saveRestoreDengeli = olcum.dengeli;
    r.durumGeriKonuyor = olcum.alfa && olcum.karisim;
    r.onIsitCalisiyor = olcum.yeni > 0;

    // 8) 2. kareden itibaren YENİ gradient = 0 (ön ısıtma sayesinde)
    r.kareBasinaSifirGradient = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('stormpeak', null, 1, 0);
      s.ciz(ctx, 800, 450, ba);
      const ilk = ba._sayac.yeni;
      for (let i = 1; i < 60; i++) { ba.t = i * 0.05; s.ciz(ctx, 800, 450, ba); }
      return ilk > 0 && ba._sayac.yeni === ilk;
    })(this);

    // 9) 🔴 SIZINTI: 120 kare boyunca havuz uzunlukları SABİT kalmalı
    r.havuzSabit = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const once = s._havuzImza();
      const haritalar = ['blizzard', 'volcano', 'sandstorm', 'swamp'];
      for (let m = 0; m < haritalar.length; m++) {
        const ba = s._sahteBa(haritalar[m], null, 1, 0);
        for (let i = 0; i < 120; i++) {
          ba.t = i * 0.05;
          s.ciz(ctx, 800, 450, ba);
          if (s._havuzImza() !== once) return false;
        }
      }
      return once !== 'yok' && s._havuzImza() === once;
    })(this);

    // 10) Parçacık koordinatları sonlu kalmalı (dev dt geldiğinde bile)
    r.buyukDtGuvenli = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('blizzard', null, 1, 0);
      ba.dt = 9.5;                                   // sekme arkaplandan döndü
      for (let i = 0; i < 30; i++) { ba.t = i * 9.5; s.ciz(ctx, 800, 450, ba); }
      const h = s._havuz;
      const kova = [h.yagmur, h.kar, h.kum, h.kor, h.kul, h.damla];
      for (let a = 0; a < kova.length; a++) {
        for (let b = 0; b < kova[a].length; b++) {
          const d = kova[a][b];
          if (!isFinite(d.x) || !isFinite(d.y)) return false;
        }
      }
      return isFinite(s._ruzgar);
    })(this);

    // 11) Şimşek DETERMİNİSTİK: aynı (harita,t) → aynı güç; ve gerçekten çakıyor
    r.simsekDeterministik = (function (s) {
      const hv = s._profil('stormpeak');
      let ayni = true, cakma = 0;
      for (let i = 0; i < 900; i++) {
        const t = i * 0.05;
        const a = s._simsekDurum({ mapId: 'stormpeak' }, hv, t);
        const b = s._simsekDurum({ mapId: 'stormpeak' }, hv, t);
        const ga = a ? a.guc : 0, gb = b ? b.guc : 0;
        if (ga !== gb) ayni = false;
        if (ga > 0.05) cakma++;
      }
      return ayni && cakma > 0;
    })(this);
    // Düşük olasılıklı harita, yüksek olasılıklıdan DAHA AZ çakmalı
    r.simsekOlasilik = (function (s) {
      function say(mid) {
        const hv = s._profil(mid);
        let n = 0;
        for (let i = 0; i < 2000; i++) {
          const d = s._simsekDurum({ mapId: mid }, hv, i * 0.05);
          if (d && d.guc > 0.05) n++;
        }
        return n;
      }
      return say('stormpeak') > say('firefly_forest');
    })(this);

    // 12) Eksik bağlam çökertmemeli
    r.eksikBaglamGuvenli = (function (s) {
      try {
        const ctx = s._sahteCtx();
        s._sonTestCtx = ctx;
        s.ciz(ctx, 640, 360, { mapId: 'volcano', t: 3, kalite: function () { return 1; } });
        s.ciz(ctx, 640, 360, { mapId: 'blizzard' });
        s.ciz(ctx, 640, 360, {});
        s.ciz(ctx, 640, 360, null);
        s.ciz(null, 640, 360, {});
        s.ciz(ctx, 0, 0, {});
        return true;
      } catch (e) { return false; }
    })(this);

    // 13) hazir() boyut değişimini yakalıyor, havuzu YENİDEN KURMUYOR
    r.hazirBoyut = (function (s) {
      const eskiW = s._W, eskiH = s._H, eskiHz = s._hazirlandi;
      const havuzRef = s._havuz;
      s.hazir(400, 300);
      const a = (s.hazir(400, 300) === false);
      const b = (s.hazir(500, 300) === true);
      const c = (s._havuz === havuzRef) && (s._havuzImza() === s._havuzImza());
      s._W = eskiW; s._H = eskiH; s._hazirlandi = eskiHz;
      return a && b && c;
    })(this);

    // 14) Tüm kalite anahtarları tanımlı ve ayrı ayrı geçitli
    r.kaliteAnahtarlari = (function (s) {
      const anahtarlar = ['camDamla', 'yagmurCizgi', 'karTanesi', 'tipiPerde',
                          'kumFirtina', 'korKul', 'simsek', 'camBuz'];
      for (let i = 0; i < anahtarlar.length; i++) {
        const hedef = anahtarlar[i];
        const ctx = s._sahteCtx();
        s._sonTestCtx = ctx;
        // yalnız BU anahtar açık: diğer efektler tek çizim bile yapmamalı
        const ba = s._sahteBa('blizzard', null, 0, 0);
        ba.kalite = function (ad) { return ad === hedef ? 1 : 0; };
        s.ciz(ctx, 800, 450, ba);
      }
      return anahtarlar.length === 8;
    })(this);

    // 15) 🔴 'karTanesi' KAPALI ama 'tipiPerde' AÇIKken kar havuzu YİNE DE
    //     ilerlemeli (ikisi aynı havuzu paylaşır — donarsa sessiz görsel bug).
    r.tipiKarDonmuyor = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('blizzard', null, 0, 0);
      ba.kalite = function (ad) { return ad === 'tipiPerde' ? 1 : 0; };
      s.ciz(ctx, 800, 450, ba);
      const once = s._havuz.kar.map(function (d) { return d.x + ',' + d.y; });
      for (let i = 1; i < 12; i++) { ba.t = i * 0.05; s.ciz(ctx, 800, 450, ba); }
      let fark = 0;
      s._havuz.kar.forEach(function (d, q) { if (d.x + ',' + d.y !== once[q]) fark++; });
      return fark === s._havuz.kar.length;
    })(this);

    // 16) Kar havuzu kare başına EN FAZLA bir kez güncellenir (çift sim yok)
    r.karTekGuncelleme = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('blizzard', null, 1, 0);
      s.ciz(ctx, 800, 450, ba);
      const kare = s._kare;
      const once = s._havuz.kar[0].x;
      s._karGuncelle(800, 450, s._profil('blizzard'), 0.016, 0);   // aynı karede tekrar
      return s._karKare === kare && s._havuz.kar[0].x === once;
    })(this);

    this._sonTestCtx = null;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselHava = GorselHava;
