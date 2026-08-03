'use strict';
/* ============================================================================
   Asya bayrakları — Bayraklar.T tablosuna eklenir. Motor: js/bayraklar.js
   ----------------------------------------------------------------------------
   44 ülke = Asya'nın BM üyesi ülkeleri.
   ⚠ TR · RU · CY BURADA YOK — onlar `js/bayrak-avrupa.js`'te tanımlı
     (kıtalar arası ülkeler). Buraya eklenirse yükleme sırasına bağlı SESSİZ
     EZME olur.

   🔴 Motor DEĞİŞTİRİLMEDİ. Yalnız `Bayraklar.T` tablosuna satır eklenir.
   🔴 Yalnız bayraklar.js'te tanımlı ilkeller: y · d · yo · do · dik · hac ·
      arti · ucgen · dai · hal · yil · hil · cap · egik · yazi
      (Bu dosya: y · d · yo · do · dik · ucgen · egik · dai + `poli` yardımcısının
       ürettiği `dik` dilimleri. 'yazi' KULLANILMADI — gerekçe aşağıda.)
   🔴 Renkler resmi/Pantone kaynaklı HEX.

   ── 'yazi' NEDEN KULLANILMADI ────────────────────────────────────────────
   `yazi` `fillText` çağırır. Suudi Arabistan/Irak/Afganistan için Arapça hat
   glifi istenirse gliflerin varlığı FONTA bağlıdır (Windows'ta Segoe UI,
   Android'de Noto fallback) ve eksikse ekranda "tofu" kutusu çıkar. Ayrıca
   metin ÇİZİLDİĞİNİ ölçerek doğrulayamıyoruz (rasterizer fillText'i saymıyor,
   selfTest'in sahte ctx'i de fillRect/fill sayıyor). Bu yüzden bu üç bayrakta
   hat/kılıç işaretleri GEOMETRİK ilkellerle çizildi: her cihazda aynı görünür
   ve ekran görüntüsüyle doğrulanabilir. (Alan renkleri/oranları doğru.)

   ── `poli` YARDIMCISI ────────────────────────────────────────────────────
   Motorda serbest çokgen ilkeli yok. `poli()` verilen çokgeni YATAY `dik`
   dilimlerine çevirir (tarama satırı, çift-tek kuralı). Böylece Nepal'in iki
   flamalı şekli, Bahreyn/Katar testeresi, Kuveyt yamuğu, Bhutan köşegeni,
   Kore taegeuk'u hep izinli ilkellerle çıkar.

   ── 🔴 DAİRE DÜZELTMESİ (AX = 2/3) ───────────────────────────────────────
   `ciz()` birim kareyi kutuya `scale(w,h)` ile oturtur. 3:2 rozette motorun
   `dai`/`yil`/`hil` ilkelleri 1,5:1 YATAY ELİPS üretir. Japonya/Bangladeş/
   Laos/K.Kore gibi büyük disk bayraklarında bu göze batıyor (ölçüldü:
   `dai r=0.3` → 76×50 px, doğrusu 50×50 px). Bu yüzden BÜYÜK/ikonik
   yuvarlaklar `daire/halka/yildiz/hilal` yardımcılarıyla, x yarıçapı
   AX=2/3 ile sıkıştırılarak üretilir → 3:2 rozette GERÇEK daire çıkar.
   ⚠ Küçük süs noktaları için motorun `dai`'si yeterli (fark görünmez).

   ⚠ NEPAL DİKDÖRTGEN DEĞİLDİR: birim karenin köşeleri BİLİNÇLİ olarak boş
     bırakıldı (iki flama şekli). Arka planı doldurmak yanlış olurdu.

   ⚠ ARMALAR BİLİNÇLİ SADELEŞTİRİLDİ (bkz. bayraklar.js başlığı): KH Angkor
     Vat · TM halı gülleri · MN Soyombo · LK aslan/kılıç · BT ejderha ·
     KZ bozkır kartalı · KG tündük · TJ taç+7 yıldız · IR/IQ/SA hat işaretleri.
     Tamamen atlanmadı — atlansaydı KH ≈ düz mavi-kırmızı-mavi olurdu.
   ============================================================================ */
