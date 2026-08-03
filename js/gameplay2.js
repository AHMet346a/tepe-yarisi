'use strict';
/* Gameplay2 — Fizik & Oynanış (2. Liste: G. #61–#70). ADDITIVE; DrivePhysics ile uyumlu. */

// #61 Yavaş çekim takla anı (stunt cam)
const StuntCam = {
  active: false, scale: 1,
  trigger(airborne, rotating) { if (airborne && rotating && !this.active) { this.active = true; this.scale = 0.35; return true; } return false; },
  update(landed) { if (landed) { this.active = false; this.scale = 1; } return this.scale; },
  timeScale() { return this.active ? this.scale : 1; } };
// #62 Kombo puan sistemi (takla zinciri)
const Combo = {
  count: 0, timer: 0, window: 2.5, multiplier: 1,
  add(kind) { this.count++; this.timer = this.window; this.multiplier = 1 + this.count * 0.5; return { count: this.count, mult: this.multiplier }; },
  tick(dt) { if (this.timer > 0) { this.timer -= dt || 0; if (this.timer <= 0) this.reset(); } return this.count; },
  reset() { const final = this.count; this.count = 0; this.multiplier = 1; this.timer = 0; return final; },
  score(base) { return Math.round((base || 0) * this.multiplier); } };
// #63 Hasar modeli (parça kaybı)
const DamageModel = {
  parts() { return { fender: 100, bumper: 100, door: 100, spoiler: 100 }; },
  apply(state, part, dmg) { if (state[part] == null) return state; state[part] = Math.max(0, state[part] - (dmg || 0)); return state; },
  lost(state) { return Object.keys(state).filter(function (p) { return state[p] <= 0; }); },
  handling(state) { const lost = this.lost(state).length; return Math.max(0.5, 1 - lost * 0.1); } };
// #64 Yakıt istasyonları
const FuelStations = {
  refuel(current, max, atStation) { if (!atStation) return current; return max || 100; },
  consume(fuel, throttle, dt) { return Math.max(0, fuel - Math.abs(throttle || 0) * (dt || 0) * 2); },
  isEmpty(fuel) { return fuel <= 0; } };
// #65 Nitro tipleri (buz, ateş)
const NitroTypes = {
  types: { ates: { boost: 1.8, dur: 3, color: '#ff5a00' }, buz: { boost: 1.4, dur: 5, color: '#00e5ff' }, normal: { boost: 1.6, dur: 4, color: '#7cff00' } },
  get(t) { return this.types[t] || this.types.normal; },
  apply(baseSpeed, t) { return baseSpeed * this.get(t).boost; } };
// #66 Drift / çekiş kontrolü
const Drift = {
  angle: 0,
  update(steer, speed, grip) { const target = (steer || 0) * (speed || 0) * 0.01 * (2 - (grip == null ? 1 : grip)); this.angle += (target - this.angle) * 0.2; return this.angle; },
  scoreFor(angle, speed) { return Math.round(Math.abs(angle) * (speed || 0) * 0.5); } };
// #67 Hassas ağırlık kaydırma (lean)
const Lean = {
  torque: 0,
  input(dir, strength) { this.torque = (dir || 0) * (strength == null ? 1 : strength) * 3; return this.torque; },
  apply(angularVel, dt) { return (angularVel || 0) + this.torque * (dt || 0); } };
// #68 Su fiziği (yüzme/batma)
const WaterPhysics = {
  buoyancy: 0.6, drag: 0.85,
  submerged(carY, waterY, carH) { const depth = (carY + (carH || 20)) - waterY; return Math.max(0, Math.min(1, depth / (carH || 20))); },
  force(sub) { return { lift: sub * this.buoyancy, drag: 1 - sub * (1 - this.drag) }; },
  sinks(sub, sealed) { return sub >= 1 && !sealed; } };
// #69 Manyetik tekerlek power-up
const MagneticWheels = {
  active: false, timer: 0,
  activate(dur) { this.active = true; this.timer = dur || 8; return true; },
  tick(dt) { if (this.active) { this.timer -= dt || 0; if (this.timer <= 0) this.active = false; } return this.active; },
  gripBonus() { return this.active ? 2.0 : 1.0; } };
// #70 Zıplama tuşu
const JumpButton = {
  cooldown: 0, force: 380,
  canJump(onGround) { return onGround && this.cooldown <= 0; },
  jump(onGround) { if (!this.canJump(onGround)) return 0; this.cooldown = 0.8; return -this.force; },
  tick(dt) { if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - (dt || 0)); return this.cooldown; } };

const Gameplay2 = {
  version: '1.0',
  systems: ['StuntCam', 'Combo', 'DamageModel', 'FuelStations', 'NitroTypes', 'Drift', 'Lean', 'WaterPhysics', 'MagneticWheels', 'JumpButton'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { StuntCam.active = false; r.stuntcam = StuntCam.trigger(true, true) === true && StuntCam.timeScale() < 1; StuntCam.update(true); } catch (e) { r.stuntcam = false; }
    try { Combo.reset(); Combo.add('flip'); const c = Combo.add('flip'); r.combo = c.count === 2 && Combo.score(100) > 100; Combo.reset(); } catch (e) { r.combo = false; }
    try { const s = DamageModel.parts(); DamageModel.apply(s, 'door', 100); r.damagemodel = DamageModel.lost(s).indexOf('door') >= 0 && DamageModel.handling(s) < 1; } catch (e) { r.damagemodel = false; }
    try { r.fuelstations = FuelStations.refuel(10, 100, true) === 100 && FuelStations.isEmpty(0) === true; } catch (e) { r.fuelstations = false; }
    try { r.nitrotypes = NitroTypes.apply(100, 'ates') === 180 && NitroTypes.get('buz').color === '#00e5ff'; } catch (e) { r.nitrotypes = false; }
    try { Drift.angle = 0; Drift.update(1, 100, 0.5); r.drift = Drift.angle !== 0 && Drift.scoreFor(0.5, 100) > 0; } catch (e) { r.drift = false; }
    try { Lean.input(1, 1); r.lean = Lean.torque > 0 && Lean.apply(0, 1) > 0; } catch (e) { r.lean = false; }
    try { const sub = WaterPhysics.submerged(100, 90, 20); r.waterphysics = sub > 0 && WaterPhysics.sinks(1, false) === true; } catch (e) { r.waterphysics = false; }
    try { MagneticWheels.activate(8); r.magneticwheels = MagneticWheels.gripBonus() === 2 && MagneticWheels.tick(0.1) === true; MagneticWheels.active = false; } catch (e) { r.magneticwheels = false; }
    try { JumpButton.cooldown = 0; const j = JumpButton.jump(true); r.jumpbutton = j < 0 && JumpButton.canJump(true) === false; JumpButton.cooldown = 0; } catch (e) { r.jumpbutton = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.StuntCam = StuntCam; window.Combo = Combo; window.DamageModel = DamageModel; window.FuelStations = FuelStations; window.NitroTypes = NitroTypes; window.Drift = Drift; window.Lean = Lean; window.WaterPhysics = WaterPhysics; window.MagneticWheels = MagneticWheels; window.JumpButton = JumpButton; window.Gameplay2 = Gameplay2; }
