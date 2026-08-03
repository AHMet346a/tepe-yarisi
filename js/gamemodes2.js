'use strict';
/* GameModes2 — Yeni Oyun Modları (2. Liste: B. #11–#20). ADDITIVE; mod mantığı/konfig. */

// #11 Zamana karşı yarış + kendi hayaletin
const TimeTrial = {
  best: {}, // mapId -> {time, ghost}
  start(mapId) { this._map = mapId; this._t = 0; this._rec = []; return true; },
  tick(dt, x, y) { this._t += dt || 0; if (this._rec) this._rec.push([Math.round(this._t * 100) / 100, Math.round(x || 0), Math.round(y || 0)]); },
  finish() { const b = this.best[this._map]; if (!b || this._t < b.time) { this.best[this._map] = { time: this._t, ghost: this._rec }; return { pb: true, time: this._t }; } return { pb: false, time: this._t }; },
  ghostAt(mapId, t) { const b = this.best[mapId]; if (typeof AsyncGhost !== 'undefined' && b) return AsyncGhost.posAt(b.ghost, t); return null; }
};
// #12 Zombi/çığ kaçış — arkadan gelen tehlike
const ChaseMode = {
  gap: 400, speed: 0, accel: 8,
  reset() { this.gap = 400; this.speed = 0; },
  // dt, oyuncu hızı → tehlike oyuncuya göre konumu; yakalarsa caught=true
  update(dt, playerSpeed) { this.speed += (this.accel) * (dt || 0); const closing = (this.speed - (playerSpeed || 0)) * (dt || 0); this.gap -= closing; if (this.gap < 0) this.gap = 0; return { gap: this.gap, caught: this.gap <= 0 }; }
};
// #13 Denge/kargo taşıma
const CargoMode = {
  maxTilt: 0.9, // rad; aşılırsa kargo düşer
  check(angle, load) { const over = Math.abs(angle) > this.maxTilt; return { dropped: over, stability: Math.max(0, 1 - Math.abs(angle) / this.maxTilt), penalty: over ? (load || 1) * 0.5 : 0 }; }
};
// #14 Boss savaşı (dev araç)
const BossBattle = {
  make(hp) { return { hp: hp || 100, maxHp: hp || 100, phase: 1, hit(d) { this.hp = Math.max(0, this.hp - (d || 0)); if (this.hp < this.maxHp * 0.33) this.phase = 3; else if (this.hp < this.maxHp * 0.66) this.phase = 2; return this.hp <= 0; } }; }
};
// #15 Sonsuz hayatta kalma (giderek zorlaşan)
const Survival = {
  difficultyAt(t) { return 1 + Math.floor((t || 0) / 30) * 0.15; },          // her 30sn %15 zor
  rewardAt(distance) { return Math.floor((distance || 0) / 100) * 5; }
};
// #16 Ters dünya modu
const ReverseWorld = { active: false, gravityMul() { return this.active ? -1 : 1; }, flipInput(inp) { return this.active ? { throttle: inp.brake, brake: inp.throttle } : inp; } };
// #17 Sadece far ışığı gece modu
const HeadlightNight = { active: false, visionRadius: 260, ambient() { return this.active ? 0.06 : 1; } };
// #18 Sisli görüş modu
const FogMode = { active: false, density: 0.6, visibility() { return this.active ? Math.round(500 * (1 - this.density)) : 100000; } };
// #19 Düşük yerçekimi ay modu
const MoonMode = { active: false, gravityMul() { return this.active ? 0.38 : 1; }, jumpMul() { return this.active ? 1.8 : 1; } };
// #20 Bulmaca modu
const PuzzleMode = {
  // adımlar dizisi doğru sırada tamamlandı mı?
  make(steps) { return { steps: steps || [], done: [], do(id) { if (this.steps[this.done.length] === id) { this.done.push(id); return { ok: true, complete: this.done.length === this.steps.length }; } return { ok: false, complete: false }; } }; }
};

const GameModes2 = {
  version: '1.0',
  systems: ['TimeTrial', 'ChaseMode', 'CargoMode', 'BossBattle', 'Survival', 'ReverseWorld', 'HeadlightNight', 'FogMode', 'MoonMode', 'PuzzleMode'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { TimeTrial.start('m'); TimeTrial.tick(1, 10, 0); const f = TimeTrial.finish(); r.timetrial = f.pb === true; } catch (e) { r.timetrial = false; }
    try { ChaseMode.reset(); const u = ChaseMode.update(1, 0); r.chasemode = u.gap < 400; } catch (e) { r.chasemode = false; }
    try { r.cargomode = CargoMode.check(1.2, 1).dropped === true && CargoMode.check(0, 1).dropped === false; } catch (e) { r.cargomode = false; }
    try { const b = BossBattle.make(100); const dead = b.hit(100); r.bossbattle = dead === true && b.hp === 0; } catch (e) { r.bossbattle = false; }
    try { r.survival = Survival.difficultyAt(60) > Survival.difficultyAt(0); } catch (e) { r.survival = false; }
    try { ReverseWorld.active = true; r.reverseworld = ReverseWorld.gravityMul() === -1 && ReverseWorld.flipInput({ throttle: 1, brake: 0 }).throttle === 0; ReverseWorld.active = false; } catch (e) { r.reverseworld = false; }
    try { HeadlightNight.active = true; r.headlightnight = HeadlightNight.ambient() < 1; HeadlightNight.active = false; } catch (e) { r.headlightnight = false; }
    try { FogMode.active = true; r.fogmode = FogMode.visibility() < 100000; FogMode.active = false; } catch (e) { r.fogmode = false; }
    try { MoonMode.active = true; r.moonmode = MoonMode.gravityMul() < 1 && MoonMode.jumpMul() > 1; MoonMode.active = false; } catch (e) { r.moonmode = false; }
    try { const p = PuzzleMode.make(['a', 'b']); p.do('a'); const c = p.do('b'); r.puzzlemode = c.complete === true; } catch (e) { r.puzzlemode = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.TimeTrial = TimeTrial; window.ChaseMode = ChaseMode; window.CargoMode = CargoMode; window.BossBattle = BossBattle; window.Survival = Survival; window.ReverseWorld = ReverseWorld; window.HeadlightNight = HeadlightNight; window.FogMode = FogMode; window.MoonMode = MoonMode; window.PuzzleMode = PuzzleMode; window.GameModes2 = GameModes2; }
