'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Etkinlikler — ANA MENÜ İKON IZGARASININ YENİ EVİ   (Ajan B · 3 Ağu)

   SORUN (kullanıcı): ana menüdeki 26 ikonluk 2 satırlık panel ekranın büyük
   kısmını kaplıyordu. ▶ Panel kaldırılır; 25 ikon (AYAR HARİÇ) bu ekrana
   taşınır. AYAR ana menünün SOL ÜSTÜNE gider (Ajan A yapar).

   Kaynak liste: `js/ui.js` `_icons` (satır 828-857) — id · emoji · etiket
   BİREBİR kopyalandı, yalnız `settings` çıkarıldı. ID'ler DEĞİŞMEDİ; çünkü
   `js/main.js:1172-1203` bu id'leri doğrudan eylem adı olarak tanıyor
   (`paint`->paintshop · `daily`->dailyquests · `skills`->skilltree ·
   `stats`->statspanel · `market2`->blackmarket · `klan`->_klanAc …).

   Bildirim rozetleri de `ui.js`'ten TAŞINDI (uydurulmadı):
     · `rewards` -> `Rewards.canClaimDaily()`      (ui.js:948 ve 5633)
     · `career`  -> `Career.claimableCount()` > 0  (ui.js:952 ve 5636)
   Başka ikonda rozet hesabı YOKTU. `rozet(id)` / `rozetSayi(id)` genel API'dir.

   ── PROJE TUZAKLARINA UYUM (KLAN-SOZLESME.md §8 · CLAUDE.md 29 Tmz) ────────
   #1  `ctx.font` YALNIZ `_font()` içinde; DAİMA `min(H tabanlı, W tabanlı)`.
       `ctx.fillText` YALNIZ `_yaz()` içinde ve DAİMA `maxWidth` ile.
       Sıkışma oranı `SIKISMA_ESIK`(0,85) altına düşerse metin SIKIŞTIRILMAZ,
       '…' ile KESİLİR. selfTest oranı ÖLÇER.
   #2  Kaydırılan ızgarada hitbox kırpma: `_kirp()` (ui.js `_kirpButonlar`
       deseni). Kırpılan buton y=-9999 ile ölür -> yanlış isabet YOK.
   #3  Dokunma hedefi >= 44 px — `_btn()` merkeze göre büyüterek GARANTİ eder.
       (Bu ekran `UI.buttons`'a kendi yazmaz -> `js/mobilhedef.js`'ten
        yararlanamaz; hedefler burada tutulur.)
   #4  🔴 EKRANIN KENDİ KAYDIRMASI VAR -> `UI._KAYDIRMALI`'ya EKLENMEZ
       (iki kaydırma üst üste biner). Bkz. `kaydirmaBagla()`.
   #5  Renkler 7 karakter HEX — vurguya `+ '33'` alfa eklendiği için ZORUNLU.
   #6  `dt * sabit` YOK -> `1 - Math.exp(-oran*dt)`. Zaman `Date.now()` ile
       ölçülür (dt biriktirme YASAK — `js/intro.js` bu yüzden takılmıştı).
   #7  Önbelleksiz gradient YOK (`_gr()`), `getImageData` YOK.
       Gradyanlar YEREL uzayda üretilir -> anahtar kaydırmayla DEĞİŞMEZ,
       kare başına yeni gradient 0 (selfTest ölçer).
   #8  `ctx.ellipse` YOK -> `_oval()` (save + scale + arc + restore).
   #9  Template literal / backtick YOK (selfTest kaynakta arar).
   #10 Bare global'ler `typeof` ile alınır, `window.X` ile DEĞİL.
   #11 🔴 `toUpperCase()` HAM KULLANILMAZ -> `_buyuk()` (Türkçe i->İ, ı->I).
   #12 `Math.random` YOK.
   #13 Yatay ekran (844x390 / 926x428) ayrıca ölçülür; sütun sayısı GENİŞLİKTEN
       türer, `H` kesirinden DEĞİL (paintshop yatayda blokları bindirmişti).

   ── DIŞA VERİLEN API (Ajan A bağlayacak — imza KESİN) ─────────────────────
     Etkinlikler.EKRAN                  // 'etkinlikler'
     Etkinlikler.ICONLAR                // 25 girdi (settings HARİÇ)
     Etkinlikler.GRUPLAR                // 6 kategori
     Etkinlikler.ciz(ctx, W, H, dt)
     Etkinlikler.tikla(x, y)            // {eylem:'ac',id} | {eylem:'geri'} | null
     Etkinlikler.butonlar()             // [{x,y,w,h,id}]
     Etkinlikler.kaydirma(delta)
     Etkinlikler.rozet(id)              // -> bool
     Etkinlikler.rozetSayi(id)          // -> sayı (0 = rozet yok)
     Etkinlikler.hazir()
     Etkinlikler.selfTest()
   ═══════════════════════════════════════════════════════════════════════ */

