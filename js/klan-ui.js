'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KlanUI — KLAN SİSTEMİ ARAYÜZÜ   (Ajan G · KLAN-SOZLESME.md §1)

   8 ekran: klan · klanEtkinlik · klanSavas · klanMagaza · klanUyeler ·
            klanAyar · klanKutu · klanPano (DUYURU PANOSU — sohbet YOK).

   Kaynak: "Klan sistemi.txt" BÖLÜM 15 (UI/UX layout) + BÖLÜM 37 (animasyonlar).

   🔴 BU DOSYA HİÇBİR VERİ MODÜLÜNE BAĞIMLI DEĞİL. `Klan`/`KlanSim`/`KlanKutu`/
      `KlanEtkinlik`/`KlanSavas` yoksa ekranlar "modül yok" kartıyla çizilir,
      ÇÖKMEZ (selfTest bunu node'da modülsüz ÖLÇEREK doğrular).

   ── PROJE TUZAKLARINA UYUM (sözleşme §8) ─────────────────────────────────
   #1  `ctx.font` YALNIZ `_font()` içinde atanır ve DAİMA
       `Math.min(H tabanlı, W tabanlı)`; `ctx.fillText` YALNIZ `_yaz()` içinde
       ve DAİMA `maxWidth` ile çağrılır. selfTest kaynağı regex ile tarar.
   #2  Kaydırılan listede hitbox kırpma: `_kirp()` (ui.js `_kirpButonlar`
       deseni). Kırpılan buton `y = -9999` ile ölür → yanlış isabet YOK.
   #3  Dokunma hedefi ≥ 44 px — `_btn()` merkeze göre büyüterek GARANTİ eder.
       (Bu ekranlar `UI.buttons`'a yazmadığı için `js/mobilhedef.js`'ten
       yararlanamaz; hedefler burada tutulur.)
   #4  8 EKRANIN HEPSİNİN KENDİ KAYDIRMASI VAR → hiçbiri `UI._KAYDIRMALI`'ya
       EKLENMEZ (iki kaydırma üst üste biner). Bkz. `kaydirmaBagla()`.
   #5  Renkler HEX (#rrggbb). Vurgu rengine `+ '33'` alfa eklendiği için
       `_hexTam()` 7 karakter ZORUNLU kılar; `rgba()`/kısa hex reddedilir.
   #6  `dt * sabit` YOK → `1 - Math.exp(-oran*dt)`. Zamanlı animasyonlar
       `Date.now()` ile ölçülür (dt biriktirme YASAK — `js/intro.js` bu yüzden
       takılmıştı).
   #7  Önbelleksiz gradient YOK (`_gr()`), `getImageData` YOK.
       Gradyanlar YEREL uzayda (translate sonrası 0..h) üretilir → anahtar
       kaydırmayla DEĞİŞMEZ, kare başına yeni gradient 0 (selfTest ölçer).
   #8  `ctx.ellipse` YOK → `_oval()` (save + scale + arc + restore).
   #9  Template literal / backtick YOK (selfTest kaynakta arar).
   #10 Bare global'ler `typeof` ile alınır, `window.X` ile DEĞİL.
   #11 Metin Türkçe; baş/son boşluk ve emoji birebir korunur (i18n sonra).
   #12 `Math.random` YOK — tüm parçacıklar tohumlu (`_rng`/`_hash32`).
   #13 Parçacık sayısı `MAKS_PARCACIK` ile sınırlı ve ömrü bitince liste
       BOŞALTILIR (`UI._toasts` 159 elemana çıkıp bellek sızdırmıştı).

   ── DIŞA VERİLEN API (ana oturum bağlayacak — imza KESİN) ────────────────
     KlanUI.EKRANLAR
     KlanUI.ciz(ctx, W, H, ekran, dt)
     KlanUI.tikla(x, y, ekran)      -> {eylem, veri} | null
     KlanUI.butonlar(ekran)         -> [{x,y,w,h,id}]
     KlanUI.kaydirma(ekran, delta)
     KlanUI.hazir()
     KlanUI.selfTest()
   ═══════════════════════════════════════════════════════════════════════ */

