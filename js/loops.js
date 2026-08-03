'use strict';
// ================================================================
// Loops — Hot Wheels tarzı RAY LOOP sistemi (dönerek geçilen halkalar)
// Araç yeterli hızla loop'a girince çember üzerinde raya oturur, 360° döner,
// çıkışta normal fiziğe döner. Tepede hız yetmezse düşer (fail).
// Yalnızca 'hotwheels' haritasında aktiftir.
// ================================================================
const Loops = {
  onRail: false,
  loop: null,
  cooldownX: -1e9,
  SPACING: 10000,   // her 10 km bir loop (terrain segmentiyle eşleşir)
  RADIUS: 190,
  V_MIN: 430,       // loop'a girmek için gereken min hız (altındaysa loop'a alınmaz, altından geçer)
  GRAVITY: 980,

  // --- Görsel efekt tamponları (yalnızca çizim, fizik etkilemez) ---
  _sparks: [],      // giriş/çıkış kıvılcımları: {x,y,vx,vy,t0,life,col,sz}
  _trail: [],       // araç rayda iken bırakılan parıltı izi: {x,y,t0}
  _MAXTRAIL: 46,

  // --- Dayanıklılık (robustness) durumu — yalnızca bu döngü modülünü etkiler ---
  _MAX_DT: 0.05,            // per-frame dt tavanı (1/20 s): lag/tab-switch fizik patlamasını önler
  _visGuardInstalled: false,
  _bgHidden: false,
  _onVisibility: null,

  enabled(terrain) { return !!(terrain && terrain.mapId === 'hotwheels'); },

  _now() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001; },

  // Bir noktadan kıvılcım demeti fışkırt (giriş/çıkış efekti)
  _spawnSparks(x, y, count, spread, col) {
    const now = this._now();
    if (this._sparks.length > 240) this._sparks.splice(0, this._sparks.length - 240);
    for (let i = 0; i < count; i++) {
      const ang = (Math.random() * 2 - 1) * spread - Math.PI * 0.5;
      const sp = 120 + Math.random() * 280;
      this._sparks.push({
        x: x + (Math.random() * 2 - 1) * 8,
        y: y + (Math.random() * 2 - 1) * 8,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        t0: now,
        life: 0.35 + Math.random() * 0.5,
        col: col || (Math.random() < 0.5 ? '#ffd24a' : '#ffe9b0'),
        sz: 1.6 + Math.random() * 2.6
      });
    }
  },

  // Zamana göre yaşayan kıvılcımları çiz (dünya uzayında)
  _drawSparks(ctx) {
    const s = this._sparks;
    if (!s.length) return;
    const now = this._now();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = s.length - 1; i >= 0; i--) {
      const p = s[i];
      const age = now - p.t0;
      if (age >= p.life) { s.splice(i, 1); continue; }
      const k = age / p.life;
      const px = p.x + p.vx * age;
      const py = p.y + p.vy * age + 620 * age * age * 0.5; // hafif yerçekimi
      const a = (1 - k) * 0.95;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      ctx.shadowColor = p.col;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, p.sz * (1 - k * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // Araç rayda iken bıraktığı parlayan iz (dünya uzayında, zamanla söner)
  _drawTrail(ctx) {
    const tr = this._trail;
    if (!tr.length) return;
    const now = this._now();
    const LIFE = 0.55;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = tr.length - 1; i >= 0; i--) {
      const p = tr[i];
      const age = now - p.t0;
      if (age >= LIFE) { tr.splice(i, 1); continue; }
      const k = 1 - age / LIFE;
      ctx.globalAlpha = k * 0.7;
      ctx.fillStyle = '#8fe3ff';
      ctx.shadowColor = 'rgba(120,220,255,0.9)';
      ctx.shadowBlur = 16 * k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 + 6 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // Rayda ilerleyen araç konumunda hız temelli parıltı + hız çizgileri
  _drawRailCar(ctx, L) {
    if (!L) return;
    const a = L.s * 2 * Math.PI;
    const cx = L.cx, cy = L.gy - L.R;
    const _rr = Math.max(8, L.R - (L.clr || 0));
    const px = cx + _rr * Math.sin(a);
    const py = cy + _rr * Math.cos(a);
    const spd = L.spd || 300;
    const glow = Math.min(1, spd / 700);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Araç altındaki sıcak parıltı halkası
    const g = ctx.createRadialGradient(px, py, 0, px, py, 34 + glow * 26);
    g.addColorStop(0, `rgba(255,210,120,${0.55 * (0.6 + glow * 0.4)})`);
    g.addColorStop(0.5, 'rgba(255,140,40,0.28)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, 34 + glow * 26, 0, Math.PI * 2);
    ctx.fill();
    // Hıza bağlı, araç arkasında ray boyunca kayan kısa hız çizgileri.
    // Konum param'ı: (cx + R*sin(param), cy + R*cos(param)). Araç arkası = daha küçük param.
    const streaks = 3 + Math.floor(glow * 5);
    ctx.strokeStyle = `rgba(255,240,190,${0.25 + glow * 0.5})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,220,150,0.8)';
    ctx.shadowBlur = 8;
    for (let i = 1; i <= streaks; i++) {
      const pa = a - i * (0.09 + glow * 0.05);
      const rIn = L.R - 15, rOut = L.R + 15;
      const sx0 = cx + rIn * Math.sin(pa),  sy0 = cy + rIn * Math.cos(pa);
      const sx1 = cx + rOut * Math.sin(pa), sy1 = cy + rOut * Math.cos(pa);
      ctx.globalAlpha = (1 - i / (streaks + 1)) * (0.45 + glow * 0.5);
      ctx.beginPath();
      ctx.moveTo(sx0, sy0); ctx.lineTo(sx1, sy1);
      ctx.stroke();
    }
    ctx.restore();
  },

  _loopXNear(x) {
    const n = Math.round(x / this.SPACING);
    return n >= 1 ? n * this.SPACING : null;
  },

  reset() { this.onRail = false; this.loop = null; this.cooldownX = -1e9; },

  // Normal fizik adımından SONRA çağrılır: girişi yakala
  check(v, terrain) {
    if (this.onRail || !this.enabled(terrain) || !v || v.dead) return;
    if (!v.onGround) return;
    const lx = this._loopXNear(v.x);
    if (lx === null) return;
    if (v.x >= lx && v.x <= lx + 70 && v.vx >= this.V_MIN && Math.abs(lx - this.cooldownX) > 200) {
      const gy = terrain.getYAt(lx);
      // Gövde merkezinin ray yarıçapından içe mesafesi: tekerler ray üzerinde otursun,
      // araç halkanın İÇİNDE dönsün (dışarı taşmasın).
      const clr = Math.min(this.RADIUS * 0.5, (v.height || 40) * 0.5 + (v.wheels && v.wheels[0] ? (v.wheels[0].r || v.wheels[0].radius || 14) : 14));
      this.loop = { cx: lx, gy: gy, R: this.RADIUS, clr: clr, s: 0, spd: v.vx };
      this.onRail = true;
      // Giriş kıvılcımları (görsel)
      this._spawnSparks(v.x, gy, 18, 0.9, null);
    }
  },

  // --- Dayanıklılık yardımcıları (hepsi defansif; Settings/document erişimi korumalı) ---

  // Settings.get(key) → boolean; tanımsız/erişilemez ise dflt döner.
  _settingBool(key, dflt) {
    try {
      if (typeof Settings !== 'undefined' && Settings && typeof Settings.get === 'function') {
        const val = Settings.get(key);
        return (val === undefined || val === null) ? dflt : !!val;
      }
    } catch (e) { /* yok say */ }
    return dflt;
  },

  // dt'yi güvenli aralığa çek: NaN/Infinity/negatif → 0; tavanı _MAX_DT ile sınırla.
  _clampDt(dt) {
    if (typeof dt !== 'number' || !isFinite(dt) || dt <= 0) return 0;
    const max = (typeof this._MAX_DT === 'number' && this._MAX_DT > 0) ? this._MAX_DT : 0.05;
    return dt > max ? max : dt;
  },

  // Tab/pencere gizli mi + backgroundPause açık mı?
  _isBgPaused() {
    return this._bgHidden && this._settingBool('backgroundPause', true);
  },

  // visibilitychange dinleyicisini bir kez, korumalı ve kendini temizler biçimde kur.
  _ensureVisGuard() {
    if (this._visGuardInstalled) return;
    this._visGuardInstalled = true; // ne olursa olsun tekrar denemeyi engelle
    if (typeof document === 'undefined' || !document || typeof document.addEventListener !== 'function') return;
    const self = this;
    const onVis = function () {
      const hidden = (typeof document.hidden !== 'undefined') ? !!document.hidden : false;
      self._bgHidden = hidden;
      // İsteğe bağlı: blur/gizlenmede sesi kıs (yalnızca ilgili metod varsa).
      if (self._settingBool('muteOnBlur', false)) {
        try {
          if (typeof Audio !== 'undefined' && Audio) {
            if (hidden && typeof Audio.mute === 'function') Audio.mute();
            else if (!hidden && typeof Audio.unmute === 'function') Audio.unmute();
            else if (typeof Audio.setMasterVolume === 'function') Audio.setMasterVolume(hidden ? 0 : 1);
          }
        } catch (e) { /* ses modülü yoksa yok say */ }
      }
    };
    this._onVisibility = onVis;
    try { document.addEventListener('visibilitychange', onVis, false); } catch (e) { /* yok say */ }
  },

  // Dinleyiciyi kaldır (kendini temizleme; test/teardown için). Defansif.
  _removeVisGuard() {
    try {
      if (this._onVisibility && typeof document !== 'undefined' && document && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', this._onVisibility, false);
      }
    } catch (e) { /* yok say */ }
    this._onVisibility = null;
    this._visGuardInstalled = false;
    this._bgHidden = false;
  },

  // Raydayken (Physics.step YERİNE) çağrılır
  update(v, dt) {
    const L = this.loop;
    if (!L || !v) { this.onRail = false; return; }
    // --- Dayanıklılık: dinleyiciyi kur, gizli-tab duraklatması ve dt klamplaması ---
    this._ensureVisGuard();
    // Tab/pencere gizli + backgroundPause açıksa: rayda ilerleme yapma, durumu koru.
    if (this._isBgPaused()) return;
    // dt'yi normalize et: NaN/Infinity/negatif → 0 (adım atma); büyük boşluğu tavana çek.
    dt = this._clampDt(dt);
    if (dt <= 0) return;
    const twoPiR = 2 * Math.PI * L.R;
    const alpha = L.s * 2 * Math.PI;
    // Hafif yerçekimi modülasyonu (üstte biraz yavaşlar) — ama rayda kalır ve loop'u HER ZAMAN tamamlar.
    // Böylece yavaş girişte bile araç atılmaz; sadece yeterli hızla girenler loop'a alınır (bkz. V_MIN).
    L.spd += this.GRAVITY * (-Math.sin(alpha)) * dt * 0.5;
    if (L.spd < 300) L.spd = 300;              // rayda kal, döngüyü tamamla
    L.s += (L.spd / twoPiR) * dt;

    // Tamamlandı → çıkış
    if (L.s >= 1) {
      v.x = L.cx + 6; v.y = L.gy - (L.clr || 0); v.angle = 0;   // çıkışta tekerler yere temiz otursun
      v.vx = L.spd; v.vy = 0;
      this.cooldownX = L.cx;
      // Çıkış kıvılcımları (hız arttıkça daha coşkulu)
      const boost = Math.min(24, 12 + Math.floor((L.spd || 300) / 60));
      this._spawnSparks(L.cx + 6, L.gy, boost, 1.1, '#ffe9b0');
      this.onRail = false; this.loop = null;
      return;
    }

    // Rayda parlayan iz bırak (görsel)
    {
      const aa = L.s * 2 * Math.PI;
      const _rr = Math.max(8, L.R - (L.clr || 0));
      const tx = L.cx + _rr * Math.sin(aa);
      const ty = (L.gy - L.R) + _rr * Math.cos(aa);
      this._trail.push({ x: tx, y: ty, t0: this._now() });
      if (this._trail.length > this._MAXTRAIL) this._trail.shift();
    }

    // ── ARAÇ KONUMU (xyz): halka rayında dönüş — sıfırdan, özenle ────────────
    // Halka merkezi (cx, cy); cy tabandan R yukarıda. Araç gövde MERKEZİ rayın
    // 'clr' kadar İÇİNDE (rr yarıçapı) döner → tekerler R yarıçaplı ray ÜZERİNE
    // oturur, araç halkanın dışına taşmaz. Açı teğete hizalı (-a): tabanda dik,
    // tepede tam ters, yanlarda 90° — gerçek loop hissi.
    const a  = L.s * 2 * Math.PI;
    const cx = L.cx, cy = L.gy - L.R;             // halka merkezi
    const rr = Math.max(8, L.R - (L.clr || 0));   // gövde merkezinin döndüğü yarıçap
    v.x = cx + rr * Math.sin(a);
    v.y = cy + rr * Math.cos(a);
    v.angle = -a;                                 // gövde raya teğet (tekerler dışa/ray'a dönük)
    v.angularVel = 0;
    v.vx = L.spd; v.vy = 0;                        // çıkış sürekliliği (rayda konum doğrudan atanır)
    v.onGround = true; v.airTime = 0;
    if (v.wheels) v.wheels.forEach(w => {
      w.spin = (w.spin || 0) + (L.spd / Math.max(1, (w.r || w.radius || 20))) * dt;
    });
  },

  // Dünya uzayında loop halkalarını çiz (kamera transformu içinde çağrılır)
  draw(ctx, camera, terrain) {
    if (!this.enabled(terrain) || !camera) return;
    const viewW = camera.width / (camera.zoom || 1);
    const startN = Math.max(1, Math.floor((camera.x - 400) / this.SPACING));
    const endN = Math.floor((camera.x + viewW + 400) / this.SPACING);
    // Zaman tabanlı animasyon fazı (enerji akışı + parıltı nabzı) — sadece görsel
    const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    for (let n = startN; n <= endN; n++) {
      const cx = n * this.SPACING;
      const gy = terrain.getYAt(cx);
      const R = this.RADIUS;
      const cy = gy - R;
      ctx.save();

      // ---- Destek direkleri (yerden halkanın yanlarına) ----
      const postDX = R * 0.72;
      ctx.lineCap = 'round';
      for (const sx of [cx - postDX, cx + postDX]) {
        // Direk gölgesi/gövde
        const grdP = ctx.createLinearGradient(sx, gy, sx, cy);
        grdP.addColorStop(0, '#3a3f47');
        grdP.addColorStop(1, '#6b7280');
        ctx.strokeStyle = grdP; ctx.lineWidth = 14; ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(sx, gy + 4); ctx.lineTo(sx, cy + R * 0.55); ctx.stroke();
        // Direk üstü turuncu bağlantı topuzu
        ctx.fillStyle = '#ff8a2a';
        ctx.beginPath(); ctx.arc(sx, cy + R * 0.55, 8, 0, Math.PI * 2); ctx.fill();
        // Taban plakası
        ctx.fillStyle = '#2b2f36';
        ctx.fillRect(sx - 16, gy + 2, 32, 8);
      }
      // Çapraz destek payandaları
      ctx.strokeStyle = 'rgba(120,130,140,0.7)'; ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - postDX, gy + 4); ctx.lineTo(cx + postDX, cy + R * 0.55);
      ctx.moveTo(cx + postDX, gy + 4); ctx.lineTo(cx - postDX, cy + R * 0.55);
      ctx.stroke();

      // ---- Dış parlak turuncu ray (glow ile) ----
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + n);
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = 'rgba(255,140,30,0.9)';
      ctx.shadowBlur = 26 + pulse * 22;
      const grd = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      grd.addColorStop(0, '#ffb347');
      grd.addColorStop(0.5, '#ff7a1a');
      grd.addColorStop(1, '#e85d04');
      ctx.strokeStyle = grd; ctx.lineWidth = 28;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // İç ışık çizgisi (ray üzerinde parlak highlight)
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, R - 6, -Math.PI * 0.85, -Math.PI * 0.15); ctx.stroke();

      // ---- Kenar rayları (metalik) ----
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#7a2f00'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, R - 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R + 14, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,120,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R - 12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2); ctx.stroke();

      // ---- Dama deseni bantları (radyal traversler) ----
      const segs = 28;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        ctx.fillStyle = (i % 2 === 0) ? 'rgba(20,20,24,0.55)' : 'rgba(255,240,210,0.35)';
        ctx.beginPath();
        ctx.arc(cx, cy, R + 13, a0, a1);
        ctx.arc(cx, cy, R - 13, a1, a0, true);
        ctx.closePath(); ctx.fill();
      }

      // ---- Animasyonlu enerji akışı (kayan kesikli parlak şerit) ----
      const dashLen = 18, gapLen = 26;
      const flow = (t * 140) % (dashLen + gapLen);
      ctx.shadowColor = 'rgba(255,220,140,0.8)';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = `rgba(255,235,170,${0.55 + pulse * 0.35})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([dashLen, gapLen]);
      ctx.lineDashOffset = -flow;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.shadowBlur = 0;

      // ---- Giriş etiketi (parlayan) ----
      ctx.shadowColor = 'rgba(255,180,40,0.8)';
      ctx.shadowBlur = 10 + pulse * 8;
      ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('LOOP ➜', cx, gy + 30);
      ctx.restore();
    }

    // ---- Araç rayda iken: parlayan iz + hız temelli parıltı/streak ----
    this._drawTrail(ctx);
    if (this.onRail && this.loop) this._drawRailCar(ctx, this.loop);
    // ---- Giriş/çıkış kıvılcımları ----
    this._drawSparks(ctx);
  }
};
