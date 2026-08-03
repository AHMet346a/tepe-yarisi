'use strict';
/* ============================================================================
   Afrika bayrakları — Bayraklar.T tablosuna eklenir. Motor: js/bayraklar.js
   ----------------------------------------------------------------------------
   54 ülke: Afrika Birliği/BM üyesi bütün Afrika devletleri.

   🔴 Motor DEĞİŞTİRİLMEDİ. Yalnız `Bayraklar.T` tablosuna satır eklenir.
   🔴 Yalnız bayraklar.js'te tanımlı ilkeller kullanılır:
      y · d · yo · do · dik · hac · arti · ucgen · dai · hal · yil · hil · cap · egik · yazi
      (Bu dosyada 'hac' · 'arti' · 'yazi' KULLANILMAZ; gerisi kullanılır.)
   🔴 Renkler Wikimedia yapım şemalarındaki resmi HEX değerleridir (2 Ağu'da
      `svg-country-flags` @1.2.10 paketindeki Commons SVG'lerinden okundu).
      Pan-Afrika renkleri ülkeden ülkeye FARKLIDIR — tek bir "yeşil" yoktur:
      Gana #006B3F · Nijerya #008751 · Mali #14B53A · Senegal #00853F ·
      Gine #009460 · Zambiya #198A00 · Ruanda #20603D · Libya #239E46 …

   ⚠ ARMALAR BİLİNÇLİ OLARAK SADELEŞTİRİLDİ (bkz. bayraklar.js başlığı):
     KE (kalkan+mızrak) · SZ (kalkan+mızrak) · ER (zeytin çelengi) ·
     MZ (AK-47+kitap+çapa) · ZW (Zimbabve kuşu) · EG (Selahaddin kartalı) ·
     AO (pala+dişli+yıldız) · GQ (pamuk ağacı+6 yıldız) · UG (turna) ·
     ZM (kartal) · LS (mokorotlo şapkası) · MW (yükselen güneş) · CF/ST/MA.
     Alan ve bant oranları DOĞRU; arma 12–24 px'lik rozette ayırt edilebilecek
     kadar sade bir işaretle temsil edilir. Arma TAMAMEN atlanmadı: Afrika'da
     çok sayıda bayrak aynı üç renkli şeritten oluşur, amblemsiz Senegal ≈ Mali,
     amblemsiz Gine-Bissau ≈ Etiyopya, amblemsiz Çad ≈ Romanya olurdu.

   ⚠ ORAN DÜZELTMESİ — `OR = 1.5`
     Motor birim kareyi çağıranın kutusuna ölçekler (`ctx.scale(w,h)`), yani
     3:2'lik bir rozette `dai`/`yil`/`hil` YATAYDA 1,5× EZİLİR. Bu dosyadaki
     yuvarlak öğeler (daire · yıldız · hilal · halka) bu yüzden ilkel yerine
     `poli()` ile YATAY DİLİMDEN kurulur ve x yarıçapı `r/OR` alınır →
     3:2 rozette gerçekten YUVARLAK çıkarlar. Küçük süslerde `dai`/`yil`
     doğrudan kullanılır (fark 12 px'te görünmez).

   ⚠ GEOMETRİ NOTLARI (ölçüldü, uydurulmadı — Commons yapım şemaları):
     · KE bantları 6:1:6:1:6 (yaygın sanılan 6:1:4:1:6 DEĞİL)
     · BW 9:1:4:1:9 · GM 6:1:4:1:6 · SZ 3:1:8:1:3 · SS/KE beyaz şeritler ince
     · CV 6:1:1:1:3 · yıldız çemberi merkez (0.375,0.625), R=0.25
     · ZA pall: yeşil 1/5 yükseklik, birleşme (0.4166,0.5), altın uç 0.3308
     · ZW/TG/LR şeritler eşit; LR kanton 50/209 × 50/110
     · BI yıldızları ALTI köşeli (beş değil)
   ============================================================================ */
