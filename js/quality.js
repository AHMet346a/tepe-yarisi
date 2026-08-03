'use strict';
// ── Adaptive Quality ─────────────────────────────────────────────────────────
// Self-contained + self-installing performance governor.
//
// Continuously samples frame-time with its own cheap requestAnimationFrame loop
// (a couple of arithmetic ops per frame — a single moving average, no allocs) and
// nudges an effect-intensity `level` up or down so the game stays smooth on any
// device: slow device (low FPS) → dial effects down; fast device → dial them up.
//
// Public surface (read every frame from hot paths — all plain property reads):
//   Quality.level         0 low | 1 med | 2 high   (starts 2)
//   Quality.particleScale 0.35  | 0.65 | 1.0        (multiply particle counts)
//   Quality.shadowsOn     false | true  | true      (gate expensive shadows)
//   Quality.get(key)      generic accessor for the above (+ 'mode','fps')
//   Quality.getFps()      current smoothed FPS
//   Quality.setMode(m)    'auto' | 'low' | 'med' | 'high'  (persisted, guarded)
//
// In a manual mode auto-adjust stops; 'auto' resumes adaptive control.
// No localStorage here — persistence goes through SaveData (guarded).
const Quality = {
  // ── Public state (hot-path reads) ──────────────────────────────────────────
  level: 2,            // 0 low · 1 med · 2 high
  particleScale: 1.0,  // per-level: 0.35 / 0.65 / 1.0
  shadowsOn: true,     // per-level: false / true / true

  // ── Per-level presets (index === level) ────────────────────────────────────
  _PRESETS: [
    { particleScale: 0.35, shadowsOn: false }, // 0 low
    { particleScale: 0.65, shadowsOn: true  }, // 1 med
    { particleScale: 1.00, shadowsOn: true  }, // 2 high
  ],

  // ── Thresholds + hysteresis ────────────────────────────────────────────────
  // Downgrade if smoothed FPS stays below DOWN for HOLD_MS; upgrade if it stays
  // above UP for HOLD_MS. The gap between DOWN(40) and UP(55) is the hysteresis
  // band that stops the level from oscillating around a single FPS value.
  _FPS_DOWN: 40,
  _FPS_UP:   55,
  _HOLD_MS:  3000,     // sustained-condition window before any level change
  _EMA_A:    0.1,      // frame-time moving-average weight (higher = snappier)

  // ── Sampler internals ──────────────────────────────────────────────────────
  mode: 'auto',        // 'auto' | 'low' | 'med' | 'high'
  _fps: 60,            // smoothed FPS (exposed via getFps)
  _emaFrame: 1000 / 60,// smoothed frame-time (ms)
  _last: 0,            // performance.now() of previous sampled frame
  _rafId: 0,
  _running: false,
  _belowSince: 0,      // timestamp we first dropped under _FPS_DOWN (0 = not)
  _aboveSince: 0,      // timestamp we first rose above _FPS_UP   (0 = not)
  _started: false,

  // Modes as level indices (null === auto → sampler-driven).
  _MODE_LEVEL: { low: 0, med: 1, high: 2 },

  // ── Apply a level's preset to the public fields ────────────────────────────
  _applyLevel(lvl) {
    if (lvl < 0) lvl = 0; else if (lvl > 2) lvl = 2;
    this.level = lvl;
    const p = this._PRESETS[lvl];
    this.particleScale = p.particleScale;
    this.shadowsOn = p.shadowsOn;
  },

  // ── The sampler loop — deliberately tiny ───────────────────────────────────
  // One now() diff, one EMA update, one reciprocal, and (only in auto mode) two
  // timestamp compares. It must never itself be a source of jank.
  _tick(now) {
    if (!this._running) return;
    const dt = now - this._last;
    this._last = now;
    // Ignore absurd gaps (tab throttle, breakpoints, first frame) so a single
    // 2-second stall can't nuke the average or trip a false downgrade.
    if (dt > 0 && dt < 500) {
      this._emaFrame += (dt - this._emaFrame) * this._EMA_A;
      this._fps = 1000 / this._emaFrame;
      if (this.mode === 'auto') this._evaluate(now, this._fps);
    }
    this._rafId = requestAnimationFrame(this._boundTick);
  },

  // ── Hysteresis state machine (auto mode only) ──────────────────────────────
  _evaluate(now, fps) {
    if (fps < this._FPS_DOWN) {
      this._aboveSince = 0;
      if (!this._belowSince) this._belowSince = now;
      else if (now - this._belowSince >= this._HOLD_MS && this.level > 0) {
        this._applyLevel(this.level - 1); // step down one notch
        this._belowSince = 0;             // require a fresh window before the next
      }
    } else if (fps > this._FPS_UP) {
      this._belowSince = 0;
      if (!this._aboveSince) this._aboveSince = now;
      else if (now - this._aboveSince >= this._HOLD_MS && this.level < 2) {
        this._applyLevel(this.level + 1); // step up one notch
        this._aboveSince = 0;
      }
    } else {
      // Comfortable middle band — reset both timers (this is the hysteresis).
      this._belowSince = 0;
      this._aboveSince = 0;
    }
  },

  // ── Sampler lifecycle ──────────────────────────────────────────────────────
  start() {
    if (this._running) return;
    this._running = true;
    this._last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._belowSince = 0;
    this._aboveSince = 0;
    if (!this._boundTick) this._boundTick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._boundTick);
  },

  stop() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = 0; }
  },

  // ── Public API ─────────────────────────────────────────────────────────────
  getFps() { return Math.round(this._fps); },

  get(key) {
    switch (key) {
      case 'level':         return this.level;
      case 'particleScale': return this.particleScale;
      case 'shadowsOn':     return this.shadowsOn;
      case 'mode':          return this.mode;
      case 'fps':           return this.getFps();
      default:              return undefined;
    }
  },

  // Set quality mode. 'auto' hands control back to the sampler; any manual mode
  // pins the level and freezes auto-adjustment. Persisted through SaveData (guarded).
  setMode(mode) {
    if (mode !== 'auto' && mode !== 'low' && mode !== 'med' && mode !== 'high') return;
    this.mode = mode;
    if (mode === 'auto') {
      // Keep the current level; sampler resumes steering from here.
      this._belowSince = 0;
      this._aboveSince = 0;
    } else {
      this._applyLevel(this._MODE_LEVEL[mode]);
    }
    this._persistMode(mode);
  },

  // ── Persistence (SaveData only, fully guarded — never throws) ───────────────
  _persistMode(mode) {
    try {
      if (typeof SaveData !== 'undefined' && SaveData && typeof SaveData.set === 'function') {
        SaveData.set('qualityMode', mode);
      }
    } catch (e) { /* saving quality preference must never break the game */ }
  },

  _loadMode() {
    let saved = 'auto';
    try {
      if (typeof SaveData !== 'undefined' && SaveData && typeof SaveData.get === 'function') {
        const v = SaveData.get('qualityMode');
        if (v === 'auto' || v === 'low' || v === 'med' || v === 'high') saved = v;
      }
    } catch (e) { saved = 'auto'; }
    this.mode = saved;
    if (saved !== 'auto') this._applyLevel(this._MODE_LEVEL[saved]);
  },

  // ── Self-install ───────────────────────────────────────────────────────────
  install() {
    if (this._started) return;
    this._started = true;
    this._loadMode();   // restore persisted preference before sampling starts
    this.start();
    // Pause sampling while the tab is hidden (battery/CPU); resume on return.
    try {
      if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) this.stop();
          else this.start();
        });
      }
    } catch (e) { /* no document (non-browser) — sampler just runs unguarded */ }
  }
};

// Kick off at DOMContentLoaded (or immediately if the DOM is already parsed).
(function () {
  try {
    if (typeof document !== 'undefined' && document.readyState === 'loading' &&
        typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', function () { Quality.install(); });
    } else {
      Quality.install();
    }
  } catch (e) { /* environment without a DOM — leave defaults (high) in place */ }
})();

window.Quality = Quality;
