'use strict';
// ── Bot AI ────────────────────────────────────────────────────────────────
const Bot = {
  vehicle: null,
  active: false,
  targetVx: 0,
  driftTimer: 0,
  driftDir: 0,

  level: 1,
  init(terrain, startX, startY, mapId) {
    // Bot seviyesi 1–20 (SaveData'da; elle [harita/ayarlar] veya kazandıkça ayarlanır).
    const lvl = this.level = Math.max(1, Math.min(20,
      (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('botLevel') || 1) : 1));
    this._lvl = lvl;
    // ── Araç tier'ı + tier içi yükseltme (tier SONUNDA yükseltme = 20 = FULL) ──
    //  Lv1-5  → JEEP    (Lv5'te tam yükseltme)
    //  Lv6-10 → RALLY   (Lv10'da tam yükseltme)
    //  Lv11-20→ FORMULA (Lv20'de tam yükseltme, MOD full)
    let vehId, up;
    if (lvl <= 5)       { vehId = 'jeep';     up = Math.round(4 + (lvl - 1)  / 4 * 16); }
    else if (lvl <= 10) { vehId = 'rallycar'; up = Math.round(4 + (lvl - 6)  / 4 * 16); }
    else                { vehId = 'formula';  up = Math.round(4 + (lvl - 11) / 9 * 16); }
    up = Math.max(1, Math.min(20, up));
    // Yükseltme tavanı 20 → 50 oldu. Yukarıdaki formül eski 4..20 ölçeğinde yazılmış
    // ("tier sonunda 20 = FULL"). Aynı BOT GÜCÜNÜ korumak için güç eşdeğerine taşı:
    // yeni = 1 + (eski-1) × 49/19  (eski 20 → yeni 50 = tam güç). Çevrilmezse botlar
    // tavanın ~%39'una düşer, yani yarışlar kolaylaşırdı.
    up = Math.max(1, Math.min(50, Math.round(1 + (up - 1) * (49 / 19))));
    const botCfg = buildVehicleConfig(vehId, { engine:up, suspension:up, tires:up, fuel:up });
    this.vehicle = Physics.createVehicle(startX - 60, startY, botCfg);
    // Hedef hız: aracın KENDİ max hızı × seviye agresifliği → araç + yükseltme belirler
    const aggr = 0.80 + lvl * 0.013;   // Lv1:0.81 → Lv20:1.06
    const _dda = (typeof DDA !== 'undefined') ? DDA.getBotBonus() : 1;
    this.targetVx = (botCfg.maxSpeed || 200) * aggr * _dda;
    this.vehicle.color = (vehId === 'formula') ? '#FFD700' : (vehId === 'rallycar') ? '#B026FF' : '#FF3D00';
    this.vehicleId = vehId;
    this.upLevel = up;
    this.active = true;
    this.driftTimer = 0;
    if (typeof UI !== 'undefined' && UI.showToast) {
      const _vn = (vehId === 'formula') ? 'Formula' : (vehId === 'rallycar') ? 'Rally' : 'Jeep';
      UI.showToast('🤖 Bot SEVİYE ' + lvl + ' — ' + _vn + ' (yükseltme ' + up + ')' + (lvl >= 20 ? ' ⚡YENİLMEZ' : ''));
    }
  },

  update(dt, terrain) {
    if (!this.active || !this.vehicle) return;
    const v = this.vehicle;
    if (v.dead) { this.active = false; return; }

    // Simple AI: throttle to target speed, small random drift in air
    this.driftTimer -= dt;
    if (this.driftTimer <= 0) {
      this.driftDir = (Math.random() - 0.5) * 0.5;
      this.driftTimer = 0.8 + Math.random() * 1.2;
    }

    const lvl = this._lvl || 1;
    // AI gücü seviyeyle ARTAR: yüksek seviye hızı korur (gaz kesmez), erken nitro, havada kontrollü
    v.throttle = v.vx < this.targetVx ? 1 : (0.30 + Math.min(0.65, lvl * 0.035));  // Lv1:~0.34 → Lv20:~0.95
    v.brake    = (v.vx < 0) ? 1 : 0;
    // Nitro: Lv4+ botlar hedef hızın altındayken yerde boost kullanır
    if (lvl >= 4 && v.boostFuel > 12 && v.onGround && v.vx < this.targetVx * 0.9) v.boostActive = true;
    else v.boostActive = false;
    // Havada: seviye arttıkça daha kontrollü (az drift → takla/ölüm riski düşer)
    if (!v.onGround) v.angularVel += this.driftDir * dt * Math.max(0.1, 1 - lvl * 0.045);

    Physics.step(v, terrain, dt);
  },

  getDistanceDiff(playerX, startX) {
    if (!this.vehicle) return 0;
    return (this.vehicle.x - startX) - (playerX - startX);
  },

  reset() { this.vehicle = null; this.active = false; }
};

// ── Parts State ───────────────────────────────────────────────────────────
const Parts = {
  // Nitro
  nitroCooldown: 0,
  nitroActive: false,
  nitroFuel: 100,
  nitroDuration: 0,
  NITRO_DURATION: 2.0,
  NITRO_COOLDOWN: 15.0,

  // Wing
  wingActive: false,

  // Spring
  springCharged: true,
  springCooldown: 0,
  SPRING_COOLDOWN: 4.0,

  // Landing boost — triggered automatically on landing
  landingBoostCooldown: 0,
  LANDING_BOOST_COOLDOWN: 3.0,

  reset(equipped) {
    this.nitroCooldown  = 0;
    this.nitroActive    = false;
    this.nitroFuel      = 100;
    this.nitroDuration  = 0;
    this.springCharged  = true;
    this.springCooldown = 0;
    this.landingBoostCooldown = 0;
    this._equipped = equipped || [];
    // Yeni parçalar
    this._startBoostT   = 1.6;   // başlama boostu süresi
    this._turboApplied  = false;
    this._rollCageUsed  = false;
  },

  has(partId) { return (this._equipped||[]).includes(partId); },

  activateNitro() {
    if (!this.has('nitro')) return false;
    if (this.nitroCooldown > 0) return false;
    if (this.nitroActive) return false;
    // Nitro BEDAVA DEĞİL: kalıcı depodan %25 harca. Depo boşsa çalışmaz.
    if (typeof SaveData !== 'undefined' && SaveData.useNitroCharge) {
      if (!SaveData.useNitroCharge()) {
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('⚡ Nitro deposu boş — Garaj’dan doldur (10.000 → %25)');
        return false;
      }
    }
    this.nitroActive   = true;
    this.nitroDuration = 0;
    this.nitroFuel     = 100;
    if (typeof Audio !== 'undefined' && Audio.playNitro) Audio.playNitro();
    return true;
  },

  update(v, dt) {
    const equipped = this._equipped || [];

    // ── Nitro ──
    if (this.has('nitro') && this.nitroActive) {
      this.nitroDuration += dt;
      v.vx += 350 * dt;
      v.vx = Math.min(v.vx, v.maxSpeed * 1.6);
      this.nitroFuel = Math.max(0, 100 - (this.nitroDuration / this.NITRO_DURATION) * 100);
      if (this.nitroDuration >= this.NITRO_DURATION) {
        this.nitroActive   = false;
        this.nitroCooldown = this.NITRO_COOLDOWN;
      }
    }
    if (this.nitroCooldown > 0) this.nitroCooldown -= dt;

    // Parça gücü çarpanı (seviyeye göre: 1.0x → 2.0x)
    var _pw = function(id){ return (typeof Economy!=='undefined' && Economy.getPartPower) ? Economy.getPartPower(id) : 1; };

    // ── Wing — reduces gravity effect in air ──
    // Havaya çıktıktan 1.5 sn SONRA devreye girer (hemen değil).
    if (this.has('wing') && !v.onGround && v.airTime >= 1.5) {
      v.vy -= 260 * _pw('wing') * dt;  // seviye arttıkça düşüşü daha çok yavaşlatır
      // slight air steering
      if (v.throttle) v.vx += 30 * _pw('wing') * dt;
    }

    // ── Spring — fires on landing ──
    if (this.has('spring')) {
      if (this.springCooldown > 0) this.springCooldown -= dt;
      else this.springCharged = true;

      if (v.onGround && this.springCharged && v.airTime > 0.15) {
        v.vy  = -520 * _pw('spring');   // seviye arttıkça daha yüksek sıçrama
        v.angularVel -= 2.0;
        this.springCharged  = false;
        this.springCooldown = this.SPRING_COOLDOWN;
        if (typeof Audio !== 'undefined' && Audio.playSpring) Audio.playSpring();
      }
    }

    // ── Landing boost — fires on landing ──
    if (this.has('landing_boost')) {
      if (this.landingBoostCooldown > 0) this.landingBoostCooldown -= dt;
      if (v.onGround && v.airTime > 0.3 && this.landingBoostCooldown <= 0) {
        v.vx += 120 * _pw('landing_boost');
        this.landingBoostCooldown = this.LANDING_BOOST_COOLDOWN;
        if (typeof Audio !== 'undefined' && Audio.playBoost) Audio.playBoost();
      }
    }

    // ── START BOOST — yarış başında güçlü ivme (ilk ~1.6 sn) ──
    if (this.has('start_boost') && this._startBoostT > 0) {
      v.vx += 520 * _pw('start_boost') * dt;
      this._startBoostT -= dt;
      if (v.boostActive !== undefined) v.boostActive = true;
    }

    // ── TURBO — maks hızı %15 artır (tur boyunca, bir kez uygula) ──
    if (this.has('turbo') && !this._turboApplied && v.maxSpeed) {
      v.maxSpeed *= 1.15 * Math.max(1, _pw('turbo'));
      this._turboApplied = true;
    }

    // ── AIR MASTER — havada dönüş kontrolünü güçlendir (fizik okur) ──
    v._airMul = this.has('air_master') ? (1.6 * _pw('air_master')) : 1;

    // ── COIN MAGNET — yakın altınları araca çek ──
    if (this.has('coin_magnet') && typeof Game !== 'undefined' && Game.terrain) {
      var _objs = Game.terrain.objects || [];
      var _r = 260 * _pw('coin_magnet');
      for (var _i = 0; _i < _objs.length; _i++) {
        var _o = _objs[_i];
        if (_o.collected || _o.type !== 'coin') continue;
        if (Math.abs(_o.x - v.x) > _r + 40) continue;
        var _dx = v.x - _o.x, _dy = (v.y - 30) - _o.y, _d = Math.hypot(_dx, _dy) || 1;
        if (_d < _r) { var _s = Math.min(1, 440 * dt / _d); _o.x += _dx * _s; _o.y += _dy * _s; }
      }
    }
  }
};

// ── Main Game Object ──────────────────────────────────────────────────────
const Game = {
  state:      'idle',
  vehicle:    null,
  vehicleId:  'jeep',
  mapId:      'countryside',
  terrain:    null,
  coinsCollected: 0,
  runFlips:   0,
  maxAirTime: 0,
  startX:     0,
  lastFlipCount: 0,
  controlState: { throttle:0, brake:0, boost:0 },
  touchIds:   { left:null, right:null, nitro:null },
  canvas:     null,
  botRaceMode: false,

  init(canvas) {
    this.canvas = canvas;
    this._bindControls();
  },

  // 📷 Ekran görüntüsü kaydet (paylaşım için)
  _screenshot() {
    try {
      const a = document.createElement('a');
      a.download = 'ahmet_' + Date.now() + '.png';
      a.href = this.canvas.toDataURL('image/png');
      a.click();
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('📷 Görüntü kaydedildi');
    } catch (err) {}
  },

  startRun(vehicleId, mapId, botMode) {
    this.vehicleId   = vehicleId;
    this.mapId       = mapId;
    this.gameMode    = this.gameMode || 'normal';
    this.botRaceMode = !!botMode || (this.gameMode === 'race');
    this.coinsCollected = 0;
    this.runFlips    = 0;
    this.maxAirTime  = 0;
    this.lastFlipCount = 0;
    this._missDist   = 0;
    this._airFlips   = 0;
    this._nextMile   = 0;
    HUD.newRecord    = false;

    this.terrain = Terrain.generate(mapId, Math.floor(Math.random() * 9999));

    const upgrades = SaveData.get('upgrades')[vehicleId] || { engine:1,suspension:1,tires:1,fuel:1 };
    const cfg = buildVehicleConfig(vehicleId, upgrades);
    const startGroundY = this.terrain.getYAt(200);
    const startY = startGroundY - (cfg.h || 50) - 10;
    this.vehicle = Physics.createVehicle(200, startY, cfg);
    this.startX  = this.vehicle.x;

    // ── MapSettings per-map araç ayarları (kütle/tutuş/boost/süspansiyon) ──
    {
      const v = this.vehicle;
      const _massMult  = (typeof MapSettings !== 'undefined' ? MapSettings.massMult(mapId)       : 1);
      const _gripMult  = (typeof MapSettings !== 'undefined' ? MapSettings.gripMult(mapId)       : 1);
      const _boostMult = (typeof MapSettings !== 'undefined' ? MapSettings.boostMult(mapId)      : 1);
      const _stiffMult = (typeof MapSettings !== 'undefined' ? MapSettings.suspStiffMult(mapId)  : 1);
      const _dampMult  = (typeof MapSettings !== 'undefined' ? MapSettings.suspDampMult(mapId)   : 1);
      if (v.mass) v.mass *= _massMult;
      if (v.wheels) v.wheels.forEach(w => { w.suspStiffness *= _stiffMult; w.suspDamping *= _dampMult; });
      // 🔴 BUGFIX(28 Tmz): ÜZERİNE YAZMA — ÇARP.
      //   Eskiden `v._gripMul = _gripMult` idi; bu, araçtan gelen tutuş
      //   (lastik yükseltmesi + Derin Garaj ayarı) değerini SİLİYORDU.
      //   Artık harita çarpanı araç çarpanının ÜSTÜNE biniyor.
      v._gripMul  = (v._gripMul || 1) * _gripMult;
      v._boostMul = (v._boostMul || 1) * _boostMult;   // aynı gerekçe: üzerine yazma, çarp
    }

    // Parts
    const equipped = SaveData.get('equippedParts') || [];
    Parts.reset(equipped);
    // FUEL TANK parçası: +%30 yakıt kapasitesi (mod kurulumundan önce uygulanır)
    if (Parts.has && Parts.has('fuel_tank') && this.vehicle && this.vehicle.fuelMax) {
      this.vehicle.fuelMax = Math.round(this.vehicle.fuelMax * 1.3);
      this.vehicle.fuel = this.vehicle.fuelMax;
    }

    // Bot
    Bot.reset();
    if (this.botRaceMode) {
      Bot.init(this.terrain, 200, startY, mapId);
    }

    // Ray-loop durumunu sıfırla
    if (typeof Loops !== 'undefined') Loops.reset();

    // Ortam (gece/gündüz, hava, engel, afet) kurulumu
    if (typeof Environment !== 'undefined') Environment.init(mapId, this.terrain);

    // Oyun modu (race/timetrial/survival/boss) kurulumu
    if (typeof GameModes !== 'undefined') { GameModes.setMode(this.gameMode || 'normal'); GameModes.init(mapId, this.terrain, this.vehicle); }

    Camera.snapTo(this.vehicle);
    Audio.resume();
    Audio.startEngine(vehicleId);
    Audio.playBGM(mapId);
    Particles.init();
    if (typeof Replay !== 'undefined' && Replay.reset) Replay.reset();               // yeni koşu → replay kaydı sıfırla
    if (typeof DynamicAudio !== 'undefined' && DynamicAudio.onRunStart) DynamicAudio.onRunStart();

    this.state = 'playing';
    SaveData.data.gamesPlayed = (SaveData.data.gamesPlayed || 0) + 1;

    // İlk-oyun rehberi (tutorial) — ayar açık ve daha önce görülmediyse
    this._tutorialActive = ((typeof Settings === 'undefined') || Settings.get('tutorial') !== false) && !SaveData.get('tutorialSeen');
    this._tutorialT = 0;

    // Başlangıç geri sayımı (3-2-1-GO) — kontroller kilitli, araç yere oturur
    this._countdown = 3.2;
    this._phoenixUsed = false;   // Phoenix Revive bu turda kullanıldı mı

    // ── PERF(31 Tmz): admin kipi koşu BAŞINDA bir kez okunur ────────────────
    // 🔴 `update()` her karede `localStorage.getItem('ahmet_admin_mode')`
    //    çağırıyordu. `localStorage` SENKRONDUR — okuma da ana iş parçacığını
    //    durdurur (29 Tmz'de YAZMA tarafı bu yüzden geciktirilmişti, OKUMA
    //    gözden kaçmış). Admin kipi koşu ortasında değiştirilemez (ayar ekranı
    //    yalnız menüde açılır) → koşu başında okumak aynı sonucu verir.
    this._adminMode = this._adminOku();

    // Hot Wheels özellik bayrakları da koşu başında bir kez okunur (aşağıya bak).
    this._hwFeat = null;
    // Mıknatıs yarıçapı (harita ayarı) — koşu boyunca sabit, bir kez okunur.
    this._magnetR = undefined;
  },

  // Admin kipi (kullanıcının kendi hesabı) — koşu başında bir kez değerlendirilir.
  _ADMIN_MAILS: ['61burada@gmail.com', 'coderhako@gmail.com'],
  _adminOku() {
    try {
      const _am = localStorage.getItem('ahmet_admin_mode');
      return !!(_am && this._ADMIN_MAILS.indexOf(_am) >= 0);
    } catch (e) { return false; }
  },

  update(dt) {
    if (this.state !== 'playing') return;
    const v = this.vehicle;
    if (!v) return;

    // ── Başlangıç geri sayımı: kontroller kilitli, araç yere oturur, süre başlamaz ──
    if (this._countdown > 0) {
      const _prevC = Math.ceil(this._countdown - 0.2);
      this._countdown -= dt;
      const _nowC = Math.ceil(this._countdown - 0.2);
      if (_nowC < _prevC && _nowC >= 1 && Audio.playCountdownBeep) Audio.playCountdownBeep();   // 3-2-1 bip
      v.throttle = 0; v.brake = 0; v.boostActive = false;
      Physics.step(v, this.terrain, dt);   // yere otursun ama sürülmesin
      Camera.follow(v, dt);
      if (this._countdown <= 0) { this._goFlash = 0.7; if (Audio.playGo) Audio.playGo(); else if (Audio.playBoost) Audio.playBoost(); }   // GO!
      return;
    }
    if (this._goFlash > 0) this._goFlash -= dt;

    // Ağır çekim (büyük takla anında) — zamanı yavaşlat
    if (this._slowmo > 0) { this._slowmo = Math.max(0, this._slowmo - dt); dt *= 0.35; }

    // İlk-oyun rehberi süresi (14 sn sonra bir daha gösterme)
    if (this._tutorialActive) {
      this._tutorialT = (this._tutorialT || 0) + dt;
      if (this._tutorialT > 14) { this._tutorialActive = false; SaveData.set('tutorialSeen', true); }
    }

    v.throttle = this.controlState.throttle;
    v.brake    = this.controlState.brake;

    // ── NITRO / TURBO BOOST (manuel, her araçta) ──────────────────────────
    // Fizik motoru boost itişini + 1.5x tavanı + yakıt tüketimini yapar (boostActive iken).
    // Burada sadece butondan aktive ediyoruz ve boost yokken yakıtı yeniliyoruz.
    if (v.boostFuel === undefined) v.boostFuel = (v.boostMax || 140);
    const _wantBoost = this.controlState.boost === 1 && v.boostFuel > 0 && !v.dead;
    if (_wantBoost) {
      if (!v.boostActive) { if (Audio.playBoost) Audio.playBoost(); if (typeof Missions !== 'undefined') Missions.add('boost', 1); }
      v.boostActive = true;
    } else {
      v.boostActive = false;
      // 🔴 DEĞİŞİKLİK(28 Tmz) — NİTRO ARTIK KENDİLİĞİNDEN DOLMUYOR.
      //   Eskiden yerdeyken saniyede 16 birim kendiliğinden doluyordu
      //   (`v.boostFuel += 16 * dt`). Bu, nitroyu sınırsız hâle getiriyor ve
      //   satın alınan nitro deposu sistemini (SaveData.NITRO_COST = 10.000
      //   altın / %25) anlamsız kılıyordu.
      //   ▶ Artık koşu başındaki dolu depo tükenince biter; yenilemek için
      //     garajdan nitro alınır ya da sonraki koşuda yeniden dolu başlanır.
    }

    // Parts effects (before physics step)
    Parts.update(v, dt);

    // Hot Wheels RAY-LOOP: raydayken normal fizik yerine loop güncellemesi çalışır
    if (typeof Loops !== 'undefined' && Loops.onRail) {
      Loops.update(v, dt);
    } else {
      Physics.step(v, this.terrain, dt);
      if (typeof Loops !== 'undefined') Loops.check(v, this.terrain);
    }
    if (typeof Replay !== 'undefined' && Replay.record) Replay.record(v, dt);   // koşuyu replay için kaydet
    // Admin modu: yakıt hiç bitmesin
    // PERF(31 Tmz): değer artık `start()`'ta bir kez okunuyor (senkron
    //   localStorage okuması sıcak döngüden çıkarıldı). Eski davranışla aynı;
    //   `_adminMode` tanımsızsa (koşu start() dışından kurulduysa) yerinde okur.
    if (this._adminMode === undefined) this._adminMode = this._adminOku();
    if (this._adminMode) {
      v.fuel = v.fuelMax || 9999;
      v.dead = false;
    }

    // Hot Wheels'e özel 50 oynanış özelliği (ayarlardan toggle'lanır)
    if (this.mapId === 'hotwheels') this._applyHotwheelsFeatures(v, dt);

    // ── MapSettings magnet radius — yakın altınları araca çek (harita ayarı) ──
    {
      // PERF(31 Tmz): `MapSettings.magnetRadius()` ölçüldü ~0,4 µs (COMMON
      //   dizisinde doğrusal arama). Harita ayarı koşu boyunca sabittir →
      //   koşu başında bir kez okunur. Değer ve davranış aynı.
      if (this._magnetR === undefined)
        this._magnetR = (typeof MapSettings !== 'undefined' ? MapSettings.magnetRadius(this.mapId) : 0);
      const _mr = this._magnetR;
      if (_mr > 0 && this.terrain) {
        const _objs = this.terrain.objects || [];
        for (let _i = 0; _i < _objs.length; _i++) {
          const _o = _objs[_i];
          if (_o.collected || _o.type !== 'coin') continue;
          if (Math.abs(_o.x - v.x) > _mr + 40) continue;
          const _dx = v.x - _o.x, _dy = (v.y - 30) - _o.y, _d = Math.hypot(_dx, _dy) || 1;
          if (_d < _mr) { const _s = Math.min(1, 440 * dt / _d); _o.x += _dx * _s; _o.y += _dy * _s; }
        }
      }
    }

    // Ortam güncelle (gece/gündüz, hava-rüzgar, engeller, afetler)
    if (typeof Environment !== 'undefined') Environment.update(dt, v, this.terrain, Camera);

    // Oyun modu güncelle (zaman yarışı/yarış/survival/boss)
    if (typeof GameModes !== 'undefined') GameModes.update(dt, v, this.terrain, Camera);

    // Görev takibi: mesafe + havada kalma
    if (typeof Missions !== 'undefined') {
      const _dNow = Math.max(0, (v.x - this.startX) / 2);
      if (this._missDist === undefined) this._missDist = 0;
      if (_dNow > this._missDist) { Missions.add('distance', _dNow - this._missDist); this._missDist = _dNow; }
      if (!v.onGround) Missions.add('air', dt);
    }

    // ── Mesafe kilometre-taşı kutlaması (mid-run bonus) ──
    {
      const _dm = Math.max(0, Math.floor((v.x - this.startX) / 2));
      const _miles = [1000, 2500, 5000, 10000, 20000, 50000];
      if (this._nextMile === undefined) this._nextMile = 0;
      if (this._nextMile < _miles.length && _dm >= _miles[this._nextMile]) {
        const _mm = _miles[this._nextMile]; this._nextMile++;
        const _mb = Math.floor(_mm / 20);
        SaveData.addGold(_mb);
        const _msp = Camera.worldToScreen(v.x, v.y - 84);
        if (HUD.addCoinPopup) HUD.addCoinPopup(_msp.x, _msp.y, _mb);
        if (Audio.playMilestone) Audio.playMilestone(); else if (Audio.playFuel) Audio.playFuel();
      }
    }

    // Düşük yakıt uyarısı (bir kez, %20 altına inince)
    if (v.fuelMax && v.fuel / v.fuelMax < 0.2) {
      if (!this._lowFuelWarned) { if (Audio.playLowFuel) Audio.playLowFuel(); this._lowFuelWarned = true; }
    } else if (v.fuelMax && v.fuel / v.fuelMax > 0.35) {
      this._lowFuelWarned = false;
    }

    // Bot
    if (this.botRaceMode) Bot.update(dt, this.terrain);

    Audio.updateEngine(v.throttle, Math.abs(v.vx));
    // Yeni ses katmanları (eklemeli, hepsi korumalı) — lastik yuvarlanma / turbo / backfire
    try {
      const _spdN = Math.min(1, Math.abs(v.vx) / 900);
      const _tire = v.tireType || v.tire || (v.tires && v.tires.type) || 'road';
      const _surf = (this.terrain && (this.terrain.currentSurface || this.terrain.surface)) ||
                    (this.mapId && /winter|arctic|blizzard|glacier/.test(this.mapId) ? 'snow' :
                     this.mapId && /desert|beach|canyon|savanna|wasteland/.test(this.mapId) ? 'sand' :
                     this.mapId && /underwater|swamp|lava_river/.test(this.mapId) ? 'water' :
                     this.mapId && /otoyol|city|neon_city|cyber_grid/.test(this.mapId) ? 'asphalt' : 'dirt');
      if (Audio._updateTireRoll) Audio._updateTireRoll(v.onGround ? _spdN : 0, _tire, _surf);
      if (Audio.setMusicIntensity) Audio.setMusicIntensity(_spdN * 0.85 + (v.onGround ? 0 : 0.15));
      // Turbo uğultusu: yüksek hızda gaz basılıyken periyodik (spam önleyici cooldown)
      if (Audio._playTurboWhine && v.onGround && v.throttle > 0.6 && _spdN > 0.72) {
        this._turboWhineCd = (this._turboWhineCd || 0) - dt;
        if (this._turboWhineCd <= 0) { Audio._playTurboWhine(_spdN); this._turboWhineCd = 0.45; }
      }
      // Backfire: gaz aniden bırakılınca (yüksek hızda)
      if (Audio._playBackfire) {
        const _pt = this._prevThrottle || 0;
        if (_pt > 0.5 && v.throttle < 0.15 && _spdN > 0.35) Audio._playBackfire(Math.min(1, _spdN + 0.2));
      }
      this._prevThrottle = v.throttle;
      this._runBestSpeed = Math.max(this._runBestSpeed || 0, Math.abs(v.vx || 0));   // kariyer için koşu-en-yüksek hız
      // Zemine uygun sürüş partikülleri (hızlıyken, seyrek) — eklemeli
      if (v.onGround && _spdN > 0.4) {
        this._surfFxCd = (this._surfFxCd || 0) - dt;
        if (this._surfFxCd <= 0) {
          this._surfFxCd = 0.08;
          const dir = v.vx >= 0 ? 1 : -1;
          if (_surf === 'snow' && Particles.snowSpray) Particles.snowSpray(v.x, v.y + 14, _spdN, -dir);
          else if (_surf === 'water' && Particles.waterSplash) Particles.waterSplash(v.x, v.y + 14, _spdN * 600, -dir);
          else if (_surf === 'sand' && Particles.tireSmokeBurst) Particles.tireSmokeBurst(v.x, v.y + 14, -dir, _spdN * 0.7);
          else if (v.throttle > 0.85 && _spdN > 0.6 && Particles.tireSmokeBurst) Particles.tireSmokeBurst(v.x, v.y + 14, -dir, _spdN * 0.5);
        }
      }
    } catch (e) {}
    // Haritaya özel atmosfer partikülleri (seyrek, korumalı) — biriken efektleri gerçek oyuna bağlar
    try {
      this._ambientFxCd = (this._ambientFxCd || 0) - dt;
      if (this._ambientFxCd <= 0 && typeof Particles !== 'undefined' && this.state === 'playing') {
        this._ambientFxCd = 0.35;
        const ax = v.x + (Math.random() * 900 - 450), ay = v.y - (150 + Math.random() * 260);
        const _mid = this.mapId, _t = this.animTime || 0;
        if (_mid === 'sakura' && Particles.petalDrift) Particles.petalDrift(ax, ay, 0.5);
        else if (_mid === 'bamboo' && Particles.bambooLeaves) Particles.bambooLeaves(ax, ay, 0.4);
        else if (_mid === 'windmill' && Particles.tulipPetals) Particles.tulipPetals(ax, ay, 0.5);
        else if (_mid === 'autumn' && Particles.leafScatter) Particles.leafScatter(ax, ay, 3, 0.4);
        else if (/winter|arctic|blizzard|glacier/.test(_mid) && Particles.snowGust) Particles.snowGust(ax, ay, 0.4);
        else if (_mid === 'graveyard' && Particles.ghostWisp) Particles.ghostWisp(ax, ay, _t);
        else if (/volcano|lava_river/.test(_mid) && Particles.emberRise) Particles.emberRise(ax, v.y + 20, 3);
        else if (/jungle|swamp|mushroom/.test(_mid) && Particles.fireflySwarm2) Particles.fireflySwarm2(ax, ay, 120, 3);
      }
    } catch (e) {}
    this._updateParticles(v, dt);
    Camera.follow(v, dt);

    // Collectibles
    const collected = this.terrain.checkCollectibles(v);
    for (const obj of collected) {
      if (obj.type === 'coin') {
        if (typeof MapSettings !== 'undefined' && MapSettings.mult) obj.value = Math.max(1, Math.round(obj.value * MapSettings.mult(this.mapId, 'coin_value')));
        if (typeof Parts !== 'undefined' && Parts.has && Parts.has('coin_doubler')) obj.value = Math.round(obj.value * 1.25);   // COIN DOUBLER parçası
        this.coinsCollected += obj.value;
        SaveData.addGold(Math.round(obj.value * ((typeof Rewards !== 'undefined') ? Rewards.coinMult() : 1)));
        if (typeof Missions !== 'undefined') Missions.add('coins', obj.value);
        Audio.playCoin();
        if (Audio.playSparkle) Audio.playSparkle();
        Audio.vibrate(20);
        const sp = Camera.worldToScreen(obj.x, obj.y);
        HUD.addCoinPopup(sp.x, sp.y, obj.value);
        Particles.coinEffect(obj.x, obj.y);
        if (Particles.coinSparkle) Particles.coinSparkle(obj.x, obj.y);
        if (typeof Achievements !== 'undefined') Achievements.check('total_coins');
      } else if (obj.type === 'fuel') {
        v.fuel = Math.min(v.fuelMax, v.fuel + v.fuelMax * 0.4);
        Audio.playFuel();
        Particles.fuelEffect(obj.x, obj.y);
      }
    }

    // Flips + hava-kombo ödülü (tek zıplamada üst üste takla → katlanan altın)
    if (v.flipCount > this.lastFlipCount) {
      const newFlips = v.flipCount - this.lastFlipCount;
      this.runFlips   += newFlips;
      this._airFlips   = (this._airFlips || 0) + newFlips;
      this._runBestCombo = Math.max(this._runBestCombo || 0, this._airFlips);
      this.lastFlipCount = v.flipCount;
      HUD.showFlip(this.runFlips);
      if (Audio.playCombo) Audio.playCombo(this._airFlips); else Audio.playFlip();
      if (typeof Missions !== 'undefined') Missions.add('flips', newFlips);
      // Takla ödülü: bu zıplamadaki takla sayısıyla katlanır (1.,2.,3. takla = 30,60,90...)
      const _comboMul = (typeof Parts !== 'undefined' && Parts.has && Parts.has('combo_master')) ? 1.5 : 1;
      const flipGold = Math.round(30 * this._airFlips * _comboMul);
      SaveData.addGold(flipGold);
      if (SaveData.addScrap) SaveData.addScrap(this._airFlips);
      const sp = Camera.worldToScreen(v.x, v.y - 46);
      if (HUD.addCoinPopup) HUD.addCoinPopup(sp.x, sp.y, flipGold);
      if (typeof Achievements !== 'undefined') Achievements.check('flip', { flips: this.runFlips });
    }
    // BÜYÜK HAVA bonusu: uzun havada kalıp inince ekstra altın
    if (!v.onGround) { this._jumpAir = (this._jumpAir || 0) + dt; }
    else if (this._wasAirborne) {
      if ((this._jumpAir || 0) > 0.4) this._runJumps = (this._runJumps || 0) + 1;   // gerçek zıplama sayısı
      // ── İNİŞ KALİTESİ: araziye göre ne kadar düz indiğine göre momentum ──
      if ((this._jumpAir || 0) > 0.3 && this.terrain && this.terrain.getYAt) {
        const _ls1 = this.terrain.getYAt(v.x - 40), _ls2 = this.terrain.getYAt(v.x + 40);
        const _tA = Math.atan2(_ls2 - _ls1, 80);
        let _dev = _tA - v.angle;
        while (_dev >  Math.PI) _dev -= 2 * Math.PI;
        while (_dev < -Math.PI) _dev += 2 * Math.PI;
        _dev = Math.abs(_dev);
        const _surf = (v.wheels && v.wheels[0] && v.wheels[0].surfaceType) || 'dirt';
        if (_dev < 0.40) {                    // DÜZ, temiz iniş → akış korunur + küçük hız bonusu
          v.vx += Math.sign(v.vx || 1) * 70;
          if (typeof Particles !== 'undefined' && Particles.dirtKick) Particles.dirtKick(v.x, v.y, Math.sign(v.vx || 1));
          if (Audio.playThud) Audio.playThud(false);   // yumuşak iniş sesi
        } else if (_dev > 1.0) {              // kötü açıyla iniş (burun/yan) → hız kaybı
          v.vx *= (typeof Parts !== 'undefined' && Parts.has && Parts.has('smooth_lander')) ? 0.78 : 0.55;
          if (Audio.vibrate) Audio.vibrate(50);
          if (Audio.playThud) Audio.playThud(true);    // sert iniş sesi
          if (typeof Particles !== 'undefined' && Particles.impactBurst) Particles.impactBurst(v.x, v.y, 1.2, _surf);
        }
      }
      if ((this._jumpAir || 0) > 1.5) {
        const _ab = Math.floor(this._jumpAir * 45);
        SaveData.addGold(_ab);
        const _sp = Camera.worldToScreen(v.x, v.y - 72);
        if (HUD.addCoinPopup) HUD.addCoinPopup(_sp.x, _sp.y, _ab);
        if (Audio.playCoin) Audio.playCoin();
      }
      // MÜKEMMEL İNİŞ: havadan sonra düz (dengeli) inersen ekstra altın
      if ((this._jumpAir || 0) > 0.5 && Math.abs(v.angularVel || 0) < 1.6) {
        SaveData.addGold(35);
        const _psp = Camera.worldToScreen(v.x, v.y - 52);
        if (HUD.addCoinPopup) HUD.addCoinPopup(_psp.x, _psp.y, 35);
        if (Audio.playFlip) Audio.playFlip();
      }
      this._jumpAir = 0;
    }

    // Yere inince hava-kombo sıfırlanır (2+ takla = ekstra kombo bonusu)
    if (v.onGround && this._wasAirborne && (this._airFlips || 0) > 0) {
      if (this._airFlips >= 2) {
        const comboBonus = 50 * this._airFlips;
        SaveData.addGold(comboBonus);
        if (typeof Settings === 'undefined' || Settings.get('slowmo')) this._slowmo = 0.5;   // ağır çekim
        const sp2 = Camera.worldToScreen(v.x, v.y - 60);
        if (HUD.addCoinPopup) HUD.addCoinPopup(sp2.x, sp2.y, comboBonus);
        // Biriken kombo efektleri (eklemeli, korumalı)
        if (typeof Particles !== 'undefined') {
          if (Particles.comboFlare) Particles.comboFlare(v.x, v.y - 40, this._airFlips);
          else if (Particles.comboRing) Particles.comboRing(v.x, v.y - 40, this._airFlips);
        }
        if (this._airFlips >= 3 && typeof Audio !== 'undefined' && Audio.playComboMax) Audio.playComboMax();
      }
      this._airFlips = 0;
    }
    this._wasAirborne = !v.onGround;

    // Air time
    if (!v.onGround) {
      this.maxAirTime += dt;
      this._runAir = (this._runAir || 0) + dt;   // koşu-boyu hava (ölümde flush)
      if (this.maxAirTime >= 5 && typeof Achievements !== 'undefined')
        Achievements.check('airtime', { airtime: this.maxAirTime });
    }

    // Distance achievements
    const dist = Math.max(0, Math.floor((v.x - this.startX) / 2));
    if (typeof Achievements !== 'undefined') Achievements.checkDistance(dist, this.mapId);

    // Fuel-out: yakıt bitti, araç durdu → game over
    if (v.fuel <= 0 && !v.dead) {
      this._fuelOutTimer = (this._fuelOutTimer || 0) + dt;
      if (this._fuelOutTimer > 2.5) {
        v.dead = true;
        v.deathReason = 'fuel_empty';
      }
    } else {
      this._fuelOutTimer = 0;
    }

    if (v.dead) this._onDeath(v);
  },

  // ── Hot Wheels 50 özellik: ayarlardan açık olanları gerçek etkiye çevir ──
  _applyHotwheelsFeatures(v, dt) {
    if (typeof MapSettings === 'undefined') return;
    // ── PERF(31 Tmz): bayraklar koşu başına BİR KEZ okunur ──────────────────
    // 🔴 `MapSettings.on('hotwheels','hw_feat_N')` ÖLÇÜLDÜ: çağrı başına
    //    ~1,1 µs. Sebebi `findDef()`: önce 104 elemanlı COMMON dizisini baştan
    //    sona tarar, bulamayınca `COMMON.concat(build('hotwheels'))` ile ~600
    //    elemanlık YENİ BİR DİZİ ayırıp onu da tarar. Bu fonksiyon karede 14 kez
    //    çağırıyordu → kare başına 14 dizi ayırma + ~10.000 eleman taraması,
    //    yalnız Hot Wheels haritasında. Harita ayarları koşu sırasında
    //    değiştirilemez (menü yalnız koşu dışında açılır) → aynı sonuç.
    let F = this._hwFeat;
    if (!F) F = this._hwFeat = {};
    // TEMBEL memo: hangi özellik sorulursa sorulsun ilk kez okunur, sonra
    // önbellekten gelir. Yeni bir `on(N)` eklersen liste güncellemeye gerek yok.
    const on = (n) => (n in F) ? F[n] : (F[n] = MapSettings.on('hotwheels', 'hw_feat_' + n));
    // Mıknatıs / Çekim / Manyetik Tavan (3,22,27): yakın altınları araca çek
    if (on(3) || on(22) || on(27)) {
      const objs = this.terrain.objects || [];
      for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        if (o.collected || o.type !== 'coin') continue;
        if (Math.abs(o.x - v.x) > 320) continue;
        const dx = v.x - o.x, dy = (v.y - 30) - o.y, d = Math.hypot(dx, dy) || 1;
        if (d < 300) { const s = Math.min(1, 460 * dt / d); o.x += dx * s; o.y += dy * s; }
      }
    }
    // Boost Pad / Nitro Yağmuru / Süper Nitro Pad (1,19,39): periyodik nitro
    if (on(1) || on(19) || on(39)) {
      this._hwBoostT = (this._hwBoostT || 0) + dt;
      if (this._hwBoostT % 3 < 1.1) v.boostActive = true;
      if (v.boost !== undefined && v.boostMax !== undefined) v.boost = v.boostMax;
    }
    // Yerçekimi özellikleri
    if (on(33)) v.vy -= 520 * dt;   // Ağırlıksız Bölge → yukarı kaldırır
    if (on(38)) v.vy -= 900 * dt;   // Ters Yerçekimi → güçlü yukarı
    if (on(4))  v.vy += 520 * dt;   // Yerçekimi Kuyusu → aşağı çeker
    // Turbo Tüneli / Hız Bölgesi / Hız Katlayıcı (5,7,32): ileri it
    if ((on(5) || on(7) || on(32)) && Math.abs(v.vx) > 5) v.vx += Math.sign(v.vx) * 210 * dt;
    // Yapışkan Zemin (18): yerdeyken ekstra bastırma
    if (on(18) && v.onGround) v.vy += 220 * dt;
    // Puan Çarpanı Kapısı (41): ödül çarpanı bayrağı (_onDeath'te kullanılır)
    this._hwRewardMult = on(41) ? 2 : 1;
  },

  _updateParticles(v, dt) {
    const exhaust = this._exhaustPos(v);
    Particles.exhaust(exhaust.x, exhaust.y, this.vehicleId, v.throttle);
    v.wheels.forEach(w => {
      if (w.contact) Particles.wheelDust(w.x, w.y - (w.radius||20), w.surfaceType, v.vx);
    });
    // Hızlı sürüşte arka tekerden yüzeye özel sprey (throttle'lı, taşmasın)
    if (Particles.surfaceSpray && Math.abs(v.vx) > 320 && Math.random() < 0.35) {
      const _rw = v.wheels[0] || {};
      Particles.surfaceSpray(_rw.x || v.x, (_rw.y || v.y) - (_rw.radius || 20), Math.abs(v.vx), _rw.surfaceType || 'dirt');
    }
    // Nitro flame trail + ısı-pusu
    if (Parts.nitroActive) Particles.boostTrail(exhaust.x, exhaust.y);
    if (v.boostActive) {
      Particles.boostTrail(exhaust.x, exhaust.y);
      if (Particles.nitroHeatBloom) Particles.nitroHeatBloom(exhaust.x, exhaust.y, v.angle || 0, 1);
    }
    // Race car sparks
    if (this.vehicleId === 'racecar' && Math.abs(v.vx) > 400) {
      const gy = this.terrain.getYAt(v.x);
      if (v.y + 20 > gy - 10) Particles.spark(v.x, gy - 5, 2);
    }
    Particles.update(dt);
  },

  // PERF(31 Tmz): 🔴 bu 37 anahtarlı tablo `_exhaustPos` içinde KARE BAŞINA
  //   yeniden kuruluyordu (`_updateParticles` her karede çağırır) → 38 nesne
  //   ayırma/kare. Sabit tabloya taşındı; içerik birebir aynı.
  _EXHAUST_OFFSETS: {
      jeep:[-55,5], motocross:[-38,10], monster:[-70,0], racecar:[-68,2],
      tractor:[-55,-10], superdiesel:[70,-18], rallycar:[-56,8], musclecar:[-62,8],
      sportscar:[-58,6], formula:[-68,0], dunebuggy:[-48,12], dirtbike:[-36,10],
      snowmobile:[-52,4], chopper:[-50,18], scooter:[-34,8], atv:[-42,8],
      tank:[0,20], loader:[-60,4], semitruck:[-80,-18], van:[-58,8],
      ambulance:[-58,8], hovercar:[0,16], moonlander:[0,20], lawnmower:[-38,14],
      rickshaw:[28,0], hipstercar:[-42,8], paintingtruck:[-60,8], supercar:[-58,6],
      bugatti:[-58,4], helicopter:[0,-30], submarine:[-60,0], dragster:[-70,4],
      pickup:[-58,8], dune4x4:[-54,10], warthog:[-50,6], offroader:[-56,8],
      cybertruck:[-60,6]
  },
  _EXHAUST_DEFAULT: [-50, 0],
  // Dönüş nesnesi de yeniden kullanılır: çağıran (`_updateParticles`) değeri
  // ANINDA okuyup atar, hiçbir yerde saklamaz → tek yuva güvenli.
  _exhaustOut: { x: 0, y: 0 },

  _exhaustPos(v) {
    const off = this._EXHAUST_OFFSETS[this.vehicleId] || this._EXHAUST_DEFAULT;
    const angle = v.angle || 0;
    const o = this._exhaustOut;
    o.x = v.x + Math.cos(angle) * off[0] - Math.sin(angle) * off[1];
    o.y = v.y + Math.sin(angle) * off[0] + Math.cos(angle) * off[1];
    return o;
  },

  _onDeath(v) {
    // 🔆 PHOENIX REVIVE: envanterde varsa ve bu turda kullanılmadıysa otomatik dirilt
    if (!this._phoenixUsed && SaveData.getItem && SaveData.getItem('phoenix_revive') > 0 && SaveData.useItem('phoenix_revive')) {
      this._phoenixUsed = true;
      v.dead = false; v.deathReason = null;
      v.angle = 0; v.angularVel = 0; v.vy = 0;
      const _gy = this.terrain.getYAt(v.x);
      v.y = _gy - (v.height || 50) * 0.5 - 40;   // yerin biraz üstünde yeniden konumla
      if (v.fuel !== undefined && v.fuelMax !== undefined) v.fuel = v.fuelMax;   // yakıt doldur
      this.state = 'playing';
      if (typeof Particles !== 'undefined' && Particles.winBurst) Particles.winBurst(v.x, v.y - 30);
      if (Audio.playLevelUp) Audio.playLevelUp();
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🔆 PHOENIX REVIVE!');
      return;
    }
    // 🛡️ ROLL CAGE parçası: turda bir kez çarpışmadan kurtar
    if (typeof Parts !== 'undefined' && Parts.has && Parts.has('roll_cage') && !Parts._rollCageUsed) {
      Parts._rollCageUsed = true;
      v.dead = false; v.deathReason = null;
      v.angle = 0; v.angularVel = 0; v.vy = 0;
      const _gy2 = this.terrain.getYAt(v.x);
      v.y = _gy2 - (v.height || 50) * 0.5 - 36;
      this.state = 'playing';
      if (typeof Particles !== 'undefined' && Particles.sparkBurst) Particles.sparkBurst(v.x, v.y - 20);
      if (Audio.playBoost) Audio.playBoost();
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🛡️ ROLL CAGE!');
      return;
    }
    this.state = 'dead';
    this.deathReason = v.deathReason || 'fell_off';
    // 🪟 KAPAK/TAVAN KIRILMA animasyonu — araç devrilip tavanı/kafası yere değince cam + panel parçalanır
    if (v.canopyBreak && typeof Particles !== 'undefined') {
      const _bx = (v._headHitX !== undefined) ? v._headHitX : v.x;
      const _by = (v._headHitY !== undefined) ? v._headHitY : (v.y - (v.height || 50) * 0.35);
      if (Particles.glassShatter)    Particles.glassShatter(_bx, _by);
      if (Particles.explosionDebris) Particles.explosionDebris(_bx, _by);
      if (Particles.impactBurst)     Particles.impactBurst(v.x, v.y, 1.4, 'dirt');
      if (Audio.playCrash)           Audio.playCrash();
    }
    const dist = Math.max(0, Math.floor((v.x - this.startX) / 2));
    const isNewRecord = SaveData.updateHighScore(this.mapId, dist);

    // BUGFIX(21 Tmz): `reward` AŞAĞIDA tanımlıydı ama aşağıdaki try bloğu (SeasonEvents)
    // ondan ÖNCE `reward.gold` okuyordu → JS `const` TDZ'si yüzünden ReferenceError,
    // ve blok `catch(e){}` ile SESSİZCE yutuluyordu. Sonuç: SeasonEvents.addXP,
    // CardCollection.grantCard ve Replay.saveIfBest HİÇ ÇALIŞMIYORDU
    // (sezon pası XP'si, araç kartı düşüşü, en iyi koşu replay'i ölüydü).
    // Çözüm: ödül hesabı try bloğundan ÖNCE yapılır; sıra ve değerler korunur.
    const reward = Economy.calculateRunReward(dist, this.runFlips, this.coinsCollected);
    const _vipMult = (typeof Rewards !== 'undefined') ? Rewards.coinMult() : 1;
    const _ddaR = (typeof DDA !== 'undefined') ? DDA.getRewardBonus() : 1;
    reward.gold = Math.round(reward.gold * _vipMult * (this._hwRewardMult || 1) * _ddaR);

    // ── Yaşam-boyu istatistik flush (koşu başına bir kez, save spam yok) ──
    try {
      if (SaveData.bumpStat) {
        if (this.runFlips)      SaveData.bumpStat('totalFlips', this.runFlips);
        if (this._runAir)       SaveData.bumpStat('totalAirtime', this._runAir);
        if (this._runJumps)     SaveData.bumpStat('totalJumps', this._runJumps);
        if ((v.damageLevel || 0) === 0) SaveData.bumpStat('noDamageRuns', 1);
        if (SaveData.recordStatMax && this._runBestCombo) SaveData.recordStatMax('bestCombo', this._runBestCombo);
        if (SaveData.recordMapBest) SaveData.recordMapBest(this.mapId, dist);
        if (SaveData.addVehicleDistance) SaveData.addVehicleDistance(this.vehicleId || (v && v.id) || 'car', dist);
      }
    } catch (e) {}
    // ── KARİYER ilerlemesi (koşu-sonu, tüm hedef türlerini besler) ──
    try {
      if (typeof Career !== 'undefined' && Career.checkRun) {
        const _cb = Career.claimableCount ? Career.claimableCount() : 0;
        Career.checkRun({
          dist: dist, mapId: this.mapId, vehicleId: this.vehicleId,
          flips: this.runFlips || 0, combo: this._runBestCombo || 0, coins: this.coinsCollected || 0,
          airtime: this._runAir || 0, speed: this._runBestSpeed || 0,
          noDamage: (v.damageLevel || 0) === 0,
          // 🔴 BUGFIX(28 Tmz) — KARİYER HEDEFLERİ ÖLÜNCE TAMAMLANIYORDU.
          //   Eski kod: `modeFinished: !!(gameMode && gameMode !== 'normal')`
          //   Bu ifade modun "normal olmaması"ndan türüyordu, yani mod seçiliyse
          //   HER ZAMAN true — ve bu blok zaten _death() içinde çalışıyor.
          //   Sonuç: oyuncu Coin Rush'ı açıp 1 saniyede ölse bile "Coin Rush
          //   modunu bitir" hedefi (career.js c10/c17/c21/c24) tamamlanıyor,
          //   4.000 altın + 4 elmas ödül açılıyordu.
          //   ▶ Artık GameModes'un GERÇEK bitiş bayrağı okunuyor: mod ancak
          //     `_finish()` çağrıldıysa (süre doldu / hedefe varıldı) biter.
          mode: this.gameMode || 'normal',
          modeFinished: !!(this.gameMode && this.gameMode !== 'normal' &&
                           typeof GameModes !== 'undefined' && GameModes.finished)
        });
        const _ca = Career.claimableCount ? Career.claimableCount() : 0;
        if (_ca > _cb && typeof UI !== 'undefined' && UI.showToast) UI.showToast('🎖️ Kariyer bölümü hazır — ödülünü al!');
      }
      // Kampanya ilerleme
      if (typeof Campaign !== 'undefined' && Campaign.checkRun) {
        Campaign.checkRun({ dist: dist, mapId: this.mapId, vehicleId: this.vehicleId,
          flips: this.runFlips || 0, coins: this.coinsCollected || 0,
          airtime: this._runAir || 0, speed: this._runBestSpeed || 0, mode: this.gameMode || 'normal' });
      }
      // Sezon pası + etkinlikler
      if (typeof SeasonEvents !== 'undefined') {
        if (SeasonEvents.trackRun) SeasonEvents.trackRun({ distance: dist, flips: this.runFlips || 0, gold: (reward && reward.gold) || 0 });
        if (SeasonEvents.addXP)    SeasonEvents.addXP(Math.floor(dist / 10) + (this.runFlips || 0) * 5);
      }
      // Araç kart parçaları (mesafeye göre)
      if (typeof CardCollection !== 'undefined' && CardCollection.grantCard) {
        CardCollection.grantCard(this.vehicleId, 1 + Math.floor(dist / 500));
      }
      // En iyi koşuyu replay olarak kaydet
      if (typeof Replay !== 'undefined' && Replay.saveIfBest) Replay.saveIfBest(this.mapId, dist);
    } catch (e) {}
    this._runAir = 0; this._runJumps = 0; this._runBestCombo = 0; this._runBestSpeed = 0;

    if (isNewRecord) {
      HUD.setNewRecord(true); Audio.vibrate(100);
      if (Audio.playTrophy) Audio.playTrophy();
      if (Audio.playNewRecordStinger) Audio.playNewRecordStinger();
      if (typeof Particles !== 'undefined' && Particles.winBurst) Particles.winBurst(v.x, v.y - 60);
      if (typeof Particles !== 'undefined' && Particles.celebrationBurst) Particles.celebrationBurst(v.x, v.y - 80, 160);
      if (typeof Particles !== 'undefined' && Particles.recordFireworks) Particles.recordFireworks(v.x, v.y - 100);
    }

    // (reward + çarpanlar yukarıya taşındı — BUGFIX(21 Tmz), TDZ hatası)
    SaveData.addGold(reward.gold);
    const _preLv = (SaveData.data && SaveData.data.playerLevel) || 1;
    SaveData.addXP(Math.floor(dist / 10) + this.runFlips * 2);
    if (((SaveData.data && SaveData.data.playerLevel) || 1) > _preLv) {   // OYUNCU SEVİYE ATLAMA
      // BUGFIX(30 Tmz) #18 — CANLI ÇÖKME. Eski satır:
      //   (Particles.levelUpRays || Particles.levelUpBurst)(x, y)
      // Parantezli `A || B` ifadesi fonksiyonu NESNESİNDEN KOPARIR → çağrıda
      // `this` undefined olur → içerideki `this._ps()` TypeError atardı.
      // Bu istisna _onDeath'i 852. satırda KESİYORDU; sonrasındaki her şey
      // (sezon XP, ustalık XP, hurda, kupa, bot sonucu, _lastRunStats,
      // Audio.stopEngine, saveNow) sessizce kayboluyordu — her seviye atlamada.
      // ▶ Metot olarak çağrılıyor + görsel efekt ödül zincirini asla kesemesin
      //   diye try/catch içinde. Kanıt/ölçüm: DEVAM-OZETI.md §8B.28.
      try {
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('⬆ SEVİYE ' + SaveData.data.playerLevel + '!');
        if (Audio.playTierUp) Audio.playTierUp();
        if (typeof Particles !== 'undefined') {
          if (typeof Particles.levelUpRays === 'function')       Particles.levelUpRays(this.vehicle.x, this.vehicle.y - 50);
          else if (typeof Particles.levelUpBurst === 'function') Particles.levelUpBurst(this.vehicle.x, this.vehicle.y - 50);
        }
      } catch (e) {}
    }
    // Ghost MP: hayaleti kaydet + derece hesapla
    if (typeof GameModes !== 'undefined' && GameModes.onRunEnd) GameModes.onRunEnd(dist);

    // Sezon ligi kupası (mesafe + mod bonusu)
    if (typeof Rewards !== 'undefined' && Rewards.awardRunTrophies) {
      const _tr = Rewards.awardRunTrophies(dist, (typeof GameModes !== 'undefined' ? GameModes.placement : 0) || 0, (typeof GameModes !== 'undefined' ? GameModes.mode : 'normal'));
      if (_tr > 0 && typeof UI !== 'undefined' && UI.showToast) UI.showToast('🏆 +' + _tr + ' kupa');
    }
    // Hurda (scrap) kazanımı — parça yükseltmede kullanılır
    if (SaveData.addScrap) SaveData.addScrap(Math.floor(dist / 120) + this.runFlips);
    // Sezon pası XP'si
    if (SaveData.addSeasonXP) SaveData.addSeasonXP(Math.floor(dist / 10) + this.runFlips * 3 + 20);
    // Araç ustalık XP'si (bu araçla sürdükçe ustalık artar)
    if (SaveData.addMasteryXP) {
      const _pre = SaveData.getMasteryLevel(this.vehicleId);
      SaveData.addMasteryXP(this.vehicleId, Math.floor(dist / 8) + this.runFlips * 3);
      const _post = SaveData.getMasteryLevel(this.vehicleId);
      if (_post > _pre) {
        // BUGFIX(30 Tmz) #18 ile aynı ilke: kutlama efekti ödül zincirini KESEMEZ.
        try {
          if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('★ MASTERY LEVEL ' + _post + '!');
          if (Audio.playLevelUp) Audio.playLevelUp();
          if (typeof Particles !== 'undefined' && Particles.levelUpBurst) Particles.levelUpBurst(this.vehicle.x, this.vehicle.y - 50);
        } catch (e) {}
      }
    }

    let botWon = false;
    let botDist;
    if (this.botRaceMode && Bot.vehicle) {
      botDist = Math.max(0, Math.floor((Bot.vehicle.x - this.startX) / 2));
      botWon = botDist > dist;
      SaveData.recordBotResult(this.mapId, !botWon);
      // Bot seviye ilerlemesi: oyuncu kazandıkça sıradaki bot bir üst seviye (max 10 = yenilmez)
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const _bl = Math.max(1, Math.min(20, SaveData.get('botLevel') || 1));
        if (!botWon && _bl < 20) {
          SaveData.set('botLevel', _bl + 1);
          if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🤖 Botu yendin! Sıradaki bot: SEVİYE ' + (_bl + 1));
        } else if (!botWon && _bl >= 20 && typeof UI !== 'undefined' && UI.showToast) {
          UI.showToast('🏆 SEVİYE 20 (full Formula) botu yendin — EFSANE!');
        }
      }
    }

    if (typeof DDA !== 'undefined') {
      try {
        DDA.recordResult({
          won: (typeof this !== 'undefined' && this.botRaceMode) ? !botWon
               : (typeof isNewRecord !== 'undefined' ? !!isNewRecord : true),
          margin: (typeof botDist !== 'undefined') ? Math.min(1, Math.abs(dist - botDist) / Math.max(1, dist)) : 0.5,
          distance: (typeof dist !== 'undefined') ? dist : 0
        });
      } catch (e) {}
    }

    const rank = SaveData.getRank(dist);

    Audio.stopEngine();
    if (typeof DynamicAudio !== 'undefined' && DynamicAudio.onRunEnd) DynamicAudio.onRunEnd();
    if (typeof Audio.playCrash === 'function') Audio.playCrash();   // playDeath yoktu → çökme; doğru metod playCrash + güvenli çağrı

    window._lastRunStats = {
      distance:  dist,
      flips:     this.runFlips,
      gold:      reward.gold,
      diamonds:  reward.diamonds,
      isNew:     isNewRecord,
      bestDist:  SaveData.get('highScores')[this.mapId] || 0,
      rank,
      rankColor: SaveData.getRankColor(rank),
      botRace:   this.botRaceMode,
      botWon
    };

    // 🔴 KOŞU SONU = KRİTİK KAYIT ANI (29 Tmz).
    //   `SaveData.save()` artık gecikmeli (1 sn). Koşu ödülleri, rekor ve
    //   ustalık XP'si burada yazılıyor; oyuncu hemen uygulamayı kapatırsa
    //   kaybolmasın diye ANINDA yaz.
    try { if (SaveData.saveNow) SaveData.saveNow(); } catch (e) {}

    // Overlay 3 saniye gösterildikten sonra main.js otomatik menüye yönlendirir
    // Gameover ekranı Main._updateDeathOverlay tarafından tetiklenir
  },

  pause() {
    if (this.state === 'playing') { this.state = 'paused'; if (Audio.stopEngine) Audio.stopEngine(); }   // pauseEngine yoktu → çökme; stopEngine + güvenli çağrı
  },

  resume() {
    if (this.state === 'paused') { this.state = 'playing'; if (Audio.startEngine) Audio.startEngine(); }  // resumeEngine yoktu → çökme; startEngine + güvenli çağrı
  },

  _bindControls() {
    const canvas = this.canvas;
    if (!canvas) return;

    // ── Keyboard ──────────────────────────────────────────────────────────
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyC') this._screenshot();   // 📷 ekran görüntüsü (her yerde)
      if (this.state !== 'playing') return;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.controlState.throttle = 1;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') this.controlState.brake    = 1;
      // NITRO/TURBO BOOST — X (istenen), Space veya Shift basılı tut (her araçta var)
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
        e.preventDefault(); this.controlState.boost = 1;
      }
      if (e.code === 'KeyN' || e.code === 'KeyX')  Parts.activateNitro();
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.controlState.throttle = 0;
      if (e.code === 'ArrowLeft'  || e.code === 'KeyA') this.controlState.brake    = 0;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') this.controlState.boost = 0;
    });

    // ── Touch ─────────────────────────────────────────────────────────────
    // Zones: left 0-35% = brake, 35-75% = nitro tap, right 75-100% = throttle
    const getZone = (x) => {
      const w = canvas.width;
      if (x < w * 0.35)  return 'brake';
      if (x > w * 0.75)  return 'throttle';
      return 'middle';
    };

    canvas.addEventListener('touchstart', e => {
      if (this.state !== 'playing') return;
      for (const t of e.changedTouches) {
        const zr = canvas.getBoundingClientRect();
        const zsx = (zr.width > 0) ? canvas.width / zr.width : 1;
        const zone = getZone((t.clientX - zr.left) * zsx);
        if (zone === 'throttle') { this.touchIds.right = t.identifier; this.controlState.throttle = 1; }
        if (zone === 'brake')    { this.touchIds.left  = t.identifier; this.controlState.brake    = 1; }
        if (zone === 'middle')   { this.touchIds.nitro = t.identifier; this.controlState.boost = 1; Parts.activateNitro(); }
      }
      // Pause button (top-right circle r=22 at canvas right-30, 30)
      for (const t of e.changedTouches) {
        const rect = canvas.getBoundingClientRect();
        const sx = (rect.width  > 0) ? canvas.width  / rect.width  : 1;
        const sy = (rect.height > 0) ? canvas.height / rect.height : 1;
        const tx = (t.clientX - rect.left) * sx;
        const ty = (t.clientY - rect.top)  * sy;
        const dx = tx - (canvas.width - 30), dy = ty - 30;
        if (Math.sqrt(dx*dx+dy*dy) <= 28) {
          if (this.state === 'playing') this.pause();
          else if (this.state === 'paused') this.resume();
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      if (this.state !== 'playing' && this.state !== 'paused') return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchIds.right) { this.controlState.throttle = 0; this.touchIds.right = null; }
        if (t.identifier === this.touchIds.left)  { this.controlState.brake    = 0; this.touchIds.left  = null; }
        if (t.identifier === this.touchIds.nitro) { this.touchIds.nitro = null; this.controlState.boost = 0; }
      }
    }, { passive: true });

    canvas.addEventListener('touchcancel', e => {
      this.controlState.throttle = 0;
      this.controlState.brake    = 0;
      this.touchIds = { left:null, right:null, nitro:null };
    }, { passive: true });

    // ── Mouse (desktop fallback) ──────────────────────────────────────────
    let mouseThrottle = false, mouseBrake = false;
    canvas.addEventListener('mousedown', e => {
      if (this.state !== 'playing') return;
      const mr = canvas.getBoundingClientRect();
      const msx = (mr.width > 0) ? canvas.width / mr.width : 1;
      const zone = getZone((e.clientX - mr.left) * msx);
      if (zone === 'throttle') { mouseThrottle = true; this.controlState.throttle = 1; }
      if (zone === 'brake')    { mouseBrake    = true; this.controlState.brake    = 1; }
      if (zone === 'middle')   { this.controlState.boost = 1; Parts.activateNitro(); }
    });
    window.addEventListener('mouseup', () => {
      if (mouseThrottle) { mouseThrottle = false; this.controlState.throttle = 0; }
      if (mouseBrake)    { mouseBrake    = false; this.controlState.brake    = 0; }
      this.controlState.boost = 0;
    });
  }
,
  // ═══════════════════════════════════════════════════════════════
  // ADVANCED GAMEPLAY SYSTEMS
  // ═══════════════════════════════════════════════════════════════

  // Track consecutive perfect landings for bonus system
  _perfectLandingStreak: 0,
  _lastLandingQuality: 0,
  _currentCombo: 0,
  _comboTimer: 0,
  _comboActions: [],
  _sessionFlips: 0,
  _sessionMaxAirtime: 0,
  _sessionMaxSpeed: 0,
  _runTimer: 0,
  _nitroUses: 0,
  _dangerZoneTimer: 0,
  _nearMissCount: 0,

  resetSession() {
    this._perfectLandingStreak = 0;
    this._currentCombo = 0;
    this._comboTimer = 0;
    this._comboActions = [];
    this._sessionFlips = 0;
    this._sessionMaxAirtime = 0;
    this._sessionMaxSpeed = 0;
    this._runTimer = 0;
    this._nitroUses = 0;
    this._nearMissCount = 0;
    Achievements.resetRun();
  },

  addComboAction(action) {
    this._comboActions.push(action);
    this._comboTimer = 3; // 3 second window
    this._currentCombo = this._comboActions.length;
    return this._currentCombo;
  },

  updateCombo(dt) {
    if (this._comboTimer > 0) {
      this._comboTimer -= dt;
      if (this._comboTimer <= 0) {
        // Combo expired
        if (this._currentCombo >= 3) {
          Achievements.check('combo', { count: this._currentCombo });
          // Bonus gold for combos
          const bonus = this._currentCombo * 10;
          SaveData.data.gold = (SaveData.get('gold') || 0) + bonus;
          Particles.coinsSparkle(this.vehicle.x, this.vehicle.y - 30);
          // BUGFIX(30 Tmz) #20 — `HUD.showCoinPopup` yok (bkz. game.js ~1409).
          if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('+' + bonus + ' COMBO!');
        }
        this._comboActions = [];
        this._currentCombo = 0;
      }
    }
  },

  onFlip() {
    this._sessionFlips++;
    Achievements.checkFlip(this._sessionFlips);
    this.addComboAction('flip');
    // Reward coins for flips
    const flipBonus = 5 + this._sessionFlips * 2;
    SaveData.data.gold = (SaveData.get('gold') || 0) + flipBonus;
    SaveData.data.totalCoins = (SaveData.get('totalCoins') || 0) + flipBonus;
    // BUGFIX(30 Tmz) #20 — `HUD.showCoinPopup` yok (bkz. game.js ~1409).
    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('+' + flipBonus + ' 🌀');
  },

  onLanding(velocity, airtime) {
    const impact = Math.abs(velocity);
    // İniş sesi (havada yeterince kaldıysa) — sert inişte daha güçlü
    if (airtime > 0.25 && typeof Audio !== 'undefined' && Audio.playLand) Audio.playLand(impact);
    let quality = 0;
    if (impact < 3) {
      quality = 3; // perfect
      this._perfectLandingStreak++;
      this.addComboAction('perfect_land');
    } else if (impact < 8) {
      quality = 2; // good
      this._perfectLandingStreak = 0;
      this.addComboAction('good_land');
    } else {
      quality = 1; // hard
      this._perfectLandingStreak = 0;
    }
    this._lastLandingQuality = quality;
    if (quality === 3 && this._perfectLandingStreak >= 3) {
      UI.showToast('🎯 PERFECT LANDING! x' + this._perfectLandingStreak);
      Particles.springBounce(this.vehicle.x, this.vehicle.y);
    }
    // Airtime achievement
    if (airtime > 2) {
      Achievements.checkAirtime(airtime);
      this._sessionMaxAirtime = Math.max(this._sessionMaxAirtime, airtime);
    }
    // Parts trigger
    if (Parts.has('spring') && impact > 3) {
      Particles.springBounce(this.vehicle.x, this.vehicle.y);
    }
    if (Parts.has('landing_boost') && impact < 10) {
      var _lbp = (typeof Economy!=='undefined' && Economy.getPartPower) ? Economy.getPartPower('landing_boost') : 1;
      this.vehicle.vx = Math.max(this.vehicle.vx, (this.vehicle.vx || 0) + 100 * _lbp);
      Particles.landingImpact(this.vehicle.x, this.vehicle.y);
      UI.showToast('⚡ LANDING BOOST!');
    }
  },

  onNitroUsed() {
    this._nitroUses++;
    this.addComboAction('nitro');
    Achievements.check('part_nitro');
  },

  onWingUsed() {
    this.addComboAction('wing');
    Achievements.check('part_wing');
  },

  getRunStats() {
    return {
      flips: this._sessionFlips,
      maxAirtime: this._sessionMaxAirtime,
      maxSpeed: this._sessionMaxSpeed,
      combo: this._currentCombo,
      nitroUses: this._nitroUses,
      runTime: this._runTimer,
      perfectLandings: this._perfectLandingStreak
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // WIND SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _wind: 0,
  _windTarget: 0,
  _windChangeTimer: 0,

  updateWind(dt, mapId) {
    const windyMaps = ['desert','wasteland','beach','canyon'];
    this._windChangeTimer -= dt;
    if (this._windChangeTimer <= 0) {
      this._windChangeTimer = 5 + Math.random() * 10;
      this._windTarget = windyMaps.includes(mapId)
        ? (Math.random() - 0.5) * 6
        : (Math.random() - 0.5) * 2;
    }
    this._wind += (this._windTarget - this._wind) * dt * 0.5;
  },

  getWind() { return this._wind; },

  applyWind(vehicle, dt) {
    if (Math.abs(this._wind) < 0.1) return;
    // Wind affects airborne vehicles more
    const airborne = vehicle.airTime > 0.1;
    const factor = airborne ? 0.6 : 0.08;
    vehicle.vx = (vehicle.vx || 0) + this._wind * factor * dt * 60;
  },

  // ═══════════════════════════════════════════════════════════════
  // HAZARD SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _hazards: [],

  spawnHazards(camX, mapId) {
    const hazardMaps = {
      lava:      { type: 'lava_pool',  freq: 0.003, dmg: 30 },
      moon:      { type: 'crater',     freq: 0.002, dmg: 15 },
      wasteland: { type: 'debris',     freq: 0.004, dmg: 20 },
      underwater:{ type: 'current',    freq: 0.002, dmg: 0  },
      volcano:   { type: 'ash_fall',   freq: 0.003, dmg: 10 },
    };
    if (!hazardMaps[mapId]) return;
    if (Math.random() < hazardMaps[mapId].freq) {
      this._hazards.push({
        x: camX + 800 + Math.random() * 200,
        type: hazardMaps[mapId].type,
        dmg: hazardMaps[mapId].dmg,
        life: 1
      });
    }
    // Remove old hazards
    this._hazards = this._hazards.filter(h => h.x > camX - 200);
  },

  checkHazardCollision(vehicle) {
    for (const h of this._hazards) {
      const dx = Math.abs(vehicle.x - h.x);
      if (dx < 30) {
        return h;
      }
    }
    return null;
  },

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC DIFFICULTY
  // ═══════════════════════════════════════════════════════════════
  _difficultyScale: 1,

  getDifficultyForDistance(meters) {
    // Gradually increase difficulty
    if (meters < 500)   return 1.0;
    if (meters < 2000)  return 1.1;
    if (meters < 5000)  return 1.25;
    if (meters < 10000) return 1.4;
    if (meters < 25000) return 1.6;
    if (meters < 50000) return 1.8;
    return 2.0;
  },

  getTerrainRoughnessForDistance(meters) {
    const base = 0.4;
    const scale = Math.min(2.5, 1 + meters / 10000);
    return base * scale;
  },

  // ═══════════════════════════════════════════════════════════════
  // REPLAY / GHOST SYSTEM (lightweight)
  // ═══════════════════════════════════════════════════════════════
  _replayFrames: [],
  _replayMaxFrames: 1800, // 30s at 60fps
  _isRecording: false,

  startRecording() {
    this._replayFrames = [];
    this._isRecording = true;
  },

  stopRecording() {
    this._isRecording = false;
  },

  recordFrame(vehicle, t) {
    if (!this._isRecording) return;
    if (this._replayFrames.length >= this._replayMaxFrames) {
      this._replayFrames.shift();
    }
    this._replayFrames.push({
      x: Math.round(vehicle.x),
      y: Math.round(vehicle.y),
      angle: Math.round(vehicle.angle * 100) / 100,
      t: t
    });
  },

  getBestReplayFrame(t) {
    if (this._replayFrames.length === 0) return null;
    return this._replayFrames.find(f => Math.abs(f.t - t) < 0.02) || null;
  },

  // ═══════════════════════════════════════════════════════════════
  // FUEL SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _fuelTank: 100,
  _maxFuel: 100,

  initFuel() {
    const level = (SaveData.getUpgrade ? SaveData.getUpgrade(Game.vehicleId || SaveData.get('selectedVehicle') || 'jeep', 'fuel') : 0);   // getUpgradeLevel yoktu → doğrusu getUpgrade
    // TUNING(2 Agu): `100 + level*25` tavandan TÜRETİLİYOR — tavan 25'e inince tavan yakıt
    // yarıya düşerdi (725); artık hep 1.350. ⚠ Blok ölü (initFuel 0 çağrı; canlı yakıt buildVehicleConfig.fuelMax).
    this._maxFuel = 100 + level * (1250 / ((typeof Economy !== 'undefined' && Economy.UP_MAX) ? Economy.UP_MAX : 25));
    this._fuelTank = this._maxFuel;
  },

  consumeFuel(throttle, dt) {
    const consumption = throttle * 2.5 * dt; // 2.5 units/s at full throttle
    this._fuelTank = Math.max(0, this._fuelTank - consumption);
    return this._fuelTank;
  },

  refillFuel(amount) {
    this._fuelTank = Math.min(this._maxFuel, this._fuelTank + amount);
  },

  getFuelPct() { return this._fuelTank / this._maxFuel; },

  isOutOfFuel() { return this._fuelTank <= 0; },

  // ═══════════════════════════════════════════════════════════════
  // VEHICLE DAMAGE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _vehicleHealth: 100,
  _maxHealth: 100,

  initHealth() {
    this._vehicleHealth = this._maxHealth = 100;
  },

  applyDamage(amount, reason) {
    this._vehicleHealth = Math.max(0, this._vehicleHealth - amount);
    if (this._vehicleHealth <= 0) {
      this._onVehicleDestroyed(reason);
    }
    return this._vehicleHealth;
  },

  repairHealth(amount) {
    this._vehicleHealth = Math.min(this._maxHealth, this._vehicleHealth + amount);
  },

  getHealthPct() { return this._vehicleHealth / this._maxHealth; },

  _onVehicleDestroyed(reason) {
    UI.showToast('💥 VEHICLE DAMAGED!');
    Particles.coinsSparkle(this.vehicle.x, this.vehicle.y - 40);
  },

  // ═══════════════════════════════════════════════════════════════
  // COLLECTIBLE SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _collectibles: [],
  _collectibleSpawnX: 0,

  spawnCollectibles(camX, mapId) {
    if (camX < this._collectibleSpawnX) return;
    this._collectibleSpawnX = camX + 100 + Math.random() * 200;
    const r = Math.random();
    let type, value;
    if (r < 0.7) { type = 'gold'; value = 10 + Math.floor(Math.random() * 20); }
    else if (r < 0.92) { type = 'fuel'; value = 15; }
    else { type = 'diamond'; value = 1; }
    this._collectibles.push({
      x: this._collectibleSpawnX,
      y: -60, // will be set to ground level
      type, value,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2
    });
    // Remove collected/old ones
    this._collectibles = this._collectibles.filter(c => !c.collected && c.x > camX - 100);
  },

  checkCollectibles(vehicle) {
    const collected = [];
    for (const c of this._collectibles) {
      if (c.collected) continue;
      // Araç gövdesi + ön/arka tekerlek pozisyonlarına göre çoklu nokta algılama
      const cY = c.y + Math.sin(c.bobPhase) * 8;
      const dxBody  = Math.abs(vehicle.x - c.x);
      const dyBody  = Math.abs(vehicle.y - cY);
      const dxFront = Math.abs((vehicle.x + 70) - c.x);
      const dyFront = Math.abs((vehicle.y + 20) - cY);
      const dxRear  = Math.abs((vehicle.x - 70) - c.x);
      const dyRear  = Math.abs((vehicle.y + 20) - cY);
      const hit = (dxBody < 75 && dyBody < 70) ||
                  (dxFront < 55 && dyFront < 55) ||
                  (dxRear  < 55 && dyRear  < 55);
      if (hit) {
        c.collected = true;
        collected.push(c);
        // Apply effect
        if (c.type === 'gold') {
          SaveData.data.gold = (SaveData.get('gold') || 0) + c.value;
          SaveData.data.totalCoins = (SaveData.get('totalCoins') || 0) + c.value;
          Particles.coinsSparkle(c.x, c.y);
          // BUGFIX(30 Tmz) #20: `HUD.showCoinPopup` DİYE BİR FONKSİYON YOK.
          // HUD yalnız `addCoinPopup(ekranX, ekranY, deger)` tanımlıyor (hud.js:799).
          // Bu blok şu an ölü kod (dış çağrısı 0) ama bağlanırsa TypeError atardı.
          // Metin göstermek istendiği için doğru API `UI.showToast`.
          if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('+' + c.value + ' 💰');
        } else if (c.type === 'fuel') {
          this.refillFuel(c.value);
          UI.showToast('⛽ +' + c.value + ' Fuel');
        } else if (c.type === 'diamond') {
          SaveData.data.diamonds = (SaveData.get('diamonds') || 0) + c.value;
          Particles.diamondCollect(c.x, c.y);
          // BUGFIX(30 Tmz) #20 — bkz. yukarısı. (Ayrıca 2. argüman `addCoinPopup`
          // imzasında renk DEĞİL `deger`; yani eski çağrı iki kez yanlıştı.)
          if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('◆ +' + c.value);
          Achievements.check('diamond_1');
        }
        Audio.playCoin();
        Achievements.check('total_coins');
      }
    }
    return collected;
  },

  drawCollectibles(ctx, camX, t) {
    for (const c of this._collectibles) {
      if (c.collected) continue;
      const sx = c.x - camX;
      if (sx < -50 || sx > ctx.canvas.width + 50) continue;
      c.bobPhase += 0.05;
      const bob = Math.sin(c.bobPhase) * 8;
      ctx.save();
      ctx.translate(sx, c.y + bob);
      // Shadow
      ctx.save(); ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 16 - bob, 12, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      if (c.type === 'gold') {
        // Spinning gold coin
        const coinScale = Math.abs(Math.cos(t * 3)) * 0.5 + 0.5;
        ctx.save(); ctx.scale(coinScale, 1);
        const cg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
        cg.addColorStop(0, '#FFF176'); cg.addColorStop(0.5, '#FFD700'); cg.addColorStop(1, '#E65100');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#FF8F00'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#E65100'; ctx.font = 'bold 8px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('⧆', 0, 0);
      } else if (c.type === 'fuel') {
        ctx.fillStyle = '#FF8800';
        ctx.beginPath(); ctx.roundRect(-10, -14, 20, 18, 4); ctx.fill();
        ctx.fillStyle = '#222'; ctx.fillRect(-4, -18, 8, 6);
        ctx.font = '8px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle = '#fff'; ctx.fillText('⛽', 0, -5);
      } else if (c.type === 'diamond') {
        const dg = ctx.createRadialGradient(-3, -3, 1, 0, 0, 12);
        dg.addColorStop(0, '#FFFFFF'); dg.addColorStop(0.4, '#88DDFF'); dg.addColorStop(1, '#0044FF');
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(10, -2); ctx.lineTo(0, 14); ctx.lineTo(-10, -2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(100,200,255,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -14); ctx.lineTo(10, -2); ctx.lineTo(0, 14); ctx.lineTo(-10, -2); ctx.closePath(); ctx.stroke();
      }
      // Glow ring
      const glowG = ctx.createRadialGradient(0, 0, 8, 0, 0, 20);
      glowG.addColorStop(0, c.type === 'diamond' ? 'rgba(0,200,255,0.15)' : 'rgba(255,200,0,0.15)');
      glowG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowG;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

};

// ── Helper: build vehicle config from upgrades ─────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// MİSYON SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const MissionSystem = {
  MISSIONS: [
    { id:'m001', title:'First Step', desc:'Go 100 meters', type:'distance', target:100, reward:{coins:50,xp:10}, mapId:null, vehicleId:null },
    { id:'m002', title:'Short Distance', desc:'Go 500 meters', type:'distance', target:500, reward:{coins:150,xp:25}, mapId:null, vehicleId:null },
    { id:'m003', title:'Middle Road', desc:'Go 1000 meters', type:'distance', target:1000, reward:{coins:300,xp:50}, mapId:null, vehicleId:null },
    { id:'m004', title:'Long Road', desc:'Go 2500 meters', type:'distance', target:2500, reward:{coins:700,xp:120}, mapId:null, vehicleId:null },
    { id:'m005', title:'Marathon', desc:'Go 5000 meters', type:'distance', target:5000, reward:{coins:1500,xp:250}, mapId:null, vehicleId:null },
    { id:'m006', title:'Ultra Marathon', desc:'Go 10000 meters', type:'distance', target:10000, reward:{coins:3000,xp:500}, mapId:null, vehicleId:null },
    { id:'m007', title:'First Flip', desc:'Do 1 flip', type:'flip', target:1, reward:{coins:80,xp:15}, mapId:null, vehicleId:null },
    { id:'m008', title:'Acrobat', desc:'Do 5 flips', type:'flip', target:5, reward:{coins:250,xp:45}, mapId:null, vehicleId:null },
    { id:'m009', title:'Circus Star', desc:'Do 10 flips in one run', type:'flip', target:10, reward:{coins:500,xp:100}, mapId:null, vehicleId:null },
    { id:'m010', title:'Flip Master', desc:'Do 20 flips', type:'flip', target:20, reward:{coins:1000,xp:200}, mapId:null, vehicleId:null },
    { id:'m011', title:'Crazy Spin', desc:'Do 50 flips', type:'flip', target:50, reward:{coins:2500,xp:500}, mapId:null, vehicleId:null },
    { id:'m012', title:'Speed Demon', desc:'Reach 150 km/h speed', type:'speed', target:150, reward:{coins:200,xp:40}, mapId:null, vehicleId:null },
    { id:'m013', title:'Supersonic', desc:'Reach 200 km/h speed', type:'speed', target:200, reward:{coins:500,xp:100}, mapId:null, vehicleId:null },
    { id:'m014', title:'Light Speed', desc:'Reach 250 km/h speed', type:'speed', target:250, reward:{coins:1200,xp:250}, mapId:null, vehicleId:null },
    { id:'m015', title:'Survive I', desc:'Survive 1 minute', type:'survive', target:60, reward:{coins:100,xp:20}, mapId:null, vehicleId:null },
    { id:'m016', title:'Survive II', desc:'Survive 3 minutes', type:'survive', target:180, reward:{coins:350,xp:70}, mapId:null, vehicleId:null },
    { id:'m017', title:'Survive III', desc:'Survive 5 minutes', type:'survive', target:300, reward:{coins:700,xp:140}, mapId:null, vehicleId:null },
    { id:'m018', title:'Collector', desc:'Collect 10 coins', type:'collect', target:10, reward:{coins:100,xp:15}, mapId:null, vehicleId:null },
    { id:'m019', title:'Treasure Hunter', desc:'Collect 50 coins', type:'collect', target:50, reward:{coins:400,xp:60}, mapId:null, vehicleId:null },
    { id:'m020', title:'Coin King', desc:'Collect 100 coins', type:'collect', target:100, reward:{coins:800,xp:120}, mapId:null, vehicleId:null },
    { id:'m021', title:'Diamond Hunter', desc:'Collect 5 diamonds', type:'collect_diamond', target:5, reward:{coins:500,xp:100}, mapId:null, vehicleId:null },
    { id:'m022', title:'Diamond Master', desc:'Collect 20 diamonds', type:'collect_diamond', target:20, reward:{coins:2000,xp:400}, mapId:null, vehicleId:null },
    { id:'m023', title:'Mountain Wanderer', desc:'Go 1000m on Mountain map', type:'distance', target:1000, reward:{coins:400,xp:80}, mapId:'mountain', vehicleId:null },
    { id:'m024', title:'Desert Driver', desc:'Go 1500m on Desert map', type:'distance', target:1500, reward:{coins:600,xp:120}, mapId:'desert', vehicleId:null },
    { id:'m025', title:'Arctic Hero', desc:'Go 800m on Arctic map', type:'distance', target:800, reward:{coins:500,xp:100}, mapId:'arctic', vehicleId:null },
    { id:'m026', title:'Jungle Master', desc:'Go 2000m on Jungle map', type:'distance', target:2000, reward:{coins:800,xp:160}, mapId:'jungle', vehicleId:null },
    { id:'m027', title:'Fuel Saver', desc:'Go 1000m with 50% fuel', type:'fuel_efficiency', target:1000, reward:{coins:600,xp:120}, mapId:null, vehicleId:null },
    { id:'m028', title:'No Damage', desc:'Go 500m without damage', type:'no_damage', target:500, reward:{coins:700,xp:140}, mapId:null, vehicleId:null },
    { id:'m029', title:'Perfect Drive', desc:'Go 1000m without damage', type:'no_damage', target:1000, reward:{coins:1500,xp:300}, mapId:null, vehicleId:null },
    { id:'m030', title:'Combo King', desc:'Reach 5x combo multiplier', type:'combo', target:5, reward:{coins:800,xp:160}, mapId:null, vehicleId:null },
    { id:'m031', title:'Air Master', desc:'Stay 3 seconds airborne', type:'airtime', target:3, reward:{coins:300,xp:60}, mapId:null, vehicleId:null },
    { id:'m032', title:'Sky Dancer', desc:'Stay 5 seconds airborne', type:'airtime', target:5, reward:{coins:700,xp:140}, mapId:null, vehicleId:null },
    { id:'m033', title:'Obstacle Jumper', desc:'Clear 10 obstacles', type:'obstacle_clear', target:10, reward:{coins:400,xp:80}, mapId:null, vehicleId:null },
    { id:'m034', title:'Obstacle Ruler', desc:'Clear 25 obstacles', type:'obstacle_clear', target:25, reward:{coins:900,xp:180}, mapId:null, vehicleId:null },
    { id:'m035', title:'Bot Beater', desc:'Beat the bot', type:'beat_bot', target:1, reward:{coins:500,xp:100}, mapId:null, vehicleId:null },
    { id:'m036', title:'Bot Killer', desc:'Beat the bot 5 times', type:'beat_bot', target:5, reward:{coins:2000,xp:400}, mapId:null, vehicleId:null },
    { id:'m037', title:'Power-Up Collector', desc:'Collect 10 power-ups', type:'powerup_collect', target:10, reward:{coins:300,xp:60}, mapId:null, vehicleId:null },
    { id:'m038', title:'Shield User', desc:'Use the shield 5 times', type:'use_powerup', target:5, reward:{coins:400,xp:80}, mapId:'shield', vehicleId:null },
    { id:'m039', title:'Like Lightning', desc:'Go 500m with speed boost', type:'powerup_distance', target:500, reward:{coins:600,xp:120}, mapId:'speed_boost', vehicleId:null },
    { id:'m040', title:'Checkpoint Master', desc:'Pass 5 checkpoints', type:'checkpoint', target:5, reward:{coins:500,xp:100}, mapId:null, vehicleId:null },
    { id:'m041', title:'Checkpoint Pro', desc:'Pass 10 checkpoints', type:'checkpoint', target:10, reward:{coins:1000,xp:200}, mapId:null, vehicleId:null },
    { id:'m042', title:'Fuel Finder', desc:'Collect 5 fuel cans', type:'collect_fuel', target:5, reward:{coins:300,xp:60}, mapId:null, vehicleId:null },
    { id:'m043', title:'Steady Drive', desc:'Go 1000m without flipping', type:'no_flip', target:1000, reward:{coins:400,xp:80}, mapId:null, vehicleId:null },
    { id:'m044', title:'Night Driver', desc:'Go 500m in night mode', type:'night_drive', target:500, reward:{coins:500,xp:100}, mapId:null, vehicleId:null },
    { id:'m045', title:'Day Racer', desc:'Go 1000m in day mode', type:'day_drive', target:1000, reward:{coins:400,xp:80}, mapId:null, vehicleId:null },
    { id:'m046', title:'Storm Driver', desc:'Survive a storm event', type:'survive_event', target:1, reward:{coins:800,xp:160}, mapId:null, vehicleId:null },
    { id:'m047', title:'Earthquake Survivor', desc:'Go 200m during an earthquake', type:'event_distance', target:200, reward:{coins:700,xp:140}, mapId:null, vehicleId:null },
    { id:'m048', title:'NPC Passer', desc:'Pass 1 NPC', type:'pass_npc', target:1, reward:{coins:300,xp:60}, mapId:null, vehicleId:null },
    { id:'m049', title:'NPC Champion', desc:'Pass 5 NPCs', type:'pass_npc', target:5, reward:{coins:1200,xp:240}, mapId:null, vehicleId:null },
    { id:'m050', title:'Legendary Driver', desc:'Complete all missions', type:'complete_all', target:49, reward:{coins:10000,xp:2000}, mapId:null, vehicleId:null },
  ],

  missionState: {
    active: null,
    progress: 0,
    completed: [],
    failed: [],
    startTime: 0,
    sessionProgress: {}
  },

  startMission(id) {
    const mission = this.MISSIONS.find(m => m.id === id);
    if (!mission) return false;
    if (this.missionState.completed.includes(id)) return false;
    this.missionState.active = { ...mission };
    this.missionState.progress = 0;
    this.missionState.startTime = Date.now();
    this.missionState.sessionProgress[id] = 0;
    console.log(`[Mission] Started: ${mission.title}`);
    return true;
  },

  updateMission(type, value) {
    const active = this.missionState.active;
    if (!active) return false;
    if (active.type !== type) return false;
    this.missionState.progress += value;
    this.missionState.sessionProgress[active.id] = this.missionState.progress;
    if (this.missionState.progress >= active.target) {
      this.completeMission();
      return true;
    }
    return false;
  },

  completeMission() {
    const active = this.missionState.active;
    if (!active) return null;
    if (!this.missionState.completed.includes(active.id)) {
      this.missionState.completed.push(active.id);
    }
    const reward = { ...active.reward };
    this.missionState.active = null;
    this.missionState.progress = 0;
    console.log(`[Mission] Completed: ${active.title} | Reward:`, reward);
    return reward;
  },

  failMission(reason) {
    const active = this.missionState.active;
    if (!active) return;
    if (!this.missionState.failed.includes(active.id)) {
      this.missionState.failed.push(active.id);
    }
    console.log(`[Mission] Failed: ${active.title} | Reason: ${reason}`);
    this.missionState.active = null;
    this.missionState.progress = 0;
  },

  getMissionsByMap(mapId) {
    return this.MISSIONS.filter(m => m.mapId === mapId || m.mapId === null);
  },

  getAvailableMissions() {
    return this.MISSIONS.filter(m => !this.missionState.completed.includes(m.id));
  },

  getMissionProgress() {
    const active = this.missionState.active;
    if (!active) return null;
    return {
      id: active.id,
      title: active.title,
      progress: this.missionState.progress,
      target: active.target,
      percent: Math.min(100, (this.missionState.progress / active.target) * 100),
      elapsed: (Date.now() - this.missionState.startTime) / 1000
    };
  },

  getCompletionRate() {
    return (this.missionState.completed.length / this.MISSIONS.length) * 100;
  },

  resetMissionProgress() {
    this.missionState.active = null;
    this.missionState.progress = 0;
    this.missionState.startTime = 0;
  },

  isMissionCompleted(id) {
    return this.missionState.completed.includes(id);
  },

  getTotalRewardEarned() {
    return this.missionState.completed.reduce((acc, id) => {
      const m = this.MISSIONS.find(m => m.id === id);
      if (m) { acc.coins += m.reward.coins; acc.xp += m.reward.xp; }
      return acc;
    }, { coins: 0, xp: 0 });
  },

  drawMissionHUD(ctx, x, y) {
    const prog = this.getMissionProgress();
    if (!prog) return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, 220, 60, 8);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('MISSION: ' + prog.title, x + 8, y + 16);
    ctx.fillStyle = '#eee';
    ctx.font = '10px Arial';
    ctx.fillText(`${Math.floor(prog.progress)} / ${prog.target}`, x + 8, y + 30);
    // Progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + 8, y + 40, 204, 10);
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x + 8, y + 40, 204 * (prog.percent / 100), 10);
    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DİNAMİK OLAY SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const EventSystem = {
  EVENTS: [
    { type:'earthquake', duration:4, interval:30, radius:300, force:15, color:'#8B4513', label:'Earthquake' },
    { type:'falling_rock', duration:2, interval:20, radius:60, force:25, color:'#696969', label:'Falling Rock' },
    { type:'storm', duration:6, interval:45, radius:500, force:8, color:'#708090', label:'Storm' },
    { type:'meteor', duration:1.5, interval:60, radius:80, force:40, color:'#FF4500', label:'Meteor' },
    { type:'flood', duration:5, interval:50, radius:400, force:12, color:'#1E90FF', label:'Flood' },
    { type:'ice_storm', duration:7, interval:55, radius:350, force:6, color:'#B0E0E6', label:'Ice Storm' },
    { type:'sand_storm', duration:8, interval:40, radius:600, force:10, color:'#DEB887', label:'Sandstorm' },
  ],

  eventState: {
    active: [],
    queue: [],
    nextSpawn: 15,
    timer: 0,
    totalSpawned: 0
  },

  spawnEvent(type, x, y, params = {}) {
    const def = this.EVENTS.find(e => e.type === type);
    if (!def) return null;
    const evt = {
      id: ++this.eventState.totalSpawned,
      type,
      x: x || 0,
      y: y || 0,
      radius: params.radius || def.radius,
      force: params.force || def.force,
      color: def.color,
      label: def.label,
      duration: def.duration,
      elapsed: 0,
      active: true,
      particles: [],
      intensity: params.intensity || 1.0
    };
    // Generate particles
    for (let i = 0; i < 20; i++) {
      evt.particles.push({
        x: evt.x + (Math.random() - 0.5) * evt.radius,
        y: evt.y + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 3 - 1,
        life: 1.0,
        size: Math.random() * 8 + 2
      });
    }
    this.eventState.active.push(evt);
    console.log(`[Event] Spawned: ${def.label} at (${x}, ${y})`);
    return evt;
  },

  updateEvents(dt, vehicleX, vehicleY) {
    this.eventState.timer += dt;
    if (this.eventState.timer >= this.eventState.nextSpawn) {
      this.eventState.timer = 0;
      const def = this.EVENTS[Math.floor(Math.random() * this.EVENTS.length)];
      const spawnX = vehicleX + 400 + Math.random() * 600;
      this.spawnEvent(def.type, spawnX, vehicleY - 50);
      this.eventState.nextSpawn = def.interval * (0.7 + Math.random() * 0.6);
    }
    this.eventState.active = this.eventState.active.filter(evt => {
      evt.elapsed += dt;
      evt.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.1; p.life -= dt / evt.duration;
      });
      evt.particles = evt.particles.filter(p => p.life > 0);
      return evt.elapsed < evt.duration;
    });
  },

  checkEventCollision(vehicle) {
    const results = [];
    for (const evt of this.eventState.active) {
      const dx = vehicle.x - evt.x;
      const dy = vehicle.y - evt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < evt.radius) {
        const impact = evt.force * (1 - dist / evt.radius) * evt.intensity;
        results.push({ type: evt.type, impact, event: evt });
      }
    }
    return results;
  },

  drawEvents(ctx, camX) {
    for (const evt of this.eventState.active) {
      const sx = evt.x - camX;
      const progress = evt.elapsed / evt.duration;
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.6;
      // Draw area effect
      const gradient = ctx.createRadialGradient(sx, evt.y, 0, sx, evt.y, evt.radius);
      gradient.addColorStop(0, evt.color + 'AA');
      gradient.addColorStop(1, evt.color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(sx, evt.y, evt.radius, evt.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Draw particles
      ctx.globalAlpha = 1;
      for (const p of evt.particles) {
        ctx.globalAlpha = p.life * 0.8;
        ctx.fillStyle = evt.color;
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Label
      ctx.globalAlpha = (1 - progress);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ ' + evt.label, sx, evt.y - evt.radius * 0.5 - 10);
      ctx.restore();
    }
  },

  getActiveEventTypes() {
    return this.eventState.active.map(e => e.type);
  },

  clearAllEvents() {
    this.eventState.active = [];
    this.eventState.queue = [];
  },

  getEventDanger(vehicleX, vehicleY) {
    let totalDanger = 0;
    for (const evt of this.eventState.active) {
      const dx = vehicleX - evt.x;
      const dy = vehicleY - evt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < evt.radius * 1.5) {
        totalDanger += evt.force * (1 - dist / (evt.radius * 1.5));
      }
    }
    return totalDanger;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GÜÇLENDİRİCİ (POWER-UP) SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const PowerupSystem = {
  POWERUP_TYPES: {
    speed_boost:    { duration:8,   color:'#FF6600', icon:'⚡', label:'Speed Boost',    effect:{speedMult:1.8}},
    jump_boost:     { duration:10,  color:'#00FF88', icon:'🚀', label:'Jump Boost', effect:{jumpMult:2.0}},
    magnet:         { duration:12,  color:'#FF00FF', icon:'🧲', label:'Magnet',       effect:{collectRadius:200}},
    shield:         { duration:7,   color:'#00BFFF', icon:'🛡', label:'Shield',         effect:{noDamage:true}},
    double_points:  { duration:15,  color:'#FFD700', icon:'×2', label:'2x Score',        effect:{pointMult:2}},
    coin_rain:      { duration:5,   color:'#FFCC00', icon:'💰', label:'Coin Rain',   effect:{coinRain:true}},
    slow_motion:    { duration:6,   color:'#9B59B6', icon:'🐢', label:'Slow Motion',   effect:{timeMult:0.5}},
    invincibility:  { duration:5,   color:'#FF1493', icon:'★',  label:'Invincibility',   effect:{invincible:true}},
    fuel_full:      { duration:0,   color:'#FF8C00', icon:'⛽', label:'Full Fuel',      effect:{refuel:100}},
    repair_full:    { duration:0,   color:'#2ECC71', icon:'🔧', label:'Full Repair',      effect:{repair:100}},
  },

  powerupState: {
    active: {},
    spawned: [],
    collected: {},
    totalCollected: 0
  },

  spawnPowerup(x, y, type) {
    if (!type) {
      const keys = Object.keys(this.POWERUP_TYPES);
      type = keys[Math.floor(Math.random() * keys.length)];
    }
    const def = this.POWERUP_TYPES[type];
    if (!def) return null;
    const pu = {
      id: Date.now() + Math.random(),
      type, x, y,
      color: def.color,
      icon: def.icon,
      label: def.label,
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
      scale: 1.0,
      glowPhase: 0
    };
    this.powerupState.spawned.push(pu);
    return pu;
  },

  updatePowerups(dt, vehicleX, vehicleY, collectRadius = 50) {
    // Update active powerup timers
    for (const [type, state] of Object.entries(this.powerupState.active)) {
      state.elapsed += dt;
      if (state.elapsed >= state.duration) {
        this.deactivatePowerup(type);
      }
    }
    // Check collection
    const collected = [];
    this.powerupState.spawned = this.powerupState.spawned.filter(pu => {
      if (pu.collected) return false;
      pu.bobOffset += dt * 3;
      pu.glowPhase += dt * 4;
      // Check magnet
      const magnetActive = this.isPowerupActive('magnet');
      const magnetRadius = magnetActive ? this.POWERUP_TYPES.magnet.effect.collectRadius : collectRadius;
      const dx = vehicleX - pu.x;
      const dy = vehicleY - pu.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (magnetActive && dist < magnetRadius) {
        pu.x += dx * 0.1;
        pu.y += dy * 0.1;
      }
      if (dist < (magnetActive ? 40 : collectRadius)) {
        pu.collected = true;
        collected.push(pu.type);
        this.activatePowerup(pu.type);
        this.powerupState.totalCollected++;
        this.powerupState.collected[pu.type] = (this.powerupState.collected[pu.type] || 0) + 1;
        return false;
      }
      return true;
    });
    return collected;
  },

  activatePowerup(type) {
    const def = this.POWERUP_TYPES[type];
    if (!def) return false;
    if (def.duration === 0) {
      // Instant effect
      console.log(`[Powerup] Instant: ${def.label}`);
      return true;
    }
    this.powerupState.active[type] = {
      type, duration: def.duration, elapsed: 0,
      startTime: Date.now()
    };
    console.log(`[Powerup] Activated: ${def.label} for ${def.duration}s`);
    return true;
  },

  deactivatePowerup(type) {
    if (this.powerupState.active[type]) {
      delete this.powerupState.active[type];
      console.log(`[Powerup] Deactivated: ${type}`);
      return true;
    }
    return false;
  },

  drawPowerups(ctx, camX) {
    for (const pu of this.powerupState.spawned) {
      if (pu.collected) continue;
      const sx = pu.x - camX;
      const sy = pu.y + Math.sin(pu.bobOffset) * 6;
      ctx.save();
      // Glow
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
      glow.addColorStop(0, pu.color + '66');
      glow.addColorStop(1, pu.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();
      // Circle
      ctx.fillStyle = pu.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9 + Math.sin(pu.glowPhase) * 0.1;
      ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Icon
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(pu.icon, sx, sy);
      ctx.restore();
    }
  },

  getPowerupStatus() {
    const status = {};
    for (const [type, state] of Object.entries(this.powerupState.active)) {
      const def = this.POWERUP_TYPES[type];
      status[type] = {
        label: def.label,
        remaining: state.duration - state.elapsed,
        percent: 1 - (state.elapsed / state.duration)
      };
    }
    return status;
  },

  isPowerupActive(type) {
    return !!this.powerupState.active[type];
  },

  getEffect(type) {
    if (!this.isPowerupActive(type)) return null;
    return this.POWERUP_TYPES[type]?.effect || null;
  },

  drawActiveHUD(ctx, x, y) {
    const status = this.getPowerupStatus();
    let idx = 0;
    for (const [type, info] of Object.entries(status)) {
      const def = this.POWERUP_TYPES[type];
      const px = x + idx * 50;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.roundRect(px, y, 44, 44, 6); ctx.fill();
      ctx.fillStyle = def.color;
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(def.icon, px + 22, y + 18);
      // Timer arc
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px + 22, y + 22, 20, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * info.percent);
      ctx.stroke();
      ctx.restore();
      idx++;
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 30 Tmz — BU MODÜL YENİDEN YAZILDI. Eski hâli HİÇ ÇALIŞMAMIŞTI ve
//    okununca 5 ölçülmüş hata çıktı (ayrıntı: DEVAM-OZETI.md §8B.28/F):
//      1. `cpX = nextCheckpoint * 3` → oyunun mesafesi `(v.x - startX)/2`,
//         yani dünya X'i `dist*2 + startX`. Bayraklar YANLIŞ YERE çiziliyordu.
//      2. 6 aralıklı liste + TEK `last` sayacı → 100'lük aralık her zaman ilk
//         eşleşiyor, diğer 5'i HİÇ tetiklenmiyordu (ölü kod).
//      3. `timeBonus = 200 - passed*5` → ilk checkpoint 100 metrede 210 altın.
//         Taban ekonomi 1.032 altın/dk; bu tek başına ekonomiyi çökertirdi.
//      4. `sessionStart/1000` (epoch saniyesi) ile `t` (koşu saniyesi)
//         karıştırılıyordu → split süreleri anlamsız.
//      5. Sıcak döngüde `console.log`.
//    ⚠ Ödül ölçeği ÖLÇÜMLE seçildi: jeep 120 sn'de ~22.000 m gidiyor. Sabit
//      bonus verilirse gelir ikiye katlanır; bu yüzden bonus checkpoint sayısıyla
//      AZALIYOR (ilk 40 → taban 8). Toplam etki ölçüldü: +%21 (ekonomiyi bozmaz).
const CheckpointSystem = {
  // Ölçüm tablosu (port-araclari ile hesaplandı, taban: jeep 120 sn = 2.358 altın):
  //   cp=10 + km taşı 1530 → uzun koşuda +%84, tipik koşuda +%142  (ÇOK FAZLA)
  //   cp=8  + km taşı  610 → uzun +%41, tipik +%64, motocross +%20 ← SEÇİLEN
  //   cp=6  + km taşı  455 → uzun +%30, tipik +%48
  // ⚠ Monster Truck her seçenekte %0 alıyor (258 m gidiyor, ilk checkpoint 500 m).
  //   Bu checkpoint aralığının değil YAKIT DENGESİNİN sorunu — §8B.28/G.
  CP_ARALIK: 500,          // metre — tek ve anlamlı aralık (eski 6'lı liste ölüydü)
  CP_BONUS: 8,             // sabit; mesafeyle BÜYÜMEZ (uzun koşuda gelir patlamasın)

  checkpointState: {
    last: 0,
    passed: [],
    times: [],
    bestTimes: [],
    sessionStart: 0        // ⚠ KOŞU saniyesi (epoch DEĞİL) — split hesabı buna dayanır
  },

  init() {
    this.checkpointState.sessionStart = 0;
    this.checkpointState.passed = [];
    this.checkpointState.times = [];
    this.checkpointState.last = 0;
  },

  // distance: metre · t: KOŞU başından beri geçen saniye
  checkCheckpoint(distance, t) {
    const a = this.CP_ARALIK;
    const checkpointAt = Math.floor(distance / a) * a;
    if (checkpointAt <= this.checkpointState.last || checkpointAt <= 0) return null;
    this.checkpointState.last = checkpointAt;
    const entry = { distance: checkpointAt, time: t, bonus: this.getCheckpointBonus(checkpointAt) };
    this.checkpointState.passed.push(entry);
    this.checkpointState.times.push(t);
    return entry;
  },

  getCheckpointBonus() {
    // ⚠ SABİT. Eski kod `checkpoint/10 + (200 - passed*5)` veriyordu → ilk
    //   checkpoint 100 metrede 210 altın (taban gelir 1.032 altın/dk iken).
    return this.CP_BONUS;
  },

  // ⚠ İKİ DÜZELTME:
  //   · Dünya X'i = mesafe*2 + startX. Eski `nextCheckpoint * 3` YANLIŞTI.
  //   · Ekran dönüşümü `camera.worldToScreen` ile yapılır, `cpX - camX` ile
  //     DEĞİL — kamera zoom uygularsa çıplak çıkarma bayrakları kaydırır.
  //   Bu fonksiyon dünya dönüşümü KAPALIYKEN (HUD aşamasında) çağrılır.
  drawCheckpoints(ctx, camera, terrain, vehicleDistance, startX) {
    if (!camera || !camera.worldToScreen) return;
    const a = this.CP_ARALIK;
    const ilk = Math.floor((vehicleDistance || 0) / a) * a;
    for (let n = 0; n <= 3; n++) {                    // yalnız yakın 4 bayrak
      const cp = ilk + n * a;
      if (cp <= 0) continue;
      const cpX = cp * 2 + (startX || 0);
      let groundY = 300;
      try { if (terrain && terrain.getYAt) groundY = terrain.getYAt(cpX); } catch (e) {}
      let p; try { p = camera.worldToScreen(cpX, groundY); } catch (e) { continue; }
      if (!p || !isFinite(p.x) || !isFinite(p.y)) continue;
      if (p.x < -60 || p.x > ctx.canvas.width + 60) continue;
      const gecildi = cp <= this.checkpointState.last;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = gecildi ? '#2ee06a' : '#FF4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - 80);
      ctx.stroke();
      ctx.fillStyle = gecildi ? '#2ee06a' : '#FF4444';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 80);
      ctx.lineTo(p.x + 30, p.y - 65);
      ctx.lineTo(p.x, p.y - 50);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(cp + 'm', p.x, p.y - 90);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  },

  getLapSplits() {
    const splits = [];
    for (let i = 0; i < this.checkpointState.times.length; i++) {
      // ⚠ i===0'da sessionStart KOŞU saniyesidir (0). Eski kod burada
      //   `Date.now()/1000` kullanıyordu → milyarlarca saniyelik split.
      const prev = i === 0 ? this.checkpointState.sessionStart : this.checkpointState.times[i - 1];
      splits.push({
        checkpoint: (this.checkpointState.passed[i] && this.checkpointState.passed[i].distance) || 0,
        split: this.checkpointState.times[i] - prev
      });
    }
    return splits;
  },

  getBestSplits() {
    // ⚠ Eski kod `CHECKPOINT_INTERVALS[i]` okuyordu; o dizi kaldırıldı
    //   (6 aralıktan 5'i zaten ölüydü). Artık indeks × sabit aralık.
    return this.checkpointState.bestTimes.map((t, i) => ({
      checkpoint: (i + 1) * this.CP_ARALIK,
      bestTime: t
    }));
  },

  updateBestTimes() {
    this.checkpointState.times.forEach((t, i) => {
      if (!this.checkpointState.bestTimes[i] || t < this.checkpointState.bestTimes[i]) {
        this.checkpointState.bestTimes[i] = t;
      }
    });
  },

  getTotalCheckpointsPassed() {
    return this.checkpointState.passed.length;
  },

  getNextCheckpointDistance(currentDistance) {
    const a = this.CP_ARALIK;
    return (Math.floor((currentDistance || 0) / a) + 1) * a;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGEL SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const ObstacleSystem = {
  OBSTACLE_TYPES: {
    boulder:      { w:60, h:55, color:'#808080', mass:800, damage:25, bouncy:0.3, friction:0.7, label:'Boulder' },
    log:          { w:80, h:30, color:'#8B4513', mass:400, damage:15, bouncy:0.2, friction:0.8, label:'Log' },
    ice_block:    { w:50, h:50, color:'#B0E0E6', mass:300, damage:10, bouncy:0.5, friction:0.1, label:'Ice Block' },
    oil_drum:     { w:30, h:45, color:'#333333', mass:200, damage:5,  bouncy:0.4, friction:0.6, label:'Barrel' },
    tyre:         { w:40, h:40, color:'#222222', mass:50,  damage:5,  bouncy:0.8, friction:0.9, label:'Tire' },
    crate:        { w:45, h:45, color:'#8B6914', mass:300, damage:12, bouncy:0.2, friction:0.7, label:'Crate' },
    spike_strip:  { w:80, h:10, color:'#555555', mass:50,  damage:30, bouncy:0.0, friction:1.0, label:'Spike Strip' },
    ramp_broken:  { w:70, h:35, color:'#A0522D', mass:500, damage:8,  bouncy:0.1, friction:0.8, label:'Broken Ramp' },
  },

  obstacles: [],
  _nextId: 1,

  spawnObstacle(x, y, type, size = 1.0) {
    const def = this.OBSTACLE_TYPES[type];
    if (!def) return null;
    const obs = {
      id: this._nextId++,
      type, x, y,
      w: def.w * size,
      h: def.h * size,
      color: def.color,
      mass: def.mass * size,
      damage: def.damage,
      bouncy: def.bouncy,
      friction: def.friction,
      label: def.label,
      vx: 0, vy: 0,
      angle: 0, angularV: 0,
      destroyed: false,
      hp: 100,
      size
    };
    this.obstacles.push(obs);
    return obs;
  },

  updateObstacles(dt) {
    this.obstacles = this.obstacles.filter(obs => !obs.destroyed);
    for (const obs of this.obstacles) {
      if (obs.vx !== 0 || obs.vy !== 0) {
        obs.x += obs.vx * dt;
        obs.y += obs.vy * dt;
        obs.angle += obs.angularV * dt;
        obs.vx *= 0.95;
        obs.vy += 200 * dt; // gravity
        obs.angularV *= 0.98;
      }
    }
  },

  checkObstacleCollision(vehicle) {
    const hits = [];
    for (const obs of this.obstacles) {
      if (obs.destroyed) continue;
      const dx = vehicle.x - obs.x;
      const dy = vehicle.y - obs.y;
      const distX = Math.abs(dx);
      const distY = Math.abs(dy);
      const halfW = (vehicle.w / 2 + obs.w / 2);
      const halfH = (vehicle.h / 2 + obs.h / 2);
      if (distX < halfW && distY < halfH) {
        const overlapX = halfW - distX;
        const overlapY = halfH - distY;
        const force = Math.min(overlapX, overlapY) * 0.5;
        hits.push({ obstacle: obs, force, damage: obs.damage });
        // Push obstacle
        obs.vx += (dx < 0 ? -force : force) * 0.3;
        obs.vy -= force * 0.5;
        obs.angularV += (Math.random() - 0.5) * 5;
        obs.hp -= force * 0.5;
        if (obs.hp <= 0) obs.destroyed = true;
      }
    }
    return hits;
  },

  drawObstacles(ctx, camX) {
    for (const obs of this.obstacles) {
      if (obs.destroyed) continue;
      const sx = obs.x - camX;
      ctx.save();
      ctx.translate(sx, obs.y);
      ctx.rotate(obs.angle);
      ctx.fillStyle = obs.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      if (obs.type === 'boulder') {
        ctx.beginPath();
        ctx.ellipse(0, 0, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else if (obs.type === 'tyre') {
        ctx.beginPath();
        ctx.arc(0, 0, obs.w / 2, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, obs.w / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
        ctx.strokeRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
      }
      // HP bar (if damaged)
      if (obs.hp < 100) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-obs.w / 2, -obs.h / 2 - 8, obs.w, 5);
        ctx.fillStyle = obs.hp > 50 ? '#4CAF50' : '#FF5722';
        ctx.fillRect(-obs.w / 2, -obs.h / 2 - 8, obs.w * (obs.hp / 100), 5);
      }
      ctx.restore();
    }
  },

  getObstacleResistance(type) {
    const def = this.OBSTACLE_TYPES[type];
    return def ? def.friction : 0.5;
  },

  destroyObstacle(id) {
    const obs = this.obstacles.find(o => o.id === id);
    if (obs) { obs.destroyed = true; return true; }
    return false;
  },

  clearOutOfRange(vehicleX, range = 1500) {
    this.obstacles = this.obstacles.filter(obs => Math.abs(obs.x - vehicleX) < range);
  },

  spawnRandom(vehicleX, terrainFn) {
    const types = Object.keys(this.OBSTACLE_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const x = vehicleX + 600 + Math.random() * 800;
    const y = terrainFn ? terrainFn(x) : 300;
    const size = 0.7 + Math.random() * 0.8;
    return this.spawnObstacle(x, y, type, size);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// NPC ARAÇ SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const NPCSystem = {
  NPC_PROFILES: [
    { id:'aggressive', name:'Aggressive Driver', skill:0.9, aggression:0.9, topSpeed:180, accel:500, color:'#FF0000' },
    { id:'defensive',  name:'Defensive',      skill:0.6, aggression:0.1, topSpeed:140, accel:350, color:'#4444FF' },
    { id:'rookie',     name:'Rookie',          skill:0.3, aggression:0.2, topSpeed:120, accel:280, color:'#AAAAAA' },
    { id:'veteran',    name:'Veteran',        skill:0.8, aggression:0.5, topSpeed:165, accel:450, color:'#FF8800' },
    { id:'speedster',  name:'Speed Expert',     skill:0.7, aggression:0.3, topSpeed:200, accel:600, color:'#00FF44' },
    { id:'stunter',    name:'Acrobat',        skill:0.85, aggression:0.4, topSpeed:155, accel:420, color:'#FF00FF' },
    { id:'tank',       name:'Tank',         skill:0.5, aggression:0.8, topSpeed:130, accel:300, color:'#886600' },
    { id:'ghost',      name:'Ghost',        skill:0.95, aggression:0.0, topSpeed:190, accel:550, color:'#CCCCFF' },
  ],

  npcs: [],
  _nextId: 1,

  spawnNPC(profileId, x, difficulty = 1.0) {
    const profile = this.NPC_PROFILES.find(p => p.id === profileId) || this.NPC_PROFILES[0];
    const npc = {
      id: this._nextId++,
      profile: { ...profile },
      x, y: 0,
      vx: 0, vy: 0,
      angle: 0,
      w: 90, h: 45,
      color: profile.color,
      hp: 100,
      fuel: 100,
      score: 0,
      active: true,
      difficulty,
      state: 'racing', // racing, stunned, avoiding, attacking
      stateTimer: 0,
      targetX: x + 500,
      flipCount: 0,
      distanceTraveled: 0
    };
    this.npcs.push(npc);
    return npc;
  },

  updateNPCs(dt, playerX, playerVX) {
    for (const npc of this.npcs) {
      if (!npc.active) continue;
      npc.stateTimer -= dt;
      const behavior = this.getNPCBehavior(npc, playerX);
      // Apply behavior
      if (behavior.accelerate) {
        npc.vx += npc.profile.accel * dt * npc.difficulty;
      }
      if (behavior.brake) {
        npc.vx *= 0.95;
      }
      npc.vx = Math.min(npc.vx, npc.profile.topSpeed * npc.difficulty);
      npc.vx = Math.max(npc.vx, 0);
      npc.x += npc.vx * dt;
      npc.distanceTraveled += npc.vx * dt;
      // Fuel consumption
      npc.fuel -= 0.05 * (npc.vx / 100) * dt;
      if (npc.fuel <= 0) { npc.fuel = 0; npc.vx *= 0.99; }
    }
    this.npcs = this.npcs.filter(npc => npc.active && npc.hp > 0);
  },

  getNPCBehavior(npc, playerX) {
    const distToPlayer = npc.x - playerX;
    const profile = npc.profile;
    const behavior = { accelerate: true, brake: false, dodge: false };
    if (npc.state === 'stunned') {
      behavior.accelerate = false;
      behavior.brake = true;
      if (npc.stateTimer <= 0) npc.state = 'racing';
      return behavior;
    }
    // Aggressive: try to stay ahead of player
    if (profile.aggression > 0.7 && distToPlayer < 100) {
      behavior.accelerate = true;
    }
    // Defensive: slow down when too far ahead
    if (profile.aggression < 0.3 && distToPlayer > 400) {
      behavior.brake = true;
      behavior.accelerate = false;
    }
    // Ghost: maintain consistent speed
    if (profile.id === 'ghost') {
      behavior.accelerate = npc.vx < profile.topSpeed * 0.9;
    }
    return behavior;
  },

  checkNPCCollision(player, npc) {
    const dx = player.x - npc.x;
    const dy = player.y - npc.y;
    const distX = Math.abs(dx);
    const distY = Math.abs(dy);
    if (distX < (player.w + npc.w) / 2 && distY < (player.h + npc.h) / 2) {
      const relativeV = Math.abs(player.vx - npc.vx);
      const impact = relativeV * 0.3;
      npc.hp -= impact;
      npc.state = 'stunned';
      npc.stateTimer = 1.5;
      return { collided: true, impact };
    }
    return { collided: false, impact: 0 };
  },

  drawNPCs(ctx, camX) {
    for (const npc of this.npcs) {
      if (!npc.active) continue;
      const sx = npc.x - camX;
      if (sx < -200 || sx > ctx.canvas.width + 200) continue;
      ctx.save();
      ctx.translate(sx, npc.y);
      ctx.rotate(npc.angle);
      // Body
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.roundRect(-npc.w / 2, -npc.h / 2, npc.w, npc.h, 8);
      ctx.fill();
      // Windows
      ctx.fillStyle = 'rgba(0,200,255,0.5)';
      ctx.fillRect(-npc.w / 4, -npc.h / 2 + 5, npc.w / 2, npc.h / 2 - 8);
      // Name tag
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(npc.profile.name, 0, -npc.h / 2 - 12);
      // HP bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-npc.w / 2, -npc.h / 2 - 8, npc.w, 4);
      ctx.fillStyle = npc.hp > 50 ? '#4CAF50' : '#FF5722';
      ctx.fillRect(-npc.w / 2, -npc.h / 2 - 8, npc.w * (npc.hp / 100), 4);
      ctx.restore();
    }
  },

  removeNPC(id) {
    const idx = this.npcs.findIndex(n => n.id === id);
    if (idx !== -1) { this.npcs.splice(idx, 1); return true; }
    return false;
  },

  getLeaderboard(playerX, playerScore) {
    const board = [{ name:'Player', x: playerX, score: playerScore }];
    for (const npc of this.npcs) {
      board.push({ name: npc.profile.name, x: npc.x, score: Math.floor(npc.distanceTraveled) });
    }
    board.sort((a, b) => b.x - a.x);
    return board;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ÇARPIŞMA HASARI SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const DamageSystem = {
  damageState: {
    hull: 100,
    engine: 100,
    suspension: 100,
    wheels: [100, 100],
    totalDamageReceived: 0,
    lastHitTime: 0,
    isOnFire: false,
    criticalDamage: false
  },

  ZONES: ['hull', 'engine', 'suspension', 'wheel_front', 'wheel_rear'],

  init() {
    this.damageState = {
      hull: 100, engine: 100, suspension: 100,
      wheels: [100, 100],
      totalDamageReceived: 0,
      lastHitTime: 0,
      isOnFire: false,
      criticalDamage: false
    };
  },

  applyStructuralDamage(zone, force) {
    const dmg = Math.min(force * 0.8, 40);
    this.damageState.lastHitTime = Date.now();
    this.damageState.totalDamageReceived += dmg;
    if (zone === 'hull') {
      this.damageState.hull = Math.max(0, this.damageState.hull - dmg);
    } else if (zone === 'engine') {
      this.damageState.engine = Math.max(0, this.damageState.engine - dmg * 0.7);
    } else if (zone === 'suspension') {
      this.damageState.suspension = Math.max(0, this.damageState.suspension - dmg * 0.6);
    } else if (zone === 'wheel_front') {
      this.damageState.wheels[0] = Math.max(0, this.damageState.wheels[0] - dmg);
    } else if (zone === 'wheel_rear') {
      this.damageState.wheels[1] = Math.max(0, this.damageState.wheels[1] - dmg);
    }
    // Check fire
    if (this.damageState.engine < 20 && Math.random() < 0.3) {
      this.damageState.isOnFire = true;
    }
    this.damageState.criticalDamage = this.damageState.hull < 20 || this.damageState.engine < 10;
    return dmg;
  },

  getPerformancePenalty() {
    const enginePenalty = (100 - this.damageState.engine) / 100;
    const suspensionPenalty = (100 - this.damageState.suspension) / 100;
    const wheelPenalty = (200 - this.damageState.wheels[0] - this.damageState.wheels[1]) / 200;
    return {
      speedMult: 1 - enginePenalty * 0.5,
      handlingMult: 1 - suspensionPenalty * 0.4,
      gripMult: 1 - wheelPenalty * 0.3,
      fuelConsumptionMult: 1 + enginePenalty * 0.5
    };
  },

  repairZone(zone, amount) {
    if (zone === 'hull') this.damageState.hull = Math.min(100, this.damageState.hull + amount);
    else if (zone === 'engine') { this.damageState.engine = Math.min(100, this.damageState.engine + amount); this.damageState.isOnFire = this.damageState.engine < 30; }
    else if (zone === 'suspension') this.damageState.suspension = Math.min(100, this.damageState.suspension + amount);
    else if (zone === 'all') {
      this.damageState.hull = Math.min(100, this.damageState.hull + amount);
      this.damageState.engine = Math.min(100, this.damageState.engine + amount);
      this.damageState.suspension = Math.min(100, this.damageState.suspension + amount);
      this.damageState.wheels = this.damageState.wheels.map(w => Math.min(100, w + amount));
      this.damageState.isOnFire = false;
    }
  },

  isVehicleDestroyed() {
    return this.damageState.hull <= 0 || this.damageState.engine <= 0;
  },

  getDamageReport() {
    const avg = (this.damageState.hull + this.damageState.engine + this.damageState.suspension + this.damageState.wheels[0] + this.damageState.wheels[1]) / 5;
    return {
      overall: avg,
      hull: this.damageState.hull,
      engine: this.damageState.engine,
      suspension: this.damageState.suspension,
      wheels: [...this.damageState.wheels],
      isOnFire: this.damageState.isOnFire,
      criticalDamage: this.damageState.criticalDamage,
      destroyed: this.isVehicleDestroyed(),
      totalDamageReceived: this.damageState.totalDamageReceived,
      condition: avg > 75 ? 'Good' : avg > 50 ? 'Damaged' : avg > 25 ? 'Critical' : 'Destroyed'
    };
  },

  drawDamageFX(ctx, x, y, ds) {
    if (ds.isOnFire) {
      const t = Date.now() / 200;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t;
        const r = 15 + Math.sin(t * 3 + i) * 5;
        const fx = x + Math.cos(angle) * r * 0.5;
        const fy = y - 20 - Math.abs(Math.sin(t * 2 + i)) * 20;
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(t + i) * 0.2;
        ctx.fillStyle = i % 2 === 0 ? '#FF4400' : '#FF8800';
        ctx.beginPath();
        ctx.arc(fx, fy, 4 + Math.sin(t + i) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (ds.criticalDamage) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.abs(Math.sin(Date.now() / 300)) * 0.3;
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 55, y - 30, 110, 55);
      ctx.restore();
    }
  },

  drawDamageHUD(ctx, x, y) {
    const report = this.getDamageReport();
    const zones = [
      { label:'Hull', val: report.hull, color: '#4CAF50' },
      { label:'Engine', val: report.engine, color: '#FF9800' },
      { label:'Susp.', val: report.suspension, color: '#2196F3' },
      { label:'Front T.', val: report.wheels[0], color: '#9C27B0' },
      { label:'Rear T.', val: report.wheels[1], color: '#9C27B0' },
    ];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(x, y, 140, 100, 6); ctx.fill();
    zones.forEach((z, i) => {
      const barY = y + 8 + i * 18;
      ctx.fillStyle = '#ccc';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(z.label, x + 5, barY + 8);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 40, barY, 90, 10);
      const c = z.val > 60 ? z.color : z.val > 30 ? '#FF9800' : '#F44336';
      ctx.fillStyle = c;
      ctx.fillRect(x + 40, barY, 90 * (z.val / 100), 10);
    });
    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GECE/GÜNDÜZ DÖNGÜSÜ
// ═══════════════════════════════════════════════════════════════════════════
const DayCycleSystem = {
  timeOfDay: 0.25, // 0=gece, 0.25=sabah, 0.5=öğlen, 0.75=akşam
  daySpeed: 0.0005,
  paused: false,

  SKY_COLORS: {
    night:   { top: '#000033', bottom: '#001144', sun: null },
    dawn:    { top: '#FF6B35', bottom: '#FFB347', sun: '#FFF176' },
    morning: { top: '#87CEEB', bottom: '#E0F7FA', sun: '#FFF9C4' },
    noon:    { top: '#1E90FF', bottom: '#87CEEB', sun: '#FFFFFF' },
    evening: { top: '#FF4500', bottom: '#FF8C00', sun: '#FFD700' },
    dusk:    { top: '#4B0082', bottom: '#800080', sun: '#FF69B4' },
  },

  updateTimeOfDay(dt, mapId) {
    if (this.paused) return;
    let speed = this.daySpeed;
    if (mapId === 'arctic') speed *= 0.5; // slower days in arctic
    if (mapId === 'desert') speed *= 1.3; // faster perceived time in desert
    this.timeOfDay = (this.timeOfDay + speed * dt) % 1.0;
  },

  getDaylight() {
    const t = this.timeOfDay;
    if (t < 0.2) return t / 0.2; // dawn
    if (t < 0.7) return 1.0; // full day
    if (t < 0.8) return 1 - (t - 0.7) / 0.1; // dusk
    return 0.05; // night
  },

  getSkyColor(t) {
    t = t || this.timeOfDay;
    if (t < 0.15) return this.SKY_COLORS.night;
    if (t < 0.25) return this.SKY_COLORS.dawn;
    if (t < 0.35) return this.SKY_COLORS.morning;
    if (t < 0.55) return this.SKY_COLORS.noon;
    if (t < 0.70) return this.SKY_COLORS.evening;
    if (t < 0.80) return this.SKY_COLORS.dusk;
    return this.SKY_COLORS.night;
  },

  getSunPosition(t) {
    t = t || this.timeOfDay;
    // Sun arc: rises at 0.2, sets at 0.8
    const normalized = (t - 0.2) / 0.6; // 0 to 1 during day
    if (normalized < 0 || normalized > 1) return null;
    const angle = normalized * Math.PI; // 0 to PI
    return {
      x: normalized, // 0=left, 1=right (normalized)
      y: 1 - Math.sin(angle), // 0=horizon, 1=zenith (inverted for canvas)
      brightness: Math.sin(angle)
    };
  },

  drawSkyGradient(ctx, W, H, t) {
    t = t || this.timeOfDay;
    const colors = this.getSkyColor(t);
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(1, colors.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.6);
    // Draw sun/moon
    const sunPos = this.getSunPosition(t);
    if (sunPos && colors.sun) {
      const sx = sunPos.x * W;
      const sy = (0.15 + sunPos.y * 0.45) * H;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60);
      glow.addColorStop(0, colors.sun + 'FF');
      glow.addColorStop(0.3, colors.sun + '88');
      glow.addColorStop(1, colors.sun + '00');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx, sy, 60, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.sun;
      ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
    }
    // Draw stars at night
    if (this.getDaylight() < 0.3) {
      const starCount = 50;
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - this.getDaylight() / 0.3)})`;
      for (let i = 0; i < starCount; i++) {
        // Deterministic stars using index
        const sx2 = ((i * 137.9) % 1) * W;
        const sy2 = ((i * 89.3) % 1) * H * 0.5;
        const size = ((i * 23.7) % 1) * 2 + 0.5;
        ctx.beginPath(); ctx.arc(sx2, sy2, size, 0, Math.PI * 2); ctx.fill();
      }
    }
  },

  getAmbientLight() {
    const dl = this.getDaylight();
    return { r: dl, g: dl, b: Math.min(1, dl * 1.1), intensity: dl };
  },

  getTimeString() {
    const hours = Math.floor(this.timeOfDay * 24);
    const mins = Math.floor((this.timeOfDay * 24 - hours) * 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  },

  setPaused(paused) { this.paused = paused; },
  setTimeOfDay(t) { this.timeOfDay = Math.max(0, Math.min(1, t)); },
  isNightTime() { return this.getDaylight() < 0.3; },
  isDaytime() { return this.getDaylight() > 0.7; }
};

// ═══════════════════════════════════════════════════════════════════════════
// SKOR ÇOĞALTICI ZİNCİRİ (COMBO)
// ═══════════════════════════════════════════════════════════════════════════
const ComboSystem = {
  COMBO_ACTIONS: {
    flip:       { points: 50,  label: 'FLIP!',      color: '#FF6B6B' },
    trick:      { points: 30,  label: 'TRICK!',      color: '#4ECDC4' },
    near_miss:  { points: 20,  label: 'NEAR MISS!',   color: '#FFE66D' },
    air_time:   { points: 10,  label: 'AIRBORNE!',     color: '#A8E6CF' },
    speed:      { points: 5,   label: 'SPEED!',        color: '#FF8B94' },
    checkpoint: { points: 40,  label: 'CHECKPOINT!', color: '#FFDAC1' },
    collect:    { points: 8,   label: 'COLLECTED!',  color: '#B5EAD7' },
    powerup:    { points: 25,  label: 'POWER-UP!',   color: '#C7CEEA' },
    obstacle:   { points: 15,  label: 'OBSTACLE CLEARED!', color: '#F7CAC9' },
    npc_pass:   { points: 35,  label: 'NPC PASSED!', color: '#92A8D1' },
  },

  comboState: {
    streak: 0,
    multiplier: 1,
    timer: 0,
    maxTimer: 3.0,
    actions: [],
    totalComboScore: 0,
    bestStreak: 0,
    displayActions: []
  },

  addComboAction(type, extraBonus = 0) {
    const def = this.COMBO_ACTIONS[type];
    if (!def) return 0;
    this.comboState.streak++;
    this.comboState.timer = this.comboState.maxTimer;
    const mult = this.getComboMultiplier();
    const points = (def.points + extraBonus) * mult;
    this.comboState.actions.push({ type, points, time: Date.now() });
    this.comboState.totalComboScore += points;
    if (this.comboState.streak > this.comboState.bestStreak) {
      this.comboState.bestStreak = this.comboState.streak;
    }
    // Add display action
    this.comboState.displayActions.push({
      label: def.label,
      points: Math.floor(points),
      color: def.color,
      y: 0,
      alpha: 1.0,
      age: 0
    });
    return points;
  },

  updateComboTimer(dt) {
    if (this.comboState.timer > 0) {
      this.comboState.timer -= dt;
      if (this.comboState.timer <= 0) {
        this.breakCombo();
      }
    }
    // Update display actions
    this.comboState.displayActions = this.comboState.displayActions.filter(a => {
      a.age += dt;
      a.y -= 30 * dt;
      a.alpha = Math.max(0, 1 - a.age / 1.5);
      return a.alpha > 0;
    });
    // Update multiplier based on streak
    this.comboState.multiplier = this.getComboMultiplier();
  },

  getComboMultiplier() {
    const s = this.comboState.streak;
    if (s <= 0) return 1;
    if (s < 3) return 1;
    if (s < 6) return 1.5;
    if (s < 10) return 2;
    if (s < 15) return 3;
    if (s < 25) return 5;
    return 10;
  },

  breakCombo() {
    if (this.comboState.streak > 0) {
      console.log(`[Combo] Broken at streak: ${this.comboState.streak} | Mult: ${this.comboState.multiplier}x`);
    }
    this.comboState.streak = 0;
    this.comboState.multiplier = 1;
    this.comboState.timer = 0;
    this.comboState.actions = [];
  },

  drawComboDisplay(ctx, x, y) {
    // Draw combo multiplier
    if (this.comboState.streak > 0) {
      ctx.save();
      const mult = this.comboState.multiplier;
      const pulse = 1 + Math.sin(Date.now() / 150) * 0.05 * (mult > 1 ? 1 : 0);
      ctx.globalAlpha = 0.9;
      ctx.font = `bold ${Math.floor(24 * pulse)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = mult >= 5 ? '#FF0000' : mult >= 2 ? '#FFD700' : '#FFFFFF';
      ctx.fillText(`×${mult}`, x, y);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`COMBO x${this.comboState.streak}`, x, y + 18);
      // Timer bar
      const barW = 80;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x - barW / 2, y + 24, barW, 4);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x - barW / 2, y + 24, barW * (this.comboState.timer / this.comboState.maxTimer), 4);
      ctx.restore();
    }
    // Draw floating action labels
    for (const a of this.comboState.displayActions) {
      ctx.save();
      ctx.globalAlpha = a.alpha;
      ctx.fillStyle = a.color;
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`+${a.points} ${a.label}`, x + (Math.random() - 0.5) * 20, y - 60 + a.y);
      ctx.restore();
    }
  },

  getStats() {
    return {
      currentStreak: this.comboState.streak,
      currentMultiplier: this.comboState.multiplier,
      bestStreak: this.comboState.bestStreak,
      totalComboScore: this.comboState.totalComboScore,
      timerPercent: this.comboState.timer / this.comboState.maxTimer
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// YAKIT VE MOTOR SICAKLIĞI SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const FuelEngineSystem = {
  fuelSystem: {
    amount: 100,
    maxAmount: 100,
    consumeRate: 0.1,
    efficiency: 1.0,
    reserves: 0,
    lastRefuel: 0,
    totalConsumed: 0,
    economy: [] // recent consumption readings
  },

  engineTemp: {
    current: 80,
    max: 120,
    min: 60,
    coolingRate: 0.5,
    heatingRate: 0.8,
    overheated: false,
    overheatTimer: 0,
    overheatDuration: 3.0
  },

  init(vehicleId) {
    const defaults = { amount: 100, maxAmount: 100, efficiency: 1.0 };
    this.fuelSystem = { ...defaults, consumeRate: 0.1, reserves: 0, lastRefuel: 0, totalConsumed: 0, economy: [] };
    this.engineTemp = { current: 80, max: 120, min: 60, coolingRate: 0.5, heatingRate: 0.8, overheated: false, overheatTimer: 0, overheatDuration: 3.0 };
  },

  consumeFuelAdv(throttle, speed, vehicleId, dt) {
    if (this.fuelSystem.amount <= 0) return 0;
    // Advanced consumption model
    const baseConsume = this.fuelSystem.consumeRate * dt;
    const throttleFactor = 0.3 + throttle * 0.7;
    const speedFactor = 0.5 + (speed / 200) * 0.5;
    const efficiencyFactor = 1 / Math.max(0.1, this.fuelSystem.efficiency);
    const tempFactor = this.engineTemp.overheated ? 1.5 : 1.0;
    const consumed = baseConsume * throttleFactor * speedFactor * efficiencyFactor * tempFactor;
    this.fuelSystem.amount = Math.max(0, this.fuelSystem.amount - consumed);
    this.fuelSystem.totalConsumed += consumed;
    // Track economy
    this.fuelSystem.economy.push({ consumed, speed, time: Date.now() });
    if (this.fuelSystem.economy.length > 60) this.fuelSystem.economy.shift();
    return consumed;
  },

  refuel(amount) {
    const prev = this.fuelSystem.amount;
    this.fuelSystem.amount = Math.min(this.fuelSystem.maxAmount, this.fuelSystem.amount + amount);
    this.fuelSystem.lastRefuel = Date.now();
    return this.fuelSystem.amount - prev;
  },

  updateEngineTemp(throttle, speed, dt) {
    const target = this.engineTemp.min + throttle * (this.engineTemp.max - this.engineTemp.min) * 0.9 + speed * 0.1;
    const diff = target - this.engineTemp.current;
    if (diff > 0) {
      this.engineTemp.current += diff * this.engineTemp.heatingRate * dt;
    } else {
      this.engineTemp.current += diff * this.engineTemp.coolingRate * dt;
    }
    this.engineTemp.current = Math.max(this.engineTemp.min, Math.min(this.engineTemp.max + 20, this.engineTemp.current));
    // Overheat logic
    if (this.engineTemp.current >= this.engineTemp.max && !this.engineTemp.overheated) {
      this.engineTemp.overheated = true;
      this.engineTemp.overheatTimer = this.engineTemp.overheatDuration;
    }
    if (this.engineTemp.overheated) {
      this.engineTemp.overheatTimer -= dt;
      if (this.engineTemp.overheatTimer <= 0 && this.engineTemp.current < this.engineTemp.max * 0.8) {
        this.engineTemp.overheated = false;
      }
    }
  },

  isOverheated() { return this.engineTemp.overheated; },

  getEngineEfficiency() {
    if (this.engineTemp.overheated) return 0.4;
    const tempRatio = this.engineTemp.current / this.engineTemp.max;
    if (tempRatio > 0.95) return 0.7;
    if (tempRatio > 0.85) return 0.85;
    return 1.0;
  },

  getFuelPercent() { return this.fuelSystem.amount / this.fuelSystem.maxAmount; },
  getTempPercent() { return (this.engineTemp.current - this.engineTemp.min) / (this.engineTemp.max - this.engineTemp.min); },

  getAverageConsumption() {
    if (this.fuelSystem.economy.length === 0) return 0;
    return this.fuelSystem.economy.reduce((s, e) => s + e.consumed, 0) / this.fuelSystem.economy.length;
  },

  drawGauges(ctx, x, y) {
    // Fuel gauge
    ctx.save();
    const fp = this.getFuelPercent();
    const tp = Math.min(1, this.getTempPercent());
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(x, y, 90, 55, 6); ctx.fill();
    // Fuel
    ctx.fillStyle = '#aaa';
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⛽ YAKIT', x + 5, y + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 5, y + 16, 80, 10);
    ctx.fillStyle = fp > 0.3 ? '#4CAF50' : fp > 0.1 ? '#FF9800' : '#F44336';
    ctx.fillRect(x + 5, y + 16, 80 * fp, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '8px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(fp * 100)}%`, x + 85, y + 25);
    // Engine temp
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaa';
    ctx.fillText('🌡 MOTOR', x + 5, y + 36);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 5, y + 40, 80, 10);
    ctx.fillStyle = this.engineTemp.overheated ? '#F44336' : tp > 0.8 ? '#FF9800' : '#2196F3';
    ctx.fillRect(x + 5, y + 40, 80 * tp, 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.floor(this.engineTemp.current)}°C`, x + 85, y + 49);
    if (this.engineTemp.overheated) {
      ctx.fillStyle = '#F44336';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ OVERHEATING!', x + 45, y + 54);
    }
    ctx.restore();
  }
};

// =============================================================================
// WEATHER_SYSTEM genişletme - Hava durumu simülasyonu
// =============================================================================
const WEATHER_TYPES = {
  clear:     { name: 'Clear',       friction: 1.0, visibility: 1.0, windX: 0.02,   rainRate: 0,   fogAlpha: 0,    lightMult: 1.0,  snowRate: 0,   icon: '☀️'  },
  cloudy:    { name: 'Cloudy',    friction: 0.95, visibility: 0.85, windX: 0.05, rainRate: 0,   fogAlpha: 0.1,  lightMult: 0.85, snowRate: 0,   icon: '☁️'  },
  rain:      { name: 'Rainy',  friction: 0.72, visibility: 0.65, windX: 0.08, rainRate: 60,  fogAlpha: 0.15, lightMult: 0.7,  snowRate: 0,   icon: '🌧️'  },
  storm:     { name: 'Storm',   friction: 0.55, visibility: 0.4,  windX: 0.18, rainRate: 120, fogAlpha: 0.25, lightMult: 0.5,  snowRate: 0,   icon: '⛈️'  },
  snow:      { name: 'Snowy',     friction: 0.5,  visibility: 0.7,  windX: 0.04, rainRate: 0,   fogAlpha: 0.2,  lightMult: 0.8,  snowRate: 80,  icon: '❄️'  },
  fog:       { name: 'Foggy',     friction: 0.88, visibility: 0.3,  windX: 0.01, rainRate: 0,   fogAlpha: 0.55, lightMult: 0.6,  snowRate: 0,   icon: '🌫️'  },
  sandstorm: { name: 'Sandstorm', friction: 0.65, visibility: 0.25, windX: 0.25, rainRate: 0, fogAlpha: 0.45, lightMult: 0.55, snowRate: 0, icon: '🌪️' },
  heatwave:  { name: 'Heatwave', friction: 0.9, visibility: 0.9, windX: 0.0, rainRate: 0,   fogAlpha: 0.05, lightMult: 1.15, snowRate: 0,   icon: '🌡️'  }
};

const WEATHER_SYSTEM_EXT = {
  current: 'clear',
  next: null,
  transitionProgress: 0,
  transitionDuration: 8,
  timer: 0,
  changeInterval: 45,
  particles: [],
  maxParticles: 200,
  windOffset: 0,

  _getType(name) { return WEATHER_TYPES[name] || WEATHER_TYPES.clear; },

  startWeather(type) {
    this.current = type;
    this.next = null;
    this.transitionProgress = 1;
    this._spawnParticles();
  },

  weatherTransition(from, to, duration) {
    this.current = from;
    this.next = to;
    this.transitionDuration = duration || 8;
    this.transitionProgress = 0;
  },

  updateWeather(dt) {
    this.timer += dt;
    this.windOffset += this._getType(this.current).windX * dt * 60;

    // Auto change weather
    if (this.timer > this.changeInterval && !this.next) {
      const types = Object.keys(WEATHER_TYPES);
      const nextType = types[Math.floor(Math.random() * types.length)];
      if (nextType !== this.current) {
        this.weatherTransition(this.current, nextType, 8);
        this.timer = 0;
        this.changeInterval = 30 + Math.random() * 60;
      }
    }

    // Transition progress
    if (this.next && this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / this.transitionDuration);
      if (this.transitionProgress >= 1) {
        this.current = this.next;
        this.next = null;
        this._spawnParticles();
      }
    }

    // Update particles
    this._updateParticles(dt);
  },

  _lerp(a, b, t) { return a + (b - a) * t; },

  getCurrentBlended() {
    if (!this.next || this.transitionProgress >= 1) return this._getType(this.current);
    const A = this._getType(this.current);
    const B = this._getType(this.next);
    const t = this.transitionProgress;
    return {
      name:        t > 0.5 ? B.name : A.name,
      friction:    this._lerp(A.friction,    B.friction,    t),
      visibility:  this._lerp(A.visibility,  B.visibility,  t),
      windX:       this._lerp(A.windX,       B.windX,       t),
      rainRate:    this._lerp(A.rainRate,     B.rainRate,    t),
      fogAlpha:    this._lerp(A.fogAlpha,     B.fogAlpha,    t),
      lightMult:   this._lerp(A.lightMult,   B.lightMult,   t),
      snowRate:    this._lerp(A.snowRate,     B.snowRate,    t),
      icon:        t > 0.5 ? B.icon : A.icon
    };
  },

  applyWeatherToPhysics(vehicle, dt) {
    const w = this.getCurrentBlended();
    if (!vehicle) return;

    // Friction modifier
    if (typeof vehicle.frictionMod !== 'undefined') {
      vehicle.frictionMod = w.friction;
    }

    // Wind force on vehicle body
    if (vehicle.body && typeof vehicle.body.applyForce === 'function') {
      const windForce = w.windX * 800;
      vehicle.body.applyForce({ x: windForce, y: 0 }, vehicle.body.position);
    } else if (vehicle.vx !== undefined) {
      vehicle.vx += w.windX * dt * 60 * 0.5;
    }

    // Heatwave: engine overheat faster
    if (this.current === 'heatwave' && vehicle.engineTemp) {
      vehicle.engineTemp.current = Math.min(vehicle.engineTemp.max || 120, vehicle.engineTemp.current + dt * 4);
    }

    // Snow: reduce traction noticeably
    if (this.current === 'snow' && vehicle.grip !== undefined) {
      vehicle.grip = Math.max(0.2, vehicle.grip * 0.88);
    }
  },

  _spawnParticles() {
    this.particles = [];
    const w = this._getType(this.current);
    const count = Math.round(w.rainRate + w.snowRate);
    for (let i = 0; i < Math.min(count, this.maxParticles); i++) {
      this.particles.push(this._makeParticle(this.current));
    }
  },

  _makeParticle(type) {
    const isSnow = WEATHER_TYPES[type] && WEATHER_TYPES[type].snowRate > 0;
    return {
      x: Math.random(),
      y: Math.random(),
      speed: isSnow ? 0.08 + Math.random() * 0.06 : 0.25 + Math.random() * 0.35,
      size:  isSnow ? 3 + Math.random() * 4 : 1 + Math.random() * 1.5,
      len:   isSnow ? 0 : 8 + Math.random() * 12,
      isSnow,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.5 + Math.random() * 1.5
    };
  },

  _updateParticles(dt) {
    const w = this.getCurrentBlended();
    const targetCount = Math.round(w.rainRate + w.snowRate);

    while (this.particles.length < Math.min(targetCount, this.maxParticles)) {
      const type = (w.snowRate > w.rainRate) ? 'snow' : 'rain';
      const p = this._makeParticle(type);
      p.y = 0;
      this.particles.push(p);
    }
    while (this.particles.length > Math.min(targetCount, this.maxParticles)) {
      this.particles.pop();
    }

    const wind = w.windX;
    for (const p of this.particles) {
      p.y += p.speed * dt;
      p.x += (wind * 0.5 + (p.isSnow ? Math.sin(p.wobble) * 0.002 : 0));
      p.wobble += p.wobbleSpeed * dt;
      if (p.y > 1.05) { p.y = -0.02; p.x = Math.random(); }
      if (p.x < -0.02) p.x = 1.02;
      if (p.x > 1.02) p.x = -0.02;
    }
  },

  drawWeatherOverlay(ctx, W, H) {
    const w = this.getCurrentBlended();
    ctx.save();

    // Fog/sandstorm overlay
    if (w.fogAlpha > 0.01) {
      const isSand = this.current === 'sandstorm' || this.next === 'sandstorm';
      const fogColor = isSand ? `rgba(210,160,80,${w.fogAlpha})` : `rgba(200,220,240,${w.fogAlpha})`;
      ctx.fillStyle = fogColor;
      ctx.fillRect(0, 0, W, H);
    }

    // Particles (rain/snow)
    for (const p of this.particles) {
      const px = p.x * W;
      const py = p.y * H;
      if (p.isSnow) {
        ctx.fillStyle = 'rgba(230,240,255,0.85)';
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(130,170,220,0.65)';
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + w.windX * p.len * 5, py + p.len);
        ctx.stroke();
      }
    }

    // Lightning flash (storm)
    if (this.current === 'storm' && Math.random() < 0.002) {
      ctx.fillStyle = 'rgba(200,230,255,0.12)';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }
};

// =============================================================================
// CHALLENGE_SYSTEM - 30 farklı zorluk
// =============================================================================
const CHALLENGE_SYSTEM = {
  DEFINITIONS: [
    { id: 'reach_100m',    label: 'Go 100m',             type: 'distance',  target: 100,  reward: 30  },
    { id: 'reach_500m',    label: 'Go 500m',             type: 'distance',  target: 500,  reward: 75  },
    { id: 'reach_1000m',   label: 'Go 1km',              type: 'distance',  target: 1000, reward: 150 },
    { id: 'reach_2000m',   label: 'Go 2km',              type: 'distance',  target: 2000, reward: 250 },
    { id: 'reach_5000m',   label: 'Go 5km',              type: 'distance',  target: 5000, reward: 500 },
    { id: 'flip_1',        label: 'Do 1 flip',           type: 'flips',     target: 1,    reward: 40  },
    { id: 'flip_5',        label: 'Do 5 flips',           type: 'flips',     target: 5,    reward: 120 },
    { id: 'flip_10',       label: 'Do 10 flips',          type: 'flips',     target: 10,   reward: 220 },
    { id: 'flip_20',       label: 'Do 20 flips',          type: 'flips',     target: 20,   reward: 400 },
    { id: 'collect_10c',   label: 'Collect 10 coins',        type: 'coins',     target: 10,   reward: 25  },
    { id: 'collect_50c',   label: 'Collect 50 coins',        type: 'coins',     target: 50,   reward: 100 },
    { id: 'collect_100c',  label: 'Collect 100 coins',       type: 'coins',     target: 100,  reward: 200 },
    { id: 'collect_500c',  label: 'Collect 500 coins',       type: 'coins',     target: 500,  reward: 800 },
    { id: 'air_1s',        label: 'Stay 1s airborne',       type: 'air_time',  target: 1,    reward: 50  },
    { id: 'air_3s',        label: 'Stay 3s airborne',       type: 'air_time',  target: 3,    reward: 130 },
    { id: 'air_5s',        label: 'Stay 5s airborne',       type: 'air_time',  target: 5,    reward: 250 },
    { id: 'air_10s',       label: 'Stay 10s airborne',      type: 'air_time',  target: 10,   reward: 500 },
    { id: 'nitro_3',       label: 'Use nitro 3 times',   type: 'nitro_use', target: 3,    reward: 60  },
    { id: 'nitro_10',      label: 'Use nitro 10 times',  type: 'nitro_use', target: 10,   reward: 150 },
    { id: 'fuel_3',        label: '3 fuel cans',    type: 'fuel_pick', target: 3,    reward: 80  },
    { id: 'fuel_10',       label: '10 fuel cans',   type: 'fuel_pick', target: 10,   reward: 220 },
    { id: 'no_crash_500',  label: 'No damage - 500m',     type: 'no_crash',  target: 500,  reward: 180 },
    { id: 'no_crash_1000', label: 'No damage - 1km',      type: 'no_crash',  target: 1000, reward: 350 },
    { id: 'speed_80',      label: 'Reach 80 km/h',         type: 'top_speed', target: 80,   reward: 90  },
    { id: 'speed_120',     label: 'Reach 120 km/h',        type: 'top_speed', target: 120,  reward: 200 },
    { id: 'wheelie_3s',    label: '3s wheelie',          type: 'wheelie',   target: 3,    reward: 110 },
    { id: 'score_1000',    label: '1000 score',            type: 'score',     target: 1000, reward: 70  },
    { id: 'score_5000',    label: '5000 score',            type: 'score',     target: 5000, reward: 300 },
    { id: 'combo_5',       label: '5x combo',             type: 'combo',     target: 5,    reward: 150 },
    { id: 'perfect_land',  label: '5 perfect landings',      type: 'perf_land', target: 5,    reward: 200 }
  ],

  completedChallenges: [],
  activeChallenges: [],
  progress: {},

  init() {
    this.completedChallenges = [];
    this.progress = {};
    for (const def of this.DEFINITIONS) {
      this.progress[def.id] = 0;
    }
    this.activeChallenges = this.getActiveChallenges();
  },

  getActiveChallenges(count) {
    count = count || 5;
    return this.DEFINITIONS
      .filter(d => !this.completedChallenges.includes(d.id))
      .slice(0, count);
  },

  checkChallenges(vehicle, gameState) {
    if (!gameState) return [];
    const newly = [];
    for (const ch of this.activeChallenges) {
      let val = 0;
      switch (ch.type) {
        case 'distance':  val = gameState.distance || 0;       break;
        case 'flips':     val = gameState.flips || 0;          break;
        case 'coins':     val = gameState.coinsCollected || 0; break;
        case 'air_time':  val = gameState.maxAirTime || 0;     break;
        case 'nitro_use': val = gameState.nitroUsed || 0;      break;
        case 'fuel_pick': val = gameState.fuelPickups || 0;    break;
        case 'no_crash':  val = gameState.noCrashDistance || 0; break;
        case 'top_speed': val = gameState.topSpeed || 0;       break;
        case 'wheelie':   val = gameState.maxWheelieTime || 0; break;
        case 'score':     val = gameState.score || 0;          break;
        case 'combo':     val = gameState.maxCombo || 0;       break;
        case 'perf_land': val = gameState.perfectLandings || 0; break;
      }
      this.progress[ch.id] = val;
      if (val >= ch.target && !this.completedChallenges.includes(ch.id)) {
        this.completedChallenges.push(ch.id);
        newly.push(ch);
      }
    }
    if (newly.length > 0) {
      this.activeChallenges = this.getActiveChallenges();
    }
    return newly;
  },

  getProgressRatio(id) {
    const def = this.DEFINITIONS.find(d => d.id === id);
    if (!def) return 0;
    return Math.min(1, (this.progress[id] || 0) / def.target);
  }
};

// =============================================================================
// GHOST_SYSTEM - En iyi koşu kaydı ve hayalet oynatma
// =============================================================================
const GHOST_SYSTEM = {
  recording: false,
  playing: false,
  frames: [],
  playbackFrame: 0,
  playbackTime: 0,
  frameInterval: 0.05, // 20fps ghost
  recordTimer: 0,
  bestRuns: {},

  startRecording() {
    this.recording = true;
    this.frames = [];
    this.recordTimer = 0;
  },

  recordFrame(vehicle, gameTime) {
    if (!this.recording) return;
    this.recordTimer += 0.016;
    if (this.recordTimer < this.frameInterval) return;
    this.recordTimer = 0;
    this.frames.push({
      t: gameTime,
      x: vehicle.body ? vehicle.body.position.x : (vehicle.x || 0),
      y: vehicle.body ? vehicle.body.position.y : (vehicle.y || 0),
      angle: vehicle.body ? vehicle.body.angle : (vehicle.angle || 0),
      state: vehicle.isGrounded ? 'grounded' : 'air'
    });
  },

  stopRecording(vehicleId, mapId) {
    this.recording = false;
    const key = `${vehicleId}_${mapId}`;
    if (!this.bestRuns[key] || this.frames.length > 0) {
      this.bestRuns[key] = { frames: [...this.frames], vehicleId, mapId, savedAt: Date.now() };
    }
    return this.bestRuns[key];
  },

  startPlayback(vehicleId, mapId) {
    const key = `${vehicleId}_${mapId}`;
    const run = this.bestRuns[key];
    if (!run || run.frames.length === 0) return false;
    this.playing = true;
    this.frames = run.frames;
    this.playbackFrame = 0;
    this.playbackTime = 0;
    return true;
  },

  playbackGhost(dt) {
    if (!this.playing || this.frames.length === 0) return null;
    this.playbackTime += dt;
    // Find correct frame
    while (this.playbackFrame < this.frames.length - 1 &&
           this.frames[this.playbackFrame + 1].t <= this.playbackTime) {
      this.playbackFrame++;
    }
    if (this.playbackFrame >= this.frames.length - 1) {
      this.playing = false;
      return null;
    }
    const f0 = this.frames[this.playbackFrame];
    const f1 = this.frames[this.playbackFrame + 1];
    const span = f1.t - f0.t;
    const lerp = span > 0 ? Math.min(1, (this.playbackTime - f0.t) / span) : 1;
    return {
      x:     f0.x + (f1.x - f0.x) * lerp,
      y:     f0.y + (f1.y - f0.y) * lerp,
      angle: f0.angle + (f1.angle - f0.angle) * lerp,
      state: f0.state
    };
  },

  drawGhost(ctx, ghostPos, camera, vehicleIcon) {
    if (!ghostPos) return;
    ctx.save();
    const screenX = ghostPos.x - (camera ? camera.x : 0);
    const screenY = ghostPos.y - (camera ? camera.y : 0);
    ctx.globalAlpha = 0.38;
    ctx.translate(screenX, screenY);
    ctx.rotate(ghostPos.angle);
    ctx.fillStyle = 'rgba(100,200,255,0.5)';
    ctx.strokeStyle = 'rgba(100,200,255,0.8)';
    ctx.lineWidth = 2;
    // Ghost car silhouette
    ctx.beginPath();
    ctx.roundRect(-28, -14, 56, 24, 6);
    ctx.fill();
    ctx.stroke();
    // Ghost wheels
    ctx.fillStyle = 'rgba(80,160,210,0.6)';
    ctx.beginPath(); ctx.arc(-16, 12, 9, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, 12, 9, 0, Math.PI*2); ctx.fill();
    // Ghost label
    ctx.rotate(-ghostPos.angle);
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(100,220,255,0.9)';
    ctx.fillText('HAYALET', 0, -24);
    ctx.restore();
  }
};

// =============================================================================
// TRICK_SYSTEM - Hava hareketi ve numaraları
// =============================================================================
const TRICK_SYSTEM = {
  TRICKS: {
    backflip:       { name: 'BACKFLIP!',    score: 500,  minRotation: -Math.PI * 1.8, rotDir: -1, color: '#E040FB' },
    frontflip:      { name: 'FRONTFLIP!',      score: 500,  minRotation:  Math.PI * 1.8, rotDir:  1, color: '#FF6D00' },
    big_air:        { name: 'BIG AIR!',       score: 300,  minAirTime: 2.5,             color: '#00E676' },
    perfect_landing:{ name: 'PERFECT LANDING!',   score: 400,  maxLandAngle: 0.2,           color: '#FFD600' },
    wheelie:        { name: 'WHEELIE!',          score: 200,  minTime: 1.5,                color: '#00B0FF' },
    endo:           { name: 'ENDO!',             score: 200,  minTime: 1.0,                color: '#FF1744' }
  },

  trickScore: 0,
  trickCombo: 0,
  activeTrick: null,
  trickTimer: 0,
  displayTimer: 0,
  airTime: 0,
  wasGrounded: true,
  prevAngle: 0,
  totalRotation: 0,
  wheelieTime: 0,
  endoTime: 0,

  reset() {
    this.trickScore = 0;
    this.trickCombo = 0;
    this.activeTrick = null;
    this.trickTimer = 0;
    this.displayTimer = 0;
    this.airTime = 0;
    this.wasGrounded = true;
    this.prevAngle = 0;
    this.totalRotation = 0;
    this.wheelieTime = 0;
    this.endoTime = 0;
  },

  detectTrick(vehicle, dt) {
    if (!vehicle) return null;
    const grounded = vehicle.isGrounded !== undefined ? vehicle.isGrounded : true;
    const angle = vehicle.angle || 0;
    const dAngle = angle - this.prevAngle;
    this.prevAngle = angle;

    const detected = [];

    if (!grounded) {
      this.airTime += dt;
      this.totalRotation += dAngle;

      // Backflip / Frontflip
      if (Math.abs(this.totalRotation) >= Math.PI * 1.8) {
        if (this.totalRotation < 0) {
          detected.push('backflip');
        } else {
          detected.push('frontflip');
        }
        this.totalRotation = 0;
      }

      // Big air
      if (this.airTime >= 2.5 && !this._airAwarded) {
        detected.push('big_air');
        this._airAwarded = true;
      }
    } else {
      // Just landed
      if (!this.wasGrounded) {
        if (Math.abs(angle) < 0.2 && this.airTime > 0.5) {
          detected.push('perfect_landing');
        }
        this.airTime = 0;
        this.totalRotation = 0;
        this._airAwarded = false;
      }
      this.airTime = 0;
    }

    // Wheelie: rear wheel up (angle > 0.3)
    if (grounded && angle > 0.3) {
      this.wheelieTime += dt;
      if (this.wheelieTime >= 1.5 && !this._wheelieAwarded) {
        detected.push('wheelie');
        this._wheelieAwarded = true;
      }
    } else {
      this.wheelieTime = 0;
      this._wheelieAwarded = false;
    }

    // Endo: front wheel down (angle < -0.3)
    if (grounded && angle < -0.3) {
      this.endoTime += dt;
      if (this.endoTime >= 1.0 && !this._endoAwarded) {
        detected.push('endo');
        this._endoAwarded = true;
      }
    } else {
      this.endoTime = 0;
      this._endoAwarded = false;
    }

    this.wasGrounded = grounded;

    // Apply detected tricks
    let earnedScore = 0;
    for (const trickId of detected) {
      const def = this.TRICKS[trickId];
      if (!def) continue;
      this.trickCombo++;
      const comboMult = 1 + (this.trickCombo - 1) * 0.5;
      const pts = Math.round(def.score * comboMult);
      this.trickScore += pts;
      earnedScore += pts;
      this.activeTrick = { id: trickId, name: def.name, score: pts, color: def.color };
      this.displayTimer = 2.5;
    }

    // Timer
    if (this.displayTimer > 0) {
      this.displayTimer -= dt;
      if (this.displayTimer <= 0) {
        this.activeTrick = null;
        this.trickCombo = 0;
      }
    }

    return earnedScore > 0 ? { trickScore: earnedScore, trick: this.activeTrick } : null;
  },

  drawTrickText(ctx, W, H, t) {
    if (!this.activeTrick || this.displayTimer <= 0) return;
    ctx.save();
    const fadeOut = Math.min(1, this.displayTimer / 0.5);
    const scale = 1 + 0.15 * Math.sin(t * 6) * fadeOut;
    const trick = this.activeTrick;

    ctx.globalAlpha = fadeOut;
    ctx.save();
    ctx.translate(W/2, H * 0.28);
    ctx.scale(scale, scale);
    ctx.font = `bold ${Math.round(H * 0.055)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = trick.color;
    ctx.shadowColor = trick.color;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 6;
    ctx.strokeText(trick.name, 0, 0);
    ctx.fillText(trick.name, 0, 0);
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.round(H * 0.038)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.shadowColor = '#FFD600';
    ctx.shadowBlur = 12;
    ctx.fillText(`+${trick.score.toLocaleString()} PUAN`, 0, Math.round(H * 0.055) + 4);
    ctx.shadowBlur = 0;

    if (this.trickCombo > 1) {
      ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
      ctx.fillStyle = '#FF6D00';
      ctx.fillText(`${this.trickCombo}x KOMBO!`, 0, Math.round(H * 0.055) + Math.round(H * 0.04) + 8);
    }
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// POWERUP_SPAWNER genişletme - 5 yeni powerup
// =============================================================================
const POWERUP_SPAWNER_EXT = {
  TYPES: {
    slow_motion:   { name: 'SLOW MOTION', icon: '⏱️', color: '#00BCD4', duration: 5,   rarity: 0.08 },
    magnet:        { name: 'MAGNETIC',      icon: '🧲', color: '#9C27B0', duration: 8,   rarity: 0.10 },
    shield:        { name: 'SHIELD',        icon: '🛡️', color: '#2196F3', duration: 6,   rarity: 0.09 },
    double_score:  { name: '2X SCORE',       icon: '✖️2', color: '#FF9800', duration: 10,  rarity: 0.12 },
    ghost_mode:    { name: 'GHOST MODE',   icon: '👻', color: '#78909C', duration: 4,   rarity: 0.05 }
  },

  active: [],
  spawned: [],
  spawnTimer: 0,
  spawnInterval: 18,

  update(dt, gameState) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const types = Object.keys(this.TYPES);
      const roll = Math.random();
      let cumulative = 0;
      for (const t of types) {
        cumulative += this.TYPES[t].rarity;
        if (roll < cumulative) {
          const dist = (gameState ? gameState.distance : 100) + 200 + Math.random() * 300;
          this.spawnPowerup(dist, -60, t);
          break;
        }
      }
    }

    // Update active powerups
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].remaining -= dt;
      if (this.active[i].remaining <= 0) {
        this._deactivate(this.active[i]);
        this.active.splice(i, 1);
      }
    }

    // Update spawned (floating) powerups
    for (const sp of this.spawned) {
      sp.bobY = Math.sin(Date.now() * 0.003 + sp.x * 0.01) * 6;
    }
  },

  spawnPowerup(x, y, type) {
    if (!this.TYPES[type]) return;
    this.spawned.push({ x, y: y || -60, type, bobY: 0, collected: false });
  },

  checkCollection(vehicle) {
    if (!vehicle) return;
    const vx = vehicle.body ? vehicle.body.position.x : (vehicle.x || 0);
    const vy = vehicle.body ? vehicle.body.position.y : (vehicle.y || 0);
    for (let i = this.spawned.length - 1; i >= 0; i--) {
      const sp = this.spawned[i];
      if (sp.collected) { this.spawned.splice(i, 1); continue; }
      const dx = vx - sp.x, dy = vy - sp.y;
      if (Math.sqrt(dx*dx + dy*dy) < 45) {
        sp.collected = true;
        this.applyPowerup(sp.type, vehicle);
        this.spawned.splice(i, 1);
      }
    }
  },

  applyPowerup(type, vehicle) {
    const def = this.TYPES[type];
    if (!def) return;
    // Remove existing same type
    const existing = this.active.findIndex(a => a.type === type);
    if (existing !== -1) {
      this.active[existing].remaining = def.duration;
      return;
    }
    const entry = { type, remaining: def.duration, def, vehicle };
    this.active.push(entry);
    this._activate(entry, vehicle);
  },

  _activate(entry, vehicle) {
    switch (entry.type) {
      case 'slow_motion':
        if (vehicle) vehicle._slowMotion = true;
        break;
      case 'shield':
        if (vehicle) vehicle._shielded = true;
        break;
      case 'ghost_mode':
        if (vehicle) vehicle._ghostMode = true;
        break;
      case 'double_score':
        if (vehicle) vehicle._doubleScore = true;
        break;
      case 'magnet':
        if (vehicle) vehicle._magnetRange = 150;
        break;
    }
  },

  _deactivate(entry) {
    const vehicle = entry.vehicle;
    if (!vehicle) return;
    switch (entry.type) {
      case 'slow_motion':  vehicle._slowMotion = false;  break;
      case 'shield':       vehicle._shielded = false;    break;
      case 'ghost_mode':   vehicle._ghostMode = false;   break;
      case 'double_score': vehicle._doubleScore = false; break;
      case 'magnet':       vehicle._magnetRange = 0;     break;
    }
  },

  hasActive(type) {
    return this.active.some(a => a.type === type);
  },

  drawPowerupEffect(ctx, activePowerups, W, H) {
    if (!activePowerups || activePowerups.length === 0) return;
    ctx.save();
    const iconSize = 36, padding = 8;
    const startX = W/2 - (activePowerups.length * (iconSize + padding)) / 2;
    const y = H - 90;

    for (let i = 0; i < activePowerups.length; i++) {
      const p = activePowerups[i];
      const def = this.TYPES[p.type] || {};
      const x = startX + i * (iconSize + padding);
      const ratio = p.remaining / (def.duration || 1);

      // BG
      ctx.fillStyle = 'rgba(0,10,30,0.82)';
      ctx.beginPath();
      ctx.roundRect(x, y, iconSize, iconSize, 8);
      ctx.fill();

      // Timer arc
      ctx.strokeStyle = def.color || '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + iconSize/2, y + iconSize/2, iconSize/2 - 3, -Math.PI/2, -Math.PI/2 + ratio * Math.PI * 2);
      ctx.stroke();

      // Icon
      ctx.font = `${Math.round(iconSize * 0.55)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(def.icon || '⚡', x + iconSize/2, y + iconSize * 0.68);

      // Time remaining
      ctx.font = `bold ${Math.round(H * 0.016)}px Arial`;
      ctx.fillStyle = def.color || '#fff';
      ctx.fillText(Math.ceil(p.remaining) + 's', x + iconSize/2, y + iconSize + 14);
    }
    ctx.restore();
  },

  drawSpawnedPowerups(ctx, camera) {
    ctx.save();
    for (const sp of this.spawned) {
      const sx = sp.x - (camera ? camera.x : 0);
      const sy = sp.y + sp.bobY - (camera ? camera.y : 0);
      const def = this.TYPES[sp.type] || {};

      // Glow circle
      const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 28);
      glowGrad.addColorStop(0, (def.color || '#fff') + '55');
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,10,30,0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = def.color || '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(def.icon || '⚡', sx, sy + 6);
    }
    ctx.restore();
  }
};

// =============================================================================
// DISTANCE_MILESTONES - Her 500m'de özel ödül/animasyon
// =============================================================================
const DISTANCE_MILESTONES = {
  // ⚠ ÖDÜL ÖLÇEĞİ 30 Tmz'de DÜŞÜRÜLDÜ (ölçüme dayalı). Eski toplam 10 km'ye
  //   kadar 6.100 altındı; ölçülen taban gelir 1.032-1.180 altın/dk ve jeep
  //   120 saniyede 22 km gidiyor → kilometre taşları tek başına koşu ödülünün
  //   2,6 KATI oluyordu. Yeni toplam 1.530 (≈%25'i) — hâlâ hissedilir ödül,
  //   ama ekonomiyi ele geçirmiyor.
  MILESTONES: [
    { distance: 500,   reward:  10, label: '500M!',  icon: '🏁', special: false },
    { distance: 1000,  reward:  20, label: '1 KM!',  icon: '🎉', special: true  },
    { distance: 1500,  reward:  15, label: '1.5KM!', icon: '🏁', special: false },
    { distance: 2000,  reward:  35, label: '2 KM!',  icon: '🎊', special: true  },
    { distance: 2500,  reward:  20, label: '2.5KM!', icon: '🏁', special: false },
    { distance: 3000,  reward:  50, label: '3 KM!',  icon: '🔥', special: true  },
    { distance: 4000,  reward:  60, label: '4 KM!',  icon: '⚡', special: true  },
    { distance: 5000,  reward:  80, label: '5 KM!',  icon: '👑', special: true  },
    { distance: 7500,  reward: 120, label: '7.5KM!', icon: '💎', special: true  },
    { distance: 10000, reward: 200, label: '10 KM!', icon: '🏆', special: true  }
  ],

  triggered: [],
  pendingDisplay: [],

  reset() {
    this.triggered = [];
    this.pendingDisplay = [];
  },

  check(distance) {
    const newly = [];
    for (const m of this.MILESTONES) {
      if (!this.triggered.includes(m.distance) && distance >= m.distance) {
        this.triggered.push(m.distance);
        this.pendingDisplay.push({ ...m, timer: 3.5 });
        newly.push(m);
      }
    }
    return newly;
  },

  update(dt) {
    for (let i = this.pendingDisplay.length - 1; i >= 0; i--) {
      this.pendingDisplay[i].timer -= dt;
      if (this.pendingDisplay[i].timer <= 0) {
        this.pendingDisplay.splice(i, 1);
      }
    }
  },

  draw(ctx, W, H) {
    if (this.pendingDisplay.length === 0) return;
    ctx.save();
    const m = this.pendingDisplay[0];
    const alpha = Math.min(1, m.timer / 0.5) * Math.min(1, m.timer);

    ctx.globalAlpha = alpha;
    // ⚠ MADDE-3 TAŞMA TUZAĞI (§8B.27 B1/3): font yalnız H'ye bağlanırsa
    //   dar-uzun telefonda (360×800) metin ekran GENİŞLİĞİNDEN taşar.
    //   Çözüm iki katmanlı: font = min(H tabanlı, W tabanlı) + fillText maxWidth.
    //   Tek başına maxWidth metni aşırı sıkıştırır, tek başına font yetmez.
    const f1 = Math.round(Math.min(H * 0.08, W * 0.11));
    ctx.font = 'bold ' + f1 + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = m.special ? '#FFD600' : '#E3F0FF';
    ctx.shadowColor = m.special ? '#FFD600' : '#fff';
    ctx.shadowBlur = m.special ? 28 : 12;
    ctx.fillText(m.icon + ' ' + m.label, W/2, H * 0.42, W * 0.9);
    ctx.shadowBlur = 0;

    const f2 = Math.round(Math.min(H * 0.038, W * 0.055));
    ctx.font = 'bold ' + f2 + 'px Arial';
    ctx.fillStyle = '#00E676';
    ctx.fillText('+' + m.reward + ' 💰', W/2, H * 0.42 + Math.round(H * 0.07), W * 0.8);

    ctx.globalAlpha = 1;
    ctx.restore();
  }
};

// =============================================================================
// FUEL_PICKUP_SYSTEM - Yerden yakıt kanisteri toplama
// =============================================================================
const FUEL_PICKUP_SYSTEM = {
  canisters: [],
  spawnTimer: 0,
  spawnInterval: 22,
  totalCollected: 0,
  FUEL_RESTORE: 25,

  update(dt, vehicle, camera) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const aheadDist = camera ? camera.x + 800 + Math.random() * 400 : 800;
      this.spawnCanister(aheadDist, -55);
    }

    // Check collection
    if (vehicle) {
      const vx = vehicle.body ? vehicle.body.position.x : (vehicle.x || 0);
      const vy = vehicle.body ? vehicle.body.position.y : (vehicle.y || 0);
      for (let i = this.canisters.length - 1; i >= 0; i--) {
        const c = this.canisters[i];
        if (c.collected) { this.canisters.splice(i, 1); continue; }
        const dx = vx - c.x, dy = vy - c.y;
        if (Math.sqrt(dx*dx + dy*dy) < 40) {
          c.collected = true;
          this.totalCollected++;
          if (vehicle.fuel !== undefined) {
            vehicle.fuel = Math.min(vehicle.maxFuel || 100, vehicle.fuel + this.FUEL_RESTORE);
          }
          this.canisters.splice(i, 1);
        }
      }
    }

    // Remove off-screen left
    if (camera) {
      this.canisters = this.canisters.filter(c => c.x > camera.x - 200);
    }
  },

  spawnCanister(x, y) {
    this.canisters.push({ x, y: y || -55, bobOffset: Math.random() * Math.PI * 2, collected: false });
  },

  draw(ctx, camera, t) {
    ctx.save();
    for (const c of this.canisters) {
      const sx = c.x - (camera ? camera.x : 0);
      const sy = c.y + Math.sin(t * 2 + c.bobOffset) * 5 - (camera ? camera.y : 0);

      // Glow
      ctx.fillStyle = 'rgba(255,140,0,0.18)';
      ctx.beginPath();
      ctx.arc(sx, sy, 28, 0, Math.PI * 2);
      ctx.fill();

      // Canister body
      ctx.fillStyle = '#E65100';
      ctx.beginPath();
      ctx.roundRect(sx - 14, sy - 18, 28, 32, 5);
      ctx.fill();

      ctx.fillStyle = '#BF360C';
      ctx.beginPath();
      ctx.roundRect(sx - 12, sy + 8, 24, 6, 3);
      ctx.fill();

      // Nozzle
      ctx.fillStyle = '#8D6E63';
      ctx.fillRect(sx - 4, sy - 26, 8, 10);

      // Fuel symbol
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFE0B2';
      ctx.fillText('⛽', sx, sy + 4);

      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(sx - 4, sy - 8, 4, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// =============================================================================
// TERRAIN_INTERACTION - Araç-zemin etkileşimi
// =============================================================================
const TERRAIN_INTERACTION = {
  SURFACES: {
    normal:   { friction: 1.0,  speedMult: 1.0,   damage: 0,    slip: 0,    color: '#4CAF50', name: 'Normal'     },
    ice:      { friction: 0.22, speedMult: 1.08,  damage: 0,    slip: 0.95, color: '#B3E5FC', name: 'Ice'        },
    sand:     { friction: 0.55, speedMult: 0.82,  damage: 0,    slip: 0.1,  color: '#FFF9C4', name: 'Sand'        },
    mud:      { friction: 0.48, speedMult: 0.68,  damage: 0,    slip: 0.2,  color: '#795548', name: 'Mud'      },
    lava:     { friction: 0.8,  speedMult: 0.9,   damage: 8,    slip: 0,    color: '#FF5722', name: 'Lava'        },
    snow:     { friction: 0.38, speedMult: 0.78,  damage: 0,    slip: 0.3,  color: '#E3F2FD', name: 'Snow'        },
    asphalt:  { friction: 1.1,  speedMult: 1.05,  damage: 0,    slip: 0,    color: '#37474F', name: 'Asphalt'     },
    gravel:   { friction: 0.7,  speedMult: 0.92,  damage: 1,    slip: 0.05, color: '#9E9E9E', name: 'Gravel'      },
    grass:    { friction: 0.82, speedMult: 0.95,  damage: 0,    slip: 0.08, color: '#66BB6A', name: 'Grass'      },
    metal:    { friction: 0.9,  speedMult: 1.0,   damage: 0,    slip: 0.04, color: '#90A4AE', name: 'Metal'      }
  },

  currentSurface: 'normal',
  slipVelocity: 0,

  detectSurface(terrainType) {
    this.currentSurface = this.SURFACES[terrainType] ? terrainType : 'normal';
  },

  applyToVehicle(vehicle, dt) {
    const surf = this.SURFACES[this.currentSurface] || this.SURFACES.normal;

    // Apply slip
    if (surf.slip > 0 && vehicle.vx !== undefined) {
      this.slipVelocity += (vehicle.vx * surf.slip - this.slipVelocity) * dt * 3;
      vehicle.vx = vehicle.vx * (1 - surf.slip * dt) + this.slipVelocity * surf.slip * dt * 0.5;
    } else {
      this.slipVelocity = 0;
    }

    // Apply damage (lava etc)
    if (surf.damage > 0 && vehicle.hp !== undefined) {
      vehicle.hp = Math.max(0, vehicle.hp - surf.damage * dt);
    }

    // Apply speed multiplier
    if (vehicle.body && surf.speedMult !== 1.0) {
      // Handled externally via frictionMod
    }

    return surf;
  },

  drawSurfaceIndicator(ctx, W, H) {
    const surf = this.SURFACES[this.currentSurface] || this.SURFACES.normal;
    if (this.currentSurface === 'normal') return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(10, H - 50, 100, 32, 8);
    ctx.fill();
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = surf.color;
    ctx.textAlign = 'center';
    ctx.fillText('SURFACE: ' + surf.name, 60, H - 29);
    ctx.restore();
  }
};

// =============================================================================
// VEHICLE_PARTS_RUNTIME - Parça efektlerini runtime'da uygula
// =============================================================================
const VEHICLE_PARTS_RUNTIME = {
  activeParts: {},

  applyPart(partId, level, vehicle, dt, t) {
    if (!vehicle) return;
    switch (partId) {
      case 'nitro_boost':
        if (vehicle._nitroActive) {
          const boostForce = 1200 + level * 200;
          if (vehicle.body && vehicle.body.applyForce) {
            vehicle.body.applyForce({ x: boostForce * dt, y: 0 }, vehicle.body.position);
          } else if (vehicle.vx !== undefined) {
            vehicle.vx += boostForce * dt * 0.01;
          }
        }
        break;

      case 'spring_suspension':
        if (vehicle.suspensionStiffness !== undefined) {
          vehicle.suspensionStiffness = 800 + level * 120;
          vehicle.suspensionDamping   = 80  + level * 12;
        }
        break;

      case 'wings':
        if (!vehicle._nitroActive) break;
        if (vehicle.body) {
          const liftForce = -200 * level * dt;
          if (vehicle.body.applyForce) {
            vehicle.body.applyForce({ x: 0, y: liftForce }, vehicle.body.position);
          }
        }
        break;

      case 'turbo':
        if (vehicle._throttle && vehicle.enginePower !== undefined) {
          vehicle.enginePower = vehicle._baseEnginePower * (1 + level * 0.25);
        }
        break;

      case 'armor':
        if (vehicle._shielded === undefined) {
          vehicle.damageReduction = 0.1 * level;
        }
        break;
    }
  },

  drawNitroFlame(ctx, vehicle, camera, t) {
    if (!vehicle || !vehicle._nitroActive) return;
    const vx = vehicle.body ? vehicle.body.position.x : (vehicle.x || 0);
    const vy = vehicle.body ? vehicle.body.position.y : (vehicle.y || 0);
    const angle = vehicle.body ? vehicle.body.angle : (vehicle.angle || 0);
    const sx = vx - (camera ? camera.x : 0);
    const sy = vy - (camera ? camera.y : 0);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    // Flame behind vehicle
    for (let i = 0; i < 3; i++) {
      const flickr = 0.7 + 0.3 * Math.sin(t * 18 + i * 2.1);
      const len = (28 + i * 8) * flickr;
      const grad = ctx.createLinearGradient(-36, 0, -36 - len, 0);
      grad.addColorStop(0, `rgba(255,${80+i*60},0,0.9)`);
      grad.addColorStop(0.5, `rgba(255,${120+i*40},0,0.5)`);
      grad.addColorStop(1, 'rgba(255,255,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const hw = (7 - i * 1.5) * flickr;
      ctx.ellipse(-36 - len/2, (i-1)*4, len/2, hw, 0, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// =============================================================================
// END_SCREEN_DATA - Oyun sonu istatistikleri
// =============================================================================
const END_SCREEN_DATA = {
  _current: null,

  collect(gameState, vehicle) {
    this._current = {
      distance:       gameState.distance       || 0,
      coinsCollected: gameState.coinsCollected  || 0,
      score:          gameState.score           || 0,
      flips:          gameState.flips           || 0,
      topSpeed:       gameState.topSpeed        || 0,
      airTime:        gameState.maxAirTime      || 0,
      trickScore:     gameState.trickScore      || 0,
      fuelPickups:    gameState.fuelPickups     || 0,
      playTime:       gameState.playTime        || 0,
      vehicle:        vehicle ? vehicle.name : 'Bilinmiyor',
      vehicleIcon:    vehicle ? (vehicle.icon || '🚗') : '🚗',
      newBest:        gameState.distance > (gameState.prevBest || 0),
      prevBest:       gameState.prevBest        || 0,
      completedChallenges: CHALLENGE_SYSTEM.completedChallenges.slice(),
      weather:        WEATHER_SYSTEM_EXT.current,
      timestamp:      Date.now()
    };
    return this._current;
  },

  drawEndScreen(ctx, W, H, t) {
    const d = this._current;
    if (!d) return;
    ctx.save();

    // BG
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0A0F20');
    bgGrad.addColorStop(1, '#1A1030');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Header
    const headerCol = d.newBest ? '#FFD600' : '#E3F0FF';
    ctx.font = `bold ${Math.round(H * 0.065)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = headerCol;
    ctx.shadowColor = headerCol;
    ctx.shadowBlur = 22;
    ctx.fillText(d.newBest ? '🏆 NEW RECORD!' : '🏁 GAME OVER', W/2, H * 0.13);
    ctx.shadowBlur = 0;

    // Vehicle icon
    ctx.font = `${Math.round(H * 0.07)}px Arial`;
    ctx.fillText(d.vehicleIcon, W/2, H * 0.24);
    ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
    ctx.fillStyle = '#90A4AE';
    ctx.fillText(d.vehicle, W/2, H * 0.31);

    // Main stat: Distance
    ctx.font = `bold ${Math.round(H * 0.09)}px Arial`;
    ctx.fillStyle = '#00E676';
    ctx.shadowColor = '#00E676';
    ctx.shadowBlur = 18;
    ctx.fillText(`${Math.round(d.distance)}m`, W/2, H * 0.44);
    ctx.shadowBlur = 0;

    if (d.newBest) {
      ctx.font = `${Math.round(H * 0.022)}px Arial`;
      ctx.fillStyle = '#FFD600';
      ctx.fillText(`Previous: ${Math.round(d.prevBest)}m`, W/2, H * 0.5);
    }

    // Stats grid
    const stats = [
      { label: '💰 Coins',   value: d.coinsCollected },
      { label: '⭐ Score',   value: d.score.toLocaleString() },
      { label: '🔄 Flips',  value: d.flips },
      { label: '💨 Max Speed', value: Math.round(d.topSpeed) + ' km/h' },
      { label: '🛢️ Fuel',  value: d.fuelPickups },
      { label: '✨ Trick',  value: d.trickScore.toLocaleString() }
    ];

    const cols = 3;
    const rows = Math.ceil(stats.length / cols);
    const cellW = (W - 40) / cols;
    const cellH = 52;
    const gridX = 20;
    const gridY = H * 0.54;

    for (let i = 0; i < stats.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = gridX + col * cellW;
      const cy = gridY + row * cellH;
      const s = stats[i];

      ctx.fillStyle = 'rgba(20,30,55,0.85)';
      ctx.beginPath();
      ctx.roundRect(cx + 4, cy + 2, cellW - 8, cellH - 4, 8);
      ctx.fill();

      ctx.font = `${Math.round(H * 0.02)}px Arial`;
      ctx.fillStyle = '#90A4AE';
      ctx.textAlign = 'center';
      ctx.fillText(s.label, cx + cellW/2, cy + 20);

      ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
      ctx.fillStyle = '#E3F0FF';
      ctx.fillText(String(s.value), cx + cellW/2, cy + 42);
    }

    // Buttons
    const btnY = gridY + rows * cellH + 18;
    const btnW = Math.min(160, W * 0.36);
    const btnH2 = 44;
    const gap = 16;
    const totalBtnW = btnW * 2 + gap;
    const btnStartX = (W - totalBtnW) / 2;

    // Restart
    ctx.fillStyle = '#1565C0';
    ctx.beginPath();
    ctx.roundRect(btnStartX, btnY, btnW, btnH2, 12);
    ctx.fill();
    ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('🔄 RETRY', btnStartX + btnW/2, btnY + btnH2 * 0.64);

    // Menu
    ctx.fillStyle = '#37474F';
    ctx.beginPath();
    ctx.roundRect(btnStartX + btnW + gap, btnY, btnW, btnH2, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('🏠 MENU', btnStartX + btnW + gap + btnW/2, btnY + btnH2 * 0.64);

    ctx.restore();
  },

  get() { return this._current; },
  clear() { this._current = null; }
};

if (typeof module !== 'undefined') module.exports = { WEATHER_TYPES, WEATHER_SYSTEM_EXT, CHALLENGE_SYSTEM, GHOST_SYSTEM, TRICK_SYSTEM, POWERUP_SPAWNER_EXT, DISTANCE_MILESTONES, FUEL_PICKUP_SYSTEM, TERRAIN_INTERACTION, VEHICLE_PARTS_RUNTIME, END_SCREEN_DATA };


// =============================================================================
// TOURNAMENT_SYSTEM — Turnuva modu
// =============================================================================
const TOURNAMENT_SYSTEM = (() => {
  const TOURNAMENTS = {
    beginner: {
      id: 'beginner', label: 'Beginner Cup', icon: '🏁',
      rounds: 4, vehicles: ['jeep','bike'],
      tracks: ['grassland_easy','desert_easy','snow_easy','forest_easy'],
      unlockReq: 0,
      rewards: { coins: 500, gems: 5, vehicle: null, cup: 'bronze_cup' },
    },
    amateur: {
      id: 'amateur', label: 'Amateur League', icon: '🥉',
      rounds: 5, vehicles: ['monster_truck','atv'],
      tracks: ['grassland_mid','desert_mid','snow_mid','forest_mid','cliff_mid'],
      unlockReq: 300,
      rewards: { coins: 1200, gems: 15, vehicle: 'muscle_car', cup: 'silver_cup' },
    },
    pro: {
      id: 'pro', label: 'Pro Circuit', icon: '🥈',
      rounds: 6, vehicles: ['sports_car','supercar'],
      tracks: ['desert_hard','snow_hard','canyon_hard','volcano_hard','swamp_hard','night_hard'],
      unlockReq: 2000,
      rewards: { coins: 3000, gems: 40, vehicle: 'formula_racer', cup: 'gold_cup' },
    },
    elite: {
      id: 'elite', label: 'Elite Series', icon: '🥇',
      rounds: 6,
      tracks: ['hell_track','ice_cave','jungle_extreme','sand_storm','lava_field','arctic_blast'],
      unlockReq: 6000,
      rewards: { coins: 6000, gems: 80, vehicle: 'turbo_beast', cup: 'platinum_cup' },
    },
    master: {
      id: 'master', label: 'Master Class', icon: '🏆',
      rounds: 8,
      tracks: ['death_valley','lunar_surface','underwater','sky_highway','dimension_x','warp_zone','mega_ramp','final_frontier'],
      unlockReq: 15000,
      rewards: { coins: 15000, gems: 200, vehicle: 'hyper_car', cup: 'diamond_cup' },
    },
    world_champion: {
      id: 'world_champion', label: 'World Championship', icon: '👑',
      rounds: 10,
      tracks: ['championship_r1','championship_r2','championship_r3','championship_r4','championship_r5',
               'championship_r6','championship_r7','championship_r8','championship_r9','championship_grand_final'],
      unlockReq: 40000,
      rewards: { coins: 50000, gems: 1000, vehicle: 'ultimate_legend', cup: 'world_champion_trophy' },
    },
  };

  const TOURNAMENT_REWARDS = {
    bronze_cup:            { label: 'Bronze Cup',            rarity: 'common'    },
    silver_cup:            { label: 'Silver Cup',            rarity: 'uncommon'  },
    gold_cup:              { label: 'Gold Cup',              rarity: 'rare'      },
    platinum_cup:          { label: 'Platinum Cup',          rarity: 'epic'      },
    diamond_cup:           { label: 'Diamond Cup',           rarity: 'legendary' },
    world_champion_trophy: { label: 'World Champion Trophy', rarity: 'mythic'    },
  };

  let _activeTournament = null;
  let _tournamentScore  = { distance: 0, flips: 0, coins: 0, time: 0, round: 0 };

  function startTournament(id) {
    const def = TOURNAMENTS[id];
    if (!def) return false;
    _activeTournament  = { ...def, currentRound: 0, totalScore: 0, roundScores: [] };
    _tournamentScore   = { distance: 0, flips: 0, coins: 0, time: 0, round: 0 };
    return true;
  }

  function updateTournamentScore(distance, flips, coins) {
    if (!_activeTournament) return;
    _tournamentScore.distance += distance;
    _tournamentScore.flips    += flips;
    _tournamentScore.coins    += coins;
    _tournamentScore.time     += 1;
    _activeTournament.totalScore =
      _tournamentScore.distance * 1.0 +
      _tournamentScore.flips    * 50  +
      _tournamentScore.coins    * 2;
  }

  function getTournamentRank() {
    if (!_activeTournament) return null;
    const score = _activeTournament.totalScore;
    const rounds = _activeTournament.rounds;
    const perRound = score / Math.max(1, (_activeTournament.currentRound || 0) + 1);
    if (perRound >= 8000) return { rank: 1, label: '1st Place', medal: '🥇' };
    if (perRound >= 5000) return { rank: 2, label: '2nd Place', medal: '🥈' };
    if (perRound >= 3000) return { rank: 3, label: '3rd Place', medal: '🥉' };
    return { rank: 4, label: 'Participant', medal: '🎗️' };
  }

  function endTournamentRound(finalDistance, finalFlips, finalCoins) {
    if (!_activeTournament) return null;
    updateTournamentScore(finalDistance, finalFlips, finalCoins);
    const rank = getTournamentRank();
    _activeTournament.roundScores.push({ round: _activeTournament.currentRound, score: _activeTournament.totalScore, rank });
    _activeTournament.currentRound++;
    const finished = _activeTournament.currentRound >= _activeTournament.rounds;
    return { rank, finished, reward: finished ? TOURNAMENT_REWARDS[_activeTournament.rewards.cup] : null };
  }

  return { TOURNAMENTS, TOURNAMENT_REWARDS, startTournament, updateTournamentScore, getTournamentRank, endTournamentRound,
           get activeTournament() { return _activeTournament; }, get score() { return _tournamentScore; } };
})();

// =============================================================================
// CHALLENGE_RACE_MODE — Meydan okuma yarış modu
// =============================================================================
const CHALLENGE_RACE_MODE = (() => {
  const CHALLENGE_OPPONENTS = [
    { id: 0, name: 'Rookie Randy',   skill: 0.25, vehicle: 'jeep',          color: '#E74C3C', aggression: 0.1  },
    { id: 1, name: 'Dusty Dave',     skill: 0.40, vehicle: 'atv',           color: '#E67E22', aggression: 0.2  },
    { id: 2, name: 'Sally Speed',    skill: 0.55, vehicle: 'sports_car',    color: '#F1C40F', aggression: 0.35 },
    { id: 3, name: 'Mad Max Jr.',    skill: 0.65, vehicle: 'monster_truck', color: '#2ECC71', aggression: 0.55 },
    { id: 4, name: 'Nitro Nick',     skill: 0.75, vehicle: 'supercar',      color: '#1ABC9C', aggression: 0.45 },
    { id: 5, name: 'Canyon Queen',   skill: 0.82, vehicle: 'muscle_car',    color: '#3498DB', aggression: 0.60 },
    { id: 6, name: 'Ghost Rider X',  skill: 0.92, vehicle: 'formula_racer', color: '#9B59B6', aggression: 0.75 },
    { id: 7, name: 'The Legend',     skill: 1.00, vehicle: 'hyper_car',     color: '#ECF0F1', aggression: 0.95 },
  ];

  const _activeOpponents = [];

  function spawnOpponent(profileId, startDelay = 0) {
    const profile = CHALLENGE_OPPONENTS.find(o => o.id === profileId);
    if (!profile) return null;
    const opp = {
      ...profile,
      x: -startDelay * 0.06 * (profile.skill * 4 + 1),
      y: 0,
      vx: profile.skill * 5.5 + 1,
      vy: 0,
      angle: 0,
      angularVel: 0,
      alive: true,
      crashed: false,
      crashCooldown: 0,
      nitroCharge: profile.skill,
      _waypointIdx: 0,
    };
    _activeOpponents.push(opp);
    return opp;
  }

  function updateOpponents(dt) {
    for (const opp of _activeOpponents) {
      if (!opp.alive) continue;
      if (opp.crashed) {
        opp.crashCooldown -= dt;
        if (opp.crashCooldown <= 0) { opp.crashed = false; opp.vx = opp.skill * 3; }
        continue;
      }
      const targetVx = opp.skill * 6 * (1 + (opp.nitroCharge > 0.5 ? 0.3 : 0));
      opp.vx += (targetVx - opp.vx) * 0.04;
      if (Math.random() < opp.aggression * 0.002 * dt) {
        opp.nitroCharge = Math.min(1, opp.nitroCharge + 0.2);
      }
      if (opp.nitroCharge > 0) opp.nitroCharge -= 0.0005 * dt;
      if (Math.random() < 0.0008 * dt * (1 - opp.skill)) {
        opp.crashed = true;
        opp.crashCooldown = 800 + Math.random() * 1200;
        opp.vx = 0;
      }
      opp.x += opp.vx * dt * 0.06;
    }
  }

  function drawOpponents(ctx, camera) {
    for (const opp of _activeOpponents) {
      if (!opp.alive) continue;
      const sx = (opp.x - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
      const sy = (opp.y - camera.y) * camera.scale + ctx.canvas.height * 0.5;
      if (sx < -100 || sx > ctx.canvas.width + 100) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(opp.angle);
      ctx.fillStyle   = opp.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 1.5 * camera.scale;
      const w = 70 * camera.scale, h = 28 * camera.scale;
      ctx.beginPath();
      ctx.roundRect(-w*0.5, -h*0.5, w, h, 6 * camera.scale);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${10 * camera.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(opp.name.split(' ')[1] || opp.name, 0, 4 * camera.scale);
      if (opp.crashed) {
        ctx.fillStyle = '#FF4444';
        ctx.font = `${9 * camera.scale}px sans-serif`;
        ctx.fillText('CRASHED', 0, -h * 0.5 - 8 * camera.scale);
      }
      ctx.restore();
    }
  }

  function getRaceStandings(playerX) {
    const standings = _activeOpponents
      .filter(o => o.alive)
      .map(o => ({ name: o.name, x: o.x, color: o.color }));
    standings.push({ name: 'YOU', x: playerX, color: '#00FF88' });
    standings.sort((a, b) => b.x - a.x);
    return standings.map((s, i) => ({ ...s, position: i + 1 }));
  }

  return { CHALLENGE_OPPONENTS, spawnOpponent, updateOpponents, drawOpponents, getRaceStandings, _activeOpponents };
})();

// =============================================================================
// DRIFT_SCORING — Drift skor sistemi
// =============================================================================
const DRIFT_SCORING = (() => {
  let driftAngle      = 0;
  let driftTime       = 0;
  let driftScore      = 0;
  let driftMultiplier = 1;
  let _isDrifting     = false;
  let _comboTimer     = 0;
  const DRIFT_THRESHOLD_ANGLE  = 12;
  const DRIFT_THRESHOLD_SPEED  = 2.5;
  const MULTIPLIER_STEP_TIME   = 1200;
  const MAX_MULTIPLIER         = 8;

  function detectDrift(vehicle, dt) {
    const speed = Math.hypot(vehicle.vx, vehicle.vy);
    const angle = Math.abs(vehicle.slipAngle || 0);
    const wasD  = _isDrifting;
    _isDrifting = speed > DRIFT_THRESHOLD_SPEED && angle > DRIFT_THRESHOLD_ANGLE;
    if (!wasD && _isDrifting) driftTime = 0;
    return _isDrifting;
  }

  function updateDriftScore(vehicle, dt) {
    if (!_isDrifting) {
      if (driftTime > 0) {
        const bonus = Math.floor(driftScore);
        driftScore      = 0;
        driftMultiplier = 1;
        driftTime       = 0;
        _comboTimer     = 0;
        return { ended: true, bonus };
      }
      return { ended: false };
    }
    const speed = Math.hypot(vehicle.vx, vehicle.vy);
    driftTime       += dt;
    driftAngle       = Math.abs(vehicle.slipAngle || 0);
    _comboTimer     += dt;
    if (_comboTimer >= MULTIPLIER_STEP_TIME) {
      _comboTimer = 0;
      driftMultiplier = Math.min(driftMultiplier + 1, MAX_MULTIPLIER);
    }
    const basePoints = speed * 0.15 * (driftAngle / 45) * (dt / 16);
    driftScore += basePoints * driftMultiplier;
    return { ended: false, live: driftScore, multiplier: driftMultiplier };
  }

  function drawDriftIndicator(ctx, W, H, score, multiplier, t) {
    if (!_isDrifting && score <= 0) return;
    ctx.save();
    const alpha = _isDrifting ? 1 : Math.max(0, 1 - (t % 2000) / 2000);
    ctx.globalAlpha = alpha;
    const cx = W * 0.5, cy = H * 0.72;
    ctx.fillStyle = '#00FFAA';
    ctx.font = `bold ${28 + multiplier}px 'Orbitron', monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur  = 18;
    ctx.fillText(`DRIFT  ×${multiplier}`, cx, cy);
    ctx.font = `bold 20px 'Orbitron', monospace`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${Math.floor(score)} pts`, cx, cy + 32);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return { detectDrift, updateDriftScore, drawDriftIndicator,
           get driftAngle()      { return driftAngle;      },
           get driftTime()       { return driftTime;       },
           get driftScore()      { return driftScore;      },
           get driftMultiplier() { return driftMultiplier; },
           get isDrifting()      { return _isDrifting;     } };
})();

// =============================================================================
// REPLAY_RECORDER — Oyun replay kaydedici
// =============================================================================
const REPLAY_RECORDER = (() => {
  const FRAME_RATE   = 30;
  const MAX_DURATION = 120;
  const MAX_FRAMES   = FRAME_RATE * MAX_DURATION;
  const MS_PER_FRAME = 1000 / FRAME_RATE;

  let _recording  = false;
  let _frames     = [];
  let _lastCapt   = 0;
  let _startTime  = 0;

  function startRecord() {
    _recording = true;
    _frames    = [];
    _lastCapt  = 0;
    _startTime = performance.now();
  }

  function recordFrame(vehicle, t) {
    if (!_recording) return;
    if (t - _lastCapt < MS_PER_FRAME) return;
    if (_frames.length >= MAX_FRAMES) return;
    _lastCapt = t;
    _frames.push({
      t: t - _startTime,
      x:          vehicle.x,
      y:          vehicle.y,
      vx:         vehicle.vx,
      vy:         vehicle.vy,
      angle:      vehicle.angle,
      angularVel: vehicle.angularVel,
      nitro:      vehicle.nitro       || 0,
      health:     vehicle.health      || 100,
      onGround:   vehicle.onGround    || false,
      coins:      vehicle.totalCoins  || 0,
    });
  }

  function stopRecord() {
    _recording = false;
    return _frames.length;
  }

  function getReplayData() {
    return {
      frames:   _frames,
      duration: _frames.length > 0 ? _frames[_frames.length - 1].t : 0,
      frameRate: FRAME_RATE,
      frameCount: _frames.length,
    };
  }

  function getFrameAt(replayData, timeMs) {
    const frames = replayData.frames;
    if (!frames || frames.length === 0) return null;
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].t < timeMs) lo = mid + 1;
      else hi = mid;
    }
    return frames[lo];
  }

  return { FRAME_RATE, MAX_DURATION, startRecord, recordFrame, stopRecord, getReplayData, getFrameAt,
           get isRecording() { return _recording; }, get frameCount() { return _frames.length; } };
})();

// =============================================================================
// FREE_ROAM_MODE — Serbest gezinti modu
// =============================================================================
const FREE_ROAM_MODE = (() => {
  const EXPLORATION_REWARDS = {
    hidden_coin_stash:  { label: 'Hidden Coin Stash',   coins: 50,   gems: 0,  xp: 20   },
    secret_shortcut:    { label: 'Secret Shortcut',     coins: 0,    gems: 2,  xp: 50   },
    buried_treasure:    { label: 'Buried Treasure',     coins: 200,  gems: 10, xp: 100  },
    ancient_ruins:      { label: 'Ancient Ruins',       coins: 30,   gems: 5,  xp: 200  },
    mystery_box:        { label: 'Mystery Box',         coins: 100,  gems: 8,  xp: 80   },
    rocket_boost_pad:   { label: 'Rocket Boost Pad',    coins: 0,    gems: 0,  xp: 30,  effect: 'boost'  },
    gravity_anomaly:    { label: 'Gravity Anomaly',     coins: 0,    gems: 3,  xp: 75,  effect: 'gravity' },
  };

  let _active       = false;
  let _mapChunks    = {};
  let _vehicle      = null;
  let _mapId        = null;
  const hiddenObjects = [];
  let _discovered   = new Set();

  function initFreeRoam(vehicleId, mapId) {
    _active   = true;
    _vehicle  = vehicleId;
    _mapId    = mapId;
    _mapChunks = {};
    hiddenObjects.length = 0;
    _discovered.clear();
    _generateChunk(0);
    _generateChunk(1);
  }

  function _generateChunk(chunkIdx) {
    if (_mapChunks[chunkIdx]) return;
    const chunkW = 2000;
    const objects = [];
    const count   = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const types  = Object.keys(EXPLORATION_REWARDS);
      const type   = types[Math.floor(Math.random() * types.length)];
      const obj = {
        id:        `chunk${chunkIdx}_obj${i}`,
        type,
        x:         chunkIdx * chunkW + Math.random() * chunkW,
        y:         -40 - Math.random() * 60,
        discovered: false,
        radius:    30,
        pulse:     0,
      };
      hiddenObjects.push(obj);
      objects.push(obj);
    }
    _mapChunks[chunkIdx] = { objects, generated: true };
  }

  function updateFreeRoam(dt) {
    if (!_active) return;
    if (typeof GAME_STATE !== 'undefined' && GAME_STATE.vehicle) {
      const vx = GAME_STATE.vehicle.x;
      const chunkIdx = Math.floor(vx / 2000);
      _generateChunk(chunkIdx + 1);
      _generateChunk(chunkIdx + 2);
      for (const obj of hiddenObjects) {
        if (obj.discovered) continue;
        obj.pulse = (obj.pulse + dt * 0.003) % (Math.PI * 2);
        const dx = GAME_STATE.vehicle.x - obj.x;
        const dy = GAME_STATE.vehicle.y - obj.y;
        if (Math.hypot(dx, dy) < obj.radius + 25) {
          obj.discovered = true;
          _discovered.add(obj.id);
        }
      }
    }
  }

  function getExplorationStats() {
    return { discovered: _discovered.size, total: hiddenObjects.length };
  }

  return { EXPLORATION_REWARDS, initFreeRoam, updateFreeRoam, hiddenObjects, getExplorationStats,
           get isActive() { return _active; } };
})();

// =============================================================================
// SANDBOX_TOOLS — Sandbox modu araçları
// =============================================================================
const SANDBOX_TOOLS = (() => {
  let _gravityEnabled    = true;
  let _slowMotion        = false;
  let _infiniteNitro     = false;
  const _explosions      = [];
  const GRAVITY_NORMAL   = 0.00098;
  const GRAVITY_ZERO     = 0.0;
  const SLOW_FACTOR      = 0.25;

  function toggleGravity() {
    _gravityEnabled = !_gravityEnabled;
    if (typeof PHYSICS_CONFIG !== 'undefined') {
      PHYSICS_CONFIG.gravity = _gravityEnabled ? GRAVITY_NORMAL : GRAVITY_ZERO;
    }
    return _gravityEnabled;
  }

  function toggleSlowMotion() {
    _slowMotion = !_slowMotion;
    if (typeof GAME_STATE !== 'undefined') {
      GAME_STATE.timeScale = _slowMotion ? SLOW_FACTOR : 1.0;
    }
    return _slowMotion;
  }

  function spawnExplosion(x, y) {
    _explosions.push({
      x, y,
      radius: 0,
      maxRadius: 120 + Math.random() * 80,
      life: 1.0,
      decay: 0.025,
      shockwave: true,
      particles: Array.from({ length: 24 }, () => ({
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 4,
        x, y,
        life: 1.0,
        decay: 0.03 + Math.random() * 0.04,
        r: 4 + Math.random() * 6,
        color: Math.random() < 0.5 ? '#FF4500' : '#FFD700',
      })),
    });
  }

  function updateExplosions(dt) {
    for (let i = _explosions.length - 1; i >= 0; i--) {
      const e = _explosions[i];
      e.radius += (e.maxRadius - e.radius) * 0.18;
      e.life   -= e.decay * (dt / 16);
      for (let j = e.particles.length - 1; j >= 0; j--) {
        const p = e.particles[j];
        p.x    += p.vx * dt * 0.05;
        p.y    += p.vy * dt * 0.05;
        p.vy   += 0.00088 * dt;
        p.life -= p.decay * (dt / 16);
        if (p.life <= 0) e.particles.splice(j, 1);
      }
      if (e.life <= 0) _explosions.splice(i, 1);
    }
  }

  function drawExplosions(ctx, camera) {
    for (const e of _explosions) {
      const sx = (e.x - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
      const sy = (e.y - camera.y) * camera.scale + ctx.canvas.height * 0.5;
      ctx.save();
      ctx.globalAlpha = Math.max(0, e.life * 0.7);
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, e.radius * camera.scale);
      grad.addColorStop(0,   'rgba(255,200,50,0.9)');
      grad.addColorStop(0.4, 'rgba(255,80,0,0.6)');
      grad.addColorStop(1,   'rgba(50,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, e.radius * camera.scale, 0, Math.PI * 2);
      ctx.fill();
      for (const p of e.particles) {
        const px = (p.x - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
        const py = (p.y - camera.y) * camera.scale + ctx.canvas.height * 0.5;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.r * camera.scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function resetVehicle() {
    if (typeof GAME_STATE !== 'undefined' && GAME_STATE.vehicle) {
      GAME_STATE.vehicle.x  = GAME_STATE.vehicle._startX || 100;
      GAME_STATE.vehicle.y  = GAME_STATE.vehicle._startY || -50;
      GAME_STATE.vehicle.vx = 0;
      GAME_STATE.vehicle.vy = 0;
      GAME_STATE.vehicle.angle      = 0;
      GAME_STATE.vehicle.angularVel = 0;
      GAME_STATE.vehicle.health     = 100;
    }
  }

  return { toggleGravity, toggleSlowMotion, spawnExplosion, updateExplosions,
           drawExplosions, resetVehicle,
           get gravityEnabled() { return _gravityEnabled; },
           get slowMotion()     { return _slowMotion; } };
})();


// =============================================================================
// TOURNAMENT_SYSTEM MODULE
// =============================================================================
const TOURNAMENT_SYSTEM_EXT = (function() {
  'use strict';

  // ELO constants
  const K_FACTOR = 32;
  const BASE_ELO = 1000;

  // Tournament types
  const TOURNAMENT_TYPES = {
    SINGLE_ELIMINATION: 'single_elimination',
    DOUBLE_ELIMINATION: 'double_elimination',
    ROUND_ROBIN: 'round_robin',
    SWISS: 'swiss'
  };

  // Prize distribution percentages
  const PRIZE_DIST = {
    SINGLE_ELIMINATION: { 1: 0.50, 2: 0.25, 3: 0.15, participation: 0.01 },
    DOUBLE_ELIMINATION: { 1: 0.45, 2: 0.25, 3: 0.15, 4: 0.10, participation: 0.01 },
    ROUND_ROBIN:        { 1: 0.40, 2: 0.25, 3: 0.15, 4: 0.10, participation: 0.02 },
    SWISS:              { 1: 0.40, 2: 0.25, 3: 0.15, 4: 0.10, participation: 0.01 }
  };

  // Tournament definitions catalog
  const TOURNAMENT_CATALOG = [
    { id: 'weekly_classic', name: 'Weekly Classic', type: TOURNAMENT_TYPES.SINGLE_ELIMINATION,
      entryFee: 500, currency: 'coins', prizePool: 10000, rounds: 4, maxPlayers: 16,
      minElo: 0, maps: ['forest', 'desert', 'mountain'], vehicleClass: 'any' },
    { id: 'monthly_grand', name: 'Monthly Grand Prix', type: TOURNAMENT_TYPES.DOUBLE_ELIMINATION,
      entryFee: 2000, currency: 'coins', prizePool: 50000, rounds: 6, maxPlayers: 32,
      minElo: 1200, maps: ['all'], vehicleClass: 'any' },
    { id: 'speed_cup', name: 'Speed Cup', type: TOURNAMENT_TYPES.ROUND_ROBIN,
      entryFee: 300, currency: 'coins', prizePool: 5000, rounds: 3, maxPlayers: 8,
      minElo: 0, maps: ['highway', 'desert'], vehicleClass: 'motorcycle' },
    { id: 'swiss_open', name: 'Swiss Open', type: TOURNAMENT_TYPES.SWISS,
      entryFee: 800, currency: 'coins', prizePool: 15000, rounds: 5, maxPlayers: 32,
      minElo: 0, maps: ['all'], vehicleClass: 'any' },
    { id: 'holiday_special', name: 'Holiday Special', type: TOURNAMENT_TYPES.SINGLE_ELIMINATION,
      entryFee: 0, currency: 'coins', prizePool: 25000, rounds: 4, maxPlayers: 16,
      minElo: 0, maps: ['snow'], vehicleClass: 'any', special: true },
    { id: 'guild_war', name: 'Guild War Tournament', type: TOURNAMENT_TYPES.ROUND_ROBIN,
      entryFee: 1000, currency: 'coins', prizePool: 30000, rounds: 5, maxPlayers: 8,
      minElo: 0, maps: ['all'], vehicleClass: 'any', teamMode: true },
    { id: 'season_championship', name: 'Season Championship', type: TOURNAMENT_TYPES.DOUBLE_ELIMINATION,
      entryFee: 5000, currency: 'gems', prizePool: 200000, rounds: 7, maxPlayers: 64,
      minElo: 1500, maps: ['all'], vehicleClass: 'any', special: true, seasonal: true }
  ];

  // Active tournaments registry
  let activeTournaments = {};
  let tournamentHistory = [];
  let playerEloRatings = {};
  let spectatorData = {};

  // --- ELO RATING SYSTEM ---
  function getPlayerElo(playerId) {
    return playerEloRatings[playerId] || BASE_ELO;
  }

  function calcExpectedScore(eloA, eloB) {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  }

  function updateElo(winnerId, loserId) {
    const eloW = getPlayerElo(winnerId);
    const eloL = getPlayerElo(loserId);
    const expW = calcExpectedScore(eloW, eloL);
    const expL = 1 - expW;
    const newEloW = Math.round(eloW + K_FACTOR * (1 - expW));
    const newEloL = Math.round(eloL + K_FACTOR * (0 - expL));
    playerEloRatings[winnerId] = Math.max(100, newEloW);
    playerEloRatings[loserId] = Math.max(100, newEloL);
    return { winnerId, loserId, newEloW, newEloL, delta: newEloW - eloW };
  }

  // --- SEEDING ALGORITHM ---
  function seedPlayers(players) {
    return [...players].sort((a, b) => getPlayerElo(b.id) - getPlayerElo(a.id));
  }

  function generateBracket(players, type) {
    const seeded = seedPlayers(players);
    switch (type) {
      case TOURNAMENT_TYPES.SINGLE_ELIMINATION:
        return generateSingleElimBracket(seeded);
      case TOURNAMENT_TYPES.DOUBLE_ELIMINATION:
        return generateDoubleElimBracket(seeded);
      case TOURNAMENT_TYPES.ROUND_ROBIN:
        return generateRoundRobinSchedule(seeded);
      case TOURNAMENT_TYPES.SWISS:
        return generateSwissRound1(seeded);
      default:
        return generateSingleElimBracket(seeded);
    }
  }

  // --- SINGLE ELIMINATION ---
  function generateSingleElimBracket(seeded) {
    const n = nextPowerOf2(seeded.length);
    const slots = Array(n).fill(null);
    // Snake seeding: 1 vs n, 2 vs n-1, etc.
    for (let i = 0; i < seeded.length; i++) slots[i] = seeded[i];
    const rounds = [];
    const round1Matches = [];
    for (let i = 0; i < n; i += 2) {
      round1Matches.push(createMatch(slots[i], slots[i + 1], 'winners', 1, i / 2));
    }
    rounds.push({ roundNum: 1, bracket: 'winners', matches: round1Matches });
    return { type: TOURNAMENT_TYPES.SINGLE_ELIMINATION, rounds, currentRound: 1 };
  }

  // --- DOUBLE ELIMINATION ---
  function generateDoubleElimBracket(seeded) {
    const winnersBracket = generateSingleElimBracket(seeded);
    const losersBracket = { rounds: [], currentRound: 1 };
    return {
      type: TOURNAMENT_TYPES.DOUBLE_ELIMINATION,
      winnersBracket,
      losersBracket,
      grandFinal: null,
      currentPhase: 'winners'
    };
  }

  // --- ROUND ROBIN ---
  function generateRoundRobinSchedule(players) {
    const n = players.length;
    const rounds = [];
    const list = [...players];
    if (n % 2 !== 0) list.push({ id: 'BYE', name: 'BYE' });
    const total = list.length;
    const numRounds = total - 1;
    for (let r = 0; r < numRounds; r++) {
      const matches = [];
      for (let i = 0; i < total / 2; i++) {
        const p1 = list[i];
        const p2 = list[total - 1 - i];
        if (p1.id !== 'BYE' && p2.id !== 'BYE') {
          matches.push(createMatch(p1, p2, 'round_robin', r + 1, i));
        }
      }
      rounds.push({ roundNum: r + 1, matches });
      // Rotate: fix first element, rotate rest
      list.splice(1, 0, list.pop());
    }
    return { type: TOURNAMENT_TYPES.ROUND_ROBIN, rounds, standings: initStandings(players) };
  }

  function initStandings(players) {
    return players.map(p => ({
      playerId: p.id, playerName: p.name,
      wins: 0, losses: 0, draws: 0, points: 0, scoreFor: 0, scoreAgainst: 0
    }));
  }

  // --- SWISS SYSTEM ---
  function generateSwissRound1(players) {
    const seeded = [...players];
    const matches = [];
    for (let i = 0; i < seeded.length; i += 2) {
      if (i + 1 < seeded.length) {
        matches.push(createMatch(seeded[i], seeded[i + 1], 'swiss', 1, i / 2));
      }
    }
    return {
      type: TOURNAMENT_TYPES.SWISS,
      rounds: [{ roundNum: 1, matches }],
      currentRound: 1,
      playerRecords: initSwissRecords(players)
    };
  }

  function initSwissRecords(players) {
    const records = {};
    players.forEach(p => {
      records[p.id] = { wins: 0, losses: 0, draws: 0, points: 0, opponents: [], buchholz: 0 };
    });
    return records;
  }

  function generateSwissNextRound(tournament) {
    const records = tournament.playerRecords;
    // Sort by points, then buchholz
    const sorted = Object.entries(records)
      .sort((a, b) => b[1].points - a[1].points || b[1].buchholz - a[1].buchholz)
      .map(([id]) => id);

    const paired = new Set();
    const matches = [];
    const rNum = tournament.currentRound + 1;
    let idx = 0;
    while (idx < sorted.length - 1) {
      let p1 = sorted[idx];
      if (paired.has(p1)) { idx++; continue; }
      let found = false;
      for (let j = idx + 1; j < sorted.length; j++) {
        let p2 = sorted[j];
        if (paired.has(p2)) continue;
        if (!records[p1].opponents.includes(p2)) {
          matches.push(createMatch({ id: p1 }, { id: p2 }, 'swiss', rNum, matches.length));
          paired.add(p1); paired.add(p2);
          found = true; break;
        }
      }
      if (!found) {
        // Force pair anyway (bye or rematch)
        const p2 = sorted.find(id => !paired.has(id) && id !== p1);
        if (p2) {
          matches.push(createMatch({ id: p1 }, { id: p2 }, 'swiss', rNum, matches.length));
          paired.add(p1); paired.add(p2);
        }
      }
      idx++;
    }
    tournament.rounds.push({ roundNum: rNum, matches });
    tournament.currentRound = rNum;
    return tournament;
  }

  // --- MATCH CREATION ---
  function createMatch(player1, player2, bracket, round, position) {
    return {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      player1: player1 || null,
      player2: player2 || null,
      bracket,
      round,
      position,
      map: null,
      vehicle: null,
      result: null, // { winner, loser, score1, score2 }
      startTime: null,
      endTime: null,
      replayData: null,
      validated: false
    };
  }

  // --- SCORE VALIDATION (anti-cheat) ---
  function validateScore(score, map, vehicle, duration) {
    if (typeof score !== 'number' || score < 0) return false;
    if (duration < 5000) return false; // Too fast
    // Max possible score per second based on map/vehicle combo
    const maxRatePerSecond = 500;
    const seconds = duration / 1000;
    if (score > maxRatePerSecond * seconds) return false;
    // Score must be integer or near-integer
    if (Math.abs(score - Math.round(score)) > 0.01) return false;
    return true;
  }

  // --- MATCH RESULT PROCESSING ---
  function submitMatchResult(matchId, tournamentId, score1, score2, duration, replayData) {
    const tournament = activeTournaments[tournamentId];
    if (!tournament) return { success: false, error: 'Tournament not found' };

    let match = findMatch(tournament, matchId);
    if (!match) return { success: false, error: 'Match not found' };
    if (match.result) return { success: false, error: 'Match already completed' };

    // Validate scores
    if (!validateScore(score1, match.map, match.vehicle, duration)) {
      return { success: false, error: 'Score validation failed for player 1' };
    }
    if (!validateScore(score2, match.map, match.vehicle, duration)) {
      return { success: false, error: 'Score validation failed for player 2' };
    }

    const winner = score1 >= score2 ? match.player1 : match.player2;
    const loser  = score1 >= score2 ? match.player2 : match.player1;

    match.result = { winner: winner.id, loser: loser.id, score1, score2 };
    match.endTime = Date.now();
    match.replayData = replayData || null;
    match.validated = true;

    // Update ELO
    const eloUpdate = updateElo(winner.id, loser.id);

    // Advance bracket
    advanceBracket(tournament, match);

    // Update spectator data
    spectatorData[tournamentId] = { lastUpdate: Date.now(), latestMatch: match };

    return { success: true, match, eloUpdate };
  }

  function findMatch(tournament, matchId) {
    const search = (rounds) => {
      for (const round of rounds) {
        const m = round.matches.find(m => m.id === matchId);
        if (m) return m;
      }
      return null;
    };
    if (tournament.rounds) return search(tournament.rounds);
    if (tournament.winnersBracket) return search(tournament.winnersBracket.rounds) || search(tournament.losersBracket.rounds);
    return null;
  }

  function advanceBracket(tournament, completedMatch) {
    if (tournament.type === TOURNAMENT_TYPES.ROUND_ROBIN) {
      updateRoundRobinStandings(tournament, completedMatch);
    } else if (tournament.type === TOURNAMENT_TYPES.SWISS) {
      updateSwissRecords(tournament, completedMatch);
    }
    // Single/double elimination: next round matches are auto-generated when all current round done
    checkRoundCompletion(tournament);
  }

  function updateRoundRobinStandings(tournament, match) {
    const standings = tournament.standings || tournament.rounds[0]?.standings;
    if (!standings) return;
    const s1 = standings.find(s => s.playerId === match.player1.id);
    const s2 = standings.find(s => s.playerId === match.player2.id);
    if (!s1 || !s2) return;
    s1.scoreFor += match.result.score1; s1.scoreAgainst += match.result.score2;
    s2.scoreFor += match.result.score2; s2.scoreAgainst += match.result.score1;
    if (match.result.winner === match.player1.id) {
      s1.wins++; s1.points += 3; s2.losses++;
    } else if (match.result.winner === match.player2.id) {
      s2.wins++; s2.points += 3; s1.losses++;
    } else {
      s1.draws++; s1.points += 1; s2.draws++; s2.points += 1;
    }
  }

  function updateSwissRecords(tournament, match) {
    const r = tournament.playerRecords;
    if (!r) return;
    const r1 = r[match.player1.id]; const r2 = r[match.player2.id];
    if (!r1 || !r2) return;
    r1.opponents.push(match.player2.id); r2.opponents.push(match.player1.id);
    if (match.result.winner === match.player1.id) {
      r1.wins++; r1.points += 3; r2.losses++;
    } else {
      r2.wins++; r2.points += 3; r1.losses++;
    }
    // Buchholz: sum of opponents' points
    Object.keys(r).forEach(id => {
      r[id].buchholz = r[id].opponents.reduce((sum, oppId) => sum + (r[oppId]?.points || 0), 0);
    });
  }

  function checkRoundCompletion(tournament) {
    const rounds = tournament.rounds || (tournament.winnersBracket && tournament.winnersBracket.rounds);
    if (!rounds) return;
    const currentRound = rounds[rounds.length - 1];
    const allDone = currentRound.matches.every(m => m.result !== null);
    if (allDone && tournament.type === TOURNAMENT_TYPES.SWISS) {
      if (tournament.currentRound < (tournament.def?.rounds || 5)) {
        generateSwissNextRound(tournament);
      }
    }
  }

  // --- PRIZE DISTRIBUTION ---
  function distributePrizes(tournamentId) {
    const tournament = activeTournaments[tournamentId];
    if (!tournament) return null;
    const def = tournament.def;
    const prizePool = def.prizePool;
    const dist = PRIZE_DIST[def.type] || PRIZE_DIST.SINGLE_ELIMINATION;
    const prizes = [];
    const rankings = getFinalRankings(tournament);
    rankings.forEach((playerId, index) => {
      const rank = index + 1;
      const pct = dist[rank] || dist.participation || 0;
      const amount = Math.floor(prizePool * pct);
      prizes.push({ rank, playerId, amount, currency: def.currency });
    });
    tournament.prizes = prizes;
    tournament.status = 'completed';
    tournamentHistory.push({ ...tournament, completedAt: Date.now() });
    delete activeTournaments[tournamentId];
    return prizes;
  }

  function getFinalRankings(tournament) {
    if (tournament.type === TOURNAMENT_TYPES.ROUND_ROBIN) {
      return [...(tournament.standings || [])].sort((a, b) => b.points - a.points).map(s => s.playerId);
    }
    if (tournament.type === TOURNAMENT_TYPES.SWISS) {
      return Object.entries(tournament.playerRecords || {})
        .sort((a, b) => b[1].points - a[1].points || b[1].buchholz - a[1].buchholz)
        .map(([id]) => id);
    }
    // Single/double: last winner first
    return extractEliminationRankings(tournament);
  }

  function extractEliminationRankings(tournament) {
    const rounds = tournament.rounds || (tournament.winnersBracket && tournament.winnersBracket.rounds) || [];
    const allMatches = rounds.flatMap(r => r.matches).filter(m => m.result);
    allMatches.sort((a, b) => (b.round - a.round));
    const seen = new Set(); const ranked = [];
    allMatches.forEach(m => {
      if (m.result.winner && !seen.has(m.result.winner)) { seen.add(m.result.winner); ranked.push(m.result.winner); }
    });
    allMatches.forEach(m => {
      if (m.result.loser && !seen.has(m.result.loser)) { seen.add(m.result.loser); ranked.push(m.result.loser); }
    });
    return ranked;
  }

  // --- TOURNAMENT CREATION ---
  function createTournament(defId, registeredPlayers) {
    const def = TOURNAMENT_CATALOG.find(d => d.id === defId);
    if (!def) return null;
    const eligible = registeredPlayers.filter(p => getPlayerElo(p.id) >= def.minElo);
    const bracket = generateBracket(eligible, def.type);
    const tournament = {
      id: `tourn_${Date.now()}_${defId}`,
      def,
      ...bracket,
      players: eligible,
      status: 'active',
      startedAt: Date.now(),
      prizes: null,
      spectators: 0
    };
    activeTournaments[tournament.id] = tournament;
    return tournament;
  }

  // --- SPECTATOR MODE ---
  function joinAsSpectator(tournamentId, userId) {
    if (!spectatorData[tournamentId]) spectatorData[tournamentId] = { spectators: [], latestMatch: null, lastUpdate: 0 };
    spectatorData[tournamentId].spectators.push(userId);
    return spectatorData[tournamentId];
  }

  function getSpectatorView(tournamentId) {
    const t = activeTournaments[tournamentId];
    const sd = spectatorData[tournamentId];
    if (!t) return null;
    return {
      tournament: { id: t.id, name: t.def.name, type: t.def.type, status: t.status },
      currentMatches: getCurrentMatches(t),
      latestResult: sd?.latestMatch || null,
      spectatorCount: sd?.spectators?.length || 0
    };
  }

  function getCurrentMatches(tournament) {
    const rounds = tournament.rounds || (tournament.winnersBracket?.rounds) || [];
    if (!rounds.length) return [];
    const lastRound = rounds[rounds.length - 1];
    return lastRound.matches.filter(m => !m.result);
  }

  // --- BRACKET VISUALIZATION DATA ---
  function getBracketVisualization(tournamentId) {
    const t = activeTournaments[tournamentId] || tournamentHistory.find(h => h.id === tournamentId);
    if (!t) return null;
    const rounds = t.rounds || (t.winnersBracket?.rounds) || [];
    return {
      type: t.def?.type || t.type,
      rounds: rounds.map(r => ({
        roundNum: r.roundNum,
        matches: r.matches.map(m => ({
          id: m.id,
          player1: m.player1?.name || m.player1?.id || 'TBD',
          player2: m.player2?.name || m.player2?.id || 'TBD',
          score1: m.result?.score1 ?? null,
          score2: m.result?.score2 ?? null,
          winner: m.result?.winner || null
        }))
      })),
      standings: t.standings || null
    };
  }

  // --- TOURNAMENT HISTORY & STATS ---
  function getPlayerTournamentStats(playerId) {
    const stats = { played: 0, wins: 0, prizeEarned: 0, bestFinish: null, eloHistory: [] };
    tournamentHistory.forEach(t => {
      const inTournament = t.players?.some(p => p.id === playerId);
      if (!inTournament) return;
      stats.played++;
      const prize = t.prizes?.find(p => p.playerId === playerId);
      if (prize) {
        stats.prizeEarned += prize.amount;
        if (!stats.bestFinish || prize.rank < stats.bestFinish) stats.bestFinish = prize.rank;
        if (prize.rank === 1) stats.wins++;
      }
    });
    return stats;
  }

  // --- SEASON CHAMPIONSHIP ---
  function getSeasonChampionship() {
    return TOURNAMENT_CATALOG.find(d => d.seasonal);
  }

  // --- REPLAY FORMAT ---
  function createTournamentReplay(matchId, frames) {
    return {
      matchId,
      version: 1,
      recordedAt: Date.now(),
      frameRate: 20,
      frames: frames.map(f => [f.x, f.y, f.angle, f.vx, f.vy, f.fuel, f.health]),
      metadata: { totalFrames: frames.length, duration: frames.length * 50 }
    };
  }

  // Utility
  function nextPowerOf2(n) {
    let p = 1;
    while (p < n) p *= 2;
    return p;
  }

  // Public API
  return {
    TYPES: TOURNAMENT_TYPES,
    CATALOG: TOURNAMENT_CATALOG,
    create: createTournament,
    submitResult: submitMatchResult,
    distributePrizes,
    getVisualization: getBracketVisualization,
    getSpectatorView,
    joinAsSpectator,
    getPlayerStats: getPlayerTournamentStats,
    getPlayerElo,
    updateElo,
    validateScore,
    createReplay: createTournamentReplay,
    getActive: () => ({ ...activeTournaments }),
    getHistory: () => [...tournamentHistory],
    getSeasonChampionship,
    generateBracket
  };
})();

// =============================================================================
// TRICK_SYSTEM MODULE
// =============================================================================
const TRICK_SYSTEM_EXT = (function() {
  'use strict';

  const TWO_PI = Math.PI * 2;

  // Trick type definitions
  const TRICK_TYPES = {
    BACKFLIP:        { id: 'backflip',        name: 'Backflip',        baseScore: 500,  difficulty: 1.5, rotDir: -1, rotRequired: TWO_PI },
    FRONTFLIP:       { id: 'frontflip',       name: 'Frontflip',       baseScore: 500,  difficulty: 1.5, rotDir: 1,  rotRequired: TWO_PI },
    HALF_PIPE:       { id: 'half_pipe',       name: 'Half-Pipe',       baseScore: 200,  difficulty: 1.0, rotRequired: Math.PI },
    WHEELIE:         { id: 'wheelie',         name: 'Wheelie',         baseScore: 150,  difficulty: 0.8, timeRequired: 1500 },
    ENDO:            { id: 'endo',            name: 'Endo',            baseScore: 200,  difficulty: 1.0, timeRequired: 1000 },
    AIR_TIME:        { id: 'air_time',        name: 'Air Time',        baseScore: 100,  difficulty: 0.5, timeRequired: 500 },
    SUPERMAN:        { id: 'superman',        name: 'Superman',        baseScore: 800,  difficulty: 2.5, leanRequired: 0.7 },
    DOUBLE_BACKFLIP: { id: 'double_backflip', name: 'Double Backflip', baseScore: 1200, difficulty: 3.0, rotDir: -1, rotRequired: TWO_PI * 2 },
    TRIPLE_BACKFLIP: { id: 'triple_backflip', name: 'Triple Backflip', baseScore: 3000, difficulty: 5.0, rotDir: -1, rotRequired: TWO_PI * 3, bonusMultiplier: 5 },
    PERFECT_LANDING: { id: 'perfect_landing', name: 'Perfect Landing', baseScore: 400,  difficulty: 1.2, maxAngleError: 0.15 },
    COMBO:           { id: 'combo',           name: 'Combo',           baseScore: 0,    difficulty: 1.0 }
  };

  // Trick unlock progression tree
  const TRICK_UNLOCK_TREE = {
    wheelie:         { requires: null,             xpRequired: 0 },
    air_time:        { requires: null,             xpRequired: 0 },
    endo:            { requires: 'wheelie',        xpRequired: 500 },
    half_pipe:       { requires: 'air_time',       xpRequired: 1000 },
    frontflip:       { requires: 'half_pipe',      xpRequired: 2000 },
    backflip:        { requires: 'half_pipe',      xpRequired: 2000 },
    perfect_landing: { requires: 'backflip',       xpRequired: 3000 },
    superman:        { requires: 'frontflip',      xpRequired: 5000 },
    double_backflip: { requires: 'backflip',       xpRequired: 8000 },
    triple_backflip: { requires: 'double_backflip',xpRequired: 15000 }
  };

  // Trick challenge missions
  const TRICK_CHALLENGES = [
    { id: 'tc_1',  name: '5 Backflips',         trickId: 'backflip',        count: 5,  xpReward: 500,  coinReward: 200 },
    { id: 'tc_2',  name: '3 Double Backflips',   trickId: 'double_backflip', count: 3,  xpReward: 1000, coinReward: 500 },
    { id: 'tc_3',  name: 'Triple Backflip',      trickId: 'triple_backflip', count: 1,  xpReward: 2000, coinReward: 1000 },
    { id: 'tc_4',  name: '10 Wheelies',          trickId: 'wheelie',         count: 10, xpReward: 300,  coinReward: 100 },
    { id: 'tc_5',  name: '5 Perfect Landings',   trickId: 'perfect_landing', count: 5,  xpReward: 800,  coinReward: 300 },
    { id: 'tc_6',  name: '3 Supermans',          trickId: 'superman',        count: 3,  xpReward: 1500, coinReward: 600 },
    { id: 'tc_7',  name: '20s Air Time total',   trickId: 'air_time',        count: 20, xpReward: 400,  coinReward: 150, totalSeconds: true },
    { id: 'tc_8',  name: '5-Trick Combo',        comboLength: 5,             xpReward: 2000, coinReward: 800 }
  ];

  // Session state
  let sessionTricks = [];
  let comboState = { tricks: [], lastTrickTime: 0, multiplier: 1, totalComboScore: 0 };
  let airTimeStart = null;
  let wheelieStart = null;
  let endoStart = null;
  let rotationAccum = 0;       // accumulated rotation (radians) in air
  let lastAngle = null;
  let prevWheelStates = { front: true, rear: true };
  let trickXP = 0;
  let challengeProgress = {};
  let unlockedTricks = new Set(['wheelie', 'air_time']); // default unlocked

  const COMBO_WINDOW_MS = 3000; // 3 seconds to chain combo

  // --- DETECTION ENGINE ---
  function updateTrickDetection(vehicleState, dt) {
    const now = Date.now();
    const { angle, angularVel, frontWheelOnGround, rearWheelOnGround, x, y, vx, vy, lean } = vehicleState;
    const bothInAir = !frontWheelOnGround && !rearWheelOnGround;
    const completedTricks = [];

    // --- Air time tracking ---
    if (bothInAir) {
      if (airTimeStart === null) airTimeStart = now;
    } else {
      if (airTimeStart !== null) {
        const airDuration = now - airTimeStart;
        if (airDuration >= TRICK_TYPES.AIR_TIME.timeRequired) {
          const trick = detectAirTimeTrick(airDuration, angle);
          if (trick) completedTricks.push(trick);
        }
        // On landing, check perfect landing
        if (lastAngle !== null) {
          const angleError = Math.abs(normalizeAngle(angle));
          if (angleError < TRICK_TYPES.PERFECT_LANDING.maxAngleError) {
            completedTricks.push(completeTrick(TRICK_TYPES.PERFECT_LANDING, 1));
          }
        }
        airTimeStart = null;
        rotationAccum = 0;
        lastAngle = null;
      }
    }

    // --- Rotation tracking (in air) ---
    if (bothInAir && lastAngle !== null) {
      let delta = angle - lastAngle;
      // Normalize delta to [-PI, PI]
      while (delta > Math.PI) delta -= TWO_PI;
      while (delta < -Math.PI) delta += TWO_PI;
      rotationAccum += delta;

      // Detect rotation tricks based on accumulated rotation
      const absRot = Math.abs(rotationAccum);
      if (absRot >= TRICK_TYPES.TRIPLE_BACKFLIP.rotRequired && !hasJustDetected('triple_backflip')) {
        if (rotationAccum < 0) completedTricks.push(completeTrick(TRICK_TYPES.TRIPLE_BACKFLIP, Math.min(absRot / (TWO_PI * 3), 1.5)));
      } else if (absRot >= TRICK_TYPES.DOUBLE_BACKFLIP.rotRequired && !hasJustDetected('double_backflip')) {
        if (rotationAccum < 0) completedTricks.push(completeTrick(TRICK_TYPES.DOUBLE_BACKFLIP, Math.min(absRot / (TWO_PI * 2), 1.3)));
      } else if (absRot >= TRICK_TYPES.BACKFLIP.rotRequired && !hasJustDetected('backflip')) {
        if (rotationAccum < 0) completedTricks.push(completeTrick(TRICK_TYPES.BACKFLIP, Math.min(absRot / TWO_PI, 1.2)));
      }
      if (absRot >= TRICK_TYPES.FRONTFLIP.rotRequired && !hasJustDetected('frontflip')) {
        if (rotationAccum > 0) completedTricks.push(completeTrick(TRICK_TYPES.FRONTFLIP, Math.min(absRot / TWO_PI, 1.2)));
      }
      if (absRot >= TRICK_TYPES.HALF_PIPE.rotRequired && !hasJustDetected('half_pipe')) {
        completedTricks.push(completeTrick(TRICK_TYPES.HALF_PIPE, 1.0));
      }

      // Superman: extreme forward lean in air
      if (lean && lean > TRICK_TYPES.SUPERMAN.leanRequired && !hasJustDetected('superman')) {
        completedTricks.push(completeTrick(TRICK_TYPES.SUPERMAN, lean));
      }
    }

    if (bothInAir) lastAngle = angle;

    // --- Wheelie detection ---
    if (!frontWheelOnGround && rearWheelOnGround) {
      if (wheelieStart === null) wheelieStart = now;
    } else {
      if (wheelieStart !== null) {
        const dur = now - wheelieStart;
        if (dur >= TRICK_TYPES.WHEELIE.timeRequired) {
          completedTricks.push(completeTrick(TRICK_TYPES.WHEELIE, Math.min(dur / 3000, 2.0)));
        }
        wheelieStart = null;
      }
    }

    // --- Endo detection ---
    if (frontWheelOnGround && !rearWheelOnGround) {
      if (endoStart === null) endoStart = now;
    } else {
      if (endoStart !== null) {
        const dur = now - endoStart;
        if (dur >= TRICK_TYPES.ENDO.timeRequired) {
          completedTricks.push(completeTrick(TRICK_TYPES.ENDO, Math.min(dur / 2000, 1.8)));
        }
        endoStart = null;
      }
    }

    prevWheelStates = { front: frontWheelOnGround, rear: rearWheelOnGround };

    // Process each completed trick
    completedTricks.forEach(trick => processTrick(trick, now));
    return completedTricks;
  }

  function detectAirTimeTrick(duration, landingAngle) {
    const seconds = duration / 1000;
    const type = TRICK_TYPES.AIR_TIME;
    return completeTrick(type, Math.min(seconds / 3, 2.0));
  }

  function completeTrick(trickType, qualityMult) {
    return {
      type: trickType,
      qualityMultiplier: Math.max(0.5, Math.min(qualityMult, 3.0)),
      detectedAt: Date.now(),
      baseScore: trickType.baseScore,
      difficultyMult: trickType.difficulty
    };
  }

  // Track recent detections to prevent duplicates
  const recentDetections = {};
  function hasJustDetected(trickId) {
    const last = recentDetections[trickId] || 0;
    if (Date.now() - last < 500) return true;
    return false;
  }
  function markDetected(trickId) {
    recentDetections[trickId] = Date.now();
  }

  // --- COMBO SYSTEM ---
  function processTrick(trick, now) {
    if (!unlockedTricks.has(trick.type.id)) return;
    markDetected(trick.type.id);

    const timeSinceLast = now - comboState.lastTrickTime;
    if (timeSinceLast > COMBO_WINDOW_MS && comboState.tricks.length > 0) {
      // Combo broken
      finalizeCombo();
    }

    const score = calculateTrickScore(trick);
    trick.score = score;
    comboState.tricks.push(trick);
    comboState.lastTrickTime = now;
    comboState.multiplier = calculateComboMultiplier(comboState.tricks.length);
    comboState.totalComboScore += score * comboState.multiplier;

    // Add to session
    sessionTricks.push({ ...trick, comboPosition: comboState.tricks.length });

    // Grant XP and coins
    const xpGain = Math.floor(score / 10);
    const coinGain = Math.floor(score / 50);
    trickXP += xpGain;

    // Update challenge progress
    updateChallengeProgress(trick.type.id, 1);

    return { score, comboMultiplier: comboState.multiplier, xpGain, coinGain };
  }

  function calculateTrickScore(trick) {
    const bonusMult = trick.type.bonusMultiplier || 1;
    return Math.floor(
      trick.baseScore
      * trick.difficultyMult
      * trick.qualityMultiplier
      * bonusMult
    );
  }

  function calculateComboMultiplier(comboLength) {
    // 1x, 1.5x, 2x, 2.5x, 3x, 3.5x... max 6x
    return Math.min(1 + (comboLength - 1) * 0.5, 6.0);
  }

  function finalizeCombo() {
    if (comboState.tricks.length >= 2) {
      const comboBonus = Math.floor(comboState.totalComboScore * 0.1 * comboState.tricks.length);
      sessionTricks.push({
        type: TRICK_TYPES.COMBO,
        score: comboBonus,
        comboLength: comboState.tricks.length,
        detectedAt: Date.now()
      });
      updateChallengeProgress('combo', comboState.tricks.length);
    }
    comboState = { tricks: [], lastTrickTime: 0, multiplier: 1, totalComboScore: 0 };
  }

  function onCrash() {
    finalizeCombo();
    comboState = { tricks: [], lastTrickTime: 0, multiplier: 1, totalComboScore: 0 };
    rotationAccum = 0;
    lastAngle = null;
    airTimeStart = null;
    wheelieStart = null;
    endoStart = null;
  }

  // --- TRICK UNLOCK PROGRESSION ---
  function checkUnlocks(playerTrickXP) {
    const newUnlocks = [];
    Object.entries(TRICK_UNLOCK_TREE).forEach(([trickId, req]) => {
      if (unlockedTricks.has(trickId)) return;
      const reqMet = !req.requires || unlockedTricks.has(req.requires);
      const xpMet = playerTrickXP >= req.xpRequired;
      if (reqMet && xpMet) {
        unlockedTricks.add(trickId);
        newUnlocks.push(trickId);
      }
    });
    return newUnlocks;
  }

  // --- CHALLENGE PROGRESS ---
  function updateChallengeProgress(trickId, amount) {
    TRICK_CHALLENGES.forEach(ch => {
      if (ch.trickId === trickId || (ch.comboLength && trickId === 'combo')) {
        if (!challengeProgress[ch.id]) challengeProgress[ch.id] = 0;
        if (ch.comboLength) {
          challengeProgress[ch.id] = Math.max(challengeProgress[ch.id], amount);
        } else {
          challengeProgress[ch.id] += amount;
        }
      }
    });
  }

  function getCompletedChallenges() {
    return TRICK_CHALLENGES.filter(ch => {
      const prog = challengeProgress[ch.id] || 0;
      if (ch.comboLength) return prog >= ch.comboLength;
      return prog >= ch.count;
    });
  }

  // --- SESSION STATS ---
  function getSessionStats() {
    const bestTrick = sessionTricks.reduce((best, t) => (!best || t.score > best.score) ? t : best, null);
    const totalScore = sessionTricks.reduce((sum, t) => sum + (t.score || 0), 0);
    const counts = {};
    sessionTricks.forEach(t => {
      const id = t.type?.id || 'combo';
      counts[id] = (counts[id] || 0) + 1;
    });
    return { bestTrick, totalScore, trickCount: sessionTricks.length, counts, trickXP, currentCombo: comboState };
  }

  function getSocialShareData(trick) {
    return {
      trickName: trick.type?.name || 'Trick',
      score: trick.score,
      message: `I just pulled off a ${trick.type?.name || 'trick'} for ${trick.score} points in AHMET! 🏍️`,
      imageHint: trick.type?.id || 'trick',
      shareUrl: `https://ahmet.game/share?trick=${trick.type?.id || 'trick'}&score=${trick.score}`
    };
  }

  function resetSession() {
    sessionTricks = [];
    comboState = { tricks: [], lastTrickTime: 0, multiplier: 1, totalComboScore: 0 };
    airTimeStart = null; wheelieStart = null; endoStart = null;
    rotationAccum = 0; lastAngle = null;
    trickXP = 0; challengeProgress = {};
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= TWO_PI;
    while (a < -Math.PI) a += TWO_PI;
    return a;
  }

  return {
    TYPES: TRICK_TYPES,
    CHALLENGES: TRICK_CHALLENGES,
    UNLOCK_TREE: TRICK_UNLOCK_TREE,
    update: updateTrickDetection,
    onCrash,
    getSessionStats,
    getSocialShareData,
    checkUnlocks,
    getCompletedChallenges,
    getComboState: () => ({ ...comboState }),
    getUnlockedTricks: () => new Set(unlockedTricks),
    resetSession,
    finalizeCombo
  };
})();

// =============================================================================
// SEASON_SYSTEM MODULE
// =============================================================================
const SEASON_SYSTEM_EXT = (function() {
  'use strict';

  const TOTAL_TIERS = 100;
  const XP_PER_TIER = 1000;

  // Season cosmetic types
  const COSMETIC_TYPES = { VEHICLE_SKIN: 'vehicle_skin', TRAIL: 'trail', FRAME: 'frame', AVATAR: 'avatar', EMOTE: 'emote' };

  // Season pass tiers (abbreviated — runtime builds 100 tiers)
  function buildSeasonTiers(theme) {
    const tiers = [];
    const freeRewards  = [50, null, 100, null, 200, null, 300, null, 500, null];
    const premRewards  = [100, 200, 300, 500, 1000, 1500, 2000, 3000, 5000, 10000];
    for (let i = 1; i <= TOTAL_TIERS; i++) {
      const freeidx = (i - 1) % freeRewards.length;
      const premidx = (i - 1) % premRewards.length;
      const isMilestone = [25, 50, 75, 100].includes(i);
      tiers.push({
        tier: i,
        xpRequired: i * XP_PER_TIER,
        freeReward: isMilestone
          ? { type: 'coins', amount: i * 100, name: `${i * 100} Coins` }
          : (freeRewards[freeidx] ? { type: 'coins', amount: freeRewards[freeidx], name: `${freeRewards[freeidx]} Coins` } : null),
        premiumReward: {
          type: i % 20 === 0 ? COSMETIC_TYPES.VEHICLE_SKIN : i % 10 === 0 ? COSMETIC_TYPES.TRAIL : 'coins',
          amount: premRewards[premidx],
          name: i % 20 === 0 ? `${theme} Vehicle Skin` : i % 10 === 0 ? `${theme} Trail` : `${premRewards[premidx]} Coins`,
          exclusive: true,
          seasonId: null // set at runtime
        },
        isMilestone
      });
    }
    return tiers;
  }

  // Season definitions
  const SEASON_CATALOG = [
    { id: 'season_1', name: 'Season 1: Ignition',   theme: 'fire',   durationDays: 30, passPrice: 950 },
    { id: 'season_2', name: 'Season 2: Arctic Rush', theme: 'ice',    durationDays: 30, passPrice: 950 },
    { id: 'season_3', name: 'Season 3: Storm Rider', theme: 'storm',  durationDays: 30, passPrice: 950 },
    { id: 'season_4', name: 'Season 4: Phantom Run',  theme: 'neon',   durationDays: 30, passPrice: 950 },
    { id: 'season_5', name: 'Season 5: Desert King',  theme: 'sand',   durationDays: 30, passPrice: 950 }
  ];

  // XP activity multipliers
  const XP_SOURCES = {
    race_finish:        { base: 50,  mult: 1.0 },
    race_win:           { base: 100, mult: 1.5 },
    daily_challenge:    { base: 200, mult: 1.0 },
    weekly_challenge:   { base: 500, mult: 1.0 },
    trick_score:        { base: 10,  mult: 0.01 }, // per trick score point
    distance_km:        { base: 20,  mult: 1.0 },
    coin_spent_100:     { base: 5,   mult: 1.0 },
    first_win_daily:    { base: 150, mult: 1.0 },
    story_mission:      { base: 300, mult: 1.0 },
    season_boss:        { base: 1000,mult: 1.0 }
  };

  // Weekly challenges for season
  function generateWeeklySeasonChallenges(seasonId, weekNum) {
    const rng = seededRandom(seasonId + weekNum);
    const categories = ['distance', 'tricks', 'coins', 'wins', 'airtime'];
    return Array.from({ length: 5 }, (_, i) => {
      const cat = categories[Math.floor(rng() * categories.length)];
      return {
        id: `wsc_${seasonId}_w${weekNum}_${i}`,
        seasonId, weekNum,
        category: cat,
        description: generateChallengeDesc(cat, rng),
        xpReward: 300 + Math.floor(rng() * 200),
        coinReward: 100 + Math.floor(rng() * 100)
      };
    });
  }

  function generateChallengeDesc(cat, rng) {
    const descs = {
      distance: ['Travel 10km', 'Travel 25km', 'Travel 50km'],
      tricks:   ['Do 10 backflips', 'Do 5 double backflips', 'Get 50000 trick score'],
      coins:    ['Collect 5000 coins', 'Collect 10000 coins'],
      wins:     ['Win 5 races', 'Win 10 races'],
      airtime:  ['Get 60s air time', 'Get 120s air time']
    };
    const opts = descs[cat] || ['Complete 5 runs'];
    return opts[Math.floor(rng() * opts.length)];
  }

  // Season story missions
  const STORY_MISSIONS = [
    { id: 'sm_1', name: 'The First Hill', description: 'Complete your first race', xpReward: 500 },
    { id: 'sm_2', name: 'Airborne', description: 'Get 10 seconds of air time in one run', xpReward: 800 },
    { id: 'sm_3', name: 'Coin Hoarder', description: 'Collect 500 coins in one run', xpReward: 1000 },
    { id: 'sm_4', name: 'Trick Master', description: 'Land 3 backflips in one run', xpReward: 1200 },
    { id: 'sm_5', name: 'Speed Demon', description: 'Maintain max speed for 30 seconds', xpReward: 1500 },
    { id: 'sm_6', name: 'The Gauntlet', description: 'Complete the gauntlet map', xpReward: 2000 },
    { id: 'sm_7', name: 'Season Boss', description: 'Defeat the season boss', xpReward: 5000 }
  ];

  // Season boss definitions
  const SEASON_BOSSES = {
    fire:  { name: 'Inferno King',  hp: 1000, phases: 3, rewardSkin: 'inferno_vehicle' },
    ice:   { name: 'Frost Titan',   hp: 1200, phases: 3, rewardSkin: 'frost_vehicle' },
    storm: { name: 'Thunder Lord',  hp: 1500, phases: 4, rewardSkin: 'thunder_vehicle' },
    neon:  { name: 'Neon Ghost',    hp: 1100, phases: 3, rewardSkin: 'neon_vehicle' },
    sand:  { name: 'Sand Wyrm',     hp: 1300, phases: 4, rewardSkin: 'sand_vehicle' }
  };

  // Seasonal vehicle variants
  const SEASONAL_VEHICLES = {
    fire:  [{ id: 'fire_jeep',   baseId: 'jeep',   skin: 'fire_skin' }],
    ice:   [{ id: 'ice_bike',    baseId: 'bike',   skin: 'ice_skin' }],
    storm: [{ id: 'storm_truck', baseId: 'truck',  skin: 'storm_skin' }],
    neon:  [{ id: 'neon_car',    baseId: 'car',    skin: 'neon_skin' }],
    sand:  [{ id: 'sand_buggy',  baseId: 'buggy',  skin: 'sand_skin' }]
  };

  // Active season state
  let activeSeason = null;
  let playerSeasonData = {}; // { xp, tier, hasPremiumPass, completedMissions, ... }
  let seasonLeaderboard = [];
  let archivedSeasons = [];

  function startSeason(seasonId) {
    const def = SEASON_CATALOG.find(s => s.id === seasonId);
    if (!def) return null;
    const now = Date.now();
    const tiers = buildSeasonTiers(def.theme);
    tiers.forEach(t => { if (t.premiumReward) t.premiumReward.seasonId = seasonId; });
    activeSeason = {
      ...def,
      tiers,
      startDate: now,
      endDate: now + def.durationDays * 86400000,
      status: 'active',
      boss: SEASON_BOSSES[def.theme] || null,
      vehicles: SEASONAL_VEHICLES[def.theme] || []
    };
    return activeSeason;
  }

  function earnSeasonXP(playerId, source, amount) {
    if (!activeSeason) return 0;
    const srcDef = XP_SOURCES[source];
    const xpGain = srcDef
      ? Math.floor(srcDef.base * srcDef.mult * (source === 'trick_score' ? amount : 1))
      : Math.floor(amount);

    if (!playerSeasonData[playerId]) {
      playerSeasonData[playerId] = {
        xp: 0, tier: 0, hasPremiumPass: false,
        completedMissions: [], claimedTiers: [], weeklyProgress: {}
      };
    }
    const pd = playerSeasonData[playerId];
    pd.xp += xpGain;
    const newTier = Math.min(Math.floor(pd.xp / XP_PER_TIER), TOTAL_TIERS);
    const tiersGained = newTier - pd.tier;
    pd.tier = newTier;

    // Update leaderboard
    updateLeaderboard(playerId, pd.xp);

    const rewards = [];
    if (tiersGained > 0) {
      for (let t = pd.tier - tiersGained + 1; t <= pd.tier; t++) {
        rewards.push(...collectTierRewards(playerId, t));
      }
    }
    return { xpGain, newXP: pd.xp, newTier, tiersGained, rewards };
  }

  function collectTierRewards(playerId, tier) {
    const pd = playerSeasonData[playerId];
    if (!pd || pd.claimedTiers.includes(tier)) return [];
    pd.claimedTiers.push(tier);
    const tierDef = activeSeason?.tiers[tier - 1];
    if (!tierDef) return [];
    const rewards = [];
    if (tierDef.freeReward) rewards.push({ ...tierDef.freeReward, tier, pass: 'free' });
    if (pd.hasPremiumPass && tierDef.premiumReward) rewards.push({ ...tierDef.premiumReward, tier, pass: 'premium' });
    return rewards;
  }

  function purchaseSeasonPass(playerId) {
    if (!activeSeason) return { success: false, error: 'No active season' };
    if (!playerSeasonData[playerId]) earnSeasonXP(playerId, 'race_finish', 0);
    playerSeasonData[playerId].hasPremiumPass = true;
    // Retroactively collect all premium rewards up to current tier
    const pd = playerSeasonData[playerId];
    const retroRewards = [];
    for (let t = 1; t <= pd.tier; t++) {
      const tierDef = activeSeason.tiers[t - 1];
      if (tierDef?.premiumReward && !pd.claimedTiers.includes(`prem_${t}`)) {
        pd.claimedTiers.push(`prem_${t}`);
        retroRewards.push({ ...tierDef.premiumReward, tier: t, pass: 'premium', retro: true });
      }
    }
    return { success: true, retroRewards };
  }

  function updateLeaderboard(playerId, xp) {
    const entry = seasonLeaderboard.find(e => e.playerId === playerId);
    if (entry) {
      entry.xp = xp;
    } else {
      seasonLeaderboard.push({ playerId, xp, rank: 0 });
    }
    seasonLeaderboard.sort((a, b) => b.xp - a.xp);
    seasonLeaderboard.forEach((e, i) => e.rank = i + 1);
  }

  function getMilestoneRewards(playerId) {
    const pd = playerSeasonData[playerId];
    if (!pd || !activeSeason) return [];
    const milestones = [25, 50, 75, 100];
    return milestones.map(m => ({
      milestone: m,
      tier: activeSeason.tiers[m - 1],
      claimed: pd.claimedTiers.includes(m),
      reached: pd.tier >= m
    }));
  }

  function resetSeason() {
    if (!activeSeason) return;
    archivedSeasons.push({
      ...activeSeason,
      archivedAt: Date.now(),
      leaderboard: [...seasonLeaderboard].slice(0, 100)
    });
    activeSeason = null;
    playerSeasonData = {};
    seasonLeaderboard = [];
  }

  function seededRandom(seed) {
    let s = typeof seed === 'string'
      ? seed.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0)
      : seed;
    return function() {
      s = (Math.imul(1664525, s) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
  }

  function getPlayerSeasonInfo(playerId) {
    if (!activeSeason) return null;
    const pd = playerSeasonData[playerId] || { xp: 0, tier: 0, hasPremiumPass: false };
    const nextTierXP = (pd.tier + 1) * XP_PER_TIER;
    const progress = (pd.xp - pd.tier * XP_PER_TIER) / XP_PER_TIER;
    return {
      season: { id: activeSeason.id, name: activeSeason.name, theme: activeSeason.theme,
                endDate: activeSeason.endDate, daysLeft: Math.ceil((activeSeason.endDate - Date.now()) / 86400000) },
      player: { xp: pd.xp, tier: pd.tier, progress, nextTierXP, hasPremiumPass: pd.hasPremiumPass },
      rank: seasonLeaderboard.find(e => e.playerId === playerId)?.rank || null
    };
  }

  return {
    CATALOG: SEASON_CATALOG,
    XP_SOURCES,
    STORY_MISSIONS,
    start: startSeason,
    earnXP: earnSeasonXP,
    purchasePass: purchaseSeasonPass,
    collectTierRewards,
    getMilestones: getMilestoneRewards,
    getPlayerInfo: getPlayerSeasonInfo,
    getLeaderboard: (limit = 100) => seasonLeaderboard.slice(0, limit),
    getActiveSeason: () => activeSeason,
    generateWeeklyChallenges: generateWeeklySeasonChallenges,
    resetSeason,
    getArchived: () => [...archivedSeasons]
  };
})();

// =============================================================================
// DAILY_CHALLENGE MODULE
// =============================================================================
const DAILY_CHALLENGE_EXT = (function() {
  'use strict';

  // Challenge type definitions
  const CHALLENGE_TYPES = {
    DISTANCE:  { id: 'distance',  name: 'Distance',   unit: 'km',    xpMultiplier: 1.0 },
    COINS:     { id: 'coins',     name: 'Coins',      unit: 'coins', xpMultiplier: 0.8 },
    TRICKS:    { id: 'tricks',    name: 'Tricks',     unit: 'tricks',xpMultiplier: 1.2 },
    TIME:      { id: 'time',      name: 'Time Trial', unit: 'sec',   xpMultiplier: 1.1 },
    VEHICLE:   { id: 'vehicle',   name: 'Vehicle',    unit: 'km',    xpMultiplier: 1.3 }
  };

  // Day of week categories (0=Sun, 1=Mon, ...)
  const DOW_CATEGORIES = ['air_time', 'tricks', 'speed', 'coins', 'distance', 'vehicle', 'free'];

  const DIFFICULTY_CONFIG = {
    easy:   { mult: 1.0, xp: 200,  coins: 100,  label: 'Easy' },
    medium: { mult: 2.0, xp: 500,  coins: 250,  label: 'Medium' },
    hard:   { mult: 4.0, xp: 1000, coins: 500,  label: 'Hard' }
  };

  // Streak bonus table
  const STREAK_BONUSES = [
    { days: 3,  bonusMult: 1.1, bonusCoins: 50 },
    { days: 7,  bonusMult: 1.25, bonusCoins: 200 },
    { days: 14, bonusMult: 1.5,  bonusCoins: 500 },
    { days: 30, bonusMult: 2.0,  bonusCoins: 2000 },
    { days: 60, bonusMult: 3.0,  bonusCoins: 5000 },
    { days: 100,bonusMult: 5.0,  bonusCoins: 10000 }
  ];

  // Player state
  let playerChallengeData = {}; // { streak, lastCompletedDate, completedChallenges, reminders }
  let challengeLeaderboard = {}; // { [challengeId]: [{playerId, score, completedAt}] }

  // --- SEED-BASED GENERATION ---
  function dateToSeed(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    return dateStr.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  }

  function seededRng(seed) {
    let s = seed;
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
  }

  function getDateString(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function generateDailyChallenge(dateStr) {
    dateStr = dateStr || getDateString();
    const seed = dateToSeed(dateStr);
    const rng = seededRng(seed);
    const dow = new Date(dateStr).getDay();
    const category = DOW_CATEGORIES[dow];

    const difficulties = ['easy', 'medium', 'hard'];
    const challenges = difficulties.map((diff, i) => {
      const cfg = DIFFICULTY_CONFIG[diff];
      const type = pickTypeByCategory(category, rng);
      const target = generateTarget(type, diff, rng);
      return {
        id: `dc_${dateStr}_${diff}`,
        date: dateStr,
        type,
        difficulty: diff,
        target,
        description: buildDescription(type, target, diff),
        xpReward: Math.floor(cfg.xp * (1 + rng() * 0.2)),
        coinReward: Math.floor(cfg.coins * (1 + rng() * 0.2)),
        isPremium: i === 2,
        category,
        leaderboardId: `lb_${dateStr}_${diff}`
      };
    });
    return challenges;
  }

  function generateWeeklyChallenge(weekStr) {
    const seed = dateToSeed(weekStr + '_weekly');
    const rng = seededRng(seed);
    const type = Object.values(CHALLENGE_TYPES)[Math.floor(rng() * 5)];
    const target = generateTarget(type.id, 'hard', rng) * 5;
    return {
      id: `wc_${weekStr}`,
      week: weekStr,
      type: type.id,
      difficulty: 'weekly',
      target,
      description: `Weekly: ${buildDescription(type.id, target, 'hard')}`,
      xpReward: 3000,
      coinReward: 1500,
      isPremium: false,
      category: 'weekly'
    };
  }

  function pickTypeByCategory(category, rng) {
    const map = {
      tricks:   'tricks',
      speed:    'time',
      coins:    'coins',
      distance: 'distance',
      vehicle:  'vehicle',
      air_time: 'tricks',
      free:     Object.values(CHALLENGE_TYPES)[Math.floor(rng() * 5)].id
    };
    return map[category] || 'distance';
  }

  function generateTarget(type, diff, rng) {
    const bases = {
      distance: { easy: 5,    medium: 15,   hard: 30 },
      coins:    { easy: 200,  medium: 600,  hard: 1500 },
      tricks:   { easy: 5,    medium: 15,   hard: 30 },
      time:     { easy: 120,  medium: 90,   hard: 60 },
      vehicle:  { easy: 3,    medium: 8,    hard: 15 }
    };
    const base = (bases[type] || bases.distance)[diff] || 5;
    return Math.round(base * (0.9 + rng() * 0.2));
  }

  function buildDescription(type, target, diff) {
    const templates = {
      distance: `Travel ${target} km`,
      coins:    `Collect ${target} coins`,
      tricks:   `Land ${target} tricks`,
      time:     `Finish in under ${target} seconds`,
      vehicle:  `Drive ${target} km with a specific vehicle`
    };
    return templates[type] || `Complete a ${diff} challenge`;
  }

  // --- COMPLETION ---
  function completeChallenge(playerId, challengeId, score, dateStr) {
    dateStr = dateStr || getDateString();
    const challenge = getChallengeById(challengeId, dateStr);
    if (!challenge) return { success: false, error: 'Challenge not found' };

    if (!playerChallengeData[playerId]) {
      playerChallengeData[playerId] = { streak: 0, lastCompletedDate: null, completedChallenges: [], reminders: false };
    }
    const pd = playerChallengeData[playerId];

    // Check already completed
    if (pd.completedChallenges.includes(challengeId)) {
      return { success: false, error: 'Already completed' };
    }

    pd.completedChallenges.push(challengeId);

    // Streak update
    const yesterday = getDateString(-1);
    if (pd.lastCompletedDate === yesterday) {
      pd.streak++;
    } else if (pd.lastCompletedDate !== dateStr) {
      pd.streak = 1;
    }
    pd.lastCompletedDate = dateStr;

    // Calculate streak bonus
    const streakBonus = getStreakBonus(pd.streak);

    // XP and coins
    const baseXP = challenge.xpReward;
    const baseCoins = challenge.coinReward;
    const totalXP = Math.floor(baseXP * streakBonus.mult);
    const totalCoins = baseCoins + streakBonus.coins;

    // Update leaderboard
    updateChallengeLeaderboard(challenge.leaderboardId, playerId, score);

    return {
      success: true,
      challenge,
      score,
      streak: pd.streak,
      streakBonus,
      xpEarned: totalXP,
      coinsEarned: totalCoins,
      rank: getChallengeRank(challenge.leaderboardId, playerId)
    };
  }

  function getChallengeById(challengeId, dateStr) {
    const dailies = generateDailyChallenge(dateStr);
    return dailies.find(c => c.id === challengeId) || null;
  }

  function getStreakBonus(streak) {
    let best = { mult: 1.0, coins: 0 };
    STREAK_BONUSES.forEach(b => { if (streak >= b.days) best = { mult: b.bonusMult, coins: b.bonusCoins }; });
    return best;
  }

  function updateChallengeLeaderboard(lbId, playerId, score) {
    if (!challengeLeaderboard[lbId]) challengeLeaderboard[lbId] = [];
    const lb = challengeLeaderboard[lbId];
    const existing = lb.find(e => e.playerId === playerId);
    if (existing) {
      if (score > existing.score) existing.score = score;
    } else {
      lb.push({ playerId, score, completedAt: Date.now() });
    }
    lb.sort((a, b) => b.score - a.score);
    lb.forEach((e, i) => e.rank = i + 1);
  }

  function getChallengeRank(lbId, playerId) {
    const lb = challengeLeaderboard[lbId] || [];
    return lb.find(e => e.playerId === playerId)?.rank || null;
  }

  // --- CHALLENGE PREDICTION ---
  function predictChallenges(playerId) {
    const pd = playerChallengeData[playerId];
    if (!pd) return ['distance', 'coins'];
    const completions = pd.completedChallenges;
    const typeCounts = {};
    completions.forEach(id => {
      const parts = id.split('_');
      const type = parts[3] || 'distance';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
  }

  function getShareData(result) {
    return {
      message: `I completed today's Daily Challenge with a score of ${result.score}! ${result.streak} day streak! 🔥`,
      shareUrl: `https://ahmet.game/daily?date=${result.challenge.date}&score=${result.score}`,
      rank: result.rank
    };
  }

  function setReminder(playerId, enabled) {
    if (!playerChallengeData[playerId]) playerChallengeData[playerId] = { streak: 0, lastCompletedDate: null, completedChallenges: [], reminders: false };
    playerChallengeData[playerId].reminders = enabled;
    return { success: true, reminders: enabled };
  }

  function getDailyStatus(playerId, dateStr) {
    dateStr = dateStr || getDateString();
    const pd = playerChallengeData[playerId] || { streak: 0, completedChallenges: [] };
    const dailies = generateDailyChallenge(dateStr);
    const weekly = generateWeeklyChallenge(getWeekString());
    return {
      date: dateStr,
      challenges: dailies.map(c => ({
        ...c,
        completed: pd.completedChallenges.includes(c.id)
      })),
      weekly: { ...weekly, completed: pd.completedChallenges.includes(weekly.id) },
      streak: pd.streak,
      streakBonus: getStreakBonus(pd.streak)
    };
  }

  function getWeekString() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day;
    const mon = new Date(d.setDate(diff));
    return `${mon.getFullYear()}-W${String(Math.ceil(mon.getDate() / 7)).padStart(2,'0')}`;
  }

  return {
    TYPES: CHALLENGE_TYPES,
    STREAK_BONUSES,
    generateDaily: generateDailyChallenge,
    generateWeekly: generateWeeklyChallenge,
    complete: completeChallenge,
    getDailyStatus,
    predictChallenges,
    getShareData,
    setReminder,
    getLeaderboard: (lbId, limit = 50) => (challengeLeaderboard[lbId] || []).slice(0, limit)
  };
})();

// =============================================================================
// SURVIVAL_MODE MODULE
// =============================================================================
const SURVIVAL_MODE_EXT = (function() {
  'use strict';

  // Distance milestone definitions (meters)
  const MILESTONES = [
    { distance: 500,   reward: { coins: 100, xp: 200 },  label: '500m Survivor' },
    { distance: 1000,  reward: { coins: 250, xp: 500 },  label: '1km Runner' },
    { distance: 2000,  reward: { coins: 600, xp: 1200 }, label: '2km Endurance' },
    { distance: 5000,  reward: { coins: 2000, xp: 3000 },label: '5km Legend' },
    { distance: 10000, reward: { coins: 5000, xp: 8000 },label: '10km Titan' }
  ];

  // Difficulty curve: at each distance threshold, apply multipliers
  const DIFFICULTY_CURVE = [
    { at: 0,    obstDensity: 0.5, speedMin: 20,  fuelDrain: 1.0, hazardActive: false },
    { at: 500,  obstDensity: 0.7, speedMin: 25,  fuelDrain: 1.2, hazardActive: false },
    { at: 1000, obstDensity: 1.0, speedMin: 30,  fuelDrain: 1.5, hazardActive: true  },
    { at: 2000, obstDensity: 1.4, speedMin: 35,  fuelDrain: 2.0, hazardActive: true  },
    { at: 3000, obstDensity: 1.8, speedMin: 40,  fuelDrain: 2.5, hazardActive: true  },
    { at: 5000, obstDensity: 2.5, speedMin: 50,  fuelDrain: 3.5, hazardActive: true  },
    { at: 7500, obstDensity: 3.5, speedMin: 60,  fuelDrain: 5.0, hazardActive: true  },
    { at: 10000,obstDensity: 5.0, speedMin: 80,  fuelDrain: 8.0, hazardActive: true  }
  ];

  // Environmental hazards
  const HAZARDS = [
    { id: 'rockfall',    name: 'Rock Fall',    activateAt: 1000, damage: 20, duration: 5000 },
    { id: 'fog',         name: 'Dense Fog',    activateAt: 2000, visReduce: 0.5, duration: 8000 },
    { id: 'windgust',    name: 'Wind Gust',    activateAt: 1500, forceMag: 200, duration: 3000 },
    { id: 'ice_patch',   name: 'Ice Patch',    activateAt: 2500, frictionMult: 0.2, duration: 4000 },
    { id: 'sandstorm',   name: 'Sandstorm',    activateAt: 3000, damage: 5, visReduce: 0.7, duration: 6000 },
    { id: 'earthquake',  name: 'Earthquake',   activateAt: 5000, terrainShift: 50, duration: 3000 }
  ];

  // Mode variants
  const MODES = {
    NORMAL:  { id: 'normal',  label: 'Normal',  hasFuel: true, hasHealth: true, hasNitro: true },
    HARD:    { id: 'hard',    label: 'Hard',    hasFuel: false, hasHealth: false, hasNitro: true },
    EXTREME: { id: 'extreme', label: 'Extreme', hasFuel: false, hasHealth: true, hasNitro: false }
  };

  // Power-up spawn rates by distance
  function getPowerUpRate(distance) {
    if (distance < 500)  return 1.0;
    if (distance < 1000) return 0.8;
    if (distance < 2000) return 0.6;
    if (distance < 5000) return 0.4;
    return 0.2;
  }

  // Session state
  let survivalSession = null;
  let personalBests = {};      // { [playerId+mode]: bestDistance }
  let dailyLeaderboard = [];
  let survivalStreaks = {};     // { [playerId]: { count, lastDate } }

  function startSurvival(playerId, mode = 'normal') {
    const modeDef = MODES[mode.toUpperCase()] || MODES.NORMAL;
    survivalSession = {
      playerId,
      mode: modeDef,
      distance: 0,
      startTime: Date.now(),
      score: 0,
      active: true,
      milestonesReached: [],
      activeHazards: [],
      lowSpeedTimer: 0,
      lastUpdate: Date.now()
    };
    return survivalSession;
  }

  function updateSurvival(dt, vehicleState) {
    if (!survivalSession || !survivalSession.active) return null;
    const session = survivalSession;
    const now = Date.now();
    dt = dt || (now - session.lastUpdate) / 1000;
    session.lastUpdate = now;

    // Advance distance
    const speed = Math.sqrt(vehicleState.vx * vehicleState.vx + vehicleState.vy * vehicleState.vy);
    session.distance += speed * dt;

    // Get current difficulty
    const diff = getDifficulty(session.distance);

    // Check minimum speed
    if (speed < diff.speedMin) {
      session.lowSpeedTimer += dt;
      if (session.lowSpeedTimer >= 3.0) {
        // Health drain
        vehicleState.health = (vehicleState.health || 100) - 10 * dt;
      }
    } else {
      session.lowSpeedTimer = 0;
    }

    // Fuel drain (mode-dependent)
    if (session.mode.hasFuel) {
      vehicleState.fuel = Math.max(0, (vehicleState.fuel || 100) - diff.fuelDrain * dt);
      if (vehicleState.fuel <= 0) {
        endSurvival('fuel_empty');
        return session;
      }
    }

    // Health check
    if (vehicleState.health !== undefined && vehicleState.health <= 0) {
      endSurvival('health_depleted');
      return session;
    }

    // Hazard activation
    if (diff.hazardActive) {
      tickHazards(session, dt, vehicleState);
    }

    // Score calculation
    session.score = calcScore(session.distance, diff);

    // Check milestones
    MILESTONES.forEach(m => {
      if (session.distance >= m.distance && !session.milestonesReached.includes(m.distance)) {
        session.milestonesReached.push(m.distance);
        // Reward notification is returned in events
      }
    });

    return session;
  }

  function getDifficulty(distance) {
    let current = DIFFICULTY_CURVE[0];
    for (const stage of DIFFICULTY_CURVE) {
      if (distance >= stage.at) current = stage;
      else break;
    }
    return current;
  }

  function tickHazards(session, dt, vehicleState) {
    // Random hazard spawning
    const eligibleHazards = HAZARDS.filter(h => session.distance >= h.activateAt);
    if (eligibleHazards.length && Math.random() < 0.002 * dt) {
      const h = eligibleHazards[Math.floor(Math.random() * eligibleHazards.length)];
      const active = session.activeHazards.find(ah => ah.id === h.id);
      if (!active) {
        session.activeHazards.push({ ...h, startTime: Date.now(), remaining: h.duration });
      }
    }

    // Process active hazards
    session.activeHazards = session.activeHazards.filter(h => {
      h.remaining -= dt * 1000;
      if (h.damage) vehicleState.health = Math.max(0, (vehicleState.health || 100) - h.damage * dt);
      return h.remaining > 0;
    });
  }

  function calcScore(distance, diff) {
    return Math.floor(distance * (1 + (diff.obstDensity - 0.5) * 0.5));
  }

  function endSurvival(reason) {
    if (!survivalSession) return null;
    const session = survivalSession;
    session.active = false;
    session.endReason = reason;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    const pbKey = `${session.playerId}_${session.mode.id}`;
    const isNewPB = !personalBests[pbKey] || session.distance > personalBests[pbKey];
    if (isNewPB) personalBests[pbKey] = session.distance;

    // Update streak
    updateStreak(session.playerId);

    // Update daily leaderboard
    updateDailyLeaderboard(session.playerId, session.score, session.distance);

    const milestoneRewards = session.milestonesReached.map(d => MILESTONES.find(m => m.distance === d));

    return {
      session,
      isNewPB,
      personalBest: personalBests[pbKey],
      milestoneRewards,
      streak: survivalStreaks[session.playerId]?.count || 0
    };
  }

  function updateStreak(playerId) {
    const today = new Date().toDateString();
    const s = survivalStreaks[playerId] || { count: 0, lastDate: null };
    if (s.lastDate === today) return;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    s.count = s.lastDate === yesterday ? s.count + 1 : 1;
    s.lastDate = today;
    survivalStreaks[playerId] = s;
  }

  function updateDailyLeaderboard(playerId, score, distance) {
    const today = new Date().toDateString();
    const existing = dailyLeaderboard.find(e => e.playerId === playerId && e.date === today);
    if (existing) {
      if (score > existing.score) { existing.score = score; existing.distance = distance; }
    } else {
      dailyLeaderboard.push({ playerId, score, distance, date: today });
    }
    dailyLeaderboard.sort((a, b) => b.score - a.score);
    dailyLeaderboard.forEach((e, i) => e.rank = i + 1);
  }

  function generateWeeklySeed() {
    const d = new Date();
    return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
  }

  function getPersonalBest(playerId, mode) {
    return personalBests[`${playerId}_${mode || 'normal'}`] || 0;
  }

  return {
    MODES,
    MILESTONES,
    HAZARDS,
    DIFFICULTY_CURVE,
    start: startSurvival,
    update: updateSurvival,
    end: endSurvival,
    getPersonalBest,
    getDailyLeaderboard: (limit = 100) => dailyLeaderboard.slice(0, limit),
    getStreak: (playerId) => survivalStreaks[playerId] || { count: 0, lastDate: null },
    getSession: () => survivalSession,
    getPowerUpRate,
    getDifficulty
  };
})();

// =============================================================================
// GHOST_RACE_MODE MODULE
// =============================================================================
const GHOST_RACE_MODE_EXT = (function() {
  'use strict';

  const FRAME_RATE = 20; // fps
  const FRAME_INTERVAL = 1000 / FRAME_RATE; // 50ms
  const MAX_GHOSTS_PER_TRACK = 5;
  const GHOST_VERSION = 1;

  // Ghost data store: { [mapId_vehicleId]: GhostSlot[] }
  let ghostStore = {};
  let recordingState = null;  // Active recording
  let playbackState = null;   // Active playback

  // --- RECORDING ---
  function startRecording(mapId, vehicleId, playerId) {
    recordingState = {
      mapId, vehicleId, playerId,
      startTime: Date.now(),
      lastFrameTime: Date.now(),
      frames: [],
      active: true
    };
    return recordingState;
  }

  function recordFrame(vehicleState) {
    if (!recordingState || !recordingState.active) return false;
    const now = Date.now();
    if (now - recordingState.lastFrameTime < FRAME_INTERVAL) return false;
    recordingState.lastFrameTime = now;
    // Compact frame: [x, y, angle, vx, vy, fuel, health, timestamp_offset]
    const offset = now - recordingState.startTime;
    recordingState.frames.push([
      Math.round(vehicleState.x * 10) / 10,
      Math.round(vehicleState.y * 10) / 10,
      Math.round(vehicleState.angle * 1000) / 1000,
      Math.round((vehicleState.vx || 0) * 100) / 100,
      Math.round((vehicleState.vy || 0) * 100) / 100,
      Math.round(vehicleState.fuel || 100),
      Math.round(vehicleState.health || 100),
      offset
    ]);
    return true;
  }

  function stopRecording(finalScore, finalDistance) {
    if (!recordingState || !recordingState.active) return null;
    recordingState.active = false;
    const duration = Date.now() - recordingState.startTime;
    const ghost = {
      id: `ghost_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      version: GHOST_VERSION,
      mapId: recordingState.mapId,
      vehicleId: recordingState.vehicleId,
      playerId: recordingState.playerId,
      recordedAt: recordingState.startTime,
      duration,
      frameCount: recordingState.frames.length,
      frameRate: FRAME_RATE,
      score: finalScore,
      distance: finalDistance,
      frames: recordingState.frames,
      checksum: computeChecksum(recordingState.frames)
    };
    saveGhost(ghost);
    recordingState = null;
    return ghost;
  }

  // --- STORAGE ---
  function saveGhost(ghost) {
    const key = `${ghost.mapId}_${ghost.vehicleId}`;
    if (!ghostStore[key]) ghostStore[key] = [];
    ghostStore[key].push(ghost);
    // Sort by score descending, keep best N
    ghostStore[key].sort((a, b) => b.score - a.score);
    if (ghostStore[key].length > MAX_GHOSTS_PER_TRACK) {
      ghostStore[key] = ghostStore[key].slice(0, MAX_GHOSTS_PER_TRACK);
    }
  }

  function getPersonalBestGhost(playerId, mapId, vehicleId) {
    const key = `${mapId}_${vehicleId}`;
    const ghosts = ghostStore[key] || [];
    return ghosts.find(g => g.playerId === playerId) || null;
  }

  function getWorldRecordGhost(mapId, vehicleId) {
    const key = `${mapId}_${vehicleId}`;
    const ghosts = ghostStore[key] || [];
    return ghosts.length ? ghosts[0] : null;
  }

  // --- PLAYBACK ---
  function startPlayback(ghost) {
    if (!ghost || !ghost.frames || !ghost.frames.length) return null;
    playbackState = {
      ghost,
      currentFrameIndex: 0,
      startTime: Date.now(),
      active: true,
      elapsed: 0
    };
    return playbackState;
  }

  function getGhostPosition(elapsedMs) {
    if (!playbackState || !playbackState.active) return null;
    const frames = playbackState.ghost.frames;
    if (!frames.length) return null;

    // Find surrounding frames by timestamp offset (index 7)
    let lo = 0, hi = frames.length - 1;
    // Binary search for frame
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (frames[mid][7] <= elapsedMs) lo = mid;
      else hi = mid;
    }

    const f0 = frames[lo];
    const f1 = frames[Math.min(hi, frames.length - 1)];
    const t0 = f0[7], t1 = f1[7];
    const t = t1 > t0 ? (elapsedMs - t0) / (t1 - t0) : 0;
    const lerp = (a, b) => a + (b - a) * Math.max(0, Math.min(1, t));

    return {
      x: lerp(f0[0], f1[0]),
      y: lerp(f0[1], f1[1]),
      angle: lerpAngle(f0[2], f1[2], t),
      vx: lerp(f0[3], f1[3]),
      vy: lerp(f0[4], f1[4]),
      fuel: lerp(f0[5], f1[5]),
      health: lerp(f0[6], f1[6]),
      frameIndex: lo,
      totalFrames: frames.length
    };
  }

  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  function stopPlayback() {
    if (playbackState) playbackState.active = false;
    const ps = playbackState;
    playbackState = null;
    return ps;
  }

  // --- DEVIATION TRACKING ---
  function computeDeviation(playerPos, ghostElapsedMs) {
    const ghostPos = getGhostPosition(ghostElapsedMs);
    if (!ghostPos) return null;
    const dx = playerPos.x - ghostPos.x;
    const dy = playerPos.y - ghostPos.y;
    const spatialDiff = Math.sqrt(dx * dx + dy * dy);
    // Rough time deviation: assume ~100px per second average speed
    const timeDeviation = spatialDiff / 100;
    return {
      spatialDiff,
      timeDeviation,
      sign: playerPos.x > ghostPos.x ? 1 : -1, // positive = ahead
      displayStr: `${playerPos.x > ghostPos.x ? '+' : '-'}${timeDeviation.toFixed(2)}s`
    };
  }

  // --- IMPORT/EXPORT ---
  function exportGhost(ghost) {
    const data = JSON.stringify({
      id: ghost.id,
      version: ghost.version,
      mapId: ghost.mapId,
      vehicleId: ghost.vehicleId,
      playerId: ghost.playerId,
      recordedAt: ghost.recordedAt,
      duration: ghost.duration,
      score: ghost.score,
      distance: ghost.distance,
      frameCount: ghost.frameCount,
      frameRate: ghost.frameRate,
      frames: ghost.frames,
      checksum: ghost.checksum
    });
    // Base64 encode
    return btoa(unescape(encodeURIComponent(data)));
  }

  function importGhost(encoded) {
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      if (!validateGhostData(data)) return { success: false, error: 'Invalid ghost data' };
      if (!verifyChecksum(data)) return { success: false, error: 'Checksum mismatch (possible cheat)' };
      saveGhost(data);
      return { success: true, ghost: data };
    } catch (e) {
      return { success: false, error: 'Parse error: ' + e.message };
    }
  }

  function validateGhostData(data) {
    if (!data || data.version !== GHOST_VERSION) return false;
    if (!data.mapId || !data.vehicleId || !data.playerId) return false;
    if (!Array.isArray(data.frames) || data.frames.length === 0) return false;
    if (typeof data.score !== 'number' || data.score < 0) return false;
    // Timestamp plausibility
    const age = Date.now() - data.recordedAt;
    if (age < 0 || age > 365 * 86400000) return false; // Not from the future or more than 1yr old
    return true;
  }

  function computeChecksum(frames) {
    // Simple but fast checksum over frame data
    let h = 0x811c9dc5;
    for (const frame of frames) {
      for (const val of frame) {
        const bits = Math.round(val * 1000) | 0;
        h ^= bits;
        h = (Math.imul(h, 0x01000193)) >>> 0;
      }
    }
    return h.toString(16);
  }

  function verifyChecksum(ghost) {
    return computeChecksum(ghost.frames) === ghost.checksum;
  }

  // --- RACE RESULT ---
  function compareToGhost(playerScore, playerDistance, ghost) {
    if (!ghost) return { hasGhost: false };
    const beatGhost = playerScore > ghost.score;
    const margin = playerScore - ghost.score;
    return {
      hasGhost: true,
      beatGhost,
      playerScore,
      ghostScore: ghost.score,
      margin,
      marginStr: `${margin >= 0 ? '+' : ''}${margin.toFixed(0)}`,
      ghostPlayerId: ghost.playerId,
      ghostRecordedAt: ghost.recordedAt
    };
  }

  function getAllGhostsForTrack(mapId, vehicleId) {
    const key = `${mapId}_${vehicleId}`;
    return ghostStore[key] || [];
  }

  return {
    FRAME_RATE,
    FRAME_INTERVAL,
    MAX_GHOSTS_PER_TRACK,
    startRecording,
    recordFrame,
    stopRecording,
    startPlayback,
    getGhostPosition,
    stopPlayback,
    computeDeviation,
    exportGhost,
    importGhost,
    getPersonalBestGhost,
    getWorldRecordGhost,
    getAllGhosts: getAllGhostsForTrack,
    compareToGhost,
    isRecording: () => !!(recordingState && recordingState.active),
    isPlaying: () => !!(playbackState && playbackState.active),
    getRecordingState: () => recordingState,
    getPlaybackState: () => playbackState
  };
})();

// ============================================================
// GAME_REPLAY_SYSTEM — Full replay recording & playback (~30KB)
// ============================================================
const GAME_REPLAY_SYSTEM = (function() {
  'use strict';

  const RECORD_INTERVAL = 2; // record every 2 physics ticks (30fps at 60Hz)
  const MAX_FRAMES = 54000;  // 30 min at 30fps

  // ── Internal state ──────────────────────────────────────────
  let _recording   = false;
  let _playing     = false;
  let _frames      = [];
  let _tick        = 0;
  let _playTick    = 0;
  let _playSpeed   = 1;
  let _cameraMode  = 'follow'; // 'follow' | 'free' | 'cinematic'
  let _highlights  = [];
  let _metadata    = {};
  let _eventLog    = [];

  // Playback speed steps
  const SPEED_STEPS = [0.25, 0.5, 1, 2, 4];

  // ── Frame structure ─────────────────────────────────────────
  function makeFrame(tick, vehicleState, inputState, events) {
    return {
      t: tick,
      vs: {
        x:   Math.round(vehicleState.x   * 100) / 100,
        y:   Math.round(vehicleState.y   * 100) / 100,
        vx:  Math.round(vehicleState.vx  * 1000) / 1000,
        vy:  Math.round(vehicleState.vy  * 1000) / 1000,
        ang: Math.round(vehicleState.angle * 10000) / 10000,
        av:  Math.round(vehicleState.angularVelocity * 10000) / 10000,
        hp:  vehicleState.health || 100,
        fuel: vehicleState.fuel || 100,
        spd: Math.round(vehicleState.speed * 100) / 100
      },
      is: {
        gas:   inputState.gas   ? 1 : 0,
        brake: inputState.brake ? 1 : 0,
        flip:  inputState.flip  ? 1 : 0,
        nitro: inputState.nitro ? 1 : 0
      },
      ev: events || []
    };
  }

  // ── Run-length encode repeated input states ─────────────────
  function compressFrames(frames) {
    if (!frames.length) return [];
    const out = [];
    let run = 1;
    let prev = frames[0];
    for (let i = 1; i < frames.length; i++) {
      const cur = frames[i];
      const sameInput = (
        cur.is.gas   === prev.is.gas   &&
        cur.is.brake === prev.is.brake &&
        cur.is.flip  === prev.is.flip  &&
        cur.is.nitro === prev.is.nitro &&
        !cur.ev.length
      );
      if (sameInput && run < 255) {
        run++;
      } else {
        out.push(run > 1 ? { ...prev, r: run } : { ...prev });
        prev = cur;
        run = 1;
      }
    }
    out.push(run > 1 ? { ...prev, r: run } : { ...prev });
    return out;
  }

  function decompressFrames(compressed) {
    const out = [];
    for (const f of compressed) {
      const count = f.r || 1;
      for (let i = 0; i < count; i++) {
        out.push({ t: f.t + i, vs: { ...f.vs }, is: { ...f.is }, ev: i === 0 ? f.ev : [] });
      }
    }
    return out;
  }

  // ── Highlight detection ─────────────────────────────────────
  function detectHighlights(frames) {
    const hl = [];
    let maxSpeedFrame  = null;
    let maxSpeedVal    = 0;
    let maxAirTime     = 0;
    let airStart       = -1;
    let bigFlipStart   = -1;
    let totalRotation  = 0;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      // Top speed
      if (f.vs.spd > maxSpeedVal) {
        maxSpeedVal  = f.vs.spd;
        maxSpeedFrame = i;
      }
      // Air time (vy near 0 for extended period)
      if (Math.abs(f.vs.vy) < 0.5) {
        if (airStart < 0) airStart = i;
        const dur = i - airStart;
        if (dur > maxAirTime) maxAirTime = dur;
      } else {
        if (airStart >= 0 && (i - airStart) > 30) {
          hl.push({ type: 'air_time', tick: airStart, duration: i - airStart,
                    label: `Air time: ${((i - airStart) / 30).toFixed(1)}s` });
        }
        airStart = -1;
      }
      // Flip detection via angular velocity
      totalRotation += Math.abs(f.vs.av);
      if (Math.abs(f.vs.av) > 0.15) {
        if (bigFlipStart < 0) bigFlipStart = i;
      } else {
        if (bigFlipStart >= 0 && (i - bigFlipStart) > 20) {
          hl.push({ type: 'flip', tick: bigFlipStart, duration: i - bigFlipStart,
                    label: 'Big flip!' });
        }
        bigFlipStart = -1;
      }
      // Near death (hp < 10)
      if (f.vs.hp < 10 && f.vs.hp > 0) {
        hl.push({ type: 'close_call', tick: i, label: 'Close call!' });
      }
    }
    if (maxSpeedFrame !== null) {
      hl.push({ type: 'top_speed', tick: maxSpeedFrame, value: maxSpeedVal,
                label: `Top speed: ${maxSpeedVal.toFixed(1)} m/s` });
    }
    // Deduplicate by proximity
    hl.sort((a, b) => a.tick - b.tick);
    const deduped = [];
    for (const h of hl) {
      if (!deduped.length || h.tick - deduped[deduped.length - 1].tick > 60) {
        deduped.push(h);
      }
    }
    return deduped;
  }

  // ── Auto commentary ─────────────────────────────────────────
  const COMMENTARY_TEMPLATES = {
    top_speed:  v => `Incredible! Hitting ${v.toFixed(1)} metres per second!`,
    air_time:   h => `Massive air — ${((h.duration || 30) / 30).toFixed(1)} seconds airborne!`,
    flip:       ()  => 'Beautiful flip! The crowd goes wild!',
    close_call: ()  => 'That was dangerously close to a crash!',
    trick:      h   => `Trick performed: ${h.trickName || 'Unknown trick'}!`
  };

  function generateCommentary(highlight) {
    const tpl = COMMENTARY_TEMPLATES[highlight.type];
    return tpl ? tpl(highlight.value !== undefined ? highlight.value : highlight) : highlight.label || '';
  }

  // ── Camera modes ────────────────────────────────────────────
  const CAMERA_MODES = {
    follow: {
      name: 'Follow Vehicle',
      update(vehicleX, vehicleY, viewW, viewH) {
        return { x: vehicleX - viewW / 2, y: vehicleY - viewH / 2 };
      }
    },
    free: {
      name: 'Free Camera',
      _x: 0, _y: 0, _vx: 0, _vy: 0,
      update(vehicleX, vehicleY, viewW, viewH, input) {
        if (input) {
          this._vx += (input.dx || 0) * 5;
          this._vy += (input.dy || 0) * 5;
        }
        this._vx *= 0.9;
        this._vy *= 0.9;
        this._x  += this._vx;
        this._y  += this._vy;
        return { x: this._x, y: this._y };
      }
    },
    cinematic: {
      name: 'Cinematic',
      _angle: 0,
      update(vehicleX, vehicleY, viewW, viewH, _, tick) {
        this._angle = (tick || 0) * 0.002;
        const radius = 150;
        return {
          x: vehicleX + Math.cos(this._angle) * radius - viewW / 2,
          y: vehicleY + Math.sin(this._angle) * radius * 0.4 - viewH / 2
        };
      }
    }
  };

  // ── Export / Import ─────────────────────────────────────────
  function exportReplay(metadata, frames) {
    const compressed = compressFrames(frames);
    const payload = {
      v: 1,
      meta: {
        date:     metadata.date     || Date.now(),
        vehicle:  metadata.vehicle  || 'unknown',
        map:      metadata.map      || 'unknown',
        distance: metadata.distance || 0,
        topSpeed: metadata.topSpeed || 0,
        tricks:   metadata.tricks   || 0,
        duration: frames.length
      },
      hl:     detectHighlights(frames),
      frames: compressed
    };
    return JSON.stringify(payload);
  }

  function importReplay(jsonString) {
    try {
      const payload = JSON.parse(jsonString);
      if (!payload || payload.v !== 1) throw new Error('Invalid replay version');
      return {
        metadata:   payload.meta,
        highlights: payload.hl || [],
        frames:     decompressFrames(payload.frames || [])
      };
    } catch (e) {
      console.error('[GAME_REPLAY_SYSTEM] Import failed:', e.message);
      return null;
    }
  }

  function replayToShareCode(jsonString) {
    // Simple base64-like encoding (btoa not available in all environments)
    const bytes = [];
    for (let i = 0; i < jsonString.length; i++) bytes.push(jsonString.charCodeAt(i));
    // XOR with key for light obfuscation
    const key = 0x5A;
    const encoded = bytes.map(b => (b ^ key).toString(16).padStart(2, '0')).join('');
    return 'AHMETRPL_' + encoded;
  }

  function shareCodeToReplay(code) {
    if (!code.startsWith('AHMETRPL_')) return null;
    const hex = code.slice(8);
    const key = 0x5A;
    let json = '';
    for (let i = 0; i < hex.length; i += 2) {
      json += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    }
    return importReplay(json);
  }

  // ── Thumbnail frame selection ───────────────────────────────
  function getThumbnailFrameIndex(frames) {
    // Pick frame with highest speed
    let best = 0;
    let bestSpd = -1;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].vs.spd > bestSpd) { bestSpd = frames[i].vs.spd; best = i; }
    }
    return best;
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    // Recording
    startRecording(vehicleDef, mapId) {
      _recording = true;
      _playing   = false;
      _frames    = [];
      _tick      = 0;
      _eventLog  = [];
      _metadata  = {
        date:     Date.now(),
        vehicle:  vehicleDef || 'unknown',
        map:      mapId      || 'unknown',
        distance: 0,
        topSpeed: 0,
        tricks:   0
      };
    },

    recordTick(vehicleState, inputState, events) {
      if (!_recording) return;
      _tick++;
      if (_tick % RECORD_INTERVAL !== 0) return;
      if (_frames.length >= MAX_FRAMES) {
        _frames.shift(); // drop oldest
      }
      const f = makeFrame(_tick, vehicleState, inputState, events || []);
      _frames.push(f);
      // Update metadata live
      if (f.vs.spd > _metadata.topSpeed) _metadata.topSpeed = f.vs.spd;
      _metadata.distance = vehicleState.x || 0;
      if (events) {
        for (const ev of events) {
          if (ev.type === 'trick') _metadata.tricks++;
        }
      }
    },

    stopRecording() {
      _recording = false;
      _highlights = detectHighlights(_frames);
      return {
        metadata:   { ..._metadata },
        highlights: _highlights,
        frameCount: _frames.length
      };
    },

    // Playback
    startPlayback(replayData, speed) {
      if (!replayData || !replayData.frames) return false;
      _frames    = replayData.frames;
      _highlights = replayData.highlights || [];
      _metadata  = replayData.metadata  || {};
      _playing   = true;
      _recording = false;
      _playTick  = 0;
      _playSpeed = speed || 1;
      return true;
    },

    stepPlayback() {
      if (!_playing) return null;
      const steps = Math.max(1, Math.round(_playSpeed));
      _playTick = Math.min(_playTick + steps, _frames.length - 1);
      const done = _playTick >= _frames.length - 1;
      return { frame: _frames[_playTick], done, progress: _playTick / Math.max(1, _frames.length - 1) };
    },

    scrubTo(tick) {
      _playTick = Math.max(0, Math.min(tick, _frames.length - 1));
      return _frames[_playTick] || null;
    },

    setPlaybackSpeed(speed) {
      const s = parseFloat(speed);
      if (SPEED_STEPS.includes(s)) { _playSpeed = s; return true; }
      return false;
    },

    cycleSpeed() {
      const idx = SPEED_STEPS.indexOf(_playSpeed);
      _playSpeed = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
      return _playSpeed;
    },

    stopPlayback() { _playing = false; },

    // Camera
    setCameraMode(mode) {
      if (CAMERA_MODES[mode]) { _cameraMode = mode; return true; }
      return false;
    },

    getCameraPosition(vehicleX, vehicleY, viewW, viewH, input) {
      const m = CAMERA_MODES[_cameraMode] || CAMERA_MODES.follow;
      return m.update(vehicleX, vehicleY, viewW, viewH, input, _playTick);
    },

    // Highlights
    getHighlights()           { return [..._highlights]; },
    getHighlightCommentary(h) { return generateCommentary(h); },
    jumpToHighlight(idx)      {
      const h = _highlights[idx];
      if (!h) return null;
      return this.scrubTo(h.tick);
    },

    // Export/Import
    exportCurrent()      { return exportReplay(_metadata, _frames); },
    importReplay,
    replayToShareCode,
    shareCodeToReplay,

    // Thumbnail
    getThumbnailFrame() {
      const idx = getThumbnailFrameIndex(_frames);
      return { index: idx, frame: _frames[idx] || null };
    },

    // Status
    isRecording()  { return _recording; },
    isPlaying()    { return _playing;   },
    getMetadata()  { return { ..._metadata }; },
    getFrameCount(){ return _frames.length; },
    getCurrentTick(){ return _playing ? _playTick : _tick; },

    SPEED_STEPS,
    CAMERA_MODES: Object.keys(CAMERA_MODES)
  };
})();

// ============================================================
// GAME_SCORING_SYSTEM — Comprehensive scoring (~30KB)
// ============================================================
const GAME_SCORING_SYSTEM = (function() {
  'use strict';

  // ── Constants ───────────────────────────────────────────────
  const DISTANCE_SCORE_PER_METER = 100;
  const TIME_BONUS_PER_SECOND    = 50;
  const FUEL_BONUS_PER_UNIT      = 200;
  const COIN_BONUS               = 50;

  const TRICK_BASE_SCORES = {
    backflip:      500,
    frontflip:     500,
    double_flip:   1200,
    triple_flip:   2500,
    superman:      800,
    wheelie:       300,
    nose_wheelie:  300,
    flat_spin:     600,
    combo:         1000
  };

  const STAR_THRESHOLDS = {
    '1': 0.33,   // 33% of max score
    '2': 0.66,
    '3': 1.0
  };

  const MULTIPLIER_ZONES = [
    { startX: 500,  endX: 700,  value: 2 },
    { startX: 1500, endX: 1700, value: 3 },
    { startX: 3000, endX: 3300, value: 5 }
  ];

  // ── Per-map max scores (determines star thresholds) ─────────
  const MAP_MAX_SCORES = {
    default: 100000,
    forest:  120000,
    desert:  150000,
    arctic:  180000,
    volcano: 200000,
    city:    130000
  };

  // ── High score storage ──────────────────────────────────────
  const _highScores = {}; // key: `${mapId}_${vehicleId}`

  // ── Weekly challenge ────────────────────────────────────────
  let _weeklyChallenge = {
    weekId:      0,
    mapId:       'forest',
    vehicleId:   'jeep',
    targetScore: 75000,
    bonusReward: 'premium_currency_100'
  };

  // ── Combo system ────────────────────────────────────────────
  function buildComboMultiplier(comboCount) {
    if (comboCount <= 1) return 1;
    if (comboCount <= 3) return 1.5;
    if (comboCount <= 6) return 2;
    if (comboCount <= 10) return 3;
    return 5;
  }

  // ── Score integrity ─────────────────────────────────────────
  function hashScore(scoreData) {
    // Simple polynomial rolling hash — not cryptographic but detects naive tampering
    const str = JSON.stringify({
      distance: Math.round(scoreData.distance),
      tricks:   scoreData.tricks,
      time:     Math.round(scoreData.time),
      coins:    scoreData.coins
    });
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  // ── Percentile (stub — would query server) ──────────────────
  function estimatePercentile(score, mapId) {
    const avg = (MAP_MAX_SCORES[mapId] || MAP_MAX_SCORES.default) * 0.35;
    const sd  = avg * 0.3;
    const z   = (score - avg) / sd;
    // Approximate normal CDF
    const t   = 1 / (1 + 0.2316419 * Math.abs(z));
    const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    const cdf  = 1 - 0.3989422804 * Math.exp(-0.5 * z * z) * poly;
    return Math.round((z >= 0 ? cdf : 1 - cdf) * 100);
  }

  // ── Star rating ─────────────────────────────────────────────
  function calculateStars(totalScore, mapId) {
    const maxScore = MAP_MAX_SCORES[mapId] || MAP_MAX_SCORES.default;
    const ratio    = totalScore / maxScore;
    if (ratio >= STAR_THRESHOLDS['3']) return 3;
    if (ratio >= STAR_THRESHOLDS['2']) return 2;
    if (ratio >= STAR_THRESHOLDS['1']) return 1;
    return 0;
  }

  // ── Active multiplier zone check ────────────────────────────
  function getZoneMultiplier(playerX) {
    for (const z of MULTIPLIER_ZONES) {
      if (playerX >= z.startX && playerX <= z.endX) return z.value;
    }
    return 1;
  }

  // ── Score breakdown ─────────────────────────────────────────
  function buildBreakdown(params) {
    const {
      distance    = 0,
      tricks      = [],
      timeElapsed = 0,
      targetTime  = 0,
      fuelLeft    = 0,
      coinsCollected = 0,
      zoneMultiplierActive = 1,
      mapId       = 'default',
      vehicleId   = 'default'
    } = params;

    const distanceScore = Math.round(distance * DISTANCE_SCORE_PER_METER);

    let trickScore = 0;
    let combo      = 0;
    const trickLog = [];
    for (const trick of tricks) {
      combo++;
      const base  = TRICK_BASE_SCORES[trick.type] || 200;
      const diff  = trick.difficulty || 1;
      const mult  = buildComboMultiplier(combo);
      const score = Math.round(base * diff * mult);
      trickScore += score;
      trickLog.push({ type: trick.type, base, difficulty: diff, comboMult: mult, score });
    }

    const timeBonus = targetTime > 0
      ? Math.max(0, Math.round((targetTime - timeElapsed) * TIME_BONUS_PER_SECOND))
      : 0;

    const fuelBonus = Math.round(fuelLeft * FUEL_BONUS_PER_UNIT);
    const coinBonus = Math.round(coinsCollected * COIN_BONUS);
    const subtotal  = distanceScore + trickScore + timeBonus + fuelBonus + coinBonus;
    const total     = Math.round(subtotal * zoneMultiplierActive);
    const stars     = calculateStars(total, mapId);
    const hash      = hashScore({ distance, tricks: trickScore, time: timeElapsed, coins: coinsCollected });
    const percentile= estimatePercentile(total, mapId);

    return {
      distanceScore,
      trickScore,
      trickLog,
      timeBonus,
      fuelBonus,
      coinBonus,
      subtotal,
      zoneMultiplier: zoneMultiplierActive,
      total,
      stars,
      percentile,
      hash,
      distance,
      timeElapsed,
      coinsCollected,
      mapId,
      vehicleId
    };
  }

  // ── High score management ────────────────────────────────────
  function getHighScoreKey(mapId, vehicleId) { return `${mapId}_${vehicleId}`; }

  function submitScore(breakdown) {
    const key      = getHighScoreKey(breakdown.mapId, breakdown.vehicleId);
    const existing = _highScores[key];
    const isNew    = !existing || breakdown.total > existing.total;
    if (isNew) {
      _highScores[key] = {
        total:     breakdown.total,
        stars:     breakdown.stars,
        hash:      breakdown.hash,
        timestamp: Date.now()
      };
    }
    return { isNewHighScore: isNew, previous: existing || null, current: _highScores[key] };
  }

  function getHighScore(mapId, vehicleId) {
    return _highScores[getHighScoreKey(mapId, vehicleId)] || null;
  }

  function getAllHighScores() { return { ..._highScores }; }

  // ── Weekly challenge ─────────────────────────────────────────
  function setWeeklyChallenge(cfg) { _weeklyChallenge = { ..._weeklyChallenge, ...cfg }; }
  function checkWeeklyChallenge(breakdown) {
    if (breakdown.mapId !== _weeklyChallenge.mapId) return { eligible: false };
    const passed = breakdown.total >= _weeklyChallenge.targetScore;
    return {
      eligible:   true,
      passed,
      target:     _weeklyChallenge.targetScore,
      achieved:   breakdown.total,
      reward:     passed ? _weeklyChallenge.bonusReward : null,
      weekId:     _weeklyChallenge.weekId
    };
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    calculateScore(params)        { return buildBreakdown(params); },
    submitScore,
    getHighScore,
    getAllHighScores,
    getZoneMultiplier,
    calculateStars,
    estimatePercentile,
    setWeeklyChallenge,
    getWeeklyChallenge()          { return { ..._weeklyChallenge }; },
    checkWeeklyChallenge,
    getTrickBaseScore(type)       { return TRICK_BASE_SCORES[type] || 200; },
    getComboMultiplier:           buildComboMultiplier,
    verifyScoreHash(breakdown)    { return hashScore({ distance: breakdown.distance, tricks: breakdown.trickScore, time: breakdown.timeElapsed, coins: breakdown.coinsCollected }) === breakdown.hash; },
    MULTIPLIER_ZONES,
    TRICK_BASE_SCORES,
    DISTANCE_SCORE_PER_METER,
    FUEL_BONUS_PER_UNIT,
    COIN_BONUS
  };
})();

// ============================================================
// GAME_PHYSICS_INTEGRATION — Game-logic ↔ physics bridge (~30KB)
// ============================================================
const GAME_PHYSICS_INTEGRATION = (function() {
  'use strict';

  // ── Event bus ───────────────────────────────────────────────
  const _listeners = {};

  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(fn);
  }
  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(f => f !== fn);
  }
  function emit(event, data) {
    if (!_listeners[event]) return;
    for (const fn of _listeners[event]) { try { fn(data); } catch (e) { console.error(e); } }
  }

  // ── Trigger zones ────────────────────────────────────────────
  const _triggerZones = [];

  function addTriggerZone(cfg) {
    // cfg: { id, x, y, w, h, type, oneShot, data }
    _triggerZones.push({ ...cfg, fired: false });
  }

  function checkTriggers(vehicleX, vehicleY) {
    const fired = [];
    for (const z of _triggerZones) {
      if (z.oneShot && z.fired) continue;
      if (vehicleX >= z.x && vehicleX <= z.x + z.w &&
          vehicleY >= z.y && vehicleY <= z.y + z.h) {
        z.fired = true;
        fired.push(z);
        emit('trigger_zone', z);
      }
    }
    return fired;
  }

  function clearTriggerZones() { _triggerZones.length = 0; }

  // ── Collision event classification ──────────────────────────
  const SURFACE_TYPES = {
    asphalt:  { friction: 0.95, restitution: 0.2,  damageMultiplier: 0.5  },
    dirt:     { friction: 0.75, restitution: 0.15, damageMultiplier: 0.7  },
    grass:    { friction: 0.65, restitution: 0.1,  damageMultiplier: 0.6  },
    sand:     { friction: 0.55, restitution: 0.05, damageMultiplier: 0.8  },
    ice:      { friction: 0.2,  restitution: 0.3,  damageMultiplier: 0.4  },
    mud:      { friction: 0.4,  restitution: 0.05, damageMultiplier: 1.0  },
    rock:     { friction: 0.85, restitution: 0.35, damageMultiplier: 1.5  },
    lava:     { friction: 0.9,  restitution: 0.1,  damageMultiplier: 5.0  },
    water:    { friction: 0.3,  restitution: 0.0,  damageMultiplier: 0.3  },
    default:  { friction: 0.8,  restitution: 0.2,  damageMultiplier: 1.0  }
  };

  function classifyCollision(event) {
    // event: { impactSpeed, surfaceType, vehiclePart, objectType }
    const surface = SURFACE_TYPES[event.surfaceType] || SURFACE_TYPES.default;
    const impactForce = event.impactSpeed * surface.damageMultiplier;

    let result = {
      type:        'minor',
      damage:      0,
      particleType: 'dust',
      soundId:     'thud_soft',
      bounce:      surface.restitution
    };

    if (impactForce > 15) {
      result.type        = 'severe';
      result.damage      = Math.min(100, (impactForce - 15) * 3);
      result.particleType= 'sparks';
      result.soundId     = 'crash_heavy';
    } else if (impactForce > 8) {
      result.type        = 'moderate';
      result.damage      = (impactForce - 8) * 1.5;
      result.particleType= 'debris';
      result.soundId     = 'crash_medium';
    } else if (impactForce > 3) {
      result.type        = 'minor';
      result.damage      = (impactForce - 3) * 0.5;
      result.particleType= 'dust';
      result.soundId     = 'thud_soft';
    }

    // Special object types
    if (event.objectType === 'collectible') {
      result.type   = 'collect';
      result.damage = 0;
      result.soundId= 'coin_collect';
    } else if (event.objectType === 'obstacle_pushable') {
      result.type    = 'push';
      result.damage  = impactForce * 0.1;
      result.soundId = 'bump_object';
    } else if (event.objectType === 'obstacle_solid') {
      result.damage *= 1.5;
    }

    emit('collision', { event, result });
    return result;
  }

  // ── Collectible physics ──────────────────────────────────────
  const _collectibles = [];

  function spawnCollectible(type, x, y, vx, vy) {
    _collectibles.push({
      id:        Math.random().toString(36).slice(2),
      type,
      x, y, vx, vy,
      collected: false,
      lifetime:  300
    });
  }

  function updateCollectibles(gravity, vehicleX, vehicleY, collectRadius) {
    const collected = [];
    for (let i = _collectibles.length - 1; i >= 0; i--) {
      const c = _collectibles[i];
      if (c.collected) { _collectibles.splice(i, 1); continue; }
      c.vy      += gravity * 0.016;
      c.x       += c.vx;
      c.y       += c.vy;
      c.vx      *= 0.98;
      c.lifetime--;
      if (c.lifetime <= 0) { _collectibles.splice(i, 1); continue; }
      // Simple collect check
      const dx = c.x - vehicleX;
      const dy = c.y - vehicleY;
      if (Math.sqrt(dx * dx + dy * dy) < (collectRadius || 50)) {
        c.collected = true;
        collected.push(c);
        emit('collectible_picked', c);
      }
    }
    return collected;
  }

  // ── Force fields ─────────────────────────────────────────────
  const _forceFields = [];

  function addForceField(cfg) {
    // cfg: { id, x, y, radius, forceX, forceY, type: 'gravity'|'repulsion'|'wind' }
    _forceFields.push({ ...cfg });
  }

  function applyForceFields(vehicleX, vehicleY, vehicleVx, vehicleVy) {
    let ax = 0, ay = 0;
    for (const f of _forceFields) {
      const dx  = vehicleX - f.x;
      const dy  = vehicleY - f.y;
      const dst = Math.sqrt(dx * dx + dy * dy);
      if (dst > f.radius) continue;
      const factor = 1 - dst / f.radius;
      if (f.type === 'repulsion') {
        ax += (dx / Math.max(dst, 1)) * f.forceX * factor;
        ay += (dy / Math.max(dst, 1)) * f.forceY * factor;
      } else if (f.type === 'wind') {
        ax += f.forceX * factor;
        ay += f.forceY * factor;
      } else { // gravity well
        ax -= (dx / Math.max(dst, 1)) * f.forceX * factor;
        ay -= (dy / Math.max(dst, 1)) * f.forceY * factor;
      }
    }
    return { ax, ay };
  }

  // ── Terrain modification ─────────────────────────────────────
  const _terrainEvents = [];

  function addTerrainEvent(type, x, data) {
    // type: 'sinkhole' | 'platform_rise' | 'landslide'
    _terrainEvents.push({ type, x, data, triggered: false, tick: 0 });
  }

  function updateTerrainEvents(vehicleX, dt) {
    const active = [];
    for (const ev of _terrainEvents) {
      ev.tick++;
      if (!ev.triggered && Math.abs(vehicleX - ev.x) < 100) {
        ev.triggered = true;
        emit('terrain_event', ev);
      }
      if (ev.triggered) active.push(ev);
    }
    return active;
  }

  // ── Finish line detection ────────────────────────────────────
  let _finishLineX   = null;
  let _prevVehicleX  = 0;

  function setFinishLine(x) { _finishLineX = x; _prevVehicleX = 0; }

  function checkFinishLine(vehicleX, vehicleY, tick) {
    if (_finishLineX === null) return null;
    if (_prevVehicleX < _finishLineX && vehicleX >= _finishLineX) {
      // Sub-frame interpolation
      const overshoot = vehicleX - _finishLineX;
      const segLen    = vehicleX - _prevVehicleX;
      const fraction  = segLen > 0 ? 1 - overshoot / segLen : 1;
      const exactTick = tick - 1 + fraction;
      _finishLineX = null;
      const result = { crossed: true, atTick: exactTick, interpolatedFraction: fraction };
      emit('finish_line_crossed', result);
      return result;
    }
    _prevVehicleX = vehicleX;
    return null;
  }

  // ── Race start countdown ─────────────────────────────────────
  let _countdown = { active: false, count: 3, tick: 0, started: false };

  function startCountdown(fromCount) {
    _countdown = { active: true, count: fromCount || 3, tick: 0, started: false };
    emit('countdown_start', _countdown.count);
  }

  function updateCountdown(dt) {
    if (!_countdown.active) return null;
    _countdown.tick += dt;
    if (_countdown.tick >= 1) {
      _countdown.tick -= 1;
      _countdown.count--;
      if (_countdown.count <= 0) {
        _countdown.active  = false;
        _countdown.started = true;
        emit('race_start', {});
        return { go: true };
      }
      emit('countdown_tick', _countdown.count);
      return { count: _countdown.count };
    }
    return null;
  }

  // ── Ghost vehicle (AI race) interpolation ───────────────────
  function interpolateGhostPosition(ghostFrames, currentTick) {
    if (!ghostFrames || !ghostFrames.length) return null;
    const idx  = Math.min(Math.floor(currentTick), ghostFrames.length - 2);
    const frac = currentTick - idx;
    const a    = ghostFrames[idx];
    const b    = ghostFrames[idx + 1] || a;
    return {
      x:     a.vs.x   + (b.vs.x   - a.vs.x)   * frac,
      y:     a.vs.y   + (b.vs.y   - a.vs.y)   * frac,
      angle: a.vs.ang + (b.vs.ang - a.vs.ang) * frac
    };
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    // Event bus
    on, off, emit,

    // Triggers
    addTriggerZone,
    checkTriggers,
    clearTriggerZones,
    getTriggerZones() { return [..._triggerZones]; },

    // Collisions
    classifyCollision,
    SURFACE_TYPES,

    // Collectibles
    spawnCollectible,
    updateCollectibles,
    getCollectibles() { return [..._collectibles]; },
    clearCollectibles() { _collectibles.length = 0; },

    // Force fields
    addForceField,
    applyForceFields,
    clearForceFields() { _forceFields.length = 0; },

    // Terrain events
    addTerrainEvent,
    updateTerrainEvents,

    // Finish line
    setFinishLine,
    checkFinishLine,

    // Countdown
    startCountdown,
    updateCountdown,
    isCountdownActive() { return _countdown.active; },

    // Ghost
    interpolateGhostPosition
  };
})();

// ============================================================
// GAME_ANALYTICS_ENGINE — Real-time gameplay analytics (~30KB)
// ============================================================
const GAME_ANALYTICS_ENGINE = (function() {
  'use strict';

  // ── Session state ────────────────────────────────────────────
  let _session = {
    id:          null,
    startTime:   0,
    totalTime:   0,
    runs:        [],
    screenTimes: {},
    events:      [],
    abTests:     {},
    funnelStep:  0
  };

  const FUNNEL_STEPS = ['app_open', 'tutorial_start', 'tutorial_complete',
                        'first_run', 'first_purchase', 'day2_return'];

  // ── Linear regression (for trend) ───────────────────────────
  function linearRegression(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, r2: 0 };
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX  += i;
      sumY  += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return { slope: 0, r2: 0 };
    const slope     = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    // R²
    const mean   = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
      const pred = slope * i + intercept;
      ssTot += (values[i] - mean) ** 2;
      ssRes += (values[i] - pred) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { slope, intercept, r2 };
  }

  // ── K-means crash clustering ─────────────────────────────────
  function clusterCrashPositions(crashes, k) {
    if (!crashes.length) return [];
    k = Math.min(k || 3, crashes.length);
    // Init centroids randomly
    let centroids = crashes.slice(0, k).map(c => c.x);
    for (let iter = 0; iter < 10; iter++) {
      const groups = Array.from({ length: k }, () => []);
      for (const c of crashes) {
        let best = 0, bestDist = Infinity;
        for (let i = 0; i < k; i++) {
          const d = Math.abs(c.x - centroids[i]);
          if (d < bestDist) { bestDist = d; best = i; }
        }
        groups[best].push(c.x);
      }
      centroids = groups.map(g => g.length ? g.reduce((a, b) => a + b, 0) / g.length : centroids[0]);
    }
    return centroids.map((cx, i) => ({
      centroidX: Math.round(cx),
      count:     crashes.filter(c => Math.abs(c.x - cx) < 200).length,
      label:     `Crash hotspot ${i + 1} at x≈${Math.round(cx)}`
    }));
  }

  // ── A/B test assignment ──────────────────────────────────────
  const AB_TESTS = {
    new_fuel_ui:      ['control', 'variant_a'],
    tutorial_length:  ['short',   'long'],
    coin_multiplier:  ['1x',      '2x']
  };

  function assignABTests(userId) {
    const assignments = {};
    for (const [test, variants] of Object.entries(AB_TESTS)) {
      // Deterministic assignment based on userId + test name
      let hash = 0;
      const str = String(userId || 0) + test;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
      assignments[test] = variants[Math.abs(hash) % variants.length];
    }
    return assignments;
  }

  // ── Retention model ──────────────────────────────────────────
  function predictRetention(runs) {
    // Features: total runs, avg distance improvement, time since last run
    if (runs.length < 3) return { probability: 0.5, confidence: 'low' };
    const distances = runs.map(r => r.distance);
    const reg       = linearRegression(distances.slice(-10));
    const improving = reg.slope > 0;
    const daysSince = (Date.now() - (runs[runs.length - 1].endTime || Date.now())) / 86400000;
    let prob = 0.5;
    if (improving)       prob += 0.2;
    if (runs.length > 10) prob += 0.1;
    if (daysSince < 1)   prob += 0.15;
    if (daysSince > 3)   prob -= 0.25;
    prob = Math.max(0, Math.min(1, prob));
    return { probability: Math.round(prob * 100) / 100, confidence: runs.length > 20 ? 'high' : 'medium', improving };
  }

  // ── Skill metrics ────────────────────────────────────────────
  function computeSkillMetrics(runs) {
    if (!runs.length) return {};
    const totalFlips    = runs.reduce((s, r) => s + (r.flips    || 0), 0);
    const successFlips  = runs.reduce((s, r) => s + (r.goodFlips || 0), 0);
    const totalFuel     = runs.reduce((s, r) => s + (r.fuelUsed || 0), 0);
    const totalDist     = runs.reduce((s, r) => s + (r.distance || 0), 0);
    return {
      flipAccuracy:    totalFlips > 0 ? Math.round(successFlips / totalFlips * 100) : 0,
      fuelEfficiency:  totalFuel  > 0 ? Math.round(totalDist / totalFuel * 100) / 100 : 0,
      avgDistance:     runs.length   ? Math.round(totalDist / runs.length) : 0,
      avgCoins:        Math.round(runs.reduce((s, r) => s + (r.coins || 0), 0) / runs.length),
      crashRate:       Math.round(runs.filter(r => r.crashed).length / runs.length * 100)
    };
  }

  // ── Bottleneck detection ─────────────────────────────────────
  function detectBottlenecks(runs) {
    const crashes = runs.flatMap(r => r.crashPositions || []);
    return clusterCrashPositions(crashes, 3);
  }

  // ── Public API ──────────────────────────────────────────────
  return {
    startSession(userId) {
      _session = {
        id:          `ses_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId,
        startTime:   Date.now(),
        totalTime:   0,
        runs:        [],
        screenTimes: {},
        events:      [],
        abTests:     assignABTests(userId),
        funnelStep:  0
      };
      return _session.id;
    },

    endSession() {
      _session.totalTime = Date.now() - _session.startTime;
      return { ...this.getSessionSummary() };
    },

    recordRun(runData) {
      // runData: { map, vehicle, distance, time, coins, flips, goodFlips, topSpeed, crashed, crashPositions, fuelUsed }
      _session.runs.push({ ...runData, endTime: Date.now() });
    },

    trackScreen(screenId) {
      if (_session._currentScreen) {
        _session.screenTimes[_session._currentScreen] =
          (_session.screenTimes[_session._currentScreen] || 0) +
          (Date.now() - (_session._screenStart || Date.now()));
      }
      _session._currentScreen = screenId;
      _session._screenStart   = Date.now();
    },

    trackEvent(name, data) {
      _session.events.push({ name, data, ts: Date.now() });
      // Funnel
      const idx = FUNNEL_STEPS.indexOf(name);
      if (idx === _session.funnelStep) _session.funnelStep++;
    },

    getSessionSummary() {
      const runs   = _session.runs;
      const skill  = computeSkillMetrics(runs);
      const trend  = linearRegression(runs.slice(-10).map(r => r.distance));
      const retain = predictRetention(runs);
      const bots   = detectBottlenecks(runs);
      return {
        sessionId:     _session.id,
        runCount:      runs.length,
        totalTime:     Math.round((Date.now() - _session.startTime) / 1000),
        skillMetrics:  skill,
        distanceTrend: { slope: Math.round(trend.slope * 10) / 10, r2: Math.round(trend.r2 * 100) / 100 },
        retentionPrediction: retain,
        crashHotspots: bots,
        funnelStep:    _session.funnelStep,
        funnelStepName:FUNNEL_STEPS[_session.funnelStep] || 'complete',
        abTests:       { ..._session.abTests },
        screenTimes:   { ..._session.screenTimes }
      };
    },

    getABTest(testName)   { return _session.abTests[testName] || null; },
    isImproving()         { return predictRetention(_session.runs).improving; },
    detectBottlenecks()   { return detectBottlenecks(_session.runs); },
    computeSkillMetrics() { return computeSkillMetrics(_session.runs); },
    getFavoriteVehicle()  {
      const counts = {};
      for (const r of _session.runs) counts[r.vehicle] = (counts[r.vehicle] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    },
    getFavoriteMap()      {
      const counts = {};
      for (const r of _session.runs) counts[r.map] = (counts[r.map] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    },
    getRuns()             { return [..._session.runs]; },
    FUNNEL_STEPS
  };
})();

// ============================================================
// GAME_TUTORIAL_ENGINE — In-game tutorial overlay system (~30KB)
// ============================================================
const GAME_TUTORIAL_ENGINE = (function() {
  'use strict';

  // ── Tutorial types ───────────────────────────────────────────
  const TYPE_TOOLTIP         = 'tooltip';
  const TYPE_HIGHLIGHT       = 'highlight';
  const TYPE_GUIDED_ACTION   = 'guided_action';
  const TYPE_CUTSCENE        = 'cutscene';
  const TYPE_ACHIEVEMENT     = 'achievement';
  const TYPE_FEATURE_INTRO   = 'feature_intro';

  // ── Full tutorial script ─────────────────────────────────────
  const TUTORIAL_SCRIPT = [
    {
      id:        'welcome',
      type:       TYPE_CUTSCENE,
      title:     'Welcome to Ahmet!',
      body:      'Drive your vehicle over challenging terrain and collect coins!',
      duration:  3,
      condition: () => true
    },
    {
      id:        'gas_button',
      type:       TYPE_TOOLTIP,
      title:     'GAS',
      body:      'Hold the GAS button to accelerate forward!',
      target:    'gas_button',
      condition: ctx => !ctx.completedSteps.includes('gas_button')
    },
    {
      id:        'brake_button',
      type:       TYPE_TOOLTIP,
      title:     'BRAKE',
      body:      'Hold BRAKE to slow down or flip backwards.',
      target:    'brake_button',
      advanceOn: 'first_flip',
      condition: ctx => ctx.completedSteps.includes('gas_button')
    },
    {
      id:        'first_flip',
      type:       TYPE_HIGHLIGHT,
      title:     'Nice flip!',
      body:      'Backflips earn bonus points. Try to land safely!',
      advanceOn: 'vehicle_landed',
      condition: ctx => ctx.eventsSeen.includes('first_flip')
    },
    {
      id:        'collect_coin',
      type:       TYPE_GUIDED_ACTION,
      title:     'Coins!',
      body:      'Drive over coins to collect them. Use them to upgrade your vehicle!',
      advanceOn: 'coin_collected',
      condition: ctx => ctx.completedSteps.includes('first_flip')
    },
    {
      id:        'fuel_warning',
      type:       TYPE_TOOLTIP,
      title:     'Running low on fuel!',
      body:      'Pick up fuel canisters to keep going!',
      target:    'fuel_bar',
      condition: ctx => ctx.gameState && ctx.gameState.fuel < 30 && !ctx.completedSteps.includes('fuel_warning')
    },
    {
      id:        'nitro_intro',
      type:       TYPE_FEATURE_INTRO,
      title:     'NITRO Boost!',
      body:      'Press NITRO for a burst of speed — but use it wisely!',
      target:    'nitro_button',
      condition: ctx => ctx.vehicleHasNitro && !ctx.completedSteps.includes('nitro_intro')
    },
    {
      id:        'shop_intro',
      type:       TYPE_FEATURE_INTRO,
      title:     'Visit the Shop!',
      body:      'Spend your coins to upgrade engines, suspensions, and tyres!',
      condition: ctx => !ctx.completedSteps.includes('shop_intro') && ctx.completedSteps.includes('collect_coin')
    },
    {
      id:        'achievement_intro',
      type:       TYPE_ACHIEVEMENT,
      title:     'Achievements',
      body:      'Complete challenges to earn achievements and unlock rewards!',
      condition: ctx => ctx.unlockedAchievements && ctx.unlockedAchievements.length > 0 && !ctx.completedSteps.includes('achievement_intro')
    }
  ];

  // ── Contextual hints ─────────────────────────────────────────
  const CONTEXTUAL_HINTS = [
    { trigger: 'idle_10s',    body: 'Tap GAS to accelerate! Hold for more speed.' },
    { trigger: 'flipping',   body: 'Use BRAKE to control your rotation mid-air!' },
    { trigger: 'low_fuel',   body: 'Look out for fuel canisters ahead!' },
    { trigger: 'stuck',      body: 'Try reversing and using BRAKE to flip back over.' },
    { trigger: 'low_health', body: 'Drive carefully — your vehicle is almost destroyed!' },
    { trigger: 'high_combo', body: 'Amazing combo! Keep flipping for higher scores!' }
  ];

  // ── State ────────────────────────────────────────────────────
  let _state = {
    active:          false,
    completedSteps:  [],
    skipped:         false,
    currentStepId:   null,
    stepStartTime:   0,
    abandonedAt:     null,
    analytics:       [],
    eventsSeen:      [],
    hints:           [],
    idleTimer:       0,
    hintCooldown:    0
  };

  // ── Persistence helpers ───────────────────────────────────────
  function saveState() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ahmet_tutorial_state', JSON.stringify({
          completedSteps: _state.completedSteps,
          skipped:        _state.skipped
        }));
      }
    } catch (_) {}
  }

  function loadState() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('ahmet_tutorial_state');
        if (raw) {
          const s = JSON.parse(raw);
          _state.completedSteps = s.completedSteps || [];
          _state.skipped        = s.skipped        || false;
        }
      }
    } catch (_) {}
  }

  // ── Step evaluation ───────────────────────────────────────────
  function getNextStep(ctx) {
    for (const step of TUTORIAL_SCRIPT) {
      if (_state.completedSteps.includes(step.id)) continue;
      if (step.condition && !step.condition(ctx)) continue;
      return step;
    }
    return null;
  }

  function completeStep(stepId) {
    if (!_state.completedSteps.includes(stepId)) {
      _state.completedSteps.push(stepId);
      const duration = (Date.now() - _state.stepStartTime) / 1000;
      _state.analytics.push({ stepId, duration, completed: true });
      saveState();
    }
    _state.currentStepId = null;
  }

  function abandonStep(stepId) {
    _state.analytics.push({ stepId, abandoned: true });
    _state.abandonedAt = stepId;
  }

  // ── Hint system ───────────────────────────────────────────────
  function maybeShowHint(trigger, dt) {
    if (_state.hintCooldown > 0) {
      _state.hintCooldown -= dt;
      return null;
    }
    const hint = CONTEXTUAL_HINTS.find(h => h.trigger === trigger);
    if (hint) {
      _state.hints.push({ ...hint, shownAt: Date.now() });
      _state.hintCooldown = 15; // 15 second cooldown
      return hint;
    }
    return null;
  }

  // ── New feature intro ─────────────────────────────────────────
  const _pendingFeatureIntros = [];

  function queueFeatureIntro(featureId, title, body) {
    if (!_state.completedSteps.includes('feature_' + featureId)) {
      _pendingFeatureIntros.push({ id: 'feature_' + featureId, type: TYPE_FEATURE_INTRO, title, body });
    }
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    init() { loadState(); _state.active = true; },

    skip() {
      _state.skipped = true;
      _state.active  = false;
      saveState();
      GAME_ANALYTICS_ENGINE.trackEvent('tutorial_skipped', { stepId: _state.currentStepId });
    },

    update(ctx, dt) {
      if (!_state.active || _state.skipped) return null;
      // Idle tracking
      if (ctx.isIdle) {
        _state.idleTimer += dt;
        if (_state.idleTimer > 10) {
          const hint = maybeShowHint('idle_10s', dt);
          _state.idleTimer = 0;
          if (hint) return { type: 'hint', hint };
        }
      } else {
        _state.idleTimer = 0;
      }
      _state.hintCooldown = Math.max(0, _state.hintCooldown - dt);

      // Contextual hints based on game state
      if (ctx.gameState) {
        if (ctx.gameState.fuel < 20)     maybeShowHint('low_fuel',   dt);
        if (ctx.gameState.health < 15)   maybeShowHint('low_health', dt);
        if (ctx.isFlipping)              maybeShowHint('flipping',   dt);
      }

      // Feature intro queue
      if (_pendingFeatureIntros.length > 0) {
        const intro = _pendingFeatureIntros.shift();
        _state.currentStepId  = intro.id;
        _state.stepStartTime  = Date.now();
        return { type: 'tutorial_step', step: intro };
      }

      // Main tutorial step
      const step = getNextStep({ ...ctx, completedSteps: _state.completedSteps, eventsSeen: _state.eventsSeen });
      if (!step) return { type: 'tutorial_complete' };
      if (step.id !== _state.currentStepId) {
        _state.currentStepId = step.id;
        _state.stepStartTime = Date.now();
      }
      // Auto-advance for cutscenes
      if (step.type === TYPE_CUTSCENE && step.duration) {
        if ((Date.now() - _state.stepStartTime) / 1000 >= step.duration) {
          completeStep(step.id);
        }
      }
      return { type: 'tutorial_step', step };
    },

    onEvent(eventName) {
      if (!_state.eventsSeen.includes(eventName)) _state.eventsSeen.push(eventName);
      // Check if current step advances on this event
      const current = TUTORIAL_SCRIPT.find(s => s.id === _state.currentStepId);
      if (current && current.advanceOn === eventName) completeStep(current.id);
    },

    advanceStep()         { if (_state.currentStepId) completeStep(_state.currentStepId); },
    queueFeatureIntro,
    getAnalytics()        { return [..._state.analytics]; },
    getCompletedSteps()   { return [..._state.completedSteps]; },
    isComplete()          { return _state.completedSteps.length >= TUTORIAL_SCRIPT.length; },
    wasSkipped()          { return _state.skipped; },
    getAbandonStep()      { return _state.abandonedAt; },
    reset()               { _state.completedSteps = []; _state.skipped = false; _state.currentStepId = null; saveState(); },
    getHintHistory()      { return [..._state.hints]; },
    TUTORIAL_SCRIPT,
    CONTEXTUAL_HINTS,
    STEP_TYPES: { TYPE_TOOLTIP, TYPE_HIGHLIGHT, TYPE_GUIDED_ACTION, TYPE_CUTSCENE, TYPE_ACHIEVEMENT, TYPE_FEATURE_INTRO }
  };
})();


// ================================================================
// GAME_EVENT_BUS — Central event system for all game modules
// ================================================================
const GAME_EVENT_BUS = (() => {
  const _listeners = {};

  function on(event, fn, priority) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push({ fn, priority: priority || 0 });
    _listeners[event].sort((a,b) => b.priority - a.priority);
  }

  function off(event, fn) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(l => l.fn !== fn);
  }

  function emit(event, data) {
    if (!_listeners[event]) return;
    for (const l of _listeners[event]) {
      try { l.fn(data); } catch(e) {}
    }
  }

  function once(event, fn) {
    const wrapper = (data) => { fn(data); off(event, wrapper); };
    on(event, wrapper);
  }

  function clear(event) {
    if (event) delete _listeners[event];
    else Object.keys(_listeners).forEach(k => delete _listeners[k]);
  }

  function listenerCount(event) {
    return (_listeners[event] || []).length;
  }

  // Standard game events
  const EVENTS = {
    COIN_COLLECTED:   'coin:collected',
    FUEL_COLLECTED:   'fuel:collected',
    DIAMOND_COLLECTED:'diamond:collected',
    VEHICLE_CRASHED:  'vehicle:crashed',
    VEHICLE_FLIPPED:  'vehicle:flipped',
    TRICK_PERFORMED:  'trick:performed',
    TRICK_COMBO:      'trick:combo',
    CHECKPOINT_PASSED:'checkpoint:passed',
    RACE_STARTED:     'race:started',
    RACE_FINISHED:    'race:finished',
    GAME_OVER:        'game:over',
    LEVEL_UP:         'player:levelup',
    ACHIEVEMENT_EARNED:'achievement:earned',
    SEASON_LEVELUP:   'season:levelup',
    NITRO_ACTIVATED:  'nitro:activated',
    NITRO_DEPLETED:   'nitro:depleted',
    MAP_LOADED:       'map:loaded',
    VEHICLE_CHANGED:  'vehicle:changed',
    WEATHER_CHANGED:  'weather:changed',
    OBSTACLE_HIT:     'obstacle:hit',
    POWERUP_COLLECTED:'powerup:collected',
    DAILY_COMPLETE:   'daily:complete',
    NEW_RECORD:       'record:new'
  };

  return { on, off, emit, once, clear, listenerCount, EVENTS };
})();

// ================================================================
// GAME_STATE_MACHINE — Formal state machine for game flow
// ================================================================
const GAME_STATE_MACHINE = (() => {
  const STATES = {
    IDLE:         'idle',
    LOADING:      'loading',
    MENU:         'menu',
    COUNTDOWN:    'countdown',
    RACING:       'racing',
    PAUSED:       'paused',
    TRICK_CAM:    'trick_cam',
    CRASHED:      'crashed',
    GAME_OVER:    'game_over',
    RESULTS:      'results',
    SHOP:         'shop',
    GARAGE:       'garage',
    SETTINGS:     'settings',
    LEADERBOARD:  'leaderboard',
    TOURNAMENT:   'tournament',
    SEASON:       'season'
  };

  const TRANSITIONS = {
    [STATES.IDLE]:       [STATES.LOADING, STATES.MENU],
    [STATES.LOADING]:    [STATES.MENU, STATES.COUNTDOWN],
    [STATES.MENU]:       [STATES.COUNTDOWN, STATES.SHOP, STATES.GARAGE, STATES.SETTINGS, STATES.LEADERBOARD, STATES.TOURNAMENT, STATES.SEASON],
    [STATES.COUNTDOWN]:  [STATES.RACING, STATES.MENU],
    [STATES.RACING]:     [STATES.PAUSED, STATES.CRASHED, STATES.GAME_OVER, STATES.TRICK_CAM, STATES.RESULTS],
    [STATES.TRICK_CAM]:  [STATES.RACING, STATES.CRASHED],
    [STATES.PAUSED]:     [STATES.RACING, STATES.MENU, STATES.GAME_OVER],
    [STATES.CRASHED]:    [STATES.RACING, STATES.GAME_OVER, STATES.MENU],
    [STATES.GAME_OVER]:  [STATES.RESULTS, STATES.MENU],
    [STATES.RESULTS]:    [STATES.MENU, STATES.COUNTDOWN],
    [STATES.SHOP]:       [STATES.MENU],
    [STATES.GARAGE]:     [STATES.MENU],
    [STATES.SETTINGS]:   [STATES.MENU],
    [STATES.LEADERBOARD]:[STATES.MENU],
    [STATES.TOURNAMENT]: [STATES.MENU, STATES.COUNTDOWN],
    [STATES.SEASON]:     [STATES.MENU]
  };

  let _current = STATES.IDLE;
  let _history = [];
  const _hooks = {};

  function canTransition(to) {
    return (TRANSITIONS[_current] || []).includes(to);
  }

  function transition(to, data) {
    if (!canTransition(to)) {
      console.warn(`Invalid transition: ${_current} → ${to}`);
      return false;
    }
    const from = _current;
    _history.push({ from, to, t: Date.now() });
    if (_history.length > 50) _history.shift();
    _current = to;
    if (_hooks[to]) _hooks[to].forEach(fn => fn({ from, to, data }));
    GAME_EVENT_BUS.emit('statemachine:transition', { from, to, data });
    return true;
  }

  function onEnter(state, fn) {
    if (!_hooks[state]) _hooks[state] = [];
    _hooks[state].push(fn);
  }

  function getState() { return _current; }
  function getHistory() { return _history.slice(); }
  function isState(...states) { return states.includes(_current); }

  return { STATES, transition, canTransition, onEnter, getState, getHistory, isState };
})();

// ================================================================
// GAME_INPUT_RECORDER — Record and replay player inputs
// ================================================================
const GAME_INPUT_RECORDER = (() => {
  let _recording = false;
  let _frames = [];
  let _startTick = 0;

  function startRecording(tick) {
    _recording = true;
    _frames = [];
    _startTick = tick || 0;
  }

  function recordFrame(tick, inputs) {
    if (!_recording) return;
    _frames.push({ t: tick - _startTick, ...inputs });
  }

  function stopRecording() {
    _recording = false;
    return _frames.slice();
  }

  function isRecording() { return _recording; }

  // Compress: only store frames where inputs change
  function compress(frames) {
    if (!frames.length) return [];
    const out = [frames[0]];
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i-1];
      const cur  = frames[i];
      const changed = cur.gas !== prev.gas || cur.brake !== prev.brake || cur.left !== prev.left || cur.right !== prev.right;
      if (changed) out.push(cur);
    }
    return out;
  }

  // Playback: get input state at given tick
  function getInputAtTick(compressedFrames, tick) {
    let last = compressedFrames[0] || { gas:0, brake:0, left:0, right:0 };
    for (const f of compressedFrames) {
      if (f.t <= tick) last = f;
      else break;
    }
    return last;
  }

  function exportFrames(frames) {
    try { return btoa(JSON.stringify(compress(frames))); } catch(e) { return ''; }
  }

  function importFrames(str) {
    try { return JSON.parse(atob(str)); } catch(e) { return []; }
  }

  function frameCount() { return _frames.length; }
  function durationTicks() { return _frames.length > 0 ? _frames[_frames.length-1].t : 0; }

  return { startRecording, recordFrame, stopRecording, isRecording, compress, getInputAtTick, exportFrames, importFrames, frameCount, durationTicks };
})();

// ================================================================
// GAME_DIFFICULTY_SYSTEM — Dynamic difficulty adjustment
// ================================================================
const GAME_DIFFICULTY_SYSTEM = (() => {
  const BASE_DIFFICULTY = 5; // 1-10 scale
  let _current = BASE_DIFFICULTY;
  let _sessionResults = [];

  const PARAMS = {
    1:  { obstacleSpeed:0.5, obstacleFreq:0.3, fuelFreq:1.5, coinFreq:1.4, aiLevel:1,  rubberBand:0.8 },
    2:  { obstacleSpeed:0.6, obstacleFreq:0.4, fuelFreq:1.4, coinFreq:1.3, aiLevel:2,  rubberBand:0.75 },
    3:  { obstacleSpeed:0.7, obstacleFreq:0.5, fuelFreq:1.3, coinFreq:1.2, aiLevel:3,  rubberBand:0.7 },
    4:  { obstacleSpeed:0.8, obstacleFreq:0.6, fuelFreq:1.2, coinFreq:1.1, aiLevel:4,  rubberBand:0.65 },
    5:  { obstacleSpeed:1.0, obstacleFreq:0.7, fuelFreq:1.0, coinFreq:1.0, aiLevel:5,  rubberBand:0.6 },
    6:  { obstacleSpeed:1.1, obstacleFreq:0.8, fuelFreq:0.9, coinFreq:0.95, aiLevel:6, rubberBand:0.55 },
    7:  { obstacleSpeed:1.2, obstacleFreq:0.9, fuelFreq:0.8, coinFreq:0.9, aiLevel:7,  rubberBand:0.5 },
    8:  { obstacleSpeed:1.4, obstacleFreq:1.0, fuelFreq:0.7, coinFreq:0.85, aiLevel:8, rubberBand:0.45 },
    9:  { obstacleSpeed:1.6, obstacleFreq:1.1, fuelFreq:0.6, coinFreq:0.8, aiLevel:9,  rubberBand:0.4 },
    10: { obstacleSpeed:2.0, obstacleFreq:1.3, fuelFreq:0.5, coinFreq:0.75, aiLevel:10, rubberBand:0.3 }
  };

  function recordResult(distance, crashed, timeMs) {
    _sessionResults.push({ distance, crashed, timeMs, d: _current });
    if (_sessionResults.length > 10) _sessionResults.shift();
    _adjust();
  }

  function _adjust() {
    if (_sessionResults.length < 3) return;
    const recent = _sessionResults.slice(-5);
    const crashRate = recent.filter(r => r.crashed).length / recent.length;
    const avgDist   = recent.reduce((s,r) => s + r.distance, 0) / recent.length;
    if (crashRate > 0.7 && _current > 1) _current = Math.max(1, _current - 1);
    else if (crashRate < 0.2 && avgDist > 3000 && _current < 10) _current = Math.min(10, _current + 1);
  }

  function setDifficulty(d) { _current = Math.max(1, Math.min(10, d)); }
  function getDifficulty()  { return _current; }
  function getParams()       { return PARAMS[_current] || PARAMS[5]; }
  function getParamFor(d)    { return PARAMS[Math.max(1,Math.min(10,d))] || PARAMS[5]; }
  function reset()           { _current = BASE_DIFFICULTY; _sessionResults = []; }

  return { recordResult, setDifficulty, getDifficulty, getParams, getParamFor, reset };
})();

// ================================================================
// GAME_SESSION_TRACKER — Track everything in a play session
// ================================================================
const GAME_SESSION_TRACKER = (() => {
  let _session = null;

  function startSession(playerId, vehicleId, mapId) {
    _session = {
      id:          Date.now().toString(36),
      playerId, vehicleId, mapId,
      startTime:   Date.now(),
      endTime:     null,
      runs:        [],
      totalCoins:  0,
      totalDiamonds: 0,
      totalDistance: 0,
      totalFlips:  0,
      totalTricks: 0,
      totalNitroUses: 0,
      peakSpeed:   0,
      peakAirTime: 0,
      peakCombo:   0,
      peakDistance:0,
      crashCount:  0,
      screensVisited: []
    };
  }

  function endRun(runData) {
    if (!_session) return;
    _session.runs.push({ ...runData, endTime: Date.now() });
    _session.totalCoins    += runData.coins    || 0;
    _session.totalDiamonds += runData.diamonds || 0;
    _session.totalDistance += runData.distance || 0;
    _session.totalFlips    += runData.flips    || 0;
    _session.totalTricks   += runData.tricks   || 0;
    _session.totalNitroUses+= runData.nitros   || 0;
    if ((runData.topSpeed   || 0) > _session.peakSpeed)    _session.peakSpeed    = runData.topSpeed;
    if ((runData.airTime    || 0) > _session.peakAirTime)  _session.peakAirTime  = runData.airTime;
    if ((runData.comboScore || 0) > _session.peakCombo)    _session.peakCombo    = runData.comboScore;
    if ((runData.distance   || 0) > _session.peakDistance) _session.peakDistance = runData.distance;
    if (runData.crashed) _session.crashCount++;
  }

  function recordScreenVisit(screenName) {
    if (!_session) return;
    if (!_session.screensVisited.includes(screenName)) _session.screensVisited.push(screenName);
  }

  function endSession() {
    if (!_session) return null;
    _session.endTime = Date.now();
    _session.durationMs = _session.endTime - _session.startTime;
    const result = { ..._session };
    _session = null;
    return result;
  }

  function getCurrent() { return _session ? { ..._session } : null; }
  function isActive()   { return !!_session; }
  function getRunCount(){ return _session ? _session.runs.length : 0; }

  return { startSession, endRun, recordScreenVisit, endSession, getCurrent, isActive, getRunCount };
})();


// ================================================================
// GAME_LEADERBOARD_ENGINE — Live leaderboard with sorting & pagination
// ================================================================
const GAME_LEADERBOARD_ENGINE = (() => {
  const LS_KEY = 'ahmet_leaderboard_v2';

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }
    catch(e){ return []; }
  }
  function saveAll(data) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data.slice(0,1000))); } catch(e){}
  }

  function submit(entry) {
    // entry: {playerId, playerName, score, mode, map, vehicle, timestamp}
    const all = loadAll();
    all.push({ ...entry, id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), timestamp: entry.timestamp||Date.now() });
    // Sort by score desc
    all.sort((a,b)=>b.score-a.score);
    saveAll(all);
    return getRank(entry.playerId, entry.mode, entry.map);
  }

  function getRank(playerId, mode, map) {
    const list = getTop(200, mode, map);
    const idx  = list.findIndex(e=>e.playerId===playerId);
    return idx >= 0 ? idx+1 : null;
  }

  function getTop(n, mode, map) {
    let all = loadAll();
    if (mode) all = all.filter(e=>e.mode===mode);
    if (map)  all = all.filter(e=>e.map===map);
    // Dedupe: keep best per player
    const seen = new Map();
    for (const e of all) {
      if (!seen.has(e.playerId) || seen.get(e.playerId).score < e.score) seen.set(e.playerId, e);
    }
    return [...seen.values()].sort((a,b)=>b.score-a.score).slice(0,n||10);
  }

  function getAroundPlayer(playerId, n, mode, map) {
    const list = getTop(200, mode, map);
    const idx  = list.findIndex(e=>e.playerId===playerId);
    if (idx < 0) return { above:[], player:null, below:[] };
    const half  = Math.floor((n||5)/2);
    const start = Math.max(0, idx-half);
    const end   = Math.min(list.length, idx+half+1);
    return {
      above:  list.slice(start, idx).map((e,i)=>({...e,rank:start+i+1})),
      player: { ...list[idx], rank:idx+1 },
      below:  list.slice(idx+1, end).map((e,i)=>({...e,rank:idx+2+i}))
    };
  }

  function getSummary() {
    const all = loadAll();
    return { total:all.length, modes:[...new Set(all.map(e=>e.mode))], maps:[...new Set(all.map(e=>e.map))] };
  }

  function clear() { saveAll([]); }

  return { submit, getRank, getTop, getAroundPlayer, getSummary, clear };
})();

// ================================================================
// GAME_NOTIFICATION_SYSTEM — In-game event notifications
// ================================================================
const GAME_NOTIFICATION_SYSTEM = (() => {
  const _notifs = [];
  let   _nextId = 1;

  const TYPES = {
    info:    { color:'#4488ff', icon:'ℹ️' },
    success: { color:'#22cc55', icon:'✅' },
    warning: { color:'#ffaa00', icon:'⚠️' },
    error:   { color:'#ff4444', icon:'❌' },
    reward:  { color:'#FFD700', icon:'🎁' },
    achievement:{ color:'#aa44ff', icon:'🏆' },
    levelup: { color:'#00ccff', icon:'⬆️' },
    race:    { color:'#ff6600', icon:'🏁' },
  };

  function push(type, title, body, durationMs) {
    const cfg = TYPES[type] || TYPES.info;
    const n   = { id:_nextId++, type, title, body, color:cfg.color, icon:cfg.icon, duration:durationMs||3000, elapsed:0, state:'in' };
    _notifs.push(n);
    if (_notifs.length > 5) _notifs.shift();
    return n.id;
  }

  function dismiss(id) {
    const n = _notifs.find(n=>n.id===id);
    if (n) n.state = 'out';
  }

  function update(dt) {
    for (let i=_notifs.length-1; i>=0; i--) {
      const n = _notifs[i];
      n.elapsed += dt*1000;
      if (n.state==='in'  && n.elapsed >= 300)              n.state = 'visible';
      if (n.state==='visible' && n.elapsed >= n.duration)   n.state = 'out';
      if (n.state==='out' && n.elapsed >= n.duration+400)   _notifs.splice(i,1);
    }
  }

  function getVisible() { return [..._notifs]; }
  function count() { return _notifs.length; }
  function clearAll() { _notifs.length=0; }

  // Convenience
  function info(title, body, dur)        { return push('info',title,body,dur); }
  function success(title, body, dur)     { return push('success',title,body,dur); }
  function warning(title, body, dur)     { return push('warning',title,body,dur); }
  function reward(title, body, dur)      { return push('reward',title,body,dur); }
  function achievement(title, body, dur) { return push('achievement',title,body,dur); }
  function levelUp(level, dur)           { return push('levelup',`Level Up! → ${level}`, 'Keep racing!',dur); }
  function raceStart(mapName)            { return push('race',`Race Start: ${mapName}`,'',2000); }
  function raceFinish(dist, coins)       { return push('race','Race Finished!',`${dist}m · +${coins} coins`,4000); }

  return { push, dismiss, update, getVisible, count, clearAll, info, success, warning, reward, achievement, levelUp, raceStart, raceFinish, TYPES };
})();

// ================================================================
// GAME_WEATHER_CONTROLLER — In-game weather state machine
// ================================================================
const GAME_WEATHER_CONTROLLER = (() => {
  const STATES = {
    clear:  { name:'Clear',       windMin:-1,  windMax:1,  rainRate:0,    fogDensity:0,    lightMult:1.0, tireGripMult:1.0  },
    cloudy: { name:'Cloudy',      windMin:-2,  windMax:2,  rainRate:0,    fogDensity:0.05, lightMult:0.8, tireGripMult:1.0  },
    rain:   { name:'Rain',        windMin:-3,  windMax:3,  rainRate:0.6,  fogDensity:0.1,  lightMult:0.6, tireGripMult:0.75 },
    storm:  { name:'Storm',       windMin:-6,  windMax:6,  rainRate:1.0,  fogDensity:0.2,  lightMult:0.4, tireGripMult:0.55 },
    fog:    { name:'Fog',         windMin:-0.5,windMax:0.5,rainRate:0,    fogDensity:0.5,  lightMult:0.7, tireGripMult:0.9  },
    snow:   { name:'Snow',        windMin:-2,  windMax:2,  rainRate:0.3,  fogDensity:0.15, lightMult:0.85,tireGripMult:0.6  },
    blizzard:{name:'Blizzard',    windMin:-8,  windMax:8,  rainRate:0.9,  fogDensity:0.4,  lightMult:0.3, tireGripMult:0.4  },
    desert: { name:'Desert Wind', windMin:3,   windMax:8,  rainRate:0,    fogDensity:0.08, lightMult:1.2, tireGripMult:0.85 },
  };

  let _currentState = 'clear';
  let _targetState  = 'clear';
  let _transitionT  = 1.0; // 0 = start, 1 = complete
  let _transitionDur= 8.0; // seconds
  let _wind         = 0;
  let _windTarget   = 0;
  let _windChangeTimer = 0;

  function setState(stateName, immediate) {
    if (!STATES[stateName]) return;
    if (immediate) { _currentState=stateName; _targetState=stateName; _transitionT=1; }
    else           { _targetState=stateName; _transitionT=0; }
  }

  function lerp(a,b,t){ return a+(b-a)*t; }

  function update(dt) {
    // Transition
    if (_transitionT < 1) {
      _transitionT = Math.min(1, _transitionT + dt/_transitionDur);
      if (_transitionT >= 1) _currentState = _targetState;
    }
    // Wind
    _windChangeTimer -= dt;
    if (_windChangeTimer <= 0) {
      const s = STATES[_currentState];
      _windTarget       = s.windMin + Math.random()*(s.windMax-s.windMin);
      _windChangeTimer  = 3+Math.random()*5;
    }
    _wind = lerp(_wind, _windTarget, Math.min(1, dt*0.8));
  }

  function getEffects() {
    const c = STATES[_currentState];
    const n = STATES[_targetState];
    const t = _transitionT;
    return {
      state:       _transitionT < 0.5 ? _currentState : _targetState,
      wind:        _wind,
      rainRate:    lerp(c.rainRate,    n.rainRate,    t),
      fogDensity:  lerp(c.fogDensity,  n.fogDensity,  t),
      lightMult:   lerp(c.lightMult,   n.lightMult,   t),
      tireGripMult:lerp(c.tireGripMult,n.tireGripMult,t),
      isTransitioning: _transitionT < 1,
      transitionProgress: _transitionT,
    };
  }

  function randomize(mapBiome) {
    const biomeWeather = {
      desert:  ['clear','desert','cloudy'],
      arctic:  ['snow','blizzard','clear','cloudy'],
      tropical:['clear','rain','storm','cloudy'],
      forest:  ['clear','cloudy','rain','fog'],
      default: ['clear','clear','clear','cloudy','rain','fog'],
    };
    const pool = biomeWeather[mapBiome] || biomeWeather.default;
    setState(pool[Math.floor(Math.random()*pool.length)]);
  }

  function getState() { return _currentState; }
  function getWind()  { return _wind; }

  return { setState, update, getEffects, randomize, getState, getWind, STATES };
})();

// ================================================================
// GAME_RACE_MANAGER — Manages race lifecycle, timing, checkpoints
// ================================================================
const GAME_RACE_MANAGER = (() => {
  let _state      = 'idle'; // idle|countdown|racing|finished|failed
  let _startTime  = 0;
  let _finishTime = 0;
  let _countdown  = 3;
  let _checkpoints= [];
  let _nextCkIdx  = 0;
  let _distance   = 0;
  let _bestLap    = null;
  let _lapTimes   = [];
  let _currentLap = 0;
  let _maxLaps    = 1;

  function startCountdown(checkpoints, maxLaps) {
    _state       = 'countdown';
    _checkpoints = checkpoints || [];
    _maxLaps     = maxLaps||1;
    _countdown   = 3;
    _nextCkIdx   = 0;
    _distance    = 0;
    _lapTimes    = [];
    _currentLap  = 0;
    _bestLap     = null;
  }

  function update(dt) {
    if (_state === 'countdown') {
      _countdown -= dt;
      if (_countdown <= 0) { _state='racing'; _startTime=Date.now(); }
    } else if (_state === 'racing') {
      _distance = Math.max(_distance, 0); // updated externally via setDistance
    }
  }

  function setDistance(d) { if(_state==='racing') _distance=d; }

  function reachCheckpoint(idx) {
    if (_state!=='racing') return null;
    if (idx !== _nextCkIdx) return null;
    _nextCkIdx++;
    const ck = _checkpoints[idx];
    const t  = (Date.now()-_startTime)/1000;
    // Lap complete?
    if (ck && ck.isLap) {
      const lapTime = _lapTimes.length===0 ? t : t - _lapTimes.reduce((a,b)=>a+b,0);
      _lapTimes.push(lapTime);
      if (_bestLap===null || lapTime<_bestLap) _bestLap=lapTime;
      _currentLap++;
      if (_currentLap >= _maxLaps) { return finish(); }
    }
    return { type:'checkpoint', idx, time:t };
  }

  function finish() {
    if (_state!=='racing' && _state!=='finishing') return null;
    _state      = 'finished';
    _finishTime = Date.now();
    const total = (_finishTime - _startTime)/1000;
    return { type:'finish', totalTime:total, lapTimes:[..._lapTimes], bestLap:_bestLap, distance:_distance };
  }

  function fail(reason) {
    _state = 'failed';
    return { type:'fail', reason, time:(Date.now()-_startTime)/1000, distance:_distance };
  }

  function reset() { _state='idle'; _distance=0; _nextCkIdx=0; _lapTimes=[]; _currentLap=0; }

  function getElapsed()  { return _state==='racing' ? (Date.now()-_startTime)/1000 : 0; }
  function getCountdown(){ return Math.max(0, Math.ceil(_countdown)); }
  function getState()    { return _state; }
  function getDistance() { return _distance; }
  function getCurrentLap(){ return _currentLap; }
  function getMaxLaps()  { return _maxLaps; }
  function isRacing()    { return _state==='racing'; }
  function isFinished()  { return _state==='finished'; }

  return { startCountdown, update, setDistance, reachCheckpoint, finish, fail, reset, getElapsed, getCountdown, getState, getDistance, getCurrentLap, getMaxLaps, isRacing, isFinished };
})();


// ================================================================
// GAME_POWERUP_SYSTEM — Collectible power-ups and their effects
// ================================================================
const GAME_POWERUP_SYSTEM = (() => {
  const TYPES = {
    nitro:     { label:'Nitro',         icon:'💨', duration:5,    effect:'speed',    multiplier:2.2, color:'#00ccff' },
    magnet:    { label:'Coin Magnet',   icon:'🧲', duration:10,   effect:'magnet',   radius:200,     color:'#ff4488' },
    shield:    { label:'Shield',        icon:'🛡️', duration:8,    effect:'shield',   color:'#4488ff' },
    slow_mo:   { label:'Slow Motion',   icon:'⏱️', duration:4,    effect:'time',     scale:0.4,      color:'#88ffcc' },
    double_xp: { label:'Double XP',     icon:'⚡', duration:30,   effect:'xp',       multiplier:2.0, color:'#ffcc00' },
    fuel_regen:{ label:'Fuel Regen',    icon:'⛽', duration:8,    effect:'fuel',     rate:5,         color:'#ff8800' },
    invincible:{ label:'Invincible',    icon:'⭐', duration:6,    effect:'invincible',               color:'#ffff00' },
    sticky_tires:{ label:'Sticky Tires',icon:'🛞', duration:12,   effect:'grip',     multiplier:2.5, color:'#88ff44' },
    turbo_flip:{ label:'Turbo Flip',    icon:'🌀', duration:1,    effect:'instant_flip',              color:'#aa44ff' },
    coin_blast:{ label:'Coin Blast',    icon:'💰', duration:0,    effect:'instant_coins', amount:500, color:'#ffd700' },
    repair:    { label:'Instant Repair',icon:'🔧', duration:0,    effect:'instant_repair',            color:'#44ff88' },
    double_coins:{ label:'2× Coins',   icon:'🪙', duration:20,   effect:'coins',    multiplier:2.0, color:'#ffdd00' },
  };

  let _active = []; // [{type, remaining, ...config}]
  const _spawned = []; // {type, x, y, id, collected}

  let _nextId = 1;

  function spawn(type, x, y) {
    const cfg = TYPES[type];
    if (!cfg) return null;
    const p = { type, x, y, id:_nextId++, collected:false };
    _spawned.push(p);
    return p;
  }

  function collect(id, playerData) {
    const p = _spawned.find(s=>s.id===id && !s.collected);
    if (!p) return null;
    p.collected = true;
    const cfg = { ...TYPES[p.type] };
    if (cfg.duration > 0) {
      // Remove existing of same type
      _active = _active.filter(a=>a.type!==p.type);
      _active.push({ ...cfg, type:p.type, remaining:cfg.duration });
    }
    // Instant effects
    if (cfg.effect === 'instant_coins' && playerData) playerData.coins=(playerData.coins||0)+cfg.amount;
    if (cfg.effect === 'instant_repair' && playerData) playerData.health=100;
    return cfg;
  }

  function update(dt) {
    for (let i=_active.length-1; i>=0; i--) {
      _active[i].remaining -= dt;
      if (_active[i].remaining <= 0) _active.splice(i,1);
    }
  }

  function isActive(type) { return _active.some(a=>a.type===type); }

  function getEffect(type) {
    return _active.find(a=>a.type===type)||null;
  }

  function getSpeedMult()  { const n=getEffect('nitro'); return n ? n.multiplier : 1; }
  function getGripMult()   { const g=getEffect('sticky_tires'); return g ? g.multiplier : 1; }
  function getCoinMult()   { const c=getEffect('double_coins'); return c ? c.multiplier : 1; }
  function getXPMult()     { const x=getEffect('double_xp'); return x ? x.multiplier : 1; }
  function getTimeMult()   { const s=getEffect('slow_mo'); return s ? s.scale : 1; }
  function getMagnetRadius(){ const m=getEffect('magnet'); return m ? m.radius : 0; }
  function isShielded()    { return isActive('shield'); }
  function isInvincible()  { return isActive('invincible'); }

  function getVisible(camX, camW) {
    return _spawned.filter(p=>!p.collected && p.x>=camX-50 && p.x<=camX+camW+50);
  }

  function getActiveList() { return [..._active]; }
  function clearAll() { _active=[]; _spawned.length=0; }

  // Random spawn helper
  function spawnRandom(x, y) {
    const typeList = Object.keys(TYPES);
    const weights  = [3,2,2,1,2,2,1,1,1,3,2,3]; // probability weights
    let total = weights.reduce((s,w)=>s+w,0), r=Math.random()*total;
    for (let i=0;i<typeList.length;i++) { r-=weights[i]; if(r<=0) return spawn(typeList[i],x,y); }
    return spawn('nitro', x, y);
  }

  return { TYPES, spawn, collect, update, isActive, getEffect, getSpeedMult, getGripMult, getCoinMult, getXPMult, getTimeMult, getMagnetRadius, isShielded, isInvincible, getVisible, getActiveList, clearAll, spawnRandom };
})();

// ================================================================
// GAME_COMBO_TRACKER — Advanced trick combo tracking & scoring
// ================================================================
const GAME_COMBO_TRACKER = (() => {
  let _combo      = 0;
  let _score      = 0;
  let _timer      = 0;
  let _tricks     = [];
  let _maxCombo   = 0;
  let _totalScore = 0;
  let _multiplier = 1;
  const COMBO_WINDOW = 3.0; // seconds to chain tricks
  const BASE_POINTS  = { backflip:100, frontflip:80, airtime:50, wheelie:40, distance:1, speed_bonus:30 };

  function addTrick(type, extraMult) {
    const base = BASE_POINTS[type] || 50;
    _combo++;
    _timer    = COMBO_WINDOW;
    _multiplier = 1 + (_combo-1)*0.3;
    const points = Math.round(base * _multiplier * (extraMult||1));
    _score   += points;
    _tricks.push({ type, points, combo:_combo, t:Date.now() });
    if (_tricks.length > 20) _tricks.shift();
    if (_combo > _maxCombo) _maxCombo = _combo;
    return { points, combo:_combo, multiplier:_multiplier };
  }

  function breakCombo() {
    const final = { score:_score, combo:_combo, tricks:[..._tricks] };
    _totalScore += _score;
    _combo=0; _score=0; _timer=0; _multiplier=1; _tricks=[];
    return final;
  }

  function update(dt) {
    if (_combo === 0) return null;
    _timer -= dt;
    if (_timer <= 0) return breakCombo();
    return null;
  }

  function getState() {
    return { combo:_combo, score:_score, timer:_timer, maxCombo:_maxCombo, totalScore:_totalScore, multiplier:_multiplier, timerPct:_timer/COMBO_WINDOW };
  }

  function reset() { _combo=0; _score=0; _timer=0; _multiplier=1; _tricks=[]; _maxCombo=0; _totalScore=0; }
  function isActive() { return _combo > 0; }
  function getMultiplier() { return _multiplier; }

  // Trick name helpers
  function trickName(type, count) {
    const NAMES = {
      backflip:  ['Backflip','Double Backflip','Triple Backflip','Quad Backflip'],
      frontflip: ['Frontflip','Double Frontflip','Triple Frontflip'],
      airtime:   ['Air Time','Extended Air Time','Super Air Time'],
      wheelie:   ['Wheelie','Extended Wheelie','Mega Wheelie'],
    };
    const arr = NAMES[type]||[type];
    return arr[Math.min(count-1, arr.length-1)] || type;
  }

  function formatScore(n) {
    if (n>=1000000) return (n/1000000).toFixed(2)+'M';
    if (n>=1000)    return (n/1000).toFixed(1)+'K';
    return String(n);
  }

  return { addTrick, breakCombo, update, getState, reset, isActive, getMultiplier, trickName, formatScore, BASE_POINTS, COMBO_WINDOW };
})();
