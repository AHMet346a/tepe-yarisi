'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   SHOP OFFERS  —  Sınırlı Süreli Mağaza Teklifleri (Sayaçlı İndirimler)
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıklar (hepsi güvenli-opsiyonel):
     · SaveData.get/set        → kalıcılık (localStorage YOK; her şey SaveData)
     · SaveData.spendGold/spendDiamonds → satın alma (para NaN korumalı)
     · SaveData.addGold/addDiamonds/addScrap/addPart/unlockVehicle → ödül ver
     · VehicleDefs[id].price   → araç orijinal fiyatı
     · UI.showToast / UI.goTo  → bildirim & geri dönüş (opsiyonel)
     · Audio.* , Particles.*   → efektler (opsiyonel)
     · Date.now()              → tüm zamanlama

   İÇERİK
     1) DÖNEN TEKLİFLER : Date.now tabanlı, her ~6 saatte yenilenen 4 teklif.
        Havuz: indirimli araç, elmas paketi, sandık, parça bundle, mega deal.
        Her teklif: ORİJİNAL fiyat + İNDİRİMLİ fiyat + %indirim + GERİ SAYIM.
     2) FLASH DEAL      : nadir, çok kısa süreli, büyük indirimli mega teklif.

   API
     ShopOffers.draw(ctx, W, H)
     ShopOffers.handleClick(x, y)   → 'back' | null
     ShopOffers.getActiveOffers()   → [{ id, type, name, orig, price, ... }]

   KURALLAR: localStorage kullanmaz. Tüm para giriş/çıkışları NaN korumalıdır.
             Zaten satın alınan / zaten sahip olunan araç tekrar satılmaz.
   ═══════════════════════════════════════════════════════════════════════════ */
