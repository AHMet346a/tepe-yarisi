'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   CARD COLLECTION  —  ARAÇ KART KOLEKSİYONU
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Her araç bir KART'tır. Kartlar koşularda / sandık-
   larda parça olarak düşer; yeterince toplanınca araç KİLİDİ AÇILIR ve kart
   YILDIZI (1-5) yükselir. Fazla kart "birleştirilir" → yıldız + kalıcı küçük
   güç bonusu (powerMult).

   BAĞIMLILIKLAR (hepsi güvenli-opsiyonel, typeof guard'lı):
     · SaveData.get/set            → kalıcılık (localStorage YOK — her şey SaveData)
     · SaveData.unlockVehicle      → kart yıldız 1'e ulaşınca araç açılır
     · VehicleDefs                 → araç listesi, isim, renk, fiyat (nadirlik)
     · UI.showToast / UI.currentScreen → bildirim & aktiflik kontrolü
     · Audio.* , Particles.*       → efektler

   API
     CardCollection.draw(ctx, W, H)
     CardCollection.handleClick(x, y)  → 'back' | null   (kaydırmayı kendi yönetir)
     CardCollection.grantCard(vehId, n)                  → kart parçası düşür
     CardCollection.getCardBonus(vehId)                  → { powerMult }  (yoksa 1)
     CardCollection.rarityOf(vehId)                      → 'bronze'|'silver'|'gold'|'legendary'

   KURALLAR: localStorage kullanmaz. Tüm para/kart girişleri NaN korumalıdır.
   ═══════════════════════════════════════════════════════════════════════════ */
const CardCollection = {

  _SAVE_KEY: 'cardCollection',
  MAX_STAR: 5,

  // ── Tema (koyu / turuncu) ─────────────────────────────────────────────────
  COL: {
    bg0: '#0a0e1c', bg1: '#141a30',
    panel: '#171d33', panelHi: '#1e2745',
    line: 'rgba(255,255,255,0.09)',
    text: '#f2f5ff', mute: '#8b97b8',
    orange: '#ff8a2b', orangeHi: '#ffb44d', gold: '#ffcf3f',
    lock: 'rgba(4,6,14,0.72)'
  },

  // ── Nadirlik tanımları (fiyattan türetilir) ───────────────────────────────
  RARITY: {
    bronze:    { label: 'BRONZ',  col: '#cd7f32', col2: '#8a5322', glow: 0,  unlock: 8,  order: 0 },
    silver:    { label: 'GÜMÜŞ',  col: '#c9d2dc', col2: '#8794a3', glow: 0,  unlock: 12, order: 1 },
    gold:      { label: 'ALTIN',  col: '#ffd23f', col2: '#b9860a', glow: 6,  unlock: 20, order: 2 },
    legendary: { label: 'EFSANE', col: '#c74bff', col2: '#7a1ec2', glow: 12, unlock: 32, order: 3 }
  },
  _RARITY_ORDER: ['bronze', 'silver', 'gold', 'legendary'],

  // ── Çalışma zamanı durumu ─────────────────────────────────────────────────
  _state: null,
  _filter: 'all',        // 'all' | 'bronze' | 'silver' | 'gold' | 'legendary'
  _scroll: 0,
  _maxScroll: 0,
  _sel: null,            // seçili kart id (detay şeridi için)
  _t: 0,
  _tabs: [],             // her draw'da yeniden doldurulan tıklama hedefleri
  _cards: [],
  _back: null,
  _inputBound: false,
  _dragging: false,
  _dragLastY: 0,
  _dragMoved: false,

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR — sayı / kalıcılık
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fallback) { v = Number(v); return isFinite(v) ? v : (Number(fallback) || 0); },
  _int(v, fallback) { return Math.floor(this._num(v, fallback)); },

  _load() {
    if (this._state) return this._state;
    let s = null;
    try { if (typeof SaveData !== 'undefined' && SaveData.get) s = SaveData.get(this._SAVE_KEY); } catch (e) {}
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = { v: 1, cards: {} };
    if (!s.cards || typeof s.cards !== 'object' || Array.isArray(s.cards)) s.cards = {};
    this._state = s;
    return s;
  },

  _persist() {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, this._state); } catch (e) {}
  },

  _card(vehId) {
    const s = this._load();
    let c = s.cards[vehId];
    if (!c || typeof c !== 'object') { c = { frag: 0, star: 0 }; s.cards[vehId] = c; }
    c.frag = Math.max(0, this._int(c.frag, 0));
    c.star = Math.max(0, Math.min(this.MAX_STAR, this._int(c.star, 0)));
    return c;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  NADİRLİK — VehicleDefs price'tan türet
  // ══════════════════════════════════════════════════════════════════════════
  _def(vehId) {
    try { if (typeof VehicleDefs !== 'undefined' && VehicleDefs && VehicleDefs[vehId]) return VehicleDefs[vehId]; } catch (e) {}
    return null;
  },

  rarityOf(vehId) {
    const d = this._def(vehId);
    const price = d ? this._num(d.price, 0) : 0;
    if (price >= 50000) return 'legendary';
    if (price >= 25000) return 'gold';
    if (price >= 10000) return 'silver';
    return 'bronze';
  },

  // Kart parçası: mevcut yıldızdan (star) bir üste geçmek için gereken parça.
  //   star 0→1 = base, 1→2 = 2·base, ... 4→5 = 5·base
  _needFor(vehId, star) {
    if (star >= this.MAX_STAR) return Infinity;
    const rar = this.RARITY[this.rarityOf(vehId)] || this.RARITY.bronze;
    return Math.max(1, this._int(rar.unlock, 8)) * (star + 1);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KART TOPLAMA / BİRLEŞTİRME
  // ══════════════════════════════════════════════════════════════════════════
  grantCard(vehId, n) {
    if (typeof vehId !== 'string' || !this._def(vehId)) return false;   // geçersiz araç → yok say
    let add = this._int(n, 1);
    if (add <= 0) add = 1;
    const c = this._card(vehId);
    c.frag = Math.max(0, this._int(c.frag, 0) + add);

    let unlocked = false, leveled = false, guard = 0;
    while (c.star < this.MAX_STAR && guard++ < 64) {
      const need = this._needFor(vehId, c.star);
      if (!isFinite(need) || c.frag < need) break;
      c.frag -= need;
      c.star += 1;
      leveled = true;
      if (c.star === 1) {
        unlocked = true;
        try { if (typeof SaveData !== 'undefined' && SaveData.unlockVehicle) SaveData.unlockVehicle(vehId); } catch (e) {}
      }
    }
    this._persist();

    // ── Bildirim & efekt (hepsi guard'lı) ──
    const nm = (this._def(vehId) && this._def(vehId).name) || vehId;
    try {
      if (typeof UI !== 'undefined' && UI.showToast) {
        if (unlocked)      UI.showToast('🃏 ' + nm + ' KİLİDİ AÇILDI!');
        else if (leveled)  UI.showToast('⭐ ' + nm + ' → ' + c.star + ' YILDIZ!');
      }
    } catch (e) {}
    try {
      if (leveled && typeof Audio !== 'undefined') {
        if (unlocked && Audio.playUnlockVehicle) Audio.playUnlockVehicle();
        else if (Audio.playLevelUp) Audio.playLevelUp();
        else if (Audio.playTierUp) Audio.playTierUp();
      }
    } catch (e) {}
    return leveled;
  },

  // Kalıcı küçük stat bonusu — yıldız başına +%2 güç (star1=1.00 … star5=1.08).
  getCardBonus(vehId) {
    const c = (this._def(vehId)) ? this._card(vehId) : null;
    const star = c ? c.star : 0;
    const mult = 1 + Math.max(0, star - 1) * 0.02;
    return { powerMult: isFinite(mult) ? mult : 1 };
  },

  // Toplam ilerleme (sahip olunan yıldız / mümkün yıldız)
  _summary() {
    let owned = 0, total = 0, stars = 0;
    let ids = [];
    try { if (typeof VehicleDefs !== 'undefined' && VehicleDefs) ids = Object.keys(VehicleDefs); } catch (e) {}
    for (let i = 0; i < ids.length; i++) {
      total++;
      const c = this._card(ids[i]);
      if (c.star >= 1) owned++;
      stars += c.star;
    }
    return { owned, total, stars, maxStars: total * this.MAX_STAR };
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  GİRİŞ — kendi kaydırmasını yönetir (wheel + sürükleme)
  // ══════════════════════════════════════════════════════════════════════════
  _active() {
    try { return typeof UI !== 'undefined' && UI.currentScreen === 'cardcollection'; } catch (e) { return false; }
  },

  _scrollBy(dy) {
    dy = this._num(dy, 0);
    this._scroll = Math.max(0, Math.min(this._maxScroll, this._scroll + dy));
  },

  _ensureInput() {
    if (this._inputBound) return;
    this._inputBound = true;
    const self = this;
    const ptrY = (e) => {
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      return t ? this._num(t.clientY, 0) : 0;
    };
    try {
      window.addEventListener('wheel', (e) => {
        if (!self._active()) return;
        e.preventDefault();
        self._scrollBy(e.deltaY > 0 ? 60 : -60);
      }, { passive: false });

      const down = (e) => {
        if (!self._active()) return;
        self._dragging = true; self._dragMoved = false; self._dragLastY = ptrY(e);
      };
      const move = (e) => {
        if (!self._dragging || !self._active()) return;
        const y = ptrY(e);
        const d = self._dragLastY - y;
        if (Math.abs(d) > 3) self._dragMoved = true;
        self._dragLastY = y;
        self._scrollBy(d);
        if (self._dragMoved && e.cancelable) e.preventDefault();
      };
      const up = () => { self._dragging = false; };
      window.addEventListener('mousedown', down, { passive: true });
      window.addEventListener('mousemove', move, { passive: false });
      window.addEventListener('mouseup', up, { passive: true });
      window.addEventListener('touchstart', down, { passive: true });
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', up, { passive: true });
      window.addEventListener('touchcancel', up, { passive: true });
    } catch (e) {}
  },

  handleClick(x, y) {
    // Sürükleme kaydırdıysa tıklamayı yut (kaza ile kart seçimini önler)
    if (this._dragMoved) { this._dragMoved = false; return null; }
    if (this._back && x >= this._back.x && x <= this._back.x + this._back.w &&
        y >= this._back.y && y <= this._back.y + this._back.h) return 'back';
    for (let i = 0; i < this._tabs.length; i++) {
      const t = this._tabs[i];
      if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
        this._filter = t.id; this._scroll = 0; this._sel = null; return null;
      }
    }
    for (let i = 0; i < this._cards.length; i++) {
      const c = this._cards[i];
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this._sel = (this._sel === c.id) ? null : c.id;
        try { if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick(); } catch (e) {}
        return null;
      }
    }
    return null;
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ÇİZİM
  // ══════════════════════════════════════════════════════════════════════════
  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  _star(ctx, cx, cy, r, filled, col) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    if (filled) { ctx.fillStyle = col; ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; ctx.stroke(); }
  },

  // Basit araç ikonu — gövde + iki teker (VehicleDefs renkleri)
  _vehIcon(ctx, x, y, w, h, def) {
    const c1 = (def && def.color) || '#888', c2 = (def && def.color2) || '#333';
    const bx = x + w * 0.12, by = y + h * 0.28, bw = w * 0.76, bh = h * 0.4;
    ctx.fillStyle = c1;
    this._rr(ctx, bx, by, bw, bh, Math.min(8, bh * 0.5)); ctx.fill();
    ctx.fillStyle = c2;
    this._rr(ctx, bx + bw * 0.18, by - bh * 0.42, bw * 0.5, bh * 0.5, 4); ctx.fill();
    const wr = Math.max(4, h * 0.13), wy = by + bh;
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(bx + bw * 0.22, wy, wr, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + bw * 0.78, wy, wr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath(); ctx.arc(bx + bw * 0.22, wy, wr * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + bw * 0.78, wy, wr * 0.45, 0, Math.PI * 2); ctx.fill();
  },

  _filteredIds() {
    let ids = [];
    try { if (typeof VehicleDefs !== 'undefined' && VehicleDefs) ids = Object.keys(VehicleDefs); } catch (e) {}
    if (this._filter !== 'all') ids = ids.filter(id => this.rarityOf(id) === this._filter);
    // Nadirlik (yüksek→düşük) sonra fiyat
    const self = this;
    ids.sort((a, b) => {
      const ra = (self.RARITY[self.rarityOf(a)] || {}).order || 0;
      const rb = (self.RARITY[self.rarityOf(b)] || {}).order || 0;
      if (rb !== ra) return rb - ra;
      const pa = self._num((self._def(a) || {}).price, 0);
      const pb = self._num((self._def(b) || {}).price, 0);
      return pa - pb;
    });
    return ids;
  },

  draw(ctx, W, H) {
    this._ensureInput();
    this._t += 0.016;
    const C = this.COL;

    // ── Arka plan ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bg1); bg.addColorStop(1, C.bg0);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ── Başlık şeridi ──
    const headH = 92;
    ctx.fillStyle = 'rgba(10,14,28,0.9)'; ctx.fillRect(0, 0, W, headH);
    ctx.save(); ctx.shadowColor = C.orange; ctx.shadowBlur = 8;
    ctx.fillStyle = C.orange; ctx.fillRect(0, headH - 3, W, 3); ctx.restore();

    // Geri butonu
    const bw = 62, bh = 34, bx = 14, by = 14;
    ctx.fillStyle = C.panelHi; this._rr(ctx, bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; this._rr(ctx, bx, by, bw, bh, 8); ctx.stroke();
    ctx.fillStyle = C.text; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ GERİ', bx + bw / 2, by + bh / 2 + 1);
    this._back = { x: bx, y: by, w: bw, h: bh };

    // Başlık
    ctx.fillStyle = C.text; ctx.font = '900 20px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ARAÇ KART KOLEKSİYONU', W / 2, by + bh / 2 + 1);

    // Özet ilerleme
    const sm = this._summary();
    ctx.fillStyle = C.mute; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
    ctx.fillText('AÇILAN ' + sm.owned + '/' + sm.total + '   ⭐ ' + sm.stars + '/' + sm.maxStars, W - 14, by + bh / 2 + 1);

    // ── Nadirlik filtre sekmeleri ──
    this._tabs = [];
    const tabs = [{ id: 'all', label: 'HEPSİ', col: C.orange }].concat(
      this._RARITY_ORDER.map(r => ({ id: r, label: this.RARITY[r].label, col: this.RARITY[r].col })));
    const tabY = 56, tabH = 28, pad = 8;
    let tx = 14;
    ctx.font = 'bold 11px Arial'; ctx.textBaseline = 'middle';
    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tw = ctx.measureText(t.label).width + pad * 2;
      const on = this._filter === t.id;
      ctx.fillStyle = on ? t.col : C.panel;
      this._rr(ctx, tx, tabY, tw, tabH, 7); ctx.fill();
      if (!on) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; this._rr(ctx, tx, tabY, tw, tabH, 7); ctx.stroke(); }
      ctx.fillStyle = on ? '#0a0e1c' : C.mute;
      ctx.textAlign = 'center';
      ctx.fillText(t.label, tx + tw / 2, tabY + tabH / 2 + 1);
      this._tabs.push({ id: t.id, x: tx, y: tabY, w: tw, h: tabH });
      tx += tw + 6;
      if (tx > W - 60) { tx = 14; } // taşarsa sarmalar (küçük ekran güvenlik)
    }

    // ── Kart ızgarası (kaydırmalı, kırpılmış alan) ──
    const gridTop = headH + 6;
    const detailH = this._sel ? 66 : 0;
    const gridBottom = H - detailH;
    const gridH = gridBottom - gridTop;

    const cols = Math.max(2, Math.min(5, Math.floor((W - 20) / 150)));
    const gap = 10;
    const cw = (W - 20 - gap * (cols - 1)) / cols;
    const ch = cw * 1.28;
    const rowH = ch + gap;

    const ids = this._filteredIds();
    const rows = Math.ceil(ids.length / cols);
    const contentH = rows * rowH + 6;
    this._maxScroll = Math.max(0, contentH - gridH);
    this._scroll = Math.max(0, Math.min(this._maxScroll, this._scroll));

    ctx.save();
    ctx.beginPath(); ctx.rect(0, gridTop, W, gridH); ctx.clip();

    this._cards = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const col = i % cols, row = (i / cols) | 0;
      const cx = 10 + col * (cw + gap);
      const cy = gridTop + 4 + row * rowH - this._scroll;
      if (cy + ch < gridTop || cy > gridBottom) { // görünmeyeni atla ama hitbox kaydet
        this._cards.push({ id, x: cx, y: cy, w: cw, h: ch });
        continue;
      }
      this._drawCard(ctx, cx, cy, cw, ch, id);
      this._cards.push({ id, x: cx, y: cy, w: cw, h: ch });
    }
    ctx.restore();

    // ── Kaydırma göstergesi ──
    if (this._maxScroll > 0) {
      const trackH = gridH - 8;
      const th = Math.max(24, trackH * (gridH / contentH));
      const tyv = gridTop + 4 + (trackH - th) * (this._scroll / this._maxScroll);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      this._rr(ctx, W - 6, gridTop + 4, 3, trackH, 1.5); ctx.fill();
      ctx.fillStyle = this.COL.orange;
      this._rr(ctx, W - 6, tyv, 3, th, 1.5); ctx.fill();
    }

    // ── Detay şeridi (seçili kart) ──
    if (this._sel) this._drawDetail(ctx, W, H, detailH, this._sel);
  },

  _drawCard(ctx, x, y, w, h, id) {
    const C = this.COL;
    const rar = this.RARITY[this.rarityOf(id)] || this.RARITY.bronze;
    const c = this._card(id);
    const def = this._def(id);
    const ownedByBuy = (() => { try { return typeof SaveData !== 'undefined' && SaveData.get && (SaveData.get('ownedVehicles') || []).indexOf(id) >= 0; } catch (e) { return false; } })();
    const locked = c.star < 1 && !ownedByBuy;

    // gövde
    ctx.fillStyle = C.panel;
    this._rr(ctx, x, y, w, h, 10); ctx.fill();
    // nadirlik çerçevesi
    ctx.save();
    if (rar.glow) { ctx.shadowColor = rar.col; ctx.shadowBlur = rar.glow; }
    ctx.strokeStyle = rar.col; ctx.lineWidth = 2;
    this._rr(ctx, x + 1, y + 1, w - 2, h - 2, 10); ctx.stroke();
    ctx.restore();
    // üst nadirlik şeridi
    ctx.fillStyle = rar.col;
    this._rr(ctx, x + 1, y + 1, w - 2, 16, 9); ctx.fill();
    ctx.fillStyle = '#0a0e1c'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(rar.label, x + 8, y + 9);

    // araç ikonu
    this._vehIcon(ctx, x + 6, y + 20, w - 12, h * 0.42, def);

    // isim
    ctx.fillStyle = C.text; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const nm = (def && def.name) || id;
    ctx.fillText(this._fit(ctx, nm, w - 10), x + w / 2, y + h * 0.62);

    // yıldızlar
    const sr = Math.min(7, w * 0.055);
    const sy = y + h * 0.74;
    const totalW = this.MAX_STAR * (sr * 2 + 2) - 2;
    let sx = x + w / 2 - totalW / 2 + sr;
    for (let s = 0; s < this.MAX_STAR; s++) {
      this._star(ctx, sx, sy, sr, s < c.star, rar.col);
      sx += sr * 2 + 2;
    }

    // ilerleme çubuğu (sonraki yıldıza)
    const barX = x + 8, barY = y + h - 16, barW = w - 16, barH = 6;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._rr(ctx, barX, barY, barW, barH, 3); ctx.fill();
    if (c.star < this.MAX_STAR) {
      const need = this._needFor(id, c.star);
      const frac = Math.max(0, Math.min(1, c.frag / need));
      if (frac > 0) {
        ctx.fillStyle = rar.col;
        this._rr(ctx, barX, barY, barW * frac, barH, 3); ctx.fill();
      }
      ctx.fillStyle = C.mute; ctx.font = '8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(c.frag + ' / ' + need, x + w / 2, barY - 1);
    } else {
      ctx.fillStyle = this.COL.gold;
      this._rr(ctx, barX, barY, barW, barH, 3); ctx.fill();
      ctx.fillStyle = this.COL.gold; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('MAKS', x + w / 2, barY - 1);
    }

    // kilit örtüsü
    if (locked) {
      ctx.fillStyle = C.lock;
      this._rr(ctx, x + 1, y + 1, w - 2, h - 2, 10); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔒', x + w / 2, y + h * 0.44);
      const need = this._needFor(id, 0);
      ctx.fillStyle = this.COL.mute; ctx.font = 'bold 9px Arial';
      ctx.fillText(c.frag + '/' + need + ' KART', x + w / 2, y + h * 0.6);
    } else if (ownedByBuy && c.star < 1) {
      ctx.fillStyle = this.COL.orangeHi; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('SAHİP', x + w - 6, y + 20);
    }
  },

  _drawDetail(ctx, W, H, dh, id) {
    const C = this.COL, y0 = H - dh;
    const rar = this.RARITY[this.rarityOf(id)] || this.RARITY.bronze;
    const c = this._card(id);
    const def = this._def(id);
    ctx.fillStyle = 'rgba(8,11,22,0.96)'; ctx.fillRect(0, y0, W, dh);
    ctx.fillStyle = rar.col; ctx.fillRect(0, y0, 4, dh);
    ctx.fillStyle = C.text; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText((def && def.name) || id, 16, y0 + 10);
    ctx.fillStyle = rar.col; ctx.font = 'bold 10px Arial';
    ctx.fillText(rar.label + ' • ' + c.star + '/' + this.MAX_STAR + ' YILDIZ', 16, y0 + 30);
    const bonus = this.getCardBonus(id);
    ctx.fillStyle = C.mute; ctx.font = '10px Arial';
    ctx.fillText('Güç bonusu: +' + Math.round((bonus.powerMult - 1) * 100) + '%', 16, y0 + 46);
    // sağda ilerleme
    ctx.textAlign = 'right';
    if (c.star < this.MAX_STAR) {
      const need = this._needFor(id, c.star);
      ctx.fillStyle = C.text; ctx.font = 'bold 12px Arial';
      ctx.fillText(c.frag + ' / ' + need + ' kart', W - 16, y0 + 14);
      ctx.fillStyle = C.mute; ctx.font = '10px Arial';
      ctx.fillText('sonraki yıldız için', W - 16, y0 + 32);
    } else {
      ctx.fillStyle = this.COL.gold; ctx.font = 'bold 12px Arial';
      ctx.fillText('MAKS YILDIZ ⭐', W - 16, y0 + 20);
    }
  },

  _fit(ctx, str, maxW) {
    if (ctx.measureText(str).width <= maxW) return str;
    let s = str;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }
};

if (typeof window !== 'undefined') window.CardCollection = CardCollection;
