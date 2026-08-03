'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-YANSIMA — Yansıma + su yüzeyi son-işlem katmanı (30 Tmz)
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında yansıma simülasyonu
// uygular. `gorsel.js` (renk/bloom) ve `gorsel-isik.js` (ışık/gölge) kardeşi.
// Çizim koduna HİÇ DOKUNMAZ.
//
// EFEKTLER (her biri AYRI kalite anahtarıyla geçitli):
//   · ekranYansima — ekran-uzayı yansıma (SSR taklidi): zemin çizgisinin
//                    altına, üst yarının dikey aynalanmış + bulanık kopyası;
//                    mesafeyle KARESEL sönümlenen, dalgalı kenarlı şeritler.
//   · islakZemin   — ıslak asfalt: ıslaklık filmi + ayna lekesi + ışık
//                    kaynaklarının UZUN DİKEY yansıma çizgileri.
//                    (gorsel.js `_islakZemin`'in geliştirilmiş hâli — bkz. §A)
//   · sudalga      — su/bataklık haritalarında yüzey dalgası: sinüs kaydırmalı
//                    yatay şeritler + parıltı + derinlik kostiği.
//   · birikinti    — yolda su gölcükleri; araç geçince genişleyen halka
//                    dalgası (SABİT HAVUZ, en fazla 12 halka).
//   · buzYansima   — buz/kar haritalarında KESKİN, soğuk, yüksek kontrastlı
//                    yansıma + kristal kıvılcımları.
//   · yansimaRenk  — yansımanın palet rengiyle tonlanması (nötr değil, biyom
//                    rengini alır). İki katman: AYNA TAMPONU içinde tonlama
//                    (ekran alfası HARCAMAZ) + ekranda ince derinlik geçişi.
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bu dosya HİÇBİR bare global'e güvenmez (Game/Terrain/Camera `window`'da
// DEĞİL — CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle · ba.camera
//   ba.terrain · ba.t · ba.dt · ba.kalite(ad) · ba.gr(anahtar, uretici)
//
// ═══ 🔴 SERT KURALLAR (hepsi selfTest ile ÖLÇÜLEREK doğrulanır) ═══════════
//  1. Gradient üretimi YALNIZ `ba.gr(...)` içinden (`this._gr` ona delege eder).
//     Konumu değişen efektler BİRİM UZAYDA (0..1) üretilmiş gradient +
//     translate/scale ile çizilir → kare başına YENİ gradient = 0.
//  2. `getImageData` / `putImageData` YOK. Yumuşaklık `ctx.filter='blur()'`
//     ile (GPU) yapılır; destek yoksa katmanlı çizimle taklit edilir.
//  3. Her efekt `ba.kalite('...')` geçitli; 0 dönerse TEK BİR çizim çağrısı
//     bile yapılmaz.
//  4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
//  5. globalAlpha / globalCompositeOperation / transform GERİ KONUR.
//  6. `ctx.drawImage(ctx.canvas, ...)` (kendi üstüne çizim) PAHALIDIR.
//     ▶ Sahne kare başına BİR KEZ `_tampon`a kopyalanır, altı efekt de
//       ORADAN çalışır. selfTest `kendiKopya === 0` diye ölçer.
//
// ═══ §A — ALFA BÜTÇESİ (kullanıcı kısıtı) ═════════════════════════════════
// 🔴 Bu projede yansıma alfası 0.16'da sahneyi BASTIRDI, 0.07'ye düşürüldü
//    (gorsel.js `_islakZemin`, canlı ekran görüntüsü kanıtı).
//    ▶ Kural: ALTI efektin katman-başına en büyük alfası TOPLAMDA 0.12'yi
//      geçemez. `_ALFA` tablosu toplamı **0.118**.
//    ▶ Her alfa ataması `_ca(ctx, ad, deger)` üzerinden yapılır; bu fonksiyon
//      tavanı ASLA aşmaz (kelepçeler). selfTest çizim sırasında gerçekten
//      kullanılan en büyük alfayı efekt efekt ÖLÇER ve tavanla kıyaslar.
//    ▶ Görsel ağırlık alfadan değil; `lighter` karışımı, şerit sayısı, dalga
//      genliği, parıltı yoğunluğu ve tampon içi tonlamadan gelir.
// ═══════════════════════════════════════════════════════════════════════════
const GorselYansima = {
  ad: 'yansima',

  // ── ALFA BÜTÇESİ ─────────────────────────────────────────────────────────
  // ⚠ Bu tabloyu büyütürsen selfTest `alfaButcesi` KALDI verir. Bilerek sıkı.
  ALFA_BUTCE: 0.12,
  _ALFA: {
    ekranYansima: 0.038,
    islakZemin:   0.020,
    sudalga:      0.020,
    birikinti:    0.012,
    buzYansima:   0.012,
    yansimaRenk:  0.016
  },                                   // toplam = 0.118 ≤ 0.12

  // ── Halka (birikinti dalgası) havuzu — SABİT, büyümez ────────────────────
  HALKA_MAX: 12,

  // ── SULU HARİTALAR (0..1 = su yüzeyinin baskınlığı) ──────────────────────
  // ⚠ `rowboat` bir ARAÇ kimliğidir, harita değil; görev tanımında geçtiği
  //   için tolerans olarak duruyor (eşleşmezse etkisi yok).
  SU: {
    underwater: 1.00, swamp: 0.90, beach: 0.72, desert_oasis: 0.82, rowboat: 0.75,
    lava_river: 0.60, toxic: 0.62, jungle: 0.42, bamboo: 0.38, cave: 0.34,
    crystal_cave: 0.36, mushroom: 0.30, firefly_forest: 0.34, junkyard: 0.24,
    cloud_kingdom: 0.28, aurora_peak: 0.26
  },

  // ── BUZLU HARİTALAR ──────────────────────────────────────────────────────
  BUZ: {
    winter: 0.85, arctic: 1.00, glacier: 1.00, blizzard: 0.80,
    moon: 0.34, stormpeak: 0.46, crystal_cave: 0.55, crystal_forest: 0.62
  },

  // ── ZEMİN ISLAKLIĞI (yansıtıcılık) — listede yoksa taban 0.45 ────────────
  ISLAK: {
    city: 1.00, otoyol: 1.00, neon_city: 1.00, cyberpunk_roofs: 1.00,
    cyber_grid: 0.92, rollercoaster: 0.80, hotwheels: 0.78, construction: 0.66,
    underwater: 0.95, swamp: 0.88, beach: 0.70, glacier: 0.92, arctic: 0.90,
    winter: 0.80, blizzard: 0.74, crystal_cave: 0.86, crystal_forest: 0.80,
    rainbow_road: 0.95, skyland: 0.72, cloud_kingdom: 0.68, lava_river: 0.74,
    volcano: 0.58, mars: 0.22, desert: 0.16, sandstorm: 0.12, wasteland: 0.20,
    canyon: 0.24, savanna: 0.22, moon: 0.30, graveyard: 0.62, carnival: 0.76,
    candy: 0.70, toxic: 0.84, mushroom: 0.60, meteor_field: 0.52
  },
  ISLAK_TABAN: 0.45,

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // ── İÇ DURUM (kare başına ÇÖP ÜRETMEZ — hepsi önceden ayrılır) ───────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _tampon: null,          // yarım çözünürlük, KESKİN ayna kaynağı
  _tampon2: null,         // çeyrek çözünürlük, BULANIK ayna kaynağı
  _tamponGecerli: false,
  _kareNo: 0,
  _grYerel: {},           // ba.gr verilmediyse kullanılan yedek önbellek
  _grUretim: 0,
  _blurDestek: null,
  _olcumEfekt: '',        // hangi efekt çiziyor (selfTest alfa ölçümü için)
  _halkalar: [],          // sabit havuz (HALKA_MAX)
  _halkaYaz: 0,
  _sonSicrama: -999,
  _sonYerY: 0,
  _yerYVar: false,
  _nk: [],                // arazi siluetinin ekran noktaları (önceden ayrılmış)
  _nkSayi: 0,
  _kaynak: [],            // ışık kaynakları (önceden ayrılmış)
  _kaynakSayi: 0,
  _or: null,              // kare bağlamı (yeniden kullanılan tek nesne)
  _yansimaCizildi: false,
  _sonTestCtx: null,

  // ═════════════════════════════════════════════════════════════════════════
  // KURULUM
  // ═════════════════════════════════════════════════════════════════════════
  hazir(W, H) {
    W = Math.max(1, Math.round(W || 0));
    H = Math.max(1, Math.round(H || 0));
    this._havuzKur();
    if (this._hazirlandi && this._W === W && this._H === H) return false;
    this._W = W;
    this._H = H;
    this._hazirlandi = true;
    // Ekran uzayı gradientleri boyuta bağlı olabilir → yedek önbelleği boşalt.
    this._grYerel = {};
    this._grUretim = 0;
    this._blurDestek = null;
    this._sonYerY = H * 0.72;
    this._yerYVar = false;
    this._tamponGecerli = false;
    this._sonSicrama = -999;
    for (let i = 0; i < this._halkalar.length; i++) this._halkalar[i].aktif = false;
    // Ayna tamponları: keskin (1/2) + bulanık (1/4). İkisi de kare başına
    // BİR KEZ doldurulur; altı efekt de bunlardan okur (kural 6).
    this._tampon = this._kanvas(Math.max(16, Math.round(W / 2)), Math.max(16, Math.round(H / 2)), this._tampon);
    this._tampon2 = this._kanvas(Math.max(8, Math.round(W / 4)), Math.max(8, Math.round(H / 4)), this._tampon2);
    return true;
  },

  _kanvas(w, h, eski) {
    if (eski && eski.width === w && eski.height === h) return eski;
    try {
      if (typeof document === 'undefined' || !document.createElement) return null;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      if (typeof c.getContext !== 'function') return null;
      return c;
    } catch (e) { return null; }
  },

  // ⚠ Havuz BİR KEZ kurulur ve ASLA büyümez. Halka üretimi round-robin ile
  //   en eskisini ezer — `push` YOK, dolayısıyla sızıntı da yok
  //   (CLAUDE.md §"iki sınırsız büyüyen dizi" dersi).
  _havuzKur() {
    if (this._halkalar.length === this.HALKA_MAX &&
        this._nk.length === 33 && this._kaynak.length === 8 && this._or) return;
    this._halkalar.length = 0;
    for (let i = 0; i < this.HALKA_MAX; i++) {
      this._halkalar.push({ aktif: false, x: 0, y: 0, t: 0, omur: 1, guc: 0, r0: 8, dunya: false });
    }
    this._halkaYaz = 0;
    this._nk.length = 0;
    for (let i = 0; i < 33; i++) this._nk.push({ x: 0, y: 0 });
    this._kaynak.length = 0;
    for (let i = 0; i < 8; i++) this._kaynak.push({ x: 0, y: 0, g: 1, r: '#ffffff', gen: 6 });
    this._or = {
      mid: '', t: 0, dt: 0.016, d: null, nk: 0, yerY: 0,
      su: 0, buz: 0, islak: 0, aynaGerek: false,
      kEkran: 0, kIslak: 0, kSu: 0, kBirikinti: 0, kBuz: 0, kRenk: 0
    };
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
    this._havuzKur();
    this._kareNo++;
    this._yansimaCizildi = false;
    this._olcumEfekt = '';

    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;
    const or = this._ortam(W, H, ba, p);

    // 🔴 Ayna tamponu SAHNE HENÜZ TEMİZKEN alınır. Bir efekt çizdikten sonra
    //    kopyalasaydık yansıma kendi kendini yansıtır (geri besleme) olurdu.
    this._tamponGecerli = false;
    if (or.aynaGerek) {
      try { this._tamponAl(ctx, W, H, ba, p, or); } catch (e) { this._tamponGecerli = false; }
    }

    try { this._ekranYansima(ctx, W, H, ba, p, or); } catch (e) {}
    try { this._islakZemin(ctx, W, H, ba, p, or); } catch (e) {}
    try { this._suDalga(ctx, W, H, ba, p, or); } catch (e) {}
    try { this._birikinti(ctx, W, H, ba, p, or); } catch (e) {}
    try { this._buzYansima(ctx, W, H, ba, p, or); } catch (e) {}
    try { this._yansimaRenk(ctx, W, H, ba, p, or); } catch (e) {}

    // Kural 5: durumu her hâlükârda geri koy (bir efekt yarıda patlasa bile).
    this._olcumEfekt = '';
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    try { ctx.filter = 'none'; } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KARE BAĞLAMI — bir kez hesaplanır, altı efekt paylaşır
  // ═════════════════════════════════════════════════════════════════════════
  _ortam(W, H, ba, p) {
    const or = this._or;
    or.mid = ba.mapId || '';
    or.t = (typeof ba.t === 'number' && isFinite(ba.t)) ? ba.t : 0;
    // ⚠ Sekme arkaya alınıp geri gelince dt DEVASA olur; halka ömrü tek karede
    //   biter ve dalga hiç görünmez. Kelepçele.
    let dt = (typeof ba.dt === 'number' && isFinite(ba.dt)) ? ba.dt : 0.016;
    or.dt = Math.max(0, Math.min(0.1, dt));
    // 🔴 BUG (duman testi yakaladı): `ba.t` YENİ KOŞUDA SIFIRLANIR. Geri sarma
    //    yakalanmazsa `_sonSicrama` gelecekte kalır, `or.t - _sonSicrama > 0.11`
    //    bir daha ASLA doğru olmaz ve birikinti halkası oturumun geri kalanında
    //    hiç tetiklenmez. Kodu okuyarak değil, ÖLÇEREK bulundu (aktif halka = 0).
    if (or.t < this._sonSicrama) this._sonSicrama = or.t - 1;

    or.d = this._donusum(ba);
    or.nk = this._zeminNoktalari(ba, W, or.d);

    // Zemin çizgisi = arazi siluetinin ekran ortalaması (yoksa H*0.72).
    let yerY = H * 0.72;
    if (or.nk > 1) {
      let s = 0;
      for (let i = 0; i < or.nk; i++) s += this._nk[i].y;
      yerY = s / or.nk;
    }
    yerY = Math.max(H * 0.16, Math.min(H * 0.95, yerY));
    // Yumuşat: zıplarken yansıma ekseni titremesin.
    this._sonYerY = this._yerYVar ? (this._sonYerY * 0.84 + yerY * 0.16) : yerY;
    this._yerYVar = true;
    or.yerY = this._sonYerY;

    or.su = this.SU[or.mid] || 0;
    or.buz = this.BUZ[or.mid] || 0;
    or.islak = (this.ISLAK[or.mid] === undefined) ? this.ISLAK_TABAN : this.ISLAK[or.mid];
    // Su/buz zemini zaten yansıtıcıdır — ıslaklığı yükselt.
    or.islak = Math.max(0, Math.min(1, or.islak + or.su * 0.25 + or.buz * 0.20));

    or.kEkran = this._k(ba, 'ekranYansima');
    or.kIslak = this._k(ba, 'islakZemin');
    or.kSu = this._k(ba, 'sudalga');
    or.kBirikinti = this._k(ba, 'birikinti');
    or.kBuz = this._k(ba, 'buzYansima');
    or.kRenk = this._k(ba, 'yansimaRenk');

    or.aynaGerek = (or.kEkran > 0) ||
                   (or.kIslak > 0 && or.islak > 0) ||
                   (or.kBirikinti > 0) ||
                   (or.kBuz > 0 && or.buz > 0);
    return or;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // AYNA TAMPONU — sahne KARE BAŞINA BİR KEZ kopyalanır (kural 6)
  // ⚠ `ctx.drawImage(ctx.canvas, ...)` yapılmaz; kopya offscreen'e alınır ve
  //   altı efekt de ondan okur. Ayrıca yansıma burada TONLANIR (yansimaRenk'in
  //   birinci katmanı) — tampon içi tonlama EKRAN ALFASI HARCAMAZ.
  // ═════════════════════════════════════════════════════════════════════════
  _tamponAl(ctx, W, H, ba, p, or) {
    const cv = ctx.canvas;
    const a = this._tampon;
    if (!cv || !a) return;
    const ac = a.getContext('2d');
    if (!ac) return;

    if (ac.setTransform) ac.setTransform(1, 0, 0, 1, 0, 0);
    ac.globalAlpha = 1;
    ac.globalCompositeOperation = 'source-over';
    try { ac.filter = 'none'; } catch (e) {}
    ac.clearRect(0, 0, a.width, a.height);
    ac.drawImage(cv, 0, 0, a.width, a.height);          // ← tek sahne kopyası

    // yansimaRenk / 1. katman — yansıma NÖTR olmasın, biyom rengini alsın.
    if (or.kRenk > 0) {
      try { this._aynaTonla(ac, a.width, a.height, p, or); } catch (e) {}
    }

    // Bulanık kopya: yumuşak (uzak) yansıma katmanları bundan okur.
    const b = this._tampon2;
    if (b) {
      const bc = b.getContext('2d');
      if (bc) {
        if (bc.setTransform) bc.setTransform(1, 0, 0, 1, 0, 0);
        bc.globalAlpha = 1;
        bc.globalCompositeOperation = 'source-over';
        bc.clearRect(0, 0, b.width, b.height);
        if (this._blurVar(bc)) {
          try { bc.filter = 'blur(' + (1.4 + 2.6 * or.kEkran).toFixed(1) + 'px)'; } catch (e) {}
        }
        bc.drawImage(a, 0, 0, b.width, b.height);
        try { bc.filter = 'none'; } catch (e) {}
      }
    }
    this._tamponGecerli = true;
  },

  // Tampon içi tonlama — düz renk + karışım kipi. GRADIENT GEREKMEZ.
  _aynaTonla(ac, w, h, p, or) {
    const guc = Math.max(0, Math.min(1, or.kRenk));
    // a) biyom rengi (soft-light: parlaklığı korur, rengi taşır)
    ac.globalCompositeOperation = 'soft-light';
    ac.globalAlpha = 0.34 + 0.34 * guc;
    ac.fillStyle = p.tint || '#8fa8c0';
    ac.fillRect(0, 0, w, h);
    // b) buzda soğuk + sert, suda derin mavi-yeşil çekim
    if (or.buz > 0) {
      ac.globalCompositeOperation = 'overlay';
      ac.globalAlpha = 0.18 * guc * or.buz;
      ac.fillStyle = p.bloom || '#eafaff';
      ac.fillRect(0, 0, w, h);
    } else if (or.su > 0) {
      ac.globalCompositeOperation = 'multiply';
      ac.globalAlpha = 0.16 * guc * or.su;
      ac.fillStyle = p.sis || '#0e5a88';
      ac.fillRect(0, 0, w, h);
    }
    ac.globalCompositeOperation = 'source-over';
    ac.globalAlpha = 1;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) EKRAN-UZAYI YANSIMA (SSR taklidi)
  // Üst yarının dikey aynalanmış kopyası, zemin çizgisinin ALTINA, şerit şerit:
  //   · her şeridin alfası mesafeyle KARESEL sönümlenir
  //   · her şerit sinüs kaydırmalı → dalgalı/kırılan kenar
  //   · ilk iki şerit KESKİN tampondan, gerisi BULANIK tampondan okunur
  //   · arazi siluetiyle kırpılır → yansıma gökyüzüne taşmaz
  // ═════════════════════════════════════════════════════════════════════════
  _ekranYansima(ctx, W, H, ba, p, or) {
    const g = or.kEkran;
    if (g <= 0 || !this._tamponGecerli) return;
    this._olcumEfekt = 'ekranYansima';
    const yerY = or.yerY;
    const derin = Math.min(H - yerY, H * 0.46);
    if (derin < 10) return;

    const n = Math.max(5, Math.round(5 + 12 * g));
    const sh = derin / n;
    const dalga = (1.6 + 6.4 * g) * (0.55 + or.islak * 0.85);
    const keskin = this._tampon;
    const yumusak = this._tampon2 || this._tampon;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this._zeminKirp(ctx, W, H, or);
    for (let i = 0; i < n; i++) {
      const oran = i / n;
      const sonum = (1 - oran) * (1 - oran);            // karesel sönümleme
      const a = this._ALFA.ekranYansima * g * sonum * (0.45 + or.islak * 0.55);
      // PERF(31 Tmz): eşik 0,0012 → 1/255. Aradaki bant 8-bit tuvalde HİÇBİR
      // pikseli değiştiremiyor ama tam bir ayna dilimi `drawImage`'i ödüyordu
      // (ölçüldü: kare başına 2,8 görünmez tam-genişlik kopya).
      if (this._gz(a)) continue;

      const kes = (i < 2 && keskin) ? keskin : yumusak;
      if (!kes) break;
      const oy = kes.height / H;
      const ky0 = (yerY - (i + 1) * sh) * oy;
      const kyh = sh * oy;
      if (ky0 < 0 || kyh < 0.5) continue;

      // dalgalı kenar: iki farklı frekans, derinlikle genliği artan
      const kx = Math.sin(or.t * 1.35 + i * 0.62) * dalga * (0.22 + oran) +
                 Math.sin(or.t * 2.70 + i * 1.31) * dalga * 0.38 * oran;
      const ky = Math.sin(or.t * 0.95 + i * 0.81) * dalga * 0.16 * oran;
      // derinleştikçe yatayda hafif genişleme (kırılma hissi)
      const gen = W * (1 + oran * 0.035 * (0.4 + g));

      ctx.save();
      this._ca(ctx, 'ekranYansima', a);
      ctx.translate(kx - (gen - W) * 0.5, yerY + (i + 1) * sh + ky);
      ctx.scale(1, -1);
      ctx.drawImage(kes, 0, ky0, kes.width, kyh, 0, 0, gen, sh + 0.6);
      ctx.restore();
    }
    ctx.restore();
    this._yansimaCizildi = true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) ISLAK ZEMİN — gorsel.js `_islakZemin`'in GELİŞTİRİLMİŞ hâli
  //
  // ⚠ Eskisi: ham `ctx.drawImage(ctx.canvas, ...)` + tek alfa (0.07).
  //   Üç sorunu vardı: (a) kendi üstüne çizim pahalı (kural 6),
  //   (b) sönümleme yok → yansıma zeminin dibinde de tam güçte,
  //   (c) gökyüzünü de boyuyordu.
  //   Yenisi: tampondan okur · silüetle kırpılır · ıslaklık filmi + ışık
  //   kaynaklarının UZUN DİKEY yansıma çizgileri (asıl "ıslak asfalt" hissi).
  // ═════════════════════════════════════════════════════════════════════════
  _islakZemin(ctx, W, H, ba, p, or) {
    const g = or.kIslak;
    if (g <= 0 || or.islak <= 0) return;
    this._olcumEfekt = 'islakZemin';
    const yerY = or.yerY;
    const derin = Math.min(H - yerY, H * 0.42);
    if (derin < 8) return;
    const tavan = this._ALFA.islakZemin * g * or.islak;
    const self = this;

    ctx.save();
    this._zeminKirp(ctx, W, H, or);
    ctx.globalCompositeOperation = 'lighter';

    // a) ıslaklık filmi — zeminden aşağı sönümlenen ince parlaklık
    ctx.save();
    this._ca(ctx, 'islakZemin', tavan * 0.62);
    ctx.translate(0, yerY);
    ctx.scale(W, derin);
    ctx.fillStyle = this._gr(ctx, ba, 'yan-film|' + p.bloom + '|' + p.tint, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(p.bloom, 0.90));
      gr.addColorStop(0.24, self._rgba(p.bloom, 0.34));
      gr.addColorStop(0.62, self._rgba(p.tint, 0.12));
      gr.addColorStop(1, self._rgba(p.tint, 0));
      return gr;
    });
    ctx.fillRect(0, 0, 1, 1);
    ctx.restore();

    // b) ayna lekesi — dikeyde sıkıştırılmış, çok yumuşak sahne kopyası
    const yum = this._tampon2 || this._tampon;
    if (this._tamponGecerli && yum && g >= 0.30) {
      const kh = Math.min(yum.height, Math.max(1, (yerY * 0.55) * (yum.height / H)));
      const ky0 = (yerY * (yum.height / H)) - kh;
      if (ky0 >= 0 && kh > 1) {
        ctx.save();
        this._ca(ctx, 'islakZemin', tavan * 0.75);
        ctx.translate(Math.sin(or.t * 0.7) * 2.2, yerY + derin * 0.62);
        ctx.scale(1, -1);
        ctx.drawImage(yum, 0, ky0, yum.width, kh, 0, 0, W, derin * 0.62);
        ctx.restore();
      }
    }

    // c) IŞIK KAYNAKLARININ UZUN DİKEY YANSIMA ÇİZGİLERİ (ıslak asfaltın imzası)
    const say = this._isikKaynaklari(W, H, ba, or);
    for (let i = 0; i < say; i++) {
      const kk = this._kaynak[i];
      const boy = derin * (0.55 + 0.55 * kk.g) * (0.6 + or.islak * 0.6);
      if (boy < 4) continue;
      // ⚠ Gradient anahtarı KAYNAK RENGİNDEN türer; renkler palet+sabitlerden
      //   geldiği için anahtar kümesi kapalıdır (kare başına yeni üretim 0).
      const cekirdek = this._cizgiGr(ctx, ba, '#ffffff');
      const hale = this._cizgiGr(ctx, ba, kk.r);
      // Üç katman: dar+parlak çekirdek · orta · geniş hale. Hepsi tavan altı.
      for (let s = 0; s < 3; s++) {
        const av = tavan * (s === 0 ? 1.0 : (s === 1 ? 0.62 : 0.34));
        if (this._gz(av)) continue;                       // PERF: görünmez katman
        const genis = kk.gen * (0.55 + s * 1.75) * (1 + Math.sin(or.t * 2.1 + i * 1.7 + s) * 0.16);
        ctx.save();
        this._ca(ctx, 'islakZemin', av);
        // dikey çizgi tabanda hafif salınır (su filmi kırılması)
        ctx.translate(kk.x + Math.sin(or.t * 1.6 + i * 2.3) * (1.5 + s * 1.2), yerY);
        ctx.scale(Math.max(0.6, genis), boy);
        ctx.fillStyle = (s === 0) ? cekirdek : hale;
        ctx.fillRect(-0.5, 0, 1, 1);
        ctx.restore();
      }
    }
    ctx.restore();
    this._yansimaCizildi = true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) SU / BATAKLIK YÜZEY DALGASI
  // Sinüs kaydırmalı yatay şeritler (perspektifli seyrekleşme) + parıltı +
  // derinlik kostiği. Şerit gradienti BİRİM UZAYDA önbelleklenir.
  // ═════════════════════════════════════════════════════════════════════════
  _suDalga(ctx, W, H, ba, p, or) {
    const g = or.kSu;
    if (g <= 0 || or.su <= 0) return;
    this._olcumEfekt = 'sudalga';
    const tavan = this._ALFA.sudalga * g * or.su;
    // Su yüzeyi zemin çizgisinin biraz ÜSTÜNDEN başlar (kıyı hissi).
    const suY = Math.max(H * 0.08, Math.min(H * 0.90, or.yerY - H * 0.05));
    const derin = H - suY;
    if (derin < 12) return;
    const n = Math.max(6, Math.round(7 + 17 * g));
    const self = this;

    const seritGr = this._gr(ctx, ba, 'yan-serit|' + p.bloom, function (c) {
      const gr = c.createLinearGradient(0, 0, 1, 0);
      gr.addColorStop(0, self._rgba(p.bloom, 0));
      gr.addColorStop(0.18, self._rgba(p.bloom, 0.42));
      gr.addColorStop(0.42, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.60, self._rgba(p.bloom, 0.50));
      gr.addColorStop(0.84, self._rgba(p.bloom, 0.16));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // a) yatay dalga şeritleri
    for (let i = 0; i < n; i++) {
      const o = i / n;
      const y = suY + Math.pow(o, 1.45) * derin;           // perspektif
      const kal = Math.max(1, (0.55 + o * 3.4) * (H / 430) * (1 + g));
      const faz = or.t * (0.85 + o * 1.55) + i * 0.83;
      const kay = Math.sin(faz) * (5 + 40 * o) * (0.45 + g * 0.75);
      const uzun = W * (0.55 + 0.55 * o);
      const dalgalanma = 0.55 + 0.45 * Math.sin(faz * 1.7 + i);
      const av1 = tavan * (0.30 + 0.70 * Math.pow(1 - o, 0.65)) * dalgalanma;
      if (!this._gz(av1)) {                               // PERF: görünmez şerit
        ctx.save();
        this._ca(ctx, 'sudalga', av1);
        ctx.translate(((i * 137) % W) + kay - uzun * 0.5, y);
        ctx.scale(uzun, kal);
        ctx.fillStyle = seritGr;
        ctx.fillRect(0, -0.5, 1, 1);
        ctx.restore();
      }
      // ikinci, ters yönde ilerleyen şerit ailesi (girişim deseni)
      const av2 = tavan * 0.42 * Math.pow(1 - o, 0.8);
      if (g >= 0.5 && (i & 1) === 0 && !this._gz(av2)) {
        const kay2 = Math.sin(-faz * 0.78 + 2.1) * (7 + 34 * o);
        ctx.save();
        this._ca(ctx, 'sudalga', av2);
        ctx.translate(((i * 311) % W) + kay2 - uzun * 0.4, y + kal * 0.9);
        ctx.scale(uzun * 0.8, Math.max(1, kal * 0.6));
        ctx.fillStyle = seritGr;
        ctx.fillRect(0, -0.5, 1, 1);
        ctx.restore();
      }
    }

    // b) PARILTI — yüzeyde kırılan noktasal ışık (küçük ve parlak)
    const pn = Math.max(4, Math.round(8 + 26 * g));
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < pn; j++) {
      const r1 = this._ri(j * 7 + 11);
      const r2 = this._ri(j * 13 + 29);
      const o = r2 * r2;
      const y = suY + o * derin;
      const hiz = 22 + r1 * 60;
      const x = ((r1 * W + or.t * hiz * (r2 > 0.5 ? 1 : -1)) % (W + 60) + W + 60) % (W + 60) - 30;
      const cak = Math.sin(or.t * (3.1 + r1 * 5.5) + j * 2.2);
      if (cak <= 0.35) continue;
      const av3 = tavan * cak * (0.35 + 0.65 * (1 - o));
      if (this._gz(av3)) continue;                        // PERF: görünmez parıltı
      const bw2 = (1.5 + r2 * 5.5) * (1 + g);
      const bh2 = Math.max(1, (0.7 + o * 2.2) * (H / 430));
      ctx.save();
      this._ca(ctx, 'sudalga', av3);
      ctx.fillRect(x - bw2 * 0.5, y - bh2 * 0.5, bw2, bh2);
      ctx.restore();
    }

    // c) derinlik kostiği — su kütlesinin içten aydınlanması
    if (g >= 0.45) {
      ctx.save();
      this._ca(ctx, 'sudalga', tavan * 0.55);
      ctx.translate(W * 0.5 + Math.sin(or.t * 0.4) * W * 0.06, suY + derin * 0.35);
      ctx.scale(W * 0.72, derin * 0.85);
      ctx.fillStyle = this._gr(ctx, ba, 'yan-kostik|' + p.bloom + '|' + p.tint, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, self._rgba(p.bloom, 0.55));
        gr.addColorStop(0.42, self._rgba(p.tint, 0.22));
        gr.addColorStop(1, self._rgba(p.tint, 0));
        return gr;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    this._yansimaCizildi = true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) BİRİKİNTİ (su gölcüğü) + ARAÇ GEÇİŞ HALKASI
  // Gölcük konumları DÜNYA UZAYINDA, harita kimliğinden türeyen hash ile
  // üretilir (kayıt gerektirmez, her koşuda aynı yerde). Halkalar SABİT
  // HAVUZDAN gelir — en fazla HALKA_MAX (12), round-robin ile ezilir.
  // ═════════════════════════════════════════════════════════════════════════
  _birikinti(ctx, W, H, ba, p, or) {
    const g = or.kBirikinti;
    if (g <= 0) return;
    this._olcumEfekt = 'birikinti';
    const tavan = this._ALFA.birikinti * g;
    const d = or.d;
    const ter = (ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;
    const v = ba.vehicle;
    const self = this;

    const kenarGr = this._gr(ctx, ba, 'yan-golcuk|' + p.bloom + '|' + p.sis, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(p.sis, 0.10));
      gr.addColorStop(0.62, self._rgba(p.bloom, 0.30));
      gr.addColorStop(0.88, self._rgba(p.bloom, 0.85));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ── a) görünür gölcükler ────────────────────────────────────────────────
    if (d && ter) {
      const wx0 = d.dunyaX(-80);
      const wx1 = d.dunyaX(W + 80);
      if (isFinite(wx0) && isFinite(wx1) && wx1 > wx0 && (wx1 - wx0) < 200000) {
        const k0 = Math.floor(wx0 / 620) - 1;
        const k1 = Math.ceil(wx1 / 620) + 1;
        const olc = Math.abs(d.olcek);
        for (let k = k0; k <= k1 && k - k0 < 40; k++) {
          const bx = this._golcukX(or.mid, k);
          const br = this._golcukR(or.mid, k);
          if (bx < wx0 - br || bx > wx1 + br) continue;
          let by = ter.getYAt(bx);
          if (!isFinite(by)) continue;
          const s = d.ekran(bx, by);
          if (!s || !isFinite(s.x) || !isFinite(s.y)) continue;
          const rx = Math.max(3, br * olc);
          const ry = Math.max(1.5, rx * 0.20);
          this._golcukCiz(ctx, W, H, ba, p, or, s.x, s.y, rx, ry, tavan, kenarGr);
          // araç gölcükten geçti mi → halka
          if (v && typeof v.x === 'number' && v.onGround !== false &&
              Math.abs(v.x - bx) < br * 1.15 && (or.t - this._sonSicrama) > 0.11) {
            this._halkaEkle(bx, by, Math.min(1, Math.abs(v.vx || 0) / 520 + 0.25), true, or.t);
          }
        }
      }
    } else {
      // Yedek: kamera/arazi yoksa ekran uzayında üç sabit gölcük.
      for (let k = 0; k < 3; k++) {
        const bx = W * (0.20 + k * 0.30);
        const by = or.yerY + H * 0.03 * (k + 1);
        const rx = W * (0.055 + 0.02 * this._ri(k + 3));
        this._golcukCiz(ctx, W, H, ba, p, or, bx, by, rx, rx * 0.20, tavan, kenarGr);
        if (v && typeof v.vx === 'number' && Math.abs(v.vx) > 40 &&
            (or.t - this._sonSicrama) > 0.35 && k === 0) {
          this._halkaEkle(bx, by, 0.8, false, or.t);
        }
      }
    }

    // ── b) halka dalgaları (havuzdan) ───────────────────────────────────────
    const hal = this._halkalar;
    for (let i = 0; i < hal.length; i++) {
      const h = hal[i];
      if (!h.aktif) continue;
      h.t += or.dt;
      if (h.t >= h.omur) { h.aktif = false; continue; }
      const o = h.t / h.omur;
      let sx = h.x, sy = h.y, olc = 1;
      if (h.dunya) {
        if (!d) { h.aktif = false; continue; }
        const s = d.ekran(h.x, h.y);
        if (!s || !isFinite(s.x) || !isFinite(s.y)) continue;
        sx = s.x; sy = s.y; olc = Math.abs(d.olcek);
      }
      if (sx < -260 || sx > W + 260) continue;
      const r = (h.r0 + o * (58 + 78 * h.guc)) * olc;
      const a = tavan * (1 - o) * (1 - o) * (0.35 + 0.65 * h.guc);
      if (a <= 0.0008 || r < 1) continue;
      // iki eşmerkezli halka: dış cephe + iç geri dalga
      for (let s2 = 0; s2 < 2; s2++) {
        const rr = s2 === 0 ? r : r * 0.58;
        if (rr < 1) continue;
        const av = a * (s2 === 0 ? 1 : 0.55);
        if (this._gz(av)) continue;                       // PERF: görünmez halka
        ctx.save();
        this._ca(ctx, 'birikinti', av);
        ctx.strokeStyle = s2 === 0 ? '#ffffff' : (p.bloom || '#ffffff');
        // ⚠ scale(1,0.30) altında çizgi kalınlığı da eziliyor; kalınlığı
        //   ölçekten BAĞIMSIZ tutmak için bölme YAPMA (yatayda 3× şişer).
        ctx.lineWidth = Math.max(0.8, (2.6 - o * 1.6) * olc);
        ctx.translate(sx, sy);
        ctx.scale(1, 0.30);                       // elips = perspektifli halka
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    this._yansimaCizildi = true;
  },

  // Tek gölcük: aynalanmış sahne parçası (elipse kırpılmış) + kenar parlaması.
  _golcukCiz(ctx, W, H, ba, p, or, sx, sy, rx, ry, tavan, kenarGr) {
    if (sx < -rx * 2 || sx > W + rx * 2 || sy < -ry * 4 || sy > H + ry * 4) return;
    const yum = this._tampon2 || this._tampon;
    // a) gölcüğün içindeki yansıma
    if (this._tamponGecerli && yum) {
      const oy = yum.height / H;
      const kh = Math.max(1, Math.min(yum.height, (sy - Math.max(0, sy - H * 0.28)) * oy));
      const ky0 = (sy * oy) - kh;
      if (ky0 >= 0 && kh > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(rx, ry);
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.restore();
        ctx.clip();
        this._ca(ctx, 'birikinti', tavan * 1.0);
        ctx.translate(sx - rx + Math.sin(or.t * 1.9) * 1.6, sy + ry);
        ctx.scale(1, -1);
        ctx.drawImage(yum, 0, ky0, yum.width, kh, 0, 0, rx * 2, ry * 5.5);
        ctx.restore();
      }
    }
    // b) kenar parlaması (yüzey gerilimi)
    ctx.save();
    this._ca(ctx, 'birikinti', tavan * 0.9);
    ctx.translate(sx, sy);
    ctx.scale(rx, Math.max(0.6, ry));
    ctx.fillStyle = kenarGr;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Halka üretimi — SABİT havuz, round-robin. `push` YOK.
  _halkaEkle(x, y, guc, dunya, t) {
    this._havuzKur();
    const h = this._halkalar[this._halkaYaz % this.HALKA_MAX];
    this._halkaYaz = (this._halkaYaz + 1) % this.HALKA_MAX;
    h.aktif = true;
    h.x = x;
    h.y = y;
    h.t = 0;
    h.omur = 0.85 + guc * 0.75;
    h.guc = Math.max(0, Math.min(1, guc));
    h.r0 = 6;
    h.dunya = !!dunya;
    this._sonSicrama = t;
  },

  // Gölcük konumu/yarıçapı: haritadan türeyen, kayıtsız, tekrarlanabilir.
  _golcukX(mid, k) { return k * 620 + (this._hash(mid + '#' + k) % 380); },
  _golcukR(mid, k) { return 34 + (this._hash('r' + mid + '#' + k) % 92); },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) BUZ YANSIMASI — keskin, soğuk, yüksek kontrastlı + kristal kıvılcımı
  // ⚠ Buz SU DEĞİLDİR: bulanık değil KESKİN tampondan okunur, dalga yok,
  //   yansıma dikeyde hafif sıkıştırılır (kalın buz kırılması).
  // ═════════════════════════════════════════════════════════════════════════
  _buzYansima(ctx, W, H, ba, p, or) {
    const g = or.kBuz;
    if (g <= 0 || or.buz <= 0) return;
    this._olcumEfekt = 'buzYansima';
    const tavan = this._ALFA.buzYansima * g * or.buz;
    const yerY = or.yerY;
    const derin = Math.min(H - yerY, H * 0.40);
    if (derin < 8) return;
    const self = this;
    const kes = this._tampon || this._tampon2;

    ctx.save();
    this._zeminKirp(ctx, W, H, or);

    // a) KESKİN ayna — üç dilim, dikeyde sıkıştırılmış, kaymasız
    if (this._tamponGecerli && kes) {
      const oy = kes.height / H;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const d0 = derin * (i / 3);
        const d1 = derin * ((i + 1) / 3);
        const kyh = (d1 - d0) * oy * 1.35;                 // 1.35 = sıkıştırma
        const ky0 = (yerY - d1 * 1.35) * oy;
        if (ky0 < 0 || kyh < 0.5) continue;
        const av = tavan * (1 - i * 0.30);
        if (this._gz(av)) continue;                       // PERF: görünmez ayna dilimi
        ctx.save();
        this._ca(ctx, 'buzYansima', av);
        ctx.translate(0, yerY + d1);
        ctx.scale(1, -1);
        ctx.drawImage(kes, 0, ky0, kes.width, kyh, 0, 0, W, d1 - d0 + 0.6);
        ctx.restore();
      }
    }

    // b) soğuk yüksek-kontrast tonlama (buz camının rengi)
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    this._ca(ctx, 'buzYansima', tavan * 0.85);
    ctx.translate(0, yerY);
    ctx.scale(W, derin);
    ctx.fillStyle = this._gr(ctx, ba, 'yan-buz|' + p.bloom + '|' + p.sis, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(p.bloom, 0.95));
      gr.addColorStop(0.30, self._rgba(p.bloom, 0.34));
      gr.addColorStop(0.72, self._rgba(p.sis, 0.20));
      gr.addColorStop(1, self._rgba(p.sis, 0));
      return gr;
    });
    ctx.fillRect(0, 0, 1, 1);
    ctx.restore();

    // c) kristal kıvılcımları — 4 kollu, titreşimli, KÜÇÜK ve parlak
    const n = Math.max(4, Math.round(6 + 22 * g * or.buz));
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < n; j++) {
      const r1 = this._ri(j * 17 + 5);
      const r2 = this._ri(j * 23 + 91);
      const cak = Math.sin(or.t * (2.4 + r1 * 4.2) + j * 1.9);
      if (cak <= 0.55) continue;
      const av = tavan * cak;
      if (this._gz(av)) continue;                         // PERF: görünmez kıvılcım
      const x = r1 * W;
      const y = yerY + r2 * r2 * derin;
      const L = (2.5 + r2 * 7) * (0.5 + g);
      ctx.save();
      this._ca(ctx, 'buzYansima', av);
      ctx.fillStyle = '#ffffff';
      ctx.translate(x, y);
      ctx.rotate(r1 * 1.57 + or.t * 0.15);
      ctx.beginPath();
      ctx.moveTo(0, -L); ctx.lineTo(L * 0.16, -L * 0.16);
      ctx.lineTo(L, 0); ctx.lineTo(L * 0.16, L * 0.16);
      ctx.lineTo(0, L); ctx.lineTo(-L * 0.16, L * 0.16);
      ctx.lineTo(-L, 0); ctx.lineTo(-L * 0.16, -L * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    this._yansimaCizildi = true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) YANSIMA RENGİ — 2. katman (ekran uzayı derinlik geçişi)
  // 1. katman `_aynaTonla` içinde, TAMPONDA uygulanır ve ekran alfası
  // harcamaz; bu katman yalnız yansıma bölgesine ince bir biyom/derinlik
  // geçişi bindirir. Hiç yansıma çizilmediyse HİÇ ÇALIŞMAZ.
  // ═════════════════════════════════════════════════════════════════════════
  _yansimaRenk(ctx, W, H, ba, p, or) {
    const g = or.kRenk;
    if (g <= 0 || !this._yansimaCizildi) return;
    this._olcumEfekt = 'yansimaRenk';
    const yerY = or.yerY;
    const derin = Math.min(H - yerY, H * 0.48);
    if (derin < 8) return;
    const self = this;

    ctx.save();
    this._zeminKirp(ctx, W, H, or);
    // 'soft-light': parlaklığı bozmadan rengi taşır → yansıma nötr kalmaz.
    ctx.globalCompositeOperation = 'soft-light';
    this._ca(ctx, 'yansimaRenk', this._ALFA.yansimaRenk * g);
    ctx.translate(0, yerY);
    ctx.scale(W, derin);
    ctx.fillStyle = this._gr(ctx, ba, 'yan-renk|' + p.tint + '|' + p.sis + '|' + p.bloom, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(p.bloom, 0.55));
      gr.addColorStop(0.25, self._rgba(p.tint, 0.85));
      gr.addColorStop(1, self._rgba(p.sis, 0.95));
      return gr;
    });
    ctx.fillRect(0, 0, 1, 1);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  // ── ALFA KELEPÇESİ — §A bütçesi burada zorlanır ─────────────────────────
  // ⚠ Bu dosyada `ctx.globalAlpha = ...` DOĞRUDAN YAZILMAZ; her atama buradan
  //   geçer ve efektin tavanını ASLA aşamaz.
  // 🔴 PERF(31 Tmz · §8B.33) — GÖRÜNMEZ ÇİZİM ELEMESİ.
  //   Tuval 8 bit/kanaldır: `globalAlpha < 1/255` ile yapılan bir çizim
  //   HİÇBİR pikseli değiştiremez (katkı 0'a yuvarlanır). Yine de tam bir
  //   GPU çizim çağrısı + durum geçişi maliyeti öder.
  //   ÖLÇÜLDÜ (ultra, 5 harita ort.): bu dosya kare başına 25,2 fillRect
  //   çiziyordu ve bunların 9,2'si görünmezdi.
  //   ⚠ Ölçüt HAM değer üzerinde uygulanır. `_ca` yalnız YUKARIDAN kelepçeler
  //     (min(v, tavan)), yani ham değer eşiğin altındaysa kelepçeli değer de
  //     altındadır → görünen bir çizim ASLA elenmez.
  _GORUNMEZ: 1 / 255,
  _gz(v) { return !(v >= this._GORUNMEZ); },

  _ca(ctx, ad, deger) {
    const c = this._ALFA[ad] || 0;
    let v = (typeof deger === 'number' && isFinite(deger)) ? deger : 0;
    if (v < 0) v = 0;
    if (v > c) v = c;
    ctx.globalAlpha = v;
    return v;
  },

  // ── ÖNBELLEKLİ GRADIENT ──────────────────────────────────────────────────
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

  // Dikey yansıma çizgisi gradienti (birim uzay, renk başına önbellekli).
  _cizgiGr(ctx, ba, renk) {
    const self = this;
    return this._gr(ctx, ba, 'yan-cizgi|' + renk, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(renk, 1));
      gr.addColorStop(0.16, self._rgba(renk, 0.58));
      gr.addColorStop(0.52, self._rgba(renk, 0.20));
      gr.addColorStop(1, self._rgba(renk, 0));
      return gr;
    });
  },

  // ── Kalite geçidi (0 => o efekt HİÇ çizilmez) ────────────────────────────
  _k(ba, ad) {
    try {
      if (ba && typeof ba.kalite === 'function') {
        const v = ba.kalite(ad);
        return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 0;
      }
      // Bağlam kalite vermediyse global kademeye düş (yoksa 0 = güvenli).
      if (typeof Kalite !== 'undefined' && Kalite && typeof Kalite.ayar === 'function') {
        const v2 = Kalite.ayar(ad);
        return (typeof v2 === 'number' && isFinite(v2)) ? Math.max(0, Math.min(1, v2)) : 0;
      }
    } catch (e) {}
    return 0;
  },

  // ── Blur desteği (bir kez ölçülür) ───────────────────────────────────────
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

  // ── Yansımayı ZEMİNE kırp (gökyüzüne taşmasın) ───────────────────────────
  // ⚠ Çağırmadan önce ctx.save() yapılmış olmalı.
  _zeminKirp(ctx, W, H, or) {
    ctx.beginPath();
    if (or.nk > 1) {
      ctx.moveTo(0, H + 8);
      for (let i = 0; i < or.nk; i++) ctx.lineTo(this._nk[i].x, this._nk[i].y);
      ctx.lineTo(W, H + 8);
      ctx.closePath();
    } else {
      ctx.rect(0, or.yerY, W, Math.max(1, H - or.yerY));
    }
    ctx.clip();
  },

  // ── Işık kaynakları (güneş + far + haritaya özgü lambalar) ───────────────
  // ⚠ Dizi ÖNCEDEN AYRILMIŞ; kare başına nesne üretilmez. Dönüş = adet.
  _isikKaynaklari(W, H, ba, or) {
    const p = ba.palet || this._VARSAYILAN_PALET;
    const kk = this._kaynak;
    let n = 0;
    // a) güneş/ay — gorsel.js huzmesiyle aynı konum (tutarlı görünsün)
    kk[n].x = W * 0.78; kk[n].y = H * 0.14; kk[n].g = 1.0;
    kk[n].r = p.gun || '#ffe8b0'; kk[n].gen = Math.max(3, W * 0.012); n++;
    // b) aracın farı
    const v = ba.vehicle;
    if (or.d && v && typeof v.x === 'number' && typeof v.y === 'number') {
      const s = or.d.ekran(v.x, v.y);
      if (s && isFinite(s.x) && isFinite(s.y) && s.x > -W && s.x < W * 2) {
        kk[n].x = s.x + Math.cos(v.angle || 0) * (v.width || 100) * 0.45 * Math.abs(or.d.olcek);
        kk[n].y = s.y;
        kk[n].g = 0.85;
        kk[n].r = '#fff6dc';
        kk[n].gen = Math.max(2, W * 0.008);
        n++;
      }
    }
    // c) haritaya özgü sabit lambalar (neon/şehir imzası) — hash'ten
    const lamba = Math.min(kk.length - n, or.islak > 0.7 ? 4 : 2);
    for (let i = 0; i < lamba; i++) {
      const r1 = this._ri(this._hash(or.mid) + i * 977);
      kk[n].x = (r1 * 1.12 - 0.06) * W;
      kk[n].y = or.yerY - H * (0.05 + 0.16 * this._ri(i * 31 + 7));
      kk[n].g = 0.34 + 0.42 * this._ri(i * 53 + 3);
      kk[n].r = (i & 1) ? (p.bloom || '#ffeec8') : (p.tint || '#ffffff');
      kk[n].gen = Math.max(2, W * 0.006);
      n++;
    }
    this._kaynakSayi = n;
    return n;
  },

  // ── Dünya→ekran dönüşümü + ekran→dünya tersi ─────────────────────────────
  // ⚠ `ba.camera` yalnız `worldToScreen` garantiler. Dönüşüm afin olduğu için
  //   iki örnekleme ile ölçek ve ters eşleme türetilir (screenToWorld varsa da
  //   ona GÜVENİLMEZ; imzası kamera modülleri arasında farklılaşıyor).
  _donusum(ba) {
    const c = ba && ba.camera;
    if (!c || typeof c.worldToScreen !== 'function') return null;
    const ax = (ba.vehicle && typeof ba.vehicle.x === 'number') ? ba.vehicle.x : 0;
    let a, b;
    try {
      a = c.worldToScreen(ax, 0);
      b = c.worldToScreen(ax + 1000, 0);
    } catch (e) { return null; }
    if (!a || !b || !isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x)) return null;
    const olcek = (b.x - a.x) / 1000;
    if (!isFinite(olcek) || Math.abs(olcek) < 1e-6) return null;
    return {
      olcek: olcek,
      ekran: function (wx, wy) {
        try { return c.worldToScreen(wx, wy); } catch (e) { return null; }
      },
      dunyaX: function (sx) { return ax + (sx - a.x) / olcek; }
    };
  },

  // ── Arazi siluetinin ekran noktaları → `this._nk` (adet döner) ───────────
  _zeminNoktalari(ba, W, d) {
    const ter = (ba && ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;
    if (!d || !ter) return 0;
    const adet = this._nk.length;
    for (let i = 0; i < adet; i++) {
      const sx = (W * i) / (adet - 1);
      const wx = d.dunyaX(sx);
      if (!isFinite(wx)) return 0;
      let wy;
      try { wy = ter.getYAt(wx); } catch (e) { return 0; }
      if (!isFinite(wy)) return 0;
      const s = d.ekran(wx, wy);
      if (!s || !isFinite(s.y)) return 0;
      this._nk[i].x = sx;
      this._nk[i].y = s.y;
    }
    return adet;
  },

  // ── Renk yardımcıları ────────────────────────────────────────────────────
  _rgb(hex) {
    const h = String(hex == null ? '' : hex).replace('#', '').trim();
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 255, g: 232, b: 176 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  _karis(hexA, hexB, t) {
    const a = this._rgb(hexA), b = this._rgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    return 'rgb(' + Math.round(a.r + (b.r - a.r) * k) + ',' +
                    Math.round(a.g + (b.g - a.g) * k) + ',' +
                    Math.round(a.b + (b.b - a.b) * k) + ')';
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
  // Tamsayıdan 0..1 sözde-rastgele — DİZE ÜRETMEZ (sıcak döngüde çöp yok).
  _ri(a) {
    let h = (a | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TEST İSKELESİ — canvas gerektirmez, ÖLÇEREK doğrular
  // ⚠ `izle` true ise çizim çağrıları + EFEKT BAŞINA EN BÜYÜK ALFA kaydedilir.
  // ═════════════════════════════════════════════════════════════════════════
  _sahteCtx(izle) {
    const self = this;
    const say = { save: 0, restore: 0, ciz: 0, gradient: 0, kendiKopya: 0, drawImage: 0 };
    const alfa = {};
    const grad = { addColorStop: function () {} };
    const c = {
      _say: say,
      _alfa: alfa,
      canvas: null,
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
      arc: function () {},
      clip: function () {},
      rect: function () {},
      clearRect: function () {},
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      setTransform: function () {},
      fill: function () { c._kayit(); },
      stroke: function () { c._kayit(); },
      fillRect: function () { c._kayit(); },
      strokeRect: function () { c._kayit(); },
      drawImage: function (kaynak) {
        say.drawImage++;
        if (kaynak && c.canvas && kaynak === c.canvas) say.kendiKopya++;
        c._kayit();
      },
      createLinearGradient: function () { say.gradient++; return grad; },
      createRadialGradient: function () { say.gradient++; return grad; },
      _kayit: function () {
        if (!izle) return;
        say.ciz++;
        const e = self._olcumEfekt || '?';
        if (!(alfa[e] >= 0) || c.globalAlpha > alfa[e]) alfa[e] = c.globalAlpha;
      }
    };
    c.canvas = { width: 800, height: 450, _sahte: true };
    return c;
  },

  // Sahte offscreen kanvas (kendi izlenmeyen ctx'i ile)
  _sahteKanvas(w, h) {
    const cc = this._sahteCtx(false);
    return { width: w, height: h, getContext: function () { return cc; }, _sahte: true };
  },

  // Sahte bağlam nesnesi (kalite sabit)
  _sahteBa(mapId, palet, kaliteDeger, t) {
    const self = this;
    const onbellek = {};
    const sayac = { yeni: 0 };
    return {
      mapId: mapId,
      palet: palet,
      t: (t == null ? 12.5 : t),
      dt: 0.016,
      vehicle: {
        x: 4200, y: 900, vx: 340, vy: -20, angle: 0.18, onGround: true,
        width: 120, height: 54,
        wheels: [{ wx: 4160, wy: 930, r: 22 }, { wx: 4250, wy: 934, r: 22 }]
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

  // Testte tamponları sahte kanvasla değiştir (gerçek DOM gerekmesin)
  _testTamponKur(W, H) {
    this._tampon = this._sahteKanvas(Math.max(16, Math.round(W / 2)), Math.max(16, Math.round(H / 2)));
    this._tampon2 = this._sahteKanvas(Math.max(8, Math.round(W / 4)), Math.max(8, Math.round(H / 4)));
    this._blurDestek = false;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const KALITE_ANAHTAR = ['ekranYansima', 'islakZemin', 'sudalga', 'birikinti', 'buzYansima', 'yansimaRenk'];

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'yansima') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');

    // 2) ALFA BÜTÇESİ — kullanıcı kısıtı: toplam ≤ 0.12
    const anahtarlar = Object.keys(this._ALFA);
    let toplam = 0;
    for (let i = 0; i < anahtarlar.length; i++) toplam += this._ALFA[anahtarlar[i]];
    r.alfaButcesi = toplam <= this.ALFA_BUTCE + 1e-9;
    r.alfaAnahtarlariTam = anahtarlar.length === KALITE_ANAHTAR.length &&
      KALITE_ANAHTAR.every(function (a) { return anahtarlar.indexOf(a) >= 0; });
    r.alfaHepsiPozitif = anahtarlar.every(function (a) { return this._ALFA[a] > 0; }, this);

    // 3) `_ca` kelepçesi tavanı ASLA aştırmaz
    r.alfaKelepcesi = (function (s) {
      const c = s._sahteCtx(false);
      s._ca(c, 'ekranYansima', 9);
      const a1 = c.globalAlpha === s._ALFA.ekranYansima;
      s._ca(c, 'ekranYansima', -3);
      const a2 = c.globalAlpha === 0;
      s._ca(c, 'ekranYansima', NaN);
      const a3 = c.globalAlpha === 0;
      return a1 && a2 && a3;
    })(this);

    // 4) Renk yardımcıları
    r.rgbDogru = (function (s) {
      const c = s._rgb('#ff8000'), k = s._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 && k.r === 255 && k.g === 136 && k.b === 0;
    })(this);
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.bozukRenkGuvenli = !!this._rgb('lacivert-yok') && !!this._rgb(null);
    r.hashKararli = this._hash('underwater') === this._hash('underwater') &&
                    this._hash('underwater') !== this._hash('arctic');
    r.riSinirda = (function (s) {
      for (let i = -40; i < 240; i++) { const v = s._ri(i); if (!(v >= 0 && v < 1)) return false; }
      return true;
    })(this);

    // 5) Harita tabloları
    r.suHaritalari = this.SU.underwater === 1 && this.SU.swamp > 0 &&
                     this.SU.beach > 0 && this.SU.desert_oasis > 0 && !!this.SU.rowboat;
    r.buzHaritalari = this.BUZ.winter > 0 && this.BUZ.arctic > 0 &&
                      this.BUZ.glacier > 0 && this.BUZ.blizzard > 0;
    r.tabloSinirlari = Object.keys(this.SU).every(function (k) { return this.SU[k] > 0 && this.SU[k] <= 1; }, this) &&
                       Object.keys(this.BUZ).every(function (k) { return this.BUZ[k] > 0 && this.BUZ[k] <= 1; }, this) &&
                       Object.keys(this.ISLAK).every(function (k) { return this.ISLAK[k] >= 0 && this.ISLAK[k] <= 1; }, this);

    // 6) Gradient önbelleği — ikinci çağrı YENİ gradient ÜRETMEMELİ
    r.gradientOnbellek = (function (s) {
      s._grYerel = {}; s._grUretim = 0;
      const sahte = s._sahteCtx(false);
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      const ilk = s._grUretim;
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      return ilk === 1 && s._grUretim === 1;
    })(this);

    // 7) Kalite 0 => TEK BİR çizim çağrısı bile olmamalı
    r.kaliteSifirCizmez = (function (s) {
      s.hazir(800, 450);
      s._testTamponKur(800, 450);
      const ctx = s._sahteCtx(true);
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('underwater', { tint: '#1a7ab0', bloom: '#70e0ff', sis: '#0e5a88', gun: '#80d8ff' }, 0);
      s.ciz(ctx, 800, 450, ba);
      return ctx._say.ciz === 0 && ctx._say.gradient === 0 && ba._sayac.yeni === 0;
    })(this);

    // 8) Tam kalitede çiziyor · save/restore dengeli · durum geri konuyor ·
    //    KENDİ ÜSTÜNE ÇİZİM YOK (kural 6) · ölçülen alfa tavan altında
    const olcum = (function (s) {
      s.hazir(800, 450);
      s._testTamponKur(800, 450);
      const ctx = s._sahteCtx(true);
      s._sonTestCtx = ctx;
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const ba = s._sahteBa('underwater', { tint: '#1a7ab0', bloom: '#70e0ff', sis: '#0e5a88', gun: '#80d8ff' }, 1);
      s.ciz(ctx, 800, 450, ba);
      const ilk = ba._sayac.yeni;
      ba.t = 13.4;
      s.ciz(ctx, 800, 450, ba);
      return {
        ciz: ctx._say.ciz,
        dengeli: ctx._say.save === ctx._say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor',
        kendiKopya: ctx._say.kendiKopya,
        yeniIlk: ilk,
        yeniSon: ba._sayac.yeni,
        efektAlfa: ctx._alfa
      };
    })(this);
    r.tamKaliteCiziyor = olcum.ciz > 40;
    r.saveRestoreDengeli = olcum.dengeli;
    r.durumGeriKonuyor = olcum.alfa && olcum.karisim;
    r.kendiUstuneCizimYok = olcum.kendiKopya === 0;
    r.kareBasinaSifirGradient = olcum.yeniIlk > 0 && olcum.yeniSon === olcum.yeniIlk;

    // Ölçülen en büyük alfa efekt efekt tavanın ALTINDA mı + toplamı ≤ 0.12?
    r.olculenAlfaTavanAlti = (function (s, ea) {
      let top = 0, ok = true;
      for (const e in ea) {
        if (!Object.prototype.hasOwnProperty.call(ea, e)) continue;
        const tav = s._ALFA[e];
        if (tav === undefined) { ok = false; continue; }   // bütçesiz efekt = hata
        if (ea[e] > tav + 1e-12) ok = false;
        top += ea[e];
      }
      return ok && top <= s.ALFA_BUTCE + 1e-9;
    })(this, olcum.efektAlfa);

    // 9) Buz haritası da çizilebiliyor (ayrı kod yolu)
    r.buzYoluCiziyor = (function (s) {
      s.hazir(800, 450);
      s._testTamponKur(800, 450);
      const ctx = s._sahteCtx(true);
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('arctic', { tint: '#8ed8f0', bloom: '#eafaff', sis: '#e0f6ff', gun: '#d0eaff' }, 1);
      s.ciz(ctx, 800, 450, ba);
      return ctx._say.ciz > 20 && ctx._say.save === ctx._say.restore;
    })(this);

    // 10) HALKA HAVUZU SABİT — 200 tetikleme sonrası hâlâ 12
    r.halkaHavuzuSabit = (function (s) {
      const eskiSic = s._sonSicrama;
      s._havuzKur();
      for (let i = 0; i < 200; i++) s._halkaEkle(i * 10, 100, 0.7, false, i * 0.01);
      const uzunluk = s._halkalar.length === s.HALKA_MAX;
      let aktif = 0;
      for (let i = 0; i < s._halkalar.length; i++) if (s._halkalar[i].aktif) aktif++;
      for (let i = 0; i < s._halkalar.length; i++) s._halkalar[i].aktif = false;
      s._sonSicrama = eskiSic;
      return uzunluk && aktif <= s.HALKA_MAX && s.HALKA_MAX === 12;
    })(this);

    // 10b) ZAMAN GERİ SARMASI — yeni koşuda `ba.t` sıfırlanır. Bu koruma
    //      olmazsa birikinti halkası bir daha ASLA tetiklenmez (gerçek bug).
    r.zamanGeriSarma = (function (s) {
      const eskiSic = s._sonSicrama;
      s._sonSicrama = 500;                                // "gelecekte kalmış" damga
      const ba = { t: 0.2, dt: 0.016, kalite: function () { return 0; } };
      s._ortam(800, 450, ba, s._VARSAYILAN_PALET);
      const ok = s._sonSicrama < 0.2;                     // geri sarma yakalandı mı
      s._sonSicrama = eskiSic;
      return ok;
    })(this);

    // 11) Eksik bağlam (kamera/arazi/araç yok) çökertmemeli
    r.eksikBaglamGuvenli = (function (s) {
      try {
        const ctx = s._sahteCtx(false);
        s._sonTestCtx = ctx;
        s.ciz(ctx, 640, 360, { mapId: 'swamp', t: 3, kalite: function () { return 1; } });
        s.ciz(ctx, 640, 360, {});
        s.ciz(ctx, 640, 360, null);
        s.ciz(null, 640, 360, {});
        s.ciz(ctx, 0, 0, {});
        return true;
      } catch (e) { return false; }
    })(this);

    // 12) hazir() boyut değişimini yakalıyor
    r.hazirBoyut = (function (s) {
      const eskiW = s._W, eskiH = s._H, eskiHz = s._hazirlandi;
      s.hazir(400, 300);
      const a = (s.hazir(400, 300) === false);      // aynı boyut → iş yok
      const b = (s.hazir(500, 300) === true);       // değişti → yeniden kur
      s._W = eskiW; s._H = eskiH; s._hazirlandi = eskiHz;
      return a && b;
    })(this);

    this._sonTestCtx = null;
    this._tamponGecerli = false;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselYansima = GorselYansima;
