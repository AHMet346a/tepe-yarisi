'use strict';
/* VisualAudio — Görsel & Ses (2. Liste: H. #71–#80). ADDITIVE; render/audio yardımcıları. */

// #71 Dinamik gölge + ışıklandırma
const DynamicShadow = {
  offset(lightAngle, height) { const a = lightAngle == null ? 0.6 : lightAngle; return { dx: Math.cos(a) * (height || 20), dy: Math.max(2, Math.sin(a) * 4), blur: Math.min(12, (height || 20) * 0.3), alpha: Math.max(0.1, 0.5 - (height || 0) * 0.01) }; } };
// #72 Gelişmiş parçacıklar
const Particles2 = {
  _pool: [],
  emit(type, x, y, n) { const out = []; for (let i = 0; i < (n || 8); i++) { const ang = Math.random() * Math.PI * 2; const spd = Math.random() * 3 + 1; out.push({ type: type, x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - (type === 'su' ? 2 : 0), life: 1 }); } this._pool = this._pool.concat(out); if (this._pool.length > 500) this._pool.splice(0, this._pool.length - 500); return out.length; },
  step(dt) { for (let i = this._pool.length - 1; i >= 0; i--) { const p = this._pool[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= (dt || 0.016) * 1.5; if (p.life <= 0) this._pool.splice(i, 1); } return this._pool.length; } };
// #73 Çarpma kamera sarsıntısı
const CameraShake = {
  amount: 0,
  hit(force) { this.amount = Math.min(30, this.amount + (force || 5)); },
  offset() { if (this.amount <= 0) return { x: 0, y: 0 }; return { x: (Math.random() - 0.5) * this.amount, y: (Math.random() - 0.5) * this.amount }; },
  tick(dt) { this.amount = Math.max(0, this.amount - (dt || 0.016) * 60); return this.amount; } };
// #74 Ekran efektleri
const ScreenFx = {
  damageFlash: 0, speedBlur: 0,
  damage(intensity) { this.damageFlash = Math.min(1, (intensity == null ? 0.6 : intensity)); },
  setSpeed(speed, max) { this.speedBlur = Math.min(1, (speed || 0) / (max || 400)); },
  tick(dt) { this.damageFlash = Math.max(0, this.damageFlash - (dt || 0.016) * 2); return { flash: this.damageFlash, blur: this.speedBlur }; } };
// #75 Müzik çalar
const MusicPlayer = {
  tracks: ['tema1', 'tema2', 'aksiyon', 'sakin', 'zafer'], idx: 0,
  current() { return this.tracks[this.idx]; },
  select(name) { const i = this.tracks.indexOf(name); if (i < 0) return false; this.idx = i; return true; },
  next() { this.idx = (this.idx + 1) % this.tracks.length; return this.current(); },
  prev() { this.idx = (this.idx - 1 + this.tracks.length) % this.tracks.length; return this.current(); } };
// #76 Sürücü sesli tepkileri
const DriverVoice = {
  lines: { flip: ['harika!', 'süper takla!'], crash: ['ah!', 'dikkat!'], boost: ['gaaz!', 'hızlanıyoruz!'], win: ['kazandık!', 'birinciyiz!'] },
  say(event) { const arr = this.lines[event]; if (!arr) return null; return arr[Math.floor(Math.random() * arr.length)]; } };
// #77 Fotoğraf modu
const PhotoMode = {
  active: false, paused: false, filters: ['yok', 'sepia', 'siyahbeyaz', 'canli', 'soguk'],
  enter() { this.active = true; this.paused = true; return true; },
  exit() { this.active = false; this.paused = false; return true; },
  config(zoom, filter, hideUi) { return { zoom: Math.max(0.5, Math.min(3, zoom || 1)), filter: this.filters.indexOf(filter) >= 0 ? filter : 'yok', hideUi: !!hideUi }; } };
// #78 Sinematik tekrar kamerası
const ReplayCam = {
  modes: ['takip', 'sabit', 'sinematik', 'kokpit'], mode: 'takip',
  set(m) { if (this.modes.indexOf(m) < 0) return false; this.mode = m; return true; },
  posFor(carX, carY, t) { if (this.mode === 'sinematik') return { x: carX - 150 + Math.sin(t || 0) * 100, y: carY - 80 }; if (this.mode === 'sabit') return { x: 0, y: 0 }; if (this.mode === 'kokpit') return { x: carX, y: carY }; return { x: carX - 100, y: carY - 50 }; } };
// #79 Renk filtreleri / temalar
const ColorThemes = {
  themes: { normal: null, retro: 'sepia(0.4) contrast(1.1)', neon: 'saturate(1.8) brightness(1.1)', noir: 'grayscale(1)', gunbatimi: 'hue-rotate(-20deg) saturate(1.4)' },
  cssFor(name) { return this.themes[name] || 'none'; },
  list() { return Object.keys(this.themes); } };
// #80 Kutlama animasyonları
const Celebrations = {
  fireworks(n) { const out = []; for (let i = 0; i < (n || 5); i++) out.push({ x: Math.random(), y: Math.random() * 0.5, hue: Math.floor(Math.random() * 360), delay: i * 0.3 }); return out; },
  confetti(n) { const out = []; for (let i = 0; i < (n || 40); i++) out.push({ x: Math.random(), vy: Math.random() * 2 + 1, rot: Math.random() * 360, color: ['#ff5a00', '#00e5ff', '#7cff00', '#ffd400'][i % 4] }); return out; } };

const VisualAudio = {
  version: '1.0',
  systems: ['DynamicShadow', 'Particles2', 'CameraShake', 'ScreenFx', 'MusicPlayer', 'DriverVoice', 'PhotoMode', 'ReplayCam', 'ColorThemes', 'Celebrations'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { const s = DynamicShadow.offset(0.6, 20); r.dynamicshadow = typeof s.dx === 'number' && s.alpha > 0; } catch (e) { r.dynamicshadow = false; }
    try { Particles2._pool = []; Particles2.emit('kivilcim', 0, 0, 10); r.particles2 = Particles2.step(0.016) > 0; } catch (e) { r.particles2 = false; }
    try { CameraShake.amount = 0; CameraShake.hit(10); r.camerashake = CameraShake.amount > 0 && typeof CameraShake.offset().x === 'number'; CameraShake.amount = 0; } catch (e) { r.camerashake = false; }
    try { ScreenFx.damage(0.8); const t = ScreenFx.tick(0.016); r.screenfx = t.flash > 0; } catch (e) { r.screenfx = false; }
    try { r.musicplayer = MusicPlayer.select('aksiyon') === true && MusicPlayer.next() !== 'aksiyon'; } catch (e) { r.musicplayer = false; }
    try { r.drivervoice = DriverVoice.say('flip') !== null && DriverVoice.say('yok') === null; } catch (e) { r.drivervoice = false; }
    try { PhotoMode.enter(); r.photomode = PhotoMode.active === true && PhotoMode.config(2, 'sepia', true).filter === 'sepia'; PhotoMode.exit(); } catch (e) { r.photomode = false; }
    try { r.replaycamera = ReplayCam.set('sinematik') === true && typeof ReplayCam.posFor(100, 0, 1).x === 'number'; } catch (e) { r.replaycamera = false; }
    try { r.colorthemes = ColorThemes.cssFor('neon') !== 'none' && ColorThemes.list().length >= 4; } catch (e) { r.colorthemes = false; }
    try { r.celebrations = Celebrations.fireworks(5).length === 5 && Celebrations.confetti(40).length === 40; } catch (e) { r.celebrations = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.DynamicShadow = DynamicShadow; window.Particles2 = Particles2; window.CameraShake = CameraShake; window.ScreenFx = ScreenFx; window.MusicPlayer = MusicPlayer; window.DriverVoice = DriverVoice; window.PhotoMode = PhotoMode; window.ReplayCam = ReplayCam; window.ColorThemes = ColorThemes; window.Celebrations = Celebrations; window.VisualAudio = VisualAudio; }
