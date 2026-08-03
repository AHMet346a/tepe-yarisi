'use strict';
/* Analytics — Veri & Analitik (100-özellik: H. #71–#80). ADDITIVE; yerel çalışır. */

// #71 Olay telemetrisi
const EventTelemetry = {
  _log: [], MAX: 500,
  event(name, data) { this._log.push({ t: Date.now(), name: name, data: data || null }); if (this._log.length > this.MAX) this._log.shift(); if (typeof Telemetry !== 'undefined' && Telemetry.event) { try { Telemetry.event(name); } catch (e) {} } if (typeof EventBus !== 'undefined') EventBus.emit('telemetry:event', { name: name, data: data }); },
  count(name) { return this._log.filter(function (e) { return e.name === name; }).length; },
  recent(n) { return this._log.slice(-(n || 20)); }
};
// #72 Isı haritaları
const Heatmaps = {
  _cells: Object.create(null), cell: 100,
  add(kind, x, y) { const k = kind + ':' + Math.round(x / this.cell) + ',' + Math.round((y || 0) / this.cell); this._cells[k] = (this._cells[k] || 0) + 1; },
  hot(kind, topN) { const arr = []; for (const k in this._cells) { if (k.indexOf(kind + ':') === 0) arr.push({ cell: k, n: this._cells[k] }); } arr.sort(function (a, b) { return b.n - a.n; }); return arr.slice(0, topN || 5); }
};
// #73 Huni analizi
const Funnel = {
  steps: ['app_open', 'menu', 'map_select', 'run_start', 'run_finish'], _hits: Object.create(null),
  hit(step) { this._hits[step] = (this._hits[step] || 0) + 1; },
  rates() { const out = []; let prev = null; for (let i = 0; i < this.steps.length; i++) { const s = this.steps[i], n = this._hits[s] || 0; out.push({ step: s, count: n, rate: (prev == null || prev === 0) ? 1 : n / prev }); prev = n; } return out; }
};
// #74 Çökme raporlama
const CrashReporting = {
  _crashes: [],
  install() { if (this._installed || typeof window === 'undefined') return; this._installed = true; const self = this; window.addEventListener('error', function (e) { self.report(e.message, (e.filename || '') + ':' + e.lineno); }); window.addEventListener('unhandledrejection', function (e) { self.report('promise', String(e.reason)); }); },
  report(msg, where) { this._crashes.push({ t: Date.now(), msg: String(msg).slice(0, 200), where: where || '' }); if (this._crashes.length > 50) this._crashes.shift(); if (typeof EventBus !== 'undefined') EventBus.emit('crash', { msg: msg, where: where }); },
  all() { return this._crashes.slice(); }
};
// #75 Oturum tekrar verisi
const SessionReplay = {
  _events: [], t0: 0,
  start() { this.t0 = Date.now(); this._events = []; },
  rec(type, data) { this._events.push([Date.now() - this.t0, type, data]); if (this._events.length > 2000) this._events.shift(); },
  export() { return { start: this.t0, events: this._events }; }
};
// #76 Tutundurma kohort (D1/D7/D30)
const Retention = {
  // installDay ve activeDays[] (gün indeksleri) → retention bayrakları
  compute(installEpochDay, activeDays) { const d = function (n) { return (activeDays || []).indexOf(installEpochDay + n) >= 0; }; return { d1: d(1), d7: d(7), d30: d(30) }; },
  today() { return Math.floor(Date.now() / 86400000); }
};
// #77 Denge analitiği
const BalanceAnalytics = {
  _use: Object.create(null),
  record(vehicle, map, win, distance) { const k = vehicle + '@' + map; const s = this._use[k] || (this._use[k] = { runs: 0, wins: 0, dist: 0 }); s.runs++; if (win) s.wins++; s.dist += distance || 0; },
  // en güçlü (win-rate) kombinasyon
  strongest() { let best = null; for (const k in this._use) { const s = this._use[k]; const wr = s.runs ? s.wins / s.runs : 0; if (!best || wr > best.winRate) best = { key: k, winRate: wr, runs: s.runs }; } return best; }
};
// #78 KPI panosu (veri)
const KPIDashboard = {
  snapshot() {
    let fps = 60; try { if (typeof Telemetry !== 'undefined' && Telemetry.getStats) fps = Telemetry.getStats().fps; } catch (e) {}
    let gold = 0, games = 0; try { if (typeof SaveData !== 'undefined') { gold = SaveData.get('gold') || 0; games = SaveData.get('gamesPlayed') || 0; } } catch (e) {}
    return { fps: Math.round(fps), gold: gold, games: games, crashes: (typeof CrashReporting !== 'undefined' ? CrashReporting.all().length : 0), events: (typeof EventTelemetry !== 'undefined' ? EventTelemetry._log.length : 0) };
  }
};
// #79 Ekonomi akış izleme
const EconomyFlow = {
  _in: 0, _out: 0,
  earn(n) { this._in += n || 0; }, spend(n) { this._out += n || 0; },
  balance() { return this._in - this._out; }, ratio() { return this._out ? this._in / this._out : Infinity; },
  healthy() { const r = this.ratio(); return r >= 0.8 && r <= 1.4; }   // giriş/çıkış dengeli mi
};
// #80 Performans profil toplama (cihaz FPS dağılımı)
const PerfProfile = {
  _buckets: { '<30': 0, '30-45': 0, '45-55': 0, '55+': 0 }, _n: 0,
  sample(fps) { this._n++; if (fps < 30) this._buckets['<30']++; else if (fps < 45) this._buckets['30-45']++; else if (fps < 55) this._buckets['45-55']++; else this._buckets['55+']++; },
  distribution() { const out = {}; for (const k in this._buckets) out[k] = this._n ? this._buckets[k] / this._n : 0; return out; }
};

