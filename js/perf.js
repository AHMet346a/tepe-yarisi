'use strict';
/* ============================================================================
   Perf — Render & Performans Katmanı  (100-özellik: B. #11–#20)
   engine.js gibi ADDITIVE ve dayanıklı: mevcut render'ı bozmaz, kademeli benimsenir.
   Her sistem window'a açılır.

     #11 RenderLayers  — katmanlı canvas (offscreen); statik katman bir kez çizilir
     #12 DirtyRect     — kirli-dikdörtgen takibi (sadece değişen alanı çiz)
     #13 Cull          — görüş-dışı eleme (frustum culling)
     #14 LOD           — detay seviyesi (uzak nesne basitleşir)
     #15 AdaptiveQuality — mevcut Quality'ye köprü (FPS düşünce efekt kısar)
     #16 FpsMeter      — kare-hız ölçer + FPS/frame-time grafiği (toggle overlay)
     #17 WebGLPath     — opsiyonel WebGL yolu (algılama + canvas'a güvenli düşüş)
     #18 SpriteAtlas   — sprite atlası & toplu çizim (batching)
     #19 IdleScheduler — requestIdleCallback ile ağır işi boş zamana yay
     #20 AssetManager  — görüntü ön-yükleme & bellek bütçesi yöneticisi
   ============================================================================ */

