'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   SEASON EVENTS  —  Sezon Geçişi (Battle Pass) + Canlı Etkinlikler
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıklar (hepsi güvenli-opsiyonel):
     · SaveData.get/set   → kalıcılık (localStorage YOK; her şey SaveData üstünden)
     · SaveData.addGold/addDiamonds/addScrap/addPart/unlockVehicle → ödüller
     · UI.showToast / UI.goTo → bildirim & geri dönüş (opsiyonel)
     · Audio.* , Particles.* → efektler (opsiyonel)
     · Date.now()          → tüm zamanlama

   İÇERİK
     1) SEZON PASI  : 30 kademe, ücretsiz + premium hat, Date.now tabanlı süre.
     2) CANLI ETKİNLİKLER : zamanlı dönen etkinlikler, geri sayım + ilerleme.
     3) MEYDAN OKUMALAR   : 3 günlük + 3 haftalık görev → sezon XP + ödül.

   API
     SeasonEvents.draw(ctx, W, H)
     SeasonEvents.handleClick(x, y)   → 'back' | null
     SeasonEvents.addXP(n)            → koşu sonunda çağır (sezon XP'si)
     SeasonEvents.trackRun(stats)     → koşu sonunda çağır (etkinlik/görev ilerlemesi)

   KURALLAR: localStorage kullanmaz. Tüm para/XP girişleri NaN korumalıdır.
   ═══════════════════════════════════════════════════════════════════════════ */
const SeasonEvents = {

  // ── Zaman sabitleri ───────────────────────────────────────────────────────
  DAY_MS: 86400000,
  SEASON_DAYS: 30,
  TIER_COUNT: 30,
  XP_PER_TIER: 1000,        // her kademe 1000 XP → 30 kademe = 30.000 XP / sezon
  PREMIUM_PRICE: 40,        // elmas
  EVENT_SLOT_DAYS: 3.5,     // etkinlik rotasyon penceresi (yarım hafta)
  MAX_ACTIVE_EVENTS: 2,

  _SAVE_KEY: 'seasonEventsV1',

  // ── Tema (koyu / turuncu) ─────────────────────────────────────────────────
  COL: {
    bg0: '#0a0e1c', bg1: '#141a30',
    panel: '#171d33', panelHi: '#1e2745',
    line: 'rgba(255,255,255,0.09)',
    text: '#f2f5ff', mute: '#8b97b8',
    orange: '#ff8a2b', orangeHi: '#ffb44d', gold: '#ffcf3f',
    free: '#7f8db0', prem: '#ff8a2b',
    green: '#39d98a', red: '#ff5a5a', blue: '#4fd0ff'
  },

  // ── Çalışma zamanı durumu ─────────────────────────────────────────────────
  _state: null,
  _tab: 'season',          // 'season' | 'events' | 'quests'
  _tierPage: 0,            // kademe şeridi sayfası (4'erli)
  _t: 0,                   // animasyon zamanı
  _btns: [],               // her draw'da yeniden doldurulan tıklama hedefleri

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR — sayı / kalıcılık
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fallback) { v = Number(v); return isFinite(v) ? v : (Number(fallback) || 0); },
  _int(v, fallback) { return Math.floor(this._num(v, fallback)); },

  _now() { return Date.now(); },

  _fresh() {
    return {
      seasonId: 1,
      seasonStart: this._now(),
      xp: 0,
      premiumOwned: false,
      claimedFree: {},      // { tier: true }
      claimedPrem: {},      // { tier: true }
      eventProgress: {},    // { slotKey: value }
      eventClaimed: {},     // { slotKey: true }
      dailyDate: '',
      dailyProg: {},        // { qid: value }
      dailyClaimed: {},     // { qid: true }
      weeklyKey: '',
      weeklyProg: {},
      weeklyClaimed: {}
    };
  },

  _get() {
    if (this._state) return this._state;
    let d = null;
    try { if (typeof SaveData !== 'undefined' && SaveData.get) d = SaveData.get(this._SAVE_KEY); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = this._fresh();
    // Alan güvenceleri (eski/bozuk kayıt → çökme yok)
    const f = this._fresh();
    for (const k in f) { if (d[k] === undefined || d[k] === null) d[k] = f[k]; }
    d.xp = Math.max(0, this._int(d.xp, 0));
    d.seasonStart = this._num(d.seasonStart, this._now());
    d.seasonId = Math.max(1, this._int(d.seasonId, 1));
    this._state = d;
    this._rolloverSeason();
    return this._state;
  },

  _save() {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, this._state); } catch (e) {}
  },

  // Sezon süresi dolduysa yeni sezona geç (Date.now tabanlı)
  _rolloverSeason() {
    const s = this._state; if (!s) return;
    const dur = this.SEASON_DAYS * this.DAY_MS;
    let guard = 0;
    while (this._now() - s.seasonStart >= dur && guard < 240) {
      s.seasonId += 1;
      s.seasonStart += dur;
      s.xp = 0;
      s.premiumOwned = false;
      s.claimedFree = {};
      s.claimedPrem = {};
      guard++;
    }
    if (guard > 0) this._save();
  },

  // ── Sezon zamanı ──
  seasonEndMs() { const s = this._get(); return s.seasonStart + this.SEASON_DAYS * this.DAY_MS; },
  seasonRemainMs() { return Math.max(0, this.seasonEndMs() - this._now()); },

  // ── XP / kademe ──
  totalXP() { return Math.max(0, this._int(this._get().xp, 0)); },
  currentTier() { return Math.min(this.TIER_COUNT, Math.floor(this.totalXP() / this.XP_PER_TIER)); },
  xpIntoTier() { return this.totalXP() - this.currentTier() * this.XP_PER_TIER; },
  tierProgress() {
    if (this.currentTier() >= this.TIER_COUNT) return 1;
    return Math.min(1, this.xpIntoTier() / this.XP_PER_TIER);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC — addXP  (koşu sonunda çağrılır)
  // ══════════════════════════════════════════════════════════════════════════
  addXP(n) {
    n = this._int(n, 0);
    if (n <= 0) return this.totalXP();
    const s = this._get();
    const before = this.currentTier();
    s.xp = Math.max(0, this._int(s.xp, 0) + n);
    this._save();
    const after = this.currentTier();
    if (after > before && typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('🎫 Sezon Kademesi ' + after + '!');
      try { if (typeof Audio !== 'undefined' && Audio.playTierUp) Audio.playTierUp(); } catch (e) {}
    }
    return this.totalXP();
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KADEME ÖDÜLLERİ  (deterministik tablo)
  // ══════════════════════════════════════════════════════════════════════════
  //  reward: { gold?, diamonds?, scrap?, part?, vehicle?, label, icon }
  freeReward(tier) {
    tier = this._int(tier, 1);
    if (tier % 10 === 0) return { diamonds: 8 + tier, icon: '◆', label: '◆ ' + (8 + tier) };
    if (tier % 5 === 0)  return { scrap: 60 + tier * 4, icon: '◈', label: '◈ ' + (60 + tier * 4) };
    const g = 120 + tier * 25;
    return { gold: g, icon: '⧆', label: '⧆ ' + g };
  },

  premReward(tier) {
    tier = this._int(tier, 1);
    if (tier === this.TIER_COUNT) return { vehicle: 'neonracer', diamonds: 30, icon: '🚗', label: 'ARAÇ + ◆30' };
    if (tier % 10 === 0) return { diamonds: 25 + tier, icon: '◆', label: '◆ ' + (25 + tier) };
    if (tier % 6 === 0)  return { part: this._partForTier(tier), icon: '🔩', label: 'PARÇA' };
    if (tier % 3 === 0)  return { scrap: 150 + tier * 6, icon: '◈', label: '◈ ' + (150 + tier * 6) };
    const g = 300 + tier * 55;
    return { gold: g, icon: '⧆', label: '⧆ ' + g };
  },

  _partForTier(tier) {
    const parts = ['nitro', 'wing', 'spring', 'turbo', 'coin_magnet'];
    return parts[Math.floor(tier / 6) % parts.length];
  },

  // Ödülü hesaba geçir (NaN korumalı, güvenli-opsiyonel çağrılar)
  _grant(r) {
    if (!r || typeof r !== 'object') return;
    try {
      if (r.gold)     { const g = this._int(r.gold, 0);     if (g > 0 && typeof SaveData !== 'undefined' && SaveData.addGold)     SaveData.addGold(g); }
      if (r.diamonds) { const d = this._int(r.diamonds, 0); if (d > 0 && typeof SaveData !== 'undefined' && SaveData.addDiamonds) SaveData.addDiamonds(d); }
      if (r.scrap)    { const c = this._int(r.scrap, 0);    if (c > 0 && typeof SaveData !== 'undefined' && SaveData.addScrap)    SaveData.addScrap(c); }
      if (r.part && typeof SaveData !== 'undefined' && SaveData.addPart)          SaveData.addPart(r.part);
      if (r.vehicle && typeof SaveData !== 'undefined' && SaveData.unlockVehicle) SaveData.unlockVehicle(r.vehicle);
      if (r.xp) this.addXP(r.xp);
    } catch (e) {}
  },

  _rewardToast(r) {
    if (!r) return;
    let m = '🎁 Ödül:';
    if (r.gold)     m += ' ⧆' + this._int(r.gold, 0);
    if (r.diamonds) m += ' ◆' + this._int(r.diamonds, 0);
    if (r.scrap)    m += ' ◈' + this._int(r.scrap, 0);
    if (r.part)     m += ' 🔩 parça';
    if (r.vehicle)  m += ' 🚗 araç!';
    if (r.xp)       m += ' ✦' + this._int(r.xp, 0) + ' XP';
    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(m);
    try { if (typeof Audio !== 'undefined' && Audio.playPickup) Audio.playPickup(); } catch (e) {}
  },

  _claimTier(tier, premium) {
    const s = this._get();
    tier = this._int(tier, 0);
    if (tier < 1 || tier > this.TIER_COUNT) return false;
    if (this.currentTier() < tier) { if (UI && UI.showToast) UI.showToast('Bu kademeye ulaşmadın!'); return false; }
    if (premium && !s.premiumOwned) { if (UI && UI.showToast) UI.showToast('Premium pas gerekli! ◆' + this.PREMIUM_PRICE); return false; }
    const bag = premium ? s.claimedPrem : s.claimedFree;
    if (bag[tier]) return false;   // zaten alınmış
    const r = premium ? this.premReward(tier) : this.freeReward(tier);
    bag[tier] = true;
    this._grant(r);
    this._save();
    this._rewardToast(r);
    return true;
  },

  buyPremium() {
    const s = this._get();
    if (s.premiumOwned) return false;
    if (typeof SaveData === 'undefined' || !SaveData.spendDiamonds) return false;
    if (!SaveData.spendDiamonds(this.PREMIUM_PRICE)) {
      if (UI && UI.showToast) UI.showToast('Yeterli elmas yok! ◆' + this.PREMIUM_PRICE);
      return false;
    }
    s.premiumOwned = true;
    this._save();
    if (UI && UI.showToast) UI.showToast('⭐ Premium Sezon Pası açıldı!');
    try { if (typeof Audio !== 'undefined' && Audio.playPurchaseBig) Audio.playPurchaseBig(); } catch (e) {}
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CANLI ETKİNLİKLER  (zamanlı, dönen)
  // ══════════════════════════════════════════════════════════════════════════
  _EVENT_POOL: [
    { id: 'gold2x',   name: '2X ALTIN HAFTA SONU', icon: '⧆', metric: 'gold',     target: 4000, desc: 'Koşularda toplam altın topla', reward: { gold: 3000, xp: 300 } },
    { id: 'blizzard', name: 'KAR FIRTINASI YARIŞI', icon: '❄️', metric: 'distance', target: 6000, desc: 'Tek/çok koşuda mesafe kat et',   reward: { diamonds: 15, xp: 300 } },
    { id: 'flipday',  name: 'FLIP USTASI GÜNÜ',     icon: '🌀', metric: 'flips',    target: 40,   desc: 'Havada takla at',              reward: { scrap: 400, xp: 300 } },
    { id: 'marathon', name: 'MARATON MEYDANI',      icon: '🏁', metric: 'distance', target: 9000, desc: 'Uzun mesafeler sür',            reward: { gold: 4000, xp: 350 } },
    { id: 'grind',    name: 'SÜRÜCÜ MARATONU',      icon: '🚙', metric: 'runs',     target: 12,   desc: 'Koşu tamamla',                 reward: { diamonds: 12, xp: 250 } },
    { id: 'stunt',    name: 'GÖSTERİ FESTİVALİ',    icon: '🎪', metric: 'flips',    target: 60,   desc: 'Takla şovu yap',               reward: { scrap: 500, xp: 350 } },
    { id: 'rich',     name: 'ALTIN HÜCUMU',         icon: '💰', metric: 'gold',     target: 6000, desc: 'Servet biriktir',              reward: { gold: 5000, xp: 400 } }
  ],

  _slotMs() { return this.EVENT_SLOT_DAYS * this.DAY_MS; },
  _slotIndex() { return Math.floor(this._now() / this._slotMs()); },
  _slotEndMs() { return (this._slotIndex() + 1) * this._slotMs(); },
  _slotRemainMs() { return Math.max(0, this._slotEndMs() - this._now()); },

  // Şu an aktif etkinlikler (slot indeksine göre deterministik döner)
  activeEvents() {
    const pool = this._EVENT_POOL;
    const slot = this._slotIndex();
    const out = [];
    const half = Math.floor(pool.length / 2);
    for (let i = 0; i < this.MAX_ACTIVE_EVENTS; i++) {
      const ev = pool[(slot + i * half + i) % pool.length];
      if (out.indexOf(ev) === -1) out.push(ev);
    }
    return out;
  },

  _eventKey(ev) { return this._slotIndex() + '_' + ev.id; },
  eventProgress(ev) { return Math.max(0, this._num(this._get().eventProgress[this._eventKey(ev)], 0)); },
  eventClaimed(ev) { return !!this._get().eventClaimed[this._eventKey(ev)]; },
  eventDone(ev) { return this.eventProgress(ev) >= ev.target; },

  _claimEvent(ev) {
    const s = this._get();
    const key = this._eventKey(ev);
    if (s.eventClaimed[key]) return false;
    if (!this.eventDone(ev)) { if (UI && UI.showToast) UI.showToast('Etkinlik henüz tamamlanmadı!'); return false; }
    s.eventClaimed[key] = true;
    this._grant(ev.reward);
    this._save();
    this._rewardToast(ev.reward);
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  GÜNLÜK / HAFTALIK MEYDAN OKUMALAR
  // ══════════════════════════════════════════════════════════════════════════
  _DAILY_POOL: [
    { id: 'd_dist',  icon: '🏁', metric: 'distance', target: 1500, desc: '{t} m mesafe git',   reward: { gold: 400,  xp: 120 } },
    { id: 'd_flip',  icon: '🌀', metric: 'flips',    target: 6,    desc: '{t} takla at',        reward: { scrap: 120, xp: 120 } },
    { id: 'd_runs',  icon: '🚗', metric: 'runs',     target: 3,    desc: '{t} koşu tamamla',    reward: { gold: 300,  xp: 100 } },
    { id: 'd_gold',  icon: '⧆', metric: 'gold',     target: 1200, desc: '{t} altın topla',     reward: { diamonds: 3, xp: 130 } },
    { id: 'd_far',   icon: '📏', metric: 'distance', target: 2500, desc: '{t} m tek turda git', reward: { gold: 500,  xp: 150 } }
  ],
  _WEEKLY_POOL: [
    { id: 'w_dist',  icon: '🗺️', metric: 'distance', target: 20000, desc: '{t} m toplam mesafe', reward: { diamonds: 20, xp: 500 } },
    { id: 'w_flip',  icon: '🎯', metric: 'flips',    target: 80,    desc: '{t} takla at',        reward: { scrap: 600,  xp: 500 } },
    { id: 'w_runs',  icon: '🏆', metric: 'runs',     target: 25,    desc: '{t} koşu tamamla',    reward: { gold: 6000,  xp: 500 } },
    { id: 'w_gold',  icon: '💎', metric: 'gold',     target: 15000, desc: '{t} altın topla',     reward: { diamonds: 18, xp: 500 } }
  ],

  _dayStamp() { return new Date().toDateString(); },
  _weekStamp() {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / this.DAY_MS) + onejan.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + week;
  },

  // Tohum tabanlı deterministik seçim (localStorage yok, saf hesap)
  _pick(pool, seed, count) {
    const idx = [];
    for (let i = 0; i < pool.length; i++) idx.push(i);
    // basit karıştırma
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
    }
    return idx.slice(0, count).map(i => pool[i]);
  },

  _seedFromStamp(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h) + 1;
  },

  dailyQuests() {
    const s = this._get();
    const stamp = this._dayStamp();
    if (s.dailyDate !== stamp) {   // gün değişti → sıfırla
      s.dailyDate = stamp;
      s.dailyProg = {};
      s.dailyClaimed = {};
      this._save();
    }
    return this._pick(this._DAILY_POOL, this._seedFromStamp(stamp), 3);
  },

  weeklyQuests() {
    const s = this._get();
    const stamp = this._weekStamp();
    if (s.weeklyKey !== stamp) {
      s.weeklyKey = stamp;
      s.weeklyProg = {};
      s.weeklyClaimed = {};
      this._save();
    }
    return this._pick(this._WEEKLY_POOL, this._seedFromStamp(stamp), 3);
  },

  _questProg(q, weekly) { return Math.max(0, this._num((weekly ? this._get().weeklyProg : this._get().dailyProg)[q.id], 0)); },
  _questClaimed(q, weekly) { return !!(weekly ? this._get().weeklyClaimed : this._get().dailyClaimed)[q.id]; },
  _questDone(q, weekly) { return this._questProg(q, weekly) >= q.target; },

  _claimQuest(q, weekly) {
    const s = this._get();
    const claimed = weekly ? s.weeklyClaimed : s.dailyClaimed;
    if (claimed[q.id]) return false;
    if (!this._questDone(q, weekly)) { if (UI && UI.showToast) UI.showToast('Görev tamamlanmadı!'); return false; }
    claimed[q.id] = true;
    this._grant(q.reward);
    this._save();
    this._rewardToast(q.reward);
    return true;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC — trackRun  (koşu sonunda çağrılır)
  //  stats: { distance, flips, gold, diamonds, maxSpeed?, airtime?, mapId?, ... }
  // ══════════════════════════════════════════════════════════════════════════
  trackRun(stats) {
    stats = stats || {};
    const dist  = Math.max(0, this._num(stats.distance, 0));
    const flips = Math.max(0, this._int(stats.flips, 0));
    const gold  = Math.max(0, this._int(stats.gold, 0));
    const metrics = {
      distance: dist,
      flips: flips,
      gold: gold,
      runs: 1
    };
    const s = this._get();

    // ── Etkinlikler ──
    this.activeEvents().forEach(ev => {
      const key = this._eventKey(ev);
      const add = this._num(metrics[ev.metric], 0);
      if (add <= 0) return;
      s.eventProgress[key] = Math.min(ev.target, this._num(s.eventProgress[key], 0) + add);
    });

    // ── Günlük görevler ──
    this.dailyQuests().forEach(q => {
      if (s.dailyClaimed[q.id]) return;
      const add = this._num(metrics[q.metric], 0);
      if (add <= 0) return;
      // "tek turda" mesafe görevi → biriktirme yerine en yüksek tek koşu
      if (q.id === 'd_far') s.dailyProg[q.id] = Math.min(q.target, Math.max(this._num(s.dailyProg[q.id], 0), dist));
      else s.dailyProg[q.id] = Math.min(q.target, this._num(s.dailyProg[q.id], 0) + add);
    });

    // ── Haftalık görevler ──
    this.weeklyQuests().forEach(q => {
      if (s.weeklyClaimed[q.id]) return;
      const add = this._num(metrics[q.metric], 0);
      if (add <= 0) return;
      s.weeklyProg[q.id] = Math.min(q.target, this._num(s.weeklyProg[q.id], 0) + add);
    });

    this._save();
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
    return m + 'dk ' + s + 'sn';
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ÇİZİM YARDIMCILARI
  // ══════════════════════════════════════════════════════════════════════════
  _rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));   // negatif yarıçap → çökme koruması
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  _bar(ctx, x, y, w, h, pct, col) {
    pct = Math.max(0, Math.min(1, this._num(pct, 0)));
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this._rr(ctx, x, y, w, h, h / 2); ctx.fill();
    if (pct > 0) {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, col); g.addColorStop(1, this.COL.orangeHi);
      ctx.fillStyle = g;
      this._rr(ctx, x, y, Math.max(h, w * pct), h, h / 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    this._rr(ctx, x, y, w, h, h / 2); ctx.stroke();
  },

  _button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const enabled = opts.enabled !== false;
    let bg = opts.bg || this.COL.orange;
    if (!enabled) bg = 'rgba(255,255,255,0.08)';
    ctx.fillStyle = bg;
    this._rr(ctx, x, y, w, h, 9); ctx.fill();
    if (opts.glow && enabled) {
      ctx.strokeStyle = this.COL.orangeHi; ctx.lineWidth = 2;
      this._rr(ctx, x, y, w, h, 9); ctx.stroke();
    }
    ctx.fillStyle = enabled ? (opts.fg || '#1a1206') : this.COL.mute;
    ctx.font = 'bold ' + (opts.fs || 13) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  DRAW  (ana giriş)
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H) {
    this._t += 0.016;
    this._btns = [];
    this._get();   // durum + rollover garantisi

    // Arkaplan
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg0); g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    this._drawHeader(ctx, W, H);
    this._drawTabs(ctx, W, H);

    const top = 118;
    if (this._tab === 'season')      this._drawSeason(ctx, W, H, top);
    else if (this._tab === 'events') this._drawEvents(ctx, W, H, top);
    else                             this._drawQuests(ctx, W, H, top);
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

    // Başlık + sezon geri sayımı
    ctx.fillStyle = this.COL.orange; ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('SEZON ' + this._get().seasonId, 62, 24);
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    ctx.fillText('⏳ ' + this._fmtCountdown(this.seasonRemainMs()) + ' kaldı', 62, 40);

    // Kademe rozeti (sağ üst)
    const tier = this.currentTier();
    ctx.textAlign = 'right';
    ctx.fillStyle = this.COL.gold; ctx.font = 'bold 15px Arial';
    ctx.fillText('KADEME ' + tier + '/' + this.TIER_COUNT, W - 14, 24);
    ctx.fillStyle = this.COL.mute; ctx.font = '10px Arial';
    ctx.fillText(this._get().premiumOwned ? '⭐ Premium' : 'Ücretsiz hat', W - 14, 40);
  },

  _drawTabs(ctx, W, H) {
    const tabs = [
      { id: 'season', label: 'SEZON PASI' },
      { id: 'events', label: 'ETKİNLİKLER' },
      { id: 'quests', label: 'GÖREVLER' }
    ];
    const y = 58, h = 40, gap = 6;
    const bw = (W - 24 - gap * 2) / 3;
    tabs.forEach((t, i) => {
      const x = 12 + i * (bw + gap);
      const on = this._tab === t.id;
      ctx.fillStyle = on ? this.COL.orange : this.COL.panel;
      this._rr(ctx, x, y, bw, h, 9); ctx.fill();
      if (!on) { ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; this._rr(ctx, x, y, bw, h, 9); ctx.stroke(); }
      ctx.fillStyle = on ? '#1a1206' : this.COL.mute;
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.label, x + bw / 2, y + h / 2 + 1);
      this._btns.push({ x: x, y: y, w: bw, h: h, act: 'tab:' + t.id });
    });
  },

  // ── SEZON PASI ──
  _drawSeason(ctx, W, H, top) {
    // XP ilerleme çubuğu (mevcut kademe → sonraki)
    const tier = this.currentTier();
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Sonraki kademe', 14, top + 8);
    ctx.textAlign = 'right'; ctx.fillStyle = this.COL.mute;
    if (tier >= this.TIER_COUNT) ctx.fillText('MAKS', W - 14, top + 8);
    else ctx.fillText(this.xpIntoTier() + ' / ' + this.XP_PER_TIER + ' XP', W - 14, top + 8);
    this._bar(ctx, 14, top + 18, W - 28, 12, this.tierProgress(), this.COL.orange);

    // Premium satın alma satırı
    let y = top + 42;
    if (!this._get().premiumOwned) {
      ctx.fillStyle = this.COL.panelHi; this._rr(ctx, 12, y, W - 24, 40, 9); ctx.fill();
      ctx.strokeStyle = this.COL.orange; ctx.lineWidth = 1.5; this._rr(ctx, 12, y, W - 24, 40, 9); ctx.stroke();
      ctx.fillStyle = this.COL.text; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('⭐ Premium Pas — tüm ödüllerin kilidini aç', 22, y + 20);
      const bw = 92, bx = W - 12 - bw - 8;
      this._button(ctx, bx, y + 6, bw, 28, '◆ ' + this.PREMIUM_PRICE, { glow: true });
      this._btns.push({ x: bx, y: y + 6, w: bw, h: 28, act: 'buyprem' });
      y += 50;
    } else { y += 6; }

    // Kademe şeridi (4'erli sayfalar)
    const perPage = 4;
    const maxPage = Math.ceil(this.TIER_COUNT / perPage) - 1;
    if (this._tierPage < 0) this._tierPage = 0;
    if (this._tierPage > maxPage) this._tierPage = maxPage;

    // Sayfalama başlığı + ok butonları
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Kademe ' + (this._tierPage * perPage + 1) + '-' + Math.min(this.TIER_COUNT, (this._tierPage + 1) * perPage), W / 2, y + 12);
    // sol ok
    this._pageArrow(ctx, 12, y, 34, 24, '‹', this._tierPage > 0, 'tierprev');
    // sağ ok
    this._pageArrow(ctx, W - 46, y, 34, 24, '›', this._tierPage < maxPage, 'tiernext');
    y += 30;

    const startTier = this._tierPage * perPage + 1;
    const cardH = Math.min(96, (H - y - 16) / perPage - 8);
    for (let i = 0; i < perPage; i++) {
      const t = startTier + i;
      if (t > this.TIER_COUNT) break;
      this._drawTierRow(ctx, 12, y, W - 24, cardH, t);
      y += cardH + 8;
    }
  },

  _pageArrow(ctx, x, y, w, h, ch, enabled, act) {
    ctx.fillStyle = enabled ? this.COL.panelHi : 'rgba(255,255,255,0.05)';
    this._rr(ctx, x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = enabled ? this.COL.orange : this.COL.mute;
    ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, x + w / 2, y + h / 2 + 1);
    if (enabled) this._btns.push({ x: x, y: y, w: w, h: h, act: act });
  },

  _drawTierRow(ctx, x, y, w, h, tier) {
    const reached = this.currentTier() >= tier;
    const s = this._get();
    // Kart zemini
    ctx.fillStyle = reached ? this.COL.panelHi : this.COL.panel;
    this._rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = reached ? 'rgba(255,138,43,0.5)' : this.COL.line; ctx.lineWidth = 1;
    this._rr(ctx, x, y, w, h, 10); ctx.stroke();

    // Kademe numarası dairesi
    const cx = x + 30, cy = y + h / 2;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 6.2832);
    ctx.fillStyle = reached ? this.COL.orange : 'rgba(255,255,255,0.07)'; ctx.fill();
    ctx.fillStyle = reached ? '#1a1206' : this.COL.mute; ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(tier), cx, cy + 1);

    const colX = x + 62, colW = w - 62 - 12;
    const half = (h - 12) / 2;

    // ÜCRETSİZ hat (alt)
    this._drawRewardChip(ctx, colX, y + 6 + half, colW, half - 2, this.freeReward(tier), false, tier, reached, !!s.claimedFree[tier]);
    // PREMIUM hat (üst)
    this._drawRewardChip(ctx, colX, y + 6, colW, half - 2, this.premReward(tier), true, tier, reached, !!s.claimedPrem[tier]);
  },

  _drawRewardChip(ctx, x, y, w, h, r, premium, tier, reached, claimed) {
    const s = this._get();
    const lockedPrem = premium && !s.premiumOwned;
    // etiket şeridi
    ctx.fillStyle = premium ? 'rgba(255,138,43,0.14)' : 'rgba(255,255,255,0.05)';
    this._rr(ctx, x, y, w, h, 7); ctx.fill();

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = premium ? this.COL.orange : this.COL.free;
    ctx.font = 'bold 9px Arial';
    ctx.fillText(premium ? '⭐ PREMIUM' : 'ÜCRETSİZ', x + 8, y + h / 2 - 7);
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 12px Arial';
    ctx.fillText(r.label, x + 8, y + h / 2 + 7);

    // Durum / claim butonu (sağ)
    const bw = 74, bx = x + w - bw - 6, by = y + (h - 22) / 2;
    if (claimed) {
      ctx.fillStyle = this.COL.green; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right';
      ctx.fillText('✓ ALINDI', x + w - 8, y + h / 2 + 1);
    } else if (!reached) {
      ctx.fillStyle = this.COL.mute; ctx.font = '15px Arial'; ctx.textAlign = 'right';
      ctx.fillText('🔒', x + w - 10, y + h / 2 + 1);
    } else if (lockedPrem) {
      ctx.fillStyle = this.COL.mute; ctx.font = '15px Arial'; ctx.textAlign = 'right';
      ctx.fillText('⭐🔒', x + w - 10, y + h / 2 + 1);
    } else {
      this._button(ctx, bx, by, bw, 22, 'AL', { glow: true, fs: 11 });
      this._btns.push({ x: bx, y: by, w: bw, h: 22, act: (premium ? 'claimp:' : 'claimf:') + tier });
    }
  },

  // ── CANLI ETKİNLİKLER ──
  _drawEvents(ctx, W, H, top) {
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🔥 AKTİF ETKİNLİKLER', 14, top + 6);
    ctx.textAlign = 'right'; ctx.fillStyle = this.COL.orange; ctx.font = 'bold 11px Arial';
    ctx.fillText('Yeni etkinlik: ' + this._fmtCountdown(this._slotRemainMs()), W - 14, top + 6);

    let y = top + 24;
    const evs = this.activeEvents();
    const cardH = 108;
    evs.forEach((ev, i) => {
      this._drawEventCard(ctx, 12, y, W - 24, cardH, ev);
      y += cardH + 12;
    });

    // Bilgi notu
    ctx.fillStyle = this.COL.mute; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Etkinlikler her ' + this.EVENT_SLOT_DAYS + ' günde bir yenilenir. İlerleme koşularla artar.', W / 2, y + 6);
  },

  _drawEventCard(ctx, x, y, w, h, ev) {
    const prog = this.eventProgress(ev);
    const pct = ev.target > 0 ? prog / ev.target : 0;
    const done = this.eventDone(ev);
    const claimed = this.eventClaimed(ev);

    ctx.fillStyle = this.COL.panel; this._rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = done ? 'rgba(57,217,138,0.55)' : this.COL.line; ctx.lineWidth = 1.5;
    this._rr(ctx, x, y, w, h, 12); ctx.stroke();

    // İkon rozeti
    ctx.fillStyle = 'rgba(255,138,43,0.16)'; this._rr(ctx, x + 12, y + 12, 44, 44, 10); ctx.fill();
    ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ev.icon, x + 12 + 22, y + 12 + 24);

    // Başlık + açıklama
    ctx.textAlign = 'left';
    ctx.fillStyle = this.COL.orange; ctx.font = 'bold 14px Arial';
    ctx.fillText(ev.name, x + 66, y + 22);
    ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
    ctx.fillText(ev.desc, x + 66, y + 40);

    // Ödül (sağ üst)
    ctx.textAlign = 'right'; ctx.fillStyle = this.COL.gold; ctx.font = 'bold 11px Arial';
    ctx.fillText('🎁 ' + this._rewardShort(ev.reward), x + w - 14, y + 22);

    // İlerleme çubuğu
    this._bar(ctx, x + 14, y + h - 34, w - 28, 12, pct, this.COL.orange);
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(this._fmtNum(prog) + ' / ' + this._fmtNum(ev.target), x + 16, y + h - 15);

    // Claim durumu / buton (sağ alt)
    const bw = 90, bx = x + w - bw - 14, by = y + h - 24;
    if (claimed) {
      ctx.textAlign = 'right'; ctx.fillStyle = this.COL.green; ctx.font = 'bold 12px Arial';
      ctx.fillText('✓ ALINDI', x + w - 16, y + h - 15);
    } else if (done) {
      this._button(ctx, bx, by, bw, 22, 'ÖDÜLÜ AL', { glow: true, fs: 11 });
      this._btns.push({ x: bx, y: by, w: bw, h: 22, act: 'claimev:' + ev.id });
    } else {
      ctx.textAlign = 'right'; ctx.fillStyle = this.COL.mute; ctx.font = '11px Arial';
      ctx.fillText(Math.floor(pct * 100) + '%', x + w - 16, y + h - 15);
    }
  },

  _rewardShort(r) {
    if (!r) return '';
    const parts = [];
    if (r.gold)     parts.push('⧆' + this._fmtNum(r.gold));
    if (r.diamonds) parts.push('◆' + this._int(r.diamonds, 0));
    if (r.scrap)    parts.push('◈' + this._fmtNum(r.scrap));
    if (r.part)     parts.push('🔩');
    if (r.vehicle)  parts.push('🚗');
    if (r.xp)       parts.push('✦' + this._int(r.xp, 0));
    return parts.join(' ');
  },

  // ── GÜNLÜK / HAFTALIK GÖREVLER ──
  _drawQuests(ctx, W, H, top) {
    let y = top;
    // Günlük başlık + geri sayım
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('📅 GÜNLÜK GÖREVLER', 14, y + 4);
    ctx.textAlign = 'right'; ctx.fillStyle = this.COL.mute; ctx.font = '10px Arial';
    ctx.fillText('yenilenme: ' + this._fmtCountdown(this._msToMidnight()), W - 14, y + 4);
    y += 18;
    this.dailyQuests().forEach(q => { this._drawQuestRow(ctx, 12, y, W - 24, 52, q, false); y += 58; });

    y += 6;
    ctx.fillStyle = this.COL.text; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🗓️ HAFTALIK GÖREVLER', 14, y + 4);
    ctx.textAlign = 'right'; ctx.fillStyle = this.COL.mute; ctx.font = '10px Arial';
    ctx.fillText('yenilenme: ' + this._fmtCountdown(this._msToWeekEnd()), W - 14, y + 4);
    y += 18;
    this.weeklyQuests().forEach(q => { this._drawQuestRow(ctx, 12, y, W - 24, 52, q, true); y += 58; });
  },

  _drawQuestRow(ctx, x, y, w, h, q, weekly) {
    const prog = this._questProg(q, weekly);
    const pct = q.target > 0 ? prog / q.target : 0;
    const done = this._questDone(q, weekly);
    const claimed = this._questClaimed(q, weekly);
    const desc = q.desc.replace('{t}', this._fmtNum(q.target));

    ctx.fillStyle = this.COL.panel; this._rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = done && !claimed ? 'rgba(57,217,138,0.55)' : this.COL.line; ctx.lineWidth = 1;
    this._rr(ctx, x, y, w, h, 10); ctx.stroke();

    // ikon
    ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(q.icon, x + 24, y + h / 2);

    // açıklama + ödül
    ctx.textAlign = 'left'; ctx.fillStyle = this.COL.text; ctx.font = 'bold 12px Arial';
    ctx.fillText(desc, x + 44, y + 15);
    ctx.fillStyle = this.COL.gold; ctx.font = '10px Arial';
    ctx.fillText('🎁 ' + this._rewardShort(q.reward), x + 44, y + 30);

    // ilerleme çubuğu
    this._bar(ctx, x + 44, y + h - 12, w - 44 - 96, 8, pct, this.COL.orange);
    ctx.fillStyle = this.COL.mute; ctx.font = '9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(this._fmtNum(prog) + '/' + this._fmtNum(q.target), x + 46, y + h - 6);

    // buton / durum
    const bw = 80, bx = x + w - bw - 10, by = y + (h - 26) / 2;
    if (claimed) {
      ctx.fillStyle = this.COL.green; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('✓', bx + bw / 2, y + h / 2 + 1);
    } else if (done) {
      this._button(ctx, bx, by, bw, 26, 'AL', { glow: true, fs: 12 });
      this._btns.push({ x: bx, y: by, w: bw, h: 26, act: (weekly ? 'claimw:' : 'claimd:') + q.id });
    } else {
      ctx.fillStyle = this.COL.mute; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(Math.floor(pct * 100) + '%', bx + bw / 2, y + h / 2 + 1);
    }
  },

  _msToMidnight() {
    const now = new Date();
    const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return mid.getTime() - now.getTime();
  },
  _msToWeekEnd() {
    const now = new Date();
    const day = now.getDay();                 // 0=Paz
    const daysToMon = (8 - (day === 0 ? 7 : day)) % 7 || 7;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMon, 0, 0, 0, 0);
    return end.getTime() - now.getTime();
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

    if (act.indexOf('tab:') === 0) { this._tab = act.slice(4); this._tierPage = 0; return null; }
    if (act === 'buyprem')  { this.buyPremium(); return null; }
    if (act === 'tierprev') { this._tierPage--; return null; }
    if (act === 'tiernext') { this._tierPage++; return null; }
    if (act.indexOf('claimf:') === 0) { this._claimTier(parseInt(act.slice(7), 10), false); return null; }
    if (act.indexOf('claimp:') === 0) { this._claimTier(parseInt(act.slice(7), 10), true);  return null; }
    if (act.indexOf('claimev:') === 0) {
      const ev = this._EVENT_POOL.find(e => e.id === act.slice(8));
      if (ev) this._claimEvent(ev);
      return null;
    }
    if (act.indexOf('claimd:') === 0) {
      const q = this._DAILY_POOL.find(e => e.id === act.slice(7));
      if (q) this._claimQuest(q, false);
      return null;
    }
    if (act.indexOf('claimw:') === 0) {
      const q = this._WEEKLY_POOL.find(e => e.id === act.slice(7));
      if (q) this._claimQuest(q, true);
      return null;
    }
    return null;
  }
};

// Global erişim (tarayıcı) — modül dışı script'ler için
if (typeof window !== 'undefined') window.SeasonEvents = SeasonEvents;
