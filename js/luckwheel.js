'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   LUCK WHEEL  —  GÜNLÜK ŞANS ÇARKI + JACKPOT
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıklar (hepsi güvenli-opsiyonel, typeof guard):
     · SaveData.get/set            → kalıcılık (localStorage YOK; her şey SaveData)
     · SaveData.addGold/addDiamonds/addScrap/unlockVehicle/addPart → ödüller
     · SaveData.spendDiamonds      → ekstra çevirmeler
     · UI.showToast / UI.goTo      → bildirim & geri dönüş (opsiyonel)
     · Audio.* , Particles.*       → ses & parçacık efektleri (opsiyonel)
     · Date.now()                  → tüm zamanlama (gün damgası, animasyon saati)

   İÇERİK
     · 10 dilimli dönen çark: altın / elmas / hurda / kart(parça) / JACKPOT.
       Farklı olasılıklar (ağırlıklar); JACKPOT nadir.
     · GÜNLÜK ÜCRETSİZ ÇEVİRME: her gün 1 bedava; ekstra çevirmeler elmasla.
     · Pürüzsüz DÖNME ANİMASYONU: easing ile yavaşlayarak durur; rim ışıkları,
       parıltı/glow, kazanılan dilimde patlama efekti.
     · STREAK: art arda günlerde daha iyi ödüller (çarpan + JACKPOT şansı artar).

   API
     LuckWheel.draw(ctx, W, H [, dt])   → çarkı + dönme animasyonunu çizer
     LuckWheel.handleClick(x, y)        → 'back' | null  (ÇEVİR butonu dönmeyi başlatır)
     LuckWheel.update(dt)               → dönme fiziği (İSTEĞE BAĞLI — draw kendi
                                          saatiyle de ilerler; ikisinden BİRİ yeterli)

   KURALLAR: localStorage kullanmaz. Tüm para/ödül girişleri NaN korumalıdır.
   ═══════════════════════════════════════════════════════════════════════════ */
