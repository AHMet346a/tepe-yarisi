'use strict';
/* ============================================================================
   Avrupa bayrakları — Bayraklar.T tablosuna eklenir. Motor: js/bayraklar.js
   ----------------------------------------------------------------------------
   45 ülke: 44 BM üyesi Avrupa ülkesi + Türkiye. (Kosova ve Vatikan BM üyesi
   olmadığı için YOK.)

   🔴 Motor DEĞİŞTİRİLMEDİ. Yalnız `Bayraklar.T` tablosuna satır eklenir.
   🔴 Yalnız bayraklar.js'te tanımlı ilkeller kullanılır:
      y · d · yo · do · dik · hac · arti · ucgen · dai · hal · yil · hil · cap · egik
      (Bu dosyada 'yazi' ve 'arti' dışındakilerin hepsi kullanılıyor.)
   🔴 Renkler resmi/Pantone kaynaklı HEX (flagcolorcodes.com + Wikipedia
      yapım şemaları ile doğrulandı, 2 Ağu).

   ⚠ ARMALAR BİLİNÇLİ OLARAK SADELEŞTİRİLDİ (bkz. bayraklar.js başlığı).
     ES · PT · RS · ME · MD · AD · SM · HR · SK · SI · MT · LI · AL · CY
     bayraklarında alan/bantlar DOĞRU, arma 12-24 px'lik rozette ayırt
     edilebilecek kadar sade bir işaretle temsil edilir. Arma TAMAMEN
     atlanmadı — armasız Slovakya ≈ Slovenya, armasız İspanya ≈ Katalonya
     benzeri karışıklıklar olurdu.

   ⚠ GEOMETRİ NOTLARI (ölçülmüş, uydurulmuş değil):
     · İskandinav haçlarında dikey kol ORTADA DEĞİL (hac ilkelinin x parametresi):
       DK 0.378 · FI 0.361 · IS 0.360 · NO 0.364 · SE 0.375
     · BA üçgeni ikizkenar dik üçgen: (0.265,0)-(0.765,0)-(0.765,1);
       9 yıldız hipotenüse paralel, MAVİ alanda (Commons yapım şeması).
     · MK: 8 ışın — 4'ü köşelere, 4'ü kenar ortalarına; disk yarıçapı ~1/7 H.
     · CH: haç kolları kenara DEĞMEZ (Wikipedia 20:6:20 yapımı).
   ============================================================================ */
