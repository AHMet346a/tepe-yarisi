'use strict';
/* ============================================================================
   Bayraklar — 193 BM ülkesinin bayrağı, CANVAS'A KODLA ÇİZİLİR (ADDITIVE)
   ============================================================================

   NEDEN EMOJİ DEĞİL (ölçüldü, 31 Tmz):
     Windows Chrome'da `ctx.fillText('🇹🇷')` bayrak ÇİZMEZ — "TR" harflerini
     çizer. Canlıda ölçüm: 🇹🇷 için renkli piksel sayısı **0**, 🇹🇷 ile 🇩🇪
     arasındaki fark yalnız harf farkı (355 px). Telefonda (Android) emoji
     bayrak çalışır ama masaüstünde ÇALIŞMAZ → oyun iki platformda da
     çalıştığı için emoji YOL DEĞİL.

   NEDEN PNG/SVG DOSYASI DEĞİL:
     193 dosya = 193 ağ isteği + sw.js ASSETS'e 193 satır + 404/önbellek riski.
     31 Tmz'de "gorsel.js Unexpected token '<'" felaketi tam olarak buydu.
     Kodla çizim: 0 indirme, 0 istek, her boyutta keskin.

   ── ÇİZİM MODELİ ─────────────────────────────────────────────────────────
   Her bayrak BİRİM KARE'de tanımlanır: x∈[0,1], y∈[0,1]. `ciz()` bunu
   istenen dikdörtgene ölçekler. Böylece 12 px'lik HUD rozetinden 120 px'lik
   seçim kartına kadar aynı veri kullanılır.

   ⚠ Oran: gerçek bayrakların çoğu 3:2 veya 2:1'dir. `ciz()` verilen kutuyu
     AYNEN doldurur; oranı çağıran belirler (rozet için 3:2 öneriyoruz).

   ── İLKELLER (spec dizisi, sırayla çizilir) ──────────────────────────────
     ['y', [renk...]]              eşit YATAY bantlar (üstten alta)
     ['d', [renk...]]              eşit DİKEY bantlar (soldan sağa)
     ['yo', [[renk,oran]...]]      ORANTILI yatay bantlar (oranlar toplamı serbest)
     ['do', [[renk,oran]...]]      ORANTILI dikey bantlar
     ['dik', renk, x, y, w, h]     dikdörtgen (birim koordinat)
     ['hac', renk, kal, x]         İskandinav haçı (kal=kalınlık, x=dikey kolun yeri)
     ['arti', renk, kal]           ortalanmış artı/haç
     ['ucgen', renk, gen]          hoist (sol) üçgeni, gen=genişlik
     ['dai', renk, x, y, r]        daire
     ['hal', renk, x, y, r, kal]   halka (içi boş daire)
     ['yil', renk, x, y, r, uc]    yıldız (uc = köşe sayısı, varsayılan 5)
     ['hil', renk, x, y, r]        hilal (ay)
     ['cap', renk, kal]           köşegen çarpı (X)
     ['egik', renk, x1,y1,x2,y2,kal]  serbest çizgi
     ['yazi', metin, renk, boy, x, y]  amblem yerine sadeleştirilmiş işaret

   🔴 KURAL: spec YALNIZ bu ilkelleri kullanır. Yeni ilkel eklemek gerekirse
      `_CIZ` tablosuna ekle ve BURAYA yaz — yoksa başka bir ajan aynı adı
      farklı anlamda kullanır.

   🔴 KURAL: renkler HEX (#rrggbb) olmalı. `_dogrulaTablo()` bunu kontrol eder.

   ⚠ Karmaşık armalı bayraklar (Meksika, Sri Lanka, Bhutan, Sırbistan…)
     SADELEŞTİRİLMİŞ çizilir: alan/bantlar doğru, arma basit bir işaretle
     temsil edilir. 12–24 px'lik rozette fark edilmez; seçim kartında
     yaklaşıktır. Bu BİLİNÇLİ bir karardır, eksik değil.
   ============================================================================ */

