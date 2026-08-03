'use strict';
/* ============================================================================
   Amerika + Okyanusya bayrakları — Bayraklar.T'ye eklenir. Motor: js/bayraklar.js
   ----------------------------------------------------------------------------
   49 BM üyesi ülke:  AMERİKA 35  +  OKYANUSYA 14.

   🔴 Motor DEĞİŞTİRİLMEDİ. Yalnız `Bayraklar.T` tablosuna satır eklenir.
   🔴 Yalnız bayraklar.js'te tanımlı ilkeller kullanılır:
      y · d · yo · do · dik · ucgen · dai · hal · yil · egik   (hac/arti/cap/hil/yazi
      bu bölgede gerekmedi; eğik alanlar `poli()` ile yatay `dik` dilimlerine çevrilir.)
   🔴 Renkler resmi/Pantone kaynaklı HEX — flagcolorcodes.com'dan 2 Ağu'da tek tek
      okundu (AG · VE · VU · TV · BS · HN · NI · TO · PW · FM · NR · MH · SB · WS ·
      GD · DM · LC · BB · TT · VC · FJ · KI · GY · SR · BZ · KN). Kalanlar
      yaygın resmi değerler (US #B22234/#3C3B6E · CA #D80621 · BR #009C3B/#FFDF00/
      #002776 · MX #006847/#CE1126 · AR #74ACDF/#F6B40E …).

   ── BU BÖLGENİN İKİ BÜYÜK TUZAĞI ─────────────────────────────────────────
   1) **ABD — 50 yıldız ÇİZİLMEZ, 5×4 = 20 yıldız çizilir.** Ölçüm: rozet 24×16 px
      → kanton 0,40 × 7/13 = **9,6 × 8,6 px**. 9 sıralık gerçek düzende bir yıldız
      hücresi 1,07×0,96 px olur; yıldız yarıçapı yarım pikselin altına düşer ve
      kanton tek parça GRİ LEKEYE dönüşür (üstelik kare başına 50 `yil` çizimi).
      5×4 ızgarada hücre 1,92×2,15 px, yarıçap ~0,9 px → yıldızlar ayrı ayrı
      seçilebiliyor, kanton "yıldızlı" okunuyor. 126 px'lik kartta hücre 10×11 px.
      Bu BİLİNÇLİ bir sadeleştirmedir (bayraklar.js başlığındaki arma kuralının
      aynısı); alan/şerit sayısı/renkler DOĞRU.
   2) **Union Jack kantonu 4 bayrakta var** (AU · NZ · FJ · TV). Kopyala-yapıştır
      YOK: tek `unionJack(x,y,w,h,kirmizi)` yardımcısı hepsinde kullanılır.
      Ayırt edici öğe yıldızlardır, ATLANMADI:
        AU → 7 köşeli beyaz Federasyon yıldızı + 4 adet 7 köşeli + 1 adet 5 köşeli
        NZ → 4 adet KIRMIZI (beyaz kenarlı) 5 köşeli
        TV → 9 adet SARI yıldız, zemin AÇIK mavi (#418FDE)
        FJ → yıldız yok, fly'da kalkan; zemin #69B3E7

   ── GEOMETRİ / EN-BOY NOTU ────────────────────────────────────────────────
   `ciz()` birim kareyi verilen kutuya AYNEN ölçekler; motor belgesi rozet için
   **3:2** öneriyor. Bu yüzden `dai`/`yil` birim karede daire çizse de 3:2'de hafif
   yayvan görünür (Avrupa dosyasındaki davranışın aynısı, bilinçli).
   ⚠ İSTİSNA: Kanada akçaağaç yaprağı ve Dominika'nın dikey haç kolu gibi
   "şekli bozulursa anlaşılmayan" öğelerde x ekseni **2/3** ile çarpılarak
   3:2'de gerçek oran korunur (`EN` sabiti).

   ⚠ ARMALAR BİLİNÇLİ OLARAK SADELEŞTİRİLDİ: MX (kartal+yılan) · BR (küre+kuşak) ·
     AR/UY (Mayıs Güneşi) · HT/EC/BO/VE/GT/SV/NI/DO/PE/PY (arma) · BZ (arma+çelenk) ·
     FJ/PG/KI/NR/MH/PW/DM/GD (amblem/kuş/ışın). Arma TAMAMEN atılsaydı
     Arjantin≈Uruguay, Ekvador≈Kolombiya, El Salvador≈Nikaragua karışırdı.
   ============================================================================ */