(function () {
  if (typeof Bayraklar === 'undefined') return;
  const T = Bayraklar.T;

  // 3:2 rozette yuvarlağın yuvarlak görünmesi için x yarıçapı düzeltmesi
  const AX = 2 / 3;

  // ── yardımcılar: HEPSİ yalnız izinli ilkellerden dizi ÜRETİR ─────────────

  // Çokgen(ler) → yatay `dik` dilimleri (çift-tek dolgu kuralı).
  // loops: [[x,y],...]  ya da  [[[x,y],...],[[x,y],...]] (halka için)
  // 🔴 PERFORMANS: `n` verilmezse dilim sayısı ŞEKİL YÜKSEKLİĞİNE göre seçilir.
  //   Sabit n=64/44 ile 45 bayrak 7.757 `dik` üretiyordu (Avrupa: 297) — 4 px'lik
  //   bir yıldıza 44 dilim düşüyordu. Uyarlamalı seçimle 3.994'e indi (-%49),
  //   görüntü AYNI: dilim yüksekliği ≈ kutu yüksekliği / 120, yani 120 px'lik
  //   kartta 1 px. Katsayıyı düşürürsen büyük kartta basamaklanma başlar.
  function poli(renk, loops, n) {
    if (loops.length && typeof loops[0][0] === 'number') loops = [loops];
    let y0 = 1e9, y1 = -1e9;
    for (const L of loops) for (const p of L) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    if (!(y1 > y0)) return [];
    if (!n) n = Math.max(8, Math.min(128, Math.round((y1 - y0) * 120)));
    const out = [], dy = (y1 - y0) / n, xs = [];
    for (let i = 0; i < n; i++) {
      const yc = y0 + (i + 0.5) * dy;
      xs.length = 0;
      for (const L of loops) for (let j = 0; j < L.length; j++) {
        const a = L[j], b = L[(j + 1) % L.length];
        if ((yc >= a[1] && yc < b[1]) || (yc >= b[1] && yc < a[1]))
          xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const w = xs[k + 1] - xs[k];
        if (w > 0.0006) out.push(['dik', renk, xs[k], y0 + i * dy, w, dy + 0.004]);
      }
    }
    return out;
  }

  function yayPts(cx, cy, rx, ry, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return out;
  }
  // ry = DİKEY yarıçap (birim yükseklik); x otomatik AX ile sıkışır
  function daire(renk, cx, cy, ry, n) {
    return poli(renk, yayPts(cx, cy, ry * AX, ry, 0, Math.PI * 2, 72), n);
  }
  function halka(renk, cx, cy, ry, kal, n) {
    const d = kal / 2;
    return poli(renk, [yayPts(cx, cy, (ry + d) * AX, ry + d, 0, Math.PI * 2, 72),
                       yayPts(cx, cy, (ry - d) * AX, ry - d, 0, Math.PI * 2, 72)], n);
  }
  function yildizPts(cx, cy, ry, uc, faz) {
    const n = uc || 5, ic = ry * (n === 5 ? 0.382 : (n === 6 ? 0.577 : 0.5)), out = [];
    const f = (faz == null) ? -Math.PI / 2 : faz;
    for (let i = 0; i < n * 2; i++) {
      const a = f + i * Math.PI / n, rr = (i % 2 === 0) ? ry : ic;
      out.push([cx + Math.cos(a) * rr * AX, cy + Math.sin(a) * rr]);
    }
    return out;
  }
  function yildiz(renk, cx, cy, ry, uc, faz, n) {
    return poli(renk, yildizPts(cx, cy, ry, uc, faz), n);
  }
  // Fly (sağ) tarafına açılan hilal — dış daire eksi kaydırılmış iç daire.
  // Kesişim açıları R=1, Ri=0.84, d=0.34 için ÇÖZÜLDÜ (0.9236 / 1.2530 rad).
  function hilal(renk, cx, cy, ry, n) {
    const Ri = ry * 0.84, d = ry * 0.34, ao = 0.9236, ai = 1.2530;
    const dis = yayPts(cx, cy, ry * AX, ry, ao, Math.PI * 2 - ao, 44);
    const ic = yayPts(cx + d * AX, cy, Ri * AX, Ri, -ai, -(Math.PI * 2 - ai), 44);
    return poli(renk, dis.concat(ic), n);
  }
  // Merkezden dışa ışınlar (güneş/çakra)
  function isin(renk, cx, cy, r0, r1, adet, kal, faz) {
    const out = [];
    for (let i = 0; i < adet; i++) {
      const a = (faz || 0) + i * Math.PI * 2 / adet;
      out.push(['egik', renk, cx + Math.cos(a) * r0 * AX, cy + Math.sin(a) * r0,
                              cx + Math.cos(a) * r1 * AX, cy + Math.sin(a) * r1, kal]);
    }
    return out;
  }
  // Testere kenarı (BH 5 uç, QA 9 uç) — beyaz şerit kırmızının içine girer
  function testere(xVadi, xTepe, adet) {
    const pts = [[1, 0], [1, 1]];
    for (let i = adet; i >= 0; i--) {
      pts.push([xVadi, i / adet]);
      if (i > 0) pts.push([xTepe, (i - 0.5) / adet]);
    }
    return pts;
  }
  // Kalınlığı boyunca DEĞİŞEN şerit (BT ejderha gövdesi) → tek çokgen.
  // ⚠ Sabit kalınlıklı `egik` zinciri denendi: 300 px'te "çöp adam" gibi
  //   göründü (ekran görüntüsüyle ölçüldü). Konik şerit çok daha okunaklı.
  function serit(renk, yol, kal, n) {
    const sol = [], sag = [];
    for (let i = 0; i < yol.length; i++) {
      const a = yol[Math.max(0, i - 1)], b = yol[Math.min(yol.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      sol.push([yol[i][0] - dy * kal[i], yol[i][1] + dx * kal[i]]);
      sag.push([yol[i][0] + dy * kal[i], yol[i][1] - dx * kal[i]]);
    }
    return poli(renk, sol.concat(sag.reverse()), n);
  }
  // Konik kule (KH Angkor Vat) — düz `dik` + üçgen "ok ucu" gibi görünüyordu
  function kule(renk, cx, tabanY, tepeY, wT, wt) {
    return poli(renk, [[cx - wt / 2, tepeY], [cx + wt / 2, tepeY],
                       [cx + wT / 2, tabanY], [cx - wT / 2, tabanY]]);
  }
  // Küçük haç işareti (GE Bolnisi haçları)
  function hacIsaret(renk, cx, cy, w, h, k) {
    return [['dik', renk, cx - w / 2, cy - k / 2, w, k],
            ['dik', renk, cx - k / 2 * 0.8, cy - h / 2, k * 0.8, h]];
  }
  // Trigram (KR) — barlar merkeze bakan yöne DİK; 1=tam, 0=kırık
  function trigram(renk, cx, cy, dx, dy, kalip, uzun, kal, ara) {
    const L = Math.hypot(dx, dy); dx /= L; dy /= L;
    const px = -dy, py = dx, out = [], g = uzun * 0.15;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * ara, bx = cx + dx * off, by = cy + dy * off;
      if (kalip[i]) {
        out.push(['egik', renk, bx - px * uzun / 2, by - py * uzun / 2,
                                bx + px * uzun / 2, by + py * uzun / 2, kal]);
      } else {
        out.push(['egik', renk, bx - px * uzun / 2, by - py * uzun / 2, bx - px * g, by - py * g, kal]);
        out.push(['egik', renk, bx + px * g, by + py * g, bx + px * uzun / 2, by + py * uzun / 2, kal]);
      }
    }
    return out;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AF · Afganistan — siyah/kırmızı/yeşil dikey + beyaz mescit amblemi
  // (BM'de temsil edilen İslam Cumhuriyeti bayrağı)
  T.AF = ['Afganistan', [['d', ['#000000', '#D32011', '#007A36']]]
    .concat(halka('#FFFFFF', 0.5, 0.5, 0.205, 0.026))
    .concat([
      ['dik', '#FFFFFF', 0.452, 0.585, 0.096, 0.030],   // minber tabanı
      ['dik', '#FFFFFF', 0.470, 0.470, 0.060, 0.120],   // mihrap
      ['dik', '#FFFFFF', 0.434, 0.420, 0.015, 0.170],   // sol minare
      ['dik', '#FFFFFF', 0.551, 0.420, 0.015, 0.170]    // sağ minare
    ])
    .concat(daire('#FFFFFF', 0.5, 0.452, 0.048))];       // kubbe

  // AM · Ermenistan
  T.AM = ['Ermenistan', [['y', ['#D90012', '#0033A0', '#F2A800']]]];

  // AZ · Azerbaycan — hilal + 8 köşeli yıldız
  T.AZ = ['Azerbaycan', [['y', ['#00B9E4', '#ED2939', '#3F9C35']]]
    .concat(hilal('#FFFFFF', 0.415, 0.5, 0.150))
    .concat(yildiz('#FFFFFF', 0.610, 0.5, 0.088, 8))];

  // BH · Bahreyn — 5 uçlu testere
  T.BH = ['Bahreyn', [['dik', '#FFFFFF', 0, 0, 1, 1]]
    .concat(poli('#CE1126', testere(0.33, 0.47, 5), 120))];

  // BD · Bangladeş — disk merkezi 9/20 uzunlukta, çap = 1/5 uzunluk
  T.BD = ['Bangladeş', [['dik', '#006A4E', 0, 0, 1, 1]]
    .concat(daire('#F42A41', 0.45, 0.5, 0.30))];

  // BT · Bhutan — köşegen sarı/turuncu + beyaz ejderha (sadeleştirilmiş)
  T.BT = ['Bhutan', (function () {
    const W = '#FFFFFF';
    let s = [['dik', '#FFD520', 0, 0, 1, 1]].concat(poli('#FF4E12', [[1, 0], [1, 1], [0, 1]]));
    // gövde: kuyruktan boyuna incelen konik şerit (köşegen boyunca)
    s = s.concat(serit(W, [[0.070, 0.910], [0.150, 0.830], [0.255, 0.740], [0.360, 0.678],
                           [0.470, 0.662], [0.565, 0.690], [0.650, 0.640], [0.715, 0.530],
                           [0.762, 0.418]],
                          [0.016, 0.038, 0.056, 0.064, 0.064, 0.058, 0.052, 0.044, 0.038]));
    s = s.concat(daire(W, 0.788, 0.336, 0.078));                       // baş
    s = s.concat(poli(W, [[0.940, 0.288], [0.940, 0.352], [0.800, 0.372], [0.800, 0.276]], 26)); // ağız/burun
    s = s.concat(poli(W, [[0.762, 0.196], [0.792, 0.268], [0.736, 0.264]], 14));   // sol boynuz
    s = s.concat(poli(W, [[0.850, 0.200], [0.862, 0.272], [0.812, 0.258]], 14));   // sağ boynuz
    s = s.concat(serit(W, [[0.058, 0.930], [0.030, 0.968]], [0.030, 0.014]));      // kuyruk ucu
    // 4 kısa bacak + pençe
    const bac = [[0.215, 0.790, 0.180, 0.888], [0.395, 0.730, 0.372, 0.848],
                 [0.560, 0.744, 0.596, 0.856], [0.688, 0.586, 0.766, 0.648]];
    for (const b of bac) {
      s.push(['egik', W, b[0], b[1], b[2], b[3], 0.034]);
      s = s.concat(daire(W, b[2], b[3], 0.034));
    }
    s = s.concat(daire(W, 0.860, 0.552, 0.042));                       // mücevher (norbu)
    return s;
  })()];

  // BN · Brunei — sarı zemin + beyaz/siyah köşegen şerit + kırmızı arma
  T.BN = ['Brunei', [
    ['dik', '#F7E017', 0, 0, 1, 1],
    ['egik', '#FFFFFF', 0, 0.255, 1, 0.615, 0.195],
    ['egik', '#000000', 0, 0.4320, 1, 0.7920, 0.150]
  ].concat(hilal('#CF1126', 0.505, 0.520, 0.180))
   .concat([
      // ⚠ "eller" (iki kırmızı blok) SİLİNDİ: 300 px'te amblem kırık bir "F"
      //   gibi görünüyordu. Kalan: hilal + gönder + şemsiye + kurdele.
      ['dik', '#CF1126', 0.487, 0.248, 0.036, 0.152],   // gönder
      ['dik', '#CF1126', 0.392, 0.210, 0.242, 0.044],   // şemsiye
      ['dik', '#CF1126', 0.330, 0.676, 0.376, 0.048]    // kurdele
   ])];

  // KH · Kamboçya — 1:2:1 + beyaz Angkor Vat (5 konik kule, sadeleştirilmiş)
  T.KH = ['Kamboçya', (function () {
    const W = '#FFFFFF';
    let s = [['yo', [['#032EA1', 1], ['#E00025', 2], ['#032EA1', 1]]],
      ['dik', W, 0.298, 0.634, 0.404, 0.040],     // taban sahanlığı
      ['dik', W, 0.320, 0.586, 0.360, 0.048],     // galeri
      ['dik', W, 0.352, 0.556, 0.296, 0.032]      // üst teras
    ];
    // 5 kule: dış-küçük, ara, orta-büyük
    s = s.concat(kule(W, 0.500, 0.566, 0.372, 0.090, 0.046));
    s = s.concat(poli(W, [[0.500, 0.316], [0.524, 0.372], [0.476, 0.372]], 16));
    s = s.concat(kule(W, 0.404, 0.566, 0.438, 0.076, 0.040));
    s = s.concat(poli(W, [[0.404, 0.394], [0.424, 0.438], [0.384, 0.438]], 14));
    s = s.concat(kule(W, 0.596, 0.566, 0.438, 0.076, 0.040));
    s = s.concat(poli(W, [[0.596, 0.394], [0.616, 0.438], [0.576, 0.438]], 14));
    s = s.concat(kule(W, 0.330, 0.566, 0.492, 0.058, 0.032));
    s = s.concat(poli(W, [[0.330, 0.458], [0.346, 0.492], [0.314, 0.492]], 12));
    s = s.concat(kule(W, 0.670, 0.566, 0.492, 0.058, 0.032));
    s = s.concat(poli(W, [[0.670, 0.458], [0.686, 0.492], [0.654, 0.492]], 12));
    return s;
  })()];

  // CN · Çin — 30×20 yapım şeması: büyük yıldız (5,5) r=3, küçükler r=1
  // Her küçük yıldızın bir ucu büyük yıldıza BAKAR (faz açıları hesaplandı).
  T.CN = ['Çin', [['dik', '#DE2910', 0, 0, 1, 1]]
    .concat(yildiz('#FFDE00', 0.1667, 0.25, 0.150, 5))
    .concat(yildiz('#FFDE00', 0.3333, 0.10, 0.050, 5, 2.601))
    .concat(yildiz('#FFDE00', 0.4000, 0.20, 0.050, 5, 3.000))
    .concat(yildiz('#FFDE00', 0.4000, 0.35, 0.050, 5, -2.863))
    .concat(yildiz('#FFDE00', 0.3333, 0.45, 0.050, 5, -2.467))];

  // GE · Gürcistan — beş haç
  T.GE = ['Gürcistan', [
    ['dik', '#FFFFFF', 0, 0, 1, 1],
    ['arti', '#FF0000', 0.185]
  ].concat(hacIsaret('#FF0000', 0.200, 0.245, 0.120, 0.170, 0.044))
   .concat(hacIsaret('#FF0000', 0.800, 0.245, 0.120, 0.170, 0.044))
   .concat(hacIsaret('#FF0000', 0.200, 0.755, 0.120, 0.170, 0.044))
   .concat(hacIsaret('#FF0000', 0.800, 0.755, 0.120, 0.170, 0.044))];

  // IN · Hindistan — safran/beyaz/yeşil + lacivert Ashoka Çakrası
  T.IN = ['Hindistan', [['y', ['#FF9933', '#FFFFFF', '#138808']]]
    .concat(halka('#000080', 0.5, 0.5, 0.122, 0.016))
    .concat(isin('#000080', 0.5, 0.5, 0.020, 0.114, 12, 0.009))
    .concat(daire('#000080', 0.5, 0.5, 0.024))];

  // ID · Endonezya (Monako'dan daha parlak kırmızı ve 3:2 oran ile ayrılır)
  T.ID = ['Endonezya', [['y', ['#FF0000', '#FFFFFF']]]];

  // IR · İran — yeşil/beyaz/kırmızı + 2×11 tekbir çizgisi + kırmızı amblem
  T.IR = ['İran', (function () {
    const s = [['y', ['#239F40', '#FFFFFF', '#DA0000']]];
    for (let i = 0; i < 11; i++) {                       // tekbir (22 kez)
      const x = 0.045 + i * 0.0865;
      s.push(['dik', '#FFFFFF', x, 0.284, 0.030, 0.026]);
      s.push(['dik', '#FFFFFF', x, 0.690, 0.030, 0.026]);
    }
    s.push(['dik', '#DA0000', 0.4855, 0.380, 0.029, 0.230]);  // orta kılıç
    s.push(['dik', '#DA0000', 0.4430, 0.428, 0.024, 0.148]);  // sol
    s.push(['dik', '#DA0000', 0.5330, 0.428, 0.024, 0.148]);  // sağ
    s.push(['dik', '#DA0000', 0.4370, 0.452, 0.126, 0.030]);  // teşdid
    s.push(['egik', '#DA0000', 0.404, 0.590, 0.424, 0.452, 0.024]);
    s.push(['egik', '#DA0000', 0.596, 0.590, 0.576, 0.452, 0.024]);
    s.push.apply(s, poli('#DA0000', [[0.500, 0.344], [0.523, 0.388], [0.477, 0.388]], 14));
    return s;
  })()];

  // IQ · Irak — kırmızı/beyaz/siyah + yeşil tekbir (üç hat kümesi)
  T.IQ = ['Irak', [['y', ['#CE1126', '#FFFFFF', '#000000']],
    ['dik', '#007A3D', 0.300, 0.470, 0.115, 0.030],
    ['dik', '#007A3D', 0.300, 0.428, 0.024, 0.046],
    ['dik', '#007A3D', 0.362, 0.418, 0.024, 0.056],
    ['dik', '#007A3D', 0.445, 0.470, 0.112, 0.030],
    ['dik', '#007A3D', 0.445, 0.423, 0.024, 0.051],
    ['dik', '#007A3D', 0.502, 0.413, 0.024, 0.061],
    ['dik', '#007A3D', 0.588, 0.470, 0.115, 0.030],
    ['dik', '#007A3D', 0.588, 0.428, 0.024, 0.046],
    ['dik', '#007A3D', 0.650, 0.418, 0.024, 0.056]
  ]];

  // IL · İsrail — iki mavi şerit + Davud yıldızı (6 uç, iç/dış = 0.577)
  T.IL = ['İsrail', [
    ['dik', '#FFFFFF', 0, 0, 1, 1],
    ['dik', '#0038B8', 0, 0.145, 1, 0.125],
    ['dik', '#0038B8', 0, 0.730, 1, 0.125]
  ].concat(yildiz('#0038B8', 0.5, 0.5, 0.132, 6))];

  // JP · Japonya — disk çapı = yüksekliğin 3/5'i, TAM ORTADA (1999 yasası)
  T.JP = ['Japonya', [['dik', '#FFFFFF', 0, 0, 1, 1]]
    .concat(daire('#BC002D', 0.5, 0.5, 0.30))];

  // JO · Ürdün — siyah/beyaz/yeşil + kırmızı üçgen + 7 köşeli yıldız
  T.JO = ['Ürdün', [['y', ['#000000', '#FFFFFF', '#007A3D']], ['ucgen', '#CE1126', 0.5]]
    .concat(yildiz('#FFFFFF', 0.150, 0.5, 0.080, 7))];

  // KZ · Kazakistan — 32 ışınlı güneş + bozkır kartalı + hoist bezemesi
  //   ⚠ Kartal önce düz `egik` çizgileriyle çizilmişti: 300 px'te "Y anteni"
  //     gibi görünüyordu. Şimdi konik `serit` kanatlar + gövde/kuyruk.
  T.KZ = ['Kazakistan', (function () {
    const G = '#FEC50C';
    let s = [['dik', '#00AFCA', 0, 0, 1, 1]]
      .concat(isin(G, 0.530, 0.400, 0.112, 0.190, 32, 0.010))
      .concat(daire(G, 0.530, 0.400, 0.108))
      .concat(serit(G, [[0.286, 0.676], [0.372, 0.618], [0.452, 0.588], [0.514, 0.578]],
                       [0.010, 0.024, 0.032, 0.034]))
      .concat(serit(G, [[0.774, 0.676], [0.688, 0.618], [0.608, 0.588], [0.546, 0.578]],
                       [0.010, 0.024, 0.032, 0.034]))
      .concat(poli(G, [[0.530, 0.544], [0.558, 0.574], [0.554, 0.662], [0.530, 0.704],
                       [0.506, 0.662], [0.502, 0.574]], 34));
    for (const t of [[0.334, 0.654, 0.348, 0.712], [0.400, 0.618, 0.410, 0.678],
                     [0.464, 0.596, 0.470, 0.656]]) {
      s.push(['egik', G, t[0], t[1], t[2], t[3], 0.014]);
      s.push(['egik', G, 1.06 - t[0], t[1], 1.06 - t[2], t[3], 0.014]);
    }
    for (let i = 0; i < 5; i++) s = s.concat(yildiz(G, 0.045, 0.140 + i * 0.190, 0.052, 4));
    return s;
  })()];

  // KW · Kuveyt — yeşil/beyaz/kırmızı + siyah yamuk (hoist)
  T.KW = ['Kuveyt', [['y', ['#007A3D', '#FFFFFF', '#CE1126']]]
    .concat(poli('#000000', [[0, 0], [0.25, 1 / 3], [0.25, 2 / 3], [0, 1]]))];

  // KG · Kırgızistan — 40 ışınlı güneş + tündük (yurt tacı)
  T.KG = ['Kırgızistan', [['dik', '#E8112D', 0, 0, 1, 1]]
    .concat(isin('#FFEF00', 0.5, 0.5, 0.110, 0.190, 40, 0.009))
    .concat(daire('#FFEF00', 0.5, 0.5, 0.118))
    .concat(halka('#E8112D', 0.5, 0.5, 0.080, 0.019))
    .concat([
      ['egik', '#E8112D', 0.447, 0.500, 0.553, 0.500, 0.015],
      ['egik', '#E8112D', 0.500, 0.420, 0.500, 0.580, 0.015],
      ['egik', '#E8112D', 0.462, 0.443, 0.538, 0.557, 0.013],
      ['egik', '#E8112D', 0.538, 0.443, 0.462, 0.557, 0.013]
    ])];

  // LA · Laos — 1:2:1 + beyaz disk (çap = mavi bandın 0.8'i)
  T.LA = ['Laos', [['yo', [['#CE1126', 1], ['#002868', 2], ['#CE1126', 1]]]]
    .concat(daire('#FFFFFF', 0.5, 0.5, 0.200))];

  // LB · Lübnan — 1:2:1 + yeşil sedir
  T.LB = ['Lübnan', [['yo', [['#EE161F', 1], ['#FFFFFF', 2], ['#EE161F', 1]]],
    ['dik', '#00A850', 0.480, 0.640, 0.040, 0.090]
  ].concat(poli('#00A850', [[0.500, 0.560], [0.640, 0.662], [0.360, 0.662]], 20))
   .concat(poli('#00A850', [[0.500, 0.468], [0.606, 0.576], [0.394, 0.576]], 20))
   .concat(poli('#00A850', [[0.500, 0.384], [0.570, 0.490], [0.430, 0.490]], 18))
   .concat(poli('#00A850', [[0.500, 0.308], [0.546, 0.404], [0.454, 0.404]], 16))];

  // MY · Malezya — 14 şerit + kanton (8/14 yükseklik, 1/2 genişlik)
  T.MY = ['Malezya', [
    ['y', ['#CC0001', '#FFFFFF', '#CC0001', '#FFFFFF', '#CC0001', '#FFFFFF', '#CC0001',
           '#FFFFFF', '#CC0001', '#FFFFFF', '#CC0001', '#FFFFFF', '#CC0001', '#FFFFFF']],
    ['dik', '#010066', 0, 0, 0.5, 0.5714]
  ].concat(hilal('#FFCC00', 0.190, 0.295, 0.130))
   .concat(yildiz('#FFCC00', 0.352, 0.295, 0.108, 14))];

  // MV · Maldivler — kırmızı zemin + yeşil dikdörtgen + beyaz hilal
  T.MV = ['Maldivler', [
    ['dik', '#D21034', 0, 0, 1, 1],
    ['dik', '#007E3A', 0.185, 0.235, 0.630, 0.530]
  ].concat(hilal('#FFFFFF', 0.560, 0.500, 0.170))];

  // MN · Moğolistan — kırmızı/mavi/kırmızı + altın Soyombo (sadeleştirilmiş)
  T.MN = ['Moğolistan', (function () {
    const G = '#F9CF02', cx = 0.1667;
    let s = [['d', ['#C4272F', '#0066B3', '#C4272F']],
      ['dik', G, 0.090, 0.300, 0.014, 0.380],          // sol dikey bar
      ['dik', G, 0.230, 0.300, 0.014, 0.380],          // sağ dikey bar
      ['dik', G, 0.113, 0.382, 0.108, 0.026],          // üst yatay bar
      ['dik', G, 0.113, 0.566, 0.108, 0.026],          // alt yatay bar
      ['dik', G, 0.148, 0.442, 0.038, 0.030]           // yin-yang dolgusu
    ];
    s = s.concat(poli(G, [[cx, 0.100], [0.181, 0.166], [0.152, 0.166]], 14));   // alev
    s = s.concat(poli(G, [[0.126, 0.128], [0.144, 0.170], [0.114, 0.170]], 12));
    s = s.concat(poli(G, [[0.207, 0.128], [0.219, 0.170], [0.189, 0.170]], 12));
    s = s.concat(daire(G, cx, 0.205, 0.026));                                   // güneş
    s = s.concat(hilal(G, cx, 0.264, 0.030));                                   // ay
    s = s.concat(poli(G, [[0.115, 0.310], [0.219, 0.310], [cx, 0.366]], 14));   // üst üçgen
    s = s.concat(poli(G, [[0.115, 0.662], [0.219, 0.662], [cx, 0.606]], 14));   // alt üçgen
    s = s.concat(halka(G, cx, 0.472, 0.048, 0.022));                            // yin-yang
    return s;
  })()];

  // MM · Myanmar — sarı/yeşil/kırmızı + büyük beyaz yıldız
  T.MM = ['Myanmar', [['y', ['#FECB00', '#34B233', '#EA2839']]]
    .concat(yildiz('#FFFFFF', 0.5, 0.5, 0.360, 5))];

  // NP · Nepal — 🔴 DİKDÖRTGEN DEĞİL: iki flama. Köşeler BİLİNÇLİ boş.
  //   Dış (mavi) kenar → iç (kırmızı) alan içeriden 0.024 kaydırılarak çözüldü.
  T.NP = ['Nepal', (function () {
    const DIS = [[0, 0.02], [0.86, 0.32], [0.2175, 0.4545], [0.99, 0.79], [0, 0.98]];
    const IC  = [[0.030, 0.056], [0.771, 0.314], [0.139, 0.447], [0.909, 0.781], [0.030, 0.950]];
    let s = poli('#003893', DIS).concat(poli('#DC143C', IC));
    s = s.concat(hilal('#FFFFFF', 0.255, 0.210, 0.098));          // ay
    s = s.concat(isin('#FFFFFF', 0.300, 0.700, 0.060, 0.112, 12, 0.017));
    s = s.concat(daire('#FFFFFF', 0.300, 0.700, 0.064));          // güneş
    return s;
  })()];

  // KP · Kuzey Kore — 2:0.5:7:0.5:2 + beyaz disk + kırmızı yıldız
  T.KP = ['Kuzey Kore', [['yo', [['#024FA2', 2], ['#FFFFFF', 0.5], ['#ED1C27', 7],
                                 ['#FFFFFF', 0.5], ['#024FA2', 2]]]]
    .concat(daire('#FFFFFF', 0.295, 0.5, 0.215))
    .concat(yildiz('#ED1C27', 0.295, 0.5, 0.155, 5))];

  // OM · Umman — hoist kırmızı bandı + beyaz/kırmızı/yeşil + hançer arması
  T.OM = ['Umman', [
    ['dik', '#FFFFFF', 0.28, 0, 0.72, 0.3333],
    ['dik', '#DB161B', 0.28, 0.3333, 0.72, 0.3334],
    ['dik', '#008000', 0.28, 0.6667, 0.72, 0.3333],
    ['dik', '#DB161B', 0, 0, 0.28, 1],
    // arka planda YATAYA yakın çapraz kılıçlar, önde dikey hançer (khanjar)
    ['egik', '#FFFFFF', 0.048, 0.238, 0.230, 0.166, 0.017],
    ['egik', '#FFFFFF', 0.230, 0.238, 0.048, 0.166, 0.017],
    ['dik',  '#FFFFFF', 0.100, 0.044, 0.078, 0.019],          // sap başı
    ['dik',  '#FFFFFF', 0.128, 0.060, 0.022, 0.080],          // sap
    ['dik',  '#FFFFFF', 0.098, 0.136, 0.082, 0.022]           // kemer
  ].concat(poli('#FFFFFF', [[0.120, 0.158], [0.166, 0.158], [0.174, 0.226],
                            [0.142, 0.278], [0.112, 0.222]], 24))];       // eğri kın

  // PK · Pakistan — hoist beyaz bandı (1/4) + hilal + yıldız
  T.PK = ['Pakistan', [
    ['dik', '#01411C', 0, 0, 1, 1],
    ['dik', '#FFFFFF', 0, 0, 0.25, 1]
  ].concat(hilal('#FFFFFF', 0.585, 0.545, 0.195))
   .concat(yildiz('#FFFFFF', 0.780, 0.330, 0.100, 5, -Math.PI / 2 + 0.6))];

  // PH · Filipinler — mavi/kırmızı + beyaz üçgen + 8 ışınlı güneş + 3 yıldız
  T.PH = ['Filipinler', [
    ['y', ['#0038A8', '#CE1126']],
    ['ucgen', '#FFFFFF', 0.5]
  ].concat(isin('#FCD116', 0.155, 0.500, 0.056, 0.118, 8, 0.014))
   .concat(daire('#FCD116', 0.155, 0.500, 0.058))
   .concat(yildiz('#FCD116', 0.058, 0.108, 0.040, 5))
   .concat(yildiz('#FCD116', 0.058, 0.892, 0.040, 5))
   .concat(yildiz('#FCD116', 0.412, 0.500, 0.040, 5))];

  // QA · Katar — 9 uçlu testere, bordo (Bahreyn'den uç sayısı + ton ile ayrılır)
  T.QA = ['Katar', [['dik', '#FFFFFF', 0, 0, 1, 1]]
    .concat(poli('#8A1538', testere(0.30, 0.40, 9), 132))];

  // SA · Suudi Arabistan — yeşil zemin + şehadet hattı + kılıç
  //   ⚠ Arapça metin ÇİZİLMEDİ; hat GEOMETRİK olarak temsil edildi (bkz. başlık).
  //   ⚠ İlk sürümde eşit aralıklı/eşit boylu çubuklar kullanılmıştı: 300 px'te
  //     TARAK gibi, kılıç da ÇİFT UÇLU OK gibi görünüyordu (ekran görüntüsü).
  //     Şimdi: değişken boy/aralık + taban çizgisi + satır altı ilmekler; kılıç
  //     sivri uçlu konik namlu + balçak/sap/topuz.
  T.SA = ['Suudi Arabistan', (function () {
    const W = '#FFFFFF';
    let s = [
      ['dik', '#006C35', 0, 0, 1, 1],
      ['dik', W, 0.135, 0.316, 0.730, 0.030]        // hat taban çizgisi
    ];
    const dik = [[0.163, 0.238, 0.026, 0.080], [0.204, 0.262, 0.021, 0.056],
                 [0.261, 0.226, 0.026, 0.092], [0.314, 0.268, 0.019, 0.050],
                 [0.371, 0.234, 0.026, 0.084], [0.429, 0.270, 0.019, 0.048],
                 [0.469, 0.220, 0.027, 0.098], [0.534, 0.264, 0.021, 0.054],
                 [0.597, 0.236, 0.026, 0.082], [0.659, 0.268, 0.019, 0.050],
                 [0.705, 0.228, 0.026, 0.090], [0.774, 0.264, 0.021, 0.054],
                 [0.821, 0.244, 0.024, 0.074]];
    for (const d of dik) s.push(['dik', W, d[0], d[1], d[2], d[3]]);
    for (const x of [0.228, 0.400, 0.638, 0.798]) s = s.concat(daire(W, x, 0.368, 0.026));
    // kılıç: sola sivrilen namlu + balçak + sap + topuz
    s = s.concat(poli(W, [[0.140, 0.628], [0.300, 0.594], [0.762, 0.594],
                          [0.762, 0.662], [0.300, 0.662]], 40));
    s.push(['dik', W, 0.762, 0.572, 0.026, 0.112]);   // balçak
    s.push(['dik', W, 0.788, 0.606, 0.068, 0.044]);   // sap
    s = s.concat(daire(W, 0.872, 0.628, 0.034));      // topuz
    return s;
  })()];

  // SG · Singapur — kırmızı/beyaz + hilal + daire dizilimli 5 yıldız
  T.SG = ['Singapur', (function () {
    let s = [['y', ['#EF3340', '#FFFFFF']]].concat(hilal('#FFFFFF', 0.160, 0.245, 0.155));
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      s = s.concat(yildiz('#FFFFFF', 0.318 + Math.cos(a) * 0.086 * AX,
                                     0.245 + Math.sin(a) * 0.086, 0.038, 5));
    }
    return s;
  })()];

  // KR · Güney Kore — taegeuk (S eğrisi iki yarım daireden) + 4 trigram
  T.KR = ['Güney Kore', (function () {
    const R = 0.200, cx = 0.5, cy = 0.5;
    // kırmızı = üst yarım + S eğrisi (sağda yukarı, solda aşağı kabaran)
    let pts = yayPts(cx, cy, R * AX, R, Math.PI, Math.PI * 2, 48);
    pts = pts.concat(yayPts(cx + R / 2 * AX, cy, R / 2 * AX, R / 2, 0, -Math.PI, 24));
    pts = pts.concat(yayPts(cx - R / 2 * AX, cy, R / 2 * AX, R / 2, 0, Math.PI, 24));
    let s = [['dik', '#FFFFFF', 0, 0, 1, 1]]
      .concat(daire('#0047A0', cx, cy, R))
      .concat(poli('#CD2E3A', pts, 72));
    const K = '#000000', U = 0.200, KL = 0.026, AR = 0.044;
    s = s.concat(trigram(K, 0.200, 0.235,  0.300,  0.265, [1, 1, 1], U, KL, AR)); // ☰ geon
    s = s.concat(trigram(K, 0.800, 0.235, -0.300,  0.265, [0, 1, 0], U, KL, AR)); // ☵ gam
    s = s.concat(trigram(K, 0.200, 0.765,  0.300, -0.265, [1, 0, 1], U, KL, AR)); // ☲ ri
    s = s.concat(trigram(K, 0.800, 0.765, -0.300, -0.265, [0, 0, 0], U, KL, AR)); // ☷ gon
    return s;
  })()];

  // LK · Sri Lanka — altın çerçeve + yeşil/turuncu şerit + bordo panel + aslan
  T.LK = ['Sri Lanka', (function () {
    const A = '#FFBE29';
    let s = [
      ['dik', A, 0, 0, 1, 1],
      ['dik', '#00534E', 0.045, 0.075, 0.115, 0.850],
      ['dik', '#EB7400', 0.170, 0.075, 0.115, 0.850],
      ['dik', '#8D2029', 0.320, 0.075, 0.635, 0.850],
      // ⚠ İLK SÜRÜM FİL GİBİ GÖRÜNÜYORDU: baş dairesinden yukarı çıkan kılıç
      //   hortuma benziyordu (300 px ekran görüntüsüyle yakalandı). Şimdi aslan
      //   sola bakıyor, kılıç KALDIRILMIŞ ÖN PENÇEDE, ayrıca 2 bacak+ayak,
      //   püsküllü kuyruk ve belirgin yele var.
      ['dik', A, 0.436, 0.208, 0.024, 0.162],            // kılıç namlusu
      ['dik', A, 0.406, 0.366, 0.082, 0.022],            // balçak
      ['dik', A, 0.437, 0.386, 0.022, 0.046],            // sap
      ['egik', A, 0.450, 0.418, 0.524, 0.494, 0.030],    // kaldırılmış ön pençe
      ['dik', A, 0.396, 0.392, 0.092, 0.050],            // burun/çene
      ['dik', A, 0.520, 0.470, 0.232, 0.150],            // gövde
      ['dik', A, 0.548, 0.596, 0.044, 0.140],            // ön bacak
      ['dik', A, 0.534, 0.722, 0.080, 0.030],            // ön ayak
      ['dik', A, 0.700, 0.596, 0.044, 0.140],            // arka bacak
      ['dik', A, 0.686, 0.722, 0.080, 0.030],            // arka ayak
      ['egik', A, 0.780, 0.508, 0.842, 0.348, 0.022]     // kuyruk
    ];
    s = s.concat(daire(A, 0.752, 0.545, 0.078));         // sağrı
    s = s.concat(daire(A, 0.512, 0.412, 0.098));         // yele + baş
    s = s.concat(daire(A, 0.848, 0.318, 0.042));         // kuyruk püskülü
    s = s.concat(poli(A, [[0.448, 0.168], [0.468, 0.212], [0.428, 0.212]], 12)); // kılıç ucu
    // 4 bo yaprağı (panel köşeleri)
    const yap = [[0.372, 0.148], [0.902, 0.148], [0.372, 0.852], [0.902, 0.852]];
    for (const p of yap)
      s = s.concat(poli(A, [[p[0], p[1] - 0.058], [p[0] + 0.030, p[1] + 0.018],
                            [p[0], p[1] + 0.058], [p[0] - 0.030, p[1] + 0.018]], 18));
    return s;
  })()];

  // SY · Suriye — yeşil/beyaz/siyah + 3 kırmızı yıldız (2025'te kabul edilen bayrak)
  T.SY = ['Suriye', [['y', ['#007A3D', '#FFFFFF', '#000000']]]
    .concat(yildiz('#CE1126', 0.300, 0.5, 0.086, 5))
    .concat(yildiz('#CE1126', 0.500, 0.5, 0.086, 5))
    .concat(yildiz('#CE1126', 0.700, 0.5, 0.086, 5))];

  // TJ · Tacikistan — 2:3:2 + altın taç + 7 yıldız yayı
  T.TJ = ['Tacikistan', (function () {
    const G = '#F8C300';
    let s = [['yo', [['#CC0000', 2], ['#FFFFFF', 3], ['#006600', 2]]],
      ['dik', G, 0.435, 0.556, 0.130, 0.056],
      ['dik', G, 0.437, 0.506, 0.024, 0.056],
      ['dik', G, 0.488, 0.492, 0.024, 0.070],
      ['dik', G, 0.539, 0.506, 0.024, 0.056]
    ];
    // ⚠ yay yarıçapı 0.118 iken yıldızlar tacın İÇİNE giriyordu (300 px render)
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + i * Math.PI / 6;
      s = s.concat(yildiz(G, 0.500 + Math.cos(a) * 0.152 * AX,
                             0.620 + Math.sin(a) * 0.152, 0.031, 5));
    }
    return s;
  })()];

  // TH · Tayland — 1:1:2:1:1
  T.TH = ['Tayland', [['yo', [['#A51931', 1], ['#F4F5F8', 1], ['#2D2A4A', 2],
                              ['#F4F5F8', 1], ['#A51931', 1]]]]];

  // TL · Doğu Timor — sarı üçgen (1/2) + siyah üçgen (1/3) + beyaz yıldız
  T.TL = ['Doğu Timor', [
    ['dik', '#DA020E', 0, 0, 1, 1],
    ['ucgen', '#FFC72C', 0.5],
    ['ucgen', '#000000', 0.3333]
  ].concat(yildiz('#FFFFFF', 0.112, 0.5, 0.088, 5))];

  // TM · Türkmenistan — yeşil + halı şeridi (5 gül) + hilal + 5 yıldız
  T.TM = ['Türkmenistan', (function () {
    let s = [
      ['dik', '#28AE66', 0, 0, 1, 1],
      ['dik', '#C1272D', 0.085, 0.030, 0.115, 0.940]
    ];
    for (let i = 0; i < 5; i++) {                       // halı gülleri (baklava)
      const cy = 0.108 + i * 0.176;
      s = s.concat(poli('#FFFFFF', [[0.1425, cy - 0.070], [0.190, cy], [0.1425, cy + 0.070],
                                    [0.095, cy]], 22));
      s = s.concat(poli('#C1272D', [[0.1425, cy - 0.032], [0.164, cy], [0.1425, cy + 0.032],
                                    [0.121, cy]], 14));
    }
    s = s.concat(hilal('#FFFFFF', 0.400, 0.260, 0.115));
    for (let i = 0; i < 5; i++) {
      const a = (-55 + i * 27.5) * Math.PI / 180;
      s = s.concat(yildiz('#FFFFFF', 0.400 + Math.cos(a) * 0.215 * AX,
                                     0.260 + Math.sin(a) * 0.215, 0.038, 5));
    }
    return s;
  })()];

  // AE · Birleşik Arap Emirlikleri
  T.AE = ['Birleşik Arap Emirlikleri', [
    ['dik', '#00732F', 0.25, 0, 0.75, 0.3333],
    ['dik', '#FFFFFF', 0.25, 0.3333, 0.75, 0.3334],
    ['dik', '#000000', 0.25, 0.6667, 0.75, 0.3333],
    ['dik', '#FF0000', 0, 0, 0.25, 1]
  ]];

  // UZ · Özbekistan — mavi/beyaz/yeşil + ince kırmızı ayraç + hilal + 12 yıldız
  T.UZ = ['Özbekistan', (function () {
    let s = [['yo', [['#0099B5', 10], ['#CE1126', 1], ['#FFFFFF', 10],
                     ['#CE1126', 1], ['#1EB53A', 10]]]];
    s = s.concat(hilal('#FFFFFF', 0.135, 0.150, 0.078));
    const satir = [[0.075, [0.320, 0.390, 0.460]],
                   [0.155, [0.250, 0.320, 0.390, 0.460]],
                   [0.235, [0.180, 0.250, 0.320, 0.390, 0.460]]];
    for (const r of satir) for (const x of r[1])
      s = s.concat(yildiz('#FFFFFF', x, r[0], 0.026, 5));
    return s;
  })()];

  // VN · Vietnam
  T.VN = ['Vietnam', [['dik', '#DA251D', 0, 0, 1, 1]]
    .concat(yildiz('#FFFF00', 0.5, 0.5, 0.310, 5))];

  // YE · Yemen
  T.YE = ['Yemen', [['y', ['#CE1126', '#FFFFFF', '#000000']]]];
})();
if (typeof window !== 'undefined') window.__bayrakAsya = true;
