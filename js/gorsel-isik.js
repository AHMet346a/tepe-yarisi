'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-ISIK — Dinamik ışık + gölge son-işlem katmanı (30 Tmz)
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında ışık/gölge simülasyonu
// uygular. `gorsel.js`'in kardeşi; renk derecelendirme/bloom ORADA, ışık ve
// gölge BURADA. Çizim koduna hiç dokunmaz.
//
// EFEKTLER (hepsi ayrı kalite anahtarıyla geçitli):
//   · gunesDiski   — atmosferik saçılmalı güneş/ay diski + halka + huzme kolları
//   · golge        — aracın zemine düşen yumuşak gölgesi (güneş açısıyla uzar)
//   · temasGolge   — tekerlek altı temas gölgesi (yapay ambient occlusion)
//   · dinamikIsik  — far/nitro ışığının sahneye vuran konik aydınlatması
//   · aoZemin      — zemin siluetini takip eden yumuşak karartma bandı
//   · isikTitresim — volkan/lav/neon haritalarda ışık titremesi
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bu dosya HİÇBİR bare global'e güvenmez (Game/Terrain/Camera `window`'da
// DEĞİL — CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle · ba.camera
//   ba.terrain · ba.t · ba.dt · ba.kalite(ad) · ba.gr(anahtar, uretici)
//
// 🔴 PERFORMANS KURALLARI (ihlal edilirse p99 bozulur — §8B.27/B5)
//   1. `ctx.createLinearGradient` / `createRadialGradient` DOĞRUDAN ÇAĞRILMAZ.
//      Her gradient `this._gr(...)` → `ba.gr(...)` önbelleğinden geçer.
//      Konumu değişen efektler (gölge, far) BİRİM UZAYDA (0,0,r=1) üretilmiş
//      gradient + `translate/rotate/scale` ile çizilir; gradient boyası
//      BOYAMA anındaki dönüşümde çözülür, bu yüzden tek önbellek yeter.
//   2. `getImageData` / `putImageData` YOK. Yumuşaklık `ctx.filter='blur()'`
//      ile (GPU) yapılır; destek yoksa katmanlı çizimle taklit edilir.
//   3. Her efekt `ba.kalite('...')` ile geçitli; 0 dönerse TEK BİR çizim
//      çağrısı bile yapılmaz (selfTest bunu sayarak doğrular).
//   4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
// ═══════════════════════════════════════════════════════════════════════════
const GorselIsik = {
  ad: 'isik',

  // ── iç durum ─────────────────────────────────────────────────────────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _tampon: null,          // çeyrek çözünürlüklü hacimsel ışık tamponu
  _grYerel: {},           // ba.gr verilmediyse kullanılan yedek önbellek
  _grUretim: 0,           // ölçüm: yedek önbellekte kaç YENİ gradient üretildi
  _gunesOnbellek: {},     // paletten türeyen güneş sabitleri (harita başına 1 kez)
  _blurDestek: null,      // ctx.filter blur destekliyor mu (bir kez ölçülür)
  _titresim: 1,           // yumuşatılmış titreme değeri (0..1)
  _sonYukseklik: 0,       // aracın zeminden yüksekliği (yumuşatılmış)

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // Işığı kararsız olan haritalar (lav/neon/toksik). Liste dışındaki haritalar
  // için palet sezgisi de var: kapalı + doygun tint => titrek sayılır.
  TITREK: {
    volcano: 1, lava_river: 1, neon_city: 1, cyberpunk_roofs: 1, cyber_grid: 1,
    toxic: 1, meteor_field: 1, carnival: 1, hotwheels: 1, mushroom: 1,
    firefly_forest: 1, rainbow_road: 1, crystal_cave: 1, aurora_peak: 1
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KURULUM
  // ═════════════════════════════════════════════════════════════════════════
  hazir(W, H) {
    W = Math.max(1, Math.round(W || 0));
    H = Math.max(1, Math.round(H || 0));
    if (this._hazirlandi && this._W === W && this._H === H) return false;
    this._W = W;
    this._H = H;
    this._hazirlandi = true;
    // Ekran uzayı gradientleri boyuta bağlıdır → yedek önbelleği boşalt.
    this._grYerel = {};
    this._grUretim = 0;
    this._blurDestek = null;
    const bw = Math.max(16, Math.round(W / 4));
    const bh = Math.max(16, Math.round(H / 4));
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        if (!this._tampon || this._tampon.width !== bw || this._tampon.height !== bh) {
          const c = document.createElement('canvas');
          c.width = bw;
          c.height = bh;
          this._tampon = c;
        }
      } else {
        this._tampon = null;
      }
    } catch (e) {
      this._tampon = null;
    }
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM — dünya dönüşümü KAPALI, ekran uzayında çalışır
  // ═════════════════════════════════════════════════════════════════════════
  ciz(ctx, W, H, ba) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    ba = ba || {};
    const p = ba.palet || this._VARSAYILAN_PALET;
    if (!this._hazirlandi || this._W !== Math.round(W) || this._H !== Math.round(H)) {
      this.hazir(W, H);
    }

    const gunes = this._gunes(ba, p);
    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;

    // Sıra önemli: önce gökyüzü ışığı, sonra karartmalar, en son eklenen ışık.
    try { this._gunesDiski(ctx, W, H, ba, p, gunes); } catch (e) {}
    try { this._aoZemin(ctx, W, H, ba, p, gunes); } catch (e) {}
    try { this._golge(ctx, W, H, ba, p, gunes); } catch (e) {}
    try { this._temasGolge(ctx, W, H, ba, p, gunes); } catch (e) {}
    try { this._dinamikIsik(ctx, W, H, ba, p, gunes); } catch (e) {}
    try { this._isikTitresim(ctx, W, H, ba, p, gunes); } catch (e) {}

    // Kural 5: durumu her hâlükârda geri koy (bir efekt yarıda patlasa bile).
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    try { ctx.filter = 'none'; } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) GÜNEŞ / AY DİSKİ — atmosferik saçılma + halka + anamorfik kollar
  // ═════════════════════════════════════════════════════════════════════════
  _gunesDiski(ctx, W, H, ba, p, gunes) {
    const g = this._k(ba, 'gunesDiski');
    if (g <= 0) return;
    // Kapalı haritada (mağara/lav) disk sönük bir aydınlanmaya dönüşür.
    const gor = Math.max(0.06, gunes.guc * (1 - gunes.kapali * 0.72));
    const sx = W * (0.5 + gunes.yon * 0.40);
    const sy = H * (0.46 - gunes.yuk * 0.40);
    const R = Math.min(W, H) * (0.040 + 0.022 * gunes.guc);
    const sac = Math.max(W, H) * (0.30 + 0.30 * g);
    const gunRenk = gunes.ay ? this._karis(p.gun, '#dfe8ff', 0.55) : p.gun;
    const anh = W + 'x' + H + '|' + p.gun + '|' + p.bloom + '|' + (gunes.ay ? 'ay' : 'gun');
    const self = this;

    // a) atmosferik saçılma — geniş, çok yumuşak hale
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.55, 0.24 * g * gor);
    ctx.translate(sx, sy);
    ctx.scale(sac, sac);
    ctx.fillStyle = this._gr(ctx, ba, 'isik-sacilma|' + anh, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, self._rgba(gunRenk, 0.62));
      gr.addColorStop(0.16, self._rgba(gunRenk, 0.26));
      gr.addColorStop(0.45, self._rgba(p.bloom, 0.10));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // b) çekirdek disk — merkezde beyaza yakın, kenarda palet rengi
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.95, 0.62 * g * (0.35 + gor));
    ctx.translate(sx, sy);
    ctx.scale(R * 2.6, R * 2.6);
    ctx.fillStyle = this._gr(ctx, ba, 'isik-cekirdek|' + anh, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,255,255,0.98)');
      gr.addColorStop(0.22, self._rgba(gunRenk, 0.90));
      gr.addColorStop(0.42, self._rgba(gunRenk, 0.34));
      gr.addColorStop(1, self._rgba(gunRenk, 0));
      return gr;
    });
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // c) halka(lar) — atmosferik kırılma çemberi
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.22 * g * gor;
    ctx.strokeStyle = this._rgba(p.bloom, 0.85);
    ctx.lineWidth = Math.max(1, R * 0.16);
    ctx.beginPath();
    ctx.arc(sx, sy, R * 2.15, 0, Math.PI * 2);
    ctx.stroke();
    if (g >= 0.55) {
      ctx.globalAlpha = 0.11 * g * gor;
      ctx.strokeStyle = this._rgba(gunRenk, 0.7);
      ctx.lineWidth = Math.max(1, R * 0.09);
      ctx.beginPath();
      ctx.arc(sx, sy, R * 3.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // d) anamorfik kollar (yatay uzun + dikey kısa parlama)
    if (g >= 0.45) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(sx, sy);
      ctx.globalAlpha = 0.18 * g * gor;
      ctx.fillStyle = this._gr(ctx, ba, 'isik-kol|' + anh, function (c) {
        const gr = c.createLinearGradient(-1, 0, 1, 0);
        gr.addColorStop(0, self._rgba(p.bloom, 0));
        gr.addColorStop(0.34, self._rgba(p.bloom, 0.32));
        gr.addColorStop(0.5, 'rgba(255,255,255,0.85)');
        gr.addColorStop(0.66, self._rgba(p.bloom, 0.32));
        gr.addColorStop(1, self._rgba(p.bloom, 0));
        return gr;
      });
      ctx.save();
      ctx.scale(W * 0.30, Math.max(1, R * 0.30));
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      ctx.save();
      ctx.rotate(Math.PI / 2);
      ctx.scale(H * 0.14, Math.max(1, R * 0.20));
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
      ctx.restore();
    }

    // e) yavaş dönen huzme kolları (yalnız yüksek kalitede)
    if (g >= 0.75) {
      const t = (ba.t || 0);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(sx, sy);
      ctx.fillStyle = this._rgba(gunRenk, 0.9);
      const uzun = Math.max(W, H) * 0.85;
      for (let i = 0; i < 9; i++) {
        // 🔴 PERF(31 Tmz · §8B.33) — GÖRÜNMEZ HUZME ELEMESİ.
        //   Tuval 8 bit/kanaldır: alfa < 1/255 ile çizilen üçgen HİÇBİR
        //   pikseli değiştiremez, ama tam bir yol + `fill` maliyeti öder.
        //   Güneş ufka yaklaşınca (`gor` küçülünce) 9 huzmenin tamamı bu
        //   bandın altına düşüyordu. ÖLÇÜLDÜ: kare başına 2,5 görünmez dolgu.
        const av = (0.030 + 0.018 * Math.sin(t * 0.9 + i)) * g * gor;
        if (!(av >= 1 / 255)) continue;
        const a = (i / 9) * Math.PI * 2 + t * 0.045;
        const genlik = 0.010 + 0.008 * Math.sin(t * 0.7 + i * 1.7);
        ctx.globalAlpha = av;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - genlik) * uzun, Math.sin(a - genlik) * uzun);
        ctx.lineTo(Math.cos(a + genlik) * uzun, Math.sin(a + genlik) * uzun);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) ZEMİN AO BANDI — arazi siluetini takip eden yumuşak karartma
  // ⚠ Ekran uzayında dikey gradient KULLANILAMAZ (arazi yüksekliği değişiyor),
  //   bu yüzden bant, siluet üzerinde kalınlığı azalan 3 katman çizgiyle
  //   boyanır. Gradient gerekmez → kare başına 0 yeni gradient.
  // ═════════════════════════════════════════════════════════════════════════
  _aoZemin(ctx, W, H, ba, p, gunes) {
    const g = this._k(ba, 'aoZemin');
    if (g <= 0) return;
    const koyu = this._rgb(p.sis || '#303840');
    const kr = Math.round(koyu.r * 0.30);
    const kg = Math.round(koyu.g * 0.30);
    const kb = Math.round(koyu.b * 0.32);
    const yogun = 0.55 + gunes.kapali * 0.75;   // kapalı harita → daha koyu AO
    const nk = this._zeminNoktalari(ba, W, 44);

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (g >= 0.5) this._bulanik(ctx, 3 + 5 * g);

    if (!nk) {
      // Yedek: arazi/kamera yoksa sabit yükseklikte yatay bant (cached gradient).
      const self = this;
      ctx.globalAlpha = Math.min(0.75, 0.34 * g * yogun);
      ctx.fillStyle = this._gr(ctx, ba, 'isik-aoduz|' + W + 'x' + H + '|' + p.sis, function (c) {
        const gr = c.createLinearGradient(0, H * 0.62, 0, H);
        gr.addColorStop(0, self._rgba(p.sis, 0));
        gr.addColorStop(0.55, 'rgba(' + kr + ',' + kg + ',' + kb + ',0.55)');
        gr.addColorStop(1, 'rgba(' + kr + ',' + kg + ',' + kb + ',0.85)');
        return gr;
      });
      ctx.fillRect(0, H * 0.62, W, H * 0.38);
      ctx.restore();
      return;
    }

    const katman = [
      { w: 0.085, a: 0.16 },
      { w: 0.040, a: 0.20 },
      { w: 0.016, a: 0.26 }
    ];
    // 🔴 PERF NOTU(31 Tmz · §8B.33) — BURAYI "YOLU BİR KEZ KUR, KATMANLAR
    //   ARASINDA translate ET" diye İYİLEŞTİRMEYE KALKMA. DENENDİ, BOZDU.
    //   Canvas2D'de yol noktaları EKLENDİKLERİ ANDA o günkü CTM ile
    //   AYGIT UZAYINA pişirilir; sonradan yapılan `translate` VAR OLAN
    //   noktaları OYNATMAZ. Sonuç: 3 AO bandının hepsi aynı yere, siluetin
    //   `kal*0.48` kadar YUKARISINA çizildi (anlamsal iz kıyası yakaladı:
    //   y 429,376 → 400). Yol 3 kez kurulmak ZORUNDA.
    //   (Doğru alternatif `Path2D` + çizim anında dönüşümdür; 90 çağrılık
    //    kazanç için taşınabilirlik riskine değmedi.)
    for (let ki = 0; ki < katman.length; ki++) {
      const kal = Math.max(2, H * katman[ki].w);
      ctx.globalAlpha = Math.min(0.8, katman[ki].a * g * yogun);
      ctx.strokeStyle = 'rgba(' + kr + ',' + kg + ',' + kb + ',1)';
      ctx.lineWidth = kal;
      ctx.beginPath();
      for (let i = 0; i < nk.length; i++) {
        // Bandı siluetin ALTINA kaydır — gökyüzünü karartma.
        const y = nk[i].y + kal * 0.48;
        if (i === 0) ctx.moveTo(nk[i].x, y); else ctx.lineTo(nk[i].x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) ARAÇ GÖLGESİ — güneş açısına göre uzayıp kısalan yumuşak elips
  // ═════════════════════════════════════════════════════════════════════════
  _golge(ctx, W, H, ba, p, gunes) {
    const g = this._k(ba, 'golge');
    if (g <= 0) return;
    const v = ba.vehicle;
    const d = this._donusum(ba);
    if (!v || !d || typeof v.x !== 'number' || typeof v.y !== 'number') return;

    const ter = (ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;
    const gw = (v.height || v.h || 50) * 0.5;
    let zeminY = ter ? ter.getYAt(v.x) : (v.y + gw);
    if (!isFinite(zeminY)) zeminY = v.y + gw;

    // Zeminden yükseklik (dünya px). Yumuşatılır ki iniş anında zıplamasın.
    const ham = Math.max(0, zeminY - v.y - gw);
    this._sonYukseklik = this._sonYukseklik * 0.72 + ham * 0.28;
    const yuk = this._sonYukseklik;

    // Güneş ufka yakınsa gölge yana uzar; tepedeyse aracın altında kalır.
    const yon = gunes.yon >= 0 ? 1 : -1;
    const kayma = Math.max(-3000, Math.min(3000, yon * yuk * gunes.uzama * 0.55));
    const gx = v.x + kayma;
    let gy2 = ter ? ter.getYAt(gx) : zeminY;
    if (!isFinite(gy2)) gy2 = zeminY;
    const s = d.ekran(gx, gy2);
    if (!s || !isFinite(s.x) || !isFinite(s.y)) return;

    const olc = Math.abs(d.olcek);
    const solma = Math.max(0.05, 1 - yuk / 560);          // yükseldikçe soluk
    const yayil = 1 + (1 - solma) * 1.15;                 // ve geniş
    const gen = Math.max(3, (v.width || v.w || 100) * 0.55 * (1 + (gunes.uzama - 1) * 0.40) * olc * yayil);
    const kal = Math.max(2, (v.height || v.h || 50) * 0.26 * olc * yayil);
    const alfa = Math.min(0.85, 0.50 * g * solma * (0.35 + gunes.guc * 0.85) * (1 - gunes.kapali * 0.35));
    if (alfa <= 0.003) return;
    const self = this;

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = alfa;
    this._bulanik(ctx, Math.min(24, 2 + (1 - solma) * 14 + gunes.kapali * 4));
    ctx.translate(s.x, s.y);
    // Gölge, arazi eğimine değil güneş yönüne göre hafifçe kayar (perspektif).
    ctx.rotate(Math.max(-0.45, Math.min(0.45, (v.angle || 0) * 0.22)));
    ctx.scale(gen, kal);
    ctx.fillStyle = this._gr(ctx, ba, 'isik-golge|' + W + 'x' + H + '|' + p.sis, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(8,10,16,0.95)');
      gr.addColorStop(0.42, 'rgba(10,13,20,0.62)');
      gr.addColorStop(0.74, self._rgba(p.sis, 0.20));
      gr.addColorStop(1, self._rgba(p.sis, 0));
      return gr;
    });
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) TEMAS GÖLGESİ — tekerlek altı koyu çekirdek (ambient occlusion)
  // ═════════════════════════════════════════════════════════════════════════
  _temasGolge(ctx, W, H, ba, p, gunes) {
    const g = this._k(ba, 'temasGolge');
    if (g <= 0) return;
    const v = ba.vehicle;
    const d = this._donusum(ba);
    if (!v || !d) return;
    const ter = (ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;

    // Teker listesi: fizik `wx/wy` (dünya) yazar; yoksa `x/y`; hiç yoksa gövde.
    const kaynak = (v.wheels && v.wheels.length) ? v.wheels : null;
    const liste = [];
    if (kaynak) {
      for (let i = 0; i < kaynak.length; i++) {
        const w = kaynak[i];
        if (!w) continue;
        const wx = (typeof w.wx === 'number') ? w.wx : w.x;
        const wy = (typeof w.wy === 'number') ? w.wy : w.y;
        if (typeof wx !== 'number' || typeof wy !== 'number') continue;
        liste.push({ x: wx, y: wy, r: w.r || w.radius || 20 });
      }
    }
    if (!liste.length) {
      liste.push({ x: v.x, y: v.y + (v.height || v.h || 50) * 0.5, r: (v.width || 100) * 0.18 });
    }

    const olc = Math.abs(d.olcek);
    const self = this;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    this._bulanik(ctx, Math.max(1, 3 * olc));
    for (let i = 0; i < liste.length; i++) {
      const t = liste[i];
      let zy = ter ? ter.getYAt(t.x) : (t.y + t.r);
      if (!isFinite(zy)) zy = t.y + t.r;
      const bosluk = zy - (t.y + t.r);                    // >0 ise havada
      const yakin = Math.max(0, Math.min(1, 1 - bosluk / (t.r * 2.6)));
      if (yakin <= 0.02) continue;
      const s = d.ekran(t.x, zy);
      if (!s || !isFinite(s.x) || !isFinite(s.y)) continue;
      const rx = Math.max(2, t.r * 1.95 * olc * (1 + (1 - yakin) * 0.5));
      const ry = Math.max(1.2, t.r * 0.62 * olc * (1 + (1 - yakin) * 0.4));
      ctx.save();
      ctx.globalAlpha = Math.min(0.9, 0.62 * g * yakin * (0.6 + gunes.kapali * 0.6));
      ctx.translate(s.x, s.y);
      ctx.scale(rx, ry);
      ctx.fillStyle = this._gr(ctx, ba, 'isik-temas|' + W + 'x' + H + '|' + p.sis, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, 'rgba(2,3,6,0.96)');
        gr.addColorStop(0.30, 'rgba(6,8,12,0.70)');
        gr.addColorStop(0.68, self._rgba(p.sis, 0.22));
        gr.addColorStop(1, self._rgba(p.sis, 0));
        return gr;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) DİNAMİK IŞIK — far konisi + kaynak parlaması + nitro arka ışığı
  // ═════════════════════════════════════════════════════════════════════════
  _dinamikIsik(ctx, W, H, ba, p, gunes) {
    const g = this._k(ba, 'dinamikIsik');
    if (g <= 0) return;
    const v = ba.vehicle;
    const d = this._donusum(ba);
    if (!v || !d || typeof v.x !== 'number' || typeof v.y !== 'number') return;
    const s = d.ekran(v.x, v.y);
    if (!s || !isFinite(s.x) || !isFinite(s.y)) return;

    const olc = Math.abs(d.olcek);
    const gen = Math.max(8, (v.width || v.h || 100) * olc);
    const aci = v.angle || 0;
    // Karanlık haritada far daha güçlü görünür (göz uyumu taklidi).
    const karanlik = 0.30 + gunes.kapali * 0.85 + (1 - gunes.guc) * 0.35;
    const nitro = !!(v.boostActive || v.nitroActive || v.boosting);
    const tit = 0.88 + this._titresim * 0.24;

    const kx = s.x + Math.cos(aci) * gen * 0.46;
    const ky = s.y + Math.sin(aci) * gen * 0.46 - gen * 0.12;
    const uzun = gen * (3.0 + 2.6 * g) * (nitro ? 1.28 : 1);
    const yariAci = 0.30 + 0.06 * g;
    const anh = W + 'x' + H + '|' + p.bloom + '|' + p.gun;
    const self = this;

    // a) hacimsel koni — üç katman, açıklığı artan / alfası azalan
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(kx, ky);
    ctx.rotate(aci);
    this._bulanik(ctx, Math.min(14, 3 + 8 * g));
    const koniGr = this._gr(ctx, ba, 'isik-koni|' + anh, function (c) {
      const gr = c.createLinearGradient(0, 0, 1, 0);
      gr.addColorStop(0, 'rgba(255,252,238,0.92)');
      gr.addColorStop(0.14, self._rgba(p.gun, 0.55));
      gr.addColorStop(0.48, self._rgba(p.bloom, 0.20));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
    const kat = [
      { a: 1.00, u: 1.00, s: 1.00 },
      { a: 0.55, u: 0.76, s: 1.55 },
      { a: 0.28, u: 0.52, s: 2.35 }
    ];
    for (let i = 0; i < kat.length; i++) {
      const yA = Math.min(1.25, yariAci * kat[i].s);
      const uz = uzun * kat[i].u;
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, 0.26 * g * karanlik * kat[i].a * tit);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, uz, -yA, yA);
      ctx.closePath();
      ctx.clip();
      ctx.scale(uz, uz);
      ctx.fillStyle = koniGr;
      ctx.fillRect(0, -1.3, 1, 2.6);
      ctx.restore();
    }
    ctx.restore();

    // b) kaynak parlaması (lamba camının kendisi)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.9, 0.46 * g * karanlik * tit);
    ctx.translate(kx, ky);
    ctx.scale(gen * 0.62, gen * 0.62);
    ctx.fillStyle = this._gr(ctx, ba, 'isik-lamba|' + anh, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(255,255,250,0.95)');
      gr.addColorStop(0.30, self._rgba(p.gun, 0.45));
      gr.addColorStop(1, self._rgba(p.gun, 0));
      return gr;
    });
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // c) zemine düşen ışık havuzu (aydınlatılmış yüzey)
    if (g >= 0.5) {
      const ter = (ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;
      const hx = v.x + Math.cos(aci) * (v.width || 100) * 1.5;
      let hy = ter ? ter.getYAt(hx) : (v.y + (v.height || 50));
      if (!isFinite(hy)) hy = v.y + (v.height || 50);
      const hs = d.ekran(hx, hy);
      if (hs && isFinite(hs.x) && isFinite(hs.y)) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.6, 0.22 * g * karanlik * tit);
        ctx.translate(hs.x, hs.y);
        ctx.scale(gen * 1.5, gen * 0.40);
        ctx.fillStyle = this._gr(ctx, ba, 'isik-havuz|' + anh, function (c) {
          const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
          gr.addColorStop(0, self._rgba(p.gun, 0.70));
          gr.addColorStop(0.5, self._rgba(p.bloom, 0.22));
          gr.addColorStop(1, self._rgba(p.bloom, 0));
          return gr;
        });
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // d) NİTRO — arkadan taşan renkli ışık (palet bloom rengiyle)
    if (nitro) {
      const nx = s.x - Math.cos(aci) * gen * 0.52;
      const ny = s.y - Math.sin(aci) * gen * 0.52;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.85, 0.42 * g * tit);
      this._bulanik(ctx, Math.min(18, 4 + 10 * g));
      ctx.translate(nx, ny);
      ctx.rotate(aci);
      ctx.scale(gen * 1.25, gen * 0.85);
      ctx.fillStyle = this._gr(ctx, ba, 'isik-nitro|' + anh, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)');
        gr.addColorStop(0.22, self._rgba(p.bloom, 0.72));
        gr.addColorStop(0.55, self._rgba(p.tint, 0.28));
        gr.addColorStop(1, self._rgba(p.tint, 0));
        return gr;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) IŞIK TİTREMESİ — lav/neon haritalarda kararsız aydınlanma
  // ═════════════════════════════════════════════════════════════════════════
  _isikTitresim(ctx, W, H, ba, p, gunes) {
    const g = this._k(ba, 'isikTitresim');
    if (g <= 0) return;
    const mid = ba.mapId || '';
    // Liste + palet sezgisi: kapalı ortam + doygun tint = kararsız ışık kaynağı.
    const titrekMi = !!this.TITREK[mid] || (gunes.kapali > 0.55 && this._doygunluk(p.tint) > 0.45);
    if (!titrekMi) return;

    const t = ba.t || 0;
    let n = Math.sin(t * 9.1) * 0.40 + Math.sin(t * 17.3 + 1.1) * 0.27 +
            Math.sin(t * 31.7 + 2.4) * 0.19 + Math.sin(t * 57.2 + 0.7) * 0.14;
    n = Math.max(0, Math.min(1, 0.5 + n * 0.5));
    // Yumuşatma: kare hızından bağımsız, ani sıçrama yok.
    this._titresim = this._titresim * 0.70 + n * 0.30;
    const tit = this._titresim;
    const self = this;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // a) alttan yükselen kaynak parıltısı (lav/neon zemini)
    ctx.globalAlpha = Math.min(0.5, (0.05 + 0.13 * tit) * g);
    ctx.fillStyle = this._gr(ctx, ba, 'isik-titrekalt|' + W + 'x' + H + '|' + p.bloom + '|' + p.tint, function (c) {
      const gr = c.createLinearGradient(0, H, 0, H * 0.30);
      gr.addColorStop(0, self._rgba(p.bloom, 0.68));
      gr.addColorStop(0.35, self._rgba(p.tint, 0.22));
      gr.addColorStop(1, self._rgba(p.tint, 0));
      return gr;
    });
    ctx.fillRect(0, H * 0.30, W, H * 0.70);

    // b) tüm sahneye vuran ince renk darbesi
    ctx.globalAlpha = Math.min(0.28, (0.018 + 0.055 * tit) * g);
    ctx.fillStyle = this._gr(ctx, ba, 'isik-titrekgenel|' + W + 'x' + H + '|' + p.bloom, function (c) {
      const gr = c.createRadialGradient(W * 0.5, H * 0.68, 0, W * 0.5, H * 0.68, Math.max(W, H) * 0.82);
      gr.addColorStop(0, self._rgba(p.bloom, 0.55));
      gr.addColorStop(0.55, self._rgba(p.bloom, 0.16));
      gr.addColorStop(1, self._rgba(p.bloom, 0));
      return gr;
    });
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  // ── ÖNBELLEKLİ GRADIENT ──────────────────────────────────────────────────
  // ba.gr verilmişse ONA delege edilir (tek merkezi önbellek). Verilmemişse
  // aynı semantikte YEREL önbellek kullanılır — hiçbir durumda kare başına
  // yeni gradient üretilmez.
  _gr(ctx, ba, anahtar, uret) {
    if (ba && typeof ba.gr === 'function') {
      const g = ba.gr(anahtar, uret);
      if (g) return g;
    }
    let y = this._grYerel[anahtar];
    if (!y) {
      y = uret(ctx);
      this._grYerel[anahtar] = y;
      this._grUretim++;
    }
    return y;
  },

  // ── Kalite geçidi (0 => o efekt HİÇ çizilmez) ────────────────────────────
  _k(ba, ad) {
    try {
      if (ba && typeof ba.kalite === 'function') {
        const v = ba.kalite(ad);
        return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 0;
      }
      // Bağlam kalite vermediyse global kademeye düş (yoksa 0 = güvenli).
      if (typeof Kalite !== 'undefined' && Kalite && typeof Kalite.ayar === 'function') {
        const v2 = Kalite.ayar(ad);
        return (typeof v2 === 'number' && isFinite(v2)) ? Math.max(0, Math.min(1, v2)) : 0;
      }
    } catch (e) {}
    return 0;
  },

  // ── Blur desteği (bir kez ölçülür; yoksa katmanlı çizim yumuşaklığı verir)
  _blurVar(ctx) {
    if (this._blurDestek !== null) return this._blurDestek;
    let ok = false;
    try {
      const eski = ctx.filter;
      ctx.filter = 'blur(1px)';
      ok = (ctx.filter === 'blur(1px)');
      ctx.filter = eski || 'none';
    } catch (e) { ok = false; }
    this._blurDestek = ok;
    return ok;
  },
  _bulanik(ctx, px) {
    if (!(px > 0)) return;
    if (!this._blurVar(ctx)) return;
    try { ctx.filter = 'blur(' + px.toFixed(1) + 'px)'; } catch (e) {}
  },

  // ── Dünya→ekran dönüşümü + ekran→dünya tersi ─────────────────────────────
  // ⚠ `ba.camera` yalnız `worldToScreen` garantiler. Dönüşüm afin olduğu için
  //   iki örnekleme ile ölçek ve ters eşleme türetilir (screenToWorld varsa da
  //   ona GÜVENİLMEZ; imzası kamera modülleri arasında farklılaşıyor).
  _donusum(ba) {
    const c = ba && ba.camera;
    if (!c || typeof c.worldToScreen !== 'function') return null;
    const ax = (ba.vehicle && typeof ba.vehicle.x === 'number') ? ba.vehicle.x : 0;
    let a, b;
    try {
      a = c.worldToScreen(ax, 0);
      b = c.worldToScreen(ax + 1000, 0);
    } catch (e) { return null; }
    if (!a || !b || !isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x)) return null;
    const olcek = (b.x - a.x) / 1000;
    if (!isFinite(olcek) || Math.abs(olcek) < 1e-6) return null;
    return {
      olcek: olcek,
      ekran: function (wx, wy) {
        try { return c.worldToScreen(wx, wy); } catch (e) { return null; }
      },
      dunyaX: function (sx) { return ax + (sx - a.x) / olcek; }
    };
  },

  // ── Ekran genişliği boyunca arazi siluetinin ekran noktaları ─────────────
  _zeminNoktalari(ba, W, adet) {
    const d = this._donusum(ba);
    const ter = (ba && ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;
    if (!d || !ter) return null;
    const nk = [];
    for (let i = 0; i <= adet; i++) {
      const sx = (W * i) / adet;
      const wx = d.dunyaX(sx);
      if (!isFinite(wx)) return null;
      let wy;
      try { wy = ter.getYAt(wx); } catch (e) { return null; }
      if (!isFinite(wy)) return null;
      const s = d.ekran(wx, wy);
      if (!s || !isFinite(s.y)) return null;
      nk.push({ x: sx, y: s.y });
    }
    return nk.length > 1 ? nk : null;
  },

  // ── GÜNEŞ MODELİ — paletten + zamandan türetilir ─────────────────────────
  // Fikir: `palet.gun` rengi ışığın KARAKTERİDİR.
  //   · parlak + soğuk  → tepede, sert, beyaz ışık   (kutup / buzul / ay)
  //   · loş + sıcak     → ufka yakın, uzun gölge     (volkan / gün batımı)
  //   · `palet.sis` koyu → kapalı ortam              (mağara / lav nehri)
  _gunes(ba, p) {
    p = p || this._VARSAYILAN_PALET;
    const mid = (ba && ba.mapId) || 'varsayilan';
    const anahtar = mid + '|' + (p.gun || '') + '|' + (p.sis || '');
    let s = this._gunesOnbellek[anahtar];
    if (!s) {
      const gr = this._rgb(p.gun || '#ffe8b0');
      const sr = this._rgb(p.sis || '#cfe0f0');
      const parlak = (gr.r + gr.g + gr.b) / 765;
      const sicak = (gr.r - gr.b) / 255;
      const sisParlak = (sr.r + sr.g + sr.b) / 765;
      let taban = 0.16 + parlak * 0.66 - sicak * 0.34;
      taban = Math.max(0.07, Math.min(0.94, taban));
      const kapali = Math.max(0, Math.min(1, 1 - sisParlak * 1.15));
      s = {
        taban: taban,
        kapali: kapali,
        guc: Math.max(0.10, Math.min(1, parlak * (1 - kapali * 0.62))),
        yonTaban: ((this._hash(mid) % 200) / 100) - 1,     // -1..1, haritaya özel
        ay: (parlak < 0.64 && sicak < -0.02)               // soğuk + loş = ay ışığı
      };
      this._gunesOnbellek[anahtar] = s;
    }
    // Çok yavaş gün döngüsü (~6 dk tam tur). Güneş ufkun ALTINA inmez.
    const t = (ba && ba.t) || 0;
    const yuk = Math.max(0.06, Math.min(0.96, s.taban + Math.sin(t * 0.0175) * 0.13));
    const yon = Math.max(-1, Math.min(1, s.yonTaban + Math.cos(t * 0.0175) * 0.35));
    const aci = yuk * (Math.PI / 2);
    const uzama = Math.max(0.55, Math.min(6.5, 1 / Math.max(0.16, Math.tan(aci))));
    return {
      yuk: yuk, yon: yon, aci: aci, uzama: uzama,
      guc: s.guc, kapali: s.kapali, ay: s.ay
    };
  },

  // ── Renk yardımcıları ────────────────────────────────────────────────────
  _rgb(hex) {
    // BUGFIX(30 Tmz): `_karis()` 'rgb(r,g,b)' döndürüyor ama bu ayrıştırıcı
    // yalnız hex biliyordu → `_rgba(_karis(...))` zincirinde parseInt NaN veriyor
    // ve renk SESSİZCE varsayılana düşüyordu (ay ışığı rengi kayboluyordu).
    // Artık her iki biçim de anlaşılıyor.
    const s = String(hex == null ? '' : hex).trim();
    const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return { r: +m[1] & 255, g: +m[2] & 255, b: +m[3] & 255 };
    const h = s.replace('#', '');
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 255, g: 232, b: 176 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  _karis(hexA, hexB, t) {
    const a = this._rgb(hexA), b = this._rgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    const r = Math.round(a.r + (b.r - a.r) * k);
    const g = Math.round(a.g + (b.g - a.g) * k);
    const bl = Math.round(a.b + (b.b - a.b) * k);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  },
  _doygunluk(hex) {
    const c = this._rgb(hex);
    const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
    return mx === 0 ? 0 : (mx - mn) / mx;
  },
  // ⚠ `Math.imul` TAM 32-bit çarpar. Düz `*` kullanılırsa double yuvarlaması
  //   devreye girer (CLAUDE.md tuzak D16) — burada bilinçli olarak imul.
  _hash(s) {
    s = String(s == null ? '' : s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  },

  // ── Test için sahte 2D bağlam (selfTest ve duman testleri kullanır) ──────
  _sahteCtx() {
    const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
    const grad = { addColorStop: function () {} };
    const c = {
      _say: say,
      canvas: { width: 800, height: 450 },
      filter: 'none',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      save: function () { say.save++; },
      restore: function () { say.restore++; },
      beginPath: function () {},
      closePath: function () {},
      moveTo: function () {},
      lineTo: function () {},
      arc: function () {},
      clip: function () {},
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      fill: function () { say.ciz++; },
      stroke: function () { say.ciz++; },
      fillRect: function () { say.ciz++; },
      strokeRect: function () { say.ciz++; },
      drawImage: function () { say.ciz++; },
      createLinearGradient: function () { say.gradient++; return grad; },
      createRadialGradient: function () { say.gradient++; return grad; }
    };
    return c;
  },

  // ── Test için sahte bağlam nesnesi ───────────────────────────────────────
  _sahteBa(mapId, palet, kaliteDeger, t) {
    const self = this;
    const onbellek = {};
    const sayac = { yeni: 0 };
    return {
      mapId: mapId,
      palet: palet,
      t: (t == null ? 12.5 : t),
      dt: 0.016,
      vehicle: {
        x: 4200, y: 900, vx: 340, vy: -20, angle: 0.18, onGround: true,
        width: 120, height: 54, boostActive: true,
        wheels: [
          { wx: 4160, wy: 930, r: 22, contact: true },
          { wx: 4250, wy: 934, r: 22, contact: true }
        ]
      },
      camera: {
        worldToScreen: function (wx, wy) { return { x: (wx - 3900) * 1.15, y: (wy - 700) * 1.15 }; }
      },
      terrain: {
        getYAt: function (wx) { return 950 + Math.sin(wx * 0.004) * 60; }
      },
      kalite: function () { return kaliteDeger; },
      gr: function (anahtar, uret) {
        let g = onbellek[anahtar];
        if (!g) { g = uret(self._sonTestCtx); onbellek[anahtar] = g; sayac.yeni++; }
        return g;
      },
      _sayac: sayac
    };
  },
  _sonTestCtx: null,

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — canvas gerektirmez, sahte ctx üzerinde ÖLÇEREK doğrular
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'isik') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');

    // 2) Renk yardımcıları
    r.rgbDogru = (function (s) {
      const c = s._rgb('#ff8000');
      const k = s._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 && k.r === 255 && k.g === 136 && k.b === 0;
    })(this);
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.bozukRenkGuvenli = !!this._rgb('lacivert-yok') && !!this._rgb(null);
    r.hashKararli = this._hash('volcano') === this._hash('volcano') &&
                    this._hash('volcano') !== this._hash('cave');

    // 3) Güneş modeli — palet farkı gerçekten davranışa yansımalı
    const gVolkan = this._gunes({ mapId: 'volcano', t: 0 }, { gun: '#ff7030', sis: '#5a2418' });
    const gKutup  = this._gunes({ mapId: 'arctic',  t: 0 }, { gun: '#d0eaff', sis: '#e0f6ff' });
    const gMagara = this._gunes({ mapId: 'cave',    t: 0 }, { gun: '#6090c0', sis: '#20304a' });
    r.gunesAcisi = gVolkan.yuk < gKutup.yuk;               // volkan alçak, kutup tepede
    r.golgeUzamasi = gVolkan.uzama > gKutup.uzama;         // alçak güneş = uzun gölge
    r.magaraKapali = gMagara.kapali > gKutup.kapali;       // mağara kapalı ortam
    r.magaraKoyu = gMagara.guc < gKutup.guc;               // mağarada ışık zayıf
    r.gunesSiniri = [gVolkan, gKutup, gMagara].every(function (g) {
      return g.yuk > 0 && g.yuk < 1 && isFinite(g.uzama) && g.uzama > 0 &&
             g.guc > 0 && g.guc <= 1 && g.kapali >= 0 && g.kapali <= 1;
    });

    // 4) Gradient önbelleği — ikinci çağrı YENİ gradient ÜRETMEMELİ
    r.gradientOnbellek = (function (s) {
      s._grYerel = {}; s._grUretim = 0;
      const sahte = s._sahteCtx();
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      const ilk = s._grUretim;
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      return ilk === 1 && s._grUretim === 1;
    })(this);

    // 5) Kalite geçidi: 0 => TEK BİR çizim çağrısı bile olmamalı
    r.kaliteSifirCizmez = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('volcano', { tint: '#e04a1a', bloom: '#ffa040', sis: '#5a2418', gun: '#ff7030' }, 0);
      s.ciz(ctx, 800, 450, ba);
      return ctx._say.ciz === 0 && ctx._say.gradient === 0;
    })(this);

    // 6) Tam kalitede gerçekten çiziyor + save/restore DENGELİ + durum geri konuyor
    const olcum = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const ba = s._sahteBa('volcano', { tint: '#e04a1a', bloom: '#ffa040', sis: '#5a2418', gun: '#ff7030' }, 1);
      s.ciz(ctx, 800, 450, ba);
      return {
        ciz: ctx._say.ciz,
        dengeli: ctx._say.save === ctx._say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor',
        yeniGradient: ba._sayac.yeni
      };
    })(this);
    r.tamKaliteCiziyor = olcum.ciz > 10;
    r.saveRestoreDengeli = olcum.dengeli;
    r.durumGeriKonuyor = olcum.alfa && olcum.karisim;

    // 7) İkinci kare YENİ gradient üretmemeli (ba.gr önbelleği çalışıyor)
    r.kareBasinaSifirGradient = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('neon_city', { tint: '#c040e0', bloom: '#ff60ff', sis: '#2a1040', gun: '#a050ff' }, 1);
      s.ciz(ctx, 800, 450, ba);
      const ilk = ba._sayac.yeni;
      ba.t = 13.0;
      s.ciz(ctx, 800, 450, ba);
      return ilk > 0 && ba._sayac.yeni === ilk;
    })(this);

    // 8) Eksik bağlam (kamera/arazi/araç yok) çökertmemeli
    r.eksikBaglamGuvenli = (function (s) {
      try {
        const ctx = s._sahteCtx();
        s.ciz(ctx, 640, 360, { mapId: 'cave', t: 3, kalite: function () { return 1; } });
        s.ciz(ctx, 640, 360, {});
        s.ciz(ctx, 640, 360, null);
        s.ciz(null, 640, 360, {});
        return true;
      } catch (e) { return false; }
    })(this);

    // 9) Titrek harita listesi + palet sezgisi
    r.titrekListe = Object.keys(this.TITREK).length >= 10 && this.TITREK.volcano === 1;

    // 10) hazir() boyut değişimini yakalıyor
    r.hazirBoyut = (function (s) {
      const eskiW = s._W, eskiH = s._H, eskiHz = s._hazirlandi;
      s.hazir(400, 300);
      const a = (s.hazir(400, 300) === false);      // aynı boyut → iş yok
      const b = (s.hazir(500, 300) === true);       // değişti → yeniden kur
      s._W = eskiW; s._H = eskiH; s._hazirlandi = eskiHz;
      return a && b;
    })(this);

    this._sonTestCtx = null;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselIsik = GorselIsik;
