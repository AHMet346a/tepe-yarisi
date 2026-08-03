'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// mobilhedef.js — DOKUNMA HEDEFİ BÜYÜTÜCÜ  (29 Tmz)
//
// SORUN
//   Oyunun 16 ekranı (`campaign`, `tuning`, `seasonevents`, `shopoffers`,
//   `paintshop`, `skilltree`, `blackmarket`, `replay` …) kendi buton listesini
//   tutuyor (`_btns` / `_hit` / `_buttons`) ve `UI.buttons`'a HİÇ yazmıyor.
//   Bu yüzden daha önceki bütün mobil taramaları bu ekranlarda
//   **hiçbir şey ölçmemişti**. Ölçünce çıktı: 7 ekranda dokunma hedefleri
//   22-38 px (parmak asgarisi 44 px).
//
// ÇÖZÜM
//   Çizim koduna HİÇ DOKUNMADAN, çizim bittikten sonra buton KUTULARINI
//   merkezlerinden büyütmek. Görsel aynı kalır, parmak hedefi büyür.
//
// 🔴 EN KRİTİK KISIM — ÇAKIŞMA KIRPMASI
//   Kutuları körü körüne 44 px'e genişletmek madde 29'u (yanlış yere tıklama)
//   GERİ GETİRİR: iki komşu buton üst üste biner ve hit-test ilk eşleşeni
//   döndürdüğü için yanlış buton tetiklenir.
//   ▶ Bu yüzden her kutu, her yönde, **o yöndeki en yakın komşuya olan
//     boşluğun YARISI** kadar büyütülür. İki komşu birbirine doğru eşit
//     büyür, tam ortada buluşur, ASLA çakışmazlar.
//
// KULLANIM (modülün draw'ının EN SONUNDA):
//   if (typeof MobilHedef !== 'undefined') MobilHedef.buyut(this._btns, W, H);
//
// ⚠ Kutular `{x,y,w,h}` alanlarını taşımalı (id/act adı önemli değil).
// ⚠ Tam ekran kapatıcılar (arka plana basınca kapat) BÜYÜTÜLMEZ — zaten büyük.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {

  var HEDEF = 44;   // parmak dokunma hedefi asgarisi (px)

  function sayi(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }

  // İki kutu YATAYDA örtüşüyor mu (dikey komşuluk için ön koşul)
  function yatayOrtusur(a, b) {
    return (a.x < b.x + b.w) && (b.x < a.x + a.w);
  }
  function dikeyOrtusur(a, b) {
    return (a.y < b.y + b.h) && (b.y < a.y + a.h);
  }

  var MobilHedef = {
    HEDEF: HEDEF,

    // Kutuları YERİNDE büyütür ve aynı diziyi döndürür.
    buyut: function (kutular, W, H) {
      if (!kutular || !kutular.length) return kutular;
      var n = kutular.length, i, j;

      // Tam ekran kapatıcıları ve geçersiz kutuları ayıkla
      var aday = [];
      for (i = 0; i < n; i++) {
        var k = kutular[i];
        if (!k || typeof k.x !== 'number' || typeof k.w !== 'number') continue;
        if (k.w <= 0 || k.h <= 0) continue;
        if (W && H && k.w > W * 0.9 && k.h > H * 0.9) continue;   // arka plan kapatıcı
        if (k.w >= HEDEF && k.h >= HEDEF) continue;               // zaten yeterli
        aday.push(k);
      }
      if (!aday.length) return kutular;

      // ── 1. GEÇİŞ: boşlukları ORİJİNAL geometriye göre ölç ────────────────
      // 🔴 İKİ GEÇİŞ ŞART. Tek geçişte kutuları sırayla büyütürsek, büyüyen
      //   kutu bir sonrakinin komşuluk hesabını değiştirir → sonuç ASİMETRİK
      //   olur (ilk yazımda üç komşudan ortadaki 22→27 px'te kalmıştı, uçtakiler
      //   44'e çıkmıştı). Önce hepsini ölç, sonra hepsini uygula.
      var olcum = [];
      for (i = 0; i < aday.length; i++) {
        var b0 = aday[i];
        var ust = Infinity, alt = Infinity, sol = Infinity, sag = Infinity;
        for (j = 0; j < n; j++) {
          var o = kutular[j];
          if (!o || o === b0 || typeof o.x !== 'number') continue;
          if (W && H && o.w > W * 0.9 && o.h > H * 0.9) continue;
          if (yatayOrtusur(b0, o)) {
            if (o.y + o.h <= b0.y) ust = Math.min(ust, b0.y - (o.y + o.h));
            else if (o.y >= b0.y + b0.h) alt = Math.min(alt, o.y - (b0.y + b0.h));
          }
          if (dikeyOrtusur(b0, o)) {
            if (o.x + o.w <= b0.x) sol = Math.min(sol, b0.x - (o.x + o.w));
            else if (o.x >= b0.x + b0.w) sag = Math.min(sag, o.x - (b0.x + b0.w));
          }
        }
        // Komşu varsa boşluğun YARISI
        // (⚠ yarısı ŞART: iki komşu da büyürse tam ortada buluşur, çakışmaz)
        // 🔴 KOMŞU YOKSA EKRAN KENARINA GÖRE HESAPLAMA YAPMA (29 Tmz düzeltmesi):
        //   Kaydırılan listelerde kutular EKRANIN DIŞINDA olabilir; kaydırınca
        //   içeri gelirler. Ekrana göre pay hesaplamak o kutulara "yer yok"
        //   dedirtiyordu ve aşağıdaki kırpma onları 1 px'e indiriyordu
        //   (tuning'de 540x1, shopoffers'ta 96x1 kutular böyle oluştu).
        //   ▶ Komşu yoksa HEDEF kadar pay ver, ekranı hiç hesaba katma.
        olcum.push({
          yUst: (ust === Infinity) ? HEDEF : ust / 2,
          yAlt: (alt === Infinity) ? HEDEF : alt / 2,
          ySol: (sol === Infinity) ? HEDEF : sol / 2,
          ySag: (sag === Infinity) ? HEDEF : sag / 2
        });
      }

      // ── 2. GEÇİŞ: ölçülen paylarla büyüt ─────────────────────────────────
      for (i = 0; i < aday.length; i++) {
        var b = aday[i];
        var yUst = olcum[i].yUst, yAlt = olcum[i].yAlt,
            ySol = olcum[i].ySol, ySag = olcum[i].ySag;

        // Dikey büyütme
        var eksikY = HEDEF - b.h;
        if (eksikY > 0) {
          var pay = eksikY / 2;
          var ekleUst = Math.min(pay, Math.max(0, yUst));
          var ekleAlt = Math.min(pay, Math.max(0, yAlt));
          // Bir tarafta yer yoksa diğerinden telafi et
          if (ekleUst < pay) ekleAlt = Math.min(Math.max(0, yAlt), eksikY - ekleUst);
          if (ekleAlt < pay && ekleUst === pay) ekleUst = Math.min(Math.max(0, yUst), eksikY - ekleAlt);
          b.y = b.y - ekleUst;
          b.h = b.h + ekleUst + ekleAlt;
        }
        // Yatay büyütme
        var eksikX = HEDEF - b.w;
        if (eksikX > 0) {
          var payX = eksikX / 2;
          var ekleSol = Math.min(payX, Math.max(0, ySol));
          var ekleSag = Math.min(payX, Math.max(0, ySag));
          if (ekleSol < payX) ekleSag = Math.min(Math.max(0, ySag), eksikX - ekleSol);
          if (ekleSag < payX && ekleSol === payX) ekleSol = Math.min(Math.max(0, ySol), eksikX - ekleSag);
          b.x = b.x - ekleSol;
          b.w = b.w + ekleSol + ekleSag;
        }

        // 🔴 EKRANA KIRPMA YOK — bkz. yukarıdaki uyarı. Kaydırılan listede
        //   ekran dışındaki kutu kırpılırsa kaydırma sonrası BOZUK kalır.
        //   Ekran dışına taşan kısım zaten tıklanamaz, zararsızdır.
        b.x = sayi(b.x); b.y = sayi(b.y);
        b.w = Math.max(1, sayi(b.w)); b.h = Math.max(1, sayi(b.h));
      }
      return kutular;
    },

    // Test/doğrulama yardımcısı: listede çakışan kutu var mı?
    cakisanlar: function (kutular, W, H) {
      var out = [], i, j;
      for (i = 0; i < kutular.length; i++) {
        for (j = i + 1; j < kutular.length; j++) {
          var a = kutular[i], b = kutular[j];
          if (!a || !b) continue;
          if (W && H && (a.w > W * 0.9 && a.h > H * 0.9)) continue;
          if (W && H && (b.w > W * 0.9 && b.h > H * 0.9)) continue;
          var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 0.5 && oy > 0.5) out.push([i, j]);
        }
      }
      return out;
    },

    selfTest: function () {
      // İki komşu 22 px buton, aralarında 10 px boşluk → ikisi de büyür ama
      // ÇAKIŞMAZ (her biri boşluğun yarısını alır).
      var a = { x: 10, y: 10, w: 80, h: 22 };
      var b = { x: 10, y: 42, w: 80, h: 22 };   // 10 px bosluk
      var liste = [a, b];
      this.buyut(liste, 360, 640);
      var cak = this.cakisanlar(liste, 360, 640);
      var buyudu = a.h > 22 && b.h > 22;
      var allPass = (cak.length === 0) && buyudu;
      return { allPass: allPass, cakisma: cak.length, aH: a.h, bH: b.h };
    }
  };

  root.MobilHedef = MobilHedef;
  if (typeof module !== 'undefined' && module.exports) module.exports = MobilHedef;

  // ═════════════════════════════════════════════════════════════════════════
  // OTOMATİK BAĞLAMA — modüllerin `draw`'ı sarmalanır
  // ═════════════════════════════════════════════════════════════════════════
  //   7 ayrı dosyaya "draw'ın sonuna bir satır ekle" demek yerine, modülün
  //   `draw` fonksiyonunu burada BİR KEZ sarmalıyoruz. Çizim bittikten sonra
  //   buton kutuları büyütülür.
  //
  //   ⚠ Bu dosya index.html'de MODÜLLERDEN SONRA yüklenmeli (aksi hâlde
  //     `window.Tuning` vb. henüz tanımsızdır). `dogrula-mobil.js` sırayı
  //     kontrol eder.
  //   ⚠ Sarmalama İKİ KEZ yapılmamalı → `_mhSarmalandi` bayrağı.
  var HEDEFLER = [
    ['Campaign', '_btns'], ['Tuning', '_hit'], ['SeasonEvents', '_btns'],
    ['LuckWheel', '_btns'], ['Profile', '_btns'], ['Replay', '_buttons'],
    ['ShopOffers', '_btns'], ['PaintShop', '_btns'], ['DailyQuests', '_btns'],
    ['SkillTree', '_btns'], ['StatsPanel', '_btns'], ['Prestige', '_btns'],
    ['BlackMarket', '_btns'], ['MPRooms', '_btns'], ['CardCollection', '_btns'],
    ['PowerModes', '_btns']
  ];

  MobilHedef.bagla = function () {
    var n = 0;
    for (var i = 0; i < HEDEFLER.length; i++) {
      var ad = HEDEFLER[i][0], alan = HEDEFLER[i][1];
      var m = root[ad];
      if (!m || typeof m.draw !== 'function' || m._mhSarmalandi) continue;
      (function (mod, alanAd) {
        var orj = mod.draw;
        mod.draw = function (ctx, W, H) {
          var r = orj.apply(this, arguments);
          try {
            if (Array.isArray(this[alanAd])) MobilHedef.buyut(this[alanAd], W, H);
          } catch (e) {}
          return r;
        };
        mod._mhSarmalandi = true;
      })(m, alan);
      n++;
    }
    return n;
  };

  if (typeof document !== 'undefined') {
    // Modüller yüklenmiş olabilir (bu dosya sonda) — hemen bağla; DOM hazır
    // olunca bir kez daha dene ki geç tanımlanan modüller de yakalansın.
    MobilHedef.bagla();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { MobilHedef.bagla(); });
    } else {
      setTimeout(function () { MobilHedef.bagla(); }, 0);
    }
  }

})(typeof window !== 'undefined' ? window : this);