(function () {
  if (typeof Bayraklar === 'undefined') return;
  const T = Bayraklar.T;

  // Rozet en/boy oranı — yuvarlak öğelerin x yarıçapı bununla bölünür.
  const OR = 1.5;

  // ── yardımcılar: hepsi YALNIZ izinli ilkellerden dizi ÜRETİR ──────────────

  // Serbest çokgen (iç bükey de olur) → yatay 'dik' dilimleri.
  // ⚠ Tarama satırı ÇİFT-TEK doldurma yapar; yıldız gibi iç bükey şekiller
  //   min/max ile doldurulursa "balon" olur — bu yüzden tüm kesişimler alınır.
  function poli(renk, pts, n) {
    n = n || 40;
    let y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i][1] < y0) y0 = pts[i][1];
      if (pts[i][1] > y1) y1 = pts[i][1];
    }
    if (!(y1 > y0)) return [];
    const out = [], dy = (y1 - y0) / n, xs = [];
    for (let i = 0; i < n; i++) {
      const yc = y0 + (i + 0.5) * dy;
      xs.length = 0;
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j], q = pts[(j + 1) % pts.length];
        if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc))
          xs.push(p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
      }
      if (xs.length < 2) continue;
      xs.sort(function (a, b) { return a - b; });
      for (let k = 0; k + 1 < xs.length; k += 2)
        if (xs[k + 1] - xs[k] > 0.0004)
          out.push(['dik', renk, xs[k], y0 + i * dy, xs[k + 1] - xs[k], dy + 0.004]);
    }
    return out;
  }

  // Gerçekten yuvarlak daire (x yarıçapı r/OR).
  function daire(renk, cx, cy, r, n) {
    const pts = [];
    for (let i = 0; i < 44; i++) {
      const a = i * 2 * Math.PI / 44;
      pts.push([cx + Math.cos(a) * r / OR, cy + Math.sin(a) * r]);
    }
    return poli(renk, pts, n || 30);
  }

  // Gerçekten yuvarlak yıldız. uc = köşe sayısı, faz = radyan döndürme.
  function yildiz(renk, cx, cy, r, uc, faz, n) {
    const k = uc || 5, ic = r * (k === 5 ? 0.382 : 0.5), pts = [];
    for (let i = 0; i < k * 2; i++) {
      const a = -Math.PI / 2 + (faz || 0) + i * Math.PI / k;
      const rr = (i % 2 === 0) ? r : ic;
      pts.push([cx + Math.cos(a) * rr / OR, cy + Math.sin(a) * rr]);
    }
    return poli(renk, pts, n || 34);
  }

  // Daire − kaydırılmış daire (hilal / halka). kay = kayma (dış rx cinsinden),
  // ico = iç yarıçap oranı. kay=0 verilirse HALKA çıkar.
  function ayParcasi(renk, cx, cy, r, kay, ico, n) {
    n = n || 44;
    const out = [], rx = r / OR, dy = 2 * r / n;
    const iry = ico * r, irx = iry / OR, icx = cx + kay * rx;
    for (let i = 0; i < n; i++) {
      const yc = cy - r + (i + 0.5) * dy, yy = y0h(yc, cy, r);
      if (yy <= 0) continue;
      const hw = rx * Math.sqrt(yy);
      let a = cx - hw, b = cx + hw;
      const u = y0h(yc, cy, iry);
      if (u > 0) {
        const ihw = irx * Math.sqrt(u), ia = icx - ihw, ib = icx + ihw;
        if (ia <= a && ib >= b) continue;
        if (ia > a && ib < b) {
          out.push(['dik', renk, a, cy - r + i * dy, ia - a, dy + 0.004]);
          out.push(['dik', renk, ib, cy - r + i * dy, b - ib, dy + 0.004]);
          continue;
        }
        if (ia <= a && ib > a) a = ib;
        else if (ib >= b && ia < b) b = ia;
      }
      if (b - a > 0.0004) out.push(['dik', renk, a, cy - r + i * dy, b - a, dy + 0.004]);
    }
    return out;
  }
  function y0h(yc, cy, r) { const t = (yc - cy) / r; return 1 - t * t; }
  function halka(renk, cx, cy, r, kal, n) { return ayParcasi(renk, cx, cy, r, 0, (r - kal) / r, n); }
  function hilal(renk, cx, cy, r, kay, ico, n) { return ayParcasi(renk, cx, cy, r, kay, ico, n); }

  // Işınlar (güneş) — 'egik' çizgiler.
  function isin(renk, cx, cy, r0, r1, n, kal, a0, a1) {
    const s = (a0 == null ? 0 : a0), e = (a1 == null ? Math.PI * 2 : a1), out = [];
    const tam = (e - s) >= 6.2;
    for (let i = 0; i < n; i++) {
      const a = s + (e - s) * (tam ? i / n : (n === 1 ? 0.5 : i / (n - 1)));
      out.push(['egik', renk, cx + Math.cos(a) * r0 / OR, cy + Math.sin(a) * r0,
        cx + Math.cos(a) * r1 / OR, cy + Math.sin(a) * r1, kal]);
    }
    return out;
  }

  // Çember üzerine eşit aralıklı küçük dikdörtgenler (dişli çark dişleri vb.)
  function cevre(renk, cx, cy, r, n, w, h) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n;
      out.push(['dik', renk, cx + Math.cos(a) * r / OR - w / 2, cy + Math.sin(a) * r - h / 2, w, h]);
    }
    return out;
  }

  // Parça birleştirici: tek ilkel de dizi de kabul eder.
  function K() {
    const out = [];
    for (let i = 0; i < arguments.length; i++) {
      const a = arguments[i];
      if (!a || !a.length) continue;
      if (Array.isArray(a[0])) out.push.apply(out, a);
      else out.push(a);
    }
    return out;
  }

  // ── DZ ── Cezayir · yeşil/beyaz + kırmızı hilal ve yıldız ─────────────────
  T.DZ = ['Cezayir', K(
    ['d', ['#006233', '#FFFFFF']],
    hilal('#D21034', 0.452, 0.500, 0.250, 0.32, 0.80, 56),
    yildiz('#D21034', 0.590, 0.500, 0.118)
  )];

  // ── AO ── Angola · kırmızı/siyah + pala, dişli çark, yıldız ───────────────
  T.AO = ['Angola', K(
    ['y', ['#CC092F', '#000000']],
    cevre('#FFCB00', 0.432, 0.560, 0.212, 10, 0.026, 0.038),
    halka('#FFCB00', 0.432, 0.560, 0.195, 0.055, 40),
    poli('#FFCB00', [[0.598, 0.290], [0.652, 0.410], [0.640, 0.690], [0.598, 0.690], [0.610, 0.430], [0.572, 0.345]], 34),
    ['dik', '#FFCB00', 0.590, 0.688, 0.056, 0.082],
    yildiz('#FFCB00', 0.500, 0.318, 0.092)
  )];

  // ── BJ ── Benin · sarı/kırmızı + hoist'te yeşil dikey bant (2:5) ──────────
  T.BJ = ['Benin', [
    ['y', ['#FCD116', '#E8112D']],
    ['dik', '#008751', 0, 0, 0.400, 1]
  ]];

  // ── BW ── Botsvana · açık mavi + beyaz/siyah/beyaz (9:1:4:1:9) ────────────
  T.BW = ['Botsvana', [
    ['yo', [['#75AADB', 9], ['#FFFFFF', 1], ['#000000', 4], ['#FFFFFF', 1], ['#75AADB', 9]]]
  ]];

  // ── BF ── Burkina Faso · kırmızı/yeşil + sarı yıldız ──────────────────────
  T.BF = ['Burkina Faso', K(
    ['y', ['#EF2B2D', '#009E49']],
    yildiz('#FCD116', 0.500, 0.500, 0.185)
  )];

  // ── BI ── Burundi · beyaz çarpı + kırmızı/yeşil + 3 ALTI köşeli yıldız ────
  T.BI = ['Burundi', K(
    ['dik', '#CE1126', 0, 0, 1, 1],
    poli('#1EB53A', [[0, 0], [0.5, 0.5], [0, 1]], 36),
    poli('#1EB53A', [[1, 0], [0.5, 0.5], [1, 1]], 36),
    ['cap', '#FFFFFF', 0.140],
    daire('#FFFFFF', 0.500, 0.500, 0.285, 34),
    yildiz('#1EB53A', 0.500, 0.353, 0.078, 6, 0, 20), yildiz('#CE1126', 0.500, 0.353, 0.064, 6, 0, 18),
    yildiz('#1EB53A', 0.576, 0.573, 0.078, 6, 0, 20), yildiz('#CE1126', 0.576, 0.573, 0.064, 6, 0, 18),
    yildiz('#1EB53A', 0.424, 0.573, 0.078, 6, 0, 20), yildiz('#CE1126', 0.424, 0.573, 0.064, 6, 0, 18)
  )];

  // ── CV ── Yeşil Burun Adaları · 6:1:1:1:3 + 10 yıldızlı çember ────────────
  T.CV = ['Yeşil Burun Adaları', (function () {
    const s = [['yo', [['#003893', 6], ['#FFFFFF', 1], ['#CF2027', 1], ['#FFFFFF', 1], ['#003893', 3]]]];
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180;
      s.push.apply(s, yildiz('#F7D116', 0.375 + Math.cos(a) * 0.250 / OR, 0.625 + Math.sin(a) * 0.250, 0.050, 5, 0, 20));
    }
    return s;
  })()];

  // ── CM ── Kamerun · dikey yeşil/kırmızı/sarı + sarı yıldız ────────────────
  T.CM = ['Kamerun', K(
    ['d', ['#007A5E', '#CE1126', '#FCD116']],
    yildiz('#FCD116', 0.500, 0.500, 0.185)
  )];

  // ── CF ── Orta Afrika Cumhuriyeti · 4 bant + dikey kırmızı + sarı yıldız ──
  T.CF = ['Orta Afrika Cumhuriyeti', K(
    ['y', ['#003082', '#FFFFFF', '#289728', '#FFCE00']],
    ['dik', '#D21034', 0.4167, 0, 0.1666, 1],
    yildiz('#FFCE00', 0.167, 0.128, 0.105)
  )];

  // ── TD ── Çad · dikey lacivert/sarı/kırmızı (Romanya'dan KOYU mavi ile ayrılır)
  T.TD = ['Çad', [['d', ['#002664', '#FECB00', '#C60C30']]]];

  // ── KM ── Komorlar · 4 bant + yeşil üçgen + hilal + 4 yıldız ──────────────
  T.KM = ['Komorlar', (function () {
    const s = [
      ['y', ['#FFC61E', '#FFFFFF', '#CE1126', '#3A75C4']],
      ['ucgen', '#3D8E33', 0.500]
    ];
    s.push.apply(s, hilal('#FFFFFF', 0.170, 0.500, 0.225, 0.44, 1.00, 46));
    for (let i = 0; i < 4; i++)
      s.push.apply(s, yildiz('#FFFFFF', 0.205, 0.335 + i * 0.1073, 0.048, 5, 0, 20));
    return s;
  })()];

  // ── CD ── Kongo Demokratik Cumhuriyeti · gök mavisi + kırmızı köşegen ─────
  T.CD = ['Kongo Demokratik Cumhuriyeti', K(
    ['dik', '#007FFF', 0, 0, 1, 1],
    poli('#F7D618', [[0, 0.75], [1, -0.05], [1, 0.25], [0, 1.05]], 48),
    poli('#CE1021', [[0, 0.80], [1, 0.00], [1, 0.20], [0, 1.00]], 48),
    yildiz('#F7D618', 0.183, 0.217, 0.157)
  )];

  // ── CG ── Kongo Cumhuriyeti · yeşil/sarı/kırmızı köşegen ──────────────────
  T.CG = ['Kongo Cumhuriyeti', K(
    ['dik', '#009543', 0, 0, 1, 1],
    poli('#FBDE4A', [[0, 1], [0.6667, 0], [1, 0], [1, 1]], 48),
    poli('#DC241F', [[1, 0], [1, 1], [0.3333, 1]], 48)
  )];

  // ── CI ── Fildişi Sahili · turuncu/beyaz/yeşil (İrlanda'nın TERSİ) ────────
  T.CI = ['Fildişi Sahili', [['d', ['#F77F00', '#FFFFFF', '#009E60']]]];

  // ── DJ ── Cibuti · açık mavi/yeşil + beyaz üçgen + kırmızı yıldız ─────────
  T.DJ = ['Cibuti', K(
    ['y', ['#6AB2E7', '#12AD2B']],
    ['ucgen', '#FFFFFF', 0.577],
    yildiz('#D7141A', 0.221, 0.500, 0.135)
  )];

  // ── EG ── Mısır · kırmızı/beyaz/siyah + altın Selahaddin kartalı ──────────
  // ⚠ Kanat kademeli dikdörtgenlerle kurulur (Avrupa dosyasındaki `kartal`
  //   ile aynı gerekçe: eğik çizgi 126 px'te "fiyonk" gibi görünüyor).
  T.EG = ['Mısır', K(
    ['y', ['#CE1126', '#FFFFFF', '#000000']],
    ['dik', '#C09300', 0.330, 0.392, 0.146, 0.030],
    ['dik', '#C09300', 0.348, 0.426, 0.128, 0.028],
    ['dik', '#C09300', 0.368, 0.458, 0.108, 0.026],
    ['dik', '#C09300', 0.390, 0.488, 0.086, 0.024],
    ['dik', '#C09300', 0.524, 0.392, 0.146, 0.030],
    ['dik', '#C09300', 0.524, 0.426, 0.128, 0.028],
    ['dik', '#C09300', 0.524, 0.458, 0.108, 0.026],
    ['dik', '#C09300', 0.524, 0.488, 0.086, 0.024],
    poli('#C09300', [[0.474, 0.386], [0.526, 0.386], [0.520, 0.566], [0.480, 0.566]], 24),
    daire('#C09300', 0.480, 0.368, 0.030, 14),
    poli('#C09300', [[0.432, 0.362], [0.470, 0.354], [0.470, 0.382]], 10),
    ['dik', '#C09300', 0.470, 0.470, 0.060, 0.096],
    ['dik', '#FFFFFF', 0.482, 0.482, 0.011, 0.068],
    ['dik', '#FFFFFF', 0.507, 0.482, 0.011, 0.068],
    poli('#C09300', [[0.478, 0.560], [0.522, 0.560], [0.512, 0.642], [0.488, 0.642]], 14)
  )];

  // ── GQ ── Ekvator Ginesi · yeşil/beyaz/kırmızı + mavi üçgen + pamuk ağacı ─
  T.GQ = ['Ekvator Ginesi', (function () {
    const s = K(
      ['y', ['#3E9A00', '#FFFFFF', '#E32118']],
      ['ucgen', '#0073CE', 0.250],
      poli('#E8E8E8', [[0.436, 0.398], [0.564, 0.398], [0.564, 0.548], [0.500, 0.626], [0.436, 0.548]], 26),
      ['dik', '#73452B', 0.494, 0.468, 0.013, 0.078],
      daire('#3E9A00', 0.500, 0.452, 0.052, 18),
      ['dik', '#A36629', 0.456, 0.542, 0.088, 0.014]
    );
    const yx = [0.430, 0.458, 0.486, 0.514, 0.542, 0.570], yy = [0.362, 0.348, 0.340, 0.340, 0.348, 0.362];
    for (let i = 0; i < 6; i++) s.push.apply(s, yildiz('#FFD700', yx[i], yy[i], 0.030, 5, 0, 14));
    return s;
  })()];

  // ── ER ── Eritre · kırmızı üçgen + yeşil/mavi + altın zeytin çelengi ──────
  T.ER = ['Eritre', K(
    ['dik', '#EA0437', 0, 0, 1, 1],
    poli('#12AD2B', [[0, 0], [1, 0], [1, 0.5]], 48),
    poli('#4189DD', [[0, 1], [1, 1], [1, 0.5]], 48),
    halka('#FFC726', 0.270, 0.500, 0.222, 0.026, 44),
    ['egik', '#FFC726', 0.270, 0.316, 0.270, 0.684, 0.016],
    ['dai', '#FFC726', 0.240, 0.372, 0.018], ['dai', '#FFC726', 0.300, 0.372, 0.018],
    ['dai', '#FFC726', 0.234, 0.448, 0.018], ['dai', '#FFC726', 0.306, 0.448, 0.018],
    ['dai', '#FFC726', 0.234, 0.552, 0.018], ['dai', '#FFC726', 0.306, 0.552, 0.018],
    ['dai', '#FFC726', 0.240, 0.628, 0.018], ['dai', '#FFC726', 0.300, 0.628, 0.018]
  )];

  // ── SZ ── Esvatini · 3:1:8:1:3 + nguni kalkanı, iki mızrak ve asa ─────────
  // ⚠ Nguni kalkanı BİR YANI SİYAH bir yanı beyazdır (barış içinde bir arada
  //   yaşamayı simgeler) — tek renkli çizilirse kalkan okunmuyor.
  T.SZ = ['Esvatini', K(
    ['yo', [['#3E5EB9', 3], ['#FFD900', 1], ['#B10C0C', 8], ['#FFD900', 1], ['#3E5EB9', 3]]],
    ['egik', '#FFD900', 0.150, 0.318, 0.850, 0.318, 0.024],
    ['egik', '#FFD900', 0.150, 0.382, 0.850, 0.382, 0.024],
    poli('#000000', [[0.112, 0.300], [0.178, 0.318], [0.112, 0.336]], 10),
    poli('#000000', [[0.112, 0.364], [0.178, 0.382], [0.112, 0.400]], 10),
    ['dik', '#FFFFFF', 0.790, 0.288, 0.054, 0.126],
    poli('#FFFFFF', [[0.232, 0.548], [0.328, 0.410], [0.672, 0.410], [0.768, 0.548], [0.672, 0.686], [0.328, 0.686]], 36),
    poli('#000000', [[0.232, 0.548], [0.328, 0.410], [0.500, 0.410], [0.500, 0.686], [0.328, 0.686]], 36)
  )];

  // ── ET ── Etiyopya · yeşil/sarı/kırmızı + mavi disk + sarı yıldız ─────────
  T.ET = ['Etiyopya', K(
    ['y', ['#078930', '#FCDD09', '#DA121A']],
    daire('#0F47AF', 0.500, 0.500, 0.320, 40),
    isin('#FCDD09', 0.500, 0.500, 0.215, 0.290, 5, 0.024, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2),
    yildiz('#FCDD09', 0.500, 0.500, 0.205)
  )];

  // ── GA ── Gabon ───────────────────────────────────────────────────────────
  T.GA = ['Gabon', [['y', ['#009E60', '#FCD116', '#3A75C4']]]];

  // ── GM ── Gambiya · 6:1:4:1:6, beyaz ince şeritler ────────────────────────
  T.GM = ['Gambiya', [
    ['yo', [['#CE1126', 6], ['#FFFFFF', 1], ['#0C1C8C', 4], ['#FFFFFF', 1], ['#3A7728', 6]]]
  ]];

  // ── GH ── Gana · kırmızı/altın/yeşil + SİYAH yıldız ───────────────────────
  T.GH = ['Gana', K(
    ['y', ['#CE1126', '#FCD116', '#006B3F']],
    yildiz('#000000', 0.500, 0.500, 0.155)
  )];

  // ── GN ── Gine · dikey kırmızı/sarı/yeşil (Mali'nin TERSİ) ────────────────
  T.GN = ['Gine', [['d', ['#CE1126', '#FCD116', '#009460']]]];

  // ── GW ── Gine-Bissau · kırmızı hoist bandı + siyah yıldız · sarı/yeşil ───
  T.GW = ['Gine-Bissau', K(
    ['y', ['#FCD116', '#009E49']],
    ['dik', '#CE1126', 0, 0, 0.3333, 1],
    yildiz('#000000', 0.1667, 0.500, 0.165)
  )];

  // ── KE ── Kenya · 6:1:6:1:6 + Maasai kalkanı ve iki mızrak ────────────────
  T.KE = ['Kenya', K(
    ['yo', [['#000000', 6], ['#FFFFFF', 1], ['#BB0000', 6], ['#FFFFFF', 1], ['#006600', 6]]],
    ['egik', '#FFFFFF', 0.386, 0.120, 0.614, 0.880, 0.019],
    ['egik', '#FFFFFF', 0.614, 0.120, 0.386, 0.880, 0.019],
    poli('#FFFFFF', [[0.366, 0.062], [0.402, 0.140], [0.378, 0.152]], 10),
    poli('#FFFFFF', [[0.634, 0.062], [0.598, 0.140], [0.622, 0.152]], 10),
    poli('#000000', [[0.500, 0.222], [0.592, 0.360], [0.592, 0.640], [0.500, 0.778], [0.408, 0.640], [0.408, 0.360]], 40),
    poli('#BB0000', [[0.500, 0.274], [0.568, 0.382], [0.568, 0.618], [0.500, 0.726], [0.432, 0.618], [0.432, 0.382]], 38),
    ['dik', '#FFFFFF', 0.432, 0.386, 0.136, 0.042],
    ['dik', '#FFFFFF', 0.432, 0.572, 0.136, 0.042],
    daire('#FFFFFF', 0.500, 0.500, 0.062, 18),
    ['dik', '#000000', 0.486, 0.464, 0.028, 0.072]
  )];

  // ── LS ── Lesotho · mavi/beyaz/yeşil (3:4:3) + siyah mokorotlo şapkası ────
  T.LS = ['Lesotho', K(
    ['yo', [['#00209F', 3], ['#FFFFFF', 4], ['#009543', 3]]],
    poli('#000000', [[0.500, 0.300], [0.578, 0.556], [0.422, 0.556]], 26),
    ['dik', '#000000', 0.406, 0.552, 0.188, 0.030],
    ['dik', '#000000', 0.492, 0.268, 0.016, 0.040],
    ['dik', '#000000', 0.446, 0.596, 0.108, 0.018]
  )];

  // ── LR ── Liberya · 11 şerit + mavi kanton + beyaz yıldız ─────────────────
  T.LR = ['Liberya', K(
    ['y', ['#BF0A30', '#FFFFFF', '#BF0A30', '#FFFFFF', '#BF0A30', '#FFFFFF',
      '#BF0A30', '#FFFFFF', '#BF0A30', '#FFFFFF', '#BF0A30']],
    ['dik', '#002868', 0, 0, 0.2392, 0.4545],
    yildiz('#FFFFFF', 0.1196, 0.2273, 0.1364)
  )];

  // ── LY ── Libya · kırmızı/siyah/yeşil 1:2:1 + beyaz hilal ve yıldız ───────
  T.LY = ['Libya', K(
    ['yo', [['#E70013', 1], ['#000000', 2], ['#239E46', 1]]],
    hilal('#FFFFFF', 0.492, 0.500, 0.128, 0.20, 0.87, 40),
    yildiz('#FFFFFF', 0.578, 0.500, 0.090)
  )];

  // ── MG ── Madagaskar · beyaz hoist bandı + kırmızı/yeşil ──────────────────
  T.MG = ['Madagaskar', [
    ['y', ['#FC3D32', '#007E3A']],
    ['dik', '#FFFFFF', 0, 0, 0.3333, 1]
  ]];

  // ── MW ── Malavi · siyah/kırmızı/yeşil + yükselen kırmızı güneş ───────────
  T.MW = ['Malavi', K(
    ['y', ['#000000', '#CE1126', '#339E35']],
    isin('#CE1126', 0.500, 0.362, 0.170, 0.268, 15, 0.020, Math.PI, Math.PI * 2),
    daire('#CE1126', 0.500, 0.362, 0.160, 30)
  )];

  // ── ML ── Mali · dikey yeşil/sarı/kırmızı ─────────────────────────────────
  T.ML = ['Mali', [['d', ['#14B53A', '#FCD116', '#CE1126']]]];

  // ── MR ── Moritanya · yeşil + YUKARI açılan sarı hilal · kırmızı şeritler ─
  T.MR = ['Moritanya', K(
    ['yo', [['#CD2A3E', 15], ['#006233', 70], ['#CD2A3E', 15]]],
    daire('#FFC400', 0.500, 0.470, 0.205, 40),
    daire('#006233', 0.500, 0.352, 0.205, 40),
    yildiz('#FFC400', 0.500, 0.338, 0.098)
  )];

  // ── MU ── Mauritius · dört eşit bant ──────────────────────────────────────
  T.MU = ['Mauritius', [['y', ['#EA2839', '#1A206D', '#FFD500', '#00A551']]]];

  // ── MA ── Fas · kırmızı + yeşil örgülü pentagram (5 çizgi) ────────────────
  T.MA = ['Fas', (function () {
    const s = [['dik', '#C1272D', 0, 0, 1, 1]], p = [], R = 0.230;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      p.push([0.5 + Math.cos(a) * R / OR, 0.5 + Math.sin(a) * R]);
    }
    for (let i = 0; i < 5; i++) {
      const q = p[i], r = p[(i + 2) % 5];
      s.push(['egik', '#006233', q[0], q[1], r[0], r[1], 0.032]);
    }
    return s;
  })()];

  // ── MZ ── Mozambik · yeşil/siyah/sarı + kırmızı üçgen + yıldız/kitap/tüfek ─
  T.MZ = ['Mozambik', K(
    ['yo', [['#007168', 10], ['#FFFFFF', 1], ['#000000', 10], ['#FFFFFF', 1], ['#FCE100', 10]]],
    poli('#D21034', [[0, 0], [0, 1], [0.4375, 0.5]], 48),
    yildiz('#FCE100', 0.150, 0.480, 0.190),
    ['dik', '#FFFFFF', 0.106, 0.512, 0.090, 0.038],
    ['egik', '#000000', 0.088, 0.582, 0.216, 0.462, 0.020],
    ['egik', '#000000', 0.092, 0.430, 0.208, 0.520, 0.016],
    ['dik', '#000000', 0.196, 0.442, 0.030, 0.024]
  )];

  // ── NA ── Namibya · mavi/yeşil + beyaz-kırmızı köşegen + altın güneş ──────
  T.NA = ['Namibya', K(
    poli('#003580', [[0, 0], [1, 0], [0, 1]], 48),
    poli('#009543', [[1, 0], [1, 1], [0, 1]], 48),
    poli('#FFFFFF', [[-0.062, 0.861], [0.938, -0.139], [1.062, 0.139], [0.062, 1.139]], 48),
    poli('#D21034', [[-0.046, 0.896], [0.954, -0.104], [1.046, 0.104], [0.046, 1.104]], 48),
    isin('#FFCE00', 0.200, 0.272, 0.095, 0.170, 12, 0.020),
    daire('#FFCE00', 0.200, 0.272, 0.092, 22),
    halka('#003580', 0.200, 0.272, 0.092, 0.014, 22)
  )];

  // ── NE ── Nijer · turuncu/beyaz/yeşil + turuncu disk ──────────────────────
  T.NE = ['Nijer', K(
    ['y', ['#E05206', '#FFFFFF', '#0DB02B']],
    daire('#E05206', 0.500, 0.500, 0.142, 30)
  )];

  // ── NG ── Nijerya ─────────────────────────────────────────────────────────
  T.NG = ['Nijerya', [['d', ['#008751', '#FFFFFF', '#008751']]]];

  // ── RW ── Ruanda · mavi/sarı/yeşil (2:1:1) + 24 ışınlı altın güneş ────────
  T.RW = ['Ruanda', K(
    ['yo', [['#00A1DE', 2], ['#FAD201', 1], ['#20603D', 1]]],
    isin('#E5BE01', 0.821, 0.261, 0.055, 0.161, 24, 0.014),
    daire('#E5BE01', 0.821, 0.261, 0.050, 20)
  )];

  // ── ST ── São Tomé ve Príncipe · yeşil/sarı/yeşil (2:3:2) + 2 siyah yıldız ─
  T.ST = ['São Tomé ve Príncipe', K(
    ['yo', [['#12AD2B', 2], ['#FFCE00', 3], ['#12AD2B', 2]]],
    poli('#D21034', [[0, 0], [0, 1], [0.250, 0.5]], 44),
    yildiz('#000000', 0.500, 0.500, 0.143),
    yildiz('#000000', 0.750, 0.500, 0.143)
  )];

  // ── SN ── Senegal · dikey yeşil/sarı/kırmızı + YEŞİL yıldız ───────────────
  T.SN = ['Senegal', K(
    ['d', ['#00853F', '#FDEF42', '#E31B23']],
    yildiz('#00853F', 0.500, 0.500, 0.185)
  )];

  // ── SC ── Seyşeller · sol alt köşeden çıkan 5 ışın ────────────────────────
  T.SC = ['Seyşeller', K(
    ['dik', '#D62828', 0, 0, 1, 1],
    poli('#FCD856', [[0, 1], [0, 0], [0.6667, 0]], 48),
    poli('#003F87', [[0, 1], [0, 0], [0.3333, 0]], 48),
    poli('#FFFFFF', [[0, 1], [1, 1], [1, 0.3333]], 48),
    poli('#007A3D', [[0, 1], [1, 1], [1, 0.6667]], 48)
  )];

  // ── SL ── Sierra Leone ────────────────────────────────────────────────────
  T.SL = ['Sierra Leone', [['y', ['#1EB53A', '#FFFFFF', '#0072C6']]]];

  // ── SO ── Somali · açık mavi + büyük beyaz yıldız ─────────────────────────
  T.SO = ['Somali', K(
    ['dik', '#4189DD', 0, 0, 1, 1],
    yildiz('#FFFFFF', 0.500, 0.500, 0.240)
  )];

  // ── ZA ── Güney Afrika · yeşil pall + altın/siyah üçgen (yapım şeması) ────
  T.ZA = ['Güney Afrika', K(
    ['dik', '#002395', 0, 0, 1, 1],
    ['dik', '#DE3831', 0, 0, 1, 0.5],
    poli('#FFFFFF', [[0.1392, 0], [0.2259, 0], [0.5972, 0.3334], [1.05, 0.3334], [1.05, 0.3984], [0.5803, 0.3984]], 40),
    poli('#FFFFFF', [[0.1390, 1], [0.2259, 1], [0.5972, 0.6666], [1.05, 0.6666], [1.05, 0.6019], [0.5803, 0.6019]], 40),
    poli('#007A4D', [[0, 0.125], [0, 0], [0.1392, 0], [0.5803, 0.3984], [1.05, 0.3984], [1.05, 0.6019],
      [0.5803, 0.6019], [0.1390, 1], [0, 1], [0, 0.875], [0.4166, 0.5]], 56),
    poli('#FFB612', [[0, 0.125], [0, 0.2039], [0.3308, 0.5], [0, 0.7965], [0, 0.875], [0.4167, 0.5]], 48),
    poli('#000000', [[0, 0.2039], [0.3308, 0.5], [0, 0.7965]], 44)
  )];

  // ── SS ── Güney Sudan · siyah/kırmızı/yeşil + mavi üçgen + altın yıldız ───
  T.SS = ['Güney Sudan', K(
    ['yo', [['#000000', 10], ['#FFFFFF', 1.667], ['#DA121A', 10], ['#FFFFFF', 1.667], ['#078930', 10]]],
    poli('#0F47AF', [[0, 0], [0, 1], [0.4330, 0.5]], 48),
    yildiz('#FCDD09', 0.1443, 0.500, 0.180)
  )];

  // ── SD ── Sudan · kırmızı/beyaz/siyah + yeşil üçgen ───────────────────────
  T.SD = ['Sudan', [
    ['y', ['#D21034', '#FFFFFF', '#000000']],
    ['ucgen', '#007229', 0.3333]
  ]];

  // ── TZ ── Tanzanya · yeşil/mavi + sarı fitilli siyah köşegen ──────────────
  T.TZ = ['Tanzanya', K(
    poli('#1EB53A', [[0, 0], [1, 0], [0, 1]], 48),
    poli('#00A3DD', [[1, 0], [1, 1], [0, 1]], 48),
    poli('#FCD116', [[-0.073, 0.835], [0.927, -0.165], [1.073, 0.165], [0.073, 1.165]], 48),
    poli('#000000', [[-0.050, 0.887], [0.950, -0.113], [1.050, 0.113], [0.050, 1.113]], 48)
  )];

  // ── TG ── Togo · 5 şerit + kırmızı kanton + beyaz yıldız ──────────────────
  T.TG = ['Togo', K(
    ['y', ['#006A4E', '#FFCE00', '#006A4E', '#FFCE00', '#006A4E']],
    ['dik', '#D21034', 0, 0, 0.3708, 0.600],
    yildiz('#FFFFFF', 0.1854, 0.300, 0.190)
  )];

  // ── TN ── Tunus · kırmızı + beyaz disk + kırmızı hilal ve yıldız ──────────
  T.TN = ['Tunus', K(
    ['dik', '#E70013', 0, 0, 1, 1],
    daire('#FFFFFF', 0.500, 0.500, 0.250, 40),
    hilal('#E70013', 0.500, 0.500, 0.1875, 0.27, 0.80, 40),
    yildiz('#E70013', 0.545, 0.500, 0.1125)
  )];

  // ── UG ── Uganda · 6 şerit + beyaz disk + gri taçlı turna ─────────────────
  T.UG = ['Uganda', K(
    ['y', ['#000000', '#FCDC04', '#D90000', '#000000', '#FCDC04', '#D90000']],
    daire('#FFFFFF', 0.500, 0.500, 0.156, 30),
    isin('#FCDC04', 0.458, 0.434, 0.022, 0.056, 5, 0.008, -Math.PI * 0.88, -Math.PI * 0.12),
    poli('#9CA69C', [[0.466, 0.508], [0.548, 0.500], [0.560, 0.542], [0.500, 0.578], [0.458, 0.556]], 22),
    ['egik', '#9CA69C', 0.478, 0.516, 0.460, 0.450, 0.015],
    daire('#9CA69C', 0.458, 0.442, 0.024, 12),
    ['dik', '#000000', 0.424, 0.437, 0.028, 0.010],
    ['dai', '#D90000', 0.452, 0.470, 0.013],
    ['egik', '#9CA69C', 0.498, 0.574, 0.492, 0.632, 0.009],
    ['egik', '#9CA69C', 0.524, 0.568, 0.532, 0.632, 0.009],
    poli('#9CA69C', [[0.546, 0.506], [0.598, 0.492], [0.590, 0.534], [0.550, 0.538]], 14)
  )];

  // ── ZM ── Zambiya · yeşil + kırmızı/siyah/turuncu şeritler + turuncu kartal ─
  T.ZM = ['Zambiya', K(
    ['dik', '#198A00', 0, 0, 1, 1],
    ['dik', '#DE2010', 0.6429, 0.3571, 0.1191, 0.6429],
    ['dik', '#000000', 0.7620, 0.3571, 0.1190, 0.6429],
    ['dik', '#EF7D00', 0.8810, 0.3571, 0.1190, 0.6429],
    poli('#EF7D00', [[0.648, 0.068], [0.804, 0.176], [0.804, 0.238], [0.694, 0.164], [0.632, 0.104]], 22),
    poli('#EF7D00', [[0.996, 0.068], [0.840, 0.176], [0.840, 0.238], [0.950, 0.164], [1.012, 0.104]], 22),
    poli('#EF7D00', [[0.804, 0.146], [0.840, 0.146], [0.834, 0.292], [0.810, 0.292]], 18),
    daire('#EF7D00', 0.822, 0.134, 0.036, 14),
    poli('#EF7D00', [[0.848, 0.126], [0.884, 0.135], [0.848, 0.148]], 8),
    poli('#EF7D00', [[0.806, 0.284], [0.838, 0.284], [0.830, 0.338], [0.814, 0.338]], 12)
  )];

  // ── ZW ── Zimbabve · 7 şerit + beyaz üçgen + kırmızı yıldız + altın kuş ───
  T.ZW = ['Zimbabve', K(
    ['y', ['#319208', '#FFD200', '#DE2010', '#000000', '#DE2010', '#FFD200', '#319208']],
    poli('#000000', [[0, 0], [0.3515, 0.5], [0, 1]], 48),
    poli('#FFFFFF', [[0, 0], [0.3333, 0.5], [0, 1]], 48),
    yildiz('#DE2010', 0.1349, 0.500, 0.215),
    poli('#FFC618', [[0.112, 0.560], [0.150, 0.548], [0.158, 0.484], [0.146, 0.432],
      [0.126, 0.420], [0.108, 0.444], [0.104, 0.504]], 24),
    daire('#FFC618', 0.136, 0.406, 0.026, 12),
    poli('#FFC618', [[0.154, 0.398], [0.176, 0.406], [0.154, 0.414]], 8),
    ['dik', '#FFC618', 0.104, 0.556, 0.062, 0.016],
    ['dik', '#FFC618', 0.112, 0.572, 0.046, 0.030]
  )];
})();
if (typeof window !== 'undefined') window.__bayrakAfrika = true;
