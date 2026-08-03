'use strict';
/* Progression2 — İlerleme & Ödül (2. Liste: D. #31–#40). ADDITIVE; mevcutlara köprü. */
const _pg2 = { get(k, d) { try { const v = SaveData.get(k); return v === undefined ? d : v; } catch (e) { return d; } }, set(k, v) { try { SaveData.set(k, v); } catch (e) {} } };

// #31 Battle Pass (liveops BattlePass köprü)
const BattlePassUI = { tier() { try { return (typeof BattlePass !== 'undefined') ? BattlePass.tierFor(_pg2.get('bpXp', 0)).tier : 0; } catch (e) { return 0; } }, addXp(n) { _pg2.set('bpXp', (_pg2.get('bpXp', 0) + (n || 0))); return this.tier(); }, premium() { return _pg2.get('bpPremium', false); } };
// #32 Günlük görevler (mevcut DailyQuests köprü)
const DailyQuestsX = { available() { return typeof DailyQuests !== 'undefined'; } };
// #33 Haftalık görevler
const WeeklyQuests = {
  defs: [{ id: 'w_dist', target: 5000, reward: { gold: 2000 } }, { id: 'w_flips', target: 50, reward: { gold: 1500 } }, { id: 'w_coins', target: 1000, reward: { diamonds: 5 } }],
  week() { return Math.floor(Date.now() / (7 * 86400000)); },
  state() { const s = _pg2.get('weekly', null); if (!s || s.week !== this.week()) { const ns = { week: this.week(), prog: {} }; _pg2.set('weekly', ns); return ns; } return s; },
  progress(id, v) { const s = this.state(); s.prog[id] = v; _pg2.set('weekly', s); const d = this.defs.find(function (x) { return x.id === id; }); return d ? v >= d.target : false; } };
// #34 Genişletilmiş başarımlar
const AchievementsX = {
  extra: [{ id: 'km100', name: '100 km', target: 100000 }, { id: 'flip1000', name: '1000 Takla', target: 1000 }, { id: 'gold1m', name: 'Milyoner', target: 1000000 }],
  check(id, value) { const a = this.extra.find(function (x) { return x.id === id; }); return a ? value >= a.target : false; } };
// #35 Prestij (mevcut Prestige köprü)
const PrestigeX = { available() { return typeof Prestige !== 'undefined'; }, multiplier() { try { return 1 + (_pg2.get('prestige', 0) * 0.1); } catch (e) { return 1; } } };
// #36 Yetenek ağacı (mevcut SkillTree köprü)
const SkillTreeX = { available() { return typeof SkillTree !== 'undefined'; } };
// #37 Araç ustalık seviyeleri
const Mastery = {
  xpFor(level) { return level * level * 500; },
  levelFor(xp) { let l = 0; while (this.xpFor(l + 1) <= (xp || 0) && l < 10) l++; return l; },
  add(vehId, xp) { const m = _pg2.get('mastery', {}); m[vehId] = (m[vehId] || 0) + (xp || 0); _pg2.set('mastery', m); return this.levelFor(m[vehId]); },
  level(vehId) { const m = _pg2.get('mastery', {}); return this.levelFor(m[vehId] || 0); } };
// #38 Günlük giriş takvimi
const LoginCalendar = {
  rewards: [100, 200, 300, 500, 800, 1200, 2000],
  day() { return Math.floor(Date.now() / 86400000); },
  claim() { const last = _pg2.get('loginLast', -1); const streak = _pg2.get('loginStreak', 0); const today = this.day(); if (last === today) return { claimed: false }; const ns = (last === today - 1) ? (streak % 7) + 1 : 1; _pg2.set('loginLast', today); _pg2.set('loginStreak', ns); const gold = this.rewards[(ns - 1) % 7]; try { if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(gold); } catch (e) {} return { claimed: true, day: ns, gold: gold }; } };
// #39 Referans / davet ödülleri
const Referral = {
  code() { let c = _pg2.get('refCode', null); if (!c) { c = 'AHM' + Math.random().toString(36).slice(2, 7).toUpperCase(); _pg2.set('refCode', c); } return c; },
  redeem(code) { if (!code || code === this.code()) return { ok: false }; if (_pg2.get('refUsed', false)) return { ok: false, reason: 'used' }; _pg2.set('refUsed', true); try { if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(2000); } catch (e) {} return { ok: true, gold: 2000 }; } };
// #40 Kilometre kilometre taşı rozetleri
const Milestones = {
  marks: [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  reached(totalDistance) { return this.marks.filter(function (m) { return (totalDistance || 0) >= m; }); },
  next(totalDistance) { for (let i = 0; i < this.marks.length; i++) if ((totalDistance || 0) < this.marks[i]) return this.marks[i]; return null; } };

const Progression2 = {
  version: '1.0',
  systems: ['BattlePassUI', 'DailyQuestsX', 'WeeklyQuests', 'AchievementsX', 'PrestigeX', 'SkillTreeX', 'Mastery', 'LoginCalendar', 'Referral', 'Milestones'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { r.battlepassui = typeof BattlePassUI.tier() === 'number'; } catch (e) { r.battlepassui = false; }
    try { r.dailyquestsx = typeof DailyQuestsX.available() === 'boolean'; } catch (e) { r.dailyquestsx = false; }
    try { r.weeklyquests = WeeklyQuests.progress('w_dist', 5000) === true; } catch (e) { r.weeklyquests = false; }
    try { r.achievementsx = AchievementsX.check('km100', 100000) === true; } catch (e) { r.achievementsx = false; }
    try { r.prestigex = typeof PrestigeX.multiplier() === 'number'; } catch (e) { r.prestigex = false; }
    try { r.skilltreex = typeof SkillTreeX.available() === 'boolean'; } catch (e) { r.skilltreex = false; }
    try { const l = Mastery.add('jeep', 500); r.mastery = l >= 1 && Mastery.level('jeep') >= 1; } catch (e) { r.mastery = false; }
    try { _pg2.set('loginLast', -1); const c = LoginCalendar.claim(); r.logincalendar = c.claimed === true && c.gold > 0; } catch (e) { r.logincalendar = false; }
    try { const code = Referral.code(); r.referral = !!code && Referral.redeem('BASKA').ok === true; } catch (e) { r.referral = false; }
    try { r.milestones = Milestones.reached(6000).length >= 2 && Milestones.next(6000) === 10000; } catch (e) { r.milestones = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.BattlePassUI = BattlePassUI; window.DailyQuestsX = DailyQuestsX; window.WeeklyQuests = WeeklyQuests; window.AchievementsX = AchievementsX; window.PrestigeX = PrestigeX; window.SkillTreeX = SkillTreeX; window.Mastery = Mastery; window.LoginCalendar = LoginCalendar; window.Referral = Referral; window.Milestones = Milestones; window.Progression2 = Progression2; }