const KlanUI = {
  ad: 'klanUI',
  surum: '1.0',

  EKRANLAR: ['klan', 'klanEtkinlik', 'klanSavas', 'klanMagaza',
    'klanUyeler', 'klanAyar', 'klanKutu', 'klanPano'],

  // ───────────────────────── SABİTLER ─────────────────────────
  UST: 56,              // sabit başlık şeridi
  MIN_HEDEF: 44,        // dokunma hedefi tabanı
  // 🔴 `fillText(..., maxWidth)` metni YATAYDA EZER. 0,85'in altına düşen bir
  //    sıkışma harfleri okunmaz hale getirir (CLAUDE.md 29 Tmz kuralı:
  //    "tek başına maxWidth metni aşırı sıkıştırır"). Bu eşiğin altında metin
  //    sıkıştırılmaz, `…` ile KESİLİR. selfTest oranı ÖLÇER.
  SIKISMA_ESIK: 0.85,
  LORE_MAKS_SATIR: 8,   // 500 karakterlik lore ~8 satıra sığar (ayar ekranı)
  KENAR: 10,
  BOSLUK: 8,
  MAKS_PARCACIK: 60,
  MAKS_GRADIENT: 240,
  ANIM_KUTU_MS: 2600,   // §37.2/D — sallanma 900 · ışık 400 · ödül 900 · bekleme
  ANIM_SEVIYE_MS: 2000, // §37.2/E

  // 🔴 HEPSİ 7 KARAKTER HEX — `+ '33'` alfa eklendiği için ZORUNLU (tuzak #5)
  RENK: {
    kart: '#161a2e', kartAlt: '#0b0d1a', cizgi: '#2a3350', serit: '#0d1122',
    metin: '#e6ebf5', metin2: '#8fa3b0', metin3: '#5d6b86',
    vurgu: '#00ccff', kp: '#e8d23a', iyi: '#48c48a', kotu: '#e0553a',
    uyari: '#e8b23a', kilit: '#5d6b86', bar: '#1b2138'
  },
  PALET: [
    '#00ccff', '#ff8800', '#00cc44', '#aa22ff', '#ffd700', '#ff3d00',
    '#44ddff', '#ff5fa2', '#7cff3d', '#5b8cff', '#ffb020', '#00e5c0'
  ],
  // KlanSavas.AMBLEM_EMOJI ile AYNI SIRA (aynı klan aynı amblemi göstersin)
  AMBLEM: ['\u{1F981}', '⚡', '\u{1F6E1}️', '\u{1F525}', '⚔️', '\u{1F3C1}',
    '\u{1F40E}', '\u{1F985}', '\u{1F433}', '\u{1F31F}', '\u{1F480}', '\u{1F3AF}'],

  // 🔴 EKRANA ÇIKAN HER METİN TÜRKÇE — iç kimlikler (enum) ASLA ham basılmaz.
  //    Mağaza `periyot` alanı ASCII id'dir ('aylik'/'haftalik'/...); ham
  //    basılınca ekranda "aylik yenilenir" görünüyordu.
  PERIYOT_AD: {
    gunluk: 'Günlük', haftalik: 'Haftalık', aylik: 'Aylık', sezonluk: 'Sezonluk'
  },
  // Özel gün rozeti — HER GÜNE KENDİ İKONU (sabit 🎃 yazılıydı; "🎃 Yaz
  // Festivali" çıkıyordu). Asıl kaynak `KlanEtkinlik.OZEL_GUN[id].ikon`;
  // bu tablo yalnız modül eski sürümdeyse devreye girer.
  OZEL_GUN_IKON: {
    cadilar: '\u{1F383}', yilbasi: '\u{1F384}', yaz: '\u{1F31E}', yildonumu: '\u{1F382}'
  },

  ROL_AD: { lider: 'Lider', yardimci: 'Yardımcı', subay: 'Subay', uye: 'Üye', caylak: 'Çaylak' },
  ROL_RENK: { lider: '#e8b23a', yardimci: '#c46ae8', subay: '#3aa0e8', uye: '#8fa3b0', caylak: '#5d6b86' },
  ROL_IKON: { lider: '\u{1F451}', yardimci: '⭐', subay: '\u{1F396}️', uye: '\u{1F464}', caylak: '\u{1F331}' },
  ROL_SIRA: ['lider', 'yardimci', 'subay', 'uye', 'caylak'],

  TIP_IKON: {
    sistem: '\u{1F4E2}', seviye: '⬆️', savas: '⚔️', etkinlik: '\u{1F3C1}',
    basarim: '\u{1F3C5}', kutu: '\u{1F381}', gorev: '\u{1F4CB}', sezon: '\u{1F342}'
  },
  TIP_RENK: {
    sistem: '#8fa3b0', seviye: '#48c48a', savas: '#e0553a', etkinlik: '#3aa0e8',
    basarim: '#e8b23a', kutu: '#c46ae8', gorev: '#00e5c0', sezon: '#e08a3a'
  },

  BASLIK: {
    klan: '\u{1F6E1}️  KLAN',
    klanEtkinlik: '\u{1F3C1}  KLAN ETKİNLİĞİ',
    klanSavas: '⚔️  KLAN SAVAŞI',
    klanMagaza: '\u{1F6D2}  KLAN MAĞAZASI',
    klanUyeler: '\u{1F465}  ÜYELER',
    klanAyar: '⚙️  KLAN AYARLARI',
    klanKutu: '\u{1F381}  KLAN KUTULARI',
    klanPano: '\u{1F4E2}  DUYURU PANOSU'
  },
  _CIZ: {
    klan: '_cizKlan', klanEtkinlik: '_cizEtkinlik', klanSavas: '_cizSavas',
    klanMagaza: '_cizMagaza', klanUyeler: '_cizUyeler', klanAyar: '_cizAyar',
    klanKutu: '_cizKutu', klanPano: '_cizPano'
  },
  // Ana sayfadaki sekme şeridi (§15.2 — "Sohbet" sekmesi PANO ile değişti)
  SEKME: [
    { e: 'klanEtkinlik', ad: 'ETKİNLİK', ikon: '\u{1F3C1}', kilit: 'etkinlik' },
    { e: 'klanSavas', ad: 'SAVAŞ', ikon: '⚔️', kilit: 'savas' },
    { e: 'klanMagaza', ad: 'MAĞAZA', ikon: '\u{1F6D2}', kilit: 'magaza' },
    { e: 'klanUyeler', ad: 'ÜYELER', ikon: '\u{1F465}', kilit: null },
    { e: 'klanKutu', ad: 'KUTU', ikon: '\u{1F381}', kilit: null },
    { e: 'klanPano', ad: 'PANO', ikon: '\u{1F4E2}', kilit: null },
    { e: 'klanAyar', ad: 'AYAR', ikon: '⚙️', kilit: null }
  ],

  // ───────────────────────── DURUM ─────────────────────────
  _btns: null,          // { ekran: [ {id,x,y,w,h,veri} ] }
  _kay: null,           // { ekran: {sc, maxScroll, viewH, viewTop, icerikH} }
  _anim: null,          // { ekran: {...} }
  _onbellek: null,      // veri modülü çağrılarının TTL önbelleği
  _grOnbellek: null, _grCtx: null,
  _parcacik: null,
  _kutuAnim: null,
  _seviyeAnim: null,
  _rolPanel: null,
  _hataSay: 0,
  _sonFont: 12,
  _dt: 0.016,
  _olcum: false, _yazilar: null, _olcW: 0, _olcH: 0,
  _testZaman: null,
  _kaynakOnbellek: null,
  _hazirlandi: false,
  _kaydirmaBagli: false,

  // ═══════════════════════════════════════════════════════════════
  //  TEMEL YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },
  _sayi(v, vars) { const n = Number(v); return isFinite(n) ? n : (vars || 0); },
  _kis(v, alt, ust) { return v < alt ? alt : (v > ust ? ust : v); },
  // 7 karakter HEX ZORUNLU — kısa hex '#abc' + '33' geçersiz renk üretir (tuzak #5)
  _hexTam(renk, varsayilan) {
    return (typeof renk === 'string' && renk.charAt(0) === '#' && renk.length === 7)
      ? renk : varsayilan;
  },
  _rng(tohum) {
    let s = (tohum | 0) || 1;
    return function () {
      s = Math.imul(s ^ (s >>> 15), 1 | s);
      s ^= s + Math.imul(s ^ (s >>> 7), 61 | s);
      return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
    };
  },
  _hash32(metin) {
    const m = String(metin == null ? '' : metin);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < m.length; i++) { h ^= m.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },

  // Bare global erişimi (tuzak #10) — window.X ile DEĞİL
  _K() { try { return (typeof Klan !== 'undefined' && Klan) ? Klan : null; } catch (e) { return null; } },
  _S() { try { return (typeof KlanSim !== 'undefined' && KlanSim) ? KlanSim : null; } catch (e) { return null; } },
  _KU() { try { return (typeof KlanKutu !== 'undefined' && KlanKutu) ? KlanKutu : null; } catch (e) { return null; } },
  _E() { try { return (typeof KlanEtkinlik !== 'undefined' && KlanEtkinlik) ? KlanEtkinlik : null; } catch (e) { return null; } },
  _SV() { try { return (typeof KlanSavas !== 'undefined' && KlanSavas) ? KlanSavas : null; } catch (e) { return null; } },
  _UIM() { try { return (typeof UI !== 'undefined' && UI) ? UI : null; } catch (e) { return null; } },

  // Veri modülü çağrıları PAHALIDIR (KlanSim 500 bot üretir) → TTL önbellek.
  _veriAl(anahtar, ttl, fn) {
    const t = this._simdi();
    const c = this._onbellek[anahtar];
    if (c && (t - c.t) < ttl && (t - c.t) >= 0) return c.v;
    let v = null;
    try { v = fn(); } catch (e) { this._hataSay++; v = null; }
    this._onbellek[anahtar] = { t: t, v: v };
    return v;
  },
  onbellegiTemizle() { this._onbellek = {}; this._kaynakOnbellek = null; return true; },

  // ── Metin biçimleyiciler ────────────────────────────────────────
  _sayiMetni(n) {
    let v = Math.round(this._sayi(n, 0));
    const eksi = v < 0; if (eksi) v = -v;
    let s = String(v), o = '';
    while (s.length > 3) { o = '.' + s.slice(-3) + o; s = s.slice(0, -3); }
    return (eksi ? '-' : '') + s + o;
  },
  _sureMetni(ms) {
    let s = Math.max(0, Math.floor(this._sayi(ms, 0) / 1000));
    const g = Math.floor(s / 86400); s -= g * 86400;
    const sa = Math.floor(s / 3600); s -= sa * 3600;
    const d = Math.floor(s / 60); s -= d * 60;
    if (g > 0) return g + 'g ' + sa + 's';
    if (sa > 0) return sa + 's ' + d + 'd';
    if (d > 0) return d + 'd ' + s + 'sn';
    return s + 'sn';
  },
  _gecenMetni(t) {
    const d = this._simdi() - this._sayi(t, 0);
    if (d < 60000) return 'şimdi';
    if (d < 3600000) return Math.floor(d / 60000) + ' dk önce';
    if (d < 86400000) return Math.floor(d / 3600000) + ' sa önce';
    return Math.floor(d / 86400000) + ' gün önce';
  },

  // ═══════════════════════════════════════════════════════════════
  //  TÜRKÇE BÜYÜK HARF — 🔴 `toUpperCase()` DİLDEN BAĞIMSIZDIR
  // ═══════════════════════════════════════════════════════════════
  // JS `'i'.toUpperCase()` -> 'I' (noktasız). Türkçede 'i' -> 'İ', 'ı' -> 'I'.
  // Başlık şeritleri bu yüzden "GIZLILIK · KLAN EFSANESI · HAFTALIK ETKINLIK"
  // diye çıkıyordu (PNG'de görüldü). `toLocaleUpperCase('tr')` doğrusunu verir
  // ama her JS motorunda ICU tam derlenmiş olmayabilir → YEDEK EŞLEME şart.
  // Hangi yolun kullanıldığı `_buyukYol` ile ÖLÇÜLÜR (selfTest okur).
  _TR_BUYUK: {
    'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç'
  },
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
  // 🔴 `KlanSavas.uiVerisi()` klan adlarını `toUpperCase()` ile döndürüyor
  //    (klan-savas.js:1311 / 1319) → ekranda "TÜRK ŞAHINLERI". O dosya bu iş
  //    kapsamında DEĞİŞTİRİLEMEZ; ama HAM ad hâlâ elimizde: kendi klanımız
  //    `Klan.al().ad`, rakip `KlanSavas.durum().aktif.rakip.ad`. Noktalar
  //    kaybolduktan sonra geri getirilemeyeceği için HAM addan yeniden
  //    büyütülür; ham ad yoksa gelen değer olduğu gibi basılır.
  _klanAdBuyuk(hamAd, hazirAd) {
    const ham = String(hamAd == null ? '' : hamAd).trim();
    if (ham.length) return this._buyuk(ham);
    return String(hazirAd == null ? '' : hazirAd);
  },
  // İlk harfi Türkçe kuralıyla büyüt (bilinmeyen kimlikler için).
  _basHarf(metin) {
    const m = String(metin == null ? '' : metin).replace(/_/g, ' ');
    if (!m.length) return m;
    return this._buyuk(m.charAt(0)) + m.slice(1);
  },

  // ═══════════════════════════════════════════════════════════════
  //  METİN GENİŞLİĞİ · KESME · KELİME KAYDIRMA
  // ═══════════════════════════════════════════════════════════════
  _genislik(ctx, m) {
    const s = String(m == null ? '' : m);
    try { return this._sayi(ctx.measureText(s).width, s.length * this._sonFont * 0.55); }
    catch (e) { return s.length * this._sonFont * 0.55; }
  },
  // Metni `maxW`'ye SIĞDIR: sonuna '…' koyarak ikili aramayla kısalt.
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
  // 🔴 KELİME KAYDIRMA — ÖLÇEREK (karakter sayısıyla DEĞİL). Sığmayan artık
  //    kalırsa SON SATIR '…' ile kesilir; metin sessizce kaybolmaz.
  _sarMetin(ctx, metin, maxW, maksSatir) {
    const m = String(metin == null ? '' : metin).replace(/\s+/g, ' ').trim();
    const mw = Math.max(8, this._sayi(maxW, 40));
    const n = Math.max(1, Math.floor(this._sayi(maksSatir, 1)));
    if (!m.length) return [''];
    const kel = m.split(' ');
    const o = [];
    let s = '', i = 0;
    while (i < kel.length && o.length < n) {
      const d = s.length ? (s + ' ' + kel[i]) : kel[i];
      if (!s.length || this._genislik(ctx, d) <= mw) { s = d; i++; continue; }
      o.push(s); s = '';
    }
    if (o.length < n && s.length) { o.push(s); s = ''; }
    if (!o.length) o.push('');
    // Artık kaldıysa son satırı kısalt ve '…' koy
    const kalan = (i < kel.length) || s.length > 0;
    const son = o.length - 1;
    for (let j = 0; j < o.length; j++) o[j] = this._kesSigdir(ctx, o[j], mw);
    if (kalan && o[son].charAt(o[son].length - 1) !== '…') {
      o[son] = this._kesSigdir(ctx, o[son] + ' …', mw);
    }
    return o;
  },

  // ═══════════════════════════════════════════════════════════════
  //  FONT + METİN — 🔴 TEK GİRİŞ NOKTASI (tuzak #1)
  // ═══════════════════════════════════════════════════════════════
  // `H * oran` TEK BAŞINA YASAK: dar-uzun telefonda (360×800) metni taşırır.
  // Doğrusu min(H tabanlı, W tabanlı).
  _fontPx(W, H, oran) {
    return Math.max(9, Math.round(Math.min(H * oran, W * oran * 1.15)));
  },
  // `mutlakPx` yalnız emoji/amblem gibi kutu boyutuna bağlı çizimler içindir;
  // orada da ekranın küçük kenarıyla SINIRLANIR (taşma olmasın).
  _font(ctx, W, H, oran, kalin, mutlakPx) {
    const px = (mutlakPx != null)
      ? Math.max(9, Math.round(Math.min(this._sayi(mutlakPx, 12), Math.min(H, W) * 0.5)))
      : this._fontPx(W, H, oran);
    ctx.font = (kalin ? 'bold ' : '') + px + 'px Arial';
    this._sonFont = px;
    return px;
  },
  // 🔴 `maxWidth` DAİMA verilir. Tek başına font küçültmek başka dilde yetmez,
  //    tek başına maxWidth metni aşırı sıkıştırır → İKİSİ BİRDEN.
  _yaz(ctx, metin, x, y, maxW) {
    let m = String(metin == null ? '' : metin);
    const mw = Math.max(8, this._sayi(maxW, 40));
    // 🔴 SIKIŞMA KORUMASI. `fillText`'in 4. argümanı metni yatayda EZER; oran
    //    `SIKISMA_ESIK`in altına düşerse harfler okunmaz olur (ana ekrandaki
    //    lore 526 px'ten 338 px'e = %64 basılmıştı). Ölçüm ucuz olsun diye
    //    önce kaba bir üst sınır bakılır: hiçbir Arial glifi 1,25 em'i geçmez,
    //    yani tahmin ≤ mw ise metin KESİNLİKLE sığar ve measureText çağrılmaz.
    if (m.length * this._sonFont * 1.25 > mw) {
      const ol0 = this._genislik(ctx, m);
      if (ol0 > 0 && (mw / ol0) < this.SIKISMA_ESIK) m = this._kesSigdir(ctx, m, mw);
    }
    ctx.fillText(m, x, y, mw);
    if (this._olcum) {
      let ol = mw;
      try { ol = this._sayi(ctx.measureText(m).width, mw); } catch (e) { ol = mw; }
      this._yazilar.push({ m: m, x: x, y: y, maxW: mw, hiza: ctx.textAlign || 'left', olculen: ol, W: this._olcW, oran: ol > mw ? (mw / ol) : 1 });
    }
    return mw;
  },

  // ═══════════════════════════════════════════════════════════════
  //  İÇ KİMLİK -> EKRAN ADI  (enum sızıntısı KAPATILIR)
  // ═══════════════════════════════════════════════════════════════
  // ⚠ `MapSettings` bare global DEĞİL — `js/mapsettings.js` onu YALNIZ
  //    `window.MapSettings` olarak yayınlar (IIFE içinde). Tuzak #10'un tersi:
  //    burada İKİSİNE DE bakmak ZORUNLU (yalnız `typeof` bakınca harita adı
  //    bulunamadı ve ekranda "Desert" kaldı — PNG'de görüldü).
  _MS() {
    try { if (typeof MapSettings !== 'undefined' && MapSettings) return MapSettings; } catch (e) { }
    try { if (typeof window !== 'undefined' && window && window.MapSettings) return window.MapSettings; } catch (e) { }
    return null;
  },
  // Harita kimliği ('desert') -> oyunun KENDİ Türkçe adı ('🏜️ Çöl').
  // Kaynak: `MapSettings.MAPS_META` (51 harita; `js/mapsettings.js` META tablosu
  // — `Terrain.MAPS` sözlükte AD TUTMAZ, yalnız kimlik + fizik parametresi).
  // Ad yoksa kimlik alt çizgisiz ve baş harfi büyük basılır (ham id ASLA).
  _haritaAd(id, ikonlu) {
    const h = String(id == null ? '' : id).trim();
    if (!h.length) return '—';
    const M = this._MS();
    const meta = (M && M.MAPS_META) ? M.MAPS_META[h] : null;
    if (meta && meta.theme) return (ikonlu && meta.emoji ? (meta.emoji + '  ') : '') + String(meta.theme);
    return this._basHarf(h);
  },
  // Kutu türü ('efsanevi') -> `KlanKutu.KUTULAR[tur].ad` ('Efsanevi Kutu').
  _kutuAd(tur) {
    const t = String(tur == null ? '' : tur).trim();
    if (!t.length) return '—';
    const KU = this._KU();
    const cfg = (KU && KU.KUTULAR) ? KU.KUTULAR[t] : null;
    if (cfg && cfg.ad) return String(cfg.ad);
    return this._basHarf(t);
  },
  // Mağaza yenilenme periyodu ('aylik') -> 'Aylık'
  _periyotAd(p) {
    const k = String(p == null ? '' : p).trim();
    if (!k.length) return '';
    return this.PERIYOT_AD[k] || this._basHarf(k);
  },

  // ═══════════════════════════════════════════════════════════════
  //  ÖNBELLEKLİ GRADYAN (tuzak #7)
  // ═══════════════════════════════════════════════════════════════
  // 🔴 Gradyanlar YEREL uzayda (translate sonrası 0..h) üretilir; anahtar
  //    yalnız YÜKSEKLİK + RENKLERden oluşur → kaydırınca anahtar DEĞİŞMEZ.
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
  _kart(ctx, x, y, w, h, accent, aktif) {
    const r = 10;
    const ac = this._hexTam(accent, null);
    ctx.save();
    ctx.translate(x, y);
    // ⚠ Pasif kartın dolgusu accent'e BAĞLI DEĞİL → anahtara accent KOYMA,
    //   yoksa önbellek anahtar uzayı gereksiz büyür.
    const anah = (aktif && ac) ? ('kA' + Math.round(h) + ac) : ('kP' + Math.round(h));
    const g = this._gr(ctx, anah, 0, 0, 0, h,
      (aktif && ac) ? [[0, ac + '33'], [1, '#0e1020']] : [[0, this.RENK.kart], [1, this.RENK.kartAlt]]);
    ctx.fillStyle = g;
    this._yuvarlak(ctx, 0, 0, w, h, r); ctx.fill();
    if (ac) { ctx.fillStyle = ac; this._yuvarlak(ctx, 0, 0, 5, h, r); ctx.fill(); }
    ctx.strokeStyle = (aktif && ac) ? ac : this.RENK.cizgi;
    ctx.lineWidth = aktif ? 1.6 : 1;
    this._yuvarlak(ctx, 0.5, 0.5, w - 1, h - 1, r); ctx.stroke();
    ctx.restore();
  },
  _cubuk(ctx, x, y, w, h, oran, renk) {
    ctx.fillStyle = this.RENK.bar;
    this._yuvarlak(ctx, x, y, w, h, h / 2); ctx.fill();
    const o = this._kis(this._sayi(oran, 0), 0, 1);
    if (o > 0) {
      ctx.fillStyle = this._hexTam(renk, this.RENK.vurgu);
      this._yuvarlak(ctx, x, y, Math.max(h, w * o), h, h / 2); ctx.fill();
    }
  },
  _rozet(ctx, W, H, x, y, w, h, metin, renk, dolu) {
    const c = this._hexTam(renk, this.RENK.vurgu);
    ctx.fillStyle = dolu ? c : (c + '22');
    this._yuvarlak(ctx, x, y, w, h, Math.min(9, h / 2)); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 1;
    this._yuvarlak(ctx, x + 0.5, y + 0.5, w - 1, h - 1, Math.min(9, h / 2)); ctx.stroke();
    this._font(ctx, W, H, 0.019, true);
    ctx.fillStyle = dolu ? '#0b0d1a' : c;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, metin, x + w / 2, y + h / 2, w - 8);
  },
  _arka(ctx, W, H) {
    const g = this._gr(ctx, 'bg' + Math.round(H), 0, 0, 0, H,
      [[0, '#0a0a18'], [0.45, '#12162a'], [1, '#050510']]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  // Klan amblemi — §37.2/A "yavaşça parlar ve döner (360° / 60 sn)"
  _amblemCiz(ctx, W, H, cx, cy, r, ix, renk1, renk2) {
    const t = this._simdi();
    const aci = ((t % 60000) / 60000) * Math.PI * 2;         // 🔴 Date.now — dt biriktirme YOK
    const parla = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t / 1500));
    const c1 = this._hexTam(renk1, '#e8b23a'), c2 = this._hexTam(renk2, '#3aa0e8');
    ctx.save();
    ctx.translate(cx, cy);
    const g = this._gr(ctx, 'am' + Math.round(r) + c1 + c2, 0, -r, 0, r, [[0, c1], [1, c2]]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = parla * 0.5;
    ctx.strokeStyle = c1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r - 2, aci, aci + Math.PI * 1.2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
    const i = Math.abs(Math.floor(this._sayi(ix, 0))) % this.AMBLEM.length;
    this._font(ctx, W, H, 0.030, false, Math.max(12, Math.round(r * 1.05)));
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, this.AMBLEM[i], cx, cy + 1, r * 2);
  },

  // ═══════════════════════════════════════════════════════════════
  //  DÜZEN YARDIMCILARI
  // ═══════════════════════════════════════════════════════════════
  // 🔴 Sütun sayısı GENİŞLİKTEN türetilir, `H` kesirinden DEĞİL
  //    (paintshop yatayda `H` kesirleriyle blokları üst üste bindirmişti).
  _sut(W) { return Math.max(1, Math.min(3, Math.floor(W / 340))); },
  _izgara(W, adet, kartH, bosluk) {
    const P = this.KENAR, b = this._sayi(bosluk, this.BOSLUK);
    const sut = this._sut(W);
    const kw = Math.floor((W - P * 2 - (sut - 1) * b) / sut);
    const satir = Math.ceil(Math.max(0, adet) / sut);
    return {
      sut: sut, kw: kw, satir: satir, h: satir * (kartH + b),
      kx: function (i) { return P + (i % sut) * (kw + b); },
      ky: function (i) { return Math.floor(i / sut) * (kartH + b); }
    };
  },

  _durum(ekran) {
    if (!this._kay[ekran]) {
      this._kay[ekran] = { sc: 0, maxScroll: 0, viewH: 0, viewTop: this.UST, icerikH: 0 };
    }
    return this._kay[ekran];
  },
  _an(ekran) {
    if (!this._anim[ekran]) this._anim[ekran] = {};
    return this._anim[ekran];
  },
  // 🔴 `dt * sabit` KARE HIZINA BAĞLIDIR → 1 - exp(-oran*dt)
  _yumusat(mevcut, hedef, oran, dt) {
    const d = this._kis(this._sayi(dt, 0.016), 0.0005, 0.25);
    const k = 1 - Math.exp(-this._sayi(oran, 8) * d);
    const m = this._sayi(mevcut, hedef);
    return m + (this._sayi(hedef, 0) - m) * k;
  },

  _btn(ekran, id, x, y, w, h, veri) {
    let L = this._btns[ekran];
    if (!L) L = this._btns[ekran] = [];
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
  // Kaydırılan listede kutuyu görünür alana KIRP (tuzak #2).
  _kirp(ekran, bas, ust, alt) {
    const L = this._btns[ekran] || [];
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
    ctx.fillStyle = '#141a2c';
    this._yuvarlak(ctx, W - 6, ust + 4, 4, trkH, 2); ctx.fill();
    ctx.fillStyle = this.RENK.vurgu;
    this._yuvarlak(ctx, W - 6, thY, 4, thH, 2); ctx.fill();
  },

  // ═══════════════════════════════════════════════════════════════
  //  BAŞLIK ŞERİDİ + GÖVDE
  // ═══════════════════════════════════════════════════════════════
  _baslikCiz(ctx, W, H, ekran) {
    const u = this.UST;
    ctx.fillStyle = this.RENK.serit; ctx.fillRect(0, 0, W, u);
    ctx.fillStyle = this.RENK.cizgi; ctx.fillRect(0, u - 1, W, 1);

    // Geri
    this._btn(ekran, 'klan_geri', 4, 4, 48, 48, { ekran: ekran });
    this._font(ctx, W, H, 0.028, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, '◀', 28, u / 2, 40);

    // KP rozeti (sağ)
    const K = this._K();
    const kpVar = !!(K && K.var && K.var());
    const kpW = Math.min(140, Math.max(84, Math.round(W * 0.28)));
    if (kpVar) {
      const kp = this._sayi(K.kp ? K.kp() : 0, 0);
      const bx = W - kpW - 6, by = 8, bh = u - 16;
      ctx.fillStyle = '#1a1d30';
      this._yuvarlak(ctx, bx, by, kpW, bh, 9); ctx.fill();
      ctx.strokeStyle = this.RENK.kp; ctx.lineWidth = 1;
      this._yuvarlak(ctx, bx + 0.5, by + 0.5, kpW - 1, bh - 1, 9); ctx.stroke();
      this._font(ctx, W, H, 0.022, true);
      ctx.fillStyle = this.RENK.kp; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      this._yaz(ctx, '\u{1FA99} ' + this._sayiMetni(kp) + ' KP', W - 12, u / 2, kpW - 12);
    }

    this._font(ctx, W, H, 0.026, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, this.BASLIK[ekran] || 'KLAN', 58, u / 2, Math.max(40, W - 58 - (kpVar ? kpW + 12 : 12)));
  },

  _govde(ctx, W, H, ekran) {
    const ust = this.UST;
    const viewH = Math.max(40, H - ust);
    const st = this._durum(ekran);
    st.viewH = viewH; st.viewTop = ust;
    st.sc = this._kis(this._sayi(st.sc, 0), 0, this._sayi(st.maxScroll, 0));
    const bas = (this._btns[ekran] || []).length;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, ust, W, viewH); ctx.clip();
    let icerikH = 0;
    const fnAd = this._CIZ[ekran];
    // Üretimde tek bir ekran hatası tüm oyunu durdurmasın; selfTest `_hataSay`
    // sayacını ÖLÇER (0 olmalı) — yani hata sessizce yutulmuş olmaz.
    try { icerikH = this._sayi(this[fnAd](ctx, W, H, ust - st.sc), 0); }
    catch (e) { this._hataSay++; this._sonHata = String(e && e.message ? e.message : e); }
    ctx.restore();
    st.icerikH = Math.max(0, icerikH);
    st.maxScroll = Math.max(0, st.icerikH - viewH + 12);
    st.sc = this._kis(st.sc, 0, st.maxScroll);
    this._kirp(ekran, bas, ust, ust + viewH);
    this._kaydirmaCubugu(ctx, W, ust, viewH, st);
    return icerikH;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ANİMASYONLAR (§37) — hepsi Date.now tabanlı ya da exp-yumuşatmalı
  // ═══════════════════════════════════════════════════════════════
  // §37.3 — parçacık sayısı SINIRLI, ömrü bitince liste BOŞALTILIR.
  konfetiBaslat(tohumMetin, adet) {
    const rnd = this._rng(this._hash32(String(tohumMetin == null ? 'konfeti' : tohumMetin)));
    const n = Math.min(this.MAKS_PARCACIK, Math.max(1, Math.floor(this._sayi(adet, 40))));
    const t0 = this._simdi();
    this._parcacik = [];
    for (let i = 0; i < n; i++) {
      this._parcacik.push({
        x: rnd(), y: 0.18 + rnd() * 0.10,
        vx: (rnd() - 0.5) * 0.55, vy: -0.30 - rnd() * 0.35,
        r: this.PALET[Math.floor(rnd() * this.PALET.length) % this.PALET.length],
        t0: t0, omur: 2400 + rnd() * 900, don: rnd() * 6.283
      });
    }
    return this._parcacik.length;
  },
  _parcacikCiz(ctx, W, H) {
    const L = this._parcacik;
    if (!L || !L.length) return 0;
    const t = this._simdi();
    let canli = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      const yas = (t - p.t0) / p.omur;
      if (yas >= 1 || yas < 0) continue;
      canli++;
      const s = (t - p.t0) / 1000;
      const px = (p.x + p.vx * s) * W;
      const py = (p.y + p.vy * s + 0.5 * 0.60 * s * s) * H;
      ctx.save();
      ctx.globalAlpha = 1 - yas;
      ctx.fillStyle = p.r;
      ctx.translate(px, py); ctx.rotate(p.don + s * 3);
      ctx.fillRect(-3, -5, 6, 10);
      ctx.restore();
    }
    if (!canli) this._parcacik = [];    // 🔴 sınırsız büyüme YOK
    return canli;
  },

  // §37.2/D — kutu açma: sallanma → ışık patlaması → ödül belirme
  kutuAcmaBaslat(kutuId, tur, odul, renk) {
    this._kutuAnim = {
      id: String(kutuId == null ? '' : kutuId), tur: String(tur == null ? 'katilim' : tur),
      odul: odul == null ? null : odul, renk: this._hexTam(renk, '#e8b23a'), t0: this._simdi()
    };
    this.konfetiBaslat('kutu:' + this._kutuAnim.id + ':' + this._kutuAnim.tur, 44);
    return this._kutuAnim;
  },
  kutuAsamasi() {
    const a = this._kutuAnim;
    if (!a) return null;
    const g = this._simdi() - a.t0;
    if (g < 0 || g > this.ANIM_KUTU_MS) return null;
    if (g < 900) return 'sallanma';
    if (g < 1300) return 'isik';
    if (g < 2200) return 'odul';
    return 'bitis';
  },
  // §37.2/E — seviye atlama
  seviyeAtlamaBaslat(seviye) {
    this._seviyeAnim = { sv: Math.max(1, Math.floor(this._sayi(seviye, 1))), t0: this._simdi() };
    this.konfetiBaslat('seviye:' + this._seviyeAnim.sv, 50);
    return this._seviyeAnim;
  },

  _ustKatman(ctx, W, H, ekran) {
    const asama = this.kutuAsamasi();
    if (asama) { this._kutuAnimCiz(ctx, W, H, ekran, asama); return; }
    if (this._kutuAnim) this._kutuAnim = null;
    if (this._seviyeAnim) {
      const g = this._simdi() - this._seviyeAnim.t0;
      if (g >= 0 && g <= this.ANIM_SEVIYE_MS) { this._seviyeAnimCiz(ctx, W, H, g); return; }
      this._seviyeAnim = null;
    }
    if (this._rolPanel) { this._rolPanelCiz(ctx, W, H, ekran); return; }
    this._parcacikCiz(ctx, W, H);
  },

  _kutuAnimCiz(ctx, W, H, ekran, asama) {
    const a = this._kutuAnim;
    const g = this._simdi() - a.t0;
    // Modal: alttaki butonlar tıklanmasın → liste sıfırlanır, tek kapatma butonu
    this._btns[ekran] = [];
    ctx.fillStyle = '#050510'; ctx.save(); ctx.globalAlpha = 0.82;
    ctx.fillRect(0, 0, W, H); ctx.restore();

    const cx = W / 2, cy = H * 0.42;
    const boy = Math.max(60, Math.min(140, Math.round(Math.min(H * 0.18, W * 0.30))));
    // sallanma (§37.2/D) — Date.now tabanlı, dt biriktirme YOK
    const sal = (asama === 'sallanma') ? Math.sin(g / 55) * (0.14 * (1 - g / 900)) : 0;
    if (asama === 'isik' || asama === 'odul' || asama === 'bitis') {
      const p = this._kis((g - 900) / 400, 0, 1);
      ctx.save(); ctx.globalAlpha = 0.55 * (1 - p * 0.5);
      ctx.fillStyle = a.renk;
      this._oval(ctx, cx, cy, boy * (0.8 + p * 2.2), boy * (0.8 + p * 2.2));
      ctx.restore();
    }
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(sal);
    ctx.fillStyle = a.renk;
    this._yuvarlak(ctx, -boy / 2, -boy / 2, boy, boy, 12); ctx.fill();
    ctx.fillStyle = '#0b0d1a';
    ctx.fillRect(-boy / 2, -6, boy, 12);
    ctx.restore();

    this._font(ctx, W, H, 0.030, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'KUTU AÇILIYOR', cx, cy + boy * 0.9, W - 40);
    if (asama === 'odul' || asama === 'bitis') {
      const p = this._kis((g - 1300) / 500, 0, 1);
      ctx.save(); ctx.globalAlpha = p;
      this._font(ctx, W, H, 0.034, true);
      ctx.fillStyle = this.RENK.kp;
      const od = (a.odul && a.odul.kp != null) ? ('+' + this._sayiMetni(a.odul.kp) + ' KP') : '+KP';
      this._yaz(ctx, od, cx, cy + boy * 0.9 + 38 * p, W - 40);
      ctx.restore();
    }
    this._parcacikCiz(ctx, W, H);
    this._btn(ekran, 'klan_anim_kapat', 0, 0, W, H, { anim: 'kutu' });
  },

  _seviyeAnimCiz(ctx, W, H, g) {
    const p = this._kis(g / this.ANIM_SEVIYE_MS, 0, 1);
    const sv = this._seviyeAnim.sv;
    const renk = sv >= 40 ? '#e8d23a' : sv >= 30 ? '#c46ae8' : sv >= 20 ? '#e8b23a' : sv >= 10 ? '#c9d2da' : '#48c48a';
    ctx.save(); ctx.globalAlpha = 0.55 * (1 - p);
    ctx.fillStyle = renk;
    this._oval(ctx, W / 2, H * 0.40, 40 + p * W * 0.7, 40 + p * W * 0.7);
    ctx.restore();
    this._font(ctx, W, H, 0.045, true);
    ctx.save(); ctx.globalAlpha = 1 - p * 0.5;
    ctx.fillStyle = renk; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'SEVİYE ' + sv, W / 2, H * 0.40, W - 40);
    ctx.restore();
    this._parcacikCiz(ctx, W, H);
  },

  // ═══════════════════════════════════════════════════════════════
  //  ROL DEĞİŞTİRME PANELİ (modal)
  // ═══════════════════════════════════════════════════════════════
  // ⚠ `_drawLangPicker` deseni: liste SIFIRLANIR, tam ekran kapatma butonu
  //   EN SONA eklenir (hit-test ilk eşleşeni döndürür).
  _rolPanelCiz(ctx, W, H, ekran) {
    const p = this._rolPanel;
    this._btns[ekran] = [];
    ctx.save(); ctx.globalAlpha = 0.82; ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H); ctx.restore();
    const pw = Math.min(W - 24, 360);
    const ph = 5 * 52 + 96;
    const px = (W - pw) / 2, py = Math.max(this.UST + 6, (H - ph) / 2);
    this._kart(ctx, px, py, pw, ph, this.RENK.vurgu, true);
    this._font(ctx, W, H, 0.028, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'ROL SEÇ', px + pw / 2, py + 26, pw - 20);
    this._font(ctx, W, H, 0.021, false);
    ctx.fillStyle = this.RENK.metin2;
    this._yaz(ctx, String(p.ad || ''), px + pw / 2, py + 50, pw - 20);
    for (let i = 0; i < this.ROL_SIRA.length; i++) {
      const rol = this.ROL_SIRA[i];
      const by = py + 68 + i * 52;
      const secili = (rol === p.rol);
      this._kart(ctx, px + 10, by, pw - 20, 46, this.ROL_RENK[rol], secili);
      this._font(ctx, W, H, 0.024, true);
      ctx.fillStyle = secili ? this.RENK.metin : this.RENK.metin2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, this.ROL_IKON[rol] + '  ' + this.ROL_AD[rol], px + 24, by + 23, pw - 60);
      this._btn(ekran, 'klan_rol_ata', px + 10, by, pw - 20, 46, { uyeId: p.uyeId, rol: rol });
    }
    this._btn(ekran, 'klan_rol_kapat', 0, 0, W, H, {});   // EN SONA
  },
  rolPaneliAc(uyeId, ad, rol) {
    this._rolPanel = { uyeId: String(uyeId), ad: String(ad == null ? '' : ad), rol: String(rol || 'uye') };
    return this._rolPanel;
  },
  rolPaneliKapat() { this._rolPanel = null; return true; },

  // ═══════════════════════════════════════════════════════════════
  //  DIŞA AÇIK API
  // ═══════════════════════════════════════════════════════════════
  hazir() {
    if (!this._btns) this._btns = {};
    if (!this._kay) this._kay = {};
    if (!this._anim) this._anim = {};
    if (!this._onbellek) this._onbellek = {};
    if (!this._parcacik) this._parcacik = [];
    if (!this._grOnbellek) this._grOnbellek = {};
    for (let i = 0; i < this.EKRANLAR.length; i++) {
      const e = this.EKRANLAR[i];
      if (!this._btns[e]) this._btns[e] = [];
      this._durum(e); this._an(e);
    }
    this._hazirlandi = true;
    // ⚠ `UI` bu modülden SONRA yüklenmiş olabilir → bağlanana kadar dene.
    if (!this._kaydirmaBagli) this.kaydirmaBagla();
    return true;
  },

  // 🔴 8 EKRANIN HEPSİ KENDİ KAYDIRMASINI TUTAR → `UI._KAYDIRMALI`'ya
  //    EKLENMEZ. Buradaki bağlama merkezi yumuşatmayı (28 ara kare +
  //    fırlatma ataleti) bedavaya getirir.
  kaydirmaBagla() {
    if (this._kaydirmaBagli) return false;
    const U = this._UIM();
    if (!U || typeof U._dokunmatikKaydirma !== 'function') return false;
    const self = this;
    for (let i = 0; i < this.EKRANLAR.length; i++) {
      const e = this.EKRANLAR[i];
      try {
        U._dokunmatikKaydirma('klanui_' + e,
          function () { return U.currentScreen === e; },
          function () { const st = self._durum(e); return { viewH: st.viewH, maxScroll: st.maxScroll, viewTop: st.viewTop }; },
          function () { return self._durum(e).sc; },
          function (v) { self._durum(e).sc = v; });
      } catch (err) { this._hataSay++; }
    }
    this._kaydirmaBagli = true;
    return true;
  },

  ciz(ctx, W, H, ekran, dt) {
    if (!ctx) return false;
    this.hazir();
    const e = (this.EKRANLAR.indexOf(ekran) >= 0) ? ekran : this.EKRANLAR[0];
    const w = Math.max(200, this._sayi(W, 360)), h = Math.max(200, this._sayi(H, 640));
    this._btns[e] = [];
    this._olcW = w; this._olcH = h;
    this._dt = this._kis(this._sayi(dt, 0.016), 0.0005, 0.25);
    this._arka(ctx, w, h);
    this._baslikCiz(ctx, w, h, e);
    this._govde(ctx, w, h, e);
    this._ustKatman(ctx, w, h, e);
    return true;
  },

  tikla(x, y, ekran) {
    const L = this._btns ? this._btns[ekran] : null;
    if (!L || !L.length) return null;
    const px = this._sayi(x, -1), py = this._sayi(y, -1);
    for (let i = 0; i < L.length; i++) {
      const b = L[i];
      if (b.y < -9000 || b.h <= 0) continue;
      if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
        return { eylem: b.id, veri: b.veri || {} };
      }
    }
    return null;
  },

  butonlar(ekran) {
    const L = this._btns ? this._btns[ekran] : null;
    if (!L) return [];
    const o = [];
    for (let i = 0; i < L.length; i++) {
      const b = L[i];
      if (b.y < -9000 || b.h <= 0) continue;
      o.push({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, veri: b.veri });
    }
    return o;
  },

  kaydirma(ekran, delta) {
    if (this.EKRANLAR.indexOf(ekran) < 0) return 0;
    this.hazir();
    const st = this._durum(ekran);
    st.sc = this._kis(this._sayi(st.sc, 0) + this._sayi(delta, 0), 0, this._sayi(st.maxScroll, 0));
    return st.sc;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ORTAK BÖLÜM PARÇALARI
  // ═══════════════════════════════════════════════════════════════
  _bant(ctx, W, H, y, metin, renk) {
    const c = this._hexTam(renk, this.RENK.vurgu);
    ctx.fillStyle = c; ctx.fillRect(this.KENAR, y + 6, 3, 14);
    this._font(ctx, W, H, 0.021, true);
    ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // 🔴 `toUpperCase()` DEĞİL — Türkçede 'i' -> 'İ' (bkz. `_buyuk`).
    this._yaz(ctx, this._buyuk(metin), this.KENAR + 10, y + 13, W - this.KENAR * 2 - 14);
    return 28;
  },
  _bilgiKart(ctx, W, H, y, metin, alt, renk) {
    const kw = W - this.KENAR * 2;
    const h = alt ? 78 : 58;
    this._kart(ctx, this.KENAR, y, kw, h, renk || this.RENK.kilit, false);
    this._font(ctx, W, H, 0.024, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, metin, this.KENAR + 16, y + (alt ? 26 : h / 2), kw - 30);
    if (alt) {
      this._font(ctx, W, H, 0.020, false);
      ctx.fillStyle = this.RENK.metin2;
      this._yaz(ctx, alt, this.KENAR + 16, y + 52, kw - 30);
    }
    return h + this.BOSLUK;
  },
  // Sol etiket / sağ değer satırı
  _satir(ctx, W, H, x, y, w, etiket, deger, renk) {
    this._font(ctx, W, H, 0.020, false);
    ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, etiket, x, y, w * 0.55);
    this._font(ctx, W, H, 0.021, true);
    ctx.fillStyle = this._hexTam(renk, this.RENK.metin); ctx.textAlign = 'right';
    this._yaz(ctx, deger, x + w, y, w * 0.45);
  },
  _modulYok(ctx, W, H, y0, modulAd) {
    let y = y0 + 12;
    y += this._bilgiKart(ctx, W, H, y, '⚠ ' + modulAd + ' modülü yüklü değil',
      'Bu ekran veri modülü bağlandığında dolar.', this.RENK.uyari);
    return y - y0;
  },

  // ═══════════════════════════════════════════════════════════════
  //  1) `klan` — ANA SAYFA (§15.2 layout)
  // ═══════════════════════════════════════════════════════════════
  _cizKlan(ctx, W, H, y0) {
    const K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;

    if (!K) return this._modulYok(ctx, W, H, y0, 'Klan');

    if (!K.var()) {
      // ── KLANI YOK: KUR / ARA ──
      const heroH = Math.max(120, Math.min(190, Math.round(Math.min(H * 0.26, W * 0.44))));
      this._kart(ctx, P, y, kw, heroH, this.RENK.vurgu, true);
      this._amblemCiz(ctx, W, H, W / 2, y + heroH * 0.36, Math.min(40, heroH * 0.24), 4, '#00ccff', '#5b8cff');
      this._font(ctx, W, H, 0.032, true);
      ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, 'HENÜZ BİR KLANDA DEĞİLSİN', W / 2, y + heroH * 0.70, kw - 24);
      this._font(ctx, W, H, 0.020, false);
      ctx.fillStyle = this.RENK.metin2;
      this._yaz(ctx, 'Klan kur ya da var olan bir klana katıl.', W / 2, y + heroH * 0.86, kw - 24);
      y += heroH + this.BOSLUK;

      const bh = 52, iki = kw >= 300;
      const bw = iki ? Math.floor((kw - this.BOSLUK) / 2) : kw;
      this._kart(ctx, P, y, bw, bh, '#48c48a', true);
      this._font(ctx, W, H, 0.026, true);
      ctx.fillStyle = '#48c48a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, '\u{1F6E1}️  KLAN KUR', P + bw / 2, y + bh / 2, bw - 16);
      this._btn('klan', 'klan_kur', P, y, bw, bh, {});
      const ax = iki ? (P + bw + this.BOSLUK) : P, ay = iki ? y : (y + bh + this.BOSLUK);
      this._kart(ctx, ax, ay, bw, bh, '#3aa0e8', true);
      this._font(ctx, W, H, 0.026, true);
      ctx.fillStyle = '#3aa0e8'; ctx.textAlign = 'center';
      this._yaz(ctx, '\u{1F50D}  KLAN ARA', ax + bw / 2, ay + bh / 2, bw - 16);
      this._btn('klan', 'klan_ara', ax, ay, bw, bh, {});
      y = (iki ? y + bh : ay + bh) + this.BOSLUK;

      const ucret = this._sayi(K.KURMA_UCRETI, 5000), minSv = this._sayi(K.MIN_SEVIYE, 5);
      y += this._bilgiKart(ctx, W, H, y, 'Klan kurmak: ' + this._sayiMetni(ucret) + ' Altın',
        'En az oyuncu seviyesi ' + minSv + '. Ayrıldıktan sonra 24 saat beklenir.', this.RENK.uyari);
      return y - y0 + 10;
    }

    // ── BANNER (§15.2) ──
    const oz = this._veriAl('ozet', 400, function () { return K.ozet(); }) || { var: false };
    const k = K.al() || {};
    const renk1 = this._hexTam(k.renk1, '#e8b23a'), renk2 = this._hexTam(k.renk2, '#3aa0e8');
    const bH = Math.max(104, Math.min(160, Math.round(Math.min(H * 0.21, W * 0.36))));
    ctx.save(); ctx.translate(P, y);
    const bg = this._gr(ctx, 'bn' + Math.round(bH) + renk1 + renk2, 0, 0, 0, bH,
      [[0, renk1 + '55'], [0.55, '#12162a'], [1, renk2 + '33']]);
    ctx.fillStyle = bg; this._yuvarlak(ctx, 0, 0, kw, bH, 12); ctx.fill();
    ctx.strokeStyle = renk1; ctx.lineWidth = 1.4;
    this._yuvarlak(ctx, 0.5, 0.5, kw - 1, bH - 1, 12); ctx.stroke();
    ctx.restore();
    // §37.2/A — banner rüzgârda sallanır (yalnız YATAY kayma; metin translate
    // İÇİNE alınmaz, ölçüm dürüst kalsın diye koordinata eklenir)
    const sway = Math.sin(this._simdi() / 1400) * 3;
    const amR = Math.min(30, bH * 0.24);
    this._amblemCiz(ctx, W, H, P + 16 + amR + sway * 0.4, y + 14 + amR, amR, k.amblem, renk1, renk2);
    const adX = P + 16 + amR * 2 + 12;
    this._font(ctx, W, H, 0.030, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, String(k.ad || 'KLAN'), adX + sway, y + 22, kw - (adX - P) - 96);
    this._font(ctx, W, H, 0.021, true);
    ctx.fillStyle = renk1;
    this._yaz(ctx, '[' + String(k.etiket || '---') + ']', adX + sway, y + 46, 120);
    // 🔴 LORE: SIKIŞTIRMA DEĞİL KELİME KAYDIRMA. Tek satıra basılınca 526 px
    //    metin 338 px'e eziliyordu (harfler %64 genişlik). İki satıra sarılır,
    //    sığmayan artık `_sarMetin` tarafından '…' ile kesilir.
    this._font(ctx, W, H, 0.019, false);
    ctx.fillStyle = this.RENK.metin2;
    const lore = String(k.lore || '').length ? String(k.lore) : 'En iyi olmak için yarışıyoruz!';
    const loreSat = this._sarMetin(ctx, lore, kw - 32, 2);
    for (let li = 0; li < loreSat.length; li++) {
      this._yaz(ctx, loreSat[li], P + 16, y + bH - 30 + li * 16, kw - 32);
    }

    // Lig rozeti (sağ üst) — KlanSim 500 bot üretir → 4 sn TTL önbellek
    const S = this._S();
    let ligOz = null;
    if (S) {
      const puan = this._sayi(k.ligPuan, 0);
      ligOz = this._veriAl('ligOzet:' + puan, 4000, function () { return S.ligOzeti(null, puan); });
    }
    if (ligOz) {
      const rw = Math.min(126, Math.max(80, Math.round(kw * 0.34))), rh = 34;
      this._rozet(ctx, W, H, P + kw - rw - 10, y + 10, rw, rh,
        String(ligOz.ligAd || '') + ' #' + this._sayiMetni(ligOz.siralama), renk1, false);
    }
    y += bH + this.BOSLUK;

    // ── SEKME ŞERİDİ ──
    const sekAdet = this.SEKME.length;
    const sut = (W < 560) ? 4 : sekAdet;
    const sw = Math.floor((kw - (sut - 1) * 6) / sut), sh = 48;
    for (let i = 0; i < sekAdet; i++) {
      const s = this.SEKME[i];
      const sx = P + (i % sut) * (sw + 6);
      const sy = y + Math.floor(i / sut) * (sh + 6);
      const acik = !s.kilit || (K.ozellikAcik ? K.ozellikAcik(s.kilit) === true : false);
      this._kart(ctx, sx, sy, sw, sh, acik ? this.PALET[i % this.PALET.length] : this.RENK.kilit, false);
      this._font(ctx, W, H, 0.022, false, Math.min(18, sw * 0.36));
      ctx.fillStyle = acik ? this.RENK.metin : this.RENK.kilit;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, acik ? s.ikon : '\u{1F512}', sx + sw / 2, sy + 16, sw - 6);
      this._font(ctx, W, H, 0.016, true);
      ctx.fillStyle = acik ? this.RENK.metin2 : this.RENK.kilit;
      this._yaz(ctx, s.ad, sx + sw / 2, sy + 36, sw - 4);
      this._btn('klan', 'klan_git', sx, sy, sw, sh, { ekran: s.e, acik: acik });
    }
    y += Math.ceil(sekAdet / sut) * (sh + 6) + 2;

    // ── SEVİYE + XP + KP KARTI ──
    const sk = 96;
    this._kart(ctx, P, y, kw, sk, renk1, true);
    this._font(ctx, W, H, 0.026, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'SEVİYE ' + this._sayi(oz.seviye, 1), P + 16, y + 22, kw * 0.5);
    this._font(ctx, W, H, 0.019, false);
    ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'right';
    this._yaz(ctx, String(oz.ozellik || ''), P + kw - 14, y + 22, kw * 0.46);
    // §37.2/A — XP çubuğu dolma animasyonu (exp yumuşatma, dt*sabit DEĞİL)
    const an = this._an('klan');
    const hedefOran = this._kis(this._sayi(oz.xpOran, 0), 0, 1);
    an.xp = this._yumusat(an.xp == null ? hedefOran : an.xp, hedefOran, 6, this._dt);
    this._cubuk(ctx, P + 14, y + 36, kw - 28, 12, an.xp, renk1);
    this._font(ctx, W, H, 0.018, false);
    ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, this._sayiMetni(oz.xpMevcut) + ' / ' + this._sayiMetni(oz.xpGerekli) + ' XP',
      P + 16, y + 60, kw * 0.5);
    ctx.textAlign = 'right'; ctx.fillStyle = this.RENK.kp;
    this._yaz(ctx, '\u{1FA99} ' + this._sayiMetni(oz.kp) + ' KP', P + kw - 14, y + 60, kw * 0.44);
    const sag = oz.saglik || {};
    this._satir(ctx, W, H, P + 16, y + 80, kw - 32,
      '\u{1F465} ' + this._sayi(oz.uyeSayisi, 0) + ' / ' + this._sayi(oz.kapasite, 20) + '  ·  ödül ×' + this._sayi(oz.odulCarpani, 1).toFixed(2),
      String(sag.ad || '—'), this._hexTam(sag.renk, this.RENK.metin2));
    y += sk + this.BOSLUK;

    // ── HAFTALIK ETKİNLİK KARTI ──
    y += this._kartEtkinlikOzet(ctx, W, H, y, 'klan');
    // ── SAVAŞ KARTI ──
    y += this._kartSavasOzet(ctx, W, H, y, 'klan');
    // ── ÜYE LİDERLİK TABLOSU (ilk 4) ──
    y += this._kartUyeOzet(ctx, W, H, y, 'klan');
    return y - y0 + 12;
  },

  _kartEtkinlikOzet(ctx, W, H, y, ekran) {
    const P = this.KENAR, kw = W - P * 2, K = this._K(), E = this._E();
    const bas = y;
    y += this._bant(ctx, W, H, y, '\u{1F4CA} Haftalık Etkinlik', '#3aa0e8');
    const acik = !!(K && K.ozellikAcik && K.ozellikAcik('etkinlik'));
    if (!acik || !E) {
      y += this._bilgiKart(ctx, W, H, y, '\u{1F512} Etkinlik seviye 4te açılır',
        E ? null : 'KlanEtkinlik modülü bağlı değil', this.RENK.kilit);
      return y - bas;
    }
    const h = this._veriAl('etkHafta', 3000, function () { return E.hafta(); });
    const il = this._veriAl('etkIlerleme', 1000, function () { return E.ilerleme(); });
    if (!h || !il) { y += this._bilgiKart(ctx, W, H, y, 'Etkinlik verisi yok', null, this.RENK.uyari); return y - bas; }
    const kh = 122;
    const ac = this._hexTam(h.renk, '#3aa0e8');
    this._kart(ctx, P, y, kw, kh, ac, true);
    this._font(ctx, W, H, 0.026, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, String(h.ikon) + '  ' + String(h.turAd), P + 16, y + 22, kw - 120);
    this._font(ctx, W, H, 0.019, false);
    ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'right';
    this._yaz(ctx, '⏱ ' + this._sayi(il.kalanSaat, 0) + ' sa', P + kw - 14, y + 22, 96);
    ctx.textAlign = 'left'; ctx.fillStyle = this.RENK.metin2;
    this._yaz(ctx, String(h.kural), P + 16, y + 44, kw - 30);
    const k = K.al() || {};
    const puan = this._sayi(k.haftalikPuan, 0);
    const S = this._S();
    let sira = 0;
    if (S) {
      const oz = this._veriAl('ligOzet:' + this._sayi(k.ligPuan, 0), 4000, function () { return S.ligOzeti(null, this._sayi(k.ligPuan, 0)); }.bind(this));
      sira = oz ? this._sayi(oz.siralama, 0) : 0;
    }
    this._satir(ctx, W, H, P + 16, y + 66, kw - 32,
      'Klan Puanı: ' + this._sayiMetni(puan), sira ? ('Sıralama #' + this._sayiMetni(sira)) : '—', ac);
    this._cubuk(ctx, P + 14, y + 80, kw - 28, 10, this._sayi(il.oran, 0), ac);
    const bw = Math.min(140, kw - 28), bh = 30;
    this._font(ctx, W, H, 0.022, true);
    ctx.fillStyle = ac; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'KATIL', P + kw / 2, y + 104, bw - 10);
    this._btn(ekran, 'klan_etkinlik_katil', P + (kw - bw) / 2, y + 104 - bh / 2, bw, bh, {});
    y += kh + this.BOSLUK;
    return y - bas;
  },

  _kartSavasOzet(ctx, W, H, y, ekran) {
    const P = this.KENAR, kw = W - P * 2, K = this._K(), SV = this._SV();
    const bas = y;
    y += this._bant(ctx, W, H, y, '\u{1F3C6} Klan Savaşı', '#e0553a');
    const acik = !!(K && K.ozellikAcik && K.ozellikAcik('savas'));
    if (!acik || !SV) {
      y += this._bilgiKart(ctx, W, H, y, '\u{1F512} Savaş seviye 15te açılır',
        SV ? null : 'KlanSavas modülü bağlı değil', this.RENK.kilit);
      return y - bas;
    }
    const ui = this._veriAl('savasUi', 800, function () { return SV.uiVerisi(); });
    if (!ui) {
      y += this._bilgiKart(ctx, W, H, y, 'Aktif savaş yok', 'Savaş ekranından yeni savaş başlat.', '#e0553a');
      const bw = Math.min(160, kw), bh = 44;
      this._btn(ekran, 'klan_savas_detay', P + (kw - bw) / 2, y - this.BOSLUK - 44, bw, bh, {});
      return y - bas;
    }
    const kh = 108;
    this._kart(ctx, P, y, kw, kh, this._hexTam(ui.myClan.color, '#e8b23a'), true);
    // 🔴 `uiVerisi()` adı `toUpperCase()` ile veriyor ("ASI KAŞIFLER") → ham
    //    addan Türkçe kuralıyla yeniden büyüt (bkz. `_klanAdBuyuk`).
    const durOz = this._veriAl('savasDurum', 1500, function () { return SV.durum(); });
    const rkOz = (durOz && durOz.aktif && durOz.aktif.rakip) ? durOz.aktif.rakip.ad : null;
    this._font(ctx, W, H, 0.022, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'Rakip: ' + this._klanAdBuyuk(rkOz, ui.enemyClan.name), P + 16, y + 22, kw - 110);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ff8800';
    this._yaz(ctx, '⏱ ' + String(ui.timeLeft), P + kw - 14, y + 22, 100);
    this._savasBar(ctx, W, H, P + 14, y + 40, kw - 28, 16, ui, 'klanOzet');
    this._font(ctx, W, H, 0.021, true);
    ctx.fillStyle = this._hexTam(ui.myClan.color, '#e8b23a'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, this._sayiMetni(ui.myClan.score), P + 16, y + 70, kw * 0.4);
    ctx.fillStyle = this._hexTam(ui.enemyClan.color, '#3aa0e8'); ctx.textAlign = 'right';
    this._yaz(ctx, this._sayiMetni(ui.enemyClan.score), P + kw - 14, y + 70, kw * 0.4);
    const bw = Math.min(140, kw - 28), bh = 30;
    this._font(ctx, W, H, 0.022, true);
    ctx.fillStyle = '#e0553a'; ctx.textAlign = 'center';
    this._yaz(ctx, 'DETAY', P + kw / 2, y + 90, bw - 10);
    this._btn(ekran, 'klan_savas_detay', P + (kw - bw) / 2, y + 90 - bh / 2, bw, bh, {});
    y += kh + this.BOSLUK;
    return y - bas;
  },

  // §37.2/C — "iki çubuk yarışır, önde olan parlar" (exp yumuşatma)
  _savasBar(ctx, W, H, x, y, w, h, ui, anahtar) {
    const an = this._an('klanSavas');
    const top = Math.max(1, this._sayi(ui.myClan.score, 0) + this._sayi(ui.enemyClan.score, 0));
    const hedef = this._kis(this._sayi(ui.myClan.score, 0) / top, 0, 1);
    const k = 'oran_' + anahtar;
    an[k] = this._yumusat(an[k] == null ? hedef : an[k], hedef, 5, this._dt);
    const c1 = this._hexTam(ui.myClan.color, '#e8b23a'), c2 = this._hexTam(ui.enemyClan.color, '#3aa0e8');
    ctx.fillStyle = c2; this._yuvarlak(ctx, x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = c1; this._yuvarlak(ctx, x, y, Math.max(h, w * an[k]), h, h / 2); ctx.fill();
    ctx.strokeStyle = '#0b0d1a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w * an[k], y); ctx.lineTo(x + w * an[k], y + h); ctx.stroke();
  },

  _kartUyeOzet(ctx, W, H, y, ekran) {
    const P = this.KENAR, kw = W - P * 2, K = this._K();
    const bas = y;
    y += this._bant(ctx, W, H, y, '\u{1F465} Üye Liderlik Tablosu', '#48c48a');
    const uyeler = this._uyeSirali();
    if (!uyeler.length) { y += this._bilgiKart(ctx, W, H, y, 'Üye yok', null, this.RENK.kilit); return y - bas; }
    const n = Math.min(4, uyeler.length), rh = 46;
    for (let i = 0; i < n; i++) {
      const u = uyeler[i];
      const ry = y + i * (rh + 4);
      this._kart(ctx, P, ry, kw, rh, this.ROL_RENK[u.rol] || '#8fa3b0', i === 0);
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, '#' + (i + 1) + '  ' + (this.ROL_IKON[u.rol] || '') + ' ' + String(u.ad),
        P + 14, ry + rh / 2, kw * 0.58);
      this._font(ctx, W, H, 0.020, true);
      ctx.fillStyle = this.RENK.kp; ctx.textAlign = 'right';
      this._yaz(ctx, this._sayiMetni(u.haftalikKatki) + ' puan', P + kw - 14, ry + rh / 2, kw * 0.38);
    }
    y += n * (rh + 4) + 2;
    const bw = Math.min(170, kw), bh = 44;
    this._kart(ctx, P + (kw - bw) / 2, y, bw, bh, '#48c48a', false);
    this._font(ctx, W, H, 0.022, true);
    ctx.fillStyle = '#48c48a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, 'TÜMÜNÜ GÖR', P + kw / 2, y + bh / 2, bw - 12);
    this._btn(ekran, 'klan_git', P + (kw - bw) / 2, y, bw, bh, { ekran: 'klanUyeler', acik: true });
    y += bh + this.BOSLUK;
    return y - bas;
  },

  _uyeSirali() {
    const K = this._K();
    if (!K || !K.var || !K.var()) return [];
    const l = this._veriAl('uyeler', 700, function () { return (K.uyeler() || []).slice(); }) || [];
    const o = l.slice();
    // 🔴 sort((a,b)=>b.x-a.x) AZALAN — yön kolayca ters gider, dikkat.
    o.sort(function (a, b) { return (Number(b.haftalikKatki) || 0) - (Number(a.haftalikKatki) || 0); });
    return o;
  },

  // ═══════════════════════════════════════════════════════════════
  //  2) `klanEtkinlik`
  // ═══════════════════════════════════════════════════════════════
  _cizEtkinlik(ctx, W, H, y0) {
    const E = this._E(), K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!E) return this._modulYok(ctx, W, H, y0, 'KlanEtkinlik');
    if (K && K.var && K.var() && K.ozellikAcik && !K.ozellikAcik('etkinlik')) {
      y += this._bilgiKart(ctx, W, H, y, '\u{1F512} Etkinlik seviye 4te açılır',
        'Klan seviyeni yükselt.', this.RENK.kilit);
      return y - y0;
    }
    const h = this._veriAl('etkHafta', 3000, function () { return E.hafta(); });
    const il = this._veriAl('etkIlerleme', 1000, function () { return E.ilerleme(); });
    if (!h) return this._modulYok(ctx, W, H, y0, 'KlanEtkinlik verisi');
    const ac = this._hexTam(h.renk, '#3aa0e8');

    // Tür kartı
    const th = 96;
    this._kart(ctx, P, y, kw, th, ac, true);
    this._font(ctx, W, H, 0.032, true);
    ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, String(h.ikon) + '  ' + String(h.turAd), P + 16, y + 26, kw - 30);
    this._font(ctx, W, H, 0.020, false);
    ctx.fillStyle = this.RENK.metin2;
    this._yaz(ctx, String(h.kural), P + 16, y + 50, kw - 30);
    if (h.ozelGunAd) {
      // 🔴 Sabit 🎃 yazılıydı → "🎃 Yaz Festivali" çıkıyordu. İkon artık
      //    `KlanEtkinlik.OZEL_GUN[id].ikon`tan okunur (yedek: OZEL_GUN_IKON).
      const og = (E.OZEL_GUN && h.ozelGun) ? E.OZEL_GUN[h.ozelGun] : null;
      const ogIkon = (og && og.ikon) ? String(og.ikon)
        : (this.OZEL_GUN_IKON[String(h.ozelGun)] || '\u{1F389}');
      this._rozet(ctx, W, H, P + 14, y + 62, Math.min(190, kw - 28), 24, ogIkon + ' ' + String(h.ozelGunAd), ac, true);
    } else {
      this._font(ctx, W, H, 0.019, false);
      ctx.fillStyle = this.RENK.metin3;
      this._yaz(ctx, 'Sezon: ' + String(h.sezonId) + '  ·  hafta ' + this._sayi(h.sezonHaftasi, 0), P + 16, y + 74, kw - 30);
    }
    y += th + this.BOSLUK;

    // Harita + hava
    y += this._bant(ctx, W, H, y, '\u{1F5FA}️ Harita ve Koşullar', ac);
    const hh = 74;
    this._kart(ctx, P, y, kw, hh, this._hexTam(h.hava.renk, '#6ad2ff'), false);
    // 🔴 Ham harita kimliği ("desert") basılıyordu → oyunun kendi Türkçe adı.
    this._satir(ctx, W, H, P + 16, y + 22, kw - 32, 'Harita', this._haritaAd(h.harita, true), ac);
    this._satir(ctx, W, H, P + 16, y + 44, kw - 32, 'Hava: ' + String(h.hava.ad),
      '×' + this._sayi(h.hava.carpan, 1).toFixed(2), this._hexTam(h.hava.renk, '#6ad2ff'));
    this._font(ctx, W, H, 0.018, false);
    ctx.fillStyle = this.RENK.metin3; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this._yaz(ctx, String(h.hava.etki || ''), P + 16, y + 62, kw - 32);
    y += hh + this.BOSLUK;

    // Pist modifikasyonları
    const mod = h.pistModDetay || [];
    y += this._bant(ctx, W, H, y, '\u{1F6A7} Pist Modifikasyonu (' + mod.length + ')', '#c46ae8');
    if (!mod.length) {
      y += this._bilgiKart(ctx, W, H, y, 'Bu hafta modifikasyon yok', null, this.RENK.kilit);
    } else {
      const iz = this._izgara(W, mod.length, 70, this.BOSLUK);
      for (let i = 0; i < mod.length; i++) {
        const m = mod[i], mx = iz.kx(i), my = y + iz.ky(i);
        this._kart(ctx, mx, my, iz.kw, 70, this._hexTam(m.renk, '#c46ae8'), false);
        this._font(ctx, W, H, 0.022, true);
        ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        this._yaz(ctx, String(m.ad), mx + 14, my + 20, iz.kw - 60);
        this._font(ctx, W, H, 0.018, false);
        ctx.fillStyle = this.RENK.metin2;
        this._yaz(ctx, String(m.aciklama), mx + 14, my + 40, iz.kw - 26);
        this._font(ctx, W, H, 0.019, true);
        ctx.fillStyle = this._hexTam(m.renk, '#c46ae8'); ctx.textAlign = 'right';
        this._yaz(ctx, '×' + this._sayi(m.puanCarpan, 1).toFixed(2), mx + iz.kw - 12, my + 20, 60);
        ctx.textAlign = 'left'; ctx.fillStyle = this.RENK.metin3;
        this._font(ctx, W, H, 0.017, false);
        this._yaz(ctx, m.puanTur ? ('puan türü: ' + m.puanTur) : 'oynanış etkisi', mx + 14, my + 58, iz.kw - 26);
      }
      y += iz.h;
    }

    // Durum: klan puanı / sıralama / kalan süre / ilerleme
    y += this._bant(ctx, W, H, y, '\u{1F4C8} Durum', ac);
    const k = (K && K.al) ? (K.al() || {}) : {};
    const S = this._S();
    let sira = 0, toplam = 0;
    if (S) {
      const lp = this._sayi(k.ligPuan, 0);
      const oz = this._veriAl('ligOzet:' + lp, 4000, function () { return S.ligOzeti(null, lp); });
      if (oz) { sira = this._sayi(oz.siralama, 0); toplam = this._sayi(oz.toplam, 0); }
    }
    // §37.2/B — sıralama kayması (yumuşak)
    const an = this._an('klanEtkinlik');
    an.sira = this._yumusat(an.sira == null ? sira : an.sira, sira, 4, this._dt);
    const dh = 106;
    this._kart(ctx, P, y, kw, dh, ac, true);
    this._satir(ctx, W, H, P + 16, y + 22, kw - 32, 'Klan Puanı', this._sayiMetni(k.haftalikPuan), this.RENK.kp);
    this._satir(ctx, W, H, P + 16, y + 44, kw - 32, 'Sıralama',
      sira ? ('#' + this._sayiMetni(Math.round(an.sira)) + (toplam ? (' / ' + this._sayiMetni(toplam)) : '')) : '—', ac);
    this._satir(ctx, W, H, P + 16, y + 66, kw - 32, 'Kalan Süre',
      il ? (this._sayi(il.kalanSaat, 0) + ' saat') : '—', '#ff8800');
    this._cubuk(ctx, P + 14, y + 84, kw - 28, 10, il ? this._sayi(il.oran, 0) : 0, ac);
    y += dh + this.BOSLUK;
    const bw = Math.min(180, kw), bh = 46;
    this._kart(ctx, P + (kw - bw) / 2, y, bw, bh, '#48c48a', true);
    this._font(ctx, W, H, 0.024, true);
    ctx.fillStyle = '#48c48a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, '\u{1F3C1}  ETKİNLİĞE KATIL', P + kw / 2, y + bh / 2, bw - 12);
    this._btn('klanEtkinlik', 'klan_etkinlik_katil', P + (kw - bw) / 2, y, bw, bh, {});
    y += bh + this.BOSLUK;

    // Ödül tablosu
    y += this._bant(ctx, W, H, y, '\u{1F3C5} Ödül Tablosu (yalnız KP)', this.RENK.kp);
    const tab = E.ODUL_ETKINLIK || [];
    const rh = 40;
    for (let i = 0; i < tab.length; i++) {
      const t = tab[i];
      const s = isFinite(t.enFazla) ? t.enFazla : 9999;
      const od = this._veriAl('etkOdul:' + s, 5000, function () { return E.etkinlikOdulu(s); });
      const ry = y + i * (rh + 4);
      const benim = sira > 0 && sira <= (isFinite(t.enFazla) ? t.enFazla : Infinity) &&
        (i === 0 || sira > (isFinite(tab[i - 1].enFazla) ? tab[i - 1].enFazla : 0));
      this._kart(ctx, P, ry, kw, rh, benim ? ac : this.RENK.kilit, benim);
      this._font(ctx, W, H, 0.020, true);
      ctx.fillStyle = benim ? this.RENK.metin : this.RENK.metin2;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, String(t.ad), P + 14, ry + rh / 2, kw * 0.28);
      ctx.textAlign = 'right'; ctx.fillStyle = this.RENK.kp;
      this._yaz(ctx, od ? (this._sayiMetni(od.kpCarpanli) + ' KP') : '—', P + kw - 14, ry + rh / 2, kw * 0.32);
      ctx.textAlign = 'center'; ctx.fillStyle = this.RENK.metin3;
      this._font(ctx, W, H, 0.017, false);
      // 🔴 Ham kutu kimliği ("2× efsanevi") basılıyordu → KlanKutu'nun kendi adı.
      this._yaz(ctx, '+' + this._sayiMetni(t.klanXp) + ' XP  ·  ' + String(t.kutu.adet) + '× ' + this._kutuAd(t.kutu.tur),
        P + kw * 0.56, ry + rh / 2, kw * 0.34);
    }
    y += tab.length * (rh + 4);
    return y - y0 + 12;
  },

  // ═══════════════════════════════════════════════════════════════
  //  3) `klanSavas`
  // ═══════════════════════════════════════════════════════════════
  //  ⚠ `js/ui.js:8444` `CLAN_WAR_UI.drawClanWarScreen` ÖLÜ koddu (hiçbir yerden
  //    çağrılmıyor, sahte veriyle çalışıyor, buton üretmiyor, `H*oran` fontları
  //    taşıyor). İYİ FİKİRLERİ buraya taşındı — skor barı · iki klan başlığı ·
  //    VS + geri sayım · top-5 dost/düşman renklendirmesi. `ui.js` DEĞİŞTİRİLMEDİ.
  //    Veri kaynağı: `KlanSavas.uiVerisi()` (birebir aynı şekil).
  _cizSavas(ctx, W, H, y0) {
    const SV = this._SV(), K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!SV) return this._modulYok(ctx, W, H, y0, 'KlanSavas');
    if (K && K.var && K.var() && K.ozellikAcik && !K.ozellikAcik('savas')) {
      y += this._bilgiKart(ctx, W, H, y, '\u{1F512} Klan savaşı seviye 15te açılır',
        'Klan seviyeni yükselt.', this.RENK.kilit);
      return y - y0;
    }
    const ui = this._veriAl('savasUi', 800, function () { return SV.uiVerisi(); });
    const dur = this._veriAl('savasDurum', 1500, function () { return SV.durum(); });

    if (!ui) {
      // ── AKTİF SAVAŞ YOK: 4 tür ──
      y += this._bant(ctx, W, H, y, '⚔️ Yeni Savaş', '#e0553a');
      const sira = SV.TUR_SIRA || [];
      const iz = this._izgara(W, sira.length, 92, this.BOSLUK);
      for (let i = 0; i < sira.length; i++) {
        const T = SV.TUR[sira[i]];
        if (!T) continue;
        const bx = iz.kx(i), by = y + iz.ky(i);
        const c = this._hexTam(T.renk, '#e0553a');
        this._kart(ctx, bx, by, iz.kw, 92, c, false);
        this._font(ctx, W, H, 0.024, true);
        ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        this._yaz(ctx, String(T.ad), bx + 14, by + 20, iz.kw - 80);
        this._font(ctx, W, H, 0.018, true);
        ctx.fillStyle = c; ctx.textAlign = 'right';
        this._yaz(ctx, String(T.zorluk), bx + iz.kw - 12, by + 20, 76);
        this._font(ctx, W, H, 0.018, false);
        ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'left';
        this._yaz(ctx, String(T.strateji), bx + 14, by + 40, iz.kw - 26);
        this._yaz(ctx, Math.round(this._sayi(T.sureMs, 0) / 3600000) + ' saat  ·  ' +
          this._sayi(T.uye, 0) + ' üye  ·  en iyi ' + this._sayi(T.enIyiN, 0),
          bx + 14, by + 58, iz.kw - 26);
        this._font(ctx, W, H, 0.020, true);
        ctx.fillStyle = c; ctx.textAlign = 'center';
        this._yaz(ctx, 'BAŞLAT', bx + iz.kw / 2, by + 76, iz.kw - 24);
        this._btn('klanSavas', 'klan_savas_baslat', bx, by + 92 - 44, iz.kw, 44, { tur: sira[i] });
      }
      y += iz.h;
    } else {
      // ── AKTİF SAVAŞ: §15.2 skor başlığı ──
      const c1 = this._hexTam(ui.myClan.color, '#e8b23a'), c2 = this._hexTam(ui.enemyClan.color, '#3aa0e8');
      const hh = Math.max(118, Math.min(190, Math.round(Math.min(H * 0.28, W * 0.32))));
      ctx.save(); ctx.translate(P, y);
      const g = this._gr(ctx, 'wr' + Math.round(hh) + c1 + c2, 0, 0, kw, hh,
        [[0, c1 + 'cc'], [0.5, '#111827'], [1, c2 + 'cc']]);
      ctx.fillStyle = g; this._yuvarlak(ctx, 0, 0, kw, hh, 12); ctx.fill();
      ctx.restore();
      this._font(ctx, W, H, 0.030, false, Math.round(hh * 0.26));
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, String(ui.myClan.flag), P + kw * 0.20, y + hh * 0.30, kw * 0.3);
      this._yaz(ctx, String(ui.enemyClan.flag), P + kw * 0.80, y + hh * 0.30, kw * 0.3);
      this._font(ctx, W, H, 0.030, false, Math.round(hh * 0.24));
      this._yaz(ctx, '⚔️', P + kw * 0.50, y + hh * 0.28, kw * 0.2);
      // 🔴 Klan adları `uiVerisi()`ten ZATEN `toUpperCase()`lı geliyor
      //    ("TÜRK ŞAHINLERI") — ham addan Türkçe kuralıyla yeniden büyüt.
      const hamBiz = (K && K.al) ? ((K.al() || {}).ad) : null;
      const hamRakip = (dur && dur.aktif && dur.aktif.rakip) ? dur.aktif.rakip.ad : null;
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = '#ffffff';
      this._yaz(ctx, this._klanAdBuyuk(hamBiz, ui.myClan.name), P + kw * 0.20, y + hh * 0.58, kw * 0.32);
      this._yaz(ctx, this._klanAdBuyuk(hamRakip, ui.enemyClan.name), P + kw * 0.80, y + hh * 0.58, kw * 0.32);
      this._font(ctx, W, H, 0.026, true);
      ctx.fillStyle = this.RENK.kp;
      this._yaz(ctx, this._sayiMetni(ui.myClan.score), P + kw * 0.20, y + hh * 0.80, kw * 0.32);
      this._yaz(ctx, this._sayiMetni(ui.enemyClan.score), P + kw * 0.80, y + hh * 0.80, kw * 0.32);
      this._font(ctx, W, H, 0.020, true);
      ctx.fillStyle = '#ff8800';
      this._yaz(ctx, '⏱ ' + String(ui.timeLeft), P + kw * 0.50, y + hh * 0.58, kw * 0.30);
      this._font(ctx, W, H, 0.017, false);
      ctx.fillStyle = this.RENK.metin2;
      this._yaz(ctx, String(ui.phase), P + kw * 0.50, y + hh * 0.78, kw * 0.30);
      y += hh + this.BOSLUK;

      // Skor barı (§37.2/C — yarışan çubuk)
      this._savasBar(ctx, W, H, P, y, kw, 18, ui, 'ekran');
      y += 18 + this.BOSLUK;
      this._font(ctx, W, H, 0.019, false);
      ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, 'Sıran: #' + this._sayi(ui.myRank, 1) +
        '   ·   ELO ' + this._sayi(ui.elo, 1000) +
        '   ·   kazanma ' + Math.round(this._sayi(ui.kazanmaOlasiligi, 0.5) * 100) + '%',
        W / 2, y + 8, kw);
      y += 22;

      // Top 5
      y += this._bant(ctx, W, H, y, '\u{1F525} En İyi Savaşçılar', c1);
      const tp = ui.topPlayers || [];
      const rh = 46;
      for (let i = 0; i < tp.length; i++) {
        const p = tp[i], benim = (p.clan === 'mine');
        const ry = y + i * (rh + 4);
        this._kart(ctx, P, ry, kw, rh, benim ? c1 : c2, benim);
        this._font(ctx, W, H, 0.021, true);
        ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        this._yaz(ctx, (i + 1) + '. ' + String(p.name), P + 14, ry + rh / 2, kw * 0.55);
        ctx.textAlign = 'right'; ctx.fillStyle = this.RENK.kp;
        this._yaz(ctx, this._sayiMetni(p.score), P + kw - 14, ry + rh / 2, kw * 0.38);
      }
      y += tp.length * (rh + 4) + 2;

      // Ödül + eylemler
      y += this._bant(ctx, W, H, y, '\u{1F3C5} Ödül ve Eylemler', this.RENK.kp);
      y += this._bilgiKart(ctx, W, H, y,
        'Bu sonuç: ' + this._sayiMetni(this._sayi(ui.odulKp, 0)) + ' KP',
        ui.odulAlindi ? 'Ödül alındı.' : 'Savaş bitince ödülü al.', this.RENK.kp);
      const eyl = [
        { id: 'klan_savas_odul', ad: '\u{1F381} ÖDÜLÜ AL', c: '#48c48a' },
        { id: 'klan_savas_kesif', ad: '\u{1F50D} KEŞİF', c: '#3aa0e8' },
        { id: 'klan_savas_izle', ad: '\u{1F441}️ İZLE', c: '#c46ae8' },
        { id: 'klan_savas_iptal', ad: '✖ İPTAL', c: '#e0553a' }
      ];
      const iz2 = this._izgara(W, eyl.length, 46, 6);
      const sut2 = Math.max(2, iz2.sut);
      const bw2 = Math.floor((kw - (sut2 - 1) * 6) / sut2);
      for (let i = 0; i < eyl.length; i++) {
        const bx = P + (i % sut2) * (bw2 + 6), by = y + Math.floor(i / sut2) * 52;
        this._kart(ctx, bx, by, bw2, 46, eyl[i].c, false);
        this._font(ctx, W, H, 0.020, true);
        ctx.fillStyle = eyl[i].c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        this._yaz(ctx, eyl[i].ad, bx + bw2 / 2, by + 23, bw2 - 10);
        this._btn('klanSavas', eyl[i].id, bx, by, bw2, 46, {});
      }
      y += Math.ceil(eyl.length / sut2) * 52;
    }

    // Savaş geçmişi / istatistik
    if (dur) {
      y += this._bant(ctx, W, H, y, '\u{1F4CA} Savaş İstatistiği', '#8fa3b0');
      const sh = 96;
      this._kart(ctx, P, y, kw, sh, '#8fa3b0', false);
      this._satir(ctx, W, H, P + 16, y + 22, kw - 32, 'Toplam savaş', this._sayiMetni(dur.toplam), this.RENK.metin);
      this._satir(ctx, W, H, P + 16, y + 44, kw - 32, 'G / B / M',
        this._sayiMetni(dur.galibiyet) + ' / ' + this._sayiMetni(dur.beraberlik) + ' / ' + this._sayiMetni(dur.maglubiyet), '#48c48a');
      this._satir(ctx, W, H, P + 16, y + 66, kw - 32, 'Bu hafta kalan',
        this._sayiMetni(dur.haftalikKalan) + ' / ' + this._sayiMetni(dur.haftalikLimit), '#e8b23a');
      this._satir(ctx, W, H, P + 16, y + 86, kw - 32, 'ELO', this._sayiMetni(dur.elo), '#3aa0e8');
      y += sh + this.BOSLUK;
    }
    return y - y0 + 12;
  },

  // ═══════════════════════════════════════════════════════════════
  //  4) `klanMagaza` — 7 ürün (§9.2)
  // ═══════════════════════════════════════════════════════════════
  _cizMagaza(ctx, W, H, y0) {
    const KU = this._KU(), K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!KU) return this._modulYok(ctx, W, H, y0, 'KlanKutu');
    const liste = this._veriAl('magaza', 1500, function () { return KU.magaza(); }) || [];
    if (!liste.length) return this._modulYok(ctx, W, H, y0, 'Mağaza verisi');
    const acik = !!liste[0].acik;
    if (!acik) {
      y += this._bilgiKart(ctx, W, H, y, '\u{1F512} Klan mağazası seviye 10da açılır',
        'Ürünler önizleme olarak gösteriliyor.', this.RENK.kilit);
    }
    const kp = (K && K.kp) ? this._sayi(K.kp(), 0) : 0;
    const kartH = 118;
    const iz = this._izgara(W, liste.length, kartH, this.BOSLUK);
    for (let i = 0; i < liste.length; i++) {
      const u = liste[i];
      const bx = iz.kx(i), by = y + iz.ky(i);
      const c = this._hexTam(u.renk, this.PALET[i % this.PALET.length]);
      const alinabilir = acik && u.kalanStok > 0 && kp >= u.fiyat;
      this._kart(ctx, bx, by, iz.kw, kartH, c, alinabilir);
      this._font(ctx, W, H, 0.023, true);
      ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, String(u.ad), bx + 14, by + 20, iz.kw - 92);
      this._font(ctx, W, H, 0.018, false);
      ctx.fillStyle = this.RENK.metin2;
      this._yaz(ctx, String(u.aciklama), bx + 14, by + 40, iz.kw - 26);

      // İndirim rozeti + geri sayım
      if (u.indirimOrani > 0) {
        const rw = Math.min(96, iz.kw * 0.38);
        this._rozet(ctx, W, H, bx + iz.kw - rw - 10, by + 8, rw, 22,
          (u.indirimFlash ? '⚡ ' : '') + '-%' + Math.round(u.indirimOrani * 100), '#e0553a', true);
        if (u.indirimBitis > 0) {
          this._font(ctx, W, H, 0.017, false);
          ctx.fillStyle = '#ff8800'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          this._yaz(ctx, '⏱ ' + this._sureMetni(u.indirimBitis - this._simdi()), bx + iz.kw - 12, by + 38, rw + 20);
        }
      }
      // Fiyat + stok
      this._font(ctx, W, H, 0.023, true);
      ctx.fillStyle = alinabilir ? this.RENK.kp : this.RENK.metin3;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, '\u{1FA99} ' + this._sayiMetni(u.fiyat) + ' KP', bx + 14, by + 64, iz.kw * 0.5);
      if (u.indirimOrani > 0) {
        // 🔴 Eski fiyat DÜZ gri metindi → ikinci bir fiyat gibi okunuyordu.
        //    Artık ÜSTÜ ÇİZİLİ (genişlik `measureText` ile ölçülür, tahminle DEĞİL).
        this._font(ctx, W, H, 0.017, false);
        ctx.fillStyle = this.RENK.metin3;
        const eskiM = this._sayiMetni(u.tabanFiyat);
        const eskiMaxW = iz.kw * 0.4;
        this._yaz(ctx, eskiM, bx + 14, by + 80, eskiMaxW);
        const eskiW = Math.min(this._genislik(ctx, eskiM), eskiMaxW);
        ctx.strokeStyle = '#e0553a'; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(bx + 13, by + 80);
        ctx.lineTo(bx + 15 + eskiW, by + 80);
        ctx.stroke();
      }
      this._font(ctx, W, H, 0.018, true);
      ctx.fillStyle = u.kalanStok > 0 ? '#48c48a' : '#e0553a';
      ctx.textAlign = 'right';
      this._yaz(ctx, 'Stok ' + this._sayiMetni(u.kalanStok) + '/' + this._sayiMetni(u.stok),
        bx + iz.kw - 12, by + 64, iz.kw * 0.42);
      this._font(ctx, W, H, 0.016, false);
      ctx.fillStyle = this.RENK.metin3;
      // 🔴 Ham periyot kimliği ("aylik yenilenir") basılıyordu.
      this._yaz(ctx, this._periyotAd(u.periyot) + ' yenilenir', bx + iz.kw - 12, by + 80, iz.kw * 0.42);

      // SATIN AL
      const bw = iz.kw - 24, bh = 30;
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = alinabilir ? c : this.RENK.kilit; ctx.textAlign = 'center';
      this._yaz(ctx, alinabilir ? 'SATIN AL' : (u.kalanStok > 0 ? 'KP YETMİYOR' : 'TÜKENDİ'),
        bx + iz.kw / 2, by + 100, bw - 10);
      this._btn('klanMagaza', 'klan_magaza_al', bx + 12, by + kartH - 44, bw, 44,
        { urun: u.id, fiyat: u.fiyat, alinabilir: alinabilir });
    }
    y += iz.h;

    // Gizemli kutu (mağazadan ayrı — §9.2)
    const MK = KU.MAGAZA_KUTU;
    if (MK) {
      y += this._bant(ctx, W, H, y, '\u{1F52E} Gizemli Kutu', this._hexTam(MK.renk, '#7a5ae8'));
      y += this._bilgiKart(ctx, W, H, y, String(MK.ad),
        'Bekleme yok · %60 Destansı, %30 Efsanevi, %10 Efsanevi+', MK.renk);
    }
    return y - y0 + 12;
  },

  // ═══════════════════════════════════════════════════════════════
  //  5) `klanUyeler`
  // ═══════════════════════════════════════════════════════════════
  _cizUyeler(ctx, W, H, y0) {
    const K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!K) return this._modulYok(ctx, W, H, y0, 'Klan');
    if (!K.var()) { y += this._bilgiKart(ctx, W, H, y, 'Bir klanda değilsin', null, this.RENK.kilit); return y - y0; }
    const uyeler = this._uyeSirali();
    const kap = K.uyeKapasitesi ? this._sayi(K.uyeKapasitesi(), 20) : 20;
    const rolVer = !!(K.benimYetkim && K.benimYetkim('rolVer'));
    const uyeAt = !!(K.benimYetkim && K.benimYetkim('uyeAt'));
    y += this._bant(ctx, W, H, y, '\u{1F465} ' + uyeler.length + ' / ' + kap + ' Üye', '#48c48a');
    if (!uyeler.length) { y += this._bilgiKart(ctx, W, H, y, 'Üye yok', null, this.RENK.kilit); return y - y0; }

    const rh = 68;
    const iz = this._izgara(W, uyeler.length, rh, this.BOSLUK);
    for (let i = 0; i < uyeler.length; i++) {
      const u = uyeler[i];
      const bx = iz.kx(i), by = y + iz.ky(i);
      const c = this._hexTam(this.ROL_RENK[u.rol], '#8fa3b0');
      this._kart(ctx, bx, by, iz.kw, rh, c, i === 0);
      this._font(ctx, W, H, 0.020, true);
      ctx.fillStyle = this.RENK.metin3; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, '#' + (i + 1), bx + 12, by + 20, 34);
      this._font(ctx, W, H, 0.022, true);
      ctx.fillStyle = this.RENK.metin;
      this._yaz(ctx, String(u.ad), bx + 46, by + 20, iz.kw - 150);
      // rol rozeti
      const rw = Math.min(96, Math.max(64, iz.kw * 0.28));
      this._rozet(ctx, W, H, bx + iz.kw - rw - 10, by + 8, rw, 22,
        (this.ROL_IKON[u.rol] || '') + ' ' + (this.ROL_AD[u.rol] || u.rol), c, false);
      // katkı + son aktiflik
      this._font(ctx, W, H, 0.018, false);
      ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'left';
      this._yaz(ctx, 'Haftalık ' + this._sayiMetni(u.haftalikKatki) + '  ·  toplam ' + this._sayiMetni(u.katki),
        bx + 12, by + 42, iz.kw - 24);
      ctx.fillStyle = this.RENK.metin3;
      this._yaz(ctx, (u.bot ? '\u{1F916} ' : '') + this._gecenMetni(u.sonAktif), bx + 12, by + 58, iz.kw * 0.5);
      // rozetler
      const roz = (K.rozetler ? (K.rozetler(u.id) || []) : []);
      if (roz.length) {
        let rx = bx + iz.kw - 12;
        this._font(ctx, W, H, 0.018, true);
        ctx.textAlign = 'right';
        for (let j = 0; j < Math.min(3, roz.length); j++) {
          const rb = K.rozetBilgi ? K.rozetBilgi(roz[j]) : null;
          ctx.fillStyle = this._hexTam(rb && rb.renk, '#8fa3b0');
          this._yaz(ctx, rb ? String(rb.ad) : String(roz[j]), rx, by + 42, iz.kw * 0.42);
          rx -= 0;
          break;   // tek satıra yalnız EN ÜST rozet (hiyerarşi sırası korunur)
        }
        if (roz.length > 1) {
          this._font(ctx, W, H, 0.016, false);
          ctx.fillStyle = this.RENK.metin3;
          this._yaz(ctx, '+' + (roz.length - 1) + ' rozet', bx + iz.kw - 12, by + 58, iz.kw * 0.4);
        }
      }
      if (rolVer || uyeAt) {
        this._btn('klanUyeler', 'klan_uye_sec', bx, by, iz.kw, rh,
          { uyeId: u.id, ad: u.ad, rol: u.rol, rolVer: rolVer, uyeAt: uyeAt });
      }
    }
    y += iz.h;
    if (!rolVer && !uyeAt) {
      y += this._bilgiKart(ctx, W, H, y, 'Rol değiştirme yetkin yok',
        'Yalnız lider ve yardımcı rol verebilir.', this.RENK.kilit);
    }
    return y - y0 + 12;
  },

  // ═══════════════════════════════════════════════════════════════
  //  6) `klanAyar`
  // ═══════════════════════════════════════════════════════════════
  _cizAyar(ctx, W, H, y0) {
    const K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!K) return this._modulYok(ctx, W, H, y0, 'Klan');
    if (!K.var()) { y += this._bilgiKart(ctx, W, H, y, 'Bir klanda değilsin', null, this.RENK.kilit); return y - y0; }
    const k = K.al() || {};
    const yetki = !!(K.benimYetkim && K.benimYetkim('ayarDegistir'));
    const sv = K.seviye ? this._sayi(K.seviye(), 1) : 1;

    // ── AMBLEM ──
    y += this._bant(ctx, W, H, y, '\u{1F6E1}️ Amblem', '#e8b23a');
    const asut = Math.max(4, Math.min(6, Math.floor((kw + 6) / 56)));
    const aw = Math.floor((kw - (asut - 1) * 6) / asut), ah = 46;
    for (let i = 0; i < this.AMBLEM.length; i++) {
      const ax = P + (i % asut) * (aw + 6), ay = y + Math.floor(i / asut) * (ah + 6);
      const secili = (this._sayi(k.amblem, 0) === i);
      this._kart(ctx, ax, ay, aw, ah, secili ? '#e8b23a' : this.RENK.cizgi, secili);
      this._font(ctx, W, H, 0.024, false, Math.min(22, aw * 0.5));
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, this.AMBLEM[i], ax + aw / 2, ay + ah / 2, aw - 6);
      this._btn('klanAyar', 'klan_amblem', ax, ay, aw, ah, { amblem: i, yetki: yetki });
    }
    y += Math.ceil(this.AMBLEM.length / asut) * (ah + 6) + 2;

    // ── RENKLER (HEX zorunlu — tuzak #5) ──
    y += this._bant(ctx, W, H, y, '\u{1F3A8} Renk 1 (birincil)', this._hexTam(k.renk1, '#e8b23a'));
    y += this._renkSatiri(ctx, W, H, y, 'klan_renk1', this._hexTam(k.renk1, '#e8b23a'), yetki);
    y += this._bant(ctx, W, H, y, '\u{1F3A8} Renk 2 (ikincil)', this._hexTam(k.renk2, '#3aa0e8'));
    y += this._renkSatiri(ctx, W, H, y, 'klan_renk2', this._hexTam(k.renk2, '#3aa0e8'), yetki);

    // ── GİZLİLİK ──
    y += this._bant(ctx, W, H, y, '\u{1F512} Gizlilik', '#3aa0e8');
    const gz = (K.GIZLILIK || ['acik', 'kapali', 'gizli']);
    const gAd = { acik: 'Açık', kapali: 'Onaylı', gizli: 'Gizli' };
    const gw = Math.floor((kw - 2 * 6) / 3), gh = 46;
    for (let i = 0; i < gz.length && i < 3; i++) {
      const gx = P + i * (gw + 6), secili = (String(k.gizlilik) === gz[i]);
      this._kart(ctx, gx, y, gw, gh, secili ? '#3aa0e8' : this.RENK.cizgi, secili);
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = secili ? '#3aa0e8' : this.RENK.metin2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, gAd[gz[i]] || gz[i], gx + gw / 2, y + gh / 2, gw - 10);
      this._btn('klanAyar', 'klan_gizlilik', gx, y, gw, gh, { gizlilik: gz[i], yetki: yetki });
    }
    y += gh + this.BOSLUK;

    // ── LORE ──
    const maks = this._sayi(K.MAKS_LORE, 500);
    const lore = String(k.lore || '');
    y += this._bant(ctx, W, H, y, '\u{1F4DC} Klan Efsanesi (' + lore.length + '/' + maks + ')', '#c46ae8');
    // 🔴 Başlık "(132/500)" derken yalnız 2 SATIR çiziliyordu; kalan metin
    //    sessizce kayboluyordu ('…' bile yoktu). Artık kart YÜKSEKLİĞİ metne
    //    göre büyür (ekran zaten kaydırmalı) ve taşan varsa '…' konur.
    this._font(ctx, W, H, 0.019, false);
    const loreSat = this._sarMetin(ctx, lore.length ? lore : 'Henüz bir efsane yazılmadı.',
      kw - 28, this.LORE_MAKS_SATIR);
    const lh = Math.max(78, 12 + loreSat.length * 18 + 46);
    this._kart(ctx, P, y, kw, lh, '#c46ae8', false);
    this._font(ctx, W, H, 0.019, false);
    ctx.fillStyle = lore.length ? this.RENK.metin : this.RENK.metin3;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let i = 0; i < loreSat.length; i++) this._yaz(ctx, loreSat[i], P + 14, y + 20 + i * 18, kw - 28);
    this._font(ctx, W, H, 0.020, true);
    ctx.fillStyle = '#c46ae8'; ctx.textAlign = 'center';
    this._yaz(ctx, 'DÜZENLE', P + kw / 2, y + lh - 18, Math.min(150, kw - 20));
    this._btn('klanAyar', 'klan_lore_duzenle', P + (kw - Math.min(150, kw - 20)) / 2, y + lh - 44,
      Math.min(150, kw - 20), 44, { maks: maks, yetki: !!(K.benimYetkim && K.benimYetkim('lorDuzenle')) });
    y += lh + this.BOSLUK;

    // ── KLAN SINIFI (sv15+) ──
    const sinifSv = this._sayi(K.SINIF_SEVIYE, 15);
    y += this._bant(ctx, W, H, y, '\u{1F396}️ Klan Sınıfı', '#48c48a');
    if (sv < sinifSv) {
      y += this._bilgiKart(ctx, W, H, y, '\u{1F512} Sınıf seçimi seviye ' + sinifSv + 'te açılır', null, this.RENK.kilit);
    } else {
      const sinifIdler = Object.keys(K.SINIF || {});
      const iz = this._izgara(W, sinifIdler.length, 82, this.BOSLUK);
      for (let i = 0; i < sinifIdler.length; i++) {
        const id = sinifIdler[i], S = K.SINIF[id];
        const bx = iz.kx(i), by = y + iz.ky(i);
        const secili = (String(k.sinif) === id);
        const c = this._hexTam(S.renk, '#48c48a');
        this._kart(ctx, bx, by, iz.kw, 82, c, secili);
        this._font(ctx, W, H, 0.022, true);
        ctx.fillStyle = secili ? c : this.RENK.metin;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        this._yaz(ctx, String(S.ad), bx + 14, by + 20, iz.kw - 26);
        this._font(ctx, W, H, 0.017, false);
        ctx.fillStyle = this.RENK.metin2;
        const sl = this._boluMetin(String(S.aciklama), 2, Math.max(20, Math.floor(iz.kw / 6)));
        for (let j = 0; j < sl.length; j++) this._yaz(ctx, sl[j], bx + 14, by + 42 + j * 17, iz.kw - 26);
        this._btn('klanAyar', 'klan_sinif', bx, by, iz.kw, 82,
          { sinif: id, yetki: !!(K.benimYetkim && K.benimYetkim('sinifSec')) });
      }
      y += iz.h;
    }

    // ── AYRIL ──
    y += this._bant(ctx, W, H, y, '⚠ Tehlikeli Bölge', '#e0553a');
    const bw = Math.min(200, kw), bh = 48;
    this._kart(ctx, P + (kw - bw) / 2, y, bw, bh, '#e0553a', true);
    this._font(ctx, W, H, 0.023, true);
    ctx.fillStyle = '#e0553a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, '\u{1F6AA}  KLANDAN AYRIL', P + kw / 2, y + bh / 2, bw - 14);
    this._btn('klanAyar', 'klan_ayril', P + (kw - bw) / 2, y, bw, bh, {});
    y += bh + this.BOSLUK;
    return y - y0 + 12;
  },

  _renkSatiri(ctx, W, H, y, eylem, secili, yetki) {
    const P = this.KENAR, kw = W - P * 2;
    const sut = Math.max(4, Math.min(6, Math.floor((kw + 6) / 56)));
    const cw = Math.floor((kw - (sut - 1) * 6) / sut), ch = 44;
    for (let i = 0; i < this.PALET.length; i++) {
      const cx = P + (i % sut) * (cw + 6), cy = y + Math.floor(i / sut) * (ch + 6);
      const c = this.PALET[i], sec = (String(secili).toLowerCase() === c);
      ctx.fillStyle = c;
      this._yuvarlak(ctx, cx, cy, cw, ch, 8); ctx.fill();
      if (sec) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4;
        this._yuvarlak(ctx, cx + 1, cy + 1, cw - 2, ch - 2, 8); ctx.stroke();
      }
      // 🔴 '#' eylem adında sorun çıkarır → renk `veri` ile taşınır
      this._btn('klanAyar', eylem, cx, cy, cw, ch, { renk: c, yetki: yetki });
    }
    return Math.ceil(this.PALET.length / sut) * (ch + 6) + 2;
  },

  // Basit satır bölme (ölçüm değil karakter sayısı — `maxWidth` zaten taşmayı
  // engelliyor; bu yalnız okunabilirlik için).
  _boluMetin(metin, maksSatir, karakter) {
    const m = String(metin == null ? '' : metin);
    const kelimeler = m.split(' ');
    const o = []; let s = '';
    for (let i = 0; i < kelimeler.length; i++) {
      const y = s.length ? (s + ' ' + kelimeler[i]) : kelimeler[i];
      if (y.length > karakter && s.length) { o.push(s); s = kelimeler[i]; }
      else s = y;
      if (o.length >= maksSatir) break;
    }
    if (s.length && o.length < maksSatir) o.push(s);
    return o.length ? o : [''];
  },

  // ═══════════════════════════════════════════════════════════════
  //  7) `klanKutu` — 6 kutu (§6)
  // ═══════════════════════════════════════════════════════════════
  _cizKutu(ctx, W, H, y0) {
    const KU = this._KU(), K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!KU) return this._modulYok(ctx, W, H, y0, 'KlanKutu');
    const env = this._veriAl('envanter', 700, function () { return KU.envanter(); }) || [];
    const kp = (K && K.kp) ? this._sayi(K.kp(), 0) : 0;

    // Günlük ücretsiz kutu
    y += this._bant(ctx, W, H, y, '\u{1F381} Günlük Ücretsiz Kutu', '#48c48a');
    let hazir = false;
    try { hazir = KU.gunlukKutuHazir ? KU.gunlukKutuHazir() === true : false; } catch (e) { this._hataSay++; }
    const gh = 56;
    this._kart(ctx, P, y, kw, gh, hazir ? '#48c48a' : this.RENK.kilit, hazir);
    this._font(ctx, W, H, 0.022, true);
    ctx.fillStyle = hazir ? '#48c48a' : this.RENK.metin2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    this._yaz(ctx, hazir ? '\u{1F381}  GÜNLÜK KUTUYU AL' : 'Bugünkü kutu alındı', P + kw / 2, y + gh / 2, kw - 16);
    this._btn('klanKutu', 'klan_kutu_gunluk', P, y, kw, gh, { hazir: hazir });
    y += gh + this.BOSLUK;

    // Envanter
    y += this._bant(ctx, W, H, y, '\u{1F4E6} Envanter (' + env.length + '/' + this._sayi(KU.MAKS_ENVANTER, 8) + ')', '#e8b23a');
    if (!env.length) {
      y += this._bilgiKart(ctx, W, H, y, 'Kutu yok', 'Etkinlik, savaş ve görevlerden kutu kazanılır.', this.RENK.kilit);
    } else {
      const kh = 96;
      const iz = this._izgara(W, env.length, kh, this.BOSLUK);
      // 🔴 GÖRSEL HİYERARŞİ TERSTİ: hazır kutuların vurgu rengi kendi kutu
      //    rengiydi (Katılım #9aa7b8, Gümüş #c9d2da = açık gri) → `_kart`
      //    "aktif" dolgusu accent+'33' olduğu için kart SOLUK/pasif duruyor,
      //    bekleyen (Bronz/Altın) kutular ise koyu ve canlı görünüyordu.
      //    ▶ Hazırda vurgu SABİT CANLI YEŞİL + "HAZIR" rozeti + kalın kenarlık;
      //    bekleyen kart pasif ve başlığı sönük. Renk körü güvenliği: ayrım
      //    yalnız renkte değil, METİNDE de var ("HAZIR" / "⏱ süre").
      const HAZIR_C = '#48c48a';
      for (let i = 0; i < env.length; i++) {
        const kt = env[i], bx = iz.kx(i), by = y + iz.ky(i);
        const c = this._hexTam(kt.renk, '#8fa3b0');
        const vurgu = kt.hazir ? HAZIR_C : c;
        this._kart(ctx, bx, by, iz.kw, kh, vurgu, kt.hazir);
        if (kt.hazir) {
          // ekstra kalın kenarlık — "bu karta dokunulabilir" sinyali
          ctx.strokeStyle = HAZIR_C; ctx.lineWidth = 2.2;
          this._yuvarlak(ctx, bx + 1.1, by + 1.1, iz.kw - 2.2, kh - 2.2, 10); ctx.stroke();
        }
        this._font(ctx, W, H, 0.023, true);
        // Kutu türünün kendi rengi ADda yaşar → hazırda da hangi kutu olduğu belli
        ctx.fillStyle = kt.hazir ? c : this.RENK.metin2;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        this._yaz(ctx, String(kt.ad), bx + 14, by + 20, iz.kw - 92);
        this._font(ctx, W, H, 0.018, false);
        ctx.fillStyle = kt.hazir ? this.RENK.metin2 : this.RENK.metin3;
        this._yaz(ctx, 'Kaynak: ' + String(kt.kaynak || '—'), bx + 14, by + 38, iz.kw - 26);
        if (kt.hazir) {
          const rw = Math.min(74, Math.max(56, iz.kw * 0.24));
          this._rozet(ctx, W, H, bx + iz.kw - rw - 10, by + 9, rw, 22, 'HAZIR', HAZIR_C, true);
          // canlı dolgu buton — pasif kartlardaki düz metinden AYRIŞSIN
          const abw = iz.kw - 24, abh = 30;
          ctx.fillStyle = HAZIR_C;
          this._yuvarlak(ctx, bx + 12, by + kh - 40, abw, abh, 8); ctx.fill();
          this._font(ctx, W, H, 0.021, true);
          ctx.fillStyle = '#0b0d1a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          // ⚠ Eski ikon 🔓 (U+1F513) idi; küçük boyda KAPALI kilide benziyor →
          //    hazır kartta "kilitli" mesajı veriyordu (PNG'de görüldü).
          this._yaz(ctx, '\u{1F381}  HEMEN AÇ', bx + iz.kw / 2, by + kh - 40 + abh / 2, abw - 12);
          this._btn('klanKutu', 'klan_kutu_ac', bx + 12, by + kh - 44, iz.kw - 24, 44,
            { kutuId: kt.id, tur: kt.tur, renk: c });
        } else {
          this._font(ctx, W, H, 0.019, true);
          ctx.fillStyle = '#ff8800'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          this._yaz(ctx, '⏱ ' + this._sureMetni(kt.kalanMs) + ' bekliyor', bx + 14, by + 58, iz.kw * 0.62);
          const yeter = kp >= kt.hemenKp;
          this._font(ctx, W, H, 0.020, true);
          ctx.fillStyle = yeter ? this.RENK.kp : this.RENK.kilit; ctx.textAlign = 'center';
          this._yaz(ctx, '\u{1FA99} ' + this._sayiMetni(kt.hemenKp) + ' KP ile AÇ',
            bx + iz.kw / 2, by + 76, iz.kw - 24);
          this._btn('klanKutu', 'klan_kutu_hemen', bx + 12, by + kh - 44, iz.kw - 24, 44,
            { kutuId: kt.id, tur: kt.tur, kp: kt.hemenKp, renk: c, yeter: yeter });
        }
      }
      y += iz.h;
    }

    // 6 kutu türü
    y += this._bant(ctx, W, H, y, '\u{1F5C3}️ Kutu Türleri', '#c46ae8');
    const sirali = KU.KUTU_SIRA || [];
    const th = 68;
    const iz2 = this._izgara(W, sirali.length, th, this.BOSLUK);
    for (let i = 0; i < sirali.length; i++) {
      const cfg = KU.KUTULAR[sirali[i]];
      if (!cfg) continue;
      const bx = iz2.kx(i), by = y + iz2.ky(i);
      const c = this._hexTam(cfg.renk, '#8fa3b0');
      this._kart(ctx, bx, by, iz2.kw, th, c, false);
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, String(cfg.ad), bx + 14, by + 18, iz2.kw - 80);
      this._font(ctx, W, H, 0.017, false);
      ctx.fillStyle = this.RENK.metin3; ctx.textAlign = 'right';
      this._yaz(ctx, 'sv' + this._sayi(cfg.minSeviye, 1) + '  ·  ' +
        Math.round(this._sayi(cfg.beklemeMs, 0) / 3600000) + 'sa', bx + iz2.kw - 12, by + 18, 96);
      // nadirlik dağılımı çubuğu
      const bw = iz2.kw - 28; let ox = bx + 14;
      const NAD = KU.NADIRLIK || [];
      for (let j = 0; j < cfg.nadirlik.length; j++) {
        const pw = bw * (this._sayi(cfg.nadirlik[j], 0) / 100);
        if (pw <= 0) continue;
        ctx.fillStyle = this._hexTam(NAD[j] && NAD[j].renk, '#8fa3b0');
        ctx.fillRect(ox, by + 34, Math.max(1, pw), 8);
        ox += pw;
      }
      this._font(ctx, W, H, 0.016, false);
      ctx.fillStyle = this.RENK.metin2; ctx.textAlign = 'left';
      this._yaz(ctx, 'özel ödül %' + Math.round(this._sayi(cfg.ozelSans, 0) * 100) +
        '  ·  ' + this._sayiMetni(cfg.ozelKp) + ' KP', bx + 14, by + 54, iz2.kw - 26);
    }
    y += iz2.h;

    // İstatistik
    const ist = this._veriAl('kutuIst', 2000, function () { return KU.istatistik(); });
    if (ist) {
      y += this._bant(ctx, W, H, y, '\u{1F4CA} Açma İstatistiği', '#3aa0e8');
      const sh = 118;
      this._kart(ctx, P, y, kw, sh, '#3aa0e8', false);
      this._satir(ctx, W, H, P + 16, y + 20, kw - 32, 'Toplam açılan', this._sayiMetni(ist.toplamAcilan), this.RENK.metin);
      this._satir(ctx, W, H, P + 16, y + 40, kw - 32, 'Bu hafta / bu ay',
        this._sayiMetni(ist.haftalikAcma) + ' / ' + this._sayiMetni(ist.aylikAcma), '#48c48a');
      this._satir(ctx, W, H, P + 16, y + 60, kw - 32, 'En nadir',
        ist.enNadir ? String(ist.enNadir.ad) : '—', this._hexTam(ist.enNadir && ist.enNadir.renk, '#8fa3b0'));
      // nadirlik yüzdeleri
      const NAD = KU.NADIRLIK || [];
      let ox = P + 16; const bw = kw - 32;
      for (let j = 0; j < ist.nadirlikYuzde.length; j++) {
        const pw = bw * (this._sayi(ist.nadirlikYuzde[j], 0) / 100);
        if (pw <= 0) continue;
        ctx.fillStyle = this._hexTam(NAD[j] && NAD[j].renk, '#8fa3b0');
        ctx.fillRect(ox, y + 76, Math.max(1, pw), 10);
        ox += pw;
      }
      this._font(ctx, W, H, 0.017, false);
      ctx.fillStyle = this.RENK.metin3; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      this._yaz(ctx, 'günlük ortalama ' + this._sayi(ist.gunlukOrtalama, 0).toFixed(2) + ' kutu',
        P + 16, y + 100, kw - 32);
      y += sh + this.BOSLUK;
    }
    return y - y0 + 12;
  },

  // ═══════════════════════════════════════════════════════════════
  //  8) `klanPano` — DUYURU PANOSU (sözleşme §0: SOHBET YOK)
  // ═══════════════════════════════════════════════════════════════
  //  🔴 Mesaj yazma kutusu YOK, bot mesajı YOK. Yalnız sistem duyuruları.
  _cizPano(ctx, W, H, y0) {
    const K = this._K();
    const P = this.KENAR, kw = W - P * 2;
    let y = y0 + 10;
    if (!K) return this._modulYok(ctx, W, H, y0, 'Klan');
    if (!K.var()) { y += this._bilgiKart(ctx, W, H, y, 'Bir klanda değilsin', null, this.RENK.kilit); return y - y0; }
    const liste = this._veriAl('duyuru', 900, function () { return K.duyurular(50); }) || [];
    y += this._bant(ctx, W, H, y, '\u{1F4E2} ' + liste.length + ' Duyuru (yalnız sistem)', '#8fa3b0');
    if (!liste.length) {
      y += this._bilgiKart(ctx, W, H, y, 'Henüz duyuru yok',
        'Seviye, savaş, etkinlik ve kutu olayları buraya düşer.', this.RENK.kilit);
      return y - y0 + 12;
    }
    const rh = 62;
    const iz = this._izgara(W, liste.length, rh, 6);
    for (let i = 0; i < liste.length; i++) {
      const d = liste[i];
      const bx = iz.kx(i), by = y + iz.ky(i);
      const tip = this.TIP_IKON[d.tip] ? d.tip : 'sistem';
      const c = this._hexTam(this.TIP_RENK[tip], '#8fa3b0');
      this._kart(ctx, bx, by, iz.kw, rh, c, i === 0);
      this._font(ctx, W, H, 0.022, false, 20);
      ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, this.TIP_IKON[tip], bx + 26, by + 22, 30);
      this._font(ctx, W, H, 0.020, true);
      ctx.fillStyle = this.RENK.metin; ctx.textAlign = 'left';
      const sat = this._boluMetin(String(d.metin || ''), 2, Math.max(18, Math.floor((iz.kw - 60) / 6.6)));
      for (let j = 0; j < sat.length; j++) {
        this._yaz(ctx, sat[j], bx + 46, by + 20 + j * 17, iz.kw - 58);
        this._font(ctx, W, H, 0.018, false);
        ctx.fillStyle = this.RENK.metin2;
      }
      this._font(ctx, W, H, 0.016, false);
      ctx.fillStyle = this.RENK.metin3; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      this._yaz(ctx, this._gecenMetni(d.t), bx + iz.kw - 12, by + rh - 14, iz.kw * 0.4);
    }
    y += iz.h;
    const yetki = !!(K.benimYetkim && K.benimYetkim('duyuruYaz'));
    if (yetki) {
      const bw = Math.min(190, kw), bh = 46;
      this._kart(ctx, P + (kw - bw) / 2, y, bw, bh, '#e0553a', false);
      this._font(ctx, W, H, 0.021, true);
      ctx.fillStyle = '#e0553a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._yaz(ctx, '\u{1F5D1}️  PANOYU TEMİZLE', P + kw / 2, y + bh / 2, bw - 14);
      this._btn('klanPano', 'klan_pano_temizle', P + (kw - bw) / 2, y, bw, bh, {});
      y += bh + this.BOSLUK;
    }
    return y - y0 + 12;
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
  // Yorumları sil — backtick taraması KODU aramalı, açıklama metnini değil.
  _yorumsuz(kaynak) {
    return String(kaynak).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
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
  //  SELF TEST — 34 kontrol, hepsi ÖLÇEREK
  //  ⚠ Canlı durumu kirletmez: tüm alanlar yedeklenir ve geri konur.
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const yedek = {
      btns: this._btns, kay: this._kay, anim: this._anim, onb: this._onbellek,
      gr: this._grOnbellek, grCtx: this._grCtx, par: this._parcacik,
      kutu: this._kutuAnim, sev: this._seviyeAnim, rol: this._rolPanel,
      zaman: this._testZaman, hata: this._hataSay, bagli: this._kaydirmaBagli
    };
    try {
      this._btns = {}; this._kay = {}; this._anim = {}; this._onbellek = {};
      this._grOnbellek = {}; this._grCtx = null; this._parcacik = [];
      this._kutuAnim = null; this._seviyeAnim = null; this._rolPanel = null;
      this._hataSay = 0; this._kaydirmaBagli = true;   // testte UI'ye bağlanma
      this._testZaman = 1754200000000;                 // sabit → tekrarlanabilir
      this.hazir();

      // ── 1-2: API + ekranlar ──
      const api = ['EKRANLAR', 'ciz', 'tikla', 'butonlar', 'kaydirma', 'hazir', 'selfTest'];
      let apiTam = true;
      for (let i = 0; i < api.length; i++) {
        const v = this[api[i]];
        if (api[i] === 'EKRANLAR') { if (!Array.isArray(v)) apiTam = false; }
        else if (typeof v !== 'function') apiTam = false;
      }
      r.apiTam = apiTam;
      r.ekranSayisi8 = this.EKRANLAR.length === 8;
      r.hedefTabani44 = this.MIN_HEDEF === 44;

      // ── 3: 8 EKRAN × 8 TELEFON BOYUTU × 11 KAYDIRMA ──
      const boyutlar = [[360, 640], [360, 800], [390, 844], [414, 896],
        [428, 926], [768, 1024], [844, 390], [926, 428]];
      const s = { derinlik: 0, ciz: 0, metin: 0, grad: 0 };
      const ctx = this._sahteCtx(s);
      let cizimSifir = 0, dengesiz = 0, kucuk = 0, disari = 0;
      let tasan = 0, maxWsiz = 0, olcumSay = 0, cizimSay = 0;
      const ulas = {}, tum = {};
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        ulas[e] = {}; tum[e] = {};
        for (let bi = 0; bi < boyutlar.length; bi++) {
          const W = boyutlar[bi][0], H = boyutlar[bi][1];
          this._kay[e] = { sc: 0, maxScroll: 0, viewH: 0, viewTop: this.UST, icerikH: 0 };
          this.ciz(ctx, W, H, e, 0.016);
          const ms = this._durum(e).maxScroll;
          for (let p = 0; p <= 10; p++) {
            this._durum(e).sc = ms * (p / 10);
            const d0 = s.derinlik, c0 = s.ciz;
            this._olcum = true; this._yazilar = [];
            this.ciz(ctx, W, H, e, 0.016);
            this._olcum = false;
            cizimSay++;
            if (s.derinlik !== d0) dengesiz++;
            if (s.ciz === c0) cizimSifir++;
            const L = this._btns[e] || [];
            for (let i = 0; i < L.length; i++) {
              const b = L[i];
              tum[e][i] = true;
              if (b.y < -9000 || b.h <= 0) continue;
              if (!b.kirpik && (b.w < 43.99 || b.h < 43.99)) kucuk++;
              if (b.x < -0.5 || b.x + b.w > W + 0.5) disari++;
              if (!b.kirpik && b.h >= 43.99) ulas[e][i] = true;
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
        }
      }
      r._olcum = { cizim: cizimSay, metinOlcumu: olcumSay };
      r.istisnaYok = this._hataSay === 0;
      r._sonHata = this._sonHata || null;
      r.saveRestoreDengeli = dengesiz === 0;
      r.herEkranCiziyor = cizimSifir === 0;
      r.hedef44 = kucuk === 0;
      r.butonEkranIci = disari === 0;
      r.maxWidthHepsinde = maxWsiz === 0;
      r.metinTasmasiYok = tasan === 0;
      // her buton en az bir kaydırma konumunda TAM görünür
      let ulasilmaz = 0;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        const ks = Object.keys(tum[e]);
        for (let i = 0; i < ks.length; i++) if (!ulas[e][ks[i]]) ulasilmaz++;
      }
      r.tumButonlarUlasilir = ulasilmaz === 0;
      r._ulasilmaz = ulasilmaz;

      // ── KAYNAK TARAMASI (tuzak #1 · #7 · #8 · #9 · #12) ──
      const kSade = this._kaynakHaric(['selfTest', '_kaynakHaric', '_fnKaynak', '_sahteCtx']);
      const fontKay = this._fnKaynak('_font');
      r.fontTekYerde = !/\.font\s*=/.test(this._kaynakHaric(['_font', 'selfTest', '_kaynakHaric', '_fnKaynak', '_sahteCtx']));
      r.fontMinWH = /Math\.min\s*\(/.test(fontKay) && /_fontPx/.test(this._fnKaynak('_font') + this._fnKaynak('_fontPx'))
        && /Math\.min\s*\(\s*H\s*\*\s*oran\s*,\s*W\s*\*\s*oran/.test(this._fnKaynak('_fontPx'));
      r.fillTextTekYerde = !/\.fillText\s*\(/.test(this._kaynakHaric(['_yaz', 'selfTest', '_kaynakHaric', '_fnKaynak', '_sahteCtx']));
      r.ellipseYok = !/\.ellipse\s*\(/.test(kSade);
      r.getImageDataYok = kSade.indexOf('getImageData') < 0;
      r.mathRandomYok = kSade.indexOf('Math.random') < 0;
      // 🔴 backtick KODDA olmamalı (template literal yasak) — yorumlar hariç
      r.backtickYok = this._yorumsuz(kSade).indexOf(String.fromCharCode(96)) < 0;
      r.gradientKacakYok = !/create(Linear|Radial)Gradient\s*\(/.test(
        this._kaynakHaric(['_gr', 'selfTest', '_kaynakHaric', '_fnKaynak', '_sahteCtx']));
      r.dtBirikmesiYok = !/\+=\s*(this\.)?_?dt\b/.test(kSade);
      r.expYumusatma = /Math\.exp\s*\(/.test(this._fnKaynak('_yumusat'));
      r.dateNowKullaniliyor = /Date\.now\s*\(/.test(this._fnKaynak('_simdi'));

      // ── GRADYAN ÖNBELLEĞİ: 2. karede YENİ GRADYAN 0 ──
      const s2 = { derinlik: 0, ciz: 0, metin: 0, grad: 0 };
      const ctx2 = this._sahteCtx(s2);
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) this.ciz(ctx2, 390, 844, this.EKRANLAR[ei], 0.016);
      const g1 = s2.grad;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) this.ciz(ctx2, 390, 844, this.EKRANLAR[ei], 0.016);
      const g2 = s2.grad - g1;
      r.gradientOnbellekli = g2 === 0;
      r._gradient = { ilkKare: g1, ikinciKare: g2, anahtar: Object.keys(this._grOnbellek).length };
      r.gradientAnahtarSinirIcinde = Object.keys(this._grOnbellek).length < this.MAKS_GRADIENT;

      // ── KAYDIRMA SINIRLARI ──
      let kayHata = 0;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        this.ciz(ctx, 360, 640, e, 0.016);
        const ms = this._durum(e).maxScroll;
        if (this.kaydirma(e, -99999) !== 0) kayHata++;
        if (Math.abs(this.kaydirma(e, 99999) - ms) > 0.001) kayHata++;
        this._durum(e).sc = 0;
      }
      r.kaydirmaSiniri = kayHata === 0;
      r.kaydirmaBilinmeyenEkran = this.kaydirma('yokBoyleEkran', 50) === 0;

      // ── TIKLAMA: 8 ekran × (buton merkezleri + 5 ızgara noktası) ──
      // (a) buton merkezine basınca O buton dönmeli
      // (b) ızgara noktasında `tikla` sonucu `butonlar()` ile TUTARLI olmalı
      //     (kapsayan ilk buton; hiçbiri kapsamıyorsa null)
      let isabetHata = 0, isabetSay = 0, tutarsiz = 0, izgaraSay = 0;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        for (let bi = 0; bi < boyutlar.length; bi++) {
          const W = boyutlar[bi][0], H = boyutlar[bi][1];
          this._kay[e].sc = 0;
          this.ciz(ctx, W, H, e, 0.016);
          const L = this.butonlar(e);
          const n = Math.min(5, L.length);
          for (let i = 0; i < n; i++) {
            const b = L[Math.floor(i * L.length / n)];
            isabetSay++;
            const sonuc = this.tikla(b.x + b.w / 2, b.y + b.h / 2, e);
            if (!sonuc || typeof sonuc.eylem !== 'string' || !sonuc.veri) { isabetHata++; continue; }
            // Merkez birden çok kutuda olabilir; DÖNEN buton merkezi İÇERMELİ
            let bulundu = false;
            for (let j = 0; j < L.length; j++) {
              if (L[j].id !== sonuc.eylem) continue;
              if (b.x + b.w / 2 >= L[j].x && b.x + b.w / 2 <= L[j].x + L[j].w &&
                b.y + b.h / 2 >= L[j].y && b.y + b.h / 2 <= L[j].y + L[j].h) { bulundu = true; break; }
            }
            if (!bulundu) isabetHata++;
          }
          const noktalar = [[W * 0.5, H * 0.15], [W * 0.2, H * 0.4], [W * 0.8, H * 0.4],
            [W * 0.5, H * 0.7], [W * 0.5, H * 0.95]];
          for (let i = 0; i < noktalar.length; i++) {
            izgaraSay++;
            const px = noktalar[i][0], py = noktalar[i][1];
            let bek = null;
            for (let j = 0; j < L.length; j++) {
              if (px >= L[j].x && px <= L[j].x + L[j].w && py >= L[j].y && py <= L[j].y + L[j].h) { bek = L[j].id; break; }
            }
            const sonuc = this.tikla(px, py, e);
            const geldi = sonuc ? sonuc.eylem : null;
            if (bek !== geldi) tutarsiz++;
          }
        }
      }
      r.tiklamaDogru = isabetHata === 0 && isabetSay >= 8;
      r.tiklamaTutarli = tutarsiz === 0 && izgaraSay === 8 * boyutlar.length * 5;
      r._isabet = { merkezDeneme: isabetSay, merkezHata: isabetHata, izgara: izgaraSay, tutarsiz: tutarsiz };
      r.tiklamaBosNokta = this.tikla(-50, -50, 'klan') === null;
      r.tiklamaBilinmeyenEkran = this.tikla(10, 10, 'yokBoyleEkran') === null;

      // ── BUTON ÇAKIŞMASI (yanlış isabet kaynağı) ──
      let cakisma = 0;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        for (let bi = 0; bi < boyutlar.length; bi++) {
          this._kay[e].sc = 0;
          this.ciz(ctx, boyutlar[bi][0], boyutlar[bi][1], e, 0.016);
          const L = this.butonlar(e);
          for (let i = 0; i < L.length; i++) {
            for (let j = i + 1; j < L.length; j++) {
              const a = L[i], b = L[j];
              const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
              const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
              if (ox <= 0 || oy <= 0) continue;
              const kesisim = ox * oy;
              const kucukAlan = Math.min(a.w * a.h, b.w * b.h);
              if (kucukAlan > 0 && kesisim / kucukAlan > 0.6) cakisma++;
            }
          }
        }
      }
      r.butonCakismaYok = cakisma === 0;
      r._cakisma = cakisma;

      // ── PARÇACIK SINIRI + TEMİZLENME ──
      const pn = this.konfetiBaslat('test', 500);
      r.parcacikSinirli = pn <= this.MAKS_PARCACIK && this._parcacik.length <= this.MAKS_PARCACIK;
      this._parcacikCiz(ctx, 390, 844);
      this._testZaman += 6000;
      this._parcacikCiz(ctx, 390, 844);
      r.parcacikTemizleniyor = this._parcacik.length === 0;
      r.parcacikTohumlu = (function (self) {
        self.konfetiBaslat('ayni', 20);
        const a = JSON.stringify(self._parcacik.map(function (p) { return [p.x, p.vx, p.r]; }));
        self.konfetiBaslat('ayni', 20);
        const b = JSON.stringify(self._parcacik.map(function (p) { return [p.x, p.vx, p.r]; }));
        self._parcacik = [];
        return a === b;
      })(this);

      // ── KUTU AÇMA ANİMASYONU (§37.2/D) ──
      const t0 = this._testZaman;
      this.kutuAcmaBaslat('K1', 'altin', { kp: 120 }, '#e8b23a');
      const as = [];
      const adimlar = [0, 500, 1000, 1500, 2400, 3000];
      for (let i = 0; i < adimlar.length; i++) {
        this._testZaman = t0 + adimlar[i];
        as.push(this.kutuAsamasi());
      }
      r.kutuAnimAsamalari = as[0] === 'sallanma' && as[1] === 'sallanma' && as[2] === 'isik' &&
        as[3] === 'odul' && as[4] === 'bitis' && as[5] === null;
      this._testZaman = t0;
      // animasyon MODAL: alttaki butonlar tıklanmasın
      this.ciz(ctx, 390, 844, 'klanKutu', 0.016);
      const modalL = this.butonlar('klanKutu');
      r.kutuAnimModal = modalL.length === 1 && modalL[0].id === 'klan_anim_kapat';
      this._kutuAnim = null; this._parcacik = [];

      // ── ROL PANELİ MODAL ──
      this.rolPaneliAc('u1', 'Test Üye', 'uye');
      this.ciz(ctx, 390, 844, 'klanUyeler', 0.016);
      const rl = this.butonlar('klanUyeler');
      r.rolPaneliModal = rl.length === 6 && rl[rl.length - 1].id === 'klan_rol_kapat';
      this.rolPaneliKapat();

      // ── RENKLER HEX (tuzak #5: accent + '33') ──
      const hexRe = /^#[0-9a-fA-F]{6}$/;
      let hexHata = 0;
      const kumeler = [this.PALET, Object.keys(this.RENK).map(function (k) { return this.RENK[k]; }, this),
        Object.keys(this.ROL_RENK).map(function (k) { return this.ROL_RENK[k]; }, this),
        Object.keys(this.TIP_RENK).map(function (k) { return this.TIP_RENK[k]; }, this)];
      for (let i = 0; i < kumeler.length; i++) {
        for (let j = 0; j < kumeler[i].length; j++) if (!hexRe.test(kumeler[i][j])) hexHata++;
      }
      r.renklerHex = hexHata === 0;
      r.hexTamKoruyor = this._hexTam('rgba(1,2,3,0.5)', '#123456') === '#123456' &&
        this._hexTam('#abc', '#123456') === '#123456' && this._hexTam('#00ccff', '#123456') === '#00ccff';

      // ── DUYURU TİPLERİ (8 tip, ikon + renk) ──
      const tipler = ['sistem', 'seviye', 'savas', 'etkinlik', 'basarim', 'kutu', 'gorev', 'sezon'];
      let tipHata = 0;
      for (let i = 0; i < tipler.length; i++) {
        if (!this.TIP_IKON[tipler[i]] || !this.TIP_RENK[tipler[i]]) tipHata++;
      }
      r.duyuruTipleriTam = tipHata === 0;

      // ── YATAY DÜZEN: sütun sayısı GENİŞLİKTEN türer ──
      r.yataySutun = this._sut(844) >= 2 && this._sut(926) >= 2 && this._sut(360) === 1;

      // ── KENDİ KAYDIRMASI VAR → UI._KAYDIRMALI'ya EKLENMEMELİ ──
      const U = this._UIM();
      let kaydirmaliCakisma = 0;
      if (U && U._KAYDIRMALI) {
        for (let i = 0; i < this.EKRANLAR.length; i++) if (U._KAYDIRMALI[this.EKRANLAR[i]]) kaydirmaliCakisma++;
      }
      r.kaydirmaliListedeYok = kaydirmaliCakisma === 0;

      // ── VERİ MODÜLLERİ YOKKEN ÇÖKMÜYOR ──
      r._modulDurumu = {
        Klan: !!this._K(), KlanSim: !!this._S(), KlanKutu: !!this._KU(),
        KlanEtkinlik: !!this._E(), KlanSavas: !!this._SV()
      };
      r.modulsuzCokmuyor = this._hataSay === 0;

      // ── TÜRKÇE BÜYÜK HARF (5 harf + 'ı' ayrımı) ──
      // 🔴 `toUpperCase()` DİLDEN BAĞIMSIZDIR: 'i'->'I'. Türkçede 'i'->'İ'.
      //    Hangi yolun (locale / yedek eşleme) kullanıldığı ÖLÇÜLÜR.
      this._buyukYol = null;
      const buyukCift = [['i', 'İ'], ['ı', 'I'], ['ğ', 'Ğ'], ['ü', 'Ü'], ['ş', 'Ş'], ['ö', 'Ö'], ['ç', 'Ç']];
      let buyukHata = 0;
      for (let i = 0; i < buyukCift.length; i++) {
        if (this._buyuk(buyukCift[i][0]) !== buyukCift[i][1]) buyukHata++;
      }
      r.turkceBuyukHarf = buyukHata === 0;
      r._buyukYolu = this._buyukYol;
      r.turkceBuyukKelime = this._buyuk('Gizlilik') === 'GİZLİLİK' &&
        this._buyuk('Klan Efsanesi') === 'KLAN EFSANESİ' &&
        this._buyuk('Türk Şahinleri') === 'TÜRK ŞAHİNLERİ' &&
        this._buyuk('Haftalık Etkinlik') === 'HAFTALIK ETKİNLİK' &&
        this._buyuk('Pist Modifikasyonu') === 'PİST MODİFİKASYONU';
      // `_bant()`ın 'i' İÇEREN 16 BAŞLIĞININ HEPSİ (kanit-klan-ekran.js'in
      // bulduğu liste) — ekranın alt kısmına kaydırmadan görünmeyenler dahil.
      const bantCift = [
        ['Haftalık Etkinlik', 'HAFTALIK ETKİNLİK'], ['Üye Liderlik Tablosu', 'ÜYE LİDERLİK TABLOSU'],
        ['Harita ve Koşullar', 'HARİTA VE KOŞULLAR'], ['Pist Modifikasyonu (', 'PİST MODİFİKASYONU ('],
        ['Yeni Savaş', 'YENİ SAVAŞ'], ['En İyi Savaşçılar', 'EN İYİ SAVAŞÇILAR'],
        ['Savaş İstatistiği', 'SAVAŞ İSTATİSTİĞİ'], ['Gizemli Kutu', 'GİZEMLİ KUTU'],
        ['Renk 1 (birincil)', 'RENK 1 (BİRİNCİL)'], ['Renk 2 (ikincil)', 'RENK 2 (İKİNCİL)'],
        ['Gizlilik', 'GİZLİLİK'], ['Klan Efsanesi (', 'KLAN EFSANESİ ('],
        ['Tehlikeli Bölge', 'TEHLİKELİ BÖLGE'], ['Günlük Ücretsiz Kutu', 'GÜNLÜK ÜCRETSİZ KUTU'],
        ['Kutu Türleri', 'KUTU TÜRLERİ'], ['Açma İstatistiği', 'AÇMA İSTATİSTİĞİ']
      ];
      let bantHata = 0;
      for (let i = 0; i < bantCift.length; i++) {
        if (this._buyuk(bantCift[i][0]) !== bantCift[i][1]) bantHata++;
      }
      r.bantBasliklari16 = bantHata === 0 && bantCift.length === 16;
      // Yedek eşleme yolunun KENDİSİ de doğru olmalı (ICU'suz motorda o çalışır)
      this._buyukYol = 'esleme';
      let yedekHata = 0;
      for (let i = 0; i < buyukCift.length; i++) {
        if (this._buyuk(buyukCift[i][0]) !== buyukCift[i][1]) yedekHata++;
      }
      if (this._buyuk('Gizlilik') !== 'GİZLİLİK') yedekHata++;
      r.turkceBuyukYedekEsleme = yedekHata === 0;
      this._buyukYol = null;
      // Ham `toUpperCase()` KODDA KALMAMALI (yalnız `_buyuk` içinde serbest)
      r.hamToUpperCaseYok = !/\.toUpperCase\s*\(/.test(
        this._kaynakHaric(['_buyuk', 'selfTest', '_kaynakHaric', '_fnKaynak', '_sahteCtx']));

      // ── SIKIŞMA ORANI ≥ 0,85 (metin ezilmesi) ──
      // 🔴 `fillText(..., maxWidth)` tek başına metni yatayda EZER. Ana ekranda
      //    lore 526 px'ten 338 px'e (%64) basılıyordu. `_yaz` artık eşiğin
      //    altına düşen metni '…' ile KESER. Burada 8 ekran × 8 boyutta ÖLÇÜLÜR.
      let sikisan = 0, enKotuOran = 1, sikismaOlcum = 0;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        for (let bi = 0; bi < boyutlar.length; bi++) {
          this._kay[e] = { sc: 0, maxScroll: 0, viewH: 0, viewTop: this.UST, icerikH: 0 };
          this._olcum = true; this._yazilar = [];
          this.ciz(ctx, boyutlar[bi][0], boyutlar[bi][1], e, 0.016);
          this._olcum = false;
          for (let i = 0; i < this._yazilar.length; i++) {
            const t = this._yazilar[i];
            sikismaOlcum++;
            const o = (t.olculen > t.maxW && t.olculen > 0) ? (t.maxW / t.olculen) : 1;
            if (o < enKotuOran) enKotuOran = o;
            if (o < this.SIKISMA_ESIK - 1e-9) sikisan++;
          }
        }
      }
      r.sikismaEsikUstunde = sikisan === 0;
      r._sikisma = { olcum: sikismaOlcum, esikAlti: sikisan, enKotuOran: Math.round(enKotuOran * 1000) / 1000 };
      // Kelime kaydırma gerçekten SARIYOR ve artığı '…' ile kesiyor
      (function (self) {
        const uzun = 'Kırsalın tozundan Kutup buzuna kadar her pisti süren, frene son anda ' +
          'basan bir avuç sürücüyüz. Şahin gibi bakar, şahin gibi dalarız.';
        self._sonFont = 12;
        ctx.font = '12px Arial';
        const s2 = self._sarMetin(ctx, uzun, 200, 2);
        const s8 = self._sarMetin(ctx, uzun, 200, 12);
        r.kelimeKaydirmaSariyor = s2.length === 2 && s8.length > 2;
        r.kelimeKaydirmaKesiyor = s2[s2.length - 1].charAt(s2[s2.length - 1].length - 1) === '…' &&
          s8[s8.length - 1].charAt(s8[s8.length - 1].length - 1) !== '…';
        let genisHata = 0;
        for (let i = 0; i < s8.length; i++) if (self._genislik(ctx, s8[i]) > 200.5) genisHata++;
        r.kelimeKaydirmaSigiyor = genisHata === 0;
      })(this);

      // ── İÇ KİMLİK (ENUM) EKRANA SIZMIYOR ──
      // 🔴 "aylik yenilenir" · "Harita: desert" · "2× efsanevi" ekranda çıkıyordu.
      const sizanEnum = ['aylik', 'haftalik', 'gunluk', 'sezonluk', 'efsanevi', 'gumus',
        'katilim', 'desert', 'countryside', 'winter', 'graveyard', 'rainbow_road'];
      let enumSizinti = 0;
      const enumOrnek = [];
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const e = this.EKRANLAR[ei];
        this._kay[e] = { sc: 0, maxScroll: 0, viewH: 0, viewTop: this.UST, icerikH: 0 };
        this._olcum = true; this._yazilar = [];
        this.ciz(ctx, 390, 844, e, 0.016);
        this._olcum = false;
        for (let i = 0; i < this._yazilar.length; i++) {
          const m = String(this._yazilar[i].m);
          for (let j = 0; j < sizanEnum.length; j++) {
            const re = new RegExp('(^|[^A-Za-zÇĞİÖŞÜçğıöşü])' + sizanEnum[j] + '($|[^A-Za-zÇĞİÖŞÜçğıöşü])');
            if (re.test(m)) { enumSizinti++; if (enumOrnek.length < 5) enumOrnek.push(e + ': ' + m); break; }
          }
        }
      }
      r.enumSizintisiYok = enumSizinti === 0;
      r._enum = { sizinti: enumSizinti, ornek: enumOrnek };
      // Çeviricilerin kendisi
      r.periyotAdiTurkce = this._periyotAd('aylik') === 'Aylık' &&
        this._periyotAd('haftalik') === 'Haftalık' && this._periyotAd('gunluk') === 'Günlük' &&
        this._periyotAd('sezonluk') === 'Sezonluk' && this._periyotAd('bilinmeyen_kod') === 'Bilinmeyen kod';
      r.haritaAdiHamDegil = this._haritaAd('desert').indexOf('desert') < 0 &&
        this._haritaAd('rainbow_road').indexOf('_') < 0 &&
        this._haritaAd('yok_boyle_harita') === 'Yok boyle harita';
      r.kutuAdiHamDegil = this._kutuAd('efsanevi') !== 'efsanevi' &&
        this._kutuAd('gumus') !== 'gumus' && this._kutuAd('bilinmeyen') === 'Bilinmeyen';

      // ── ÖZEL GÜN ROZETİ: HER GÜNE KENDİ İKONU ──
      const ogK = Object.keys(this.OZEL_GUN_IKON);
      const ogGorulen = {};
      let ogHata = 0;
      for (let i = 0; i < ogK.length; i++) {
        const ik = this.OZEL_GUN_IKON[ogK[i]];
        if (!ik || ogGorulen[ik]) ogHata++;
        ogGorulen[ik] = true;
      }
      r.ozelGunIkonlariFarkli = ogHata === 0 && ogK.length === 4;
      // Veri modülü varsa ASIL kaynak onun `ikon` alanı olmalı
      (function (self) {
        const E2 = self._E();
        if (!E2 || !E2.OZEL_GUN) { r.ozelGunIkonKaynagi = true; return; }
        const ks = Object.keys(E2.OZEL_GUN);
        let eksik = 0, tekrar = 0;
        const gor = {};
        for (let i = 0; i < ks.length; i++) {
          const ik = E2.OZEL_GUN[ks[i]].ikon;
          if (!ik) eksik++; else { if (gor[ik]) tekrar++; gor[ik] = true; }
        }
        r.ozelGunIkonKaynagi = (eksik === 0 && tekrar === 0);
      })(this);

      // ── HAZIR KUTU, BEKLEYENDEN DAHA GÖRÜNÜR (görsel hiyerarşi) ──
      // 🔴 Hazır kutular kendi açık gri renkleriyle vurgulanınca SOLUK
      //    görünüyordu. Ayrım artık renge DEĞİL metne de dayanıyor.
      (function (self) {
        const kay = self._fnKaynak('_cizKutu');
        r.hazirKutuVurgusu = /HAZIR/.test(kay) && /HAZIR_C/.test(kay) &&
          /bekliyor/.test(kay) && /_rozet\(/.test(kay);
      })(this);

      // ── GİZLİ (kırpılmış) BUTON DIŞARI SIZMIYOR ──
      let sizinti = 0;
      for (let ei = 0; ei < this.EKRANLAR.length; ei++) {
        const L = this.butonlar(this.EKRANLAR[ei]);
        for (let i = 0; i < L.length; i++) if (L[i].y < -9000 || L[i].h <= 0) sizinti++;
      }
      r.gizliButonSizmiyor = sizinti === 0;

    } catch (e) {
      r._catch = String(e && e.stack ? e.stack : e);
      r.istisnaYok = false;
    } finally {
      this._btns = yedek.btns; this._kay = yedek.kay; this._anim = yedek.anim;
      this._onbellek = yedek.onb; this._grOnbellek = yedek.gr; this._grCtx = yedek.grCtx;
      this._parcacik = yedek.par; this._kutuAnim = yedek.kutu; this._seviyeAnim = yedek.sev;
      this._rolPanel = yedek.rol; this._testZaman = yedek.zaman; this._hataSay = yedek.hata;
      this._kaydirmaBagli = yedek.bagli; this._olcum = false;
    }

    r.allPass = Object.keys(r).every(function (k) {
      return k === 'allPass' || k.charAt(0) === '_' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') window.KlanUI = KlanUI;
if (typeof module !== 'undefined' && module.exports) module.exports = KlanUI;
