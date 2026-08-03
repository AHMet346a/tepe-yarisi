'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   PAINT SHOP  —  ARAÇ BOYA STÜDYOSU
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıklar hepsi güvenli-opsiyonel (typeof guard):
     · SaveData.get/set   → kalıcılık (localStorage YOK; sadece SaveData)
     · UI.showToast       → bildirim (opsiyonel)
     · Audio.*            → ses efekti (opsiyonel)

   Seçili araca RENK + DESEN + KAPLAMA uygular ve SaveData'da 'paintJobs'
   altında araç id'sine göre saklar. Renderer ileride PaintShop.getPaint(vid)
   ile boyayı okuyabilir.

   ZORUNLU API
     PaintShop.draw(ctx, W, H, dt)   → tam ekran boya stüdyosu ekranı
     PaintShop.handleClick(x, y)     → 'back' | null
     PaintShop.getPaint(vehId)       → { color, pattern, finish }
     PaintShop.update(dt)            → (opsiyonel) animasyon saatini ilerletir

   KURALLAR: localStorage kullanmaz. dt NaN korumalı. Kare-bağımsız animasyon.
   ═══════════════════════════════════════════════════════════════════════════ */
const PaintShop = {

  // ── Kalıcılık anahtarı ──────────────────────────────────────────────────────
  _SAVE_KEY: 'paintJobs',

  // ── Tema (oyunun koyu lacivert / turuncu paleti) ────────────────────────────
  COL: {
    bg0:'#0b1020', bg1:'#1b2a4a', panel:'#141d38', line:'rgba(255,255,255,0.10)',
    text:'#eef3ff', mute:'#8ea0c8', orange:'#ff8a3d', gold:'#ffd54a',
    green:'#39d98a', red:'#ff5a5a'
  },

  // ── 12+ renk paleti ─────────────────────────────────────────────────────────
  COLORS: [
    '#e53935','#ff8a3d','#ffd54a','#8bc34a','#26a69a','#29b6f6',
    '#3f6fd6','#7a5cff','#d94f8a','#ffffff','#9aa4bb','#232a3f'
  ],

  // ── Desenler ────────────────────────────────────────────────────────────────
  PATTERNS: [
    { id:'solid', label:'Düz' },
    { id:'stripe', label:'Çizgili' },
    { id:'flame', label:'Alev' },
    { id:'camo', label:'Kamuflaj' },
    { id:'metal', label:'Metalik' }
  ],

  // ── Kaplamalar ──────────────────────────────────────────────────────────────
  FINISHES: [
    { id:'matte', label:'Mat' },
    { id:'gloss', label:'Parlak' }
  ],

  // ── Varsayılan boya ─────────────────────────────────────────────────────────
  _DEFAULT: { color:'#ff8a3d', pattern:'solid', finish:'gloss' },

  // ── Çalışma zamanı durumu ────────────────────────────────────────────────────
  _sel: null,          // { color, pattern, finish } — düzenlenen (henüz uygulanmamış) seçim
  _vid: null,          // aktif araç id'si
  _t: 0,               // animasyon saati (araç dönüşü / parıltı)
  _lastNow: 0,
  _extDriven: false,
  _updatedThisFrame: false,
  _btns: [],           // her draw'da yeniden doldurulan tıklama hedefleri
  _flash: 0,           // "UYGULA" sonrası kısa vurgu animasyonu

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },
  _now() { return (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0; },

  _sfx(name) {
    try { if (typeof Audio !== 'undefined' && typeof Audio[name] === 'function') Audio[name](); } catch (e) {}
  },
  _toast(msg) {
    try { if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') UI.showToast(msg); } catch (e) {}
  },

  // Seçili aracın id'sini birden fazla olası anahtardan bulmaya çalış.
  _selectedVehicleId() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const v = SaveData.get('selectedVehicle') || SaveData.get('currentVehicle') || 'jeep';
        if (typeof v === 'string' && v) return v;
      }
    } catch (e) {}
    return 'jeep';
  },

  // Kayıtlı tüm boya işlerini güvenli oku.
  _allPaints() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const p = SaveData.get(this._SAVE_KEY, {});
        if (p && typeof p === 'object' && !Array.isArray(p)) return p;
      }
    } catch (e) {}
    return {};
  },

  // Bir boya objesini doğrula / eksikleri varsayılanla tamamla.
  _sanitize(p) {
    const d = this._DEFAULT;
    if (!p || typeof p !== 'object') return { color:d.color, pattern:d.pattern, finish:d.finish };
    const color = (typeof p.color === 'string' && p.color) ? p.color : d.color;
    const pattern = this.PATTERNS.some(x => x.id === p.pattern) ? p.pattern : d.pattern;
    const finish = this.FINISHES.some(x => x.id === p.finish) ? p.finish : d.finish;
    return { color: color, pattern: pattern, finish: finish };
  },

  // Aktif aracı belirle ve düzenleme seçimini kayıtlı boyadan (veya varsayılandan) yükle.
  _sync() {
    const vid = this._selectedVehicleId();
    if (this._vid !== vid || !this._sel) {
      this._vid = vid;
      const saved = this._allPaints()[vid];
      this._sel = this._sanitize(saved);
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: getPaint(vehId)  → { color, pattern, finish }
  // ══════════════════════════════════════════════════════════════════════════
  getPaint(vehId) {
    const vid = (typeof vehId === 'string' && vehId) ? vehId : this._selectedVehicleId();
    return this._sanitize(this._allPaints()[vid]);
  },

  // ── Seçimi kaydet (UYGULA) ──────────────────────────────────────────────────
  _apply() {
    this._sync();
    const jobs = this._allPaints();
    jobs[this._vid] = this._sanitize(this._sel);
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, jobs); } catch (e) {}
    this._flash = 1;
    this._sfx('playPurchase');
    this._toast('🎨 Boya uygulandı!');
  },

  // ── Varsayılana döndür (SIFIRLA) ────────────────────────────────────────────
  _reset() {
    this._sync();
    const jobs = this._allPaints();
    if (jobs[this._vid]) { delete jobs[this._vid]; }
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, jobs); } catch (e) {}
    const d = this._DEFAULT;
    this._sel = { color:d.color, pattern:d.pattern, finish:d.finish };
    this._flash = 1;
    this._sfx('playMenuClick');
    this._toast('↺ Boya sıfırlandı');
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ZAMAN İLERLETME
  // ══════════════════════════════════════════════════════════════════════════
  _advance(dt) {
    dt = this._num(dt, 0);
    if (dt < 0) dt = 0; if (dt > 0.05) dt = 0.05;   // kare atlama koruması
    this._t += dt;
    if (this._flash > 0) this._flash = Math.max(0, this._flash - dt * 2);
  },

  update(dt) {
    this._extDriven = true;
    this._updatedThisFrame = true;
    this._advance(dt);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: draw(ctx, W, H [, dt])
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H, dt) {
    // Zaman: update() dışarıdan çağrılmadıysa kendi saatimizle ilerle.
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

    W = this._num(W, 800); H = this._num(H, 600);
    this._sync();
    this._btns = [];
    const C = this.COL;

    // ── Arka plan gradyanı ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // ── Başlık ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.orange;
    ctx.font = 'bold ' + Math.round(H * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('🎨 BOYA STÜDYOSU', W / 2, H * 0.085);
    ctx.fillStyle = C.mute;
    ctx.font = Math.round(H * 0.024) + 'px system-ui, sans-serif';
    ctx.fillText('Araç: ' + (this._vid || 'jeep'), W / 2, H * 0.125);

    // ── Geri butonu (sol üst) ──
    const back = { x: W * 0.035, y: H * 0.035, w: Math.max(64, W * 0.13), h: Math.max(38, H * 0.058), act:'back' };
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(ctx, back.x, back.y, back.w, back.h, 10); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = 'bold ' + Math.round(back.h * 0.42) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ Geri', back.x + back.w / 2, back.y + back.h / 2);
    ctx.textBaseline = 'alphabetic';
    this._btns.push(back);

    // ── YATAY TELEFON: İKİ SÜTUN (29 Tmz) ────────────────────────────────
    // 🔴 Düzen tamamen H kesirlerine dayanıyordu. Yatayda (H≈360) araç
    //   önizlemesi + 3 bölüm + alt butonlar aynı dikey eksene sığmıyor;
    //   "KAPLAMA" satırı UYGULA/SIFIRLA butonlarının ÜSTÜNE biniyordu
    //   (canlı ölçümde finish ∩ apply çakışması). Yanlış butona basma riski.
    //   ▶ Yatayda: SOL sütun = araç önizleme + alt butonlar,
    //              SAĞ sütun = renk / desen / kaplama.
    const _yatay = (H < 480);

    // ── Araç önizleme kutusu ──
    const pvW = _yatay ? Math.min(W * 0.34, 300) : Math.min(W * 0.78, 520);
    const pvH = _yatay ? Math.min(H * 0.55, 210) : H * 0.26;
    const pvX = _yatay ? (W * 0.035) : (W / 2 - pvW / 2);
    const pvY = _yatay ? (H * 0.20) : (H * 0.155);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    this._roundRect(ctx, pvX, pvY, pvW, pvH, 16); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    this._drawVehiclePreview(ctx, pvX + pvW / 2, pvY + pvH * 0.56, pvW * 0.34);

    // ── İçerik sütunu ──
    const icX = _yatay ? (pvX + pvW + W * 0.035) : (W * 0.06);
    const icW = _yatay ? (W - icX - W * 0.035) : (W - W * 0.12);

    // ── Renk paleti ──
    let y = _yatay ? (H * 0.20) : (pvY + pvH + H * 0.03);
    ctx.fillStyle = C.text;
    ctx.font = 'bold ' + Math.round(Math.min(H * 0.026, W * 0.030)) + 'px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const padX = icX;
    ctx.fillText('RENK', padX, y);
    y += H * 0.012;
    const cols = 6;
    const gap = _yatay ? 8 : 10;
    // ⚠ Kutu boyu H'ye bağlıydı → yatayda 21 px oluyordu. Artık SÜTUN
    //   genişliğine göre ve 44 px hedefine yakın.
    const sw = Math.max(30, Math.min((icW - (cols - 1) * gap) / cols, _yatay ? 44 : Math.max(30, H * 0.06)));
    for (let i = 0; i < this.COLORS.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const sx = padX + c * (sw + gap);
      const sy = y + r * (sw + gap);
      const col = this.COLORS[i];
      ctx.fillStyle = col;
      this._roundRect(ctx, sx, sy, sw, sw, 8); ctx.fill();
      if (this._sel.color === col) {
        ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
        this._roundRect(ctx, sx - 2, sy - 2, sw + 4, sw + 4, 9); ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      }
      this._btns.push({ x: sx, y: sy, w: sw, h: sw, act:'color', val: col });
    }
    y += Math.ceil(this.COLORS.length / cols) * (sw + gap) + H * 0.02;

    // ── Desen seçimi ──
    ctx.fillStyle = C.text;
    ctx.font = 'bold ' + Math.round(Math.min(H * 0.026, W * 0.030)) + 'px system-ui, sans-serif';
    ctx.fillText('DESEN', padX, y);
    y += H * 0.012;
    const chipH = _yatay ? 40 : Math.max(34, H * 0.05);
    const _icSag = padX + icW;                     // içerik sütununun sağ sınırı
    let cx = padX;
    for (let i = 0; i < this.PATTERNS.length; i++) {
      const p = this.PATTERNS[i];
      const cw = this._chipWidth(ctx, p.label, chipH);
      if (cx + cw > _icSag) { cx = padX; y += chipH + 8; }
      const on = this._sel.pattern === p.id;
      this._drawChip(ctx, cx, y, cw, chipH, p.label, on);
      this._btns.push({ x: cx, y: y, w: cw, h: chipH, act:'pattern', val: p.id });
      cx += cw + 8;
    }
    y += chipH + (_yatay ? 14 : H * 0.022);

    // ── Kaplama ──
    ctx.fillStyle = C.text;
    ctx.font = 'bold ' + Math.round(Math.min(H * 0.026, W * 0.030)) + 'px system-ui, sans-serif';
    ctx.fillText('KAPLAMA', padX, y);
    y += H * 0.012;
    cx = padX;
    for (let i = 0; i < this.FINISHES.length; i++) {
      const f = this.FINISHES[i];
      const cw = this._chipWidth(ctx, f.label, chipH);
      if (cx + cw > _icSag) { cx = padX; y += chipH + 8; }
      const on = this._sel.finish === f.id;
      this._drawChip(ctx, cx, y, cw, chipH, f.label, on);
      this._btns.push({ x: cx, y: y, w: cw, h: chipH, act:'finish', val: f.id });
      cx += cw + 8;
    }

    // ── UYGULA / SIFIRLA butonları ──
    // Yatayda SOL sütunun altına (önizlemenin altı); dikeyde ekranın altına.
    const bh = Math.max(46, _yatay ? 46 : H * 0.078);
    const by = _yatay ? Math.min(H - bh - 8, pvY + pvH + 10) : (H - bh - H * 0.03);
    const bgap = _yatay ? 10 : W * 0.03;
    const bw = _yatay ? ((pvW - bgap) / 2) : ((Math.min(W * 0.88, 520) - bgap) / 2);
    const bx0 = _yatay ? pvX : (W / 2 - (bw * 2 + bgap) / 2);
    this._drawButton(ctx, bx0, by, bw, bh, 'UYGULA', C.green, 'apply');
    this._drawButton(ctx, bx0 + bw + bgap, by, bw, bh, 'SIFIRLA', C.red, 'reset');
  },

  // ── Araç önizlemesi: seçili renk + desen + kaplama ile basit gövde ──────────
  _drawVehiclePreview(ctx, cx, cy, scale) {
    const C = this.COL;
    const col = this._sel.color;
    const bob = Math.sin(this._t * 2) * scale * 0.03;             // hafif salınım
    const tilt = Math.sin(this._t * 1.3) * 0.05;                 // hafif dönüş
    cy += bob;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    const bw = scale * 1.6, bh = scale * 0.62;

    // Gölge
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, bh * 0.95, bw * 0.55, bh * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Gövde (roundRect) — kaplamaya göre gradyan/düz.
    const bx = -bw / 2, byy = -bh / 2;
    if (this._sel.finish === 'gloss') {
      const gg = ctx.createLinearGradient(0, byy, 0, byy + bh);
      gg.addColorStop(0, this._lighten(col, 0.35));
      gg.addColorStop(0.5, col);
      gg.addColorStop(1, this._lighten(col, -0.25));
      ctx.fillStyle = gg;
    } else {
      ctx.fillStyle = this._lighten(col, -0.05);
    }
    this._roundRect(ctx, bx, byy, bw, bh, bh * 0.35); ctx.fill();

    // Kabin
    ctx.fillStyle = this._lighten(col, this._sel.finish === 'gloss' ? 0.15 : -0.1);
    this._roundRect(ctx, bx + bw * 0.28, byy - bh * 0.45, bw * 0.42, bh * 0.55, bh * 0.25); ctx.fill();
    // Cam
    ctx.fillStyle = 'rgba(180,220,255,0.55)';
    this._roundRect(ctx, bx + bw * 0.33, byy - bh * 0.35, bw * 0.32, bh * 0.38, bh * 0.18); ctx.fill();

    // Desen katmanı (gövde üstüne kırpılmış)
    ctx.save();
    this._roundRect(ctx, bx, byy, bw, bh, bh * 0.35); ctx.clip();
    this._drawPattern(ctx, bx, byy, bw, bh, col);
    ctx.restore();

    // Parlak kaplama highlight
    if (this._sel.finish === 'gloss') {
      const hl = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(this._t * 3));
      ctx.save();
      this._roundRect(ctx, bx, byy, bw, bh, bh * 0.35); ctx.clip();
      ctx.globalAlpha = hl;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(bx + bw * 0.3, byy + bh * 0.2, bw * 0.35, bh * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Tekerlekler
    ctx.fillStyle = '#1a1e2b';
    const wr = bh * 0.42;
    for (const wx of [bx + bw * 0.22, bx + bw * 0.78]) {
      ctx.beginPath(); ctx.arc(wx, byy + bh, wr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this._lighten(col, 0.2);
      ctx.beginPath(); ctx.arc(wx, byy + bh, wr * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1e2b';
    }

    ctx.restore();

    // "UYGULA" sonrası parıltı halkası
    if (this._flash > 0.01) {
      ctx.save();
      ctx.globalAlpha = this._flash * 0.6;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * (1.0 + (1 - this._flash) * 0.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },

  // ── Desenler ────────────────────────────────────────────────────────────────
  _drawPattern(ctx, x, y, w, h, base) {
    const p = this._sel.pattern;
    if (p === 'solid') return;
    const acc = this._lighten(base, -0.4);
    const acc2 = this._lighten(base, 0.35);

    if (p === 'stripe') {
      ctx.strokeStyle = acc2; ctx.lineWidth = h * 0.12;
      for (let sx = x - h; sx < x + w + h; sx += h * 0.4) {
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + h, y + h); ctx.stroke();
      }
    } else if (p === 'flame') {
      ctx.fillStyle = '#ff6a00';
      for (let i = 0; i < 5; i++) {
        const fx = x + w * (0.1 + i * 0.16);
        ctx.beginPath();
        ctx.moveTo(fx, y + h);
        ctx.quadraticCurveTo(fx + w * 0.02, y + h * 0.4, fx + w * 0.06, y + h * 0.2);
        ctx.quadraticCurveTo(fx + w * 0.09, y + h * 0.5, fx + w * 0.12, y + h);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ffd54a';
      for (let i = 0; i < 5; i++) {
        const fx = x + w * (0.11 + i * 0.16);
        ctx.beginPath();
        ctx.moveTo(fx, y + h);
        ctx.quadraticCurveTo(fx + w * 0.015, y + h * 0.55, fx + w * 0.04, y + h * 0.38);
        ctx.quadraticCurveTo(fx + w * 0.06, y + h * 0.6, fx + w * 0.08, y + h);
        ctx.closePath(); ctx.fill();
      }
    } else if (p === 'camo') {
      const blobs = [acc, acc2, this._lighten(base, -0.2)];
      for (let i = 0; i < 14; i++) {
        const bx = x + ((i * 37) % 100) / 100 * w;
        const by = y + ((i * 53) % 100) / 100 * h;
        const br = h * (0.18 + ((i * 7) % 10) / 40);
        ctx.fillStyle = blobs[i % blobs.length];
        ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.7, i, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p === 'metal') {
      const gg = ctx.createLinearGradient(x, y, x + w, y + h);
      gg.addColorStop(0, 'rgba(255,255,255,0.05)');
      gg.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      gg.addColorStop(0.55, 'rgba(255,255,255,0.05)');
      gg.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = gg; ctx.fillRect(x, y, w, h);
    }
  },

  // ── Chip (desen/kaplama seçim etiketi) ──────────────────────────────────────
  _chipWidth(ctx, label, h) {
    ctx.font = 'bold ' + Math.round(h * 0.4) + 'px system-ui, sans-serif';
    return Math.max(h * 1.6, ctx.measureText(label).width + h * 0.9);
  },
  _drawChip(ctx, x, y, w, h, label, on) {
    const C = this.COL;
    ctx.fillStyle = on ? C.orange : 'rgba(255,255,255,0.07)';
    this._roundRect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = on ? C.gold : C.line; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
    ctx.fillStyle = on ? '#10131f' : C.text;
    ctx.font = 'bold ' + Math.round(h * 0.4) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  },

  // ── Aksiyon butonu ──────────────────────────────────────────────────────────
  _drawButton(ctx, x, y, w, h, label, col, act) {
    ctx.save();
    ctx.fillStyle = col;
    this._roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.fillStyle = '#0d1120';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(h * 0.38) + 'px system-ui, sans-serif';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.restore();
    this._btns.push({ x: x, y: y, w: w, h: h, act: act });
  },

  // ── Renk aydınlatma / karartma (amt: -1..1) ─────────────────────────────────
  _lighten(hex, amt) {
    let c = String(hex || '#888888').replace('#', '');
    if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    let r = parseInt(c.slice(0, 2), 16), gg = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    if (!isFinite(r)) r = 136; if (!isFinite(gg)) gg = 136; if (!isFinite(b)) b = 136;
    const f = (v) => {
      let n = amt >= 0 ? v + (255 - v) * amt : v * (1 + amt);
      return Math.max(0, Math.min(255, Math.round(n)));
    };
    const hx = (v) => ('0' + v.toString(16)).slice(-2);
    return '#' + hx(f(r)) + hx(f(gg)) + hx(f(b));
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
    this._sync();
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        switch (b.act) {
          case 'back':    return 'back';
          case 'color':   this._sel.color = b.val; this._sfx('playMenuClick'); return null;
          case 'pattern': this._sel.pattern = b.val; this._sfx('playMenuClick'); return null;
          case 'finish':  this._sel.finish = b.val; this._sfx('playMenuClick'); return null;
          case 'apply':   this._apply(); return null;
          case 'reset':   this._reset(); return null;
          default:        return null;
        }
      }
    }
    return null;   // dış tıklama → seçim yok, menüde kal
  }
};

// Node/CommonJS uyumu (node --check & test); tarayıcıda etkisiz.
if (typeof module !== 'undefined' && module.exports) module.exports = PaintShop;

// Global erişim (integrator bunu bekler).
if (typeof window !== 'undefined') window.PaintShop = PaintShop;
