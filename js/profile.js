'use strict';
/* ============================================================================
 *  PROFİL / VİTRİN SAYFASI  —  bağımsız, kendi-başına modül  (Profile)
 *  ----------------------------------------------------------------------------
 *  Oyuncu vitrini + istatistikler + rozetler + düzenlenebilir oyuncu adı.
 *  Sadece OKUR: hiçbir mevcut dosyayı değiştirmez, kendi çizim/tıklama döngüsü var.
 *
 *  Genel API (ui.js draw switch + handleClick'ten çağrılır):
 *    · Profile.draw(ctx, W, H)      → ekranı çizer, iç butonları kaydeder
 *    · Profile.handleClick(x, y)    → 'back' | null  (geri = menüye dön)
 *
 *  Tüm oyun-API erişimleri GUARD'lıdır (SaveData/VehicleDefs/Achievements/drawVehicle
 *  yoksa güvenli varsayılanlara düşer). İstatistikler NaN → 0 fallback. localStorage YOK.
 * ==========================================================================*/
const Profile = {
  // ── Tema (koyu / turuncu) ──────────────────────────────────────────────
  C: {
    bg:'#06060a', panel:'#0c0c1c', card:'#12122a', cardHi:'#171735',
    line:'rgba(255,140,40,0.22)', fire:'#FF7A18', hot:'#FF9E2C',
    gold:'#FFD24A', cyan:'#3fd0ff', text:'#F2ECE0', dim:'#9a94a8',
    green:'#39d98a', track:'rgba(255,255,255,0.09)'
  },

  _btns: [],
  _t: 0,

  // ── Güvenli sayısal okuma: sonlu & negatif-olmayan, aksi halde 0 ──────────
  _num(v) { const n = Number(v); return (isFinite(n) && n >= 0) ? n : 0; },

  // ── SaveData sarmalayıcıları (guard'lı) ─────────────────────────────────
  _sdGet(key, fb) {
    try { if (typeof SaveData !== 'undefined' && SaveData.get) { const v = SaveData.get(key); return (v === undefined || v === null) ? fb : v; } }
    catch (e) {}
    return fb;
  },
  _stats() {
    const s = this._sdGet('stats', null);
    return (s && typeof s === 'object' && !Array.isArray(s)) ? s : {};
  },
  _highScores() {
    const h = this._sdGet('highScores', null);
    return (h && typeof h === 'object' && !Array.isArray(h)) ? h : {};
  },
  _playerName() {
    const n = this._sdGet('playerName', '');
    return (typeof n === 'string' && n.trim()) ? n.trim() : '61BURADA';
  },
  _vehName(id) {
    try { if (typeof VehicleDefs !== 'undefined' && VehicleDefs[id] && VehicleDefs[id].name) return VehicleDefs[id].name; }
    catch (e) {}
    return String(id || 'JEEP').toUpperCase();
  },
  _mapName(id) {
    // MapSettings varsa oradan güzel ad al; yoksa id'yi biçimlendir.
    try {
      if (typeof MapSettings !== 'undefined' && MapSettings.get) {
        const m = MapSettings.get(id); if (m && m.name) return m.name;
      }
      if (typeof MAPS !== 'undefined' && MAPS[id] && MAPS[id].name) return MAPS[id].name;
    } catch (e) {}
    return String(id || '').replace(/_/g, ' ').toUpperCase();
  },

  // ── Türetilmiş istatistikler ───────────────────────────────────────────
  _computeStats() {
    const st = this._stats();
    const hs = this._highScores();

    // En iyi mesafe (ünvan için) + harita başına rekor listesi.
    let best = 0;
    const records = [];
    for (const m in hs) {
      if (!Object.prototype.hasOwnProperty.call(hs, m)) continue;
      const d = this._num(hs[m]);
      if (d > 0) records.push({ map: m, dist: d });
      if (d > best) best = d;
    }
    records.sort((a, b) => b.dist - a.dist);

    // Toplam kat edilen mesafe: kümülatif totalDistance, yoksa rekorların toplamı.
    let totalDist = this._num(this._sdGet('totalDistance', 0));
    if (totalDist <= 0) { totalDist = records.reduce((s, r) => s + r.dist, 0); }
    // stats.totalDistance da varsa en büyüğünü al (eski/yeni kayıt uyumu).
    totalDist = Math.max(totalDist, this._num(st.totalDistance));

    // En çok kullanılan / favori araç: perVehicleDistance'tan en yükseği.
    let favVeh = this._sdGet('selectedVehicle', 'jeep') || 'jeep';
    let favVehDist = 0;
    const pvd = (st.perVehicleDistance && typeof st.perVehicleDistance === 'object') ? st.perVehicleDistance : {};
    for (const v in pvd) {
      if (!Object.prototype.hasOwnProperty.call(pvd, v)) continue;
      const d = this._num(pvd[v]);
      if (d > favVehDist) { favVehDist = d; favVeh = v; }
    }

    return {
      best: best,
      records: records,
      totalDist: totalDist,
      games: this._num(this._sdGet('gamesPlayed', 0)),
      flips: this._num(st.totalFlips) || this._num(this._sdGet('totalFlips', 0)),
      jumps: this._num(st.totalJumps),
      coins: this._num(this._sdGet('totalCoins', 0)),
      level: Math.max(1, Math.floor(this._num(this._sdGet('playerLevel', 1))) || 1),
      xp: this._num(this._sdGet('xp', 0)),
      favVeh: favVeh, favVehDist: favVehDist,
      selVeh: this._sdGet('selectedVehicle', 'jeep') || 'jeep'
    };
  },

  // ── Kazanılan rozetler (guard'lı; yoksa boş) ────────────────────────────
  _badges() {
    try {
      if (typeof Achievements !== 'undefined' && Achievements.getUnlocked) {
        const u = Achievements.getUnlocked();
        if (Array.isArray(u)) return u;
      }
      // Yedek: SaveData.achievements haritası + Achievements.list eşlemesi.
      if (typeof Achievements !== 'undefined' && Array.isArray(Achievements.list) &&
          typeof SaveData !== 'undefined' && SaveData.hasAchievement) {
        return Achievements.list.filter(a => SaveData.hasAchievement(a.id));
      }
    } catch (e) {}
    return [];
  },

  // ── Mesafe biçimlendirme (m / km) ───────────────────────────────────────
  _fmtDist(m) {
    m = this._num(m);
    if (m >= 1000) return (m / 1000).toFixed(m >= 10000 ? 0 : 1) + ' km';
    return Math.round(m) + ' m';
  },
  _fmtNum(n) {
    n = this._num(n);
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  },

  // ── Ünvan bilgisi (getRank / getRankInfo guard'lı) ──────────────────────
  _rankInfo(dist) {
    let name = 'YENİ BAŞLAYAN', color = '#9a94a8', icon = '🌱', prog = 0, next = null;
    try {
      if (typeof SaveData !== 'undefined') {
        if (SaveData.getRankInfo) {
          const r = SaveData.getRankInfo(dist);
          if (r) { name = r.name || name; color = r.color || color; icon = r.icon || icon; }
        } else if (SaveData.getRank) {
          name = SaveData.getRank(dist) || name;
          if (SaveData.getRankColor) color = SaveData.getRankColor(name) || color;
        }
        if (SaveData.getRankProgress) prog = this._num(SaveData.getRankProgress(dist));
        if (SaveData.getNextRankThreshold) next = SaveData.getNextRankThreshold(dist);
      }
    } catch (e) {}
    if (!(prog >= 0 && prog <= 1)) prog = 0;
    return { name: name, color: color, icon: icon, prog: prog, next: next };
  },

  // ── Araç önizlemesi (global drawVehicle guard'lı, yoksa silüet) ─────────
  _drawVehicle(ctx, id, scale, t) {
    const def = (typeof VehicleDefs !== 'undefined' && VehicleDefs[id]) ? VehicleDefs[id] : null;
    ctx.save(); ctx.scale(scale, scale);
    try {
      if (typeof drawVehicle !== 'function' || !def) throw new Error('no-drawVehicle');
      const fakeWheels = (def.wheels || []).map(w => ({
        x: w.x || 0, y: w.y || 0, wx: w.x || 0, wy: w.y || 0, lx: w.x || 0, ly: w.y || 0,
        radius: w.r || w.radius || 20, r: w.r || w.radius || 20,
        spin: t * 2.5, comp: 0, contact: false,
        isSki: w.isSki || false, isHover: w.isHover || false, isLeg: w.isLeg || false
      }));
      drawVehicle(ctx,
        { x: 0, y: 0, angle: 0, vx: 10, vy: 0, bodyTilt: 0, wheels: fakeWheels, suspAnim: fakeWheels.map(() => 0) },
        id, 0.5, t);
    } catch (e) {
      const w = (def && def.w) || 100, h = (def && def.h) || 46;
      ctx.fillStyle = (def && def.color) || '#556';
      ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 8); ctx.fill();
      ctx.fillStyle = '#1a1a22';
      ((def && def.wheels) || [{ x: -w * 0.32, r: 18 }, { x: w * 0.32, r: 18 }]).forEach(wp => {
        ctx.beginPath(); ctx.arc(wp.x || 0, 0, wp.r || wp.radius || 18, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.restore();
  },

  // ── Yardımcı: yuvarlak-köşe panel ───────────────────────────────────────
  _panel(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  },
  _bar(ctx, x, y, w, h, p, color) {
    p = Math.max(0, Math.min(1, this._num(p)));
    ctx.fillStyle = this.C.track; ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
    if (p > 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * p), h, h / 2); ctx.fill(); }
  },

  // ── ANA ÇİZİM ───────────────────────────────────────────────────────────
  draw(ctx, W, H) {
    this._t += 0.016;
    this._btns = [];
    const C = this.C, t = this._t;
    const s = this._computeStats();
    const rank = this._rankInfo(s.best);

    // Arka plan
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0a16'); bg.addColorStop(1, C.bg);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // Turuncu üst parıltı
    const glow = ctx.createRadialGradient(W / 2, -40, 20, W / 2, -40, W * 0.9);
    glow.addColorStop(0, 'rgba(255,120,24,0.16)'); glow.addColorStop(1, 'rgba(255,120,24,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H * 0.5);

    const pad = Math.max(10, W * 0.03);

    // ── Üst bar: geri + başlık ──
    const barH = 46;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // Geri butonu
    const bw = 44, bh = 34, by = 8;
    this._panel(ctx, pad, by, bw, bh, 9, C.card, C.line);
    ctx.fillStyle = C.hot; ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center'; ctx.fillText('‹', pad + bw / 2, by + bh / 2 + 1);
    this._btns.push({ id: 'back', x: pad, y: by, w: bw, h: bh });
    // Başlık
    ctx.textAlign = 'center';
    ctx.fillStyle = C.text; ctx.font = '900 20px Arial Black, Arial';
    ctx.fillText('PROFİL', W / 2, by + bh / 2 + 1);
    ctx.fillStyle = C.fire; ctx.font = 'bold 10px Arial';
    ctx.fillText('VİTRİN', W / 2, by + bh + 9);

    let cy = barH + 18;

    // ══ VİTRİN KARTI (araç + ünvan + seviye) ══
    const showH = Math.min(232, H * 0.32);
    this._panel(ctx, pad, cy, W - pad * 2, showH, 16, C.panel, C.line);
    // ünvan renkli kenar
    ctx.save(); ctx.beginPath(); ctx.roundRect(pad, cy, 5, showH, 3); ctx.fillStyle = rank.color; ctx.fill(); ctx.restore();

    // Araç önizleme (sol-orta blok)
    const vx = W * 0.30, vy = cy + showH * 0.52;
    const def = (typeof VehicleDefs !== 'undefined' && VehicleDefs[s.selVeh]) ? VehicleDefs[s.selVeh] : { w: 110 };
    const vScale = Math.min(1.55, (W * 0.34) / Math.max(def.w || 110, 1));
    // gölge
    const shad = ctx.createRadialGradient(vx, vy + 26, 4, vx, vy + 26, 80);
    shad.addColorStop(0, 'rgba(0,0,0,0.35)'); shad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shad; ctx.beginPath(); ctx.ellipse(vx, vy + 26, 74, 13, 0, 0, Math.PI * 2); ctx.fill();
    const bounce = Math.sin(t * 2.2) * 2.5;
    ctx.save(); ctx.translate(vx, vy + bounce); this._drawVehicle(ctx, s.selVeh, vScale, t); ctx.restore();
    // araç adı
    ctx.textAlign = 'center'; ctx.fillStyle = C.dim; ctx.font = 'bold 11px Arial';
    ctx.fillText(this._vehName(s.selVeh).toUpperCase(), vx, cy + showH - 16);

    // Sağ bilgi bloğu: oyuncu adı + ünvan rozeti + seviye
    const rx = W * 0.55, rW = W - pad - rx - 6;
    // Oyuncu adı (düzenlenebilir → tıkla)
    const nameY = cy + 22;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // 🌍 ÜLKE BAYRAĞI (31 Tmz) — HCR2'de olduğu gibi oyuncu adının SOLUNDA.
    //   Bayrak kodla çizilir (`js/bayraklar.js`); emoji DEĞİL çünkü Windows
    //   Chrome'da emoji bayrak canvas'a bayrak olarak çizilmiyor (ölçüldü).
    //   ⚠ Tıklanınca ülke seçim ekranı açılır → ayrı dokunma hedefi.
    let _bx = rx, _bayrakW = 0;
    try {
      if (typeof Ulke !== 'undefined' && typeof Bayraklar !== 'undefined') {
        _bayrakW = Ulke.rozet(ctx, rx, nameY - 9, 18);
        if (_bayrakW > 0) {
          this._btns.push({ id: 'ulke', x: rx - 3, y: nameY - 22, w: _bayrakW + 6, h: 44 });
          _bx = rx + _bayrakW + 7;
        }
      }
    } catch (e) {}
    ctx.fillStyle = C.text; ctx.font = '900 19px Arial Black, Arial';
    const nm = this._playerName();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(nm.length > 12 ? nm.slice(0, 12) + '…' : nm, _bx, nameY, Math.max(30, rW - _bayrakW - 30));
    // kalem ikonu
    ctx.fillStyle = C.hot; ctx.font = '13px Arial';
    const nmW = Math.min(ctx.measureText(nm).width, rW - _bayrakW - 30);
    ctx.fillText('✏️', _bx + nmW + 8, nameY + 1);
    this._btns.push({ id: 'edit_name', x: _bx - 4, y: nameY - 16, w: rW - _bayrakW + 8, h: 32 });

    // Ünvan rozeti
    const rankY = nameY + 34;
    this._panel(ctx, rx, rankY, rW, 30, 8, 'rgba(0,0,0,0.28)', rank.color);
    ctx.fillStyle = rank.color; ctx.font = '15px Arial'; ctx.textAlign = 'left';
    ctx.fillText(rank.icon, rx + 8, rankY + 15);
    ctx.font = 'bold 12px Arial';
    let rn = rank.name; if (rn.length > 16) rn = rn.slice(0, 16) + '…';
    ctx.fillText(rn, rx + 30, rankY + 15);

    // Seviye + XP çubuğu
    const lvY = rankY + 42;
    ctx.fillStyle = C.gold; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
    ctx.fillText('SEVİYE ' + s.level, rx, lvY);
    ctx.fillStyle = C.dim; ctx.font = '10px Arial'; ctx.textAlign = 'right';
    const xpInLvl = s.xp % 1000;
    ctx.fillText(xpInLvl + ' / 1000 XP', rx + rW, lvY);
    this._bar(ctx, rx, lvY + 8, rW, 8, xpInLvl / 1000, C.gold);
    // Ünvan ilerlemesi
    const nextTxt = rank.next ? ('Sonraki ünvan → ' + this._fmtDist(rank.next)) : 'MAKSİMUM ÜNVAN';
    ctx.fillStyle = C.dim; ctx.font = '9px Arial'; ctx.textAlign = 'left';
    ctx.fillText(nextTxt, rx, lvY + 30);
    this._bar(ctx, rx, lvY + 36, rW, 6, rank.prog, rank.color);

    cy += showH + 14;

    // ══ İSTATİSTİK IZGARASI ══
    ctx.textAlign = 'left';
    const cells = [
      { ic: '🛣️', label: 'TOPLAM YOL', val: this._fmtDist(s.totalDist), col: C.hot },
      { ic: '🎮', label: 'OYUN',        val: this._fmtNum(s.games),      col: C.cyan },
      { ic: '🌀', label: 'TAKLA',       val: this._fmtNum(s.flips),      col: C.gold },
      { ic: '🪙', label: 'COIN',        val: this._fmtNum(s.coins),      col: C.green },
      { ic: '🏆', label: 'EN İYİ',      val: this._fmtDist(s.best),      col: C.fire },
      { ic: '🚗', label: 'FAVORİ ARAÇ', val: this._vehName(s.favVeh),    col: C.cyan, small: true }
    ];
    const cols = 3, gap = 8;
    const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
    const ch = 58;
    cells.forEach((c, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = pad + col * (cw + gap), y = cy + row * (ch + gap);
      this._panel(ctx, x, y, cw, ch, 11, C.card, C.line);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = '15px Arial'; ctx.fillText(c.ic, x + 8, y + 8);
      ctx.fillStyle = C.dim; ctx.font = 'bold 8.5px Arial';
      ctx.fillText(c.label, x + 28, y + 11);
      ctx.fillStyle = c.col; ctx.font = c.small ? 'bold 12px Arial' : '900 17px Arial Black, Arial';
      ctx.textBaseline = 'alphabetic';
      let vv = String(c.val); if (c.small && vv.length > 11) vv = vv.slice(0, 10) + '…';
      ctx.fillText(vv, x + 9, y + ch - 12);
    });
    cy += Math.ceil(cells.length / cols) * (ch + gap) + 6;

    // ══ EN İYİ REKORLAR (harita başına) ══
    if (cy < H - 150) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.hot; ctx.font = '900 12px Arial Black, Arial';
      ctx.fillText('EN İYİ REKORLAR', pad, cy + 4);
      cy += 12;
      const maxRows = Math.max(0, Math.min(4, Math.floor((H - 60 - cy) / 26)));
      const top = s.records.slice(0, maxRows);
      if (top.length === 0) {
        ctx.fillStyle = C.dim; ctx.font = '11px Arial';
        ctx.fillText('Henüz rekor yok — bir yarışa başla!', pad, cy + 18);
        cy += 26;
      } else {
        const maxD = top[0].dist || 1;
        top.forEach(r => {
          const y = cy + 6;
          this._panel(ctx, pad, y, W - pad * 2, 22, 7, C.card, null);
          ctx.fillStyle = C.text; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          let mn = this._mapName(r.map); if (mn.length > 14) mn = mn.slice(0, 14) + '…';
          ctx.fillText(mn, pad + 8, y + 11);
          // mini bar
          const barX = pad + W * 0.36, barW = W - pad - barX - 66;
          this._bar(ctx, barX, y + 7, barW, 8, r.dist / maxD, C.fire);
          ctx.fillStyle = C.gold; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'right';
          ctx.fillText(this._fmtDist(r.dist), W - pad - 8, y + 11);
          cy += 26;
        });
      }
      cy += 4;
    }

    // ══ ROZETLER ══
    const badges = this._badges();
    if (cy < H - 40) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.hot; ctx.font = '900 12px Arial Black, Arial';
      ctx.fillText('ROZETLER', pad, cy + 4);
      ctx.fillStyle = C.dim; ctx.font = '10px Arial'; ctx.textAlign = 'right';
      ctx.fillText(badges.length + ' kazanıldı', W - pad, cy + 4);
      cy += 12;
      ctx.textAlign = 'left';
      if (badges.length === 0) {
        ctx.fillStyle = C.dim; ctx.font = '11px Arial';
        ctx.fillText('Henüz rozet yok. Başar ve topla!', pad, cy + 18);
      } else {
        const bs = 34, bgap = 8;
        const perRow = Math.max(1, Math.floor((W - pad * 2 + bgap) / (bs + bgap)));
        const rowsAvail = Math.max(1, Math.floor((H - 12 - cy) / (bs + bgap)));
        const maxShow = perRow * rowsAvail;
        const shown = badges.slice(0, maxShow);
        shown.forEach((b, i) => {
          const col = i % perRow, row = Math.floor(i / perRow);
          const x = pad + col * (bs + bgap), y = cy + 4 + row * (bs + bgap);
          this._panel(ctx, x, y, bs, bs, 8, C.cardHi, 'rgba(255,210,74,0.35)');
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = '17px Arial'; ctx.fillStyle = C.text;
          ctx.fillText(b.icon || '🏅', x + bs / 2, y + bs / 2 + 1);
        });
        // taşan sayısı
        if (badges.length > shown.length) {
          const rem = badges.length - shown.length;
          ctx.fillStyle = C.dim; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          const lastRow = Math.floor((shown.length) / perRow);
          ctx.fillText('+' + rem, pad + (shown.length % perRow) * (bs + bgap) + 2, cy + 4 + lastRow * (bs + bgap) + bs / 2);
        }
      }
    }
  },

  // ── TIKLAMA ─────────────────────────────────────────────────────────────
  handleClick(x, y) {
    for (const b of this._btns) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'back') return 'back';
        if (b.id === 'edit_name') { this._editName(); return null; }
      }
    }
    return null;
  },

  // ── Oyuncu adını düzenle (prompt guard'lı; localStorage yok) ─────────────
  _editName() {
    let cur = this._playerName();
    let nn = null;
    try { if (typeof window !== 'undefined' && typeof window.prompt === 'function') nn = window.prompt('Oyuncu adın:', cur); }
    catch (e) { nn = null; }
    if (nn === null || nn === undefined) return;
    nn = String(nn).trim().slice(0, 16);
    if (!nn) return;
    try {
      if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('playerName', nn);
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('✅ Ad güncellendi: ' + nn);
    } catch (e) {}
  }
};

// Tarayıcı-dışı ortamlar (node --check / test) için güvenli dışa aktarım.
if (typeof module !== 'undefined' && module.exports) { module.exports = Profile; }
