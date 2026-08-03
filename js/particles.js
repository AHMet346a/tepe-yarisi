'use strict';
// ════════════════════════════════════════════════════════════════════════════
// GradyanDeposu — PAYLASILAN, TAVANLI GRADIENT ONBELLEGI  (31 Tmz, PERF)
// ════════════════════════════════════════════════════════════════════════════
// NEDEN BURADA: `js/particles.js` index.html'de hud.js / renderer.js /
//   environment.js'ten ONCE yuklenir. Ucu de bu depoyu kullanir; baska yere
//   koyulursa yukleme sirasi kirilir.
//
// OLCUM (port-araclari/olc-ctx-render.js, 3 harita x 100 kare, 390x844):
//   kare basina uretilen gradient 72 / 91 / 83 idi. Benzetim, uretilen
//   gradientlerin **%76,5'inin ONCEKI KARELERLE BIREBIR AYNI** oldugunu
//   gosterdi (ayni tip + ayni koordinat + ayni renk duraklari).
//   Her gradient bir nesne + N adet addColorStop cagrisi = cop = GC = takilma.
//
// GORUNTU DEGISMEZ: CanvasGradient koordinatlari KULLANICI UZAYINDADIR ve
//   boyama anindaki CTM ile donusturulur. Bu yuzden ayni (tip, koordinat,
//   duraklar) uclusu her zaman ayni pikseli verir; nesneyi yeniden kullanmak
//   yeniden yaratmakla BIREBIR AYNI sonucu uretir.
//
// 🔴 TAVAN SART: animasyonlu cagri yerleri (yaricapi sin() ile degisen vb.)
//   her karede YENI anahtar uretir. Tavan olmazsa Map sinirsiz buyur =
//   bellek sizintisi. Tavan asilinca depo BOSALTILIR (sabit anahtarlar
//   bir sonraki karede yeniden kurulur — en fazla bir karelik ek maliyet).
//
// 🔴 DEPO ctx BASINADIR (`ctx.__grDepo`). Bir baglamda uretilen gradient'i
//   baska baglamda kullanmak tarayicilarda tanimsiz davranistir; ayrica
//   off-screen canvas'lar kendi deposunu alir.
//
// ⚠ `duraklar` DUZ dizidir: [offset, renk, offset, renk, ...]. Ic ice dizi
//   kullanma — cagri basina fazladan nesne ayirir (tam kacindigimiz sey).
// ⚠ Sabit duraklari modul duzeyinde bir sabite tasi; boylece cagri basina
//   dizi ayirmasi da sifirlanir.
const GradyanDeposu = {
  _TAVAN: 384,
  _isabet: 0, _kacir: 0, _bosaltma: 0,

  _depo(ctx) {
    let d = ctx.__grDepo;
    if (d === undefined) { d = new Map(); ctx.__grDepo = d; }
    return d;
  },

  _anahtar(bas, duraklar) {
    let k = bas;
    for (let i = 0; i < duraklar.length; i += 2) k += '|' + duraklar[i] + ':' + duraklar[i + 1];
    return k;
  },

  // 🔴 ÖLÇÜM NOTU(31 Tmz) — BURADA "yarısını at" TAHLİYESİ DENENDİ ve GERİ ALINDI.
  //   Canlı ölçüm (ULTRA, 200 kare): isabet %49,0 → %48,6 · gradyan/kare
  //   49,5 → 49,2 · tahliye 13 → 25. Yani ÖLÇÜLEBİLİR FAYDA YOK.
  //   SEBEP: ıskalamaların kaynağı tahliye politikası DEĞİL, ANAHTARIN KENDİSİ.
  //   Anahtar MUTLAK koordinat içeriyor (`x0,y0,x1,y1`); kamerayla kayan
  //   dünya-uzayı gradyanları her karede YENİ anahtar üretir → hangi tahliye
  //   kullanılırsa kullanılsın ASLA isabet edemezler.
  // ▶ GERÇEK ÇÖZÜM (yapılmadı, ölçülü öneri): gradyanı yerel uzayda üret
  //   (`createLinearGradient(0,0, x1-x0, y1-y0)`) ve doldurmadan önce
  //   `ctx.translate(x0,y0)` uygula. Sonuç piksel piksel aynı, anahtar ise
  //   konumdan BAĞIMSIZ olur → bu 25 ıskalama/kare sıfıra iner.
  //   Etkilenen çağrı yerleri (ölçüldü): renderer.js:1195 (6,0/kare) ·
  //   environment.js:1872 (4,0) · renderer.js:775 (3,0) + 5 tekil yer.
  //   ⚠ Kazanç küçüktür (~25 nesne/kare); asıl darboğaz DOLGU ORANI (bkz. §8B.33).
  _kur(d, k, g, duraklar) {
    for (let i = 0; i < duraklar.length; i += 2) g.addColorStop(duraklar[i], duraklar[i + 1]);
    if (d.size >= this._TAVAN) { d.clear(); this._bosaltma++; }
    d.set(k, g);
    this._kacir++;
    return g;
  },

  lin(ctx, x0, y0, x1, y1, duraklar) {
    const d = this._depo(ctx);
    const k = this._anahtar('L' + x0 + ',' + y0 + ',' + x1 + ',' + y1, duraklar);
    const v = d.get(k);
    if (v !== undefined) { this._isabet++; return v; }
    return this._kur(d, k, ctx.createLinearGradient(x0, y0, x1, y1), duraklar);
  },

  rad(ctx, x0, y0, r0, x1, y1, r1, duraklar) {
    const d = this._depo(ctx);
    const k = this._anahtar('R' + x0 + ',' + y0 + ',' + r0 + ',' + x1 + ',' + y1 + ',' + r1, duraklar);
    const v = d.get(k);
    if (v !== undefined) { this._isabet++; return v; }
    return this._kur(d, k, ctx.createRadialGradient(x0, y0, r0, x1, y1, r1), duraklar);
  },

  bosalt(ctx) { if (ctx && ctx.__grDepo) ctx.__grDepo.clear(); },

  istat() {
    const t = this._isabet + this._kacir;
    return { isabet: this._isabet, kacir: this._kacir, bosaltma: this._bosaltma,
             oran: t ? this._isabet / t : 0 };
  },

  selfTest() {
    const r = {};
    try {
      const cv = document.createElement('canvas');
      cv.width = 8; cv.height = 8;
      const c = cv.getContext('2d');
      const D = [0, '#000', 1, '#fff'];
      const a = this.lin(c, 0, 0, 0, 10, D);
      const b = this.lin(c, 0, 0, 0, 10, D);
      r.ayniIstekAyniNesne = (a === b);                       // onbellek CALISIYOR
      const e = this.lin(c, 0, 0, 0, 11, D);
      r.farkliKoordFarkliNesne = (e !== a);                   // anahtar koordinati iceriyor
      const f = this.lin(c, 0, 0, 0, 10, [0, '#000', 1, '#eee']);
      r.farkliRenkFarkliNesne = (f !== a);                    // anahtar renkleri iceriyor
      const g1 = this.rad(c, 0, 0, 0, 0, 0, 5, D);
      const g2 = this.rad(c, 0, 0, 0, 0, 0, 5, D);
      r.radOnbellek = (g1 === g2);
      r.linRadCakismaz = (g1 !== a);                          // 'L' / 'R' oneki ayirir
      // TAVAN: sinirsiz buyume OLMAMALI
      const onceBos = this._bosaltma;
      for (let i = 0; i < this._TAVAN + 40; i++) this.lin(c, 0, 0, 0, 1000 + i, D);
      r.tavanUyguluyor = (c.__grDepo.size <= this._TAVAN) && (this._bosaltma > onceBos);
      // ayri ctx -> ayri depo
      const cv2 = document.createElement('canvas'); cv2.width = 8; cv2.height = 8;
      const c2 = cv2.getContext('2d');
      const h = this.lin(c2, 0, 0, 0, 10, D);
      r.ctxBasinaDepo = (h !== a);
    } catch (e) { r.hata = false; }
    r.allPass = Object.keys(r).every(k => k === 'allPass' || r[k] === true);
    return r;
  }
};
if (typeof window !== 'undefined') window.GradyanDeposu = GradyanDeposu;

// ── Particle System ────────────────────────────────────────────────────────
// All particles stored in world coordinates.
// draw(ctx) is called INSIDE camera.apply(ctx), so draw at world coords directly.
const Particles = {
  pool: [],
  maxParticles: 450,

  init() { this.pool = []; this._serbest.length = 0; },

  // ── Nesne geri donusumu (engine.js ObjectPool deseni, PERF 31 Tmz) ───────
  // `spawn()` her cagrida YENI nesne ayiriyordu. Yogun sahnede saniyede
  // yuzlerce spawn = surekli cop = GC duraklamasi = telefonda takilma.
  // Artik olen parcaciklarin nesneleri `_serbest` listesinde saklanip yeniden
  // DOLDURULUYOR. Parcacik SAYISI, omru, rengi, sirasi DEGISMEZ — yalnizca
  // bellek ayirma kalkar.
  //
  // 🔴 GERI DONUSUM SOZLESMESI — yalniz `_ps: true` etiketli nesneler:
  //   Bu dosyada 78 ayri yerde `this.pool.push({...})` ile DOGRUDAN nesne
  //   itiliyor ve bunlarin alan kumesi FARKLI (`wobble`, `wobbleSpeed`,
  //   `w`, `h`...). Boyle bir nesne geri donusturulup `spawn()`e verilirse
  //   ESKI ALANLARI uzerinde KALIR; `update()` icindeki
  //   `if (p.wobble !== undefined)` dali yanlis tetiklenir ve duman parcacigi
  //   kar tanesi gibi savrulur. Etiketsiz nesne serbest listeye ALINMAZ.
  // 🔴 `spawn()`in dondurdugu nesneye DISARIDAN yeni alan EKLEME — silinmez.
  //   (Kod tabaninda boyle bir kullanim yok; dogrula-perf.js kilitliyor.)
  _serbest: [],
  _SERBEST_TAVAN: 600,

  _birak(p) {
    if (p && p._ps === true && this._serbest.length < this._SERBEST_TAVAN) this._serbest.push(p);
  },

  spawn(x, y, config) {
    // Hard cap: recycle oldest until strictly under the cap (while, not if,
    // so the pool can never exceed maxParticles even after an external overgrow).
    while (this.pool.length >= this.maxParticles) this._birak(this.pool.shift());
    let p = this._serbest.pop();
    if (p === undefined) {
      p = {
        _ps: true,
        x, y,
        vx: config.vx || 0,
        vy: config.vy || 0,
        life: config.life || 1.0,
        maxLife: config.life || 1.0,
        size: config.size || 5,
        endSize: config.endSize !== undefined ? config.endSize : 0,
        color: config.color || '#888',
        gravity: config.gravity !== undefined ? config.gravity : 200,
        alpha: config.alpha || 1.0,
        rotation: config.rotation || 0,
        rotVel: config.rotVel || 0,
        drag: config.drag || 0.97,
        type: config.type || 'circle',
        glow: config.glow || 0,
        glowColor: config.glowColor || null
      };
    } else {
      // ⚠ HER alan yeniden yazilmali — biri unutulursa onceki parcacigin
      //   degeri sizar (sessiz gorsel hata). Sira yukaridaki literalle AYNI.
      p.x = x; p.y = y;
      p.vx = config.vx || 0;
      p.vy = config.vy || 0;
      p.life = config.life || 1.0;
      p.maxLife = config.life || 1.0;
      p.size = config.size || 5;
      p.endSize = config.endSize !== undefined ? config.endSize : 0;
      p.color = config.color || '#888';
      p.gravity = config.gravity !== undefined ? config.gravity : 200;
      p.alpha = config.alpha || 1.0;
      p.rotation = config.rotation || 0;
      p.rotVel = config.rotVel || 0;
      p.drag = config.drag || 0.97;
      p.type = config.type || 'circle';
      p.glow = config.glow || 0;
      p.glowColor = config.glowColor || null;
    }
    this.pool.push(p);
    return p;
  },

  spawnBurst(x, y, count, config) {
    const qs = (typeof Quality !== 'undefined' && Quality.particleScale) || 1;
    count = Math.max(1, Math.round(count * qs));
    for (let i = 0; i < count; i++) {
      const angle = config.angle !== undefined
        ? config.angle + (Math.random() - 0.5) * (config.spread || Math.PI * 2)
        : Math.random() * Math.PI * 2;
      const speed = (config.speed || 80) * (0.5 + Math.random() * 0.5);
      this.spawn(x, y, {
        ...config,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (config.upBias || 0)
      });
    }
  },

  // ── Emission helpers ──────────────────────────────────────────────────────
  exhaust(x, y, vehicleType, intensity) {
    if (intensity < 0.1 || Math.random() > 0.55) return;
    const colors = vehicleType === 'tractor'
      ? ['#222', '#333', '#111'] : ['#777', '#999', '#555'];
    this.spawn(x, y, {
      vx: (Math.random() - 0.5) * 25,
      vy: -35 - Math.random() * 30,
      life: 0.55 + Math.random() * 0.35,
      size: 5 + intensity * 5,
      endSize: 18 + intensity * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: -15,
      alpha: 0.45,
      drag: 0.94
    });
  },

  wheelDust(x, y, surfaceType, speed) {
    if (Math.abs(speed) < 40 || Math.random() > 0.45) return;
    const colors = {
      dirt:'#8B6914', grass:'#4a7c22', sand:'#c8a84b',
      snow:'#e8f0ff', mud:'#3d2b1f', water:'#4a90d9', ice:'#b0d8ff'
    };
    const color = colors[surfaceType] || '#888';
    this.spawnBurst(x, y - 4, 2, {
      speed: Math.abs(speed) * 0.12, angle: -Math.PI * 0.5,
      spread: Math.PI * 0.7, life: 0.4,
      size: 3 + Math.random() * 4, endSize: 8,
      color, gravity: -40, upBias: 25, drag: 0.93
    });
  },

  coinEffect(x, y) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    // Golden glow flash at pickup point.
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.28, size: 4, endSize: 26,
      color: 'rgba(255,220,80,0.55)', gravity: 0, drag: 1,
      alpha: 0.75, type: 'ring', glow: 10, glowColor: '#FFE680'
    });
    // Ring of coin sparks flung outward.
    const rays = Math.max(5, Math.round(9 * ps));
    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 50 + Math.random() * 40;
      this.spawn(x, y, {
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 70,
        life: 0.55 + Math.random() * 0.25, size: 4 + Math.random() * 3, endSize: 0,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFC400', gravity: 210,
        drag: 0.95, glow: 5, glowColor: '#FFD700'
      });
    }
    // Little stars floating up.
    const stars = Math.max(3, Math.round(5 * ps));
    for (let i = 0; i < stars; i++) {
      this.spawn(x + (Math.random() - 0.5) * 16, y, {
        vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 50,
        life: 0.6 + Math.random() * 0.3, size: 3 + Math.random() * 2, endSize: 0,
        color: '#FFF3B0', gravity: 40, drag: 0.96, type: 'star',
        rotVel: (Math.random() - 0.5) * 10, glow: 6, glowColor: '#FFEE88'
      });
    }
  },

  fuelEffect(x, y) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    // Green "fuel refilled" glow flash.
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.3, size: 5, endSize: 30,
      color: 'rgba(60,230,120,0.5)', gravity: 0, drag: 1,
      alpha: 0.7, type: 'ring', glow: 12, glowColor: '#4CFF88'
    });
    // Rising green sparkles.
    const n = Math.max(6, Math.round(11 * ps));
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.9;
      const spd = 40 + Math.random() * 45;
      this.spawn(x + (Math.random() - 0.5) * 12, y, {
        vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 20,
        vy: Math.sin(angle) * spd - 20,
        life: 0.45 + Math.random() * 0.3, size: 3 + Math.random() * 3, endSize: 0,
        color: Math.random() > 0.4 ? '#3DE87A' : '#8CFFB0', gravity: -20,
        drag: 0.95, glow: 6, glowColor: '#3DE87A'
      });
    }
    // A few bright plus-shaped sparks for a "healing" feel.
    const s = Math.max(2, Math.round(4 * ps));
    for (let i = 0; i < s; i++) {
      this.spawn(x + (Math.random() - 0.5) * 10, y - Math.random() * 6, {
        vx: (Math.random() - 0.5) * 25, vy: -50 - Math.random() * 40,
        life: 0.5 + Math.random() * 0.25, size: 3, endSize: 0,
        color: '#DFFFE8', gravity: 10, drag: 0.97, type: 'star',
        rotVel: (Math.random() - 0.5) * 6, glow: 7, glowColor: '#9CFFC0'
      });
    }
  },

  landingDust(x, y, intensity) {
    this.spawnBurst(x, y, Math.floor(intensity * 12), {
      speed: intensity * 55, angle: -Math.PI / 2, spread: Math.PI,
      life: 0.5, size: 5 + intensity * 2, endSize: 13,
      color: '#c8a87a', gravity: -35, upBias: 18, drag: 0.94
    });
  },

  explosion(x, y) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const n = (base) => Math.max(2, Math.round(base * ps));
    // Bright white-hot flash core (very short, glowing).
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.1, size: 22, endSize: 4,
      color: 'rgba(255,240,190,0.9)', gravity: 0, drag: 1,
      alpha: 0.95, glow: 18, glowColor: '#FFDD88'
    });
    // Fast expanding shockwave rings.
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.22, size: 6, endSize: 70,
      color: 'rgba(255,150,40,0.6)', gravity: 0, drag: 1,
      alpha: 0.6, type: 'ring', glow: 10, glowColor: '#FF8020'
    });
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.3, size: 4, endSize: 48,
      color: 'rgba(255,90,20,0.45)', gravity: 0, drag: 1,
      alpha: 0.5, type: 'ring'
    });
    // Orange fire burst (glowing, short-lived).
    this.spawnBurst(x, y, n(20), { speed: 200, life: 0.55, size: 15, endSize: 2,
      color: '#FF4500', gravity: -90, drag: 0.9, glow: 8, glowColor: '#FF6A00' });
    // Yellow inner flames.
    this.spawnBurst(x, y, n(14), { speed: 150, life: 0.42, size: 10, endSize: 1,
      color: '#FFD24A', gravity: -70, drag: 0.9, glow: 7, glowColor: '#FFE066' });
    // Gray/black smoke that lingers and grows.
    this.spawnBurst(x, y, n(9), { speed: 90, life: 1.3, size: 18, endSize: 40,
      color: 'rgba(45,42,40,0.75)', gravity: -50, drag: 0.95 });
    this.spawnBurst(x, y, n(6), { speed: 55, life: 1.6, size: 22, endSize: 50,
      color: 'rgba(70,66,62,0.55)', gravity: -35, drag: 0.96 });
    // Spark layer 1: fine glowing embers flung out fast.
    for (let i = 0; i < n(16); i++) {
      const a = Math.random() * Math.PI * 2, s = 180 + Math.random() * 260;
      this.spawn(x, y, { vx: Math.cos(a)*s, vy: Math.sin(a)*s - 60,
        life: 0.3 + Math.random() * 0.3, size: 2.5, endSize: 0,
        color: '#FFEE88', gravity: 300, drag: 0.93, glow: 6, glowColor: '#FFD24A' });
    }
    // Spark layer 2: tumbling debris chunks.
    for (let i = 0; i < n(10); i++) {
      const a = Math.random() * Math.PI * 2, s = 90 + Math.random() * 200;
      this.spawn(x, y, { vx: Math.cos(a)*s, vy: Math.sin(a)*s - 90,
        life: 0.9 + Math.random() * 0.4, size: 4, color: '#555', gravity: 400,
        type: 'rect', rotVel: (Math.random()-0.5)*10 });
    }
  },

  snowfall(viewX, viewY, viewW, viewH) {
    if (Math.random() > 0.3) return;
    // Two depth layers: small distant flakes and larger near ones.
    const near = Math.random() > 0.65;
    const sz = near ? 2.5 + Math.random() * 2 : 1.2 + Math.random() * 1.3;
    this.spawn(viewX + Math.random() * viewW, viewY - 10, {
      vx: (Math.random() - 0.5) * (near ? 26 : 14),
      vy: (near ? 70 : 45) + Math.random() * 35,
      life: near ? 2.4 : 3.4,
      size: sz, endSize: sz,
      color: near ? 'rgba(255,255,255,0.95)' : 'rgba(220,232,255,0.7)',
      gravity: 0, drag: 0.99,
      type: near && Math.random() > 0.5 ? 'star' : 'circle',
      rotVel: near ? (Math.random() - 0.5) * 2 : 0,
      glow: near ? 3 : 0, glowColor: '#ffffff'
    });
  },

  boostTrail(x, y) {
    // Bright glowing cyan core flame (always emits — this is the main trail).
    this.spawn(x, y, {
      vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
      life: 0.26, size: 9, endSize: 0,
      color: '#7FE9FF', gravity: 0, alpha: 0.8, drag: 0.9,
      glow: 10, glowColor: '#00E5FF'
    });
    // Outer blue energy puff, softer and larger.
    if (Math.random() > 0.4) {
      this.spawn(x, y, {
        vx: (Math.random()-0.5)*30, vy: (Math.random()-0.5)*30 - 10,
        life: 0.34, size: 13, endSize: 2,
        color: '#1E90FF', gravity: -20, alpha: 0.4, drag: 0.92,
        glow: 8, glowColor: '#3AB0FF'
      });
    }
    // Occasional white-hot spark for sparkle.
    if (Math.random() > 0.7) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 50;
      this.spawn(x, y, {
        vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life: 0.2, size: 2.5, endSize: 0,
        color: '#EAFBFF', gravity: 0, alpha: 0.95, drag: 0.9,
        glow: 7, glowColor: '#B0F0FF'
      });
    }
  },

  spark(x, y, count) {
    this.spawnBurst(x, y, count || 5, { speed: 110, life: 0.22, size: 2, color: '#FFD700', gravity: 200 });
  },

  // Toprak/toz tekerden fışkırır — kahverengi kir chunk'ları + havada asılı ince toz.
  dirtKick(x, y, dir) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const n = (base) => Math.max(2, Math.round(base * ps));
    // Yatay kick yönü: dir varsayılan olarak geriye/yukarı doğru saçılım.
    const baseAng = (typeof dir === 'number') ? dir : -Math.PI * 0.5;
    // Ağır toprak parçaları — düşük, hızlı fırlar ve geri düşer.
    for (let i = 0; i < n(9); i++) {
      const a = baseAng + (Math.random() - 0.5) * Math.PI * 0.85;
      const spd = 70 + Math.random() * 120;
      const browns = ['#7a5a2e', '#8B6914', '#5e4420', '#9c7a3a'];
      this.spawn(x + (Math.random() - 0.5) * 8, y, {
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.4 + Math.random() * 0.35, size: 3 + Math.random() * 4, endSize: 1,
        color: browns[Math.floor(Math.random() * browns.length)], gravity: 420,
        drag: 0.92, type: Math.random() > 0.55 ? 'rect' : 'circle',
        rotVel: (Math.random() - 0.5) * 12
      });
    }
    // Havada asılı ince toz bulutu — büyür ve solar.
    for (let i = 0; i < n(6); i++) {
      const a = baseAng + (Math.random() - 0.5) * Math.PI * 1.1;
      const spd = 20 + Math.random() * 45;
      this.spawn(x + (Math.random() - 0.5) * 12, y - 2, {
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 12,
        life: 0.55 + Math.random() * 0.4, size: 6 + Math.random() * 5, endSize: 16 + Math.random() * 8,
        color: `rgba(150,120,80,${0.35 + Math.random() * 0.25})`, gravity: -25, drag: 0.95
      });
    }
  },

  // Su sıçraması — mavi damlalar + beyaz köpük + yayılan yüzey halkası.
  waterSplash(x, y, speed) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const n = (base) => Math.max(2, Math.round(base * ps));
    const sp = Math.abs(speed || 0);
    // Yüzeyde yayılan ince halka.
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.32, size: 5, endSize: 34 + sp * 0.1,
      color: 'rgba(140,200,255,0.5)', gravity: 0, drag: 1,
      alpha: 0.6, type: 'ring', glow: 5, glowColor: '#9CD0FF'
    });
    // Mavi su damlaları — yukarı fırlar, yerçekimiyle geri düşer.
    for (let i = 0; i < n(11); i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.95;
      const s = sp * 0.25 + 45 + Math.random() * 60;
      const blues = ['#4a90d9', '#6ab0ee', '#3d7fc4', '#88c4ff'];
      this.spawn(x + (Math.random() - 0.5) * 10, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.3, size: 2.5 + Math.random() * 3.5, endSize: 1,
        color: blues[Math.floor(Math.random() * blues.length)], gravity: 320,
        drag: 0.96, glow: 3, glowColor: '#AEE0FF'
      });
    }
    // Beyaz köpük — hafif, yavaş, büyüyerek solar.
    for (let i = 0; i < n(6); i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.7;
      const s = 25 + Math.random() * 40;
      this.spawn(x + (Math.random() - 0.5) * 8, y - 2, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10,
        life: 0.5 + Math.random() * 0.35, size: 4 + Math.random() * 4, endSize: 9 + Math.random() * 4,
        color: `rgba(240,250,255,${0.5 + Math.random() * 0.3})`, gravity: 60, drag: 0.95
      });
    }
  },

  // Metal kıvılcım patlaması — parlak sarı-beyaz kıvılcımlar dört yöne saçılır + duman izi.
  sparkBurst(x, y) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const n = (base) => Math.max(3, Math.round(base * ps));
    // Merkezde kısa parlak flaş.
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.09, size: 8, endSize: 1,
      color: 'rgba(255,250,220,0.9)', gravity: 0, drag: 1,
      alpha: 0.9, glow: 12, glowColor: '#FFF0B0'
    });
    // Hızlı, ince metal kıvılcımlar — çizgisel iz gibi (rect) yerçekimiyle düşer.
    for (let i = 0; i < n(18); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 160 + Math.random() * 240;
      const cols = ['#FFF3B0', '#FFD24A', '#FFB020', '#FFFFFF'];
      this.spawn(x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.22 + Math.random() * 0.3, size: 2 + Math.random() * 1.5, endSize: 0,
        color: cols[Math.floor(Math.random() * cols.length)], gravity: 420,
        drag: 0.93, type: 'rect', rotation: a, rotVel: 0,
        glow: 6, glowColor: '#FFE066'
      });
    }
    // İnce yükselen turuncu ısı izi.
    for (let i = 0; i < n(5); i++) {
      this.spawn(x + (Math.random() - 0.5) * 6, y, {
        vx: (Math.random() - 0.5) * 25, vy: -40 - Math.random() * 40,
        life: 0.35 + Math.random() * 0.25, size: 3 + Math.random() * 2, endSize: 8,
        color: 'rgba(90,80,70,0.5)', gravity: -30, drag: 0.95
      });
    }
  },

  // Renkli konfeti — kazanma anları için havadan yağan/patlayan kağıt parçaları.
  confetti(x, y) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const n = (base) => Math.max(6, Math.round(base * ps));
    const cols = ['#FF3B6B', '#FFD23B', '#3BD0FF', '#4CFF66', '#C64BFF', '#FF9A3B', '#FFFFFF'];
    for (let i = 0; i < n(28); i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 170;
      this.spawn(x + (Math.random() - 0.5) * 20, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
        life: 0.9 + Math.random() * 0.9, size: 4 + Math.random() * 5, endSize: 3 + Math.random() * 3,
        color: cols[Math.floor(Math.random() * cols.length)], gravity: 190,
        drag: 0.96, type: Math.random() > 0.35 ? 'rect' : 'star',
        rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14
      });
    }
  },

  // Kazanma / rekor patlaması — konfeti + parlak halkalar + yükselen yıldızlar.
  winBurst(x, y) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const n = (base) => Math.max(4, Math.round(base * ps));
    // Zengin konfeti çekirdeği.
    this.confetti(x, y);
    // Genişleyen parlak renk halkaları.
    const ringCols = ['rgba(255,210,60,0.55)', 'rgba(60,200,255,0.5)', 'rgba(255,90,140,0.5)'];
    for (let r = 0; r < 3; r++) {
      this.spawn(x, y, {
        vx: 0, vy: 0, life: 0.4 + r * 0.14, size: 6, endSize: 70 + r * 45,
        color: ringCols[r], gravity: 0, drag: 1, type: 'ring',
        alpha: 0.6 - r * 0.12, glow: 8 - r * 2, glowColor: '#FFE680'
      });
    }
    // Yükselen parlayan yıldızlar.
    for (let i = 0; i < n(12); i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;
      const s = 90 + Math.random() * 130;
      this.spawn(x + (Math.random() - 0.5) * 24, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40,
        life: 0.7 + Math.random() * 0.5, size: 5 + Math.random() * 3, endSize: 0,
        color: Math.random() > 0.5 ? '#FFEE66' : '#FFFFFF', gravity: 120,
        drag: 0.95, type: 'star', rotVel: (Math.random() - 0.5) * 8,
        glow: 7, glowColor: '#FFE680'
      });
    }
  },


  // ── Enhanced Effects ──────────────────────────────────────────────────────

  nitroFlame(x, y) {
    // Main blue-white flame burst
    this.spawnBurst(x, y, 3, {
      speed: 80, angle: Math.PI, spread: 0.4,
      life: 0.18, size: 8, endSize: 1,
      color: '#FF8800', gravity: 0, drag: 0.92, alpha: 0.9
    });
    this.spawnBurst(x, y, 2, {
      speed: 50, angle: Math.PI, spread: 0.2,
      life: 0.22, size: 5, endSize: 0.5,
      color: '#FFDD00', gravity: 0, drag: 0.94, alpha: 0.8
    });
    // Shockwave ring
    const p = {
      x, y, vx: 0, vy: 0, life: 0.12, maxLife: 0.12,
      size: 4, endSize: 24, color: 'rgba(255,160,0,0.6)',
      alpha: 0.5, gravity: 0, drag: 1, rotation: 0, rotVel: 0, type: 'ring'
    };
    this.pool.push(p);
  },

  wingGlide(x, y, vx) {
    // Trail behind wing
    this.spawnBurst(x, y, 1, {
      speed: Math.abs(vx)*0.1 + 20, angle: Math.PI, spread: 0.6,
      life: 0.3, size: 4, endSize: 0.5,
      color: '#00CCFF', gravity: -20, drag: 0.95, alpha: 0.4
    });
  },

  springBounce(x, y) {
    this.spawnBurst(x, y, 8, {
      speed: 120, angle: -Math.PI/2, spread: Math.PI*0.7,
      life: 0.5, size: 5, endSize: 1,
      color: '#00EE44', gravity: 180, drag: 0.9, alpha: 0.85
    });
    // Circular ring
    for (let ri = 0; ri < 6; ri++) {
      const ra = ri / 6 * Math.PI * 2;
      this.pool.push({
        x, y, vx: Math.cos(ra)*80, vy: Math.sin(ra)*80 - 40,
        life: 0.35, maxLife: 0.35,
        size: 4, endSize: 0.5, color: '#AAFFAA',
        alpha: 0.7, gravity: 100, drag: 0.92, rotation: 0, rotVel: 0, type: 'circle'
      });
    }
  },

  landingImpact(x, y) {
    // Heavy thud burst
    this.spawnBurst(x, y, 12, {
      speed: 160, angle: -Math.PI*0.5, spread: Math.PI*1.1,
      life: 0.6, size: 6, endSize: 0.5,
      color: '#888888', gravity: 250, drag: 0.87, alpha: 0.7
    });
    this.spawnBurst(x, y, 6, {
      speed: 90, angle: -Math.PI*0.5, spread: Math.PI*0.6,
      life: 0.3, size: 3, endSize: 0.5,
      color: '#FFD700', gravity: 200, drag: 0.9, alpha: 0.9
    });
    // Shockwave ring
    this.pool.push({
      x, y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2,
      size: 5, endSize: 50, color: 'rgba(200,200,200,0.5)',
      alpha: 0.6, gravity: 0, drag: 1, rotation: 0, rotVel: 0, type: 'ring'
    });
  },

  lavaSplash(x, y) {
    this.spawnBurst(x, y, 8, {
      speed: 140, angle: -Math.PI*0.6, spread: Math.PI*0.9,
      life: 0.7, size: 5, endSize: 1,
      color: '#FF4400', gravity: 300, drag: 0.88, alpha: 0.9
    });
    this.spawnBurst(x, y, 4, {
      speed: 80, angle: -Math.PI*0.5, spread: Math.PI*0.5,
      life: 0.4, size: 3, endSize: 0.5,
      color: '#FFAA00', gravity: 280, drag: 0.9, alpha: 0.8
    });
  },

  electricArc(x, y) {
    // Landing boost electric sparks
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.pool.push({
        x: x + Math.cos(a)*10, y,
        vx: Math.cos(a)*120, vy: Math.sin(a)*80 - 60,
        life: 0.25, maxLife: 0.25,
        size: 3, endSize: 0.2, color: '#FFEE00',
        alpha: 1, gravity: 100, drag: 0.88, rotation: 0, rotVel: Math.random()*10-5, type: 'rect'
      });
    }
    this.spawnBurst(x, y, 4, {
      speed: 60, angle: -Math.PI*0.5, spread: Math.PI*0.8,
      life: 0.18, size: 2, endSize: 0.2,
      color: '#FFFFFF', gravity: 0, drag: 0.9, alpha: 0.95
    });
  },

  moonDust(x, y, vx) {
    // Low-gravity slow moon dust
    this.spawnBurst(x, y, 3, {
      speed: Math.abs(vx)*0.08 + 15, angle: Math.PI * 0.7, spread: Math.PI * 0.5,
      life: 2.0, size: 2, endSize: 0.5,
      color: '#aaaacc', gravity: 30, drag: 0.98, alpha: 0.5
    });
  },

  lavaGround(x, y) {
    // Particles when wheels touch lava surface
    this.spawnBurst(x, y, 2, {
      speed: 40, angle: -Math.PI*0.5, spread: Math.PI*0.5,
      life: 0.4, size: 4, endSize: 1,
      color: '#FF6600', gravity: 60, drag: 0.95, alpha: 0.7
    });
  },

  coinsSparkle(x, y) {
    // Fancy coin collection sparkle
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2;
      this.pool.push({
        x, y, vx: Math.cos(a)*60, vy: Math.sin(a)*60-30,
        life: 0.6, maxLife: 0.6,
        size: 4, endSize: 0.5, color: '#FFD700',
        alpha: 1, gravity: 80, drag: 0.92, rotation: 0, rotVel: Math.random()*8, type: 'rect'
      });
    }
    this.pool.push({
      x, y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25,
      size: 3, endSize: 20, color: 'rgba(255,220,50,0.6)',
      alpha: 0.7, gravity: 0, drag: 1, rotation: 0, rotVel: 0, type: 'ring'
    });
  },

  // ── Update & Draw ─────────────────────────────────────────────────────────
  update(dt) {
    // Guard/clamp the frame delta: skip bad frames (NaN/negative), and cap large
    // spikes (e.g. after a tab-switch) so particles can't teleport far in one step.
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (dt > 0.1) dt = 0.1;
    // PERF(31 Tmz): olen HER parcacik icin `splice(i,1)` cagriliyordu.
    //   `splice` O(n) bellek kaydirmasidir; 450'lik havuzda kare basina onlarca
    //   olum = on binlerce isaretci kaydirmasi (sicak dongude).
    //   Artik TEK GECISLI SIKISTIRMA: yasayanlar AYNI SIRAYLA basa yazilir,
    //   dizi bir kez kisaltilir. Toplam maliyet kac olum olursa olsun O(n).
    // 🔴 SONDAN-TAKAS (swap-remove) KULLANILMADI: o yontem O(1) ama diziyi
    //   YENIDEN SIRALAR; parcaciklar cizim sirasina gore ust uste biner, yani
    //   katman sirasi = GORUNTU degisir. Sikistirma sirayi birebir korur.
    // ⚠ Ileri yonlu gezinme guvenli: her parcacigin guncellemesi bagimsizdir.
    const pool = this.pool;
    const n = pool.length;
    let w = 0;
    for (let i = 0; i < n; i++) {
      const p = pool[i];
      p.life -= dt;
      if (p.life <= 0) { this._birak(p); continue; }
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.rotation += p.rotVel * dt;
      // NaN/Infinity guard: a bad emitter (undefined gravity/drag/vel, div-by-zero,
      // etc.) can produce non-finite position/velocity. Drop such particles so a
      // single corrupt entry can't poison the pool or the renderer.
      if (!Number.isFinite(p.x)  || !Number.isFinite(p.y) ||
          !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
        continue;   // bozuk parcacik: serbest listeye ALINMAZ (alanlari kirli)
      }
      pool[w++] = p;
    }
    pool.length = w;
  },

  // IMPORTANT: called inside camera.apply(ctx), so draw at WORLD coords directly.
  // Do NOT use camera.worldToScreen — it would double-transform.
  draw(ctx) {
    for (const p of this.pool) {
      // Skip corrupt/missing positions so a bad particle can't throw or smear the canvas.
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const _ml = p.maxLife || p.life || 1;
      const t = 1 - p.life / _ml;
      const _es = (p.endSize !== undefined) ? p.endSize : (p.size || 3);  // eski emitter'lar için varsayılan
      const size  = Math.max(0.5, (p.size || 3) + (_es - (p.size || 3)) * t);
      if (!Number.isFinite(size)) continue;               // guard non-finite radius
      let alpha = ((p.alpha !== undefined) ? p.alpha : 1) * (p.life / _ml);
      if (!Number.isFinite(alpha)) continue;              // guard non-finite alpha
      if (alpha < 0) alpha = 0; else if (alpha > 1) alpha = 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      // PERF(31 Tmz): eskiden HER parcacik icin hem fillStyle hem strokeStyle
      //   atanirdi. Oysa yalniz `ring` tipi `stroke()` cagirir, digerlerinin
      //   hepsi `fill()` cagirir — yani parcacik basina bir renk atamasi
      //   TAMAMEN kullanilmadan cope gidiyordu. Her atama bir CSS renk
      //   ayristirmasi demek; yogun sahnede kare basina ~500 gereksiz ayristirma.
      //   Cizilen piksel AYNI: kullanilmayan durum piksele dokunmaz.
      const _renk = p.color || '#888';                    // fallback for missing color
      if (p.type === 'ring') ctx.strokeStyle = _renk;
      else                   ctx.fillStyle   = _renk;
      // Optional additive glow (opt-in via p.glow). Numeric = blur radius,
      // `true` falls back to a soft default. Fades as the particle dies.
      if (p.glow) {
        ctx.shadowColor = p.glowColor || p.color;
        ctx.shadowBlur  = (p.glow === true ? 8 : p.glow) * (1 - t * 0.4);
      }
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      if (p.type === 'rect') {
        ctx.fillRect(-size * 0.5, -size * 0.3, size, size * 0.6);
      } else if (p.type === 'ring') {
        ctx.lineWidth = Math.max(0.5, 2 * (1 - t));
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        // 4-point star spark
        ctx.beginPath();
        for (let sp = 0; sp < 8; sp++) {
          const sa = sp * Math.PI * 0.25;
          const sr = sp % 2 === 0 ? size : size * 0.4;
          sp === 0 ? ctx.moveTo(Math.cos(sa)*sr, Math.sin(sa)*sr)
                   : ctx.lineTo(Math.cos(sa)*sr, Math.sin(sa)*sr);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
,
  // === Weather Effects ===
  rainDrop(x, y, intensity) {
    intensity = intensity || 1;
    const count = Math.floor(8 * intensity);
    for (let i = 0; i < count; i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 400,
        y: y - 200 + Math.random() * 50,
        vx: -2 - Math.random() * 3,
        vy: 8 + Math.random() * 6,
        life: 1, maxLife: 0.4 + Math.random() * 0.3,
        color: 'rgba(150,180,220,0.6)',
        size: 1, type: 'rect',
        w: 1, h: 8 + Math.random() * 6,
        gravity: 0, drag: 0
      });
    }
  },

  snowFlake(x, y, intensity) {
    intensity = intensity || 1;
    const count = Math.floor(5 * intensity);
    for (let i = 0; i < count; i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 500,
        y: y - 150 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 1.5 - 0.5,
        vy: 1.5 + Math.random() * 2,
        life: 1, maxLife: 2 + Math.random() * 2,
        color: 'rgba(220,235,255,0.75)',
        size: 2 + Math.random() * 4, type: 'star',
        gravity: 0.01, drag: 0.98,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.08
      });
    }
  },

  ashCloud(x, y) {
    for (let i = 0; i < 4; i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 100,
        y: y - Math.random() * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: -1.5 - Math.random() * 2,
        life: 1, maxLife: 1.5 + Math.random() * 1.5,
        color: `rgba(80,70,60,${0.3 + Math.random() * 0.3})`,
        size: 10 + Math.random() * 20, type: 'circle',
        gravity: -0.02, drag: 0.97
      });
    }
  },

  sandStorm(x, y, wind) {
    wind = wind || 1;
    for (let i = 0; i < 6; i++) {
      this.pool.push({
        x: x + Math.random() * 300 * wind,
        y: y - Math.random() * 80,
        vx: -3 * wind - Math.random() * 4,
        vy: (Math.random() - 0.5) * 1,
        life: 1, maxLife: 0.5 + Math.random() * 0.5,
        color: `rgba(210,180,120,${0.3 + Math.random() * 0.4})`,
        size: 1.5 + Math.random() * 3, type: 'circle',
        gravity: 0, drag: 0.99
      });
    }
  },

  bubbleTrail(x, y) {
    for (let i = 0; i < 4; i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1 - Math.random() * 2,
        life: 1, maxLife: 0.8 + Math.random() * 0.8,
        color: `rgba(180,220,255,${0.4 + Math.random() * 0.3})`,
        size: 3 + Math.random() * 6, type: 'ring',
        gravity: -0.05, drag: 0.98
      });
    }
  },

  // === Impact / Terrain Effects ===
  dustCloud(x, y, size) {
    size = size || 1;
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1,
        life: 1, maxLife: 0.6 + Math.random() * 0.6,
        color: `rgba(180,160,130,${0.4 + Math.random() * 0.3})`,
        size: (8 + Math.random() * 14) * size, type: 'circle',
        gravity: -0.02, drag: 0.97
      });
    }
  },

  mudSplatter(x, y) {
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI + Math.random() * Math.PI;
      const spd = 2 + Math.random() * 6;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        life: 1, maxLife: 0.5 + Math.random() * 0.4,
        color: `rgba(80,60,40,${0.6 + Math.random() * 0.4})`,
        size: 3 + Math.random() * 7, type: Math.random() > 0.5 ? 'circle' : 'rect',
        w: 4 + Math.random() * 6, h: 4 + Math.random() * 6,
        gravity: 0.25, drag: 0.95
      });
    }
  },

  iceChunk(x, y) {
    for (let i = 0; i < 7; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3,
        life: 1, maxLife: 0.7 + Math.random() * 0.5,
        color: `rgba(${180 + Math.random()*60},${210 + Math.random()*40},255,${0.5 + Math.random()*0.4})`,
        size: 4 + Math.random() * 8, type: 'rect',
        w: 4 + Math.random() * 8, h: 3 + Math.random() * 5,
        gravity: 0.2, drag: 0.96, rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15
      });
    }
  },

  sandPuff(x, y) {
    for (let i = 0; i < 6; i++) {
      this.pool.push({
        x: x + (Math.random()-0.5)*20, y,
        vx: (Math.random()-0.5)*2,
        vy: -1 - Math.random()*3,
        life: 1, maxLife: 0.5 + Math.random()*0.4,
        color: `rgba(210,190,140,${0.4+Math.random()*0.3})`,
        size: 8 + Math.random()*14, type: 'circle',
        gravity: 0.02, drag: 0.97
      });
    }
  },

  snowPuff(x, y) {
    for (let i = 0; i < 8; i++) {
      this.pool.push({
        x: x + (Math.random()-0.5)*20, y,
        vx: (Math.random()-0.5)*3,
        vy: -2 - Math.random()*3,
        life: 1, maxLife: 0.6 + Math.random()*0.5,
        color: `rgba(230,240,255,${0.5+Math.random()*0.4})`,
        size: 6 + Math.random()*12, type: 'circle',
        gravity: 0.01, drag: 0.97
      });
    }
  },

  // === Vehicle Effects ===
  turboBoost(x, y, dir) {
    dir = dir || -1;
    for (let i = 0; i < 12; i++) {
      const ang = Math.PI + (Math.random()-0.5)*0.6;
      const spd = 4 + Math.random()*8;
      this.pool.push({
        x, y: y + (Math.random()-0.5)*8,
        vx: Math.cos(ang)*spd*dir,
        vy: Math.sin(ang)*spd + (Math.random()-0.5)*3,
        life: 1, maxLife: 0.3 + Math.random()*0.3,
        color: i < 4 ? '#FFFFFF' : (i < 8 ? '#88CCFF' : '#FF8800'),
        size: 4 + Math.random()*8, type: 'circle',
        gravity: 0.05, drag: 0.94
      });
    }
    // Central shockwave ring
    this.pool.push({
      x, y, vx: 0, vy: 0,
      life: 1, maxLife: 0.25,
      color: 'rgba(100,200,255,0.7)',
      size: 5, type: 'ring',
      gravity: 0, drag: 1, growRate: 2.5
    });
  },

  engineSmoke(x, y, load) {
    load = load || 0.5;
    for (let i = 0; i < Math.ceil(load * 3); i++) {
      this.pool.push({
        x: x + (Math.random()-0.5)*6, y,
        vx: (Math.random()-0.5)*1.5 - 1,
        vy: -0.5 - Math.random()*1.5,
        life: 1, maxLife: 0.8 + Math.random()*0.8,
        color: `rgba(${60+Math.floor(load*40)},${50+Math.floor(load*30)},${40+Math.floor(load*20)},${0.3+load*0.3})`,
        size: 8 + Math.random()*12, type: 'circle',
        gravity: -0.05, drag: 0.97
      });
    }
  },

  sparks(x, y, count) {
    count = count || 8;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        life: 1, maxLife: 0.3 + Math.random() * 0.4,
        color: Math.random() > 0.5 ? '#FFD700' : '#FF8800',
        size: 1.5 + Math.random() * 2, type: 'circle',
        gravity: 0.15, drag: 0.96
      });
    }
  },

  metalScrape(x, y) {
    for (let i = 0; i < 6; i++) {
      this.pool.push({
        x, y: y + Math.random()*6,
        vx: (Math.random()-0.5)*3 - 2,
        vy: -1 - Math.random()*2,
        life: 1, maxLife: 0.2 + Math.random()*0.2,
        color: Math.random() > 0.5 ? '#FFD700' : '#FF6600',
        size: 1 + Math.random()*2, type: 'circle',
        gravity: 0.1, drag: 0.95
      });
    }
  },

  // === UI / Reward Effects ===
  rankUp(x, y) {
    // Big burst
    for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2;
      const spd = 3 + Math.random() * 8;
      const colors = ['#FFD700','#FFA500','#FF6B6B','#00CCFF','#44FF44','#FF44FF'];
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        life: 1, maxLife: 0.8 + Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8, type: Math.random() > 0.5 ? 'star' : 'circle',
        gravity: 0.1, drag: 0.96
      });
    }
    // Rings
    for (let r = 0; r < 3; r++) {
      this.pool.push({
        x, y, vx: 0, vy: 0,
        life: 1, maxLife: 0.5 + r * 0.2,
        color: '#FFD700',
        size: 5 + r * 10, type: 'ring',
        gravity: 0, drag: 1, growRate: 3 + r * 1.5
      });
    }
  },

  diamondCollect(x, y) {
    for (let i = 0; i < 15; i++) {
      const ang = (i / 15) * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3,
        life: 1, maxLife: 0.5 + Math.random() * 0.5,
        color: Math.random() > 0.5 ? '#00CCFF' : '#AA88FF',
        size: 3 + Math.random() * 5, type: 'star',
        gravity: 0.08, drag: 0.97
      });
    }
  },

  // === Map-specific effects ===
  lavaDroplet(x, y) {
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI * 0.7 + Math.random() * Math.PI * 0.6;
      const spd = 2 + Math.random() * 5;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        life: 1, maxLife: 0.4 + Math.random() * 0.4,
        color: Math.random() > 0.5 ? '#FF3300' : '#FF8800',
        size: 4 + Math.random() * 7, type: 'circle',
        gravity: 0.2, drag: 0.96
      });
    }
  },

  moonDustBurst(x, y) {
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1,
        life: 1, maxLife: 1.5 + Math.random() * 1.5,
        color: `rgba(200,210,230,${0.4 + Math.random() * 0.3})`,
        size: 4 + Math.random() * 8, type: 'circle',
        gravity: 0.005, drag: 0.99
      });
    }
  },

  neonSpark(x, y, col) {
    col = col || '#00FFFF';
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1,
        life: 1, maxLife: 0.3 + Math.random() * 0.3,
        color: col,
        size: 2 + Math.random() * 3, type: 'star',
        gravity: 0.05, drag: 0.97,
        glow: true
      });
    }
  },

  waterSplash(x, y) {
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI * 0.8 + Math.random() * Math.PI * 0.8;
      const spd = 3 + Math.random() * 7;
      this.pool.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3,
        life: 1, maxLife: 0.4 + Math.random() * 0.4,
        color: `rgba(100,180,255,${0.5 + Math.random() * 0.4})`,
        size: 3 + Math.random() * 7, type: 'circle',
        gravity: 0.25, drag: 0.96
      });
    }
    // Mist
    for (let i = 0; i < 4; i++) {
      this.pool.push({
        x: x + (Math.random()-0.5)*20, y,
        vx: (Math.random()-0.5)*2,
        vy: -1 - Math.random()*2,
        life: 1, maxLife: 0.6 + Math.random()*0.6,
        color: `rgba(180,220,255,${0.2+Math.random()*0.2})`,
        size: 10 + Math.random()*18, type: 'circle',
        gravity: -0.02, drag: 0.98
      });
    }
  },

  // === Physics helpers extended ===
  _update_extended(p, dt) {
    // Handle growRate for rings
    if (p.growRate) p.size += p.growRate * dt * 60;
    // Handle wobble for snowflakes
    if (p.wobble !== undefined) {
      p.wobble += p.wobbleSpeed;
      p.vx += Math.sin(p.wobble) * 0.1;
    }
    // Handle rotation
    if (p.rotSpeed) p.rot = (p.rot || 0) + p.rotSpeed;
  }

,
  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANDED PARTICLE SYSTEMS — detailed canvas 2D effects
  // ═══════════════════════════════════════════════════════════════════════════

  // Large explosion: 50+ particles, shockwave ring, debris, fire core
  fireExplosion(x, y, size, color) {
    size = size || 1;
    color = color || '#FF4500';
    const count = Math.floor(50 + size * 20);
    // Fire core burst
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (80 + Math.random() * 220) * size;
      const hue = Math.random() > 0.5 ? color : (Math.random() > 0.5 ? '#FFD700' : '#FF8C00');
      this.pool.push({
        x: x + (Math.random() - 0.5) * 10 * size,
        y: y + (Math.random() - 0.5) * 10 * size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60 * size,
        life: 1, maxLife: 0.4 + Math.random() * 0.6,
        size: (4 + Math.random() * 10) * size, endSize: 0,
        color: hue, gravity: 120 * size, drag: 0.91, type: 'circle',
        alpha: 0.9, rotation: 0, rotVel: 0
      });
    }
    // Black smoke puffs
    for (let i = 0; i < Math.floor(14 * size); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (30 + Math.random() * 80) * size;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40 * size,
        life: 1, maxLife: 0.8 + Math.random() * 0.8,
        size: (12 + Math.random() * 20) * size, endSize: (30 + Math.random() * 30) * size,
        color: `rgba(${20 + Math.floor(Math.random()*30)},${15+Math.floor(Math.random()*20)},${10+Math.floor(Math.random()*15)},0.6)`,
        gravity: -25 * size, drag: 0.96, type: 'circle',
        alpha: 0.7, rotation: 0, rotVel: 0
      });
    }
    // Debris chunks
    for (let i = 0; i < Math.floor(12 * size); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (120 + Math.random() * 300) * size;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100 * size,
        life: 1, maxLife: 0.6 + Math.random() * 0.5,
        size: (3 + Math.random() * 6) * size, endSize: 0,
        color: '#555555', gravity: 380 * size, drag: 0.89, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 15
      });
    }
    // Shockwave rings
    for (let r = 0; r < 3; r++) {
      this.pool.push({
        x, y, vx: 0, vy: 0,
        life: 1, maxLife: 0.25 + r * 0.1,
        size: 5 * size, endSize: (80 + r * 40) * size,
        color: `rgba(255,${150 - r * 30},0,0.5)`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 0.6 - r * 0.15, rotation: 0, rotVel: 0
      });
    }
    // Sparks
    for (let i = 0; i < Math.floor(20 * size); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (200 + Math.random() * 400) * size;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80 * size,
        life: 1, maxLife: 0.2 + Math.random() * 0.3,
        size: (1.5 + Math.random() * 2) * size, endSize: 0,
        color: '#FFEE88', gravity: 300 * size, drag: 0.93, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Rocket exhaust flame — dense, layered with heat shimmer
  rocketExhaust(x, y, angle, power, t) {
    t = t || 0;
    power = Math.max(0, Math.min(1, power || 0.5));
    if (Math.random() > 0.7 - power * 0.4) return;
    const spread = 0.18 + (1 - power) * 0.15;
    const exhaustAngle = angle + Math.PI;
    // Core white-hot flame
    for (let i = 0; i < Math.ceil(power * 5); i++) {
      const a = exhaustAngle + (Math.random() - 0.5) * spread * 0.5;
      const spd = (120 + power * 200) * (0.7 + Math.random() * 0.6);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.08 + Math.random() * 0.07,
        size: 5 + power * 8, endSize: 0,
        color: '#FFFFFF', gravity: 0, drag: 0.93, type: 'circle',
        alpha: 0.9, rotation: 0, rotVel: 0
      });
    }
    // Inner blue core
    for (let i = 0; i < Math.ceil(power * 4); i++) {
      const a = exhaustAngle + (Math.random() - 0.5) * spread * 0.8;
      const spd = (90 + power * 160) * (0.6 + Math.random() * 0.8);
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.12 + Math.random() * 0.1,
        size: 8 + power * 12, endSize: 1,
        color: `hsl(${190 + Math.floor(Math.random() * 40)},100%,70%)`,
        gravity: 0, drag: 0.94, type: 'circle',
        alpha: 0.8, rotation: 0, rotVel: 0
      });
    }
    // Outer orange plume
    for (let i = 0; i < Math.ceil(power * 6); i++) {
      const a = exhaustAngle + (Math.random() - 0.5) * spread * 1.5;
      const spd = (50 + power * 100) * (0.5 + Math.random() * 1.0);
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.18 + Math.random() * 0.15,
        size: 10 + power * 16, endSize: 20 + power * 20,
        color: `hsl(${20 + Math.floor(Math.random() * 20)},100%,${50 + Math.floor(Math.random() * 20)}%)`,
        gravity: -8, drag: 0.95, type: 'circle',
        alpha: 0.6, rotation: 0, rotVel: 0
      });
    }
    // Soot particles
    for (let i = 0; i < Math.ceil(power * 3); i++) {
      const a = exhaustAngle + (Math.random() - 0.5) * spread * 2;
      const spd = (20 + power * 60) * (0.5 + Math.random() * 0.8);
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.4 + Math.random() * 0.5,
        size: 6 + power * 10, endSize: 20 + power * 25,
        color: `rgba(30,25,20,0.5)`,
        gravity: -10, drag: 0.97, type: 'circle',
        alpha: 0.5, rotation: 0, rotVel: 0
      });
    }
  },

  // Tire smoke — color varies by surface type
  tireSmoke(x, y, wheelSpeed, surfaceType, t) {
    t = t || 0;
    wheelSpeed = Math.abs(wheelSpeed || 0);
    if (wheelSpeed < 30 || Math.random() > 0.6) return;
    const intensity = Math.min(1, wheelSpeed / 200);
    let r = 130, g = 130, b = 130;
    if (surfaceType === 'mud') { r = 60; g = 45; b = 30; }
    else if (surfaceType === 'sand') { r = 200; g = 175; b = 120; }
    else if (surfaceType === 'snow') { r = 220; g = 235; b = 255; }
    else if (surfaceType === 'grass') { r = 100; g = 140; b = 70; }
    const count = Math.floor(2 + intensity * 5);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
      const spd = (20 + intensity * 60) * (0.5 + Math.random() * 0.7);
      const alpha = 0.25 + intensity * 0.35;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 15,
        vy: Math.sin(a) * spd - intensity * 20,
        life: 1, maxLife: 0.5 + intensity * 0.6,
        size: 6 + intensity * 12, endSize: 18 + intensity * 22,
        color: `rgba(${r},${g},${b},${alpha.toFixed(2)})`,
        gravity: -12 - intensity * 10, drag: 0.96, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 2
      });
    }
  },

  // Tire mark — draws black skid mark rectangle on the road
  tireMark(ctx, x, y, angle, intensity) {
    if (!ctx) return;
    intensity = Math.max(0, Math.min(1, intensity || 0.5));
    const w = 8 + intensity * 4;
    const len = 6 + intensity * 10;
    ctx.save();
    ctx.globalAlpha = intensity * 0.55;
    ctx.fillStyle = `rgb(${Math.floor(10 + (1 - intensity) * 30)},${Math.floor(8 + (1 - intensity) * 22)},${Math.floor(6 + (1 - intensity) * 15)})`;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillRect(-len * 0.5, -w * 0.5, len, w);
    // Inner tread detail
    if (intensity > 0.5) {
      ctx.globalAlpha = intensity * 0.25;
      ctx.fillStyle = '#000000';
      for (let i = 0; i < 3; i++) {
        const ix = -len * 0.5 + (i / 3) * len;
        ctx.fillRect(ix, -w * 0.5, 1.5, w);
      }
    }
    ctx.restore();
  },

  // Mud explosion — clumps and droplets with brown/dark colors
  mudExplosion(x, y, speed) {
    speed = speed || 80;
    const intensity = Math.min(1, speed / 150);
    const count = Math.floor(8 + intensity * 18);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (30 + Math.random() * 120) * intensity;
      const brown = Math.floor(30 + Math.random() * 40);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 40 * intensity,
        life: 1, maxLife: 0.4 + Math.random() * 0.5,
        size: 3 + Math.random() * 8, endSize: Math.random() * 3,
        color: `rgb(${brown + 30},${brown},${Math.floor(brown * 0.6)})`,
        gravity: 300, drag: 0.92, type: Math.random() > 0.6 ? 'rect' : 'circle',
        alpha: 0.85, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 10
      });
    }
    // Splash ring
    this.pool.push({
      x, y, vx: 0, vy: 0,
      life: 1, maxLife: 0.2,
      size: 5, endSize: 30 + speed * 0.3,
      color: 'rgba(70,50,30,0.5)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 0.7, rotation: 0, rotVel: 0
    });
    // Splatter blobs
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 30;
      this.pool.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 5,
        vy: -5 - Math.random() * 10,
        life: 1, maxLife: 0.8 + Math.random() * 0.6,
        size: 2 + Math.random() * 5, endSize: 1,
        color: `rgba(55,38,22,0.75)`,
        gravity: 200, drag: 0.96, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Water splash — droplets + mist layers
  waterSplashEx(x, y, speed, angle) {
    speed = Math.abs(speed || 60);
    angle = angle || -Math.PI * 0.5;
    const intensity = Math.min(1, speed / 200);
    // Main droplets
    const count = Math.floor(10 + intensity * 20);
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * Math.PI * 0.9;
      const spd = (50 + Math.random() * 150) * (0.4 + intensity * 0.8);
      const blue = Math.floor(140 + Math.random() * 80);
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 30 * intensity,
        life: 1, maxLife: 0.3 + Math.random() * 0.4,
        size: 2 + Math.random() * 5, endSize: 0,
        color: `rgba(60,${blue},255,0.75)`,
        gravity: 280, drag: 0.93, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // Foam/mist puffs
    for (let i = 0; i < Math.floor(5 + intensity * 8); i++) {
      const a = angle + (Math.random() - 0.5) * Math.PI * 0.6;
      const spd = (20 + Math.random() * 50) * (0.3 + intensity * 0.5);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 1, maxLife: 0.6 + Math.random() * 0.5,
        size: 8 + intensity * 15, endSize: 20 + intensity * 30,
        color: `rgba(190,220,255,0.25)`,
        gravity: -12, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // Surface ring
    this.pool.push({
      x, y, vx: 0, vy: 0,
      life: 1, maxLife: 0.3,
      size: 4, endSize: 40 + intensity * 50,
      color: `rgba(100,180,255,0.45)`,
      gravity: 0, drag: 1, type: 'ring',
      alpha: 0.6, rotation: 0, rotVel: 0
    });
  },

  // Snow powder cloud — light, fluffy, drifting
  snowPowder(x, y, speed) {
    speed = Math.abs(speed || 50);
    const intensity = Math.min(1, speed / 120);
    const count = Math.floor(6 + intensity * 14);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.9;
      const spd = (15 + Math.random() * 45) * (0.4 + intensity * 0.7);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * spd + (Math.random() - 0.5) * 20,
        vy: Math.sin(angle) * spd - 25 * intensity,
        life: 1, maxLife: 0.7 + Math.random() * 0.8,
        size: 5 + Math.random() * 12, endSize: 12 + Math.random() * 20,
        color: `rgba(${220 + Math.floor(Math.random()*30)},${230 + Math.floor(Math.random()*20)},255,0.45)`,
        gravity: -8, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // Fine crystal sparks
    for (let i = 0; i < Math.floor(3 + intensity * 5); i++) {
      const angle = Math.random() * Math.PI * 2;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * (20 + Math.random() * 40) * intensity,
        vy: Math.sin(angle) * (20 + Math.random() * 40) * intensity - 30,
        life: 1, maxLife: 0.3 + Math.random() * 0.3,
        size: 2, endSize: 0,
        color: 'rgba(255,255,255,0.9)',
        gravity: 30, drag: 0.96, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 8
      });
    }
  },

  // Sand blast — coarse and fine particles, wind-driven
  sandBlast(x, y, speed, wind) {
    speed = Math.abs(speed || 60);
    wind = wind || 0;
    const intensity = Math.min(1, speed / 150);
    const count = Math.floor(8 + intensity * 16);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.7 + wind * 0.3;
      const spd = (30 + Math.random() * 90) * (0.4 + intensity * 0.8);
      const goldV = Math.floor(160 + Math.random() * 55);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * spd + wind * 30,
        vy: Math.sin(angle) * spd - 20 * intensity,
        life: 1, maxLife: 0.3 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 5, endSize: 0,
        color: `rgb(${goldV},${Math.floor(goldV * 0.86)},${Math.floor(goldV * 0.55)})`,
        gravity: 200, drag: 0.94, type: 'circle',
        alpha: 0.8, rotation: 0, rotVel: 0
      });
    }
    // Dust cloud
    for (let i = 0; i < Math.floor(3 + intensity * 5); i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y - Math.random() * 10,
        vx: (Math.random() - 0.5) * 25 + wind * 40,
        vy: -10 - Math.random() * 25 * intensity,
        life: 1, maxLife: 0.6 + Math.random() * 0.6,
        size: 10 + intensity * 18, endSize: 25 + intensity * 30,
        color: `rgba(210,185,130,0.35)`,
        gravity: -5, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Lava spatter — glowing red/orange droplets
  lavaSpatter(x, y, t) {
    t = t || 0;
    if (Math.random() > 0.55) return;
    const count = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.8 + Math.random() * Math.PI * 0.8;
      const spd = 40 + Math.random() * 140;
      const hot = Math.random() > 0.4;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 30,
        life: 1, maxLife: 0.5 + Math.random() * 0.6,
        size: 3 + Math.random() * 7, endSize: 1,
        color: hot ? `hsl(${Math.floor(10 + Math.random() * 30)},100%,${Math.floor(50 + Math.random() * 30)}%)` : '#CC2200',
        gravity: 280, drag: 0.93, type: 'circle',
        alpha: 0.9, rotation: 0, rotVel: 0
      });
    }
    // Glow pulse on surface
    if (Math.random() > 0.7) {
      this.pool.push({
        x, y, vx: 0, vy: 0,
        life: 1, maxLife: 0.18,
        size: 3, endSize: 22,
        color: `rgba(255,80,0,0.4)`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 0.5, rotation: 0, rotVel: 0
      });
    }
  },

  // Electric spark — jagged, blue/white, crackling
  electricSpark(x, y, t) {
    t = t || 0;
    if (Math.random() > 0.6) return;
    const count = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 180;
      const white = Math.random() > 0.4;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 20,
        life: 1, maxLife: 0.08 + Math.random() * 0.12,
        size: 1.5 + Math.random() * 2.5, endSize: 0,
        color: white ? '#FFFFFF' : (Math.random() > 0.5 ? '#88CCFF' : '#BBDDFF'),
        gravity: 50, drag: 0.9, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 20
      });
    }
    // Arc flash
    this.pool.push({
      x, y, vx: 0, vy: 0,
      life: 1, maxLife: 0.06,
      size: 2, endSize: 18,
      color: `rgba(150,210,255,0.7)`,
      gravity: 0, drag: 1, type: 'ring',
      alpha: 0.8, rotation: 0, rotVel: 0
    });
  },

  // Coin burst — spinning golden coins flying outward
  coinBurst(x, y, amount) {
    amount = amount || 5;
    const count = Math.min(20, amount);
    const colors = ['#FFD700', '#FFC400', '#FFB800', '#FFAA00', '#DAA520'];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 60 + Math.random() * 100;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 80,
        life: 1, maxLife: 0.6 + Math.random() * 0.4,
        size: 5 + Math.random() * 3, endSize: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 280, drag: 0.95, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 18
      });
    }
    // Shine burst
    this.pool.push({
      x, y, vx: 0, vy: 0,
      life: 1, maxLife: 0.2,
      size: 4, endSize: 35 + count * 2,
      color: 'rgba(255,220,50,0.55)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 0.7, rotation: 0, rotVel: 0
    });
    // Sparkles
    for (let i = 0; i < Math.min(10, count * 2); i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 60;
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 1, maxLife: 0.25 + Math.random() * 0.2,
        size: 3, endSize: 0,
        color: '#FFEE88', gravity: 100, drag: 0.95, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 12
      });
    }
  },

  // Heart particle — achievement/love effect
  heartParticle(x, y) {
    const colors = ['#FF4466', '#FF6688', '#FF2255', '#FF8899', '#FF0044'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spd = 30 + Math.random() * 50;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 60,
        life: 1, maxLife: 0.7 + Math.random() * 0.5,
        size: 5 + Math.random() * 6, endSize: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 100, drag: 0.96, type: 'star',
        alpha: 0.9, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 4
      });
    }
    // Central heart glow
    this.pool.push({
      x, y, vx: 0, vy: -30,
      life: 1, maxLife: 0.8,
      size: 8, endSize: 2,
      color: '#FF4466', gravity: 80, drag: 0.98, type: 'circle',
      alpha: 0.85, rotation: 0, rotVel: 0
    });
    // Pink ring flash
    this.pool.push({
      x, y, vx: 0, vy: 0,
      life: 1, maxLife: 0.22,
      size: 3, endSize: 28,
      color: 'rgba(255,80,120,0.5)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 0.6, rotation: 0, rotVel: 0
    });
  },

  // Level-up burst — colorful expanding ring + confetti
  levelUpBurst(x, y, level) {
    level = level || 1;
    const colors = ['#FFD700','#FF6B6B','#00CCFF','#44FF44','#FF44FF','#FF8800','#00FFCC'];
    // Confetti burst
    for (let i = 0; i < 40 + level * 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 180;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 100,
        life: 1, maxLife: 0.8 + Math.random() * 0.8,
        size: 4 + Math.random() * 6, endSize: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: 200, drag: 0.95, type: Math.random() > 0.5 ? 'rect' : 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12
      });
    }
    // Expanding rings
    for (let r = 0; r < 4; r++) {
      this.pool.push({
        x, y, vx: 0, vy: 0,
        life: 1, maxLife: 0.35 + r * 0.12,
        size: 5, endSize: 60 + r * 40,
        color: colors[r % colors.length].replace('#', 'rgba(').replace(/(..)(..)(..)/, (_, a, b, c) =>
          `${parseInt(a, 16)},${parseInt(b, 16)},${parseInt(c, 16)}`) + ',0.5)',
        gravity: 0, drag: 1, type: 'ring',
        alpha: 0.6 - r * 0.1, rotation: 0, rotVel: 0
      });
    }
    // Star burst
    for (let i = 0; i < 10 + level; i++) {
      const a = (i / (10 + level)) * Math.PI * 2;
      const spd = 120 + Math.random() * 80;
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
        life: 1, maxLife: 0.5 + Math.random() * 0.4,
        size: 6, endSize: 0,
        color: '#FFFF00', gravity: 150, drag: 0.94, type: 'star',
        alpha: 1, rotation: 0, rotVel: 8
      });
    }
    // Altın patlama katmanı — parlak çekirdek flaş + yükselen altın kıvılcımlar (glow).
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    this.spawn(x, y, {
      vx: 0, vy: 0, life: 0.14, size: 14, endSize: 2,
      color: 'rgba(255,240,180,0.9)', gravity: 0, drag: 1,
      alpha: 0.9, glow: 16, glowColor: '#FFDD88'
    });
    const gold = Math.max(4, Math.round((10 + level) * ps));
    for (let i = 0; i < gold; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.3;
      const spd = 70 + Math.random() * 110;
      this.spawn(x + (Math.random() - 0.5) * 14, y, {
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 50,
        life: 0.6 + Math.random() * 0.4, size: 3 + Math.random() * 3, endSize: 0,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFF3B0', gravity: 140,
        drag: 0.95, type: 'star', rotVel: (Math.random() - 0.5) * 8,
        glow: 6, glowColor: '#FFD700'
      });
    }
  },

  // Critical hit — yellow stars, shockwave, screen flash
  criticalHit(x, y) {
    // Yellow star burst
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const spd = 100 + Math.random() * 150;
      this.pool.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 60,
        life: 1, maxLife: 0.4 + Math.random() * 0.4,
        size: 6 + Math.random() * 5, endSize: 0,
        color: Math.random() > 0.5 ? '#FFDD00' : '#FF8800',
        gravity: 150, drag: 0.93, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 16
      });
    }
    // Double shockwave
    for (let r = 0; r < 2; r++) {
      this.pool.push({
        x, y, vx: 0, vy: 0,
        life: 1, maxLife: 0.2 + r * 0.08,
        size: 4, endSize: 50 + r * 30,
        color: `rgba(255,${200 - r * 50},0,0.6)`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 0.7, rotation: 0, rotVel: 0
      });
    }
    // White flash center
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.pool.push({
        x, y,
        vx: Math.cos(a) * (200 + Math.random() * 100),
        vy: Math.sin(a) * (200 + Math.random() * 100),
        life: 1, maxLife: 0.12 + Math.random() * 0.1,
        size: 3, endSize: 0,
        color: '#FFFFFF', gravity: 0, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Shield impact — blue concentric waves
  shieldImpact(x, y, angle) {
    angle = angle || 0;
    // Arc of blue particles on impact side
    for (let i = 0; i < 20; i++) {
      const a = angle + (Math.random() - 0.5) * Math.PI * 0.7;
      const spd = 60 + Math.random() * 120;
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.3 + Math.random() * 0.3,
        size: 3 + Math.random() * 5, endSize: 0,
        color: Math.random() > 0.5 ? '#00AAFF' : '#88DDFF',
        gravity: 30, drag: 0.94, type: 'circle',
        alpha: 0.9, rotation: 0, rotVel: 0
      });
    }
    // Ripple rings
    for (let r = 0; r < 3; r++) {
      this.pool.push({
        x, y, vx: 0, vy: 0,
        life: 1, maxLife: 0.25 + r * 0.1,
        size: 3, endSize: 35 + r * 20,
        color: `rgba(0,${150 + r * 30},255,0.5)`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 0.65, rotation: 0, rotVel: 0
      });
    }
    // Hex-style sparks
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.pool.push({
        x, y,
        vx: Math.cos(a) * 80, vy: Math.sin(a) * 80,
        life: 1, maxLife: 0.2,
        size: 2, endSize: 0,
        color: '#CCEEFF', gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: a, rotVel: 0
      });
    }
  },

  // Nitro trail — very detailed, color-customizable
  nitroTrail(x, y, angle, power, color) {
    power = Math.max(0, Math.min(1, power || 0.7));
    color = color || '#00BBFF';
    if (Math.random() > 0.5 - power * 0.3) return;
    const exhaustAngle = angle + Math.PI;
    // Main streak
    for (let i = 0; i < Math.ceil(power * 6); i++) {
      const a = exhaustAngle + (Math.random() - 0.5) * 0.3;
      const spd = (100 + power * 150) * (0.7 + Math.random() * 0.6);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.1 + Math.random() * 0.08,
        size: 4 + power * 8, endSize: 1,
        color, gravity: 0, drag: 0.92, type: 'circle',
        alpha: 0.9, rotation: 0, rotVel: 0
      });
    }
    // Glow puffs
    for (let i = 0; i < Math.ceil(power * 4); i++) {
      const a = exhaustAngle + (Math.random() - 0.5) * 0.5;
      const spd = (40 + power * 80) * (0.5 + Math.random() * 0.8);
      this.pool.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.2 + Math.random() * 0.15,
        size: 8 + power * 14, endSize: 16 + power * 20,
        color: color.replace('#', 'rgba(').replace(/(..)(..)(..)/, (_, a2, b, c) =>
          `${parseInt(a2, 16)},${parseInt(b, 16)},${parseInt(c, 16)}`) + ',0.3)',
        gravity: -5, drag: 0.96, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // White hot core
    this.pool.push({
      x, y,
      vx: Math.cos(exhaustAngle) * (80 + power * 120),
      vy: Math.sin(exhaustAngle) * (80 + power * 120),
      life: 1, maxLife: 0.06,
      size: 3 + power * 5, endSize: 0,
      color: '#FFFFFF', gravity: 0, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0
    });
  },

  // Engine smoke puff — temperature-driven color
  engineSmokePuff(x, y, rpm, temp) {
    rpm = rpm || 1000;
    temp = temp || 80;
    if (Math.random() > 0.4) return;
    const rpmNorm = Math.min(1, rpm / 8000);
    const tempNorm = Math.min(1, temp / 120);
    // Color: white (cold) -> grey (warm) -> black (overheating)
    let r, g, b, a;
    if (tempNorm < 0.4) {
      r = 220; g = 220; b = 220; a = 0.35;
    } else if (tempNorm < 0.75) {
      const t2 = (tempNorm - 0.4) / 0.35;
      r = Math.floor(220 - t2 * 150); g = r; b = r; a = 0.4;
    } else {
      const t2 = (tempNorm - 0.75) / 0.25;
      r = Math.floor(70 - t2 * 50); g = r; b = r; a = 0.5;
    }
    const count = Math.floor(1 + rpmNorm * 3);
    for (let i = 0; i < count; i++) {
      this.pool.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 18,
        vy: -(8 + rpmNorm * 20) - Math.random() * 12,
        life: 1, maxLife: 0.7 + Math.random() * 0.7,
        size: 6 + rpmNorm * 8, endSize: 18 + rpmNorm * 18,
        color: `rgba(${r},${g},${b},${a.toFixed(2)})`,
        gravity: -6, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 1.5
      });
    }
  },

  // Exhaust soot — gritty carbonaceous particles
  exhaustSoot(x, y, thr, t) {
    thr = Math.max(0, Math.min(1, thr || 0.5));
    t = t || 0;
    if (thr < 0.2 || Math.random() > 0.5) return;
    const count = Math.floor(1 + thr * 3);
    for (let i = 0; i < count; i++) {
      const darkVal = Math.floor(15 + Math.random() * 35);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 14 - 2,
        vy: -(5 + thr * 18) - Math.random() * 8,
        life: 1, maxLife: 0.5 + Math.random() * 0.6,
        size: 4 + thr * 6, endSize: 12 + thr * 14,
        color: `rgba(${darkVal},${Math.floor(darkVal * 0.9)},${Math.floor(darkVal * 0.8)},0.55)`,
        gravity: -4, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 2
      });
    }
  },

  // Ground dust — surface-type variations
  groundDust(x, y, speed, surfaceType) {
    speed = Math.abs(speed || 0);
    if (speed < 20 || Math.random() > 0.5) return;
    const intensity = Math.min(1, speed / 180);
    const surfaceColors = {
      dirt:  { r: 140, g: 110, b: 70 },
      grass: { r: 90,  g: 130, b: 55 },
      sand:  { r: 210, g: 185, b: 125 },
      snow:  { r: 220, g: 235, b: 255 },
      mud:   { r: 65,  g: 50,  b: 32 },
      rock:  { r: 130, g: 120, b: 110 },
      ice:   { r: 180, g: 210, b: 245 },
      lava:  { r: 200, g: 60,  b: 10 },
      water: { r: 80,  g: 150, b: 220 },
      moon:  { r: 170, g: 175, b: 190 }
    };
    const sc = surfaceColors[surfaceType] || surfaceColors.dirt;
    const count = Math.floor(2 + intensity * 6);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.8;
      const spd = (20 + intensity * 55) * (0.5 + Math.random() * 0.7);
      this.pool.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 15 * intensity,
        life: 1, maxLife: 0.35 + intensity * 0.45,
        size: 5 + intensity * 10, endSize: 12 + intensity * 18,
        color: `rgba(${sc.r},${sc.g},${sc.b},${(0.3 + intensity * 0.35).toFixed(2)})`,
        gravity: -8, drag: 0.96, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Wind particles — ambient drifting streaks
  windParticles(x, y, W, H, windSpeed, windDir) {
    windSpeed = windSpeed || 50;
    windDir = windDir || 0;
    if (Math.random() > 0.4) return;
    const count = 2 + Math.floor(windSpeed / 40);
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * W;
      const py = y + Math.random() * H;
      const a = windDir + (Math.random() - 0.5) * 0.4;
      const spd = windSpeed * (0.5 + Math.random() * 0.8);
      const alpha = 0.1 + Math.random() * 0.2;
      this.pool.push({
        x: px, y: py,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1, maxLife: 0.8 + Math.random() * 1.0,
        size: 1.5 + Math.random() * 2.5, endSize: 0,
        color: `rgba(200,210,225,${alpha.toFixed(2)})`,
        gravity: 0, drag: 0.995, type: 'circle',
        alpha: 1, rotation: a, rotVel: 0
      });
    }
  },

  // Aurora borealis — wavy bands of color across top of screen
  aurora(ctx, W, H, t) {
    if (!ctx) return;
    ctx.save();
    const bands = 4;
    for (let b = 0; b < bands; b++) {
      const hue = (120 + b * 40 + t * 10) % 360;
      const yBase = H * (0.05 + b * 0.08);
      const amplitude = 20 + Math.sin(t * 0.3 + b) * 10;
      const grad = ctx.createLinearGradient(0, yBase, 0, yBase + 60 + b * 15);
      grad.addColorStop(0, `hsla(${hue},80%,60%,0)`);
      grad.addColorStop(0.3, `hsla(${hue},80%,60%,${0.12 - b * 0.02})`);
      grad.addColorStop(0.7, `hsla(${hue + 30},70%,50%,${0.08 - b * 0.015})`);
      grad.addColorStop(1, `hsla(${hue + 30},70%,50%,0)`);
      ctx.beginPath();
      ctx.moveTo(0, yBase + Math.sin(t * 0.5) * amplitude);
      for (let px = 0; px <= W; px += 30) {
        const wave = Math.sin(t * 0.8 + px * 0.01 + b * 1.2) * amplitude
                   + Math.sin(t * 0.5 + px * 0.008 + b * 0.7) * amplitude * 0.5;
        ctx.lineTo(px, yBase + wave);
      }
      ctx.lineTo(W, yBase + 80 + b * 20);
      ctx.lineTo(0, yBase + 80 + b * 20);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.restore();
  },

  // Meteor shower — streaking fireballs with glowing trail
  meteorShower(x, y, t) {
    t = t || 0;
    if (Math.random() > 0.06) return;
    const angle = Math.PI * 0.25 + (Math.random() - 0.5) * 0.5;
    const spd = 400 + Math.random() * 300;
    const size = 2 + Math.random() * 5;
    // Lead meteor
    this.pool.push({
      x: x + Math.random() * 800 - 400,
      y: y - 50 + Math.random() * 100,
      vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
      life: 1, maxLife: 0.4 + Math.random() * 0.3,
      size: size, endSize: 0,
      color: '#FFEE88', gravity: 0, drag: 0.99, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0
    });
    // Trail
    for (let i = 0; i < 12; i++) {
      const trailAge = i / 12;
      this.pool.push({
        x: x + Math.random() * 800 - 400 - Math.cos(angle) * spd * 0.005 * i * 60,
        y: y - 50 + Math.random() * 100 - Math.sin(angle) * spd * 0.005 * i * 60,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        life: 1, maxLife: 0.15 + trailAge * 0.3,
        size: size * (1 - trailAge * 0.7), endSize: 0,
        color: `hsl(${30 + Math.floor(trailAge * 30)},100%,${70 - Math.floor(trailAge * 40)}%)`,
        gravity: 0, drag: 0.99, type: 'circle',
        alpha: 1 - trailAge * 0.5, rotation: 0, rotVel: 0
      });
    }
  },

  // Bubble stream — rising, wobbling bubbles
  bubbleStream(x, y, size, t) {
    t = t || 0;
    size = size || 1;
    if (Math.random() > 0.55) return;
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const bSize = (3 + Math.random() * 10) * size;
      const wobble = Math.random() * Math.PI * 2;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 20 * size,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.sin(wobble + t) * 8 + (Math.random() - 0.5) * 6,
        vy: -(18 + Math.random() * 20) * size,
        life: 1, maxLife: 0.8 + Math.random() * 1.0,
        size: bSize, endSize: bSize * 1.2,
        color: `rgba(150,200,255,0.25)`,
        gravity: -5, drag: 0.98, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0,
        wobble, wobbleSpeed: 0.06 + Math.random() * 0.05
      });
    }
  },

  // Jellyfish — draw animated jellyfish body with ctx
  jellyfish(ctx, x, y, t) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    // Pulsing bell
    const pulse = 1 + Math.sin(t * 2) * 0.08;
    const bellW = 28 * pulse;
    const bellH = 18 * (1 / pulse);
    const hue = (180 + Math.sin(t * 0.5) * 30) % 360;
    const grad = ctx.createRadialGradient(0, -bellH * 0.3, 0, 0, 0, bellW);
    grad.addColorStop(0, `hsla(${hue},80%,75%,0.7)`);
    grad.addColorStop(0.6, `hsla(${hue},70%,60%,0.45)`);
    grad.addColorStop(1, `hsla(${hue},60%,50%,0.1)`);
    ctx.beginPath();
    ctx.ellipse(0, 0, bellW, bellH, 0, Math.PI, 0);
    ctx.fillStyle = grad;
    ctx.fill();
    // Tentacles
    const tentacleCount = 8;
    ctx.strokeStyle = `hsla(${hue},80%,70%,0.4)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < tentacleCount; i++) {
      const tx = (i / (tentacleCount - 1) - 0.5) * 2 * bellW;
      ctx.beginPath();
      ctx.moveTo(tx, 2);
      for (let seg = 1; seg <= 8; seg++) {
        const sy = 2 + seg * 7;
        const sx = tx + Math.sin(t * 1.5 + seg * 0.8 + i * 0.5) * (4 + seg * 0.5);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  // Coral polyp — animated swaying coral tentacles
  coralPolyp(ctx, x, y, t) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    const arms = 6;
    const armLen = 14 + Math.sin(t * 0.8) * 3;
    const hue = 10 + Math.sin(t * 0.3) * 20;
    for (let i = 0; i < arms; i++) {
      const baseAngle = (i / arms) * Math.PI * 2;
      const sway = Math.sin(t * 1.2 + i * 1.1) * 0.3;
      const angle = baseAngle + sway;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const cp1x = Math.cos(angle - 0.4) * armLen * 0.5;
      const cp1y = Math.sin(angle - 0.4) * armLen * 0.5;
      const ex = Math.cos(angle) * armLen;
      const ey = Math.sin(angle) * armLen;
      ctx.quadraticCurveTo(cp1x, cp1y, ex, ey);
      ctx.strokeStyle = `hsl(${hue},85%,${50 + i * 5}%)`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      // Tip dot
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue + 30},90%,70%)`;
      ctx.fill();
    }
    // Stem
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 10);
    ctx.strokeStyle = `hsl(${hue},60%,40%)`;
    ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
  },

  // Oil slick — rainbow iridescent circle drawn with ctx
  oilSlick(ctx, x, y, radius, t) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    const steps = 36;
    for (let i = 0; i < steps; i++) {
      const a1 = (i / steps) * Math.PI * 2;
      const a2 = ((i + 1) / steps) * Math.PI * 2;
      const hue = ((i / steps) * 360 + t * 40) % 360;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, a1, a2);
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue},80%,55%,0.18)`;
      ctx.fill();
    }
    // Outer edge ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${(t * 60) % 360},70%,60%,0.3)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  },

  // Heat haze — shimmer distortion hint drawn with ctx
  heatHaze(ctx, x, y, W, t) {
    if (!ctx) return;
    ctx.save();
    const stripes = 5;
    const stripeW = W / stripes;
    for (let i = 0; i < stripes; i++) {
      const sx = x + i * stripeW;
      const shimmer = Math.sin(t * 3 + i * 1.3) * 4;
      const grad = GradyanDeposu.lin(ctx, sx, y + shimmer, sx + stripeW, y + shimmer + 40, [0, `rgba(255,200,100,0)`, 0.5, `rgba(255,210,120,${0.04 + Math.abs(Math.sin(t * 2 + i)) * 0.04})`, 1, `rgba(255,200,100,0)`]);
      ctx.fillStyle = grad;
      ctx.fillRect(sx, y + shimmer, stripeW, 42);
    }
    ctx.restore();
  },

  // Fog patch — soft semi-transparent circles
  fogPatch(x, y, density, t) {
    density = density || 0.5;
    t = t || 0;
    if (Math.random() > 0.3) return;
    const count = Math.floor(1 + density * 3);
    for (let i = 0; i < count; i++) {
      const drift = Math.sin(t * 0.4 + i) * 5;
      this.pool.push({
        x: x + (Math.random() - 0.5) * 60 + drift,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 6,
        vy: -(2 + Math.random() * 4) * density,
        life: 1, maxLife: 1.5 + Math.random() * 1.5,
        size: 20 + density * 40, endSize: 40 + density * 60,
        color: `rgba(200,210,220,${(0.06 + density * 0.08).toFixed(3)})`,
        gravity: -2, drag: 0.99, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Rain splatter — ctx-drawn ripple rings where rain hits
  rainSplatter(ctx, x, y, intensity, t) {
    if (!ctx) return;
    intensity = Math.min(1, intensity || 0.5);
    if (Math.random() > intensity * 0.6) return;
    const count = Math.floor(1 + intensity * 4);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const sx = x + (Math.random() - 0.5) * 200;
      const sy = y + (Math.random() - 0.5) * 10;
      const age = Math.random();
      const r = age * (4 + intensity * 6);
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,150,220,${(0.3 - age * 0.25).toFixed(2)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  },

  // Snow drift — horizontal particles blowing along ground
  snowDrift(ctx, x, y, W, H, t) {
    if (!ctx) return;
    ctx.save();
    const count = 12;
    for (let i = 0; i < count; i++) {
      const px = ((x + i * (W / count) + t * 30) % W + W) % W;
      const py = y + H - 20 + Math.sin(t * 1.5 + i) * 8;
      const size = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,240,255,${0.4 + Math.random() * 0.3})`;
      ctx.fill();
    }
    ctx.restore();
  },

  // Update all active particles
  _updateAll(dt) {
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.life -= dt;
      if (p.life <= 0) { this.pool.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      const dragFactor = Math.pow(p.drag || 0.97, dt * 60);
      p.vx *= dragFactor;
      p.vy *= dragFactor;
      p.rotation = (p.rotation || 0) + (p.rotVel || 0) * dt;
      if (p.growRate) p.size += p.growRate * dt * 60;
      if (p.wobble !== undefined) {
        p.wobble += p.wobbleSpeed || 0.06;
        p.vx += Math.sin(p.wobble) * 0.08;
      }
      if (p.rotSpeed !== undefined) p.rot = (p.rot || 0) + p.rotSpeed;
    }
  },

  // Draw all particles (call inside camera.apply)
  _drawAll(ctx) {
    for (const p of this.pool) {
      if (!p.maxLife || p.maxLife <= 0) continue;
      const t2 = 1 - p.life / p.maxLife;
      const size = Math.max(0.3, p.size + (p.endSize - p.size) * t2);
      const alpha = (p.alpha !== undefined ? p.alpha : 1) * (p.life / p.maxLife);
      if (alpha < 0.005) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || p.rot || 0);
      if (p.type === 'rect') {
        ctx.fillRect(-size * 0.5, -size * 0.3, size, size * 0.6);
      } else if (p.type === 'ring') {
        ctx.lineWidth = Math.max(0.4, 2 * (1 - t2));
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        ctx.beginPath();
        for (let sp = 0; sp < 8; sp++) {
          const sa = sp * Math.PI * 0.25;
          const sr = sp % 2 === 0 ? size : size * 0.4;
          sp === 0 ? ctx.moveTo(Math.cos(sa) * sr, Math.sin(sa) * sr)
                   : ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  // Set max particle pool size
  setMaxParticles(n) {
    this.maxParticles = Math.max(50, Math.min(5000, n || 450));
    while (this.pool.length > this.maxParticles) {
      this.pool.shift();
    }
  },

  // Return count of currently active particles
  getActiveCount() {
    return this.pool.length;
  },

  // Clear all particles immediately
  clearAll() {
    this.pool = [];
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS — richer procedural visuals (v2)
  // All effects push plain particle objects into this.pool and are driven by the
  // existing update()/draw() lifecycle. They respect maxParticles via _pushCapped.
  // ═══════════════════════════════════════════════════════════════════════════

  // Internal: push respecting the pool cap (mirrors spawn()'s overflow policy).
  _pushCapped(p) {
    // Hard cap: recycle oldest until strictly under the cap (while, not if,
    // guarantees this.pool.length can never exceed maxParticles).
    while (this.pool.length >= this.maxParticles) this.pool.shift();
    if (p.maxLife === undefined) p.maxLife = p.life;
    if (p.alpha === undefined) p.alpha = 1;
    this.pool.push(p);
    return p;
  },

  // Internal: how many particles we may afford right now (0..want).
  _budget(want) {
    const free = this.maxParticles - this.pool.length;
    if (free <= 0) return Math.max(0, Math.min(want, 2)); // still allow a trickle
    return Math.min(want, free);
  },

  // Richer tire smoke, color-tinted by surface, with soft billow + inner core.
  // signature: smokePlume(x, y, wheelSpeed, surfaceType, t)
  smokePlume(x, y, wheelSpeed, surfaceType, t) {
    t = t || 0;
    wheelSpeed = Math.abs(wheelSpeed || 0);
    if (wheelSpeed < 25 || Math.random() > 0.5) return;
    const intensity = Math.min(1, wheelSpeed / 220);
    let r = 150, g = 150, b = 155;
    if (surfaceType === 'mud') { r = 72; g = 54; b = 38; }
    else if (surfaceType === 'sand') { r = 208; g = 184; b = 128; }
    else if (surfaceType === 'snow') { r = 232; g = 242; b = 255; }
    else if (surfaceType === 'grass') { r = 96; g = 138; b = 66; }
    else if (surfaceType === 'lava') { r = 90; g = 60; b = 50; }
    const count = this._budget(Math.round((3 + intensity * 5) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.4;
      const spd = (18 + intensity * 55) * (0.4 + Math.random() * 0.8);
      const shade = 0.75 + Math.random() * 0.45;
      const alpha = (0.18 + intensity * 0.3) * (0.7 + Math.random() * 0.5);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 7,
        vx: Math.cos(a) * spd + Math.sin(t * 2 + i) * 10,
        vy: Math.sin(a) * spd - intensity * 24,
        life: 0.6 + intensity * 0.7 + Math.random() * 0.3,
        size: 5 + intensity * 10, endSize: 22 + intensity * 26,
        color: `rgba(${Math.floor(r * shade)},${Math.floor(g * shade)},${Math.floor(b * shade)},${alpha.toFixed(2)})`,
        gravity: -14 - intensity * 12, drag: 0.955, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.6
      });
    }
  },

  // Ambient drifting leaves carried by wind (autumn/forest flavor).
  // signature: leafGust(x, y, wind)
  leafGust(x, y, wind) {
    wind = wind || 40;
    const palette = ['#c0651e', '#d98324', '#8a9a2b', '#b23a1e', '#e0a92e', '#6f8f2a'];
    const count = this._budget(Math.round((3 + Math.floor(Math.random() * 3)) * this._ps()));
    for (let i = 0; i < count; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 60,
        y: y - Math.random() * 40,
        vx: wind * (0.5 + Math.random() * 0.8),
        vy: -8 + Math.random() * 22,
        life: 2.4 + Math.random() * 2.6,
        size: 3.5 + Math.random() * 4, endSize: 3 + Math.random() * 4,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 14, drag: 0.99, type: 'rect',
        alpha: 0.85, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 5
      });
    }
  },

  // Rolling dust gust — wide, low, translucent drifting cloud (desert/dry road).
  // signature: dustGust(x, y, wind)
  dustGust(x, y, wind) {
    wind = wind || 60;
    const count = this._budget(Math.round((4 + Math.floor(Math.random() * 4)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const shade = 190 + ((Math.random() * 40) | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 20,
        vx: wind * (0.6 + Math.random() * 0.7),
        vy: -6 - Math.random() * 14,
        life: 1.4 + Math.random() * 1.6,
        size: 12 + Math.random() * 18, endSize: 40 + Math.random() * 40,
        color: `rgba(${shade},${shade - 30},${shade - 70},0.16)`,
        gravity: -6, drag: 0.97, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 0.8
      });
    }
  },

  // Coin-collect sparkle burst — golden star flares + fine glitter + rising glow.
  // signature: coinSparkle(x, y)
  coinSparkle(x, y) {
    const stars = this._budget(Math.max(3, Math.round(7 * this._ps())));
    for (let i = 0; i < stars; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 60 + Math.random() * 90;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.45 + Math.random() * 0.4,
        size: 3 + Math.random() * 3, endSize: 0.5,
        color: Math.random() > 0.4 ? '#ffe66b' : '#fff3b0',
        gravity: 120, drag: 0.9, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 10, glowColor: '#ffd24a'
      });
    }
    // Fine drifting glitter
    const glit = this._budget(Math.round(6 * this._ps()));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 50;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 50,
        life: 0.6 + Math.random() * 0.5,
        size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: '#fffbe0',
        gravity: 40, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffe66b'
      });
    }
    // Soft rising halo
    this._pushCapped({
      x, y, vx: 0, vy: -18,
      life: 0.5, size: 6, endSize: 26,
      color: 'rgba(255,220,120,0.35)',
      gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#ffcf5a'
    });
  },

  // Nitro heat-haze — shimmering translucent bloom trailing behind a boost.
  // signature: nitroHaze(x, y, angle, power)
  nitroHaze(x, y, angle, power) {
    angle = angle === undefined ? Math.PI : angle;
    power = power === undefined ? 1 : Math.max(0, Math.min(1, power));
    if (Math.random() > 0.7) return;
    const count = this._budget(Math.round((2 + Math.floor(power * 3)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * 0.7;
      const spd = (30 + power * 70) * (0.5 + Math.random() * 0.6);
      const hot = Math.random();
      // pale blue-white shimmer fading to transparent
      const cr = 180 + (hot * 60 | 0), cg = 200 + (hot * 40 | 0), cb = 255;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 10,
        life: 0.35 + Math.random() * 0.35,
        size: 5 + power * 8, endSize: 18 + power * 20,
        color: `rgba(${cr},${cg},${cb},0.14)`,
        gravity: -18, drag: 0.93, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2,
        glow: 12, glowColor: 'rgba(160,200,255,0.5)'
      });
    }
  },

  // Mud splatter — heavy chunky clods flung with a wet sheen, gravity-driven.
  // signature: mudSplat(x, y, dir, speed)
  mudSplat(x, y, dir, speed) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    speed = Math.min(1, Math.abs(speed || 0.6) / 200 + 0.3);
    const count = this._budget(Math.round((6 + Math.floor(speed * 8)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + dir * (0.2 + Math.random() * 0.9);
      const spd = (90 + speed * 160) * (0.5 + Math.random() * 0.7);
      const dark = 30 + (Math.random() * 35 | 0);
      const big = Math.random() > 0.65;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.6,
        size: big ? 4 + Math.random() * 5 : 2 + Math.random() * 3,
        endSize: big ? 3 + Math.random() * 3 : 1,
        color: `rgb(${dark + 28},${dark + 16},${dark})`,
        gravity: 520, drag: 0.985, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 8
      });
    }
  },

  // Landing shockwave ring — an expanding ground ring plus a low dust puff.
  // signature: shockwaveRing(x, y, power)
  shockwaveRing(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.2, Math.min(2, power));
    // Expanding ring(s)
    const rings = power > 1.2 ? 2 : 1;
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.4 + r * 0.1,
        size: 6 + r * 4, endSize: 60 * power + r * 20,
        color: `rgba(255,255,255,${(0.5 - r * 0.15).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // Low, wide dust kicked outward along the ground
    const count = this._budget(Math.round(6 * power * this._ps()));
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const spd = (50 + Math.random() * 90) * power;
      this._pushCapped({
        x: x + side * 4, y: y - Math.random() * 4,
        vx: side * spd, vy: -10 - Math.random() * 20,
        life: 0.5 + Math.random() * 0.4,
        size: 6 + Math.random() * 8, endSize: 22 + Math.random() * 18,
        color: `rgba(200,190,170,${(0.3 + Math.random() * 0.2).toFixed(2)})`,
        gravity: 40, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
  },

  // Celebratory confetti with varied shapes/colors + gentle flutter drift.
  // signature: confettiRain(x, y, spread)
  confettiRain(x, y, spread) {
    spread = spread || 200;
    const palette = ['#ff5b6e', '#ffd93d', '#4ecdc4', '#5b8dff', '#c86bff', '#7cff6b', '#ff9f43'];
    const count = this._budget(Math.round((14 + Math.floor(Math.random() * 8)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      const spd = 120 + Math.random() * 220;
      const rectShape = Math.random() > 0.35;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread * 0.3,
        y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 60,
        vy: Math.sin(a) * spd,
        life: 1.6 + Math.random() * 1.8,
        size: 3 + Math.random() * 4, endSize: 3 + Math.random() * 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 150 + Math.random() * 80, drag: 0.985,
        type: rectShape ? 'rect' : (Math.random() > 0.5 ? 'star' : 'circle'),
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 14
      });
    }
  },

  // Engine backfire puff — a quick orange flash + dark soot burst from exhaust.
  // signature: backfirePuff(x, y, dir)
  backfirePuff(x, y, dir) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    // Flash core
    this._pushCapped({
      x, y, vx: dir * 40, vy: -10,
      life: 0.16, size: 5, endSize: 16,
      color: 'rgba(255,170,60,0.9)',
      gravity: -20, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 18, glowColor: '#ff8c1a'
    });
    // Small flame licks
    const flames = this._budget(Math.max(1, Math.round(4 * this._ps())));
    for (let i = 0; i < flames; i++) {
      const a = (dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.8;
      const spd = 70 + Math.random() * 90;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.18 + Math.random() * 0.16,
        size: 3 + Math.random() * 3, endSize: 1,
        color: Math.random() > 0.5 ? '#ffcf3a' : '#ff6a1a',
        gravity: -30, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: '#ffb03a'
      });
    }
    // Trailing soot
    const soot = this._budget(Math.max(1, Math.round(4 * this._ps())));
    for (let i = 0; i < soot; i++) {
      const a = (dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.0;
      const spd = 30 + Math.random() * 50;
      const g = 30 + (Math.random() * 30 | 0);
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 15,
        life: 0.5 + Math.random() * 0.4,
        size: 4 + Math.random() * 4, endSize: 14 + Math.random() * 10,
        color: `rgba(${g},${g},${g},0.5)`,
        gravity: -18, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v3) — impacts, fireworks, weather, ambience
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / perfScale.
  // ═══════════════════════════════════════════════════════════════════════════

  // Richer surface-tinted ground impact — compression flash, low dust puffs,
  // flung debris shards and an expanding shock ring.
  // signature: impactBurst(x, y, power, surfaceType)
  impactBurst(x, y, power, surfaceType) {
    power = Math.max(0.1, Math.min(1.6, power === undefined ? 1 : power));
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    let r = 175, g = 160, b = 130;
    if (surfaceType === 'mud') { r = 74; g = 56; b = 38; }
    else if (surfaceType === 'sand') { r = 210; g = 186; b = 128; }
    else if (surfaceType === 'snow' || surfaceType === 'ice') { r = 235; g = 244; b = 255; }
    else if (surfaceType === 'grass') { r = 92; g = 132; b = 60; }
    else if (surfaceType === 'rock' || surfaceType === 'asphalt') { r = 120; g = 116; b = 110; }
    // Bright compression flash ring at the moment of contact.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.12, size: 6 * power, endSize: 34 * power,
      color: 'rgba(255,250,235,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 0.7, rotation: 0, rotVel: 0, glow: 10, glowColor: '#fff2c8'
    });
    // Low billowing dust puffs, surface-tinted.
    const puffs = this._budget(Math.round((6 + power * 7) * ps));
    for (let i = 0; i < puffs; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.5;
      const spd = (40 + power * 90) * (0.4 + Math.random() * 0.7);
      const sh = 0.8 + Math.random() * 0.4;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - power * 20,
        life: 0.4 + Math.random() * 0.5,
        size: 5 + power * 6, endSize: 16 + power * 18,
        color: `rgba(${(r * sh) | 0},${(g * sh) | 0},${(b * sh) | 0},${(0.32 + Math.random() * 0.2).toFixed(2)})`,
        gravity: -18, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.4
      });
    }
    // Flung debris shards that arc and fall.
    const shards = this._budget(Math.round((5 + power * 6) * ps));
    for (let i = 0; i < shards; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.2;
      const spd = 90 + Math.random() * 140 * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.5 + Math.random() * 0.45,
        size: 2.5 + Math.random() * 3.5, endSize: 0.5,
        color: `rgb(${(r * 0.7) | 0},${(g * 0.7) | 0},${(b * 0.7) | 0})`,
        gravity: 420, drag: 0.93, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 14
      });
    }
    // Faint expanding shock ring skimming the ground.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.22, size: 5, endSize: 44 * power,
      color: 'rgba(210,205,195,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 0.6, rotation: 0, rotVel: 0
    });
  },

  // Single firework shell explosion — flash core, glowing radial star burst,
  // white crackle sparks, falling glitter trails and a fading smoke ring.
  // signature: fireworkShell(x, y, color)
  fireworkShell(x, y, color) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    color = color || ['#ff5a7a', '#ffd23b', '#3bd0ff', '#7cff5a', '#c66bff', '#ff9a3b'][(Math.random() * 6) | 0];
    // Bright flash at detonation.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.14, size: 10, endSize: 1,
      color: 'rgba(255,255,240,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 0.95, rotation: 0, rotVel: 0, glow: 18, glowColor: color
    });
    // Primary radial spark shell.
    const arms = Math.max(6, this._budget(Math.round(26 * ps)));
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      const spd = 120 + Math.random() * 90;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.5, size: 3 + Math.random() * 2, endSize: 0.4,
        color, gravity: 60, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: color
      });
    }
    // Secondary white crackle sparks.
    const crackle = this._budget(Math.round(14 * ps));
    for (let i = 0; i < crackle; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 140;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.3 + Math.random() * 0.35, size: 1.5 + Math.random() * 1.5, endSize: 0,
        color: '#ffffff', gravity: 120, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#fff3c8'
      });
    }
    // Drifting glitter stars that fall and twinkle.
    const glit = this._budget(Math.round(8 * ps));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 70;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.9 + Math.random() * 0.6, size: 2, endSize: 0,
        color: Math.random() > 0.5 ? color : '#fffbe0', gravity: 180, drag: 0.96, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 8, glow: 5, glowColor: color
      });
    }
    // Fading smoke ring left behind.
    this._pushCapped({
      x, y, vx: 0, vy: -8, life: 0.5, size: 6, endSize: 38,
      color: 'rgba(120,120,130,0.18)', gravity: -10, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0
    });
  },

  // Multi-shell celebration — several fireworks scattered over an area plus a
  // light confetti drift. signature: celebrationBurst(x, y, spread)
  celebrationBurst(x, y, spread) {
    spread = spread || 160;
    const shells = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < shells; i++) {
      const sx = x + (Math.random() - 0.5) * spread;
      const sy = y - Math.random() * spread * 0.6;
      this.fireworkShell(sx, sy);
    }
    const cols = ['#ff3b6b', '#ffd23b', '#3bd0ff', '#4cff66', '#c64bff', '#ffffff'];
    const conf = this._budget(12);
    for (let i = 0; i < conf; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 90,
        life: 1.1 + Math.random() * 0.9, size: 3 + Math.random() * 4, endSize: 2 + Math.random() * 3,
        color: cols[(Math.random() * cols.length) | 0], gravity: 170, drag: 0.97,
        type: Math.random() > 0.4 ? 'rect' : 'star',
        alpha: 0.9, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12
      });
    }
  },

  // Ambient drifting dust motes / pollen floating gently across the view.
  // Call sparsely each frame with the visible world rect. signature:
  // ambientMotes(viewX, viewY, viewW, viewH)
  ambientMotes(viewX, viewY, viewW, viewH) {
    if (Math.random() > 0.28) return;
    const near = Math.random() > 0.6;
    const sz = near ? 1.8 + Math.random() * 1.6 : 0.8 + Math.random() * 1.0;
    const tone = 210 + ((Math.random() * 40) | 0);
    this._pushCapped({
      x: viewX + Math.random() * viewW,
      y: viewY + Math.random() * viewH,
      vx: (Math.random() - 0.5) * (near ? 12 : 6),
      vy: -4 - Math.random() * 8,
      life: near ? 3.2 : 4.6,
      size: sz, endSize: sz,
      color: `rgba(${tone},${tone - 6},${tone - 24},${(near ? 0.32 : 0.16).toFixed(2)})`,
      gravity: 2, drag: 0.995, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0,
      glow: near ? 3 : 0, glowColor: '#fff6d8'
    });
  },

  // Wind-driven rain streaks falling through the visible world rect.
  // signature: rainStreaks(viewX, viewY, viewW, viewH, wind)
  rainStreaks(viewX, viewY, viewW, viewH, wind) {
    wind = wind || 0;
    if (Math.random() > 0.6) return;
    const drops = this._budget(4 + ((Math.random() * 4) | 0));
    for (let i = 0; i < drops; i++) {
      const vx = wind * 0.5 - 20 + (Math.random() - 0.5) * 20;
      const vy = 520 + Math.random() * 220;
      const len = 6 + Math.random() * 8;
      this._pushCapped({
        x: viewX + Math.random() * (viewW + 120) - 60,
        y: viewY - 20 - Math.random() * 40,
        vx, vy,
        life: 0.7 + Math.random() * 0.4,
        size: len, endSize: len,
        color: 'rgba(170,195,225,0.45)',
        gravity: 0, drag: 1, type: 'rect',
        alpha: 0.55, rotation: Math.atan2(vy, vx), rotVel: 0
      });
    }
  },

  // Ambient glowing embers rising from the bottom of the view (lava/campfire).
  // signature: emberFall(viewX, viewY, viewW, viewH)
  emberFall(viewX, viewY, viewW, viewH) {
    if (Math.random() > 0.25) return;
    const hot = Math.random();
    this._pushCapped({
      x: viewX + Math.random() * viewW,
      y: viewY + viewH + 10,
      vx: (Math.random() - 0.5) * 20,
      vy: -30 - Math.random() * 45,
      life: 1.6 + Math.random() * 1.8,
      size: 1.5 + Math.random() * 2.5, endSize: 0.4,
      color: hot > 0.5 ? '#ff8c2a' : '#ffca55',
      gravity: -8, drag: 0.99, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0,
      glow: 6, glowColor: '#ff6a1a'
    });
  },

  // Tire spray whose material varies by surface: snow puffs, grass clippings,
  // sand/dirt grains, water droplets or bright asphalt sparks.
  // signature: surfaceSpray(x, y, speed, surfaceType)
  surfaceSpray(x, y, speed, surfaceType) {
    speed = Math.abs(speed || 0);
    if (speed < 45 || Math.random() > 0.5) return;
    const intensity = Math.min(1, speed / 220);
    const n = this._budget(Math.round(3 + intensity * 5));
    const baseAng = -Math.PI * 0.5;
    for (let i = 0; i < n; i++) {
      const a = baseAng + (Math.random() - 0.5) * Math.PI * 0.8;
      const spd = (50 + intensity * 120) * (0.4 + Math.random() * 0.7);
      let d;
      if (surfaceType === 'snow' || surfaceType === 'ice') {
        d = { size: 3 + Math.random() * 4, endSize: 9 + Math.random() * 4, color: `rgba(235,244,255,${(0.5 + Math.random() * 0.3).toFixed(2)})`, gravity: -20, drag: 0.95, type: 'circle', glow: 0, glowColor: null };
      } else if (surfaceType === 'grass') {
        d = { size: 2 + Math.random() * 3, endSize: 1, color: ['#4a7c22', '#5e9130', '#3d6b1c'][(Math.random() * 3) | 0], gravity: 360, drag: 0.93, type: 'rect', glow: 0, glowColor: null };
      } else if (surfaceType === 'sand' || surfaceType === 'dirt') {
        d = { size: 2 + Math.random() * 3, endSize: 0.5, color: surfaceType === 'sand' ? '#c8a84b' : '#8B6914', gravity: 340, drag: 0.93, type: 'circle', glow: 0, glowColor: null };
      } else if (surfaceType === 'water') {
        d = { size: 2 + Math.random() * 3, endSize: 0.5, color: `rgba(120,190,255,${(0.55 + Math.random() * 0.3).toFixed(2)})`, gravity: 320, drag: 0.94, type: 'circle', glow: 3, glowColor: '#bfe4ff' };
      } else {
        d = { size: 1.5 + Math.random() * 1.5, endSize: 0, color: Math.random() > 0.5 ? '#ffd24a' : '#fff3b0', gravity: 300, drag: 0.92, type: 'rect', glow: 5, glowColor: '#ffe066' };
      }
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 20,
        vy: Math.sin(a) * spd,
        life: 0.3 + Math.random() * 0.4,
        size: d.size, endSize: d.endSize,
        color: d.color, gravity: d.gravity, drag: d.drag, type: d.type,
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 10,
        glow: d.glow, glowColor: d.glowColor
      });
    }
  },

  // Nitro heat-haze bloom — warped translucent rings pushed backward plus a few
  // bright heat specks, for a shimmering exhaust distortion feel.
  // signature: nitroHeatBloom(x, y, angle, power)
  nitroHeatBloom(x, y, angle, power) {
    angle = angle === undefined ? Math.PI : angle;
    power = power === undefined ? 1 : Math.max(0, Math.min(1, power));
    if (Math.random() > 0.55) return;
    const back = angle;
    const spd = 20 + power * 40;
    this._pushCapped({
      x: x + Math.cos(back) * 6, y: y + Math.sin(back) * 6,
      vx: Math.cos(back) * spd, vy: Math.sin(back) * spd - 6,
      life: 0.28 + Math.random() * 0.22,
      size: 6 + power * 6, endSize: 20 + power * 22,
      color: 'rgba(255,240,220,0.10)',
      gravity: -8, drag: 0.94, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0
    });
    const specks = this._budget(2 + ((power * 2) | 0));
    for (let i = 0; i < specks; i++) {
      const a = back + (Math.random() - 0.5) * 0.6;
      const s = 40 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 8,
        life: 0.16 + Math.random() * 0.14,
        size: 1.5 + Math.random() * 1.5, endSize: 0,
        color: '#eafbff', gravity: 0, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#bff0ff'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v4) — sparks, splashes, swirls, plumes, star-bursts
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / perfScale.
  // ═══════════════════════════════════════════════════════════════════════════

  // Electric spark arc — a jagged chain of bright blue-white spark nodes that
  // leap from (x,y) toward (tx,ty), plus a couple of stray forked sparks.
  // signature: electricSparkArc(x, y, tx, ty, intensity)
  electricSparkArc(x, y, tx, ty, intensity) {
    intensity = intensity === undefined ? 1 : Math.max(0.2, Math.min(1.6, intensity));
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (tx === undefined) tx = x + (Math.random() - 0.5) * 40;
    if (ty === undefined) ty = y - 20 - Math.random() * 30;
    const dx = tx - x, dy = ty - y;
    const segs = Math.max(3, this._budget(Math.round((5 + intensity * 5) * ps)));
    // Jagged chain of glowing nodes tracing the arc path with lateral jitter.
    for (let i = 0; i < segs; i++) {
      const f = i / (segs - 1 || 1);
      const jitter = (1 - Math.abs(f - 0.5) * 2) * 18 * intensity;
      const nx = x + dx * f + (Math.random() - 0.5) * jitter;
      const ny = y + dy * f + (Math.random() - 0.5) * jitter;
      this._pushCapped({
        x: nx, y: ny,
        vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
        life: 0.1 + Math.random() * 0.12,
        size: 2 + intensity * 2, endSize: 0.4,
        color: Math.random() > 0.5 ? '#dff4ff' : '#8fd0ff',
        gravity: 0, drag: 0.82, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 20,
        glow: 12 * intensity, glowColor: '#6fbcff'
      });
    }
    // A few stray forked sparks flying off the discharge point.
    const forks = this._budget(Math.round(4 * ps));
    for (let i = 0; i < forks; i++) {
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6;
      const spd = 90 + Math.random() * 150 * intensity;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.14 + Math.random() * 0.16,
        size: 1.5 + Math.random() * 1.5, endSize: 0,
        color: '#eaf7ff', gravity: 30, drag: 0.86, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: '#9dd6ff'
      });
    }
  },

  // Water splash crown — an upward central column of droplets ringed by an
  // outward-flung crown, with a faint expanding surface ripple ring.
  // signature: waterSplashCrown(x, y, power)
  waterSplashCrown(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(1.8, power));
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    // Symmetric crown of droplets flung up-and-out to both sides.
    const drops = Math.max(4, this._budget(Math.round((8 + power * 8) * ps)));
    for (let i = 0; i < drops; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const a = -Math.PI * 0.5 + side * (0.15 + Math.random() * 0.7);
      const spd = (90 + power * 150) * (0.5 + Math.random() * 0.6);
      const bead = Math.random() > 0.7;
      this._pushCapped({
        x: x + side * (2 + Math.random() * 6), y: y - Math.random() * 4,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.45 + Math.random() * 0.5,
        size: bead ? 3 + Math.random() * 3 : 1.5 + Math.random() * 2,
        endSize: bead ? 1.5 : 0.5,
        color: `rgba(${150 + (Math.random() * 40 | 0)},${205 + (Math.random() * 30 | 0)},255,${(0.55 + Math.random() * 0.35).toFixed(2)})`,
        gravity: 620, drag: 0.985, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: bead ? 4 : 0, glowColor: '#cdeeff'
      });
    }
    // Central jet column shooting straight up.
    const jet = this._budget(Math.round(4 * ps));
    for (let i = 0; i < jet; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6, y,
        vx: (Math.random() - 0.5) * 24, vy: -(160 + power * 140) * (0.7 + Math.random() * 0.4),
        life: 0.4 + Math.random() * 0.3,
        size: 3 + power * 3, endSize: 0.6,
        color: 'rgba(200,232,255,0.7)',
        gravity: 620, drag: 0.99, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#e0f4ff'
      });
    }
    // Faint expanding ripple ring skimming the water surface.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.4, size: 5, endSize: 46 * power,
      color: 'rgba(180,220,255,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 0.7, rotation: 0, rotVel: 0
    });
  },

  // Petal / leaf swirl — soft blossom petals caught in a rotating gust that
  // circle as they drift, each with its own orbit and flutter spin.
  // signature: petalSwirl(x, y, wind)
  petalSwirl(x, y, wind) {
    wind = wind === undefined ? 40 : wind;
    if (Math.random() > 0.5) return;
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const palette = ['#ffd0e0', '#ffb3c9', '#ffe0ec', '#f7a8c4', '#ffc2b0', '#f4d9a0'];
    const n = this._budget(Math.round((3 + Math.random() * 3) * ps));
    for (let i = 0; i < n; i++) {
      const orbit = Math.random() * Math.PI * 2;
      const swirlSpd = 30 + Math.random() * 50;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 70,
        y: y - Math.random() * 50,
        vx: wind * (0.4 + Math.random() * 0.7) + Math.cos(orbit) * swirlSpd,
        vy: -6 + Math.sin(orbit) * swirlSpd,
        life: 2.2 + Math.random() * 2.4,
        size: 3.5 + Math.random() * 4, endSize: 3 + Math.random() * 3.5,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 10, drag: 0.985, type: 'rect',
        alpha: 0.9, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 7
      });
    }
  },

  // Magic sparkle trail — a shimmering wake of twinkling colored stars with a
  // fine dust of glitter, hue-tunable for pickups, boosts or enchanted trails.
  // signature: magicSparkleTrail(x, y, hue)
  magicSparkleTrail(x, y, hue) {
    hue = hue === undefined ? (Math.random() * 360) | 0 : hue;
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const stars = Math.max(2, this._budget(Math.round(4 * ps)));
    for (let i = 0; i < stars; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 12 + Math.random() * 40;
      const h = (hue + (Math.random() - 0.5) * 50 + 360) % 360;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 24,
        life: 0.5 + Math.random() * 0.6,
        size: 2 + Math.random() * 2.5, endSize: 0.3,
        color: `hsl(${h | 0},95%,72%)`,
        gravity: -12, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 10,
        glow: 8, glowColor: `hsl(${h | 0},100%,80%)`
      });
    }
    // Fine pale glitter dust twinkling in the wake.
    const dust = this._budget(Math.round(3 * ps));
    for (let i = 0; i < dust; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20,
        life: 0.4 + Math.random() * 0.5,
        size: 1 + Math.random() * 1.2, endSize: 0,
        color: '#fffdf0',
        gravity: -4, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: `hsl(${hue | 0},100%,85%)`
      });
    }
  },

  // Damage smoke plume — thick dark billowing smoke laced with orange embers,
  // for a damaged / overheating engine. Call each frame while damaged; severity
  // 0..1 scales density and ember count. signature: damageSmokePlume(x, y, severity)
  damageSmokePlume(x, y, severity) {
    severity = severity === undefined ? 0.6 : Math.max(0.15, Math.min(1, severity));
    if (Math.random() > 0.35 + severity * 0.4) return;
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const puffs = this._budget(Math.round((2 + severity * 4) * ps));
    for (let i = 0; i < puffs; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const spd = (14 + severity * 40) * (0.5 + Math.random() * 0.7);
      const g = 24 + (Math.random() * 26 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 8,
        vy: Math.sin(a) * spd - 20 - severity * 20,
        life: 0.9 + severity * 0.9 + Math.random() * 0.5,
        size: 5 + severity * 8, endSize: 24 + severity * 30,
        color: `rgba(${g},${g},${g + 4},${(0.32 + severity * 0.28).toFixed(2)})`,
        gravity: -20 - severity * 14, drag: 0.955, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.6
      });
    }
    // Occasional glowing ember flecks spat out of the smoke.
    if (Math.random() < 0.5 + severity * 0.4) {
      const embers = this._budget(Math.round((1 + severity * 2) * ps));
      for (let i = 0; i < embers; i++) {
        const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
        const spd = 30 + Math.random() * 60;
        this._pushCapped({
          x, y,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
          life: 0.35 + Math.random() * 0.4,
          size: 1.5 + Math.random() * 1.8, endSize: 0,
          color: Math.random() > 0.5 ? '#ff7a2a' : '#ffb648',
          gravity: 120, drag: 0.92, type: 'circle',
          alpha: 1, rotation: 0, rotVel: 0, glow: 7, glowColor: '#ff6a1a'
        });
      }
    }
  },

  // Tire-burnout smoke — thick warm-white rubber smoke that rolls low and
  // backward off a spinning wheel, with faint scattered rubber flecks.
  // signature: burnoutSmoke(x, y, dir, heat)
  burnoutSmoke(x, y, dir, heat) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    heat = heat === undefined ? 1 : Math.max(0.3, Math.min(1.5, heat));
    if (Math.random() > 0.55) return;
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const puffs = this._budget(Math.round((4 + heat * 5) * ps));
    for (let i = 0; i < puffs; i++) {
      const a = Math.PI + (dir < 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
      const spd = (30 + heat * 60) * (0.4 + Math.random() * 0.8);
      const tone = 205 + (Math.random() * 40 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 5,
        vx: Math.cos(a) * spd + dir * 20 * heat,
        vy: Math.sin(a) * spd - 8 - heat * 10,
        life: 0.7 + heat * 0.6 + Math.random() * 0.4,
        size: 6 + heat * 9, endSize: 26 + heat * 30,
        color: `rgba(${tone},${tone - 6},${tone - 14},${(0.2 + Math.random() * 0.22).toFixed(2)})`,
        gravity: -10 - heat * 8, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.4
      });
    }
    // Sparse dark rubber flecks kicked backward along the ground.
    if (Math.random() < 0.5) {
      const flecks = this._budget(Math.round(2 * ps));
      for (let i = 0; i < flecks; i++) {
        const spd = 40 + Math.random() * 80 * heat;
        this._pushCapped({
          x, y,
          vx: dir * spd, vy: -10 - Math.random() * 30,
          life: 0.35 + Math.random() * 0.35,
          size: 1.5 + Math.random() * 2, endSize: 0.5,
          color: '#2a2a2c', gravity: 480, drag: 0.94, type: 'rect',
          alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 12
        });
      }
    }
  },

  // Star-burst on level-up — a radiant expanding ring of stars, a bright central
  // flash, rising twinkling sparkles and a soft halo. signature:
  // starBurstLevelUp(x, y, color)
  starBurstLevelUp(x, y, color) {
    color = color || '#ffd24a';
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    // Central detonation flash.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.18, size: 8, endSize: 1,
      color: 'rgba(255,255,240,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 0.95, rotation: 0, rotVel: 0, glow: 22, glowColor: color
    });
    // Even radial ring of stars flaring outward.
    const arms = Math.max(6, this._budget(Math.round(16 * ps)));
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      const spd = 110 + Math.random() * 70;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.6 + Math.random() * 0.4,
        size: 4 + Math.random() * 3, endSize: 0.5,
        color, gravity: 40, drag: 0.93, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 10,
        glow: 12, glowColor: color
      });
    }
    // Rising twinkling sparkles above the burst.
    const spk = this._budget(Math.round(8 * ps));
    for (let i = 0; i < spk; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
        life: 0.7 + Math.random() * 0.6,
        size: 1.5 + Math.random() * 2, endSize: 0,
        color: Math.random() > 0.5 ? color : '#fffbe0',
        gravity: 30, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: color
      });
    }
    // Soft expanding halo ring and a slow-rising glow.
    this._pushCapped({
      x, y, vx: 0, vy: -14, life: 0.5, size: 8, endSize: 54,
      color: 'rgba(255,220,120,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: color
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // ADDITIVE ORIGINAL EFFECTS — v3 pack. Each is perf-aware (Settings.perfScale +
  // _budget cap) and pushes plain particles rendered by the existing draw().
  // Signatures are new and self-contained; nothing above is modified.
  // ───────────────────────────────────────────────────────────────────────────

  _ps() {
    return (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v6) — ambience, glow & big-win flourishes
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Bamboo leaves shed from a grove — slender green blades that spin and sway as
  // they flutter down on a gentle breeze. Call occasionally for ambience.
  // signature: bambooLeaves(x, y, wind)
  bambooLeaves(x, y, wind) {
    wind = wind === undefined ? 26 : wind;
    if (Math.random() > 0.6) return;
    const palette = ['#6ea63a', '#84c14a', '#4f8a2c', '#a7d36a', '#5c9636'];
    const count = this._budget(Math.round((2 + Math.floor(Math.random() * 3)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const sway = 0.6 + Math.random() * 0.9;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 70,
        y: y - Math.random() * 30,
        vx: wind * (0.3 + Math.random() * 0.7),
        vy: 10 + Math.random() * 20,
        life: 2.6 + Math.random() * 2.8,
        size: 2 + Math.random() * 2.5, endSize: 2 + Math.random() * 2,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 10, drag: 0.99, type: 'rect',
        alpha: 0.9, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 4 * sway
      });
    }
  },

  // Warm lantern glow — a soft breathing halo with a bright core and a few drifting
  // amber embers rising from a hanging lantern. Call each frame near the lantern.
  // signature: lanternGlow(x, y, t, hue)
  lanternGlow(x, y, t, hue) {
    t = t || 0;
    const warm = hue === undefined ? '#ffb347' : hue;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    // Soft breathing halo.
    this._pushCapped({
      x, y, vx: 0, vy: -4,
      life: 0.3, size: 10 + pulse * 6, endSize: 26 + pulse * 10,
      color: `rgba(255,180,90,${(0.10 + pulse * 0.12).toFixed(2)})`,
      gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22 + pulse * 12, glowColor: warm
    });
    // Occasional rising ember.
    if (Math.random() < 0.4) {
      const emb = this._budget(Math.round(1 * this._ps()));
      for (let i = 0; i < emb; i++) {
        this._pushCapped({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 14, vy: -20 - Math.random() * 26,
          life: 0.8 + Math.random() * 0.7,
          size: 1 + Math.random() * 1.5, endSize: 0.3,
          color: Math.random() > 0.5 ? '#ffd27a' : '#ffae4a',
          gravity: -10, drag: 0.96, type: 'circle',
          alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: warm
        });
      }
    }
  },

  // Panda dust — a puff of soft grey-white fluff kicked up by a tumbling panda,
  // with a couple of tiny tumbling fur flecks. signature: pandaDust(x, y, power)
  pandaDust(x, y, power) {
    power = Math.max(0.2, Math.min(1.5, power === undefined ? 1 : power));
    const puffs = this._budget(Math.round((3 + power * 4) * this._ps()));
    for (let i = 0; i < puffs; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (18 + Math.random() * 40) * power;
      const shade = 224 + ((Math.random() * 28) | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 14,
        life: 0.5 + Math.random() * 0.5,
        size: 6 + Math.random() * 8, endSize: 18 + Math.random() * 16,
        color: `rgba(${shade},${shade},${shade},${(0.22 + Math.random() * 0.18).toFixed(2)})`,
        gravity: -8, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.6
      });
    }
    // A few tumbling fur flecks.
    const flecks = this._budget(Math.round(3 * this._ps()));
    for (let i = 0; i < flecks; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      const spd = (40 + Math.random() * 70) * power;
      const dark = Math.random() > 0.6;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2, endSize: 1,
        color: dark ? '#2b2b2f' : '#f4f4f6',
        gravity: 180, drag: 0.97, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 10
      });
    }
  },

  // Mist drift — a slow, low-lying bank of translucent fog veils creeping sideways.
  // Cheap and long-lived; call sparingly for atmosphere. signature: mistDrift(x, y, wind)
  mistDrift(x, y, wind) {
    wind = wind === undefined ? 18 : wind;
    if (Math.random() > 0.5) return;
    const count = this._budget(Math.round((1 + Math.floor(Math.random() * 2)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const dir = wind >= 0 ? 1 : -1;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 16,
        vx: wind * (0.4 + Math.random() * 0.5),
        vy: -2 - Math.random() * 4,
        life: 3.0 + Math.random() * 3.0,
        size: 26 + Math.random() * 30, endSize: 60 + Math.random() * 60,
        color: `rgba(226,232,240,${(0.05 + Math.random() * 0.07).toFixed(2)})`,
        gravity: -2, drag: 0.995, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: dir * (0.1 + Math.random() * 0.3)
      });
    }
  },

  // Zen ripple — concentric calm rings expanding from a point (water/koi pond,
  // meditation pulse), with a faint highlight sparkle. signature: zenRipple(x, y, scale)
  zenRipple(x, y, scale) {
    scale = Math.max(0.4, Math.min(2.5, scale === undefined ? 1 : scale));
    const rings = 2 + (Math.random() > 0.5 ? 1 : 0);
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.9 + r * 0.25,
        size: 4 + r * 6, endSize: (40 + r * 26) * scale,
        color: `rgba(180,220,235,${(0.42 - r * 0.1).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // Faint highlight glints on the surface.
    const glints = this._budget(Math.round(3 * this._ps()));
    for (let i = 0; i < glints; i++) {
      const a = Math.random() * Math.PI * 2;
      const rad = (10 + Math.random() * 24) * scale;
      this._pushCapped({
        x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad * 0.5,
        vx: 0, vy: 0,
        life: 0.5 + Math.random() * 0.4,
        size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: 'rgba(235,250,255,0.8)',
        gravity: 0, drag: 1, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: 'rgba(200,235,255,0.6)'
      });
    }
  },

  // Jackpot burst — an explosive spray of golden coins + star flares + glitter and
  // an expanding shock ring for a big win / reward moment. signature: jackpotBurst(x, y, power)
  jackpotBurst(x, y, power) {
    power = Math.max(0.5, Math.min(2, power === undefined ? 1 : power));
    // Radiant shock ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.5, size: 8, endSize: 90 * power,
      color: 'rgba(255,225,120,0.55)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0
    });
    // Tumbling gold coins (rects) flung upward and out.
    const coins = this._budget(Math.round((10 + power * 10) * this._ps()));
    for (let i = 0; i < coins; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.9;
      const spd = (140 + Math.random() * 200) * power;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 40,
        vy: Math.sin(a) * spd,
        life: 1.2 + Math.random() * 1.2,
        size: 3 + Math.random() * 4, endSize: 3 + Math.random() * 3,
        color: Math.random() > 0.4 ? '#ffd447' : '#ffb028',
        gravity: 240 + Math.random() * 120, drag: 0.99, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 16,
        glow: 6, glowColor: '#ffcf5a'
      });
    }
    // Star flares.
    const stars = this._budget(Math.round(8 * power * this._ps()));
    for (let i = 0; i < stars; i++) {
      const a = (i / Math.max(1, stars)) * Math.PI * 2 + Math.random() * 0.4;
      const spd = (80 + Math.random() * 120) * power;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 4, endSize: 0.5,
        color: Math.random() > 0.5 ? '#fff2a8' : '#ffe066',
        gravity: 120, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
        glow: 12, glowColor: '#ffd24a'
      });
    }
    // Fine drifting glitter.
    const glit = this._budget(Math.round(8 * this._ps()));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 50,
        life: 0.7 + Math.random() * 0.6,
        size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: '#fffbe0',
        gravity: 50, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffe66b'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v5) — vehicle FX, wind, rewards & UI flourishes
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Icy water spray kicked up by a boat/ski cutting across water. A fan of
  // blue-white droplets plus a soft, low-lying mist veil.
  // signature: iceboatSpray(x, y, speed, dir)
  iceboatSpray(x, y, speed, dir) {
    speed = Math.min(1, Math.abs(speed || 0) / 240 + 0.1);
    dir = dir === undefined ? 1 : (dir < 0 ? -1 : 1);
    if (speed < 0.15 || Math.random() > 0.7) return;
    // Fast droplets flung backward/up along the wake.
    const drops = this._budget(Math.round((4 + speed * 9) * this._ps()));
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI * 0.5 - dir * (0.15 + Math.random() * 0.8);
      const spd = (70 + speed * 190) * (0.5 + Math.random() * 0.7);
      const icy = Math.random();
      const cr = 200 + (icy * 55 | 0), cg = 225 + (icy * 30 | 0), cb = 255;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.35 + Math.random() * 0.45,
        size: 1.5 + Math.random() * 3, endSize: 0.5,
        color: `rgba(${cr},${cg},${cb},${(0.7 + Math.random() * 0.3).toFixed(2)})`,
        gravity: 340, drag: 0.98, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 4, glowColor: 'rgba(180,220,255,0.6)'
      });
    }
    // Low mist veil hanging over the surface.
    const mist = this._budget(Math.round((2 + speed * 3) * this._ps()));
    for (let i = 0; i < mist; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 26,
        y: y - Math.random() * 6,
        vx: dir * (10 + Math.random() * 30), vy: -6 - Math.random() * 10,
        life: 0.5 + Math.random() * 0.5,
        size: 8 + Math.random() * 10, endSize: 22 + Math.random() * 18,
        color: `rgba(225,240,255,${(0.1 + Math.random() * 0.12).toFixed(2)})`,
        gravity: -10, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.2
      });
    }
  },

  // Rocket booster plume — a bright hot core, an outer flame cone, drifting smoke
  // and a scatter of white-hot sparks. Call each frame while boosting.
  // signature: rocketBoost2(x, y, angle, power)
  rocketBoost2(x, y, angle, power) {
    angle = angle === undefined ? Math.PI : angle;          // thrust exhaust direction
    power = Math.max(0.2, Math.min(1.5, power === undefined ? 1 : power));
    const ca = Math.cos(angle), sa = Math.sin(angle);
    // Bright pulsing core at the nozzle.
    this._pushCapped({
      x, y, vx: ca * 20, vy: sa * 20,
      life: 0.12, size: 4 + power * 5, endSize: 1,
      color: 'rgba(255,244,214,0.95)', gravity: 0, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 20 * power, glowColor: '#ffb54a'
    });
    // Flame cone particles fading orange → red.
    const flames = this._budget(Math.round((4 + power * 6) * this._ps()));
    for (let i = 0; i < flames; i++) {
      const a = angle + (Math.random() - 0.5) * 0.6;
      const spd = (90 + power * 150) * (0.5 + Math.random() * 0.6);
      const hot = Math.random();
      const cr = 255, cg = 120 + (hot * 110 | 0), cb = 30 + (hot * 40 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.22 + Math.random() * 0.28,
        size: 3 + power * 4, endSize: 1,
        color: `rgb(${cr},${cg},${cb})`,
        gravity: 0, drag: 0.92, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 10, glowColor: '#ff7a1a'
      });
    }
    // Trailing dark smoke.
    const smoke = this._budget(Math.round((2 + power * 3) * this._ps()));
    for (let i = 0; i < smoke; i++) {
      const a = angle + (Math.random() - 0.5) * 0.9;
      const spd = (30 + power * 60) * (0.4 + Math.random() * 0.6);
      const g = 40 + (Math.random() * 30 | 0);
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 12,
        life: 0.5 + Math.random() * 0.5,
        size: 5 + power * 5, endSize: 20 + power * 16,
        color: `rgba(${g},${g},${g},0.4)`,
        gravity: -14, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
    // White-hot sparks shooting out.
    if (Math.random() < 0.6) {
      const sparks = this._budget(Math.round(3 * this._ps()));
      for (let i = 0; i < sparks; i++) {
        const a = angle + (Math.random() - 0.5) * 1.1;
        const spd = 150 + Math.random() * 160;
        this._pushCapped({
          x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 0.2 + Math.random() * 0.2,
          size: 1 + Math.random() * 1.5, endSize: 0.3,
          color: '#fff3c8', gravity: 60, drag: 0.9, type: 'circle',
          alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ffd24a'
        });
      }
    }
  },

  // Sail wind — thin horizontal wind streaks with a few drifting motes, evoking a
  // gust filling a sail or sweeping across an open stretch.
  // signature: sailWind(x, y, wind)
  sailWind(x, y, wind) {
    wind = wind || 70;
    const dir = wind < 0 ? -1 : 1;
    const aw = Math.abs(wind);
    // Streaks (thin rects) racing along the wind direction.
    const streaks = this._budget(Math.round((3 + Math.floor(Math.random() * 3)) * this._ps()));
    for (let i = 0; i < streaks; i++) {
      const sway = (Math.random() - 0.5) * 30;
      this._pushCapped({
        x: x - dir * (Math.random() * 40),
        y: y + (Math.random() - 0.5) * 70,
        vx: dir * (aw * (0.9 + Math.random() * 0.8)),
        vy: sway * 0.4,
        life: 0.6 + Math.random() * 0.7,
        size: 10 + Math.random() * 16, endSize: 4 + Math.random() * 6,
        color: `rgba(235,245,255,${(0.12 + Math.random() * 0.14).toFixed(2)})`,
        gravity: 0, drag: 0.97, type: 'rect',
        alpha: 1, rotation: dir < 0 ? Math.PI : 0, rotVel: 0
      });
    }
    // A few slow drifting motes carried by the gust.
    const motes = this._budget(Math.round(3 * this._ps()));
    for (let i = 0; i < motes; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 60,
        vx: dir * aw * (0.5 + Math.random() * 0.5), vy: -6 + Math.random() * 12,
        life: 1.0 + Math.random() * 1.2,
        size: 1.5 + Math.random() * 2, endSize: 1,
        color: 'rgba(255,255,255,0.5)',
        gravity: 4, drag: 0.99, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Glitter rain — a shimmering downpour of tiny twinkling stars and sparks that
  // flutter and catch the light as they fall. signature: glitterRain(x, y, spread)
  glitterRain(x, y, spread) {
    spread = spread || 180;
    const palette = ['#fff3b0', '#ffe66b', '#bff0ff', '#ffd1f0', '#d6ffce', '#ffffff'];
    const count = this._budget(Math.round((10 + Math.floor(Math.random() * 8)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const twinkle = Math.random() > 0.5;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread,
        y: y - Math.random() * 30,
        vx: (Math.random() - 0.5) * 40,
        vy: 20 + Math.random() * 60,
        life: 1.0 + Math.random() * 1.4,
        size: twinkle ? 2 + Math.random() * 2.5 : 1 + Math.random() * 1.5,
        endSize: 0.4,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 90 + Math.random() * 60, drag: 0.99,
        type: twinkle ? 'star' : 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 10,
        glow: 5, glowColor: '#fff2c8'
      });
    }
  },

  // Combo flare — a punchy reward pop for chained hits: a radial star burst, an
  // expanding pulse ring and a rising glow, intensifying with combo level.
  // signature: comboFlare(x, y, level)
  comboFlare(x, y, level) {
    level = Math.max(1, Math.min(8, Math.round(level || 1)));
    const lf = level / 8;
    const cr = 255, cg = 200 - (level * 14 | 0), cb = 40 + (level * 6 | 0);
    const core = `rgb(${cr},${Math.max(60, cg)},${cb})`;
    // Expanding pulse ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.35 + lf * 0.2, size: 5, endSize: 40 + level * 8,
      color: `rgba(${cr},${Math.max(60, cg)},${cb},0.6)`,
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: core
    });
    // Radial star burst — count scales with combo level.
    const stars = this._budget(Math.round((5 + level * 2) * this._ps()));
    for (let i = 0; i < stars; i++) {
      const a = (i / Math.max(1, stars)) * Math.PI * 2 + Math.random() * 0.3;
      const spd = (70 + level * 18) * (0.6 + Math.random() * 0.6);
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.4,
        size: 2.5 + lf * 3, endSize: 0.5,
        color: Math.random() > 0.4 ? core : '#fff3c8',
        gravity: 90, drag: 0.9, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
        glow: 8, glowColor: core
      });
    }
    // Rising warm glow.
    this._pushCapped({
      x, y, vx: 0, vy: -30 - level * 4,
      life: 0.5, size: 6 + lf * 6, endSize: 24 + level * 3,
      color: `rgba(${cr},${Math.max(80, cg + 20)},${cb + 30},0.3)`,
      gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: core
    });
  },

  // Unlock rays — a celebratory reveal flourish: golden light rays fanning out
  // from a point, a bright halo ring and a shower of sparkles.
  // signature: unlockRays(x, y, power)
  unlockRays(x, y, power) {
    power = Math.max(0.5, Math.min(1.5, power === undefined ? 1 : power));
    // Radiating light rays (thin rects) fanning outward.
    const rays = this._budget(Math.max(6, Math.round(12 * power * this._ps())));
    for (let i = 0; i < rays; i++) {
      const a = (i / Math.max(1, rays)) * Math.PI * 2;
      const spd = 60 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.3,
        size: 14 + Math.random() * 10, endSize: 2,
        color: `rgba(255,225,140,${(0.5 + Math.random() * 0.3).toFixed(2)})`,
        gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: a, rotVel: 0, glow: 10, glowColor: '#ffcf5a'
      });
    }
    // Bright halo ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.45, size: 6, endSize: 46 * power,
      color: 'rgba(255,236,180,0.7)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 18, glowColor: '#ffd24a'
    });
    // Sparkle shower.
    const sparkles = this._budget(Math.round(9 * power * this._ps()));
    for (let i = 0; i < sparkles; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 110;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.5 + Math.random() * 0.6,
        size: 1.5 + Math.random() * 2, endSize: 0.4,
        color: Math.random() > 0.4 ? '#ffe66b' : '#fffbe0',
        gravity: 130, drag: 0.93, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 6, glowColor: '#ffd24a'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v4) — celestial & sky ambience
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Shooting star — a bright glowing star head streaking across the sky with a
  // short sparkling tail that fades behind it. signature: shootingStar(x, y, angle, len)
  shootingStar(x, y, angle, len) {
    angle = angle === undefined ? Math.PI * 0.82 : angle; // default: down-left streak
    len = Math.max(0.4, Math.min(2, len === undefined ? 1 : len));
    const spd = (260 + Math.random() * 160) * len;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    // Bright leading head with a warm glow.
    this._pushCapped({
      x, y, vx: ca * spd, vy: sa * spd,
      life: 0.55 + Math.random() * 0.35,
      size: 3.5 + len * 2, endSize: 0.6,
      color: '#fff8e6', gravity: 0, drag: 0.995, type: 'star',
      alpha: 1, rotation: angle, rotVel: (Math.random() - 0.5) * 3,
      glow: 16, glowColor: '#bcd8ff'
    });
    // Sparkling tail particles trailing the head, slightly slower & scattered.
    const tail = this._budget(Math.round((8 + len * 6) * this._ps()));
    for (let i = 0; i < tail; i++) {
      const back = (i / Math.max(1, tail)) * (26 + len * 24);
      const jt = (Math.random() - 0.5) * 6;
      const tspd = spd * (0.55 + Math.random() * 0.3);
      this._pushCapped({
        x: x - ca * back + sa * jt, y: y - sa * back - ca * jt,
        vx: ca * tspd, vy: sa * tspd,
        life: 0.28 + Math.random() * 0.4,
        size: 1 + Math.random() * 2.2, endSize: 0.3,
        color: Math.random() > 0.4 ? 'rgba(220,235,255,0.9)' : 'rgba(255,244,214,0.9)',
        gravity: 0, drag: 0.96, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#a8c8ff'
      });
    }
  },

  // Comet tail — a persistent glowing nucleus that continuously sheds a soft,
  // ionized tail. Call each frame while the comet is on screen.
  // signature: cometTail(x, y, angle, power)
  cometTail(x, y, angle, power) {
    angle = angle === undefined ? 0 : angle;               // travel direction
    power = Math.max(0.2, Math.min(1.5, power === undefined ? 1 : power));
    // Opposite of travel = tail direction.
    const ta = angle + Math.PI;
    const ca = Math.cos(ta), sa = Math.sin(ta);
    if (Math.random() < 0.5) {
      // Glowing nucleus flicker.
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.18, size: 4 + power * 4, endSize: 1.5,
        color: 'rgba(200,240,255,0.85)', gravity: 0, drag: 1, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 18 * power, glowColor: '#7fd0ff'
      });
    }
    const n = this._budget(Math.round((3 + power * 4) * this._ps()));
    for (let i = 0; i < n; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const c = Math.cos(ta + spread), s = Math.sin(ta + spread);
      const spd = (30 + power * 70) * (0.4 + Math.random() * 0.7);
      const cool = Math.random();
      const cr = 120 + (cool * 80 | 0), cg = 200 + (cool * 40 | 0), cb = 255;
      this._pushCapped({
        x: x + ca * (Math.random() * 6), y: y + sa * (Math.random() * 6),
        vx: c * spd, vy: s * spd,
        life: 0.5 + Math.random() * 0.6 * power,
        size: 3 + power * 5, endSize: 10 + power * 16,
        color: `rgba(${cr},${cg},${cb},0.18)`,
        gravity: 0, drag: 0.965, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.5,
        glow: 8 * power, glowColor: 'rgba(140,210,255,0.5)'
      });
    }
  },

  // Rainbow arc — a fan of colored dots laid out along an arc, each drifting
  // gently outward, forming a brief shimmering rainbow. signature: rainbowArc(x, y, radius)
  rainbowArc(x, y, radius) {
    radius = radius || 120;
    const bands = ['#ff5b5b', '#ff9f43', '#ffe66b', '#7cff6b', '#4ecdc4', '#5b8dff', '#c86bff'];
    const per = Math.max(2, Math.round(5 * this._ps()));
    const total = this._budget(bands.length * per);
    let placed = 0;
    for (let b = 0; b < bands.length && placed < total; b++) {
      const rr = radius - b * (radius * 0.06);
      for (let i = 0; i < per && placed < total; i++, placed++) {
        // Spread points across the upper half arc (PI..2PI = top semicircle).
        const ang = Math.PI + (i / (per - 1 || 1)) * Math.PI;
        const px = x + Math.cos(ang) * rr;
        const py = y + Math.sin(ang) * rr;
        // radial outward drift
        const ox = Math.cos(ang) * 14, oy = Math.sin(ang) * 14;
        this._pushCapped({
          x: px, y: py, vx: ox, vy: oy,
          life: 0.7 + Math.random() * 0.6,
          size: 3 + Math.random() * 2, endSize: 1,
          color: bands[b], gravity: 0, drag: 0.97, type: 'circle',
          alpha: 0.9, rotation: 0, rotVel: 0, glow: 6, glowColor: bands[b]
        });
      }
    }
  },

  // Eclipse glow — a dark disc rimmed by a luminous corona ring plus radiant
  // flares, evoking a solar eclipse. signature: eclipseGlow(x, y, radius)
  eclipseGlow(x, y, radius) {
    radius = radius || 60;
    // Dark occluding disc (fades in briefly).
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.9, size: radius, endSize: radius,
      color: 'rgba(20,18,30,0.92)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0
    });
    // Expanding luminous corona ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.9, size: radius * 1.05, endSize: radius * 1.6,
      color: 'rgba(255,236,180,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 26, glowColor: '#ffe6a0'
    });
    // Radiant corona flares shooting outward.
    const flares = this._budget(Math.round(14 * this._ps()));
    for (let i = 0; i < flares; i++) {
      const a = (i / Math.max(1, flares)) * Math.PI * 2 + Math.random() * 0.2;
      const spd = 26 + Math.random() * 40;
      this._pushCapped({
        x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.6 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, endSize: 0.5,
        color: Math.random() > 0.5 ? '#fff2c0' : '#ffd873',
        gravity: 0, drag: 0.95, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 4,
        glow: 10, glowColor: '#ffe08a'
      });
    }
  },

  // Snow gust — a wind-blown flurry of soft snowflakes that drift and settle,
  // with gentle horizontal sway. signature: snowGust(x, y, wind)
  snowGust(x, y, wind) {
    wind = wind === undefined ? 30 : wind;
    const n = this._budget(Math.round((5 + Math.floor(Math.random() * 4)) * this._ps()));
    for (let i = 0; i < n; i++) {
      const big = Math.random() > 0.7;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 90,
        y: y - Math.random() * 50,
        vx: wind * (0.4 + Math.random() * 0.9) + (Math.random() - 0.5) * 18,
        vy: 18 + Math.random() * 30,
        life: 2.2 + Math.random() * 2.8,
        size: big ? 2.5 + Math.random() * 2.5 : 1 + Math.random() * 1.8,
        endSize: big ? 2 + Math.random() * 2 : 1,
        color: Math.random() > 0.5 ? '#ffffff' : '#eaf4ff',
        gravity: 10, drag: 0.995,
        type: Math.random() > 0.35 ? 'circle' : 'star',
        alpha: 0.85, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 2.5, glow: 3, glowColor: '#dcecff'
      });
    }
  },

  // Victory confetti rain — a big upward fountain of multicolored confetti and
  // sparkling stars for wins/podiums; wider, denser, glitzier than confettiRain.
  // signature: victoryConfettiRain(x, y, spread)
  victoryConfettiRain(x, y, spread) {
    spread = spread || 320;
    const palette = ['#ff2e63', '#ff9f1c', '#ffd23f', '#2ec4b6', '#3a86ff', '#8338ec', '#06d6a0', '#ff6b6b'];
    const count = this._budget(Math.round((20 + Math.floor(Math.random() * 12)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
      const spd = 180 + Math.random() * 320;
      const roll = Math.random();
      const shape = roll > 0.6 ? 'rect' : (roll > 0.28 ? 'star' : 'circle');
      const col = palette[(Math.random() * palette.length) | 0];
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread * 0.5,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 90,
        vy: Math.sin(a) * spd,
        life: 1.8 + Math.random() * 2.2,
        size: 3 + Math.random() * 5, endSize: 2 + Math.random() * 3,
        color: col,
        gravity: 170 + Math.random() * 90, drag: 0.987,
        type: shape,
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 18,
        glow: shape === 'star' ? 6 : 0, glowColor: col
      });
    }
    // A couple of bright rising glints for extra sparkle.
    const glints = this._budget(Math.round(4 * this._ps()));
    for (let i = 0; i < glints; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread * 0.4, y,
        vx: (Math.random() - 0.5) * 60, vy: -260 - Math.random() * 140,
        life: 0.7 + Math.random() * 0.5, size: 2 + Math.random() * 2, endSize: 0.4,
        color: '#fffbe0', gravity: 150, drag: 0.98, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 10,
        glow: 10, glowColor: '#ffe66b'
      });
    }
  },

  // Sudden burst of tire smoke when peeling out / hard braking.
  // dir: travel direction (+1 right, -1 left). intensity 0..1.
  tireSmokeBurst(x, y, dir, intensity) {
    dir = dir || -1;
    intensity = Math.max(0.2, Math.min(1, intensity === undefined ? 0.8 : intensity));
    const ps = this._ps();
    const n = this._budget(Math.round((6 + intensity * 10) * ps));
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (Math.random() - 0.5) * 1.1;
      const spd = 40 + Math.random() * 90 * intensity;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd * -dir, vy: -30 - Math.random() * 30,
        life: 0.5 + Math.random() * 0.5,
        size: 5 + Math.random() * 6, endSize: 20 + Math.random() * 18 * intensity,
        color: `rgba(${118 + (Math.random() * 24 | 0)},${118 + (Math.random() * 24 | 0)},${122 + (Math.random() * 24 | 0)},${(0.4 + Math.random() * 0.25).toFixed(2)})`,
        gravity: -22, drag: 0.93, type: 'circle',
        rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
    // Dark scorch core for contrast.
    const c = this._budget(Math.round(3 * ps));
    for (let i = 0; i < c; i++) {
      const a = Math.PI + (Math.random() - 0.5) * 0.8;
      const spd = 30 + Math.random() * 50;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd * -dir, vy: -20 - Math.random() * 25,
        life: 0.35 + Math.random() * 0.3, size: 4 + Math.random() * 4, endSize: 12,
        color: 'rgba(48,46,46,0.5)', gravity: -10, drag: 0.92, type: 'circle'
      });
    }
  },

  // Water impact: foam crown ring, flung droplets and lingering mist.
  waterSplash(x, y, speed, dir) {
    speed = Math.abs(speed || 120);
    dir = dir || 1;
    const ps = this._ps();
    const power = Math.min(1, speed / 320);
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.32, size: 6, endSize: 34 + power * 26,
      color: 'rgba(200,235,255,0.5)', gravity: 0, drag: 1, type: 'ring',
      glow: 6, glowColor: '#CFF0FF'
    });
    const n = this._budget(Math.round((10 + power * 14) * ps));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * (0.5 + power) * Math.PI * 0.7;
      const spd = 90 + Math.random() * 180 * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd + dir * 20, vy: Math.sin(a) * spd - 40,
        life: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 4, endSize: 0.5,
        color: Math.random() > 0.35 ? 'rgba(150,205,240,0.85)' : 'rgba(235,250,255,0.9)',
        gravity: 420, drag: 0.98, type: 'circle', glow: 3, glowColor: '#BEE6FF'
      });
    }
    const m = this._budget(Math.round(5 * ps));
    for (let i = 0; i < m; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 24, y: y - Math.random() * 10,
        vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30,
        life: 0.6 + Math.random() * 0.5, size: 8 + Math.random() * 10, endSize: 22,
        color: 'rgba(210,235,250,0.28)', gravity: -12, drag: 0.95, type: 'circle'
      });
    }
  },

  // Tumbling autumn leaves flung from a point, drifting with optional wind.
  leafScatter(x, y, count, wind) {
    const ps = this._ps();
    wind = wind === undefined ? 0 : wind;
    const n = this._budget(Math.round((count || 10) * ps));
    const palette = ['#5a8f2b', '#79a83a', '#c7972f', '#b7621f', '#8fae4a'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(a) * spd + wind * 40, vy: Math.sin(a) * spd - 40 - Math.random() * 30,
        life: 1.1 + Math.random() * 1.0,
        size: 4 + Math.random() * 4, endSize: 3 + Math.random() * 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 60 + Math.random() * 40, drag: 0.97, type: 'rect',
        rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 8
      });
    }
  },

  // Wheels throwing up powdery snow backward, plus a soft haze puff.
  snowSpray(x, y, speed, dir) {
    speed = Math.abs(speed || 100);
    dir = dir || -1;
    const ps = this._ps();
    const power = Math.min(1, speed / 260);
    const hx = -dir; // spray flies opposite to travel
    const n = this._budget(Math.round((8 + power * 12) * ps));
    for (let i = 0; i < n; i++) {
      this._pushCapped({
        x, y,
        vx: hx * (40 + Math.random() * 120 * power) + (Math.random() - 0.5) * 20,
        vy: -60 - Math.random() * 120 * power,
        life: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 4, endSize: 4 + Math.random() * 4,
        color: Math.random() > 0.3 ? 'rgba(240,248,255,0.9)' : 'rgba(205,225,245,0.8)',
        gravity: 260, drag: 0.96, type: 'circle', glow: 3, glowColor: '#EAF4FF'
      });
    }
    const h = this._budget(Math.round(4 * ps));
    for (let i = 0; i < h; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16, y: y - Math.random() * 6,
        vx: hx * (20 + Math.random() * 30), vy: -20 - Math.random() * 30,
        life: 0.55 + Math.random() * 0.4, size: 7 + Math.random() * 9, endSize: 20,
        color: 'rgba(235,245,255,0.4)', gravity: -8, drag: 0.95, type: 'circle'
      });
    }
  },

  // Upward fountain of glowing sparks (electric/welding). hue is an HSL hue.
  sparkFountain(x, y, power, hue) {
    power = power === undefined ? 1 : Math.max(0.2, Math.min(1.5, power));
    const ps = this._ps();
    const base = (hue === undefined) ? 45 : hue;
    const n = this._budget(Math.round((10 + power * 16) * ps));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const spd = 120 + Math.random() * 220 * power;
      const bright = 60 + (Math.random() * 40 | 0);
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.6,
        size: 1.5 + Math.random() * 2.5, endSize: 0,
        color: `hsl(${(base + (Math.random() * 30 - 15) | 0)}, 100%, ${bright}%)`,
        gravity: 380, drag: 0.94, type: 'circle',
        glow: 6, glowColor: `hsl(${base}, 100%, 70%)`
      });
    }
    const s = this._budget(Math.round(3 * ps));
    for (let i = 0; i < s; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.7;
      const spd = 100 + Math.random() * 140 * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.3 + Math.random() * 0.3, size: 3 + Math.random() * 2, endSize: 0,
        color: '#FFF3C0', gravity: 300, drag: 0.93, type: 'star',
        rotVel: (Math.random() - 0.5) * 12, glow: 8, glowColor: `hsl(${base}, 100%, 75%)`
      });
    }
  },

  // Celebratory confetti pop (checkpoints / wins) — mixed shapes and colors.
  confettiPop(x, y, count) {
    const ps = this._ps();
    const n = this._budget(Math.round((count || 24) * ps));
    const palette = ['#FF4D6D', '#FFB84D', '#FFE14D', '#4DD2FF', '#6DFF8A', '#B36DFF', '#FF6DE0'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.9;
      const spd = 120 + Math.random() * 220;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 80,
        life: 1.0 + Math.random() * 1.1,
        size: 4 + Math.random() * 5, endSize: 4 + Math.random() * 4,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 240 + Math.random() * 120, drag: 0.97,
        type: Math.random() > 0.4 ? 'rect' : 'circle',
        rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14
      });
    }
  },

  // Swirling column of dust rising and widening toward the top.
  dustDevil(x, y, height, strength) {
    height = height || 120;
    strength = strength === undefined ? 1 : strength;
    const ps = this._ps();
    const n = this._budget(Math.round((10 + strength * 10) * ps));
    for (let i = 0; i < n; i++) {
      const h = Math.random();                 // 0 bottom .. 1 top
      const radius = 6 + h * 26 * strength;     // widens with height
      const ang = Math.random() * Math.PI * 2;
      const swirl = 60 + Math.random() * 80;    // tangential speed
      this._pushCapped({
        x: x + Math.cos(ang) * radius,
        y: y - h * height,
        vx: -Math.sin(ang) * swirl + (Math.random() - 0.5) * 20,
        vy: -60 - Math.random() * 70 * strength,
        life: 0.7 + Math.random() * 0.7,
        size: 4 + Math.random() * 7, endSize: 10 + Math.random() * 10,
        color: `rgba(${170 + (Math.random() * 30 | 0)},${150 + (Math.random() * 30 | 0)},${112 + (Math.random() * 24 | 0)},${(0.28 + Math.random() * 0.25).toFixed(2)})`,
        gravity: -18, drag: 0.96, type: 'circle',
        rotation: ang, rotVel: (Math.random() - 0.5) * 4
      });
    }
  },

  // Glowing embers drifting upward with a faint smoke wisp (fire/lava ambiance).
  emberRise(x, y, count) {
    const ps = this._ps();
    const n = this._budget(Math.round((count || 8) * ps));
    for (let i = 0; i < n; i++) {
      const spd = 20 + Math.random() * 50;
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.7;
      const warm = Math.random();
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 30, y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 30, vy: Math.sin(a) * spd,
        life: 0.9 + Math.random() * 1.2,
        size: 1.5 + Math.random() * 3, endSize: 0,
        color: warm > 0.5 ? '#FF7A18' : (warm > 0.2 ? '#FFB020' : '#FFE08A'),
        gravity: -35 - Math.random() * 25, drag: 0.98, type: 'circle',
        glow: 6, glowColor: '#FF8A2A', rotVel: (Math.random() - 0.5) * 2
      });
    }
    const s = this._budget(Math.round(2 * ps));
    for (let i = 0; i < s; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16, y: y - 6 - Math.random() * 8,
        vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 20,
        life: 1.0 + Math.random() * 0.8, size: 5 + Math.random() * 6, endSize: 16,
        color: 'rgba(40,32,28,0.22)', gravity: -10, drag: 0.97, type: 'circle'
      });
    }
  },

  // Sparkles spiraling inward toward a point (magnet / power-up pickup).
  magnetSparkle(x, y, radius, hue) {
    radius = radius || 50;
    const ps = this._ps();
    const base = (hue === undefined) ? 200 : hue;
    const n = this._budget(Math.round(12 * ps));
    for (let i = 0; i < n; i++) {
      const ang = (i / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.4;
      const r = radius * (0.7 + Math.random() * 0.5);
      const inward = 90 + Math.random() * 70;
      const tang = 60 + Math.random() * 50;
      this._pushCapped({
        x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r,
        vx: -Math.cos(ang) * inward - Math.sin(ang) * tang,
        vy: -Math.sin(ang) * inward + Math.cos(ang) * tang,
        life: 0.45 + Math.random() * 0.4,
        size: 2 + Math.random() * 2.5, endSize: 0,
        color: `hsl(${(base + (Math.random() * 40 - 20) | 0)}, 90%, ${60 + (Math.random() * 25 | 0)}%)`,
        gravity: 0, drag: 0.9, type: 'star',
        rotVel: (Math.random() - 0.5) * 10,
        glow: 7, glowColor: `hsl(${base}, 100%, 70%)`
      });
    }
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.4, size: radius * 0.9, endSize: 4,
      color: `hsla(${base}, 90%, 65%, 0.5)`, gravity: 0, drag: 1, type: 'ring',
      glow: 10, glowColor: `hsl(${base}, 100%, 72%)`
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v5) — reward / UI-event flourishes
  // New self-contained methods for chests, level-ups, checkpoints and unlocks.
  // All push plain particles via _pushCapped (draw-guard-safe types only:
  // circle/rect/ring/star) and are perf-capped via Settings.perfScale + _budget.
  // Nothing above is modified.
  // ═══════════════════════════════════════════════════════════════════════════

  // Loot chest opening — a golden shock ring, radial sparkle burst of gold/white
  // stars, fine drifting glitter, a few gem-colored shards and a rising halo.
  // signature: chestBurst(x, y)
  chestBurst(x, y) {
    const ps = this._ps();
    // Golden shock ring at the moment the lid pops.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.34, size: 6, endSize: 52,
      color: 'rgba(255,220,120,0.55)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: '#ffcf5a'
    });
    // Radial fan of gold/white star sparkles shooting up-and-out.
    const stars = Math.max(6, this._budget(Math.round(16 * ps)));
    for (let i = 0; i < stars; i++) {
      const a = (i / stars) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 80 + Math.random() * 140;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.5 + Math.random() * 0.5,
        size: 2.5 + Math.random() * 3, endSize: 0.4,
        color: Math.random() > 0.4 ? '#ffe066' : '#fff6c8',
        gravity: 240, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 9, glowColor: '#ffd24a'
      });
    }
    // Fine drifting glitter motes.
    const glit = this._budget(Math.round(10 * ps));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 70;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
        life: 0.6 + Math.random() * 0.6,
        size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: '#fffbe0', gravity: 120, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffe066'
      });
    }
    // A few gem-colored treasure shards arcing out.
    const gems = ['#5b8dff', '#ff5b6e', '#4ecdc4', '#c86bff', '#7cff6b'];
    const shards = this._budget(Math.round(6 * ps));
    for (let i = 0; i < shards; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.1;
      const spd = 90 + Math.random() * 130;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 50,
        life: 0.55 + Math.random() * 0.4,
        size: 2 + Math.random() * 3, endSize: 0.5,
        color: gems[(Math.random() * gems.length) | 0],
        gravity: 420, drag: 0.94, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 4, glowColor: '#ffffff'
      });
    }
    // Soft rising golden halo.
    this._pushCapped({
      x, y, vx: 0, vy: -22, life: 0.55, size: 8, endSize: 34,
      color: 'rgba(255,214,110,0.32)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 18, glowColor: '#ffcf5a'
    });
  },

  // Level-up radiant beams — a set of long thin rays fanning out from a bright
  // core, plus rising twinkle sparkles and an expanding halo ring.
  // signature: levelUpRays(x, y)
  levelUpRays(x, y) {
    const ps = this._ps();
    // Bright core flash.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.28, size: 14, endSize: 2,
      color: 'rgba(255,250,225,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22, glowColor: '#ffe89a'
    });
    // Radiant beams — thin elongated rects streaking outward (evenly spaced).
    const rays = Math.max(6, this._budget(Math.round(12 * ps)));
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const spd = 120 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.25,
        size: 16 + Math.random() * 12, endSize: 2,
        color: Math.random() > 0.5 ? 'rgba(255,236,150,0.85)' : 'rgba(255,255,230,0.9)',
        gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: a, rotVel: 0, glow: 10, glowColor: '#ffe066'
      });
    }
    // Rising twinkle sparkles.
    const twk = this._budget(Math.round(10 * ps));
    for (let i = 0; i < twk; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;
      const spd = 50 + Math.random() * 90;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 70,
        life: 0.6 + Math.random() * 0.5,
        size: 2 + Math.random() * 2, endSize: 0.3,
        color: '#fff6c8', gravity: 60, drag: 0.95, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 10,
        glow: 7, glowColor: '#ffd24a'
      });
    }
    // Expanding halo ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.45, size: 8, endSize: 64,
      color: 'rgba(255,228,140,0.45)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ffdf7a'
    });
  },

  // Checkpoint reached — a compact upward fountain of green/white stars with a
  // small confirming ring. signature: checkpointSparkle(x, y)
  checkpointSparkle(x, y) {
    const ps = this._ps();
    // Small confirm ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.3, size: 5, endSize: 34,
      color: 'rgba(150,255,170,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 10, glowColor: '#7cffa0'
    });
    // Upward fountain of star sparkles.
    const n = Math.max(4, this._budget(Math.round(12 * ps)));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const spd = 90 + Math.random() * 120;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 8, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 2.5, endSize: 0.4,
        color: Math.random() > 0.45 ? '#8dffb0' : '#f0fff4',
        gravity: 300, drag: 0.93, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 10,
        glow: 7, glowColor: '#5fff90'
      });
    }
    // A little drifting glitter.
    const glit = this._budget(Math.round(5 * ps));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 45;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 50,
        life: 0.5 + Math.random() * 0.4,
        size: 1 + Math.random() * 1.3, endSize: 0.3,
        color: '#eafff0', gravity: 120, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 4, glowColor: '#7cffa0'
      });
    }
  },

  // Unlock shine — a lens-flare style horizontal glint (two opposing beams), a
  // bright expanding ring and a scatter of sparkles. signature: unlockShine(x, y)
  unlockShine(x, y) {
    const ps = this._ps();
    // Bright core pop.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.24, size: 10, endSize: 1,
      color: 'rgba(255,255,255,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 20, glowColor: '#bfe4ff'
    });
    // Horizontal lens-flare glint — two long thin beams left and right.
    for (let s = -1; s <= 1; s += 2) {
      this._pushCapped({
        x, y, vx: s * 70, vy: 0, life: 0.3, size: 26, endSize: 2,
        color: 'rgba(210,235,255,0.9)', gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#cfeeff'
      });
    }
    // Faint vertical glint for a cross-shaped sparkle.
    for (let s = -1; s <= 1; s += 2) {
      this._pushCapped({
        x, y, vx: 0, vy: s * 55, life: 0.26, size: 16, endSize: 2,
        color: 'rgba(210,235,255,0.7)', gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: Math.PI * 0.5, rotVel: 0, glow: 8, glowColor: '#cfeeff'
      });
    }
    // Expanding bright ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.4, size: 6, endSize: 56,
      color: 'rgba(190,225,255,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#bfe4ff'
    });
    // Scatter of cool-white sparkles.
    const n = this._budget(Math.round(12 * ps));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 110;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.45,
        size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: Math.random() > 0.5 ? '#eaf7ff' : '#ffffff',
        gravity: 80, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 12,
        glow: 6, glowColor: '#9dd6ff'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v6) — themed ambience & reward flourishes
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps().
  // Draw-guard-safe types only: circle / rect / ring / star.
  // Nothing above is modified; these are new, self-contained signatures.
  // ═══════════════════════════════════════════════════════════════════════════

  // Tulip petal drift — vividly colored petals fluttering on the breeze with a
  // gentle per-petal sway (Dutch-field flavor). signature: tulipPetals(x, y, wind)
  tulipPetals(x, y, wind) {
    wind = wind === undefined ? 28 : wind;
    const palette = ['#ff4d6d', '#ff8fab', '#ffd23f', '#ff7b00', '#c14dff', '#ff2e63'];
    const ps = this._ps();
    const count = this._budget(Math.round((2 + Math.floor(Math.random() * 3)) * ps));
    for (let i = 0; i < count; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 80,
        y: y - Math.random() * 44,
        vx: wind * (0.35 + Math.random() * 0.75) + (Math.random() - 0.5) * 16,
        vy: 8 + Math.random() * 22,
        life: 2.4 + Math.random() * 2.6,
        size: 3 + Math.random() * 4, endSize: 3 + Math.random() * 3.5,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 12, drag: 0.994, type: 'rect',
        alpha: 0.92, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 5
      });
    }
  },

  // Wind gust (v2) — fast horizontal streaks of translucent air plus a few light
  // debris specks carried along; conveys a strong directional blast.
  // signature: windGust2(x, y, wind, strength)
  windGust2(x, y, wind, strength) {
    wind = wind === undefined ? 140 : wind;
    strength = strength === undefined ? 1 : Math.max(0.3, Math.min(1.6, strength));
    const dir = wind < 0 ? -1 : 1;
    const spd = Math.abs(wind);
    const ps = this._ps();
    // Translucent air streaks — thin elongated rects aligned to travel.
    const streaks = this._budget(Math.round((4 + strength * 5) * ps));
    for (let i = 0; i < streaks; i++) {
      const sp = (spd * (0.7 + Math.random() * 0.8)) * strength;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 70,
        vx: dir * sp, vy: (Math.random() - 0.5) * 14,
        life: 0.35 + Math.random() * 0.4,
        size: 14 + Math.random() * 22 * strength, endSize: 4,
        color: `rgba(235,242,250,${(0.12 + Math.random() * 0.14).toFixed(2)})`,
        gravity: 0, drag: 0.94, type: 'rect',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // A few light debris specks tumbling in the current.
    const specks = this._budget(Math.round(3 * strength * ps));
    for (let i = 0; i < specks; i++) {
      const sp = (spd * (0.5 + Math.random() * 0.7)) * strength;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 50,
        vx: dir * sp + (Math.random() - 0.5) * 20,
        vy: -10 + (Math.random() - 0.5) * 40,
        life: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5, endSize: 0.5,
        color: Math.random() > 0.5 ? 'rgba(210,205,190,0.7)' : 'rgba(190,200,210,0.7)',
        gravity: 30, drag: 0.97, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 8
      });
    }
  },

  // Cheese-wheel roll — a rolling wheel of cheese kicking up warm crumbs and a
  // low trailing dust plume behind it. dir: travel direction (+1 right, -1 left).
  // signature: cheeseWheelRoll(x, y, speed, dir)
  cheeseWheelRoll(x, y, speed, dir) {
    speed = Math.abs(speed || 120);
    dir = dir < 0 ? -1 : 1;
    const power = Math.min(1, speed / 260);
    const ps = this._ps();
    const back = -dir; // crumbs/dust fly opposite to travel
    // Warm cheese crumbs bouncing off the ground behind the wheel.
    const crumbs = this._budget(Math.round((3 + power * 6) * ps));
    for (let i = 0; i < crumbs; i++) {
      const a = -Math.PI * 0.5 + back * (0.15 + Math.random() * 0.8);
      const sp = (60 + power * 130) * (0.5 + Math.random() * 0.7);
      const warm = Math.random();
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 5,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
        life: 0.45 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, endSize: 1,
        color: warm > 0.5 ? '#ffcf3a' : (warm > 0.2 ? '#f7b733' : '#ffe08a'),
        gravity: 460, drag: 0.985, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12
      });
    }
    // Low trailing dust plume tinted warm.
    const dust = this._budget(Math.round((3 + power * 4) * ps));
    for (let i = 0; i < dust; i++) {
      const shade = 196 + ((Math.random() * 30) | 0);
      this._pushCapped({
        x: x + back * (4 + Math.random() * 14), y: y - Math.random() * 6,
        vx: back * (20 + Math.random() * 50 * power), vy: -12 - Math.random() * 20,
        life: 0.6 + Math.random() * 0.6,
        size: 7 + Math.random() * 9, endSize: 22 + Math.random() * 18,
        color: `rgba(${shade},${shade - 26},${shade - 78},${(0.2 + Math.random() * 0.18).toFixed(2)})`,
        gravity: -12, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.6
      });
    }
  },

  // Canal splash — a plunge into greenish canal water: a foam crown ring, arcing
  // droplets and a lingering low mist. signature: canalSplash(x, y, speed, dir)
  canalSplash(x, y, speed, dir) {
    speed = Math.abs(speed || 130);
    dir = dir || 1;
    const ps = this._ps();
    const power = Math.min(1, speed / 320);
    // Foam crown ring at the point of entry.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.34, size: 6, endSize: 32 + power * 26,
      color: 'rgba(200,236,222,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#bfeeda'
    });
    // Arcing droplets flung up and outward.
    const drops = this._budget(Math.round((8 + power * 14) * ps));
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * (0.5 + power) * Math.PI * 0.7;
      const sp = 90 + Math.random() * 170 * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * sp + dir * 18, vy: Math.sin(a) * sp - 36,
        life: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 3.5, endSize: 0.5,
        color: Math.random() > 0.4 ? 'rgba(120,196,170,0.85)' : 'rgba(224,246,238,0.9)',
        gravity: 430, drag: 0.98, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 3, glowColor: '#b6ead6'
      });
    }
    // Lingering low mist above the surface.
    const mist = this._budget(Math.round(5 * ps));
    for (let i = 0; i < mist; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 26, y: y - Math.random() * 10,
        vx: (Math.random() - 0.5) * 36, vy: -16 - Math.random() * 26,
        life: 0.6 + Math.random() * 0.5, size: 8 + Math.random() * 10, endSize: 22,
        color: 'rgba(198,232,220,0.24)', gravity: -10, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.2
      });
    }
  },

  // Milestone stars — a celebratory ring of golden stars flung evenly outward,
  // rising twinkle sparkles and a confirming halo ring. signature: milestoneStars(x, y)
  milestoneStars(x, y) {
    const ps = this._ps();
    // Confirming halo ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.42, size: 6, endSize: 58,
      color: 'rgba(255,224,130,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: '#ffd76a'
    });
    // Even ring of golden stars.
    const stars = Math.max(6, this._budget(Math.round(14 * ps)));
    for (let i = 0; i < stars; i++) {
      const a = (i / stars) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const sp = 90 + Math.random() * 120;
      this._pushCapped({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 24,
        life: 0.55 + Math.random() * 0.5,
        size: 3 + Math.random() * 3, endSize: 0.4,
        color: Math.random() > 0.4 ? '#ffe066' : '#fff2b8',
        gravity: 180, drag: 0.93, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 12,
        glow: 9, glowColor: '#ffcf4a'
      });
    }
    // Rising twinkle sparkles for extra shimmer.
    const twk = this._budget(Math.round(8 * ps));
    for (let i = 0; i < twk; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const sp = 40 + Math.random() * 80;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.6 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: '#fffbe0', gravity: 90, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffe066'
      });
    }
  },

  // Level-up burst — a big omni-directional celebration: bright core flash, an
  // expanding ring, a radial star fan, colorful confetti rects and a rising halo.
  // signature: levelUpBurst(x, y)
  levelUpBurst(x, y) {
    const ps = this._ps();
    const palette = ['#ff4d6d', '#ffd23f', '#4ecdc4', '#5b8dff', '#c86bff', '#7cff6b'];
    // Bright core flash.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.24, size: 13, endSize: 2,
      color: 'rgba(255,250,225,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22, glowColor: '#ffe89a'
    });
    // Expanding shock ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.45, size: 8, endSize: 70,
      color: 'rgba(255,236,150,0.45)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ffdf7a'
    });
    // Radial fan of white/gold stars.
    const stars = Math.max(8, this._budget(Math.round(16 * ps)));
    for (let i = 0; i < stars; i++) {
      const a = (i / stars) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const sp = 100 + Math.random() * 150;
      this._pushCapped({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5,
        size: 2.5 + Math.random() * 3, endSize: 0.4,
        color: Math.random() > 0.45 ? '#fff6c8' : '#ffe066',
        gravity: 60, drag: 0.92, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: '#ffd24a'
      });
    }
    // Colorful confetti rects popping upward.
    const conf = this._budget(Math.round(12 * ps));
    for (let i = 0; i < conf; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.3;
      const sp = 130 + Math.random() * 200;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y,
        vx: Math.cos(a) * sp + (Math.random() - 0.5) * 60, vy: Math.sin(a) * sp,
        life: 1.2 + Math.random() * 1.2,
        size: 3 + Math.random() * 4, endSize: 2 + Math.random() * 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 200 + Math.random() * 100, drag: 0.986, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 16
      });
    }
    // Soft rising golden halo.
    this._pushCapped({
      x, y, vx: 0, vy: -24, life: 0.55, size: 8, endSize: 40,
      color: 'rgba(255,222,120,0.3)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 18, glowColor: '#ffcf5a'
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v4) — ambience, boosts, collectibles, UI pops
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps().
  // Draw-guard-safe types only: circle / rect / ring / star.
  // Nothing above is modified; these are new, self-contained signatures.
  // ═══════════════════════════════════════════════════════════════════════════

  // Sakura petal drift — soft pink petals fluttering sideways on the wind, with
  // a gentle sway from per-petal rotation. signature: petalDrift(x, y, wind)
  petalDrift(x, y, wind) {
    wind = wind === undefined ? 30 : wind;
    const palette = ['#ffd1dc', '#ffc0cb', '#ffb7c8', '#f8bbd0', '#ffe1ea'];
    const ps = this._ps();
    const count = this._budget(Math.round((2 + Math.floor(Math.random() * 3)) * ps));
    for (let i = 0; i < count; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 70,
        y: y - Math.random() * 40,
        vx: wind * (0.4 + Math.random() * 0.7) + (Math.random() - 0.5) * 14,
        vy: 6 + Math.random() * 20,
        life: 2.6 + Math.random() * 2.8,
        size: 3 + Math.random() * 3.5, endSize: 3 + Math.random() * 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 10, drag: 0.995, type: 'rect',
        alpha: 0.9, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 4.5
      });
    }
  },

  // Rocket exhaust — a hot flame trail behind a boosting rocket: white-hot core,
  // orange flame licks, dark smoke curl and stray sparks along the thrust axis.
  // signature: rocketExhaust(x, y, angle, power)
  rocketExhaust(x, y, angle, power) {
    angle = angle === undefined ? Math.PI : angle; // default thrust points left
    power = power === undefined ? 1 : Math.max(0.2, Math.min(1.5, power));
    const ps = this._ps();
    // White-hot core.
    this._pushCapped({
      x, y,
      vx: Math.cos(angle) * (40 + power * 40), vy: Math.sin(angle) * (40 + power * 40) - 6,
      life: 0.12 + Math.random() * 0.08,
      size: 4 + power * 4, endSize: 10 + power * 8,
      color: 'rgba(255,248,220,0.95)', gravity: 0, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#ffd27a'
    });
    // Orange flame licks streaming along the thrust axis.
    const flames = this._budget(Math.round((4 + power * 5) * ps));
    for (let i = 0; i < flames; i++) {
      const a = angle + (Math.random() - 0.5) * 0.55;
      const spd = (80 + power * 130) * (0.5 + Math.random() * 0.7);
      const hot = Math.random();
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.2 + Math.random() * 0.25,
        size: 3 + power * 4, endSize: 1,
        color: hot > 0.5 ? '#ffd23a' : (hot > 0.2 ? '#ff8c1a' : '#ff5a1a'),
        gravity: -20, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 9, glowColor: '#ffab3a'
      });
    }
    // Dark smoke curling off the tail.
    const smoke = this._budget(Math.round((2 + power * 3) * ps));
    for (let i = 0; i < smoke; i++) {
      const a = angle + (Math.random() - 0.5) * 0.9;
      const spd = (30 + power * 50) * (0.4 + Math.random() * 0.6);
      const g = 60 + (Math.random() * 40 | 0);
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 12,
        life: 0.5 + Math.random() * 0.5,
        size: 5 + power * 5, endSize: 18 + power * 14,
        color: `rgba(${g},${g},${g},0.4)`,
        gravity: -22, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
    // Occasional stray spark.
    if (Math.random() > 0.5) {
      const sparks = this._budget(Math.round(3 * ps));
      for (let i = 0; i < sparks; i++) {
        const a = angle + (Math.random() - 0.5) * 1.2;
        const spd = 120 + Math.random() * 160;
        this._pushCapped({
          x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          life: 0.25 + Math.random() * 0.25,
          size: 1 + Math.random() * 1.6, endSize: 0.3,
          color: '#ffe08a', gravity: 200, drag: 0.95, type: 'circle',
          alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffca4a'
        });
      }
    }
  },

  // Bathtub bubble trail — translucent soap bubbles rising and wobbling, each
  // with a bright highlight ring for a soapy sheen. signature: bubbleTrail(x, y)
  bubbleTrail(x, y) {
    const ps = this._ps();
    const count = this._budget(Math.round((2 + Math.floor(Math.random() * 3)) * ps));
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 6;
      const bx = x + (Math.random() - 0.5) * 26;
      const by = y + (Math.random() - 0.5) * 10;
      // Bubble body — faint blue-white translucent circle.
      this._pushCapped({
        x: bx, y: by,
        vx: (Math.random() - 0.5) * 18, vy: -20 - Math.random() * 30,
        life: 1.2 + Math.random() * 1.4,
        size: r, endSize: r * (1.1 + Math.random() * 0.4),
        color: `rgba(210,238,255,${(0.18 + Math.random() * 0.14).toFixed(2)})`,
        gravity: -14, drag: 0.985, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 4, glowColor: 'rgba(200,235,255,0.5)'
      });
      // Thin outline ring for the soap-film edge.
      this._pushCapped({
        x: bx, y: by,
        vx: (Math.random() - 0.5) * 18, vy: -20 - Math.random() * 30,
        life: 1.2 + Math.random() * 1.4,
        size: r, endSize: r * (1.1 + Math.random() * 0.4),
        color: 'rgba(255,255,255,0.45)', gravity: -14, drag: 0.985, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Hover shimmer — a hovering / floating object's soft glow: a pulsing halo ring,
  // faint lift-glow and a few slow rising sparkles. signature: hoverGlow(x, y, t)
  hoverGlow(x, y, t) {
    t = t || 0;
    const ps = this._ps();
    // Soft breathing halo ring (size sways with t).
    const sway = 1 + Math.sin(t * 3) * 0.15;
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.3, size: 10 * sway, endSize: 28 * sway,
      color: 'rgba(150,220,255,0.28)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#9fe0ff'
    });
    // Low lift-glow puff beneath.
    if (Math.random() > 0.4) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y + 4 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 10, vy: 6 + Math.random() * 10,
        life: 0.4 + Math.random() * 0.3, size: 6, endSize: 16,
        color: 'rgba(140,210,255,0.16)', gravity: 12, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: 'rgba(150,220,255,0.5)'
      });
    }
    // Slow rising cool-white shimmer sparkles.
    const n = this._budget(Math.round(2 * ps));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 10 + Math.random() * 24;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 22,
        life: 0.6 + Math.random() * 0.5,
        size: 1 + Math.random() * 1.6, endSize: 0.3,
        color: Math.random() > 0.5 ? '#eaf8ff' : '#c8ecff',
        gravity: 6, drag: 0.95, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 8,
        glow: 5, glowColor: '#9fe0ff'
      });
    }
  },

  // Coin-rush burst — a punchier celebration for a timed-coin / coin-rush pickup:
  // radiating golden stars, a bright pop core, an expanding gold ring and a rain
  // of fine glitter. signature: coinRushBurst(x, y)
  coinRushBurst(x, y) {
    const ps = this._ps();
    // Bright pop core.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.2, size: 8, endSize: 1,
      color: 'rgba(255,246,200,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 20, glowColor: '#ffd24a'
    });
    // Expanding golden ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.42, size: 6, endSize: 64,
      color: 'rgba(255,210,90,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: '#ffcf5a'
    });
    // Radiating golden star flares.
    const stars = this._budget(Math.max(5, Math.round(12 * ps)));
    for (let i = 0; i < stars; i++) {
      const a = (i / Math.max(1, stars)) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 90 + Math.random() * 140;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 3.5, endSize: 0.5,
        color: Math.random() > 0.4 ? '#ffe066' : '#fff3b0',
        gravity: 140, drag: 0.9, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
        glow: 10, glowColor: '#ffd24a'
      });
    }
    // Fine gold glitter rain.
    const glit = this._budget(Math.round(8 * ps));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 70;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
        life: 0.6 + Math.random() * 0.5,
        size: 1 + Math.random() * 1.4, endSize: 0.3,
        color: '#fffbe0', gravity: 90, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffe066'
      });
    }
  },

  // Time-bonus pop — a green "+time" flourish for a time-extend pickup: a rising
  // plus-sign built from two crossed rects, an expanding green ring and a sparkle
  // scatter, all floating gently upward. signature: timeBonusPop(x, y)
  timeBonusPop(x, y) {
    const ps = this._ps();
    const green = '#4cff8a';
    // Expanding green ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.4, size: 6, endSize: 48,
      color: 'rgba(76,255,138,0.45)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: green
    });
    // Rising "+" sign — horizontal bar.
    this._pushCapped({
      x, y, vx: 0, vy: -34,
      life: 0.85, size: 16, endSize: 12,
      color: 'rgba(120,255,160,0.95)', gravity: -10, drag: 0.98, type: 'rect',
      alpha: 1, rotation: 0, rotVel: 0, glow: 10, glowColor: green
    });
    // Rising "+" sign — vertical bar (rotated rect).
    this._pushCapped({
      x, y, vx: 0, vy: -34,
      life: 0.85, size: 16, endSize: 12,
      color: 'rgba(120,255,160,0.95)', gravity: -10, drag: 0.98, type: 'rect',
      alpha: 1, rotation: Math.PI * 0.5, rotVel: 0, glow: 10, glowColor: green
    });
    // Bright core pop.
    this._pushCapped({
      x, y, vx: 0, vy: -18, life: 0.22, size: 6, endSize: 1,
      color: 'rgba(230,255,240,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: green
    });
    // Green sparkle scatter drifting up.
    const n = this._budget(Math.round(8 * ps));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 80;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.5 + Math.random() * 0.45,
        size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: Math.random() > 0.45 ? '#8dffb0' : '#eafff2',
        gravity: 40, drag: 0.93, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 10,
        glow: 6, glowColor: green
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v6) — storms, hazards & record flourishes
  // All push plain particles via _pushCapped (draw-guard-safe types only:
  // circle / rect / ring / star) and are perf-capped via _ps() + _budget().
  // Nothing above is modified; these are new, self-contained signatures.
  // ═══════════════════════════════════════════════════════════════════════════

  // Jagged electric arc between two points — a jittered polyline of bright spark
  // nodes, a white-hot flash core at the strike origin and a few stray branch
  // sparks. Defaults to a short up-left bolt. signature: lightningArc(x, y, tx, ty, power)
  lightningArc(x, y, tx, ty, power) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(1.5, power));
    if (tx === undefined || ty === undefined) { tx = x - 60; ty = y - 80; }
    const ps = this._ps();
    const dx = tx - x, dy = ty - y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len, ny = dx / len; // unit perpendicular for jitter
    const segs = Math.max(4, this._budget(Math.round((6 + power * 6) * ps)));
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const jitter = (Math.random() - 0.5) * (18 + power * 22) * Math.sin(f * Math.PI);
      const px = x + dx * f + nx * jitter;
      const py = y + dy * f + ny * jitter;
      const blue = Math.random() > 0.5;
      this._pushCapped({
        x: px, y: py, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
        life: 0.12 + Math.random() * 0.14,
        size: 2 + power * 2.5, endSize: 0.4,
        color: blue ? '#bfe6ff' : '#ffffff',
        gravity: 0, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: 10 + power * 6, glowColor: '#9ecbff'
      });
    }
    // White-hot flash at the strike origin.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.14, size: 6 + power * 4, endSize: 1,
      color: 'rgba(240,248,255,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22, glowColor: '#bfe6ff'
    });
    // Stray branch sparks flung off the bolt.
    const sp = this._budget(Math.round(4 * ps));
    for (let i = 0; i < sp; i++) {
      const f = Math.random();
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2.2;
      const spd = 120 + Math.random() * 160;
      this._pushCapped({
        x: x + dx * f, y: y + dy * f,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.18 + Math.random() * 0.2, size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: '#dff2ff', gravity: 60, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 14,
        glow: 6, glowColor: '#9ecbff'
      });
    }
  },

  // Hailstone shatter — an icy impact: sharp white-blue shards flung outward, a
  // puff of fine ice dust and a quick cold ring. signature: hailShatter(x, y, power)
  hailShatter(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(1.5, power));
    const ps = this._ps();
    // Cold impact ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.26, size: 4, endSize: 26 + power * 18,
      color: 'rgba(210,240,255,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: '#cdeeff'
    });
    // Sharp ice shards.
    const shards = this._budget(Math.round((6 + power * 8) * ps));
    for (let i = 0; i < shards; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.3;
      const spd = 90 + Math.random() * 170 * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.4 + Math.random() * 0.4, size: 2 + Math.random() * 3, endSize: 0.5,
        color: Math.random() > 0.4 ? '#e6f6ff' : '#b8dcff',
        gravity: 480, drag: 0.96, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 16,
        glow: 4, glowColor: '#dff2ff'
      });
    }
    // Fine ice dust puff.
    const dust = this._budget(Math.round(5 * ps));
    for (let i = 0; i < dust; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 50;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.5 + Math.random() * 0.4, size: 3 + Math.random() * 4, endSize: 9,
        color: 'rgba(225,244,255,0.4)', gravity: -8, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Swirling dust devil column with a time-phased vortex and a couple of tumbling
  // debris flecks — a richer, animated sibling of dustDevil whose swirl advances
  // from t. signature: dustDevilSwirl(x, y, height, strength, t)
  dustDevilSwirl(x, y, height, strength, t) {
    height = height || 140;
    strength = strength === undefined ? 1 : Math.max(0.3, Math.min(1.6, strength));
    t = t || 0;
    const ps = this._ps();
    const n = this._budget(Math.round((10 + strength * 12) * ps));
    for (let i = 0; i < n; i++) {
      const h = Math.random();                       // 0 bottom .. 1 top
      const radius = 5 + h * 30 * strength;          // widens toward the top
      const ang = Math.random() * Math.PI * 2 + t * (2.5 + strength);
      const swirl = 70 + Math.random() * 90 * strength;
      const shade = 165 + (Math.random() * 40 | 0);
      this._pushCapped({
        x: x + Math.cos(ang) * radius,
        y: y - h * height,
        vx: -Math.sin(ang) * swirl + (Math.random() - 0.5) * 24,
        vy: -70 - Math.random() * 80 * strength,
        life: 0.6 + Math.random() * 0.7,
        size: 4 + Math.random() * 7, endSize: 10 + Math.random() * 12,
        color: `rgba(${shade},${shade - 24},${shade - 60},${(0.24 + Math.random() * 0.24).toFixed(2)})`,
        gravity: -16, drag: 0.96, type: 'circle',
        alpha: 1, rotation: ang, rotVel: (Math.random() - 0.5) * 4
      });
    }
    // A couple of tumbling debris flecks caught in the vortex.
    const deb = this._budget(Math.round(3 * ps));
    for (let i = 0; i < deb; i++) {
      const ang = Math.random() * Math.PI * 2 + t * 3;
      const radius = 8 + Math.random() * 24 * strength;
      this._pushCapped({
        x: x + Math.cos(ang) * radius, y: y - Math.random() * height * 0.6,
        vx: -Math.sin(ang) * 90, vy: -50 - Math.random() * 60,
        life: 0.7 + Math.random() * 0.6, size: 2 + Math.random() * 3, endSize: 1.5,
        color: Math.random() > 0.5 ? '#8a6f45' : '#6f5a38',
        gravity: 40, drag: 0.97, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12
      });
    }
  },

  // Fuel / jerry-can pickup pop — an amber-green refuel flourish: an expanding
  // amber ring, a bright core, an up-fountain of warm sparkles and a few heavier
  // fuel droplets arcing out. signature: fuelPickupPop(x, y)
  fuelPickupPop(x, y) {
    const ps = this._ps();
    const amber = '#ffb43a';
    // Expanding amber ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.38, size: 6, endSize: 46,
      color: 'rgba(255,180,58,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: amber
    });
    // Bright core pop.
    this._pushCapped({
      x, y, vx: 0, vy: -12, life: 0.2, size: 7, endSize: 1,
      color: 'rgba(255,244,210,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: amber
    });
    // Up-fountain of warm amber/green sparkles.
    const n = this._budget(Math.round(11 * ps));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
      const spd = 70 + Math.random() * 110;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 8, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.4, size: 2 + Math.random() * 2.5, endSize: 0.4,
        color: Math.random() > 0.5 ? '#ffcf5a' : '#a6e05a',
        gravity: 260, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 12,
        glow: 7, glowColor: amber
      });
    }
    // A few heavier fuel droplets arcing out.
    const drops = this._budget(Math.round(5 * ps));
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;
      const spd = 60 + Math.random() * 90;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.45 + Math.random() * 0.35, size: 2 + Math.random() * 2, endSize: 0.5,
        color: 'rgba(210,160,40,0.9)', gravity: 520, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 3, glowColor: '#ffcf5a'
      });
    }
  },

  // Checkpoint flare — a bold "gate passed" flourish: a tall vertical light beam,
  // a bright base core, a wide expanding ring, a radial fan of warm stars and a
  // few rising embers. A punchier companion to checkpointSparkle.
  // signature: checkpointFlare(x, y)
  checkpointFlare(x, y) {
    const ps = this._ps();
    const gold = '#ffd24a';
    // Tall vertical light beam (thin bright rect shooting up).
    this._pushCapped({
      x, y, vx: 0, vy: -60, life: 0.4, size: 46, endSize: 8,
      color: 'rgba(255,232,150,0.85)', gravity: -20, drag: 0.95, type: 'rect',
      alpha: 1, rotation: Math.PI * 0.5, rotVel: 0, glow: 14, glowColor: gold
    });
    // Bright base core.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.24, size: 10, endSize: 1,
      color: 'rgba(255,250,225,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 20, glowColor: gold
    });
    // Wide expanding ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.46, size: 8, endSize: 70,
      color: 'rgba(255,220,120,0.45)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: gold
    });
    // Radial fan of warm stars.
    const stars = Math.max(6, this._budget(Math.round(14 * ps)));
    for (let i = 0; i < stars; i++) {
      const a = (i / stars) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const spd = 90 + Math.random() * 130;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.5 + Math.random() * 0.45, size: 2.5 + Math.random() * 3, endSize: 0.4,
        color: Math.random() > 0.4 ? '#ffe066' : '#fff3b0',
        gravity: 160, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: gold
      });
    }
    // Drifting embers rising off the flare.
    const emb = this._budget(Math.round(6 * ps));
    for (let i = 0; i < emb; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const spd = 30 + Math.random() * 60;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.6, size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: '#ffb85a', gravity: -30, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ff9a2a'
      });
    }
  },

  // New-record fireworks — a compact multi-burst celebration: a bright flash core,
  // an expanding shock ring, several small offset single-color star bursts and a
  // shower of twinkling glitter. signature: recordFireworks(x, y)
  recordFireworks(x, y) {
    const ps = this._ps();
    const palette = ['#ff4d6d', '#ffd24a', '#4dd2ff', '#6dff8a', '#c86bff', '#ff8a3a'];
    // Bright central flash.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.22, size: 10, endSize: 1,
      color: 'rgba(255,255,240,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22, glowColor: '#fff3b0'
    });
    // Expanding shock ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.45, size: 8, endSize: 76,
      color: 'rgba(255,240,200,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ffe066'
    });
    // Several small offset star bursts, each a single color.
    const bursts = 3;
    for (let b = 0; b < bursts; b++) {
      const ox = x + (Math.random() - 0.5) * 60;
      const oy = y - 10 - Math.random() * 50;
      const col = palette[(Math.random() * palette.length) | 0];
      const petals = Math.max(5, this._budget(Math.round(10 * ps)));
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + Math.random() * 0.2;
        const spd = 80 + Math.random() * 120;
        this._pushCapped({
          x: ox, y: oy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
          life: 0.6 + Math.random() * 0.5, size: 2.5 + Math.random() * 2.5, endSize: 0.4,
          color: col, gravity: 200 + Math.random() * 80, drag: 0.93, type: 'star',
          alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
          glow: 8, glowColor: col
        });
      }
    }
    // Shower of twinkling glitter drifting down.
    const glit = this._budget(Math.round(10 * ps));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 70,
        life: 0.7 + Math.random() * 0.6, size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 120, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffffff'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v5) — celebration, warnings, watercraft, whimsy
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / perfScale.
  // Draw-guard-safe types only (circle / rect / ring / star).
  // ═══════════════════════════════════════════════════════════════════════════

  // Trophy shine — radiant golden sparkle burst with rotating light rays,
  // fine glinting flecks and a soft rising halo (podium / reward moment).
  // signature: trophyShine(x, y, scale)
  trophyShine(x, y, scale) {
    scale = scale === undefined ? 1 : Math.max(0.4, Math.min(2, scale));
    const ps = this._ps();
    // Expanding golden halo ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.5, size: 8 * scale, endSize: 44 * scale,
      color: 'rgba(255,215,110,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#ffd24a'
    });
    // Rotating light rays (stars flung outward).
    const rays = this._budget(Math.max(4, Math.round(6 * ps)));
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const spd = 30 + Math.random() * 40;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.4,
        size: (5 + Math.random() * 4) * scale, endSize: 1,
        color: '#fff2b0', gravity: 0, drag: 0.9, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 6,
        glow: 12, glowColor: '#ffcf5a'
      });
    }
    // Fine drifting glints.
    const glints = this._budget(Math.round(8 * ps));
    for (let i = 0; i < glints; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 15 + Math.random() * 55;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.6 + Math.random() * 0.6,
        size: 1 + Math.random() * 2, endSize: 0.3,
        color: Math.random() > 0.5 ? '#fffbe0' : '#ffe680',
        gravity: 60, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ffe66b'
      });
    }
  },

  // Combo milestone — a big celebratory pop: bright central flash ring(s), a
  // burst of radiating colored shards and a shower of rising star confetti.
  // Fire on x2 / x5 / x10 combo thresholds; `level` scales size + adds rings.
  // signature: comboMilestone(x, y, level)
  comboMilestone(x, y, level) {
    level = Math.max(1, Math.min(6, Math.floor(level || 1)));
    const ps = this._ps();
    const big = 1 + level * 0.25;
    // Stacked flash rings (more with higher combo).
    const rings = Math.min(3, 1 + Math.floor(level / 2));
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.4 + r * 0.12,
        size: 10 + r * 6, endSize: (60 + r * 26) * big,
        color: `rgba(255,255,255,${(0.55 - r * 0.15).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: '#ffe27a'
      });
    }
    // Radiating shards.
    const palette = ['#ff5b6e', '#ffd93d', '#4ecdc4', '#5b8dff', '#c86bff', '#7cff6b'];
    const shards = this._budget(Math.round((10 + level * 3) * ps));
    for (let i = 0; i < shards; i++) {
      const a = (i / Math.max(1, shards)) * Math.PI * 2 + Math.random() * 0.3;
      const spd = (120 + Math.random() * 160) * big;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.5,
        size: (3 + Math.random() * 4) * big, endSize: 0.5,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 160, drag: 0.92,
        type: Math.random() > 0.5 ? 'star' : 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14
      });
    }
    // Rising star confetti sprinkle.
    const conf = this._budget(Math.round(6 * ps));
    for (let i = 0; i < conf; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 40, y,
        vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 120,
        life: 1.0 + Math.random() * 0.9,
        size: 3 + Math.random() * 3, endSize: 2,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 220, drag: 0.99, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 10
      });
    }
  },

  // Fuel warning — pulsing red alert motes rising from a gauge/icon plus a soft
  // throbbing warning ring. Call each frame while low; self-throttles to a pulse.
  // `urgency` 0..1 raises rate + redness.
  // signature: fuelWarning(x, y, urgency)
  fuelWarning(x, y, urgency) {
    urgency = urgency === undefined ? 0.5 : Math.max(0, Math.min(1, urgency));
    const ps = this._ps();
    // Throttle: only emit some frames so it reads as a gentle pulse.
    if (Math.random() > 0.25 + urgency * 0.4) return;
    // Throbbing warning ring on stronger pulses.
    if (Math.random() < 0.3 + urgency * 0.3) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.4, size: 5, endSize: 20 + urgency * 16,
        color: `rgba(255,60,50,${(0.35 + urgency * 0.3).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ff3b30'
      });
    }
    // Rising ember-red motes.
    const n = this._budget(Math.max(1, Math.round((2 + urgency * 3) * ps)));
    for (let i = 0; i < n; i++) {
      const g = 40 + (Math.random() * 60 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30,
        life: 0.6 + Math.random() * 0.5,
        size: 2 + Math.random() * 2.5, endSize: 0.5,
        color: `rgba(255,${g},${(g * 0.4) | 0},${(0.6 + urgency * 0.3).toFixed(2)})`,
        gravity: -10, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 7, glowColor: '#ff5b40'
      });
    }
  },

  // Swan ripple — concentric water rings spreading from a boat/hull touching the
  // surface, with a few tiny displaced droplets. Gentle low-energy wake accent.
  // signature: swanRipple(x, y, size, dir)
  swanRipple(x, y, size, dir) {
    size = size === undefined ? 1 : Math.max(0.4, Math.min(2.5, size));
    dir = dir || 1;
    const ps = this._ps();
    // Staggered expanding surface rings.
    const rings = 1 + (Math.random() < 0.6 ? 1 : 0);
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6, y,
        vx: dir * 8, vy: 0,
        life: 0.7 + r * 0.2,
        size: 6 * size + r * 5, endSize: (34 + r * 18) * size,
        color: `rgba(190,225,245,${(0.4 - r * 0.12).toFixed(2)})`,
        gravity: 0, drag: 0.98, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // A few displaced droplets skimming the surface.
    const n = this._budget(Math.round(4 * size * ps));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
      const spd = 30 + Math.random() * 50 * size;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd + dir * 12, vy: Math.sin(a) * spd - 10,
        life: 0.4 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5, endSize: 0.5,
        color: 'rgba(215,240,252,0.85)',
        gravity: 260, drag: 0.98, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 3, glowColor: '#CFF0FF'
      });
    }
  },

  // Rainbow trail — whimsical unicorn/magic wake: cycling rainbow-hued motes
  // with occasional sparkle stars drifting up behind a moving point. Call each
  // frame while active; `t` cycles the hue.
  // signature: rainbowTrail(x, y, dir, t)
  rainbowTrail(x, y, dir, t) {
    dir = dir || 1;
    t = t || 0;
    const ps = this._ps();
    const hues = ['#ff4d6d', '#ff9f43', '#ffe14d', '#54e37a', '#4db8ff', '#8a6bff', '#d46bff'];
    const n = this._budget(Math.max(1, Math.round(3 * ps)));
    for (let i = 0; i < n; i++) {
      const idx = ((t * 3 + i) | 0) % hues.length;
      const sparkle = Math.random() > 0.7;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 12,
        vx: -dir * (20 + Math.random() * 30), vy: -10 - Math.random() * 25,
        life: 0.5 + Math.random() * 0.6,
        size: sparkle ? 2 + Math.random() * 2 : 4 + Math.random() * 4,
        endSize: sparkle ? 0.5 : 1,
        color: hues[idx],
        gravity: -12, drag: 0.94,
        type: sparkle ? 'star' : 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 8,
        glow: 8, glowColor: hues[idx]
      });
    }
  },

  // Tumble dust — scuffing burst of low ground dust plus a few flung grit shards
  // when a vehicle rolls / tumbles across the ground. `speed` scales it; surface
  // tints the dust.
  // signature: tumbleDust(x, y, speed, surfaceType)
  tumbleDust(x, y, speed, surfaceType) {
    const power = Math.min(1, Math.abs(speed || 120) / 300);
    const ps = this._ps();
    let r = 190, g = 178, b = 150;
    if (surfaceType === 'mud') { r = 90; g = 70; b = 50; }
    else if (surfaceType === 'sand') { r = 214; g = 190; b = 132; }
    else if (surfaceType === 'snow') { r = 236; g = 244; b = 255; }
    else if (surfaceType === 'grass') { r = 110; g = 140; b = 70; }
    // Low, wide dust cloud.
    const n = this._budget(Math.round((5 + power * 7) * ps));
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const spd = (30 + Math.random() * 80) * power;
      const shade = 0.8 + Math.random() * 0.4;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 6,
        vx: side * spd, vy: -12 - Math.random() * 24,
        life: 0.5 + Math.random() * 0.5,
        size: 6 + Math.random() * 8, endSize: 20 + Math.random() * 18,
        color: `rgba(${(r * shade) | 0},${(g * shade) | 0},${(b * shade) | 0},${(0.22 + power * 0.18).toFixed(2)})`,
        gravity: 20, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
    // Flung grit shards.
    const shards = this._budget(Math.round((2 + power * 4) * ps));
    for (let i = 0; i < shards; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
      const spd = 60 + Math.random() * 120 * power;
      const d = 60 + (Math.random() * 40 | 0);
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2.5, endSize: 1,
        color: `rgb(${d},${(d * 0.85) | 0},${(d * 0.6) | 0})`,
        gravity: 480, drag: 0.98, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v5) — trails, spooky ambience & water
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Soft ground trail dust — a gentle, low-lying scuff of fine dust left behind a
  // rolling tire. Meant to be called continuously; self-throttles so it stays
  // light. `speed` scales density/size, `surfaceType` tints it.
  // signature: tireTrailDust(x, y, speed, surfaceType)
  tireTrailDust(x, y, speed, surfaceType) {
    speed = Math.abs(speed || 0);
    if (speed < 12) return;
    if (Math.random() > 0.6) return; // self-throttle for continuous calls
    const power = Math.min(1, speed / 260);
    const ps = this._ps();
    let r = 196, g = 186, b = 166;
    if (surfaceType === 'mud') { r = 96; g = 74; b = 52; }
    else if (surfaceType === 'sand') { r = 216; g = 192; b = 138; }
    else if (surfaceType === 'snow' || surfaceType === 'ice') { r = 238; g = 246; b = 255; }
    else if (surfaceType === 'grass') { r = 116; g = 146; b = 76; }
    else if (surfaceType === 'asphalt' || surfaceType === 'rock') { r = 150; g = 146; b = 140; }
    const n = this._budget(Math.max(1, Math.round((2 + power * 4) * ps)));
    for (let i = 0; i < n; i++) {
      const shade = 0.82 + Math.random() * 0.32;
      const drift = (Math.random() - 0.5) * 24;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 4,
        vx: drift, vy: -6 - Math.random() * 16 * power,
        life: 0.5 + Math.random() * 0.7,
        size: 4 + Math.random() * 6, endSize: 14 + Math.random() * 16 + power * 10,
        color: `rgba(${(r * shade) | 0},${(g * shade) | 0},${(b * shade) | 0},${(0.12 + power * 0.14).toFixed(2)})`,
        gravity: -4, drag: 0.955, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.2
      });
    }
  },

  // Metal scrape spark trail — bright short-lived sparks that shear off a dragging
  // chassis/metal-on-ground contact, plus a faint ember glint. `dir` biases the
  // spray (-1 left / 1 right), `intensity` (0..1) scales count & reach.
  // signature: sparkTrail(x, y, dir, intensity)
  sparkTrail(x, y, dir, intensity) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    intensity = intensity === undefined ? 0.6 : Math.max(0, Math.min(1, intensity));
    const ps = this._ps();
    const n = this._budget(Math.max(1, Math.round((3 + intensity * 6) * ps)));
    for (let i = 0; i < n; i++) {
      // Sparks mostly fly backward/upward along the drag direction.
      const a = (dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.1 - 0.3;
      const spd = (120 + intensity * 220) * (0.4 + Math.random() * 0.8);
      const hot = Math.random();
      const cr = 255, cg = 190 + (hot * 60 | 0), cb = 90 + (hot * 90 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.2 + Math.random() * 0.3,
        size: 1 + Math.random() * 1.8, endSize: 0.3,
        color: `rgb(${cr},${cg},${cb})`,
        gravity: 380, drag: 0.9, type: Math.random() > 0.5 ? 'rect' : 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
        glow: 7, glowColor: '#ffb648'
      });
    }
    // Occasional lingering hot ember that tumbles a bit further.
    if (Math.random() < 0.4 && this._budget(1) > 0) {
      const a = (dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 0.8;
      const spd = 60 + Math.random() * 100 * intensity;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 1.5, endSize: 0.4,
        color: '#ffd27a',
        gravity: 220, drag: 0.93, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 10, glowColor: '#ff9a2e'
      });
    }
  },

  // Purple graveyard wisp — a slow, ghostly ectoplasm tendril that rises and
  // sways, fading from a bright core to a smoky violet halo. Spooky ambience.
  // signature: ghostWisp(x, y, t)
  ghostWisp(x, y, t) {
    t = t || 0;
    if (Math.random() > 0.5) return; // sparse, ambient
    const ps = this._ps();
    const n = this._budget(Math.max(1, Math.round(3 * ps)));
    for (let i = 0; i < n; i++) {
      const sway = Math.sin(t * 1.6 + i * 1.3) * 16;
      const bright = Math.random();
      // violet body drifting toward a pale spectral green highlight
      const cr = 120 + (bright * 60 | 0), cg = 70 + (bright * 120 | 0), cb = 160 + (bright * 60 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 8,
        vx: sway * 0.6 + (Math.random() - 0.5) * 8,
        vy: -18 - Math.random() * 26,
        life: 1.0 + Math.random() * 1.2,
        size: 5 + Math.random() * 6, endSize: 18 + Math.random() * 18,
        color: `rgba(${cr},${cg},${cb},${(0.16 + bright * 0.16).toFixed(2)})`,
        gravity: -10, drag: 0.97, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.4,
        glow: 12, glowColor: 'rgba(170,110,230,0.55)'
      });
    }
    // Tiny bright spectral core sparks riding the wisp.
    if (Math.random() < 0.5 && this._budget(1) > 0) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6, y,
        vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 20,
        life: 0.6 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 1.5, endSize: 0.4,
        color: '#d9b8ff',
        gravity: -6, drag: 0.95, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 6,
        glow: 9, glowColor: '#b06bff'
      });
    }
  },

  // Moon glow — a soft, layered halo bloom around a light/moon source with a few
  // faint drifting motes. Slow and translucent for calm night ambience.
  // signature: moonGlow(x, y, radius)
  moonGlow(x, y, radius) {
    radius = radius || 40;
    // Layered soft halo rings that swell and fade (nested glow bloom).
    const layers = Math.max(1, Math.round(2 * this._ps()));
    for (let i = 0; i < layers; i++) {
      if (this._budget(1) <= 0) break;
      const f = i / Math.max(1, layers);
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 1.4 + i * 0.5,
        size: radius * (0.8 + f * 0.6), endSize: radius * (2.2 + f * 1.4),
        color: `rgba(230,238,255,${(0.10 - f * 0.03).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: 20 + i * 8, glowColor: 'rgba(200,220,255,0.5)'
      });
    }
    // A few slow, faint motes lifting in the moonlight.
    const motes = this._budget(Math.round(3 * this._ps()));
    for (let i = 0; i < motes; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = radius * (0.3 + Math.random() * 0.9);
      this._pushCapped({
        x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr,
        vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 8,
        life: 1.6 + Math.random() * 1.4,
        size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: 'rgba(240,245,255,0.7)',
        gravity: -2, drag: 0.99, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: 'rgba(210,225,255,0.6)'
      });
    }
  },

  // Bat flutter — a scatter of small dark flecks that dart and jitter like a
  // startled swarm of bats crossing the sky. `dir` biases their travel, `count`
  // hints the swarm size. Uses tiny rects for a wing-flap silhouette feel.
  // signature: batFlutter(x, y, dir, count)
  batFlutter(x, y, dir, count) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    const ps = this._ps();
    const want = count === undefined ? 6 : Math.max(1, count | 0);
    const n = this._budget(Math.max(1, Math.round(want * ps)));
    for (let i = 0; i < n; i++) {
      const a = (dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.4;
      const spd = 50 + Math.random() * 110;
      const dk = 18 + (Math.random() * 26 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 14 + (Math.random() - 0.5) * 40,
        life: 0.7 + Math.random() * 0.8,
        size: 3 + Math.random() * 3, endSize: 2 + Math.random() * 2,
        color: `rgba(${dk},${dk},${dk + 6},0.85)`,
        gravity: -4, drag: 0.97, type: 'rect',
        // fast rotation = flapping wing silhouette flicker
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 22
      });
    }
  },

  // Splash wake — a fanned-out sheet of water thrown sideways when a wheel cuts
  // through a puddle/shallow water, with a fine mist and an expanding surface
  // ripple ring. `dir` is travel direction, `speed` scales the spray.
  // signature: splashWake(x, y, dir, speed)
  splashWake(x, y, dir, speed) {
    dir = dir === undefined ? 1 : (dir < 0 ? -1 : 1);
    const power = Math.min(1, Math.abs(speed || 140) / 300);
    const ps = this._ps();
    // Expanding surface ripple ring at the contact point.
    if (this._budget(1) > 0) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.4 + power * 0.2,
        size: 4, endSize: 28 + power * 40,
        color: `rgba(200,232,255,${(0.28 + power * 0.14).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
    // Sheet of water droplets fanned up and forward.
    const drops = this._budget(Math.round((5 + power * 8) * ps));
    for (let i = 0; i < drops; i++) {
      const a = -Math.PI * 0.5 + dir * (0.15 + Math.random() * 0.85);
      const spd = (90 + power * 190) * (0.5 + Math.random() * 0.7);
      const bright = 200 + (Math.random() * 55 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 4,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 3.5, endSize: 1,
        color: `rgba(${bright - 40},${bright - 10},255,${(0.55 + Math.random() * 0.35).toFixed(2)})`,
        gravity: 620, drag: 0.99, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 4, glowColor: 'rgba(180,224,255,0.5)'
      });
    }
    // Fine airborne mist that lingers above the splash.
    const mist = this._budget(Math.round(4 * ps));
    for (let i = 0; i < mist; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 20,
        y: y - Math.random() * 10,
        vx: dir * (10 + Math.random() * 30), vy: -20 - Math.random() * 30,
        life: 0.5 + Math.random() * 0.5,
        size: 4 + Math.random() * 6, endSize: 12 + Math.random() * 12,
        color: `rgba(220,240,255,${(0.14 + Math.random() * 0.12).toFixed(2)})`,
        gravity: 30, drag: 0.95, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v7) — spooky, elemental & motion flourishes
  // Self-contained; push plain particles via _pushCapped (draw-safe types only:
  // circle / rect / ring / star) and are perf-capped via _budget + _ps.
  // Nothing above is modified.
  // ═══════════════════════════════════════════════════════════════════════════

  // Spooky skull pop — a pale bone-white flash, a sickly green ghost ring, a
  // radial burst of bone shards (stars) and two dark "eye-socket" wisps that
  // rise and fade. signature: skullPop(x, y, scale)
  skullPop(x, y, scale) {
    scale = Math.max(0.5, Math.min(2, scale === undefined ? 1 : scale));
    const ps = this._ps();
    // Bone-white compression flash.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.2, size: 5 * scale, endSize: 22 * scale,
      color: 'rgba(235,240,220,0.85)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#cfe88a'
    });
    // Sickly green expanding ghost ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.5, size: 6 * scale, endSize: 48 * scale,
      color: 'rgba(150,255,170,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 18, glowColor: '#7dffa0'
    });
    // Radial burst of pale bone shards.
    const shards = Math.max(6, this._budget(Math.round(14 * ps)));
    for (let i = 0; i < shards; i++) {
      const a = (i / shards) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = (70 + Math.random() * 120) * scale;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.5 + Math.random() * 0.5,
        size: (2 + Math.random() * 2.5) * scale, endSize: 0.4,
        color: Math.random() > 0.35 ? '#e8ead2' : '#bfe8b0',
        gravity: 180, drag: 0.93, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 10,
        glow: 6, glowColor: '#a8ffb8'
      });
    }
    // Two rising dark eye-socket wisps for an eerie face-like afterglow.
    for (let e = 0; e < 2; e++) {
      const ox = (e === 0 ? -1 : 1) * 5 * scale;
      this._pushCapped({
        x: x + ox, y: y - 2 * scale, vx: (Math.random() - 0.5) * 10, vy: -26 - Math.random() * 16,
        life: 0.6 + Math.random() * 0.4, size: 4 * scale, endSize: 12 * scale,
        color: 'rgba(20,40,26,0.5)', gravity: -12, drag: 0.96, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: 'rgba(120,255,150,0.4)'
      });
    }
  },

  // Ember fountain — a sustained upward jet of glowing embers that arc up, cool
  // from white-hot to deep red and fall, plus a faint rising smoke wisp.
  // signature: emberFountain(x, y, power)
  emberFountain(x, y, power) {
    power = Math.max(0.2, Math.min(1.5, power === undefined ? 1 : power));
    const ps = this._ps();
    const n = this._budget(Math.round((8 + power * 12) * ps));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.75;
      const spd = (100 + Math.random() * 160) * power;
      const heat = Math.random();
      const col = heat > 0.7 ? '#fff2c0' : (heat > 0.4 ? '#ff9a2a' : '#ff4d1a');
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.6 + Math.random() * 0.7,
        size: 1.5 + Math.random() * 2.5 * power, endSize: 0,
        color: col, gravity: 260 + Math.random() * 120, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 4,
        glow: 8, glowColor: '#ff7a1a'
      });
    }
    // A couple of bright sparks that shoot higher.
    const sparks = this._budget(Math.round(3 * ps));
    for (let i = 0; i < sparks; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.4;
      const spd = (180 + Math.random() * 120) * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.4, size: 2 + Math.random() * 2, endSize: 0,
        color: '#fff6d0', gravity: 220, drag: 0.94, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 14,
        glow: 10, glowColor: '#ffd24a'
      });
    }
    // Faint rising smoke wisp above the jet.
    if (Math.random() < 0.6) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y: y - 8 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 12, vy: -30 - Math.random() * 24,
        life: 0.9 + Math.random() * 0.7, size: 6 + Math.random() * 6, endSize: 20,
        color: 'rgba(40,30,26,0.2)', gravity: -14, drag: 0.97, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Ice crystals — a crisp shatter-burst of pale-blue crystalline shards with a
  // cold frost ring and slow-settling glints. signature: iceCrystals(x, y, count)
  iceCrystals(x, y, count) {
    const ps = this._ps();
    const n = Math.max(5, this._budget(Math.round((count || 14) * ps)));
    // Cold frost ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.4, size: 5, endSize: 40,
      color: 'rgba(200,235,255,0.45)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#bfeaff'
    });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const spd = 60 + Math.random() * 130;
      const pale = Math.random();
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 15,
        life: 0.6 + Math.random() * 0.6,
        size: 2 + Math.random() * 3, endSize: 0.5,
        color: pale > 0.5 ? '#dff4ff' : (pale > 0.2 ? '#a9dcff' : '#ffffff'),
        gravity: 140 + Math.random() * 80, drag: 0.94, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 8,
        glow: 6, glowColor: '#cdeeff'
      });
    }
    // Fine drifting frost glints.
    const glints = this._budget(Math.round(6 * ps));
    for (let i = 0; i < glints; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 50;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.7 + Math.random() * 0.6, size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: '#eaf7ff', gravity: 90, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 4, glowColor: '#bfeaff'
      });
    }
  },

  // Magnet pull — a cluster of golden coins spiraling inward and converging on a
  // point (magnetic pickup / coin vacuum). Coins spin as they close in, with a
  // pulsing gold ring at the centre. signature: magnetPull(x, y, radius, count)
  magnetPull(x, y, radius, count) {
    radius = radius || 60;
    const ps = this._ps();
    const n = this._budget(Math.round((count || 12) * ps));
    for (let i = 0; i < n; i++) {
      const ang = (i / Math.max(1, n)) * Math.PI * 2 + Math.random() * 0.5;
      const r = radius * (0.6 + Math.random() * 0.6);
      const inward = 140 + Math.random() * 110;   // strong pull toward centre
      const tang = 70 + Math.random() * 60;        // orbital swirl
      const bright = Math.random() > 0.4;
      this._pushCapped({
        x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r,
        vx: -Math.cos(ang) * inward - Math.sin(ang) * tang,
        vy: -Math.sin(ang) * inward + Math.cos(ang) * tang,
        life: 0.4 + Math.random() * 0.35,
        size: 3 + Math.random() * 2.5, endSize: 0.5,
        color: bright ? '#ffd54a' : '#ffb020',
        gravity: 0, drag: 0.9, type: Math.random() > 0.5 ? 'circle' : 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 16,
        glow: 7, glowColor: '#ffe27a'
      });
    }
    // A couple of sparkle glints riding the stream.
    const glints = this._budget(Math.round(4 * ps));
    for (let i = 0; i < glints; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = radius * (0.5 + Math.random() * 0.5);
      this._pushCapped({
        x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r,
        vx: -Math.cos(ang) * 160, vy: -Math.sin(ang) * 160,
        life: 0.35 + Math.random() * 0.3, size: 2 + Math.random() * 1.5, endSize: 0,
        color: '#fffbe0', gravity: 0, drag: 0.9, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: '#ffe27a'
      });
    }
    // Pulsing gold ring at the convergence point.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.4, size: radius * 0.85, endSize: 3,
      color: 'rgba(255,210,90,0.5)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ffd24a'
    });
  },

  // Star twinkle — a scatter of little stars that pop in and sparkle in place
  // with only gentle drift, for magical / dreamy ambience. Each twinkles via
  // its rotation and quick fade. signature: starTwinkle(x, y, spread, count)
  starTwinkle(x, y, spread, count) {
    spread = spread || 60;
    const ps = this._ps();
    const n = this._budget(Math.round((count || 10) * ps));
    for (let i = 0; i < n; i++) {
      const px = x + (Math.random() - 0.5) * spread * 2;
      const py = y + (Math.random() - 0.5) * spread * 2;
      const warm = Math.random();
      const col = warm > 0.66 ? '#fff6c8' : (warm > 0.33 ? '#cfe8ff' : '#ffffff');
      const big = Math.random() > 0.75;
      this._pushCapped({
        x: px, y: py,
        vx: (Math.random() - 0.5) * 12, vy: -8 - Math.random() * 14,
        life: 0.5 + Math.random() * 0.7,
        size: (big ? 2.5 : 1.2) + Math.random() * 1.5, endSize: 0.2,
        color: col, gravity: 0, drag: 0.97, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 6,
        glow: big ? 9 : 5, glowColor: col
      });
    }
  },

  // Dash afterimage — a quick motion-blur streak trailing behind a dashing
  // object: a fading silhouette plus a few speed lines pointing opposite the
  // travel direction. signature: dashAfterimage(x, y, angle, power)
  dashAfterimage(x, y, angle, power) {
    angle = angle === undefined ? 0 : angle;                  // travel direction
    power = Math.max(0.3, Math.min(1.5, power === undefined ? 1 : power));
    const ps = this._ps();
    const back = angle + Math.PI;                             // trail points backward
    const cb = Math.cos(back), sb = Math.sin(back);
    // Ghost silhouette blobs receding behind the mover.
    const ghosts = Math.max(2, this._budget(Math.round(4 * ps)));
    for (let i = 0; i < ghosts; i++) {
      const d = (i + 1) * (10 + power * 8);
      this._pushCapped({
        x: x + cb * d, y: y + sb * d,
        vx: cb * 20, vy: sb * 20,
        life: 0.18 + i * 0.05,
        size: (7 + power * 5) * (1 - i * 0.15), endSize: 2,
        color: `rgba(180,220,255,${(0.32 - i * 0.06).toFixed(2)})`,
        gravity: 0, drag: 0.9, type: 'circle',
        alpha: 1, rotation: angle, rotVel: 0,
        glow: 8, glowColor: 'rgba(150,210,255,0.5)'
      });
    }
    // Thin speed lines streaking backward.
    const lines = this._budget(Math.round(5 * ps));
    for (let i = 0; i < lines; i++) {
      const jitter = (Math.random() - 0.5) * 10;
      const px = x + Math.sin(angle) * jitter;
      const py = y - Math.cos(angle) * jitter;
      const spd = (120 + Math.random() * 100) * power;
      this._pushCapped({
        x: px, y: py, vx: cb * spd, vy: sb * spd,
        life: 0.16 + Math.random() * 0.14,
        size: 5 + Math.random() * 5, endSize: 1,
        color: Math.random() > 0.5 ? 'rgba(220,240,255,0.7)' : 'rgba(160,210,255,0.7)',
        gravity: 0, drag: 0.92, type: 'rect',
        alpha: 1, rotation: angle, rotVel: 0,
        glow: 5, glowColor: 'rgba(180,220,255,0.5)'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v5) — theme-park / cargo / integrity flavor
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Balloon pop — a snappy rubber burst: a thin expanding shock ring, a scatter of
  // curled latex shards (rect) and a puff of light confetti-ish dots.
  // signature: balloonPop(x, y, color)
  balloonPop(x, y, color) {
    color = color || '#ff5b6e';
    // Snap ring at the burst point.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.18, size: 4, endSize: 34,
      color: 'rgba(255,255,255,0.55)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: color
    });
    // Torn latex shards flung radially, gravity-driven with fast spin.
    const shards = this._budget(Math.round((8 + Math.floor(Math.random() * 5)) * this._ps()));
    for (let i = 0; i < shards; i++) {
      const a = (i / Math.max(1, shards)) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const spd = 120 + Math.random() * 180;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.4 + Math.random() * 0.5,
        size: 3 + Math.random() * 4, endSize: 1 + Math.random() * 2,
        color, gravity: 340, drag: 0.94, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 22
      });
    }
    // A little air-puff of pale dots.
    const puff = this._budget(Math.round(5 * this._ps()));
    for (let i = 0; i < puff; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.35 + Math.random() * 0.3,
        size: 2 + Math.random() * 2, endSize: 0.5,
        color: 'rgba(255,255,255,0.8)', gravity: 60, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Popcorn burst — fluffy kernels pop upward, tumbling and falling back with a
  // gentle arc. Warm buttery whites and golds. signature: popcornBurst(x, y, power)
  popcornBurst(x, y, power) {
    power = Math.max(0.3, Math.min(1.8, power === undefined ? 1 : power));
    const kernels = this._budget(Math.round((6 + power * 6) * this._ps()));
    for (let i = 0; i < kernels; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.3;
      const spd = (80 + power * 120) * (0.5 + Math.random() * 0.7);
      const golden = Math.random() > 0.6;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 30,
        vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.6,
        size: 4 + Math.random() * 4, endSize: 4 + Math.random() * 3,
        color: golden ? '#ffdf8a' : '#fff6df',
        gravity: 420, drag: 0.99, type: Math.random() > 0.5 ? 'circle' : 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 10
      });
    }
    // A faint steam wisp rising from the fresh batch.
    const steam = this._budget(Math.round(3 * this._ps()));
    for (let i = 0; i < steam; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y - Math.random() * 6,
        vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 20,
        life: 0.6 + Math.random() * 0.4,
        size: 4 + Math.random() * 4, endSize: 14 + Math.random() * 10,
        color: 'rgba(250,245,235,0.14)', gravity: -10, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0
      });
    }
  },

  // Cargo break — a wooden crate shatters: chunky plank shards (rect) fly out with
  // a splintery dust cloud and a couple of nails/glints. signature: cargoBreak(x, y, power)
  cargoBreak(x, y, power) {
    power = Math.max(0.3, Math.min(1.8, power === undefined ? 1 : power));
    // Splinter dust burst.
    const dust = this._budget(Math.round((5 + power * 5) * this._ps()));
    for (let i = 0; i < dust; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.4;
      const spd = (30 + power * 70) * (0.4 + Math.random() * 0.7);
      const sh = 150 + ((Math.random() * 50) | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - power * 16,
        life: 0.4 + Math.random() * 0.4,
        size: 4 + power * 4, endSize: 12 + power * 12,
        color: `rgba(${sh},${(sh * 0.82) | 0},${(sh * 0.6) | 0},0.28)`,
        gravity: -8, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 1.5
      });
    }
    // Wooden plank debris, gravity-heavy with spin.
    const shards = this._budget(Math.round((7 + power * 7) * this._ps()));
    const woods = ['#b5813f', '#9c6a2e', '#c99a58', '#7f5423'];
    for (let i = 0; i < shards; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.3;
      const spd = (110 + power * 150) * (0.5 + Math.random() * 0.7);
      const big = Math.random() > 0.55;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - power * 20,
        life: 0.6 + Math.random() * 0.6,
        size: big ? 5 + Math.random() * 5 : 2 + Math.random() * 3,
        endSize: big ? 4 + Math.random() * 3 : 1.5,
        color: woods[(Math.random() * woods.length) | 0],
        gravity: 560, drag: 0.985, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 18
      });
    }
    // Occasional metallic glint (nail/staple).
    const glints = this._budget(Math.round(2 * this._ps()));
    for (let i = 0; i < glints; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      const spd = 140 + Math.random() * 120;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 1.5, endSize: 0.5,
        color: '#e9edf2', gravity: 520, drag: 0.97, type: 'star',
        alpha: 1, rotation: 0, rotVel: (Math.random() - 0.5) * 12,
        glow: 6, glowColor: '#ffffff'
      });
    }
  },

  // Integrity warning — a pulsing red alert: layered expanding warning rings, a hot
  // core flash and a few rising ember alarm dots. Call each frame while at risk.
  // signature: integrityWarning(x, y, level)  (level 0..1 severity)
  integrityWarning(x, y, level) {
    level = Math.max(0, Math.min(1, level === undefined ? 0.6 : level));
    if (Math.random() > 0.35 + level * 0.4) return; // throttle by severity
    const rings = 1 + (level > 0.7 ? 1 : 0);
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.5 + r * 0.12,
        size: 6 + r * 6, endSize: (34 + level * 40) + r * 16,
        color: `rgba(255,${40 + (level * 40 | 0)},${40},${(0.5 - r * 0.18).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0, glow: 12 + level * 12, glowColor: '#ff2a2a'
      });
    }
    // Central hot core flash.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.22, size: 4 + level * 5, endSize: 1,
      color: `rgba(255,90,80,${(0.4 + level * 0.4).toFixed(2)})`,
      gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: '#ff3b30'
    });
    // Rising alarm embers.
    const embers = this._budget(Math.round((2 + level * 3) * this._ps()));
    for (let i = 0; i < embers; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
      const spd = 20 + Math.random() * 50;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 12, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.4 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: Math.random() > 0.5 ? '#ff5b4a' : '#ffb03a',
        gravity: -20, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ff6a4a'
      });
    }
  },

  // Festive confetti — an upward party cannon: mixed streamers (rect), stars and
  // dots in bright colors bursting up then fluttering down. signature: festiveConfetti(x, y, spread)
  festiveConfetti(x, y, spread) {
    spread = spread || 1.3; // angular spread (radians) of the upward cone
    const palette = ['#ff5b6e', '#ffd93d', '#4ecdc4', '#5b8dff', '#c86bff', '#7cff6b', '#ff9f43', '#ff6ba8'];
    const count = this._budget(Math.round((16 + Math.floor(Math.random() * 8)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * spread;
      const spd = 160 + Math.random() * 260;
      const roll = Math.random();
      const type = roll > 0.55 ? 'rect' : (roll > 0.25 ? 'star' : 'circle');
      const streamer = type === 'rect' && Math.random() > 0.5;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 70,
        vy: Math.sin(a) * spd,
        life: 1.4 + Math.random() * 1.8,
        size: streamer ? 2 + Math.random() * 2 : 3 + Math.random() * 4,
        endSize: streamer ? 6 + Math.random() * 4 : 2 + Math.random() * 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 130 + Math.random() * 90, drag: 0.985, type,
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * (streamer ? 20 : 12)
      });
    }
  },

  // Ferris sparkle — a ring of twinkling bulbs, like a lit fairground wheel: paired
  // warm/cool star glints placed around a circle with a soft outward shimmer.
  // signature: ferrisSparkle(x, y, radius)
  ferrisSparkle(x, y, radius) {
    radius = radius || 70;
    const bulbs = Math.max(4, Math.round(10 * this._ps()));
    const total = this._budget(bulbs);
    const phase = Math.random() * Math.PI * 2;
    for (let i = 0; i < total; i++) {
      const ang = phase + (i / bulbs) * Math.PI * 2;
      const rr = radius * (0.92 + Math.random() * 0.16);
      const px = x + Math.cos(ang) * rr;
      const py = y + Math.sin(ang) * rr;
      const warm = i % 2 === 0;
      this._pushCapped({
        x: px, y: py,
        vx: Math.cos(ang) * (8 + Math.random() * 10),
        vy: Math.sin(ang) * (8 + Math.random() * 10),
        life: 0.5 + Math.random() * 0.6,
        size: 2 + Math.random() * 2.5, endSize: 0.4,
        color: warm ? '#ffe08a' : '#8fd8ff',
        gravity: 0, drag: 0.96, type: 'star',
        alpha: 1, rotation: ang, rotVel: (Math.random() - 0.5) * 6,
        glow: 9, glowColor: warm ? '#ffcf5a' : '#6fc8ff'
      });
    }
    // Soft central glow pulse tying the wheel together.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.45, size: 6, endSize: radius * 0.5,
      color: 'rgba(255,235,180,0.22)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#ffd873'
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v8) — parade / delivery / phase & brake flavor
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Calliope notes — cheerful music notes floating up and swaying side to side,
  // as if from a fairground organ. Star note-heads with a soft glow trailed by a
  // little rect stem-flake. signature: calliopeNote(x, y, pitch)
  calliopeNote(x, y, pitch) {
    pitch = pitch === undefined ? Math.random() : Math.max(0, Math.min(1, pitch));
    const palette = ['#ffd93d', '#ff9f43', '#4ecdc4', '#c86bff', '#ff5b6e', '#7cff6b'];
    const col = palette[(Math.random() * palette.length) | 0];
    const notes = this._budget(Math.max(1, Math.round(2 * this._ps())));
    for (let i = 0; i < notes; i++) {
      const sway = (Math.random() - 0.5) * 30;
      // Note head — rises, drifts, and the swaying feel comes from the sine drag.
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 8,
        vx: sway,
        vy: -(40 + pitch * 40) - Math.random() * 20,
        life: 1.6 + Math.random() * 1.2,
        size: 5 + pitch * 3, endSize: 3 + pitch * 2,
        color: col, gravity: -6, drag: 0.98, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 4,
        glow: 8, glowColor: col
      });
      // Tiny stem flake following the head.
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 16,
        y: y + 6,
        vx: sway * 0.8,
        vy: -(34 + pitch * 34),
        life: 1.2 + Math.random() * 0.9,
        size: 1.6 + Math.random() * 1.6, endSize: 0.5,
        color: col, gravity: -4, drag: 0.98, type: 'rect',
        alpha: 0.85, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 3
      });
    }
  },

  // Crowd confetti — a wide, thin curtain of confetti drifting down from above a
  // cheering crowd. Flutters horizontally as it falls. Mixed rect/star/circle bits.
  // signature: crowdConfetti(x, y, width)
  crowdConfetti(x, y, width) {
    width = width || 360;
    const palette = ['#ff5b6e', '#ffd93d', '#4ecdc4', '#5b8dff', '#c86bff', '#7cff6b', '#ff9f43', '#ffffff'];
    const count = this._budget(Math.round((10 + Math.floor(Math.random() * 6)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const flut = (Math.random() - 0.5) * 70;
      const shape = Math.random();
      this._pushCapped({
        x: x + (Math.random() - 0.5) * width,
        y: y - Math.random() * 30,
        vx: flut,
        vy: 30 + Math.random() * 70,
        life: 2.2 + Math.random() * 2.4,
        size: 2.5 + Math.random() * 3.5, endSize: 2.5 + Math.random() * 2.5,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 60 + Math.random() * 60, drag: 0.99,
        type: shape > 0.6 ? 'rect' : (shape > 0.3 ? 'star' : 'circle'),
        alpha: 0.95, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 16
      });
    }
  },

  // Delivery star — a satisfying "delivered!" burst: a bright expanding ring, a
  // radial fan of golden-green stars and a scatter of confirming sparkles.
  // signature: deliveryStar(x, y, power)
  deliveryStar(x, y, power) {
    power = Math.max(0.3, Math.min(2, power === undefined ? 1 : power));
    // Confirming shock ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.4, size: 5, endSize: 42 * power,
      color: 'rgba(150,255,190,0.55)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#5bffb0'
    });
    // Radial fan of stars.
    const stars = this._budget(Math.round((8 + power * 5) * this._ps()));
    for (let i = 0; i < stars; i++) {
      const a = (i / Math.max(1, stars)) * Math.PI * 2 + Math.random() * 0.3;
      const spd = (90 + Math.random() * 120) * power;
      const green = Math.random() > 0.5;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.5 + Math.random() * 0.5,
        size: 3 + Math.random() * 3, endSize: 0.5,
        color: green ? '#7dffb0' : '#ffe66b',
        gravity: 140, drag: 0.9, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: green ? '#4affa0' : '#ffd24a'
      });
    }
    // Fine confirming sparkles.
    const spk = this._budget(Math.round(5 * this._ps()));
    for (let i = 0; i < spk; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.4 + Math.random() * 0.4,
        size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: '#eafff2', gravity: 60, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#8dffc0'
      });
    }
  },

  // Phase shimmer — a ghostly dash after-image: translucent violet-white echoes
  // trailing a fast phasing/ghost-dash move, with faint drifting shimmer motes.
  // Call each frame during the dash. signature: phaseShimmer(x, y, angle, power)
  phaseShimmer(x, y, angle, power) {
    angle = angle === undefined ? Math.PI : angle;
    power = Math.max(0.2, Math.min(1.5, power === undefined ? 1 : power));
    const ta = angle + Math.PI; // echoes stay behind the travel direction
    const ca = Math.cos(ta), sa = Math.sin(ta);
    // Soft ghost after-image echo.
    this._pushCapped({
      x, y, vx: ca * 20, vy: sa * 20,
      life: 0.28 + Math.random() * 0.18,
      size: 8 + power * 8, endSize: 14 + power * 12,
      color: 'rgba(190,170,255,0.18)', gravity: 0, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14 * power, glowColor: 'rgba(170,140,255,0.5)'
    });
    // Faint shimmer motes peeling off the trail.
    const motes = this._budget(Math.round((2 + power * 3) * this._ps()));
    for (let i = 0; i < motes; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const c = Math.cos(ta + spread), s = Math.sin(ta + spread);
      const spd = (20 + power * 50) * (0.4 + Math.random() * 0.6);
      const cool = Math.random();
      const cr = 190 + (cool * 40 | 0), cg = 160 + (cool * 50 | 0), cb = 255;
      this._pushCapped({
        x: x + ca * (Math.random() * 6), y: y + sa * (Math.random() * 6),
        vx: c * spd, vy: s * spd - 8,
        life: 0.3 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2, endSize: 0.4,
        color: `rgba(${cr},${cg},${cb},0.5)`,
        gravity: 0, drag: 0.92, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: 'rgba(200,170,255,0.6)'
      });
    }
  },

  // Air-brake smoke — a sharp sideways hiss of pale smoke, as from a truck's air
  // brakes: fast low puffs shooting out then billowing and slowing. Slight warm
  // tint of road dust. signature: airBrakeSmoke(x, y, dir, power)
  airBrakeSmoke(x, y, dir, power) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    power = Math.max(0.3, Math.min(1.6, power === undefined ? 1 : power));
    const base = dir < 0 ? Math.PI : 0;
    const count = this._budget(Math.round((5 + power * 6) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = base + (Math.random() - 0.5) * 0.6;
      const spd = (120 + power * 140) * (0.5 + Math.random() * 0.7);
      const shade = 210 + ((Math.random() * 40) | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 5,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 6,
        life: 0.35 + Math.random() * 0.4,
        size: 4 + power * 5, endSize: 18 + power * 18,
        color: `rgba(${shade},${shade},${shade - 8},${(0.24 + Math.random() * 0.16).toFixed(2)})`,
        gravity: -12, drag: 0.9, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
    // A quick bright hiss flash right at the nozzle.
    this._pushCapped({
      x, y, vx: Math.cos(base) * 40, vy: -4,
      life: 0.12, size: 3, endSize: 12,
      color: 'rgba(255,255,255,0.6)', gravity: 0, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ffffff'
    });
  },

  // Coin fountain — a jet of spinning gold coins arcing up and raining back down,
  // for a big payout. Coins are glinting circles with a warm glow; a few pale
  // sparkles ride along. signature: coinFountain(x, y, power)
  coinFountain(x, y, power) {
    power = Math.max(0.3, Math.min(2, power === undefined ? 1 : power));
    const coins = this._budget(Math.round((8 + power * 8) * this._ps()));
    for (let i = 0; i < coins; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.8;
      const spd = (140 + power * 160) * (0.5 + Math.random() * 0.7);
      const bright = Math.random() > 0.5;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14,
        y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 40,
        vy: Math.sin(a) * spd,
        life: 0.9 + Math.random() * 0.8,
        size: 4 + Math.random() * 3, endSize: 3 + Math.random() * 2,
        color: bright ? '#ffe66b' : '#ffc233',
        gravity: 420, drag: 0.99, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 18,
        glow: 7, glowColor: '#ffd24a'
      });
    }
    // Pale glints riding along the fountain.
    const glints = this._budget(Math.round(5 * this._ps()));
    for (let i = 0; i < glints; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const spd = (100 + power * 120) * (0.5 + Math.random() * 0.6);
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2, endSize: 0.4,
        color: '#fffbe0', gravity: 300, drag: 0.98, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
        glow: 6, glowColor: '#ffe66b'
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v9) — mechanical whirls, glints, fields & rewards
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps.
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Windmill whirl — particles flung outward along evenly-spaced rotating arms,
  // tracing a spinning pinwheel with a faint hub ring. Call each frame while spinning.
  // signature: windmillWhirl(x, y, angle, blades, power)
  windmillWhirl(x, y, angle, blades, power) {
    angle = angle === undefined ? 0 : angle;
    blades = Math.max(2, Math.min(8, blades === undefined ? 4 : blades | 0));
    power = Math.max(0.2, Math.min(1.6, power === undefined ? 1 : power));
    const palette = ['#ffe28a', '#8fd0ff', '#ffb3c8', '#b6ffb0'];
    const perArm = this._budget(Math.max(1, Math.round(2 * power * this._ps())));
    for (let b = 0; b < blades; b++) {
      const arm = angle + (b / blades) * Math.PI * 2;
      const ca = Math.cos(arm), sa = Math.sin(arm);
      // tangential velocity (perpendicular to the arm) gives the spinning feel
      const tx = -sa, ty = ca;
      for (let i = 0; i < perArm; i++) {
        const reach = (14 + Math.random() * 26) * power;
        const spin = (120 + Math.random() * 90) * power;
        this._pushCapped({
          x: x + ca * reach, y: y + sa * reach,
          vx: tx * spin + ca * 20, vy: ty * spin + sa * 20,
          life: 0.35 + Math.random() * 0.4,
          size: 2 + Math.random() * 2.4 * power, endSize: 0.5,
          color: palette[b % palette.length],
          gravity: 0, drag: 0.93, type: 'circle',
          alpha: 1, rotation: arm, rotVel: (Math.random() - 0.5) * 8,
          glow: 6, glowColor: palette[b % palette.length]
        });
      }
    }
    // Faint hub ring pulse, only occasionally to keep it cheap.
    if (Math.random() < 0.25) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.3, size: 6 * power, endSize: 34 * power,
        color: 'rgba(255,246,214,0.28)', gravity: 0, drag: 1, type: 'ring',
        alpha: 0.7, rotation: 0, rotVel: 0
      });
    }
  },

  // Solar glint — a crisp lens-flare pop: a bright star core, a few radiating
  // ray streaks and an expanding soft halo ring. signature: solarGlint(x, y, scale)
  solarGlint(x, y, scale) {
    scale = Math.max(0.4, Math.min(2, scale === undefined ? 1 : scale));
    // Bright star core.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.3, size: 5 * scale, endSize: 1,
      color: '#fffdf0', gravity: 0, drag: 1, type: 'star',
      alpha: 1, rotation: Math.PI * 0.25, rotVel: 0.6,
      glow: 22 * scale, glowColor: '#fff0b0'
    });
    // Radiating ray streaks.
    const rays = this._budget(Math.max(3, Math.round(6 * this._ps())));
    for (let i = 0; i < rays; i++) {
      const a = (i / Math.max(1, rays)) * Math.PI * 2 + Math.random() * 0.2;
      const spd = (70 + Math.random() * 70) * scale;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.24 + Math.random() * 0.22,
        size: 1.4 + Math.random() * 1.6, endSize: 0.3,
        color: Math.random() > 0.5 ? '#fff4c4' : '#ffffff',
        gravity: 0, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: '#ffe89a'
      });
    }
    // Soft halo ring blooming outward.
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.38, size: 4 * scale, endSize: 40 * scale,
      color: 'rgba(255,236,170,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ffdf8a'
    });
  },

  // Magnet field — curved field-line motes orbiting a pole, tinted by polarity
  // (red = +, blue = -), plus a pulsing containment ring. Call each frame.
  // signature: magnetField(x, y, radius, polarity)
  magnetField(x, y, radius, polarity) {
    radius = Math.max(10, radius === undefined ? 40 : radius);
    const pos = polarity === undefined ? 1 : (polarity < 0 ? -1 : 1);
    const col = pos > 0 ? 'rgba(255,110,110,' : 'rgba(110,160,255,';
    const glowC = pos > 0 ? '#ff6a6a' : '#6aa0ff';
    const motes = this._budget(Math.max(2, Math.round(6 * this._ps())));
    for (let i = 0; i < motes; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * (0.4 + Math.random() * 0.7);
      const ca = Math.cos(a), sa = Math.sin(a);
      // velocity tangent to the circle -> swirling field-line motion
      const dir = pos > 0 ? 1 : -1;
      const spd = 60 + Math.random() * 60;
      this._pushCapped({
        x: x + ca * r, y: y + sa * r,
        vx: -sa * spd * dir - ca * 20, vy: ca * spd * dir - sa * 20,
        life: 0.4 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2, endSize: 0.4,
        color: col + (0.6 + Math.random() * 0.35).toFixed(2) + ')',
        gravity: 0, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 7, glowColor: glowC
      });
    }
    // Pulsing field boundary ring, sparse.
    if (Math.random() < 0.3) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.5, size: radius * 0.5, endSize: radius * 1.4,
        color: col + '0.25)', gravity: 0, drag: 1, type: 'ring',
        alpha: 0.8, rotation: 0, rotVel: 0, glow: 8, glowColor: glowC
      });
    }
  },

  // Firefly swarm (v2) — a cluster of soft, slow, glowing motes that drift and
  // bob gently with flicker. Call each frame for a living ambience.
  // signature: fireflySwarm2(x, y, spread, count)
  fireflySwarm2(x, y, spread, count) {
    spread = spread === undefined ? 80 : spread;
    const want = count === undefined ? 4 : count;
    const n = this._budget(Math.max(1, Math.round(want * this._ps())));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const drift = 8 + Math.random() * 18;
      const warm = Math.random();
      const g = 210 + (warm * 40 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.7,
        vx: Math.cos(a) * drift, vy: Math.sin(a) * drift - 6,
        life: 1.2 + Math.random() * 1.6,
        size: 1.6 + Math.random() * 1.8, endSize: 0.6,
        color: `rgba(${190 + (warm * 30 | 0)},${g},110,0.9)`,
        gravity: 0, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: 9 + Math.random() * 6, glowColor: '#c8ff64'
      });
    }
  },

  // Victory stars — a jubilant upward fountain of multicolored stars arcing under
  // gravity, laced with fine sparkle glitter and a rising glow ring.
  // signature: victoryStars(x, y, spread)
  victoryStars(x, y, spread) {
    spread = spread || 120;
    const palette = ['#ffd93d', '#ff6b9d', '#5b8dff', '#7cff6b', '#ffae42', '#c86bff'];
    const stars = this._budget(Math.round((10 + Math.floor(Math.random() * 6)) * this._ps()));
    for (let i = 0; i < stars; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.3;
      const spd = 140 + Math.random() * 200;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread * 0.3, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 50,
        vy: Math.sin(a) * spd,
        life: 1.1 + Math.random() * 1.1,
        size: 3.5 + Math.random() * 3.5, endSize: 1,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 260 + Math.random() * 120, drag: 0.99, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: '#fff0b0'
      });
    }
    // Fine sparkle glitter drifting among the stars.
    const glit = this._budget(Math.round(6 * this._ps()));
    for (let i = 0; i < glit; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
        life: 0.6 + Math.random() * 0.6,
        size: 1 + Math.random() * 1.4, endSize: 0.3,
        color: '#fffbe0', gravity: 120, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffe66b'
      });
    }
    // Rising celebratory glow ring.
    this._pushCapped({
      x, y, vx: 0, vy: -30,
      life: 0.55, size: 8, endSize: 46,
      color: 'rgba(255,220,120,0.32)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#ffcf5a'
    });
  },

  // Combo ring — a snappy reward pop whose intensity scales with the combo count:
  // concentric expanding rings plus a matching number of orbiting star pips.
  // signature: comboRing(x, y, combo)
  comboRing(x, y, combo) {
    combo = Math.max(1, Math.min(12, combo === undefined ? 2 : combo | 0));
    const t = combo / 12;
    // Warm-to-hot hue as the combo climbs (yellow -> orange -> pink-red).
    const cr = 255;
    const cg = Math.round(220 - t * 130);
    const cb = Math.round(90 - t * 40);
    const hue = `${cr},${Math.max(40, cg)},${Math.max(40, cb)}`;
    const rings = Math.min(3, 1 + ((combo / 4) | 0));
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.35 + r * 0.08,
        size: 6 + r * 5, endSize: (30 + combo * 5) + r * 16,
        color: `rgba(${hue},${(0.55 - r * 0.15).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0, glow: 10, glowColor: `rgb(${hue})`
      });
    }
    // Orbiting star pips — one per combo step, radiating out.
    const pips = this._budget(Math.max(2, Math.round(combo * this._ps())));
    for (let i = 0; i < pips; i++) {
      const a = (i / Math.max(1, pips)) * Math.PI * 2;
      const spd = 90 + combo * 8 + Math.random() * 40;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.4,
        size: 2.5 + Math.random() * 2, endSize: 0.5,
        color: `rgb(${hue})`,
        gravity: 60, drag: 0.92, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: `rgb(${hue})`
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v7) — cosmic, volcanic & regal flourishes
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps().
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Twinkling starfield — sparse pin-point stars that gently drift and pulse,
  // seeding a calm cosmic backdrop across a region.
  // signature: starfield(x, y, spread, density)
  starfield(x, y, spread, density) {
    spread = spread || 300;
    density = density === undefined ? 1 : Math.max(0.2, Math.min(2, density));
    const stars = this._budget(Math.round((6 + density * 8) * this._ps()));
    for (let i = 0; i < stars; i++) {
      const twinkle = Math.random();
      const cool = twinkle > 0.75;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.6,
        vx: (Math.random() - 0.5) * 6,
        vy: -2 - Math.random() * 6,
        life: 1.2 + Math.random() * 1.8,
        size: 0.6 + Math.random() * 1.8, endSize: 0.2 + Math.random() * 1.2,
        color: cool ? '#bcd4ff' : (Math.random() > 0.5 ? '#ffffff' : '#fff2c8'),
        gravity: 0, drag: 0.995,
        type: Math.random() > 0.82 ? 'star' : 'circle',
        alpha: 0.5 + Math.random() * 0.5, rotation: Math.random() * Math.PI,
        rotVel: (Math.random() - 0.5) * 1.5,
        glow: 4 + twinkle * 6, glowColor: cool ? '#aac6ff' : '#fff4d0'
      });
    }
  },

  // Comet streak — a bright glowing head trailing a fading tail of embers,
  // flung along a heading with a soft dust wake.
  // signature: cometStreak(x, y, angle, power)
  cometStreak(x, y, angle, power) {
    angle = angle === undefined ? Math.PI * 0.75 : angle;
    power = power === undefined ? 1 : Math.max(0.3, Math.min(2, power));
    const spd = 260 * power;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    // Glowing head
    this._pushCapped({
      x, y, vx: ca * spd, vy: sa * spd,
      life: 0.5 + power * 0.25, size: 5 + power * 4, endSize: 2,
      color: 'rgba(255,246,214,0.95)',
      gravity: 0, drag: 0.985, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22 + power * 12, glowColor: '#9fd0ff'
    });
    // Tail embers, thrown slightly backward from the head
    const tail = this._budget(Math.round((8 + power * 6) * this._ps()));
    for (let i = 0; i < tail; i++) {
      const back = i / Math.max(1, tail);
      const jitter = (Math.random() - 0.5) * 0.5;
      const ta = angle + Math.PI + jitter;
      const tspd = (30 + Math.random() * 70) * power;
      const warm = Math.random();
      this._pushCapped({
        x: x - ca * back * 22, y: y - sa * back * 22,
        vx: ca * spd * 0.4 + Math.cos(ta) * tspd,
        vy: sa * spd * 0.4 + Math.sin(ta) * tspd,
        life: 0.3 + Math.random() * 0.5 * power,
        size: 1.5 + Math.random() * 3 * power, endSize: 0.3,
        color: warm > 0.5 ? '#a9d4ff' : '#ffe8b0',
        gravity: 0, drag: 0.93, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: 8, glowColor: warm > 0.5 ? '#7fbfff' : '#ffd27a'
      });
    }
  },

  // Volcano spit — molten blobs launched upward that arc under gravity, with
  // a rising smoke column and a few glowing sparks.
  // signature: volcanoSpit(x, y, power)
  volcanoSpit(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(2, power));
    // Molten lava blobs
    const blobs = this._budget(Math.round((5 + power * 6) * this._ps()));
    for (let i = 0; i < blobs; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.1;
      const spd = (120 + Math.random() * 180) * power;
      const hot = Math.random();
      const cg = 60 + (hot * 120 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.7,
        size: 3 + Math.random() * 5 * power, endSize: 1 + Math.random() * 2,
        color: `rgb(255,${cg},30)`,
        gravity: 620, drag: 0.995, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 6,
        glow: 10 + hot * 8, glowColor: '#ff7a1a'
      });
    }
    // Rising smoke column
    const smoke = this._budget(Math.round((3 + power * 3) * this._ps()));
    for (let i = 0; i < smoke; i++) {
      const s = 40 + (Math.random() * 30 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y: y - Math.random() * 10,
        vx: (Math.random() - 0.5) * 24, vy: -40 - Math.random() * 50 * power,
        life: 1.1 + Math.random() * 1.1,
        size: 8 + Math.random() * 8, endSize: 30 + Math.random() * 26,
        color: `rgba(${s},${s - 6},${s - 10},0.4)`,
        gravity: -20, drag: 0.96, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.4
      });
    }
    // Bright ember sparks
    const sparks = this._budget(Math.round(4 * this._ps()));
    for (let i = 0; i < sparks; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      const spd = 160 + Math.random() * 160;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.4 + Math.random() * 0.4,
        size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: '#ffd24a',
        gravity: 400, drag: 0.92, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 9, glowColor: '#ff8c1a'
      });
    }
  },

  // Royal confetti — a lavish, heraldic burst of gold/crimson/purple ribbons and
  // star sequins with a shimmer of fine gold dust; grander than confettiRain.
  // signature: royalConfetti(x, y, spread)
  royalConfetti(x, y, spread) {
    spread = spread || 240;
    const palette = ['#f4c542', '#ffd970', '#b3122c', '#7a1fa2', '#e8e2d0', '#c9a227'];
    const count = this._budget(Math.round((16 + Math.floor(Math.random() * 8)) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.7;
      const spd = 140 + Math.random() * 240;
      const roll = Math.random();
      const col = palette[(Math.random() * palette.length) | 0];
      const gold = col === '#f4c542' || col === '#ffd970' || col === '#c9a227';
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread * 0.35, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 70,
        vy: Math.sin(a) * spd,
        life: 1.8 + Math.random() * 2.0,
        size: 3 + Math.random() * 5, endSize: 2.5 + Math.random() * 3,
        color: col,
        gravity: 140 + Math.random() * 90, drag: 0.985,
        type: roll > 0.55 ? 'rect' : (roll > 0.25 ? 'star' : 'circle'),
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 16,
        glow: gold ? 6 : 0, glowColor: '#ffdf7a'
      });
    }
    // Fine drifting gold dust for a regal shimmer
    const dust = this._budget(Math.round(6 * this._ps()));
    for (let i = 0; i < dust; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 60;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.9 + Math.random() * 0.9,
        size: 0.8 + Math.random() * 1.4, endSize: 0.3,
        color: '#ffe9a8',
        gravity: 30, drag: 0.95, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 5, glowColor: '#ffd24a'
      });
    }
  },

  // Energy pulse — concentric expanding rings plus a radial spray of charged
  // motes, a clean sci-fi power surge tinted by an optional "r,g,b" hue string.
  // signature: energyPulse(x, y, power, hue)
  energyPulse(x, y, power, hue) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(2, power));
    const rgb = hue || '90,200,255';
    // Expanding concentric rings
    const rings = Math.min(3, 1 + Math.round(power));
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.32 + r * 0.09,
        size: 5 + r * 5, endSize: (44 + power * 26) + r * 20,
        color: `rgba(${rgb},${(0.5 - r * 0.13).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: `rgb(${rgb})`
      });
    }
    // Charged motes flung radially, curving as they slow
    const motes = this._budget(Math.round((8 + power * 8) * this._ps()));
    for (let i = 0; i < motes; i++) {
      const a = (i / Math.max(1, motes)) * Math.PI * 2 + Math.random() * 0.3;
      const spd = (90 + Math.random() * 110) * power;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.35 + Math.random() * 0.45,
        size: 1.5 + Math.random() * 2.5, endSize: 0.3,
        color: `rgb(${rgb})`,
        gravity: 0, drag: 0.9, type: Math.random() > 0.7 ? 'star' : 'circle',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 8,
        glow: 8, glowColor: `rgb(${rgb})`
      });
    }
    // Bright core flash
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.18, size: 3 + power * 3, endSize: 14 + power * 8,
      color: `rgba(${rgb},0.85)`,
      gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 20, glowColor: `rgb(${rgb})`
    });
  },

  // Drift smoke — slow, soft, low-density ambient smoke that lazily rises and
  // widens, ideal for smouldering wrecks or lingering atmosphere.
  // signature: driftSmoke(x, y, amount, tint)
  driftSmoke(x, y, amount, tint) {
    amount = amount === undefined ? 1 : Math.max(0.2, Math.min(2, amount));
    if (Math.random() > 0.55) return;
    let r = 70, g = 70, b = 74;
    if (tint === 'dark') { r = 34; g = 34; b = 36; }
    else if (tint === 'toxic') { r = 96; g = 122; b = 60; }
    else if (tint === 'steam') { r = 220; g = 226; b = 236; }
    const puffs = this._budget(Math.round((2 + amount * 3) * this._ps()));
    for (let i = 0; i < puffs; i++) {
      const shade = 0.8 + Math.random() * 0.4;
      const alpha = (0.1 + amount * 0.12) * (0.7 + Math.random() * 0.5);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 14,
        vy: -14 - Math.random() * 22 * amount,
        life: 1.6 + Math.random() * 1.8,
        size: 6 + Math.random() * 8, endSize: 26 + Math.random() * 28,
        color: `rgba(${Math.floor(r * shade)},${Math.floor(g * shade)},${Math.floor(b * shade)},${alpha.toFixed(2)})`,
        gravity: -8 - amount * 6, drag: 0.97, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 0.9
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v7) — ambient waves, sparks, bubbles & big wins
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps().
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Aurora wave — a slow horizontal band of luminous, drifting ribbons that sway
  // like northern lights. Soft additive glow, gentle vertical bob. Ambient.
  // signature: auroraWave(x, y, width, hue, t)
  auroraWave(x, y, width, hue, t) {
    width = width || 320;
    hue = hue === undefined ? 150 : hue;
    t = t || 0;
    if (Math.random() > 0.6) return;
    const ribbons = this._budget(Math.round((2 + Math.floor(Math.random() * 3)) * this._ps()));
    for (let i = 0; i < ribbons; i++) {
      const px = x + (Math.random() - 0.5) * width;
      const phase = (px - x) / width;
      const h = (hue + phase * 60 + (Math.random() - 0.5) * 30) % 360;
      const sway = Math.sin(t * 1.4 + phase * 6) * 12;
      this._pushCapped({
        x: px, y: y + Math.sin(t * 0.8 + i) * 10,
        vx: sway * 0.6 + (Math.random() - 0.5) * 6,
        vy: -6 - Math.random() * 10,
        life: 1.8 + Math.random() * 1.8,
        size: 10 + Math.random() * 16, endSize: 26 + Math.random() * 30,
        color: `hsla(${h | 0},80%,62%,0.12)`,
        gravity: -3, drag: 0.98, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 0.5,
        glow: 22, glowColor: `hsla(${h | 0},85%,60%,0.5)`
      });
    }
  },

  // Spark shower — a downward-raining cascade of hot metallic sparks (like a
  // grinder or welding shower), each leaving a short bright glow and gravity pull.
  // signature: sparkShower(x, y, dir, intensity)
  sparkShower(x, y, dir, intensity) {
    dir = dir === undefined ? 1 : (dir < 0 ? -1 : 1);
    intensity = intensity === undefined ? 1 : Math.max(0.2, Math.min(2, intensity));
    const count = this._budget(Math.round((5 + intensity * 9) * this._ps()));
    for (let i = 0; i < count; i++) {
      const a = (dir < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.1 + Math.PI * 0.15;
      const spd = (120 + intensity * 180) * (0.4 + Math.random() * 0.8);
      const hot = Math.random();
      const cr = 255, cg = 180 + (hot * 70 | 0), cb = 60 + (hot * 120 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.3 + Math.random() * 0.4,
        size: 1.4 + Math.random() * 2, endSize: 0.4,
        color: `rgb(${cr},${cg},${cb})`,
        gravity: 420, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: 8, glowColor: '#ffcf6a'
      });
    }
  },

  // Bubble stream — a rising column of translucent bubbles with a rim highlight
  // (underwater / submersion flavor). Wobbles side to side as it ascends.
  // signature: bubbleStream(x, y, rate, t)
  bubbleStream(x, y, rate, t) {
    rate = rate === undefined ? 1 : Math.max(0.2, Math.min(2, rate));
    t = t || 0;
    if (Math.random() > 0.5 * rate) return;
    const count = this._budget(Math.round((2 + rate * 3) * this._ps()));
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 7;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 18,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.sin(t * 3 + i) * 12 + (Math.random() - 0.5) * 8,
        vy: -40 - Math.random() * 60 * rate,
        life: 1.0 + Math.random() * 1.4,
        size: r, endSize: r * 1.4,
        color: 'rgba(190,225,255,0.32)',
        gravity: -30, drag: 0.99, type: 'ring',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.2,
        glow: 6, glowColor: 'rgba(220,240,255,0.6)'
      });
    }
  },

  // Crown glint — a regal sweep of golden star glints radiating from a point, as
  // if a crown or trophy caught the light. A quick sparkle plus a soft halo ring.
  // signature: crownGlint(x, y, power)
  crownGlint(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(2, power));
    const glints = this._budget(Math.round((5 + power * 5) * this._ps()));
    for (let i = 0; i < glints; i++) {
      const a = (i / Math.max(1, glints)) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const spd = (30 + Math.random() * 70) * power;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.5,
        size: 3 + Math.random() * 4 * power, endSize: 0.5,
        color: Math.random() > 0.35 ? '#ffe066' : '#fff6c0',
        gravity: 40, drag: 0.9, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 10,
        glow: 12, glowColor: '#ffd24a'
      });
    }
    // Soft expanding halo ring
    this._pushCapped({
      x, y, vx: 0, vy: -6,
      life: 0.45, size: 5 * power, endSize: 40 * power,
      color: 'rgba(255,220,120,0.4)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: '#ffcf5a'
    });
  },

  // Dash trail — a streak of receding after-image squares left behind a fast
  // dash/boost, fading and shrinking. Directional, colorable, cheap.
  // signature: dashTrail(x, y, angle, speed, color)
  dashTrail(x, y, angle, speed, color) {
    angle = angle === undefined ? Math.PI : angle;
    speed = speed === undefined ? 1 : Math.max(0.2, Math.min(2, speed));
    color = color || '#7fd0ff';
    const count = this._budget(Math.round((3 + speed * 4) * this._ps()));
    const back = angle + Math.PI;
    for (let i = 0; i < count; i++) {
      const off = i * (4 + speed * 3);
      const spd = (20 + speed * 40) * (0.3 + Math.random() * 0.5);
      this._pushCapped({
        x: x + Math.cos(back) * off + (Math.random() - 0.5) * 6,
        y: y + Math.sin(back) * off + (Math.random() - 0.5) * 6,
        vx: Math.cos(back) * spd, vy: Math.sin(back) * spd,
        life: 0.2 + Math.random() * 0.25,
        size: 5 + speed * 5 - i * 0.4, endSize: 1,
        color: color,
        gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: angle, rotVel: 0,
        glow: 10, glowColor: color
      });
    }
  },

  // Prize explosion — a big celebratory burst: an outward ring shock, a radial
  // fan of colored stars, and drifting confetti. For jackpots / big rewards.
  // signature: prizeExplosion(x, y, power)
  prizeExplosion(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.4, Math.min(2, power));
    const palette = ['#ff5b6e', '#ffd93d', '#4ecdc4', '#5b8dff', '#c86bff', '#7cff6b', '#ff9f43'];
    // Shock ring(s)
    const rings = power > 1.3 ? 2 : 1;
    for (let r = 0; r < rings; r++) {
      this._pushCapped({
        x, y, vx: 0, vy: 0,
        life: 0.4 + r * 0.12, size: 6 + r * 4, endSize: (70 + r * 26) * power,
        color: `rgba(255,240,190,${(0.5 - r * 0.18).toFixed(2)})`,
        gravity: 0, drag: 1, type: 'ring',
        alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: '#ffe89a'
      });
    }
    // Radial fan of stars
    const stars = this._budget(Math.round((12 + power * 10) * this._ps()));
    for (let i = 0; i < stars; i++) {
      const a = (i / Math.max(1, stars)) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const spd = (120 + Math.random() * 200) * power;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.7 + Math.random() * 0.7,
        size: 3 + Math.random() * 4, endSize: 0.5,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 220, drag: 0.93, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: '#fff2b0'
      });
    }
    // Fluttering confetti
    const conf = this._budget(Math.round((8 + power * 6) * this._ps()));
    for (let i = 0; i < conf; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.8;
      const spd = (90 + Math.random() * 160) * power;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 50,
        vy: Math.sin(a) * spd,
        life: 1.4 + Math.random() * 1.6,
        size: 3 + Math.random() * 4, endSize: 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 150 + Math.random() * 70, drag: 0.985,
        type: Math.random() > 0.5 ? 'rect' : 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14
      });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v-themed) — event, combat & reward flourishes
  // All push plain particle objects into this.pool via _pushCapped and are driven
  // by the existing update()/draw() lifecycle. Perf-capped via _budget / _ps().
  // Types used are limited to circle / rect / ring / star. Nothing above changes.
  // ═══════════════════════════════════════════════════════════════════════════

  // Pirate spark — a burst of gunpowder embers with drifting blue-grey smoke, like
  // a flintlock flash or a lit cannon fuse. Hot orange sparks arc out and fall.
  // signature: pirateSpark(x, y, power)
  pirateSpark(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.3, Math.min(2, power));
    const sparks = this._budget(Math.round((6 + power * 8) * this._ps()));
    for (let i = 0; i < sparks; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.2;
      const spd = (60 + Math.random() * 160) * power;
      const hot = Math.random();
      const cg = 150 + (hot * 90 | 0), cb = 30 + (hot * 80 | 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.3 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5, endSize: 0.3,
        color: `rgb(255,${cg},${cb})`,
        gravity: 340, drag: 0.93, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0,
        glow: 9, glowColor: '#ffb347'
      });
    }
    // Drifting gunpowder smoke puffs
    const smoke = this._budget(Math.round((2 + power * 2) * this._ps()));
    for (let i = 0; i < smoke; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 24, vy: -18 - Math.random() * 26,
        life: 0.7 + Math.random() * 0.8,
        size: 6 + Math.random() * 6, endSize: 20 + Math.random() * 18,
        color: 'rgba(120,124,132,0.28)',
        gravity: -16, drag: 0.96, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 1.4
      });
    }
  },

  // Samurai slash — a thin bright blade-glint arc sweeping along a given angle and
  // trailing a few flung sparks off the tip. Fast, sharp, directional.
  // signature: samuraiSlash(x, y, angle, length)
  samuraiSlash(x, y, angle, length) {
    angle = angle === undefined ? -Math.PI * 0.25 : angle;
    length = length === undefined ? 1 : Math.max(0.4, Math.min(2, length));
    const seg = Math.max(4, this._budget(Math.round((10 + length * 8) * this._ps())));
    const perp = angle + Math.PI * 0.5;
    const reach = 40 + length * 70;
    for (let i = 0; i < seg; i++) {
      const t = i / Math.max(1, seg - 1);
      const bow = Math.sin(t * Math.PI) * 10; // arc bulge across the sweep
      const px = x + Math.cos(angle) * (reach * (t - 0.5) * 2) + Math.cos(perp) * bow;
      const py = y + Math.sin(angle) * (reach * (t - 0.5) * 2) + Math.sin(perp) * bow;
      this._pushCapped({
        x: px, y: py,
        vx: Math.cos(perp) * (10 + Math.random() * 20),
        vy: Math.sin(perp) * (10 + Math.random() * 20) - 10,
        life: 0.18 + Math.random() * 0.22,
        size: 2 + Math.random() * 3, endSize: 0.4,
        color: Math.random() > 0.3 ? '#eaf4ff' : '#bfe0ff',
        gravity: 20, drag: 0.9, type: 'rect',
        alpha: 1, rotation: angle, rotVel: 0,
        glow: 12, glowColor: '#cfe8ff'
      });
    }
    const tip = this._budget(Math.round(4 * this._ps()));
    for (let i = 0; i < tip; i++) {
      const a = angle + (Math.random() - 0.5) * 0.6;
      const spd = 120 + Math.random() * 120;
      this._pushCapped({
        x: x + Math.cos(angle) * reach, y: y + Math.sin(angle) * reach,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.2 + Math.random() * 0.3,
        size: 1.5 + Math.random() * 2, endSize: 0.3,
        color: '#ffffff',
        gravity: 260, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14,
        glow: 8, glowColor: '#dfefff'
      });
    }
  },

  // Treasure burst — an eruption of tumbling gold coins (rings) plus star glints and
  // a warm rising halo, for chest opens / big rewards. Coins spin and fall.
  // signature: treasureBurst(x, y, power)
  treasureBurst(x, y, power) {
    power = power === undefined ? 1 : Math.max(0.4, Math.min(2, power));
    const coins = this._budget(Math.round((10 + power * 12) * this._ps()));
    for (let i = 0; i < coins; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.6;
      const spd = (100 + Math.random() * 150) * power;
      const gold = Math.random() > 0.4;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd + (Math.random() - 0.5) * 40,
        vy: Math.sin(a) * spd,
        life: 0.9 + Math.random() * 0.8,
        size: 4 + Math.random() * 4 * power, endSize: 3 + Math.random() * 3,
        color: gold ? 'rgba(255,205,70,0.95)' : 'rgba(255,235,150,0.95)',
        gravity: 300 + Math.random() * 120, drag: 0.985, type: 'ring',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 16,
        glow: 8, glowColor: '#ffd24a'
      });
    }
    const glints = this._budget(Math.round(6 * power * this._ps()));
    for (let i = 0; i < glints; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 90;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 40,
        life: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 3, endSize: 0.4,
        color: '#fff3b0',
        gravity: 60, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 10, glowColor: '#ffe066'
      });
    }
    this._pushCapped({
      x, y, vx: 0, vy: -14,
      life: 0.5, size: 8 * power, endSize: 46 * power,
      color: 'rgba(255,215,110,0.34)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 18, glowColor: '#ffcf5a'
    });
  },

  // Flag wave — a ripple of small cloth squares peeling off a waving banner, drifting
  // on the wind with a sinusoidal sway. Colorable. Ambient / victory flavor.
  // signature: flagWave(x, y, color, wind, t)
  flagWave(x, y, color, wind, t) {
    color = color || '#e23b3b';
    wind = wind === undefined ? 50 : wind;
    t = t || 0;
    if (Math.random() > 0.55) return;
    const bits = this._budget(Math.round((2 + Math.floor(Math.random() * 3)) * this._ps()));
    for (let i = 0; i < bits; i++) {
      const phase = Math.random();
      const sway = Math.sin(t * 3 + phase * 6) * 18;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 18,
        vx: wind * (0.4 + Math.random() * 0.6) + sway,
        vy: -6 + Math.random() * 16 + Math.cos(t * 2 + phase * 5) * 6,
        life: 0.9 + Math.random() * 1.1,
        size: 4 + Math.random() * 5, endSize: 3 + Math.random() * 3,
        color,
        gravity: 20, drag: 0.98, type: 'rect',
        alpha: 0.9, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 6
      });
    }
  },

  // Boost shock — an expanding shock ring plus a forward cone of speed streaks when
  // a boost fires. Directional and energetic. Ring for the shock, rect for streaks.
  // signature: boostShock(x, y, angle, power, color)
  boostShock(x, y, angle, power, color) {
    angle = angle === undefined ? Math.PI : angle;
    power = power === undefined ? 1 : Math.max(0.4, Math.min(2, power));
    color = color || '#66d9ff';
    // Expanding shock ring
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.3 + power * 0.12, size: 6 * power, endSize: 60 * power,
      color: 'rgba(120,215,255,0.5)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: color
    });
    // Forward cone of speed streaks
    const streaks = this._budget(Math.round((5 + power * 8) * this._ps()));
    for (let i = 0; i < streaks; i++) {
      const a = angle + (Math.random() - 0.5) * 0.6;
      const spd = (140 + Math.random() * 160) * power;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.2 + Math.random() * 0.28,
        size: 2 + Math.random() * 3, endSize: 0.4,
        color,
        gravity: 0, drag: 0.9, type: 'rect',
        alpha: 1, rotation: a, rotVel: 0,
        glow: 10, glowColor: '#bfefff'
      });
    }
  },

  // Medal shine — a slow, proud sparkle sweep: a rotating fan of star glints plus a
  // lingering soft halo. level 1=bronze, 2=silver, 3=gold tones. Celebratory.
  // signature: medalShine(x, y, level, t)
  medalShine(x, y, level, t) {
    level = level === undefined ? 1 : Math.max(1, Math.min(3, Math.round(level)));
    t = t || 0;
    const tone = level >= 3 ? '#fff0a0' : level === 2 ? '#e8eef5' : '#ffcf8a';
    const glowC = level >= 3 ? '#ffdf70' : level === 2 ? '#dfe8f2' : '#e8a15a';
    const rays = this._budget(Math.round((4 + level * 2) * this._ps()));
    for (let i = 0; i < rays; i++) {
      const a = (i / Math.max(1, rays)) * Math.PI * 2 + t * 0.8;
      const spd = 25 + Math.random() * 45;
      this._pushCapped({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 15,
        life: 0.5 + Math.random() * 0.5,
        size: 2.5 + Math.random() * 3, endSize: 0.4,
        color: tone,
        gravity: 30, drag: 0.9, type: 'star',
        alpha: 1, rotation: a, rotVel: (Math.random() - 0.5) * 8,
        glow: 11, glowColor: glowC
      });
    }
    // Lingering soft halo
    this._pushCapped({
      x, y, vx: 0, vy: -4,
      life: 0.6, size: 6, endSize: 30 + level * 6,
      color: 'rgba(255,235,170,0.3)',
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 16, glowColor: glowC
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIVE ORIGINAL EFFECTS (v7) — tribal glow, treats, flags & flourishes
  // All push plain particles via _pushCapped (draw-guard-safe types only:
  // circle / rect / ring / star) and are perf-capped via _ps() + _budget().
  // Nothing above is modified; these are new, self-contained signatures.
  // ═══════════════════════════════════════════════════════════════════════════

  // Tribal totem glow — a warm, pulsing ceremonial aura: a soft breathing ring,
  // a cluster of slowly rising ember motes and a few glowing rune-glyph flecks
  // (small rects) orbiting the core. `hue` picks the warm tint (0=amber,
  // 1=crimson, 2=jade); `t` advances the orbit. signature: tribalGlow(x, y, hue, t)
  tribalGlow(x, y, hue, t) {
    t = t || 0;
    hue = hue === undefined ? 0 : (hue | 0) % 3;
    const ps = this._ps();
    let core = '#ffb347', glowC = '#ff8c1a';
    if (hue === 1) { core = '#ff5a6a'; glowC = '#c81e2e'; }
    else if (hue === 2) { core = '#6de0a0'; glowC = '#1e9b6b'; }
    // Breathing aura ring (pulse driven by t).
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    this._pushCapped({
      x, y, vx: 0, vy: 0,
      life: 0.5, size: 8 + pulse * 6, endSize: 30 + pulse * 22,
      color: `rgba(255,180,90,${(0.22 + pulse * 0.2).toFixed(2)})`,
      gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 14, glowColor: glowC
    });
    // Rising ember motes.
    const embers = this._budget(Math.round((4 + pulse * 4) * ps));
    for (let i = 0; i < embers; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 0.9;
      const spd = 20 + Math.random() * 45;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd + Math.sin(t * 2 + i) * 8, vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.7, size: 1.5 + Math.random() * 2.5, endSize: 0.3,
        color: Math.random() > 0.5 ? core : '#ffe0a0',
        gravity: -34, drag: 0.96, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 8, glowColor: glowC
      });
    }
    // Orbiting rune-glyph flecks (small tumbling rects).
    const runes = this._budget(Math.round(3 * ps));
    for (let i = 0; i < runes; i++) {
      const ang = (i / Math.max(1, runes)) * Math.PI * 2 + t * 1.6;
      const radius = 16 + Math.random() * 8;
      this._pushCapped({
        x: x + Math.cos(ang) * radius, y: y + Math.sin(ang) * radius * 0.6,
        vx: -Math.sin(ang) * 30, vy: Math.cos(ang) * 18 - 10,
        life: 0.5 + Math.random() * 0.4, size: 3 + Math.random() * 2, endSize: 0.5,
        color: core, gravity: -6, drag: 0.95, type: 'rect',
        alpha: 1, rotation: ang, rotVel: (Math.random() - 0.5) * 8,
        glow: 6, glowColor: glowC
      });
    }
  },

  // Candy rain — a cheerful shower of pastel treats: bouncy candy drops in mixed
  // shapes (circle drops, rect wrappers, star sprinkles) fluttering down with a
  // gentle sway. `spread` sets horizontal scatter. signature: candyRain(x, y, spread)
  candyRain(x, y, spread) {
    spread = spread || 160;
    const ps = this._ps();
    const palette = ['#ff9ecd', '#a0e7ff', '#ffe08a', '#b5f5b0', '#d0a6ff', '#ffb3a0'];
    const count = this._budget(Math.round((10 + Math.floor(Math.random() * 6)) * ps));
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const shape = r > 0.6 ? 'circle' : (r > 0.3 ? 'rect' : 'star');
      const sway = (Math.random() - 0.5) * 40;
      this._pushCapped({
        x: x + (Math.random() - 0.5) * spread, y: y - Math.random() * 30,
        vx: sway, vy: 40 + Math.random() * 80,
        life: 1.4 + Math.random() * 1.4,
        size: 3 + Math.random() * 4, endSize: 3 + Math.random() * 3,
        color: palette[(Math.random() * palette.length) | 0],
        gravity: 130 + Math.random() * 70, drag: 0.99, type: shape,
        alpha: 1, rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 10, glow: 4, glowColor: '#ffffff'
      });
    }
  },

  // Checkered finish-flag wave — a rippling burst of alternating black & white
  // squares thrown in a wave (finish line / lap complete), plus a couple of
  // bright victory glints. `dir` sets throw direction, `t` phases the ripple.
  // signature: checkeredFlag(x, y, dir, t)
  checkeredFlag(x, y, dir, t) {
    dir = dir === undefined ? 1 : (dir < 0 ? -1 : 1);
    t = t || 0;
    const ps = this._ps();
    const squares = this._budget(Math.round((10 + Math.floor(Math.random() * 6)) * ps));
    for (let i = 0; i < squares; i++) {
      const f = i / Math.max(1, squares);
      const wave = Math.sin(f * Math.PI * 3 + t * 4) * 26;
      const a = -Math.PI * 0.5 + dir * (0.3 + Math.random() * 0.8);
      const spd = 90 + Math.random() * 150;
      const black = (i % 2 === 0);
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 14, y: y + wave * 0.4,
        vx: Math.cos(a) * spd + dir * 30, vy: Math.sin(a) * spd + wave,
        life: 0.8 + Math.random() * 0.7,
        size: 4 + Math.random() * 4, endSize: 3 + Math.random() * 2,
        color: black ? '#1a1a1a' : '#f4f4f4',
        gravity: 120 + Math.random() * 80, drag: 0.985, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 14
      });
    }
    // Victory glints riding the flag.
    const glints = this._budget(Math.round(3 * ps));
    for (let i = 0; i < glints; i++) {
      const a = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
      const spd = 60 + Math.random() * 90;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 20,
        life: 0.4 + Math.random() * 0.35, size: 2 + Math.random() * 2, endSize: 0.3,
        color: '#ffffff', gravity: 60, drag: 0.92, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 12,
        glow: 8, glowColor: '#e0e8ff'
      });
    }
  },

  // Engine backfire blast — a punchier exhaust detonation than backfirePuff: a
  // bright orange muzzle flash, an expanding smoke ring, a fan of flame licks and
  // a trailing plume of dark soot. `power` scales the blast. New, standalone.
  // signature: engineBackfire(x, y, dir, power)
  engineBackfire(x, y, dir, power) {
    dir = dir === undefined ? -1 : (dir < 0 ? -1 : 1);
    power = power === undefined ? 1 : Math.max(0.3, Math.min(1.6, power));
    const ps = this._ps();
    const base = dir < 0 ? Math.PI : 0;
    // Bright muzzle flash core.
    this._pushCapped({
      x, y, vx: dir * 60, vy: -12, life: 0.18, size: 6 + power * 5, endSize: 20 + power * 12,
      color: 'rgba(255,180,70,0.92)', gravity: -20, drag: 0.9, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 22 + power * 8, glowColor: '#ff8c1a'
    });
    // Quick expanding smoke ring.
    this._pushCapped({
      x, y, vx: dir * 20, vy: -6, life: 0.3, size: 5, endSize: 30 + power * 20,
      color: 'rgba(120,110,105,0.35)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ffae4a'
    });
    // Fan of flame licks.
    const flames = this._budget(Math.round((5 + power * 4) * ps));
    for (let i = 0; i < flames; i++) {
      const a = base + (Math.random() - 0.5) * 1.0;
      const spd = (90 + Math.random() * 120) * power;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 22,
        life: 0.2 + Math.random() * 0.2, size: 3 + Math.random() * 4, endSize: 1,
        color: Math.random() > 0.5 ? '#ffcf3a' : '#ff5a1a',
        gravity: -28, drag: 0.9, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 10, glowColor: '#ffb03a'
      });
    }
    // Trailing soot plume.
    const soot = this._budget(Math.round((4 + power * 3) * ps));
    for (let i = 0; i < soot; i++) {
      const a = base + (Math.random() - 0.5) * 1.2;
      const spd = (35 + Math.random() * 60) * power;
      const g = 28 + (Math.random() * 34 | 0);
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 16,
        life: 0.55 + Math.random() * 0.5, size: 5 + Math.random() * 5, endSize: 16 + Math.random() * 12,
        color: `rgba(${g},${g},${g},0.5)`, gravity: -20, drag: 0.94, type: 'circle',
        alpha: 1, rotation: Math.random() * Math.PI, rotVel: (Math.random() - 0.5) * 2
      });
    }
  },

  // Crown fall — a regal cascade: golden crown stars tumbling down with fluttering
  // jewel flecks (rects) and fine glinting sparkles (a royal reward / king-of-the-
  // hill flourish). `count` scales the shower. signature: crownFall(x, y, count)
  crownFall(x, y, count) {
    const ps = this._ps();
    const want = count === undefined ? 6 : Math.max(1, Math.min(14, count | 0));
    const crowns = this._budget(Math.round(want * ps));
    for (let i = 0; i < crowns; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 90, y: y - Math.random() * 40,
        vx: (Math.random() - 0.5) * 50, vy: 20 + Math.random() * 50,
        life: 1.3 + Math.random() * 1.2,
        size: 5 + Math.random() * 4, endSize: 3 + Math.random() * 2,
        color: Math.random() > 0.4 ? '#ffd24a' : '#ffe680',
        gravity: 150 + Math.random() * 70, drag: 0.99, type: 'star',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 8,
        glow: 10, glowColor: '#ffb400'
      });
    }
    // Fluttering jewel flecks.
    const jewels = this._budget(Math.round(5 * ps));
    const gems = ['#ff5a6a', '#4dd2ff', '#6dff8a', '#c86bff'];
    for (let i = 0; i < jewels; i++) {
      this._pushCapped({
        x: x + (Math.random() - 0.5) * 70, y: y - Math.random() * 20,
        vx: (Math.random() - 0.5) * 60, vy: 30 + Math.random() * 60,
        life: 1.0 + Math.random() * 1.0,
        size: 2.5 + Math.random() * 2.5, endSize: 2,
        color: gems[(Math.random() * gems.length) | 0],
        gravity: 170 + Math.random() * 60, drag: 0.99, type: 'rect',
        alpha: 1, rotation: Math.random() * Math.PI * 2, rotVel: (Math.random() - 0.5) * 12,
        glow: 5, glowColor: '#ffffff'
      });
    }
    // Fine gold glints.
    const glints = this._budget(Math.round(6 * ps));
    for (let i = 0; i < glints; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 60;
      this._pushCapped({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 30,
        life: 0.6 + Math.random() * 0.5, size: 1 + Math.random() * 1.5, endSize: 0.3,
        color: '#fffbe0', gravity: 80, drag: 0.94, type: 'circle',
        alpha: 1, rotation: 0, rotVel: 0, glow: 6, glowColor: '#ffe66b'
      });
    }
  },

  // Victory spiral — a swirling galaxy of colored stars flung out along a
  // logarithmic spiral, wrapped by a soft expanding ring and a bright core: a
  // hypnotic win / level-up flourish whose arms rotate with `t`.
  // signature: winSpiral(x, y, t)
  winSpiral(x, y, t) {
    t = t || 0;
    const ps = this._ps();
    const palette = ['#ff4d6d', '#ffd24a', '#4dd2ff', '#6dff8a', '#c86bff', '#ff8a3a'];
    // Bright core.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.24, size: 9, endSize: 1,
      color: 'rgba(255,255,240,0.95)', gravity: 0, drag: 1, type: 'circle',
      alpha: 1, rotation: 0, rotVel: 0, glow: 20, glowColor: '#fff3b0'
    });
    // Soft expanding ring.
    this._pushCapped({
      x, y, vx: 0, vy: 0, life: 0.5, size: 8, endSize: 72,
      color: 'rgba(255,240,200,0.4)', gravity: 0, drag: 1, type: 'ring',
      alpha: 1, rotation: 0, rotVel: 0, glow: 12, glowColor: '#ffe066'
    });
    // Two spiral arms of stars.
    const arms = 2;
    const perArm = Math.max(4, this._budget(Math.round(9 * ps)));
    for (let arm = 0; arm < arms; arm++) {
      const armOff = (arm / arms) * Math.PI * 2 + t * 1.2;
      const col = palette[(arm + (Math.random() * 3 | 0)) % palette.length];
      for (let i = 0; i < perArm; i++) {
        const f = i / perArm;
        const ang = armOff + f * Math.PI * 2.2;          // spiral sweep
        const spd = 40 + f * 180;                        // outer stars faster
        this._pushCapped({
          x, y,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 10,
          life: 0.6 + f * 0.5 + Math.random() * 0.3,
          size: 2 + (1 - f) * 3, endSize: 0.4,
          color: Math.random() > 0.25 ? col : '#ffffff',
          gravity: 40, drag: 0.94, type: 'star',
          alpha: 1, rotation: ang, rotVel: (Math.random() - 0.5) * 10,
          glow: 8, glowColor: col
        });
      }
    }
  },

  // Preset configurations for different quality levels
  presets: {
    light: {
      maxParticles: 150,
      spawnRate: 0.3,
      description: 'Low-end devices, minimal particle effects',
      apply(P) {
        P.setMaxParticles(150);
        P._spawnRate = 0.3;
      }
    },
    medium: {
      maxParticles: 350,
      spawnRate: 0.65,
      description: 'Mid-range devices, balanced effects',
      apply(P) {
        P.setMaxParticles(350);
        P._spawnRate = 0.65;
      }
    },
    heavy: {
      maxParticles: 700,
      spawnRate: 1.0,
      description: 'High-end devices, full particle effects',
      apply(P) {
        P.setMaxParticles(700);
        P._spawnRate = 1.0;
      }
    },
    ultra: {
      maxParticles: 1500,
      spawnRate: 1.0,
      description: 'Desktop/PC, cinematic particle quality',
      apply(P) {
        P.setMaxParticles(1500);
        P._spawnRate = 1.0;
      }
    }
  }


};
// ============================================================
// PARTICLE PRESETS — hazır efekt şablonları
// ============================================================
const PARTICLE_PRESETS = {
  exhaust_puff: {
    count: 12, life: 1.2, speed: 1.8, size: 14, color: ['#888','#999','#777','#aaa'],
    gravity: -0.04, spread: 0.6, fadeOut: true, rotate: true
  },
  tire_smoke: {
    count: 20, life: 2.0, speed: 2.5, size: 22, color: ['#ccc','#bbb','#ddd','#eee'],
    gravity: -0.02, spread: 1.2, fadeOut: true, rotate: true
  },
  crash_sparks: {
    count: 35, life: 0.9, speed: 6.0, size: 4, color: ['#ff8800','#ffcc00','#ff4400','#ffffff'],
    gravity: 0.18, spread: Math.PI * 2, fadeOut: true, rotate: false
  },
  nitro_flame: {
    count: 18, life: 0.6, speed: 4.5, size: 10, color: ['#00aaff','#0044ff','#44ddff','#ffffff'],
    gravity: -0.06, spread: 0.3, fadeOut: true, rotate: false
  },
  water_splash: {
    count: 22, life: 1.1, speed: 4.0, size: 7, color: ['#44aaff','#88ccff','#ffffff','#00bbff'],
    gravity: 0.22, spread: Math.PI, fadeOut: true, rotate: false
  },
  mud_splat: {
    count: 16, life: 1.4, speed: 3.2, size: 9, color: ['#6b4226','#8b5e3c','#4e2e0e','#a07850'],
    gravity: 0.20, spread: Math.PI * 0.8, fadeOut: true, rotate: true
  },
  snow_puff: {
    count: 18, life: 2.5, speed: 1.5, size: 8, color: ['#ffffff','#ddeeff','#eef8ff','#ccddff'],
    gravity: -0.01, spread: 1.4, fadeOut: true, rotate: false
  },
  sand_dust: {
    count: 25, life: 2.2, speed: 2.0, size: 11, color: ['#d4b483','#c8a96a','#e6cc99','#b89050'],
    gravity: -0.015, spread: 1.1, fadeOut: true, rotate: true
  },
  lava_bubble: {
    count: 10, life: 1.8, speed: 2.8, size: 12, color: ['#ff3300','#ff6600','#ff9900','#ffcc00'],
    gravity: -0.08, spread: 0.8, fadeOut: true, rotate: false
  },
  electric_arc: {
    count: 28, life: 0.4, speed: 8.0, size: 3, color: ['#aaddff','#ffffff','#88ccff','#66bbff'],
    gravity: 0.0, spread: Math.PI * 2, fadeOut: true, rotate: false
  },
  coin_collect: {
    count: 14, life: 0.8, speed: 3.5, size: 6, color: ['#ffdd00','#ffcc00','#ffee44','#ffffff'],
    gravity: -0.12, spread: Math.PI * 2, fadeOut: true, rotate: true
  },
  gem_collect: {
    count: 20, life: 1.0, speed: 4.0, size: 7, color: ['#ff44ff','#aa00ff','#ff88ff','#ffffff'],
    gravity: -0.10, spread: Math.PI * 2, fadeOut: true, rotate: true
  },
  rank_up_burst: {
    count: 50, life: 1.5, speed: 5.5, size: 8, color: ['#ffdd00','#ff8800','#ff4400','#ffffff','#ffee88'],
    gravity: -0.05, spread: Math.PI * 2, fadeOut: true, rotate: true
  },
  perfect_landing: {
    count: 30, life: 1.2, speed: 4.2, size: 9, color: ['#00ff88','#44ffcc','#ffffff','#00ffcc'],
    gravity: -0.08, spread: Math.PI * 1.5, fadeOut: true, rotate: true
  },
  trick_stars: {
    count: 24, life: 1.0, speed: 3.8, size: 10, color: ['#ffdd00','#ffffff','#ffaa00','#ff8800'],
    gravity: -0.06, spread: Math.PI * 2, fadeOut: true, rotate: true
  }
};

// ============================================================
// ParticlePool — nesne havuzu optimizasyonu
// ============================================================
class ParticlePool {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.pool = [];
    this.active = [];
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(this._createParticle());
    }
  }

  _createParticle() {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 4, color: '#fff',
      alpha: 1, rotation: 0,
      rotSpeed: 0, gravity: 0,
      fadeOut: true, active: false,
      type: 'default'
    };
  }

  acquire() {
    let p = this.pool.length > 0 ? this.pool.pop() : this._createParticle();
    p.active = true;
    this.active.push(p);
    return p;
  }

  release(p) {
    p.active = false;
    const idx = this.active.indexOf(p);
    if (idx !== -1) this.active.splice(idx, 1);
    if (this.pool.length < this.maxSize) {
      this.pool.push(p);
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      p.rotation += p.rotSpeed * dt;
      if (p.fadeOut) {
        p.alpha = Math.max(0, p.life / p.maxLife);
      }
      if (p.life <= 0) {
        this.release(p);
      }
    }
  }

  draw(ctx, camera) {
    for (const p of this.active) {
      if (!p.active) continue;
      const sx = p.x - (camera ? camera.x : 0);
      const sy = p.y - (camera ? camera.y : 0);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.translate(sx, sy);
      if (p.rotation !== 0) ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      const s = p.size * (p.fadeOut ? (0.5 + 0.5 * p.alpha) : 1);
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  spawnPreset(presetName, x, y, overrides) {
    const preset = PARTICLE_PRESETS[presetName];
    if (!preset) return;
    const cfg = Object.assign({}, preset, overrides || {});
    for (let i = 0; i < cfg.count; i++) {
      const p = this.acquire();
      const angle = (Math.random() - 0.5) * cfg.spread;
      const speed = cfg.speed * (0.5 + Math.random() * 0.5);
      p.x = x + (Math.random() - 0.5) * 8;
      p.y = y + (Math.random() - 0.5) * 8;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - Math.random() * 1.5;
      p.maxLife = cfg.life * (0.6 + Math.random() * 0.4);
      p.life = p.maxLife;
      p.size = cfg.size * (0.5 + Math.random() * 0.5);
      p.color = Array.isArray(cfg.color) ? cfg.color[Math.floor(Math.random() * cfg.color.length)] : cfg.color;
      p.gravity = cfg.gravity;
      p.fadeOut = cfg.fadeOut;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotSpeed = cfg.rotate ? (Math.random() - 0.5) * 4 : 0;
      p.alpha = 1;
    }
  }
}

// ============================================================
// EMITTER_TYPES
// ============================================================
class ContinuousEmitter {
  constructor(x, y, presetName, ratePerSec = 10) {
    this.x = x; this.y = y;
    this.presetName = presetName;
    this.ratePerSec = ratePerSec;
    this.accumulator = 0;
    this.active = true;
    this.pool = null;
  }
  attachPool(pool) { this.pool = pool; }
  setPosition(x, y) { this.x = x; this.y = y; }
  update(dt) {
    if (!this.active || !this.pool) return;
    this.accumulator += dt;
    const interval = 1 / this.ratePerSec;
    while (this.accumulator >= interval) {
      this.accumulator -= interval;
      const preset = PARTICLE_PRESETS[this.presetName];
      if (preset) {
        const p = this.pool.acquire();
        const angle = (Math.random() - 0.5) * preset.spread;
        const speed = preset.speed * (0.5 + Math.random() * 0.5);
        p.x = this.x + (Math.random() - 0.5) * 6;
        p.y = this.y + (Math.random() - 0.5) * 6;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.maxLife = preset.life * (0.7 + Math.random() * 0.3);
        p.life = p.maxLife;
        p.size = preset.size * (0.6 + Math.random() * 0.4);
        p.color = Array.isArray(preset.color) ? preset.color[Math.floor(Math.random() * preset.color.length)] : preset.color;
        p.gravity = preset.gravity;
        p.fadeOut = preset.fadeOut;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotSpeed = preset.rotate ? (Math.random() - 0.5) * 3 : 0;
        p.alpha = 1;
      }
    }
  }
  stop() { this.active = false; }
  start() { this.active = true; }
}

class BurstEmitter {
  constructor(x, y, presetName) {
    this.x = x; this.y = y;
    this.presetName = presetName;
    this.pool = null;
  }
  attachPool(pool) { this.pool = pool; }
  burst(x, y, overrides) {
    if (!this.pool) return;
    const tx = x !== undefined ? x : this.x;
    const ty = y !== undefined ? y : this.y;
    this.pool.spawnPreset(this.presetName, tx, ty, overrides);
  }
}

class TrailEmitter {
  constructor(presetName, spacing = 12) {
    this.presetName = presetName;
    this.spacing = spacing;
    this.lastX = null;
    this.lastY = null;
    this.pool = null;
  }
  attachPool(pool) { this.pool = pool; }
  addPoint(x, y) {
    if (this.lastX === null) { this.lastX = x; this.lastY = y; return; }
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= this.spacing) {
      if (this.pool) this.pool.spawnPreset(this.presetName, x, y, { count: 3 });
      this.lastX = x;
      this.lastY = y;
    }
  }
  reset() { this.lastX = null; this.lastY = null; }
}

class OrbitEmitter {
  constructor(cx, cy, radius, presetName, orbitSpeed = 2) {
    this.cx = cx; this.cy = cy;
    this.radius = radius;
    this.presetName = presetName;
    this.orbitSpeed = orbitSpeed;
    this.angle = 0;
    this.pool = null;
    this.spawnInterval = 0.08;
    this.timer = 0;
  }
  attachPool(pool) { this.pool = pool; }
  setCenter(cx, cy) { this.cx = cx; this.cy = cy; }
  update(dt) {
    if (!this.pool) return;
    this.angle += this.orbitSpeed * dt;
    this.timer += dt;
    while (this.timer >= this.spawnInterval) {
      this.timer -= this.spawnInterval;
      const ox = this.cx + Math.cos(this.angle) * this.radius;
      const oy = this.cy + Math.sin(this.angle) * this.radius;
      this.pool.spawnPreset(this.presetName, ox, oy, { count: 2 });
    }
  }
}

class FireworkEmitter {
  constructor() {
    this.pool = null;
    this.rockets = [];
  }
  attachPool(pool) { this.pool = pool; }
  launch(x, groundY) {
    this.rockets.push({
      x, y: groundY,
      vy: -(8 + Math.random() * 6),
      targetY: groundY - (200 + Math.random() * 200),
      color: ['#ff4400','#ffcc00','#00aaff','#ff00ff','#00ff88'][Math.floor(Math.random() * 5)]
    });
  }
  update(dt) {
    if (!this.pool) return;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.y += r.vy * dt * 60;
      if (r.y <= r.targetY) {
        if (this.pool) {
          for (let j = 0; j < 40; j++) {
            const p = this.pool.acquire();
            const angle = (j / 40) * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            p.x = r.x; p.y = r.y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.maxLife = 1.0 + Math.random() * 0.8;
            p.life = p.maxLife;
            p.size = 4 + Math.random() * 4;
            p.color = r.color;
            p.gravity = 0.12;
            p.fadeOut = true;
            p.rotation = 0; p.rotSpeed = 0;
            p.alpha = 1;
          }
        }
        this.rockets.splice(i, 1);
      }
    }
  }
}

// ============================================================
// ADVANCED_PARTICLES
// ============================================================
class FireParticle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = -(1.5 + Math.random() * 2.5);
    this.life = 1.0;
    this.maxLife = 0.6 + Math.random() * 0.6;
    this.life = this.maxLife;
    this.size = 6 + Math.random() * 8;
  }
  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy -= 0.05 * dt * 60;
    this.vx += (Math.random() - 0.5) * 0.1;
    this.life -= dt;
  }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  get color() {
    const t = 1 - this.alpha;
    if (t < 0.33) return `rgb(255,${Math.floor(100 + 155 * (t / 0.33))},0)`;
    if (t < 0.66) return `rgb(255,${Math.floor(255 - 255 * ((t - 0.33) / 0.33))},0)`;
    return `rgba(255,200,0,${this.alpha})`;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const grad = GradyanDeposu.rad(ctx, this.x, this.y, 0, this.x, this.y, this.size, [0, '#ffffff', 0.4, this.color, 1, 'rgba(255,0,0,0)']);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class WaterDroplet {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = -(2 + Math.random() * 4);
    this.gravity = 0.18;
    this.life = 1.5; this.maxLife = 1.5;
    this.size = 3 + Math.random() * 3;
    this.bounces = 0;
    this.groundY = y + 60 + Math.random() * 40;
  }
  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += this.gravity * dt * 60;
    if (this.y >= this.groundY && this.bounces < 2) {
      this.y = this.groundY;
      this.vy *= -0.45;
      this.vx *= 0.7;
      this.bounces++;
    }
    this.life -= dt;
  }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#44aaff';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.size, this.size * 1.4, this.vy > 0 ? 0 : Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class SnowFlake {
  constructor(x, y, groundY) {
    this.x = x; this.y = y;
    this.groundY = groundY;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = 0.5 + Math.random() * 1.2;
    this.oscillate = Math.random() * Math.PI * 2;
    this.oscillateSpeed = 1 + Math.random() * 2;
    this.oscillateAmp = 0.5 + Math.random() * 1.5;
    this.life = 6.0; this.maxLife = 6.0;
    this.size = 2 + Math.random() * 4;
    this.settled = false;
  }
  update(dt) {
    if (this.settled) { this.life -= dt; return; }
    this.oscillate += this.oscillateSpeed * dt;
    this.x += (this.vx + Math.sin(this.oscillate) * this.oscillateAmp) * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.settled = true;
      this.life = 2.0; this.maxLife = 2.0;
    }
    this.life -= dt * 0.1;
  }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#eef8ff';
    ctx.strokeStyle = '#ccddff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class ElectricSpark {
  constructor(x, y) {
    this.segments = [];
    const count = 6 + Math.floor(Math.random() * 6);
    let cx = x; let cy = y;
    const dir = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const len = 8 + Math.random() * 16;
      const angle = dir + (Math.random() - 0.5) * 1.8;
      cx += Math.cos(angle) * len;
      cy += Math.sin(angle) * len;
      this.segments.push({ x: cx, y: cy });
    }
    this.startX = x; this.startY = y;
    this.life = 0.15 + Math.random() * 0.2;
    this.maxLife = this.life;
  }
  update(dt) { this.life -= dt; }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    if (this.segments.length < 1) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = '#aaddff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#66bbff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    for (const seg of this.segments) ctx.lineTo(seg.x, seg.y);
    ctx.stroke();
    ctx.restore();
  }
}

class MagicDust {
  constructor(cx, cy) {
    this.cx = cx; this.cy = cy;
    this.angle = Math.random() * Math.PI * 2;
    this.radius = 10 + Math.random() * 30;
    this.angularSpeed = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
    this.radiusSpeed = (Math.random() - 0.5) * 0.5;
    this.life = 1.2 + Math.random() * 0.8;
    this.maxLife = this.life;
    this.size = 3 + Math.random() * 4;
    this.hue = Math.random() * 360;
    this.hueSpeed = 60 + Math.random() * 120;
  }
  update(dt) {
    this.angle += this.angularSpeed * dt;
    this.radius += this.radiusSpeed * dt * 60;
    this.hue = (this.hue + this.hueSpeed * dt) % 360;
    this.life -= dt;
  }
  get x() { return this.cx + Math.cos(this.angle) * this.radius; }
  get y() { return this.cy + Math.sin(this.angle) * this.radius; }
  get alpha() { return Math.max(0, this.life / this.maxLife); }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = `hsl(${this.hue},100%,70%)`;
    ctx.shadowColor = `hsl(${this.hue},100%,80%)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// SCREEN_EFFECTS
// ============================================================
const SCREEN_EFFECTS = {
  screenShake(ctx, intensity, duration, t) {
    const remaining = Math.max(0, duration - t);
    const factor = remaining / duration;
    const dx = (Math.random() - 0.5) * intensity * factor * 2;
    const dy = (Math.random() - 0.5) * intensity * factor * 2;
    ctx.translate(dx, dy);
  },
  colorFlash(ctx, W, H, color, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },
  radialBlur(ctx, W, H, cx, cy, amount) {
    const steps = Math.max(1, Math.floor(amount * 4));
    const alpha = 0.15 / steps;
    for (let i = 1; i <= steps; i++) {
      const scale = 1 + (i / steps) * amount * 0.02;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
    }
  },
  shockwave(ctx, x, y, r, t) {
    const maxR = 120;
    const progress = Math.min(1, r / maxR);
    const lineW = 6 * (1 - progress) + 1;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineW;
    ctx.shadowColor = '#aaddff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
};

// ============================================================
// PARTICLE_PHYSICS
// ============================================================
const PARTICLE_PHYSICS = {
  windAffect(particle, windX, windY, dt) {
    particle.vx += windX * dt;
    particle.vy += windY * dt;
  },
  bounceOnGround(particle, groundY, restitution = 0.5) {
    if (particle.y >= groundY) {
      particle.y = groundY;
      particle.vy *= -restitution;
      particle.vx *= 0.85;
    }
  },
  collideWithTerrain(particle, terrain) {
    if (!terrain || !terrain.getHeightAt) return;
    const h = terrain.getHeightAt(particle.x);
    if (h !== undefined && particle.y >= h) {
      particle.y = h;
      particle.vy *= -0.4;
      particle.vx *= 0.7;
    }
  }
};

// ============================================================
// drawParticleSystem — tüm sistemleri çiz
// ============================================================
function drawParticleSystem(ctx, system, camera, t) {
  if (!system) return;
  ctx.save();
  if (camera) ctx.translate(-camera.x, -camera.y);
  if (system instanceof ParticlePool) {
    system.draw(ctx, null);
  } else if (Array.isArray(system)) {
    for (const item of system) {
      if (item && typeof item.draw === 'function') {
        item.draw(ctx);
      }
    }
  }
  ctx.restore();
}

// ============================================================
// VISUAL_EFFECTS_LIBRARY — 20 önceden tanımlı efekt sekansı
// ============================================================
const VISUAL_EFFECTS_LIBRARY = {
  _active: [],
  _pool: null,

  init(pool) { this._pool = pool; },

  trigger(name, x, y, extra) {
    if (!this._pool) return;
    switch (name) {
      case 'coin_pickup':
        this._pool.spawnPreset('coin_collect', x, y);
        break;
      case 'gem_pickup':
        this._pool.spawnPreset('gem_collect', x, y);
        break;
      case 'explosion_small':
        this._pool.spawnPreset('crash_sparks', x, y, { count: 25 });
        this._pool.spawnPreset('exhaust_puff', x, y, { count: 10 });
        break;
      case 'explosion_large':
        this._pool.spawnPreset('crash_sparks', x, y, { count: 60 });
        this._pool.spawnPreset('exhaust_puff', x, y, { count: 30, size: 28 });
        this._pool.spawnPreset('lava_bubble', x, y, { count: 15 });
        break;
      case 'nitro_boost':
        this._pool.spawnPreset('nitro_flame', x, y, { count: 20 });
        break;
      case 'water_land':
        this._pool.spawnPreset('water_splash', x, y);
        break;
      case 'mud_land':
        this._pool.spawnPreset('mud_splat', x, y);
        break;
      case 'snow_land':
        this._pool.spawnPreset('snow_puff', x, y);
        break;
      case 'sand_drift':
        this._pool.spawnPreset('sand_dust', x, y);
        break;
      case 'lava_step':
        this._pool.spawnPreset('lava_bubble', x, y, { count: 8 });
        break;
      case 'electric_hit':
        this._pool.spawnPreset('electric_arc', x, y);
        break;
      case 'rank_up':
        this._pool.spawnPreset('rank_up_burst', x, y);
        break;
      case 'perfect':
        this._pool.spawnPreset('perfect_landing', x, y);
        break;
      case 'trick':
        this._pool.spawnPreset('trick_stars', x, y);
        break;
      case 'tyre_spin':
        this._pool.spawnPreset('tire_smoke', x, y, { count: 8 });
        break;
      case 'exhaust':
        this._pool.spawnPreset('exhaust_puff', x, y, { count: 4 });
        break;
      case 'crash':
        this._pool.spawnPreset('crash_sparks', x, y, { count: 40 });
        this._pool.spawnPreset('tire_smoke', x, y, { count: 15, size: 20 });
        break;
      case 'magic':
        this._pool.spawnPreset('gem_collect', x, y, { count: 18, speed: 5 });
        this._pool.spawnPreset('trick_stars', x, y, { count: 12 });
        break;
      case 'firework_burst':
        this._pool.spawnPreset('rank_up_burst', x, y, { count: 45, speed: 6 });
        break;
      default:
        this._pool.spawnPreset('exhaust_puff', x, y);
    }
  },

  effectNames() {
    return [
      'coin_pickup', 'gem_pickup', 'explosion_small', 'explosion_large',
      'nitro_boost', 'water_land', 'mud_land', 'snow_land', 'sand_drift',
      'lava_step', 'electric_hit', 'rank_up', 'perfect', 'trick',
      'tyre_spin', 'exhaust', 'crash', 'magic', 'firework_burst', 'default'
    ];
  }
};

// =============================================================================
// WEATHER_PARTICLES MODULE
// =============================================================================

const WEATHER_PARTICLES = {
  _rain: null,
  _snow: null,
  _hail: null,
  _fog: null,
  _sandstorm: null,
  _activeSystem: null,

  init() {
    this._rain = new RainSystem();
    this._snow = new SnowSystem();
    this._hail = new HailSystem();
    this._fog = new FogSystem();
    this._sandstorm = new SandstormSystem();
  },

  setWeather(type, intensity) {
    this._activeSystem = null;
    if (type === 'rain')      { this._rain.setIntensity(intensity);      this._activeSystem = this._rain; }
    else if (type === 'snow') { this._snow.setIntensity(intensity);      this._activeSystem = this._snow; }
    else if (type === 'hail') { this._hail.setIntensity(intensity);      this._activeSystem = this._hail; }
    else if (type === 'fog')  { this._fog.setDensity(intensity);         this._activeSystem = this._fog; }
    else if (type === 'sand') { this._sandstorm.setIntensity(intensity); this._activeSystem = this._sandstorm; }
  },

  clear() { this._activeSystem = null; },

  update(dt, wind) {
    if (this._activeSystem) this._activeSystem.update(dt, wind);
  },

  draw(ctx, screenW, screenH) {
    if (this._activeSystem) this._activeSystem.draw(ctx, screenW, screenH);
  }
};

// ---------------------------------------------------------------------------
// Rain System
// ---------------------------------------------------------------------------
class RainSystem {
  constructor() {
    this._pool = [];
    this._splashes = [];
    this._ripples = [];
    this._count = 700;
    this._wind = { x: -2, y: 0 };
    this._screenW = 800;
    this._screenH = 600;
    this._groundY = 560;
    for (let i = 0; i < 1500; i++) {
      this._pool.push(this._makeRaindrop(true));
    }
  }

  _makeRaindrop(randomY) {
    return {
      x: Math.random() * this._screenW,
      y: randomY ? Math.random() * this._screenH : -10,
      vx: this._wind.x + (Math.random() - 0.5) * 0.5,
      vy: 8 + Math.random() * 6,
      len: 8 + Math.random() * 12,
      opacity: 0.3 + Math.random() * 0.5,
      active: true
    };
  }

  setIntensity(level) {
    if (level === 'drizzle')   this._count = 300;
    else if (level === 'rain') this._count = 700;
    else                       this._count = 1500;
  }

  update(dt, wind) {
    if (wind) { this._wind.x = wind.x || -2; this._wind.y = wind.y || 0; }
    let active = 0;
    for (let i = 0; i < this._pool.length; i++) {
      const d = this._pool[i];
      if (!d.active) continue;
      if (active >= this._count) { d.active = false; continue; }
      active++;
      d.vx += (this._wind.x - d.vx) * 0.05;
      d.vy += 0.3;
      d.x += d.vx;
      d.y += d.vy;
      if (d.y > this._groundY) {
        this._spawnSplash(d.x, this._groundY);
        this._spawnRipple(d.x, this._groundY);
        Object.assign(d, this._makeRaindrop(false));
      }
      if (d.x < -20) d.x = this._screenW + 10;
      if (d.x > this._screenW + 20) d.x = -10;
    }
    // reactivate inactive up to count
    for (let i = 0; i < this._pool.length && active < this._count; i++) {
      if (!this._pool[i].active) {
        Object.assign(this._pool[i], this._makeRaindrop(false));
        this._pool[i].active = true;
        active++;
      }
    }
    // update splashes
    for (let i = this._splashes.length - 1; i >= 0; i--) {
      const s = this._splashes[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.3;
      s.life -= dt;
      if (s.life <= 0) this._splashes.splice(i, 1);
    }
    // update ripples
    for (let i = this._ripples.length - 1; i >= 0; i--) {
      const r = this._ripples[i];
      r.radius += 1.5;
      r.life -= dt;
      if (r.life <= 0) this._ripples.splice(i, 1);
    }
  }

  _spawnSplash(x, y) {
    if (this._splashes.length > 300) return;
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI + Math.random() * Math.PI;
      const speed = 1 + Math.random() * 3;
      this._splashes.push({ x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 2, life: 0.4 + Math.random()*0.3 });
    }
  }

  _spawnRipple(x, y) {
    if (this._ripples.length > 80) return;
    this._ripples.push({ x, y, radius: 1, life: 0.6, maxLife: 0.6 });
  }

  draw(ctx, screenW, screenH) {
    this._screenW = screenW || this._screenW;
    this._screenH = screenH || this._screenH;
    ctx.save();
    ctx.lineCap = 'round';
    // draw drops
    for (let i = 0; i < this._pool.length; i++) {
      const d = this._pool[i];
      if (!d.active) continue;
      const angle = Math.atan2(d.vy, d.vx);
      ctx.strokeStyle = `rgba(174,214,241,${d.opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - Math.cos(angle)*d.len, d.y - Math.sin(angle)*d.len);
      ctx.stroke();
    }
    // draw splashes
    ctx.fillStyle = 'rgba(174,214,241,0.6)';
    for (const s of this._splashes) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
    // draw ripples
    for (const r of this._ripples) {
      const alpha = (r.life / r.maxLife) * 0.4;
      ctx.strokeStyle = `rgba(174,214,241,${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius * 2, r.radius * 0.6, 0, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Snow System
// ---------------------------------------------------------------------------
class SnowSystem {
  constructor() {
    this._flakes = [];
    this._accumulation = {}; // x-bucket -> height
    this._count = 500;
    this._screenW = 800;
    this._screenH = 600;
    this._groundY = 560;
    this._wind = 0.3;
    this._time = 0;
    for (let i = 0; i < 800; i++) {
      this._flakes.push(this._makeFlake(true));
    }
  }

  _makeFlake(randomY) {
    const types = ['dot','star','crystal','ring','hex','cross'];
    return {
      x: Math.random() * this._screenW,
      y: randomY ? Math.random() * this._screenH : -10,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.5 + Math.random() * 1.5,
      size: 2 + Math.random() * 4,
      spin: 0,
      spinSpeed: (Math.random() - 0.5) * 0.05,
      driftOffset: Math.random() * Math.PI * 2,
      driftSpeed: 0.01 + Math.random() * 0.02,
      opacity: 0.5 + Math.random() * 0.5,
      type: types[Math.floor(Math.random() * types.length)],
      active: true
    };
  }

  setIntensity(level) {
    if (level === 'light')        this._count = 200;
    else if (level === 'moderate') this._count = 500;
    else                           this._count = 800;
  }

  update(dt, wind) {
    this._time += dt || 0.016;
    if (wind) this._wind = wind.x * 0.3;
    let active = 0;
    for (let i = 0; i < this._flakes.length; i++) {
      const f = this._flakes[i];
      if (!f.active) continue;
      if (active >= this._count) { f.active = false; continue; }
      active++;
      f.spin += f.spinSpeed;
      const drift = Math.sin(this._time * f.driftSpeed * 60 + f.driftOffset) * 0.4;
      f.x += f.vx + drift + this._wind;
      f.y += f.vy;
      const bucket = Math.floor(f.x / 4) * 4;
      const accum = this._accumulation[bucket] || 0;
      const ground = this._groundY - accum;
      if (f.y >= ground) {
        this._accumulation[bucket] = Math.min(accum + f.size * 0.1, 30);
        Object.assign(f, this._makeFlake(false));
        f.active = true;
      }
      if (f.x < -20)  f.x = this._screenW + 10;
      if (f.x > this._screenW + 20) f.x = -10;
    }
    for (let i = 0; i < this._flakes.length && active < this._count; i++) {
      if (!this._flakes[i].active) {
        Object.assign(this._flakes[i], this._makeFlake(false));
        this._flakes[i].active = true;
        active++;
      }
    }
  }

  _drawFlake(ctx, f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.spin);
    ctx.globalAlpha = f.opacity;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e0eeff';
    ctx.lineWidth = 0.8;
    const s = f.size;
    switch (f.type) {
      case 'dot':
        ctx.beginPath(); ctx.arc(0,0,s,0,Math.PI*2); ctx.fill(); break;
      case 'star':
        for (let k=0;k<6;k++) {
          const a=k*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(a)*s*2, Math.sin(a)*s*2); ctx.stroke();
        }
        break;
      case 'crystal':
        for (let k=0;k<6;k++) {
          const a=k*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(a)*s*2, Math.sin(a)*s*2); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(Math.cos(a)*s, Math.sin(a)*s);
          ctx.lineTo(Math.cos(a+0.5)*s*1.3, Math.sin(a+0.5)*s*1.3); ctx.stroke();
        }
        break;
      case 'ring':
        ctx.beginPath(); ctx.arc(0,0,s,0,Math.PI*2); ctx.stroke(); break;
      case 'hex':
        ctx.beginPath();
        for (let k=0;k<6;k++) {
          const a=k*Math.PI/3;
          k===0 ? ctx.moveTo(Math.cos(a)*s,Math.sin(a)*s) : ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);
        }
        ctx.closePath(); ctx.stroke(); break;
      case 'cross':
        ctx.beginPath(); ctx.moveTo(-s*2,0); ctx.lineTo(s*2,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-s*2); ctx.lineTo(0,s*2); ctx.stroke(); break;
    }
    ctx.restore();
  }

  draw(ctx, screenW, screenH) {
    this._screenW = screenW || this._screenW;
    this._screenH = screenH || this._screenH;
    ctx.save();
    for (const f of this._flakes) {
      if (f.active) this._drawFlake(ctx, f);
    }
    // draw accumulation
    ctx.fillStyle = 'rgba(240,248,255,0.85)';
    for (const bucket in this._accumulation) {
      const bx = parseInt(bucket);
      const h = this._accumulation[bucket];
      ctx.fillRect(bx, this._groundY - h, 4, h);
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Hail System
// ---------------------------------------------------------------------------
class HailSystem {
  constructor() {
    this._stones = [];
    this._chips = [];
    this._screenW = 800;
    this._screenH = 600;
    this._groundY = 560;
    for (let i = 0; i < 200; i++) {
      this._stones.push(this._makeStone(true));
    }
  }

  _makeStone(randomY) {
    return {
      x: Math.random() * this._screenW,
      y: randomY ? Math.random() * this._screenH : -10,
      vx: (Math.random() - 0.5) * 2 - 1,
      vy: 4 + Math.random() * 8,
      size: 3 + Math.random() * 5,
      bounces: 0,
      active: true
    };
  }

  setIntensity(level) { /* controls spawn rate externally */ }

  update(dt, wind) {
    for (let i = 0; i < this._stones.length; i++) {
      const s = this._stones[i];
      if (!s.active) continue;
      if (wind) s.vx += wind.x * 0.02;
      s.vy += 0.4;
      s.x += s.vx; s.y += s.vy;
      if (s.y >= this._groundY) {
        if (s.bounces < 2) {
          s.vy = -s.vy * 0.5;
          s.vx += (Math.random()-0.5)*1.5;
          s.y = this._groundY;
          s.bounces++;
          this._spawnChips(s.x, s.y, s.size);
        } else {
          Object.assign(s, this._makeStone(false));
        }
      }
      if (s.x<-30||s.x>this._screenW+30) Object.assign(s, this._makeStone(false));
    }
    for (let i = this._chips.length-1; i>=0; i--) {
      const c = this._chips[i];
      c.x+=c.vx; c.y+=c.vy; c.vy+=0.3; c.life-=dt;
      if (c.life<=0) this._chips.splice(i,1);
    }
  }

  _spawnChips(x, y, size) {
    if (this._chips.length > 400) return;
    const n = Math.floor(size);
    for (let i=0;i<n;i++) {
      const a = -Math.PI + Math.random()*Math.PI;
      const sp = 1+Math.random()*3;
      this._chips.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,life:0.3+Math.random()*0.3,size:1+Math.random()*2});
    }
  }

  draw(ctx, screenW, screenH) {
    this._screenW = screenW||this._screenW;
    this._screenH = screenH||this._screenH;
    ctx.save();
    for (const s of this._stones) {
      if (!s.active) continue;
      const g = ctx.createRadialGradient(s.x-s.size*0.3,s.y-s.size*0.3,0,s.x,s.y,s.size);
      g.addColorStop(0,'rgba(255,255,255,0.95)');
      g.addColorStop(1,'rgba(180,220,255,0.7)');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(200,235,255,0.8)';
    for (const c of this._chips) {
      ctx.beginPath(); ctx.arc(c.x,c.y,c.size,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Fog System
// ---------------------------------------------------------------------------
class FogSystem {
  constructor() {
    this._patches = [];
    this._screenW = 800;
    this._screenH = 600;
    this._density = 0.5;
    for (let i=0;i<20;i++) this._patches.push(this._makePatch());
  }

  _makePatch() {
    return {
      x: Math.random()*this._screenW,
      y: 100+Math.random()*(this._screenH-200),
      w: 200+Math.random()*300,
      h: 80+Math.random()*120,
      vx: 0.2+Math.random()*0.5,
      opacity: 0.05+Math.random()*0.15,
      layer: Math.floor(Math.random()*3)
    };
  }

  setDensity(level) {
    if (level === 'light')  this._density=0.3;
    else if (level==='heavy') this._density=0.9;
    else this._density=0.6;
  }

  update(dt, wind) {
    for (const p of this._patches) {
      p.x += p.vx + (wind?wind.x*0.1:0);
      if (p.x > this._screenW + p.w*0.5) p.x = -p.w*0.5;
    }
  }

  draw(ctx, screenW, screenH) {
    this._screenW=screenW||this._screenW;
    this._screenH=screenH||this._screenH;
    ctx.save();
    for (const p of this._patches) {
      const scale = 1-p.layer*0.2;
      const op = p.opacity*this._density*scale;
      const g = GradyanDeposu.rad(ctx, p.x, p.y, 0, p.x, p.y, p.w*0.5, [0, `rgba(220,230,240,${op})`, 1, 'rgba(220,230,240,0)']);
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.ellipse(p.x,p.y,p.w*0.5,p.h*0.5,0,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Sandstorm System
// ---------------------------------------------------------------------------
class SandstormSystem {
  constructor() {
    this._grains = [];
    this._screenW = 800;
    this._screenH = 600;
    this._count = 2000;
    this._colors = ['#c2956b','#d4a574','#b8845a','#e0b080','#c8936b'];
    for (let i=0;i<2000;i++) this._grains.push(this._makeGrain(true));
  }

  _makeGrain(randomY) {
    return {
      x: Math.random()*this._screenW,
      y: randomY ? Math.random()*this._screenH : Math.random()*this._screenH,
      vx: -(4+Math.random()*8),
      vy: (Math.random()-0.5)*1.5,
      size: 0.5+Math.random()*2,
      color: this._colors[Math.floor(Math.random()*this._colors.length)],
      opacity: 0.3+Math.random()*0.6,
      active: true
    };
  }

  setIntensity(level) {
    if (level==='light') this._count=500;
    else if (level==='moderate') this._count=1200;
    else this._count=2000;
  }

  update(dt, wind) {
    let active=0;
    for (const g of this._grains) {
      if (!g.active) continue;
      if (active>=this._count) {g.active=false;continue;}
      active++;
      if (wind) g.vx+=(wind.x*0.5-g.vx)*0.02;
      g.x+=g.vx; g.y+=g.vy;
      if (g.x<-10) {g.x=this._screenW+5;g.y=Math.random()*this._screenH;}
      if (g.x>this._screenW+10) {g.x=-5;g.y=Math.random()*this._screenH;}
      if (g.y<0) g.y=this._screenH;
      if (g.y>this._screenH) g.y=0;
    }
    for (const g of this._grains) {
      if (!g.active && active<this._count) {g.active=true;active++;}
    }
  }

  draw(ctx, screenW, screenH) {
    this._screenW=screenW||this._screenW;
    this._screenH=screenH||this._screenH;
    ctx.save();
    // visibility overlay
    const grd = GradyanDeposu.lin(ctx, 0, 0, this._screenW, 0, [0, 'rgba(180,130,80,0.25)', 0.5, 'rgba(180,130,80,0.08)', 1, 'rgba(180,130,80,0.15)']);
    ctx.fillStyle=grd;
    ctx.fillRect(0,0,this._screenW,this._screenH);
    for (const g of this._grains) {
      if (!g.active) continue;
      ctx.globalAlpha=g.opacity;
      ctx.fillStyle=g.color;
      ctx.beginPath();
      ctx.arc(g.x,g.y,g.size,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}


// =============================================================================
// VEHICLE_TRAIL_PARTICLES MODULE
// =============================================================================

const VEHICLE_TRAIL_PARTICLES = {
  _tiresmoke: null,
  _dust: null,
  _mud: null,
  _nitro: null,
  _water: null,

  init() {
    this._tiresmoke = new TireSmokeSystem();
    this._dust      = new DustTrailSystem();
    this._mud       = new MudSplashSystem();
    this._nitro     = new NitroTrailSystem();
    this._water     = new WaterSpraySystem();
  },

  emitTireSmoke(x, y, slip, surface) {
    this._tiresmoke.emit(x, y, slip, surface);
  },
  emitDust(xl, yl, xr, yr, speed, surface) {
    this._dust.emit(xl, yl, xr, yr, speed, surface);
  },
  emitMud(x, y, vx, vy) {
    this._mud.emit(x, y, vx, vy);
  },
  emitNitro(x, y, exhaustDir, intensity) {
    this._nitro.emit(x, y, exhaustDir, intensity);
  },
  emitWaterSpray(xl, yl, xr, yr, vx, vy) {
    this._water.emit(xl, yl, xr, yr, vx, vy);
  },

  update(dt, wind) {
    this._tiresmoke.update(dt, wind);
    this._dust.update(dt, wind);
    this._mud.update(dt, wind);
    this._nitro.update(dt, wind);
    this._water.update(dt, wind);
  },

  draw(ctx) {
    this._dust.draw(ctx);
    this._mud.draw(ctx);
    this._tiresmoke.draw(ctx);
    this._water.draw(ctx);
    this._nitro.draw(ctx);
  }
};

// ---------------------------------------------------------------------------
// Tire Smoke
// ---------------------------------------------------------------------------
class TireSmokeSystem {
  constructor() {
    this._particles = [];
    this._max = 400;
    this._surfaceColors = {
      asphalt: [200,200,200],
      dirt:    [140,100,60],
      sand:    [210,160,80],
      grass:   [120,140,60],
      snow:    [240,248,255]
    };
  }

  emit(x, y, slip, surface) {
    if (this._particles.length >= this._max) return;
    const count = Math.floor(slip * 3) + 1;
    const col = this._surfaceColors[surface] || this._surfaceColors.asphalt;
    for (let i=0;i<count;i++) {
      this._particles.push({
        x: x+(Math.random()-0.5)*6,
        y: y+(Math.random()-0.5)*4,
        vx: (Math.random()-0.5)*1.5,
        vy: -(0.5+Math.random()*1.5),
        size: 6+Math.random()*12,
        maxSize: 20+Math.random()*20,
        life: 1,
        maxLife: 1.5+Math.random()*0.5,
        r: col[0], g: col[1], b: col[2],
        opacity: 0.6+Math.random()*0.3
      });
    }
  }

  update(dt, wind) {
    const w = wind || {x:0,y:0};
    for (let i=this._particles.length-1;i>=0;i--) {
      const p=this._particles[i];
      p.vx+=(w.x*0.05-p.vx)*0.03;
      p.vy+=w.y*0.02;
      p.x+=p.vx; p.y+=p.vy;
      p.life-=dt;
      const t=1-p.life/p.maxLife;
      p.size=p.size+(p.maxSize-p.size)*0.03;
      if (p.life<=0) this._particles.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this._particles) {
      const t=Math.max(0,p.life/p.maxLife);
      const op=p.opacity*t;
      ctx.globalAlpha=op;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
      g.addColorStop(0,`rgba(${p.r},${p.g},${p.b},0.8)`);
      g.addColorStop(1,`rgba(${p.r},${p.g},${p.b},0)`);
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Dust Trail
// ---------------------------------------------------------------------------
class DustTrailSystem {
  constructor() {
    this._particles = [];
    this._max = 500;
    this._splats = []; // ground splats
  }

  emit(xl, yl, xr, yr, speed, surface) {
    if (this._particles.length>=this._max) return;
    const density = Math.floor(speed / 4) + 1;
    const baseColor = surface==='sand'?'210,170,90':surface==='dirt'?'140,100,60':'160,130,80';
    for (let i=0;i<density;i++) {
      for (const [px,py] of [[xl,yl],[xr,yr]]) {
        this._particles.push({
          x: px+(Math.random()-0.5)*4,
          y: py,
          vx: (Math.random()-0.5)*1.2,
          vy: -(Math.random()*0.5),
          size: 8+Math.random()*10,
          life: 1,
          maxLife: 0.8+Math.random()*0.6,
          color: baseColor
        });
      }
    }
  }

  update(dt, wind) {
    const w=wind||{x:0};
    for (let i=this._particles.length-1;i>=0;i--) {
      const p=this._particles[i];
      p.x+=p.vx+(w.x||0)*0.03;
      p.y+=p.vy;
      p.vy+=0.02;
      p.life-=dt;
      p.size+=0.3;
      if (p.life<=0) this._particles.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this._particles) {
      const t=Math.max(0,p.life/p.maxLife);
      ctx.globalAlpha=t*0.45;
      const g = GradyanDeposu.rad(ctx, p.x, p.y, 0, p.x, p.y, p.size, [0, `rgba(${p.color},0.6)`, 1, `rgba(${p.color},0)`]);
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Mud Splash
// ---------------------------------------------------------------------------
class MudSplashSystem {
  constructor() {
    this._droplets = [];
    this._splats = [];
    this._max = 300;
  }

  emit(x, y, vx, vy) {
    if (this._droplets.length>=this._max) return;
    const count=8+Math.floor(Math.random()*10);
    for (let i=0;i<count;i++) {
      const angle=-Math.PI*0.8+Math.random()*Math.PI*0.6;
      const speed=2+Math.random()*6;
      const dark=Math.floor(50+Math.random()*40);
      this._droplets.push({
        x, y,
        vx: Math.cos(angle)*speed+(vx||0)*0.3,
        vy: Math.sin(angle)*speed+(vy||0)*0.3-3,
        size: 2+Math.random()*4,
        life: 1,
        maxLife: 0.6+Math.random()*0.6,
        r: dark, g: Math.floor(dark*0.7), b: Math.floor(dark*0.4),
        landed: false
      });
    }
  }

  update(dt) {
    for (let i=this._droplets.length-1;i>=0;i--) {
      const d=this._droplets[i];
      if (d.landed) { d.life-=dt; if(d.life<=0) this._droplets.splice(i,1); continue; }
      d.vx*=0.97; d.vy+=0.4;
      d.x+=d.vx; d.y+=d.vy;
      d.life-=dt;
      if (d.vy>0 && d.y>400) { // approximate ground
        d.landed=true;
        this._splats.push({x:d.x,y:d.y,size:d.size*1.5,life:3,r:d.r,g:d.g,b:d.b});
      }
      if (d.life<=0) this._droplets.splice(i,1);
    }
    for (let i=this._splats.length-1;i>=0;i--) {
      this._splats[i].life-=dt;
      if (this._splats[i].life<=0) this._splats.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const s of this._splats) {
      ctx.globalAlpha=Math.min(1,s.life)*0.5;
      ctx.fillStyle=`rgb(${s.r},${s.g},${s.b})`;
      ctx.beginPath(); ctx.ellipse(s.x,s.y,s.size,s.size*0.4,0,0,Math.PI*2); ctx.fill();
    }
    for (const d of this._droplets) {
      if (d.landed) continue;
      ctx.globalAlpha=Math.max(0,d.life/d.maxLife);
      ctx.fillStyle=`rgb(${d.r},${d.g},${d.b})`;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Nitro Trail
// ---------------------------------------------------------------------------
class NitroTrailSystem {
  constructor() {
    this._flames = [];
    this._sparks = [];
    this._heat = [];
    this._maxFlames = 150;
    this._maxSparks = 200;
  }

  emit(x, y, dir, intensity) {
    intensity = intensity||1;
    dir = dir||Math.PI; // pointing left by default
    // flames
    if (this._flames.length < this._maxFlames) {
      const count=Math.floor(intensity*3)+1;
      for (let i=0;i<count;i++) {
        const spread=(Math.random()-0.5)*0.4;
        const speed=(3+Math.random()*4)*intensity;
        this._flames.push({
          x, y: y+(Math.random()-0.5)*4,
          vx: Math.cos(dir+spread)*speed,
          vy: Math.sin(dir+spread)*speed,
          life: 1,
          maxLife: 0.25+Math.random()*0.15,
          size: 6+Math.random()*8,
          phase: Math.random()*Math.PI*2
        });
      }
    }
    // electric sparks
    if (this._sparks.length < this._maxSparks && Math.random()<0.4) {
      const spread=(Math.random()-0.5)*0.8;
      this._sparks.push({
        x, y,
        vx: Math.cos(dir+spread)*(2+Math.random()*5),
        vy: Math.sin(dir+spread)*(2+Math.random()*5),
        life: 0.3+Math.random()*0.2,
        maxLife: 0.5,
        size: 2+Math.random()*3
      });
    }
    // heat shimmer
    if (this._heat.length < 80) {
      this._heat.push({
        x: x+(Math.random()-0.5)*20,
        y: y-(5+Math.random()*15),
        vy: -(0.5+Math.random()),
        life: 0.5+Math.random()*0.5,
        maxLife: 1,
        size: 4+Math.random()*6
      });
    }
  }

  update(dt) {
    for (let i=this._flames.length-1;i>=0;i--) {
      const f=this._flames[i];
      f.x+=f.vx; f.y+=f.vy; f.vx*=0.88; f.vy*=0.88;
      f.life-=dt; f.size+=0.5;
      if(f.life<=0) this._flames.splice(i,1);
    }
    for (let i=this._sparks.length-1;i>=0;i--) {
      const s=this._sparks[i];
      s.x+=s.vx; s.y+=s.vy; s.vy+=0.15;
      s.life-=dt;
      if(s.life<=0) this._sparks.splice(i,1);
    }
    for (let i=this._heat.length-1;i>=0;i--) {
      const h=this._heat[i];
      h.y+=h.vy; h.x+=(Math.random()-0.5)*0.5;
      h.life-=dt;
      if(h.life<=0) this._heat.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    // flames
    for (const f of this._flames) {
      const t=f.life/f.maxLife;
      // outer: orange-red, inner: blue-white
      const r = GradyanDeposu.rad(ctx, f.x, f.y, 0, f.x, f.y, f.size, [0, `rgba(200,240,255,${t*0.9})`, 0.4, `rgba(80,140,255,${t*0.7})`, 0.8, `rgba(255,100,20,${t*0.5})`, 1, 'rgba(255,60,0,0)']);
      ctx.fillStyle=r;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.size,0,Math.PI*2); ctx.fill();
    }
    // sparks
    ctx.strokeStyle='rgba(120,200,255,0.9)';
    ctx.lineWidth=1.5;
    for (const s of this._sparks) {
      const t=s.life/s.maxLife;
      ctx.globalAlpha=t;
      ctx.beginPath();
      ctx.moveTo(s.x,s.y);
      ctx.lineTo(s.x-s.vx*3,s.y-s.vy*3);
      ctx.stroke();
    }
    // heat dots
    for (const h of this._heat) {
      const t=h.life/h.maxLife;
      ctx.globalAlpha=t*0.2;
      ctx.fillStyle='rgba(255,200,100,1)';
      ctx.beginPath(); ctx.arc(h.x,h.y,h.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Water Spray
// ---------------------------------------------------------------------------
class WaterSpraySystem {
  constructor() {
    this._droplets = [];
    this._mist = [];
    this._max = 400;
  }

  emit(xl, yl, xr, yr, vx, vy) {
    if (this._droplets.length>=this._max) return;
    const speed=Math.sqrt((vx||0)**2+(vy||0)**2);
    const count=Math.floor(speed*0.5)+2;
    for (const [wx,wy] of [[xl,yl],[xr,yr]]) {
      for (let i=0;i<count;i++) {
        const side=(wx===xl)?-1:1;
        const fanAngle=-Math.PI*0.35+Math.random()*Math.PI*0.3;
        const sp=2+Math.random()*speed*0.4;
        this._droplets.push({
          x: wx, y: wy,
          vx: Math.cos(fanAngle)*sp*side,
          vy: Math.sin(fanAngle)*sp-1,
          size: 1.5+Math.random()*2.5,
          life: 0.5+Math.random()*0.4,
          maxLife: 0.9
        });
      }
      // mist
      if (this._mist.length<100) {
        this._mist.push({
          x: wx+(Math.random()-0.5)*10,
          y: wy-5,
          vx: (Math.random()-0.5)*1,
          vy: -(0.3+Math.random()*0.8),
          size: 10+Math.random()*15,
          life: 0.6+Math.random()*0.4,
          maxLife: 1
        });
      }
    }
  }

  update(dt) {
    for (let i=this._droplets.length-1;i>=0;i--) {
      const d=this._droplets[i];
      d.x+=d.vx; d.y+=d.vy; d.vy+=0.3;
      d.life-=dt;
      if(d.life<=0) this._droplets.splice(i,1);
    }
    for (let i=this._mist.length-1;i>=0;i--) {
      const m=this._mist[i];
      m.x+=m.vx; m.y+=m.vy;
      m.life-=dt; m.size+=0.5;
      if(m.life<=0) this._mist.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const m of this._mist) {
      const t=m.life/m.maxLife;
      const g = GradyanDeposu.rad(ctx, m.x, m.y, 0, m.x, m.y, m.size, [0, `rgba(180,220,255,${t*0.25})`, 1, 'rgba(180,220,255,0)']);
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(m.x,m.y,m.size,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(180,220,255,0.7)';
    for (const d of this._droplets) {
      ctx.globalAlpha=Math.max(0,d.life/d.maxLife)*0.7;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}


// =============================================================================
// IMPACT_PARTICLES MODULE
// =============================================================================

const IMPACT_PARTICLES = {
  _crash: null,
  _explosion: null,
  _checkpoint: null,
  _powerup: null,

  init() {
    this._crash      = new CrashDebrisSystem();
    this._explosion  = new ExplosionSystem();
    this._checkpoint = new CheckpointEffectSystem();
    this._powerup    = new PowerupCollectSystem();
  },

  triggerCrash(x, y, force) {
    this._crash.trigger(x, y, force);
  },
  triggerExplosion(x, y, level) {
    this._explosion.trigger(x, y, level);
  },
  triggerCheckpoint(x, y, bonus) {
    this._checkpoint.trigger(x, y, bonus);
  },
  triggerPowerup(x, y, type) {
    this._powerup.trigger(x, y, type);
  },

  update(dt) {
    this._crash.update(dt);
    this._explosion.update(dt);
    this._checkpoint.update(dt);
    this._powerup.update(dt);
  },

  draw(ctx) {
    this._crash.draw(ctx);
    this._explosion.draw(ctx);
    this._checkpoint.draw(ctx);
    this._powerup.draw(ctx);
  }
};

// ---------------------------------------------------------------------------
// Crash Debris
// ---------------------------------------------------------------------------
class CrashDebrisSystem {
  constructor() {
    this._debris = [];
    this._groundY = 550;
  }

  trigger(x, y, force) {
    force = Math.max(0.1, Math.min(force||1, 5));
    const count = Math.floor(20 + force * 12);
    const capped = Math.min(count, 80);
    for (let i=0;i<capped;i++) {
      const type = this._pickType(force);
      const angle = Math.random()*Math.PI*2;
      const speed = (2+Math.random()*8)*force*0.6;
      this._debris.push({
        x, y,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed-force*2,
        angle: Math.random()*Math.PI*2,
        spin: (Math.random()-0.5)*0.3,
        size: this._sizeFor(type, force),
        color: this._colorFor(type),
        life: 1,
        maxLife: 0.8+Math.random()*1.2,
        type,
        bounces: 0,
        glowing: type==='spark'
      });
    }
  }

  _pickType(force) {
    const r=Math.random();
    if (r<0.3) return 'spark';
    if (r<0.5) return 'glass';
    if (r<0.75) return 'metal';
    return 'dirt';
  }

  _sizeFor(type, force) {
    const base={spark:2,glass:3,metal:5,dirt:4}[type]||3;
    return base+Math.random()*base*force*0.3;
  }

  _colorFor(type) {
    switch(type) {
      case 'spark': return `hsl(${40+Math.random()*20},100%,${60+Math.random()*30}%)`;
      case 'glass': return `rgba(${180+Math.random()*50},${210+Math.random()*40},255,0.85)`;
      case 'metal': return `rgb(${90+Math.random()*60},${90+Math.random()*60},${90+Math.random()*60})`;
      case 'dirt':  return `rgb(${100+Math.random()*60},${70+Math.random()*40},${30+Math.random()*30})`;
      default: return '#ccc';
    }
  }

  update(dt) {
    for (let i=this._debris.length-1;i>=0;i--) {
      const d=this._debris[i];
      d.vy+=0.3;
      d.vx*=0.98;
      d.x+=d.vx; d.y+=d.vy;
      d.angle+=d.spin;
      d.life-=dt;
      if (d.y>=this._groundY && d.vy>0) {
        if (d.bounces<2&&d.type!=='spark'&&d.type!=='dirt') {
          d.vy=-d.vy*0.4;
          d.vx*=0.7;
          d.bounces++;
          d.y=this._groundY;
        } else {
          d.vy=0; d.vx*=0.85; d.y=this._groundY;
        }
      }
      if (d.life<=0) this._debris.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const d of this._debris) {
      const t=Math.max(0,d.life/d.maxLife);
      ctx.globalAlpha=t;
      ctx.save();
      ctx.translate(d.x,d.y);
      ctx.rotate(d.angle);
      if (d.glowing) {
        ctx.shadowColor=d.color;
        ctx.shadowBlur=6;
      }
      ctx.fillStyle=d.color;
      switch(d.type) {
        case 'spark':
          ctx.beginPath();
          ctx.moveTo(-d.size,0); ctx.lineTo(d.size,0);
          ctx.moveTo(0,-d.size); ctx.lineTo(0,d.size);
          ctx.strokeStyle=d.color; ctx.lineWidth=1.5;
          ctx.stroke();
          break;
        case 'glass':
          ctx.beginPath();
          ctx.moveTo(0,-d.size); ctx.lineTo(d.size*0.7,d.size); ctx.lineTo(-d.size*0.7,d.size);
          ctx.closePath(); ctx.fill();
          break;
        case 'metal':
          ctx.fillRect(-d.size*0.5,-d.size*0.3,d.size,d.size*0.6);
          break;
        case 'dirt':
          ctx.beginPath(); ctx.arc(0,0,d.size,0,Math.PI*2); ctx.fill();
          break;
        default:
          ctx.beginPath(); ctx.arc(0,0,d.size,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha=1;
    ctx.shadowBlur=0;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Explosion System
// ---------------------------------------------------------------------------
class ExplosionSystem {
  constructor() {
    this._events = [];
  }

  trigger(x, y, level) {
    const sizes={small:1,medium:2,large:3.5,epic:6};
    const scale=sizes[level]||1;
    this._events.push({
      x, y, scale,
      t: 0,
      maxT: 1.2+scale*0.3,
      embers: this._makeEmbers(x, y, scale),
      scorch: {x,y,r:10,maxR:40*scale,life:8,maxLife:8},
      phase: 'expand'
    });
  }

  _makeEmbers(x, y, scale) {
    const out=[];
    const n=Math.floor(20+scale*10);
    for (let i=0;i<n;i++) {
      const angle=Math.random()*Math.PI*2;
      const sp=1+Math.random()*3*scale;
      out.push({
        x, y,
        vx: Math.cos(angle)*sp+(Math.random()-0.5)*2,
        vy: Math.sin(angle)*sp-4*scale,
        life: 1, maxLife: 1.5+Math.random()*0.8,
        size: 2+Math.random()*3*scale
      });
    }
    return out;
  }

  update(dt) {
    for (let i=this._events.length-1;i>=0;i--) {
      const e=this._events[i];
      e.t+=dt;
      // update embers
      for (let j=e.embers.length-1;j>=0;j--) {
        const em=e.embers[j];
        em.vx*=0.97; em.vy+=0.15;
        em.x+=em.vx; em.y+=em.vy;
        em.life-=dt;
        if (em.life<=0) e.embers.splice(j,1);
      }
      // grow scorch
      if (e.scorch.r < e.scorch.maxR) e.scorch.r+=e.scale*1.5;
      e.scorch.life-=dt;
      if (e.t>=e.maxT && e.embers.length===0) this._events.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const e of this._events) {
      const t=e.t/e.maxT;
      const scale=e.scale;
      // scorch mark
      if (e.scorch.life>0) {
        const sa=Math.min(0.5,(e.scorch.life/e.scorch.maxLife)*0.6);
        ctx.globalAlpha=sa;
        ctx.fillStyle='rgba(20,10,5,1)';
        ctx.beginPath(); ctx.arc(e.scorch.x,e.scorch.y,e.scorch.r,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
      // shockwave ring
      if (t<0.5) {
        const rt=t/0.5;
        const radius=rt*120*scale;
        ctx.globalAlpha=(1-rt)*0.6;
        ctx.strokeStyle='rgba(255,200,100,1)';
        ctx.lineWidth=3*scale*(1-rt)+1;
        ctx.beginPath(); ctx.arc(e.x,e.y,radius,0,Math.PI*2); ctx.stroke();
      }
      // fireball
      if (t<0.6) {
        const ft=t/0.6;
        const fr=ft*(80*scale)*(1-ft*0.5);
        const g = GradyanDeposu.rad(ctx, e.x, e.y, 0, e.x, e.y, fr, [0, `rgba(255,255,200,${(1-ft)*0.9})`, 0.3, `rgba(255,180,30,${(1-ft)*0.8})`, 0.7, `rgba(255,60,10,${(1-ft)*0.5})`, 1, 'rgba(100,20,0,0)']);
        ctx.globalAlpha=1;
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(e.x,e.y,fr,0,Math.PI*2); ctx.fill();
      }
      // black smoke rising
      if (t>0.2) {
        const st=(t-0.2)/e.maxT;
        const smokeR=st*60*scale;
        const smokeY=e.y-st*80*scale;
        const sg = GradyanDeposu.rad(ctx, e.x, smokeY, 0, e.x, smokeY, smokeR, [0, `rgba(30,20,15,${Math.min(0.6,(1-st)*0.7)})`, 1, 'rgba(30,20,15,0)']);
        ctx.fillStyle=sg;
        ctx.globalAlpha=1;
        ctx.beginPath(); ctx.arc(e.x,smokeY,smokeR,0,Math.PI*2); ctx.fill();
      }
      // embers
      ctx.globalAlpha=1;
      for (const em of e.embers) {
        const et=em.life/em.maxLife;
        ctx.globalAlpha=et;
        ctx.fillStyle=`hsl(${30+et*20},100%,${50+et*40}%)`;
        ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=4;
        ctx.beginPath(); ctx.arc(em.x,em.y,em.size*et,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
      }
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Checkpoint Effect
// ---------------------------------------------------------------------------
class CheckpointEffectSystem {
  constructor() {
    this._events = [];
  }

  trigger(x, y, bonus) {
    bonus = bonus||100;
    const coins=[];
    for (let i=0;i<12;i++) {
      const angle=Math.random()*Math.PI*2;
      const sp=3+Math.random()*5;
      coins.push({x,y,vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp-4,life:1,maxLife:0.8+Math.random()*0.4,size:5+Math.random()*4});
    }
    const stars=[];
    for (let i=0;i<16;i++) {
      const angle=(i/16)*Math.PI*2;
      stars.push({x,y,angle,dist:0,maxDist:60+Math.random()*30,life:1,maxLife:0.6+Math.random()*0.3,size:3+Math.random()*4});
    }
    this._events.push({x,y,bonus,coins,stars,ringR:0,ringMax:80,life:1,maxLife:0.8,
      floatY:y,floatVy:-1.5,floatAlpha:1});
  }

  update(dt) {
    for (let i=this._events.length-1;i>=0;i--) {
      const e=this._events[i];
      e.life-=dt;
      e.ringR+=5; if(e.ringR>e.ringMax) e.ringR=e.ringMax;
      e.floatY+=e.floatVy; e.floatAlpha=Math.max(0,e.life/e.maxLife);
      for (let j=e.coins.length-1;j>=0;j--) {
        const c=e.coins[j];
        c.x+=c.vx; c.y+=c.vy; c.vy+=0.3;
        c.life-=dt; if(c.life<=0) e.coins.splice(j,1);
      }
      for (let j=e.stars.length-1;j>=0;j--) {
        const s=e.stars[j];
        s.dist=Math.min(s.dist+4,s.maxDist);
        s.life-=dt; if(s.life<=0) e.stars.splice(j,1);
      }
      if (e.life<=0&&e.coins.length===0) this._events.splice(i,1);
    }
  }

  _drawStar(ctx, x, y, r, points) {
    const step=Math.PI/points;
    ctx.beginPath();
    for (let i=0;i<points*2;i++) {
      const rad=i%2===0?r:r*0.4;
      const a=i*step-Math.PI/2;
      i===0?ctx.moveTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad):ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);
    }
    ctx.closePath();
  }

  draw(ctx) {
    ctx.save();
    for (const e of this._events) {
      const t=Math.max(0,e.life/e.maxLife);
      // ring pulse
      ctx.globalAlpha=t*0.5;
      ctx.strokeStyle='rgba(255,220,50,1)';
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.ringR,0,Math.PI*2); ctx.stroke();
      // coins
      ctx.fillStyle='#ffd700';
      for (const c of e.coins) {
        ctx.globalAlpha=Math.max(0,c.life/c.maxLife);
        ctx.beginPath(); ctx.arc(c.x,c.y,c.size,0,Math.PI*2); ctx.fill();
      }
      // stars
      ctx.fillStyle='#ffe066';
      for (const s of e.stars) {
        const st=Math.max(0,s.life/s.maxLife);
        ctx.globalAlpha=st;
        const sx=e.x+Math.cos(s.angle)*s.dist;
        const sy=e.y+Math.sin(s.angle)*s.dist;
        this._drawStar(ctx,sx,sy,s.size,5);
        ctx.fill();
      }
      // bonus float
      ctx.globalAlpha=e.floatAlpha;
      ctx.font='bold 18px Arial';
      ctx.fillStyle='#fff';
      ctx.strokeStyle='#aa7700';
      ctx.lineWidth=3;
      ctx.textAlign='center';
      ctx.strokeText(`+${e.bonus}`,e.x,e.floatY);
      ctx.fillText(`+${e.bonus}`,e.x,e.floatY);
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Powerup Collect
// ---------------------------------------------------------------------------
class PowerupCollectSystem {
  constructor() {
    this._events = [];
    this._colors = {coin:'#ffd700',fuel:'#4488ff',repair:'#44dd44',gem:'#cc44ff',default:'#ffffff'};
    this._symbols = {coin:'$',fuel:'⛽',repair:'♥',gem:'◆',default:'★'};
  }

  trigger(x, y, type) {
    type=type||'default';
    const color=this._colors[type]||this._colors.default;
    const sym=this._symbols[type]||this._symbols.default;
    const burst=[];
    for (let i=0;i<24;i++) {
      const angle=(i/24)*Math.PI*2;
      const sp=2+Math.random()*6;
      burst.push({x,y,vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp,life:1,maxLife:0.5+Math.random()*0.3,size:3+Math.random()*5});
    }
    const spiral=[];
    for (let i=0;i<20;i++) {
      const angle=(i/20)*Math.PI*2;
      const dist=30+Math.random()*20;
      spiral.push({angle,dist,life:1,maxLife:0.8,speed:0.15});
    }
    this._events.push({x,y,color,sym,burst,spiral,symbolAlpha:0,symbolScale:0.1,life:1,maxLife:0.9,targetX:x,targetY:y});
  }

  update(dt) {
    for (let i=this._events.length-1;i>=0;i--) {
      const e=this._events[i];
      e.life-=dt;
      e.symbolAlpha=Math.min(1,e.symbolAlpha+dt*4);
      e.symbolScale=Math.min(1.5,e.symbolScale+dt*8);
      if (e.symbolScale>1.3) e.symbolScale=Math.max(1,e.symbolScale-dt*5);
      for (let j=e.burst.length-1;j>=0;j--) {
        const b=e.burst[j];
        b.x+=b.vx; b.y+=b.vy; b.vy+=0.1;
        b.life-=dt; if(b.life<=0) e.burst.splice(j,1);
      }
      for (const s of e.spiral) {
        s.angle+=s.speed;
        s.dist*=0.96;
        s.life-=dt;
      }
      if (e.life<=0&&e.burst.length===0) this._events.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const e of this._events) {
      const t=Math.max(0,e.life/e.maxLife);
      // burst particles
      for (const b of e.burst) {
        ctx.globalAlpha=Math.max(0,b.life/b.maxLife)*t;
        ctx.fillStyle=e.color;
        ctx.beginPath(); ctx.arc(b.x,b.y,b.size,0,Math.PI*2); ctx.fill();
      }
      // spiral absorption
      for (const s of e.spiral) {
        if (s.life<=0) continue;
        const sx=e.x+Math.cos(s.angle)*s.dist;
        const sy=e.y+Math.sin(s.angle)*s.dist;
        ctx.globalAlpha=Math.max(0,s.life/s.maxLife)*0.7;
        ctx.fillStyle=e.color;
        ctx.beginPath(); ctx.arc(sx,sy,3,0,Math.PI*2); ctx.fill();
      }
      // symbol
      ctx.globalAlpha=e.symbolAlpha*t;
      ctx.font=`bold ${Math.floor(24*e.symbolScale)}px Arial`;
      ctx.fillStyle=e.color;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(e.sym,e.x,e.y-20);
    }
    ctx.globalAlpha=1;
    ctx.textBaseline='alphabetic';
    ctx.restore();
  }
}


// =============================================================================
// AMBIENT_PARTICLES MODULE
// =============================================================================

const AMBIENT_PARTICLES = {
  _firefly: null,
  _lava: null,
  _bubbles: null,
  _magic: null,
  _city: null,
  _activeEffects: new Set(),

  init() {
    this._firefly = new FireflySystem();
    this._lava    = new LavaEmberSystem();
    this._bubbles = new UnderwaterBubbleSystem();
    this._magic   = new MagicSparkleSystem();
    this._city    = new CityPollutionSystem();
  },

  enable(effect) {
    this._activeEffects.add(effect);
    const sys=this._getSystem(effect);
    if (sys&&sys.onEnable) sys.onEnable();
  },

  disable(effect) {
    this._activeEffects.delete(effect);
  },

  _getSystem(name) {
    return {firefly:this._firefly,lava:this._lava,bubbles:this._bubbles,magic:this._magic,city:this._city}[name]||null;
  },

  update(dt, worldX, worldY) {
    for (const e of this._activeEffects) {
      const s=this._getSystem(e);
      if (s) s.update(dt,worldX,worldY);
    }
  },

  draw(ctx) {
    for (const e of this._activeEffects) {
      const s=this._getSystem(e);
      if (s) s.draw(ctx);
    }
  }
};

// ---------------------------------------------------------------------------
// Firefly System
// ---------------------------------------------------------------------------
class FireflySystem {
  constructor() {
    this._flies = [];
    this._time = 0;
    for (let i=0;i<50;i++) {
      this._flies.push({
        x: Math.random()*800,
        y: 100+Math.random()*400,
        baseX: 0, baseY: 0,
        noiseOffX: Math.random()*100,
        noiseOffY: Math.random()*100,
        noiseSpeed: 0.003+Math.random()*0.005,
        blinkPhase: Math.random()*Math.PI*2,
        blinkSpeed: 0.04+Math.random()*0.08,
        blinkMin: 0.02, blinkMax: 0.9,
        r:180+Math.floor(Math.random()*30),
        g:230+Math.floor(Math.random()*25),
        b:80+Math.floor(Math.random()*60),
        size: 2+Math.random()*2,
        vx:0, vy:0
      });
      this._flies[i].baseX=this._flies[i].x;
      this._flies[i].baseY=this._flies[i].y;
    }
  }

  // Simple smooth noise via sin sums
  _noise(x) { return (Math.sin(x*1.2)+Math.sin(x*0.7+1.3)+Math.sin(x*2.1+2.7))/3; }

  update(dt, wx, wy) {
    this._time+=dt;
    for (const f of this._flies) {
      const t=this._time;
      f.x=f.baseX + this._noise(t*f.noiseSpeed+f.noiseOffX)*80-(wx||0)*0.05;
      f.y=f.baseY + this._noise(t*f.noiseSpeed+f.noiseOffY)*60-(wy||0)*0.05;
      f.blinkPhase+=f.blinkSpeed;
    }
  }

  draw(ctx) {
    ctx.save();
    for (const f of this._flies) {
      const blink=f.blinkMin+(f.blinkMax-f.blinkMin)*(0.5+0.5*Math.sin(f.blinkPhase));
      ctx.globalAlpha=blink;
      const g = GradyanDeposu.rad(ctx, f.x, f.y, 0, f.x, f.y, f.size*4, [0, `rgba(${f.r},${f.g},${f.b},1)`, 0.4, `rgba(${f.r},${f.g},${f.b},0.4)`, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.size*4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=blink*0.9;
      ctx.fillStyle=`rgb(255,255,220)`;
      ctx.beginPath(); ctx.arc(f.x,f.y,f.size*0.6,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Lava Ember System
// ---------------------------------------------------------------------------
class LavaEmberSystem {
  constructor() {
    this._embers = [];
    this._spatters = [];
    this._max = 120;
    this._sources = []; // [{x,y}]
    this._time=0;
  }

  addSource(x,y) { this._sources.push({x,y}); }
  clearSources() { this._sources=[]; }

  update(dt) {
    this._time+=dt;
    // spawn embers from sources
    for (const src of this._sources) {
      if (this._embers.length<this._max && Math.random()<0.3) {
        const angle=-Math.PI*0.5+(Math.random()-0.5)*0.8;
        const sp=0.5+Math.random()*2;
        this._embers.push({
          x:src.x+(Math.random()-0.5)*20,
          y:src.y,
          vx:Math.cos(angle)*sp,
          vy:Math.sin(angle)*sp,
          size:2+Math.random()*4,
          life:1,maxLife:1+Math.random()*1.5,
          glowPhase:Math.random()*Math.PI*2,
          glowSpeed:0.08+Math.random()*0.1
        });
      }
      // occasional spatter
      if (this._spatters.length<30&&Math.random()<0.02) {
        const sp=3+Math.random()*5;
        const angle=-Math.PI*0.4+Math.random()*(-Math.PI*0.2);
        this._spatters.push({x:src.x,y:src.y,vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp,life:1,maxLife:0.6+Math.random()*0.4,size:3+Math.random()*5});
      }
    }
    for (let i=this._embers.length-1;i>=0;i--) {
      const e=this._embers[i];
      e.vy-=0.06; // rise
      e.vx+=(Math.random()-0.5)*0.05;
      e.x+=e.vx; e.y+=e.vy;
      e.glowPhase+=e.glowSpeed;
      e.life-=dt;
      if(e.life<=0) this._embers.splice(i,1);
    }
    for (let i=this._spatters.length-1;i>=0;i--) {
      const s=this._spatters[i];
      s.vy+=0.3; s.x+=s.vx; s.y+=s.vy;
      s.life-=dt; if(s.life<=0) this._spatters.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const e of this._embers) {
      const t=e.life/e.maxLife;
      const glow=0.5+0.5*Math.sin(e.glowPhase);
      // white to orange to grey
      const heat=t;
      const r=Math.floor(255);
      const g2=Math.floor(heat>0.5?(heat-0.5)*2*200:heat*2*80);
      const b2=Math.floor(heat>0.7?(heat-0.7)*3*200:0);
      ctx.globalAlpha=t*0.9;
      ctx.shadowColor=`rgba(255,${g2},0,1)`;
      ctx.shadowBlur=8*glow;
      ctx.fillStyle=`rgb(${r},${g2},${b2})`;
      ctx.beginPath(); ctx.arc(e.x,e.y,e.size*(0.5+heat*0.5),0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0;
    for (const s of this._spatters) {
      const t=s.life/s.maxLife;
      ctx.globalAlpha=t;
      ctx.fillStyle=`rgb(220,80,10)`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Underwater Bubble System
// ---------------------------------------------------------------------------
class UnderwaterBubbleSystem {
  constructor() {
    this._bubbles = [];
    this._pops = [];
    this._max = 100;
    this._surfaceY = 100;
    this._time=0;
  }

  setSurface(y) { this._surfaceY=y; }

  update(dt) {
    this._time+=dt;
    if (this._bubbles.length<this._max && Math.random()<0.4) {
      this._bubbles.push({
        x:50+Math.random()*700,
        y:580,
        vy:-(0.4+Math.random()*1.2),
        wobble:Math.random()*Math.PI*2,
        wobbleSpeed:0.05+Math.random()*0.08,
        wobbleAmp:0.5+Math.random()*2,
        size:2+Math.random()*6,
        life:1,maxLife:4+Math.random()*3
      });
    }
    for (let i=this._bubbles.length-1;i>=0;i--) {
      const b=this._bubbles[i];
      b.wobble+=b.wobbleSpeed;
      b.x+=Math.sin(b.wobble)*b.wobbleAmp;
      b.y+=b.vy;
      b.life-=dt;
      if (b.y<=this._surfaceY) {
        this._pops.push({x:b.x,y:b.y,r:b.size,maxR:b.size*3,life:0.3,maxLife:0.3});
        this._bubbles.splice(i,1);
      } else if (b.life<=0) {
        this._bubbles.splice(i,1);
      }
    }
    for (let i=this._pops.length-1;i>=0;i--) {
      const p=this._pops[i];
      p.r+=2; p.life-=dt;
      if(p.life<=0) this._pops.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const b of this._bubbles) {
      const t=b.life/b.maxLife;
      ctx.globalAlpha=Math.min(t,0.6);
      ctx.strokeStyle='rgba(180,230,255,0.8)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.size,0,Math.PI*2); ctx.stroke();
      // highlight
      ctx.fillStyle='rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(b.x-b.size*0.3,b.y-b.size*0.3,b.size*0.3,0,Math.PI*2); ctx.fill();
    }
    for (const p of this._pops) {
      const t=p.life/p.maxLife;
      ctx.globalAlpha=t*0.5;
      ctx.strokeStyle='rgba(180,230,255,1)';
      ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Magic Sparkle System
// ---------------------------------------------------------------------------
class MagicSparkleSystem {
  constructor() {
    this._sparkles=[];
    this._max=80;
    this._time=0;
    this._hue=0;
  }

  update(dt) {
    this._time+=dt;
    this._hue=(this._hue+50*dt)%360;
    if (this._sparkles.length<this._max && Math.random()<0.4) {
      this._sparkles.push({
        x:50+Math.random()*700,
        y:50+Math.random()*500,
        vx:(Math.random()-0.5)*0.8,
        vy:(Math.random()-0.5)*0.8,
        drift:Math.random()*Math.PI*2,
        driftSpeed:0.02+Math.random()*0.03,
        rot:Math.random()*Math.PI*2,
        rotSpeed:(Math.random()-0.5)*0.1,
        size:3+Math.random()*5,
        hue:(this._hue+Math.random()*60)%360,
        life:1,maxLife:1.5+Math.random()*1.5
      });
    }
    for (let i=this._sparkles.length-1;i>=0;i--) {
      const s=this._sparkles[i];
      s.drift+=s.driftSpeed;
      s.x+=s.vx+Math.sin(s.drift)*0.5;
      s.y+=s.vy+Math.cos(s.drift)*0.5;
      s.rot+=s.rotSpeed;
      s.life-=dt;
      if(s.life<=0) this._sparkles.splice(i,1);
    }
  }

  _drawStarShape(ctx,x,y,size,points,rot) {
    ctx.beginPath();
    for (let i=0;i<points*2;i++) {
      const r=i%2===0?size:size*0.4;
      const a=i*(Math.PI/points)+rot;
      i===0?ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
    }
    ctx.closePath();
  }

  draw(ctx) {
    ctx.save();
    for (const s of this._sparkles) {
      const t=s.life/s.maxLife;
      ctx.globalAlpha=t;
      const col=`hsl(${s.hue},100%,70%)`;
      ctx.fillStyle=col;
      ctx.shadowColor=col;
      ctx.shadowBlur=8;
      this._drawStarShape(ctx,s.x,s.y,s.size*t,4,s.rot);
      ctx.fill();
    }
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// City Pollution System
// ---------------------------------------------------------------------------
class CityPollutionSystem {
  constructor() {
    this._smog=[];
    this._trash=[];
    this._neonFlickers=[];
    this._vents=[]; // [{x,y}]
    this._max=60;
    this._time=0;
  }

  addVent(x,y) { this._vents.push({x,y}); }
  clearVents() { this._vents=[]; }

  addNeon(x,y,color) { this._neonFlickers.push({x,y,color,alpha:1,flickerPhase:Math.random()*10,flickerSpeed:0.15+Math.random()*0.3,size:8+Math.random()*12}); }

  update(dt) {
    this._time+=dt;
    for (const v of this._vents) {
      if (this._smog.length<this._max&&Math.random()<0.15) {
        this._smog.push({x:v.x+(Math.random()-0.5)*10,y:v.y,vx:(Math.random()-0.5)*0.5,vy:-(0.3+Math.random()*0.6),size:15+Math.random()*20,maxSize:50+Math.random()*40,life:1,maxLife:3+Math.random()*2,r:40+Math.random()*30});
      }
    }
    if (this._trash.length<20&&Math.random()<0.03) {
      this._trash.push({x:-20,y:400+Math.random()*100,vx:1+Math.random()*3,vy:0,rot:Math.random()*Math.PI*2,rotSpeed:(Math.random()-0.5)*0.1,w:8+Math.random()*10,h:4+Math.random()*6,life:1,maxLife:6+Math.random()*4});
    }
    for (let i=this._smog.length-1;i>=0;i--) {
      const s=this._smog[i];
      s.x+=s.vx; s.y+=s.vy; s.vx+=(Math.random()-0.5)*0.05;
      s.size=Math.min(s.size+0.4,s.maxSize);
      s.life-=dt; if(s.life<=0) this._smog.splice(i,1);
    }
    for (let i=this._trash.length-1;i>=0;i--) {
      const t=this._trash[i];
      t.x+=t.vx; t.rot+=t.rotSpeed;
      t.life-=dt; if(t.life<=0||t.x>900) this._trash.splice(i,1);
    }
    for (const n of this._neonFlickers) {
      n.flickerPhase+=n.flickerSpeed;
      n.alpha=0.5+0.5*Math.abs(Math.sin(n.flickerPhase));
      if (Math.random()<0.01) n.alpha=0.1; // glitch off
    }
  }

  draw(ctx) {
    ctx.save();
    for (const s of this._smog) {
      const t=Math.max(0,s.life/s.maxLife);
      const opacity=t*0.3;
      ctx.globalAlpha=opacity;
      const g = GradyanDeposu.rad(ctx, s.x, s.y, 0, s.x, s.y, s.size, [0, `rgba(${s.r},${s.r},${s.r},0.7)`, 1, `rgba(${s.r},${s.r},${s.r},0)`]);
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    }
    for (const t of this._trash) {
      ctx.globalAlpha=0.7;
      ctx.save();
      ctx.translate(t.x,t.y); ctx.rotate(t.rot);
      ctx.fillStyle='#aaa';
      ctx.fillRect(-t.w/2,-t.h/2,t.w,t.h);
      ctx.restore();
    }
    for (const n of this._neonFlickers) {
      ctx.globalAlpha=n.alpha;
      ctx.shadowColor=n.color; ctx.shadowBlur=12;
      ctx.fillStyle=n.color;
      ctx.beginPath(); ctx.arc(n.x,n.y,n.size,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0; ctx.globalAlpha=1;
    ctx.restore();
  }
}


// =============================================================================
// CELEBRATION_PARTICLES MODULE
// =============================================================================

const CELEBRATION_PARTICLES = {
  _confetti: null,
  _fireworks: null,
  _achievement: null,
  _levelup: null,

  init() {
    this._confetti    = new ConfettiSystem();
    this._fireworks   = new VictoryFireworksSystem();
    this._achievement = new AchievementBurstSystem();
    this._levelup     = new LevelUpEffectSystem();
  },

  triggerVictory() {
    this._confetti.burst();
    this._fireworks.launchShow();
  },
  triggerAchievement(x, y, text) {
    this._achievement.trigger(x, y, text);
  },
  triggerLevelUp(x, y) {
    this._levelup.trigger(x, y);
  },

  update(dt) {
    this._confetti.update(dt);
    this._fireworks.update(dt);
    this._achievement.update(dt);
    this._levelup.update(dt);
  },

  draw(ctx, screenW, screenH) {
    this._confetti.draw(ctx);
    this._fireworks.draw(ctx, screenW, screenH);
    this._achievement.draw(ctx);
    this._levelup.draw(ctx);
  }
};

// ---------------------------------------------------------------------------
// Confetti System
// ---------------------------------------------------------------------------
class ConfettiSystem {
  constructor() {
    this._pieces = [];
    this._max = 300;
    this._gravity = 0.25;
    this._colors = [
      '#ff4444','#ff8800','#ffdd00','#44dd44','#44aaff','#aa44ff',
      '#ff44aa','#00dddd','#ff6644','#aadd00','#ff44dd','#44ffaa'
    ];
  }

  burst() {
    for (let i=0;i<200;i++) {
      const color=this._colors[Math.floor(Math.random()*this._colors.length)];
      const side=Math.random()<0.5?-1:1;
      this._pieces.push({
        x: Math.random()*800,
        y: -10-Math.random()*200,
        vx: (Math.random()-0.5)*8,
        vy: 1+Math.random()*4,
        w: 8+Math.random()*10,
        h: 4+Math.random()*6,
        rot: Math.random()*Math.PI*2,
        rotV: (Math.random()-0.5)*0.2,
        color,
        life: 1,
        maxLife: 4+Math.random()*3,
        wave: Math.random()*Math.PI*2,
        waveSpeed: 0.05+Math.random()*0.05,
        waveAmp: 0.5+Math.random()*2,
        flatten: Math.random()
      });
    }
  }

  update(dt) {
    for (let i=this._pieces.length-1;i>=0;i--) {
      const p=this._pieces[i];
      p.wave+=p.waveSpeed;
      p.vx+=Math.sin(p.wave)*p.waveAmp*0.05;
      p.vx*=0.98;
      p.vy+=this._gravity;
      p.vy*=0.995;
      p.x+=p.vx; p.y+=p.vy;
      p.rot+=p.rotV;
      p.flatten=Math.abs(Math.sin(p.rot));
      p.life-=dt;
      if(p.life<=0||p.y>700) this._pieces.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this._pieces) {
      const t=Math.max(0,p.life/p.maxLife);
      ctx.globalAlpha=Math.min(1,t*2);
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot);
      ctx.scale(1,p.flatten);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Victory Fireworks System
// ---------------------------------------------------------------------------
class VictoryFireworksSystem {
  constructor() {
    this._rockets = [];
    this._bursts  = [];
    this._showTimer = 0;
    this._showActive = false;
    this._nextLaunch = 0;
    this._launchIndex = 0;
    this._screenW = 800;
    this._screenH = 600;
    this._burstStyles = ['gold','silver','rainbow','heart','star'];
    this._colors = {
      gold:   ['#ffd700','#ffaa00','#ff8800','#ffffff'],
      silver: ['#dddddd','#aaaaaa','#ffffff','#ccccff'],
      rainbow:['#ff4444','#ff8800','#ffdd00','#44dd44','#44aaff','#aa44ff','#ff44aa'],
      heart:  ['#ff6688','#ff3366','#ff99aa','#ffffff'],
      star:   ['#ffff44','#ffdd00','#ffffff','#aaff44']
    };
  }

  launchShow() {
    this._showActive=true;
    this._showTimer=0;
    this._nextLaunch=0;
    this._launchIndex=0;
  }

  _launchRocket(x) {
    const style=this._burstStyles[Math.floor(Math.random()*this._burstStyles.length)];
    this._rockets.push({
      x: x||100+Math.random()*600,
      y: this._screenH+10,
      vy: -(8+Math.random()*6),
      vx: (Math.random()-0.5)*2,
      targetY: 80+Math.random()*200,
      trail:[],
      style,
      size: 3
    });
  }

  _burst(x, y, style) {
    const colors=this._colors[style]||this._colors.gold;
    const count=40+Math.floor(Math.random()*20);
    const particles=[];
    for (let i=0;i<count;i++) {
      const angle=(i/count)*Math.PI*2;
      const speed=3+Math.random()*5;
      const color=colors[Math.floor(Math.random()*colors.length)];
      particles.push({
        x,y,
        vx:Math.cos(angle)*speed,
        vy:Math.sin(angle)*speed,
        size:2+Math.random()*4,
        color,
        life:1,maxLife:0.8+Math.random()*0.6,
        tail:[],
        isStar:style==='star'
      });
    }
    this._bursts.push({x,y,particles,shockR:0,shockMax:60,shockLife:0.4,shockMaxLife:0.4,color:colors[0]});
  }

  update(dt) {
    if (this._showActive) {
      this._showTimer+=dt;
      this._nextLaunch-=dt;
      if (this._nextLaunch<=0&&this._launchIndex<5) {
        this._launchRocket();
        this._launchIndex++;
        this._nextLaunch=0.4+Math.random()*0.6;
      }
      if (this._showTimer>8) this._showActive=false;
    }
    for (let i=this._rockets.length-1;i>=0;i--) {
      const r=this._rockets[i];
      r.trail.push({x:r.x,y:r.y,life:0.3});
      if (r.trail.length>15) r.trail.shift();
      r.x+=r.vx; r.y+=r.vy;
      r.vy+=0.1;
      for (const t of r.trail) t.life-=dt;
      if (r.y<=r.targetY||r.vy>=0) {
        this._burst(r.x,r.y,r.style);
        this._rockets.splice(i,1);
      }
    }
    for (let i=this._bursts.length-1;i>=0;i--) {
      const b=this._bursts[i];
      b.shockR+=4; b.shockLife-=dt;
      let alive=false;
      for (let j=b.particles.length-1;j>=0;j--) {
        const p=b.particles[j];
        p.tail.push({x:p.x,y:p.y});
        if (p.tail.length>5) p.tail.shift();
        p.vx*=0.96; p.vy+=0.15; p.vy*=0.96;
        p.x+=p.vx; p.y+=p.vy;
        p.life-=dt;
        if(p.life>0) alive=true; else b.particles.splice(j,1);
      }
      if (!alive&&b.shockLife<=0) this._bursts.splice(i,1);
    }
  }

  draw(ctx, screenW, screenH) {
    this._screenW=screenW||this._screenW;
    this._screenH=screenH||this._screenH;
    ctx.save();
    // rockets
    for (const r of this._rockets) {
      for (let k=0;k<r.trail.length;k++) {
        const t=r.trail[k];
        ctx.globalAlpha=k/r.trail.length*0.6;
        ctx.fillStyle='rgba(255,200,100,1)';
        ctx.beginPath(); ctx.arc(t.x,t.y,2,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(r.x,r.y,r.size,0,Math.PI*2); ctx.fill();
    }
    // bursts
    for (const b of this._bursts) {
      // shockwave
      if (b.shockLife>0) {
        const st=b.shockLife/b.shockMaxLife;
        ctx.globalAlpha=st*0.5;
        ctx.strokeStyle=b.color;
        ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(b.x,b.y,b.shockR,0,Math.PI*2); ctx.stroke();
      }
      for (const p of b.particles) {
        const t=Math.max(0,p.life/p.maxLife);
        ctx.globalAlpha=t;
        ctx.fillStyle=p.color;
        ctx.shadowColor=p.color; ctx.shadowBlur=4;
        // draw tail
        for (let k=0;k<p.tail.length;k++) {
          ctx.globalAlpha=t*(k/p.tail.length)*0.4;
          ctx.beginPath(); ctx.arc(p.tail[k].x,p.tail[k].y,p.size*(k/p.tail.length)*0.5,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=t;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*t,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.shadowBlur=0; ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Achievement Burst System
// ---------------------------------------------------------------------------
class AchievementBurstSystem {
  constructor() {
    this._events=[];
  }

  trigger(x, y, text) {
    text=text||'Achievement!';
    const rays=[];
    for (let i=0;i<20;i++) {
      const angle=(i/20)*Math.PI*2;
      rays.push({angle,len:0,maxLen:80+Math.random()*40,speed:4+Math.random()*3,life:1,maxLife:0.7});
    }
    const sparks=[];
    for (let i=0;i<30;i++) {
      const angle=Math.random()*Math.PI*2;
      const sp=3+Math.random()*6;
      sparks.push({x,y,vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp-3,life:1,maxLife:0.8+Math.random()*0.4,size:3+Math.random()*4});
    }
    this._events.push({x,y,text,rays,sparks,textY:y-30,textVy:-0.8,textAlpha:0,textScale:0,crown:{y:y-20,vy:-2,life:1,maxLife:1.5},life:1,maxLife:1.5});
  }

  update(dt) {
    for (let i=this._events.length-1;i>=0;i--) {
      const e=this._events[i];
      e.life-=dt;
      e.textAlpha=Math.min(1,e.textAlpha+dt*4);
      e.textScale=Math.min(1,e.textScale+dt*6);
      e.textY+=e.textVy;
      for (const r of e.rays) { r.len=Math.min(r.len+r.speed,r.maxLen); r.life-=dt; }
      for (let j=e.sparks.length-1;j>=0;j--) {
        const s=e.sparks[j];
        s.x+=s.vx; s.y+=s.vy; s.vy+=0.25;
        s.life-=dt; if(s.life<=0) e.sparks.splice(j,1);
      }
      e.crown.y+=e.crown.vy; e.crown.vy*=0.95; e.crown.life-=dt;
      if (e.life<=0) this._events.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const e of this._events) {
      const t=Math.max(0,e.life/e.maxLife);
      // golden rays
      ctx.strokeStyle='rgba(255,215,0,1)';
      for (const r of e.rays) {
        if (r.life<=0) continue;
        const rt=Math.max(0,r.life/r.maxLife);
        ctx.globalAlpha=rt*t*0.7;
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(e.x,e.y);
        const ex=e.x+Math.cos(r.angle)*r.len;
        const ey=e.y+Math.sin(r.angle)*r.len;
        ctx.lineTo(ex,ey);
        ctx.stroke();
      }
      // sparks
      for (const s of e.sparks) {
        ctx.globalAlpha=Math.max(0,s.life/s.maxLife)*t;
        ctx.fillStyle='#ffd700';
        ctx.shadowColor='#ffaa00'; ctx.shadowBlur=4;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0;
      // crown float
      if (e.crown.life>0) {
        const ct=Math.max(0,e.crown.life/e.crown.maxLife);
        ctx.globalAlpha=ct*t;
        ctx.font=`${Math.floor(20*e.textScale)}px Arial`;
        ctx.textAlign='center';
        ctx.fillStyle='#ffd700';
        ctx.fillText('👑',e.x,e.crown.y);
      }
      // text
      ctx.globalAlpha=e.textAlpha*t;
      ctx.font=`bold ${Math.floor(16*e.textScale)}px Arial`;
      ctx.textAlign='center';
      ctx.fillStyle='#fff';
      ctx.strokeStyle='#aa7700';
      ctx.lineWidth=3;
      ctx.strokeText(e.text,e.x,e.textY);
      ctx.fillText(e.text,e.x,e.textY);
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Level Up Effect System
// ---------------------------------------------------------------------------
class LevelUpEffectSystem {
  constructor() {
    this._events=[];
  }

  trigger(x, y) {
    const stars=[];
    for (let i=0;i<40;i++) {
      stars.push({
        x:x+(Math.random()-0.5)*200,
        y:-20-Math.random()*100,
        vy:2+Math.random()*4,
        vx:(Math.random()-0.5)*2,
        size:2+Math.random()*5,
        rot:Math.random()*Math.PI*2,
        rotV:(Math.random()-0.5)*0.15,
        color:`hsl(${40+Math.random()*30},100%,${60+Math.random()*30}%)`,
        life:1,maxLife:1.5+Math.random()*1.5
      });
    }
    this._events.push({
      x,y,
      stars,
      ringR:0,ringMax:200,
      beam:{h:0,maxH:400,alpha:0,rising:true},
      textAlpha:0,textY:y,textVy:-1.2,textScale:0,
      shockLife:0.5,shockMaxLife:0.5,
      life:1,maxLife:2.5
    });
  }

  update(dt) {
    for (let i=this._events.length-1;i>=0;i--) {
      const e=this._events[i];
      e.life-=dt;
      e.ringR=Math.min(e.ringR+8,e.ringMax);
      // beam
      if (e.beam.rising) { e.beam.h=Math.min(e.beam.h+30,e.beam.maxH); e.beam.alpha=Math.min(0.7,e.beam.alpha+dt*4); if(e.beam.h>=e.beam.maxH) e.beam.rising=false; }
      else { e.beam.alpha=Math.max(0,e.beam.alpha-dt*1.5); }
      // text
      e.textAlpha=Math.min(1,e.textAlpha+dt*3);
      e.textScale=Math.min(1.2,e.textScale+dt*5);
      if (e.textScale>1.1) e.textScale=Math.max(1,e.textScale-dt*2);
      e.textY+=e.textVy; e.textVy*=0.95;
      e.shockLife-=dt;
      for (let j=e.stars.length-1;j>=0;j--) {
        const s=e.stars[j];
        s.x+=s.vx; s.y+=s.vy; s.vy+=0.15;
        s.rot+=s.rotV;
        s.life-=dt; if(s.life<=0) e.stars.splice(j,1);
      }
      if(e.life<=0) this._events.splice(i,1);
    }
  }

  _drawStar(ctx,x,y,r) {
    ctx.beginPath();
    for (let i=0;i<10;i++) {
      const rad=i%2===0?r:r*0.4;
      const a=i*(Math.PI/5)-Math.PI/2;
      i===0?ctx.moveTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad):ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);
    }
    ctx.closePath();
  }

  draw(ctx) {
    ctx.save();
    for (const e of this._events) {
      const t=Math.max(0,e.life/e.maxLife);
      // vertical golden beam
      if (e.beam.alpha>0) {
        const bg = GradyanDeposu.lin(ctx, e.x-20, e.y, e.x+20, e.y, [0, 'rgba(255,215,0,0)', 0.5, `rgba(255,215,0,${e.beam.alpha})`, 1, 'rgba(255,215,0,0)']);
        ctx.globalAlpha=1;
        ctx.fillStyle=bg;
        ctx.fillRect(e.x-20,e.y-e.beam.h,40,e.beam.h);
      }
      // shockwave
      if (e.shockLife>0) {
        const st=e.shockLife/e.shockMaxLife;
        ctx.globalAlpha=st*0.7;
        ctx.strokeStyle='rgba(255,215,0,1)';
        ctx.lineWidth=4*(1-st)+1;
        ctx.beginPath(); ctx.arc(e.x,e.y,e.ringR,0,Math.PI*2); ctx.stroke();
      }
      // falling stars
      for (const s of e.stars) {
        const st=Math.max(0,s.life/s.maxLife);
        ctx.globalAlpha=st;
        ctx.save();
        ctx.translate(s.x,s.y); ctx.rotate(s.rot);
        ctx.fillStyle=s.color;
        ctx.shadowColor=s.color; ctx.shadowBlur=6;
        this._drawStar(ctx,0,0,s.size);
        ctx.fill();
        ctx.restore();
      }
      ctx.shadowBlur=0;
      // level up text
      ctx.globalAlpha=e.textAlpha*t;
      const fs=Math.floor(28*e.textScale);
      ctx.font=`bold ${fs}px Arial`;
      ctx.textAlign='center';
      ctx.fillStyle='#ffd700';
      ctx.strokeStyle='#884400';
      ctx.lineWidth=4;
      ctx.strokeText('+LEVEL UP+',e.x,e.textY);
      ctx.fillText('+LEVEL UP+',e.x,e.textY);
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
}


// =============================================================================
// PARTICLE_POOL_EXT — Extended pool utilities used by all new systems
// =============================================================================

const PARTICLE_POOL_EXT = {

  /**
   * Create a generic pool of N slots, each initialized by factoryFn.
   * Returns { acquire(), release(p), forEach(fn), activeCount() }
   */
  createPool(size, factoryFn) {
    const slots = [];
    for (let i=0;i<size;i++) {
      const p=factoryFn(i);
      p._active=false;
      p._poolIndex=i;
      slots.push(p);
    }
    let freeHead=0;

    return {
      acquire() {
        // linear scan — acceptable for pools ≤2000
        for (let i=0;i<slots.length;i++) {
          if (!slots[i]._active) { slots[i]._active=true; return slots[i]; }
        }
        return null;
      },
      release(p) { if(p) p._active=false; },
      forEach(fn) { for (const s of slots) if(s._active) fn(s); },
      activeCount() { let n=0; for (const s of slots) if(s._active) n++; return n; },
      all: slots
    };
  },

  /**
   * Lerp helper
   */
  lerp(a,b,t) { return a+(b-a)*t; },

  /**
   * Easing functions
   */
  easeOut(t) { return 1-(1-t)**3; },
  easeIn(t)  { return t*t*t; },
  easeInOut(t) { return t<0.5?4*t*t*t:(t-1)*(2*t-2)*(2*t-2)+1; },

  /**
   * Angle between two points
   */
  angleTo(x1,y1,x2,y2) { return Math.atan2(y2-y1,x2-x1); },

  /**
   * Distance squared (cheaper than sqrt)
   */
  distSq(x1,y1,x2,y2) { return (x2-x1)**2+(y2-y1)**2; },

  /**
   * Clamp
   */
  clamp(v,mn,mx) { return Math.max(mn,Math.min(mx,v)); },

  /**
   * Random range
   */
  rand(min,max) { return min+Math.random()*(max-min); },
  randInt(min,max) { return Math.floor(min+Math.random()*(max-min+1)); },

  /**
   * Random color from HSL
   */
  hsl(h,s,l) { return `hsl(${h},${s}%,${l}%)`; },

  /**
   * Convert hex string to r,g,b object
   */
  hexToRgb(hex) {
    const r=parseInt(hex.slice(1,3),16);
    const g=parseInt(hex.slice(3,5),16);
    const b=parseInt(hex.slice(5,7),16);
    return {r,g,b};
  },

  /**
   * Draw a soft circle (radial gradient fill)
   */
  drawSoftCircle(ctx, x, y, radius, color, alpha) {
    const g = GradyanDeposu.rad(ctx, x, y, 0, x, y, radius, [0, color.replace(')',`,${alpha})`).replace('rgb','rgba'), 1, color.replace(')',',0)').replace('rgb','rgba')]);
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fill();
  },

  /**
   * Draw a star polygon
   */
  drawStar(ctx,x,y,outerR,innerR,points,rotation) {
    ctx.beginPath();
    for (let i=0;i<points*2;i++) {
      const r=i%2===0?outerR:innerR;
      const a=i*(Math.PI/points)+(rotation||0)-Math.PI/2;
      i===0?ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);
    }
    ctx.closePath();
  },

  /**
   * Global registry so game loop can call updateAll / drawAll
   */
  _registry: [],

  register(systemObj) {
    if (!this._registry.includes(systemObj)) this._registry.push(systemObj);
  },

  updateAll(dt, ctx_or_wind) {
    for (const s of this._registry) {
      if (typeof s.update==='function') s.update(dt, ctx_or_wind);
    }
  },

  drawAll(ctx, screenW, screenH) {
    for (const s of this._registry) {
      if (typeof s.draw==='function') s.draw(ctx, screenW, screenH);
    }
  }
};

// =============================================================================
// AUTO-INIT & REGISTRATION
// =============================================================================

(function _autoInitNewSystems() {
  try {
    WEATHER_PARTICLES.init();
    PARTICLE_POOL_EXT.register(WEATHER_PARTICLES);
  } catch(e) { /* no-op if already inited */ }

  try {
    VEHICLE_TRAIL_PARTICLES.init();
    PARTICLE_POOL_EXT.register(VEHICLE_TRAIL_PARTICLES);
  } catch(e) {}

  try {
    IMPACT_PARTICLES.init();
    PARTICLE_POOL_EXT.register(IMPACT_PARTICLES);
  } catch(e) {}

  try {
    AMBIENT_PARTICLES.init();
    PARTICLE_POOL_EXT.register(AMBIENT_PARTICLES);
  } catch(e) {}

  try {
    CELEBRATION_PARTICLES.init();
    PARTICLE_POOL_EXT.register(CELEBRATION_PARTICLES);
  } catch(e) {}
})();

// =============================================================================
// PARTICLE_INTEGRATION_LAYER — thin façade the game loop calls
// =============================================================================

const PARTICLE_INTEGRATION_LAYER = {

  /**
   * Call once per frame from your game loop.
   * @param {number}  dt      Delta time in seconds (e.g. 1/60)
   * @param {object}  wind    {x, y} world-space wind vector
   * @param {object}  camera  {x, y} current camera/world offset
   * @param {number}  screenW Canvas display width
   * @param {number}  screenH Canvas display height
   */
  update(dt, wind, camera, screenW, screenH) {
    WEATHER_PARTICLES.update(dt, wind);
    VEHICLE_TRAIL_PARTICLES.update(dt, wind);
    IMPACT_PARTICLES.update(dt);
    AMBIENT_PARTICLES.update(dt, camera ? camera.x : 0, camera ? camera.y : 0);
    CELEBRATION_PARTICLES.update(dt);
  },

  /**
   * Call once per frame after all world rendering.
   * ctx should already be in SCREEN space (no world transform applied).
   */
  draw(ctx, screenW, screenH) {
    WEATHER_PARTICLES.draw(ctx, screenW, screenH);
    VEHICLE_TRAIL_PARTICLES.draw(ctx);
    IMPACT_PARTICLES.draw(ctx);
    AMBIENT_PARTICLES.draw(ctx);
    CELEBRATION_PARTICLES.draw(ctx, screenW, screenH);
  },

  // ---- Weather convenience wrappers ----

  setWeather(type, intensity) {
    WEATHER_PARTICLES.setWeather(type, intensity);
  },

  clearWeather() {
    WEATHER_PARTICLES.clear();
  },

  // ---- Vehicle events ----

  onTireSpin(x, y, slipAmount, surface) {
    VEHICLE_TRAIL_PARTICLES.emitTireSmoke(x, y, slipAmount, surface || 'asphalt');
  },

  onWheelOnDirt(xl, yl, xr, yr, speed, surface) {
    VEHICLE_TRAIL_PARTICLES.emitDust(xl, yl, xr, yr, speed, surface || 'dirt');
  },

  onHitMud(x, y, vehicleVx, vehicleVy) {
    VEHICLE_TRAIL_PARTICLES.emitMud(x, y, vehicleVx, vehicleVy);
  },

  onNitroActive(exhaustX, exhaustY, dir, intensity) {
    VEHICLE_TRAIL_PARTICLES.emitNitro(exhaustX, exhaustY, dir, intensity);
  },

  onWheelInWater(xl, yl, xr, yr, vx, vy) {
    VEHICLE_TRAIL_PARTICLES.emitWaterSpray(xl, yl, xr, yr, vx, vy);
  },

  // ---- Impact events ----

  onCrash(x, y, forceMagnitude) {
    IMPACT_PARTICLES.triggerCrash(x, y, forceMagnitude);
  },

  onExplosion(x, y, size) {
    // size: 'small' | 'medium' | 'large' | 'epic'
    IMPACT_PARTICLES.triggerExplosion(x, y, size || 'medium');
  },

  onCheckpoint(x, y, bonusValue) {
    IMPACT_PARTICLES.triggerCheckpoint(x, y, bonusValue || 100);
  },

  onPowerupCollect(x, y, powerupType) {
    IMPACT_PARTICLES.triggerPowerup(x, y, powerupType || 'coin');
  },

  // ---- Ambient scene toggles ----

  enableAmbient(effectName) {
    AMBIENT_PARTICLES.enable(effectName);
  },

  disableAmbient(effectName) {
    AMBIENT_PARTICLES.disable(effectName);
  },

  // ---- Celebration events ----

  onVictory() {
    CELEBRATION_PARTICLES.triggerVictory();
  },

  onAchievement(x, y, text) {
    CELEBRATION_PARTICLES.triggerAchievement(x, y, text);
  },

  onLevelUp(x, y) {
    CELEBRATION_PARTICLES.triggerLevelUp(x, y);
  }
};

// =============================================================================
// WEATHER_TRANSITION_CONTROLLER — smooth blending between weather states
// =============================================================================

const WEATHER_TRANSITION_CONTROLLER = {
  _current: null,
  _next: null,
  _progress: 0,
  _duration: 3,   // seconds to cross-fade
  _active: false,

  transitionTo(type, intensity, durationSec) {
    this._next = { type, intensity };
    this._duration = durationSec || 3;
    this._progress = 0;
    this._active = true;
    // Start the new system at zero opacity — handled by gradual enable
    WEATHER_PARTICLES.setWeather(type, intensity);
  },

  update(dt) {
    if (!this._active) return;
    this._progress = Math.min(1, this._progress + dt / this._duration);
    if (this._progress >= 1) {
      this._current = this._next;
      this._next = null;
      this._active = false;
    }
  },

  isTransitioning() { return this._active; },
  getProgress()     { return this._progress; }
};

// =============================================================================
// SURFACE_PARTICLE_MAP — maps terrain surface types to particle behaviors
// =============================================================================

const SURFACE_PARTICLE_MAP = {
  asphalt: { dust: false, mud: false, smokeColor: [200,200,200], dustColor: null,          skidMark: true  },
  dirt:    { dust: true,  mud: false, smokeColor: [140,100, 60], dustColor: '140,100,60',  skidMark: false },
  gravel:  { dust: true,  mud: false, smokeColor: [160,140,100], dustColor: '160,140,100', skidMark: false },
  mud:     { dust: false, mud: true,  smokeColor: [ 80, 55, 30], dustColor: null,          skidMark: false },
  sand:    { dust: true,  mud: false, smokeColor: [210,170, 90], dustColor: '210,170,90',  skidMark: false },
  grass:   { dust: true,  mud: false, smokeColor: [100,140, 60], dustColor: '120,140,60',  skidMark: false },
  snow:    { dust: true,  mud: false, smokeColor: [230,240,255], dustColor: '230,240,255', skidMark: false },
  ice:     { dust: false, mud: false, smokeColor: [200,230,255], dustColor: null,          skidMark: true  },
  water:   { dust: false, mud: false, smokeColor: [160,210,240], dustColor: null,          skidMark: false },
  lava:    { dust: false, mud: false, smokeColor: [255,100, 30], dustColor: null,          skidMark: false }
};

/**
 * Given wheel position, speed, slip, and surface name:
 * fires the right particle events automatically.
 */
function autoEmitWheelParticles(wheelX, wheelY, speed, slip, surfaceName) {
  const info = SURFACE_PARTICLE_MAP[surfaceName] || SURFACE_PARTICLE_MAP.asphalt;
  if (slip > 0.3) {
    PARTICLE_INTEGRATION_LAYER.onTireSpin(wheelX, wheelY, slip, surfaceName);
  }
  if (info.dust && speed > 2) {
    VEHICLE_TRAIL_PARTICLES.emitDust(wheelX, wheelY, wheelX, wheelY, speed, surfaceName);
  }
  if (info.mud && speed > 1) {
    VEHICLE_TRAIL_PARTICLES.emitMud(wheelX, wheelY, speed * 0.5, -slip * 2);
  }
}

// =============================================================================
// PARTICLE_DEBUG_HUD — optional overlay showing live particle counts
// =============================================================================

const PARTICLE_DEBUG_HUD = {
  _visible: false,

  toggle() { this._visible = !this._visible; },
  show()   { this._visible = true; },
  hide()   { this._visible = false; },

  draw(ctx) {
    if (!this._visible) return;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, 10, 220, 180);

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0f0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';

    const lines = [
      '--- PARTICLE DEBUG HUD ---',
      `RAIN drops:   ${WEATHER_PARTICLES._rain ? WEATHER_PARTICLES._rain._pool.filter(p=>p.active).length : 0}`,
      `SNOW flakes:  ${WEATHER_PARTICLES._snow ? WEATHER_PARTICLES._snow._flakes.filter(p=>p.active).length : 0}`,
      `HAIL stones:  ${WEATHER_PARTICLES._hail ? WEATHER_PARTICLES._hail._stones.filter(p=>p.active).length : 0}`,
      `FOG patches:  ${WEATHER_PARTICLES._fog  ? WEATHER_PARTICLES._fog._patches.length : 0}`,
      `SAND grains:  ${WEATHER_PARTICLES._sandstorm ? WEATHER_PARTICLES._sandstorm._grains.filter(p=>p.active).length : 0}`,
      `TIRE smoke:   ${VEHICLE_TRAIL_PARTICLES._tiresmoke ? VEHICLE_TRAIL_PARTICLES._tiresmoke._particles.length : 0}`,
      `DUST:         ${VEHICLE_TRAIL_PARTICLES._dust ? VEHICLE_TRAIL_PARTICLES._dust._particles.length : 0}`,
      `NITRO:        ${VEHICLE_TRAIL_PARTICLES._nitro ? VEHICLE_TRAIL_PARTICLES._nitro._flames.length : 0}`,
      `DEBRIS:       ${IMPACT_PARTICLES._crash ? IMPACT_PARTICLES._crash._debris.length : 0}`,
      `EXPLOSIONS:   ${IMPACT_PARTICLES._explosion ? IMPACT_PARTICLES._explosion._events.length : 0}`,
      `CONFETTI:     ${CELEBRATION_PARTICLES._confetti ? CELEBRATION_PARTICLES._confetti._pieces.length : 0}`,
      `FIREWORKS:    ${CELEBRATION_PARTICLES._fireworks ? CELEBRATION_PARTICLES._fireworks._bursts.length : 0}`,
    ];

    for (let i=0;i<lines.length;i++) {
      ctx.fillText(lines[i], 18, 28+i*13);
    }
    ctx.restore();
  }
};

// =============================================================================
// PARTICLE_PRESET_RUNNER — fire named presets that combine multiple systems
// =============================================================================

const PARTICLE_PRESET_RUNNER = {

  run(name, x, y, options) {
    options = options || {};
    switch (name) {

      case 'finish_line':
        CELEBRATION_PARTICLES.triggerVictory();
        break;

      case 'vehicle_on_fire':
        // repeated explosion + ember from vehicle position
        for (let i=0;i<3;i++) {
          setTimeout(() => {
            IMPACT_PARTICLES.triggerExplosion(x+(Math.random()-0.5)*30, y+(Math.random()-0.5)*20, 'small');
          }, i*200);
        }
        break;

      case 'coin_shower':
        for (let i=0;i<8;i++) {
          setTimeout(() => {
            IMPACT_PARTICLES.triggerCheckpoint(x+(Math.random()-0.5)*100, y-Math.random()*60, options.value||50);
          }, i*80);
        }
        break;

      case 'speed_boost':
        PARTICLE_INTEGRATION_LAYER.onNitroActive(x, y, Math.PI, 1.5);
        break;

      case 'big_crash':
        IMPACT_PARTICLES.triggerCrash(x, y, options.force||3);
        IMPACT_PARTICLES.triggerExplosion(x, y, options.size||'medium');
        break;

      case 'magic_collect':
        IMPACT_PARTICLES.triggerPowerup(x, y, 'gem');
        AMBIENT_PARTICLES.enable('magic');
        setTimeout(() => AMBIENT_PARTICLES.disable('magic'), 2000);
        break;

      case 'fuel_collect':
        IMPACT_PARTICLES.triggerPowerup(x, y, 'fuel');
        break;

      case 'repair_collect':
        IMPACT_PARTICLES.triggerPowerup(x, y, 'repair');
        break;

      default:
        // fall through silently
        break;
    }
  },

  /**
   * Convenience: run a preset and return a token to cancel repeated presets.
   * (Repeated presets not implemented yet — returns null.)
   */
  runOnce(name, x, y, options) {
    this.run(name, x, y, options);
    return null;
  }
};

// =============================================================================
// SKID_MARK_RENDERER — persistent decals on terrain for tire marks
// =============================================================================

const SKID_MARK_RENDERER = {
  _marks: [],
  _maxMarks: 200,
  _fadeTime: 8, // seconds until fully faded

  addMark(x, y, width, angle, surfaceName) {
    const info = SURFACE_PARTICLE_MAP[surfaceName] || SURFACE_PARTICLE_MAP.asphalt;
    if (!info.skidMark) return;
    if (this._marks.length >= this._maxMarks) this._marks.shift();
    this._marks.push({
      x, y, width: width||12, angle: angle||0,
      length: 4+Math.random()*6,
      alpha: 0.55+Math.random()*0.2,
      life: this._fadeTime
    });
  },

  update(dt) {
    for (let i=this._marks.length-1;i>=0;i--) {
      this._marks[i].life -= dt;
      if (this._marks[i].life <= 0) this._marks.splice(i,1);
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,15,10,1)';
    for (const m of this._marks) {
      const t = Math.max(0, m.life / this._fadeTime);
      ctx.globalAlpha = m.alpha * t;
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.fillRect(-m.length/2, -m.width/2, m.length, m.width);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// PARTICLE_SOUND_HINT — non-audio module that emits named hints for audio layer
// =============================================================================

const PARTICLE_SOUND_HINT = {
  _queue: [],
  _listeners: [],

  emit(soundName, x, y, volume) {
    this._queue.push({ soundName, x: x||0, y: y||0, volume: volume||1.0 });
    for (const fn of this._listeners) fn(soundName, x||0, y||0, volume||1.0);
  },

  onHint(fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  },

  flush() {
    const q = this._queue.slice();
    this._queue.length = 0;
    return q;
  }
};

// Wire sound hints into impact events
const _origTriggerCrash = IMPACT_PARTICLES.triggerCrash.bind(IMPACT_PARTICLES);
IMPACT_PARTICLES.triggerCrash = function(x,y,force) {
  _origTriggerCrash(x,y,force);
  PARTICLE_SOUND_HINT.emit('crash', x, y, Math.min(1,force*0.3));
};

const _origTriggerExplosion = IMPACT_PARTICLES.triggerExplosion.bind(IMPACT_PARTICLES);
IMPACT_PARTICLES.triggerExplosion = function(x,y,level) {
  _origTriggerExplosion(x,y,level);
  const vol = {small:0.4,medium:0.65,large:0.85,epic:1.0}[level]||0.6;
  PARTICLE_SOUND_HINT.emit('explosion', x, y, vol);
};

const _origTriggerCheckpoint = IMPACT_PARTICLES.triggerCheckpoint.bind(IMPACT_PARTICLES);
IMPACT_PARTICLES.triggerCheckpoint = function(x,y,bonus) {
  _origTriggerCheckpoint(x,y,bonus);
  PARTICLE_SOUND_HINT.emit('checkpoint', x, y, 0.8);
};

// =============================================================================
// EXTENDED MATH HELPERS for particle systems
// =============================================================================

const ParticleMath = {
  TAU: Math.PI * 2,

  /** Map value from [inMin,inMax] to [outMin,outMax] */
  map(v, inMin, inMax, outMin, outMax) {
    return outMin + (v-inMin)/(inMax-inMin)*(outMax-outMin);
  },

  /** Smooth step */
  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x-edge0)/(edge1-edge0)));
    return t*t*(3-2*t);
  },

  /** Return random element of array */
  pick(arr) { return arr[Math.floor(Math.random()*arr.length)]; },

  /** 2D vector add in-place */
  vadd(v, dx, dy) { v.x+=dx; v.y+=dy; return v; },

  /** 2D vector scale in-place */
  vscale(v, s) { v.x*=s; v.y*=s; return v; },

  /** Rotate a 2D point around origin */
  rotatePoint(x, y, angle) {
    const c=Math.cos(angle), s=Math.sin(angle);
    return { x: x*c-y*s, y: x*s+y*c };
  },

  /** Simple 1D perlin-like noise (sums of sines) */
  noise1(x, octaves) {
    let v=0, amp=1, freq=1, max=0;
    octaves = octaves||4;
    for (let i=0;i<octaves;i++) {
      v += Math.sin(x*freq+i*1.7)*amp;
      max+=amp; amp*=0.5; freq*=2;
    }
    return v/max;
  },

  /** Convert degrees to radians */
  deg2rad(d) { return d*Math.PI/180; },

  /** Random gaussian (Box-Muller) */
  randGaussian(mean, std) {
    const u=1-Math.random(), v=Math.random();
    const z=Math.sqrt(-2*Math.log(u))*Math.cos(Math.PI*2*v);
    return mean+z*std;
  }
};

// =============================================================================
// GLOBAL EXPORT (browser global scope)
// =============================================================================

if (typeof window !== 'undefined') {
  window.WEATHER_PARTICLES          = WEATHER_PARTICLES;
  window.VEHICLE_TRAIL_PARTICLES    = VEHICLE_TRAIL_PARTICLES;
  window.IMPACT_PARTICLES           = IMPACT_PARTICLES;
  window.AMBIENT_PARTICLES          = AMBIENT_PARTICLES;
  window.CELEBRATION_PARTICLES      = CELEBRATION_PARTICLES;
  window.PARTICLE_POOL_EXT          = PARTICLE_POOL_EXT;
  window.PARTICLE_INTEGRATION_LAYER = PARTICLE_INTEGRATION_LAYER;
  window.WEATHER_TRANSITION_CONTROLLER = WEATHER_TRANSITION_CONTROLLER;
  window.SURFACE_PARTICLE_MAP       = SURFACE_PARTICLE_MAP;
  window.autoEmitWheelParticles     = autoEmitWheelParticles;
  window.PARTICLE_DEBUG_HUD         = PARTICLE_DEBUG_HUD;
  window.PARTICLE_PRESET_RUNNER     = PARTICLE_PRESET_RUNNER;
  window.SKID_MARK_RENDERER         = SKID_MARK_RENDERER;
  window.PARTICLE_SOUND_HINT        = PARTICLE_SOUND_HINT;
  window.ParticleMath               = ParticleMath;
}


// =============================================================================
// EXTENDED VEHICLE TRAIL — SKID STREAK RENDERER
// =============================================================================

class SkidStreakRenderer {
  constructor() {
    this._streaks = [];
    this._maxStreaks = 60;
    this._points = []; // rolling buffer of {x,y,w,alpha}
    this._maxPoints = 1000;
  }

  addPoint(x, y, width, alpha) {
    if (this._points.length >= this._maxPoints) this._points.shift();
    this._points.push({x, y, w: width||8, a: alpha||0.5, age: 0});
  }

  update(dt) {
    for (const p of this._points) p.age += dt;
  }

  draw(ctx) {
    if (this._points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i=1; i<this._points.length; i++) {
      const prev = this._points[i-1];
      const curr = this._points[i];
      const fadeAge = 6; // seconds to fade
      const alpha = curr.a * Math.max(0, 1 - curr.age / fadeAge);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(20,15,10,1)';
      ctx.lineWidth = curr.w;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() { this._points.length = 0; }
}

const SKID_STREAK_RENDERER = new SkidStreakRenderer();

// =============================================================================
// EXTENDED WEATHER — LIGHTNING FLASH EFFECT
// =============================================================================

const LIGHTNING_EFFECT = {
  _bolts: [],
  _flashAlpha: 0,
  _screenW: 800,
  _screenH: 600,

  strike(x1, y1, x2, y2) {
    const bolt = this._makeBolt(x1, y1, x2, y2, 4);
    this._bolts.push({ segments: bolt, life: 0.3, maxLife: 0.3 });
    this._flashAlpha = 0.25;
  },

  _makeBolt(x1, y1, x2, y2, detail) {
    if (detail <= 0) return [{x:x1,y:y1},{x:x2,y:y2}];
    const mx = (x1+x2)*0.5 + (Math.random()-0.5)*(x2-x1)*0.5;
    const my = (y1+y2)*0.5 + (Math.random()-0.5)*(y2-y1)*0.5;
    return [...this._makeBolt(x1,y1,mx,my,detail-1), ...this._makeBolt(mx,my,x2,y2,detail-1)];
  },

  update(dt) {
    this._flashAlpha = Math.max(0, this._flashAlpha - dt * 3);
    for (let i=this._bolts.length-1; i>=0; i--) {
      this._bolts[i].life -= dt;
      if (this._bolts[i].life <= 0) this._bolts.splice(i, 1);
    }
  },

  draw(ctx, screenW, screenH) {
    this._screenW = screenW || this._screenW;
    this._screenH = screenH || this._screenH;
    ctx.save();
    // screen flash
    if (this._flashAlpha > 0) {
      ctx.fillStyle = `rgba(220,230,255,${this._flashAlpha})`;
      ctx.fillRect(0, 0, this._screenW, this._screenH);
    }
    // bolts
    for (const bolt of this._bolts) {
      const t = bolt.life / bolt.maxLife;
      ctx.globalAlpha = t;
      ctx.strokeStyle = `rgba(200,220,255,${t})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(150,180,255,1)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i=0; i<bolt.segments.length; i++) {
        const pt = bolt.segments[i];
        i===0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// EXTENDED AMBIENT — DUST_DEVIL (small tornado vortex)
// =============================================================================

class DustDevilSystem {
  constructor() {
    this._devils = [];
  }

  spawn(x, y) {
    const particles = [];
    for (let i=0;i<60;i++) {
      const angle = Math.random()*Math.PI*2;
      const radius = 5+Math.random()*25;
      particles.push({
        angle,
        radius,
        baseRadius: radius,
        y: y + Math.random()*80,
        baseY: y,
        vy: -(0.5+Math.random()*1.5),
        angularSpeed: 0.05+Math.random()*0.08,
        size: 3+Math.random()*4,
        opacity: 0.4+Math.random()*0.4,
        color: `rgb(${180+Math.floor(Math.random()*40)},${140+Math.floor(Math.random()*30)},${80+Math.floor(Math.random()*30)})`
      });
    }
    this._devils.push({ x, y, particles, life: 1, maxLife: 4+Math.random()*3, height: 0, maxHeight: 120+Math.random()*80 });
  }

  update(dt) {
    for (let i=this._devils.length-1; i>=0; i--) {
      const d = this._devils[i];
      d.life -= dt;
      d.height = Math.min(d.height+2, d.maxHeight);
      d.x += (Math.random()-0.5)*0.5;
      for (const p of d.particles) {
        p.angle += p.angularSpeed;
        p.y += p.vy;
        p.radius = p.baseRadius * (1 + (d.y - p.y) / d.maxHeight * 0.5);
        if (p.y < d.y - d.height) { p.y = d.y; p.radius = p.baseRadius; }
      }
      if (d.life <= 0) this._devils.splice(i,1);
    }
  }

  draw(ctx) {
    ctx.save();
    for (const d of this._devils) {
      const t = Math.max(0, d.life/d.maxLife);
      for (const p of d.particles) {
        const px = d.x + Math.cos(p.angle)*p.radius;
        const py = p.y;
        const heightFade = Math.max(0, 1 - (d.y-py)/d.maxHeight);
        ctx.globalAlpha = p.opacity * t * heightFade;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

const DUST_DEVIL_SYSTEM = new DustDevilSystem();

// =============================================================================
// EXTENDED IMPACT — SHOCKWAVE RING (standalone)
// =============================================================================

const SHOCKWAVE_SYSTEM = {
  _rings: [],

  emit(x, y, color, maxR, duration) {
    this._rings.push({
      x, y,
      r: 0,
      maxR: maxR||120,
      color: color||'rgba(255,255,255,1)',
      life: 1,
      maxLife: duration||0.5,
      lineW: 3
    });
  },

  update(dt) {
    for (let i=this._rings.length-1; i>=0; i--) {
      const r = this._rings[i];
      r.r = (1 - r.life/r.maxLife) * r.maxR;
      r.life -= dt;
      if (r.life <= 0) this._rings.splice(i,1);
    }
  },

  draw(ctx) {
    ctx.save();
    for (const r of this._rings) {
      const t = Math.max(0, r.life/r.maxLife);
      ctx.globalAlpha = t * 0.7;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.lineW * t + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// HEAT_HAZE_RENDERER — post-process-style shimmer layer
// =============================================================================

const HEAT_HAZE_RENDERER = {
  _sources: [], // [{x,y,intensity,radius}]
  _time: 0,

  addSource(x, y, intensity, radius) {
    this._sources.push({x, y, intensity: intensity||1, radius: radius||60, id: Math.random()});
  },

  clearSources() { this._sources = []; },

  update(dt) { this._time += dt; },

  /**
   * Draw heat haze by drawing small wavy dots above heat sources.
   * True pixel-level distortion requires WebGL; this is a Canvas 2D approximation.
   */
  draw(ctx) {
    if (this._sources.length === 0) return;
    ctx.save();
    for (const s of this._sources) {
      const count = Math.floor(s.intensity * 8);
      for (let i=0;i<count;i++) {
        const angle = (i/count)*Math.PI*2 + this._time*0.5;
        const d = s.radius*0.3+Math.sin(this._time*2+i)*s.radius*0.15;
        const px = s.x + Math.cos(angle)*d;
        const py = s.y - 10 - Math.abs(Math.sin(this._time+i*0.7))*s.radius*0.4;
        const wave = Math.sin(this._time*3+i)*2;
        ctx.globalAlpha = 0.06 * s.intensity;
        ctx.fillStyle = 'rgba(255,220,150,1)';
        ctx.beginPath(); ctx.arc(px+wave, py, 4+Math.random()*4, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// PARTICLE_SYSTEM_REGISTRY — central registry for all new systems
// =============================================================================

const PARTICLE_SYSTEM_REGISTRY = {
  _systems: {
    weather:          WEATHER_PARTICLES,
    vehicleTrail:     VEHICLE_TRAIL_PARTICLES,
    impact:           IMPACT_PARTICLES,
    ambient:          AMBIENT_PARTICLES,
    celebration:      CELEBRATION_PARTICLES,
    skidStreak:       SKID_STREAK_RENDERER,
    lightning:        LIGHTNING_EFFECT,
    dustDevil:        DUST_DEVIL_SYSTEM,
    shockwave:        SHOCKWAVE_SYSTEM,
    heatHaze:         HEAT_HAZE_RENDERER,
    skidMark:         SKID_MARK_RENDERER,
    integration:      PARTICLE_INTEGRATION_LAYER,
    weatherTransition:WEATHER_TRANSITION_CONTROLLER,
    presets:          PARTICLE_PRESET_RUNNER,
    soundHint:        PARTICLE_SOUND_HINT,
    math:             ParticleMath,
    poolExt:          PARTICLE_POOL_EXT,
    surfaceMap:       SURFACE_PARTICLE_MAP,
    debugHud:         PARTICLE_DEBUG_HUD
  },

  get(name) { return this._systems[name] || null; },

  updateAll(dt, opts) {
    opts = opts || {};
    const wind   = opts.wind   || {x:0,y:0};
    const camera = opts.camera || {x:0,y:0};
    const sw     = opts.screenW || 800;
    const sh     = opts.screenH || 600;

    WEATHER_PARTICLES.update(dt, wind);
    VEHICLE_TRAIL_PARTICLES.update(dt, wind);
    IMPACT_PARTICLES.update(dt);
    AMBIENT_PARTICLES.update(dt, camera.x, camera.y);
    CELEBRATION_PARTICLES.update(dt);
    SKID_STREAK_RENDERER.update(dt);
    LIGHTNING_EFFECT.update(dt);
    DUST_DEVIL_SYSTEM.update(dt);
    SHOCKWAVE_SYSTEM.update(dt);
    HEAT_HAZE_RENDERER.update(dt);
    SKID_MARK_RENDERER.update(dt);
    WEATHER_TRANSITION_CONTROLLER.update(dt);
  },

  drawAll(ctx, screenW, screenH) {
    screenW = screenW||800; screenH = screenH||600;
    // draw order: back to front
    HEAT_HAZE_RENDERER.draw(ctx);
    WEATHER_PARTICLES.draw(ctx, screenW, screenH);
    SKID_MARK_RENDERER.draw(ctx);
    SKID_STREAK_RENDERER.draw(ctx);
    VEHICLE_TRAIL_PARTICLES.draw(ctx);
    IMPACT_PARTICLES.draw(ctx);
    DUST_DEVIL_SYSTEM.draw(ctx);
    AMBIENT_PARTICLES.draw(ctx);
    SHOCKWAVE_SYSTEM.draw(ctx);
    LIGHTNING_EFFECT.draw(ctx, screenW, screenH);
    CELEBRATION_PARTICLES.draw(ctx, screenW, screenH);
    PARTICLE_DEBUG_HUD.draw(ctx);
  }
};

// Export to window
if (typeof window !== 'undefined') {
  window.SKID_STREAK_RENDERER     = SKID_STREAK_RENDERER;
  window.LIGHTNING_EFFECT         = LIGHTNING_EFFECT;
  window.DUST_DEVIL_SYSTEM        = DUST_DEVIL_SYSTEM;
  window.SHOCKWAVE_SYSTEM         = SHOCKWAVE_SYSTEM;
  window.HEAT_HAZE_RENDERER       = HEAT_HAZE_RENDERER;
  window.PARTICLE_SYSTEM_REGISTRY = PARTICLE_SYSTEM_REGISTRY;
  window.autoEmitWheelParticles   = autoEmitWheelParticles;
}


// =============================================================================
// EXTENDED CELEBRATION — SCORE_POP_SYSTEM (floating score numbers)
// =============================================================================

const SCORE_POP_SYSTEM = {
  _pops: [],

  emit(x, y, value, color) {
    this._pops.push({
      x, y,
      vy: -1.8,
      text: typeof value === 'number' ? (value > 0 ? `+${value}` : `${value}`) : String(value),
      color: color || '#fff',
      outlineColor: '#333',
      size: 16,
      maxSize: 22,
      life: 1,
      maxLife: 1.2,
      wobble: 0,
      wobbleAmp: (Math.random()-0.5)*6,
      scale: 0.1
    });
  },

  update(dt) {
    for (let i=this._pops.length-1; i>=0; i--) {
      const p = this._pops[i];
      p.y += p.vy;
      p.vy *= 0.96;
      p.wobble += 0.15;
      p.life -= dt;
      p.scale = Math.min(1.1, p.scale + dt*6);
      if (p.scale > 1.05) p.scale = Math.max(1, p.scale - dt*3);
      if (p.life <= 0) this._pops.splice(i,1);
    }
  },

  draw(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this._pops) {
      const t = Math.max(0, p.life / p.maxLife);
      const wobbleX = Math.sin(p.wobble) * p.wobbleAmp * t;
      ctx.globalAlpha = t;
      ctx.save();
      ctx.translate(p.x + wobbleX, p.y);
      ctx.scale(p.scale, p.scale);
      const fs = Math.floor(p.size + (p.maxSize - p.size) * (1-t));
      ctx.font = `bold ${fs}px Arial`;
      ctx.strokeStyle = p.outlineColor;
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
};

// =============================================================================
// EXTENDED AMBIENT — STAR_FIELD (for space/night maps)
// =============================================================================

const STAR_FIELD_SYSTEM = {
  _stars: [],
  _shootingStars: [],
  _time: 0,
  _enabled: false,

  init(count, screenW, screenH) {
    this._stars = [];
    count = count || 150;
    screenW = screenW || 800;
    screenH = screenH || 600;
    for (let i=0;i<count;i++) {
      this._stars.push({
        x: Math.random()*screenW,
        y: Math.random()*screenH*0.6,
        size: 0.5 + Math.random()*1.5,
        twinklePhase: Math.random()*Math.PI*2,
        twinkleSpeed: 0.02+Math.random()*0.04,
        baseAlpha: 0.4+Math.random()*0.6
      });
    }
    this._enabled = true;
  },

  spawnShootingStar(screenW, screenH) {
    screenW = screenW||800; screenH = screenH||600;
    const angle = Math.PI*0.1+Math.random()*Math.PI*0.2;
    const speed = 8+Math.random()*12;
    this._shootingStars.push({
      x: Math.random()*screenW,
      y: Math.random()*screenH*0.3,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed,
      trailLen: 0,
      maxTrailLen: 40+Math.random()*60,
      life: 1,
      maxLife: 0.6+Math.random()*0.4,
      trail: []
    });
  },

  update(dt) {
    if (!this._enabled) return;
    this._time += dt;
    for (const s of this._stars) s.twinklePhase += s.twinkleSpeed;
    if (Math.random() < 0.004) this.spawnShootingStar();
    for (let i=this._shootingStars.length-1; i>=0; i--) {
      const s = this._shootingStars[i];
      s.trail.push({x:s.x, y:s.y});
      if (s.trail.length > 20) s.trail.shift();
      s.x += s.vx; s.y += s.vy;
      s.life -= dt;
      if (s.life <= 0) this._shootingStars.splice(i,1);
    }
  },

  draw(ctx) {
    if (!this._enabled) return;
    ctx.save();
    for (const s of this._stars) {
      const twinkle = 0.5+0.5*Math.sin(s.twinklePhase);
      ctx.globalAlpha = s.baseAlpha * (0.6+0.4*twinkle);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
    }
    for (const ss of this._shootingStars) {
      const t = Math.max(0, ss.life/ss.maxLife);
      for (let k=0; k<ss.trail.length; k++) {
        const prog = k/ss.trail.length;
        ctx.globalAlpha = prog*t*0.8;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ss.trail[k].x, ss.trail[k].y, 1.5*prog, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = t;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(ss.x, ss.y, 2, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// PARTICLE_PERFORMANCE_MONITOR
// =============================================================================

const PARTICLE_PERFORMANCE_MONITOR = {
  _history: [],
  _maxHistory: 60,
  _totalActive: 0,
  _warningThreshold: 3000,
  _criticalThreshold: 6000,

  sample(totalParticleCount) {
    this._totalActive = totalParticleCount;
    this._history.push(totalParticleCount);
    if (this._history.length > this._maxHistory) this._history.shift();
  },

  getAverage() {
    if (!this._history.length) return 0;
    return this._history.reduce((a,b)=>a+b,0)/this._history.length;
  },

  getStatus() {
    const avg = this.getAverage();
    if (avg > this._criticalThreshold) return 'critical';
    if (avg > this._warningThreshold)  return 'warning';
    return 'ok';
  },

  draw(ctx, x, y) {
    ctx.save();
    const status = this.getStatus();
    const color = status==='critical'?'#f55':status==='warning'?'#fa0':'#5f5';
    ctx.fillStyle = color;
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`particles: ${this._totalActive} [${status.toUpperCase()}]`, x||10, y||590);
    ctx.restore();
  }
};

// =============================================================================
// FINAL EXPORT ADDENDUM
// =============================================================================

if (typeof window !== 'undefined') {
  window.SCORE_POP_SYSTEM             = SCORE_POP_SYSTEM;
  window.STAR_FIELD_SYSTEM            = STAR_FIELD_SYSTEM;
  window.PARTICLE_PERFORMANCE_MONITOR = PARTICLE_PERFORMANCE_MONITOR;

  // Convenience: single call to update/draw everything including addendum systems
  window.PARTICLE_ALL = {
    update(dt, opts) {
      PARTICLE_SYSTEM_REGISTRY.updateAll(dt, opts);
      SCORE_POP_SYSTEM.update(dt);
      STAR_FIELD_SYSTEM.update(dt);
    },
    draw(ctx, screenW, screenH) {
      STAR_FIELD_SYSTEM.draw(ctx);
      PARTICLE_SYSTEM_REGISTRY.drawAll(ctx, screenW, screenH);
      SCORE_POP_SYSTEM.draw(ctx);
    }
  };
}


// ============================================================
// PARTICLE_PHYSICS_EXTENDED — Advanced physics for particles
// ============================================================
const PARTICLE_PHYSICS_EXTENDED = (() => {
  // ── SPH-lite fluid simulation ─────────────────────────────
  const SPH = (() => {
    const H = 30;        // smoothing radius (px)
    const H2 = H * H;
    const REST_DENSITY = 1.0;
    const GAS_CONST = 200;
    const VISCOSITY = 10;

    function poly6Kernel(r2) {
      if (r2 >= H2) return 0;
      const x = H2 - r2;
      return 315 / (64 * Math.PI * Math.pow(H, 9)) * x * x * x;
    }

    function spikyGrad(r, rx, ry) {
      if (r <= 0 || r >= H) return { x: 0, y: 0 };
      const coeff = -45 / (Math.PI * Math.pow(H, 6)) * (H - r) * (H - r) / r;
      return { x: coeff * rx, y: coeff * ry };
    }

    function viscosityLaplacian(r) {
      if (r >= H) return 0;
      return 45 / (Math.PI * Math.pow(H, 6)) * (H - r);
    }

    function computeDensityPressure(particles) {
      for (const pi of particles) {
        pi.density = 0;
        for (const pj of particles) {
          const dx = pj.x - pi.x, dy = pj.y - pi.y;
          const r2 = dx*dx + dy*dy;
          pi.density += pi.mass * poly6Kernel(r2);
        }
        pi.pressure = GAS_CONST * (pi.density - REST_DENSITY);
      }
    }

    function computeForces(particles) {
      for (const pi of particles) {
        pi.fpx = 0; pi.fpy = 0;
        for (const pj of particles) {
          if (pi === pj) continue;
          const dx = pj.x - pi.x, dy = pj.y - pi.y;
          const r2 = dx*dx + dy*dy;
          const r = Math.sqrt(r2);
          if (r >= H) continue;
          // Pressure force
          const pG = spikyGrad(r, dx, dy);
          const pCoeff = -pj.mass * (pi.pressure + pj.pressure) / (2 * pj.density);
          pi.fpx += pCoeff * pG.x;
          pi.fpy += pCoeff * pG.y;
          // Viscosity force
          const vL = viscosityLaplacian(r);
          pi.fpx += VISCOSITY * pj.mass * ((pj.vx - pi.vx) / pj.density) * vL;
          pi.fpy += VISCOSITY * pj.mass * ((pj.vy - pi.vy) / pj.density) * vL;
        }
      }
    }

    return { computeDensityPressure, computeForces, H, REST_DENSITY };
  })();

  // ── Surface tension ────────────────────────────────────────
  function computeSurfaceTension(particles, sigma) {
    sigma = sigma || 0.0728;
    for (const pi of particles) {
      let nx = 0, ny = 0, laplacianC = 0;
      for (const pj of particles) {
        if (pi === pj) continue;
        const dx = pj.x - pi.x, dy = pj.y - pi.y;
        const r2 = dx*dx + dy*dy;
        if (r2 >= SPH.H * SPH.H) continue;
        const r = Math.sqrt(r2);
        // Color field gradient (normal)
        const coeff = pj.mass / (pj.density || 1);
        nx += coeff * dx / (r + 0.001);
        ny += coeff * dy / (r + 0.001);
      }
      const nLen = Math.sqrt(nx*nx + ny*ny);
      if (nLen > 0.5) {
        pi.fpx = (pi.fpx || 0) - sigma * laplacianC * nx / nLen;
        pi.fpy = (pi.fpy || 0) - sigma * laplacianC * ny / nLen;
      }
    }
  }

  // ── Particle-particle collision ───────────────────────────
  function resolveCollisions(particles, restitution) {
    restitution = restitution !== undefined ? restitution : 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const r2 = dx*dx + dy*dy;
        const minR = (a.radius || 2) + (b.radius || 2);
        if (r2 >= minR * minR) continue;
        const r = Math.sqrt(r2) || 0.001;
        const nx = dx / r, ny = dy / r;
        // Overlap correction
        const overlap = minR - r;
        const totalMass = (a.mass || 1) + (b.mass || 1);
        a.x -= nx * overlap * ((b.mass || 1) / totalMass);
        a.y -= ny * overlap * ((b.mass || 1) / totalMass);
        b.x += nx * overlap * ((a.mass || 1) / totalMass);
        b.y += ny * overlap * ((a.mass || 1) / totalMass);
        // Velocity correction
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
        const relN = rvx * nx + rvy * ny;
        if (relN > 0) continue;
        const j_ = -(1 + restitution) * relN / (1 / (a.mass || 1) + 1 / (b.mass || 1));
        a.vx -= j_ / (a.mass || 1) * nx;
        a.vy -= j_ / (a.mass || 1) * ny;
        b.vx += j_ / (b.mass || 1) * nx;
        b.vy += j_ / (b.mass || 1) * ny;
      }
    }
  }

  // ── Perlin turbulence field ───────────────────────────────
  const _perm = (() => {
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  })();

  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _lerp(a, b, t) { return a + t * (b - a); }
  function _grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  }

  function perlin2(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = _fade(xf), v = _fade(yf);
    const aa = _perm[_perm[xi] + yi];
    const ab = _perm[_perm[xi] + yi + 1];
    const ba = _perm[_perm[xi + 1] + yi];
    const bb = _perm[_perm[xi + 1] + yi + 1];
    return _lerp(
      _lerp(_grad(aa, xf, yf),   _grad(ba, xf - 1, yf),   u),
      _lerp(_grad(ab, xf, yf - 1), _grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  function applyTurbulenceField(particle, scale, strength, time) {
    const nx = perlin2(particle.x * scale + time, particle.y * scale);
    const ny = perlin2(particle.x * scale, particle.y * scale + time);
    particle.vx = (particle.vx || 0) + nx * strength;
    particle.vy = (particle.vy || 0) + ny * strength;
  }

  // ── Vortex force ──────────────────────────────────────────
  function applyVortexForce(particle, cx, cy, strength, falloff) {
    const dx = particle.x - cx, dy = particle.y - cy;
    const r2 = dx*dx + dy*dy;
    const r = Math.sqrt(r2) || 0.001;
    const f = strength / (1 + r * falloff);
    // Perpendicular direction
    particle.vx = (particle.vx || 0) + (-dy / r) * f;
    particle.vy = (particle.vy || 0) + ( dx / r) * f;
  }

  // ── Attractor / repeller ──────────────────────────────────
  function applyAttractorForce(particle, ax, ay, strength, minDist) {
    const dx = ax - particle.x, dy = ay - particle.y;
    const r2 = dx*dx + dy*dy;
    const r = Math.sqrt(r2) || 0.001;
    if (r < (minDist || 5)) return;
    const f = strength / r2;
    particle.vx = (particle.vx || 0) + (dx / r) * f;
    particle.vy = (particle.vy || 0) + (dy / r) * f;
  }

  function applyRepellerForce(particle, rx, ry, strength, maxDist) {
    const dx = particle.x - rx, dy = particle.y - ry;
    const r2 = dx*dx + dy*dy;
    const r = Math.sqrt(r2) || 0.001;
    if (r > (maxDist || 100)) return;
    const f = strength / r2;
    particle.vx = (particle.vx || 0) + (dx / r) * f;
    particle.vy = (particle.vy || 0) + (dy / r) * f;
  }

  // ── Wind field ────────────────────────────────────────────
  function applyWindForce(particle, windX, windY, gustScale, gustStrength, time) {
    const gust = perlin2(particle.x * 0.01 + time, particle.y * 0.01) * gustStrength;
    particle.vx = (particle.vx || 0) + windX + gust;
    particle.vy = (particle.vy || 0) + windY;
  }

  // ── Magnetic field ────────────────────────────────────────
  function applyMagneticForce(particle, mx, my, mz, Bx, By, Bz, charge) {
    // Lorentz force: F = q(v × B)
    const vx = particle.vx || 0, vy = particle.vy || 0, vz = 0;
    const q = charge || 1;
    particle.vx += q * (vy * Bz - vz * By);
    particle.vy += q * (vz * Bx - vx * Bz);
    // vz ignored for 2D
  }

  // ── Explosion radial force ────────────────────────────────
  function applyExplosionForce(particle, ex, ey, strength, radius) {
    const dx = particle.x - ex, dy = particle.y - ey;
    const r2 = dx*dx + dy*dy;
    const r = Math.sqrt(r2) || 0.001;
    if (r > radius) return;
    const falloff = 1 - r / radius;
    const f = strength * falloff * falloff;
    particle.vx = (particle.vx || 0) + (dx / r) * f;
    particle.vy = (particle.vy || 0) + (dy / r) * f;
  }

  // ── Verlet integration ────────────────────────────────────
  function verletIntegrate(particle, dt) {
    const ax = (particle.fx || 0) / (particle.mass || 1);
    const ay = (particle.fy || 0) / (particle.mass || 1);
    const newX = particle.x + (particle.vx || 0) * dt + 0.5 * ax * dt * dt;
    const newY = particle.y + (particle.vy || 0) * dt + 0.5 * ay * dt * dt;
    particle.vx = (newX - particle.x) / dt;
    particle.vy = (newY - particle.y) / dt;
    particle.x = newX;
    particle.y = newY;
    particle.fx = 0; particle.fy = 0;
  }

  // ── Position-based dynamics constraint ────────────────────
  function applyDistanceConstraint(a, b, restLength, stiffness) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
    const diff = (dist - restLength) / dist * stiffness;
    const corrX = dx * diff * 0.5;
    const corrY = dy * diff * 0.5;
    if (!a.pinned) { a.x += corrX; a.y += corrY; }
    if (!b.pinned) { b.x -= corrX; b.y -= corrY; }
  }

  // ── Cohesion force ─────────────────────────────────────────
  function applyCohesionForce(particles, radius, strength) {
    for (const pi of particles) {
      let cx = 0, cy = 0, count = 0;
      for (const pj of particles) {
        if (pi === pj) continue;
        const dx = pj.x - pi.x, dy = pj.y - pi.y;
        if (dx*dx + dy*dy > radius*radius) continue;
        cx += pj.x; cy += pj.y; count++;
      }
      if (count > 0) {
        cx /= count; cy /= count;
        const dx = cx - pi.x, dy = cy - pi.y;
        pi.vx = (pi.vx || 0) + dx * strength;
        pi.vy = (pi.vy || 0) + dy * strength;
      }
    }
  }

  return {
    SPH, perlin2,
    applyTurbulenceField, applyVortexForce,
    applyAttractorForce, applyRepellerForce,
    applyWindForce, applyMagneticForce, applyExplosionForce,
    resolveCollisions, computeSurfaceTension,
    verletIntegrate, applyDistanceConstraint, applyCohesionForce,
  };
})();

// ============================================================
// PARTICLE_RENDERER_EXTENDED — Advanced Canvas 2D rendering
// ============================================================
const PARTICLE_RENDERER_EXTENDED = (() => {
  // ── Additive blending via globalCompositeOperation ───────
  function beginAdditive(ctx) { ctx.globalCompositeOperation = 'lighter'; }
  function endAdditive(ctx)   { ctx.globalCompositeOperation = 'source-over'; }

  // ── Point sprite stamps ───────────────────────────────────
  const _stampCache = new Map();

  function getStamp(shape, size, color) {
    const key = `${shape}_${size}_${color}`;
    if (_stampCache.has(key)) return _stampCache.get(key);
    const oc = document.createElement('canvas');
    oc.width = size * 2; oc.height = size * 2;
    const ctx = oc.getContext('2d');
    ctx.translate(size, size);
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        break;
      case 'star': {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
          const a2 = ((i * 4 + 2) * Math.PI / 5) - Math.PI / 2;
          const x1 = Math.cos(a1) * size, y1 = Math.sin(a1) * size;
          const x2 = Math.cos(a2) * size * 0.4, y2 = Math.sin(a2) * size * 0.4;
          i === 0 ? ctx.moveTo(x1, y1) : ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        break;
      }
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.6, 0);
        ctx.lineTo(0, size);  ctx.lineTo(-size * 0.6, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        break;
      case 'spark':
        ctx.beginPath();
        ctx.moveTo(0, -size); ctx.lineTo(size * 0.1, 0);
        ctx.lineTo(0, size * 0.3); ctx.lineTo(-size * 0.1, 0);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    _stampCache.set(key, oc);
    return oc;
  }

  function clearStampCache() { _stampCache.clear(); }

  // ── Trail renderer ────────────────────────────────────────
  function drawTrail(ctx, positions, color, maxWidth, fadeAlpha) {
    if (!positions || positions.length < 2) return;
    ctx.save();
    for (let i = 1; i < positions.length; i++) {
      const t = i / positions.length;
      const a = t * (fadeAlpha !== undefined ? fadeAlpha : 1);
      const w = t * maxWidth;
      ctx.globalAlpha = a;
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(positions[i-1].x, positions[i-1].y);
      ctx.lineTo(positions[i].x, positions[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Glow post-process (cheap blur) ───────────────────────
  function drawGlow(ctx, x, y, radius, color, intensity) {
    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    for (let i = 3; i >= 1; i--) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = radius * i * 2;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Color over lifetime ───────────────────────────────────
  function lerpColor(c1, c2, t) {
    // c1, c2: [r, g, b, a] arrays
    return [
      c1[0] + (c2[0] - c1[0]) * t,
      c1[1] + (c2[1] - c1[1]) * t,
      c1[2] + (c2[2] - c1[2]) * t,
      c1[3] + (c2[3] - c1[3]) * t,
    ];
  }

  function gradientLookup(gradient, t) {
    // gradient: [{t, color:[r,g,b,a]}, ...]
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < gradient.length - 1; i++) {
      const a = gradient[i], b = gradient[i + 1];
      if (t >= a.t && t <= b.t) {
        const localT = (t - a.t) / (b.t - a.t);
        return lerpColor(a.color, b.color, localT);
      }
    }
    return gradient[gradient.length - 1].color;
  }

  function colorToCSS(c) {
    return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3].toFixed(3)})`;
  }

  // ── Size over lifetime (curve) ────────────────────────────
  function sizeCurveLookup(curve, t) {
    // curve: [{t, size}, ...]
    t = Math.max(0, Math.min(1, t));
    for (let i = 0; i < curve.length - 1; i++) {
      const a = curve[i], b = curve[i + 1];
      if (t >= a.t && t <= b.t) {
        const lt = (t - a.t) / (b.t - a.t);
        return a.size + (b.size - a.size) * lt;
      }
    }
    return curve[curve.length - 1].size;
  }

  // ── Heat shimmer distortion ───────────────────────────────
  function applyHeatShimmer(ctx, x, y, radius, intensity, time) {
    ctx.save();
    // Draw a subtle displacement approximation using radial gradient alpha
    const grad = GradyanDeposu.rad(ctx, x, y, 0, x, y, radius, [0, `rgba(255,200,100,${intensity * 0.08})`, 0.5, `rgba(255,150,50,${intensity * 0.04})`, 1, `rgba(255,100,0,0)`]);
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Batch draw particles (instanced simulation) ───────────
  function batchDraw(ctx, particles, defaultShape, defaultSize) {
    for (const p of particles) {
      if (!p.active) continue;
      const life = 1 - (p.age / p.lifetime);
      const size = defaultSize * life;
      const alpha = p.alpha !== undefined ? p.alpha : life;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      if (p.rotation) ctx.rotate(p.rotation);
      const shape = p.shape || defaultShape || 'circle';
      const color = p.color || '#ffffff';
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        const stamp = getStamp(shape, size, color);
        ctx.drawImage(stamp, -size, -size, size * 2, size * 2);
      }
      ctx.restore();
    }
  }

  // ── Soft particle fade (intersect geometry) ───────────────
  function softParticleFade(depth, geometryDepth, fadeRange) {
    const diff = geometryDepth - depth;
    return Math.max(0, Math.min(1, diff / fadeRange));
  }

  // ── Rotation over lifetime ────────────────────────────────
  function computeRotation(particle) {
    return (particle.initialRotation || 0) + (particle.angularVelocity || 0) * (particle.age || 0);
  }

  // ── Mesh particle (quad) ──────────────────────────────────
  function drawQuadParticle(ctx, p, sx, sy) {
    // sx, sy: half-size
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(computeRotation(p));
    ctx.fillStyle = p.color || '#ffffff';
    ctx.globalAlpha = p.alpha !== undefined ? p.alpha : 1;
    ctx.fillRect(-sx, -sy, sx * 2, sy * 2);
    ctx.restore();
  }

  return {
    beginAdditive, endAdditive,
    getStamp, clearStampCache,
    drawTrail, drawGlow,
    lerpColor, gradientLookup, colorToCSS,
    sizeCurveLookup,
    applyHeatShimmer,
    batchDraw, drawQuadParticle,
    softParticleFade, computeRotation,
  };
})();

// ============================================================
// PARTICLE_EMITTER_LIBRARY — 40 named emitter presets
// ============================================================
const PARTICLE_EMITTER_LIBRARY = (() => {
  // ── Helper to deep clone a preset ─────────────────────────
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  // ── Emitter shapes ─────────────────────────────────────────
  const SHAPES = {
    POINT:      'point',
    SPHERE:     'sphere',
    RING:       'ring',
    BOX:        'box',
    LINE:       'line',
    CONE:       'cone',
    HEMISPHERE: 'hemisphere',
  };

  // ── Blend modes ───────────────────────────────────────────
  const BLENDS = { NORMAL: 'source-over', ADDITIVE: 'lighter', MULTIPLY: 'multiply' };

  // ── Base preset factory ───────────────────────────────────
  function base(name, shape, rate, lifetime, speedMin, speedMax, spread, colorStart, colorEnd, gravity, blend, extra) {
    return Object.assign({
      name, shape,
      rate: typeof rate === 'object' ? rate : { type: 'continuous', perSec: rate },
      lifetime,
      speed: { min: speedMin, max: speedMax },
      spread, colorStart, colorEnd,
      gravity: gravity !== undefined ? gravity : 200,
      blend: blend || BLENDS.NORMAL,
      sizeStart: 4, sizeEnd: 0,
      alphaStart: 1, alphaEnd: 0,
      rotationSpeed: 0,
    }, extra || {});
  }

  // ── Preset library ────────────────────────────────────────
  const PRESETS = {
    // ── Vehicle ───────────────────────────────────────────
    engineSparks: base('engineSparks', SHAPES.POINT, 80, 0.4, 60, 120, 0.6,
      '#ffdd44', '#ff4400', 300, BLENDS.ADDITIVE,
      { sizeStart: 3, sizeEnd: 0, rotationSpeed: 5 }),

    brakeDust: base('brakeDust', SHAPES.RING, 60, 0.8, 20, 50, 1.2,
      '#888888', '#444444', -20, BLENDS.NORMAL,
      { sizeStart: 6, sizeEnd: 14, alphaStart: 0.6, alphaEnd: 0 }),

    tireSmoke: base('tireSmoke', SHAPES.POINT, 40, 1.2, 10, 30, 0.8,
      '#aaaaaa', '#555555', -30, BLENDS.NORMAL,
      { sizeStart: 8, sizeEnd: 20, alphaStart: 0.5, alphaEnd: 0 }),

    mudSplatter: base('mudSplatter', SHAPES.CONE, { type: 'burst', count: 20, repeat: false }, 0.6,
      80, 200, 1.4, '#5c3d1e', '#3d2710', 400, BLENDS.NORMAL,
      { sizeStart: 4, sizeEnd: 2, rotationSpeed: 8 }),

    // ── Collectibles ──────────────────────────────────────
    coinGlow: base('coinGlow', SHAPES.RING, 30, 0.5, 20, 40, 0.3,
      '#ffd700', '#ffaa00', -50, BLENDS.ADDITIVE,
      { sizeStart: 5, sizeEnd: 0 }),

    diamondSparkle: base('diamondSparkle', SHAPES.SPHERE, 50, 0.6, 30, 70, 0.5,
      '#aaddff', '#ffffff', -80, BLENDS.ADDITIVE,
      { sizeStart: 3, sizeEnd: 0, shape: 'star' }),

    fuelMist: base('fuelMist', SHAPES.CONE, 25, 0.9, 15, 35, 0.7,
      '#00aaff', '#0033cc', -20, BLENDS.ADDITIVE,
      { sizeStart: 5, sizeEnd: 8, alphaStart: 0.4, alphaEnd: 0 }),

    nitroFlame: base('nitroFlame', SHAPES.CONE, 120, 0.3, 100, 180, 0.4,
      '#ffffff', '#8800ff', 0, BLENDS.ADDITIVE,
      { sizeStart: 8, sizeEnd: 2, rotationSpeed: 3 }),

    // ── Explosions ────────────────────────────────────────
    explosionFire: base('explosionFire', SHAPES.SPHERE,
      { type: 'burst', count: 80, repeat: false }, 0.7,
      100, 300, 2.0, '#ffee00', '#ff2200', -20, BLENDS.ADDITIVE,
      { sizeStart: 12, sizeEnd: 2, rotationSpeed: 4 }),

    explosionSmoke: base('explosionSmoke', SHAPES.SPHERE,
      { type: 'burst', count: 50, repeat: false }, 2.0,
      40, 120, 2.5, '#888888', '#222222', -60, BLENDS.NORMAL,
      { sizeStart: 10, sizeEnd: 30, alphaStart: 0.7, alphaEnd: 0 }),

    explosionDebris: base('explosionDebris', SHAPES.SPHERE,
      { type: 'burst', count: 30, repeat: false }, 1.5,
      150, 350, 1.8, '#994400', '#222200', 400, BLENDS.NORMAL,
      { sizeStart: 5, sizeEnd: 2, rotationSpeed: 15 }),

    // ── Weather ───────────────────────────────────────────
    rainHeavy: base('rainHeavy', SHAPES.LINE, 300, 0.4, 300, 400, 0.1,
      '#aaccff', '#5588cc', 100, BLENDS.NORMAL,
      { sizeStart: 2, sizeEnd: 2, alphaStart: 0.6, alphaEnd: 0.3 }),

    rainLight: base('rainLight', SHAPES.LINE, 80, 0.5, 200, 300, 0.1,
      '#bbddff', '#7799dd', 100, BLENDS.NORMAL,
      { sizeStart: 1, sizeEnd: 1, alphaStart: 0.4, alphaEnd: 0.2 }),

    snowHeavy: base('snowHeavy', SHAPES.BOX, 100, 4.0, 20, 60, 0.8,
      '#eeeeff', '#ffffff', 30, BLENDS.NORMAL,
      { sizeStart: 3, sizeEnd: 3, alphaStart: 0.8, alphaEnd: 0.0, rotationSpeed: 1 }),

    snowLight: base('snowLight', SHAPES.BOX, 30, 5.0, 10, 30, 0.6,
      '#ddddff', '#ffffff', 15, BLENDS.NORMAL,
      { sizeStart: 2, sizeEnd: 2, alphaStart: 0.6, alphaEnd: 0.0 }),

    // ── Magic / power-ups ─────────────────────────────────
    magicAura: base('magicAura', SHAPES.RING, 60, 1.0, 10, 30, 0.3,
      '#dd88ff', '#8800ff', -80, BLENDS.ADDITIVE,
      { sizeStart: 4, sizeEnd: 1, alphaStart: 0.8, alphaEnd: 0 }),

    healingPulse: base('healingPulse', SHAPES.SPHERE,
      { type: 'burst', count: 25, repeat: true, interval: 0.5 }, 0.8,
      20, 60, 0.5, '#88ffaa', '#00ff44', -100, BLENDS.ADDITIVE,
      { sizeStart: 5, sizeEnd: 0, shape: 'circle' }),

    damageFlash: base('damageFlash', SHAPES.SPHERE,
      { type: 'burst', count: 30, repeat: false }, 0.3,
      50, 150, 2.0, '#ff4400', '#ff0000', 0, BLENDS.ADDITIVE,
      { sizeStart: 8, sizeEnd: 0 }),

    // ── Celebration ───────────────────────────────────────
    confettiBurst: base('confettiBurst', SHAPES.POINT,
      { type: 'burst', count: 100, repeat: false }, 3.0,
      100, 250, 2.5, '#ffdd00', '#ff44aa', 200, BLENDS.NORMAL,
      { sizeStart: 6, sizeEnd: 4, rotationSpeed: 10,
        colors: ['#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff','#44ffff'] }),

    starsBurst: base('starsBurst', SHAPES.POINT,
      { type: 'burst', count: 40, repeat: false }, 1.5,
      80, 200, 2.0, '#ffff88', '#ffdd00', 0, BLENDS.ADDITIVE,
      { sizeStart: 6, sizeEnd: 0, shape: 'star' }),

    levelUpBeam: base('levelUpBeam', SHAPES.RING, 80, 1.2, 5, 20, 0.0,
      '#ffffff', '#ffff00', -150, BLENDS.ADDITIVE,
      { sizeStart: 3, sizeEnd: 0, alphaStart: 1, alphaEnd: 0 }),

    // ── Environment ───────────────────────────────────────
    waterSplash: base('waterSplash', SHAPES.CONE,
      { type: 'burst', count: 40, repeat: false }, 0.8,
      80, 200, 1.2, '#aaccff', '#4488cc', 350, BLENDS.NORMAL,
      { sizeStart: 4, sizeEnd: 2, alphaStart: 0.8, alphaEnd: 0 }),

    lavaDrip: base('lavaDrip', SHAPES.POINT, 10, 2.0, 5, 20, 0.2,
      '#ff6600', '#ff2200', 200, BLENDS.ADDITIVE,
      { sizeStart: 6, sizeEnd: 2, alphaStart: 1, alphaEnd: 0 }),

    acidDrop: base('acidDrop', SHAPES.POINT, 15, 1.5, 5, 25, 0.2,
      '#88ff00', '#44aa00', 250, BLENDS.ADDITIVE,
      { sizeStart: 4, sizeEnd: 1, alphaStart: 0.9, alphaEnd: 0 }),

    // ── Additional vehicle effects ─────────────────────────
    exhaustSmoke: base('exhaustSmoke', SHAPES.POINT, 20, 1.5, 15, 40, 0.3,
      '#777777', '#444444', -40, BLENDS.NORMAL,
      { sizeStart: 5, sizeEnd: 15, alphaStart: 0.4, alphaEnd: 0 }),

    wheelSpinDust: base('wheelSpinDust', SHAPES.RING, 50, 0.6, 30, 80, 1.0,
      '#ddccaa', '#aa9966', 50, BLENDS.NORMAL,
      { sizeStart: 4, sizeEnd: 8, alphaStart: 0.5, alphaEnd: 0 }),

    airborneDebris: base('airborneDebris', SHAPES.SPHERE,
      { type: 'burst', count: 15, repeat: false }, 2.0,
      60, 120, 1.5, '#885533', '#443322', 300, BLENDS.NORMAL,
      { sizeStart: 3, sizeEnd: 3, rotationSpeed: 20 }),

    // ── Environmental ambience ────────────────────────────
    fireflies: base('fireflies', SHAPES.BOX, 5, 3.0, 5, 15, 0.5,
      '#ffffaa', '#aaff44', -30, BLENDS.ADDITIVE,
      { sizeStart: 2, sizeEnd: 2, alphaStart: 0.8, alphaEnd: 0 }),

    dustMotes: base('dustMotes', SHAPES.BOX, 8, 6.0, 2, 8, 0.3,
      '#ddcc99', '#bbaa77', -5, BLENDS.NORMAL,
      { sizeStart: 1, sizeEnd: 1, alphaStart: 0.3, alphaEnd: 0 }),

    bubbles: base('bubbles', SHAPES.POINT, 15, 4.0, 20, 50, 0.4,
      '#aaddff', '#6699cc', -150, BLENDS.ADDITIVE,
      { sizeStart: 6, sizeEnd: 4, alphaStart: 0.4, alphaEnd: 0 }),

    emberFloat: base('emberFloat', SHAPES.POINT, 20, 3.0, 10, 30, 0.6,
      '#ff8800', '#ff2200', -80, BLENDS.ADDITIVE,
      { sizeStart: 3, sizeEnd: 1, alphaStart: 0.9, alphaEnd: 0 }),

    // ── Impact effects ────────────────────────────────────
    metalSparks: base('metalSparks', SHAPES.CONE,
      { type: 'burst', count: 25, repeat: false }, 0.5,
      100, 250, 0.8, '#ffffff', '#ffaa00', 400, BLENDS.ADDITIVE,
      { sizeStart: 2, sizeEnd: 0, rotationSpeed: 3 }),

    concreteChips: base('concreteChips', SHAPES.CONE,
      { type: 'burst', count: 15, repeat: false }, 1.0,
      60, 130, 0.9, '#cccccc', '#888888', 350, BLENDS.NORMAL,
      { sizeStart: 4, sizeEnd: 2, rotationSpeed: 12 }),

    glassShatter: base('glassShatter', SHAPES.SPHERE,
      { type: 'burst', count: 30, repeat: false }, 0.8,
      80, 200, 1.5, '#aaffff', '#ffffff', 300, BLENDS.ADDITIVE,
      { sizeStart: 3, sizeEnd: 1, alphaStart: 0.9, alphaEnd: 0 }),

    // ── Power-up effects ──────────────────────────────────
    shieldHit: base('shieldHit', SHAPES.RING,
      { type: 'burst', count: 20, repeat: false }, 0.5,
      30, 60, 0.0, '#00ffff', '#0088cc', 0, BLENDS.ADDITIVE,
      { sizeStart: 6, sizeEnd: 0 }),

    speedBoost: base('speedBoost', SHAPES.CONE, 100, 0.3, 120, 200, 0.2,
      '#ffff00', '#ff8800', 0, BLENDS.ADDITIVE,
      { sizeStart: 5, sizeEnd: 0 }),

    magnetField: base('magnetField', SHAPES.RING, 40, 1.0, 15, 30, 0.0,
      '#ff00ff', '#8800ff', -50, BLENDS.ADDITIVE,
      { sizeStart: 4, sizeEnd: 1, alphaStart: 0.6, alphaEnd: 0 }),

    freezeEffect: base('freezeEffect', SHAPES.SPHERE,
      { type: 'burst', count: 35, repeat: false }, 1.2,
      20, 60, 1.8, '#aaffff', '#4488ff', -20, BLENDS.ADDITIVE,
      { sizeStart: 5, sizeEnd: 0, shape: 'diamond' }),

    thunderStrike: base('thunderStrike', SHAPES.POINT,
      { type: 'burst', count: 40, repeat: false }, 0.4,
      50, 200, 1.5, '#ffffff', '#ffff00', 100, BLENDS.ADDITIVE,
      { sizeStart: 4, sizeEnd: 0, rotationSpeed: 20 }),
  };

  function getPreset(name) {
    if (!PRESETS[name]) return null;
    return clone(PRESETS[name]);
  }

  function listPresets() { return Object.keys(PRESETS); }

  function registerPreset(name, preset) { PRESETS[name] = Object.assign({}, preset, { name }); }

  // ── Emitter instance factory ──────────────────────────────
  function createEmitter(presetName, x, y) {
    const preset = getPreset(presetName);
    if (!preset) return null;
    return {
      preset,
      x, y,
      active: true,
      particles: [],
      elapsed: 0,
      emitAccum: 0,
      burstDone: false,
    };
  }

  function tickEmitter(emitter, dt) {
    if (!emitter.active) return;
    emitter.elapsed += dt;
    const rate = emitter.preset.rate;
    if (rate.type === 'burst' && !emitter.burstDone) {
      _emitBurst(emitter, rate.count);
      emitter.burstDone = true;
      if (rate.repeat) emitter.emitAccum = -(rate.interval || 1);
    } else if (rate.type === 'continuous') {
      emitter.emitAccum += rate.perSec * dt;
      while (emitter.emitAccum >= 1) {
        _emitOne(emitter);
        emitter.emitAccum--;
      }
    } else if (rate.type === 'burst' && rate.repeat) {
      emitter.emitAccum += dt;
      if (emitter.emitAccum >= (rate.interval || 1)) {
        _emitBurst(emitter, rate.count);
        emitter.emitAccum = 0;
      }
    }
    // Tick particles
    for (const p of emitter.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += emitter.preset.gravity * dt;
      p.rotation = (p.rotation || 0) + (emitter.preset.rotationSpeed || 0) * dt;
      const life = 1 - p.age / p.lifetime;
      p.alpha = emitter.preset.alphaStart + (emitter.preset.alphaEnd - emitter.preset.alphaStart) * (1 - life);
      p.active = p.age < p.lifetime;
    }
    emitter.particles = emitter.particles.filter(p => p.active);
  }

  function _emitBurst(emitter, count) {
    for (let i = 0; i < count; i++) _emitOne(emitter);
  }

  function _emitOne(emitter) {
    const p = emitter.preset;
    const speed = p.speed.min + Math.random() * (p.speed.max - p.speed.min);
    const angle = (Math.random() - 0.5) * p.spread * Math.PI * 2 - Math.PI / 2;
    let ox = 0, oy = 0;
    if (p.shape === SHAPES.RING) {
      const ra = Math.random() * Math.PI * 2;
      ox = Math.cos(ra) * 5; oy = Math.sin(ra) * 5;
    } else if (p.shape === SHAPES.BOX) {
      ox = (Math.random() - 0.5) * 20; oy = (Math.random() - 0.5) * 20;
    }
    const colors = p.colors || [p.colorStart];
    const color = colors[Math.floor(Math.random() * colors.length)];
    emitter.particles.push({
      x: emitter.x + ox, y: emitter.y + oy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      age: 0, lifetime: p.lifetime * (0.8 + Math.random() * 0.4),
      color, alpha: p.alphaStart,
      size: p.sizeStart, rotation: 0, active: true,
    });
  }

  return {
    SHAPES, BLENDS, PRESETS,
    getPreset, listPresets, registerPreset,
    createEmitter, tickEmitter,
  };
})();

// ============================================================
// PARTICLE_FORCES — Global force field definitions
// ============================================================
const PARTICLE_FORCES = (() => {
  // ── Force type registry ───────────────────────────────────
  const forceRegistry = new Map();

  // ── Built-in force factories ──────────────────────────────
  function GravityForce(gx, gy) {
    gx = gx !== undefined ? gx : 0;
    gy = gy !== undefined ? gy : 980;
    return {
      type: 'gravity',
      apply(p) {
        p.vx = (p.vx || 0) + gx * (p.dt || 0.016);
        p.vy = (p.vy || 0) + gy * (p.dt || 0.016);
      },
    };
  }

  function WindForce(dirX, dirY, magnitude, noiseScale, noiseStrength) {
    let _time = 0;
    return {
      type: 'wind',
      apply(p, dt) {
        _time += dt || 0.016;
        const nx = (Math.sin(p.x * (noiseScale || 0.01) + _time) * (noiseStrength || 20));
        p.vx = (p.vx || 0) + (dirX * magnitude + nx) * (dt || 0.016);
        p.vy = (p.vy || 0) + dirY * magnitude * (dt || 0.016);
      },
    };
  }

  function VortexForce(cx, cy, strength, falloff) {
    return {
      type: 'vortex',
      cx, cy, strength, falloff: falloff || 0.01,
      apply(p, dt) {
        const dx = p.x - this.cx, dy = p.y - this.cy;
        const r = Math.sqrt(dx*dx + dy*dy) || 0.001;
        const f = this.strength / (1 + r * this.falloff) * (dt || 0.016);
        p.vx = (p.vx || 0) + (-dy / r) * f;
        p.vy = (p.vy || 0) + ( dx / r) * f;
      },
    };
  }

  function AttractorForce(ax, ay, strength, falloffExp) {
    return {
      type: 'attractor',
      ax, ay, strength, falloffExp: falloffExp || 2,
      apply(p, dt) {
        const dx = this.ax - p.x, dy = this.ay - p.y;
        const r = Math.sqrt(dx*dx + dy*dy) || 0.001;
        const f = this.strength / Math.pow(r, this.falloffExp) * (dt || 0.016);
        p.vx = (p.vx || 0) + (dx / r) * f;
        p.vy = (p.vy || 0) + (dy / r) * f;
      },
    };
  }

  function BuoyancyForce(fluidDensity, fluidMinY, fluidMaxY) {
    return {
      type: 'buoyancy',
      fluidDensity: fluidDensity || 1,
      fluidMinY: fluidMinY || 400,
      fluidMaxY: fluidMaxY || 600,
      apply(p, dt) {
        if (p.y >= this.fluidMinY && p.y <= this.fluidMaxY) {
          const buoy = (p.density || 0.5) < this.fluidDensity
            ? (this.fluidDensity - (p.density || 0.5)) * 980 : 0;
          p.vy = (p.vy || 0) - buoy * (dt || 0.016);
        }
      },
    };
  }

  function MagneticForce(Bx, By, Bz) {
    return {
      type: 'magnetic',
      Bx: Bx || 0, By: By || 0, Bz: Bz || 1,
      apply(p, dt) {
        const q = p.charge || 1;
        const vx = p.vx || 0, vy = p.vy || 0;
        p.vx += q * (vy * this.Bz) * (dt || 0.016);
        p.vy += q * (-vx * this.Bz) * (dt || 0.016);
      },
    };
  }

  function ExplosionForce(ex, ey, strength, radius, duration) {
    let elapsed = 0;
    return {
      type: 'explosion',
      ex, ey, strength, radius, duration: duration || 0.2,
      expired: false,
      apply(p, dt) {
        if (this.expired) return;
        elapsed += dt || 0.016;
        if (elapsed >= this.duration) { this.expired = true; return; }
        const t = elapsed / this.duration;
        const currentStr = this.strength * (1 - t);
        const dx = p.x - this.ex, dy = p.y - this.ey;
        const r = Math.sqrt(dx*dx + dy*dy) || 0.001;
        if (r > this.radius) return;
        const falloff = 1 - r / this.radius;
        const f = currentStr * falloff * falloff * (dt || 0.016);
        p.vx = (p.vx || 0) + (dx / r) * f;
        p.vy = (p.vy || 0) + (dy / r) * f;
      },
    };
  }

  function DrainForce(drainX, drainY, strength, radius) {
    return {
      type: 'drain',
      drainX, drainY, strength, radius: radius || 100,
      apply(p, dt) {
        const dx = this.drainX - p.x, dy = this.drainY - p.y;
        const r = Math.sqrt(dx*dx + dy*dy) || 0.001;
        if (r > this.radius) return;
        const spiralAngle = Math.atan2(dy, dx) + 0.5;
        const f = this.strength / (r + 1) * (dt || 0.016);
        p.vx = (p.vx || 0) + Math.cos(spiralAngle) * f;
        p.vy = (p.vy || 0) + Math.sin(spiralAngle) * f;
      },
    };
  }

  // ── Combined force field ──────────────────────────────────
  function ForceField(forces) {
    return {
      type: 'field',
      forces: forces || [],
      addForce(f) { this.forces.push(f); },
      removeForce(type) { this.forces = this.forces.filter(f => f.type !== type); },
      apply(p, dt) {
        for (const f of this.forces) {
          if (!f.expired) f.apply(p, dt);
        }
        // Prune expired
        this.forces = this.forces.filter(f => !f.expired);
      },
    };
  }

  // ── Force field visualization ─────────────────────────────
  function visualizeForceField(ctx, field, x, y, w, h, resolution) {
    const step = resolution || 30;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,200,0.25)';
    ctx.lineWidth = 1;
    for (let px = x; px < x + w; px += step) {
      for (let py = y; py < y + h; py += step) {
        const p = { x: px, y: py, vx: 0, vy: 0, dt: 0.016 };
        field.apply(p, 0.016);
        const mag = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (mag < 0.001) continue;
        const scale = Math.min(20, step * 0.8);
        const ex = px + (p.vx / mag) * scale;
        const ey = py + (p.vy / mag) * scale;
        ctx.globalAlpha = Math.min(1, mag / 50);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Registry helpers ──────────────────────────────────────
  function registerForce(name, force) { forceRegistry.set(name, force); }
  function getForce(name) { return forceRegistry.get(name) || null; }
  function removeForce(name) { forceRegistry.delete(name); }
  function getAllForces() { return Array.from(forceRegistry.values()); }

  function applyAllForces(particles, dt) {
    for (const force of forceRegistry.values()) {
      if (force.expired) continue;
      for (const p of particles) force.apply(p, dt);
    }
    // Prune expired explosion forces
    for (const [name, force] of forceRegistry.entries()) {
      if (force.expired) forceRegistry.delete(name);
    }
  }

  return {
    GravityForce, WindForce, VortexForce,
    AttractorForce, BuoyancyForce, MagneticForce,
    ExplosionForce, DrainForce, ForceField,
    visualizeForceField,
    registerForce, getForce, removeForce, getAllForces,
    applyAllForces,
  };
})();


// ================================================================
// PARTICLE_MATH_LIBRARY — Math utilities for particle systems
// ================================================================
const PARTICLE_MATH_LIB = (() => {
  const TAU = Math.PI * 2;

  function lerp(a,b,t) { return a+(b-a)*t; }
  function clamp(v,lo,hi){ return v<lo?lo:v>hi?hi:v; }
  function rng(min,max) { return min + Math.random()*(max-min); }
  function rngInt(min,max){ return Math.floor(rng(min,max+1)); }
  function rngAngle() { return Math.random() * TAU; }
  function rngVec(speed) { const a=rngAngle(); return { x:Math.cos(a)*speed, y:Math.sin(a)*speed }; }
  function rngCone(dirAngle, spread, speed) {
    const a = dirAngle + rng(-spread/2, spread/2);
    return { x: Math.cos(a)*speed, y: Math.sin(a)*speed };
  }
  function dist2(ax,ay,bx,by){ const dx=ax-bx,dy=ay-by; return dx*dx+dy*dy; }
  function dist(ax,ay,bx,by) { return Math.sqrt(dist2(ax,ay,bx,by)); }
  function lerpColor(c1,c2,t) {
    const r1=parseInt(c1.slice(1,3),16), g1=parseInt(c1.slice(3,5),16), b1=parseInt(c1.slice(5,7),16);
    const r2=parseInt(c2.slice(1,3),16), g2=parseInt(c2.slice(3,5),16), b2=parseInt(c2.slice(5,7),16);
    const r=Math.round(lerp(r1,r2,t)), g=Math.round(lerp(g1,g2,t)), b=Math.round(lerp(b1,b2,t));
    return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  function hexToRgba(hex, alpha) {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  function smoothstep(edge0,edge1,x) {
    const t=clamp((x-edge0)/(edge1-edge0),0,1);
    return t*t*(3-2*t);
  }
  function easeOutQuad(t) { return 1-(1-t)*(1-t); }
  function noise1(x) { // simple cheap 1D noise
    const ix=Math.floor(x), fx=x-ix;
    const a=Math.sin(ix*127.1)*43758.5453;
    const b=Math.sin((ix+1)*127.1)*43758.5453;
    const u=fx*fx*(3-2*fx);
    return lerp(a-Math.floor(a), b-Math.floor(b), u)*2-1;
  }
  function noise2(x,y) {
    return (noise1(x+y*57.3)*0.5 + noise1(x*1.7+y*3.3)*0.3 + noise1(x*5.1+y*0.9)*0.2);
  }

  return { lerp,clamp,rng,rngInt,rngAngle,rngVec,rngCone,dist2,dist,lerpColor,hexToRgba,smoothstep,easeOutQuad,noise1,noise2,TAU };
})();

// ================================================================
// PARTICLE_COLOR_PALETTES — Named palettes for particle systems
// ================================================================
const PARTICLE_COLOR_PALETTES = (() => {
  const PALETTES = {
    fire:        ['#FF4500','#FF6600','#FF8C00','#FFA500','#FFD700','#FFFF00'],
    ice:         ['#A0E8FF','#40C8FF','#00AAFF','#0080CC','#C8F0FF','#FFFFFF'],
    electric:    ['#4400FF','#8844FF','#CCAAFF','#00FFFF','#FFFFFF','#AACCFF'],
    gold:        ['#FFD700','#FFC000','#FFE55C','#B8860B','#FFFFFF','#FFF8DC'],
    magic:       ['#FF00FF','#CC00FF','#8800FF','#FF44AA','#FF88FF','#FFFFFF'],
    nature:      ['#228B22','#7CFC00','#90EE90','#006400','#ADFF2F','#F5FFFA'],
    blood:       ['#8B0000','#CC0000','#FF0000','#FF3333','#CC2222','#770000'],
    smoke:       ['#222222','#444444','#666666','#888888','#AAAAAA','#CCCCCC'],
    rainbow:     ['#FF0000','#FF8800','#FFFF00','#00FF00','#0088FF','#FF00FF'],
    neon:        ['#00FFFF','#00FF00','#FF00FF','#FF4400','#FFFF00','#FFFFFF'],
    poison:      ['#33FF00','#66FF33','#99FF66','#AAFFAA','#228800','#114400'],
    explosion:   ['#FF6600','#FF8800','#FFAA00','#FF4400','#FF2200','#FFFF44'],
    confetti:    ['#FF3333','#33FF33','#3333FF','#FFFF33','#FF33FF','#33FFFF'],
    lava:        ['#FF2200','#FF4400','#FF6600','#FF8800','#FFAA00','#FF0000'],
    sparkle:     ['#FFD700','#FFFFFF','#FFF0A0','#FFEECC','#FFD700','#FFFACD'],
    water:       ['#00AAFF','#0088CC','#AADDFF','#CCEEFF','#FFFFFF','#0066AA'],
    sand:        ['#C2B280','#D4A76A','#BDB07A','#8B7355','#F5DEB3','#DEB887'],
    ash:         ['#808080','#A0A0A0','#606060','#404040','#C0C0C0','#202020']
  };

  function get(name) { return PALETTES[name] || PALETTES.sparkle; }
  function random(name) { const p=get(name); return p[Math.floor(Math.random()*p.length)]; }
  function blend(name, t) {
    const p=get(name);
    const idx = t*(p.length-1), lo=Math.floor(idx), hi=Math.ceil(idx), f=idx-lo;
    return PARTICLE_MATH_LIB.lerpColor(p[Math.min(lo,p.length-1)], p[Math.min(hi,p.length-1)], f);
  }
  function list() { return Object.keys(PALETTES); }

  return { get, random, blend, list, PALETTES };
})();

// ================================================================
// PARTICLE_SCREEN_EFFECTS — Full-screen canvas particle overlays
// ================================================================
const PARTICLE_SCREEN_EFFECTS = (() => {
  const _effects = [];

  function addVignetteFlash(color, alpha, durationMs) {
    _effects.push({ type:'vignette', color: color||'#ff0000', alpha: alpha||0.4, duration: durationMs||300, elapsed:0 });
  }

  function addScreenFlash(color, alpha, durationMs) {
    _effects.push({ type:'flash', color: color||'#ffffff', alpha: alpha||0.6, duration: durationMs||150, elapsed:0 });
  }

  function addColorGrade(r,g,b,alpha,durationMs) {
    _effects.push({ type:'grade', r:r||0, g:g||0, b:b||0, alpha:alpha||0.15, duration:durationMs||500, elapsed:0 });
  }

  function addScanlines(opacity, durationMs) {
    _effects.push({ type:'scanlines', opacity:opacity||0.08, duration:durationMs||-1, elapsed:0 });
  }

  function update(dt) {
    for (let i=_effects.length-1; i>=0; i--) {
      const e=_effects[i];
      if (e.duration > 0) { e.elapsed += dt; if (e.elapsed >= e.duration) { _effects.splice(i,1); } }
    }
  }

  function render(ctx, W, H) {
    for (const e of _effects) {
      const t = e.duration>0 ? e.elapsed/e.duration : 0;
      const fadeAlpha = e.duration>0 ? (1-t)*e.alpha : e.alpha||e.opacity||0.1;
      ctx.save();
      if (e.type==='flash') {
        ctx.fillStyle = PARTICLE_MATH_LIB.hexToRgba(e.color, fadeAlpha);
        ctx.fillRect(0,0,W,H);
      } else if (e.type==='vignette') {
        const grd = GradyanDeposu.rad(ctx, W/2, H/2, H*0.2, W/2, H/2, H*0.7, [0, 'transparent', 1, PARTICLE_MATH_LIB.hexToRgba(e.color, fadeAlpha)]);
        ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
      } else if (e.type==='grade') {
        ctx.fillStyle=`rgba(${e.r},${e.g},${e.b},${fadeAlpha})`;
        ctx.fillRect(0,0,W,H);
      } else if (e.type==='scanlines') {
        ctx.fillStyle=`rgba(0,0,0,${e.opacity})`;
        for (let y=0; y<H; y+=4) ctx.fillRect(0,y,W,2);
      }
      ctx.restore();
    }
  }

  function clear()   { _effects.length=0; }
  function count()   { return _effects.length; }

  return { addVignetteFlash, addScreenFlash, addColorGrade, addScanlines, update, render, clear, count };
})();


// ================================================================
// PARTICLE_BURST_CATALOGUE — Named burst presets for easy use
// ================================================================
const PARTICLE_BURST_CATALOGUE = (() => {
  // Each preset: fn(x, y) -> array of particle configs
  const PRESETS = {
    coinPickup: (x,y) => Array.from({length:12},(_,i)=>({
      x, y, vx:(Math.random()-0.5)*5, vy:-2-Math.random()*4,
      life:0.7+Math.random()*0.4, size:6+Math.random()*4,
      color:`hsl(${45+Math.random()*20},100%,${55+Math.random()*20}%)`,
      type:'circle', gravity:0.15, drag:0.98
    })),
    gemPickup: (x,y) => Array.from({length:16},(_,i)=>({
      x, y, vx:(Math.random()-0.5)*6, vy:-3-Math.random()*5,
      life:0.9+Math.random()*0.5, size:5+Math.random()*5,
      color:`hsl(${190+Math.random()*40},100%,${60+Math.random()*20}%)`,
      type:'diamond', gravity:0.1, drag:0.97
    })),
    dustCloud: (x,y) => Array.from({length:20},(_,i)=>({
      x:x+(Math.random()-0.5)*30, y:y+(Math.random()-0.5)*10,
      vx:(Math.random()-0.5)*3, vy:-0.5-Math.random()*1.5,
      life:0.5+Math.random()*0.8, size:10+Math.random()*20,
      color:`rgba(${180+Math.floor(Math.random()*40)},${160+Math.floor(Math.random()*30)},${120+Math.floor(Math.random()*30)},0.4)`,
      type:'circle', gravity:0.02, drag:0.96, fadeOut:true
    })),
    smokePuff: (x,y) => Array.from({length:8},(_,i)=>({
      x, y, vx:(Math.random()-0.5)*2, vy:-1-Math.random()*2,
      life:1.0+Math.random()*0.8, size:12+Math.random()*18,
      color:`rgba(${80+Math.floor(Math.random()*40)},${80+Math.floor(Math.random()*40)},${80+Math.floor(Math.random()*40)},0.5)`,
      type:'circle', gravity:-0.05, drag:0.97, fadeOut:true, grow:true
    })),
    sparks: (x,y) => Array.from({length:25},(_,i)=>({
      x, y, vx:(Math.random()-0.5)*12, vy:-4-Math.random()*8,
      life:0.3+Math.random()*0.3, size:2+Math.random()*3,
      color:`hsl(${20+Math.random()*40},100%,${60+Math.random()*30}%)`,
      type:'circle', gravity:0.4, drag:0.95, trail:true
    })),
    explosion: (x,y) => [
      ...Array.from({length:30},(_,i)=>({
        x:x+(Math.random()-0.5)*10, y:y+(Math.random()-0.5)*10,
        vx:(Math.random()-0.5)*14, vy:(Math.random()-0.5)*14,
        life:0.4+Math.random()*0.5, size:4+Math.random()*8,
        color:`hsl(${Math.random()*40},100%,${50+Math.random()*30}%)`,
        type:'circle', gravity:0.25, drag:0.94
      })),
      ...Array.from({length:15},(_,i)=>({
        x, y, vx:(Math.random()-0.5)*8, vy:-2-Math.random()*8,
        life:0.8+Math.random()*0.6, size:15+Math.random()*25,
        color:`rgba(${60+Math.floor(Math.random()*30)},${60+Math.floor(Math.random()*20)},${60+Math.floor(Math.random()*20)},0.6)`,
        type:'circle', gravity:-0.05, drag:0.96, fadeOut:true, grow:true
      }))
    ],
    confetti: (x,y) => Array.from({length:40},(_,i)=>({
      x:x+(Math.random()-0.5)*100, y:y-Math.random()*50,
      vx:(Math.random()-0.5)*4, vy:-2-Math.random()*5,
      life:2+Math.random()*1.5, size:6+Math.random()*6,
      color:`hsl(${Math.random()*360},90%,60%)`,
      type:['circle','square','rect'][Math.floor(Math.random()*3)],
      gravity:0.12, drag:0.99, spin:true, spinSpeed:(Math.random()-0.5)*10
    })),
    levelUp: (x,y) => Array.from({length:50},(_,i)=>({
      x:x+(Math.random()-0.5)*200, y:y+Math.random()*50,
      vx:(Math.random()-0.5)*3, vy:-3-Math.random()*7,
      life:1.5+Math.random()*1, size:5+Math.random()*7,
      color:`hsl(${45+Math.random()*30},100%,${55+Math.random()*25}%)`,
      type:'star', gravity:0.08, drag:0.98, spin:true, spinSpeed:(Math.random()-0.5)*5
    })),
    mudSplash: (x,y) => Array.from({length:18},(_,i)=>({
      x:x+(Math.random()-0.5)*20, y,
      vx:(Math.random()-0.5)*6, vy:-3-Math.random()*4,
      life:0.4+Math.random()*0.4, size:4+Math.random()*8,
      color:`hsl(${30+Math.random()*20},${40+Math.floor(Math.random()*20)}%,${20+Math.floor(Math.random()*15)}%)`,
      type:'circle', gravity:0.35, drag:0.93
    })),
    waterSplash: (x,y) => Array.from({length:22},(_,i)=>({
      x:x+(Math.random()-0.5)*15, y,
      vx:(Math.random()-0.5)*7, vy:-4-Math.random()*6,
      life:0.5+Math.random()*0.4, size:3+Math.random()*6,
      color:`rgba(${100+Math.floor(Math.random()*50)},${180+Math.floor(Math.random()*50)},255,0.7)`,
      type:'circle', gravity:0.3, drag:0.95
    })),
    snowPuff: (x,y) => Array.from({length:15},(_,i)=>({
      x:x+(Math.random()-0.5)*25, y,
      vx:(Math.random()-0.5)*4, vy:-1-Math.random()*3,
      life:0.8+Math.random()*0.6, size:8+Math.random()*14,
      color:`rgba(220,235,255,${0.4+Math.random()*0.4})`,
      type:'circle', gravity:0.05, drag:0.97, fadeOut:true
    })),
    firework: (x,y) => {
      const hue = Math.random()*360;
      return Array.from({length:35},(_,i)=>{
        const angle = (i/35)*Math.PI*2;
        const speed = 4+Math.random()*4;
        return {
          x, y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
          life:0.8+Math.random()*0.4, size:3+Math.random()*4,
          color:`hsl(${hue+Math.random()*30},100%,${55+Math.random()*20}%)`,
          type:'circle', gravity:0.12, drag:0.97, trail:true
        };
      });
    },
    engineBackfire: (x,y) => Array.from({length:12},(_,i)=>({
      x:x+(Math.random()-0.5)*8, y:y+(Math.random()-0.5)*5,
      vx:-3-Math.random()*6, vy:(Math.random()-0.5)*3,
      life:0.2+Math.random()*0.25, size:5+Math.random()*8,
      color:`hsl(${Math.random()*40},100%,${60+Math.random()*25}%)`,
      type:'circle', gravity:0.05, drag:0.93
    })),
    speedBoost: (x,y) => Array.from({length:20},(_,i)=>({
      x, y:y+(Math.random()-0.5)*30,
      vx:-5-Math.random()*8, vy:(Math.random()-0.5)*2,
      life:0.25+Math.random()*0.25, size:4+Math.random()*6,
      color:`hsl(${190+Math.random()*30},100%,${65+Math.random()*20}%)`,
      type:'circle', gravity:0, drag:0.94, trail:true
    })),
  };

  function get(name, x, y) {
    const fn = PRESETS[name];
    return fn ? fn(x||0, y||0) : [];
  }

  function getNames() { return Object.keys(PRESETS); }

  function hasPreset(name) { return name in PRESETS; }

  function addPreset(name, fn) { PRESETS[name] = fn; }

  return { get, getNames, hasPreset, addPreset, PRESETS };
})();

// ================================================================
// PARTICLE_POOL_V2 — Object pool for zero-GC particle system
// ================================================================
const PARTICLE_POOL_V2 = (() => {
  const MAX = 3000;
  const pool = new Array(MAX).fill(null).map(()=>({
    active:false, x:0,y:0,vx:0,vy:0,ax:0,ay:0,
    life:0,maxLife:1,size:4,color:'#fff',
    type:'circle',drag:0.99,gravity:0.1,
    fadeOut:false,grow:false,trail:false,spin:false,spinAngle:0,spinSpeed:0
  }));
  let _active = 0;

  function spawn(cfg) {
    for (let i=0; i<MAX; i++) {
      if (!pool[i].active) {
        const p = pool[i];
        p.active   = true;
        p.x        = cfg.x||0;
        p.y        = cfg.y||0;
        p.vx       = cfg.vx||0;
        p.vy       = cfg.vy||0;
        p.ax       = cfg.ax||0;
        p.ay       = cfg.ay||0;
        p.life     = cfg.life||1;
        p.maxLife  = cfg.life||1;
        p.size     = cfg.size||4;
        p.color    = cfg.color||'#fff';
        p.type     = cfg.type||'circle';
        p.drag     = cfg.drag||0.99;
        p.gravity  = cfg.gravity!==undefined ? cfg.gravity : 0.1;
        p.fadeOut  = cfg.fadeOut||false;
        p.grow     = cfg.grow||false;
        p.trail    = cfg.trail||false;
        p.spin     = cfg.spin||false;
        p.spinAngle= 0;
        p.spinSpeed= cfg.spinSpeed||0;
        _active++;
        return p;
      }
    }
    return null; // pool full
  }

  function spawnBurst(configs) {
    for (const cfg of configs) spawn(cfg);
  }

  function update(dt) {
    let count = 0;
    for (let i=0; i<MAX; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active=false; _active--; continue; }
      p.vx   = (p.vx + p.ax) * p.drag;
      p.vy   = (p.vy + p.ay + p.gravity) * p.drag;
      p.x   += p.vx;
      p.y   += p.vy;
      if (p.spin) p.spinAngle += p.spinSpeed * dt;
      count++;
    }
    return count;
  }

  function draw(ctx) {
    ctx.save();
    for (let i=0; i<MAX; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const t      = 1 - p.life/p.maxLife; // 0=new, 1=dead
      const alpha  = p.fadeOut ? 1-t : 1;
      const size   = p.grow ? p.size*(0.2+0.8*t) : p.size;
      if (alpha < 0.01 || size < 0.5) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;

      if (p.spin) { ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.spinAngle); }

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.spin?0:p.x, p.spin?0:p.y, size/2, 0, Math.PI*2);
        ctx.fill();
      } else if (p.type === 'square') {
        ctx.fillRect((p.spin?-size/2:p.x-size/2), (p.spin?-size/2:p.y-size/2), size, size);
      } else if (p.type === 'rect') {
        ctx.fillRect((p.spin?-size:p.x-size), (p.spin?-size*0.4:p.y-size*0.4), size*2, size*0.8);
      } else if (p.type === 'diamond') {
        const h=size/2, cx=p.spin?0:p.x, cy=p.spin?0:p.y;
        ctx.beginPath(); ctx.moveTo(cx,cy-h); ctx.lineTo(cx+h,cy); ctx.lineTo(cx,cy+h); ctx.lineTo(cx-h,cy); ctx.closePath(); ctx.fill();
      } else if (p.type === 'star') {
        const cx=p.spin?0:p.x, cy=p.spin?0:p.y, r1=size/2, r2=size/4;
        ctx.beginPath();
        for (let j=0;j<10;j++){
          const a=j*Math.PI/5-Math.PI/2, r=j%2===0?r1:r2;
          j===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
        }
        ctx.closePath(); ctx.fill();
      }

      if (p.spin) ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function getActiveCount() { return _active; }
  function reset() { for(let i=0;i<MAX;i++) pool[i].active=false; _active=0; }

  return { spawn, spawnBurst, update, draw, getActiveCount, reset, MAX };
})();
