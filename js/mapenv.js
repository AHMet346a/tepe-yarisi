'use strict';
/* MapEnv — Harita & Çevre (2. Liste: F. #51–#60). ADDITIVE; ProcGen/Weather/DayNight köprü. */

// #51 Harita editörü (mevcut MapEditor köprü)
const MapEditorX = { available() { return typeof MapEditor !== 'undefined'; } };
// #52 Prosedürel sonsuz harita (mevcut InfiniteTerrain köprü)
const InfiniteTerrainX = { available() { return typeof InfiniteTerrain !== 'undefined'; } };
// #53 Mevsim sistemi
const Seasons = {
  list: ['ilkbahar', 'yaz', 'sonbahar', 'kis'],
  current() { const m = new Date().getMonth(); return this.list[Math.floor(((m + 1) % 12) / 3)]; },
  props(s) { s = s || this.current(); return ({
    ilkbahar: { grip: 1.0, tint: '#7ec850', snow: 0 },
    yaz: { grip: 1.05, tint: '#9acd32', snow: 0 },
    sonbahar: { grip: 0.92, tint: '#c8862f', snow: 0 },
    kis: { grip: 0.7, tint: '#e8f0f5', snow: 1 } })[s]; } };
// #54 Gündüz/gece döngüsü (mevcut DayNight köprü)
const DayNightX = { available() { return typeof DayNight !== 'undefined'; }, phaseNow() { try { return (typeof DayNight !== 'undefined' && DayNight.phase) ? DayNight.phase((Date.now() / 60000) % 24) : 'gunduz'; } catch (e) { return 'gunduz'; } } };
// #55 Fiziksel hava durumu (mevcut WeatherEngine köprü)
const WeatherX = { available() { return typeof WeatherEngine !== 'undefined'; } };
// #56 Yıkılabilir engeller / köprüler
const Destructible = {
  make(hp) { return { hp: hp || 30, broken: false, hit(d) { if (this.broken) return true; this.hp -= d || 0; if (this.hp <= 0) { this.broken = true; } return this.broken; } }; },
  impactDamage(speed, mass) { return Math.round((speed || 0) * (mass || 1) * 0.05); } };
// #57 Sıçrama rampaları + halkalar
const Ramps = {
  launch(speed, angleDeg) { const a = (angleDeg || 30) * Math.PI / 180; return { vx: (speed || 0) * Math.cos(a), vy: -(speed || 0) * Math.sin(a) }; },
  ringPass(carX, carY, ring) { const dx = carX - ring.x, dy = carY - ring.y; return Math.sqrt(dx * dx + dy * dy) <= (ring.r || 40); } };
// #58 Gizli yollar + hazine
const Treasure = {
  _found: {},
  spot(mapId, x, y, reward) { return { mapId: mapId, x: x, y: y, reward: reward || 500, id: mapId + ':' + Math.round(x) + ':' + Math.round(y) }; },
  collect(spot) { if (this._found[spot.id]) return { ok: false, reason: 'collected' }; this._found[spot.id] = true; try { if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(spot.reward); } catch (e) {} return { ok: true, reward: spot.reward }; },
  isFound(id) { return !!this._found[id]; } };
// #59 Kontrol noktası kaydetme
const Checkpoints = {
  _cp: null,
  save(x, y, fuel) { this._cp = { x: x, y: y, fuel: fuel == null ? 100 : fuel, t: Date.now() }; return true; },
  restore() { return this._cp; },
  clear() { this._cp = null; },
  has() { return this._cp !== null; } };
// #60 İnteraktif çevre (hayvanlar, sallanan ağaçlar)
const InteractiveEnv = {
  swayAt(t, phase) { return Math.sin((t || 0) * 1.5 + (phase || 0)) * 0.12; }, // ağaç sallanma rad
  animals: ['kus', 'tavsan', 'kelebek', 'kopek'],
  spawn(t) { return { type: this.animals[Math.floor((Math.abs(Math.sin(t || 0)) * this.animals.length)) % this.animals.length], flee: false }; },
  react(animal, carDist) { animal.flee = carDist < 120; return animal.flee; } };

const MapEnv = {
  version: '1.0',
  systems: ['MapEditorX', 'InfiniteTerrainX', 'Seasons', 'DayNightX', 'WeatherX', 'Destructible', 'Ramps', 'Treasure', 'Checkpoints', 'InteractiveEnv'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { r.mapeditorx = typeof MapEditorX.available() === 'boolean'; } catch (e) { r.mapeditorx = false; }
    try { r.infiniteterrainx = typeof InfiniteTerrainX.available() === 'boolean'; } catch (e) { r.infiniteterrainx = false; }
    try { r.seasons = Seasons.list.indexOf(Seasons.current()) >= 0 && Seasons.props('kis').snow === 1; } catch (e) { r.seasons = false; }
    try { r.daynightx = typeof DayNightX.available() === 'boolean'; } catch (e) { r.daynightx = false; }
    try { r.weatherx = typeof WeatherX.available() === 'boolean'; } catch (e) { r.weatherx = false; }
    try { const d = Destructible.make(20); r.destructible = d.hit(10) === false && d.hit(20) === true; } catch (e) { r.destructible = false; }
    try { const l = Ramps.launch(100, 45); r.ramps = l.vy < 0 && Ramps.ringPass(0, 0, { x: 10, y: 10, r: 40 }) === true; } catch (e) { r.ramps = false; }
    try { const sp = Treasure.spot('m', 100, 0, 500); r.treasure = Treasure.collect(sp).ok === true && Treasure.collect(sp).ok === false; } catch (e) { r.treasure = false; }
    try { Checkpoints.save(50, 10, 80); r.checkpoints = Checkpoints.has() === true && Checkpoints.restore().fuel === 80; Checkpoints.clear(); } catch (e) { r.checkpoints = false; }
    try { const a = InteractiveEnv.spawn(1); r.interactiveenv = typeof InteractiveEnv.swayAt(1, 0) === 'number' && InteractiveEnv.react(a, 50) === true; } catch (e) { r.interactiveenv = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.MapEditorX = MapEditorX; window.InfiniteTerrainX = InfiniteTerrainX; window.Seasons = Seasons; window.DayNightX = DayNightX; window.WeatherX = WeatherX; window.Destructible = Destructible; window.Ramps = Ramps; window.Treasure = Treasure; window.Checkpoints = Checkpoints; window.InteractiveEnv = InteractiveEnv; window.MapEnv = MapEnv; }
