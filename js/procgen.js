'use strict';
/* ProcGen — Prosedürel İçerik Üretimi (100-özellik: G. #61–#70). ADDITIVE. */
const _pg_clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
function _pg_rng(seed) { let a = (seed >>> 0) || 1; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// #61 Seed'li sonsuz harita üreteci
const InfiniteTerrain = {
  seed: 1, amp: 90, rough: 0.008,
  setSeed(s) { this.seed = (s >>> 0) || 1; return this; },
  // x → yükseklik (deterministik, seed'e bağlı katmanlı sinüs + gürültü)
  heightAt(x) {
    const n = _pg_rng(this.seed ^ (Math.floor(x / 400) * 2654435761 >>> 0))();
    return Math.sin(x * this.rough) * this.amp + Math.sin(x * this.rough * 2.7 + this.seed) * this.amp * 0.4 + (n - 0.5) * this.amp * 0.5;
  },
  segment(x0, x1, step) { step = step || 16; const out = []; for (let x = x0; x <= x1; x += step) out.push({ x: x, y: this.heightAt(x) }); return out; }
};
// #62 Biyom sistemi
const Biomes = {
  list: ['grassland', 'desert', 'snow', 'forest', 'volcano'],
  spanEach: 3000,
  at(x) { const i = Math.floor(Math.abs(x) / this.spanEach) % this.list.length; return this.list[i]; },
  // biyomlar arası geçiş oranı (0..1) — yumuşak harmanlama
  blend(x) { const f = (Math.abs(x) % this.spanEach) / this.spanEach; return { from: this.at(x), to: this.at(x + this.spanEach), t: _pg_clamp((f - 0.85) / 0.15, 0, 1) }; }
};
// #63 Prosedürel araç üreteci (rastgele ama dengeli)
const VehicleGen = {
  generate(seed) {
    const rnd = _pg_rng(seed || 1); const budget = 20; // toplam stat bütçesi → denge
    let s = [1, 1, 1, 1]; let rem = budget - 4;
    while (rem > 0) { const i = (rnd() * 4) | 0; if (s[i] < 8) { s[i]++; rem--; } else rem--; }
    return { name: 'PROTO-' + ((seed || 1) % 1000), engine: s[0], suspension: s[1], tires: s[2], fuel: s[3], power: s[0] * 3 + s[1] + s[2] + s[3] };
  }
};
// #64 Harita editörü + paylaşım kodu
const MapEditor = {
  // düğüm dizisini kısa paylaşım koduna (base64) çevirir ve geri açar
  encode(nodes) { try { return btoa(JSON.stringify(nodes)).replace(/=+$/, ''); } catch (e) { return null; } },
  decode(code) { try { return JSON.parse(atob(code)); } catch (e) { return null; } },
  validate(nodes) { return Array.isArray(nodes) && nodes.length >= 2 && nodes.every(function (n) { return typeof n.x === 'number' && typeof n.y === 'number'; }); }
};
// #65 Eğri-tabanlı pist (Bezier)
const BezierTrack = {
  cubic(p0, p1, p2, p3, t) { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y }; },
  sample(p0, p1, p2, p3, n) { const out = []; for (let i = 0; i <= n; i++) out.push(this.cubic(p0, p1, p2, p3, i / n)); return out; }
};
// #66 Hava durumu motoru (state machine)
const WeatherEngine = {
  states: ['clear', 'rain', 'snow', 'fog', 'storm'], state: 'clear', _t: 0,
  transitions: { clear: ['rain', 'fog'], rain: ['storm', 'clear'], snow: ['clear', 'fog'], fog: ['clear', 'rain'], storm: ['rain'] },
  update(dt, rnd) { this._t += dt || 0.016; if (this._t > 20) { this._t = 0; const opts = this.transitions[this.state] || ['clear']; const r = (rnd != null ? rnd : Math.random()); this.state = opts[(r * opts.length) | 0]; if (typeof EventBus !== 'undefined') EventBus.emit('weather:change', this.state); } return this.state; },
  set(s) { if (this.states.indexOf(s) >= 0) this.state = s; }
};
// #67 Gündüz-gece motoru
const DayNight = {
  dayLength: 300, t: 0,
  update(dt) { this.t = (this.t + (dt || 0.016)) % this.dayLength; return this.phase(); },
  phase() { const f = this.t / this.dayLength; return { f: f, light: 0.5 - 0.5 * Math.cos(f * Math.PI * 2), isNight: (f < 0.25 || f > 0.75) }; }
};
// #68 Görev betikleme DSL
const MissionDSL = {
  // {goal:'distance', target:1000, reward:{gold:500}} gibi tanımı yürüten değerlendirici
  make(def) { return { def: def, progress: 0, done: false, update(v) { this.progress = v; if (v >= def.target) this.done = true; return this.done; } }; },
  parse(str) { try { return JSON.parse(str); } catch (e) { return null; } },
  reward(def) { return (def && def.reward) || { gold: 100 }; }
};
// #69 Rastgele olay sistemi
const RandomEvents = {
  pool: [{ id: 'coin_rain', w: 3 }, { id: 'boost_gate', w: 2 }, { id: 'rockslide', w: 1 }, { id: 'fuel_drop', w: 2 }],
  roll(rnd) { const tot = this.pool.reduce(function (a, e) { return a + e.w; }, 0); let x = (rnd != null ? rnd : Math.random()) * tot; for (let i = 0; i < this.pool.length; i++) { x -= this.pool[i].w; if (x <= 0) return this.pool[i].id; } return this.pool[0].id; }
};
// #70 Dinamik müzik üreteci (katman seçimi)
const DynMusic = {
  layers: ['ambient', 'rhythm', 'lead', 'intense'],
  // yoğunluk (0..1) → aktif katmanlar
  layersFor(intensity) { const n = 1 + Math.round(_pg_clamp(intensity, 0, 1) * (this.layers.length - 1)); return this.layers.slice(0, n); }
};

