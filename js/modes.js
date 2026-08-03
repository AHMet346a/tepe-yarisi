'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GAME MODES — Yarış, Zaman Yarışı (+hayalet), Survival, Boss Savaşı
// mapselect'te seçilir; Game döngüsü + renderer bunları çağırır.
// ═══════════════════════════════════════════════════════════════════════════
const GameModes = {
  mode: 'normal',        // normal | race | timetrial | survival | boss
  active: false,
  finished: false,
  finishTimer: 0,
  result: null,
  lastReward: 0,

  time: 0,
  finishDist: 8000,      // race/timetrial hedef mesafe (uzatıldı: 3000→8000, daha uzun yarış)
  finishX: 0,
  checkpoints: [],
  bestTime: null,

  // Hayalet (time trial)
  ghostData: [],         // bu turun kaydı
  ghostPlay: [],         // önceki en iyi turun kaydı
  recAccum: 0,

  // Boss
  boss: null,
  bossGoal: 2500,

  terrain: null, mapId: 'countryside',

  setMode(m) { this.mode = m || 'normal'; },

  init(mapId, terrain, v) {
    this.active = true;
    this.mapId = mapId; this.terrain = terrain;
    this.time = 0; this.finished = false; this.finishTimer = 0;
    this.result = null; this.lastReward = 0;
    this.checkpoints = []; this.ghostData = []; this.ghostPlay = [];
    this.recAccum = 0; this.boss = null; this.mpGhosts = []; this.placement = 0;
    // Yarış adil-temo + canlı sıralama durumu
    this._botBaseVx = null; this._raceGap = null; this._botDist = null; this._leadPulse = 0;
    // HUD animasyon/feedback yardımcıları
    this._hudT = 0; this._finishAnim = 0; this._splitFlash = 0; this._lastCpCount = 0;
    // Race/Time-trial ek geri bildirim: checkpoint split'i, geçiş (overtake) parlaması, final gösterisi
    this._splitFlashTimer = 0; this._splitTxt = ''; this._splitAhead = true; this._splitTimes = [];
    this._overtakeFlash = 0; this._overtakeTxt = ''; this._finishBurst = 0;
    // Boss desen/telegraf durumu (HUD + çizim okur)
    this._bossGap = 0; this._bossDanger = 0; this._bossState = 'chase'; this._bossTelegraph = 0; this._bossLungeWarn = 0;
    // Survival tehlike tırmanışı + kurtarma bidonları
    this._survT = 0; this._survInten = 0; this._pickups = []; this._pickSpawnX = null; this._rescueFlash = 0;
    // Coin Rush: geri sayan süre + toplanan sikkeler (kendi kendine yeten toplama sistemi)
    this._crTimer = 0; this._crMax = 75; this._crCoins = 0; this._crScore = 0;
    this._crItems = []; this._crSpawnX = null; this._crFlash = 0; this._crBest = 0;
    // Fuel Trial: sınırlı yakıt + ilerideki yakıt bidonları (kendi kendine yeten sistem)
    this._ftItems = []; this._ftSpawnX = null; this._ftFlash = 0; this._ftBest = 0;
    // Delivery: kırılgan kargo bütünlüğü (0-100); sert iniş & takla azaltır — 0'da kargo yok olur (mesafe skoru)
    this._dvIntegrity = 100; this._dvFlash = 0; this._dvHitFlash = 0; this._dvDmgTxt = '';
    this._dvBest = 0; this._dvPrevFlips = 0; this._dvLandCd = 0; this._dvGrace = 0;

    // Survival/Boss modları tehlikeleri zorunlu açar (kalıcı ayarı bozmadan)
    if (typeof Environment !== 'undefined') {
      if (this.mode === 'survival') Environment._modeOverride = { obstacles: true, disasters: true };
      else if (this.mode === 'boss') Environment._modeOverride = { obstacles: true };
      else Environment._modeOverride = null;
    }

    if (this.mode === 'race' || this.mode === 'timetrial') {
      for (let d = 500; d < this.finishDist; d += 500) this.checkpoints.push({ d: d, x: 200 + d * 2, hit: false });
      this.finishX = 200 + this.finishDist * 2;
    }
    if (this.mode === 'checkpoint') {
      // Her 400m'de checkpoint, geri sayan süre, her CP +süre — bitiş yok (mesafe skoru)
      for (let d = 400; d <= 40000; d += 400) this.checkpoints.push({ d: d, x: 200 + d * 2, hit: false });
      this._cpTimer = 15; this._cpMax = 22;
    }
    if (this.mode === 'coinrush') {
      // 60sn başlangıç süresi (tavan 75sn); her sikke +süre & +puan, bitiş yok — süre 0'da biter
      this._crTimer = 60; this._crMax = 75; this._crCoins = 0; this._crScore = 0;
      this._crItems = []; this._crSpawnX = null; this._crFlash = 0;
    }
    if (this.mode === 'fueltrial') {
      // Çok az yakıtla başla; ilerideki bidonlar doldurur; yakıt 0'a inince tur biter (mesafe skoru)
      this._ftItems = []; this._ftSpawnX = null; this._ftFlash = 0;
      if (v) v.fuel = Math.min((v.fuelMax != null ? v.fuelMax : 26), 26);
    }
    if (this.mode === 'delivery') {
      // Kargo bütünlüğü 100'de başlar; sert iniş (landingShock/impact) ve takla azaltır; 0'da tur biter (mesafe skoru)
      this._dvIntegrity = 100; this._dvFlash = 0; this._dvHitFlash = 0; this._dvDmgTxt = '';
      this._dvPrevFlips = (v && v.flipCount) || 0; this._dvLandCd = 0; this._dvGrace = 0.6;
    }
    if (this.mode === 'timetrial') {
      const bt = (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('bestTimes') || {}) : {};
      this.bestTime = bt[mapId] || null;
      const gh = (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('ghosts') || {}) : {};
      this.ghostPlay = gh[mapId] || [];
    }
    if (this.mode === 'boss') {
      const gy = terrain && terrain.getYAt ? terrain.getYAt(v.x - 600) : (v.y || 400);
      this.boss = { x: v.x - 620, y: gy, spd: 300, wobble: 0,
        state: 'chase', stateT: 0, nextPattern: 3.4, lungeVx: 0, telegraph: 0, flash: 0, lunges: 0 };
      this.bossGoal = 2500;
    }
    if (this.mode === 'ghostmp' && typeof Multiplayer !== 'undefined') {
      this.mpGhosts = Multiplayer.getGhosts(mapId, 4, terrain);
      this.mpGhosts.forEach(g => { g._i = 0; g._curDist = 0; g._done = false; });
    }
  },

  isRace() { return this.mode === 'race'; },

  update(dt, v, terrain, camera) {
    if (!this.active || !v) return;
    this.terrain = terrain;

    if (this.finished) {
      this.finishTimer -= dt;
      this._finishAnim = Math.min(1, (this._finishAnim || 0) + dt * 2.4);  // bant giriş animasyonu
      this._finishBurst = Math.min(1, (this._finishBurst || 0) + dt * 1.4); // konfeti/gösteri ilerlemesi
      this._hudT = (this._hudT || 0) + dt;
      if (this.finishTimer <= 0 && !v.dead) v.dead = true;  // sonuç gösterildikten sonra bitir
      return;
    }
    if (v.dead) return;

    this.time += dt;
    this._hudT = (this._hudT || 0) + dt;
    if (this._splitFlash > 0) this._splitFlash = Math.max(0, this._splitFlash - dt * 1.8);
    if (this._splitFlashTimer > 0) this._splitFlashTimer = Math.max(0, this._splitFlashTimer - dt);
    if (this._overtakeFlash > 0) this._overtakeFlash = Math.max(0, this._overtakeFlash - dt);
    const dist = Math.max(0, (v.x - 200) / 2);

    // ── Ghost kayıt (time trial + ghostmp) ──
    if (this.mode === 'timetrial' || this.mode === 'ghostmp') {
      this.recAccum += dt;
      if (this.recAccum >= 0.08) { this.recAccum = 0; this.ghostData.push({ t: this.time, x: v.x, y: v.y, a: v.angle }); }
    }

    // ── Ghost MP: rakip hayaletlerin anlık mesafesini güncelle ──
    if (this.mode === 'ghostmp' && this.mpGhosts.length && typeof Multiplayer !== 'undefined') {
      for (const g of this.mpGhosts) {
        const pos = Multiplayer.posAt(g, this.time);
        if (pos) { g._curX = pos.x; g._curY = pos.y; g._curA = pos.a; g._curDist = Math.max(0, (pos.x - 200) / 2); g._done = pos.done; }
      }
    }

    // ── Checkpoint ──
    for (const cp of this.checkpoints) {
      if (!cp.hit && v.x >= cp.x) {
        cp.hit = true;
        this._splitFlash = 1;   // HUD checkpoint parlaması
        if (this.mode === 'race' || this.mode === 'timetrial') this._onCheckpoint(cp);
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
        if (this.mode === 'checkpoint') {
          this._cpTimer = Math.min((this._cpTimer || 0) + 8, this._cpMax || 22);   // +süre
          if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(25);
        }
      }
    }

    // ── Checkpoint Rush: geri sayan süre; biterse tur biter (mesafe skoru) ──
    if (this.mode === 'checkpoint') {
      this._cpTimer = (this._cpTimer || 0) - dt;
      if (this._cpTimer <= 0) { this._cpTimer = 0; this._finish(v, dist); }
    }

    // ── Survival: tehlike tırmanışı (artan tüketim) + kurtarma bidonları ──
    if (this.mode === 'survival') this._updateSurvival(dt, v, dist);

    // ── Coin Rush: geri sayan süre + sikke toplama (süre biterse tur biter) ──
    if (this.mode === 'coinrush') this._updateCoinRush(dt, v, dist);

    // ── Fuel Trial: sınırlı yakıt + ilerideki bidonlar (yakıt biterse tur biter) ──
    if (this.mode === 'fueltrial') this._updateFuelTrial(dt, v, dist);

    // ── Delivery: kırılgan kargo bütünlüğü (sert iniş/takla azaltır; 0'da tur biter) ──
    if (this.mode === 'delivery') this._updateDelivery(dt, v, dist);

    // ── Yarış: adil tempo (rubber-band) + canlı fark ──
    if (this.mode === 'race') this._racePacing(dt, v, dist);

    // ── Bitiş (race/timetrial) ──
    if ((this.mode === 'race' || this.mode === 'timetrial') && this.finishX && v.x >= this.finishX) {
      this._finish(v, dist);
    }

    // ── Boss ──
    if (this.mode === 'boss' && this.boss) this._updateBoss(dt, v, terrain, dist);
  },

  // Yarış rakibini adil tut: oyuncu çok öndeyse bot hızlanır, bot çok
  // öndeyse yavaşlar — asla ışınlanma yok, yalnızca AI hedef hızı ayarlanır.
  // (GameModes.update Bot.update'ten önce çalışır → aynı karede etkir.)
  _racePacing(dt, v, dist) {
    if (typeof Bot === 'undefined' || !Bot.vehicle || !Bot.active || Bot.vehicle.dead) {
      this._raceGap = null; this._botDist = null; return;
    }
    const b = Bot.vehicle;
    if (this._botBaseVx == null && typeof Bot.targetVx === 'number') this._botBaseVx = Bot.targetVx;
    const base = this._botBaseVx || 200;
    const botDist = Math.max(0, (b.x - 200) / 2);
    const gap = dist - botDist;                 // + => oyuncu önde (metre)
    this._botDist = botDist;
    this._raceGap = gap;
    // Rubber-band çarpanı: küçük farklarda etkisiz (ölü bölge), sonra yumuşak.
    let f = 1;
    const ag = Math.abs(gap);
    if (ag > 60) {
      const t = Math.min(1, (ag - 60) / 900);
      f = gap > 0 ? (1 + 0.26 * t) : (1 - 0.20 * t);
    }
    // Bitişe yaklaşınca yardımı kes → adil final sprint (kimse önden çalınmaz).
    const togo = this.finishDist - dist;
    if (togo < 400) f = 1 + (f - 1) * Math.max(0, togo / 400);
    Bot.targetVx = base * f;
    // Liderlik değişimi vurgusu — geçiş (overtake) parlaması
    const lead = gap >= 0 ? 1 : -1;
    if (this._lastLead !== undefined && this._lastLead !== lead) {
      this._leadPulse = 1;
      // Küçük ölü-bölge titremesinde spam yapma: fark bir eşiği aşınca vurgula
      if (Math.abs(gap) > 6) {
        this._overtakeFlash = 1.4;
        this._overtakeTxt = (lead > 0) ? 'GEÇTİN!' : 'GEÇİLDİN!';
        // Ses: geçiş anına (flash edge) bir kez bağlı — kare-başına spam yok
        if (typeof Audio !== 'undefined' && Audio.playOvertake) Audio.playOvertake();
      }
    }
    this._lastLead = lead;
    if (this._leadPulse > 0) this._leadPulse = Math.max(0, this._leadPulse - dt * 1.3);
  },

  // Boss davranışı: bir durum makinesi ile çeşitli desenler —
  //   chase  : nefes alan takip mesafesi (canlı, tahmin edilemez)
  //   wind   : telegraf (geri çekilip şarj olur → oyuncuya kaçış şansı verir)
  //   lunge  : telegraflı hızlı hamle (tehlikeli ama önceden belli)
  //   recover: geri düşer, bir sonraki döngü öncesi soluklanma
  _updateBoss(dt, v, terrain, dist) {
    const b = this.boss;
    b.stateT = (b.stateT || 0) + dt;
    b.wobble += dt * 6;
    b.spd = Math.min(b.spd + 4 * dt, 560);   // taban hızı tavanlı → hızlı araçla kaçılabilir
    if (b.flash > 0) b.flash = Math.max(0, b.flash - dt * 2);
    const gapM = Math.max(0, (v.x - b.x) / 2);

    if (b.state === 'chase') {
      // Nefes alan takip mesafesi + ara sıra ani yaklaşma → tekdüze değil
      const breathe = 42 * Math.sin(b.wobble * 0.5);
      const surge = (Math.sin(b.wobble * 0.17) > 0.85) ? 60 : 0;   // kısa saldırgan atak
      const target = v.x - (240 + breathe - surge);
      b.x += (target - b.x) * Math.min(1, 1.4 * dt) + b.spd * dt * 0.15;
      b.telegraph = 0;
      b.nextPattern -= dt;
      // Yeterince yakınken telegraflı hamle başlat
      if (b.nextPattern <= 0 && gapM < 135) { b.state = 'wind'; b.stateT = 0; b.telegraph = 0; }
    } else if (b.state === 'wind') {
      // Telegraf: geri çekilir + şarj (0→1). Oyuncu bunu görüp hızlanabilir.
      b.telegraph = Math.min(1, b.stateT / 0.7);
      b.x += ((v.x - 330) - b.x) * Math.min(1, 3 * dt);
      if (b.stateT >= 0.7) {
        b.state = 'lunge'; b.stateT = 0;
        b.lungeVx = 640 + b.spd * 0.6;   // hamle patlaması
        if (typeof Audio !== 'undefined' && Audio.playHit) Audio.playHit();
      }
    } else if (b.state === 'lunge') {
      // Hızlı ileri hamle — sönümlenerek
      b.telegraph = 1;
      b.x += b.lungeVx * dt;
      b.lungeVx *= (1 - 1.25 * dt);
      if (b.stateT >= 0.55 || b.x > v.x + 50) { b.state = 'recover'; b.stateT = 0; }
    } else { // recover
      b.telegraph = Math.max(0, 1 - b.stateT / 0.9);
      const target = v.x - 300;   // geri düşer → adil soluklanma penceresi
      b.x += (target - b.x) * Math.min(1, 2 * dt);
      if (b.stateT >= 0.9) {
        b.state = 'chase'; b.stateT = 0;
        b.nextPattern = 2.6 + Math.random() * 2.2;   // değişken kadans
        b.lunges = (b.lunges || 0) + 1;
      }
    }

    b.y = terrain && terrain.getYAt ? terrain.getYAt(b.x) : b.y;

    // HUD için: mesafe (metre), tehlike, durum + hamle uyarısı
    this._bossGap = Math.max(0, (v.x - b.x) / 2);
    this._bossDanger = Math.max(0, Math.min(1, 1 - (this._bossGap - 40) / 120));
    this._bossState = b.state;
    this._bossTelegraph = b.telegraph || 0;
    this._bossLungeWarn = (b.state === 'wind') ? b.telegraph : (b.state === 'lunge' ? 1 : Math.max(0, (this._bossLungeWarn || 0) - dt * 2));

    // Çarpışma — hamle sırasında daha ağır hasar + daha güçlü sarsıntı
    if (Math.abs(b.x - v.x) < 95 && Math.abs(b.y - v.y) < 130) {
      const lunging = (b.state === 'lunge');
      b.flash = 1;
      if (typeof Environment !== 'undefined' && Environment.settings.damage) {
        v.damageLevel = (v.damageLevel || 0) + (lunging ? 1.0 : 0.55);
        if (typeof Environment._shake === 'function') Environment._shake(lunging ? 20 : 12);
        if (v.damageLevel >= 1) v.dead = true;
      } else {
        v.dead = true;
      }
    }
    if (dist >= this.bossGoal) { this.boss = null; this._finish(v, dist, 'BOSS YENİLDİ!'); }
  },

  // Survival: zaman+mesafe ile artan tehlike yoğunluğu → hızlanan yakıt tüketimi
  // ve zaman zaman çevresel tehlike artışı; dengeyi kurtarma bidonları sağlar.
  _updateSurvival(dt, v, dist) {
    this._survT = (this._survT || 0) + dt;
    // Yoğunluk (0..1): dakikalar geçtikçe ve ilerledikçe tırmanır
    const inten = Math.min(1, this._survT / 90 + dist / 6000);
    this._survInten = inten;
    // Kademeli yakıt tüketimi: başta yumuşak, sonra sert
    const drain = 0.9 + 1.7 * inten;
    v.fuel = Math.max(0, (v.fuel != null ? v.fuel : 100) - drain * dt);
    if (v.fuel <= 0) v.dead = true;
    // Yoğunluğu Environment'a ilet (additive; kullanılmıyorsa zararsız)
    if (typeof Environment !== 'undefined' && Environment._modeOverride) Environment._modeOverride.intensity = inten;
    // Kurtarma bidonları — önde belirir, toplanınca yakıt verir
    if (this._pickups == null) this._pickups = [];
    if (this._pickSpawnX == null) this._pickSpawnX = v.x + 1400;
    if (v.x + 1600 > this._pickSpawnX) {
      const px = this._pickSpawnX;
      this._pickups.push({ x: px, y: this._ty(px) - 74, got: false, bob: Math.random() * 6.28 });
      this._pickSpawnX += 1050 + Math.random() * 750;   // aralık
    }
    if (this._rescueFlash > 0) this._rescueFlash = Math.max(0, this._rescueFlash - dt * 1.5);
    for (const p of this._pickups) {
      p.bob += dt * 3;
      if (!p.got && Math.abs(p.x - v.x) < 72 && Math.abs(p.y - v.y) < 170) {
        p.got = true;
        v.fuel = Math.min(100, (v.fuel != null ? v.fuel : 0) + 34);
        this._rescueFlash = 1;
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('⛽ +yakıt');
      }
    }
    // Geride kalanları temizle (bellek)
    if (this._pickups.length > 24) this._pickups = this._pickups.filter(p => p.x > v.x - 800);
  },

  // Coin Rush: geri sayan süre boyunca ilerideki sikkeleri topla. Her sikke küçük
  // süre + puan ekler; büyük (★) sikkeler daha çok verir. Süre 0'a inince tur biter
  // (mesafeyle değil). Toplama tamamen mod içinde — dış çengel gerektirmez.
  _updateCoinRush(dt, v, dist) {
    // Geri sayım
    this._crTimer = (this._crTimer || 0) - dt;
    if ((this._crFlash || 0) > 0) this._crFlash = Math.max(0, this._crFlash - dt * 1.6);
    if (this._crTimer <= 0) { this._crTimer = 0; this._finish(v, dist); return; }

    // İleride sikke kümeleri üret (yay şeklinde — bir kısmı zıplama gerektirir)
    if (this._crItems == null) this._crItems = [];
    if (this._crSpawnX == null) this._crSpawnX = v.x + 900;
    let guard = 0;
    while (v.x + 1500 > this._crSpawnX && guard++ < 20) {
      const baseX = this._crSpawnX;
      const n = 3 + Math.floor(Math.random() * 4);
      const arc = 26 + Math.random() * 46;
      for (let i = 0; i < n; i++) {
        const cx = baseX + i * 46;
        const gy = this._ty(cx);
        const lift = 52 + Math.sin((i / (n - 1 || 1)) * Math.PI) * arc;
        this._crItems.push({ x: cx, y: gy - lift, got: false, bob: Math.random() * 6.28, big: Math.random() < 0.13 });
      }
      this._crSpawnX = baseX + n * 46 + 250 + Math.random() * 360;
    }

    // Toplama
    for (const c of this._crItems) {
      c.bob += dt * 4;
      if (!c.got && Math.abs(c.x - v.x) < 60 && Math.abs(c.y - v.y) < 92) {
        c.got = true;
        const val = c.big ? 5 : 1;
        this._crCoins = (this._crCoins || 0) + val;
        this._crScore = (this._crScore || 0) + (c.big ? 250 : 50);
        this._crTimer = Math.min((this._crTimer || 0) + (c.big ? 3 : 1), this._crMax || 75);
        this._crFlash = 1;
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
        if (typeof Particles !== 'undefined' && Particles.coinEffect) Particles.coinEffect(c.x, c.y);
        if (c.big && typeof UI !== 'undefined' && UI.showToast) UI.showToast('★ +3sn');
      }
    }

    // Geride kalanları temizle (bellek)
    if (this._crItems.length > 60) this._crItems = this._crItems.filter(c => c.x > v.x - 600);
  },

  // Fuel Trial: oyuncu çok az yakıtla başlar. İlerideki yakıt bidonları toplandıkça
  // yakıt doldurur (aracın kendi burn'ü gaz verdikçe tüketir). Yakıt 0'a inince tur
  // biter (mesafeyle skor). Toplama tamamen mod içinde — dış çengel gerektirmez.
  _updateFuelTrial(dt, v, dist) {
    const fmax = (v.fuelMax != null ? v.fuelMax : 100);
    if ((this._ftFlash || 0) > 0) this._ftFlash = Math.max(0, this._ftFlash - dt * 1.6);

    // İleride yakıt bidonları üret (düzenli aralıkla, ara sıra büyük bidon)
    if (this._ftItems == null) this._ftItems = [];
    if (this._ftSpawnX == null) this._ftSpawnX = v.x + 1100;
    let guard = 0;
    while (v.x + 1600 > this._ftSpawnX && guard++ < 20) {
      const px = this._ftSpawnX;
      const gy = this._ty(px);
      const big = Math.random() < 0.18;
      this._ftItems.push({ x: px, y: gy - 78, got: false, bob: Math.random() * 6.28, big: big });
      this._ftSpawnX = px + 620 + Math.random() * 520;   // aralık
    }

    // Toplama — yakıt doldurur (tavan = aracın fuelMax'i)
    for (const p of this._ftItems) {
      p.bob += dt * 3;
      if (!p.got && Math.abs(p.x - v.x) < 70 && Math.abs(p.y - v.y) < 170) {
        p.got = true;
        const add = p.big ? 34 : 18;
        v.fuel = Math.min(fmax, (v.fuel != null ? v.fuel : 0) + add);
        this._ftFlash = 1;
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
        if (typeof Particles !== 'undefined' && Particles.coinEffect) Particles.coinEffect(p.x, p.y);
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(p.big ? '⛽ +yakıt (büyük)' : '⛽ +yakıt');
      }
    }

    // Yakıt biterse tur biter (kat edilen mesafe = skor)
    if ((v.fuel != null ? v.fuel : 0) <= 0) { this._finish(v, dist); return; }

    // Geride kalanları temizle (bellek)
    if (this._ftItems.length > 40) this._ftItems = this._ftItems.filter(p => p.x > v.x - 700);
  },

  // Delivery: araç kırılgan bir kargo taşır (bütünlük 100'de başlar). Sert inişler
  // (landingShock/impact) ve kontrolsüz taklalar bütünlüğü azaltır; 0'a inince kargo
  // yok olur ve tur biter. Aksi halde tur sürer, mesafe = skor (kalan bütünlük bonusu).
  // Tümüyle mod içinde — dış çengel gerektirmez; başlangıçta kısa dokunulmazlık.
  _updateDelivery(dt, v, dist) {
    if (this._dvIntegrity == null) this._dvIntegrity = 100;
    if ((this._dvGrace || 0) > 0) this._dvGrace = Math.max(0, this._dvGrace - dt);
    if ((this._dvFlash || 0) > 0) this._dvFlash = Math.max(0, this._dvFlash - dt * 1.6);
    if ((this._dvHitFlash || 0) > 0) this._dvHitFlash = Math.max(0, this._dvHitFlash - dt * 1.4);
    if ((this._dvLandCd || 0) > 0) this._dvLandCd = Math.max(0, this._dvLandCd - dt);

    const grace = (this._dvGrace || 0) > 0;
    let dmg = 0;

    // Sert iniş: landingShock (veya impact) eşiği aşınca — kısa bekleme ile çift-sayım önlenir
    const shock = Math.max((v.landingShock || 0), (v.impact || 0));
    if (shock > 0.4 && (this._dvLandCd || 0) <= 0 && !grace) {
      dmg += (shock - 0.4) * 55;     // sert iniş şiddetiyle orantılı hasar (~0..33)
      this._dvLandCd = 0.45;
    }

    // Takla: flipCount artışı (kontrolsüz dönüş kargoyu hırpalar)
    const fc = (v.flipCount != null) ? v.flipCount : 0;
    if (this._dvPrevFlips == null) this._dvPrevFlips = fc;
    if (fc > this._dvPrevFlips) {
      if (!grace) dmg += (fc - this._dvPrevFlips) * 14;
      this._dvPrevFlips = fc;
    }

    if (dmg > 0.5) {
      this._dvIntegrity = Math.max(0, this._dvIntegrity - dmg);
      this._dvFlash = 1; this._dvHitFlash = 1; this._dvDmgTxt = '−' + Math.round(dmg);
      if (typeof Environment !== 'undefined' && typeof Environment._shake === 'function') Environment._shake(Math.min(18, 6 + dmg * 0.5));
      if (typeof Audio !== 'undefined' && Audio.playHit) Audio.playHit();
      if (typeof Particles !== 'undefined' && Particles.impact) Particles.impact(v.x, v.y);
      if (this._dvIntegrity > 0 && typeof UI !== 'undefined' && UI.showToast) UI.showToast('📦 kargo hasarı ' + this._dvDmgTxt);
    }

    // Bütünlük 0 → kargo yok olur, tur biter (kat edilen mesafe = skor)
    if (this._dvIntegrity <= 0) { this._dvIntegrity = 0; this._finish(v, dist); return; }
  },

  // Fuel Trial — kurtarıcı yakıt bidonları (zeminde süzülen, parıltılı; büyükler sarı)
  _drawFuelCans(ctx, camera) {
    for (const p of this._ftItems) {
      if (p.got) continue;
      if (camera && Math.abs(p.x - camera.x) > 2400) continue;
      const yy = p.y + Math.sin(p.bob) * 6;
      const s = p.big ? 1.28 : 1;
      ctx.save(); ctx.translate(p.x, yy);
      // parıltı halkası
      const glow = 0.35 + 0.2 * (0.5 + 0.5 * Math.sin(p.bob * 1.6));
      ctx.globalAlpha = glow;
      const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, 32 * s);
      rg.addColorStop(0, p.big ? 'rgba(255,210,60,0.9)' : 'rgba(90,210,255,0.85)');
      rg.addColorStop(1, p.big ? 'rgba(255,180,30,0)' : 'rgba(70,180,255,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 32 * s, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.scale(s, s);
      // bidon gövdesi
      ctx.fillStyle = p.big ? '#d99a1e' : '#c0392b'; ctx.strokeStyle = '#2a1206'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-14, -19, 28, 33, 5); ctx.fill(); ctx.stroke();
      // kapak + tutamak
      ctx.fillStyle = '#2a1206';
      ctx.fillRect(-5, -25, 10, 7);
      ctx.beginPath(); ctx.roundRect(-11, -24, 8, 5, 2); ctx.fill();
      // etiket
      ctx.fillStyle = '#fff6df'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⛽', 0, -1);
      ctx.restore();
    }
  },

  _finish(v, dist, label) {
    if (this.finished) return;
    this.finished = true; this.finishTimer = 2.6; this._finishAnim = 0; this._finishBurst = 0;
    let reward = 200;
    if (this.mode === 'timetrial') {
      const prevBest = this.bestTime;
      const isBest = (this.bestTime == null || this.time < this.bestTime);
      if (isBest && typeof SaveData !== 'undefined') {
        const bt = SaveData.get('bestTimes') || {}; bt[this.mapId] = this.time; SaveData.set('bestTimes', bt);
        const gh = SaveData.get('ghosts') || {}; gh[this.mapId] = this.ghostData.slice(0, 1400); SaveData.set('ghosts', gh);
      }
      // Önceki rekora göre fark (+ daha yavaş, - daha hızlı)
      const delta = (prevBest != null) ? (this.time - prevBest) : null;
      this.result = { mode: 'timetrial', time: this.time, best: prevBest, isBest: isBest, delta: delta };
      reward = isBest ? 400 : 150;
    } else if (this.mode === 'race') {
      const botX = (typeof Bot !== 'undefined' && Bot.vehicle) ? Bot.vehicle.x : -1e9;
      this.placement = (v.x >= botX) ? 1 : 2;
      // Bitişteki fark (metre) — kazanç/kayıp payı
      const gap = (botX > -1e8) ? Math.round((v.x - botX) / 2) : null;
      this.result = { mode: 'race', place: this.placement, gap: gap };
      reward = this.placement === 1 ? 500 : 150;
    } else if (this.mode === 'coinrush') {
      const coins = this._crCoins || 0, score = this._crScore || 0;
      // En iyi puanı sakla (varsa)
      let best = 0;
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const cr = SaveData.get('coinRushBest') || {};
        best = cr[this.mapId] || 0;
        if (score > best) { cr[this.mapId] = score; if (SaveData.set) SaveData.set('coinRushBest', cr); }
      }
      this.result = { mode: 'coinrush', coins: coins, score: score, best: best, isBest: score > best, label: 'SÜRE DOLDU' };
      reward = 100 + coins * 6;
    } else if (this.mode === 'checkpoint') {
      // Süre bitince: geçilen checkpoint sayısı + kat edilen mesafe skoru
      const cps = this.checkpoints.filter(c => c.hit).length;
      const dm = Math.floor(dist);
      let best = 0;
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const cb = SaveData.get('checkpointBest') || {};
        best = cb[this.mapId] || 0;
        if (dm > best) { cb[this.mapId] = dm; if (SaveData.set) SaveData.set('checkpointBest', cb); }
      }
      this.result = { mode: 'checkpoint', cps: cps, dist: dm, best: best, isBest: dm > best, label: 'SÜRE DOLDU' };
      reward = 100 + cps * 12;
    } else if (this.mode === 'fueltrial') {
      // Yakıt bitince: kat edilen mesafe skoru + en iyi
      const dm = Math.floor(dist);
      let best = 0;
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const fb = SaveData.get('fuelTrialBest') || {};
        best = fb[this.mapId] || 0;
        if (dm > best) { fb[this.mapId] = dm; if (SaveData.set) SaveData.set('fuelTrialBest', fb); }
      }
      this._ftBest = best;
      this.result = { mode: 'fueltrial', dist: dm, best: best, isBest: dm > best, label: 'YAKIT BİTTİ' };
      reward = 100 + Math.floor(dm / 10);
    } else if (this.mode === 'delivery') {
      // Kargo teslimi: mesafe skoru × kalan bütünlük bonusu (1.0..1.5×) + en iyi sakla
      const integ = Math.max(0, Math.round(this._dvIntegrity != null ? this._dvIntegrity : 0));
      const dm = Math.floor(dist);
      const mult = 1 + (integ / 100) * 0.5;   // yüksek bütünlük → 1.5×'a kadar bonus
      const score = Math.floor(dm * mult);
      const destroyed = integ <= 0;
      let best = 0;
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const db = SaveData.get('deliveryBest') || {};
        best = db[this.mapId] || 0;
        if (score > best) { db[this.mapId] = score; if (SaveData.set) SaveData.set('deliveryBest', db); }
      }
      this._dvBest = best;
      this.result = { mode: 'delivery', dist: dm, integrity: integ, score: score, best: best, isBest: score > best, label: destroyed ? 'KARGO YOK OLDU' : 'TESLİM EDİLDİ' };
      reward = 100 + Math.floor(score / 12);
    } else {
      this.result = { mode: this.mode, label: label || 'TAMAMLANDI' };
      reward = 600;
    }
    this.lastReward = reward;
    if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(reward);
    if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🏁 +' + reward + ' altın');
  },

  _ty(x) { return (this.terrain && this.terrain.getYAt) ? this.terrain.getYAt(x) : 0; },

  // Checkpoint: bir sonraki geçilmemiş checkpoint'e kalan mesafe (metre) — yoksa null
  _nextCpDist(vx) {
    for (const cp of this.checkpoints) {
      if (!cp.hit && cp.x >= vx) return Math.max(0, (cp.x - vx) / 2);
    }
    return null;
  },

  // ── Dünya-uzayı çizim (renderer, camera içinde) ──
  drawWorld(ctx, camera) {
    if (!this.active) return;

    // Checkpoint bayrakları (uzaktakiler çizilmez — performans)
    for (const cp of this.checkpoints) {
      if (camera && Math.abs(cp.x - camera.x) > 2400) continue;
      const gy = this._ty(cp.x);
      ctx.save(); ctx.translate(cp.x, gy);
      ctx.strokeStyle = cp.hit ? '#2ecc71' : '#ffffff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -90); ctx.stroke();
      ctx.fillStyle = cp.hit ? '#2ecc71' : '#e74c3c';
      ctx.beginPath(); ctx.moveTo(0, -90); ctx.lineTo(34, -78); ctx.lineTo(0, -66); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Bitiş çizgisi (dama)
    if (this.finishX && (this.mode === 'race' || this.mode === 'timetrial')) {
      const gy = this._ty(this.finishX);
      ctx.save(); ctx.translate(this.finishX, gy);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 2; c++) {
        ctx.fillStyle = ((r + c) % 2 === 0) ? '#fff' : '#111';
        ctx.fillRect(c * 12, -110 + r * 12, 12, 12);
      }
      ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.strokeRect(0, -110, 24, 108);
      ctx.restore();
    }
    // Hayalet araç (time trial — tek)
    if (this.mode === 'timetrial' && this.ghostPlay && this.ghostPlay.length > 1) this._drawGhost(ctx);
    // Ghost MP — çoklu rakip hayalet
    if (this.mode === 'ghostmp') { for (const g of this.mpGhosts) this._drawMpGhost(ctx, g); }
    // Survival kurtarma bidonları
    if (this.mode === 'survival' && this._pickups && this._pickups.length) this._drawPickups(ctx, camera);
    // Coin Rush sikkeleri
    if (this.mode === 'coinrush' && this._crItems && this._crItems.length) this._drawCoins(ctx, camera);
    // Fuel Trial yakıt bidonları
    if (this.mode === 'fueltrial' && this._ftItems && this._ftItems.length) this._drawFuelCans(ctx, camera);
    // Boss
    if (this.boss) this._drawBoss(ctx);
  },

  // Survival — kurtarma yakıt bidonları (zeminde süzülen, parıltılı)
  _drawPickups(ctx, camera) {
    for (const p of this._pickups) {
      if (p.got) continue;
      if (camera && Math.abs(p.x - camera.x) > 2400) continue;
      const yy = p.y + Math.sin(p.bob) * 6;
      ctx.save(); ctx.translate(p.x, yy);
      // parıltı halkası
      const glow = 0.35 + 0.2 * (0.5 + 0.5 * Math.sin(p.bob * 1.6));
      ctx.globalAlpha = glow;
      const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
      rg.addColorStop(0, 'rgba(70,240,130,0.9)'); rg.addColorStop(1, 'rgba(46,224,106,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
      // bidon gövdesi
      ctx.fillStyle = '#1f8a3b'; ctx.strokeStyle = '#0c3b1a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-14, -19, 28, 33, 5); ctx.fill(); ctx.stroke();
      // kapak + tutamak
      ctx.fillStyle = '#0c3b1a';
      ctx.fillRect(-5, -25, 10, 7);
      ctx.beginPath(); ctx.roundRect(-11, -24, 8, 5, 2); ctx.fill();
      // etiket
      ctx.fillStyle = '#eafff0'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⛽', 0, -1);
      ctx.restore();
    }
  },

  // Coin Rush — süzülen, dönen sikkeler (büyük ★ sikkeler mor/pembe)
  _drawCoins(ctx, camera) {
    for (const c of this._crItems) {
      if (c.got) continue;
      if (camera && Math.abs(c.x - camera.x) > 2400) continue;
      const yy = c.y + Math.sin(c.bob) * 5;
      const r = c.big ? 17 : 11;
      ctx.save(); ctx.translate(c.x, yy);
      // parıltı halkası
      ctx.globalAlpha = 0.32 + 0.2 * (0.5 + 0.5 * Math.sin(c.bob * 1.5));
      const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.4);
      rg.addColorStop(0, c.big ? 'rgba(255,120,240,0.9)' : 'rgba(255,215,30,0.9)');
      rg.addColorStop(1, 'rgba(255,215,30,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 1;
      // sikke gövdesi (yatay salınım ile 3B dönüş hissi)
      const sq = Math.abs(Math.cos(c.bob * 0.9));
      ctx.scale(0.32 + 0.68 * sq, 1);
      ctx.fillStyle = c.big ? '#ff5ad0' : '#ffd21e';
      ctx.strokeStyle = c.big ? '#a01f7a' : '#b8860b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.big ? '#ffd9f4' : '#fff3b0';
      ctx.font = 'bold ' + r + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.big ? '★' : '$', 0, 1);
      ctx.restore();
    }
  },

  _drawMpGhost(ctx, g) {
    if (g._curX === undefined || g._done) return;
    const def = (typeof VehicleDefs !== 'undefined') ? (VehicleDefs[g.vehicleId] || VehicleDefs.jeep) : { w: 100, h: 40 };
    const w = def.w || 100, h = def.h || 40, col = g.color || '#5bd0ff';
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(g._curX, g._curY); ctx.rotate(g._curA || 0);
    // gövde silueti
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 8); ctx.fill();
    ctx.globalAlpha = 0.9;
    // tekerler
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    (def.wheels || [{ x: -w * 0.3, y: 0, r: h * 0.35 }, { x: w * 0.3, y: 0, r: h * 0.35 }]).forEach(wd => {
      ctx.beginPath(); ctx.arc(wd.x, wd.y, (wd.r || 16), 0, 6.28); ctx.fill();
    });
    ctx.restore();
    // isim etiketi — zengin künye (ad + rütbe) varsa onu kullan, yoksa düz ad (geriye dönük)
    if (typeof Multiplayer !== 'undefined' && Multiplayer.drawNameplate) {
      Multiplayer.drawNameplate(ctx, g, g._curX, g._curY - h - 6, { alpha: 0.85 });
    } else {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = col; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(g.name || 'Ghost', g._curX, g._curY - h - 6);
      ctx.restore();
    }
  },

  // Tur sonu (game._onDeath tarafından çağrılır) — hayaleti kaydet + derece
  onRunEnd(playerDist) {
    if (this.mode === 'ghostmp' && typeof Multiplayer !== 'undefined') {
      // Oyuncu hayaletini kaydet
      const name = (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('playerName') || 'SEN') : 'SEN';
      Multiplayer.saveGhost({
        name: name, vehicleId: (typeof Game !== 'undefined' ? Game.vehicleId : 'jeep'),
        mapId: this.mapId, dist: Math.floor(playerDist), time: this.time,
        points: this.ghostData.slice(0, 1600)
      });
      // Derece: oyuncu + hayaletlerin nihai mesafeleri
      const finals = this.mpGhosts.map(g => g.dist || 0);
      let place = 1; for (const d of finals) if (d > playerDist) place++;
      this.placement = place;
      this.mpResult = { place: place, total: finals.length + 1 };
      if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(place === 1 ? 400 : 150);
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🏁 ' + place + '. / ' + (finals.length + 1) + '  (+' + (place === 1 ? 400 : 150) + ' altın)');
    }
  },

  _drawGhost(ctx) {
    const g = this.ghostPlay; const t = this.time;
    let i = 0; while (i < g.length - 1 && g[i + 1].t < t) i++;
    const a = g[i], b = g[Math.min(i + 1, g.length - 1)];
    const seg = Math.max(0.0001, b.t - a.t); const f = Math.max(0, Math.min(1, (t - a.t) / seg));
    const gx = a.x + (b.x - a.x) * f, gy = a.y + (b.y - a.y) * f, ga = a.a + (b.a - a.a) * f;
    ctx.save(); ctx.globalAlpha = 0.4;
    ctx.translate(gx, gy); ctx.rotate(ga);
    const vid = (typeof SaveData !== 'undefined' && SaveData.get) ? SaveData.get('selectedVehicle') : 'jeep';
    const def = (typeof VehicleDefs !== 'undefined') ? (VehicleDefs[vid] || VehicleDefs.jeep) : { w: 100, h: 40 };
    ctx.fillStyle = 'rgba(120,200,255,0.55)';
    ctx.beginPath(); ctx.roundRect(-(def.w || 100) / 2, -(def.h || 40), def.w || 100, def.h || 40, 8); ctx.fill();
    ctx.fillStyle = 'rgba(200,235,255,0.5)'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('GHOST', 0, -(def.h || 40) / 2);
    ctx.restore();
  },

  _drawBoss(ctx) {
    const b = this.boss;
    const tel = this._bossTelegraph || 0;
    const st = this._bossState || 'chase';
    ctx.save(); ctx.translate(b.x, b.y);
    // Şarj/hamle aurası (telegraf) — arkada büyüyen parıltı
    if (tel > 0.02) {
      ctx.save();
      ctx.globalAlpha = 0.16 + tel * 0.4;
      const aura = ctx.createRadialGradient(0, -55, 8, 0, -55, 100 + tel * 60);
      aura.addColorStop(0, st === 'lunge' ? 'rgba(255,235,110,0.95)' : 'rgba(255,90,43,0.95)');
      aura.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0, -55, 100 + tel * 60, 0, 6.28); ctx.fill();
      ctx.restore();
    }
    // Hamle sırasında hız çizgileri (geriye doğru)
    if (st === 'lunge') {
      ctx.save(); ctx.strokeStyle = 'rgba(255,220,120,0.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const yy = -92 + i * 24;
        ctx.beginPath(); ctx.moveTo(-108, yy); ctx.lineTo(-170 - i * 14, yy); ctx.stroke();
      }
      ctx.restore();
    }
    // Dev tekerlekler
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-70, -6 + Math.sin(b.wobble) * 3, 46, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(70, -6 + Math.cos(b.wobble) * 3, 46, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(-70, -6, 20, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(70, -6, 20, 0, 6.28); ctx.fill();
    // Gövde (dev, tehditkar)
    const bg = ctx.createLinearGradient(0, -110, 0, -20);
    bg.addColorStop(0, '#6a0d0d'); bg.addColorStop(1, '#2a0505');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(-100, -110, 200, 96, 12); ctx.fill();
    // Dikenli tampon
    ctx.fillStyle = '#c0c0c0';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(100, -100 + i * 16); ctx.lineTo(128, -92 + i * 16); ctx.lineTo(100, -84 + i * 16); ctx.closePath(); ctx.fill(); }
    // Gözler (kırmızı far) — telegraf/hamle sırasında parlar ve büyür
    const eyeR = 9 + tel * 3;
    ctx.fillStyle = st === 'lunge' ? '#fff3a0' : '#ff2b2b';
    ctx.shadowColor = st === 'lunge' ? '#ffe14d' : '#ff2b2b'; ctx.shadowBlur = 16 + tel * 18;
    ctx.beginPath(); ctx.arc(60, -70, eyeR, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(88, -70, eyeR, 0, 6.28); ctx.fill();
    ctx.shadowBlur = 0;
    // Çarpışma parlaması (beyaz)
    if (b.flash > 0) {
      ctx.globalAlpha = b.flash * 0.6; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(-100, -110, 200, 96, 12); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  // ── HUD yardımcıları ──
  _panel(ctx, x, y, w, h, r, a) {
    r = (r == null) ? 8 : r;
    ctx.fillStyle = 'rgba(8,12,22,' + (a == null ? 0.55 : a) + ')';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.stroke();
  },

  _fmtTime(t) {
    if (!(t >= 0)) t = 0;
    let mm = Math.floor(t / 60), ss = Math.round((t - mm * 60) * 10) / 10;
    if (ss >= 60) { ss -= 60; mm += 1; }   // toFixed(1) yuvarlama taşması (ör. 59.97→60.0, 9.96→10.0)
    return mm + ':' + (ss < 10 ? '0' : '') + ss.toFixed(1);
  },

  // Time trial: şu anki zamanda hayaletin konumuna göre fark (metre; + => öndesin)
  _ghostGap() {
    const g = this.ghostPlay;
    if (!g || g.length < 2 || typeof Game === 'undefined' || !Game.vehicle) return null;
    const t = this.time;
    let i = 0; while (i < g.length - 1 && g[i + 1].t < t) i++;
    const a = g[i], b = g[Math.min(i + 1, g.length - 1)];
    const seg = Math.max(0.0001, b.t - a.t); const f = Math.max(0, Math.min(1, (t - a.t) / seg));
    const gx = a.x + (b.x - a.x) * f;
    return (Game.vehicle.x - gx) / 2;
  },

  // Hayaletin verilen x konumuna ulaştığı süre (split karşılaştırması için)
  _ghostTimeAtX(x) {
    const g = this.ghostPlay;
    if (!g || g.length < 2) return null;
    let i = 0; while (i < g.length - 1 && g[i + 1].x < x) i++;
    const a = g[i], b = g[Math.min(i + 1, g.length - 1)];
    const dx = b.x - a.x;
    if (Math.abs(dx) < 0.001) return a.t;
    const f = Math.max(0, Math.min(1, (x - a.x) / dx));
    return a.t + (b.t - a.t) * f;
  },

  // Checkpoint geçilince split geri bildirimi hesapla:
  //   time-trial → hayalete karşı zaman farkı (± saniye)
  //   race       → rakibe karşı anlık mesafe farkı (± metre)
  _onCheckpoint(cp) {
    if (this.mode === 'timetrial' && this.ghostPlay && this.ghostPlay.length > 1) {
      const gt = this._ghostTimeAtX(cp.x);
      if (gt != null) {
        const d = this.time - gt;                 // - => hayaletten hızlı
        this._splitTxt = (d <= 0 ? '−' : '+') + Math.abs(d).toFixed(1) + 's';
        this._splitAhead = d <= 0;
        this._splitFlashTimer = 2.2;
        // Ses: split flash edge'ine bir kez bağlı (checkpoint başına) — yeşil=önde, kırmızı=geride
        if (typeof Audio !== 'undefined') {
          if (this._splitAhead) { if (Audio.playSplitAhead) Audio.playSplitAhead(); }
          else { if (Audio.playSplitBehind) Audio.playSplitBehind(); }
        }
      }
    } else if (this.mode === 'race') {
      const gap = this._raceGap;
      if (gap != null) {
        this._splitTxt = (gap >= 0 ? '+' : '−') + Math.abs(Math.round(gap)) + 'm';
        this._splitAhead = gap >= 0;
        this._splitFlashTimer = 2.2;
        // Ses: split flash edge'ine bir kez bağlı (checkpoint başına) — yeşil=önde, kırmızı=geride
        if (typeof Audio !== 'undefined') {
          if (this._splitAhead) { if (Audio.playSplitAhead) Audio.playSplitAhead(); }
          else { if (Audio.playSplitBehind) Audio.playSplitBehind(); }
        }
      }
    }
    this._splitTimes.push({ d: cp.d, t: this.time });
  },

  // Zafer konfetisi — durumsuz, deterministik (seed=indeks), _finishBurst ile animasyonlu
  _drawConfetti(ctx, W, H, t) {
    if (t <= 0) return;
    const cols = ['#ffd21e', '#2ee06a', '#ff5a46', '#5bd0ff', '#ff8a3d', '#ffffff'];
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const seed = i * 12.9898;
      const rx = Math.abs((Math.sin(seed) * 43758.5453) % 1);
      const spd = 0.45 + Math.abs((Math.sin(seed * 1.7) * 9973) % 1) * 0.9;
      const fall = (t * spd + rx) % 1;
      const x = rx * W + Math.sin(t * 4 + i) * 12;
      const y = fall * H;
      ctx.globalAlpha = Math.max(0, 1 - fall) * Math.min(1, t * 2);
      ctx.fillStyle = cols[i % cols.length];
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6 + i);
      ctx.fillRect(-3, -5, 6, 10);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // Yarış ilerleme çubuğu — oyuncu + bot işaretçileri + bitiş bayrağı
  _drawRaceBar(ctx, W) {
    const pDist = (typeof Game !== 'undefined' && Game.vehicle) ? Math.max(0, (Game.vehicle.x - 200) / 2) : 0;
    const pf = Math.max(0, Math.min(1, pDist / this.finishDist));
    const bf = (this._botDist != null) ? Math.max(0, Math.min(1, this._botDist / this.finishDist)) : null;
    const bw = Math.min(340, W - 48), bx = (W - bw) / 2, by = 56, bh = 7;
    // ray
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
    // oyuncu doluluğu (altın)
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#ffe07a'); grad.addColorStop(1, '#ffb01e');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(3, bw * pf), bh, 4); ctx.fill();
    // bot işaretçisi
    if (bf != null) {
      const bxm = bx + bw * bf;
      ctx.fillStyle = '#ff4d3d';
      ctx.beginPath(); ctx.moveTo(bxm, by - 4); ctx.lineTo(bxm - 4, by - 10); ctx.lineTo(bxm + 4, by - 10); ctx.closePath(); ctx.fill();
    }
    // oyuncu işaretçisi
    const pxm = bx + bw * pf;
    ctx.fillStyle = '#ffd21e';
    ctx.beginPath(); ctx.arc(pxm, by + bh + 5, 3.5, 0, 6.28); ctx.fill();
    // bitiş bayrağı
    ctx.fillStyle = '#fff'; ctx.font = '11px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('🏁', bx + bw + 12, by + bh / 2);
    return by + bh + 12;
  },

  // ── Ekran-uzayı HUD ──
  drawHUD(ctx, W, H) {
    if (!this.active || this.mode === 'normal') return;
    ctx.save();

    // Zamanlayıcı (race/timetrial)
    if (this.mode === 'race' || this.mode === 'timetrial') {
      const tstr = this._fmtTime(this.time);
      this._panel(ctx, W / 2 - 74, 8, 148, 36, 9);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 21px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⏱ ' + tstr, W / 2, 27);

      const done = this.checkpoints.filter(c => c.hit).length;
      const cpGlow = this._splitFlash || 0;
      ctx.fillStyle = cpGlow > 0 ? 'rgba(46,224,106,' + (0.5 + cpGlow * 0.5).toFixed(2) + ')' : '#9fe6ff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('CP ' + done + '/' + this.checkpoints.length, W / 2, this.mode === 'timetrial' ? 64 : 50);

      if (this.mode === 'timetrial' && this.bestTime != null) {
        ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 11px monospace';
        ctx.fillText('★ EN İYİ ' + this.bestTime.toFixed(1) + 's', W / 2, 50);
      }

      // Yarış: ilerleme çubuğu + canlı sıralama rozeti
      if (this.mode === 'race') {
        this._drawRaceBar(ctx, W);
        const ahead = (this._raceGap == null) ? true : (this._raceGap >= 0);
        const pulse = 1 + (this._leadPulse || 0) * 0.28;
        ctx.save(); ctx.translate(W / 2 + 96, 26); ctx.scale(pulse, pulse);
        ctx.fillStyle = ahead ? 'rgba(46,204,113,0.92)' : 'rgba(231,76,60,0.92)';
        ctx.beginPath(); ctx.roundRect(-38, -15, 76, 30, 8); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 16px Impact, Arial Black'; ctx.textAlign = 'left';
        ctx.fillText(ahead ? '1.' : '2.', -30, 1);
        if (this._raceGap != null) {
          const g = Math.abs(Math.round(this._raceGap));
          ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
          ctx.fillText((ahead ? '+' : '−') + g + 'm', 32, 1);
        }
        ctx.restore();

        // Son düzlük uyarısı — bitişe yaklaşınca sprint çağrısı
        const pDist = (typeof Game !== 'undefined' && Game.vehicle) ? Math.max(0, (Game.vehicle.x - 200) / 2) : 0;
        const togo = this.finishDist - pDist;
        if (togo > 0 && togo < 400) {
          const blink = 0.55 + 0.45 * Math.abs(Math.sin((this._hudT || 0) * 7));
          ctx.fillStyle = 'rgba(255,215,30,' + blink.toFixed(2) + ')';
          ctx.font = 'bold 15px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('SON DÜZLÜK! ' + Math.ceil(togo) + 'm', W / 2, 78);
          // Bitişe son 120m: büyük, nabız gibi atan mesafe geri sayımı
          if (togo < 120) {
            const s = 1 + 0.28 * Math.abs(Math.sin((this._hudT || 0) * 11));
            ctx.save();
            ctx.translate(W / 2, 108); ctx.scale(s, s);
            ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 30px Impact, Arial Black';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(255,215,30,0.7)'; ctx.shadowBlur = 14;
            ctx.fillText(Math.ceil(togo) + 'm', 0, 0);
            ctx.restore();
          }
        }
      }

      // Time trial: hayalete karşı canlı fark (önde/geride)
      if (this.mode === 'timetrial') {
        const gg = this._ghostGap();
        if (gg != null && (this.ghostPlay && this.ghostPlay.length > 1)) {
          const ahead = gg >= 0;
          ctx.save(); ctx.translate(W / 2 + 100, 27);
          ctx.fillStyle = ahead ? 'rgba(46,204,113,0.9)' : 'rgba(231,76,60,0.9)';
          ctx.beginPath(); ctx.roundRect(-40, -13, 80, 26, 7); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
          ctx.font = 'bold 12px Arial';
          ctx.fillText('👻 ' + (ahead ? '+' : '−') + Math.abs(Math.round(gg)) + 'm', 0, 1);
          ctx.restore();
        }
      }

      // Checkpoint split parlaması — race & time-trial ortak (rakibe/hayalete karşı)
      if ((this._splitFlashTimer || 0) > 0.02 && this._splitTxt) {
        const sf = Math.min(1, this._splitFlashTimer / 2.2);
        const rise = (1 - sf) * 12;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this._splitFlashTimer * 1.8);
        ctx.fillStyle = this._splitAhead ? 'rgba(46,224,106,0.96)' : 'rgba(255,90,70,0.96)';
        ctx.font = 'bold 17px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = this._splitAhead ? 'rgba(46,224,106,0.6)' : 'rgba(255,80,60,0.6)'; ctx.shadowBlur = 10;
        ctx.fillText('◄ SPLIT ' + this._splitTxt + ' ►', W / 2, 100 - rise);
        ctx.restore();
      }

      // Geçiş (overtake) parlaması — race'te lider değişince büyük merkez uyarısı
      if ((this._overtakeFlash || 0) > 0.02 && this._overtakeTxt) {
        const of = Math.min(1, this._overtakeFlash / 1.4);
        const pop = 1 + (1 - of) * 0.4;
        const up = this._overtakeTxt === 'GEÇTİN!';
        ctx.save();
        ctx.globalAlpha = Math.min(1, this._overtakeFlash * 2);
        ctx.translate(W / 2, H * 0.22); ctx.scale(pop, pop);
        ctx.fillStyle = up ? '#2ee06a' : '#ff5a46';
        ctx.font = 'bold 34px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = up ? 'rgba(46,224,106,0.7)' : 'rgba(255,60,50,0.7)'; ctx.shadowBlur = 18;
        ctx.fillText(up ? '⚡ GEÇTİN!' : '⚠ GEÇİLDİN!', 0, 0);
        ctx.restore();
      }
    }

    // Boss barı — ilerleme + tehlike (yakınlık) uyarısı
    if (this.mode === 'boss') {
      const g = (typeof Game !== 'undefined' && Game.vehicle) ? Math.max(0, (Game.vehicle.x - 200) / 2) : 0;
      const p = Math.max(0, Math.min(1, g / this.bossGoal));
      const danger = this._bossDanger || 0;
      this._panel(ctx, W / 2 - 132, 10, 264, 30, 9, 0.6);
      ctx.fillStyle = '#3a0000'; ctx.beginPath(); ctx.roundRect(W / 2 - 124, 17, 248, 12, 6); ctx.fill();
      const bg = ctx.createLinearGradient(W / 2 - 124, 0, W / 2 + 124, 0);
      bg.addColorStop(0, '#ff8a3d'); bg.addColorStop(1, '#ff2b2b');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(W / 2 - 124, 17, Math.max(3, 248 * p), 12, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👹 KAÇIŞ %' + Math.floor(p * 100), W / 2, 23);
      if (danger > 0.3) {
        const blink = 0.5 + 0.5 * Math.abs(Math.sin((this._hudT || 0) * 9));
        ctx.fillStyle = 'rgba(255,45,45,' + (0.45 + blink * 0.55).toFixed(2) + ')';
        ctx.font = 'bold 14px Impact, Arial Black';
        ctx.fillText('⚠ BOSS ' + Math.round(this._bossGap || 0) + 'm', W / 2, 52);
      }
      // Telegraflı hamle uyarısı — şarj/atak sırasında büyük yanıp sönen uyarı + şarj çubuğu
      const warn = this._bossLungeWarn || 0;
      if (warn > 0.12) {
        const lunging = this._bossState === 'lunge';
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin((this._hudT || 0) * 14));
        ctx.fillStyle = (lunging ? 'rgba(255,235,90,' : 'rgba(255,140,40,') + pulse.toFixed(2) + ')';
        ctx.font = 'bold 20px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(lunging ? '⚡ HAMLE!' : '⚡ HAMLE GELİYOR!', W / 2, 76);
        // şarj çubuğu (telegraf ilerlemesi)
        const tw = 150, tx = W / 2 - tw / 2, ty = 88;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(tx, ty, tw, 6, 3); ctx.fill();
        ctx.fillStyle = lunging ? '#ffe14d' : '#ff8a3d';
        ctx.beginPath(); ctx.roundRect(tx, ty, Math.max(3, tw * Math.min(1, this._bossTelegraph || 0)), 6, 3); ctx.fill();
      }
    }

    // Survival: mesafe skoru + düşük yakıt uyarısı
    if (this.mode === 'survival') {
      const veh = (typeof Game !== 'undefined') ? Game.vehicle : null;
      const g = veh ? Math.max(0, (veh.x - 200) / 2) : 0;
      const fuel = veh ? (veh.fuel != null ? veh.fuel : 100) : 100;
      this._panel(ctx, W / 2 - 84, 8, 168, 44, 9, 0.5);
      ctx.fillStyle = '#ff8a3d'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('☠ SURVIVAL ' + Math.floor(g) + 'm', W / 2, 23);
      // Tehlike yoğunluğu ölçeri (yükseldikçe kırmızıya döner)
      const inten = this._survInten || 0;
      const mw = 152, mx = W / 2 - mw / 2, my = 38;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(mx, my, mw, 7, 4); ctx.fill();
      const ig = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      ig.addColorStop(0, '#3ad07a'); ig.addColorStop(0.55, '#ffcf3d'); ig.addColorStop(1, '#ff3b2b');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.roundRect(mx, my, Math.max(3, mw * inten), 7, 4); ctx.fill();
      ctx.fillStyle = inten > 0.66 ? '#ff6b52' : '#cfe8d6'; ctx.font = 'bold 9px Arial';
      ctx.fillText('TEHLİKE ' + (inten > 0.66 ? '↑↑' : inten > 0.33 ? '↑' : '—'), W / 2, my + 3.5);
      // Kurtarma bidonu toplama geri bildirimi
      if ((this._rescueFlash || 0) > 0.02) {
        const rf = this._rescueFlash;
        ctx.fillStyle = 'rgba(70,240,130,' + rf.toFixed(2) + ')';
        ctx.font = 'bold 15px Impact, Arial Black';
        ctx.fillText('⛽ +YAKIT', W / 2, 62 - (1 - rf) * 8);
      } else if (fuel < 25) {
        const blink = 0.5 + 0.5 * Math.abs(Math.sin((this._hudT || 0) * 8));
        ctx.fillStyle = 'rgba(255,60,40,' + (0.4 + blink * 0.6).toFixed(2) + ')';
        ctx.font = 'bold 12px Impact, Arial Black';
        ctx.fillText('⛽ DÜŞÜK YAKIT', W / 2, 62);
      }
    }

    // Checkpoint Rush — büyük geri sayım + mesafe
    if (this.mode === 'checkpoint') {
      const tt = Math.max(0, this._cpTimer || 0);
      const low = tt < 5;
      const g = (typeof Game !== 'undefined' && Game.vehicle) ? Math.max(0, (Game.vehicle.x - 200) / 2) : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 78, 8, 156, 42, 9); ctx.fill();
      ctx.fillStyle = low ? (Math.sin(Date.now() * 0.02) > 0 ? '#ff3b3b' : '#ff8a3d') : '#2ee06a';
      ctx.font = 'bold 26px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⏱ ' + tt.toFixed(1), W / 2, 24);
      const cpVeh = (typeof Game !== 'undefined') ? Game.vehicle : null;
      const nx = this._nextCpDist(cpVeh ? cpVeh.x : 200);
      const nxTxt = (nx != null) ? ('SONRAKİ CP ' + Math.ceil(nx) + 'm') : 'SON CP';
      ctx.fillStyle = '#9fe6ff'; ctx.font = 'bold 11px Arial';
      ctx.fillText(Math.floor(g) + 'm  •  ' + nxTxt + '  •  +8s', W / 2, 42);
    }

    // Coin Rush — büyük geri sayım + sikke sayısı & puan
    if (this.mode === 'coinrush') {
      const tt = Math.max(0, this._crTimer || 0);
      const low = tt < 10;
      this._panel(ctx, W / 2 - 94, 8, 188, 48, 9, 0.55);
      ctx.fillStyle = low ? (Math.sin(Date.now() * 0.02) > 0 ? '#ff3b3b' : '#ff8a3d') : '#ffd21e';
      ctx.font = 'bold 26px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⏱ ' + tt.toFixed(1), W / 2, 25);
      const cf = this._crFlash || 0;
      ctx.fillStyle = cf > 0.02 ? 'rgba(46,224,106,' + (0.5 + cf * 0.5).toFixed(2) + ')' : '#ffe07a';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('🪙 ' + (this._crCoins || 0) + '   •   ' + (this._crScore || 0) + ' PUAN', W / 2, 46);
    }

    // Fuel Trial — mesafe skoru + yakıt göstergesi + düşük yakıt uyarısı
    if (this.mode === 'fueltrial') {
      const veh = (typeof Game !== 'undefined') ? Game.vehicle : null;
      const g = veh ? Math.max(0, (veh.x - 200) / 2) : 0;
      const fmax = veh ? (veh.fuelMax != null ? veh.fuelMax : 100) : 100;
      const fuel = veh ? (veh.fuel != null ? veh.fuel : fmax) : fmax;
      const fr = Math.max(0, Math.min(1, fuel / fmax));
      this._panel(ctx, W / 2 - 94, 8, 188, 46, 9, 0.55);
      ctx.fillStyle = '#7fe0ff'; ctx.font = 'bold 15px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⛽ YAKIT DENEMESİ ' + Math.floor(g) + 'm', W / 2, 23);
      // yakıt çubuğu (kırmızı → yeşil)
      const mw = 168, mx = W / 2 - mw / 2, my = 38;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(mx, my, mw, 8, 4); ctx.fill();
      const fg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      fg.addColorStop(0, '#ff3b2b'); fg.addColorStop(0.45, '#ffcf3d'); fg.addColorStop(1, '#3ad07a');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.roundRect(mx, my, Math.max(3, mw * fr), 8, 4); ctx.fill();
      // toplama geri bildirimi / düşük yakıt uyarısı
      if ((this._ftFlash || 0) > 0.02) {
        const rf = this._ftFlash;
        ctx.fillStyle = 'rgba(70,240,130,' + rf.toFixed(2) + ')';
        ctx.font = 'bold 15px Impact, Arial Black'; ctx.textAlign = 'center';
        ctx.fillText('⛽ +YAKIT', W / 2, 64 - (1 - rf) * 8);
      } else if (fr < 0.25) {
        const blink = 0.5 + 0.5 * Math.abs(Math.sin((this._hudT || 0) * 8));
        ctx.fillStyle = 'rgba(255,60,40,' + (0.4 + blink * 0.6).toFixed(2) + ')';
        ctx.font = 'bold 12px Impact, Arial Black'; ctx.textAlign = 'center';
        ctx.fillText('⛽ DÜŞÜK YAKIT!', W / 2, 64);
      }
    }

    // Delivery — mesafe skoru + kargo bütünlüğü çubuğu + hasar/tehlike uyarısı
    if (this.mode === 'delivery') {
      const veh = (typeof Game !== 'undefined') ? Game.vehicle : null;
      const g = veh ? Math.max(0, (veh.x - 200) / 2) : 0;
      const integ = Math.max(0, Math.min(100, this._dvIntegrity != null ? this._dvIntegrity : 100));
      const ir = integ / 100;
      this._panel(ctx, W / 2 - 94, 8, 188, 46, 9, 0.55);
      ctx.fillStyle = '#ffcf7a'; ctx.font = 'bold 15px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('📦 KARGO ' + Math.floor(g) + 'm', W / 2, 23);
      // bütünlük çubuğu (kırmızı → yeşil)
      const mw = 168, mx = W / 2 - mw / 2, my = 38;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(mx, my, mw, 8, 4); ctx.fill();
      const dg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      dg.addColorStop(0, '#ff3b2b'); dg.addColorStop(0.5, '#ffcf3d'); dg.addColorStop(1, '#3ad07a');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.roundRect(mx, my, Math.max(3, mw * ir), 8, 4); ctx.fill();
      // hasar flaşı / düşük bütünlük uyarısı
      if ((this._dvHitFlash || 0) > 0.02) {
        const hf = this._dvHitFlash;
        ctx.strokeStyle = 'rgba(255,60,40,' + hf.toFixed(2) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(mx - 1, my - 1, mw + 2, 10, 5); ctx.stroke();
        ctx.fillStyle = 'rgba(255,90,70,' + hf.toFixed(2) + ')';
        ctx.font = 'bold 14px Impact, Arial Black'; ctx.textAlign = 'center';
        ctx.fillText('📦 ' + (this._dvDmgTxt || '') + '  %' + Math.round(integ), W / 2, 64 - (1 - hf) * 8);
      } else if (ir < 0.3) {
        const blink = 0.5 + 0.5 * Math.abs(Math.sin((this._hudT || 0) * 8));
        ctx.fillStyle = 'rgba(255,60,40,' + (0.4 + blink * 0.6).toFixed(2) + ')';
        ctx.font = 'bold 12px Impact, Arial Black'; ctx.textAlign = 'center';
        ctx.fillText('⚠ KARGO TEHLİKEDE! %' + Math.round(integ), W / 2, 64);
      } else {
        ctx.fillStyle = '#cfe8d6'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
        ctx.fillText('BÜTÜNLÜK %' + Math.round(integ), W / 2, 64);
      }
    }

    // Ghost MP — canlı mini sıralama (sağ üst)
    if (this.mode === 'ghostmp') {
      const pd = (typeof Game !== 'undefined' && Game.vehicle) ? Math.max(0, (Game.vehicle.x - 200) / 2) : 0;
      const list = this.mpGhosts.map(g => ({ name: g.name, dist: (g._curDist !== undefined ? g._curDist : (g.dist || 0)), self: false, col: g.color }));
      list.push({ name: 'SEN', dist: pd, self: true, col: '#ffd21e' });
      list.sort((a, b) => b.dist - a.dist);
      const bw = 150, bx = W - bw - 8, by = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 18 + list.length * 16, 8); ctx.fill();
      ctx.font = 'bold 10px Arial'; ctx.textBaseline = 'middle';
      list.forEach((e, i) => {
        const ly = by + 14 + i * 16;
        ctx.fillStyle = e.self ? '#ffd21e' : (e.col || '#cfd6ff');
        ctx.textAlign = 'left'; ctx.fillText((i + 1) + '. ' + e.name, bx + 8, ly);
        ctx.textAlign = 'right'; ctx.fillText(Math.floor(e.dist) + 'm', bx + bw - 8, ly);
      });
    }

    // Bitiş bandı — kayarak giren, sonuca göre renkli geri bildirim
    if (this.finished && this.result) {
      const a = (this._finishAnim == null) ? 1 : this._finishAnim;
      const ease = 1 - Math.pow(1 - a, 3);
      const bandH = 100, bandY = H * 0.34;
      const r = this.result;
      const win = (r.mode === 'race' && r.place === 1) ||
                  (r.mode === 'timetrial' && r.isBest) ||
                  (r.mode !== 'race' && r.mode !== 'timetrial');
      ctx.save();
      ctx.globalAlpha = ease;
      ctx.fillStyle = 'rgba(0,0,0,0.70)'; ctx.fillRect(0, bandY, W, bandH);
      const edge = win ? 'rgba(46,204,113,0.9)' : 'rgba(231,76,60,0.85)';
      ctx.fillStyle = edge; ctx.fillRect(0, bandY, W, 4); ctx.fillRect(0, bandY + bandH - 4, W, 4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      let title = '🏁 TAMAMLANDI', sub = '';
      if (r.mode === 'race') {
        title = r.place === 1 ? '🥇 1. OLDUN!' : '🥈 2. OLDUN';
        if (r.gap != null) sub = r.gap >= 0 ? ('Rakibin ' + r.gap + 'm önünde') : (Math.abs(r.gap) + 'm geride');
      } else if (r.mode === 'timetrial') {
        title = r.isBest ? '⭐ YENİ REKOR!' : '🏁 BİTTİ';
        sub = this._fmtTime(this.time) + 's';
        if (r.delta != null) sub += r.delta <= 0 ? ('  (' + r.delta.toFixed(1) + 's)') : ('  (+' + r.delta.toFixed(1) + 's)');
      } else if (r.mode === 'coinrush') {
        title = r.isBest ? '⭐ YENİ REKOR!' : '🪙 ' + (r.coins || 0) + ' SİKKE';
        sub = (r.score || 0) + ' PUAN' + (r.best ? ('   (EN İYİ ' + r.best + ')') : '');
      } else if (r.mode === 'checkpoint') {
        title = r.isBest ? '⭐ YENİ REKOR!' : '🚩 ' + (r.dist || 0) + 'm';
        sub = (r.cps || 0) + ' CHECKPOINT' + (r.best ? ('   (EN İYİ ' + r.best + 'm)') : '');
      } else if (r.mode === 'fueltrial') {
        title = r.isBest ? '⭐ YENİ REKOR!' : '⛽ ' + (r.dist || 0) + 'm';
        sub = 'YAKIT BİTTİ' + (r.best ? ('   (EN İYİ ' + r.best + 'm)') : '');
      } else if (r.mode === 'delivery') {
        title = r.isBest ? '⭐ YENİ REKOR!' : '📦 ' + (r.score || 0) + ' PUAN';
        sub = (r.label || '') + '  ' + (r.dist || 0) + 'm • %' + (r.integrity || 0) + (r.best ? ('   (EN İYİ ' + r.best + ')') : '');
      } else if (r.label) { title = '🏆 ' + r.label; }

      const slide = (1 - ease) * 18;
      ctx.fillStyle = win ? '#ffe07a' : '#ff9a8a';
      ctx.font = 'bold 32px Impact, Arial Black';
      ctx.shadowColor = win ? 'rgba(255,200,60,0.6)' : 'rgba(255,80,60,0.5)'; ctx.shadowBlur = 14;
      ctx.fillText(title, W / 2, bandY + 34 - slide);
      ctx.shadowBlur = 0;
      if (sub) { ctx.fillStyle = '#dfe7ef'; ctx.font = 'bold 14px Arial'; ctx.fillText(sub, W / 2, bandY + 62); }
      ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 15px Arial';
      ctx.fillText('+' + this.lastReward + ' altın', W / 2, bandY + (sub ? 82 : 66));
      ctx.restore();
      // Zafer gösterisi: yalnızca race/time-trial galibiyetinde konfeti yağmuru
      if (win && (r.mode === 'race' || r.mode === 'timetrial')) this._drawConfetti(ctx, W, H, this._finishBurst || 0);
    }
    ctx.restore();
  }
};
