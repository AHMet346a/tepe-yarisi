'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   ekran-garaj.js — GARAJ + PARÇA TAKMA GARAJI (HCR2 referans düzeni)
   ---------------------------------------------------------------------------
   REFERANS GÖRSELLER (Pictures/garaj parçaları/):
     · "Ekran görüntüsü 2026-08-03 145023.png"  → GARAJ
       ÜSTTE 4 yükseltme kartı yan yana (엔진/접지력/서스펜션/4륜구동), her kartta
       ikon + "20/20" + "최대"(MAKS) etiketi · ortada araç + adı (HILL CLIMBER)
       + güç göstergesi (⚡197 /461) · solda 🔧 부품(parça) · sağda 🎨 디자인
       · altta 뒤로(GERİ) / 시작(BAŞLA).
       🔴 Kullanıcı kuralı: "4 parça yükseltmesi ÜSTTE olsun, alta değil."
     · "Ekran görüntüsü 2026-08-03 145032.png"  → PARÇA TAKMA GARAJI
       Sol INVENTORY (kaydırmalı ızgara; her fayans: seviye rozeti + nadirlik
       rengi + sahipKart/gerekliKart çubuğu) · sağ EQUIPPED (3 YUVA) + araç
       önizlemesi · seçili parça kartı (ad + kısa açıklama + "BOOST: 253" /
       "DURATION: 0.45" stat satırları) · DONE butonu.

   DIŞA VERİLEN API (imza KESİN — ana oturum bunu bağlar):
     EkranGaraj.EKRANLAR                    -> ['garaj','parcaGaraj']
     EkranGaraj.ciz(ctx, W, H, ekran, dt)
     EkranGaraj.tikla(x, y, ekran)          -> {eylem, veri} | null
     EkranGaraj.butonlar(ekran)             -> [{id,x,y,w,h,veri}]
     EkranGaraj.kaydirma(ekran, delta)      -> true/false
     EkranGaraj.hazir()
     EkranGaraj.selfTest()

   VERİ KAYNAKLARI — HİÇBİRİ UYDURMA DEĞİL:
     · Yükseltme maliyeti / tavan / stat çarpanı : js/economy.js
       UPGRADE_LEVEL_COSTS · UP_MAX (25) · STAT_UPGRADE_MULT   (OKUNUR)
     · Güç skoru      : UpgradeSystem.powerScore(vehicleId)     (OKUNUR)
     · Araç çizimi    : UI._drawMenuCar -> drawVehicle          (OKUNUR)
     · Parça tablosu  : port-araclari/_parca-wiki.json          (GÖMÜLÜ KOPYA)
       21 parça · ad · nadirlik · kısa açıklama · stat adları · seviye başına
       {etki, süre} (294 hücre, 0 null). `js/economy.js` DEĞİŞTİRİLMEDİ; ana
       oturum birleştirene kadar tablo burada durur.

   🔴 PROJE KURALLARI (hepsi selfTest ile kilitli):
     · `ctx.font` YALNIZ `_font()` içinde atanır; boyut min(W-tabanlı, H-tabanlı).
     · `ctx.fillText` YALNIZ `_yaz()` içinde; her çağrıda maxWidth verilir,
       sıkışma oranı 0.85 altına düşerse önce font küçültülür, sonra "…" kesilir.
     · Gradyanlar `_gr()`/`_grR()` ile ÖNBELLEKLİ — kare başına yeni gradyan 0.
     · `ctx.ellipse` YOK (save+scale+arc+restore), `getImageData` YOK.
     · `Math.random` YOK — animasyon `dt` birikimli.
     · `toUpperCase()` YOK — `_buyuk()` (UI._trBuyuk varsa onu kullanır).
     · Renkler HEX (accent + '33' alfa eklemesi bozulmasın), `rgba()` YOK.
     · Bare global'ler `typeof X !== 'undefined'` ile okunur (window.X ÇALIŞMAZ).
     · Kaydırılan ızgarada HITBOX KIRPMA ŞART (29 Tmz madde 2).
   ═══════════════════════════════════════════════════════════════════════════ */

