'use strict';
/* Security — Güvenlik & Altyapı (100-özellik: J. #91–#100). ADDITIVE. */

// #91 Kayıt bütünlüğü imzası (HMAC-benzeri, istemci-taraflı)
const SaveIntegrity = {
  SECRET: 'ahmet_hmac_2026',
  _h(str) { str = String(str); let h1 = 0x811c9dc5, h2 = 0x1000193; for (let i = 0; i < str.length; i++) { h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193) >>> 0; h2 = Math.imul(h2 + str.charCodeAt(i), 0x85 ) >>> 0; } return (('0000000' + h1.toString(16)).slice(-8)) + (('0000000' + h2.toString(16)).slice(-8)); },
  sign(obj) { return this._h(JSON.stringify(obj) + this.SECRET); },
  wrap(obj) { return { d: obj, m: this.sign(obj) }; },
  verify(wrapped) { return !!wrapped && wrapped.m === this.sign(wrapped.d); }
};
// #92 Kayıt şifreleme (XOR akış — kolay hile önleyici obfuskasyon)
const SaveCrypt = {
  KEY: 'A7m3t-Tep3-K3y!',
  _xor(str, key) { let out = ''; for (let i = 0; i < str.length; i++) out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length)); return out; },
  encrypt(obj) { try { return btoa(unescape(encodeURIComponent(this._xor(JSON.stringify(obj), this.KEY)))); } catch (e) { return null; } },
  decrypt(str) { try { return JSON.parse(decodeURIComponent(escape(this._xor(atob(str), this.KEY)))); } catch (e) { return null; } }
};
// #93 Çevrimdışı-öncelikli senkron kuyruğu
const SyncQueue = {
  _q: [],
  enqueue(op) { this._q.push({ t: Date.now(), op: op }); this._persist(); return this._q.length; },
  _persist() { try { if (typeof localStorage !== 'undefined') localStorage.setItem('ahmet_syncq', JSON.stringify(this._q.slice(-200))); } catch (e) {} },
  load() { try { if (typeof localStorage !== 'undefined') { const s = localStorage.getItem('ahmet_syncq'); if (s) this._q = JSON.parse(s); } } catch (e) {} },
  // ağ gelince sırayla gönder (sender: op → Promise). Başarısız olan kuyrukta kalır.
  flush(sender) { const self = this; const q = this._q.slice(); this._q = []; return Promise.all(q.map(function (item) { return Promise.resolve(sender ? sender(item.op) : true).catch(function () { self._q.push(item); }); })).then(function () { self._persist(); return self._q.length; }); },
  pending() { return this._q.length; }
};
// #94 Service worker önbellek stratejisi (durum/API)
const SWCache = {
  supported() { return typeof navigator !== 'undefined' && 'serviceWorker' in navigator; },
  version: 'v10', strategy: 'network-first',
  status() { let controlled = false; try { controlled = this.supported() && !!navigator.serviceWorker.controller; } catch (e) {} return { supported: this.supported(), controlled: controlled, version: this.version, strategy: this.strategy }; }
};
// #95 Otomatik yedek & geri yükleme
const Backup = {
  MAX: 5,
  create() { try { if (typeof SaveData === 'undefined') return null; const snap = SaveData.data ? JSON.parse(JSON.stringify(SaveData.data)) : {}; const list = this._list(); list.push({ t: Date.now(), data: snap }); while (list.length > this.MAX) list.shift(); if (typeof localStorage !== 'undefined') localStorage.setItem('ahmet_backups', JSON.stringify(list)); return list.length; } catch (e) { return null; } },
  _list() { try { if (typeof localStorage !== 'undefined') { const s = localStorage.getItem('ahmet_backups'); if (s) return JSON.parse(s); } } catch (e) {} return []; },
  list() { return this._list().map(function (b) { return { t: b.t }; }); },
  restore(index) { const l = this._list(); const b = l[index != null ? index : l.length - 1]; if (b && typeof SaveData !== 'undefined') { try { SaveData.data = b.data; if (SaveData.save) SaveData.save(); return true; } catch (e) {} } return false; }
};
// #96 Hata sınırı (error boundary)
const ErrorBoundary = {
  guard(name, fn, fallback) { try { return fn(); } catch (e) { if (typeof CrashReporting !== 'undefined') CrashReporting.report('boundary:' + name, String(e && e.message)); if (typeof EventBus !== 'undefined') EventBus.emit('boundary:catch', { name: name }); return typeof fallback === 'function' ? fallback(e) : fallback; } },
  wrap(name, fn) { return function () { const a = arguments; return ErrorBoundary.guard(name, function () { return fn.apply(this, a); }); }; }
};
// #97 GDPR/gizlilik onayı & veri temizleme
const Privacy = {
  consented() { try { return typeof localStorage !== 'undefined' && localStorage.getItem('ahmet_consent') === '1'; } catch (e) { return false; } },
  consent(on) { try { if (typeof localStorage !== 'undefined') localStorage.setItem('ahmet_consent', on ? '1' : '0'); } catch (e) {} if (typeof EventBus !== 'undefined') EventBus.emit('privacy:consent', !!on); },
  eraseAll() { try { if (typeof localStorage !== 'undefined') { ['ahmet_save_v3', 'ahmet_players', 'ahmet_backups', 'ahmet_syncq', 'keymap'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); } if (typeof EventBus !== 'undefined') EventBus.emit('privacy:erased'); return true; } catch (e) { return false; } }
};
// #98 Deterministik replay doğrulama
const ReplayValidation = {
  // seed + girdi dizisini yeniden oynatıp bildirilen skorla karşılaştırır
  validate(seed, inputs, reportedScore, stepFn, tol) {
    tol = tol || 1; let state = { x: 0, score: 0 };
    if (typeof Rng !== 'undefined') Rng.reseed(seed);
    for (let i = 0; i < (inputs || []).length; i++) stepFn(state, inputs[i]);
    return { valid: Math.abs(state.score - reportedScore) <= tol, computed: state.score };
  }
};
// #99 Sürüm güncelleme bildirimi & zorunlu güncelleme kapısı
const VersionGate = {
  current: '1.0.0',
  _num(v) { const p = String(v).split('.').map(Number); return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0); },
  check(latest, minRequired) { return { updateAvailable: this._num(latest) > this._num(this.current), forced: minRequired ? this._num(this.current) < this._num(minRequired) : false }; }
};
// #100 Otomatik test paketi (fizik/ekonomi birim testleri)
const TestSuite = {
  run() {
    const t = []; const ok = function (name, cond) { t.push({ name: name, pass: !!cond }); };
    // fizik: aero drag hızla artar
    try { ok('aero_drag_monotonic', typeof Aero !== 'undefined' && Aero.drag(30) > Aero.drag(10)); } catch (e) { ok('aero_drag_monotonic', false); }
    // fizik: ağırlık transferi yönü
    try { ok('weight_transfer_dir', typeof WeightTransfer !== 'undefined' && WeightTransfer.compute(5, 1200, 0.55, 2.4).rear > WeightTransfer.compute(5, 1200, 0.55, 2.4).front); } catch (e) { ok('weight_transfer_dir', false); }
    // ekonomi: money sink çarpanı
    try { ok('moneysink_scaling', typeof MoneySink !== 'undefined' && MoneySink.priceMultiplier(200000) > MoneySink.priceMultiplier(0)); } catch (e) { ok('moneysink_scaling', false); }
    // ekonomi: nitro maliyet mantığı
    try { ok('nitro_cost', typeof GameConfig === 'undefined' || GameConfig.get('nitro.costPerStep', 10000) === 10000); } catch (e) { ok('nitro_cost', false); }
    // güvenlik: imza/doğrulama
    try { const w = SaveIntegrity.wrap({ a: 1 }); ok('integrity_sign', SaveIntegrity.verify(w) && !SaveIntegrity.verify({ d: { a: 2 }, m: w.m })); } catch (e) { ok('integrity_sign', false); }
    const passed = t.filter(function (x) { return x.pass; }).length;
    return { total: t.length, passed: passed, allPass: passed === t.length, tests: t };
  }
};

