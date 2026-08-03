'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KARA BORSA  —  Gizli Tüccar / Günlük Rotasyonlu Gizemli Fırsatlar
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Tüm bağımlılıklar güvenli-opsiyonel (guard'lı):
     · SaveData.get/set                    → kalıcılık (localStorage YOK)
     · Economy.spendGold / SaveData.spendGold        → altın harca
     · Economy.spendDiamonds / SaveData.spendDiamonds → elmas harca
     · SaveData.addGold/addDiamonds/addScrap/addItem/unlockVehicle → ödül ver
     · Economy.addGold / Economy.addDiamonds         → alternatif ödül yolu
     · VehicleDefs[id].price               → sürpriz araç orijinal fiyatı
     · UI.showToast / Audio.* / Particles.*→ efekt & bildirim (opsiyonel)

   İÇERİK
     Gizemli tüccar her GÜN (Date.now/86400000) yeni, DETERMİNİSTİK 3-4 fırsat
     açar. Havuz: büyük altın paketi (%40), elmas paketi, indirimli boost/nitro
     yenileme, %50 indirimli sürpriz araç. Sınırlı stok (her fırsat 1 kez) +
     gün sonuna geri sayım. Gün değişince stok yenilenir (bought temizlenir).

   API
     BlackMarket.draw(ctx, W, H, dt)
     BlackMarket.handleClick(x, y)  → 'back' | null
     BlackMarket.update(dt)         → (opsiyonel) animasyon/gün tazeleme

   MENÜ ENTEGRASYONU (öneri): ikon id 'market2', etiket 'KARABORSA', ikon 🕯️
   ═══════════════════════════════════════════════════════════════════════════ */
const BlackMarket = {

  _SAVE_KEY: 'blackMarket',
  DAY_MS: 86400000,
  COUNT_MIN: 3,           // günlük en az fırsat
  COUNT_MAX: 4,           // günlük en fazla fırsat

  // ── Tema: koyu + zümrüt/mor gizem, mum/fener ışığı ──
  COL: {
    bg0: '#10131f', bg1: '#1a2e1f', bg2: '#0c0f18',
    panel: '#16221c', panelHi: '#1d3327',
    line: 'rgba(77,214,160,0.16)',
    text: '#eef7ef', mute: '#7f9d8b',
    emerald: '#4dd6a0', emeraldHi: '#7bf0c2',
    gold: '#ffd54a', goldHi: '#ffe89a',
    purple: '#a97bff', purpleHi: '#c9adff',
    red: '#ff6a6a', candle: '#ffb347'
  },

  // ── Çalışma zamanı ──
  _t: 0,
  _btns: [],
  _state: null,
  _warn: '',          // yetersiz bakiye vb. kısa uyarı
  _warnT: 0,
  _flashKey: '',      // son satın alınan (parıltı efekti)
  _flashT: 0,

  // ══════════════════════════════════════════════════════════════════════════
  //  FIRSAT HAVUZU  (deterministik — gün tohumuna göre seçilir)
  //   cur   : ödeme birimi 'gold' | 'diamonds'
  //   base  : orijinal fiyat (araç için VehicleDefs'ten okunur)
  //   disc  : indirim oranı (0..1)
  //   reward: { gold?, diamonds?, scrap?, item?, count?, vehicle? }
  // ══════════════════════════════════════════════════════════════════════════
  _POOL: [
    { id: 'gold_big',   icon: '💰', name: 'BÜYÜK ALTIN PAKETİ', cur: 'diamonds', base: 80,  disc: 0.40, reward: { gold: 40000 } },
    { id: 'gold_mega',  icon: '🏦', name: 'HAZİNE SANDIĞI',      cur: 'diamonds', base: 140, disc: 0.40, reward: { gold: 85000 } },
    { id: 'dia_pack',   icon: '💎', name: 'ELMAS PAKETİ',        cur: 'gold',     base: 14000, disc: 0.35, reward: { diamonds: 90 } },
    { id: 'dia_pouch',  icon: '◆',  name: 'ELMAS KESESİ',        cur: 'gold',     base: 7000,  disc: 0.30, reward: { diamonds: 40 } },
    { id: 'nitro_ref',  icon: '🔥', name: 'NİTRO YENİLEME x3',   cur: 'gold',     base: 9000,  disc: 0.45, reward: { item: 'super_nitro', count: 3 } },
    { id: 'boost_2x',   icon: '⚡', name: '2x ALTIN BOOST x2',   cur: 'gold',     base: 6000,  disc: 0.45, reward: { item: 'double_coins', count: 2 } },
    { id: 'boost_rkt',  icon: '🎇', name: 'ROKET BOOST x2',      cur: 'gold',     base: 8000,  disc: 0.50, reward: { item: 'rocket_boost', count: 2 } },
    { id: 'scrap_bag',  icon: '⚙️', name: 'GİZLİ HURDA ÇUVALI',  cur: 'gold',     base: 5000,  disc: 0.40, reward: { scrap: 800 } },
    { id: 'car_mystery',icon: '🚗', name: 'SÜRPRİZ ARAÇ',        cur: 'gold',     base: 0,     disc: 0.50, reward: { vehicle: '__mystery__' } }
  ],

  // Sürpriz araç adayları (deterministik seçim; sahip olunmayan ilki seçilir)
  _CAR_POOL: ['rallycar', 'musclecar', 'sportscar', 'superdiesel', 'dunebuggy',
              'offroader', 'pickup', 'atv', 'snowmobile', 'trophytruck', 'dune4x4'],

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR — sayı / gün / hash
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, f) { v = Number(v); return isFinite(v) ? v : (Number(f) || 0); },
  _int(v, f) { return Math.floor(this._num(v, f)); },
  _now() { return Date.now(); },
  _day() { return Math.floor(this._now() / this.DAY_MS); },
  _dayEndMs() { return (this._day() + 1) * this.DAY_MS; },
  _remainMs() { return Math.max(0, this._dayEndMs() - this._now()); },

  _hash(n) {
    let h = (n | 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0);
  },

  // ── Kalıcılık: SaveData.get('blackMarket') = { day, bought:[] } ──
  _get() {
    if (this._state) { this._checkDay(); return this._state; }
    let d = null;
    try { if (typeof SaveData !== 'undefined' && SaveData.get) d = SaveData.get(this._SAVE_KEY); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = { day: this._day(), bought: [] };
    if (!Array.isArray(d.bought)) d.bought = [];
    d.day = this._int(d.day, this._day());
    this._state = d;
    this._checkDay();
    return this._state;
  },

  _save() {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, this._state); } catch (e) {}
  },

  // Gün değişince stok yenilenir (bought temizlenir)
  _checkDay() {
    const s = this._state; if (!s) return;
    const day = this._day();
    if (s.day !== day) { s.day = day; s.bought = []; this._save(); }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  GÜNLÜK FIRSAT SEÇİMİ (deterministik)
  // ══════════════════════════════════════════════════════════════════════════
  _shuffledByDay() {
    const seed = this._hash(this._day() ^ 0x4b0b);
    const idx = [];
    for (let i = 0; i < this._POOL.length; i++) idx.push(i);
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
    }
    return idx.map(i => this._POOL[i]);
  },

  _vehiclePrice(vid) {
    try {
      if (typeof VehicleDefs !== 'undefined' && VehicleDefs[vid] && isFinite(VehicleDefs[vid].price) && VehicleDefs[vid].price > 0)
        return this._int(VehicleDefs[vid].price, 20000);
    } catch (e) {}
    return 20000;
  },

  _ownsVehicle(vid) {
    try {
      const owned = (typeof SaveData !== 'undefined' && SaveData.get) ? SaveData.get('ownedVehicles') : null;
      return Array.isArray(owned) && owned.indexOf(vid) !== -1;
    } catch (e) { return false; }
  },

  // Gün tohumuna göre sahip olunmayan ilk aday aracı seç (hepsi varsa altın'a çevir)
  _pickMysteryCar() {
    const seed = this._hash(this._day() ^ 0x77aa);
    const off = seed % this._CAR_POOL.length;
    for (let i = 0; i < this._CAR_POOL.length; i++) {
      const vid = this._CAR_POOL[(off + i) % this._CAR_POOL.length];
      if (!this._ownsVehicle(vid)) return vid;
    }
    return null;   // hepsi sende → araç yerine altın verilir
  },

  _resolve(tpl) {
    const disc = Math.max(0, Math.min(0.95, this._num(tpl.disc, 0)));
    let icon = tpl.icon, name = tpl.name, base, reward, subtitle;

    if (tpl.reward && tpl.reward.vehicle === '__mystery__') {
      const vid = this._pickMysteryCar();
      if (vid) {
        base = this._vehiclePrice(vid);
        reward = { vehicle: vid };
        const vn = (typeof VehicleDefs !== 'undefined' && VehicleDefs[vid] && VehicleDefs[vid].name) ? VehicleDefs[vid].name : vid;
        subtitle = '🚗 ' + String(vn).toUpperCase();
      } else {
        // tüm araçlar sahiplenilmiş → altın telafisi
        base = this._int(tpl.base, 0) || 30000;
        reward = { gold: 25000 };
        subtitle = '💰 25.000 ALTIN';
      }
    } else {
      base = Math.max(0, this._int(tpl.base, 0));
      reward = (tpl.reward && typeof tpl.reward === 'object') ? tpl.reward : {};
      subtitle = this._rewardShort(reward);
    }

    const price = Math.max(0, Math.floor(base * (1 - disc)));
    return {
      id: tpl.id, icon: icon, name: name, subtitle: subtitle,
      cur: (tpl.cur === 'diamonds') ? 'diamonds' : 'gold',
      orig: base, price: price, discPct: Math.round(disc * 100),
      reward: reward
    };
  },

  getDeals() {
    const order = this._shuffledByDay();
    const n = this.COUNT_MIN + (this._hash(this._day() ^ 0x1234) % (this.COUNT_MAX - this.COUNT_MIN + 1));
    const out = [];
    for (let i = 0; i < order.length && out.length < n; i++) out.push(this._resolve(order[i]));
    return out;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PARA — harcama & ödül (hepsi guard'lı, NaN korumalı)
  // ══════════════════════════════════════════════════════════════════════════
  _getGold() {
    try { if (typeof SaveData !== 'undefined' && SaveData.get) return this._int(SaveData.get('gold'), 0); } catch (e) {}
    return 0;
  },
  _getDiamonds() {
    try { if (typeof SaveData !== 'undefined' && SaveData.get) return this._int(SaveData.get('diamonds'), 0); } catch (e) {}
    return 0;
  },

  _spendGold(n) {
    n = Math.max(0, this._int(n, 0));
    try {
      if (typeof Economy !== 'undefined' && Economy && Economy.spendGold) return !!Economy.spendGold(n);
      if (typeof SaveData !== 'undefined' && SaveData.spendGold) return !!SaveData.spendGold(n);
      // Son çare — düz SaveData get/set
      if (typeof SaveData !== 'undefined' && SaveData.get && SaveData.set) {
        const g = this._int(SaveData.get('gold'), 0);
        if (g < n) return false;
        SaveData.set('gold', g - n); return true;
      }
    } catch (e) {}
    return false;
  },
  _spendDiamonds(n) {
    n = Math.max(0, this._int(n, 0));
    try {
      if (typeof Economy !== 'undefined' && Economy && Economy.spendDiamonds) return !!Economy.spendDiamonds(n);
      if (typeof SaveData !== 'undefined' && SaveData.spendDiamonds) return !!SaveData.spendDiamonds(n);
      if (typeof SaveData !== 'undefined' && SaveData.get && SaveData.set) {
        const d = this._int(SaveData.get('diamonds'), 0);
        if (d < n) return false;
        SaveData.set('diamonds', d - n); return true;
      }
    } catch (e) {}
    return false;
  },

  _addGold(n) {
    n = Math.max(0, this._int(n, 0)); if (n <= 0) return;
    try {
      if (typeof SaveData !== 'undefined' && SaveData.addGold) return SaveData.addGold(n);
      if (typeof Economy !== 'undefined' && Economy && Economy.addGold) return Economy.addGold(n);
      if (typeof SaveData !== 'undefined' && SaveData.get && SaveData.set) SaveData.set('gold', this._int(SaveData.get('gold'), 0) + n);
    } catch (e) {}
  },
  _addDiamonds(n) {
    n = Math.max(0, this._int(n, 0)); if (n <= 0) return;
    try {
      if (typeof SaveData !== 'undefined' && SaveData.addDiamonds) return SaveData.addDiamonds(n);
      if (typeof Economy !== 'undefined' && Economy && Economy.addDiamonds) return Economy.addDiamonds(n);
      if (typeof SaveData !== 'undefined' && SaveData.get && SaveData.set) SaveData.set('diamonds', this._int(SaveData.get('diamonds'), 0) + n);
    } catch (e) {}
  },

  _grant(reward) {
    if (!reward || typeof reward !== 'object') return;
    try {
      if (reward.gold)     this._addGold(reward.gold);
      if (reward.diamonds) this._addDiamonds(reward.diamonds);
      if (reward.scrap && typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(this._int(reward.scrap, 0));
      if (reward.item && typeof SaveData !== 'undefined' && SaveData.addItem)  SaveData.addItem(reward.item, Math.max(1, this._int(reward.count, 1)));
      if (reward.vehicle && typeof SaveData !== 'undefined' && SaveData.unlockVehicle) SaveData.unlockVehicle(reward.vehicle);
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SATIN ALMA
  // ══════════════════════════════════════════════════════════════════════════
  _setWarn(msg) { this._warn = msg; this._warnT = 2.4; },

  _buy(deal) {
    if (!deal) return;
    const s = this._get();
    if (s.bought.indexOf(deal.id) !== -1) { this._setWarn('Bu fırsat tükendi!'); return; }

    const price = Math.max(0, this._int(deal.price, 0));
    const have = deal.cur === 'diamonds' ? this._getDiamonds() : this._getGold();
    if (have < price) {
      this._setWarn('Yetersiz ' + (deal.cur === 'diamonds' ? 'elmas' : 'altın') + '!');
      return;
    }

    const ok = deal.cur === 'diamonds' ? this._spendDiamonds(price) : this._spendGold(price);
    if (!ok) { this._setWarn('Yetersiz ' + (deal.cur === 'diamonds' ? 'elmas' : 'altın') + '!'); return; }

    this._grant(deal.reward);
    s.bought.push(deal.id);
    this._save();
    this._flashKey = deal.id; this._flashT = 0.8;

    try {
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🕯️ Tüccar: ' + deal.subtitle + ' senindir!');
      if (typeof Audio !== 'undefined') { if (Audio.playPurchase) Audio.playPurchase(); else if (Audio.playPickup) Audio.playPickup(); }
      if (typeof Particles !== 'undefined' && Particles.burst) Particles.burst();
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  BİÇİMLENDİRME
  // ══════════════════════════════════════════════════════════════════════════
  _fmtNum(n) {
    n = this._num(n, 0);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K';
    return String(Math.floor(n));
  },
  _curSym(cur) { return cur === 'diamonds' ? '💎' : '🪙'; },
  _rewardShort(r) {
    r = r || {};
    const parts = [];
    if (r.vehicle && r.vehicle !== '__mystery__') parts.push('🚗 ARAÇ');
    if (r.gold)     parts.push('🪙 ' + this._fmtNum(r.gold));
    if (r.diamonds) parts.push('💎 ' + this._fmtNum(r.diamonds));
    if (r.scrap)    parts.push('⚙️ ' + this._fmtNum(r.scrap));
    if (r.item)     parts.push('✦ ' + Math.max(1, this._int(r.count, 1)) + 'x BOOST');
    return parts.join('   ') || '???';
  },
  _fmtCountdown(ms) {
    ms = Math.max(0, this._num(ms, 0));
    const tot = Math.floor(ms / 1000);
    const h = Math.floor(tot / 3600);
    const m = Math.floor((tot % 3600) / 60);
    const sc = tot % 60;
    if (h > 0) return h + 's ' + m + 'd';
    if (m > 0) return m + 'd ' + sc + 'sn';
    return sc + 'sn';
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

  // Titreşen mum/fener parıltısı (lighter kompozisyonuyla yumuşak ışık havuzu)
  _candle(ctx, x, y, radius) {
    const flick = 0.72 + 0.28 * Math.sin(this._t * 7.3 + x * 0.05) * Math.sin(this._t * 3.1 + y * 0.03);
    const r = radius * (0.85 + 0.15 * flick);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,179,71,' + (0.22 * flick).toFixed(3) + ')');
    grad.addColorStop(0.5, 'rgba(77,214,160,' + (0.08 * flick).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H, dt) {
    dt = this._num(dt, 0.016); if (dt < 0 || dt > 0.5) dt = 0.016;
    this._t += dt;
    if (this._warnT > 0) this._warnT = Math.max(0, this._warnT - dt);
    if (this._flashT > 0) this._flashT = Math.max(0, this._flashT - dt);
    this._btns = [];
    this._get();

    // Zemin — koyu gizem geçişi
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg2); g.addColorStop(0.5, this.COL.bg0); g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Atmosfer parıltıları (fenerler)
    this._candle(ctx, W * 0.15, H * 0.20, 190, '');
    this._candle(ctx, W * 0.85, H * 0.30, 220, '');
    this._candle(ctx, W * 0.50, H * 0.90, 260, '');

    this._drawHeader(ctx, W, H);

    // Kartlar
    const deals = this.getDeals();
    const n = deals.length || 1;
    const topY = 92;
    const bottomPad = 16;
    const gap = 12;
    const availH = (H - bottomPad) - topY;
    const cardH = Math.max(76, Math.min(122, (availH - gap * (n - 1)) / n));
    let y = topY;
    for (let i = 0; i < deals.length; i++) {
      this._drawCard(ctx, 14, y, W - 28, cardH, deals[i]);
      y += cardH + gap;
    }

    // Uyarı balonu (yetersiz bakiye vb.)
    if (this._warnT > 0 && this._warn) {
      const a = Math.min(1, this._warnT / 0.4);
      const wtxt = this._warn;
      ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(wtxt).width + 40;
      const bx = (W - tw) / 2, by = H - 54;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(40,12,12,0.94)'; this._rr(ctx, bx, by, tw, 34, 10); ctx.fill();
      ctx.strokeStyle = this.COL.red; ctx.lineWidth = 1.5; this._rr(ctx, bx, by, tw, 34, 10); ctx.stroke();
      ctx.fillStyle = this.COL.red; ctx.fillText('⚠ ' + wtxt, W / 2, by + 18);
      ctx.globalAlpha = 1;
    }
  },

  _drawHeader(ctx, W, H) {
    // Geri butonu
    ctx.fillStyle = this.COL.panel; this._rr(ctx, 14, 14, 42, 34, 9); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; this._rr(ctx, 14, 14, 42, 34, 9); ctx.stroke();
    ctx.fillStyle = this.COL.emerald; ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹', 35, 31);
    this._btns.push({ x: 14, y: 14, w: 44, h: 44, act: 'back' });

    // Başlık (mumsu parıltılı)
    const glow = 0.6 + 0.4 * Math.sin(this._t * 4);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.shadowColor = 'rgba(255,213,74,' + (0.5 * glow).toFixed(2) + ')';
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.COL.gold; ctx.font = 'bold 20px Arial';
    ctx.fillText('🕯️ KARA BORSA', 66, 24);
    ctx.restore();

    // Geri sayım (yenilenme)
    ctx.fillStyle = this.COL.emeraldHi; ctx.font = 'bold 11px Arial';
    ctx.fillText('⏳ Yenilenme: ' + this._fmtCountdown(this._remainMs()), 66, 42);

    // Bakiye (sağ üst)
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.gold; ctx.font = 'bold 13px Arial';
    ctx.fillText('🪙 ' + this._fmtNum(this._getGold()), W - 16, 20);
    ctx.fillStyle = this.COL.purpleHi;
    ctx.fillText('💎 ' + this._fmtNum(this._getDiamonds()), W - 16, 40);

    // Alt ayraç çizgisi
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, 60); ctx.lineTo(W - 14, 60); ctx.stroke();

    // Tüccar fısıltısı
    ctx.fillStyle = this.COL.mute; ctx.font = 'italic 11px Arial'; ctx.textAlign = 'left';
    ctx.fillText('“Bugünlük... sadece sana özel fiyatlar, dostum.”', 16, 76);
  },

  _drawCard(ctx, x, y, w, h, deal) {
    const s = this._get();
    const sold = s.bought.indexOf(deal.id) !== -1;
    const flash = (this._flashKey === deal.id && this._flashT > 0);

    // Kart zemini
    ctx.fillStyle = this.COL.panel; this._rr(ctx, x, y, w, h, 14); ctx.fill();
    // Kenar (satılmış → sönük, flash → parlak zümrüt)
    let edge = this.COL.line, ew = 1.5;
    if (sold) { edge = 'rgba(120,140,130,0.28)'; }
    else if (flash) { edge = this.COL.emeraldHi; ew = 2.5; }
    else { edge = 'rgba(169,123,255,0.30)'; }
    ctx.strokeStyle = edge; ctx.lineWidth = ew; this._rr(ctx, x, y, w, h, 14); ctx.stroke();

    if (sold) { ctx.globalAlpha = 0.55; }

    // İkon rozeti
    const iconSz = Math.min(50, h - 30);
    const iconY = y + (h - iconSz) / 2;
    ctx.fillStyle = 'rgba(77,214,160,0.12)'; this._rr(ctx, x + 14, iconY, iconSz, iconSz, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(77,214,160,0.25)'; ctx.lineWidth = 1; this._rr(ctx, x + 14, iconY, iconSz, iconSz, 11); ctx.stroke();
    ctx.font = Math.floor(iconSz * 0.56) + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(deal.icon, x + 14 + iconSz / 2, y + h / 2);

    const tx = x + 14 + iconSz + 14;

    // İsim + ödül açıklaması
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.COL.emeraldHi; ctx.font = 'bold 15px Arial';
    ctx.fillText(deal.name, tx, y + 26);
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    ctx.fillText(deal.subtitle, tx, y + 44);

    // İndirim rozeti (sağ üst)
    const badgeW = 54, badgeH = 22, badgeX = x + w - badgeW - 14, badgeY = y + 12;
    ctx.fillStyle = this.COL.red; this._rr(ctx, badgeX, badgeY, badgeW, badgeH, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('-' + deal.discPct + '%', badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);

    // Fiyatlar — orijinal (üstü çizili) + indirimli
    const sym = this._curSym(deal.cur);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    const origTxt = sym + ' ' + this._fmtNum(deal.orig);
    const oy = y + h - 40;
    ctx.fillText(origTxt, x + w - 16, oy);
    const ow = ctx.measureText(origTxt).width;
    ctx.strokeStyle = this.COL.red; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + w - 16 - ow, oy); ctx.lineTo(x + w - 16, oy); ctx.stroke();

    ctx.fillStyle = deal.cur === 'diamonds' ? this.COL.purpleHi : this.COL.goldHi;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(sym + ' ' + this._fmtNum(deal.price), x + w - 16, y + h - 21);

    // SATIN AL / TÜKENDİ butonu
    const bw = 108, bh = 40, bx = tx, by = y + h - bh - 8;
    if (sold) {
      ctx.fillStyle = 'rgba(120,140,130,0.15)'; this._rr(ctx, bx, by, bw, bh, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(120,140,130,0.4)'; ctx.lineWidth = 1; this._rr(ctx, bx, by, bw, bh, 9); ctx.stroke();
      ctx.fillStyle = this.COL.mute; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✗ TÜKENDİ', bx + bw / 2, by + bh / 2 + 1);
    } else {
      const pulse = 0.5 + 0.5 * Math.sin(this._t * 3.5 + y * 0.02);
      const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
      grad.addColorStop(0, this.COL.emerald); grad.addColorStop(1, '#2fa87a');
      ctx.fillStyle = grad; this._rr(ctx, bx, by, bw, bh, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(123,240,194,' + (0.4 + 0.5 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2;
      this._rr(ctx, bx, by, bw, bh, 9); ctx.stroke();
      ctx.fillStyle = '#06231a'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SATIN AL', bx + bw / 2, by + bh / 2 + 1);
      this._btns.push({ x: bx, y: by, w: bw, h: bh, act: 'buy:' + deal.id });
    }

    if (sold) { ctx.globalAlpha = 1; }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CLICK  → 'back' | null
  // ══════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.act === 'back') return 'back';
        try { if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick(); } catch (e) {}
        if (b.act.indexOf('buy:') === 0) {
          const id = b.act.slice(4);
          const deal = this.getDeals().find(d => d.id === id);
          if (deal) this._buy(deal);
          return null;
        }
        return null;
      }
    }
    return null;
  },

  // ── Opsiyonel: animasyon ilerlet & gün tazele ──
  update(dt) {
    dt = this._num(dt, 0.016); if (dt < 0 || dt > 0.5) dt = 0.016;
    this._t += dt;
    if (this._warnT > 0) this._warnT = Math.max(0, this._warnT - dt);
    if (this._flashT > 0) this._flashT = Math.max(0, this._flashT - dt);
    this._get();   // gün değişimini kontrol eder
  }
};

// Global erişim (tarayıcı)
if (typeof window !== 'undefined') window.BlackMarket = BlackMarket;