(function () {
  if (typeof Bayraklar === 'undefined') return;
  const T = Bayraklar.T;

  // 3:2 render varsayımında x eksenini düzelten katsayı (bkz. başlık)
  const EN = 2 / 3;

  // ── Yardımcılar: HEPSİ yalnız izinli ilkellerden oluşan DİZİ üretir ───────

  // Sutherland-Hodgman: çokgeni eksen hizalı dikdörtgene kırpar.
  function _kenar(pts, ic, kes) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = ic(a), ib = ic(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(kes(a, b));
    }
    return out;
  }
  function kirp(pts, x0, y0, x1, y1) {
    const kx = function (a, b, X) { const t = (X - a[0]) / (b[0] - a[0]); return [X, a[1] + (b[1] - a[1]) * t]; };
    const ky = function (a, b, Y) { const t = (Y - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, Y]; };
    let p = pts;
    p = _kenar(p, function (q) { return q[0] >= x0; }, function (a, b) { return kx(a, b, x0); });
    p = _kenar(p, function (q) { return q[0] <= x1; }, function (a, b) { return kx(a, b, x1); });
    p = _kenar(p, function (q) { return q[1] >= y0; }, function (a, b) { return ky(a, b, y0); });
    p = _kenar(p, function (q) { return q[1] <= y1; }, function (a, b) { return ky(a, b, y1); });
    return p;
  }

  // Serbest çokgen → yatay `dik` dilimleri.
  // 🔴 TEK-ÇİFT (even-odd) tarama: İÇBÜKEY çokgenler de doğru dolar. Sadece
  //    min/max alsaydım akçaağaç yaprağının girintileri dolar, yaprak LEKE olurdu.
  function poli(renk, pts, n, kutu) {
    if (kutu) pts = kirp(pts, kutu[0], kutu[1], kutu[0] + kutu[2], kutu[1] + kutu[3]);
    if (!pts || pts.length < 3) return [];
    let y0 = 1e9, y1 = -1e9;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const out = [], dy = (y1 - y0) / n;
    if (!(dy > 0)) return out;
    const xs = [];
    for (let i = 0; i < n; i++) {
      const yust = y0 + i * dy, yc = yust + dy * 0.5;
      xs.length = 0;
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j], q = pts[(j + 1) % pts.length];
        if ((p[1] <= yc && q[1] > yc) || (q[1] <= yc && p[1] > yc)) {
          xs.push(p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
        }
      }
      if (xs.length < 2) continue;
      xs.sort(function (a, b) { return a - b; });
      // ⚠ son dilim taşmasın: kutu dışına 0.004 sızarsa kanton altında ince
      //   yanlış renkli çizgi kalır (renderda görüldü).
      const h = Math.min(dy + 0.004, y1 - yust);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        if (xs[k + 1] - xs[k] > 0.0004) out.push(['dik', renk, xs[k], yust, xs[k + 1] - xs[k], h]);
      }
    }
    return out;
  }

  // Eğik bant (dikey kalınlık = kal) için 4 köşe.
  function bant(ax, ay, bx, by, kal) {
    return [[ax, ay - kal / 2], [bx, by - kal / 2], [bx, by + kal / 2], [ax, ay + kal / 2]];
  }

  // GERÇEK YUVARLAK disk. 🔴 `dai` birim karede daire çizer → 3:2 rozette
  // BASIK ELİPS olur (ilk renderda Palau'nun dolunayı yumurtaya dönmüştü).
  // Burada x ekseni EN ile daraltılır, 3:2'de tam daire çıkar.
  function daire(renk, cx, cy, r, n) {
    const pts = [], m = n || 40;
    for (let i = 0; i < m; i++) {
      const a = i * 2 * Math.PI / m;
      pts.push([cx + Math.cos(a) * r * EN, cy + Math.sin(a) * r]);
    }
    return poli(renk, pts, Math.max(14, Math.round(r * 170)));
  }

  // Daire içine sıkışan eğik bant (Brezilya kuşağı). Tarama satırı başına
  // hem bandın hem dairenin x aralığı kesiştirilir. rx = r*EN (bkz. daire()).
  function daireBant(renk, cx, cy, r, ax, ay, bx, by, kal, n) {
    const out = [];
    const y0 = Math.min(ay, by) - kal / 2, y1 = Math.max(ay, by) + kal / 2;
    const dy = (y1 - y0) / n, m = (by - ay) / (bx - ax);
    for (let i = 0; i < n; i++) {
      const yust = y0 + i * dy, yy = yust + dy * 0.5;
      const d = yy - cy; if (Math.abs(d) >= r) continue;
      const hx = Math.sqrt(r * r - d * d) * EN;
      let xa, xb;
      if (Math.abs(m) < 1e-6) { xa = -9; xb = 9; }
      else {
        const u = ax + (yy - ay + kal / 2) / m, v = ax + (yy - ay - kal / 2) / m;
        xa = Math.min(u, v); xb = Math.max(u, v);
      }
      const L = Math.max(xa, cx - hx), R = Math.min(xb, cx + hx);
      if (R - L > 0.0005) out.push(['dik', renk, L, yust, R - L, dy + 0.004]);
    }
    return out;
  }

  // ── Union Jack kantonu — AU · NZ · FJ · TV hepsi BUNU kullanır ────────────
  // Oranlar 60×30'luk resmi yapımdan: beyaz haç 10/30, kırmızı haç 6/30,
  // dikey kollar aynı MUTLAK kalınlıkta (10/60 ve 6/60).
  function unionJack(x, y, w, h, kirmizi) {
    const B = '#012169', W = '#FFFFFF', K = kirmizi || '#C8102E';
    const kutu = [x, y, w, h];
    const x0 = x - w * 0.06, x1 = x + w * 1.06, y0 = y - h * 0.06, y1 = y + h * 1.06;
    const s = [['dik', B, x, y, w, h]];
    s.push.apply(s, poli(W, bant(x0, y0, x1, y1, h * 0.26), 26, kutu));
    s.push.apply(s, poli(W, bant(x0, y1, x1, y0, h * 0.26), 26, kutu));
    s.push.apply(s, poli(K, bant(x0, y0, x1, y1, h * 0.090), 26, kutu));
    s.push.apply(s, poli(K, bant(x0, y1, x1, y0, h * 0.090), 26, kutu));
    s.push(['dik', W, x, y + h * 0.5 - h / 6, w, h / 3]);
    s.push(['dik', W, x + w * 0.5 - w / 12, y, w / 6, h]);
    s.push(['dik', K, x, y + h * 0.5 - h / 10, w, h / 5]);
    s.push(['dik', K, x + w * 0.5 - w / 20, y, w / 10, h]);
    return s;
  }

  // Akçaağaç yaprağı (11 uç) — sağ yarı verilir, sol yarı aynalanır.
  // ⚠ x ekseni EN ile çarpılır; yoksa 3:2'de yaprak yayvanlaşıp "el" gibi görünür.
  function akcaagac(cx, cy, boy) {
    const sag = [
      [0.000, -0.500], [0.058, -0.290], [0.190, -0.320], [0.150, -0.180],
      [0.360, 0.010], [0.310, 0.070], [0.430, 0.190], [0.255, 0.160],
      [0.230, 0.225], [0.080, 0.075], [0.120, 0.470], [0.045, 0.455],
      [0.045, 0.500]
    ];
    const pts = [];
    for (const p of sag) pts.push([cx + p[0] * boy * EN, cy + p[1] * boy]);
    for (let i = sag.length - 1; i >= 0; i--) {
      if (sag[i][0] === 0) continue;
      pts.push([cx - sag[i][0] * boy * EN, cy + sag[i][1] * boy]);
    }
    return pts;
  }

  // Yükselen güneş (AG · KI): ışınlar + disk. Alt yarısı SONRAKİ bantla kapanır.
  function yukselenGunes(renk, cx, cy, isinR, diskR, kal) {
    const s = [];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + i * Math.PI / 8;
      s.push(['egik', renk, cx, cy, cx + Math.cos(a) * isinR * EN, cy + Math.sin(a) * isinR, kal]);
    }
    s.push(['dai', renk, cx, cy, diskR]);
    return s;
  }

  /* ═══════════════════════════ AMERİKA (35) ═══════════════════════════════ */

  // ── AG ── Antigua ve Barbuda · tabanı üstte ters üçgen (siyah/mavi/beyaz) ──
  T.AG = ['Antigua ve Barbuda', (function () {
    const s = [['dik', '#EF3340', 0, 0, 1, 1]];
    const u = [[0, 0], [1, 0], [0.5, 1]];
    s.push.apply(s, poli('#000000', u, 24, [0, 0, 1, 0.44]));
    s.push.apply(s, yukselenGunes('#FFD100', 0.5, 0.44, 0.205, 0.115, 0.018));
    s.push.apply(s, poli('#005EB8', u, 8, [0, 0.44, 1, 0.12]));
    s.push.apply(s, poli('#FFFFFF', u, 24, [0, 0.56, 1, 0.44]));
    return s;
  })()];

  // ── AR ── Arjantin · açık mavi/beyaz/açık mavi + Mayıs Güneşi ─────────────
  T.AR = ['Arjantin', [
    ['y', ['#74ACDF', '#FFFFFF', '#74ACDF']],
    ['yil', '#F6B40E', 0.5, 0.5, 0.140, 16],
    ['dai', '#F6B40E', 0.5, 0.5, 0.082],
    ['dai', '#843511', 0.470, 0.478, 0.011],
    ['dai', '#843511', 0.530, 0.478, 0.011],
    ['egik', '#843511', 0.478, 0.530, 0.522, 0.530, 0.013]
  ]];

  // ── BS ── Bahamalar · deniz mavisi/altın/deniz mavisi + siyah hoist üçgeni ─
  T.BS = ['Bahamalar', [
    ['y', ['#00A9CE', '#FDDA25', '#00A9CE']],
    ['ucgen', '#000000', 0.42]
  ]];

  // ── BB ── Barbados · mavi/altın/mavi + kırık mızrak (trident) ─────────────
  T.BB = ['Barbados', [
    ['do', [['#00267F', 1], ['#FFC726', 1], ['#00267F', 1]]],
    ['dik', '#000000', 0.486, 0.440, 0.028, 0.340],
    ['dik', '#000000', 0.410, 0.395, 0.180, 0.042],
    ['dik', '#000000', 0.486, 0.195, 0.028, 0.205],
    ['dik', '#000000', 0.414, 0.255, 0.026, 0.145],
    ['dik', '#000000', 0.560, 0.255, 0.026, 0.145]
  ]];

  // ── BZ ── Belize · mavi zemin + kırmızı üst/alt şerit + beyaz arma diski ──
  T.BZ = ['Belize', (function () {
    const s = [
      ['dik', '#171696', 0, 0, 1, 1],
      ['dik', '#D90F19', 0, 0, 1, 0.10],
      ['dik', '#D90F19', 0, 0.90, 1, 0.10]
    ];
    s.push.apply(s, daire('#009A44', 0.5, 0.5, 0.325));
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.5, 0.272));
    s.push.apply(s, [
    ['dik', '#FFFFFF', 0.428, 0.320, 0.144, 0.150],
    ['dik', '#D90F19', 0.428, 0.320, 0.072, 0.075],
    ['dik', '#D90F19', 0.500, 0.395, 0.072, 0.075],
    ['dik', '#009A44', 0.440, 0.470, 0.120, 0.110],
    ['dik', '#7A4A21', 0.486, 0.470, 0.028, 0.150],
    ['dai', '#8B5E3C', 0.372, 0.470, 0.036],
    ['dai', '#6B4A2B', 0.628, 0.470, 0.036]
    ]);
    return s;
  })()];

  // ── BO ── Bolivya · kırmızı/sarı/yeşil + arma (sadeleştirilmiş) ───────────
  T.BO = ['Bolivya', (function () {
    const s = [['y', ['#D52B1E', '#F9E300', '#007934']]];
    s.push.apply(s, daire('#007934', 0.5, 0.5, 0.110));
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.5, 0.088));
    s.push.apply(s, daire('#5B8FD4', 0.5, 0.505, 0.058));
    s.push(['dik', '#7A4A21', 0.482, 0.500, 0.036, 0.050]);
    s.push(['dai', '#F9E300', 0.5, 0.442, 0.018]);
    return s;
  })()];

  // ── BR ── Brezilya · yeşil zemin + sarı eşkenar dörtgen + mavi küre ───────
  T.BR = ['Brezilya', (function () {
    const s = [['dik', '#009C3B', 0, 0, 1, 1]];
    s.push.apply(s, poli('#FFDF00', [[0.5, 0.055], [0.945, 0.5], [0.5, 0.945], [0.055, 0.5]], 44));
    s.push.apply(s, daire('#002776', 0.5, 0.5, 0.205));
    s.push.apply(s, daireBant('#FFFFFF', 0.5, 0.5, 0.205, 0.30, 0.578, 0.70, 0.452, 0.058, 18));
    // ⚠ yıldızlar YUVARLAK küreye göre yeniden konumlandı (elips varsayımıyla
    //   yerleştirilen 3 tanesi daire daralınca dışarı taşıyordu).
    const yild = [[0.435, 0.400], [0.545, 0.385], [0.590, 0.452], [0.395, 0.470],
                  [0.415, 0.600], [0.520, 0.635], [0.590, 0.590], [0.462, 0.665], [0.545, 0.672]];
    for (const p of yild) s.push(['dai', '#FFFFFF', p[0], p[1], 0.013]);
    return s;
  })()];

  // ── CA ── Kanada · kırmızı/beyaz/kırmızı 1:2:1 + akçaağaç yaprağı ─────────
  T.CA = ['Kanada', (function () {
    const s = [['do', [['#D80621', 1], ['#FFFFFF', 2], ['#D80621', 1]]]];
    s.push.apply(s, poli('#D80621', akcaagac(0.5, 0.5, 0.80), 46));
    return s;
  })()];

  // ── CL ── Şili · beyaz/kırmızı + mavi hoist karesi + beyaz yıldız ─────────
  T.CL = ['Şili', [
    ['dik', '#FFFFFF', 0, 0, 1, 0.5],
    ['dik', '#D52B1E', 0, 0.5, 1, 0.5],
    ['dik', '#0039A6', 0, 0, 0.3333, 0.5],
    ['yil', '#FFFFFF', 0.1667, 0.25, 0.135, 5]
  ]];

  // ── CO ── Kolombiya (sarı yarım, mavi ve kırmızı çeyrek) ──────────────────
  T.CO = ['Kolombiya', [['yo', [['#FCD116', 2], ['#003893', 1], ['#CE1126', 1]]]]];

  // ── CR ── Kosta Rika (1:1:2:1:1) ─────────────────────────────────────────
  T.CR = ['Kosta Rika', [
    ['yo', [['#002B7F', 1], ['#FFFFFF', 1], ['#CE1126', 2], ['#FFFFFF', 1], ['#002B7F', 1]]]
  ]];

  // ── CU ── Küba · 5 şerit + kırmızı hoist üçgeni + beyaz yıldız ────────────
  T.CU = ['Küba', [
    ['y', ['#002A8F', '#FFFFFF', '#002A8F', '#FFFFFF', '#002A8F']],
    ['ucgen', '#CF142B', 0.42],
    ['yil', '#FFFFFF', 0.150, 0.5, 0.125, 5]
  ]];

  // ── DM ── Dominika · yeşil + üçlü haç + kırmızı disk + 10 yeşil yıldız ────
  // ⚠ dikey kollar EN ile daraltılır; yoksa 3:2'de haç kolları eşit görünmez.
  T.DM = ['Dominika', (function () {
    const ky = 0.072, kx = ky * EN;
    const s = [
      ['dik', '#009A44', 0, 0, 1, 1],
      ['dik', '#FFCD00', 0.5 - kx * 1.5, 0, kx, 1],
      ['dik', '#000000', 0.5 - kx * 0.5, 0, kx, 1],
      ['dik', '#FFFFFF', 0.5 + kx * 0.5, 0, kx, 1],
      ['dik', '#FFCD00', 0, 0.5 - ky * 1.5, 1, ky],
      ['dik', '#000000', 0, 0.5 - ky * 0.5, 1, ky],
      ['dik', '#FFFFFF', 0, 0.5 + ky * 0.5, 1, ky]
    ];
    s.push.apply(s, daire('#E4002B', 0.5, 0.5, 0.190));
    // 🔴 Yıldız halkası da EN ile daraltılmalı: ilk sürümde x yarıçapı 1,5×
    //    büyüktü, sağ/sol yıldızlar kırmızı diskin DIŞINA taşıyordu (renderda görüldü).
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      s.push(['yil', '#009A44', 0.5 + Math.cos(a) * 0.140 * EN, 0.5 + Math.sin(a) * 0.140, 0.029, 5]);
    }
    s.push(['dai', '#981E97', 0.498, 0.512, 0.044]);
    s.push(['dik', '#0B6E3B', 0.470, 0.440, 0.028, 0.070]);
    s.push(['dai', '#FFCD00', 0.524, 0.462, 0.013]);
    return s;
  })()];

  // ── DO ── Dominik Cumhuriyeti · beyaz haç + 4 çeyrek + arma ───────────────
  T.DO = ['Dominik Cumhuriyeti', [
    ['dik', '#002D62', 0, 0, 0.5, 0.5],
    ['dik', '#CE1126', 0.5, 0, 0.5, 0.5],
    ['dik', '#CE1126', 0, 0.5, 0.5, 0.5],
    ['dik', '#002D62', 0.5, 0.5, 0.5, 0.5],
    ['dik', '#FFFFFF', 0, 0.445, 1, 0.110],
    ['dik', '#FFFFFF', 0.463, 0, 0.074, 1],
    ['dik', '#FFFFFF', 0.436, 0.385, 0.128, 0.230],
    ['dik', '#002D62', 0.448, 0.405, 0.052, 0.085],
    ['dik', '#CE1126', 0.500, 0.405, 0.052, 0.085],
    ['dik', '#CE1126', 0.448, 0.490, 0.052, 0.085],
    ['dik', '#002D62', 0.500, 0.490, 0.052, 0.085],
    ['dik', '#007A33', 0.466, 0.352, 0.068, 0.030],
    ['dik', '#FFFFFF', 0.492, 0.412, 0.016, 0.150]
  ]];

  // ── EC ── Ekvador · sarı yarım/mavi/kırmızı + kondorlu arma ───────────────
  T.EC = ['Ekvador', [
    ['yo', [['#FFDD00', 2], ['#0033A0', 1], ['#EF3340', 1]]],
    ['dik', '#2B2B2B', 0.386, 0.338, 0.228, 0.030],
    ['dik', '#2B2B2B', 0.436, 0.306, 0.128, 0.032],
    ['dai', '#2B2B2B', 0.500, 0.296, 0.024],
    ['dai', '#FFFFFF', 0.500, 0.470, 0.092],
    ['dik', '#7FB3E8', 0.452, 0.398, 0.096, 0.070],
    ['dik', '#B08A5A', 0.478, 0.468, 0.044, 0.062],
    ['dai', '#FFDD00', 0.500, 0.392, 0.018],
    ['egik', '#007A33', 0.418, 0.542, 0.500, 0.592, 0.022],
    ['egik', '#007A33', 0.582, 0.542, 0.500, 0.592, 0.022]
  ]];

  // ── SV ── El Salvador · mavi/beyaz/mavi + üçgenli arma ────────────────────
  // ⚠ NI ile karışmasın diye: mavi tonu FARKLI (#0F47AF) + altın çelenk halkası.
  T.SV = ['El Salvador', (function () {
    const s = [['y', ['#0F47AF', '#FFFFFF', '#0F47AF']]];
    s.push.apply(s, daire('#C8A400', 0.5, 0.5, 0.152));
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.5, 0.126));
    s.push.apply(s, poli('#0F47AF', [[0.5, 0.392], [0.608, 0.588], [0.392, 0.588]], 18));
    s.push.apply(s, poli('#FFCD00', [[0.5, 0.428], [0.578, 0.562], [0.422, 0.562]], 16));
    s.push(['dai', '#0F47AF', 0.500, 0.522, 0.020]);
    s.push(['egik', '#EF3340', 0.436, 0.496, 0.564, 0.496, 0.014]);
    return s;
  })()];

  // ── GD ── Grenada · kırmızı bordür + 4 üçgen + 7 yıldız + hindistan cevizi ─
  T.GD = ['Grenada', (function () {
    const bx = 0.100, by = 0.167;
    const s = [['dik', '#EF3340', 0, 0, 1, 1]];
    s.push.apply(s, poli('#FFD100', [[bx, by], [1 - bx, by], [0.5, 0.5]], 20));
    s.push.apply(s, poli('#FFD100', [[bx, 1 - by], [1 - bx, 1 - by], [0.5, 0.5]], 20));
    s.push.apply(s, poli('#009739', [[bx, by], [bx, 1 - by], [0.5, 0.5]], 26));
    s.push.apply(s, poli('#009739', [[1 - bx, by], [1 - bx, 1 - by], [0.5, 0.5]], 26));
    for (let i = 0; i < 3; i++) {
      s.push(['yil', '#FFD100', 0.28 + i * 0.22, by * 0.5, 0.052, 5]);
      s.push(['yil', '#FFD100', 0.28 + i * 0.22, 1 - by * 0.5, 0.052, 5]);
    }
    s.push.apply(s, daire('#EF3340', 0.5, 0.5, 0.125));
    s.push(['yil', '#FFD100', 0.5, 0.5, 0.070, 5]);
    s.push.apply(s, daire('#FFD100', 0.215, 0.500, 0.062));   // hindistan cevizi
    s.push.apply(s, daire('#EF3340', 0.215, 0.462, 0.030));
    return s;
  })()];

  // ── GT ── Guatemala · dikey açık mavi/beyaz/açık mavi + arma ──────────────
  T.GT = ['Guatemala', (function () {
    const s = [['d', ['#4997D0', '#FFFFFF', '#4997D0']]];
    s.push.apply(s, daire('#007A33', 0.5, 0.5, 0.160));
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.5, 0.130));
    s.push.apply(s, [
      ['egik', '#7A4A21', 0.418, 0.575, 0.582, 0.415, 0.020],
      ['egik', '#7A4A21', 0.582, 0.575, 0.418, 0.415, 0.020],
      ['dik', '#F2EFE6', 0.422, 0.452, 0.156, 0.058],
      ['dai', '#2B7A4B', 0.500, 0.392, 0.032]
    ]);
    return s;
  })()];

  // ── GY ── Guyana · yeşil + beyaz/sarı ok ucu + siyah/kırmızı üçgen ────────
  T.GY = ['Guyana', (function () {
    const s = [['dik', '#009739', 0, 0, 1, 1]];
    s.push.apply(s, poli('#FFFFFF', [[0, 0], [0.745, 0.5], [0, 1]], 42));
    s.push.apply(s, poli('#FFD100', [[0, 0.042], [0.668, 0.5], [0, 0.958]], 40));
    s.push.apply(s, poli('#000000', [[0, 0], [0.385, 0.5], [0, 1]], 36));
    s.push.apply(s, poli('#EF3340', [[0, 0.058], [0.305, 0.5], [0, 0.942]], 34));
    return s;
  })()];

  // ── HT ── Haiti · mavi/kırmızı + beyaz kare içinde palmiye armasi ─────────
  T.HT = ['Haiti', [
    ['y', ['#00209F', '#D21034']],
    ['dik', '#FFFFFF', 0.372, 0.300, 0.256, 0.400],
    ['dik', '#7A4A21', 0.492, 0.440, 0.016, 0.170],
    ['dai', '#0B6E3B', 0.500, 0.418, 0.058],
    ['dik', '#0B6E3B', 0.408, 0.598, 0.184, 0.028],
    ['egik', '#D21034', 0.412, 0.478, 0.472, 0.436, 0.020],
    ['egik', '#00209F', 0.588, 0.478, 0.528, 0.436, 0.020],
    ['dai', '#FFD100', 0.500, 0.348, 0.020]
  ]];

  // ── HN ── Honduras · turkuaz/beyaz/turkuaz + X düzeninde 5 yıldız ─────────
  T.HN = ['Honduras', (function () {
    const s = [['y', ['#00BCE4', '#FFFFFF', '#00BCE4']]];
    const p = [[0.500, 0.500], [0.418, 0.408], [0.582, 0.408], [0.418, 0.592], [0.582, 0.592]];
    for (const q of p) s.push(['yil', '#00BCE4', q[0], q[1], 0.052, 5]);
    return s;
  })()];

  // ── JM ── Jamaika · altın çarpı + yeşil (üst/alt) ve siyah (yan) üçgenler ─
  T.JM = ['Jamaika', (function () {
    const s = [];
    s.push.apply(s, poli('#000000', [[0, 0], [0.5, 0.5], [0, 1]], 32));
    s.push.apply(s, poli('#000000', [[1, 0], [0.5, 0.5], [1, 1]], 32));
    s.push.apply(s, poli('#009B3A', [[0, 0], [1, 0], [0.5, 0.5]], 26));
    s.push.apply(s, poli('#009B3A', [[0, 1], [1, 1], [0.5, 0.5]], 26));
    s.push.apply(s, poli('#FED100', bant(-0.06, -0.06, 1.06, 1.06, 0.205), 34, [0, 0, 1, 1]));
    s.push.apply(s, poli('#FED100', bant(-0.06, 1.06, 1.06, -0.06, 0.205), 34, [0, 0, 1, 1]));
    return s;
  })()];

  // ── MX ── Meksika · yeşil/beyaz/kırmızı + kartal-yılan (sadeleştirilmiş) ──
  T.MX = ['Meksika', (function () {
    const s = [['d', ['#006847', '#FFFFFF', '#CE1126']]];
    s.push.apply(s, daire('#0B6E3B', 0.5, 0.585, 0.115));   // defne çelengi
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.585, 0.090));
    s.push(['dik', '#8B5E3C', 0.452, 0.548, 0.096, 0.024]); // nopal kaktüsü/kaya
    // ⚠ kanatlar dik dörtgenken kartal "şapka" gibi görünüyordu (renderda
    //   görüldü) → yayvan üçgen kanatlar.
    s.push.apply(s, poli('#6B4A2B', [[0.494, 0.452], [0.398, 0.376], [0.368, 0.412], [0.466, 0.486]], 20));
    s.push.apply(s, poli('#6B4A2B', [[0.494, 0.452], [0.590, 0.376], [0.620, 0.412], [0.522, 0.486]], 20));
    s.push.apply(s, poli('#6B4A2B', [[0.478, 0.432], [0.514, 0.432], [0.506, 0.552], [0.488, 0.552]], 18));
    s.push(['dai', '#8B5E3C', 0.536, 0.428, 0.019]);        // baş
    s.push(['egik', '#2E7D32', 0.542, 0.440, 0.602, 0.474, 0.015]); // yılan
    return s;
  })()];

  // ── NI ── Nikaragua · mavi/beyaz/mavi + üçgen armalı ──────────────────────
  T.NI = ['Nikaragua', (function () {
    const s = [['y', ['#0067C6', '#FFFFFF', '#0067C6']]];
    s.push.apply(s, poli('#C8A400', [[0.5, 0.372], [0.618, 0.604], [0.382, 0.604]], 20));
    s.push.apply(s, poli('#FFFFFF', [[0.5, 0.404], [0.590, 0.580], [0.410, 0.580]], 18));
    s.push(['dik', '#6FD8F3', 0.428, 0.522, 0.144, 0.056]);
    s.push(['dik', '#2B2B2B', 0.468, 0.470, 0.020, 0.056]);
    s.push(['dik', '#2B2B2B', 0.512, 0.470, 0.020, 0.056]);
    s.push(['egik', '#EDE71F', 0.444, 0.452, 0.556, 0.452, 0.016]);
    return s;
  })()];

  // ── PA ── Panama · 4 çeyrek + iki yıldız ─────────────────────────────────
  T.PA = ['Panama', [
    ['dik', '#FFFFFF', 0, 0, 0.5, 0.5],
    ['dik', '#DA121A', 0.5, 0, 0.5, 0.5],
    ['dik', '#072357', 0, 0.5, 0.5, 0.5],
    ['dik', '#FFFFFF', 0.5, 0.5, 0.5, 0.5],
    ['yil', '#072357', 0.25, 0.25, 0.140, 5],
    ['yil', '#DA121A', 0.75, 0.75, 0.140, 5]
  ]];

  // ── PY ── Paraguay · kırmızı/beyaz/mavi + ön yüz arması (Mayıs yıldızı) ───
  T.PY = ['Paraguay', (function () {
    const s = [['y', ['#D52B1E', '#FFFFFF', '#0038A8']]];
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.5, 0.130));
    s.push.apply(s, daire('#007A33', 0.5, 0.5, 0.110));
    s.push.apply(s, daire('#FFFFFF', 0.5, 0.5, 0.086));
    s.push(['yil', '#F9E300', 0.5, 0.5, 0.058, 5]);
    return s;
  })()];

  // ── PE ── Peru · dikey kırmızı/beyaz/kırmızı + arma ───────────────────────
  // ⚠ CA ile karışmaması için: CA 1:2:1 + yaprak, PE 1:1:1 + kalkan.
  T.PE = ['Peru', [
    ['d', ['#D91023', '#FFFFFF', '#D91023']],
    ['dik', '#FFFFFF', 0.440, 0.342, 0.120, 0.104],
    ['dik', '#D91023', 0.500, 0.342, 0.060, 0.104],
    ['dik', '#F2C230', 0.440, 0.446, 0.120, 0.118],
    ['dai', '#8B5E3C', 0.470, 0.394, 0.026],
    ['dai', '#0B6E3B', 0.530, 0.394, 0.026],
    ['dai', '#C87A2B', 0.500, 0.500, 0.030],
    ['egik', '#0B6E3B', 0.412, 0.326, 0.470, 0.296, 0.018],
    ['egik', '#0B6E3B', 0.588, 0.326, 0.530, 0.296, 0.018]
  ]];

  // ── KN ── Saint Kitts ve Nevis · yeşil/kırmızı + sarı kenarlı siyah bant ──
  T.KN = ['Saint Kitts ve Nevis', (function () {
    const s = [];
    s.push.apply(s, poli('#009739', [[0, 0], [1, 0], [0, 1]], 34));
    s.push.apply(s, poli('#EF3340', [[1, 0], [1, 1], [0, 1]], 34));
    s.push.apply(s, poli('#FFD100', bant(-0.06, 1.06, 1.06, -0.06, 0.320), 36, [0, 0, 1, 1]));
    s.push.apply(s, poli('#000000', bant(-0.06, 1.06, 1.06, -0.06, 0.215), 36, [0, 0, 1, 1]));
    s.push(['yil', '#FFFFFF', 0.300, 0.700, 0.082, 5]);
    s.push(['yil', '#FFFFFF', 0.700, 0.300, 0.082, 5]);
    return s;
  })()];

  // ── LC ── Saint Lucia · mavi + beyaz/siyah üçgen + sarı taban üçgeni ──────
  T.LC = ['Saint Lucia', (function () {
    const s = [['dik', '#0077C8', 0, 0, 1, 1]];
    s.push.apply(s, poli('#FFFFFF', [[0.5, 0.115], [0.742, 0.865], [0.258, 0.865]], 32));
    s.push.apply(s, poli('#000000', [[0.5, 0.205], [0.688, 0.865], [0.312, 0.865]], 30));
    s.push.apply(s, poli('#FFD100', [[0.5, 0.505], [0.688, 0.865], [0.312, 0.865]], 22));
    return s;
  })()];

  // ── VC ── Saint Vincent ve Grenadinler · mavi/sarı/yeşil + 3 yeşil elmas ──
  T.VC = ['Saint Vincent ve Grenadinler', (function () {
    const s = [['do', [['#002674', 1], ['#FCD022', 2], ['#007C2E', 1]]]];
    const elmas = function (cx, cy, r) {
      return [[cx, cy - r], [cx + r * EN, cy], [cx, cy + r], [cx - r * EN, cy]];
    };
    s.push.apply(s, poli('#007C2E', elmas(0.418, 0.390, 0.115), 18));
    s.push.apply(s, poli('#007C2E', elmas(0.582, 0.390, 0.115), 18));
    s.push.apply(s, poli('#007C2E', elmas(0.500, 0.625, 0.115), 18));
    return s;
  })()];

  // ── SR ── Surinam · yeşil/beyaz/kırmızı/beyaz/yeşil (2:1:4:1:2) + yıldız ──
  T.SR = ['Surinam', [
    ['yo', [['#007A33', 2], ['#FFFFFF', 1], ['#C8102E', 4], ['#FFFFFF', 1], ['#007A33', 2]]],
    ['yil', '#FFCD00', 0.5, 0.5, 0.170, 5]
  ]];

  // ── TT ── Trinidad ve Tobago · kırmızı + beyaz kenarlı siyah köşegen bant ─
  T.TT = ['Trinidad ve Tobago', (function () {
    const s = [['dik', '#C8102E', 0, 0, 1, 1]];
    s.push.apply(s, poli('#FFFFFF', bant(-0.06, -0.06, 1.06, 1.06, 0.430), 36, [0, 0, 1, 1]));
    s.push.apply(s, poli('#000000', bant(-0.06, -0.06, 1.06, 1.06, 0.265), 36, [0, 0, 1, 1]));
    return s;
  })()];

  // ── US ── Amerika Birleşik Devletleri ─────────────────────────────────────
  // 🔴 13 ŞERİT TAM, kantonda 50 DEĞİL 5×4=20 yıldız (gerekçe: başlık, madde 1).
  T.US = ['Amerika Birleşik Devletleri', (function () {
    const K = '#B22234', B = '#FFFFFF', L = '#3C3B6E';
    const seritler = [];
    for (let i = 0; i < 13; i++) seritler.push(i % 2 === 0 ? K : B);
    const kw = 0.40, kh = 7 / 13;
    const s = [['y', seritler], ['dik', L, 0, 0, kw, kh]];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) {
      s.push(['yil', B, kw * (i + 0.5) / 5, kh * (j + 0.5) / 4, 0.030, 5]);
    }
    return s;
  })()];

  // ── UY ── Uruguay · 9 şerit + kantonda Mayıs Güneşi ───────────────────────
  T.UY = ['Uruguay', (function () {
    const c = [];
    for (let i = 0; i < 9; i++) c.push(i % 2 === 0 ? '#FFFFFF' : '#0038A8');
    const s = [['y', c], ['dik', '#FFFFFF', 0, 0, 0.4444, 5 / 9]];
    s.push(['yil', '#FCD116', 0.222, 0.278, 0.118, 16]);
    s.push(['dai', '#FCD116', 0.222, 0.278, 0.070]);
    s.push(['dai', '#843511', 0.202, 0.262, 0.010]);
    s.push(['dai', '#843511', 0.242, 0.262, 0.010]);
    s.push(['egik', '#843511', 0.206, 0.300, 0.238, 0.300, 0.011]);
    return s;
  })()];

  // ── VE ── Venezuela · sarı/mavi/kırmızı + 8 beyaz yıldızlı yay ────────────
  T.VE = ['Venezuela', (function () {
    const s = [['y', ['#FCE300', '#003DA5', '#EF3340']]];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * (1.11 + i * 0.111);
      s.push(['yil', '#FFFFFF', 0.5 + Math.cos(a) * 0.205, 0.612 + Math.sin(a) * 0.132, 0.036, 5]);
    }
    return s;
  })()];

  /* ═══════════════════════════ OKYANUSYA (14) ═════════════════════════════ */

  // ── AU ── Avustralya · Union Jack + Federasyon yıldızı + Güney Haçı ───────
  T.AU = ['Avustralya', (function () {
    const s = [['dik', '#012169', 0, 0, 1, 1]];
    s.push.apply(s, unionJack(0, 0, 0.5, 0.5, '#E4002B'));
    s.push(['yil', '#FFFFFF', 0.250, 0.750, 0.108, 7]);
    s.push(['yil', '#FFFFFF', 0.750, 0.855, 0.062, 7]);
    s.push(['yil', '#FFFFFF', 0.655, 0.400, 0.062, 7]);
    s.push(['yil', '#FFFFFF', 0.750, 0.145, 0.062, 7]);
    s.push(['yil', '#FFFFFF', 0.852, 0.305, 0.062, 7]);
    s.push(['yil', '#FFFFFF', 0.792, 0.572, 0.038, 5]);
    return s;
  })()];

  // ── FJ ── Fiji · açık mavi + Union Jack + fly'da kalkan ───────────────────
  T.FJ = ['Fiji', (function () {
    const s = [['dik', '#69B3E7', 0, 0, 1, 1]];
    s.push.apply(s, unionJack(0, 0, 0.5, 0.5, '#C8102E'));
    const kx = 0.625, kw = 0.235, ky = 0.190, kh = 0.560;
    s.push(['dik', '#FFFFFF', kx, ky, kw, kh * 0.70]);
    s.push.apply(s, poli('#FFFFFF', [[kx, ky + kh * 0.70], [kx + kw, ky + kh * 0.70], [kx + kw / 2, ky + kh]], 16));
    s.push(['dik', '#C8102E', kx, ky, kw, 0.082]);
    s.push(['dai', '#FFCD00', kx + kw / 2, ky + 0.040, 0.028]);
    s.push(['dik', '#C8102E', kx + kw / 2 - 0.019, ky + 0.082, 0.038, kh * 0.60]);
    s.push(['dik', '#C8102E', kx, ky + 0.082 + kh * 0.22, kw, 0.052]);
    return s;
  })()];

  // ── KI ── Kiribati · kırmızı üst (güneş + fırkateyn kuşu) / dalgalı deniz ──
  T.KI = ['Kiribati', (function () {
    const s = [['dik', '#EF3340', 0, 0, 1, 1]];
    s.push.apply(s, yukselenGunes('#FFD100', 0.5, 0.500, 0.240, 0.125, 0.020));
    // ⚠ Alt yarı MAVİ zemin + ÜÇ beyaz dalga bandıdır (blue-white-blue-white-
    //   blue-white-BLUE). İlk sürümde 6 eşit bant yazmıştım, en alt bant BEYAZ
    //   çıkıyordu — gerçek bayrakta alt kenar MAVİ (renderda piksel ölçümüyle
    //   yakalandı).
    s.push(['dik', '#0032A0', 0, 0.5, 1, 0.5]);
    for (let i = 0; i < 3; i++) s.push(['dik', '#FFFFFF', 0, 0.5 + 0.0714 * (2 * i + 1), 1, 0.0714]);
    // fırkateyn kuşu — ⚠ ilk sürümde kanatlar aşağı bakıyordu ve şekil "kâse"
    //    gibi görünüyordu (renderda görüldü); kanatlar artık YUKARI süpürüyor.
    s.push.apply(s, poli('#FFD100', [[0.500, 0.128], [0.270, 0.045], [0.130, 0.078], [0.335, 0.152], [0.470, 0.182]], 16));
    s.push.apply(s, poli('#FFD100', [[0.500, 0.128], [0.730, 0.045], [0.870, 0.078], [0.665, 0.152], [0.530, 0.182]], 16));
    s.push.apply(s, poli('#FFD100', [[0.474, 0.170], [0.526, 0.170], [0.500, 0.250]], 12));
    s.push(['dai', '#FFD100', 0.500, 0.150, 0.026]);
    return s;
  })()];

  // ── MH ── Marshall Adaları · mavi + turuncu/beyaz köşegen + 24 uçlu yıldız ─
  T.MH = ['Marshall Adaları', (function () {
    const s = [['dik', '#003087', 0, 0, 1, 1]];
    s.push.apply(s, poli('#FFFFFF', [[0, 0.78], [1, 0.08], [1, 0.32], [0, 1.02]], 44, [0, 0, 1, 1]));
    s.push.apply(s, poli('#E57200', [[0, 0.90], [1, 0.20], [1, 0.32], [0, 1.02]], 44, [0, 0, 1, 1]));
    s.push(['yil', '#FFFFFF', 0.285, 0.300, 0.140, 24]);
    return s;
  })()];

  // ── FM ── Mikronezya · açık mavi + elmas düzeninde 4 beyaz yıldız ─────────
  T.FM = ['Mikronezya', [
    ['dik', '#75B2DD', 0, 0, 1, 1],
    ['yil', '#FFFFFF', 0.500, 0.250, 0.088, 5],
    ['yil', '#FFFFFF', 0.500, 0.750, 0.088, 5],
    ['yil', '#FFFFFF', 0.352, 0.500, 0.088, 5],
    ['yil', '#FFFFFF', 0.648, 0.500, 0.088, 5]
  ]];

  // ── NR ── Nauru · lacivert + ince sarı şerit + 12 uçlu beyaz yıldız ───────
  T.NR = ['Nauru', [
    ['dik', '#012169', 0, 0, 1, 1],
    ['dik', '#FFC72C', 0, 0.478, 1, 0.044],
    ['yil', '#FFFFFF', 0.230, 0.700, 0.118, 12]
  ]];

  // ── NZ ── Yeni Zelanda · Union Jack + 4 KIRMIZI (beyaz kenarlı) yıldız ────
  T.NZ = ['Yeni Zelanda', (function () {
    const s = [['dik', '#00247D', 0, 0, 1, 1]];
    s.push.apply(s, unionJack(0, 0, 0.5, 0.5, '#CC142B'));
    const p = [[0.755, 0.235], [0.638, 0.500], [0.872, 0.442], [0.755, 0.782]];
    for (const q of p) {
      s.push(['yil', '#FFFFFF', q[0], q[1], 0.080, 5]);
      s.push(['yil', '#CC142B', q[0], q[1], 0.052, 5]);
    }
    return s;
  })()];

  // ── PW ── Palau · açık mavi + hoist'e kaymış sarı dolunay ─────────────────
  // 🔴 Dolunay `dai` ile çizilirse 3:2'de yumurta olur → `daire()` kullanılır.
  T.PW = ['Palau', (function () {
    const s = [['dik', '#0085CA', 0, 0, 1, 1]];
    s.push.apply(s, daire('#FFD100', 0.450, 0.500, 0.245));
    return s;
  })()];

  // ── PG ── Papua Yeni Gine · köşegen bölünme · siyah+Güney Haçı / kırmızı+kuş ─
  T.PG = ['Papua Yeni Gine', (function () {
    const s = [];
    s.push.apply(s, poli('#CE1126', [[0, 0], [1, 0], [1, 1]], 36));
    s.push.apply(s, poli('#000000', [[0, 0], [1, 1], [0, 1]], 36));
    const p = [[0.285, 0.435], [0.165, 0.640], [0.420, 0.700], [0.285, 0.880]];
    for (const q of p) s.push(['yil', '#FFFFFF', q[0], q[1], 0.056, 5]);
    s.push(['yil', '#FFFFFF', 0.292, 0.642, 0.032, 5]);
    s.push.apply(s, poli('#FCD116', [[0.620, 0.290], [0.870, 0.155], [0.800, 0.345], [0.660, 0.385]], 16));
    s.push.apply(s, poli('#FCD116', [[0.618, 0.288], [0.700, 0.135], [0.745, 0.300]], 14));
    s.push(['dai', '#FCD116', 0.638, 0.300, 0.030]);
    return s;
  })()];

  // ── WS ── Samoa · kırmızı + mavi kanton + 5 beyaz yıldız (Güney Haçı) ─────
  T.WS = ['Samoa', (function () {
    const s = [['dik', '#CE1126', 0, 0, 1, 1], ['dik', '#002B7F', 0, 0, 0.5, 0.5]];
    const p = [[0.250, 0.092], [0.138, 0.245], [0.362, 0.200], [0.250, 0.402]];
    for (const q of p) s.push(['yil', '#FFFFFF', q[0], q[1], 0.054, 5]);
    s.push(['yil', '#FFFFFF', 0.288, 0.292, 0.032, 5]);
    return s;
  })()];

  // ── SB ── Solomon Adaları · mavi/yeşil + sarı köşegen + 5 beyaz yıldız ────
  T.SB = ['Solomon Adaları', (function () {
    const s = [];
    s.push.apply(s, poli('#0051BA', [[0, 0], [1, 0], [0, 1]], 34));
    s.push.apply(s, poli('#215B33', [[1, 0], [1, 1], [0, 1]], 34));
    s.push.apply(s, poli('#FCD116', bant(-0.06, 1.06, 1.06, -0.06, 0.118), 36, [0, 0, 1, 1]));
    const p = [[0.115, 0.115], [0.278, 0.115], [0.115, 0.302], [0.278, 0.302], [0.196, 0.208]];
    for (const q of p) s.push(['yil', '#FFFFFF', q[0], q[1], 0.056, 5]);
    return s;
  })()];

  // ── TO ── Tonga · kırmızı + beyaz kanton içinde kırmızı haç ───────────────
  T.TO = ['Tonga', [
    ['dik', '#C10000', 0, 0, 1, 1],
    ['dik', '#FFFFFF', 0, 0, 0.400, 0.500],
    ['dik', '#C10000', 0.160, 0.108, 0.080, 0.284],
    ['dik', '#C10000', 0.060, 0.190, 0.280, 0.120]
  ]];

  // ── TV ── Tuvalu · açık mavi + Union Jack + 9 SARI yıldız (9 ada) ─────────
  T.TV = ['Tuvalu', (function () {
    const s = [['dik', '#418FDE', 0, 0, 1, 1]];
    s.push.apply(s, unionJack(0, 0, 0.5, 0.5, '#C8102E'));
    const p = [[0.600, 0.215], [0.722, 0.110], [0.848, 0.255], [0.938, 0.418],
               [0.618, 0.482], [0.752, 0.398], [0.872, 0.585], [0.660, 0.762], [0.802, 0.845]];
    for (const q of p) s.push(['yil', '#FFCD00', q[0], q[1], 0.052, 5]);
    return s;
  })()];

  // ── VU ── Vanuatu · kırmızı/yeşil + siyah kenarlı sarı Y + domuz dişi ─────
  T.VU = ['Vanuatu', (function () {
    const s = [
      ['dik', '#C0102E', 0, 0, 1, 0.5],
      ['dik', '#009A44', 0, 0.5, 1, 0.5],
      ['dik', '#000000', 0, 0.432, 1, 0.136],
      ['dik', '#FFCD00', 0.340, 0.468, 0.660, 0.064],
      ['ucgen', '#000000', 0.420]
    ];
    s.push.apply(s, poli('#FFCD00', bant(0, 0.078, 0.385, 0.500, 0.085), 26, [0, 0, 0.420, 1]));
    s.push.apply(s, poli('#FFCD00', bant(0, 0.922, 0.385, 0.500, 0.085), 26, [0, 0, 0.420, 1]));
    s.push(['hal', '#FFCD00', 0.148, 0.500, 0.072, 0.022]);
    s.push(['dik', '#000000', 0.148, 0.428, 0.115, 0.082]);
    s.push(['egik', '#FFCD00', 0.112, 0.462, 0.192, 0.462, 0.014]);
    s.push(['egik', '#FFCD00', 0.152, 0.418, 0.152, 0.500, 0.012]);
    return s;
  })()];
})();
if (typeof window !== 'undefined') window.__bayrakAmerika = true;
