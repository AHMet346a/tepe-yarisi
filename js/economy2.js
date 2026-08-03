'use strict';
/* Economy2 — Ekonomi & Mağaza (2. Liste: E. #41–#50). ADDITIVE; mevcut BlackMarket köprü. */
const _ec = { get(k, d) { try { const v = SaveData.get(k); return v === undefined ? d : v; } catch (e) { return d; } }, set(k, v) { try { SaveData.set(k, v); } catch (e) {} },
  gold() { try { return (SaveData.get('gold')) || 0; } catch (e) { return 0; } },
  spend(n) { try { return SaveData.spendGold ? SaveData.spendGold(n) : (function () { const g = _ec.gold(); if (g < n) return false; SaveData.set('gold', g - n); return true; })(); } catch (e) { return false; } },
  add(n) { try { if (SaveData.addGold) SaveData.addGold(n); else SaveData.set('gold', _ec.gold() + n); } catch (e) {} } };

// #41 Kara borsa (mevcut BlackMarket köprü)
const BlackMarketX = { available() { return typeof BlackMarket !== 'undefined'; } };
// #42 Açık artırma evi
const Auction = {
  _lots: [],
  list() { return this._lots.filter(function (l) { return l.open; }); },
  create(item, minBid) { const lot = { id: 'A' + Math.random().toString(36).slice(2, 7), item: item, bid: minBid || 100, bidder: null, open: true }; this._lots.push(lot); return lot; },
  bid(lotId, who, amount) { const l = this._lots.find(function (x) { return x.id === lotId; }); if (!l || !l.open) return false; if (amount <= l.bid) return false; l.bid = amount; l.bidder = who; return true; },
  close(lotId) { const l = this._lots.find(function (x) { return x.id === lotId; }); if (l) { l.open = false; return { winner: l.bidder, price: l.bid }; } return null; } };
// #43 Piyango bileti
const Lottery = {
  price: 500,
  buy() { if (!_ec.spend(this.price)) return { ok: false }; const roll = Math.random(); let prize = 0; if (roll < 0.5) prize = 0; else if (roll < 0.85) prize = 250; else if (roll < 0.97) prize = 1500; else prize = 10000; if (prize) _ec.add(prize); return { ok: true, prize: prize, jackpot: prize === 10000 }; } };
// #44 VIP abonelik
const VIP = {
  active() { const exp = _ec.get('vipExp', 0); return Date.now() < exp; },
  activate(days) { const cur = this.active() ? _ec.get('vipExp', 0) : Date.now(); _ec.set('vipExp', cur + (days || 30) * 86400000); return this.active(); },
  goldMultiplier() { return this.active() ? 2 : 1; },
  perks() { return this.active() ? ['2x altın', 'reklamsız', 'günlük elmas', 'özel renk'] : []; } };
// #45 Promosyon kodu
const PromoCodes = {
  codes: { 'AHMET2026': { gold: 5000 }, 'TEPE': { gold: 1000 }, 'NITRO': { diamonds: 10 } },
  redeem(code) { code = String(code || '').toUpperCase(); const used = _ec.get('promoUsed', []); if (used.indexOf(code) >= 0) return { ok: false, reason: 'used' }; const r = this.codes[code]; if (!r) return { ok: false, reason: 'invalid' }; used.push(code); _ec.set('promoUsed', used); if (r.gold) _ec.add(r.gold); if (r.diamonds) { try { SaveData.set('diamonds', (_ec.get('diamonds', 0) + r.diamonds)); } catch (e) {} } return { ok: true, reward: r }; } };
// #46 Toplu alım indirimi
const BulkDiscount = {
  tiers: [{ min: 1, off: 0 }, { min: 5, off: 0.05 }, { min: 10, off: 0.12 }, { min: 25, off: 0.20 }],
  priceFor(unit, qty) { let off = 0; for (let i = 0; i < this.tiers.length; i++) if (qty >= this.tiers[i].min) off = this.tiers[i].off; return Math.round(unit * qty * (1 - off)); } };
// #47 İade sistemi
const Refund = {
  window: 300000, // 5 dk
  _log: [],
  record(itemId, price) { this._log.push({ itemId: itemId, price: price, t: Date.now() }); },
  refund(itemId) { const i = this._log.findIndex(function (x) { return x.itemId === itemId; }); if (i < 0) return { ok: false }; const rec = this._log[i]; if (Date.now() - rec.t > this.window) return { ok: false, reason: 'expired' }; this._log.splice(i, 1); _ec.add(Math.round(rec.price * 0.9)); return { ok: true, refunded: Math.round(rec.price * 0.9) }; } };
