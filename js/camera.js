'use strict';
const Camera = {
  x: 0, y: 0,
  targetX: 0, targetY: 0,
  zoom: 1, targetZoom: 1,
  canvas: null,
  width: 800, height: 600,
  shakeMag: 0,
  // --- additive polish state (do not affect public API) ---
  _leadX: 0, _leadY: 0,          // smoothed + clamped velocity look-ahead
  _shakeT: 0,                    // shake oscillation phase
  _wasAirborne: false, _prevVy: 0, // landing/impact detection
  // --- additive cinematic flourish state (visual only; coordinate transforms untouched) ---
  tilt: 0,                       // exposed camera roll/lean into slopes (renderer MAY read; harmless if ignored — NOT used by worldToScreen/apply)
  _tiltTarget: 0,                // smoothed slope-lean target
  _zoomBase: undefined,          // smoothed base zoom; transient punch applied on top → this.zoom
  _zoomPunch: 0,                 // transient FOV/micro-zoom kick (+ punch-in on landing, − widen on big jump)
  // --- additive optional camera modes (visual only; coordinate transforms untouched) ---
  // 'follow' (default/unset) = EXACT current behavior. 'hero' = gentle victory/finish pan.
  // 'idle' = subtle menu/pause sway. Motion is applied as a tiny additive offset to this.x/this.y
  // (exactly like screen-shake) so worldToScreen/screenToWorld/apply stay mutually consistent —
  // the coordinate contract is never touched. Always respects reducedMotion.
  _camMode: 'follow',            // active mode; unset/'follow' → zero extra motion
  _camModeT: 0,                  // phase/time accumulator for the gentle oscillation
  _camModePrevX: 0, _camModePrevY: 0,  // last STANDALONE-applied offset (removed before re-apply)

  init(canvas) {
    this.canvas = canvas;
    this.width  = canvas.width;
    this.height = canvas.height;
    this._setZoom();
  },

  resize(w, h) {
    this.width = w; this.height = h;
    this._setZoom();
  },

  _setZoom() {
    // Daha yakın kamera → araçlar daha büyük görünür (900 → 750 mantıksal genişlik)
    this.zoom = this.width / 750;
    this.targetZoom = this.zoom;
  },

  // Snap instantly to vehicle (call on run start)
  snapTo(vehicle) {
    if (!vehicle) return;
    const wW = this.width  / this.zoom;
    const wH = this.height / this.zoom;
    this.targetX = vehicle.x - wW * 0.32;
    this.targetY = vehicle.y - wH * 0.50;
    this.x = this.targetX;
    this.y = this.targetY;
    // clear polish state so a fresh run doesn't inherit stale lead/shake
    this._leadX = 0; this._leadY = 0; this._vxFilt = undefined; this._vyFilt = undefined;
    this._shakeT = 0; this.shakeMag = 0;
    this._wasAirborne = !vehicle.onGround;
    this._prevVy = vehicle.vy || 0;
    this._vyFilt = vehicle.vy || 0;   // seed vertical-velocity filter for a clean start
    // reset cinematic flourish state → a fresh run starts at the current baseline behavior
    this.tilt = 0; this._tiltTarget = 0;
    this._zoomBase = this.zoom; this._zoomPunch = 0; this._zoomPrev = this.zoom;
    // reset optional camera-mode phase (mode itself is preserved; 'follow' default = no motion)
    this._camModeT = 0; this._camModePrevX = 0; this._camModePrevY = 0;
  },

  follow(vehicle, dt) {
    if (!vehicle) return;
    // Kare-bağımsız yumuşatmanın temeli: GÜVENLİ dt. Negatif/NaN/sıfır → sabit 1 kare;
    // spike (sekme/GC duraklaması) → 0.05'e kırp. Bu, tek karede ani sıçramayı (teleport)
    // engeller: prediction terimleri (vxS*dt, vyS*dt) ve tüm 1-e^(-rate*dt) easing'ler
    // artık sınırlı kalır. (main.js zaten 0.05'e kırpar; bu, follow'a özel ek güvence.)
    if (!(dt > 0)) dt = 0.016;
    else if (dt > 0.05) dt = 0.05;
    const wW = this.width  / this.zoom;
    const wH = this.height / this.zoom;

    // SIKI TAKİP + hafif hız-tabanlı öngörü. Araç temel olarak soldan %32, üstten %50.
    // Bir kare ileri tahmin (vx*dt) ile hız gecikmesini sıfırla → kamera asla arkada kalmaz.
    const vx = vehicle.vx || 0;
    const vy = vehicle.vy || 0;

    // Filtered HORIZONTAL velocity — frame-independent low-pass that removes per-frame
    // engine/wheel-slip vx noise during acceleration (the "hızlanırken kamera kasması"
    // source). Feeds the look-ahead, the one-frame X prediction and the speed-zoom so a
    // jittery vx no longer stutters the camera. Self-inits; reset in snapTo().
    if (this._vxFilt === undefined) this._vxFilt = vx;
    this._vxFilt += (vx - this._vxFilt) * (1 - Math.exp(-14 * dt));
    const vxS = this._vxFilt;

    // Filtered vertical velocity — frame-independent low-pass that kills per-frame
    // slope/bump noise while climbing (the uphill "stutter" source). Feeds the
    // vertical look-ahead + one-frame prediction so a bumpy vy no longer jerks the
    // camera. Self-inits on first use; reset in snapTo() so runs don't inherit it.
    if (this._vyFilt === undefined) this._vyFilt = vy;
    this._vyFilt += (vy - this._vyFilt) * (1 - Math.exp(-8 * dt));
    const vyS = this._vyFilt;

    // Look-ahead: hıza göre biraz ileriyi göster. SIKICA sınırlı → araç asla kadrajı terk etmez.
    // Yatay öngörü en fazla wW*0.16 → araç ekranda %16..%48 aralığında kalır (hep görünür).
    // Dikey öngörü en fazla wH*0.14 → araç ekranda %36..%64 aralığında kalır.
    const leadTime = 0.10;
    const maxLeadX = wW * 0.16;
    const maxLeadY = wH * 0.14;
    let desiredLeadX = vxS * leadTime;
    let desiredLeadY = vyS * leadTime;   // smoothed vy → no bump-driven vertical jitter uphill
    if (desiredLeadX >  maxLeadX) desiredLeadX =  maxLeadX;
    if (desiredLeadX < -maxLeadX) desiredLeadX = -maxLeadX;
    if (desiredLeadY >  maxLeadY) desiredLeadY =  maxLeadY;
    if (desiredLeadY < -maxLeadY) desiredLeadY = -maxLeadY;
    // Öngörüyü yumuşat (ani sıçrama yok) — kare bağımsız üstel easing.
    const leadEase = 1 - Math.exp(-6 * dt);
    this._leadX += (desiredLeadX - this._leadX) * leadEase;
    this._leadY += (desiredLeadY - this._leadY) * leadEase;

    this.targetX = (vehicle.x + vxS * dt + this._leadX) - wW * 0.32;   // filtrelenmiş vx → hızlanmada titreme yok
    this.targetY = (vehicle.y + vyS * dt + this._leadY) - wH * 0.50;   // smoothed vy prediction

    // Zoom (kamera modu: near/normal/wide/cinematic) — dikey-hız zoom'u KALDIRILDI (pompalama yoktu)
    const _camMult = (typeof Settings !== 'undefined' && Settings.cameraZoomMult) ? Settings.cameraZoomMult() : 1;
    const _mapZoom = (typeof MapSettings !== 'undefined' && typeof Game !== 'undefined' && Game.mapId) ? MapSettings.camZoomMult(Game.mapId) : 1;
    // Subtle speed-based zoom-out (additive, multiplies on top of cam/map zoom → contract intact).
    const baseZoom = (this.width / 900) * _camMult * (_mapZoom || 1) * this._speedZoomMult(vxS, vyS);
    if (!vehicle.onGround && vehicle.airTime > 0.5) this.targetZoom = baseZoom * 0.9;   // sadece uzun uçuşta hafif geniş
    else this.targetZoom = baseZoom;

    // Sıkı ve hızlı takip — araca kilitli. Yatay sıkı, dikey ise sıçrama/iniş için nazikçe yumuşatılır.
    // Tüm easing'ler kare bağımsız üstel yumuşatma (1 - e^(-rate*dt)) → değişken FPS'te takılma yok.
    const t = 1 - Math.exp(-18 * dt);          // yatay: sıkı ve araca kilitli
    this.x    += (this.targetX    - this.x)    * t;
    this.y    += (this.targetY    - this.y)    * this._verticalEase(dt, !vehicle.onGround);
    // Smooth the BASE zoom (unchanged rate/wiring). The transient FOV/micro-zoom punch is
    // applied on top afterwards → when the punch is 0 this.zoom === base → exact old behavior.
    if (this._zoomBase === undefined) this._zoomBase = this.zoom;   // self-init (idempotent)
    this._zoomBase += (this.targetZoom - this._zoomBase) * (1 - Math.exp(-4 * dt));

    // Gentle landing / impact shake — havadan yere geçişte iniş hızına göre.
    // Sadece follow()'a verilen araç durumundan tetiklenir (başka dosya gerekmez).
    const nowGround = !!vehicle.onGround;
    const _flr = this._flourishScale();          // 0 when OFF → degrades to exact current behavior
    if (nowGround && this._wasAirborne) {
      const impact = Math.max(0, this._prevVy);          // dokunuş anındaki aşağı hız
      if (impact > 130) {
        const mag = Math.min(9, (impact - 130) * 0.017); // yumuşak, sınırlı
        if (mag > this.shakeMag) this.shakeMag = mag;
        // Landing-impact micro-zoom: a subtle punch-IN on touchdown (visual scale only).
        if (_flr > 0) {
          const zp = Math.min(0.06, (impact - 130) * 0.00012) * _flr;
          if (zp > this._zoomPunch) this._zoomPunch = zp;
        }
      }
    }
    // Big-jump FOV punch: quick, subtle WIDEN the instant we leave the ground at speed.
    if (_flr > 0 && !nowGround && !this._wasAirborne) {
      const launch = Math.max(0, -vy);                   // upward speed at takeoff (vy<0 = up)
      if (launch > 160) {
        const zp = -Math.min(0.05, (launch - 160) * 0.0001) * _flr;   // negative = widen
        if (zp < this._zoomPunch) this._zoomPunch = zp;
      }
    }
    // Dışarıdan gelen trauma tabanlı shake() çağrılarını da follow'a köprüle (varsa).
    if (this._shake && this._shake.intensity > this.shakeMag) this.shakeMag = this._shake.intensity;
    this._wasAirborne = !nowGround;
    this._prevVy = vy;

    // ─── Finalize zoom: base * transient punch. BOTH apply() and worldToScreen() read
    // this.zoom, so they stay mutually consistent → screen↔world math is untouched. The
    // punch decays cleanly to 0 → this.zoom returns to base (current behavior).
    this._zoomPunch = this._decayZoomPunch(this._zoomPunch, dt);
    this.zoom = this._zoomBase * (1 + this._zoomPunch);
    // Ani zoom güvencesi: kare başına BAĞIL zoom değişimini sınırla (kare-bağımsız).
    // Base (rate 4) ve punch decay zaten yumuşak → bu yalnızca uç durumlar (mod/target
    // adımı, dt sekmesi) için emniyet ağı; normal akışta hiç tetiklenmez, davranışı bozmaz.
    if (this._zoomPrev === undefined) this._zoomPrev = this.zoom;
    const _zMaxRel = 3.5 * dt;                    // ~%6/kare @60fps → hiçbir zaman ani sıçrama yok
    const _zLo = this._zoomPrev * (1 - _zMaxRel);
    const _zHi = this._zoomPrev * (1 + _zMaxRel);
    if (this.zoom < _zLo) this.zoom = _zLo;
    else if (this.zoom > _zHi) this.zoom = _zHi;
    this._zoomPrev = this.zoom;

    // ─── Gentle slope-lean → this.tilt (renderer MAY read for a camera roll; NOT used by
    // apply()/worldToScreen, which never rotate — so exposing tilt cannot break the contract).
    let _tiltTarget = 0;
    if (_flr > 0 && nowGround) {
      const ang = vehicle.angle || 0;                    // vehicle body angle ≈ slope when grounded
      _tiltTarget = ang * 0.18 * _flr;
      const maxTilt = 0.05;                              // ~3° cap → subtle, never disorienting
      if (_tiltTarget >  maxTilt) _tiltTarget =  maxTilt;
      if (_tiltTarget < -maxTilt) _tiltTarget = -maxTilt;
    }
    this._tiltTarget = _tiltTarget;
    this.tilt += (this._tiltTarget - this.tilt) * (1 - Math.exp(-6 * dt));  // frame-independent ease

    // Screen shake — iki frekanslı yumuşak salınım + kare bağımsız sönümleme.
    // Accessibility: 'shake'===false → suppress entirely; 'reducedMotion' → damp magnitude.
    const _shakeOn    = this._shakeEnabled();                 // guarded (undefined→enabled)
    const _shakeScale = _shakeOn ? (this._reducedMotion() ? 0.35 : 1) : 0;
    if (_shakeOn && this.shakeMag > 0.3) {
      this._shakeT += dt;
      const s = this.shakeMag * _shakeScale;                  // calmer when reduced motion
      const ox = (Math.sin(this._shakeT * 47) + Math.sin(this._shakeT * 71) * 0.6) * 0.5;
      const oy = (Math.cos(this._shakeT * 53) + Math.sin(this._shakeT * 89) * 0.6) * 0.5;
      this.x += ox * s;
      this.y += oy * s * 0.7;
      this.shakeMag = this._decayShake(this.shakeMag, dt);  // frame-independent + clean cutoff
    } else {
      this.shakeMag = 0;                                      // suppressed or settled
    }

    // ─── Optional camera-mode motion (hero pan / idle sway). Applied LAST as a small
    // additive offset to this.x/this.y — same mechanism as shake above, so the screen↔world
    // math stays consistent. 'follow'/unset → offset is exactly (0,0) → current behavior.
    const _cm = this._camModeOffset(dt);
    this.x += _cm.dx;
    this.y += _cm.dy;
  },

  // ─── Accessibility guards (defensive; Settings may be undefined) ───
  // reducedMotion: calmer camera (damped shake + gentler speed-zoom). undefined→false.
  _reducedMotion() {
    try {
      return (typeof Settings !== 'undefined' && typeof Settings.get === 'function' &&
              Settings.get('reducedMotion') === true);
    } catch (e) { return false; }
  },
  // shake enabled unless Settings.get('shake') is explicitly false. undefined→enabled.
  _shakeEnabled() {
    try {
      return !(typeof Settings !== 'undefined' && typeof Settings.get === 'function' &&
               Settings.get('shake') === false);
    } catch (e) { return true; }
  },

  // ─── Cinematic flourish guards (opt-in; NEVER touch coordinate transforms) ───
  // Master enable: flourishes OFF (Settings.get('cinematicFX') === false) → exact current
  // behavior (scale 0). undefined Settings → enabled (defensive), same as the shake guard.
  _flourishEnabled() {
    try {
      return !(typeof Settings !== 'undefined' && typeof Settings.get === 'function' &&
               Settings.get('cinematicFX') === false);
    } catch (e) { return true; }
  },
  // Combined scale for ALL flourishes (tilt lean, FOV/micro-zoom punch):
  // 0 = off → degrade to current behavior; 0.35 = reducedMotion (calmer); 1 = full.
  _flourishScale() {
    if (!this._flourishEnabled()) return 0;
    return this._reducedMotion() ? 0.35 : 1;   // respects Settings.get('reducedMotion')
  },
  // Frame-independent decay for the transient FOV/micro-zoom punch, with a clean cutoff so it
  // settles exactly to 0 (this.zoom returns to base → no lingering scale drift).
  _decayZoomPunch(p, dt) {
    if (p > -0.0015 && p < 0.0015) return 0;
    p *= Math.pow(0.85, dt * 60);              // per-frame @60fps, kare bağımsız
    return (p > -0.0015 && p < 0.0015) ? 0 : p;
  },

  // ─── Additive cinematic smoothing helpers (opt-in; do NOT touch coordinate transforms) ───
  // Subtle speed-based zoom-out: faster travel → very slightly wider view. Returns a
  // multiplier in [1 - _speedZoomMax, 1] applied on top of cam_zoom/map_zoom (contract intact).
  _speedZoomMult(vx, vy) {
    if (this._speedZoomMax === undefined) {   // self-init tunables (idempotent)
      this._speedZoomMax   = 0.06;            // at most 6% wider at top speed
      this._speedZoomStart = 600;             // below this speed: no widening
      this._speedZoomRange = 1400;            // speed span to reach full widening
    }
    const spd = Math.sqrt(vx * vx + vy * vy);
    let t = (spd - this._speedZoomStart) / this._speedZoomRange;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    t = t * t * (3 - 2 * t);                   // smoothstep → no abrupt onset
    // Accessibility: reducedMotion → scale the widening way down (calmer, near-static view).
    const _rmScale = this._reducedMotion() ? 0.3 : 1;   // guarded (undefined→1, full effect)
    return 1 - this._speedZoomMax * t * _rmScale;
  },

  // Vertical follow easing: gentler than horizontal so jumps/landings feel soft, floatier
  // while airborne and a touch snappier on the ground. FRAME-RATE INDEPENDENT exponential
  // smoothing (was a raw per-frame lerp `rate*dt` → stuttered at variable FPS and lagged
  // the car uphill then snapped). factor = 1 - e^(-rate*dt); quick but jitter-free.
  _verticalEase(dt, airborne) {
    const rate = airborne ? 10 : 16;          // airborne: floaty; grounded: firm & responsive
    let e = 1 - Math.exp(-rate * dt);
    if (e > 1) e = 1; else if (e < 0) e = 0;
    return e;
  },

  // Frame-independent exponential shake decay with a clean cutoff to avoid lingering jitter.
  _decayShake(mag, dt) {
    if (mag <= 0.3) return 0;
    // Accessibility: reducedMotion → settle faster so residual jitter fades sooner.
    const _base = this._reducedMotion() ? 0.6 : 0.82;   // guarded (undefined→0.82, normal)
    mag *= Math.pow(_base, dt * 60);          // per-frame @60fps, kare bağımsız
    return mag < 0.3 ? 0 : mag;
  },

  shake(mag) { this.shakeMag = Math.max(this.shakeMag, mag); },

  apply(ctx) {
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  },

  restore(ctx) { ctx.restore(); },

  screenToWorld(sx, sy) {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  },

  worldToScreen(wx, wy) {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  },

  isVisible(wx, wy, margin) {
    margin = margin || 300;
    // PERF(31 Tmz): eskiden `this.worldToScreen(wx,wy)` cagrilirdi → HER CAGRIDA
    //   yeni bir {x,y} nesnesi ayriliyordu. `Terrain._drawCollectibles` bunu
    //   toplanmamis HER sikke icin cagirdigi icin olculen cop kare basina
    //   ~700 nesne (~16 KB) idi — DEVAM-OZETI'ndeki "Terrain.draw 15,7 KB/kare"
    //   israfinin kaynagi buydu. Matematik BIREBIR ayni (worldToScreen'in
    //   govdesi satir ici yazildi), yalnizca ara nesne ayrilmiyor.
    const sx = (wx - this.x) * this.zoom;
    const sy = (wy - this.y) * this.zoom;
    return sx > -margin && sx < this.width  + margin &&
           sy > -margin && sy < this.height + margin;
  }
,
  // ═══════════════════════════════════════════════════════════════
  // ADVANCED CAMERA EFFECTS
  // ═══════════════════════════════════════════════════════════════

  _shake:        { x: 0, y: 0, intensity: 0, decay: 0.88 },
  _flashAlpha:   0,
  _flashColor:   'rgba(255,255,255,1)',
  _flashDecay:   0.85,
  _zoomTarget:   1,
  _zoomCurrent:  1,
  _zoomSpeed:    0.06,
  _cinematicBars: 0,  // 0=no bars, 1=full cinematic
  _cinematicTarget: 0,
  _cinematicSpeed:  0.05,
  _rotation:     0,
  _rotationTarget: 0,
  _rotSpeed:     0.03,

  shake(intensity, duration) {
    this._shake.intensity = Math.max(this._shake.intensity, intensity);
  },

  flash(color, intensity) {
    this._flashAlpha = Math.max(this._flashAlpha, intensity || 1);
    this._flashColor = color || 'rgba(255,255,255,1)';
  },

  zoomTo(targetZoom, speed) {
    this._zoomTarget = Math.max(0.5, Math.min(3, targetZoom));
    if (speed) this._zoomSpeed = speed;
  },

  setCinematicBars(show) {
    this._cinematicTarget = show ? 1 : 0;
  },

  tiltTo(angle) {
    this._rotationTarget = angle;
  },

  update(dt, vehicleSpeed, isAirborne) {
    // Dynamic zoom based on speed
    const baseZoom = 1;
    const speedZoom = Math.max(0.7, 1 - Math.abs(vehicleSpeed) / 2000);
    const airZoom = isAirborne ? 0.92 : 1;
    this._zoomTarget = baseZoom * speedZoom * airZoom;
    this._zoomCurrent += (this._zoomTarget - this._zoomCurrent) * this._zoomSpeed;

    // Shake decay
    this._shake.intensity *= this._shake.decay;
    if (this._shake.intensity > 0.2) {
      this._shake.x = (Math.random() - 0.5) * this._shake.intensity * 2;
      this._shake.y = (Math.random() - 0.5) * this._shake.intensity;
    } else {
      this._shake.x = 0; this._shake.y = 0;
    }

    // Flash decay
    this._flashAlpha *= this._flashDecay;

    // Cinematic bars
    this._cinematicBars += (this._cinematicTarget - this._cinematicBars) * this._cinematicSpeed;

    // Rotation
    this._rotation += (this._rotationTarget - this._rotation) * this._rotSpeed;
  },

  applyTransform(ctx, camX, camY, W, H) {
    const cx = W / 2 + this._shake.x;
    const cy = H / 2 + this._shake.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this._zoomCurrent, this._zoomCurrent);
    if (Math.abs(this._rotation) > 0.001) {
      ctx.rotate(this._rotation);
    }
    ctx.translate(-camX - cx, -camY - cy);
  },

  drawOverlays(ctx, W, H) {
    // Flash
    if (this._flashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this._flashAlpha;
      ctx.fillStyle = this._flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Cinematic bars
    if (this._cinematicBars > 0.01) {
      const barH = H * 0.1 * this._cinematicBars;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, barH);
      ctx.fillRect(0, H - barH, W, barH);
    }
  },

  // ─── Parallax Layer Manager ─────────────────────────────────
  _parallaxLayers: [
    { speed: 0.05, drawFn: null }, // sky (no parallax)
    { speed: 0.15, drawFn: null }, // far mountains
    { speed: 0.35, drawFn: null }, // mid trees
    { speed: 0.60, drawFn: null }, // near objects
    { speed: 1.00, drawFn: null }, // foreground (same as camera)
  ],

  getParallaxOffset(layerIndex, camX) {
    const layer = this._parallaxLayers[layerIndex];
    return camX * (layer ? layer.speed : 1);
  },

  // ─── Camera Shake Presets ───────────────────────────────────
  shakeOnFlip()     { this.shake(6, 0.3); this.flash('rgba(255,255,200,0.3)', 0.3); },
  shakeOnCrash()    { this.shake(18, 0.6); this.flash('rgba(255,80,0,0.5)', 0.5); },
  shakeOnLand()     { this.shake(4, 0.2); },
  shakeOnNitro()    { this.shake(3, 0.15); this.flash('rgba(255,150,0,0.25)', 0.25); },
  shakeOnRankUp()   { this.shake(10, 0.5); this.flash('rgba(255,220,0,0.5)', 0.5); },
  shakeOnCollect()  { this.shake(2, 0.1); },

  // ─── Dolly / Pan Effects ────────────────────────────────────
  _panOffset: { x: 0, y: 0 },
  _panTarget: { x: 0, y: 0 },
  _panSpeed: 0.08,

  panTo(dx, dy) {
    this._panTarget.x = dx;
    this._panTarget.y = dy;
  },

  resetPan() {
    this._panTarget.x = 0;
    this._panTarget.y = 0;
  },

  updatePan() {
    this._panOffset.x += (this._panTarget.x - this._panOffset.x) * this._panSpeed;
    this._panOffset.y += (this._panTarget.y - this._panOffset.y) * this._panSpeed;
  },

  getPanOffset() { return this._panOffset; },

  // ─── Optional camera modes (additive; NEVER touch coordinate transforms) ───────────
  // Guarded setter. Valid: 'follow' (default = exact current behavior), 'hero' (gentle
  // victory/finish pan), 'idle' (subtle menu/pause sway). Unknown/empty → 'follow'.
  // Switching modes cleanly removes any leftover STANDALONE offset and resets the phase,
  // so the camera always returns to its neutral position. Returns true if the name was valid.
  setCamMode(name) {
    const ok = (name === 'follow' || name === 'hero' || name === 'idle');
    // Remove any offset previously applied by tickCamMode() so nothing lingers on switch.
    this.x -= this._camModePrevX || 0;
    this.y -= this._camModePrevY || 0;
    this._camModePrevX = 0; this._camModePrevY = 0;
    this._camModeT = 0;                       // restart oscillation from neutral
    this._camMode = ok ? name : 'follow';     // guard: bad input degrades to current behavior
    return ok;
  },

  // Read the active mode (never undefined).
  getCamMode() { return this._camMode || 'follow'; },

  // Pure additive offset for the active mode (world units). Returns {dx,dy}. 'follow'/unset
  // → {0,0} (current behavior). Respects reducedMotion (heavily damped) via the existing
  // _reducedMotion() guard. All motion is small, slow and frame-independent (time-based sines).
  _camModeOffset(dt) {
    const mode = this._camMode || 'follow';
    if (mode !== 'hero' && mode !== 'idle') return { dx: 0, dy: 0 };  // 'follow'/unknown → no motion
    const rm = this._reducedMotion() ? 0.25 : 1;  // accessibility: near-static when reduced motion
    this._camModeT += (dt || 0);
    const t = this._camModeT;
    if (mode === 'hero') {
      // Gentle victory/finish pan: slow horizontal drift + faint vertical breathing.
      return {
        dx: Math.sin(t * 0.35) * 22 * rm,
        dy: (Math.sin(t * 0.22) * 7 - 3) * rm
      };
    }
    // 'idle' — subtle menu/pause sway: two slow low-amplitude sines (never disorienting).
    return {
      dx: (Math.sin(t * 0.50) + Math.sin(t * 0.31) * 0.5) * 8 * rm,
      dy: (Math.cos(t * 0.43) + Math.sin(t * 0.27) * 0.5) * 5 * rm
    };
  },

  // Standalone driver for menu/pause frames where follow() is NOT running. Applies ONLY the
  // mode offset, removing the previously-applied one first so it can never accumulate/drift.
  // Safe no-op in 'follow' mode (offset is {0,0}). Never call together with follow() on the
  // same frame (follow() applies its own offset and self-corrects via its lerp).
  tickCamMode(dt) {
    this.x -= this._camModePrevX || 0;
    this.y -= this._camModePrevY || 0;
    const _cm = this._camModeOffset(dt);
    this.x += _cm.dx; this.y += _cm.dy;
    this._camModePrevX = _cm.dx; this._camModePrevY = _cm.dy;
  }

};

