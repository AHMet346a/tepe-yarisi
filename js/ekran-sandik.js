'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ekran-sandik.js — SANDIK AÇILIŞ ANİMASYONU (HCR2 referans düzeni)
   ---------------------------------------------------------------------------
   REFERANS GÖRSEL (Pictures/garaj parçaları/):
     · "Ekran görüntüsü 2026-08-03 145038.png"  → SANDIK SONUÇ EKRANI
       Mor/mistik kasa arka planı · 5 ödül kartı yan yana. Her kartta:
         - üstte EĞİK nadirlik şeridi (RARE! · EPIC! · LEGENDARY! · MYTHIC!)
           🔴 5. kart (TRACKS) şeritsiz → şerit YALNIZ rare ve üstünde çizilir.
         - nadirlik renginde yuvarlak fayans + parça ikonu
         - fayansın sağ altında "x2 / x3 / x1" adet rozeti (beyaz, koyu konturlu)
         - altında koyu ilerleme kapsülü: "259" · "3" · "10/17" (mavi dolgu
           çubuğuyla) · "NEW!" (yanında seviye rozeti) · "1/180"
         - en altta BEYAZ ad kapsülü (WHEELIE BOOST · AFTERBURNER · FUEL BOOST ·
           ECHO · TRACKS) — koyu kalın yazı
       Ortada altın yığını (üst üste sikke istifi) + sarı kapsülde "33 000" +
       sikke ikonu · altta yeşil DONE butonu.
     · "...144633.png" (HCR2 Chest Sequence for Cups) → 111 adımlık kupa sandık
       sırası. BU DOSYA O SIRAYI UYGULAMAZ (ödül üretimi `Economy.openChest`
       ve `KlanKutu`'nun işi); yalnız "hangi sandık" bilgisini `kaynak`
       parametresiyle alır ve sandık gövdesini ona göre renklendirir.

   DIŞA VERİLEN API (imza KESİN — ana oturum bunu bağlar):
     EkranSandik.baslat(oduller, kaynak)
     EkranSandik.aktif()            -> bool  (kaplama AÇIK mı = çizilmeli mi)
     EkranSandik.ciz(ctx, W, H, dt)
     EkranSandik.tikla(x, y)        -> {eylem, veri} | null
     EkranSandik.butonlar()
     EkranSandik.atla()             -> animasyonu atla, sonuca zıpla
     EkranSandik.hazir()
     EkranSandik.selfTest()
   EK (sözleşme dışı yardımcı, ana oturum isterse kullanır):
     EkranSandik.oynuyor()          -> bool  (animasyon HÂLÂ oynuyor mu)
     EkranSandik.kapat()            -> kaplamayı kapat
     EkranSandik.donustur(sonuc, kaynak, ekBilgi) -> `oduller` dizisi
       🔴 `Economy.openChest(tur)` ÇIKTISINI bu fonksiyon `baslat()`ın beklediği
          şekle çevirir (eşleme tablosu raporda).

   ⚠ `aktif()` "kaplama açık mı" demektir, "animasyon oynuyor mu" DEĞİL.
     Sonuç aşamasında da TRUE döner — aksi hâlde çağıran çizmeyi bırakır ve
     DONE butonu hiç görünmez. Saf animasyon durumu için `oynuyor()` var.

   ═══ ÖDÜL ŞEKLİ ═════════════════════════════════════════════════════════════
     oduller: [{tip, id, ad, nadirlik, adet, ikon, sahip, gerekli, yeni}]
       tip      : 'parca' | 'arac' | 'altin' | 'elmas' | 'hurda' | 'kart'
                  🔴 tip==='altin' olanlar KART OLARAK ÇİZİLMEZ; toplanıp
                     ortadaki altın yığınına gider (referanstaki davranış).
       nadirlik : common|uncommon|rare|epic|legendary|mythic
                  KlanKutu id'leri de kabul edilir:
                  siradan→common · nadir→rare · destansi→epic ·
                  efsanevi→legendary · efsanevipl→mythic
       adet     : sayı (kartta "xN" rozeti)
       ikon     : EkranGaraj._ikon tipi (verilmezse id'den türetilir)
       sahip/gerekli : kart ilerlemesi ("10/17"); gerekli yoksa yalnız sahip
       yeni     : true → "NEW!"
     kaynak   : 'daily'|'bronze'|'silver'|'gold'|'platinum'|'legendary'|
                'mythic'|'wooden'|'ruby'|'cosmic'|'klan'|... (sandık rengi)

   ═══ ZAMAN ═════════════════════════════════════════════════════════════════
   🔴 Zaman `Date.now()` ile ölçülür, `dt` BİRİKTİRİLMEZ.
      (`js/intro.js` tam olarak bu yüzden takılmıştı: `ui.js._lastDt` güvenilmez,
       dt biriktirilince 12 sn'de t=0,53 çıkıyordu.)
      `dt` YALNIZ arka plan parıltısının fazında kullanılır ve sınırlıdır.
   🔴 Toplam süre 3 sn'yi GEÇMEZ (ölçüldü, selfTest kilitliyor).
   🔴 `atla()` HER aşamada çalışır (`_t0` geriye alınır → sonuç aşaması).
   ⚠ Test/kanıt için `_sabitZaman` (ms) atanabilir → `Date.now()` yerine o
     kullanılır. Canlıda ASLA atanmaz (selfTest sonunda null'a çekilir).

   ═══ PROJE KURALLARI (hepsi selfTest ile kilitli) ═══════════════════════════
     · `ctx.font` YALNIZ `_font()` içinde atanır; boyut min(W-tabanlı, H-tabanlı).
     · `ctx.fillText` YALNIZ `_yaz()` içinde; her çağrıda maxWidth verilir,
       sıkışma 0,85 altına düşerse önce font küçültülür, sonra "…" ile kesilir.
     · Gradyanlar `_gr()`/`_grR()` ile ÖNBELLEKLİ — kare başına yeni gradyan 0.
       (Kart POP animasyonu `translate+scale` ile yapılır; gradyan koordinatları
        SABİT kalır → önbellek ıskalamaz.)
     · `ctx.ellipse` YOK (save+scale+arc+restore), `getImageData` YOK.
     · `Math.random` YOK — tüm rastgelelik TOHUMLU (`_rnd`), tohum ödüllerden
       türetilir → AYNI ödül = AYNI animasyon.
     · Parçacıklar SABİT HAVUZDAN gelir (72 adet, bir kez kurulur) ve konumları
       ANALİTİK hesaplanır (x0+vx·e, y0+vy·e+½g·e²) → kare başına yeni nesne 0,
       kare hızından bağımsız, `atla()` sonrası da doğru.
     · `toUpperCase()` YOK. Türkçe metin `_buyuk()`, İNGİLİZCE veri
       `_buyukAscii()`. 🔴 `_buyuk('Wheelie Boost')` → "WHEELİE BOOST" olurdu.
     · Renkler HEX (`accent + '33'` alfa eklemesi bozulmasın), `rgba()` YOK.
     · Bare global'ler `typeof X !== 'undefined'` ile okunur (`window.X` ÇALIŞMAZ).
     · Dokunma hedefi ≥ 44 px.
     · 🔴 Bu modül SaveData'ya HİÇ YAZMAZ (ödülü çağıran verir). selfTest
       kaydı önce/sonra `JSON.stringify` ile kıyaslar.
   ═══════════════════════════════════════════════════════════════════════════ */

const EkranSandik = {
  SURUM: '1.0',

  // ── Palet (HEX ZORUNLU) ──────────────────────────────────────────────────
  C: {
    kasaUst:  '#2b1d5c',
    kasaAlt:  '#150e30',
    kasaTon:  '#4a2c8f',
    duman:    '#6b3fb5',
    panel:    '#1d2536',
    koyu:     '#0e1320',
    kapsul:   '#12172a',
    yazi:     '#e8eef7',
    beyaz:    '#f4f7fc',
    alt:      '#9fb0c8',
    altin:    '#ffcf3f',
    altin2:   '#e29a10',
    altinKen: '#7a4c05',
    elmas:    '#4fd0ff',
    hurda:    '#b6c2d2',
    yesil:    '#4bbd4b',
    yesil2:   '#2f8a2f',
    ilerle:   '#39c8f0',
    golge:    '#05070d'
  },

  // ── Nadirlik (referans şeritlerinden) ────────────────────────────────────
  //  Renkler `EkranGaraj.NADIR_RENK` ile BİREBİR aynıdır; o modül yüklüyse
  //  oradan okunur (tek kaynak), yoksa bu kopya kullanılır.
  NADIR_SIRA: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
  NADIR_RENK: {
    common:    '#b9c4d0',
    uncommon:  '#4a9eff',
    rare:      '#ffb347',
    epic:      '#b06bff',
    legendary: '#8fe9ff',
    mythic:    '#ffd24a'
  },
  NADIR_KOYU: {
    common:    '#5d6874',
    uncommon:  '#1c4e8f',
    rare:      '#a35c00',
    epic:      '#5b2a94',
    legendary: '#2c7d96',
    mythic:    '#9a6f00'
  },
  NADIR_ETIKET: {
    common:    'COMMON',
    uncommon:  'UNCOMMON',
    rare:      'RARE!',
    epic:      'EPIC!',
    legendary: 'LEGENDARY!',
    mythic:    'MYTHIC!'
  },
  // KlanKutu / Türkçe kimlik eşlemesi
  NADIR_ESLE: {
    siradan: 'common', sıradan: 'common', normal: 'common', ortak: 'common',
    nadir: 'rare', destansi: 'epic', 'destansı': 'epic',
    efsanevi: 'legendary', efsanevipl: 'mythic', efsane: 'legendary',
    mitik: 'mythic', mistik: 'mythic'
  },
  // 🔴 Şerit YALNIZ bu indeks ve üstünde çizilir (referans: TRACKS şeritsiz)
  SERIT_ESIK: 2,
  // 🔴 Patlama + ekran titremesi YALNIZ bu indeks ve üstünde
  VURGU_ESIK: 4,

  // Sandık gövde renkleri (Economy.CHESTS anahtarları + klan)
  SANDIK_RENK: {
    daily:     ['#7a5ae8', '#3b2a7a'],
    wooden:    ['#b5793a', '#5e3a17'],
    bronze:    ['#cd7f32', '#6b3d13'],
    silver:    ['#c9d2da', '#69737e'],
    gold:      ['#ffcf3f', '#8a6104'],
    platinum:  ['#e6f0fa', '#7f95ad'],
    ruby:      ['#ff5a5a', '#7d1616'],
    legendary: ['#ff8a3d', '#8a3406'],
    mythic:    ['#ffd24a', '#8a6100'],
    cosmic:    ['#a97bff', '#3d1f7a'],
    klan:      ['#4aa8ff', '#123f70']
  },

  // ── Süreler (ms) — TOPLAM ≤ 3000 (selfTest ölçer) ────────────────────────
  T_SALLA: 520,      // 0    → 520   sandık sallanır
  T_ACIL:  380,      // 520  → 900   kapak açılır + ışık huzmesi
  T_KART:  300,      // her kartın kendi belirme süresi
  T_ADIM:  180,      // kartlar arası gecikme (n büyüdükçe daralır)
  T_ADIM_MIN: 55,
  T_ALTIN: 460,      // altın yığını + sayaç
  T_DONE:  220,      // DONE butonu belirmesi (toplam süreye DAHİL DEĞİL)
  MAKS_KART: 12,
  MAKS_TOPLAM: 3000,

  MIN_HEDEF: 44,     // dokunma hedefi alt sınırı
  MIN_KART: 86,

  // ── Durum ────────────────────────────────────────────────────────────────
  _acik: false,
  _t0: 0,
  _sabitZaman: null,
  _kaynak: '',
  _tumOdul: null,     // ham liste (kapatma olayında geri verilir)
  _kartlar: null,     // gösterilecek kartlar (nadirlikçe artan, en iyi SONDA)
  _gizli: 0,
  _altin: 0,
  _tohum: 0,
  _btn: [],
  _t: 0,
  _px: 12,
  _grC: {},
  _grCtx: null,
  _grBoyut: '',
  _olcum: null,
  _hav: null,
  _havN: 0,
  _sonDuzen: null,
  _HAV_MAX: 72,

  _TRB: { 'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç' },

  // ═════════════════════════════════════════════════════════════════════════
  // TEMEL YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  hazir() { this._havKur(); return true; },

  // İKİ AŞAMALI global okuma (bare isim → window). Bkz. CLAUDE.md tuzağı.
  _g(ad) {
    var v = null;
    try {
      switch (ad) {
        case 'SaveData':    v = (typeof SaveData    !== 'undefined') ? SaveData    : null; break;
        case 'Economy':     v = (typeof Economy     !== 'undefined') ? Economy     : null; break;
        case 'EkranGaraj':  v = (typeof EkranGaraj  !== 'undefined') ? EkranGaraj  : null; break;
        case 'KlanKutu':    v = (typeof KlanKutu    !== 'undefined') ? KlanKutu    : null; break;
        case 'UI':          v = (typeof UI          !== 'undefined') ? UI          : null; break;
        case 'I18N':        v = (typeof I18N        !== 'undefined') ? I18N        : null; break;
        default: v = null;
      }
    } catch (e) { v = null; }
    if (v) return v;
    try { if (typeof window !== 'undefined' && window && window[ad]) return window[ad]; }
    catch (e2) { }
    return null;
  },

  // Türkçe güvenli büyük harf — `toUpperCase` KULLANMAZ (i → İ)
  _buyuk(metin) {
    var s = String(metin == null ? '' : metin);
    var u = this._g('UI');
    if (u && typeof u._trBuyuk === 'function') {
      try { return u._trBuyuk(s); } catch (e) { }
    }
    var o = '', i, c, k;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (this._TRB[c]) { o += this._TRB[c]; continue; }
      k = s.charCodeAt(i);
      if (k >= 97 && k <= 122) { o += String.fromCharCode(k - 32); continue; }
      o += c;
    }
    return o;
  },

  // 🔴 İNGİLİZCE veri (parça/araç adları) için AYRI büyütme.
  //   `_buyuk('Wheelie Boost')` → "WHEELİE BOOST" (U2'nin PNG'de yakalanan hatası)
  _buyukAscii(metin) {
    var s = String(metin == null ? '' : metin), o = '', i, k;
    for (i = 0; i < s.length; i++) {
      k = s.charCodeAt(i);
      o += (k >= 97 && k <= 122) ? String.fromCharCode(k - 32) : s.charAt(i);
    }
    return o;
  },

  // Metin ASCII mi (İngilizce veri) → hangi büyütme kullanılacağını seçer
  _asciiMi(s) {
    var i, k;
    s = String(s == null ? '' : s);
    for (i = 0; i < s.length; i++) { k = s.charCodeAt(i); if (k > 127) return false; }
    return true;
  },

  _ad(metin) {
    return this._asciiMi(metin) ? this._buyukAscii(metin) : this._buyuk(metin);
  },

  _sayi(n) {
    n = Math.floor(Number(n) || 0);
    try { return n.toLocaleString('tr-TR'); } catch (e) { }
    var s = String(Math.abs(n)), o = '', c = 0, i;
    for (i = s.length - 1; i >= 0; i--) { o = s.charAt(i) + o; if (++c % 3 === 0 && i > 0) o = '.' + o; }
    return (n < 0 ? '-' : '') + o;
  },

  _kisaSayi(n) {
    n = Math.floor(Number(n) || 0);
    if (n >= 1000000) return (Math.round(n / 100000) / 10) + 'M';
    if (n >= 100000) return Math.round(n / 1000) + 'K';
    return this._sayi(n);
  },

  // FNV-1a (Math.imul → C#'ta `uint` ile birebir; tuzak D16'ya DÜŞMEZ)
  _hash(s) {
    s = String(s == null ? '' : s);
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  },

  // Tohumlu sayı üreteci — `Math.random` PROJEDE HİÇ ÇAĞRILMAZ
  _rnd(i) {
    var h = (this._tohum ^ Math.imul(i + 1, 2654435761)) >>> 0;
    h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 3266489917) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },

  _simdi() {
    if (this._sabitZaman != null && isFinite(this._sabitZaman)) return Number(this._sabitZaman);
    return Date.now();
  },

  _kelepce(v, a, b) { v = Number(v); if (!isFinite(v)) return a; return v < a ? a : (v > b ? b : v); },

  // Yumuşatma eğrileri (hepsi saf fonksiyon — kare hızından bağımsız)
  _easeOut(p) { p = this._kelepce(p, 0, 1); return 1 - (1 - p) * (1 - p) * (1 - p); },
  _easeIn(p) { p = this._kelepce(p, 0, 1); return p * p; },
  _easeBack(p) {
    p = this._kelepce(p, 0, 1);
    var s = 1.9, q = p - 1;
    return 1 + (s + 1) * q * q * q + s * q * q;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ÇİZİM PRİMİTİFLERİ (font / metin / gradyan — TEK kapı)
  // ═════════════════════════════════════════════════════════════════════════

  // 🔴 Projede `.font =` ATAMASI YALNIZ BURADA (selfTest sayarak kilitler).
  _font(c, px, kalinlik) {
    px = Math.max(6, Math.round(Number(px) || 10));
    this._px = px;
    c.font = (kalinlik || 'bold') + ' ' + px + 'px Arial';
    return px;
  },

  // Font boyutu HER ZAMAN min(W-tabanlı, H-tabanlı) + kelepçe
  _f(c, W, H, rw, rh, mn, mx, kalinlik) {
    var px = Math.min(W * rw, H * rh);
    px = Math.max(mn, Math.min(mx, px));
    return this._font(c, px, kalinlik);
  },

  _mw(c, t) {
    try { var m = c.measureText(String(t)); return (m && isFinite(m.width)) ? m.width : 0; }
    catch (e) { return 0; }
  },

  // 🔴 Projede `fillText(` ÇAĞRISI YALNIZ BURADA.
  //   1) sıkışma oranı 0,85 altına düşerse font küçültülür
  //   2) hâlâ sığmıyorsa "…" ile kesilir
  //   3) her çağrıda maxWidth verilir (iki katmanlı koruma — 29 Tmz ölçümü)
  //   4) `kontur` verilirse ÖNCE strokeText (referanstaki "x2" rozeti)
  _yaz(c, metin, x, y, maxW, hiza, kalinlik, kontur, konturW) {
    var txt = String(metin == null ? '' : metin);
    var O = this._olcum;
    if (maxW == null || !isFinite(maxW) || maxW <= 0) { if (O) O.maxsiz++; maxW = 1e6; }
    try { c.textAlign = hiza || 'left'; } catch (e) { }
    var px = this._px, w = this._mw(c, txt), koru = 0;
    if (maxW > 0 && w > 0) {
      while (w > maxW && (maxW / w) < 0.85 && px > 7 && koru < 48) {
        px--; this._font(c, px, kalinlik); w = this._mw(c, txt); koru++;
      }
      if (w > maxW && (maxW / w) < 0.85) {
        var t = txt, ww;
        // 🔴 ÖLÇÜM DELİĞİ (PNG'de yakalandı): kesilen metin "sıkışma" sayılmıyordu
        //   (kesme sonrası oran 1,00 oluyor) → doğrulayıcı "taşma 0" diyordu ama
        //   ekranda "HEAVYW…", "JUMP SH…" yazıyordu. Artık AYRICA sayılıyor.
        if (O) { O.kesik++; if (!O.kesikTxt) O.kesikTxt = txt; }
        while (t.length > 1) {
          t = t.substring(0, t.length - 1);
          ww = this._mw(c, t + '…');
          if (ww <= maxW) { txt = t + '…'; w = ww; break; }
        }
        if (this._mw(c, txt) > maxW) { txt = '…'; w = this._mw(c, txt); }
      }
    }
    var oran = (maxW > 0 && w > maxW && w > 0) ? (maxW / w) : 1;
    if (O) {
      if (oran < O.minOran) { O.minOran = oran; O.minTxt = txt; }
      if (oran < 0.85) O.tasma++;
      O.yaziSayisi++;
    }
    if (kontur) {
      try {
        var eskiS = c.strokeStyle, eskiL = c.lineWidth, eskiJ = c.lineJoin;
        c.strokeStyle = kontur;
        c.lineWidth = Math.max(2, konturW || Math.round(this._px * 0.22));
        c.lineJoin = 'round';
        c.strokeText(txt, x, y, maxW);
        c.strokeStyle = eskiS; c.lineWidth = eskiL; c.lineJoin = eskiJ;
      } catch (e) { }
    }
    try { c.fillText(txt, x, y, maxW); } catch (e) { }
    return w;
  },

  // Gradyan ÖNBELLEĞİ — kare başına yeni gradyan 0 olmalı
  _grHazirla(c, W, H) {
    var anahtar = W + 'x' + H;
    if (this._grCtx !== c || this._grBoyut !== anahtar) {
      this._grC = {}; this._grCtx = c; this._grBoyut = anahtar;
    }
  },

  _gr(c, ad, x0, y0, x1, y1, duraklar) {
    var k = ad + '|' + (x0 | 0) + ',' + (y0 | 0) + ',' + (x1 | 0) + ',' + (y1 | 0);
    if (this._grC[k]) return this._grC[k];
    var g = null, i;
    try {
      g = c.createLinearGradient(x0, y0, x1, y1);
      for (i = 0; i < duraklar.length; i++) g.addColorStop(duraklar[i][0], duraklar[i][1]);
      if (this._olcum) this._olcum.grYeni++;
    } catch (e) { g = duraklar[duraklar.length - 1][1]; }
    this._grC[k] = g;
    return g;
  },

  _grR(c, ad, x, y, r0, r1, duraklar) {
    var k = 'R' + ad + '|' + (x | 0) + ',' + (y | 0) + ',' + (r0 | 0) + ',' + (r1 | 0);
    if (this._grC[k]) return this._grC[k];
    var g = null, i;
    try {
      g = c.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.5, r1));
      for (i = 0; i < duraklar.length; i++) g.addColorStop(duraklar[i][0], duraklar[i][1]);
      if (this._olcum) this._olcum.grYeni++;
    } catch (e) { g = duraklar[duraklar.length - 1][1]; }
    this._grC[k] = g;
    return g;
  },

  // Yuvarlak dikdörtgen — `roundRect` yok (test rasterizer'ında olmayabilir)
  _rr(c, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.min(w, h) / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  },

  _daire(c, cx, cy, r) { c.beginPath(); c.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2); c.fill(); },

  // 🔴 ctx.ellipse YASAK → save + scale + arc + restore
  _elips(c, cx, cy, rx, ry) {
    if (rx <= 0 || ry <= 0) return;
    c.save();
    c.translate(cx, cy);
    c.scale(1, ry / rx);
    c.beginPath();
    c.arc(0, 0, rx, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },

  _pol(c, pts, kapat) {
    var i;
    if (!pts || pts.length < 4) return;
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (i = 2; i + 1 < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    if (kapat) c.closePath();
  },

  _kapsul(c, x, y, w, h, dolgu, kenar, kenarW) {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = dolgu;
    this._rr(c, x, y, w, h, h / 2); c.fill();
    if (kenar) {
      c.strokeStyle = kenar; c.lineWidth = kenarW || 2;
      this._rr(c, x, y, w, h, h / 2); c.stroke();
    }
  },

  _buton(id, x, y, w, h, veri) {
    var b = { id: id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    if (veri) b.veri = veri;
    this._btn.push(b);
    return b;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // NADİRLİK
  // ═════════════════════════════════════════════════════════════════════════

  _nadirNorm(n) {
    var s = String(n == null ? '' : n);
    var kucuk = '', i, k;
    for (i = 0; i < s.length; i++) {
      k = s.charCodeAt(i);
      kucuk += (k >= 65 && k <= 90) ? String.fromCharCode(k + 32) : s.charAt(i);
    }
    if (this.NADIR_ESLE[kucuk]) kucuk = this.NADIR_ESLE[kucuk];
    return this.NADIR_SIRA.indexOf(kucuk) >= 0 ? kucuk : 'common';
  },

  _nadirIdx(n) { return this.NADIR_SIRA.indexOf(this._nadirNorm(n)); },

  // Renk tek kaynaktan: EkranGaraj varsa oradan (senkron kalsın), yoksa yerel
  _nadirRenk(n) {
    var id = this._nadirNorm(n);
    var EG = this._g('EkranGaraj');
    if (EG && EG.NADIR_RENK && EG.NADIR_RENK[id]) return EG.NADIR_RENK[id];
    return this.NADIR_RENK[id];
  },

  _nadirKoyu(n) { return this.NADIR_KOYU[this._nadirNorm(n)] || '#5d6874'; },

  // HEX rengi koyultur (fayans alt tonu) — `rgba()` YOK, sonuç yine HEX
  _koyult(hex) {
    var s = String(hex || '#888888').replace('#', '');
    if (s.length === 3) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    var o = '#', i, v;
    for (i = 0; i < 3; i++) {
      v = parseInt(s.substr(i * 2, 2), 16);
      if (!isFinite(v)) v = 128;
      v = Math.max(0, Math.min(255, Math.round(v * 0.45)));
      o += ('0' + v.toString(16)).slice(-2);
    }
    return o;
  },
  _nadirEtiket(n) { return this.NADIR_ETIKET[this._nadirNorm(n)] || 'COMMON'; },

  // ═════════════════════════════════════════════════════════════════════════
  // PARÇACIK HAVUZU — SABİT, kare başına yeni nesne 0
  // ═════════════════════════════════════════════════════════════════════════

  _havKur() {
    if (this._hav) return;
    var a = [], i;
    for (i = 0; i < this._HAV_MAX; i++) {
      a.push({ a: 0, ax: 0, ay: 0, vx: 0, vy: 0, g: 0, r: 1, t0: 0, om: 1, renk: '#ffffff', kare: 0 });
    }
    this._hav = a;
    this._havN = 0;
  },

  // ⚠ Havuz `baslat()` içinde DOLDURULUR; çizimde YALNIZ okunur.
  //   `ax/ay` = çıpaya göre NORMALİZE konum (0..1 ekran ölçeği ile çarpılır).
  _havPatlama(cipa, t0, adet, renk, guc) {
    var i, p, a, h, s;
    for (i = 0; i < adet; i++) {
      if (this._havN >= this._HAV_MAX) return;
      p = this._hav[this._havN];
      this._havN++;
      s = this._havN * 7 + i;
      a = this._rnd(s) * Math.PI * 2;
      h = (0.35 + this._rnd(s + 101) * 0.75) * guc;
      p.a = 1;
      p.cipa = cipa;
      p.ax = (this._rnd(s + 202) - 0.5) * 0.10;
      p.ay = (this._rnd(s + 303) - 0.5) * 0.10;
      p.vx = Math.cos(a) * h * 0.00085;
      p.vy = Math.sin(a) * h * 0.00085 - 0.00045;
      p.g = 0.0000024;
      p.r = 0.006 + this._rnd(s + 404) * 0.012;
      p.t0 = t0 + Math.floor(this._rnd(s + 505) * 90);
      p.om = 420 + Math.floor(this._rnd(s + 606) * 380);
      p.renk = renk;
      p.kare = this._rnd(s + 707) < 0.45 ? 1 : 0;
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // BAŞLATMA / DURUM
  // ═════════════════════════════════════════════════════════════════════════

  // Tek ödülü normalize et. ⚠ Girdi nesnesi DEĞİŞTİRİLMEZ (çağıranın verisi).
  _normalizeOdul(o, sira) {
    if (!o || typeof o !== 'object') return null;
    var tip = String(o.tip || 'parca');
    if (tip !== 'parca' && tip !== 'arac' && tip !== 'altin' && tip !== 'elmas' &&
        tip !== 'hurda' && tip !== 'kart') tip = 'parca';
    var nadir = this._nadirNorm(o.nadirlik);
    var adet = Math.max(0, Math.floor(Number(o.adet) || 0));
    var sahip = (o.sahip == null || !isFinite(Number(o.sahip))) ? null : Math.max(0, Math.floor(Number(o.sahip)));
    var gerekli = (o.gerekli == null || !isFinite(Number(o.gerekli))) ? null : Math.max(0, Math.floor(Number(o.gerekli)));
    var ad = String(o.ad == null ? (o.id == null ? '?' : o.id) : o.ad);
    return {
      tip: tip,
      id: String(o.id == null ? ('odul' + sira) : o.id),
      ad: ad,
      nadirlik: nadir,
      nIdx: this.NADIR_SIRA.indexOf(nadir),
      adet: adet,
      ikon: (o.ikon == null ? '' : String(o.ikon)),
      sahip: sahip,
      gerekli: gerekli,
      yeni: !!o.yeni,
      // İsteğe bağlı fayans rengi (para birimleri için — nadirlik şeridi çıkmasın
      // diye nadirlik 'common' kalır ama fayans kendi rengini korur)
      renk: (typeof o.renk === 'string' && o.renk.charAt(0) === '#') ? o.renk : '',
      seviye: (o.seviye == null || !isFinite(Number(o.seviye))) ? null : Math.max(0, Math.floor(Number(o.seviye))),
      sira: sira
    };
  },

  // Nadirlik ARTAN, en iyi SONDA. Ekleme sıralaması → KARARLI (eşitlikte giriş
  // sırası korunur; `sort` karşılaştırıcısıyla yön hatası yapılmasın diye elle).
  _sirala(liste) {
    var i, j, k;
    for (i = 1; i < liste.length; i++) {
      k = liste[i]; j = i - 1;
      while (j >= 0 && (liste[j].nIdx - k.nIdx) > 0) { liste[j + 1] = liste[j]; j--; }
      liste[j + 1] = k;
    }
    return liste;
  },

  baslat(oduller, kaynak) {
    this._havKur();
    var ham = (oduller && oduller.length) ? oduller : [];
    var i, o, kart = [], altin = 0, tohumS = String(kaynak || '') + '|';

    for (i = 0; i < ham.length; i++) {
      o = this._normalizeOdul(ham[i], i);
      if (!o) continue;
      tohumS += o.tip + ':' + o.id + ':' + o.adet + ':' + o.nadirlik + ';';
      if (o.tip === 'altin') { altin += o.adet; continue; }
      kart.push(o);
    }

    this._tohum = this._hash(tohumS || 'bos');
    this._sirala(kart);

    this._gizli = 0;
    if (kart.length > this.MAKS_KART) {
      this._gizli = kart.length - this.MAKS_KART;
      kart = kart.slice(kart.length - this.MAKS_KART);   // en iyi MAKS_KART tanesi
    }

    this._tumOdul = ham;
    this._kartlar = kart;
    this._altin = altin;
    this._kaynak = String(kaynak || 'bronze');
    this._t0 = this._simdi();
    this._t = 0;
    this._acik = true;
    this._btn = [];
    this._sonDuzen = null;

    // ── Parçacıklar TOHUMLU olarak BURADA doldurulur (çizimde 0 tahsis) ──
    var Z = this._zaman();
    this._havN = 0;
    for (i = 0; i < this._hav.length; i++) this._hav[i].a = 0;
    this._havPatlama('sandik', Z.acilS, 26, this.C.altin, 1);
    for (i = 0; i < kart.length; i++) {
      if (kart[i].nIdx < this.VURGU_ESIK) continue;
      this._havPatlama('kart' + i, Z.kartT(i) + Math.round(this.T_KART * 0.55),
        kart[i].nIdx >= 5 ? 14 : 10, this._nadirRenk(kart[i].nadirlik), 1.15);
    }
    return true;
  },

  aktif() { return this._acik === true; },

  // Sözleşme dışı yardımcı: animasyon HÂLÂ oynuyor mu
  oynuyor() {
    if (!this._acik) return false;
    return this._gecen() < this._zaman().toplam;
  },

  atla() {
    if (!this._acik) return false;
    var Z = this._zaman();
    this._t0 = this._simdi() - Z.toplam - this.T_DONE - 1;
    return true;
  },

  kapat() {
    this._acik = false;
    this._btn = [];
    return true;
  },

  _gecen() {
    var e = this._simdi() - this._t0;
    return (isFinite(e) && e > 0) ? e : 0;
  },

  // Aşama zaman çizelgesi — n'e göre daralan adım, TOPLAM ≤ MAKS_TOPLAM
  _zaman() {
    var n = this._kartlar ? this._kartlar.length : 0;
    var adim = this.T_ADIM;
    if (n > 1) adim = Math.max(this.T_ADIM_MIN, Math.min(this.T_ADIM, Math.round(900 / n)));
    var acilS = this.T_SALLA;                 // kapak açılma başlangıcı
    var kart0 = this.T_SALLA + this.T_ACIL;   // ilk kart
    var kartSon = kart0 + (n > 0 ? (n - 1) * adim + this.T_KART : 0);
    var altinS = kartSon;
    var toplam = altinS + this.T_ALTIN;
    if (toplam > this.MAKS_TOPLAM) toplam = this.MAKS_TOPLAM;
    var M = this;
    return {
      n: n, adim: adim, acilS: acilS, acilB: kart0,
      kart0: kart0, kartSon: kartSon, altinS: altinS, toplam: toplam,
      kartT: function (i) { return kart0 + i * adim; },
      M: M
    };
  },

  // Aşama adı (kanıt betiği ve selfTest okur)
  asama() {
    if (!this._acik) return 'kapali';
    var e = this._gecen(), Z = this._zaman();
    if (e < Z.acilS) return 'sallanma';
    if (e < Z.kart0) return 'acilma';
    if (e < Z.kartSon) return 'kartlar';
    if (e < Z.toplam) return 'altin';
    return 'sonuc';
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DÜZEN — dikey ve yatay AYRI
  // ═════════════════════════════════════════════════════════════════════════

  // 🔴 PNG'de yakalanan hata: ilk sürümde ızgara KENDİ alanında ortalanıyordu;
  //   dikeyde kartlarla altın arasında ekranın ~%20'si BOŞ kalıyordu (yatayda
  //   sorun yoktu, o yüzden yalnız yatay bakılsa görülmezdi).
  //   ▶ Artık "ızgara + altın" TEK BLOK sayılır, artan boşluk 35/45/20 oranıyla
  //     üst / ara / alt olarak dağıtılır.
  _duzen(W, H) {
    var n = this._kartlar ? this._kartlar.length : 0;
    var yatay = W > H * 1.15;
    var pay = Math.max(8, Math.min(20, Math.round(W * 0.032)));
    var ara = Math.max(6, Math.round(Math.min(W, H) * 0.018));

    var doneH = Math.max(this.MIN_HEDEF + 4, Math.min(66, Math.round(H * 0.085)));
    var doneW = Math.max(150, Math.min(300, Math.round(W * (yatay ? 0.30 : 0.50))));
    var doneY = H - pay - doneH;
    var doneX = Math.round((W - doneW) / 2);

    var altinH = Math.max(86, Math.round(H * (yatay ? 0.32 : 0.22)));
    var blokBos = Math.max(6, Math.round(Math.min(H * 0.025, 26)));
    var ustBos = Math.round(pay + (yatay ? 2 : H * 0.020));
    var kullan = Math.max(80, doneY - pay - ustBos);
    var izgaraMax = Math.max(60, kullan - altinH - blokBos);

    // Sütun sayısı: önce genişliğe sığan en fazla, sonra DENGELİ satıra çevir
    var enFazla = Math.max(1, Math.floor((W - 2 * pay + ara) / (this.MIN_KART + ara)));
    var sut = Math.max(1, Math.min(n || 1, enFazla));
    var satir = Math.max(1, Math.ceil((n || 1) / sut));
    sut = Math.max(1, Math.ceil((n || 1) / satir));

    // 🔴 PNG'de yakalandı (12 ödül · yatay): kart oranı 1,52'ye SABİT bağlıydı;
    //   yükseklik sınırlayınca genişlik de eziliyor, 6 sütun ekranın yalnız
    //   %36'sını kaplıyor, adlar "HEAVYW…" diye kesiliyordu.
    //   ▶ Oran artık 1,18-1,52 arasında ESNER: yükseklik sınırlıysa kart
    //     GENİŞ kalır, yatay boşluk kullanılır, ad kesilmesi düşer.
    var satirAra = ara + (satir > 1 ? Math.round(izgaraMax * 0.035) : 0);   // şerit payı
    // 🔴 PNG'de yakalandı (TEK ödül · dikey): kart 366x518 px oluyordu; yazı
    //   boyutları kelepçeli olduğu için dev kartın içinde minicik "ECHO" yazıyordu.
    //   ▶ Kart genişliği üst sınırla kelepçelenir (dikey %46 W, yatay %26 W).
    var kwMax = Math.min((W - 2 * pay - (sut - 1) * ara) / sut, W * (yatay ? 0.26 : 0.46));
    var izinH = (izgaraMax - (satir - 1) * satirAra) / satir;
    var kw = kwMax;
    var kh = kw * 1.52;
    if (kh > izinH) {
      kh = izinH;
      kw = Math.min(kwMax, kh / 1.18);
      if (kw * 1.52 < kh) kh = kw * 1.52;
    }
    kw = Math.max(30, kw); kh = Math.max(46, kh);

    var izgaraH = satir * kh + (satir - 1) * satirAra;
    var bos = Math.max(0, kullan - (izgaraH + blokBos + altinH));
    var izgaraY = ustBos + bos * 0.35;
    var altinY = izgaraY + izgaraH + blokBos + bos * 0.45;

    // Sandık (aşama 0-1) tüm içerik bloğunun ORTASINA oturur
    var sndCy = (ustBos + altinY + altinH) / 2;
    var sndS = Math.min(W * 0.42, (altinY + altinH - ustBos) * 0.42);

    return {
      yatay: yatay, pay: pay, ara: ara, satirAra: satirAra,
      sut: sut, satir: satir, kw: kw, kh: kh,
      izgaraY: izgaraY, izgaraH: izgaraH,
      alanY: ustBos, alanH: kullan,
      altinY: altinY, altinH: altinH, altinX: W / 2,
      sndCy: sndCy, sndS: sndS,
      done: { x: doneX, y: doneY, w: doneW, h: doneH },
      W: W, H: H,
      olcek: Math.min(W, H) / 400
    };
  },

  // i. kartın dikdörtgeni (satır ORTALANIR — son satır az kartlıysa da düzgün)
  _kartKutu(D, i) {
    var satirIdx = Math.floor(i / D.sut);
    var n = this._kartlar ? this._kartlar.length : 0;
    var bu = Math.min(D.sut, n - satirIdx * D.sut);
    var sutIdx = i - satirIdx * D.sut;
    var satirW = bu * D.kw + (bu - 1) * D.ara;
    var x = (D.W - satirW) / 2 + sutIdx * (D.kw + D.ara);
    var y = D.izgaraY + satirIdx * (D.kh + D.satirAra);
    return { x: x, y: y, w: D.kw, h: D.kh, cx: x + D.kw / 2, cy: y + D.kh / 2 };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM
  // ═════════════════════════════════════════════════════════════════════════

  ciz(ctx, W, H, dt) {
    if (!ctx || !this._acik) return;
    W = Math.max(1, Math.round(Number(W) || 1));
    H = Math.max(1, Math.round(Number(H) || 1));

    var d = Number(dt);
    if (!isFinite(d) || d <= 0 || d > 0.5) d = 0.016;
    this._t += d;
    if (this._t > 100000) this._t -= 100000;

    this._grHazirla(ctx, W, H);
    this._olcum = { minOran: 1, minTxt: '', tasma: 0, kesik: 0, kesikTxt: '', maxsiz: 0,
                    yaziSayisi: 0, grYeni: 0, hata: 0, hataMsj: '', havuzBuyume: 0, parcacik: 0 };
    this._btn = [];

    var D = this._duzen(W, H);
    this._sonDuzen = D;
    var e = this._gecen();
    var Z = this._zaman();

    ctx.save();
    try {
      // Ekran titremesi (yalnız efsanevi/mitik kart çakmasında)
      var tit = this._titreme(e, Z);
      if (tit.x !== 0 || tit.y !== 0) ctx.translate(tit.x, tit.y);

      this._cizArka(ctx, D, e, Z);
      this._cizSandik(ctx, D, e, Z);
      this._cizParcacik(ctx, D, e);
      this._cizKartlar(ctx, D, e, Z);
      this._cizAltin(ctx, D, e, Z);
      this._cizDone(ctx, D, e, Z);
    } catch (ex) {
      this._olcum.hata++;
      this._olcum.hataMsj = (ex && ex.message) ? ex.message : String(ex);
    }
    ctx.restore();

    // 🔴 TAM EKRAN "ATLA" hedefi EN SONA eklenir — hit-test ilk eşleşeni
    //   döndürdüğü için başa eklenirse DONE ve kartlar ASLA tıklanamaz.
    this._buton('sandik_atla', 0, 0, W, H, { asama: this.asama() });
  },

  _titreme(e, Z) {
    var i, K, t, s, amp, sonX = 0, sonY = 0;
    if (!this._kartlar) return { x: 0, y: 0 };
    for (i = 0; i < this._kartlar.length; i++) {
      K = this._kartlar[i];
      if (K.nIdx < this.VURGU_ESIK) continue;
      t = e - (Z.kartT(i) + this.T_KART * 0.55);
      if (t < 0 || t > 260) continue;
      s = Math.exp(-t / 85);
      amp = (K.nIdx >= 5 ? 5.2 : 3.4) * s;
      sonX += Math.sin(t * 0.42) * amp;
      sonY += Math.cos(t * 0.37) * amp * 0.6;
    }
    return { x: sonX, y: sonY };
  },

  // ── Arka plan: mistik kasa (referans mor kasa içi) ───────────────────────
  _cizArka(c, D, e, Z) {
    var W = D.W, H = D.H, i, x, y, r;
    c.fillStyle = this._gr(c, 'kasa', 0, 0, 0, H,
      [[0, this.C.kasaUst], [0.55, '#1d1245'], [1, this.C.kasaAlt]]);
    c.fillRect(0, 0, W, H);

    // kasa kapısı halkası (arka planın odak noktası — sandığın arkasına oturur)
    var cx = W / 2, cy = D.sndCy;
    var R = Math.min(W, H) * 0.42;
    c.save();
    c.globalAlpha = 0.22;
    c.strokeStyle = this.C.kasaTon;
    c.lineWidth = Math.max(3, R * 0.07);
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 0.72, 0, Math.PI * 2); c.stroke();
    c.lineWidth = Math.max(2, R * 0.045);
    for (i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + 0.19;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
      c.lineTo(cx + Math.cos(a) * R * 1.02, cy + Math.sin(a) * R * 1.02);
      c.stroke();
    }
    c.restore();

    // sis / parıltı — `_t` (dt toplamı) yalnız burada, sınırlı
    c.save();
    c.globalAlpha = 0.20;
    c.fillStyle = this._grR(c, 'sis', cx, cy, 0, R * 1.6,
      [[0, this.C.duman], [1, this.C.kasaAlt]]);
    c.fillRect(0, 0, W, H);
    c.restore();

    // zeminde taşlar (tohumlu, sabit)
    c.save();
    for (i = 0; i < 9; i++) {
      x = (0.06 + this._rnd(900 + i) * 0.88) * W;
      y = D.altinY + D.altinH * (0.55 + this._rnd(950 + i) * 0.55);
      r = Math.min(W, H) * (0.006 + this._rnd(980 + i) * 0.010);
      c.globalAlpha = 0.55;
      c.fillStyle = i % 3 === 0 ? '#c46ae8' : (i % 3 === 1 ? '#4fd0ff' : '#7a5ae8');
      this._pol(c, [x, y - r, x + r, y, x, y + r * 0.9, x - r, y], true);
      c.fill();
    }
    c.restore();

    // açılma anında EKRAN FLAŞI
    var fl = e - Z.acilS;
    if (fl >= 0 && fl < 260) {
      c.save();
      c.globalAlpha = 0.55 * Math.exp(-fl / 90);
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, W, H);
      c.restore();
    }
  },

  // ── Sandık: sallanma → kapak açılma + ışık huzmesi ───────────────────────
  _cizSandik(c, D, e, Z) {
    // Kartlar belirmeye başlayınca sandık küçülüp sönümlenir.
    // 🔴 PNG'de yakalandı: 420 ms'lik sönümleme çok yavaştı, 2. kart çizilirken
    //   kahverengi bir "hayalet sandık" hâlâ görünüyordu. 200 ms'ye çekildi.
    var sonrasi = e - Z.kart0;
    var alfa = 1;
    if (sonrasi > 0) alfa = Math.max(0, 1 - sonrasi / 200);
    if (alfa <= 0.002) return;

    var W = D.W, H = D.H;
    var s = D.sndS;
    var cx = W / 2;
    var cy = D.sndCy;
    var renk = this.SANDIK_RENK[this._kaynak] || this.SANDIK_RENK.bronze;

    var p = this._kelepce(e / Z.acilS, 0, 1);
    var sarsX = 0, sarsA = 0;
    if (e < Z.acilS) {
      sarsA = Math.sin(e * 0.055) * 0.055 * (0.35 + p);
      sarsX = Math.sin(e * 0.075) * s * 0.035 * (0.35 + p);
    }
    var acPay = this._kelepce((e - Z.acilS) / this.T_ACIL, 0, 1);
    var acAci = -1.05 * this._easeOut(acPay);
    var buyu = 1 + 0.10 * this._easeOut(acPay) - 0.62 * (1 - alfa);

    // ışık huzmesi (kapak açılırken)
    if (acPay > 0.02) {
      c.save();
      c.globalAlpha = alfa * 0.55 * acPay;
      c.fillStyle = this._gr(c, 'huzme', 0, Math.round(cy - s * 1.9), 0, Math.round(cy),
        [[0, '#fff6c9'], [1, this.C.kasaUst]]);
      this._pol(c, [cx - s * 0.36, cy - s * 0.10,
                    cx + s * 0.36, cy - s * 0.10,
                    cx + s * 1.05, cy - s * 1.85,
                    cx - s * 1.05, cy - s * 1.85], true);
      c.fill();
      c.restore();
    }

    c.save();
    c.globalAlpha = alfa;
    c.translate(cx + sarsX, cy);
    c.rotate(sarsA);
    c.scale(buyu, buyu);

    // gölge
    c.globalAlpha = alfa * 0.45;
    c.fillStyle = this.C.golge;
    this._elips(c, 0, s * 0.52, s * 0.52, s * 0.12);
    c.globalAlpha = alfa;

    // gövde
    var gw = s * 0.86, gh = s * 0.52;
    c.fillStyle = this._gr(c, 'sndG' + renk[0], 0, 0, 0, Math.round(gh),
      [[0, renk[0]], [1, renk[1]]]);
    this._rr(c, -gw / 2, 0, gw, gh, s * 0.06); c.fill();
    c.strokeStyle = this.C.golge; c.lineWidth = Math.max(1.5, s * 0.018);
    this._rr(c, -gw / 2, 0, gw, gh, s * 0.06); c.stroke();

    // metal bantlar
    c.fillStyle = '#8b6a2b';
    c.fillRect(-gw / 2, gh * 0.42, gw, gh * 0.14);
    c.fillRect(-gw * 0.09, 0, gw * 0.18, gh);
    // kilit
    c.fillStyle = this.C.altin;
    this._rr(c, -gw * 0.075, gh * 0.30, gw * 0.15, gh * 0.30, s * 0.02); c.fill();
    c.fillStyle = this.C.golge;
    this._daire(c, 0, gh * 0.44, s * 0.022);

    // kapak (menteşe gövde üstünde)
    c.save();
    c.translate(-gw / 2, 0);
    c.rotate(acAci);
    c.fillStyle = this._gr(c, 'sndK' + renk[0], 0, Math.round(-s * 0.34), 0, 0,
      [[0, renk[0]], [1, renk[1]]]);
    this._rr(c, 0, -s * 0.34, gw, s * 0.34, s * 0.06); c.fill();
    c.strokeStyle = this.C.golge; c.lineWidth = Math.max(1.5, s * 0.018);
    this._rr(c, 0, -s * 0.34, gw, s * 0.34, s * 0.06); c.stroke();
    c.fillStyle = '#8b6a2b';
    c.fillRect(gw * 0.41, -s * 0.34, gw * 0.18, s * 0.34);
    c.restore();

    // içeriden taşan ışık
    if (acPay > 0.05) {
      c.globalAlpha = alfa * acPay * 0.9;
      c.fillStyle = this._grR(c, 'ic', 0, 0, 0, Math.round(s * 0.5),
        [[0, '#fff8d6'], [1, renk[1]]]);
      this._elips(c, 0, s * 0.02, gw * 0.44, s * 0.10);
    }
    c.restore();
  },

  // ── Parçacıklar: SABİT havuz, ANALİTİK konum, 0 tahsis ───────────────────
  _cizParcacik(c, D, e) {
    if (!this._hav || this._havN <= 0) return;
    var i, p, t, cx, cy, x, y, al, r, O = this._olcum;
    var S = Math.min(D.W, D.H);
    c.save();
    for (i = 0; i < this._havN; i++) {
      p = this._hav[i];
      if (!p.a) continue;
      t = e - p.t0;
      if (t < 0 || t > p.om) continue;
      if (p.cipa === 'sandik') {
        cx = D.W / 2; cy = D.sndCy;
      } else {
        var ki = Number(p.cipa.substring(4)) || 0;
        if (!this._kartlar || ki >= this._kartlar.length) continue;
        var K = this._kartKutu(D, ki);
        cx = K.cx; cy = K.y + K.h * 0.34;
      }
      x = cx + (p.ax + p.vx * t) * S;
      y = cy + (p.ay + p.vy * t + 0.5 * p.g * t * t) * S;
      al = 1 - t / p.om;
      r = p.r * S * (0.6 + al * 0.7);
      c.globalAlpha = al * 0.95;
      c.fillStyle = p.renk;
      if (p.kare) {
        c.save();
        c.translate(x, y);
        c.rotate(t * 0.012 + i);
        c.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
        c.restore();
      } else {
        this._daire(c, x, y, r);
      }
      if (O) O.parcacik++;
    }
    c.globalAlpha = 1;
    c.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KARTLAR (referans 145038)
  // ═════════════════════════════════════════════════════════════════════════

  _cizKartlar(c, D, e, Z) {
    if (!this._kartlar) return;
    var i, K, R, t, p, sc, al;
    for (i = 0; i < this._kartlar.length; i++) {
      K = this._kartlar[i];
      R = this._kartKutu(D, i);
      t = e - Z.kartT(i);
      if (t < 0) continue;
      p = this._kelepce(t / this.T_KART, 0, 1);
      sc = 0.42 + 0.58 * this._easeBack(p);
      al = this._kelepce(p * 2.4, 0, 1);

      c.save();
      c.globalAlpha = al;
      c.translate(R.cx, R.cy);
      c.scale(sc, sc);
      c.translate(-R.cx, -R.cy);
      // 🔴 Gradyan koordinatları R'nin SABİT değerleri → önbellek ıskalamaz
      this._cizKart(c, D, R, K, i, t);
      c.restore();
      c.globalAlpha = 1;

      // Hitbox: dönüşümsüz (son) konum — ölçek yalnız görseldir
      this._buton('sandik_kart', R.x, R.y, R.w, R.h, {
        idx: i, id: K.id, tip: K.tip, ad: K.ad,
        nadirlik: K.nadirlik, adet: K.adet
      });
    }

    // gizlenen kart sayısı
    if (this._gizli > 0) {
      var gy = D.izgaraY + D.izgaraH + 4;
      this._f(c, D.W, D.H, 0.032, 0.018, 10, 18, 'bold');
      c.fillStyle = this.C.alt;
      this._yaz(c, '+' + this._gizli, D.W / 2, gy + 12, D.W * 0.4, 'center', 'bold');
    }
  },

  _cizKart(c, D, R, K, idx, t) {
    var x = R.x, y = R.y, w = R.w, h = R.h;
    var renk = K.renk || this._nadirRenk(K.nadirlik);
    var koyu = K.renk ? this._koyult(K.renk) : this._nadirKoyu(K.nadirlik);

    // gövde
    c.fillStyle = this._gr(c, 'kg', Math.round(x), Math.round(y), Math.round(x), Math.round(y + h),
      [[0, '#20264a'], [1, '#12142c']]);
    this._rr(c, x, y, w, h, w * 0.10); c.fill();

    // fayans (nadirlik renginde)
    var ts = Math.min(w * 0.84, h * 0.50);
    var tx = x + (w - ts) / 2, ty = y + h * 0.075;
    c.fillStyle = this._gr(c, 'fy' + K.nadirlik, Math.round(tx), Math.round(ty),
      Math.round(tx), Math.round(ty + ts), [[0, renk], [1, koyu]]);
    this._rr(c, tx, ty, ts, ts, ts * 0.20); c.fill();
    c.strokeStyle = this.C.golge; c.lineWidth = Math.max(1.5, ts * 0.035);
    this._rr(c, tx, ty, ts, ts, ts * 0.20); c.stroke();

    // parlama (fayansın üst yarısı)
    c.save();
    this._rr(c, tx, ty, ts, ts, ts * 0.20); c.clip();
    c.globalAlpha = 0.22;
    c.fillStyle = '#ffffff';
    c.fillRect(tx, ty, ts, ts * 0.42);
    c.restore();

    // ikon
    this._ikonCiz(c, K, tx + ts * 0.14, ty + ts * 0.14, ts * 0.72, '#f6f9ff');

    // adet rozeti "xN" (beyaz + koyu kontur — referans)
    // 🔴 PNG'de yakalandı: para birimi kartında hem "x163" hem "+163" yazıyordu.
    //   Rozet YALNIZ parça/araç/kart ödüllerinde; para birimi miktarı kapsülde.
    var rozetVar = (K.tip === 'parca' || K.tip === 'arac' || K.tip === 'kart');
    if (K.adet > 0 && rozetVar) {
      this._f(c, D.W, D.H, 0.055, 0.030, 11, 30, 'bold');
      if (this._px > ts * 0.30) this._font(c, Math.round(ts * 0.30), 'bold');
      c.fillStyle = this.C.beyaz;
      this._yaz(c, 'x' + K.adet, tx + ts * 0.94, ty + ts * 0.93, ts * 0.62, 'right', 'bold',
        this.C.golge, Math.max(2, ts * 0.055));
    }

    // ilerleme kapsülü
    var kh = h * 0.115, ky = ty + ts + h * 0.035, kw = w * 0.88, kx = x + (w - kw) / 2;
    this._kapsul(c, kx, ky, kw, kh, this.C.kapsul, this.C.golge, Math.max(1.2, kh * 0.10));
    if (K.gerekli && K.gerekli > 0) {
      var oran = this._kelepce((K.sahip || 0) / K.gerekli, 0, 1);
      // 🔴 PNG'de yakalandı: "1/180" oranı 0,006 → 0,6 px'lik mavi ÇİZGİ çıkıyor,
      //   bozuk piksel gibi duruyordu. Görünür genişliğin altındaysa çizilmez.
      if (kw * oran >= kh * 0.6) {
        c.save();
        this._rr(c, kx, ky, kw, kh, kh / 2); c.clip();
        c.fillStyle = this._gr(c, 'ilr', Math.round(kx), Math.round(ky), Math.round(kx + kw), Math.round(ky),
          [[0, '#1b7fa8'], [1, this.C.ilerle]]);
        c.fillRect(kx, ky, kw * oran, kh);
        c.restore();
      }
    }
    var kesir = this._kesir(K);
    this._f(c, D.W, D.H, 0.034, 0.019, 9, 20, 'bold');
    if (this._px > kh * 0.72) this._font(c, Math.max(8, Math.round(kh * 0.72)), 'bold');
    c.fillStyle = K.yeni ? this.C.altin : this.C.beyaz;
    // 🔴 PNG'de yakalandı: "10/17" yazısı ilerleme çubuğunun ÜSTÜNE denk gelince
    //   beyaz-üstü-açık mavi oluyor ve okunmuyordu → koyu kontur eklendi.
    this._yaz(c, kesir, kx + kw / 2, ky + kh * 0.74, kw * 0.86, 'center', 'bold',
      this.C.golge, Math.max(1.8, this._px * 0.20));

    // ad kapsülü (BEYAZ — referans)
    var ah = h * 0.145, ay = y + h - ah - h * 0.025;
    this._kapsul(c, x, ay, w, ah, this.C.beyaz, this.C.golge, Math.max(1.2, ah * 0.10));
    this._f(c, D.W, D.H, 0.030, 0.017, 8, 18, 'bold');
    if (this._px > ah * 0.60) this._font(c, Math.max(8, Math.round(ah * 0.60)), 'bold');
    c.fillStyle = '#151a28';
    this._yaz(c, this._ad(K.ad), x + w / 2, ay + ah * 0.70, w * 0.88, 'center', 'bold');

    // nadirlik şeridi — YALNIZ rare ve üstü (referans: TRACKS şeritsiz)
    if (K.nIdx >= this.SERIT_ESIK) this._cizSerit(c, D, R, K, t);
  },

  // Kesir metni: NEW! · 10/17 · 259 · +3
  _kesir(K) {
    if (K.yeni) return 'NEW!';
    if (K.gerekli && K.gerekli > 0) return (K.sahip || 0) + '/' + K.gerekli;
    if (K.sahip != null) return this._kisaSayi(K.sahip);
    return '+' + this._kisaSayi(K.adet);
  },

  // Eğik nadirlik şeridi — belirdikten sonra ÇAKAR (büyükten normale)
  _cizSerit(c, D, R, K, t) {
    var pay = this._kelepce((t - this.T_KART * 0.55) / (this.T_KART * 0.45), 0, 1);
    if (pay <= 0) return;
    var sc = 2.4 - 1.4 * this._easeOut(pay);
    var al = this._kelepce(pay * 3, 0, 1);
    var renk = this._nadirRenk(K.nadirlik);
    var etiket = this._nadirEtiket(K.nadirlik);
    var sx = R.x + R.w * 0.62, sy = R.y + R.h * 0.055;

    c.save();
    c.globalAlpha = al;
    c.translate(sx, sy);
    c.scale(sc, sc);
    c.rotate(-0.30);
    this._f(c, D.W, D.H, 0.036, 0.020, 8, 20, 'bold');
    if (this._px > R.w * 0.17) this._font(c, Math.max(8, Math.round(R.w * 0.17)), 'bold');
    c.fillStyle = renk;
    // 🔴 maxWidth ölçekli çizimde de verilir; sıkışma _yaz içinde ölçülür
    this._yaz(c, etiket, 0, 0, R.w * 0.80, 'center', 'bold', this.C.golge,
      Math.max(2, this._px * 0.32));
    c.restore();
    c.globalAlpha = 1;
  },

  // ── İkon: EkranGaraj._ikon (21 parça ikonu) varsa ORADAN ────────────────
  _ikonCiz(c, K, x, y, s, renk) {
    var EG = this._g('EkranGaraj');
    var tip = K.ikon;
    if (!tip) {
      if (K.tip === 'altin') tip = 'sikke';
      else if (K.tip === 'elmas') tip = 'elmas';
      else if (K.tip === 'hurda') tip = 'anahtar';
      else if (K.tip === 'arac') tip = '';
      else if (EG && typeof EG._parcaIkon === 'function') {
        try { tip = EG._parcaIkon(K.id); } catch (e) { tip = ''; }
      }
    }
    if (tip && EG && typeof EG._ikon === 'function') {
      try { EG._ikon(c, tip, x, y, s, renk); return 'EG:' + tip; } catch (e) { }
    }
    this._ikonYedek(c, K.tip, tip, x, y, s, renk);
    return 'yedek';
  },

  // EkranGaraj yoksa / araç ikonu için yedek çizim
  _ikonYedek(c, oduTip, tip, x, y, s, renk) {
    var cx = x + s / 2, cy = y + s / 2, u = s / 100;
    var a = renk || '#e8eef7';
    c.save();
    c.lineWidth = Math.max(1.4, 6 * u);
    c.lineJoin = 'round'; c.lineCap = 'round';
    if (oduTip === 'arac') {
      c.fillStyle = a;
      this._rr(c, cx - 34 * u, cy - 6 * u, 68 * u, 20 * u, 6 * u); c.fill();
      this._rr(c, cx - 20 * u, cy - 24 * u, 40 * u, 20 * u, 6 * u); c.fill();
      c.fillStyle = '#2a3350';
      this._daire(c, cx - 20 * u, cy + 18 * u, 11 * u);
      this._daire(c, cx + 20 * u, cy + 18 * u, 11 * u);
    } else if (oduTip === 'altin') {
      c.fillStyle = '#e29a10'; this._daire(c, cx, cy, 30 * u);
      c.fillStyle = '#ffcf3f'; this._daire(c, cx, cy, 23 * u);
    } else if (oduTip === 'elmas') {
      c.fillStyle = a;
      this._pol(c, [cx, cy - 28 * u, cx + 26 * u, cy - 4 * u, cx, cy + 30 * u, cx - 26 * u, cy - 4 * u], true);
      c.fill();
    } else if (oduTip === 'hurda') {
      c.fillStyle = a;
      this._rr(c, cx - 26 * u, cy - 10 * u, 52 * u, 20 * u, 5 * u); c.fill();
      this._rr(c, cx - 10 * u, cy - 26 * u, 20 * u, 52 * u, 5 * u); c.fill();
    } else {
      c.fillStyle = a;
      this._rr(c, cx - 24 * u, cy - 24 * u, 48 * u, 48 * u, 8 * u); c.fill();
      c.fillStyle = '#2a3350';
      this._rr(c, cx - 10 * u, cy - 24 * u, 20 * u, 48 * u, 4 * u); c.fill();
    }
    c.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ALTIN YIĞINI + SAYAÇ (referans: sikke istifi + sarı kapsül)
  // ═════════════════════════════════════════════════════════════════════════

  _cizAltin(c, D, e, Z) {
    if (this._altin <= 0) return;
    var t = e - Z.altinS;
    if (t < 0) return;
    var p = this._kelepce(t / this.T_ALTIN, 0, 1);
    var al = this._kelepce(p * 3, 0, 1);
    var dus = (1 - this._easeOut(p)) * D.altinH * 0.55;

    var cx = D.W / 2;
    var taban = D.altinY + D.altinH * 0.68;
    var sikR = Math.min(D.W * 0.055, D.altinH * 0.16);

    c.save();
    c.globalAlpha = al;
    c.translate(0, -dus);

    // gölge
    c.globalAlpha = al * 0.4;
    c.fillStyle = this.C.golge;
    this._elips(c, cx, taban + sikR * 0.5, sikR * 3.0, sikR * 0.6);
    c.globalAlpha = al;

    // 3 istif — sikkeler alttan üste
    this._istif(c, cx - sikR * 1.55, taban, sikR, 5);
    this._istif(c, cx + sikR * 1.45, taban - sikR * 0.25, sikR, 4);
    this._istif(c, cx - sikR * 0.15, taban - sikR * 1.35, sikR, 6);
    c.restore();

    // kapsül + sayaç
    // 🔴 PNG'de yakalandı: kapsül SABİT genişlikteydi (260 px); "180.000" bile
    //   ortada kalıp sağda kocaman boşluk bırakıyordu. Artık genişlik METNİN
    //   ÖLÇÜLEN genişliğinden türetilir (referanstaki gibi metne oturur).
    var kh = Math.max(30, Math.min(D.altinH * 0.30, 46));
    var deger = Math.floor(this._altin * this._easeOut(p));
    var metin = this._sayi(deger);
    var tamMetin = this._sayi(this._altin);
    this._f(c, D.W, D.H, 0.062, 0.034, 12, 30, 'bold');
    if (this._px > kh * 0.62) this._font(c, Math.max(10, Math.round(kh * 0.62)), 'bold');
    var kw = Math.max(120, Math.min(D.W - 2 * D.pay,
      Math.round(this._mw(c, tamMetin) + kh * 2.35)));
    var kx = cx - kw / 2, ky = D.altinY + D.altinH - kh - 2;
    c.save();
    c.globalAlpha = al;
    c.fillStyle = this._gr(c, 'altKap', Math.round(kx), Math.round(ky), Math.round(kx), Math.round(ky + kh),
      [[0, '#ffe066'], [1, this.C.altin2]]);
    this._rr(c, kx, ky, kw, kh, kh / 2); c.fill();
    c.strokeStyle = this.C.altinKen; c.lineWidth = Math.max(2, kh * 0.10);
    this._rr(c, kx, ky, kw, kh, kh / 2); c.stroke();

    var sikX = kx + kw - kh * 0.62;
    c.fillStyle = this.C.beyaz;
    this._yaz(c, metin, (kx + kh * 0.30 + sikX - kh * 0.38) / 2, ky + kh * 0.70,
      kw - kh * 1.45, 'center', 'bold', this.C.altinKen, Math.max(2, this._px * 0.22));
    // sikke ikonu (kapsülün sağ ucunda — referans)
    c.fillStyle = this.C.altinKen; this._daire(c, sikX, ky + kh / 2, kh * 0.34);
    c.fillStyle = this.C.altin2; this._daire(c, sikX, ky + kh / 2, kh * 0.30);
    c.fillStyle = '#ffe066'; this._daire(c, sikX, ky + kh / 2, kh * 0.21);
    c.restore();
    c.globalAlpha = 1;
  },

  _istif(c, x, y, r, adet) {
    var i, yy;
    for (i = 0; i < adet; i++) {
      yy = y - i * r * 0.52;
      c.fillStyle = this.C.altinKen;
      this._elips(c, x, yy + r * 0.16, r, r * 0.40);
      c.fillStyle = this.C.altin2;
      this._elips(c, x, yy, r, r * 0.40);
      c.fillStyle = this.C.altin;
      this._elips(c, x, yy - r * 0.06, r * 0.78, r * 0.30);
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DONE
  // ═════════════════════════════════════════════════════════════════════════

  _cizDone(c, D, e, Z) {
    var t = e - Z.toplam;
    if (t < 0) return;
    var p = this._kelepce(t / this.T_DONE, 0, 1);
    var sc = 0.72 + 0.28 * this._easeBack(p);
    var B = D.done;
    var cx = B.x + B.w / 2, cy = B.y + B.h / 2;

    c.save();
    c.globalAlpha = this._kelepce(p * 2.5, 0, 1);
    c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    c.fillStyle = this.C.golge;
    this._rr(c, B.x, B.y + 4, B.w, B.h, B.h * 0.22); c.fill();
    c.fillStyle = this._gr(c, 'done', Math.round(B.x), Math.round(B.y), Math.round(B.x), Math.round(B.y + B.h),
      [[0, '#6fdd6f'], [1, this.C.yesil2]]);
    this._rr(c, B.x, B.y, B.w, B.h, B.h * 0.22); c.fill();
    c.strokeStyle = '#1e5c1e'; c.lineWidth = Math.max(2, B.h * 0.06);
    this._rr(c, B.x, B.y, B.w, B.h, B.h * 0.22); c.stroke();
    this._f(c, D.W, D.H, 0.070, 0.038, 14, 32, 'bold');
    if (this._px > B.h * 0.50) this._font(c, Math.max(12, Math.round(B.h * 0.50)), 'bold');
    c.fillStyle = this.C.beyaz;
    this._yaz(c, 'DONE', cx, B.y + B.h * 0.66, B.w * 0.80, 'center', 'bold');
    c.restore();
    c.globalAlpha = 1;

    this._buton('sandik_kapat', B.x, B.y, B.w, B.h, { kaynak: this._kaynak });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GİRDİ
  // ═════════════════════════════════════════════════════════════════════════

  butonlar() { return this._btn.slice(); },

  tikla(x, y) {
    if (!this._acik) return null;
    x = Number(x); y = Number(y);
    if (!isFinite(x) || !isFinite(y)) return null;
    // 🔴 Animasyon oynarken EKRANIN HER YERİ "atla"dır — belirmiş bir kartın
    //   üstüne denk gelen dokunuş da atlamalı (kart detayı açmamalı).
    if (this.oynuyor()) {
      this.atla();
      return { eylem: 'sandik_atla', veri: { asama: this.asama() } };
    }
    var L = this._btn, i, b;
    for (i = 0; i < L.length; i++) {
      b = L[i];
      if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) continue;
      if (b.id === 'sandik_kapat') {
        var veri = { kaynak: this._kaynak, altin: this._altin, oduller: this._tumOdul };
        this.kapat();
        return { eylem: 'sandik_kapat', veri: veri };
      }
      // Animasyon bittiyse boşluğa dokunmak bir şey YAPMAZ (kazara kapanmasın)
      if (b.id === 'sandik_atla') return null;
      return { eylem: b.id, veri: b.veri || {} };
    }
    return null;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // Economy.openChest() → `baslat()` DÖNÜŞTÜRÜCÜ
  //   `openChest` YALNIZ {gold, scrap, diamonds} döner (parça VERMEZ).
  //   `{error:'gold'|'diamond'}` veya null gelirse BOŞ dizi döner (animasyon
  //   açılmamalı — çağıran `if (!liste.length) return;` kontrolü yapmalı).
  //   ⚠ Parça ödülü ekleyen bir kaynak (KlanKutu / kampanya) varsa `ek` dizisi
  //     ile geçirilir ve aynı listeye eklenir.
  // ═════════════════════════════════════════════════════════════════════════
  donustur(sonuc, kaynak, ek) {
    var L = [], i;
    if (sonuc && !sonuc.error) {
      if (sonuc.gold > 0) {
        L.push({ tip: 'altin', id: 'gold', ad: 'Gold', nadirlik: 'common', adet: Math.floor(sonuc.gold) });
      }
      // ⚠ Para birimlerine nadirlik VERİLMEZ ('common' → şerit çıkmaz).
      //   Fayans rengi `renk` alanıyla ayrılır (PNG'de "EPIC! DIAMONDS" yanlış
      //   izlenim veriyordu — elmas bir "destansı ödül" değil, para birimidir).
      if (sonuc.scrap > 0) {
        L.push({ tip: 'hurda', id: 'scrap', ad: 'Scrap', nadirlik: 'common',
                 adet: Math.floor(sonuc.scrap), ikon: 'anahtar', renk: '#b6c2d2' });
      }
      if (sonuc.diamonds > 0) {
        L.push({ tip: 'elmas', id: 'diamonds', ad: 'Diamonds', nadirlik: 'common',
                 adet: Math.floor(sonuc.diamonds), ikon: 'elmas', renk: '#4fd0ff' });
      }
    }
    if (ek && ek.length) for (i = 0; i < ek.length; i++) L.push(ek[i]);
    return L;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — ÖLÇEREK
  // ═════════════════════════════════════════════════════════════════════════

  _kaynakMetin() {
    var HARIC = { selfTest: 1, _kaynakMetin: 1, _sahteCtx: 1 };
    var s = '', k;
    for (k in this) {
      if (HARIC[k]) continue;
      if (typeof this[k] === 'function') { try { s += String(this[k]) + '\n'; } catch (e) { } }
    }
    return s;
  },

  _sahteCtx(W, H) {
    var M = this;
    var st = { save: 0, restore: 0, grad: 0, fill: 0, cagri: 0, clip: 0, fillTextMaxsiz: 0 };
    var o = {
      _st: st,
      canvas: { width: W, height: H },
      globalAlpha: 1, globalCompositeOperation: 'source-over',
      fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
      font: 'bold 10px Arial', textAlign: 'left', textBaseline: 'alphabetic',
      shadowBlur: 0, shadowColor: '#000', filter: 'none', lineCap: 'butt', lineJoin: 'miter'
    };
    var bos = ['beginPath', 'closePath', 'stroke', 'translate', 'rotate', 'scale',
      'transform', 'setTransform', 'resetTransform', 'moveTo', 'lineTo', 'arc',
      'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'rect', 'roundRect', 'arcTo',
      'fillRect', 'strokeRect', 'clearRect', 'strokeText', 'setLineDash', 'drawImage'];
    var i;
    for (i = 0; i < bos.length; i++) {
      (function (ad) { o[ad] = function () { st.cagri++; }; })(bos[i]);
    }
    o.save = function () { st.save++; st.cagri++; };
    o.restore = function () { st.restore++; st.cagri++; };
    o.fill = function () { st.fill++; st.cagri++; };
    o.clip = function () { st.clip++; st.cagri++; };
    o.getLineDash = function () { return []; };
    var gr = function () { st.grad++; return { addColorStop: function () { } }; };
    o.createLinearGradient = gr;
    o.createRadialGradient = gr;
    o.createConicGradient = gr;
    o.createPattern = function () { return null; };
    o.measureText = function (t) {
      var px = 10, m = /(\d+)px/.exec(o.font);
      if (m) px = Number(m[1]) || 10;
      return { width: String(t).length * px * 0.56 };
    };
    o.fillText = function (t, x, y, mw) { st.cagri++; if (mw == null) st.fillTextMaxsiz++; };
    return o;
  },

  // Test ödülleri — GERÇEK parça adlarıyla (EkranGaraj.PARCA varsa oradan)
  _testOdul(n) {
    var EG = this._g('EkranGaraj');
    var taban = [
      { tip: 'parca', id: 'wheelie_boost', ad: 'Wheelie Boost', nadirlik: 'rare',
        adet: 2, sahip: 259, gerekli: 0 },
      { tip: 'parca', id: 'afterburner', ad: 'Afterburner', nadirlik: 'epic',
        adet: 3, sahip: 3, gerekli: 0 },
      { tip: 'parca', id: 'fuel_boost', ad: 'Fuel Boost', nadirlik: 'legendary',
        adet: 1, sahip: 10, gerekli: 17 },
      { tip: 'parca', id: 'echo', ad: 'Echo', nadirlik: 'mythic',
        adet: 2, yeni: true, seviye: 1 },
      { tip: 'parca', id: 'magnet', ad: 'Magnet', nadirlik: 'common',
        adet: 1, sahip: 1, gerekli: 180 },
      { tip: 'altin', id: 'gold', ad: 'Gold', nadirlik: 'common', adet: 33000 }
    ];
    if (EG && EG.PARCA && EG.PARCA.length) {
      var i, p;
      for (i = 0; i < taban.length; i++) {
        if (taban[i].tip !== 'parca') continue;
        for (var j = 0; j < EG.PARCA.length; j++) {
          p = EG.PARCA[j];
          if (p.id === taban[i].id) { taban[i].ad = p.ad; taban[i].nadirlik = p.nadir; break; }
        }
      }
    }
    var kart = [taban[0], taban[1], taban[2], taban[3], taban[4]];
    var L = [], i2;
    for (i2 = 0; i2 < Math.min(n, 5); i2++) L.push(kart[i2]);
    L.push(taban[5]);
    return L;
  },

  selfTest() {
    var R = [], i, j, k;
    function ek(ad, gecti, not) { R.push({ ad: ad, gecti: !!gecti, not: not || '' }); }

    // 🔴 KAYIT KORUMASI — U2 bu hataya düştü. Önce/sonra JSON kıyaslanır.
    var S = this._g('SaveData');
    var kayitOnce = null;
    try { kayitOnce = (S && S.data) ? JSON.stringify(S.data) : 'YOK'; } catch (e) { kayitOnce = 'HATA'; }

    // Durumu yedekle
    var yAcik = this._acik, yT0 = this._t0, yKaynak = this._kaynak, yOdul = this._tumOdul,
        yKart = this._kartlar, yAltin = this._altin, yGizli = this._gizli, yTohum = this._tohum,
        ySabit = this._sabitZaman, yT = this._t;

    var src = this._kaynakMetin();

    // ── 1) KAYNAK KURALLARI ──────────────────────────────────────────────
    var fontSay = (src.match(/\.font\s*=/g) || []).length;
    ek('font_atamasi_tek_yerde', fontSay === 1, fontSay + ' adet `.font =` (yalniz _font)');
    var ftSay = (src.match(/\.fillText\s*\(/g) || []).length;
    ek('fillText_tek_yerde', ftSay === 1, ftSay + ' adet `.fillText(` (yalniz _yaz)');
    ek('toUpperCase_yok', src.indexOf('toUpperCase') < 0, 'toUpperCase kullanilmiyor');
    ek('ctx_ellipse_yok', !/[a-z]\.ellipse\s*\(/.test(src), 'ellipse yerine save+scale+arc');
    ek('getImageData_yok', src.indexOf('getImageData') < 0, 'getImageData yok');
    ek('Math_random_yok', src.indexOf('Math.random') < 0, 'rastgelelik TOHUMLU (_rnd)');
    ek('rgba_yok', src.indexOf('rgba(') < 0 && src.indexOf('hsl(') < 0, 'tum renkler HEX');
    var grKacak = (src.match(/ctx\.create(Linear|Radial|Conic)Gradient/g) || []).length;
    ek('gradyan_kacagi_yok', grKacak === 0, 'gradyan yalniz _gr/_grR icinde');
    ek('window_X_erisimi_yok', !/window\.(SaveData|Economy|EkranGaraj|UI)\b/.test(src.replace(/window\[ad\]/g, '')),
       'bare global typeof ile okunuyor');
    var yazmaRe = /SaveData\s*\.\s*(set|save|add|spend|unlock|record|setPartLevel)|\.\s*data\s*\.[A-Za-z_$]+\s*=[^=]/;
    var yazmaBul = yazmaRe.exec(src);
    ek('modul_kayda_hic_yazmiyor', !yazmaBul, yazmaBul ? ('YAZMA: ' + yazmaBul[0]) : 'SaveData yazma deseni yok');

    // ── 2) NADİRLİK: 5 nadirlik doğru renk + etiket ──────────────────────
    var nBek = [
      ['common', '#b9c4d0', 'COMMON'],
      ['rare', '#ffb347', 'RARE!'],
      ['epic', '#b06bff', 'EPIC!'],
      ['legendary', '#8fe9ff', 'LEGENDARY!'],
      ['mythic', '#ffd24a', 'MYTHIC!']
    ];
    var nOK = true, nNot = '';
    for (i = 0; i < nBek.length; i++) {
      if (this._nadirRenk(nBek[i][0]) !== nBek[i][1] || this._nadirEtiket(nBek[i][0]) !== nBek[i][2]) {
        nOK = false; nNot += nBek[i][0] + '(' + this._nadirRenk(nBek[i][0]) + '/' + this._nadirEtiket(nBek[i][0]) + ') ';
      }
    }
    ek('bes_nadirlik_renk_etiket', nOK, nNot || '5 nadirlik: renk + etiket dogru');
    var hexOK = true, kk;
    for (kk in this.NADIR_RENK) if (String(this.NADIR_RENK[kk]).charAt(0) !== '#') hexOK = false;
    for (kk in this.NADIR_KOYU) if (String(this.NADIR_KOYU[kk]).charAt(0) !== '#') hexOK = false;
    for (kk in this.C) if (String(this.C[kk]).charAt(0) !== '#') hexOK = false;
    ek('paletler_HEX', hexOK, 'C + NADIR_RENK + NADIR_KOYU tamami HEX');
    ek('klan_nadirlik_eslemesi',
       this._nadirNorm('efsanevipl') === 'mythic' && this._nadirNorm('destansi') === 'epic' &&
       this._nadirNorm('siradan') === 'common' && this._nadirNorm('Rare') === 'rare' &&
       this._nadirNorm('zirva') === 'common',
       'KlanKutu id + buyuk/kucuk harf + bilinmeyen -> common');
    ek('serit_esigi_rare', this.SERIT_ESIK === 2 && this.NADIR_SIRA[2] === 'rare',
       'serit yalniz rare ve ustunde (referans: TRACKS seritsiz)');

    // ── 3) BÜYÜK HARF ─────────────────────────────────────────────────────
    ek('turkce_buyuk_harf', this._buyuk('istanbul ılık') === 'İSTANBUL ILIK', this._buyuk('istanbul ılık'));
    ek('ingilizce_buyuk_harf_ascii', this._buyukAscii('Wheelie Boost') === 'WHEELIE BOOST',
       this._buyukAscii('Wheelie Boost'));
    ek('ad_secimi_dogru', this._ad('Wheelie Boost') === 'WHEELIE BOOST' && this._ad('çıkış') === 'ÇIKIŞ',
       this._ad('Wheelie Boost') + ' / ' + this._ad('çıkış'));

    // ── 4) SIRALAMA: en iyi SONDA, kararlı ───────────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    var sirOK = true, sirNot = '';
    for (i = 1; i < this._kartlar.length; i++) {
      if (this._kartlar[i].nIdx < this._kartlar[i - 1].nIdx) sirOK = false;
    }
    for (i = 0; i < this._kartlar.length; i++) sirNot += this._kartlar[i].nadirlik + ' ';
    ek('nadirlik_artan_en_iyi_sonda',
       sirOK && this._kartlar[this._kartlar.length - 1].nadirlik === 'mythic', sirNot);
    ek('altin_kart_olarak_cizilmiyor', this._kartlar.length === 5 && this._altin === 33000,
       this._kartlar.length + ' kart + ' + this._altin + ' altin (ayri)');

    // ── 5) ZAMANLAMA: toplam ≤ 3 sn (1/3/5/12 ödülde) ────────────────────
    var sureNot = '', sureOK = true, adetler = [1, 3, 5, 12];
    for (i = 0; i < adetler.length; i++) {
      var LL = [], q;
      for (q = 0; q < adetler[i]; q++) {
        LL.push({ tip: 'parca', id: 'p' + q, ad: 'Part ' + q,
                  nadirlik: this.NADIR_SIRA[q % 6], adet: 1 + q });
      }
      LL.push({ tip: 'altin', id: 'gold', adet: 5000 });
      this.baslat(LL, 'silver');
      var ZZ = this._zaman();
      if (ZZ.toplam > this.MAKS_TOPLAM) sureOK = false;
      sureNot += adetler[i] + ' odul=' + ZZ.toplam + 'ms  ';
    }
    ek('toplam_sure_3sn_alti', sureOK, sureNot);

    // ── 6) ÇİZİM: 8 boyut × 5 aşama, istisna 0 ───────────────────────────
    var BOYUTLAR = [[360, 640], [360, 800], [390, 844], [414, 896],
                    [428, 926], [768, 1024], [844, 390], [926, 428]];
    var ADETLER = [1, 3, 5];
    var hataSay = 0, hataNot = '', kucukSay = 0, kucukNot = '', disSay = 0, disNot = '';
    var tasmaSay = 0, tasmaNot = '', enDusukOran = 1, maxsizSay = 0, grIkinci = 0, grNot = '';
    var kesikSay = 0, kesikNot = '';
    var parcacikGor = 0, kartGor = 0, doneGor = 0;
    var asamaGor = {}, cizim = 0;

    for (var bi = 0; bi < BOYUTLAR.length; bi++) {
      var W = BOYUTLAR[bi][0], H = BOYUTLAR[bi][1];
      for (var ai = 0; ai < ADETLER.length; ai++) {
        this._sabitZaman = 1000000;
        this.baslat(this._testOdul(ADETLER[ai]), 'mythic');
        var Z2 = this._zaman();
        var c = this._sahteCtx(W, H);
        this._grCtx = null;
        // ilerleme 0 / 0.25 / 0.5 / 0.75 / 1.0 + sonuç
        var oranlar = [0, 0.25, 0.5, 0.75, 1.0, 1.35];
        for (var oi = 0; oi < oranlar.length; oi++) {
          this._sabitZaman = 1000000 + Math.round(Z2.toplam * oranlar[oi]) + (oi === 5 ? this.T_DONE + 5 : 0);
          var grOnce = c._st.grad;
          this.ciz(c, W, H, 0.016);
          cizim++;
          asamaGor[this.asama()] = 1;
          var O = this._olcum;
          if (O.hata) { hataSay++; hataNot += W + 'x' + H + '/' + oranlar[oi] + ':' + O.hataMsj + ' '; }
          if (O.tasma) { tasmaSay += O.tasma; tasmaNot += W + 'x' + H + ':' + O.minTxt + ' '; }
          if (O.kesik) { kesikSay += O.kesik; kesikNot += W + 'x' + H + ':' + O.kesikTxt + ' '; }
          if (O.minOran < enDusukOran) enDusukOran = O.minOran;
          maxsizSay += O.maxsiz;
          if (O.parcacik > 0) parcacikGor++;
          // 2. kareden itibaren YENİ GRADYAN OLMAMALI
          this.ciz(c, W, H, 0.016);
          cizim++;
          if (this._olcum.grYeni > 0) { grIkinci += this._olcum.grYeni; grNot += W + 'x' + H + '/' + oranlar[oi] + ' '; }
          var B = this.butonlar();
          for (i = 0; i < B.length; i++) {
            if (B[i].id === 'sandik_kart') kartGor++;
            if (B[i].id === 'sandik_kapat') doneGor++;
            if (B[i].id === 'sandik_atla') continue;      // tam ekran hedef
            if (Math.min(B[i].w, B[i].h) < 44) { kucukSay++; kucukNot += B[i].id + ' ' + B[i].w + 'x' + B[i].h + ' '; }
            if (B[i].x < -0.5 || B[i].y < -0.5 || B[i].x + B[i].w > W + 0.5 || B[i].y + B[i].h > H + 0.5) {
              disSay++; disNot += B[i].id + '@' + W + 'x' + H + ' ';
            }
          }
        }
      }
    }
    ek('cizim_istisnasi_yok', hataSay === 0, hataSay ? hataNot : cizim + ' cizim, istisna 0');
    ek('her_asamada_cizim', asamaGor.sallanma && asamaGor.acilma && asamaGor.kartlar &&
       asamaGor.altin && asamaGor.sonuc,
       'gorulen asamalar: ' + Object.keys(asamaGor).join(','));
    ek('metin_tasmasi_yok', tasmaSay === 0, tasmaSay ? tasmaNot : 'tasma 0');
    // 🔴 Bu kontrol PNG'den DOĞDU: kesme "taşma" sayılmıyordu, doğrulayıcı
    //   "tasma 0" derken ekranda "HEAVYW…" yazıyordu. 1-5 ödülde kesme OLMAMALI.
    ek('ad_kesilmesi_yok_1_5_odul', kesikSay === 0, kesikSay ? (kesikSay + ' kesik: ' + kesikNot) : 'kesilen metin 0');
    ek('sikisma_085_uzeri', enDusukOran >= 0.85, 'en dusuk sikisma orani = ' + enDusukOran.toFixed(3));
    ek('fillText_maxWidth_hep_var', maxsizSay === 0, maxsizSay + ' maxWidth-siz cagri');
    ek('kare_basina_yeni_gradyan_0', grIkinci === 0, grIkinci ? grNot : '2. karede yeni gradyan 0');
    ek('44px_alti_hedef_yok', kucukSay === 0, kucukSay ? kucukNot : 'tum hedefler >=44 px');
    ek('ekran_disi_buton_yok', disSay === 0, disSay ? disNot : 'ekran disi buton yok');
    ek('kart_hitboxlari_var', kartGor > 0, kartGor + ' kart hitbox');
    ek('DONE_sonucta_var', doneGor > 0, doneGor + ' DONE hitbox');
    ek('parcacik_ciziliyor', parcacikGor > 0, parcacikGor + ' karede parcacik goruldu');

    // ── 7) 1 / 3 / 5 ödülle AYRI AYRI çalışıyor ──────────────────────────
    var adetOK = true, adetNot = '';
    for (i = 0; i < ADETLER.length; i++) {
      this._sabitZaman = 1000000;
      this.baslat(this._testOdul(ADETLER[i]), 'bronze');
      var c3 = this._sahteCtx(390, 844);
      this._grCtx = null;
      this._sabitZaman = 1000000 + this._zaman().toplam + this.T_DONE + 5;
      this.ciz(c3, 390, 844, 0.016);
      var kSay = 0, dVar = false, B3 = this.butonlar();
      for (j = 0; j < B3.length; j++) {
        if (B3[j].id === 'sandik_kart') kSay++;
        if (B3[j].id === 'sandik_kapat') dVar = true;
      }
      if (kSay !== ADETLER[i] || !dVar || this._olcum.hata) adetOK = false;
      adetNot += ADETLER[i] + '->' + kSay + 'kart' + (dVar ? '+DONE ' : ' ');
    }
    ek('1_3_5_odulle_calisiyor', adetOK, adetNot);

    // ── 8) atla() HER aşamada çalışıyor ──────────────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    var Z3 = this._zaman();
    var atlaOK = true, atlaNot = '';
    var noktalar = [0, 0.2, 0.4, 0.6, 0.8, 0.99];
    for (i = 0; i < noktalar.length; i++) {
      this._sabitZaman = 1000000;
      this.baslat(this._testOdul(5), 'gold');
      this._sabitZaman = 1000000 + Math.round(Z3.toplam * noktalar[i]);
      var asamaOnce = this.asama();
      this.atla();
      if (this.asama() !== 'sonuc' || this.oynuyor()) { atlaOK = false; atlaNot += asamaOnce + '! '; }
      else atlaNot += asamaOnce + '->sonuc ';
    }
    ek('atla_her_asamada', atlaOK, atlaNot);

    // atla sonrası DONE gerçekten çiziliyor mu
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    this._sabitZaman = 1000000 + 50;
    this.atla();
    var c4 = this._sahteCtx(390, 844); this._grCtx = null;
    this.ciz(c4, 390, 844, 0.016);
    var doneVar = false, B4 = this.butonlar();
    for (i = 0; i < B4.length; i++) if (B4[i].id === 'sandik_kapat') doneVar = true;
    ek('atla_sonrasi_DONE_ciziliyor', doneVar, doneVar ? 'DONE hitbox var' : 'DONE YOK');

    // ── 9) HAVUZ: kare başına yeni nesne 0 ───────────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'mythic');
    var havRef = this._hav, havUzun = this._hav.length;
    var ilkNesne = this._hav[0];
    var c5 = this._sahteCtx(390, 844); this._grCtx = null;
    for (i = 0; i < 30; i++) {
      this._sabitZaman = 1000000 + i * 90;
      this.ciz(c5, 390, 844, 0.016);
    }
    ek('parcacik_havuzu_sabit',
       this._hav === havRef && this._hav.length === havUzun && this._hav[0] === ilkNesne &&
       havUzun === this._HAV_MAX,
       'havuz ' + havUzun + ' nesne, 30 karede degismedi (ayni referans)');
    var cizFn = String(this._cizParcacik) + String(this._cizKart) + String(this._cizAltin) +
                String(this._cizSandik) + String(this._cizSerit) + String(this._istif);
    ek('cizim_yolunda_tahsis_yok',
       !/new\s+[A-Z]/.test(cizFn) && cizFn.indexOf('.map(') < 0 && cizFn.indexOf('.filter(') < 0 &&
       cizFn.indexOf('.slice(') < 0 && cizFn.indexOf('.concat(') < 0 && cizFn.indexOf('push(') < 0,
       'cizim fonksiyonlarinda new/map/filter/slice/concat/push YOK');

    // ── 10) TOHUMLU: aynı ödül → aynı animasyon ──────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    var t1 = this._tohum, h1 = '';
    for (i = 0; i < this._havN; i++) h1 += this._hav[i].vx.toFixed(6) + ',' + this._hav[i].t0 + ';';
    this.baslat(this._testOdul(5), 'gold');
    var t2 = this._tohum, h2 = '';
    for (i = 0; i < this._havN; i++) h2 += this._hav[i].vx.toFixed(6) + ',' + this._hav[i].t0 + ';';
    this.baslat(this._testOdul(3), 'gold');
    var t3 = this._tohum;
    ek('tohumlu_animasyon', t1 === t2 && h1 === h2 && t1 !== t3,
       'ayni odul -> ayni tohum(' + t1 + ') ve ayni parcacik; farkli odul -> farkli tohum(' + t3 + ')');

    // ── 11) GEOMETRİ DETERMİNİZMİ ────────────────────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    this._sabitZaman = 1000000 + this._zaman().toplam + this.T_DONE + 5;
    var c6 = this._sahteCtx(390, 844); this._grCtx = null;
    this.ciz(c6, 390, 844, 0.016);
    var G1 = this.butonlar();
    this.ciz(c6, 390, 844, 0.016);
    var G2 = this.butonlar();
    var det = G1.length === G2.length;
    if (det) for (i = 0; i < G1.length; i++) {
      if (G1[i].id !== G2[i].id || G1[i].x !== G2[i].x || G1[i].y !== G2[i].y ||
          G1[i].w !== G2[i].w || G1[i].h !== G2[i].h) { det = false; break; }
    }
    ek('geometri_deterministik', det, G1.length + ' buton, iki karede ayni');

    // ── 12) YATAY / DİKEY AYRI ───────────────────────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    var dD = this._duzen(390, 844), dY = this._duzen(844, 390);
    ek('yatay_dikey_duzen_farkli',
       dD.yatay === false && dY.yatay === true && dY.sut > dD.sut,
       'dikey ' + dD.sut + ' sutun / yatay ' + dY.sut + ' sutun');
    ek('yatay_5_kart_tek_sirada', dY.sut === 5 && dY.satir === 1,
       'yatayda ' + dY.sut + 'x' + dY.satir + ' (referans: 5 kart yan yana)');

    // ── 13) API SÖZLEŞMESİ ───────────────────────────────────────────────
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    ek('aktif_baslatinca_true', this.aktif() === true, 'aktif()=true');
    ek('oynuyor_baslangicta_true', this.oynuyor() === true, 'oynuyor()=true');
    var c7 = this._sahteCtx(390, 844); this._grCtx = null;
    this.ciz(c7, 390, 844, 0.016);
    var tkAtla = this.tikla(195, 400);
    ek('animasyonda_dokunus_atlar', !!tkAtla && tkAtla.eylem === 'sandik_atla' && !this.oynuyor(),
       tkAtla ? tkAtla.eylem : 'null');
    // Animasyon oynarken KART ÜZERİNE dokunmak da atlamalı (detay açmamalı)
    this._sabitZaman = 1000000;
    this.baslat(this._testOdul(5), 'gold');
    this._sabitZaman = 1000000 + this._zaman().kartT(0) + this.T_KART + 10;
    this._grCtx = null;
    this.ciz(c7, 390, 844, 0.016);
    var kb2 = null, B8 = this.butonlar();
    for (i = 0; i < B8.length; i++) if (B8[i].id === 'sandik_kart' && !kb2) kb2 = B8[i];
    var tkKA = kb2 ? this.tikla(kb2.x + kb2.w / 2, kb2.y + kb2.h / 2) : null;
    ek('animasyonda_kart_dokunusu_da_atlar',
       !!tkKA && tkKA.eylem === 'sandik_atla' && !this.oynuyor(),
       tkKA ? tkKA.eylem : 'kart yok');
    this._sabitZaman = 1000000 + this._zaman().toplam + this.T_DONE + 5;
    this.ciz(c7, 390, 844, 0.016);
    var B7 = this.butonlar(), doneB = null, kartB = null;
    for (i = 0; i < B7.length; i++) {
      if (B7[i].id === 'sandik_kapat') doneB = B7[i];
      if (B7[i].id === 'sandik_kart' && !kartB) kartB = B7[i];
    }
    var tkKart = kartB ? this.tikla(kartB.x + kartB.w / 2, kartB.y + kartB.h / 2) : null;
    ek('kart_tiklanabiliyor', !!tkKart && tkKart.eylem === 'sandik_kart' && !!tkKart.veri &&
       typeof tkKart.veri.id === 'string',
       tkKart ? (tkKart.eylem + ' id=' + tkKart.veri.id + ' nadirlik=' + tkKart.veri.nadirlik) : 'kart yok');
    var tkDone = doneB ? this.tikla(doneB.x + doneB.w / 2, doneB.y + doneB.h / 2) : null;
    ek('DONE_kapatiyor', !!tkDone && tkDone.eylem === 'sandik_kapat' && this.aktif() === false,
       tkDone ? (tkDone.eylem + ' -> aktif=' + this.aktif()) : 'DONE yok');
    ek('kapaliyken_tikla_null', this.tikla(10, 10) === null, 'kapali -> null');
    ek('kapaliyken_ciz_cizmiyor', (function (M) {
      var cz = M._sahteCtx(390, 844), o = cz._st.cagri;
      M.ciz(cz, 390, 844, 0.016);
      return cz._st.cagri === o;
    })(this), 'aktif degilken ciz() hicbir sey cizmiyor');
    ek('hazir', this.hazir() === true, 'hazir()');
    ek('bos_odulle_cokmuyor', (function (M) {
      try {
        M._sabitZaman = 1000000;
        M.baslat([], 'daily');
        var cz = M._sahteCtx(390, 844); M._grCtx = null;
        M.ciz(cz, 390, 844, 0.016);
        M._sabitZaman = 1000000 + M._zaman().toplam + M.T_DONE + 5;
        M.ciz(cz, 390, 844, 0.016);
        return M._olcum.hata === 0;
      } catch (e) { return false; }
    })(this), 'bos liste -> istisna yok');
    ek('bozuk_odulle_cokmuyor', (function (M) {
      try {
        M._sabitZaman = 1000000;
        M.baslat([null, { tip: 'zirva', adet: 'abc' }, { ad: 'X' }], 'yok_boyle_sandik');
        var cz = M._sahteCtx(390, 844); M._grCtx = null;
        M.ciz(cz, 390, 844, 0.016);
        return M._olcum.hata === 0 && M._kartlar.length === 2;
      } catch (e) { return false; }
    })(this), 'null / bozuk tip / eksik alan -> istisna yok');

    // ── 14) Economy.openChest DÖNÜŞTÜRÜCÜSÜ ──────────────────────────────
    var dn = this.donustur({ gold: 4200, scrap: 88, diamonds: 3 }, 'silver');
    ek('donustur_openChest', dn.length === 3 && dn[0].tip === 'altin' && dn[0].adet === 4200 &&
       dn[1].tip === 'hurda' && dn[1].adet === 88 && dn[2].tip === 'elmas' && dn[2].adet === 3,
       dn.map(function (o) { return o.tip + ':' + o.adet; }).join(' '));
    ek('para_birimine_nadirlik_serdi_yok',
       dn[1].nadirlik === 'common' && dn[2].nadirlik === 'common' &&
       dn[1].renk === '#b6c2d2' && dn[2].renk === '#4fd0ff' &&
       this._nadirIdx('common') < this.SERIT_ESIK,
       'hurda/elmas common (serit yok) + kendi HEX fayans rengi');
    ek('renk_koyultma', this._koyult('#4fd0ff') === '#245e73' && this._koyult('#fff') === '#737373',
       this._koyult('#4fd0ff') + ' / ' + this._koyult('#fff'));
    ek('donustur_hata_bos', this.donustur({ error: 'gold' }, 'gold').length === 0 &&
       this.donustur(null, 'gold').length === 0,
       'error/null -> bos dizi (animasyon acilmamali)');
    var E = this._g('Economy');
    ek('Economy_CHESTS_anahtarlari_taniniyor', (function (M) {
      if (!E || !E.CHESTS) return true;
      var kk2, eks = '';
      for (kk2 in E.CHESTS) if (!M.SANDIK_RENK[kk2]) eks += kk2 + ' ';
      return eks === '';
    })(this), E && E.CHESTS ? (Object.keys(E.CHESTS).length + ' kutu turunun hepsinin rengi var')
                            : 'Economy yok (yedek renk)');

    // ── 15) MODÜLLER YOKKEN ÇÖKMÜYOR ─────────────────────────────────────
    ek('EkranGaraj_yoksa_yedek_ikon', (function (M) {
      try {
        var cz = M._sahteCtx(390, 844);
        M._ikonYedek(cz, 'arac', '', 0, 0, 40, '#ffffff');
        M._ikonYedek(cz, 'altin', '', 0, 0, 40, '#ffffff');
        M._ikonYedek(cz, 'parca', '', 0, 0, 40, '#ffffff');
        return true;
      } catch (e) { return false; }
    })(this), 'yedek ikon yolu calisiyor');

    // ── DURUMU GERİ AL ───────────────────────────────────────────────────
    this._acik = yAcik; this._t0 = yT0; this._kaynak = yKaynak; this._tumOdul = yOdul;
    this._kartlar = yKart; this._altin = yAltin; this._gizli = yGizli; this._tohum = yTohum;
    this._sabitZaman = ySabit; this._t = yT;
    this._grCtx = null; this._btn = [];

    var kayitSonra = null;
    try { kayitSonra = (S && S.data) ? JSON.stringify(S.data) : 'YOK'; } catch (e) { kayitSonra = 'HATA'; }
    ek('selfTest_kaydi_bozmuyor', kayitOnce === kayitSonra,
       kayitOnce === kayitSonra
         ? ('SaveData.data degismedi (' + (kayitOnce === 'YOK' ? 'modul yok' : kayitOnce.length + ' bayt') + ')')
         : 'KAYIT DEGISTI!');
    ek('sabitZaman_temizlendi', this._sabitZaman === ySabit,
       'test zamani geri alindi (' + (ySabit == null ? 'null' : ySabit) + ')');

    var kaldi = 0;
    for (i = 0; i < R.length; i++) if (!R[i].gecti) kaldi++;
    return {
      modul: 'EkranSandik', surum: this.SURUM,
      toplam: R.length, gecti: R.length - kaldi, kaldi: kaldi,
      allPass: kaldi === 0,
      kontroller: R
    };
  }
};

if (typeof window !== 'undefined') window.EkranSandik = EkranSandik;
if (typeof module !== 'undefined' && module.exports) module.exports = EkranSandik;
