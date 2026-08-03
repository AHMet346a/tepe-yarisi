'use strict';
const HUD = {
  toastTimer:     0,
  toastAch:       null,
  coinPopups:     [],
  flipNotif:      0,
  flipCount:      0,
  newRecord:      false,
  newRecordTimer: 0,

  // ── Tipografi erişimcisi (UITheme yoksa yedeğe düşer — HUD asla çökmez) ────
  // UITheme bare global; modül yüklenmezse doğrudan erişim HUD'u komple bozardı.
  _f(role, size, weight) {
    try {
      if (typeof UITheme !== 'undefined' && UITheme.f && typeof UITheme.f[role] === 'function') {
        return UITheme.f[role](size, weight);
      }
    } catch (e) {}
    const fam = role === 'display' ? 'Impact, "Arial Black", sans-serif'
              : role === 'mono'    ? 'ui-monospace, monospace'
              :                      'system-ui, "Segoe UI", Arial, sans-serif';
    return (weight || (role === 'label' ? '600' : 'bold')) + ' ' + (size || 12) + 'px ' + fam;
  },
  // ── Yarıçap snap erişimcisi (UITheme yoksa gelen değeri aynen döndürür) ────
  _r(v) {
    try { if (typeof UITheme !== 'undefined' && typeof UITheme.snap === 'function') return UITheme.snap(v); } catch (e) {}
    return v;
  },

  // ── internal animation state (additive, non-public) ───────────────────────
  _fuelLerp:     null,   // smoothed fuel fill fraction
  _boostLerp:    null,   // smoothed boost fill fraction
  _nitroLerp:    null,   // smoothed nitro fill fraction (cam çubuk için)
  _distDisplay:  null,   // last shown distance (for pop detection)
  _distPop:      0,      // distance counter pop timer
  _coinDisplay:  null,   // last shown coin count
  _coinPop:      0,      // coin counter pop timer
  _flipT:        0,      // flip notification lifetime accumulator (for easing)
  _lastFrame:    0,      // timestamp of previous frame (for dt clamping)
  _airMeter:     0,      // smoothed 0..1 fill for the in-air combo meter
  _airRot:       0,      // smoothed live rotation reading (radians) while airborne
  _airFade:      0,      // 0..1 visibility of the air meter (eases in/out)
  _prevAngle:    null,   // last vehicle angle (to accumulate live spin)
  _liveRot:      0,      // raw accumulated rotation during the current flight
  _milestoneT:   0,      // distance-milestone flourish timer (seconds, counts down)
  _lastMilestone: 0,     // last distance milestone (m) that fired a flourish
  _speedLerp:    null,   // smoothed speed reading (gives the meter a needle-like sweep)
  _speedPeak:    0,      // session peak speed (km/h) for the hold marker
  _speedFlash:   0,      // brief 0..1 highlight when a new peak speed is set

  // ── engine gauge state (additive — smoothed RPM + gear-shift pop) ──────────
  _rpmLerp:      null,   // smoothed engine RPM reading (needle-like sweep)
  _gearShown:    null,   // last displayed gear (to detect shifts)
  _gearFlash:    0,      // 0..1 highlight pulse fired on a gear change

  // ── trick-name / combo popup state (additive, driven by showFlip) ─────────
  _trickT:      0,       // trick popup lifetime, counts down to 0
  _trickDur:    1.6,     // trick popup total duration (seconds)
  _trickCount:  0,       // flip count captured for the current trick popup
  _trickScore:  0,       // computed "+N" score for the rising flourish

  // ── combo-streak / milestone-banner / boost-ready state (additive) ─────────
  _comboStreak:      0,     // number of chained trick events in the current streak
  _comboLast:        0,     // timestamp of the last trick event (streak window)
  _comboBest:        1,     // best score multiplier reached during the streak
  _comboStreakT:     0,     // combo-streak counter display timer (counts down)
  _bannerT:          0,     // major-milestone banner lifetime (counts down)
  _bannerMeters:     0,     // metres captured for the current banner
  _lastBanner:       0,     // last 1000 m milestone that fired a banner
  _boostReadyFlash:  0,     // brief highlight when boost recharges to full
  _boostWasReady:    false, // previous boost-ready state (edge detect)
  _boostActivePulse: 0,     // eased 0..1 while boost is firing

  // ── big-air flash indicator state (additive — eased visibility) ────────────
  _bigAirFlash:      0,     // 0..1 eased visibility of the compact big-air flash

  // ── FPS counter state (additive — computed from frame-time deltas) ─────────
  _fps:        0,           // smoothed frames-per-second reading
  _fpsAccum:   0,           // accumulated seconds in the current sample window
  _fpsFrames:  0,           // frames counted in the current sample window

  // ── context-tip (run-start hint) + low-fuel edge pulse state (additive) ────
  _tipT:         null,      // context-tip lifetime (seconds, counts down; null = uninit)
  _tipPrevDist:  null,      // last run distance (to detect a run restart internally)
  _tipMode:      'normal',  // GameModes.mode captured for the current tip
  _tipRotIdx:    0,         // rotating index into the generic tip pool (advances per run)
  _lowFuelPulse: 0,         // eased 0..1 low-fuel warning intensity

  // ── run-stats ticker + milestone-distance tick flash state (additive) ──────
  _runFlips:    0,          // cumulative flips landed this run (accrued in showFlip)
  _runBestAir:  0,          // best air-time this run (seconds), read live from airTime
  _runPrevDist: null,       // last run distance (internal run-restart detection)
  _tickFlash:   0,          // 0..1 eased flash for the subtle milestone-tick marker
  _lastTick:    0,          // last distance tick (m) that fired the flash marker

  // small easing helpers
  _lerp(a, b, k) { return a + (b - a) * k; },
  _easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  _easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); },

  draw(ctx, vehicle, gameState, canvasW, canvasH) {
    if (!vehicle) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const pad = 14;
    const now = Date.now();
    // frame delta (seconds), clamped so tab-switches / lag don't jump anims
    let dt = this._lastFrame ? (now - this._lastFrame) / 1000 : 0.016;
    if (dt > 0.1 || dt < 0) dt = 0.016;
    this._lastFrame = now;
    // lerp smoothing factor from dt (~ smooth convergence toward target)
    const smooth = 1 - Math.pow(0.0025, dt);

    // ── FPS sampling (additive) ───────────────────────────────────────────────
    // Accumulate every frame (cheap) so the optional counter is instantly
    // accurate the moment it's toggled on. Refreshes the shown value ~4×/sec.
    this._fpsAccum += dt; this._fpsFrames++;
    if (this._fpsAccum >= 0.25) {
      this._fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0; this._fpsFrames = 0;
    }

    // ── Global HUD scale + opacity (additive; honors Settings, guarded) ───────
    // Reads Settings.hudScale / hudOpacity (may be undefined → default 1) and
    // applies a uniform scale about the canvas centre plus a global alpha to the
    // whole HUD pass. The Pause button is drawn OUTSIDE this scaled group so its
    // fixed touch hitbox (game.js: canvas.width-30, 30, r≈28) stays consistent.
    let _hudScale = 1, _hudAlpha = 1;
    if (typeof Settings !== 'undefined' && Settings.get) {
      const _hs = (typeof Settings.hudScaleFactor === 'function')
                    ? Settings.hudScaleFactor() : Settings.get('hudScale');
      const _ha = (typeof Settings.hudOpacityFactor === 'function')
                    ? Settings.hudOpacityFactor() : Settings.get('hudOpacity');
      if (typeof _hs === 'number' && isFinite(_hs)) _hudScale = Math.max(0.5, Math.min(2, _hs));
      if (typeof _ha === 'number' && isFinite(_ha)) _hudAlpha = Math.max(0, Math.min(1, _ha));
    }
    ctx.globalAlpha = _hudAlpha;               // applies to the whole HUD pass
    ctx.save();                                // ── begin scaled HUD group ──
    if (_hudScale !== 1) {
      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.scale(_hudScale, _hudScale);
      ctx.translate(-canvasW / 2, -canvasH / 2);
    }

    // ── Fuel Bar ─────────────────────────────────────────────────────────────
    const fuelPct = Math.max(0, vehicle.fuel / vehicle.fuelMax);
    const fuelBarH = 90, fuelBarW = 16;
    const fx = pad, fy = pad + 56;
    // smooth the displayed fill toward the true value
    if (this._fuelLerp === null) this._fuelLerp = fuelPct;
    this._fuelLerp = this._lerp(this._fuelLerp, fuelPct, smooth);
    const fuelShown = this._fuelLerp;
    const fuelLow   = fuelPct < 0.25;
    const fuelBlink = fuelLow ? (0.55 + 0.45 * Math.sin(now * 0.012)) : 1;
    this._drawGlassBarV(ctx, fx + 4, fy + 4, fuelBarW, fuelBarH, fuelShown, {
      top:    fuelLow ? '#ff6a3d' : '#ff8a5c',
      bottom: fuelLow ? '#d81b00' : '#c0392b',
      glow:   fuelLow ? '#FF3D00' : null,
      glowA:  fuelBlink,
      alpha:  fuelBlink
    });
    ctx.font = '15px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText('⛽', fx + 10, fy - 4);

    // ── Nitro Bar (if part equipped) ──────────────────────────────────────────
    if (typeof Parts !== 'undefined' && Parts.has && Parts.has('nitro')) {
      const nx = fx + fuelBarW + 18, ny = fy;
      const nPct = Parts.nitroActive ? (1 - Parts.nitroDuration / Parts.NITRO_DURATION)
                 : Parts.nitroCooldown > 0 ? 0 : 1;
      const nActive  = !!Parts.nitroActive;
      const nCooling = Parts.nitroCooldown > 0;
      // Yakıt/Turbo ile aynı cam çubuk dili (eskiden elle çizilmiş düz çubuktu)
      if (this._nitroLerp === null) this._nitroLerp = nPct;
      this._nitroLerp = this._lerp(this._nitroLerp, nPct, smooth);
      this._drawGlassBarV(ctx, nx + 4, ny + 4, fuelBarW, fuelBarH, this._nitroLerp, {
        top:    nActive ? '#ffc46a' : (nCooling ? '#4a2a12' : '#ff8a5c'),
        bottom: nActive ? '#ff8800' : (nCooling ? '#2a1608' : '#d83a00'),
        glow:   nActive ? '#FF8800' : null,
        glowA:  nActive ? (0.7 + 0.3 * Math.sin(now * 0.02)) : 1,
        scan:   nActive
      });
      ctx.font = this._f('label', 14, '400'); ctx.textAlign = 'center'; ctx.fillStyle = '#FF3D00';
      ctx.fillText('🔥', nx + 10, ny - 4);
      if (nCooling) {
        ctx.fillStyle = 'rgba(255,100,0,0.8)'; ctx.font = this._f('label', 9, 'bold');
        ctx.fillText(Math.ceil(Parts.nitroCooldown) + 's', nx + 10, ny + fuelBarH + 18);
      } else if (!nActive) {
        ctx.fillStyle = '#FF3D00'; ctx.font = this._f('label', 8, 'bold');
        ctx.fillText('N', nx + 10, ny + fuelBarH + 16);
      }
    }

    // ── BOOST/TURBO Bar (her araçta — manuel nitro, Space/Shift) ──────────────
    {
      const hasNitroPart = (typeof Parts !== 'undefined' && Parts.has && Parts.has('nitro'));
      const bx = fx + fuelBarW + 18 + (hasNitroPart ? (fuelBarW + 18) : 0);
      const by = fy;
      const bPct = Math.max(0, Math.min(1, (vehicle.boostFuel === undefined ? 100 : vehicle.boostFuel) / (vehicle.boostMax || 140)));
      const bActive = !!vehicle.boostActive;
      if (this._boostLerp === null) this._boostLerp = bPct;
      this._boostLerp = this._lerp(this._boostLerp, bPct, smooth);
      const bShown = this._boostLerp;
      const bLow = bPct < 0.15;
      this._drawGlassBarV(ctx, bx + 4, by + 4, fuelBarW, fuelBarH, bShown, {
        top:    bActive ? '#8af6ff' : (bLow ? '#33517a' : '#4fd6ff'),
        bottom: bActive ? '#22e0ff' : (bLow ? '#20304d' : '#0090c4'),
        glow:   bActive ? '#22e0ff' : null,
        glowA:  bActive ? (0.7 + 0.3 * Math.sin(now * 0.02)) : 1,
        scan:   bActive   // animated energy scan-line when boosting
      });
      ctx.font = '14px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#22e0ff';
      ctx.fillText('🚀', bx + 10, by - 4);
      ctx.fillStyle = 'rgba(180,240,255,0.9)'; ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('BOOST', bx + 10, by + fuelBarH + 16);
    }

    // ── Distance Counter ──────────────────────────────────────────────────────
    const distance = Math.max(0, Math.floor((vehicle.x - 200) / 2));
    const distStr  = (typeof Economy !== 'undefined') ? Economy.formatDistance(distance) : distance + ' m';
    const rank     = (typeof SaveData !== 'undefined') ? SaveData.getRank(distance) : '';
    const rankCol  = (typeof SaveData !== 'undefined') ? SaveData.getRankColor(rank) : '#888';
    // detect distance increase -> trigger a small pop
    if (this._distDisplay === null) this._distDisplay = distance;
    if (distance > this._distDisplay) this._distPop = Math.min(1, this._distPop + 0.5);
    this._distDisplay = distance;
    if (this._distPop > 0) this._distPop = Math.max(0, this._distPop - dt * 4);
    // distance milestone flourish: fire a brief celebratory ring every 500 m
    const _mileStep = 500;
    const _mileNow  = Math.floor(distance / _mileStep) * _mileStep;
    if (_mileNow > this._lastMilestone && _mileNow >= _mileStep) {
      this._lastMilestone = _mileNow;
      this._milestoneT = 1.4;   // seconds of flourish
    }
    if (this._milestoneT > 0) this._milestoneT = Math.max(0, this._milestoneT - dt);
    const distPopScale = 1 + this._easeOutCubic(this._distPop) * 0.10;
    const pulse    = (1 + Math.sin(now * 0.004) * 0.02) * distPopScale;
    ctx.save();
    ctx.translate(canvasW / 2, pad + 18);
    ctx.scale(pulse, pulse);
    // glossy badge with rank-tinted vertical gradient
    const _dg = GradyanDeposu.lin(ctx, 0, -18, 0, 18, [0, 'rgba(24,28,44,0.82)', 1, 'rgba(6,8,16,0.82)']);
    ctx.fillStyle = _dg;
    ctx.beginPath(); ctx.roundRect(-80, -18, 160, 36, 8); ctx.fill();
    // top glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.roundRect(-80, -18, 160, 15, [8, 8, 0, 0]); ctx.fill();
    ctx.strokeStyle = rankCol + 'aa'; ctx.lineWidth = 1.5;
    if (this._distPop > 0.05) { ctx.shadowColor = rankCol; ctx.shadowBlur = 10 * this._distPop; }
    ctx.beginPath(); ctx.roundRect(-80, -18, 160, 36, 8); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Impact, "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(distStr, 0, -2);
    ctx.fillStyle = rankCol; ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    const _rankEN = { 'YENİ BAŞLAYAN':'BEGINNER', 'BRONZ':'BRONZE', 'GÜMÜŞ':'SILVER', 'ALTIN':'GOLD', 'ELMAS':'DIAMOND', 'EFSANE':'LEGEND' };
    ctx.fillText(_rankEN[rank] || rank, 0, 13);
    ctx.restore();

    // distance-milestone flourish: expanding golden ring + label under the badge
    if (this._milestoneT > 0) {
      this._drawMilestoneFlourish(ctx, canvasW / 2, pad + 18, this._milestoneT / 1.4, this._lastMilestone, rankCol);
    }

    // major-milestone sliding banner (every 1000 m) — a bigger celebratory beat
    // than the 500 m ring. Additive: separate state, does not touch the flourish.
    {
      const _bannerStep = 1000;
      const _bannerMile = Math.floor(distance / _bannerStep) * _bannerStep;
      if (_bannerMile > this._lastBanner && _bannerMile >= _bannerStep) {
        this._lastBanner = _bannerMile; this._bannerMeters = _bannerMile; this._bannerT = 2.6;
      }
      if (this._bannerT > 0) {
        this._bannerT = Math.max(0, this._bannerT - dt);
        const _bperf = (typeof Settings !== 'undefined' && Settings.get) ? (Settings.get('graphics') === 'low') : false;
        this._drawMilestoneBanner(ctx, canvasW / 2, canvasH * 0.18, this._bannerMeters,
                                  this._bannerT / 2.6, rankCol, now, _bperf);
      }
    }

    // ── HARİTA REKORU (altta, ortada) ──────────────────────────────────────────
    {
      const _mid = (typeof Game !== 'undefined' && Game.mapId) ? Game.mapId : null;
      const _hs  = (typeof SaveData !== 'undefined' && SaveData.data && SaveData.data.highScores) ? SaveData.data.highScores : null;
      const _rec = (_mid && _hs) ? (_hs[_mid] || 0) : 0;
      const _recStr = (typeof Economy !== 'undefined') ? Economy.formatDistance(_rec) : _rec + ' m';
      const _beaten = distance > _rec && _rec > 0;
      const _rw = 200, _rh = 30, _ry = canvasH - 26;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const _rg = GradyanDeposu.lin(ctx, 0, _ry - _rh / 2, 0, _ry + _rh / 2, [0, 'rgba(22,18,8,0.82)', 1, 'rgba(8,6,2,0.82)']);
      ctx.fillStyle = _rg;
      ctx.beginPath(); ctx.roundRect(canvasW / 2 - _rw / 2, _ry - _rh / 2, _rw, _rh, 9); ctx.fill();
      ctx.strokeStyle = _beaten ? '#2ecc71' : 'rgba(255,210,60,0.7)'; ctx.lineWidth = 1.5;
      if (_beaten) { ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 10 + 6 * Math.sin(now * 0.008); }
      ctx.beginPath(); ctx.roundRect(canvasW / 2 - _rw / 2, _ry - _rh / 2, _rw, _rh, 9); ctx.stroke();
      ctx.shadowBlur = 0;
      const _remain = _rec - distance;
      let _rlabel, _rcol;
      if (_beaten)                                { _rlabel = '🏆 YENİ REKOR!  ' + _recStr; _rcol = '#2ecc71'; }
      else if (_rec > 0 && _remain <= 300)        { _rlabel = '🔥 REKORA ' + _remain + ' m!';  _rcol = '#ff8c1a'; }
      else                                        { _rlabel = '🏁 REKOR:  ' + _recStr;       _rcol = '#ffd23c'; }
      ctx.font = 'bold 12px Impact, "Arial Black", system-ui, sans-serif'; ctx.fillStyle = _rcol;
      ctx.fillText(_rlabel, canvasW / 2, _ry + 1);
      ctx.restore();
    }

    // ── Coin Counter ──────────────────────────────────────────────────────────
    const coinVal = gameState.coinsCollected || 0;
    if (this._coinDisplay === null) this._coinDisplay = coinVal;
    if (coinVal > this._coinDisplay) this._coinPop = 1;
    this._coinDisplay = coinVal;
    if (this._coinPop > 0) this._coinPop = Math.max(0, this._coinPop - dt * 3.5);
    const coinPopScale = 1 + this._easeOutBack(1 - this._coinPop) * 0 + this._coinPop * 0.14 * Math.sin(this._coinPop * Math.PI);
    const _ccx = canvasW / 2, _ccy = pad + 70;
    ctx.save();
    ctx.translate(_ccx, _ccy);
    ctx.scale(coinPopScale, coinPopScale);
    const _cg = GradyanDeposu.lin(ctx, 0, -12, 0, 12, [0, 'rgba(20,20,10,0.62)', 1, 'rgba(4,4,2,0.62)']);
    ctx.fillStyle = _cg;
    ctx.beginPath(); ctx.roundRect(-55, -12, 110, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,' + (0.35 + this._coinPop * 0.5).toFixed(2) + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-55, -12, 110, 24, 6); ctx.stroke();
    if (this._coinPop > 0.05) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12 * this._coinPop; }
    // little spinning coin glyph
    ctx.save();
    ctx.translate(-30, 0);
    const _spin = Math.abs(Math.cos(now * 0.004));
    ctx.scale(_spin * 0.7 + 0.3, 1);
    const _coinG = GradyanDeposu.rad(ctx, -1, -1, 1, 0, 0, 7, [0, '#FFF3A0', 0.6, '#FFD700', 1, '#E6941A']);
    ctx.fillStyle = _coinG;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#FFE680';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(coinVal), -18, 0);
    ctx.restore();

    // ── Speed ─────────────────────────────────────────────────────────────────
    const speed = Math.floor(Math.abs(vehicle.vx) * 0.36);
    // smooth the reading so the meter sweeps like a needle instead of snapping
    if (this._speedLerp === null) this._speedLerp = speed;
    this._speedLerp = this._lerp(this._speedLerp, speed, Math.min(1, smooth * 1.6));
    const _spPct = Math.max(0, Math.min(1, this._speedLerp / 300));
    // session peak-speed hold marker (slowly bleeds down so it stays meaningful)
    if (speed > this._speedPeak) { this._speedPeak = speed; this._speedFlash = 1; }
    else this._speedPeak = Math.max(speed, this._speedPeak - dt * 6);
    if (this._speedFlash > 0) this._speedFlash = Math.max(0, this._speedFlash - dt * 1.5);
    const _spPeakPct = Math.max(0, Math.min(1, this._speedPeak / 300));
    const _spX = canvasW - 104, _spY = pad, _spW = 92, _spH = 42;
    ctx.save();
    const _spCol = speed > 200 ? '#FF3D00' : speed > 120 ? '#ffb020' : '#8fe3ff';
    // glossy panel with vertical gradient + drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    const _spBg = GradyanDeposu.lin(ctx, 0, _spY, 0, _spY + _spH, [0, 'rgba(24,28,44,0.80)', 1, 'rgba(6,8,16,0.80)']);
    ctx.fillStyle = _spBg;
    ctx.beginPath(); ctx.roundRect(_spX, _spY, _spW, _spH, 9); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // top sheen
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(_spX, _spY, _spW, _spH * 0.4, [9, 9, 0, 0]); ctx.fill();
    // tinted rim, brighter at high speed
    ctx.strokeStyle = _spCol + (speed > 120 ? 'cc' : '66'); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(_spX + 0.5, _spY + 0.5, _spW - 1, _spH - 1, 9); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (speed > 200) { ctx.shadowColor = '#FF3D00'; ctx.shadowBlur = 10 + 4 * Math.sin(now * 0.02); }
    ctx.fillStyle = _spCol; ctx.font = 'bold 21px Impact, "Arial Black", system-ui, sans-serif';
    ctx.fillText(String(speed), _spX + _spW / 2, _spY + 15);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,210,240,0.7)'; ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('KM/H', _spX + _spW / 2, _spY + 27);
    // animated speed meter: segmented track, travelling shimmer at speed, peak-hold marker
    this._drawSpeedMeter(ctx, _spX + 8, _spY + 33, _spW - 16, 5, _spPct, _spPeakPct,
                         speed > 120, this._speedFlash, now);
    ctx.restore();

    // ── Bot Race Indicator ────────────────────────────────────────────────────
    if (typeof Bot !== 'undefined' && Bot.active && Bot.vehicle) {
      const diff = Bot.getDistanceDiff(vehicle.x, 200);
      const isAhead = diff > 0;
      const absDiff = (typeof Economy !== 'undefined')
        ? Economy.formatDistance(Math.abs(Math.floor(diff / 2)))
        : Math.abs(Math.floor(diff / 2)) + 'm';
      const bx = canvasW - 110, by = pad + 48;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(bx, by, 100, 28, 6); ctx.fill();
      ctx.fillStyle = isAhead ? '#FF3D00' : '#00CC44';
      ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(isAhead ? '🤖 +' + absDiff : '🤖 -' + absDiff, bx + 50, by + 14);
    }

    // ── Boost / Nitro charge ring (compact, right flank) ──────────────────────
    // Small circular gauge that mirrors the boost charge fraction read live from
    // the vehicle. Brightens while charging and lights up while firing. Guarded.
    {
      const _bcFuel = (vehicle.boostFuel === undefined) ? 100 : vehicle.boostFuel;
      const _bcFrac = Math.max(0, Math.min(1, _bcFuel / (vehicle.boostMax || 140)));
      const _bcAct  = !!vehicle.boostActive;
      const _bcPerf = (typeof Settings !== 'undefined' && Settings.get) ? (Settings.get('graphics') === 'low') : false;
      this._drawBoostChargeRing(ctx, canvasW - 30, pad + 102, _bcFrac, _bcAct, now, _bcPerf);
    }

    // ── Air-time / Flip meter (only while airborne) ───────────────────────────
    // Reads live vehicle state (onGround / airTime / angle) — no external wiring.
    {
      const airborne = (vehicle.onGround === false) ||
                       (vehicle.onGround === undefined && (vehicle.airTime || 0) > 0.05);
      const airT = Math.max(0, vehicle.airTime || 0);
      // accumulate live rotation during the current flight for a "spin" readout
      const ang = vehicle.angle || 0;
      if (airborne) {
        if (this._prevAngle !== null) {
          let dA = ang - this._prevAngle;
          // unwrap large jumps so a wrap-around doesn't spike the reading
          if (dA >  Math.PI) dA -= Math.PI * 2;
          if (dA < -Math.PI) dA += Math.PI * 2;
          this._liveRot += dA;
        }
      } else {
        this._liveRot = 0;
      }
      this._prevAngle = ang;
      // target fill grows with airtime (full ~3s) — the "hang-time" gauge
      const airTarget = airborne ? Math.min(1, airT / 3) : 0;
      this._airMeter = this._lerp(this._airMeter, airTarget, smooth);
      this._airRot   = this._lerp(this._airRot, this._liveRot, Math.min(1, smooth * 2.2));
      // fade the whole widget in when airborne long enough, out when grounded
      const fadeTarget = (airborne && airT > 0.25) ? 1 : 0;
      this._airFade = this._lerp(this._airFade, fadeTarget, Math.min(1, smooth * 3));
      if (this._airFade > 0.02) {
        this._drawAirComboMeter(ctx, canvasW / 2, canvasH * 0.62, this._airMeter,
                                airT, this._airRot, this._airFade, now);
      }
      // compact big-air / current-combo flash — appears (and flashes) only on
      // long hang-time. Reads the live spin count from the accumulated rotation
      // so it doubles as a "current combo" readout. Additive; no new wiring.
      const _bigAir = airborne && airT > 1.4;
      this._bigAirFlash = this._lerp(this._bigAirFlash, _bigAir ? 1 : 0, Math.min(1, smooth * 3));
      if (this._bigAirFlash > 0.02) {
        const _baSpins = Math.floor(Math.abs(this._liveRot) / (Math.PI * 2) + 0.001);
        const _baPerf = (typeof Settings !== 'undefined' && Settings.get) ? (Settings.get('graphics') === 'low') : false;
        this._drawBigAirFlash(ctx, canvasW / 2, canvasH * 0.62 - 72, airT, _baSpins,
                              this._bigAirFlash, now, _baPerf);
      }
    }

    // ── Flip Notification ─────────────────────────────────────────────────────
    if (this.flipNotif > 0) {
      // lifetime 0..1 (1.5s total) → drives entrance pop + exit fade/slide
      const life  = this.flipNotif / 1.5;               // 1 at spawn → 0 at end
      const age   = 1 - life;                            // 0 at spawn → 1 at end
      // entrance: overshoot pop in the first ~25% of life
      const inK   = Math.min(1, age / 0.25);
      const popS  = this._easeOutBack(inK);              // scale w/ slight overshoot
      // exit: slide up + fade over the last ~30%
      const outK  = Math.max(0, (age - 0.7) / 0.3);
      const alpha = Math.min(1, life * 4) * (1 - this._easeOutCubic(outK));
      const slide = -this._easeOutCubic(outK) * 34;      // drift upward on exit
      const cx = canvasW / 2, cy = canvasH * 0.35 + 20 + slide;
      const isCombo = this.flipCount >= 3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(cx, cy);
      ctx.scale(popS, popS);
      // polish: soft pulsing halo behind the badge for extra depth/punch
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha) * 0.5;
      ctx.shadowColor = isCombo ? '#ff5500' : '#ff9020';
      ctx.shadowBlur = 24 + 8 * Math.sin(now * 0.02);
      ctx.fillStyle = isCombo ? 'rgba(255,90,0,0.35)' : 'rgba(255,150,40,0.30)';
      ctx.beginPath(); ctx.roundRect(-92, -22, 184, 44, 12); ctx.fill();
      ctx.restore();
      // shaped badge with fiery vertical gradient
      const fg = GradyanDeposu.lin(ctx, 0, -22, 0, 22, [0, isCombo ? '#ffd23d' : '#ffb347', 1, isCombo ? '#ff3d00' : '#e8730a']);
      ctx.fillStyle = fg;
      ctx.shadowColor = isCombo ? '#ff5500' : '#ff9020';
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.roundRect(-92, -22, 184, 44, 12); ctx.fill();
      ctx.shadowBlur = 0;
      // top glass sheen
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.roundRect(-92, -22, 184, 18, [12, 12, 0, 0]); ctx.fill();
      // rim
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-92, -22, 184, 44, 12); ctx.stroke();
      // spinning swirl glyph on the left
      ctx.save();
      ctx.translate(-64, 0);
      ctx.rotate(now * 0.008);
      ctx.font = 'bold 22px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText('🌀', 0, 0);
      ctx.restore();
      // label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 19px Impact, "Arial Black", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = isCombo ? (this.flipCount + 'x COMBO!') : (this.flipCount + ' FLIP!');
      ctx.fillText(label, 14, -6);
      // combo score multiplier (mirrors the game's flip-count → multiplier tiers)
      const _mult = this._comboMult(this.flipCount);
      ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = isCombo ? '#fff2b0' : 'rgba(255,255,255,0.85)';
      ctx.fillText('SCORE ×' + _mult, 14, 10);
      ctx.restore();
      // floating multiplier chip that pops above the badge on big combos
      if (isCombo) {
        this._drawComboMultiplierChip(ctx, cx + 78, cy - 26, _mult, popS, Math.max(0, alpha), now);
      }
      this.flipNotif -= dt;
    }

    // ── Trick-Name / Combo Popup (additive — driven by showFlip) ──────────────
    if (this._trickT > 0) {
      const dur    = this._trickDur || 1.6;
      const tlife  = this._trickT / dur;                     // 1 → 0
      const tage   = 1 - tlife;                               // 0 → 1
      const tpop   = this._easeOutBack(Math.min(1, tage / 0.22));
      const toutK  = Math.max(0, (tage - 0.68) / 0.32);       // exit ramp
      const talpha = Math.min(1, tlife * 5) * (1 - this._easeOutCubic(toutK));
      const tcx    = canvasW / 2;
      const tcy    = canvasH * 0.26 - this._easeOutCubic(toutK) * 26;  // drift up on exit
      this._drawTrickPopup(ctx, tcx, tcy, this._trickCount, this._trickScore,
                           tpop, Math.max(0, talpha), tage, now);
      this._trickT -= dt;
      if (this._trickT < 0) this._trickT = 0;
    }

    // ── Combo-Streak Counter (escalating — additive, driven by showFlip) ──────
    // Chains successive trick events into an escalating "N×" streak on the right
    // flank so it never crowds the centre trick popup. All state is internal.
    if (this._comboStreakT > 0) {
      this._comboStreakT = Math.max(0, this._comboStreakT - dt);
      if (this._comboStreak >= 2) {
        const _cperf = (typeof Settings !== 'undefined' && Settings.get) ? (Settings.get('graphics') === 'low') : false;
        this._drawComboStreak(ctx, canvasW - 74, canvasH * 0.44, this._comboStreak,
                              this._comboBest, this._comboStreakT / 2.4, now, _cperf);
      }
    }

    // ── Boost Ready / Active Indicator (additive, clean pill) ─────────────────
    // Reads boost state live from the vehicle. Flashes "READY" when the boost
    // tops up to full and shows "BOOST!" while firing. Everything guarded.
    {
      const _bMax   = (vehicle.boostMax || 140);
      const _bf     = (vehicle.boostFuel === undefined) ? _bMax : vehicle.boostFuel;
      const _bReady = _bf >= _bMax - 0.5 && !vehicle.boostActive;
      const _bAct   = !!vehicle.boostActive;
      if (_bReady && !this._boostWasReady) this._boostReadyFlash = 1.4;
      this._boostWasReady = _bReady;
      if (this._boostReadyFlash > 0) this._boostReadyFlash = Math.max(0, this._boostReadyFlash - dt);
      this._boostActivePulse = this._lerp(this._boostActivePulse, _bAct ? 1 : 0, Math.min(1, smooth * 3));
      if (_bAct || this._boostReadyFlash > 0.01 || this._boostActivePulse > 0.02) {
        const _biperf = (typeof Settings !== 'undefined' && Settings.get) ? (Settings.get('graphics') === 'low') : false;
        this._drawBoostReadyIndicator(ctx, canvasW / 2, canvasH - 58, _bAct, this._boostReadyFlash,
                                      this._boostActivePulse, Math.max(0, Math.min(1, _bf / _bMax)), now, _biperf);
      }
    }

    // ── Achievement Toast ─────────────────────────────────────────────────────
    const ach = this.toastAch || (typeof Achievements !== 'undefined' ? Achievements.getToast() : null);
    if (ach && !this.toastAch) { this.toastAch = ach; this.toastTimer = 3.0; }
    if (this.toastAch && this.toastTimer > 0) {
      const ta = Math.min(1, this.toastTimer * 2, (3 - this.toastTimer) * 2);
      const ty = canvasH - 88 - (1 - Math.min(1, (3 - this.toastTimer) * 4)) * 60;
      ctx.save();
      ctx.globalAlpha = ta;
      // gradient card with drop shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
      const tgb = GradyanDeposu.lin(ctx, pad, ty, pad, ty + 56, [0, 'rgba(24,22,14,0.94)', 1, 'rgba(8,7,4,0.94)']);
      ctx.fillStyle = tgb;
      ctx.beginPath(); ctx.roundRect(pad, ty, 260, 56, 10); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // gold accent bar on the left edge
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.roundRect(pad, ty, 5, 56, [10, 0, 0, 10]); ctx.fill();
      // glowing gold rim
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(255,215,0,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(pad, ty, 260, 56, 10); ctx.stroke();
      ctx.shadowBlur = 0;
      // icon with soft halo
      ctx.font = '22px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFE680';
      ctx.fillText(this.toastAch.icon || '★', pad + 12, ty + 36);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('ACHIEVEMENT: ' + this.toastAch.name, pad + 44, ty + 10);
      ctx.fillStyle = '#aabbcc'; ctx.font = '10px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText(this.toastAch.desc || '', pad + 44, ty + 30);
      ctx.restore();
      this.toastTimer -= 0.016;
      if (this.toastTimer <= 0) this.toastAch = null;
    }

    // ── Coin Popups ───────────────────────────────────────────────────────────
    // Rich rise+fade pickup popups, colour & scale tiered by value (see _coinTier).
    const _cpPerfLow = (typeof Settings !== 'undefined' && Settings.get) ? (Settings.get('graphics') === 'low') : false;
    for (let i = this.coinPopups.length - 1; i >= 0; i--) {
      const cp = this.coinPopups[i];
      // bigger hauls drift up a touch faster for extra emphasis
      const tier = this._coinTier(cp.val);
      cp.y  -= 1.5 + (tier.size - 1) * 1.2; cp.life -= 0.016;
      if (cp.life <= 0) { this.coinPopups.splice(i, 1); continue; }
      const life = Math.max(0, Math.min(1, cp.life / 1.5));  // 1 → 0
      const age  = 1 - life;
      // little pop-in on the first ~20% then gentle fade out
      const pop  = this._easeOutBack(Math.min(1, age / 0.2)) * tier.size;
      const fade = life < 0.4 ? life / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade);
      ctx.translate(cp.x, cp.y);
      ctx.scale(pop, pop);
      // soft coloured halo behind larger pickups so they read louder
      if (tier.size > 1.05 && !_cpPerfLow) { ctx.shadowColor = tier.ring; ctx.shadowBlur = 8; }
      // gem/coin glyph tinted by value
      const cg = GradyanDeposu.rad(ctx, -8, -1, 1, -6, 0, 5.5, [0, tier.core, 0.6, tier.ring, 1, tier.edge]);
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(-8, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // value text with dark outline for contrast, tinted to match the tier
      ctx.font = 'bold 15px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,22,0,0.82)';
      ctx.strokeText('+' + cp.val, 0, 0);
      ctx.fillStyle = tier.txt;
      ctx.fillText('+' + cp.val, 0, 0);
      ctx.restore();
    }

    // ── New Record Banner ─────────────────────────────────────────────────────
    if (this.newRecord) {
      this.newRecordTimer += dt;
      const p2 = Math.abs(Math.sin(this.newRecordTimer * 4));
      // gentle breathing scale for a celebratory feel
      const nrScale = 1 + p2 * 0.06;
      const nx = canvasW / 2, nyv = canvasH * 0.14;
      ctx.save();
      ctx.translate(nx, nyv);
      ctx.scale(nrScale, nrScale);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px Impact, "Arial Black", system-ui, sans-serif';
      // dark outline for readability over any background
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,25,0,0.7)';
      ctx.strokeText('★ NEW RECORD!', 0, 0);
      // shimmering gold gradient fill + pulsing glow
      const nrg = GradyanDeposu.lin(ctx, 0, -14, 0, 14, [0, '#FFF3A0', 0.5, '#FFD700', 1, '#FFA000']);
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10 + p2 * 14;
      ctx.fillStyle = nrg;
      ctx.fillText('★ NEW RECORD!', 0, 0);
      ctx.restore();
    }

    // ── Route strip (bottom-left) + Engine gauge (bottom-right) ───────────────
    // Additive corner widgets. All data is read LIVE from the passed vehicle and
    // from Game.terrain / Bot globals — everything guarded, so nothing new needs
    // to be wired in. Respects the low-graphics perf flag.
    {
      const perfLow = (typeof Settings !== 'undefined' && Settings.get)
                        ? (Settings.get('graphics') === 'low') : false;
      const psW = 210, psH = 34;
      this._drawRouteStrip(ctx, pad, canvasH - psH - 98, psW, psH, vehicle, now, perfLow);
      // best-distance "ghost line" overlaid on the route strip. Drawn independently
      // (does NOT touch _drawRouteStrip internals) — it just re-derives the same
      // world→strip mapping. Best distance comes from the map record; fully guarded
      // so nothing renders when it is unavailable.
      {
        const _gMid  = (typeof Game !== 'undefined' && Game.mapId) ? Game.mapId : null;
        const _gHigh = (typeof SaveData !== 'undefined' && SaveData.data && SaveData.data.highScores)
                         ? SaveData.data.highScores : null;
        const _gBest = (_gMid && _gHigh) ? (_gHigh[_gMid] || 0) : 0;
        if (_gBest > 0) {
          this._drawBestGhostLine(ctx, pad, canvasH - psH - 98, psW, psH, vehicle, _gBest, now, perfLow);
        }
      }
      const egW = 132, egH = 40;
      this._drawEngineGauge(ctx, canvasW - pad - egW, canvasH - egH - 10, egW, egH,
                            vehicle, now, smooth, perfLow);
    }

    // ── Context tip (run-start) + low-fuel edge pulse (additive) ──────────────
    // Brief mode-appropriate hint shown at the start of a run (fades after ~3s)
    // plus a tiny pulsing low-fuel warning pinned to the left HUD edge. Run-start
    // is detected internally by watching the distance reset — the mode is read
    // live from GameModes (guarded). Everything here is additive: no new wiring,
    // no API change, and it honours the low-graphics perf flag.
    {
      const _tPerf = (typeof Settings !== 'undefined' && Settings.get)
                       ? (Settings.get('graphics') === 'low') : false;
      // run-start / restart: first frame ever, or the distance dropped back to ~0
      if (this._tipPrevDist === null || distance < this._tipPrevDist - 40) {
        this._tipT = 3.4;
        this._tipMode = (typeof GameModes !== 'undefined' && GameModes.mode)
                          ? GameModes.mode : 'normal';
        this._tipRotIdx = (this._tipRotIdx + 1) % 6;   // rotate the generic tip each run
      }
      this._tipPrevDist = distance;
      if (this._tipT > 0) {
        this._tipT = Math.max(0, this._tipT - dt);
        this._drawContextTip(ctx, canvasW, canvasH, this._tipT / 3.4,
                             this._tipMode, this._tipRotIdx, now, _tPerf);
      }
      // low-fuel edge pulse: eases in below 25% fuel (while fuel remains), out otherwise
      const _lfTarget = (fuelPct < 0.25 && (vehicle.fuel || 0) > 0) ? 1 : 0;
      this._lowFuelPulse = this._lerp(this._lowFuelPulse, _lfTarget, Math.min(1, smooth * 3));
      if (this._lowFuelPulse > 0.02) {
        this._drawLowFuelPulse(ctx, canvasW, canvasH, this._lowFuelPulse, now, _tPerf);
      }
    }

    // ── Run-stats ticker + milestone-distance tick flash (additive) ───────────
    // A compact secondary readouts cluster (coins, flips and best air-time for
    // the current run) plus a subtle, sound-less flash marker that ticks past
    // every 250 m. Run stats are read LIVE — coins from gameState, best air from
    // the live airTime, flips accumulated in showFlip — and reset internally when
    // the run distance drops back toward zero. All guarded; honours low-graphics.
    {
      const _rsPerf = (typeof Settings !== 'undefined' && Settings.get)
                        ? (Settings.get('graphics') === 'low') : false;
      // internal run-restart detection (independent of the context-tip's own)
      if (this._runPrevDist === null || distance < this._runPrevDist - 40) {
        this._runFlips = 0; this._runBestAir = 0; this._lastTick = 0; this._tickFlash = 0;
      }
      this._runPrevDist = distance;
      // best air-time this run, read live from the vehicle
      const _rsAir = Math.max(0, vehicle.airTime || 0);
      if (_rsAir > this._runBestAir) this._runBestAir = _rsAir;
      // milestone tick: brief flash every 250 m — distinct from the 500 m flourish
      // and 1000 m banner; purely a subtle passing marker, no sound, no text spam
      const _tickStep = 250;
      const _tickNow  = Math.floor(distance / _tickStep) * _tickStep;
      if (_tickNow > this._lastTick && _tickNow >= _tickStep) {
        this._lastTick = _tickNow; this._tickFlash = 1;
      }
      if (this._tickFlash > 0) this._tickFlash = Math.max(0, this._tickFlash - dt * 1.8);
      if (this._tickFlash > 0.01) {
        this._drawMilestoneTick(ctx, canvasW / 2, pad + 40, this._tickFlash, _tickNow, _rsPerf);
      }
      // compact run-stats ticker (shown unless explicitly disabled in Settings)
      const _rsShow = (typeof Settings === 'undefined' || !Settings.get)
                        ? true : (Settings.get('showRunStats') !== false);
      if (_rsShow) {
        this._drawRunStats(ctx, pad, canvasH - 166, coinVal, this._runFlips,
                           this._runBestAir, now, _rsPerf);
      }
    }

    ctx.restore();                             // ── end scaled HUD group ──

    // ── Pause Button ─────────────────────────────────────────────────────────
    // Drawn unscaled (only alpha applies) so its fixed touch hitbox in game.js
    // never drifts, regardless of the hudScale setting.
    {
      const pbx = canvasW - 30, pby = 30;
      const pbg = GradyanDeposu.rad(ctx, pbx - 5, pby - 6, 2, pbx, pby, 22, [0, 'rgba(40,46,66,0.72)', 1, 'rgba(6,8,16,0.72)']);
      ctx.fillStyle = pbg;
      ctx.beginPath(); ctx.arc(pbx, pby, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(pbx, pby, 21, 0, Math.PI * 2); ctx.stroke();
      // two rounded pause bars
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.roundRect(pbx - 6, pby - 8, 4.5, 16, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(pbx + 1.5, pby - 8, 4.5, 16, 2); ctx.fill();
    }

    // ── Optional FPS counter (additive; only when enabled in Settings) ────────
    // Drawn unscaled with its own alpha so it stays readable no matter the
    // hudScale / hudOpacity values. Key is 'showFps' in settings.js.
    if (typeof Settings !== 'undefined' && Settings.get && Settings.get('showFps') === true) {
      this._drawFpsCounter(ctx, canvasW, canvasH, now);
    }

    ctx.restore();
  },

  addCoinPopup(screenX, screenY, val) {
    this.coinPopups.push({ x: screenX, y: screenY, val, life: 1.5 });
  },
  showFlip(count)    {
    this.flipCount = count; this.flipNotif = 1.5;
    // trick-name / combo popup (additive — triggers with no new external wiring)
    this._trickCount = count;
    this._trickScore = Math.round(100 * Math.max(1, count) * this._comboMult(count));
    this._trickT = this._trickDur || 1.6;
    // escalating combo-streak accumulation (additive — no public signature change)
    this._registerCombo(count);
    // run-stats: tally this run's flips (additive; no public signature change)
    this._runFlips = (this._runFlips || 0) + Math.max(1, count | 0);
  },
  setNewRecord(val)  { this.newRecord = val; this.newRecordTimer = 0; }
,
  // ── Optional FPS counter (additive) ────────────────────────────────────────
  // Small corner pill showing frames-per-second, computed internally from frame
  // deltas (this._fps). Corner comes from Settings.fpsCounterCorner ('tl' default),
  // guarded. Colour-coded by smoothness. Respects the low-graphics perf flag
  // (skips the drop shadow). Draws unscaled with its own alpha for readability.
  _drawFpsCounter(ctx, canvasW, canvasH, now) {
    const fps = Math.max(0, Math.min(999, Math.round(this._fps || 0)));
    const perfLow = (typeof Settings !== 'undefined' && Settings.get)
                      ? (Settings.get('graphics') === 'low') : false;
    const corner = (typeof Settings !== 'undefined' && typeof Settings.fpsCorner === 'function')
                     ? Settings.fpsCorner()
                     : ((typeof Settings !== 'undefined' && Settings.get)
                          ? (Settings.get('fpsCounterCorner') || 'tl') : 'tl');
    const w = 62, h = 22, m = 10;
    let x, y;
    switch (corner) {
      case 'tr': x = canvasW - m - w; y = m;               break;
      case 'bl': x = m;               y = canvasH - m - h; break;
      case 'br': x = canvasW - m - w; y = canvasH - m - h; break;
      default:   x = m;               y = m;               break;   // 'tl'
    }
    const col = fps >= 50 ? '#4ade80' : fps >= 30 ? '#ffd23c' : '#ff5a4d';
    ctx.save();
    ctx.globalAlpha = 1;                       // always legible, ignores hudOpacity
    if (!perfLow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    const bg = GradyanDeposu.lin(ctx, 0, y, 0, y + h, [0, 'rgba(18,22,34,0.82)', 1, 'rgba(4,6,12,0.82)']);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = col + '99'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.stroke();
    // little status dot
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x + 10, y + h / 2, 3, 0, Math.PI * 2); ctx.fill();
    // value + label
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = col; ctx.font = 'bold 13px "Consolas", monospace';
    ctx.fillText(String(fps), x + 18, y + h / 2 + 0.5);
    ctx.fillStyle = 'rgba(200,210,240,0.7)'; ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('FPS', x + w - 22, y + h / 2 + 0.5);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIVE IN-RACE CORNER WIDGETS (self-contained, live-read, guarded)
  // ═══════════════════════════════════════════════════════════════

  // Small route / distance-progress strip: real terrain profile sampled from
  // Game.terrain.getYAt, coins & fuel ahead, distance ticks, a rival marker and
  // a "you are here" car dot. Purely additive — reads globals defensively.
  _drawRouteStrip(ctx, x, y, w, h, vehicle, now, perfLow) {
    const carWX    = vehicle.x || 0;
    const backSpan = 900, aheadSpan = 3300, wSpan = backSpan + aheadSpan;
    const wStart   = carWX - backSpan;
    const toX = (wx) => x + ((wx - wStart) / wSpan) * w;
    const terr = (typeof Game !== 'undefined' && Game.terrain) ? Game.terrain : null;

    ctx.save();
    // housing
    if (!perfLow) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    const house = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(20,26,40,0.80)', 1, 'rgba(6,9,16,0.80)']);
    ctx.fillStyle = house;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // clip the inner "screen" so everything stays inside the rounded frame
    const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, 5); ctx.clip();

    // sky wash
    const sky = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(60,96,140,0.30)', 1, 'rgba(10,18,26,0)']);
    ctx.fillStyle = sky; ctx.fillRect(ix, iy, iw, ih);

    // real terrain profile (cheap sampling of Game.terrain.getYAt)
    let profiled = false;
    if (terr && typeof terr.getYAt === 'function') {
      const step = 6;                              // px between samples (perf-friendly)
      const n = Math.max(2, Math.floor(iw / step));
      const ys = new Array(n + 1);
      let minY = Infinity, maxY = -Infinity;
      for (let i = 0; i <= n; i++) {
        const wx = wStart + (i / n) * wSpan;
        let gy = null;
        try { gy = terr.getYAt(wx); } catch (e) { gy = null; }
        if (typeof gy !== 'number' || !isFinite(gy)) gy = null;
        ys[i] = gy;
        if (gy !== null) { if (gy < minY) minY = gy; if (gy > maxY) maxY = gy; }
      }
      if (minY < maxY) {
        const span = Math.max(1, maxY - minY);
        const top = iy + ih * 0.30, bot = iy + ih * 0.92;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= n; i++) {
          const gy = ys[i];
          const px = ix + (i / n) * iw;
          const norm = gy === null ? 0.5 : (gy - minY) / span;
          const py = top + norm * (bot - top);
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
        }
        ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix, iy + ih); ctx.closePath();
        const gfill = GradyanDeposu.lin(ctx, 0, top, 0, bot, [0, 'rgba(76,150,66,0.55)', 1, 'rgba(24,54,26,0.65)']);
        ctx.fillStyle = gfill; ctx.fill();
        ctx.strokeStyle = 'rgba(150,230,120,0.75)'; ctx.lineWidth = 1.2; ctx.stroke();
        profiled = true;
      }
    }
    if (!profiled) {
      const baseY = iy + ih * 0.62;                // flat fallback ground
      ctx.fillStyle = 'rgba(40,70,40,0.55)';
      ctx.fillRect(ix, baseY, iw, iy + ih - baseY);
    }

    // distance ticks every 250 m (labels every 500 m)
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const mStart = (wStart - 200) / 2, mEnd = (wStart + wSpan - 200) / 2;
    // PERF(31 Tmz): lineWidth/font her cizgide yeniden ATANIYORDU (olcum: 6,0 +
    //   2,0 gereksiz atama/kare). Dongu disina alindi / degisince atanir.
    // 🔴 `ctx.lineWidth = 1` dongu DISINA cikarilamaz: dongu hic donmezse
    //   (gorunur isaret yoksa) durumu degistirir ve SONRAKI cizimleri etkiler.
    //   Bu yuzden ilk yinelemede bir kez kurulur.
    const firstTick = Math.ceil(mStart / 250) * 250;
    let _sonCizgi = null, _fontKuruldu = false, _lwKuruldu = false;
    for (let m = firstTick; m <= mEnd; m += 250) {
      if (m < 0) continue;
      const tx = toX(m * 2 + 200);
      const major = (m % 500 === 0);
      const _sc = major ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)';
      if (_sc !== _sonCizgi) { ctx.strokeStyle = _sc; _sonCizgi = _sc; }
      if (!_lwKuruldu) { ctx.lineWidth = 1; _lwKuruldu = true; }
      ctx.beginPath(); ctx.moveTo(tx, iy + 2); ctx.lineTo(tx, iy + ih - 2); ctx.stroke();
      if (major && m > 0) {
        ctx.fillStyle = 'rgba(200,220,255,0.55)';
        if (!_fontKuruldu) { ctx.font = '7px system-ui, "Segoe UI", Arial, sans-serif'; _fontKuruldu = true; }
        const lbl = m >= 1000 ? (m / 1000).toFixed(m % 1000 === 0 ? 0 : 1) + 'k' : String(m);
        ctx.fillText(lbl, tx, iy + ih - 3);
      }
    }

    // collectibles ahead — coins gold, fuel orange, diamonds cyan (capped)
    // PERF(31 Tmz): mini haritada ardisik toplanabilirlerin cogu AYNI renkte
    //   (sikke). Olcumde kare basina 21,3 gereksiz fillStyle atamasi cikti.
    //   Renk yalniz DEGISTIGINDE atanir; cizilen nokta sayisi/yeri ayni.
    if (terr && terr.objects && terr.objects.length) {
      const objs = terr.objects;
      let drawn = 0;
      let _sonRenk = null;
      for (let i = 0; i < objs.length && drawn < 80; i++) {
        const o = objs[i];
        if (!o || o.collected || typeof o.x !== 'number') continue;
        if (o.x < wStart || o.x > wStart + wSpan) continue;
        const ox = toX(o.x);
        drawn++;
        if (o.type === 'fuel') {
          if (_sonRenk !== '#ff8a3d') { ctx.fillStyle = '#ff8a3d'; _sonRenk = '#ff8a3d'; }
          ctx.fillRect(ox - 1.4, iy + ih * 0.30, 2.8, ih * 0.40);
        } else {
          const _r = (o.type === 'diamond') ? '#5fd6ff' : '#ffd24a';
          if (_sonRenk !== _r) { ctx.fillStyle = _r; _sonRenk = _r; }
          ctx.beginPath(); ctx.arc(ox, iy + ih * 0.42, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // rival bot marker (only if a bot is racing)
    if (typeof Bot !== 'undefined' && Bot.active && Bot.vehicle && typeof Bot.vehicle.x === 'number') {
      const bx = toX(Bot.vehicle.x);
      if (bx >= ix && bx <= ix + iw) {
        ctx.fillStyle = '#ff4444';
        if (!perfLow) { ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 5; }
        ctx.beginPath(); ctx.arc(bx, iy + ih * 0.5, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // "you are here" car marker: pulsing gold dot + heading arrow
    const cx = toX(carWX);
    const pulse = 3.2 + (perfLow ? 0 : 0.9 * Math.sin(now * 0.006));
    if (!perfLow) { ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 7; }
    const md = GradyanDeposu.rad(ctx, cx, iy + ih * 0.5, 0, cx, iy + ih * 0.5, pulse, [0, '#fff6b0', 0.6, '#ffd700', 1, '#e6941a']);
    ctx.fillStyle = md;
    ctx.beginPath(); ctx.arc(cx, iy + ih * 0.5, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff5a1a';
    ctx.beginPath();
    ctx.moveTo(cx + pulse + 1, iy + ih * 0.5);
    ctx.lineTo(cx + pulse + 5, iy + ih * 0.5 - 2.6);
    ctx.lineTo(cx + pulse + 5, iy + ih * 0.5 + 2.6);
    ctx.closePath(); ctx.fill();

    ctx.restore(); // end clip

    // frame + tiny caption
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih * 0.42, [5, 5, 0, 0]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(180,200,235,0.75)'; ctx.font = 'bold 7px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('ROUTE', x + 5, y + 3);
    ctx.restore();
  },

  // Compact RPM / gear indicator with an integrated damage sliver. Prefers real
  // vehicle.rpm / vehicle.gear / vehicle.damageLevel when present, otherwise it
  // synthesises a plausible reading from throttle + speed so the dial always
  // animates. Everything guarded — no external wiring required.
  _drawEngineGauge(ctx, x, y, w, h, vehicle, now, smooth, perfLow) {
    const maxRpm   = (typeof vehicle.maxRpm === 'number' && vehicle.maxRpm > 0) ? vehicle.maxRpm : 8000;
    const throttle = Math.max(0, Math.min(1, vehicle.throttle || 0));
    const speedAbs = Math.abs(vehicle.vx || 0);
    // 🔴 BUGFIX(30 Tmz): bölen 8000 SABİTİ yanlıştı. `vx` px/sn'dir ve araç üst
    //   hızı `maxSpeed` ≈ 500 px/sn (≈180 km/h) — 8000 px/sn ≈ 2.880 km/h, yani
    //   ASLA ulaşılmıyor. Ölçüldü: speedNorm ≤ 0,0625 → `gear = 1+floor(n*5)`
    //   HER ZAMAN 1, `withinGear` sabit 0,3125 → RPM 8000'lik kadranda yalnız
    //   2.559-3.685 arasında geziniyordu. Yani vites göstergesi ve RPM sweep'i
    //   fiilen ÖLÜYDÜ. Artık aracın kendi üst hızına göre normalize ediliyor
    //   (0,75 = ölçülen ulaşılabilir oran; TUNING 28 Tmz top hız çarpanı 0,72).
    const speedTop  = Math.max(1, (vehicle.maxSpeed || 500) * 0.75);
    const speedNorm = Math.min(1, speedAbs / speedTop);

    let rpm = (typeof vehicle.rpm === 'number' && isFinite(vehicle.rpm)) ? vehicle.rpm : null;
    if (rpm === null) {
      const withinGear = (speedNorm * 5) % 1;                      // saw-tooth per pseudo-gear
      rpm = 900 + (maxRpm - 900) * (0.30 + 0.70 * withinGear) * (0.45 + 0.55 * throttle);
    }
    let gear = (typeof vehicle.gear === 'number') ? vehicle.gear : null;
    if (gear === null) gear = 1 + Math.floor(speedNorm * 5);
    gear = Math.max(1, Math.min(6, Math.round(gear)));
    const dmg = Math.max(0, Math.min(1, vehicle.damageLevel || 0));

    // smoothed RPM sweep
    if (this._rpmLerp === null) this._rpmLerp = rpm;
    this._rpmLerp = this._lerp(this._rpmLerp, rpm, Math.min(1, (smooth || 0.1) * 1.8));
    const rpmPct  = Math.max(0, Math.min(1, this._rpmLerp / maxRpm));
    const redline = rpmPct > 0.82;

    // gear-change pop
    if (this._gearShown === null) this._gearShown = gear;
    if (gear !== this._gearShown) { this._gearFlash = 1; this._gearShown = gear; }
    if (this._gearFlash > 0) this._gearFlash = Math.max(0, this._gearFlash - 0.05);
    const gearFlash = this._gearFlash;

    ctx.save();
    // panel
    if (!perfLow) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    const bg = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(24,28,44,0.82)', 1, 'rgba(6,8,16,0.82)']);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h * 0.4, [8, 8, 0, 0]); ctx.fill();

    // gear box (right)
    const gbW = 26, gbX = x + w - gbW - 5, gbY = y + 5, gbH = h - 10;
    const gg = GradyanDeposu.lin(ctx, gbX, gbY, gbX, gbY + gbH, [0, redline ? '#5a1a12' : '#1d2740', 1, redline ? '#2a0a06' : '#0c1424']);
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.roundRect(gbX, gbY, gbW, gbH, 5); ctx.fill();
    ctx.strokeStyle = gearFlash > 0.02 ? 'rgba(120,230,150,' + (0.4 + gearFlash * 0.5).toFixed(2) + ')'
                                       : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(gbX, gbY, gbW, gbH, 5); ctx.stroke();
    ctx.fillStyle = redline ? '#ff8a6a' : '#dfe8ff';
    ctx.font = 'bold 17px Impact, "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(gear), gbX + gbW / 2, gbY + gbH * 0.44);
    ctx.fillStyle = 'rgba(200,210,240,0.6)'; ctx.font = 'bold 5.5px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('GEAR', gbX + gbW / 2, gbY + gbH - 4);

    // RPM bar (left) with redline zone + segment ticks
    const barX = x + 7, barY = y + 8, barW = (gbX - 6) - (x + 7), barH = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
    const fillW = barW * rpmPct;
    if (fillW > 1) {
      const rg = GradyanDeposu.lin(ctx, barX, barY, barX + barW, barY, [0, '#4fd6ff', 0.7, '#a6ff5c', 0.82, '#ffd23c', 1, '#ff3d00']);
      ctx.save();
      ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.clip();
      ctx.fillStyle = rg; ctx.fillRect(barX, barY, fillW, barH);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(barX, barY, fillW, barH * 0.45);
      ctx.restore();
    }
    // redline marker
    const redX = barX + barW * 0.82;
    ctx.strokeStyle = 'rgba(255,60,0,0.85)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(redX, barY - 1); ctx.lineTo(redX, barY + barH + 1); ctx.stroke();
    // segment ticks
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    for (let s = 1; s < 8; s++) {
      const sx = barX + (barW / 8) * s;
      ctx.beginPath(); ctx.moveTo(sx, barY + 1.5); ctx.lineTo(sx, barY + barH - 1.5); ctx.stroke();
    }
    // rim (+ redline glow)
    if (redline && !perfLow) { ctx.shadowColor = '#ff3d00'; ctx.shadowBlur = 6 + 3 * Math.sin(now * 0.03); }
    ctx.strokeStyle = redline ? 'rgba(255,80,20,0.9)' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.stroke();
    ctx.shadowBlur = 0;
    // labels
    ctx.fillStyle = redline ? '#ff9a6a' : 'rgba(200,210,240,0.7)';
    ctx.font = 'bold 6px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('RPM', barX, barY + barH + 2);
    ctx.fillStyle = 'rgba(220,230,255,0.7)'; ctx.textAlign = 'right';
    ctx.fillText((this._rpmLerp / 1000).toFixed(1) + 'k', barX + barW, barY + barH + 2);

    // damage sliver along the bottom (only when actually damaged)
    if (dmg > 0.001) {
      const dY = y + h - 5, dX = barX, dW = barW;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.roundRect(dX, dY, dW, 3, 1.5); ctx.fill();
      const health = 1 - dmg;
      const dCol = health > 0.6 ? '#2ecc71' : health > 0.3 ? '#f1c40f' : '#ff3d00';
      ctx.fillStyle = dCol;
      ctx.beginPath(); ctx.roundRect(dX, dY, dW * health, 3, 1.5); ctx.fill();
      if (dmg > 0.35) {
        const crit = dmg > 0.75;
        if (crit && !perfLow) { ctx.shadowColor = '#ff3d00'; ctx.shadowBlur = 5 + 3 * Math.sin(now * 0.02); }
        ctx.fillStyle = crit ? '#ff5a3d' : '#ffc357';
        ctx.font = 'bold 7px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('🔧 ' + Math.round(dmg * 100) + '%', dX, dY - 1);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // EXTENDED HUD ELEMENTS
  // ═══════════════════════════════════════════════════════════════

  _drawMinimap(ctx, x, y, w, h, camX, maxDist) {
    const now = Date.now();
    ctx.save();

    // ── drop shadow behind the whole widget ────────────────────────────────
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    // premium glass housing (deep vertical gradient)
    const houseG = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(20,26,40,0.82)', 1, 'rgba(6,9,16,0.82)']);
    ctx.fillStyle = houseG;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // clip the "screen" so terrain/markers stay inside the rounded frame
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 5.5); ctx.clip();

    // sky gradient (top) → subtle atmosphere
    const sky = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(52,86,128,0.35)', 0.55, 'rgba(24,40,60,0.15)', 1, 'rgba(10,18,26,0)']);
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    // ── terrain silhouette with gradient fill ──────────────────────────────
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const worldX = (px / w) * maxDist;
      const seed = Math.sin(worldX * 0.001) * 0.5 + Math.sin(worldX * 0.0037) * 0.3;
      const hy = y + h * 0.7 + seed * h * 0.2;
      px === 0 ? ctx.moveTo(x + px, hy) : ctx.lineTo(x + px, hy);
    }
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    const ground = GradyanDeposu.lin(ctx, x, y + h * 0.5, x, y + h, [0, 'rgba(70,140,60,0.55)', 1, 'rgba(24,52,26,0.6)']);
    ctx.fillStyle = ground; ctx.fill();
    // crisp ridge line on top of the terrain
    ctx.strokeStyle = 'rgba(150,230,120,0.8)';
    ctx.lineWidth = 1.6; ctx.stroke();

    // progress overlay: brighten the portion already travelled
    const playerPct = Math.min(1, camX / Math.max(1, maxDist));
    ctx.fillStyle = 'rgba(120,200,255,0.10)';
    ctx.fillRect(x, y, w * playerPct, h);
    // start / finish ticks
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + 1, y + 2, 1.5, h - 4);
    ctx.fillStyle = 'rgba(255,120,60,0.5)';
    ctx.fillRect(x + w - 2.5, y + 2, 1.5, h - 4);

    // ── rival bot marker (additive, only if a bot is racing) ───────────────
    if (typeof Bot !== 'undefined' && Bot.active && Bot.vehicle) {
      const botPct = Math.min(1, Math.max(0, (Bot.vehicle.x - 200) / Math.max(1, maxDist * 2)));
      const botX = x + botPct * w;
      ctx.fillStyle = '#FF4444';
      ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(botX, y + h * 0.5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── player marker: pulsing glow + gold dot + heading arrow ──────────────
    const markerX = x + playerPct * w;
    const mpulse = 4 + 1.2 * Math.sin(now * 0.006);
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
    const md = GradyanDeposu.rad(ctx, markerX, y + h * 0.5, 0, markerX, y + h * 0.5, mpulse, [0, '#FFF6B0', 0.6, '#FFD700', 1, '#E6941A']);
    ctx.fillStyle = md;
    ctx.beginPath(); ctx.arc(markerX, y + h * 0.5, mpulse, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF4400';
    ctx.beginPath();
    ctx.moveTo(markerX + mpulse + 1, y + h * 0.5);
    ctx.lineTo(markerX + mpulse + 6, y + h * 0.5 - 3);
    ctx.lineTo(markerX + mpulse + 6, y + h * 0.5 + 3);
    ctx.closePath(); ctx.fill();

    ctx.restore(); // end clip

    // ── frame: crisp rim + top glass sheen ─────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, w - 3, (h - 3) * 0.42, [5.5, 5.5, 0, 0]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 7); ctx.stroke();
    ctx.restore();
  },

  _drawFlipCounter(ctx, x, y, count, t) {
    if (count <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    const scale = 1 + Math.sin(t * 10) * 0.08;
    ctx.scale(scale, scale);
    // Circle badge
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
    grad.addColorStop(0, '#FF4400');
    grad.addColorStop(1, '#AA2200');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,0,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.stroke();
    // Flip icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🌀', 0, -5);
    ctx.font = 'bold 11px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('x' + count, 0, 9);
    ctx.restore();
  },

  _drawAirtimeBar(ctx, x, y, w, airtime, maxAirtime, t) {
    if (airtime <= 0.1) return;
    ctx.save();
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(x, y, w, 14, 7); ctx.fill();
    // Fill
    const pct = Math.min(1, airtime / maxAirtime);
    const grad = GradyanDeposu.lin(ctx, x, y, x+w, y, [0, '#00AAFF', 0.6, '#00FFFF', 1, '#00FFAA']);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x, y, w * pct, 14, 7); ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.roundRect(x, y, w * pct, 7, [7,7,0,0]); ctx.fill();
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('✈ ' + airtime.toFixed(1) + 's', x + w/2, y + 7);
    ctx.restore();
  },

  _drawComboDisplay(ctx, x, y, combo, t) {
    if (combo < 2) return;
    ctx.save();
    ctx.translate(x, y);
    const pulse = 1 + Math.sin(t * 15) * 0.12;
    ctx.scale(pulse, pulse);
    // Combo badge
    const cg = ctx.createLinearGradient(0, -20, 0, 20);
    cg.addColorStop(0, '#FF8800');
    cg.addColorStop(1, '#FF2200');
    ctx.fillStyle = cg;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i/5)*Math.PI*2 - Math.PI/2;
      const r = i%2===0 ? 24 : 14;
      i===0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
            : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('x' + combo, 0, -4);
    ctx.font = '7px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('COMBO', 0, 7);
    ctx.restore();
  },

  _drawPartStatus(ctx, x, y, parts, nitroCharge, t) {
    parts = parts || [];
    let px = x;
    for (const p of parts) {
      ctx.save();
      ctx.translate(px, y);
      // Background circle
      const ready = p.id === 'nitro' ? nitroCharge >= 1 : true;
      const bg = GradyanDeposu.rad(ctx, 0, 0, 2, 0, 0, 16, [0, ready ? 'rgba(40,160,40,0.8)' : 'rgba(80,40,20,0.7)', 1, ready ? 'rgba(20,100,20,0.6)' : 'rgba(40,20,10,0.6)']);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = ready ? 'rgba(100,255,100,0.5)' : 'rgba(200,100,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI*2); ctx.stroke();
      // Icon
      const icons = { nitro:'🔥', wing:'🪂', spring:'🌀', landing_boost:'⚡' };
      ctx.font = '12px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(icons[p.id] || '❓', 0, 0);
      // Cooldown overlay (arc)
      if (p.id === 'nitro' && nitroCharge < 1) {
        ctx.strokeStyle = 'rgba(255,100,0,0.8)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 13, -Math.PI/2, -Math.PI/2 + nitroCharge * Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      px += 38;
    }
  },

  _drawTopBar(ctx, W, gold, diamonds, t) {
    // Top gradient bar
    ctx.save();
    const tg = GradyanDeposu.lin(ctx, 0, 0, 0, 36, [0, 'rgba(0,0,0,0.7)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, W, 36);
    // Currency display
    // Gold icon (spinning coin)
    const coinY = 18;
    const cg = GradyanDeposu.rad(ctx, W-130-2, coinY-2, 1, W-130, coinY, 10, [0, '#FFF176', 0.5, '#FFD700', 1, '#E65100']);
    ctx.fillStyle = cg;
    ctx.save();
    ctx.translate(W-130, coinY);
    const coinScale = Math.cos(t * 2);
    ctx.scale(Math.abs(coinScale) * 0.5 + 0.5, 1);
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#FF8F00'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(gold.toLocaleString(), W-116, coinY);
    // Diamond
    ctx.fillStyle = '#00CCFF';
    ctx.font = '12px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='left';
    ctx.fillText('◆ ' + diamonds, W-60, coinY);
    ctx.restore();
  },

  _drawDistanceRing(ctx, x, y, r, pct, rank, t) {
    ctx.save();
    ctx.translate(x, y);
    // soft dark hub so the ring reads over busy terrain
    const hub = GradyanDeposu.rad(ctx, 0, 0, r * 0.2, 0, 0, r + 4, [0, 'rgba(10,14,24,0.55)', 1, 'rgba(10,14,24,0)']);
    ctx.fillStyle = hub;
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.fill();
    // Background ring (recessed track)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
    // Progress arc
    const rankColors = {
      'YENİ BAŞLAYAN': '#78909c',
      'BRONZ':  '#CD7F32',
      'GÜMÜŞ':  '#C0C0C0',
      'ALTIN':  '#FFD700',
      'ELMAS':  '#00CCFF',
      'EFSANE': '#FF00FF',
    };
    const col = rankColors[rank] || '#FFD700';
    // gradient sweep along the arc for a richer look
    const arcG = GradyanDeposu.lin(ctx, -r, -r, r, r, [0, col, 1, 'rgba(255,255,255,0.85)']);
    ctx.strokeStyle = arcG;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    if (pct > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI/2, -Math.PI/2 + pct * Math.PI * 2);
      ctx.stroke();
    }
    // breathing highlight for every rank + stronger glow for the top tiers
    const isHigh = ['ELMAS','EFSANE'].includes(rank);
    ctx.shadowColor = col;
    ctx.shadowBlur = (isHigh ? 10 : 5) + Math.sin(t * 3) * (isHigh ? 5 : 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = isHigh ? 3 : 2;
    if (pct > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI/2, -Math.PI/2 + pct * Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // leading-edge spark at the tip of the progress arc
    if (pct > 0.01 && pct < 0.999) {
      const a = -Math.PI / 2 + pct * Math.PI * 2;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  _drawBotRaceIndicator(ctx, x, y, myDist, botDist, t) {
    const diff = myDist - botDist;
    const ahead = diff >= 0;
    ctx.save();
    ctx.translate(x, y);
    // drop shadow under the pill
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    // Background pill with vertical gradient (green ahead / red behind)
    const pg = ctx.createLinearGradient(0, -14, 0, 14);
    if (ahead) { pg.addColorStop(0, 'rgba(30,190,70,0.82)'); pg.addColorStop(1, 'rgba(0,110,30,0.82)'); }
    else       { pg.addColorStop(0, 'rgba(220,60,40,0.82)'); pg.addColorStop(1, 'rgba(150,0,0,0.82)'); }
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.roundRect(-44, -14, 88, 28, 14); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // top glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.roundRect(-44, -14, 88, 12, [14, 14, 0, 0]); ctx.fill();
    ctx.strokeStyle = ahead ? 'rgba(120,255,150,0.5)' : 'rgba(255,150,140,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-44, -14, 88, 28, 14); ctx.stroke();
    // Bot icon
    ctx.font = '14px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🤖', -26, 0);
    // Difference text with small shadow for legibility
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='left';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 2;
    const sign = ahead ? '+' : '';
    ctx.fillText(sign + Math.round(diff) + 'm', -10, 0);
    ctx.shadowBlur = 0;
    // Pulsing dot when close (photo-finish tension)
    if (Math.abs(diff) < 50) {
      const gl = 0.6 + Math.sin(t * 8) * 0.4;
      ctx.fillStyle = `rgba(255,255,0,${gl})`;
      ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 6 * gl;
      ctx.beginPath(); ctx.arc(36, -8, 4, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  _drawLapTimer(ctx, x, y, seconds) {
    ctx.save();
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    const timeStr = `${mins}:${String(secs).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x-4, y-16, 80, 22, 6); ctx.fill();
    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px ui-monospace, Consolas, monospace'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('⏱ ' + timeStr, x, y - 4);
    ctx.restore();
  },

  _drawWindIndicator(ctx, x, y, windSpeed, windDir) {
    if (Math.abs(windSpeed) < 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.stroke();
    // Arrow
    const arrowLen = 12 * Math.min(1, Math.abs(windSpeed)/5);
    const arrowDir = windDir > 0 ? 0 : Math.PI;
    ctx.strokeStyle = Math.abs(windSpeed) > 3 ? '#FF4400' : '#88CCFF';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-Math.cos(arrowDir)*arrowLen, -Math.sin(arrowDir)*arrowLen);
    ctx.lineTo(Math.cos(arrowDir)*arrowLen, Math.sin(arrowDir)*arrowLen);
    ctx.stroke();
    // Arrowhead
    const ax = Math.cos(arrowDir)*arrowLen, ay = Math.sin(arrowDir)*arrowLen;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(arrowDir+Math.PI*0.75)*6, ay + Math.sin(arrowDir+Math.PI*0.75)*6);
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + Math.cos(arrowDir-Math.PI*0.75)*6, ay + Math.sin(arrowDir-Math.PI*0.75)*6);
    ctx.stroke();
    // Wind text
    ctx.fillStyle = '#fff';
    ctx.font = '7px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(Math.abs(windSpeed).toFixed(1), 0, 16);
    ctx.restore();
  },

  // ─── GÖSTERGE PANELİ ──────────────────────────────────────────────────────

  drawSpeedometer(ctx, x, y, speed, maxSpeed, style) {
    style = style || {};
    var r = style.radius || 60;
    var startAngle = Math.PI * 0.75;
    var endAngle   = Math.PI * 2.25;
    var pct = Math.min(1, Math.max(0, speed / maxSpeed));
    var needleAngle = startAngle + pct * (endAngle - startAngle);
    ctx.save();
    ctx.translate(x, y);
    var grad = GradyanDeposu.rad(ctx, 0, 0, r * 0.7, 0, 0, r, [0, 'rgba(20,20,30,0.95)', 1, 'rgba(10,10,20,0.98)']);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r - 10, startAngle, endAngle); ctx.stroke();
    var arcGrad = GradyanDeposu.lin(ctx, -r, 0, r, 0, [0, '#00FF88', 0.6, '#FFCC00', 1, '#FF3300']);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(0, 0, r - 10, startAngle, needleAngle); ctx.stroke();
    for (var i = 0; i <= 10; i++) {
      var a = startAngle + (i / 10) * (endAngle - startAngle);
      var isMajor = i % 2 === 0;
      var inner = isMajor ? r - 20 : r - 16;
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold ' + Math.round(r * 0.14) + 'px system-ui, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.round((i / 10) * maxSpeed), Math.cos(a) * (inner - 8), Math.sin(a) * (inner - 8));
      }
    }
    ctx.save();
    ctx.rotate(needleAngle);
    var nGrad = GradyanDeposu.lin(ctx, 0, 0, r - 14, 0, [0, '#FF4400', 1, '#FFAA00']);
    ctx.strokeStyle = nGrad;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(r - 14, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FF4400'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(-22, r * 0.35, 44, 18, 4); ctx.fill();
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold ' + Math.round(r * 0.22) + 'px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(speed), 0, r * 0.44);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = Math.round(r * 0.12) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('km/h', 0, r * 0.56);
    ctx.restore();
  },

  drawTachometer(ctx, x, y, rpm, maxRpm, engineTemp) {
    var r = 55;
    var startAngle = Math.PI * 0.75;
    var endAngle   = Math.PI * 2.25;
    var pct = Math.min(1, Math.max(0, rpm / maxRpm));
    var needleAngle = startAngle + pct * (endAngle - startAngle);
    var tempPct = Math.min(1, Math.max(0, (engineTemp || 0) / 120));
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(15,15,25,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tempPct > 0.8 ? 'rgba(255,60,0,0.6)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    var redStart = startAngle + 0.8 * (endAngle - startAngle);
    ctx.strokeStyle = 'rgba(255,40,0,0.5)';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(0, 0, r - 8, redStart, endAngle); ctx.stroke();
    ctx.strokeStyle = pct > 0.8 ? '#FF3300' : '#4488FF';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r - 8, startAngle, needleAngle); ctx.stroke();
    ctx.save();
    ctx.rotate(needleAngle);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(r - 12, 0); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4488FF'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4488FF';
    ctx.font = 'bold 11px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(rpm / 100) / 10 + 'k', 0, r * 0.42);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-18, r * 0.55, 36, 7);
    var tempColor = tempPct > 0.8 ? '#FF4400' : tempPct > 0.6 ? '#FFAA00' : '#44FF88';
    ctx.fillStyle = tempColor;
    ctx.fillRect(-18, r * 0.55, 36 * tempPct, 7);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.strokeRect(-18, r * 0.55, 36, 7);
    ctx.restore();
  },

  drawFuelGauge(ctx, x, y, fuel, maxFuel) {
    var pct = Math.min(1, Math.max(0, fuel / maxFuel));
    var W = 80, H = 18;
    ctx.save();
    ctx.translate(x - W / 2, y - H / 2);
    ctx.fillStyle = 'rgba(10,10,20,0.9)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 5); ctx.fill();
    var fuelColor = pct < 0.2 ? '#FF3300' : pct < 0.4 ? '#FFAA00' : '#00CC44';
    ctx.fillStyle = fuelColor;
    ctx.beginPath(); ctx.roundRect(2, 2, (W - 4) * pct, H - 4, 3); ctx.fill();
    if (pct < 0.15) {
      var alpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
      ctx.fillStyle = 'rgba(255,50,0,' + alpha + ')';
      ctx.beginPath(); ctx.roundRect(2, 2, (W - 4) * pct, H - 4, 3); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 5); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('⛽', 3, H / 2);
    ctx.fillStyle = pct < 0.2 ? '#FF9999' : '#fff';
    ctx.font = 'bold 9px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(pct * 100) + '%', W - 4, H / 2);
    ctx.restore();
  },

  drawTempGauge(ctx, x, y, temp, maxTemp) {
    var pct = Math.min(1, Math.max(0, temp / maxTemp));
    var H = 70, W = 14;
    ctx.save();
    ctx.translate(x - W / 2, y - H / 2);
    ctx.fillStyle = 'rgba(10,10,20,0.9)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.fill();
    var tempColor = pct > 0.85 ? '#FF3300' : pct > 0.65 ? '#FF8800' : '#4488FF';
    var fillH = (H - 4) * pct;
    ctx.fillStyle = tempColor;
    ctx.beginPath(); ctx.roundRect(2, H - 2 - fillH, W - 4, fillH, 2); ctx.fill();
    if (pct > 0.85) {
      var blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      ctx.fillStyle = 'rgba(255,0,0,' + blinkAlpha + ')';
      ctx.beginPath(); ctx.roundRect(2, H - 2 - fillH, W - 4, fillH, 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('°C', W / 2, 2);
    ctx.fillStyle = tempColor;
    ctx.font = 'bold 7px ui-monospace, Consolas, monospace';
    ctx.textBaseline = 'bottom';
    ctx.fillText(Math.round(temp), W / 2, H - 2);
    ctx.restore();
  },

  drawNitroBar(ctx, x, y, W, charge, active, t) {
    var pct = Math.min(1, Math.max(0, charge));
    var H = 14;
    ctx.save();
    ctx.translate(x, y);
    if (active) { ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 18 + 6 * Math.sin(t * 0.015); }
    ctx.fillStyle = 'rgba(0,10,20,0.9)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.fill();
    var segs = 5;
    var segW = (W - 2 - (segs - 1) * 2) / segs;
    for (var i = 0; i < segs; i++) {
      var segPct = Math.max(0, Math.min(1, pct * segs - i));
      if (segPct <= 0) break;
      var sx = 1 + i * (segW + 2);
      var barGrad = GradyanDeposu.lin(ctx, sx, 0, sx + segW * segPct, 0, [0, active ? '#00FFFF' : '#0088CC', 1, active ? '#88FFFF' : '#00CCFF']);
      ctx.fillStyle = barGrad;
      ctx.beginPath(); ctx.roundRect(sx, 1, segW * segPct, H - 2, 2); ctx.fill();
    }
    if (active) {
      var pulseAlpha = 0.3 + 0.3 * Math.sin(t * 0.02);
      ctx.fillStyle = 'rgba(0,255,255,' + pulseAlpha + ')';
      ctx.beginPath(); ctx.roundRect(0, 0, W * pct, H, 4); ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? 'rgba(0,255,255,0.5)' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.stroke();
    ctx.fillStyle = active ? '#00FFFF' : 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NITRO', W / 2, H / 2);
    ctx.restore();
  },

  drawHealthBar(ctx, x, y, W, health, maxHealth) {
    var pct = Math.min(1, Math.max(0, health / maxHealth));
    var H = 12;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(10,10,20,0.88)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 3); ctx.fill();
    var hpColor = pct > 0.6 ? '#44FF88' : pct > 0.3 ? '#FFCC00' : '#FF3333';
    var hpGrad = GradyanDeposu.lin(ctx, 0, 0, W * pct, 0, [0, hpColor, 1, hpColor + 'AA']);
    ctx.fillStyle = hpGrad;
    ctx.beginPath(); ctx.roundRect(1, 1, (W - 2) * pct, H - 2, 2); ctx.fill();
    if (pct < 0.25) {
      var hpAlpha = 0.4 + 0.4 * Math.sin(Date.now() * 0.01);
      ctx.fillStyle = 'rgba(255,50,50,' + hpAlpha + ')';
      ctx.beginPath(); ctx.roundRect(1, 1, (W - 2) * pct, H - 2, 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 3); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(health) + '/' + maxHealth, W / 2, H / 2);
    ctx.restore();
  },

  drawShieldBar(ctx, x, y, W, shield) {
    var pct = Math.min(1, Math.max(0, shield));
    var H = 10;
    ctx.save(); ctx.translate(x, y);
    if (pct > 0) { ctx.shadowColor = '#8888FF'; ctx.shadowBlur = 8; }
    ctx.fillStyle = 'rgba(10,10,30,0.88)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 3); ctx.fill();
    var sGrad = GradyanDeposu.lin(ctx, 0, 0, W, 0, [0, '#4466FF', 1, '#88AAFF']);
    ctx.fillStyle = sGrad;
    ctx.beginPath(); ctx.roundRect(1, 1, (W - 2) * pct, H - 2, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(136,136,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'bold 7px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🛡 ' + Math.round(pct * 100) + '%', W / 2, H / 2);
    ctx.restore();
  },

  drawComboMeter(ctx, x, y, combo, maxCombo, t) {
    if (combo <= 0) return;
    var scale = combo >= 10 ? 1.3 : combo >= 5 ? 1.15 : 1;
    var pulse = 1 + 0.05 * Math.sin(t * 0.025);
    ctx.save(); ctx.translate(x, y); ctx.scale(scale * pulse, scale * pulse);
    var r = 28;
    var comboGrad = GradyanDeposu.rad(ctx, 0, 0, 5, 0, 0, r, [0, 'rgba(255,200,0,0.9)', 1, 'rgba(255,80,0,0.7)']);
    ctx.fillStyle = comboGrad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFDD00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(combo, 0, -3);
    ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif'; ctx.fillStyle = '#FFE080';
    ctx.fillText('COMBO', 0, 10);
    var cpct = Math.min(1, combo / maxCombo);
    ctx.strokeStyle = 'rgba(255,255,100,0.6)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + cpct * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  // ─── YARIŞ HUD ────────────────────────────────────────────────────────────

  drawRacePosition(ctx, x, y, position, total) {
    var ordinals = ['', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
    var colors   = ['', '#FFD700', '#C0C0C0', '#CD7F32', '#88AAFF', '#FF88AA', '#88FFAA', '#FFAA88', '#AAFFFF'];
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(-30, -22, 60, 44, 8); ctx.fill();
    ctx.fillStyle = colors[position] || '#fff';
    ctx.font = 'bold 24px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ordinals[position] || position + '.', 0, -4);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('of ' + total, 0, 14);
    ctx.restore();
  },

  drawRaceTimer(ctx, x, y, elapsed, bestTime, splits) {
    function fmt(s) {
      var m = Math.floor(s / 60);
      var sec = Math.floor(s % 60);
      var ms = Math.floor((s % 1) * 1000);
      return m + ':' + String(sec).padStart(2,'0') + '.' + String(ms).padStart(3,'0');
    }
    var W = 120, H = 42;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 6); ctx.stroke();
    var isFastest = bestTime && elapsed < bestTime;
    ctx.fillStyle = isFastest ? '#FF88FF' : '#FFFFFF';
    ctx.font = 'bold 18px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(fmt(elapsed), W / 2, 4);
    if (bestTime) {
      ctx.fillStyle = '#FFD700'; ctx.font = '10px ui-monospace, Consolas, monospace';
      ctx.fillText('BEST: ' + fmt(bestTime), W / 2, 26);
    }
    if (bestTime && elapsed > 0.5) {
      var delta = elapsed - bestTime;
      ctx.fillStyle = delta < 0 ? '#44FF88' : '#FF4444';
      ctx.font = 'bold 10px ui-monospace, Consolas, monospace'; ctx.textAlign = 'right';
      ctx.fillText((delta < 0 ? '' : '+') + delta.toFixed(2), W - 4, 26);
    }
    ctx.restore();
  },

  drawLapCounter(ctx, x, y, current, total) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    var lg = GradyanDeposu.lin(ctx, 0, -14, 0, 14, [0, 'rgba(24,26,34,0.84)', 1, 'rgba(6,8,14,0.84)']);
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.roundRect(-28, -14, 56, 28, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(-28, -14, 56, 12, [7,7,0,0]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.4)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-28, -14, 56, 28, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(200,210,240,0.8)'; ctx.font = 'bold 9px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LAP', 0, -5);
    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Impact, "Arial Black", system-ui, sans-serif';
    ctx.fillText(current + '/' + total, 0, 8);
    ctx.restore();
  },

  drawGapIndicator(ctx, x, y, gap) {
    var ahead = gap < 0;
    var absGap = Math.abs(gap).toFixed(2);
    var color = ahead ? '#44FF88' : '#FF4444';
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath(); ctx.roundRect(-40, -12, 80, 24, 5); ctx.fill();
    ctx.fillStyle = color; ctx.font = 'bold 13px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((ahead ? '-' : '+') + absGap + 's', 0, 0);
    ctx.restore();
  },

  drawBotRaceBar(ctx, x, y, W, playerPct, botPct) {
    var H = 16;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.fill();
    ctx.fillStyle = '#FF4444';
    ctx.beginPath(); ctx.roundRect(1, 1, (W-2)*Math.min(1,botPct), H-2, 3); ctx.fill();
    ctx.fillStyle = '#44AAFF';
    ctx.fillRect(1, 1, (W-2)*Math.min(1,playerPct), (H-2)/2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 4); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('YOU', 3, H/2);
    ctx.textAlign = 'right'; ctx.fillStyle = '#FF8888';
    ctx.fillText('BOT', W-3, H/2);
    ctx.restore();
  },

  drawDraftIndicator(ctx, x, y, draftFactor) {
    if (draftFactor <= 0.05) return;
    var alpha = Math.min(1, draftFactor * 2);
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,180,255,0.15)';
    ctx.beginPath(); ctx.roundRect(-30, -15, 60, 30, 8); ctx.fill();
    for (var i = -1; i <= 1; i++) {
      var tt = Date.now() * 0.003 + i * 0.5;
      var lineX = 20 * Math.sin(tt);
      ctx.strokeStyle = '#00CCFF'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * (0.4 + 0.4 * Math.sin(tt));
      ctx.beginPath();
      ctx.moveTo(-25 + lineX, i * 8); ctx.lineTo(-5 + lineX, i * 8);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00CCFF'; ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DRAFT +' + Math.round(draftFactor * 100) + '%', 0, 0);
    ctx.restore();
  },

  // ─── ARAZİ VE ÇEVRE ───────────────────────────────────────────────────────

  drawWindIndicator(ctx, x, y, speed, dir) {
    var r = 22;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,10,30,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
    var cls = [['N',0],['E',Math.PI/2],['S',Math.PI],['W',-Math.PI/2]];
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '6px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < cls.length; i++) {
      ctx.fillText(cls[i][0], Math.sin(cls[i][1])*(r-5), -Math.cos(cls[i][1])*(r-5));
    }
    ctx.save(); ctx.rotate(dir);
    var strength = Math.min(1, speed / 10);
    ctx.strokeStyle = speed > 7 ? '#FF4400' : speed > 4 ? '#FFAA00' : '#88CCFF';
    ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    var len = 8 + 6 * strength;
    ctx.beginPath(); ctx.moveTo(0, len); ctx.lineTo(0, -len); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -len); ctx.lineTo(-4, -len+6);
    ctx.moveTo(0, -len); ctx.lineTo(4, -len+6);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 7px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(speed.toFixed(1), 0, r + 8);
    ctx.restore();
  },

  drawAltitudeIndicator(ctx, x, y, altitude) {
    var W = 50, H = 80;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,10,20,0.88)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 6); ctx.stroke();
    var maxAlt = 5000;
    var pct = Math.min(1, Math.max(0, altitude / maxAlt));
    for (var i = 0; i <= 5; i++) {
      var tickY = 10 + (H - 20) * (1 - i / 5);
      ctx.strokeStyle = 'rgba(255,255,255,' + (i%5===0?'0.5':'0.2') + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(8, tickY); ctx.lineTo(W-8, tickY); ctx.stroke();
    }
    var needleY = 10 + (H - 20) * (1 - pct);
    ctx.strokeStyle = '#88FFCC'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, needleY); ctx.lineTo(W-4, needleY); ctx.stroke();
    ctx.fillStyle = 'rgba(136,255,204,0.1)';
    ctx.fillRect(4, needleY, W-8, H-10-needleY);
    ctx.fillStyle = '#88FFCC'; ctx.font = 'bold 9px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(Math.round(altitude) + 'm', W/2, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '7px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'bottom'; ctx.fillText('ALT', W/2, H-2);
    ctx.restore();
  },

  drawSurfaceType(ctx, x, y, surface) {
    var icons = {
      asphalt:{icon:'🛣',color:'#888888',label:'ASPHALT'},
      dirt:   {icon:'🪨',color:'#AA7744',label:'DIRT'},
      sand:   {icon:'🏖',color:'#DDAA44',label:'SAND'},
      ice:    {icon:'🧧',color:'#88CCFF',label:'ICE'},
      mud:    {icon:'💧',color:'#664422',label:'MUD'},
      grass:  {icon:'🌿',color:'#44AA44',label:'GRASS'},
      snow:   {icon:'*',           color:'#EEEEFF',label:'SNOW'},
      rock:   {icon:'⛰',      color:'#666677',label:'ROCK'}
    };
    var s = icons[surface] || {icon:'?',color:'#aaa',label:surface};
    ctx.save(); ctx.translate(x, y);
    // gradient card + drop shadow + tinted rim keyed to the surface color
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    var sg = GradyanDeposu.lin(ctx, 0, -14, 0, 14, [0, 'rgba(24,26,34,0.82)', 1, 'rgba(6,8,14,0.82)']);
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.roundRect(-30,-14,60,28,7); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(-30,-14,60,12,[7,7,0,0]); ctx.fill();
    ctx.strokeStyle = s.color + '99'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-30,-14,60,28,7); ctx.stroke();
    ctx.fillStyle = s.color; ctx.font = '14px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.icon, -12, 0);
    ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif'; ctx.fillText(s.label, 12, 0);
    ctx.restore();
  },

  drawWeatherIcon(ctx, x, y, weather) {
    var icons = {
      sunny:  {sym:'☀',color:'#FFD700'},
      cloudy: {sym:'⛅',color:'#AAAAAA'},
      rainy:  {sym:'🌧',color:'#4488CC'},
      stormy: {sym:'⛈',color:'#6644AA'},
      foggy:  {sym:'🌫',color:'#AABBCC'},
      windy:  {sym:'💨',color:'#88CCFF'},
      snowy:  {sym:'*',           color:'#CCDDFF'},
      hail:   {sym:'🌨',color:'#88AACC'}
    };
    var w = icons[weather] || {sym:'?',color:'#fff'};
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.arc(0,0,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = w.color; ctx.font = '16px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(w.sym, 0, 0);
    ctx.restore();
  },

  drawDayNightClock(ctx, x, y, timeOfDay, r) {
    r = r || 24;
    var dayAngle = timeOfDay * Math.PI * 2;
    var isDay = timeOfDay > 0.25 && timeOfDay < 0.75;
    ctx.save(); ctx.translate(x, y);
    var skyGrad = GradyanDeposu.rad(ctx, 0, 0, r*0.3, 0, 0, r, [0, isDay ? 'rgba(100,180,255,0.9)' : 'rgba(10,10,60,0.9)', 1, isDay ? 'rgba(50,120,220,0.9)' : 'rgba(0,0,30,0.9)']);
    ctx.fillStyle = skyGrad;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    var sunX = Math.sin(dayAngle) * (r * 0.6);
    var sunY = -Math.cos(dayAngle) * (r * 0.6);
    ctx.fillStyle = isDay ? '#FFE000' : '#DDEEFF';
    ctx.beginPath(); ctx.arc(sunX, sunY, r * (isDay ? 0.22 : 0.18), 0, Math.PI*2); ctx.fill();
    if (isDay) { ctx.shadowColor='#FFE000'; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(sunX,sunY,r*0.22,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  },

  // ─── ANİMASYONLU SAYILAR ──────────────────────────────────────────────────

  drawAnimatedNumber(ctx, x, y, value, prevValue, t, style) {
    style = style || {};
    var fontSize = style.fontSize || 24;
    var color = style.color || '#FFFFFF';
    var animDur = style.animDur || 30;
    var pct = Math.min(1, t / animDur);
    var eased = 1 - Math.pow(1 - pct, 3);
    var displayVal = prevValue + (value - prevValue) * eased;
    var isInt = style.isInt !== false;
    var text = isInt ? Math.round(displayVal).toLocaleString() : displayVal.toFixed(style.decimals || 1);
    ctx.save(); ctx.translate(x, y);
    var scaleEffect = 1 + (1 - pct) * 0.3;
    ctx.scale(scaleEffect, scaleEffect);
    if (style.shadow) { ctx.shadowColor = style.shadowColor || color; ctx.shadowBlur = 12 * (1 - pct); }
    ctx.fillStyle = color;
    ctx.font = 'bold ' + fontSize + 'px ' + (style.font || 'system-ui, "Segoe UI", Arial, sans-serif');
    ctx.textAlign = style.align || 'center';
    ctx.textBaseline = style.baseline || 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  drawFloatingText(ctx, text, x, y, t, color, size) {
    if (t >= 90) return;
    var alpha = t < 20 ? t/20 : Math.max(0, 1-(t-40)/50);
    var floatY = y - t * 0.8;
    var sc = t < 10 ? t/10 : 1;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(x, floatY); ctx.scale(sc, sc);
    ctx.fillStyle = color || '#FFD700';
    ctx.font = 'bold ' + (size||18) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = color||'#FFD700'; ctx.shadowBlur = 10;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  drawPointsPopup(ctx, x, y, points, color, t) {
    if (t >= 80) return;
    var alpha = t<15 ? t/15 : Math.max(0,1-(t-30)/50);
    var floatY = y - t * 1.2;
    var sc = t<8 ? t/8 : 1 + (t<20?(20-t)/20*0.2:0);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(x, floatY); ctx.scale(sc, sc);
    color = color||'#FFD700';
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(-30,-14,60,28,8); ctx.fill();
    ctx.fillStyle=color; ctx.font='bold 20px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor=color; ctx.shadowBlur=12;
    ctx.fillText((points>0?'+':'')+points,0,0);
    ctx.restore();
  },

  drawRankChange(ctx, x, y, oldRank, newRank, t) {
    if (oldRank===newRank||t>=100) return;
    var improved = newRank<oldRank;
    var alpha = t<20?t/20:Math.max(0,1-(t-60)/40);
    var floatY = y - (improved?1:-1)*t*0.5;
    var color = improved?'#44FF88':'#FF4444';
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x,floatY);
    ctx.fillStyle='rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(-40,-18,80,36,8); ctx.fill();
    ctx.fillStyle=color; ctx.font='bold 22px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(improved?'▲':'▼',-18,0);
    ctx.fillStyle='#fff'; ctx.font='bold 14px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('P'+newRank,10,0);
    ctx.restore();
  },

  // ─── MİNİMAP GELİŞMELERİ ─────────────────────────────────────────────────

  drawMinimapAdvanced(ctx, x, y, size, terrain, vehicleX, vehicleY, bots, collectibles) {
    bots=bots||[]; collectibles=collectibles||[];
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,0.82)';
    ctx.beginPath(); ctx.roundRect(0,0,size,size,size*0.08); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(0,0,size,size,size*0.08); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(2,2,size-4,size-4,size*0.07); ctx.clip();
    if (terrain&&terrain.tiles) {
      var tileW=size/(terrain.cols||20), tileH=size/(terrain.rows||20);
      var tColors={asphalt:'#444',dirt:'#7a5',sand:'#cc8',water:'#24a',grass:'#3a4'};
      for (var ri=0;ri<terrain.tiles.length;ri++) {
        var row=terrain.tiles[ri]||[];
        for (var ci=0;ci<row.length;ci++) {
          ctx.fillStyle=tColors[row[ci]]||'#333';
          ctx.fillRect(ci*tileW,ri*tileH,tileW+1,tileH+1);
        }
      }
    } else { ctx.fillStyle='#1a2a1a'; ctx.fillRect(0,0,size,size); }
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=0.5;
    for (var g=0;g<=4;g++) {
      var gp=(size/4)*g;
      ctx.beginPath(); ctx.moveTo(gp,0); ctx.lineTo(gp,size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,gp); ctx.lineTo(size,gp); ctx.stroke();
    }
    var self=this;
    for (var ci2=0;ci2<collectibles.length;ci2++) {
      var c=collectibles[ci2];
      self.drawMinimapMarker(ctx,c.mapX*size,c.mapY*size,c.type,Date.now()*0.01);
    }
    for (var bi=0;bi<bots.length;bi++) {
      var b=bots[bi];
      self.drawMinimapVehicle(ctx,b.mapX*size,b.mapY*size,b.angle||0,'#FF4444');
    }
    this.drawMinimapVehicle(ctx,vehicleX*size,vehicleY*size,0,'#44AAFF');
    ctx.restore(); ctx.restore();
  },

  drawMinimapVehicle(ctx, mapX, mapY, angle, color) {
    ctx.save(); ctx.translate(mapX,mapY); ctx.rotate(angle);
    ctx.fillStyle=color||'#fff'; ctx.shadowColor=color||'#fff'; ctx.shadowBlur=4;
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(-3,3); ctx.lineTo(3,3); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0; ctx.restore();
  },

  drawMinimapMarker(ctx, mapX, mapY, type, t) {
    var mc={coin:'#FFD700',gem:'#FF44FF',health:'#44FF44',nitro:'#00FFFF',checkpoint:'#FFFFFF',finish:'#FF8800',danger:'#FF0000'};
    var color=mc[type]||'#fff';
    var pulse=1+0.15*Math.sin(t||0);
    ctx.save(); ctx.translate(mapX,mapY); ctx.scale(pulse,pulse);
    ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.restore();
  },

  // ─── BAŞARIM BİLDİRİMLERİ ────────────────────────────────────────────────

  drawAchievementPopup(ctx, W, H, achievement, t) {
    var duration=180;
    if(t>=duration) return;
    var inT=Math.min(1,t/20);
    var outT=t>duration-40?1-(duration-t)/40:0;
    var alpha=Math.max(0,inT-outT);
    var slideY=(1-inT)*(-80);
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.translate(W/2,slideY+80);
    var boxW=320,boxH=70;
    ctx.shadowColor='#FFD700'; ctx.shadowBlur=30*inT;
    var grad=ctx.createLinearGradient(-boxW/2,0,boxW/2,0);
    grad.addColorStop(0,'rgba(40,30,0,0.97)');
    grad.addColorStop(0.5,'rgba(80,60,0,0.97)');
    grad.addColorStop(1,'rgba(40,30,0,0.97)');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.roundRect(-boxW/2,-boxH/2,boxW,boxH,12); ctx.fill();
    ctx.strokeStyle='#FFD700'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(-boxW/2,-boxH/2,boxW,boxH,12); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,215,0,0.15)';
    ctx.beginPath(); ctx.roundRect(-boxW/2+4,-boxH/2+4,boxH-8,boxH-8,8); ctx.fill();
    ctx.font='28px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(achievement.icon||'🏆',-boxW/2+boxH/2,0);
    ctx.fillStyle='#FFD700'; ctx.font='bold 11px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='left';
    ctx.fillText('ACHIEVEMENT UNLOCKED!',-boxW/2+boxH+4,-12);
    ctx.fillStyle='#FFFFFF'; ctx.font='bold 16px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(achievement.name||'Unknown',-boxW/2+boxH+4,6);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(achievement.desc||'',-boxW/2+boxH+4,22);
    if(achievement.points){ctx.fillStyle='#FFD700';ctx.font='bold 12px system-ui, "Segoe UI", Arial, sans-serif';ctx.textAlign='right';ctx.fillText('+'+achievement.points+' pts',boxW/2-8,0);}
    ctx.restore();
  },

  drawMilestonePopup(ctx, W, H, milestone, distance, t) {
    var duration=150;
    if(t>=duration) return;
    var inPct=Math.min(1,t/25);
    var outPct=t>duration-30?1-(duration-t)/30:0;
    var alpha=Math.max(0,inPct-outPct);
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.translate(W/2,H/2); ctx.scale(0.5+0.5*inPct,0.5+0.5*inPct);
    var bW=280,bH=60;
    ctx.fillStyle='rgba(0,20,40,0.95)';
    ctx.beginPath(); ctx.roundRect(-bW/2,-bH/2,bW,bH,10); ctx.fill();
    ctx.strokeStyle='#00CCFF'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(-bW/2,-bH/2,bW,bH,10); ctx.stroke();
    ctx.fillStyle='#00CCFF'; ctx.font='bold 11px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('MILESTONE!',0,-16);
    ctx.fillStyle='#FFFFFF'; ctx.font='bold 20px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(milestone||(Math.round(distance)+'m'),0,2);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('Keep going!',0,18);
    ctx.restore();
  },

  drawNewRecordBanner(ctx, W, H, type, value, t) {
    var duration=200;
    if(t>=duration) return;
    var inPct=Math.min(1,t/30);
    var outPct=t>duration-40?1-(duration-t)/40:0;
    var alpha=Math.max(0,inPct-outPct);
    var shakeX=t<20?(Math.random()-0.5)*6*(1-t/20):0;
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.translate(W/2+shakeX,H*0.35);
    var bW=340;
    var grad = GradyanDeposu.lin(ctx, -bW/2, 0, bW/2, 0, [0, 'rgba(150,0,200,0)', 0.15, 'rgba(150,0,200,0.95)', 0.85, 'rgba(200,0,150,0.95)', 1, 'rgba(200,0,150,0)']);
    ctx.fillStyle=grad; ctx.fillRect(-bW/2,-22,bW,44);
    ctx.fillStyle='#FFFF00'; ctx.font='bold 11px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    var tl={distance:'DISTANCE',time:'TIME',flips:'FLIPS',score:'SCORE'};
    ctx.fillText('NEW '+(tl[type]||String(type).toUpperCase())+' RECORD!',0,-8);
    ctx.fillStyle='#FFFFFF'; ctx.font='bold 18px ui-monospace, Consolas, monospace';
    ctx.fillText(typeof value==='number'?value.toLocaleString():value,0,10);
    ctx.restore();
  },

  // ─── PARÇA DURUMU ─────────────────────────────────────────────────────────

  drawPartsHUD(ctx, x, y, parts, cooldowns, t) {
    parts=parts||[]; cooldowns=cooldowns||{};
    var slotW=44,slotH=44,gap=6;
    ctx.save(); ctx.translate(x,y);
    for(var i=0;i<parts.length;i++){
      var part=parts[i];
      var sx=i*(slotW+gap);
      var cd=cooldowns[part.id]||0;
      var cdPct=Math.min(1,Math.max(0,cd));
      var isReady=cdPct<=0;
      ctx.fillStyle=isReady?'rgba(0,20,10,0.88)':'rgba(20,10,0,0.88)';
      ctx.beginPath(); ctx.roundRect(sx,0,slotW,slotH,6); ctx.fill();
      ctx.strokeStyle=isReady?'rgba(0,255,100,0.3)':'rgba(255,150,0,0.3)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.roundRect(sx,0,slotW,slotH,6); ctx.stroke();
      ctx.font='20px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.globalAlpha=isReady?1:0.4;
      ctx.fillText(part.icon||'⚙',sx+slotW/2,slotH/2-4);
      ctx.globalAlpha=1;
      if(cdPct>0){
        ctx.fillStyle='rgba(0,0,0,0.55)';
        ctx.fillRect(sx+1,1,slotW-2,slotH*cdPct);
        ctx.fillStyle='#FFAA00'; ctx.font='bold 10px ui-monospace, Consolas, monospace';
        ctx.textAlign='center'; ctx.textBaseline='bottom';
        ctx.fillText(Math.ceil(cdPct*100)+'%',sx+slotW/2,slotH-2);
      }
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='7px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText((part.name||'').substring(0,5).toUpperCase(),sx+slotW/2,slotH-1);
    }
    ctx.restore();
  },

  drawNitroCooldown(ctx, x, y, cooldown, t) {
    var pct=Math.min(1,Math.max(0,cooldown));
    var r=18;
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='rgba(0,10,30,0.88)';
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    if(pct>0){
      ctx.strokeStyle='rgba(255,200,0,0.2)'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(0,0,r-3,-Math.PI/2,-Math.PI/2+pct*Math.PI*2); ctx.stroke();
    } else {
      ctx.strokeStyle='#00FFFF'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(0,0,r-3,0,Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle=pct<=0?'#00FFFF':'#FFAA00';
    ctx.font=pct<=0?'14px system-ui, "Segoe UI", Arial, sans-serif':'bold 10px ui-monospace, Consolas, monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(pct<=0?'⚡':Math.ceil(pct*10)+'s',0,0);
    ctx.restore();
  },

  drawWingStatus(ctx, x, y, deployed, t) {
    ctx.save(); ctx.translate(x,y);
    ctx.globalAlpha=deployed?1:0.4;
    ctx.fillStyle=deployed?'rgba(0,100,200,0.85)':'rgba(20,20,30,0.85)';
    ctx.beginPath(); ctx.roundRect(-22,-14,44,28,6); ctx.fill();
    ctx.strokeStyle=deployed?'#44AAFF':'rgba(255,255,255,0.15)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(-22,-14,44,28,6); ctx.stroke();
    ctx.strokeStyle=deployed?'#88CCFF':'#666'; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-18,deployed?-4:0); ctx.lineTo(-4,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18,deployed?-4:0); ctx.lineTo(4,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4,0); ctx.lineTo(4,0); ctx.stroke();
    ctx.fillStyle=deployed?'#88CCFF':'#666'; ctx.font='7px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(deployed?'WING ON':'WING OFF',0,12);
    ctx.restore();
  },

  drawSpringStatus(ctx, x, y, charge, t) {
    var pct=Math.min(1,Math.max(0,charge));
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='rgba(0,20,10,0.88)';
    ctx.beginPath(); ctx.roundRect(-16,-20,32,40,5); ctx.fill();
    var coils=4;
    ctx.strokeStyle=pct>0.8?'#FFCC00':'#44AA44'; ctx.lineWidth=2; ctx.lineCap='round';
    var springH=28*(1-pct*0.5);
    ctx.beginPath();
    for(var i=0;i<=coils*4;i++){
      var sy=-14+(i/(coils*4))*springH;
      var sx2=(i%2===0?-1:1)*8;
      if(i===0) ctx.moveTo(sx2,sy); else ctx.lineTo(sx2,sy);
    }
    ctx.stroke();
    ctx.fillStyle=pct>0.8?'#FFCC00':'#44AA44';
    ctx.fillRect(-10,18,20*pct,4);
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1;
    ctx.strokeRect(-10,18,20,4);
    ctx.restore();
  },

  // ─── EKSTRA UI ELEMENTLERİ ───────────────────────────────────────────────

  drawCrossHair(ctx, W, H, t) {
    var cx=W/2,cy=H/2,size=16,gap=5;
    var pulse=1+0.05*Math.sin(t*0.05);
    ctx.save(); ctx.translate(cx,cy); ctx.scale(pulse,pulse);
    ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-size,0); ctx.lineTo(-gap,0); ctx.moveTo(gap,0); ctx.lineTo(size,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-size); ctx.lineTo(0,-gap); ctx.moveTo(0,gap); ctx.lineTo(0,size); ctx.stroke();
    ctx.fillStyle='rgba(255,80,80,0.8)';
    ctx.beginPath(); ctx.arc(0,0,2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  },

  drawSpeedbump(ctx, x, y, t) {
    var alpha=Math.min(1,t<20?t/20:Math.max(0,1-(t-60)/30));
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x,y);
    var pulse=1+0.1*Math.sin(t*0.2); ctx.scale(pulse,pulse);
    ctx.fillStyle='rgba(255,200,0,0.85)';
    ctx.beginPath(); ctx.roundRect(-28,-16,56,32,8); ctx.fill();
    ctx.strokeStyle='#000'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(-28,-16,56,32,8); ctx.stroke();
    ctx.fillStyle='#000';
    for(var i=0;i<4;i++){
      var bx=-22+i*14;
      ctx.beginPath(); ctx.moveTo(bx,-14); ctx.lineTo(bx+7,-14); ctx.lineTo(bx+5,14); ctx.lineTo(bx-2,14); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle='#FFE000'; ctx.font='bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('BUMP!',0,-17);
    ctx.restore();
  },

  drawObstacleWarning(ctx, x, y, type, t) {
    var alpha=Math.min(1,0.6+0.4*Math.sin(t*0.15));
    var icons={rock:'🪨',tree:'🌲',log:'🪵',oil:'🛢',spike:'⚠',car:'🚗',def:'⚠'};
    ctx.save(); ctx.globalAlpha=alpha; ctx.translate(x,y);
    ctx.fillStyle='rgba(200,0,0,0.8)';
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(20,14); ctx.lineTo(-20,14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#FF4444'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(20,14); ctx.lineTo(-20,14); ctx.closePath(); ctx.stroke();
    ctx.font='14px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(icons[type]||icons.def,0,2);
    ctx.restore();
  },

  drawDangerZone(ctx, x, y, W, H, t) {
    var alpha=0.15+0.1*Math.sin(t*0.08);
    ctx.save(); ctx.globalAlpha=alpha;
    var vGrad = GradyanDeposu.rad(ctx, W/2, H/2, H*0.25, W/2, H/2, H*0.7, [0, 'rgba(255,0,0,0)', 1, 'rgba(255,0,0,0.8)']);
    ctx.fillStyle=vGrad; ctx.fillRect(x,y,W,H);
    ctx.globalAlpha=0.6+0.4*Math.sin(t*0.12);
    ctx.fillStyle='#FF3300';
    ctx.font='bold '+Math.floor(W*0.06)+'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⚠ DANGER ZONE ⚠',W/2,H*0.15);
    ctx.restore();
  },

  drawPowerupTimer(ctx, x, y, type, remaining, total, t) {
    var pct=Math.min(1,Math.max(0,remaining/total));
    var r=20;
    var icons={nitro:'⚡',shield:'🛡',magnet:'🧲',star:'⭐',x2:'x2',slow:'🐢'};
    var puColors={nitro:'#00FFFF',shield:'#4466FF',magnet:'#FF44FF',star:'#FFD700',x2:'#FF8800',slow:'#88FFFF'};
    ctx.save(); ctx.translate(x,y);
    ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.beginPath(); ctx.arc(0,0,r+4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(0,0,r,-Math.PI/2,Math.PI*1.5); ctx.stroke();
    ctx.strokeStyle=puColors[type]||'#FFFFFF'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(0,0,r,-Math.PI/2,-Math.PI/2+pct*Math.PI*2); ctx.stroke();
    ctx.font='14px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(icons[type]||type,0,-3);
    ctx.fillStyle='#fff'; ctx.font='bold 8px ui-monospace, Consolas, monospace';
    ctx.textBaseline='bottom'; ctx.fillText(remaining.toFixed(1)+'s',0,r+12);
    ctx.restore();
  },

  drawEventAlert(ctx, W, H, event, t) {
    var duration=160;
    if(t>=duration) return;
    var inPct=Math.min(1,t/25);
    var outPct=t>duration-35?1-(duration-t)/35:0;
    var alpha=Math.max(0,inPct-outPct);
    var shakeX=t<15?(Math.random()-0.5)*8*(1-t/15):0;
    var ec={
      earthquake:{icon:'🌍',color:'#AA6600',label:'EARTHQUAKE!'},
      meteor:    {icon:'☄',       color:'#FF4400',label:'METEOR STRIKE!'},
      flood:     {icon:'🌊',color:'#0044FF',label:'FLOOD WARNING!'},
      storm:     {icon:'⛈',       color:'#6622AA',label:'STORM!'},
      avalanche: {icon:'🏔',color:'#AACCFF',label:'AVALANCHE!'},
      eruption:  {icon:'🌋',color:'#FF2200',label:'ERUPTION!'}
    };
    var cfg=ec[event]||{icon:'⚠',color:'#FF8800',label:String(event).toUpperCase()};
    ctx.save(); ctx.globalAlpha=alpha;
    ctx.translate(W/2+shakeX,H/2);
    var bW=300,bH=80;
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(-W/2,-H/2,W,H);
    var aGrad = GradyanDeposu.lin(ctx, -bW/2, 0, bW/2, 0, [0, 'rgba(0,0,0,0)', 0.1, cfg.color+'EE', 0.9, cfg.color+'EE', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle=aGrad;
    ctx.beginPath(); ctx.roundRect(-bW/2,-bH/2,bW,bH,10); ctx.fill();
    ctx.font='36px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(cfg.icon,-bW/2+50,0);
    ctx.fillStyle='#FFFFFF';
    ctx.font='bold '+Math.min(28,Math.floor(bW*0.08))+'px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(cfg.label,bW/2-80,-10);
    ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.font='12px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('Take cover!',bW/2-80,12);
    ctx.restore();
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PREMIUM VISUAL HELPERS  (additive — original design, no external assets)
  // ══════════════════════════════════════════════════════════════════════════

  // Map a flip/combo count to a score multiplier (mirrors game.js tiers).
  _comboMult(count) {
    if (count <= 1) return 1;
    if (count <= 3) return 1.5;
    if (count <= 6) return 2;
    if (count <= 10) return 3;
    return 4;
  },

  // Small floating multiplier chip shown on big combos.
  //   scale : entrance scale (matches the parent badge pop)
  //   alpha : 0..1 fade
  _drawComboMultiplierChip(ctx, x, y, mult, scale, alpha, now) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(x, y);
    // gentle bob so it feels alive
    const bob = Math.sin(now * 0.012) * 2;
    ctx.translate(0, bob);
    ctx.scale(scale, scale);
    const r = 20;
    // radial gold coin backing
    const g = GradyanDeposu.rad(ctx, -4, -5, 2, 0, 0, r, [0, '#fff3a8', 0.55, '#ffcf3d', 1, '#e07a10']);
    ctx.shadowColor = '#ffb020';
    ctx.shadowBlur = 12;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // ring
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    // multiplier text with dark outline for punch
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px Impact, "Arial Black", system-ui, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(90,45,0,0.85)';
    ctx.strokeText('×' + mult, 0, 0);
    ctx.fillStyle = '#3a1e00';
    ctx.fillText('×' + mult, 0, 0);
    ctx.restore();
  },

  // Map a flip count to a Turkish trick name for the big popup label.
  _trickName(count) {
    if (count <= 1) return 'TAKLA!';
    if (count === 2) return 'ÇİFT TAKLA!';
    return 'SÜPER TAKLA!';
  },

  // Big animated trick-name popup: fiery label + combo multiplier badge (×N)
  // + rising "+N" score flourish.  Original Canvas-2D, no external assets.
  //   scale : entrance pop scale (overshoot)   alpha : 0..1 fade
  //   age   : 0 (spawn) → 1 (end)
  _drawTrickPopup(ctx, cx, cy, count, score, scale, alpha, age, now) {
    const combo = Math.max(1, count);
    const hot   = combo >= 3;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // spawn shockwave ring — expands outward and fades early in the life
    if (age < 0.45) {
      const rp = age / 0.45;
      const rr = 32 + rp * 92;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha * (1 - rp) * 0.8);
      ctx.translate(cx, cy);
      ctx.strokeStyle = hot ? '#ff5a1e' : '#ffd23d';
      ctx.lineWidth = 5 * (1 - rp) + 1;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // ── big trick label ──
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(now * 0.012) * 0.02);          // subtle energetic wobble
    ctx.scale(scale, scale);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label    = this._trickName(count);
    const fontSize = hot ? 46 : combo === 2 ? 40 : 34;
    ctx.font = 'bold ' + fontSize + 'px Impact, "Arial Black", system-ui, sans-serif';
    // heavy dark outline so it reads over any terrain
    ctx.lineJoin = 'round'; ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(40,16,0,0.85)';
    ctx.strokeText(label, 0, 0);
    // fiery gradient fill + pulsing glow
    const lg = ctx.createLinearGradient(0, -fontSize / 2, 0, fontSize / 2);
    if (hot) { lg.addColorStop(0, '#fff2a8'); lg.addColorStop(0.5, '#ffb020'); lg.addColorStop(1, '#ff3d00'); }
    else     { lg.addColorStop(0, '#fff6d0'); lg.addColorStop(0.5, '#ffd23d'); lg.addColorStop(1, '#ff8a1e'); }
    ctx.shadowColor = hot ? '#ff5a1e' : '#ffab2e';
    ctx.shadowBlur  = 16 + 6 * Math.sin(now * 0.02);
    ctx.fillStyle   = lg;
    ctx.fillText(label, 0, 0);
    ctx.shadowBlur  = 0;

    // ── combo multiplier badge (×2, ×3 …) tucked at the upper-right ──
    if (combo >= 2) {
      const w  = ctx.measureText(label).width;   // measured with the label font
      const bx = w / 2 + 16;
      const by = -fontSize * 0.5;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-0.1 + Math.sin(now * 0.01) * 0.03);
      const pw = 50, ph = 32;
      const bg = GradyanDeposu.lin(ctx, 0, -ph / 2, 0, ph / 2, [0, hot ? '#ff9a3d' : '#ffd23d', 1, hot ? '#d81b00' : '#e8730a']);
      ctx.shadowColor = hot ? '#ff5a1e' : '#ffab2e'; ctx.shadowBlur = 10;
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 8); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 8); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Impact, "Arial Black", system-ui, sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(60,20,0,0.7)';
      ctx.strokeText('×' + combo, 0, 1);
      ctx.fillText('×' + combo, 0, 1);
      ctx.restore();
    }
    ctx.restore();

    // ── rising "+N" score flourish (floats up + fades) ──
    if (score > 0) {
      const rise   = this._easeOutCubic(age) * 46;
      const sAlpha = alpha * (age < 0.15 ? age / 0.15 : 1);
      const ss     = this._easeOutBack(Math.min(1, age / 0.25));
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, sAlpha));
      ctx.translate(cx, cy + 30 - rise);
      ctx.scale(ss, ss);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 22px Impact, "Arial Black", system-ui, sans-serif';
      ctx.lineJoin = 'round'; ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(18,30,6,0.85)';
      ctx.strokeText('+' + score, 0, 0);
      ctx.shadowColor = '#7dff3d'; ctx.shadowBlur = 8;
      ctx.fillStyle = '#b6ff5a';
      ctx.fillText('+' + score, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  },

  // In-air hang-time / spin meter. A circular gauge that fills with airtime and
  // shows the live rotation accumulated during the current flight.
  //   fill  : 0..1 airtime fraction (full ~3s)
  //   airT  : raw airtime seconds (for the numeric readout)
  //   rot   : accumulated live rotation in radians
  //   fade  : 0..1 overall visibility
  _drawAirComboMeter(ctx, cx, cy, fill, airT, rot, fade, now) {
    fill = Math.max(0, Math.min(1, fill));
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    ctx.translate(cx, cy);
    const r = 34;
    const start = -Math.PI / 2;
    // soft dark hub so it reads over any terrain
    const hub = GradyanDeposu.rad(ctx, 0, 0, r * 0.2, 0, 0, r + 8, [0, 'rgba(6,12,22,0.55)', 1, 'rgba(6,12,22,0)']);
    ctx.fillStyle = hub;
    ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.fill();
    // recessed track
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r, start, start + Math.PI * 2); ctx.stroke();
    // progress arc — cyan→gold→orange as hang-time grows
    const arcCol = fill > 0.75 ? '#ff8a3d' : fill > 0.45 ? '#ffd23d' : '#5fe0ff';
    const ag = GradyanDeposu.lin(ctx, -r, -r, r, r, [0, '#5fe0ff', 1, arcCol]);
    ctx.strokeStyle = ag;
    ctx.lineWidth = 6;
    ctx.shadowColor = arcCol; ctx.shadowBlur = 8;
    if (fill > 0.001) {
      ctx.beginPath();
      ctx.arc(0, 0, r, start, start + fill * Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // leading spark at the arc tip
    if (fill > 0.02 && fill < 0.999) {
      const a = start + fill * Math.PI * 2;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = arcCol; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // rotating spin glyph in the centre reflecting live rotation
    ctx.save();
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 18px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌀', 0, 0);
    ctx.restore();
    // numeric airtime readout + spin count under the dial
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 13px Impact, "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(airT.toFixed(1) + 's', 0, r - 8);
    const spins = Math.floor(Math.abs(rot) / (Math.PI * 2) + 0.001);
    if (spins >= 1) {
      ctx.fillStyle = '#ffd23d';
      ctx.font = 'bold 9px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText(spins + '× SPIN', 0, r + 8);
    } else {
      ctx.fillStyle = 'rgba(180,225,255,0.75)';
      ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('AIR TIME', 0, r + 8);
    }
    ctx.restore();
  },

  // Distance-milestone flourish: an expanding golden ring + "500m" style label.
  //   life : 1 → 0 progress of the flourish
  _drawMilestoneFlourish(ctx, cx, cy, life, meters, tint) {
    life = Math.max(0, Math.min(1, life));
    const age = 1 - life;                    // 0 → 1
    const ease = 1 - Math.pow(1 - age, 3);   // ease-out
    ctx.save();
    ctx.translate(cx, cy);
    // expanding ring that fades as it grows
    const ringR = 44 + ease * 46;
    ctx.globalAlpha = life * 0.8;
    ctx.strokeStyle = tint || '#FFD700';
    ctx.lineWidth = 3 * life + 0.5;
    ctx.shadowColor = tint || '#FFD700'; ctx.shadowBlur = 12 * life;
    ctx.beginPath(); ctx.ellipse(0, 4, ringR, ringR * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // "MILESTONE" flourish label that pops then drifts up + fades
    const inK = Math.min(1, age / 0.2);
    const pop = this._easeOutBack(inK);
    const drift = -ease * 10;
    ctx.globalAlpha = Math.min(1, life * 2.2);
    ctx.translate(0, 30 + drift);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = Math.floor(meters).toLocaleString('tr-TR') + ' M';
    ctx.font = 'bold 15px Impact, "Arial Black", system-ui, sans-serif';
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(30,20,0,0.7)';
    ctx.strokeText('◆ ' + label, 0, 0);
    const lg = GradyanDeposu.lin(ctx, 0, -10, 0, 10, [0, '#fff3a8', 1, tint || '#ffbf1f']);
    ctx.fillStyle = lg;
    ctx.fillText('◆ ' + label, 0, 0);
    ctx.restore();
  },

  // Colour/scale tier for a coin/score pickup popup, keyed by its value so a big
  // haul reads louder than a single coin. Purely a lookup — no side effects.
  _coinTier(val) {
    val = val || 0;
    if (val >= 500) return { core: '#e6ccff', ring: '#b98bff', edge: '#6a2fd0', txt: '#f3ecff', size: 1.50 };
    if (val >= 100) return { core: '#d4fbff', ring: '#8af6ff', edge: '#0e8fc0', txt: '#e6ffff', size: 1.32 };
    if (val >= 50)  return { core: '#e6ffcf', ring: '#a6ff7a', edge: '#3a9a20', txt: '#f0ffe4', size: 1.18 };
    if (val >= 20)  return { core: '#fff3c0', ring: '#ffd23c', edge: '#e0941a', txt: '#fff6d0', size: 1.07 };
    return            { core: '#FFF3A0', ring: '#FFD700', edge: '#E6941A', txt: '#FFE680', size: 1.00 };
  },

  // Accumulate successive trick events into an escalating streak. Additive —
  // called from showFlip; no public signature change and no external wiring.
  _registerCombo(count) {
    const now = Date.now();
    const within = this._comboLast && (now - this._comboLast) < 4000;
    this._comboStreak = within ? this._comboStreak + 1 : 1;
    this._comboLast   = now;
    const mult = this._comboMult(count);
    this._comboBest = within ? Math.max(this._comboBest, mult) : mult;
    this._comboStreakT = 2.4;   // seconds the streak counter stays visible
  },

  // Escalating combo-streak counter. The pill grows in size/heat as the streak
  // climbs (amber → orange → magenta). Drawn on the right flank so it never
  // crowds the centre trick popup.
  //   life : 1 → 0 remaining lifetime
  _drawComboStreak(ctx, x, y, streak, best, life, now, perfLow) {
    life = Math.max(0, Math.min(1, life));
    const inK  = Math.min(1, (1 - life) / 0.12);        // quick entrance pop
    const pop  = this._easeOutBack(inK);
    const fade = life < 0.35 ? life / 0.35 : 1;          // gentle tail fade
    const heat = Math.min(1, (streak - 2) / 8);          // 0..1 escalation
    const col  = streak >= 8 ? '#ff3df0' : streak >= 5 ? '#ff5a1e' : '#ffb020';
    const glow = streak >= 8 ? '#ff3df0' : streak >= 5 ? '#ff5a1e' : '#ffab2e';
    const sc   = pop * (1 + heat * 0.35);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    ctx.translate(x, y);
    ctx.translate(0, Math.sin(now * 0.01) * 2);          // subtle energetic bob
    ctx.scale(sc, sc);
    const pw = 60, ph = 54;
    if (!perfLow) { ctx.shadowColor = glow; ctx.shadowBlur = 14 + heat * 10; }
    const bg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    bg.addColorStop(0, '#2a0e04');
    bg.addColorStop(1, '#120401');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 10); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 10); ctx.stroke();
    // big streak number
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px Impact, "Arial Black", system-ui, sans-serif';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,6,0,0.8)';
    ctx.strokeText(streak + '×', 0, -8);
    const ng = GradyanDeposu.lin(ctx, 0, -20, 0, 6, [0, '#fff3c0', 1, col]);
    ctx.fillStyle = ng;
    ctx.fillText(streak + '×', 0, -8);
    // caption + best multiplier reached in this streak
    ctx.fillStyle = '#ffd7a0';
    ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('COMBO', 0, 12);
    ctx.fillStyle = col;
    ctx.font = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('SCORE ×' + best, 0, 22);
    ctx.restore();
  },

  // Major-distance banner (every 1000 m). Slides in from the left, holds, then
  // slides out to the right — a bigger celebratory beat than the 500 m ring.
  //   life : 1 → 0 remaining lifetime
  _drawMilestoneBanner(ctx, cx, cy, meters, life, tint, now, perfLow) {
    life = Math.max(0, Math.min(1, life));
    const age  = 1 - life;
    const inK  = this._easeOutCubic(Math.min(1, age / 0.18));            // slide in
    const outK = this._easeOutCubic(Math.max(0, (age - 0.78) / 0.22));   // slide out
    const off  = (1 - inK) * -280 + outK * 280;
    const alpha = Math.min(1, inK) * (1 - outK);
    if (alpha <= 0.01) { return; }
    const bw = 240, bh = 44;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(cx + off, cy);
    // banner body — dark glass
    if (!perfLow) { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; }
    const bg = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    bg.addColorStop(0, 'rgba(26,22,10,0.94)');
    bg.addColorStop(1, 'rgba(8,6,2,0.94)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 10); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // top glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh * 0.42, [10, 10, 0, 0]); ctx.fill();
    // tinted rim + soft glow
    if (!perfLow) { ctx.shadowColor = tint || '#ffd23c'; ctx.shadowBlur = 10 + 5 * Math.sin(now * 0.01); }
    ctx.strokeStyle = tint || '#ffd23c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 10); ctx.stroke();
    ctx.shadowBlur = 0;
    // flag glyph
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '20px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('🏁', -bw / 2 + 24, 0);
    // metres label
    const mstr = Math.floor(meters).toLocaleString('tr-TR') + ' M';
    ctx.font = 'bold 22px Impact, "Arial Black", system-ui, sans-serif';
    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,20,0,0.7)';
    ctx.strokeText(mstr, 14, -4);
    const lg = GradyanDeposu.lin(ctx, 0, -12, 0, 12, [0, '#fff3a8', 1, tint || '#ffbf1f']);
    ctx.fillStyle = lg;
    ctx.fillText(mstr, 14, -4);
    ctx.fillStyle = 'rgba(255,235,180,0.8)';
    ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('MİLESTONE', 14, 13);
    ctx.restore();
  },

  // Clean nitro/boost status pill: a brief "BOOST READY" flash when the boost
  // recharges to full, and a live "BOOST!" energy state while it's firing.
  //   readyFlash  : 0..1 recharge-to-full highlight timer
  //   activePulse : 0..1 eased boosting state
  //   frac        : 0..1 current boost charge (for the subtle fill sliver)
  _drawBoostReadyIndicator(ctx, cx, cy, active, readyFlash, activePulse, frac, now, perfLow) {
    readyFlash  = Math.max(0, Math.min(1, readyFlash));
    activePulse = Math.max(0, Math.min(1, activePulse));
    const showReady = readyFlash > 0.01 && !active;
    const alpha = active ? 1 : (showReady ? Math.min(1, readyFlash * 2.2) : activePulse);
    if (alpha <= 0.01) { return; }
    const pw = 128, ph = 26;
    const col  = active ? '#22e0ff' : '#7dff8a';
    const glow = active ? '#22e0ff' : '#4dff6a';
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(cx, cy);
    const pop = 1 + (active ? 0.04 : 0.05) * Math.sin(now * 0.02);
    ctx.scale(pop, pop);
    // pill body
    if (!perfLow) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    const bg = GradyanDeposu.lin(ctx, 0, -ph / 2, 0, ph / 2, [0, 'rgba(10,26,34,0.90)', 1, 'rgba(4,10,16,0.90)']);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // charge-fraction sliver (subtle) + travelling shimmer while active
    ctx.save();
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.clip();
    const f = active ? 1 : Math.max(0, Math.min(1, frac));
    const fgr = GradyanDeposu.lin(ctx, -pw / 2, 0, pw / 2, 0, [0, active ? 'rgba(34,224,255,0.35)' : 'rgba(80,255,120,0.22)', 1, 'rgba(255,255,255,0.02)']);
    ctx.fillStyle = fgr;
    ctx.fillRect(-pw / 2, -ph / 2, pw * f, ph);
    if (active && !perfLow) {
      const sx = -pw / 2 + ((now * 0.2) % (pw + 30));
      const sh = GradyanDeposu.lin(ctx, sx - 12, 0, sx + 12, 0, [0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.5)', 1, 'rgba(255,255,255,0)']);
      ctx.fillStyle = sh;
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    }
    ctx.restore();
    // rim + glow
    if (!perfLow) { ctx.shadowColor = glow; ctx.shadowBlur = active ? 12 + 5 * Math.sin(now * 0.02) : 9; }
    ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // icon + label
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '13px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('🚀', -pw / 2 + 10, 0);
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Impact, "Arial Black", system-ui, sans-serif';
    ctx.fillStyle = col;
    ctx.fillText(active ? 'BOOST!' : 'BOOST READY', 6, 0);
    ctx.restore();
  },

  // Glossy vertical fill bar used by the fuel & boost gauges.
  //   fill   : 0..1 fraction currently shown
  //   opts   : { top, bottom, glow, glowA, alpha, scan }
  _drawGlassBarV(ctx, x, y, w, h, fill, opts) {
    opts = opts || {};
    fill = Math.max(0, Math.min(1, fill));
    const now = Date.now();
    ctx.save();

    // ── recessed housing / frame ──────────────────────────────────────────
    ctx.fillStyle = 'rgba(6,9,16,0.72)';
    ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 6); ctx.fill();
    // inner track (empty groove) with subtle top-down shading
    const track = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(0,0,0,0.55)', 1, 'rgba(30,36,52,0.55)']);
    ctx.fillStyle = track;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();

    // ── liquid fill ───────────────────────────────────────────────────────
    if (fill > 0.001) {
      const fillH = h * fill;
      const fy = y + h - fillH;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.clip();
      const g = ctx.createLinearGradient(x, fy, x, y + h);
      g.addColorStop(0, opts.top || '#5fd6ff');
      g.addColorStop(1, opts.bottom || '#0090c4');
      ctx.globalAlpha = (opts.alpha === undefined ? 1 : opts.alpha);
      ctx.fillStyle = g;
      ctx.fillRect(x, fy, w, fillH);

      // vertical glass highlight down the left third
      const sheen = GradyanDeposu.lin(ctx, x, 0, x + w, 0, [0, 'rgba(255,255,255,0.30)', 0.4, 'rgba(255,255,255,0.05)', 1, 'rgba(255,255,255,0)']);
      ctx.fillStyle = sheen;
      ctx.fillRect(x, fy, w, fillH);

      // bright meniscus line at the top of the liquid
      ctx.globalAlpha *= 0.9;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillRect(x, fy, w, 1.5);

      // animated energy scan-line (used while boosting)
      if (opts.scan) {
        const sY = y + h - ((now * 0.18) % (h + 20));
        if (sY > y - 6 && sY < y + h) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(x, sY, w, 2);
        }
      }
      ctx.restore();
    }

    // ── outer glow (low-fuel pulse / active boost) ────────────────────────
    if (opts.glow) {
      ctx.globalAlpha = (opts.glowA === undefined ? 1 : opts.glowA);
      ctx.shadowColor = opts.glow;
      ctx.shadowBlur  = 12;
      ctx.strokeStyle = opts.glow;
      ctx.lineWidth   = 1.6;
      ctx.beginPath(); ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 5); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // ── crisp rim ─────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.stroke();

    ctx.restore();
  },

  // Compact animated speed meter used by the top-right speed panel.
  //   pct     : 0..1 current (smoothed) speed fraction
  //   peakPct : 0..1 session peak fraction → drawn as a hold marker
  //   hot     : true at high speed → adds a travelling shimmer
  //   flash   : 0..1 brief highlight when a new peak is set
  _drawSpeedMeter(ctx, x, y, w, h, pct, peakPct, hot, flash, now) {
    pct = Math.max(0, Math.min(1, pct));
    ctx.save();
    // recessed track
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
    // clip fill + shimmer + ticks to the rounded track
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.clip();
    // gradient fill (cyan → amber → red)
    const g = GradyanDeposu.lin(ctx, x, 0, x + w, 0, [0, '#8fe3ff', 0.6, '#ffb020', 1, '#FF3D00']);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * pct, h);
    // travelling shimmer highlight while going fast
    if (hot && pct > 0.02) {
      const sx = x + ((now * 0.12) % (w + 30)) - 15;
      const sh = GradyanDeposu.lin(ctx, sx - 10, 0, sx + 10, 0, [0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.6)', 1, 'rgba(255,255,255,0)']);
      ctx.fillStyle = sh;
      ctx.fillRect(x, y, w * pct, h);
    }
    // faint segment ticks for a digital-gauge feel
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let i = 1; i < 10; i++) ctx.fillRect(x + (w / 10) * i, y, 1, h);
    ctx.restore(); // end clip
    // peak-hold marker (flashes bright when a new peak lands)
    if (peakPct > 0.02) {
      const px = x + w * Math.min(1, peakPct);
      ctx.strokeStyle = flash > 0.05 ? '#ffffff' : 'rgba(255,255,255,0.85)';
      ctx.lineWidth = flash > 0.05 ? 2 : 1.3;
      if (flash > 0.05) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6 * flash; }
      ctx.beginPath();
      ctx.moveTo(px, y - 1.5); ctx.lineTo(px, y + h + 1.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  // ── Compact big-air / current-combo flash (additive) ───────────────────────
  // A small pill that fades in and pulses only during long hang-time. Shows the
  // live air-time and (once the vehicle has rotated at least once) the building
  // spin/combo count. Respects the low-graphics perf flag (skips the glow).
  //   flash : 0..1 eased visibility  ·  spins : whole rotations this flight
  _drawBigAirFlash(ctx, cx, cy, airT, spins, flash, now, perfLow) {
    flash = Math.max(0, Math.min(1, flash));
    if (flash <= 0.01) return;
    const blink = 0.6 + 0.4 * Math.sin(now * 0.025);
    ctx.save();
    ctx.globalAlpha = flash * (0.5 + 0.5 * blink);
    ctx.translate(cx, cy);
    const pop = 1 + 0.05 * Math.sin(now * 0.02);
    ctx.scale(pop, pop);
    const pw = 122, ph = 22;
    const hot = spins >= 1;
    const col  = hot ? '#ffd23d' : '#7dfbff';
    const glow = hot ? '#ff8a3d' : '#22e0ff';
    if (!perfLow) { ctx.shadowColor = glow; ctx.shadowBlur = 9 + 6 * flash * blink; }
    const bg = GradyanDeposu.lin(ctx, 0, -ph / 2, 0, ph / 2, [0, 'rgba(10,20,34,0.88)', 1, 'rgba(4,8,16,0.88)']);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '12px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText('💨', -pw / 2 + 9, 0);
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px Impact, "Arial Black", system-ui, sans-serif';
    ctx.fillStyle = col;
    const label = hot ? ('AIR ' + airT.toFixed(1) + 's · ' + spins + '×')
                      : ('BIG AIR ' + airT.toFixed(1) + 's');
    ctx.fillText(label, 8, 0.5);
    ctx.restore();
  },

  // ── Best-distance "ghost line" on the route strip (additive, independent) ───
  // Re-derives the route strip's world→screen mapping (it does NOT read or touch
  // _drawRouteStrip internals) and overlays a dashed cyan marker + flag at the
  // best-distance world position. Clipped to the strip; nothing draws when the
  // marker is off-strip. Respects the low-graphics perf flag.
  _drawBestGhostLine(ctx, x, y, w, h, vehicle, bestMeters, now, perfLow) {
    if (!(bestMeters > 0)) return;
    const carWX   = vehicle.x || 0;
    const backSpan = 900, aheadSpan = 3300, wSpan = backSpan + aheadSpan;
    const wStart  = carWX - backSpan;
    const bestWX  = bestMeters * 2 + 200;          // distance→world (inverse of HUD)
    const gx      = x + ((bestWX - wStart) / wSpan) * w;
    const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
    if (gx < ix - 6 || gx > ix + iw + 6) return;    // off-strip → nothing to draw
    ctx.save();
    ctx.beginPath(); ctx.roundRect(ix, iy, iw, ih, 5); ctx.clip();
    const blink = 0.6 + 0.4 * Math.sin(now * 0.006);
    // dashed vertical ghost line
    ctx.globalAlpha = 0.8 * blink;
    if (ctx.setLineDash) ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#7dfbff'; ctx.lineWidth = 1.4;
    if (!perfLow) { ctx.shadowColor = '#22e0ff'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.moveTo(gx, iy + 2); ctx.lineTo(gx, iy + ih - 2); ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    // little pennant flag at the top of the line
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#7dfbff';
    ctx.beginPath();
    ctx.moveTo(gx, iy + 2);
    ctx.lineTo(gx + 9, iy + 4.5);
    ctx.lineTo(gx, iy + 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  // ── Compact boost/nitro charge ring (additive) ─────────────────────────────
  // Small radial gauge mirroring the live boost charge fraction. Reads brighter
  // while charging and lights up (with a rocket glyph) while firing. Everything
  // guarded upstream; respects the low-graphics perf flag (skips the glow).
  //   frac : 0..1 charge fraction  ·  active : boost currently firing
  _drawBoostChargeRing(ctx, cx, cy, frac, active, now, perfLow) {
    frac = Math.max(0, Math.min(1, frac));
    const r = 15;
    const start = -Math.PI / 2;
    const full = frac >= 0.999;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = active ? 1 : (full ? 0.9 : 0.72);
    // soft dark hub so it reads over any terrain
    const hub = GradyanDeposu.rad(ctx, 0, 0, r * 0.2, 0, 0, r + 4, [0, 'rgba(6,12,22,0.7)', 1, 'rgba(6,12,22,0.12)']);
    ctx.fillStyle = hub;
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.fill();
    // recessed track
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, r, start, start + Math.PI * 2); ctx.stroke();
    // charge arc
    const col = active ? '#22e0ff' : (full ? '#8af6ff' : '#4fd6ff');
    ctx.strokeStyle = col; ctx.lineWidth = 4;
    if (!perfLow) { ctx.shadowColor = col; ctx.shadowBlur = active ? 10 : (full ? 8 : 4); }
    if (frac > 0.001) {
      ctx.beginPath(); ctx.arc(0, 0, r, start, start + frac * Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // centre: rocket glyph while firing, otherwise a compact percent readout
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (active) {
      ctx.font = '13px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('🚀', 0, 0.5);
    } else {
      ctx.fillStyle = full ? '#8af6ff' : 'rgba(210,240,255,0.92)';
      ctx.font = 'bold 9px Impact, "Arial Black", system-ui, sans-serif';
      ctx.fillText(String(Math.round(frac * 100)), 0, 0.5);
    }
    ctx.restore();
  },

  // ── Context tip (run-start hint) — additive ────────────────────────────────
  // Draws a brief, mode-appropriate hint pill near the top of the screen at the
  // start of a run. `life` is the remaining lifetime fraction (1 → 0); it fades
  // in on entrance and out on exit. Text is chosen from the passed mode, falling
  // back to a rotating generic tip. Guarded / perf-aware by the caller.
  _drawContextTip(ctx, canvasW, canvasH, life, mode, rotIdx, now, perfLow) {
    life = Math.max(0, Math.min(1, life));
    const age  = 1 - life;
    const inA  = Math.min(1, age / 0.15);                 // fade in over first 15%
    const outA = life < 0.30 ? (life / 0.30) : 1;         // fade out over last 30%
    const alpha = Math.min(inA, outA);
    if (alpha <= 0.01) return;
    // mode-appropriate hint
    let icon = '💡', text;
    switch (mode) {
      case 'coinrush':   icon = '🪙'; text = 'Coin topla, süre kazan!';        break;
      case 'checkpoint': icon = '🚩'; text = 'Kontrol noktalarına ulaş!';      break;
      case 'fueltrial':  icon = '⛽'; text = 'Yakıt bidonlarını topla!';       break;
      case 'boss':       icon = '⚠️'; text = 'Kaç!';                            break;
      case 'survival':   icon = '🛡️'; text = 'Hayatta kal, engellerden kaç!';  break;
      case 'timetrial':  icon = '⏱️'; text = 'En iyi zamanı yakala!';          break;
      case 'ghostmp':    icon = '👻'; text = 'Hayaleti geç!';                   break;
      case 'race':       icon = '🏁'; text = 'Rakibini geç, yarışı kazan!';     break;
      default: {
        const tips = [
          'Takla atarak bonus kazan!',
          'Yakıtına dikkat et!',
          'Boost ile hız kazan!',
          'Rekorunu kırmaya çalış!',
          'Coinleri toplamayı unutma!',
          'Yumuşak in, hızını koru!'
        ];
        const _n = tips.length;
        text = tips[(((rotIdx | 0) % _n) + _n) % _n];
      }
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    const cx = canvasW / 2, cy = canvasH * 0.20;
    ctx.translate(cx, cy + (1 - outA) * -10);             // gentle rise on exit
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif';
    const label = icon + '  ' + text;
    const bw = Math.min(canvasW - 40, ctx.measureText(label).width + 34);
    const bh = 30;
    const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
    g.addColorStop(0, 'rgba(20,26,40,0.86)');
    g.addColorStop(1, 'rgba(6,9,18,0.86)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 15); ctx.fill();
    // top glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh * 0.5, [15, 15, 0, 0]); ctx.fill();
    // softly pulsing rim
    const rimA = 0.5 + 0.3 * Math.sin(now * 0.005);
    ctx.strokeStyle = 'rgba(120,200,255,' + rimA.toFixed(2) + ')';
    ctx.lineWidth = 1.3;
    if (!perfLow) { ctx.shadowColor = 'rgba(80,170,255,0.5)'; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 15); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eaf4ff';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  },

  // ── Low-fuel edge pulse — additive ─────────────────────────────────────────
  // Tiny pulsing warning pinned to the left HUD edge, complementing (not
  // replacing) the fuel-bar blink. `intensity` is the eased 0..1 visibility set
  // by the caller. Perf-aware: skips the glow strip + shadow blur when perfLow.
  _drawLowFuelPulse(ctx, canvasW, canvasH, intensity, now, perfLow) {
    intensity = Math.max(0, Math.min(1, intensity));
    if (intensity <= 0.01) return;
    const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.011));
    const a = intensity * pulse;
    ctx.save();
    // thin warning glow strip on the left edge (skipped in low-graphics)
    if (!perfLow) {
      const stripH = Math.min(150, canvasH * 0.4);
      const sy = (canvasH - stripH) / 2;
      const gg = GradyanDeposu.lin(ctx, 0, 0, 20, 0, [0, 'rgba(255,40,0,' + (0.5 * a).toFixed(3) + ')', 1, 'rgba(255,40,0,0)']);
      ctx.fillStyle = gg;
      ctx.fillRect(0, sy, 20, stripH);
    }
    // tiny warning chip, vertically centred on the left edge
    ctx.globalAlpha = intensity * (0.7 + 0.3 * pulse);
    ctx.translate(12, canvasH / 2);
    const s = 0.92 + 0.10 * pulse;
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(140,10,0,0.9)';
    if (!perfLow) { ctx.shadowColor = '#ff3d00'; ctx.shadowBlur = 8 * pulse; }
    ctx.beginPath(); ctx.roundRect(-13, -13, 26, 26, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,120,80,0.9)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-13, -13, 26, 26, 7); ctx.stroke();
    ctx.font = '14px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⛽', 0, 1);
    ctx.restore();
  },

  // ── Milestone-distance tick — subtle sound-less flash marker (additive) ────
  // A deliberately understated passing marker that ticks past each distance step:
  // a thin line that expands outward and fades, with two faint end pips. No text,
  // no sound. `flash` is the eased 0..1 lifetime set by the caller. Perf-aware
  // (skips the soft glow in low-graphics). Distinct from the 500 m flourish.
  _drawMilestoneTick(ctx, cx, y, flash, meters, perfLow) {
    flash = Math.max(0, Math.min(1, flash));
    if (flash <= 0.01) return;
    const grow  = this._easeOutCubic(1 - flash);      // 0 → 1 across its life
    const halfW = 30 + grow * 70;                      // line expands outward
    const a     = flash * flash;                       // fade a touch faster
    ctx.save();
    ctx.translate(cx, y);
    ctx.globalAlpha = a;
    const g = GradyanDeposu.lin(ctx, -halfW, 0, halfW, 0, [0, 'rgba(120,200,255,0)', 0.5, 'rgba(160,220,255,0.9)', 1, 'rgba(120,200,255,0)']);
    ctx.strokeStyle = g; ctx.lineWidth = 1.6;
    if (!perfLow) { ctx.shadowColor = 'rgba(120,200,255,0.7)'; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.moveTo(-halfW, 0); ctx.lineTo(halfW, 0); ctx.stroke();
    ctx.shadowBlur = 0;
    // faint end pips
    ctx.fillStyle = 'rgba(180,225,255,' + a.toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(-halfW, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( halfW, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // ── Run-stats ticker — compact secondary readouts cluster (additive) ───────
  // A small three-cell ticker for the current run: coins collected, flips landed
  // and best air-time. All values are passed in (read live by the caller). Sits
  // just above the route strip. Perf-aware: drops shadows/glow in low-graphics.
  _drawRunStats(ctx, x, y, coins, flips, bestAir, now, perfLow) {
    coins   = Math.max(0, coins | 0);
    flips   = Math.max(0, flips | 0);
    bestAir = Math.max(0, bestAir || 0);
    const w = 210, h = 26;
    ctx.save();
    ctx.textBaseline = 'middle';
    if (!perfLow) { ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; }
    const bg = GradyanDeposu.lin(ctx, 0, y, 0, y + h, [0, 'rgba(20,24,38,0.80)', 1, 'rgba(5,7,14,0.80)']);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // top glass sheen
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h * 0.5, [7, 7, 0, 0]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 7); ctx.stroke();
    // three evenly-spaced cells
    const cellW = w / 3;
    const cells = [
      { icon: '🪙', val: String(coins),           col: '#FFD54A' },
      { icon: '🌀', val: String(flips),           col: '#8fd0ff' },
      { icon: '🕊️', val: bestAir.toFixed(1) + 's', col: '#b6ff9a' }
    ];
    for (let i = 0; i < 3; i++) {
      const c   = cells[i];
      const ccx = x + cellW * i + 10;
      // faint divider between cells
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + cellW * i, y + 5); ctx.lineTo(x + cellW * i, y + h - 5); ctx.stroke();
      }
      ctx.font = '12px system-ui, "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
      ctx.fillText(c.icon, ccx, y + h / 2 + 0.5);
      ctx.font = 'bold 12px "Consolas", monospace'; ctx.fillStyle = c.col;
      ctx.fillText(c.val, ccx + 20, y + h / 2 + 0.5);
    }
    ctx.restore();
  }

};

// ============================================================
// ADVANCED_SPEEDOMETER
// ============================================================
const ADVANCED_SPEEDOMETER = {
  drawAnalogSpeedo(ctx, x, y, r, speed, maxSpeed) {
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const ratio = Math.min(1, speed / maxSpeed);
    const needleAngle = startAngle + ratio * (endAngle - startAngle);

    // Dış çerçeve
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    const bgGrad = GradyanDeposu.rad(ctx, x, y, r * 0.3, x, y, r, [0, '#1a1a2e', 1, '#0a0a18']);
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ölçek yayı — arka
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, startAngle, endAngle);
    ctx.strokeStyle = '#222244';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Ölçek yayı — dolum (speed rengi)
    const arcGrad = GradyanDeposu.lin(ctx, x - r, y, x + r, y, [0, '#00cc66', 0.6, '#ffcc00', 1, '#ff2200']);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, startAngle, needleAngle);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Tik işaretleri
    const ticks = 10;
    for (let i = 0; i <= ticks; i++) {
      const a = startAngle + (i / ticks) * (endAngle - startAngle);
      const inner = r * (i % 2 === 0 ? 0.62 : 0.68);
      const outer = r * 0.76;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
      ctx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
      ctx.strokeStyle = i % 2 === 0 ? '#ffffff' : '#888888';
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.stroke();
      if (i % 2 === 0) {
        const labelDist = r * 0.52;
        const spd = Math.round((i / ticks) * maxSpeed);
        ctx.fillStyle = '#aaaacc';
        ctx.font = `bold ${Math.round(r * 0.12)}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spd, x + Math.cos(a) * labelDist, y + Math.sin(a) * labelDist);
      }
    }

    // İbre
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(needleAngle);
    const nGrad = GradyanDeposu.lin(ctx, 0, 0, r * 0.65, 0, [0, '#ff4400', 1, '#ffcc00']);
    ctx.fillStyle = nGrad;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -2);
    ctx.lineTo(r * 0.65, 0);
    ctx.lineTo(-r * 0.1, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Merkez düğme
    const cGrad = GradyanDeposu.rad(ctx, x, y, 0, x, y, r * 0.1, [0, '#ffffff', 1, '#888888']);
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Hız metni
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(r * 0.28)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(speed), x, y + r * 0.25);
    ctx.fillStyle = '#aaaacc';
    ctx.font = `${Math.round(r * 0.13)}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.fillText('km/h', x, y + r * 0.42);

    ctx.restore();
  },

  drawDigitalSpeedo(ctx, x, y, speed, unit = 'km/h') {
    const w = 130; const h = 60;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    this._roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#223366';
    ctx.lineWidth = 2;
    this._roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glow efekti
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#00ddff';
    ctx.font = 'bold 32px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(speed).toString().padStart(3, ' '), x + w - 12, y + h * 0.46);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4488aa';
    ctx.font = '12px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(unit, x + w - 12, y + h * 0.8);
    ctx.restore();
  },

  drawNeedleGauge(ctx, x, y, r, value, min, max, color = '#00ff88') {
    const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const startA = Math.PI * 0.8;
    const endA = Math.PI * 2.2;
    const angle = startA + ratio * (endA - startA);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, startA, endA);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r, startA, angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // İbre
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(r * 0.6, -1); ctx.lineTo(r * 0.6, 1); ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
};

// ============================================================
// TACHOMETER_SYSTEM
// ============================================================
const TACHOMETER_SYSTEM = {
  drawTachometer(ctx, x, y, r, rpm, redline = 7000) {
    const maxRpm = 8000;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const ratio = Math.min(1, rpm / maxRpm);
    const needleAngle = startAngle + ratio * (endAngle - startAngle);
    const redRatio = redline / maxRpm;
    const redStartAngle = startAngle + redRatio * (endAngle - startAngle);

    ctx.save();
    const bgGrad = GradyanDeposu.rad(ctx, x, y, r * 0.2, x, y, r, [0, '#1e0a0a', 1, '#0a0000']);
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#331111';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Normal bölge
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, startAngle, redStartAngle);
    ctx.strokeStyle = '#00aa44';
    ctx.lineWidth = 9;
    ctx.stroke();

    // Redline bölgesi
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, redStartAngle, endAngle);
    ctx.strokeStyle = '#cc0000';
    ctx.lineWidth = 9;
    ctx.stroke();

    // İbre
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(needleAngle);
    ctx.fillStyle = rpm > redline ? '#ff0000' : '#ff8800';
    ctx.shadowColor = rpm > redline ? '#ff0000' : '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, -2);
    ctx.lineTo(r * 0.6, 0);
    ctx.lineTo(-r * 0.08, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // RPM metni
    ctx.fillStyle = rpm > redline ? '#ff4444' : '#ffffff';
    ctx.font = `bold ${Math.round(r * 0.22)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(rpm), x, y + r * 0.28);
    ctx.fillStyle = '#888888';
    ctx.font = `${Math.round(r * 0.11)}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.fillText('RPM', x, y + r * 0.44);
    ctx.restore();
  },

  drawGearIndicator(ctx, x, y, gear) {
    const w = 50; const h = 60;
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,20,0.88)';
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = gear === 'N' ? '#00ff88' : (gear === 'R' ? '#ff4444' : '#ffcc00');
    ctx.font = `bold ${Math.round(h * 0.65)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.fillText(String(gear), x + w / 2, y + h / 2);
    ctx.restore();
  }
};

// ============================================================
// FUEL_GAUGE genişletilmiş
// ============================================================
const FUEL_GAUGE_EXT = {
  drawFuelGauge(ctx, x, y, w, h, level, t = 0) {
    // level: 0..1
    const safeLevel = Math.max(0, Math.min(1, level));
    ctx.save();
    ctx.fillStyle = 'rgba(10,10,20,0.85)';
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Yakıt simge
    ctx.fillStyle = '#888';
    ctx.font = `${Math.round(h * 0.5)}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛽', x + 4, y + h / 2);

    // Arkaplan bölge
    const barX = x + h + 6;
    const barW = w - h - 14;
    const barH = h * 0.4;
    const barY = y + (h - barH) / 2;
    ctx.fillStyle = '#111122';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    // Sallanan sıvı efekti
    const wave = Math.sin(t * 3) * 0.02;
    const fillLevel = Math.max(0, safeLevel + (level > 0.05 ? wave : 0));
    const color = level < 0.2 ? '#ff3300' : (level < 0.4 ? '#ffaa00' : '#00cc66');
    const fillGrad = GradyanDeposu.lin(ctx, barX, barY, barX, barY + barH, [0, color + 'bb', 1, color]);
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * fillLevel, barH, 4);
    ctx.fill();

    // Parlak çizgi
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, barY, barW * fillLevel, barH * 0.3);

    // Yüzde metin
    ctx.fillStyle = '#ccccee';
    ctx.font = `bold ${Math.round(barH * 0.9)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(safeLevel * 100)}%`, barX + barW - 2, y + h / 2);
    ctx.restore();
  },

  warningFlash(ctx, x, y, t) {
    const visible = Math.sin(t * 8) > 0;
    if (!visible) return;
    ctx.save();
    ctx.fillStyle = '#ff3300';
    ctx.shadowColor = '#ff3300';
    ctx.shadowBlur = 16;
    ctx.font = 'bold 13px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOW FUEL!', x, y);
    ctx.restore();
  }
};

// ============================================================
// NITRO_HUD
// ============================================================
const NITRO_HUD = {
  drawNitroMeter(ctx, x, y, w, h, level, active, t = 0) {
    const safeLevel = Math.max(0, Math.min(1, level));
    ctx.save();
    const bg = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(0,20,40,0.9)', 1, 'rgba(0,5,20,0.9)']);
    ctx.fillStyle = bg;
    ctx.strokeStyle = active ? '#00aaff' : '#003355';
    ctx.lineWidth = active ? 2.5 : 1.5;
    if (active) { ctx.shadowColor = '#00aaff'; ctx.shadowBlur = 14; }
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 7);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Segmentler
    const segments = 10;
    const segW = (w - 8) / segments - 2;
    const segH = h - 8;
    const segY = y + 4;
    for (let i = 0; i < segments; i++) {
      const segX = x + 4 + i * (segW + 2);
      const filled = i < safeLevel * segments;
      if (filled) {
        const pct = i / segments;
        const r = Math.floor(0 + pct * 100);
        const g = Math.floor(180 - pct * 60);
        const b = 255;
        ctx.fillStyle = active ? `rgba(${r},${g},${b},${0.7 + 0.3 * Math.sin(t * 12 + i)})` : `rgb(${r},${g},${b})`;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = active ? 8 : 0;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.roundRect(segX, segY, segW, segH, 3);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // "NITRO" etiketi
    ctx.fillStyle = active ? '#00ddff' : '#336688';
    ctx.font = `bold ${Math.round(h * 0.38)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('NITRO', x + w / 2, y + h - 2);
    ctx.restore();
  },

  drawNitroFlame(ctx, x, y, t) {
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + t * 5;
      const dist = 6 + Math.sin(t * 12 + i) * 4;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist * 0.5;
      const size = 5 + Math.sin(t * 8 + i * 0.8) * 3;
      const grad = GradyanDeposu.rad(ctx, px, py, 0, px, py, size * 2, [0, '#ffffff', 0.3, '#44aaff', 1, 'rgba(0,80,200,0)']);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// ============================================================
// MINIMAP_ADVANCED
// ============================================================
const MINIMAP_ADVANCED = {
  drawMinimap(ctx, x, y, w, h, vehicle, terrain, camera) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,15,0.85)';
    ctx.strokeStyle = '#334466';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.clip();

    if (terrain) this.drawMinimapTerrain(ctx, { x, y, w, h }, terrain, vehicle);
    if (vehicle) this.drawMinimapVehicle(ctx, x + w * 0.5, y + h * 0.5, vehicle.angle || 0, '#00ff88');

    ctx.restore();
  },

  drawMinimapVehicle(ctx, mx, my, angle, color = '#00ff88') {
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  drawMinimapTerrain(ctx, minimap, terrain, vehicle) {
    if (!terrain || !terrain.points || terrain.points.length < 2) return;
    const points = terrain.points;
    const vx = vehicle ? (vehicle.x || 0) : 0;
    const vy = vehicle ? (vehicle.y || 0) : 0;
    const viewRange = 1200;
    const scaleX = minimap.w / viewRange;
    const offsetX = minimap.x + minimap.w * 0.5;
    // 🔴 BUGFIX(30 Tmz) — İKİ AYRI HATA, ikisi de ölçüldü:
    //   Eski satır:  py = minimap.y + minimap.h * 0.7 - (pt.y || 0) * 0.04
    //   1) DİKEY REFERANS YOKTU. `pt.y` MUTLAK dünya yüksekliğidir; araca göre
    //      normalize edilmediği için zemini y≈0 olmayan her haritada çizgi
    //      kutunun tamamen dışına kaçıyor (kutu 60 px, tek başına pt.y*0.04
    //      bile 500 px'lik zeminde 20 px kayma demek; 1500 px'lik vadide çizgi
    //      kutunun ÜSTÜNE çıkıyordu).
    //   2) İŞARET TERSTİ. Canvas'ta y AŞAĞI büyür; ÇIKARMA yapınca alçak zemin
    //      (büyük y) yukarı, tepe (küçük y) aşağı düşüyordu → mini haritada
    //      tepeler ÇUKUR görünüyordu.
    const scaleY = minimap.h / 900;              // ±450 px dünya yüksekliği kutuya sığar
    const baseY  = minimap.y + minimap.h * 0.5;  // araç işaretiyle AYNI hat (drawMinimap h*0.5 kullanır)
    const altSinir = minimap.y + minimap.h + 4, ustSinir = minimap.y - 4;
    // ⚠ PERF: eski döngü TÜM noktaları (haritaya göre 5.000-10.000) her karede
    //   geziyor, sonra `continue` ile %98'ini atıyordu. `segmentSize` varsa
    //   pencere indeksten hesaplanır (nokta x'i i·segmentSize ile artar).
    //   Doğruluk yine aşağıdaki mutlak-mesafe süzgecinde; pencere sadece sınır.
    const seg = (typeof terrain.segmentSize === 'number' && terrain.segmentSize > 0)
                  ? terrain.segmentSize : 0;
    let i0 = 0, i1 = points.length - 1;
    if (seg > 0) {
      const yari = viewRange / 2 + 50;
      i0 = Math.max(0, Math.floor((vx - yari) / seg) - 2);
      i1 = Math.min(points.length - 1, Math.ceil((vx + yari) / seg) + 2);
    }

    ctx.beginPath();
    let started = false;
    for (let i = i0; i <= i1; i++) {
      const pt = points[i];
      if (!pt) continue;
      const dx = pt.x - vx;
      if (Math.abs(dx) > viewRange / 2 + 50) continue;
      const px = offsetX + dx * scaleX;
      let py = baseY + ((pt.y || 0) - vy) * scaleY;
      if (py < ustSinir) py = ustSinir; else if (py > altSinir) py = altSinir;
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    if (started) {
      ctx.strokeStyle = '#226644';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};

// ============================================================
// RACE_HUD
// ============================================================
const RACE_HUD = {
  drawRaceTimer(ctx, x, y, elapsed, best) {
    const fmt = (ms) => {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const cs = Math.floor((ms % 1000) / 10);
      return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    };
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 22, 160, 50, 8);
    ctx.fill();
    ctx.shadowColor = '#00aaff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00ddff';
    ctx.font = 'bold 24px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    // 🔴 BUGFIX(30 Tmz): `textBaseline` HİÇ ayarlanmıyordu → çağıranın bıraktığı
    //   değeri miras alıyordu. HUD.draw metni 'middle'/'bottom' ile bırakıyor,
    //   oysa kutu (y-22, h=50) alfabetik taban varsayımıyla çizilmiş → yazı
    //   kutudan taşıyordu. Modül kendi metin durumunu kendi kurmalı.
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(fmt(elapsed), x, y);
    ctx.shadowBlur = 0;
    if (best !== null && best !== undefined) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = '13px ui-monospace, Consolas, monospace';
      ctx.fillText('BEST ' + fmt(best), x, y + 20);
    }
    ctx.restore();
  },

  // ⚠ `opt` (30 Tmz, EK — geriye dönük uyumlu): { pxPerM, zoom }
  //   pxPerM = dünya pikseli başına metre bölücü (bu oyunda 2 → game.js:631
  //   mesafeyi `(v.x - startX) / 2` ile hesaplıyor)
  //   zoom   = kamera yakınlaştırması (dünya px → ekran px)
  drawCheckpointIndicator(ctx, x, y, nextX, vehicleX, W, opt) {
    ctx.save();
    const o = opt || {};
    // 🔴 BUGFIX(30 Tmz): `dx` DÜNYA pikselidir.
    //   1) `Math.abs(dx) < W * 0.4` dünya pikselini EKRAN pikseliyle
    //      kıyaslıyordu; kamera zoom'u 1 değilse (Camera.zoom = width/750,
    //      yani 1280 px ekranda 1,7) ok yanlış anda görünüp kayboluyordu.
    //   2) `dist = Math.abs(dx)` dünya pikselini 'm' etiketiyle basıyordu →
    //      gerçek 500 m "1000m" olarak yazılıyordu (tam 2 KAT hata).
    const pxPerM = (typeof o.pxPerM === 'number' && o.pxPerM > 0) ? o.pxPerM : 2;
    const zoom   = (typeof o.zoom   === 'number' && o.zoom   > 0) ? o.zoom   : 1;
    const dx = nextX - vehicleX;
    const onScreen = Math.abs(dx) * zoom < W * 0.4;
    if (!onScreen) {
      const arrowX = dx > 0 ? W - 60 : 60;
      ctx.fillStyle = '#ffdd00';
      ctx.font = 'bold 26px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(dx > 0 ? '▶' : '◀', arrowX, y);
      const dist = Math.round(Math.abs(dx) / pxPerM);
      ctx.font = '12px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText(dist + 'm', arrowX, y + 20);
    } else {
      ctx.fillStyle = 'rgba(255,220,0,0.7)';
      ctx.font = 'bold 16px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('CHECKPOINT ▼', x, y);
    }
    ctx.restore();
  },

  // ⚠ `label` (30 Tmz, EK — varsayılan 'LAP'): oyunda tur kavramı yok, ama
  //   checkpoint sayacı aynı kutuya birebir oturuyor. Etiket sabit 'LAP'
  //   yazılmış olduğu için fonksiyon fiilen çağrılamıyordu.
  drawLapCounter(ctx, x, y, current, total, label) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 20, 100, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';   // BUGFIX(30 Tmz): bkz. drawRaceTimer
    ctx.fillText(`${label || 'LAP'} ${current}/${total}`, x, y);
    ctx.restore();
  },

  drawBotPosition(ctx, x, y, myDist, botDist) {
    ctx.save();
    const diff = myDist - botDist;
    const ahead = diff >= 0;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 18, 140, 30, 7);
    ctx.fill();
    ctx.fillStyle = ahead ? '#00ff88' : '#ff4444';
    ctx.font = 'bold 15px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';   // BUGFIX(30 Tmz): bkz. drawRaceTimer
    const sign = ahead ? '+' : '';
    ctx.fillText(`BOT: ${sign}${Math.round(diff)}m`, x, y);
    ctx.restore();
  }
};

// ============================================================
// DAMAGE_HUD
// ============================================================
const DAMAGE_HUD = {
  drawDamageIndicator(ctx, W, H, damageLevel) {
    // damageLevel: 0 = sağlam, 1 = tam hasar
    if (damageLevel <= 0) return;
    ctx.save();
    const alpha = Math.min(0.72, damageLevel * 0.72);
    const grad = GradyanDeposu.rad(ctx, W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8, [0, `rgba(200,0,0,0)`, 1, `rgba(200,0,0,${alpha})`]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawCrashWarning(ctx, W, H, t) {
    const blink = Math.sin(t * 14) > 0;
    if (!blink) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ff2200';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, W - 8, H - 8);
    ctx.fillStyle = '#ff2200';
    // 🔴 BUGFIX(30 Tmz): font YALNIZ W'ye bağlıydı. Geniş-alçak ekranda
    //   (1280×390 yatay telefon) 58 px'e çıkıp H*0.07 = 27 px'lik şeride
    //   sığmıyordu — 29 Tmz'de 30 metinde ölçülen taşma sınıfının aynısı.
    //   Kural: font = min(W tabanlı, H tabanlı) + fillText maxWidth.
    ctx.font = `bold ${Math.round(Math.min(W * 0.045, H * 0.085))}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillText('⚠ CRASH ⚠', W / 2, H * 0.07, W * 0.8);
    ctx.restore();
  }
};

// ============================================================
// ACHIEVEMENT_POP
// ============================================================
const ACHIEVEMENT_POP = (function () {
  const queue = [];
  let current = null;
  let displayTimer = 0;
  const SHOW_DURATION = 3.5;

  return {
    queueAchievement(name, icon, coins) {
      queue.push({ name, icon: icon || '🏆', coins: coins || 0 });
    },

    drawAchievementPop(ctx, W, H, dt) {
      if (!current && queue.length > 0) {
        current = queue.shift();
        displayTimer = 0;
      }
      if (!current) return;
      displayTimer += dt;
      if (displayTimer > SHOW_DURATION) { current = null; return; }

      const slideT = Math.min(1, displayTimer / 0.4);
      const fadeT = Math.max(0, 1 - Math.max(0, displayTimer - (SHOW_DURATION - 0.5)) / 0.5);
      const panelW = 320; const panelH = 72;
      const panelX = W / 2 - panelW / 2;
      const panelY = -panelH + slideT * (panelH + 16);

      ctx.save();
      ctx.globalAlpha = fadeT;
      const bgGrad = GradyanDeposu.lin(ctx, panelX, panelY, panelX + panelW, panelY, [0, 'rgba(20,20,40,0.96)', 1, 'rgba(40,20,60,0.96)']);
      ctx.fillStyle = bgGrad;
      ctx.shadowColor = '#aa44ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelW, panelH, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#7722cc';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = `${Math.round(panelH * 0.5)}px system-ui, "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(current.icon, panelX + 14, panelY + panelH * 0.48);

      ctx.fillStyle = '#ffdd88';
      ctx.font = 'bold 13px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('ACHIEVEMENT UNLOCKED', panelX + 66, panelY + panelH * 0.28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 17px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText(current.name, panelX + 66, panelY + panelH * 0.6);

      if (current.coins > 0) {
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 14px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`+${current.coins} 🪙`, panelX + panelW - 14, panelY + panelH * 0.6);
      }
      ctx.restore();
    }
  };
})();

// ============================================================
// COMBO_DISPLAY
// ============================================================
const COMBO_DISPLAY = {
  drawComboMeter(ctx, x, y, combo, maxCombo, t) {
    if (combo <= 0) return;
    // 🔴 BUGFIX(30 Tmz): `maxCombo` tanımsız/0 gelirse `combo / maxCombo`
    //   NaN/Infinity üretiyor, `roundRect(..., w*NaN, ...)` sessizce HİÇBİR
    //   ŞEY çizmiyordu (çubuk kayboluyor, hata da düşmüyor).
    if (!(maxCombo > 0)) maxCombo = Math.max(4, combo);
    const w = 160; const h = 22;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    const ratio = Math.min(1, combo / maxCombo);
    const cGrad = GradyanDeposu.lin(ctx, x, y, x + w * ratio, y, [0, '#ffaa00', 1, '#ff4400']);
    ctx.fillStyle = cGrad;
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = combo > maxCombo * 0.8 ? 12 : 0;
    ctx.beginPath();
    ctx.roundRect(x, y, w * ratio, h, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`COMBO x${combo}`, x + 6, y + h / 2);
    ctx.restore();
  },

  drawComboText(ctx, W, H, combo, t) {
    if (combo < 2) return;
    const scale = 1 + 0.12 * Math.sin(t * 10);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(W / 2, H * 0.38);
    ctx.scale(scale, scale);
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffdd00';
    // 🔴 BUGFIX(30 Tmz): font MUTLAK px idi ve maxWidth yoktu. 390 px geniş
    //   dikey telefonda combo 10'da 68 px font → "x10 COMBO!" ≈ 340 px, üstüne
    //   `ctx.scale(1.12)` binince ekrandan taşıyordu. Font artık W'ye de bağlı,
    //   maxWidth ölçekle BÖLÜNÜR (transform içindeyiz — bölmezsen kelepçe gevşer).
    const fs = Math.min(72, W * 0.11, 28 + combo * 4);
    ctx.font = `bold ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(`x${combo} COMBO!`, 0, 0, (W * 0.78) / scale);
    ctx.restore();
  }
};

// ============================================================
// DISTANCE_DISPLAY
// ============================================================
const DISTANCE_DISPLAY = {
  _shownDist: 0,

  drawDistanceMeter(ctx, x, y, distance) {
    this._shownDist += (distance - this._shownDist) * 0.12;
    const d = Math.round(this._shownDist);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 22, 160, 34, 8);
    ctx.fill();
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 22px ui-monospace, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${d} m`, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawPersonalBest(ctx, x, y, current, best) {
    const isNew = current > best;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 18, 180, 28, 7);
    ctx.fill();
    ctx.fillStyle = isNew ? '#00ff88' : '#aaaacc';
    ctx.font = `bold 14px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const label = isNew ? `NEW BEST: ${Math.round(current)}m ★` : `BEST: ${Math.round(best)}m`;
    ctx.fillText(label, x, y);
    ctx.restore();
  }
};


// =============================================================================
// HUD_EXTENDED_ELEMENTS MODULE
// =============================================================================
(function() {
    'use strict';

    var HUD_EXTENDED_ELEMENTS = (function() {

        var elementStates = {
            minimap: { visible: true, playerX: 0, playerY: 0, scale: 1.0, rotation: 0 },
            altitudeMeter: { visible: true, currentAlt: 0, maxAlt: 0, minAlt: 0 },
            gForceMeter: { visible: true, lateral: 0, vertical: 0, maxLateral: 0, maxVertical: 0 },
            trickScore: { visible: true, currentScore: 0, comboMultiplier: 1, displayScore: 0 },
            airTimer: { visible: true, active: false, startTime: 0, elapsed: 0 },
            streakCounter: { visible: true, current: 0, best: 0 },
            wheelContact: { visible: true, fl: false, fr: false, rl: false, rr: false },
            suspensionBars: { visible: true, fl: 1.0, fr: 1.0, rl: 1.0, rr: 1.0 },
            engineTemp: { visible: true, temp: 90, maxTemp: 140, overheating: false, critical: false },
            tireWear: { visible: true, fl: 100, fr: 100, rl: 100, rr: 100 },
            windIndicator: { visible: true, direction: 0, speed: 0 },
            damageReadout: { visible: true, components: {} },
            nearMiss: { visible: true, active: false, flashTimer: 0 },
            checkpointDistance: { visible: true, distanceM: 0, checkpointId: null }
        };

        var minimapConfig = {
            width: 150,
            height: 100,
            scale: 0.01,
            borderColor: '#fff',
            playerColor: '#ff0',
            terrainColor: '#444',
            checkpointColor: '#0f0',
            enemyColor: '#f00'
        };

        function updateMinimap(playerWorldX, playerWorldY, rotation) {
            elementStates.minimap.playerX = playerWorldX;
            elementStates.minimap.playerY = playerWorldY;
            elementStates.minimap.rotation = rotation;
        }

        function updateAltitude(worldY, groundY) {
            var alt = worldY - groundY;
            elementStates.altitudeMeter.currentAlt = alt;
            if (alt > elementStates.altitudeMeter.maxAlt) elementStates.altitudeMeter.maxAlt = alt;
            if (alt < elementStates.altitudeMeter.minAlt) elementStates.altitudeMeter.minAlt = alt;
        }

        function updateGForce(lateralG, verticalG) {
            elementStates.gForceMeter.lateral = lateralG;
            elementStates.gForceMeter.vertical = verticalG;
            if (Math.abs(lateralG) > Math.abs(elementStates.gForceMeter.maxLateral)) {
                elementStates.gForceMeter.maxLateral = lateralG;
            }
            if (Math.abs(verticalG) > Math.abs(elementStates.gForceMeter.maxVertical)) {
                elementStates.gForceMeter.maxVertical = verticalG;
            }
        }

        function addTrickScore(points, multiplierIncrease) {
            elementStates.trickScore.comboMultiplier += (multiplierIncrease || 0);
            var earned = points * elementStates.trickScore.comboMultiplier;
            elementStates.trickScore.currentScore += earned;
            return earned;
        }

        function resetTrickCombo() {
            elementStates.trickScore.comboMultiplier = 1;
            return elementStates.trickScore.currentScore;
        }

        function startAirTimer() {
            if (!elementStates.airTimer.active) {
                elementStates.airTimer.active = true;
                elementStates.airTimer.startTime = Date.now();
                elementStates.airTimer.elapsed = 0;
            }
        }

        function stopAirTimer() {
            if (elementStates.airTimer.active) {
                elementStates.airTimer.elapsed = Date.now() - elementStates.airTimer.startTime;
                elementStates.airTimer.active = false;
                return elementStates.airTimer.elapsed;
            }
            return 0;
        }

        function tickAirTimer() {
            if (elementStates.airTimer.active) {
                elementStates.airTimer.elapsed = Date.now() - elementStates.airTimer.startTime;
            }
        }

        function updateStreakCounter(landed) {
            if (landed) {
                elementStates.streakCounter.current++;
                if (elementStates.streakCounter.current > elementStates.streakCounter.best) {
                    elementStates.streakCounter.best = elementStates.streakCounter.current;
                }
            } else {
                elementStates.streakCounter.current = 0;
            }
        }

        function updateWheelContact(fl, fr, rl, rr) {
            elementStates.wheelContact.fl = fl;
            elementStates.wheelContact.fr = fr;
            elementStates.wheelContact.rl = rl;
            elementStates.wheelContact.rr = rr;
        }

        function updateSuspension(fl, fr, rl, rr) {
            elementStates.suspensionBars.fl = Math.max(0, Math.min(1, fl));
            elementStates.suspensionBars.fr = Math.max(0, Math.min(1, fr));
            elementStates.suspensionBars.rl = Math.max(0, Math.min(1, rl));
            elementStates.suspensionBars.rr = Math.max(0, Math.min(1, rr));
        }

        function updateEngineTemp(temp) {
            elementStates.engineTemp.temp = temp;
            elementStates.engineTemp.overheating = temp >= 120;
            elementStates.engineTemp.critical = temp >= elementStates.engineTemp.maxTemp;
        }

        function updateTireWear(fl, fr, rl, rr) {
            elementStates.tireWear.fl = Math.max(0, fl);
            elementStates.tireWear.fr = Math.max(0, fr);
            elementStates.tireWear.rl = Math.max(0, rl);
            elementStates.tireWear.rr = Math.max(0, rr);
        }

        function updateWindIndicator(directionDegrees, speedKmh) {
            elementStates.windIndicator.direction = directionDegrees;
            elementStates.windIndicator.speed = speedKmh;
        }

        function updateDamage(componentId, damage) {
            elementStates.damageReadout.components[componentId] = {
                id: componentId,
                damage: Math.min(100, Math.max(0, damage)),
                critical: damage >= 80
            };
        }

        function triggerNearMiss() {
            elementStates.nearMiss.active = true;
            elementStates.nearMiss.flashTimer = 1000;
            setTimeout(function() {
                elementStates.nearMiss.active = false;
                elementStates.nearMiss.flashTimer = 0;
            }, 1000);
        }

        function updateCheckpointDistance(distanceM, checkpointId) {
            elementStates.checkpointDistance.distanceM = distanceM;
            elementStates.checkpointDistance.checkpointId = checkpointId;
        }

        function setElementVisibility(elementId, visible) {
            if (elementStates[elementId]) {
                elementStates[elementId].visible = visible;
                return true;
            }
            return false;
        }

        function getMinimapRenderData(terrainPoints, checkpoints, enemies) {
            var cx = elementStates.minimap.playerX;
            var cy = elementStates.minimap.playerY;
            var sc = minimapConfig.scale;
            function worldToMinimap(wx, wy) {
                return {
                    x: (wx - cx) * sc + minimapConfig.width / 2,
                    y: (wy - cy) * sc + minimapConfig.height / 2
                };
            }
            return {
                playerPos: { x: minimapConfig.width / 2, y: minimapConfig.height / 2 },
                playerRotation: elementStates.minimap.rotation,
                terrain: (terrainPoints || []).map(function(p) { return worldToMinimap(p.x, p.y); }),
                checkpoints: (checkpoints || []).map(function(c) {
                    var mp = worldToMinimap(c.x, c.y);
                    return { x: mp.x, y: mp.y, id: c.id };
                }),
                enemies: (enemies || []).map(function(e) {
                    var mp = worldToMinimap(e.x, e.y);
                    return { x: mp.x, y: mp.y, id: e.id };
                })
            };
        }

        function getAllElementStates() {
            return JSON.parse(JSON.stringify(elementStates));
        }

        return {
            elementStates: elementStates,
            minimapConfig: minimapConfig,
            updateMinimap: updateMinimap,
            updateAltitude: updateAltitude,
            updateGForce: updateGForce,
            addTrickScore: addTrickScore,
            resetTrickCombo: resetTrickCombo,
            startAirTimer: startAirTimer,
            stopAirTimer: stopAirTimer,
            tickAirTimer: tickAirTimer,
            updateStreakCounter: updateStreakCounter,
            updateWheelContact: updateWheelContact,
            updateSuspension: updateSuspension,
            updateEngineTemp: updateEngineTemp,
            updateTireWear: updateTireWear,
            updateWindIndicator: updateWindIndicator,
            updateDamage: updateDamage,
            triggerNearMiss: triggerNearMiss,
            updateCheckpointDistance: updateCheckpointDistance,
            setElementVisibility: setElementVisibility,
            getMinimapRenderData: getMinimapRenderData,
            getAllElementStates: getAllElementStates
        };
    })();

    if (typeof window !== 'undefined') window.HUD_EXTENDED_ELEMENTS = HUD_EXTENDED_ELEMENTS;
    if (typeof module !== 'undefined' && module.exports) module.exports.HUD_EXTENDED_ELEMENTS = HUD_EXTENDED_ELEMENTS;
})();

// =============================================================================
// HUD_ANIMATIONS MODULE
// =============================================================================
(function() {
    'use strict';

    var HUD_ANIMATIONS = (function() {

        var activeAnimations = [];
        var animationIdCounter = 0;

        function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
        function easeIn(t) { return t * t * t; }
        function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

        var EASINGS = { easeOut: easeOut, easeIn: easeIn, easeInOut: easeInOut, linear: function(t) { return t; } };

        function createAnimation(config) {
            var anim = {
                id: ++animationIdCounter,
                type: config.type,
                startTime: Date.now(),
                duration: config.duration || 500,
                from: config.from,
                to: config.to,
                easing: EASINGS[config.easing] || easeOut,
                onUpdate: config.onUpdate || null,
                onComplete: config.onComplete || null,
                loop: config.loop || false,
                data: config.data || {}
            };
            activeAnimations.push(anim);
            return anim.id;
        }

        function updateAnimations() {
            var now = Date.now();
            var completed = [];
            activeAnimations.forEach(function(anim) {
                var elapsed = now - anim.startTime;
                var t = Math.min(1, elapsed / anim.duration);
                var easedT = anim.easing(t);
                if (anim.onUpdate) {
                    anim.onUpdate(easedT, anim);
                }
                if (t >= 1) {
                    if (anim.loop) {
                        anim.startTime = now;
                    } else {
                        completed.push(anim.id);
                        if (anim.onComplete) anim.onComplete(anim);
                    }
                }
            });
            activeAnimations = activeAnimations.filter(function(a) { return completed.indexOf(a.id) === -1; });
        }

        function cancelAnimation(id) {
            activeAnimations = activeAnimations.filter(function(a) { return a.id !== id; });
        }

        var interpValues = {};
        function smoothInterp(key, target, speed) {
            speed = speed || 0.1;
            if (interpValues[key] === undefined) interpValues[key] = target;
            interpValues[key] = lerp(interpValues[key], target, speed);
            return interpValues[key];
        }

        function animateDangerZone(health, maxHealth) {
            var ratio = health / maxHealth;
            if (ratio < 0.25) {
                return {
                    active: true,
                    intensity: 1 - (ratio / 0.25),
                    pulseFreq: 2 + (1 - ratio) * 3,
                    color: ratio < 0.1 ? '#ff0000' : '#ff4400'
                };
            }
            return { active: false, intensity: 0, pulseFreq: 0, color: '#ff0000' };
        }

        function animateCoinMagnet(active, range) {
            return createAnimation({
                type: 'coin_magnet',
                duration: active ? 1000 : 300,
                loop: active,
                from: 0,
                to: range || 100,
                easing: 'easeInOut',
                data: { active: active }
            });
        }

        function animateCheckpointArrow(checkpointWorldX, playerWorldX, playerWorldY, checkpointWorldY) {
            var dx = checkpointWorldX - playerWorldX;
            var dy = checkpointWorldY - playerWorldY;
            var angle = Math.atan2(dy, dx) * (180 / Math.PI);
            var dist = Math.sqrt(dx * dx + dy * dy);
            var visible = dist > 300;
            return { visible: visible, angle: angle, distance: dist };
        }

        function animateCountdown(secondsRemaining, totalSeconds) {
            var critical = secondsRemaining <= 3;
            var ratio = secondsRemaining / totalSeconds;
            return {
                critical: critical,
                scale: critical ? (1 + Math.sin(Date.now() / 150) * 0.15) : 1,
                color: critical ? '#ff0000' : ratio < 0.3 ? '#ffaa00' : '#ffffff',
                pulseActive: critical
            };
        }

        function animateSpeedMilestone(currentSpeed, lastMilestoneSpeed) {
            var milestone = Math.floor(currentSpeed / 10) * 10;
            if (milestone > lastMilestoneSpeed && milestone > 0) {
                return {
                    triggered: true,
                    milestone: milestone,
                    animId: createAnimation({
                        type: 'speed_milestone',
                        duration: 800,
                        from: 1.5,
                        to: 1.0,
                        easing: 'easeOut',
                        data: { speed: milestone }
                    })
                };
            }
            return { triggered: false };
        }

        var activeTrickDisplays = [];
        function showTrickName(trickName, points) {
            var display = {
                id: Date.now(),
                name: trickName,
                points: points,
                state: 'sliding_in',
                progress: 0,
                holdTimer: 0,
                totalHoldTime: 1200
            };
            activeTrickDisplays.push(display);
            return display.id;
        }

        function updateTrickDisplays(dt) {
            activeTrickDisplays = activeTrickDisplays.filter(function(d) {
                if (d.state === 'sliding_in') {
                    d.progress += dt / 300;
                    if (d.progress >= 1) { d.state = 'holding'; d.progress = 1; }
                } else if (d.state === 'holding') {
                    d.holdTimer += dt;
                    if (d.holdTimer >= d.totalHoldTime) { d.state = 'sliding_out'; d.progress = 1; }
                } else if (d.state === 'sliding_out') {
                    d.progress -= dt / 300;
                    if (d.progress <= 0) return false;
                }
                return true;
            });
            return activeTrickDisplays;
        }

        var comboBreakAnimations = [];
        function triggerComboBreak(score) {
            var particles = [];
            for (var i = 0; i < 8; i++) {
                particles.push({
                    angle: (Math.PI * 2 / 8) * i,
                    speed: 50 + Math.random() * 100,
                    life: 1.0,
                    x: 0,
                    y: 0
                });
            }
            comboBreakAnimations.push({ score: score, particles: particles, timer: 0, duration: 600 });
        }

        function animateNewRecord(active) {
            if (!active) return { active: false, intensity: 0 };
            return {
                active: true,
                intensity: (Math.sin(Date.now() / 200) + 1) / 2,
                color: '#ffd700',
                borderWidth: 3 + Math.sin(Date.now() / 150) * 2
            };
        }

        function animateXpBar(currentXp, targetXp, maxXp) {
            var ratio = Math.min(1, currentXp / maxXp);
            var targetRatio = Math.min(1, targetXp / maxXp);
            var leveledUp = targetXp > maxXp;
            return {
                fillRatio: smoothInterp('xpBar', targetRatio, 0.05),
                leveledUp: leveledUp,
                overflow: leveledUp ? (targetXp - maxXp) : 0
            };
        }

        function animateBossHealthBar(current, max) {
            var ratio = current / max;
            return {
                fillRatio: smoothInterp('bossHp', ratio, 0.08),
                critical: ratio < 0.25,
                color: ratio < 0.25 ? '#ff0000' : ratio < 0.5 ? '#ff6600' : '#cc0000',
                shakeIntensity: ratio < 0.25 ? (1 - ratio / 0.25) * 3 : 0
            };
        }

        var tutorialOverlays = [];
        function createTutorialOverlay(config) {
            var overlay = {
                id: 'tut_' + Date.now(),
                targetElement: config.targetElement,
                message: config.message,
                highlightBox: config.highlightBox || { x: 0, y: 0, w: 100, h: 50 },
                arrowDirection: config.arrowDirection || 'up',
                pulseActive: true,
                visible: true,
                pulsePhase: 0
            };
            tutorialOverlays.push(overlay);
            return overlay.id;
        }

        function updateTutorialOverlays(dt) {
            tutorialOverlays.forEach(function(o) {
                o.pulsePhase += dt / 600;
                o.highlightIntensity = (Math.sin(o.pulsePhase * Math.PI * 2) + 1) / 2;
            });
        }

        function dismissTutorialOverlay(id) {
            tutorialOverlays = tutorialOverlays.filter(function(o) { return o.id !== id; });
        }

        var touchControlHud = {
            gasBtnPressed: false,
            brakeBtnPressed: false,
            nitroBtnPressed: false,
            lastHapticEvent: null,
            hapticQueue: []
        };

        function queueHaptic(pattern, intensity) {
            touchControlHud.hapticQueue.push({ pattern: pattern, intensity: intensity, time: Date.now() });
            if (touchControlHud.hapticQueue.length > 10) touchControlHud.hapticQueue.shift();
        }

        return {
            createAnimation: createAnimation,
            updateAnimations: updateAnimations,
            cancelAnimation: cancelAnimation,
            smoothInterp: smoothInterp,
            lerp: lerp,
            animateDangerZone: animateDangerZone,
            animateCoinMagnet: animateCoinMagnet,
            animateCheckpointArrow: animateCheckpointArrow,
            animateCountdown: animateCountdown,
            animateSpeedMilestone: animateSpeedMilestone,
            showTrickName: showTrickName,
            updateTrickDisplays: updateTrickDisplays,
            triggerComboBreak: triggerComboBreak,
            animateNewRecord: animateNewRecord,
            animateXpBar: animateXpBar,
            animateBossHealthBar: animateBossHealthBar,
            createTutorialOverlay: createTutorialOverlay,
            updateTutorialOverlays: updateTutorialOverlays,
            dismissTutorialOverlay: dismissTutorialOverlay,
            touchControlHud: touchControlHud,
            queueHaptic: queueHaptic,
            activeAnimations: activeAnimations,
            tutorialOverlays: tutorialOverlays,
            comboBreakAnimations: comboBreakAnimations,
            activeTrickDisplays: activeTrickDisplays
        };
    })();

    if (typeof window !== 'undefined') window.HUD_ANIMATIONS = HUD_ANIMATIONS;
    if (typeof module !== 'undefined' && module.exports) module.exports.HUD_ANIMATIONS = HUD_ANIMATIONS;
})();

// =============================================================================
// HUD_THEMES MODULE
// =============================================================================
(function() {
    'use strict';

    var HUD_THEMES = (function() {

        var THEMES = [
            {
                id: 'classic',
                name: 'Classic',
                description: 'The original dark HUD style.',
                colors: {
                    background: 'rgba(0,0,0,0.7)',
                    primary: '#ffffff',
                    secondary: '#cccccc',
                    accent: '#ffcc00',
                    health: '#00cc44',
                    healthLow: '#ff2200',
                    speed: '#00aaff',
                    xp: '#aa44ff',
                    border: 'rgba(255,255,255,0.3)',
                    shadow: 'rgba(0,0,0,0.5)'
                },
                fonts: {
                    primary: 'Arial, sans-serif',
                    display: 'Impact, sans-serif',
                    mono: 'Courier New, monospace',
                    primarySize: 14,
                    displaySize: 24
                },
                layoutVariant: 'default',
                elementPositions: {
                    speed: { x: 20, y: 20 },
                    health: { x: 20, y: 60 },
                    coins: { x: 20, y: 100 },
                    minimap: { x: 'right-20', y: 20 }
                }
            },
            {
                id: 'minimal',
                name: 'Minimal',
                description: 'Only the essentials, smaller UI.',
                colors: {
                    background: 'rgba(0,0,0,0.4)',
                    primary: '#eeeeee',
                    secondary: '#aaaaaa',
                    accent: '#ffdd55',
                    health: '#22ee66',
                    healthLow: '#ee2200',
                    speed: '#55aaff',
                    xp: '#cc55ff',
                    border: 'rgba(255,255,255,0.15)',
                    shadow: 'rgba(0,0,0,0.3)'
                },
                fonts: {
                    primary: 'Arial, sans-serif',
                    display: 'Arial, sans-serif',
                    mono: 'Courier New, monospace',
                    primarySize: 11,
                    displaySize: 18
                },
                layoutVariant: 'minimal',
                hiddenElements: ['minimap', 'gForceMeter', 'suspensionBars', 'windIndicator', 'engineTemp']
            },
            {
                id: 'racing',
                name: 'Racing',
                description: 'Bold red and white with speedometer prominence.',
                colors: {
                    background: 'rgba(20,0,0,0.85)',
                    primary: '#ffffff',
                    secondary: '#ffaaaa',
                    accent: '#ff2200',
                    health: '#ff4400',
                    healthLow: '#ff0000',
                    speed: '#ff6600',
                    xp: '#ff9900',
                    border: 'rgba(255,50,0,0.5)',
                    shadow: 'rgba(100,0,0,0.6)'
                },
                fonts: {
                    primary: 'Impact, sans-serif',
                    display: 'Impact, sans-serif',
                    mono: 'Courier New, monospace',
                    primarySize: 16,
                    displaySize: 32
                },
                layoutVariant: 'racing',
                speedometerSize: 'large',
                speedometerPosition: 'center-bottom'
            },
            {
                id: 'retro',
                name: 'Retro',
                description: 'Pixel art style font and icons.',
                colors: {
                    background: 'rgba(0,20,0,0.9)',
                    primary: '#00ff44',
                    secondary: '#00aa33',
                    accent: '#ffff00',
                    health: '#00ff00',
                    healthLow: '#ff4400',
                    speed: '#00ffff',
                    xp: '#ff00ff',
                    border: 'rgba(0,255,0,0.4)',
                    shadow: 'rgba(0,50,0,0.7)'
                },
                fonts: {
                    primary: '"Courier New", monospace',
                    display: '"Courier New", monospace',
                    mono: '"Courier New", monospace',
                    primarySize: 13,
                    displaySize: 20
                },
                layoutVariant: 'retro',
                pixelated: true,
                scanlines: true
            },
            {
                id: 'neon',
                name: 'Neon',
                description: 'Glowing cyan and magenta on dark background.',
                colors: {
                    background: 'rgba(5,0,15,0.9)',
                    primary: '#00ffff',
                    secondary: '#ff00ff',
                    accent: '#ffff00',
                    health: '#00ff88',
                    healthLow: '#ff0088',
                    speed: '#00ccff',
                    xp: '#cc00ff',
                    border: 'rgba(0,255,255,0.6)',
                    shadow: 'rgba(255,0,255,0.3)'
                },
                fonts: {
                    primary: 'Arial, sans-serif',
                    display: 'Impact, sans-serif',
                    mono: 'Courier New, monospace',
                    primarySize: 14,
                    displaySize: 26
                },
                layoutVariant: 'neon',
                glowEffect: true,
                glowColor: '#00ffff',
                glowRadius: 8
            },
            {
                id: 'gold',
                name: 'Gold',
                description: 'Premium gold and black aesthetic.',
                colors: {
                    background: 'rgba(10,8,0,0.92)',
                    primary: '#ffd700',
                    secondary: '#daa520',
                    accent: '#fff8dc',
                    health: '#ffd700',
                    healthLow: '#ff6600',
                    speed: '#ffec8b',
                    xp: '#ffa500',
                    border: 'rgba(255,215,0,0.5)',
                    shadow: 'rgba(100,70,0,0.6)'
                },
                fonts: {
                    primary: '"Georgia", serif',
                    display: '"Georgia", serif',
                    mono: 'Courier New, monospace',
                    primarySize: 14,
                    displaySize: 24
                },
                layoutVariant: 'gold',
                ornamental: true
            },
            {
                id: 'forest',
                name: 'Forest',
                description: 'Green organic theme inspired by nature.',
                colors: {
                    background: 'rgba(5,20,5,0.88)',
                    primary: '#88dd44',
                    secondary: '#66aa33',
                    accent: '#ccff66',
                    health: '#44cc22',
                    healthLow: '#cc6600',
                    speed: '#88ffaa',
                    xp: '#aadd00',
                    border: 'rgba(100,200,50,0.4)',
                    shadow: 'rgba(0,30,0,0.6)'
                },
                fonts: {
                    primary: 'Arial, sans-serif',
                    display: '"Trebuchet MS", sans-serif',
                    mono: 'Courier New, monospace',
                    primarySize: 14,
                    displaySize: 24
                },
                layoutVariant: 'forest',
                leafDecoration: true
            },
            {
                id: 'space',
                name: 'Space',
                description: 'Dark with glowing elements, space-age aesthetic.',
                colors: {
                    background: 'rgba(0,0,10,0.95)',
                    primary: '#8888ff',
                    secondary: '#4444aa',
                    accent: '#ffffff',
                    health: '#4488ff',
                    healthLow: '#ff2244',
                    speed: '#22ccff',
                    xp: '#aa44ff',
                    border: 'rgba(100,100,255,0.4)',
                    shadow: 'rgba(0,0,50,0.7)'
                },
                fonts: {
                    primary: 'Arial, sans-serif',
                    display: '"Trebuchet MS", sans-serif',
                    mono: 'Courier New, monospace',
                    primarySize: 13,
                    displaySize: 22
                },
                layoutVariant: 'space',
                starfieldBackground: true,
                glowEffect: true,
                glowColor: '#4488ff',
                glowRadius: 12
            }
        ];

        var activeThemeId = 'classic';
        var perElementOverrides = {};

        function getTheme(themeId) {
            return THEMES.find(function(t) { return t.id === themeId; }) || THEMES[0];
        }

        function setTheme(themeId) {
            var theme = getTheme(themeId);
            if (!theme) return false;
            activeThemeId = themeId;
            return true;
        }

        function getActiveTheme() {
            return getTheme(activeThemeId);
        }

        function setElementColorOverride(elementId, colorKey, colorValue) {
            if (!perElementOverrides[elementId]) perElementOverrides[elementId] = {};
            perElementOverrides[elementId][colorKey] = colorValue;
        }

        function clearElementOverride(elementId) {
            delete perElementOverrides[elementId];
        }

        function getElementColor(elementId, colorKey) {
            if (perElementOverrides[elementId] && perElementOverrides[elementId][colorKey]) {
                return perElementOverrides[elementId][colorKey];
            }
            var theme = getActiveTheme();
            return (theme.colors && theme.colors[colorKey]) || '#ffffff';
        }

        function applyThemeToCanvas(ctx, themeId) {
            var theme = getTheme(themeId || activeThemeId);
            return {
                backgroundColor: theme.colors.background,
                textColor: theme.colors.primary,
                accentColor: theme.colors.accent,
                font: theme.fonts.primarySize + 'px ' + theme.fonts.primary,
                displayFont: theme.fonts.displaySize + 'px ' + theme.fonts.display,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow,
                extras: {
                    glowEffect: theme.glowEffect || false,
                    glowColor: theme.glowColor || 'transparent',
                    glowRadius: theme.glowRadius || 0,
                    pixelated: theme.pixelated || false,
                    scanlines: theme.scanlines || false
                }
            };
        }

        function generateThemeCSS(themeId) {
            var theme = getTheme(themeId || activeThemeId);
            var c = theme.colors;
            return [
                ':root {',
                '  --hud-bg: ' + c.background + ';',
                '  --hud-primary: ' + c.primary + ';',
                '  --hud-secondary: ' + c.secondary + ';',
                '  --hud-accent: ' + c.accent + ';',
                '  --hud-health: ' + c.health + ';',
                '  --hud-health-low: ' + c.healthLow + ';',
                '  --hud-speed: ' + c.speed + ';',
                '  --hud-xp: ' + c.xp + ';',
                '  --hud-border: ' + c.border + ';',
                '  --hud-shadow: ' + c.shadow + ';',
                '}'
            ].join('\n');
        }

        function previewTheme(themeId, previewContainer) {
            var theme = getTheme(themeId);
            return {
                name: theme.name,
                description: theme.description,
                colors: theme.colors,
                cssVars: generateThemeCSS(themeId)
            };
        }

        function listThemes() {
            return THEMES.map(function(t) {
                return { id: t.id, name: t.name, description: t.description };
            });
        }

        return {
            THEMES: THEMES,
            getTheme: getTheme,
            setTheme: setTheme,
            getActiveTheme: getActiveTheme,
            setElementColorOverride: setElementColorOverride,
            clearElementOverride: clearElementOverride,
            getElementColor: getElementColor,
            applyThemeToCanvas: applyThemeToCanvas,
            generateThemeCSS: generateThemeCSS,
            previewTheme: previewTheme,
            listThemes: listThemes,
            activeThemeId: activeThemeId,
            perElementOverrides: perElementOverrides
        };
    })();

    if (typeof window !== 'undefined') window.HUD_THEMES = HUD_THEMES;
    if (typeof module !== 'undefined' && module.exports) module.exports.HUD_THEMES = HUD_THEMES;
})();


// ================================================================
// HUD_MINIMAP — Real-time minimap renderer
// ================================================================
const HUD_MINIMAP = (() => {
  const W=120, H=60;
  let _canvas=null, _ctx=null;

  function init() {
    _canvas = document.createElement('canvas');
    _canvas.width=W; _canvas.height=H;
    _canvas.style.cssText='position:fixed;bottom:80px;right:16px;border-radius:8px;border:1px solid rgba(255,215,0,0.3);opacity:0.85;z-index:500;';
    _ctx = _canvas.getContext('2d');
    document.body.appendChild(_canvas);
    return _canvas;
  }

  function render(terrainPoints, vehicleX, vehicleY, totalLen, cameraX) {
    if (!_ctx) return;
    const c=_ctx;
    c.clearRect(0,0,W,H);
    c.fillStyle='rgba(0,0,0,0.7)'; c.fillRect(0,0,W,H);
    if (!terrainPoints || !terrainPoints.length) return;
    const scaleX = W / Math.max(totalLen||1000, 1);
    const minY=Math.min(...terrainPoints.map(p=>p.y));
    const maxY=Math.max(...terrainPoints.map(p=>p.y));
    const rangeY=Math.max(maxY-minY,1);
    // Draw terrain line
    c.beginPath(); c.strokeStyle='rgba(100,200,100,0.8)'; c.lineWidth=1.5;
    terrainPoints.forEach((p,i) => {
      const px=p.x*scaleX, py=H-((p.y-minY)/rangeY)*(H-8)-4;
      i===0 ? c.moveTo(px,py) : c.lineTo(px,py);
    });
    c.stroke();
    // Vehicle dot
    const vx=vehicleX*scaleX, vy=H-((vehicleY-minY)/rangeY)*(H-8)-4;
    c.beginPath(); c.arc(vx,Math.max(4,Math.min(H-4,vy)),4,0,Math.PI*2);
    c.fillStyle='#FFD700'; c.fill();
    // Camera viewport indicator
    const cvx=(cameraX||0)*scaleX;
    c.strokeStyle='rgba(255,255,255,0.2)'; c.lineWidth=1;
    c.strokeRect(cvx,0,60*scaleX,H);
  }

  function show() { if (_canvas) _canvas.style.display='block'; }
  function hide() { if (_canvas) _canvas.style.display='none'; }
  function destroy() { if (_canvas && _canvas.parentNode) _canvas.parentNode.removeChild(_canvas); _canvas=_ctx=null; }

  return { init, render, show, hide, destroy };
})();

// ================================================================
// HUD_SPEED_GAUGE — Analog speedometer widget
// ================================================================
const HUD_SPEED_GAUGE = (() => {
  let _canvas=null, _ctx=null;
  const SIZE=80;

  function init() {
    _canvas=document.createElement('canvas');
    _canvas.width=SIZE; _canvas.height=SIZE;
    _canvas.style.cssText='position:fixed;bottom:20px;right:145px;opacity:0.9;z-index:500;';
    _ctx=_canvas.getContext('2d');
    document.body.appendChild(_canvas);
    return _canvas;
  }

  function render(speedKmh, maxSpeed) {
    if (!_ctx) return;
    const c=_ctx, cx=SIZE/2, cy=SIZE/2, r=SIZE/2-6;
    const max=maxSpeed||200;
    const pct=Math.min(1, speedKmh/max);
    c.clearRect(0,0,SIZE,SIZE);
    // Background arc
    c.beginPath(); c.arc(cx,cy,r, Math.PI*0.75, Math.PI*2.25);
    c.strokeStyle='rgba(255,255,255,0.1)'; c.lineWidth=6; c.lineCap='round'; c.stroke();
    // Speed arc
    const endA = Math.PI*0.75 + pct*(Math.PI*1.5);
    const color = pct<0.6?'#00FF7F':pct<0.85?'#FFD700':'#FF4444';
    c.beginPath(); c.arc(cx,cy,r, Math.PI*0.75, endA);
    c.strokeStyle=color; c.lineWidth=6; c.lineCap='round'; c.stroke();
    // Speed text
    c.fillStyle='#fff'; c.font=`bold ${speedKmh>=100?14:16}px ui-monospace, Consolas, monospace`;
    c.textAlign='center'; c.textBaseline='middle';
    c.fillText(Math.floor(speedKmh), cx, cy-4);
    c.font='9px system-ui, "Segoe UI", Arial, sans-serif'; c.fillStyle='rgba(255,255,255,0.6)';
    c.fillText('km/h', cx, cy+10);
  }

  function show() { if (_canvas) _canvas.style.display='block'; }
  function hide() { if (_canvas) _canvas.style.display='none'; }
  function destroy() { if (_canvas && _canvas.parentNode) _canvas.parentNode.removeChild(_canvas); _canvas=_ctx=null; }

  return { init, render, show, hide, destroy };
})();


// ================================================================
// HUD_ACHIEVEMENT_POP — Achievement popup renderer on HUD
// ================================================================
const HUD_ACHIEVEMENT_POP = (() => {
  const _queue = [];
  let   _current = null;
  let   _timer   = 0;
  const DISPLAY_MS = 3500;
  const ANIM_IN_MS = 400;
  const ANIM_OUT_MS= 300;

  function push(achievement) {
    _queue.push({ ...achievement, addedAt: Date.now() });
  }

  function update(dt) {
    if (_current) {
      _timer -= dt * 1000;
      if (_timer <= 0) { _current = null; _timer = 0; }
    }
    if (!_current && _queue.length > 0) {
      _current = _queue.shift();
      _timer   = DISPLAY_MS;
    }
  }

  function draw(ctx, canvasWidth, canvasHeight) {
    if (!_current) return;
    const progress = _timer / DISPLAY_MS;
    let   alpha    = 1;
    let   offsetY  = 0;

    // Slide in
    if (progress > 1 - ANIM_IN_MS/DISPLAY_MS) {
      const t = (progress - (1 - ANIM_IN_MS/DISPLAY_MS)) / (ANIM_IN_MS/DISPLAY_MS);
      offsetY = -(1-t) * 60;
      alpha   = t;
    }
    // Slide out
    if (progress < ANIM_OUT_MS/DISPLAY_MS) {
      const t = progress / (ANIM_OUT_MS/DISPLAY_MS);
      offsetY = (1-t) * 40;
      alpha   = t;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const w = 280, h = 64;
    const x = canvasWidth  - w - 16;
    const y = 80 + offsetY;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = 12;

    // BG
    const grad = ctx.createLinearGradient(x,y,x+w,y+h);
    const rarityColor = { common:'#aaaaaa', rare:'#4488ff', epic:'#aa44ff', legendary:'#ffaa00', secret:'#00ff88' }[_current.rarity||'common'] || '#aaaaaa';
    grad.addColorStop(0, 'rgba(10,10,20,0.95)');
    grad.addColorStop(1, 'rgba(20,15,30,0.95)');
    ctx.fillStyle   = grad;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,8);
    ctx.fill();

    // Border
    ctx.strokeStyle = rarityColor;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = rarityColor;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,8);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Icon
    ctx.fillStyle = rarityColor;
    ctx.font      = '28px serif';
    ctx.fillText(_current.icon || '🏆', x+12, y+44);

    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font      = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillText('ACHIEVEMENT UNLOCKED', x+52, y+18);

    // Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font      = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(_current.name || 'Unknown', x+52, y+35);

    // Description
    ctx.fillStyle = 'rgba(200,200,220,0.8)';
    ctx.font      = '10px "Segoe UI", sans-serif';
    const desc = (_current.description||'').substring(0,38);
    ctx.fillText(desc, x+52, y+52);

    // XP badge
    if (_current.xp) {
      ctx.fillStyle = 'rgba(255,215,0,0.15)';
      ctx.beginPath();
      ctx.roundRect(x+w-56, y+16, 50, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.font      = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`+${_current.xp} XP`, x+w-31, y+29);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }

  function hasCurrent() { return !!_current; }
  function queueLength() { return _queue.length; }
  function clear() { _queue.length=0; _current=null; _timer=0; }

  return { push, update, draw, hasCurrent, queueLength, clear };
})();

// ================================================================
// HUD_COMBO_DISPLAY — Trick combo streak display
// ================================================================
const HUD_COMBO_DISPLAY = (() => {
  let _comboCount  = 0;
  let _comboScore  = 0;
  let _decayTimer  = 0;
  let _visible     = false;
  let _animTimer   = 0;
  let _lastComboStr= '';
  const DECAY_TIME = 2500; // ms before combo expires
  const ANIM_TIME  = 600;

  function addTrick(trickName, basePoints) {
    _comboCount++;
    _comboScore += basePoints * _comboCount; // multiplier
    _decayTimer  = DECAY_TIME;
    _visible     = true;
    _animTimer   = ANIM_TIME;
    _lastComboStr = trickName;
  }

  function reset() {
    const score  = _comboScore;
    const count  = _comboCount;
    _comboCount  = 0;
    _comboScore  = 0;
    _decayTimer  = 0;
    _visible     = false;
    _animTimer   = 0;
    return { score, count };
  }

  function update(dt) {
    if (_decayTimer > 0) {
      _decayTimer -= dt * 1000;
      if (_decayTimer <= 0) reset();
    }
    if (_animTimer > 0) _animTimer = Math.max(0, _animTimer - dt*1000);
  }

  function draw(ctx, x, y) {
    if (!_visible || _comboCount === 0) return;
    ctx.save();

    // Combo count bounce animation
    const animT = 1 - _animTimer/ANIM_TIME;
    const scale  = 1 + Math.sin(animT * Math.PI) * 0.3;
    const alpha  = Math.min(1, _decayTimer / 500);
    ctx.globalAlpha = alpha;

    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Background
    const grad = ctx.createLinearGradient(-70,-40,70,10);
    grad.addColorStop(0,'rgba(255,100,0,0.9)');
    grad.addColorStop(1,'rgba(255,200,0,0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-70,-40,140,60,8);
    ctx.fill();

    // Trick name
    ctx.fillStyle   = 'rgba(0,0,0,0.6)';
    ctx.font        = 'bold 10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText(_lastComboStr.toUpperCase().substring(0,18), 0, -22);

    // Multiplier
    ctx.fillStyle   = '#FFFFFF';
    ctx.font        = `bold ${28 + _comboCount}px system-ui, "Segoe UI", Arial, sans-serif`;
    if (ctx.font.match(/(\d+)px/)[1] > 36) ctx.font = 'bold 36px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(`x${_comboCount}`, 0, 4);

    // Score
    ctx.fillStyle   = '#FFE55C';
    ctx.font        = 'bold 11px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(`+${_comboScore.toLocaleString()}`, 0, 18);

    ctx.restore();
  }

  function getCombo() { return { count:_comboCount, score:_comboScore }; }
  function isActive() { return _visible && _comboCount > 0; }

  return { addTrick, reset, update, draw, getCombo, isActive };
})();

// ================================================================
// HUD_FUEL_INDICATOR — Animated fuel gauge with warning flash
// ================================================================
const HUD_FUEL_INDICATOR = (() => {
  let _fuel    = 1.0; // 0-1
  let _maxFuel = 1.0;
  let _flashT  = 0;
  let _shake   = 0;
  const WARN_THRESHOLD = 0.2;

  function setFuel(current, max) {
    _fuel    = Math.max(0, Math.min(current, max));
    _maxFuel = max || 1;
  }

  function update(dt) {
    const ratio = _fuel / _maxFuel;
    if (ratio < WARN_THRESHOLD) {
      _flashT = (_flashT + dt * 4) % (2 * Math.PI);
      _shake  = Math.sin(_flashT * 7) * 2;
    } else {
      _flashT = 0;
      _shake  = 0;
    }
  }

  function draw(ctx, x, y, w, h) {
    w = w||120; h = h||24;
    const ratio = _fuel / _maxFuel;
    const isLow = ratio < WARN_THRESHOLD;

    ctx.save();
    ctx.translate(_shake, 0);

    // Background track
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h/2);
    ctx.fill();
    ctx.stroke();

    // Fill
    if (ratio > 0) {
      const fillW = Math.max(h, (w-4) * ratio);
      const grad  = ctx.createLinearGradient(x+2, y, x+2+fillW, y);
      if (isLow) {
        const flash = 0.5 + 0.5 * Math.sin(_flashT * Math.PI);
        grad.addColorStop(0, `rgba(255,${Math.round(40*flash)},0,0.9)`);
        grad.addColorStop(1, `rgba(255,${Math.round(120*flash)},0,0.9)`);
      } else if (ratio > 0.5) {
        grad.addColorStop(0,'#22cc44');
        grad.addColorStop(1,'#88ff88');
      } else {
        grad.addColorStop(0,'#ffaa00');
        grad.addColorStop(1,'#ffdd44');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x+2, y+2, fillW, h-4, (h-4)/2);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font      = `bold ${h*0.5}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(ratio*100)}%`, x+w/2, y+h*0.68);

    // Fuel icon
    ctx.font      = `${h*0.6}px serif`;
    ctx.textAlign = 'left';
    ctx.fillText('⛽', x - h - 4, y + h*0.75);

    if (isLow) {
      ctx.fillStyle = `rgba(255,80,0,${0.6+0.4*Math.sin(_flashT)})`;
      ctx.font      = `bold ${h*0.55}px system-ui, "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('LOW!', x+w-4, y+h*0.7);
    }

    ctx.restore();
  }

  function isLow()   { return _fuel/_maxFuel < WARN_THRESHOLD; }
  function isEmpty() { return _fuel <= 0; }
  function getRatio(){ return _fuel/_maxFuel; }

  return { setFuel, update, draw, isLow, isEmpty, getRatio };
})();

// ================================================================
// HUD_DISTANCE_TRACKER — Distance record and personal best
// ================================================================
const HUD_DISTANCE_TRACKER = (() => {
  let _current   = 0;
  let _best      = 0;
  let _checkpoints = [];
  let _startTime = 0;
  let _newPBTimer= 0;

  function start(savedBest) {
    _current    = 0;
    _best       = savedBest || 0;
    _checkpoints = [];
    _startTime  = Date.now();
    _newPBTimer = 0;
  }

  function update(distance, dt) {
    _current = Math.max(_current, distance);
    if (_newPBTimer > 0) _newPBTimer = Math.max(0, _newPBTimer - dt*1000);
    // Checkpoint every 500m
    const ckCount = Math.floor(_current / 500);
    while (_checkpoints.length < ckCount) {
      _checkpoints.push({ dist:(_checkpoints.length+1)*500, time:Date.now()-_startTime });
    }
    // New PB?
    if (_current > _best) {
      if (_best > 0) _newPBTimer = 2500;
      _best = _current;
    }
  }

  function draw(ctx, x, y) {
    ctx.save();
    // Current distance
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x-4, y-20, 130, 48, 6);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font      = 'bold 14px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(_current)} m`, x+4, y);

    ctx.fillStyle = 'rgba(200,200,220,0.7)';
    ctx.font      = '10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(`Best: ${Math.floor(_best)} m`, x+4, y+16);

    // PB flash
    if (_newPBTimer > 500) {
      const t     = _newPBTimer/2500;
      ctx.globalAlpha = Math.min(1, t*2);
      ctx.fillStyle   = '#FFD700';
      ctx.font        = 'bold 13px system-ui, "Segoe UI", Arial, sans-serif';
      ctx.fillText('🏆 NEW BEST!', x+4, y+30);
    }

    ctx.restore();
  }

  function getCurrent()  { return _current; }
  function getBest()     { return _best; }
  function getElapsedS() { return (Date.now()-_startTime)/1000; }
  function getCheckpoints(){ return [..._checkpoints]; }
  function isNewPB()     { return _newPBTimer > 0; }

  return { start, update, draw, getCurrent, getBest, getElapsedS, getCheckpoints, isNewPB };
})();


// ================================================================
// HUD_RACE_POSITION — Race position display (1st/2nd/3rd etc.)
// ================================================================
const HUD_RACE_POSITION = (() => {
  let _pos = 1, _total = 1, _flash = 0, _prevPos = 1;
  const SUFFIXES = ['st','nd','rd','th','th','th','th','th','th','th'];
  const POS_COLORS = { 1:'#FFD700', 2:'#C0C0C0', 3:'#CD7F32' };

  function setPosition(pos, total) {
    if (pos < _pos) _flash = 800;  // moved up — flash green
    if (pos > _pos) _flash = -800; // moved down — flash red
    _prevPos = _pos;
    _pos = pos;
    _total = total;
  }

  function update(dt) {
    if (_flash > 0) _flash = Math.max(0, _flash - dt*1000);
    if (_flash < 0) _flash = Math.min(0, _flash + dt*1000);
  }

  function draw(ctx, x, y) {
    ctx.save();
    const suffix = SUFFIXES[Math.min(_pos-1, SUFFIXES.length-1)];
    const color  = POS_COLORS[_pos] || '#FFFFFF';
    // Flash color
    let flashAlpha = 0;
    let flashColor = '#00ff44';
    if (_flash > 0)  { flashAlpha = _flash/800; flashColor='#00ff44'; }
    if (_flash < 0)  { flashAlpha = Math.abs(_flash)/800; flashColor='#ff4444'; }

    // BG
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x-4, y-32, 72, 44, 6);
    ctx.fill();

    if (flashAlpha > 0.01) {
      ctx.fillStyle = flashColor.replace(')',`,${(flashAlpha*0.3).toFixed(2)})`).replace('#','rgba(').replace('rgba(','rgba(0,');;
      // simpler approach:
      ctx.globalAlpha = flashAlpha*0.25;
      ctx.fillStyle   = flashColor;
      ctx.beginPath();
      ctx.roundRect(x-4, y-32, 72, 44, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = color;
    ctx.font      = 'bold 28px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${_pos}`, x+2, y);

    ctx.fillStyle = 'rgba(200,200,220,0.9)';
    ctx.font      = 'bold 12px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(suffix, x+24, y);

    ctx.fillStyle = 'rgba(150,150,170,0.7)';
    ctx.font      = '10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.fillText(`of ${_total}`, x+2, y+10);

    ctx.restore();
  }

  function getPosition() { return _pos; }
  function isFirst()     { return _pos === 1; }
  function isLast()      { return _pos === _total; }

  return { setPosition, update, draw, getPosition, isFirst, isLast };
})();

// ================================================================
// HUD_LAP_TIMER — Lap time display with sector splits
// ================================================================
const HUD_LAP_TIMER = (() => {
  let _currentLap  = 1;
  let _maxLaps     = 3;
  let _lapStart    = 0;
  let _lapTimes    = [];
  let _bestLap     = null;
  let _sectorTimes = [];
  let _sectorStart = 0;
  let _numSectors  = 3;
  let _running     = false;

  function start(maxLaps, numSectors) {
    _maxLaps     = maxLaps||3;
    _numSectors  = numSectors||3;
    _currentLap  = 1;
    _lapTimes    = [];
    _sectorTimes = [];
    _lapStart    = Date.now();
    _sectorStart = Date.now();
    _running     = true;
    _bestLap     = null;
  }

  function completeSector(sectorIdx) {
    if (!_running) return null;
    const t = (Date.now()-_sectorStart)/1000;
    _sectorTimes.push({ lap:_currentLap, sector:sectorIdx, time:t });
    _sectorStart = Date.now();
    return { sector:sectorIdx, time:t };
  }

  function completeLap() {
    if (!_running) return null;
    const t = (Date.now()-_lapStart)/1000;
    _lapTimes.push({ lap:_currentLap, time:t });
    if (_bestLap===null || t<_bestLap) _bestLap=t;
    _lapStart = Date.now();
    _sectorStart = Date.now();
    const prevLap = _currentLap;
    _currentLap++;
    if (_currentLap > _maxLaps) { _running=false; return { lap:prevLap, time:t, finished:true }; }
    return { lap:prevLap, time:t, finished:false };
  }

  function stop() { _running=false; }

  function formatTime(s) {
    const m   = Math.floor(s/60);
    const sec = (s%60).toFixed(3);
    return `${m}:${sec.padStart(6,'0')}`;
  }

  function draw(ctx, x, y) {
    if (!_running && !_lapTimes.length) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(x-6, y-22, 140, 80, 6);
    ctx.fill();

    const current = _running ? (Date.now()-_lapStart)/1000 : 0;
    const isBest  = _bestLap !== null && current < _bestLap;

    // Lap indicator
    ctx.fillStyle = '#aaaacc';
    ctx.font      = '10px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LAP ${_currentLap} / ${_maxLaps}`, x, y-6);

    // Current lap time
    ctx.fillStyle = isBest ? '#00ff88' : '#FFFFFF';
    ctx.font      = 'bold 18px ui-monospace, Consolas, monospace';
    ctx.fillText(formatTime(current), x, y+14);

    // Best lap
    if (_bestLap !== null) {
      ctx.fillStyle = '#FFD700';
      ctx.font      = '10px ui-monospace, Consolas, monospace';
      ctx.fillText(`Best: ${formatTime(_bestLap)}`, x, y+30);
    }

    // Previous lap times
    for (let i=Math.max(0,_lapTimes.length-2); i<_lapTimes.length; i++) {
      const lt = _lapTimes[i];
      const isBestLap = lt.time===_bestLap;
      ctx.fillStyle = isBestLap ? '#FFD700' : '#888899';
      ctx.font      = '9px ui-monospace, Consolas, monospace';
      ctx.fillText(`L${lt.lap}: ${formatTime(lt.time)}`, x, y+42+(i-Math.max(0,_lapTimes.length-2))*12);
    }

    ctx.restore();
  }

  function getCurrentLapTime() { return _running ? (Date.now()-_lapStart)/1000 : 0; }
  function getBestLap()        { return _bestLap; }
  function getLapTimes()       { return [..._lapTimes]; }
  function isRunning()         { return _running; }
  function getCurrentLap()     { return _currentLap; }

  return { start, completeSector, completeLap, stop, draw, formatTime, getCurrentLapTime, getBestLap, getLapTimes, isRunning, getCurrentLap };
})();