const Analytics = {
  version: '1.0',
  systems: ['EventTelemetry', 'Heatmaps', 'Funnel', 'CrashReporting', 'SessionReplay', 'Retention', 'BalanceAnalytics', 'KPIDashboard', 'EconomyFlow', 'PerfProfile'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { EventTelemetry.event('t'); r.eventtelemetry = EventTelemetry.count('t') >= 1; } catch (e) { r.eventtelemetry = false; }
    try { Heatmaps.add('death', 100, 0); Heatmaps.add('death', 100, 0); r.heatmaps = Heatmaps.hot('death', 1)[0].n === 2; } catch (e) { r.heatmaps = false; }
    try { Funnel._hits = {}; Funnel.hit('app_open'); Funnel.hit('menu'); r.funnel = Funnel.rates().length === Funnel.steps.length; } catch (e) { r.funnel = false; }
    try { CrashReporting.report('x', 'y'); r.crashreporting = CrashReporting.all().length >= 1; } catch (e) { r.crashreporting = false; }
    try { SessionReplay.start(); SessionReplay.rec('tap', {}); r.sessionreplay = SessionReplay.export().events.length === 1; } catch (e) { r.sessionreplay = false; }
    try { const ret = Retention.compute(0, [0, 1, 7]); r.retention = ret.d1 === true && ret.d7 === true && ret.d30 === false; } catch (e) { r.retention = false; }
    try { BalanceAnalytics.record('jeep', 'x', true, 100); r.balanceanalytics = BalanceAnalytics.strongest().winRate === 1; } catch (e) { r.balanceanalytics = false; }
    try { r.kpidashboard = typeof KPIDashboard.snapshot().fps === 'number'; } catch (e) { r.kpidashboard = false; }
    try { EconomyFlow._in = 0; EconomyFlow._out = 0; EconomyFlow.earn(100); EconomyFlow.spend(90); r.economyflow = EconomyFlow.balance() === 10 && EconomyFlow.healthy() === true; } catch (e) { r.economyflow = false; }
    try { PerfProfile._n = 0; PerfProfile.sample(60); r.perfprofile = PerfProfile.distribution()['55+'] === 1; } catch (e) { r.perfprofile = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.EventTelemetry = EventTelemetry; window.Heatmaps = Heatmaps; window.Funnel = Funnel; window.CrashReporting = CrashReporting; window.SessionReplay = SessionReplay; window.Retention = Retention; window.BalanceAnalytics = BalanceAnalytics; window.KPIDashboard = KPIDashboard; window.EconomyFlow = EconomyFlow; window.PerfProfile = PerfProfile; window.Analytics = Analytics; }
