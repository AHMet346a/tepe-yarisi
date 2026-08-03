'use strict';
/* ============================================================================
   LiveOps — Ekonomi & Canlı Operasyon  (100-özellik: F. #51–#60)
   ADDITIVE ve dayanıklı; her sistem bağımsız modül. GameConfig/SeasonEvents ile
   uyumlu, yoksa güvenli çalışır. Sunucu gerektirmez (uzak uç konfigüre edilene
   kadar yerel/simüle).

     #51 RemoteConfig    — uzaktan yapılandırma (güncelleme yapmadan dengeleme)
     #52 ABTest          — A/B test çerçevesi (varyant atama + ölçüm)
     #53 FeatureFlags    — özellik bayrakları (uzaktan aç/kapa)
     #54 EventScheduler  — sezon/etkinlik zamanlayıcı (otomatik başlat/bitir)
     #55 DynamicPricing  — dinamik fiyat & kişiye özel teklif
     #56 PityGacha       — gacha "pity" (garantili nadir, adil şans)
     #57 BattlePass      — battle pass motoru (ücretsiz+premium, XP eğrisi)
     #58 MoneySink       — enflasyon önleyici para giderleri
     #59 Segmentation    — oyuncu segmentasyonu (yeni/geri dönen/whale)
     #60 WinBack         — push bildirim & geri kazanım kampanyası
   ============================================================================ */