const Etkinlikler = {
  ad: 'etkinlikler',
  surum: '1.0',
  EKRAN: 'etkinlikler',

  // ───────────────────────── SABİTLER ─────────────────────────
  UST: 56,              // sabit başlık şeridi
  MIN_HEDEF: 44,        // dokunma hedefi tabanı
  SIKISMA_ESIK: 0.85,   // fillText(...,maxWidth) yatay ezme eşiği
  KENAR: 10,
  BOSLUK: 8,
  KART_MIN: 96,         // sütun sayısı bundan türetilir
  KART_H: 84,
  MAKS_SUTUN: 8,
  MAKS_GRADIENT: 120,

  // 🔴 HEPSİ 7 KARAKTER HEX (tuzak #5)
  RENK: {
    kart: '#161a2e', kartAlt: '#0b0d1a', cizgi: '#2a3350', serit: '#0d1122',
    metin: '#e6ebf5', metin2: '#8fa3b0', metin3: '#5d6b86',
    vurgu: '#ffb020', rozet: '#ff3b3b', bar: '#1b2138'
  },

  // ══════════════════════════════════════════════════════════════
  //  25 İKON — `js/ui.js` `_icons` (828-857) BİREBİR, `settings` HARİÇ
  //  ⚠ SIRA ui.js ile aynıdır (kıyaslama betikleri buna bakar);
  //    EKRANDAKİ sıra `GRUPLAR` tarafından belirlenir.
  // ══════════════════════════════════════════════════════════════
  ICONLAR: [
    { id: 'profile', e: '\u{1F464}', l: 'PROFİL' },
    { id: 'campaign', e: '\u{1F4D6}', l: 'SEFER' },
    { id: 'openworld', e: '\u{1F30D}', l: 'DÜNYA' },
    { id: 'mprooms', e: '\u{1F3C1}', l: 'ODA' },
    { id: 'powermodes', e: '⏱️', l: 'GÜÇ' },
    { id: 'cardcollection', e: '\u{1F0CF}', l: 'KART' },
    { id: 'luckwheel', e: '\u{1F3A1}', l: 'ÇARK' },
    { id: 'tuning', e: '\u{1F527}', l: 'TUNE' },
    { id: 'seasonevents', e: '\u{1F3C6}', l: 'SEZON' },
    { id: 'shopoffers', e: '\u{1F525}', l: 'FIRSAT' },
    { id: 'paint', e: '\u{1F3A8}', l: 'BOYA' },
    { id: 'daily', e: '\u{1F4CB}', l: 'GÜNLÜK' },
    { id: 'skills', e: '\u{1F333}', l: 'YETENEK' },
    { id: 'stats', e: '\u{1F4CA}', l: 'İSTATİSTİK' },
    { id: 'prestigescr', e: '⭐', l: 'PRESTİJ' },
    { id: 'market2', e: '\u{1F56F}️', l: 'KARABORSA' },
    { id: 'replay', e: '\u{1F3AC}', l: 'TEKRAR' },
    { id: 'career', e: '\u{1F396}️', l: 'KARİYER' },
    { id: 'missions', e: '\u{1F3AF}', l: 'GÖREV' },
    { id: 'environment', e: '\u{1F326}', l: 'HAVA' },
    { id: 'ulke', e: '\u{1F30D}', l: 'ÜLKE' },
    { id: 'klan', e: '\u{1F6E1}️', l: 'KLAN' },
    { id: 'multiplayer', e: '\u{1F310}', l: 'ONLINE' },
    { id: 'seasonpass', e: '\u{1F3AB}', l: 'PASS' },
    { id: 'rewards', e: '\u{1F48E}', l: 'ÖDÜL' }
  ],

  // ══════════════════════════════════════════════════════════════
  //  6 KATEGORİ — GEREKÇE
  //  Gruplama "ekran ne yapar" değil, OYUNCUNUN NİYETİ üzerinden:
  //   · İlerleme  = kalıcı ilerleme yolları (bir kez ilerler, geri gitmez)
  //   · Etkinlik  = SÜRELİ / yenilenen ödül kaynakları (çark, fırsat, sezon)
  //   · Araç      = araca uygulanan değişiklikler (tune / güç modu / boya)
  //   · Dünya     = NEREDE koşulacağı (açık dünya · hava · ülke)
  //   · Sosyal    = başka oyuncularla temas
  //   · Kayıt     = geçmişe bakan ekranlar (istatistik · tekrar · karaborsa*)
  //  * Karaborsa kalıcı bir dükkân değil, geçmiş koşulardan gelen hurdayı
  //    harcama yeri olduğu için "Kayıt" altında; başka hiçbir gruba girmiyor.
  // ══════════════════════════════════════════════════════════════
  GRUPLAR: [
    {
      id: 'ilerleme', ad: 'İlerleme', renk: '#3aa0e8', ikon: '\u{1F4C8}',
      uyeler: ['campaign', 'career', 'missions', 'daily', 'skills', 'prestigescr', 'seasonpass']
    },
    {
      id: 'etkinlik', ad: 'Etkinlik ve Ödül', renk: '#e8b23a', ikon: '\u{1F389}',
      uyeler: ['seasonevents', 'luckwheel', 'shopoffers', 'rewards', 'cardcollection']
    },
    {
      id: 'arac', ad: 'Araç', renk: '#48c48a', ikon: '\u{1F697}',
      uyeler: ['tuning', 'powermodes', 'paint']
    },
    {
      id: 'dunya', ad: 'Dünya', renk: '#00e5c0', ikon: '\u{1F5FA}️',
      uyeler: ['openworld', 'environment', 'ulke']
    },
    {
      id: 'sosyal', ad: 'Sosyal', renk: '#c46ae8', ikon: '\u{1F465}',
      uyeler: ['profile', 'mprooms', 'multiplayer', 'klan']
    },
    {
      id: 'kayit', ad: 'Kayıt', renk: '#8fa3b0', ikon: '\u{1F5C3}️',
      uyeler: ['stats', 'replay', 'market2']
    }
  ],

  // ───────────────────────── DURUM ─────────────────────────
  _btns: null,
  _kay: null,
  _harita: null,        // id -> ikon
  _onbellek: null,
  _grOnbellek: null, _grCtx: null,
  _hataSay: 0, _sonHata: null,
  _sonFont: 12,
  _dt: 0.016,
  _olcum: false, _yazilar: null,
  _testZaman: null,
  _hazirlandi: false,
  _kaydirmaBagli: false,
  _basiliId: null, _basiliT: 0,

  // ═══════════════════════════════════════════════════════════════
  //  TEMEL YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },
  _sayi(v, vars) { const n = Number(v); return isFinite(n) ? n : (vars || 0); },
  _kis(v, alt, ust) { return v < alt ? alt : (v > ust ? ust : v); },
  _hexTam(renk, varsayilan) {
    return (typeof renk === 'string' && renk.charAt(0) === '#' && renk.length === 7)
      ? renk : varsayilan;
  },

  // Bare global erişimi (tuzak #10) — window.X ile DEĞİL
  _UIM() { try { return (typeof UI !== 'undefined' && UI) ? UI : null; } catch (e) { return null; } },
  _RW() { try { return (typeof Rewards !== 'undefined' && Rewards) ? Rewards : null; } catch (e) { return null; } },
  _CR() { try { return (typeof Career !== 'undefined' && Career) ? Career : null; } catch (e) { return null; } },

  // Rozet hesabı SaveData'ya iner -> TTL önbellek (kare başına 25 çağrı olmasın)
  // 🔴 `_onbellek` BURADA da kurulur: `rozet()` menüden, HİÇ `ciz()` çağrılmadan
  //    (yani `hazir()` çalışmadan) sorulabilir. Kurulum yalnız `hazir()`de
  //    olsaydı ilk çağrı "Cannot read properties of null" ile ÇÖKERDİ
  //    (ölçüldü — bu dosyanın ilk sürümünde gerçek bir bug'dı).
  _veriAl(anahtar, ttl, fn) {
    if (!this._onbellek) this._onbellek = {};
    const t = this._simdi();
    const c = this._onbellek[anahtar];
    if (c && (t - c.t) < ttl && (t - c.t) >= 0) return c.v;
    let v = null;
    try { v = fn(); } catch (e) { this._hataSay++; v = null; }
    this._onbellek[anahtar] = { t: t, v: v };
    return v;
  },
  onbellegiTemizle() { this._onbellek = {}; return true; },

  _sayiMetni(n) {
    let v = Math.round(this._sayi(n, 0));
    const eksi = v < 0; if (eksi) v = -v;
    let s = String(v), o = '';
    while (s.length > 3) { o = '.' + s.slice(-3) + o; s = s.slice(0, -3); }
    return (eksi ? '-' : '') + s + o;
  },

  // ═══════════════════════════════════════════════════════════════
  //  BİLDİRİM ROZETİ — `js/ui.js`'ten TAŞINDI (uydurulmadı)
  // ═══════════════════════════════════════════════════════════════
  //   ui.js:948  -> Rewards.canClaimDaily()  (kırmızı nokta)
  //   ui.js:952  -> Career.claimableCount()  (sayılı kırmızı rozet)
  //   Modül yoksa / hata atarsa 0 döner (asla çökmez).
  rozetSayi(id) {
    const k = String(id == null ? '' : id);
    if (k === 'rewards') {
      const self = this;
      return this._veriAl('rz_rewards', 1000, function () {
        const R = self._RW();
        return (R && typeof R.canClaimDaily === 'function' && R.canClaimDaily()) ? 1 : 0;
      }) || 0;
    }
    if (k === 'career') {
      const self = this;
      return this._veriAl('rz_career', 1000, function () {
        const C = self._CR();
        if (!C || typeof C.claimableCount !== 'function') return 0;
        const n = C.claimableCount() | 0;
        return n > 0 ? n : 0;
      }) || 0;
    }
    return 0;
  },
  rozet(id) { return this.rozetSayi(id) > 0; },
  rozetToplam() {
    let n = 0;
    for (let i = 0; i < this.ICONLAR.length; i++) {
      if (this.rozetSayi(this.ICONLAR[i].id) > 0) n++;
    }
    return n;
  },

  // ═══════════════════════════════════════════════════════════════
  //  TÜRKÇE BÜYÜK HARF — 🔴 `toUpperCase()` DİLDEN BAĞIMSIZDIR
  // ═══════════════════════════════════════════════════════════════
  // JS 'i'.toUpperCase() -> 'I' (noktasız). Türkçede 'i' -> 'İ', 'ı' -> 'I'.
  // `toLocaleUpperCase('tr')` doğrusunu verir ama her motorda ICU tam
  // derlenmiş olmayabilir -> YEDEK EŞLEME şart. Hangi yol kullanıldığı
  // `_buyukYol` ile ÖLÇÜLÜR (selfTest okur).
  _TR_BUYUK: { 'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç' },
  _buyukYol: null,
  _buyuk(metin) {
    const m = String(metin == null ? '' : metin);
    if (this._buyukYol == null) {
      let ok = false;
      try { ok = ('i'.toLocaleUpperCase('tr') === 'İ' && 'ı'.toLocaleUpperCase('tr') === 'I'); }
      catch (e) { ok = false; }
      this._buyukYol = ok ? 'locale' : 'esleme';
    }
    if (this._buyukYol === 'locale') {
      try { return m.toLocaleUpperCase('tr'); } catch (e) { this._buyukYol = 'esleme'; }
    }
    let o = '';
    for (let i = 0; i < m.length; i++) {
      const c = m.charAt(i);
      const t = this._TR_BUYUK[c];
      o += (t != null) ? t : c.toUpperCase();
    }
    return o;
  },

  // ═══════════════════════════════════════════════════════════════
  //  METİN GENİŞLİĞİ · KESME
  // ═══════════════════════════════════════════════════════════════
  _genislik(ctx, m) {
    const s = String(m == null ? '' : m);
    try { return this._sayi(ctx.measureText(s).width, s.length * this._sonFont * 0.55); }
    catch (e) { return s.length * this._sonFont * 0.55; }
  },
  _kesSigdir(ctx, metin, maxW) {
    const m = String(metin == null ? '' : metin);
    const mw = Math.max(8, this._sayi(maxW, 40));
    if (!m.length || this._genislik(ctx, m) <= mw) return m;
    let alt = 0, ust = m.length;
    while (alt < ust) {
      const orta = Math.ceil((alt + ust) / 2);
      if (this._genislik(ctx, m.slice(0, orta) + '…') <= mw) alt = orta; else ust = orta - 1;
    }
    if (alt <= 0) return '…';
    return m.slice(0, alt).replace(/\s+$/, '') + '…';
  },

  // ═══════════════════════════════════════════════════════════════
  //  FONT + METİN — 🔴 TEK GİRİŞ NOKTASI (tuzak #1)
  // ═══════════════════════════════════════════════════════════════
  _fontPx(W, H, oran) {
    return Math.max(9, Math.round(Math.min(H * oran, W * oran * 1.15)));
  },
  _font(ctx, W, H, oran, kalin, mutlakPx) {
    const px = (mutlakPx != null)
      ? Math.max(9, Math.round(Math.min(this._sayi(mutlakPx, 12), Math.min(H, W) * 0.5)))
      : this._fontPx(W, H, oran);
    ctx.font = (kalin ? 'bold ' : '') + px + 'px Arial';
    this._sonFont = px;
    return px;
  },
  // 🔴 `maxWidth` DAİMA verilir. Tek başına font küçültmek başka dilde yetmez,
  //    tek başına maxWidth metni aşırı SIKIŞTIRIR -> İKİSİ BİRDEN + eşik.
  _yaz(ctx, metin, x, y, maxW) {
    let m = String(metin == null ? '' : metin);
    const mw = Math.max(8, this._sayi(maxW, 40));
    // Ucuz üst sınır: hiçbir Arial glifi 1,25 em'i geçmez -> tahmin <= mw ise
    // metin KESİNLİKLE sığar ve measureText hiç çağrılmaz.
    if (m.length * this._sonFont * 1.25 > mw) {
      const ol0 = this._genislik(ctx, m);
      if (ol0 > 0 && (mw / ol0) < this.SIKISMA_ESIK) m = this._kesSigdir(ctx, m, mw);
    }
    ctx.fillText(m, x, y, mw);
    if (this._olcum) {
      let ol = mw;
      try { ol = this._sayi(ctx.measureText(m).width, mw); } catch (e) { ol = mw; }
      this._yazilar.push({
        m: m, x: x, y: y, maxW: mw, hiza: ctx.textAlign || 'left',
        olculen: ol, oran: ol > mw ? (mw / ol) : 1
      });
    }
    return mw;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ÖNBELLEKLİ GRADYAN (tuzak #7)
  // ═══════════════════════════════════════════════════════════════
  // 🔴 Gradyanlar YEREL uzayda (translate sonrası 0..h) üretilir; anahtar
  //    yalnız YÜKSEKLİK + RENKten oluşur -> kaydırınca anahtar DEĞİŞMEZ.
  //    Kare başına yeni gradient = 0 (selfTest ölçer).
  _gr(ctx, anahtar, x0, y0, x1, y1, duraklar) {
    if (this._grCtx !== ctx) { this._grOnbellek = {}; this._grCtx = ctx; }
    let c = this._grOnbellek;
    if (!c) { c = this._grOnbellek = {}; }
    const g0 = c[anahtar];
    if (g0) return g0;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (let i = 0; i < duraklar.length; i++) g.addColorStop(duraklar[i][0], duraklar[i][1]);
    if (Object.keys(c).length >= this.MAKS_GRADIENT) { c = this._grOnbellek = {}; }
    c[anahtar] = g;
    return g;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ÇİZİM İLKELLERİ
  // ═══════════════════════════════════════════════════════════════
  _oval(ctx, cx, cy, rx, ry) {          // 🔴 ctx.ellipse KULLANILMAZ (tuzak #8)
    if (!(rx > 0) || !(ry > 0)) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  _yuvarlak(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(1, w), Math.max(1, h), r);
  },
  _arka(ctx, W, H) {
    const g = this._gr(ctx, 'bg' + Math.round(H), 0, 0, 0, H,
      [[0, '#0a0a18'], [0.45, '#12162a'], [1, '#050510']]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  // ═══════════════════════════════════════════════════════════════
  //  DÜZEN — 🔴 SÜTUN SAYISI GENİŞLİKTEN TÜRER, `H` KESİRİNDEN DEĞİL
  // ═══════════════════════════════════════════════════════════════
  _sut(W) {
    const kul = this._sayi(W, 360) - this.KENAR * 2;
    const s = Math.floor((kul + this.BOSLUK) / (this.KART_MIN + this.BOSLUK));
    return Math.max(2, Math.min(this.MAKS_SUTUN, s));
  },
  _izgara(W, adet) {
    const P = this.KENAR, b = this.BOSLUK, kh = this.KART_H;
    const sut = this._sut(W);
    const kw = Math.floor((W - P * 2 - (sut - 1) * b) / sut);
    const satir = Math.ceil(Math.max(0, adet) / sut);
    return {
      sut: sut, kw: kw, kh: kh, satir: satir, h: satir * (kh + b),
      kx: function (i) { return P + (i % sut) * (kw + b); },
      ky: function (i) { return Math.floor(i / sut) * (kh + b); }
    };
  },

  _durum() {
    if (!this._kay) this._kay = {};
    if (!this._kay.st) {
      this._kay.st = { sc: 0, maxScroll: 0, viewH: 0, viewTop: this.UST, icerikH: 0 };
    }
    return this._kay.st;
  },
  // 🔴 `dt * sabit` KARE HIZINA BAĞLIDIR -> 1 - exp(-oran*dt)
  _yumusat(mevcut, hedef, oran, dt) {
    const d = this._kis(this._sayi(dt, 0.016), 0.0005, 0.25);
    const k = 1 - Math.exp(-this._sayi(oran, 8) * d);
    const m = this._sayi(mevcut, hedef);
    return m + (this._sayi(hedef, 0) - m) * k;
  },

  _btn(id, x, y, w, h, veri) {
    let L = this._btns;
    if (!L) L = this._btns = [];
    const bw = Math.max(this.MIN_HEDEF, this._sayi(w, 0));
    const bh = Math.max(this.MIN_HEDEF, this._sayi(h, 0));
    const b = {
      id: String(id),
      x: this._sayi(x, 0) - (bw - this._sayi(w, 0)) / 2,
      y: this._sayi(y, 0) - (bh - this._sayi(h, 0)) / 2,
      w: bw, h: bh, veri: (veri == null) ? null : veri
    };
    L.push(b);
    return b;
  },
  // Kaydırılan ızgarada kutuyu görünür alana KIRP (tuzak #2).
  _kirp(bas, ust, alt) {
    const L = this._btns || [];
    for (let i = bas; i < L.length; i++) {
      const b = L[i];
      const a0 = Math.max(b.y, ust), a1 = Math.min(b.y + b.h, alt);
      if (a1 - a0 < 8) { b.y = -9999; b.h = 0; b.gizli = true; continue; }
      b.kirpik = (a1 - a0) < b.h - 0.5;
      b.y = a0; b.h = a1 - a0;
    }
  },
  _kaydirmaCubugu(ctx, W, ust, viewH, st) {
    if (!(st.maxScroll > 0) || !(st.icerikH > 0)) return;
    const trkH = viewH - 8;
    const thH = Math.max(24, trkH * (viewH / st.icerikH));
    const thY = ust + 4 + (trkH - thH) * (st.sc / st.maxScroll);
    ctx.fillStyle = this.RENK.bar;
    this._yuvarlak(ctx, W - 6, ust + 4, 4, trkH, 2); ctx.fill();
    ctx.fillStyle = this.RENK.vurgu;
    this._yuvarlak(ctx, W - 6, thY, 4, thH, 2); ctx.fill();
  },

  // ═══════════════════════════════════════════════════════════════
  //  BAŞLIK ŞERİDİ
  // ═══════════════════════════════════════════════════════════════
  _baslikCiz(ctx, W, H) {
    const u = this.UST;
    ctx.fillStyle = this.RENK.serit; ctx.fillRect(0, 0, W, u);
    ctx.fillStyle = this.RENK.cizgi; ctx.fillRect(0, u - 1, W, 1);

    // Geri (sol üst)
    this._btn('etkinlik_geri', 4, 4, 48, 48, null);
    this._font(ctx, W, H, 0.028, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, '◀', 28, u / 2, 40);

    // Sağda: bekleyen bildirim sayacı (rozet mantığı ui.js'ten taşındı)
    const bek = this.rozetToplam();
    let pilW = 0;
    if (bek > 0) {
      pilW = Math.min(112, Math.max(64, Math.round(W * 0.22)));
      const bx = W - pilW - 8, by = 11, bh = u - 22;
      ctx.fillStyle = this.RENK.rozet + '33';
      this._yuvarlak(ctx, bx, by, pilW, bh, 9); ctx.fill();
      ctx.strokeStyle = this.RENK.rozet; ctx.lineWidth = 1;
      this._yuvarlak(ctx, bx + 0.5, by + 0.5, pilW - 1, bh - 1, 9); ctx.stroke();
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = this.RENK.rozet; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, this._sayiMetni(bek) + ' YENİ', bx + pilW / 2, u / 2, pilW - 10);
      pilW += 8;
    }

    this._font(ctx, W, H, 0.026, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, '\u{1F5C2}️  ' + this._buyuk('Etkinlikler'), 58, u / 2,
      Math.max(40, W - 58 - (pilW > 0 ? pilW + 8 : 12)));
  },

  // Kategori bandı — 🔴 `toUpperCase()` DEĞİL, `_buyuk()`
  _bant(ctx, W, H, y, grup) {
    const c = this._hexTam(grup.renk, this.RENK.vurgu);
    const P = this.KENAR;
    ctx.fillStyle = c; ctx.fillRect(P, y + 5, 3, 16);
    this._font(ctx, W, H, 0.022, true);
    ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, grup.ikon + '  ' + this._buyuk(grup.ad), P + 10, y + 13,
      W - P * 2 - 60);
    // Sağda üye sayısı — küçük, sönük
    this._font(ctx, W, H, 0.017, false);
    ctx.fillStyle = this.RENK.metin3; ctx.textAlign = 'right';
    this._yaz(ctx, String(grup.uyeler.length), W - P - 8, y + 13, 40);
    return 28;
  },

  // Tek ikon kartı
  _kartCiz(ctx, W, H, x, y, kw, kh, it, accent) {
    const ac = this._hexTam(accent, this.RENK.vurgu);
    const basili = (this._basiliId === it.id) &&
      ((this._simdi() - this._basiliT) < 220);
    ctx.save();
    ctx.translate(x, y);
    // ⚠ Anahtar SADECE yükseklik + accent + basılı durumu; x/y GİRMEZ,
    //   yoksa kaydırınca her karede yeni gradient üretilir.
    const anah = 'k' + Math.round(kh) + ac + (basili ? '1' : '0');
    const g = this._gr(ctx, anah, 0, 0, 0, kh,
      basili ? [[0, ac + '55'], [1, '#0e1020']] : [[0, ac + '22'], [1, this.RENK.kartAlt]]);
    ctx.fillStyle = g;
    this._yuvarlak(ctx, 0, 0, kw, kh, 12); ctx.fill();
    ctx.strokeStyle = basili ? ac : this.RENK.cizgi;
    ctx.lineWidth = basili ? 1.8 : 1;
    this._yuvarlak(ctx, 0.5, 0.5, kw - 1, kh - 1, 12); ctx.stroke();
    // üst parlaklık
    ctx.fillStyle = '#ffffff';
    ctx.save(); ctx.globalAlpha = 0.05;
    this._yuvarlak(ctx, 3, 3, kw - 6, kh * 0.40, 10); ctx.fill();
    ctx.restore();
    ctx.restore();

    // emoji
    this._font(ctx, W, H, 0.030, false, Math.round(kh * 0.36));
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, it.e, x + kw / 2, y + kh * 0.40, kw * 0.72);

    // etiket
    this._font(ctx, W, H, 0.018, true, Math.max(9, Math.min(13, Math.round(kw * 0.12))));
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, it.l, x + kw / 2, y + kh - 16, kw - 10);

    // bildirim rozeti (ui.js mantığı)
    const rz = this.rozetSayi(it.id);
    if (rz > 0) {
      const r = 8;
      ctx.fillStyle = this.RENK.rozet;
      this._oval(ctx, x + kw - r - 4, y + r + 4, r, r);
      if (rz > 1) {
        this._font(ctx, W, H, 0.016, true, 10);
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        this._yaz(ctx, String(rz > 99 ? 99 : rz), x + kw - r - 4, y + r + 5, r * 2 - 2);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  //  GÖVDE — kategorilere ayrılmış ızgara
  // ═══════════════════════════════════════════════════════════════
  _cizGovde(ctx, W, H, y0) {
    let y = y0 + 8;
    for (let gi = 0; gi < this.GRUPLAR.length; gi++) {
      const g = this.GRUPLAR[gi];
      y += this._bant(ctx, W, H, y, g);
      const iz = this._izgara(W, g.uyeler.length);
      for (let i = 0; i < g.uyeler.length; i++) {
        const it = this._harita[g.uyeler[i]];
        if (!it) continue;
        const bx = iz.kx(i), by = y + iz.ky(i);
        this._kartCiz(ctx, W, H, bx, by, iz.kw, iz.kh, it, g.renk);
        this._btn(it.id, bx, by, iz.kw, iz.kh, { grup: g.id });
      }
      y += iz.h + 6;
    }
    return y - y0 + 10;
  },

  _govde(ctx, W, H) {
    const ust = this.UST;
    const viewH = Math.max(40, H - ust);
    const st = this._durum();
    st.viewH = viewH; st.viewTop = ust;
    st.sc = this._kis(this._sayi(st.sc, 0), 0, this._sayi(st.maxScroll, 0));
    const bas = (this._btns || []).length;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, ust, W, viewH); ctx.clip();
    let icerikH = 0;
    // Tek bir çizim hatası oyunu durdurmasın; selfTest `_hataSay`i ÖLÇER (0).
    try { icerikH = this._sayi(this._cizGovde(ctx, W, H, ust - st.sc), 0); }
    catch (e) { this._hataSay++; this._sonHata = String(e && e.message ? e.message : e); }
    ctx.restore();
    st.icerikH = Math.max(0, icerikH);
    st.maxScroll = Math.max(0, st.icerikH - viewH + 12);
    st.sc = this._kis(st.sc, 0, st.maxScroll);
    this._kirp(bas, ust, ust + viewH);
    this._kaydirmaCubugu(ctx, W, ust, viewH, st);
    return icerikH;
  },

  // ═══════════════════════════════════════════════════════════════
  //  DIŞA AÇIK API
  // ═══════════════════════════════════════════════════════════════
  hazir() {
    if (!this._btns) this._btns = [];
    if (!this._kay) this._kay = {};
    if (!this._onbellek) this._onbellek = {};
    if (!this._grOnbellek) this._grOnbellek = {};
    if (!this._harita) {
      const h = {};
      for (let i = 0; i < this.ICONLAR.length; i++) h[this.ICONLAR[i].id] = this.ICONLAR[i];
      this._harita = h;
    }
    this._durum();
    this._hazirlandi = true;
    // ⚠ `UI` bu modülden SONRA yüklenmiş olabilir -> bağlanana kadar dene.
    if (!this._kaydirmaBagli) this.kaydirmaBagla();
    return true;
  },

  // 🔴 EKRANIN KENDİ KAYDIRMASI VAR -> `UI._KAYDIRMALI`'ya EKLENMEZ.
  //    Buradaki bağlama merkezî yumuşatmayı (28 ara kare + fırlatma ataleti,
  //    31 Tmz) bedavaya getirir.
  kaydirmaBagla() {
    if (this._kaydirmaBagli) return false;
    const U = this._UIM();
    if (!U || typeof U._dokunmatikKaydirma !== 'function') return false;
    const self = this;
    const e = this.EKRAN;
    try {
      U._dokunmatikKaydirma('etkinlikler',
        function () { return U.currentScreen === e; },
        function () {
          const st = self._durum();
          return { viewH: st.viewH, maxScroll: st.maxScroll, viewTop: st.viewTop };
        },
        function () { return self._durum().sc; },
        function (v) { self._durum().sc = v; });
    } catch (err) { this._hataSay++; return false; }
    this._kaydirmaBagli = true;
    return true;
  },

  ciz(ctx, W, H, dt) {
    if (!ctx) return false;
    this.hazir();
    const w = Math.max(200, this._sayi(W, 360)), h = Math.max(200, this._sayi(H, 640));
    this._btns = [];
    this._dt = this._kis(this._sayi(dt, 0.016), 0.0005, 0.25);
    this._arka(ctx, w, h);
    this._baslikCiz(ctx, w, h);
    this._govde(ctx, w, h);
    return true;
  },

  // -> {eylem:'ac', id:'campaign'} | {eylem:'geri'} | null
  tikla(x, y) {
    const L = this._btns;
    if (!L || !L.length) return null;
    const px = this._sayi(x, -1), py = this._sayi(y, -1);
    for (let i = 0; i < L.length; i++) {
      const b = L[i];
      if (b.y < -9000 || b.h <= 0) continue;
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        if (b.id === 'etkinlik_geri') return { eylem: 'geri' };
        this._basiliId = b.id; this._basiliT = this._simdi();
        return { eylem: 'ac', id: b.id };
      }
    }
    return null;
  },

  butonlar() {
    const L = this._btns;
    if (!L) return [];
    const o = [];
    for (let i = 0; i < L.length; i++) {
      const b = L[i];
      if (b.y < -9000 || b.h <= 0) continue;
      o.push({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h });
    }
    return o;
  },

  kaydirma(delta) {
    this.hazir();
    const st = this._durum();
    st.sc = this._kis(this._sayi(st.sc, 0) + this._sayi(delta, 0), 0, this._sayi(st.maxScroll, 0));
    return st.sc;
  },

  // ═══════════════════════════════════════════════════════════════
  //  KAYNAK TARAMA (selfTest için)
  // ═══════════════════════════════════════════════════════════════
  _kaynakHaric(haric) {
    let s = '';
    const ks = Object.keys(this);
    for (let i = 0; i < ks.length; i++) {
      if (haric.indexOf(ks[i]) >= 0) continue;
      if (typeof this[ks[i]] !== 'function') continue;
      try { s += '\n' + Function.prototype.toString.call(this[ks[i]]); } catch (e) { }
    }
    return s;
  },
  _fnKaynak(ad) {
    try { return Function.prototype.toString.call(this[ad]); } catch (e) { return ''; }
  },
  _yorumsuz(kaynak) {
    return String(kaynak).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  },

  // 🔴 `js/ui.js`'teki `_icons` listesini OKUYUP kıyaslar (node'da).
  //    Ajan A paneli kaldırınca blok bulunamaz -> kontrol ATLANIR (pass),
  //    çünkü o noktada tek kaynak zaten bu dosyadır.
  _uiIkonlari() {
    let fs = null, path = null;
    try { fs = require('fs'); path = require('path'); } catch (e) { return null; }
    if (!fs || !path) return null;
    let src = null;
    const adaylar = [];
    try { adaylar.push(path.join(__dirname, 'ui.js')); } catch (e) { }
    try { adaylar.push(path.join(process.cwd(), 'js', 'ui.js')); } catch (e) { }
    for (let i = 0; i < adaylar.length; i++) {
      try { src = fs.readFileSync(adaylar[i], 'utf8'); break; } catch (e) { src = null; }
    }
    if (!src) return null;
    // 🔴 SABİT SATIR ARALIĞI YOK — blok ADINA göre bulunur (CLAUDE.md kuralı).
    const bas = src.indexOf('const _icons = [');
    if (bas < 0) return null;
    const son = src.indexOf('];', bas);
    if (son < 0) return null;
    const blok = src.slice(bas, son);
    const re = /id\s*:\s*'([A-Za-z0-9_]+)'\s*,\s*e\s*:\s*'([^']*)'\s*,\s*l\s*:\s*'([^']*)'/g;
    const o = [];
    let m = re.exec(blok);
    while (m) { o.push({ id: m[1], e: m[2], l: m[3] }); m = re.exec(blok); }
    return o.length ? o : null;
  },

  // Sahte 2D bağlam — ölçüm için (port-araclari/duman-kare-maliyeti.js deseni).
  // ⚠ `ellipse` BİLEREK TANIMLANMADI: kod onu çağırırsa TypeError atar ve
  //   `_hataSay` artar (gerçek test rasterizer'ında da yok — tuzak #8).
  _sahteCtx(s) {
    return {
      canvas: { width: 0, height: 0 },
      fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
      font: '10px Arial', textAlign: 'left', textBaseline: 'alphabetic',
      globalAlpha: 1, shadowColor: '#000', shadowBlur: 0, shadowOffsetY: 0,
      save: function () { s.derinlik++; }, restore: function () { s.derinlik--; },
      beginPath: function () { }, closePath: function () { },
      moveTo: function () { }, lineTo: function () { }, arc: function () { },
      arcTo: function () { }, rect: function () { }, roundRect: function () { },
      clip: function () { }, setLineDash: function () { },
      translate: function () { }, rotate: function () { }, scale: function () { },
      setTransform: function () { }, resetTransform: function () { },
      quadraticCurveTo: function () { }, bezierCurveTo: function () { },
      fill: function () { s.ciz++; }, stroke: function () { s.ciz++; },
      fillRect: function () { s.ciz++; }, strokeRect: function () { s.ciz++; },
      clearRect: function () { }, drawImage: function () { s.ciz++; },
      fillText: function () { s.metin++; }, strokeText: function () { s.metin++; },
      measureText: function (t) {
        const m = /(\d+)px/.exec(this.font);
        const px = m ? Number(m[1]) : 12;
        return { width: String(t == null ? '' : t).length * px * 0.55 };
      },
      createLinearGradient: function () { s.grad++; return { addColorStop: function () { } }; },
      createRadialGradient: function () { s.grad++; return { addColorStop: function () { } }; },
      createPattern: function () { return null; }
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  SELF TEST — 40 kontrol, hepsi ÖLÇEREK
  //  ⚠ Canlı durumu kirletmez: tüm alanlar yedeklenir ve geri konur.
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const yedek = {
      btns: this._btns, kay: this._kay, onb: this._onbellek,
      gr: this._grOnbellek, grCtx: this._grCtx, hata: this._hataSay,
      zaman: this._testZaman, bagli: this._kaydirmaBagli,
      basiliId: this._basiliId, basiliT: this._basiliT
    };
    const BOYUT = [[360, 640], [360, 800], [390, 844], [414, 896],
      [428, 926], [768, 1024], [844, 390], [926, 428]];
    try {
      this._btns = []; this._kay = {}; this._onbellek = {};
      this._grOnbellek = {}; this._grCtx = null; this._hataSay = 0;
      this._kaydirmaBagli = true;                 // testte UI'ye bağlanma
      this._basiliId = null; this._basiliT = 0;
      this._testZaman = 1754200000000;            // sabit -> tekrarlanabilir
      this.hazir();

      // ── 1-3: API + sabitler ──
      const api = ['EKRAN', 'ICONLAR', 'GRUPLAR', 'ciz', 'tikla', 'butonlar',
        'kaydirma', 'rozet', 'rozetSayi', 'hazir', 'selfTest'];
      let apiTam = true;
      for (let i = 0; i < api.length; i++) {
        const v = this[api[i]];
        if (api[i] === 'EKRAN') { if (v !== 'etkinlikler') apiTam = false; }
        else if (api[i] === 'ICONLAR' || api[i] === 'GRUPLAR') { if (!Array.isArray(v)) apiTam = false; }
        else if (typeof v !== 'function') apiTam = false;
      }
      r.apiTam = apiTam;
      r.ikonSayisi25 = this.ICONLAR.length === 25;
      r.hedefTabani44 = this.MIN_HEDEF === 44;

      // ── 4: `settings` LİSTEDE OLMAMALI (kullanıcı isteği) ──
      let ayarVar = 0;
      for (let i = 0; i < this.ICONLAR.length; i++) if (this.ICONLAR[i].id === 'settings') ayarVar++;
      r.ayarListedeYok = ayarVar === 0;

      // ── 5: id/emoji/etiket TEKİL ve DOLU ──
      const gid = {}, gl = {};
      let tekrar = 0, bosAlan = 0;
      for (let i = 0; i < this.ICONLAR.length; i++) {
        const it = this.ICONLAR[i];
        if (gid[it.id]) tekrar++; gid[it.id] = true;
        if (gl[it.l]) tekrar++; gl[it.l] = true;
        if (!it.id || !it.e || !it.l) bosAlan++;
      }
      r.ikonlarTekil = tekrar === 0;
      r.ikonAlanlariDolu = bosAlan === 0;

      // ── 6: GRUPLAR tam kapsıyor (eksik/fazla/tekrar YOK) ──
      const gorulen = {};
      let grupTekrar = 0, grupBilinmeyen = 0, grupToplam = 0;
      for (let i = 0; i < this.GRUPLAR.length; i++) {
        const u = this.GRUPLAR[i].uyeler;
        for (let j = 0; j < u.length; j++) {
          grupToplam++;
          if (gorulen[u[j]]) grupTekrar++;
          gorulen[u[j]] = true;
          if (!gid[u[j]]) grupBilinmeyen++;
        }
      }
      let grupEksik = 0;
      for (let i = 0; i < this.ICONLAR.length; i++) if (!gorulen[this.ICONLAR[i].id]) grupEksik++;
      r.gruplarTamKapsiyor = grupTekrar === 0 && grupBilinmeyen === 0 &&
        grupEksik === 0 && grupToplam === 25;
      r.grupSayisi6 = this.GRUPLAR.length === 6;
      r._grup = { toplam: grupToplam, tekrar: grupTekrar, eksik: grupEksik, bilinmeyen: grupBilinmeyen };

      // ── 7: `js/ui.js` ile BİREBİR eşleşme (node'da dosya okunarak) ──
      (function (self) {
        const ui = self._uiIkonlari();
        if (!ui) { r.uiIleAyni = true; r._uiKaynak = 'atlandi (ui.js paneli bulunamadi/fs yok)'; return; }
        const uiMap = {};
        for (let i = 0; i < ui.length; i++) uiMap[ui[i].id] = ui[i];
        let hata = 0;
        const ornek = [];
        for (let i = 0; i < self.ICONLAR.length; i++) {
          const it = self.ICONLAR[i], u = uiMap[it.id];
          if (!u) { hata++; if (ornek.length < 5) ornek.push('eksik:' + it.id); continue; }
          if (u.e !== it.e) { hata++; if (ornek.length < 5) ornek.push('emoji:' + it.id); }
          if (u.l !== it.l) { hata++; if (ornek.length < 5) ornek.push('etiket:' + it.id); }
        }
        // ui.js'te bizde olmayan tek girdi `settings` OLMALI
        let fazla = 0;
        for (let i = 0; i < ui.length; i++) if (!gid[ui[i].id] && ui[i].id !== 'settings') fazla++;
        r.uiIleAyni = (hata === 0 && fazla === 0);
        r._uiKaynak = { uiGirdi: ui.length, hata: hata, fazla: fazla, ornek: ornek };
      })(this);

      // ── 8: 8 BOYUT × 11 KAYDIRMA — istisna / denge / hedef / taşma ──
      const s = { derinlik: 0, ciz: 0, metin: 0, grad: 0 };
      const ctx = this._sahteCtx(s);
      let cizimSifir = 0, dengesiz = 0, kucuk = 0, disari = 0;
      let tasan = 0, maxWsiz = 0, olcumSay = 0, cizimSay = 0;
      const ulasIkon = {};
      let ulasilmazBtn = 0;
      for (let bi = 0; bi < BOYUT.length; bi++) {
        const W = BOYUT[bi][0], H = BOYUT[bi][1];
        this._kay = {}; this._durum();
        this.ciz(ctx, W, H, 0.016);
        const ms = this._durum().maxScroll;
        const gorulenBtn = {}, tamBtn = {};
        for (let p = 0; p <= 10; p++) {
          this._durum().sc = ms * (p / 10);
          const d0 = s.derinlik, c0 = s.ciz;
          this._olcum = true; this._yazilar = [];
          this.ciz(ctx, W, H, 0.016);
          this._olcum = false;
          cizimSay++;
          if (s.derinlik !== d0) dengesiz++;
          if (s.ciz === c0) cizimSifir++;
          const L = this._btns || [];
          for (let i = 0; i < L.length; i++) {
            const b = L[i];
            gorulenBtn[b.id] = true;
            if (b.y < -9000 || b.h <= 0) continue;
            if (!b.kirpik && (b.w < 43.99 || b.h < 43.99)) kucuk++;
            if (b.x < -0.5 || b.x + b.w > W + 0.5) disari++;
            if (!b.kirpik && b.h >= 43.99) {
              tamBtn[b.id] = true;
              if (gid[b.id]) { if (!ulasIkon[b.id]) ulasIkon[b.id] = {}; ulasIkon[b.id][bi] = true; }
            }
          }
          for (let i = 0; i < this._yazilar.length; i++) {
            const t = this._yazilar[i];
            olcumSay++;
            if (!(t.maxW > 0) || !isFinite(t.maxW)) maxWsiz++;
            const w = Math.min(t.olculen, t.maxW);
            let sol = t.x;
            if (t.hiza === 'center') sol = t.x - w / 2;
            else if (t.hiza === 'right') sol = t.x - w;
            if (sol < -3 || sol + w > W + 3) tasan++;
          }
        }
        const gk = Object.keys(gorulenBtn);
        for (let i = 0; i < gk.length; i++) if (!tamBtn[gk[i]]) ulasilmazBtn++;
      }
      r._olcum = { cizim: cizimSay, metinOlcumu: olcumSay, boyut: BOYUT.length };
      r.istisnaYok = this._hataSay === 0;
      r._sonHata = this._sonHata || null;
      r.saveRestoreDengeli = dengesiz === 0;
      r.herKareCiziyor = cizimSifir === 0;
      r.hedef44 = kucuk === 0;
      r.butonEkranIci = disari === 0;
      r.maxWidthHepsinde = maxWsiz === 0;
      r.metinTasmasiYok = tasan === 0;
      r.tumButonlarUlasilir = ulasilmazBtn === 0;
      r._ulasilmazBtn = ulasilmazBtn;

      // ── 9: 25 İKONUN HEPSİ HER BOYUTTA KAYDIRMAYLA ERİŞİLEBİLİR ──
      let erisilemez = 0;
      const erisimOrnek = [];
      for (let i = 0; i < this.ICONLAR.length; i++) {
        const id = this.ICONLAR[i].id;
        for (let bi = 0; bi < BOYUT.length; bi++) {
          if (!ulasIkon[id] || !ulasIkon[id][bi]) {
            erisilemez++;
            if (erisimOrnek.length < 5) erisimOrnek.push(id + '@' + BOYUT[bi][0] + 'x' + BOYUT[bi][1]);
          }
        }
      }
      r.tumIkonlarErisilir = erisilemez === 0;
      r._erisim = { hata: erisilemez, ornek: erisimOrnek, beklenen: 25 * BOYUT.length };

      // ── 10: BUTON ÇAKIŞMASI ──
      let cakisma = 0;
      for (let bi = 0; bi < BOYUT.length; bi++) {
        this._kay = {}; this._durum();
        this.ciz(ctx, BOYUT[bi][0], BOYUT[bi][1], 0.016);
        const L = this.butonlar();
        for (let i = 0; i < L.length; i++) {
          for (let j = i + 1; j < L.length; j++) {
            const a = L[i], b = L[j];
            const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
            const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
            if (ox <= 0 || oy <= 0) continue;
            const kesisim = ox * oy;
            const kucukAlan = Math.min(a.w * a.h, b.w * b.h);
            if (kucukAlan > 0 && kesisim / kucukAlan > 0.35) cakisma++;
          }
        }
      }
      r.butonCakismaYok = cakisma === 0;
      r._cakisma = cakisma;

      // ── 11: TIKLAMA — 25 ikonun MERKEZİNE bas, doğru id dönüyor mu ──
      // (görünmeyeni kaydırarak görünür yap; her ikon en az 1 kez denenir)
      let isabetSay = 0, isabetHata = 0;
      const denendi = {};
      for (let bi = 0; bi < BOYUT.length; bi++) {
        const W = BOYUT[bi][0], H = BOYUT[bi][1];
        this._kay = {}; this._durum();
        this.ciz(ctx, W, H, 0.016);
        const ms = this._durum().maxScroll;
        for (let p = 0; p <= 10; p++) {
          this._durum().sc = ms * (p / 10);
          this.ciz(ctx, W, H, 0.016);
          const L = this.butonlar();
          for (let i = 0; i < L.length; i++) {
            const b = L[i];
            if (!gid[b.id] || b.h < 43.99) continue;
            isabetSay++; denendi[b.id] = true;
            const sonuc = this.tikla(b.x + b.w / 2, b.y + b.h / 2);
            if (!sonuc || sonuc.eylem !== 'ac' || sonuc.id !== b.id) isabetHata++;
          }
        }
      }
      let denenmeyen = 0;
      for (let i = 0; i < this.ICONLAR.length; i++) if (!denendi[this.ICONLAR[i].id]) denenmeyen++;
      r.tiklamaDogru = isabetHata === 0 && isabetSay > 0;
      r.her25IkonTiklandi = denenmeyen === 0;
      r._isabet = { deneme: isabetSay, hata: isabetHata, denenmeyen: denenmeyen };

      // ── 12: TIKLAMA TUTARLILIĞI (ızgara noktaları) ──
      let tutarsiz = 0, izgaraSay = 0;
      for (let bi = 0; bi < BOYUT.length; bi++) {
        const W = BOYUT[bi][0], H = BOYUT[bi][1];
        this._kay = {}; this._durum();
        this.ciz(ctx, W, H, 0.016);
        const L = this.butonlar();
        const noktalar = [[W * 0.5, H * 0.15], [W * 0.2, H * 0.4], [W * 0.8, H * 0.4],
          [W * 0.5, H * 0.7], [W * 0.5, H * 0.95], [W - 3, H - 3], [2, 2]];
        for (let i = 0; i < noktalar.length; i++) {
          izgaraSay++;
          const px = noktalar[i][0], py = noktalar[i][1];
          let bek = null;
          for (let j = 0; j < L.length; j++) {
            if (px >= L[j].x && px <= L[j].x + L[j].w && py >= L[j].y && py <= L[j].y + L[j].h) { bek = L[j].id; break; }
          }
          const sonuc = this.tikla(px, py);
          let geldi = null;
          if (sonuc) geldi = (sonuc.eylem === 'geri') ? 'etkinlik_geri' : sonuc.id;
          if (bek !== geldi) tutarsiz++;
        }
      }
      r.tiklamaTutarli = tutarsiz === 0 && izgaraSay === BOYUT.length * 7;
      r._tutarlilik = { nokta: izgaraSay, tutarsiz: tutarsiz };

      // ── 13: GERİ BUTONU + boş nokta ──
      this._kay = {}; this._durum();
      this.ciz(ctx, 390, 844, 0.016);
      const geri = this.tikla(28, 28);
      r.geriButonuCalisiyor = !!geri && geri.eylem === 'geri' && geri.id === undefined;
      r.tiklamaBosNokta = this.tikla(-50, -50) === null;

      // ── 14: KAYDIRMA SINIRLARI ──
      let kayHata = 0;
      for (let bi = 0; bi < BOYUT.length; bi++) {
        this._kay = {}; this._durum();
        this.ciz(ctx, BOYUT[bi][0], BOYUT[bi][1], 0.016);
        const ms = this._durum().maxScroll;
        if (this.kaydirma(-99999) !== 0) kayHata++;
        if (Math.abs(this.kaydirma(99999) - ms) > 0.001) kayHata++;
        this._durum().sc = 0;
      }
      r.kaydirmaSiniri = kayHata === 0;

      // ── 15: GRADYAN ÖNBELLEĞİ — 2. karede YENİ GRADYAN 0 ──
      const s2 = { derinlik: 0, ciz: 0, metin: 0, grad: 0 };
      const ctx2 = this._sahteCtx(s2);
      for (let bi = 0; bi < BOYUT.length; bi++) this.ciz(ctx2, BOYUT[bi][0], BOYUT[bi][1], 0.016);
      const g1 = s2.grad;
      for (let bi = 0; bi < BOYUT.length; bi++) this.ciz(ctx2, BOYUT[bi][0], BOYUT[bi][1], 0.016);
      const g2 = s2.grad - g1;
      r.gradientOnbellekli = g2 === 0;
      r._gradient = { ilkTur: g1, ikinciTur: g2, anahtar: Object.keys(this._grOnbellek).length };
      r.gradientAnahtarSinirIcinde = Object.keys(this._grOnbellek).length < this.MAKS_GRADIENT;

      // ── 16: KAYNAK TARAMASI (tuzak #1 · #7 · #8 · #9 · #11 · #12) ──
      const HARIC = ['selfTest', '_kaynakHaric', '_fnKaynak', '_sahteCtx', '_uiIkonlari'];
      const kSade = this._kaynakHaric(HARIC);
      r.fontTekYerde = !/\.font\s*=/.test(this._kaynakHaric(HARIC.concat(['_font'])));
      r.fontMinWH = /Math\.min\s*\(\s*H\s*\*\s*oran\s*,\s*W\s*\*\s*oran/.test(this._fnKaynak('_fontPx')) &&
        /_fontPx/.test(this._fnKaynak('_font'));
      r.fillTextTekYerde = !/\.fillText\s*\(/.test(this._kaynakHaric(HARIC.concat(['_yaz'])));
      r.maxWidthZorunlu = /fillText\s*\(\s*m\s*,\s*x\s*,\s*y\s*,\s*mw\s*\)/.test(this._fnKaynak('_yaz'));
      r.ellipseYok = !/\.ellipse\s*\(/.test(kSade);
      r.getImageDataYok = kSade.indexOf('getImageData') < 0;
      r.mathRandomYok = kSade.indexOf('Math.random') < 0;
      r.backtickYok = this._yorumsuz(kSade).indexOf(String.fromCharCode(96)) < 0;
      r.gradientKacakYok = !/create(Linear|Radial)Gradient\s*\(/.test(this._kaynakHaric(HARIC.concat(['_gr'])));
      r.dtBirikmesiYok = !/\+=\s*(this\.)?_?dt\b/.test(kSade);
      r.expYumusatma = /Math\.exp\s*\(/.test(this._fnKaynak('_yumusat'));
      r.dateNowKullaniliyor = /Date\.now\s*\(/.test(this._fnKaynak('_simdi'));
      // Ham `toUpperCase()` yalnız `_buyuk` içinde serbest
      r.hamToUpperCaseYok = !/\.toUpperCase\s*\(/.test(this._kaynakHaric(HARIC.concat(['_buyuk'])));

      // ── 17: TÜRKÇE BÜYÜK HARF ──
      this._buyukYol = null;
      const cift = [['i', 'İ'], ['ı', 'I'], ['ğ', 'Ğ'], ['ü', 'Ü'], ['ş', 'Ş'], ['ö', 'Ö'], ['ç', 'Ç']];
      let bhata = 0;
      for (let i = 0; i < cift.length; i++) if (this._buyuk(cift[i][0]) !== cift[i][1]) bhata++;
      r.turkceBuyukHarf = bhata === 0;
      r._buyukYolu = this._buyukYol;
      // Bu ekranda GERÇEKTEN basılan 7 başlık (6 grup + ekran adı)
      const bant = [
        ['Etkinlikler', 'ETKİNLİKLER'], ['İlerleme', 'İLERLEME'],
        ['Etkinlik ve Ödül', 'ETKİNLİK VE ÖDÜL'], ['Araç', 'ARAÇ'],
        ['Dünya', 'DÜNYA'], ['Sosyal', 'SOSYAL'], ['Kayıt', 'KAYIT']
      ];
      let banthata = 0;
      for (let i = 0; i < bant.length; i++) if (this._buyuk(bant[i][0]) !== bant[i][1]) banthata++;
      r.baslikBuyukHarfDogru = banthata === 0 && bant.length === 7;
      // Yedek eşleme yolunun KENDİSİ de doğru olmalı (ICU'suz motorda o çalışır)
      this._buyukYol = 'esleme';
      let yhata = 0;
      for (let i = 0; i < cift.length; i++) if (this._buyuk(cift[i][0]) !== cift[i][1]) yhata++;
      for (let i = 0; i < bant.length; i++) if (this._buyuk(bant[i][0]) !== bant[i][1]) yhata++;
      r.turkceBuyukYedekEsleme = yhata === 0;
      this._buyukYol = null;

      // ── 18: SIKIŞMA ORANI >= 0,85 ──
      let sikisan = 0, enKotu = 1, sikismaOlcum = 0;
      for (let bi = 0; bi < BOYUT.length; bi++) {
        this._kay = {}; this._durum();
        this.ciz(ctx, BOYUT[bi][0], BOYUT[bi][1], 0.016);
        const ms = this._durum().maxScroll;
        for (let p = 0; p <= 10; p++) {
          this._durum().sc = ms * (p / 10);
          this._olcum = true; this._yazilar = [];
          this.ciz(ctx, BOYUT[bi][0], BOYUT[bi][1], 0.016);
          this._olcum = false;
          for (let i = 0; i < this._yazilar.length; i++) {
            const t = this._yazilar[i];
            sikismaOlcum++;
            const o = (t.olculen > t.maxW && t.olculen > 0) ? (t.maxW / t.olculen) : 1;
            if (o < enKotu) enKotu = o;
            if (o < this.SIKISMA_ESIK - 1e-9) sikisan++;
          }
        }
      }
      r.sikismaEsikUstunde = sikisan === 0;
      r._sikisma = { olcum: sikismaOlcum, esikAlti: sikisan, enKotuOran: Math.round(enKotu * 1000) / 1000 };

      // ── 19: RENKLER 7 KARAKTER HEX (accent + '33') ──
      const hexRe = /^#[0-9a-fA-F]{6}$/;
      let hexHata = 0;
      const rk = Object.keys(this.RENK);
      for (let i = 0; i < rk.length; i++) if (!hexRe.test(this.RENK[rk[i]])) hexHata++;
      for (let i = 0; i < this.GRUPLAR.length; i++) if (!hexRe.test(this.GRUPLAR[i].renk)) hexHata++;
      r.renklerHex = hexHata === 0;
      r.hexTamKoruyor = this._hexTam('rgba(1,2,3,0.5)', '#123456') === '#123456' &&
        this._hexTam('#abc', '#123456') === '#123456' &&
        this._hexTam('#00ccff', '#123456') === '#00ccff';

      // ── 20: SÜTUN SAYISI GENİŞLİKTEN TÜRER (yatay ekran) ──
      r.yataySutun = this._sut(844) >= 6 && this._sut(926) >= 6 &&
        this._sut(360) >= 2 && this._sut(360) <= 3 && this._sut(360) < this._sut(844);

      // ── 21: KENDİ KAYDIRMASI VAR -> UI._KAYDIRMALI'ya EKLENMEMELİ ──
      const U = this._UIM();
      let kaydirmaliCakisma = 0;
      if (U && U._KAYDIRMALI && U._KAYDIRMALI[this.EKRAN]) kaydirmaliCakisma++;
      r.kaydirmaliListedeYok = kaydirmaliCakisma === 0;

      // ── 22: ROZET API — modül yokken de bool döner, çökmez ──
      const rzT = typeof this.rozet('rewards') === 'boolean' &&
        typeof this.rozet('career') === 'boolean' &&
        typeof this.rozet('yokBoyleId') === 'boolean';
      r.rozetApi = rzT && this.rozetSayi('yokBoyleId') === 0;
      // 🔴 `hazir()` HİÇ çağrılmadan da çalışmalı (menüden sorulabilir)
      (function (self) {
        const y = self._onbellek; self._onbellek = null;
        let ok = false;
        try { ok = (typeof self.rozet('rewards') === 'boolean') && (self.rozetToplam() >= 0); }
        catch (e) { ok = false; }
        self._onbellek = y;
        r.rozetHazirsizCalisiyor = ok;
      })(this);
      r._rozet = {
        rewards: this.rozetSayi('rewards'), career: this.rozetSayi('career'),
        toplam: this.rozetToplam(),
        modul: { Rewards: !!this._RW(), Career: !!this._CR() }
      };
      r.rozetCokmuyor = this._hataSay === 0;

      // ── 23: GİZLİ (kırpılmış) BUTON DIŞARI SIZMIYOR ──
      let sizinti = 0;
      const L2 = this.butonlar();
      for (let i = 0; i < L2.length; i++) if (L2[i].y < -9000 || L2[i].h <= 0) sizinti++;
      r.gizliButonSizmiyor = sizinti === 0;

      // ── 24: ctx YOKKEN çökmüyor ──
      r.ctxsizGuvenli = this.ciz(null, 390, 844, 0.016) === false;

    } catch (e) {
      r._catch = String(e && e.stack ? e.stack : e);
      r.istisnaYok = false;
    } finally {
      this._btns = yedek.btns; this._kay = yedek.kay; this._onbellek = yedek.onb;
      this._grOnbellek = yedek.gr; this._grCtx = yedek.grCtx; this._hataSay = yedek.hata;
      this._testZaman = yedek.zaman; this._kaydirmaBagli = yedek.bagli;
      this._basiliId = yedek.basiliId; this._basiliT = yedek.basiliT;
      this._olcum = false;
    }

    r.allPass = Object.keys(r).every(function (k) {
      return k === 'allPass' || k.charAt(0) === '_' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') window.Etkinlikler = Etkinlikler;
if (typeof module !== 'undefined' && module.exports) module.exports = Etkinlikler;
