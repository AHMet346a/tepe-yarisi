'use strict';
/* ============================================================================
   Engine — Çekirdek Motor Katmanı  (100-özellik: A. Motor & Mimari #1–#10)
   Tek dosya, tümü ADDITIVE ve dayanıklı: mevcut oyunu bozmadan çalışır, kademeli
   benimsenir. Her sistem window'a açılır. Hiçbir dış bağımlılık yok.

   İçindekiler:
     #10 GameConfig   — veri-güdümlü yapılandırma (sabitler tek yerde)
     #5  EventBus     — merkezi olay veriyolu (gevşek bağlı modüller)
     #2  Rng          — deterministik seed'li rastgelelik (mulberry32)
     #3  ObjectPool   — nesne havuzu (GC duraklamalarını azaltır)
     #4  SpatialGrid  — uzamsal ızgara (çarpışma/çizim taraması hızlanır)
     #6  StateMachine — sonlu durum makinesi (güvenli ekran/akış geçişleri)
     #9  TimeScale    — merkezi zaman ölçeği (slow-mo / pause tek yerden)
     #8  Watchdog     — modül sağlık izleyici (çökmeyi izole eder, karartmaz)
     #1  FixedStep    — sabit-adım döngü yardımcısı (+ interpolation alfası)
   (#7 Versiyonlu kayıt göçü = mevcut SaveMigrate modülü; burada EventBus'a bağlanır.)
   ============================================================================ */

