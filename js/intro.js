'use strict';
// ============================================================================
// Intro — YÜKLEME EKRANI (sinematik DEĞİL).
//
// 28 Tmz: eski ~11 sn'lik sinematik giriş KALDIRILMIŞTI; yerine HCR1 tarzı sade
//         bir yükleme ekranı geldi (MIN_TIME 1.15 sn · MAX_TIME 6 sn ⇒ tipik
//         görünme süresi ~2,2 sn).
// 31 Tmz (kullanıcı isteği: "giriş animasyonundaki yüklenme daha uzun olsun" +
//         "menüler çok sade, az hava kat"):
//         · Süre ~2,9× uzatıldı  → MIN_TIME 6.0 sn · MAX_TIME 15.0 sn
//         · Uzayan süre BOŞ GEÇMESİN diye 6 AŞAMALI durum metni eklendi
//         · Yıldız · toz zerreleri · süzülen ışık huzmesi · kayan tepeler ·
//           logo salınımı · çubuk parıltısı · zıplayan araç · vinyet
//         · Girişte fade-in, çıkışta fade-out
// 31 Tmz: 🔴 DOKUNMAK ARTIK ATLAMAZ (kullanıcı isteği). Ekran yalnız yükleme
//         bitince ya da MAX_TIME güvenlik ağıyla kapanır. `handleClick` duruyor
//         ama SADECE ses kilidini açıyor (tarayıcı autoplay politikası).
//
// Dış arayüz DEĞİŞMEDİ — üç çağrı noktası aynen çalışır:
//   main.js:140  → Intro.reset(); UI.currentScreen = 'intro';
//   ui.js:256    → Intro.draw(ctx, W, H, dt)
//   ui.js:5170   → Intro.handleClick(x, y)
//
// 🔴 ZAMAN DUVAR SAATİYLE ÖLÇÜLÜR (`_t0` + Date.now()), `dt` BİRİKTİREREK DEĞİL.
//    Sebep (28 Tmz, canlıda yakalandı): `ui.js` çağrıyı `this._lastDt` ile yapıyor
//    ama açılışta bu değer güvenilir gelmiyor; dt biriktirince 12 saniyede t=0.53
//    oluyordu → ekran takılı kalıyor, MAX_TIME güvenlik ağı hiç devreye giremiyordu.
//    ▶ Bu dosyada zamanı ASLA dt biriktirerek ölçme.
//
// 🔴 GRADIENT ÖNBELLEĞİ: hiçbir gradient kare içinde ÜRETİLMEZ. Hepsi `_g()`
//    üzerinden bir kez üretilip saklanır; önbellek yalnız W/H değişince atılır.
//    Isınmadan sonra kare başına YENİ gradient = 0 (selfTest bunu ÖLÇER).
//    ⚠ Yeni efekt eklerken `ctx.createLinearGradient` doğrudan ÇAĞIRMA → `_g()` kullan.
//
// 🔴 `getImageData` KULLANILMAZ (ana iş parçacığını durdurur).
// 🔴 Her efekt AYRI try/catch içinde: biri patlarsa ekran ASILI KALMAZ; en kötü
//    ihtimalle MAX_TIME dolar ve menüye geçilir.
// ============================================================================