const ProcGen = {
  version: '1.0',
  systems: ['InfiniteTerrain', 'Biomes', 'VehicleGen', 'MapEditor', 'BezierTrack', 'WeatherEngine', 'DayNight', 'MissionDSL', 'RandomEvents', 'DynMusic'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { InfiniteTerrain.setSeed(7); const a = InfiniteTerrain.heightAt(100); InfiniteTerrain.setSeed(7); r.infiniteterrain = InfiniteTerrain.heightAt(100) === a; } catch (e) { r.infiniteterrain = false; }
    try { r.biomes = Biomes.list.indexOf(Biomes.at(5000)) >= 0; } catch (e) { r.biomes = false; }
    try { const v = VehicleGen.generate(3); r.vehiclegen = (v.engine + v.suspension + v.tires + v.fuel) === 20; } catch (e) { r.vehiclegen = false; }
    try { const c = MapEditor.encode([{ x: 0, y: 0 }, { x: 1, y: 1 }]); r.mapeditor = MapEditor.decode(c).length === 2 && MapEditor.validate(MapEditor.decode(c)); } catch (e) { r.mapeditor = false; }
    try { const p = BezierTrack.cubic({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, 0.5); r.beziertrack = p.x === 0.5; } catch (e) { r.beziertrack = false; }
    try { WeatherEngine.set('clear'); r.weatherengine = WeatherEngine.states.indexOf(WeatherEngine.update(25, 0)) >= 0; } catch (e) { r.weatherengine = false; }
    try { DayNight.t = 0; const ph = DayNight.phase(); r.daynight = ph.isNight === true && typeof ph.light === 'number'; } catch (e) { r.daynight = false; }
    try { const m = MissionDSL.make({ goal: 'distance', target: 100, reward: { gold: 5 } }); m.update(100); r.missiondsl = m.done === true; } catch (e) { r.missiondsl = false; }
    try { r.randomevents = typeof RandomEvents.roll(0.5) === 'string'; } catch (e) { r.randomevents = false; }
    try { r.dynmusic = DynMusic.layersFor(1).length === DynMusic.layers.length && DynMusic.layersFor(0).length === 1; } catch (e) { r.dynmusic = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.InfiniteTerrain = InfiniteTerrain; window.Biomes = Biomes; window.VehicleGen = VehicleGen; window.MapEditor = MapEditor; window.BezierTrack = BezierTrack; window.WeatherEngine = WeatherEngine; window.DayNight = DayNight; window.MissionDSL = MissionDSL; window.RandomEvents = RandomEvents; window.DynMusic = DynMusic; window.ProcGen = ProcGen; }