const EkranGaraj = {
  SURUM: '1.0',

  EKRANLAR: ['garaj', 'parcaGaraj'],

  // ── Palet (HEX ZORUNLU) ──────────────────────────────────────────────────
  C: {
    zemin:   '#141a26',
    duvar:   '#3a2b1e',
    duvar2:  '#25190f',
    zeminAl: '#4a3524',
    panel:   '#1d2536',
    panel2:  '#161d2c',
    koyu:    '#0e1320',
    cizgi:   '#2c3648',
    yazi:    '#e8eef7',
    alt:     '#9fb0c8',
    altin:   '#ffcf3f',
    elmas:   '#4fd0ff',
    yesil:   '#59d67a',
    turuncu: '#ff8a3d',
    kirmizi: '#ff5a5a',
    mavi:    '#4aa8ff',
    mor:     '#a97bff',
    ahsap:   '#c9963f',
    ahsap2:  '#8a5f22'
  },

  // Nadirlik renkleri — referans 145032'deki fayans renklerinden
  NADIR_RENK: {
    common:    '#b9c4d0',
    uncommon:  '#4a9eff',
    rare:      '#ffb347',
    epic:      '#b06bff',
    legendary: '#8fe9ff',
    mythic:    '#ffd24a'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4 YÜKSELTME KARTI — referanstaki 4 kutu (엔진/접지력/서스펜션/4륜구동)
  //  🔴 `id` alanları `Economy.STAT_UPGRADE_MULT` anahtarlarıdır (uydurma DEĞİL).
  //  ⚠ Economy'de 5. bir kategori (`fuel`) daha var; referans 4 kart gösterdiği
  //    ve kullanıcı "4 parça yükseltmesi" dediği için bu ekranda YOK.
  //    (Raporda bildirildi — ana oturum isterse buraya 5. satır eklenir.)
  // ═════════════════════════════════════════════════════════════════════════
  KATEGORI: [
    { id: 'engine',     ad: 'MOTOR',       ikon: 'piston',  renk: '#ff8a3d' },
    { id: 'tires',      ad: 'TUTUŞ',       ikon: 'lastik',  renk: '#59d67a' },
    { id: 'suspension', ad: 'SÜSPANSİYON', ikon: 'yay',     renk: '#4aa8ff' },
    { id: 'gravity',    ad: '4×4',         ikon: 'dortcek', renk: '#a97bff' }
  ],

  YUVA: 3,          // referans 145032: EQUIPPED = 3 yuva

  // ═════════════════════════════════════════════════════════════════════════
  // PARÇA TABLOSU — port-araclari/_parca-wiki.json'dan GÖMÜLÜ KOPYA
  //   `etki` = 1. stat değeri (seviye 1..maks), `sure` = 2. stat (yoksa null).
  //   Değerler videodan ÖLÇÜLDÜ, interpolasyon YOK.
  //   `oyun` = js/economy.js PARTS içindeki karşılığı (yoksa null = YENİ parça).
  // ═════════════════════════════════════════════════════════════════════════
  PARCA: [
    { id: 'magnet', ad: 'Magnet', nadir: 'common',
      aciklama: 'Collect fuel and coins with wider radius.',
      stat: ['Radius', 'Force'], maks: 15,
      etki: [5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5],
      sure: [10, 11.43, 12.86, 14.29, 15.71, 17.14, 18.57, 20, 21.43, 22.86, 24.29, 25.71, 27.14, 28.57, 30],
      oyun: 'coin_magnet' },
    { id: 'heavyweight', ad: 'Heavyweight', nadir: 'common',
      aciklama: 'Increase damage dealt to breakable objects.',
      stat: ['Weight'], maks: 15,
      etki: [35, 39.64, 44.29, 48.93, 53.57, 58.21, 62.86, 67.5, 72.14, 76.79, 81.43, 86.07, 90.71, 95.36, 100],
      sure: null,
      oyun: null },
    { id: 'wings', ad: 'Wings', nadir: 'common',
      aciklama: 'Glide in air.',
      stat: ['Boost', 'Duration'], maks: 15,
      etki: [100, 107, 114, 121, 128, 135, 142, 150, 157, 164, 171, 178, 185, 192, 200],
      sure: [1.5, 1.57, 1.64, 1.71, 1.79, 1.86, 1.93, 2, 2.07, 2.14, 2.21, 2.29, 2.36, 2.43, 2.5],
      oyun: 'wing' },
    { id: 'rollcage', ad: 'Rollcage', nadir: 'common',
      aciklama: 'Protect driver from hits.',
      stat: ['Durability'], maks: 15,
      etki: [20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5, 55],
      sure: null,
      oyun: 'roll_cage' },
    { id: 'air_control', ad: 'Air Control', nadir: 'common',
      aciklama: 'Turn faster in the air.',
      stat: ['Air Control'], maks: 15,
      etki: [13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20],
      sure: null,
      oyun: 'air_master' },
    { id: 'winter_tires', ad: 'Winter Tires', nadir: 'common',
      aciklama: 'Increased grip, bonus on snow and ice.',
      stat: ['Snow Grip', 'Grip'], maks: 15,
      etki: [150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500],
      sure: [50, 57.14, 64.29, 71.43, 78.57, 85.71, 92.86, 100, 107, 114, 121, 129, 136, 143, 150],
      oyun: 'grip_tires' },
    { id: 'start_boost', ad: 'Start Boost', nadir: 'rare',
      aciklama: 'Active rocket booster on perfect start.',
      stat: ['Boost', 'Duration'], maks: 10,
      etki: [700, 711, 722, 733, 744, 755, 766, 777, 788, 800],
      sure: [0.5, 0.61, 0.72, 0.83, 0.94, 1.06, 1.17, 1.28, 1.39, 1.5],
      oyun: 'start_boost' },
    { id: 'wheelie_boost', ad: 'Wheelie Boost', nadir: 'rare',
      aciklama: 'Power boost on wheelies.',
      stat: ['Boost', 'Duration'], maks: 10,
      etki: [300, 311, 322, 333, 344, 355, 366, 377, 388, 400],
      sure: [0.5, 0.56, 0.61, 0.67, 0.72, 0.78, 0.83, 0.89, 0.94, 1],
      oyun: null },
    { id: 'fume_boost', ad: 'Fume Boost', nadir: 'rare',
      aciklama: 'Power boost when fuel is low.',
      stat: ['Boost'], maks: 10,
      etki: [250, 272, 294, 316, 338, 361, 383, 405, 427, 450],
      sure: null,
      oyun: null },
    { id: 'flip_boost', ad: 'Flip Boost', nadir: 'rare',
      aciklama: 'Power boost after successful flips.',
      stat: ['Boost', 'Duration'], maks: 10,
      etki: [250, 266, 283, 300, 316, 333, 350, 366, 383, 400],
      sure: [0.5, 0.56, 0.61, 0.67, 0.72, 0.78, 0.83, 0.89, 0.94, 1],
      oyun: 'combo_master' },
    { id: 'jump_shocks', ad: 'Jump Shocks', nadir: 'rare',
      aciklama: 'Jump up in the air. Tap both pedals!',
      stat: ['Boost'], maks: 10,
      etki: [500, 555, 611, 666, 722, 777, 833, 888, 944, 1000],
      sure: null,
      oyun: 'spring' },
    { id: 'landing_boost', ad: 'Landing Boost', nadir: 'epic',
      aciklama: 'Power boost on a perfect landing.',
      stat: ['Impulse'], maks: 7,
      etki: [9, 10, 11, 12, 13, 14, 15],
      sure: null,
      oyun: 'landing_boost' },
    { id: 'overcharged_turbo', ad: 'Overcharged Turbo', nadir: 'epic',
      aciklama: 'Charge turbo at maximum pressure.',
      stat: ['Top speed', 'Impulse'], maks: 7,
      etki: [50, 54.17, 58.33, 62.5, 66.67, 70.83, 75],
      sure: [4, 5, 6, 7, 8, 9, 10],
      oyun: 'turbo' },
    { id: 'afterburner', ad: 'Afterburner', nadir: 'epic',
      aciklama: 'Power boost with higher fuel use.',
      stat: ['Boost', 'Top speed'], maks: 7,
      etki: [42.5, 47.92, 53.33, 58.75, 64.17, 69.58, 75],
      sure: [2.5, 2.67, 2.83, 3, 3.17, 3.33, 3.5],
      oyun: null },
    { id: 'spoiler', ad: 'Spoiler', nadir: 'epic',
      aciklama: 'Increased downforce while in the air.',
      stat: ['Force'], maks: 7,
      etki: [350, 458, 566, 675, 783, 891, 1000],
      sure: null,
      oyun: null },
    { id: 'thrusters', ad: 'Thrusters', nadir: 'legendary',
      aciklama: 'Fly through the air. Press both pedals!',
      stat: ['Boost'], maks: 4,
      etki: [500, 666, 833, 1000],
      sure: null,
      oyun: null },
    { id: 'fuel_boost', ad: 'Fuel Boost', nadir: 'legendary',
      aciklama: 'Power boost on collected fuel canister.',
      stat: ['Boost', 'Duration'], maks: 4,
      etki: [400, 400, 400, 400],
      sure: [0.5, 0.67, 0.83, 1],
      oyun: null },
    { id: 'coin_boost', ad: 'Coin Boost', nadir: 'legendary',
      aciklama: 'Power boost when collecting coins.',
      stat: ['Top speed', 'Duration'], maks: 4,
      etki: [8, 12, 16, 20],
      sure: [0.5, 0.67, 0.83, 1],
      oyun: null },
    { id: 'nitro', ad: 'Nitro', nadir: 'legendary',
      aciklama: 'Charge on perfect start and excess fuel.',
      stat: ['Impulse', 'Top Speed'], maks: 4,
      etki: [4.2, 5.13, 6.07, 7],
      sure: [12, 14.67, 17.33, 20],
      oyun: 'nitro' },
    { id: 'amplifier', ad: 'Amplifier', nadir: 'mythic',
      aciklama: 'Boosts the power of other equipped parts.',
      stat: ['Part Power'], maks: 3,
      etki: [10, 15, 20],
      sure: null,
      oyun: null },
    { id: 'echo', ad: 'Echo', nadir: 'mythic',
      aciklama: 'Repeats the first equipped part after a delay.',
      stat: ['Echo Power', 'Delay'], maks: 3,
      etki: [60, 70, 80],
      sure: [0.8, 0.8, 0.8],
      oyun: null }
  ],

  // ═════════════════════════════════════════════════════════════════════════
  // UYUMLULUK MATRİSİ — _parca-wiki.json "uzunAciklama" alanlarından
  //   Amplifier: "Can't be used with Echo at the same time."
  //   Echo:      "Can't be used with Magnet, Air Control, Heavyweight,
  //               Winter Tires, Rollcage, Jumpshocks and Spoiler.
  //               Can't be used with Amplifier at the same time."
  //   ⚠ Matris SİMETRİK okunur (`_uyumsuzMu` iki yönü de dener).
  // ═════════════════════════════════════════════════════════════════════════
  UYUMSUZ: {
    amplifier: ['echo'],
    echo: ['amplifier', 'magnet', 'air_control', 'heavyweight',
           'winter_tires', 'rollcage', 'jump_shocks', 'spoiler']
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KART GEREKSİNİMİ (sahipKart / gerekliKart)
  //   Referans 145032'de OKUNAN hücreler:  lv1=3 · lv3=17 · lv4=25 · lv5=34 ·
  //   lv7=58 · lv8=76 · lv9=100  (7 ölçüm).
  //   lv2 ve lv6 aradeğerlenmiş; lv10+ ölçülen son oran (×1,32) ile uzatıldı.
  //   ⚠ Bu tablo TAHMİN İÇEREN TEK YERDİR ve ayrıca raporda bildirildi.
  // ═════════════════════════════════════════════════════════════════════════
  KART_GEREK: [3, 10, 17, 25, 34, 45, 58, 76, 100, 132, 174, 230, 303, 400, 528],

  // ── Durum ────────────────────────────────────────────────────────────────
  _btnE: { garaj: [], parcaGaraj: [] },
  _btn: [],
  _t: 0,
  _px: 12,
  _grC: {},
  _grCtx: null,
  _grBoyut: '',
  _olcum: null,
  _secili: 'magnet',
  _kay: 0,
  _maxKay: 0,
  _uyari: '',
  _uyariT: 0,
  _vc: null,
  _vcT: 0,

  _TRB: { 'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç' },

  // ═════════════════════════════════════════════════════════════════════════
  // TEMEL YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  hazir() { return true; },

  // Bare global güvenli okuma — `window.X` UNDEFINED'dır (CLAUDE.md tuzağı)
  _g(ad) {
    try {
      switch (ad) {
        case 'SaveData':      return (typeof SaveData      !== 'undefined') ? SaveData      : null;
        case 'Economy':       return (typeof Economy       !== 'undefined') ? Economy       : null;
        case 'VehicleDefs':   return (typeof VehicleDefs   !== 'undefined') ? VehicleDefs   : null;
        case 'UI':            return (typeof UI            !== 'undefined') ? UI            : null;
        case 'UpgradeSystem': return (typeof UpgradeSystem !== 'undefined') ? UpgradeSystem : null;
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

  // 🔴 İNGİLİZCE metin için AYRI büyük harf. `_buyuk` Türkçe kuralı uygular ve
  //   "Wheelie Boost" -> "WHEELİE BOOST", "Duration" -> "DURATİON" yapar.
  //   Parça adları ve stat adları wiki'den gelen İNGİLİZCE veridir → ASCII kural.
  //   (PNG kanıtında gözle yakalandı; doğrulayıcı bunu göremezdi.)
  _buyukAscii(metin) {
    var s = String(metin == null ? '' : metin), o = '', i, k;
    for (i = 0; i < s.length; i++) {
      k = s.charCodeAt(i);
      o += (k >= 97 && k <= 122) ? String.fromCharCode(k - 32) : s.charAt(i);
    }
    return o;
  },

  // İkon içi ikincil renk — ana renk KOYUYSA açık ton döner (turbo ikonu
  // siyah üstüne siyah çizilip GÖRÜNMEZ olmuştu; PNG'de yakalandı).
  _ikonIkincil(a) {
    var s = String(a || '#000000');
    if (s.charAt(0) !== '#' || (s.length !== 7 && s.length !== 4)) return '#1a2130';
    var r, g, b;
    if (s.length === 4) {
      r = parseInt(s.charAt(1) + s.charAt(1), 16);
      g = parseInt(s.charAt(2) + s.charAt(2), 16);
      b = parseInt(s.charAt(3) + s.charAt(3), 16);
    } else {
      r = parseInt(s.substring(1, 3), 16);
      g = parseInt(s.substring(3, 5), 16);
      b = parseInt(s.substring(5, 7), 16);
    }
    var luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return (luma < 0.22) ? '#dfe7f2' : '#1a2130';
  },

  _sayi(n) {
    n = Math.floor(Number(n) || 0);
    try { return n.toLocaleString('tr-TR'); } catch (e) { }
    var s = String(Math.abs(n)), o = '', c = 0, i;
    for (i = s.length - 1; i >= 0; i--) { o = s.charAt(i) + o; if (++c % 3 === 0 && i > 0) o = '.' + o; }
    return (n < 0 ? '-' : '') + o;
  },

  // Kısa para biçimi (üst şerit dar) — 21.101.568 -> 21,1M
  _kisaSayi(n) {
    n = Math.floor(Number(n) || 0);
    if (n >= 1000000) return (Math.round(n / 100000) / 10) + 'M';
    if (n >= 100000)  return Math.round(n / 1000) + 'K';
    return this._sayi(n);
  },

  // Stat değeri — tam sayıysa nokta yok, değilse en çok 2 hane
  _deg(v) {
    if (v == null) return '—';
    var n = Number(v);
    if (!isFinite(n)) return '—';
    if (Math.abs(n - Math.round(n)) < 0.005) return String(Math.round(n));
    return String(Math.round(n * 100) / 100);
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
  // 🔴 `H * oran` TEK BAŞINA YASAK (29 Tmz: dar-uzun telefonda metin taşıyordu).
  _f(c, W, H, rw, rh, mn, mx, kalinlik) {
    var px = Math.min(W * rw, H * rh);
    px = Math.max(mn, Math.min(mx, px));
    return this._font(c, px, kalinlik);
  },

  _mw(c, t) {
    try { var m = c.measureText(String(t)); return (m && isFinite(m.width)) ? m.width : 0; }
    catch (e) { return 0; }
  },

  // 🔴 Projede `.fillText(` ÇAĞRISI YALNIZ BURADA.
  //   1) sıkışma oranı 0.85 altına düşerse font küçültülür
  //   2) hâlâ sığmıyorsa "…" ile kesilir
  //   3) her çağrıda maxWidth verilir (iki katmanlı koruma)
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

  // Kelime kaydırmalı metin (açıklama satırları) — her satır `_yaz` ile basılır
  _yazSar(c, metin, x, y, maxW, satirY, enFazla, hiza) {
    var kelime = String(metin == null ? '' : metin).split(' ');
    var satir = '', bas = 0, i, dene;
    for (i = 0; i < kelime.length; i++) {
      dene = satir ? (satir + ' ' + kelime[i]) : kelime[i];
      if (satir && this._mw(c, dene) > maxW) {
        this._yaz(c, satir, x, y + bas * satirY, maxW, hiza);
        bas++; satir = kelime[i];
        if (bas >= enFazla) { satir = ''; break; }
      } else satir = dene;
    }
    if (satir && bas < enFazla) { this._yaz(c, satir, x, y + bas * satirY, maxW, hiza); bas++; }
    return bas;
  },

  // Gradyan ÖNBELLEĞİ — kare başına yeni gradyan 0 olmalı.
  _grHazirla(c, W, H) {
    var anahtar = W + 'x' + H;
    if (this._grCtx !== c || this._grBoyut !== anahtar) {
      this._grC = {}; this._grCtx = c; this._grBoyut = anahtar;
    }
  },

  _gr(c, ad, x0, y0, x1, y1, duraklar) {
    var k = 'L' + ad + '|' + (x0 | 0) + ',' + (y0 | 0) + ',' + (x1 | 0) + ',' + (y1 | 0);
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
      g = c.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(1, r1));
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

  _daire(c, cx, cy, r) { c.beginPath(); c.arc(cx, cy, Math.max(0.5, r), 0, Math.PI * 2); c.fill(); },

  _pol(c, pts, kapat) {
    if (!pts || pts.length < 2) return;
    var i;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (kapat !== false) c.closePath();
  },

  _kart(c, x, y, w, h, r, ustRenk, altRenk, kenar) {
    if (w <= 0 || h <= 0) return;
    c.fillStyle = this._gr(c, 'k' + ustRenk + altRenk, x, y, x, y + h, [[0, ustRenk], [1, altRenk]]);
    this._rr(c, x, y, w, h, r); c.fill();
    if (kenar) { c.strokeStyle = kenar; c.lineWidth = 1.5; this._rr(c, x, y, w, h, r); c.stroke(); }
  },

  _cubuk(c, x, y, w, h, oran, renk, zemin) {
    oran = Math.max(0, Math.min(1, Number(oran) || 0));
    c.fillStyle = zemin || this.C.koyu;
    this._rr(c, x, y, w, h, h / 2); c.fill();
    if (oran > 0) {
      var dw = Math.max(h, w * oran);
      c.fillStyle = this._gr(c, 'c' + renk, x, y, x + w, y, [[0, renk], [1, '#ffffff']]);
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
      if (y1 - y0 < 44) continue;                // görünen kısım hedef altı → at
      b.y = Math.round(y0); b.h = Math.round(y1 - y0);
      kalan.push(b);
    }
    this._btn = kalan;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // PARÇA VERİSİ — okuma / durum / uyumluluk
  // ═════════════════════════════════════════════════════════════════════════

  _parca(id) {
    var i;
    for (i = 0; i < this.PARCA.length; i++) if (this.PARCA[i].id === id) return this.PARCA[i];
    return null;
  },

  _nadirRenk(n) { return this.NADIR_RENK[n] || this.NADIR_RENK.common; },

  // Seviye — oyun karşılığı varsa SaveData'dan, yoksa 0 (sahip değil)
  _seviye(p) {
    if (!p) return 0;
    var S = this._g('SaveData');
    var lv = 0;
    try {
      if (S && p.oyun && typeof S.getPartLevel === 'function') lv = Number(S.getPartLevel(p.oyun)) || 0;
      if (S && S.data && S.data.partLevels && S.data.partLevels[p.id] != null) {
        lv = Number(S.data.partLevels[p.id]) || lv;
      }
    } catch (e) { }
    return Math.max(0, Math.min(p.maks, Math.floor(lv)));
  },

  _kartSayisi(p) {
    var S = this._g('SaveData');
    try {
      if (S && S.data && S.data.partCards && S.data.partCards[p.id] != null) {
        return Math.max(0, Math.floor(Number(S.data.partCards[p.id]) || 0));
      }
    } catch (e) { }
    return 0;
  },

  // 🔴 İNDİS `lv - 1`. Referans 145032: sv1 -> 3 · sv4 -> 25 · sv8 -> 76 · sv9 -> 100.
  //   İlk yazımda `KART_GEREK[lv]` yazılmıştı → sv4'te 34 (olması gereken 25).
  //   PNG'yi referansla yan yana koyunca yakalandı.
  _kartGerek(p, lv) {
    var son = this.KART_GEREK.length - 1;
    var i = (lv >= p.maks) ? (p.maks - 1) : (lv - 1);
    return this.KART_GEREK[Math.max(0, Math.min(son, i))];
  },

  // Takılı parça id listesi — SaveData.data.equippedParts (varsa) üstünden
  // ⚠ `SaveData.toggleEquipPart` 2 YUVA sınırı uyguluyor (savedata.js:504);
  //   referans 3 yuva istiyor → o fonksiyon KULLANILMAZ, dizi doğrudan yönetilir.
  //   (savedata.js DEĞİŞTİRİLMEDİ; çakışma raporda bildirildi.)
  _takili() {
    var S = this._g('SaveData'), liste = [], i, id, p;
    try {
      if (S && S.data && Array.isArray(S.data.equippedParts)) liste = S.data.equippedParts.slice();
    } catch (e) { }
    if (!liste.length && Array.isArray(this._takiliYerel)) liste = this._takiliYerel.slice();
    var o = [];
    for (i = 0; i < liste.length && o.length < this.YUVA; i++) {
      id = String(liste[i]);
      p = this._parca(id);
      if (!p) p = this._oyunIdden(id);
      if (p && o.indexOf(p.id) < 0) o.push(p.id);
    }
    return o;
  },

  _oyunIdden(oyunId) {
    var i;
    for (i = 0; i < this.PARCA.length; i++) if (this.PARCA[i].oyun === oyunId) return this.PARCA[i];
    return null;
  },

  _takiliYazEt(liste) {
    this._takiliYerel = liste.slice();
    var S = this._g('SaveData'), i, p, cikti = [];
    for (i = 0; i < liste.length; i++) {
      p = this._parca(liste[i]);
      cikti.push(p && p.oyun ? p.oyun : liste[i]);
    }
    try {
      if (S && S.data) {
        S.data.equippedParts = cikti;
        if (typeof S.save === 'function') S.save();
      }
    } catch (e) { }
    this._vc = null;
  },

  // Simetrik uyumsuzluk kontrolü
  _uyumsuzMu(a, b) {
    if (!a || !b || a === b) return false;
    var la = this.UYUMSUZ[a], lb = this.UYUMSUZ[b];
    if (la && la.indexOf(b) >= 0) return true;
    if (lb && lb.indexOf(a) >= 0) return true;
    return false;
  },

  // Takılabilir mi? -> {ok, sebep, cikar}
  //   tip: '' (takilabilir) . 'cikar' . 'yok' (sahip degil) . 'uyumsuz' . 'dolu'
  //   🔴 'dolu' ile 'uyumsuz' AYRI TUTULUR: fayans karartmasi yalniz 'yok' ve
  //     'uyumsuz' icin yapilir. Ilk yazimda 3 yuva dolunca ENVANTERIN TAMAMI
  //     karartiliyordu (PNG'de goruldu) - yanlis bilgi veriyordu.
  _takilabilir(id) {
    var p = this._parca(id);
    if (!p) return { ok: false, tip: 'yok', sebep: 'PARÇA YOK' };
    var takili = this._takili(), i;
    if (takili.indexOf(id) >= 0) return { ok: true, cikar: true, tip: 'cikar', sebep: '' };
    if (this._seviye(p) <= 0) return { ok: false, tip: 'yok', sebep: 'SAHİP DEĞİLSİN' };
    for (i = 0; i < takili.length; i++) {
      if (this._uyumsuzMu(id, takili[i])) {
        var q = this._parca(takili[i]);
        return { ok: false, tip: 'uyumsuz',
                 sebep: this._buyukAscii(q ? q.ad : takili[i]) + ' \u0130LE UYUMSUZ' };
      }
    }
    if (takili.length >= this.YUVA) return { ok: false, tip: 'dolu', sebep: this.YUVA + ' YUVA DOLU' };
    return { ok: true, cikar: false, tip: '', sebep: '' };
  },

  // Takma/çıkarma — 3 yuva sınırı + uyumluluk BURADA uygulanır
  takToggle(id) {
    var d = this._takilabilir(id);
    var takili = this._takili();
    if (d.cikar) {
      var yeni = [], i;
      for (i = 0; i < takili.length; i++) if (takili[i] !== id) yeni.push(takili[i]);
      this._takiliYazEt(yeni);
      return { ok: true, cikar: true };
    }
    if (!d.ok) { this._uyari = d.sebep; this._uyariT = 2.2; return { ok: false, sebep: d.sebep }; }
    takili.push(id);
    this._takiliYazEt(takili);
    return { ok: true, cikar: false };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // VERİ TOPLAMA (garaj) — hepsi GERÇEK modüllerden, hepsi null-güvenli
  // ═════════════════════════════════════════════════════════════════════════

  _veri() {
    var simdi = Date.now();
    if (this._vc && (simdi - this._vcT) < 400) return this._vc;

    var S = this._g('SaveData'), E = this._g('Economy'), VD = this._g('VehicleDefs');
    var US = this._g('UpgradeSystem');

    var V = {
      altin: 0, elmas: 0,
      aracId: 'jeep', aracAd: 'JEEP', def: null,
      kat: [], guc: 0, gucMaks: 1, gucYuzde: 0,
      takili: [], upMax: 25
    };

    try {
      if (S && S.data) {
        V.altin = Math.max(0, Math.floor(S.data.gold || 0));
        V.elmas = Math.max(0, Math.floor(S.data.diamonds || 0));
        if (typeof S.data.selectedVehicle === 'string' && S.data.selectedVehicle) {
          V.aracId = S.data.selectedVehicle;
        }
      }
    } catch (e) { }

    try {
      if (VD && VD[V.aracId]) V.def = VD[V.aracId];
      else if (VD && VD.jeep) { V.aracId = 'jeep'; V.def = VD.jeep; }
    } catch (e) { }
    V.aracAd = this._buyukAscii((V.def && V.def.name) ? V.def.name : V.aracId);

    var upMax = 25, mults = { engine: 1.0, suspension: 0.8, tires: 0.8, fuel: 0.6, gravity: 0.9 };
    try {
      if (E) {
        if (typeof E.UP_MAX === 'number' && E.UP_MAX > 1) upMax = Math.floor(E.UP_MAX);
        if (E.STAT_UPGRADE_MULT) mults = E.STAT_UPGRADE_MULT;
      }
    } catch (e) { }
    V.upMax = upMax;

    // ── 4 yükseltme kartı: seviye + maliyet (Economy.getUpgradeCost) ────────
    var i, k, sv, mal;
    for (i = 0; i < this.KATEGORI.length; i++) {
      k = this.KATEGORI[i];
      sv = 1;
      try { if (S && typeof S.getUpgrade === 'function') sv = Math.floor(Number(S.getUpgrade(V.aracId, k.id)) || 1); }
      catch (e) { sv = 1; }
      sv = Math.max(1, Math.min(upMax, sv));
      mal = null;
      try { if (E && typeof E.getUpgradeCost === 'function') mal = E.getUpgradeCost(k.id, sv); }
      catch (e) { mal = null; }
      if (mal == null && sv < upMax && E && E.UPGRADE_LEVEL_COSTS) {
        var t = E.UPGRADE_LEVEL_COSTS[sv + 1];
        if (t != null) mal = Math.floor(t * (mults[k.id] || 1));
      }
      V.kat.push({
        id: k.id, ad: k.ad, ikon: k.ikon, renk: k.renk,
        sv: sv, maks: upMax, maliyet: mal,
        alinir: (mal != null && V.altin >= mal)
      });
    }

    // ── GÜÇ GÖSTERGESİ (referans: ⚡197 /461) ───────────────────────────────
    //   taban = torque/50 (VehicleDefs GERÇEK alanı)
    //   artış = kategori başına (UP_MAX-1) × 4 × STAT_UPGRADE_MULT
    //   oran  = UpgradeSystem.powerScore(aracId) / 100  (oyunun kendi skoru)
    var taban = 100, ek = 0;
    try { if (V.def && V.def.torque) taban = Math.round(Number(V.def.torque) / 50); } catch (e) { }
    for (i = 0; i < this.KATEGORI.length; i++) ek += (upMax - 1) * 4 * (mults[this.KATEGORI[i].id] || 1);
    V.gucMaks = Math.max(1, Math.round(taban + ek));
    var ps = null;
    try { if (US && typeof US.powerScore === 'function') ps = Number(US.powerScore(V.aracId)); } catch (e) { }
    if (ps == null || !isFinite(ps)) {
      var top = 0;
      for (i = 0; i < V.kat.length; i++) top += (V.kat[i].sv - 1);
      ps = (V.kat.length && upMax > 1) ? (top / (V.kat.length * (upMax - 1))) * 100 : 0;
    }
    V.gucYuzde = Math.max(0, Math.min(100, ps));
    V.guc = Math.round(taban + (V.gucMaks - taban) * V.gucYuzde / 100);

    V.takili = this._takili();

    this._vc = V; this._vcT = simdi;
    return V;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // İKONLAR — vektör (emoji YASAK: sanal alanda glif yok, PNG'de boş çıkar)
  //   Her ikon [x, y, s, s] kutusuna çizilir.
  // ═════════════════════════════════════════════════════════════════════════

  _ikon(c, tip, x, y, s, renk) {
    var cx = x + s / 2, cy = y + s / 2, u = s / 100;
    var a = renk || '#e8eef7', koyu = this._ikonIkincil(a);
    c.save();
    c.lineWidth = Math.max(1.4, 6 * u);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    switch (tip) {
      // ── yükseltme kategorileri ──
      case 'piston':
        c.fillStyle = a; this._rr(c, cx - 22 * u, cy - 34 * u, 44 * u, 30 * u, 5 * u); c.fill();
        c.fillStyle = koyu; this._rr(c, cx - 6 * u, cy - 6 * u, 12 * u, 26 * u, 3 * u); c.fill();
        c.fillStyle = a; this._rr(c, cx - 26 * u, cy + 20 * u, 52 * u, 12 * u, 4 * u); c.fill();
        c.fillStyle = koyu; this._rr(c, cx - 18 * u, cy - 28 * u, 36 * u, 5 * u, 2 * u); c.fill();
        break;
      case 'lastik':
        c.fillStyle = koyu; this._daire(c, cx, cy, 34 * u);
        c.fillStyle = a; this._daire(c, cx, cy, 22 * u);
        c.fillStyle = koyu; this._daire(c, cx, cy, 11 * u);
        c.strokeStyle = a; c.lineWidth = Math.max(1.2, 4 * u);
        for (var ti = 0; ti < 8; ti++) {
          var an = ti * Math.PI / 4;
          c.beginPath();
          c.moveTo(cx + Math.cos(an) * 26 * u, cy + Math.sin(an) * 26 * u);
          c.lineTo(cx + Math.cos(an) * 34 * u, cy + Math.sin(an) * 34 * u);
          c.stroke();
        }
        break;
      case 'yay':
        c.strokeStyle = a; c.lineWidth = Math.max(1.6, 7 * u);
        c.beginPath();
        for (var yi = 0; yi <= 24; yi++) {
          var yt = yi / 24;
          var yx = cx + Math.sin(yt * Math.PI * 5) * 18 * u;
          var yy = cy - 30 * u + yt * 56 * u;
          if (yi === 0) c.moveTo(yx, yy); else c.lineTo(yx, yy);
        }
        c.stroke();
        c.fillStyle = a;
        this._rr(c, cx - 24 * u, cy - 38 * u, 48 * u, 9 * u, 3 * u); c.fill();
        this._rr(c, cx - 24 * u, cy + 29 * u, 48 * u, 9 * u, 3 * u); c.fill();
        break;
      case 'dortcek':
        c.fillStyle = a; this._rr(c, cx - 30 * u, cy - 16 * u, 60 * u, 20 * u, 5 * u); c.fill();
        c.fillStyle = koyu;
        this._daire(c, cx - 20 * u, cy + 14 * u, 13 * u);
        this._daire(c, cx + 20 * u, cy + 14 * u, 13 * u);
        c.fillStyle = a;
        this._daire(c, cx - 20 * u, cy + 14 * u, 6 * u);
        this._daire(c, cx + 20 * u, cy + 14 * u, 6 * u);
        c.strokeStyle = a; c.lineWidth = Math.max(1.2, 4 * u);
        c.beginPath(); c.moveTo(cx - 20 * u, cy + 14 * u); c.lineTo(cx + 20 * u, cy + 14 * u); c.stroke();
        break;

      // ── parçalar ──
      // At nalı mıknatıs: ağzı SAĞA bakar, uçlar turuncu (referans 145032).
      case 'magnet':
        c.strokeStyle = a; c.lineWidth = Math.max(3.5, 16 * u);
        c.beginPath(); c.arc(cx + 4 * u, cy, 22 * u, Math.PI * 0.42, Math.PI * 1.58); c.stroke();
        c.strokeStyle = '#ff8a3d'; c.lineWidth = Math.max(3.5, 16 * u);
        c.beginPath();
        c.moveTo(cx + 4 * u + Math.cos(Math.PI * 0.42) * 22 * u, cy + Math.sin(Math.PI * 0.42) * 22 * u);
        c.lineTo(cx + 26 * u, cy + 19 * u); c.stroke();
        c.beginPath();
        c.moveTo(cx + 4 * u + Math.cos(Math.PI * 1.58) * 22 * u, cy + Math.sin(Math.PI * 1.58) * 22 * u);
        c.lineTo(cx + 26 * u, cy - 19 * u); c.stroke();
        break;
      case 'agirlik':
        c.fillStyle = a;
        this._pol(c, [[cx - 26 * u, cy + 26 * u], [cx - 18 * u, cy - 14 * u],
                      [cx + 18 * u, cy - 14 * u], [cx + 26 * u, cy + 26 * u]]);
        c.fill();
        c.strokeStyle = a; c.lineWidth = Math.max(2, 8 * u);
        c.beginPath(); c.arc(cx, cy - 16 * u, 12 * u, Math.PI, 0); c.stroke();
        break;
      // Kanat: eğrisel ön kenar + tüy çizgileri (düz eşkenar dörtgen okunmuyordu)
      case 'kanat':
        c.fillStyle = a;
        c.beginPath();
        c.moveTo(cx - 32 * u, cy + 18 * u);
        c.quadraticCurveTo(cx - 12 * u, cy - 26 * u, cx + 30 * u, cy - 20 * u);
        c.quadraticCurveTo(cx + 6 * u, cy + 2 * u, cx + 12 * u, cy + 22 * u);
        c.quadraticCurveTo(cx - 8 * u, cy + 12 * u, cx - 32 * u, cy + 18 * u);
        c.closePath(); c.fill();
        c.strokeStyle = koyu; c.lineWidth = Math.max(1.2, 4 * u);
        c.beginPath(); c.moveTo(cx - 20 * u, cy + 13 * u); c.lineTo(cx + 14 * u, cy - 15 * u); c.stroke();
        c.beginPath(); c.moveTo(cx - 6 * u, cy + 15 * u); c.lineTo(cx + 14 * u, cy - 2 * u); c.stroke();
        break;
      case 'kafes':
        c.strokeStyle = a; c.lineWidth = Math.max(2, 8 * u);
        c.beginPath();
        c.moveTo(cx - 28 * u, cy + 24 * u); c.lineTo(cx - 20 * u, cy - 16 * u);
        c.lineTo(cx + 20 * u, cy - 16 * u); c.lineTo(cx + 28 * u, cy + 24 * u);
        c.stroke();
        c.beginPath(); c.moveTo(cx - 24 * u, cy + 4 * u); c.lineTo(cx + 24 * u, cy + 4 * u); c.stroke();
        c.beginPath(); c.moveTo(cx, cy - 16 * u); c.lineTo(cx, cy + 24 * u); c.stroke();
        break;
      case 'dumen':
        c.strokeStyle = a; c.lineWidth = Math.max(2.5, 10 * u);
        c.beginPath(); c.arc(cx, cy, 26 * u, 0, Math.PI * 2); c.stroke();
        c.fillStyle = a; this._daire(c, cx, cy, 8 * u);
        c.lineWidth = Math.max(1.8, 7 * u);
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy + 26 * u); c.stroke();
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - 22 * u, cy - 13 * u); c.stroke();
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 22 * u, cy - 13 * u); c.stroke();
        break;
      case 'karlastik':
        c.fillStyle = koyu; this._daire(c, cx, cy, 30 * u);
        c.fillStyle = a; this._daire(c, cx, cy, 17 * u);
        c.strokeStyle = '#8fe9ff'; c.lineWidth = Math.max(1.2, 5 * u);
        for (var ki = 0; ki < 6; ki++) {
          var ka = ki * Math.PI / 3;
          c.beginPath();
          c.moveTo(cx + Math.cos(ka) * 18 * u, cy + Math.sin(ka) * 18 * u);
          c.lineTo(cx + Math.cos(ka) * 30 * u, cy + Math.sin(ka) * 30 * u);
          c.stroke();
        }
        break;
      case 'roket':
        c.fillStyle = a;
        this._pol(c, [[cx, cy - 32 * u], [cx + 14 * u, cy - 4 * u],
                      [cx + 14 * u, cy + 16 * u], [cx - 14 * u, cy + 16 * u],
                      [cx - 14 * u, cy - 4 * u]]);
        c.fill();
        c.fillStyle = '#ff5a5a';
        this._pol(c, [[cx - 14 * u, cy + 4 * u], [cx - 26 * u, cy + 20 * u], [cx - 14 * u, cy + 16 * u]]); c.fill();
        this._pol(c, [[cx + 14 * u, cy + 4 * u], [cx + 26 * u, cy + 20 * u], [cx + 14 * u, cy + 16 * u]]); c.fill();
        c.fillStyle = '#ffcf3f';
        this._pol(c, [[cx - 9 * u, cy + 16 * u], [cx + 9 * u, cy + 16 * u], [cx, cy + 34 * u]]); c.fill();
        break;
      case 'wheelie':
        c.fillStyle = a;
        this._pol(c, [[cx - 30 * u, cy + 10 * u], [cx - 6 * u, cy - 6 * u],
                      [cx + 16 * u, cy - 6 * u], [cx + 26 * u, cy + 10 * u]]);
        c.fill();
        c.fillStyle = koyu; this._daire(c, cx - 22 * u, cy + 18 * u, 12 * u);
        c.fillStyle = a; this._daire(c, cx - 22 * u, cy + 18 * u, 5 * u);
        c.strokeStyle = '#ffcf3f'; c.lineWidth = Math.max(1.4, 5 * u);
        c.beginPath(); c.arc(cx + 4 * u, cy + 2 * u, 26 * u, Math.PI * 1.15, Math.PI * 1.75); c.stroke();
        break;
      case 'duman':
        c.fillStyle = a;
        this._daire(c, cx - 14 * u, cy + 6 * u, 14 * u);
        this._daire(c, cx + 4 * u, cy - 2 * u, 17 * u);
        this._daire(c, cx + 22 * u, cy + 8 * u, 11 * u);
        c.fillStyle = koyu; this._rr(c, cx - 30 * u, cy + 12 * u, 22 * u, 10 * u, 4 * u); c.fill();
        break;
      case 'takla':
        c.strokeStyle = a; c.lineWidth = Math.max(2.4, 9 * u);
        c.beginPath(); c.arc(cx, cy, 24 * u, Math.PI * 0.25, Math.PI * 1.85); c.stroke();
        c.fillStyle = a;
        this._pol(c, [[cx + 17 * u, cy + 6 * u], [cx + 30 * u, cy + 14 * u], [cx + 14 * u, cy + 22 * u]]); c.fill();
        c.fillStyle = '#ffcf3f'; this._daire(c, cx, cy, 8 * u);
        break;
      case 'zipla':
        c.strokeStyle = a; c.lineWidth = Math.max(2, 8 * u);
        c.beginPath();
        for (var zi = 0; zi <= 16; zi++) {
          var zt = zi / 16;
          var zx = cx + Math.sin(zt * Math.PI * 4) * 15 * u;
          var zy = cy + 26 * u - zt * 34 * u;
          if (zi === 0) c.moveTo(zx, zy); else c.lineTo(zx, zy);
        }
        c.stroke();
        c.fillStyle = '#59d67a';
        this._pol(c, [[cx, cy - 34 * u], [cx + 13 * u, cy - 16 * u], [cx - 13 * u, cy - 16 * u]]); c.fill();
        break;
      case 'inis':
        c.strokeStyle = a; c.lineWidth = Math.max(2, 8 * u);
        c.beginPath(); c.moveTo(cx, cy - 30 * u); c.lineTo(cx, cy + 10 * u); c.stroke();
        c.fillStyle = a;
        this._pol(c, [[cx - 15 * u, cy + 4 * u], [cx + 15 * u, cy + 4 * u], [cx, cy + 24 * u]]); c.fill();
        c.fillStyle = '#59d67a'; this._rr(c, cx - 28 * u, cy + 26 * u, 56 * u, 8 * u, 3 * u); c.fill();
        break;
      case 'turbo':
        c.fillStyle = koyu; this._daire(c, cx, cy, 30 * u);
        c.fillStyle = a;
        for (var vi = 0; vi < 6; vi++) {
          var va = vi * Math.PI / 3 + 0.4;
          this._pol(c, [[cx, cy],
                        [cx + Math.cos(va) * 28 * u, cy + Math.sin(va) * 28 * u],
                        [cx + Math.cos(va + 0.55) * 28 * u, cy + Math.sin(va + 0.55) * 28 * u]]);
          c.fill();
        }
        c.fillStyle = koyu; this._daire(c, cx, cy, 9 * u);
        break;
      case 'alev':
        c.fillStyle = '#ff8a3d';
        c.beginPath();
        c.moveTo(cx, cy - 32 * u);
        c.quadraticCurveTo(cx + 24 * u, cy - 4 * u, cx + 14 * u, cy + 16 * u);
        c.quadraticCurveTo(cx + 2 * u, cy + 32 * u, cx - 14 * u, cy + 18 * u);
        c.quadraticCurveTo(cx - 26 * u, cy - 2 * u, cx, cy - 32 * u);
        c.closePath(); c.fill();
        c.fillStyle = '#ffcf3f';
        c.beginPath();
        c.moveTo(cx + 1 * u, cy - 10 * u);
        c.quadraticCurveTo(cx + 12 * u, cy + 6 * u, cx, cy + 22 * u);
        c.quadraticCurveTo(cx - 11 * u, cy + 6 * u, cx + 1 * u, cy - 10 * u);
        c.closePath(); c.fill();
        break;
      case 'spoiler':
        c.fillStyle = a; this._rr(c, cx - 32 * u, cy - 18 * u, 64 * u, 11 * u, 4 * u); c.fill();
        c.fillStyle = a;
        this._rr(c, cx - 22 * u, cy - 7 * u, 9 * u, 22 * u, 3 * u); c.fill();
        this._rr(c, cx + 13 * u, cy - 7 * u, 9 * u, 22 * u, 3 * u); c.fill();
        c.fillStyle = koyu; this._rr(c, cx - 34 * u, cy + 15 * u, 68 * u, 10 * u, 4 * u); c.fill();
        break;
      case 'itici':
        c.fillStyle = a;
        this._rr(c, cx - 26 * u, cy - 26 * u, 16 * u, 34 * u, 4 * u); c.fill();
        this._rr(c, cx + 10 * u, cy - 26 * u, 16 * u, 34 * u, 4 * u); c.fill();
        c.fillStyle = '#4fd0ff';
        this._pol(c, [[cx - 26 * u, cy + 8 * u], [cx - 10 * u, cy + 8 * u], [cx - 18 * u, cy + 32 * u]]); c.fill();
        this._pol(c, [[cx + 10 * u, cy + 8 * u], [cx + 26 * u, cy + 8 * u], [cx + 18 * u, cy + 32 * u]]); c.fill();
        break;
      case 'yakit':
        c.fillStyle = a; this._rr(c, cx - 20 * u, cy - 20 * u, 36 * u, 44 * u, 5 * u); c.fill();
        c.fillStyle = koyu; this._rr(c, cx - 13 * u, cy - 12 * u, 22 * u, 14 * u, 3 * u); c.fill();
        c.fillStyle = a; this._rr(c, cx + 16 * u, cy - 12 * u, 12 * u, 7 * u, 2 * u); c.fill();
        c.fillStyle = '#59d67a'; this._rr(c, cx - 13 * u, cy + 6 * u, 22 * u, 12 * u, 3 * u); c.fill();
        break;
      case 'sikke':
        c.fillStyle = '#ffcf3f'; this._daire(c, cx, cy, 28 * u);
        c.fillStyle = '#b5851f'; this._daire(c, cx, cy, 21 * u);
        c.fillStyle = '#ffcf3f'; this._daire(c, cx, cy, 16 * u);
        c.fillStyle = '#8a5f22'; this._rr(c, cx - 4 * u, cy - 12 * u, 8 * u, 24 * u, 2 * u); c.fill();
        break;
      case 'nitro':
        c.fillStyle = a; this._rr(c, cx - 15 * u, cy - 24 * u, 30 * u, 48 * u, 8 * u); c.fill();
        c.fillStyle = koyu; this._rr(c, cx - 7 * u, cy - 34 * u, 14 * u, 12 * u, 3 * u); c.fill();
        c.fillStyle = '#4fd0ff'; this._rr(c, cx - 10 * u, cy - 12 * u, 20 * u, 26 * u, 4 * u); c.fill();
        break;
      case 'amfi':
        c.fillStyle = koyu; this._rr(c, cx - 28 * u, cy - 28 * u, 56 * u, 56 * u, 6 * u); c.fill();
        c.strokeStyle = '#ff8a3d'; c.lineWidth = Math.max(1.6, 6 * u);
        this._rr(c, cx - 28 * u, cy - 28 * u, 56 * u, 56 * u, 6 * u); c.stroke();
        c.fillStyle = a; this._daire(c, cx, cy, 18 * u);
        c.fillStyle = koyu; this._daire(c, cx, cy, 7 * u);
        break;
      case 'dalga':
        c.strokeStyle = a; c.lineWidth = Math.max(2, 7 * u);
        c.beginPath(); c.arc(cx - 6 * u, cy, 10 * u, -1.1, 1.1); c.stroke();
        c.beginPath(); c.arc(cx - 6 * u, cy, 19 * u, -1.1, 1.1); c.stroke();
        c.beginPath(); c.arc(cx - 6 * u, cy, 28 * u, -1.1, 1.1); c.stroke();
        c.fillStyle = a; this._daire(c, cx - 16 * u, cy, 6 * u);
        break;

      // ── arayüz ikonları ──
      case 'anahtar':
        c.strokeStyle = a; c.lineWidth = Math.max(3, 13 * u);
        c.beginPath(); c.moveTo(cx - 16 * u, cy + 18 * u); c.lineTo(cx + 12 * u, cy - 12 * u); c.stroke();
        c.lineWidth = Math.max(2.4, 10 * u);
        c.beginPath(); c.arc(cx + 17 * u, cy - 17 * u, 12 * u, 0.6, 5.2); c.stroke();
        break;
      case 'palet':
        c.fillStyle = a;
        c.beginPath();
        c.arc(cx, cy, 28 * u, 0, Math.PI * 2);
        c.closePath(); c.fill();
        c.fillStyle = '#ff5a5a'; this._daire(c, cx - 12 * u, cy - 10 * u, 6 * u);
        c.fillStyle = '#4aa8ff'; this._daire(c, cx + 6 * u, cy - 14 * u, 6 * u);
        c.fillStyle = '#59d67a'; this._daire(c, cx + 15 * u, cy + 3 * u, 6 * u);
        c.fillStyle = '#ffcf3f'; this._daire(c, cx - 5 * u, cy + 13 * u, 6 * u);
        c.fillStyle = '#141a26'; this._daire(c, cx + 14 * u, cy + 17 * u, 8 * u);
        break;
      case 'simsek':
        c.fillStyle = a;
        this._pol(c, [[cx + 6 * u, cy - 32 * u], [cx - 20 * u, cy + 6 * u], [cx - 2 * u, cy + 6 * u],
                      [cx - 8 * u, cy + 32 * u], [cx + 20 * u, cy - 8 * u], [cx + 2 * u, cy - 8 * u]]);
        c.fill();
        break;
      case 'elmas':
        c.fillStyle = a;
        this._pol(c, [[cx, cy - 24 * u], [cx + 26 * u, cy - 2 * u], [cx, cy + 26 * u], [cx - 26 * u, cy - 2 * u]]);
        c.fill();
        c.strokeStyle = '#0e1320'; c.lineWidth = Math.max(1, 3 * u);
        c.beginPath(); c.moveTo(cx - 26 * u, cy - 2 * u); c.lineTo(cx + 26 * u, cy - 2 * u); c.stroke();
        break;
      case 'kilit':
        c.fillStyle = a; this._rr(c, cx - 18 * u, cy - 4 * u, 36 * u, 28 * u, 5 * u); c.fill();
        c.strokeStyle = a; c.lineWidth = Math.max(2, 8 * u);
        c.beginPath(); c.arc(cx, cy - 6 * u, 12 * u, Math.PI, 0); c.stroke();
        break;
      case 'arti':
        c.strokeStyle = a; c.lineWidth = Math.max(2.4, 10 * u);
        c.beginPath(); c.moveTo(cx - 18 * u, cy); c.lineTo(cx + 18 * u, cy); c.stroke();
        c.beginPath(); c.moveTo(cx, cy - 18 * u); c.lineTo(cx, cy + 18 * u); c.stroke();
        break;
      case 'ok':
        c.fillStyle = a;
        this._pol(c, [[cx, cy - 20 * u], [cx + 18 * u, cy + 2 * u], [cx + 8 * u, cy + 2 * u],
                      [cx + 8 * u, cy + 20 * u], [cx - 8 * u, cy + 20 * u], [cx - 8 * u, cy + 2 * u],
                      [cx - 18 * u, cy + 2 * u]]);
        c.fill();
        break;
      case 'onay':
        c.strokeStyle = a; c.lineWidth = Math.max(2.6, 11 * u);
        c.beginPath();
        c.moveTo(cx - 18 * u, cy + 1 * u);
        c.lineTo(cx - 5 * u, cy + 14 * u);
        c.lineTo(cx + 19 * u, cy - 14 * u);
        c.stroke();
        break;
      case 'yasak':
        c.strokeStyle = a; c.lineWidth = Math.max(2.4, 9 * u);
        c.beginPath(); c.arc(cx, cy, 24 * u, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(cx - 17 * u, cy - 17 * u); c.lineTo(cx + 17 * u, cy + 17 * u); c.stroke();
        break;
      default:
        c.fillStyle = a; this._rr(c, cx - 20 * u, cy - 20 * u, 40 * u, 40 * u, 6 * u); c.fill();
        break;
    }
    c.restore();
  },

  // Parça id → ikon adı
  _parcaIkon(id) {
    switch (id) {
      case 'magnet': return 'magnet';
      case 'heavyweight': return 'agirlik';
      case 'wings': return 'kanat';
      case 'rollcage': return 'kafes';
      case 'air_control': return 'dumen';
      case 'winter_tires': return 'karlastik';
      case 'start_boost': return 'roket';
      case 'wheelie_boost': return 'wheelie';
      case 'fume_boost': return 'duman';
      case 'flip_boost': return 'takla';
      case 'jump_shocks': return 'zipla';
      case 'landing_boost': return 'inis';
      case 'overcharged_turbo': return 'turbo';
      case 'afterburner': return 'alev';
      case 'spoiler': return 'spoiler';
      case 'thrusters': return 'itici';
      case 'fuel_boost': return 'yakit';
      case 'coin_boost': return 'sikke';
      case 'nitro': return 'nitro';
      case 'amplifier': return 'amfi';
      case 'echo': return 'dalga';
      default: return 'kutu';
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ORTAK ÇİZİM BLOKLARI
  // ═════════════════════════════════════════════════════════════════════════

  // Garaj arka planı (referans: ahşap duvar + zemin + yan raflar)
  _arkaplan(c, W, H, ufuk) {
    c.fillStyle = this._gr(c, 'duvar', 0, 0, 0, ufuk, [[0, this.C.duvar], [1, this.C.duvar2]]);
    c.fillRect(0, 0, W, ufuk);
    c.fillStyle = this._gr(c, 'yer', 0, ufuk, 0, H, [[0, this.C.zeminAl], [1, '#2a1d12']]);
    c.fillRect(0, ufuk, W, H - ufuk);
    // duvar tahtaları
    c.strokeStyle = '#241708'; c.lineWidth = 1;
    var i, adim = Math.max(28, Math.round(W / 14));
    for (i = adim; i < W; i += adim) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, ufuk); c.stroke();
    }
    // zemin ışığı (radyal, ÖNBELLEKLİ)
    c.fillStyle = this._grR(c, 'sahne', W / 2, ufuk, 0, Math.max(W, H) * 0.62,
      [[0, '#ffd9a0'], [1, '#3a2b1e']]);
    c.globalAlpha = 0.18;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
  },

  // Üst para şeridi
  _paraSerit(c, W, H, y, h, V) {
    c.fillStyle = this.C.koyu;
    c.globalAlpha = 0.86; c.fillRect(0, y, W, h); c.globalAlpha = 1;
    c.strokeStyle = this.C.cizgi; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, y + h); c.lineTo(W, y + h); c.stroke();

    var ik = Math.min(h * 0.56, 26), pad = Math.max(8, W * 0.025);
    var px = this._f(c, W, H, 0.036, 0.020, 10, 18, 'bold');
    var oy = y + h / 2 + px * 0.36;

    this._ikon(c, 'elmas', pad, y + (h - ik) / 2, ik, this.C.elmas);
    c.fillStyle = this.C.yazi;
    this._yaz(c, this._kisaSayi(V.elmas), pad + ik + 5, oy, W * 0.22, 'left');

    var ax = pad + ik + 5 + W * 0.22 + pad;
    this._ikon(c, 'sikke', ax, y + (h - ik) / 2, ik, this.C.altin);
    c.fillStyle = this.C.yazi;
    this._yaz(c, this._kisaSayi(V.altin), ax + ik + 5, oy, W * 0.24, 'left');
  },

  // Araç çizimi — 1. tercih oyunun GERÇEK çizimi (UI._drawMenuCar → drawVehicle)
  _arac(c, V, x, y, w, h) {
    if (w <= 4 || h <= 4) return;
    var def = V.def, i;
    var gw = (def && def.w) ? def.w : 110, gh = (def && def.h) ? def.h : 48;
    var wl = (def && def.wheels) ? def.wheels : [{ x: -40, y: 22, r: 20 }, { x: 42, y: 22, r: 20 }];
    var solX = -gw / 2, sagX = gw / 2, ustY = -gh * 1.5, altY = gh * 0.2;
    for (i = 0; i < wl.length; i++) {
      var r = wl[i].r || wl[i].radius || 18;
      solX = Math.min(solX, (wl[i].x || 0) - r);
      sagX = Math.max(sagX, (wl[i].x || 0) + r);
      altY = Math.max(altY, (wl[i].y || 0) + r);
    }
    var bw = Math.max(1, sagX - solX), bh = Math.max(1, altY - ustY);
    var o = Math.min(w / bw, h / bh);
    if (!isFinite(o) || o <= 0) return;
    var mx = x + w / 2 - ((solX + sagX) / 2) * o;
    var my = y + h / 2 - ((ustY + altY) / 2) * o;

    var u = this._g('UI');
    if (def && u && typeof u._drawMenuCar === 'function') {
      try {
        c.save();
        this._rr(c, x, y, w, h, 4); c.clip();
        c.translate(mx, my);
        // 🔴 DIŞ ÇİZİM PENCERESİ: drawVehicle (vehicles.js) maxWidth'siz
        //   fillText çağırıyor ve KARE BAŞINA gradyan üretiyor. Bunlar bu
        //   modülün kuralı değil — ölçüm ayrı kovaya yazılsın diye işaretlenir.
        this._disCizim = true;
        u._drawMenuCar(c, V.aracId, this._t, o * gw);
        this._disCizim = false;
        c.restore();
        return;
      } catch (e) { this._disCizim = false; try { c.restore(); } catch (e2) { } }
    }

    // YEDEK siluet — kutu dışına ASLA taşmaz (clip)
    c.save();
    this._rr(c, x, y, w, h, 4); c.clip();
    c.translate(mx, my);
    c.scale(o, o);
    c.globalAlpha = 0.30; c.fillStyle = '#000000';
    this._elips(c, 0, altY * 0.98, bw * 0.42, Math.max(2, bh * 0.055));
    c.globalAlpha = 1;
    c.fillStyle = (def && def.color) ? def.color : '#5a8a3c';
    this._rr(c, -gw / 2, -gh, gw, gh, Math.min(9, gh * 0.26)); c.fill();
    c.fillStyle = (def && def.color2) ? def.color2 : '#222831';
    this._rr(c, -gw * 0.24, -gh * 1.42, gw * 0.50, gh * 0.52, 4); c.fill();
    for (i = 0; i < wl.length; i++) {
      var rr = wl[i].r || wl[i].radius || 18;
      c.fillStyle = '#181c24'; this._daire(c, wl[i].x || 0, wl[i].y || 0, rr);
      c.fillStyle = '#7b8798'; this._daire(c, wl[i].x || 0, wl[i].y || 0, rr * 0.45);
    }
    c.restore();
  },

  // Uyarı balonu (uyumsuz parça / yuva dolu)
  // 🔴 KONUM: ALT BUTON ŞERİDİNİN HEMEN ÜSTÜ. İlk yazımda `H*0.14` idi ve
  //   PNG'de yükseltme kartlarının + stat satırlarının ÜSTÜNE biniyordu.
  _uyariCiz(c, W, H, altH) {
    if (this._uyariT <= 0 || !this._uyari) return;
    var px = this._f(c, W, H, 0.036, 0.019, 10, 17, 'bold');
    var w = Math.min(W * 0.86, this._mw(c, this._uyari) + px * 3.2);
    var h = px * 2.4;
    var x = (W - w) / 2;
    var y = Math.max(4, H - (altH || 56) - h - 8);
    c.globalAlpha = Math.max(0, Math.min(1, this._uyariT));
    this._kart(c, x, y, w, h, 8, '#5a1d1d', '#3a1010', this.C.kirmizi);
    c.fillStyle = '#ffd7d7';
    this._yaz(c, this._uyari, x + w / 2, y + h / 2 + px * 0.36, w - px, 'center');
    c.globalAlpha = 1;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DÜZEN — GARAJ
  // ═════════════════════════════════════════════════════════════════════════

  _duzenGaraj(W, H) {
    var yatay = W > H;
    var pad = Math.round(Math.max(8, Math.min(14, W * 0.03)));
    var ustH = Math.round(Math.max(38, Math.min(54, H * 0.062)));
    var altH = Math.round(Math.max(52, Math.min(70, H * 0.078)));

    var kartH = yatay
      ? Math.round(Math.max(78, Math.min(104, H * 0.26)))
      : Math.round(Math.max(104, Math.min(152, H * 0.185)));
    var satirW = yatay ? Math.round(Math.min(W * 0.68, 580)) : (W - pad * 2);
    var satirX = Math.round((W - satirW) / 2);
    var g = Math.round(Math.max(5, pad * 0.55));
    var kartW = Math.max(44, Math.floor((satirW - g * 3) / 4));
    var kartY = ustH + pad;

    var sahneY = kartY + kartH + pad;
    var sahneH = Math.max(60, H - altH - pad - sahneY);

    var yanB = Math.round(Math.max(48, Math.min(74, Math.min(W, H) * 0.135)));

    var aracX = pad * 2 + yanB;
    var aracW = Math.max(60, W - aracX * 2);
    var aracH = Math.max(40, Math.round(sahneH * 0.60));
    // Araç + ad + güç bloğu sahnede DİKEY ORTALANIR (PNG'de altta 130 px boşluk
    // kalıyordu; blok yukarı yapışıktı).
    var aracY = sahneY + Math.max(0, Math.round((sahneH - (aracH + sahneH * 0.22)) / 2));
    var yanCY = aracY + aracH * 0.5;

    return {
      W: W, H: H, yatay: yatay, pad: pad, ustH: ustH, altH: altH,
      kartY: kartY, kartH: kartH, kartW: kartW, satirX: satirX, g: g,
      sahneY: sahneY, sahneH: sahneH,
      yanB: yanB, yanCY: yanCY,
      arac: { x: aracX, y: aracY, w: aracW, h: aracH }
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ÇİZİM — GARAJ
  // ═════════════════════════════════════════════════════════════════════════

  _cizGaraj(c, W, H, V) {
    var D = this._duzenGaraj(W, H);
    var i, px;

    this._arkaplan(c, W, H, D.sahneY + D.sahneH * 0.52);

    // ── 4 YÜKSELTME KARTI (ÜSTTE — kullanıcı kuralı) ──────────────────────
    for (i = 0; i < V.kat.length && i < 4; i++) {
      this._yukseltmeKarti(c, W, H,
        D.satirX + i * (D.kartW + D.g), D.kartY, D.kartW, D.kartH, V.kat[i]);
    }

    // ── SOL: 🔧 PARÇA · SAĞ: 🎨 BOYA ──────────────────────────────────────
    var by = Math.round(D.yanCY - D.yanB / 2);
    this._yanButon(c, W, H, D.pad, by, D.yanB, 'anahtar', 'PARÇA',
      'garaj_parca', this.C.mavi, V.takili.length + '/' + this.YUVA);
    this._yanButon(c, W, H, W - D.pad - D.yanB, by, D.yanB, 'palet', 'BOYA',
      'garaj_boya', this.C.mor, '');

    // ── ORTA: araç + adı + güç ────────────────────────────────────────────
    this._arac(c, V, D.arac.x, D.arac.y, D.arac.w, D.arac.h);

    var adY = D.arac.y + D.arac.h + Math.max(14, D.sahneH * 0.10);
    px = this._f(c, W, H, 0.062, 0.030, 14, 30, 'bold');
    c.fillStyle = '#ffffff';
    this._yaz(c, V.aracAd, W / 2, adY, D.arac.w * 0.94, 'center');

    // güç göstergesi (referans: ⚡ 197 /461)
    var gy = adY + Math.max(16, px * 0.95);
    var ik = Math.max(14, Math.min(24, px * 0.8));
    px = this._f(c, W, H, 0.050, 0.024, 12, 24, 'bold');
    var s1 = this._sayi(V.guc), s2 = ' /' + this._sayi(V.gucMaks);
    var w1 = this._mw(c, s1), w2 = this._mw(c, s2);
    var top = ik + 5 + w1 + w2;
    var gx = W / 2 - top / 2;
    this._ikon(c, 'simsek', gx, gy - ik * 0.78, ik, this.C.kirmizi);
    c.fillStyle = '#ffffff';
    this._yaz(c, s1, gx + ik + 5, gy, w1 + 2, 'left');
    c.fillStyle = this.C.alt;
    this._yaz(c, s2, gx + ik + 5 + w1, gy, w2 + 2, 'left');

    // araç değiştirme dokunma alanı (yan butonların ARASINDA — çakışma yok)
    var arX = D.pad + D.yanB + D.pad;
    var arW = Math.max(44, W - arX * 2);
    var arY = D.arac.y;
    var arH = Math.max(44, Math.min(D.sahneH - 6, (gy + 8) - arY));
    this._buton('garaj_arac', arX, arY, arW, arH, { aracId: V.aracId });

    // ── ALT: GERİ / BAŞLA ─────────────────────────────────────────────────
    // 🔴 altH en az 52 -> bh en az 44 (dokunma hedefi). Payı 8'den BÜYÜTME.
    var bh = D.altH - 8;
    var byy = H - D.altH + 4;
    var gw = Math.round(Math.max(96, Math.min(180, W * 0.30)));
    var sw = Math.round(Math.max(120, Math.min(230, W * 0.36)));

    this._duzButon(c, W, H, D.pad, byy, gw, bh, 'GERİ', 'garaj_geri', '#5a6172', '#343a46');
    this._duzButon(c, W, H, W - D.pad - sw, byy, sw, bh, 'BAŞLA', 'garaj_basla', '#7ce38a', '#2f8f45');

    this._uyariCiz(c, W, H, D.altH);
  },

  _yukseltmeKarti(c, W, H, x, y, w, h, K) {
    var maks = (K.sv >= K.maks);
    var kenar = maks ? this.C.altin : this.C.ahsap;
    this._kart(c, x, y, w, h, 7, this.C.ahsap, this.C.ahsap2, kenar);
    this._kart(c, x + 3, y + 3, w - 6, h - 6, 5, '#e7c079', '#b9832c', '');

    var px = this._f(c, W, H, 0.030, 0.0155, 8, 14, 'bold');
    c.fillStyle = '#3a2408';
    this._yaz(c, this._buyuk(K.ad), x + w / 2, y + 5 + px, w - 8, 'center');

    // ikon
    var ikY = y + 8 + px;
    var ikH = Math.max(16, h * 0.34);
    var ikS = Math.min(w - 14, ikH);
    this._ikon(c, K.ikon, x + (w - ikS) / 2, ikY, ikS, '#6b4a12');

    // seviye
    px = this._f(c, W, H, 0.034, 0.0175, 9, 16, 'bold');
    var svY = ikY + ikH + px * 0.9;
    c.fillStyle = '#2c1c06';
    this._yaz(c, K.sv + '/' + K.maks, x + w / 2, svY, w - 8, 'center');

    // alt pil: MAKS ya da maliyet
    var pilH = Math.max(13, Math.min(22, h * 0.18));
    var pilY = y + h - pilH - 5;
    var pilX = x + 5, pilW = w - 10;
    if (maks) {
      c.fillStyle = this._gr(c, 'maks', pilX, pilY, pilX, pilY + pilH, [[0, '#ffd75e'], [1, '#e09a12']]);
      this._rr(c, pilX, pilY, pilW, pilH, 3); c.fill();
      px = this._f(c, W, H, 0.030, 0.0150, 8, 14, 'bold');
      c.fillStyle = '#402a05';
      this._yaz(c, 'MAKS', pilX + pilW / 2, pilY + pilH / 2 + px * 0.36, pilW - 4, 'center');
    } else {
      var alinir = K.alinir;
      c.fillStyle = this._gr(c, alinir ? 'satAl' : 'satYok', pilX, pilY, pilX, pilY + pilH,
        alinir ? [[0, '#7ce38a'], [1, '#2f8f45']] : [[0, '#6c7382'], [1, '#3d434f']]);
      this._rr(c, pilX, pilY, pilW, pilH, 3); c.fill();
      px = this._f(c, W, H, 0.028, 0.0140, 7, 13, 'bold');
      var ci = Math.min(pilH - 4, px * 1.25);
      var mt = this._kisaSayi(K.maliyet == null ? 0 : K.maliyet);
      var mw = this._mw(c, mt);
      var tot = ci + 3 + mw;
      var mx0 = pilX + pilW / 2 - tot / 2;
      this._ikon(c, 'sikke', mx0, pilY + (pilH - ci) / 2, ci, this.C.altin);
      c.fillStyle = '#ffffff';
      this._yaz(c, mt, mx0 + ci + 3, pilY + pilH / 2 + px * 0.36, pilW - ci - 8, 'left');
    }

    this._buton('garaj_yukselt', x, y, w, h, { stat: K.id, sv: K.sv, maliyet: K.maliyet });
  },

  _yanButon(c, W, H, x, y, s, ikon, etiket, id, renk, rozet) {
    this._kart(c, x, y, s, s, 10, '#26304a', '#141b2a', renk);
    this._ikon(c, ikon, x + s * 0.18, y + s * 0.14, s * 0.64, renk);
    var px = this._f(c, W, H, 0.026, 0.0135, 7, 12, 'bold');
    c.fillStyle = '#dce6f5';
    this._yaz(c, etiket, x + s / 2, y + s - 5, s - 6, 'center');
    if (rozet) {
      var rw = Math.max(20, s * 0.44), rh = Math.max(13, s * 0.26);
      var rx = x + s - rw * 0.72, ry = y - rh * 0.28;
      c.fillStyle = renk;
      this._rr(c, rx, ry, rw, rh, rh / 2); c.fill();
      px = this._f(c, W, H, 0.024, 0.0125, 7, 12, 'bold');
      c.fillStyle = '#0e1320';
      this._yaz(c, rozet, rx + rw / 2, ry + rh / 2 + px * 0.36, rw - 3, 'center');
    }
    this._buton(id, x, y, s, s, {});
  },

  _duzButon(c, W, H, x, y, w, h, etiket, id, ust, alt) {
    this._kart(c, x, y, w, h, 8, ust, alt, '#0e1320');
    var px = this._f(c, W, H, 0.048, 0.024, 12, 22, 'bold');
    c.fillStyle = '#0e1320';
    this._yaz(c, etiket, x + w / 2, y + h / 2 + px * 0.36 + 1, w - 10, 'center');
    c.fillStyle = '#ffffff';
    this._yaz(c, etiket, x + w / 2, y + h / 2 + px * 0.36, w - 10, 'center');
    this._buton(id, x, y, w, h, {});
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DÜZEN — PARÇA GARAJI
  // ═════════════════════════════════════════════════════════════════════════

  _duzenParca(W, H) {
    var yatay = W > H;
    var pad = Math.round(Math.max(8, Math.min(14, W * 0.03)));
    var ustH = Math.round(Math.max(38, Math.min(54, H * 0.062)));
    var altH = Math.round(Math.max(52, Math.min(70, H * 0.078)));
    var icY = ustH + pad;
    var icH = Math.max(120, H - ustH - altH - pad * 2);

    var sol, sag, detay, env, ekip, onizleme;
    if (yatay) {
      var solW = Math.round((W - pad * 3) * 0.56);
      var sagW = W - pad * 3 - solW;
      sol = { x: pad, y: icY, w: solW, h: icH };
      sag = { x: pad * 2 + solW, y: icY, w: sagW, h: icH };
      // Yatayda 112 px TABAN: iki dikey buton (44+6+44) + ic pay sigsin diye.
      // 104 px iken YUKSELT butonu HIC cizilmiyordu (PNG'de yakalandi).
      var dH = Math.round(Math.max(112, Math.min(150, icH * 0.40)));
      detay = { x: sol.x, y: sol.y, w: sol.w, h: dH };
      env = { x: sol.x, y: sol.y + dH + pad, w: sol.w, h: Math.max(80, sol.h - dH - pad) };
      var eH = Math.round(Math.max(100, Math.min(150, sag.h * 0.42)));
      ekip = { x: sag.x, y: sag.y, w: sag.w, h: eH };
      onizleme = { x: sag.x, y: sag.y + eH + pad, w: sag.w, h: Math.max(50, sag.h - eH - pad) };
    } else {
      var dH2 = Math.round(Math.max(112, Math.min(150, H * 0.155)));
      var eH2 = Math.round(Math.max(104, Math.min(150, H * 0.145)));
      detay = { x: pad, y: icY, w: W - pad * 2, h: dH2 };
      ekip  = { x: pad, y: icY + dH2 + pad, w: W - pad * 2, h: eH2 };
      env   = { x: pad, y: icY + dH2 + eH2 + pad * 2, w: W - pad * 2,
                h: Math.max(90, icH - dH2 - eH2 - pad * 2) };
      onizleme = null;
      sol = detay; sag = ekip;
    }

    var sut = 4;
    var eg = Math.round(Math.max(6, pad * 0.6));
    var icPad = 8;
    var fW = Math.max(44, Math.floor((env.w - icPad * 2 - eg * (sut - 1)) / sut));
    // 🔴 EN AZ 2 SATIR GÖRÜNMELİ. Yatayda envanter yüksekliği 144 px'e düşüyor ve
    //   fW*1.14 = 112 px'lik fayansla TEK SATIR kalıyordu (PNG'de görüldü).
    //   basH = panel başlığı için ayrılan pay (yaklaşık, _envanter ile uyumlu).
    var basH = 26;
    var gorH = Math.max(52, env.h - basH - 5);
    var fH = Math.max(52, Math.min(Math.round(fW * 1.14), Math.floor((gorH - eg) / 2)));

    return {
      W: W, H: H, yatay: yatay, pad: pad, ustH: ustH, altH: altH,
      detay: detay, ekip: ekip, env: env, onizleme: onizleme,
      sut: sut, eg: eg, icPad: icPad, fW: fW, fH: fH
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ÇİZİM — PARÇA GARAJI
  // ═════════════════════════════════════════════════════════════════════════

  _cizParca(c, W, H, V) {
    var D = this._duzenParca(W, H);
    var takili = V.takili;

    // arka plan (garajın loş hâli)
    this._arkaplan(c, W, H, H * 0.55);
    c.fillStyle = this.C.koyu;
    c.globalAlpha = 0.62; c.fillRect(0, 0, W, H); c.globalAlpha = 1;

    // yatayda sağda araç önizlemesi (referanstaki gibi)
    if (D.onizleme && D.onizleme.h > 40) {
      this._arac(c, V, D.onizleme.x, D.onizleme.y, D.onizleme.w, D.onizleme.h);
    }

    this._detayKarti(c, W, H, D, takili);
    this._ekipmanPaneli(c, W, H, D, takili);
    this._envanter(c, W, H, D, takili);

    // ── ALT: GERİ / DONE ──────────────────────────────────────────────────
    var bh = D.altH - 8, by = H - D.altH + 4;
    var gw = Math.round(Math.max(96, Math.min(170, W * 0.28)));
    var dw = Math.round(Math.max(110, Math.min(210, W * 0.32)));
    this._duzButon(c, W, H, D.pad, by, gw, bh, 'GERİ', 'parca_geri', '#5a6172', '#343a46');
    this._duzButon(c, W, H, W - D.pad - dw, by, dw, bh, 'DONE', 'parca_bitti', '#7ce38a', '#2f8f45');

    this._uyariCiz(c, W, H, D.altH);
  },

  _detayKarti(c, W, H, D, takili) {
    var R = D.detay;
    var p = this._parca(this._secili) || this.PARCA[0];
    var lv = this._seviye(p);
    var nr = this._nadirRenk(p.nadir);

    this._kart(c, R.x, R.y, R.w, R.h, 9, '#223049', '#131a29', nr);

    var ip = 9;
    var ikS = Math.min(R.h - ip * 2 - 16, Math.max(40, R.w * 0.18));
    var ikX = R.x + ip, ikY = R.y + ip;

    // nadirlik fayansı + ikon
    this._kart(c, ikX, ikY, ikS, ikS, 7, nr, '#5c6470', '#0e1320');
    this._ikon(c, this._parcaIkon(p.id), ikX + ikS * 0.13, ikY + ikS * 0.13, ikS * 0.74, '#141a26');

    // seviye rozeti (referans: sol üst yuvarlak kare)
    var rs = Math.max(16, ikS * 0.34);
    c.fillStyle = lv > 0 ? '#2f6fd0' : '#4a5162';
    this._rr(c, ikX - 3, ikY - 3, rs, rs, 4); c.fill();
    c.strokeStyle = '#0e1320'; c.lineWidth = 1.5;
    this._rr(c, ikX - 3, ikY - 3, rs, rs, 4); c.stroke();
    var px = this._f(c, W, H, 0.030, 0.0155, 8, 14, 'bold');
    c.fillStyle = '#ffffff';
    this._yaz(c, String(lv), ikX - 3 + rs / 2, ikY - 3 + rs / 2 + px * 0.36, rs - 3, 'center');

    // sağ butonlar (TAK/ÇIKAR + YÜKSELT) — dikey yığın
    var btnW = Math.max(74, Math.min(120, R.w * 0.26));
    var btnH = 44;
    var btnX = R.x + R.w - ip - btnW;
    var iki = (R.h - ip * 2) >= (btnH * 2 + 6);
    var b1Y = iki ? (R.y + ip) : (R.y + (R.h - btnH) / 2);
    var b2Y = b1Y + btnH + 6;

    var d = this._takilabilir(p.id);
    var etiket = d.cikar ? 'ÇIKAR' : 'TAK';
    var ust = d.cikar ? '#ffb04a' : (d.ok ? '#7ce38a' : '#6c7382');
    var altR = d.cikar ? '#c07310' : (d.ok ? '#2f8f45' : '#3d434f');
    this._kart(c, btnX, b1Y, btnW, btnH, 7, ust, altR, '#0e1320');
    px = this._f(c, W, H, 0.034, 0.0175, 9, 16, 'bold');
    c.fillStyle = '#0e1320';
    this._yaz(c, etiket, btnX + btnW / 2, b1Y + btnH / 2 + px * 0.36, btnW - 8, 'center');
    this._buton(d.cikar ? 'parca_cikar' : 'parca_tak', btnX, b1Y, btnW, btnH,
      { id: p.id, ok: !!d.ok, sebep: d.sebep || '' });

    if (iki) {
      var kart = this._kartSayisi(p), gerek = this._kartGerek(p, lv);
      var yuk = (lv > 0 && lv < p.maks && kart >= gerek);
      this._kart(c, btnX, b2Y, btnW, btnH, 7, yuk ? '#7ec8ff' : '#6c7382',
        yuk ? '#2568a8' : '#3d434f', '#0e1320');
      px = this._f(c, W, H, 0.030, 0.0155, 8, 14, 'bold');
      c.fillStyle = '#0e1320';
      this._yaz(c, lv >= p.maks ? 'MAKS' : 'YÜKSELT', btnX + btnW / 2,
        b2Y + btnH / 2 + px * 0.36, btnW - 8, 'center');
      this._buton('parca_yukselt', btnX, b2Y, btnW, btnH, { id: p.id, ok: yuk });
    }

    // metin bloğu
    var tx = ikX + ikS + ip;
    var tw = Math.max(30, btnX - ip - tx);
    px = this._f(c, W, H, 0.042, 0.021, 11, 19, 'bold');
    c.fillStyle = '#5fc8ff';
    var ty = R.y + ip + px;
    this._yaz(c, this._buyukAscii(p.ad), tx, ty, tw, 'left');

    px = this._f(c, W, H, 0.028, 0.0145, 8, 13, 'normal');
    c.fillStyle = this.C.alt;
    var sat = this._yazSar(c, p.aciklama, tx, ty + px * 1.65, tw, px * 1.25, 2, 'left');

    // stat satırları: "BOOST: 253" / "DURATION: 0.45"
    var sy = ty + px * 1.65 + sat * px * 1.25 + px * 0.9;
    px = this._f(c, W, H, 0.032, 0.0165, 9, 15, 'bold');
    var deger = (lv > 0) ? lv : 1;
    var i, ad, val;
    for (i = 0; i < p.stat.length && i < 2; i++) {
      ad = this._buyukAscii(p.stat[i]) + ':';
      val = (i === 0) ? p.etki[deger - 1] : (p.sure ? p.sure[deger - 1] : null);
      c.fillStyle = this.C.alt;
      this._yaz(c, ad, tx, sy + i * px * 1.35, tw * 0.62, 'left');
      c.fillStyle = '#ffffff';
      this._yaz(c, this._deg(val), tx + tw, sy + i * px * 1.35, tw * 0.36, 'right');
    }

    // uyumsuzluk gerekçesi
    if (!d.ok && d.sebep) {
      px = this._f(c, W, H, 0.026, 0.0135, 7, 12, 'bold');
      c.fillStyle = this.C.kirmizi;
      this._yaz(c, d.sebep, tx, R.y + R.h - 6, tw, 'left');
    }
  },

  _ekipmanPaneli(c, W, H, D, takili) {
    var R = D.ekip;
    this._kart(c, R.x, R.y, R.w, R.h, 9, '#1c2438', '#111726', this.C.cizgi);

    var px = this._f(c, W, H, 0.032, 0.0165, 9, 15, 'bold');
    c.fillStyle = this.C.alt;
    this._yaz(c, 'EQUIPPED', R.x + R.w / 2, R.y + px + 4, R.w - 12, 'center');

    var ust = R.y + px + 10;
    var alt = R.y + R.h - 6;
    var yh = Math.max(44, alt - ust);
    var g = Math.max(6, R.w * 0.02);
    var yw = Math.max(44, Math.floor((R.w - 12 - g * (this.YUVA - 1)) / this.YUVA));
    var bx = R.x + (R.w - (yw * this.YUVA + g * (this.YUVA - 1))) / 2;

    var i;
    for (i = 0; i < this.YUVA; i++) {
      this._yuva(c, W, H, bx + i * (yw + g), ust, yw, yh, takili[i] || null, i);
    }
  },

  _yuva(c, W, H, x, y, w, h, id, idx) {
    var p = id ? this._parca(id) : null;
    var s = Math.min(w, h);
    var fx = x + (w - s) / 2, fy = y + (h - s) / 2;

    if (!p) {
      this._kart(c, fx, fy, s, s, 7, '#232b3d', '#151b29', '#39435a');
      this._ikon(c, 'arti', fx + s * 0.28, fy + s * 0.28, s * 0.44, '#4d576d');
      this._buton('parca_yuva', x, y, w, h, { slot: idx, id: null });
      return;
    }
    var nr = this._nadirRenk(p.nadir);
    var lv = this._seviye(p);
    this._kart(c, fx, fy, s, s, 7, nr, '#5c6470', '#0e1320');
    this._ikon(c, this._parcaIkon(p.id), fx + s * 0.16, fy + s * 0.10, s * 0.62, '#141a26');

    // seviye rozeti
    var rs = Math.max(15, s * 0.30);
    c.fillStyle = '#2f6fd0';
    this._rr(c, fx - 2, fy - 2, rs, rs, 4); c.fill();
    c.strokeStyle = '#0e1320'; c.lineWidth = 1.4;
    this._rr(c, fx - 2, fy - 2, rs, rs, 4); c.stroke();
    var px = this._f(c, W, H, 0.026, 0.0135, 7, 13, 'bold');
    c.fillStyle = '#ffffff';
    this._yaz(c, String(lv), fx - 2 + rs / 2, fy - 2 + rs / 2 + px * 0.36, rs - 3, 'center');

    // kart ilerlemesi
    this._kartCubugu(c, W, H, p, lv, fx + 3, fy + s - Math.max(11, s * 0.20) - 3,
      s - 6, Math.max(11, s * 0.20));

    this._buton('parca_yuva', x, y, w, h, { slot: idx, id: p.id });
  },

  _kartCubugu(c, W, H, p, lv, x, y, w, h) {
    var sahip = this._kartSayisi(p);
    var gerek = this._kartGerek(p, lv);
    var dolu = (gerek > 0) ? Math.min(1, sahip / gerek) : 0;
    var yeter = (sahip >= gerek && lv < p.maks);
    this._cubuk(c, x, y, w, h, dolu, yeter ? this.C.yesil : '#3f7fd0', '#0b0f18');
    var px = this._f(c, W, H, 0.024, 0.0125, 7, 12, 'bold');
    c.fillStyle = '#ffffff';
    this._yaz(c, sahip + '/' + gerek, x + w / 2, y + h / 2 + px * 0.36, w - 4, 'center');
  },

  _envanter(c, W, H, D, takili) {
    var R = D.env;
    this._kart(c, R.x, R.y, R.w, R.h, 9, '#1c2438', '#111726', this.C.cizgi);

    var px = this._f(c, W, H, 0.032, 0.0165, 9, 15, 'bold');
    c.fillStyle = this.C.alt;
    this._yaz(c, 'INVENTORY', R.x + R.w / 2, R.y + px + 4, R.w - 12, 'center');

    var ust = R.y + px + 10;
    var alt = R.y + R.h - 5;
    var gorH = Math.max(20, alt - ust);

    var satir = Math.ceil(this.PARCA.length / D.sut);
    var icH = satir * (D.fH + D.eg) - D.eg;
    this._maxKay = Math.max(0, icH - gorH);
    if (this._kay > this._maxKay) this._kay = this._maxKay;
    if (this._kay < 0) this._kay = 0;

    var bas = this._btn.length;

    c.save();
    this._rr(c, R.x + 2, ust, R.w - 4, gorH, 5); c.clip();

    var i, p, sx, sy, sut, sat;
    for (i = 0; i < this.PARCA.length; i++) {
      p = this.PARCA[i];
      sut = i % D.sut; sat = Math.floor(i / D.sut);
      sx = R.x + D.icPad + sut * (D.fW + D.eg);
      sy = ust + sat * (D.fH + D.eg) - this._kay;
      if (sy > alt || sy + D.fH < ust) {
        // görünmeyen satır: ne çizilir ne buton eklenir
        continue;
      }
      this._fayans(c, W, H, sx, sy, D.fW, D.fH, p, takili);
    }
    c.restore();

    // 🔴 HITBOX KIRPMA — çizim clip'lendi, tıklama kutuları da kırpılmalı
    this._kirp(bas, ust, alt);

    // kaydırma göstergesi
    if (this._maxKay > 0) {
      var izH = gorH * (gorH / icH);
      var izY = ust + (gorH - izH) * (this._kay / this._maxKay);
      c.fillStyle = '#0b0f18';
      this._rr(c, R.x + R.w - 6, ust, 3, gorH, 1.5); c.fill();
      c.fillStyle = this.C.alt;
      this._rr(c, R.x + R.w - 6, izY, 3, Math.max(12, izH), 1.5); c.fill();
    }
  },

  _fayans(c, W, H, x, y, w, h, p, takili) {
    var nr = this._nadirRenk(p.nadir);
    var lv = this._seviye(p);
    var takiliMi = takili.indexOf(p.id) >= 0;
    var secili = (this._secili === p.id);
    var d = this._takilabilir(p.id);
    // 🔴 Karartma YALNIZ gerçek engel için: sahip değilsin (kilit) veya uyumsuz.
    //   "3 yuva dolu" karartma DEĞİLDİR — parça seçilip incelenebilir.
    var engel = (d.tip === 'yok' || d.tip === 'uyumsuz');

    this._kart(c, x, y, w, h, 7, nr, '#5c6470', secili ? '#5fc8ff' : '#0e1320');
    if (secili) {
      c.strokeStyle = '#5fc8ff'; c.lineWidth = 2.5;
      this._rr(c, x + 1, y + 1, w - 2, h - 2, 6); c.stroke();
    }

    var ikS = Math.min(w * 0.66, h * 0.52);
    this._ikon(c, this._parcaIkon(p.id), x + (w - ikS) / 2, y + h * 0.14, ikS, '#141a26');

    // seviye rozeti
    var rs = Math.max(15, Math.min(w * 0.30, h * 0.34));
    c.fillStyle = lv > 0 ? '#2f6fd0' : '#4a5162';
    this._rr(c, x - 2, y - 2, rs, rs, 4); c.fill();
    c.strokeStyle = '#0e1320'; c.lineWidth = 1.4;
    this._rr(c, x - 2, y - 2, rs, rs, 4); c.stroke();
    var px = this._f(c, W, H, 0.026, 0.0135, 7, 13, 'bold');
    c.fillStyle = '#ffffff';
    this._yaz(c, String(lv), x - 2 + rs / 2, y - 2 + rs / 2 + px * 0.36, rs - 3, 'center');

    // takılı işareti — ONAY (✓). Eskiden yukarı OK idi ve "yükseltilebilir"
    // gibi okunuyordu (PNG'de karıştı).
    if (takiliMi) {
      var ts = Math.max(14, w * 0.28);
      c.fillStyle = this.C.yesil;
      this._rr(c, x + w - ts + 1, y - 1, ts, ts, 4); c.fill();
      c.strokeStyle = '#0e1320'; c.lineWidth = 1.4;
      this._rr(c, x + w - ts + 1, y - 1, ts, ts, 4); c.stroke();
      this._ikon(c, 'onay', x + w - ts + 1, y - 1, ts, '#0e1320');
    }

    // kart ilerleme çubuğu
    this._kartCubugu(c, W, H, p, lv, x + 3, y + h - Math.max(11, h * 0.19) - 3,
      w - 6, Math.max(11, h * 0.19));

    // ENGELLİ (uyumsuz / yuva dolu / sahip değil) — görsel işaret
    if (engel && !takiliMi) {
      c.fillStyle = '#0b0f18';
      c.globalAlpha = 0.52;
      this._rr(c, x, y, w, h, 7); c.fill();
      c.globalAlpha = 1;
      var ys = Math.min(w, h) * 0.42;
      this._ikon(c, (lv <= 0) ? 'kilit' : 'yasak',
        x + (w - ys) / 2, y + (h - ys) / 2 - h * 0.06, ys, this.C.kirmizi);
    }

    this._buton('parca_sec', x, y, w, h, { id: p.id, engel: engel });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM
  // ═════════════════════════════════════════════════════════════════════════

  ciz(ctx, W, H, ekran, dt) {
    W = Math.max(1, Math.round(Number(W) || 0));
    H = Math.max(1, Math.round(Number(H) || 0));
    if (!ctx) return;
    if (this.EKRANLAR.indexOf(ekran) < 0) ekran = 'garaj';

    var d = Number(dt);
    if (!isFinite(d) || d < 0 || d > 0.5) d = 0.016;
    this._t += d;
    if (this._uyariT > 0) this._uyariT -= d;

    this._grHazirla(ctx, W, H);
    this._olcum = { minOran: 1, minTxt: '', tasma: 0, maxsiz: 0, yaziSayisi: 0, grYeni: 0, hata: 0, hataMsj: '' };
    this._btn = [];

    var V = this._veri();

    ctx.save();
    try {
      ctx.fillStyle = this.C.zemin;
      ctx.fillRect(0, 0, W, H);
      if (ekran === 'parcaGaraj') this._cizParca(ctx, W, H, V);
      else this._cizGaraj(ctx, W, H, V);
      this._paraSerit(ctx, W, H, 0, (ekran === 'parcaGaraj')
        ? this._duzenParca(W, H).ustH : this._duzenGaraj(W, H).ustH, V);
    } catch (e) {
      this._olcum.hata++;
      this._olcum.hataMsj = (e && e.message) ? e.message : String(e);
    }
    ctx.restore();

    this._btnE[ekran] = this._btn.slice();
  },

  butonlar(ekran) {
    if (this.EKRANLAR.indexOf(ekran) < 0) ekran = 'garaj';
    return (this._btnE[ekran] || []).slice();
  },

  tikla(x, y, ekran) {
    if (!isFinite(x) || !isFinite(y)) return null;
    if (this.EKRANLAR.indexOf(ekran) < 0) ekran = 'garaj';
    var L = this._btnE[ekran] || [], i, b;
    for (i = 0; i < L.length; i++) {
      b = L[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        // Envanter fayansı → seçimi burada değiştir (ekran anında güncellensin)
        if (b.id === 'parca_sec' && b.veri && b.veri.id) this._secili = b.veri.id;
        if (b.id === 'parca_yuva' && b.veri && b.veri.id) this._secili = b.veri.id;
        return { eylem: b.id, veri: b.veri || {} };
      }
    }
    return null;
  },

  // Yalnız `parcaGaraj` kaydırılır (envanter ızgarası).
  // ⚠ Kendi kaydırması OLDUĞU İÇİN `UI._KAYDIRMALI`'ya EKLENMEMELİ (çift kaydırma).
  kaydirma(ekran, delta) {
    if (ekran !== 'parcaGaraj') return false;
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
               disGrad: 0, disMaxsiz: 0, fillTextMaxsiz: 0 };
    var o = {
      _st: st,
      canvas: { width: W, height: H },
      globalAlpha: 1, globalCompositeOperation: 'source-over',
      fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
      font: 'bold 10px Arial', textAlign: 'left', textBaseline: 'alphabetic',
      shadowBlur: 0, shadowColor: '#000', filter: 'none', lineCap: 'butt', lineJoin: 'miter'
    };
    // 🔴 `ellipse` BURADA OLMALI. Bu modül onu ÇAĞIRMAZ ama `UI._drawMenuCar` ->
    //   `drawVehicle` (vehicles.js) çağırır. Sahte ctx'te eksikse drawVehicle
    //   kendi `save()`'inden SONRA patlar, `restore()`'a hiç varamaz ve
    //   `save_restore_dengeli` SAHTE KALDI verir (kanıt koşusunda 10/16 boyutta
    //   yakalandı; gerçek Skia'da denge 34/34'tü).
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
    // Dış çizim (drawVehicle) AYRI KOVAYA sayılır — bu modülün kuralı değil.
    function grSay() { if (M._disCizim) st.disGrad++; else st.grad++; return { addColorStop: function () { } }; }
    o.createLinearGradient = grSay;
    o.createRadialGradient = grSay;
    o.createConicGradient = grSay;
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
    var R = [], i, j, bi, ei;
    function ek(ad, gecti, not) { R.push({ ad: ad, gecti: !!gecti, not: (not == null ? '' : String(not)) }); }

    var BOYUTLAR = [
      [360, 640], [360, 800], [390, 844], [414, 896],
      [428, 926], [768, 1024], [844, 390], [926, 428]
    ];

    var enKucuk = 1e9, enKucukAd = '';
    var cakisma = 0, cakismaAd = '';
    var disari = 0, disariAd = '';
    var minOran = 1, minOranTxt = '';
    var tasma = 0, maxsiz = 0, hata = 0, hataMsj = '';
    var dengesiz = 0, dengesizAd = '';
    var disMaxsiz = 0;
    var btnSayi = {};
    // 🔴 selfTest OYUNCUNUN KAYDINI BOZMAMALI. İlk yazımda yedek `_takiliYerel`
    //   üzerinden alınıyordu; o alan ilk açılışta TANIMSIZ olduğu için test
    //   sonunda `equippedParts` BOŞ diziyle EZİLİYORDU (PNG'de "0/3" ve boş
    //   3 yuva olarak görüldü). Yedek artık GERÇEK durumdan alınır.
    var eskiSecili = this._secili, eskiKay = this._kay;
    var eskiUyari = this._uyari, eskiUyariT = this._uyariT;
    var yedekTakili = this._takili();

    for (bi = 0; bi < BOYUTLAR.length; bi++) {
      var W = BOYUTLAR[bi][0], H = BOYUTLAR[bi][1];
      for (ei = 0; ei < this.EKRANLAR.length; ei++) {
        var ekran = this.EKRANLAR[ei];
        var ad = W + 'x' + H + '/' + ekran;
        var c = this._sahteCtx(W, H);
        var h = null;
        try {
          this._vc = null; this._vcT = 0;
          this._grCtx = null;
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

        var B = this.butonlar(ekran);
        btnSayi[ad] = B.length;
        for (i = 0; i < B.length; i++) {
          var b = B[i];
          var k = Math.min(b.w, b.h);
          if (k < enKucuk) { enKucuk = k; enKucukAd = ad + ' ' + b.id + ' ' + b.w + 'x' + b.h; }
          if (b.x < -0.5 || b.y < -0.5 || b.x + b.w > W + 0.5 || b.y + b.h > H + 0.5) {
            disari++; if (!disariAd) disariAd = ad + ' ' + b.id;
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
    ek('save_restore_dengeli', dengesiz === 0, dengesiz + ' boyutta dengesiz ' + dengesizAd);
    ek('bolum_istisnasi_0', hata === 0, hata + ' ' + hataMsj);
    ek('metin_sikisma_085', minOran >= 0.85, 'min oran = ' + minOran.toFixed(3) + ' [' + minOranTxt + ']');
    ek('metin_tasmasi_0', tasma === 0, tasma + ' tasan metin');
    ek('fillText_maxWidth_hep_var', maxsiz === 0,
       maxsiz + ' maxWidth-siz cagri (bu modul) · ' + disMaxsiz +
       ' adet drawVehicle icinden (vehicles.js, bu modulun kurali degil)');

    // ── Kaynak taraması ──
    var src = this._kaynak();
    var fontAtama = (src.match(/\.font\s*=/g) || []).length;
    ek('font_atamasi_tek_kapi', fontAtama === 1, fontAtama + ' adet `.font =` (yalniz _font icinde)');
    var fSrc = String(this._f);
    ek('font_min_W_ve_H', /Math\.min\(/.test(fSrc) && /W\s*\*/.test(fSrc) && /H\s*\*/.test(fSrc),
       'boyut = min(W*rw, H*rh)');
    var ftC = (src.match(/\.fillText\s*\(/g) || []).length;
    ek('fillText_tek_kapi', ftC === 1, ftC + ' adet `.fillText(` (yalniz _yaz icinde)');
    ek('ctx_ellipse_yok', !/\b(?:c|ctx)\.ellipse\s*\(/.test(src), 'ellipse cagrisi yok');
    ek('getImageData_yok', src.indexOf('getImageData') < 0, 'getImageData yok');
    ek('toUpperCase_yok', src.indexOf('toUpperCase') < 0, 'toUpperCase yok (Turkce i tuzagi)');
    ek('Math_random_kaynakta_yok', src.indexOf('Math.random') < 0, 'kaynakta Math.random yok');
    var kacak = (src.match(/\b(?:c|ctx)\.create(?:Linear|Radial|Conic)Gradient\s*\(/g) || []).length;
    ek('gradyan_kacagi_yok', kacak === 2, kacak + ' dogrudan createGradient (yalniz _gr + _grR = 2)');
    var rgbaS = (src.match(/rgba\(/g) || []).length;
    ek('renkler_HEX', rgbaS === 0, rgbaS + ' adet rgba()');
    ek('backtick_yok', src.indexOf('`') < 0, 'template literal yok');
    ek('hitbox_kirpma_var', /_kirp\s*\(/.test(String(this._envanter)),
       'envanterde _kirp cagrisi var');

    // ── Kare başına yeni gradyan = 0 ──
    var yeniG = 0, gradIlk = 0, disG = 0;
    for (ei = 0; ei < this.EKRANLAR.length; ei++) {
      var cg = this._sahteCtx(390, 844);
      this._grCtx = null;
      this.ciz(cg, 390, 844, this.EKRANLAR[ei], 0.016);
      gradIlk += cg._st.grad;
      var g0 = cg._st.grad, d0 = cg._st.disGrad;
      this.ciz(cg, 390, 844, this.EKRANLAR[ei], 0.016);
      this.ciz(cg, 390, 844, this.EKRANLAR[ei], 0.016);
      yeniG += cg._st.grad - g0;
      disG += cg._st.disGrad - d0;
    }
    ek('kare_basina_yeni_gradyan_0', yeniG === 0,
       '1. karelerde ' + gradIlk + ', sonraki 2x2 karede ' + yeniG +
       ' · drawVehicle ayrica ' + disG + ' gradyan uretti (vehicles.js onbelleksiz)');

    // ── Kare başına Math.random = 0 (canlı ölçüm) ──
    var eskiRnd = Math.random, rnd = 0;
    Math.random = function () { rnd++; return eskiRnd(); };
    try {
      var cr = this._sahteCtx(390, 844);
      this.ciz(cr, 390, 844, 'garaj', 0.016);
      this.ciz(cr, 390, 844, 'parcaGaraj', 0.016);
    } catch (e) { }
    Math.random = eskiRnd;
    ek('kare_basina_Math_random_0', rnd === 0, rnd + ' cagri / 2 kare');

    // ── Veri modülleri yokken çökmüyor ──
    var modYok = !this._g('SaveData') && !this._g('Economy') && !this._g('VehicleDefs');
    var V0 = null, vHata = null;
    try { this._vc = null; V0 = this._veri(); } catch (e) { vHata = String(e && e.message); }
    ek('modul_yokken_cokmuyor', !vHata && !!V0 && typeof V0.aracAd === 'string',
       modYok ? 'moduller YOK, varsayilanlar dondu' : 'moduller VAR, veri okundu');
    ek('yukseltme_kart_sayisi_4', !!V0 && V0.kat.length === 4, (V0 ? V0.kat.length : 0) + ' kart');
    var E = this._g('Economy');
    ek('UP_MAX_Economy_den', !E || (V0 && V0.upMax === E.UP_MAX),
       E ? ('Economy.UP_MAX = ' + E.UP_MAX + ' okundu') : 'Economy yok, varsayilan 25');
    ek('maliyet_Economy_den',
       !E || !E.UPGRADE_LEVEL_COSTS || (V0 && V0.kat[0] && (V0.kat[0].maliyet === null ||
         V0.kat[0].maliyet === Math.floor(E.UPGRADE_LEVEL_COSTS[V0.kat[0].sv + 1] *
           (E.STAT_UPGRADE_MULT.engine || 1)))),
       E && E.UPGRADE_LEVEL_COSTS ? ('motor maliyeti = ' + (V0 ? V0.kat[0].maliyet : '?')) : 'Economy yok');
    ek('guc_gostergesi_gecerli', !!V0 && V0.guc >= 0 && V0.guc <= V0.gucMaks && V0.gucMaks > 0,
       (V0 ? (V0.guc + ' / ' + V0.gucMaks + '  (%' + Math.round(V0.gucYuzde) + ')') : 'yok'));

    // ── PARÇA TABLOSU BÜTÜNLÜĞÜ ──
    var pHata = [], pl;
    for (i = 0; i < this.PARCA.length; i++) {
      var p = this.PARCA[i];
      if (!p.id || !p.ad || !p.nadir) { pHata.push(p.id + ':alan'); continue; }
      if (!this.NADIR_RENK[p.nadir]) pHata.push(p.id + ':nadirlik');
      if (!Array.isArray(p.etki) || p.etki.length !== p.maks) pHata.push(p.id + ':etki_uzunluk');
      if (p.sure && p.sure.length !== p.maks) pHata.push(p.id + ':sure_uzunluk');
      if (p.stat.length > 1 && !p.sure) pHata.push(p.id + ':2stat_ama_sure_yok');
      for (j = 0; j < p.etki.length; j++) if (p.etki[j] == null || !isFinite(p.etki[j])) pHata.push(p.id + ':null');
      if (!this._parcaIkon(p.id) || this._parcaIkon(p.id) === 'kutu') pHata.push(p.id + ':ikon_yok');
    }
    ek('parca_tablosu_21', this.PARCA.length === 21, this.PARCA.length + ' parca');
    ek('parca_tablosu_butun', pHata.length === 0, pHata.join(', ') || '21 parca / 0 null hucre');
    var maksKural = { common: 15, rare: 10, epic: 7, legendary: 4, mythic: 3 };
    var kHata = 0;
    for (i = 0; i < this.PARCA.length; i++) {
      pl = this.PARCA[i];
      if (maksKural[pl.nadir] && pl.maks !== maksKural[pl.nadir]) kHata++;
    }
    ek('nadirlik_maks_seviye_kurali', kHata === 0, kHata + ' parca kurala uymuyor (C15/R10/E7/L4/M3)');

    // ── 3 YUVA SINIRI GERÇEKTEN UYGULANIYOR MU (ÖLÇEREK) ──
    // ⚠ Node'da SaveData YOK → her parçanın seviyesi 0 ("SAHİP DEĞİLSİN").
    //   Burada SAHİPLİK değil YUVA/UYUMLULUK mantığı ölçülüyor; bu yüzden
    //   `_seviye` testin süresince sabitlenir ve sonra GERİ KONUR.
    var eskiSeviye = this._seviye;
    this._seviye = function (p) { return p ? Math.min(p.maks, 4) : 0; };
    this._takiliYazEt([]);
    var r1 = this.takToggle('wings');
    var r2 = this.takToggle('rollcage');
    var r3 = this.takToggle('start_boost');
    var r4 = this.takToggle('landing_boost');     // 4. -> REDDEDİLMELİ
    var takiliSon = this._takili();
    ek('yuva_siniri_3', takiliSon.length === 3 && r4 && r4.ok === false,
       'takili=' + takiliSon.length + ' 4.deneme ok=' + (r4 ? r4.ok : '?') + ' sebep=' + (r4 ? r4.sebep : ''));
    ek('yuva_ekleme_calisiyor', !!(r1 && r1.ok && r2 && r2.ok && r3 && r3.ok),
       'ilk 3 takma basarili');
    // çıkarma
    var r5 = this.takToggle('rollcage');
    ek('yuva_cikarma_calisiyor', !!(r5 && r5.ok && r5.cikar) && this._takili().length === 2,
       'cikar -> ' + this._takili().length + ' takili');

    // ── UYUMSUZ PARÇA GERÇEKTEN ENGELLENİYOR MU (ÖLÇEREK) ──
    this._takiliYazEt([]);
    this.takToggle('amplifier');
    var eA = this._takilabilir('echo');
    var rA = this.takToggle('echo');
    ek('uyumsuz_amplifier_echo', eA.ok === false && rA.ok === false && this._takili().length === 1,
       'echo engellendi: ' + eA.sebep);

    this._takiliYazEt([]);
    this.takToggle('echo');
    var eM = this._takilabilir('magnet');
    var eS = this._takilabilir('spoiler');
    var eW = this._takilabilir('wings');        // uyumlu OLMALI
    ek('uyumsuz_echo_pasif_7', eM.ok === false && eS.ok === false,
       'magnet: ' + eM.sebep + ' | spoiler: ' + eS.sebep);
    ek('uyumlu_parca_engellenmiyor', eW.ok === true, 'wings takilabilir = ' + eW.ok);
    var simetri = this._uyumsuzMu('magnet', 'echo') && this._uyumsuzMu('echo', 'magnet') &&
                  !this._uyumsuzMu('magnet', 'wings');
    ek('uyumsuzluk_simetrik', simetri, 'iki yon de kontrol ediliyor');
    // sahiplik yokken TAKMA REDDEDİLİYOR mu (gerçek `_seviye` ile)
    this._seviye = eskiSeviye;
    this._takiliYazEt([]);
    var sahipsiz = this._takilabilir('thrusters');
    ek('sahip_olmayan_parca_takilamaz',
       this._seviye(this._parca('thrusters')) > 0 || sahipsiz.ok === false,
       'seviye=' + this._seviye(this._parca('thrusters')) + ' -> ' + (sahipsiz.sebep || 'takilabilir'));
    this._takiliYazEt(yedekTakili);
    var geriYuklendi = this._takili().join(',') === yedekTakili.join(',');
    ek('selfTest_kaydi_bozmuyor', geriYuklendi,
       'takili liste geri yuklendi: [' + yedekTakili.join(',') + ']');

    // ── KAYDIRMA + HITBOX KIRPMA (ölçerek) ──
    var ck = this._sahteCtx(390, 844);
    this._grCtx = null;
    this._kay = 0;
    this.ciz(ck, 390, 844, 'parcaGaraj', 0.016);
    var maxK = this._maxKay;
    ek('envanter_kaydirmali', maxK > 0, 'maxKaydirma = ' + Math.round(maxK) + 'px');
    var kOK = this.kaydirma('parcaGaraj', 40);
    var kG = this.kaydirma('garaj', 40);
    ek('kaydirma_yalniz_parcaGaraj', kOK === true && kG === false,
       'parcaGaraj=' + kOK + ' garaj=' + kG);
    // Her fayans EN AZ BİR kaydırma konumunda TAM erişilebilir mi?
    var gorulen = {}, adim, kk;
    for (adim = 0; adim <= 12; adim++) {
      this._kay = (maxK * adim) / 12;
      this.ciz(ck, 390, 844, 'parcaGaraj', 0.016);
      var BB = this.butonlar('parcaGaraj');
      for (i = 0; i < BB.length; i++) {
        if (BB[i].id === 'parca_sec' && BB[i].veri && BB[i].h >= 44) gorulen[BB[i].veri.id] = 1;
      }
    }
    kk = 0;
    for (i = 0; i < this.PARCA.length; i++) if (gorulen[this.PARCA[i].id]) kk++;
    ek('tum_fayanslar_erisilebilir', kk === this.PARCA.length,
       kk + ' / ' + this.PARCA.length + ' fayans bir konumda >=44px erisilebilir');
    this._kay = 0;

    // ── API sözleşmesi ──
    var cc = this._sahteCtx(390, 844);
    this._grCtx = null;
    this.ciz(cc, 390, 844, 'garaj', 0.016);
    var Bg = this.butonlar('garaj');
    this.ciz(cc, 390, 844, 'parcaGaraj', 0.016);
    var Bp = this.butonlar('parcaGaraj');
    ek('ekran_basina_ayri_buton_listesi', Bg.length > 0 && Bp.length > 0 && Bg[0].id !== Bp[0].id,
       'garaj ' + Bg.length + ' buton / parcaGaraj ' + Bp.length + ' buton');
    var sekil = true, idler = {};
    for (i = 0; i < Bg.length; i++) {
      var bb = Bg[i];
      if (typeof bb.id !== 'string' || !isFinite(bb.x) || !isFinite(bb.y) ||
          !isFinite(bb.w) || !isFinite(bb.h)) sekil = false;
      idler[bb.id] = 1;
    }
    ek('butonlar_sekli', sekil, Bg.length + ' buton {id,x,y,w,h}');
    ek('EKRANLAR_dogru', this.EKRANLAR.length === 2 && this.EKRANLAR[0] === 'garaj' &&
       this.EKRANLAR[1] === 'parcaGaraj', this.EKRANLAR.join(','));
    ek('tikla_bosluk_null', this.tikla(-50, -50, 'garaj') === null, 'ekran disi -> null');
    var bas = null;
    for (i = 0; i < Bg.length; i++) if (Bg[i].id === 'garaj_basla') bas = Bg[i];
    var tk = bas ? this.tikla(bas.x + bas.w / 2, bas.y + bas.h / 2, 'garaj') : null;
    ek('tikla_basla_butonu', !!tk && tk.eylem === 'garaj_basla', tk ? tk.eylem : 'BASLA bulunamadi');
    var yks = null;
    for (i = 0; i < Bg.length; i++) if (Bg[i].id === 'garaj_yukselt') { yks = Bg[i]; break; }
    var tk2 = yks ? this.tikla(yks.x + yks.w / 2, yks.y + yks.h / 2, 'garaj') : null;
    ek('tikla_yukselt_stat_dondurur', !!tk2 && tk2.eylem === 'garaj_yukselt' &&
       !!tk2.veri && typeof tk2.veri.stat === 'string',
       tk2 ? (tk2.eylem + ' stat=' + tk2.veri.stat) : 'kart bulunamadi');
    ek('hazir', this.hazir() === true, 'hazir()');

    // ── Determinizm ──
    this.ciz(cc, 390, 844, 'garaj', 0.016);
    var Bg2 = this.butonlar('garaj');
    var ayni = Bg.length === Bg2.length;
    if (ayni) for (i = 0; i < Bg.length; i++) {
      if (Bg[i].id !== Bg2[i].id || Bg[i].x !== Bg2[i].x || Bg[i].y !== Bg2[i].y ||
          Bg[i].w !== Bg2[i].w || Bg[i].h !== Bg2[i].h) { ayni = false; break; }
    }
    ek('geometri_deterministik', ayni, 'iki karede ayni buton kutulari');

    // ── Türkçe büyük harf ──
    ek('turkce_buyuk_harf', this._buyuk('istanbul ılık') === 'İSTANBUL ILIK', this._buyuk('istanbul ılık'));

    // ── Yatay/dikey düzen gerçekten farklı ──
    var dD = this._duzenParca(390, 844), dY = this._duzenParca(844, 390);
    ek('yatay_dikey_duzen_farkli', dD.yatay === false && dY.yatay === true && !!dY.onizleme && !dD.onizleme,
       'yatayda sag onizleme var, dikeyde yok');

    this._secili = eskiSecili; this._kay = eskiKay;
    this._uyari = eskiUyari; this._uyariT = eskiUyariT;
    this._vc = null;

    var kaldi = 0;
    for (i = 0; i < R.length; i++) if (!R[i].gecti) kaldi++;
    return {
      modul: 'EkranGaraj', surum: this.SURUM,
      toplam: R.length, gecti: R.length - kaldi, kaldi: kaldi,
      allPass: kaldi === 0,
      kontroller: R
    };
  }
};

if (typeof window !== 'undefined') window.EkranGaraj = EkranGaraj;
if (typeof module !== 'undefined' && module.exports) module.exports = EkranGaraj;
