'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// REWARDS — Günlük ödül (streak), VIP, Sezon Ligi, Reklam bonusu, Pazar
// Hepsi SaveData'da kalıcı. UI: drawRewards hub + drawVIP/drawLeague/drawMarket.
// ═══════════════════════════════════════════════════════════════════════════
const Rewards = {
  _g(k, d) { return (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get(k) !== undefined ? SaveData.get(k) : d) : d; },
  _s(k, v) { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(k, v); },
  _dia() { return (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('diamonds') || 0) : 0; },
  _addDia(n) { this._s('diamonds', this._dia() + n); },
  _addGold(n) { if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(Math.floor(n)); },

  // ── GÜNLÜK ÖDÜL (21) — 7 günlük streak ──
  DAILY_GOLD: [100, 150, 250, 400, 600, 800, 1500],
  // Güne özel elmas ödülü (index 6 = 7. gün = 3, eski davranışla birebir uyumlu)
  DAILY_DIAMONDS: [0, 0, 1, 0, 0, 1, 3],
  // Güne özel hurda ödülü — daha fazla çeşitlilik
  DAILY_SCRAP: [10, 15, 0, 25, 30, 0, 60],
  // Uzun streak kilometre taşları — ekstra elmas bonusu
  STREAK_MILESTONES: [
    { streak: 14,  dia: 5,  label: '2 Hafta' },
    { streak: 30,  dia: 12, label: '1 Ay' },
    { streak: 60,  dia: 25, label: '2 Ay' },
    { streak: 100, dia: 50, label: '100 Gün' },
    { streak: 150, dia: 75,  label: '150 Gün' },
    { streak: 200, dia: 100, label: '200 Gün' },
    { streak: 270, dia: 150, label: '270 Gün' },
    { streak: 365, dia: 250, label: '1 Yıl' },
    { streak: 500, dia: 400, label: '500 Gün' },
    { streak: 730, dia: 750, label: '2 Yıl' },
    { streak: 1000, dia: 1200, label: '1000 Gün' },
    { streak: 1095, dia: 1500, label: '3 Yıl' },
    { streak: 1460, dia: 2000, label: '4 Yıl' },
    { streak: 1825, dia: 2500, label: '5 Yıl' },
    { streak: 2190, dia: 3200, label: '6 Yıl' },
    { streak: 2555, dia: 4000, label: '7 Yıl' }
  ],
  // Streak seviyeleri (UI rozeti için) — kupa TIERS'e benzer yapı
  DAILY_STREAK_TIERS: [
    { min: 0,  name: 'Yeni Başlangıç', col: '#9fe0a0' },
    { min: 3,  name: 'İstikrarlı',     col: '#5fd0ff' },
    { min: 7,  name: 'Haftalık',       col: '#ffd21e' },
    { min: 14, name: 'Sadık',          col: '#ffcf3f' },
    { min: 30,  name: 'Efsane',         col: '#ff5bd0' },
    { min: 100, name: 'Ölümsüz',        col: '#ff7b3f' },
    { min: 365, name: 'Sonsuz',         col: '#ff3b6b' }
  ],
  _streakMilestoneBonus(streak) { for (const m of this.STREAK_MILESTONES) if (streak === m.streak) return m.dia; return 0; },
  streakTier() { const s = this.dailyState().streak || 0; let cur = this.DAILY_STREAK_TIERS[0]; for (const x of this.DAILY_STREAK_TIERS) if (s >= x.min) cur = x; return cur; },
  _today() { return new Date().toDateString(); },
  _yesterday() { return new Date(Date.now() - 86400000).toDateString(); },
  dailyState() { return this._g('dailyReward', { last: '', streak: 0 }); },
  canClaimDaily() { return this.dailyState().last !== this._today(); },
  dailyDayIndex() { const s = this.dailyState(); return (s.last === this._today()) ? ((s.streak - 1) % 7) : (s.last === this._yesterday() ? (s.streak % 7) : 0); },
  claimDaily() {
    const s = this.dailyState();
    if (s.last === this._today()) return null;
    s.streak = (s.last === this._yesterday()) ? (s.streak + 1) : 1;
    s.last = this._today();
    const day = ((s.streak - 1) % 7);
    let gold = Math.floor(this.DAILY_GOLD[day] * this.coinMult());
    let dia = (this.DAILY_DIAMONDS[day] || 0);         // güne özel elmas (7. gün = 3)
    const milestone = this._streakMilestoneBonus(s.streak);   // uzun streak ekstra elması
    dia += milestone;
    let scrap = (this.DAILY_SCRAP[day] || 0);          // güne özel hurda
    // ── Uzun günlük takvim (28 gün) — kademeli ekstra hediye ──
    const calDay = ((s.streak - 1) % this.DAILY_CALENDAR.length);
    const cal = this.DAILY_CALENDAR[calDay] || { gold: 0, dia: 0, scrap: 0 };
    const calGold = Math.floor((cal.gold || 0) * this.coinMult());
    gold += calGold; dia += (cal.dia || 0); scrap += (cal.scrap || 0);
    // ── Haftalık streak bonusu (her 7 tam günde bir) ──
    const week = this._weeklyStreakBonus(s.streak);
    if (week) { gold += Math.floor(week.gold * this.coinMult()); dia += (week.dia || 0); scrap += (week.scrap || 0); }
    this._addGold(gold);
    if (dia > 0) this._addDia(dia);
    if (scrap > 0 && typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(scrap);
    // ── Kilometre taşı hediye sandığı (kendi ödül akışı ile açılır) ──
    let giftChest = null;
    const gcId = this._milestoneChest(s.streak);
    if (gcId) giftChest = this.openChest(gcId);
    this._s('dailyReward', s);
    return { gold: gold, dia: dia, streak: s.streak, day: day, milestone: milestone, scrap: scrap, calDay: calDay, calGold: calGold, week: week, giftChest: giftChest };
  },

  // ── GÜNLÜK ÇARK (Daily Spin) ──
  SPIN_PRIZES: [
    { t: 'gold',    v: 200,  label: '200 ⧆',      col: '#ffcf3f' },
    { t: 'scrap',   v: 30,   label: '30 ◈',       col: '#9fe0a0' },
    { t: 'gold',    v: 500,  label: '500 ⧆',      col: '#ffe08a' },
    { t: 'diamond', v: 1,    label: '1 ◆',        col: '#5fd0ff' },
    { t: 'gold',    v: 1000, label: '1000 ⧆',     col: '#ffcf3f' },
    { t: 'scrap',   v: 80,   label: '80 ◈',       col: '#9fe0a0' },
    { t: 'gold',    v: 300,  label: '300 ⧆',      col: '#ffe08a' },
    { t: 'diamond', v: 3,    label: 'JACKPOT 3◆', col: '#ff5bd0' }
  ],
  canSpin() { return this._g('lastSpin', '') !== this._today(); },
  markSpun() { this._s('lastSpin', this._today()); },
  awardSpin(idx) {
    const p = this.SPIN_PRIZES[idx] || this.SPIN_PRIZES[0];
    const mult = this.isVIP() ? 2 : 1;
    if (p.t === 'gold') this._addGold(p.v * mult);
    else if (p.t === 'scrap') { if (typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(p.v); }
    else if (p.t === 'diamond') this._addDia(p.v);
    return p;
  },

  // ── VIP (25) ──
  // Satın alma planları (UI için) — buyVIP(days, cost) ile uyumlu
  VIP_PLANS: [
    { days: 7,  cost: 30,  label: '7 Gün',  perDay: 4.29, best: false },
    { days: 30, cost: 100, label: '30 Gün', perDay: 3.33, best: true  },
    { days: 90, cost: 250, label: '90 Gün', perDay: 2.78, best: false }
  ],
  VIP_PERKS: ['1.5× Altın', '2× Çark Ödülü', 'Günlük Bonus Çark', 'Reklamsız Bonus'],
  isVIP() { const v = this._g('vip', null); return !!(v && v.until && v.until > Date.now()); },
  vipDaysLeft() { const v = this._g('vip', null); return (v && v.until) ? Math.max(0, Math.ceil((v.until - Date.now()) / 86400000)) : 0; },
  buyVIP(days, cost) {
    if (this._dia() < cost) return false;
    this._addDia(-cost);
    const v = this._g('vip', {}) || {};
    const base = (v.until && v.until > Date.now()) ? v.until : Date.now();
    v.until = base + days * 86400000;
    this._s('vip', v);
    return true;
  },
  coinMult() { return this.isVIP() ? 1.5 : 1; },

  // ── SEZON LİGİ (23) — kupa bazlı ──
  TIERS: [
    { name: 'BRONZE',   min: 0,     col: '#cd7f32' },
    { name: 'SILVER',   min: 500,   col: '#c8c8c8' },
    { name: 'GOLD',     min: 1500,  col: '#ffd21e' },
    { name: 'PLATINUM', min: 3500,  col: '#5fd6c8' },
    { name: 'DIAMOND',     min: 7000,  col: '#5fb0ff' },
    { name: 'MASTER',      min: 12000, col: '#c05fff' },
    { name: 'GRANDMASTER', min: 20000, col: '#ff7b3f' },
    { name: 'LEGEND',      min: 32000, col: '#ff3b6b' }
  ],
  trophies() { return this._g('trophies', 0) || 0; },
  addTrophies(n) { this._s('trophies', Math.max(0, this.trophies() + Math.round(n))); },
  tier() { const t = this.trophies(); let cur = this.TIERS[0]; for (const x of this.TIERS) if (t >= x.min) cur = x; return cur; },
  nextTier() { const t = this.trophies(); for (const x of this.TIERS) if (t < x.min) return x; return null; },
  tierProgress() {
    const t = this.trophies(), cur = this.tier(), nxt = this.nextTier();
    if (!nxt) return 1;
    return Math.max(0, Math.min(1, (t - cur.min) / (nxt.min - cur.min)));
  },
  // Yarış sonunda kupa ver
  awardRunTrophies(distance, placement, mode) {
    let tr = Math.floor(distance / 400);
    if (mode === 'race') tr += (placement === 1 ? 30 : 8);
    else if (mode === 'timetrial') tr += 15;
    else if (mode === 'boss') tr += 25;
    else if (mode === 'survival') tr += Math.floor(distance / 300);
    if (tr > 0) this.addTrophies(tr);
    return tr;
  },

  // ── REKLAM BONUSU (24) — 20 dk cooldown, simüle "video" ──
  AD_COOLDOWN: 20 * 60 * 1000,
  AD_GOLD_BASE: 500,        // temel ödül
  AD_DAILY_STEP: 100,       // günlük her izlemede artan bonus
  AD_DAILY_CAP: 8,          // artış tavanı
  adReady() { return Date.now() - (this._g('lastAd', 0) || 0) >= this.AD_COOLDOWN; },
  adCooldownLeft() { return Math.max(0, this.AD_COOLDOWN - (Date.now() - (this._g('lastAd', 0) || 0))); },
  _adCountToday() { const d = this._g('adDay', { day: '', n: 0 }) || { day: '', n: 0 }; return (d.day === this._today()) ? (d.n || 0) : 0; },
  // Bir sonraki reklamın vereceği altın (UI önizleme için) — artan ödül + VIP çarpanı
  adRewardPreview() {
    const n = this._adCountToday();
    const base = this.AD_GOLD_BASE + Math.min(n, this.AD_DAILY_CAP) * this.AD_DAILY_STEP;
    return Math.floor(base * this.coinMult());
  },
  claimAd() {
    if (!this.adReady()) return 0;
    const g = this.adRewardPreview();
    this._s('lastAd', Date.now());
    const d = this._g('adDay', { day: '', n: 0 }) || { day: '', n: 0 };
    if (d.day === this._today()) d.n = (d.n || 0) + 1; else { d.day = this._today(); d.n = 1; }
    this._s('adDay', d);
    this._addGold(g);
    return g;
  },

  // ── PAZAR (26) — altın↔hurda takas + parça satın alma ──
  EXCHANGE: { goldPerScrap: 12 },   // 12 altın = 1 hurda
  // Hazır hurda paketleri (UI için) — buyScrap(amount) ile uyumlu
  SCRAP_PACKS: [
    { scrap: 10,  label: '10 ◈' },
    { scrap: 50,  label: '50 ◈' },
    { scrap: 100, label: '100 ◈' }
  ],
  buyScrap(scrapAmount) {
    const cost = scrapAmount * this.EXCHANGE.goldPerScrap;
    if ((this._g('gold', 0) || 0) < cost) return false;
    if (typeof SaveData !== 'undefined' && SaveData.spendGold) SaveData.spendGold(cost);
    else this._s('gold', (this._g('gold', 0) || 0) - cost);
    if (typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(scrapAmount);
    return true;
  },
  sellScrap(scrapAmount) {
    if (typeof SaveData === 'undefined' || !SaveData.getScrap) return false;
    if (SaveData.getScrap() < scrapAmount) return false;
    if (SaveData.spendScrap && !SaveData.spendScrap(scrapAmount)) return false;
    this._addGold(scrapAmount * Math.floor(this.EXCHANGE.goldPerScrap * 0.7));   // %70 geri alım
    return true;
  },

  // ── SANDIK (Chests) — kademeli seviyeler + ağırlıklı ganimet tabloları ──
  // Her sandığın loot'u { t, v, w, label } girdileri; w = ağırlık (weight).
  // Ödül akışı awardSpin/claimDaily ile aynı: gold coinMult ile, scrap/diamond sabit.
  CHESTS: [
    { id: 'wood',    name: 'Ahşap Sandık',   col: '#b07a43', tier: 1, loot: [
      { t: 'gold',    v: 120,  w: 45, label: '120 ⧆'  },
      { t: 'gold',    v: 250,  w: 25, label: '250 ⧆'  },
      { t: 'gold',    v: 400,  w: 12, label: '400 ⧆'  },
      { t: 'scrap',   v: 20,   w: 22, label: '20 ◈'   },
      { t: 'scrap',   v: 40,   w: 10, label: '40 ◈'   },
      { t: 'diamond', v: 1,    w: 8,  label: '1 ◆'    },
      { t: 'diamond', v: 3,    w: 2,  label: 'ŞANS 3◆' }
    ]},
    { id: 'iron',    name: 'Demir Sandık',    col: '#9aa4b0', tier: 2, loot: [
      { t: 'gold',    v: 300,  w: 40, label: '300 ⧆'  },
      { t: 'gold',    v: 600,  w: 24, label: '600 ⧆'  },
      { t: 'gold',    v: 900,  w: 12, label: '900 ⧆'  },
      { t: 'scrap',   v: 45,   w: 24, label: '45 ◈'   },
      { t: 'scrap',   v: 70,   w: 10, label: '70 ◈'   },
      { t: 'diamond', v: 2,    w: 10, label: '2 ◆'    },
      { t: 'diamond', v: 4,    w: 2,  label: '4 ◆'    }
    ]},
    { id: 'gold',    name: 'Altın Sandık',    col: '#ffd21e', tier: 3, loot: [
      { t: 'gold',    v: 700,  w: 38, label: '700 ⧆'  },
      { t: 'gold',    v: 1200, w: 22, label: '1200 ⧆' },
      { t: 'gold',    v: 1800, w: 11, label: '1800 ⧆' },
      { t: 'scrap',   v: 80,   w: 22, label: '80 ◈'   },
      { t: 'scrap',   v: 130,  w: 9,  label: '130 ◈'  },
      { t: 'diamond', v: 3,    w: 14, label: '3 ◆'    },
      { t: 'diamond', v: 6,    w: 4,  label: '6 ◆'    }
    ]},
    { id: 'crystal', name: 'Kristal Sandık',  col: '#7bdcff', tier: 4, loot: [
      { t: 'gold',    v: 1500, w: 34, label: '1500 ⧆' },
      { t: 'gold',    v: 2500, w: 20, label: '2500 ⧆' },
      { t: 'gold',    v: 4000, w: 9,  label: '4000 ⧆' },
      { t: 'scrap',   v: 150,  w: 20, label: '150 ◈'  },
      { t: 'scrap',   v: 240,  w: 8,  label: '240 ◈'  },
      { t: 'diamond', v: 6,    w: 18, label: '6 ◆'    },
      { t: 'diamond', v: 12,   w: 8,  label: 'JACKPOT 12◆' }
    ]},
    { id: 'shadow',    name: 'Gölge Sandık',   col: '#8a6fff', tier: 5, loot: [
      { t: 'gold',    v: 3000, w: 32, label: '3000 ⧆' },
      { t: 'gold',    v: 5000, w: 18, label: '5000 ⧆' },
      { t: 'scrap',   v: 220,  w: 20, label: '220 ◈'  },
      { t: 'scrap',   v: 350,  w: 8,  label: '350 ◈'  },
      { t: 'diamond', v: 10,   w: 15, label: '10 ◆'   },
      { t: 'diamond', v: 20,   w: 7,  label: 'JACKPOT 20◆' }
    ]},
    { id: 'celestial', name: 'Göksel Sandık',  col: '#ffcf3f', tier: 6, loot: [
      { t: 'gold',    v: 5000, w: 30, label: '5000 ⧆' },
      { t: 'gold',    v: 8000, w: 16, label: '8000 ⧆' },
      { t: 'scrap',   v: 350,  w: 18, label: '350 ◈'  },
      { t: 'scrap',   v: 500,  w: 8,  label: '500 ◈'  },
      { t: 'diamond', v: 15,   w: 18, label: '15 ◆'   },
      { t: 'diamond', v: 30,   w: 10, label: 'JACKPOT 30◆' }
    ]},
    { id: 'void',      name: 'Boşluk Sandık',   col: '#6b4fd6', tier: 7, loot: [
      { t: 'gold',    v: 8000,  w: 28, label: '8000 ⧆'  },
      { t: 'gold',    v: 13000, w: 15, label: '13000 ⧆' },
      { t: 'scrap',   v: 500,   w: 17, label: '500 ◈'   },
      { t: 'scrap',   v: 750,   w: 8,  label: '750 ◈'   },
      { t: 'diamond', v: 25,    w: 18, label: '25 ◆'    },
      { t: 'diamond', v: 50,    w: 11, label: 'JACKPOT 50◆' }
    ]},
    { id: 'primordial', name: 'Kadim Sandık',   col: '#ff4fae', tier: 8, loot: [
      { t: 'gold',    v: 12000, w: 26, label: '12000 ⧆' },
      { t: 'gold',    v: 20000, w: 14, label: '20000 ⧆' },
      { t: 'scrap',   v: 700,   w: 16, label: '700 ◈'   },
      { t: 'scrap',   v: 1100,  w: 8,  label: '1100 ◈'  },
      { t: 'diamond', v: 40,    w: 18, label: '40 ◆'    },
      { t: 'diamond', v: 80,    w: 12, label: 'JACKPOT 80◆' }
    ]},
    { id: 'eternal',    name: 'Ebedi Sandık',    col: '#00e0c8', tier: 9, loot: [
      { t: 'gold',    v: 18000, w: 25, label: '18000 ⧆' },
      { t: 'gold',    v: 30000, w: 13, label: '30000 ⧆' },
      { t: 'scrap',   v: 1000,  w: 16, label: '1000 ◈'  },
      { t: 'scrap',   v: 1600,  w: 8,  label: '1600 ◈'  },
      { t: 'diamond', v: 60,    w: 18, label: '60 ◆'    },
      { t: 'diamond', v: 120,   w: 12, label: 'JACKPOT 120◆' }
    ]},
    { id: 'mythic',     name: 'Mitik Sandık',    col: '#ffd700', tier: 10, loot: [
      { t: 'gold',    v: 28000, w: 24, label: '28000 ⧆' },
      { t: 'gold',    v: 45000, w: 12, label: '45000 ⧆' },
      { t: 'scrap',   v: 1500,  w: 15, label: '1500 ◈'  },
      { t: 'scrap',   v: 2400,  w: 8,  label: '2400 ◈'  },
      { t: 'diamond', v: 90,    w: 18, label: '90 ◆'    },
      { t: 'diamond', v: 180,   w: 13, label: 'JACKPOT 180◆' }
    ]},
    { id: 'transcendent', name: 'Aşkın Sandık',  col: '#ff6bff', tier: 11, loot: [
      { t: 'gold',    v: 42000, w: 23, label: '42000 ⧆' },
      { t: 'gold',    v: 68000, w: 12, label: '68000 ⧆' },
      { t: 'scrap',   v: 2200,  w: 15, label: '2200 ◈'  },
      { t: 'scrap',   v: 3600,  w: 8,  label: '3600 ◈'  },
      { t: 'diamond', v: 130,   w: 18, label: '130 ◆'   },
      { t: 'diamond', v: 260,   w: 13, label: 'JACKPOT 260◆' }
    ]},
    { id: 'infinity',   name: 'Sonsuzluk Sandık', col: '#5effc8', tier: 12, loot: [
      { t: 'gold',    v: 60000,  w: 22, label: '60000 ⧆'  },
      { t: 'gold',    v: 95000,  w: 12, label: '95000 ⧆'  },
      { t: 'scrap',   v: 3200,   w: 15, label: '3200 ◈'   },
      { t: 'scrap',   v: 5200,   w: 8,  label: '5200 ◈'   },
      { t: 'diamond', v: 190,    w: 18, label: '190 ◆'    },
      { t: 'diamond', v: 380,    w: 13, label: 'JACKPOT 380◆' }
    ]}
  ],
  chestById(id) { for (const c of this.CHESTS) if (c.id === id) return c; return null; },
  // Sandık olasılıkları (UI önizleme için) — her ödülün yüzdesi
  chestOdds(id) {
    const c = this.chestById(id); if (!c) return [];
    let total = 0; for (const l of c.loot) total += (l.w || 0);
    return c.loot.map(l => ({ t: l.t, v: l.v, label: l.label, pct: total ? (l.w / total * 100) : 0 }));
  },
  _weightedPick(loot) {
    let total = 0; for (const l of loot) total += (l.w || 0);
    let r = Math.random() * total;
    for (const l of loot) { r -= (l.w || 0); if (r < 0) return l; }
    return loot[loot.length - 1];
  },
  _awardLoot(l) {
    if (!l) return null;
    if (l.t === 'gold') this._addGold(l.v * this.coinMult());
    else if (l.t === 'scrap') { if (typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(l.v); }
    else if (l.t === 'diamond') this._addDia(l.v);
    return l;
  },
  openChest(id) {
    const c = this.chestById(id) || this.CHESTS[0];
    const prize = this._weightedPick(c.loot);
    this._awardLoot(prize);
    return { chest: c.id, name: c.name, col: c.col, prize: prize };
  },

  // ── UZUN GÜNLÜK TAKVİM (49 gün) — her hafta artan ekstra hediyeler ──
  // 7 günlük temel streak'in ÜZERİNE eklenir; miktarlar mütevazı tutulur.
  DAILY_CALENDAR: [
    // 1. Hafta
    { gold: 20,  scrap: 0,  dia: 0 }, { gold: 25,  scrap: 5,  dia: 0 },
    { gold: 30,  scrap: 0,  dia: 0 }, { gold: 35,  scrap: 8,  dia: 0 },
    { gold: 40,  scrap: 0,  dia: 0 }, { gold: 50,  scrap: 10, dia: 0 },
    { gold: 70,  scrap: 0,  dia: 1 },
    // 2. Hafta
    { gold: 45,  scrap: 0,  dia: 0 }, { gold: 55,  scrap: 10, dia: 0 },
    { gold: 65,  scrap: 0,  dia: 0 }, { gold: 75,  scrap: 15, dia: 0 },
    { gold: 85,  scrap: 0,  dia: 0 }, { gold: 95,  scrap: 15, dia: 0 },
    { gold: 120, scrap: 0,  dia: 1 },
    // 3. Hafta
    { gold: 70,  scrap: 0,  dia: 0 }, { gold: 80,  scrap: 15, dia: 0 },
    { gold: 90,  scrap: 0,  dia: 0 }, { gold: 100, scrap: 20, dia: 0 },
    { gold: 115, scrap: 0,  dia: 0 }, { gold: 130, scrap: 20, dia: 0 },
    { gold: 160, scrap: 0,  dia: 2 },
    // 4. Hafta
    { gold: 95,  scrap: 0,  dia: 0 }, { gold: 110, scrap: 20, dia: 0 },
    { gold: 125, scrap: 0,  dia: 0 }, { gold: 140, scrap: 25, dia: 0 },
    { gold: 155, scrap: 0,  dia: 0 }, { gold: 175, scrap: 25, dia: 0 },
    { gold: 220, scrap: 40, dia: 3 },
    // 5. Hafta — sadık oyuncular için genişletilmiş takvim
    { gold: 130, scrap: 0,  dia: 0 }, { gold: 150, scrap: 25, dia: 0 },
    { gold: 170, scrap: 0,  dia: 1 }, { gold: 190, scrap: 30, dia: 0 },
    { gold: 210, scrap: 0,  dia: 0 }, { gold: 240, scrap: 30, dia: 0 },
    { gold: 300, scrap: 50, dia: 4 },
    // 6. Hafta — en sadık oyuncular için zirve takvim
    { gold: 170, scrap: 0,  dia: 0 }, { gold: 195, scrap: 30, dia: 0 },
    { gold: 220, scrap: 0,  dia: 1 }, { gold: 245, scrap: 35, dia: 0 },
    { gold: 270, scrap: 0,  dia: 0 }, { gold: 300, scrap: 35, dia: 0 },
    { gold: 380, scrap: 60, dia: 5 },
    // 7. Hafta — efsanevi sadakat takvimi
    { gold: 210, scrap: 0,  dia: 0 }, { gold: 240, scrap: 35, dia: 0 },
    { gold: 270, scrap: 0,  dia: 1 }, { gold: 300, scrap: 40, dia: 0 },
    { gold: 330, scrap: 0,  dia: 0 }, { gold: 365, scrap: 40, dia: 0 },
    { gold: 450, scrap: 70, dia: 6 },
    // 8. Hafta — usta sadakat takvimi
    { gold: 250, scrap: 0,  dia: 0 }, { gold: 285, scrap: 40, dia: 0 },
    { gold: 320, scrap: 0,  dia: 1 }, { gold: 355, scrap: 45, dia: 0 },
    { gold: 390, scrap: 0,  dia: 0 }, { gold: 430, scrap: 45, dia: 0 },
    { gold: 540, scrap: 80, dia: 7 }
  ],
  // 28 günlük döngüde geçerli takvim günü (dailyDayIndex ile aynı mantık)
  calendarDayIndex() {
    const s = this.dailyState();
    const L = this.DAILY_CALENDAR.length;
    return (s.last === this._today()) ? ((s.streak - 1) % L)
         : (s.last === this._yesterday() ? (s.streak % L) : 0);
  },
  calendarEntry(streak) {
    const L = this.DAILY_CALENDAR.length;
    const idx = (((streak | 0) - 1) % L + L) % L;
    return this.DAILY_CALENDAR[idx] || { gold: 0, scrap: 0, dia: 0 };
  },

  // ── HAFTALIK STREAK BONUSU (yeni bonus türü) — her 7 tam günde ──
  WEEKLY_STREAK: { gold: 250, scrap: 25, dia: 1 },
  _weeklyStreakBonus(streak) {
    if (streak > 0 && streak % 7 === 0) {
      const weeks = streak / 7;
      return { weeks: weeks, gold: this.WEEKLY_STREAK.gold, scrap: this.WEEKLY_STREAK.scrap,
               dia: (weeks % 2 === 0 ? this.WEEKLY_STREAK.dia : 0) };
    }
    return null;
  },

  // ── KİLOMETRE TAŞI HEDİYESİ (yeni bonus türü) — STREAK_MILESTONES ile hizalı sandık ──
  MILESTONE_CHEST: { 14: 'iron', 30: 'gold', 60: 'gold', 100: 'crystal', 150: 'crystal', 200: 'shadow', 270: 'shadow', 365: 'celestial', 500: 'void', 730: 'primordial', 1000: 'eternal', 1095: 'mythic', 1460: 'mythic', 1825: 'transcendent', 2190: 'transcendent', 2555: 'infinity' },
  _milestoneChest(streak) { const id = this.MILESTONE_CHEST[streak]; return id || null; },

  // ── COINRUSH YÜKSEK SKOR BONUSU (yeni bonus türü) ──
  // Bir CoinRush turunda yeni rekor kırınca ödül; ödül akışı diğerleriyle aynı
  // (gold coinMult ile, diamond sabit). Sadece kişisel rekorun ÜZERİNE ödül verir.
  COINRUSH_GOLD_PER: 2,        // yeni rekordaki her ekstra puan için altın
  COINRUSH_CAP: 5000,          // tek turda verilebilecek altın tavanı
  COINRUSH_DIA_TIERS: [        // ilk kez aşılan skor eşiklerinde elmas bonusu
    { score: 1000,  dia: 2 },
    { score: 2500,  dia: 5 },
    { score: 5000,  dia: 10 },
    { score: 10000, dia: 20 }
  ],
  coinrushHiScore() { return this._g('coinrushHi', 0) || 0; },
  _coinrushDiaFor(prev, score) {
    let dia = 0;
    for (const t of this.COINRUSH_DIA_TIERS) if (score >= t.score && prev < t.score) dia += t.dia;
    return dia;
  },
  // Bir sonraki rekorun (mevcut skorla) vereceği tahmini ödül — UI önizleme için
  coinrushPreview(score) {
    score = Math.max(0, Math.floor(score || 0));
    const prev = this.coinrushHiScore();
    if (score <= prev) return { record: false, gold: 0, dia: 0, gain: 0 };
    const gain = score - prev;
    const gold = Math.floor(Math.min(gain * this.COINRUSH_GOLD_PER, this.COINRUSH_CAP) * this.coinMult());
    return { record: true, gold: gold, dia: this._coinrushDiaFor(prev, score), gain: gain };
  },
  submitCoinrush(score) {
    score = Math.max(0, Math.floor(score || 0));
    const prev = this.coinrushHiScore();
    if (score <= prev) return { record: false, hi: prev, prev: prev, gold: 0, dia: 0, gain: 0 };
    const gain = score - prev;
    const gold = Math.floor(Math.min(gain * this.COINRUSH_GOLD_PER, this.COINRUSH_CAP) * this.coinMult());
    const dia = this._coinrushDiaFor(prev, score);
    this._s('coinrushHi', score);
    this._addGold(gold);
    if (dia > 0) this._addDia(dia);
    return { record: true, hi: score, prev: prev, gold: gold, dia: dia, gain: gain };
  },

  // ── YAKIT DENEMESİ EN İYİ MESAFE BONUSU (yeni bonus türü) ──
  // Fuel-trial modunda yeni mesafe rekoru kırınca ödül; ödül akışı diğerleriyle
  // aynı (gold coinMult ile, diamond sabit). Sadece kişisel rekorun ÜZERİNE verir.
  FUELTRIAL_GOLD_PER: 3,       // rekordaki her ekstra metre için altın
  FUELTRIAL_CAP: 6000,         // tek denemede verilebilecek altın tavanı
  FUELTRIAL_DIA_TIERS: [       // ilk kez aşılan mesafe eşiklerinde elmas bonusu
    { dist: 500,   dia: 2 },
    { dist: 1200,  dia: 5 },
    { dist: 2500,  dia: 10 },
    { dist: 5000,  dia: 20 }
  ],
  fuelTrialBest() { return this._g('fuelTrialBest', 0) || 0; },
  _fuelTrialDiaFor(prev, dist) {
    let dia = 0;
    for (const t of this.FUELTRIAL_DIA_TIERS) if (dist >= t.dist && prev < t.dist) dia += t.dia;
    return dia;
  },
  // Bir sonraki rekorun (mevcut mesafeyle) vereceği tahmini ödül — UI önizleme için
  fuelTrialPreview(dist) {
    dist = Math.max(0, Math.floor(dist || 0));
    const prev = this.fuelTrialBest();
    if (dist <= prev) return { record: false, gold: 0, dia: 0, gain: 0 };
    const gain = dist - prev;
    const gold = Math.floor(Math.min(gain * this.FUELTRIAL_GOLD_PER, this.FUELTRIAL_CAP) * this.coinMult());
    return { record: true, gold: gold, dia: this._fuelTrialDiaFor(prev, dist), gain: gain };
  },
  submitFuelTrial(dist) {
    dist = Math.max(0, Math.floor(dist || 0));
    const prev = this.fuelTrialBest();
    if (dist <= prev) return { record: false, hi: prev, prev: prev, gold: 0, dia: 0, gain: 0 };
    const gain = dist - prev;
    const gold = Math.floor(Math.min(gain * this.FUELTRIAL_GOLD_PER, this.FUELTRIAL_CAP) * this.coinMult());
    const dia = this._fuelTrialDiaFor(prev, dist);
    this._s('fuelTrialBest', dist);
    this._addGold(gold);
    if (dia > 0) this._addDia(dia);
    return { record: true, hi: dist, prev: prev, gold: gold, dia: dia, gain: gain };
  },

  // ── KONTROL NOKTASI (Checkpoint) EN İYİ BONUSU (yeni bonus türü) ──
  // Bir turda geçilen kontrol noktası sayısında yeni rekor kırınca ödül;
  // ödül akışı diğerleriyle aynı (gold coinMult ile, diamond sabit).
  CHECKPOINT_GOLD_PER: 60,     // rekordaki her ekstra kontrol noktası için altın
  CHECKPOINT_CAP: 4000,        // tek turda verilebilecek altın tavanı
  CHECKPOINT_DIA_TIERS: [      // ilk kez aşılan kontrol noktası eşiklerinde elmas
    { cps: 10,  dia: 2 },
    { cps: 25,  dia: 5 },
    { cps: 50,  dia: 10 },
    { cps: 100, dia: 20 }
  ],
  checkpointBest() { return this._g('checkpointBest', 0) || 0; },
  _checkpointDiaFor(prev, cps) {
    let dia = 0;
    for (const t of this.CHECKPOINT_DIA_TIERS) if (cps >= t.cps && prev < t.cps) dia += t.dia;
    return dia;
  },
  // Bir sonraki rekorun (mevcut kontrol noktasıyla) vereceği tahmini ödül — UI önizleme
  checkpointPreview(cps) {
    cps = Math.max(0, Math.floor(cps || 0));
    const prev = this.checkpointBest();
    if (cps <= prev) return { record: false, gold: 0, dia: 0, gain: 0 };
    const gain = cps - prev;
    const gold = Math.floor(Math.min(gain * this.CHECKPOINT_GOLD_PER, this.CHECKPOINT_CAP) * this.coinMult());
    return { record: true, gold: gold, dia: this._checkpointDiaFor(prev, cps), gain: gain };
  },
  submitCheckpoint(cps) {
    cps = Math.max(0, Math.floor(cps || 0));
    const prev = this.checkpointBest();
    if (cps <= prev) return { record: false, hi: prev, prev: prev, gold: 0, dia: 0, gain: 0 };
    const gain = cps - prev;
    const gold = Math.floor(Math.min(gain * this.CHECKPOINT_GOLD_PER, this.CHECKPOINT_CAP) * this.coinMult());
    const dia = this._checkpointDiaFor(prev, cps);
    this._s('checkpointBest', cps);
    this._addGold(gold);
    if (dia > 0) this._addDia(dia);
    return { record: true, hi: cps, prev: prev, gold: gold, dia: dia, gain: gain };
  },

  // ── TESLİMAT (Delivery) EN İYİ SKOR BONUSU (yeni bonus türü) ──
  // Delivery modunda yeni skor rekoru kırınca ödül; ödül akışı diğerleriyle aynı
  // (gold coinMult ile, diamond sabit). Sadece kişisel rekorun ÜZERİNE ödül verir.
  DELIVERY_GOLD_PER: 4,        // yeni rekordaki her ekstra puan için altın
  DELIVERY_CAP: 5000,          // tek teslimatta verilebilecek altın tavanı
  DELIVERY_DIA_TIERS: [        // ilk kez aşılan skor eşiklerinde elmas bonusu
    { score: 800,   dia: 2 },
    { score: 2000,  dia: 5 },
    { score: 4000,  dia: 10 },
    { score: 8000,  dia: 20 }
  ],
  deliveryBest() { return this._g('deliveryBest', 0) || 0; },
  _deliveryDiaFor(prev, score) {
    let dia = 0;
    for (const t of this.DELIVERY_DIA_TIERS) if (score >= t.score && prev < t.score) dia += t.dia;
    return dia;
  },
  // Bir sonraki rekorun (mevcut skorla) vereceği tahmini ödül — UI önizleme için
  deliveryPreview(score) {
    score = Math.max(0, Math.floor(score || 0));
    const prev = this.deliveryBest();
    if (score <= prev) return { record: false, gold: 0, dia: 0, gain: 0 };
    const gain = score - prev;
    const gold = Math.floor(Math.min(gain * this.DELIVERY_GOLD_PER, this.DELIVERY_CAP) * this.coinMult());
    return { record: true, gold: gold, dia: this._deliveryDiaFor(prev, score), gain: gain };
  },
  submitDelivery(score) {
    score = Math.max(0, Math.floor(score || 0));
    const prev = this.deliveryBest();
    if (score <= prev) return { record: false, hi: prev, prev: prev, gold: 0, dia: 0, gain: 0 };
    const gain = score - prev;
    const gold = Math.floor(Math.min(gain * this.DELIVERY_GOLD_PER, this.DELIVERY_CAP) * this.coinMult());
    const dia = this._deliveryDiaFor(prev, score);
    this._s('deliveryBest', score);
    this._addGold(gold);
    if (dia > 0) this._addDia(dia);
    return { record: true, hi: score, prev: prev, gold: gold, dia: dia, gain: gain };
  },

  // ── HAFTALIK LİG BRAKETİ GALİBİYETİ BONUSU (yeni bonus türü) ──
  // Haftalık lig braketinde derece kazanınca verilen ödül. Coinrush tarzı guard:
  // her hafta yalnızca bir kez talep edilebilir. Ödül akışı diğerleriyle aynı
  // (gold coinMult ile, diamond sabit). place = braketteki bitiş sırası.
  BRACKET_REWARDS: [
    { place: 1,  gold: 3000, dia: 15, label: '1. Sıra' },
    { place: 2,  gold: 2000, dia: 8,  label: '2. Sıra' },
    { place: 3,  gold: 1200, dia: 5,  label: '3. Sıra' },
    { place: 5,  gold: 600,  dia: 2,  label: 'İlk 5'   },
    { place: 10, gold: 250,  dia: 0,  label: 'İlk 10'  }
  ],
  // Haftalık guard anahtarı (ISO benzeri yıl-hafta) — canSpin/lastSpin ile aynı desen
  _weekKey() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;   // Pazartesi = 0
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    const jan1 = new Date(monday.getFullYear(), 0, 1);
    const wk = Math.floor((monday - jan1) / 604800000) + 1;
    return monday.getFullYear() + '-W' + wk;
  },
  // Bitiş sırasına uyan en dar (en yüksek ödüllü) braket girdisi — yoksa null
  bracketRewardFor(place) {
    place = Math.max(1, Math.floor(place || 0));
    let best = null;
    for (const r of this.BRACKET_REWARDS) {
      if (place <= r.place && (!best || r.place < best.place)) best = r;
    }
    return best;
  },
  canClaimBracket() { return this._g('lastBracketWk', '') !== this._weekKey(); },
  // Bu haftanın braket ödülü önizlemesi (mutasyon yok) — UI için
  bracketPreview(place) {
    const r = this.bracketRewardFor(place);
    const open = this.canClaimBracket();
    if (!r) return { claimable: false, place: 0, gold: 0, dia: 0, label: '' };
    return { claimable: open, place: r.place,
             gold: Math.floor(r.gold * this.coinMult()), dia: (r.dia || 0), label: r.label };
  },
  claimBracketWin(place) {
    if (!this.canClaimBracket()) return { claimed: false, place: 0, gold: 0, dia: 0, label: '' };
    const r = this.bracketRewardFor(place);
    if (!r) return { claimed: false, place: 0, gold: 0, dia: 0, label: '' };
    this._s('lastBracketWk', this._weekKey());
    const gold = Math.floor(r.gold * this.coinMult());
    const dia = (r.dia || 0);
    this._addGold(gold);
    if (dia > 0) this._addDia(dia);
    return { claimed: true, place: r.place, gold: gold, dia: dia, label: r.label };
  },

  // ── GENEL EN İYİ SKOR GÖNDERİMİ (guard'lı yardımcı) ──
  // Yeni bir mod için kişisel rekor bazlı ödül vermenin ortak yolu. Ödül akışı
  // diğerleriyle aynı (gold coinMult ile, diamond sabit) ve yalnızca rekorun
  // ÜZERİNE ödül verir. opts: { saveKey, goldPer, cap, diaTiers:[{at,dia}] }.
  bestPreview(key, value, opts) {
    opts = opts || {};
    value = Math.max(0, Math.floor(value || 0));
    const skey = opts.saveKey || ('best_' + key);
    const prev = this._g(skey, 0) || 0;
    if (value <= prev) return { record: false, hi: prev, prev: prev, gold: 0, dia: 0, gain: 0 };
    const gain = value - prev;
    const per = (opts.goldPer != null) ? opts.goldPer : 1;
    const cap = (opts.cap != null) ? opts.cap : 5000;
    const gold = Math.floor(Math.min(gain * per, cap) * this.coinMult());
    let dia = 0;
    if (Array.isArray(opts.diaTiers)) for (const t of opts.diaTiers) {
      const thr = (t.at != null) ? t.at : (t.score != null ? t.score : (t.dist != null ? t.dist : t.cps));
      if (thr != null && value >= thr && prev < thr) dia += (t.dia || 0);
    }
    return { record: true, hi: value, prev: prev, gold: gold, dia: dia, gain: gain };
  },
  submitBest(key, value, opts) {
    const p = this.bestPreview(key, value, opts);
    if (!p.record) return p;
    const skey = (opts && opts.saveKey) || ('best_' + key);
    this._s(skey, p.hi);
    this._addGold(p.gold);
    if (p.dia > 0) this._addDia(p.dia);
    return p;
  }
};
