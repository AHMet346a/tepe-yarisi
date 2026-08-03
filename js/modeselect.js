'use strict';
/* ModeSelect — Oyun Modu Seçici (ADDITIVE). modes.js'in GERÇEKTEN desteklediği
   modları menüden seçtirir; UI._selectedMode + Game.gameMode'a yazar (oyun bunları
   başlarken okur). DOM overlay; mevcut UI'ı bozmaz. */

const ModeSelect = {
  version: '1.0', _built: false, _btn: null, _panel: null, _rafId: 0,
  // modes.js'te case'leri OLAN modlar:
  modes: [
    { id: 'normal',     ad: 'Normal Sürüş',    em: '🚗', desc: 'Serbest sürüş, mesafe yap.' },
    { id: 'timetrial',  ad: 'Zaman Yarışı',    em: '⏱️', desc: 'En iyi süreni kır, hayaletinle yarış.' },
    { id: 'survival',   ad: 'Hayatta Kalma',   em: '💀', desc: 'Giderek zorlaşır, ne kadar dayanırsın?' },
    { id: 'boss',       ad: 'Boss Savaşı',     em: '👹', desc: 'Dev rakibi alt et.' },
    { id: 'checkpoint', ad: 'Kontrol Noktası', em: '🚩', desc: 'Süreden önce noktaları yakala.' },
    { id: 'coinrush',   ad: 'Coin Yağmuru',     em: '🪙', desc: 'Süre dolmadan en çok altını topla.' },
    { id: 'fueltrial',  ad: 'Yakıt Denemesi',  em: '⛽', desc: 'Yakıtı bitirmeden gidebildiğin kadar git.' },
    { id: 'delivery',   ad: 'Teslimat',        em: '📦', desc: 'Kargoyu düşürmeden taşı.' },
    { id: 'race',       ad: 'Yarış',           em: '🏁', desc: 'Botlara karşı yarış.' }
  ],
  // UI bare global (window.UI DEĞİL). Gerçek sayfada bare UI, Node/testte window.UI.
  _ui() { try { return (typeof UI !== 'undefined' && UI) ? UI : (window.UI = window.UI || {}); } catch (e) { return (window.UI = window.UI || {}); } },
  current() {
    try {
      const u = this._ui(); if (u && u._selectedMode) return u._selectedMode;
      if (typeof SaveData !== 'undefined' && SaveData.get) return SaveData.get('selectedMode') || 'normal';
    } catch (e) {}
    return 'normal';
  },
  select(id) {
    const m = this.modes.find(x => x.id === id); if (!m) return false;
    try { this._ui()._selectedMode = id; } catch (e) {}
    try { if (typeof Game !== 'undefined') Game.gameMode = id; } catch (e) {}
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('selectedMode', id); } catch (e) {}
    this._paintBtn();
    return true;
  },

  _game() { try { return (typeof Game !== 'undefined' && Game) ? Game : (window.Game || null); } catch (e) { return null; } },

  build() {
    if (this._built) return;
    try {
      this._injectCSS();
      // Menü butonu (sol-alt)
      const b = document.createElement('div'); b.id = 'ms_btn'; b.style.display = 'none';
      b.addEventListener('pointerdown', (e) => { if (e.cancelable) e.preventDefault(); this.toggle(true); });
      b.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); this.toggle(true); }, { passive: false });
      (document.body || document.documentElement).appendChild(b);
      this._btn = b; this._paintBtn();

      // Panel
      const p = document.createElement('div'); p.id = 'ms_panel'; p.style.display = 'none';
      const box = document.createElement('div'); box.className = 'ms-box';
      const h = document.createElement('div'); h.className = 'ms-h'; h.textContent = 'OYUN MODU SEÇ'; box.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'ms-grid';
      this.modes.forEach(m => {
        const c = document.createElement('div'); c.className = 'ms-card'; c.dataset.id = m.id;
        c.innerHTML = '<div class="ms-em">' + m.em + '</div><div class="ms-ad">' + m.ad + '</div><div class="ms-desc">' + m.desc + '</div>';
        const pick = (e) => { if (e && e.cancelable) e.preventDefault(); this.select(m.id); this._markSel(grid); if (typeof MobileHaptics !== 'undefined') MobileHaptics.vibrate(12); setTimeout(() => this.toggle(false), 180); };
        c.addEventListener('pointerdown', pick, { passive: false });
        c.addEventListener('touchstart', pick, { passive: false });
        grid.appendChild(c);
      });
      box.appendChild(grid);
      const close = document.createElement('div'); close.className = 'ms-close'; close.textContent = 'KAPAT';
      close.addEventListener('pointerdown', (e) => { if (e.cancelable) e.preventDefault(); this.toggle(false); });
      box.appendChild(close);
      p.appendChild(box);
      p.addEventListener('pointerdown', (e) => { if (e.target === p) this.toggle(false); });
      (document.body || document.documentElement).appendChild(p);
      this._panel = p; this._grid = grid;
      this._markSel(grid);
      this._built = true;
    } catch (e) {}
  },
  _paintBtn() { try { if (this._btn) { const m = this.modes.find(x => x.id === this.current()) || this.modes[0]; this._btn.innerHTML = '🎮 MOD: <b>' + m.ad + '</b>'; } } catch (e) {} },
  _markSel(grid) { try { const cur = this.current(); Array.prototype.forEach.call(grid.children, c => c.classList.toggle('sel', c.dataset.id === cur)); } catch (e) {} },
  toggle(force) { if (!this._panel) return; const show = (force === undefined) ? (this._panel.style.display === 'none') : force; this._panel.style.display = show ? 'flex' : 'none'; },

  _watch() {
    const tick = () => {
      try {
        const G = this._game();
        // Oyunda değilken (menü/garaj) göster
        const playing = !!(G && (G.state === 'playing' || G.state === 'paused'));
        if (this._btn) this._btn.style.display = playing ? 'none' : 'block';
        if (playing && this._panel && this._panel.style.display !== 'none') this.toggle(false);
      } catch (e) {}
      this._rafId = requestAnimationFrame(tick);
    };
    if (!this._rafId) this._rafId = requestAnimationFrame(tick);
  },

  _injectCSS() {
    if (document.getElementById('ms_css')) return;
    const css = `
    #ms_btn{ position:fixed; left:calc(12px + env(safe-area-inset-left,0px)); bottom:calc(12px + env(safe-area-inset-bottom,0px)); z-index:9100;
      background:rgba(20,26,40,.85); color:#e8eef7; font:600 13px system-ui,sans-serif; padding:9px 14px; border-radius:20px;
      border:1px solid rgba(255,255,255,.22); box-shadow:0 3px 12px rgba(0,0,0,.4); cursor:pointer; user-select:none; touch-action:none; }
    #ms_btn b{ color:#ff8a3d; }
    #ms_panel{ position:fixed; inset:0; z-index:9750; background:rgba(6,10,18,.72); display:none; align-items:center; justify-content:center; }
    .ms-box{ width:min(680px,92vw); max-height:88vh; overflow:auto; background:#141a28; border:1px solid rgba(255,255,255,.15); border-radius:18px; padding:20px; box-shadow:0 12px 44px rgba(0,0,0,.6); }
    .ms-h{ color:#ff8a3d; font:800 18px system-ui,sans-serif; letter-spacing:1px; text-align:center; margin-bottom:16px; }
    .ms-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
    .ms-card{ background:#1d2740; border:2px solid rgba(255,255,255,.08); border-radius:14px; padding:14px 10px; text-align:center; cursor:pointer; transition:transform .08s, border-color .08s; touch-action:none; user-select:none; }
    .ms-card:active{ transform:scale(.95); }
    .ms-card.sel{ border-color:#ff8a3d; background:#26314e; }
    .ms-em{ font-size:30px; }
    .ms-ad{ color:#fff; font:700 14px system-ui,sans-serif; margin:6px 0 4px; }
    .ms-desc{ color:#9fb0c8; font:400 11px/1.35 system-ui,sans-serif; }
    .ms-close{ margin-top:16px; text-align:center; background:#ff8a3d; color:#1a1000; font:700 14px system-ui,sans-serif; padding:11px; border-radius:12px; cursor:pointer; user-select:none; }
    `;
    try { const s = document.createElement('style'); s.id = 'ms_css'; s.textContent = css; (document.head || document.documentElement).appendChild(s); } catch (e) {}
  },

  init() { try { this.build(); this._watch(); } catch (e) {} },

  selfTest() {
    const r = {};
    try { r.modes = Array.isArray(ModeSelect.modes) && ModeSelect.modes.length >= 6; } catch (e) { r.modes = false; }
    try { r.current = typeof ModeSelect.current() === 'string'; } catch (e) { r.current = false; }
    try {
      ModeSelect.select('survival');
      r.select = (ModeSelect.current() === 'survival');
      ModeSelect.select('normal');
    } catch (e) { r.select = false; }
    try { r.reject = ModeSelect.select('gecersiz_mod') === false; } catch (e) { r.reject = false; }
    r.allPass = Object.keys(r).every(k => r[k] === true);
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.ModeSelect = ModeSelect;
  try {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => ModeSelect.init());
    else ModeSelect.init();
  } catch (e) {}
}
