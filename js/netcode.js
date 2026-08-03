'use strict';
/* ============================================================================
   Netcode — Ağ / Multiplayer Katmanı  (100-özellik: E. #41–#50)
   ADDITIVE ve dayanıklı; mevcut multiplayer/ghost sistemini bozmaz. Her sistem
   bağımsız, saf modül olarak window'a açılır. Firebase gerektirmez (yerel çalışır).

     #41 ClientPrediction — istemci-taraflı tahmin + reconciliation (gecikme hissi biter)
     #42 LagCompensation  — gecikme telafisi (geçmişe sar, isabet doğrula)
     #43 Rollback         — anlık-görüntü + geri-sar + yeniden-simüle (rollback netcode)
     #44 GhostValidation  — yetkili hayalet/skor doğrulama (imkânsız skoru eler)
     #45 Matchmaking      — ELO/MMR + eşleşme kalitesi
     #46 Checksum         — anti-hile sağlama toplamı (kayıt/skor kurcalanamaz)
     #47 Spectator        — izleyici aktarımı (gecikmeli akış tamponu)
     #48 AsyncGhost       — asenkron hayalet yarışı (arkadaşın kaydına karşı)
     #49 CloudSync        — cihazlar arası senkron birleştirme (telefon↔PC)
     #50 RegionPing       — bölge seçimi + ping ölçümü
   ============================================================================ */

