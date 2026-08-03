'use strict';
/* ============================================================================
   DERİN GARAJ  (Tuning)  —  bağımsız, kendi kendine yeten modül
   İnce ayar (tuning) + Boyama + Parça Füzyonu + Prestij + Ustalık Ağacı

   • Hiçbir mevcut dosyayı değiştirmez. Tüm durum SaveData altında saklanır
     (localStorage YASAK — yalnızca SaveData.get/set kullanılır).
   • Fizik/araç katmanı yalnızca Tuning.getMultipliers(id) ve Tuning.getPaint(id)
     çağırır; başka bağımlılık yoktur.

   API:
     Tuning.draw(ctx, W, H)          — 'tuning' ekranını çizer
     Tuning.handleClick(x, y)        — tıklamayı işler; 'back' | null döndürür
     Tuning.getMultipliers(vehicleId)— { driveMult, topMult, gripMult,
                                         downforceMult, fuelMult, nitroMult,
                                         prestige } (hepsi sonlu, güvenli)
     Tuning.getPaint(vehicleId)      — { c1, c2, pattern } | null
   ========================================================================== */
const Tuning = {

  // ── Ekran durumu ──────────────────────────────────────────────────────────
  tab: 'tuning',                       // tuning | paint | fusion | prestige | mastery
  _hit: [],                            // draw sırasında dolan tıklama kutuları
  _dragSlider: null,                   // aktif sürüklenen slider anahtarı

  // ── Sabitler ──────────────────────────────────────────────────────────────
  TABS: [
    { id: 'tuning',   label: 'AYAR',    icon: '🔧' },
    { id: 'paint',    label: 'BOYA',    icon: '🎨' },
    { id: 'fusion',   label: 'FÜZYON',  icon: '⚗️' },
    { id: 'prestige', label: 'PRESTİJ', icon: '👑' },
    { id: 'mastery',  label: 'USTALIK', icon: '🌳' }
  ],
  SLIDERS: [
    { id: 'engine',  label: 'Motor Eğrisi / Tork',  icon: '🔧' },
    { id: 'gearing', label: 'Şanzıman / Vites',      icon: '⚙️' },
    { id: 'aero',    label: 'Aero / Downforce',      icon: '🪂' },
    { id: 'tire',    label: 'Lastik Basıncı',        icon: '🔄' }
  ],
  PALETTE: [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#3498db', '#2980b9', '#9b59b6', '#e84393', '#ff7675',
    '#ffffff', '#95a5a6', '#34495e', '#111111', '#c0392b'
  ],
  PATTERNS: ['Yok', 'Şeritler', 'Alevler', 'Kamuflaj', 'Benekler', 'Karbon'],
  MASTERY: [
    { id: 'speed', label: 'Hız',   icon: '💨', per: 0.02, max: 5 },
    { id: 'grip',  label: 'Tutuş', icon: '🔄', per: 0.02, max: 5 },
    { id: 'fuel',  label: 'Yakıt', icon: '⛽', per: 0.03, max: 5 },
    { id: 'nitro', label: 'Nitro', icon: '🔥', per: 0.03, max: 5 }
  ],
  UP_STATS: ['engine', 'suspension', 'tires', 'fuel'],
  UP_MAX: 25,                          // TUNING(2 Agu): 50→25. araç yükseltme tavanı (economy.js UP_MAX + vehicles.js UP_LEVEL_MAX ile aynı)
  FUSION_MAX_TIER: 5,
  FUSION_BASE_COST: 500,               // T1 parça satın alma (altın)

  // ═══════════════════════════════════════════════════════════════════════════
  // KALICI DURUM  (SaveData altında tek anahtar: 'deepGarage')
  // ═══════════════════════════════════════════════════════════════════════════
  _db() {
    let d = null;
    try { d = (typeof SaveData !== 'undefined') ? SaveData.get('deepGarage') : null; } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
    if (!d.tuning   || typeof d.tuning   !== 'object') d.tuning   = {};
    if (!d.paint    || typeof d.paint    !== 'object') d.paint    = {};
    if (!d.fusion   || typeof d.fusion   !== 'object') d.fusion   = {};  // { tier1:count, ... }
    if (!d.prestige || typeof d.prestige !== 'object') d.prestige = {};  // { vid:level }
    if (!d.mastery  || typeof d.mastery  !== 'object') d.mastery  = {};  // { vid:{speed..} }
    return d;
  },
  _commit(d) { try { if (typeof SaveData !== 'undefined') SaveData.set('deepGarage', d); } catch (e) {} },

  _curVid() {
    try { return (typeof SaveData !== 'undefined' && SaveData.get('selectedVehicle')) || 'jeep'; }
    catch (e) { return 'jeep'; }
  },

  _tuningFor(vid) {
    const d = this._db();
    const t = d.tuning[vid];
    return {
      engine:  this._clamp01(t && t.engine,  0.5),
      gearing: this._clamp01(t && t.gearing, 0.5),
      aero:    this._clamp01(t && t.aero,    0.5),
      tire:    this._clamp01(t && t.tire,    0.5)
    };
  },
  _masteryFor(vid) {
    const d = this._db();
    const m = d.mastery[vid] || {};
    const out = {};
    this.MASTERY.forEach(n => {
      const v = Math.floor(Number(m[n.id]));
      out[n.id] = (isFinite(v) && v > 0) ? Math.min(n.max, v) : 0;
    });
    return out;
  },
  _prestigeFor(vid) {
    const d = this._db();
    const p = Math.floor(Number(d.prestige[vid]));
    return (isFinite(p) && p > 0) ? p : 0;
  },
  _highestFusionTier() {
    const d = this._db();
    let top = 0;
    for (let t = 1; t <= this.FUSION_MAX_TIER; t++) {
      const c = Math.floor(Number(d.fusion['tier' + t]));
      if (isFinite(c) && c > 0) top = t;
    }
    return top;
  },

  _clamp01(v, dflt) {
    const n = Number(v);
    if (!isFinite(n)) return dflt;
    return Math.max(0, Math.min(1, n));
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FİZİK ARAYÜZÜ  —  getMultipliers / getPaint  (dış katman yalnızca bunları okur)
  // ═══════════════════════════════════════════════════════════════════════════
  getMultipliers(vehicleId) {
    const vid = vehicleId || this._curVid();
    const neutral = { driveMult: 1, topMult: 1, gripMult: 1, downforceMult: 1, fuelMult: 1, nitroMult: 1, prestige: 0 };
    let out;
    try {
      const t = this._tuningFor(vid);
      const m = this._masteryFor(vid);
      const p = this._prestigeFor(vid);
      const fh = this._highestFusionTier();

      // İnce ayar slider'ları: 0.5 = nötr → aralık ~0.85..1.15 (aero downforce ~0.80..1.20)
      let drive = 0.85 + t.engine  * 0.30;
      let top   = 0.85 + t.gearing * 0.30;
      let grip  = 0.85 + t.tire    * 0.30;
      let down  = 0.80 + t.aero    * 0.40;

      // Ustalık ağacı
      top  *= 1 + (m.speed || 0) * 0.02;
      grip *= 1 + (m.grip  || 0) * 0.02;
      const fuel  = 1 + (m.fuel  || 0) * 0.03;
      const nitro = 1 + (m.nitro || 0) * 0.03;

      // Prestij: kalıcı %3/seviye güç+hız
      const pmul = 1 + p * 0.03;
      drive *= pmul;
      top   *= pmul;

      // Füzyon: en yüksek parça seviyesi +%2/kademe güç
      drive *= 1 + fh * 0.02;

      out = {
        driveMult: drive, topMult: top, gripMult: grip,
        downforceMult: down, fuelMult: fuel, nitroMult: nitro, prestige: p
      };
    } catch (e) { out = neutral; }

    // Sonlu & makul sınırlar (fizik NaN'e karşı guard)
    const safe = (v, d) => (isFinite(v) && v > 0) ? Math.max(0.5, Math.min(3, v)) : d;
    return {
      driveMult:     safe(out.driveMult, 1),
      topMult:       safe(out.topMult, 1),
      gripMult:      safe(out.gripMult, 1),
      downforceMult: safe(out.downforceMult, 1),
      fuelMult:      safe(out.fuelMult, 1),
      nitroMult:     safe(out.nitroMult, 1),
      prestige:      (isFinite(out.prestige) && out.prestige > 0) ? out.prestige : 0
    };
  },

  getPaint(vehicleId) {
    const vid = vehicleId || this._curVid();
    try {
      const d = this._db();
      const p = d.paint[vid];
      if (!p || typeof p !== 'object') return null;
      const c1 = (typeof p.c1 === 'string') ? p.c1 : null;
      const c2 = (typeof p.c2 === 'string') ? p.c2 : null;
      if (!c1 && !c2) return null;
      return { c1: c1 || c2, c2: c2 || c1, pattern: Math.max(0, Math.floor(Number(p.pattern)) || 0) };
    } catch (e) { return null; }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÇİZİM
  // ═══════════════════════════════════════════════════════════════════════════
  _toast(msg) { try { if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(msg); } catch (e) {} },
  _click() { try { if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick(); } catch (e) {} },
  _fx() { try { if (typeof Audio !== 'undefined') { if (Audio.playTierUp) Audio.playTierUp(); else if (Audio.playPickup) Audio.playPickup(); } } catch (e) {} },
  _gold() { try { return Math.floor(Number(SaveData.get('gold'))) || 0; } catch (e) { return 0; } },
  _vehName(vid) { try { return (VehicleDefs[vid] && VehicleDefs[vid].name) || vid; } catch (e) { return vid; } },

  _rect(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  },
  _push(x, y, w, h, action) { this._hit.push({ x, y, w, h, action }); },

  draw(ctx, W, H) {
    this._hit = [];
    const vid = this._curVid();

    // Arka plan
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#101a30'); g.addColorStop(1, '#070b16');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Başlık
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd54a';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText('⚙ DERİN GARAJ', W / 2, 30);
    ctx.fillStyle = '#8fb3ff';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(this._vehName(vid).toUpperCase(), W / 2, 52);

    // Kaynak (altın)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd54a'; ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText('⧆ ' + this._gold(), W - 14, 30);

    // Geri butonu
    this._rect(ctx, 8, 10, 44, 44, 10, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.18)');
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('‹', 30, 32);
    this._push(8, 10, 44, 44, 'back');

    // Sekme şeridi
    const tabY = 66, tabH = 42, pad = 8;
    const tw = (W - pad * 2 - (this.TABS.length - 1) * 4) / this.TABS.length;
    this.TABS.forEach((t, i) => {
      const tx = pad + i * (tw + 4);
      const active = this.tab === t.id;
      this._rect(ctx, tx, tabY, tw, tabH, 8,
        active ? 'rgba(255,180,40,0.92)' : 'rgba(255,255,255,0.07)',
        active ? '#ffe28a' : 'rgba(255,255,255,0.12)');
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#20140a' : '#cdd8ee';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(t.icon, tx + tw / 2, tabY + 15);
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.fillText(t.label, tx + tw / 2, tabY + 31);
      this._push(tx, tabY, tw, tabH, 'tab_' + t.id);
    });

    const bodyY = tabY + tabH + 14;
    if (this.tab === 'tuning')   this._drawTuning(ctx, W, H, bodyY, vid);
    else if (this.tab === 'paint')    this._drawPaint(ctx, W, H, bodyY, vid);
    else if (this.tab === 'fusion')   this._drawFusion(ctx, W, H, bodyY, vid);
    else if (this.tab === 'prestige') this._drawPrestige(ctx, W, H, bodyY, vid);
    else if (this.tab === 'mastery')  this._drawMastery(ctx, W, H, bodyY, vid);
  },

  // ── AYAR (sliderlar) ────────────────────────────────────────────────────────
  _drawTuning(ctx, W, H, y0, vid) {
    const t = this._tuningFor(vid);
    const mul = this.getMultipliers(vid);
    const x0 = 20, x1 = W - 20, rowH = 70;
    this.SLIDERS.forEach((s, i) => {
      const y = y0 + i * rowH;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e6edff'; ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText(s.icon + '  ' + s.label, x0, y);
      const val = t[s.id];
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd54a'; ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText(Math.round(val * 100) + '%', x1, y);

      // Track
      const ty = y + 20, th = 10, tw = x1 - x0;
      this._rect(ctx, x0, ty, tw, th, 5, 'rgba(255,255,255,0.10)', null);
      this._rect(ctx, x0, ty, tw * val, th, 5, '#2ecc71', null);
      // Knob
      const kx = x0 + tw * val;
      ctx.beginPath(); ctx.arc(kx, ty + th / 2, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd54a'; ctx.fill();
      ctx.strokeStyle = '#20140a'; ctx.lineWidth = 2; ctx.stroke();
      // Genişletilmiş tıklama/sürükleme kutusu
      this._push(x0 - 6, ty - 14, tw + 12, th + 28, 'slider_' + s.id);
    });

    // Özet çarpanlar
    const sy = y0 + this.SLIDERS.length * rowH + 6;
    this._rect(ctx, 16, sy, W - 32, 78, 12, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)');
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fb3ff'; ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('SONUÇ ÇARPANLARI (fizik okur)', 28, sy + 18);
    ctx.fillStyle = '#e6edff'; ctx.font = '600 12px system-ui, sans-serif';
    const line = 'Güç ×' + mul.driveMult.toFixed(2) + '   Hız ×' + mul.topMult.toFixed(2) +
                 '   Tutuş ×' + mul.gripMult.toFixed(2);
    const line2 = 'Downforce ×' + mul.downforceMult.toFixed(2) + '   Yakıt ×' + mul.fuelMult.toFixed(2) +
                  '   Nitro ×' + mul.nitroMult.toFixed(2);
    ctx.fillText(line, 28, sy + 42);
    ctx.fillText(line2, 28, sy + 62);

    // Sıfırla butonu
    const by = sy + 92;
    this._rect(ctx, 16, by, W - 32, 40, 10, 'rgba(208,71,58,0.85)', '#ff8a7a');
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText('↺  NÖTRE SIFIRLA', W / 2, by + 20);
    this._push(16, by, W - 32, 40, 'tune_reset');
  },

  // ── BOYA ────────────────────────────────────────────────────────────────────
  _drawPaint(ctx, W, H, y0, vid) {
    const paint = this.getPaint(vid) || { c1: '#5a8a3c', c2: '#3d6626', pattern: 0 };
    ctx.textAlign = 'left'; ctx.font = '700 14px system-ui, sans-serif';

    // Önizleme kutusu
    const pw = W - 40, ph = 64, px = 20;
    this._rect(ctx, px, y0, pw, ph, 12, paint.c1, 'rgba(255,255,255,0.2)');
    this._rect(ctx, px + pw * 0.55, y0, pw * 0.45, ph, 12, paint.c2, null);
    ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('ÖNİZLEME · ' + this.PATTERNS[paint.pattern % this.PATTERNS.length], px + pw / 2, y0 + ph + 4);

    // Ana renk paleti
    let yy = y0 + ph + 24;
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fb3ff'; ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('ANA RENK', 20, yy); yy += 14;
    yy = this._drawSwatches(ctx, W, yy, 'p1_', paint.c1);

    // İkinci renk paleti
    yy += 12;
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fb3ff'; ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('İKİNCİ RENK', 20, yy); yy += 14;
    yy = this._drawSwatches(ctx, W, yy, 'p2_', paint.c2);

    // Desen seçimi
    yy += 16;
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fb3ff'; ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('DESEN / STICKER', 20, yy); yy += 12;
    const bw = (W - 40 - 5 * 4) / 6;
    this.PATTERNS.forEach((name, i) => {
      const bx = 20 + i * (bw + 4);
      const active = (paint.pattern % this.PATTERNS.length) === i;
      this._rect(ctx, bx, yy, bw, 40, 8,
        active ? 'rgba(255,180,40,0.9)' : 'rgba(255,255,255,0.07)',
        active ? '#ffe28a' : 'rgba(255,255,255,0.12)');
      ctx.textAlign = 'center'; ctx.fillStyle = active ? '#20140a' : '#cdd8ee';
      ctx.font = '700 9px system-ui, sans-serif';
      ctx.fillText(name, bx + bw / 2, yy + 22);
      this._push(bx, yy, bw, 40, 'pattern_' + i);
    });

    // Sıfırla (fabrika rengi)
    yy += 56;
    this._rect(ctx, 16, yy, W - 32, 40, 10, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.16)');
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('↺  FABRİKA RENGİNE DÖN', W / 2, yy + 20);
    this._push(16, yy, W - 32, 40, 'paint_clear');
  },
  _drawSwatches(ctx, W, y, prefix, selected) {
    const cols = 8, gap = 6, sw = (W - 40 - (cols - 1) * gap) / cols;
    this.PALETTE.forEach((col, i) => {
      const cx = 20 + (i % cols) * (sw + gap);
      const cy = y + Math.floor(i / cols) * (sw + gap);
      const sel = (col.toLowerCase() === String(selected).toLowerCase());
      this._rect(ctx, cx, cy, sw, sw, 6, col, sel ? '#ffffff' : 'rgba(0,0,0,0.3)');
      if (sel) { ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 3; this._rect(ctx, cx, cy, sw, sw, 6, null, '#ffd54a'); }
      this._push(cx, cy, sw, sw, prefix + i);
    });
    const rows = Math.ceil(this.PALETTE.length / cols);
    return y + rows * (sw + gap);
  },

  // ── FÜZYON ──────────────────────────────────────────────────────────────────
  _fusionCost(tier) { return this.FUSION_BASE_COST * Math.pow(2, tier); },   // T1→T2, ...
  _fusionChance(tier) { return Math.max(0.35, 0.9 - (tier - 1) * 0.13); },   // yükseldikçe zorlaşır

  _drawFusion(ctx, W, H, y0, vid) {
    const d = this._db();
    ctx.textAlign = 'left'; ctx.fillStyle = '#cdd8ee'; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('2 aynı parçayı birleştir → 1 üst kademe parça.', 20, y0);
    ctx.fillText('Başarısızlıkta 1 parça kaybolur. Envanter:', 20, y0 + 18);

    let yy = y0 + 36;
    for (let tier = 1; tier <= this.FUSION_MAX_TIER; tier++) {
      const count = Math.max(0, Math.floor(Number(d.fusion['tier' + tier])) || 0);
      const rowY = yy + (tier - 1) * 52;
      this._rect(ctx, 16, rowY, W - 32, 46, 10, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)');
      const col = ['#8fa5c0', '#5fd35f', '#4aa3ff', '#b06bff', '#ffb03a'][tier - 1] || '#fff';
      ctx.textAlign = 'left'; ctx.fillStyle = col; ctx.font = '800 14px system-ui, sans-serif';
      ctx.fillText('T' + tier, 28, rowY + 24);
      ctx.fillStyle = '#e6edff'; ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('× ' + count, 62, rowY + 24);

      if (tier < this.FUSION_MAX_TIER) {
        const cost = this._fusionCost(tier), chance = this._fusionChance(tier);
        const can = count >= 2;
        const bw = 150, bx = W - 16 - bw;
        this._rect(ctx, bx, rowY + 6, bw, 34, 8,
          can ? 'rgba(46,204,113,0.85)' : 'rgba(255,255,255,0.06)',
          can ? '#7CFFB0' : 'rgba(255,255,255,0.10)');
        ctx.textAlign = 'center'; ctx.fillStyle = can ? '#08210f' : '#5a6478';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText('BİRLEŞTİR ⧆' + cost, bx + bw / 2, rowY + 17);
        ctx.font = '600 9px system-ui, sans-serif';
        ctx.fillText('şans %' + Math.round(chance * 100), bx + bw / 2, rowY + 30);
        if (can) this._push(bx, rowY + 6, bw, 34, 'fuse_' + tier);
      } else {
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffd54a'; ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText('MAKS KADEME', W - 24, rowY + 26);
      }
    }

    // T1 parça satın alma
    const buyY = yy + this.FUSION_MAX_TIER * 52 + 6;
    this._rect(ctx, 16, buyY, W - 32, 42, 10, 'rgba(74,163,255,0.85)', '#9bd0ff');
    ctx.textAlign = 'center'; ctx.fillStyle = '#04121f'; ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('＋ T1 PARÇA SATIN AL  (⧆' + this.FUSION_BASE_COST + ')', W / 2, buyY + 22);
    this._push(16, buyY, W - 32, 42, 'fusion_buy');

    ctx.textAlign = 'center'; ctx.fillStyle = '#8fb3ff'; ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('En yüksek kademe tüm araçlara +%2/kademe güç verir.', W / 2, buyY + 60);
  },

  // ── PRESTİJ ──────────────────────────────────────────────────────────────────
  _isMaxed(vid) {
    try {
      for (let i = 0; i < this.UP_STATS.length; i++) {
        if ((SaveData.getUpgrade(vid, this.UP_STATS[i]) || 1) < this.UP_MAX) return false;
      }
      return true;
    } catch (e) { return false; }
  },
  _drawPrestige(ctx, W, H, y0, vid) {
    const p = this._prestigeFor(vid);
    const maxed = this._isMaxed(vid);

    // Rozet
    ctx.textAlign = 'center';
    ctx.fillStyle = p > 0 ? '#ffd54a' : 'rgba(255,255,255,0.15)';
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('👑', W / 2, y0 + 40);
    ctx.fillStyle = '#e6edff'; ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillText('PRESTİJ ' + p, W / 2, y0 + 84);
    ctx.fillStyle = '#8fb3ff'; ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('Kalıcı bonus: +%' + (p * 3) + ' güç & hız', W / 2, y0 + 108);

    // Açıklama kutusu
    const bx = 16, by = y0 + 128, bw = W - 32, bh = 96;
    this._rect(ctx, bx, by, bw, bh, 12, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)');
    ctx.textAlign = 'left'; ctx.fillStyle = '#cdd8ee'; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('Araç 4 yükseltmesi de MAKS (' + this.UP_MAX + ') olunca prestij', bx + 14, by + 22);
    ctx.fillText('yapabilirsin. Yükseltmeler 1. seviyeye sıfırlanır ama', bx + 14, by + 42);
    ctx.fillText('kalıcı %bonus + prestij rozeti kazanırsın. Ayrıca', bx + 14, by + 62);
    ctx.fillText('+2 ustalık dalı puanı fırsatı açılır.', bx + 14, by + 82);

    // Durum & buton
    const btnY = by + bh + 14;
    if (maxed) {
      this._rect(ctx, 16, btnY, W - 32, 48, 12, 'rgba(255,180,40,0.92)', '#ffe28a');
      ctx.textAlign = 'center'; ctx.fillStyle = '#20140a'; ctx.font = '800 16px system-ui, sans-serif';
      ctx.fillText('👑  PRESTİJ YAP', W / 2, btnY + 26);
      this._push(16, btnY, W - 32, 48, 'do_prestige');
    } else {
      this._rect(ctx, 16, btnY, W - 32, 48, 12, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.10)');
      ctx.textAlign = 'center'; ctx.fillStyle = '#7c8aa5'; ctx.font = '700 13px system-ui, sans-serif';
      ctx.fillText('Önce tüm yükseltmeleri MAKS yap', W / 2, btnY + 26);
    }
  },

  // ── USTALIK AĞACI ─────────────────────────────────────────────────────────────
  _masteryCost(level) { return 800 + level * 700; },   // altınla
  _drawMastery(ctx, W, H, y0, vid) {
    const m = this._masteryFor(vid);
    const mul = this.getMultipliers(vid);
    ctx.textAlign = 'left'; ctx.fillStyle = '#cdd8ee'; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('Araca özel yetenek dalları (altınla yükselt):', 20, y0);

    let yy = y0 + 18;
    this.MASTERY.forEach((n) => {
      const lv = m[n.id] || 0;
      const rowH = 62, ry = yy;
      this._rect(ctx, 16, ry, W - 32, rowH - 10, 12, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)');
      ctx.textAlign = 'left'; ctx.fillStyle = '#e6edff'; ctx.font = '700 14px system-ui, sans-serif';
      ctx.fillText(n.icon + '  ' + n.label, 28, ry + 20);
      ctx.fillStyle = '#8fb3ff'; ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillText('+%' + Math.round(lv * n.per * 100) + ' (Sv ' + lv + '/' + n.max + ')', 28, ry + 38);

      // Seviye pipleri
      const pipX = 150, pipW = 12, pipGap = 5;
      for (let i = 0; i < n.max; i++) {
        this._rect(ctx, pipX + i * (pipW + pipGap), ry + 10, pipW, 8, 3,
          i < lv ? '#2ecc71' : 'rgba(255,255,255,0.12)', null);
      }

      // + Buton
      const maxed = lv >= n.max;
      const cost = this._masteryCost(lv);
      const bw = 92, bx = W - 16 - bw;
      this._rect(ctx, bx, ry + 8, bw, 34, 8,
        maxed ? 'rgba(255,255,255,0.06)' : 'rgba(46,204,113,0.85)',
        maxed ? 'rgba(255,255,255,0.10)' : '#7CFFB0');
      ctx.textAlign = 'center';
      if (maxed) {
        ctx.fillStyle = '#7c8aa5'; ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText('MAKS', bx + bw / 2, ry + 27);
      } else {
        ctx.fillStyle = '#08210f'; ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillText('＋ ⧆' + cost, bx + bw / 2, ry + 27);
        this._push(bx, ry + 8, bw, 34, 'mastery_' + n.id);
      }
      yy += rowH;
    });

    // Özet
    const sy = yy + 4;
    this._rect(ctx, 16, sy, W - 32, 52, 12, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.10)');
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fb3ff'; ctx.font = '700 12px system-ui, sans-serif';
    ctx.fillText('TOPLAM ETKİ', 28, sy + 20);
    ctx.fillStyle = '#e6edff'; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('Hız ×' + mul.topMult.toFixed(2) + '  Tutuş ×' + mul.gripMult.toFixed(2) +
                 '  Yakıt ×' + mul.fuelMult.toFixed(2) + '  Nitro ×' + mul.nitroMult.toFixed(2), 28, sy + 40);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIKLAMA İŞLEME
  // ═══════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    // Slider sürükleme kutuları önce (track içinde herhangi bir nokta = değer)
    for (let i = 0; i < this._hit.length; i++) {
      const h = this._hit[i];
      if (x < h.x || x > h.x + h.w || y < h.y || y > h.y + h.h) continue;
      const a = h.action;

      if (a === 'back') { this._click(); return 'back'; }

      if (a.indexOf('tab_') === 0) { this.tab = a.slice(4); this._click(); return null; }

      if (a.indexOf('slider_') === 0) {
        const key = a.slice(7);
        const tw = h.w - 12, tx0 = h.x + 6;
        let v = (x - tx0) / tw;
        v = Math.max(0, Math.min(1, v));
        this._setTuning(this._curVid(), key, v);
        this._click();
        return null;
      }

      if (a === 'tune_reset') {
        const d = this._db(); d.tuning[this._curVid()] = { engine: 0.5, gearing: 0.5, aero: 0.5, tire: 0.5 };
        this._commit(d); this._click(); this._toast('İnce ayar nötre sıfırlandı'); return null;
      }

      // Boya
      if (a.indexOf('p1_') === 0) { this._setPaintColor(1, this.PALETTE[parseInt(a.slice(3), 10)]); this._click(); return null; }
      if (a.indexOf('p2_') === 0) { this._setPaintColor(2, this.PALETTE[parseInt(a.slice(3), 10)]); this._click(); return null; }
      if (a.indexOf('pattern_') === 0) { this._setPattern(parseInt(a.slice(8), 10)); this._click(); return null; }
      if (a === 'paint_clear') {
        const d = this._db(); delete d.paint[this._curVid()]; this._commit(d);
        this._click(); this._toast('Fabrika rengine dönüldü'); return null;
      }

      // Füzyon
      if (a === 'fusion_buy') { this._buyFusionPart(); return null; }
      if (a.indexOf('fuse_') === 0) { this._doFusion(parseInt(a.slice(5), 10)); return null; }

      // Prestij
      if (a === 'do_prestige') { this._doPrestige(this._curVid()); return null; }

      // Ustalık
      if (a.indexOf('mastery_') === 0) { this._buyMastery(this._curVid(), a.slice(8)); return null; }

      return null;
    }
    return null;
  },

  _setTuning(vid, key, v) {
    const d = this._db();
    if (!d.tuning[vid]) d.tuning[vid] = { engine: 0.5, gearing: 0.5, aero: 0.5, tire: 0.5 };
    d.tuning[vid][key] = this._clamp01(v, 0.5);
    this._commit(d);
  },
  _setPaintColor(slot, col) {
    if (typeof col !== 'string') return;
    const vid = this._curVid(), d = this._db();
    const cur = d.paint[vid] || { c1: '#5a8a3c', c2: '#3d6626', pattern: 0 };
    if (slot === 1) cur.c1 = col; else cur.c2 = col;
    d.paint[vid] = cur; this._commit(d);
  },
  _setPattern(idx) {
    const vid = this._curVid(), d = this._db();
    const cur = d.paint[vid] || { c1: '#5a8a3c', c2: '#3d6626', pattern: 0 };
    cur.pattern = Math.max(0, Math.floor(idx) || 0);
    d.paint[vid] = cur; this._commit(d);
  },

  _buyFusionPart() {
    if (this._gold() < this.FUSION_BASE_COST) { this._toast('Yetersiz altın!'); return; }
    let ok = false;
    try { ok = SaveData.spendGold(this.FUSION_BASE_COST); } catch (e) { ok = false; }
    if (!ok) { this._toast('Yetersiz altın!'); return; }
    const d = this._db();
    d.fusion.tier1 = (Math.floor(Number(d.fusion.tier1)) || 0) + 1;
    this._commit(d); this._click(); this._toast('🔩 T1 parça alındı');
  },
  _doFusion(tier) {
    if (!(tier >= 1 && tier < this.FUSION_MAX_TIER)) return;
    const d = this._db();
    const key = 'tier' + tier, nkey = 'tier' + (tier + 1);
    const have = Math.floor(Number(d.fusion[key])) || 0;
    if (have < 2) { this._toast('En az 2 adet T' + tier + ' gerekli'); return; }
    const cost = this._fusionCost(tier);
    if (this._gold() < cost) { this._toast('Yetersiz altın!'); return; }
    let ok = false;
    try { ok = SaveData.spendGold(cost); } catch (e) { ok = false; }
    if (!ok) { this._toast('Yetersiz altın!'); return; }
    // 2 parça tüketilir
    d.fusion[key] = have - 2;
    const success = Math.random() < this._fusionChance(tier);
    if (success) {
      d.fusion[nkey] = (Math.floor(Number(d.fusion[nkey])) || 0) + 1;
      this._commit(d); this._fx(); this._toast('✨ Füzyon başarılı! T' + (tier + 1) + ' üretildi');
    } else {
      // başarısızlıkta 1 parça geri iade (net kayıp = 1)
      d.fusion[key] = (Math.floor(Number(d.fusion[key])) || 0) + 1;
      this._commit(d); this._click(); this._toast('💥 Füzyon başarısız — 1 parça kayboldu');
    }
  },

  _doPrestige(vid) {
    if (!this._isMaxed(vid)) { this._toast('Tüm yükseltmeler MAKS değil'); return; }
    const d = this._db();
    const cur = this._prestigeFor(vid);
    d.prestige[vid] = cur + 1;
    // +2 ustalık puanı fırsatı: iki dalı otomatik +1 (kullanıcıya kalıcı fayda)
    if (!d.mastery[vid]) d.mastery[vid] = {};
    // Yükseltmeleri 1. seviyeye sıfırla
    try { this.UP_STATS.forEach(s => SaveData.setUpgrade(vid, s, 1)); } catch (e) {}
    this._commit(d);
    this._fx();
    this._toast('👑 PRESTİJ ' + (cur + 1) + '! Kalıcı +%' + ((cur + 1) * 3) + ' güç & hız');
  },

  _buyMastery(vid, branch) {
    const node = this.MASTERY.find(n => n.id === branch);
    if (!node) return;
    const m = this._masteryFor(vid);
    const lv = m[branch] || 0;
    if (lv >= node.max) { this._toast('Bu dal MAKS'); return; }
    const cost = this._masteryCost(lv);
    if (this._gold() < cost) { this._toast('Yetersiz altın!'); return; }
    let ok = false;
    try { ok = SaveData.spendGold(cost); } catch (e) { ok = false; }
    if (!ok) { this._toast('Yetersiz altın!'); return; }
    const d = this._db();
    if (!d.mastery[vid]) d.mastery[vid] = {};
    d.mastery[vid][branch] = lv + 1;
    this._commit(d); this._fx(); this._toast('🌳 ' + node.label + ' Sv ' + (lv + 1));
  }
};

if (typeof window !== 'undefined') window.Tuning = Tuning;
if (typeof module !== 'undefined' && module.exports) module.exports = Tuning;