const ShopOffers = {

  // ── Zaman sabitleri ─────────────────────────────────────────────────────────
  HOUR_MS: 3600000,
  SLOT_HOURS: 6,            // dönen teklifler her 6 saatte bir yenilenir
  ACTIVE_COUNT: 4,          // aynı anda gösterilen dönen teklif sayısı
  FLASH_MIN: 45,            // flash penceresi (dakika)
  FLASH_RARITY: 3,          // flash penceresi hash % RARITY === 0 → aktif (≈1/3)

  _SAVE_KEY: 'shopOffers',

  // ── Tema (koyu / turuncu) ────────────────────────────────────────────────────
  COL: {
    bg0: '#0a0e1c', bg1: '#141a30',
    panel: '#171d33', panelHi: '#1e2745',
    line: 'rgba(255,255,255,0.09)',
    text: '#f2f5ff', mute: '#8b97b8',
    orange: '#ff8a2b', orangeHi: '#ffb44d', gold: '#ffcf3f',
    green: '#39d98a', red: '#ff5a5a', blue: '#4fd0ff',
    flash: '#ff3b6b', flashHi: '#ff86a3'
  },

  // ── Çalışma zamanı durumu ─────────────────────────────────────────────────────
  _state: null,
  _t: 0,
  _btns: [],

  // ══════════════════════════════════════════════════════════════════════════
  //  TEKLİF HAVUZLARI  (deterministik — slot tohumuna göre seçilir)
  //   type: 'vehicle' | 'diamonds' | 'chest' | 'parts' | 'mega'
  //   cur : 'gold' | 'diamonds'  (indirimli fiyatın ödendiği birim)
  //   disc: indirim oranı (0..1)
  //   base: (araç DIŞI teklifler için) orijinal fiyat
  //   reward: sandık/parça/mega için verilecek ödül paketi
  // ══════════════════════════════════════════════════════════════════════════
  _POOL: [
    // ── İndirimli araçlar (orijinal fiyat VehicleDefs'ten okunur) ──
    { id: 'v_offroader', type: 'vehicle', cur: 'gold', icon: '🚙', name: 'OFF-ROADER',   vehicle: 'offroader',  disc: 0.30 },
    { id: 'v_pickup',    type: 'vehicle', cur: 'gold', icon: '🛻', name: 'PICKUP',        vehicle: 'pickup',     disc: 0.35 },
    { id: 'v_dune4x4',   type: 'vehicle', cur: 'gold', icon: '🏜️', name: 'DUNE 4X4',      vehicle: 'dune4x4',    disc: 0.30 },
    { id: 'v_rallycar',  type: 'vehicle', cur: 'gold', icon: '🏁', name: 'RALLY CAR',     vehicle: 'rallycar',   disc: 0.40 },
    { id: 'v_musclecar', type: 'vehicle', cur: 'gold', icon: '🏎️', name: 'MUSCLE CAR',    vehicle: 'musclecar',  disc: 0.35 },
    { id: 'v_snowmobile',type: 'vehicle', cur: 'gold', icon: '🛷', name: 'SNOW MOBILE',   vehicle: 'snowmobile', disc: 0.30 },
    { id: 'v_atv',       type: 'vehicle', cur: 'gold', icon: '🏍️', name: 'ATV / QUAD',    vehicle: 'atv',        disc: 0.25 },
    { id: 'v_trophy',    type: 'vehicle', cur: 'gold', icon: '🏆', name: 'TROPHY TRUCK',  vehicle: 'trophytruck',disc: 0.40 },

    // ── Elmas paketleri (altınla al → elmas kazan) ──
    { id: 'd_pouch', type: 'diamonds', cur: 'gold', icon: '◆', name: 'ELMAS KESESİ',  base: 6000,  amount: 60,  disc: 0.25 },
    { id: 'd_chest', type: 'diamonds', cur: 'gold', icon: '💎', name: 'ELMAS SANDIĞI', base: 14000, amount: 160, disc: 0.35 },

    // ── Sandıklar (sabit, garantili ödül paketi) ──
    { id: 'c_bronze', type: 'chest', cur: 'gold',     icon: '📦', name: 'BRONZ SANDIK', base: 5000, disc: 0.30, reward: { gold: 4200, scrap: 150 } },
    { id: 'c_gold',   type: 'chest', cur: 'diamonds', icon: '🎁', name: 'ALTIN SANDIK', base: 60,   disc: 0.30, reward: { gold: 16000, scrap: 400, diamonds: 10 } },

    // ── Parça paketleri (parça + hurda) ──
    { id: 'p_nitro',  type: 'parts', cur: 'diamonds', icon: '🔩', name: 'NİTRO PAKETİ',  base: 50, disc: 0.30, reward: { part: 'nitro',       scrap: 220 } },
    { id: 'p_wing',   type: 'parts', cur: 'diamonds', icon: '🪂', name: 'KANAT PAKETİ',  base: 55, disc: 0.30, reward: { part: 'wing',        scrap: 240 } },
    { id: 'p_magnet', type: 'parts', cur: 'diamonds', icon: '🧲', name: 'MIKNATIS SETİ', base: 45, disc: 0.25, reward: { part: 'coin_magnet', scrap: 200 } }
  ],

  // ── Flash / Mega havuzu (nadir, büyük indirimli) ──
  _MEGA: [
    { id: 'm_bugatti', type: 'mega', cur: 'diamonds', icon: '🚗', name: 'MEGA: BUGATTI',    disc: 0.55, base: 260, reward: { vehicle: 'bugatti',    diamonds: 30, scrap: 400 } },
    { id: 'm_super',   type: 'mega', cur: 'diamonds', icon: '🏎️', name: 'MEGA: SUPERCAR',   disc: 0.55, base: 220, reward: { vehicle: 'supercar',   diamonds: 25, scrap: 350 } },
    { id: 'm_cyber',   type: 'mega', cur: 'diamonds', icon: '🛻', name: 'MEGA: CYBERTRUCK', disc: 0.60, base: 240, reward: { vehicle: 'cybertruck', diamonds: 25, scrap: 350 } },
    { id: 'm_heli',    type: 'mega', cur: 'diamonds', icon: '🚁', name: 'MEGA: HELİKOPTER', disc: 0.60, base: 300, reward: { vehicle: 'helicopter', diamonds: 40, scrap: 500 } }
  ],

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR — sayı / kalıcılık
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fallback) { v = Number(v); return isFinite(v) ? v : (Number(fallback) || 0); },
  _int(v, fallback) { return Math.floor(this._num(v, fallback)); },
  _now() { return Date.now(); },

  _fresh() {
    return {
      purchased: {},                 // { slotKey: true }
      seed: (Math.floor(Math.random() * 1e9) % 2000000000) + 1   // oyuncuya özgü rotasyon tohumu
    };
  },

  _get() {
    if (this._state) return this._state;
    let d = null;
    try { if (typeof SaveData !== 'undefined' && SaveData.get) d = SaveData.get(this._SAVE_KEY); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = this._fresh();
    if (!d.purchased || typeof d.purchased !== 'object' || Array.isArray(d.purchased)) d.purchased = {};
    d.seed = Math.max(1, this._int(d.seed, this._int(Math.random() * 1e9, 1) + 1));
    this._state = d;
    return this._state;
  },

  _save() {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, this._state); } catch (e) {}
  },

  _hash(n) {
    // 32-bit karıştırma (deterministik, kayıt gerektirmez)
    let h = (n | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SLOT / ZAMAN
  // ══════════════════════════════════════════════════════════════════════════
  _slotMs() { return this.SLOT_HOURS * this.HOUR_MS; },
  _slotIndex() { return Math.floor(this._now() / this._slotMs()); },
  _slotEndMs() { return (this._slotIndex() + 1) * this._slotMs(); },
  slotRemainMs() { return Math.max(0, this._slotEndMs() - this._now()); },

  _flashMs() { return this.FLASH_MIN * 60000; },
  _flashIndex() { return Math.floor(this._now() / this._flashMs()); },
  _flashEndMs() { return (this._flashIndex() + 1) * this._flashMs(); },
  flashRemainMs() { return Math.max(0, this._flashEndMs() - this._now()); },
  flashActive() { return this._hash(this._flashIndex() ^ 0x5f3a) % this.FLASH_RARITY === 0; },

  // Deterministik karıştırma (slot tohumu → sabit sıra)
  _shuffledPool(pool, seed) {
    const idx = [];
    for (let i = 0; i < pool.length; i++) idx.push(i);
    let s = (seed >>> 0) % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
    }
    return idx.map(i => pool[i]);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  TEKLİF HESABI  (template → çözümlenmiş teklif)
  // ══════════════════════════════════════════════════════════════════════════
  _vehiclePrice(vid) {
    try {
      if (typeof VehicleDefs !== 'undefined' && VehicleDefs[vid] && isFinite(VehicleDefs[vid].price)) {
        return Math.max(0, this._int(VehicleDefs[vid].price, 0));
      }
    } catch (e) {}
    return 20000;   // güvenli varsayılan
  },

  _ownsVehicle(vid) {
    try {
      const owned = (typeof SaveData !== 'undefined' && SaveData.get) ? SaveData.get('ownedVehicles') : null;
      return Array.isArray(owned) && owned.indexOf(vid) !== -1;
    } catch (e) { return false; }
  },

  _slotKey(tpl, flash) {
    return (flash ? ('f' + this._flashIndex()) : ('s' + this._slotIndex())) + '_' + tpl.id;
  },

  _rewardOf(tpl) {
    if (tpl.type === 'vehicle')  return { vehicle: tpl.vehicle };
    if (tpl.type === 'diamonds') return { diamonds: this._int(tpl.amount, 0) };
    return (tpl.reward && typeof tpl.reward === 'object') ? tpl.reward : {};
  },

  _resolve(tpl, flash) {
    const disc = Math.max(0, Math.min(0.95, this._num(tpl.disc, 0)));
    const orig = (tpl.type === 'vehicle') ? this._vehiclePrice(tpl.vehicle) : Math.max(0, this._int(tpl.base, 0));
    const price = Math.max(0, Math.floor(orig * (1 - disc)));
    const key = this._slotKey(tpl, flash);
    const owned = (tpl.type === 'vehicle') ? this._ownsVehicle(tpl.vehicle)
                : (tpl.type === 'mega' && tpl.reward && tpl.reward.vehicle) ? this._ownsVehicle(tpl.reward.vehicle)
                : false;
    return {
      id: tpl.id,
      type: tpl.type,
      name: tpl.name,
      icon: tpl.icon,
      cur: (tpl.cur === 'diamonds') ? 'diamonds' : 'gold',
      orig: orig,
      price: price,
      discPct: Math.round(disc * 100),
      reward: this._rewardOf(tpl),
      flash: !!flash,
      remainMs: flash ? this.flashRemainMs() : this.slotRemainMs(),
      owned: owned,
      purchased: !!this._get().purchased[key],
      _key: key,
      _tpl: tpl
    };
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC — getActiveOffers
  // ══════════════════════════════════════════════════════════════════════════
  getActiveOffers() {
    const seed = (this._get().seed >>> 0) ^ this._hash(this._slotIndex());
    const order = this._shuffledPool(this._POOL, seed);
    const out = [];
    for (let i = 0; i < order.length && out.length < this.ACTIVE_COUNT; i++) {
      out.push(this._resolve(order[i], false));
    }
    return out;
  },

  activeFlash() {
    if (!this.flashActive()) return null;
    const idx = this._hash(this._flashIndex()) % this._MEGA.length;
    return this._resolve(this._MEGA[idx], true);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SATIN ALMA  (para NaN korumalı; zaten alınan/sahip olunan engellenir)
  // ══════════════════════════════════════════════════════════════════════════
  _curSym(cur) { return cur === 'diamonds' ? '◆' : '⧆'; },

  _grant(reward) {
    if (!reward || typeof reward !== 'object') return;
    try {
      if (reward.gold)     { const g = this._int(reward.gold, 0);     if (g > 0 && typeof SaveData !== 'undefined' && SaveData.addGold)     SaveData.addGold(g); }
      if (reward.diamonds) { const d = this._int(reward.diamonds, 0); if (d > 0 && typeof SaveData !== 'undefined' && SaveData.addDiamonds) SaveData.addDiamonds(d); }
      if (reward.scrap)    { const c = this._int(reward.scrap, 0);    if (c > 0 && typeof SaveData !== 'undefined' && SaveData.addScrap)    SaveData.addScrap(c); }
      if (reward.part && typeof SaveData !== 'undefined' && SaveData.addPart)          SaveData.addPart(reward.part);
      if (reward.vehicle && typeof SaveData !== 'undefined' && SaveData.unlockVehicle) SaveData.unlockVehicle(reward.vehicle);
    } catch (e) {}
  },

  _rewardShort(o) {
    const r = o.reward || {};
    const parts = [];
    if (o.type === 'vehicle') return '🚗 ' + o.name;
    if (r.vehicle)  parts.push('🚗 ARAÇ');
    if (r.diamonds) parts.push('◆' + this._int(r.diamonds, 0));
    if (r.gold)     parts.push('⧆' + this._fmtNum(r.gold));
    if (r.scrap)    parts.push('◈' + this._fmtNum(r.scrap));
    if (r.part)     parts.push('🔩 ' + r.part);
    return parts.join('  ');
  },

  _buy(o) {
    if (!o) return false;
    const s = this._get();
    if (s.purchased[o._key]) { if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Bu teklif zaten alındı!'); return false; }
    if (o.owned)             { if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Bu araç zaten sende var!'); s.purchased[o._key] = true; this._save(); return false; }

    const price = Math.max(0, this._int(o.price, 0));
    let ok = false;
    try {
      if (o.cur === 'diamonds') {
        if (typeof SaveData === 'undefined' || !SaveData.spendDiamonds) return false;
        ok = SaveData.spendDiamonds(price);
      } else {
        if (typeof SaveData === 'undefined' || !SaveData.spendGold) return false;
        ok = SaveData.spendGold(price);
      }
    } catch (e) { ok = false; }

    if (!ok) {
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Yeterli ' + (o.cur === 'diamonds' ? 'elmas' : 'altın') + ' yok! ' + this._curSym(o.cur) + this._fmtNum(price));
      return false;
    }

    this._grant(o.reward);
    s.purchased[o._key] = true;
    this._save();

    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('✅ Alındı: ' + this._rewardShort(o));
    try { if (typeof Audio !== 'undefined') { if (o.flash && Audio.playPurchaseBig) Audio.playPurchaseBig(); else if (Audio.playPurchase) Audio.playPurchase(); else if (Audio.playPickup) Audio.playPickup(); } } catch (e) {}
    try { if (typeof Particles !== 'undefined' && Particles.burst) Particles.burst(); } catch (e) {}
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  BİÇİMLENDİRME
  // ══════════════════════════════════════════════════════════════════════════
  _fmtNum(n) {
    n = this._num(n, 0);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.floor(n));
  },
  _fmtCountdown(ms) {
    ms = Math.max(0, this._num(ms, 0));
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return d + 'g ' + h + 's';
    if (h > 0) return h + 's ' + m + 'dk';
    if (m > 0) return m + 'dk ' + s + 'sn';
    return s + 'sn';
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ÇİZİM YARDIMCILARI
  // ══════════════════════════════════════════════════════════════════════════
  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  _button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const enabled = opts.enabled !== false;
    let bg = opts.bg || this.COL.orange;
    if (!enabled) bg = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = bg;
    this._rr(ctx, x, y, w, h, 9); ctx.fill();
    if (opts.glow && enabled) {
      ctx.strokeStyle = opts.glowCol || this.COL.orangeHi; ctx.lineWidth = 2;
      this._rr(ctx, x, y, w, h, 9); ctx.stroke();
    }
    ctx.fillStyle = enabled ? (opts.fg || '#1a1206') : this.COL.mute;
    ctx.font = 'bold ' + (opts.fs || 13) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  },

  // İndirim rozeti
  _discBadge(ctx, x, y, pct, flash) {
    const w = 52, h = 22;
    ctx.fillStyle = flash ? this.COL.flash : this.COL.red;
    this._rr(ctx, x, y, w, h, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('-' + pct + '%', x + w / 2, y + h / 2 + 1);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  DRAW  (ana giriş)
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H) {
    this._t += 0.016;
    this._btns = [];
    this._get();

    // Arkaplan
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg0); g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    this._drawHeader(ctx, W, H);

    let y = 60;
    const flash = this.activeFlash();
    if (flash && !flash.purchased) {
      y = this._drawFlashBanner(ctx, W, H, y, flash);
    }

    // Dönen teklif kartları — kalan yüksekliğe göre boyutlanır
    const offers = this.getActiveOffers();
    const n = offers.length || 1;
    const bottomPad = 14;
    const cardGap = 10;
    const availH = (H - bottomPad) - y;
    const cardH = Math.max(72, Math.min(104, (availH - cardGap * (n - 1)) / n));
    for (let i = 0; i < offers.length; i++) {
      this._drawOfferCard(ctx, 12, y, W - 24, cardH, offers[i]);
      y += cardH + cardGap;
    }
  },

  _drawHeader(ctx, W, H) {
    // Geri butonu
    ctx.fillStyle = this.COL.panel;
    this._rr(ctx, 12, 12, 40, 34, 9); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; this._rr(ctx, 12, 12, 40, 34, 9); ctx.stroke();
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹', 32, 30);
    this._btns.push({ x: 12, y: 12, w: 44, h: 44, act: 'back' });

    // Başlık
    ctx.fillStyle = this.COL.orange; ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🔥 SINIRLI TEKLİFLER', 62, 22);
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    ctx.fillText('Yenilenme: ' + this._fmtCountdown(this.slotRemainMs()), 62, 39);

    // Bakiye (sağ üst)
    let gold = 0, dia = 0;
    try { if (typeof SaveData !== 'undefined' && SaveData.get) { gold = this._int(SaveData.get('gold'), 0); dia = this._int(SaveData.get('diamonds'), 0); } } catch (e) {}
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.gold; ctx.font = 'bold 13px Arial';
    ctx.fillText('⧆ ' + this._fmtNum(gold), W - 14, 20);
    ctx.fillStyle = this.COL.blue;
    ctx.fillText('◆ ' + this._fmtNum(dia), W - 14, 38);
  },

  // ── Flash Deal bannerı (nadir, vurgulu) ──
  _drawFlashBanner(ctx, W, H, y, o) {
    const h = 78;
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 5);
    // Zemin
    const grad = ctx.createLinearGradient(12, y, W - 12, y);
    grad.addColorStop(0, 'rgba(255,59,107,0.22)'); grad.addColorStop(1, 'rgba(255,138,43,0.16)');
    ctx.fillStyle = grad; this._rr(ctx, 12, y, W - 24, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,59,107,' + (0.45 + 0.4 * pulse).toFixed(3) + ')'; ctx.lineWidth = 2.5;
    this._rr(ctx, 12, y, W - 24, h, 12); ctx.stroke();

    // ⚡ FLASH etiketi
    ctx.fillStyle = this.COL.flash; this._rr(ctx, 22, y + 10, 96, 20, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('⚡ FLASH DEAL', 30, y + 20);

    // İkon + isim
    ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.icon, 40, y + 52);
    ctx.textAlign = 'left'; ctx.fillStyle = this.COL.text; ctx.font = 'bold 15px Arial';
    ctx.fillText(o.name, 64, y + 46);
    ctx.fillStyle = this.COL.flashHi; ctx.font = 'bold 11px Arial';
    ctx.fillText('⏳ ' + this._fmtCountdown(o.remainMs) + ' kaldı!', 64, y + 62);

    // İndirim rozeti (sağ üst)
    this._discBadge(ctx, W - 12 - 58, y + 10, o.discPct, true);

    // Fiyat + AL (sağ alt)
    const sym = this._curSym(o.cur);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    const origTxt = sym + this._fmtNum(o.orig);
    ctx.fillText(origTxt, W - 108, y + 44);
    const ow = ctx.measureText(origTxt).width;
    ctx.strokeStyle = this.COL.red; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W - 108 - ow, y + 44); ctx.lineTo(W - 108, y + 44); ctx.stroke();

    const bw = 92, bx = W - 12 - bw - 6, by = y + h - 30;
    if (o.owned) {
      ctx.fillStyle = this.COL.green; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right';
      ctx.fillText('✓ SENDE VAR', W - 20, y + h - 18);
    } else {
      this._button(ctx, bx, by, bw, 32, sym + ' ' + this._fmtNum(o.price), { glow: true, bg: this.COL.flash, glowCol: this.COL.flashHi, fg: '#fff', fs: 13 });
      this._btns.push({ x: bx, y: by, w: bw, h: 32, act: 'buyflash' });
    }
    return y + h + 12;
  },

  // ── Standart dönen teklif kartı ──
  _drawOfferCard(ctx, x, y, w, h, o) {
    ctx.fillStyle = this.COL.panel; this._rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = o.purchased ? 'rgba(57,217,138,0.4)' : this.COL.line; ctx.lineWidth = 1.5;
    this._rr(ctx, x, y, w, h, 12); ctx.stroke();

    // İkon rozeti
    ctx.fillStyle = 'rgba(255,138,43,0.16)'; this._rr(ctx, x + 12, y + (h - 46) / 2, 46, 46, 10); ctx.fill();
    ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.icon, x + 12 + 23, y + h / 2);

    // Başlık + ödül açıklaması
    ctx.textAlign = 'left';
    ctx.fillStyle = this.COL.orange; ctx.font = 'bold 14px Arial';
    ctx.fillText(o.name, x + 68, y + 22);
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    ctx.fillText(this._rewardShort(o), x + 68, y + 40);

    // Geri sayım
    ctx.fillStyle = this.COL.blue; ctx.font = 'bold 10px Arial';
    ctx.fillText('⏳ ' + this._fmtCountdown(o.remainMs), x + 68, y + h - 14);

    // İndirim rozeti (sağ üst)
    this._discBadge(ctx, x + w - 12 - 52, y + 10, o.discPct, false);

    // Fiyatlar (sağ) — orijinal üstü çizili + indirimli
    const sym = this._curSym(o.cur);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    const origTxt = sym + this._fmtNum(o.orig);
    const oy = y + 42;
    ctx.fillText(origTxt, x + w - 16, oy);
    const ow = ctx.measureText(origTxt).width;
    ctx.strokeStyle = this.COL.red; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + w - 16 - ow, oy); ctx.lineTo(x + w - 16, oy); ctx.stroke();

    // Satın alma durumu / buton
    const bw = 96, bx = x + w - bw - 14, by = y + h - 30;
    if (o.purchased) {
      ctx.fillStyle = this.COL.green; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._rr(ctx, bx, by, bw, 24, 8); ctx.fillStyle = 'rgba(57,217,138,0.14)'; ctx.fill();
      ctx.fillStyle = this.COL.green; ctx.fillText('✓ ALINDI', bx + bw / 2, by + 13);
    } else if (o.owned) {
      ctx.fillStyle = this.COL.green; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      this._rr(ctx, bx, by, bw, 24, 8); ctx.fillStyle = 'rgba(57,217,138,0.14)'; ctx.fill();
      ctx.fillStyle = this.COL.green; ctx.fillText('✓ SENDE VAR', bx + bw / 2, by + 13);
    } else {
      this._button(ctx, bx, by, bw, 32, sym + ' ' + this._fmtNum(o.price), { glow: true, fs: 13 });
      this._btns.push({ x: bx, y: by, w: bw, h: 32, act: 'buy:' + o.id });
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CLICK  (ana giriş) → 'back' | null
  // ══════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return this._doAction(b.act);
      }
    }
    return null;
  },

  _doAction(act) {
    if (act === 'back') return 'back';

    try { if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick(); } catch (e) {}

    if (act === 'buyflash') {
      const f = this.activeFlash();
      if (f) this._buy(f);
      return null;
    }
    if (act.indexOf('buy:') === 0) {
      const id = act.slice(4);
      const o = this.getActiveOffers().find(v => v.id === id);
      if (o) this._buy(o);
      return null;
    }
    return null;
  }
};

// Global erişim (tarayıcı) — modül dışı script'ler için
if (typeof window !== 'undefined') window.ShopOffers = ShopOffers;
