'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   STATS PANEL  —  DETAYLI İSTATİSTİK PANELİ
   ---------------------------------------------------------------------------
   Kendi kendine yeten, SALT-OKUNUR panel. Hiçbir şey yazmaz (SaveData'ya set
   ETMEZ), localStorage KULLANMAZ. Tüm bağımlılıklar typeof-guard'lıdır; anahtar
   yoksa 0 (veya boş/"Henüz veri yok") gösterir.

   OKUNAN SaveData ANAHTARLARI (hepsi guard'lı, yoksa 0):
     · totalDistance | totalKm        → toplam mesafe (km)
     · totalRuns | gamesPlayed | runCount → toplam koşu
     · totalCoins | lifetimeGold       → ömür boyu altın
     · bestDistance | longestRun | maxDistance → en uzun koşu
     · totalFlips                      → toplam takla
     · deaths | totalCrashes           → ölüm / çarpma sayısı
     · botWins  (+ botBest'ten türetme) → bot galibiyeti
     · recentRuns | runHistory         → bar-chart verisi (son N koşu mesafesi)
     · achievements (+ Achievements.list) → başarım ilerleme halkası

   API
     StatsPanel.draw(ctx, W, H [, dt])  → tam ekran panel + say-animasyonu çizer
     StatsPanel.handleClick(x, y)       → 'back' | null
     StatsPanel.update(dt)              → say-animasyonu (İSTEĞE BAĞLI — draw
                                          kendi saatiyle de ilerler; biri yeterli)
   ═══════════════════════════════════════════════════════════════════════════ */
const StatsPanel = {

  // ── Tema ────────────────────────────────────────────────────────────────────
  COL: {
    bg0:'#0b1020', bg1:'#1b2a4a', panel:'#141d33', panel2:'#1a2745',
    line:'rgba(255,255,255,0.09)', text:'#eef3ff', mute:'#8fb3ff',
    orange:'#ff8a3d', yellow:'#ffd54a', blue:'#8fb3ff',
    green:'#39d98a', red:'#ff6b6b', barA:'#ff8a3d', barB:'#ffd54a'
  },

  ANIM_TIME: 1.1,          // say-animasyonu süresi (saniye)

  // ── Çalışma zamanı durumu ────────────────────────────────────────────────────
  _t: 0,                   // toplam animasyon saati (0'dan büyür)
  _lastNow: 0,             // Date.now tabanlı iç saat (dt verilmezse)
  _extDriven: false,       // update(dt) dışarıdan çağrıldıysa draw kendi saatini kullanmaz
  _updatedThisFrame: false,
  _btns: [],               // her draw'da yeniden doldurulan tıklama hedefleri
  _snap: null,             // okunan verinin anlık kopyası (draw başında tazelenir)

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },
  _now() { return Date.now(); },

  // SaveData.get güvenli sarmalayıcı — anahtar yoksa/okuma başarısızsa fallback.
  _sd(key, fb) {
    try {
      if (typeof SaveData !== 'undefined' && typeof SaveData.get === 'function') {
        const v = SaveData.get(key);
        if (v !== undefined && v !== null) return v;
      }
    } catch (e) {}
    return fb;
  },

  // İlk tanımlı (>0 veya sadece tanımlı) sayısal anahtarı seç.
  _firstNum(keys, fb) {
    for (let i = 0; i < keys.length; i++) {
      const v = this._sd(keys[i], undefined);
      if (v !== undefined && v !== null && isFinite(Number(v))) return Number(v);
    }
    return this._num(fb, 0);
  },

  // Bot galibiyeti: botWins yoksa botBest map'inden türet.
  _botWins() {
    const direct = this._sd('botWins', undefined);
    if (direct !== undefined && direct !== null && isFinite(Number(direct))) return Math.max(0, Math.floor(Number(direct)));
    let won = 0;
    const bb = this._sd('botBest', null);
    if (bb && typeof bb === 'object' && !Array.isArray(bb)) {
      for (const k in bb) {
        if (Object.prototype.hasOwnProperty.call(bb, k)) {
          const e = bb[k];
          if (e && typeof e === 'object') won += this._num(e.won, 0);
        }
      }
    }
    return Math.max(0, Math.floor(won));
  },

  // Başarım ilerleme yüzdesi (0..1) + sayılar.
  _achievementProgress() {
    let total = 0, unlocked = 0;
    try {
      if (typeof Achievements !== 'undefined' && Achievements && Array.isArray(Achievements.list)) {
        total = Achievements.list.length;
      }
    } catch (e) {}
    const ach = this._sd('achievements', null);
    if (ach && typeof ach === 'object' && !Array.isArray(ach)) {
      for (const k in ach) { if (Object.prototype.hasOwnProperty.call(ach, k) && ach[k]) unlocked++; }
    }
    if (total <= 0) total = Math.max(1, unlocked);     // toplam bilinmiyorsa oranı bozmadan göster
    if (unlocked > total) unlocked = total;
    return { unlocked: unlocked, total: total, pct: Math.max(0, Math.min(1, unlocked / total)) };
  },

  // Bar-chart verisi: recentRuns / runHistory → son N koşu mesafesi (m).
  _recentRuns() {
    let arr = this._sd('recentRuns', null);
    if (!Array.isArray(arr) || !arr.length) arr = this._sd('runHistory', null);
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (let i = 0; i < arr.length && out.length < 12; i++) {
      const r = arr[i];
      let d;
      if (typeof r === 'number') d = r;
      else if (r && typeof r === 'object') d = this._num(r.distance, this._num(r.dist, 0));
      else d = 0;
      out.push(Math.max(0, d));
    }
    return out;   // runHistory unshift ile ekler → [0] en yeni; çizerken ters çeviririz
  },

  // Tüm veriyi bir kez oku (draw başında). Salt-okunur.
  _readSnapshot() {
    const totalDistM = this._firstNum(['totalDistance'], 0);         // metre
    const totalKm    = this._firstNum(['totalKm'], totalDistM / 1000);
    const ach = this._achievementProgress();
    return {
      totalKm:    Math.max(0, totalKm),
      totalRuns:  Math.max(0, this._firstNum(['totalRuns', 'gamesPlayed', 'runCount'], 0)),
      totalGold:  Math.max(0, this._firstNum(['lifetimeGold', 'totalCoins'], 0)),
      bestDistM:  Math.max(0, this._firstNum(['bestDistance', 'longestRun', 'maxDistance'], 0)),
      totalFlips: Math.max(0, this._firstNum(['totalFlips'], 0)),
      deaths:     Math.max(0, this._firstNum(['deaths', 'totalCrashes'], 0)),
      botWins:    this._botWins(),
      runs:       this._recentRuns(),
      ach:        ach
    };
  },

  _fmt(n) {
    n = this._num(n, 0);
    if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + 'M';
    if (n >= 10000)   return (n / 1000).toFixed(n >= 100000 ? 0 : 1) + 'K';
    return String(Math.round(n));
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ZAMAN / ANİMASYON  (kare-bağımsız say-animasyonu)
  // ══════════════════════════════════════════════════════════════════════════
  _advance(dt) {
    dt = this._num(dt, 0);
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;   // kare atlama / sekme koruması
    this._t += dt;
  },

  // Açılış ilerlemesi 0..1 (easeOut) — sayıları 0'dan gerçek değere açar.
  _reveal() {
    const p = Math.max(0, Math.min(1, this._t / this.ANIM_TIME));
    return 1 - Math.pow(1 - p, 3);
  },

  update(dt) {
    this._extDriven = true;
    this._updatedThisFrame = true;
    this._advance(dt);
  },

  // Yeniden açıldığında animasyonu baştan oynatmak için (opsiyonel dış çağrı).
  reset() { this._t = 0; this._lastNow = 0; },

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

    this._btns = [];
    const S = this._snap = this._readSnapshot();
    const rev = this._reveal();
    const C = this.COL;

    // ── Arka plan (koyu dikey gradyan) ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // ── Başlık ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.yellow;
    ctx.font = 'bold ' + Math.round(H * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('📊 İSTATİSTİKLER', W / 2, H * 0.105);

    // ── Geri butonu ──
    const back = { id: 'back', x: W * 0.04, y: H * 0.035, w: Math.max(64, W * 0.14), h: Math.max(40, H * 0.06) };
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    this._roundRect(ctx, back.x, back.y, back.w, back.h, 10); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = C.text;
    ctx.font = 'bold ' + Math.round(back.h * 0.42) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ Geri', back.x + back.w / 2, back.y + back.h / 2);
    ctx.textBaseline = 'alphabetic';
    this._btns.push(back);

    // ── Özet kartları (7 adet, 3 sütunlu grid) ──
    const cards = [
      { icon:'🏁', label:'Toplam KM',    value: S.totalKm,    kind:'km',   col:C.orange },
      { icon:'🔁', label:'Toplam Koşu',  value: S.totalRuns,  kind:'int',  col:C.blue   },
      { icon:'🪙', label:'Kazanılan Altın', value: S.totalGold, kind:'gold', col:C.yellow },
      { icon:'📏', label:'En Uzun Koşu', value: S.bestDistM,  kind:'m',    col:C.orange },
      { icon:'🌀', label:'Toplam Takla', value: S.totalFlips, kind:'int',  col:C.blue   },
      { icon:'💀', label:'Ölüm Sayısı',  value: S.deaths,     kind:'int',  col:C.red    },
      { icon:'🤖', label:'Bot Galibiyeti', value: S.botWins,  kind:'int',  col:C.green  }
    ];

    const gridX = W * 0.05, gridW = W * 0.90;
    const cols = 3;
    const gap = W * 0.02;
    const cw = (gridW - gap * (cols - 1)) / cols;
    const ch = Math.max(66, H * 0.11);
    const gridY = H * 0.15;
    const rows = Math.ceil(cards.length / cols);

    for (let i = 0; i < cards.length; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const x = gridX + c * (cw + gap);
      const y = gridY + r * (ch + gap * 0.8);
      this._drawStatCard(ctx, x, y, cw, ch, cards[i], rev);
    }

    // ── Alt bölüm: sol bar-chart, sağ başarım halkası ──
    const lowerY = gridY + rows * (ch + gap * 0.8) + H * 0.015;
    const lowerH = Math.max(120, H - lowerY - H * 0.05);
    const chartW = gridW * 0.60;
    const ringW  = gridW - chartW - gap;

    this._drawBarChart(ctx, gridX, lowerY, chartW, lowerH, S.runs, rev);
    this._drawProgressRing(ctx, gridX + chartW + gap, lowerY, ringW, lowerH, S.ach, rev);
  },

  // ── Tekil özet kartı ──
  _drawStatCard(ctx, x, y, w, h, card, rev) {
    const C = this.COL;
    // Kart zemini + ince kenar.
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, C.panel2); grd.addColorStop(1, C.panel);
    ctx.fillStyle = grd;
    this._roundRect(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    // Üst vurgu şeridi.
    ctx.save();
    this._roundRect(ctx, x, y, w, h, 12); ctx.clip();
    ctx.fillStyle = card.col; ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y, w, Math.max(3, h * 0.05));
    ctx.restore();

    // İkon.
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(h * 0.30) + 'px system-ui, sans-serif';
    ctx.fillText(card.icon, x + w * 0.07, y + h * 0.34);

    // Değer (say-animasyonu ile 0'dan gerçek değere).
    const target = this._num(card.value, 0);
    const shown = target * rev;
    let valStr;
    if (card.kind === 'km')   valStr = (shown).toFixed(shown >= 100 ? 0 : 1) + ' km';
    else if (card.kind === 'm')   valStr = this._fmt(shown) + ' m';
    else if (card.kind === 'gold') valStr = this._fmt(shown);
    else valStr = String(Math.round(shown));

    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = card.col;
    ctx.font = 'bold ' + Math.round(h * 0.30) + 'px system-ui, sans-serif';
    ctx.fillText(valStr, x + w * 0.93, y + h * 0.36);

    // Etiket.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.mute;
    ctx.font = Math.round(h * 0.17) + 'px system-ui, sans-serif';
    ctx.fillText(card.label, x + w * 0.07, y + h * 0.82);
    ctx.textBaseline = 'alphabetic';
  },

  // ── Bar-chart (son N koşu mesafesi) ──
  _drawBarChart(ctx, x, y, w, h, runs, rev) {
    const C = this.COL;
    // Panel zemini.
    ctx.fillStyle = C.panel;
    this._roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

    // Başlık.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.text;
    // 🔴 TASMA (29 Tmz): font kart YUKSEKLIGINE bagliydi (h*0.10); dar-uzun
    //   ekranda kart yuksek olunca baslik kart GENISLIGINI asiyordu.
    ctx.font = 'bold ' + Math.round(Math.min(h * 0.10, w * 0.055)) + 'px system-ui, sans-serif';
    ctx.fillText('Son Koşular (mesafe)', x + w * 0.05, y + h * 0.13, w * 0.9);

    const data = Array.isArray(runs) ? runs.slice().reverse() : [];   // en eski → en yeni
    if (!data.length) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.mute;
      ctx.font = Math.round(h * 0.09) + 'px system-ui, sans-serif';
      ctx.fillText('Henüz veri yok', x + w / 2, y + h * 0.56);
      ctx.textBaseline = 'alphabetic';
      return;
    }

    const padX = w * 0.06, padTop = h * 0.22, padBot = h * 0.14;
    const areaX = x + padX, areaW = w - padX * 2;
    const areaTop = y + padTop, areaH = h - padTop - padBot;
    let maxV = 0;
    for (let i = 0; i < data.length; i++) maxV = Math.max(maxV, data[i]);
    if (maxV <= 0) maxV = 1;

    const n = data.length;
    const slot = areaW / n;
    const bw = slot * 0.62;
    for (let i = 0; i < n; i++) {
      const frac = (data[i] / maxV) * rev;
      const bh = Math.max(1, frac * areaH);
      const bx = areaX + i * slot + (slot - bw) / 2;
      const by = areaTop + areaH - bh;
      const grd = ctx.createLinearGradient(0, by, 0, by + bh);
      grd.addColorStop(0, C.barB); grd.addColorStop(1, C.barA);
      ctx.fillStyle = grd;
      this._roundRect(ctx, bx, by, bw, bh, Math.min(4, bw / 2)); ctx.fill();
    }
    // Taban çizgisi.
    ctx.strokeStyle = C.line; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(areaX, areaTop + areaH); ctx.lineTo(areaX + areaW, areaTop + areaH);
    ctx.stroke();
  },

  // ── Başarım ilerleme halkası (arc) ──
  _drawProgressRing(ctx, x, y, w, h, ach, rev) {
    const C = this.COL;
    ctx.fillStyle = C.panel;
    this._roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.text;
    ctx.font = 'bold ' + Math.round(h * 0.10) + 'px system-ui, sans-serif';
    ctx.fillText('Başarım', x + w / 2, y + h * 0.15);

    const cx = x + w / 2;
    const cy = y + h * 0.56;
    const r = Math.min(w, h) * 0.30;
    const lw = Math.max(6, r * 0.22);
    const pct = this._num(ach && ach.pct, 0) * rev;

    // Arka halka.
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = lw; ctx.stroke();

    // İlerleme yayı (üstten saat yönünde).
    const start = -Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + Math.PI * 2 * pct);
    const grd = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grd.addColorStop(0, C.orange); grd.addColorStop(1, C.yellow);
    ctx.strokeStyle = grd; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Orta yüzde.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.yellow;
    ctx.font = 'bold ' + Math.round(r * 0.55) + 'px system-ui, sans-serif';
    ctx.fillText(Math.round(pct * 100) + '%', cx, cy);

    // Alt: x / y.
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.mute;
    ctx.font = Math.round(h * 0.085) + 'px system-ui, sans-serif';
    const u = ach ? ach.unlocked : 0, tot = ach ? ach.total : 0;
    ctx.fillText(u + ' / ' + tot, cx, y + h * 0.94);
    ctx.textBaseline = 'alphabetic';
  },

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r < 0) r = 0;
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
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'back') return 'back';
        return null;
      }
    }
    // Panel dışına (herhangi bir boş alana) tıklama → geri.
    return 'back';
  }
};

// Global erişim (oyun içi kullanım).
if (typeof window !== 'undefined') window.StatsPanel = StatsPanel;
// Node/CommonJS ortamında da yüklenebilsin (node --check & test uyumu; tarayıcıda etkisiz).
if (typeof module !== 'undefined' && module.exports) module.exports = StatsPanel;
