'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// POWER MODES — 3 YENİ GÜÇ-MODU (kendi kendine yeten, tek dosya)
//   1) timeslow  : ZAMAN YAVAŞLATMA (bullet-time) — sınırlı zaman enerjisi barı,
//                  bir tuşla/butonla zaman yavaşlar (dt küçülür), mavi tonlama.
//   2) reverse   : TERS YÖN YARIŞI — araç sola (ters yön) gider, kontrol ters,
//                  puanlama = ters (sola) mesafe.
//   3) fuelless  : YAKITSIZ HAYATTA KALMA — motor kapalı, sadece momentum +
//                  iniş/hız yönetimi; ne kadar gidersen o kadar puan.
//
// Oyuna dokunmadan çalışır: yalnızca Game.vehicle / Game.controlState / Game.state
// okur-yazar. Etkiyi oyun döngüsünde `PowerModes.apply(dt)` (→ değiştirilmiş dt)
// ve `PowerModes.drawHUD(ctx,W,H)` uygular. Mod seçimi için `draw`/`handleClick`.
//
// localStorage KULLANMAZ — kalıcı skorlar için yalnızca SaveData.get/set.
// Tüm sayı/pozisyon değerleri NaN/sonsuzluk için korunur (guard'lanır).
// ═══════════════════════════════════════════════════════════════════════════
const PowerModes = {
  // ── Aktif durum ──
  key: null,            // 'timeslow' | 'reverse' | 'fuelless' | null
  active: false,        // bir güç-modu koşuyor mu
  _menuOpen: false,     // mod-seçim ekranı açık mı (canvas draw/handleClick)
  _finished: false,     // bu tur sonuçlandı mı (çift-sayım koruması)
  _inputBound: false,
  vehId: 'jeep', mapId: 'countryside',

  // ── ZAMAN YAVAŞLATMA durumu ──
  energyMax: 1, energy: 1,     // 0..1 zaman enerjisi
  _slowKey: false,             // klavye (F) basılı
  _slowLatch: false,           // HUD butonu latch (dokunmatik)
  _slowing: false,             // bu kare yavaşlatıyor mu
  _tint: 0,                    // mavi tonlama yoğunluğu 0..1
  SLOW_SCALE: 0.32,            // dt çarpanı (yavaş-çekim)
  DRAIN: 0.55,                 // enerji tüketimi /sn (yavaşlarken)
  REFILL: 0.26,               // enerji dolumu /sn (yavaşlatmazken)

  // ── TERS YÖN durumu ──
  _revDist: 0,                 // en çok kat edilen sola-mesafe (m)

  // ── YAKITSIZ durumu ──
  _flDist: 0,                  // kat edilen mesafe (m)
  _stall: 0,                   // durağan kalma süresi (bitiş için)
  LAUNCH_VX: 1100,             // başlangıç momentumu (px/s)

  // ── Mod tanımları (seçim ekranı + HUD) ──
  MODES: [
    { key: 'timeslow', icon: '⏱', title: 'ZAMAN YAVAŞLATMA',
      desc: 'Bir tuşla zamanı yavaşlat. Sınırlı zaman enerjisi.', col: '#4db8ff' },
    { key: 'reverse',  icon: '◀', title: 'TERS YÖN YARIŞI',
      desc: 'Araç ters yöne (sola) gider. Kontrol ters. Ters mesafe = puan.', col: '#ff7ad0' },
    { key: 'fuelless', icon: '🪫', title: 'YAKITSIZ HAYATTA KALMA',
      desc: 'Motor yok — sadece momentum. Ne kadar gidersen o kadar puan.', col: '#7be08a' }
  ],

  // ── Sayı/pozisyon guard'ları ──────────────────────────────────────────────
  _num(x, d) { return (typeof x === 'number' && isFinite(x)) ? x : (d || 0); },
  _fin(x) { return typeof x === 'number' && isFinite(x); },

  isActive() { return !!this.active && !!this.key; },
  isMenuOpen() { return !!this._menuOpen; },

  // ══════════════════════════════════════════════════════════════════════════
  //  MOD SEÇİM EKRANI (canvas)
  //  main.js bir menü butonundan `PowerModes.openMenu()` çağırıp, döngüde
  //  `PowerModes.draw(ctx,W,H)` çizmeli; tıklamayı `PowerModes.handleClick`.
  // ══════════════════════════════════════════════════════════════════════════
  openMenu()  { this._menuOpen = true; },
  closeMenu() { this._menuOpen = false; },

  draw(ctx, W, H) {
    if (!this._menuOpen || !ctx) return;
    W = this._num(W, 800); H = this._num(H, 600);
    ctx.save();
    // Arka plan karartma
    ctx.fillStyle = 'rgba(6,10,22,0.92)';
    ctx.fillRect(0, 0, W, H);
    // Başlık
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚡ GÜÇ MODLARI', W / 2, 54);
    ctx.fillStyle = 'rgba(200,215,255,0.6)';
    ctx.font = '13px Arial';
    ctx.fillText('Bir mod seç', W / 2, 82);

    // Kartlar (dikey liste, ortalı)
    const cardW = Math.min(420, W - 40);
    const cardH = 92, gap = 16;
    const total = this.MODES.length * cardH + (this.MODES.length - 1) * gap;
    let y = Math.max(110, H / 2 - total / 2);
    const cx = W / 2 - cardW / 2;
    this._menuBtns = [];
    for (const m of this.MODES) {
      // kart gövdesi
      const g = ctx.createLinearGradient(0, y, 0, y + cardH);
      g.addColorStop(0, 'rgba(20,28,50,0.95)');
      g.addColorStop(1, 'rgba(10,14,28,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(cx, y, cardW, cardH, 14); ctx.fill();
      ctx.strokeStyle = m.col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx, y, cardW, cardH, 14); ctx.stroke();
      // ikon
      ctx.fillStyle = m.col; ctx.font = '38px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.icon, cx + 46, y + cardH / 2);
      // başlık + açıklama
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Arial';
      ctx.fillText(m.title, cx + 90, y + 32);
      ctx.fillStyle = 'rgba(210,220,245,0.72)'; ctx.font = '12px Arial';
      this._wrapText(ctx, m.desc, cx + 90, y + 56, cardW - 110, 15);
      this._menuBtns.push({ key: m.key, x: cx, y: y, w: cardW, h: cardH });
      y += cardH + gap;
    }
    // Kapat
    const bw = 120, bx = W / 2 - bw / 2, by = Math.min(H - 56, y + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, 40, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✖ KAPAT', W / 2, by + 20);
    this._closeBtn = { x: bx, y: by, w: bw, h: 40 };
    ctx.restore();
  },

  _wrapText(ctx, text, x, y, maxW, lh) {
    const words = String(text).split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
  },

  // Mod-seçim ekranı tıklaması. Seçilirse start() çağrılır. true → tıklama tüketildi.
  handleClick(x, y) {
    if (!this._menuOpen) return false;
    x = this._num(x, -1); y = this._num(y, -1);
    if (this._closeBtn && this._hit(this._closeBtn, x, y)) { this._menuOpen = false; return true; }
    if (this._menuBtns) {
      for (const b of this._menuBtns) {
        if (this._hit(b, x, y)) {
          const vid = this._pickVehicle();
          const mid = this._pickMap();
          this.start(b.key, vid, mid);
          return true;
        }
      }
    }
    return true; // ekran modaldır — arkaya tıklamayı geçirme
  },

  _hit(b, x, y) { return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; },

  _pickVehicle() {
    if (typeof SaveData !== 'undefined' && SaveData.get) return SaveData.get('selectedVehicle') || 'jeep';
    return 'jeep';
  },
  _pickMap() {
    if (typeof SaveData !== 'undefined' && SaveData.get) return SaveData.get('selectedMap') || 'countryside';
    return 'countryside';
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  BAŞLAT — bir güç-modu koşusu başlatır (kendi kendine yeten).
  //  Game.startRun'ı çağırır ve Main modunu 'game'e çevirir.
  // ══════════════════════════════════════════════════════════════════════════
  start(modeKey, vehId, mapId) {
    if (!modeKey) return;
    this.key = modeKey;
    this.active = true;
    this._menuOpen = false;
    this._finished = false;
    this.vehId = vehId || this._pickVehicle();
    this.mapId = mapId || this._pickMap();

    // Mod durumlarını sıfırla
    this.energy = this.energyMax;
    this._slowKey = false; this._slowLatch = false; this._slowing = false; this._tint = 0;
    this._revDist = 0; this._flDist = 0; this._stall = 0;

    this._ensureInput();

    // Normal oyun modu ile başlat (GameModes karışmasın)
    if (typeof Game !== 'undefined') {
      Game.gameMode = 'normal';
      if (typeof Main !== 'undefined' && Main.setMode) Main.setMode('game');
      if (Game.startRun) Game.startRun(this.vehId, this.mapId, false);
      // Başlangıç kurulumu (araç oluştuktan sonra)
      const v = Game.vehicle;
      if (v) this._setupVehicle(v);
    }
    if (typeof UI !== 'undefined' && UI.showToast) {
      const m = this.MODES.find(x => x.key === this.key);
      UI.showToast('⚡ ' + (m ? m.title : this.key));
    }
  },

  _setupVehicle(v) {
    if (this.key === 'fuelless') {
      // Yakıtsız: motor kapalı, ama başta güçlü momentum ver + yakıtı dolu tut
      if (this._fin(v.vx)) v.vx = this.LAUNCH_VX;
      if (v.fuelMax) v.fuel = v.fuelMax;
    }
  },

  // Kolay-başlat (DOM overlay) — hiçbir canvas entegrasyonu gerekmeden 3 modu
  // gösterir ve seçilince start()'ı çağırır. İsteğe bağlı; apply/drawHUD döngü
  // entegrasyonu YİNE de gereklidir (aşağıdaki BAĞLAMA TALİMATINA bakın).
  launch() {
    if (this._domEl || typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(6,10,22,0.94);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;' +
      'font-family:Arial,Helvetica,sans-serif;color:#fff;';
    const h = document.createElement('div');
    h.textContent = '⚡ GÜÇ MODLARI';
    h.style.cssText = 'font-size:26px;font-weight:900;margin-bottom:8px;';
    el.appendChild(h);
    const close = () => { if (el.parentNode) el.parentNode.removeChild(el); this._domEl = null; };
    for (const m of this.MODES) {
      const card = document.createElement('div');
      card.style.cssText = 'width:min(88vw,420px);padding:16px 18px;border-radius:14px;cursor:pointer;' +
        'background:linear-gradient(180deg,#141c32,#0a0e1c);border:2px solid ' + m.col + ';';
      card.innerHTML = '<div style="font-size:20px;font-weight:800;color:' + m.col + '">' +
        m.icon + '  ' + m.title + '</div><div style="font-size:12px;color:#b9c4e6;margin-top:6px">' +
        m.desc + '</div>';
      card.addEventListener('click', () => { close(); this.start(m.key, this._pickVehicle(), this._pickMap()); });
      el.appendChild(card);
    }
    const btn = document.createElement('div');
    btn.textContent = '✖ KAPAT';
    btn.style.cssText = 'margin-top:8px;padding:10px 26px;border-radius:10px;background:rgba(255,255,255,0.1);' +
      'font-weight:bold;cursor:pointer;';
    btn.addEventListener('click', close);
    el.appendChild(btn);
    document.body.appendChild(el);
    this._domEl = el;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KLAVYE GİRİŞİ (kendi kendine yeten) — ZAMAN YAVAŞLATMA için F tuşu.
  //  Yalnızca bir güç-modu aktifken etki eder.
  // ══════════════════════════════════════════════════════════════════════════
  _ensureInput() {
    if (this._inputBound || typeof document === 'undefined') return;
    this._inputBound = true;
    document.addEventListener('keydown', (e) => {
      if (!this.active || this.key !== 'timeslow') return;
      if (e.code === 'KeyF') this._slowKey = true;
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyF') this._slowKey = false;
    });
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  APPLY — oyun döngüsünde Game.update(dt)'DEN ÖNCE çağrılır.
  //  Modun etkisini uygular (zaman ölçeği / ters kontrol / yakıt kapatma) ve
  //  DEĞİŞTİRİLMİŞ dt döndürür (yalnızca zaman yavaşlatma dt'yi ölçekler).
  // ══════════════════════════════════════════════════════════════════════════
  apply(dt) {
    dt = this._num(dt, 0);
    if (!this.active || !this.key) return dt;
    if (typeof Game === 'undefined') return dt;
    const v = Game.vehicle;

    // Retry (ölümden sonra yeniden başlama) tespiti → sayaçları sıfırla
    if (this._finished && Game.state === 'playing' && v && !v.dead) {
      this._finished = false;
      this._revDist = 0; this._flDist = 0; this._stall = 0;
      this.energy = this.energyMax; this._tint = 0;
      if (v) this._setupVehicle(v);
    }

    // Tur sonuçlandırma (ölünce, bir kez)
    if (!this._finished && v && (v.dead || Game.state === 'dead')) {
      this._finish(v);
    }

    if (!v || Game.state !== 'playing') return dt;
    if (!this._fin(v.x)) return dt;   // pozisyon guard

    // ── 1) ZAMAN YAVAŞLATMA ─────────────────────────────────────────────────
    if (this.key === 'timeslow') {
      const want = (this._slowKey || this._slowLatch) && this.energy > 0.001;
      if (want) {
        this._slowing = true;
        this.energy = Math.max(0, this.energy - this.DRAIN * dt);
        this._tint = Math.min(1, this._tint + dt * 4);
        return dt * this.SLOW_SCALE;                 // ← zaman yavaşlar
      }
      this._slowing = false;
      this.energy = Math.min(this.energyMax, this.energy + this.REFILL * dt);
      this._tint = Math.max(0, this._tint - dt * 4);
      return dt;
    }

    // ── 2) TERS YÖN YARIŞI ──────────────────────────────────────────────────
    if (this.key === 'reverse') {
      const cs = Game.controlState || (Game.controlState = { throttle: 0, brake: 0, boost: 0 });
      const gas = this._num(cs.throttle, 0);
      const br  = this._num(cs.brake, 0);
      // Kontrol ters: gaz pedalı aracı SOLA (ters) sürer.
      cs.throttle = 0;                    // ileri motor gücü yok
      cs.brake = (gas > 0) ? 1 : br;      // gaz → fren(=geri); mevcut fren korunur
      // Sola itiş yardımı (fizik freni ~-120 ile sınırlı; daha canlı ters sürüş)
      if (gas > 0 && v.onGround && this._fin(v.vx)) {
        v.vx -= 260 * dt;
        if (v.vx < -520) v.vx = -520;
      }
      // Puanlama: başlangıçtan SOLA kat edilen mesafe (m)
      const sx = this._num(Game.startX, v.x);
      const rev = (sx - v.x) / 2;
      if (this._fin(rev) && rev > this._revDist) this._revDist = rev;
      return dt;
    }

    // ── 3) YAKITSIZ HAYATTA KALMA ───────────────────────────────────────────
    if (this.key === 'fuelless') {
      const cs = Game.controlState || (Game.controlState = { throttle: 0, brake: 0, boost: 0 });
      cs.throttle = 0;                    // motor kapalı — güç yok, sadece momentum
      cs.boost = 0;
      if (v.fuelMax) v.fuel = v.fuelMax;  // yakıt-bitti ölümünü engelle
      else v.fuel = Math.max(this._num(v.fuel, 10), 10);
      // Puanlama: kat edilen mesafe (m)
      const sx = this._num(Game.startX, v.x);
      const d = (v.x - sx) / 2;
      if (this._fin(d) && d > this._flDist) this._flDist = d;
      // Durma tespiti: yerde ~durağansa bir süre sonra tur biter
      if (v.onGround && Math.abs(this._num(v.vx, 0)) < 12) {
        this._stall += dt;
        if (this._stall > 3 && !v.dead) { v.dead = true; v.deathReason = 'fuel_empty'; }
      } else {
        this._stall = 0;
      }
      return dt;
    }

    return dt;
  },

  // Tur sonuçlandırma — skor hesapla, en iyisini SaveData'ya kaydet, ödül ver.
  _finish(v) {
    if (this._finished) return;
    this._finished = true;
    let score = 0, label = '', bestKey = '';
    if (this.key === 'timeslow') {
      const sx = (typeof Game !== 'undefined') ? this._num(Game.startX, 0) : 0;
      score = Math.max(0, Math.floor(((v && this._num(v.x, 0)) - sx) / 2));
      label = 'MESAFE'; bestKey = 'pmTimeslowBest';
    } else if (this.key === 'reverse') {
      score = Math.max(0, Math.floor(this._revDist)); label = 'TERS MESAFE'; bestKey = 'pmReverseBest';
    } else if (this.key === 'fuelless') {
      score = Math.max(0, Math.floor(this._flDist)); label = 'MESAFE'; bestKey = 'pmFuellessBest';
    }
    let best = 0, isBest = false;
    if (bestKey && typeof SaveData !== 'undefined' && SaveData.get) {
      const map = SaveData.get(bestKey) || {};
      best = this._num(map[this.mapId], 0);
      if (score > best) { map[this.mapId] = score; if (SaveData.set) SaveData.set(bestKey, map); isBest = true; best = score; }
    }
    this._lastResult = { key: this.key, score: score, best: best, isBest: isBest, label: label };
    const reward = 100 + Math.floor(score / 8);
    if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(reward);
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast((isBest ? '★ YENİ REKOR ' : '🏁 ') + label + ' ' + score + 'm  +' + reward + ' ⧆');
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  HUD — oyun döngüsünde çizim aşamasında çağrılır.
  //  Zaman barı / mavi tonlama / ters-yön göstergesi / mesafe.
  // ══════════════════════════════════════════════════════════════════════════
  drawHUD(ctx, W, H) {
    if (!this.active || !this.key || !ctx) return;
    W = this._num(W, 800); H = this._num(H, 600);

    // ── ZAMAN YAVAŞLATMA: mavi tonlama + enerji barı + buton ──
    if (this.key === 'timeslow') {
      if (this._tint > 0.01) {
        ctx.save();
        ctx.globalAlpha = this._tint * 0.22;
        ctx.fillStyle = '#1e6bff';
        ctx.fillRect(0, 0, W, H);
        // kenar vinyet (yavaş-çekim hissi)
        const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
        vg.addColorStop(0, 'rgba(30,107,255,0)');
        vg.addColorStop(1, 'rgba(20,60,180,0.5)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      // Enerji barı (üst-orta)
      const bw = Math.min(260, W - 120), bx = W / 2 - bw / 2, by = 56, bh = 16;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(bx - 4, by - 4, bw + 8, bh + 8, 8); ctx.fill();
      const frac = Math.max(0, Math.min(1, this.energy / this.energyMax));
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#2ea6ff'); g.addColorStop(1, '#a8e0ff');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(bx, by, bw * frac, bh, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⏱ ZAMAN ENERJİSİ', W / 2, by + bh / 2);
      ctx.restore();
      // Yavaşlat butonu (sağ-alt)
      const btnW = 92, btnH = 92, bxb = W - btnW - 20, byb = H - btnH - 100;
      ctx.save();
      ctx.globalAlpha = this._slowing ? 1 : 0.8;
      ctx.fillStyle = this._slowing ? 'rgba(46,166,255,0.85)' : 'rgba(20,40,80,0.7)';
      ctx.beginPath(); ctx.arc(bxb + btnW / 2, byb + btnH / 2, btnW / 2, 0, 6.28); ctx.fill();
      ctx.strokeStyle = '#a8e0ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⏱', bxb + btnW / 2, byb + btnH / 2 - 8);
      ctx.font = 'bold 11px Arial';
      ctx.fillText('YAVAŞLAT', bxb + btnW / 2, byb + btnH / 2 + 20);
      ctx.restore();
      this._slowBtn = { x: bxb, y: byb, w: btnW, h: btnH };
      return;
    }

    // ── TERS YÖN: gösterge + ters mesafe ──
    if (this.key === 'reverse') {
      ctx.save();
      const bw = 200, bx = W / 2 - bw / 2, by = 54, bh = 34;
      ctx.fillStyle = 'rgba(60,10,50,0.7)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = '#ff7ad0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.stroke();
      ctx.fillStyle = '#ff7ad0'; ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('◀ TERS YÖN  ' + Math.floor(this._revDist) + ' m', W / 2, by + bh / 2);
      ctx.restore();
      return;
    }

    // ── YAKITSIZ: gösterge + mesafe ──
    if (this.key === 'fuelless') {
      ctx.save();
      const bw = 220, bx = W / 2 - bw / 2, by = 54, bh = 34;
      ctx.fillStyle = 'rgba(10,50,25,0.7)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = '#7be08a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.stroke();
      ctx.fillStyle = '#7be08a'; ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🪫 YAKITSIZ  ' + Math.floor(this._flDist) + ' m', W / 2, by + bh / 2);
      ctx.restore();
      return;
    }
  },

  // Oyun-içi HUD tıklaması (dokunmatik "YAVAŞLAT" butonu). main.js'in
  // _handleGameClick'inde çağrılabilir. true → tüketildi.
  handleGameClick(x, y) {
    if (!this.active || this.key !== 'timeslow' || !this._slowBtn) return false;
    x = this._num(x, -1); y = this._num(y, -1);
    if (this._hit(this._slowBtn, x, y)) { this._slowLatch = !this._slowLatch; return true; }
    return false;
  },

  // Modu tamamen durdur (menüye dönerken çağrılabilir — isteğe bağlı).
  stop() {
    this.active = false; this.key = null; this._menuOpen = false;
    this._slowKey = false; this._slowLatch = false; this._slowing = false; this._tint = 0;
  }
};

if (typeof window !== 'undefined') window.PowerModes = PowerModes;
if (typeof module !== 'undefined' && module.exports) module.exports = PowerModes;
