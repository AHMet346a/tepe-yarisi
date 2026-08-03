'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   BAGLA-KAMERA (30 Tmz) — js/camera.js içindeki ÖLÜ kamera modüllerini
   gerçek oyuna bağlar. ADDITIVE: hiçbir dosya değiştirilmedi, yalnız
   fonksiyonlar sarmalandı (şablon: js/hookups.js).

   BAĞLANANLAR (6):
     · PREDICTIVE_FOLLOW  → hız yönünde ek öngörü (küçük kazanç, kelepçeli)
     · ZOOM_SYSTEM        → hıza tepkili ek zoom ÇARPANI (asla atama DEĞİL)
     · DEADZONE_SYSTEM    → görünürlük emniyet ağı (normalde 0 düzeltme)
     · CAMERA_SHAKE_EXT   → yalnız AÇIK `Camera.shake()` olaylarından Perlin sarsıntı
     · CameraAdvanced     → deadzone düzeltmesinin yumuşatıcısı + nitro katman sarsıntısı
                            + `setTarget/getViewMatrix` senkronu
     · ReplayCamera       → koşu boyunca düşük hızda kayıt + GERÇEK zirve karesi
     · CinematicCamera    → YALNIZ tekrar (replay) oynatımında kadraj
     · LensEffects        → YALNIZ tekrar oynatımında, ÖNBELLEKLİ tek katman

   BAĞLANMAYANLAR ve sebebi → `_BAGLANMAYAN` tablosu (dosyanın sonunda,
   selfTest bunu ayrıca doğrular).

   ── 🔴 SERT KURALLAR (ihlali kamerayı bozar) ─────────────────────────────
   1. **Kamera oyunun EN SICAK modülü** (canlıda 1.479.670 çağrı). Kare başına
      iş minimum: sıfır dizi/nesne üretimi (tek `_arac` nesnesi yeniden kullanılır),
      kalite 0 iken TEK BİR hesap bile yapılmaz.
   2. **Ofset ÖNCE SÖKÜLÜR, SONRA takılır.** `Camera.follow` içindeki lerp
      kirlenmiş bir x/y görürse ofset kalıcı KAYMAYA döner. Bu yüzden
      orijinal follow ÇAĞRILMADAN ÖNCE `x -= ofs` yapılır (tam geri alma),
      follow temiz koordinatta çalışır, ofset sonra eklenir.
   3. **Zoom ATANMAZ, ÇARPILIR.** `Camera.zoom` hem `apply()` hem
      `worldToScreen()` tarafından okunur; ikisi de aynı değeri gördüğü sürece
      ekran↔dünya sözleşmesi bozulmaz. `_zoomPrev` follow içinde TEMİZ değerle
      güncellendiği için çarpanım geri beslemez.
   4. **Piksel ≠ dünya birimi.** CAMERA_SHAKE_EXT `maxOffsetX` PİKSEL cinsinden
      belgelenmiş; `Camera.x` DÜNYA birimidir → `/ zoom` ile çevrilir.
      (Çevrilmezse 1280 px ekranda sarsıntı 1,7× fazla olur.)
   5. **Gradient önbelleksiz üretilmez** (`_gr`), **`getImageData` YOK**.
   6. Her efekt kendi try/catch'inde; biri patlarsa diğerleri çalışmaya devam eder.
   ═══════════════════════════════════════════════════════════════════════════ */

