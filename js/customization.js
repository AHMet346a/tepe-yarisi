'use strict';
/* Customization — Araçlar & Özelleştirme (2. Liste: A. #1–#10). ADDITIVE.
   Kozmetik seçimleri SaveData'da 'cosmetics' altında tutulur; oyunu bozmaz. */
const _cz = {
  data() {
    try { if (typeof SaveData !== 'undefined' && SaveData.get) { let c = SaveData.get('cosmetics'); if (!c) { c = {}; SaveData.set('cosmetics', c); } return c; } } catch (e) {}
    return (this._mem = this._mem || {});
  },
  save() { try { if (typeof SaveData !== 'undefined' && SaveData.save) SaveData.save(); } catch (e) {} },
  veh() { try { return (typeof SaveData !== 'undefined' && SaveData.get('selectedVehicle')) || 'jeep'; } catch (e) { return 'jeep'; } },
  get(key, dflt) { const c = this.data(); const v = this.veh(); c[v] = c[v] || {}; return (c[v][key] !== undefined) ? c[v][key] : dflt; },
  set(key, val) { const c = this.data(); const v = this.veh(); c[v] = c[v] || {}; c[v][key] = val; this.save(); return val; }
};

// #1 Boya stüdyosu (mevcut PaintShop'a köprü)
const PaintStudio = {
  available() { return typeof PaintShop !== 'undefined'; },
  get() { try { return (typeof SaveData !== 'undefined' && SaveData.getPaint) ? SaveData.getPaint(_cz.veh()) : null; } catch (e) { return null; } },
  set(color, pattern, finish) { return _cz.set('paint', { color: color, pattern: pattern || 'duz', finish: finish || 'mat' }); }
};
// #2 Sticker / çıkartma
const Stickers = {
  catalog: ['alev', 'yildiz', 'kurukafa', 'simsek', 'kalp', 'numara', 'bayrak', 'pati'],
  list() { return _cz.get('stickers', []); },
  add(id, x, y, scale, rot) { if (this.catalog.indexOf(id) < 0) return false; const s = this.list(); if (s.length >= 8) return false; s.push({ id: id, x: x || 0.5, y: y || 0.5, s: scale || 1, r: rot || 0 }); return !!_cz.set('stickers', s); },
  removeAt(i) { const s = this.list(); if (i >= 0 && i < s.length) { s.splice(i, 1); _cz.set('stickers', s); return true; } return false; },
  clear() { return !!_cz.set('stickers', []); }
};
// #3 Neon underglow
const Underglow = {
  colors: ['#00e5ff', '#ff2d95', '#7cff00', '#ffd400', '#a24bff', '#ff5a00', 'off'],
  set(color, intensity) { return _cz.set('underglow', { color: (this.colors.indexOf(color) >= 0 ? color : 'off'), intensity: Math.max(0, Math.min(1, intensity == null ? 0.8 : intensity)) }); },
  get() { return _cz.get('underglow', { color: 'off', intensity: 0 }); },
  isOn() { return this.get().color !== 'off'; }
};
// #4 Renkli egzoz dumanı
const ExhaustFx = {
  types: ['normal', 'kirmizi', 'mavi', 'yesil', 'mor', 'altin', 'gokkusagi'],
  set(type) { return _cz.set('exhaust', this.types.indexOf(type) >= 0 ? type : 'normal'); },
  get() { return _cz.get('exhaust', 'normal'); },
  colorFor(t) { return ({ kirmizi: '#ff3b3b', mavi: '#3ba7ff', yesil: '#4ade80', mor: '#a24bff', altin: '#ffcf3f', gokkusagi: 'rainbow', normal: '#cccccc' })[t || this.get()] || '#cccccc'; }
};
// #5 Jant / tekerlek çeşitleri
const Wheels = {
  catalog: [{ id: 'stok', price: 0 }, { id: 'spor', price: 2000 }, { id: 'offroad', price: 3500 }, { id: 'altin', price: 8000 }, { id: 'neon', price: 6000 }],
  owned() { return _cz.get('wheelsOwned', ['stok']); },
  buy(id) { const it = this.catalog.find(function (w) { return w.id === id; }); if (!it) return false; if (this.owned().indexOf(id) >= 0) return true; try { if (typeof SaveData !== 'undefined' && SaveData.spendGold && !SaveData.spendGold(it.price)) return false; } catch (e) {} const o = this.owned(); o.push(id); _cz.set('wheelsOwned', o); return true; },
  select(id) { if (this.owned().indexOf(id) < 0) return false; return !!_cz.set('wheel', id); },
  selected() { return _cz.get('wheel', 'stok'); }
};
// #6 Korna sesi koleksiyonu
const Horns = {
  catalog: ['klasik', 'kamyon', 'muzikal', 'komik', 'siren', 'hayvan'],
  owned() { return _cz.get('hornsOwned', ['klasik']); },
  select(id) { if (this.catalog.indexOf(id) < 0) return false; return !!_cz.set('horn', id); },
  selected() { return _cz.get('horn', 'klasik'); },
  play() { try { if (typeof Audio !== 'undefined' && Audio.playHorn) Audio.playHorn(this.selected()); } catch (e) {} return this.selected(); }
};
// #7 Kişisel plaka
const Plate = {
  validate(txt) { return typeof txt === 'string' && /^[A-Z0-9 ]{1,8}$/.test(txt.toUpperCase()); },
  set(txt) { txt = String(txt || '').toUpperCase().slice(0, 8); if (!this.validate(txt)) return false; return _cz.set('plate', txt) === txt; },
  get() { return _cz.get('plate', 'AHMET'); }
};
// #8 Süspansiyon yüksekliği (görsel)
const RideHeight = {
  min: -1, max: 1,
  set(h) { return _cz.set('rideHeight', Math.max(this.min, Math.min(this.max, h || 0))); },
  get() { return _cz.get('rideHeight', 0); },   // -1 alçak, 0 stok, +1 yüksek
  pixels(base) { return (base || 0) + this.get() * 8; }
};
// #9 Sürücü karakteri
const Driver = {
  helmets: ['kirmizi', 'mavi', 'siyah', 'altin', 'kamuflaj'],
  outfits: ['klasik', 'yarisci', 'ninja', 'astronot'],
  set(helmet, outfit) { return _cz.set('driver', { helmet: this.helmets.indexOf(helmet) >= 0 ? helmet : 'kirmizi', outfit: this.outfits.indexOf(outfit) >= 0 ? outfit : 'klasik' }); },
  get() { return _cz.get('driver', { helmet: 'kirmizi', outfit: 'klasik' }); }
};
// #10 360° araç vitrini (garaj döndürme)
const Showcase = {
  angle: 0, spin: true, speed: 0.5,
  update(dt) { if (this.spin) this.angle = (this.angle + (dt || 0.016) * this.speed) % (Math.PI * 2); return this.angle; },
  rotate(d) { this.spin = false; this.angle = (this.angle + d) % (Math.PI * 2); },
  toggleSpin() { this.spin = !this.spin; return this.spin; }
};

