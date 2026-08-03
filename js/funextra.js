'use strict';
/* FunExtra — Ekstra & Eğlence (2. Liste: J. #91–#100). ADDITIVE. */
const _fx = { get(k, d) { try { const v = SaveData.get(k); return v === undefined ? d : v; } catch (e) { return d; } }, set(k, v) { try { SaveData.set(k, v); } catch (e) {} },
  add(n) { try { if (SaveData.addGold) SaveData.addGold(n); else SaveData.set('gold', (_fx.get('gold', 0) + n)); } catch (e) {} },
  spend(n) { try { return SaveData.spendGold ? SaveData.spendGold(n) : (function () { const g = _fx.get('gold', 0); if (g < n) return false; SaveData.set('gold', g - n); return true; })(); } catch (e) { return false; } } };

// #91 Araçta oturan evcil yoldaş
const Pet = {
  catalog: ['kopek', 'kedi', 'papagan', 'hamster', 'ejderha'],
  owned() { return _fx.get('petsOwned', []); },
  adopt(id) { if (this.catalog.indexOf(id) < 0) return false; const o = this.owned(); if (o.indexOf(id) < 0) { o.push(id); _fx.set('petsOwned', o); } return true; },
  select(id) { if (this.owned().indexOf(id) < 0) return false; _fx.set('pet', id); return true; },
  active() { return _fx.get('pet', null); },
  bonus() { return this.active() ? { luck: 0.05 } : {}; } };
// #92 Garaj mini oyunları (slot makinesi)
const SlotMachine = {
  symbols: ['🍒', '🔔', '⭐', '💎', '7'],
  cost: 200,
  spin() { if (!_fx.spend(this.cost)) return { ok: false }; const s = this.symbols; const roll = [s[Math.floor(Math.random() * s.length)], s[Math.floor(Math.random() * s.length)], s[Math.floor(Math.random() * s.length)]]; let win = 0; if (roll[0] === roll[1] && roll[1] === roll[2]) win = roll[0] === '7' ? 5000 : 1000; else if (roll[0] === roll[1] || roll[1] === roll[2]) win = 300; if (win) _fx.add(win); return { ok: true, roll: roll, win: win }; } };