// #48 Kaynak dönüştürücü (altın ↔ elmas)
const Converter = {
  goldPerDiamond: 1000,
  toDiamonds(gold) { if (!_ec.spend(gold)) return { ok: false }; const d = Math.floor(gold / this.goldPerDiamond); try { SaveData.set('diamonds', (_ec.get('diamonds', 0) + d)); } catch (e) {} return { ok: true, diamonds: d }; },
  toGold(diamonds) { const cur = _ec.get('diamonds', 0); if (cur < diamonds) return { ok: false }; try { SaveData.set('diamonds', cur - diamonds); } catch (e) {} const g = diamonds * this.goldPerDiamond; _ec.add(g); return { ok: true, gold: g }; } };
// #49 Banka / faiz
const Bank = {
  rate: 0.02, // günlük %2
  balance() { return _ec.get('bank', 0); },
  deposit(n) { if (!_ec.spend(n)) return false; _ec.set('bank', this.balance() + n); _ec.set('bankT', Date.now()); return true; },
  withdraw(n) { const b = this.balance(); if (b < n) return false; _ec.set('bank', b - n); _ec.add(n); return true; },
  accrue() { const last = _ec.get('bankT', Date.now()); const days = Math.floor((Date.now() - last) / 86400000); if (days <= 0) return 0; const interest = Math.floor(this.balance() * this.rate * days); if (interest > 0) { _ec.set('bank', this.balance() + interest); _ec.set('bankT', Date.now()); } return interest; } };
// #50 Reklamla 2x ödül boost
const AdBoost = {
  offer(baseReward) { return { base: baseReward, boosted: baseReward * 2 }; },
  claim(baseReward, watched) { const total = watched ? baseReward * 2 : baseReward; _ec.add(total); return { granted: total, doubled: !!watched }; } };

const Economy2 = {
  version: '1.0',
  systems: ['BlackMarketX', 'Auction', 'Lottery', 'VIP', 'PromoCodes', 'BulkDiscount', 'Refund', 'Converter', 'Bank', 'AdBoost'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { r.blackmarketx = typeof BlackMarketX.available() === 'boolean'; } catch (e) { r.blackmarketx = false; }
    try { const l = Auction.create('jeep', 100); Auction.bid(l.id, 'ali', 200); const c = Auction.close(l.id); r.auction = c.winner === 'ali' && c.price === 200; } catch (e) { r.auction = false; }
    try { const before = _ec.gold(); _ec.add(1000); const res = Lottery.buy(); r.lottery = typeof res.ok === 'boolean'; } catch (e) { r.lottery = false; }
    try { VIP.activate(30); r.vip = VIP.active() === true && VIP.goldMultiplier() === 2; } catch (e) { r.vip = false; }
    try { const p = PromoCodes.redeem('TEPE'); r.promocodes = p.ok === true && PromoCodes.redeem('TEPE').ok === false; } catch (e) { r.promocodes = false; }
    try { r.bulkdiscount = BulkDiscount.priceFor(100, 10) < 1000 && BulkDiscount.priceFor(100, 1) === 100; } catch (e) { r.bulkdiscount = false; }
    try { Refund._log = []; Refund.record('x', 1000); r.refund = Refund.refund('x').ok === true; } catch (e) { r.refund = false; }
    try { _ec.add(2000); const cv = Converter.toDiamonds(1000); r.converter = cv.ok === true && cv.diamonds === 1; } catch (e) { r.converter = false; }
    try { _ec.set('bank', 0); _ec.add(1000); r.bank = Bank.deposit(500) === true && Bank.balance() === 500 && Bank.withdraw(500) === true; } catch (e) { r.bank = false; }
    try { const ab = AdBoost.claim(100, true); r.adboost = ab.granted === 200 && ab.doubled === true; } catch (e) { r.adboost = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};
if (typeof window !== 'undefined') { window.BlackMarketX = BlackMarketX; window.Auction = Auction; window.Lottery = Lottery; window.VIP = VIP; window.PromoCodes = PromoCodes; window.BulkDiscount = BulkDiscount; window.Refund = Refund; window.Converter = Converter; window.Bank = Bank; window.AdBoost = AdBoost; window.Economy2 = Economy2; }
