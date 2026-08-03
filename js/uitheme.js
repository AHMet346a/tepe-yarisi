'use strict';
/* UITheme — Modern & Temiz arayüz cila/tema katmanı (ADDITIVE, güvenli).
   UI.draw (menüler) ve HUD.draw (oyun içi) sarmalanır; ORİJİNAL önce çizilir,
   üstüne cohesive bir cila eklenir (vignette, yumuşak scrim'ler, ince aksan).
   İçeriği kapatmaz; hata olsa bile oyun/menü bozulmaz (her ekleme try/catch).
   Ayrıca diğer kodun kullanabileceği modern çizim primitifleri sunar. */

const UITheme = {
  version: '1.0', _wrapped: false,
  // ── Tasarım tokenları (modern & temiz) ──
  c: {
    ink: '#0e1320', ink2: '#141a28', line: 'rgba(255,255,255,0.10)',
    text: '#e8eef7', sub: '#9fb0c8', accent: '#ff8a3d', accent2: '#59d67a',
    info: '#7cc6ff', gold: '#ffcf3f', danger: '#ff5a5a', shadow: 'rgba(0,0,0,0.45)'
  },
  r: { sm: 8, md: 14, lg: 22, pill: 999 },

  // ── Tipografi rolleri (HUD/UI genelinde tek dil) ──
  // Eskiden karışıktı: Arial (87×), monospace (27×), "Arial Black" (15×), Impact (14×).
  // Artık 3 rol: display (büyük sayı/vurgu), label (etiket/gövde), mono (teknik sayaç).
  f: {
    _st: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    _dp: 'Impact, "Arial Black", system-ui, sans-serif',
    _mn: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
    // UITheme.f.display(22) → 'bold 22px Impact, "Arial Black", system-ui, sans-serif'
    display(size, weight) { return (weight || 'bold') + ' ' + (size || 20) + 'px ' + UITheme.f._dp; },
    label(size, weight)   { return (weight || '600')  + ' ' + (size || 12) + 'px ' + UITheme.f._st; },
    mono(size, weight)    { return (weight || 'bold') + ' ' + (size || 12) + 'px ' + UITheme.f._mn; }
  },

  // ── HUD yarıçap ölçeği + snap ──
  // 12 farklı yarıçap (2,3,4,5,6,7,8,9,10,12,14,15) → 4 basamak.
  hr: { xs: 4, sm: 8, md: 14, pill: 999 },
  snap(r) {
    r = Math.abs(+r || 0);
    if (r <= 5)  return this.hr.xs;   // 2,3,4,5   → 4
    if (r <= 10) return this.hr.sm;   // 6..10     → 8
    if (r <= 18) return this.hr.md;   // 12,14,15  → 14
    return this.hr.pill;
  },

  // ── Primitifler ──
  roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.min(Math.abs(w), Math.abs(h)) / 2));
    ctx.beginPath();
    if (ctx.roundRect) { try { ctx.roundRect(x, y, w, h, r); return; } catch (e) {} }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  panel(ctx, x, y, w, h, opt) {
    opt = opt || {};
    ctx.save();
    if (opt.shadow !== false) { ctx.shadowColor = this.c.shadow; ctx.shadowBlur = opt.blur || 18; ctx.shadowOffsetY = opt.dy == null ? 6 : opt.dy; }
    this.roundRect(ctx, x, y, w, h, opt.r == null ? this.r.md : opt.r);
    ctx.fillStyle = opt.fill || this.c.ink2; ctx.fill();
    ctx.shadowColor = 'transparent';
    if (opt.stroke !== false) { ctx.lineWidth = 1; ctx.strokeStyle = opt.strokeColor || this.c.line; ctx.stroke(); }
    ctx.restore();
  },
  pill(ctx, x, y, w, h, fill) {
    this.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = fill || 'rgba(20,26,40,0.72)'; ctx.fill();
  },
  vignette(ctx, W, H, strength) {
    try {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,' + (strength == null ? 0.28 : strength) + ')');
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    } catch (e) {}
  },
  scrim(ctx, x, y, w, h, from, to) {
    try {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, from); g.addColorStop(1, to);
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
    } catch (e) {}
  },
  hairline(ctx, x, y, w, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 0.5 : alpha;
    ctx.fillStyle = color || this.c.accent; ctx.fillRect(x, y, w, 2); ctx.restore();
  },

  // ── Cila katmanları ──
  // Menü/UI ekranları (UI.draw sonrası): cohesive çerçeveleme
  screenPolish(ctx, W, H) {
    try {
      // üstte yumuşak derinlik scrim'i
      this.scrim(ctx, 0, 0, W, Math.min(120, H * 0.18), 'rgba(6,10,20,0.30)', 'rgba(6,10,20,0)');
      // altta hafif oturtma scrim'i
      this.scrim(ctx, 0, H - Math.min(120, H * 0.18), W, Math.min(120, H * 0.18), 'rgba(6,10,20,0)', 'rgba(6,10,20,0.32)');
      // en üstte ince turuncu aksan çizgisi (marka)
      this.hairline(ctx, 0, 0, W, this.c.accent, 0.35);
      // köşe vignette — modern çerçeve
      this.vignette(ctx, W, H, 0.22);
    } catch (e) {}
  },
  // Oyun içi HUD (HUD.draw sonrası): okunabilirliği artıran ince scrim'ler
  hudPolish(ctx, W, H) {
    try {
      this.scrim(ctx, 0, 0, W, Math.min(96, H * 0.16), 'rgba(6,10,20,0.26)', 'rgba(6,10,20,0)');
      this.scrim(ctx, 0, H - Math.min(110, H * 0.2), W, Math.min(110, H * 0.2), 'rgba(6,10,20,0)', 'rgba(6,10,20,0.24)');
      this.vignette(ctx, W, H, 0.16);
    } catch (e) {}
  },

  init() {
    if (this._wrapped) return;
    try {
      // UI.draw(dt) sarmala → menülere cila
      if (typeof UI !== 'undefined' && typeof UI.draw === 'function') {
        const _ud = UI.draw.bind(UI); const self = this;
        UI.draw = function (dt) {
          _ud(dt);
          try {
            const ctx = UI.ctx, W = UI.canvas.width, H = UI.canvas.height;
            // oyun-öncesi ekranlarda uygula (oyun HUD'u ayrı)
            if (ctx && UI.currentScreen && UI.currentScreen !== 'game') self.screenPolish(ctx, W, H);
          } catch (e) {}
        };
      }
      // HUD.draw(ctx,vehicle,gs,W,H) sarmala → oyun içi cila
      if (typeof HUD !== 'undefined' && typeof HUD.draw === 'function') {
        const _hd = HUD.draw.bind(HUD); const self = this;
        HUD.draw = function (ctx, vehicle, gs, W, H) {
          _hd.apply(HUD, arguments);
          try {
            const cw = (typeof W === 'number') ? W : (ctx && ctx.canvas ? ctx.canvas.width : 0);
            const ch = (typeof H === 'number') ? H : (ctx && ctx.canvas ? ctx.canvas.height : 0);
            if (ctx && cw && ch) self.hudPolish(ctx, cw, ch);
          } catch (e) {}
        };
      }
      this._wrapped = true;
    } catch (e) { try { console.error('[UITheme.init]', e); } catch (_) {} }
  },

  selfTest() {
    const r = {};
    const mk = () => {
      const calls = [];
      return { canvas: { width: 800, height: 400 }, save() {}, restore() {}, beginPath() {}, moveTo() {}, arcTo() {}, closePath() {},
        fill() { calls.push('f'); }, stroke() {}, fillRect() { calls.push('r'); }, roundRect() {},
        createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; },
        set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set globalAlpha(v) {}, set shadowColor(v) {}, set shadowBlur(v) {}, set shadowOffsetY(v) {}, _calls: calls };
    };
    try { const c = mk(); UITheme.roundRect(c, 0, 0, 100, 40, 12); r.roundrect = true; } catch (e) { r.roundrect = false; }
    try { const c = mk(); UITheme.panel(c, 0, 0, 100, 40, {}); r.panel = c._calls.indexOf('f') >= 0; } catch (e) { r.panel = false; }
    try { const c = mk(); UITheme.vignette(c, 800, 400, 0.2); r.vignette = c._calls.indexOf('r') >= 0; } catch (e) { r.vignette = false; }
    try { const c = mk(); UITheme.screenPolish(c, 800, 400); r.screenpolish = true; } catch (e) { r.screenpolish = false; }
    try { const c = mk(); UITheme.hudPolish(c, 800, 400); r.hudpolish = true; } catch (e) { r.hudpolish = false; }
    try { r.tokens = typeof UITheme.c.accent === 'string' && typeof UITheme.r.md === 'number'; } catch (e) { r.tokens = false; }
    // Tipografi rolleri doğru font string'i üretiyor mu
    try {
      r.fonts = UITheme.f.display(22).indexOf('22px') > 0 && UITheme.f.display(22).indexOf('Impact') > 0
             && UITheme.f.label(12).indexOf('system-ui') > 0
             && UITheme.f.mono(10).indexOf('monospace') > 0;
    } catch (e) { r.fonts = false; }
    // Yarıçap snap doğru basamağa oturuyor mu
    try {
      r.snap = UITheme.snap(3) === 4 && UITheme.snap(7) === 8 && UITheme.snap(15) === 14 && UITheme.snap(999) === 999;
    } catch (e) { r.snap = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.UITheme = UITheme;
  try {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { UITheme.init(); }, 0); });
    else setTimeout(function () { UITheme.init(); }, 0);
  } catch (e) {}
}
