'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT — Gece/Gündüz, Hava Durumu, Engeller, Doğal Afetler, Sonsuz Mod
// Kullanıcı bu modları Ortam Ayar Panelinden açıp kapatır (SaveData'da saklanır).
// ═══════════════════════════════════════════════════════════════════════════
const Environment = {
  settings: {
    dayNight:  'auto',   // 'off' | 'day' | 'night' | 'auto'
    weather:   'auto',   // 'auto' | 'clear' | 'rain' | 'snow' | 'fog' | 'wind'
    obstacles: false,    // engel modu (kaya, testere, çivi, trambolin, rampa, halka)
    disasters: false,    // doğal afet modu (meteor, deprem, çığ)
    endless:   false,    // sonsuz mod (mesafeyle artan zorluk)
    damage:    false     // hasar/deformasyon (çarpınca araç ezilir/hasar alır)
  },
  _modeOverride: null,   // oyun modları (survival/boss) tehlikeleri zorunlu açar
  _on(key) { return !!(this.settings[key] || (this._modeOverride && this._modeOverride[key])); },

  // ── Harita varsayılanları ──
  _mapWeather: {
    winter:'snow', arctic:'snow', blizzard:'snow',
    swamp:'fog', cave:'fog', toxic:'fog', underwater:'fog',
    mountains:'wind', highland:'wind', canyon:'wind', dag:'wind',
    volcano:'clear', mars:'clear', moon:'clear'
  },
  _mapNight: { neon_city:true, moon:true, cave:true, arctic:true, toxic:true },

  // ── Sinematik renk derecelendirme (her haritaya ayrı ruh/atmosfer) ──
  _grade: {
    volcano:'rgba(255,70,0,0.11)',   mars:'rgba(255,90,40,0.10)',    underwater:'rgba(0,110,190,0.16)',
    cave:'rgba(30,15,55,0.18)',      jungle:'rgba(30,120,40,0.10)',  neon_city:'rgba(130,0,200,0.12)',
    winter:'rgba(120,160,220,0.10)', arctic:'rgba(120,170,230,0.12)',desert:'rgba(255,180,60,0.09)',
    toxic:'rgba(90,200,40,0.12)',    swamp:'rgba(60,90,40,0.13)',    moon:'rgba(60,70,120,0.12)',
    candy:'rgba(255,150,220,0.09)',  wasteland:'rgba(180,120,60,0.10)', canyon:'rgba(220,120,60,0.09)',
    blizzard:'rgba(150,180,230,0.12)', hotwheels:'rgba(255,120,20,0.08)', beach:'rgba(80,180,230,0.08)'
  },
  // Haritaya göre atmosfer parçacık rengi (yüzen zerreler)
  _moteCol: {
    volcano:'#ff7a2e', mars:'#ff9a5e', jungle:'#a0ff6a', swamp:'#8aff9a', underwater:'#8ad8ff',
    cave:'#7a6aff', neon_city:'#ff5bd0', candy:'#ffb0e0', winter:'#dbeaff', arctic:'#dbeaff',
    desert:'#ffd98a', toxic:'#b6ff5a', blizzard:'#eaf3ff', moon:'#aab6ff'
  },

  // ── Çalışma zamanı durumu ──
  timeOfDay: 0.35,
  activeWeather: 'clear',
  forcedNight: false,
  hazards: [],
  meteors: [],
  avalanche: null,
  shakeX: 0, shakeY: 0,
  headlightsOn: false,
  _spawnX: 0,
  _wind: 0, _windTarget: 0, _windT: 0,
  _quakeCooldown: 0, _quakeTimer: 0,
  _meteorCooldown: 0,
  _avalancheCooldown: 0,
  _flash: 0,
  _rain: [], _snow: [],
  _stars: [],
  vehicle: null, terrain: null, camera: null,
  mapId: 'countryside',
  dist: 0,

  // ── Ayar yükle/kaydet ──
  load() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const s = SaveData.get('envSettings');
        if (s) Object.assign(this.settings, s);
      }
    } catch (e) {}
  },
  save() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('envSettings', this.settings);
    } catch (e) {}
  },
  toggle(key, value) {
    this.settings[key] = value;
    this.save();
  },

  // ── Oyun başında kurulum ──
  init(mapId, terrain) {
    this.load();
    this.mapId = mapId || 'countryside';
    this.terrain = terrain || null;
    this.hazards = [];
    this.meteors = [];
    this.avalanche = null;
    // ── Ek doğal afetler (yalnız afet modu açıkken etkin) ──
    this.tornado = null;
    this.sandWall = null;
    this.rocks = [];
    this.flood = null;
    this._tornadoCd = 24 + Math.random() * 16;
    this._sandWallCd = 34 + Math.random() * 20;
    this._rockCd = 20 + Math.random() * 14;
    this._floodCd = 30 + Math.random() * 20;
    // ── Ek doğal afetler (yıldırım, buz yağışı, yer yarığı, sarsıntı dalgası) ──
    this.strikes = [];       // yıldırım düşmeleri (telgraf → çakma + şok)
    this.ice = [];           // gökten düşen buz kütleleri (gölge telgrafı → parçalanma)
    this.fissures = [];      // yer yarıkları (çatlak telgrafı → ateş/buhar sütunu)
    this.shockwaves = [];    // zeminde ilerleyen sismik dalgalar (aracı sıçratır)
    this._strikeCd = 16 + Math.random() * 12;
    this._iceCd = 12 + Math.random() * 10;
    this._fissureCd = 20 + Math.random() * 14;
    this._shockCd = 26 + Math.random() * 16;
    // ── Ek telgraflı afetler (toz şeytanı, dolu fırtınası) — yalnız afet modunda etkin ──
    this.dustDevils = [];    // gezici küçük toz hunileri (aracı iter, öldürmez)
    this.hail = [];          // dolu taneleri (peçe halinde düşer, küçük sarsıntı)
    this._hailStorm = null;  // aktif dolu sağanağı durumu (telgraf → sağanak)
    this._dustDevilCd = 20 + Math.random() * 16;
    this._hailCd = 30 + Math.random() * 20;
    this.skids = [];
    this.puffs = [];
    this.sparks = [];
    this._prevOnGround = true;
    this.shakeX = this.shakeY = 0;
    this._flash = 0;
    this._spawnX = 900;
    this._wind = this._windTarget = 0; this._windT = 0;
    this._quakeCooldown = 14 + Math.random() * 10;
    this._meteorCooldown = 8 + Math.random() * 8;
    this._avalancheCooldown = 22 + Math.random() * 14;
    this.dist = 0;

    // Gündüz/gece başlangıcı
    this.forcedNight = !!this._mapNight[this.mapId];
    if (this.settings.dayNight === 'day')   this.timeOfDay = 0.5;
    else if (this.settings.dayNight === 'night') this.timeOfDay = 0.0;
    else this.timeOfDay = this.forcedNight ? 0.0 : 0.35;

    // Hava
    this.activeWeather = (this.settings.weather === 'auto')
      ? (this._mapWeather[this.mapId] || 'clear')
      : this.settings.weather;

    // Yağmur/kar parçacık havuzları — grafik ayarına göre ölçekli (performans)
    this._rain = []; this._snow = [];
    const W = this._W(), H = this._H();
    let _ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    _ps *= (typeof MapSettings !== 'undefined' ? MapSettings.particleMult(this.mapId) : 1);
    _ps *= this._vfx();   // erişilebilirlik: reducedMotion / düşük grafik → daha az atmosfer partikülü (yalnız görsel)
    const _rainN = Math.round(160 * _ps), _snowN = Math.round(130 * _ps), _starN = Math.round(70 * _ps);
    for (let i = 0; i < _rainN; i++) this._rain.push({ x: Math.random()*W, y: Math.random()*H, v: 700+Math.random()*400, len: 12+Math.random()*10 });
    for (let i = 0; i < _snowN; i++) this._snow.push({ x: Math.random()*W, y: Math.random()*H, v: 40+Math.random()*50, r: 1.5+Math.random()*2.5, ph: Math.random()*6.28 });
    this._stars = [];
    for (let i = 0; i < _starN; i++) this._stars.push({ x: Math.random()*W, y: Math.random()*H*0.55, s: Math.random()*1.6+0.4, tw: Math.random()*6.28, hue: Math.random() });
    // ── Zenginleştirilmiş atmosfer durumu (yağmur sıçraması, rüzgar molozu, şimşek, sis bankaları) ──
    this._splashes = [];                 // yağmur damlası yere düşünce sıçrama
    this._debris = [];                   // rüzgar/kum fırtınasında sürüklenen zerreler
    this._lightning = 0;                 // şimşek parlaklığı (0..1)
    this._lightningCooldown = 3 + Math.random() * 5;
    this._lightningBolt = null;          // aktif şimşek çizgisi noktaları
    this._fogBanks = [];                 // yuvarlanan sis bankaları
    for (let i = 0; i < 5; i++) this._fogBanks.push({ x: Math.random()*W, y: H*(0.35+i*0.13), r: 120+Math.random()*160, v: 8+Math.random()*16, ph: Math.random()*6.28 });
    // Kum fırtınası/rüzgar molozu — rüzgarlı/çöl haritalarında
    const _dustMap = { desert:true, wasteland:true, mars:true, canyon:true, hotwheels:true };
    this._sandstorm = (_dustMap[this.mapId] && (this.activeWeather === 'wind'));
    if (this.activeWeather === 'wind' || this._sandstorm) {
      const _dn = Math.round((this._sandstorm ? 90 : 40) * _ps);
      for (let i = 0; i < _dn; i++) this._debris.push({ x: Math.random()*W, y: Math.random()*H, vx: 0, r: 1+Math.random()*2.5, ph: Math.random()*6.28, sp: 0.5+Math.random()*1.5, leaf: Math.random() < 0.25 });
    }
    // Isı şimşeği / sıcaklık dalgalanması — sıcak haritalar
    this._heatMap = { volcano:true, desert:true, mars:true, wasteland:true, hotwheels:true };
    // Atmosfer zerreleri (yüzen ışık/toz) — haritaya özel renk
    this._motes = [];
    this._moteColor = this._moteCol[this.mapId] || null;
    if (this._moteColor) {
      const _mn = Math.round(28 * _ps);
      for (let i = 0; i < _mn; i++) this._motes.push({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()*2-1)*10, vy: -5-Math.random()*12, r: 0.8+Math.random()*2.2, ph: Math.random()*6.28 });
    }
  },

  _W() { return (this.camera && this.camera.width)  || window.innerWidth  || 1280; },
  _H() { return (this.camera && this.camera.height) || window.innerHeight || 720; },

  // ── Görsel yoğunluk çarpanı (erişilebilirlik / performans) ──
  // reducedMotion → daha sakin (daha az partikül, daha soluk flash, daha az sarsıntı).
  // graphics 'low' → partikülleri daha da kısar. Tümü savunmacı: Settings yoksa 1 (normal).
  // YALNIZ görsel yoğunluk ölçekler; hiçbir afet/engel mantığını, gating'i veya hasarı değiştirmez.
  _vfx() {
    let f = 1;
    try {
      if (typeof Settings !== 'undefined' && Settings.get) {
        if (Settings.get('reducedMotion') === true) f *= 0.5;
        if (Settings.get('graphics') === 'low')     f *= 0.6;
      }
    } catch (e) {}
    return f;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ZERRE SPRITE ÖNBELLEĞİ (29 Tmz) — kare başına 103 gradient → ~40
  // ═══════════════════════════════════════════════════════════════════════
  //
  //   🔴 ÖLÇÜLEN SORUN: parçacık çizen 7 döngü (polen, spor, ateş böceği,
  //   kar, kıvılcım, kül…) HER TANE için ayrı `createRadialGradient` +
  //   2 `addColorStop` üretiyordu. Yalnız `_drawPollen` kare başına
  //   **26 gradient** yaratıyordu; toplam ölçüm **102,9 gradient/kare**.
  //   Bu, kare başına ~29 KB çöp demek → GC → p99 44 ms, en kötü 1.233 ms.
  //
  //   ▶ ÇÖZÜM: gradient'i BİR KEZ küçük bir off-screen canvas'a çiz, sonra
  //     `drawImage` ile kopyala. `drawImage` gradient dolgusundan hızlıdır
  //     ve HİÇ çöp üretmez.
  //
  //   ⚠ ALFA SPRITE'A GİRMEZ: renk anahtarı sabit olmalı, yoksa her alfa
  //     değeri için yeni sprite üretilir ve önbellek işe yaramaz.
  //     Alfa çizim anında `globalAlpha` ile uygulanır.
  //   ⚠ `save()/restore()` KULLANMA — globalAlpha'yı elle geri koy, daha ucuz.
  _ZERRE_BOY: 64,
  _zerreSprite(icRenk, disRenk) {
    this._zerreCache = this._zerreCache || {};
    const k = icRenk + '|' + disRenk;
    const v = this._zerreCache[k];
    if (v) return v;
    try {
      const S = this._ZERRE_BOY;
      const c = document.createElement('canvas');
      c.width = S; c.height = S;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, icRenk); gr.addColorStop(1, disRenk);
      g.fillStyle = gr;
      g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 6.283); g.fill();
      this._zerreCache[k] = c;
      return c;
    } catch (e) { return null; }
  },

  // Tek bir zerreyi çiz. `alfa` null ise mevcut globalAlpha korunur.
  _zerre(ctx, x, y, r, icRenk, disRenk, alfa) {
    const s = this._zerreSprite(icRenk, disRenk);
    if (!s) {   // canvas kurulamadıysa eski yola dön (görsel bozulmasın)
      const gr = GradyanDeposu.rad(ctx, x, y, 0, x, y, r, [0, icRenk, 1, disRenk]);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      return;
    }
    if (alfa == null) { ctx.drawImage(s, x - r, y - r, r * 2, r * 2); return; }
    const eski = ctx.globalAlpha;
    ctx.globalAlpha = eski * alfa;
    ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = eski;
  },

  _sunElev() {
    if (this.settings.dayNight === 'off') return 1;
    if (this.settings.dayNight === 'day')   return 1;
    if (this.settings.dayNight === 'night') return -1;
    return Math.sin((this.timeOfDay - 0.25) * Math.PI * 2);
  },
  isNight() { return this._sunElev() < -0.15; },

  // ── Güncelleme ──
  update(dt, v, terrain, camera) {
    if (!v || v.dead) { this._decayShake(dt); return; }
    this.vehicle = v; this.terrain = terrain; this.camera = camera;
    this.dist = Math.max(0, (v.x - 200) / 2);
    const diff = this.settings.endless ? (1 + this.dist / 4000) : 1;

    // ── Fren izleri (skid marks) — sert frende arka tekerden ize bırak ──
    if (!this.skids) this.skids = [];
    if (v.onGround && v.brake > 0.4 && Math.abs(v.vx) > 150) {
      if (this._lastSkidX === undefined || Math.abs(v.x - this._lastSkidX) > 7) {
        const gy = terrain && terrain.getYAt ? terrain.getYAt(v.x - 18) : v.y;
        this.skids.push({ x: v.x - 18, y: gy, life: 2.6 });
        this._lastSkidX = v.x;
        if (this.skids.length > 180) this.skids.shift();
      }
    }
    for (let si = this.skids.length - 1; si >= 0; si--) {
      this.skids[si].life -= dt;
      if (this.skids[si].life <= 0) this.skids.splice(si, 1);
    }

    // ── Toz efektleri: sert inişte patlama + hızda iz ──
    if (!this.puffs) this.puffs = [];
    const _ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const _wasAir = this._prevOnGround === false;   // iniş anı: _prevOnGround aşağıda üzerine yazılmadan önce
    if (v.onGround && _wasAir && Math.abs(v.vy || 0) > 200) {
      const gy = terrain && terrain.getYAt ? terrain.getYAt(v.x) : v.y;
      const n = Math.round((6 + Math.min(14, Math.abs(v.vy) / 90)) * _ps);
      for (let i = 0; i < n; i++) this.puffs.push({ x: v.x + (Math.random() * 90 - 45), y: gy - 4, vx: (Math.random() * 2 - 1) * 90, vy: -30 - Math.random() * 70, life: 0.5 + Math.random() * 0.35, r: 4 + Math.random() * 6 });
    }
    this._prevOnGround = v.onGround;
    if (v.onGround && Math.abs(v.vx) > 270 && Math.random() < 0.4 * _ps) {
      const gy = terrain && terrain.getYAt ? terrain.getYAt(v.x - 22) : v.y;
      this.puffs.push({ x: v.x - 22, y: gy - 2, vx: -Math.abs(v.vx) * 0.05, vy: -14 - Math.random() * 22, life: 0.4, r: 3 + Math.random() * 4 });
    }
    for (let pi = this.puffs.length - 1; pi >= 0; pi--) {
      const p = this.puffs[pi];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
      if (p.life <= 0) this.puffs.splice(pi, 1);
    }
    if (this.puffs.length > 150) this.puffs.splice(0, this.puffs.length - 150);

    // ── Egzoz dumanı: gaz basılıyken arkadan gri duman ──
    if (v.throttle > 0.35 && Math.random() < 0.5 * _ps) {
      const w = v.width || 100;
      const ex = v.x - Math.cos(v.angle || 0) * (w * 0.5);
      const ey = v.y - Math.sin(v.angle || 0) * (w * 0.5) - 6;
      this.puffs.push({ x: ex, y: ey, vx: -Math.abs(v.vx) * 0.04 - 10, vy: -22 - Math.random() * 18, life: 0.45 + Math.random() * 0.3, r: 3 + Math.random() * 3, c: 'rgba(85,88,95,0.8)', a: 0.32 });
    }

    // ── Kıvılcımlar: çok sert inişte metalik kıvılcım ──
    if (!this.sparks) this.sparks = [];
    if (v.onGround && _wasAir && Math.abs(v.vy || 0) > 430) {
      const gy = terrain && terrain.getYAt ? terrain.getYAt(v.x) : v.y;
      const n = Math.round(10 * _ps);
      for (let i = 0; i < n; i++) this.sparks.push({ x: v.x + (Math.random() * 60 - 30), y: gy - 4, vx: (Math.random() * 2 - 1) * 220, vy: -60 - Math.random() * 180, life: 0.3 + Math.random() * 0.25 });
    }
    for (let ki = this.sparks.length - 1; ki >= 0; ki--) {
      const k = this.sparks[ki];
      k.life -= dt; k.x += k.vx * dt; k.y += k.vy * dt; k.vy += 520 * dt;
      if (k.life <= 0) this.sparks.splice(ki, 1);
    }

    // ── Gündüz/gece döngüsü (auto: ~150 sn tam tur) ──
    if (this.settings.dayNight === 'auto') {
      this.timeOfDay = (this.timeOfDay + dt / 150) % 1;
    }
    this.headlightsOn = this._sunElev() < -0.08;

    // ── Hava: rüzgar fiziği ──
    if (this.activeWeather === 'wind') {
      this._windT -= dt;
      if (this._windT <= 0) { this._windTarget = (Math.random()*2-1) * 260; this._windT = 1.5 + Math.random()*2.5; }
      this._wind += (this._windTarget - this._wind) * Math.min(1, 2*dt);
      // Rüzgar araca yatay kuvvet (havadayken daha güçlü)
      const _wM = (typeof MapSettings !== 'undefined' ? MapSettings.weatherMult(this.mapId) : 1);
      v.vx += this._wind * (v.onGround ? 0.4 : 1.0) * dt * _wM;
    } else {
      this._wind *= 0.9;
    }

    // Yağmur/kar parçacıkları ilerlet
    this._stepWeatherParticles(dt);

    // ── Engel modu ──
    if (this._on('obstacles')) this._updateHazards(dt, v, terrain, camera, diff);

    // ── Doğal afet modu ──
    if (this._on('disasters')) this._updateDisasters(dt, v, terrain, camera, diff);
    // ── Ek telgraflı afetler (toz şeytanı + dolu fırtınası) — aynı afet kapısı (gating değişmedi) ──
    if (this._on('disasters')) this._updateExtraHazards(dt, v, terrain, camera, diff);

    // ── Hasar/deformasyon: sert inişte hasar birikir, tam hasarda araç imha olur ──
    if (this.settings.damage) {
      if (v.damageLevel === undefined) v.damageLevel = 0;
      if (v.onGround && (v.landingShock || 0) > 0.9) v.damageLevel = Math.min(1, v.damageLevel + (v.landingShock - 0.9) * 0.08);
      if (v.damageLevel >= 1 && !v.dead) this._kill(v);   // _kill kendi içinde v.dead'i set eder (FX çalışsın)
    }

    this._decayShake(dt);
    if (this._flash > 0) this._flash = Math.max(0, this._flash - dt * 2.2);
  },

  _decayShake(dt) {
    this.shakeX *= Math.pow(0.02, dt);
    this.shakeY *= Math.pow(0.02, dt);
    if (Math.abs(this.shakeX) < 0.1) this.shakeX = 0;
    if (Math.abs(this.shakeY) < 0.1) this.shakeY = 0;
  },

  _stepWeatherParticles(dt) {
    const W = this._W(), H = this._H();
    if (this.activeWeather === 'rain') {
      const slant = this._wind * 0.02 + 60;
      // Sıçrama zemini: ekranın alt bölgesi (yaklaşık zemin çizgisi)
      const splashLine = H * (0.82 + 0.06 * Math.sin(Date.now() * 0.0004));
      for (const d of this._rain) {
        d.y += d.v * dt; d.x -= slant * dt * 0.4;
        if (d.y > splashLine && d.x > 0 && d.x < W && Math.random() < 0.30) {
          if (this._splashes.length < 90) this._splashes.push({ x: d.x, y: splashLine, r: 1, life: 0.32 });
        }
        if (d.y > H) { d.y = -10; d.x = Math.random()*W; }
        if (d.x < 0) d.x += W;
      }
    } else if (this.activeWeather === 'snow') {
      for (const f of this._snow) {
        f.ph += dt * 2;
        f.y += f.v * dt; f.x += Math.sin(f.ph) * 18 * dt + this._wind * 0.01;
        if (f.y > H) { f.y = -6; f.x = Math.random()*W; }
        if (f.x < 0) f.x += W; if (f.x > W) f.x -= W;
      }
    }
    // Yağmur sıçramaları hayat döngüsü
    if (this._splashes && this._splashes.length) {
      for (let i = this._splashes.length - 1; i >= 0; i--) {
        const s = this._splashes[i];
        s.life -= dt; s.r += dt * 30;
        if (s.life <= 0) this._splashes.splice(i, 1);
      }
    }
    // Rüzgar molozu / kum fırtınası zerreleri
    if (this._debris && this._debris.length && (this.activeWeather === 'wind' || this._sandstorm)) {
      const push = 40 + Math.abs(this._wind) * 0.6 + (this._sandstorm ? 120 : 0);
      const dir = this._wind >= 0 ? -1 : 1;
      for (const p of this._debris) {
        p.ph += dt * p.sp * (p.leaf ? 4 : 2);
        p.x += dir * push * dt * (0.6 + p.sp * 0.4);
        p.y += Math.sin(p.ph) * (p.leaf ? 26 : 10) * dt + (this._sandstorm ? -6 * dt : 0);
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      }
    }
    // Şimşek zamanlayıcı — yağmurda rastgele çakma
    if (this.activeWeather === 'rain') {
      this._lightningCooldown -= dt;
      if (this._lightningCooldown <= 0) {
        this._lightningCooldown = 4 + Math.random() * 9;
        this._lightning = 1;
        this._lightningBolt = this._buildBolt(W, H);
        if (typeof Audio !== 'undefined' && Audio.playThunder) Audio.playThunder();
        else if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
      }
    }
    if (this._lightning > 0) {
      this._lightning = Math.max(0, this._lightning - dt * 3.4);
      if (this._lightning <= 0) this._lightningBolt = null;
    }
    // Sis bankaları yuvarlanması
    if (this._fogBanks && this.activeWeather === 'fog') {
      const dir = this._wind >= 0 ? 1 : -1;
      for (const b of this._fogBanks) {
        b.ph += dt * 0.4;
        b.x += (b.v + this._wind * 0.05) * dir * dt;
        if (b.x - b.r > W + 40) b.x = -b.r - 40; else if (b.x + b.r < -40) b.x = W + b.r + 40;
      }
    }
  },

  // Kırık şimşek çizgisi noktaları üret (yukarıdan aşağı zikzak)
  _buildBolt(W, H) {
    const pts = [];
    let x = W * (0.25 + Math.random() * 0.5), y = 0;
    const seg = 10 + (Math.random() * 6 | 0);
    const step = H * 0.62 / seg;
    for (let i = 0; i <= seg; i++) {
      pts.push({ x, y, branch: (i > 2 && Math.random() < 0.25) ? (Math.random() * 2 - 1) * 60 : 0 });
      x += (Math.random() * 2 - 1) * 42;
      y += step * (0.7 + Math.random() * 0.6);
    }
    return pts;
  },

  // ═══════════════════════════ ENGELLER ═══════════════════════════
  _updateHazards(dt, v, terrain, camera, diff) {
    const viewW = this._W() / (camera.zoom || 1);
    const ahead = camera.x + viewW + 900;
    // Üret
    let guard = 0;
    const _oM = (typeof MapSettings !== 'undefined' ? MapSettings.obstacleMult(this.mapId) : 1);
    while (this._spawnX < ahead && guard++ < 40) {
      this._spawnHazard(this._spawnX, terrain);
      const gap = (1500 - Math.min(700, this.dist / 8)) / diff;
      this._spawnX += (Math.max(520, gap) * (0.7 + Math.random() * 0.7)) / (_oM || 1);
    }
    // Güncelle + çarpışma
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.x < camera.x - 700) { this.hazards.splice(i, 1); continue; }
      this._stepHazard(h, dt, v, terrain, diff);
      if (h.dead) this.hazards.splice(i, 1);
    }
  },

  _spawnHazard(x, terrain) {
    const gy = terrain && terrain.getYAt ? terrain.getYAt(x) : 400;
    const pool = ['boulder','sawblade','trampoline','spikes','ramp','ring','ring','axe','mud','oil','geyser'];
    const type = pool[(Math.random() * pool.length) | 0];
    const h = { type, x, y: gy, dead: false, t: 0 };
    if (type === 'boulder') { h.y = gy - 240; h.r = 34; h.vx = 0; h.spin = 0; h.rolling = false; }
    else if (type === 'sawblade') { h.r = 30; h.spin = 0; }
    else if (type === 'trampoline') { h.w = 70; }
    else if (type === 'spikes') { h.w = 56; }
    else if (type === 'ramp') { h.w = 120; h.hgt = 70; }
    else if (type === 'ring') { h.r = 46; h.y = gy - 150 - Math.random() * 90; h.got = false; }
    // ── Yeni engeller ──
    else if (type === 'axe') { h.pivotY = gy - 205; h.len = 148; h.ang = (Math.random() * 1.4 - 0.7); h.angV = 0; h.amp = 1.05; h.bladeR = 30; }   // sallanan balta/sarkaç
    else if (type === 'mud') { h.w = 130; h.splat = 0; }                                   // çamur çukuru (yavaşlatır)
    else if (type === 'oil') { h.w = 120; h.shine = 0; }                                   // yağ birikintisi (tutuş kaybı)
    else if (type === 'geyser') { h.w = 46; h.cd = 1.2 + Math.random() * 2.2; h.active = 0; }  // gayzer (periyodik fışkırma)
    this.hazards.push(h);
  },

  _stepHazard(h, dt, v, terrain, diff) {
    h.t += dt;
    const dx = v.x - h.x;
    const near = Math.abs(dx) < 46;
    const gy = terrain && terrain.getYAt ? terrain.getYAt(h.x) : h.y;

    if (h.type === 'boulder') {
      // Oyuncu yaklaşınca yuvarlanmaya başlar, ona doğru gelir
      if (!h.rolling && dx > -700 && dx < 260) h.rolling = true;
      if (h.rolling) {
        const slope = (terrain.getYAt(h.x + 20) - terrain.getYAt(h.x - 20)) / 40;
        h.vx += (slope * 900 - 40) * dt * diff;   // eğimle hızlanır, sola doğru yuvarlanır
        h.vx = Math.max(-620 * diff, Math.min(620 * diff, h.vx));
        h.x += h.vx * dt;
        h.spin += (h.vx / h.r) * dt;
        h.y = terrain.getYAt(h.x) - h.r;
      }
      if (Math.abs(v.x - h.x) < h.r + 34 && Math.abs(v.y - h.y) < h.r + 30) {
        // Kayaya çarpınca geri savrul + yavaşla (öldürmez, iter)
        v.vx = -Math.abs(h.vx || 200) * 0.6 - 120;
        v.vy = Math.min(v.vy, -180);
        this._shake(9);
        if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
        h.dead = true;
      }
    }
    else if (h.type === 'sawblade') {
      h.spin += dt * 12;
      h.y = gy - h.r;
      if (near && v.y + (v.height||40)/2 > h.y - h.r - 8) this._kill(v);
    }
    else if (h.type === 'spikes') {
      h.y = gy;
      if (Math.abs(dx) < h.w/2 && v.y + (v.height||40)/2 > gy - 22) this._kill(v);
    }
    else if (h.type === 'trampoline') {
      h.y = gy;
      if (Math.abs(dx) < h.w/2 && v.y + (v.height||40)/2 > gy - 20 && v.vy > -50) {
        v.vy = -1150;            // güçlü zıplama (bonus)
        h.press = 0.5;
        if (typeof Audio !== 'undefined' && Audio.playSpring) Audio.playSpring();
      }
      if (h.press) h.press = Math.max(0, h.press - dt * 2);
    }
    else if (h.type === 'ramp') {
      h.y = gy;
      // Rampadan geçerken yukarı ivme
      if (Math.abs(dx) < h.w/2 && v.onGround) { v.vy -= 620 * dt; v.vx += 120 * dt; }
    }
    else if (h.type === 'ring') {
      if (!h.got && Math.abs(v.x - h.x) < h.r && Math.abs(v.y - h.y) < h.r) {
        h.got = true; h.dead = true;
        const bonus = 100;
        if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(bonus);
        if (typeof Missions !== 'undefined') Missions.add('ring', 1);
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
        if (typeof HUD !== 'undefined' && HUD.addCoinPopup && this.camera) {
          const sp = this.camera.worldToScreen ? this.camera.worldToScreen(h.x, h.y) : { x: h.x, y: h.y };
          HUD.addCoinPopup(sp.x, sp.y, bonus);
        }
      }
    }
    else if (h.type === 'axe') {
      // Sarkaç fiziği: yerçekimiyle salınır, genlik sınırında yön değiştirir
      h.angV += -(6 * diff) * Math.sin(h.ang) * dt;
      h.angV *= (1 - 0.06 * dt);                                   // hafif sönümleme
      h.ang += h.angV * dt;
      if (Math.abs(h.ang) < 0.04 && Math.abs(h.angV) < 0.5) h.angV += (Math.random() * 2 - 1) * 1.4;  // ölmesin
      if (h.ang > h.amp) { h.ang = h.amp; h.angV = -Math.abs(h.angV); }
      else if (h.ang < -h.amp) { h.ang = -h.amp; h.angV = Math.abs(h.angV); }
      const bx = h.x + Math.sin(h.ang) * h.len;
      const by = h.pivotY + Math.cos(h.ang) * h.len;
      if (Math.abs(v.x - bx) < h.bladeR + 20 && Math.abs(v.y - by) < h.bladeR + 22) this._kill(v);
    }
    else if (h.type === 'mud') {
      h.y = gy;
      if (Math.abs(dx) < h.w / 2 && v.y + (v.height || 40) / 2 > gy - 20) {
        // Çamur: hızı emer, gazsızsa daha da yavaşlatır (öldürmez)
        v.vx *= (1 - 1.5 * dt);
        if (v.onGround && (v.throttle || 0) < 0.3) v.vx *= (1 - 0.9 * dt);
        h.splat = 0.35;
      }
      if (h.splat > 0) h.splat = Math.max(0, h.splat - dt);
    }
    else if (h.type === 'oil') {
      h.y = gy;
      if (Math.abs(dx) < h.w / 2 && v.y + (v.height || 40) / 2 > gy - 20 && v.onGround) {
        // Yağ: tutuş kaybı — momentumla kayar + hafif savrulma (öldürmez)
        v.vx += Math.sign(v.vx || 1) * 70 * dt;
        if (v.angle !== undefined) v.angle += (Math.random() * 2 - 1) * 0.5 * dt;
        h.shine = 1;
      } else if (h.shine > 0) h.shine = Math.max(0, h.shine - dt);
    }
    else if (h.type === 'geyser') {
      h.y = gy;
      h.cd -= dt;
      if (h.active > 0) {
        h.active -= dt;
        // Fışkırma sırasında üstündeki aracı yukarı fırlatır
        if (Math.abs(dx) < h.w / 2 + 12 && v.y + (v.height || 40) / 2 > gy - 165) {
          v.vy = Math.min(v.vy, -1220);
          this._shake(4);
        }
      } else if (h.cd <= 0) {
        h.active = 0.9;
        h.cd = 2.2 + Math.random() * 2.6;
        if (typeof Audio !== 'undefined' && Audio.playSpring) Audio.playSpring();
      }
    }
  },

  // ═══════════════════════════ DOĞAL AFETLER ═══════════════════════════
  _updateDisasters(dt, v, terrain, camera, diff) {
    // ── Meteor yağmuru ──
    this._meteorCooldown -= dt * diff;
    if (this._meteorCooldown <= 0) {
      this._meteorCooldown = (5 + Math.random() * 6) / diff;
      const n = 2 + (Math.random() * 3 * diff | 0);
      for (let i = 0; i < n; i++) {
        const mx = v.x + (Math.random() * 2 - 1) * 700;
        this.meteors.push({ x: mx + 260, y: v.y - 640 - Math.random()*200, vx: -220 - Math.random()*120, vy: 520 + Math.random()*260, r: 10 + Math.random()*10, dead: false, trail: [] });
      }
      if (this._flash < 0.3) this._flash = 0.35;
    }
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.vy += 300 * dt; m.x += m.vx * dt; m.y += m.vy * dt;
      m.trail.push({ x: m.x, y: m.y }); if (m.trail.length > 8) m.trail.shift();
      const gy = terrain && terrain.getYAt ? terrain.getYAt(m.x) : 1e9;
      if (m.y >= gy) {
        this._shake(10); this._flash = Math.max(this._flash, 0.4);
        if (typeof Particles !== 'undefined' && Particles.explosion) Particles.explosion(m.x, gy);
        if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
        if (Math.abs(v.x - m.x) < 45) this._kill(v);   // sadece tam isabet
        m.dead = true;
      }
      if (m.dead || m.x < camera.x - 800) this.meteors.splice(i, 1);
    }

    // ── Deprem ──
    this._quakeCooldown -= dt;
    if (this._quakeCooldown <= 0 && this._quakeTimer <= 0) {
      this._quakeTimer = 3.5 + Math.random() * 2;
      this._quakeCooldown = (16 + Math.random() * 12) / diff;
    }
    if (this._quakeTimer > 0) {
      this._quakeTimer -= dt;
      this._shake(6 * Math.min(1, this._quakeTimer));
    }

    // ── Çığ (arkadan gelen kütle, yakalarsa öldürür) ──
    if (!this.avalanche) {
      this._avalancheCooldown -= dt;
      if (this._avalancheCooldown <= 0) {
        this.avalanche = { x: v.x - this._W() / (camera.zoom||1) - 200, spd: 340 };
        this._avalancheCooldown = (28 + Math.random() * 18) / diff;
        if (typeof HUD !== 'undefined' && HUD.showToast) HUD.showToast && HUD.showToast('⚠ ÇIĞ! KAÇ!');
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('⚠ ÇIĞ GELİYOR!');
      }
    } else {
      this.avalanche.spd += 6 * dt * diff;
      this.avalanche.x += this.avalanche.spd * dt;
      if (this.avalanche.x >= v.x - 30) this._kill(v);              // yakaladı
      if (this.avalanche.x > v.x + 600) this.avalanche = null;      // oyuncu kaçtı
    }

    const _vw = this._W() / (camera.zoom || 1);

    // ── Hortum (tornado) — dolaşan huni: yaklaşınca içine emer + yukarı kaldırır, çok yakınsa öldürür ──
    if (this._tornadoCd === undefined) this._tornadoCd = 24 + Math.random() * 16;
    if (!this.tornado) {
      this._tornadoCd -= dt * diff;
      if (this._tornadoCd <= 0) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.tornado = { x: v.x + side * (_vw + 300), spd: 55 + Math.random() * 55, life: 14, ph: 0 };
        this._tornadoCd = (30 + Math.random() * 20) / diff;
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🌪 HORTUM YAKLAŞIYOR!');
      }
    } else {
      const to = this.tornado;
      to.ph += dt; to.life -= dt;
      to.x += Math.sign(v.x - to.x) * to.spd * dt;                  // oyuncuya doğru dolaşır
      const gdx = v.x - to.x, adist = Math.abs(gdx);
      if (adist < 240) {
        const pull = 1 - adist / 240;
        v.vx += -Math.sign(gdx || 1) * 340 * pull * dt * diff;      // içine çeker
        v.vy -= 260 * pull * dt * diff;                             // yukarı kaldırır
        if (adist < 44) this._kill(v);
      }
      if (to.life <= 0) this.tornado = null;
    }

    // ── Kum fırtınası duvarı (sandstorm wall) — süpüren toz duvarı: iter + görüşü azaltır (öldürmez) ──
    if (this._sandWallCd === undefined) this._sandWallCd = 34 + Math.random() * 20;
    if (!this.sandWall) {
      this._sandWallCd -= dt * diff;
      if (this._sandWallCd <= 0) {
        this.sandWall = { x: v.x - _vw - 260, spd: 300 + Math.random() * 80 };
        this._sandWallCd = (40 + Math.random() * 22) / diff;
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🌫 KUM FIRTINASI!');
      }
    } else {
      const sw = this.sandWall;
      sw.spd += 8 * dt * diff;
      sw.x += sw.spd * dt;
      if (Math.abs(v.x - sw.x) < 200) v.vx += 130 * dt * diff;      // geçerken iter
      if (sw.x > v.x + _vw + 300) this.sandWall = null;
    }

    // ── Kaya heyelanı (rockslide) — önden yuvarlanarak gelen kayalar (çarpınca savurur) ──
    if (!this.rocks) this.rocks = [];
    if (this._rockCd === undefined) this._rockCd = 20 + Math.random() * 14;
    this._rockCd -= dt * diff;
    if (this._rockCd <= 0) {
      this._rockCd = (18 + Math.random() * 16) / diff;
      const n = 2 + (Math.random() * 3 * diff | 0);
      const ox = v.x + _vw + 200;
      for (let i = 0; i < n; i++) {
        const rx = ox + i * 90 + Math.random() * 60;
        const rgy = terrain && terrain.getYAt ? terrain.getYAt(rx) : v.y;
        this.rocks.push({ x: rx, y: rgy - 40 - Math.random() * 220, r: 16 + Math.random() * 20, vx: -180 - Math.random() * 160, vy: 0, spin: 0, dead: false });
      }
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('⛰ HEYELAN!');
    }
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const r = this.rocks[i];
      r.vy += 900 * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      const rgy = terrain && terrain.getYAt ? terrain.getYAt(r.x) : 1e9;
      if (r.y > rgy - r.r) {
        r.y = rgy - r.r; r.vy *= -0.35;
        const slope = (terrain.getYAt(r.x + 18) - terrain.getYAt(r.x - 18)) / 36;
        r.vx += (slope * 500 - 30) * dt * diff;
        r.vx = Math.max(-560, Math.min(120, r.vx));
      }
      r.spin += (r.vx / r.r) * dt;
      if (Math.abs(v.x - r.x) < r.r + 30 && Math.abs(v.y - r.y) < r.r + 28) {
        v.vx = -Math.abs(r.vx) * 0.5 - 100; v.vy = Math.min(v.vy, -160);
        this._shake(7);
        if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
        r.dead = true;
      }
      if (r.dead || r.x < camera.x - 700) this.rocks.splice(i, 1);
    }

    // ── Ani sel (flash flood) — arkadan yükselen su dalgası: yakalarsa öldürür (kaç!) ──
    if (this._floodCd === undefined) this._floodCd = 30 + Math.random() * 20;
    if (!this.flood) {
      this._floodCd -= dt * diff;
      if (this._floodCd <= 0) {
        this.flood = { x: v.x - _vw - 220, spd: 300 };
        this._floodCd = (34 + Math.random() * 20) / diff;
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🌊 SEL GELİYOR!');
      }
    } else {
      const fl = this.flood;
      fl.spd += 7 * dt * diff;
      fl.x += fl.spd * dt;
      if (fl.x >= v.x - 20) this._kill(v);
      if (fl.x > v.x + 700) this.flood = null;
    }

    // ── Yıldırım düşmesi (lightning strike) — yeri hedefleyip şarj olur, sonra çakar: yakınındaki aracı çarpar ──
    if (!this.strikes) this.strikes = [];
    if (this._strikeCd === undefined) this._strikeCd = 16 + Math.random() * 12;
    this._strikeCd -= dt * diff;
    if (this._strikeCd <= 0) {
      this._strikeCd = (14 + Math.random() * 12) / diff;
      const sx = v.x + (Math.random() * 2 - 1) * 420 + Math.sign(v.vx || 1) * 140;
      const sgy = terrain && terrain.getYAt ? terrain.getYAt(sx) : v.y;
      this.strikes.push({ x: sx, gy: sgy, t: 0, warn: 1.15, phase: 0, flash: 0, bolt: null, dead: false });
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('⚡ YILDIRIM!');
    }
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t += dt;
      if (s.phase === 0) {
        if (s.t >= s.warn) {
          s.phase = 1; s.flash = 1; s.t = 0;
          s.bolt = this._buildStrikeBolt(s.x, s.gy);
          this._flash = Math.max(this._flash, 0.5);
          this._shake(9);
          if (typeof Audio !== 'undefined' && Audio.playThunder) Audio.playThunder();
          else if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
          const sd = Math.abs(v.x - s.x);
          if (sd < 66) this._kill(v);                                                            // doğrudan isabet
          else if (sd < 165) { v.vx += Math.sign(v.x - s.x || 1) * 230; v.vy = Math.min(v.vy, -150); }  // şok dalgası iter (öldürmez)
        }
      } else {
        s.flash = Math.max(0, s.flash - dt * 3.2);
        if (s.flash <= 0) s.dead = true;
      }
      if (s.dead) this.strikes.splice(i, 1);
    }

    // ── Buz yağışı (falling ice) — gökten düşen buz kütleleri, yere gölge telgrafı bırakır; doğrudan isabet öldürür, yere düşünce parçalanır ──
    if (!this.ice) this.ice = [];
    if (this._iceCd === undefined) this._iceCd = 12 + Math.random() * 10;
    this._iceCd -= dt * diff;
    if (this._iceCd <= 0) {
      this._iceCd = (11 + Math.random() * 10) / diff;
      const n = 2 + (Math.random() * 3 * diff | 0);
      for (let i = 0; i < n; i++) {
        const ix = v.x + (Math.random() * 2 - 1) * 620;
        const igy = terrain && terrain.getYAt ? terrain.getYAt(ix) : v.y;
        this.ice.push({ x: ix, y: igy - 560 - Math.random() * 220, vy: 100 + Math.random() * 90, gy: igy, r: 12 + Math.random() * 12, spin: Math.random() * 6.28, vspin: (Math.random() * 2 - 1) * 4, dead: false, shards: null });
      }
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🧊 BUZ YAĞMURU!');
    }
    for (let i = this.ice.length - 1; i >= 0; i--) {
      const ic = this.ice[i];
      if (ic.shards) {
        let alive = false;
        for (const sh of ic.shards) { sh.life -= dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vy += 900 * dt; if (sh.life > 0) alive = true; }
        if (!alive) ic.dead = true;
      } else {
        ic.vy += 780 * dt; ic.y += ic.vy * dt; ic.spin += ic.vspin * dt;
        const hitCar = Math.abs(v.x - ic.x) < ic.r + 26 && Math.abs(v.y - ic.y) < ic.r + 26;
        if (hitCar) {
          this._shake(6); this._kill(v); ic.shards = this._iceShards(ic.x, ic.y);
          if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
        } else if (ic.y >= ic.gy - ic.r) {
          ic.y = ic.gy - ic.r; this._shake(4);
          if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
          ic.shards = this._iceShards(ic.x, ic.gy - ic.r);
        }
      }
      if (ic.dead || ic.x < camera.x - 800) this.ice.splice(i, 1);
    }

    // ── Yer yarığı (fissure) — önce yerde çatlak parıldar, sonra yukarı ateş/buhar sütunu fışkırır: üstündeki aracı fırlatır ──
    if (!this.fissures) this.fissures = [];
    if (this._fissureCd === undefined) this._fissureCd = 20 + Math.random() * 14;
    this._fissureCd -= dt * diff;
    if (this._fissureCd <= 0) {
      this._fissureCd = (18 + Math.random() * 14) / diff;
      const fx = v.x + (Math.random() * 2 - 1) * 260 + Math.sign(v.vx || 1) * 280;
      const fgy = terrain && terrain.getYAt ? terrain.getYAt(fx) : v.y;
      const hot = !!(this._heatMap && this._heatMap[this.mapId]);
      this.fissures.push({ x: fx, gy: fgy, w: 40 + Math.random() * 26, t: 0, warn: 1.1, phase: 0, erupt: 0, life: 1.5, hot, dead: false, hurt: false });
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(hot ? '🌋 YER YARIĞI!' : '💨 YER YARIĞI!');
    }
    for (let i = this.fissures.length - 1; i >= 0; i--) {
      const fs = this.fissures[i];
      fs.t += dt;
      if (fs.phase === 0) {
        if (fs.t >= fs.warn) { fs.phase = 1; fs.t = 0; this._shake(6); if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash(); }
      } else {
        fs.erupt = Math.min(1, fs.erupt + dt * 4);
        const jetH = 230 * fs.erupt;
        if (Math.abs(v.x - fs.x) < fs.w / 2 + 16 && v.y + (v.height || 40) / 2 > fs.gy - jetH) {
          v.vy = Math.min(v.vy, -900 * fs.erupt);                                   // yukarı fırlatır (bonus/tehlike)
          this._shake(4);
          if (fs.hot && this.settings.damage && !fs.hurt) { fs.hurt = true; this._kill(v); }   // lav yalnız hasar modunda yakar (adil)
        }
        if (fs.t >= fs.life) { fs.erupt = Math.max(0, fs.erupt - dt * 3); if (fs.erupt <= 0) fs.dead = true; }
      }
      if (fs.dead) this.fissures.splice(i, 1);
    }

    // ── Sarsıntı dalgası (shockwave) — zemin boyunca ilerleyen sismik dalga: geçerken aracı havaya sıçratır (öldürmez) ──
    if (!this.shockwaves) this.shockwaves = [];
    if (this._shockCd === undefined) this._shockCd = 26 + Math.random() * 16;
    this._shockCd -= dt * diff;
    if (this._shockCd <= 0) {
      this._shockCd = (24 + Math.random() * 16) / diff;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.shockwaves.push({ x: v.x - side * (_vw * 0.6 + 320), dir: side, spd: 520 + Math.random() * 160, hit: false });
      this._shake(5);
    }
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sh = this.shockwaves[i];
      sh.x += sh.dir * sh.spd * dt;
      if (!sh.hit && Math.abs(v.x - sh.x) < 42) {
        sh.hit = true;
        if (v.onGround) v.vy = Math.min(v.vy, -520);                                // zemin dalgası aracı havaya atar
        v.vx += sh.dir * 120;
        this._shake(8);
        if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
      }
      if (sh.x < camera.x - 900 || sh.x > camera.x + _vw + 900) this.shockwaves.splice(i, 1);
    }
  },

  _shake(amt) {
    const _sM = (typeof MapSettings !== 'undefined' ? MapSettings.shakeMult(this.mapId) : 1);
    amt *= _sM;
    amt *= this._vfx();   // erişilebilirlik: reducedMotion → daha yumuşak sarsıntı genliği (yalnız görsel; mantık aynı)
    this.shakeX = (Math.random() * 2 - 1) * amt;
    this.shakeY = (Math.random() * 2 - 1) * amt;
  },
  _kill(v) {
    if (v.dead) return;
    // Hasar modu açıkken tehlike ölümcül değil — hasar birikir (2 vuruşta imha) → daha adil
    if (this.settings.damage) {
      v.damageLevel = (v.damageLevel || 0) + 0.5;
      this._shake(10);
      if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
      if (v.damageLevel < 1) { v.vx *= 0.3; return; }
    }
    v.dead = true;
    if (typeof Particles !== 'undefined' && Particles.explosion) Particles.explosion(v.x, v.y);
    if (typeof Audio !== 'undefined' && Audio.playCrash) Audio.playCrash();
    this._shake(12);
  },

  // ═══════════════════════════ ÇİZİM ═══════════════════════════
  applyShake(ctx) {
    if (typeof Settings !== 'undefined' && Settings.get && Settings.get('shake') === false) return;
    if (this.shakeX || this.shakeY) ctx.translate(this.shakeX, this.shakeY);
  },

  // Gökyüzü tint (screen-space, camera.apply ÖNCESİ çağrılır)
  tintSky(ctx, W, H) {
    if (this.settings.dayNight === 'off') return;
    const elev = this._sunElev();
    const dark = Math.max(0, -elev);
    if (dark > 0.02) {
      // Zenginleştirilmiş gece göğü: derin zenit → ufka doğru daha sıcak/aydınlık gradyan
      const g = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(3,4,22,' + (dark * 0.82) + ')', 0.55, 'rgba(8,12,38,' + (dark * 0.60) + ')', 1, 'rgba(20,22,48,' + (dark * 0.42) + ')']);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // Ay parıltısı (gece açık haritalarda yumuşak ışık halesi)
      if (dark > 0.4 && this.activeWeather !== 'fog') this._drawMoon(ctx, W, H, dark);
      // Aurora — kuzey/kutup/gece haritalarında dalgalanan ışık perdesi
      if (dark > 0.5) this._drawAurora(ctx, W, H, dark);
      // Yıldızlar (hafif renk sıcaklığı + kırpışma)
      ctx.save();
      const _t = Date.now() * 0.002;
      for (const s of this._stars) {
        const a = dark * (0.5 + 0.5 * Math.sin(s.tw + _t));
        const hue = s.hue || 0;
        const r = 255, gg = 245 - (hue * 60 | 0), b = 235 - ((0.5 - hue) * 40 | 0);
        ctx.fillStyle = 'rgba(' + r + ',' + gg + ',' + b + ',' + (a * 0.9) + ')';
        ctx.fillRect(s.x, s.y, s.s, s.s);
        // parlak yıldızlarda ince ışıltı haçı
        if (s.s > 1.4 && a > 0.55) {
          ctx.globalAlpha = (a - 0.55) * 0.6;
          ctx.fillRect(s.x - s.s, s.y + s.s * 0.4, s.s * 3, s.s * 0.4);
          ctx.fillRect(s.x + s.s * 0.4, s.y - s.s, s.s * 0.4, s.s * 3);
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      // Kayan yıldızlar (meteor izleri) — derin gecede seyrek çakma
      if (dark > 0.45) this._drawShootingStars(ctx, W, H, dark);
    }
    // Şafak/gün batımı sıcak tonu — dikey gradyanla ufuk aydınlanması
    const warm = Math.max(0, 0.30 - Math.abs(elev)) / 0.30;
    if (warm > 0.02 && dark < 0.85) {
      const wg = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(255,120,40,' + (warm * 0.06) + ')', 0.6, 'rgba(255,130,45,' + (warm * 0.16) + ')', 1, 'rgba(255,90,20,' + (warm * 0.26) + ')']);
      ctx.fillStyle = wg; ctx.fillRect(0, 0, W, H);
    }
    // Gündüz güneş diski + parıltı halesi (sisli değilken)
    if (elev > 0.12 && dark < 0.4 && this.activeWeather !== 'fog') this._drawSun(ctx, W, H, elev);
  },

  // Yumuşak güneş diski + sıcak hale (gündüz)
  _drawSun(ctx, W, H, elev) {
    const e = Math.max(0, Math.min(1, elev));
    const sx = W * 0.20, sy = H * (0.30 - e * 0.14);
    const sr = Math.min(W, H) * 0.045;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 6.5);
    const gi = 0.08 + e * 0.10;
    glow.addColorStop(0, 'rgba(255,242,195,' + gi + ')');
    glow.addColorStop(0.5, 'rgba(255,225,150,' + (gi * 0.4) + ')');
    glow.addColorStop(1, 'rgba(255,225,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 6.5, 0, 6.28); ctx.fill();
    // İnce ışıma huzmeleri
    if (typeof Settings === 'undefined' || !Settings.perfScale || Settings.perfScale() >= 0.6) {
      const t = Date.now() * 0.0004;
      ctx.strokeStyle = 'rgba(255,240,190,' + (0.05 + e * 0.05) + ')';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.28 + t;
        const r1 = sr * 1.4, r2 = sr * (3.4 + 0.5 * Math.sin(t * 3 + i));
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
        ctx.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
        ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(255,250,225,' + (0.55 + e * 0.4) + ')';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.28); ctx.fill();
    ctx.restore();
  },

  // Kayan yıldızlar — gece göğünde seyrek meteor izleri (kendi zamanlamasını sürer)
  _drawShootingStars(ctx, W, H, dark) {
    if (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.5) return;
    const now = Date.now();
    if (this._shootLast === undefined) this._shootLast = now;
    let dt = (now - this._shootLast) / 1000; this._shootLast = now;
    if (dt > 0.1) dt = 0.1;
    if (!this._shoot) this._shoot = [];
    if (this._shootCd === undefined) this._shootCd = 3 + Math.random() * 6;
    this._shootCd -= dt;
    if (this._shootCd <= 0 && this._shoot.length < 3) {
      this._shootCd = 5 + Math.random() * 9;
      const ang = 0.30 + Math.random() * 0.45;
      const sp = 520 + Math.random() * 280;
      this._shoot.push({ x: W * (0.05 + Math.random() * 0.65), y: H * (0.04 + Math.random() * 0.22),
                         vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, len: 60 + Math.random() * 70 });
    }
    ctx.save(); ctx.lineCap = 'round';
    for (let i = this._shoot.length - 1; i >= 0; i--) {
      const s = this._shoot[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 0.75;
      if (s.life <= 0 || s.x > W + 90 || s.y > H * 0.7) { this._shoot.splice(i, 1); continue; }
      const inv = 1 / Math.hypot(s.vx, s.vy);
      const tx = s.x - s.vx * inv * s.len, ty = s.y - s.vy * inv * s.len;
      const a = Math.min(1, s.life) * dark;
      const grd = GradyanDeposu.lin(ctx, s.x, s.y, tx, ty, [0, 'rgba(255,255,255,' + (a * 0.9) + ')', 1, 'rgba(180,200,255,0)']);
      ctx.strokeStyle = grd; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.restore();
  },

  // Yumuşak ay diski + hale (gece)
  _drawMoon(ctx, W, H, dark) {
    const mx = W * 0.78, my = H * 0.22, mr = Math.min(W, H) * 0.05;
    ctx.save();
    const halo = GradyanDeposu.rad(ctx, mx, my, mr * 0.6, mx, my, mr * 4, [0, 'rgba(210,225,255,' + (dark * 0.22) + ')', 1, 'rgba(210,225,255,0)']);
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(235,240,255,' + (dark * 0.85) + ')';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.28); ctx.fill();
    // kraterler
    ctx.fillStyle = 'rgba(200,208,230,' + (dark * 0.5) + ')';
    ctx.beginPath(); ctx.arc(mx - mr*0.3, my - mr*0.2, mr*0.22, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr*0.35, my + mr*0.25, mr*0.16, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr*0.1, my - mr*0.4, mr*0.12, 0, 6.28); ctx.fill();
    ctx.restore();
  },

  // Aurora perdesi — dalgalanan ışık bantları (gece)
  _drawAurora(ctx, W, H, dark) {
    if (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.6) return;
    const t = Date.now() * 0.0006;
    const bands = [
      { col: '90,255,170', yb: 0.16, amp: 26, a: 0.10 },
      { col: '120,180,255', yb: 0.22, amp: 34, a: 0.08 },
      { col: '200,120,255', yb: 0.13, amp: 20, a: 0.06 }
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let bi = 0; bi < bands.length; bi++) {
      const bd = bands[bi];
      const baseY = H * bd.yb;
      const g = GradyanDeposu.lin(ctx, 0, baseY - 40, 0, baseY + 80, [0, 'rgba(' + bd.col + ',0)', 0.5, 'rgba(' + bd.col + ',' + (bd.a * dark) + ')', 1, 'rgba(' + bd.col + ',0)']);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= W; x += 24) {
        const y = baseY + Math.sin(x * 0.006 + t * (2 + bi) + bi * 1.7) * bd.amp
                        + Math.sin(x * 0.013 + t * 3) * bd.amp * 0.4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, baseY + 120); ctx.lineTo(0, baseY + 120); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // Dünya-uzayı çizim (camera.apply İÇİNDE, terrain'den sonra)
  drawWorld(ctx, camera) {
    // Fren izleri (en altta — diğer objelerin altında)
    if (this.skids && this.skids.length) {
      ctx.save();
      for (let i = 0; i < this.skids.length; i++) {
        const s = this.skids[i];
        ctx.globalAlpha = Math.min(0.4, s.life * 0.16);
        ctx.fillStyle = '#141414';
        ctx.fillRect(s.x - 9, s.y - 2, 18, 4);
      }
      ctx.restore();
    }

    // Toz bulutları (iniş + hız)
    if (this.puffs && this.puffs.length) {
      ctx.save();
      for (let i = 0; i < this.puffs.length; i++) {
        const p = this.puffs[i];
        ctx.globalAlpha = Math.max(0, Math.min(p.a || 0.45, p.life));
        ctx.fillStyle = p.c || '#d8cdb6';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - p.life), 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }

    // Kıvılcımlar (sert iniş)
    if (this.sparks && this.sparks.length) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineWidth = 2;
      for (let i = 0; i < this.sparks.length; i++) {
        const k = this.sparks[i];
        ctx.globalAlpha = Math.max(0, Math.min(1, k.life * 3));
        ctx.strokeStyle = k.life > 0.15 ? '#fff2a0' : '#ff9a2e';
        ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(k.x - k.vx * 0.02, k.y - k.vy * 0.02); ctx.stroke();
      }
      ctx.restore();
    }

    // Engeller
    if (this._on('obstacles')) {
      for (const h of this.hazards) this._drawHazard(ctx, h);
    }
    // Meteorlar + ek afetler
    if (this._on('disasters')) {
      for (const m of this.meteors) this._drawMeteor(ctx, m);
      if (this.avalanche) this._drawAvalanche(ctx, camera);
      if (this.rocks && this.rocks.length) { for (const r of this.rocks) this._drawRock(ctx, r); }
      if (this.flood) this._drawFlood(ctx, camera);
      if (this.sandWall) this._drawSandWall(ctx, camera);
      if (this.tornado) this._drawTornado(ctx, camera);
      if (this.ice && this.ice.length) { for (const ic of this.ice) this._drawIce(ctx, ic); }
      if (this.fissures && this.fissures.length) { for (const fs of this.fissures) this._drawFissure(ctx, fs); }
      if (this.shockwaves && this.shockwaves.length) { for (const sh of this.shockwaves) this._drawShockwave(ctx, sh); }
      if (this.strikes && this.strikes.length) { for (const s of this.strikes) this._drawStrike(ctx, s); }
      // Ek telgraflı afetler (toz şeytanı + dolu) — aynı afet kapısı içinde
      this._drawExtraHazards(ctx, camera);
    }
    // Farlar (gece)
    if (this.headlightsOn && this.vehicle && !this.vehicle.dead) this._drawHeadlights(ctx, this.vehicle);
  },

  _drawHazard(ctx, h) {
    ctx.save();
    if (h.type === 'boulder') {
      ctx.translate(h.x, h.y);
      ctx.rotate(h.spin || 0);
      ctx.fillStyle = '#6b5b4a';
      ctx.beginPath(); ctx.arc(0, 0, h.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4a3f33';
      for (let i = 0; i < 5; i++) { const a = i/5*6.28; ctx.beginPath(); ctx.arc(Math.cos(a)*h.r*0.5, Math.sin(a)*h.r*0.5, h.r*0.16, 0, 6.28); ctx.fill(); }
      ctx.strokeStyle = '#2e261e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,h.r,0,6.28); ctx.stroke();
    }
    else if (h.type === 'sawblade') {
      ctx.translate(h.x, h.y); ctx.rotate(h.spin || 0);
      ctx.fillStyle = '#c0c6cc';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) { const a = i/12*6.28; const rr = (i%2===0)? h.r : h.r*0.7; ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a8088'; ctx.beginPath(); ctx.arc(0,0,h.r*0.35,0,6.28); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(0,0,h.r*0.12,0,6.28); ctx.fill();
    }
    else if (h.type === 'spikes') {
      ctx.translate(h.x, h.y);
      ctx.fillStyle = '#9aa0a6';
      const n = 5, sw = h.w / n;
      for (let i = 0; i < n; i++) { const sx = -h.w/2 + i*sw; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx+sw/2, -26); ctx.lineTo(sx+sw, 0); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#5a5f66'; ctx.fillRect(-h.w/2, -3, h.w, 5);
    }
    else if (h.type === 'trampoline') {
      ctx.translate(h.x, h.y);
      const p = h.press || 0;
      ctx.fillStyle = '#222'; ctx.fillRect(-h.w/2, -4, h.w, 8);
      ctx.strokeStyle = '#00e0ff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-h.w/2, -4); ctx.quadraticCurveTo(0, 8 + p*18, h.w/2, -4); ctx.stroke();
      ctx.fillStyle = '#0a3a44'; ctx.fillRect(-h.w/2-4, -6, 6, 20); ctx.fillRect(h.w/2-2, -6, 6, 20);
    }
    else if (h.type === 'ramp') {
      ctx.translate(h.x, h.y);
      ctx.fillStyle = '#e6a020';
      ctx.beginPath(); ctx.moveTo(-h.w/2, 4); ctx.lineTo(h.w/2, 4); ctx.lineTo(h.w/2, -h.hgt); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; for (let i = 0; i < 5; i++) ctx.fillRect(-h.w/2 + i*(h.w/5), -i*(h.hgt/5)-2, h.w/10, 4);
    }
    else if (h.type === 'ring') {
      ctx.translate(h.x, h.y);
      ctx.strokeStyle = h.got ? '#666' : '#ffd21e'; ctx.lineWidth = 7;
      ctx.shadowColor = '#ffd21e'; ctx.shadowBlur = h.got ? 0 : 14;
      ctx.beginPath(); ctx.arc(0, 0, h.r, 0, 6.28); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, h.r-4, 0, 6.28); ctx.stroke();
    }
    else if (h.type === 'axe') {
      ctx.translate(h.x, h.pivotY);
      ctx.rotate(h.ang || 0);
      // pivot bağlantı
      ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, h.len); ctx.stroke();
      ctx.fillStyle = '#2e261e'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 6.28); ctx.fill();
      // balta başı
      ctx.translate(0, h.len);
      ctx.fillStyle = '#8a9096'; ctx.fillRect(-4, -20, 8, 16);
      ctx.fillStyle = '#c8ccd2';
      ctx.beginPath();
      ctx.moveTo(-h.bladeR, -8); ctx.lineTo(h.bladeR, -8);
      ctx.lineTo(h.bladeR * 0.55, h.bladeR); ctx.lineTo(-h.bladeR * 0.55, h.bladeR);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-h.bladeR, -8); ctx.lineTo(-h.bladeR * 0.55, h.bladeR); ctx.stroke();
    }
    else if (h.type === 'mud') {
      ctx.translate(h.x, h.y);
      ctx.fillStyle = '#3e2c17';
      ctx.beginPath(); ctx.ellipse(0, 2, h.w / 2, 12, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#5a4022';
      ctx.beginPath(); ctx.ellipse(0, 0, h.w / 2 * 0.85, 8, 0, 0, 6.28); ctx.fill();
      // kabaran baloncuklar
      const _bt = Date.now() * 0.004;
      ctx.fillStyle = 'rgba(120,90,50,0.85)';
      for (let i = 0; i < 4; i++) {
        const bx = -h.w * 0.3 + i * h.w * 0.2;
        const br = 2 + 2 * Math.abs(Math.sin(_bt + i));
        ctx.beginPath(); ctx.arc(bx, -Math.abs(Math.sin(_bt + i * 1.3)) * 4, br, 0, 6.28); ctx.fill();
      }
    }
    else if (h.type === 'oil') {
      ctx.translate(h.x, h.y);
      ctx.fillStyle = 'rgba(20,18,26,0.9)';
      ctx.beginPath(); ctx.ellipse(0, 1, h.w / 2, 7, 0, 0, 6.28); ctx.fill();
      // gökkuşağı yağ parıltısı
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(90,120,200,0.25)';
      ctx.beginPath(); ctx.ellipse(-h.w * 0.15, -1, h.w * 0.22, 3, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(160,90,200,0.20)';
      ctx.beginPath(); ctx.ellipse(h.w * 0.18, 0, h.w * 0.18, 3, 0, 0, 6.28); ctx.fill();
    }
    else if (h.type === 'geyser') {
      ctx.translate(h.x, h.y);
      ctx.fillStyle = '#4a4640'; ctx.beginPath(); ctx.ellipse(0, 0, h.w / 2, 8, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#2b2824'; ctx.beginPath(); ctx.ellipse(0, -1, h.w / 2 * 0.6, 5, 0, 0, 6.28); ctx.fill();
      if (h.active > 0) {
        const hgt = 155 * Math.min(1, h.active * 1.6) * (0.7 + 0.3 * Math.sin(Date.now() * 0.03));
        const g = ctx.createLinearGradient(0, 0, 0, -hgt);
        g.addColorStop(0, 'rgba(180,220,255,0.85)');
        g.addColorStop(1, 'rgba(200,235,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-h.w * 0.4, 0); ctx.lineTo(-6, -hgt); ctx.lineTo(6, -hgt); ctx.lineTo(h.w * 0.4, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(220,240,255,0.6)';
        for (let i = 0; i < 6; i++) { const yy = -Math.random() * hgt; ctx.beginPath(); ctx.arc((Math.random() * 2 - 1) * 14, yy, 2 + Math.random() * 3, 0, 6.28); ctx.fill(); }
      }
    }
    ctx.restore();
  },

  _drawMeteor(ctx, m) {
    ctx.save();
    // Kuyruk
    for (let i = 0; i < m.trail.length; i++) {
      const p = m.trail[i]; const a = i / m.trail.length;
      ctx.fillStyle = 'rgba(255,' + (120 + a*100 | 0) + ',20,' + (a*0.6) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, m.r * a, 0, 6.28); ctx.fill();
    }
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r*1.6);
    g.addColorStop(0, '#fff2c0'); g.addColorStop(0.4, '#ff8a1e'); g.addColorStop(1, 'rgba(200,40,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, m.r*1.6, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r*0.6, 0, 6.28); ctx.fill();
    ctx.restore();
  },

  _drawAvalanche(ctx, camera) {
    const a = this.avalanche;
    const gyTop = (this.terrain && this.terrain.getYAt) ? this.terrain.getYAt(a.x) : 400;
    const top = camera.y - 200;
    ctx.save();
    const grad = GradyanDeposu.lin(ctx, a.x - 600, 0, a.x, 0, [0, 'rgba(230,240,255,0.95)', 1, 'rgba(200,215,235,0.85)']);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(a.x - 800, top);
    for (let x = a.x - 800; x <= a.x; x += 40) {
      const bump = Math.sin(x * 0.05 + Date.now() * 0.01) * 20;
      ctx.lineTo(x, top + 40 + bump);
    }
    ctx.lineTo(a.x, gyTop + 400); ctx.lineTo(a.x - 800, gyTop + 400); ctx.closePath(); ctx.fill();
    // Toz bulutları
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 10; i++) { const bx = a.x - Math.random()*300; const by = top + 60 + Math.random()*260; ctx.beginPath(); ctx.arc(bx, by, 26+Math.random()*30, 0, 6.28); ctx.fill(); }
    ctx.restore();
  },

  // Heyelan kayası (yuvarlanan düzensiz taş)
  _drawRock(ctx, r) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.spin || 0);
    ctx.fillStyle = '#7a6a58';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const rr = r.r * (0.8 + 0.2 * Math.sin(i * 2.1)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#544838';
    ctx.beginPath(); ctx.arc(-r.r * 0.25, -r.r * 0.2, r.r * 0.22, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(r.r * 0.3, r.r * 0.15, r.r * 0.15, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#3a3226'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const rr = r.r * (0.8 + 0.2 * Math.sin(i * 2.1)); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
  },

  // Hortum hunisi (katmanlı dönen elipslerle, aşağı doğru genişleyen)
  _drawTornado(ctx, camera) {
    const to = this.tornado;
    const gy = (this.terrain && this.terrain.getYAt) ? this.terrain.getYAt(to.x) : (camera.y + 300);
    const topY = gy - 520;
    ctx.save();
    const t = Date.now() * 0.005;
    const lowPerf = (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.6);
    const layers = lowPerf ? 8 : 16;
    for (let i = 0; i <= layers; i++) {
      const f = i / layers;                          // 0 üst, 1 taban
      const yy = topY + f * (gy - topY);
      const wob = Math.sin(t * 2 + f * 6) * 26 * f;
      const rad = 18 + f * 70;                        // aşağı doğru genişler
      const cx = to.x + wob + Math.sin(t + f * 3) * 10;
      ctx.globalAlpha = 0.16 + f * 0.10;
      ctx.fillStyle = f < 0.5 ? 'rgba(120,110,120,0.8)' : 'rgba(90,80,90,0.85)';
      ctx.beginPath(); ctx.ellipse(cx, yy, rad, rad * 0.28, 0, 0, 6.28); ctx.fill();
    }
    // taban toz bulutu
    ctx.globalAlpha = 0.5; ctx.fillStyle = 'rgba(110,100,95,0.7)';
    for (let i = 0; i < 8; i++) { const bx = to.x + (Math.random() * 2 - 1) * 90; ctx.beginPath(); ctx.arc(bx, gy - Math.random() * 30, 20 + Math.random() * 26, 0, 6.28); ctx.fill(); }
    ctx.restore();
  },

  // Kum fırtınası duvarı (dünya-uzayı dikey toz perdesi)
  _drawSandWall(ctx, camera) {
    const sw = this.sandWall;
    const top = camera.y - 300;
    const H = this._H() / (camera.zoom || 1) + 600;
    const x = sw.x;
    ctx.save();
    const g = ctx.createLinearGradient(x - 340, 0, x + 60, 0);
    g.addColorStop(0, 'rgba(200,150,80,0)');
    g.addColorStop(0.7, 'rgba(190,140,75,0.55)');
    g.addColorStop(1, 'rgba(170,120,60,0.8)');
    ctx.fillStyle = g; ctx.fillRect(x - 340, top, 400, H);
    ctx.fillStyle = 'rgba(210,170,110,0.4)';
    const t = Date.now() * 0.004;
    for (let i = 0; i < 10; i++) { const yy = top + ((i * 97 + t * 40) % H); const rx = x - Math.random() * 300; ctx.beginPath(); ctx.arc(rx, yy, 20 + Math.random() * 30, 0, 6.28); ctx.fill(); }
    ctx.restore();
  },

  // Ani sel dalgası (arkadan yükselen su kütlesi + köpük)
  _drawFlood(ctx, camera) {
    const fl = this.flood;
    const top = ((this.terrain && this.terrain.getYAt) ? this.terrain.getYAt(fl.x) : (camera.y + 200)) - 60;
    const bottom = camera.y + this._H() / (camera.zoom || 1) + 200;
    const left = fl.x - 900;
    ctx.save();
    const g = ctx.createLinearGradient(0, top - 40, 0, bottom);
    g.addColorStop(0, 'rgba(80,150,200,0.55)');
    g.addColorStop(1, 'rgba(30,90,150,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    const now = Date.now() * 0.006;
    for (let x = left; x <= fl.x; x += 30) {
      const wob = Math.sin(x * 0.03 + now) * 14 + Math.sin(x * 0.07 + now * 1.5) * 6;
      ctx.lineTo(x, top + wob);
    }
    ctx.lineTo(fl.x, top - 30); ctx.lineTo(fl.x, bottom); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(240,250,255,0.7)';
    for (let i = 0; i < 10; i++) { const fx = fl.x - Math.random() * 40; ctx.beginPath(); ctx.arc(fx, top + (Math.random() * 2 - 1) * 20, 4 + Math.random() * 6, 0, 6.28); ctx.fill(); }
    ctx.restore();
  },

  // ── Ek afet yardımcıları: kırık yıldırım çizgisi noktaları (gökten yere) ──
  _buildStrikeBolt(x, gy) {
    const pts = []; const topY = gy - 640; const seg = 13;
    for (let i = 0; i <= seg; i++) {
      const f = i / seg;
      const y = topY + (gy - topY) * f;
      const jitter = (Math.random() * 2 - 1) * 30 * (1 - f);                 // tabana yaklaşırken hedefe kilitlenir
      pts.push({ x: x + jitter, y, branch: (i > 3 && i < seg - 1 && Math.random() < 0.28) ? (Math.random() * 2 - 1) * 55 : 0 });
    }
    return pts;
  },
  // Buz parçalanması: küçük kırıklar üret
  _iceShards(x, y) {
    const arr = []; const n = 5 + (Math.random() * 4 | 0);
    for (let k = 0; k < n; k++) arr.push({ x, y, vx: (Math.random() * 2 - 1) * 180, vy: -50 - Math.random() * 160, life: 0.4 + Math.random() * 0.3, r: 3 + Math.random() * 4 });
    return arr;
  },

  // Yıldırım — telgraf hedef halkası, sonra parlak çakma + taban patlaması
  _drawStrike(ctx, s) {
    ctx.save();
    if (s.phase === 0) {
      const p = Math.min(1, s.t / s.warn);
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(s.t * 12));
      ctx.globalAlpha = 0.35 + 0.4 * p;
      ctx.strokeStyle = 'rgba(160,200,255,' + (0.55 * pulse) + ')';
      ctx.lineWidth = 2 + p * 2;
      const rr = 12 + (1 - p) * 42;
      ctx.beginPath(); ctx.ellipse(s.x, s.gy, rr, rr * 0.4, 0, 0, 6.28); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(s.x, s.gy, rr * 0.55, rr * 0.22, 0, 0, 6.28); ctx.stroke();
      ctx.globalAlpha = 0.25 + 0.5 * pulse * p;
      ctx.strokeStyle = 'rgba(200,225,255,0.85)'; ctx.lineWidth = 2;
      ctx.setLineDash([6, 10]); ctx.lineDashOffset = -s.t * 60;
      ctx.beginPath(); ctx.moveTo(s.x, s.gy); ctx.lineTo(s.x, s.gy - 130 - p * 120); ctx.stroke();
      ctx.setLineDash([]);
    } else if (s.bolt && s.flash > 0) {
      ctx.globalAlpha = Math.min(1, s.flash * 1.4);
      ctx.strokeStyle = 'rgba(240,248,255,1)';
      ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(150,190,255,0.95)'; ctx.shadowBlur = 20;
      const b = s.bolt;
      ctx.beginPath(); ctx.moveTo(b[0].x, b[0].y);
      for (let i = 1; i < b.length; i++) ctx.lineTo(b[i].x, b[i].y);
      ctx.stroke();
      for (let i = 3; i < b.length; i++) if (b[i].branch) { ctx.beginPath(); ctx.moveTo(b[i].x, b[i].y); ctx.lineTo(b[i].x + b[i].branch, b[i].y + 46); ctx.stroke(); }
      ctx.shadowBlur = 0;
      const g = ctx.createRadialGradient(s.x, s.gy, 0, s.x, s.gy, 92);
      g.addColorStop(0, 'rgba(220,235,255,' + (s.flash * 0.8) + ')');
      g.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.gy, 92, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },

  // Düşen buz kütlesi (gölge telgrafı + kristal) veya parçalanma kırıkları
  _drawIce(ctx, ic) {
    ctx.save();
    if (ic.shards) {
      ctx.fillStyle = 'rgba(210,240,255,0.9)';
      for (const sh of ic.shards) { if (sh.life <= 0) continue; ctx.globalAlpha = Math.max(0, Math.min(1, sh.life * 2.4)); ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, 6.28); ctx.fill(); }
      ctx.restore(); return;
    }
    // yer gölgesi — isabet noktasını gösterir, düştükçe koyulaşır/büyür
    const fall = Math.max(0, Math.min(1, 1 - (ic.gy - ic.y) / 560));
    ctx.globalAlpha = 0.12 + fall * 0.28;
    ctx.fillStyle = 'rgba(20,40,70,1)';
    ctx.beginPath(); ctx.ellipse(ic.x, ic.gy, ic.r * (0.6 + fall * 0.9), ic.r * 0.3, 0, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(ic.x, ic.y); ctx.rotate(ic.spin || 0);
    const g = ctx.createLinearGradient(-ic.r, -ic.r, ic.r, ic.r);
    g.addColorStop(0, 'rgba(235,250,255,0.95)'); g.addColorStop(1, 'rgba(150,200,235,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -ic.r); ctx.lineTo(ic.r * 0.7, -ic.r * 0.2); ctx.lineTo(ic.r * 0.5, ic.r); ctx.lineTo(-ic.r * 0.5, ic.r); ctx.lineTo(-ic.r * 0.7, -ic.r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  },

  // Yer yarığı — telgraf çatlağı, sonra yukarı ateş/buhar sütunu
  _drawFissure(ctx, fs) {
    ctx.save();
    const hot = fs.hot;
    if (fs.phase === 0) {
      const p = Math.min(1, fs.t / fs.warn);
      const glow = 0.3 + 0.7 * Math.abs(Math.sin(fs.t * 10));
      ctx.globalAlpha = 0.4 + 0.5 * p;
      ctx.strokeStyle = hot ? 'rgba(255,' + (100 + (glow * 80 | 0)) + ',30,0.9)' : 'rgba(200,220,255,0.8)';
      ctx.lineWidth = 2 + p * 3; ctx.lineCap = 'round';
      let cx = fs.x - fs.w / 2;
      ctx.beginPath(); ctx.moveTo(cx, fs.gy);
      for (let k = 0; k < 5; k++) { cx += fs.w / 5; ctx.lineTo(cx, fs.gy + (Math.random() * 2 - 1) * 5); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      const jetH = 230 * fs.erupt;
      const g = ctx.createLinearGradient(0, fs.gy, 0, fs.gy - jetH);
      if (hot) { g.addColorStop(0, 'rgba(255,230,120,0.95)'); g.addColorStop(0.5, 'rgba(255,120,20,0.7)'); g.addColorStop(1, 'rgba(180,30,0,0)'); }
      else { g.addColorStop(0, 'rgba(230,240,255,0.85)'); g.addColorStop(1, 'rgba(210,225,245,0)'); }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(fs.x - fs.w / 2, fs.gy);
      ctx.lineTo(fs.x - fs.w * 0.18, fs.gy - jetH);
      ctx.lineTo(fs.x + fs.w * 0.18, fs.gy - jetH);
      ctx.lineTo(fs.x + fs.w / 2, fs.gy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = hot ? 'rgba(255,180,60,0.85)' : 'rgba(240,248,255,0.7)';
      for (let k = 0; k < 6; k++) { const yy = fs.gy - Math.random() * jetH; ctx.beginPath(); ctx.arc(fs.x + (Math.random() * 2 - 1) * fs.w * 0.4, yy, 2 + Math.random() * 3, 0, 6.28); ctx.fill(); }
    }
    ctx.restore();
  },

  // Sarsıntı dalgası — zemin boyunca ilerleyen kabaran toprak sırtı + toz
  _drawShockwave(ctx, sh) {
    const T = this.terrain;
    const gy = (T && T.getYAt) ? T.getYAt(sh.x) : 400;
    ctx.save();
    ctx.globalAlpha = sh.hit ? 0.4 : 0.75;
    ctx.strokeStyle = 'rgba(180,160,130,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const t = Date.now() * 0.02;
    ctx.beginPath();
    for (let k = -3; k <= 3; k++) {
      const gx = sh.x + k * 12;
      const yy = ((T && T.getYAt) ? T.getYAt(gx) : gy) - 8 - Math.abs(Math.sin(t + k)) * 14;
      if (k === -3) ctx.moveTo(gx, yy); else ctx.lineTo(gx, yy);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(190,175,150,0.5)';
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(sh.x + (Math.random() * 2 - 1) * 30, gy - Math.random() * 30, 5 + Math.random() * 8, 0, 6.28); ctx.fill(); }
    ctx.restore();
  },

  _drawHeadlights(ctx, v) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle || 0);
    const fx = (v.width || 100) * 0.5;
    const g = GradyanDeposu.rad(ctx, fx, -6, 0, fx, -6, 220, [0, 'rgba(255,245,200,0.35)', 1, 'rgba(255,245,200,0)']);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(fx, -14); ctx.lineTo(fx + 240, -70); ctx.lineTo(fx + 240, 60); ctx.lineTo(fx, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  // Ekran-uzayı çizim (camera.restore SONRASI)
  drawScreen(ctx, W, H) {
    // ── Hız çizgileri: yüksek hızda ekran kenarlarında hız hissi ──
    if (this.vehicle && !this.vehicle.dead) {
      const _sp = Math.abs(this.vehicle.vx || 0);
      if (_sp > 460) {
        const _in = Math.min(1, (_sp - 460) / 520);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,' + (_in * 0.16) + ')';
        ctx.lineWidth = 2; ctx.lineCap = 'round';
        const _t = Date.now() * 0.05;
        for (let i = 0; i < 8; i++) {
          const yy = ((i * 97 + _t * 8) % H + H) % H;
          const len = 40 + _in * 90 + (i % 3) * 18;
          ctx.beginPath(); ctx.moveTo(W, yy); ctx.lineTo(W - len, yy); ctx.stroke();
          const y2 = ((yy + H * 0.5) % H);
          ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(len, y2); ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ── Atmosfer zerreleri (yüzen ışık/toz — haritaya özel) ──
    if (this._motes && this._motes.length && this._moteColor) {
      ctx.save();
      ctx.fillStyle = this._moteColor;
      for (let i = 0; i < this._motes.length; i++) {
        const m = this._motes[i];
        m.ph += 0.02;
        m.x += m.vx * 0.016 + Math.sin(m.ph) * 0.3;
        m.y += m.vy * 0.016;
        if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; }
        if (m.x < -6) m.x = W + 6; else if (m.x > W + 6) m.x = -6;
        ctx.globalAlpha = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(m.ph * 1.3));
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.28); ctx.fill();
      }
      ctx.restore();
    }
    // ── Gece ateşböcekleri (organik haritalarda yanıp sönen ışık noktaları) ──
    if (this._sunElev() < -0.1 && (this.mapId === 'jungle' || this.mapId === 'swamp' || this.mapId === 'toxic' || this.mapId === 'cave')) {
      this._drawFireflies(ctx, W, H);
    }
    // ── Sinematik renk derecelendirme (haritaya özel ruh) ──
    const _grd = this._grade[this.mapId];
    if (_grd) { ctx.save(); ctx.fillStyle = _grd; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // ── Gün ışığı huzmeleri (açık/gündüz haritalarda süzülen ışık şaftları) ──
    if (this._sunElev() > 0.3 && (this.activeWeather === 'clear' || this.activeWeather === 'wind')) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const _sx = W * 0.7, _sk = H * 0.5;
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.045 - i * 0.006;
        ctx.fillStyle = '#fff2b0';
        const _ox = _sx + i * 46;
        ctx.beginPath();
        ctx.moveTo(_ox, 0); ctx.lineTo(_ox + 56, 0);
        ctx.lineTo(_ox + 56 - _sk, H); ctx.lineTo(_ox - _sk, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // ── Derinlik vinyeti (her harita) ──
    {
      ctx.save();
      const _vg = GradyanDeposu.rad(ctx, W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.95, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.20)']);
      ctx.fillStyle = _vg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Gece karanlığı + vinyet
    const elev = this._sunElev();
    const dark = Math.max(0, -elev);
    if (dark > 0.05 && this.settings.dayNight !== 'off') {
      ctx.save();
      const vg = GradyanDeposu.rad(ctx, W/2, H*0.55, H*0.2, W/2, H*0.55, H*0.9, [0, 'rgba(0,0,10,0)', 1, 'rgba(0,0,14,' + (dark*0.55) + ')']);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Hava efektleri
    if (this.activeWeather === 'rain') {
      this._drawRain(ctx, W, H);
    } else if (this.activeWeather === 'snow') {
      this._drawSnow(ctx, W, H);
    } else if (this.activeWeather === 'fog') {
      this._drawFog(ctx, W, H);
    } else if (this.activeWeather === 'wind') {
      this._drawWind(ctx, W, H);
    }
    // Sıcak haritalarda ısı titremesi (weather clear/wind) — gündüz
    if (this._heatMap[this.mapId] && this._sunElev() > 0.05 && (this.activeWeather === 'clear' || this.activeWeather === 'wind')) {
      this._drawHeatShimmer(ctx, W, H);
    }
    // ── Ek atmosfer ambiyansı (kiraz yaprakları, sürüklenen polen) — hava kapısına bağlı, yalnız görsel ──
    this._drawAmbientExtra(ctx, W, H);
    // ── Nadir gökyüzü olayları (yıldız kayması, kuyruklu yıldız, gökkuşağı, tutulma) — kozmetik, gece/gündüz kapısı ──
    this._drawSkyEvents(ctx, W, H);
    // ── Ek kozmetik ambiyans (nefes alan sürüklenen sis + gece parıltı böcekleri) — yalnız görsel, kendi kendine kurulur, guard'lı ──
    this._drawFogDrift(ctx, W, H);
    this._drawGlowBugs(ctx, W, H);

    // Afet flash (meteor/deprem)
    if (this._flash > 0.01) {
      const _fa = this._flash * 0.25 * this._vfx();   // erişilebilirlik: reducedMotion → daha soluk flash (yalnız görsel)
      ctx.save(); ctx.fillStyle = 'rgba(255,180,120,' + _fa + ')'; ctx.fillRect(0, 0, W, H); ctx.restore();
    }

    // Çığ uyarı oku
    if (this.avalanche) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,40,40,' + (0.5 + 0.5*Math.sin(Date.now()*0.01)) + ')';
      ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('⚠ ÇIĞ! → HIZLAN', 16, H*0.28);
      ctx.restore();
    }

    // ── Ek afet ekran uyarıları / görüş azaltma (yalnız afet modu açıkken) ──
    if (this._on('disasters')) {
      // Kum fırtınası yaklaşınca ekranı toz perdesiyle karart
      if (this.sandWall && this.camera) {
        const sp = this.camera.worldToScreen ? this.camera.worldToScreen(this.sandWall.x, 0) : { x: -1e9 };
        const prox = Math.max(0, 1 - Math.abs(sp.x - W * 0.5) / (W * 0.9));
        if (prox > 0.02) {
          ctx.save();
          ctx.fillStyle = 'rgba(200,150,85,' + (prox * 0.35) + ')';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }
      // Sel / hortum uyarı metni
      if (this.flood || this.tornado) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,60,60,' + (0.5 + 0.5 * Math.sin(Date.now() * 0.01)) + ')';
        ctx.font = 'bold 20px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(this.flood ? '🌊 SEL! → HIZLAN' : '🌪 HORTUM! → KAÇ', 16, H * 0.34);
        ctx.restore();
      }
    }
  },

  // ═══════════════════════════ HAVA ÇİZİM YARDIMCILARI ═══════════════════════════
  // Katmanlı yağmur şeritleri + sıçrama + şimşek parlaması + islak atmosfer
  _drawRain(ctx, W, H) {
    ctx.save();
    // Fırtına karartması (arka plan)
    ctx.fillStyle = 'rgba(18,26,44,0.16)'; ctx.fillRect(0, 0, W, H);
    const sl = this._wind * 0.02 + 60;
    // İki katman: uzak (ince/soluk) ve yakın (kalın/parlak) — derinlik hissi
    ctx.lineCap = 'round';
    const n = this._rain.length;
    ctx.strokeStyle = 'rgba(150,180,225,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i += 2) { const d = this._rain[i]; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - sl*0.05, d.y + d.len*0.7); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(185,210,245,0.55)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 1; i < n; i += 2) { const d = this._rain[i]; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - sl*0.07, d.y + d.len); }
    ctx.stroke();
    // Sıçramalar (yere düşen damla halkaları)
    if (this._splashes && this._splashes.length) {
      ctx.strokeStyle = 'rgba(200,220,250,0.5)'; ctx.lineWidth = 1;
      for (let i = 0; i < this._splashes.length; i++) {
        const s = this._splashes[i];
        ctx.globalAlpha = Math.max(0, s.life * 2.4);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Şimşek: ekran parlaması + kırık çizgi
    if (this._lightning > 0.01) {
      // erişilebilirlik: reducedMotion → tam ekran parlamayı yumuşat (yalnız görsel; çakma mantığı aynı)
      ctx.fillStyle = 'rgba(220,230,255,' + (this._lightning * 0.55 * this._vfx()) + ')';
      ctx.fillRect(0, 0, W, H);
      if (this._lightningBolt) {
        ctx.strokeStyle = 'rgba(245,248,255,' + Math.min(1, this._lightning * 1.4) + ')';
        ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(180,200,255,0.9)'; ctx.shadowBlur = 16;
        const b = this._lightningBolt;
        ctx.beginPath(); ctx.moveTo(b[0].x, b[0].y);
        for (let i = 1; i < b.length; i++) ctx.lineTo(b[i].x, b[i].y);
        ctx.stroke();
        // dallar
        for (let i = 2; i < b.length; i++) {
          if (b[i].branch) { ctx.beginPath(); ctx.moveTo(b[i].x, b[i].y); ctx.lineTo(b[i].x + b[i].branch, b[i].y + 40); ctx.stroke(); }
        }
        ctx.shadowBlur = 0;
      }
    }
    // Zenginleştirilmiş ek: islak zemin cilası + ön plan iri damla şeritleri
    this._drawRainExtra(ctx, W, H);
    ctx.restore();
  },

  // Yumuşak kar + katmanlı kar taneleri + yerde birikim parıltısı
  _drawSnow(ctx, W, H) {
    ctx.save();
    // Zemin birikim parıltısı (alt kenar boyunca hafif ışıltı)
    const accY = H * 0.9;
    const ag = GradyanDeposu.lin(ctx, 0, accY, 0, H, [0, 'rgba(255,255,255,0)', 1, 'rgba(240,248,255,0.22)']);
    ctx.fillStyle = ag; ctx.fillRect(0, accY, W, H - accY);
    // Birikim üzerinde ışıltı pırıltıları
    const _t = Date.now() * 0.004;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 14; i++) {
      const gx = (i * 137.5) % W;
      const tw = 0.5 + 0.5 * Math.sin(_t + i * 1.7);
      ctx.globalAlpha = tw * 0.7;
      ctx.fillRect(gx, accY + (i % 3) * 8 + 4, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;
    // Kar taneleri — boyuta göre bulanıklık (yakın taneler daha büyük/parlak)
    // PERF(31 Tmz): tanelerin yalnizca IKI durumu var (near / uzak). Olcumde
    //   kare basina 21,3 gereksiz globalAlpha + 21,3 gereksiz fillStyle atamasi
    //   cikti. Durum yalniz DEGISTIGINDE atanir; cizilen sey birebir ayni.
    //   ⚠ Tane SAYISI ve SIRASI degismedi (kalite dusmedi).
    let _sonYakin = -1;
    for (const f of this._snow) {
      const near = f.r > 3 ? 1 : 0;
      if (near !== _sonYakin) {
        ctx.globalAlpha = near ? 0.95 : 0.6;
        ctx.fillStyle = near ? 'rgba(255,255,255,0.95)' : 'rgba(230,240,255,0.7)';
        _sonYakin = near;
      }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(220,235,255,0.10)'; ctx.fillRect(0, 0, W, H);
    // Zenginleştirilmiş ek: kar perdeleri + tüylü ön plan taneleri + zemin birikimi
    this._drawSnowExtra(ctx, W, H);
    ctx.restore();
  },

  // Yuvarlanan sis bankaları + katmanlı derinlik sisi
  _drawFog(ctx, W, H) {
    ctx.save();
    const fg = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(200,205,215,0.26)', 0.5, 'rgba(190,196,208,0.16)', 1, 'rgba(180,188,200,0.34)']);
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    // Yuvarlanan bankalar — yumuşak radyal bulutlar
    if (this._fogBanks && (typeof Settings === 'undefined' || !Settings.perfScale || Settings.perfScale() >= 0.5)) {
      for (const b of this._fogBanks) {
        const yy = b.y + Math.sin(b.ph) * 14;
        const rg = ctx.createRadialGradient(b.x, yy, 0, b.x, yy, b.r);
        const a = 0.10 + 0.05 * Math.sin(b.ph * 0.7);
        rg.addColorStop(0, 'rgba(214,220,230,' + a + ')');
        rg.addColorStop(1, 'rgba(214,220,230,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.ellipse(b.x, yy, b.r, b.r * 0.55, 0, 0, 6.28); ctx.fill();
      }
    }
    // Zenginleştirilmiş ek: hacimsel sis tutamları + alçak zemin sisi
    this._drawFogExtra(ctx, W, H);
    ctx.restore();
  },

  // Rüzgar çizgileri + sürüklenen moloz/kum fırtınası hazesi
  _drawWind(ctx, W, H) {
    ctx.save();
    // Kum fırtınası hazesi — çöl/mars gibi haritalarda kızıl-kahve perde
    if (this._sandstorm) {
      const sg = ctx.createLinearGradient(0, 0, W, 0);
      const sw = this._wind >= 0 ? 0.30 : 0;
      sg.addColorStop(0, 'rgba(200,150,80,' + (0.10 + sw*0.12) + ')');
      sg.addColorStop(0.5, 'rgba(210,160,90,0.14)');
      sg.addColorStop(1, 'rgba(200,150,80,' + (0.10 + (0.30-sw)*0.12) + ')');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    }
    // Rüzgar akış çizgileri
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const off = (Date.now() * 0.4) % 200;
    const sgn = Math.sign(this._wind || 1);
    for (let i = 0; i < 9; i++) { const y = (i * H/9 + off) % H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 30 * sgn); ctx.stroke(); }
    // Sürüklenen moloz / kum zerreleri
    if (this._debris && this._debris.length) {
      for (const p of this._debris) {
        if (p.leaf) {
          ctx.fillStyle = 'rgba(150,110,60,0.55)';
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ph);
          ctx.beginPath(); ctx.ellipse(0, 0, p.r * 2.2, p.r * 1.1, 0, 0, 6.28); ctx.fill();
          ctx.restore();
        } else {
          ctx.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(p.ph));
          ctx.fillStyle = this._sandstorm ? 'rgba(215,180,120,0.7)' : 'rgba(230,230,235,0.55)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    // Zenginleştirilmiş ek: uçuşan rüzgar şeritleri + dönen yapraklar
    this._drawWindExtra(ctx, W, H);
    ctx.restore();
  },

  // Isı titremesi — sıcak zeminden yükselen dalgalı sıcaklık bandı (gündüz, sıcak haritalar)
  _drawHeatShimmer(ctx, W, H) {
    if (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.5) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const t = Date.now() * 0.003;
    const baseY = H * 0.72;
    for (let i = 0; i < 5; i++) {
      const y = baseY + i * (H * 0.05);
      const a = 0.05 * (1 - i / 6);
      ctx.strokeStyle = 'rgba(255,220,170,' + a + ')';
      ctx.lineWidth = 3 + i;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const yy = y + Math.sin(x * 0.02 + t * 2 + i) * (4 + i * 1.5) + Math.sin(x * 0.05 + t * 3) * 2;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  // Gece ateşböcekleri — yumuşak nabız gibi yanıp sönen sıcak ışık noktaları (organik haritalar)
  _drawFireflies(ctx, W, H) {
    if (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.5) return;
    if (!this._fireflies) {
      this._fireflies = [];
      const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
      const n = Math.max(6, Math.round(20 * ps * this._vfx()));   // erişilebilirlik: daha az ateşböceği (yalnız görsel)
      for (let i = 0; i < n; i++) this._fireflies.push({
        x: Math.random() * W, y: H * (0.30 + Math.random() * 0.6), ph: Math.random() * 6.28,
        vx: (Math.random() * 2 - 1) * 8, vy: (Math.random() * 2 - 1) * 6,
        r: 1.2 + Math.random() * 1.6, sp: 0.6 + Math.random() * 1.2
      });
    }
    const now = Date.now();
    if (this._ffLast === undefined) this._ffLast = now;
    let dt = (now - this._ffLast) / 1000; this._ffLast = now;
    if (dt > 0.1) dt = 0.1;
    const col = this.mapId === 'toxic' ? '190,255,90' : (this.mapId === 'cave' ? '150,180,255' : '190,255,120');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this._fireflies) {
      f.ph += dt * f.sp * 2.2;
      f.x += f.vx * dt + Math.sin(f.ph) * 4 * dt;
      f.y += f.vy * dt + Math.cos(f.ph * 0.7) * 4 * dt;
      if (f.x < 0) f.x += W; else if (f.x > W) f.x -= W;
      if (f.y < H * 0.25) f.y = H * 0.25; else if (f.y > H * 0.95) f.y = H * 0.95;
      const pulse = 0.5 + 0.5 * Math.sin(f.ph);
      const a = pulse * pulse;
      this._zerre(ctx, f.x, f.y, f.r * 5, 'rgba(' + col + ',1)', 'rgba(' + col + ',0)', a * 0.8);
      ctx.fillStyle = 'rgba(255,255,235,' + (a * 0.9) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.6, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },

  // ── Nefes alan sürüklenen sis bankaları — zamanla yavaşça koyulaşıp incelen yumuşak bulutlar ──
  // Yalnız görsel/kozmetik: hiçbir afet/engel/hasar mantığını değiştirmez. activeWeather 'fog'/'clear'
  // kapısına bağlı (mevcut hava/afet gating'i değişmez), kendi kendine kurulur, _vfx/perfScale ile ölçekli.
  _drawFogDrift(ctx, W, H) {
    if (this.activeWeather !== 'fog' && this.activeWeather !== 'clear') return;
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps < 0.5) return;
    const dt = this._wxDt('_fogDriftLast');
    if (!this._fogDrift) {
      this._fogDrift = [];
      const n = Math.max(2, Math.round(4 * ps * this._vfx()));   // erişilebilirlik: daha az banka (yalnız görsel)
      for (let i = 0; i < n; i++) this._fogDrift.push({
        x: Math.random() * W, y: H * (0.42 + Math.random() * 0.4),
        r: 160 + Math.random() * 220, v: (Math.random() * 2 - 1) * (5 + Math.random() * 10),
        ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.4
      });
      this._fogDriftPulse = Math.random() * 6.28;
    }
    // Genel nefes: yoğunluk yavaşça koyulaşıp incelir (~14 sn periyot)
    this._fogDriftPulse += dt * 0.45;
    const breathe = 0.5 + 0.5 * Math.sin(this._fogDriftPulse);   // 0..1
    // clear havada çok daha soluk (sahneyi/afet ambiyansını bastırmasın), fog'da biraz belirgin
    const baseA = (this.activeWeather === 'fog' ? 0.09 : 0.035) * this._vfx();
    ctx.save();
    for (const b of this._fogDrift) {
      b.ph += dt * b.sp;
      b.x += (b.v + this._wind * 0.03) * dt;
      b.y += Math.sin(b.ph) * 4 * dt;
      if (b.x - b.r > W + 60) b.x = -b.r - 60; else if (b.x + b.r < -60) b.x = W + b.r + 60;
      const a = baseA * (0.4 + 0.6 * breathe) * (0.7 + 0.3 * Math.sin(b.ph * 0.8));
      if (a <= 0.002) continue;
      const yy = b.y + Math.sin(b.ph) * 10;
      const rg = GradyanDeposu.rad(ctx, b.x, yy, 0, b.x, yy, b.r, [0, 'rgba(210,216,226,' + a + ')', 1, 'rgba(210,216,226,0)']);
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.ellipse(b.x, yy, b.r, b.r * 0.5, 0, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },

  // ── Gece parıltı böcekleri / ateşböceği ambiyansı — yeşil/kırsal haritalarda ──
  // Yalnız görsel/kozmetik. Guard: gece kapısı + yeşil harita listesi. Mevcut _drawFireflies
  // haritalarıyla (jungle/swamp/toxic/cave) ÇAKIŞMAZ (çift çizim olmasın). _vfx/perfScale ölçekli.
  _glowBugMap: { countryside:true, meadow:true, forest:true, highland:true, hills:true, valley:true, grassland:true, spring:true, farm:true },
  _drawGlowBugs(ctx, W, H) {
    if (!this._glowBugMap[this.mapId]) return;
    if (this._sunElev() >= -0.1) return;                                          // yalnız gece
    if (this.activeWeather === 'rain' || this.activeWeather === 'snow') return;   // sağanak/kar sırasında gizli
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps < 0.5) return;
    const dt = this._wxDt('_glowBugLast');
    if (!this._glowBugs) {
      this._glowBugs = [];
      const n = Math.max(5, Math.round(16 * ps * this._vfx()));   // erişilebilirlik: daha az böcek (yalnız görsel)
      for (let i = 0; i < n; i++) this._glowBugs.push({
        x: Math.random() * W, y: H * (0.4 + Math.random() * 0.52), ph: Math.random() * 6.28,
        vx: (Math.random() * 2 - 1) * 7, vy: (Math.random() * 2 - 1) * 5,
        r: 1 + Math.random() * 1.5, sp: 0.5 + Math.random() * 1.1, blink: Math.random() * 6.28
      });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this._glowBugs) {
      f.ph += dt * f.sp * 2;
      f.blink += dt * (0.8 + f.sp);
      f.x += f.vx * dt + Math.sin(f.ph) * 5 * dt;
      f.y += f.vy * dt + Math.cos(f.ph * 0.6) * 4 * dt;
      if (f.x < 0) f.x += W; else if (f.x > W) f.x -= W;
      if (f.y < H * 0.3) f.y = H * 0.3; else if (f.y > H * 0.95) f.y = H * 0.95;
      // lightning-bug flaşı: uzun karanlık + kısa parlak çakma (üstel keskinleştirme)
      const bl = Math.max(0, Math.sin(f.blink));
      const a = bl * bl * bl;
      if (a <= 0.01) continue;
      this._zerre(ctx, f.x, f.y, f.r * 6, 'rgba(200,255,120,1)', 'rgba(200,255,120,0)', a * 0.7);
      ctx.fillStyle = 'rgba(240,255,200,' + (a * 0.85) + ')';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.7, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },

  // ═══════════════════ ZENGİNLEŞTİRİLMİŞ HAVA KATMANLARI (ek görsel) ═══════════════════
  // Çizim zamanı yönetilen küçük delta (her yardımcı için ayrı zaman damgası anahtarı)
  _wxDt(key) {
    const now = Date.now();
    if (this[key] === undefined) this[key] = now;
    let dt = (now - this[key]) / 1000; this[key] = now;
    return dt > 0.1 ? 0.1 : (dt < 0 ? 0 : dt);
  },

  // Yağmur eki: islak zemin cilası (yansıma + şimşek yansıması) + ön plan iri damla şeritleri
  _drawRainExtra(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_rainExtraLast');
    const groundY = H * 0.86;
    ctx.save();
    // Islak zemin parlaklığı — alt bölgede cilalı yansıma bandı
    const sheen = GradyanDeposu.lin(ctx, 0, groundY, 0, H, [0, 'rgba(120,150,200,0)', 0.4, 'rgba(90,120,170,0.10)', 1, 'rgba(150,180,230,0.20)']);
    ctx.fillStyle = sheen; ctx.fillRect(0, groundY, W, H - groundY);
    // Şimşek yansıması — zemin bir an aydınlanır
    if (this._lightning > 0.05) {
      ctx.fillStyle = 'rgba(210,225,255,' + (this._lightning * 0.18) + ')';
      ctx.fillRect(0, groundY, W, H - groundY);
    }
    // Kayan yatay parıltı çizgileri (ıslak yüzey titreşimi)
    const t = Date.now() * 0.0016;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const yy = groundY + (H - groundY) * (0.2 + i * 0.16);
      const a = 0.05 + 0.05 * Math.sin(t * 2 + i);
      ctx.strokeStyle = 'rgba(190,215,255,' + Math.max(0, a) + ')';
      ctx.lineWidth = 1 + (i % 2);
      const xoff = ((t * 60 + i * 90) % (W + 200)) - 100;
      ctx.beginPath(); ctx.moveTo(xoff, yy); ctx.lineTo(xoff + 120, yy); ctx.stroke();
    }
    ctx.restore();
    if (ps < 0.5) return;
    // Ön plan iri damla şeritleri — hareket bulanıklığıyla derinlik
    if (!this._rainFore) {
      this._rainFore = [];
      const fn = Math.round(26 * ps * this._vfx());   // erişilebilirlik: daha az ön plan damla (yalnız görsel)
      for (let i = 0; i < fn; i++) this._rainFore.push({ x: Math.random()*W, y: Math.random()*H, v: 1200+Math.random()*700, len: 26+Math.random()*22, w: 1.4+Math.random()*1.6 });
    }
    const slant = this._wind * 0.03 + 80;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(205,225,255,0.5)';
    for (const d of this._rainFore) {
      d.y += d.v * dt; d.x -= slant * dt * 0.5;
      if (d.y > H) { d.y = -d.len; d.x = Math.random()*W; }
      if (d.x < 0) d.x += W;
      ctx.lineWidth = d.w;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - slant*0.09, d.y + d.len); ctx.stroke();
    }
    ctx.restore();
  },

  // Kar eki: sürüklenen kar perdeleri + ön plan tüylü/odak dışı iri taneler + zemin birikim tümsekleri
  _drawSnowExtra(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_snowExtraLast');
    ctx.save();
    // Sürüklenen kar örtüsü perdeleri (yumuşak, saydam bantlar)
    const t = Date.now() * 0.0004;
    for (let i = 0; i < 3; i++) {
      const yy = H * (0.2 + i * 0.28);
      const vg = ctx.createLinearGradient(0, yy - 40, 0, yy + 60);
      const a = 0.04 + 0.03 * Math.sin(t * 3 + i);
      vg.addColorStop(0, 'rgba(240,248,255,0)');
      vg.addColorStop(0.5, 'rgba(240,248,255,' + Math.max(0, a) + ')');
      vg.addColorStop(1, 'rgba(240,248,255,0)');
      ctx.fillStyle = vg; ctx.fillRect(0, yy - 40, W, 100);
    }
    // Zemin birikim tümsekleri — hafif kabarık kar örtüsü silueti
    const baseY = H * 0.93;
    ctx.fillStyle = 'rgba(245,250,255,0.16)';
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 40) {
      const yy = baseY - 6 * Math.sin(x * 0.02) - 4 * Math.sin(x * 0.006 + 1.5);
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (ps < 0.5) return;
    // Ön plan tüylü iri taneler — yumuşak radyal gradyanla derinlik
    if (!this._snowFore) {
      this._snowFore = [];
      const fn = Math.round(18 * ps * this._vfx());   // erişilebilirlik: daha az ön plan kar tanesi (yalnız görsel)
      for (let i = 0; i < fn; i++) this._snowFore.push({ x: Math.random()*W, y: Math.random()*H, v: 60+Math.random()*70, r: 5+Math.random()*7, ph: Math.random()*6.28 });
    }
    ctx.save();
    for (const f of this._snowFore) {
      f.ph += dt * 1.6;
      f.y += f.v * dt; f.x += Math.sin(f.ph) * 26 * dt + this._wind * 0.015;
      if (f.y > H + f.r) { f.y = -f.r; f.x = Math.random()*W; }
      if (f.x < -f.r) f.x += W + f.r*2; else if (f.x > W + f.r) f.x -= W + f.r*2;
      this._zerre(ctx, f.x, f.y, f.r, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)', 0.55);
    }
    ctx.restore();
  },

  // Sis eki: hacimsel sürüklenen sis tutamları + dipte yoğunlaşan alçak zemin sisi
  _drawFogExtra(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps < 0.5) return;
    const dt = this._wxDt('_fogExtraLast');
    if (!this._fogWisps) {
      this._fogWisps = [];
      const n = Math.round(7 * ps * this._vfx());   // erişilebilirlik: daha az sis tutamı (yalnız görsel)
      for (let i = 0; i < n; i++) this._fogWisps.push({ x: Math.random()*W, y: H*(0.55+Math.random()*0.4), r: 90+Math.random()*130, v: 6+Math.random()*14, ph: Math.random()*6.28, dir: Math.random()<0.5?1:-1 });
    }
    ctx.save();
    const dir = this._wind >= 0 ? 1 : -1;
    for (const w of this._fogWisps) {
      w.ph += dt * 0.5;
      w.x += (w.v + Math.abs(this._wind) * 0.04) * (dir * w.dir) * dt;
      if (w.x - w.r > W + 60) w.x = -w.r - 60; else if (w.x + w.r < -60) w.x = W + w.r + 60;
      const yy = w.y + Math.sin(w.ph) * 10;
      const a = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(w.ph * 1.3));
      const rg = GradyanDeposu.rad(ctx, w.x, yy, 0, w.x, yy, w.r, [0, 'rgba(225,230,238,' + a + ')', 1, 'rgba(225,230,238,0)']);
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.ellipse(w.x, yy, w.r, w.r * 0.42, 0, 0, 6.28); ctx.fill();
    }
    // Alçak zemin sisi — dipte yoğunlaşan yavaş nabızlı şerit
    const t = Date.now() * 0.0003;
    const gy = H * 0.8;
    const lg = GradyanDeposu.lin(ctx, 0, gy, 0, H, [0, 'rgba(210,216,226,0)', 1, 'rgba(210,216,226,' + (0.16 + 0.05 * Math.sin(t*4)) + ')']);
    ctx.fillStyle = lg; ctx.fillRect(0, gy, W, H - gy);
    ctx.restore();
  },

  // Rüzgar eki: uçuşan kavisli rüzgar şeritleri + dönerek sürüklenen ek yapraklar
  _drawWindExtra(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_windExtraLast');
    const sgn = Math.sign(this._wind || 1);
    const spd = 220 + Math.abs(this._wind) * 1.2;
    // Uçuşan rüzgar şeritleri (hızlı, eğik, saydam kavisli çizgiler)
    if (!this._windStreaks) {
      this._windStreaks = [];
      const n = Math.round(14 * ps * this._vfx());   // erişilebilirlik: daha az rüzgar şeridi (yalnız görsel)
      for (let i = 0; i < n; i++) this._windStreaks.push({ x: Math.random()*W, y: Math.random()*H, len: 60+Math.random()*120, a: 0.05+Math.random()*0.10, curve: (Math.random()*2-1)*20 });
    }
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this._windStreaks) {
      s.x += -sgn * spd * dt * (0.6 + s.a * 3);
      if (-sgn > 0) { if (s.x > W + s.len) { s.x = -s.len; s.y = Math.random()*H; } }
      else { if (s.x < -s.len) { s.x = W + s.len; s.y = Math.random()*H; } }
      ctx.strokeStyle = 'rgba(255,255,255,' + s.a + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.quadraticCurveTo(s.x + sgn * s.len * 0.5, s.y + s.curve, s.x + sgn * s.len, s.y);
      ctx.stroke();
    }
    ctx.restore();
    if (ps < 0.5) return;
    // Ek uçuşan yapraklar (dönerek sürüklenen renkli yapraklar)
    if (!this._windLeaves) {
      this._windLeaves = [];
      const n = Math.round(10 * ps * this._vfx());   // erişilebilirlik: daha az uçuşan yaprak (yalnız görsel)
      const cols = ['180,120,50','150,100,45','200,150,70','120,140,60'];
      for (let i = 0; i < n; i++) this._windLeaves.push({ x: Math.random()*W, y: Math.random()*H, ph: Math.random()*6.28, r: 3+Math.random()*3, sp: 0.8+Math.random()*1.4, col: cols[i % cols.length] });
    }
    ctx.save();
    for (const l of this._windLeaves) {
      l.ph += dt * l.sp * 3;
      l.x += -sgn * spd * dt * (0.7 + l.sp * 0.2);
      l.y += Math.sin(l.ph) * 40 * dt;
      if (-sgn > 0) { if (l.x > W + 20) { l.x = -20; l.y = Math.random()*H; } }
      else { if (l.x < -20) { l.x = W + 20; l.y = Math.random()*H; } }
      if (l.y < -20) l.y = H + 20; else if (l.y > H + 20) l.y = -20;
      ctx.save();
      ctx.translate(l.x, l.y); ctx.rotate(l.ph);
      ctx.fillStyle = 'rgba(' + l.col + ',' + (0.4 + 0.3 * Math.abs(Math.sin(l.ph))) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, l.r * 2, l.r, 0, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ═══════════════════ EK ATMOSFER AMBİYANSI (kiraz yaprakları + polen) ═══════════════════
  // Tümü YALNIZ görsel: hiçbir fizik/afet/hasar mantığını değiştirmez. Hava kapısına (activeWeather)
  // bağlı ve haritaya özel; reducedMotion/perfScale ile ölçekli (_vfx). Kendi kendine kurulan havuzlar.
  _petalMap:  { candy:true, sakura:true, spring:true, cherry:true, countryside:true, beach:true },
  _pollenMap: { jungle:true, swamp:true, highland:true, meadow:true, forest:true, countryside:true },
  _sporeMap:  { swamp:true, toxic:true, cave:true, jungle:true, underwater:true, forest:true },  // mantar/nemli haritalar → süzülen sporlar
  _emberMap:  { volcano:true, mars:true, hotwheels:true, wasteland:true },                        // lav/volkanik haritalar → yükselen közler
  _drawAmbientExtra(ctx, W, H) {
    // Yalnız sakin havada (clear/wind) süzülen ambiyans — yağmur/kar/sis sırasında gizli
    if (this.activeWeather !== 'clear' && this.activeWeather !== 'wind') return;
    if (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.4) return;
    if (this._petalMap[this.mapId]) this._drawPetals(ctx, W, H);
    if (this._pollenMap[this.mapId] && this._sunElev() > -0.1) this._drawPollen(ctx, W, H);
    if (this._sporeMap[this.mapId]) this._drawSpores(ctx, W, H);   // mantar sporları (loş/nemli haritalar)
    if (this._emberMap[this.mapId]) this._drawEmbers(ctx, W, H);   // yükselen közler (volkan/lav haritalar)
  },

  // Düşen kiraz çiçeği yaprakları — sallanarak süzülen pembe yapraklar (sakura benzeri haritalar)
  _drawPetals(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_petalLast');
    if (!this._petals) {
      this._petals = [];
      const n = Math.round(22 * ps * this._vfx());   // erişilebilirlik: daha az yaprak (yalnız görsel)
      for (let i = 0; i < n; i++) this._petals.push({
        x: Math.random()*W, y: Math.random()*H, ph: Math.random()*6.28,
        vy: 22 + Math.random()*26, r: 3 + Math.random()*3.5, sp: 0.7 + Math.random()*1.3,
        sway: 24 + Math.random()*30, spin: Math.random()*6.28, vspin: (Math.random()*2-1)*2, hue: Math.random()
      });
    }
    const drift = this._wind * 0.02;
    ctx.save();
    for (const p of this._petals) {
      p.ph += dt * p.sp * 1.8;
      p.spin += p.vspin * dt;
      p.x += Math.sin(p.ph) * p.sway * dt + drift;
      p.y += p.vy * dt;
      if (p.y > H + 8) { p.y = -8; p.x = Math.random()*W; }
      if (p.x < -8) p.x = W + 8; else if (p.x > W + 8) p.x = -8;
      const g = 150 + (p.hue*50|0), b = 190 + (p.hue*40|0);
      ctx.fillStyle = 'rgba(255,' + g + ',' + b + ',' + (0.5 + 0.25*Math.abs(Math.sin(p.ph))) + ')';
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.spin);
      const sc = 0.55 + 0.5*Math.abs(Math.cos(p.ph));   // dönerken incelip kalınlaşma yanılsaması
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 1.9 * sc, 0, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // Sürüklenen polen — yumuşak parıldayan altın-yeşil zerreler (organik/bahar haritaları, gündüz)
  _drawPollen(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_pollenLast');
    if (!this._pollen) {
      this._pollen = [];
      const n = Math.round(26 * ps * this._vfx());   // erişilebilirlik: daha az polen (yalnız görsel)
      for (let i = 0; i < n; i++) this._pollen.push({
        x: Math.random()*W, y: Math.random()*H, ph: Math.random()*6.28,
        r: 0.8 + Math.random()*1.8, sp: 0.4 + Math.random()*1.0,
        vx: (Math.random()*2-1)*6, vy: -3 - Math.random()*6
      });
    }
    const drift = this._wind * 0.015;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this._pollen) {
      p.ph += dt * p.sp * 2;
      p.x += (p.vx + drift) * dt + Math.sin(p.ph) * 8 * dt;
      p.y += p.vy * dt + Math.cos(p.ph*0.6) * 4 * dt;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random()*W; }
      if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
      const a = 0.22 + 0.32 * (0.5 + 0.5*Math.sin(p.ph));
      // Sprite onbellegi: gradient uretimi YOK (bkz. _zerre)
      this._zerre(ctx, p.x, p.y, p.r*4, 'rgba(238,242,150,1)', 'rgba(200,230,120,0)', a);
    }
    ctx.restore();
  },

  // Süzülen mantar sporları — yavaşça alçalıp savrulan soluk parıltılı zerreler (nemli/loş haritalar)
  _drawSpores(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_sporeLast');
    if (!this._spores) {
      this._spores = [];
      const n = Math.round(20 * ps * this._vfx());   // erişilebilirlik: daha az spor (yalnız görsel)
      for (let i = 0; i < n; i++) this._spores.push({
        x: Math.random()*W, y: Math.random()*H, ph: Math.random()*6.28,
        r: 0.7 + Math.random()*1.6, sp: 0.3 + Math.random()*0.8,
        vy: 5 + Math.random()*9, sway: 10 + Math.random()*16
      });
    }
    const drift = this._wind * 0.012;
    const col = this._moteCol[this.mapId] || '#9fe0b0';   // haritaya özel ton (yoksa soluk yeşil)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this._spores) {
      p.ph += dt * p.sp * 1.6;
      p.x += (Math.sin(p.ph) * p.sway + drift) * dt;
      p.y += p.vy * dt;                                // sporlar yavaşça alçalır
      if (p.y > H + 6) { p.y = -6; p.x = Math.random()*W; }
      if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
      const a = 0.14 + 0.24 * (0.5 + 0.5*Math.sin(p.ph));
      this._zerre(ctx, p.x, p.y, p.r*4.5, this._rgbaFromHex(col, 1), this._rgbaFromHex(col, 0), a);
    }
    ctx.restore();
  },

  // Yükselen közler — sıcak hava akımıyla yukarı süzülen kırpışan turuncu-kızıl zerreler (volkan/lav)
  _drawEmbers(ctx, W, H) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const dt = this._wxDt('_emberLast');
    if (!this._embers) {
      this._embers = [];
      const n = Math.round(22 * ps * this._vfx());   // erişilebilirlik: daha az köz (yalnız görsel)
      for (let i = 0; i < n; i++) this._embers.push({
        x: Math.random()*W, y: Math.random()*H, ph: Math.random()*6.28,
        r: 0.8 + Math.random()*1.7, sp: 0.6 + Math.random()*1.4,
        vy: -14 - Math.random()*22, sway: 14 + Math.random()*22, hot: Math.random()
      });
    }
    const drift = this._wind * 0.02;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this._embers) {
      p.ph += dt * p.sp * 2.4;
      p.x += (Math.sin(p.ph) * p.sway + drift) * dt;
      p.y += p.vy * dt;                                // közler sıcak akımla yükselir
      if (p.y < -6) { p.y = H + 6; p.x = Math.random()*W; p.hot = Math.random(); }
      if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
      const flick = 0.5 + 0.5*Math.sin(p.ph*2.3);      // kırpışma
      const a = (0.22 + 0.4 * flick) * (0.5 + 0.5*p.hot);
      const g = 90 + (p.hot*110|0) + (flick*40|0);      // sarıya doğru kırpışan sıcaklık
      this._zerre(ctx, p.x, p.y, p.r*4, 'rgba(255,' + Math.min(230, g) + ',60,1)', 'rgba(255,80,20,0)', a);
    }
    ctx.restore();
  },

  // Küçük yardımcı: '#rrggbb' → 'rgba(r,g,b,a)' (spor tonlarını haritaya göre yeniden renklendirir; yalnız görsel)
  _rgbaFromHex(hex, a) {
    let r = 159, g = 224, b = 176;   // güvenli varsayılan (soluk yeşil)
    if (typeof hex === 'string' && hex[0] === '#' && hex.length >= 7) {
      r = parseInt(hex.slice(1,3), 16); g = parseInt(hex.slice(3,5), 16); b = parseInt(hex.slice(5,7), 16);
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  },

  // ═══════════════════ EK TELGRAFLI AFETLER (toz şeytanı + dolu fırtınası) ═══════════════════
  // Yalnız afet modu kapısı (_on('disasters')) içinden çağrılır. Yeni tehlikelerdir; mevcut afet
  // mantığına/gating'ine dokunmaz. Toz şeytanı iter (öldürmez); dolu peçe halinde sarsar (öldürmez).
  _updateExtraHazards(dt, v, terrain, camera, diff) {
    if (!v || v.dead) return;
    const _vw = this._W() / (camera.zoom || 1);

    // ── Toz şeytanı (dust devil) — küçük gezici toz hunisi: yanından geçerken aracı yumuşakça iter + hafif sallar ──
    if (!this.dustDevils) this.dustDevils = [];
    if (this._dustDevilCd === undefined) this._dustDevilCd = 20 + Math.random() * 16;
    this._dustDevilCd -= dt * diff;
    if (this._dustDevilCd <= 0 && this.dustDevils.length < 2) {
      this._dustDevilCd = (22 + Math.random() * 18) / diff;
      const side = Math.random() < 0.5 ? -1 : 1;
      const dsx = v.x + side * (_vw * 0.5 + 200);
      const dgy = terrain && terrain.getYAt ? terrain.getYAt(dsx) : v.y;
      this.dustDevils.push({ x: dsx, gy: dgy, dir: -side, spd: 90 + Math.random() * 70, life: 8 + Math.random() * 5, ph: Math.random() * 6.28, wob: Math.random() * 6.28 });
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🌀 TOZ ŞEYTANI!');
    }
    for (let i = this.dustDevils.length - 1; i >= 0; i--) {
      const d = this.dustDevils[i];
      d.life -= dt; d.ph += dt * 6; d.wob += dt * 1.3;
      d.x += (d.dir * d.spd + Math.sin(d.wob) * 30) * dt;                     // savrularak ilerler
      d.gy = terrain && terrain.getYAt ? terrain.getYAt(d.x) : d.gy;
      const ddx = v.x - d.x, adist = Math.abs(ddx);
      if (adist < 120) {
        const push = 1 - adist / 120;
        v.vx += Math.sign(ddx || 1) * 150 * push * dt * diff;                // yumuşak itme (öldürmez)
        if (!v.onGround) v.vy -= 90 * push * dt * diff;                      // havadaysa hafif kaldırır
        if (Math.random() < 0.3) this._shake(2 * push);
      }
      if (d.life <= 0 || d.x < camera.x - 700 || d.x > camera.x + _vw + 900) this.dustDevils.splice(i, 1);
    }

    // ── Dolu fırtınası (hailstorm) — telgraflı sağanak: gökten çok sayıda küçük dolu tanesi peçe halinde düşer ──
    // Öldürmez; araca değince küçük sarsıntı + minik itki. (Büyük ölümcül buz kütleleri zaten ayrı bir afet.)
    if (!this.hail) this.hail = [];
    if (this._hailCd === undefined) this._hailCd = 30 + Math.random() * 20;
    if (!this._hailStorm) {
      this._hailCd -= dt * diff;
      if (this._hailCd <= 0) {
        this._hailStorm = { warn: 1.3, t: 0, life: 6 + Math.random() * 4, phase: 0, spawn: 0 };
        this._hailCd = (34 + Math.random() * 22) / diff;
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🌨 DOLU FIRTINASI!');
      }
    } else {
      const hs = this._hailStorm;
      hs.t += dt;
      if (hs.phase === 0) {
        if (hs.t >= hs.warn) { hs.phase = 1; hs.t = 0; }                     // telgraf → sağanak
      } else {
        hs.spawn -= dt;
        while (hs.spawn <= 0 && this.hail.length < 90) {
          hs.spawn += 0.03;
          const hx = v.x + (Math.random() * 2 - 1) * (_vw * 0.7 + 200);
          const hgy = terrain && terrain.getYAt ? terrain.getYAt(hx) : v.y;
          this.hail.push({ x: hx, y: camera.y - 60 - Math.random() * 200, vx: -40 - Math.random() * 60, vy: 260 + Math.random() * 160, gy: hgy, r: 2 + Math.random() * 3, bounce: 0, dead: false });
        }
        if (hs.t >= hs.life) this._hailStorm = null;
      }
    }
    for (let i = this.hail.length - 1; i >= 0; i--) {
      const h = this.hail[i];
      h.vy += 620 * dt; h.x += h.vx * dt; h.y += h.vy * dt;
      if (Math.abs(v.x - h.x) < (v.width || 100) * 0.5 + h.r && Math.abs(v.y - h.y) < (v.height || 40) * 0.5 + h.r) {
        v.vx += h.vx * 0.02; v.vy += 12;                                     // minik itki (öldürmez)
        if (Math.random() < 0.25) this._shake(1.5);
        h.dead = true;
      } else if (h.y >= h.gy - h.r) {
        h.y = h.gy - h.r;
        if (h.bounce < 1 && h.vy > 60) { h.vy = -h.vy * 0.32; h.vx *= 0.5; h.bounce++; }  // yerden bir sekme
        else h.dead = true;
      }
      if (h.dead || h.x < camera.x - 700) this.hail.splice(i, 1);
    }

    // ── Yuvarlanan çalı (tumbleweed) — telgraflı, öldürmez tehlike: zeminde yuvarlanıp araca çarpınca hafifçe iter + sarsar ──
    // Rüzgârla önden gelir; çarpışma yalnız küçük bir itki + sarsıntı üretir (asla _kill çağırmaz, hasar vermez).
    if (!this.tumbleweeds) this.tumbleweeds = [];
    if (this._tumbleCd === undefined) this._tumbleCd = 16 + Math.random() * 14;
    this._tumbleCd -= dt * diff;
    if (this._tumbleCd <= 0 && this.tumbleweeds.length < 3) {
      this._tumbleCd = (18 + Math.random() * 16) / diff;
      const dir = (this._wind >= 0) ? 1 : -1;                              // rüzgâr yönünde yuvarlanır
      const tsx = v.x - dir * (_vw * 0.5 + 240);                          // ekranın rüzgâr-üstü kenarından girer
      const tgy = terrain && terrain.getYAt ? terrain.getYAt(tsx) : v.y;
      const tr = 20 + Math.random() * 14;
      this.tumbleweeds.push({ x: tsx, gy: tgy, r: tr, dir: dir, spd: 150 + Math.random() * 120, ang: 0, life: 12 + Math.random() * 6, bob: Math.random() * 6.28 });
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🌾 YUVARLANAN ÇALI!');
    }
    for (let i = this.tumbleweeds.length - 1; i >= 0; i--) {
      const t = this.tumbleweeds[i];
      t.life -= dt; t.bob += dt * 5;
      const spd = t.spd + Math.abs(this._wind) * 0.4;                      // rüzgâr hızlandırır
      t.x += t.dir * spd * dt;
      t.ang += (t.dir * spd / Math.max(8, t.r)) * dt;                      // yuvarlanma dönüşü (görsel)
      t.gy = terrain && terrain.getYAt ? terrain.getYAt(t.x) : t.gy;
      const tdx = v.x - t.x, tdy = (v.y) - (t.gy - t.r);
      if (Math.abs(tdx) < (v.width || 100) * 0.5 + t.r && Math.abs(tdy) < (v.height || 40) * 0.5 + t.r + 12) {
        const s = Math.sign(tdx || t.dir);
        v.vx += -s * 90 * dt * diff;                                       // araca küçük itki (öldürmez)
        if (!v.onGround) v.vy -= 40 * dt * diff;                           // havadaysa hafifçe zıplatır
        if (Math.random() < 0.25) this._shake(2);
        t.spd *= 0.985;                                                    // çarpışmada yavaşça enerji kaybı
      }
      if (t.life <= 0 || t.x < camera.x - 800 || t.x > camera.x + _vw + 1000) this.tumbleweeds.splice(i, 1);
    }
  },

  // Ek afet çizimleri (dünya-uzayı; afet kapısı içinde çağrılır)
  _drawExtraHazards(ctx, camera) {
    if (this.dustDevils && this.dustDevils.length) { for (const d of this.dustDevils) this._drawDustDevil(ctx, d); }
    if (this.hail && this.hail.length) { for (const h of this.hail) this._drawHail(ctx, h); }
    if (this.tumbleweeds && this.tumbleweeds.length) { for (const t of this.tumbleweeds) this._drawTumbleweed(ctx, t); }
  },

  // Toz şeytanı — ince dönen toz hunisi (tornadodan küçük ve saydam)
  _drawDustDevil(ctx, d) {
    const gy = d.gy;
    const topY = gy - 200;
    ctx.save();
    const lowPerf = (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.6);
    const layers = lowPerf ? 6 : 12;
    const t = d.ph;
    const fade = Math.min(1, d.life);
    for (let i = 0; i <= layers; i++) {
      const f = i / layers;                             // 0 üst, 1 taban
      const yy = topY + f * (gy - topY);
      const rad = 6 + f * 26;                           // aşağı doğru genişler
      const cx = d.x + Math.sin(t + f * 4) * 10 * (0.4 + f);
      ctx.globalAlpha = (0.10 + f * 0.10) * fade;
      ctx.fillStyle = f < 0.5 ? 'rgba(200,175,130,0.8)' : 'rgba(170,145,105,0.85)';
      ctx.beginPath(); ctx.ellipse(cx, yy, rad, rad * 0.34, 0, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = 'rgba(190,165,120,0.6)';
    for (let i = 0; i < 5; i++) { const bx = d.x + (Math.random() * 2 - 1) * 34; ctx.beginPath(); ctx.arc(bx, gy - Math.random() * 12, 8 + Math.random() * 12, 0, 6.28); ctx.fill(); }
    ctx.restore();
  },

  // Dolu tanesi — küçük parlak buz küresi (parıltı vurgusu)
  _drawHail(ctx, h) {
    ctx.save();
    const g = GradyanDeposu.rad(ctx, h.x - h.r*0.3, h.y - h.r*0.3, 0, h.x, h.y, h.r, [0, 'rgba(255,255,255,0.95)', 1, 'rgba(190,220,240,0.85)']);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.28); ctx.fill();
    ctx.restore();
  },

  // Yuvarlanan çalı — kuru dalların ördüğü dönen küre + hafif gölge (öldürmez tehlike görseli)
  _drawTumbleweed(ctx, t) {
    const cx = t.x, cy = t.gy - t.r - 2 + Math.sin(t.bob) * 2;   // zeminin hemen üstünde hafif zıplama
    ctx.save();
    // zemin gölgesi
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath(); ctx.ellipse(t.x, t.gy - 1, t.r * 0.9, t.r * 0.3, 0, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(cx, cy); ctx.rotate(t.ang);
    const lowPerf = (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.6);
    const strands = lowPerf ? 7 : 13;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < strands; i++) {
      const a = (i / strands) * 6.28;
      const r2 = t.r * (0.6 + 0.4 * Math.abs(Math.sin(i * 2.3)));
      ctx.strokeStyle = i % 2 ? 'rgba(150,120,70,0.85)' : 'rgba(120,95,55,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * r2 * 0.5, Math.sin(a) * r2 * 0.5 + t.r * 0.15, Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(140,110,65,0.55)';
    ctx.beginPath(); ctx.arc(0, 0, t.r * 0.78, 0, 6.28); ctx.stroke();
    ctx.restore();
  },

  // ═══════════════════ NADİR GÖKYÜZÜ OLAYLARI (yıldız kayması, kuyruklu yıldız, gökkuşağı, tutulma) ═══════════════════
  // Tümü YALNIZ görsel / kozmetik: hiçbir afet/hasar/hava mantığını, gating'ini ya da fiziğini DEĞİŞTİRMEZ.
  // Ölümcül afetlere BAĞLI DEĞİL — gece/gündüz kapısı + düşük olasılıklı zar ile tetiklenir.
  // reducedMotion + perfScale ile ölçekli (_vfx). Kendi kendine kurulan durum; drawScreen'den EK olarak çağrılır.
  _drawSkyEvents(ctx, W, H) {
    // Çok düşük grafikte tamamen atla (yalnız görsel — hiçbir mantık etkilenmez)
    if (typeof Settings !== 'undefined' && Settings.perfScale && Settings.perfScale() < 0.4) return;
    const dt = this._wxDt('_skyLast');
    const vfx = this._vfx();
    if (!this._sky) this._sky = { cd: 25 + Math.random() * 35, ev: null, prevW: this.activeWeather };
    const S = this._sky;

    // Yağmurdan çıkış → gökkuşağı fırsatı (gündüz, sisli değil, aktif olay yokken, düşük olasılıkla)
    if (S.prevW === 'rain' && this.activeWeather !== 'rain' && !S.ev &&
        this._sunElev() > 0.15 && this.activeWeather !== 'fog' && Math.random() < 0.5) {
      S.ev = { type: 'rainbow', t: 0, life: 16 };
    }
    S.prevW = this.activeWeather;

    // Aktif olay yoksa periyodik düşük olasılıklı zar
    if (!S.ev) {
      S.cd -= dt;
      if (S.cd <= 0) { S.cd = 30 + Math.random() * 45; S.ev = this._pickSkyEvent(); }
    }

    if (S.ev) {
      S.ev.t += dt;
      switch (S.ev.type) {
        case 'meteorShower': this._drawMeteorShower(ctx, W, H, S.ev, dt, vfx); break;
        case 'comet':        this._drawComet(ctx, W, H, S.ev, vfx); break;
        case 'rainbow':      this._drawRainbow(ctx, W, H, S.ev, vfx); break;
        case 'eclipse':      this._drawEclipse(ctx, W, H, S.ev, vfx); break;
      }
      if (S.ev.t >= S.ev.life) S.ev = null;
    }
  },

  // Koşullara göre kozmetik olay seçer (gece: kayma/kuyruklu/ay tutulması; gündüz: soluk kuyruklu/güneş tutulması)
  _pickSkyEvent() {
    const night = this.isNight();
    const clearish = (this.activeWeather === 'clear' || this.activeWeather === 'wind');
    if (!clearish) return null;                    // yalnız açık/rüzgarlı gökte
    const roll = Math.random();
    if (night) {
      if (roll < 0.50) return { type: 'meteorShower', t: 0, life: 7 + Math.random() * 5, stars: [], spawn: 0 };
      if (roll < 0.80) return { type: 'comet', t: 0, life: 14 + Math.random() * 6, seed: Math.random() };
      return { type: 'eclipse', t: 0, life: 18 + Math.random() * 6, lunar: true };
    }
    if (roll < 0.35) return { type: 'comet', t: 0, life: 14 + Math.random() * 6, seed: Math.random() };
    if (roll < 0.50) return { type: 'eclipse', t: 0, life: 18 + Math.random() * 6, lunar: false };
    return null;                                   // çoğu gündüz zarı → olay yok (nadir kalsın)
  },

  // Yıldız kayması sağanağı — gökten süzülen kısa parlak izler (gece); son ~1.5 sn'de doğuş durur → söner
  _drawMeteorShower(ctx, W, H, ev, dt, vfx) {
    if (!ev.stars) ev.stars = [];
    ev.spawn -= dt;
    const active = ev.t < ev.life - 1.5;
    const maxN = Math.max(3, Math.round(10 * vfx));
    while (active && ev.spawn <= 0 && ev.stars.length < maxN) {
      ev.spawn += 0.25 + Math.random() * 0.55;
      ev.stars.push({
        x: Math.random() * W * 1.15, y: -20 - Math.random() * H * 0.25,
        vx: -(150 + Math.random() * 130), vy: 210 + Math.random() * 170,
        len: 38 + Math.random() * 52, life: 0, dur: 0.6 + Math.random() * 0.7
      });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = ev.stars.length - 1; i >= 0; i--) {
      const s = ev.stars[i];
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      const f = 1 - s.life / s.dur;                // 1→0 sönme
      if (f <= 0 || s.y > H + 40) { ev.stars.splice(i, 1); continue; }
      const sp = Math.hypot(s.vx, s.vy) || 1;
      const tx = s.x - (s.vx / sp) * s.len, ty = s.y - (s.vy / sp) * s.len;
      const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * f) + ')');
      grad.addColorStop(1, 'rgba(170,195,255,0)');
      ctx.strokeStyle = grad; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * f) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },

  // Geçen kuyruklu yıldız — parlak baş + yumuşak uzun kuyruk; ekranı yavaşça soldan sağa kavisle geçer
  _drawComet(ctx, W, H, ev, vfx) {
    const p = ev.t / ev.life;                      // 0→1 gökyüzünde ilerleme
    const x = -70 + p * (W + 140);
    const y = H * (0.12 + (ev.seed || 0) * 0.22) - Math.sin(p * Math.PI) * 28;   // hafif kavis
    const fade = Math.min(1, Math.min(ev.t, ev.life - ev.t) / 1.5) * (0.7 + 0.3 * vfx);
    if (fade <= 0.01) return;
    const tailLen = 120 + 70 * (ev.seed || 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tx = x - tailLen, ty = y + 20;
    const grad = GradyanDeposu.lin(ctx, x, y, tx, ty, [0, 'rgba(205,232,255,' + (0.7 * fade) + ')', 0.45, 'rgba(150,190,255,' + (0.28 * fade) + ')', 1, 'rgba(120,160,255,0)']);
    ctx.strokeStyle = grad; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
    const hg = GradyanDeposu.rad(ctx, x, y, 0, x, y, 11, [0, 'rgba(255,255,255,' + (0.95 * fade) + ')', 1, 'rgba(180,210,255,0)']);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.28); ctx.fill();
    ctx.restore();
  },

  // Yağmur sonrası gökkuşağı — yumuşak yarım kemer; girişte/çıkışta sönümlenir (yalnız gündüz)
  _drawRainbow(ctx, W, H, ev, vfx) {
    const fade = Math.min(1, Math.min(ev.t, ev.life - ev.t) / 3) * (0.55 + 0.45 * vfx);
    if (fade <= 0.01) return;
    const cx = W * 0.5, cy = H * 1.05, R = H * 0.9;
    const cols = ['rgba(255,80,80,', 'rgba(255,170,60,', 'rgba(255,240,90,',
                  'rgba(90,220,110,', 'rgba(80,160,255,', 'rgba(150,90,230,'];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 6;
    for (let i = 0; i < cols.length; i++) {
      ctx.strokeStyle = cols[i] + (0.16 * fade) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, R - i * 7, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    }
    ctx.restore();
  },

  // Tutulma loşluğu — ekranı yumuşakça karartıp açar (güneş: soğuk gri vinyet; ay: hafif kızıl ton)
  _drawEclipse(ctx, W, H, ev, vfx) {
    const env = Math.sin((ev.t / ev.life) * Math.PI);   // 0→1→0 zarf
    const peak = ev.lunar ? 0.5 : 0.62;
    const a = env * peak * (0.7 + 0.3 * vfx);
    if (a <= 0.002) return;
    ctx.save();
    if (ev.lunar) {
      ctx.fillStyle = 'rgba(60,10,10,' + (a * 0.6) + ')';
      ctx.fillRect(0, 0, W, H);
    } else {
      const g = GradyanDeposu.rad(ctx, W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, H, [0, 'rgba(18,18,34,' + a + ')', 1, 'rgba(8,8,18,' + (a * 0.5) + ')']);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
};
