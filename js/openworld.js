'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   OPEN WORLD — AÇIK DÜNYA KEŞİF MODU  (HCR2 / Ahmet Tepe Yarışı)
   ----------------------------------------------------------------------------
   TEK BÜYÜK BAĞLI DÜNYA: yan yana bölgeler (çayır → çöl → dağ → buz → şehir →
   volkan) arasında pürüzsüz geçiş yapan tek, sürekli bir terrain. Yakıt
   yönetimi (istasyon/bidon), checkpoint'ler, gizli sandıklar (sırlar), keşif
   ödülleri (bölge tamamlama, mesafe kilometre taşları, sır bulma).

   BAĞIMSIZ MOD: Kendi ARACINI (Physics.createVehicle), kendi TERRAIN'ini
   (bölge-tabanlı prosedürel yükseklik fonksiyonu), kendi GİRİŞ dinleyicilerini
   yönetir. Sadece global Camera'yı (follow/worldToScreen) ve — varsa — global
   drawVehicle()'ı kullanır. Global Terrain singleton'ına DOKUNMAZ.

   API:  OpenWorld.init()  ·  update(dt)  ·  draw(ctx)  ·  drawHUD(ctx,W,H)
         finish()  ·  isActive()  ·  wantsExit()
   ----------------------------------------------------------------------------
   KURALLAR: localStorage YOK (kalıcılık yalnız SaveData API üzerinden, guard'lı).
   Tüm pozisyon/yakıt/hız güncellemelerinde NaN guard.
   ════════════════════════════════════════════════════════════════════════════ */
const OpenWorld = (function () {

  // ── Dünya ölçeği ──────────────────────────────────────────────────────────
  const REGION_W  = 12000;   // her bölgenin genişliği (px)
  const GROUND_Y  = 540;     // dünya-uzayı temel zemin çizgisi (y aşağı doğru artar)
  const PX_PER_M  = 12;      // metre dönüşümü (12 px = 1 m)

  // ── Bölgeler (biome) — soldan sağa bağlı dünya ────────────────────────────
  // amp: tepe genliği · base: dikey ofset · surface: fizik yüzeyi (Physics.SURFACE_FRICTION)
  const REGIONS = [
    { id:'cayir',  name:'ÇAYIR',  surface:'grass',  sky:'#7ec8f0', sky2:'#bfe6ff', g1:'#7ec850', g2:'#4f9a3a', amp:110, base:0   },
    { id:'col',    name:'ÇÖL',    surface:'sand',   sky:'#f0c878', sky2:'#ffe6b0', g1:'#d8b45a', g2:'#a07a2e', amp:150, base:20  },
    { id:'dag',    name:'DAĞ',    surface:'rock',   sky:'#8a97b0', sky2:'#c4d0e0', g1:'#6a655f', g2:'#39352f', amp:320, base:-40 },
    { id:'buz',    name:'BUZ',    surface:'ice',    sky:'#a8d8ee', sky2:'#e0f4ff', g1:'#cfe9f5', g2:'#9cc4d8', amp:190, base:0   },
    { id:'sehir',  name:'ŞEHİR',  surface:'asfalt', sky:'#3a4a66', sky2:'#7088aa', g1:'#3a4050', g2:'#20242e', amp:70,  base:30  },
    { id:'volkan', name:'VOLKAN', surface:'rock',   sky:'#3a1008', sky2:'#7a2a12', g1:'#6b2a1a', g2:'#40170e', amp:260, base:-20 }
  ];
  const WORLD_LEN = REGIONS.length * REGION_W;   // tasarlanmış dünya uzunluğu (ötesi sonsuz proc.)

  // ── Keşif içeriği miktarları ──────────────────────────────────────────────
  const NUM_SECRETS   = 30;      // dünya boyunca gizli sandık sayısı
  const STATION_STEP  = 5200;    // yakıt istasyonu aralığı (px)
  const CHECKPT_STEP  = 6800;    // checkpoint aralığı (px)
  const MILESTONE_M   = 500;     // her 500 m'de mesafe ödülü

  // ── Modül durumu ──────────────────────────────────────────────────────────
  const S = {
    active:false, exit:false,
    canvas:null,
    vehicleId:'jeep',
    vehicle:null, terrain:null,
    startX:200,
    input:{ throttle:0, brake:0, boost:0 },
    // keşif ilerlemesi
    foundSecrets:{},            // { index: true }
    secretCount:0,
    regionsDone:{},             // { regionIndex: true }
    stationsUsed:{},            // yeni doldurma efekti için (proximity yeniden dolum sürekli)
    checkpoints:[],             // aktive edilmiş checkpoint x listesi
    lastCheckpoint:null,        // { x, y }
    maxDist:0,                  // ulaşılan en uzak mesafe (m)
    nextMilestone:MILESTONE_M,
    curRegion:0,
    // altın/elmas oturum sayaçları (HUD gösterimi)
    goldEarned:0, diaEarned:0,
    // durum
    dead:false, deadT:0,
    refuelFlash:0,
    toast:null, toastT:0,
    animT:0,
    _menuBtn:null,
    // bağlı dinleyici referansları (finish'te kaldırmak için)
    _onKeyDown:null, _onKeyUp:null, _onPointerDown:null, _onPointerUp:null, _onPointerCancel:null
  };

  // ── Yardımcılar ───────────────────────────────────────────────────────────
  function num(v, fb) { return (typeof v === 'number' && isFinite(v)) ? v : fb; }

  function hexToRgb(h) {
    h = (h || '#888888').replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    const n = parseInt(h, 16);
    return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  }
  function lerpColor(a, b, t) {
    t = Math.max(0, Math.min(1, num(t, 0)));
    const c1 = hexToRgb(a), c2 = hexToRgb(b);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const bl = Math.round(c1.b + (c2.b - c1.b) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  // deterministik pseudo-random (sır konumları için)
  function hash01(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // ── Bölge parametreleri: x'e göre bölgeler arası pürüzsüz harman ───────────
  function paramsAt(x) {
    x = num(x, 0);
    const f = x / REGION_W;
    let i = Math.floor(f);
    if (i < 0) i = 0;
    const li = Math.min(i, REGIONS.length - 1);
    const ri = Math.min(i + 1, REGIONS.length - 1);
    const local = f - i;                              // 0..1 bölge içi konum
    // geçiş SADECE bölgenin son %20'sinde olsun → belirgin biome + yumuşak geçiş
    let w = local < 0.80 ? 0 : (local - 0.80) / 0.20;
    w = w * w * (3 - 2 * w);                          // smoothstep
    const A = REGIONS[li], B = REGIONS[ri];
    return {
      amp:  A.amp  + (B.amp  - A.amp)  * w,
      base: A.base + (B.base - A.base) * w,
      surface: (w < 0.5 ? A.surface : B.surface),
      g1: lerpColor(A.g1, B.g1, w),
      g2: lerpColor(A.g2, B.g2, w),
      sky:  lerpColor(A.sky,  B.sky,  w),
      sky2: lerpColor(A.sky2, B.sky2, w),
      regionIndex: li
    };
  }

  // ── Terrain yükseklik fonksiyonu (dünya-uzayı, y aşağı artar) ──────────────
  function heightAt(x) {
    x = num(x, 0);
    const p = paramsAt(x);
    // çok-oktavlı tepe şekli (−1..~1)
    const h = Math.sin(x * 0.0016) * 0.60
            + Math.sin(x * 0.0041 + 2.1) * 0.26
            + Math.sin(x * 0.0110 + 0.7) * 0.11;
    const y = GROUND_Y + p.base - p.amp * h;
    return num(y, GROUND_Y);
  }

  // Physics.step'in beklediği terrain proxy'si (mapId:null → MapSettings atlanır)
  function buildTerrain() {
    return {
      mapId: null,
      getYAt(x)      { return heightAt(x); },
      getSurfaceAt(x){ return paramsAt(x).surface; },
      getNormalAt(x) {
        const dx = 2;
        const y1 = heightAt(x - dx), y2 = heightAt(x + dx);
        const slope = (y2 - y1) / (dx * 2);
        const len = Math.sqrt(1 + slope * slope) || 1;
        return { x: -slope / len, y: 1 / len };
      }
    };
  }

  // ── Sır (gizli sandık) kataloğu — deterministik ───────────────────────────
  function secretX(k) {
    const step = WORLD_LEN / NUM_SECRETS;
    return 2600 + k * step + (hash01(k + 1) - 0.5) * step * 0.7;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════
  function init(vehicleId) {
    S.canvas = (typeof document !== 'undefined') ? document.getElementById('gameCanvas') : null;

    // seçili araç
    S.vehicleId = vehicleId
      || ((typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('selectedVehicle') || 'jeep') : 'jeep');

    // araç konfigürasyonu + fizik aracı
    let cfg;
    try {
      const upgrades = (typeof SaveData !== 'undefined' && SaveData.get)
        ? (SaveData.get('upgrades') || {})[S.vehicleId] : null;
      cfg = (typeof buildVehicleConfig === 'function')
        ? buildVehicleConfig(S.vehicleId, upgrades || { engine:1, suspension:1, tires:1, fuel:1 })
        : { w:100, h:50, mass:800, torque:5000, maxSpeed:500, fuelMax:100, fuelBurnRate:3,
            wheelPositions:[{x:-38,y:24,radius:20},{x:38,y:24,radius:20}] };
    } catch (e) {
      cfg = { w:100, h:50, mass:800, torque:5000, maxSpeed:500, fuelMax:100, fuelBurnRate:3,
              wheelPositions:[{x:-38,y:24,radius:20},{x:38,y:24,radius:20}] };
    }

    S.terrain = buildTerrain();

    S.startX = 200;
    const gy = heightAt(S.startX);
    const startY = gy - num(cfg.h || cfg.height, 50) - 12;
    S.vehicle = (typeof Physics !== 'undefined' && Physics.createVehicle)
      ? Physics.createVehicle(S.startX, startY, cfg)
      : { x:S.startX, y:startY, vx:0, vy:0, angle:0, angularVel:0, wheels:[],
          fuel:100, fuelMax:100, fuelBurnRate:3, throttle:0, brake:0, onGround:false, airTime:0 };

    // durum sıfırla
    S.input.throttle = S.input.brake = S.input.boost = 0;
    S.foundSecrets = {}; S.secretCount = 0;
    S.regionsDone = {}; S.stationsUsed = {};
    S.checkpoints = []; S.lastCheckpoint = { x:S.startX, y:startY };
    S.maxDist = 0; S.nextMilestone = MILESTONE_M;
    S.curRegion = 0;
    S.goldEarned = 0; S.diaEarned = 0;
    S.dead = false; S.deadT = 0;
    S.refuelFlash = 0; S.animT = 0;
    S.toast = null; S.toastT = 0;
    S.exit = false;

    // kalıcı: daha önce bulunmuş sırlar (SaveData üzerinden, guard'lı)
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const saved = SaveData.get('ow_secrets');
        if (saved && typeof saved === 'object') {
          S.foundSecrets = Object.assign({}, saved);
          S.secretCount = Object.keys(S.foundSecrets).length;
        }
      }
    } catch (e) {}

    // Kamera
    if (typeof Camera !== 'undefined') {
      if (S.canvas) { Camera.width = S.canvas.width; Camera.height = S.canvas.height; }
      if (Camera._setZoom) Camera._setZoom();
      if (Camera.snapTo) Camera.snapTo(S.vehicle);
    }

    bindInput();
    if (typeof Particles !== 'undefined' && Particles.init) { try { Particles.init(); } catch (e) {} }
    if (typeof Audio !== 'undefined') {
      try { if (Audio.resume) Audio.resume(); if (Audio.startEngine) Audio.startEngine(S.vehicleId); } catch (e) {}
    }

    S.active = true;
    showToast('AÇIK DÜNYA — Keşfetmeye başla! Sağ:GAZ  Sol:FREN  Boşluk:NİTRO');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GİRİŞ (kendi dinleyicileri — Game.controlState'ten bağımsız)
  // ═══════════════════════════════════════════════════════════════════════════
  function bindInput() {
    const cv = S.canvas;

    S._onKeyDown = function (e) {
      if (!S.active) return;
      switch (e.code) {
        case 'ArrowRight': case 'KeyD': S.input.throttle = 1; break;
        case 'ArrowLeft':  case 'KeyA': S.input.brake = 1; break;
        case 'Space': case 'ShiftLeft': case 'ShiftRight': case 'KeyX':
          e.preventDefault(); S.input.boost = 1; break;
        case 'KeyR': respawn(); break;                 // checkpoint'e dön
        case 'Escape': case 'KeyP': S.exit = true; break;
      }
      if (e.code.indexOf('Arrow') === 0) e.preventDefault();
    };
    S._onKeyUp = function (e) {
      switch (e.code) {
        case 'ArrowRight': case 'KeyD': S.input.throttle = 0; break;
        case 'ArrowLeft':  case 'KeyA': S.input.brake = 0; break;
        case 'Space': case 'ShiftLeft': case 'ShiftRight': case 'KeyX': S.input.boost = 0; break;
      }
    };

    // Dokunma / fare: sol %35 fren, orta nitro, sağ %25 gaz — + üst-sağ MENÜ butonu
    S._onPointerDown = function (e) {
      if (!S.active || !cv) return;
      const rect = cv.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      // MENÜ butonu (üst-sağ)
      if (S._menuBtn && px >= S._menuBtn.x && px <= S._menuBtn.x + S._menuBtn.w &&
          py >= S._menuBtn.y && py <= S._menuBtn.y + S._menuBtn.h) { S.exit = true; return; }
      const w = cv.width;
      if (px < w * 0.35) S.input.brake = 1;
      else if (px > w * 0.75) S.input.throttle = 1;
      else S.input.boost = 1;
    };
    S._onPointerUp = function () { S.input.throttle = 0; S.input.brake = 0; S.input.boost = 0; };
    S._onPointerCancel = S._onPointerUp;

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', S._onKeyDown);
      window.addEventListener('keyup', S._onKeyUp);
    }
    if (cv) {
      cv.addEventListener('mousedown', S._onPointerDown);
      cv.addEventListener('touchstart', S._onPointerDown, { passive:false });
      window.addEventListener('mouseup', S._onPointerUp);
      cv.addEventListener('touchend', S._onPointerUp);
      cv.addEventListener('touchcancel', S._onPointerCancel);
    }
  }
  function unbindInput() {
    const cv = S.canvas;
    if (typeof window !== 'undefined') {
      if (S._onKeyDown) window.removeEventListener('keydown', S._onKeyDown);
      if (S._onKeyUp) window.removeEventListener('keyup', S._onKeyUp);
      if (S._onPointerUp) window.removeEventListener('mouseup', S._onPointerUp);
    }
    if (cv) {
      if (S._onPointerDown) { cv.removeEventListener('mousedown', S._onPointerDown); cv.removeEventListener('touchstart', S._onPointerDown); }
      if (S._onPointerUp)   cv.removeEventListener('touchend', S._onPointerUp);
      if (S._onPointerCancel) cv.removeEventListener('touchcancel', S._onPointerCancel);
    }
    S._onKeyDown = S._onKeyUp = S._onPointerDown = S._onPointerUp = S._onPointerCancel = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  function update(dt) {
    if (!S.active) return;
    dt = num(dt, 0.016);
    if (dt <= 0) dt = 0.016;
    if (dt > 0.05) dt = 0.05;
    S.animT += dt;
    if (S.refuelFlash > 0) S.refuelFlash = Math.max(0, S.refuelFlash - dt);
    if (S.toastT > 0) { S.toastT -= dt; if (S.toastT <= 0) S.toast = null; }

    const v = S.vehicle;
    if (!v) return;

    // ── Ölüm/respawn akışı ──
    if (S.dead) {
      S.deadT += dt;
      if (S.deadT > 1.4) respawn();
      if (typeof Camera !== 'undefined' && Camera.follow) Camera.follow(v, dt);
      return;
    }

    // ── Girişi araca uygula ──
    v.throttle = S.input.throttle;
    v.brake    = S.input.brake;
    // Nitro/boost: fizik motoru boostActive iken itiş + yakıt uygular
    v.boostActive = (S.input.boost === 1 && num(v.boostFuel, 0) > 0);
    if (v.boostActive && typeof Audio !== 'undefined' && Audio.playBoost && !v._owBoostSfx) { try { Audio.playBoost(); } catch (e) {} v._owBoostSfx = true; }
    if (!v.boostActive) v._owBoostSfx = false;
    // boost yakıtı yenilenmesi (boost yokken yavaşça dolar)
    if (!v.boostActive) v.boostFuel = Math.min(num(v.boostMax, 140), num(v.boostFuel, 140) + 18 * dt);

    // ── Fizik adımı (yakıtı Physics.step tüketir) ──
    if (typeof Physics !== 'undefined' && Physics.step) {
      try { Physics.step(v, S.terrain, dt); } catch (e) {}
    }

    // ── NaN guard: pozisyon/hız/yakıt ──
    if (!isFinite(v.x) || !isFinite(v.y)) {
      const cp = S.lastCheckpoint || { x:S.startX, y:heightAt(S.startX) - 60 };
      v.x = num(cp.x, S.startX); v.y = num(cp.y, heightAt(S.startX) - 60);
      v.vx = 0; v.vy = 0; v.angle = 0; v.angularVel = 0;
    }
    v.vx = num(v.vx, 0); v.vy = num(v.vy, 0);
    v.fuel = Math.max(0, num(v.fuel, 0));
    if (v.fuel > num(v.fuelMax, 100)) v.fuel = v.fuelMax;

    // ── Keşif sistemleri ──
    updateFuel(v);
    updateCheckpoints(v);
    updateSecrets(v);
    updateRegions(v);
    updateMilestones(v);
    updateCrash(v, dt);

    // ── Kamera ──
    if (typeof Camera !== 'undefined' && Camera.follow) Camera.follow(v, dt);

    // motor sesi (varsa)
    if (typeof Audio !== 'undefined' && Audio.setThrottle) { try { Audio.setThrottle(v.throttle); } catch (e) {} }
  }

  // ── Yakıt istasyonları / bidonlar: yakına gelince doldur ──
  function updateFuel(v) {
    const fmax = num(v.fuelMax, 100);
    // en yakın istasyon
    const idx = Math.round(v.x / STATION_STEP);
    const sx = idx * STATION_STEP;
    if (idx > 0 && Math.abs(v.x - sx) < 130) {
      if (v.fuel < fmax) {
        v.fuel = Math.min(fmax, v.fuel + fmax * 1.4 * 0.016 * 3); // hızlı ama kademeli dolum
        S.refuelFlash = 0.4;
        if (!S.stationsUsed[idx]) {
          S.stationsUsed[idx] = true;
          if (typeof Audio !== 'undefined' && Audio.playCoin) { try { Audio.playCoin(); } catch (e) {} }
        }
      }
      spawnFx(sx, heightAt(sx) - 30, '#2ee66e');
    }
  }

  // ── Checkpoint'ler ──
  function updateCheckpoints(v) {
    const idx = Math.floor(v.x / CHECKPT_STEP);
    if (idx >= 1) {
      const cx = idx * CHECKPT_STEP;
      if (v.x >= cx && S.checkpoints.indexOf(idx) === -1) {
        S.checkpoints.push(idx);
        S.lastCheckpoint = { x: cx, y: heightAt(cx) - 60 };
        showToast('✓ Checkpoint ' + idx + ' — kaydedildi');
        if (typeof Audio !== 'undefined' && Audio.playCheckpoint) { try { Audio.playCheckpoint(); } catch (e) {} }
      }
    }
  }

  // ── Gizli sandıklar (sırlar) ──
  function updateSecrets(v) {
    // yalnız yakındaki katalog öğelerini kontrol et
    const step = WORLD_LEN / NUM_SECRETS;
    const kNear = Math.round((v.x - 2600) / step);
    for (let k = kNear - 1; k <= kNear + 1; k++) {
      if (k < 0 || k >= NUM_SECRETS) continue;
      if (S.foundSecrets[k]) continue;
      const cx = secretX(k);
      const cy = heightAt(cx) - 22;
      const dx = v.x - cx, dy = v.y - cy;
      if (dx * dx + dy * dy < 90 * 90) {
        S.foundSecrets[k] = true;
        S.secretCount = Object.keys(S.foundSecrets).length;
        persistSecrets();
        // ödül: altın + her 5 sırda 1 elmas
        const gold = 250 + Math.floor(hash01(k + 9) * 400);
        award(gold, (S.secretCount % 5 === 0) ? 1 : 0);
        const pct = Math.round(S.secretCount / NUM_SECRETS * 100);
        showToast('🎁 Gizli sandık! +⧆' + gold + ((S.secretCount % 5 === 0) ? ' +◆1' : '') + '   (Tamamlanma %' + pct + ')');
        if (typeof Audio !== 'undefined') { try { (Audio.playChest || Audio.playCoin || function(){})(); } catch (e) {} }
        spawnFx(cx, cy, '#ffd54a');
      }
    }
  }

  // ── Bölge tamamlama ──
  function updateRegions(v) {
    const r = Math.floor(v.x / REGION_W);
    if (r > S.curRegion) {
      // r-1 .. S.curRegion arası tamamlanan bölgeleri ödüllendir
      for (let i = S.curRegion; i < r && i < REGIONS.length; i++) {
        if (!S.regionsDone[i]) {
          S.regionsDone[i] = true;
          award(1000, 2);
          showToast('🏁 ' + REGIONS[i].name + ' bölgesi tamamlandı! +⧆1000 +◆2');
          if (typeof Audio !== 'undefined' && Audio.playModeWin) { try { Audio.playModeWin(); } catch (e) {} }
        }
      }
      S.curRegion = Math.min(r, REGIONS.length);
    }
  }

  // ── Mesafe kilometre taşları ──
  function updateMilestones(v) {
    const dist = Math.max(0, (v.x - S.startX) / PX_PER_M);
    if (dist > S.maxDist) S.maxDist = dist;
    while (S.maxDist >= S.nextMilestone) {
      const m = S.nextMilestone;
      const gold = 100 + Math.floor(m / MILESTONE_M) * 20;
      award(gold, 0);
      showToast('📏 ' + m + ' m! +⧆' + gold);
      S.nextMilestone += MILESTONE_M;
    }
  }

  // ── Kaza tespiti (ters dön + yerde kal) ──
  function updateCrash(v, dt) {
    if (v.dead) { triggerDeath(); return; }
    // gövde açısını normalize et (−PI..PI)
    let a = num(v.angle, 0) % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) > 2.0 && v.onGround) {           // ~115°'den fazla ters ve yerde
      v._owFlipT = (v._owFlipT || 0) + dt;
      if (v._owFlipT > 1.1) triggerDeath();
    } else {
      v._owFlipT = 0;
    }
  }

  function triggerDeath() {
    if (S.dead) return;
    S.dead = true; S.deadT = 0;
    if (S.vehicle) S.vehicle.dead = true;
    showToast('💥 Kaza! Son checkpoint\'e dönülüyor...');
    if (typeof Audio !== 'undefined' && Audio.playCrash) { try { Audio.playCrash(); } catch (e) {} }
    if (typeof Camera !== 'undefined' && Camera.shakeOnCrash) { try { Camera.shakeOnCrash(); } catch (e) {} }
  }

  function respawn() {
    const v = S.vehicle;
    if (!v) return;
    const cp = S.lastCheckpoint || { x:S.startX, y:heightAt(S.startX) - 60 };
    v.x = num(cp.x, S.startX);
    v.y = num(heightAt(v.x) - num(v.height || v.h, 50) - 12, GROUND_Y - 100);
    v.vx = 0; v.vy = 0; v.angle = 0; v.angularVel = 0;
    v.dead = false; v._owFlipT = 0;
    v.fuel = Math.max(v.fuel, num(v.fuelMax, 100) * 0.5);   // yarım depo garanti
    S.dead = false; S.deadT = 0;
    if (typeof Camera !== 'undefined' && Camera.snapTo) Camera.snapTo(v);
  }

  // ── Ödül dağıtımı (SaveData API, guard'lı) ──
  function award(gold, diamonds) {
    gold = Math.max(0, Math.floor(num(gold, 0)));
    diamonds = Math.max(0, Math.floor(num(diamonds, 0)));
    S.goldEarned += gold; S.diaEarned += diamonds;
    try {
      if (typeof SaveData !== 'undefined') {
        if (gold && SaveData.addGold) SaveData.addGold(gold);
        if (diamonds && SaveData.addDiamonds) SaveData.addDiamonds(diamonds);
      }
    } catch (e) {}
  }

  function persistSecrets() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('ow_secrets', S.foundSecrets);
    } catch (e) {}
  }

  function spawnFx(x, y, color) {
    if (typeof Particles === 'undefined') return;
    try {
      if (Particles.burst) Particles.burst(x, y, color, 6);
      else if (Particles.emit) Particles.emit(x, y, color);
    } catch (e) {}
  }

  function showToast(msg) { S.toast = msg; S.toastT = 3.2; }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAW (dünya-uzayı: Camera.apply içinde)
  // ═══════════════════════════════════════════════════════════════════════════
  function draw(ctx) {
    if (!S.active || !ctx) return;
    const cv = ctx.canvas;
    const W = cv.width, H = cv.height;
    const cam = (typeof Camera !== 'undefined') ? Camera : null;

    // ── Gökyüzü (bölge rengine göre) ──
    const centerX = cam ? cam.x + (W / (cam.zoom || 1)) * 0.5 : (S.vehicle ? S.vehicle.x : 0);
    const p = paramsAt(centerX);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, p.sky);
    sky.addColorStop(1, p.sky2);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    if (!cam || !cam.apply) return;
    cam.apply(ctx);

    // görünür x aralığı
    const zoom = cam.zoom || 1;
    const left  = cam.x - 60;
    const right = cam.x + W / zoom + 60;
    const bottom = cam.y + H / zoom + 400;

    drawTerrain(ctx, left, right, bottom, centerX);
    drawStations(ctx, left, right);
    drawCheckpoints(ctx, left, right);
    drawSecrets(ctx, left, right);

    // Parçacıklar (dünya-uzayı)
    if (typeof Particles !== 'undefined' && Particles.draw) { try { Particles.draw(ctx); } catch (e) {} }

    // ── Araç ──
    const v = S.vehicle;
    if (v) {
      ctx.save();
      if (S.dead) ctx.globalAlpha = 0.55;
      if (typeof drawVehicle === 'function') {
        try { drawVehicle(ctx, v, S.vehicleId, v.throttle, S.animT); }
        catch (e) { drawVehicleFallback(ctx, v); }
      } else {
        drawVehicleFallback(ctx, v);
      }
      ctx.restore();
    }

    cam.restore(ctx);
  }

  function drawTerrain(ctx, left, right, bottom, centerX) {
    const stepPx = 14;
    ctx.beginPath();
    ctx.moveTo(left, heightAt(left));
    for (let x = left; x <= right; x += stepPx) ctx.lineTo(x, heightAt(x));
    ctx.lineTo(right, bottom);
    ctx.lineTo(left, bottom);
    ctx.closePath();
    const p = paramsAt(centerX);
    const topY = heightAt(centerX);
    const grad = ctx.createLinearGradient(0, topY - 40, 0, topY + 500);
    grad.addColorStop(0, p.g1);
    grad.addColorStop(0.35, p.g2);
    grad.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = grad;
    ctx.fill();
    // yüzey çizgisi (crest)
    ctx.beginPath();
    ctx.moveTo(left, heightAt(left));
    for (let x = left; x <= right; x += stepPx) ctx.lineTo(x, heightAt(x));
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
  }

  function drawStations(ctx, left, right) {
    const first = Math.max(1, Math.floor(left / STATION_STEP));
    const last  = Math.ceil(right / STATION_STEP);
    for (let i = first; i <= last; i++) {
      const x = i * STATION_STEP;
      const gy = heightAt(x);
      ctx.save();
      ctx.translate(x, gy);
      // gövde
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-16, -46, 32, 46);
      ctx.fillStyle = '#ecf0f1';
      ctx.fillRect(-12, -40, 24, 14);
      ctx.fillStyle = '#2ee66e';
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText('⛽', 0, -30);
      // tabela
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-3, -70, 6, 24);
      ctx.beginPath(); ctx.arc(0, -74, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawCheckpoints(ctx, left, right) {
    const first = Math.max(1, Math.floor(left / CHECKPT_STEP));
    const last  = Math.ceil(right / CHECKPT_STEP);
    for (let i = first; i <= last; i++) {
      const x = i * CHECKPT_STEP;
      const gy = heightAt(x);
      const done = S.checkpoints.indexOf(i) !== -1;
      ctx.save();
      ctx.translate(x, gy);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -80); ctx.stroke();
      ctx.fillStyle = done ? '#2ee66e' : '#e74c3c';
      const fw = 34 + Math.sin(S.animT * 3 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(0, -80); ctx.lineTo(fw, -70); ctx.lineTo(0, -60);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawSecrets(ctx, left, right) {
    const step = WORLD_LEN / NUM_SECRETS;
    const kFrom = Math.max(0, Math.floor((left - 2600) / step) - 1);
    const kTo   = Math.min(NUM_SECRETS - 1, Math.ceil((right - 2600) / step) + 1);
    for (let k = kFrom; k <= kTo; k++) {
      if (S.foundSecrets[k]) continue;             // bulunanı gizle
      const cx = secretX(k);
      if (cx < left || cx > right) continue;
      const cy = heightAt(cx) - 18;
      // yalnız araç yeterince yaklaşınca hafif parıltıyla ipucu ver (gizli)
      const near = S.vehicle ? Math.abs(S.vehicle.x - cx) < 320 : false;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = near ? 0.9 : 0.28;         // uzaktayken neredeyse görünmez → gizli
      const bob = Math.sin(S.animT * 2 + k) * 3;
      ctx.translate(0, bob);
      // sandık
      ctx.fillStyle = '#8a5a2a';
      ctx.fillRect(-13, -12, 26, 20);
      ctx.fillStyle = '#c9922e';
      ctx.fillRect(-13, -12, 26, 6);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-3, -8, 6, 12);
      if (near) {
        ctx.globalAlpha = 0.5 + Math.sin(S.animT * 6) * 0.3;
        ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -2, 20, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawVehicleFallback(ctx, v) {
    ctx.save();
    ctx.translate(num(v.x, 0), num(v.y, 0));
    ctx.rotate(num(v.angle, 0));
    ctx.fillStyle = v.color || '#e67e22';
    const w = num(v.width || v.w, 100), h = num(v.height || v.h, 46);
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill();
    ctx.restore();
    // tekerler (dünya konumları fizik motorunca güncellenir)
    if (v.wheels) {
      ctx.fillStyle = '#111';
      v.wheels.forEach(function (wh) {
        ctx.beginPath();
        ctx.arc(num(wh.x, v.x), num(wh.y, v.y), num(wh.r || wh.radius, 18), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HUD (ekran-uzayı)
  // ═══════════════════════════════════════════════════════════════════════════
  function drawHUD(ctx, W, H) {
    if (!S.active || !ctx) return;
    W = num(W, ctx.canvas ? ctx.canvas.width : 800);
    H = num(H, ctx.canvas ? ctx.canvas.height : 600);
    const v = S.vehicle;

    // ── Yakıt çubuğu (üst-orta) ──
    const fmax = num(v && v.fuelMax, 100);
    const fuel = Math.max(0, num(v && v.fuel, 0));
    const fpct = fmax > 0 ? fuel / fmax : 0;
    const bw = Math.min(320, W * 0.42), bh = 18, bx = W / 2 - bw / 2, by = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(bx - 4, by - 4, bw + 8, bh + 8, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
    const fcol = fpct > 0.3 ? '#2ee66e' : (fpct > 0.12 ? '#f1c40f' : '#e74c3c');
    ctx.fillStyle = S.refuelFlash > 0 ? '#8effb0' : fcol;
    ctx.beginPath(); ctx.roundRect(bx, by, Math.max(0, bw * fpct), bh, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⛽ ' + Math.round(fuel) + ' / ' + Math.round(fmax), W / 2, by + bh / 2);
    ctx.restore();

    // ── Sol üst bilgi paneli ──
    const dist = Math.round(S.maxDist);
    const region = REGIONS[Math.min(S.curRegion, REGIONS.length - 1)];
    const pct = Math.round(S.secretCount / NUM_SECRETS * 100);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(10, 44, 210, 92, 10); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#8fd0ff'; ctx.font = 'bold 15px Arial';
    ctx.fillText('📍 ' + (region ? region.name : '—'), 22, 66);
    ctx.fillStyle = '#fff'; ctx.font = '13px Arial';
    ctx.fillText('Mesafe: ' + dist + ' m', 22, 86);
    ctx.fillText('🎁 Sırlar: ' + S.secretCount + ' / ' + NUM_SECRETS + '  (%' + pct + ')', 22, 105);
    ctx.fillStyle = '#ffd54a';
    ctx.fillText('⧆ ' + S.goldEarned + '   ◆ ' + S.diaEarned, 22, 124);
    ctx.restore();

    // ── MENÜ butonu (üst-sağ) ──
    const mbw = 74, mbh = 34, mbx = W - mbw - 10, mby = 44;
    S._menuBtn = { x:mbx, y:mby, w:mbw, h:mbh };
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(mbx, mby, mbw, mbh, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⬅ MENÜ', mbx + mbw / 2, mby + mbh / 2);
    ctx.restore();

    // ── Mini harita (alt-orta): bölge şeridi + oyuncu + checkpoint ──
    drawMiniMap(ctx, W, H);

    // ── Toast ──
    if (S.toast && S.toastT > 0) {
      ctx.save();
      const a = Math.min(1, S.toastT / 0.5) * Math.min(1, (3.2 - S.toastT) * 4);
      ctx.globalAlpha = Math.max(0, a);
      const tw = Math.min(W - 40, 520), th = 40;
      const tx = W / 2 - tw / 2, ty = H - 132;
      ctx.fillStyle = 'rgba(12,16,30,0.92)';
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 10); ctx.fill();
      ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 10); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(S.toast, W / 2, ty + th / 2);
      ctx.restore();
    }

    // ── Ölüm ipucu ──
    if (S.dead) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Checkpoint\'e dönülüyor...', W / 2, H / 2);
      ctx.restore();
    }
  }

  function drawMiniMap(ctx, W, H) {
    const mw = Math.min(W - 40, 460), mh = 14;
    const mx = W / 2 - mw / 2, my = H - 34;
    ctx.save();
    // bölge şeritleri
    for (let i = 0; i < REGIONS.length; i++) {
      const x0 = mx + (i / REGIONS.length) * mw;
      const seg = mw / REGIONS.length;
      ctx.fillStyle = S.regionsDone[i] ? REGIONS[i].g1 : lerpColor(REGIONS[i].g2, '#000000', 0.25);
      ctx.fillRect(x0, my, seg - 1.5, mh);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, mw, mh);
    // oyuncu işaretçisi
    const prog = S.vehicle ? Math.max(0, Math.min(1, S.vehicle.x / WORLD_LEN)) : 0;
    const px = mx + prog * mw;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px, my - 6); ctx.lineTo(px - 5, my - 14); ctx.lineTo(px + 5, my - 14);
    ctx.closePath(); ctx.fill();
    // bulunmuş sır işaretleri
    for (let k = 0; k < NUM_SECRETS; k++) {
      if (!S.foundSecrets[k]) continue;
      const sxp = mx + Math.max(0, Math.min(1, secretX(k) / WORLD_LEN)) * mw;
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath(); ctx.arc(sxp, my + mh + 4, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINISH
  // ═══════════════════════════════════════════════════════════════════════════
  function finish() {
    if (!S.active) return;
    persistSecrets();
    unbindInput();
    S.active = false; S.exit = false;
    if (typeof Audio !== 'undefined') {
      try { if (Audio.stopEngine) Audio.stopEngine(); } catch (e) {}
    }
  }

  // ── Genel API ──
  return {
    init:    init,
    update:  update,
    draw:    draw,
    drawHUD: drawHUD,
    finish:  finish,
    respawn: respawn,
    isActive:  function () { return S.active; },
    wantsExit: function () { return S.exit; },
    // hata ayıklama / entegrasyon için salt-okunur erişim
    _state:  S
  };
})();

if (typeof window !== 'undefined') window.OpenWorld = OpenWorld;
if (typeof module !== 'undefined' && module.exports) module.exports = OpenWorld;