// ═══════════════════════════════════════════════════════════════════════════
// SİNEMATİK KAMERA SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const CinematicCamera = {
  CINEMATIC_MODES: {
    orbital: {
      desc: 'Aracın etrafında döner',
      orbitRadius: 200,
      orbitSpeed: 0.8,
      heightOffset: -80,
      zoomLevel: 0.7
    },
    tracking: {
      desc: 'Araç arkasından takip eder',
      followDistance: 250,
      heightOffset: -60,
      leadFactor: 0.3,
      zoomLevel: 0.9
    },
    dramatic: {
      desc: 'Dramatik açı, düşük yükseklik',
      heightOffset: 20,
      tiltAngle: 0.15,
      zoomLevel: 1.1,
      shakeIntensity: 0.5
    },
    bird_eye: {
      desc: 'Kuş bakışı açısı',
      heightOffset: -400,
      zoomLevel: 0.4,
      followSmoothness: 0.03
    },
    first_person: {
      desc: 'Birinci şahıs görünümü',
      offsetX: 10,
      offsetY: -20,
      zoomLevel: 1.5,
      fovEffect: true
    },
    cockpit: {
      desc: 'Kokpit içi görünüm',
      offsetX: 0,
      offsetY: -15,
      zoomLevel: 1.3,
      dashboardOverlay: true,
      headBob: true
    }
  },

  _currentMode: null,
  _modeParams: {},
  _modeTime: 0,
  _transitionActive: false,
  _transitionProgress: 0,
  _targetMode: null,

  setCinematicMode(mode, params = {}) {
    if (!this.CINEMATIC_MODES[mode]) {
      console.warn(`[CinematicCamera] Unknown mode: ${mode}`);
      return false;
    }
    if (this._currentMode !== mode) {
      this._targetMode = mode;
      this._transitionActive = true;
      this._transitionProgress = 0;
    }
    this._modeParams = { ...this.CINEMATIC_MODES[mode], ...params };
    this._modeTime = 0;
    console.log(`[CinematicCamera] Mode set: ${mode}`);
    return true;
  },

  updateCinematic(dt, vehicle) {
    this._modeTime += dt;
    if (this._transitionActive) {
      this._transitionProgress += dt * 2;
      if (this._transitionProgress >= 1) {
        this._transitionProgress = 1;
        this._transitionActive = false;
        this._currentMode = this._targetMode;
      }
    }
    const mode = this._currentMode;
    if (!mode || !vehicle) return;
    const params = this._modeParams;
    if (mode === 'orbital') {
      const angle = this._modeTime * params.orbitSpeed;
      this._orbitX = vehicle.x + Math.cos(angle) * params.orbitRadius;
      this._orbitY = (vehicle.y || 0) + params.heightOffset;
    } else if (mode === 'tracking') {
      this._trackX = vehicle.x - params.followDistance + vehicle.vx * params.leadFactor;
      this._trackY = (vehicle.y || 0) + params.heightOffset;
    } else if (mode === 'bird_eye') {
      this._birdX = vehicle.x;
      this._birdY = (vehicle.y || 0) + params.heightOffset;
    }
  },

  getCinematicOffset(vehicle) {
    const mode = this._currentMode;
    if (!mode) return { x: 0, y: 0, zoom: 1 };
    const params = this._modeParams;
    if (mode === 'first_person' || mode === 'cockpit') {
      const bob = params.headBob ? Math.sin(this._modeTime * 8) * 2 : 0;
      return { x: params.offsetX, y: params.offsetY + bob, zoom: params.zoomLevel };
    }
    return { x: 0, y: params.heightOffset || 0, zoom: params.zoomLevel || 1 };
  },

  drawCockpitOverlay(ctx, W, H) {
    if (this._currentMode !== 'cockpit') return;
    ctx.save();
    // Dashboard frame
    const grad = ctx.createLinearGradient(0, H * 0.7, 0, H);
    grad.addColorStop(0, 'rgba(20,20,20,0)');
    grad.addColorStop(1, 'rgba(10,10,10,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    // Steering wheel
    const cx = W / 2, cy = H * 0.88;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48);
      ctx.stroke();
    }
    // Speedometer circle
    const smX = W * 0.75, smY = H * 0.85;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(smX, smY, 35, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(smX, smY, 32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// LENS EFEKTLERİ
// ═══════════════════════════════════════════════════════════════════════════
const LensEffects = {
  LENS_EFFECTS: {
    bokeh: {
      desc: 'Bulanık arka plan efekti',
      apply(ctx, W, H, intensity) {
        ctx.save();
        ctx.globalAlpha = intensity * 0.15;
        for (let i = 0; i < 12; i++) {
          const x = (Math.sin(i * 1.3) * 0.5 + 0.5) * W;
          const y = (Math.cos(i * 0.9) * 0.5 + 0.5) * H;
          const r = 15 + Math.sin(i * 2.1) * 10;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(255,255,220,0.6)');
          g.addColorStop(1, 'rgba(255,255,220,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    },
    chromatic_aberration: {
      desc: 'Renksel sapma efekti',
      apply(ctx, W, H, intensity) {
        // Simulated via colored border glow
        ctx.save();
        ctx.globalAlpha = intensity * 0.08;
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.strokeRect(intensity * 3, intensity * 3, W - intensity * 6, H - intensity * 6);
        ctx.strokeStyle = '#0000FF';
        ctx.strokeRect(-intensity * 2, -intensity * 2, W + intensity * 4, H + intensity * 4);
        ctx.restore();
      }
    },
    vignette: {
      desc: 'Kenar kararma efekti',
      apply(ctx, W, H, intensity) {
        ctx.save();
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${intensity * 0.7})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
    film_grain: {
      desc: 'Film grenli efekti',
      apply(ctx, W, H, intensity) {
        ctx.save();
        ctx.globalAlpha = intensity * 0.05;
        const imageData = ctx.getImageData(0, 0, W, H);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 60 * intensity;
          data[i]     = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
      }
    },
    lens_flare: {
      desc: 'Güneş parlaması efekti',
      apply(ctx, W, H, intensity, sunX, sunY) {
        if (!sunX) { sunX = W * 0.8; sunY = H * 0.15; }
        ctx.save();
        // Main flare
        const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80 * intensity);
        g.addColorStop(0, `rgba(255,255,255,${intensity * 0.9})`);
        g.addColorStop(0.3, `rgba(255,200,100,${intensity * 0.4})`);
        g.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sunX, sunY, 80 * intensity, 0, Math.PI * 2); ctx.fill();
        // Streak flares
        const streaks = [
          { ox: -0.2, oy: 0.15, r: 20 }, { ox: -0.4, oy: 0.3, r: 15 },
          { ox: 0.3, oy: -0.2, r: 25 },  { ox: 0.5, oy: -0.35, r: 12 }
        ];
        for (const streak of streaks) {
          const fx = sunX + streak.ox * W;
          const fy = sunY + streak.oy * H;
          ctx.globalAlpha = intensity * 0.3;
          ctx.fillStyle = 'rgba(200,180,255,0.5)';
          ctx.beginPath(); ctx.arc(fx, fy, streak.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
  },

  _activeEffects: {},

  applyLensEffect(ctx, W, H, effect, intensity = 1.0) {
    const def = this.LENS_EFFECTS[effect];
    if (!def) return false;
    def.apply(ctx, W, H, intensity);
    return true;
  },

  enableEffect(effect, intensity = 1.0) {
    if (this.LENS_EFFECTS[effect]) {
      this._activeEffects[effect] = { intensity, enabled: true };
    }
  },

  disableEffect(effect) {
    delete this._activeEffects[effect];
  },

  applyAllActive(ctx, W, H) {
    for (const [effect, state] of Object.entries(this._activeEffects)) {
      if (state.enabled) {
        this.applyLensEffect(ctx, W, H, effect, state.intensity);
      }
    }
  },

  setIntensity(effect, intensity) {
    if (this._activeEffects[effect]) {
      this._activeEffects[effect].intensity = Math.max(0, Math.min(1, intensity));
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GEÇİŞ EFEKTLERİ
// ═══════════════════════════════════════════════════════════════════════════
const TransitionSystem = {
  TRANSITION_EFFECTS: {
    fade: {
      draw(ctx, W, H, progress) {
        const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
    wipe: {
      draw(ctx, W, H, progress) {
        ctx.save();
        ctx.fillStyle = '#000000';
        if (progress < 0.5) {
          ctx.fillRect(0, 0, W * (progress * 2), H);
        } else {
          const p = (progress - 0.5) * 2;
          ctx.fillRect(W * p, 0, W * (1 - p), H);
        }
        ctx.restore();
      }
    },
    zoom: {
      draw(ctx, W, H, progress) {
        ctx.save();
        const scale = progress < 0.5 ? 1 + progress * 2 : 1 + (1 - progress) * 2;
        ctx.globalAlpha = Math.abs(progress - 0.5) * 2;
        ctx.translate(W / 2, H / 2);
        ctx.scale(scale, scale);
        ctx.translate(-W / 2, -H / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
    spiral: {
      draw(ctx, W, H, progress) {
        ctx.save();
        ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
        ctx.translate(W / 2, H / 2);
        ctx.rotate(progress * Math.PI * 4);
        ctx.scale(progress * 3 + 0.1, progress * 3 + 0.1);
        ctx.translate(-W / 2, -H / 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }
  },

  _active: null,

  playTransition(type, duration, callback) {
    const def = this.TRANSITION_EFFECTS[type];
    if (!def) return false;
    this._active = {
      type, duration, callback,
      elapsed: 0,
      draw: def.draw,
      done: false
    };
    return true;
  },

  updateTransition(dt) {
    if (!this._active || this._active.done) return false;
    this._active.elapsed += dt;
    if (this._active.elapsed >= this._active.duration) {
      this._active.done = true;
      if (this._active.callback) this._active.callback();
      return false;
    }
    return true;
  },

  drawTransition(ctx, W, H) {
    if (!this._active || this._active.done) return;
    const progress = this._active.elapsed / this._active.duration;
    this._active.draw(ctx, W, H, progress);
  },

  isActive() { return this._active !== null && !this._active.done; }
};

// ═══════════════════════════════════════════════════════════════════════════
// REPLAY KAMERA SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const ReplayCamera = {
  _frames: [],
  _maxFrames: 3600, // 60 seconds at 60fps
  _recording: false,
  _playing: false,
  _playIndex: 0,
  _highlightFrame: null,

  startRecording() {
    this._frames = [];
    this._recording = true;
    console.log('[ReplayCamera] Recording started');
  },

  stopRecording() {
    this._recording = false;
    this._highlightFrame = this._findHighlightFrame();
    console.log(`[ReplayCamera] Recording stopped. ${this._frames.length} frames captured`);
  },

  recordFrame(vehicle) {
    if (!this._recording) return;
    const frame = {
      x: vehicle.x,
      y: vehicle.y || 0,
      vx: vehicle.vx || 0,
      vy: vehicle.vy || 0,
      angle: vehicle.angle || 0,
      score: vehicle.score || 0,
      flips: vehicle.flips || 0,
      speed: vehicle.speed || 0,
      timestamp: Date.now()
    };
    this._frames.push(frame);
    if (this._frames.length > this._maxFrames) {
      this._frames.shift();
    }
  },

  playReplay(frames) {
    this._frames = frames || this._frames;
    this._playing = true;
    this._playIndex = 0;
    console.log(`[ReplayCamera] Playing ${this._frames.length} frames`);
  },

  getNextReplayFrame() {
    if (!this._playing || this._frames.length === 0) return null;
    if (this._playIndex >= this._frames.length) {
      this._playing = false;
      return null;
    }
    return this._frames[this._playIndex++];
  },

  getHighlightFrame() {
    return this._highlightFrame;
  },

  _findHighlightFrame() {
    if (this._frames.length === 0) return null;
    let best = this._frames[0];
    for (const frame of this._frames) {
      if ((frame.speed > best.speed) || (frame.flips > best.flips)) {
        best = frame;
      }
    }
    return best;
  },

  isRecording() { return this._recording; },
  isPlaying() { return this._playing; },
  getFrameCount() { return this._frames.length; },
  getFrames() { return [...this._frames]; },
  stopPlayback() { this._playing = false; this._playIndex = 0; }
};

// ═══════════════════════════════════════════════════════════════════════════
// GELİŞMİŞ KAMERA MATEMATİĞİ
// ═══════════════════════════════════════════════════════════════════════════
const CameraAdvanced = {
  _shakeLayersAdv: [],
  _targetEntity: null,
  _viewMatrix: { a:1, b:0, c:0, d:1, tx:0, ty:0 },

  setTarget(entity) {
    this._targetEntity = entity;
    console.log('[CameraAdvanced] Target set:', entity?.id || 'entity');
  },

  addShakeLayer(intensity, frequency, duration) {
    this._shakeLayersAdv.push({
      intensity, frequency, duration,
      elapsed: 0,
      id: Date.now() + Math.random()
    });
  },

  updateShakeLayers(dt) {
    this._shakeLayersAdv = this._shakeLayersAdv.filter(layer => {
      layer.elapsed += dt;
      return layer.elapsed < layer.duration;
    });
    let totalX = 0, totalY = 0;
    for (const layer of this._shakeLayersAdv) {
      const t = layer.elapsed;
      const decay = 1 - (t / layer.duration);
      totalX += Math.sin(t * layer.frequency * Math.PI * 2) * layer.intensity * decay;
      totalY += Math.cos(t * layer.frequency * Math.PI * 2 * 1.3) * layer.intensity * decay;
    }
    return { x: totalX, y: totalY };
  },

  getViewMatrix() {
    const entity = this._targetEntity;
    if (!entity) return this._viewMatrix;
    this._viewMatrix.tx = -entity.x;
    this._viewMatrix.ty = -(entity.y || 0);
    return { ...this._viewMatrix };
  },

  worldToScreen(wx, wy, canvasW, canvasH, zoom = 1) {
    const mat = this._viewMatrix;
    const sx = (wx + mat.tx) * mat.a * zoom + canvasW / 2;
    const sy = (wy + mat.ty) * mat.d * zoom + canvasH / 2;
    return { x: sx, y: sy };
  },

  screenToWorld(sx, sy, canvasW, canvasH, zoom = 1) {
    const mat = this._viewMatrix;
    const wx = (sx - canvasW / 2) / (mat.a * zoom) - mat.tx;
    const wy = (sy - canvasH / 2) / (mat.d * zoom) - mat.ty;
    return { x: wx, y: wy };
  },

  // Advanced zoom system
  _zoomState: { current: 1, target: 1, speed: 3, min: 0.3, max: 3.0 },

  setZoom(target, speed) {
    this._zoomState.target = Math.max(this._zoomState.min, Math.min(this._zoomState.max, target));
    if (speed !== undefined) this._zoomState.speed = speed;
  },

  updateZoom(dt) {
    const diff = this._zoomState.target - this._zoomState.current;
    this._zoomState.current += diff * this._zoomState.speed * dt;
    return this._zoomState.current;
  },

  getZoom() { return this._zoomState.current; },

  // Pan system
  _panState: { x: 0, y: 0, targetX: 0, targetY: 0, speed: 5 },

  panTo(x, y, speed) {
    this._panState.targetX = x;
    this._panState.targetY = y;
    if (speed !== undefined) this._panState.speed = speed;
  },

  updatePanAdv(dt) {
    this._panState.x += (this._panState.targetX - this._panState.x) * this._panState.speed * dt;
    this._panState.y += (this._panState.targetY - this._panState.y) * this._panState.speed * dt;
    return { x: this._panState.x, y: this._panState.y };
  },

  resetPanAdv() {
    this._panState.targetX = 0;
    this._panState.targetY = 0;
  },

  // Tilt system
  _tiltState: { angle: 0, targetAngle: 0, speed: 2 },

  setTilt(angle, speed) {
    this._tiltState.targetAngle = angle;
    if (speed !== undefined) this._tiltState.speed = speed;
  },

  updateTilt(dt) {
    this._tiltState.angle += (this._tiltState.targetAngle - this._tiltState.angle) * this._tiltState.speed * dt;
    return this._tiltState.angle;
  },

  getTilt() { return this._tiltState.angle; },
  resetTilt() { this._tiltState.targetAngle = 0; }
};


// =============================================================================
// CAMERA MODES SYSTEM
// Extended camera mode management with smooth transitions
// =============================================================================

const CAMERA_MODES = {
    // Mode constants
    FOLLOW:     'follow',
    CINEMATIC:  'cinematic',
    BIRD_EYE:   'bird_eye',
    COCKPIT:    'cockpit',
    REPLAY:     'replay',
    SPECTATOR:  'spectator',

    // Current active mode
    currentMode: 'follow',

    // Transition state
    _transitionActive: false,
    _transitionProgress: 0,
    _transitionDuration: 0.4,
    _fromMode: null,
    _toMode: null,
    _transitionCallback: null,

    // Per-mode configuration settings
    _modeSettings: {
        follow: {
            offsetX: 0,
            offsetY: -60,
            stiffness: 0.12,
            damping: 0.85,
            zoomLevel: 1.0,
            rotationFollow: false,
            lookAhead: true,
            lookAheadStrength: 1.0,
            shakeMult: 1.0,
            description: 'Standard follow camera behind the vehicle'
        },
        cinematic: {
            offsetX: 0,
            offsetY: -120,
            stiffness: 0.05,
            damping: 0.92,
            zoomLevel: 0.75,
            rotationFollow: false,
            lookAhead: true,
            lookAheadStrength: 0.6,
            shakeMult: 0.5,
            description: 'Slow, dramatic cinematic tracking shot'
        },
        bird_eye: {
            offsetX: 0,
            offsetY: 0,
            stiffness: 0.08,
            damping: 0.88,
            zoomLevel: 0.45,
            rotationFollow: false,
            lookAhead: false,
            lookAheadStrength: 0.0,
            shakeMult: 0.2,
            description: 'Top-down aerial overview of the scene'
        },
        cockpit: {
            offsetX: 0,
            offsetY: -20,
            stiffness: 0.25,
            damping: 0.78,
            zoomLevel: 1.3,
            rotationFollow: true,
            lookAhead: true,
            lookAheadStrength: 1.4,
            shakeMult: 1.8,
            description: 'First-person driver perspective from inside the cockpit'
        },
        replay: {
            offsetX: 0,
            offsetY: -80,
            stiffness: 0.07,
            damping: 0.90,
            zoomLevel: 0.85,
            rotationFollow: false,
            lookAhead: false,
            lookAheadStrength: 0.0,
            shakeMult: 0.3,
            description: 'Smooth replay playback camera'
        },
        spectator: {
            offsetX: 0,
            offsetY: -90,
            stiffness: 0.10,
            damping: 0.87,
            zoomLevel: 0.9,
            rotationFollow: false,
            lookAhead: true,
            lookAheadStrength: 0.8,
            shakeMult: 0.6,
            description: 'Detached spectator view, free-floating'
        }
    },

    /**
     * Smoothly switches the camera to a new mode.
     * @param {string} mode  - One of the CAMERA_MODES constants
     * @param {object} vehicle - The vehicle object (used to seed transition state)
     * @param {function} [callback] - Optional callback fired when transition completes
     */
    setCameraMode(mode, vehicle, callback) {
        if (!this._modeSettings[mode]) {
            console.warn('[CAMERA_MODES] Unknown mode:', mode);
            return;
        }
        if (mode === this.currentMode && !this._transitionActive) {
            return; // Already in this mode and not transitioning
        }

        this._fromMode = this.currentMode;
        this._toMode = mode;
        this._transitionActive = true;
        this._transitionProgress = 0;
        this._transitionCallback = callback || null;

        // Determine transition duration based on how different the modes are
        const from = this._modeSettings[this._fromMode];
        const to   = this._modeSettings[mode];
        const zoomDelta = Math.abs((from ? from.zoomLevel : 1.0) - to.zoomLevel);
        this._transitionDuration = 0.3 + zoomDelta * 0.5; // longer for bigger zoom changes

        this.currentMode = mode;

        if (typeof ZOOM_SYSTEM !== 'undefined') {
            ZOOM_SYSTEM.smoothZoom(to.zoomLevel, this._transitionDuration, 'easeInOut');
        }
    },

    /**
     * Returns the settings object for a given mode (or current mode if not specified).
     * @param {string} [mode]
     * @returns {object} Mode configuration
     */
    getModeSettings(mode) {
        const key = mode || this.currentMode;
        const settings = this._modeSettings[key];
        if (!settings) {
            console.warn('[CAMERA_MODES] getModeSettings: unknown mode', key);
            return this._modeSettings['follow'];
        }

        // If transitioning, interpolate between from/to settings
        if (this._transitionActive && this._fromMode && this._toMode === key) {
            const fromSettings = this._modeSettings[this._fromMode];
            const t = this._easeInOut(this._transitionProgress);
            return {
                offsetX:          this._lerp(fromSettings.offsetX,          settings.offsetX,          t),
                offsetY:          this._lerp(fromSettings.offsetY,          settings.offsetY,          t),
                stiffness:        this._lerp(fromSettings.stiffness,        settings.stiffness,        t),
                damping:          this._lerp(fromSettings.damping,          settings.damping,          t),
                zoomLevel:        this._lerp(fromSettings.zoomLevel,        settings.zoomLevel,        t),
                rotationFollow:   t > 0.5 ? settings.rotationFollow : fromSettings.rotationFollow,
                lookAhead:        t > 0.5 ? settings.lookAhead      : fromSettings.lookAhead,
                lookAheadStrength:this._lerp(fromSettings.lookAheadStrength, settings.lookAheadStrength, t),
                shakeMult:        this._lerp(fromSettings.shakeMult,        settings.shakeMult,        t),
                description:      settings.description
            };
        }

        return Object.assign({}, settings);
    },

    /**
     * Call each frame to advance mode transitions.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this._transitionActive) return;
        this._transitionProgress += dt / this._transitionDuration;
        if (this._transitionProgress >= 1.0) {
            this._transitionProgress = 1.0;
            this._transitionActive   = false;
            if (typeof this._transitionCallback === 'function') {
                this._transitionCallback(this.currentMode);
                this._transitionCallback = null;
            }
        }
    },

    // Utility: linear interpolation
    _lerp(a, b, t) { return a + (b - a) * t; },

    // Utility: smooth easing
    _easeInOut(t) {
        return t < 0.5
            ? 2 * t * t
            : -1 + (4 - 2 * t) * t;
    },

    /** Returns true if currently transitioning between modes */
    isTransitioning() { return this._transitionActive; },

    /** Returns current transition progress 0-1 */
    getTransitionProgress() { return this._transitionProgress; }
};


// =============================================================================
// CINEMATIC SYSTEM
// Hollywood-style cut sequences, letterboxing, and automated camera choreography
// =============================================================================

const CINEMATIC_SYSTEM = {

    isPlaying:       false,
    currentSequence: null,
    sequenceIndex:   0,
    sequenceTimer:   0,
    _onComplete:     null,
    _vehicle:        null,
    _letterboxAlpha: 0,          // 0 = no bars, 1 = full bars
    _letterboxTarget: 0,
    _activeShots:    null,

    /**
     * Predefined cinematic cut sequences.
     * Each shot: { duration, angle, zoom, offsetX, offsetY, description }
     *   duration  - seconds this shot lasts
     *   angle     - camera rotation offset in degrees
     *   zoom      - zoom multiplier (1 = normal)
     *   offsetX/Y - world-space offset from vehicle centre
     *   shake     - trauma amount to add at start of shot (0-1)
     */
    CUT_SEQUENCES: {
        crash: [
            { duration: 0.08, angle:   0, zoom: 1.2,  offsetX:   0, offsetY:  -50, shake: 0.9,  description: 'Impact freeze frame' },
            { duration: 0.40, angle:  15, zoom: 1.5,  offsetX:  80, offsetY: -120, shake: 0.0,  description: 'Side angle pull back' },
            { duration: 0.55, angle: -10, zoom: 0.85, offsetX: -60, offsetY:  -90, shake: 0.3,  description: 'Wide establishing shot' },
            { duration: 0.35, angle:   5, zoom: 1.8,  offsetX:  20, offsetY:  -30, shake: 0.2,  description: 'Close debris detail' },
            { duration: 0.60, angle:   0, zoom: 1.0,  offsetX:   0, offsetY:  -60, shake: 0.0,  description: 'Return to follow' }
        ],
        victory: [
            { duration: 0.50, angle:   0, zoom: 0.6,  offsetX:   0, offsetY: -200, shake: 0.0,  description: 'High wide celebration' },
            { duration: 0.70, angle:  20, zoom: 1.1,  offsetX: 120, offsetY:  -80, shake: 0.0,  description: 'Dramatic side pan' },
            { duration: 0.80, angle: -20, zoom: 1.1,  offsetX:-120, offsetY:  -80, shake: 0.0,  description: 'Mirror side pan' },
            { duration: 1.00, angle:   0, zoom: 0.75, offsetX:   0, offsetY: -140, shake: 0.0,  description: 'Slow zoom out reveal' },
            { duration: 0.60, angle:   0, zoom: 1.0,  offsetX:   0, offsetY:  -60, shake: 0.0,  description: 'Resume follow' }
        ],
        start: [
            { duration: 0.30, angle:   0, zoom: 0.5,  offsetX:   0, offsetY: -300, shake: 0.0,  description: 'Aerial race start overview' },
            { duration: 0.50, angle:  -8, zoom: 0.8,  offsetX:-100, offsetY: -120, shake: 0.0,  description: 'Side track reveal' },
            { duration: 0.40, angle:   0, zoom: 1.2,  offsetX:   0, offsetY:  -40, shake: 0.4,  description: 'Engine rev close-up' },
            { duration: 0.20, angle:   0, zoom: 1.0,  offsetX:   0, offsetY:  -60, shake: 0.8,  description: 'Launch shock' }
        ],
        flip: [
            { duration: 0.12, angle:  45, zoom: 1.3,  offsetX:  60, offsetY:  -70, shake: 0.6,  description: 'Dutch tilt flip moment' },
            { duration: 0.35, angle: -30, zoom: 1.1,  offsetX: -40, offsetY: -100, shake: 0.2,  description: 'Counter-angle' },
            { duration: 0.50, angle:   0, zoom: 0.9,  offsetX:   0, offsetY:  -80, shake: 0.0,  description: 'Wide settle' }
        ],
        nearMiss: [
            { duration: 0.10, angle:   8, zoom: 1.6,  offsetX:  30, offsetY:  -40, shake: 0.5,  description: 'Tight near-miss zoom' },
            { duration: 0.30, angle:  -5, zoom: 1.2,  offsetX: -20, offsetY:  -70, shake: 0.1,  description: 'Reaction shot' },
            { duration: 0.40, angle:   0, zoom: 1.0,  offsetX:   0, offsetY:  -60, shake: 0.0,  description: 'Return' }
        ]
    },

    /**
     * Plays a named cinematic sequence.
     * @param {string}   name       - Key into CUT_SEQUENCES
     * @param {object}   vehicle    - Active vehicle
     * @param {function} onComplete - Fired when last shot ends
     */
    playSequence(name, vehicle, onComplete) {
        const shots = this.CUT_SEQUENCES[name];
        if (!shots || shots.length === 0) {
            console.warn('[CINEMATIC_SYSTEM] Unknown sequence:', name);
            if (typeof onComplete === 'function') onComplete();
            return;
        }

        this.isPlaying       = true;
        this.currentSequence = name;
        this._activeShots    = shots;
        this.sequenceIndex   = 0;
        this.sequenceTimer   = 0;
        this._vehicle        = vehicle;
        this._onComplete     = onComplete || null;
        this._letterboxTarget = 1;

        // Trigger first shot immediately
        this._applyShot(shots[0]);

        if (typeof CAMERA_MODES !== 'undefined') {
            CAMERA_MODES.setCameraMode(CAMERA_MODES.CINEMATIC, vehicle);
        }
    },

    /**
     * Update the cinematic sequence. Call each frame.
     * @param {number} dt - Delta time in seconds
     */
    updateSequence(dt) {
        // Always update letterbox fade
        const lbSpeed = 3.5;
        if (this._letterboxAlpha < this._letterboxTarget) {
            this._letterboxAlpha = Math.min(this._letterboxAlpha + dt * lbSpeed, this._letterboxTarget);
        } else if (this._letterboxAlpha > this._letterboxTarget) {
            this._letterboxAlpha = Math.max(this._letterboxAlpha - dt * lbSpeed, this._letterboxTarget);
        }

        if (!this.isPlaying || !this._activeShots) return;

        this.sequenceTimer += dt;
        const shot = this._activeShots[this.sequenceIndex];

        if (!shot) {
            this._endSequence();
            return;
        }

        if (this.sequenceTimer >= shot.duration) {
            this.sequenceTimer -= shot.duration;
            this.sequenceIndex++;

            if (this.sequenceIndex >= this._activeShots.length) {
                this._endSequence();
            } else {
                this._applyShot(this._activeShots[this.sequenceIndex]);
            }
        }
    },

    /** Internal: apply a shot's settings */
    _applyShot(shot) {
        if (!shot) return;

        if (shot.shake > 0 && typeof CAMERA_SHAKE_EXT !== 'undefined') {
            CAMERA_SHAKE_EXT.addTrauma(shot.shake);
        }

        if (typeof ZOOM_SYSTEM !== 'undefined') {
            ZOOM_SYSTEM.smoothZoom(shot.zoom, shot.duration * 0.8, 'easeInOut');
        }
    },

    /** Internal: finish sequence, restore camera */
    _endSequence() {
        this.isPlaying        = false;
        this.currentSequence  = null;
        this._activeShots     = null;
        this.sequenceIndex    = 0;
        this.sequenceTimer    = 0;
        this._letterboxTarget = 0;

        if (typeof CAMERA_MODES !== 'undefined') {
            CAMERA_MODES.setCameraMode(CAMERA_MODES.FOLLOW, this._vehicle);
        }

        const cb = this._onComplete;
        this._onComplete = null;
        if (typeof cb === 'function') cb();
    },

    /**
     * Draws cinema-style letterbox bars (top and bottom black rectangles).
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W     - Canvas width
     * @param {number} H     - Canvas height
     * @param {number} alpha - Opacity override (0-1); if omitted uses internal alpha
     */
    drawLetterbox(ctx, W, H, alpha) {
        const a = (alpha !== undefined) ? alpha : this._letterboxAlpha;
        if (a <= 0) return;

        const barH = Math.round(H * 0.12 * a); // 12% of screen height per bar
        ctx.save();
        ctx.globalAlpha = 1.0; // Bars are fully opaque (alpha controls bar height)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, barH);
        ctx.fillRect(0, H - barH, W, barH);
        ctx.restore();
    },

    /**
     * Returns the current shot object (or null if not playing).
     * @returns {object|null}
     */
    getCurrentShot() {
        if (!this.isPlaying || !this._activeShots) return null;
        return this._activeShots[this.sequenceIndex] || null;
    },

    /**
     * Returns normalised progress within the current shot (0-1).
     */
    getShotProgress() {
        const shot = this.getCurrentShot();
        if (!shot) return 0;
        return Math.min(this.sequenceTimer / shot.duration, 1);
    }
};


// =============================================================================
// CAMERA SHAKE EXTENSIONS  (CAMERA_SHAKE_EXT)
// Trauma-based shake with Perlin-like noise for organic feel
// =============================================================================

const CAMERA_SHAKE_EXT = {

    traumaLevel: 0,        // 0 = no shake, 1 = max shake
    _traumaMax:  1.0,
    _time:       0,

    // Shake magnitude settings
    maxOffsetX:  28,        // pixels
    maxOffsetY:  20,        // pixels
    maxAngle:    3.5,       // degrees

    // Perlin-like noise state (simple hash-based)
    _noiseTable: null,
    _noiseSize:  256,

    /** Initialise the noise lookup table (call once, or lazily). */
    _initNoise() {
        if (this._noiseTable) return;
        this._noiseTable = new Float32Array(this._noiseSize);
        // Seeded pseudo-random using xorshift
        let s = 0xDEADBEEF;
        for (let i = 0; i < this._noiseSize; i++) {
            s ^= s << 13; s ^= s >> 17; s ^= s << 5;
            this._noiseTable[i] = ((s >>> 0) / 0xFFFFFFFF) * 2 - 1; // -1 to 1
        }
    },

    /**
     * Adds trauma. Values are clamped to [0, 1].
     * @param {number} amount - Amount of trauma to add (0-1)
     */
    addTrauma(amount) {
        this.traumaLevel = Math.min(this._traumaMax, this.traumaLevel + amount);
    },

    /**
     * Decays the trauma level over time.
     * @param {number} dt        - Delta time in seconds
     * @param {number} decayRate - How fast trauma fades (units/sec, e.g. 0.8)
     */
    decayTrauma(dt, decayRate) {
        const rate = (decayRate !== undefined) ? decayRate : 0.85;
        this.traumaLevel = Math.max(0, this.traumaLevel - rate * dt);
    },

    /**
     * Samples a Perlin-like noise value at time t for a given channel seed.
     * @param {number} t    - Time value
     * @param {number} seed - Integer seed to differentiate X/Y/angle channels
     * @returns {number} Value in [-1, 1]
     */
    perlinShake(t, seed) {
        this._initNoise();
        seed = (seed || 0) & 0xFF;
        const freq  = 18.0;               // oscillation frequency
        const fi    = t * freq;
        const i0    = Math.floor(fi) & (this._noiseSize - 1);
        const i1    = (i0 + 1)        & (this._noiseSize - 1);
        const frac  = fi - Math.floor(fi);
        // Smoothstep interpolation
        const blend = frac * frac * (3 - 2 * frac);
        const n0    = this._noiseTable[(i0 + seed) & (this._noiseSize - 1)];
        const n1    = this._noiseTable[(i1 + seed) & (this._noiseSize - 1)];
        return n0 + (n1 - n0) * blend;
    },

    /**
     * Computes the shake offset from the current trauma level.
     * Uses trauma^2 so small trauma = very small shake.
     * @param {number} t - Current time (seconds) used to sample noise
     * @returns {{ x: number, y: number, angle: number }}
     */
    getShakeOffset(t) {
        this._time = t || this._time;
        if (this.traumaLevel <= 0) return { x: 0, y: 0, angle: 0 };

        const shake = this.traumaLevel * this.traumaLevel; // square for nicer feel
        const nx    = this.perlinShake(this._time, 0);
        const ny    = this.perlinShake(this._time, 64);
        const na    = this.perlinShake(this._time, 128);

        return {
            x:     nx * this.maxOffsetX * shake,
            y:     ny * this.maxOffsetY * shake,
            angle: na * this.maxAngle   * shake
        };
    },

    /**
     * Update (advance internal time). Call once per frame.
     * @param {number} dt - Delta time in seconds
     * @param {number} [decayRate=0.85]
     */
    update(dt, decayRate) {
        this._time += dt;
        this.decayTrauma(dt, decayRate);
    },

    /** Returns true if currently shaking (trauma > 0). */
    isShaking() { return this.traumaLevel > 0.001; },

    /** Instantly zeroes out trauma. */
    clearTrauma() { this.traumaLevel = 0; }
};


// =============================================================================
// ZOOM SYSTEM
// Smooth zoom transitions and speed-reactive dynamic zoom
// =============================================================================

const ZOOM_SYSTEM = {

    currentZoom: 1.0,
    targetZoom:  1.0,

    // Transition state
    _zoomVelocity:     0,
    _zoomDuration:     0,
    _zoomElapsed:      0,
    _zoomFrom:         1.0,
    _zoomTo:           1.0,
    _zoomEasing:       'easeInOut',
    _zoomTransitioning: false,

    // Dynamic zoom state
    _dynamicEnabled:   true,
    _baseZoom:         1.0,

    ZOOM_PRESETS: {
        normal:     1.0,
        race:       0.85,
        cinematic:  0.7,
        overview:   0.4,
        cockpit:    1.3,
        extreme:    1.6
    },

    /**
     * Start a smooth zoom transition to a target zoom level.
     * @param {number} target   - Target zoom value
     * @param {number} duration - Transition time in seconds
     * @param {string} easing   - 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'elastic'
     */
    smoothZoom(target, duration, easing) {
        this._zoomFrom         = this.currentZoom;
        this._zoomTo           = Math.max(0.15, Math.min(4.0, target));
        this._zoomDuration     = Math.max(0.01, duration || 0.3);
        this._zoomElapsed      = 0;
        this._zoomEasing       = easing || 'easeInOut';
        this._zoomTransitioning = true;
        this.targetZoom        = this._zoomTo;
    },

    /**
     * Adjusts zoom based on vehicle speed — faster = zoom out.
     * @param {object} vehicle - Vehicle with .vx, .vy (or .speed) properties
     */
    dynamicZoom(vehicle) {
        if (!vehicle) return;

        const speed = vehicle.speed !== undefined
            ? vehicle.speed
            : Math.sqrt((vehicle.vx || 0) * (vehicle.vx || 0) + (vehicle.vy || 0) * (vehicle.vy || 0));

        // Map speed to zoom: 0 speed = 1.0, highSpeed = 0.72
        const maxSpeed  = 900;
        const minZoom   = 0.72;
        const maxZoom   = 1.05;
        const t         = Math.min(speed / maxSpeed, 1.0);
        const zoomCurve = 1 - (t * t); // ease-out speed response
        const newTarget = minZoom + (maxZoom - minZoom) * zoomCurve;

        // Only update if not in a deliberate timed transition
        if (!this._zoomTransitioning) {
            this.targetZoom = this._baseZoom * newTarget;
        }
    },

    /**
     * Update zoom each frame. Call in your main camera update loop.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this._zoomTransitioning) {
            this._zoomElapsed += dt;
            const t = Math.min(this._zoomElapsed / this._zoomDuration, 1.0);
            const easedT = this._applyEasing(t, this._zoomEasing);
            this.currentZoom = this._zoomFrom + (this._zoomTo - this._zoomFrom) * easedT;

            if (t >= 1.0) {
                this.currentZoom       = this._zoomTo;
                this._zoomTransitioning = false;
            }
        } else {
            // Spring towards target when not in timed transition
            const diff = this.targetZoom - this.currentZoom;
            if (Math.abs(diff) > 0.0001) {
                this.currentZoom += diff * 0.1;
            } else {
                this.currentZoom = this.targetZoom;
            }
        }
    },

    /**
     * Applies a named easing function to value t in [0,1].
     * @param {number} t
     * @param {string} easing
     * @returns {number} eased value
     */
    _applyEasing(t, easing) {
        switch (easing) {
            case 'linear':
                return t;
            case 'easeIn':
                return t * t * t;
            case 'easeOut':
                return 1 - Math.pow(1 - t, 3);
            case 'easeInOut':
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case 'elastic': {
                const c4 = (2 * Math.PI) / 3;
                if (t === 0) return 0;
                if (t === 1) return 1;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            }
            case 'bounce': {
                const n1 = 7.5625, d1 = 2.75;
                if (t < 1/d1)        return n1 * t * t;
                else if (t < 2/d1)  { t -= 1.5/d1;   return n1 * t * t + 0.75; }
                else if (t < 2.5/d1){ t -= 2.25/d1;  return n1 * t * t + 0.9375; }
                else                 { t -= 2.625/d1; return n1 * t * t + 0.984375; }
            }
            default:
                return t;
        }
    },

    /** Set the base zoom level (used with dynamic zoom multiplier). */
    setBaseZoom(zoom) {
        this._baseZoom   = Math.max(0.15, Math.min(4.0, zoom));
        this.targetZoom  = this._baseZoom;
    },

    /** Instantly jump to zoom level without transition. */
    snapZoom(zoom) {
        this.currentZoom        = Math.max(0.15, Math.min(4.0, zoom));
        this.targetZoom         = this.currentZoom;
        this._zoomTransitioning = false;
    },

    /** Returns true if currently in a timed zoom transition. */
    isTransitioning() { return this._zoomTransitioning; }
};


// =============================================================================
// DEADZONE SYSTEM
// Keeps vehicle inside a deadzone before camera starts tracking
// =============================================================================

const DEADZONE_SYSTEM = {

    // Deadzone rectangle in normalised canvas coordinates (0-1)
    deadzone: {
        x: 0.30,   // left edge (fraction of canvas width)
        y: 0.25,   // top edge
        w: 0.40,   // width
        h: 0.50    // height
    },

    _enabled: true,
    _debugColour: 'rgba(0, 255, 180, 0.18)',

    /**
     * Configure the deadzone rectangle.
     * All values are normalised 0-1 fractions of canvas dimensions.
     */
    setDeadzone(x, y, w, h) {
        this.deadzone.x = x;
        this.deadzone.y = y;
        this.deadzone.w = w;
        this.deadzone.h = h;
    },

    /**
     * Returns updated camera position based on deadzone logic.
     * The camera only moves when the vehicle exits the deadzone.
     *
     * @param {object} vehicle  - Has .x, .y world coordinates
     * @param {number} cameraX  - Current camera X (world)
     * @param {number} cameraY  - Current camera Y (world)
     * @param {number} canvasW  - Canvas pixel width
     * @param {number} canvasH  - Canvas pixel height
     * @returns {{ x: number, y: number }} New camera position
     */
    updateWithDeadzone(vehicle, cameraX, cameraY, canvasW, canvasH) {
        if (!this._enabled) return { x: cameraX, y: cameraY };

        const W = canvasW  || 800;
        const H = canvasH  || 500;
        const dz = this.deadzone;

        // Deadzone bounds in world coords relative to camera
        const dzLeft   = cameraX + dz.x * W;
        const dzRight  = cameraX + (dz.x + dz.w) * W;
        const dzTop    = cameraY + dz.y * H;
        const dzBottom = cameraY + (dz.y + dz.h) * H;

        let newCamX = cameraX;
        let newCamY = cameraY;

        // Push camera so vehicle stays inside deadzone
        if (vehicle.x < dzLeft) {
            newCamX = vehicle.x - dz.x * W;
        } else if (vehicle.x > dzRight) {
            newCamX = vehicle.x - (dz.x + dz.w) * W;
        }

        if (vehicle.y < dzTop) {
            newCamY = vehicle.y - dz.y * H;
        } else if (vehicle.y > dzBottom) {
            newCamY = vehicle.y - (dz.y + dz.h) * H;
        }

        return { x: newCamX, y: newCamY };
    },

    /**
     * Returns true if vehicle screen position is within the deadzone.
     * @param {number} vx   - Vehicle screen X
     * @param {number} vy   - Vehicle screen Y
     * @param {number} camX - Camera origin X (screen)
     * @param {number} camY - Camera origin Y (screen)
     * @param {number} W    - Canvas width
     * @param {number} H    - Canvas height
     */
    isInDeadzone(vx, vy, camX, camY, W, H) {
        const dz = this.deadzone;
        const cx = (vx - camX) / (W || 800);
        const cy = (vy - camY) / (H || 500);
        return cx >= dz.x && cx <= dz.x + dz.w
            && cy >= dz.y && cy <= dz.y + dz.h;
    },

    /**
     * Draws the deadzone as a debug overlay rectangle.
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} debug - Only draws when true
     * @param {number}  W     - Canvas width
     * @param {number}  H     - Canvas height
     */
    drawDeadzone(ctx, debug, W, H) {
        if (!debug) return;
        const dz = this.deadzone;
        const w  = W || 800;
        const h  = H || 500;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space

        // Filled rect
        ctx.fillStyle = this._debugColour;
        ctx.fillRect(dz.x * w, dz.y * h, dz.w * w, dz.h * h);

        // Stroke
        ctx.strokeStyle = 'rgba(0, 255, 180, 0.75)';
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(dz.x * w, dz.y * h, dz.w * w, dz.h * h);

        // Label
        ctx.setLineDash([]);
        ctx.fillStyle   = 'rgba(0, 255, 180, 0.9)';
        ctx.font        = '11px monospace';
        ctx.fillText('DEADZONE', dz.x * w + 4, dz.y * h + 14);
        ctx.restore();
    },

    /** Enable or disable the deadzone system. */
    setEnabled(enabled) { this._enabled = !!enabled; },
    isEnabled()         { return this._enabled; }
};


// =============================================================================
// PREDICTIVE FOLLOW
// Look-ahead camera that anticipates vehicle movement direction
// =============================================================================

const PREDICTIVE_FOLLOW = {

    lookAheadAmount: 150,      // base look-ahead distance in world units
    smoothLookAhead: 0,        // interpolated current look-ahead value
    _smoothX:        0,        // current interpolated X look-ahead offset
    _smoothY:        0,        // current interpolated Y look-ahead offset
    _prevVx:         0,
    _prevVy:         0,
    _smoothing:      0.10,     // lerp factor per frame (lower = smoother)

    /**
     * Calculates look-ahead distance scaled by vehicle speed.
     * @param {object} vehicle - Vehicle with .vx, .vy or .speed
     * @returns {number} Scaled look-ahead distance
     */
    predictAheadDistance(vehicle) {
        if (!vehicle) return this.lookAheadAmount;

        const speed = vehicle.speed !== undefined
            ? vehicle.speed
            : Math.sqrt((vehicle.vx || 0) * (vehicle.vx || 0) + (vehicle.vy || 0) * (vehicle.vy || 0));

        // Scale look-ahead: minimum at rest, grows with speed
        const maxSpeed = 900;
        const minLook  = 40;
        const t        = Math.min(speed / maxSpeed, 1.0);
        return minLook + (this.lookAheadAmount - minLook) * (t * t);
    },

    /**
     * Returns the target X position with look-ahead applied.
     * @param {object} vehicle - Vehicle with .x, .vx properties
     * @param {number} amount  - Look-ahead distance override
     * @returns {number} Target camera X world position
     */
    lookAheadX(vehicle, amount) {
        if (!vehicle) return 0;
        const dist  = amount !== undefined ? amount : this.predictAheadDistance(vehicle);
        const speed = Math.sqrt((vehicle.vx || 0) * (vehicle.vx || 0) + (vehicle.vy || 0) * (vehicle.vy || 0));
        if (speed < 0.01) return vehicle.x;

        const nx = (vehicle.vx || 0) / speed; // normalised direction X
        return vehicle.x + nx * dist;
    },

    /**
     * Returns the target Y position with look-ahead applied.
     * @param {object} vehicle - Vehicle with .y, .vy properties
     * @param {number} amount  - Look-ahead distance override
     * @returns {number} Target camera Y world position
     */
    lookAheadY(vehicle, amount) {
        if (!vehicle) return 0;
        const dist  = amount !== undefined ? amount : this.predictAheadDistance(vehicle);
        const speed = Math.sqrt((vehicle.vx || 0) * (vehicle.vx || 0) + (vehicle.vy || 0) * (vehicle.vy || 0));
        if (speed < 0.01) return vehicle.y;

        const ny = (vehicle.vy || 0) / speed;
        return vehicle.y + ny * dist;
    },

    /**
     * Updates the smoothed look-ahead values. Call once per frame.
     * @param {object} vehicle - Active vehicle
     * @param {number} dt      - Delta time in seconds
     */
    updateLookAhead(vehicle, dt) {
        if (!vehicle) return;

        const dist   = this.predictAheadDistance(vehicle);
        const speed  = Math.sqrt((vehicle.vx || 0) * (vehicle.vx || 0) + (vehicle.vy || 0) * (vehicle.vy || 0));
        let targetX  = 0;
        let targetY  = 0;

        if (speed > 0.5) {
            const nx = (vehicle.vx || 0) / speed;
            const ny = (vehicle.vy || 0) / speed;
            targetX  = nx * dist;
            targetY  = ny * dist;
        }

        // Smooth the look-ahead to avoid jitter on direction changes
        const lerpFactor = Math.min(1, this._smoothing * (dt / (1/60)));
        this._smoothX += (targetX - this._smoothX) * lerpFactor;
        this._smoothY += (targetY - this._smoothY) * lerpFactor;

        // Store scalar distance for external queries
        this.smoothLookAhead = Math.sqrt(this._smoothX * this._smoothX + this._smoothY * this._smoothY);

        this._prevVx = vehicle.vx || 0;
        this._prevVy = vehicle.vy || 0;
    },

    /**
     * Returns the current smooth look-ahead offset as a vector.
     * @returns {{ x: number, y: number }}
     */
    getOffset() {
        return { x: this._smoothX, y: this._smoothY };
    },

    /** Reset look-ahead to zero (e.g. on respawn). */
    reset() {
        this._smoothX        = 0;
        this._smoothY        = 0;
        this.smoothLookAhead = 0;
    }
};


// =============================================================================
// CAMERA BOUNDS
// Constrains camera to world boundaries with soft clamping near edges
// =============================================================================

const CAMERA_BOUNDS = {

    bounds: {
        minX: -Infinity,
        maxX:  Infinity,
        minY: -Infinity,
        maxY:  Infinity
    },

    hasBounds: false,

    // Soft-margin: camera slows near edges instead of hard-snapping
    _softMargin:  120,   // world units
    _softStrength: 0.25, // how strongly the soft push applies

    /**
     * Sets the world-space camera bounds.
     * Pass Infinity/-Infinity to remove a limit on that axis.
     */
    setBounds(minX, maxX, minY, maxY) {
        this.bounds.minX = minX !== undefined ? minX : -Infinity;
        this.bounds.maxX = maxX !== undefined ? maxX :  Infinity;
        this.bounds.minY = minY !== undefined ? minY : -Infinity;
        this.bounds.maxY = maxY !== undefined ? maxY :  Infinity;
        this.hasBounds   = isFinite(minX) || isFinite(maxX) || isFinite(minY) || isFinite(maxY);
    },

    /** Remove all bounds (camera moves freely). */
    clearBounds() {
        this.setBounds(-Infinity, Infinity, -Infinity, Infinity);
        this.hasBounds = false;
    },

    /**
     * Hard-clamps camera position to the configured bounds.
     * @param {number} x - Desired camera X
     * @param {number} y - Desired camera Y
     * @returns {{ x: number, y: number }} Clamped position
     */
    clampToBounds(x, y) {
        if (!this.hasBounds) return { x, y };
        return {
            x: Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x)),
            y: Math.max(this.bounds.minY, Math.min(this.bounds.maxY, y))
        };
    },

    /**
     * Soft-clamped version — the camera approaches the boundary but
     * is nudged back smoothly rather than hard-snapping.
     * @param {number} x
     * @param {number} y
     * @returns {{ x: number, y: number }}
     */
    softClamp(x, y) {
        if (!this.hasBounds) return { x, y };
        const b  = this.bounds;
        const m  = this._softMargin;
        const s  = this._softStrength;
        let nx   = x, ny = y;

        if (x < b.minX + m) nx += (b.minX + m - x) * s;
        if (x > b.maxX - m) nx -= (x - (b.maxX - m)) * s;
        if (y < b.minY + m) ny += (b.minY + m - y) * s;
        if (y > b.maxY - m) ny -= (y - (b.maxY - m)) * s;

        // Hard clamp as safety net
        return this.clampToBounds(nx, ny);
    },

    /**
     * Returns true if position is at (or past) any boundary edge.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isAtBoundary(x, y) {
        if (!this.hasBounds) return false;
        const b = this.bounds;
        return x <= b.minX || x >= b.maxX || y <= b.minY || y >= b.maxY;
    },

    /**
     * Returns which edges the position is near or at.
     * Useful for UI indicators (e.g. arrows showing world boundary direction).
     * @param {number} x
     * @param {number} y
     * @returns {{ left: boolean, right: boolean, top: boolean, bottom: boolean }}
     */
    getBoundaryFlags(x, y) {
        if (!this.hasBounds) return { left: false, right: false, top: false, bottom: false };
        const b = this.bounds;
        const m = this._softMargin * 2;
        return {
            left:   x <= b.minX + m,
            right:  x >= b.maxX - m,
            top:    y <= b.minY + m,
            bottom: y >= b.maxY - m
        };
    },

    /**
     * Expands the current bounds by a given margin on all sides.
     * @param {number} margin - World units to expand by
     */
    expandBounds(margin) {
        if (!this.hasBounds) return;
        this.setBounds(
            this.bounds.minX - margin,
            this.bounds.maxX + margin,
            this.bounds.minY - margin,
            this.bounds.maxY + margin
        );
    }
};


// =============================================================================
// REPLAY SYSTEM
// Records camera + vehicle frames and plays them back
// =============================================================================

const REPLAY_SYSTEM = {

    MAX_RECORDING_FRAMES: 1800,   // 30 seconds at 60 fps

    isRecording:    false,
    isPlayingBack:  false,
    recording:      [],            // array of recorded frame objects

    // Playback state
    replayFrame:    null,          // currently displayed frame
    playbackIndex:  0,
    playbackTimer:  0,
    _playbackFPS:   60,
    _frameDuration: 1 / 60,

    // Recording state
    _recordTimer:   0,
    _recordFPS:     60,

    /**
     * Starts a new recording session. Clears any previous recording.
     */
    startRecording() {
        this.recording      = [];
        this.isRecording    = true;
        this.isPlayingBack  = false;
        this.replayFrame    = null;
        this._recordTimer   = 0;
        this.playbackIndex  = 0;
        this.playbackTimer  = 0;
    },

    /**
     * Stops recording and returns the captured frame array.
     * @returns {Array} Array of recorded frame objects
     */
    stopRecording() {
        this.isRecording = false;
        return this.recording.slice(); // return a copy
    },

    /**
     * Records a frame. Call once per game frame while recording.
     * @param {object} vehicleState - Snapshot of vehicle and camera state
     * @param {number} dt           - Delta time this frame
     */
    recordFrame(vehicleState, dt) {
        if (!this.isRecording) return;

        if (this.recording.length >= this.MAX_RECORDING_FRAMES) {
            // Drop oldest frame (ring-buffer style)
            this.recording.shift();
        }

        this.recording.push({
            timestamp: this._recordTimer,
            dt:        dt,
            vehicle: {
                x:      vehicleState.x     || 0,
                y:      vehicleState.y     || 0,
                vx:     vehicleState.vx    || 0,
                vy:     vehicleState.vy    || 0,
                angle:  vehicleState.angle || 0,
                speed:  vehicleState.speed || 0
            },
            camera: {
                x:     vehicleState.cameraX    || 0,
                y:     vehicleState.cameraY    || 0,
                zoom:  vehicleState.cameraZoom || 1,
                angle: vehicleState.cameraAngle|| 0
            },
            input: {
                throttle: vehicleState.throttle || 0,
                brake:    vehicleState.brake    || false,
                flip:     vehicleState.flip     || false
            }
        });

        this._recordTimer += dt;
    },

    /**
     * Begins playing back a previously captured recording.
     * @param {Array} [recording] - Array of frames; uses internal if omitted
     */
    startPlayback(recording) {
        const frames = recording || this.recording;
        if (!frames || frames.length === 0) {
            console.warn('[REPLAY_SYSTEM] No frames to play back.');
            return;
        }

        this.isRecording   = false;
        this.isPlayingBack = true;
        this.recording     = frames;
        this.playbackIndex = 0;
        this.playbackTimer = 0;
        this.replayFrame   = this.recording[0] || null;
    },

    /**
     * Advances the playback by dt. Call each frame during playback.
     * @param {number} dt - Delta time in seconds
     * @returns {boolean} True while still playing, false when finished
     */
    updatePlayback(dt) {
        if (!this.isPlayingBack || this.recording.length === 0) return false;

        this.playbackTimer += dt;

        // Advance frame index based on timestamps
        while (
            this.playbackIndex < this.recording.length - 1 &&
            this.playbackTimer >= this.recording[this.playbackIndex + 1].timestamp
        ) {
            this.playbackIndex++;
        }

        if (this.playbackIndex >= this.recording.length - 1) {
            // Playback finished
            this.replayFrame   = this.recording[this.recording.length - 1];
            this.isPlayingBack = false;
            return false;
        }

        // Interpolate between current and next frame for smooth playback
        const frameA = this.recording[this.playbackIndex];
        const frameB = this.recording[this.playbackIndex + 1];

        const span   = frameB.timestamp - frameA.timestamp;
        const t      = span > 0 ? (this.playbackTimer - frameA.timestamp) / span : 0;
        const tc     = Math.max(0, Math.min(1, t));

        this.replayFrame = this._interpolateFrames(frameA, frameB, tc);
        return true;
    },

    /**
     * Linear interpolation between two recorded frames.
     * @private
     */
    _interpolateFrames(a, b, t) {
        const lerp = (va, vb, tt) => va + (vb - va) * tt;
        const lerpAngle = (va, vb, tt) => {
            let diff = vb - va;
            while (diff >  Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            return va + diff * tt;
        };

        return {
            timestamp: lerp(a.timestamp, b.timestamp, t),
            vehicle: {
                x:     lerp(a.vehicle.x,     b.vehicle.x,     t),
                y:     lerp(a.vehicle.y,     b.vehicle.y,     t),
                vx:    lerp(a.vehicle.vx,    b.vehicle.vx,    t),
                vy:    lerp(a.vehicle.vy,    b.vehicle.vy,    t),
                angle: lerpAngle(a.vehicle.angle, b.vehicle.angle, t),
                speed: lerp(a.vehicle.speed, b.vehicle.speed, t)
            },
            camera: {
                x:     lerp(a.camera.x,     b.camera.x,     t),
                y:     lerp(a.camera.y,     b.camera.y,     t),
                zoom:  lerp(a.camera.zoom,  b.camera.zoom,  t),
                angle: lerpAngle(a.camera.angle, b.camera.angle, t)
            },
            input: {
                throttle: lerp(a.input.throttle, b.input.throttle, t),
                brake:    t < 0.5 ? a.input.brake    : b.input.brake,
                flip:     t < 0.5 ? a.input.flip     : b.input.flip
            }
        };
    },

    /**
     * Stops playback and resets state.
     */
    stopPlayback() {
        this.isPlayingBack = false;
        this.replayFrame   = null;
        this.playbackIndex = 0;
        this.playbackTimer = 0;
    },

    /** Returns recording length in seconds. */
    getDuration() {
        if (this.recording.length === 0) return 0;
        return this.recording[this.recording.length - 1].timestamp;
    },

    /** Returns current playback progress 0-1. */
    getPlaybackProgress() {
        const dur = this.getDuration();
        if (dur <= 0 || !this.replayFrame) return 0;
        return Math.min(this.playbackTimer / dur, 1.0);
    },

    /** Returns frame count in the recording. */
    getFrameCount() { return this.recording.length; },

    /** Returns true if the recording buffer is full. */
    isBufferFull()  { return this.recording.length >= this.MAX_RECORDING_FRAMES; }
};


// =============================================================================
// CINEMATIC_CAMERA MODULE
// =============================================================================
(function() {
    'use strict';

    var CINEMATIC_CAMERA = (function() {

        function cubicBezier(t, p0, p1, p2, p3) {
            var u = 1 - t;
            return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
        }

        function applyEasing(t, easing) {
            switch (easing) {
                case 'easeIn':    return t * t * t;
                case 'easeOut':   return 1 - Math.pow(1 - t, 3);
                case 'easeInOut': return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
                case 'spring':    return 1 - (Math.cos(t * Math.PI * 3.5) * Math.pow(1 - t, 2.5));
                case 'bounce':    {
                    var n1 = 7.5625, d1 = 2.75;
                    if (t < 1/d1) return n1*t*t;
                    else if (t < 2/d1) { t -= 1.5/d1; return n1*t*t + 0.75; }
                    else if (t < 2.5/d1) { t -= 2.25/d1; return n1*t*t + 0.9375; }
                    else { t -= 2.625/d1; return n1*t*t + 0.984375; }
                }
                default: return t;
            }
        }

        function lerpVal(a, b, t) { return a + (b - a) * t; }

        function interpolateKeyframes(keyframes, totalT) {
            if (!keyframes || keyframes.length === 0) return null;
            if (keyframes.length === 1) return JSON.parse(JSON.stringify(keyframes[0]));
            if (totalT <= 0) return JSON.parse(JSON.stringify(keyframes[0]));
            if (totalT >= 1) return JSON.parse(JSON.stringify(keyframes[keyframes.length - 1]));

            var segCount = keyframes.length - 1;
            var segT = totalT * segCount;
            var segIdx = Math.floor(segT);
            if (segIdx >= segCount) segIdx = segCount - 1;
            var localT = segT - segIdx;

            var kf0 = keyframes[segIdx];
            var kf1 = keyframes[segIdx + 1];
            var easedT = applyEasing(localT, kf1.easing || 'linear');

            return {
                x:     lerpVal(kf0.x,     kf1.x,     easedT),
                y:     lerpVal(kf0.y,     kf1.y,     easedT),
                zoom:  lerpVal(kf0.zoom,  kf1.zoom,  easedT),
                angle: lerpVal(kf0.angle, kf1.angle, easedT),
                t:     totalT
            };
        }

        var PRESET_SEQUENCES = {
            intro_fly_in: {
                name: 'Intro Fly-In',
                duration: 3000,
                keyframes: [
                    { t: 0,   x: 0,   y: -500, zoom: 0.2, angle: 0,   easing: 'easeOut' },
                    { t: 0.4, x: 0,   y: -200, zoom: 0.5, angle: 0,   easing: 'easeOut' },
                    { t: 0.7, x: 0,   y: -100, zoom: 0.8, angle: 0,   easing: 'easeInOut' },
                    { t: 1.0, x: 0,   y: 0,    zoom: 1.0, angle: 0,   easing: 'easeOut' }
                ]
            },
            victory_pan: {
                name: 'Victory Pan',
                duration: 5000,
                keyframes: [
                    { t: 0,    x: 0,    y: 0,   zoom: 1.0, angle: 0,   easing: 'linear' },
                    { t: 0.25, x: 200,  y: -50, zoom: 0.8, angle: 15,  easing: 'easeInOut' },
                    { t: 0.5,  x: 0,    y: -100,zoom: 0.7, angle: 0,   easing: 'easeInOut' },
                    { t: 0.75, x: -200, y: -50, zoom: 0.8, angle: -15, easing: 'easeInOut' },
                    { t: 1.0,  x: 0,    y: 0,   zoom: 1.0, angle: 0,   easing: 'easeOut' }
                ]
            },
            crash_slowmo: {
                name: 'Crash Slow-Mo',
                duration: 2500,
                keyframes: [
                    { t: 0,   x: 0,   y: 0,   zoom: 1.0,  angle: 0,   easing: 'easeIn' },
                    { t: 0.3, x: 0,   y: -30, zoom: 1.8,  angle: 5,   easing: 'easeOut' },
                    { t: 0.7, x: 20,  y: -40, zoom: 2.0,  angle: -5,  easing: 'linear' },
                    { t: 1.0, x: 0,   y: 0,   zoom: 1.0,  angle: 0,   easing: 'easeOut' }
                ]
            },
            jump_apex: {
                name: 'Jump Apex Bullet Time',
                duration: 2000,
                keyframes: [
                    { t: 0,   x: 0,   y: 0,    zoom: 1.0,  angle: 0,   easing: 'easeIn' },
                    { t: 0.2, x: -50, y: 0,    zoom: 0.7,  angle: 0,   easing: 'easeOut' },
                    { t: 0.5, x: 0,   y: -150, zoom: 0.6,  angle: 0,   easing: 'linear' },
                    { t: 0.8, x: 50,  y: -100, zoom: 0.7,  angle: 0,   easing: 'easeIn' },
                    { t: 1.0, x: 0,   y: 0,    zoom: 1.0,  angle: 0,   easing: 'easeOut' }
                ]
            },
            finish_line: {
                name: 'Finish Line Drama',
                duration: 3500,
                keyframes: [
                    { t: 0,   x: -300, y: 0,    zoom: 0.5,  angle: 0,   easing: 'easeIn' },
                    { t: 0.4, x: -150, y: 0,    zoom: 0.7,  angle: 0,   easing: 'easeOut' },
                    { t: 0.6, x: 0,    y: -50,  zoom: 1.0,  angle: -10, easing: 'easeInOut' },
                    { t: 0.8, x: 50,   y: -80,  zoom: 1.3,  angle: -15, easing: 'easeOut' },
                    { t: 1.0, x: 0,    y: 0,    zoom: 1.0,  angle: 0,   easing: 'easeOut' }
                ]
            },
            boss_encounter: {
                name: 'Boss Encounter Approach',
                duration: 4000,
                keyframes: [
                    { t: 0,   x: -600, y: 100,  zoom: 0.3,  angle: 0,   easing: 'easeIn' },
                    { t: 0.3, x: -300, y: 50,   zoom: 0.5,  angle: 0,   easing: 'easeOut' },
                    { t: 0.5, x: -100, y: 0,    zoom: 0.7,  angle: 5,   easing: 'easeInOut' },
                    { t: 0.7, x: 0,    y: 0,    zoom: 0.9,  angle: -5,  easing: 'easeInOut' },
                    { t: 1.0, x: 0,    y: 0,    zoom: 1.0,  angle: 0,   easing: 'easeOut' }
                ]
            }
        };

        var activeCinematic = null;

        function playCinematic(sequenceId, vehicleX, vehicleY) {
            var seq = PRESET_SEQUENCES[sequenceId];
            if (!seq) return false;
            activeCinematic = {
                id: sequenceId,
                sequence: seq,
                vehicleX: vehicleX || 0,
                vehicleY: vehicleY || 0,
                startTime: Date.now(),
                duration: seq.duration,
                done: false,
                currentFrame: null
            };
            return true;
        }

        function updateCinematic() {
            if (!activeCinematic || activeCinematic.done) return null;
            var elapsed = Date.now() - activeCinematic.startTime;
            var t = Math.min(1, elapsed / activeCinematic.duration);
            var frame = interpolateKeyframes(activeCinematic.sequence.keyframes, t);
            if (frame) {
                frame.worldX = activeCinematic.vehicleX + frame.x;
                frame.worldY = activeCinematic.vehicleY + frame.y;
            }
            activeCinematic.currentFrame = frame;
            if (t >= 1) activeCinematic.done = true;
            return frame;
        }

        function stopCinematic() {
            activeCinematic = null;
        }

        function isCinematicActive() {
            return activeCinematic !== null && !activeCinematic.done;
        }

        function createCustomPath(keyframes, duration) {
            return {
                name: 'Custom Path',
                duration: duration || 3000,
                keyframes: keyframes
            };
        }

        return {
            PRESET_SEQUENCES: PRESET_SEQUENCES,
            playCinematic: playCinematic,
            updateCinematic: updateCinematic,
            stopCinematic: stopCinematic,
            isCinematicActive: isCinematicActive,
            interpolateKeyframes: interpolateKeyframes,
            applyEasing: applyEasing,
            createCustomPath: createCustomPath,
            activeCinematic: activeCinematic
        };
    })();

    if (typeof window !== 'undefined') window.CINEMATIC_CAMERA = CINEMATIC_CAMERA;
    if (typeof module !== 'undefined' && module.exports) module.exports.CINEMATIC_CAMERA = CINEMATIC_CAMERA;
})();

// =============================================================================
// CAMERA_EFFECTS MODULE
// =============================================================================
(function() {
    'use strict';

    var CAMERA_EFFECTS = (function() {

        var shakeState = {
            trauma: 0,
            decayRate: 0.8,
            maxOffsetX: 20,
            maxOffsetY: 20,
            maxAngle: 5,
            offsetX: 0,
            offsetY: 0,
            angleOffset: 0,
            seed: Math.random() * 10000
        };

        var zoomState = {
            currentZoom: 1.0,
            targetZoom: 1.0,
            baseZoom: 1.0,
            speedZoomMax: 1.15,
            impactZoomMin: 0.85,
            interpolationSpeed: 0.08,
            momentaryBoost: 0,
            momentaryBoostTimer: 0
        };

        var bobState = {
            enabled: true,
            springK: 80,
            dampingB: 12,
            mass: 1,
            currentY: 0,
            velocity: 0,
            targetY: 0
        };

        var effectFlags = {
            letterboxActive: false,
            letterboxProgress: 0,
            letterboxTarget: 0,
            letterboxHeight: 60,
            motionBlurActive: false,
            motionBlurStrength: 0,
            parallaxEnabled: true
        };

        var PARALLAX_LAYERS = [
            { id: 'background_far',    multiplier: 0.1,  depth: 5 },
            { id: 'background_mid',    multiplier: 0.3,  depth: 3 },
            { id: 'background_near',   multiplier: 0.6,  depth: 2 },
            { id: 'terrain',           multiplier: 1.0,  depth: 1 },
            { id: 'foreground_near',   multiplier: 1.3,  depth: 0.5 },
            { id: 'foreground_detail', multiplier: 1.6,  depth: 0.2 }
        ];

        function pseudoRandom(seed) {
            var x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        }

        function getShakeOffset(traumaValue, timeSeed) {
            var t2 = traumaValue * traumaValue;
            var nx = pseudoRandom(timeSeed * 0.1);
            var ny = pseudoRandom(timeSeed * 0.1 + 5.3);
            var na = pseudoRandom(timeSeed * 0.1 + 11.7);
            return {
                x:     (nx * 2 - 1) * shakeState.maxOffsetX * t2,
                y:     (ny * 2 - 1) * shakeState.maxOffsetY * t2,
                angle: (na * 2 - 1) * shakeState.maxAngle * t2
            };
        }

        function addTrauma(amount) {
            shakeState.trauma = Math.min(1, shakeState.trauma + amount);
        }

        function updateShake(dt) {
            if (shakeState.trauma <= 0) {
                shakeState.offsetX = 0;
                shakeState.offsetY = 0;
                shakeState.angleOffset = 0;
                return { x: 0, y: 0, angle: 0 };
            }
            shakeState.seed += dt * 0.05;
            var offset = getShakeOffset(shakeState.trauma, shakeState.seed);
            shakeState.offsetX = offset.x;
            shakeState.offsetY = offset.y;
            shakeState.angleOffset = offset.angle;
            shakeState.trauma = Math.max(0, shakeState.trauma - shakeState.decayRate * (dt / 1000));
            return offset;
        }

        function setShakeFrequency(isHighFreq) {
            shakeState.maxOffsetX = isHighFreq ? 15 : 25;
            shakeState.maxOffsetY = isHighFreq ? 12 : 20;
            shakeState.maxAngle   = isHighFreq ? 3 : 6;
            shakeState.decayRate  = isHighFreq ? 1.5 : 0.6;
        }

        function setSpeedZoom(normalizedSpeed) {
            normalizedSpeed = Math.max(0, Math.min(1, normalizedSpeed));
            zoomState.targetZoom = zoomState.baseZoom + (zoomState.speedZoomMax - zoomState.baseZoom) * normalizedSpeed * 0.5;
        }

        function triggerImpactZoom() {
            zoomState.momentaryBoost = zoomState.impactZoomMin - zoomState.baseZoom;
            zoomState.momentaryBoostTimer = 200;
        }

        function triggerTrickZoom(trickArcRadius) {
            var zoomOut = 1 - (trickArcRadius / 500) * 0.3;
            zoomState.momentaryBoost = zoomOut - zoomState.baseZoom;
            zoomState.momentaryBoostTimer = 800;
        }

        function updateZoom(dt) {
            if (zoomState.momentaryBoostTimer > 0) {
                zoomState.momentaryBoostTimer -= dt;
                if (zoomState.momentaryBoostTimer <= 0) zoomState.momentaryBoost = 0;
            }
            var effective = zoomState.targetZoom + zoomState.momentaryBoost;
            zoomState.currentZoom += (effective - zoomState.currentZoom) * zoomState.interpolationSpeed;
            return zoomState.currentZoom;
        }

        function updateBob(vehicleGroundSpeed, dt) {
            var dtSec = dt / 1000;
            var speedFactor = Math.min(1, vehicleGroundSpeed / 100);
            bobState.targetY = Math.sin(Date.now() / 200) * 3 * speedFactor;
            var springForce = -bobState.springK * (bobState.currentY - bobState.targetY);
            var dampingForce = -bobState.dampingB * bobState.velocity;
            var acceleration = (springForce + dampingForce) / bobState.mass;
            bobState.velocity += acceleration * dtSec;
            bobState.currentY += bobState.velocity * dtSec;
            return bobState.currentY;
        }

        function setLetterbox(active, durationMs) {
            effectFlags.letterboxTarget = active ? 1 : 0;
            durationMs = durationMs || 400;
            var step = 1 / (durationMs / 16);
            var interval = setInterval(function() {
                if (active) {
                    effectFlags.letterboxProgress = Math.min(1, effectFlags.letterboxProgress + step);
                    if (effectFlags.letterboxProgress >= 1) { effectFlags.letterboxActive = true; clearInterval(interval); }
                } else {
                    effectFlags.letterboxProgress = Math.max(0, effectFlags.letterboxProgress - step);
                    if (effectFlags.letterboxProgress <= 0) { effectFlags.letterboxActive = false; clearInterval(interval); }
                }
            }, 16);
        }

        function updateMotionBlur(cameraVelocityX, cameraVelocityY) {
            var speed = Math.sqrt(cameraVelocityX * cameraVelocityX + cameraVelocityY * cameraVelocityY);
            effectFlags.motionBlurStrength = Math.min(1, speed / 800);
            effectFlags.motionBlurActive = effectFlags.motionBlurStrength > 0.05;
            return effectFlags.motionBlurStrength;
        }

        function getParallaxOffset(layerId, cameraX, cameraY) {
            var layer = PARALLAX_LAYERS.find(function(l) { return l.id === layerId; });
            if (!layer || !effectFlags.parallaxEnabled) return { x: cameraX, y: cameraY };
            return { x: cameraX * layer.multiplier, y: cameraY * layer.multiplier };
        }

        function getAllParallaxOffsets(cameraX, cameraY) {
            return PARALLAX_LAYERS.reduce(function(acc, layer) {
                acc[layer.id] = getParallaxOffset(layer.id, cameraX, cameraY);
                return acc;
            }, {});
        }

        function getEffectState() {
            return {
                shake: {
                    trauma: shakeState.trauma,
                    offsetX: shakeState.offsetX,
                    offsetY: shakeState.offsetY,
                    angleOffset: shakeState.angleOffset
                },
                zoom: {
                    current: zoomState.currentZoom,
                    target: zoomState.targetZoom
                },
                bob: {
                    offsetY: bobState.currentY
                },
                letterbox: {
                    active: effectFlags.letterboxActive,
                    progress: effectFlags.letterboxProgress,
                    barHeight: effectFlags.letterboxHeight * effectFlags.letterboxProgress
                },
                motionBlur: {
                    active: effectFlags.motionBlurActive,
                    strength: effectFlags.motionBlurStrength
                }
            };
        }

        return {
            shakeState: shakeState,
            zoomState: zoomState,
            bobState: bobState,
            effectFlags: effectFlags,
            PARALLAX_LAYERS: PARALLAX_LAYERS,
            addTrauma: addTrauma,
            updateShake: updateShake,
            setShakeFrequency: setShakeFrequency,
            setSpeedZoom: setSpeedZoom,
            triggerImpactZoom: triggerImpactZoom,
            triggerTrickZoom: triggerTrickZoom,
            updateZoom: updateZoom,
            updateBob: updateBob,
            setLetterbox: setLetterbox,
            updateMotionBlur: updateMotionBlur,
            getParallaxOffset: getParallaxOffset,
            getAllParallaxOffsets: getAllParallaxOffsets,
            getEffectState: getEffectState
        };
    })();

    if (typeof window !== 'undefined') window.CAMERA_EFFECTS = CAMERA_EFFECTS;
    if (typeof module !== 'undefined' && module.exports) module.exports.CAMERA_EFFECTS = CAMERA_EFFECTS;
})();

// =============================================================================
// CAMERA_MODES MODULE
// =============================================================================
(function() {
    'use strict';

    var CAMERA_MODES = (function() {

        var MODES = {
            FOLLOW: {
                id: 'FOLLOW',
                name: 'Follow',
                description: 'Standard follow camera that tracks the vehicle.',
                unlockRequirement: null,
                defaultOffset: { x: -80, y: -60 },
                zoom: 1.0,
                lagFactor: 0.08,
                settings: { followX: true, followY: true, smoothing: 0.08 }
            },
            CHASE: {
                id: 'CHASE',
                name: 'Chase',
                description: 'Further back, shows more terrain ahead.',
                unlockRequirement: null,
                defaultOffset: { x: -160, y: -80 },
                zoom: 0.75,
                lagFactor: 0.06,
                settings: { followX: true, followY: true, smoothing: 0.06, lookaheadX: 100 }
            },
            CINEMATIC: {
                id: 'CINEMATIC',
                name: 'Cinematic',
                description: 'Pre-scripted camera paths for cutscenes.',
                unlockRequirement: 'achievement_veteran',
                zoom: 1.0,
                settings: { useCinematicModule: true }
            },
            DRIVER: {
                id: 'DRIVER',
                name: 'Driver View',
                description: 'First-person perspective from the driver seat.',
                unlockRequirement: 'level_10',
                defaultOffset: { x: 15, y: -25 },
                zoom: 1.2,
                lagFactor: 0.2,
                settings: { followX: true, followY: true, smoothing: 0.2, attachToVehicle: true }
            },
            BIRD: {
                id: 'BIRD',
                name: 'Bird\'s Eye',
                description: 'Top-down aerial view.',
                unlockRequirement: 'achievement_explorer',
                defaultOffset: { x: 0, y: 0 },
                zoom: 0.4,
                lagFactor: 0.04,
                settings: { followX: true, followY: true, smoothing: 0.04, rotation: -90 }
            },
            SIDE: {
                id: 'SIDE',
                name: 'Side View',
                description: 'Pure 2D side view locked to game world.',
                unlockRequirement: null,
                defaultOffset: { x: -100, y: -50 },
                zoom: 1.0,
                lagFactor: 0.1,
                settings: { followX: true, followY: false, smoothing: 0.1, lockY: true }
            },
            ORBIT: {
                id: 'ORBIT',
                name: 'Orbit',
                description: 'Circles around the vehicle, great for showcases.',
                unlockRequirement: 'level_20',
                zoom: 0.8,
                settings: {
                    orbitRadius: 250,
                    orbitSpeed: 0.5,
                    orbitHeight: -80,
                    currentAngle: 0
                }
            },
            FREE: {
                id: 'FREE',
                name: 'Free Camera',
                description: 'Debug/spectator free camera, fully manual.',
                unlockRequirement: 'debug_mode',
                zoom: 1.0,
                settings: {
                    moveSpeed: 300,
                    zoomSpeed: 0.1,
                    x: 0,
                    y: 0
                }
            }
        };

        var PHOTO_MODE_FILTERS = [
            { id: 'normal',   name: 'Normal',   css: 'none' },
            { id: 'vintage',  name: 'Vintage',  css: 'sepia(60%) contrast(110%) brightness(95%)' },
            { id: 'vivid',    name: 'Vivid',    css: 'saturate(180%) contrast(110%)' },
            { id: 'bw',       name: 'B&W',      css: 'grayscale(100%) contrast(120%)' },
            { id: 'warm',     name: 'Warm',     css: 'sepia(30%) saturate(130%) hue-rotate(-10deg)' },
            { id: 'cool',     name: 'Cool',     css: 'saturate(80%) hue-rotate(30deg) brightness(105%)' }
        ];

        var currentModeId = 'FOLLOW';
        var transitionState = {
            active: false,
            fromModeId: null,
            toModeId: null,
            progress: 0,
            duration: 800,
            startTime: null
        };

        var photoMode = {
            active: false,
            filterId: 'normal',
            freeX: 0,
            freeY: 0,
            freeZoom: 1.0,
            angle: 0
        };

        var playerModePreferences = {};
        var unlockedModes = ['FOLLOW', 'CHASE', 'SIDE'];

        var keyBindings = {
            cycleModes: 'KeyC',
            photoMode: 'KeyP',
            freeZoomIn: 'Equal',
            freeZoomOut: 'Minus'
        };

        function isModeUnlocked(modeId) {
            return unlockedModes.indexOf(modeId) !== -1;
        }

        function unlockMode(modeId, reason) {
            if (!MODES[modeId]) return false;
            if (unlockedModes.indexOf(modeId) === -1) {
                unlockedModes.push(modeId);
                console.log('[CameraModes] Unlocked mode: ' + modeId + ' (' + reason + ')');
            }
            return true;
        }

        function setMode(modeId, instant) {
            if (!MODES[modeId]) return { success: false, reason: 'Unknown mode' };
            if (!isModeUnlocked(modeId)) return { success: false, reason: 'Mode not unlocked', requirement: MODES[modeId].unlockRequirement };
            if (modeId === currentModeId) return { success: true, noChange: true };

            if (!instant) {
                transitionState.active = true;
                transitionState.fromModeId = currentModeId;
                transitionState.toModeId = modeId;
                transitionState.progress = 0;
                transitionState.startTime = Date.now();
            }

            currentModeId = modeId;
            return { success: true, mode: MODES[modeId] };
        }

        function updateTransition(dt) {
            if (!transitionState.active) return 1;
            var elapsed = Date.now() - transitionState.startTime;
            transitionState.progress = Math.min(1, elapsed / transitionState.duration);
            if (transitionState.progress >= 1) transitionState.active = false;
            return transitionState.progress;
        }

        function getCurrentMode() {
            return MODES[currentModeId];
        }

        function cycleModes() {
            var ids = Object.keys(MODES).filter(function(id) { return isModeUnlocked(id); });
            var currentIdx = ids.indexOf(currentModeId);
            var nextIdx = (currentIdx + 1) % ids.length;
            return setMode(ids[nextIdx]);
        }

        function enterPhotoMode() {
            photoMode.active = true;
            photoMode.freeX = 0;
            photoMode.freeY = 0;
            photoMode.freeZoom = 1.0;
            photoMode.angle = 0;
            photoMode.filterId = 'normal';
            return true;
        }

        function exitPhotoMode() {
            photoMode.active = false;
        }

        function updatePhotoCamera(inputDx, inputDy, zoomDelta, rotateDelta) {
            if (!photoMode.active) return;
            photoMode.freeX += inputDx * 2;
            photoMode.freeY += inputDy * 2;
            photoMode.freeZoom = Math.max(0.2, Math.min(5, photoMode.freeZoom + zoomDelta * 0.05));
            photoMode.angle += rotateDelta * 0.5;
        }

        function setPhotoFilter(filterId) {
            var filter = PHOTO_MODE_FILTERS.find(function(f) { return f.id === filterId; });
            if (filter) { photoMode.filterId = filterId; return filter; }
            return null;
        }

        function getPhotoFilterCSS() {
            var f = PHOTO_MODE_FILTERS.find(function(f) { return f.id === photoMode.filterId; });
            return f ? f.css : 'none';
        }

        var orbitAngle = 0;
        function updateOrbitMode(vehicleX, vehicleY, dt) {
            var mode = MODES.ORBIT;
            orbitAngle += mode.settings.orbitSpeed * (dt / 1000);
            var r = mode.settings.orbitRadius;
            return {
                x: vehicleX + Math.cos(orbitAngle) * r,
                y: vehicleY + mode.settings.orbitHeight + Math.sin(orbitAngle) * r * 0.3,
                angle: -orbitAngle * (180 / Math.PI)
            };
        }

        function updateFreeCamera(inputs, dt) {
            var mode = MODES.FREE;
            var speed = mode.settings.moveSpeed * (dt / 1000);
            if (inputs.left)  mode.settings.x -= speed;
            if (inputs.right) mode.settings.x += speed;
            if (inputs.up)    mode.settings.y -= speed;
            if (inputs.down)  mode.settings.y += speed;
            if (inputs.zoomIn)  mode.settings.zoom = Math.max(0.1, (mode.settings.zoom || 1) - 0.1);
            if (inputs.zoomOut) mode.settings.zoom = Math.min(5, (mode.settings.zoom || 1) + 0.1);
            return { x: mode.settings.x, y: mode.settings.y, zoom: mode.settings.zoom || 1 };
        }

        function setModePreference(modeId, prefs) {
            playerModePreferences[modeId] = Object.assign(playerModePreferences[modeId] || {}, prefs);
        }

        function getModePreference(modeId) {
            return playerModePreferences[modeId] || {};
        }

        function listAvailableModes() {
            return Object.keys(MODES).map(function(id) {
                var mode = MODES[id];
                return {
                    id: id,
                    name: mode.name,
                    description: mode.description,
                    unlocked: isModeUnlocked(id),
                    unlockRequirement: mode.unlockRequirement,
                    active: id === currentModeId
                };
            });
        }

        function getTransitionBlendedCamera(fromState, toState) {
            if (!transitionState.active) return toState;
            var t = transitionState.progress;
            var eased = 1 - Math.pow(1 - t, 3);
            return {
                x:    fromState.x    + (toState.x    - fromState.x)    * eased,
                y:    fromState.y    + (toState.y    - fromState.y)    * eased,
                zoom: fromState.zoom + (toState.zoom - fromState.zoom) * eased,
                angle:fromState.angle+ (toState.angle- fromState.angle)* eased
            };
        }

        function setKeyBinding(action, keyCode) {
            if (keyBindings.hasOwnProperty(action)) {
                keyBindings[action] = keyCode;
                return true;
            }
            return false;
        }

        return {
            MODES: MODES,
            PHOTO_MODE_FILTERS: PHOTO_MODE_FILTERS,
            currentModeId: currentModeId,
            photoMode: photoMode,
            transitionState: transitionState,
            unlockedModes: unlockedModes,
            keyBindings: keyBindings,
            isModeUnlocked: isModeUnlocked,
            unlockMode: unlockMode,
            setMode: setMode,
            getCurrentMode: getCurrentMode,
            cycleModes: cycleModes,
            updateTransition: updateTransition,
            enterPhotoMode: enterPhotoMode,
            exitPhotoMode: exitPhotoMode,
            updatePhotoCamera: updatePhotoCamera,
            setPhotoFilter: setPhotoFilter,
            getPhotoFilterCSS: getPhotoFilterCSS,
            updateOrbitMode: updateOrbitMode,
            updateFreeCamera: updateFreeCamera,
            setModePreference: setModePreference,
            getModePreference: getModePreference,
            listAvailableModes: listAvailableModes,
            getTransitionBlendedCamera: getTransitionBlendedCamera,
            setKeyBinding: setKeyBinding
        };
    })();

    if (typeof window !== 'undefined') window.CAMERA_MODES = CAMERA_MODES;
    if (typeof module !== 'undefined' && module.exports) module.exports.CAMERA_MODES = CAMERA_MODES;
})();


// ================================================================
// CAMERA_INTERPOLATOR — Smooth camera transition system
// ================================================================
const CAMERA_INTERPOLATOR = (() => {
  function lerp(a,b,t){ return a+(b-a)*t; }
  function smoothstep(t){ return t*t*(3-2*t); }
  function easeOut(t){ return 1-(1-t)*(1-t); }
  function easeInOut(t){ return t<0.5?2*t*t:-1+(4-2*t)*t; }
  function spring(current, target, velocity, stiffness, damping, dt){
    const f = (target-current)*stiffness - velocity*damping;
    const nv = velocity + f*dt;
    const nx = current + nv*dt;
    return { x:nx, v:nv };
  }

  // State
  let _x=0,_y=0,_zoom=1,_angle=0;
  let _vx=0,_vy=0,_vz=0,_va=0;
  const STIFF=12, DAMP=6;

  function update(targetX, targetY, targetZoom, targetAngle, dt) {
    const rx = spring(_x, targetX,    _vx, STIFF, DAMP, dt);
    const ry = spring(_y, targetY,    _vy, STIFF, DAMP, dt);
    const rz = spring(_zoom, targetZoom||1, _vz, STIFF, DAMP, dt);
    const ra = spring(_angle, targetAngle||0, _va, STIFF*2, DAMP*2, dt);
    _x=rx.x; _vx=rx.v;
    _y=ry.x; _vy=ry.v;
    _zoom=rz.x; _vz=rz.v;
    _angle=ra.x; _va=ra.v;
    return { x:_x, y:_y, zoom:_zoom, angle:_angle };
  }

  function snapTo(x,y,zoom,angle){ _x=x;_y=y;_zoom=zoom||1;_angle=angle||0; _vx=_vy=_vz=_va=0; }
  function getState(){ return {x:_x,y:_y,zoom:_zoom,angle:_angle}; }

  // Tween: animate from A to B over duration
  const _tweens = [];
  function tween(fromState, toState, durationMs, easingName, onComplete) {
    const ease = { linear:t=>t, easeOut, easeInOut, smoothstep }[easingName] || easeOut;
    _tweens.push({ from:{...fromState}, to:{...toState}, dur:durationMs, elapsed:0, ease, onComplete });
  }

  function tickTweens(dt) {
    for (let i=_tweens.length-1;i>=0;i--) {
      const tw=_tweens[i];
      tw.elapsed += dt*1000;
      const t = tw.ease(Math.min(1, tw.elapsed/tw.dur));
      _x    = lerp(tw.from.x,    tw.to.x,    t);
      _y    = lerp(tw.from.y,    tw.to.y,    t);
      _zoom = lerp(tw.from.zoom, tw.to.zoom, t);
      _angle= lerp(tw.from.angle||0, tw.to.angle||0, t);
      if (tw.elapsed >= tw.dur) {
        _tweens.splice(i,1);
        if (tw.onComplete) tw.onComplete();
      }
    }
  }

  function hasTween(){ return _tweens.length>0; }

  return { update, snapTo, getState, tween, tickTweens, hasTween, lerp, smoothstep, easeOut, easeInOut, spring };
})();

// ================================================================
// CAMERA_SHAKE_ENGINE — Trauma-based screen shake
// ================================================================
const CAMERA_SHAKE_ENGINE = (() => {
  let _trauma = 0;
  let _seed   = Math.random()*1000;
  const MAX_OFFSET_X = 18;
  const MAX_OFFSET_Y = 12;
  const MAX_ROTATION = 0.03;
  const DECAY = 1.8;

  function addTrauma(amount){ _trauma = Math.min(1, _trauma + amount); }
  function getTrauma(){ return _trauma; }

  // Cheap noise via sin-based hash
  function _hash(n){ return (Math.sin(n*127.1)*43758.5453) % 1; }
  function _noise(t){ return _hash(_seed + Math.floor(t)) + (_hash(_seed + Math.floor(t)+1) - _hash(_seed + Math.floor(t))) * (t % 1); }

  function update(dt) {
    _trauma = Math.max(0, _trauma - DECAY * dt);
    const shake = _trauma * _trauma;
    if (shake < 0.001) return { dx:0, dy:0, dAngle:0 };
    const t = Date.now() * 0.01;
    return {
      dx:     _noise(t*1.1) * MAX_OFFSET_X * shake,
      dy:     _noise(t*1.3 + 10) * MAX_OFFSET_Y * shake,
      dAngle: _noise(t*0.9 + 20) * MAX_ROTATION * shake
    };
  }

  function impulse(force){ addTrauma(Math.min(1, force / 800)); }
  function reset(){ _trauma=0; }
  function isActive(){ return _trauma > 0.01; }

  // Presets
  function lightBump()  { addTrauma(0.15); }
  function mediumCrash(){ addTrauma(0.45); }
  function heavyCrash() { addTrauma(0.80); }
  function explosion()  { addTrauma(1.00); }
  function rumble(intensity){ addTrauma(intensity*0.08); }

  return { addTrauma, getTrauma, update, impulse, reset, isActive, lightBump, mediumCrash, heavyCrash, explosion, rumble };
})();

// ================================================================
// CAMERA_ZONES — Area-triggered camera behaviour
// ================================================================
const CAMERA_ZONES = (() => {
  const _zones = [];

  function add(zone){
    // zone: {id, x, width, zoom, offsetY, easing, priority}
    _zones.push({ ...zone, id: zone.id||Date.now().toString(36) });
    _zones.sort((a,b)=>(b.priority||0)-(a.priority||0));
  }

  function remove(id){ const i=_zones.findIndex(z=>z.id===id); if(i>=0)_zones.splice(i,1); }
  function clear(){ _zones.length=0; }

  function getActiveZone(vehicleX) {
    for (const z of _zones) {
      if (vehicleX >= z.x && vehicleX <= z.x + z.width) return z;
    }
    return null;
  }

  function getBlendedParams(vehicleX, defaultZoom, defaultOffsetY) {
    const zone = getActiveZone(vehicleX);
    if (!zone) return { zoom: defaultZoom||1, offsetY: defaultOffsetY||0, inZone: false };
    // Fade in/out at edges (20px blend)
    const BLEND = 20;
    const distFromLeft  = vehicleX - zone.x;
    const distFromRight = (zone.x + zone.width) - vehicleX;
    const edgeDist = Math.min(distFromLeft, distFromRight);
    const t = Math.min(1, edgeDist / BLEND);
    const smoothT = t*t*(3-2*t);
    const zoom     = (defaultZoom||1)    + ((zone.zoom||1)    - (defaultZoom||1))    * smoothT;
    const offsetY  = (defaultOffsetY||0) + ((zone.offsetY||0) - (defaultOffsetY||0)) * smoothT;
    return { zoom, offsetY, inZone: true, zoneId: zone.id, blendT: smoothT };
  }

  function count(){ return _zones.length; }

  // Preset zone builders
  function addJumpRamp(x, width)   { add({ x, width, zoom:0.75, offsetY:-80,  priority:5, id:'ramp_'+x }); }
  function addNarrowPath(x, width) { add({ x, width, zoom:1.4,  offsetY:0,    priority:3, id:'narrow_'+x }); }
  function addBossZone(x, width)   { add({ x, width, zoom:0.85, offsetY:30,   priority:10,id:'boss_'+x }); }
  function addFinishLine(x)        { add({ x, width:200, zoom:0.8, offsetY:-40, priority:8, id:'finish' }); }

  return { add, remove, clear, getActiveZone, getBlendedParams, count, addJumpRamp, addNarrowPath, addBossZone, addFinishLine };
})();

// ================================================================
// CAMERA_REPLAY_DIRECTOR — Automatic cinematic replay
// ================================================================
const CAMERA_REPLAY_DIRECTOR = (() => {
  let _active = false;
  let _script  = [];
  let _current = 0;
  let _elapsed = 0;

  function buildScript(highlights) {
    // highlights: [{type, x, y, data}]
    const shots = [];
    for (const h of highlights) {
      if (h.type === 'flip') {
        shots.push({ x:h.x-100, y:h.y, zoom:0.7, duration:2000, label:'Flip!' });
        shots.push({ x:h.x,     y:h.y, zoom:1.2, duration:1500, label:'' });
      } else if (h.type === 'speed') {
        shots.push({ x:h.x, y:h.y, zoom:0.85, duration:1800, label:`${Math.round(h.data)}km/h` });
      } else if (h.type === 'crash') {
        shots.push({ x:h.x, y:h.y, zoom:1.4, duration:2500, label:'CRASH!' });
      } else {
        shots.push({ x:h.x, y:h.y, zoom:1.0, duration:1500, label:'' });
      }
    }
    return shots;
  }

  function start(highlights) {
    _script  = buildScript(highlights || []);
    _current = 0;
    _elapsed = 0;
    _active  = _script.length > 0;
  }

  function stop(){ _active=false; _script=[]; _current=0; }

  function tick(dt) {
    if (!_active || !_script.length) return null;
    _elapsed += dt*1000;
    const shot = _script[_current];
    if (!shot) { stop(); return null; }
    if (_elapsed >= shot.duration) {
      _current++;
      _elapsed = 0;
      if (_current >= _script.length) { stop(); return null; }
    }
    const t = Math.min(1, _elapsed / shot.duration);
    return { ..._script[_current]||shot, progress:t };
  }

  function isActive(){ return _active; }
  function currentShot(){ return _script[_current]||null; }
  function totalShots(){ return _script.length; }

  return { start, stop, tick, isActive, currentShot, totalShots, buildScript };
})();


// ================================================================
// CAMERA_CINEMATIC_CUTS — Hard-cut camera transitions for cinematic moments
// ================================================================
const CAMERA_CINEMATIC_CUTS = (() => {
  const _queue = [];
  let   _current = null;
  let   _elapsed = 0;

  function queue(shot) {
    // shot: {x, y, zoom, angle, duration, label, effect}
    _queue.push({ ...shot, id: Date.now().toString(36)+Math.random().toString(36).slice(2,5) });
  }

  function start() {
    if (_queue.length === 0) return false;
    _current = _queue.shift();
    _elapsed = 0;
    return true;
  }

  function tick(dt) {
    if (!_current) { if (_queue.length) start(); return null; }
    _elapsed += dt*1000;
    if (_elapsed >= (_current.duration||2000)) {
      const done = _current;
      _current = null;
      if (_queue.length) start();
      return { done, next:_current };
    }
    return { current:_current, progress:_elapsed/(_current.duration||2000) };
  }

  function isActive()   { return !!_current; }
  function getCurrent() { return _current; }
  function clearQueue() { _queue.length=0; _current=null; }
  function queueLength(){ return _queue.length; }

  // Preset cinematics
  function victoryShots(vehicleX, vehicleY) {
    queue({ x:vehicleX-200, y:vehicleY-80, zoom:0.7, angle:0.05, duration:2000, label:'Winner!', effect:'vignette' });
    queue({ x:vehicleX,     y:vehicleY,    zoom:1.5, angle:0,    duration:1500, label:'',        effect:'none' });
    queue({ x:vehicleX+100, y:vehicleY-40, zoom:0.9, angle:-0.03,duration:2500, label:'',        effect:'slowmo' });
  }

  function crashShots(vehicleX, vehicleY) {
    queue({ x:vehicleX, y:vehicleY, zoom:1.8, angle:0.08, duration:1000, label:'CRASH!', effect:'shake' });
    queue({ x:vehicleX-50, y:vehicleY-30, zoom:1.2, angle:0, duration:1500, label:'', effect:'slowmo' });
  }

  function startShot(vehicleX, vehicleY, mapName) {
    queue({ x:vehicleX+300, y:vehicleY-150, zoom:0.5, angle:0, duration:3000, label:mapName, effect:'letterbox' });
    queue({ x:vehicleX,     y:vehicleY,     zoom:1.0, angle:0, duration:1000, label:'GO!',   effect:'none' });
  }

  return { queue, start, tick, isActive, getCurrent, clearQueue, queueLength, victoryShots, crashShots, startShot };
})();

// ================================================================
// CAMERA_MINIMAP_CAM — Separate overhead camera for minimap
// ================================================================
const CAMERA_MINIMAP_CAM = (() => {
  let _x=0, _y=0, _scale=1;
  let _canvas=null, _ctx=null;
  let _w=120, _h=48;
  let _dirty = true;

  function init(width, height) {
    _w=width||120; _h=height||48;
    _canvas = document.createElement('canvas');
    _canvas.width=_w; _canvas.height=_h;
    _ctx = _canvas.getContext('2d');
  }

  function setView(worldX, worldY, scaleX) {
    _x=worldX; _y=worldY; _scale=scaleX||1; _dirty=true;
  }

  function beginDraw() {
    if (!_ctx) return null;
    _ctx.clearRect(0,0,_w,_h);
    _ctx.fillStyle='rgba(0,0,0,0.7)';
    _ctx.fillRect(0,0,_w,_h);
    _ctx.save();
    return _ctx;
  }

  function endDraw() {
    if (!_ctx) return;
    _ctx.restore();
    // Border
    _ctx.strokeStyle='rgba(255,215,0,0.4)';
    _ctx.lineWidth=1;
    _ctx.strokeRect(0.5,0.5,_w-1,_h-1);
  }

  function worldToMini(wx, wy) {
    const cx = _x + (_w/_scale)/2; // center of world view
    const mx = _w/2 + (wx-cx)*_scale*0.05;
    const my = _h/2 + (wy-_y)*0.05;
    return { x:mx, y:my };
  }

  function drawVehicle(worldX, worldY, color, isPlayer) {
    if (!_ctx) return;
    const { x,y } = worldToMini(worldX, worldY);
    _ctx.beginPath();
    _ctx.arc(x, y, isPlayer?3:2, 0, Math.PI*2);
    _ctx.fillStyle = color||'#FFD700';
    _ctx.fill();
    if (isPlayer) {
      _ctx.strokeStyle='#fff';
      _ctx.lineWidth=0.5;
      _ctx.stroke();
    }
  }

  function drawTerrain(points, colorFn) {
    if (!_ctx || !points.length) return;
    _ctx.beginPath();
    for (let i=0; i<points.length; i++) {
      const {x,y} = worldToMini(points[i].x, points[i].y);
      i===0 ? _ctx.moveTo(x,y) : _ctx.lineTo(x,y);
    }
    _ctx.lineTo(_w, _h);
    _ctx.lineTo(0, _h);
    _ctx.closePath();
    const grad = _ctx.createLinearGradient(0,0,0,_h);
    grad.addColorStop(0,colorFn?colorFn(0):'#335533');
    grad.addColorStop(1,'#1a1a1a');
    _ctx.fillStyle=grad;
    _ctx.fill();
  }

  function drawCheckpoint(worldX, worldY) {
    if (!_ctx) return;
    const {x,y} = worldToMini(worldX, worldY);
    _ctx.strokeStyle='#FFD700';
    _ctx.lineWidth=1;
    _ctx.beginPath();
    _ctx.moveTo(x,y-6); _ctx.lineTo(x,y+6);
    _ctx.stroke();
  }

  function blit(targetCtx, screenX, screenY) {
    if (!_canvas) return;
    targetCtx.save();
    targetCtx.drawImage(_canvas, screenX||0, screenY||0);
    targetCtx.restore();
  }

  function getCanvas() { return _canvas; }

  return { init, setView, beginDraw, endDraw, worldToMini, drawVehicle, drawTerrain, drawCheckpoint, blit, getCanvas };
})();