const Bayraklar = {
  version: '1.0',

  // ── Çizim ilkelleri ─────────────────────────────────────────────────────
  // Hepsi BİRİM kareye çizer; `ciz()` dönüşümü zaten uygulamıştır.
  _CIZ: {
    y(c, renkler) {
      const n = renkler.length, h = 1 / n;
      for (let i = 0; i < n; i++) { c.fillStyle = renkler[i]; c.fillRect(0, i * h, 1, h + 0.004); }
    },
    d(c, renkler) {
      const n = renkler.length, w = 1 / n;
      for (let i = 0; i < n; i++) { c.fillStyle = renkler[i]; c.fillRect(i * w, 0, w + 0.004, 1); }
    },
    yo(c, liste) {
      let t = 0; for (const p of liste) t += p[1];
      let y = 0;
      for (const p of liste) { const h = p[1] / t; c.fillStyle = p[0]; c.fillRect(0, y, 1, h + 0.004); y += h; }
    },
    do(c, liste) {
      let t = 0; for (const p of liste) t += p[1];
      let x = 0;
      for (const p of liste) { const w = p[1] / t; c.fillStyle = p[0]; c.fillRect(x, 0, w + 0.004, 1); x += w; }
    },
    dik(c, renk, x, y, w, h) { c.fillStyle = renk; c.fillRect(x, y, w, h); },
    hac(c, renk, kal, x) {
      const k = kal == null ? 0.16 : kal, cx = x == null ? 0.36 : x;
      c.fillStyle = renk;
      c.fillRect(0, 0.5 - k / 2, 1, k);
      c.fillRect(cx - k / 2, 0, k, 1);
    },
    arti(c, renk, kal) {
      const k = kal == null ? 0.2 : kal;
      c.fillStyle = renk;
      c.fillRect(0, 0.5 - k / 2, 1, k);
      c.fillRect(0.5 - k / 2, 0, k, 1);
    },
    ucgen(c, renk, gen) {
      const g = gen == null ? 0.4 : gen;
      c.fillStyle = renk;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(g, 0.5); c.lineTo(0, 1); c.closePath(); c.fill();
    },
    // 🔴 EN-BOY DÜZELTMESİ (31 Tmz) — ÜÇ AJAN BAĞIMSIZ OLARAK BİLDİRDİ.
    //   `ciz()` `ctx.scale(w, h)` uyguluyor. Rozet 3:2 olduğu için birim
    //   karedeki bir DAİRE ekranda 1,5:1 ELİPSE dönüşüyordu — Japonya'nın
    //   diski 76×50 px çıkıyor (doğrusu 50×50), Türkiye'nin hilali yayvan,
    //   Palau'nun dolunayı yumurta.
    //   ▶ Çözüm motorda: yatay yarıçap `1/oran` ile bölünür (oran = w/h).
    //     Böylece daire GERÇEKTEN yuvarlak çıkar ve TÜM bayrak dosyaları
    //     (Avrupa/Asya/Afrika/Amerika) tek davranışa oturur.
    //   ⚠ `_oran` `ciz()` tarafından her çizimden önce ayarlanır.
    // ⚠ `ellipse` KULLANILMIYOR — BİLEREK. İlk sürümde `c.ellipse(...)` yazıldı;
    //   tarayıcıda çalışıyor ama doğrulama rasterizer'ında (`port-araclari/
    //   _bayrak-raster.js`) `ellipse` YOK → çağrı `ciz()`in try/catch'ine düşüp
    //   SESSİZCE hiçbir şey çizmiyordu. Türkiye'nin hilali kayboldu ve bunu
    //   ancak 300 px'lik render'a bakınca gördüm.
    //   ▶ Aynı sonuç `save + scale(1/oran,1) + arc` ile elde edilir; bu YALNIZ
    //     `arc` kullanır, yani hem tarayıcıda hem doğrulayıcıda çalışır.
    //   🔴 Buraya `ellipse` GERİ EKLEME — doğrulanamaz hale gelir.
    dai(c, renk, x, y, r) {
      const o = Bayraklar._oran || 1, R = (r == null ? 0.2 : r);
      c.save(); c.translate(x == null ? 0.5 : x, y == null ? 0.5 : y); c.scale(1 / o, 1);
      c.fillStyle = renk;
      c.beginPath(); c.arc(0, 0, R, 0, 6.2832); c.fill();
      c.restore();
    },
    hal(c, renk, x, y, r, kal) {
      const o = Bayraklar._oran || 1;
      c.save(); c.translate(x, y); c.scale(1 / o, 1);
      c.strokeStyle = renk; c.lineWidth = (kal == null ? 0.05 : kal) * o;
      c.beginPath(); c.arc(0, 0, r, 0, 6.2832); c.stroke();
      c.restore();
    },
    yil(c, renk, x, y, r, uc) {
      const o = Bayraklar._oran || 1;
      const n = uc || 5, ic = r * (n === 5 ? 0.382 : 0.5);
      c.fillStyle = renk; c.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n, rr = (i % 2 === 0) ? r : ic;
        const px = x + Math.cos(a) * rr / o, py = y + Math.sin(a) * rr;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.fill();
    },
    hil(c, renk, x, y, r) {
      // ⚠ Kompozit mod (destination-out) KULLANILMIYOR — çağıran bağlamı
      //   kirletmemek için hilal İKİ YAYLA kurulur.
      // ⚠ En-boy düzeltmesi `scale` ile (bkz. `dai` notu — `ellipse` YASAK).
      const o = Bayraklar._oran || 1;
      c.save(); c.translate(x, y); c.scale(1 / o, 1);
      c.fillStyle = renk;
      c.beginPath();
      c.arc(0, 0, r, 0.6, -0.6);
      c.arc(r * 0.34, 0, r * 0.84, -0.72, 0.72, true);
      c.closePath(); c.fill();
      c.restore();
    },
    cap(c, renk, kal) {
      c.strokeStyle = renk; c.lineWidth = kal == null ? 0.12 : kal;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 1); c.moveTo(1, 0); c.lineTo(0, 1); c.stroke();
    },
    egik(c, renk, x1, y1, x2, y2, kal) {
      c.strokeStyle = renk; c.lineWidth = kal == null ? 0.08 : kal;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    },
    yazi(c, metin, renk, boy, x, y) {
      c.fillStyle = renk;
      c.font = 'bold ' + (boy || 0.4) + 'px system-ui, Arial';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(metin, x == null ? 0.5 : x, y == null ? 0.5 : y);
    }
  },

  // ── Ülke tablosu ────────────────────────────────────────────────────────
  // { kod: [ad, [spec...]] }  — kod = ISO 3166-1 alpha-2
  // 🔴 Ajanlar YALNIZ buraya satır ekler; motor değişmez.
  T: {},

  // ── Ana çizim ───────────────────────────────────────────────────────────
  // ⚠ `save/restore` DENGELİ — çağıran bağlamın durumu korunur (bu projede
  //   dengesiz save/restore daha önce ekranı bozdu).
  ciz(ctx, kod, x, y, w, h) {
    if (!ctx || !(w > 0) || !(h > 0)) return false;
    const rec = this.T[String(kod || '').toUpperCase()];
    // Daire/yıldız/hilal ilkelleri bunu okur (bkz. en-boy düzeltmesi notu).
    this._oran = w / h;
    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.translate(x, y); ctx.scale(w, h);
      ctx.lineJoin = 'miter'; ctx.miterLimit = 2;
      if (!rec) {
        // Bilinmeyen kod → nötr gri alan (asla boş/çökmüş görünmesin)
        ctx.fillStyle = '#8b93a3'; ctx.fillRect(0, 0, 1, 1);
      } else {
        for (const p of rec[1]) {
          const f = this._CIZ[p[0]];
          if (!f) continue;
          try { f.apply(this._CIZ, [ctx].concat(p.slice(1))); } catch (e) {}
        }
      }
    } catch (e) {}
    ctx.restore();
    // Çerçeve — açık renkli bayraklar (Japonya, Finlandiya) arka planda kaybolmasın
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.04);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.restore();
    return !!rec;
  },

  ad(kod) { const r = this.T[String(kod || '').toUpperCase()]; return r ? r[0] : String(kod || ''); },
  kodlar() { return Object.keys(this.T); },
  sayi() { return Object.keys(this.T).length; },

  // Ada göre arama (seçim ekranındaki arama kutusu için)
  ara(metin) {
    const s = String(metin || '').toLocaleLowerCase('tr');
    if (!s) return this.kodlar();
    const out = [];
    for (const k in this.T) {
      if (k.toLocaleLowerCase('tr').indexOf(s) === 0 ||
          this.T[k][0].toLocaleLowerCase('tr').indexOf(s) >= 0) out.push(k);
    }
    return out;
  },

  // ── Doğrulama ───────────────────────────────────────────────────────────
  _dogrulaTablo() {
    const hata = [];
    const gecerliIlkel = Object.keys(this._CIZ);
    for (const k in this.T) {
      const r = this.T[k];
      if (!/^[A-Z]{2}$/.test(k)) { hata.push(k + ': kod 2 buyuk harf degil'); continue; }
      if (!Array.isArray(r) || r.length !== 2) { hata.push(k + ': [ad, spec] degil'); continue; }
      if (typeof r[0] !== 'string' || !r[0]) { hata.push(k + ': ad bos'); }
      if (!Array.isArray(r[1]) || !r[1].length) { hata.push(k + ': spec bos'); continue; }
      for (const p of r[1]) {
        if (!Array.isArray(p) || !p.length) { hata.push(k + ': ilkel dizi degil'); continue; }
        if (gecerliIlkel.indexOf(p[0]) < 0) { hata.push(k + ': bilinmeyen ilkel "' + p[0] + '"'); continue; }
        // renk kontrolu — duz string renkler HEX olmali
        const renkler = [];
        if (p[0] === 'y' || p[0] === 'd') { if (Array.isArray(p[1])) renkler.push.apply(renkler, p[1]); }
        else if (p[0] === 'yo' || p[0] === 'do') { if (Array.isArray(p[1])) for (const q of p[1]) renkler.push(q[0]); }
        else if (p[0] === 'yazi') { renkler.push(p[2]); }
        else { renkler.push(p[1]); }
        for (const c of renkler) {
          if (typeof c === 'string' && c[0] === '#' && !/^#[0-9a-fA-F]{6}$/.test(c)) hata.push(k + ': bozuk hex "' + c + '"');
        }
      }
    }
    return hata;
  },

  selfTest() {
    const r = {};
    try {
      r.tabloDolu = this.sayi() >= 193;
      r.tabloSayisi = this.sayi();
      const h = this._dogrulaTablo();
      r.tabloGecerli = h.length === 0;
      if (h.length) r.tabloHatalari = h.slice(0, 8);

      // Sahte ctx ile HER bayrağı çiz — çökme ve save/restore dengesi
      let derinlik = 0, cizimVar = 0, coken = [];
      const c = {
        save() { derinlik++; }, restore() { derinlik--; },
        beginPath() {}, closePath() {}, rect() {}, clip() {}, translate() {}, scale() {},
        moveTo() {}, lineTo() {}, arc() {}, stroke() {}, fillText() {},
        fillRect() { cizimVar++; }, fill() { cizimVar++; }, strokeRect() {},
        set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
        set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
        set lineJoin(v) {}, set miterLimit(v) {}
      };
      for (const k of this.kodlar()) {
        const once = cizimVar;
        try { this.ciz(c, k, 0, 0, 30, 20); } catch (e) { coken.push(k); }
        if (cizimVar === once) coken.push(k + '(bos)');
      }
      r.hepsiCiziliyor = coken.length === 0;
      if (coken.length) r.cizmeyenler = coken.slice(0, 8);
      r.saveRestoreDengeli = (derinlik === 0);

      // Bilinmeyen kod çökmemeli
      try { this.ciz(c, 'ZZ', 0, 0, 10, 10); r.bilinmeyenGuvenli = true; }
      catch (e) { r.bilinmeyenGuvenli = false; }

      // Arama çalışıyor mu
      r.aramaCalisiyor = this.ara('tür').length > 0 || this.ara('TR').length > 0;
    } catch (e) { r.hata = String(e && e.message ? e.message : e); }
    let allPass = !r.hata;
    for (const k in r) if (typeof r[k] === 'boolean' && r[k] === false) allPass = false;
    r.allPass = allPass;
    return r;
  }
};

if (typeof window !== 'undefined') window.Bayraklar = Bayraklar;