// ─────────────────────────────────────────────────────────────────────────────
// #41 ClientPrediction — istemci-taraflı tahmin + reconciliation
//   Girdiyi hemen uygular (tahmin), sunucu durumu gelince farkı düzeltir.
// ─────────────────────────────────────────────────────────────────────────────
const ClientPrediction = {
  _pending: [],        // {seq, input, dt}
  _seq: 0,
  predict(state, input, dt, stepFn) {
    const seq = ++this._seq;
    this._pending.push({ seq: seq, input: input, dt: dt });
    stepFn(state, input, dt);
    return seq;
  },
  // Sunucu ackSeq'e kadarki tahminleri onaylar; kalanları AUTHORITATIVE durum üstünde
  // yeniden oynatır (reconciliation) → görünür sıçrama olmaz.
  reconcile(serverState, ackSeq, stepFn) {
    this._pending = this._pending.filter(function (p) { return p.seq > ackSeq; });
    const state = Object.assign({}, serverState);
    for (let i = 0; i < this._pending.length; i++) { const p = this._pending[i]; stepFn(state, p.input, p.dt); }
    return state;
  },
  pending() { return this._pending.length; },
  reset() { this._pending = []; this._seq = 0; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #42 LagCompensation — gecikme telafisi
//   Oyuncu durum geçmişini tutar; bir olayı, olayın yaşandığı GEÇMİŞ ana sararak
//   doğrular (isabet/çarpışma). İki komşu snapshot arası interpolasyon.
// ─────────────────────────────────────────────────────────────────────────────
const LagCompensation = {
  _hist: [],  // {t, state}
  MAX: 128,
  record(t, state) { this._hist.push({ t: t, state: state }); if (this._hist.length > this.MAX) this._hist.shift(); },
  // verilen zaman için (geçmişte) interpolasyonlu durum
  at(t) {
    const h = this._hist; if (!h.length) return null;
    if (t <= h[0].t) return h[0].state;
    if (t >= h[h.length - 1].t) return h[h.length - 1].state;
    for (let i = 1; i < h.length; i++) {
      if (h[i].t >= t) {
        const a = h[i - 1], b = h[i], f = (t - a.t) / ((b.t - a.t) || 1);
        return this._lerp(a.state, b.state, f);
      }
    }
    return h[h.length - 1].state;
  },
  _lerp(a, b, f) { const o = {}; for (const k in a) { o[k] = (typeof a[k] === 'number' && typeof b[k] === 'number') ? a[k] + (b[k] - a[k]) * f : a[k]; } return o; },
  reset() { this._hist = []; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #43 Rollback — anlık-görüntü + geri-sar + yeniden-simüle
//   Geç gelen girdi bulununca, o kareye geri sarar ve deterministik olarak
//   yeniden simüle eder (dövüş-oyunu kalitesi). Rng (deterministik) ile birlikte.
// ─────────────────────────────────────────────────────────────────────────────
const Rollback = {
  _frames: [],  // {frame, state, inputs}
  MAX: 60,
  save(frame, state, inputs) { this._frames.push({ frame: frame, state: this._clone(state), inputs: inputs || {} }); if (this._frames.length > this.MAX) this._frames.shift(); },
  _clone(s) { try { return JSON.parse(JSON.stringify(s)); } catch (e) { return Object.assign({}, s); } },
  // toFrame'e geri sar, yeni girdilerle stepFn(state, inputs) çağırarak şimdiye kadar yeniden-simüle
  resimulate(toFrame, newInputs, curFrame, stepFn) {
    let base = null;
    for (let i = this._frames.length - 1; i >= 0; i--) { if (this._frames[i].frame <= toFrame) { base = this._frames[i]; break; } }
    if (!base) return null;
    let state = this._clone(base.state);
    this._frames = this._frames.filter(function (f) { return f.frame < base.frame; });
    for (let f = base.frame; f <= curFrame; f++) {
      const inputs = (newInputs && newInputs[f]) || {};
      stepFn(state, inputs, f);
      this.save(f, state, inputs);
    }
    return state;
  },
  reset() { this._frames = []; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #44 GhostValidation — yetkili hayalet/skor doğrulama (anti-cheat)
//   Kayıt hızları/ivmeleri fiziksel sınırların üstündeyse skoru geçersiz sayar.
// ─────────────────────────────────────────────────────────────────────────────
const GhostValidation = {
  MAX_SPEED: 120,    // m/s makul üst sınır
  MAX_ACCEL: 260,    // m/s² makul üst sınır
  // samples: [{t, x, v}] → {valid, reason}
  validate(samples, maxDistance) {
    if (!samples || samples.length < 2) return { valid: true, reason: 'insufficient' };
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i], dt = (b.t - a.t) || 1e-3;
      const v = Math.abs((b.x - a.x) / dt);
      if (v > this.MAX_SPEED) return { valid: false, reason: 'speed:' + v.toFixed(0) };
      if (a.v != null && b.v != null) { const acc = Math.abs((b.v - a.v) / dt); if (acc > this.MAX_ACCEL) return { valid: false, reason: 'accel:' + acc.toFixed(0) }; }
    }
    if (maxDistance != null) { const span = Math.abs(samples[samples.length - 1].x - samples[0].x); if (span > maxDistance * 1.02) return { valid: false, reason: 'distance' }; }
    return { valid: true, reason: 'ok' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #45 Matchmaking — ELO/MMR + eşleşme kalitesi
// ─────────────────────────────────────────────────────────────────────────────
const Matchmaking = {
  K: 32,
  expected(rA, rB) { return 1 / (1 + Math.pow(10, (rB - rA) / 400)); },
  // scoreA: 1 kazandı, 0 kaybetti, 0.5 berabere
  update(rA, rB, scoreA) { const eA = this.expected(rA, rB); return { a: Math.round(rA + this.K * (scoreA - eA)), b: Math.round(rB + this.K * ((1 - scoreA) - (1 - eA))) }; },
  // 0..1 eşleşme kalitesi (rating farkı küçükse yüksek)
  quality(rA, rB) { return _nc_clamp(1 - Math.abs(rA - rB) / 800, 0, 1); }
};
function _nc_clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

// ─────────────────────────────────────────────────────────────────────────────
// #46 Checksum — anti-hile sağlama toplamı (FNV-1a) + imzalı sarma
//   Kayıt/skor verisine gizli tuzla checksum ekler; okurken doğrular → kurcalama
//   tespit edilir. (Kriptografik değil; istemci-taraflı basit bütünlük.)
// ─────────────────────────────────────────────────────────────────────────────
const Checksum = {
  SALT: 'ahmet_tepe_2026',
  hash(str) {
    str = String(str) + this.SALT;
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  },
  sign(obj) { const s = JSON.stringify(obj); return { data: obj, sig: this.hash(s) }; },
  verify(signed) { if (!signed || signed.sig == null) return false; return this.hash(JSON.stringify(signed.data)) === signed.sig; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #47 Spectator — izleyici aktarımı (gecikmeli akış tamponu)
//   Durum kareleri tamponlanır; izleyici sabit gecikmeyle akıcı izler (jitter yok).
// ─────────────────────────────────────────────────────────────────────────────
const Spectator = {
  _buf: [], delayMs: 900,
  push(t, frame) { this._buf.push({ t: t, frame: frame }); const cut = t - this.delayMs * 2; while (this._buf.length && this._buf[0].t < cut) this._buf.shift(); },
  // now zamanında gösterilecek kare (delayMs gecikmeli)
  frameAt(now) { const target = now - this.delayMs; let best = null; for (let i = 0; i < this._buf.length; i++) { if (this._buf[i].t <= target) best = this._buf[i].frame; else break; } return best; },
  buffered() { return this._buf.length; }, reset() { this._buf = []; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #48 AsyncGhost — asenkron hayalet yarışı
//   Bir koşunun (x,t) örneklerini sıkıştırıp saklar; sonra o hayaleti belirli
//   zamanda konumlandırarak "arkadaşına karşı" yarış sağlar. (replay.js ile uyumlu.)
// ─────────────────────────────────────────────────────────────────────────────
const AsyncGhost = {
  record(samples, everyN) { everyN = everyN || 2; const out = []; for (let i = 0; i < samples.length; i += everyN) out.push([Math.round(samples[i].t * 100) / 100, Math.round(samples[i].x), Math.round(samples[i].y || 0)]); return out; },
  // t anında hayalet konumu (lineer interpolasyon)
  posAt(ghost, t) {
    if (!ghost || !ghost.length) return null;
    if (t <= ghost[0][0]) return { x: ghost[0][1], y: ghost[0][2] };
    if (t >= ghost[ghost.length - 1][0]) { const l = ghost[ghost.length - 1]; return { x: l[1], y: l[2] }; }
    for (let i = 1; i < ghost.length; i++) { if (ghost[i][0] >= t) { const a = ghost[i - 1], b = ghost[i], f = (t - a[0]) / ((b[0] - a[0]) || 1); return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f }; } }
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #49 CloudSync — cihazlar arası senkron birleştirme
//   İki kayıttan (yerel/uzak) en güncel + en ilerlemiş olanı birleştirir. Sayısal
//   ilerleme alanlarında MAX, zaman damgasında en yenisini alır (çakışma çözümü).
// ─────────────────────────────────────────────────────────────────────────────
const CloudSync = {
  MERGE_MAX: ['gold', 'diamonds', 'xp', 'playerLevel', 'totalCoins', 'totalDistance', 'prestige', 'stars', 'nitroReserve'],
  merge(localSave, remoteSave) {
    if (!remoteSave) return localSave; if (!localSave) return remoteSave;
    const out = Object.assign({}, localSave);
    // sayısal ilerlemede en yükseği koru (veri kaybı olmasın)
    for (let i = 0; i < this.MERGE_MAX.length; i++) { const k = this.MERGE_MAX[i]; const a = +localSave[k] || 0, b = +remoteSave[k] || 0; out[k] = Math.max(a, b); }
    // liste alanları: birleşim (owned araç/harita/başarım)
    ['ownedVehicles', 'unlockedMaps', 'ownedParts'].forEach(function (k) {
      const set = {}; [].concat(localSave[k] || [], remoteSave[k] || []).forEach(function (v) { set[v] = 1; }); out[k] = Object.keys(set);
    });
    out._syncedAt = Date.now();
    return out;
  },
  // hangisi daha yeni? (updatedAt karşılaştırması)
  newest(a, b) { return ((a && a.updatedAt) || 0) >= ((b && b.updatedAt) || 0) ? a : b; }
};

// ─────────────────────────────────────────────────────────────────────────────
// #50 RegionPing — bölge seçimi + ping ölçümü
//   Aday bölgeleri ping'e göre sıralar; en düşük gecikmeliyi seçer. Ölçüm için
//   image/fetch tabanlı basit RTT (gerçek uçlar konfigüre edilene kadar simüle).
// ─────────────────────────────────────────────────────────────────────────────
const RegionPing = {
  regions: [
    { id: 'eu-tr', name: 'Türkiye', url: null },
    { id: 'eu-de', name: 'Frankfurt', url: null },
    { id: 'us-east', name: 'ABD-Doğu', url: null }
  ],
  _pings: {},
  // gerçek url varsa fetch RTT; yoksa deterministik simüle (test/edilebilir).
  measure(region) {
    const self = this;
    return new Promise(function (res) {
      if (!region.url) { const p = 20 + (self._hash(region.id) % 120); self._pings[region.id] = p; res(p); return; }
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      fetch(region.url + '?t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' })
        .then(function () { const p = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0); self._pings[region.id] = p; res(p); })
        .catch(function () { self._pings[region.id] = 999; res(999); });
    });
  },
  _hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; },
  best() { let b = null; for (let i = 0; i < this.regions.length; i++) { const r = this.regions[i], p = this._pings[r.id]; if (p != null && (!b || p < b.ping)) b = { region: r, ping: p }; } return b; },
  measureAll() { const self = this; return Promise.all(this.regions.map(function (r) { return self.measure(r); })).then(function () { return self.best(); }); }
};

// ── Netcode kimliği + kendi kendine tanılama ──
const Netcode = {
  version: '1.0',
  systems: ['ClientPrediction', 'LagCompensation', 'Rollback', 'GhostValidation', 'Matchmaking', 'Checksum', 'Spectator', 'AsyncGhost', 'CloudSync', 'RegionPing'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try {
      ClientPrediction.reset();
      const step = function (st, inp, dt) { st.x = (st.x || 0) + (inp.v || 0) * dt; };
      const s = { x: 0 }; ClientPrediction.predict(s, { v: 10 }, 0.1, step);
      const rec = ClientPrediction.reconcile({ x: 5 }, 0, step);
      r.clientprediction = ClientPrediction.pending() === 1 && Math.abs(rec.x - 6) < 1e-6;
    } catch (e) { r.clientprediction = false; }
    try { LagCompensation.reset(); LagCompensation.record(0, { x: 0 }); LagCompensation.record(1, { x: 10 }); const mid = LagCompensation.at(0.5); r.lagcompensation = mid && Math.abs(mid.x - 5) < 1e-6; } catch (e) { r.lagcompensation = false; }
    try {
      Rollback.reset();
      const step = function (st, inp) { st.x = (st.x || 0) + (inp.d || 0); };
      Rollback.save(0, { x: 0 }, {}); const out = Rollback.resimulate(0, { 1: { d: 5 }, 2: { d: 5 } }, 2, step);
      r.rollback = out && out.x === 10;
    } catch (e) { r.rollback = false; }
    try { const good = GhostValidation.validate([{ t: 0, x: 0, v: 0 }, { t: 1, x: 20, v: 20 }]); const bad = GhostValidation.validate([{ t: 0, x: 0, v: 0 }, { t: 0.01, x: 100, v: 0 }]); r.ghostvalidation = good.valid === true && bad.valid === false; } catch (e) { r.ghostvalidation = false; }
    try { const u = Matchmaking.update(1500, 1500, 1); r.matchmaking = u.a > 1500 && u.b < 1500 && Matchmaking.quality(1500, 1500) === 1; } catch (e) { r.matchmaking = false; }
    try { const sg = Checksum.sign({ gold: 999 }); const ok = Checksum.verify(sg); const tampered = { data: { gold: 99999 }, sig: sg.sig }; r.checksum = ok === true && Checksum.verify(tampered) === false; } catch (e) { r.checksum = false; }
    try { Spectator.reset(); Spectator.delayMs = 100; Spectator.push(0, { f: 0 }); Spectator.push(200, { f: 2 }); r.spectator = Spectator.frameAt(150) != null; } catch (e) { r.spectator = false; }
    try { const g = AsyncGhost.record([{ t: 0, x: 0, y: 0 }, { t: 1, x: 100, y: 0 }], 1); const p = AsyncGhost.posAt(g, 0.5); r.asyncghost = p && Math.abs(p.x - 50) < 1; } catch (e) { r.asyncghost = false; }
    try { const m = CloudSync.merge({ gold: 100, ownedVehicles: ['jeep'] }, { gold: 300, ownedVehicles: ['tank'] }); r.cloudsync = m.gold === 300 && m.ownedVehicles.length === 2; } catch (e) { r.cloudsync = false; }
    try { const p = RegionPing._hash('eu-tr'); r.regionping = typeof p === 'number' && typeof RegionPing.measureAll === 'function'; } catch (e) { r.regionping = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.ClientPrediction = ClientPrediction;
  window.LagCompensation = LagCompensation;
  window.Rollback = Rollback;
  window.GhostValidation = GhostValidation;
  window.Matchmaking = Matchmaking;
  window.Checksum = Checksum;
  window.Spectator = Spectator;
  window.AsyncGhost = AsyncGhost;
  window.CloudSync = CloudSync;
  window.RegionPing = RegionPing;
  window.Netcode = Netcode;
}