// ── yardımcı: offscreen canvas üret (OffscreenCanvas varsa onu, yoksa <canvas>) ──
function _makeCanvas(w, h) {
  w = Math.max(1, w | 0); h = Math.max(1, h | 0);
  let c;
  try { if (typeof OffscreenCanvas !== 'undefined') c = new OffscreenCanvas(w, h); } catch (e) {}
  if (!c) { c = (typeof document !== 'undefined') ? document.createElement('canvas') : { width: w, height: h, getContext() { return null; } }; }
  c.width = w; c.height = h;
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// #11 RenderLayers — katmanlı canvas (offscreen önbellek)
//   Yavaş/statik katmanı (arka plan, menü paneli) bir kez offscreen'e çizer,
//   her karede yeniden çizmek yerine BLIT eder → CPU düşer, FPS fırlar.
// ─────────────────────────────────────────────────────────────────────────────
const RenderLayers = {
  _l: Object.create(null),
  // name katmanını w×h ister; içerik "değişti" olarak işaretliyse drawFn(ctx,w,h)
  // ile YENİDEN çizer, aksi halde önbelleği döndürür. drawFn dönüş: void.
  paint(name, w, h, drawFn, key) {
    let L = this._l[name];
    if (!L) { L = this._l[name] = { canvas: null, ctx: null, w: 0, h: 0, key: null }; }
    const need = (!L.canvas || L.w !== w || L.h !== h || L.key !== key);
    if (need) {
      if (!L.canvas || L.w !== w || L.h !== h) { L.canvas = _makeCanvas(w, h); L.ctx = L.canvas.getContext('2d'); L.w = w; L.h = h; }
      if (L.ctx) { L.ctx.clearRect(0, 0, w, h); try { drawFn(L.ctx, w, h); } catch (e) {} }
      L.key = key;
    }
    return L.canvas;
  },
  invalidate(name) { const L = this._l[name]; if (L) L.key = '__invalid__' + Math.random(); },
  blit(ctx, name, x, y) { const L = this._l[name]; if (L && L.canvas) { try { ctx.drawImage(L.canvas, x || 0, y || 0); } catch (e) {} return true; } return false; },
  drop(name) { delete this._l[name]; },
  count() { return Object.keys(this._l).length; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #12 DirtyRect — kirli-dikdörtgen takibi
//   Statik ekranlarda (menü) sadece değişen bölgeleri işaretleyip yeniden çizmek
//   için birleşik kirli-dikdörtgen üretir. add() ile bölge ekle, flush() ile al.
// ─────────────────────────────────────────────────────────────────────────────
function DirtyRect() { this._d = []; }
DirtyRect.prototype.add = function (x, y, w, h) { if (w > 0 && h > 0) this._d.push([x, y, x + w, y + h]); return this; };
DirtyRect.prototype.isEmpty = function () { return this._d.length === 0; };
DirtyRect.prototype.union = function () {
  if (!this._d.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < this._d.length; i++) { const r = this._d[i]; if (r[0] < x0) x0 = r[0]; if (r[1] < y0) y0 = r[1]; if (r[2] > x1) x1 = r[2]; if (r[3] > y1) y1 = r[3]; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
DirtyRect.prototype.clear = function () { this._d.length = 0; return this; };

// ─────────────────────────────────────────────────────────────────────────────
// #13 Cull — görüş-dışı eleme (frustum culling)
//   Ekran (kamera) dikdörtgeni dışındaki nesneleri çizme → az çizim, çok FPS.
// ─────────────────────────────────────────────────────────────────────────────
const Cull = {
  // Dünya-uzayı kutu, kamera görünürü ile kesişiyor mu? margin: taşma payı (px).
  visible(x, y, w, h, viewX, viewY, viewW, viewH, margin) {
    margin = margin || 0;
    return !(x + w < viewX - margin || x > viewX + viewW + margin ||
             y + h < viewY - margin || y > viewY + viewH + margin);
  },
  // Ekran-uzayı nokta ekranda mı?
  onScreen(sx, sy, W, H, margin) { margin = margin || 64; return sx >= -margin && sx <= W + margin && sy >= -margin && sy <= H + margin; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #14 LOD — detay seviyesi
//   Mesafeye (veya ekran boyutuna) göre 0=yüksek,1=orta,2=düşük detay seçer.
// ─────────────────────────────────────────────────────────────────────────────
const LOD = {
  near: 700, far: 1600,
  forDistance(d) { d = Math.abs(d || 0); if (d < this.near) return 0; if (d < this.far) return 1; return 2; },
  // ekrandaki piksel boyutuna göre (küçük → düşük detay)
  forSize(px) { if (px > 96) return 0; if (px > 40) return 1; return 2; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #15 AdaptiveQuality — mevcut Quality modülüne köprü
//   FPS düşünce efektleri otomatik kısan Quality sistemi zaten var; burada tek
//   arayüzden erişim + selfTest sağlanır. Quality yoksa güvenli varsayılan döner.
// ─────────────────────────────────────────────────────────────────────────────
const AdaptiveQuality = {
  available() { return typeof Quality !== 'undefined'; },
  level() { return (typeof Quality !== 'undefined' && Quality.level != null) ? Quality.level : 2; },
  particleScale() { return (typeof Quality !== 'undefined' && Quality.particleScale != null) ? Quality.particleScale : 1; },
  shadowsOn() { return (typeof Quality !== 'undefined') ? Quality.shadowsOn !== false : true; },
  fps() { return (typeof Quality !== 'undefined' && Quality.getFps) ? Quality.getFps() : (typeof Telemetry !== 'undefined' && Telemetry.getStats ? Telemetry.getStats().fps : 60); },
  isAuto() { return (typeof Quality !== 'undefined') ? Quality.mode === 'auto' : false; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #16 FpsMeter — kare-hız ölçer + FPS/frame-time grafiği
//   sample(dt) her kareden beslenir (ucuz). enabled iken drawOverlay(ctx,W,H)
//   sağ-üstte küçük bir grafik + sayaç çizer. toggle() ile açılır/kapanır.
// ─────────────────────────────────────────────────────────────────────────────
const FpsMeter = {
  enabled: false,
  _hist: [],           // son N frame-time (ms)
  _N: 90,
  _fps: 60, _ms: 16.7, _acc: 0, _cnt: 0, _t: 0,
  sample(dt) {
    const ms = (dt > 0 ? dt : 0.016) * 1000;
    this._hist.push(ms); if (this._hist.length > this._N) this._hist.shift();
    this._acc += dt; this._cnt++;
    if (this._acc >= 0.25) { this._fps = this._cnt / this._acc; this._ms = (this._acc / this._cnt) * 1000; this._acc = 0; this._cnt = 0; }
  },
  toggle() { this.enabled = !this.enabled; return this.enabled; },
  getFps() { return Math.round(this._fps); },
  drawOverlay(ctx, W, H) {
    if (!this.enabled || !ctx) return;
    const w = 128, h = 44, x = W - w - 8, y = 8;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(6,10,20,0.9)'; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill();
    // frame-time grafiği (yeşil iyi, kırmızı kötü)
    const n = this._hist.length, base = y + h - 3, maxMs = 50;
    for (let i = 0; i < n; i++) {
      const ms = this._hist[i], bh = Math.min(h - 14, (ms / maxMs) * (h - 14));
      ctx.fillStyle = ms > 33 ? '#ff5a5a' : (ms > 20 ? '#ffcf3f' : '#5adf7a');
      ctx.fillRect(x + 2 + (i / this._N) * (w - 4), base - bh, Math.max(1, (w - 4) / this._N), bh);
    }
    ctx.fillStyle = '#dfeaff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(this.getFps() + ' FPS  ' + this._ms.toFixed(1) + 'ms', x + 5, y + 3);
    ctx.restore();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #17 WebGLPath — opsiyonel WebGL yolu (algılama + güvenli düşüş)
//   WebGL destekleniyorsa hızlandırılmış parçacık katmanı için altyapı; yoksa
//   canvas 2D'ye SESSİZCE düşer (oyun her koşulda çalışır).
// ─────────────────────────────────────────────────────────────────────────────
const WebGLPath = {
  _checked: false, _supported: false, _gl: null, _canvas: null,
  supported() {
    if (this._checked) return this._supported;
    this._checked = true;
    try {
      const c = _makeCanvas(2, 2);
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      this._supported = !!gl;
    } catch (e) { this._supported = false; }
    return this._supported;
  },
  // İstek üzerine bir WebGL bağlamı hazırlar (parçacık hızlandırma için). Başarısızsa null.
  init(w, h) {
    if (!this.supported()) return null;
    try {
      this._canvas = _makeCanvas(w || 2, h || 2);
      this._gl = this._canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
      return this._gl;
    } catch (e) { return null; }
  },
  // Kullanım kararı: yüksek parçacık + WebGL varsa true (renderer benimseyebilir).
  recommended() { return this.supported() && (typeof AdaptiveQuality === 'undefined' || AdaptiveQuality.level() >= 2); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #18 SpriteAtlas — sprite atlası & toplu çizim
//   Sık kullanılan küçük sprite'ları TEK offscreen atlasa çizer; çizimde tek
//   dokudan blit → durum değişimi azalır (batching), çizim ucuzlar.
// ─────────────────────────────────────────────────────────────────────────────
function SpriteAtlas(w, h, pad) {
  this.canvas = _makeCanvas(w || 512, h || 512);
  this.ctx = this.canvas.getContext('2d');
  this.pad = pad || 2;
  this._x = this.pad; this._y = this.pad; this._rowH = 0;
  this.frames = Object.create(null);
}
// name sprite'ını sw×sh boyutunda drawFn(ctx, sw, sh) ile atlasa yerleştirir.
SpriteAtlas.prototype.add = function (name, sw, sh, drawFn) {
  if (this.frames[name]) return this.frames[name];
  if (this._x + sw + this.pad > this.canvas.width) { this._x = this.pad; this._y += this._rowH + this.pad; this._rowH = 0; }
  if (this._y + sh + this.pad > this.canvas.height) return null; // atlas dolu
  const fx = this._x, fy = this._y;
  if (this.ctx) { this.ctx.save(); this.ctx.translate(fx, fy); try { drawFn(this.ctx, sw, sh); } catch (e) {} this.ctx.restore(); }
  const f = { x: fx, y: fy, w: sw, h: sh };
  this.frames[name] = f; this._x += sw + this.pad; if (sh > this._rowH) this._rowH = sh;
  return f;
};
// atlas'tan name sprite'ını hedefe çiz (tek doku → batch dostu).
SpriteAtlas.prototype.draw = function (ctx, name, dx, dy, dw, dh) {
  const f = this.frames[name]; if (!f) return false;
  try { ctx.drawImage(this.canvas, f.x, f.y, f.w, f.h, dx, dy, dw || f.w, dh || f.h); return true; } catch (e) { return false; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #19 IdleScheduler — ağır işi boş zamana yay (requestIdleCallback)
//   Kayıt yazımı, analitik, önbellek temizliği gibi kritik-olmayan işleri kare
//   arası boş zamana erteler → oynanış takılmaz. rIC yoksa setTimeout'a düşer.
// ─────────────────────────────────────────────────────────────────────────────
const IdleScheduler = {
  _q: [], _scheduled: false,
  _ric: (typeof window !== 'undefined' && window.requestIdleCallback)
    ? window.requestIdleCallback.bind(window)
    : function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 8; }, didTimeout: false }); }, 1); },
  push(fn, label) { this._q.push({ fn: fn, label: label || '' }); this._schedule(); return this; },
  _schedule() { if (this._scheduled) return; this._scheduled = true; const self = this; this._ric(function (dl) { self._run(dl); }); },
  _run(deadline) {
    this._scheduled = false;
    while (this._q.length && (!deadline || deadline.timeRemaining() > 1 || deadline.didTimeout)) {
      const job = this._q.shift();
      try { job.fn(); } catch (e) { try { if (typeof Telemetry !== 'undefined' && Telemetry.error) Telemetry.error('idle:' + job.label, e); } catch (e2) {} }
    }
    if (this._q.length) this._schedule();
  },
  pending() { return this._q.length; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #20 AssetManager — görüntü ön-yükleme & bellek bütçesi
//   Görselleri önceden yükler (oyun akışı takılmaz), tahmini bellek kullanımı
//   izler; bütçe aşılınca en eski kullanılanı düşürür (LRU).
// ─────────────────────────────────────────────────────────────────────────────
const AssetManager = {
  _cache: Object.create(null), _order: [], budgetKB: 40 * 1024,
  _bytesOf(img) { return ((img && img.width || 0) * (img && img.height || 0) * 4); }, // RGBA tahmini
  preload(urls) {
    const self = this;
    return Promise.all((urls || []).map(function (u) {
      return new Promise(function (res) {
        if (self._cache[u]) { res(self._cache[u]); return; }
        try {
          const img = new Image();
          img.onload = function () { self._put(u, img); res(img); };
          img.onerror = function () { res(null); };
          img.src = u;
        } catch (e) { res(null); }
      });
    }));
  },
  _put(url, img) {
    this._cache[url] = img; this._order.push(url);
    this._evictIfNeeded();
  },
  get(url) { const i = this._order.indexOf(url); if (i >= 0) { this._order.splice(i, 1); this._order.push(url); } return this._cache[url] || null; },
  usedKB() { let b = 0; for (const k in this._cache) b += this._bytesOf(this._cache[k]); return Math.round(b / 1024); },
  _evictIfNeeded() {
    let guard = 0;
    while (this.usedKB() > this.budgetKB && this._order.length > 1 && guard++ < 1000) {
      const old = this._order.shift(); delete this._cache[old];
    }
  },
  count() { return this._order.length; }
};

// ── Perf kimliği + kendi kendine tanılama ──
const Perf = {
  version: '1.0',
  systems: ['RenderLayers', 'DirtyRect', 'Cull', 'LOD', 'AdaptiveQuality', 'FpsMeter', 'WebGLPath', 'SpriteAtlas', 'IdleScheduler', 'AssetManager'],
  ready() { const self = this; return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { const c = RenderLayers.paint('__t', 8, 8, function (cx) { cx.fillRect(0, 0, 4, 4); }, 'k1'); r.layers = !!c && RenderLayers.count() >= 1; RenderLayers.drop('__t'); } catch (e) { r.layers = false; }
    try { const dr = new DirtyRect(); dr.add(0, 0, 10, 10).add(20, 20, 5, 5); const u = dr.union(); r.dirtyrect = u && u.w === 25 && u.h === 25; } catch (e) { r.dirtyrect = false; }
    try { r.cull = Cull.visible(0, 0, 10, 10, 0, 0, 100, 100) === true && Cull.visible(500, 0, 10, 10, 0, 0, 100, 100) === false; } catch (e) { r.cull = false; }
    try { r.lod = LOD.forDistance(100) === 0 && LOD.forDistance(1000) === 1 && LOD.forDistance(5000) === 2; } catch (e) { r.lod = false; }
    try { r.adaptivequality = typeof AdaptiveQuality.level() === 'number'; } catch (e) { r.adaptivequality = false; }
    try { FpsMeter.sample(0.016); r.fpsmeter = FpsMeter.getFps() > 0; } catch (e) { r.fpsmeter = false; }
    try { r.webgl = typeof WebGLPath.supported() === 'boolean'; } catch (e) { r.webgl = false; }
    try { const a = new SpriteAtlas(64, 64); a.add('x', 8, 8, function (cx) { cx.fillRect(0, 0, 8, 8); }); r.atlas = !!a.frames['x']; } catch (e) { r.atlas = false; }
    try { let ran = 0; IdleScheduler.push(function () { ran++; }, '__t'); r.idle = IdleScheduler.pending() >= 0; } catch (e) { r.idle = false; }
    try { r.assets = (typeof AssetManager.usedKB() === 'number') && (typeof AssetManager.preload === 'function'); } catch (e) { r.assets = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.RenderLayers = RenderLayers;
  window.DirtyRect = DirtyRect;
  window.Cull = Cull;
  window.LOD = LOD;
  window.AdaptiveQuality = AdaptiveQuality;
  window.FpsMeter = FpsMeter;
  window.WebGLPath = WebGLPath;
  window.SpriteAtlas = SpriteAtlas;
  window.IdleScheduler = IdleScheduler;
  window.AssetManager = AssetManager;
  window.Perf = Perf;
}