const _lo_clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
// Deterministik kullanıcı kimliği (kayıttan; yoksa üret)
function _lo_uid() {
  try {
    if (typeof SaveData !== 'undefined' && SaveData.get) {
      let id = SaveData.get('playerId');
      if (!id) { id = 'P' + (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase(); SaveData.set('playerId', id); }
      return id;
    }
  } catch (e) {}
  return 'ANON';
}
function _lo_hash(s) { s = String(s); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return h >>> 0; }

// ─────────────────────────────────────────────────────────────────────────────
// #51 RemoteConfig — uzaktan yapılandırma
//   JSON'dan denge sabitleri çeker; GameConfig'i EZMEDEN katman olarak override
//   sağlar. Uç yoksa yerel varsayılan. get('x.y', dflt) ile okunur.
// ─────────────────────────────────────────────────────────────────────────────
const RemoteConfig = {
  _over: Object.create(null), _url: null, _fetchedAt: 0,
  setUrl(url) { this._url = url; },
  // uzak JSON çek (varsa) → override tablosu; başarısızsa sessizce yerelde kalır
  fetchNow() {
    const self = this;
    if (!this._url) return Promise.resolve(false);
    return fetch(this._url + (this._url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { self._over = j || {}; self._fetchedAt = Date.now(); if (typeof EventBus !== 'undefined') EventBus.emit('remoteconfig:updated', j); return true; })
      .catch(function () { return false; });
  },
  set(path, val) { this._over[path] = val; },
  get(path, dflt) {
    if (Object.prototype.hasOwnProperty.call(this._over, path)) return this._over[path];
    if (typeof GameConfig !== 'undefined' && GameConfig.get) { const v = GameConfig.get(path, undefined); if (v !== undefined) return v; }
    return dflt;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #52 ABTest — A/B test çerçevesi
//   Kullanıcıyı deneye deterministik olarak (hash) bir varyanta atar; kararlıdır
//   (aynı kullanıcı hep aynı varyant). track() ile dönüşüm ölçülür.
// ─────────────────────────────────────────────────────────────────────────────
const ABTest = {
  _exp: Object.create(null),   // name -> variants[]
  define(name, variants) { this._exp[name] = variants && variants.length ? variants : ['A', 'B']; return this; },
  variant(name) {
    const v = this._exp[name] || ['A', 'B'];
    const idx = _lo_hash(_lo_uid() + ':' + name) % v.length;
    return v[idx];
  },
  isIn(name, variant) { return this.variant(name) === variant; },
  track(name, event) { if (typeof Telemetry !== 'undefined' && Telemetry.event) { try { Telemetry.event('ab:' + name + ':' + this.variant(name) + ':' + event); } catch (e) {} } if (typeof EventBus !== 'undefined') EventBus.emit('abtest:track', { name: name, variant: this.variant(name), event: event }); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #53 FeatureFlags — özellik bayrakları
//   Özelliği kod güncellemeden aç/kapa. RemoteConfig 'flags.X' varsa onu, yoksa
//   yerel varsayılanı kullanır; yüzde-yayılım (rollout) destekler.
// ─────────────────────────────────────────────────────────────────────────────
const FeatureFlags = {
  _defaults: { nitroShop: true, fpsMeter: true, cloudSync: false, battlePassV2: false },
  set(name, on) { this._defaults[name] = !!on; },
  enabled(name) {
    if (typeof RemoteConfig !== 'undefined') { const rc = RemoteConfig.get('flags.' + name, undefined); if (rc !== undefined) { if (typeof rc === 'number') return this._rollout(name, rc); return !!rc; } }
    return !!this._defaults[name];
  },
  // yüzde yayılım: kullanıcı hash'i eşiğin altındaysa açık (kararlı)
  _rollout(name, pct) { return (_lo_hash(_lo_uid() + ':flag:' + name) % 100) < _lo_clamp(pct, 0, 100); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #54 EventScheduler — sezon/etkinlik zamanlayıcı
//   Başlangıç/bitiş zamanlı etkinlikleri yönetir; now'a göre AKTİF olanları verir,
//   otomatik başlat/bitir olayları yayınlar.
// ─────────────────────────────────────────────────────────────────────────────
const EventScheduler = {
  _events: [], _activeIds: Object.create(null),
  add(id, startMs, endMs, data) { this._events.push({ id: id, start: startMs, end: endMs, data: data || {} }); return this; },
  active(now) { now = now || Date.now(); return this._events.filter(function (e) { return now >= e.start && now < e.end; }); },
  timeLeft(id, now) { now = now || Date.now(); const e = this._events.find(function (x) { return x.id === id; }); return e ? Math.max(0, e.end - now) : 0; },
  // her karede/saniyede çağrılabilir: başlayan/biten etkinlikler için olay yayınlar
  tick(now) {
    now = now || Date.now();
    const self = this;
    this._events.forEach(function (e) {
      const on = now >= e.start && now < e.end, was = !!self._activeIds[e.id];
      if (on && !was) { self._activeIds[e.id] = true; if (typeof EventBus !== 'undefined') EventBus.emit('event:start', e); }
      else if (!on && was) { delete self._activeIds[e.id]; if (typeof EventBus !== 'undefined') EventBus.emit('event:end', e); }
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #55 DynamicPricing — dinamik fiyat & kişiye özel teklif
//   Segment + davranışa göre kişiye özel indirim/paket üretir. Adil sınırlar içinde.
// ─────────────────────────────────────────────────────────────────────────────
const DynamicPricing = {
  // basePrice, segment ('new'|'returning'|'whale'|'churn_risk') → ayarlı fiyat + indirim
  offer(basePrice, segment) {
    let disc = 0;
    if (segment === 'new') disc = 0.5;             // ilk-alım teşviki
    else if (segment === 'churn_risk') disc = 0.4; // geri kazanım
    else if (segment === 'returning') disc = 0.2;
    else if (segment === 'whale') disc = 0;        // whale'e indirim yok, premium paket
    disc = _lo_clamp(disc, 0, 0.6);
    return { base: basePrice, discount: disc, price: Math.max(1, Math.round(basePrice * (1 - disc))), tag: disc > 0 ? '-%' + Math.round(disc * 100) : null };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #56 PityGacha — gacha "pity" (garantili nadir)
//   Her çekiliş nadir şansını artırır; pity eşiğinde nadir GARANTİ. Adil his.
// ─────────────────────────────────────────────────────────────────────────────
const PityGacha = {
  baseRare: 0.03, pity: 30, softStart: 20, softStep: 0.06,
  // counter: son nadirden bu yana çekiliş sayısı. rnd: 0..1 (Rng ile deterministik olabilir)
  roll(counter, rnd) {
    rnd = (rnd != null) ? rnd : (typeof Rng !== 'undefined' ? Rng.next() : Math.random());
    let p = this.baseRare;
    if (counter + 1 >= this.pity) return { rare: true, counter: 0, guaranteed: true };
    if (counter + 1 > this.softStart) p += (counter + 1 - this.softStart) * this.softStep; // soft-pity artış
    if (rnd < p) return { rare: true, counter: 0, guaranteed: false };
    return { rare: false, counter: counter + 1, guaranteed: false };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #57 BattlePass — battle pass motoru (ücretsiz + premium, XP eğrisi)
// ─────────────────────────────────────────────────────────────────────────────
const BattlePass = {
  maxTier: 50, xpPerTier: 1000, curve: 1.04,
  // toplam XP → {tier, into, need} (kademe, o kademeye giren XP, sonrakine kalan)
  tierFor(totalXp) {
    let tier = 0, need = this.xpPerTier, acc = 0;
    while (tier < this.maxTier && totalXp >= acc + need) { acc += need; tier++; need = Math.round(this.xpPerTier * Math.pow(this.curve, tier)); }
    return { tier: tier, into: totalXp - acc, need: need };
  },
  // kademe ödülü (ücretsiz + premium yol)
  reward(tier, premium) {
    const free = { gold: 100 + tier * 20 };
    const prem = premium ? { gold: 300 + tier * 50, diamonds: (tier % 5 === 0) ? 5 : 0 } : null;
    return { free: free, premium: prem };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #58 MoneySink — enflasyon önleyici para giderleri
//   Ekonomideki para arzını izler; arz yüksekse gider (kozmetik/upgrade fiyatı)
//   çarpanını artırarak enflasyonu dengeler.
// ─────────────────────────────────────────────────────────────────────────────
const MoneySink = {
  target: 50000,           // sağlıklı ortalama bakiye hedefi
  // balance: oyuncunun altını → fiyat çarpanı (0.85..1.6)
  priceMultiplier(balance) { const r = (balance || 0) / this.target; return _lo_clamp(0.85 + r * 0.35, 0.85, 1.6); },
  // önerilen gider miktarı (fazla parayı emmek için)
  suggestedSink(balance) { return Math.max(0, Math.round((balance - this.target) * 0.15)); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #59 Segmentation — oyuncu segmentasyonu
//   Davranıştan segment çıkarır: new / returning / core / whale / churn_risk.
// ─────────────────────────────────────────────────────────────────────────────
const Segmentation = {
  // p: {gamesPlayed, daysSinceInstall, daysSinceActive, spendTotal}
  classify(p) {
    p = p || {};
    const games = p.gamesPlayed || 0, spend = p.spendTotal || 0, inactive = p.daysSinceActive || 0, age = p.daysSinceInstall || 0;
    if (spend >= 500) return 'whale';
    if (inactive >= 7) return 'churn_risk';
    if (age <= 2 && games < 10) return 'new';
    if (inactive >= 2 && games > 20) return 'returning';
    return 'core';
  },
  // mevcut kayıttan otomatik segment
  current() {
    try {
      if (typeof SaveData === 'undefined' || !SaveData.get) return 'core';
      return this.classify({ gamesPlayed: SaveData.get('gamesPlayed') || 0, spendTotal: SaveData.get('spendTotal') || 0, daysSinceActive: 0, daysSinceInstall: 3 });
    } catch (e) { return 'core'; }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #60 WinBack — push bildirim & geri kazanım kampanyası
//   Uzaklaşan oyuncuya (churn_risk) zamanlı bildirim + geri dönüş ödülü planlar.
//   Notification API varsa gerçek bildirim; yoksa plan döndürür (test edilebilir).
// ─────────────────────────────────────────────────────────────────────────────
const WinBack = {
  // segment/gün'e göre kampanya planı üretir
  plan(segment, daysInactive) {
    if (segment !== 'churn_risk' && (daysInactive || 0) < 3) return null;
    const gift = (daysInactive || 3) >= 7 ? { gold: 5000, diamonds: 10 } : { gold: 1500 };
    return { title: 'Seni özledik, Ahmet! 🏁', body: 'Dönüş hediyeni al: ' + (gift.gold + ' altın') + (gift.diamonds ? ' + ' + gift.diamonds + ' elmas' : ''), gift: gift, when: 'next_open' };
  },
  // izin varsa gerçek bildirim göster (kullanıcı jesti gerektirir; sessiz başarısız)
  notify(planObj) {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && planObj) {
        new Notification(planObj.title, { body: planObj.body });
        return true;
      }
    } catch (e) {}
    return false;
  }
};

// ── LiveOps kimliği + kendi kendine tanılama ──
const LiveOps = {
  version: '1.0',
  systems: ['RemoteConfig', 'ABTest', 'FeatureFlags', 'EventScheduler', 'DynamicPricing', 'PityGacha', 'BattlePass', 'MoneySink', 'Segmentation', 'WinBack'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { RemoteConfig.set('x.y', 7); r.remoteconfig = RemoteConfig.get('x.y', 0) === 7 && typeof RemoteConfig.get('nope', 3) === 'number'; } catch (e) { r.remoteconfig = false; }
    try { ABTest.define('t', ['A', 'B']); const v = ABTest.variant('t'); r.abtest = (v === 'A' || v === 'B') && ABTest.variant('t') === v; } catch (e) { r.abtest = false; }
    try { FeatureFlags.set('foo', true); r.featureflags = FeatureFlags.enabled('foo') === true && FeatureFlags.enabled('missing') === false; } catch (e) { r.featureflags = false; }
    try { EventScheduler._events = []; EventScheduler._activeIds = {}; const now = Date.now(); EventScheduler.add('e1', now - 1000, now + 1000); r.eventscheduler = EventScheduler.active(now).length === 1 && EventScheduler.timeLeft('e1', now) > 0; } catch (e) { r.eventscheduler = false; }
    try { const o = DynamicPricing.offer(100, 'new'); r.dynamicpricing = o.price < 100 && o.discount > 0; } catch (e) { r.dynamicpricing = false; }
    try { const g = PityGacha.roll(PityGacha.pity - 1, 0.99); r.pitygacha = g.rare === true && g.guaranteed === true; } catch (e) { r.pitygacha = false; }
    try { const t = BattlePass.tierFor(2500); r.battlepass = t.tier >= 2 && typeof BattlePass.reward(t.tier, true).premium === 'object'; } catch (e) { r.battlepass = false; }
    try { r.moneysink = MoneySink.priceMultiplier(200000) > 1 && MoneySink.priceMultiplier(0) < 1; } catch (e) { r.moneysink = false; }
    try { r.segmentation = Segmentation.classify({ spendTotal: 999 }) === 'whale' && Segmentation.classify({ daysSinceActive: 10 }) === 'churn_risk'; } catch (e) { r.segmentation = false; }
    try { const p = WinBack.plan('churn_risk', 8); r.winback = p && p.gift && p.gift.gold >= 5000; } catch (e) { r.winback = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.RemoteConfig = RemoteConfig;
  window.ABTest = ABTest;
  window.FeatureFlags = FeatureFlags;
  window.EventScheduler = EventScheduler;
  window.DynamicPricing = DynamicPricing;
  window.PityGacha = PityGacha;
  window.BattlePass = BattlePass;
  window.MoneySink = MoneySink;
  window.Segmentation = Segmentation;
  window.WinBack = WinBack;
  window.LiveOps = LiveOps;
}