const Intro = {
  t: 0,
  done: false,
  _started: false,
  _prog: 0,          // gösterilen ilerleme 0..1 (hedefe yumuşak yaklaşır)

  // ── Ayarlar ───────────────────────────────────────────────────────────────
  // ⚠ MAX_TIME ile MIN_TIME'ın İLİŞKİSİ: bitiş koşulu
  //   `(p >= 1 && t >= MIN_TIME) || t >= MAX_TIME`.
  //   MAX_TIME, MIN_TIME + çıkış fade'inden BELİRGİN ölçüde büyük olmalı; aksi
  //   halde normal akış güvenlik ağına takılır ve ekran erken kesilir.
  MIN_TIME: 6.0,     // en az bu kadar sn ekranda kalsın (eski: 1.15)
  MAX_TIME: 15.0,    // güvenlik: bu süre dolarsa yükleme bitmese de menüye geç (eski: 6.0)

  GIRIS_FADE: 0.55,  // sn — siyahtan açılma
  CIKIS_FADE: 0.45,  // sn — normal bitişte siyaha kapanma
  // ATLA_FADE KALDIRILDI (31 Tmz): dokunarak atlama yok, tek çıkış yolu CIKIS_FADE.

  // ── Aşamalı durum metni ───────────────────────────────────────────────────
  // [ilerleme eşiği, metin]. Metin İLERLEMEYE bağlıdır (zamana değil): gerçek
  // yükleme %75'te takılırsa aşama da orada durur — oyuncu yalan bilgi görmez.
  // ⚠ Metin ekrana TEK BAŞINA çizilir (yüzde AYRI fillText) — birleştirilirse
  //   i18n kancasının TAM EŞLEŞME yolu tutmaz ve çeviri düşer.
  ASAMALAR: [
    [0.00, 'Arazi hazırlanıyor…'],
    [0.16, 'Araçlar yükleniyor…'],
    [0.34, 'Fizik motoru başlatılıyor…'],
    [0.52, 'Sesler açılıyor…'],
    [0.68, 'Kayıt okunuyor…'],
    [0.84, 'Son rötuşlar…']
  ],
  BITTI_METNI: 'Hazır!',

  // Bu dosyanın KENDİ metinlerinin çevirisi. Başka bir dosyaya (i18n-src-*.js)
  // dokunmadan çalışsın diye çalışma zamanında `I18N._dict`'e EKLENİR.
  // ⚠ Var olan bir anahtarın ÜSTÜNE YAZILMAZ (aşağıdaki `in` kontrolü).
  _CEVIRI: {
    'Arazi hazırlanıyor…':        ['Preparing terrain…',      'Gelände wird vorbereitet…'],
    'Araçlar yükleniyor…':        ['Loading vehicles…',       'Fahrzeuge werden geladen…'],
    'Fizik motoru başlatılıyor…': ['Starting physics engine…', 'Physik-Engine startet…'],
    'Sesler açılıyor…':           ['Warming up audio…',       'Audio wird vorbereitet…'],
    'Kayıt okunuyor…':            ['Reading save data…',      'Spielstand wird gelesen…'],
    'Son rötuşlar…':              ['Final touches…',          'Letzter Schliff…'],
    'Hazır!':                     ['Ready!',                  'Bereit!']
  },

  // ── Durum ─────────────────────────────────────────────────────────────────
  _t0: 0,
  _son: 0,
  _cikis: false,
  _cikisT0: 0,
  _cikisSure: 0.45,
  _sessiz: false,      // selfTest sırasında UI/Audio'ya dokunma
  _dilKuruldu: false,

  // Gradient önbelleği
  _gr: null,
  _grW: 0,
  _grH: 0,
  _grYeni: 0,          // ÜRETİLEN gradient sayısı (selfTest bunu ölçer)

  _toz: null,
  _yildiz: null,

  // ==========================================================================
  reset() {
    this.t = 0;
    this.done = false;
    this._started = true;
    this._prog = 0;
    this._cikis = false;
    this._cikisT0 = 0;
    this._cikisSure = this.CIKIS_FADE;
    // ⚠ ZAMAN DUVAR SAATİNDEN ölçülür (bkz. dosya başı uyarısı).
    this._t0 = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
    this._son = this._t0;
    this._dilKur();
  },

  // ── i18n: kendi metinlerimi çalışma zamanında kaydet ──────────────────────
  // 🔴 ÖNCE `translate()` çağrılır: bu, dil başına regex'i DERLETİP önbelleğe
  //    alır. Anahtarlarım o andan SONRA sözlüğe girdiği için regex alternasyonuna
  //    KATILMAZ → yalnız TAM EŞLEŞME ile çevrilirler. (Gömülü eşleşselerdi başka
  //    bir çevirinin ÇIKTISINI yeniden yazabilirlerdi — `SADECE_TAM` tuzağı.)
  //    `compile()` map'i CANLI referansla tuttuğu için sonradan eklenen anahtarlar
  //    O(1) tam eşleşme yolunda çalışmaya devam eder.
  _dilKur() {
    if (this._dilKuruldu) return;
    try {
      const I = (typeof I18N !== 'undefined') ? I18N
              : ((typeof window !== 'undefined' && window.I18N) ? window.I18N : null);
      if (!I || !I._dict) return;                 // i18n yoksa sessizce geç, tekrar dene
      try {
        if (typeof I.translate === 'function') {
          I.translate('', 'en'); I.translate('', 'de'); I.translate('', 'tr');
        }
      } catch (e) {}
      const d = I._dict;
      for (const k in this._CEVIRI) {
        if (!Object.prototype.hasOwnProperty.call(this._CEVIRI, k)) continue;
        const v = this._CEVIRI[k];
        if (d.en && !(k in d.en)) d.en[k] = v[0];
        if (d.de && !(k in d.de)) d.de[k] = v[1];
        // Türkçe: kimlik eşleme → tam eşleşme hemen döner, regex'e hiç girmez.
        if (d.tr && !(k in d.tr)) d.tr[k] = k;
      }
      if (typeof window !== 'undefined' && typeof window._i18nClear === 'function') {
        window._i18nClear();
      }
      this._dilKuruldu = true;
    } catch (e) { /* çeviri olmasa da yükleme ekranı çalışmalı */ }
  },

  // ── Gerçek yükleme sinyali ────────────────────────────────────────────────
  // document.readyState: 'loading' → 'interactive' → 'complete'
  // 'complete' = tüm script/görsel/stil indi. Ondan öncesi TAVANLI: çubuk
  // gerçekten takılırsa oyuncu bunu görür (dekoratif sahte sayaç değil).
  _target() {
    try {
      if (typeof document === 'undefined') return 1;
      if (document.readyState === 'complete')    return 1;
      if (document.readyState === 'interactive') return 0.75;
      return 0.4;
    } catch (e) { return 1; }
  },

  // ── Gradient önbelleği ────────────────────────────────────────────────────
  // 🔴 TÜM gradientler buradan geçer. Kare içinde yeni gradient ÜRETİLMEZ.
  _g(anahtar, yapici) {
    if (!this._gr) this._gr = {};
    let g = this._gr[anahtar];
    if (g === undefined) {
      g = yapici();
      this._gr[anahtar] = g;
      this._grYeni++;
    }
    return g;
  },

  // Boyut değişince önbellek + parçacık havuzları yeniden kurulur (yalnız o zaman).
  _boyut(W, H) {
    if (W === this._grW && H === this._grH && this._toz) return;
    this._gr = {};
    this._grW = W;
    this._grH = H;
    this._parcaKur(W, H);
  },

  // Deterministik sahte rastgele (test tekrarlanabilir olsun diye LCG).
  _lcg(tohum) {
    let s = tohum >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  },

  _parcaKur(W, H) {
    const r = this._lcg(20260731);
    const nToz = Math.max(14, Math.min(46, Math.round(W / 22)));
    this._toz = [];
    for (let i = 0; i < nToz; i++) {
      this._toz.push({
        x: r() * W,
        y: r() * H,
        rr: 0.6 + r() * 1.9,
        hz: 0.010 + r() * 0.030,     // ekran yüksekliğinin oranı / sn
        ph: r() * Math.PI * 2,
        a: 0.14 + r() * 0.30
      });
    }
    const nYildiz = Math.max(16, Math.min(70, Math.round(W / 14)));
    this._yildiz = [];
    for (let j = 0; j < nYildiz; j++) {
      this._yildiz.push({
        x: r() * W,
        y: r() * H * 0.50,
        rr: 0.5 + r() * 1.2,
        ph: r() * Math.PI * 2,
        hz: 0.7 + r() * 2.2
      });
    }
  },

  // ── Yazı tipi yardımcısı ──────────────────────────────────────────────────
  // 🔴 YALNIZ H'ye bağlı font YAZMA: 360×800 gibi dar-uzun telefonda metin
  //    ekran GENİŞLİĞİNDEN taşar. Daima min(H tabanlı, W tabanlı) + maxWidth.
  _fnt(H, W, hK, wK, mn, mx) {
    return Math.max(mn, Math.min(mx, Math.min(H * hK, W * wK)));
  },

  // ── Tepe silueti ──────────────────────────────────────────────────────────
  _hillY(x, W, base, amp, freq, phase) {
    return base
      + Math.sin((x / W) * Math.PI * freq + phase) * amp
      + Math.sin((x / W) * Math.PI * freq * 2.3 + phase * 1.7) * amp * 0.35;
  },

  _drawHills(ctx, W, H, yBase, amp, freq, col, phase, ofs) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      ctx.lineTo(x, this._hillY(x + (ofs || 0), W, yBase, amp, freq, phase));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  },

  // ── Küçük araç silueti (ilerleme çubuğu üstünde koşar) ────────────────────
  _drawCar(ctx, cx, cy, s, spin, egim) {
    ctx.save();
    ctx.translate(cx, cy);
    if (egim) ctx.rotate(egim);
    ctx.scale(s, s);

    // gövde
    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath();
    ctx.moveTo(-15, 2);
    ctx.lineTo(-12, -5);
    ctx.lineTo(-3, -6);
    ctx.lineTo(1, -12);
    ctx.lineTo(10, -12);
    ctx.lineTo(13, -5);
    ctx.lineTo(16, -4);
    ctx.lineTo(16, 2);
    ctx.closePath();
    ctx.fill();

    // cam
    ctx.fillStyle = 'rgba(30,45,70,0.85)';
    ctx.beginPath();
    ctx.moveTo(2, -11);
    ctx.lineTo(9, -11);
    ctx.lineTo(11, -6);
    ctx.lineTo(2, -6);
    ctx.closePath();
    ctx.fill();

    // tekerler
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(-9, 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 3, 5, 0, Math.PI * 2); ctx.fill();

    // jant çizgisi (dönme hissi)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.4;
    const cs = Math.cos(spin) * 3.2, sn = Math.sin(spin) * 3.2;
    ctx.beginPath(); ctx.moveTo(-9 - cs, 3 - sn); ctx.lineTo(-9 + cs, 3 + sn); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10 - cs, 3 - sn); ctx.lineTo(10 + cs, 3 + sn); ctx.stroke();

    ctx.restore();
  },

  // Yuvarlak dikdörtgen (ctx.roundRect her tarayıcıda yok — elle çiziliyor)
  _rrect(ctx, x, y, w, h, q) {
    ctx.beginPath();
    ctx.moveTo(x + q, y);
    ctx.lineTo(x + w - q, y);
    ctx.arcTo(x + w, y, x + w, y + q, q);
    ctx.lineTo(x + w, y + h - q);
    ctx.arcTo(x + w, y + h, x + w - q, y + h, q);
    ctx.lineTo(x + q, y + h);
    ctx.arcTo(x, y + h, x, y + h - q, q);
    ctx.lineTo(x, y + q);
    ctx.arcTo(x, y, x + q, y, q);
    ctx.closePath();
  },

  _asamaMetni(p) {
    if (p >= 0.999) return this.BITTI_METNI;
    const A = this.ASAMALAR;
    let m = A[0][1];
    for (let i = 0; i < A.length; i++) if (p >= A[i][0]) m = A[i][1];
    return m;
  },

  // ==========================================================================
  // Ana çizim
  // ==========================================================================
  draw(ctx, W, H, dt) {
    if (!this._started) this.reset();

    // ── Zaman: DUVAR SAATİ (kare hızından bağımsız) ──
    const simdi = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
    const t = Math.max(0, (simdi - this._t0) / 1000);
    // Kareler arası GERÇEK fark; 0.1 sn'de kelepçeli (sekme arkaplandayken sıçramasın).
    const d = Math.min(0.1, Math.max(0.001, (simdi - this._son) / 1000));
    this._son = simdi;
    this.t = t;

    this._boyut(W, H);

    // ── İlerleme ──
    // Zaman rampası SMOOTHSTEP (başta ve sonda yavaş → ani sıçrama yok),
    // gerçek yükleme sinyaliyle TAVANLANIR, sonra üstel yumuşatmadan geçer.
    const z = Math.max(0, Math.min(1, t / (this.MIN_TIME * 0.90)));
    const rampa = z * z * (3 - 2 * z);
    const tgt = Math.min(rampa, this._target());
    this._prog += (tgt - this._prog) * Math.min(1, 6.0 * d);
    if (this._prog > 0.999) this._prog = 1;
    if (this._prog < 0) this._prog = 0;
    const p = this._prog;

    // ── Bitiş kararı (çıkış fade'ini başlatır) ──
    if (!this.done && !this._cikis && p >= 1 && t >= this.MIN_TIME) {
      this._cikisBaslat(this.CIKIS_FADE, simdi);
    }

    // ── Gökyüzü (önbellekli) ──
    try {
      ctx.fillStyle = this._g('gok_' + W + 'x' + H, () => {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0.00, '#0d1430');
        g.addColorStop(0.28, '#1d2a55');
        g.addColorStop(0.52, '#3b4a76');
        g.addColorStop(0.76, '#c0714a');
        g.addColorStop(1.00, '#f0a35e');
        return g;
      });
      ctx.fillRect(0, 0, W, H);
    } catch (e) {}

    // ── Yıldızlar (üst yarı, titreşimli) ──
    try {
      const ys = this._yildiz || [];
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < ys.length; i++) {
        const s = ys[i];
        const a = 0.16 + 0.30 * (0.5 + 0.5 * Math.sin(t * s.hz + s.ph));
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } catch (e) { ctx.globalAlpha = 1; }

    // ── Güneş parıltısı (önbellekli + hafif nabız) ──
    try {
      const sunY = H * 0.66;
      ctx.save();
      ctx.globalAlpha = 0.86 + 0.14 * Math.sin(t * 1.15);
      ctx.fillStyle = this._g('gun_' + W + 'x' + H, () => {
        const g = ctx.createRadialGradient(W * 0.5, sunY, 0, W * 0.5, sunY, H * 0.32);
        g.addColorStop(0.0, 'rgba(255,220,150,0.58)');
        g.addColorStop(0.5, 'rgba(255,196,118,0.22)');
        g.addColorStop(1.0, 'rgba(255,190,110,0)');
        return g;
      });
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } catch (e) {}

    // ── Süzülen ışık huzmesi (yavaş, düşük alfa — ekran patlamasın) ──
    try {
      const bandW = Math.max(48, W * 0.16);
      const gecis = ((t * 0.13) % 1.45) - 0.22;   // -0.22 … 1.23
      const bx = gecis * (W + bandW * 2) - bandW;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.30;
      ctx.translate(bx, 0);
      ctx.rotate(-0.40);
      ctx.fillStyle = this._g('huzme_' + W + 'x' + H, () => {
        const g = ctx.createLinearGradient(0, 0, bandW, 0);
        g.addColorStop(0.0, 'rgba(255,225,170,0)');
        g.addColorStop(0.5, 'rgba(255,232,190,0.13)');
        g.addColorStop(1.0, 'rgba(255,225,170,0)');
        return g;
      });
      ctx.fillRect(0, -H, bandW, H * 3);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    } catch (e) {
      try { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; } catch (e2) {}
    }

    // ── Ufuk ışıması (önbellekli) ──
    try {
      ctx.fillStyle = this._g('ufuk_' + W + 'x' + H, () => {
        const g = ctx.createLinearGradient(0, H * 0.58, 0, H * 0.80);
        g.addColorStop(0, 'rgba(255,170,90,0)');
        g.addColorStop(1, 'rgba(255,150,70,0.18)');
        return g;
      });
      ctx.fillRect(0, H * 0.58, W, H * 0.24);
    } catch (e) {}

    // ── Tepeler (uzak → yakın, farklı hızlarda kayar: paralaks) ──
    try {
      this._drawHills(ctx, W, H, H * 0.70, H * 0.055, 2.1, 'rgba(60,70,105,0.75)', 0.6, t * 3.0);
      this._drawHills(ctx, W, H, H * 0.79, H * 0.070, 1.5, 'rgba(38,46,72,0.90)', 2.1, t * 7.5);
      this._drawHills(ctx, W, H, H * 0.90, H * 0.055, 1.1, '#1b2138', 3.6, t * 15.0);
    } catch (e) {}

    // ── Yükselen toz zerreleri ──
    try {
      const tz = this._toz || [];
      ctx.fillStyle = '#ffe6b8';
      for (let i = 0; i < tz.length; i++) {
        const q = tz[i];
        q.y -= q.hz * H * d;
        if (q.y < -4) { q.y = H + 4; q.x = (q.x + 37.7) % W; }
        ctx.globalAlpha = q.a * (0.55 + 0.45 * Math.sin(t * 1.7 + q.ph));
        ctx.beginPath();
        ctx.arc(q.x + Math.sin(t * 0.8 + q.ph) * 6, q.y, q.rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } catch (e) { ctx.globalAlpha = 1; }

    // ── Logo (hafif salınım + gölge) ──
    const big = this._fnt(H, W, 0.105, 0.115, 26, 84);
    const logoY = H * 0.34 + Math.sin(t * 1.35) * big * 0.045;
    try {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = this._g('logo_' + W + 'x' + H, () => {
        const yy = H * 0.34;
        const g = ctx.createLinearGradient(0, yy - big * 0.62, 0, yy + big * 0.62);
        g.addColorStop(0.00, '#fff3c4');
        g.addColorStop(0.50, '#ffc93c');
        g.addColorStop(1.00, '#e08b1e');
        return g;
      });
      ctx.font = '800 ' + Math.round(big) + 'px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('AHMET', W * 0.5, logoY, W * 0.86);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      const sub = this._fnt(H, W, 0.030, 0.032, 11, 26);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '600 ' + Math.round(sub) + 'px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('HILL RACING', W * 0.5, logoY + big * 0.74, W * 0.80);
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) {} }

    // ── İlerleme çubuğu ──
    const barW = Math.min(W * 0.62, 420);
    const barH = Math.max(8, Math.min(14, H * 0.020));
    const barX = (W - barW) / 2;
    const barY = H * 0.80;
    const rad = barH / 2;

    try {
      // yuva
      this._rrect(ctx, barX, barY, barW, barH, rad);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // dolum
      ctx.save();
      this._rrect(ctx, barX, barY, barW, barH, rad);
      ctx.clip();
      ctx.fillStyle = this._g('bar_' + W + 'x' + H, () => {
        const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        g.addColorStop(0.0, '#ff9a2e');
        g.addColorStop(0.5, '#ffc04a');
        g.addColorStop(1.0, '#ffe9a0');
        return g;
      });
      const dolu = Math.max(barH, barW * p);
      ctx.fillRect(barX, barY, dolu, barH);

      // içeride süzülen parıltı (kayan highlight)
      const sw = Math.max(30, barW * 0.22);
      const sx = barX + (((t * 0.42) % 1) * (barW + sw)) - sw;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      ctx.translate(sx, 0);
      ctx.fillStyle = this._g('pariltı_' + W + 'x' + H, () => {
        const g = ctx.createLinearGradient(0, 0, sw, 0);
        g.addColorStop(0.0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.34)');
        g.addColorStop(1.0, 'rgba(255,255,255,0)');
        return g;
      });
      ctx.fillRect(0, barY, sw, barH);
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // ince kademe çizgileri (dolu kısmın üstünde)
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        const gx = barX + (barW * i) / 10;
        ctx.beginPath(); ctx.moveTo(gx, barY); ctx.lineTo(gx, barY + barH); ctx.stroke();
      }
      ctx.restore();
    } catch (e) {
      try { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.restore(); } catch (e2) {}
    }

    // ── Çubuk üstünde zıplayan araç + toz ──
    try {
      const carX = barX + Math.max(0, Math.min(barW, barW * p));
      const carS = Math.max(0.55, Math.min(1.0, W / 900));
      const zipla = Math.abs(Math.sin(p * Math.PI * 7)) * barH * 0.55;
      const egim = Math.cos(p * Math.PI * 7) * 0.10;
      // arkada bırakılan toz
      ctx.fillStyle = 'rgba(255,230,190,0.30)';
      for (let i = 1; i <= 3; i++) {
        const dx = carX - i * 9 * carS;
        if (dx <= barX) break;
        ctx.globalAlpha = 0.26 / i;
        ctx.beginPath();
        ctx.arc(dx, barY - barH * 0.10 + Math.sin(t * 6 + i) * 1.5, (2.2 + i) * carS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this._drawCar(ctx, carX, barY - barH * 0.35 - zipla, carS, t * 9, egim);
    } catch (e) { ctx.globalAlpha = 1; }

    // ── Aşama metni (çubuğun ÜSTÜNDE) ──
    // ⚠ TEK BAŞINA çizilir; yüzde AYRI fillText (i18n TAM EŞLEŞME yolu için).
    try {
      const fs = this._fnt(H, W, 0.026, 0.030, 11, 20);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255,246,224,0.92)';
      ctx.font = '600 ' + Math.round(fs) + 'px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText(this._asamaMetni(p), W * 0.5, barY - barH * 0.9, W * 0.86);
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) {} }

    // ── Yüzde (çubuğun ALTINDA) ──
    try {
      const fp = this._fnt(H, W, 0.024, 0.028, 10, 18);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.font = '700 ' + Math.round(fp) + 'px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('%' + Math.round(p * 100), W * 0.5, barY + barH + fp * 0.55, W * 0.40);
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) {} }

    // ── "DOKUNARAK GEÇ" ipucu KALDIRILDI (31 Tmz, kullanıcı isteği) ──
    // Dokunmak artık atlamıyor (bkz. `handleClick`), dolayısıyla bu ipucu
    // YALAN BİLGİ olurdu. Metniyle birlikte silindi; `ATLA_METNI`/`ATLA_FADE`
    // sabitleri ve çeviri kaydı da kaldırıldı (ölü kod bırakılmadı).

    // ── Vinyet (önbellekli) ──
    try {
      ctx.fillStyle = this._g('vinyet_' + W + 'x' + H, () => {
        const g = ctx.createRadialGradient(
          W * 0.5, H * 0.5, Math.min(W, H) * 0.34,
          W * 0.5, H * 0.5, Math.max(W, H) * 0.74);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.42)');
        return g;
      });
      ctx.fillRect(0, 0, W, H);
    } catch (e) {}

    // ── Fade in / out (EN SON çizilir) ──
    let cikisOran = 0;
    try {
      let ka = 0;
      if (t < this.GIRIS_FADE) ka = 1 - t / this.GIRIS_FADE;
      if (this._cikis) {
        cikisOran = Math.max(0, Math.min(1, ((simdi - this._cikisT0) / 1000) / this._cikisSure));
        ka = Math.max(ka, cikisOran);
      }
      if (ka > 0.001) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ka);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    } catch (e) { try { ctx.restore(); } catch (e2) {} }

    // ── Kapanış ──
    // 1) Çıkış fade'i doldu → menüye geç.
    if (this._cikis && cikisOran >= 1) { this._finish(); return; }
    // 2) Çıkış fade'i bir sebeple ilerlemediyse 1,5 sn'de SERT kes.
    if (this._cikis && (simdi - this._cikisT0) > 1500) { this._finish(); return; }
    // 3) MUTLAK güvenlik ağı: süre dolduysa her hâlükârda menüye geç.
    if (t >= this.MAX_TIME) { this._finish(); return; }
  },

  _cikisBaslat(sure, simdi) {
    if (this.done || this._cikis) return;
    this._cikis = true;
    this._cikisSure = Math.max(0.05, sure || this.CIKIS_FADE);
    this._cikisT0 = (typeof simdi === 'number' && simdi > 0)
      ? simdi
      : ((typeof Date !== 'undefined' && Date.now) ? Date.now() : 0);
  },

  // 🔴 31 Tmz (KULLANICI İSTEĞİ) — YÜKLEME EKRANINDA DOKUNMAK ARTIK ATLAMAZ.
  // Eskiden tek dokunuş `_cikisBaslat(ATLA_FADE)` ile ekranı kapatıyordu, ikinci
  // dokunuş anında bitiriyordu. Oyuncu yükleme sırasında ekrana yanlışlıkla
  // basınca giriş kesiliyordu. Artık ekran YALNIZCA iki yoldan kapanır:
  //   1) yükleme gerçekten bitti (ilerleme 1.0 + MIN_TIME doldu)
  //   2) MAX_TIME güvenlik ağı (15 sn) — yükleme asılı kalırsa
  //
  // ⚠ DİNLEYİCİ KALDIRILMADI, çünkü tarayıcılar ses bağlamını ancak GERÇEK bir
  //   kullanıcı hareketiyle açar (autoplay politikası). Dokunuş sesin kilidini
  //   açar ama yükleme akışına KARIŞMAZ. `handleClick` silinirse ilk sesler
  //   menüye kadar çıkmaz.
  // ⚠ `ui.js:5345` bu fonksiyonu çağırıp `return null` yapıyor — yani dokunuş
  //   arkadaki menü butonlarına da SIZMAZ. O davranış korunuyor.
  handleClick(x, y) {
    if (this.done) return null;
    try {
      // ⚠ `typeof Audio` tarayıcının KENDİ Audio sınıfında da true döner;
      //   `.resume` kontrolü oyunun Audio modülünü ayırt eder.
      if (typeof Audio !== 'undefined' && Audio.resume) Audio.resume();
    } catch (e) {}
    return null;
  },

  _finish() {
    if (this.done) return;
    this.done = true;
    this._cikis = false;
    if (this._sessiz) return;               // selfTest simülasyonu
    try {
      if (typeof Audio !== 'undefined' && Audio.resume) Audio.resume();
      if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick();
    } catch (e) {}
    try {
      if (typeof UI !== 'undefined' && UI.goTo) UI.goTo('menu');
    } catch (e) {}
  },

  // ==========================================================================
  // selfTest — ÖLÇEREK doğrular (proje standardı: {..., allPass})
  // ==========================================================================
  selfTest() {
    const r = { modul: 'Intro' };
    // Durumu sakla, sonunda geri yükle (canlı yükleme ekranını bozmamak için).
    const yedek = {
      t: this.t, done: this.done, _started: this._started, _prog: this._prog,
      _t0: this._t0, _son: this._son, _cikis: this._cikis, _cikisT0: this._cikisT0,
      _cikisSure: this._cikisSure, _gr: this._gr, _grW: this._grW, _grH: this._grH,
      _grYeni: this._grYeni, _toz: this._toz, _yildiz: this._yildiz
    };
    try {
      // 1) Süre ayarları tutarlı mı?
      r.sureUzun = (this.MIN_TIME >= 5.0);
      r.guvenlikAgiOrantili = (this.MAX_TIME >= this.MIN_TIME * 2);
      r.fadeMakul = (this.GIRIS_FADE > 0 && this.CIKIS_FADE > 0 &&
                     this.MIN_TIME > this.GIRIS_FADE + this.CIKIS_FADE);

      // 2) Aşamalar: en az 5 tane, artan eşik, boş metin yok
      let artan = this.ASAMALAR.length >= 5;
      for (let i = 0; i < this.ASAMALAR.length; i++) {
        if (!this.ASAMALAR[i][1]) artan = false;
        if (i > 0 && !(this.ASAMALAR[i][0] > this.ASAMALAR[i - 1][0])) artan = false;
      }
      r.asamalarSirali = artan;
      r.asamaSonu = (this._asamaMetni(1) === this.BITTI_METNI) &&
                    (this._asamaMetni(0) === this.ASAMALAR[0][1]);

      // 3) Her aşama metninin EN ve DE karşılığı var mı?
      let ceviriTam = true;
      for (let i = 0; i < this.ASAMALAR.length; i++) {
        const c = this._CEVIRI[this.ASAMALAR[i][1]];
        if (!c || !c[0] || !c[1]) ceviriTam = false;
      }
      if (!this._CEVIRI[this.BITTI_METNI]) ceviriTam = false;
      r.ceviriTam = ceviriTam;
      // Ölü çeviri kalmadı mı? (ATLA_METNI kaldırıldı — kaydı da gitmeli)
      r.oluCeviriYok = Object.keys(this._CEVIRI).every((k) =>
        k === this.BITTI_METNI || this.ASAMALAR.some((a) => a[1] === k));

      // 4) GRADIENT ÖNBELLEĞİ: ısınmadan sonra kare başına YENİ gradient 0 mı?
      const ctx = this._sahteCtx();
      this._sessiz = true;
      this.reset();
      this._t0 = Date.now();
      this.draw(ctx, 800, 480, 0.016);        // ısınma karesi
      const once = this._grYeni;
      for (let k = 0; k < 12; k++) this.draw(ctx, 800, 480, 0.016);
      r.gradientOnbellegi = (this._grYeni === once);
      r.gradientSayisi = once;

      // 5) Bitiş garantisi: MAX_TIME dolunca done=true (asılı kalmıyor)
      this.reset();
      this._t0 = Date.now() - (this.MAX_TIME + 1) * 1000;
      this.draw(ctx, 800, 480, 0.016);
      r.maxTimeKapaniyor = (this.done === true);

      // 6) 🔴 DOKUNMAK ATLAMAMALI (31 Tmz kullanıcı isteği — KİLİT).
      //    Bu kontrol, atlama davranışı ileride yanlışlıkla geri gelirse KALDI verir.
      this.reset();
      this.draw(ctx, 800, 480, 0.016);
      this.handleClick(10, 10);
      const cikisBasladiMi = (this._cikis === true);
      const bittiMi1 = (this.done === true);
      this.handleClick(10, 10);              // ikinci dokunuş da bir şey yapmamalı
      this.handleClick(10, 10);              // üçüncü de
      r.dokunmaAtlamaz = (!cikisBasladiMi && !bittiMi1 &&
                          this._cikis === false && this.done === false);

      // 6b) Hiç çizim yapılmadan dokunmak da bitirmemeli (eski `_started` yolu).
      this.reset();
      this.handleClick(10, 10);
      r.cizimsizDokunmaAtlamaz = (this.done === false && this._cikis === false);

      // 6c) ...ama YÜKLEME BİTİNCE ekran yine de kapanabilmeli (asılı kalmasın).
      //     Dokunmayı kapatırken çıkış yolunu da kapatmadığımızın kanıtı.
      this.reset();
      this._t0 = Date.now() - (this.MAX_TIME + 1) * 1000;
      this.draw(ctx, 800, 480, 0.016);
      r.yuklemeBitinceKapaniyor = (this.done === true);
    } catch (e) {
      r.hata = String(e && e.message ? e.message : e);
    }
    // Durumu geri yükle
    this._sessiz = false;
    for (const k in yedek) if (Object.prototype.hasOwnProperty.call(yedek, k)) this[k] = yedek[k];

    let allPass = !r.hata;
    for (const k in r) {
      if (!Object.prototype.hasOwnProperty.call(r, k)) continue;
      if (typeof r[k] === 'boolean' && r[k] === false) allPass = false;
    }
    r.allPass = allPass;
    return r;
  },

  // selfTest için minimal canvas taklidi (gerçek canvas'a bağımlı olmasın).
  _sahteCtx() {
    const grad = { addColorStop: function () {} };
    const c = {
      canvas: { width: 0, height: 0 },
      save: function () {}, restore: function () {},
      beginPath: function () {}, closePath: function () {},
      moveTo: function () {}, lineTo: function () {}, arc: function () {},
      arcTo: function () {}, rect: function () {},
      fill: function () {}, stroke: function () {}, clip: function () {},
      fillRect: function () {}, strokeRect: function () {},
      translate: function () {}, scale: function () {}, rotate: function () {},
      setTransform: function () {}, resetTransform: function () {},
      fillText: function () {}, strokeText: function () {},
      measureText: function () { return { width: 10 }; },
      createLinearGradient: function () { return grad; },
      createRadialGradient: function () { return grad; }
    };
    return c;
  }
};

if (typeof window !== 'undefined') window.Intro = Intro;
if (typeof module !== 'undefined' && module.exports) module.exports = Intro;