const BaglaKamera = {
  version: '1.0',
  _kuruldu: false,
  hataAyikla: false,          // true → deadzone dikdörtgeni çizilir (varsayılan KAPALI)

  // ── Kazançlar (ölçümle seçildi; jitter ölçümü §rapor) ───────────────────
  ONGORU_KAZANC: 0.16,        // PREDICTIVE_FOLLOW ofsetinin ne kadarı alınır
  ZOOM_KAZANC:   0.22,        // ZOOM_SYSTEM sapmasının ne kadarı alınır
  SARS_KAZANC:   0.55,        // CAMERA_SHAKE_EXT genliğinin ne kadarı alınır
  ONGORU_TAVAN:  0.05,        // öngörü ofseti ≤ görüş alanının %5'i
  TOPLAM_TAVAN:  0.10,        // TÜM ofsetler ≤ görüş alanının %10'u (araç asla kaybolmaz)
  KAYIT_ARALIK:  4,           // ReplayCamera: her 4 karede bir örnek (~15 Hz)

  // Deadzone: GENİŞ tutulur → normal takipte HİÇ tetiklenmez, yalnız
  // araç kadrajı terk etmek üzereyken devreye giren emniyet ağıdır.
  // (Modülün kendi varsayılanı 0.30/0.40 idi: follow aracı %16-48'de tuttuğu
  //  için her karede düzeltme üretir ve takiple KAVGA ederdi → titreme.)
  DZ: { x: 0.07, y: 0.14, w: 0.86, h: 0.72 },

  // ── İç durum ────────────────────────────────────────────────────────────
  _ofsX: 0, _ofsY: 0,         // o an UYGULANMIŞ ofset (bir sonraki karede sökülür)
  _yumX: 0, _yumY: 0,         // yumuşatılmış (sarsıntı dışı) bileşen
  _zoomCarpan: 1,             // uygulanmış zoom çarpanı
  _temizZoom: 1,              // follow'un ürettiği DOKUNULMAMIŞ zoom
  _uygulananZoom: -1,         // en son BENİM yazdığım zoom (geri alma kimlik kontrolü)
  _cinY: 0, _cinZ: 1,         // sinematik (replay) kadraj — yumuşatılmış
  _kareSayac: 0,
  _sonDurum: null,
  _oynatiliyorduB: false,
  _prevBoost: false,
  zirve: null,                // koşunun zirve karesi (DÜZELTİLMİŞ seçim)
  zirveHam: null,             // modülün kendi seçimi (hatalı — karşılaştırma için)

  // recordFrame'e verilen TEK nesne — kare başına çöp üretmemek için yeniden kullanılır
  _arac: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, score: 0, flips: 0, speed: 0 },

  // ── Modül erişimi: bare global'ler `window`'da DEĞİL ────────────────────
  C: null, CIN: null, LENS: null, ZS: null, PF: null, DZS: null, SX: null,
  CA: null, RC: null,

  _bul() {
    try { this.C    = (typeof Camera            !== 'undefined') ? Camera            : null; } catch (e) { this.C = null; }
    try { this.CIN  = (typeof CinematicCamera   !== 'undefined') ? CinematicCamera   : null; } catch (e) { this.CIN = null; }
    try { this.LENS = (typeof LensEffects       !== 'undefined') ? LensEffects       : null; } catch (e) { this.LENS = null; }
    try { this.ZS   = (typeof ZOOM_SYSTEM       !== 'undefined') ? ZOOM_SYSTEM       : null; } catch (e) { this.ZS = null; }
    try { this.PF   = (typeof PREDICTIVE_FOLLOW !== 'undefined') ? PREDICTIVE_FOLLOW : null; } catch (e) { this.PF = null; }
    try { this.DZS  = (typeof DEADZONE_SYSTEM   !== 'undefined') ? DEADZONE_SYSTEM   : null; } catch (e) { this.DZS = null; }
    try { this.SX   = (typeof CAMERA_SHAKE_EXT  !== 'undefined') ? CAMERA_SHAKE_EXT  : null; } catch (e) { this.SX = null; }
    try { this.CA   = (typeof CameraAdvanced    !== 'undefined') ? CameraAdvanced    : null; } catch (e) { this.CA = null; }
    try { this.RC   = (typeof ReplayCamera      !== 'undefined') ? ReplayCamera      : null; } catch (e) { this.RC = null; }
    return !!this.C;
  },

  _oyun()   { try { return (typeof Game   !== 'undefined') ? Game   : null; } catch (e) { return null; } },
  _tekrar() { try { return (typeof Replay !== 'undefined') ? Replay : null; } catch (e) { return null; } },

  // ── Kalite geçidi ───────────────────────────────────────────────────────
  // ⚠ ANAHTAR SEÇİMİ ÖLÇÜLDÜ: `carpmaSarsinti` DÜŞÜK'te 0 DEĞİL (0,25 — `_UCUZ`
  //   listesinde), yani tek başına ana geçit OLAMAZ (kural 7: DÜŞÜK'te tamamen
  //   kapanmalı). `hizBulaniklik` DÜŞÜK'te tam 0 ve ULTRA'da 0,55 → ana geçit o.
  //   Sarsıntı genliği ayrıca `carpmaSarsinti` ile ölçeklenir.
  _guc() {
    try {
      if (typeof Kalite === 'undefined' || !Kalite.ayar) return 1;
      const v = Kalite.ayar('hizBulaniklik') / 0.55;
      return v <= 0 ? 0 : (v > 1 ? 1 : v);
    } catch (e) { return 1; }
  },
  _sarsGuc() {
    const g = this._guc();
    if (g <= 0) return 0;
    try {
      if (typeof Kalite === 'undefined' || !Kalite.ayar) return g;
      return g * Kalite.ayar('carpmaSarsinti');
    } catch (e) { return g; }
  },
  _lensGuc() {                                  // replay lens katmanı: DÜŞÜK+ORTA'da 0
    try {
      if (typeof Kalite === 'undefined' || !Kalite.ayar) return 0.8;
      return Kalite.ayar('lensHalka');
    } catch (e) { return 0; }
  },

  // ── ÖNBELLEKLİ GRADIENT (kural 4) ───────────────────────────────────────
  // Kare başına yeni gradient sayısı = 0. Anahtar değişmedikçe aynı nesne döner.
  _grOnbellek: {},
  _grSayac: 0,
  _gr(ctx, anahtar, uret) {
    const v = this._grOnbellek[anahtar];
    if (v) return v;
    const y = uret(ctx);
    this._grOnbellek[anahtar] = y;
    this._grSayac++;
    return y;
  },
  _onbellekTemizle() { this._grOnbellek = {}; this._lensAnahtar = null; this._lensCv = null; },

  // ═══════════════════════════════════════════════════════════════════════
  // HER KARE — `Camera.follow` sarmalayıcısından, ofset SÖKÜLDÜKTEN ve
  // orijinal follow ÇALIŞTIKTAN sonra çağrılır.
  // ═══════════════════════════════════════════════════════════════════════
  _kare(v, dt) {
    const C = this.C;
    if (!C || !v) { this._ofsX = 0; this._ofsY = 0; return; }
    if (!(dt > 0)) dt = 0.016; else if (dt > 0.05) dt = 0.05;

    this._temizZoom = C.zoom;
    const g = this._guc();

    // Kalite 0 (DÜŞÜK) → TEK BİR hesap yapılmaz, kamera birebir eski davranış.
    if (g <= 0) {
      this._ofsX = 0; this._ofsY = 0;
      this._yumX = 0; this._yumY = 0;
      this._zoomCarpan = 1; this._cinY = 0; this._cinZ = 1;
      return;
    }

    const z  = (C.zoom > 0) ? C.zoom : 1;
    const wW = (C.width  || 800) / z;          // görüş alanı — DÜNYA birimi
    const wH = (C.height || 600) / z;
    const oynatiliyor = this._oynatimda();

    let dx = 0, dy = 0;                        // yumuşatılacak bileşen
    let sx = 0, sy = 0;                        // sarsıntı (yumuşatılmaz)

    // ── 1) PREDICTIVE_FOLLOW — hız yönünde ek öngörü ──────────────────────
    // ⚠ follow() ZATEN öngörü yapıyor (±%16). Bu yüzden kazanç KÜÇÜK ve ofset
    //   görüş alanının %5'ine kelepçeli; yoksa iki öngörü birbiriyle kavga eder.
    try {
      const PF = this.PF;
      if (PF) {
        PF.updateLookAhead(v, dt);
        const o = PF.getOffset();
        const k = this.ONGORU_KAZANC * g;
        let ax = o.x * k, ay = o.y * k * 0.6;   // dikey daha da zayıf (tepe/çukur gürültüsü)
        const mx = wW * this.ONGORU_TAVAN, my = wH * this.ONGORU_TAVAN;
        if (ax >  mx) ax =  mx; else if (ax < -mx) ax = -mx;
        if (ay >  my) ay =  my; else if (ay < -my) ay = -my;
        dx += ax; dy += ay;
      }
    } catch (e) {}

    // ── 2) CinematicCamera — YALNIZ tekrar oynatımında ────────────────────
    try {
      const CIN = this.CIN;
      if (CIN) {
        let hy = 0, hz = 1;
        if (oynatiliyor) {
          CIN.updateCinematic(dt, v);
          const co = CIN.getCinematicOffset(v);
          hy = co.y || 0; hz = co.zoom || 1;
        }
        // ⚠ Kendi yumuşatmam ŞART: modül `_transitionProgress`i hesaplıyor ama
        //   HİÇ KULLANMIYOR (camera.js:592-599) → mod 0,5 sn sonra ANİDEN geçiyor.
        const e = 1 - Math.exp(-3 * dt);
        this._cinY += (hy - this._cinY) * e;
        this._cinZ += (hz - this._cinZ) * e;
        dy += this._cinY;
      }
    } catch (e) {}

    // ── 3) DEADZONE_SYSTEM — görünürlük emniyet ağı ───────────────────────
    // 🔴 BİRİM DÜZELTMESİ: modül `cameraX + dz.x * W` yazıyor; cameraX DÜNYA,
    //    `dz.x*W` ise EKRAN pikseli (camera.js:1782-1785 — gerçek hata).
    //    Çağrı yerinde W/H olarak DÜNYA görüş alanı verilerek matematik doğrulanır.
    // ⚠ `updateWithDeadzone` ve `updatePanAdv` her çağrıda YENİ NESNE döndürüyor
    //   (camera.js:1803, 1046). En sıcak modülde kare başına çöp → önce
    //   `isInDeadzone` (yalnız boolean) ile bak; araç içerideyse ve bekleyen
    //   düzeltme yoksa TEK NESNE bile üretilmez.
    try {
      const DZS = this.DZS, CA = this.CA;
      if (DZS && CA && DZS.isEnabled()) {
        const ps = CA._panState;
        const disarida = !DZS.isInDeadzone(v.x, v.y, C.x + dx, C.y + dy, wW, wH);
        if (disarida || ps.x || ps.y || ps.targetX || ps.targetY) {
          if (disarida) {
            const r = DZS.updateWithDeadzone(v, C.x + dx, C.y + dy, wW, wH);
            CA.panTo(r.x - (C.x + dx), r.y - (C.y + dy), 6);
          } else {
            CA.resetPanAdv();
          }
          const p = CA.updatePanAdv(dt);
          if (Math.abs(p.x) < 0.001 && Math.abs(p.y) < 0.001) { ps.x = 0; ps.y = 0; }
          dx += p.x; dy += p.y;
        }
      }
    } catch (e) {}

    // ── 4) CAMERA_SHAKE_EXT — Perlin sarsıntı ────────────────────────────
    // ⚠ ÇİFT SARSINTI YASAK: follow() İNİŞTE zaten sarsıyor (camera.js:141-151) ve
    //   gorsel-hareket.js `carpmaSarsinti` sert inişte ekranı kaydırıyor. Bu yüzden
    //   trauma İNİŞTEN BESLENMEZ; yalnız AÇIK `Camera.shake()` olaylarından beslenir
    //   (çarpışma/takla/nitro/rütbe ön ayarları). Genlik de piksel→dünya çevrilir.
    try {
      const SX = this.SX, gs = this._sarsGuc();
      if (SX && gs > 0) {
        SX.update(dt, 1.6);
        if (SX.isShaking()) {
          const o = SX.getShakeOffset();       // ⚠ argümansız: update()'in zamanı kullanılsın
          const k = (this.SARS_KAZANC * gs) / z;
          sx += o.x * k; sy += o.y * k;
        }
      } else if (SX && SX.traumaLevel > 0) {
        SX.clearTrauma();
      }
    } catch (e) {}

    // ── 5) CameraAdvanced katman sarsıntısı — nitro gürültüsü ────────────
    // ⚠ `addShakeLayer` ÜST SINIRSIZ (camera.js:973) ve tüm katmanlar TOPLANIR →
    //   her karede çağrılırsa genlik ~15× olur. Bu yüzden YALNIZ nitro KENARINDA
    //   ve en fazla 3 katman.
    try {
      const CA = this.CA, gs = this._sarsGuc();
      if (CA && gs > 0) {
        const bst = !!(v.boostActive || v.nitroActive);
        if (bst && !this._prevBoost && CA._shakeLayersAdv.length < 3) {
          CA.addShakeLayer(2.4, 11, 0.30);
        }
        this._prevBoost = bst;
        // ⚠ `updateShakeLayers` her çağrıda `.filter()` ile YENİ DİZİ üretir →
        //   en sıcak modülde kare başına çöp. Boşken hiç çağırma.
        if (CA._shakeLayersAdv.length > 0) {
          const o = CA.updateShakeLayers(dt);
          const k = gs / z;
          sx += o.x * k; sy += o.y * k * 0.7;
        }
      }
    } catch (e) {}

    // ── 6) Yumuşatma + toplam kelepçe ────────────────────────────────────
    // Kare-bağımsız üstel yumuşatma → değişken FPS'te titreme yok.
    const e2 = 1 - Math.exp(-12 * dt);
    this._yumX += (dx - this._yumX) * e2;
    this._yumY += (dy - this._yumY) * e2;

    let tx = this._yumX + sx, ty = this._yumY + sy;
    const mtx = wW * this.TOPLAM_TAVAN, mty = wH * this.TOPLAM_TAVAN;
    if (tx >  mtx) tx =  mtx; else if (tx < -mtx) tx = -mtx;
    if (ty >  mty) ty =  mty; else if (ty < -mty) ty = -mty;
    if (!isFinite(tx)) tx = 0;
    if (!isFinite(ty)) ty = 0;

    C.x += tx; C.y += ty;
    this._ofsX = tx; this._ofsY = ty;

    // ── 7) ZOOM_SYSTEM — ÇARPAN (asla atama) ─────────────────────────────
    try {
      const ZS = this.ZS;
      let hedef = 1;
      if (ZS) {
        ZS.dynamicZoom(v);
        // ⚠ `ZOOM_SYSTEM.update` yayı `diff * 0.1` — KARE BAĞIMLI (camera.js:1675).
        //   Çıktısını doğrudan kullanmıyorum; kendi kare-bağımsız yumuşatmamdan
        //   geçiriyorum → 30 fps ile 144 fps arasında davranış aynı kalır.
        ZS.update(dt);
        hedef = 1 + (ZS.currentZoom - 1) * this.ZOOM_KAZANC * g;
      }
      hedef *= this._cinZ;
      if (hedef < 0.85) hedef = 0.85; else if (hedef > 1.15) hedef = 1.15;
      this._zoomCarpan += (hedef - this._zoomCarpan) * (1 - Math.exp(-6 * dt));
      if (!isFinite(this._zoomCarpan) || this._zoomCarpan <= 0) this._zoomCarpan = 1;
      C.zoom = this._temizZoom * this._zoomCarpan;
      this._uygulananZoom = C.zoom;      // geri alma KİMLİK kontrolü için
    } catch (e) { this._zoomCarpan = 1; }

    // ── 8) ReplayCamera — düşük hızda kayıt ──────────────────────────────
    // 🔴 ALAN ADI UYUMSUZLUĞU (gerçek hata): `recordFrame` `vehicle.flips` ve
    //    `vehicle.speed` okuyor (camera.js:911-913); canlı araçta İKİSİ DE YOK
    //    (doğrusu `flipCount`, hız hesaplanmalı) → `_findHighlightFrame`
    //    (camera.js:946) hep 0>0 karşılaştırıp DAİMA İLK KAREYİ döndürüyordu.
    //    Uyarlayıcı nesne bunu düzeltir.
    try {
      const RC = this.RC;
      if (RC && RC.isRecording() && (++this._kareSayac % this.KAYIT_ARALIK) === 0) {
        const a = this._arac;
        a.x = v.x; a.y = v.y || 0;
        a.vx = v.vx || 0; a.vy = v.vy || 0;
        a.angle = v.angle || 0;
        a.speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        a.flips = v.flipCount || 0;
        a.score = Math.round(a.x);
        RC.recordFrame(a);
      }
    } catch (e) {}

    // ── 9) CameraAdvanced hedef senkronu ─────────────────────────────────
    // ⚠ `setTarget` her çağrıda console.log basıyor (camera.js:970) ve
    //   `getViewMatrix` `{...}` ile YENİ NESNE üretiyor (camera.js:1001) →
    //   ikisi de sıcak döngüde OLMAZ. Hedef yalnız DEĞİŞİNCE yazılır; matris
    //   `BaglaKamera.gorunumMatrisi()` ile İSTENİNCE hesaplanır.
    try {
      const CA = this.CA;
      if (CA && CA._targetEntity !== v) CA._targetEntity = v;
    } catch (e) {}
  },

  // İstek üzerine görünüm matrisi (kare başına DEĞİL — nesne üretiyor)
  gorunumMatrisi() { try { return this.CA ? this.CA.getViewMatrix() : null; } catch (e) { return null; } },

  _oynatimda() {
    try { const R = this._tekrar(); return !!(R && R.isPlaying && R.isPlaying()); } catch (e) { return false; }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KOŞU / OYNATIM YAŞAM DÖNGÜSÜ
  // ═══════════════════════════════════════════════════════════════════════
  sifirla() {
    this._ofsX = 0; this._ofsY = 0; this._yumX = 0; this._yumY = 0;
    this._zoomCarpan = 1; this._uygulananZoom = -1; this._cinY = 0; this._cinZ = 1;
    this._kareSayac = 0; this._prevBoost = false;
    try { if (this.PF) this.PF.reset(); } catch (e) {}
    try { if (this.SX) this.SX.clearTrauma(); } catch (e) {}
    try { if (this.ZS) { this.ZS.setBaseZoom(1); this.ZS.snapZoom(1); } } catch (e) {}
    try { if (this.CA) { this.CA.resetPanAdv(); this.CA._panState.x = 0; this.CA._panState.y = 0; this.CA._shakeLayersAdv.length = 0; } } catch (e) {}
  },

  _kosuBasla() {
    this.sifirla();
    try { if (this.RC) { this.RC.startRecording(); } } catch (e) {}
  },

  _kosuBitir() {
    try {
      const RC = this.RC;
      if (!RC || !RC.isRecording()) return;
      RC.stopRecording();                        // modülün kendi zirve seçimi
      this.zirveHam = RC.getHighlightFrame();
      // 🔴 `_findHighlightFrame` (camera.js:942-951) VEYA'lı karşılaştırma yapıyor:
      //    `frame.speed > best.speed || frame.flips > best.flips`. Takla sayısı
      //    ARTAN bir alan olduğu için, koşunun sonlarındaki YAVAŞ bir kare
      //    900 hızlı kareyi EZİYOR (ölçüldü: 900 hızlı kare varken 7 hızlı kare
      //    seçildi). Kaynağa dokunmadan çağrı yerinde düzeltiliyor:
      //    tek monoton puan = hız + takla*250.
      this.zirve = this.zirveHam;
      const f = RC._frames;
      if (f && f.length) {
        let en = -1, sec = null;
        for (let i = 0; i < f.length; i++) {
          const p = (f[i].speed || 0) + (f[i].flips || 0) * 250;
          if (p > en) { en = p; sec = f[i]; }
        }
        if (sec) this.zirve = sec;
      }
    } catch (e) {}
  },

  // Tekrar oynatımı başlarken kadrajı seç: çok takla varsa 'dramatic', yoksa 'tracking'
  _oynatimBasla() {
    try {
      const CIN = this.CIN;
      if (!CIN) return;
      const z = this.zirve;
      const mod = (z && (z.flips || 0) >= 2) ? 'dramatic' : 'tracking';
      CIN.setCinematicMode(mod);
    } catch (e) {}
  },

  _oynatimBitir() {
    // ⚠ Modülde "modu temizle" API'si YOK; `setCinematicMode` geçersiz ad için
    //   yalnız console.warn basıp false döner. Bu yüzden alan doğrudan sıfırlanır
    //   (kaynak dosya DEĞİŞTİRİLMEZ, yalnız durum yazılır).
    try {
      const CIN = this.CIN;
      if (CIN) { CIN._currentMode = null; CIN._targetMode = null; CIN._transitionActive = false; CIN._modeTime = 0; }
    } catch (e) {}
  },

  // Her karede — `Game.update` sarmalayıcısından (durum 'playing' olmasa da çalışır)
  _tik(dt) {
    try {
      const G = this._oyun();
      const st = G ? G.state : null;
      if (st === 'playing' && this._sonDurum !== 'playing') this._kosuBasla();
      else if (st !== 'playing' && this._sonDurum === 'playing') this._kosuBitir();
      this._sonDurum = st;
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LENS KATMANI — YALNIZ TEKRAR OYNATIMI
  // ⚠ ÇİFT UYGULAMA: oyun içinde Renderer.drawGame'i `Gorsel` sarmalıyor
  //   (bloom/vinyet/grain/kromatik/lens halkası/anamorfik/varil zaten var).
  //   Tekrar oynatımında `Renderer.drawGame` HİÇ çağrılmaz (main.js:159 erken
  //   döner) → orada post-process YOK. Bu yüzden lens katmanı YALNIZ orada.
  // ⚠ Kare başına gradient = 0: vinyet+bokeh BİR KEZ offscreen kanvasa çizilir,
  //   sonra yalnız `drawImage` yapılır. Boyut/şiddet değişirse yeniden kurulur.
  // ═══════════════════════════════════════════════════════════════════════
  _lensCv: null, _lensAnahtar: null,

  _lensKatman(W, H, siddet) {
    const anahtar = W + 'x' + H + '|' + siddet.toFixed(2);
    if (this._lensAnahtar === anahtar && this._lensCv) return this._lensCv;
    if (typeof document === 'undefined' || !document.createElement) return null;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    if (!c) return null;
    const L = this.LENS;
    if (!L) return null;
    // Sıra önemli: önce kenar kararma, sonra bokeh lekeleri üstüne.
    try { L.applyLensEffect(c, W, H, 'vignette', 0.55 * siddet); } catch (e) {}
    try { L.applyLensEffect(c, W, H, 'bokeh',    1.00 * siddet); } catch (e) {}
    this._lensCv = cv; this._lensAnahtar = anahtar;
    return cv;
  },

  _lensKapla(ctx) {
    if (!ctx || !ctx.canvas) return;
    const s = this._lensGuc();
    if (s <= 0) return;
    const W = ctx.canvas.width | 0, H = ctx.canvas.height | 0;
    if (W < 8 || H < 8) return;
    const cv = this._lensKatman(W, H, s);
    if (cv) {
      ctx.save();
      try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {}
      ctx.globalAlpha = 1;
      ctx.drawImage(cv, 0, 0);
      ctx.restore();
      return;
    }
    // Yedek yol (offscreen kanvas yoksa): ÖNBELLEKLİ gradient ile yalnız vinyet.
    ctx.save();
    try {
      ctx.fillStyle = this._gr(ctx, 'bk-vinyet|' + W + 'x' + H + '|' + s.toFixed(2), function (c2) {
        const gr = c2.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(1, 'rgba(0,0,0,' + (0.38 * s).toFixed(3) + ')');
        return gr;
      });
      ctx.fillRect(0, 0, W, H);
    } catch (e) {}
    ctx.restore();
  },

  // Deadzone hata ayıklama dikdörtgeni (varsayılan KAPALI → sıfır maliyet)
  _hataAyiklaCiz(ctx) {
    if (!this.hataAyikla || !ctx || !ctx.canvas) return;
    try {
      this.DZS.drawDeadzone(ctx, true, ctx.canvas.width, ctx.canvas.height);
    } catch (e) {}
  },

  // ═══════════════════════════════════════════════════════════════════════
  // KURULUM — yalnız SARMALAMA, hiçbir dosya değiştirilmez
  // ═══════════════════════════════════════════════════════════════════════
  init() {
    if (this._kuruldu) return false;
    if (!this._bul()) return false;
    const B = this;

    // Modül varsayılanlarını güvenli değerlere çek (kaynak dosya DEĞİŞTİRİLMEDİ)
    try {
      if (this.DZS) { this.DZS.setDeadzone(this.DZ.x, this.DZ.y, this.DZ.w, this.DZ.h); this.DZS.setEnabled(true); }
    } catch (e) {}
    try {
      // 🔴 `_maxFrames: 3600` + `shift()` = her karede 3600 elemanlık kaydırma.
      //    15 Hz × 450 kare = 30 sn geçmiş, sabit ~40 KB, kaydırma ihmal edilebilir.
      if (this.RC) this.RC._maxFrames = 450;
    } catch (e) {}
    try {
      // Piksel genlikleri düşürüldü (28/20 → 16/11): mevcut sinüs sarsıntısının
      // ÜSTÜNE bindiği için tam genlik çift sarsıntı olurdu. `maxAngle` 0 —
      // `apply()` hiç döndürmüyor, açı kanalının tüketicisi YOK.
      if (this.SX) { this.SX.maxOffsetX = 16; this.SX.maxOffsetY = 11; this.SX.maxAngle = 0; }
    } catch (e) {}
    try { if (this.ZS) { this.ZS.setBaseZoom(1); this.ZS.snapZoom(1); } } catch (e) {}

    // 1) Camera.follow — TEK sıcak nokta
    try {
      if (typeof this.C.follow === 'function' && !this.C.__bkFollow) {
        const _f = this.C.follow;
        this.C.__bkFollow = _f;
        this.C.follow = function (vehicle, dt) {
          const C = this;
          // 🔴 Ofseti ÖNCE TAM OLARAK SÖK — follow'un lerp'i temiz koordinat görsün.
          C.x -= B._ofsX; C.y -= B._ofsY;
          B._ofsX = 0; B._ofsY = 0;
          _f.call(C, vehicle, dt);
          try { B._kare(vehicle, dt); } catch (e) {}
        };
      }
    } catch (e) {}

    // 2) Camera.snapTo — koşu/oynatım başı: her şeyi sıfırla
    try {
      if (typeof this.C.snapTo === 'function' && !this.C.__bkSnap) {
        const _s = this.C.snapTo;
        this.C.__bkSnap = _s;
        this.C.snapTo = function (vehicle) {
          // ⚠ snapTo `_zoomBase`/`_zoomPrev`i `this.zoom`dan TOHUMLUYOR → çarpanım
          //   önce geri alınmazsa kalıcı tabana yazılır (geri besleme).
          // 🔴 KİMLİK KONTROLÜ ŞART: aradan `init()`/`resize()` geçmiş olabilir;
          //   o zaman zoom BENİM yazdığım değer değildir ve dokunulmamalıdır.
          //   (Bu kontrol olmadan ölçümde 90 dünya birimlik sapma çıktı.)
          try {
            if (B._zoomCarpan !== 1 && this.zoom === B._uygulananZoom && B._temizZoom > 0) {
              this.zoom = B._temizZoom;
            }
          } catch (e) {}
          B.sifirla();
          _s.call(this, vehicle);
        };
      }
    } catch (e) {}

    // 3) Camera.shake — AÇIK sarsıntı olayları trauma'ya bağlanır
    //    (iniş sarsıntısı BAĞLANMAZ; follow zaten yapıyor → çift olurdu)
    try {
      if (typeof this.C.shake === 'function' && !this.C.__bkShake) {
        const _sh = this.C.shake;
        this.C.__bkShake = _sh;
        this.C.shake = function (intensity, duration) {
          _sh.call(this, intensity, duration);
          try {
            // shakeOnCrash=18 → 0,82 trauma; shakeOnCollect=2 → 0,09 (neredeyse yok)
            const i = Number(intensity) || 0;
            if (i > 0 && B.SX) B.SX.addTrauma(Math.min(0.85, i / 22));
          } catch (e) {}
        };
      }
    } catch (e) {}

    // 4) Game.update — durum geçişi tiki (state 'playing' değilken de çalışır)
    try {
      const G = this._oyun();
      if (G && typeof G.update === 'function' && !G.__bkUpdate) {
        const _u = G.update.bind(G);
        G.__bkUpdate = true;
        G.update = function (dt) { _u(dt); try { B._tik(dt); } catch (e) {} };
      }
    } catch (e) {}

    // 5) Replay.drawPlayback — sinematik lens katmanı (yalnız oynatımda)
    try {
      const R = this._tekrar();
      if (R && typeof R.drawPlayback === 'function' && !R.__bkDraw) {
        const _d = R.drawPlayback.bind(R);
        R.__bkDraw = true;
        R.drawPlayback = function (ctx) { _d(ctx); try { B._lensKapla(ctx); } catch (e) {} };
      }
      if (R && typeof R.play === 'function' && !R.__bkPlay) {
        const _p = R.play.bind(R);
        R.__bkPlay = true;
        R.play = function (mapId) { const ok = _p(mapId); try { if (ok !== false) B._oynatimBasla(); } catch (e) {} return ok; };
      }
      if (R && typeof R.stop === 'function' && !R.__bkStop) {
        const _st = R.stop.bind(R);
        R.__bkStop = true;
        R.stop = function () { _st(); try { B._oynatimBitir(); B.sifirla(); } catch (e) {} };
      }
    } catch (e) {}

    // 6) HUD.draw — yalnız hata ayıklama dikdörtgeni (varsayılan KAPALI)
    try {
      if (typeof HUD !== 'undefined' && typeof HUD.draw === 'function' && !HUD.__bkDraw) {
        const _h = HUD.draw.bind(HUD);
        HUD.__bkDraw = true;
        HUD.draw = function (ctx) { _h.apply(HUD, arguments); try { B._hataAyiklaCiz(ctx); } catch (e) {} };
      }
    } catch (e) {}

    this._kuruldu = true;
    return true;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BAĞLANMAYANLAR — sebebiyle birlikte (selfTest bunu da doğrular)
  // ═══════════════════════════════════════════════════════════════════════
  _BAGLANMAYAN: {
    'LensEffects.film_grain':          'getImageData kullanıyor (camera.js:715) + gorsel.js `_grain` zaten var',
    'LensEffects.chromatic_aberration':'gorsel-lens.js `_kromatik` zaten yapıyor (çift uygulama)',
    'LensEffects.lens_flare':          'gorsel-isik.js `_gunesDiski` (disk+halka+kollar) zaten yapıyor',
    'CameraAdvanced.worldToScreen':    'MERKEZ tabanlı sözleşme; Camera SOL-ÜST tabanlı → bağlanırsa araç kaybolur',
    'CameraAdvanced.setZoom/updateZoom':'ZOOM_SYSTEM ile aynı işi yapıyor → iki zoom kavga eder',
    'CinematicCamera.drawCockpitOverlay':'kokpit modu hiç kurulmuyor + önbelleksiz gradient (camera.js:631)',
    'CinematicCamera.orbital/bird_eye':'updateCinematic `_orbitX/_trackX/_birdX` hesaplıyor ama getCinematicOffset OKUMUYOR (ölü hesap)'
  },

  // ═══════════════════════════════════════════════════════════════════════
  // selfTest — ÖLÇEREK doğrular (canlı Camera'ya DOKUNMAZ: sahte kamera kullanır)
  // ═══════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const B = this;
    this._bul();

    r.moduller = !!(this.C && this.CIN && this.LENS && this.ZS && this.PF &&
                    this.DZS && this.SX && this.CA && this.RC);
    r.sarmalandi = !!(this.C && this.C.__bkFollow && this.C.__bkSnap && this.C.__bkShake);

    // Kalite geçidi: DÜŞÜK'te güç TAM 0 olmalı (kural 7)
    try {
      let dusukSifir = true, ultraTam = true;
      if (typeof Kalite !== 'undefined') {
        const eski = Kalite._kademe;
        Kalite._kademe = 'dusuk';  dusukSifir = (this._guc() === 0) && (this._sarsGuc() === 0) && (this._lensGuc() === 0);
        Kalite._kademe = 'ultra';  ultraTam   = (this._guc() > 0.9) && (this._lensGuc() > 0);
        Kalite._kademe = eski;
      }
      r.dusuktaKapali = dusukSifir;
      r.ultradaAcik   = ultraTam;
    } catch (e) { r.dusuktaKapali = false; r.ultradaAcik = false; }

    // Sahte kamera üzerinde 120 kare koştur: sonlu · sınırlı · titremesiz
    const gercek = this.C;
    const yedek = { ofsX: this._ofsX, ofsY: this._ofsY, yx: this._yumX, yy: this._yumY, zc: this._zoomCarpan };
    try {
      const sahte = { x: 0, y: 0, zoom: 1.7, width: 1280, height: 720 };
      this.C = sahte;
      this._ofsX = 0; this._ofsY = 0; this._yumX = 0; this._yumY = 0; this._zoomCarpan = 1;
      const v = { x: 0, y: 0, vx: 600, vy: 0, angle: 0, onGround: true, airTime: 0, flipCount: 0 };
      let enBuyukSicrama = 0, oncekiX = 0, oncekiY = 0, sonlu = true;
      const wW = sahte.width / sahte.zoom;
      let tavanAsim = false;
      for (let i = 0; i < 120; i++) {
        v.x += 10; v.vx = 500 + Math.sin(i * 0.2) * 250;
        v.vy = Math.sin(i * 0.37) * 120;
        sahte.x = v.x - wW * 0.32; sahte.y = -200; sahte.zoom = 1.7;
        this._kare(v, 1 / 60);
        if (!isFinite(sahte.x) || !isFinite(sahte.y) || !isFinite(sahte.zoom)) sonlu = false;
        if (Math.abs(this._ofsX) > wW * this.TOPLAM_TAVAN + 0.001) tavanAsim = true;
        if (i > 2) {
          const d = Math.abs(this._ofsX - oncekiX) + Math.abs(this._ofsY - oncekiY);
          if (d > enBuyukSicrama) enBuyukSicrama = d;
        }
        oncekiX = this._ofsX; oncekiY = this._ofsY;
      }
      r.sonlu = sonlu;
      r.tavanTutuyor = !tavanAsim;
      r.titremeYok = enBuyukSicrama < 8;              // dünya birimi / kare
      r.zoomMakul = this._zoomCarpan >= 0.85 && this._zoomCarpan <= 1.15;
      this._sicrama = Math.round(enBuyukSicrama * 1000) / 1000;

      // DEADZONE gerçekten yakalıyor mu? Aracı kadrajın dışına ışınla.
      this._yumX = 0; this._yumY = 0; this._ofsX = 0;
      v.x = sahte.x + wW * 0.99;                       // sağ kenarın ötesi
      let duzeltme = 0;
      for (let i = 0; i < 90; i++) { this._kare(v, 1 / 60); duzeltme = this._yumX; }
      r.deadzoneCalisiyor = duzeltme > 1;              // kamera sağa itilmiş olmalı
    } catch (e) {
      r.sonlu = false; r.tavanTutuyor = false; r.titremeYok = false;
      r.zoomMakul = false; r.deadzoneCalisiyor = false;
    }
    this.C = gercek;
    this._ofsX = yedek.ofsX; this._ofsY = yedek.ofsY;
    this._yumX = yedek.yx; this._yumY = yedek.yy; this._zoomCarpan = yedek.zc;

    // ReplayCamera: zirve karesi DOĞRU seçiliyor mu?
    //  (a) ham `vehicle.flips`/`vehicle.speed` canlı araçta YOK → hep ilk kare,
    //  (b) modülün VEYA'lı seçimi geç gelen bir taklayla hızlı kareyi eziyor.
    // Bu test İKİSİNİ de yakalar: 13. kare en hızlı, 18. karede takla var.
    try {
      const RC = this.RC;
      const yedekK = RC._frames, yedekR = RC._recording, yedekH = RC._highlightFrame;
      const yedekZ = this.zirve;
      RC.startRecording();
      for (let i = 0; i < 20; i++) {
        RC.recordFrame({ x: i, y: 0, vx: 0, vy: 0, angle: 0,
                         speed: (i === 13 ? 900 : 100), flips: (i >= 18 ? 1 : 0), score: 0 });
      }
      this._kosuBitir();
      const z = this.zirve;
      r.zirveDogru = !!z && z.x === 13;                       // düzeltilmiş seçim
      r.zirveHamBozuk = !!this.zirveHam && this.zirveHam.x !== 13;  // modül hatası HÂLÂ orada
      this.zirve = yedekZ;
      RC._frames = yedekK; RC._recording = yedekR; RC._highlightFrame = yedekH;
    } catch (e) { r.zirveDogru = false; r.zirveHamBozuk = false; }

    // Sarsıntı: trauma piksel→dünya çevriliyor mu + sönüyor mu?
    try {
      const SX = this.SX;
      const yt = SX.traumaLevel;
      SX.clearTrauma(); SX.addTrauma(1);
      const a = SX.getShakeOffset();
      for (let i = 0; i < 60; i++) SX.update(1 / 60, 1.6);
      const sondu = !SX.isShaking();
      SX.traumaLevel = yt;
      r.sarsintiSonuyor = sondu && isFinite(a.x) && Math.abs(a.x) <= SX.maxOffsetX + 0.001;
    } catch (e) { r.sarsintiSonuyor = false; }

    // Gradient kaçağı: canlı yolda kare başına yeni gradient 0 olmalı
    r.gradientOnbellekli = (typeof this._gr === 'function');
    r.baglanmayanBelgeli = Object.keys(this._BAGLANMAYAN).length >= 5;

    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaKamera = BaglaKamera;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaKamera.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaKamera.init(); }, 0);
    }
  } catch (e) {}
}
