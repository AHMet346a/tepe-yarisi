'use strict';
/* AI — Yapay Zekâ Katmanı (100-özellik: D. #31–#40). ADDITIVE; bağımsız modüller. */
const _ai_clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

// #31 DDA — dinamik zorluk (mevcut DDA modülüne köprü + saf model)
const DDAx = {
  skill: 0.5,
  update(win, margin) { const d = (win ? 1 : -1) * (0.04 + _ai_clamp(margin || 0, 0, 1) * 0.06); this.skill = _ai_clamp(this.skill + d, 0, 1); return this.skill; },
  difficulty() { if (typeof DDA !== 'undefined' && DDA.getDifficulty) { try { return DDA.getDifficulty(); } catch (e) {} } return _ai_clamp(0.4 + this.skill * 0.6, 0.2, 1.2); }
};
// #32 Behavior tree — sequence/selector/action düğümleri
const BehaviorTree = {
  SUCCESS: 1, FAILURE: 0, RUNNING: 2,
  seq(children) { return function (bb) { for (let i = 0; i < children.length; i++) { const r = children[i](bb); if (r !== 1) return r; } return 1; }; },
  sel(children) { return function (bb) { for (let i = 0; i < children.length; i++) { const r = children[i](bb); if (r !== 0) return r; } return 0; }; },
  cond(fn) { return function (bb) { return fn(bb) ? 1 : 0; }; },
  act(fn) { return function (bb) { return fn(bb); }; }
};
// #33 Öğrenen hayalet — sürüş girdisini örnekleyip taklit eder
const LearningGhost = {
  _samples: [],
  learn(t, throttle, brake) { this._samples.push([Math.round(t * 100) / 100, throttle ? 1 : 0, brake ? 1 : 0]); },
  inputAt(t) { const s = this._samples; if (!s.length) return { throttle: 0, brake: 0 }; let best = s[0]; for (let i = 0; i < s.length; i++) { if (s[i][0] <= t) best = s[i]; else break; } return { throttle: best[1], brake: best[2] }; },
  reset() { this._samples = []; }
};
// #34 Rakip kişilikleri
const Personalities = {
  types: { aggressive: { risk: 0.9, brakeBias: 0.4, nitroEager: 0.9 }, cautious: { risk: 0.3, brakeBias: 0.85, nitroEager: 0.3 }, tricky: { risk: 0.6, brakeBias: 0.5, nitroEager: 0.6 } },
  get(name) { return this.types[name] || this.types.tricky; },
  pick(seed) { const k = Object.keys(this.types); const i = (typeof Rng !== 'undefined' ? Rng.stream(seed || 1)() : Math.random()) * k.length | 0; return k[i]; }
};
// #35 Slipstream/çekiş
const Slipstream = {
  // öndeki araca yakınsa (dx içinde) hız bonusu
  bonus(dx, dy, maxDx) { maxDx = maxDx || 180; if (dx <= 0 || dx > maxDx || Math.abs(dy) > 60) return 0; return (1 - dx / maxDx) * 0.18; }
};
// #36 Yol bulma — en iyi çizgi (yükseklik örneklerinden düşük-eğim tercih)
const Pathfind = {
  bestLine(heights) { // heights: [{x,y}] → hedef hız çarpanı önerisi (dik yokuşta yavaşla)
    const out = []; for (let i = 1; i < heights.length; i++) { const slope = (heights[i].y - heights[i - 1].y) / ((heights[i].x - heights[i - 1].x) || 1); out.push(_ai_clamp(1 - Math.abs(slope) * 0.6, 0.4, 1)); } return out;
  }
};
// #37 Rubber-band
const RubberBand = {
  // rakip geri kaldıysa hızlan, öndeyse yavaşla (çekişme korunur)
  speedMul(playerX, botX, strength) { strength = strength || 0.0009; return _ai_clamp(1 + (playerX - botX) * strength, 0.85, 1.18); }
};
// #38 Uyarlanabilir başabaş rakip
const EvenMatch = {
  target(playerBest, band) { band = band || 0.06; const j = (typeof Rng !== 'undefined' ? Rng.next() : Math.random()) * 2 * band - band; return playerBest * (1 + j); }
};
// #39 Kaza sonrası kurtarma AI
const CrashRecovery = {
  // devrik mi? (|angle|>~2rad) → toparlama girdisi
  recover(angle, angVel) { const upside = Math.abs(((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI) < 1.1; if (upside) return { throttle: 0, brake: 0, tilt: -Math.sign(angVel || 1) }; return { throttle: 0.6, brake: 0, tilt: 0 }; }
};
// #40 Trafik/engel AI
const TrafficAI = {
  // engel oyuncuya yakınsa dur/yavaşla; yol açıksa devam
  decide(selfX, playerX, safeGap) { safeGap = safeGap || 120; const d = Math.abs(selfX - playerX); return d < safeGap ? { move: d / safeGap, yield: true } : { move: 1, yield: false }; }
};

const AI = {
  version: '1.0',
  systems: ['DDAx', 'BehaviorTree', 'LearningGhost', 'Personalities', 'Slipstream', 'Pathfind', 'RubberBand', 'EvenMatch', 'CrashRecovery', 'TrafficAI'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { const s0 = DDAx.skill; DDAx.update(true, 0.5); r.dda = DDAx.skill > s0 && typeof DDAx.difficulty() === 'number'; } catch (e) { r.dda = false; }
    try { const t = BehaviorTree.seq([BehaviorTree.cond(function () { return true; }), BehaviorTree.act(function () { return 1; })]); r.behaviortree = t({}) === 1; } catch (e) { r.behaviortree = false; }
    try { LearningGhost.reset(); LearningGhost.learn(0, 1, 0); LearningGhost.learn(1, 0, 1); r.learningghost = LearningGhost.inputAt(1).brake === 1; } catch (e) { r.learningghost = false; }
    try { r.personalities = Personalities.get('aggressive').risk > Personalities.get('cautious').risk; } catch (e) { r.personalities = false; }
    try { r.slipstream = Slipstream.bonus(50, 0) > 0 && Slipstream.bonus(500, 0) === 0; } catch (e) { r.slipstream = false; }
    try { r.pathfind = Pathfind.bestLine([{ x: 0, y: 0 }, { x: 10, y: 0 }]).length === 1; } catch (e) { r.pathfind = false; }
    try { r.rubberband = RubberBand.speedMul(1000, 0) > 1 && RubberBand.speedMul(0, 1000) < 1; } catch (e) { r.rubberband = false; }
    try { r.evenmatch = Math.abs(EvenMatch.target(100) - 100) <= 7; } catch (e) { r.evenmatch = false; }
    try { r.crashrecovery = typeof CrashRecovery.recover(3.1, 1).tilt === 'number'; } catch (e) { r.crashrecovery = false; }
    try { r.trafficai = TrafficAI.decide(100, 150, 120).yield === true && TrafficAI.decide(0, 500, 120).yield === false; } catch (e) { r.trafficai = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.DDAx = DDAx; window.BehaviorTree = BehaviorTree; window.LearningGhost = LearningGhost; window.Personalities = Personalities; window.Slipstream = Slipstream; window.Pathfind = Pathfind; window.RubberBand = RubberBand; window.EvenMatch = EvenMatch; window.CrashRecovery = CrashRecovery; window.TrafficAI = TrafficAI; window.AI = AI; }