const Customization = {
  version: '1.0',
  systems: ['PaintStudio', 'Stickers', 'Underglow', 'ExhaustFx', 'Wheels', 'Horns', 'Plate', 'RideHeight', 'Driver', 'Showcase'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { r.paintstudio = typeof PaintStudio.set === 'function'; } catch (e) { r.paintstudio = false; }
    try { Stickers.clear(); Stickers.add('alev', 0.5, 0.5, 1, 0); r.stickers = Stickers.list().length === 1 && Stickers.add('gecersiz') === false; } catch (e) { r.stickers = false; }
    try { Underglow.set('#00e5ff', 0.9); r.underglow = Underglow.isOn() === true; Underglow.set('off'); } catch (e) { r.underglow = false; }
    try { ExhaustFx.set('mavi'); r.exhaustfx = ExhaustFx.get() === 'mavi' && ExhaustFx.colorFor('mavi') === '#3ba7ff'; } catch (e) { r.exhaustfx = false; }
    try { r.wheels = Wheels.select('stok') === true && Wheels.select('altin') === false; } catch (e) { r.wheels = false; }
    try { Horns.select('siren'); r.horns = Horns.selected() === 'siren' && Horns.select('yok') === false; } catch (e) { r.horns = false; }
    try { r.plate = Plate.set('AHMET 1') === true && Plate.set('çok uzun plaka!!') === false && Plate.get().length <= 8; } catch (e) { r.plate = false; }
    try { RideHeight.set(2); r.rideheight = RideHeight.get() === 1 && RideHeight.pixels(0) === 8; } catch (e) { r.rideheight = false; }
    try { Driver.set('altin', 'ninja'); r.driver = Driver.get().helmet === 'altin' && Driver.get().outfit === 'ninja'; } catch (e) { r.driver = false; }
    try { Showcase.angle = 0; Showcase.spin = true; Showcase.update(0.1); r.showcase = Showcase.angle > 0; } catch (e) { r.showcase = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.PaintStudio = PaintStudio; window.Stickers = Stickers; window.Underglow = Underglow; window.ExhaustFx = ExhaustFx; window.Wheels = Wheels; window.Horns = Horns; window.Plate = Plate; window.RideHeight = RideHeight; window.Driver = Driver; window.Showcase = Showcase; window.Customization = Customization; }