(function () {
  if (typeof Bayraklar === 'undefined') return;
  const T = Bayraklar.T;

  // ── yardımcılar: yalnız izinli ilkellerden oluşan dizi ÜRETİRLER ─────────
  // Motorda serbest üçgen ilkeli yok ('ucgen' sadece hoist üçgeni çizer),
  // eğik kenarlar yatay 'dik' dilimleriyle kurulur.
  function dilimler(renk, xUst0, xUst1, xAlt0, xAlt1, y0, y1, n) {
    const out = [], dy = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const a = xUst0 + (xAlt0 - xUst0) * t, b = xUst1 + (xAlt1 - xUst1) * t;
      if (b - a > 0.0005) out.push(['dik', renk, a, y0 + i * dy, b - a, dy + 0.004]);
    }
    return out;
  }
  function dama(r1, r2, x, y, w, h, n) {
    const out = [], cw = w / n, ch = h / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)
      out.push(['dik', ((i + j) % 2 === 0) ? r1 : r2, x + i * cw, y + j * ch, cw + 0.002, ch + 0.002]);
    return out;
  }
  // Çift başlı kartal (AL · ME · RS) — kademeli dikdörtgenlerle.
  // ⚠ Eğik çizgiyle (egik) denendi, 126 px'te "fiyonk" gibi göründü; kademeli
  //   dikdörtgen kanat rozette çok daha okunaklı (render ile ölçüldü).
  function kartal(renk, cx, cy, sx, sy) {
    const D = function (x, y, w, h) { return ['dik', renk, cx + x * sx, cy + y * sy, w * sx, h * sy]; };
    return [
      ['dai', renk, cx - 0.105 * sx, cy - 0.200 * sy, 0.075 * sx],
      ['dai', renk, cx + 0.105 * sx, cy - 0.200 * sy, 0.075 * sx],
      D(-0.190, -0.215, 0.070, 0.038), D(0.120, -0.215, 0.070, 0.038),
      D(-0.135, -0.150, 0.270, 0.080),
      D(-0.075, -0.090, 0.150, 0.200),
      D(-0.340, -0.100, 0.270, 0.055), D(0.070, -0.100, 0.270, 0.055),
      D(-0.310, -0.045, 0.240, 0.055), D(0.070, -0.045, 0.240, 0.055),
      D(-0.270, 0.010, 0.200, 0.055), D(0.070, 0.010, 0.200, 0.055),
      D(-0.160, 0.100, 0.065, 0.070), D(0.095, 0.100, 0.065, 0.070),
      D(-0.090, 0.110, 0.180, 0.060),
      D(-0.055, 0.170, 0.110, 0.060)
    ];
  }

  // ── AL ── Arnavutluk · kırmızı zemin + çift başlı siyah kartal ────────────
  T.AL = ['Arnavutluk', [['dik', '#DA291C', 0, 0, 1, 1]].concat(kartal('#000000', 0.5, 0.5, 1, 1))];

  // ── AD ── Andorra · dikey mavi/sarı/kırmızı (8:9:8) + dörtlü arma ────────
  T.AD = ['Andorra', [
    ['do', [['#10069F', 8], ['#FEDD00', 9], ['#D50032', 8]]],
    ['dik', '#C6AA76', 0.412, 0.275, 0.176, 0.37],
    ['dik', '#D50032', 0.425, 0.29, 0.075, 0.17],
    ['dik', '#FEDD00', 0.500, 0.29, 0.075, 0.17],
    ['dik', '#FEDD00', 0.425, 0.46, 0.075, 0.17],
    ['dik', '#D50032', 0.500, 0.46, 0.075, 0.17]
  ]];

  // ── AT ── Avusturya ──────────────────────────────────────────────────────
  T.AT = ['Avusturya', [['y', ['#EF3340', '#FFFFFF', '#EF3340']]]];

  // ── BY ── Belarus · kırmızı/yeşil 2:1 + hoist'te kırmızı süsleme şeridi ──
  T.BY = ['Belarus', [
    ['yo', [['#D22730', 2], ['#00AF66', 1]]],
    ['dik', '#FFFFFF', 0, 0, 0.11, 1],
    ['egik', '#D22730', 0.055, 0, 0.055, 1, 0.016],
    ['dik', '#D22730', 0.022, 0.05, 0.066, 0.065],
    ['dik', '#D22730', 0.022, 0.23, 0.066, 0.065],
    ['dik', '#D22730', 0.022, 0.41, 0.066, 0.065],
    ['dik', '#D22730', 0.022, 0.59, 0.066, 0.065],
    ['dik', '#D22730', 0.022, 0.77, 0.066, 0.065]
  ]];

  // ── BE ── Belçika ────────────────────────────────────────────────────────
  T.BE = ['Belçika', [['d', ['#2D2926', '#FFCD00', '#C8102E']]]];

  // ── BA ── Bosna-Hersek · mavi + sarı dik üçgen + hipotenüs boyunca yıldız ─
  T.BA = ['Bosna-Hersek', (function () {
    const s = [['dik', '#002F6C', 0, 0, 1, 1]];
    // üçgen: (0.265,0) - (0.765,0) - (0.765,1)
    s.push.apply(s, dilimler('#FFCD00', 0.265, 0.765, 0.765, 0.765, 0, 1, 40));
    for (let i = 0; i < 9; i++) s.push(['yil', '#FFFFFF', 0.175 + i * 0.0625, -0.011 + i * 0.125, 0.072, 5]);
    return s;
  })()];

  // ── BG ── Bulgaristan ────────────────────────────────────────────────────
  T.BG = ['Bulgaristan', [['y', ['#FFFFFF', '#00966E', '#D62612']]]];

  // ── HR ── Hırvatistan · kırmızı/beyaz/mavi + şahovnica (dama) + taç ──────
  T.HR = ['Hırvatistan', (function () {
    const s = [['y', ['#FF0000', '#FFFFFF', '#012169']]];
    // taç: beş küçük tarihî kalkan (hepsi mavi zeminli) — sadeleştirilmiş
    for (let i = 0; i < 5; i++) s.push(['dik', '#012169', 0.398 + i * 0.041, 0.238, 0.036, 0.052]);
    s.push(['dik', '#FFFFFF', 0.394, 0.290, 0.212, 0.412]);
    s.push.apply(s, dama('#FF0000', '#FFFFFF', 0.404, 0.300, 0.192, 0.392, 5));
    return s;
  })()];

  // ── CY ── Kıbrıs · beyaz zemin + bakır ada silueti + zeytin dalları ──────
  T.CY = ['Kıbrıs', [
    ['dik', '#FFFFFF', 0, 0, 1, 1],
    ['dik', '#D57800', 0.330, 0.320, 0.150, 0.032],
    ['dik', '#D57800', 0.300, 0.352, 0.270, 0.086],
    ['dik', '#D57800', 0.340, 0.438, 0.190, 0.046],
    ['dik', '#D57800', 0.560, 0.312, 0.145, 0.040],
    ['egik', '#4E5B31', 0.400, 0.545, 0.500, 0.628, 0.020],
    ['egik', '#4E5B31', 0.600, 0.545, 0.500, 0.628, 0.020],
    ['dai', '#4E5B31', 0.382, 0.528, 0.024],
    ['dai', '#4E5B31', 0.618, 0.528, 0.024],
    ['dai', '#4E5B31', 0.432, 0.578, 0.021],
    ['dai', '#4E5B31', 0.568, 0.578, 0.021],
    ['dai', '#4E5B31', 0.478, 0.618, 0.019],
    ['dai', '#4E5B31', 0.522, 0.618, 0.019]
  ]];

  // ── CZ ── Çekya ──────────────────────────────────────────────────────────
  T.CZ = ['Çekya', [['y', ['#FFFFFF', '#D7141A']], ['ucgen', '#11457E', 0.5]]];

  // ── DK ── Danimarka · Dannebrog (28:37, kol 4/28, dikey kol 14/37) ───────
  T.DK = ['Danimarka', [['dik', '#C8102E', 0, 0, 1, 1], ['hac', '#FFFFFF', 0.145, 0.378]]];

  // ── EE ── Estonya ────────────────────────────────────────────────────────
  T.EE = ['Estonya', [['y', ['#0072CE', '#000000', '#FFFFFF']]]];

  // ── FI ── Finlandiya (11:18, kol 3/11, dikey kol 6.5/18) ─────────────────
  T.FI = ['Finlandiya', [['dik', '#FFFFFF', 0, 0, 1, 1], ['hac', '#002F6C', 0.273, 0.361]]];

  // ── FR ── Fransa (2020 resmi tonları) ────────────────────────────────────
  T.FR = ['Fransa', [['d', ['#000091', '#FFFFFF', '#E1000F']]]];

  // ── DE ── Almanya ────────────────────────────────────────────────────────
  T.DE = ['Almanya', [['y', ['#000000', '#DD0000', '#FFCC00']]]];

  // ── GR ── Yunanistan · 9 bant + kanton haçı ──────────────────────────────
  T.GR = ['Yunanistan', [
    ['y', ['#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF', '#FFFFFF', '#0D5EAF']],
    ['dik', '#0D5EAF', 0, 0, 0.370, 0.5556],
    ['dik', '#FFFFFF', 0, 0.2222, 0.370, 0.1111],
    ['dik', '#FFFFFF', 0.1481, 0, 0.0741, 0.5556]
  ]];

  // ── HU ── Macaristan ─────────────────────────────────────────────────────
  T.HU = ['Macaristan', [['y', ['#CE2939', '#FFFFFF', '#477050']]]];

  // ── IS ── İzlanda (25:18 · beyaz 4/18, kırmızı 2/18, dikey kol 9/25) ─────
  T.IS = ['İzlanda', [
    ['dik', '#02529C', 0, 0, 1, 1],
    ['hac', '#FFFFFF', 0.222, 0.360],
    ['hac', '#DC1E35', 0.111, 0.360]
  ]];

  // ── IE ── İrlanda ────────────────────────────────────────────────────────
  T.IE = ['İrlanda', [['d', ['#009A44', '#FFFFFF', '#FF8200']]]];

  // ── IT ── İtalya ─────────────────────────────────────────────────────────
  T.IT = ['İtalya', [['d', ['#008C45', '#F4F9FF', '#CD212A']]]];

  // ── LV ── Letonya (2:1:2) ────────────────────────────────────────────────
  T.LV = ['Letonya', [['yo', [['#A4343A', 2], ['#FFFFFF', 1], ['#A4343A', 2]]]]];

  // ── LI ── Lihtenştayn · mavi/kırmızı + hoist üstünde altın taç ───────────
  T.LI = ['Lihtenştayn', [
    ['y', ['#003DA5', '#E4002B']],
    ['dik', '#FFD100', 0.155, 0.205, 0.205, 0.085],
    ['dik', '#FFD100', 0.170, 0.135, 0.035, 0.075],
    ['dik', '#FFD100', 0.240, 0.115, 0.035, 0.095],
    ['dik', '#FFD100', 0.310, 0.135, 0.035, 0.075],
    ['dai', '#FFD100', 0.1875, 0.128, 0.024],
    ['dai', '#FFD100', 0.2575, 0.108, 0.024],
    ['dai', '#FFD100', 0.3275, 0.128, 0.024]
  ]];

  // ── LT ── Litvanya ───────────────────────────────────────────────────────
  T.LT = ['Litvanya', [['y', ['#FFB81C', '#046A38', '#BE3A34']]]];

  // ── LU ── Lüksemburg (Hollanda'dan AÇIK MAVİ ile ayrılır) ────────────────
  T.LU = ['Lüksemburg', [['y', ['#EA141D', '#FFFFFF', '#51ADDA']]]];

  // ── MT ── Malta · beyaz/kırmızı + George Haçı ────────────────────────────
  T.MT = ['Malta', [
    ['d', ['#FFFFFF', '#CF142B']],
    ['dik', '#CF142B', 0.045, 0.055, 0.190, 0.290],
    ['dik', '#C8CDD0', 0.058, 0.073, 0.164, 0.254],
    ['dik', '#7C8286', 0.118, 0.095, 0.044, 0.210],
    ['dik', '#7C8286', 0.072, 0.160, 0.136, 0.080]
  ]];

  // ── MD ── Moldova · mavi/sarı/kırmızı + kartal ve kalkan (sadeleştirilmiş) ─
  T.MD = ['Moldova', [
    ['d', ['#003DA5', '#FFD100', '#C8102E']],
    ['egik', '#007749', 0.330, 0.320, 0.430, 0.352, 0.040],
    ['egik', '#AD7C59', 0.670, 0.320, 0.570, 0.352, 0.040],
    ['dik', '#AD7C59', 0.395, 0.305, 0.210, 0.052],
    ['dik', '#AD7C59', 0.428, 0.357, 0.144, 0.048],
    ['dai', '#AD7C59', 0.500, 0.278, 0.046],
    ['dik', '#AD7C59', 0.472, 0.262, 0.056, 0.028],
    ['dik', '#003DA5', 0.448, 0.405, 0.052, 0.185],
    ['dik', '#C8102E', 0.500, 0.405, 0.052, 0.185],
    ['dai', '#FFD100', 0.500, 0.480, 0.028]
  ]];

  // ── MC ── Monako (Endonezya ile aynı tasarım, farklı oran/ton) ───────────
  T.MC = ['Monako', [['y', ['#CE1126', '#FFFFFF']]]];

  // ── ME ── Karadağ · altın kenarlıklı kırmızı + çift başlı altın kartal ───
  T.ME = ['Karadağ', [
    ['dik', '#D4AF3A', 0, 0, 1, 1],
    ['dik', '#C40308', 0.035, 0.052, 0.930, 0.896]
  ].concat(kartal('#D4AF3A', 0.5, 0.5, 0.92, 0.92)).concat([
    ['dik', '#1D5E91', 0.470, 0.455, 0.060, 0.088],
    ['dai', '#D4AF3A', 0.500, 0.497, 0.020]
  ])];

  // ── NL ── Hollanda ───────────────────────────────────────────────────────
  T.NL = ['Hollanda', [['y', ['#AE1C28', '#FFFFFF', '#21468B']]]];

  // ── MK ── Kuzey Makedonya · 8 ışınlı güneş ───────────────────────────────
  T.MK = ['Kuzey Makedonya', [
    ['dik', '#D82126', 0, 0, 1, 1],
    ['egik', '#F8E92E', 0.5, 0.5, 0.00, 0.00, 0.17],
    ['egik', '#F8E92E', 0.5, 0.5, 1.00, 0.00, 0.17],
    ['egik', '#F8E92E', 0.5, 0.5, 0.00, 1.00, 0.17],
    ['egik', '#F8E92E', 0.5, 0.5, 1.00, 1.00, 0.17],
    ['egik', '#F8E92E', 0.5, 0.5, 0.00, 0.50, 0.20],
    ['egik', '#F8E92E', 0.5, 0.5, 1.00, 0.50, 0.20],
    ['egik', '#F8E92E', 0.5, 0.5, 0.50, 0.00, 0.20],
    ['egik', '#F8E92E', 0.5, 0.5, 0.50, 1.00, 0.20],
    ['dai', '#D82126', 0.5, 0.5, 0.205],
    ['dai', '#F8E92E', 0.5, 0.5, 0.165]
  ]];

  // ── NO ── Norveç (22:16 · beyaz 4/16, mavi 2/16, dikey kol 8/22) ─────────
  T.NO = ['Norveç', [
    ['dik', '#BA0C2F', 0, 0, 1, 1],
    ['hac', '#FFFFFF', 0.250, 0.364],
    ['hac', '#00205B', 0.125, 0.364]
  ]];

  // ── PL ── Polonya ────────────────────────────────────────────────────────
  T.PL = ['Polonya', [['y', ['#FFFFFF', '#DC143C']]]];

  // ── PT ── Portekiz · yeşil/kırmızı 2:3 + küre ve kalkan (sadeleştirilmiş) ─
  T.PT = ['Portekiz', [
    ['do', [['#046A38', 2], ['#DA291C', 3]]],
    ['egik', '#FFE900', 0.230, 0.500, 0.570, 0.500, 0.022],
    ['hal', '#FFE900', 0.400, 0.500, 0.192, 0.028],
    ['hal', '#FFE900', 0.400, 0.500, 0.142, 0.022],
    ['dai', '#DA291C', 0.400, 0.500, 0.104],
    ['dai', '#FFFFFF', 0.400, 0.500, 0.066],
    ['dai', '#002D72', 0.400, 0.500, 0.026]
  ]];

  // ── RO ── Romanya ────────────────────────────────────────────────────────
  T.RO = ['Romanya', [['d', ['#002B7F', '#FCD116', '#CE1126']]]];

  // ── RU ── Rusya ──────────────────────────────────────────────────────────
  T.RU = ['Rusya', [['y', ['#FFFFFF', '#0036A7', '#D62718']]]];

  // ── SM ── San Marino · beyaz/mavi + üç kuleli arma (sadeleştirilmiş) ─────
  T.SM = ['San Marino', [
    ['y', ['#FFFFFF', '#62B5E5']],
    ['hal', '#3E7B32', 0.500, 0.500, 0.158, 0.050],
    ['dai', '#FFFFFF', 0.500, 0.500, 0.126],
    ['dik', '#8FB8DE', 0.437, 0.455, 0.036, 0.130],
    ['dik', '#8FB8DE', 0.482, 0.415, 0.036, 0.170],
    ['dik', '#8FB8DE', 0.527, 0.455, 0.036, 0.130],
    ['dik', '#3E7B32', 0.408, 0.578, 0.184, 0.042],
    ['dik', '#FFD100', 0.455, 0.330, 0.090, 0.040]
  ]];

  // ── RS ── Sırbistan · kırmızı/mavi/beyaz + çift başlı kartal ─────────────
  // Arma hoist'e kaymıştır (merkez ≈ 5/14 uzunluk), ortada DEĞİL.
  T.RS = ['Sırbistan', [
    ['y', ['#C6363C', '#0C4076', '#FFFFFF']],
    ['dik', '#FFD100', 0.270, 0.130, 0.185, 0.058],
    ['dik', '#C6363C', 0.255, 0.188, 0.215, 0.492]
  ].concat(kartal('#FFFFFF', 0.3625, 0.435, 0.300, 0.720))];

  // ── SK ── Slovakya · beyaz/mavi/kırmızı + çifte haçlı kalkan ─────────────
  T.SK = ['Slovakya', [
    ['y', ['#FFFFFF', '#0B4EA2', '#EE1C25']],
    ['dik', '#FFFFFF', 0.253, 0.200, 0.220, 0.590],
    ['dik', '#EE1C25', 0.273, 0.230, 0.180, 0.530],
    ['dik', '#0B4EA2', 0.273, 0.580, 0.180, 0.180],
    ['dai', '#0B4EA2', 0.363, 0.590, 0.058],
    ['dik', '#FFFFFF', 0.348, 0.280, 0.030, 0.340],
    ['dik', '#FFFFFF', 0.305, 0.340, 0.116, 0.028],
    ['dik', '#FFFFFF', 0.290, 0.432, 0.146, 0.028]
  ]];

  // ── SI ── Slovenya · beyaz/mavi/kırmızı + Triglav armalı ─────────────────
  T.SI = ['Slovenya', (function () {
    const s = [
      ['y', ['#FFFFFF', '#003DA5', '#FF0000']],
      ['dik', '#FF0000', 0.082, 0.050, 0.222, 0.450],
      ['dik', '#003DA5', 0.097, 0.072, 0.192, 0.406],
      ['yil', '#FFCD00', 0.138, 0.150, 0.030, 6],
      ['yil', '#FFCD00', 0.248, 0.150, 0.030, 6],
      ['yil', '#FFCD00', 0.193, 0.110, 0.030, 6]
    ];
    s.push.apply(s, dilimler('#FFFFFF', 0.193, 0.193, 0.118, 0.268, 0.215, 0.395, 12));
    s.push(['egik', '#FFFFFF', 0.110, 0.420, 0.276, 0.420, 0.022]);
    s.push(['egik', '#FFFFFF', 0.110, 0.452, 0.276, 0.452, 0.022]);
    return s;
  })()];

  // ── ES ── İspanya · kırmızı/sarı/kırmızı 1:2:1 + arma (sadeleştirilmiş) ──
  T.ES = ['İspanya', [
    ['yo', [['#AA151B', 1], ['#F1BF00', 2], ['#AA151B', 1]]],
    ['dik', '#F1BF00', 0.232, 0.310, 0.028, 0.330],
    ['dik', '#F1BF00', 0.408, 0.310, 0.028, 0.330],
    ['dik', '#F1BF00', 0.278, 0.232, 0.112, 0.052],
    ['dik', '#AA151B', 0.264, 0.284, 0.140, 0.392],
    ['dik', '#FFFFFF', 0.334, 0.284, 0.070, 0.196],
    ['dik', '#FFFFFF', 0.264, 0.480, 0.070, 0.196],
    ['dai', '#F1BF00', 0.334, 0.480, 0.034]
  ]];

  // ── SE ── İsveç (16:10 · kol 2/10, dikey kol 6/16) ───────────────────────
  T.SE = ['İsveç', [['dik', '#006AA7', 0, 0, 1, 1], ['hac', '#FECC02', 0.200, 0.375]]];

  // ── CH ── İsviçre · haç kolları kenara DEĞMEZ ────────────────────────────
  T.CH = ['İsviçre', [
    ['dik', '#DA291C', 0, 0, 1, 1],
    ['dik', '#FFFFFF', 0.293, 0.405, 0.414, 0.190],
    ['dik', '#FFFFFF', 0.437, 0.190, 0.126, 0.620]
  ]];

  // ── TR ── Türkiye ────────────────────────────────────────────────────────
  T.TR = ['Türkiye', [
    ['dik', '#E30A17', 0, 0, 1, 1],
    ['hil', '#FFFFFF', 0.42, 0.5, 0.19],
    ['yil', '#FFFFFF', 0.62, 0.5, 0.09, 5]
  ]];

  // ── UA ── Ukrayna ────────────────────────────────────────────────────────
  T.UA = ['Ukrayna', [['y', ['#0057B7', '#FFDD00']]]];

  // ── GB ── Birleşik Krallık · Union Jack (beyaz alt katman + renkli üst) ──
  T.GB = ['Birleşik Krallık', [
    ['dik', '#012169', 0, 0, 1, 1],
    ['cap', '#FFFFFF', 0.200],
    ['cap', '#C8102E', 0.095],
    ['arti', '#FFFFFF', 0.330],
    ['arti', '#C8102E', 0.200]
  ]];
})();
if (typeof window !== 'undefined') window.__bayrakAvrupa = true;