// #93 Gizli sırlar / paskalya yumurtaları
const Easter = {
  eggs: ['konami', 'gizli_arac', 'devmode', 'ahmet_dans', 'ufo'],
  _found: {},
  find(id) { if (this.eggs.indexOf(id) < 0) return false; if (this._found[id]) return false; this._found[id] = true; _fx.add(500); return true; },
  count() { return Object.keys(this._found).length; },
  konami(seq) { const code = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a']; return JSON.stringify(seq) === JSON.stringify(code); } };
// #94 Günün zarı
const DailyDice = {
  day() { return Math.floor(Date.now() / 86400000); },
  roll() { const last = _fx.get('diceDay', -1); if (last === this.day()) return { ok: false, reason: 'rolled' }; const val = 1 + Math.floor(Math.random() * 6); const reward = val * 200; _fx.set('diceDay', this.day()); _fx.add(reward); return { ok: true, value: val, reward: reward }; } };
// #95 Oyun içi para ile yarış bahsi
const RaceBet = {
  place(amount, odds) { if (amount <= 0 || !_fx.spend(amount)) return { ok: false }; return { ok: true, stake: amount, odds: odds || 2, id: 'BET' + Date.now() }; },
  settle(bet, won) { if (!won) return { payout: 0 }; const payout = Math.round(bet.stake * bet.odds); _fx.add(payout); return { payout: payout }; } };
// #96 Sezonluk etkinlikler
const SeasonalEvents = {
  events: [{ id: 'yilbasi', month: 12, name: 'Yılbaşı' }, { id: 'ramazan', month: null, name: 'Ramazan' }, { id: 'yaz', month: 7, name: 'Yaz Festivali' }, { id: 'cadilar', month: 10, name: 'Cadılar Bayramı' }],
  active(date) { const m = (date || new Date()).getMonth() + 1; return this.events.filter(function (e) { return e.month === m; }); },
  isActive(id, date) { return this.active(date).some(function (e) { return e.id === id; }); } };
// #97 Yarışta emoji/tepki
const RaceEmoji = {
  set: ['😎', '😱', '🔥', '😂', '👏', '🏁', '💨', '🎉'],
  _recent: [],
  send(emoji) { if (this.set.indexOf(emoji) < 0) return false; this._recent.push({ e: emoji, t: Date.now() }); if (this._recent.length > 20) this._recent.shift(); return true; },
  active(now) { const t = now || Date.now(); return this._recent.filter(function (x) { return t - x.t < 3000; }); } };
// #98 Trophy odası 3D vitrin
const TrophyRoom = {
  trophies() { return _fx.get('trophies', []); },
  award(id, name) { const t = this.trophies(); if (t.find(function (x) { return x.id === id; })) return false; t.push({ id: id, name: name || id, at: Date.now() }); _fx.set('trophies', t); return true; },
  count() { return this.trophies().length; },
  layout() { return this.trophies().map(function (t, i) { return { id: t.id, x: (i % 4) * 100 + 50, y: Math.floor(i / 4) * 100 + 50 }; }); } };
// #99 Rekor replay galerisi
const ReplayGallery = {
  _replays: [],
  save(mapId, time, frames) { this._replays.push({ id: 'R' + Date.now(), mapId: mapId, time: time, frames: frames || [], at: Date.now() }); this._replays.sort(function (a, b) { return a.time - b.time; }); if (this._replays.length > 20) this._replays.length = 20; return true; },
  best(mapId) { return this._replays.filter(function (r) { return r.mapId === mapId; })[0] || null; },
  list() { return this._replays.slice(); } };
// #100 Kişisel müzik yükleme
const CustomMusic = {
  _tracks: [],
  add(name, url) { if (!name) return false; this._tracks.push({ name: String(name).slice(0, 40), url: url || null }); if (this._tracks.length > 10) this._tracks.shift(); return true; },
  list() { return this._tracks.slice(); },
  remove(name) { const i = this._tracks.findIndex(function (t) { return t.name === name; }); if (i >= 0) { this._tracks.splice(i, 1); return true; } return false; } };

const FunExtra = {
  version: '1.0',
  systems: ['Pet', 'SlotMachine', 'Easter', 'DailyDice', 'RaceBet', 'SeasonalEvents', 'RaceEmoji', 'TrophyRoom', 'ReplayGallery', 'CustomMusic'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { Pet.adopt('kedi'); r.pet = Pet.select('kedi') === true && Pet.active() === 'kedi'; } catch (e) { r.pet = false; }
    try { _fx.add(500); const s = SlotMachine.spin(); r.slotmachine = typeof s.ok === 'boolean' && (s.ok === false || Array.isArray(s.roll)); } catch (e) { r.slotmachine = false; }
    try { Easter._found = {}; r.easter = Easter.find('ufo') === true && Easter.find('ufo') === false && Easter.konami(['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a']) === true; } catch (e) { r.easter = false; }
    try { _fx.set('diceDay', -1); const d = DailyDice.roll(); r.dailydice = d.ok === true && DailyDice.roll().ok === false; } catch (e) { r.dailydice = false; }
    try { _fx.add(1000); const b = RaceBet.place(100, 2); r.racebet = b.ok === true && RaceBet.settle(b, true).payout === 200; } catch (e) { r.racebet = false; }
    try { r.seasonalevents = SeasonalEvents.isActive('yilbasi', new Date(2026, 11, 1)) === true; } catch (e) { r.seasonalevents = false; }
    try { RaceEmoji._recent = []; r.raceemoji = RaceEmoji.send('🔥') === true && RaceEmoji.active().length === 1 && RaceEmoji.send('yok') === false; } catch (e) { r.raceemoji = false; }
    try { _fx.set('trophies', []); r.trophyroom = TrophyRoom.award('altin', 'Altın Kupa') === true && TrophyRoom.count() === 1 && TrophyRoom.layout().length === 1; } catch (e) { r.trophyroom = false; }
    try { ReplayGallery._replays = []; ReplayGallery.save('m', 30, []); ReplayGallery.save('m', 25, []); r.replaygallery = ReplayGallery.best('m').time === 25; } catch (e) { r.replaygallery = false; }
    try { CustomMusic._tracks = []; r.custommusic = CustomMusic.add('Şarkım') === true && CustomMusic.list().length === 1 && CustomMusic.remove('Şarkım') === true; } catch (e) { r.custommusic = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.Pet = Pet; window.SlotMachine = SlotMachine; window.Easter = Easter; window.DailyDice = DailyDice; window.RaceBet = RaceBet; window.SeasonalEvents = SeasonalEvents; window.RaceEmoji = RaceEmoji; window.TrophyRoom = TrophyRoom; window.ReplayGallery = ReplayGallery; window.CustomMusic = CustomMusic; window.FunExtra = FunExtra; }
