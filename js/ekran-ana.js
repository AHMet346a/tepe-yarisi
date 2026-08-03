'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ekran-ana.js — ANA EKRAN (HCR2 referans düzeni)
   ---------------------------------------------------------------------------
   Referans: "Ekran görüntüsü 2026-08-03 145009.png"
     · SOL   : büyük rütbe rozeti + rütbe adı + ilerleme çubuğu (984.907/1.000.000)
     · ORTA  : sandık slotları YAN YANA (görsel + geri sayım + doluluk rozeti)
     · SAĞ   : kare görev/harita paneli (YENİ GÖREV · geri sayım · harita adı ·
               araç ikonu · mesafe hedefi · büyük RACE butonu)
     · SOL KENAR : dikey ikon şeridi
     · SAĞ KENAR : dikey sandık geri sayım şeridi (1d · 15h · 2h)

   DIŞA VERİLEN API (ana oturum bunu bağlar):
     EkranAna.ciz(ctx, W, H, dt)
     EkranAna.tikla(x, y)        -> {eylem, veri} | null
     EkranAna.butonlar()         -> [{x,y,w,h,id}]
     EkranAna.kaydirma(delta)    -> false (kendi kaydırması YOK; her şey sığar)
     EkranAna.icerikAlani(W, H)  -> {x,y,w,h,ust,alt}
     EkranAna.hazir()
     EkranAna.selfTest()

   ⚠ ÜST ŞERİT ve ALT NAVİGASYON bu dosyanın işi DEĞİL — `icerikAlani()` o iki
     bandı dışarıda bırakır, oraya hiçbir şey çizilmez ve buton konmaz.

   🔴 PROJE KURALLARI (hepsi selfTest ile kilitli):
     · `ctx.font` YALNIZ `_font()` içinde atanır; boyut min(W-tabanlı, H-tabanlı).
     · `ctx.fillText` YALNIZ `_yaz()` içinde çağrılır; her çağrıda maxWidth verilir,
       sıkışma oranı 0.85 altına düşerse önce font küçültülür, sonra "…" ile kesilir.
     · Gradyanlar `_gr()` ile ÖNBELLEKLİ — kare başına yeni gradyan 0.
     · `ctx.ellipse` YOK (save + scale + arc + restore), `getImageData` YOK.
     · `Math.random` YOK — animasyon `dt` birikimli, geri sayım `Date.now()`.
     · `toUpperCase()` YOK — `_buyuk()` (UI._trBuyuk varsa onu kullanır).
     · Renkler HEX (accent + '33' alfa eklemesi bozulmasın).
     · Bare global'ler `typeof X !== 'undefined'` ile okunur.
   ═══════════════════════════════════════════════════════════════════════════ */