const LuckWheel = {

  // ── Sabitler ───────────────────────────────────────────────────────────────
  DAY_MS: 86400000,
  EXTRA_COST: 20,          // elmas / ekstra çevirme
  SPIN_DURATION: 4.6,      // saniye — yavaşlayarak duruş süresi
  SPIN_TURNS: 6,           // duruştan önce tam tur sayısı
  _SAVE_KEY: 'luckWheel',

  // ── Çark dilimleri (10) — ağırlık: büyük = daha olası; JACKPOT nadir ────────
  //   type: 'gold' | 'diamonds' | 'scrap' | 'part' | 'jackpot'
  SEGMENTS: [
    { type:'gold',     amount:250,  weight:20, label:'250',   icon:'🪙', color:'#3a7bd5' },
    { type:'diamonds', amount:2,    weight:12, label:'2',     icon:'💎', color:'#9b4dff' },
    { type:'scrap',    amount:30,   weight:16, label:'30',    icon:'⚙️', color:'#e0862b' },
    { type:'gold',     amount:600,  weight:12, label:'600',   icon:'🪙', color:'#2fb0a0' },
    { type:'part',     amount:1,    weight:6,  label:'PARÇA', icon:'🔩', color:'#d94f8a' },
    { type:'scrap',    amount:80,   weight:10, label:'80',    icon:'⚙️', color:'#e0a72b' },
    { type:'diamonds', amount:5,    weight:8,  label:'5',     icon:'💎', color:'#7a5cff' },
    { type:'gold',     amount:1200, weight:8,  label:'1200',  icon:'🪙', color:'#3f6fd6' },
    { type:'jackpot',  amount:1,    weight:2,  label:'JACKPOT',icon:'👑', color:'#ffcf3f' },
    { type:'gold',     amount:400,  weight:14, label:'400',   icon:'🪙', color:'#28b487' }
  ],

  // ── Tema ────────────────────────────────────────────────────────────────────
  COL: {
    bg0:'#0a0e1c', bg1:'#151b33', panel:'#171d33', line:'rgba(255,255,255,0.10)',
    text:'#f2f5ff', mute:'#8b97b8', gold:'#ffcf3f', green:'#39d98a', red:'#ff5a5a',
    hub:'#20263f', pointer:'#ff5a5a'
  },

  // ── Çalışma zamanı durumu ────────────────────────────────────────────────────
  _state: null,
  _angle: 0,               // çarkın anlık dönüşü (rad)
  _spinning: false,
  _spinT: 0,               // 0..1 spin ilerlemesi
  _angleStart: 0,
  _angleTarget: 0,
  _winIdx: -1,             // dönüş başında seçilen kazanan dilim
  _resultPending: false,   // duruşta ödül verilecek mi
  _result: null,           // { seg, txt } — kazanç popup
  _resultAlpha: 0,
  _t: 0,                   // görsel animasyon saati (ışıklar)
  _lastNow: 0,             // Date.now tabanlı iç saat
  _extDriven: false,       // update(dt) dışarıdan çağrıldıysa draw kendi saatini kullanmaz
  _updatedThisFrame: false,
  _btns: [],               // her draw'da yeniden doldurulan tıklama hedefleri

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },
  _int(v, fb) { return Math.floor(this._num(v, fb)); },
  _mod(a, m) { return ((a % m) + m) % m; },
  _now() { return Date.now(); },
  _today() { return Math.floor(this._now() / this.DAY_MS); },

  _fresh() {
    return { lastFreeDay: -1, streak: 0, streakDay: -1, totalSpins: 0, lastWin: null };
  },

  _get() {
    if (this._state) return this._state;
    let d = null;
    try { if (typeof SaveData !== 'undefined' && SaveData.get) d = SaveData.get(this._SAVE_KEY); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = this._fresh();
    const f = this._fresh();
    for (const k in f) { if (d[k] === undefined || d[k] === null) d[k] = f[k]; }
    d.lastFreeDay = this._int(d.lastFreeDay, -1);
    d.streak      = Math.max(0, this._int(d.streak, 0));
    d.streakDay   = this._int(d.streakDay, -1);
    d.totalSpins  = Math.max(0, this._int(d.totalSpins, 0));
    this._state = d;
    return d;
  },

  _persist() {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, this._state); } catch (e) {}
  },

  _sfx(name) {
    try { if (typeof Audio !== 'undefined' && typeof Audio[name] === 'function') Audio[name](); } catch (e) {}
  },

  // ── Günlük ücretsiz çevirme mevcut mu? ──────────────────────────────────────
  _freeAvailable() { return this._get().lastFreeDay !== this._today(); },

  // ── Streak çarpanı: art arda günlerde büyür (1.0 → ~1.9) ────────────────────
  _streakMult() { return 1 + Math.min(6, Math.max(0, this._get().streak - 1)) * 0.15; },

  // ══════════════════════════════════════════════════════════════════════════
  //  ÇEVİRME MANTIĞI
  // ══════════════════════════════════════════════════════════════════════════
  _pickWinner() {
    const streak = this._get().streak;
    // Streak arttıkça JACKPOT ağırlığı hafifçe yükselir (nadir kalır).
    let total = 0;
    const w = this.SEGMENTS.map((s, i) => {
      let ww = Math.max(0, this._num(s.weight, 1));
      if (s.type === 'jackpot') ww += Math.min(3, streak * 0.4);
      total += ww; return ww;
    });
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
    return w.length - 1;
  },

  // Kazanan dilim seçilir, çark o dilime denk düşecek hedef açı hesaplanır.
  _beginSpin(isFree) {
    const N = this.SEGMENTS.length;
    const seg = (Math.PI * 2) / N;
    this._winIdx = this._pickWinner();

    // Pointer üstte (-PI/2). Dilim i, [i*seg, (i+1)*seg) + _angle aralığında çizilir;
    // merkezi pointer altına gelsin: _angle ≡ -PI/2 - (win*seg + seg/2).
    const pointer = -Math.PI / 2;
    let desired = pointer - (this._winIdx * seg + seg / 2);
    // Dilim içinde hafif rastlantısal sapma (kenarlara değil, merkeze yakın).
    desired += (Math.random() - 0.5) * seg * 0.6;
    const curMod = this._mod(this._angle, Math.PI * 2);
    const delta = this._mod(desired - curMod, Math.PI * 2);
    this._angleStart = this._angle;
    this._angleTarget = this._angle + this.SPIN_TURNS * Math.PI * 2 + delta;

    this._spinning = true;
    this._spinT = 0;
    this._resultPending = true;
    this._result = null;
    this._resultAlpha = 0;
    this._isFreeSpin = !!isFree;

    const st = this._get();
    if (isFree) {
      const today = this._today();
      // Streak: dün çevirdiyse +1, boşluk varsa 1'e sıfırla.
      if (st.streakDay === today - 1) st.streak = Math.max(1, st.streak + 1);
      else if (st.streakDay !== today) st.streak = 1;
      st.streakDay = today;
      st.lastFreeDay = today;
    }
    st.totalSpins = Math.max(0, st.totalSpins + 1);
    this._persist();
    this._sfx('playMenuClick');
  },

  // Çevir butonuna basıldığında — ücretsiz varsa onu, yoksa elmasla ekstra.
  _trySpin() {
    if (this._spinning) return;
    if (this._freeAvailable()) { this._beginSpin(true); return; }
    // Ekstra çevirme: elmas harca.
    const cost = this.EXTRA_COST;
    let ok = false;
    try {
      if (typeof SaveData !== 'undefined' && typeof SaveData.spendDiamonds === 'function') ok = SaveData.spendDiamonds(cost);
    } catch (e) { ok = false; }
    if (ok) { this._beginSpin(false); }
    else { this._toast('💎 Yetersiz elmas! (' + cost + ' gerekli)'); this._sfx('playMenuClick'); }
  },

  _toast(msg) {
    try { if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') UI.showToast(msg); } catch (e) {}
  },

  // ── Ödülü ver (dönme bitince) — tüm miktarlar NaN korumalı ──────────────────
  _award(idx) {
    const seg = this.SEGMENTS[idx];
    if (!seg) return;
    const mult = this._streakMult();
    let txt = '';

    if (seg.type === 'gold') {
      const amt = Math.max(0, this._int(seg.amount * mult, 0));
      try { if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(amt); } catch (e) {}
      txt = '+' + amt + ' 🪙';
      this._sfx('playCoin');
    } else if (seg.type === 'diamonds') {
      const amt = Math.max(0, this._int(seg.amount, 0));
      try { if (typeof SaveData !== 'undefined' && SaveData.addDiamonds) SaveData.addDiamonds(amt); } catch (e) {}
      txt = '+' + amt + ' 💎';
      this._sfx('playPurchase');
    } else if (seg.type === 'scrap') {
      const amt = Math.max(0, this._int(seg.amount * mult, 0));
      try { if (typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(amt); } catch (e) {}
      txt = '+' + amt + ' ⚙️';
      this._sfx('playCoin');
    } else if (seg.type === 'part') {
      const pid = this._grantPart();
      if (pid) { txt = '🔩 PARÇA: ' + pid; this._sfx('playUnlock'); }
      else {
        // Tüm parçalar mevcut → hurda telafisi.
        const amt = Math.max(0, this._int(120 * mult, 0));
        try { if (typeof SaveData !== 'undefined' && SaveData.addScrap) SaveData.addScrap(amt); } catch (e) {}
        txt = '+' + amt + ' ⚙️';
        this._sfx('playCoin');
      }
    } else if (seg.type === 'jackpot') {
      const g = Math.max(0, this._int(5000 * mult, 0));
      const dm = Math.max(0, this._int(25 * mult, 0));
      try {
        if (typeof SaveData !== 'undefined') {
          if (SaveData.addGold)     SaveData.addGold(g);
          if (SaveData.addDiamonds) SaveData.addDiamonds(dm);
        }
      } catch (e) {}
      txt = 'JACKPOT! +' + g + ' 🪙  +' + dm + ' 💎';
      this._sfx('playWinStinger');
      this._sfx('playLevelUp');
    }

    const st = this._get();
    st.lastWin = { type: seg.type, txt: txt, day: this._today() };
    this._persist();

    this._result = { seg: seg, txt: txt };
    this._toast('🎉 ' + txt);
    this._burst(seg.type === 'jackpot');
  },

  // Sahip olunmayan bir parça ver; yoksa null.
  _grantPart() {
    try {
      if (typeof SaveData === 'undefined' || typeof SaveData.addPart !== 'function') return null;
      const all = (SaveData._ALL_PARTS && Array.isArray(SaveData._ALL_PARTS)) ? SaveData._ALL_PARTS : [];
      const owned = (SaveData.get && SaveData.get('ownedParts')) || [];
      const pool = all.filter(p => !owned.includes(p));
      const list = pool.length ? pool : [];
      if (!list.length) return null;
      const pid = list[Math.floor(Math.random() * list.length)];
      SaveData.addPart(pid);
      return pid;
    } catch (e) { return null; }
  },

  // Kazanılan dilimde patlama efekti.
  _burst(big) {
    try {
      if (typeof Particles === 'undefined') return;
      const cx = this._cx || 0, cy = this._cy || 0;
      if (big && typeof Particles.confettiRain === 'function') Particles.confettiRain(cx, cy - 40, 260);
      if (typeof Particles.confetti === 'function') Particles.confetti(cx, cy - this._radius * 0.7);
      else if (typeof Particles.explosion === 'function') Particles.explosion(cx, cy - this._radius * 0.7);
      if (big && typeof Particles.explosion === 'function') Particles.explosion(cx, cy);
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  FİZİK (easing ile yavaşlayarak durma)
  // ══════════════════════════════════════════════════════════════════════════
  _easeOut(t) { return 1 - Math.pow(1 - t, 4); },   // güçlü yavaşlama

  _advance(dt) {
    dt = this._num(dt, 0);
    if (dt < 0) dt = 0; if (dt > 0.05) dt = 0.05;   // kare atlama koruması
    this._t += dt;

    // Kazanç popup yumuşak beliriş.
    if (this._result) this._resultAlpha = Math.min(1, this._resultAlpha + dt * 3);

    if (!this._spinning) return;
    this._spinT += dt / this.SPIN_DURATION;
    if (this._spinT >= 1) {
      this._spinT = 1;
      this._angle = this._angleTarget;
      this._spinning = false;
      if (this._resultPending) { this._resultPending = false; this._award(this._winIdx); }
      return;
    }
    const e = this._easeOut(this._spinT);
    this._angle = this._angleStart + (this._angleTarget - this._angleStart) * e;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: update(dt)  (isteğe bağlı — draw kendi saatiyle de ilerler)
  // ══════════════════════════════════════════════════════════════════════════
  update(dt) {
    this._extDriven = true;
    this._updatedThisFrame = true;
    this._advance(dt);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: draw(ctx, W, H [, dt])
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H, dt) {
    // ── Zaman ilerlet: update() dışarıdan çağrılmadıysa kendi saatimizi kullan ──
    if (!this._updatedThisFrame && !this._extDriven) {
      let d;
      if (isFinite(dt) && dt > 0) d = dt;
      else {
        const now = this._now();
        if (!this._lastNow) this._lastNow = now;
        d = (now - this._lastNow) / 1000;
        this._lastNow = now;
      }
      this._advance(d);
    }
    this._updatedThisFrame = false;

    const st = this._get();
    this._btns = [];

    // ── Arka plan ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg0); g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // ── Başlık ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.COL.gold;
    ctx.font = 'bold ' + Math.round(H * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('🎡 ŞANS ÇARKI', W / 2, H * 0.11);

    // ── Streak rozeti ──
    ctx.font = 'bold ' + Math.round(H * 0.026) + 'px system-ui, sans-serif';
    ctx.fillStyle = this.COL.green;
    const streak = st.streak;
    const mult = this._streakMult();
    ctx.fillText('🔥 Seri: ' + streak + ' gün   ×' + mult.toFixed(2) + ' ödül', W / 2, H * 0.16);

    // ── Çark geometrisi ──
    const cx = W / 2;
    const cy = H * 0.50;
    const radius = Math.min(W, H) * 0.30;
    this._cx = cx; this._cy = cy; this._radius = radius;

    this._drawWheel(ctx, cx, cy, radius);
    this._drawPointer(ctx, cx, cy - radius);

    // ── ÇEVİR butonu ──
    const free = this._freeAvailable();
    const bw = Math.min(W * 0.66, 420), bh = Math.max(48, H * 0.085);
    const bx = cx - bw / 2, by = H * 0.845;
    let label, sub, enabled = !this._spinning;
    if (this._spinning) { label = 'DÖNÜYOR…'; sub = ''; }
    else if (free) { label = 'ÜCRETSİZ ÇEVİR'; sub = 'Günlük bedava çevirmen hazır'; }
    else { label = 'ÇEVİR'; sub = this.EXTRA_COST + ' 💎 ile ekstra çevir'; }
    this._drawButton(ctx, 'spin', bx, by, bw, bh, label, sub, enabled, free ? this.COL.green : this.COL.gold);

    // ── Geri butonu ──
    const back = { id: 'back', x: W * 0.04, y: H * 0.04, w: Math.max(64, W * 0.14), h: Math.max(40, H * 0.06) };
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(ctx, back.x, back.y, back.w, back.h, 10); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(back.h * 0.42) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ Geri', back.x + back.w / 2, back.y + back.h / 2);
    ctx.textBaseline = 'alphabetic';
    this._btns.push(back);

    // ── Kazanç popup ──
    if (this._result && this._resultAlpha > 0.01) this._drawResult(ctx, W, H);
  },

  _drawWheel(ctx, cx, cy, r) {
    const N = this.SEGMENTS.length;
    const seg = (Math.PI * 2) / N;

    // Dış glow halka (parıltı).
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 3);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,207,63,' + (0.25 + pulse * 0.35) + ')';
    ctx.lineWidth = 8; ctx.stroke();
    ctx.restore();

    // Dilimler.
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < N; i++) {
      const a0 = i * seg + this._angle;
      const a1 = (i + 1) * seg + this._angle;
      const s = this.SEGMENTS[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; ctx.stroke();

      // Dilim etiketi (ikon + değer) — dilim ortasına, radyal.
      const mid = a0 + seg / 2;
      ctx.save();
      ctx.rotate(mid);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const isJack = s.type === 'jackpot';
      ctx.fillStyle = isJack ? '#3a2b00' : '#ffffff';
      ctx.font = 'bold ' + Math.round(r * 0.11) + 'px system-ui, sans-serif';
      ctx.fillText(s.icon + ' ' + s.label, r * 0.92, 0);
      ctx.restore();
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';

    // Rim ışıkları (yanıp sönen noktalar).
    const bulbs = N * 2;
    for (let i = 0; i < bulbs; i++) {
      const ang = (i / bulbs) * Math.PI * 2 - Math.PI / 2;
      const bx = cx + Math.cos(ang) * (r + 12);
      const by = cy + Math.sin(ang) * (r + 12);
      const on = (Math.sin(this._t * 6 + i * 0.7) > 0) ? 1 : 0.25;
      ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,239,160,' + on + ')';
      ctx.fill();
    }

    // Merkez göbek.
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = this.COL.hub; ctx.fill();
    ctx.strokeStyle = this.COL.gold; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = this.COL.gold;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(r * 0.18) + 'px system-ui, sans-serif';
    ctx.fillText('★', cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  },

  _drawPointer(ctx, cx, topY) {
    // Üstte aşağı bakan üçgen işaretçi.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - 14, topY - 20);
    ctx.lineTo(cx + 14, topY - 20);
    ctx.lineTo(cx, topY + 8);
    ctx.closePath();
    ctx.fillStyle = this.COL.pointer;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  _drawButton(ctx, id, x, y, w, h, label, sub, enabled, col) {
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.5;
    ctx.fillStyle = col;
    this._roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.fillStyle = '#10131f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(h * 0.34) + 'px system-ui, sans-serif';
    ctx.fillText(label, x + w / 2, y + h * (sub ? 0.37 : 0.5));
    if (sub) {
      ctx.font = Math.round(h * 0.20) + 'px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(16,19,31,0.8)';
      ctx.fillText(sub, x + w / 2, y + h * 0.72);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    if (enabled) this._btns.push({ id: id, x: x, y: y, w: w, h: h });
  },

  _drawResult(ctx, W, H) {
    const a = this._resultAlpha;
    ctx.save();
    ctx.globalAlpha = a * 0.72;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a;
    const pw = Math.min(W * 0.8, 480), ph = H * 0.24;
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    const jack = this._result.seg && this._result.seg.type === 'jackpot';
    ctx.fillStyle = this.COL.panel;
    this._roundRect(ctx, px, py, pw, ph, 18); ctx.fill();
    ctx.strokeStyle = jack ? this.COL.gold : this.COL.green;
    ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = jack ? this.COL.gold : this.COL.green;
    ctx.font = 'bold ' + Math.round(ph * 0.22) + 'px system-ui, sans-serif';
    ctx.fillText(jack ? '👑 JACKPOT!' : '🎉 KAZANDIN!', W / 2, py + ph * 0.34);
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(ph * 0.18) + 'px system-ui, sans-serif';
    ctx.fillText(this._result.txt || '', W / 2, py + ph * 0.60);
    ctx.fillStyle = this.COL.mute;
    ctx.font = Math.round(ph * 0.12) + 'px system-ui, sans-serif';
    ctx.fillText('Devam etmek için dokun', W / 2, py + ph * 0.84);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  },

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: handleClick(x, y)  → 'back' | null
  // ══════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    // Kazanç popup açıkken herhangi bir dokunuş popup'ı kapatır.
    if (this._result && this._resultAlpha > 0.5) {
      this._result = null; this._resultAlpha = 0; return null;
    }
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'back') return 'back';
        if (b.id === 'spin') { this._trySpin(); return null; }
        return null;
      }
    }
    return null;
  }
};

// Node/CommonJS ortamında da yüklenebilsin (node --check & test uyumu; tarayıcıda etkisiz).
if (typeof module !== 'undefined' && module.exports) module.exports = LuckWheel;
