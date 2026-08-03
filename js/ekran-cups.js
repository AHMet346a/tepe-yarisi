'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ekran-cups.js — KUPA LİSTESİ + YARIŞ LOBİSİ (HCR2 referans düzeni)
   ---------------------------------------------------------------------------
   Referanslar (garaj parçaları/):
     · "...145045.png" → KUPA LİSTESİ: kare kupa kartları ızgarası (2 sıra × 3),
       her kartta harita önizlemesi + damalı bayrak + saat kapsülü (sağ üst) +
       ad kapsülü (alt).
     · "...145004.png" → YARIŞ LOBİSİ: üstte ipucu kapsülü · ortada büyük rütbe
       rozeti · sağda "WIN RACES: 0/10" + sandık ödülü · altta seçili kupa kartı
       + 3 rakip yuvası ("empty") + büyük RACE butonu.
     · "...145027.png" → CUPS sekmesi: kupa kartı + "3 STAGES" + RACE.

   DIŞA VERİLEN API (ana oturum bunu bağlar):
     EkranCups.EKRANLAR             -> ['cups','yarisLobi']
     EkranCups.ciz(ctx, W, H, ekran, dt)
     EkranCups.tikla(x, y, ekran)   -> {eylem, veri} | null
     EkranCups.butonlar(ekran)      -> [{id,x,y,w,h,veri}]
     EkranCups.kaydirma(ekran, delta) -> true/false
     EkranCups.hazir()
     EkranCups.selfTest()

   ⚠ ÜST SEKME ŞERİDİ ve ALT NAVİGASYON bu dosyanın işi DEĞİL — `icerikAlani()`
     o iki bandı dışarıda bırakır, oraya hiçbir şey çizilmez ve buton konmaz.

   ═══ VERİ KAYNAKLARI — UYDURMA KUPA LİSTESİ YOK ═══════════════════════════
   Kupa katalogu üç GERÇEK kaynağın birleşimidir:
     1. `js/game.js` `TOURNAMENT_SYSTEM.TOURNAMENTS` — 6 kademe: `label`, `icon`,
        `unlockReq` (0/300/2000/6000/15000/40000), `rewards.coins/gems`.
        (Bu obje game.js'in tepe kapsamında `const` → bare global.)
     2. `js/main.js:1682` `mapSets` — `cup_play_<i>` eyleminin GERÇEKTEN
        başlattığı 6 harita üçlüsü. Canlı davranış budur, kopyası aşağıda.
        ⚠ `ui.js drawCup` YALNIZ 4 kupa çiziyordu; main.js 6 set tutuyordu →
        5. ve 6. set ULAŞILAMAZDI. Bu ekran altısını da açar.
     3. `js/mapsettings.js` `MAPS_META` — her haritanın emoji + tema rengi +
        Türkçe adı (harita önizlemesi KODLA çizilir, PNG yok).
   Kilit ölçütü: en iyi mesafe (`SaveData.data.highScores` maksimumu) >= unlockReq.
   Aşama ilerlemesi: `SaveData.data.botBest[harita] = {won,totalRaces}` (GERÇEK).
   Rütbe: `SaveData.getRankInfo()` / `getRankProgress()` / `_rankThresholds`.
   Galibiyet sayacı: `SaveData.get('botWins')` (achievements.js:1018'in yazdığı alan).
   Rakip yuvaları: `NPCSystem.NPC_PROFILES` + `BaglaRakip.AYAR.NPC_TABAN`.
     🔴 LOBİ NPC DOĞURMAZ. `bagla-rakip.js` NPC'leri yalnız yarış modunda
        doğurur (`_yarisMi`: `gameMode==='race'` ya da `botRaceMode`) — bu
        BİLİNÇLİ bir perf düzeltmesi. Burada yalnız KAÇ rakip doğacağı ve hangi
        profillerin seçileceği AYNI FORMÜLLE hesaplanıp GÖSTERİLİR.

   🔴 PROJE KURALLARI (hepsi selfTest ile kilitli):
     · `ctx.font` YALNIZ `_font()` içinde atanır; boyut min(W-tabanlı, H-tabanlı).
     · `ctx.fillText` YALNIZ `_yaz()` içinde; her çağrıda maxWidth verilir,
       sıkışma 0.85 altına düşerse önce font küçültülür, sonra "…" ile kesilir.
     · Gradyanlar `_gr()` ile ÖNBELLEKLİ — kare başına yeni gradyan 0.
       (Izgara KAYDIRILIRKEN de 0: kartlar `translate(0,-kay)` içinde ÇİZİLİR,
        gradyan koordinatları sabit kalır. Buton kutuları kaydırılmış hâlde.)
     · `ctx.ellipse` YOK (save + scale + arc + restore), `getImageData` YOK.
     · `Math.random` YOK — animasyon `dt` birikimli, geri sayım `Date.now()`.
     · `toUpperCase()` YOK. Türkçe metin `_buyuk()`, İNGİLİZCE veri `_buyukAscii()`.
       🔴 `_buyuk` İngilizceye uygulanırsa "Wheelie Boost" → "WHEELİE BOOST" olur
          (U2'nin PNG'de yakalanan hatası). Kupa/rakip adları İngilizce veridir.
     · Renkler HEX (accent + '33' alfa eklemesi bozulmasın).
     · Bare global'ler `typeof X !== 'undefined'` ile okunur (`window.X` YOK).
     · Kaydırılan ızgarada HITBOX KIRPMA şart (`_kirp`).
   ═══════════════════════════════════════════════════════════════════════════ */

const EkranCups = {
  SURUM: '1.0',

  EKRANLAR: ['cups', 'yarisLobi'],

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
    mor:    '#a97bff',
    kilit:  '#5b6982'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KUPA KATALOGU — kaynak: main.js `mapSets` + game.js TOURNAMENT_SYSTEM
  // ═════════════════════════════════════════════════════════════════════════

  // js/main.js:1682 `mapSets` BİREBİR kopyası (cup_play_<i>'nin başlattığı setler)
  KUPA_HARITA: [
    ['countryside', 'desert', 'beach'],
    ['winter', 'mountains', 'city'],
    ['arctic', 'jungle', 'mars'],
    ['cave', 'highland', 'swamp'],
    ['volcano', 'underwater', 'moon'],
    ['neon_city', 'wasteland', 'canyon']
  ],

  // TOURNAMENT_SYSTEM.TOURNAMENTS anahtar sırası (unlockReq ARTAN)
  KUPA_SIRA: ['beginner', 'amateur', 'pro', 'elite', 'master', 'world_champion'],

  // Kupa vurgu renkleri.
  //  · İlk 4 renk `js/ui.js` `drawCup` cups[] dizisinden BİREBİR alındı.
  //  · 5. ve 6. renk `SaveData._rankThresholds` paletinden (ELMAS / EFSANE).
  //    ⚠ Bu ikisi TÜRETİLMİŞTİR (ui.js yalnız 4 kupa çiziyordu) — tek "veri
  //      dışı" seçim burasıdır ve yalnız RENKTİR, oynanışı etkilemez.
  KUPA_RENK: ['#cd7f32', '#b0b8c8', '#ffd700', '#ff3d00', '#00ccff', '#ff00ff'],

  // TOURNAMENT_SYSTEM yoksa kullanılacak yedek (ui.js drawCup adları + main.js seti)
  KUPA_YEDEK: [
    { ad: 'Bronze Cup',   ikon: '🏁', esik: 0,     altin: 500,   elmas: 0 },
    { ad: 'Silver Cup',   ikon: '🥉', esik: 300,   altin: 1500,  elmas: 0 },
    { ad: 'Gold Cup',     ikon: '🥈', esik: 2000,  altin: 5000,  elmas: 0 },
    { ad: 'Legend Cup',   ikon: '🥇', esik: 6000,  altin: 15000, elmas: 0 },
    { ad: 'Master Class', ikon: '🏆', esik: 15000, altin: 30000, elmas: 0 },
    { ad: 'World Championship', ikon: '👑', esik: 40000, altin: 50000, elmas: 0 }
  ],

  HEDEF_GALIBIYET: 10,     // referans "WIN RACES: 0/10"
  ODUL_SANDIK: 'silver',   // Economy.CHESTS anahtarı (10 galibiyet ödülü)

  // ── Durum ────────────────────────────────────────────────────────────────
  _btnE: { cups: [], yarisLobi: [] },
  _btn: [],
  _t: 0,
  _px: 12,
  _grC: {},
  _grCtx: null,
  _grBoyut: '',
  _olcum: null,
  _secili: '',
  _kay: 0,
  _maxKay: 0,
  _vc: null,
  _vcT: 0,

  _TRB: { 'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç' },

  // ═════════════════════════════════════════════════════════════════════════
  // TEMEL YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  hazir() { return true; },

  // İKİ AŞAMALI global okuma.
  //  1) BARE isim — `Game/UI/Terrain/...` `window`'da DEĞİLDİR (CLAUDE.md tuzağı).
  //  2) `window[ad]` — 🔴 `js/mapsettings.js` modülü YALNIZ `window.MapSettings=`
  //     ile açar. Tarayıcıda ikisi de çalışır ama sahte-DOM kabuklarında (kanıt
  //     betiği, node) `window` AYRI bir nesnedir → bare isim BULUNAMAZ.
  //     Bu yüzden 6 kupanın harita önizlemesi de emojisi de AYNI çıkıyordu
  //     (hepsi countryside yedeği #8bc34a). PNG kanıtında yakalandı; doğrulayıcı
  //     göremezdi çünkü node'da zaten "modül yok" dalı bekleniyordu.
  _g(ad) {
    var v = null;
    try {
      switch (ad) {
        case 'SaveData':    v = (typeof SaveData    !== 'undefined') ? SaveData    : null; break;
        case 'Economy':     v = (typeof Economy     !== 'undefined') ? Economy     : null; break;
        case 'MapSettings': v = (typeof MapSettings !== 'undefined') ? MapSettings : null; break;
        case 'VehicleDefs': v = (typeof VehicleDefs !== 'undefined') ? VehicleDefs : null; break;
        case 'UI':          v = (typeof UI          !== 'undefined') ? UI          : null; break;
        case 'NPCSystem':   v = (typeof NPCSystem   !== 'undefined') ? NPCSystem   : null; break;
        case 'BaglaRakip':  v = (typeof BaglaRakip  !== 'undefined') ? BaglaRakip  : null; break;
        case 'Kalite':      v = (typeof Kalite      !== 'undefined') ? Kalite      : null; break;
        case 'TOURNAMENT_SYSTEM':
          v = (typeof TOURNAMENT_SYSTEM !== 'undefined') ? TOURNAMENT_SYSTEM : null; break;
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

  // 🔴 İNGİLİZCE veri için AYRI büyük harf (kupa adları, NPC profil adları).
  //   `_buyuk` Türkçe kuralı uygular ve "Elite Series" -> "ELİTE SERİES" yapar.
  _buyukAscii(metin) {
    var s = String(metin == null ? '' : metin), o = '', i, k;
    for (i = 0; i < s.length; i++) {
      k = s.charCodeAt(i);
      o += (k >= 97 && k <= 122) ? String.fromCharCode(k - 32) : s.charAt(i);
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

  _kisaSayi(n) {
    n = Math.floor(Number(n) || 0);
    if (n >= 1000000) return (Math.round(n / 100000) / 10) + 'M';
    if (n >= 10000)   return Math.round(n / 1000) + 'K';
    return this._sayi(n);
  },

  // Kısa geri sayım — referanstaki saat kapsülü "20h / 1d / 44min"
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

  // Damalı bayrak — referans kartlarındaki köşe bayrağı (kodla çizilir)
  _bayrak(c, x, y, w, h, kare) {
    var i, j, sx, sy;
    kare = Math.max(3, Math.round(kare || Math.min(w, h) / 4));
    c.save();
    this._rr(c, x, y, w, h, 3); c.clip();
    c.fillStyle = '#f2f5fa'; c.fillRect(x, y, w, h);
    c.fillStyle = '#141a26';
    for (j = 0; j * kare < h; j++) {
      for (i = 0; i * kare < w; i++) {
        if (((i + j) & 1) === 0) continue;
        sx = x + i * kare; sy = y + j * kare;
        c.fillRect(sx, sy, Math.min(kare, x + w - sx), Math.min(kare, y + h - sy));
      }
    }
    c.restore();
    c.strokeStyle = '#0e1320'; c.lineWidth = 1;
    this._rr(c, x, y, w, h, 3); c.stroke();
  },

  _buton(id, x, y, w, h, veri) {
    var b = { id: id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    if (veri) b.veri = veri;
    this._btn.push(b);
    return b;
  },

  // 🔴 KAYDIRILAN IZGARADA HITBOX KIRPMA (29 Tmz madde 2 — garajda gerçek bug)
  //   Çizim `clip()` ile kırpılıyorsa hitbox da kırpılmalı; görünen yüksekliği
  //   44 px'in altına düşen buton LİSTEDEN ATILIR (yanlış tıklama olmasın).
  _kirp(bas, ust, alt) {
    var kalan = [], i, b, y0, y1;
    for (i = 0; i < this._btn.length; i++) {
      b = this._btn[i];
      if (i < bas) { kalan.push(b); continue; }
      y0 = Math.max(b.y, ust);
      y1 = Math.min(b.y + b.h, alt);
      if (y1 - y0 < 44) continue;
      b.y = Math.round(y0); b.h = Math.round(y1 - y0);
      kalan.push(b);
    }
    this._btn = kalan;
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

  _duzenCups(W, H) {
    var A = this.icerikAlani(W, H);
    var pad = 8, g = 8;
    var basH = Math.round(Math.max(24, Math.min(42, A.h * 0.075)));
    var gx = A.x + pad;
    var gw = Math.max(80, A.w - pad * 2);
    var gy = A.y + basH + 4;
    var gh = Math.max(60, (A.y + A.h - pad) - gy);
    // 🔴 Kaydırma rayı için 6 px AYRILIR. Ayrılmazsa yatayda (844x390, 4 sütun)
    //   ray 4. kartın ÜSTÜNE biniyordu — PNG kanıtında görüldü.
    var kgw = Math.max(60, gw - 6);
    // Sütun sayısı: kart ~190 px hedeflenir; dar ekranda 2, tablet/yatayda 3-4.
    var sut = Math.max(2, Math.min(4, Math.floor(kgw / 190)));
    var kw = Math.floor((kgw - (sut - 1) * g) / sut);
    var n = this.KUPA_HARITA.length;
    var satir = Math.ceil(n / sut);
    // Kart yüksekliği: taban kw*0.82; boş yer varsa KARE'ye kadar büyür
    // (referans "kare kupa kartları"). Kalan boşluk dikeyde ORTALANIR —
    // ilk sürümde 96 px boşluk hep ALTTA kalıyordu (PNG kanıtı).
    var kh = Math.max(84, Math.round(kw * 0.82));
    // Boş yer varsa kart BÜYÜR (tavan kw*1.45). Tavansız bırakırsak tablet
    // dikeyde 340 px ölü boşluk kalıyordu; çok düşük tavanla da 110 px (PNG).
    var sig = Math.floor((gh + g) / satir) - g;
    if (sig > kh) kh = Math.min(sig, Math.round(kw * 1.45));
    var icerikH = satir * (kh + g) - g;
    var ofsY = (icerikH < gh) ? Math.floor((gh - icerikH) / 2) : 0;
    return {
      A: A, W: W, H: H, yatay: W > H, pad: pad, g: g, basH: basH,
      gx: gx, gy: gy, gw: gw, gh: gh, kgw: kgw, sut: sut, kw: kw, kh: kh,
      satir: satir, icerikH: icerikH, ofsY: ofsY,
      maxKay: Math.max(0, icerikH - gh)
    };
  },

  _duzenLobi(W, H) {
    var A = this.icerikAlani(W, H);
    var pad = 8, g = 8, yatay = W > H;
    var x = A.x + pad, w = Math.max(80, A.w - pad * 2);
    var y = A.y + pad, h = Math.max(80, A.h - pad * 2);

    if (yatay) {
      // İki satır: (ipucu · rozet · galibiyet) / (kupa · yuvalar · RACE)
      var ustH = Math.max(72, Math.round((h - g) * 0.46));
      var altH = Math.max(72, h - g - ustH);
      var w1 = Math.round(w * 0.28), w3 = Math.round(w * 0.26);
      var w2 = Math.max(60, w - w1 - w3 - g * 2);
      var aw1 = Math.round(w * 0.26), aw3 = Math.round(w * 0.24);
      var aw2 = Math.max(60, w - aw1 - aw3 - g * 2);
      return {
        A: A, W: W, H: H, yatay: true, pad: pad, g: g,
        ipucu: { x: x, y: y, w: w1, h: ustH },
        rutbe: { x: x + w1 + g, y: y, w: w2, h: ustH },
        galip: { x: x + w1 + w2 + g * 2, y: y, w: w3, h: ustH },
        kupa:  { x: x, y: y + ustH + g, w: aw1, h: altH },
        yuva:  { x: x + aw1 + g, y: y + ustH + g, w: aw2, h: altH },
        race:  { x: x + aw1 + aw2 + g * 2, y: y + ustH + g, w: aw3, h: altH }
      };
    }

    // Dikey: ipucu / rütbe / galibiyet / (kupa + yuvalar) / RACE
    // 🔴 İlk sürümde kupa/yuva satırı ARTAN yeri alıyordu ve kartlar
    //   satırın ortasına oturuyordu → üstte+altta 41 px ÖLÜ BOŞLUK (PNG kanıtı).
    //   Artık satır yüksekliği KART GENİŞLİĞİNDEN türetilir, artan rütbe
    //   paneline gider (o panel dolunca güzel görünüyor).
    var h1 = Math.round(Math.max(44, Math.min(58, h * 0.07)));
    var h4 = Math.round(Math.max(52, Math.min(76, h * 0.09)));
    var kupaW = Math.max(96, Math.round(w * 0.40));
    var h5 = Math.max(96, Math.min(210, Math.round(kupaW * 1.15)));
    var kalan = Math.max(150, h - h1 - h4 - h5 - g * 3);
    var h3 = Math.round(Math.max(56, Math.min(100, kalan * 0.24)));
    var h2 = Math.max(110, kalan - h3);
    var yuvaW = Math.max(60, w - kupaW - g);
    var y1 = y, y2 = y1 + h1 + g, y3 = y2 + h2 + g, y5 = y3 + h3 + g, y4 = y5 + h5 + g;
    return {
      A: A, W: W, H: H, yatay: false, pad: pad, g: g,
      ipucu: { x: x, y: y1, w: w, h: h1 },
      rutbe: { x: x, y: y2, w: w, h: h2 },
      galip: { x: x, y: y3, w: w, h: h3 },
      kupa:  { x: x, y: y5, w: kupaW, h: h5 },
      yuva:  { x: x + kupaW + g, y: y5, w: yuvaW, h: h5 },
      race:  { x: x, y: y4, w: w, h: h4 }
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // VERİ TOPLAMA — hepsi GERÇEK modüllerden, hepsi null-güvenli
  // ═════════════════════════════════════════════════════════════════════════

  _harita(id) {
    var MS = this._g('MapSettings'), m = null;
    if (MS && typeof MS.meta === 'function') { try { m = MS.meta(id); } catch (e) { m = null; } }
    return {
      id: String(id),
      ad: (m && m.theme) ? String(m.theme) : String(id),
      emoji: (m && m.emoji) ? String(m.emoji) : '🗺️',
      renk: (m && m.col && String(m.col).charAt(0) === '#') ? String(m.col) : '#8bc34a'
    };
  },

  // En iyi mesafe — kilit ölçütü (ui.js:3246 ve ekran-ana.js ile AYNI ölçüt)
  _enIyiMesafe(S) {
    var enIyi = 0, hs, k, d;
    try {
      hs = (S && S.data) ? (S.data.highScores || {}) : {};
      for (k in hs) { d = Number(hs[k]) || 0; if (d > enIyi) enIyi = d; }
    } catch (e) { }
    return Math.floor(enIyi);
  },

  _kupalar(S, mesafe) {
    var T = this._g('TOURNAMENT_SYSTEM');
    var TT = (T && T.TOURNAMENTS) ? T.TOURNAMENTS : null;
    var bb = {};
    try { bb = (S && S.data && S.data.botBest) ? S.data.botBest : {}; } catch (e) { bb = {}; }

    var out = [], i, j;
    for (i = 0; i < this.KUPA_HARITA.length; i++) {
      var t = TT ? TT[this.KUPA_SIRA[i]] : null;
      var yed = this.KUPA_YEDEK[i];
      var haritalar = [], kazanilan = 0, oynanan = 0;
      for (j = 0; j < this.KUPA_HARITA[i].length; j++) {
        var hm = this._harita(this.KUPA_HARITA[i][j]);
        var st = bb[hm.id] || null;
        hm.kazandi = !!(st && Number(st.won) > 0);
        hm.oynadi = !!(st && Number(st.totalRaces) > 0);
        if (hm.kazandi) kazanilan++;
        if (hm.oynadi) oynanan++;
        haritalar.push(hm);
      }
      var esik = (t && isFinite(Number(t.unlockReq))) ? Math.floor(Number(t.unlockReq)) : yed.esik;
      out.push({
        id: this.KUPA_SIRA[i],
        sira: i,
        ad: (t && t.label) ? String(t.label) : yed.ad,
        ikon: (t && t.icon) ? String(t.icon) : yed.ikon,
        renk: this.KUPA_RENK[i] || '#cd7f32',
        esik: esik,
        altin: (t && t.rewards && isFinite(Number(t.rewards.coins))) ? Math.floor(Number(t.rewards.coins)) : yed.altin,
        elmas: (t && t.rewards && isFinite(Number(t.rewards.gems))) ? Math.floor(Number(t.rewards.gems)) : yed.elmas,
        arac: (t && t.rewards && t.rewards.vehicle) ? String(t.rewards.vehicle) : '',
        kaynak: t ? 'TOURNAMENT_SYSTEM' : 'yedek',
        haritalar: haritalar,
        asama: haritalar.length,
        kazanilan: kazanilan,
        oynanan: oynanan,
        kilit: mesafe < esik,
        kalan: this._geceYarisi()
      });
    }
    return out;
  },

  // Rakip yuvaları — `bagla-rakip.js` ile AYNI formül. NPC DOĞURULMAZ.
  _rakipler(kupa) {
    var NS = this._g('NPCSystem');
    var BR = this._g('BaglaRakip');
    var K = this._g('Kalite');
    var taban = (BR && BR.AYAR && isFinite(Number(BR.AYAR.NPC_TABAN))) ? Number(BR.AYAR.NPC_TABAN) : 4;
    var kal = 1;
    try {
      if (K && typeof K.ayar === 'function') {
        var v = Number(K.ayar('dekorYogunluk'));
        if (isFinite(v) && v > 0) kal = v;
      }
    } catch (e) { kal = 1; }
    var adet = Math.max(0, Math.round(taban * kal));
    var P = (NS && NS.NPC_PROFILES && NS.NPC_PROFILES.length) ? NS.NPC_PROFILES : null;
    var aday = ['jeep', 'motocross', 'rallycar', 'dunebuggy', 'monster', 'van', 'atv', 'pickup'];
    var VD = this._g('VehicleDefs');
    var out = [], i;
    for (i = 0; i < 3; i++) {
      if (i >= adet) { out.push({ dolu: false, ad: '', renk: this.C.kilit, arac: '', aracAd: '' }); continue; }
      var prof = P ? P[(i * 3 + 1) % P.length] : null;
      var vid = aday[(i + 1) % aday.length];
      var d = (VD && VD[vid]) ? VD[vid] : null;
      out.push({
        dolu: true,
        ad: prof ? String(prof.name || prof.id) : 'Rival ' + (i + 1),
        renk: (prof && prof.color && String(prof.color).charAt(0) === '#') ? String(prof.color) : this.C.turuncu,
        beceri: prof ? Math.max(0, Math.min(1, Number(prof.skill) || 0)) : 0.5,
        arac: vid,
        aracAd: d ? String(d.name || vid) : vid
      });
    }
    // Kupa zorluğu yuva rozetlerinde gösterilir (kupa sırası = zorluk kademesi)
    for (i = 0; i < out.length; i++) out[i].kademe = (kupa ? kupa.sira : 0) + 1;
    return { adet: adet, taban: taban, kalite: kal, liste: out };
  },

  // İpucu — seçili kupanın İLK haritasının GERÇEK fizik çarpanlarından türetilir
  _ipucu(kupa) {
    var MS = this._g('MapSettings');
    var hid = (kupa && kupa.haritalar && kupa.haritalar[0]) ? kupa.haritalar[0].id : 'countryside';
    var grip = 1, yer = 1, hiz = 1, dir = 1;
    try {
      if (MS && typeof MS.mult === 'function') {
        grip = Number(MS.mult(hid, 'grip'));
        yer  = Number(MS.mult(hid, 'gravity'));
        hiz  = Number(MS.mult(hid, 'max_speed'));
        dir  = Number(MS.mult(hid, 'roll_resist'));
      }
    } catch (e) { }
    if (!isFinite(grip) || grip <= 0) grip = 1;
    if (!isFinite(yer) || yer <= 0) yer = 1;
    if (!isFinite(hiz) || hiz <= 0) hiz = 1;
    if (!isFinite(dir) || dir <= 0) dir = 1;
    if (grip < 0.70) return { ikon: '❄', metin: 'Kaygan zemin — gazı yumuşak ver', olcu: 'tutuş %' + Math.round(grip * 100) };
    if (yer < 0.70)  return { ikon: '🪐', metin: 'Düşük yerçekimi — havada dengeni koru', olcu: 'yerçekimi %' + Math.round(yer * 100) };
    if (hiz > 1.30)  return { ikon: '⚡', metin: 'Yüksek hız — frene erken bas', olcu: 'hız %' + Math.round(hiz * 100) };
    if (dir > 1.30)  return { ikon: '🌿', metin: 'Ağır zemin — momentumu koru', olcu: 'direnċ %' + Math.round(dir * 100) };
    return { ikon: '🏁', metin: 'Takla ve uçuş ekstra puan kazandırır', olcu: 'denge %100' };
  },

  _veri() {
    var simdi = Date.now();
    if (this._vc && (simdi - this._vcT) < 1000) return this._vc;

    var S = this._g('SaveData');
    var E = this._g('Economy');

    var V = {
      altin: 0, elmas: 0, mesafe: 0,
      rutbeAd: 'YENİ BAŞLAYAN', rutbeRenk: this.C.alt, rutbeIkon: '✦',
      rutbeSonraki: '', hedef: 0, oran: 0,
      galibiyet: 0, galipHedef: this.HEDEF_GALIBIYET, galipOran: 0,
      sandik: { id: this.ODUL_SANDIK, ad: 'SANDIK', altinAlt: 0, altinUst: 0 },
      kupalar: [], secili: null, seciliIdx: 0,
      rakip: { adet: 0, taban: 4, kalite: 1, liste: [] },
      ipucu: { ikon: '🏁', metin: '', olcu: '' },
      arac: 'jeep', aracAd: 'Jeep'
    };

    try {
      if (S && S.data) {
        V.altin = Math.max(0, Math.floor(S.data.gold || 0));
        V.elmas = Math.max(0, Math.floor(S.data.diamonds || 0));
        V.arac = String(S.data.selectedVehicle || 'jeep');
      }
    } catch (e) { }
    try {
      var VD = this._g('VehicleDefs');
      V.aracAd = (VD && VD[V.arac] && VD[V.arac].name) ? String(VD[V.arac].name) : V.arac;
    } catch (e) { }

    // ── RÜTBE (SaveData._rankThresholds — gerçek sistem) ──
    V.mesafe = this._enIyiMesafe(S);
    try {
      if (S && typeof S.getRankInfo === 'function') {
        var bilgi = S.getRankInfo(V.mesafe);
        if (bilgi) {
          V.rutbeAd = String(bilgi.name || V.rutbeAd);
          if (bilgi.color && String(bilgi.color).charAt(0) === '#') V.rutbeRenk = String(bilgi.color);
          V.rutbeIkon = String(bilgi.icon || V.rutbeIkon);
          V.hedef = (bilgi.max === Infinity) ? 0 : Math.floor(bilgi.max || 0);
        }
        var liste = S._rankThresholds || [], idx = -1, i;
        for (i = 0; i < liste.length; i++) if (liste[i] && liste[i].name === V.rutbeAd) { idx = i; break; }
        if (idx >= 0 && idx + 1 < liste.length) V.rutbeSonraki = String(liste[idx + 1].name || '');
      }
      if (S && typeof S.getRankProgress === 'function') {
        V.oran = Math.max(0, Math.min(1, Number(S.getRankProgress(V.mesafe)) || 0));
      } else if (V.hedef > 0) {
        V.oran = Math.max(0, Math.min(1, V.mesafe / V.hedef));
      }
    } catch (e) { }

    // ── GALİBİYET SAYACI (botWins — achievements.js:1018'in yazdığı alan) ──
    try {
      var w = 0;
      if (S && typeof S.get === 'function') w = Number(S.get('botWins')) || 0;
      if (!w && S && S.data) w = Number(S.data.botWins) || 0;
      V.galibiyet = Math.max(0, Math.floor(w));
    } catch (e) { }
    V.galipOran = Math.max(0, Math.min(1, (V.galibiyet % V.galipHedef) / V.galipHedef));

    // ── ÖDÜL SANDIĞI (Economy.CHESTS) ──
    try {
      var ch = (E && E.CHESTS) ? E.CHESTS[this.ODUL_SANDIK] : null;
      if (ch && ch.gold) {
        V.sandik.altinAlt = Math.floor(Number(ch.gold[0]) || 0);
        V.sandik.altinUst = Math.floor(Number(ch.gold[1]) || 0);
        V.sandik.tanim = true;
      }
      V.sandik.ad = 'GÜMÜŞ';
    } catch (e) { }

    // ── KUPALAR ──
    V.kupalar = this._kupalar(S, V.mesafe);

    // Seçili kupa: kullanıcı seçimi geçerliyse o, değilse ilk AÇIK kupa.
    var sec = null, k;
    for (k = 0; k < V.kupalar.length; k++) {
      if (V.kupalar[k].id === this._secili) { sec = V.kupalar[k]; break; }
    }
    if (!sec) {
      for (k = V.kupalar.length - 1; k >= 0; k--) if (!V.kupalar[k].kilit) sec = V.kupalar[k];
    }
    if (!sec && V.kupalar.length) sec = V.kupalar[0];
    V.secili = sec;
    V.seciliIdx = sec ? sec.sira : 0;

    // Sıradaki aşama: kazanılmamış İLK harita (hepsi kazanıldıysa 0. aşama)
    V.asamaIdx = 0;
    if (sec) {
      for (k = 0; k < sec.haritalar.length; k++) {
        if (!sec.haritalar[k].kazandi) { V.asamaIdx = k; break; }
      }
    }

    V.rakip = this._rakipler(sec);
    V.ipucu = this._ipucu(sec);

    this._vc = V; this._vcT = simdi;
    return V;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM
  // ═════════════════════════════════════════════════════════════════════════

  ciz(ctx, W, H, ekran, dt) {
    if (!ctx) return;
    W = Math.max(1, Math.round(Number(W) || 1));
    H = Math.max(1, Math.round(Number(H) || 1));
    if (this.EKRANLAR.indexOf(ekran) < 0) ekran = 'cups';

    var d = Number(dt);
    if (!isFinite(d) || d <= 0 || d > 0.5) d = 0.016;
    this._t += d;
    if (this._t > 100000) this._t -= 100000;

    this._grHazirla(ctx, W, H);
    this._olcum = { minOran: 1, minTxt: '', tasma: 0, maxsiz: 0, yaziSayisi: 0, grYeni: 0, hata: 0, hataMsj: '' };
    this._btn = [];
    this._disCizim = false;

    var V = this._veri();

    ctx.save();
    try {
      if (ekran === 'yarisLobi') this._cizLobi(ctx, W, H, V);
      else this._cizCups(ctx, W, H, V);
    } catch (e) {
      this._olcum.hata++;
      this._olcum.hataMsj = ekran + ': ' + ((e && e.message) ? e.message : String(e));
    }
    ctx.restore();

    this._btnE[ekran] = this._btn.slice();
  },

  // ── Arka plan (yalnız içerik alanı) ──────────────────────────────────────
  _cizArka(c, A, tonRenk) {
    c.save();
    c.fillStyle = this._gr(c, 'zemin', A.x, A.y, A.x, A.y + A.h,
      [[0, this.C.zemin], [0.55, '#151b2a'], [1, this.C.koyu]]);
    c.fillRect(A.x, A.y, A.w, A.h);
    c.globalAlpha = 0.10;
    c.fillStyle = this._gr(c, 'ton' + tonRenk, A.x, A.y, A.x + A.w, A.y + A.h,
      [[0, tonRenk], [1, this.C.koyu]]);
    c.fillRect(A.x, A.y, A.w, A.h);
    c.globalAlpha = 1;
    c.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // EKRAN 1 — KUPA LİSTESİ (referans 145045)
  // ═════════════════════════════════════════════════════════════════════════

  _cizCups(c, W, H, V) {
    var L = this._duzenCups(W, H);
    this._maxKay = L.maxKay;
    if (this._kay > this._maxKay) this._kay = this._maxKay;
    if (this._kay < 0) this._kay = 0;

    this._cizArka(c, L.A, (V.secili ? V.secili.renk : this.C.altin));

    // ── Başlık şeridi: "KUPALAR" + rütbe etiketi (referans "UNRANKED CUPS") ──
    c.textBaseline = 'middle';
    c.fillStyle = this.C.yazi;
    this._f(c, W, H, 0.046, 0.024, 12, 22, 'bold');
    var basY = L.A.y + L.basH / 2;
    this._yaz(c, this._buyuk('Kupalar'), L.gx, basY, L.gw * 0.52, 'left', 'bold');
    c.fillStyle = V.rutbeRenk;
    this._f(c, W, H, 0.028, 0.015, 8, 13, 'bold');
    this._yaz(c, V.rutbeIkon + ' ' + this._buyuk(V.rutbeAd), L.gx + L.gw, basY, L.gw * 0.44, 'right', 'bold');
    c.textBaseline = 'top';

    var bas = this._btn.length;

    // ── Izgara: kartlar translate(0,-kay) İÇİNDE ÇİZİLİR (gradyan önbelleği
    //    kaydırmadan ETKİLENMESİN diye). Buton kutuları kaydırılmış hâlde yazılır.
    c.save();
    c.beginPath();
    c.rect(L.gx - 2, L.gy, L.gw + 4, L.gh);
    c.clip();
    c.translate(0, -this._kay);

    var i, sut, sat, kx, ky;
    for (i = 0; i < V.kupalar.length; i++) {
      sut = i % L.sut; sat = Math.floor(i / L.sut);
      kx = L.gx + sut * (L.kw + L.g);
      ky = L.gy + L.ofsY + sat * (L.kh + L.g);
      // Görünmeyen kartı ÇİZME (perf) — ama butonu yine de kaydet, _kirp eler.
      if (ky - this._kay < L.gy + L.gh + 2 && ky + L.kh - this._kay > L.gy - 2) {
        this._kupaKart(c, W, H, V, V.kupalar[i], kx, ky, L.kw, L.kh);
      }
      this._buton('cups_sec', kx, ky - this._kay, L.kw, L.kh, {
        id: V.kupalar[i].id, sira: i, kilit: V.kupalar[i].kilit,
        esik: V.kupalar[i].esik, tamH: L.kh
      });
    }
    c.restore();

    this._kirp(bas, L.gy, L.gy + L.gh);

    // ── Kaydırma izi (yalnız gerektiğinde) ──
    if (this._maxKay > 0) {
      var izH = Math.max(28, L.gh * (L.gh / Math.max(1, L.icerikH)));
      var izY = L.gy + (L.gh - izH) * (this._kay / this._maxKay);
      c.fillStyle = this.C.cizgi;
      this._rr(c, L.gx + L.kgw + 2, L.gy, 3, L.gh, 1.5); c.fill();
      c.fillStyle = V.secili ? V.secili.renk : this.C.altin;
      this._rr(c, L.gx + L.kgw + 2, izY, 3, izH, 1.5); c.fill();
    }
  },

  // Tek kupa kartı — harita önizlemesi + bayrak + saat kapsülü + ad kapsülü
  _kupaKart(c, W, H, V, K, x, y, w, h) {
    var etH = Math.round(Math.max(20, Math.min(32, h * 0.24)));
    var onH = Math.max(24, h - etH);
    var secili = !!(V.secili && V.secili.id === K.id);

    c.save();

    // Kart gövdesi
    this._kart(c, x, y, w, h, 10, this.C.panel, this.C.panel2,
      secili ? K.renk : (K.kilit ? this.C.cizgi : K.renk + '77'));

    // ── Harita önizlemesi (KODLA çizilir; PNG yok) ──
    this._onizleme(c, W, H, K, x + 3, y + 3, w - 6, onH - 4);

    // ── Damalı bayrak (referans kartlarında sol/orta) ──
    var bw = Math.max(16, Math.round(w * 0.20)), bh = Math.round(bw * 0.62);
    this._bayrak(c, x + w - bw - 6, y + onH - bh - 6, bw, bh, Math.max(3, Math.round(bw / 4)));

    // ── Saat kapsülü (sağ üst) ──
    var kapH = Math.max(15, Math.round(h * 0.13));
    var kapW = Math.max(34, Math.round(w * 0.34));
    c.fillStyle = this.C.koyu; c.globalAlpha = 0.80;
    this._rr(c, x + w - kapW - 5, y + 5, kapW, kapH, kapH / 2); c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = K.renk + '88'; c.lineWidth = 1;
    this._rr(c, x + w - kapW - 5, y + 5, kapW, kapH, kapH / 2); c.stroke();
    c.fillStyle = this.C.yazi; c.textBaseline = 'middle';
    this._f(c, W, H, 0.022, 0.012, 7, 11, 'bold');
    this._yaz(c, '⏱ ' + this._sureKisa(K.kalan), x + w - kapW / 2 - 5, y + 5 + kapH / 2,
      kapW - 6, 'center', 'bold');

    // ── Aşama noktaları (3 STAGES) — kazanılan aşama DOLU ──
    var np = K.haritalar.length, pr = Math.max(3, Math.round(h * 0.026)), pi;
    for (pi = 0; pi < np; pi++) {
      c.fillStyle = K.haritalar[pi].kazandi ? K.renk : this.C.koyu;
      c.beginPath();
      c.arc(x + 9 + pr + pi * (pr * 2 + 4), y + onH - pr - 7, pr, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = K.renk + 'aa'; c.lineWidth = 1; c.stroke();
    }

    // ── Ad kapsülü (referans: alt kenarda, kupa renginde) ──
    var eY = y + h - etH - 2;
    c.fillStyle = this._gr(c, 'et' + K.renk, x, eY, x, eY + etH,
      [[0, K.renk], [1, this.C.koyu]]);
    this._rr(c, x + 4, eY, w - 8, etH, 7); c.fill();
    c.strokeStyle = '#0e1320'; c.lineWidth = 1;
    this._rr(c, x + 4, eY, w - 8, etH, 7); c.stroke();
    c.fillStyle = '#0e1320';
    this._f(c, W, H, 0.030, 0.016, 8, 15, 'bold');
    // 🔴 Kupa adları İNGİLİZCE veridir -> _buyukAscii (Türkçe i->İ tuzağı)
    this._yaz(c, this._buyukAscii(K.ad), x + w / 2, eY + etH / 2, w - 16, 'center', 'bold');

    // ── Kilit örtüsü ──
    if (K.kilit) {
      c.globalAlpha = 0.62; c.fillStyle = this.C.koyu;
      this._rr(c, x, y, w, h, 10); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = this.C.yazi;
      this._f(c, W, H, 0.070, 0.036, 16, 30, 'bold');
      this._yaz(c, '🔒', x + w / 2, y + onH * 0.44, w - 20, 'center', 'bold');
      c.fillStyle = this.C.altin;
      this._f(c, W, H, 0.026, 0.014, 8, 12, 'bold');
      this._yaz(c, this._sayi(K.esik) + ' m', x + w / 2, y + onH * 0.78, w - 16, 'center', 'bold');
    } else if (secili) {
      c.strokeStyle = K.renk; c.lineWidth = 2.5;
      this._rr(c, x + 1, y + 1, w - 2, h - 2, 10); c.stroke();
    }

    c.textBaseline = 'top';
    c.restore();
  },

  // Harita önizlemesi — tema rengi + tepeler + emoji (deterministik, Math.random YOK)
  _onizleme(c, W, H, K, x, y, w, h) {
    if (w < 8 || h < 8) return;
    var H0 = K.haritalar[0] || { renk: '#8bc34a', emoji: '🗺️' };
    var renk = H0.renk;
    c.save();
    this._rr(c, x, y, w, h, 7); c.clip();

    c.fillStyle = this._gr(c, 'gok' + renk, x, y, x, y + h,
      [[0, '#26304a'], [0.55, renk], [1, this.C.koyu]]);
    c.fillRect(x, y, w, h);

    // Tepeler — kupa kimliğinden türeyen SABİT faz (her karede aynı)
    var tohum = this._hash(K.id + H0.id);
    var kat, i, adim = Math.max(4, Math.floor(w / 22));
    for (kat = 0; kat < 3; kat++) {
      var faz = ((tohum >>> (kat * 7)) & 255) / 255 * Math.PI * 2;
      var frk = 1.1 + kat * 0.9;
      var gen = h * (0.10 + kat * 0.05);
      var taban = y + h * 0.52 + (h * 0.14) * kat;
      if (taban > y + h - 3) taban = y + h - 3;
      c.globalAlpha = (kat === 2) ? 1 : (0.42 + kat * 0.22);
      c.fillStyle = (kat === 2) ? this.C.koyu : renk;
      c.beginPath();
      c.moveTo(x, y + h);
      for (i = 0; i <= w; i += adim) {
        c.lineTo(x + i, taban - gen * (0.5 + 0.5 * Math.sin(faz + (i / Math.max(1, w)) * Math.PI * 2 * frk)));
      }
      c.lineTo(x + w, taban - gen * (0.5 + 0.5 * Math.sin(faz + Math.PI * 2 * frk)));
      c.lineTo(x + w, y + h);
      c.closePath(); c.fill();
    }
    c.globalAlpha = 1;

    // 3 harita emojisi (sol üst) — GERÇEK MAPS_META verisi
    var ep = Math.max(9, Math.min(w * 0.11, h * 0.24, 28)), j;
    c.textBaseline = 'middle';
    this._font(c, ep, 'bold');
    for (j = 0; j < K.haritalar.length; j++) {
      c.fillStyle = this.C.koyu; c.globalAlpha = 0.50;
      this._rr(c, x + 4 + j * (ep + 5), y + 4, ep + 3, ep + 3, 4); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = this.C.yazi;
      this._yaz(c, K.haritalar[j].emoji, x + 4 + j * (ep + 5) + (ep + 3) / 2, y + 4 + (ep + 3) / 2,
        ep + 2, 'center', 'bold');
    }
    c.textBaseline = 'top';
    c.restore();

    c.strokeStyle = renk + '99'; c.lineWidth = 1.2;
    this._rr(c, x, y, w, h, 7); c.stroke();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // EKRAN 2 — YARIŞ LOBİSİ (referans 145004)
  // ═════════════════════════════════════════════════════════════════════════

  _cizLobi(c, W, H, V) {
    // Lobi KAYDIRILMAZ — _maxKay cups'tan kalan değerle karışmasın.
    this._maxKay = 0; this._kay = 0;
    var L = this._duzenLobi(W, H);
    var renk = V.secili ? V.secili.renk : this.C.altin;
    this._cizArka(c, L.A, renk);

    this._lobiIpucu(c, W, H, V, L.ipucu);
    this._lobiRutbe(c, W, H, V, L.rutbe);
    this._lobiGalip(c, W, H, V, L.galip);
    this._lobiKupa(c, W, H, V, L.kupa);
    this._lobiYuvalar(c, W, H, V, L.yuva, L.yatay);
    this._lobiRace(c, W, H, V, L.race);
  },

  // Üst ipucu kapsülü (referans: "Keep jumping")
  _lobiIpucu(c, W, H, V, P) {
    if (P.w < 40 || P.h < 24) return;
    this._kart(c, P.x, P.y, P.w, P.h, P.h / 2 > 14 ? 14 : P.h / 2, this.C.panel, this.C.panel2, this.C.cizgi);
    // ⚠ İkon kutusu P.h ile ölçeklenirse YATAYDA 73 px yer kaplayıp metni
    //   ortaya itiyordu (PNG kanıtı) → 26 px tavan. İki satır da DİKEYDE
    //   ORTALANIR (sabit oranla yerleştirilince alçak panelde ayrışıyorlardı).
    var ip = Math.max(14, Math.min(26, P.h * 0.55));
    c.textBaseline = 'middle';
    c.fillStyle = this.C.yazi;
    this._font(c, ip, 'bold');
    this._yaz(c, V.ipucu.ikon, P.x + 8 + ip / 2, P.y + P.h / 2, ip + 4, 'center', 'bold');
    var tx = P.x + 14 + ip, tw = Math.max(20, P.w - (tx - P.x) - 10);
    var orta = P.y + P.h / 2, ara = Math.max(9, Math.min(13, P.h * 0.14));
    c.fillStyle = this.C.yazi;
    this._f(c, W, H, 0.030, 0.016, 8, 14, 'bold');
    this._yaz(c, V.ipucu.metin, tx, orta - ara, tw, 'left', 'bold');
    c.fillStyle = this.C.alt;
    this._f(c, W, H, 0.022, 0.012, 7, 11, '600');
    this._yaz(c, V.ipucu.olcu, tx, orta + ara, tw, 'left', '600');
    c.textBaseline = 'top';
  },

  // Rütbe rozeti + ad + ilerleme (referans: ortadaki direksiyon rozeti / BRONZE I)
  _lobiRutbe(c, W, H, V, P) {
    if (P.w < 60 || P.h < 60) return;
    this._kart(c, P.x, P.y, P.w, P.h, 12, this.C.panel, this.C.panel2, V.rutbeRenk + '66');

    // 🔴 YATAY panel ALÇAKTIR (844x390'da 128 px). Dikey yığın orada ilerleme
    //   çubuğunu tamamen dışarıda bırakıyordu (PNG kanıtı) → yan yana düzen.
    var yanYana = P.w >= P.h * 1.4;
    var r, cx, cy, tx, tw, ty, hiza;
    if (yanYana) {
      // ⚠ _rozet gölge halkası r*1.06 yarıçapla çizer → pay 12 px olmalı,
      //   yoksa rozet kartın kenarından TAŞAR (PNG kanıtında görüldü).
      r = Math.max(16, Math.min((P.h - 26) / 2, P.w * 0.17));
      cx = P.x + 10 + r; cy = P.y + P.h / 2;
      tx = cx + r + 10;
      tw = Math.max(24, P.x + P.w - 10 - tx);
      ty = P.y + P.h / 2 - Math.min(P.h * 0.36, 44);
      hiza = 'left';
    } else {
      r = Math.max(18, Math.min(P.w * 0.26, P.h * 0.30));
      cx = P.x + P.w / 2;
      cy = P.y + Math.max(r + 8, (P.h - (r * 2 + 62)) / 2 + r);
      tx = P.x + 10; tw = Math.max(30, P.w - 20);
      ty = cy + r + 8;
      hiza = 'center';
    }
    this._rozet(c, cx, cy, r, V.rutbeRenk, V.rutbeIkon);
    var mx = yanYana ? tx : (tx + tw / 2);

    c.textBaseline = 'top';
    c.fillStyle = V.rutbeRenk;
    this._f(c, W, H, 0.048, 0.026, 12, 22, 'bold');
    this._yaz(c, this._buyuk(V.rutbeAd), mx, ty, tw, hiza, 'bold');
    var y2 = ty + this._px + 4;

    c.fillStyle = this.C.alt;
    this._f(c, W, H, 0.026, 0.014, 8, 12, '600');
    var alt = V.rutbeSonraki ? this._buyuk('SIRADAKİ: ' + V.rutbeSonraki) : this._buyuk('EN YÜKSEK RÜTBE');
    this._yaz(c, alt, mx, y2, tw, hiza, '600');
    var y3 = y2 + this._px + 6;

    var ch = Math.max(7, Math.min(12, P.h * 0.10));
    if (y3 + ch <= P.y + P.h - 6) {
      this._cubuk(c, tx, y3, tw, ch, V.oran, V.rutbeRenk, this.C.koyu);
      c.textBaseline = 'middle';
      c.fillStyle = this.C.yazi;
      this._f(c, W, H, 0.022, 0.012, 7, 11, 'bold');
      this._yaz(c, this._sayi(V.mesafe) + ' / ' + (V.hedef > 0 ? this._sayi(V.hedef) : '∞') + ' m',
        tx + tw / 2, y3 + ch / 2, tw - 6, 'center', 'bold');
      c.textBaseline = 'top';
    }
    this._buton('cups_rutbe', P.x, P.y, P.w, P.h, { rutbe: V.rutbeAd, mesafe: V.mesafe, oran: V.oran });
  },

  // Rütbe rozeti — daire + halka + ikon (ctx.ellipse YOK)
  _rozet(c, cx, cy, r, renk, ikon) {
    c.save();
    c.globalAlpha = 0.35; c.fillStyle = this.C.koyu;
    this._elips(c, cx, cy + r * 0.10, r * 1.06, r * 1.06);
    c.globalAlpha = 1;
    c.fillStyle = this._gr(c, 'roz' + renk, cx, cy - r, cx, cy + r, [[0, renk], [1, this.C.koyu]]);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.strokeStyle = renk; c.lineWidth = Math.max(2, r * 0.10);
    c.beginPath(); c.arc(cx, cy, r * 0.92, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = this.C.koyu; c.lineWidth = Math.max(1, r * 0.05);
    c.beginPath(); c.arc(cx, cy, r * 0.70, 0, Math.PI * 2); c.stroke();
    c.fillStyle = this.C.yazi; c.textBaseline = 'middle';
    this._font(c, Math.max(10, r * 0.86), 'bold');
    this._yaz(c, ikon, cx, cy + r * 0.03, r * 1.5, 'center', 'bold');
    c.textBaseline = 'top';
    c.restore();
  },

  // WIN RACES: n/10 + ödül sandığı (referans sağ üst)
  _lobiGalip(c, W, H, V, P) {
    if (P.w < 60 || P.h < 40) return;
    this._kart(c, P.x, P.y, P.w, P.h, 10, this.C.panel, this.C.panel2, this.C.altin + '55');
    var sw = Math.max(28, Math.min(P.w * 0.28, P.h * 0.62));
    var sx = P.x + P.w - sw - 8;
    var tw = Math.max(30, sx - P.x - 16);

    c.textBaseline = 'top';
    c.fillStyle = this.C.alt;
    this._f(c, W, H, 0.024, 0.013, 7, 11, 'bold');
    this._yaz(c, this._buyuk('Kazanılan Yarış'), P.x + 10, P.y + 7, tw, 'left', 'bold');
    c.fillStyle = this.C.yazi;
    this._f(c, W, H, 0.044, 0.024, 12, 22, 'bold');
    this._yaz(c, (V.galibiyet % V.galipHedef) + ' / ' + V.galipHedef,
      P.x + 10, P.y + 7 + 13, tw, 'left', 'bold');

    var ch = Math.max(6, Math.min(10, P.h * 0.13));
    var cy = P.y + P.h - ch - 8;
    if (cy > P.y + 26) this._cubuk(c, P.x + 10, cy, tw, ch, V.galipOran, this.C.altin, this.C.koyu);

    // Sandık ikonu
    c.fillStyle = this.C.koyu;
    this._rr(c, sx, P.y + (P.h - sw) / 2, sw, sw, 8); c.fill();
    c.strokeStyle = this.C.altin + '99'; c.lineWidth = 1.4;
    this._rr(c, sx, P.y + (P.h - sw) / 2, sw, sw, 8); c.stroke();
    c.fillStyle = this.C.altin; c.textBaseline = 'middle';
    this._font(c, Math.max(11, sw * 0.52), 'bold');
    this._yaz(c, '🎁', sx + sw / 2, P.y + P.h / 2 - sw * 0.10, sw - 4, 'center', 'bold');
    c.fillStyle = this.C.yazi;
    this._font(c, Math.max(7, sw * 0.20), 'bold');
    this._yaz(c, V.sandik.altinUst > 0 ? this._kisaSayi(V.sandik.altinUst) : V.sandik.ad,
      sx + sw / 2, P.y + P.h / 2 + sw * 0.30, sw - 4, 'center', 'bold');
    c.textBaseline = 'top';

    this._buton('cups_odul', P.x, P.y, P.w, P.h,
      { sandik: V.sandik.id, galibiyet: V.galibiyet, hedef: V.galipHedef });
  },

  // Seçili kupa kartı (referans: sol altta, "Hill Climb Cup")
  _lobiKupa(c, W, H, V, P) {
    if (!V.secili || P.w < 60 || P.h < 60) return;
    var K = V.secili;
    // Satırı DOLDUR (14 px alt etiket şeridi ayrılır) — ölü boşluk bırakma.
    var kh = Math.max(84, P.h - 14);
    var ky = P.y;
    this._kupaKart(c, W, H, V, K, P.x, ky, P.w, kh);
    // Kart butonunu _kupaKart yazmaz (yalnız cups ızgarası yazar) → burada.
    this._buton('cups_kupa', P.x, ky, P.w, kh, { id: K.id, sira: K.sira, kilit: K.kilit });

    // "3 STAGES" etiketi (referans 145027)
    if (ky + kh + 14 <= P.y + P.h) {
      c.textBaseline = 'top';
      c.fillStyle = this.C.alt;
      this._f(c, W, H, 0.024, 0.013, 7, 11, 'bold');
      // ⚠ '✓' glifi Skia/Noto zincirinde KUTU çıkıyordu (PNG kanıtı) → düz metin.
      this._yaz(c, K.asama + ' ' + this._buyuk('Aşama') + '  ·  ' +
        K.kazanilan + '/' + K.asama + ' ' + this._buyuk('kazanıldı'),
        P.x + P.w / 2, ky + kh + 3, P.w - 6, 'center', 'bold');
    }
  },

  // 3 rakip yuvası (referans: "empty" siluetleri)
  _lobiYuvalar(c, W, H, V, P, yatay) {
    if (P.w < 60 || P.h < 44) return;
    var n = 3, g = 6;
    var yw = Math.floor((P.w - (n - 1) * g) / n);
    // Kupa kartıyla AYNI yüksekliğe otur (referans 145004) — ortalama YOK.
    var yh = Math.max(60, P.h - 14);
    var yy = P.y;
    var i;
    for (i = 0; i < n; i++) {
      var R = V.rakip.liste[i] || { dolu: false };
      var x = P.x + i * (yw + g);
      this._yuva(c, W, H, R, x, yy, yw, yh);
      this._buton('cups_yuva', x, yy, yw, yh,
        { yuva: i, dolu: !!R.dolu, ad: R.ad || '', arac: R.arac || '' });
    }
  },

  _yuva(c, W, H, R, x, y, w, h) {
    var renk = R.dolu ? R.renk : this.C.kilit;
    this._kart(c, x, y, w, h, 9, this.C.panel2, this.C.koyu, renk + (R.dolu ? 'aa' : '44'));

    // Rakip aracı — mümkünse oyunun GERÇEK çizimi (UI._drawMenuCar)
    var kx = x + w * 0.10, ky = y + h * 0.14;
    var kw2 = w * 0.80, kh2 = h * 0.46;
    if (R.dolu) this._aracKutuya(c, R.arac, renk, kx, ky, kw2, kh2);
    else this._siluet(c, this.C.kilit, kx, ky, kw2, kh2, 0.35);

    c.textBaseline = 'middle';
    if (R.dolu) {
      c.fillStyle = this.C.yazi;
      this._f(c, W, H, 0.024, 0.013, 7, 12, 'bold');
      // 🔴 NPC profil adları İNGİLİZCE veridir (NPC_PROFILES) -> _buyukAscii
      this._yaz(c, this._buyukAscii(R.ad), x + w / 2, y + h * 0.76, w - 8, 'center', 'bold');
      c.fillStyle = renk;
      this._f(c, W, H, 0.020, 0.011, 6, 10, '600');
      this._yaz(c, this._buyukAscii(R.aracAd), x + w / 2, y + h * 0.90, w - 8, 'center', '600');
    } else {
      c.fillStyle = this.C.kilit;
      this._f(c, W, H, 0.026, 0.014, 7, 12, 'bold');
      this._yaz(c, this._buyuk('boş'), x + w / 2, y + h * 0.80, w - 8, 'center', 'bold');
    }
    c.textBaseline = 'top';
  },

  // Aracı VERİLEN KUTUYA sığdırır. 1. tercih: oyunun gerçek `drawVehicle`
  // çizimi (`UI._drawMenuCar`). 2. tercih: sade siluet.
  // (ekran-ana.js `_aracKutuya` ile aynı yordam — kutu DIŞINA taşmaz.)
  _aracKutuya(c, vid, renk, x, y, w, h) {
    if (w <= 2 || h <= 2) return;
    var VD = this._g('VehicleDefs');
    var def = (VD && VD[vid]) ? VD[vid] : null;
    var u = this._g('UI');
    if (def && u && typeof u._drawMenuCar === 'function') {
      var gw = (def.w ? def.w : 100), gh = (def.h ? def.h : 44);
      var wl = (def.wheels && def.wheels.length) ? def.wheels : null;
      var solX = -gw / 2, sagX = gw / 2, ustY = -gh * 1.44, altY = 0, i, wr;
      if (wl) {
        for (i = 0; i < wl.length; i++) {
          wr = wl[i].r || wl[i].radius || gh * 0.4;
          solX = Math.min(solX, (wl[i].x || 0) - wr);
          sagX = Math.max(sagX, (wl[i].x || 0) + wr);
          altY = Math.max(altY, (wl[i].y || 0) + wr);
        }
      } else { altY = gh * 0.45; }
      var bw = Math.max(1, sagX - solX), bh = Math.max(1, altY - ustY);
      var o = Math.min(w / bw, h / bh);
      if (isFinite(o) && o > 0) {
        try {
          c.save();
          this._rr(c, x, y, w, h, 4); c.clip();
          c.translate(x + w / 2 - ((solX + sagX) / 2) * o, y + h / 2 - ((ustY + altY) / 2) * o);
          // 🔴 DIŞ ÇİZİM İŞARETİ. vehicles.js drawVehicle maxWidth'siz fillText
          //   kullanır ve araç başına ~8 ÖNBELLEKSİZ gradient üretir (bagla-rakip.js
          //   bunu 39/kare olarak ölçmüştü). Bu maliyet BU MODÜLE ait değildir;
          //   selfTest onu AYRI sayar ve rakamı raporlar (yutmaz).
          this._disCizim = true;
          u._drawMenuCar(c, vid, this._t, o * gw);
          this._disCizim = false;
          c.restore();
          return;
        } catch (e) { this._disCizim = false; try { c.restore(); } catch (e2) { } }
      }
    }
    this._siluet(c, renk, x, y, w, h, 0.95);
  },

  _siluet(c, renk, x, y, w, h, alfa) {
    var sw = w * 0.82, sh = h * 0.46;
    var cx = x + w / 2, cy = y + h * 0.52;
    c.save();
    c.globalAlpha = alfa;
    c.fillStyle = renk;
    this._rr(c, cx - sw / 2, cy - sh / 2, sw, sh, sh * 0.35); c.fill();
    c.fillStyle = this.C.koyu;
    this._rr(c, cx - sw * 0.22, cy - sh * 0.95, sw * 0.46, sh * 0.62, 3); c.fill();
    c.fillStyle = '#15181f';
    var tr = Math.max(3, sh * 0.40);
    c.beginPath(); c.arc(cx - sw * 0.28, cy + sh * 0.48, tr, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(cx + sw * 0.28, cy + sh * 0.48, tr, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    c.restore();
  },

  // Büyük RACE butonu
  _lobiRace(c, W, H, V, P) {
    if (P.w < 50 || P.h < 40) return;
    var kilit = !!(V.secili && V.secili.kilit);
    var renk = kilit ? this.C.kilit : this.C.yesil;
    c.fillStyle = this._gr(c, 'race' + renk, P.x, P.y, P.x, P.y + P.h,
      [[0, '#ffffff'], [0.16, renk], [1, this.C.koyu]]);
    this._rr(c, P.x, P.y, P.w, P.h, 12); c.fill();
    c.strokeStyle = kilit ? this.C.cizgi : '#0e1320'; c.lineWidth = 2;
    this._rr(c, P.x, P.y, P.w, P.h, 12); c.stroke();

    c.textBaseline = 'middle';
    c.fillStyle = '#0e1320';
    this._f(c, W, H, 0.070, 0.038, 15, 30, 'bold');
    var etiket = kilit ? this._buyuk('Kilitli') : 'RACE';
    // ⚠ İki satır SABİT ORANLA yerleştirilirse yüksek butonda (yatay, 145 px)
    //   arada 55 px boşluk kalıyordu (PNG kanıtı) → merkeze göre yerleştir.
    var ikiSatir = (P.h >= 58 && !!V.secili);
    var orta2 = P.y + P.h / 2, ara2 = Math.max(11, Math.min(20, P.h * 0.16));
    this._yaz(c, etiket, P.x + P.w / 2, ikiSatir ? (orta2 - ara2) : orta2, P.w - 20, 'center', 'bold');

    if (ikiSatir) {
      var hm = V.secili.haritalar[V.asamaIdx] || V.secili.haritalar[0];
      c.fillStyle = '#0e1320';
      this._f(c, W, H, 0.024, 0.013, 7, 11, 'bold');
      this._yaz(c, hm.emoji + ' ' + this._buyuk(hm.ad) + '  ·  ' +
        this._buyuk('Aşama') + ' ' + (V.asamaIdx + 1) + '/' + V.secili.asama,
        P.x + P.w / 2, orta2 + ara2, P.w - 20, 'center', 'bold');
    }
    c.textBaseline = 'top';

    var hm2 = V.secili ? (V.secili.haritalar[V.asamaIdx] || V.secili.haritalar[0]) : null;
    this._buton('cups_yaris', P.x, P.y, P.w, P.h, {
      kupa: V.secili ? V.secili.id : '',
      kupaAd: V.secili ? V.secili.ad : '',
      kilit: kilit,
      esik: V.secili ? V.secili.esik : 0,
      harita: hm2 ? hm2.id : 'countryside',
      haritalar: V.secili ? V.secili.haritalar.map(function (m) { return m.id; }) : [],
      asama: V.asamaIdx,
      arac: V.arac,
      botMode: true,
      rakip: V.rakip.adet
    });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GİRDİ
  // ═════════════════════════════════════════════════════════════════════════

  butonlar(ekran) {
    if (this.EKRANLAR.indexOf(ekran) < 0) ekran = 'cups';
    return (this._btnE[ekran] || []).slice();
  },

  tikla(x, y, ekran) {
    x = Number(x); y = Number(y);
    if (!isFinite(x) || !isFinite(y)) return null;
    if (this.EKRANLAR.indexOf(ekran) < 0) ekran = 'cups';
    var L = this._btnE[ekran] || [], i, b;
    for (i = 0; i < L.length; i++) {
      b = L[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        // Kupa kartı → seçimi BURADA değiştir (lobi anında güncellensin).
        // ⚠ Kilitli kupa seçilemez (RACE butonu yanlış kupayı başlatmasın).
        if (b.id === 'cups_sec' && b.veri && b.veri.id && !b.veri.kilit) {
          this._secili = b.veri.id; this._vc = null;
        }
        return { eylem: b.id, veri: b.veri || {} };
      }
    }
    return null;
  },

  // Yalnız `cups` ızgarası kaydırılır.
  // ⚠ Kendi kaydırması OLDUĞU İÇİN `UI._KAYDIRMALI`'ya EKLENMEMELİ (çift kaydırma).
  kaydirma(ekran, delta) {
    if (ekran !== 'cups') return false;
    var d = Number(delta);
    if (!isFinite(d)) return false;
    var eski = this._kay;
    this._kay = Math.max(0, Math.min(this._maxKay, this._kay + d));
    return this._kay !== eski;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — ÖLÇEREK
  // ═════════════════════════════════════════════════════════════════════════

  _kaynak() {
    var HARIC = { selfTest: 1, _kaynak: 1, _sahteCtx: 1 };
    var s = '', k;
    for (k in this) {
      if (HARIC[k]) continue;
      if (typeof this[k] === 'function') { try { s += String(this[k]) + '\n'; } catch (e) { } }
    }
    return s;
  },

  _disCizim: false,

  _sahteCtx(W, H) {
    var M = this;
    var st = { save: 0, restore: 0, grad: 0, fill: 0, cagri: 0, clip: 0,
               fillTextMaxsiz: 0, disGrad: 0, disMaxsiz: 0 };
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
    // Dış çizim (vehicles.js drawVehicle) AYRI sayılır — bu modülün maliyeti değil.
    var gr = function () { if (M._disCizim) st.disGrad++; else st.grad++; return { addColorStop: function () { } }; };
    o.createLinearGradient = gr;
    o.createRadialGradient = gr;
    o.createConicGradient = gr;
    o.createPattern = function () { return null; };
    o.measureText = function (t) {
      var px = 10, m = /(\d+)px/.exec(o.font);
      if (m) px = Number(m[1]) || 10;
      return { width: String(t).length * px * 0.56 };
    };
    o.fillText = function (t, x, y, mw) {
      st.cagri++;
      if (mw == null) { if (M._disCizim) st.disMaxsiz++; else st.fillTextMaxsiz++; }
    };
    return o;
  },

  selfTest() {
    var R = [];
    function ek(ad, gecti, not) { R.push({ ad: ad, gecti: !!gecti, not: (not == null ? '' : String(not)) }); }

    var BOYUTLAR = [
      [360, 640], [360, 800], [390, 844], [414, 896],
      [428, 926], [768, 1024], [844, 390], [926, 428]
    ];

    // 🔴 selfTest OYUNCUNUN KAYDINI BOZMAMALI (U2'nin hatası: yedek yanlıştı ve
    //    `equippedParts` boş diziyle ezildi). Bu modül SaveData'ya HİÇ YAZMAZ,
    //    ama kanıtı ölçerek veriyoruz: kaydın tamamı önce/sonra kıyaslanır.
    var S = this._g('SaveData');
    var kayitOnce = null;
    try { kayitOnce = (S && S.data) ? JSON.stringify(S.data) : 'YOK'; } catch (e) { kayitOnce = 'HATA'; }
    var eskiSecili = this._secili, eskiKay = this._kay, eskiT = this._t;

    var enKucuk = 1e9, enKucukAd = '';
    var cakisma = 0, cakismaAd = '';
    var disari = 0, disariAd = '';
    var bantIhlal = 0, bantAd = '';
    var minOran = 1, minOranTxt = '';
    var tasma = 0, maxsiz = 0, hata = 0, hataMsj = '';
    var dengesiz = 0, dengesizAd = '';
    var disMaxsiz = 0, disGrad = 0;
    var btnSayi = {};
    var bi, ei, i, j;

    for (bi = 0; bi < BOYUTLAR.length; bi++) {
      var W = BOYUTLAR[bi][0], H = BOYUTLAR[bi][1];
      for (ei = 0; ei < this.EKRANLAR.length; ei++) {
        var ekran = this.EKRANLAR[ei];
        var ad = W + 'x' + H + '/' + ekran;
        var c = this._sahteCtx(W, H);
        var h = null;
        try {
          this._vc = null; this._vcT = 0; this._grCtx = null; this._kay = 0;
          this.ciz(c, W, H, ekran, 0.016);
        } catch (e) { h = (e && e.message) ? e.message : String(e); }
        ek('ciz_' + ad, !h, h || 'istisna yok');
        if (h) continue;

        if (c._st.save !== c._st.restore) { dengesiz++; if (!dengesizAd) dengesizAd = ad; }
        var O = this._olcum || {};
        if (O.hata) { hata += O.hata; hataMsj = O.hataMsj || hataMsj; }
        if (O.minOran < minOran) { minOran = O.minOran; minOranTxt = O.minTxt; }
        tasma += (O.tasma || 0);
        maxsiz += (O.maxsiz || 0) + (c._st.fillTextMaxsiz || 0);
        disMaxsiz += (c._st.disMaxsiz || 0);
        disGrad += (c._st.disGrad || 0);

        var B = this.butonlar(ekran);
        btnSayi[ad] = B.length;
        var A = this.icerikAlani(W, H);
        for (i = 0; i < B.length; i++) {
          var b = B[i];
          var k = Math.min(b.w, b.h);
          if (k < enKucuk) { enKucuk = k; enKucukAd = ad + ' ' + b.id + ' ' + b.w + 'x' + b.h; }
          if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) {
            disari++; if (!disariAd) disariAd = ad + ' ' + b.id;
          }
          if (b.y < A.y - 0.5 || b.y + b.h > A.y + A.h + 0.5) {
            bantIhlal++; if (!bantAd) bantAd = ad + ' ' + b.id;
          }
          for (j = i + 1; j < B.length; j++) {
            var q = B[j];
            var ov = !(b.x + b.w <= q.x + 0.5 || q.x + q.w <= b.x + 0.5 ||
                       b.y + b.h <= q.y + 0.5 || q.y + q.h <= b.y + 0.5);
            if (ov) { cakisma++; if (!cakismaAd) cakismaAd = ad + ' ' + b.id + ' <> ' + q.id; }
          }
        }
      }
    }

    ek('dokunma_hedefi_44px', enKucuk >= 44, 'en kucuk = ' + enKucuk + 'px (' + enKucukAd + ')');
    ek('buton_cakismasi_0', cakisma === 0, cakisma + ' cakisma ' + cakismaAd);
    ek('ekran_disi_buton_0', disari === 0, disari + ' ' + disariAd);
    ek('ust_alt_bant_temiz', bantIhlal === 0, bantIhlal + ' buton icerik alani disinda ' + bantAd);
    ek('save_restore_dengeli', dengesiz === 0, dengesiz + ' boyutta dengesiz ' + dengesizAd);
    ek('cizim_istisnasi_0', hata === 0, hata + ' ' + hataMsj);
    ek('metin_sikisma_085', minOran >= 0.85, 'min oran = ' + minOran.toFixed(3) + ' [' + minOranTxt + ']');
    ek('metin_tasmasi_0', tasma === 0, tasma + ' tasan metin');
    ek('fillText_maxWidth_hep_var', maxsiz === 0, maxsiz + ' maxWidth-siz cagri (bu modul)');
    // ⚠ ÖLÇÜM, gizleme DEĞİL: rakip yuvalarında oyunun GERÇEK araç çizimi
    //   (`UI._drawMenuCar` -> vehicles.js `drawVehicle`) kullanılıyor. O kod
    //   maxWidth vermez ve ÖNBELLEKSİZ gradient üretir. Sayılar burada AÇIKÇA
    //   raporlanır; 16 koşuda (8 boyut x 2 ekran) toplam eşik = 3 arac x 8 boyut.
    ek('dis_cizim_maliyeti_olculdu', true,
       'UI._drawMenuCar: ' + disGrad + ' onbeleksiz gradient + ' + disMaxsiz +
       ' maxWidth-siz fillText / 16 kare  (bu modulun DEGIL, vehicles.js)');

    // ── Kaynak taraması ──
    var src = this._kaynak();
    var fontAtama = (src.match(/\.font\s*=/g) || []).length;
    ek('font_atamasi_tek_kapi', fontAtama === 1, fontAtama + ' adet `.font =` (yalniz _font icinde)');
    var fSrc = String(this._f);
    ek('font_min_W_ve_H', /Math\.min\(/.test(fSrc) && /W\s*\*/.test(fSrc) && /H\s*\*/.test(fSrc),
       'boyut = min(W*rw, H*rh)');
    var ftCount = (src.match(/\.fillText\s*\(/g) || []).length;
    ek('fillText_tek_kapi', ftCount === 1, ftCount + ' adet `.fillText(` (yalniz _yaz icinde)');
    ek('ctx_ellipse_yok', !/\bc\.ellipse\s*\(|\bctx\.ellipse\s*\(/.test(src), 'ellipse cagrisi yok');
    ek('getImageData_yok', src.indexOf('getImageData') < 0, 'getImageData yok');
    ek('toUpperCase_yok', src.indexOf('toUpperCase') < 0, 'toUpperCase yok (Turkce i tuzagi)');
    ek('Math_random_kaynakta_yok', src.indexOf('Math.random') < 0, 'kaynakta Math.random yok');
    var kacakGrad = (src.match(/\b(?:c|ctx)\.create(?:Linear|Radial|Conic)Gradient\s*\(/g) || []).length;
    ek('gradyan_kacagi_yok', kacakGrad === 1, kacakGrad + ' dogrudan createGradient (yalniz _gr icinde 1)');
    var rgbaSayisi = (src.match(/rgba\(/g) || []).length;
    ek('renkler_HEX', rgbaSayisi === 0, rgbaSayisi + ' adet rgba() (accent + "33" bozulur)');
    ek('backtick_yok', src.indexOf('`') < 0, 'template literal yok');
    ek('ingilizce_buyuk_ayri', src.indexOf('_buyukAscii(K.ad)') >= 0 && src.indexOf('_buyukAscii(R.ad)') >= 0,
       'kupa + rakip adlarinda _buyukAscii kullaniliyor');
    ek('hitbox_kirpma_var', /_kirp\s*\(\s*bas/.test(String(this._cizCups)), 'cups izgarasinda _kirp cagrisi var');

    // ── Kare başına yeni gradyan = 0 (ısınma sonrası, HER İKİ EKRAN) ──
    var yeniGradTop = 0, gradIlk = 0;
    for (ei = 0; ei < this.EKRANLAR.length; ei++) {
      var cg = this._sahteCtx(390, 844);
      this._grCtx = null; this._kay = 0;
      this.ciz(cg, 390, 844, this.EKRANLAR[ei], 0.016);
      gradIlk += cg._st.grad;
      var g0 = cg._st.grad;
      this.ciz(cg, 390, 844, this.EKRANLAR[ei], 0.016);
      this.ciz(cg, 390, 844, this.EKRANLAR[ei], 0.016);
      yeniGradTop += (cg._st.grad - g0);
    }
    ek('kare_basina_yeni_gradyan_0', yeniGradTop === 0,
       'ilk karelerde ' + gradIlk + ', sonraki 2+2 karede ' + yeniGradTop + ' (dis cizim HARIC)');

    // ── Kaydırırken de yeni gradyan 0 (translate hilesi çalışıyor mu) ──
    var ck = this._sahteCtx(360, 640);
    this._grCtx = null; this._kay = 0;
    this.ciz(ck, 360, 640, 'cups', 0.016);
    var maxK = this._maxKay;
    var gk0 = ck._st.grad;
    var adim;
    for (adim = 0; adim <= 12; adim++) {
      this._kay = (maxK * adim) / 12;
      this.ciz(ck, 360, 640, 'cups', 0.016);
    }
    ek('kaydirirken_yeni_gradyan_0', ck._st.grad - gk0 === 0,
       (ck._st.grad - gk0) + ' yeni gradyan / 13 kaydirma konumu');

    // ── Kare başına Math.random = 0 (canlı ölçüm) ──
    var eskiRnd = Math.random, rndSayac = 0;
    Math.random = function () { rndSayac++; return eskiRnd(); };
    try {
      this.ciz(ck, 360, 640, 'cups', 0.016);
      this.ciz(ck, 360, 640, 'yarisLobi', 0.016);
    } catch (e) { }
    Math.random = eskiRnd;
    ek('kare_basina_Math_random_0', rndSayac === 0, rndSayac + ' cagri / 2 kare');

    // ── HER KUPA KARTI bir kaydırma konumunda TAM görünür ve >=44 px ──
    var toplamKupa = this.KUPA_HARITA.length;
    var kotu = '', boyutAd;
    var hepsiOK = true;
    for (bi = 0; bi < BOYUTLAR.length; bi++) {
      var BW = BOYUTLAR[bi][0], BH = BOYUTLAR[bi][1];
      boyutAd = BW + 'x' + BH;
      var cc2 = this._sahteCtx(BW, BH);
      this._grCtx = null; this._kay = 0;
      this.ciz(cc2, BW, BH, 'cups', 0.016);
      var mk = this._maxKay, gor = {}, a2;
      for (a2 = 0; a2 <= 12; a2++) {
        this._kay = mk === 0 ? 0 : (mk * a2) / 12;
        this.ciz(cc2, BW, BH, 'cups', 0.016);
        var BB = this.butonlar('cups');
        for (i = 0; i < BB.length; i++) {
          if (BB[i].id !== 'cups_sec' || !BB[i].veri) continue;
          // TAM görünür = `_kirp` yüksekliği kısaltmamış + >=44 px
          if (BB[i].h >= (BB[i].veri.tamH || 0) - 0.5 && Math.min(BB[i].w, BB[i].h) >= 44) {
            gor[BB[i].veri.id] = 1;
          }
        }
        if (mk === 0) break;
      }
      var say = 0;
      for (i = 0; i < this.KUPA_SIRA.length; i++) if (gor[this.KUPA_SIRA[i]]) say++;
      if (say !== toplamKupa) { hepsiOK = false; if (!kotu) kotu = boyutAd + ': ' + say + '/' + toplamKupa; }
    }
    ek('tum_kupalar_erisilebilir', hepsiOK, kotu || (toplamKupa + ' kupa, 8 boyutta tam gorunur'));
    this._kay = 0;

    // ── Kaydırma sözleşmesi ──
    this._grCtx = null; this._kay = 0;
    this.ciz(this._sahteCtx(360, 640), 360, 640, 'cups', 0.016);
    var kC = this.kaydirma('cups', 1e9);
    var kL = this.kaydirma('yarisLobi', 40);
    ek('kaydirma_yalniz_cups', (this._maxKay === 0 ? kC === false : kC === true) && kL === false,
       'cups=' + kC + ' (maxKay=' + Math.round(this._maxKay) + ') yarisLobi=' + kL);
    this._kay = 0;

    // ── VERİ: kupa katalogu gerçekten dolu mu ──
    this._vc = null;
    var V0 = null, vHata = null;
    try { V0 = this._veri(); } catch (e) { vHata = String(e && e.message); }
    ek('modul_yokken_cokmuyor', !vHata && !!V0 && !!V0.kupalar,
       vHata ? vHata : 'veri okundu (SaveData ' + (S ? 'VAR' : 'YOK') + ')');
    ek('kupa_sayisi_6', !!V0 && V0.kupalar.length === 6, (V0 ? V0.kupalar.length : 0) + ' kupa');
    var asamaOK = !!V0, haritaOK = !!V0, esikArtan = !!V0, m2;
    if (V0) {
      for (i = 0; i < V0.kupalar.length; i++) {
        if (V0.kupalar[i].haritalar.length !== 3) asamaOK = false;
        for (j = 0; j < V0.kupalar[i].haritalar.length; j++) {
          m2 = V0.kupalar[i].haritalar[j];
          if (!m2.id || !m2.ad || !m2.emoji || String(m2.renk).charAt(0) !== '#') haritaOK = false;
        }
        if (i > 0 && V0.kupalar[i].esik < V0.kupalar[i - 1].esik) esikArtan = false;
      }
    }
    ek('her_kupa_3_asama', asamaOK, '6 kupa x 3 harita (referans "3 STAGES")');
    ek('harita_metasi_gercek', haritaOK, 'MAPS_META emoji + tema rengi okundu');
    ek('kilit_esikleri_artan', esikArtan, V0 ? V0.kupalar.map(function (K) { return K.esik; }).join(' < ') : '');
    var T = this._g('TOURNAMENT_SYSTEM');
    ek('kupa_kaynagi_TOURNAMENT_SYSTEM',
       !T || !T.TOURNAMENTS || (V0 && V0.kupalar[0] && V0.kupalar[0].kaynak === 'TOURNAMENT_SYSTEM'),
       (T && T.TOURNAMENTS) ? 'TOURNAMENT_SYSTEM okundu' : 'yok -> yedek katalog');
    ek('haritalar_main_js_ile_ayni',
       this.KUPA_HARITA.length === 6 && this.KUPA_HARITA[0].join(',') === 'countryside,desert,beach' &&
       this.KUPA_HARITA[5].join(',') === 'neon_city,wasteland,canyon',
       'main.js:1682 mapSets kopyasi');
    ek('rakip_yuvasi_3', !!V0 && V0.rakip.liste.length === 3,
       (V0 ? V0.rakip.liste.length : 0) + ' yuva, dolu=' + (V0 ? Math.min(3, V0.rakip.adet) : 0) +
       ' (NPC_TABAN=' + (V0 ? V0.rakip.taban : '?') + ' x kalite ' + (V0 ? V0.rakip.kalite : '?') + ')');
    ek('rutbe_orani_0_1', !!V0 && V0.oran >= 0 && V0.oran <= 1, 'oran = ' + (V0 ? V0.oran : 'yok'));
    ek('galibiyet_hedefi_10', !!V0 && V0.galipHedef === 10 && V0.galipOran >= 0 && V0.galipOran <= 1,
       (V0 ? (V0.galibiyet + '/' + V0.galipHedef) : 'yok'));
    ek('ipucu_haritadan_turetildi', !!V0 && !!V0.ipucu && !!V0.ipucu.metin && !!V0.ipucu.olcu,
       V0 ? (V0.ipucu.metin + ' [' + V0.ipucu.olcu + ']') : '');

    // ── LOBİ NPC DOĞURMUYOR (bagla-rakip perf düzeltmesi BOZULMASIN) ──
    var NS = this._g('NPCSystem');
    var npcOnce = NS ? (NS.npcs || []).length : -1;
    var cl = this._sahteCtx(390, 844);
    this._grCtx = null;
    this.ciz(cl, 390, 844, 'yarisLobi', 0.016);
    var raceB = null;
    var BL = this.butonlar('yarisLobi');
    for (i = 0; i < BL.length; i++) if (BL[i].id === 'cups_yaris') raceB = BL[i];
    var npcSonra = NS ? (NS.npcs || []).length : -1;
    ek('lobi_NPC_dogurmuyor', npcOnce === npcSonra,
       NS ? ('NPCSystem.npcs ' + npcOnce + ' -> ' + npcSonra) : 'NPCSystem yok');

    // ── API sözleşmesi ──
    ek('EKRANLAR_dogru', this.EKRANLAR.length === 2 && this.EKRANLAR[0] === 'cups' &&
       this.EKRANLAR[1] === 'yarisLobi', this.EKRANLAR.join(','));
    this._grCtx = null;
    this.ciz(cl, 390, 844, 'cups', 0.016);
    var Bc = this.butonlar('cups');
    this.ciz(cl, 390, 844, 'yarisLobi', 0.016);
    var Bl = this.butonlar('yarisLobi');
    ek('ekran_basina_ayri_buton_listesi', Bc.length > 0 && Bl.length > 0 && Bc[0].id !== Bl[0].id,
       'cups ' + Bc.length + ' buton / yarisLobi ' + Bl.length + ' buton');
    var sekil = true, idler = {};
    for (i = 0; i < Bl.length; i++) {
      var bb = Bl[i];
      if (typeof bb.id !== 'string' || !isFinite(bb.x) || !isFinite(bb.y) ||
          !isFinite(bb.w) || !isFinite(bb.h)) sekil = false;
      idler[bb.id] = 1;
    }
    ek('butonlar_sekli', sekil, Bl.length + ' buton {id,x,y,w,h}');
    ek('tikla_bosluk_null', this.tikla(-50, -50, 'cups') === null, 'ekran disi -> null');
    var tk = raceB ? this.tikla(raceB.x + raceB.w / 2, raceB.y + raceB.h / 2, 'yarisLobi') : null;
    ek('tikla_race_butonu', !!tk && tk.eylem === 'cups_yaris' && !!tk.veri &&
       typeof tk.veri.harita === 'string' && tk.veri.haritalar.length === 3 && tk.veri.botMode === true,
       tk ? (tk.eylem + ' harita=' + tk.veri.harita + ' asama=' + tk.veri.asama +
             ' arac=' + tk.veri.arac + ' rakip=' + tk.veri.rakip) : 'RACE bulunamadi');

    // Kupa seçimi TIKLAMAYLA değişiyor mu (kilitli olan seçilemiyor mu)
    this._grCtx = null; this._kay = 0;
    this.ciz(cl, 390, 844, 'cups', 0.016);
    var Bc2 = this.butonlar('cups');
    var acik = null, kapali = null;
    for (i = 0; i < Bc2.length; i++) {
      if (Bc2[i].id !== 'cups_sec') continue;
      if (!Bc2[i].veri.kilit && !acik) acik = Bc2[i];
      if (Bc2[i].veri.kilit && !kapali) kapali = Bc2[i];
    }
    var oncekiSec = this._secili;
    if (acik) this.tikla(acik.x + acik.w / 2, acik.y + acik.h / 2, 'cups');
    ek('acik_kupa_secilebiliyor', !acik || this._secili === acik.veri.id,
       acik ? ('secili = ' + this._secili) : 'acik kupa yok');
    var secKilitOnce = this._secili;
    if (kapali) this.tikla(kapali.x + kapali.w / 2, kapali.y + kapali.h / 2, 'cups');
    ek('kilitli_kupa_secilemiyor', !kapali || this._secili === secKilitOnce,
       kapali ? ('kilitli ' + kapali.veri.id + ' -> secili ' + this._secili) : 'kilitli kupa yok');
    this._secili = oncekiSec;

    // ── Yatay/dikey düzen gerçekten farklı ──
    var dD = this._duzenLobi(390, 844), dY = this._duzenLobi(844, 390);
    ek('yatay_dikey_duzen_farkli', dD.yatay === false && dY.yatay === true &&
       dY.race.y < dY.A.y + dY.A.h && dD.race.y > dD.rutbe.y,
       'dikey: dikey yigin / yatay: 2 satir 3 sutun');
    var gD = this._duzenCups(390, 844), gY = this._duzenCups(844, 390);
    ek('izgara_sutun_uyarlaniyor', gD.sut === 2 && gY.sut >= 3,
       'dikey ' + gD.sut + ' sutun / yatay ' + gY.sut + ' sutun');

    // ── Determinizm ──
    this._grCtx = null;
    this.ciz(cl, 390, 844, 'yarisLobi', 0.016);
    var B1 = this.butonlar('yarisLobi');
    this.ciz(cl, 390, 844, 'yarisLobi', 0.016);
    var B2 = this.butonlar('yarisLobi');
    var ayni = B1.length === B2.length;
    if (ayni) for (i = 0; i < B1.length; i++) {
      if (B1[i].id !== B2[i].id || B1[i].x !== B2[i].x || B1[i].y !== B2[i].y ||
          B1[i].w !== B2[i].w || B1[i].h !== B2[i].h) { ayni = false; break; }
    }
    ek('geometri_deterministik', ayni, 'iki karede ayni buton kutulari');

    // ── Türkçe / İngilizce büyük harf ──
    ek('turkce_buyuk_harf', this._buyuk('istanbul ılık') === 'İSTANBUL ILIK', this._buyuk('istanbul ılık'));
    ek('ingilizce_buyuk_harf_ascii', this._buyukAscii('Elite Series') === 'ELITE SERIES',
       this._buyukAscii('Elite Series'));

    // ── icerikAlani tutarlı ──
    var alanOK = true, alanNot = '';
    for (bi = 0; bi < BOYUTLAR.length; bi++) {
      var A3 = this.icerikAlani(BOYUTLAR[bi][0], BOYUTLAR[bi][1]);
      if (!(A3.ust >= 44 && A3.alt >= 44 && A3.h > 100 && A3.y === A3.ust &&
            A3.y + A3.h + A3.alt === BOYUTLAR[bi][1])) {
        alanOK = false; alanNot = BOYUTLAR[bi][0] + 'x' + BOYUTLAR[bi][1];
      }
    }
    ek('icerikAlani_tutarli', alanOK, alanNot || 'ust>=44, alt>=44, ust+h+alt=H');
    ek('hazir', this.hazir() === true, 'hazir()');

    // ── KAYIT BOZULMADI MI (en kritik kontrol) ──
    this._secili = eskiSecili; this._kay = eskiKay; this._t = eskiT;
    this._vc = null; this._vcT = 0;
    var kayitSonra = null;
    try { kayitSonra = (S && S.data) ? JSON.stringify(S.data) : 'YOK'; } catch (e) { kayitSonra = 'HATA'; }
    ek('selfTest_kaydi_bozmuyor', kayitOnce === kayitSonra,
       kayitOnce === kayitSonra ? ('SaveData.data degismedi (' +
         (kayitOnce === 'YOK' ? 'modul yok' : kayitOnce.length + ' bayt') + ')')
        : 'KAYIT DEGISTI!');
    // ⚠ `.save()` diye ARAMA — canvas `c.save()` ile karışır (ilk yazımda bu
    //   kontrol SAHTE KALDI verdi). Yalnız GERÇEK kayıt yazma desenleri aranır.
    var yazmaRe = /SaveData\s*\.\s*(set|save|add|spend|unlock|record|setUpgrade|setPartLevel)|S\s*\.\s*(set|save|addGold|spendGold)\s*\(|\.\s*data\s*\.[A-Za-z_$]+\s*=[^=]/;
    var yazmaBul = yazmaRe.exec(src);
    ek('modul_kayda_hic_yazmiyor', !yazmaBul,
       yazmaBul ? ('YAZMA BULUNDU: ' + yazmaBul[0]) : 'kaynakta SaveData yazma deseni yok');

    var kaldi = 0;
    for (i = 0; i < R.length; i++) if (!R[i].gecti) kaldi++;
    return {
      modul: 'EkranCups', surum: this.SURUM,
      toplam: R.length, gecti: R.length - kaldi, kaldi: kaldi,
      allPass: kaldi === 0,
      kontroller: R
    };
  }
};

if (typeof window !== 'undefined') window.EkranCups = EkranCups;
if (typeof module !== 'undefined' && module.exports) module.exports = EkranCups;