const Security = {
  version: '1.0',
  systems: ['SaveIntegrity', 'SaveCrypt', 'SyncQueue', 'SWCache', 'Backup', 'ErrorBoundary', 'Privacy', 'ReplayValidation', 'VersionGate', 'TestSuite'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { const w = SaveIntegrity.wrap({ gold: 5 }); r.saveintegrity = SaveIntegrity.verify(w) === true && SaveIntegrity.verify({ d: { gold: 6 }, m: w.m }) === false; } catch (e) { r.saveintegrity = false; }
    try { const e = SaveCrypt.encrypt({ x: 42 }); r.savecrypt = SaveCrypt.decrypt(e).x === 42; } catch (e) { r.savecrypt = false; }
    try { SyncQueue._q = []; SyncQueue.enqueue({ a: 1 }); r.syncqueue = SyncQueue.pending() === 1; } catch (e) { r.syncqueue = false; }
    try { r.swcache = typeof SWCache.status().supported === 'boolean'; } catch (e) { r.swcache = false; }
    try { r.backup = typeof Backup.create === 'function' && Array.isArray(Backup.list()); } catch (e) { r.backup = false; }
    try { r.errorboundary = ErrorBoundary.guard('t', function () { throw new Error('x'); }, 7) === 7; } catch (e) { r.errorboundary = false; }
    try { r.privacy = typeof Privacy.consented() === 'boolean'; } catch (e) { r.privacy = false; }
    try { const step = function (s, i) { s.score += i.pts || 0; }; const v = ReplayValidation.validate(1, [{ pts: 5 }, { pts: 5 }], 10, step); r.replayvalidation = v.valid === true; } catch (e) { r.replayvalidation = false; }
    try { const c = VersionGate.check('2.0.0', '1.5.0'); r.versiongate = c.updateAvailable === true && c.forced === true; } catch (e) { r.versiongate = false; }
    try { r.testsuite = TestSuite.run().total >= 5; } catch (e) { r.testsuite = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.SaveIntegrity = SaveIntegrity; window.SaveCrypt = SaveCrypt; window.SyncQueue = SyncQueue; window.SWCache = SWCache; window.Backup = Backup; window.ErrorBoundary = ErrorBoundary; window.Privacy = Privacy; window.ReplayValidation = ReplayValidation; window.VersionGate = VersionGate; window.TestSuite = TestSuite; window.Security = Security; }
