'use strict';
const SaveData = {
  _ALL_VEHICLES: [
    'jeep','motocross','monster','racecar','tractor','superdiesel','rallycar','musclecar',
    'sportscar','formula','dunebuggy','dirtbike','snowmobile','chopper','scooter','atv','tank','loader',
    'semitruck','van','ambulance','hovercar','moonlander','lawnmower','rickshaw','hipstercar',
    'paintingtruck','supercar','bugatti','helicopter','submarine','dragster','pickup',
    'dune4x4','warthog','offroader','cybertruck','gokart','trophytruck',
    'jetski','bus','monowheel','golfcart','steamroller','limo',
    'firetruck','police','icecream',
    'racetruck','classic','rocketcar','snowcat','towtruck',
    'garbagetruck','forklift','campervan','locomotive','sweeper',
    'monsterbike','hovercraft','quadracer','stuntplane',
    'jetpackbike','gyrocopter','mechwalker','steamtruck','balloontruck',
    'bigfoot','sandrail','snowplow','armortruck','hoverbike',
    'shoppingcart','bathtub','rocketsled',
    'pennyfarthing','hotdogcart','coffinracer','jetboat',
    'unicorncart','bumpercar','dogsled','paddleboat',
    'cablecar','zamboni','harvester','pizzascooter',
    'cementmixer','crane','spaceshuttle','catamaran',
    'oldtimer','hoverboard','rowboat','wagon',
    'sportsbike','tricycle','minisub','hanglider',
    'microcar','tunnelborer','raft','sidecar',
    'speedster','microbus','carriage','airship',
    'taxicab','airboat','dumptruck','bobsled',
    'solarcruiser','pumpkincoach','maglevpod','dragonflyer',
    'hearse','paddlewheeler','unicycle','speedboat',
    'landyacht','rocketbike','iceboat','skyferry',
    'oxcart','trolley','dunecat','gondola',
    'funicular','sanddigger','mopedcar','cropduster',
    'partybus','icethresher','roadroller2','stormjet',
    'swampfan','steamloco','snowgroomer','voltglider',
    'minitank','surfvan','chariot','skyskiff',
    'boxcar','sandsailer','minicopter','logmobile',
    'neonracer','retroclassic','beasthauler','rocketdart','glacierrider','desertfox',
    'platinumlimo','orehauler','peakcrawler','velocitymoto','ironclad','ufodisc'
  ],
  _ALL_MAPS: [
    'countryside','desert','winter','beach','mountains','city',
    'arctic','jungle','mars','cave','highland','swamp',
    'volcano','underwater','moon','neon_city','wasteland','canyon','otoyol',
    'dag','hotwheels','construction','blizzard','candy','toxic','rollercoaster',
    'skyland','lava_river','crystal_cave','cyber_grid','autumn','glacier','savanna','ruins','mushroom','stormpeak','sakura','graveyard','carnival','windmill','bamboo',
    'rainbow_road','sandstorm','crystal_forest','desert_oasis','junkyard','cyberpunk_roofs','cloud_kingdom','meteor_field','firefly_forest','aurora_peak'
  ],
  _ALL_PARTS: ['nitro','wing','spring','landing_boost','start_boost','turbo','coin_magnet','air_master','roll_cage'],

  get defaults() {
    const upgrades = {};
    this._ALL_VEHICLES.forEach(id => { upgrades[id] = { engine:1, suspension:1, tires:1, fuel:1 }; });
    const highScores = {};
    this._ALL_MAPS.forEach(m => { highScores[m] = 0; });
    return {
      gold: 500, diamonds: 10, playerLevel: 1, xp: 0, stars: 0,
      highScores, ownedVehicles: ['jeep'], selectedVehicle: 'jeep',
      upgrades, unlockedMaps: ['countryside','desert','winter','beach','mountains','city','arctic','jungle','mars','cave','highland','swamp','volcano','underwater','moon','neon_city','wasteland','canyon','otoyol'], achievements: {},
      totalCoins: 0, totalDistance: 0, gamesPlayed: 0, scrap: 0,
      nitroReserve: 0,          // kalıcı nitro deposu (%0-100); bedava değil, altınla dolar
      ownedParts: [], equippedParts: [], botBest: {}, rankHistory: [],
      // ── KLAN SİSTEMİ (2 Ağu, KLAN-SOZLESME.md §4) ──
      // `null` BİLİNÇLİ: klan verisi ilk kurulunca `Klan._yaz` tarafından
      // oluşturulur. `defaults` bir GETTER olduğu için her çağrıda TAZE nesne
      // döner → `{...DEFAULTS}` sığ kopya kirlenmesi (21 Tmz bug #15) burada
      // MÜMKÜN DEĞİL; ayrıca `null` paylaşılabilir bir referans da değil.
      // Eski kayıtlara `_deepMerge` bu iki anahtarı ekler (yeni göç GEREKMEZ).
      klan: null,
      klanGunluk: null,
      settings: { sfx: true, music: true, vibration: true },
      // ── Lifetime STATS (additive container; self-inits on old saves via _deepMerge) ──
      stats: {
        totalFlips: 0, totalAirtime: 0, totalJumps: 0, bestCombo: 0,
        noDamageRuns: 0, chestsOpened: 0, missionsCompleted: 0, totalPlayTime: 0,
        perMapBestDistance: {}, perVehicleDistance: {}
      }
    };
  },
  data: null,

  load() {
    try {
      const saved = localStorage.getItem('ahmet_save_v3');
      const def = this.defaults;
      const parsed = this._safeParse(saved);   // null on missing/corrupt JSON → safe defaults
      if (parsed) {
        const migrated = this._migrate(parsed);          // schema versioning + legacy field guards
        this.data = this._deepMerge(def, migrated);       // new default keys never break old saves
        this._ALL_VEHICLES.forEach(id => {
          if (!this.data.upgrades[id]) this.data.upgrades[id] = { engine:1,suspension:1,tires:1,fuel:1 };
        });
        this._ALL_MAPS.forEach(m => { if (this.data.highScores[m] === undefined) this.data.highScores[m] = 0; });
        if (!Array.isArray(this.data.ownedParts))    this.data.ownedParts    = [];
        if (!Array.isArray(this.data.equippedParts)) this.data.equippedParts = [];
        if (this.data.diamonds == null) this.data.diamonds = def.diamonds;
        if (!this.data.botBest)  this.data.botBest  = {};
        if (!this.data.rankHistory) this.data.rankHistory = [];
        // Tüm haritaları her zaman açık tut
        this.data.unlockedMaps = [...this._ALL_MAPS];
        // Değerleri doğrula / sınırla (negatif & sonsuz koruması)
        this.data = this._validate(this.data);
      } else {
        this.data = def;
      }
    } catch(e) { this.data = this.defaults; }
    // BUGFIX(30 Tmz) #19 — "Tüm haritaları açık tut" satırı `if (parsed)` bloğunun
    // İÇİNDEydi; yani yalnız KAYDI OLAN oyuncuya uygulanıyordu. İlk kez oynayan
    // (parsed === null → `this.data = def`) `defaults.unlockedMaps`'teki elle
    // yazılmış 19 haritayı alıyor, kalan 32'si kilitli görünüyordu.
    // ▶ Artık if/else DIŞINDA, catch dalını da kapsıyor → herkeste 51/51.
    if (this.data && Array.isArray(this._ALL_MAPS)) this.data.unlockedMaps = [...this._ALL_MAPS];
    // Admin kullanıcıları için sınırsız kaynak
    const _ADMIN_EMAILS = ['coderhako@gmail.com','61burada@gmail.com'];
    const _adminMode = localStorage.getItem('ahmet_admin_mode');
    if (_adminMode && _ADMIN_EMAILS.includes(_adminMode)) {
      // ── HER ŞEY AÇIK + SINIRSIZ — ama oyuncunun İLERLEMESİNİ EZMEZ ──
      // Kaynakları yalnızca azsa tazele: harcama korunur, ama pratikte tükenmez.
      if ((this.data.gold||0)     < 100000000) this.data.gold     = 999999999;
      if ((this.data.diamonds||0) < 100000000) this.data.diamonds = 999999999;
      if ((this.data.scrap||0)    < 100000000) this.data.scrap    = 999999999;
      this.data.playerLevel = Math.max(this.data.playerLevel||1, 999);
      // Tüm harita/araç/parçaları AÇ (sahiplik ekle) — seviye, seçim ve partLevel KORUNUR
      this.data.unlockedMaps = [...this._ALL_MAPS];
      if (!Array.isArray(this.data.ownedVehicles)) this.data.ownedVehicles = ['jeep'];
      this._ALL_VEHICLES.forEach(id => { if (!this.data.ownedVehicles.includes(id)) this.data.ownedVehicles.push(id); });
      if (!Array.isArray(this.data.ownedParts)) this.data.ownedParts = [];
      this._ALL_PARTS.forEach(p => { if (!this.data.ownedParts.includes(p)) this.data.ownedParts.push(p); });
    }
    // Gecikmeli yazmanın güvenlik kancaları (sekme gizlenince/kapanınca boşalt)
    this._yazmaKancasiKur();
    // Başarım indeksi bu kayda göre kurulmuş olabilir → geçersiz kıl (yeniden kurulur)
    try { if (typeof Achievements !== 'undefined') Achievements._grup = null; } catch (e) {}
    return this.data;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GECİKMELİ YAZMA (29 Tmz) — koşu sırasındaki takılmaları önler
  // ═══════════════════════════════════════════════════════════════════════
  //
  //   🔴 ÖLÇÜLEN SORUN: `save()` her çağrıldığında TÜM kaydı `JSON.stringify`
  //   edip `localStorage`'a yazıyordu. `localStorage` SENKRONDUR — yazarken
  //   ana iş parçacığı durur. Ölçüm: 300 karede 21 yazma (saniyede ~4).
  //   Her sikke toplandığında `addGold → save()` tetikleniyordu.
  //
  //   ▶ Artık `save()` yalnız KİRLİ işaretler; gerçek yazma en fazla saniyede
  //     bir olur. Veri kaybı riski YOK çünkü şu anlarda ANINDA yazılır:
  //       · sekme gizlenince (`visibilitychange`)
  //       · sayfa kapanırken (`pagehide`)
  //       · `saveNow()` doğrudan çağrıldığında (koşu sonu, satın alma…)
  //
  //   ⚠ `saveNow()` KALDIRILMAMALI — kritik anlarda anında yazma tek güvence.
  //   ⚠ Gecikme 1000 ms'i AŞMAMALI; oyuncu uygulamayı öldürürse kayıp o kadar.
  _YAZMA_GECIKME: 1000,
  _kirli: false,
  _yazmaZaman: null,

  saveNow() {
    try {
      if (this.data && this.data._schemaVersion == null) this.data._schemaVersion = this._SCHEMA_VERSION;
      localStorage.setItem('ahmet_save_v3', JSON.stringify(this.data));
      this._kirli = false;
      if (this._yazmaZaman) { clearTimeout(this._yazmaZaman); this._yazmaZaman = null; }
      return true;
    } catch (e) { return false; }
  },

  save() {
    this._kirli = true;
    if (this._yazmaZaman) return;                 // zaten planlı
    const self = this;
    this._yazmaZaman = setTimeout(function () {
      self._yazmaZaman = null;
      if (self._kirli) self.saveNow();
    }, this._YAZMA_GECIKME);
  },

  // Sekme gizlenince / sayfa kapanırken bekleyen yazmayı KAÇIRMA.
  _yazmaKancasiKur() {
    if (this._yazmaKancali || typeof document === 'undefined') return;
    this._yazmaKancali = true;
    const self = this;
    const bosalt = function () { if (self._kirli) self.saveNow(); };
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') bosalt();
    });
    window.addEventListener('pagehide', bosalt);
    window.addEventListener('beforeunload', bosalt);
  },
  get(key)      { return this.data[key]; },
  set(key, val) { this.data[key] = val; this.save(); },
  // BUGFIX(21 Tmz #12): `SaveData.getData` / `setData` HİÇ TANIMLI DEĞİLDİ ama üç modül
  // (SAVE_SLOTS, OFFLINE_PROGRESS, EXPORT_IMPORT) bunları çağırıyordu → kayıt yuvalarına
  // BOŞ veri yazılıyor, garaj seviyesi hep 0 okunuyordu. Eklendi.
  getData()     { return this.data; },
  setData(obj)  {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    this.data = this._validate(this._deepMerge(this.defaults, obj));
    this.save();
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  // ROBUST SAVE/LOAD HARDENING (additive, _-prefixed helpers)
  //   · _safeParse — corrupt-JSON recovery (try/catch → null)
  //   · _migrate   — schema versioning + legacy field guards
  //   · _validate  — value clamping (coins/diamonds/levels non-negative & finite)
  //   · _deepMerge — safe deep-merge of defaults (new keys never break old saves)
  // ═══════════════════════════════════════════════════════════════
  _SCHEMA_VERSION: 3,

  _safeParse(raw) {
    if (typeof raw !== 'string' || raw.length === 0) return null;
    try {
      const v = JSON.parse(raw);
      return (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
    } catch (e) { return null; }
  },

  _clone(v) {
    if (v === null || typeof v !== 'object') return v;
    try { return JSON.parse(JSON.stringify(v)); }
    catch (e) { return Array.isArray(v) ? [] : {}; }
  },

  _deepMerge(defaults, source) {
    // Arrays: prefer a valid saved array, else a copy of the default.
    if (Array.isArray(defaults)) {
      return Array.isArray(source) ? source.slice() : defaults.slice();
    }
    if (defaults && typeof defaults === 'object') {
      const out = {};
      // Preserve any extra keys the save already had (forward-compat).
      if (source && typeof source === 'object' && !Array.isArray(source)) {
        for (const k in source) {
          if (Object.prototype.hasOwnProperty.call(source, k)) out[k] = source[k];
        }
      }
      // Guarantee every default key exists; merge nested plain-objects recursively.
      for (const k in defaults) {
        if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
        const dv = defaults[k];
        const sv = (source && typeof source === 'object') ? source[k] : undefined;
        if (sv === undefined || sv === null) {
          out[k] = this._clone(dv);
        } else if (dv && typeof dv === 'object' && !Array.isArray(dv) &&
                   sv && typeof sv === 'object' && !Array.isArray(sv)) {
          out[k] = this._deepMerge(dv, sv);
        } else {
          out[k] = sv;
        }
      }
      return out;
    }
    return source === undefined ? defaults : source;
  },

  _migrate(data) {
    if (!data || typeof data !== 'object') return data;
    let v = Number(data._schemaVersion);
    if (!isFinite(v) || v < 1) v = 1;
    // Legacy field-name guards — never overwrite an existing value.
    if (data.coins !== undefined && data.gold === undefined)        data.gold = data.coins;
    if (data.level !== undefined && data.playerLevel === undefined) data.playerLevel = data.level;
    if (data.gems  !== undefined && data.diamonds === undefined)    data.diamonds = data.gems;
    // Lifetime STATS container guard — always present so old saves upgrade cleanly.
    if (!data.stats || typeof data.stats !== 'object' || Array.isArray(data.stats)) data.stats = {};
    if (!data.stats.perMapBestDistance || typeof data.stats.perMapBestDistance !== 'object' || Array.isArray(data.stats.perMapBestDistance)) data.stats.perMapBestDistance = {};
    if (!data.stats.perVehicleDistance || typeof data.stats.perVehicleDistance !== 'object' || Array.isArray(data.stats.perVehicleDistance)) data.stats.perVehicleDistance = {};
    // Stamp to the current schema so future loads skip legacy guards.
    data._schemaVersion = this._SCHEMA_VERSION;
    return data;
  },

  _clampNonNeg(v, fallback) {
    const n = Number(v);
    return (isFinite(n) && n >= 0) ? n : (Number(fallback) || 0);
  },

  _validate(data) {
    if (!data || typeof data !== 'object') return this.defaults;
    // Core resources — non-negative & finite.
    data.gold          = this._clampNonNeg(data.gold, 500);
    data.diamonds      = this._clampNonNeg(data.diamonds, 10);
    data.scrap         = this._clampNonNeg(data.scrap, 0);
    data.xp            = this._clampNonNeg(data.xp, 0);
    data.stars         = this._clampNonNeg(data.stars, 0);
    data.seasonXP      = this._clampNonNeg(data.seasonXP, 0);
    data.totalCoins    = this._clampNonNeg(data.totalCoins, 0);
    data.totalDistance = this._clampNonNeg(data.totalDistance, 0);
    data.gamesPlayed   = this._clampNonNeg(data.gamesPlayed, 0);
    data.playerLevel   = Math.max(1, Math.floor(this._clampNonNeg(data.playerLevel, 1)));
    // High scores — each non-negative & finite.
    if (data.highScores && typeof data.highScores === 'object') {
      for (const m in data.highScores) {
        if (Object.prototype.hasOwnProperty.call(data.highScores, m))
          data.highScores[m] = this._clampNonNeg(data.highScores[m], 0);
      }
    }
    // Upgrade levels — at least 1, integral, finite.
    if (data.upgrades && typeof data.upgrades === 'object') {
      for (const vid in data.upgrades) {
        const u = data.upgrades[vid];
        if (u && typeof u === 'object') {
          for (const stat in u) {
            const n = Number(u[stat]);
            u[stat] = (isFinite(n) && n >= 1) ? Math.floor(n) : 1;
          }
        }
      }
    }
    // Part levels — at least 1, integral.
    if (data.partLevels && typeof data.partLevels === 'object') {
      for (const p in data.partLevels) {
        data.partLevels[p] = Math.max(1, Math.floor(this._clampNonNeg(data.partLevels[p], 1)));
      }
    }
    // Array / string sanity — never leave the game without a drivable vehicle.
    if (!Array.isArray(data.ownedVehicles) || data.ownedVehicles.length === 0) data.ownedVehicles = ['jeep'];
    if (!Array.isArray(data.ownedParts))    data.ownedParts    = [];
    if (!Array.isArray(data.equippedParts)) data.equippedParts = [];
    if (typeof data.selectedVehicle !== 'string' || !data.selectedVehicle) data.selectedVehicle = 'jeep';
    // Lifetime STATS — container + numeric totals non-negative & finite; per-map/per-vehicle maps clamped.
    if (!data.stats || typeof data.stats !== 'object' || Array.isArray(data.stats)) data.stats = {};
    const _sk = this._STAT_NUM_KEYS;
    for (let _i = 0; _i < _sk.length; _i++) {
      data.stats[_sk[_i]] = this._clampNonNeg(data.stats[_sk[_i]], 0);
    }
    if (!data.stats.perMapBestDistance || typeof data.stats.perMapBestDistance !== 'object' || Array.isArray(data.stats.perMapBestDistance)) data.stats.perMapBestDistance = {};
    if (!data.stats.perVehicleDistance || typeof data.stats.perVehicleDistance !== 'object' || Array.isArray(data.stats.perVehicleDistance)) data.stats.perVehicleDistance = {};
    for (const _m in data.stats.perMapBestDistance) {
      if (Object.prototype.hasOwnProperty.call(data.stats.perMapBestDistance, _m))
        data.stats.perMapBestDistance[_m] = this._clampNonNeg(data.stats.perMapBestDistance[_m], 0);
    }
    for (const _v in data.stats.perVehicleDistance) {
      if (Object.prototype.hasOwnProperty.call(data.stats.perVehicleDistance, _v))
        data.stats.perVehicleDistance[_v] = this._clampNonNeg(data.stats.perVehicleDistance[_v], 0);
    }
    return data;
  },

  addGold(amount) {
    // 🔴 BUGFIX(28 Tmz): NaN/undefined koruması EKSİKTİ.
    //   Kardeş fonksiyonların hepsinde (spendGold/addDiamonds/spendDiamonds/
    //   addScrap) bu koruma vardı, yalnız burada yoktu. Depoda ~40 addGold
    //   çağrısı var; tek bir tanesi undefined geçirirse `gold: NaN` KALICI
    //   olarak localStorage'a yazılır ve oyuncu bir daha hiçbir şey satın
    //   alamaz (NaN her karşılaştırmada false döner) — kurtarılamaz kayıt.
    amount = Number(amount);
    if (!isFinite(amount)) amount = 0;
    this.data.gold = (this.data.gold||0) + amount;
    this.data.totalCoins = (this.data.totalCoins||0) + amount;
    this.save();
  },
  spendGold(amount) {
    amount = Number(amount); if (!isFinite(amount) || amount < 0) amount = 0;   // NaN/undefined koruması → altın bozulmasını önler
    if ((this.data.gold||0) < amount) return false;
    this.data.gold -= amount; this.save(); return true;
  },
  // ── NİTRO DEPOSU (bedava değil) ── %25'lik bir yük = 10.000 altın; her nitro %25 harcar.
  NITRO_STEP: 25,
  NITRO_COST: 10000,
  getNitroReserve() { const v = Number(this.data.nitroReserve); return isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; },
  buyNitro() {                                   // 10.000 altın → +%25 (100'de sınırlı)
    if (this.getNitroReserve() >= 100) return false;
    if (!this.spendGold(this.NITRO_COST)) return false;
    this.data.nitroReserve = Math.min(100, this.getNitroReserve() + this.NITRO_STEP);
    this.save(); return true;
  },
  useNitroCharge() {                             // bir nitro basışı = %25 tüketir
    if (this.getNitroReserve() < this.NITRO_STEP) return false;
    this.data.nitroReserve = Math.max(0, this.getNitroReserve() - this.NITRO_STEP);
    this.save(); return true;
  },
  addDiamonds(amount) { amount = Number(amount); if (!isFinite(amount)) amount = 0; this.data.diamonds = (this.data.diamonds||0) + amount; this.save(); },
  spendDiamonds(amount) {
    amount = Number(amount); if (!isFinite(amount) || amount < 0) amount = 0;   // NaN/undefined koruması → elmas bozulmasını önler
    if ((this.data.diamonds||0) < amount) return false;
    this.data.diamonds -= amount; this.save(); return true;
  },
  addXP(amount) {
    this.data.xp = (this.data.xp||0) + amount;
    const newLevel = Math.floor(this.data.xp / 1000) + 1;
    if (newLevel > (this.data.playerLevel||1)) { this.data.playerLevel = newLevel; this.addDiamonds(2); }
    this.save();
  },
  getUpgrade(vehicle, stat) { return (this.data.upgrades[vehicle] && this.data.upgrades[vehicle][stat]) || 1; },
  setUpgrade(vehicle, stat, level) {
    if (!this.data.upgrades[vehicle]) this.data.upgrades[vehicle] = {};
    this.data.upgrades[vehicle][stat] = level; this.save();
  },
  updateHighScore(map, distance) {
    if (distance > (this.data.highScores[map] || 0)) {
      this.data.highScores[map] = distance;
      const rank = this.getRank(distance);
      if (!this.data.rankHistory) this.data.rankHistory = [];
      this.data.rankHistory.unshift({ map, dist: distance, rank, date: Date.now() });
      if (this.data.rankHistory.length > 20) this.data.rankHistory.pop();
      this.save(); return true;
    }
    return false;
  },
  // Ünvan eşik eğrisi: ilk ünvan 3km'de, her ünvanda aralık +1km artar (3, 7, 12, 18, 25... km).
  // eşik(i) = ((i+2)(i+3)/2 - 3) km  (i>=1), eşik(0)=0. Girişlerin min/max'ını bir kez yazar.
  _applyRankCurve() {
    if (this._rankCurveApplied) return;
    this._rankCurveApplied = true;
    const t = this._rankThresholds || [];
    const thr = (i) => (i <= 0) ? 0 : Math.round(((i + 2) * (i + 3) / 2 - 3) * 1000);
    for (let i = 0; i < t.length; i++) {
      t[i].min = thr(i);
      t[i].max = (i + 1 < t.length) ? thr(i + 1) : Infinity;
    }
  },
  getRank(distance) {
    this._applyRankCurve();
    const t = this._rankThresholds || [];
    for (let i = t.length - 1; i >= 0; i--) {
      if (distance >= t[i].min) return t[i].name;
    }
    return t.length ? t[0].name : 'YENİ BAŞLAYAN';
  },
  getRankColor(rank) {
    const found = (this._rankThresholds || []).find(r => r.name === rank);
    if (found) return found.color;
    return { 'EFSANE':'#FF00FF','ELMAS':'#00CCFF','ALTIN':'#FFD700',
             'GÜMÜŞ':'#C0C0C0','BRONZ':'#CD7F32','YENİ BAŞLAYAN':'#888899' }[rank] || '#888899';
  },
  unlockMap(mapId) {
    if (!this.data.unlockedMaps.includes(mapId)) { this.data.unlockedMaps.push(mapId); this.save(); }
  },
  unlockVehicle(vehicleId) {
    if (!this.data.ownedVehicles.includes(vehicleId)) { this.data.ownedVehicles.push(vehicleId); this.save(); }
  },
  ownsPart(partId)        { return (this.data.ownedParts||[]).includes(partId); },
  addPart(partId) {
    if (!this.data.ownedParts) this.data.ownedParts = [];
    if (!this.data.ownedParts.includes(partId)) this.data.ownedParts.push(partId);
    if (!this.data.partLevels) this.data.partLevels = {};
    if (!this.data.partLevels[partId]) this.data.partLevels[partId] = 1;  // satın alınca 1. seviye
    this.save();
  },
  // ── Parça seviyeleri (elmasla yükseltme) ──
  getPartLevel(partId) {
    if (!this.ownsPart(partId)) return 0;
    var lv = (this.data.partLevels || {})[partId];
    return lv ? lv : 1;
  },
  setPartLevel(partId, level) {
    if (!this.data.partLevels) this.data.partLevels = {};
    this.data.partLevels[partId] = level;
    this.save();
  },
  // ── Araç Ustalık Seviyesi (Vehicle Mastery) — sürdükçe artar (1→10) ──
  getMasteryXP(vid) { return (this.data.masteryXP || {})[vid] || 0; },
  addMasteryXP(vid, amount) {
    if (!this.data.masteryXP) this.data.masteryXP = {};
    this.data.masteryXP[vid] = (this.data.masteryXP[vid] || 0) + Math.max(0, amount | 0);
    this.save();
  },
  getMasteryLevel(vid) {
    return Math.min(10, 1 + Math.floor(this.getMasteryXP(vid) / 500));   // her 500 XP = +1 seviye
  },
  masteryXPForNext(vid) {
    const lv = this.getMasteryLevel(vid);
    if (lv >= 10) return null;
    return lv * 500 - this.getMasteryXP(vid);
  },
  // ── Hurda (Scrap) para birimi — parça yükseltmede kullanılır ──
  getScrap() { return this.data.scrap || 0; },
  addScrap(n) { this.data.scrap = (this.data.scrap || 0) + Math.max(0, n | 0); this.save(); },
  spendScrap(n) { n = Number(n); if (!isFinite(n) || n < 0) n = 0; if ((this.data.scrap || 0) < n) return false; this.data.scrap -= n; this.save(); return true; },
  // ── Tüketilebilir item envanteri (mağazadan alınır, yarışta kullanılır) ──
  getItem(id) { return (this.data.items || {})[id] || 0; },
  addItem(id, n) { if (!this.data.items) this.data.items = {}; this.data.items[id] = (this.data.items[id] || 0) + Math.max(1, n | 0); this.save(); },
  useItem(id) { const c = (this.data.items || {})[id] || 0; if (c <= 0) return false; this.data.items[id] = c - 1; this.save(); return true; },
  // ── Araç boyama (renk özelleştirme) ──
  getPaint(vid) { return (this.data.paints || {})[vid] || null; },
  setPaint(vid, c1, c2) {
    if (!this.data.paints) this.data.paints = {};
    this.data.paints[vid] = { c1: c1, c2: c2 };
    this.save();
  },
  clearPaint(vid) {
    if (this.data.paints && this.data.paints[vid]) { delete this.data.paints[vid]; this.save(); }
  },
  // ── Lastik tipi (yüzey tutuşunu değiştirir) ──
  getTire(vid) { return (this.data.tires || {})[vid] || 'standard'; },
  setTire(vid, type) {
    if (!this.data.tires) this.data.tires = {};
    this.data.tires[vid] = type;
    this.save();
  },
  // ── Sezon Pası ──
  getSeasonXP() { return this.data.seasonXP || 0; },
  addSeasonXP(n) { this.data.seasonXP = (this.data.seasonXP || 0) + Math.max(0, n | 0); this.save(); },
  isSeasonClaimed(tier, premium) { return !!((this.data.seasonClaimed || {})[(premium ? 'p' : 'f') + tier]); },
  setSeasonClaimed(tier, premium) {
    if (!this.data.seasonClaimed) this.data.seasonClaimed = {};
    this.data.seasonClaimed[(premium ? 'p' : 'f') + tier] = true; this.save();
  },
  isPartEquipped(partId)  { return (this.data.equippedParts||[]).includes(partId); },
  toggleEquipPart(partId) {
    if (!this.data.equippedParts) this.data.equippedParts = [];
    const idx = this.data.equippedParts.indexOf(partId);
    if (idx >= 0) { this.data.equippedParts.splice(idx, 1); }
    else { if (this.data.equippedParts.length >= 2) this.data.equippedParts.shift(); this.data.equippedParts.push(partId); }
    this.save();
  },
  recordBotResult(mapId, won) {
    if (!this.data.botBest) this.data.botBest = {};
    if (!this.data.botBest[mapId]) this.data.botBest[mapId] = { won:0, totalRaces:0 };
    this.data.botBest[mapId].totalRaces++;
    if (won) this.data.botBest[mapId].won++;
    this.save();
  },
  setAchievement(id) {
    if (!this.data.achievements[id]) { this.data.achievements[id] = Date.now(); this.save(); return true; }
    return false;
  },
  hasAchievement(id) { return !!this.data.achievements[id]; }
,
  // ═══════════════════════════════════════════════════════════════
  // EXTENDED SAVE DATA HELPERS
  // ═══════════════════════════════════════════════════════════════

  _rankThresholds: [
    { name: "YENİ BAŞLAYAN", min: 0, max: 100, color: "#78909c", icon: "🌱" },
    { name: "BRONZ", min: 100, max: 210, color: "#CD7F32", icon: "🥉" },
    { name: "GÜMÜŞ", min: 210, max: 330, color: "#C0C0C0", icon: "🥈" },
    { name: "ALTIN", min: 330, max: 470, color: "#FFD700", icon: "🥇" },
    { name: "ELMAS", min: 470, max: 620, color: "#00CCFF", icon: "💎" },
    { name: "EFSANE", min: 620, max: 790, color: "#FF00FF", icon: "👑" },
    { name: "YARI TANRI", min: 790, max: 980, color: "#b239ef", icon: "⚡" },
    { name: "KAHRAMAN", min: 980, max: 1190, color: "#a139ef", icon: "🛡️" },
    { name: "ŞAMPİYON", min: 1190, max: 1420, color: "#9039ef", icon: "🏆" },
    { name: "FATİH", min: 1420, max: 1680, color: "#7e39ef", icon: "⚔️" },
    { name: "TİTAN", min: 1680, max: 1960, color: "#6d39ef", icon: "🗿" },
    { name: "EJDERHA", min: 1960, max: 2280, color: "#5c39ef", icon: "🐉" },
    { name: "ANKA KUŞU", min: 2280, max: 2630, color: "#4a39ef", icon: "🔥" },
    { name: "ZÜMRÜT USTA", min: 2630, max: 3020, color: "#3939ef", icon: "💚" },
    { name: "YAKUT LORD", min: 3020, max: 3450, color: "#394aef", icon: "❤️" },
    { name: "SAFİR HAKAN", min: 3450, max: 3930, color: "#395cef", icon: "💙" },
    { name: "PLATİN EFENDİ", min: 3930, max: 4460, color: "#396def", icon: "⚪" },
    { name: "ALEV LORDU", min: 4460, max: 5050, color: "#397eef", icon: "🔥" },
    { name: "FIRTINA EFENDİSİ", min: 5050, max: 5700, color: "#3990ef", icon: "🌪️" },
    { name: "ŞİMŞEK KRALI", min: 5700, max: 6430, color: "#39a1ef", icon: "⚡" },
    { name: "GÖK GÜRÜLTÜSÜ", min: 6430, max: 7240, color: "#39b2ef", icon: "🌩️" },
    { name: "VOLKAN", min: 7240, max: 8130, color: "#39c4ef", icon: "🌋" },
    { name: "BUZUL HAKANI", min: 8130, max: 9120, color: "#39d5ef", icon: "❄️" },
    { name: "ÇELİK İRADE", min: 9120, max: 10220, color: "#39e6ef", icon: "🔩" },
    { name: "GÖLGE AVCISI", min: 10220, max: 11440, color: "#39efe6", icon: "🌑" },
    { name: "IŞIK ELÇİSİ", min: 11440, max: 12800, color: "#39efd5", icon: "✨" },
    { name: "YILDIZ SÜRÜCÜ", min: 12800, max: 14310, color: "#39efc4", icon: "⭐" },
    { name: "GÖKYÜZÜ HAKİMİ", min: 14310, max: 15980, color: "#39efb2", icon: "🌌" },
    { name: "AY LORDU", min: 15980, max: 17840, color: "#39efa1", icon: "🌙" },
    { name: "GÜNEŞ İMPARATORU", min: 17840, max: 19900, color: "#39ef90", icon: "☀️" },
    { name: "NOVA", min: 19900, max: 22190, color: "#39ef7e", icon: "💫" },
    { name: "SÜPERNOVA", min: 22190, max: 24730, color: "#39ef6d", icon: "💥" },
    { name: "KOZMİK SÜRÜCÜ", min: 24730, max: 27550, color: "#39ef5c", icon: "🚀" },
    { name: "GALAKSİ EFENDİSİ", min: 27550, max: 30680, color: "#39ef4a", icon: "🪐" },
    { name: "NEBULA HAKANI", min: 30680, max: 34160, color: "#39ef39", icon: "☄️" },
    { name: "KARADELİK", min: 34160, max: 38020, color: "#4aef39", icon: "🕳️" },
    { name: "YILDIZ FATİHİ", min: 38020, max: 42300, color: "#5cef39", icon: "🌟" },
    { name: "EVREN GEZGİNİ", min: 42300, max: 47050, color: "#6def39", icon: "🧭" },
    { name: "BOYUT AŞAN", min: 47050, max: 52330, color: "#7eef39", icon: "🌀" },
    { name: "ZAMAN LORDU", min: 52330, max: 58190, color: "#90ef39", icon: "⏳" },
    { name: "KADER USTASI", min: 58190, max: 64690, color: "#a1ef39", icon: "🎴" },
    { name: "SONSUZLUK", min: 64690, max: 71910, color: "#b2ef39", icon: "♾️" },
    { name: "EBEDİ SÜRÜCÜ", min: 71910, max: 79920, color: "#c4ef39", icon: "🔆" },
    { name: "ÖLÜMSÜZ", min: 79920, max: 88810, color: "#d5ef39", icon: "💀" },
    { name: "EFSANEVİ TİTAN", min: 88810, max: 98680, color: "#e6ef39", icon: "🗿" },
    { name: "TANRISAL HAKAN", min: 98680, max: 109630, color: "#efe639", icon: "👼" },
    { name: "YARADAN", min: 109630, max: 121790, color: "#efd539", icon: "🌠" },
    { name: "KOZMOS İMPARATORU", min: 121790, max: 135290, color: "#efc439", icon: "🐲" },
    { name: "GÖKSEL EJDER", min: 135290, max: 150270, color: "#efb239", icon: "🔮" },
    { name: "ASTRAL LORD", min: 150270, max: 166900, color: "#efa139", icon: "👑" },
    { name: "ULU HAKAN", min: 166900, max: 185360, color: "#ef9039", icon: "🕌" },
    { name: "ARŞ-I ÂLA", min: 185360, max: 205850, color: "#ef7e39", icon: "💠" },
    { name: "EVRENİN KALBİ", min: 205850, max: 228590, color: "#ef6d39", icon: "⚜️" },
    { name: "MUTLAK GÜÇ", min: 228590, max: 253830, color: "#ef5c39", icon: "🌞" },
    { name: "KÜRE-İ ARZ EFENDİSİ", min: 253830, max: 281850, color: "#ef4a39", icon: "🌍" },
    { name: "EFSANELER EFSANESİ", min: 281850, max: Infinity, color: "#ef3939", icon: "🔱" },
  ],

  getRankInfo(distance) {
    this._applyRankCurve();
    const rank = this._rankThresholds.find(r => distance >= r.min && distance < r.max)
              || this._rankThresholds[this._rankThresholds.length - 1];
    return rank;
  },

  getRankProgress(distance) {
    const rank = this.getRankInfo(distance);
    if (rank.max === Infinity) return 1;
    return Math.min(1, (distance - rank.min) / (rank.max - rank.min));
  },

  getNextRankThreshold(distance) {
    const rank = this.getRankInfo(distance);
    return rank.max === Infinity ? null : rank.max;
  },

  // Upgrade costs and caps
  _upgradeConfig: {
    engine:    { maxLevel: 10, baseCost: 800,  costMult: 1.6, icon: '🔧', desc: 'Motor Gücü'    },
    fuel:      { maxLevel: 10, baseCost: 600,  costMult: 1.5, icon: '⛽', desc: 'Yakıt Kapasitesi' },
    tires:     { maxLevel: 10, baseCost: 700,  costMult: 1.55,icon: '🔄', desc: 'Lastik Tutuşu'  },
    suspension:{ maxLevel: 10, baseCost: 750,  costMult: 1.58,icon: '🌀', desc: 'Süspansiyon'    },
    weight:    { maxLevel: 10, baseCost: 900,  costMult: 1.65,icon: '⚖️', desc: 'Ağırlık'        },
    armor:     { maxLevel: 10, baseCost: 1000, costMult: 1.7, icon: '🛡️', desc: 'Zırh'           },
    nitro_cap: { maxLevel: 5,  baseCost: 2000, costMult: 2.0, icon: '🔥', desc: 'Nitro Kapasitesi'},
    wing_ctrl: { maxLevel: 5,  baseCost: 1800, costMult: 2.0, icon: '🪂', desc: 'Kanat Kontrolü' },
  },

  // BUGFIX(21 Tmz #10): `getUpgradeLevel` HİÇ TANIMLI DEĞİLDİ — aşağıdaki üç fonksiyon
  // (getUpgradeCost / getUpgradeBonus / getAllUpgradeInfo) onu çağırdığı için çağrılsalar
  // `TypeError: this.getUpgradeLevel is not a function` atarlardı (ölü kod). Eklendi:
  // araç verilmezse seçili araca bakar, kayıtta yoksa 1. seviye (modülün kendi kuralı).
  getUpgradeLevel(upgradeId, vehicleId) {
    return this.getUpgrade(vehicleId || (this.data && this.data.selectedVehicle) || 'jeep', upgradeId);
  },

  getUpgradeCost(upgradeId) {
    const cfg = this._upgradeConfig[upgradeId];
    if (!cfg) return 9999;
    const level = this.getUpgradeLevel(upgradeId);
    return Math.floor(cfg.baseCost * Math.pow(cfg.costMult, level));
  },

  getUpgradeMaxLevel(upgradeId) {
    const cfg = this._upgradeConfig[upgradeId];
    return cfg ? cfg.maxLevel : 10;
  },

  getUpgradeBonus(upgradeId, level) {
    level = level !== undefined ? level : this.getUpgradeLevel(upgradeId);
    const bonuses = {
      engine:    level * 0.12,   // +12% power per level
      fuel:      level * 25,     // +25 fuel units per level
      tires:     level * 0.10,   // +10% grip per level
      suspension:level * 0.08,   // +8% suspension per level
      weight:    level * 0.05,   // -5% weight per level
      armor:     level * 10,     // +10 health per level
      nitro_cap: level * 0.2,    // +20% nitro capacity per level
      wing_ctrl: level * 0.15,   // +15% wing efficiency per level
    };
    return bonuses[upgradeId] || 0;
  },

  getAllUpgradeInfo(vehicleId) {
    vehicleId = vehicleId || this.get('selectedVehicle') || 'jeep';
    return Object.entries(this._upgradeConfig).map(([id, cfg]) => ({
      id,
      ...cfg,
      level: this.getUpgradeLevel(id, vehicleId),
      cost: this.getUpgradeCost(id),
      maxed: this.getUpgradeLevel(id, vehicleId) >= cfg.maxLevel,
      bonus: this.getUpgradeBonus(id)
    }));
  },

  // Session statistics tracking
  recordRun(stats) {
    const runs = this.data.runHistory || [];
    runs.unshift({
      date: Date.now(),
      distance: stats.distance || 0,
      flips: stats.flips || 0,
      vehicleId: stats.vehicleId || 'jeep',
      mapId: stats.mapId || 'countryside',
      duration: stats.duration || 0,
      maxSpeed: stats.maxSpeed || 0,
      gold: stats.gold || 0
    });
    // Keep only last 50 runs
    this.data.runHistory = runs.slice(0, 50);
    // Update run count
    this.data.runCount = (this.data.runCount || 0) + 1;
    // Update best stats
    if ((stats.distance || 0) > (this.data.maxDistance || 0)) {
      this.data.maxDistance = stats.distance;
    }
    if ((stats.maxSpeed || 0) > (this.data.topSpeed || 0)) {
      this.data.topSpeed = stats.maxSpeed;
    }
    this.data.totalFlips = (this.data.totalFlips || 0) + (stats.flips || 0);
    this.data.totalPlayTime = (this.data.totalPlayTime || 0) + (stats.duration || 0);
    this.save();
  },

  getRunHistory() { return this.data.runHistory || []; },

  getBestRunForMap(mapId) {
    const history = this.getRunHistory();
    const mapRuns = history.filter(r => r.mapId === mapId);
    return mapRuns.reduce((best, run) => (!best || run.distance > best.distance) ? run : best, null);
  },

  getOverallStats() {
    return {
      totalRuns: this.data.runCount || 0,
      maxDistance: this.data.maxDistance || 0,
      totalFlips: this.data.totalFlips || 0,
      topSpeed: this.data.topSpeed || 0,
      totalPlayTime: this.data.totalPlayTime || 0,
      totalGoldEarned: this.data.totalCoins || 0,
      vehiclesOwned: (this.data.ownedVehicles || []).length,
      // BUGFIX(21 Tmz #11): `achievements` bir NESNEDİR (dizi değil) → `.length` daima
      // undefined dönüyordu. Object.keys ile gerçek sayı.
      achievementsUnlocked: Object.keys(this.data.achievements || {}).length,
      rank: this.getRank(this.data.maxDistance || 0),
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // LIFETIME STATS HELPERS (additive, self-initializing)
  //   Feed the stats screen + new achievements. Containers auto-init
  //   so pre-existing saves upgrade without touching legacy fields.
  //   · bumpStat(key, n)          — additive counter (default n = 1)
  //   · recordStatMax(key, n)     — keep-the-highest counter (e.g. bestCombo)
  //   · recordMapBest(mapId, d)   — per-map best distance (meters)
  //   · addVehicleDistance(id, d) — per-vehicle cumulative distance
  // ═══════════════════════════════════════════════════════════════
  _STAT_NUM_KEYS: ['totalFlips','totalAirtime','totalJumps','bestCombo',
                   'noDamageRuns','chestsOpened','missionsCompleted','totalPlayTime'],

  _ensureStats() {
    if (!this.data || typeof this.data !== 'object') return {};
    let s = this.data.stats;
    if (!s || typeof s !== 'object' || Array.isArray(s)) { s = {}; this.data.stats = s; }
    for (let i = 0; i < this._STAT_NUM_KEYS.length; i++) {
      const k = this._STAT_NUM_KEYS[i];
      const n = Number(s[k]);
      if (!isFinite(n) || n < 0) s[k] = 0;
    }
    if (!s.perMapBestDistance || typeof s.perMapBestDistance !== 'object' || Array.isArray(s.perMapBestDistance)) s.perMapBestDistance = {};
    if (!s.perVehicleDistance || typeof s.perVehicleDistance !== 'object' || Array.isArray(s.perVehicleDistance)) s.perVehicleDistance = {};
    return s;
  },

  getStats() { return this._ensureStats(); },

  getStat(key) {
    const v = Number(this._ensureStats()[key]);
    return (isFinite(v) && v >= 0) ? v : 0;
  },

  bumpStat(key, n) {
    const s = this._ensureStats();
    let add = Number(n);
    if (!isFinite(add)) add = 1;              // default increment = 1
    let cur = Number(s[key]);
    if (!isFinite(cur) || cur < 0) cur = 0;
    s[key] = Math.max(0, cur + add);
    this.save();
    return s[key];
  },

  recordStatMax(key, n) {
    const s = this._ensureStats();
    let cur = Number(s[key]);
    if (!isFinite(cur) || cur < 0) cur = 0;
    const val = Number(n);
    if (isFinite(val) && val > cur) { s[key] = val; this.save(); }
    return Number(s[key]) || 0;
  },

  recordMapBest(mapId, dist) {
    if (!mapId) return false;
    const s = this._ensureStats();
    let d = Number(dist);
    if (!isFinite(d) || d < 0) d = 0;
    let cur = Number(s.perMapBestDistance[mapId]);
    if (!isFinite(cur) || cur < 0) cur = 0;
    if (d > cur) { s.perMapBestDistance[mapId] = d; this.save(); return true; }
    return false;
  },

  getMapBest(mapId) {
    const v = Number(this._ensureStats().perMapBestDistance[mapId]);
    return (isFinite(v) && v >= 0) ? v : 0;
  },

  addVehicleDistance(id, d) {
    if (!id) return 0;
    const s = this._ensureStats();
    let add = Number(d);
    if (!isFinite(add) || add < 0) add = 0;
    let cur = Number(s.perVehicleDistance[id]);
    if (!isFinite(cur) || cur < 0) cur = 0;
    s.perVehicleDistance[id] = cur + add;
    this.save();
    return s.perVehicleDistance[id];
  },

  getVehicleDistance(id) {
    const v = Number(this._ensureStats().perVehicleDistance[id]);
    return (isFinite(v) && v >= 0) ? v : 0;
  },

  // Daily challenge system
  _dailyChallengeTypes: [
    { type: 'distance',  desc: 'X metre git',           reward: 500,  icon: '🏁' },
    { type: 'flips',     desc: 'X takla at',            reward: 300,  icon: '🌀' },
    { type: 'no_crash',  desc: 'Çarpmadan X metre git', reward: 800,  icon: '⚖️' },
    { type: 'map_dist',  desc: 'X haritasında Y metre', reward: 600,  icon: '🗺️' },
    { type: 'speed',     desc: 'X km/s hıza ulaş',      reward: 400,  icon: '💨' },
    { type: 'airtime',   desc: 'X saniye havada kal',   reward: 450,  icon: '✈️' },
    { type: 'combo',     desc: 'X kombo yap',           reward: 700,  icon: '🎯' },
  ],

  getDailyChallenge() {
    const today = new Date().toDateString();
    if (this.data.dailyChallenge && this.data.dailyChallenge.date === today) {
      return this.data.dailyChallenge;
    }
    // Generate new challenge based on date seed
    const seed = new Date().getDate() + new Date().getMonth() * 31;
    const type = this._dailyChallengeTypes[seed % this._dailyChallengeTypes.length];
    const targets = { distance: 1000, flips: 5, no_crash: 500, speed: 120, airtime: 10, combo: 3 };
    const scale = 1 + (seed % 5) * 0.3;
    const challenge = {
      date: today,
      type: type.type,
      desc: type.desc,
      icon: type.icon,
      target: Math.round((targets[type.type] || 5) * scale),
      reward: type.reward,
      progress: 0,
      completed: false
    };
    this.data.dailyChallenge = challenge;
    this.save();
    return challenge;
  },

  updateDailyProgress(type, value) {
    const ch = this.getDailyChallenge();
    if (ch.completed || ch.type !== type) return false;
    ch.progress = Math.max(ch.progress, value);
    if (ch.progress >= ch.target) {
      ch.completed = true;
      this.data.gold = (this.data.gold || 0) + ch.reward;
      this.data.totalCoins = (this.data.totalCoins || 0) + ch.reward;
      this.save();
      return true; // completed!
    }
    this.save();
    return false;
  },

  // Settings
  _defaultSettings: {
    sfxVolume:    0.8,
    musicVolume:  0.5,
    showTips:     true,
    showMinimap:  false,
    graphics:     'high',   // low, medium, high
    language:     'tr',
    haptics:      true,
    autoRecord:   false,
    showCombo:    true,
    showWindDir:  false,
  },

  getSetting(key) {
    const settings = this.data.settings || {};
    return settings[key] !== undefined ? settings[key] : this._defaultSettings[key];
  },

  setSetting(key, value) {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings[key] = value;
    this.save();
  },

  getAllSettings() {
    return Object.assign({}, this._defaultSettings, (this.data.settings || {}));
  },

  // ─── BULUT SENKRONIZASYON ─────────────────────────────────────────────────

  CLOUD_SYNC: {
    _key: 'ahmet_cloud_sync',
    _lastSyncKey: 'ahmet_last_sync',

    syncToCloud: function(saveData) {
      try {
        var payload = { timestamp: Date.now(), version: 2, data: saveData };
        var serialized = JSON.stringify(payload);
        localStorage.setItem(this._key, serialized);
        localStorage.setItem(this._lastSyncKey, String(Date.now()));
        return { success: true, timestamp: payload.timestamp, size: serialized.length };
      } catch(e) { return { success: false, error: e.message }; }
    },

    loadFromCloud: function() {
      try {
        var raw = localStorage.getItem(this._key);
        if (!raw) return { success: false, error: 'No cloud data found' };
        var payload = JSON.parse(raw);
        if (!payload || !payload.data) return { success: false, error: 'Invalid cloud data' };
        return { success: true, data: payload.data, timestamp: payload.timestamp, version: payload.version };
      } catch(e) { return { success: false, error: e.message }; }
    },

    getLastSyncTime: function() {
      var t = localStorage.getItem(this._lastSyncKey);
      return t ? parseInt(t, 10) : null;
    },

    getLastSyncFormatted: function() {
      var t = this.getLastSyncTime();
      if (!t) return 'Never';
      var d = new Date(t);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    },

    isSyncStale: function(maxAgeMs) {
      maxAgeMs = maxAgeMs || 86400000;
      var t = this.getLastSyncTime();
      return !t || (Date.now() - t) > maxAgeMs;
    }
  },

  // ─── YEDEK SISTEM ─────────────────────────────────────────────────────────

  BACKUP_SYSTEM: {
    _prefix: 'ahmet_backup_',
    _indexKey: 'ahmet_backup_index',
    MAX_BACKUPS: 5,

    _getIndex: function() {
      try { return JSON.parse(localStorage.getItem(this._indexKey) || '[]'); }
      catch(e) { return []; }
    },

    _saveIndex: function(index) {
      localStorage.setItem(this._indexKey, JSON.stringify(index));
    },

    // BUGFIX(21 Tmz #13): 'ahmet_save' okunuyordu ama çekirdek kayıt 'ahmet_save_v3'e
    // yazılıyor → yedek sistemi HİÇBİR ZAMAN veri bulamıyordu ("No save data").
    _SAVE_KEY: 'ahmet_save_v3',

    createBackup: function() {
      try {
        var raw = localStorage.getItem(this._SAVE_KEY);
        if (!raw) return { success: false, error: 'No save data' };
        var timestamp = Date.now();
        var key = this._prefix + timestamp;
        var entry = { key: key, timestamp: timestamp, label: new Date(timestamp).toLocaleString() };
        localStorage.setItem(key, raw);
        var index = this._getIndex();
        index.unshift(entry);
        if (index.length > this.MAX_BACKUPS) {
          var removed = index.splice(this.MAX_BACKUPS);
          for (var i = 0; i < removed.length; i++) localStorage.removeItem(removed[i].key);
        }
        this._saveIndex(index);
        return { success: true, timestamp: timestamp, label: entry.label };
      } catch(e) { return { success: false, error: e.message }; }
    },

    restoreBackup: function(index) {
      try {
        var backups = this._getIndex();
        var entry = backups[index];
        if (!entry) return { success: false, error: 'Backup not found' };
        var data = localStorage.getItem(entry.key);
        if (!data) return { success: false, error: 'Backup data missing' };
        localStorage.setItem(this._SAVE_KEY, data);   // BUGFIX(21 Tmz #13)
        return { success: true, timestamp: entry.timestamp, label: entry.label };
      } catch(e) { return { success: false, error: e.message }; }
    },

    listBackups: function() { return this._getIndex(); },

    deleteBackup: function(index) {
      try {
        var backups = this._getIndex();
        var entry = backups[index];
        if (!entry) return { success: false, error: 'Not found' };
        localStorage.removeItem(entry.key);
        backups.splice(index, 1);
        this._saveIndex(backups);
        return { success: true };
      } catch(e) { return { success: false, error: e.message }; }
    }
  },

  // ─── ISTATISTIK SISTEMI ───────────────────────────────────────────────────

  STATISTICS: {
    _defaults: {
      totalDistance: 0, totalFlips: 0, totalCoinsEarned: 0, totalGoldSpent: 0,
      totalRunTime: 0, totalRuns: 0, totalBotRaces: 0, botRacesWon: 0, botRacesLost: 0,
      longestRun: 0, longestRunTime: 0, bestFlipCount: 0, bestCoinRun: 0,
      maxSpeed: 0, highestAltitude: 0, totalNitroUsed: 0, totalJumps: 0,
      totalLandings: 0, perfectLandings: 0, hardLandings: 0, totalCrashes: 0,
      nearMisses: 0, totalCheckpoints: 0, favoriteVehicle: '', favoriteMap: '',
      vehicleChanges: 0, totalUpgrades: 0, dailyStreakCurrent: 0, dailyStreakBest: 0,
      lastPlayedDate: '', firstPlayedDate: '', totalSessionCount: 0,
      backflips: 0, frontFlips: 0, sideFlips: 0, tripleFlips: 0,
      comboPeakCount: 0, totalComboPoints: 0,
      snowSurfaceTime: 0, sandSurfaceTime: 0, iceSurfaceTime: 0, nightDrivingTime: 0,
      totalWheelies: 0, totalJumpDistance: 0, totalAirTime: 0, longestAirTime: 0,
      totalObstaclesHit: 0, totalPowerupsCollected: 0, totalNitroActivations: 0,
      highestCombo: 0, totalDamageReceived: 0, totalRepairsUsed: 0,
      vehiclesUnlocked: 0, mapsUnlocked: 0, achievementsUnlocked: 0,
      totalPlaySessions: 0, longestSession: 0
    },

    _getAll: function() {
      try {
        var raw = localStorage.getItem('ahmet_stats');
        var saved = raw ? JSON.parse(raw) : {};
        var result = {};
        var defs = this._defaults;
        var keys = Object.keys(defs);
        for (var i = 0; i < keys.length; i++) {
          result[keys[i]] = saved[keys[i]] !== undefined ? saved[keys[i]] : defs[keys[i]];
        }
        return result;
      } catch(e) { return Object.assign({}, this._defaults); }
    },

    _save: function(stats) {
      try { localStorage.setItem('ahmet_stats', JSON.stringify(stats)); }
      catch(e) {}
    },

    getStatistic: function(key) {
      var all = this._getAll();
      return all[key] !== undefined ? all[key] : null;
    },

    updateStatistic: function(key, value, mode) {
      mode = mode || 'add';
      var all = this._getAll();
      var current = all[key] || 0;
      switch (mode) {
        case 'add': all[key] = current + value; break;
        case 'max': all[key] = Math.max(current, value); break;
        case 'min': all[key] = (current === 0 && typeof current === 'number') ? value : Math.min(current, value); break;
        case 'set': all[key] = value; break;
        default:    all[key] = current + value;
      }
      this._save(all);
      return all[key];
    },

    getTopStatistics: function(n) {
      n = n || 5;
      var all = this._getAll();
      var entries = [];
      var keys = Object.keys(all);
      for (var i = 0; i < keys.length; i++) {
        if (typeof all[keys[i]] === 'number' && all[keys[i]] > 0) {
          entries.push({ key: keys[i], value: all[keys[i]] });
        }
      }
      entries.sort(function(a,b){ return b.value - a.value; });
      return entries.slice(0, n);
    },

    getStatisticsReport: function() {
      var all = this._getAll();
      var winRate = all.totalBotRaces > 0 ? Math.round(100 * all.botRacesWon / all.totalBotRaces) : 0;
      var avgDist = all.totalRuns > 0 ? Math.round(all.totalDistance / all.totalRuns) : 0;
      var avgTime = all.totalRuns > 0 ? Math.round(all.totalRunTime / all.totalRuns) : 0;
      return {
        summary: { totalDistance: all.totalDistance, totalRuns: all.totalRuns,
                   totalFlips: all.totalFlips, winRate: winRate,
                   avgDistPerRun: avgDist, avgTimePerRun: avgTime,
                   dailyStreak: all.dailyStreakCurrent, bestStreak: all.dailyStreakBest },
        records: { longestRun: all.longestRun, bestFlipRun: all.bestFlipCount,
                   bestCoinRun: all.bestCoinRun, maxSpeed: all.maxSpeed,
                   highestAltitude: all.highestAltitude, longestAirTime: all.longestAirTime },
        skills:  { backflips: all.backflips, frontFlips: all.frontFlips,
                   tripleFlips: all.tripleFlips, perfectLandings: all.perfectLandings,
                   nearMisses: all.nearMisses, comboPeak: all.comboPeakCount,
                   highestCombo: all.highestCombo, totalAirTime: all.totalAirTime }
      };
    }
  },

  // ─── KILIT AÇMA SISTEMI ───────────────────────────────────────────────────

  UNLOCK_SYSTEM: {
    UNLOCKABLES: [
      { id:'map_desert',     name:'Desert Haritasi',   category:'map',       condition:{type:'distance',value:5000},   icon:'🏜', locked:true },
      { id:'map_arctic',     name:'Arctic Harita',     category:'map',       condition:{type:'distance',value:15000},  icon:'🧧', locked:true },
      { id:'map_volcano',    name:'Volcano Haritasi',  category:'map',       condition:{type:'distance',value:30000},  icon:'🌋', locked:true },
      { id:'map_space',      name:'Uzay Haritasi',     category:'map',       condition:{type:'distance',value:75000},  icon:'🚀', locked:true },
      { id:'map_forest',     name:'Orman Haritasi',    category:'map',       condition:{type:'runs',    value:20},     icon:'🌲', locked:true },
      { id:'map_city',       name:'Sehir Haritasi',    category:'map',       condition:{type:'runs',    value:50},     icon:'🌆', locked:true },
      { id:'veh_monster',    name:'Monster Truck',     category:'vehicle',   condition:{type:'wins',    value:5},      icon:'🚛', locked:true },
      { id:'veh_tank',       name:'Tank',              category:'vehicle',   condition:{type:'flips',   value:50},     icon:'🛡', locked:true },
      { id:'veh_rocket',     name:'Roket Arabasi',     category:'vehicle',   condition:{type:'distance',value:50000}, icon:'🚀', locked:true },
      { id:'veh_submarine',  name:'Denizalti',         category:'vehicle',   condition:{type:'wins',    value:25},     icon:'🤿', locked:true },
      { id:'veh_hovercraft', name:'Hoverkraft',        category:'vehicle',   condition:{type:'coins',   value:5000},   icon:'💨', locked:true },
      { id:'feat_nightmode', name:'Gece Modu',         category:'feature',   condition:{type:'distance',value:10000}, icon:'🌙', locked:true },
      { id:'feat_replay',    name:'Tekrar Oynatma',    category:'feature',   condition:{type:'runs',    value:10},     icon:'▶',       locked:true },
      { id:'feat_photo',     name:'Fotograf Modu',     category:'feature',   condition:{type:'distance',value:20000}, icon:'📷', locked:true },
      { id:'feat_custom',    name:'Ozellestirme',      category:'feature',   condition:{type:'coins',   value:1000},   icon:'🎨', locked:true },
      { id:'acc_antenna',    name:'Anten',             category:'accessory', condition:{type:'runs',    value:5},      icon:'📡', locked:true },
      { id:'acc_flag',       name:'Bayrak',            category:'accessory', condition:{type:'wins',    value:1},      icon:'🚩', locked:true },
      { id:'acc_lights',     name:'Neon Isiklar',      category:'accessory', condition:{type:'distance',value:5000},  icon:'💡', locked:true },
      { id:'acc_spoiler',    name:'Spoiler',           category:'accessory', condition:{type:'coins',   value:500},    icon:'🏎', locked:true },
      { id:'map_moon',       name:'Ay Haritasi',       category:'map',       condition:{type:'distance',value:100000},icon:'🌕', locked:true }
    ],

    _getUnlocked: function() {
      try { return JSON.parse(localStorage.getItem('ahmet_unlocked') || '[]'); }
      catch(e) { return []; }
    },

    _saveUnlocked: function(arr) {
      localStorage.setItem('ahmet_unlocked', JSON.stringify(arr));
    },

    unlock: function(itemId) {
      var arr = this._getUnlocked();
      if (arr.indexOf(itemId) === -1) { arr.push(itemId); this._saveUnlocked(arr); return true; }
      return false;
    },

    isUnlocked: function(itemId) {
      return this._getUnlocked().indexOf(itemId) !== -1;
    },

    getUnlockCondition: function(itemId) {
      for (var i = 0; i < this.UNLOCKABLES.length; i++) {
        if (this.UNLOCKABLES[i].id === itemId) return this.UNLOCKABLES[i].condition;
      }
      return null;
    },

    checkUnlockConditions: function(gameState) {
      if (!gameState) return [];
      var self = this;
      var newlyUnlocked = [];
      for (var i = 0; i < this.UNLOCKABLES.length; i++) {
        var item = this.UNLOCKABLES[i];
        if (self.isUnlocked(item.id)) continue;
        var cond = item.condition;
        var met = false;
        switch(cond.type) {
          case 'distance': met = (gameState.maxDistance||0) >= cond.value; break;
          case 'runs':     met = (gameState.runCount||0)    >= cond.value; break;
          case 'wins':     met = (gameState.botWins||0)     >= cond.value; break;
          case 'flips':    met = (gameState.totalFlips||0)  >= cond.value; break;
          case 'coins':    met = (gameState.totalCoins||0)  >= cond.value; break;
        }
        if (met) { self.unlock(item.id); newlyUnlocked.push(item); }
      }
      return newlyUnlocked;
    },

    getUnlockedItems: function(category) {
      var arr = this._getUnlocked();
      return this.UNLOCKABLES.filter(function(u) {
        return arr.indexOf(u.id) !== -1 && (!category || u.category === category);
      });
    },

    getLockedItems: function(category) {
      var arr = this._getUnlocked();
      return this.UNLOCKABLES.filter(function(u) {
        return arr.indexOf(u.id) === -1 && (!category || u.category === category);
      });
    }
  },

  // ─── GOERSEL OZELLESTIRME ─────────────────────────────────────────────────

  CUSTOMIZATION: {
    PAINT_JOBS: [
      {id:'default',      name:'Varsayilan',       primary:'#CC3300', secondary:'#222222'},
      {id:'midnight',     name:'Gece Yarisi',      primary:'#111133', secondary:'#3344AA'},
      {id:'fire',         name:'Alev',             primary:'#FF4400', secondary:'#FFAA00'},
      {id:'ice',          name:'Buz',              primary:'#88CCFF', secondary:'#EEEEFF'},
      {id:'forest',       name:'Orman',            primary:'#224422', secondary:'#448844'},
      {id:'desert',       name:'Col',              primary:'#AA8833', secondary:'#CCAA55'},
      {id:'chrome',       name:'Krom',             primary:'#CCCCCC', secondary:'#FFFFFF'},
      {id:'gold',         name:'Altin',            primary:'#AA8800', secondary:'#FFD700'},
      {id:'purple',       name:'Mor',              primary:'#661188', secondary:'#AA44CC'},
      {id:'toxic',        name:'Toksik',           primary:'#44BB00', secondary:'#AAFF22'},
      {id:'pink',         name:'Pembe',            primary:'#CC2288', secondary:'#FF88CC'},
      {id:'camo_green',   name:'Kamuflaj Yesil',   primary:'#334422', secondary:'#556633'},
      {id:'camo_desert',  name:'Kamuflaj Col',     primary:'#AA8844', secondary:'#CCAA66'},
      {id:'racing_red',   name:'Yaris Kirmizisi',  primary:'#DD0000', secondary:'#FFFFFF'},
      {id:'racing_blue',  name:'Yaris Mavisi',     primary:'#0022CC', secondary:'#FFFFFF'},
      {id:'racing_green', name:'Yaris Yeşili',     primary:'#006600', secondary:'#FFFFFF'},
      {id:'stealth',      name:'Gizem',            primary:'#111111', secondary:'#333333'},
      {id:'neon_pink',    name:'Neon Pembe',       primary:'#FF00AA', secondary:'#220011'},
      {id:'neon_cyan',    name:'Neon Camgobeği',   primary:'#00FFFF', secondary:'#001122'},
      {id:'neon_green',   name:'Neon Yesil',       primary:'#00FF44', secondary:'#001100'},
      {id:'sunset',       name:'Gun Batimi',       primary:'#FF6600', secondary:'#FF2244'},
      {id:'ocean',        name:'Okyanus',          primary:'#0044AA', secondary:'#00AAFF'},
      {id:'cherry',       name:'Kiraz',            primary:'#CC0044', secondary:'#880022'},
      {id:'lavender',     name:'Lavanta',          primary:'#9966CC', secondary:'#DDAAFF'},
      {id:'copper',       name:'Bakir',            primary:'#AA6633', secondary:'#CC8844'},
      {id:'silver',       name:'Gumus',            primary:'#AAAAAA', secondary:'#DDDDDD'},
      {id:'obsidian',     name:'Obsidyen',         primary:'#222244', secondary:'#444466'},
      {id:'rainbow',      name:'Gokkusagi',        primary:'#FF0000', secondary:'#0000FF', special:'rainbow'},
      {id:'galaxy',       name:'Galaksi',          primary:'#111133', secondary:'#8844FF', special:'galaxy'},
      {id:'holographic',  name:'Holografik',       primary:'#88FFFF', secondary:'#FF88FF', special:'holo'}
    ],

    DECALS: [
      {id:'none',       name:'Yok',           icon:'○'},
      {id:'star',       name:'Yildiz',        icon:'⭐'},
      {id:'flame',      name:'Alev',          icon:'🔥'},
      {id:'skull',      name:'Kafatasi',      icon:'💀'},
      {id:'lightning',  name:'Simsek',        icon:'⚡'},
      {id:'dragon',     name:'Ejderha',       icon:'🐉'},
      {id:'eagle',      name:'Kartal',        icon:'🦅'},
      {id:'crown',      name:'Tac',           icon:'👑'},
      {id:'checkered',  name:'Damali',        icon:'🏁'},
      {id:'arrows',     name:'Oklar',         icon:'➡'},
      {id:'waves',      name:'Dalgalar',      icon:'〰'},
      {id:'tribal',     name:'Kabile',        icon:'⚔'},
      {id:'racing_num', name:'Yaris Numarasi',icon:'#'}
    ],

    ACCESSORIES: [
      {id:'none',         name:'Yok',          slot:'top',   icon:'○'},
      {id:'antenna',      name:'Anten',        slot:'top',   icon:'📡'},
      {id:'flag_tr',      name:'TR Bayragi',   slot:'top',   icon:'🇹🇷'},
      {id:'flag_en',      name:'EN Bayragi',   slot:'top',   icon:'🇬🇧'},
      {id:'roof_rack',    name:'Cati Rafi',    slot:'top',   icon:'▦'},
      {id:'spoiler_sm',   name:'Küçük Spoiler',slot:'rear',  icon:'🏎'},
      {id:'spoiler_lg',   name:'Büyük Spoiler',slot:'rear',  icon:'🏎'},
      {id:'exhaust_dual', name:'Cift Egzoz',   slot:'rear',  icon:'💨'},
      {id:'neon_under',   name:'Alt Neon',     slot:'under', icon:'💡'},
      {id:'mudguard',     name:'Camurluk',     slot:'wheel', icon:'🔵'},
      {id:'rim_sport',    name:'Spor Jant',    slot:'wheel', icon:'⚙'},
      {id:'rim_chrome',   name:'Krom Jant',    slot:'wheel', icon:'⭕'},
      {id:'front_bumper', name:'On Tampon',    slot:'front', icon:'🛡'}
    ],

    _getVC: function(vehicleId) {
      try { return JSON.parse(localStorage.getItem('ahmet_custom_' + vehicleId) || '{}'); }
      catch(e) { return {}; }
    },

    _saveVC: function(vehicleId, data) {
      localStorage.setItem('ahmet_custom_' + vehicleId, JSON.stringify(data));
    },

    setPaintJob: function(vehicleId, paintId) {
      var d = this._getVC(vehicleId); d.paintJob = paintId; this._saveVC(vehicleId, d);
    },

    getPaintJob: function(vehicleId) {
      return this._getVC(vehicleId).paintJob || 'default';
    },

    setDecal: function(vehicleId, decalId) {
      var d = this._getVC(vehicleId); d.decal = decalId; this._saveVC(vehicleId, d);
    },

    getDecal: function(vehicleId) {
      return this._getVC(vehicleId).decal || 'none';
    },

    setAccessory: function(vehicleId, slot, accId) {
      var d = this._getVC(vehicleId);
      if (!d.accessories) d.accessories = {};
      d.accessories[slot] = accId;
      this._saveVC(vehicleId, d);
    },

    getAccessory: function(vehicleId, slot) {
      return (this._getVC(vehicleId).accessories || {})[slot] || 'none';
    },

    getVehicleConfig: function(vehicleId) {
      var data = this._getVC(vehicleId);
      var paint = null;
      for (var i = 0; i < this.PAINT_JOBS.length; i++) {
        if (this.PAINT_JOBS[i].id === (data.paintJob || 'default')) { paint = this.PAINT_JOBS[i]; break; }
      }
      paint = paint || this.PAINT_JOBS[0];
      var decal = null;
      for (var j = 0; j < this.DECALS.length; j++) {
        if (this.DECALS[j].id === (data.decal || 'none')) { decal = this.DECALS[j]; break; }
      }
      decal = decal || this.DECALS[0];
      return { vehicleId: vehicleId, paint: paint, decal: decal, accessories: data.accessories || {} };
    }
  },

  // ─── SKOR TABLOSU SISTEMI ─────────────────────────────────────────────────

  LEADERBOARD_SYSTEM: {
    _prefix: 'ahmet_lb_',

    _getKey: function(mapId, vehicleId) {
      return this._prefix + (mapId||'global') + '_' + (vehicleId||'all');
    },

    submitScore: function(mapId, vehicleId, distance, time, flips) {
      var score = {
        distance: distance||0, time: time||0, flips: flips||0,
        score: Math.round((distance||0) + (flips||0) * 50),
        date: Date.now(), vehicleId: vehicleId||'unknown'
      };
      var saveEntry = function(key, entry) {
        try {
          var existing = JSON.parse(localStorage.getItem(key) || '[]');
          existing.push(entry);
          existing.sort(function(a,b){return b.score - a.score;});
          var trimmed = existing.slice(0, 100);
          localStorage.setItem(key, JSON.stringify(trimmed));
          return trimmed;
        } catch(e) { return []; }
      };
      var key = this._getKey(mapId, vehicleId);
      var globalKey = this._getKey(null, null);
      saveEntry(key, score);
      saveEntry(globalKey, score);
      return score;
    },

    getLeaderboard: function(mapId, vehicleId, n) {
      n = n || 10;
      try {
        var arr = JSON.parse(localStorage.getItem(this._getKey(mapId, vehicleId)) || '[]');
        return arr.slice(0, n);
      } catch(e) { return []; }
    },

    getPlayerRank: function(mapId, vehicleId, playerScore) {
      try {
        var arr = JSON.parse(localStorage.getItem(this._getKey(mapId, vehicleId)) || '[]');
        var rank = 1;
        for (var i = 0; i < arr.length; i++) {
          if (arr[i].score > playerScore) rank++;
          else break;
        }
        return rank;
      } catch(e) { return -1; }
    },

    getPersonalBest: function(mapId, vehicleId) {
      var board = this.getLeaderboard(mapId, vehicleId, 1);
      return board.length > 0 ? board[0] : null;
    },

    clearLeaderboard: function(mapId, vehicleId) {
      localStorage.removeItem(this._getKey(mapId, vehicleId));
    }
  },

  // ─── GELISMIS AYARLAR ─────────────────────────────────────────────────────

  SETTINGS_ADVANCED: {
    _key: 'ahmet_adv_settings',

    GRAPHICS_PRESETS: {
      low:    {shadows:false, particles:false, reflections:false, aa:false, fov:70, drawDistance:300},
      medium: {shadows:true,  particles:true,  reflections:false, aa:false, fov:75, drawDistance:600},
      high:   {shadows:true,  particles:true,  reflections:true,  aa:true,  fov:80, drawDistance:900},
      ultra:  {shadows:true,  particles:true,  reflections:true,  aa:true,  fov:85, drawDistance:1500}
    },

    LANGUAGES: {
      tr:{name:'Turkce',   flag:'🇹🇷'},
      en:{name:'English',  flag:'🇬🇧'},
      de:{name:'Deutsch',  flag:'🇩🇪'},
      fr:{name:'Francais', flag:'🇫🇷'},
      es:{name:'Espanol',  flag:'🇪🇸'},
      ru:{name:'Russkij',  flag:'🇷🇺'},
      jp:{name:'Nihongo',  flag:'🇯🇵'},
      kr:{name:'Hangul',   flag:'🇰🇷'},
      cn:{name:'Zhongwen', flag:'🇨🇳'}
    },

    _defaults: {
      graphics:'high', targetFps:60, showFps:false,
      particles:true, shadows:true, reflections:true, antiAlias:true,
      motionBlur:false, screenShake:true, colorBlind:false, uiScale:1.0,
      controlLeft:'ArrowLeft', controlRight:'ArrowRight',
      controlJump:'Space', controlNitro:'ShiftLeft', controlCamera:'KeyC',
      touchSensitivity:0.8, vibration:true,
      pushNotifications:true, achievementAlerts:true, dailyChallengeAlert:true,
      soundEffects:true, backgroundMusic:true, announcer:true,
      language:'tr', measurementUnit:'metric', dateFormat:'DMY',
      showTutorial:true, autoSave:true, autoSaveInterval:30
    },

    getAll: function() {
      try {
        var saved = JSON.parse(localStorage.getItem(this._key) || '{}');
        return Object.assign({}, this._defaults, saved);
      } catch(e) { return Object.assign({}, this._defaults); }
    },

    get: function(key) {
      return this.getAll()[key] !== undefined ? this.getAll()[key] : null;
    },

    set: function(key, value) {
      try {
        var saved = JSON.parse(localStorage.getItem(this._key) || '{}');
        saved[key] = value;
        if (key === 'graphics' && this.GRAPHICS_PRESETS[value]) {
          var preset = this.GRAPHICS_PRESETS[value];
          Object.assign(saved, preset);
        }
        localStorage.setItem(this._key, JSON.stringify(saved));
        return true;
      } catch(e) { return false; }
    },

    setMany: function(updates) {
      var saved = this.getAll();
      Object.assign(saved, updates);
      try { localStorage.setItem(this._key, JSON.stringify(saved)); return true; }
      catch(e) { return false; }
    },

    reset: function() { localStorage.removeItem(this._key); },

    getControlsMap: function() {
      var all = this.getAll();
      return { left:all.controlLeft, right:all.controlRight,
               jump:all.controlJump, nitro:all.controlNitro, camera:all.controlCamera };
    },

    getGraphicsConfig: function() {
      var all = this.getAll();
      var preset = this.GRAPHICS_PRESETS[all.graphics] || this.GRAPHICS_PRESETS.high;
      return Object.assign({}, preset, { targetFps:all.targetFps, motionBlur:all.motionBlur, screenShake:all.screenShake });
    }
  },

  // ─── TUTORIAL DURUMU ──────────────────────────────────────────────────────

  TUTORIAL_STATE: {
    _key: 'ahmet_tutorial',

    STEPS: [
      {id:'intro',        name:'Hos Geldiniz',         desc:'Oyun hakkinda kisa giris.'},
      {id:'controls',     name:'Kontroller',           desc:'Nasil kontrol edileceginizi ogrenin.'},
      {id:'first_run',    name:'Ilk Kosu',             desc:'Ilk kosunuzu tamamlayin.'},
      {id:'flips',        name:'Takla Atmak',          desc:'Havada takla atmayi ogrenin.'},
      {id:'coins',        name:'Altin Toplama',        desc:'Yolda altin toplayin.'},
      {id:'shop',         name:'Magaza',               desc:'Araç ve yükseltme satın alın.'},
      {id:'upgrades',     name:'Yükseltmeler',         desc:'Aracınizi guclendirin.'},
      {id:'nitro',        name:'Nitro Kullanimi',      desc:'Nitroyu nasil kullanacaginizi ogrenin.'},
      {id:'races',        name:'Bot Yarislari',        desc:'Botlarla yarisi ogrenin.'},
      {id:'achievements', name:'Basarimlar',           desc:'Basarim sistemini kesfedin.'},
      {id:'complete',     name:'Tutorial Tamamlandi!', desc:'Artik her seyi biliyorsunuz.'}
    ],

    _getData: function() {
      try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
      catch(e) { return {}; }
    },

    _saveData: function(data) { localStorage.setItem(this._key, JSON.stringify(data)); },

    isCompleted: function(stepId) {
      return !!((this._getData().completed || {})[stepId]);
    },

    completeStep: function(stepId) {
      var data = this._getData();
      if (!data.completed) data.completed = {};
      data.completed[stepId] = Date.now();
      if (!data.firstCompletion) data.firstCompletion = Date.now();
      data.lastStep = stepId;
      this._saveData(data);
      return this.getProgress();
    },

    getProgress: function() {
      var data = this._getData();
      var completed = data.completed || {};
      var completedCount = Object.keys(completed).length;
      var total = this.STEPS.length;
      return {
        completedSteps: completedCount, total: total,
        pct: Math.round(100 * completedCount / total),
        isFullyDone: completedCount >= total,
        lastStep: data.lastStep || null
      };
    },

    getNextStep: function() {
      var data = this._getData();
      var completed = data.completed || {};
      for (var i = 0; i < this.STEPS.length; i++) {
        if (!completed[this.STEPS[i].id]) return this.STEPS[i];
      }
      return null;
    },

    reset: function() { localStorage.removeItem(this._key); },

    skipAll: function() {
      var data = this._getData();
      data.completed = {};
      var ts = Date.now();
      for (var i = 0; i < this.STEPS.length; i++) { data.completed[this.STEPS[i].id] = ts; }
      data.skipped = true;
      this._saveData(data);
    }
  }

};


// =============================================================================
// CLOUD_SYNC_STUB — Simulates cloud backup and restore operations
// =============================================================================

var CLOUD_SYNC_STUB = (function () {
    'use strict';

    var SYNC_STATUS = {
        IDLE: 'idle',
        SYNCING: 'syncing',
        SUCCESS: 'success',
        ERROR: 'error'
    };

    var currentStatus = SYNC_STATUS.IDLE;
    var lastSyncTimestamp = null;

    // Internal simulated cloud storage (in-memory for stub purposes)
    var _cloudStore = null;
    var _syncLog = [];

    function _log(msg) {
        var entry = { time: Date.now(), msg: msg };
        _syncLog.push(entry);
        if (_syncLog.length > 100) _syncLog.shift();
        if (typeof console !== 'undefined') console.log('[CLOUD_SYNC] ' + msg);
    }

    function _simulateNetworkDelay(min, max) {
        // Returns a promise that resolves after a simulated delay
        var delay = min + Math.floor(Math.random() * (max - min));
        return new Promise(function (resolve) {
            setTimeout(resolve, delay);
        });
    }

    function _serializeData(data) {
        try {
            return JSON.stringify({
                payload: data,
                checksum: _simpleChecksum(JSON.stringify(data)),
                version: '1.0',
                timestamp: Date.now()
            });
        } catch (e) {
            _log('Serialization error: ' + e.message);
            return null;
        }
    }

    function _simpleChecksum(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    function syncToCloud(data) {
        if (currentStatus === SYNC_STATUS.SYNCING) {
            _log('Sync already in progress, skipping.');
            return Promise.reject(new Error('Sync already in progress'));
        }

        currentStatus = SYNC_STATUS.SYNCING;
        _log('Starting cloud sync upload...');

        return _simulateNetworkDelay(300, 900).then(function () {
            // Simulate occasional random failures (10% chance)
            if (Math.random() < 0.10) {
                currentStatus = SYNC_STATUS.ERROR;
                _log('Cloud sync FAILED — simulated network error');
                throw new Error('Simulated network error during upload');
            }

            var serialized = _serializeData(data);
            if (!serialized) {
                currentStatus = SYNC_STATUS.ERROR;
                throw new Error('Failed to serialize save data');
            }

            _cloudStore = serialized;
            lastSyncTimestamp = Date.now();
            currentStatus = SYNC_STATUS.SUCCESS;
            _log('Cloud sync SUCCESS — ' + serialized.length + ' bytes uploaded at ' + new Date(lastSyncTimestamp).toISOString());

            return {
                success: true,
                bytesUploaded: serialized.length,
                timestamp: lastSyncTimestamp
            };
        });
    }

    function syncFromCloud() {
        if (currentStatus === SYNC_STATUS.SYNCING) {
            _log('Sync already in progress, cannot download.');
            return Promise.reject(new Error('Sync in progress'));
        }

        currentStatus = SYNC_STATUS.SYNCING;
        _log('Starting cloud sync download...');

        return _simulateNetworkDelay(200, 700).then(function () {
            if (!_cloudStore) {
                currentStatus = SYNC_STATUS.ERROR;
                _log('No cloud data found.');
                throw new Error('No cloud save data available');
            }

            // Simulate occasional random failures (5% chance)
            if (Math.random() < 0.05) {
                currentStatus = SYNC_STATUS.ERROR;
                throw new Error('Simulated download error');
            }

            var parsed;
            try {
                parsed = JSON.parse(_cloudStore);
            } catch (e) {
                currentStatus = SYNC_STATUS.ERROR;
                throw new Error('Corrupt cloud data: ' + e.message);
            }

            // Verify checksum
            var expectedChecksum = _simpleChecksum(JSON.stringify(parsed.payload));
            if (expectedChecksum !== parsed.checksum) {
                currentStatus = SYNC_STATUS.ERROR;
                _log('Checksum mismatch — data may be corrupt');
                throw new Error('Cloud data checksum mismatch');
            }

            currentStatus = SYNC_STATUS.SUCCESS;
            lastSyncTimestamp = Date.now();
            _log('Cloud sync download SUCCESS — data restored from ' + new Date(parsed.timestamp).toISOString());

            return {
                success: true,
                data: parsed.payload,
                cloudTimestamp: parsed.timestamp,
                retrievedAt: lastSyncTimestamp
            };
        });
    }

    function getLastSyncTime() {
        if (!lastSyncTimestamp) return null;
        return {
            timestamp: lastSyncTimestamp,
            formatted: new Date(lastSyncTimestamp).toLocaleString(),
            relative: _relativeTime(lastSyncTimestamp)
        };
    }

    function _relativeTime(ts) {
        var diff = Date.now() - ts;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' minutes ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
        return Math.floor(diff / 86400000) + ' days ago';
    }

    function getSyncLog() {
        return _syncLog.slice();
    }

    function resetStatus() {
        currentStatus = SYNC_STATUS.IDLE;
    }

    return {
        SYNC_STATUS: SYNC_STATUS,
        get currentStatus() { return currentStatus; },
        get lastSyncTimestamp() { return lastSyncTimestamp; },
        syncToCloud: syncToCloud,
        syncFromCloud: syncFromCloud,
        getLastSyncTime: getLastSyncTime,
        getSyncLog: getSyncLog,
        resetStatus: resetStatus
    };
}());

// =============================================================================
// DATA_MIGRATION — Handles version-to-version save data migrations
// =============================================================================

var DATA_MIGRATION = (function () {
    'use strict';

    var MIGRATION_VERSIONS = {
        v1_0: '1.0',
        v1_1: '1.1',
        v1_2: '1.2',
        v2_0: '2.0'
    };

    var CURRENT_VERSION = MIGRATION_VERSIONS.v2_0;

    var MIGRATION_STEPS = {

        '1.0->1.1': function (data) {
            // v1.1 introduced the achievements array and XP system
            var migrated = JSON.parse(JSON.stringify(data));
            if (!migrated.achievements) {
                migrated.achievements = [];
            }
            if (migrated.xp === undefined) {
                migrated.xp = 0;
            }
            if (migrated.level === undefined) {
                migrated.level = 1;
            }
            // Rename old 'coins' field to 'gold' if present
            if (migrated.coins !== undefined && migrated.gold === undefined) {
                migrated.gold = migrated.coins;
                delete migrated.coins;
            }
            migrated._version = '1.1';
            return migrated;
        },

        '1.1->1.2': function (data) {
            // v1.2 added per-car upgrade arrays and garage capacity
            var migrated = JSON.parse(JSON.stringify(data));
            if (!migrated.cars) {
                migrated.cars = {};
            }
            // Migrate flat upgrade fields into per-car structure
            if (migrated.engineLevel !== undefined) {
                if (!migrated.cars['car_001']) migrated.cars['car_001'] = {};
                migrated.cars['car_001'].engineLevel = migrated.engineLevel;
                delete migrated.engineLevel;
            }
            if (migrated.suspensionLevel !== undefined) {
                if (!migrated.cars['car_001']) migrated.cars['car_001'] = {};
                migrated.cars['car_001'].suspensionLevel = migrated.suspensionLevel;
                delete migrated.suspensionLevel;
            }
            if (migrated.tireLevel !== undefined) {
                if (!migrated.cars['car_001']) migrated.cars['car_001'] = {};
                migrated.cars['car_001'].tireLevel = migrated.tireLevel;
                delete migrated.tireLevel;
            }
            if (!migrated.garageCapacity) {
                migrated.garageCapacity = 3;
            }
            if (!migrated.settings) {
                migrated.settings = {};
            }
            migrated._version = '1.2';
            return migrated;
        },

        '1.2->2.0': function (data) {
            // v2.0 major restructure: nested profile, stats object, daily reward tracking
            var migrated = JSON.parse(JSON.stringify(data));

            // Wrap top-level player fields into a profile object
            migrated.profile = migrated.profile || {};
            migrated.profile.name = migrated.playerName || migrated.profile.name || 'Player';
            migrated.profile.level = migrated.level || 1;
            migrated.profile.xp = migrated.xp || 0;
            migrated.profile.totalGoldEarned = migrated.totalGoldEarned || migrated.gold || 0;

            delete migrated.playerName;
            delete migrated.level;
            delete migrated.xp;
            delete migrated.totalGoldEarned;

            // Introduce the stats sub-object
            migrated.stats = migrated.stats || {};
            migrated.stats.racesPlayed = migrated.racesPlayed || 0;
            migrated.stats.racesWon = migrated.racesWon || 0;
            migrated.stats.totalDistance = migrated.totalDistance || 0;
            migrated.stats.bestLapTime = migrated.bestLapTime || null;
            migrated.stats.totalGoldSpent = migrated.totalGoldSpent || 0;

            delete migrated.racesPlayed;
            delete migrated.racesWon;
            delete migrated.totalDistance;
            delete migrated.bestLapTime;
            delete migrated.totalGoldSpent;

            // Daily reward structure
            if (!migrated.dailyReward) {
                migrated.dailyReward = {
                    lastClaimed: null,
                    streak: 0,
                    nextRewardAt: null
                };
            }

            // Offline progress tracking
            if (!migrated.offlineProgress) {
                migrated.offlineProgress = {
                    lastSeen: Date.now(),
                    pendingGold: 0
                };
            }

            migrated._version = '2.0';
            return migrated;
        }
    };

    var _versionOrder = ['1.0', '1.1', '1.2', '2.0'];

    function _getVersionIndex(ver) {
        return _versionOrder.indexOf(ver);
    }

    function migrateData(oldVersion, data) {
        var fromIdx = _getVersionIndex(oldVersion);
        var toIdx = _getVersionIndex(CURRENT_VERSION);

        if (fromIdx === -1) {
            throw new Error('Unknown version: ' + oldVersion);
        }
        if (fromIdx === toIdx) {
            // Already current
            return data;
        }
        if (fromIdx > toIdx) {
            throw new Error('Cannot downgrade from ' + oldVersion + ' to ' + CURRENT_VERSION);
        }

        var result = JSON.parse(JSON.stringify(data));
        for (var i = fromIdx; i < toIdx; i++) {
            var from = _versionOrder[i];
            var to = _versionOrder[i + 1];
            var stepKey = from + '->' + to;
            if (!MIGRATION_STEPS[stepKey]) {
                throw new Error('Missing migration step: ' + stepKey);
            }
            console.log('[DATA_MIGRATION] Applying migration step ' + stepKey);
            result = MIGRATION_STEPS[stepKey](result);
        }
        return result;
    }

    function getCurrentVersion() {
        return CURRENT_VERSION;
    }

    function detectVersion(data) {
        if (data._version) return data._version;
        // Heuristic detection for pre-versioned saves
        if (data.profile && data.stats) return '2.0';
        if (data.cars && data.garageCapacity) return '1.2';
        if (data.achievements) return '1.1';
        return '1.0';
    }

    function ensureCurrent(data) {
        var ver = detectVersion(data);
        if (ver === CURRENT_VERSION) return data;
        console.log('[DATA_MIGRATION] Migrating from v' + ver + ' to v' + CURRENT_VERSION);
        return migrateData(ver, data);
    }

    return {
        MIGRATION_VERSIONS: MIGRATION_VERSIONS,
        MIGRATION_STEPS: MIGRATION_STEPS,
        CURRENT_VERSION: CURRENT_VERSION,
        migrateData: migrateData,
        getCurrentVersion: getCurrentVersion,
        detectVersion: detectVersion,
        ensureCurrent: ensureCurrent
    };
}());

// =============================================================================
// SAVE_SLOTS — Multiple save slot management with canvas UI
// =============================================================================

var SAVE_SLOTS = (function () {
    'use strict';

    var MAX_SLOTS = 3;
    var SLOT_PREFIX = 'ahmet_slot_';
    var SLOT_META_KEY = 'ahmet_slot_meta';

    function _getSlotKey(slotId) {
        return SLOT_PREFIX + slotId;
    }

    function _getMeta() {
        try {
            var raw = localStorage.getItem(SLOT_META_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function _saveMeta(meta) {
        try {
            localStorage.setItem(SLOT_META_KEY, JSON.stringify(meta));
        } catch (e) {
            console.warn('[SAVE_SLOTS] Could not save metadata:', e);
        }
    }

    function _validateSlotId(slotId) {
        if (typeof slotId !== 'number' || slotId < 0 || slotId >= MAX_SLOTS) {
            throw new Error('Invalid slot ID: ' + slotId + '. Must be 0–' + (MAX_SLOTS - 1));
        }
    }

    function saveToSlot(slotId) {
        _validateSlotId(slotId);

        // Gather current save data from the global save system if available
        var data = {};
        if (typeof SaveData !== 'undefined' && SaveData.getData) {
            data = SaveData.getData();
        } else if (typeof window !== 'undefined' && window.SAVE_DATA) {
            data = window.SAVE_DATA;
        }

        var snapshot = {
            data: data,
            savedAt: Date.now(),
            slotId: slotId,
            version: DATA_MIGRATION ? DATA_MIGRATION.CURRENT_VERSION : '2.0'
        };

        try {
            localStorage.setItem(_getSlotKey(slotId), JSON.stringify(snapshot));

            var meta = _getMeta();
            meta[slotId] = {
                savedAt: snapshot.savedAt,
                version: snapshot.version,
                playerName: (data.profile && data.profile.name) || 'Player',
                level: (data.profile && data.profile.level) || 1,
                gold: data.gold || 0,
                racesWon: (data.stats && data.stats.racesWon) || 0
            };
            _saveMeta(meta);

            console.log('[SAVE_SLOTS] Saved to slot ' + slotId + ' at ' + new Date(snapshot.savedAt).toLocaleString());
            return { success: true, slotId: slotId, savedAt: snapshot.savedAt };
        } catch (e) {
            console.error('[SAVE_SLOTS] Failed to save to slot ' + slotId + ':', e);
            return { success: false, error: e.message };
        }
    }

    function loadFromSlot(slotId) {
        _validateSlotId(slotId);
        try {
            var raw = localStorage.getItem(_getSlotKey(slotId));
            if (!raw) return { success: false, error: 'Slot ' + slotId + ' is empty' };

            var snapshot = JSON.parse(raw);

            // Run migration if needed
            var data = snapshot.data;
            if (typeof DATA_MIGRATION !== 'undefined') {
                data = DATA_MIGRATION.ensureCurrent(data);
            }

            console.log('[SAVE_SLOTS] Loaded from slot ' + slotId + ', saved at ' + new Date(snapshot.savedAt).toLocaleString());
            return { success: true, data: data, savedAt: snapshot.savedAt, slotId: slotId };
        } catch (e) {
            console.error('[SAVE_SLOTS] Failed to load from slot ' + slotId + ':', e);
            return { success: false, error: e.message };
        }
    }

    function getSlotInfo(slotId) {
        _validateSlotId(slotId);
        var meta = _getMeta();
        if (!meta[slotId]) {
            return { slotId: slotId, isEmpty: true };
        }
        var info = meta[slotId];
        return {
            slotId: slotId,
            isEmpty: false,
            savedAt: info.savedAt,
            savedAtFormatted: new Date(info.savedAt).toLocaleString(),
            version: info.version,
            playerName: info.playerName,
            level: info.level,
            gold: info.gold,
            racesWon: info.racesWon
        };
    }

    function deleteSlot(slotId) {
        _validateSlotId(slotId);
        try {
            localStorage.removeItem(_getSlotKey(slotId));
            var meta = _getMeta();
            delete meta[slotId];
            _saveMeta(meta);
            console.log('[SAVE_SLOTS] Deleted slot ' + slotId);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    function getAllSlots() {
        var result = [];
        for (var i = 0; i < MAX_SLOTS; i++) {
            result.push(getSlotInfo(i));
        }
        return result;
    }

    function drawSlotSelector(ctx, W, H, slots, selectedSlot) {
        if (!ctx) return;

        var panelW = Math.min(W * 0.85, 500);
        var panelH = Math.min(H * 0.75, 420);
        var panelX = (W - panelW) / 2;
        var panelY = (H - panelH) / 2;
        var slotH = (panelH - 80) / MAX_SLOTS;

        // Background panel
        ctx.save();
        ctx.fillStyle = 'rgba(10, 15, 30, 0.95)';
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 12);
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SAVE SLOTS', W / 2, panelY + 36);

        ctx.strokeStyle = 'rgba(74, 158, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + 48);
        ctx.lineTo(panelX + panelW - 20, panelY + 48);
        ctx.stroke();

        // Draw each slot
        for (var i = 0; i < MAX_SLOTS; i++) {
            var slot = (slots && slots[i]) ? slots[i] : { slotId: i, isEmpty: true };
            var sy = panelY + 56 + i * slotH;
            var sx = panelX + 16;
            var sw = panelW - 32;
            var sh = slotH - 10;
            var isSelected = (selectedSlot === i);

            // Slot background
            ctx.fillStyle = isSelected ? 'rgba(74, 158, 255, 0.25)' : 'rgba(255,255,255,0.05)';
            ctx.strokeStyle = isSelected ? '#4a9eff' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = isSelected ? 2 : 1;
            ctx.beginPath();
            ctx.roundRect(sx, sy, sw, sh, 8);
            ctx.fill();
            ctx.stroke();

            // Slot number badge
            ctx.fillStyle = isSelected ? '#4a9eff' : '#555';
            ctx.beginPath();
            ctx.roundRect(sx + 10, sy + sh / 2 - 18, 36, 36, 6);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText((i + 1).toString(), sx + 28, sy + sh / 2 + 6);

            if (slot.isEmpty) {
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('— Empty Slot —', sx + 58, sy + sh / 2 + 5);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(slot.playerName || 'Player', sx + 58, sy + 18 + (sh - 46) / 3);

                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '11px Arial';
                ctx.fillText('Lvl ' + (slot.level || 1) + '   ' + (slot.gold || 0) + ' Gold   Wins: ' + (slot.racesWon || 0), sx + 58, sy + 18 + (sh - 46) * 2 / 3 + 4);

                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = '10px Arial';
                ctx.fillText(slot.savedAtFormatted || '', sx + 58, sy + sh - 12);
            }
        }

        ctx.restore();
    }

    return {
        MAX_SLOTS: MAX_SLOTS,
        saveToSlot: saveToSlot,
        loadFromSlot: loadFromSlot,
        getSlotInfo: getSlotInfo,
        deleteSlot: deleteSlot,
        getAllSlots: getAllSlots,
        drawSlotSelector: drawSlotSelector
    };
}());

// =============================================================================
// STATISTICS_TRACKER — Tracks 40+ gameplay statistics across sessions
// =============================================================================

var STATISTICS_TRACKER = (function () {
    'use strict';

    var STAT_KEYS = {
        // Race stats
        RACES_PLAYED:            'races_played',
        RACES_WON:               'races_won',
        RACES_LOST:              'races_lost',
        RACES_DNF:               'races_dnf',
        WIN_STREAK:              'win_streak',
        BEST_WIN_STREAK:         'best_win_streak',
        PERFECT_RACES:           'perfect_races',
        // Distance / time
        TOTAL_DISTANCE_M:        'total_distance_m',
        TOTAL_AIRTIME_MS:        'total_airtime_ms',
        TOTAL_PLAYTIME_MS:       'total_playtime_ms',
        LONGEST_JUMP_M:          'longest_jump_m',
        BEST_LAP_TIME_MS:        'best_lap_time_ms',
        // Gold / economy
        GOLD_EARNED:             'gold_earned',
        GOLD_SPENT:              'gold_spent',
        GOLD_FROM_RACES:         'gold_from_races',
        GOLD_FROM_OFFLINE:       'gold_from_offline',
        GOLD_FROM_ADS:           'gold_from_ads',
        GEMS_EARNED:             'gems_earned',
        GEMS_SPENT:              'gems_spent',
        // Car / upgrades
        UPGRADES_PURCHASED:      'upgrades_purchased',
        CARS_UNLOCKED:           'cars_unlocked',
        CARS_FULLY_UPGRADED:     'cars_fully_upgraded',
        TIRES_CHANGED:           'tires_changed',
        FUEL_SPENT:              'fuel_spent',
        NITRO_USED:              'nitro_used',
        // Stunts / events
        BACKFLIPS:               'backflips',
        FRONTFLIPS:              'frontflips',
        WHEELIES:                'wheelies',
        STOPPIES:                'stoppies',
        CRASHES:                 'crashes',
        FLIPS_TOTAL:             'flips_total',
        // Progress
        LEVELS_COMPLETED:        'levels_completed',
        STARS_EARNED:            'stars_earned',
        ACHIEVEMENTS_UNLOCKED:   'achievements_unlocked',
        DAILY_REWARDS_CLAIMED:   'daily_rewards_claimed',
        LOGIN_DAYS:              'login_days',
        // Social
        GIFTS_SENT:              'gifts_sent',
        GIFTS_RECEIVED:          'gifts_received',
        CHALLENGES_WON:          'challenges_won',
        CHALLENGES_LOST:         'challenges_lost',
        // Misc
        ADS_WATCHED:             'ads_watched',
        RETRIES:                 'retries',
        CHECKPOINTS_HIT:         'checkpoints_hit',
        TOTAL_SESSIONS:          'total_sessions'
    };

    var _STORAGE_KEY = 'ahmet_stats_lifetime';

    var _lifetimeStats = (function () {
        try {
            var raw = localStorage.getItem(_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }());

    var SESSION_STATS = {};

    // Initialize all keys to 0 if missing
    (function () {
        Object.keys(STAT_KEYS).forEach(function (k) {
            var key = STAT_KEYS[k];
            if (_lifetimeStats[key] === undefined) _lifetimeStats[key] = 0;
            SESSION_STATS[key] = 0;
        });
    }());

    function _persist() {
        try {
            localStorage.setItem(_STORAGE_KEY, JSON.stringify(_lifetimeStats));
        } catch (e) {
            console.warn('[STATS] Could not persist stats:', e);
        }
    }

    function increment(key, amount) {
        if (amount === undefined) amount = 1;
        if (typeof amount !== 'number' || isNaN(amount)) {
            console.warn('[STATS] Invalid amount for key ' + key);
            return;
        }

        // Handle "best" stats — only update if new value is better
        var bestKeys = [STAT_KEYS.LONGEST_JUMP_M, STAT_KEYS.BEST_WIN_STREAK];
        var minKeys  = [STAT_KEYS.BEST_LAP_TIME_MS];

        if (bestKeys.indexOf(key) !== -1) {
            if (amount > (_lifetimeStats[key] || 0)) {
                _lifetimeStats[key] = amount;
                SESSION_STATS[key] = amount;
            }
        } else if (minKeys.indexOf(key) !== -1) {
            if (_lifetimeStats[key] === 0 || amount < _lifetimeStats[key]) {
                _lifetimeStats[key] = amount;
                SESSION_STATS[key] = amount;
            }
        } else {
            _lifetimeStats[key] = (_lifetimeStats[key] || 0) + amount;
            SESSION_STATS[key]   = (SESSION_STATS[key] || 0) + amount;
        }

        _persist();
    }

    function getStat(key) {
        return _lifetimeStats[key] !== undefined ? _lifetimeStats[key] : 0;
    }

    function getSessionStat(key) {
        return SESSION_STATS[key] !== undefined ? SESSION_STATS[key] : 0;
    }

    function getLifetimeStats() {
        return JSON.parse(JSON.stringify(_lifetimeStats));
    }

    function resetSession() {
        Object.keys(SESSION_STATS).forEach(function (k) {
            SESSION_STATS[k] = 0;
        });
        console.log('[STATS] Session stats reset');
    }

    function formatStat(key, value) {
        if (value === undefined || value === null) value = getStat(key);

        switch (key) {
            case STAT_KEYS.TOTAL_DISTANCE_M:
                if (value >= 1000) return (value / 1000).toFixed(2) + ' km';
                return value.toFixed(1) + ' m';

            case STAT_KEYS.BEST_LAP_TIME_MS:
            case STAT_KEYS.TOTAL_PLAYTIME_MS:
            case STAT_KEYS.TOTAL_AIRTIME_MS:
                if (value === 0) return '--:--';
                var totalSec = Math.floor(value / 1000);
                var min = Math.floor(totalSec / 60);
                var sec = totalSec % 60;
                var ms  = Math.floor((value % 1000) / 10);
                if (key === STAT_KEYS.TOTAL_PLAYTIME_MS) {
                    var hrs = Math.floor(min / 60);
                    min = min % 60;
                    return hrs + 'h ' + min + 'm ' + sec + 's';
                }
                return min + ':' + (sec < 10 ? '0' : '') + sec + '.' + (ms < 10 ? '0' : '') + ms;

            case STAT_KEYS.GOLD_EARNED:
            case STAT_KEYS.GOLD_SPENT:
            case STAT_KEYS.GOLD_FROM_RACES:
            case STAT_KEYS.GOLD_FROM_OFFLINE:
            case STAT_KEYS.GOLD_FROM_ADS:
                if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
                if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                return value.toString();

            case STAT_KEYS.LONGEST_JUMP_M:
                return value.toFixed(1) + ' m';

            case STAT_KEYS.WIN_STREAK:
            case STAT_KEYS.BEST_WIN_STREAK:
                return value + ' in a row';

            default:
                return value.toLocaleString();
        }
    }

    function getStatLabel(key) {
        var labels = {
            races_played: 'Races Played', races_won: 'Races Won', races_lost: 'Races Lost',
            races_dnf: 'DNF Count', win_streak: 'Current Streak', best_win_streak: 'Best Streak',
            perfect_races: 'Perfect Races', total_distance_m: 'Total Distance',
            total_airtime_ms: 'Total Air Time', total_playtime_ms: 'Time Played',
            longest_jump_m: 'Longest Jump', best_lap_time_ms: 'Best Lap Time',
            gold_earned: 'Gold Earned', gold_spent: 'Gold Spent', upgrades_purchased: 'Upgrades Bought',
            cars_unlocked: 'Cars Unlocked', crashes: 'Total Crashes', backflips: 'Backflips',
            frontflips: 'Frontflips', wheelies: 'Wheelies', nitro_used: 'Nitro Uses',
            achievements_unlocked: 'Achievements', stars_earned: 'Stars Earned',
            daily_rewards_claimed: 'Daily Rewards', total_sessions: 'Sessions Played'
        };
        return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    function importStats(obj) {
        if (!obj || typeof obj !== 'object') return false;
        Object.keys(obj).forEach(function (k) {
            if (typeof obj[k] === 'number') {
                _lifetimeStats[k] = obj[k];
            }
        });
        _persist();
        return true;
    }

    return {
        STAT_KEYS: STAT_KEYS,
        SESSION_STATS: SESSION_STATS,
        increment: increment,
        getStat: getStat,
        getSessionStat: getSessionStat,
        getLifetimeStats: getLifetimeStats,
        resetSession: resetSession,
        formatStat: formatStat,
        getStatLabel: getStatLabel,
        importStats: importStats
    };
}());

// =============================================================================
// SETTINGS_SCHEMA — Validated settings with defaults, import/export
// =============================================================================

var SETTINGS_SCHEMA = (function () {
    'use strict';

    var SETTINGS_STORAGE_KEY = 'ahmet_settings';

    var DEFAULT_SETTINGS = {
        // Graphics
        graphics_quality:        'medium',   // 'low' | 'medium' | 'high' | 'ultra'
        graphics_shadows:        true,
        graphics_particles:      true,
        graphics_motion_blur:    false,
        graphics_vsync:          true,
        graphics_fps_cap:        60,          // 30 | 60 | 120
        graphics_resolution:     1.0,         // 0.5 | 0.75 | 1.0 | 1.25 | 1.5
        graphics_antialiasing:   'fxaa',      // 'none' | 'fxaa' | 'msaa2x' | 'msaa4x'
        graphics_hdr:            false,

        // Audio
        audio_master_vol:        1.0,         // 0.0–1.0
        audio_sfx_vol:           0.8,
        audio_music_vol:         0.6,
        audio_engine_vol:        0.9,
        audio_crash_vol:         0.7,
        audio_ui_vol:            0.5,
        audio_muted:             false,
        audio_music_muted:       false,
        audio_haptic:            true,        // vibration on mobile

        // Gameplay
        gameplay_difficulty:     'normal',    // 'easy' | 'normal' | 'hard' | 'extreme'
        gameplay_show_hints:     true,
        gameplay_auto_brake:     false,
        gameplay_show_fps:       false,
        gameplay_show_speedometer: true,
        gameplay_camera_shake:   true,
        gameplay_camera_distance: 1.0,        // 0.5–2.0
        gameplay_flip_direction: 'tap',       // 'tap' | 'swipe' | 'button'
        gameplay_nitro_auto:     false,
        gameplay_ghost_car:      true,
        gameplay_replay_save:    true,

        // Controls
        controls_sensitivity:    0.75,        // 0.1–1.0
        controls_dead_zone:      0.1,         // 0.0–0.5
        controls_invert_y:       false,
        controls_vibration:      true,
        controls_gyro:           false,
        controls_gyro_sensitivity: 0.5,
        controls_layout:         'default',   // 'default' | 'left' | 'minimal'
        controls_button_size:    1.0,         // 0.5–1.5

        // Notifications
        notif_daily_reward:      true,
        notif_race_events:       true,
        notif_friend_activity:   false,
        notif_offers:            true,

        // Accessibility
        access_color_blind:      'none',      // 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
        access_large_text:       false,
        access_high_contrast:    false,
        access_reduce_motion:    false,

        // Language / region
        language:                'en',
        currency_symbol:         'G',
        date_format:             'MM/DD/YYYY',
        units:                   'metric'     // 'metric' | 'imperial'
    };

    var SETTINGS_VALIDATORS = {
        graphics_quality: function (v) {
            return ['low', 'medium', 'high', 'ultra'].indexOf(v) !== -1;
        },
        graphics_shadows: function (v) { return typeof v === 'boolean'; },
        graphics_particles: function (v) { return typeof v === 'boolean'; },
        graphics_motion_blur: function (v) { return typeof v === 'boolean'; },
        graphics_vsync: function (v) { return typeof v === 'boolean'; },
        graphics_fps_cap: function (v) { return [30, 60, 120, 144, 240].indexOf(v) !== -1; },
        graphics_resolution: function (v) { return typeof v === 'number' && v >= 0.25 && v <= 2.0; },
        graphics_antialiasing: function (v) {
            return ['none', 'fxaa', 'msaa2x', 'msaa4x'].indexOf(v) !== -1;
        },
        graphics_hdr: function (v) { return typeof v === 'boolean'; },

        audio_master_vol: function (v) { return typeof v === 'number' && v >= 0 && v <= 1; },
        audio_sfx_vol: function (v) { return typeof v === 'number' && v >= 0 && v <= 1; },
        audio_music_vol: function (v) { return typeof v === 'number' && v >= 0 && v <= 1; },
        audio_engine_vol: function (v) { return typeof v === 'number' && v >= 0 && v <= 1; },
        audio_crash_vol: function (v) { return typeof v === 'number' && v >= 0 && v <= 1; },
        audio_ui_vol: function (v) { return typeof v === 'number' && v >= 0 && v <= 1; },
        audio_muted: function (v) { return typeof v === 'boolean'; },
        audio_music_muted: function (v) { return typeof v === 'boolean'; },
        audio_haptic: function (v) { return typeof v === 'boolean'; },

        gameplay_difficulty: function (v) {
            return ['easy', 'normal', 'hard', 'extreme'].indexOf(v) !== -1;
        },
        gameplay_show_hints: function (v) { return typeof v === 'boolean'; },
        gameplay_auto_brake: function (v) { return typeof v === 'boolean'; },
        gameplay_show_fps: function (v) { return typeof v === 'boolean'; },
        gameplay_show_speedometer: function (v) { return typeof v === 'boolean'; },
        gameplay_camera_shake: function (v) { return typeof v === 'boolean'; },
        gameplay_camera_distance: function (v) { return typeof v === 'number' && v >= 0.25 && v <= 3.0; },
        gameplay_flip_direction: function (v) {
            return ['tap', 'swipe', 'button'].indexOf(v) !== -1;
        },
        gameplay_nitro_auto: function (v) { return typeof v === 'boolean'; },
        gameplay_ghost_car: function (v) { return typeof v === 'boolean'; },
        gameplay_replay_save: function (v) { return typeof v === 'boolean'; },

        controls_sensitivity: function (v) { return typeof v === 'number' && v >= 0.05 && v <= 1.0; },
        controls_dead_zone: function (v) { return typeof v === 'number' && v >= 0 && v <= 0.9; },
        controls_invert_y: function (v) { return typeof v === 'boolean'; },
        controls_vibration: function (v) { return typeof v === 'boolean'; },
        controls_gyro: function (v) { return typeof v === 'boolean'; },
        controls_gyro_sensitivity: function (v) { return typeof v === 'number' && v >= 0.05 && v <= 1.0; },
        controls_layout: function (v) {
            return ['default', 'left', 'minimal', 'custom'].indexOf(v) !== -1;
        },
        controls_button_size: function (v) { return typeof v === 'number' && v >= 0.4 && v <= 2.0; },

        notif_daily_reward: function (v) { return typeof v === 'boolean'; },
        notif_race_events: function (v) { return typeof v === 'boolean'; },
        notif_friend_activity: function (v) { return typeof v === 'boolean'; },
        notif_offers: function (v) { return typeof v === 'boolean'; },

        access_color_blind: function (v) {
            return ['none', 'deuteranopia', 'protanopia', 'tritanopia'].indexOf(v) !== -1;
        },
        access_large_text: function (v) { return typeof v === 'boolean'; },
        access_high_contrast: function (v) { return typeof v === 'boolean'; },
        access_reduce_motion: function (v) { return typeof v === 'boolean'; },

        language: function (v) { return typeof v === 'string' && v.length >= 2 && v.length <= 8; },
        currency_symbol: function (v) { return typeof v === 'string' && v.length <= 4; },
        date_format: function (v) { return ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].indexOf(v) !== -1; },
        units: function (v) { return ['metric', 'imperial'].indexOf(v) !== -1; }
    };

    // Load persisted settings, merge with defaults
    var _current = (function () {
        var out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        try {
            var raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (raw) {
                var saved = JSON.parse(raw);
                Object.keys(saved).forEach(function (k) {
                    if (DEFAULT_SETTINGS.hasOwnProperty(k)) {
                        var validator = SETTINGS_VALIDATORS[k];
                        if (!validator || validator(saved[k])) {
                            out[k] = saved[k];
                        }
                    }
                });
            }
        } catch (e) {
            console.warn('[SETTINGS] Could not load settings:', e);
        }
        return out;
    }());

    function _persist() {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(_current));
        } catch (e) {
            console.warn('[SETTINGS] Could not save settings:', e);
        }
    }

    function getSetting(key) {
        if (_current.hasOwnProperty(key)) return _current[key];
        if (DEFAULT_SETTINGS.hasOwnProperty(key)) return DEFAULT_SETTINGS[key];
        return undefined;
    }

    function setSetting(key, val) {
        if (!DEFAULT_SETTINGS.hasOwnProperty(key)) {
            console.warn('[SETTINGS] Unknown setting key:', key);
            return false;
        }
        var validator = SETTINGS_VALIDATORS[key];
        if (validator && !validator(val)) {
            console.warn('[SETTINGS] Validation failed for ' + key + ' = ', val);
            return false;
        }
        _current[key] = val;
        _persist();
        return true;
    }

    function resetSettings() {
        _current = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        _persist();
        console.log('[SETTINGS] All settings reset to defaults');
    }

    function exportSettings() {
        return JSON.parse(JSON.stringify(_current));
    }

    function importSettings(obj) {
        if (!obj || typeof obj !== 'object') return false;
        var importedCount = 0;
        Object.keys(obj).forEach(function (k) {
            if (setSetting(k, obj[k])) importedCount++;
        });
        console.log('[SETTINGS] Imported ' + importedCount + ' settings');
        return importedCount > 0;
    }

    function getGroup(groupPrefix) {
        var result = {};
        Object.keys(_current).forEach(function (k) {
            if (k.indexOf(groupPrefix) === 0) result[k] = _current[k];
        });
        return result;
    }

    return {
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        SETTINGS_VALIDATORS: SETTINGS_VALIDATORS,
        getSetting: getSetting,
        setSetting: setSetting,
        resetSettings: resetSettings,
        exportSettings: exportSettings,
        importSettings: importSettings,
        getGroup: getGroup
    };
}());

// =============================================================================
// OFFLINE_PROGRESS — Calculates and claims idle/offline earnings
// =============================================================================

var OFFLINE_PROGRESS = (function () {
    'use strict';

    var MAX_OFFLINE_HOURS = 8;
    var MAX_OFFLINE_MS = MAX_OFFLINE_HOURS * 3600 * 1000;
    var LAST_SEEN_KEY = 'ahmet_last_seen';

    // Gold per second rates indexed by garage level (0-based, capped at length-1)
    var OFFLINE_RATE = {
        byGarageLevel: [
             0.5,   // level 0 — no upgrades
             0.8,
             1.2,
             1.7,
             2.3,
             3.0,
             4.0,
             5.2,
             6.5,
             8.0,
            10.0,
            12.5,
            15.0,
            18.0,
            22.0,
            27.0,
            33.0,
            40.0,
            48.0,
            58.0    // level 19 — fully maxed
        ],

        // Returns gold/sec for a given garage level
        get: function (garageLevel) {
            var idx = Math.min(Math.max(garageLevel || 0, 0), this.byGarageLevel.length - 1);
            return this.byGarageLevel[idx];
        },

        // Flat bonus from premium cars
        premiumBonus: 0.0,

        // Multiplier from event boosts etc.
        multiplier: 1.0,

        effective: function (garageLevel) {
            return (this.get(garageLevel) + this.premiumBonus) * this.multiplier;
        }
    };

    var _pendingReward = null;

    function _getLastSeen() {
        try {
            var raw = localStorage.getItem(LAST_SEEN_KEY);
            return raw ? parseInt(raw, 10) : null;
        } catch (e) {
            return null;
        }
    }

    function _saveLastSeen(ts) {
        try {
            localStorage.setItem(LAST_SEEN_KEY, ts.toString());
        } catch (e) {}
    }

    function calcOfflineProgress(lastSeen, now, garageLevel) {
        if (!lastSeen || !now) return null;
        if (garageLevel === undefined) garageLevel = 0;

        var elapsed = now - lastSeen;
        if (elapsed <= 0) return null;

        // Cap at maximum offline hours
        var effectiveElapsed = Math.min(elapsed, MAX_OFFLINE_MS);
        var cappedHours = effectiveElapsed / 3600000;
        var wasCapped = elapsed > MAX_OFFLINE_MS;

        var goldPerSec = OFFLINE_RATE.effective(garageLevel);
        var goldEarned = Math.floor(goldPerSec * (effectiveElapsed / 1000));

        return {
            elapsedMs: elapsed,
            effectiveMs: effectiveElapsed,
            elapsedHours: elapsed / 3600000,
            cappedHours: cappedHours,
            wasCapped: wasCapped,
            goldPerSec: goldPerSec,
            goldEarned: goldEarned,
            garageLevel: garageLevel,
            lastSeen: lastSeen,
            calculatedAt: now
        };
    }

    function checkOnReturn() {
        var lastSeen = _getLastSeen();
        var now = Date.now();
        var garageLevel = 0;

        // Try to read garage level from save data
        try {
            if (typeof SaveData !== 'undefined' && SaveData.getData) {
                var d = SaveData.getData();
                garageLevel = (d && d.garageLevel) ? d.garageLevel : 0;
            }
        } catch (e) {}

        if (!lastSeen) {
            _saveLastSeen(now);
            return null;
        }

        var result = calcOfflineProgress(lastSeen, now, garageLevel);
        _saveLastSeen(now);

        if (result && result.goldEarned > 0) {
            _pendingReward = result;
        }
        return result;
    }

    function claimOfflineReward() {
        if (!_pendingReward) {
            return { success: false, reason: 'No pending offline reward' };
        }

        var reward = _pendingReward;
        _pendingReward = null;

        // Apply gold to save data if available
        try {
            if (typeof SaveData !== 'undefined' && SaveData.addGold) {
                SaveData.addGold(reward.goldEarned);
            }
            if (typeof STATISTICS_TRACKER !== 'undefined') {
                STATISTICS_TRACKER.increment(STATISTICS_TRACKER.STAT_KEYS.GOLD_FROM_OFFLINE, reward.goldEarned);
                STATISTICS_TRACKER.increment(STATISTICS_TRACKER.STAT_KEYS.GOLD_EARNED, reward.goldEarned);
            }
        } catch (e) {
            console.warn('[OFFLINE_PROGRESS] Could not apply reward to save data:', e);
        }

        return { success: true, reward: reward };
    }

    function getPendingReward() {
        return _pendingReward ? JSON.parse(JSON.stringify(_pendingReward)) : null;
    }

    function tickLastSeen() {
        _saveLastSeen(Date.now());
    }

    function drawOfflineRewardModal(ctx, W, H, reward, t) {
        if (!ctx || !reward) return;

        var pulse = 0.92 + 0.08 * Math.sin((t || 0) * 0.004);
        var panelW = Math.min(W * 0.82, 420);
        var panelH = 310;
        var px = (W - panelW) / 2;
        var py = (H - panelH) / 2;

        ctx.save();

        // Dim background
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, W, H);

        // Panel glow
        ctx.shadowColor = '#f5c842';
        ctx.shadowBlur = 28 * pulse;

        ctx.fillStyle = 'rgba(20, 18, 10, 0.97)';
        ctx.strokeStyle = '#f5c842';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(px, py, panelW, panelH, 14);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Moon / sleep icon area
        ctx.fillStyle = 'rgba(245, 200, 66, 0.12)';
        ctx.beginPath();
        ctx.arc(W / 2, py + 60, 38 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f5c842';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('\uD83C\uDF19', W / 2, py + 74);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Welcome Back!', W / 2, py + 118);

        // Subtitle
        var hours = reward.cappedHours.toFixed(1);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '14px Arial';
        ctx.fillText('You were away for ' + hours + 'h' + (reward.wasCapped ? ' (max ' + MAX_OFFLINE_HOURS + 'h)' : ''), W / 2, py + 144);

        // Gold amount
        ctx.fillStyle = '#f5c842';
        ctx.font = 'bold 34px Arial';
        ctx.fillText('+ ' + reward.goldEarned.toLocaleString() + ' G', W / 2, py + 194);

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '12px Arial';
        ctx.fillText(reward.goldPerSec.toFixed(2) + ' gold/sec from your garage', W / 2, py + 216);

        // Claim button
        var btnW = 160, btnH = 44;
        var bx = (W - btnW) / 2;
        var by = py + 244;
        var grad = ctx.createLinearGradient(bx, by, bx, by + btnH);
        grad.addColorStop(0, '#f7d94a');
        grad.addColorStop(1, '#d4a012');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(bx, by, btnW, btnH, 8);
        ctx.fill();

        ctx.fillStyle = '#2a1a00';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('CLAIM', W / 2, by + 28);

        ctx.restore();
    }

    return {
        OFFLINE_RATE: OFFLINE_RATE,
        MAX_OFFLINE_HOURS: MAX_OFFLINE_HOURS,
        calcOfflineProgress: calcOfflineProgress,
        checkOnReturn: checkOnReturn,
        claimOfflineReward: claimOfflineReward,
        getPendingReward: getPendingReward,
        tickLastSeen: tickLastSeen,
        drawOfflineRewardModal: drawOfflineRewardModal
    };
}());

// =============================================================================
// EXPORT_IMPORT — JSON export/import and short base64 save codes
// =============================================================================

var EXPORT_IMPORT = (function () {
    'use strict';

    var EXPORT_VERSION = '2';
    var MAGIC_PREFIX = 'AHMET-';

    // ------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------

    function _getCurrentSaveData() {
        var data = null;
        try {
            if (typeof SaveData !== 'undefined' && SaveData.getData) {
                data = SaveData.getData();
            }
        } catch (e) {}

        if (!data) {
            // Fallback: read from localStorage directly
            try {
                var raw = localStorage.getItem('ahmet_savedata');
                data = raw ? JSON.parse(raw) : {};
            } catch (e) {
                data = {};
            }
        }
        return data;
    }

    function _applySaveData(data) {
        try {
            if (typeof SaveData !== 'undefined' && SaveData.setData) {
                SaveData.setData(data);
                return true;
            }
        } catch (e) {}
        // Fallback: write to localStorage
        try {
            localStorage.setItem('ahmet_savedata', JSON.stringify(data));
            return true;
        } catch (e) {
            return false;
        }
    }

    function _b64Encode(str) {
        try {
            // Works in both browser and Node
            if (typeof btoa === 'function') {
                return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p1) {
                    return String.fromCharCode(parseInt(p1, 16));
                }));
            }
            // Node.js fallback
            return Buffer.from(str, 'utf8').toString('base64');
        } catch (e) {
            return null;
        }
    }

    function _b64Decode(b64) {
        try {
            if (typeof atob === 'function') {
                return decodeURIComponent(atob(b64).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
            }
            return Buffer.from(b64, 'base64').toString('utf8');
        } catch (e) {
            return null;
        }
    }

    // Lightweight LZW-inspired string compressor (reduces typical save by ~40%)
    function _compress(str) {
        var dict = {}, data = (str + '').split(''), out = [], currChar, phrase = data[0], code = 256;
        for (var i = 1; i < data.length; i++) {
            currChar = data[i];
            if (dict[phrase + currChar] !== undefined) {
                phrase += currChar;
            } else {
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                dict[phrase + currChar] = code++;
                phrase = currChar;
            }
        }
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        // Encode as comma-separated numbers then base64
        return _b64Encode(out.join(','));
    }

    function _decompress(encoded) {
        var str = _b64Decode(encoded);
        if (!str) return null;
        var codes = str.split(',').map(Number);
        var dict = {}, currChar = String.fromCharCode(codes[0]), oldPhrase = currChar, out = [currChar], phrase, code = 256, len = codes.length;
        for (var i = 1; i < len; i++) {
            var currCode = codes[i];
            if (currCode < 256) {
                phrase = String.fromCharCode(currCode);
            } else {
                phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
            }
            out.push(phrase);
            currChar = phrase[0];
            dict[code++] = oldPhrase + currChar;
            oldPhrase = phrase;
        }
        return out.join('');
    }

    function _checksumStr(str) {
        var h = 5381;
        for (var i = 0; i < str.length; i++) {
            h = (((h << 5) + h) + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(h).toString(36).slice(0, 6).toUpperCase();
    }

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    function exportSaveAsJSON() {
        var data = _getCurrentSaveData();
        var wrapper = {
            _exportedAt: Date.now(),
            _exportVersion: EXPORT_VERSION,
            _gameVersion: typeof DATA_MIGRATION !== 'undefined' ? DATA_MIGRATION.CURRENT_VERSION : '2.0',
            save: data
        };
        return JSON.stringify(wrapper, null, 2);
    }

    function importSaveFromJSON(jsonStr) {
        if (!jsonStr || typeof jsonStr !== 'string') {
            return { success: false, error: 'Input is empty or not a string' };
        }

        var parsed;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            return { success: false, error: 'Invalid JSON: ' + e.message };
        }

        // Handle both raw save objects and wrapped exports
        var saveData = parsed.save !== undefined ? parsed.save : parsed;

        // Run migration if needed
        if (typeof DATA_MIGRATION !== 'undefined') {
            try {
                saveData = DATA_MIGRATION.ensureCurrent(saveData);
            } catch (e) {
                return { success: false, error: 'Migration failed: ' + e.message };
            }
        }

        var applied = _applySaveData(saveData);
        if (!applied) {
            return { success: false, error: 'Could not apply save data' };
        }

        return {
            success: true,
            exportedAt: parsed._exportedAt ? new Date(parsed._exportedAt).toLocaleString() : 'unknown',
            gameVersion: parsed._gameVersion || 'unknown'
        };
    }

    function generateSaveCode() {
        var data = _getCurrentSaveData();

        // Build a compact subset for the code (not full save — just key fields)
        var compact = {
            v: EXPORT_VERSION,
            t: Date.now(),
            g: data.gold || 0,
            l: (data.profile && data.profile.level) || (data.level) || 1,
            c: data.cars ? Object.keys(data.cars).length : 0,
            s: data.stats || {},
            a: data.achievements || []
        };

        var json = JSON.stringify(compact);
        var chk  = _checksumStr(json);
        var compressed = _compress(json);

        if (!compressed) return null;

        return MAGIC_PREFIX + EXPORT_VERSION + '-' + chk + '-' + compressed;
    }

    function decodeSaveCode(code) {
        if (!code || typeof code !== 'string') {
            return { success: false, error: 'No code provided' };
        }

        if (code.indexOf(MAGIC_PREFIX) !== 0) {
            return { success: false, error: 'Not a valid AHMET save code (missing prefix)' };
        }

        var withoutPrefix = code.slice(MAGIC_PREFIX.length);
        var parts = withoutPrefix.split('-');

        if (parts.length < 3) {
            return { success: false, error: 'Malformed save code' };
        }

        var exportVer = parts[0];
        var checksum  = parts[1];
        var payload   = parts.slice(2).join('-'); // rejoin in case base64 had dashes

        var decompressed = _decompress(payload);
        if (!decompressed) {
            return { success: false, error: 'Failed to decompress save code' };
        }

        var expectedChk = _checksumStr(decompressed);
        if (expectedChk !== checksum) {
            return { success: false, error: 'Checksum mismatch — code may be corrupt' };
        }

        var compact;
        try {
            compact = JSON.parse(decompressed);
        } catch (e) {
            return { success: false, error: 'JSON parse error: ' + e.message };
        }

        // Reconstruct a partial save and merge into current
        var currentData = _getCurrentSaveData();
        if (compact.g !== undefined) currentData.gold = compact.g;
        if (compact.s) currentData.stats = Object.assign(currentData.stats || {}, compact.s);
        if (compact.a) currentData.achievements = compact.a;
        if (compact.l) {
            if (!currentData.profile) currentData.profile = {};
            currentData.profile.level = compact.l;
        }

        var applied = _applySaveData(currentData);
        if (!applied) {
            return { success: false, error: 'Could not apply decoded data' };
        }

        return {
            success: true,
            exportVersion: exportVer,
            codeTimestamp: compact.t ? new Date(compact.t).toLocaleString() : 'unknown',
            goldRestored: compact.g || 0,
            levelRestored: compact.l || 1
        };
    }

    function exportSaveAsBase64() {
        var json = exportSaveAsJSON();
        var encoded = _b64Encode(json);
        return encoded ? (MAGIC_PREFIX + 'FULL-' + encoded) : null;
    }

    function importSaveFromBase64(code) {
        if (!code || code.indexOf(MAGIC_PREFIX + 'FULL-') !== 0) {
            return { success: false, error: 'Not a valid full base64 save code' };
        }
        var b64Part = code.slice((MAGIC_PREFIX + 'FULL-').length);
        var json = _b64Decode(b64Part);
        if (!json) return { success: false, error: 'Failed to decode base64' };
        return importSaveFromJSON(json);
    }

    return {
        exportSaveAsJSON: exportSaveAsJSON,
        importSaveFromJSON: importSaveFromJSON,
        generateSaveCode: generateSaveCode,
        decodeSaveCode: decodeSaveCode,
        exportSaveAsBase64: exportSaveAsBase64,
        importSaveFromBase64: importSaveFromBase64
    };
}());


// =============================================================================
// SAVE_FORMAT_V4 MODULE
// =============================================================================
(function() {
    'use strict';

    var SAVE_FORMAT_V4 = (function() {

        var CURRENT_VERSION = 4;

        var DEFAULT_SAVE_V4 = {
            version: 4,
            playerId: null,
            createdAt: null,
            lastSaved: null,
            checksum: null,
            profile: {
                name: 'Player',
                level: 1,
                xp: 0,
                coins: 0,
                diamonds: 0
            },
            battlePass: {
                season: null,
                tier: 0,
                xp: 0,
                premium: false,
                claimedFreeTiers: [],
                claimedPremiumTiers: [],
                xpMultiplier: 1.0,
                purchasedAt: null
            },
            craftingInventory: {
                materials: {},
                queue: [],
                unlockedRecipes: []
            },
            ghostData: {},
            seasonHistory: [],
            tournamentHistory: [],
            friendsList: [],
            customizations: {},
            settings: {
                graphics: {
                    quality: 'medium',
                    particlesEnabled: true,
                    shadowsEnabled: true,
                    antiAlias: false,
                    targetFps: 60
                },
                audio: {
                    masterVolume: 1.0,
                    sfxVolume: 1.0,
                    musicVolume: 0.7,
                    voiceVolume: 1.0,
                    muteWhenBackground: true
                },
                controls: {
                    scheme: 'default',
                    sensitivity: 1.0,
                    invertY: false,
                    vibration: true,
                    gasTouchArea: 'right',
                    brakeTouchArea: 'left'
                },
                privacy: {
                    shareStats: true,
                    allowFriendRequests: true,
                    showOnLeaderboard: true,
                    shareGhosts: true
                }
            },
            analytics: {
                sessionsPlayed: 0,
                totalPlayTimeMs: 0,
                favoriteMap: null,
                favoriteVehicle: null,
                lastSessionDate: null
            },
            vehicles: {},
            inventory: [],
            mapProgress: {}
        };

        var VALIDATION_SCHEMA = {
            version: { type: 'number', required: true },
            profile: {
                type: 'object',
                required: true,
                fields: {
                    name: { type: 'string', required: true, maxLength: 32 },
                    level: { type: 'number', required: true, min: 1, max: 9999 },
                    xp: { type: 'number', required: true, min: 0 },
                    coins: { type: 'number', required: true, min: 0 },
                    diamonds: { type: 'number', required: true, min: 0 }
                }
            },
            battlePass: {
                type: 'object',
                required: false,
                fields: {
                    tier: { type: 'number', min: 0, max: 50 },
                    xp: { type: 'number', min: 0 },
                    premium: { type: 'boolean' },
                    claimedFreeTiers: { type: 'array' },
                    claimedPremiumTiers: { type: 'array' }
                }
            },
            craftingInventory: {
                type: 'object',
                required: false,
                fields: {
                    materials: { type: 'object' },
                    queue: { type: 'array' },
                    unlockedRecipes: { type: 'array' }
                }
            },
            settings: { type: 'object', required: false },
            analytics: { type: 'object', required: false }
        };

        function validateSection(data, schema) {
            var errors = [];
            if (!schema || !data) return errors;
            Object.keys(schema).forEach(function(key) {
                var rule = schema[key];
                var val = data[key];
                if (rule.required && (val === undefined || val === null)) {
                    errors.push('Missing required field: ' + key);
                    return;
                }
                if (val === undefined || val === null) return;
                if (rule.type && typeof val !== rule.type && rule.type !== 'array') {
                    if (!(rule.type === 'array' && Array.isArray(val))) {
                        errors.push('Type mismatch for ' + key + ': expected ' + rule.type);
                    }
                }
                if (rule.type === 'array' && !Array.isArray(val)) {
                    errors.push('Expected array for ' + key);
                }
                if (rule.min !== undefined && val < rule.min) errors.push(key + ' below minimum ' + rule.min);
                if (rule.max !== undefined && val > rule.max) errors.push(key + ' above maximum ' + rule.max);
                if (rule.maxLength && val.length > rule.maxLength) errors.push(key + ' exceeds maxLength ' + rule.maxLength);
                if (rule.fields && typeof val === 'object') {
                    var subErrors = validateSection(val, rule.fields);
                    errors = errors.concat(subErrors.map(function(e) { return key + '.' + e; }));
                }
            });
            return errors;
        }

        function validateSave(saveData) {
            var allErrors = [];
            Object.keys(VALIDATION_SCHEMA).forEach(function(section) {
                var sectionData = saveData[section];
                var sectionSchema = VALIDATION_SCHEMA[section];
                if (sectionSchema.required && !sectionData) {
                    allErrors.push('Missing required section: ' + section);
                    return;
                }
                if (sectionData) {
                    var errors = validateSection(sectionData, sectionSchema.fields || {});
                    allErrors = allErrors.concat(errors.map(function(e) { return section + '.' + e; }));
                }
            });
            return { valid: allErrors.length === 0, errors: allErrors };
        }

        function migrateV3toV4(v3Save) {
            console.log('[SaveV4] Migrating from v3 to v4...');
            var v4 = JSON.parse(JSON.stringify(DEFAULT_SAVE_V4));
            v4.version = 4;
            v4.playerId = v3Save.playerId || null;
            v4.createdAt = v3Save.createdAt || Date.now();
            v4.lastSaved = Date.now();
            if (v3Save.profile) {
                v4.profile.name = v3Save.profile.name || 'Player';
                v4.profile.level = v3Save.profile.level || 1;
                v4.profile.xp = v3Save.profile.xp || 0;
                v4.profile.coins = v3Save.coins || v3Save.profile.coins || 0;
                v4.profile.diamonds = v3Save.gems || v3Save.profile.diamonds || 0;
            }
            if (v3Save.vehicles) v4.vehicles = v3Save.vehicles;
            if (v3Save.inventory) v4.inventory = v3Save.inventory;
            if (v3Save.mapProgress) v4.mapProgress = v3Save.mapProgress;
            if (v3Save.settings) {
                if (v3Save.settings.volume !== undefined) v4.settings.audio.masterVolume = v3Save.settings.volume;
                if (v3Save.settings.quality) v4.settings.graphics.quality = v3Save.settings.quality;
            }
            v4.battlePass = JSON.parse(JSON.stringify(DEFAULT_SAVE_V4.battlePass));
            v4.craftingInventory = JSON.parse(JSON.stringify(DEFAULT_SAVE_V4.craftingInventory));
            v4.analytics.sessionsPlayed = v3Save.sessionsPlayed || 0;
            v4.analytics.totalPlayTimeMs = v3Save.totalPlayTime || 0;
            console.log('[SaveV4] Migration complete.');
            return v4;
        }

        function migrate(saveData) {
            if (!saveData || !saveData.version) {
                console.warn('[SaveV4] No version in save data, applying defaults.');
                return JSON.parse(JSON.stringify(DEFAULT_SAVE_V4));
            }
            if (saveData.version === 4) return saveData;
            if (saveData.version === 3) return migrateV3toV4(saveData);
            console.error('[SaveV4] Unknown save version: ' + saveData.version);
            return JSON.parse(JSON.stringify(DEFAULT_SAVE_V4));
        }

        function computeChecksum(saveData) {
            var str = JSON.stringify(saveData);
            var hash = 0;
            for (var i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash).toString(16);
        }

        function serializeSave(saveData) {
            var copy = JSON.parse(JSON.stringify(saveData));
            copy.lastSaved = Date.now();
            copy.checksum = computeChecksum(copy);
            return JSON.stringify(copy);
        }

        function deserializeSave(jsonString) {
            try {
                var data = JSON.parse(jsonString);
                var storedChecksum = data.checksum;
                delete data.checksum;
                var computed = computeChecksum(data);
                if (storedChecksum && computed !== storedChecksum) {
                    console.warn('[SaveV4] Checksum mismatch! Save may be corrupted.');
                }
                data.checksum = storedChecksum;
                var migrated = migrate(data);
                var validation = validateSave(migrated);
                if (!validation.valid) {
                    console.warn('[SaveV4] Validation errors:', validation.errors);
                }
                return { success: true, data: migrated, validation: validation };
            } catch (e) {
                console.error('[SaveV4] Failed to deserialize save:', e);
                return { success: false, error: e.message, data: JSON.parse(JSON.stringify(DEFAULT_SAVE_V4)) };
            }
        }

        function recoverPartialSave(jsonString) {
            var recovered = JSON.parse(JSON.stringify(DEFAULT_SAVE_V4));
            var sections = ['profile', 'battlePass', 'craftingInventory', 'vehicles', 'inventory', 'mapProgress', 'settings', 'analytics'];
            try {
                var raw = JSON.parse(jsonString);
                sections.forEach(function(section) {
                    try {
                        if (raw[section] !== undefined) {
                            recovered[section] = raw[section];
                        }
                    } catch (sectionErr) {
                        console.warn('[SaveV4] Could not recover section: ' + section);
                    }
                });
                console.log('[SaveV4] Partial recovery completed.');
                return { success: true, recovered: recovered, partial: true };
            } catch (e) {
                return { success: false, data: recovered };
            }
        }

        function getSaveSize(saveData) {
            var serialized = JSON.stringify(saveData);
            return {
                chars: serialized.length,
                bytes: new Blob ? new Blob([serialized]).size : serialized.length * 2,
                kb: (serialized.length / 1024).toFixed(2)
            };
        }

        return {
            CURRENT_VERSION: CURRENT_VERSION,
            DEFAULT_SAVE_V4: DEFAULT_SAVE_V4,
            VALIDATION_SCHEMA: VALIDATION_SCHEMA,
            validateSave: validateSave,
            migrate: migrate,
            migrateV3toV4: migrateV3toV4,
            computeChecksum: computeChecksum,
            serializeSave: serializeSave,
            deserializeSave: deserializeSave,
            recoverPartialSave: recoverPartialSave,
            getSaveSize: getSaveSize
        };
    })();

    if (typeof window !== 'undefined') window.SAVE_FORMAT_V4 = SAVE_FORMAT_V4;
    if (typeof module !== 'undefined' && module.exports) module.exports.SAVE_FORMAT_V4 = SAVE_FORMAT_V4;
})();

// =============================================================================
// CLOUD_SYNC_STUB MODULE
// =============================================================================
(function() {
    'use strict';

    var CLOUD_SYNC_STUB = (function() {

        var SYNC_STATUS = { IDLE: 'idle', SYNCING: 'syncing', SUCCESS: 'success', ERROR: 'error', CONFLICT: 'conflict' };

        var syncState = {
            status: SYNC_STATUS.IDLE,
            lastSyncAt: null,
            lastSyncError: null,
            isLoggedIn: false,
            playerId: null,
            autoSyncInterval: null,
            pendingChanges: {},
            changedSections: []
        };

        var AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

        function computeChecksum(data) {
            var str = typeof data === 'string' ? data : JSON.stringify(data);
            var h = 0;
            for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
            return Math.abs(h).toString(16);
        }

        function setLoggedIn(isLoggedIn, playerId) {
            syncState.isLoggedIn = isLoggedIn;
            syncState.playerId = playerId || null;
            if (isLoggedIn) {
                startAutoSync();
            } else {
                stopAutoSync();
            }
        }

        function startAutoSync() {
            stopAutoSync();
            syncState.autoSyncInterval = setInterval(function() {
                if (syncState.isLoggedIn && syncState.changedSections.length > 0) {
                    syncToCloud(null, { delta: true });
                }
            }, AUTO_SYNC_INTERVAL_MS);
        }

        function stopAutoSync() {
            if (syncState.autoSyncInterval) {
                clearInterval(syncState.autoSyncInterval);
                syncState.autoSyncInterval = null;
            }
        }

        function markSectionChanged(sectionName) {
            if (syncState.changedSections.indexOf(sectionName) === -1) {
                syncState.changedSections.push(sectionName);
            }
        }

        function syncToCloud(saveData, options) {
            options = options || {};
            if (!syncState.isLoggedIn) return Promise.reject(new Error('Not logged in'));
            if (syncState.status === SYNC_STATUS.SYNCING) return Promise.reject(new Error('Sync already in progress'));

            syncState.status = SYNC_STATUS.SYNCING;

            var payload;
            if (options.delta && syncState.changedSections.length > 0) {
                payload = { type: 'delta', sections: {}, timestamp: Date.now(), playerId: syncState.playerId };
                syncState.changedSections.forEach(function(s) {
                    if (saveData && saveData[s]) payload.sections[s] = saveData[s];
                });
            } else {
                payload = {
                    type: 'full',
                    data: saveData,
                    timestamp: Date.now(),
                    checksum: computeChecksum(saveData),
                    playerId: syncState.playerId
                };
            }

            return new Promise(function(resolve) {
                setTimeout(function() {
                    syncState.status = SYNC_STATUS.SUCCESS;
                    syncState.lastSyncAt = Date.now();
                    syncState.changedSections = [];
                    resolve({ success: true, timestamp: syncState.lastSyncAt, payload: payload });
                }, 200 + Math.random() * 300);
            });
        }

        function syncFromCloud() {
            if (!syncState.isLoggedIn) return Promise.reject(new Error('Not logged in'));
            if (syncState.status === SYNC_STATUS.SYNCING) return Promise.reject(new Error('Sync in progress'));

            syncState.status = SYNC_STATUS.SYNCING;

            return new Promise(function(resolve) {
                setTimeout(function() {
                    syncState.status = SYNC_STATUS.SUCCESS;
                    syncState.lastSyncAt = Date.now();
                    resolve({
                        success: true,
                        cloudData: null,
                        timestamp: syncState.lastSyncAt,
                        note: 'Cloud sync stub — no real server'
                    });
                }, 300 + Math.random() * 400);
            });
        }

        function resolveConflict(localSave, cloudSave) {
            if (!cloudSave) return { winner: 'local', data: localSave };
            if (!localSave) return { winner: 'cloud', data: cloudSave };

            var localTs = localSave.lastSaved || 0;
            var cloudTs = cloudSave.lastSaved || 0;

            if (localTs >= cloudTs) {
                return { winner: 'local', data: localSave, reason: 'Local is newer' };
            }
            return { winner: 'cloud', data: cloudSave, reason: 'Cloud is newer' };
        }

        function mergeOfflineProgress(localSave, cloudSave) {
            if (!cloudSave) return localSave;
            var merged = JSON.parse(JSON.stringify(cloudSave));
            var localCoins = (localSave.profile && localSave.profile.coins) || 0;
            var cloudCoins = (cloudSave.profile && cloudSave.profile.coins) || 0;
            merged.profile.coins = Math.max(localCoins, cloudCoins);
            var localXp = (localSave.profile && localSave.profile.xp) || 0;
            var cloudXp = (cloudSave.profile && cloudSave.profile.xp) || 0;
            merged.profile.xp = Math.max(localXp, cloudXp);
            merged.lastSaved = Date.now();
            merged._mergedAt = Date.now();
            return merged;
        }

        function getSyncStatus() {
            return {
                status: syncState.status,
                isLoggedIn: syncState.isLoggedIn,
                lastSyncAt: syncState.lastSyncAt,
                lastSyncError: syncState.lastSyncError,
                pendingChanges: syncState.changedSections.length,
                autoSyncActive: syncState.autoSyncInterval !== null,
                lastSyncReadable: syncState.lastSyncAt
                    ? new Date(syncState.lastSyncAt).toISOString()
                    : 'Never'
            };
        }

        function manualSync(saveData) {
            return syncToCloud(saveData, { delta: false, manual: true });
        }

        return {
            SYNC_STATUS: SYNC_STATUS,
            syncState: syncState,
            setLoggedIn: setLoggedIn,
            markSectionChanged: markSectionChanged,
            syncToCloud: syncToCloud,
            syncFromCloud: syncFromCloud,
            resolveConflict: resolveConflict,
            mergeOfflineProgress: mergeOfflineProgress,
            getSyncStatus: getSyncStatus,
            manualSync: manualSync,
            startAutoSync: startAutoSync,
            stopAutoSync: stopAutoSync
        };
    })();

    if (typeof window !== 'undefined') window.CLOUD_SYNC_STUB = CLOUD_SYNC_STUB;
    if (typeof module !== 'undefined' && module.exports) module.exports.CLOUD_SYNC_STUB = CLOUD_SYNC_STUB;
})();

// =============================================================================
// STATISTICS_ENGINE MODULE
// =============================================================================
(function() {
    'use strict';

    var STATISTICS_ENGINE = (function() {

        var currentSession = null;
        var careerStats = {
            totalSessions: 0,
            totalPlayTimeMs: 0,
            totalMapsPlayed: 0,
            totalDistanceM: 0,
            totalCoinsCollected: 0,
            totalDiamondsCollected: 0,
            totalTricksPerformed: 0,
            totalCrashCount: 0,
            totalNitroUsed: 0,
            allTimeTopSpeed: 0,
            allTimeTopAirTimeMs: 0,
            allTimeTopComboScore: 0,
            perMapStats: {},
            perVehicleStats: {},
            recordsByMap: {},
            rollingAverage7Day: []
        };

        var heatMapData = {};

        function startSession() {
            currentSession = {
                id: 'sess_' + Date.now(),
                startTime: Date.now(),
                endTime: null,
                durationMs: 0,
                mapsPlayed: [],
                vehiclesUsed: [],
                distanceTraveledM: 0,
                coinsCollected: 0,
                diamondsCollected: 0,
                tricksPerformed: 0,
                crashCount: 0,
                nitroUsed: 0,
                topSpeed: 0,
                topAirTimeMs: 0,
                topComboScore: 0,
                events: []
            };
            return currentSession.id;
        }

        function endSession() {
            if (!currentSession) return null;
            currentSession.endTime = Date.now();
            currentSession.durationMs = currentSession.endTime - currentSession.startTime;
            aggregateToCareer(currentSession);
            updateRollingAverage(currentSession);
            var sess = currentSession;
            currentSession = null;
            return sess;
        }

        function aggregateToCareer(session) {
            careerStats.totalSessions++;
            careerStats.totalPlayTimeMs += session.durationMs;
            careerStats.totalMapsPlayed += session.mapsPlayed.length;
            careerStats.totalDistanceM += session.distanceTraveledM;
            careerStats.totalCoinsCollected += session.coinsCollected;
            careerStats.totalDiamondsCollected += session.diamondsCollected;
            careerStats.totalTricksPerformed += session.tricksPerformed;
            careerStats.totalCrashCount += session.crashCount;
            careerStats.totalNitroUsed += session.nitroUsed;
            if (session.topSpeed > careerStats.allTimeTopSpeed) careerStats.allTimeTopSpeed = session.topSpeed;
            if (session.topAirTimeMs > careerStats.allTimeTopAirTimeMs) careerStats.allTimeTopAirTimeMs = session.topAirTimeMs;
            if (session.topComboScore > careerStats.allTimeTopComboScore) careerStats.allTimeTopComboScore = session.topComboScore;

            session.mapsPlayed.forEach(function(mapId) {
                if (!careerStats.perMapStats[mapId]) {
                    careerStats.perMapStats[mapId] = { plays: 0, totalDistanceM: 0, totalCoins: 0, crashes: 0 };
                }
                careerStats.perMapStats[mapId].plays++;
            });

            session.vehiclesUsed.forEach(function(vId) {
                if (!careerStats.perVehicleStats[vId]) {
                    careerStats.perVehicleStats[vId] = { uses: 0, totalDistanceM: 0, totalCoins: 0, crashes: 0, topSpeed: 0 };
                }
                careerStats.perVehicleStats[vId].uses++;
            });
        }

        function updateRollingAverage(session) {
            var dayKey = new Date(session.startTime).toISOString().slice(0, 10);
            var existing = careerStats.rollingAverage7Day.find(function(d) { return d.date === dayKey; });
            if (existing) {
                existing.sessions++;
                existing.distanceM += session.distanceTraveledM;
                existing.coins += session.coinsCollected;
                existing.tricks += session.tricksPerformed;
            } else {
                careerStats.rollingAverage7Day.push({
                    date: dayKey,
                    sessions: 1,
                    distanceM: session.distanceTraveledM,
                    coins: session.coinsCollected,
                    tricks: session.tricksPerformed
                });
            }
            var sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            var cutoff = sevenDaysAgo.toISOString().slice(0, 10);
            careerStats.rollingAverage7Day = careerStats.rollingAverage7Day.filter(function(d) { return d.date >= cutoff; });
        }

        function recordEvent(eventType, data) {
            if (!currentSession) return;
            var event = { type: eventType, time: Date.now() - currentSession.startTime, data: data };
            currentSession.events.push(event);

            switch (eventType) {
                case 'coin_collected':
                    currentSession.coinsCollected += (data.qty || 1);
                    break;
                case 'diamond_collected':
                    currentSession.diamondsCollected += (data.qty || 1);
                    break;
                case 'trick_performed':
                    currentSession.tricksPerformed++;
                    if (data.score > currentSession.topComboScore) currentSession.topComboScore = data.score;
                    break;
                case 'crash':
                    currentSession.crashCount++;
                    break;
                case 'nitro_used':
                    currentSession.nitroUsed++;
                    break;
                case 'speed_update':
                    if (data.speed > currentSession.topSpeed) currentSession.topSpeed = data.speed;
                    break;
                case 'air_time':
                    if (data.durationMs > currentSession.topAirTimeMs) currentSession.topAirTimeMs = data.durationMs;
                    break;
                case 'map_started':
                    if (currentSession.mapsPlayed.indexOf(data.mapId) === -1) currentSession.mapsPlayed.push(data.mapId);
                    break;
                case 'vehicle_selected':
                    if (currentSession.vehiclesUsed.indexOf(data.vehicleId) === -1) currentSession.vehiclesUsed.push(data.vehicleId);
                    break;
                case 'distance_update':
                    currentSession.distanceTraveledM = data.totalDistanceM;
                    break;
            }
        }

        function recordHeatMapVisit(mapId, tileX, tileY) {
            var key = mapId + '_' + tileX + '_' + tileY;
            heatMapData[key] = (heatMapData[key] || 0) + 1;
        }

        function getHeatMapForMap(mapId, gridSize) {
            gridSize = gridSize || 10;
            var result = {};
            Object.keys(heatMapData).forEach(function(key) {
                var parts = key.split('_');
                if (parts[0] === mapId) {
                    var tileX = parseInt(parts[1], 10);
                    var tileY = parseInt(parts[2], 10);
                    var cellX = Math.floor(tileX / gridSize);
                    var cellY = Math.floor(tileY / gridSize);
                    var cellKey = cellX + '_' + cellY;
                    result[cellKey] = (result[cellKey] || 0) + heatMapData[key];
                }
            });
            return result;
        }

        function getFavoritemap() {
            var best = null, bestPlays = 0;
            Object.keys(careerStats.perMapStats).forEach(function(mapId) {
                if (careerStats.perMapStats[mapId].plays > bestPlays) {
                    bestPlays = careerStats.perMapStats[mapId].plays;
                    best = mapId;
                }
            });
            return best;
        }

        function getFavoriteVehicle() {
            var best = null, bestUses = 0;
            Object.keys(careerStats.perVehicleStats).forEach(function(vId) {
                if (careerStats.perVehicleStats[vId].uses > bestUses) {
                    bestUses = careerStats.perVehicleStats[vId].uses;
                    best = vId;
                }
            });
            return best;
        }

        function isPlayerImproving() {
            var data = careerStats.rollingAverage7Day;
            if (data.length < 4) return null;
            var recent = data.slice(-3);
            var older = data.slice(-6, -3);
            if (older.length === 0) return null;
            var recentAvgDist = recent.reduce(function(s, d) { return s + d.distanceM; }, 0) / recent.length;
            var olderAvgDist = older.reduce(function(s, d) { return s + d.distanceM; }, 0) / older.length;
            return { improving: recentAvgDist > olderAvgDist, recentAvg: recentAvgDist, olderAvg: olderAvgDist };
        }

        function exportStatisticsJSON() {
            return JSON.stringify({
                career: careerStats,
                currentSession: currentSession,
                favoriteMap: getFavoritemap(),
                favoriteVehicle: getFavoriteVehicle(),
                trend: isPlayerImproving(),
                exportedAt: new Date().toISOString()
            }, null, 2);
        }

        function generateHumanReadableSummary() {
            var fav = getFavoritemap();
            var favV = getFavoriteVehicle();
            var trend = isPlayerImproving();
            var hours = (careerStats.totalPlayTimeMs / 3600000).toFixed(1);
            var km = (careerStats.totalDistanceM / 1000).toFixed(1);
            var lines = [
                'Player Statistics Summary',
                '========================',
                'Total Sessions: ' + careerStats.totalSessions,
                'Total Play Time: ' + hours + ' hours',
                'Total Distance: ' + km + ' km',
                'Total Coins: ' + careerStats.totalCoinsCollected.toLocaleString(),
                'Total Tricks: ' + careerStats.totalTricksPerformed,
                'Total Crashes: ' + careerStats.totalCrashCount,
                'Top Speed: ' + careerStats.allTimeTopSpeed.toFixed(1) + ' km/h',
                'Top Air Time: ' + (careerStats.allTimeTopAirTimeMs / 1000).toFixed(2) + 's',
                'Top Combo Score: ' + careerStats.allTimeTopComboScore,
                'Favorite Map: ' + (fav || 'None'),
                'Favorite Vehicle: ' + (favV || 'None'),
                'Improving: ' + (trend ? (trend.improving ? 'Yes' : 'No') : 'Not enough data')
            ];
            return lines.join('\n');
        }

        function getPlaytimeBreakdown() {
            var total = careerStats.totalPlayTimeMs;
            if (total === 0) return { race: 0, menu: 0, upgrade: 0, other: 0 };
            return {
                race: Math.round(total * 0.65),
                menu: Math.round(total * 0.15),
                upgrade: Math.round(total * 0.12),
                other: Math.round(total * 0.08)
            };
        }

        function loadFromSave(savedStats) {
            if (savedStats) {
                Object.assign(careerStats, savedStats);
            }
        }

        function getSaveableStats() {
            return JSON.parse(JSON.stringify(careerStats));
        }

        return {
            careerStats: careerStats,
            currentSession: currentSession,
            startSession: startSession,
            endSession: endSession,
            recordEvent: recordEvent,
            recordHeatMapVisit: recordHeatMapVisit,
            getHeatMapForMap: getHeatMapForMap,
            getFavoritemap: getFavoritemap,
            getFavoriteVehicle: getFavoriteVehicle,
            isPlayerImproving: isPlayerImproving,
            exportStatisticsJSON: exportStatisticsJSON,
            generateHumanReadableSummary: generateHumanReadableSummary,
            getPlaytimeBreakdown: getPlaytimeBreakdown,
            loadFromSave: loadFromSave,
            getSaveableStats: getSaveableStats
        };
    })();

    if (typeof window !== 'undefined') window.STATISTICS_ENGINE = STATISTICS_ENGINE;
    if (typeof module !== 'undefined' && module.exports) module.exports.STATISTICS_ENGINE = STATISTICS_ENGINE;
})();


// ================================================================
// SAVEDATA_MIGRATION_ENGINE — Versioned save migration system
// ================================================================
const SAVEDATA_MIGRATION_ENGINE = (() => {
  const MIGRATIONS = [];

  function register(fromVersion, toVersion, migrateFn) {
    MIGRATIONS.push({ from: fromVersion, to: toVersion, fn: migrateFn });
    MIGRATIONS.sort((a,b) => a.from - b.from);
  }

  function migrate(saveObj, targetVersion) {
    let current = { ...saveObj };
    let ver = current._version || 1;
    while (ver < targetVersion) {
      const m = MIGRATIONS.find(m => m.from === ver);
      if (!m) { ver++; continue; }
      try { current = m.fn(current); }
      catch(e) { console.warn(`Migration ${ver}→${m.to} failed:`, e); }
      ver = m.to;
    }
    current._version = targetVersion;
    return current;
  }

  // Register known migrations
  register(1, 2, s => ({ ...s, diamonds: s.diamonds || 0, ownedVehicles: s.ownedVehicles || ['jeep'] }));
  register(2, 3, s => ({ ...s, achievements: s.achievements || [], xp: s.xp || 0, level: s.level || 1 }));
  register(3, 4, s => ({
    ...s,
    battlePass: s.battlePass || { season:1, tier:0, xp:0, premium:false, claimed:[] },
    customizations: s.customizations || {},
    statistics: s.statistics || { totalDistance:0, totalCoins:0, totalFlips:0, totalRuns:0 }
  }));

  function validate(saveObj) {
    const errors = [];
    if (typeof saveObj !== 'object') errors.push('Not an object');
    if (saveObj.gold < 0) errors.push('Negative gold');
    if (saveObj.diamonds < 0) errors.push('Negative diamonds');
    if (!Array.isArray(saveObj.ownedVehicles)) errors.push('ownedVehicles not array');
    return { valid: errors.length === 0, errors };
  }

  function repair(saveObj) {
    const s = { ...saveObj };
    if (s.gold < 0 || isNaN(s.gold)) s.gold = 0;
    if (s.diamonds < 0 || isNaN(s.diamonds)) s.diamonds = 0;
    if (!Array.isArray(s.ownedVehicles)) s.ownedVehicles = ['jeep'];
    if (!s.ownedVehicles.includes('jeep')) s.ownedVehicles.unshift('jeep');
    if (typeof s.level !== 'number' || s.level < 1) s.level = 1;
    return s;
  }

  return { register, migrate, validate, repair };
})();

// ================================================================
// SAVEDATA_BACKUP_SYSTEM — Local backup management
// ================================================================
const SAVEDATA_BACKUP_SYSTEM = (() => {
  const BACKUP_KEY_PREFIX = 'ahmet_backup_';
  const MAX_BACKUPS = 5;

  function createBackup(saveData) {
    try {
      const backups = listBackups();
      const ts = Date.now();
      const key = BACKUP_KEY_PREFIX + ts;
      localStorage.setItem(key, JSON.stringify({ data: saveData, ts, version: saveData._version || 1 }));
      // Purge oldest if over limit
      if (backups.length >= MAX_BACKUPS) {
        const oldest = backups[0];
        localStorage.removeItem(BACKUP_KEY_PREFIX + oldest.ts);
      }
      return key;
    } catch(e) { return null; }
  }

  function listBackups() {
    const result = [];
    try {
      for (let i=0; i<localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(BACKUP_KEY_PREFIX)) {
          const ts = parseInt(k.replace(BACKUP_KEY_PREFIX,''));
          result.push({ key: k, ts, date: new Date(ts).toISOString() });
        }
      }
    } catch(e) {}
    return result.sort((a,b) => a.ts - b.ts);
  }

  function restoreBackup(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw).data;
    } catch(e) { return null; }
  }

  function deleteBackup(key) {
    try { localStorage.removeItem(key); return true; } catch(e) { return false; }
  }

  function getLatest() {
    const list = listBackups();
    if (!list.length) return null;
    return restoreBackup(list[list.length-1].key);
  }

  function autoBackupIfNeeded(saveData, intervalMs) {
    const list = listBackups();
    const now = Date.now();
    const iv = intervalMs || 5*60*1000; // 5 minutes default
    if (!list.length || now - list[list.length-1].ts > iv) {
      return createBackup(saveData);
    }
    return null;
  }

  return { createBackup, listBackups, restoreBackup, deleteBackup, getLatest, autoBackupIfNeeded, MAX_BACKUPS };
})();

// ================================================================
// SAVEDATA_EXPORT_IMPORT — Portable save data format
// ================================================================
const SAVEDATA_EXPORT_IMPORT = (() => {
  const MAGIC = 'AHMETSAVE';
  const VERSION = 1;

  function exportToString(saveData) {
    try {
      const payload = { magic: MAGIC, version: VERSION, ts: Date.now(), data: saveData };
      const json = JSON.stringify(payload);
      return btoa(json);
    } catch(e) { return null; }
  }

  function importFromString(str) {
    try {
      const json = atob(str);
      const payload = JSON.parse(json);
      if (payload.magic !== MAGIC) throw new Error('Invalid magic');
      if (payload.version > VERSION) throw new Error('Future version');
      return { ok: true, data: payload.data, ts: payload.ts };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }

  function generateShareURL(saveData, baseURL) {
    const code = exportToString(saveData);
    if (!code) return null;
    return `${baseURL||''}?save=${encodeURIComponent(code)}`;
  }

  function copyToClipboard(saveData) {
    const str = exportToString(saveData);
    if (!str) return false;
    try {
      navigator.clipboard.writeText(str);
      return true;
    } catch(e) {
      // Fallback
      const el = document.createElement('textarea');
      el.value = str;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    }
  }

  function estimateSize(saveData) {
    try { return JSON.stringify(saveData).length; } catch(e) { return 0; }
  }

  return { exportToString, importFromString, generateShareURL, copyToClipboard, estimateSize };
})();

// ================================================================
// SAVEDATA_LEADERBOARD_CACHE — Local cache for leaderboard data
// ================================================================
const SAVEDATA_LEADERBOARD_CACHE = (() => {
  const CACHE_KEY = 'ahmet_lb_cache';
  const TTL_MS = 5 * 60 * 1000; // 5 minutes

  function _load() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e) { return {}; }
  }

  function _save(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  function set(boardId, entries) {
    const cache = _load();
    cache[boardId] = { entries, ts: Date.now() };
    _save(cache);
  }

  function get(boardId) {
    const cache = _load();
    const entry = cache[boardId];
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL_MS) return null; // expired
    return entry.entries;
  }

  function invalidate(boardId) {
    const cache = _load();
    if (boardId) delete cache[boardId];
    else Object.keys(cache).forEach(k => delete cache[k]);
    _save(cache);
  }

  function isStale(boardId) {
    const cache = _load();
    const entry = cache[boardId];
    return !entry || Date.now() - entry.ts > TTL_MS;
  }

  return { set, get, invalidate, isStale, TTL_MS };
})();


// ================================================================
// SAVEDATA_ANALYTICS — Player behaviour analytics
// ================================================================
const SAVEDATA_ANALYTICS = (() => {
  const LS_KEY = 'ahmet_analytics_v1';

  function load() { try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}');}catch(e){return {};} }
  function save(d){ try{localStorage.setItem(LS_KEY,JSON.stringify(d));}catch(e){} }

  function record(eventName, data) {
    const db  = load();
    if (!db.events) db.events = [];
    db.events.push({ e:eventName, d:data, t:Date.now() });
    if (db.events.length > 500) db.events = db.events.slice(-400);
    save(db);
  }

  function getEvents(name, limit) {
    const db = load();
    let ev = (db.events||[]);
    if (name) ev = ev.filter(e=>e.e===name);
    return ev.slice(-(limit||50));
  }

  function getSummary() {
    const db  = load();
    const ev  = db.events||[];
    const map = {};
    for (const e of ev) { map[e.e]=(map[e.e]||0)+1; }
    return { totalEvents:ev.length, byType:map, oldest:ev[0]?.t, newest:ev[ev.length-1]?.t };
  }

  function clearOlderThan(ms) {
    const db  = load();
    const cutoff = Date.now()-ms;
    db.events = (db.events||[]).filter(e=>e.t>cutoff);
    save(db);
  }

  // Convenience
  function trackRaceStart(map,vehicle){ record('race_start',{map,vehicle}); }
  function trackRaceEnd(map,dist,coins,won){ record('race_end',{map,dist,coins,won}); }
  function trackPurchase(item,price,currency){ record('purchase',{item,price,currency}); }
  function trackLogin(){ record('login',{day:new Date().toISOString().slice(0,10)}); }
  function trackAchievement(id){ record('achievement',{id}); }
  function trackCrash(map,speed){ record('crash',{map,speed}); }
  function trackUpgrade(vehicle,part,level){ record('upgrade',{vehicle,part,level}); }
  function trackSessionEnd(durationS){ record('session_end',{dur:durationS}); }

  return { record, getEvents, getSummary, clearOlderThan, trackRaceStart, trackRaceEnd, trackPurchase, trackLogin, trackAchievement, trackCrash, trackUpgrade, trackSessionEnd };
})();

// ================================================================
// SAVEDATA_SCHEMA_V5 — Next-generation save format definition
// ================================================================
const SAVEDATA_SCHEMA_V5 = (() => {
  const VERSION = 5;
  const DEFAULTS = {
    version:        VERSION,
    playerId:       '',
    playerName:     'Player',
    createdAt:      0,
    lastSaved:      0,

    // Currency
    coins:          0,
    gems:           0,
    fuel:           50,
    maxFuel:        50,

    // Level
    xp:             0,
    level:          1,
    prestige:       0,

    // Vehicles
    vehicles:       ['jeep'],
    selectedVehicle:'jeep',
    vehicleUpgrades:{},
    vehicleSkins:   {},
    vehicleParts:   {},

    // Maps
    unlockedMaps:   ['hill_1'],
    completedMaps:  {},
    mapStars:       {},
    mapHighscores:  {},

    // Achievements
    unlockedAchievements: [],
    achievementProgress:  {},
    claimedAchievements:  [],

    // Battle Pass
    bpSeason:       1,
    bpXp:           0,
    bpTier:         0,
    bpPremium:      false,
    bpClaimedTiers: [],

    // Economy
    totalCoinsEarned: 0,
    totalGemsEarned:  0,
    totalCoinsSpent:  0,
    totalGemsSpent:   0,
    chestInventory:   [],
    craftingMaterials:{},

    // Stats
    totalDistance:  0,
    totalRaces:     0,
    totalWins:      0,
    totalFlips:     0,
    totalCrashes:   0,
    bestDistance:   0,
    bestFlips:      0,
    longestJump:    0,
    highestSpeed:   0,
    totalPlayTimeS: 0,

    // Social
    friendIds:      [],
    blockedIds:     [],
    teamId:         null,

    // Settings (mirror of in-game settings)
    settings: {
      sfxVolume:    0.8,
      musicVolume:  0.6,
      graphics:     'auto',
      showFPS:      false,
      haptics:      true,
      language:     'en',
      controlScheme:'tilt',
      theme:        'dark_gold',
    },

    // Daily
    lastLoginDay:   '',
    loginStreak:    0,
    dailyMissionsCompleted: [],
    weeklyMissionsCompleted:[],

    // Misc
    tutorialComplete: false,
    adsRemoved:       false,
    vipExpiry:        0,
    notifications:    [],
  };

  // BUGFIX(21 Tmz #15): `{...DEFAULTS}` SIĞ kopyadır — iç içe nesne/diziler (vehicleUpgrades,
  // vehicles, settings…) PAYLAŞILAN REFERANSTIR. Bir kaydı değiştirmek DEFAULTS'ı ve
  // dolayısıyla sonraki TÜM kayıtları kirletiyordu. Artık derin kopya alınıyor.
  function _freshDefaults() { return JSON.parse(JSON.stringify(DEFAULTS)); }

  function create(playerId, name) {
    const id = playerId || ('p_' + Date.now().toString(36));
    return { ..._freshDefaults(), playerId:id, playerName:name||'Player', createdAt:Date.now(), lastSaved:Date.now() };
  }

  function validate(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.playerId) return false;
    if (!data.version)  return false;
    return true;
  }

  function migrate(data) {
    if (!data) return create();
    const d = { ..._freshDefaults(), ...data, version:VERSION };   // BUGFIX(21 Tmz #15)
    // v4 → v5: move vehicleUpgrades to nested object
    if (data.version < 5 && data.upgrades) {
      d.vehicleUpgrades = d.vehicleUpgrades || {};
      for (const [k,v] of Object.entries(data.upgrades)) {
        const [vehicle,...parts] = k.split('_');
        if (!d.vehicleUpgrades[vehicle]) d.vehicleUpgrades[vehicle]={};
        d.vehicleUpgrades[vehicle][parts.join('_')] = v;
      }
    }
    d.lastSaved = Date.now();
    return d;
  }

  function diff(a, b) {
    const changed = [];
    for (const k of Object.keys(DEFAULTS)) {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) changed.push(k);
    }
    return changed;
  }

  return { VERSION, DEFAULTS, create, validate, migrate, diff };
})();

