'use strict';
/* Accessibility — Erişilebilirlik & QoL (100-özellik: I. #81–#90). ADDITIVE. */

// #81 Yeniden atanabilir kontroller
const Rebind = {
  _map: { gas: ['ArrowRight', 'KeyD'], brake: ['ArrowLeft', 'KeyA'], nitro: ['Space', 'ShiftLeft'], pause: ['Escape'] },
  set(action, keys) { this._map[action] = [].concat(keys); this._save(); },
  keysFor(action) { return this._map[action] || []; },
  actionForKey(code) { for (const a in this._map) { if (this._map[a].indexOf(code) >= 0) return a; } return null; },
  _save() { try { if (typeof SaveData !== 'undefined') SaveData.set('keymap', this._map); } catch (e) {} },
  load() { try { if (typeof SaveData !== 'undefined') { const m = SaveData.get('keymap'); if (m) this._map = m; } } catch (e) {} }
};
// #82 Renk körü modları + yüksek kontrast
const ColorBlind = {
  mode: 'none', // none|protanopia|deuteranopia|tritanopia|highcontrast
  set(m) { this.mode = m; if (typeof EventBus !== 'undefined') EventBus.emit('a11y:colorblind', m); },
  // bir rengi moda göre dönüştürür (basit matris yaklaşımı)
  transform(r, g, b) {
    switch (this.mode) {
      case 'protanopia': return [0.567 * r + 0.433 * g, 0.558 * r + 0.442 * g, 0.242 * g + 0.758 * b];
      case 'deuteranopia': return [0.625 * r + 0.375 * g, 0.7 * r + 0.3 * g, 0.3 * g + 0.7 * b];
      case 'tritanopia': return [0.95 * r + 0.05 * g, 0.433 * g + 0.567 * b, 0.475 * g + 0.525 * b];
      case 'highcontrast': { const l = 0.3 * r + 0.59 * g + 0.11 * b; const v = l > 128 ? 255 : 0; return [v, v, v]; }
      default: return [r, g, b];
    }
  }
};
// #83 Ekran okuyucu kancaları
const ScreenReader = {
  _live: null,
  ensure() { if (typeof document === 'undefined') return null; if (!this._live) { this._live = document.createElement('div'); this._live.setAttribute('aria-live', 'polite'); this._live.setAttribute('role', 'status'); this._live.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;'; (document.body || document.documentElement).appendChild(this._live); } return this._live; },
  announce(text) { const el = this.ensure(); if (el) el.textContent = String(text); }
};
// #84 Titreşim/haptik
const Haptics = {
  enabled: true,
  vibrate(pattern) { if (!this.enabled) return false; try { if (typeof navigator !== 'undefined' && navigator.vibrate) return navigator.vibrate(pattern); } catch (e) {} return false; },
  tap() { return this.vibrate(15); }, crash() { return this.vibrate([40, 30, 60]); }, reward() { return this.vibrate([10, 20, 10]); }
};
// #85 Tek-el / basitleştirilmiş kontrol
const SimpleControl = {
  enabled: false,
  // tek dokunma → gaz (bırakınca fren). Basit girdi eşlemesi.
  map(pointerDown) { return this.enabled ? { throttle: pointerDown ? 1 : 0, brake: pointerDown ? 0 : 0.2 } : null; }
};
// #86 Hareket azaltma
const MotionReduce = {
  enabled: false,
  detect() { try { if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) this.enabled = true; } catch (e) {} return this.enabled; },
  scale(v) { return this.enabled ? 0 : v; }   // dekoratif hareketi kıs
};
// #87 Ölçeklenebilir font & UI
const UIScale = {
  scale: 1, min: 0.8, max: 1.6,
  set(s) { this.scale = Math.max(this.min, Math.min(this.max, s)); if (typeof EventBus !== 'undefined') EventBus.emit('a11y:uiscale', this.scale); return this.scale; },
  px(base) { return Math.round(base * this.scale); }
};
// #88 Alt yazı & sesli ipucu metinleri
const Subtitles = {
  enabled: true, _cur: null,
  show(text, dur) { this._cur = { text: text, until: Date.now() + (dur || 2500) }; if (typeof ScreenReader !== 'undefined') ScreenReader.announce(text); },
  current() { if (this._cur && Date.now() < this._cur.until) return this._cur.text; return null; }
};
// #89 Zorluk ön ayarları
const DifficultyPresets = {
  presets: { relaxed: { enemy: 0.7, fuel: 1.3, reward: 0.9 }, normal: { enemy: 1, fuel: 1, reward: 1 }, hard: { enemy: 1.3, fuel: 0.85, reward: 1.2 }, expert: { enemy: 1.6, fuel: 0.7, reward: 1.5 } },
  current: 'normal',
  set(p) { if (this.presets[p]) this.current = p; return this.get(); },
  get() { return this.presets[this.current]; }
};
// #90 Kapsamlı öğretici + bağlamsal ipuçları
const Tutorial = {
  _seen: Object.create(null), steps: ['gas', 'brake', 'nitro', 'flip', 'fuel'],
  tip(id, text) { if (this._seen[id]) return null; this._seen[id] = true; if (typeof Subtitles !== 'undefined') Subtitles.show(text || id, 3000); return { id: id, text: text }; },
  reset() { this._seen = Object.create(null); },
  progress() { return Object.keys(this._seen).length / this.steps.length; }
};

const Accessibility = {
  version: '1.0',
  systems: ['Rebind', 'ColorBlind', 'ScreenReader', 'Haptics', 'SimpleControl', 'MotionReduce', 'UIScale', 'Subtitles', 'DifficultyPresets', 'Tutorial'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { Rebind.set('gas', ['KeyG']); r.rebind = Rebind.actionForKey('KeyG') === 'gas'; } catch (e) { r.rebind = false; }
    try { ColorBlind.set('highcontrast'); const c = ColorBlind.transform(200, 200, 200); r.colorblind = c[0] === 255; ColorBlind.set('none'); } catch (e) { r.colorblind = false; }
    try { r.screenreader = typeof ScreenReader.announce === 'function'; } catch (e) { r.screenreader = false; }
    try { r.haptics = typeof Haptics.tap === 'function'; } catch (e) { r.haptics = false; }
    try { SimpleControl.enabled = true; r.simplecontrol = SimpleControl.map(true).throttle === 1; SimpleControl.enabled = false; } catch (e) { r.simplecontrol = false; }
    try { MotionReduce.enabled = true; r.motionreduce = MotionReduce.scale(5) === 0; MotionReduce.enabled = false; } catch (e) { r.motionreduce = false; }
    try { UIScale.set(1.4); r.uiscale = UIScale.px(10) === 14; UIScale.set(1); } catch (e) { r.uiscale = false; }
    try { Subtitles.show('x', 1000); r.subtitles = Subtitles.current() === 'x'; } catch (e) { r.subtitles = false; }
    try { DifficultyPresets.set('hard'); r.difficultypresets = DifficultyPresets.get().enemy === 1.3; DifficultyPresets.set('normal'); } catch (e) { r.difficultypresets = false; }
    try { Tutorial.reset(); const t = Tutorial.tip('gas', 'Gaza bas'); r.tutorial = t && t.id === 'gas' && Tutorial.tip('gas') === null; } catch (e) { r.tutorial = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.Rebind = Rebind; window.ColorBlind = ColorBlind; window.ScreenReader = ScreenReader; window.Haptics = Haptics; window.SimpleControl = SimpleControl; window.MotionReduce = MotionReduce; window.UIScale = UIScale; window.Subtitles = Subtitles; window.DifficultyPresets = DifficultyPresets; window.Tutorial = Tutorial; window.Accessibility = Accessibility; }
