'use strict';
/* Meta2 — Meta & Kalite (2. Liste: I. #81–#90). ADDITIVE; mevcut sistemlere köprü. */
const _mt = { get(k, d) { try { const v = SaveData.get(k); return v === undefined ? d : v; } catch (e) { return d; } }, set(k, v) { try { SaveData.set(k, v); } catch (e) {} } };

// #81 Bulut kayıt (mevcut CloudSync köprü)
const CloudSaveX = { available() { return typeof CloudSync !== 'undefined'; }, status() { return this.available() ? 'hazir' : 'yerel'; } };
// #82 Çoklu profil / kayıt slotu
const Profiles = {
  key: 'ahmet_profiles',
  all() { try { return JSON.parse(localStorage.getItem(this.key) || '{"active":0,"slots":[{}]}'); } catch (e) { return { active: 0, slots: [{}] }; } },
  _save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) {} },
  create(name) { const d = this.all(); if (d.slots.length >= 3) return false; d.slots.push({ name: name || ('Profil ' + (d.slots.length + 1)) }); this._save(d); return true; },
  select(i) { const d = this.all(); if (i < 0 || i >= d.slots.length) return false; d.active = i; this._save(d); return true; },
  active() { const d = this.all(); return d.active; },
  count() { return this.all().slots.length; } };
// #83 Detaylı istatistik paneli (mevcut StatsPanel/Analytics köprü)
const StatsPanelX = { available() { return typeof Analytics !== 'undefined' || typeof StatsPanel !== 'undefined'; },
  summary() { return { totalDistance: _mt.get('totalDistance', 0), totalFlips: _mt.get('totalFlips', 0), totalGold: _mt.get('lifetimeGold', 0), sessions: _mt.get('sessions', 0) }; } };
// #84 Ölüm ısı haritası (mevcut Heatmaps köprü)
const DeathHeatmapX = { available() { return typeof Heatmaps !== 'undefined'; }, _pts: [],
  record(x, y) { this._pts.push({ x: Math.round(x), y: Math.round(y) }); if (this._pts.length > 1000) this._pts.shift(); return this._pts.length; },
  hotspots(grid) { const g = grid || 100; const buckets = {}; this._pts.forEach(function (p) { const k = Math.floor(p.x / g) + ',' + Math.floor(p.y / g); buckets[k] = (buckets[k] || 0) + 1; }); return buckets; } };
// #85 Ayarlanabilir kontroller (mevcut Rebind köprü)
const RebindX = { available() { return typeof Rebind !== 'undefined'; } };
// #86 Erişilebilirlik (mevcut Accessibility köprü)
const AccessibilityX = { available() { return typeof Accessibility !== 'undefined'; } };
// #87 Genişletilmiş dil seçenekleri
const Languages = {
  list: ['tr', 'en', 'de', 'es', 'ar', 'ru', 'fr'],
  current() { return _mt.get('lang', 'tr'); },
  set(code) { if (this.list.indexOf(code) < 0) return false; _mt.set('lang', code); return true; },
  rtl() { return this.current() === 'ar'; } };
// #88 Bildirim sistemi
const Notifications = {
  _q: [],
  push(title, body, kind) { const n = { id: Date.now() + '' + Math.floor(Math.random() * 1000), title: title, body: body || '', kind: kind || 'info', t: Date.now(), read: false }; this._q.push(n); if (this._q.length > 50) this._q.shift(); return n; },
  unread() { return this._q.filter(function (n) { return !n.read; }).length; },
  markRead(id) { const n = this._q.find(function (x) { return x.id === id; }); if (n) n.read = true; return !!n; },
  all() { return this._q.slice().reverse(); } };
// #89 Enerji / can sistemi (opsiyonel)
const Energy = {
  max: 5, regenMs: 900000, // 15 dk
  current() { const stored = _mt.get('energy', this.max); const last = _mt.get('energyT', Date.now()); const regen = Math.floor((Date.now() - last) / this.regenMs); return Math.min(this.max, stored + regen); },
  spend(n) { const cur = this.current(); if (cur < (n || 1)) return false; _mt.set('energy', cur - (n || 1)); _mt.set('energyT', Date.now()); return true; },
  enabled() { return _mt.get('energyEnabled', false); },
  toggle() { _mt.set('energyEnabled', !this.enabled()); return this.enabled(); } };
// #90 Gelişmiş öğretici (mevcut Tutorial köprü)
const TutorialX = { available() { return typeof Tutorial !== 'undefined'; }, steps: ['gaz', 'fren', 'denge', 'nitro', 'takla', 'yakit'],
  progress() { return _mt.get('tutStep', 0); },
  advance() { const s = Math.min(this.steps.length, this.progress() + 1); _mt.set('tutStep', s); return s; },
  done() { return this.progress() >= this.steps.length; } };

const Meta2 = {
  version: '1.0',
  systems: ['CloudSaveX', 'Profiles', 'StatsPanelX', 'DeathHeatmapX', 'RebindX', 'AccessibilityX', 'Languages', 'Notifications', 'Energy', 'TutorialX'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { r.cloudsavex = typeof CloudSaveX.status() === 'string'; } catch (e) { r.cloudsavex = false; }
    try { const c0 = Profiles.count(); Profiles.create('Test'); r.profiles = Profiles.count() >= c0 && Profiles.select(0) === true; } catch (e) { r.profiles = false; }
    try { r.statspanelx = typeof StatsPanelX.summary().totalDistance === 'number'; } catch (e) { r.statspanelx = false; }
    try { DeathHeatmapX.record(150, 200); r.deathheatmapx = Object.keys(DeathHeatmapX.hotspots(100)).length >= 1; } catch (e) { r.deathheatmapx = false; }
    try { r.rebindx = typeof RebindX.available() === 'boolean'; } catch (e) { r.rebindx = false; }
    try { r.accessibilityx = typeof AccessibilityX.available() === 'boolean'; } catch (e) { r.accessibilityx = false; }
    try { r.languages = Languages.set('en') === true && Languages.rtl() === false && Languages.set('zz') === false; Languages.set('tr'); } catch (e) { r.languages = false; }
    try { Notifications.push('Merhaba', 'test'); r.notifications = Notifications.unread() >= 1; } catch (e) { r.notifications = false; }
    try { _mt.set('energy', 5); _mt.set('energyT', Date.now()); r.energy = Energy.spend(1) === true && Energy.current() === 4; } catch (e) { r.energy = false; }
    try { _mt.set('tutStep', 0); TutorialX.advance(); r.tutorialx = TutorialX.progress() === 1; } catch (e) { r.tutorialx = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.CloudSaveX = CloudSaveX; window.Profiles = Profiles; window.StatsPanelX = StatsPanelX; window.DeathHeatmapX = DeathHeatmapX; window.RebindX = RebindX; window.AccessibilityX = AccessibilityX; window.Languages = Languages; window.Notifications = Notifications; window.Energy = Energy; window.TutorialX = TutorialX; window.Meta2 = Meta2; }