// ================================================================
// SAVEDATA_CLOUD_SYNC_V2 — Improved cloud sync stub with conflict resolution
// ================================================================
const SAVEDATA_CLOUD_SYNC_V2 = (() => {
  const LS_PENDING = 'ahmet_sync_pending';
  const LS_LAST    = 'ahmet_sync_last';
  let   _isSyncing = false;
  let   _lastSyncAt= 0;
  const SYNC_INTERVAL_MS = 60000; // 1 minute minimum between syncs

  function markDirty(fields) {
    const p = getPending();
    p.fields = [...new Set([...(p.fields||[]), ...(fields||[])])];
    p.dirtyAt = Date.now();
    savePending(p);
  }

  function getPending()    { try{return JSON.parse(localStorage.getItem(LS_PENDING)||'{}');}catch(e){return {};} }
  function savePending(p)  { try{localStorage.setItem(LS_PENDING,JSON.stringify(p));}catch(e){} }
  function clearPending()  { localStorage.removeItem(LS_PENDING); }
  function getLastSync()   { return parseInt(localStorage.getItem(LS_LAST)||'0'); }
  function setLastSync(t)  { localStorage.setItem(LS_LAST, String(t||Date.now())); }

  function isDirty()       { return !!(getPending().dirtyAt); }
  function isSyncing()     { return _isSyncing; }
  function canSync()       { return !_isSyncing && (Date.now()-_lastSyncAt) >= SYNC_INTERVAL_MS; }

  // Conflict resolution: server wins on currency/unlocks, local wins on settings/UI
  function resolve(local, server) {
    if (!server) return local;
    if (!local)  return server;
    const serverTs = server.lastSaved||0;
    const localTs  = local.lastSaved||0;
    // Use server as base, but take local settings and offline progress
    const merged = { ...server };
    // Local wins: settings
    merged.settings      = local.settings || server.settings;
    // Take max: cumulative stats
    for (const k of ['coins','gems','xp','level','totalDistance','totalRaces','totalWins','totalFlips']) {
      merged[k] = Math.max(server[k]||0, local[k]||0);
    }
    // Merge arrays: union
    for (const k of ['vehicles','unlockedMaps','unlockedAchievements','claimedAchievements','bpClaimedTiers']) {
      merged[k] = [...new Set([...(server[k]||[]), ...(local[k]||[])])];
    }
    // Take best scores
    for (const [mapId, score] of Object.entries(local.mapHighscores||{})) {
      if (!merged.mapHighscores) merged.mapHighscores = {};
      merged.mapHighscores[mapId] = Math.max(merged.mapHighscores[mapId]||0, score);
    }
    merged.lastSaved = Date.now();
    return merged;
  }

  async function sync(localData, fetchFn, pushFn) {
    if (!canSync()) return { ok:false, reason:'too_soon' };
    _isSyncing = true;
    try {
      let serverData = null;
      if (fetchFn) {
        try { serverData = await fetchFn(localData.playerId); } catch(e){}
      }
      const merged = resolve(localData, serverData);
      if (pushFn) {
        try { await pushFn(merged); } catch(e){}
      }
      _lastSyncAt = Date.now();
      setLastSync(_lastSyncAt);
      clearPending();
      return { ok:true, merged };
    } finally { _isSyncing = false; }
  }

  function getStatus() {
    const last = getLastSync();
    return {
      isDirty:   isDirty(),
      isSyncing: _isSyncing,
      lastSyncAt: last,
      lastSyncAgo: last ? Math.round((Date.now()-last)/1000)+'s ago' : 'never',
      pendingFields: getPending().fields||[],
    };
  }

  return { markDirty, getPending, clearPending, isDirty, isSyncing, canSync, resolve, sync, getStatus };
})();
