'use strict';
/* MobileUI — Mobil kontrol derinleştirme (ADDITIVE): Duraklat butonu, Ayarlar paneli
   (haptik / tam ekran / kalite / ses), ve opsiyonel Lean (denge) butonları.
   mobile.js'i bozmaz; kendi DOM katmanını kurar. Sadece dokunmatik/mobilde görünür. */

const MobileUI = {
  version: '1.0', _built: false, _panel: null, _rafId: 0,
  _game() { try { return (typeof Game !== 'undefined' && Game) ? Game : (window.Game || null); } catch (e) { return null; } },

  // 🔴 BUGFIX(28 Tmz) — MOBİLDE ÇİFT TETİKLEME.
  //   Dokunmatik cihazda TEK dokunuşta hem `pointerdown` hem `touchstart` gelir.
  //   `pointerdown` üzerinde preventDefault() çağırmak `touchstart`'ı ENGELLEMEZ
  //   (yalnız uyumluluk fare olaylarını engeller). Sonuç: `onTap` iki kez koşuyordu.
  //   · ⏸ butonu: pause() sonra hemen resume() → oyun HİÇ duraklamıyordu.
  //   · Ayar anahtarları: iki kez toggle → eski haline dönüyordu.
  //   ▶ Zaman damgalı dedup: 350 ms içindeki ikinci tetikleme yok sayılır.
  //     (Aynı desen mobile.js pedallarında da var ama orada `set(id,on)`
  //      idempotent olduğu için zararsız — burada değil.)
  _dedup(fn) {
    let son = 0;
    return function (ev) {
      const simdi = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
      if (simdi - son < 350) {
        if (ev && ev.cancelable) ev.preventDefault();
        return;
      }
      son = simdi;
      fn(ev);
    };
  },

  _btn(id, html, onTap) {
    const b = document.createElement('div');
    b.id = 'mui_' + id; b.className = 'mui-btn'; b.innerHTML = html;
    b.style.touchAction = 'none';
    const fire = this._dedup((ev) => { if (ev.cancelable) ev.preventDefault(); ev.stopPropagation(); try { onTap(); } catch (e) {} if (typeof MobileHaptics !== 'undefined') MobileHaptics.vibrate(10); });
    b.addEventListener('pointerdown', fire, { passive: false });
    b.addEventListener('touchstart', fire, { passive: false });
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  },

  _toggleRow(label, getState, onToggle) {
    const row = document.createElement('div'); row.className = 'mui-row';
    const lbl = document.createElement('span'); lbl.textContent = label;
    const sw = document.createElement('span'); sw.className = 'mui-sw';
    const paint = () => { const on = !!getState(); sw.textContent = on ? 'AÇIK' : 'KAPALI'; sw.classList.toggle('on', on); };
    // Çift tetikleme koruması — bkz. _dedup() üstündeki açıklama.
    const fire = this._dedup((ev) => { if (ev && ev.cancelable) ev.preventDefault(); try { onToggle(); } catch (e) {} paint(); if (typeof MobileHaptics !== 'undefined') MobileHaptics.vibrate(10); });
    sw.addEventListener('pointerdown', fire, { passive: false });
    sw.addEventListener('touchstart', fire, { passive: false });
    paint(); row.appendChild(lbl); row.appendChild(sw); return row;
  },

  build() {
    if (this._built) return;
    try {
      this._injectCSS();
      // Üst kontrol çubuğu: Duraklat + Ayarlar
      const bar = document.createElement('div'); bar.id = 'mui_bar'; bar.style.display = 'none';
      bar.appendChild(this._btn('pause', '⏸', () => {
        const G = this._game(); if (!G) return;
        if (G.state === 'playing' && G.pause) G.pause();
        else if (G.state === 'paused' && G.resume) G.resume();
      }));
      bar.appendChild(this._btn('gear', '⚙', () => this.togglePanel()));
      (document.body || document.documentElement).appendChild(bar);

      // Ayarlar paneli
      const p = document.createElement('div'); p.id = 'mui_panel'; p.style.display = 'none';
      const box = document.createElement('div'); box.className = 'mui-box';
      const h = document.createElement('div'); h.className = 'mui-h'; h.textContent = 'AYARLAR'; box.appendChild(h);
      box.appendChild(this._toggleRow('Titreşim (haptik)',
        () => (typeof MobileHaptics !== 'undefined' && MobileHaptics.enabled),
        () => { if (typeof MobileHaptics !== 'undefined') MobileHaptics.toggle(); }));
      box.appendChild(this._toggleRow('Tam ekran',
        () => (typeof MobileFullscreen !== 'undefined' && MobileFullscreen.isFull()),
        () => { if (typeof MobileFullscreen !== 'undefined') MobileFullscreen.toggle(); }));
      box.appendChild(this._toggleRow('Düşük kalite (akıcı)',
        () => !!window._MUI_LOWQ,
        () => { window._MUI_LOWQ = !window._MUI_LOWQ; try { if (typeof Quality !== 'undefined' && Quality.setLevel) Quality.setLevel(window._MUI_LOWQ ? 'low' : 'high'); } catch (e) {} }));
      box.appendChild(this._toggleRow('Ses',
        () => { try { const A = window.AHMET_AUDIO_MASTER; if (A && typeof A.isMuted !== 'undefined') return !A.isMuted; } catch (e) {} return !window._MUI_MUTE; },
        () => {
          try { const A = window.AHMET_AUDIO_MASTER; if (A && typeof A.toggleMute === 'function') { A.toggleMute(); window._MUI_MUTE = !!A.isMuted; return; } } catch (e) {}
          // Yedek: master ses seviyesini 0'a al / geri yükle
          window._MUI_MUTE = !window._MUI_MUTE;
          try { if (typeof Audio !== 'undefined' && Audio.setMasterVolume) { if (window._MUI_MUTE) { window._MUI_PREVVOL = (Audio._masterVolume == null ? 1 : Audio._masterVolume); Audio.setMasterVolume(0); } else { Audio.setMasterVolume(window._MUI_PREVVOL == null ? 1 : window._MUI_PREVVOL); } } } catch (e) {}
        }));
      const close = this._btn('close', 'KAPAT', () => this.togglePanel(false)); close.className = 'mui-close';
      box.appendChild(close);
      p.appendChild(box);
      p.addEventListener('pointerdown', (e) => { if (e.target === p) this.togglePanel(false); });
      (document.body || document.documentElement).appendChild(p);

      this._bar = bar; this._panel = p; this._built = true;
    } catch (e) {}
  },

  togglePanel(force) {
    if (!this._panel) return;
    const show = (force === undefined) ? (this._panel.style.display === 'none') : force;
    this._panel.style.display = show ? 'flex' : 'none';
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ PERF(31 Tmz) — KARE BAŞINA `innerHTML` YAZIMI + `getElementById` SİLİNDİ
  // ═══════════════════════════════════════════════════════════════════════════
  // ÖLÇÜLDÜ (`node port-araclari\olcum-mobil-dom.js`): eski hâl 600 karede
  //   · 600 `innerHTML` yazımı   · 600 `getElementById`   · 600 `style` yazımı
  // `pb.innerHTML = '⏸'` DEĞER AYNI OLSA BİLE ucuz DEĞİLDİR: tarayıcı HTML
  // parçasını yeniden ayrıştırır, eski çocuk düğümü siler, yenisini takar ve
  // `#mui_bar` alt ağacının stil/düzenini geçersiz kılar. Yani oyun çizerken
  // her karede bir DOM yeniden kurma + düzen geçersizleştirme oluyordu.
  // ▶ Artık: eleman referansı bir kez bulunur, yazma YALNIZ DEĞER DEĞİŞİNCE olur.
  //   Sabit durumda kare başına DOM işi SIFIR.
  // 🔴 rAF döngüsü de kaldırıldı — `Main.pompaEkle()` ile ana döngüye takılıyor.
  _sonGoster: null, _sonIkon: null, _pauseEl: null,
  pump() {
    try {
      const G = this._game();
      const show = !!(G && (G.state === 'playing' || G.state === 'paused'));
      if (show !== this._sonGoster) {
        this._sonGoster = show;
        if (this._bar) this._bar.style.display = show ? 'flex' : 'none';
      }
      if (!G) return;
      // duraklat ikonu — YALNIZ değişince yaz
      const ikon = (G.state === 'paused') ? '▶' : '⏸';
      if (ikon !== this._sonIkon) {
        this._sonIkon = ikon;
        if (!this._pauseEl) this._pauseEl = document.getElementById('mui_pause');
        if (this._pauseEl) this._pauseEl.textContent = ikon;   // innerHTML DEĞİL: ayrıştırma yok
      }
    } catch (e) {}
  },
  _kendiRaf() {
    if (this._rafId) return;
    const tick = () => { this.pump(); this._rafId = requestAnimationFrame(tick); };
    this._rafId = requestAnimationFrame(tick);
  },
  _watch() {
    if (this._pompali || this._rafId) return;   // init() iki kez çağrılırsa çift kayıt olmasın
    const M = (typeof Main !== 'undefined' && Main) ? Main : (typeof window !== 'undefined' ? window.Main : null);
    if (M && typeof M.pompaEkle === 'function' && M.pompaEkle(() => this.pump())) {
      this._pompali = true;
      try { setTimeout(() => { if (!(M._pompaTik > 0)) this._kendiRaf(); }, 1500); } catch (e) { this._kendiRaf(); }
      return;
    }
    this._kendiRaf();
  },

  _injectCSS() {
    if (document.getElementById('mui_css')) return;
    const css = `
    #mui_bar{ position:fixed; top:calc(10px + env(safe-area-inset-top,0px)); right:calc(12px + env(safe-area-inset-right,0px)); z-index:9200; display:flex; gap:8px; pointer-events:none; }
    .mui-btn{ pointer-events:auto; width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center;
      background:rgba(20,26,40,.8); color:#fff; font:600 20px system-ui,sans-serif; border:1px solid rgba(255,255,255,.25);
      box-shadow:0 3px 12px rgba(0,0,0,.4); user-select:none; -webkit-tap-highlight-color:transparent; touch-action:none; }
    .mui-btn:active{ transform:scale(.92); }
    #mui_panel{ position:fixed; inset:0; z-index:9700; background:rgba(6,10,18,.6); display:none; align-items:center; justify-content:center; }
    .mui-box{ width:min(420px,86vw); background:#141a28; border:1px solid rgba(255,255,255,.15); border-radius:16px; padding:18px 18px 14px; box-shadow:0 10px 40px rgba(0,0,0,.6); }
    .mui-h{ color:#ff8a3d; font:800 16px system-ui,sans-serif; letter-spacing:1px; text-align:center; margin-bottom:12px; }
    .mui-row{ display:flex; align-items:center; justify-content:space-between; padding:11px 4px; border-top:1px solid rgba(255,255,255,.07); color:#e8eef7; font:600 15px system-ui,sans-serif; }
    .mui-sw{ padding:5px 12px; border-radius:14px; font:700 12px system-ui,sans-serif; background:#33405a; color:#aab4c6; min-width:64px; text-align:center; touch-action:none; user-select:none; }
    .mui-sw.on{ background:#1f8a3c; color:#fff; }
    .mui-close{ width:100%; height:auto; padding:11px; margin-top:14px; border-radius:12px; font:700 14px system-ui,sans-serif; background:#ff8a3d; color:#1a1000; }
    @media (min-width:900px) and (pointer:fine){ #mui_bar{ top:12px; } }
    `;
    try { const s = document.createElement('style'); s.id = 'mui_css'; s.textContent = css; (document.head || document.documentElement).appendChild(s); } catch (e) {}
  },

  init() {
    try {
      // Masaüstünde de duraklat/ayarlar faydalı; her yerde kur ama çubuk sadece oyunda görünür
      this.build();
      this._watch();
    } catch (e) {}
  },

  selfTest() {
    const r = {};
    try { r.build = typeof MobileUI.build === 'function'; } catch (e) { r.build = false; }
    try { r.panel = typeof MobileUI.togglePanel === 'function'; } catch (e) { r.panel = false; }
    try { r.game = typeof MobileUI._game === 'function'; } catch (e) { r.game = false; }
    try {
      // sahte toggle satırı davranışı
      let state = false;
      const row = MobileUI._toggleRow('x', () => state, () => { state = !state; });
      r.toggle = !!row && typeof row.appendChild !== 'undefined';
    } catch (e) { r.toggle = false; }
    r.allPass = Object.keys(r).every(k => r[k] === true);
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.MobileUI = MobileUI;
  try {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => MobileUI.init());
    else MobileUI.init();
  } catch (e) {}
}