// ─────────────────────────────────────────────────────────────────────────────
// #10  GameConfig — veri-güdümlü yapılandırma
//   Tüm dengeleme sabitleri tek kaynakta. get('a.b.c') ile okunur; set ile ezilir.
//   Modüller "sihirli sayı" yerine buradan okuyarak dengelemeyi tek yerden yapar.
// ─────────────────────────────────────────────────────────────────────────────
const GameConfig = {
  _data: {
    engine:  { fixedHz: 60, maxFrameDt: 0.25, maxSubSteps: 5 },
    physics: { gravity: 2100, maxFallSpeed: 2600, airControl: 30 },
    nitro:   { costPerStep: 10000, step: 25, duration: 2.0, cooldown: 15.0, boost: 350 },
    economy: { coinValue: 1, startGold: 500 },
    fx:      { maxParticles: 900, particlePool: 1200 },
    ui:      { toastLife: 2.5 }
  },
  get(path, dflt) {
    try {
      const parts = String(path).split('.');
      let n = this._data;
      for (let i = 0; i < parts.length; i++) { n = n[parts[i]]; if (n === undefined || n === null) return dflt; }
      return n;
    } catch (e) { return dflt; }
  },
  set(path, val) {
    try {
      const parts = String(path).split('.');
      let n = this._data;
      for (let i = 0; i < parts.length - 1; i++) { if (typeof n[parts[i]] !== 'object') n[parts[i]] = {}; n = n[parts[i]]; }
      n[parts[parts.length - 1]] = val;
      if (typeof EventBus !== 'undefined') EventBus.emit('config:changed', { path, val });
      return true;
    } catch (e) { return false; }
  },
  merge(obj) { try { this._deep(this._data, obj); } catch (e) {} },
  _deep(dst, src) {
    for (const k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) { if (typeof dst[k] !== 'object') dst[k] = {}; this._deep(dst[k], src[k]); }
      else dst[k] = src[k];
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #5  EventBus — merkezi olay veriyolu (pub/sub)
//   Modüller birbirini doğrudan çağırmak yerine olay yayınlar/dinler → gevşek bağ,
//   çökme yalıtımı (bir dinleyici patlarsa diğerleri etkilenmez).
// ─────────────────────────────────────────────────────────────────────────────
const EventBus = {
  _map: Object.create(null),
  on(evt, fn) { (this._map[evt] || (this._map[evt] = [])).push(fn); return () => this.off(evt, fn); },
  once(evt, fn) { const off = this.on(evt, (...a) => { off(); fn(...a); }); return off; },
  off(evt, fn) { const a = this._map[evt]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
  emit(evt, payload) {
    const a = this._map[evt]; if (!a) return;
    for (let i = 0; i < a.length; i++) {
      try { a[i](payload, evt); }
      catch (e) { try { if (typeof Telemetry !== 'undefined' && Telemetry.error) Telemetry.error('eventbus:' + evt, e); } catch (e2) {} }
    }
  },
  clear(evt) { if (evt) delete this._map[evt]; else this._map = Object.create(null); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #2  Rng — deterministik seed'li rastgelelik (mulberry32)
//   Aynı seed → aynı sayı dizisi. Replay/hayalet %100 birebir oynatılabilir.
//   Global akış: Rng.reseed(seed) ile bir koşuya sabit tohum verilir.
// ─────────────────────────────────────────────────────────────────────────────
function _mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const Rng = {
  _seed: (Date.now() & 0xffffffff) >>> 0,
  _fn: null,
  reseed(seed) { this._seed = (seed >>> 0) || 1; this._fn = _mulberry32(this._seed); return this; },
  seed() { return this._seed; },
  next() { if (!this._fn) this.reseed(this._seed); return this._fn(); },     // 0..1
  int(n) { return Math.floor(this.next() * n); },                            // 0..n-1
  range(a, b) { return a + this.next() * (b - a); },                          // a..b
  pick(arr) { return arr[this.int(arr.length)]; },
  chance(p) { return this.next() < p; },
  // Bağımsız akış (ana akışı bozmadan): kendi fonksiyonunu döndürür.
  stream(seed) { return _mulberry32((seed >>> 0) || 1); },
  // Bir koşu için tohum üret + yayınla (deterministik replay altyapısı).
  newRunSeed() { const s = ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) || 1; this.reseed(s); if (typeof EventBus !== 'undefined') EventBus.emit('rng:seed', s); return s; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #3  ObjectPool — nesne havuzu
//   Sık üretilip yok edilen nesneleri (partikül vb.) yeniden kullanır → GC yükü
//   ve kare-atlamaları azalır. factory() üretir, reset(obj) geri-verirken temizler.
// ─────────────────────────────────────────────────────────────────────────────
function ObjectPool(factory, reset, prealloc) {
  this._factory = factory;
  this._reset = reset || function () {};
  this._free = [];
  this._liveCount = 0;
  const n = prealloc || 0;
  for (let i = 0; i < n; i++) this._free.push(factory());
}
ObjectPool.prototype.acquire = function () {
  const o = this._free.length ? this._free.pop() : this._factory();
  this._liveCount++;
  return o;
};
ObjectPool.prototype.release = function (o) {
  if (!o) return;
  try { this._reset(o); } catch (e) {}
  this._free.push(o);
  if (this._liveCount > 0) this._liveCount--;
};
ObjectPool.prototype.stats = function () { return { free: this._free.length, live: this._liveCount }; };

// ─────────────────────────────────────────────────────────────────────────────
// #4  SpatialGrid — uniform uzamsal ızgara
//   Nesneleri hücrelere yerleştirir; bir bölgeyi sorgulayınca sadece komşu
//   hücrelere bakar → O(n²) çarpışma taramasını O(n)'e yaklaştırır.
// ─────────────────────────────────────────────────────────────────────────────
function SpatialGrid(cellSize) {
  this.cell = cellSize || 128;
  this._cells = new Map();
}
SpatialGrid.prototype._key = function (cx, cy) { return cx + ',' + cy; };
SpatialGrid.prototype.clear = function () { this._cells.clear(); };
SpatialGrid.prototype.insert = function (item, x, y, w, h) {
  w = w || 0; h = h || 0;
  const c = this.cell;
  const x0 = Math.floor(x / c), y0 = Math.floor(y / c);
  const x1 = Math.floor((x + w) / c), y1 = Math.floor((y + h) / c);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const k = this._key(cx, cy);
    let a = this._cells.get(k); if (!a) { a = []; this._cells.set(k, a); }
    a.push(item);
  }
};
SpatialGrid.prototype.query = function (x, y, w, h) {
  w = w || 0; h = h || 0;
  const c = this.cell, out = [], seen = new Set();
  const x0 = Math.floor(x / c), y0 = Math.floor(y / c);
  const x1 = Math.floor((x + w) / c), y1 = Math.floor((y + h) / c);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const a = this._cells.get(this._key(cx, cy)); if (!a) continue;
    for (let i = 0; i < a.length; i++) { if (!seen.has(a[i])) { seen.add(a[i]); out.push(a[i]); } }
  }
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
// #6  StateMachine — sonlu durum makinesi
//   Ekran/akış geçişlerini kurallı yapar: yalnız izinli geçişlere izin verir,
//   onEnter/onExit kancaları çalıştırır → tanımsız/kaçak geçişler engellenir.
// ─────────────────────────────────────────────────────────────────────────────
function StateMachine(spec, initial) {
  this.states = spec || {};        // { state: { on: {EVENT:'target'}, enter(), exit() } }
  this.state = initial || null;
  this._history = [];
}
StateMachine.prototype.can = function (event) {
  const s = this.states[this.state];
  return !!(s && s.on && s.on[event]);
};
StateMachine.prototype.dispatch = function (event, data) {
  const s = this.states[this.state];
  if (!s || !s.on || !s.on[event]) return false;
  return this.go(s.on[event], data);
};
StateMachine.prototype.go = function (target, data) {
  if (!this.states[target]) return false;
  const cur = this.states[this.state];
  try { if (cur && cur.exit) cur.exit(target, data); } catch (e) {}
  this._history.push(this.state);
  if (this._history.length > 50) this._history.shift();
  const prev = this.state; this.state = target;
  try { if (this.states[target].enter) this.states[target].enter(prev, data); } catch (e) {}
  if (typeof EventBus !== 'undefined') EventBus.emit('state:change', { from: prev, to: target });
  return true;
};
StateMachine.prototype.is = function (s) { return this.state === s; };

// ─────────────────────────────────────────────────────────────────────────────
// #9  TimeScale — merkezi zaman ölçeği
//   Tüm slow-mo / hızlandırma / duraklatma tek çarpandan geçer. apply(dt) ile
//   simülasyona verilecek dt ölçeklenir; geçici slow-mo süreli olarak eklenebilir.
// ─────────────────────────────────────────────────────────────────────────────
const TimeScale = {
  base: 1,          // kalıcı taban (örn. ayar)
  _temp: 1,         // geçici çarpan (slow-mo)
  _tempT: 0,        // geçici süre kalan
  _paused: false,
  value() { return this._paused ? 0 : this.base * this._temp; },
  set(v) { this.base = Math.max(0, v); },
  pause() { this._paused = true; },
  resume() { this._paused = false; },
  isPaused() { return this._paused; },
  slowmo(factor, dur) { this._temp = Math.max(0.05, factor); this._tempT = Math.max(0, dur || 0.6); },
  clear() { this._temp = 1; this._tempT = 0; },
  // Gerçek (ölçeksiz) dt ile çağrılır; geçici slow-mo süresini eritir.
  update(realDt) { if (this._tempT > 0) { this._tempT -= realDt; if (this._tempT <= 0) { this._temp = 1; this._tempT = 0; } } },
  // Simülasyona verilecek ölçekli dt.
  apply(dt) { return dt * this.value(); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #8  Watchdog — modül sağlık izleyici
//   Bir modül update'i patlarsa oyunu KARARTMAZ: hatayı yakalar, sayar, tekrar
//   tekrar patlayan modülü geçici devre dışı bırakır (izole eder) ve raporlar.
// ─────────────────────────────────────────────────────────────────────────────
const Watchdog = {
  _fail: Object.create(null),
  _disabled: Object.create(null),
  MAX_FAILS: 5,
  guard(name, fn) {
    if (this._disabled[name]) return undefined;
    try { return fn(); }
    catch (e) {
      const n = (this._fail[name] = (this._fail[name] || 0) + 1);
      try { if (typeof Telemetry !== 'undefined' && Telemetry.error) Telemetry.error('watchdog:' + name, e); } catch (e2) {}
      if (typeof EventBus !== 'undefined') EventBus.emit('watchdog:fail', { name, count: n, error: String(e && e.message || e) });
      if (n >= this.MAX_FAILS) {
        this._disabled[name] = true;
        if (typeof EventBus !== 'undefined') EventBus.emit('watchdog:disabled', { name });
      }
      return undefined;
    }
  },
  isDisabled(name) { return !!this._disabled[name]; },
  reset(name) { if (name) { delete this._fail[name]; delete this._disabled[name]; } else { this._fail = Object.create(null); this._disabled = Object.create(null); } },
  report() { return { fails: Object.assign({}, this._fail), disabled: Object.keys(this._disabled) }; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #1  FixedStep — sabit-adım döngü yardımcısı (+ interpolation alfası)
//   Değişken kare süresini biriktirir; simülasyonu SABİT adımlarla (1/60) ilerletir.
//   Böylece fizik her cihazda birebir aynı hisseder, düşük FPS'te "yavaşlamaz".
//   alpha = kalan birikim / adım → render tarafı iki durum arası interpolasyon için.
// ─────────────────────────────────────────────────────────────────────────────
const FixedStep = {
  _acc: 0,
  alpha: 0,
  steps: 0,
  // realDt: gerçek geçen süre (sn). stepFn(fixedDt): sabit adımla simülasyonu ilerletir.
  run(realDt, stepFn) {
    const hz = (typeof GameConfig !== 'undefined') ? GameConfig.get('engine.fixedHz', 60) : 60;
    const fixed = 1 / hz;
    const maxFrame = (typeof GameConfig !== 'undefined') ? GameConfig.get('engine.maxFrameDt', 0.25) : 0.25;
    const maxSub = (typeof GameConfig !== 'undefined') ? GameConfig.get('engine.maxSubSteps', 5) : 5;
    if (!(realDt > 0)) realDt = fixed;
    if (realDt > maxFrame) realDt = maxFrame;          // spiral-of-death koruması
    this._acc += realDt;
    let n = 0;
    while (this._acc >= fixed && n < maxSub) { stepFn(fixed); this._acc -= fixed; n++; }
    if (n >= maxSub) this._acc = 0;                    // çok geride kaldıysak sıfırla
    this.steps = n;
    this.alpha = this._acc / fixed;                    // 0..1 render interpolasyon oranı
    return this.alpha;
  },
  reset() { this._acc = 0; this.alpha = 0; this.steps = 0; }
};

// ── Ortak ihtiyaç: paylaşılan partikül havuzu (fx) — particles.js benimseyebilir ──
const Pools = {
  particle: new ObjectPool(
    function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, color: '#fff', kind: 0, dead: true }; },
    function (p) { p.dead = true; p.life = 0; },
    (typeof GameConfig !== 'undefined') ? GameConfig.get('fx.particlePool', 1200) : 1200
  )
};

// ── Motor kimliği + kendi kendine tanılama ──
const Engine = {
  version: '1.0',
  systems: ['GameConfig', 'EventBus', 'Rng', 'ObjectPool', 'SpatialGrid', 'StateMachine', 'TimeScale', 'Watchdog', 'FixedStep', 'SaveMigrate'],
  ready() {
    return this.systems.every(function (s) {
      return (s === 'SaveMigrate') ? (typeof window !== 'undefined' && typeof window[s] !== 'undefined') : (typeof window !== 'undefined' && typeof window[s] !== 'undefined');
    });
  },
  _Grid: SpatialGrid,   // motorun kendi grid'i (oyunun global SpatialGrid'i ile çakışmadan test için)
  selfTest() {
    const r = {};
    try { GameConfig.set('__t.x', 5); r.config = GameConfig.get('__t.x') === 5; } catch (e) { r.config = false; }
    try { let got = 0; const off = EventBus.on('__t', () => got++); EventBus.emit('__t'); off(); r.eventbus = got === 1; } catch (e) { r.eventbus = false; }
    try { const a = Rng.stream(42), b = Rng.stream(42); r.rng = a() === b(); } catch (e) { r.rng = false; }
    try { const p = new ObjectPool(() => ({}), null, 1); const o = p.acquire(); p.release(o); r.pool = p.stats().free >= 1; } catch (e) { r.pool = false; }
    try { r.grid = (typeof SpatialGrid === 'function') && (typeof new SpatialGrid(64) === 'object'); } catch (e) { r.grid = false; }
    try { const sm = new StateMachine({ a: { on: { go: 'b' } }, b: {} }, 'a'); sm.dispatch('go'); r.fsm = sm.is('b'); } catch (e) { r.fsm = false; }
    try { TimeScale.slowmo(0.5, 0.1); r.timescale = TimeScale.value() === 0.5; TimeScale.clear(); } catch (e) { r.timescale = false; }
    try { let ran = false; Watchdog.guard('__t', () => { ran = true; throw new Error('x'); }); r.watchdog = ran; Watchdog.reset('__t'); } catch (e) { r.watchdog = false; }
    try { let s = 0; FixedStep.run(0.05, () => s++); r.fixedstep = s >= 1; FixedStep.reset(); } catch (e) { r.fixedstep = false; }
    r.allPass = Object.keys(r).every(k => r[k] === true);
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.GameConfig = GameConfig;
  window.EventBus = EventBus;
  window.Rng = Rng;
  window.ObjectPool = ObjectPool;
  window.SpatialGrid = SpatialGrid;
  window.StateMachine = StateMachine;
  window.TimeScale = TimeScale;
  window.Watchdog = Watchdog;
  window.FixedStep = FixedStep;
  window.Pools = Pools;
  window.Engine = Engine;
}