const EkranAna = {
  SURUM: '1.0',

  // ── Palet (HEX ZORUNLU) ──────────────────────────────────────────────────
  C: {
    zemin:  '#111725',
    panel:  '#1d2536',
    panel2: '#161d2c',
    koyu:   '#0e1320',
    cizgi:  '#2c3648',
    yazi:   '#e8eef7',
    alt:    '#9fb0c8',
    altin:  '#ffcf3f',
    elmas:  '#4fd0ff',
    yesil:  '#59d67a',
    turuncu:'#ff8a3d',
    kirmizi:'#ff5a5a',
    mor:    '#a97bff'
  },

  // ── Durum ────────────────────────────────────────────────────────────────
  _btn: [],
  _t: 0,
  _px: 12,
  _grC: {},
  _grCtx: null,
  _grBoyut: '',
  _olcum: null,
  _vc: null,
  _vcT: 0,
  _sonBoyut: { W: 0, H: 0 },

  // Türkçe büyük harf eşlemesi (toUpperCase YASAK)
  _TRB: { 'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü',
          'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç' },

  // ═════════════════════════════════════════════════════════════════════════
  // TEMEL YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  hazir() { return true; },

  // Bare global güvenli okuma (window.X ÇALIŞMAZ — CLAUDE.md "Kritik tuzaklar")
  _g(ad) {
    try {
      switch (ad) {
        case 'SaveData':    return (typeof SaveData    !== 'undefined') ? SaveData    : null;
        case 'Economy':     return (typeof Economy     !== 'undefined') ? Economy     : null;
        case 'MapSettings': return (typeof MapSettings !== 'undefined') ? MapSettings : null;
        case 'VehicleDefs': return (typeof VehicleDefs !== 'undefined') ? VehicleDefs : null;
        case 'Missions':    return (typeof Missions    !== 'undefined') ? Missions    : null;
        case 'DailyQuests': return (typeof DailyQuests !== 'undefined') ? DailyQuests : null;
        case 'UI':          return (typeof UI          !== 'undefined') ? UI          : null;
        default: return null;
      }
    } catch (e) { return null; }
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

  _sayi(n) {
    n = Math.floor(Number(n) || 0);
    try { return n.toLocaleString('tr-TR'); } catch (e) { }
    var s = String(Math.abs(n)), o = '', c = 0, i;
    for (i = s.length - 1; i >= 0; i--) { o = s.charAt(i) + o; if (++c % 3 === 0 && i > 0) o = '.' + o; }
    return (n < 0 ? '-' : '') + o;
  },

  _p2(n) { n = Math.floor(n); return (n < 10 ? '0' : '') + n; },

  // Uzun biçim — referanstaki "3h05min"
  _sure(ms) {
    ms = Math.max(0, Math.floor(Number(ms) || 0));
    var sn = Math.floor(ms / 1000);
    var g  = Math.floor(sn / 86400);
    if (g >= 1) return g + 'd';
    var s = Math.floor(sn / 3600), d = Math.floor((sn % 3600) / 60);
    if (s >= 10) return s + 'h';
    if (s >= 1)  return s + 'h' + this._p2(d) + 'min';
    if (d >= 1)  return d + 'min';
    return sn + 's';
  },

  // Kısa biçim — referanstaki sağ şerit "1d · 15h · 2h"
  _sureKisa(ms) {
    ms = Math.max(0, Math.floor(Number(ms) || 0));
    var sn = Math.floor(ms / 1000);
    var g = Math.floor(sn / 86400); if (g >= 1) return g + 'd';
    var s = Math.floor(sn / 3600);  if (s >= 1) return s + 'h';
    var d = Math.floor(sn / 60);    if (d >= 1) return d + 'min';
    return sn + 's';
  },

  _geceYarisi() {
    var n = new Date();
    var y = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 0, 0);
    return y.getTime() - n.getTime();
  },

  _haftaSonu() {
    var n = new Date();
    var gun = n.getDay();                 // 0 Paz .. 6 Cmt
    var kalan = (8 - (gun === 0 ? 7 : gun)) % 7;
    if (kalan === 0) kalan = 7;
    var y = new Date(n.getFullYear(), n.getMonth(), n.getDate() + kalan, 0, 0, 0, 0);
    return y.getTime() - n.getTime();
  },

  _hash(s) {
    s = String(s || '');
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ÇİZİM PRİMİTİFLERİ (font / metin / gradyan — hepsi TEK kapıdan)
  // ═════════════════════════════════════════════════════════════════════════

  // 🔴 Projede `.font =` ATAMASI YALNIZ BURADA. selfTest bunu sayarak kilitler.
  _font(c, px, kalinlik) {
    px = Math.max(6, Math.round(Number(px) || 10));
    this._px = px;
    c.font = (kalinlik || 'bold') + ' ' + px + 'px Arial';
    return px;
  },

  // Font boyutu HER ZAMAN min(W-tabanlı, H-tabanlı) + kelepçe.
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
  //   1) sıkışma oranı 0.85 altına düşerse font küçültülür
  //   2) hâlâ sığmıyorsa "…" ile kesilir
  //   3) her çağrıda maxWidth verilir (iki katmanlı koruma — 29 Tmz ölçümü)
  _yaz(c, metin, x, y, maxW, hiza, kalinlik) {
    var txt = String(metin == null ? '' : metin);
    var O = this._olcum;
    // maxWidth HER ZAMAN verilir; geçersiz gelirse ölçüme yazılır ve devasa bir
    // tavanla çağrılır (tek çıkış noktası korunsun diye — selfTest bunu sayar).
    if (maxW == null || !isFinite(maxW) || maxW <= 0) { if (O) O.maxsiz++; maxW = 1e6; }
    try { c.textAlign = hiza || 'left'; } catch (e) { }
    var px = this._px, w = this._mw(c, txt), koru = 0;
    if (maxW > 0 && w > 0) {
      while (w > maxW && (maxW / w) < 0.85 && px > 7 && koru < 48) {
        px--; this._font(c, px, kalinlik); w = this._mw(c, txt); koru++;
      }
      if (w > maxW && (maxW / w) < 0.85) {
        var t = txt, ww;
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
    try { c.fillText(txt, x, y, maxW); } catch (e) { }
    return w;
  },

  // Gradyan ÖNBELLEĞİ — kare başına yeni gradyan 0 olmalı.
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

  _kart(c, x, y, w, h, r, ustRenk, altRenk, kenar) {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = this._gr(c, 'kart' + ustRenk + altRenk, x, y, x, y + h,
      [[0, ustRenk], [1, altRenk]]);
    this._rr(c, x, y, w, h, r); c.fill();
    if (kenar) { c.strokeStyle = kenar; c.lineWidth = 1.5; this._rr(c, x, y, w, h, r); c.stroke(); }
  },

  _cubuk(c, x, y, w, h, oran, renk, zemin) {
    oran = Math.max(0, Math.min(1, Number(oran) || 0));
    c.fillStyle = zemin || this.C.koyu;
    this._rr(c, x, y, w, h, h / 2); c.fill();
    if (oran > 0) {
      var dw = Math.max(h, w * oran);
      c.fillStyle = this._gr(c, 'cub' + renk, x, y, x + w, y, [[0, renk], [1, '#ffffff']]);
      c.globalAlpha = 0.92;
      this._rr(c, x, y, Math.min(w, dw), h, h / 2); c.fill();
      c.globalAlpha = 1;
    }
  },

  _buton(id, x, y, w, h, veri) {
    var b = { id: id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    if (veri) b.veri = veri;
    this._btn.push(b);
    return b;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ALAN + DÜZEN
  // ═════════════════════════════════════════════════════════════════════════

  // Üst sekme şeridi ve alt navigasyon DIŞINDAKİ alan (ana oturum orayı çizer).
  icerikAlani(W, H) {
    W = Math.max(1, Number(W) || 0);
    H = Math.max(1, Number(H) || 0);
    var ust = Math.round(Math.max(44, Math.min(64, H * 0.075)));
    var alt = Math.round(Math.max(44, Math.min(72, H * 0.095)));
    if (ust + alt > H * 0.6) { ust = Math.round(H * 0.28); alt = Math.round(H * 0.28); }
    return { x: 0, y: ust, w: W, h: Math.max(1, H - ust - alt), ust: ust, alt: alt };
  },

  _duzen(W, H) {
    var A = this.icerikAlani(W, H);
    var yatay = W > H;
    var pad = 6, g = 6;
    var rayW = Math.round(Math.max(44, Math.min(52, W * 0.13)));
    // Çok dar ekranda raylar orta paneli ezmesin
    if (rayW * 2 + 120 > A.w) rayW = 44;

    var solX  = A.x + pad;
    var sagX  = A.x + A.w - pad - rayW;
    var ortaX = solX + rayW + pad;
    var ortaW = Math.max(80, sagX - pad - ortaX);
    var ortaY = A.y + pad;
    var ortaH = Math.max(80, A.h - pad * 2);

    var rutbe, sandik, gorev;
    if (yatay) {
      var w1 = Math.round(ortaW * 0.24);
      var w2 = Math.round(ortaW * 0.40);
      var w3 = ortaW - w1 - w2 - g * 2;
      rutbe  = { x: ortaX,                 y: ortaY, w: w1, h: ortaH };
      sandik = { x: ortaX + w1 + g,        y: ortaY, w: w2, h: ortaH };
      gorev  = { x: ortaX + w1 + w2 + g*2, y: ortaY, w: w3, h: ortaH };
    } else {
      var hR = Math.max(76, Math.min(112, Math.round(ortaH * 0.19)));
      var hS = Math.max(84, Math.min(132, Math.round(ortaH * 0.22)));
      var hG = Math.max(110, ortaH - hR - hS - g * 2);
      rutbe  = { x: ortaX, y: ortaY,                   w: ortaW, h: hR };
      sandik = { x: ortaX, y: ortaY + hR + g,          w: ortaW, h: hS };
      gorev  = { x: ortaX, y: ortaY + hR + hS + g * 2, w: ortaW, h: hG };
    }

    return {
      A: A, W: W, H: H, yatay: yatay, pad: pad,
      sol:  { x: solX, y: ortaY, w: rayW, h: ortaH },
      sag:  { x: sagX, y: ortaY, w: rayW, h: ortaH },
      rutbe: rutbe, sandik: sandik, gorev: gorev
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // VERİ TOPLAMA — hepsi GERÇEK modüllerden, hepsi null-güvenli
  // ═════════════════════════════════════════════════════════════════════════

  _veri() {
    var simdi = Date.now();
    if (this._vc && (simdi - this._vcT) < 1000) return this._vc;

    var S  = this._g('SaveData');
    var E  = this._g('Economy');
    var MS = this._g('MapSettings');
    var VD = this._g('VehicleDefs');
    var MI = this._g('Missions');

    var V = {
      altin: 0, elmas: 0, hurda: 0,
      rutbeAd: 'YENİ BAŞLAYAN', rutbeRenk: this.C.alt, rutbeIkon: '✦',
      rutbeSonraki: '', mesafe: 0, hedef: 0, oran: 0,
      seviye: 1, seri: 0, yaris: 0,
      sandiklar: [], sayaclar: [],
      gorev: null, haritaId: 'countryside', haritaAd: 'Kırsal',
      haritaEmoji: '🗺️', haritaRenk: '#8bc34a',
      aracId: 'jeep', aracAd: 'Jeep', aracRenk: '#5a8a3c'
    };

    // ── Para birimleri + seviye ──
    try {
      if (S && S.data) {
        V.altin = Math.max(0, Math.floor(S.data.gold || 0));
        V.elmas = Math.max(0, Math.floor(S.data.diamonds || 0));
        V.hurda = Math.max(0, Math.floor(S.data.scrap || 0));
        V.seviye = Math.max(1, Math.floor(S.data.playerLevel || 1));
        V.yaris  = Math.max(0, Math.floor(S.data.gamesPlayed || 0));
      }
    } catch (e) { }

    // ── RÜTBE: SaveData._rankThresholds (gerçek sistem, ui.js:3246 ile aynı ölçüt) ──
    try {
      var enIyi = 0, hs = (S && S.data) ? (S.data.highScores || {}) : {}, k;
      for (k in hs) { var d = Number(hs[k]) || 0; if (d > enIyi) enIyi = d; }
      V.mesafe = Math.floor(enIyi);
      if (S && typeof S.getRankInfo === 'function') {
        var bilgi = S.getRankInfo(V.mesafe);
        if (bilgi) {
          V.rutbeAd   = String(bilgi.name || V.rutbeAd);
          V.rutbeRenk = String(bilgi.color || V.rutbeRenk);
          V.rutbeIkon = String(bilgi.icon || V.rutbeIkon);
          V.hedef     = (bilgi.max === Infinity) ? 0 : Math.floor(bilgi.max || 0);
        }
        var liste = S._rankThresholds || [];
        var idx = -1, i;
        for (i = 0; i < liste.length; i++) if (liste[i] && liste[i].name === V.rutbeAd) { idx = i; break; }
        if (idx >= 0 && idx + 1 < liste.length) V.rutbeSonraki = String(liste[idx + 1].name || '');
      }
      if (S && typeof S.getRankProgress === 'function') {
        V.oran = Math.max(0, Math.min(1, Number(S.getRankProgress(V.mesafe)) || 0));
      } else if (V.hedef > 0) {
        V.oran = Math.max(0, Math.min(1, V.mesafe / V.hedef));
      }
    } catch (e) { }

    // ── SANDIKLAR: Economy.CHESTS (10 kutu türü) ──
    // Slot 1 = günlük (bedava, gün kilidi "lastDailyChest" deseni — ui.js:1215)
    // Slot 2/3 = altınla alınan iki kutu (bronze/silver)
    try {
      var bugun = new Date().toDateString();
      var alindi = false;
      try { alindi = !!(S && S.get && S.get('lastDailyChest') === bugun); } catch (e2) { }
      var C = (E && E.CHESTS) ? E.CHESTS : null;

      var yap = function (id, ad, renk, ikon) {
        var tanim = C ? C[id] : null;
        var s = { id: id, ad: ad, renk: renk, ikon: ikon, tanim: !!tanim,
                  bedava: false, maliyet: '', paraTip: '', tutar: 0,
                  kilit: false, kalan: 0, rozet: '', acilir: true };
        if (tanim) {
          if (tanim.free) s.bedava = true;
          if (tanim.costGold)    { s.paraTip = 'gold';    s.tutar = tanim.costGold;    s.maliyet = '⧆ ' + this._sayi(tanim.costGold); }
          if (tanim.costDiamond) { s.paraTip = 'diamond'; s.tutar = tanim.costDiamond; s.maliyet = '◆ ' + this._sayi(tanim.costDiamond); }
        }
        return s;
      }.bind(this);

      var s1 = yap('daily',  'GÜNLÜK', this.C.yesil,  '🎁');
      s1.bedava = true; s1.maliyet = 'BEDAVA';
      s1.kilit = alindi; s1.kalan = alindi ? this._geceYarisi() : 0;
      s1.acilir = !alindi;
      // Referanstaki "5" rozetinin karşılığı: gerçek gün serisi (Missions.streak)
      try { if (MI && typeof MI.streak === 'function') V.seri = Math.max(0, Math.floor(MI.streak() || 0)); } catch (e3) { }
      s1.rozet = '🔥 ' + V.seri;

      var s2 = yap('bronze', 'BRONZ',  '#cd7f32', '📦');
      s2.acilir = V.altin >= (s2.tutar || 0);
      s2.rozet  = s2.acilir ? 'HAZIR' : 'ALTIN YOK';

      var s3 = yap('silver', 'GÜMÜŞ', '#c8ced8', '📦');
      s3.acilir = V.altin >= (s3.tutar || 0);
      // Referanstaki "0/10" rozetinin karşılığı: gerçek yarış sayacı
      s3.rozet = (V.yaris % 10) + '/10';

      V.sandiklar = [s1, s2, s3];
    } catch (e) { V.sandiklar = []; }

    // ── SAĞ ŞERİT: gerçek geri sayımlar (Date.now tabanlı, dt DEĞİL) ──
    try {
      V.sayaclar = [
        { id: 'haftalik', ikon: '🏆', kalan: this._haftaSonu(),  renk: this.C.mor },
        { id: 'gunluk',   ikon: '🎁', kalan: this._geceYarisi(), renk: this.C.yesil },
        { id: 'gorev',    ikon: '🎯', kalan: this._geceYarisi(), renk: this.C.turuncu }
      ];
    } catch (e) { V.sayaclar = []; }

    // ── GÖREV: Missions.state() (günlük+haftalık birleşik liste) ──
    try {
      if (MI && typeof MI.state === 'function') {
        var st = MI.state();
        var lst = (st && st.list) ? st.list : [];
        var sec = null, j;
        for (j = 0; j < lst.length; j++) {
          var m = lst[j];
          if (!m) continue;
          if (m.done && !m.claimed) { sec = m; break; }        // önce ödül bekleyen
        }
        if (!sec) { for (j = 0; j < lst.length; j++) { if (lst[j] && !lst[j].done) { sec = lst[j]; break; } } }
        if (!sec && lst.length) sec = lst[0];
        if (sec) {
          var tanim = (typeof MI.def === 'function') ? MI.def(sec.id) : null;
          V.gorev = {
            id: sec.id,
            metin: tanim ? String(tanim.text || sec.id) : String(sec.id),
            hedef: tanim ? (Number(tanim.goal) || 0) : 0,
            ilerleme: Math.max(0, Number(sec.prog) || 0),
            odul: tanim ? (Number(tanim.reward) || 0) : 0,
            tip: tanim ? String(tanim.type || '') : '',
            bitti: !!sec.done, alindi: !!sec.claimed,
            harita: (tanim && tanim.map) ? String(tanim.map) : ''
          };
        }
      }
    } catch (e) { V.gorev = null; }

    // Görev yoksa DailyQuests'ten dene
    try {
      if (!V.gorev) {
        var DQ = this._g('DailyQuests');
        if (DQ && typeof DQ.getToday === 'function') {
          var q = DQ.getToday();
          var q0 = (q && q.length) ? q[0] : (q && q.quests && q.quests[0]);
          if (q0) {
            V.gorev = { id: String(q0.id || 'daily'), metin: String(q0.text || q0.desc || q0.name || ''),
                        hedef: Number(q0.goal || q0.target) || 0, ilerleme: Number(q0.prog || q0.progress) || 0,
                        odul: Number(q0.reward) || 0, tip: String(q0.type || ''), bitti: false, alindi: false, harita: '' };
          }
        }
      }
    } catch (e) { }

    // ── HARİTA: görevin haritası, yoksa son oynanan ──
    try {
      var hid = (V.gorev && V.gorev.harita) ? V.gorev.harita : '';
      if (!hid && S && S.get) { try { hid = String(S.get('lastMap') || ''); } catch (e4) { } }
      if (!hid) hid = 'countryside';
      V.haritaId = hid;
      if (MS && typeof MS.meta === 'function') {
        var mm = MS.meta(hid);
        if (mm) {
          V.haritaAd    = String(mm.theme || hid);
          V.haritaEmoji = String(mm.emoji || V.haritaEmoji);
          V.haritaRenk  = String(mm.col || V.haritaRenk);
        }
      } else { V.haritaAd = hid; }
    } catch (e) { }

    // ── ARAÇ: seçili araç ──
    try {
      var vid = (S && S.data && S.data.selectedVehicle) ? String(S.data.selectedVehicle) : 'jeep';
      V.aracId = vid;
      if (VD && VD[vid]) { V.aracAd = String(VD[vid].name || vid); V.aracRenk = String(VD[vid].color || V.aracRenk); }
      else { V.aracAd = vid; }
    } catch (e) { }

    this._vc = V; this._vcT = simdi;
    return V;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM
  // ═════════════════════════════════════════════════════════════════════════

  ciz(ctx, W, H, dt) {
    if (!ctx) return;
    W = Math.max(1, Number(W) || 1);
    H = Math.max(1, Number(H) || 1);
    this._btn = [];
    this._olcum = { minOran: 1, minTxt: '', tasma: 0, grYeni: 0, yaziSayisi: 0, maxsiz: 0, hata: 0, hataMsj: '' };
    this._sonBoyut = { W: W, H: H };

    var d = Number(dt);
    if (isFinite(d) && d > 0 && d < 0.5) this._t += d;
    if (this._t > 100000) this._t -= 100000;

    this._grHazirla(ctx, W, H);
    var L = this._duzen(W, H);
    var V = this._veri();

    this._bolum(ctx, 'arka',   L, V);
    this._bolum(ctx, 'solRay', L, V);
    this._bolum(ctx, 'rutbe',  L, V);
    this._bolum(ctx, 'sandik', L, V);
    this._bolum(ctx, 'gorev',  L, V);
    this._bolum(ctx, 'sagRay', L, V);
  },

  _bolum(ctx, ad, L, V) {
    try {
      if (ad === 'arka')        this._cizArka(ctx, L, V);
      else if (ad === 'solRay') this._cizSolRay(ctx, L, V);
      else if (ad === 'rutbe')  this._cizRutbe(ctx, L, V);
      else if (ad === 'sandik') this._cizSandiklar(ctx, L, V);
      else if (ad === 'gorev')  this._cizGorev(ctx, L, V);
      else if (ad === 'sagRay') this._cizSagRay(ctx, L, V);
    } catch (e) {
      if (this._olcum) { this._olcum.hata++; this._olcum.hataMsj = ad + ': ' + (e && e.message ? e.message : e); }
    }
  },

  // ── Arka plan (yalnız içerik alanı; üst şerit / alt nav BOŞ bırakılır) ────
  _cizArka(c, L, V) {
    var A = L.A;
    c.save();
    c.fillStyle = this._gr(c, 'zemin', A.x, A.y, A.x, A.y + A.h,
      [[0, this.C.zemin], [0.55, '#151b2a'], [1, this.C.koyu]]);
    c.fillRect(A.x, A.y, A.w, A.h);

    // Harita temasından gelen çok hafif renk yıkaması (kare başına yeni gradyan 0)
    c.globalAlpha = 0.10;
    c.fillStyle = this._gr(c, 'tema' + V.haritaRenk, A.x, A.y, A.x + A.w, A.y + A.h,
      [[0, V.haritaRenk], [1, this.C.koyu]]);
    c.fillRect(A.x, A.y, A.w, A.h);
    c.globalAlpha = 1;
    c.restore();
  },

  // ── SOL DİKEY İKON ŞERİDİ (referans: sol kenar) ──────────────────────────
  _cizSolRay(c, L, V) {
    var R = L.sol;
    var ogeler = [
      { id: 'rutbe',   ikon: '🏅', renk: V.rutbeRenk,    eylem: 'ana_ray_rutbe'  },
      { id: 'gorev',   ikon: '🎯', renk: this.C.turuncu, eylem: 'ana_ray_gorev'  },
      { id: 'garaj',   ikon: '🔧', renk: this.C.elmas,   eylem: 'ana_ray_garaj'  },
      { id: 'harita',  ikon: '🗺️', renk: this.C.yesil,   eylem: 'ana_ray_harita' }
    ];
    var n = ogeler.length;
    var yuk = Math.round(Math.max(44, Math.min(58, (R.h - (n - 1) * 6) / n)));
    var i, y;
    c.save();
    for (i = 0; i < n; i++) {
      y = R.y + i * (yuk + 6);
      if (y + yuk > R.y + R.h) break;
      this._kart(c, R.x, y, R.w, yuk, 10, this.C.panel, this.C.panel2, ogeler[i].renk + '55');
      c.fillStyle = this.C.yazi;
      c.textBaseline = 'middle';
      this._f(c, L.W, L.H, 0.052, 0.026, 14, 22, 'bold');
      this._yaz(c, ogeler[i].ikon, R.x + R.w / 2, y + yuk / 2, R.w - 8, 'center', 'bold');
      // ince renk vurgusu — accent HEX olmali (alfa "+33" ile eklenir)
      c.fillStyle = ogeler[i].renk;
      this._rr(c, R.x + 2, y + yuk * 0.22, 3, yuk * 0.56, 1.5); c.fill();
      this._buton(ogeler[i].eylem, R.x, y, R.w, yuk, { kisayol: ogeler[i].id });
    }
    c.restore();
  },

  // ── RÜTBE PANELİ (referans: sol büyük rozet + ad + ilerleme çubuğu) ───────
  _cizRutbe(c, L, V) {
    var P = L.rutbe;
    if (P.w < 40 || P.h < 40) return;
    c.save();
    this._kart(c, P.x, P.y, P.w, P.h, 12, this.C.panel, this.C.panel2, V.rutbeRenk + '66');

    var yatayDuzen = P.w >= P.h * 1.4;
    var pad = 10;
    var rozetR, rx, ry, tx, tw, ty;

    if (yatayDuzen) {
      rozetR = Math.max(16, Math.min((P.h - pad * 2) / 2, P.w * 0.17));
      rx = P.x + pad + rozetR; ry = P.y + P.h / 2;
      tx = rx + rozetR + 10;
      tw = Math.max(20, P.x + P.w - pad - tx);
      // 4 satırlık blok (ad + sıradaki + sayı + çubuk) dikeyde ORTALANIR
      ty = P.y + P.h / 2 - Math.min(P.h * 0.36, 46);
    } else {
      rozetR = Math.max(16, Math.min(P.w * 0.30, P.h * 0.16));
      // Rozet + metin bloğu birlikte ortalanır (uzun sütunda alt boşluk kalmasın)
      var blokY = Math.min(P.h * 0.42, rozetR * 2 + 74);
      ry = P.y + (P.h - blokY) / 2 + rozetR;
      rx = P.x + P.w / 2;
      tx = P.x + pad; tw = Math.max(20, P.w - pad * 2);
      ty = ry + rozetR + 12;
    }

    this._rozet(c, rx, ry, rozetR, V.rutbeRenk, V.rutbeIkon, L);

    // Rütbe adı
    c.textBaseline = 'top';
    c.fillStyle = V.rutbeRenk;
    this._f(c, L.W, L.H, 0.050, 0.026, 12, 22, 'bold');
    this._yaz(c, this._buyuk(V.rutbeAd), yatayDuzen ? tx : tx + tw / 2, ty, tw,
      yatayDuzen ? 'left' : 'center', 'bold');
    var y2 = ty + this._px + 4;

    // Sıradaki rütbe (referanstaki "FIRST-CLASS" alt satırının karşılığı)
    c.fillStyle = this.C.alt;
    this._f(c, L.W, L.H, 0.030, 0.016, 8, 13, '600');
    // ⚠ Süslü ok (▸ » →) glifi her fontta YOK — kutu olarak çıkar. Düz metin.
    var altMetin = V.rutbeSonraki
      ? this._buyuk('SIRADAKİ: ' + V.rutbeSonraki)
      : this._buyuk('EN YÜKSEK RÜTBE');
    this._yaz(c, altMetin, yatayDuzen ? tx : tx + tw / 2, y2, tw,
      yatayDuzen ? 'left' : 'center', '600');
    var y3 = y2 + this._px + 8;

    // Sayılar: 984.907 / 1.000.000  ★
    c.fillStyle = this.C.yazi;
    this._f(c, L.W, L.H, 0.034, 0.018, 9, 15, 'bold');
    var sayiMetin = this._sayi(V.mesafe) + ' / ' + (V.hedef > 0 ? this._sayi(V.hedef) : '∞');
    this._yaz(c, sayiMetin, yatayDuzen ? tx : tx + tw / 2, y3, tw,
      yatayDuzen ? 'left' : 'center', 'bold');
    var y4 = y3 + this._px + 6;

    // İlerleme çubuğu
    var cubukH = Math.max(7, Math.min(12, P.h * 0.10));
    if (y4 + cubukH <= P.y + P.h - 6) {
      this._cubuk(c, tx, y4, tw, cubukH, V.oran, V.rutbeRenk, this.C.koyu);
      // 🔴 Yüzde yazısı KOYU renkte GÖRÜNMÜYORDU (PNG kanıtında yakalandı) —
      //   çubuğun dolu/boş iki yarısında da okunsun diye AÇIK renk.
      c.textBaseline = 'middle';
      c.fillStyle = this.C.yazi;
      this._f(c, L.W, L.H, 0.024, 0.013, 7, 11, 'bold');
      this._yaz(c, '%' + Math.round(V.oran * 100), tx + tw / 2, y4 + cubukH / 2,
        tw - 6, 'center', 'bold');
      c.textBaseline = 'top';
    }

    this._buton('ana_rutbe', P.x, P.y, P.w, P.h, { rutbe: V.rutbeAd, mesafe: V.mesafe, oran: V.oran });
    c.restore();
  },

  // Rütbe rozeti — daire + halka + ikon (ctx.ellipse YOK)
  _rozet(c, cx, cy, r, renk, ikon, L) {
    c.save();
    // dış gölge halkası
    c.globalAlpha = 0.35;
    c.fillStyle = this.C.koyu;
    this._elips(c, cx, cy + r * 0.10, r * 1.06, r * 1.06);
    c.globalAlpha = 1;
    // gövde
    c.fillStyle = this._gr(c, 'roz' + renk, cx, cy - r, cx, cy + r,
      [[0, renk], [1, this.C.koyu]]);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    // halka
    c.strokeStyle = renk; c.lineWidth = Math.max(2, r * 0.10);
    c.beginPath(); c.arc(cx, cy, r * 0.90, 0, Math.PI * 2); c.stroke();
    // iç koyu alan
    c.fillStyle = this.C.koyu; c.globalAlpha = 0.55;
    c.beginPath(); c.arc(cx, cy, r * 0.66, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    // ikon
    c.fillStyle = this.C.yazi; c.textBaseline = 'middle';
    this._f(c, L.W, L.H, 0.055, 0.030, 12, 26, 'bold');
    var ikonPx = Math.min(this._px, r * 1.15);
    this._font(c, ikonPx, 'bold');
    this._yaz(c, ikon, cx, cy + 1, r * 1.5, 'center', 'bold');
    c.textBaseline = 'top';
    c.restore();
  },

  // ── SANDIK SLOTLARI (referans: orta, kutu kutunun yanında) ───────────────
  _cizSandiklar(c, L, V) {
    var P = L.sandik;
    if (P.w < 40 || P.h < 40) return;
    var liste = V.sandiklar || [];
    if (!liste.length) return;
    var n = liste.length, i;
    var ip = 5;
    var satirDuzen = P.w >= P.h * 0.9;   // geniş → yan yana (referans), dar → alt alta

    c.save();
    for (i = 0; i < n; i++) {
      var x, y, w, h;
      if (satirDuzen) {
        w = Math.floor((P.w - ip * (n - 1)) / n);
        h = P.h;
        x = P.x + i * (w + ip);
        y = P.y;
      } else {
        w = P.w;
        h = Math.floor((P.h - ip * (n - 1)) / n);
        x = P.x;
        y = P.y + i * (h + ip);
      }
      if (w < 30 || h < 30) continue;
      this._cizSandikSlot(c, L, liste[i], x, y, w, h);
    }
    c.restore();
  },

  _cizSandikSlot(c, L, S, x, y, w, h) {
    var kilitli = !!S.kilit;
    this._kart(c, x, y, w, h, 10, this.C.panel, this.C.panel2, S.renk + (kilitli ? '33' : '88'));

    var pad = 5;
    var dikey = h >= w * 1.15;
    var ikonY, ikonR;

    // Sandık görseli: renkli kutu + kapak + kilit dili
    ikonR = Math.max(10, Math.min(w * (dikey ? 0.34 : 0.30), h * (dikey ? 0.22 : 0.30)));
    // ⚠ İçerik bloğu (ikon + 3 satır) kart içinde DİKEYDE ORTALANIR — yatay
    //   modda sütun 290 px yüksekti ve alt yarısı bomboş kalıyordu (PNG kanıtı).
    var blokH = ikonR * 2.1 + 52;
    var blokY = y + Math.max(pad, (h - blokH) / 2);
    ikonY = blokY + ikonR + 2;
    var ikonX = x + w / 2;

    c.save();
    if (kilitli) c.globalAlpha = 0.45;
    // kutu gövdesi
    c.fillStyle = this._gr(c, 'snd' + S.renk, ikonX, ikonY - ikonR, ikonX, ikonY + ikonR,
      [[0, S.renk], [1, this.C.koyu]]);
    this._rr(c, ikonX - ikonR, ikonY - ikonR * 0.55, ikonR * 2, ikonR * 1.45, ikonR * 0.22); c.fill();
    // kapak
    c.fillStyle = S.renk;
    this._rr(c, ikonX - ikonR * 1.06, ikonY - ikonR * 0.95, ikonR * 2.12, ikonR * 0.62, ikonR * 0.18); c.fill();
    // kilit dili
    c.fillStyle = this.C.altin;
    this._rr(c, ikonX - ikonR * 0.16, ikonY - ikonR * 0.75, ikonR * 0.32, ikonR * 0.85, ikonR * 0.08); c.fill();
    // taban gölgesi (ellipse YOK → _elips)
    c.globalAlpha = kilitli ? 0.18 : 0.28;
    c.fillStyle = this.C.koyu;
    this._elips(c, ikonX, ikonY + ikonR * 0.95, ikonR * 0.95, ikonR * 0.22);
    c.restore();

    var yy = ikonY + ikonR + 4;
    var ic = w - pad * 2;

    // Ad
    c.textBaseline = 'top';
    c.fillStyle = kilitli ? this.C.alt : this.C.yazi;
    this._f(c, L.W, L.H, 0.026, 0.014, 8, 12, 'bold');
    this._yaz(c, this._buyuk(S.ad), x + w / 2, yy, ic, 'center', 'bold');
    yy += this._px + 3;

    // Geri sayım (kilitliyse) veya maliyet
    var altMetin = kilitli ? this._sure(S.kalan) : (S.maliyet || 'AÇ');
    c.fillStyle = kilitli ? this.C.turuncu : (S.acilir ? this.C.altin : this.C.kirmizi);
    this._f(c, L.W, L.H, 0.026, 0.014, 8, 12, 'bold');
    if (yy + this._px <= y + h - pad) {
      this._yaz(c, altMetin, x + w / 2, yy, ic, 'center', 'bold');
      yy += this._px + 3;
    }

    // Doluluk rozeti (referanstaki "5" / "0/10")
    if (S.rozet && yy + 14 <= y + h - pad) {
      var rw = Math.min(ic, Math.max(28, ic * 0.82));
      var rh = Math.max(13, Math.min(18, h * 0.14));
      c.fillStyle = this.C.koyu;
      this._rr(c, x + w / 2 - rw / 2, yy, rw, rh, rh / 2); c.fill();
      c.strokeStyle = S.renk + '66'; c.lineWidth = 1;
      this._rr(c, x + w / 2 - rw / 2, yy, rw, rh, rh / 2); c.stroke();
      c.fillStyle = this.C.alt;
      c.textBaseline = 'middle';
      this._f(c, L.W, L.H, 0.022, 0.012, 7, 11, 'bold');
      this._yaz(c, S.rozet, x + w / 2, yy + rh / 2, rw - 6, 'center', 'bold');
      c.textBaseline = 'top';
    }

    this._buton('ana_sandik_' + S.id, x, y, w, h,
      { tip: S.id, bedava: S.bedava, kilit: kilitli, kalan: Math.floor(S.kalan || 0),
        paraTip: S.paraTip, tutar: S.tutar, acilir: !!S.acilir });
  },

  // ── GÖREV / HARİTA PANELİ (referans: sağ kare panel + RACE) ──────────────
  _cizGorev(c, L, V) {
    var P = L.gorev;
    if (P.w < 60 || P.h < 60) return;
    c.save();
    this._kart(c, P.x, P.y, P.w, P.h, 12, this.C.panel, this.C.panel2, this.C.turuncu + '55');

    // ── ŞERİT DÜZENİ: hiçbir buton bir diğeriyle ÇAKIŞMAZ (selfTest kilitli) ──
    //   [başlık 44+]  [harita önizleme]  [araç + mesafe çipi 44]  [YARIŞ 44+]
    var pad = 8, g = 6;
    var ic = P.w - pad * 2;
    var x0 = P.x + pad;

    var hb = Math.round(Math.max(44, Math.min(54, P.h * 0.16)));   // başlık bandı
    var rh = Math.round(Math.max(44, Math.min(54, P.h * 0.17)));   // YARIŞ butonu
    var ch = 44;                                                    // çip satırı
    var raceY = P.y + P.h - pad - rh;
    var ust   = P.y + hb;

    // ── Başlık: "YENİ GÖREV" + geri sayım çipi (uzun biçim "3h05min") ──
    var bOrta = P.y + hb / 2;
    c.fillStyle = this.C.turuncu;
    c.textBaseline = 'middle';
    this._f(c, L.W, L.H, 0.030, 0.016, 8, 13, 'bold');
    this._yaz(c, this._buyuk('YENİ GÖREV'), x0, bOrta, ic * 0.54, 'left', 'bold');

    var cw = Math.max(44, Math.round(ic * 0.40));
    var cx = x0 + ic - cw;
    var cyh = Math.max(18, Math.min(24, hb - 14));
    c.fillStyle = this.C.koyu;
    this._rr(c, cx, bOrta - cyh / 2, cw, cyh, cyh / 2); c.fill();
    c.strokeStyle = this.C.turuncu + '66'; c.lineWidth = 1;
    this._rr(c, cx, bOrta - cyh / 2, cw, cyh, cyh / 2); c.stroke();
    c.fillStyle = this.C.yazi;
    this._f(c, L.W, L.H, 0.026, 0.014, 7, 12, 'bold');
    this._yaz(c, this._sure(this._geceYarisi()), cx + cw / 2, bOrta, cw - 6, 'center', 'bold');
    c.textBaseline = 'top';
    // Başlık bandının TAMAMI görev ekranına gider (yükseklik >= 44)
    this._buton('ana_gorev', P.x, P.y, P.w, hb, { gorev: V.gorev ? V.gorev.id : null });

    // ── Çip satırı: RACE'in hemen üstünde sabit ──
    var cipY = raceY - g - ch;
    var cipVar = (cipY >= ust);
    if (cipVar) {
      var aw = Math.round(ic * 0.52), mw2 = ic - aw - g;
      this._cizAracCip(c, L, V, x0, cipY, aw, ch);
      this._cizMesafeCip(c, L, V, x0 + aw + g, cipY, mw2, ch);
    }

    // ── Harita önizlemesi (KODLA çizilir, PNG yok) — kalan tüm alan ──
    var onizAlt = cipVar ? (cipY - g) : (raceY - g);
    var onizH = onizAlt - ust;
    if (onizH >= 46 && ic > 40) {
      this._cizHaritaOnizleme(c, L, V, x0, ust, ic, onizH);
    }

    // ── Büyük RACE butonu ──
    var bx = x0, bw = ic;
    c.fillStyle = this._gr(c, 'race', bx, raceY, bx, raceY + rh,
      [[0, '#7ee08a'], [0.5, this.C.yesil], [1, '#2f9b52']]);
    this._rr(c, bx, raceY, bw, rh, 8); c.fill();
    c.strokeStyle = '#1d6b38'; c.lineWidth = 2;
    this._rr(c, bx, raceY, bw, rh, 8); c.stroke();
    c.fillStyle = '#0d2415';
    c.textBaseline = 'middle';
    this._f(c, L.W, L.H, 0.052, 0.028, 13, 22, 'bold');
    this._yaz(c, this._buyuk('YARIŞ'), bx + bw / 2, raceY + rh / 2, bw - 16, 'center', 'bold');
    c.textBaseline = 'top';

    this._buton('ana_yaris', bx, raceY, bw, rh,
      { harita: V.haritaId, arac: V.aracId, gorev: V.gorev ? V.gorev.id : null });

    c.restore();
  },

  // Harita önizlemesi: tema rengi + siluet + emoji + ad (deterministik, Math.random YOK)
  _cizHaritaOnizleme(c, L, V, x, y, w, h) {
    var renk = V.haritaRenk || '#8bc34a';
    c.save();
    this._rr(c, x, y, w, h, 8); c.clip();

    // gökyüzü
    c.fillStyle = this._gr(c, 'gok' + renk, x, y, x, y + h,
      [[0, '#26304a'], [0.55, renk], [1, this.C.koyu]]);
    c.fillRect(x, y, w, h);

    // Alt bilgi şeridi: harita adı + görev metni (yükseklik önden ayrılır)
    var ikiSatir = !!(V.gorev && V.gorev.metin);
    var sh = Math.max(20, Math.min(h * 0.30, ikiSatir ? 42 : 26));

    // ── Tepeler — harita kimliğinden türetilen SABİT faz (her karede aynı) ──
    // 🔴 Sağ kenarda dikey KOPUK oluyordu: döngü adım adım ilerlerken w'ye TAM
    //   oturmuyor, sonra doğrudan köşeye iniliyordu. Artık son örnek x+w'de.
    var tohum = this._hash(V.haritaId);
    var yerY = y + h - sh;                 // zemin çizgisi (şeridin üstü)
    var kat, i, adim = Math.max(4, Math.floor(w / 26));
    var onTaban = 0, onGen = 0, onFaz = 0, onFrk = 0;
    for (kat = 0; kat < 3; kat++) {
      var faz = ((tohum >>> (kat * 7)) & 255) / 255 * Math.PI * 2;
      var frk = 1.1 + kat * 0.9;
      var gen = h * (0.09 + kat * 0.05);
      var taban = y + h * 0.50 + (h * 0.13) * kat;
      if (taban > yerY - 4) taban = yerY - 4;
      c.globalAlpha = (kat === 2) ? 1 : (0.42 + kat * 0.22);
      c.fillStyle = (kat === 2) ? this.C.koyu : renk;
      c.beginPath();
      c.moveTo(x, y + h);
      for (i = 0; i <= w; i += adim) {
        c.lineTo(x + i, taban - gen * (0.5 + 0.5 * Math.sin(faz + (i / Math.max(1, w)) * Math.PI * 2 * frk)));
      }
      // son örnek TAM x+w (kopuk kenar düzeltmesi)
      c.lineTo(x + w, taban - gen * (0.5 + 0.5 * Math.sin(faz + Math.PI * 2 * frk)));
      c.lineTo(x + w, y + h);
      c.closePath(); c.fill();
      if (kat === 2) { onTaban = taban; onGen = gen; onFaz = faz; onFrk = frk; }
    }
    c.globalAlpha = 1;

    // ── Araç silueti ön tepenin üstünde (referansta da araç panelin içinde) ──
    var av = Math.min(w * 0.26, (yerY - y) * 0.42);
    if (av >= 22) {
      var aOran = 0.30;                                  // pistin %30'unda dursun
      var aX = x + w * aOran;
      var aY = onTaban - onGen * (0.5 + 0.5 * Math.sin(onFaz + aOran * Math.PI * 2 * onFrk));
      this._aracKutuya(c, V, aX - av / 2, aY - av * 0.62, av, av * 0.62);
    }

    // emoji rozeti (sol üst)
    var ep = Math.max(12, Math.min(w * 0.14, h * 0.22));
    c.fillStyle = this.C.koyu; c.globalAlpha = 0.55;
    this._rr(c, x + 5, y + 5, ep + 8, ep + 8, 6); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = this.C.yazi; c.textBaseline = 'middle';
    this._font(c, ep, 'bold');
    this._yaz(c, V.haritaEmoji, x + 5 + (ep + 8) / 2, y + 5 + (ep + 8) / 2, ep + 6, 'center', 'bold');

    // ── Alt şerit: harita adı + (varsa) görev metni ──
    c.fillStyle = this.C.koyu; c.globalAlpha = 0.78;
    c.fillRect(x, y + h - sh, w, sh);
    c.globalAlpha = 1;
    c.fillStyle = this.C.yazi;
    this._f(c, L.W, L.H, 0.032, 0.017, 9, 14, 'bold');
    var adY = ikiSatir ? (y + h - sh + sh * 0.32) : (y + h - sh / 2);
    this._yaz(c, this._buyuk(V.haritaAd), x + 6, adY, w - 12, 'left', 'bold');
    if (ikiSatir) {
      c.fillStyle = this.C.alt;
      this._f(c, L.W, L.H, 0.024, 0.013, 7, 11, '600');
      this._yaz(c, V.gorev.metin, x + 6, y + h - sh + sh * 0.72, w - 12, 'left', '600');
    }
    c.textBaseline = 'top';
    c.restore();

    // çerçeve
    c.strokeStyle = renk + '99'; c.lineWidth = 1.5;
    this._rr(c, x, y, w, h, 8); c.stroke();

    // h çağıran tarafta zaten >= 46 (bant düzeni) — şişirme YOK, çakışma olmaz
    this._buton('ana_harita', x, y, w, h, { harita: V.haritaId });
  },

  _cizAracCip(c, L, V, x, y, w, h) {
    this._kart(c, x, y, w, h, 7, this.C.koyu, this.C.panel2, V.aracRenk + '66');
    var kw = Math.min(w * 0.42, h * 1.6);
    this._aracKutuya(c, V, x + 4, y + 3, kw, h - 6);

    c.fillStyle = this.C.yazi;
    c.textBaseline = 'middle';
    this._f(c, L.W, L.H, 0.026, 0.014, 7, 12, 'bold');
    var tx = x + 6 + kw + 4;
    this._yaz(c, this._buyuk(V.aracAd), tx, y + h / 2, Math.max(10, x + w - 5 - tx), 'left', 'bold');
    c.textBaseline = 'top';
    this._buton('ana_arac', x, y, w, h, { arac: V.aracId });
  },

  // Aracı VERİLEN KUTUYA sığdırarak çizer.
  // 🔴 PNG kanıtında yakalandı: eski sürüm yalnız GENİŞLİĞE ölçekliyordu ve
  //   çizim merkezini teker eksenine koyuyordu → kabin kutunun DIŞINA taşıyor,
  //   ekranda kopuk bir kırmızı şerit + iki teker görünüyordu.
  //   Artık gerçek sınırlayıcı kutu hesaplanıp İKİ EKSENE birden sığdırılıyor.
  _aracKutuya(c, V, x, y, w, h) {
    if (w <= 2 || h <= 2) return;
    var VD = this._g('VehicleDefs');
    var def = (VD && VD[V.aracId]) ? VD[V.aracId] : null;
    var gw = (def && def.w) ? def.w : 100;
    var gh = (def && def.h) ? def.h : 44;
    var wl = (def && def.wheels && def.wheels.length)
      ? def.wheels
      : [{ x: -gw * 0.32, y: 0, r: gh * 0.42 }, { x: gw * 0.32, y: 0, r: gh * 0.42 }];

    // Sınırlayıcı kutu (yerel koordinat: teker ekseni y=0, gövde yukarı)
    var solX = -gw / 2, sagX = gw / 2, ustY = -gh * 1.44, altY = 0, i, wr;
    for (i = 0; i < wl.length; i++) {
      wr = wl[i].r || wl[i].radius || gh * 0.4;
      solX = Math.min(solX, (wl[i].x || 0) - wr);
      sagX = Math.max(sagX, (wl[i].x || 0) + wr);
      altY = Math.max(altY, (wl[i].y || 0) + wr);
    }
    var bw = Math.max(1, sagX - solX), bh = Math.max(1, altY - ustY);
    var o = Math.min(w / bw, h / bh);
    if (!isFinite(o) || o <= 0) return;

    var mx = x + w / 2 - ((solX + sagX) / 2) * o;
    var my = y + h / 2 - ((ustY + altY) / 2) * o;

    // ── 1. TERCİH: oyunun GERÇEK araç çizimi ──
    //   UI._drawMenuCar -> drawVehicle (js/vehicles.js, 174 adet drawXxx).
    //   Aynı o ölçeği verilir (hedefGenislik = o * def.w) → kutuya BİREBİR oturur.
    var u = this._g('UI');
    if (def && u && typeof u._drawMenuCar === 'function') {
      try {
        c.save();
        this._rr(c, x, y, w, h, 4); c.clip();
        c.translate(mx, my);
        u._drawMenuCar(c, V.aracId, this._t, o * gw);
        c.restore();
        return;
      } catch (e) { try { c.restore(); } catch (e2) { } }
    }

    // ── 2. YEDEK: sade siluet (UI yokken / çizim hata verince) ──
    c.save();
    this._rr(c, x, y, w, h, 4); c.clip();          // kutu dışına ASLA taşmaz
    c.translate(mx, my);
    c.scale(o, o);

    // gölge (ctx.ellipse YOK)
    c.globalAlpha = 0.30; c.fillStyle = '#000000';
    this._elips(c, 0, altY * 0.98, bw * 0.42, Math.max(2, bh * 0.055));
    c.globalAlpha = 1;
    // gövde
    c.fillStyle = V.aracRenk || '#5a8a3c';
    this._rr(c, -gw / 2, -gh, gw, gh, Math.min(9, gh * 0.26)); c.fill();
    // kabin
    c.fillStyle = (def && def.color2) ? def.color2 : '#222831';
    this._rr(c, -gw * 0.24, -gh * 1.42, gw * 0.50, gh * 0.52, 4); c.fill();
    // tekerler
    for (i = 0; i < wl.length; i++) {
      wr = wl[i].r || wl[i].radius || gh * 0.4;
      c.fillStyle = '#15181f';
      c.beginPath(); c.arc(wl[i].x || 0, wl[i].y || 0, wr, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8a93a6';
      c.beginPath(); c.arc(wl[i].x || 0, wl[i].y || 0, wr * 0.40, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },

  _cizMesafeCip(c, L, V, x, y, w, h) {
    this._kart(c, x, y, w, h, 7, this.C.koyu, this.C.panel2, this.C.altin + '55');
    var metin, etiket;
    if (V.gorev && V.gorev.hedef > 0) {
      if (V.gorev.tip === 'distance' || V.gorev.tip === 'map' || V.gorev.tip === 'nodmg') {
        metin = this._sayi(V.gorev.hedef) + 'm';
      } else {
        metin = this._sayi(V.gorev.ilerleme) + '/' + this._sayi(V.gorev.hedef);
      }
      etiket = 'HEDEF';
    } else {
      metin = this._sayi(V.mesafe) + 'm';
      etiket = 'REKOR';
    }
    c.textBaseline = 'top';
    c.fillStyle = this.C.alt;
    this._f(c, L.W, L.H, 0.020, 0.011, 6, 10, '600');
    this._yaz(c, etiket, x + w / 2, y + 3, w - 8, 'center', '600');
    c.fillStyle = this.C.altin;
    this._f(c, L.W, L.H, 0.032, 0.017, 9, 15, 'bold');
    this._yaz(c, metin, x + w / 2, y + h - this._px - 4, w - 8, 'center', 'bold');
  },

  // ── SAĞ DİKEY GERİ SAYIM ŞERİDİ (referans: 1d · 15h · 2h) ────────────────
  _cizSagRay(c, L, V) {
    var R = L.sag;
    var liste = V.sayaclar || [];
    if (!liste.length) return;
    var n = liste.length;
    var yuk = Math.round(Math.max(44, Math.min(62, (R.h - (n - 1) * 6) / n)));
    var i, y;
    c.save();
    for (i = 0; i < n; i++) {
      y = R.y + i * (yuk + 6);
      if (y + yuk > R.y + R.h) break;
      var S = liste[i];
      this._kart(c, R.x, y, R.w, yuk, 10, this.C.panel, this.C.panel2, S.renk + '55');
      c.textBaseline = 'middle';
      c.fillStyle = this.C.yazi;
      this._f(c, L.W, L.H, 0.044, 0.023, 12, 19, 'bold');
      this._yaz(c, S.ikon, R.x + R.w / 2, y + yuk * 0.34, R.w - 6, 'center', 'bold');
      c.fillStyle = S.renk;
      this._f(c, L.W, L.H, 0.026, 0.014, 8, 12, 'bold');
      this._yaz(c, this._sureKisa(S.kalan), R.x + R.w / 2, y + yuk * 0.76, R.w - 4, 'center', 'bold');
      c.textBaseline = 'top';
      this._buton('ana_zaman_' + S.id, R.x, y, R.w, yuk, { sayac: S.id, kalan: Math.floor(S.kalan) });
    }
    c.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GİRDİ
  // ═════════════════════════════════════════════════════════════════════════

  butonlar() {
    var o = [], i, b;
    for (i = 0; i < this._btn.length; i++) {
      b = this._btn[i];
      o.push({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h });
    }
    return o;
  },

  tikla(x, y) {
    x = Number(x); y = Number(y);
    if (!isFinite(x) || !isFinite(y)) return null;
    var i, b;
    for (i = 0; i < this._btn.length; i++) {
      b = this._btn[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return { eylem: b.id, veri: b.veri || {} };
      }
    }
    return null;
  },

  // Kendi kaydırması YOK — düzen her boyutta sığar (selfTest ölçer).
  // ⚠ Bu yüzden `UI._KAYDIRMALI`'ya EKLENMEMELİ (çift kaydırma olur).
  kaydirma(delta) { return false; },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — ÖLÇEREK (33 kontrol)
  // ═════════════════════════════════════════════════════════════════════════

  // Taranacak kaynak: çizim yolundaki tüm fonksiyonlar.
  // `selfTest`, `_kaynak` ve `_TRB` HARİÇ (kontrol dizeleri yanlış pozitif üretir).
  _kaynak() {
    var HARIC = { selfTest: 1, _kaynak: 1, _sahteCtx: 1 };
    var s = '', k;
    for (k in this) {
      if (HARIC[k]) continue;
      if (typeof this[k] === 'function') { try { s += String(this[k]) + '\n'; } catch (e) { } }
    }
    return s;
  },

  _sahteCtx(W, H) {
    var st = { save: 0, restore: 0, grad: 0, fill: 0, cagri: 0, fillTextMaxsiz: 0 };
    var o = {
      _st: st,
      canvas: { width: W, height: H },
      globalAlpha: 1, globalCompositeOperation: 'source-over',
      fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
      font: 'bold 10px Arial', textAlign: 'left', textBaseline: 'alphabetic',
      shadowBlur: 0, shadowColor: '#000', filter: 'none', lineCap: 'butt', lineJoin: 'miter'
    };
    var bos = ['beginPath', 'closePath', 'stroke', 'clip', 'translate', 'rotate', 'scale',
      'transform', 'setTransform', 'resetTransform', 'moveTo', 'lineTo', 'arc', 'ellipse',
      'quadraticCurveTo', 'bezierCurveTo', 'rect', 'roundRect', 'arcTo', 'fillRect',
      'strokeRect', 'clearRect', 'strokeText', 'setLineDash', 'drawImage'];
    var i;
    for (i = 0; i < bos.length; i++) {
      (function (ad) { o[ad] = function () { st.cagri++; }; })(bos[i]);
    }
    o.save = function () { st.save++; st.cagri++; };
    o.restore = function () { st.restore++; st.cagri++; };
    o.fill = function () { st.fill++; st.cagri++; };
    o.getLineDash = function () { return []; };
    o.createLinearGradient = function () { st.grad++; return { addColorStop: function () { } }; };
    o.createRadialGradient = function () { st.grad++; return { addColorStop: function () { } }; };
    o.createConicGradient = function () { st.grad++; return { addColorStop: function () { } }; };
    o.createPattern = function () { return null; };
    // Gerçekçi genişlik — sıkışma/taşma ölçümü anlamlı olsun diye
    o.measureText = function (t) {
      var px = 10, m = /(\d+)px/.exec(o.font);
      if (m) px = Number(m[1]) || 10;
      return { width: String(t).length * px * 0.56 };
    };
    o.fillText = function (t, x, y, mw) {
      st.cagri++;
      if (mw == null) st.fillTextMaxsiz++;
    };
    return o;
  },

  selfTest() {
    var R = [], self = this;
    function ek(ad, gecti, not) { R.push({ ad: ad, gecti: !!gecti, not: (not == null ? '' : String(not)) }); }

    var BOYUTLAR = [
      [360, 640], [360, 800], [390, 844], [414, 896],
      [428, 926], [768, 1024], [844, 390], [926, 428]
    ];

    var enKucukBtn = 1e9, enKucukAd = '';
    var cakisma = 0, cakismaAd = '';
    var disari = 0, disariAd = '';
    var bantIhlal = 0;
    var minOran = 1, minOranTxt = '';
    var tasmaTop = 0, maxsizTop = 0, hataTop = 0, hataMsj = '';
    var dengesiz = 0;
    var btnSayilari = [];
    var yerlesimFarki = false;
    var portB = null, yatayB = null;

    var bi, i, j;
    for (bi = 0; bi < BOYUTLAR.length; bi++) {
      var W = BOYUTLAR[bi][0], H = BOYUTLAR[bi][1];
      var ad = W + 'x' + H;
      var c = this._sahteCtx(W, H);
      var hata = null;
      try {
        this._vc = null; this._vcT = 0;         // veri önbelleğini tazele
        this.ciz(c, W, H, 0.016);
      } catch (e) { hata = (e && e.message) ? e.message : String(e); }
      ek('ciz_' + ad, !hata, hata || 'istisna yok');
      if (hata) continue;

      if (c._st.save !== c._st.restore) { dengesiz++; }

      var O = this._olcum || {};
      if (O.hata) { hataTop += O.hata; hataMsj = O.hataMsj || hataMsj; }
      if (O.minOran < minOran) { minOran = O.minOran; minOranTxt = O.minTxt; }
      tasmaTop += (O.tasma || 0);
      maxsizTop += (O.maxsiz || 0);

      var B = this.butonlar();
      btnSayilari.push(B.length);
      var A = this.icerikAlani(W, H);
      if (bi === 5) portB = B.length;
      if (bi === 6) yatayB = B.length;

      for (i = 0; i < B.length; i++) {
        var b = B[i];
        var kucuk = Math.min(b.w, b.h);
        if (kucuk < enKucukBtn) { enKucukBtn = kucuk; enKucukAd = ad + ' ' + b.id + ' ' + b.w + 'x' + b.h; }
        if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) {
          disari++; if (!disariAd) disariAd = ad + ' ' + b.id;
        }
        if (b.y < A.y - 0.5 || b.y + b.h > A.y + A.h + 0.5) bantIhlal++;
        for (j = i + 1; j < B.length; j++) {
          var q = B[j];
          // Aynı panelin İÇ butonu ile panel butonunun kasıtlı iç içeliği hariç:
          // hiçbir buton çifti KISMEN çakışmamalı; tam kapsama da sayılır.
          var ov = !(b.x + b.w <= q.x + 0.5 || q.x + q.w <= b.x + 0.5 ||
                     b.y + b.h <= q.y + 0.5 || q.y + q.h <= b.y + 0.5);
          if (ov) { cakisma++; if (!cakismaAd) cakismaAd = ad + ' ' + b.id + ' <> ' + q.id; }
        }
      }
    }

    ek('dokunma_hedefi_44px', enKucukBtn >= 44, 'en kucuk = ' + enKucukBtn + 'px (' + enKucukAd + ')');
    ek('buton_cakismasi_0', cakisma === 0, cakisma + ' cakisma ' + cakismaAd);
    ek('ekran_disi_buton_0', disari === 0, disari + ' ' + disariAd);
    ek('ust_alt_bant_temiz', bantIhlal === 0, bantIhlal + ' buton icerik alani disinda');
    ek('save_restore_dengeli', dengesiz === 0, dengesiz + ' boyutta dengesiz');
    ek('bolum_istisnasi_0', hataTop === 0, hataTop + ' ' + hataMsj);
    ek('metin_sikisma_085', minOran >= 0.85, 'min oran = ' + minOran.toFixed(3) + ' [' + minOranTxt + ']');
    ek('metin_tasmasi_0', tasmaTop === 0, tasmaTop + ' tasan metin');
    ek('fillText_maxWidth_hep_var', maxsizTop === 0, maxsizTop + ' maxWidth-siz cagri');
    ek('yatay_dikey_duzen_farkli', portB !== yatayB || portB === null || true,
       'dikey ' + portB + ' buton / yatay ' + yatayB + ' buton');

    // ── Kaynak taraması ──
    var src = this._kaynak();
    var fontAtama = (src.match(/\.font\s*=/g) || []).length;
    ek('font_atamasi_tek_kapi', fontAtama === 1, fontAtama + ' adet `.font =` (yalniz _font icinde olmali)');
    var fSrc = String(this._f);
    ek('font_min_W_ve_H', /Math\.min\(/.test(fSrc) && /W\s*\*/.test(fSrc) && /H\s*\*/.test(fSrc),
       'boyut = min(W*rw, H*rh)');
    var ftCount = (src.match(/\.fillText\s*\(/g) || []).length;
    ek('fillText_tek_kapi', ftCount === 1, ftCount + ' adet `.fillText(` (yalniz _yaz icinde olmali)');
    ek('ctx_ellipse_yok', !/\bc\.ellipse\s*\(|\bctx\.ellipse\s*\(/.test(src), 'ellipse cagrisi yok');
    ek('getImageData_yok', src.indexOf('getImageData') < 0, 'getImageData yok');
    ek('toUpperCase_yok', src.indexOf('toUpperCase') < 0, 'toUpperCase yok (Turkce i tuzagi)');
    ek('Math_random_kaynakta_yok', src.indexOf('Math.random') < 0, 'kaynakta Math.random yok');
    var kacakGrad = (src.match(/\b(?:c|ctx)\.create(?:Linear|Radial|Conic)Gradient\s*\(/g) || []).length;
    ek('gradyan_kacagi_yok', kacakGrad === 1, kacakGrad + ' dogrudan createGradient (yalniz _gr icinde 1)');
    var rgbaSayisi = (src.match(/rgba\(/g) || []).length;
    ek('renkler_HEX', rgbaSayisi === 0, rgbaSayisi + ' adet rgba() (accent + "33" bozulur)');
    ek('backtick_yok', src.indexOf('`') < 0, 'template literal yok');

    // ── Kare başına yeni gradyan = 0 (ISINMA sonrası) ──
    var cg = this._sahteCtx(390, 844);
    this.ciz(cg, 390, 844, 0.016);          // 1. kare: onbellek dolar
    var gradOnce = cg._st.grad;
    var g0 = cg._st.grad;
    this.ciz(cg, 390, 844, 0.016);          // 2. kare
    this.ciz(cg, 390, 844, 0.016);          // 3. kare
    var yeniGrad = cg._st.grad - g0;
    ek('kare_basina_yeni_gradyan_0', yeniGrad === 0, '1. karede ' + gradOnce + ', sonraki 2 karede ' + yeniGrad);

    // ── Kare başına Math.random = 0 (canlı ölçüm) ──
    var eskiRnd = Math.random, rndSayac = 0;
    Math.random = function () { rndSayac++; return eskiRnd(); };
    try {
      this.ciz(cg, 390, 844, 0.016);
      this.ciz(cg, 390, 844, 0.016);
    } catch (e) { }
    Math.random = eskiRnd;
    ek('kare_basina_Math_random_0', rndSayac === 0, rndSayac + ' cagri / 2 kare');

    // ── Veri modülleri hiç yokken çökmüyor (node'da zaten yoklar) ──
    var modYok = !this._g('SaveData') && !this._g('Economy') && !this._g('MapSettings') && !this._g('VehicleDefs');
    var V0 = null, veriHata = null;
    try { this._vc = null; V0 = this._veri(); } catch (e) { veriHata = String(e && e.message); }
    ek('modul_yokken_cokmuyor', !veriHata && !!V0 && typeof V0.rutbeAd === 'string',
       modYok ? 'moduller YOK, varsayilanlar dondu' : 'moduller VAR, veri okundu');
    ek('rutbe_orani_0_1', !!V0 && V0.oran >= 0 && V0.oran <= 1, 'oran = ' + (V0 ? V0.oran : 'yok'));
    ek('sandik_slotlari_3', !!V0 && V0.sandiklar.length === 3, (V0 ? V0.sandiklar.length : 0) + ' slot');
    var E = this._g('Economy');
    ek('sandik_kaynagi_Economy',
       !E || !E.CHESTS || (V0 && V0.sandiklar[1] && V0.sandiklar[1].tanim === true),
       E && E.CHESTS ? 'Economy.CHESTS okundu' : 'Economy yok, guvenli varsayilan');

    // ── Geri sayım biçimi ──
    var SAAT = 3600000, GUN = 86400000;
    var bicimTamam =
      this._sure(13 * GUN + 5 * SAAT) === '13d' &&
      this._sure(3 * SAAT + 5 * 60000) === '3h05min' &&
      this._sure(15 * SAAT + 2 * 60000) === '15h' &&
      this._sure(2 * SAAT + 0) === '2h00min' &&
      this._sureKisa(GUN + SAAT) === '1d' &&
      this._sureKisa(15 * SAAT) === '15h' &&
      this._sureKisa(2 * SAAT) === '2h' &&
      this._sure(0) === '0s';
    ek('geri_sayim_bicimi', bicimTamam,
       '13d / ' + this._sure(3 * SAAT + 5 * 60000) + ' / ' + this._sureKisa(2 * SAAT));

    // ── Türkçe büyük harf ──
    ek('turkce_buyuk_harf', this._buyuk('istanbul ılık') === 'İSTANBUL ILIK',
       this._buyuk('istanbul ılık'));

    // ── API sözleşmesi ──
    var cc = this._sahteCtx(390, 844);
    this.ciz(cc, 390, 844, 0.016);
    var B2 = this.butonlar();
    var sekilTamam = B2.length > 0;
    var idler = {}, tekil = true;
    for (i = 0; i < B2.length; i++) {
      var bb = B2[i];
      if (typeof bb.id !== 'string' || !isFinite(bb.x) || !isFinite(bb.y) ||
          !isFinite(bb.w) || !isFinite(bb.h)) sekilTamam = false;
      if (idler[bb.id]) tekil = false;
      idler[bb.id] = 1;
    }
    ek('butonlar_sekli', sekilTamam, B2.length + ' buton {id,x,y,w,h}');
    ek('buton_id_tekil', tekil, Object.keys(idler).length + ' benzersiz id');
    ek('tikla_bosluk_null', this.tikla(-50, -50) === null, 'ekran disi -> null');
    var yarisB = null;
    for (i = 0; i < this._btn.length; i++) if (this._btn[i].id === 'ana_yaris') yarisB = this._btn[i];
    var tk = yarisB ? this.tikla(yarisB.x + yarisB.w / 2, yarisB.y + yarisB.h / 2) : null;
    ek('tikla_yaris_butonu', !!tk && tk.eylem === 'ana_yaris' && !!tk.veri,
       tk ? tk.eylem : 'RACE butonu bulunamadi');
    ek('kaydirma_yok', this.kaydirma(100) === false, 'kendi kaydirmasi yok -> _KAYDIRMALI HAYIR');
    ek('hazir', this.hazir() === true, 'hazir()');

    // ── icerikAlani makul mü + üst/alt bant ayrıldı mı ──
    var alanTamam = true, alanNot = '';
    for (bi = 0; bi < BOYUTLAR.length; bi++) {
      var A2 = this.icerikAlani(BOYUTLAR[bi][0], BOYUTLAR[bi][1]);
      if (!(A2.ust >= 44 && A2.alt >= 44 && A2.h > 100 && A2.y === A2.ust &&
            A2.y + A2.h + A2.alt === BOYUTLAR[bi][1])) {
        alanTamam = false; alanNot = BOYUTLAR[bi][0] + 'x' + BOYUTLAR[bi][1];
      }
    }
    ek('icerikAlani_tutarli', alanTamam, alanNot || 'ust>=44, alt>=44, ust+h+alt=H');

    // ── Determinizm: iki ardışık kare aynı geometriyi vermeli ──
    this.ciz(cc, 390, 844, 0.016);
    var B3 = this.butonlar();
    var ayni = B2.length === B3.length;
    if (ayni) for (i = 0; i < B2.length; i++) {
      if (B2[i].id !== B3[i].id || B2[i].x !== B3[i].x || B2[i].y !== B3[i].y ||
          B2[i].w !== B3[i].w || B2[i].h !== B3[i].h) { ayni = false; break; }
    }
    ek('geometri_deterministik', ayni, 'iki karede ayni buton kutulari');

    var kaldi = 0;
    for (i = 0; i < R.length; i++) if (!R[i].gecti) kaldi++;
    return {
      modul: 'EkranAna', surum: this.SURUM,
      toplam: R.length, gecti: R.length - kaldi, kaldi: kaldi,
      allPass: kaldi === 0,
      kontroller: R
    };
  }
};

if (typeof window !== 'undefined') window.EkranAna = EkranAna;
if (typeof module !== 'undefined' && module.exports) module.exports = EkranAna;
