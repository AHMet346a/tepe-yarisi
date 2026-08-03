'use strict';
const Main = {
  canvas: null,
  ctx: null,
  mode: 'ui',
  lastTime: 0,
  animFrame: null,

  // In-game overlay state
  _gameOverlay: null,   // null | 'fuel' | 'crash'
  _overlayTimer: 0,
  _overlayAlpha: 0,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    SaveData.load();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => { setTimeout(() => this._resize(), 120); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this._resize());
      window.visualViewport.addEventListener('scroll', () => this._resize());
    }
    // DAYANIKLI BOOT: bir alt sistem (özellikle mobilde WebAudio/autoplay
    // kısıtı yüzünden Audio.init) hata verirse, try/catch olmadan tüm init
    // dururdu ve oyun "donmuş" gibi görünürdü. Her birini izole ediyoruz.
    const _safeInit = (name, fn) => {
      try { fn(); } catch (e) { try { console.error('[init] ' + name + ' hata:', e); } catch (_) {} }
    };
    _safeInit('Audio',    () => Audio.init());
    _safeInit('Camera',   () => Camera.init(this.canvas));
    _safeInit('Renderer', () => Renderer.init(this.canvas));
    _safeInit('UI',       () => UI.init(this.canvas));
    _safeInit('Game',     () => Game.init(this.canvas));
    // ── KLAN SİSTEMİ (2 Ağu) — SIRA ÖNEMLİ: `Klan` çekirdek, diğerleri onu okur.
    //   `Klan.hazir()` içinde `eskidenAktar()` var → eski `social.js` `Clan`
    //   verisi (varsa) yeni şemaya taşınır. `SaveData.load()` YUKARIDA çağrıldı,
    //   bu yüzden `Klan._oku` gerçek kaydı görür.
    _safeInit('Klan',         () => { if (typeof Klan         !== 'undefined') Klan.hazir(); });
    _safeInit('KlanSim',      () => { if (typeof KlanSim      !== 'undefined') KlanSim.hazir(); });
    _safeInit('KlanKutu',     () => { if (typeof KlanKutu     !== 'undefined') KlanKutu.hazir(); });
    _safeInit('KlanEtkinlik', () => { if (typeof KlanEtkinlik !== 'undefined') KlanEtkinlik.hazir(); });
    _safeInit('KlanSavas',    () => { if (typeof KlanSavas    !== 'undefined') KlanSavas.hazir(); });
    _safeInit('KlanUI',       () => { if (typeof KlanUI       !== 'undefined') KlanUI.hazir(); });

    this.canvas.addEventListener('click',    e => this._handleUIClick(e));
    this.canvas.addEventListener('touchend', e => this._handleTouch(e), { passive: false });

    // Mouse wheel → scroll the map-settings screens (GENEL/MAP AYARLARI).
    // Larger step (~40% of viewport) so the ~600-row list moves quickly.
    this.canvas.addEventListener('wheel', e => {
      if (this._onMapsScreen()) {
        e.preventDefault();
        if (typeof UI._mapCfgWheelStep === 'function') UI._mapCfgWheelStep(e.deltaY > 0 ? +1 : -1);
        else if (typeof UI._mapCfgScrollBy === 'function') UI._mapCfgScrollBy(e.deltaY > 0 ? 200 : -200);
      }
    }, { passive: false });

    // ── Draggable scrollbar: pointer down/move/up (mouse + touch) ────────────
    // Only capture when the press STARTS on the scrollbar region while on the
    // settings screen with the maps tab active — so the normal click dispatch
    // for the −/＋/toggle buttons is never intercepted.
    // ⚡ PERF(31 Tmz): önbellekli ölçek — eskiden her sürükleme olayında
    //   `getBoundingClientRect()` = 1 zorunlu yeniden düzen.
    const sbPointerXY = (e) => {
      const r = (typeof UI !== 'undefined' && UI._cvRect) ? UI._cvRect()
              : (() => { const b = this.canvas.getBoundingClientRect();
                         return { left: b.left, top: b.top,
                                  sx: (b.width  > 0) ? this.canvas.width  / b.width  : 1,
                                  sy: (b.height > 0) ? this.canvas.height / b.height : 1 }; })();
      const src = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
      return { x: (src.clientX - r.left) * r.sx, y: (src.clientY - r.top) * r.sy };
    };
    const sbDown = (e) => {
      if (!this._onMapsScreen()) return;
      const p = sbPointerXY(e);
      // Scrollbar takes precedence — check it first so a press on the bar
      // gutter never becomes a slider set.
      if (typeof UI._sbHitKind === 'function' && UI._sbHitKind(p.x, p.y)) {
        UI._sbBeginDrag(p.x, p.y);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Only capture a slider drag when the press STARTS on a slider bar, so the
      // normal −/＋/toggle click dispatch is never intercepted.
      if (typeof UI._sliderBeginDrag === 'function' && UI._sliderHitAt &&
          UI._sliderHitAt(p.x, p.y)) {
        UI._sliderBeginDrag(p.x, p.y);
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const sbMove = (e) => {
      if (typeof UI._sbIsDragging === 'function' && UI._sbIsDragging()) {
        const p = sbPointerXY(e);
        UI._sbDragTo(p.y);
        e.preventDefault();
        return;
      }
      if (typeof UI._sliderIsDragging === 'function' && UI._sliderIsDragging()) {
        const p = sbPointerXY(e);
        UI._sliderDragTo(p.x);
        e.preventDefault();
      }
    };
    // ═════════════════════════════════════════════════════════════════════════
    // ⚡ PERF(31 Tmz) — `passive:false` GLOBAL `touchmove` DİNLEYİCİSİ KALDIRILDI
    // ═════════════════════════════════════════════════════════════════════════
    // ESKİ HÂL: `window` üzerinde SÜREKLİ duran, `passive:false` bir `touchmove`
    // dinleyicisi vardı. `passive:false` tarayıcıya "bu dinleyici
    // preventDefault() çağırabilir" der; bu yüzden derleyici/kompozitör
    // dokunma hareketini İŞLEYEMEZ, önce ANA İŞ PARÇACIĞINDA JS'in dönmesini
    // BEKLER. Ana iş parçacığı zaten oyunu çiziyorsa her parmak hareketi
    // kuyruğa girer → "parmağım kayıyor ama tepki gecikiyor".
    // ⚠ Bu dinleyici YALNIZ ayarlar/haritalar ekranında kaydırma çubuğu
    //   SÜRÜKLENİRKEN iş yapıyordu; oyun sırasında her seferinde 2 `typeof`
    //   kontrolüyle boş dönüyordu — ama maliyeti dönmesinde değil, VARLIĞINDA.
    // ▶ Artık `sbMove`/`sbUp` yalnız GERÇEK bir sürükleme başladığında bağlanır,
    //   sürükleme bitince sökülür. Davranış birebir aynı (preventDefault ancak
    //   sürükleme sırasında gerekiyordu), oyun sırasında dinleyici SIFIR.
    let _sbBagli = false;
    const sbBagla = () => {
      if (_sbBagli) return; _sbBagli = true;
      window.addEventListener('mousemove', sbMove, { passive: false });
      window.addEventListener('touchmove', sbMove, { passive: false });
    };
    const sbCoz = () => {
      if (!_sbBagli) return; _sbBagli = false;
      window.removeEventListener('mousemove', sbMove, { passive: false });
      window.removeEventListener('touchmove', sbMove, { passive: false });
    };
    const sbUp = () => {
      if (typeof UI._sbIsDragging === 'function' && UI._sbIsDragging()) UI._sbEndDrag();
      if (typeof UI._sliderIsDragging === 'function' && UI._sliderIsDragging()) UI._sliderEndDrag();
      sbCoz();
    };
    // Sürükleme gerçekten başladıysa (UI durumu öyle diyorsa) hareketi dinlemeye başla.
    const sbDownBagla = (e) => {
      sbDown(e);
      const suruk = (typeof UI._sbIsDragging === 'function' && UI._sbIsDragging()) ||
                    (typeof UI._sliderIsDragging === 'function' && UI._sliderIsDragging());
      if (suruk) sbBagla();
    };
    this.canvas.addEventListener('mousedown',  sbDownBagla, { passive: false });
    window.addEventListener('mouseup',         sbUp);
    this.canvas.addEventListener('touchstart', sbDownBagla, { passive: false });
    window.addEventListener('touchend',        sbUp);
    window.addEventListener('touchcancel',     sbUp);

    // ── Keyboard scrolling while on settings + maps tab ──────────────────────
    document.addEventListener('keydown', e => {
      if (!this._onMapsScreen()) return;
      let handled = true;
      switch (e.key) {
        case 'PageDown':  UI._mapCfgPageBy(+1); break;
        case 'PageUp':    UI._mapCfgPageBy(-1); break;
        case 'Home':      UI._mapCfgScrollHome(); break;
        case 'End':       UI._mapCfgScrollEnd(); break;
        case 'ArrowDown': UI._mapCfgScrollBy(+48); break;
        case 'ArrowUp':   UI._mapCfgScrollBy(-48); break;
        default:          handled = false;
      }
      if (handled) e.preventDefault();
    });

    document.addEventListener('keydown', e => {
      // #16 FPS/frame-time grafiği aç/kapa
      if ((e.key === 'f' || e.key === 'F') && typeof FpsMeter !== 'undefined') { FpsMeter.toggle(); }
      if (e.key === 'Escape' && this.mode === 'game') {
        if (typeof UpgradeUI !== 'undefined' && UpgradeUI.isOpen()) { UpgradeUI.close(); return; }
        if (Game.state === 'playing') Game.pause();
        else if (Game.state === 'paused') Game.resume();
      }
      if ((e.key === 'u' || e.key === 'U') && this.mode === 'game') {
        const vid = Game.vehicleId || SaveData.get('selectedVehicle') || 'jeep';
        if (typeof UpgradeUI !== 'undefined') {
          if (UpgradeUI.isOpen()) UpgradeUI.close(); else UpgradeUI.open(vid);
        }
      }

    });

    // Girişte sinematik/hikaye animasyonu oynasın; dokununca veya bitince menüye geçer.
    if (typeof Intro !== 'undefined') { Intro.reset(); UI.currentScreen = 'intro'; }
    else UI.currentScreen = 'menu';
    this.mode = 'ui';
    Audio.playBGM('menu');
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ PERF(31 Tmz) — TEK rAF KURALI: ORTAK DOM POMPASI
  // ═══════════════════════════════════════════════════════════════════════════
  // Mobilde ÖLÇÜLDÜ: `mobile.js` (TouchControls._watch) ve `mobileui.js`
  // (MobileUI._watch) KENDİ `requestAnimationFrame` döngülerini açıyordu.
  // Her ek rAF döngüsü = kare başına ekstra JS uyanması + ayrı bir görev; ikisi
  // de yalnızca "Game.state değişti mi?" diye bakıp DOM'a yazıyordu.
  // ▶ Artık ikisi de buraya kaydolur (`Main.pompaEkle`) ve ANA döngüde,
  //   kare başına BİR kez çalışır. Mobil rAF döngüsü: 2 → 0.
  // 🔴 Kaydolan fonksiyon ASLA atmasın diye her biri try/catch içinde çağrılır;
  //   biri patlarsa oyun döngüsü etkilenmez.
  _pompalar: [],
  pompaEkle(fn) {
    if (typeof fn !== 'function') return false;
    if (this._pompalar.indexOf(fn) < 0) this._pompalar.push(fn);
    this._pompaTik = (this._pompaTik || 0);
    return true;
  },
  _pompaCalistir() {
    const p = this._pompalar;
    for (let i = 0; i < p.length; i++) { try { p[i](); } catch (e) {} }
    this._pompaTik = (this._pompaTik || 0) + 1;
  },

  loop(now) {
    this.animFrame = requestAnimationFrame(t => this.loop(t));
    let dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    // Mobil DOM katmanı (pedallar / üst çubuk) — kendi rAF'ı yerine burada.
    if (this._pompalar.length) this._pompaCalistir();

    // #16 Kare-hız ölçer beslemesi (ucuz; overlay 'F' ile açılır) + telemetri
    if (typeof FpsMeter !== 'undefined') FpsMeter.sample(dt);
    if (typeof Telemetry !== 'undefined' && Telemetry.frame) { try { Telemetry.frame(dt); } catch (e) {} }

    // Replay oynatma — aktifse her şeyin önünde oynat
    if (typeof Replay !== 'undefined' && Replay.isPlaying && Replay.isPlaying()) {
      Replay.update(dt); Replay.drawPlayback(this.ctx); return;
    }

    if (this.mode === 'ui') {
      UI.draw(dt);
    } else if (this.mode === 'openworld' && typeof OpenWorld !== 'undefined') {
      if (OpenWorld.wantsExit && OpenWorld.wantsExit()) { OpenWorld.finish(); this._goMenu(); }
      else { OpenWorld.update(dt); OpenWorld.draw(this.ctx); OpenWorld.drawHUD(this.ctx, this.canvas.width, this.canvas.height); }
    } else {
      // #9 TimeScale: geçici slow-mo süresini erit; #10 PowerModes'u da tek çarpandan geçir
      if (typeof TimeScale !== 'undefined') TimeScale.update(dt);
      let simDt = dt;
      if (typeof PowerModes !== 'undefined' && PowerModes.isActive && PowerModes.isActive()) simDt = PowerModes.apply(simDt);
      if (typeof TimeScale !== 'undefined') simDt = TimeScale.apply(simDt);
      // #1 Sabit-adım fizik (+#8 Watchdog izolasyonu): düşük FPS'te fizik yavaşlamaz,
      //   yüksek FPS'te hızlanmaz; 60fps'te davranış birebir aynıdır.
      if (typeof FixedStep !== 'undefined' && typeof Watchdog !== 'undefined') {
        FixedStep.run(simDt, function (fdt) { Watchdog.guard('game.update', function () { Game.update(fdt); }); });
      } else {
        Game.update(simDt);
      }
      if (typeof DynamicAudio !== 'undefined' && DynamicAudio.update) {
        (typeof Watchdog !== 'undefined' ? Watchdog.guard('dynamicaudio', function () { DynamicAudio.update(Game.vehicle, dt); }) : DynamicAudio.update(Game.vehicle, dt));
      }
      if (typeof MPRooms !== 'undefined' && MPRooms.isActive && MPRooms.isActive()) MPRooms.update(dt);
      Renderer.drawGame(Game.vehicle, Game.vehicleId, Game.terrain, Camera, Particles, now / 1000);
      if (typeof MPRooms !== 'undefined' && MPRooms.isActive && MPRooms.isActive()) MPRooms.drawRace(this.ctx, Camera);
      HUD.draw(this.ctx, Game.vehicle,
        { coinsCollected: Game.coinsCollected },
        this.canvas.width, this.canvas.height);
      Renderer.drawControls(this.ctx, this.canvas.width, this.canvas.height,
        Game.controlState.throttle, Game.controlState.brake);

      // Always-visible game HUD buttons
      this._drawGameButtons(dt);

      // İlk-oyun rehberi (tutorial) ipuçları
      if (Game.state === 'playing' && Game._tutorialActive) this._drawTutorial();

      // Başlangıç geri sayımı (3-2-1-GO)
      if ((Game._countdown && Game._countdown > 0) || (Game._goFlash && Game._goFlash > 0)) this._drawCountdown();

      if (Game.state === 'paused') this._drawPauseOverlay();

      // Death overlays (fuel / crash)
      this._updateDeathOverlay(dt);
      if (typeof MPRooms !== 'undefined' && MPRooms.isActive && MPRooms.isActive()) MPRooms.drawHUD(this.ctx, this.canvas.width, this.canvas.height);
      if (typeof PowerModes !== 'undefined' && PowerModes.isActive && PowerModes.isActive()) PowerModes.drawHUD(this.ctx, this.canvas.width, this.canvas.height);
    }
    // #16 FPS/frame-time grafiği — tüm modların üstünde (F ile aç/kapa)
    if (typeof FpsMeter !== 'undefined' && FpsMeter.enabled) FpsMeter.drawOverlay(this.ctx, this.canvas.width, this.canvas.height);
  },

  /* ── In-game permanent buttons ─────────────────────────────── */
  _drawGameButtons(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width;

    // ── Menü butonu (sol üst) ──────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(8, 8, 80, 38, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⬅ MENÜ', 48, 27);
    ctx.restore();
    this._menuBtn = { x: 8, y: 8, w: 80, h: 38 };

    // ── Yükseltme butonu (sol üst, menünün sağı) ──────────────
    ctx.save();
    ctx.fillStyle = 'rgba(180,100,0,0.75)';
    ctx.beginPath(); ctx.roundRect(96, 8, 82, 38, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ YÜKSELT', 137, 27);
    ctx.restore();
    this._upgradeBtn = { x: 96, y: 8, w: 82, h: 38 };

    // ── Duraklat (sağ üst) ────────────────────────────────────
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(W - 50, 8, 42, 38, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Game.state === 'paused' ? '▶' : '⏸', W - 29, 27);
    ctx.restore();
    this._pauseBtn = { x: W - 50, y: 8, w: 42, h: 38 };
  },

  /* ── İlk-oyun rehberi (tutorial) ────────────────────────────── */
  _drawTutorial() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const t = Game._tutorialT || 0;
    const steps = [
      { a: 0.0,  b: 4.0,  txt: '➡  Sağ ok / D  veya ekranın SAĞINA dokun  =  GAZ' },
      { a: 4.0,  b: 7.5,  txt: '⬅  Sol ok / A  veya ekranın SOLUNA dokun  =  FREN' },
      { a: 7.5,  b: 10.5, txt: '🚀  Space / Shift  veya ekranın ORTASINA dokun  =  NİTRO' },
      { a: 10.5, b: 14.0, txt: '🔄  Havada GAZ/FREN ile TAKLA at → bonus altın!' }
    ];
    const s = steps.find(x => t >= x.a && t < x.b);
    if (!s) return;
    const local = t - s.a, dur = s.b - s.a;
    const fade = Math.min(1, local * 2) * Math.min(1, (dur - local) * 2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    const bw = Math.min(W - 40, 460), bh = 46, bx = W / 2 - bw / 2, by = H - 150;
    ctx.fillStyle = 'rgba(10,14,28,0.9)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill();
    ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.txt, W / 2, by + bh / 2);
    // adım noktaları
    for (let i = 0; i < steps.length; i++) {
      ctx.fillStyle = (steps[i] === s) ? '#ffb020' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(W / 2 - 18 + i * 12, by - 10, 3, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  },

  /* ── Başlangıç geri sayımı (3-2-1-GO) ───────────────────────── */
  _drawCountdown() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    const cd = Game._countdown || 0;
    let txt, scale, col, alpha = 1;
    if (cd > 0.15) {
      txt = String(Math.max(1, Math.ceil(cd - 0.2)));
      col = '#ffffff';
      const frac = cd - Math.floor(cd);
      scale = 1.5 - frac * 0.5;                 // her sayıda büyüyüp küçülür
    } else {
      txt = 'GO!'; col = '#2ecc71';
      const gf = Game._goFlash || 0;
      scale = 1.2 + (0.7 - gf) * 0.8;
      alpha = Math.min(1, gf / 0.2);
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(W / 2, H * 0.4);
    ctx.scale(scale, scale);
    ctx.font = '900 92px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
    ctx.restore();
  },

  /* ── Death overlays ─────────────────────────────────────────── */
  _updateDeathOverlay(dt) {
    const v = Game.vehicle;
    if (!v) return;

    // Trigger overlay when vehicle dies
    if (v.dead && !this._gameOverlay && Game.state === 'dead') {
      const reason = v.deathReason || Game.deathReason || 'crashed';
      this._gameOverlay  = reason;
      this._overlayTimer = 0;
      this._overlayAlpha = 0;
    }

    if (!this._gameOverlay) return;

    this._overlayTimer += dt;
    // Fade in
    this._overlayAlpha = Math.min(1, this._overlayTimer * 2.5);

    this._drawDeathOverlay(this._gameOverlay, this._overlayAlpha, this._overlayTimer);
    // Otomatik menüye ATMA — oyuncu TEKRAR OYNA / ANA MENÜ butonundan seçer.
  },

  _drawDeathOverlay(reason, alpha, t) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    // Dim background
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.72})`;
    ctx.fillRect(0, 0, W, H);

    if (alpha < 0.1) return;

    const cardW = Math.min(320, W - 40);
    const cardH = 292;
    const cx = W / 2, cy = H / 2;
    const scale = 0.7 + 0.3 * Math.min(1, t * 4);

    const _themes = {
      fuel_empty: { bg:'#1a1000', bd:'#FF8C00', ic:'⛽', title:'BENZİN BİTTİ!', tc:'#FF8C00', sub:'Yakıt tükendi' },
      crashed:    { bg:'#1a0000', bd:'#e74c3c', ic:'💥', title:'ARAÇ DEVRİLDİ!', tc:'#e74c3c', sub:'Kafa zemine çarptı' }
    };
    const _th = _themes[reason] || { bg:'#080820', bd:'#3498db', ic:'🏁', title:'OYUN BİTTİ', tc:'#3498db', sub:'Araç düştü' };

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    ctx.fillStyle = _th.bg; ctx.beginPath(); ctx.roundRect(-cardW/2, -cardH/2, cardW, cardH, 16); ctx.fill();
    ctx.strokeStyle = _th.bd; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = '44px Arial'; ctx.fillText(_th.ic, 0, -cardH/2 + 42);
    ctx.fillStyle = _th.tc; ctx.font = 'bold 23px Arial'; ctx.fillText(_th.title, 0, -cardH/2 + 84);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '12px Arial'; ctx.fillText(_th.sub, 0, -cardH/2 + 106);

    // Ödül özeti
    const _s = window._lastRunStats || {};
    const _distTxt = (typeof Economy !== 'undefined' && Economy.formatDistance) ? Economy.formatDistance(_s.distance || 0) : ((_s.distance || 0) + 'm');
    ctx.fillStyle = 'rgba(230,235,255,0.92)'; ctx.font = 'bold 13px Arial';
    ctx.fillText('🏁 ' + _distTxt + '     🔄 ' + (_s.flips || 0), 0, -cardH/2 + 136);
    ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 17px Arial';
    ctx.fillText('+' + (_s.gold || 0) + ' ⧆', 0, -cardH/2 + 160);
    if (_s.isNew) { ctx.fillStyle = '#FFD700'; ctx.font = 'bold 12px Arial'; ctx.fillText('★ YENİ REKOR!', 0, -cardH/2 + 182); }

    // Butonlar: TEKRAR OYNA + ANA MENÜ
    const _bw = cardW - 48, _bx = -_bw / 2;
    let _by = cardH / 2 - 100;
    ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.roundRect(_bx, _by, _bw, 44, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.fillText('↻  TEKRAR OYNA', 0, _by + 23);
    const _retryB = { bx: _bx, by: _by, bw: _bw, bh: 44 }; _by += 52;
    ctx.fillStyle = _th.bd; ctx.beginPath(); ctx.roundRect(_bx, _by, _bw, 40, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.fillText('✖  ANA MENÜ', 0, _by + 21);
    const _menuB = { bx: _bx, by: _by, bw: _bw, bh: 40 };

    ctx.restore();
    this._overlayBtns = { cx, cy, scale, retry: _retryB, menu: _menuB };
  },

  /* ── Pause overlay ─────────────────────────────────────────── */
  _drawPauseOverlay() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    // Accessibility guard: reducedMotion → no entrance animation. Default-safe
    // (undefined setting / missing Settings / throw all resolve to false).
    let _reduced = false;
    try {
      _reduced = (typeof Settings !== 'undefined' && typeof Settings.get === 'function' &&
                  Settings.get('reducedMotion') === true);
    } catch (e) { _reduced = false; }

    // Entrance timing — fully self-contained. The loop only calls this while
    // paused, so a gap >250ms between draws means the pause was just (re)opened:
    // restart the ~220ms intro. easeOutCubic → scale 0.94→1 + fade 0→1.
    const _now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!this._pauseLastDraw || (_now - this._pauseLastDraw) > 250) this._pauseAnimStart = _now;
    this._pauseLastDraw = _now;
    const _t = _reduced ? 1 : Math.min(1, (_now - this._pauseAnimStart) / 220);
    const _ease = 1 - Math.pow(1 - _t, 3);
    const _appear = _reduced ? 1 : _ease;               // opacity 0→1
    const _pop = _reduced ? 1 : (0.94 + 0.06 * _ease);  // scale 0.94→1

    // ── Dimmed atmospheric backdrop: darken + vignette (focus toward center) ──
    ctx.save();
    ctx.globalAlpha = 0.72 * _appear;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const _vg = ctx.createRadialGradient(W/2, H/2, Math.min(W, H) * 0.2, W/2, H/2, Math.max(W, H) * 0.72);
    _vg.addColorStop(0, 'rgba(0,0,0,0)');
    _vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.globalAlpha = _appear;
    ctx.fillStyle = _vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const cardW = Math.min(300, W - 40), cardH = 312;
    const cx = W / 2, cy = H / 2;
    const top = cy - cardH / 2;

    // Entrance transform is VISUAL ONLY (scale about card center + fade). The
    // button geometry below is the resting layout, and the exact same x/y/w/h
    // variables feed both roundRect() and _pauseBtns — so the drawn rects stay
    // pixel-identical to the click hitboxes once settled (and always when
    // reducedMotion, where _pop === 1).
    ctx.save();
    ctx.globalAlpha = _appear;
    ctx.translate(cx, cy);
    ctx.scale(_pop, _pop);
    ctx.translate(-cx, -cy);

    // ── Card: dark navy gradient, hairline border + inner top highlight ──
    const _cg = ctx.createLinearGradient(0, top, 0, top + cardH);
    _cg.addColorStop(0, '#181832');
    _cg.addColorStop(1, '#0b0b18');
    ctx.fillStyle = _cg;
    ctx.beginPath(); ctx.roundRect(cx - cardW/2, top, cardW, cardH, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx - cardW/2 + 1.5, top + 1.5, cardW - 3, cardH - 3, 16); ctx.stroke();

    // ── Title ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 21px Arial';
    ctx.fillText('⏸  DURAKLATILDI', cx, top + 38);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - cardW/2 + 20, top + 62); ctx.lineTo(cx + cardW/2 - 20, top + 62); ctx.stroke();

    // ── Buttons: primary CTA dominant, rest subordinate. Every button ≥44px.
    // 18px side padding, 10px vertical rhythm. Same rects drawn + stored. ──
    const bw = cardW - 36, bx = cx - bw / 2;
    let by = top + 78;
    const _btns = [];
    const _pbtn = (id, c1, c2, tCol, txt, fs, h) => {
      const r = { id: id, x: bx, y: by, w: bw, h: h };
      const g = ctx.createLinearGradient(0, by, 0, by + h);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, h, 11); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';           // top sheen (depth)
      ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, bw - 4, h * 0.42, 9); ctx.fill();
      ctx.fillStyle = tCol; ctx.font = 'bold ' + fs + 'px Arial';
      ctx.fillText(txt, cx, by + h / 2 + 1);
      _btns.push(r);
      by += h + 10;
      return r;
    };

    _pbtn('resume',  '#2ee66e', '#1f9d4d', '#ffffff', '▶  DEVAM ET',      17, 52); // primary
    _pbtn('restart', '#3a97d4', '#2472a4', '#ffffff', '↻  YENİDEN BAŞLA', 15, 46);
    _pbtn('upgrade', 'rgba(196,120,10,0.96)', 'rgba(150,86,0,0.96)', '#FFE28A', '⚡ ARAÇ YÜKSELT', 15, 46);
    _pbtn('menu',    '#d0473a', '#a12f24', '#ffffff', '✖  ANA MENÜ',      15, 46);

    ctx.restore();

    this._pauseBtns = _btns;
  },

  /* ── Aynı yarışı yeniden başlat ─────────────────────────────── */
  _retryRun() {
    this._gameOverlay = null; this._overlayAlpha = 0; this._overlayTimer = 0;
    const vid = Game.vehicleId || SaveData.get('selectedVehicle') || 'jeep';
    const mid = Game.mapId || 'countryside';
    this.setMode('game');
    Game.startRun(vid, mid, Game.botRaceMode);
  },

  /* ── Click / Touch handlers ────────────────────────────────── */
  _hitTest(bx, by, bw, bh, x, y) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  },

  // True while showing the settings screen with the MAP AYARLARI tab active.
  // Gate for wheel / keyboard / scrollbar-drag handlers so they never touch
  // any other screen or the −/＋/toggle click dispatch.
  _onMapsScreen() {
    if (this.mode !== 'ui' || typeof UI === 'undefined' || UI.currentScreen !== 'settings') return false;
    // Active on the maps tab, OR whenever the environment config page is open.
    return UI._setTab === 'maps' || UI._mapCfgOpen === 'environment';
  },

  // ⚡ PERF(31 Tmz): tıklama/dokunma ölçeği de UI._cvRect() önbelleğinden.
  _olcek() {
    if (typeof UI !== 'undefined' && UI._cvRect) return UI._cvRect();
    const b = this.canvas.getBoundingClientRect();
    return { left: b.left, top: b.top,
             sx: (b.width  > 0) ? this.canvas.width  / b.width  : 1,
             sy: (b.height > 0) ? this.canvas.height / b.height : 1 };
  },

  _handleUIClick(e) {
    const rect = this._olcek();
    const x = (e.clientX - rect.left) * rect.sx, y = (e.clientY - rect.top) * rect.sy;
    this._handleGameClick(x, y);
    if (this.mode === 'ui') {
      const action = UI.handleClick(x, y);
      if (action) { Audio.resume(); if (Audio.playMenuClick) Audio.playMenuClick(); this._dispatchUIAction(action); }
    }
  },

  _handleTouch(e) {
    e.preventDefault();
    const rect = this._olcek();
    const t = e.changedTouches[0];
    const x = (t.clientX - rect.left) * rect.sx, y = (t.clientY - rect.top) * rect.sy;
    this._handleGameClick(x, y);
    if (this.mode === 'ui') {
      const action = UI.handleClick(x, y);
      if (action) { Audio.resume(); if (Audio.playMenuClick) Audio.playMenuClick(); this._dispatchUIAction(action); }
    }
  },

  _handleGameClick(x, y) {
    if (this.mode !== 'game') return;

    // Ölüm ekranı butonları (TEKRAR OYNA / ANA MENÜ)
    if (this._gameOverlay && this._overlayBtns) {
      const o = this._overlayBtns;
      const lx = (x - o.cx) / o.scale, ly = (y - o.cy) / o.scale;
      const hit = (b) => b && lx >= b.bx && lx <= b.bx + b.bw && ly >= b.by && ly <= b.by + b.bh;
      if (hit(o.retry)) { this._gameOverlay = null; this._overlayAlpha = 0; this._retryRun(); return; }
      if (hit(o.menu))  { this._gameOverlay = null; this._overlayAlpha = 0; this._goMenu(); return; }
      return; // ölüm ekranındayken başka tıklama yok
    }

    // Pause ekranı butonları
    if (Game.state === 'paused' && this._pauseBtns) {
      for (const btn of this._pauseBtns) {
        if (this._hitTest(btn.x, btn.y, btn.w, btn.h, x, y)) {
          if (btn.id === 'resume')  { Game.resume(); return; }
          if (btn.id === 'restart') { this._retryRun(); return; }
          if (btn.id === 'upgrade') {
            const vid = Game.vehicleId || SaveData.get('selectedVehicle') || 'jeep';
            if (typeof UpgradeUI !== 'undefined') UpgradeUI.open(vid);
            return;
          }
          if (btn.id === 'menu')    { this._goMenu(); return; }
        }
      }
      return; // Pause ekranındayken başka tıklama engelle
    }

    if (Game.state !== 'playing') return;

    // ── Menü butonu ───────────────────────────────────────────
    if (this._menuBtn && this._hitTest(
      this._menuBtn.x, this._menuBtn.y, this._menuBtn.w, this._menuBtn.h, x, y)) {
      this._goMenu();
      return;
    }

    // ── Yükseltme butonu ──────────────────────────────────────
    if (this._upgradeBtn && this._hitTest(
      this._upgradeBtn.x, this._upgradeBtn.y, this._upgradeBtn.w, this._upgradeBtn.h, x, y)) {
      const vid = Game.vehicleId || SaveData.get('selectedVehicle') || 'jeep';
      if (typeof UpgradeUI !== 'undefined') {
        Game.pause();
        UpgradeUI.open(vid);
      }
      return;
    }

    // ── Duraklat butonu ───────────────────────────────────────
    if (this._pauseBtn && this._hitTest(
      this._pauseBtn.x, this._pauseBtn.y, this._pauseBtn.w, this._pauseBtn.h, x, y)) {
      Game.pause();
      return;
    }
  },

  _resize() {
    // GÖRÜNÜR alanı ölç: mobilde 100vh ≠ innerHeight (adres çubuğu). visualViewport
    // en doğru görünür boyutu verir. Kanvasın HEM gösterim (CSS) HEM tampon boyutunu
    // bu değere eşitliyoruz → hiçbir şey ekran dışına taşmaz, dokunma birebir eşleşir.
    const vv = window.visualViewport;
    // En güvenli GÖRÜNÜR ölçü: visualViewport ile innerHeight'ın KÜÇÜĞÜ → kanvas asla
    // görünür alandan taşmaz, böylece alta-sabit tuşlar (HARİTAYA GİT vb.) hep görünür.
    const w = Math.max(1, Math.round(vv ? Math.min(vv.width,  window.innerWidth)  : window.innerWidth));
    const h = Math.max(1, Math.round(vv ? Math.min(vv.height, window.innerHeight) : window.innerHeight));

    // ═════════════════════════════════════════════════════════════════════════
    // ⚡ PERF(31 Tmz) — DEĞİŞMEDİYSE HİÇBİR ŞEY YAPMA (mobilde ÖNEMLİ)
    // ═════════════════════════════════════════════════════════════════════════
    // `canvas.width = x` ATAMASI, DEĞER AYNI OLSA BİLE tuval arka tamponunu
    // YENİDEN AYIRIR, TEMİZLER ve 2D bağlam durumunu (transform/clip/font/
    // fillStyle) SIFIRLAR. Yani ucuz bir atama değil, tam bir tuval yeniden kurma.
    // 🔴 Bu fonksiyon `visualViewport.scroll` + `visualViewport.resize` +
    //   `window.resize`'a bağlı. Telefonda adres çubuğu her kıpırdadığında bu
    //   olaylar SÜRÜ HÂLİNDE gelir (tek bir kaydırmada onlarca kez) → oyun
    //   ortasında art arda tuval yeniden kurma = görünür donma.
    // ▶ Ölçüm: ölçü değişmediyse çıkış. Boyut GERÇEKTEN değiştiğinde davranış aynı.
    if (this._sonW === w && this._sonH === h) return;
    this._sonW = w; this._sonH = h;

    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width  = w;
    this.canvas.height = h;
    // Dokunma koordinat ölçeği önbelleğini düşür (UI._cvRect) — yoksa döndürme
    // sonrası tıklamalar eski ölçekte kalır.
    try { if (typeof UI !== 'undefined' && UI._rectBoz) UI._rectBoz(); } catch (e) {}
    if (typeof Responsive !== 'undefined') Responsive.update(w, h);
  },

  setMode(m) {
    const prev = this.mode;
    this.mode = m;
    // #5 EventBus: mod geçişini yayınla (gevşek bağlı modüller dinleyebilir)
    if (typeof EventBus !== 'undefined' && prev !== m) EventBus.emit('mode:change', { from: prev, to: m });
    // #1 Oyuna girerken sabit-adım birikimini sıfırla (temiz başlangıç)
    if (m === 'game' && typeof FixedStep !== 'undefined') FixedStep.reset();
  },

  _goMenu() {
    this._gameOverlay = null;
    this._overlayMenuBtn = null;
    Audio.stopEngine(); Audio.stopBGM(); Audio.playBGM('menu');

    // 🔴 BUGFIX(28 Tmz) — `Game.state` MENÜYE DÖNERKEN HİÇ SIFIRLANMIYORDU.
    //   Bir kez yarışa girip MENÜ'ye basınca state sonsuza kadar 'playing'
    //   kalıyordu. İki ayrı görünür arıza bundan çıkıyordu:
    //     1. Dokunmatik pedallar (#mc_root) ana menüde/garajda/ayarlarda
    //        görünmeye devam ediyordu — mobile.js `_watch()` yalnız
    //        `Game.state === 'playing'` bakıyor.
    //     2. game.js:958 oyun-içi dokunma bölgeleri (sol %35 fren, orta nitro,
    //        sağ %25 gaz) menüde de AKTİF kalıyordu → her menü dokunuşu ayrıca
    //        gaz/fren/nitro tetikliyor ve `Parts.activateNitro()` çağırıyordu.
    //        "Yanlış yerlere tıklanıyor" şikâyetinin ana kaynağı buydu.
    try {
      const G = (typeof Game !== 'undefined' && Game) ? Game : (window.Game || null);
      if (G) {
        G.state = 'idle';
        // Basılı kalmış kontrolleri de bırak (parmak kalkmadan menüye dönülürse)
        if (G.controlState) { G.controlState.throttle = 0; G.controlState.brake = 0; G.controlState.boost = 0; }
        if (G.touchIds) { G.touchIds.gas = null; G.touchIds.brake = null; G.touchIds.nitro = null; }
      }
    } catch (e) {}

    this.setMode('ui'); UI.goTo('menu');
  },

  _startGame(vehicleId, mapId, botMode) {
    this._gameOverlay = null;
    this._overlayTimer = 0;
    this._overlayAlpha = 0;
    Audio.stopBGM();
    this.setMode('game');
    // #2 Deterministik simülasyon: her koşuya sabit tohum ver (replay/hayalet birebir)
    let _seed = null;
    if (typeof Rng !== 'undefined') { _seed = Rng.newRunSeed(); this._lastRunSeed = _seed; }
    Game.startRun(vehicleId, mapId, !!botMode);
    // #5 EventBus: koşu başladı olayı (modüller dinleyebilir)
    if (typeof EventBus !== 'undefined') EventBus.emit('run:start', { vehicleId: vehicleId, mapId: mapId, botMode: !!botMode, seed: _seed });
    this._registerPlayer(vehicleId, mapId);
  },

  // Oyuncu kaydı — admin panelinde tüm oyuncular görünsün
  _registerPlayer(vehicleId, mapId) {
    try {
      const s = JSON.parse(localStorage.getItem('ahmet_save_v3') || '{}');
      const players = JSON.parse(localStorage.getItem('ahmet_players') || '[]');
      const pid = s.playerId || ('P' + Date.now().toString(36).toUpperCase());
      if (!s.playerId) {
        s.playerId = pid;
        localStorage.setItem('ahmet_save_v3', JSON.stringify(s));
      }
      const now = Date.now();
      const existing = players.findIndex(p => p.id === pid);
      const entry = {
        id: pid,
        gold: s.gold || 0,
        diamonds: s.diamonds || 0,
        xp: s.xp || 0,
        gamesPlayed: (s.gamesPlayed || 0) + 1,
        selectedVehicle: vehicleId,
        lastMap: mapId,
        lastSeen: now,
        firstSeen: existing >= 0 ? (players[existing].firstSeen || now) : now,
        ownedVehicles: (s.ownedVehicles || ['jeep']).length,
        banned: false
      };
      if (existing >= 0) players[existing] = entry;
      else players.push(entry);
      localStorage.setItem('ahmet_players', JSON.stringify(players));
    } catch(e) {}
  },

  /* ── Reklam yer-tutucu (placeholder) overlay ─────────────────
     5 sn'lik tam-ekran görsel "reklam". Gerçek reklam ağı YOK.
     Geri sayım 5→0 bittiğinde onComplete() çağrılır (ödül mantığı),
     ve en son ATLA/KAPAT butonu ile panel kapatılır. localStorage
     KULLANMAZ; tüm durum bellek içi. */
  _showAdOverlay(onComplete) {
    if (this._adOverlayEl) return;   // zaten açık — çift açmayı engelle
    const secs = 5;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;' +
      'background:rgba(4,6,14,0.96);display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;font-family:Arial,Helvetica,sans-serif;color:#fff;';
    const label = document.createElement('div');
    label.textContent = 'Reklam';
    label.style.cssText = 'font-size:14px;letter-spacing:4px;text-transform:uppercase;color:#8aa0c8;margin-bottom:16px;';
    const box = document.createElement('div');
    box.style.cssText = 'width:min(78vw,340px);height:min(38vh,210px);border-radius:16px;' +
      'background:linear-gradient(135deg,#1b2340,#0c1024);border:1px solid rgba(255,255,255,0.12);' +
      'display:flex;align-items:center;justify-content:center;font-size:46px;box-shadow:0 14px 44px rgba(0,0,0,0.55);';
    box.textContent = '📺';
    const count = document.createElement('div');
    count.style.cssText = 'font-size:42px;font-weight:900;margin-top:20px;';
    count.textContent = String(secs);
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:13px;color:#9fb0d0;margin-top:8px;';
    hint.textContent = 'Ödül için reklam oynatılıyor...';
    const btn = document.createElement('div');
    btn.style.cssText = 'margin-top:24px;padding:11px 30px;border-radius:10px;' +
      'background:rgba(255,255,255,0.10);color:#7f8db0;font-weight:bold;font-size:14px;' +
      'cursor:default;user-select:none;';
    btn.textContent = 'Atla (' + secs + ')';
    el.appendChild(label); el.appendChild(box); el.appendChild(count);
    el.appendChild(hint); el.appendChild(btn);
    document.body.appendChild(el);
    this._adOverlayEl = el;

    const closeOverlay = () => {
      if (this._adTimer) { clearInterval(this._adTimer); this._adTimer = null; }
      if (el && el.parentNode) el.parentNode.removeChild(el);
      this._adOverlayEl = null;
    };
    let rewardFired = false;
    const fireReward = () => {
      if (rewardFired) return; rewardFired = true;
      try { if (typeof onComplete === 'function') onComplete(); } catch (e) {}
    };

    let remain = secs;
    this._adTimer = setInterval(() => {
      remain -= 1;
      if (remain > 0) {
        count.textContent = String(remain);
        btn.textContent = 'Atla (' + remain + ')';
      } else {
        // 5 sn doldu → ödül mantığı çalışır, buton KAPAT'a döner.
        clearInterval(this._adTimer); this._adTimer = null;
        count.textContent = '0';
        hint.textContent = 'Ödül hazır!';
        btn.textContent = 'Kapat';
        btn.style.background = 'rgba(46,230,110,0.9)';
        btn.style.color = '#06210f';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', closeOverlay);
        fireReward();
      }
    }, 1000);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  KLAN SİSTEMİ BAĞLAMA (2 Ağu) — `js/klan*.js` × 6
  // ═══════════════════════════════════════════════════════════════════════════
  //  🔴 `Klan/KlanSim/KlanKutu/KlanEtkinlik/KlanSavas/KlanUI` BARE GLOBAL'dir
  //     (tuzak #10). `window.Klan` da atanıyor ama erişim `typeof` ile yapılır.
  _klanMod(ad) {
    try {
      switch (ad) {
        case 'Klan':         return (typeof Klan         !== 'undefined') ? Klan         : null;
        case 'KlanSim':      return (typeof KlanSim      !== 'undefined') ? KlanSim      : null;
        case 'KlanKutu':     return (typeof KlanKutu     !== 'undefined') ? KlanKutu     : null;
        case 'KlanEtkinlik': return (typeof KlanEtkinlik !== 'undefined') ? KlanEtkinlik : null;
        case 'KlanSavas':    return (typeof KlanSavas    !== 'undefined') ? KlanSavas    : null;
        case 'KlanUI':       return (typeof KlanUI       !== 'undefined') ? KlanUI       : null;
      }
    } catch (e) {}
    return null;
  },

  // `{ok, hata, mesaj}` sonucunu toast'a çevirir (6 modülün hepsi bu şekli döner).
  _klanSonuc(r, basariMetni) {
    if (!r) { UI.showToast('İşlem yapılamadı.'); return false; }
    if (r.ok === false) { UI.showToast(r.mesaj || ('Hata: ' + (r.hata || '?'))); return false; }
    if (basariMetni) UI.showToast(basariMetni);
    return true;
  },

  _klanAc() {
    const K = this._klanMod('Klan');
    if (!K) { UI.showToast('Klan modülü yüklenemedi.'); return; }
    try { K.hazir(); } catch (e) {}
    UI.goTo('klan');
  },

  // 🔴 TAM EŞLEŞME ZORUNLU. `klan_savas_odul` `klan_savas` önekiyle başlıyor;
  //    `startsWith`/`indexOf` ile dallanırsan 31 Tmz'deki `ulke_XX` bugunu
  //    birebir geri getirirsin (kart tıklaması yutuluyordu).
  _klanEylem(action) {
    const v  = (UI._klanVeri && typeof UI._klanVeri === 'object') ? UI._klanVeri : {};
    const K  = this._klanMod('Klan');
    const S  = this._klanMod('KlanSim');
    const KU = this._klanMod('KlanKutu');
    const E  = this._klanMod('KlanEtkinlik');
    const SV = this._klanMod('KlanSavas');
    const G  = this._klanMod('KlanUI');
    const yok = function () { UI.showToast('Bu bölüm için gerekli modül yüklü değil.'); };

    switch (action) {
      // ── GEZİNME ──
      case 'klan_geri': {
        const e = v.ekran || UI.currentScreen;
        if (e === 'klan') UI.goTo('menu'); else UI.goTo('klan');
        return;
      }
      case 'klan_git': {
        if (v.acik === false) { UI.showToast('Bu özellik daha yüksek klan seviyesinde açılır.'); return; }
        if (v.ekran) UI.goTo(v.ekran);
        return;
      }

      // ── KURMA / ARAMA / AYRILMA ──
      case 'klan_kur': {
        if (!K) return yok();
        const ad = window.prompt('Klan adı (3-20 karakter):', '');
        if (!ad || !ad.trim()) return;
        const varsayilanEtiket = String(ad).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        const et = window.prompt('Klan etiketi (3-4 BÜYÜK harf):', varsayilanEtiket);
        if (!et || !et.trim()) return;
        const r = K.kur(ad.trim(), et.trim(), 0, 'acik');
        this._klanSonuc(r, 'Klan kuruldu: ' + ad.trim());
        return;
      }
      case 'klan_ara': {
        if (!K) return yok();
        if (!S) { UI.showToast('Klan listesi modülü (KlanSim) yüklü değil.'); return; }
        let liste = [];
        try {
          const hepsi = S.botKlanlar(S.haftaId()) || [];
          for (let i = 0; i < hepsi.length && liste.length < 200; i++) {
            if (hepsi[i] && hepsi[i].gizlilik === 'acik') liste.push(hepsi[i]);
          }
          liste.sort(function (a, b) { return (b.ligPuan || 0) - (a.ligPuan || 0); });
          liste = liste.slice(0, 8);
        } catch (e) { liste = []; }
        if (!liste.length) { UI.showToast('Katılabileceğin açık klan bulunamadı.'); return; }
        let metin = 'Katılmak istediğin klanın numarasını yaz:\n';
        for (let i = 0; i < liste.length; i++) {
          metin += (i + 1) + ') [' + (liste[i].etiket || '???') + '] ' + (liste[i].ad || '') +
                   '  ·  Sv ' + (liste[i].seviye || 1) + '  ·  ' + (liste[i].ligPuan || 0) + ' puan\n';
        }
        const sec = window.prompt(metin, '1');
        const idx = parseInt(sec, 10);
        if (!(idx >= 1 && idx <= liste.length)) return;
        this._klanSonuc(K.katil(liste[idx - 1].id), 'Klana katıldın: ' + liste[idx - 1].ad);
        return;
      }
      case 'klan_ayril': {
        if (!K) return yok();
        if (!window.confirm('Klandan ayrılmak istediğine emin misin? 24 saat yeni klan kuramazsın.')) return;
        if (this._klanSonuc(K.ayril(), 'Klandan ayrıldın.')) UI.goTo('klan');
        return;
      }

      // ── ETKİNLİK ──
      // "KATIL" = etkinliğin haftalık haritasında koşuya başla. Puan `KlanEtkinlik`
      // tarafından koşu sonunda hesaplanır; burada yalnız doğru pist açılır.
      case 'klan_etkinlik_katil': {
        if (!E) return yok();
        let h = null;
        try { h = E.hafta(); } catch (e) { h = null; }
        if (!h) { UI.showToast('Etkinlik bilgisi okunamadı.'); return; }
        if (h.acik === false) { UI.showToast('Etkinlik şu an kapalı.'); return; }
        UI.showToast('Etkinlik: ' + (h.turAd || '') + ' — ' + (h.harita || ''));
        this._startGame(SaveData.get('selectedVehicle') || 'jeep', h.harita, false);
        return;
      }

      // ── SAVAŞ ──
      case 'klan_savas_detay':  UI.goTo('klanSavas'); return;
      case 'klan_savas_baslat': {
        if (!SV) return yok();
        this._klanSonuc(SV.savasBaslat(v.tur || 'normal'), 'Savaş başladı!');
        return;
      }
      case 'klan_savas_odul': {
        if (!SV) return yok();
        const r = SV.oduluAl();
        if (this._klanSonuc(r, '+' + ((r && r.kp) || 0) + ' KP ödül alındı!') && G && G.konfetiBaslat) {
          try { G.konfetiBaslat('savas-odul', 40); } catch (e) {}
        }
        return;
      }
      case 'klan_savas_kesif': {
        if (!SV) return yok();
        let rid = null;
        try { const d = SV.durum(); rid = (d && d.aktif && d.aktif.rakip) ? d.aktif.rakip.id : null; } catch (e) {}
        const r = SV.kesifGorevi(rid);
        this._klanSonuc(r, 'Keşif raporu hazır: ' + ((r && r.rapor && r.rapor.ad) || ''));
        return;
      }
      case 'klan_savas_izle': {
        if (!SV) return yok();
        const r = SV.savasIzle();
        if (r && r.ok) UI.showToast('Biz ' + Math.round(r.bizPuan) + ' — Rakip ' + Math.round(r.rakipPuan) + ' · ' + r.kalan);
        else this._klanSonuc(r);
        return;
      }
      case 'klan_savas_iptal': {
        if (!SV) return yok();
        if (!window.confirm('Aktif savaşı iptal etmek istediğine emin misin?')) return;
        this._klanSonuc(SV.iptalEt('oyuncu'), 'Savaş iptal edildi.');
        return;
      }

      // ── MAĞAZA ──
      case 'klan_magaza_al': {
        if (!KU) return yok();
        if (v.alinabilir === false) { UI.showToast('Bu ürünü şu an alamazsın.'); return; }
        this._klanSonuc(KU.satinAl(v.urun), 'Satın alındı (' + (v.fiyat || 0) + ' KP).');
        return;
      }

      // ── ÜYELER / ROL ──
      case 'klan_uye_sec': {
        if (!G) return yok();
        G.rolPaneliAc(v.uyeId, v.ad, v.rol);
        return;
      }
      case 'klan_rol_ata': {
        if (!K) return yok();
        const r = K.rolDegistir(v.uyeId, v.rol);
        if (G && G.rolPaneliKapat) G.rolPaneliKapat();
        this._klanSonuc(r, 'Rol güncellendi: ' + (K.ROL_AD ? (K.ROL_AD[v.rol] || v.rol) : v.rol));
        return;
      }
      case 'klan_rol_kapat': {
        if (G && G.rolPaneliKapat) G.rolPaneliKapat();
        return;
      }

      // ── AYARLAR ──
      case 'klan_amblem': {
        if (!K) return yok();
        // ⚠ `Klan`'da `amblemAyarla` YOK; yetkiyi burada kontrol edip
        //   `kaydet()` ile yazıyoruz (klan*.js dosyaları DEĞİŞTİRİLMEDİ).
        if (v.yetki === false || !(K.benimYetkim && K.benimYetkim('ayarDegistir'))) {
          UI.showToast('Bu işlem için yetkin yok.'); return;
        }
        const k = K.al();
        if (!k) { UI.showToast('Bir klana üye değilsin.'); return; }
        k.amblem = Math.max(0, Math.floor(Number(v.amblem) || 0));
        K.kaydet();
        UI.showToast('Amblem güncellendi.');
        return;
      }
      case 'klan_renk1':
      case 'klan_renk2': {
        if (!K) return yok();
        // 🔴 Renk `veri.renk` içinde HEX olarak gelir — eylem adına '#' KOYULMAZ
        //    (`_drawCard` accent + '33' diye alfa ekliyor, HEX zorunlu).
        const k = K.al();
        if (!k) { UI.showToast('Bir klana üye değilsin.'); return; }
        const c = String(v.renk || '');
        const r = (action === 'klan_renk1') ? K.renkAyarla(c, null) : K.renkAyarla(k.renk1, c);
        this._klanSonuc(r, 'Renk güncellendi.');
        return;
      }
      case 'klan_gizlilik': {
        if (!K) return yok();
        this._klanSonuc(K.gizlilikAyarla(v.gizlilik), 'Gizlilik: ' + v.gizlilik);
        return;
      }
      case 'klan_lore_duzenle': {
        if (!K) return yok();
        const mevcut = (K.lore && K.lore()) || '';
        const t = window.prompt('Klan tanıtım yazısı:', mevcut);
        if (t == null) return;
        this._klanSonuc(K.lorAyarla(t), 'Tanıtım yazısı kaydedildi.');
        return;
      }
      case 'klan_sinif': {
        if (!K) return yok();
        if (v.yetki === false) { UI.showToast('Bu işlem için yetkin yok.'); return; }
        this._klanSonuc(K.sinifSec(v.sinif), 'Klan sınıfı seçildi.');
        return;
      }

      // ── KUTULAR ──
      case 'klan_kutu_gunluk': {
        if (!KU) return yok();
        if (v.hazir === false) { UI.showToast('Günlük kutu henüz hazır değil.'); return; }
        this._klanSonuc(KU.gunlukKutu(), 'Günlük kutu envanterine eklendi!');
        return;
      }
      case 'klan_kutu_ac':
      case 'klan_kutu_hemen': {
        if (!KU) return yok();
        if (action === 'klan_kutu_hemen' && v.yeter === false) { UI.showToast('Yeterli Klan Paran yok.'); return; }
        const r = (action === 'klan_kutu_ac') ? KU.ac(v.kutuId) : KU.hemenAc(v.kutuId);
        if (!r || r.ok === false) { this._klanSonuc(r); return; }
        if (G && G.kutuAcmaBaslat) {
          try { G.kutuAcmaBaslat(v.kutuId, v.tur, r.odul, v.renk || '#e8d23a'); } catch (e) {}
        }
        UI.showToast('+' + ((r.odul && r.odul.kp) || 0) + ' KP · ' + ((r.odul && r.odul.nadirlikAd) || ''));
        return;
      }
      case 'klan_anim_kapat': {
        if (G) { G._kutuAnim = null; G._seviyeAnim = null; }
        return;
      }

      // ── DUYURU PANOSU (sohbet YOK — yalnız sistem mesajları) ──
      case 'klan_pano_temizle': {
        if (!K) return yok();
        K.duyuruTemizle();
        UI.showToast('Duyuru panosu temizlendi.');
        return;
      }
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  YENİ HCR2 EKRANLARI (3 Ağu) — `js/ekran-*.js` eylem dağıtımı
  // ══════════════════════════════════════════════════════════════════════════
  //   37 eylem: ana_* (15) · garaj_*/parca_* (13) · cups_* (6) · sandik_* (3)
  //   + çerçeve `ekr_geri`.
  //   🔴 TAM EŞLEŞME (`case`/`===`). `startsWith` KULLANMA — `ulke_XX` ve
  //     `klan_savas_odul` yutulmaları tam bu yüzden oldu.
  //   ⚠ İki DİNAMİK önek var ve ikisi de SABİTTİR:
  //       `ana_sandik_<tip>`  (daily|bronze|silver — Economy.CHESTS anahtarı)
  //       `ana_zaman_<sayac>` (haftalik|gunluk|gorev)
  //     Başka hiçbir eylem bu önekle başlamıyor (ölçüldü).
  _ekranMod(ad) {
    try {
      switch (ad) {
        case 'EkranAna':    return (typeof EkranAna    !== 'undefined') ? EkranAna    : null;
        case 'EkranGaraj':  return (typeof EkranGaraj  !== 'undefined') ? EkranGaraj  : null;
        case 'EkranCups':   return (typeof EkranCups   !== 'undefined') ? EkranCups   : null;
        case 'EkranSandik': return (typeof EkranSandik !== 'undefined') ? EkranSandik : null;
      }
    } catch (e) {}
    return null;
  },

  // `Economy.openChest()` sonucunu sandık animasyonuna çevirir.
  // 🔴 Boş dizi dönerse animasyon AÇILMAZ (sözleşme: `donustur` hata/`null`
  //   girdide boş dizi döner). Modül yoksa `false` döner → çağıran eski
  //   `UI._chestReveal` kartına düşer.
  _sandikGoster(sonuc, tur, ek) {
    const S = this._ekranMod('EkranSandik');
    if (!S) return false;
    let liste = null;
    try { liste = S.donustur(sonuc, tur, ek || null); } catch (e) { liste = null; }
    if (!liste || !liste.length) return false;
    try { S.baslat(liste, tur); } catch (e) { return false; }
    let a = false;
    try { a = S.aktif() === true; } catch (e) { a = false; }
    return a;
  },

  // Sandık satın al + animasyonu göster (ana ekranın sandık slotları ve
  // `chests` ekranı AYNI yolu kullanır — kopyala-yapıştır yok).
  _sandikAc(tur) {
    if (typeof Economy === 'undefined' || typeof Economy.openChest !== 'function') return;
    if (tur === 'daily') {
      const bugun = new Date().toDateString();
      if (SaveData.get('lastDailyChest') === bugun) { UI.showToast('Günlük sandık zaten alındı!'); return; }
      SaveData.set('lastDailyChest', bugun);
    }
    const r = Economy.openChest(tur);
    if (!r) return;
    if (r.error) { UI.showToast(r.error === 'diamond' ? 'Yeterli elmas yok!' : 'Yeterli altın yok!'); return; }
    if (typeof Audio !== 'undefined') {
      if (Audio.playChestOpen) Audio.playChestOpen();
      else if (r.diamonds && Audio.playDiamondPickup) Audio.playDiamondPickup();
      else if (Audio.playPickup) Audio.playPickup();
    }
    if (typeof SaveData !== 'undefined' && SaveData.bumpStat) SaveData.bumpStat('chestsOpened', 1);
    // Animasyon açılmazsa (modül yok / boş ödül) ESKİ kart gösterimi devreye girer.
    if (!this._sandikGoster(r, tur)) UI._chestReveal = r;
  },

  _ekranEylem(action) {
    const v  = (UI._ekrVeri && typeof UI._ekrVeri === 'object') ? UI._ekrVeri : {};
    const sv = (UI._sandikVeri && typeof UI._sandikVeri === 'object') ? UI._sandikVeri : {};
    const EA = this._ekranMod('EkranAna');
    const EG = this._ekranMod('EkranGaraj');
    const EC = this._ekranMod('EkranCups');
    const ekran = UI.currentScreen;

    // ── ÇERÇEVE GERİ (üst şerit) ────────────────────────────────────────────
    if (action === 'ekr_geri') {
      if (ekran === 'yarisLobi') UI.goTo('cups');
      else UI.goTo('menu');
      return;
    }

    // ── SANDIK KAPLAMASI (3 eylem) ──────────────────────────────────────────
    switch (action) {
      case 'sandik_atla':  return;                       // modül kendisi atladı
      case 'sandik_kart':  return;                       // kart detayı — bilgi amaçlı
      case 'sandik_kapat': {
        // Ödül SaveData'ya `Economy.openChest` sırasında ZATEN yazıldı
        // (`EkranSandik` kayda HİÇ yazmaz — modül sözleşmesi).
        const alt = Math.floor(Number(sv.altin) || 0);
        if (alt > 0) UI.showToast('⧆ +' + alt.toLocaleString('tr-TR') + ' altın');
        UI._chestReveal = null;
        return;
      }
    }

    // ── ANA EKRAN (15) ──────────────────────────────────────────────────────
    switch (action) {
      case 'ana_ray_rutbe':
      case 'ana_rutbe':      UI.goTo('rankings'); return;
      case 'ana_ray_gorev':
      case 'ana_gorev':      UI.goTo('missions'); return;
      case 'ana_ray_garaj':  UI.goTo('garage');   return;   // -> `garaj` (yönlendirme)
      case 'ana_ray_harita':
      case 'ana_harita':     UI.goTo('mapselect'); return;
      case 'ana_arac':       UI.goTo('vehicles');  return;
      case 'ana_yaris': {
        const _arac = String(v.arac || (SaveData.get('selectedVehicle') || 'jeep'));
        const _harita = String(v.harita || 'countryside');
        // ⚠ `race` kipi YAPIŞKANDIR: `cups_yaris` bir kez kurunca sonraki
        //   koşular da yarış olurdu. Serbest koşu açıkça 'normal'a çeker.
        Game.gameMode = 'normal';
        UI._selectedMode = 'normal'; UI._botModeSelected = false;
        this._startGame(_arac, _harita, false);
        return;
      }
    }
    if (action.indexOf('ana_sandik_') === 0) {
      const tip = action.slice(11);
      if (v.kilit) { UI.showToast('Bu sandık henüz hazır değil.'); return; }
      this._sandikAc(tip);
      return;
    }
    if (action.indexOf('ana_zaman_') === 0) {
      const kalan = Math.max(0, Math.floor(Number(v.kalan) || 0));
      const sa = Math.floor(kalan / 3600000), dk = Math.floor((kalan % 3600000) / 60000);
      const ad = { haftalik: 'Haftalık ödül', gunluk: 'Günlük sandık', gorev: 'Görev yenilenmesi' };
      UI.showToast((ad[String(v.sayac || '')] || 'Sayaç') + ': ' + sa + ' sa ' + dk + ' dk');
      return;
    }

    // ── GARAJ (6) ───────────────────────────────────────────────────────────
    switch (action) {
      case 'garaj_geri':  UI.goTo('menu'); return;
      case 'garaj_parca': UI.goTo('parcaGaraj'); return;
      case 'garaj_boya':  UI.goTo('paintshop'); return;
      case 'garaj_arac':  UI.goTo('vehicles');  return;
      case 'garaj_basla': {
        const _vid = SaveData.get('selectedVehicle') || 'jeep';
        const _mid = (SaveData.get && SaveData.get('lastMap')) || 'countryside';
        Game.gameMode = 'normal';
        UI._selectedMode = 'normal'; UI._botModeSelected = false;
        this._startGame(_vid, _mid, false);
        return;
      }
      case 'garaj_yukselt': {
        const vid = SaveData.get('selectedVehicle') || 'jeep';
        const stat = String(v.stat || '');
        if (!stat) return;
        if (Economy.doUpgrade(vid, stat)) {
          if (Audio.playTierUp) Audio.playTierUp();
          if (EG) EG._vc = null;                       // veri önbelleğini tazele
        } else {
          const cur = SaveData.getUpgrade ? SaveData.getUpgrade(vid, stat) : 1;
          const max = (typeof Economy !== 'undefined' && Economy.UP_MAX) ? Economy.UP_MAX : 25;
          if (cur >= max) UI.showToast('★ Zaten MAX seviye (' + max + '/' + max + ')');
          else {
            const cost = Economy.getUpgradeCost ? Economy.getUpgradeCost(stat, cur) : null;
            UI.showToast('Yeterli altın yok!' + (cost ? ' Gerekli: ' + cost.toLocaleString('tr-TR') : ''));
          }
          if (Audio.playError) Audio.playError();
        }
        return;
      }
    }

    // ── PARÇA GARAJI (7) ────────────────────────────────────────────────────
    switch (action) {
      case 'parca_geri':  UI.goTo('garage'); return;     // -> `garaj`
      case 'parca_bitti': UI.goTo('garage'); return;
      case 'parca_sec':   return;                        // seçim modül içinde yapıldı
      case 'parca_yuva':  return;                        // boş yuva / seçim
      case 'parca_tak':
      case 'parca_cikar': {
        if (!EG || typeof EG.takToggle !== 'function') { UI.showToast('Parça modülü yüklü değil.'); return; }
        const r = EG.takToggle(String(v.id || ''));
        if (r && r.ok) {
          if (Audio.playEquip) Audio.playEquip();
          UI.showToast(r.cikar ? 'Parça çıkarıldı.' : 'Parça takıldı.');
        } else if (r && r.sebep) UI.showToast(r.sebep);
        return;
      }
      case 'parca_yukselt': {
        // 🔴 Kart sayacı (`SaveData.data.partCards`) HENÜZ YOK — o alan
        //   yazılmadığı için `_kartSayisi()` her zaman 0 döner ve butonun
        //   `ok` bayrağı false olur. Gerçek yükseltme yolu oyunun MEVCUT
        //   ekonomisidir (`Economy.upgradePart` = elmas).
        const p = (EG && typeof EG._parca === 'function') ? EG._parca(String(v.id || '')) : null;
        const oyunId = (p && p.oyun) ? p.oyun : null;
        if (!oyunId) { UI.showToast('Bu parçanın oyun karşılığı yok (kart sistemi henüz bağlı değil).'); return; }
        if (Economy.upgradePart(oyunId)) {
          UI.showToast('◆ Parça yükseltildi! Sv.' + SaveData.getPartLevel(oyunId));
          if (Audio.playTierUp) Audio.playTierUp();
          if (EG) EG._vc = null;
        } else UI.showToast('Yeterli elmas yok veya MAX seviye!');
        return;
      }
    }

    // ── CUPS / YARIŞ LOBİSİ (6) ─────────────────────────────────────────────
    switch (action) {
      case 'cups_sec': {
        // Seçim `EkranCups.tikla` içinde yapıldı; kilitli değilse lobiye geç.
        if (v.kilit) {
          UI.showToast('Bu kupa ' + (Number(v.esik) || 0).toLocaleString('tr-TR') + ' m sonra açılır.');
          return;
        }
        UI.goTo('yarisLobi');
        return;
      }
      case 'cups_kupa':  UI.goTo('cups');      return;   // lobideki kart -> ızgara
      case 'cups_rutbe': UI.goTo('rankings');  return;
      case 'cups_yuva':  return;                          // rakip yuvası — bilgi
      case 'cups_odul': {
        const g = Math.max(0, Math.floor(Number(v.galibiyet) || 0));
        const h = Math.max(1, Math.floor(Number(v.hedef) || 10));
        UI.showToast('🏆 Sandık ödülü: ' + (g % h) + '/' + h + ' galibiyet');
        UI.goTo('chests');
        return;
      }
      case 'cups_yaris': {
        if (v.kilit) {
          UI.showToast('Bu kupa ' + (Number(v.esik) || 0).toLocaleString('tr-TR') + ' m sonra açılır.');
          if (Audio.playError) Audio.playError();
          return;
        }
        const _arac = String(v.arac || (SaveData.get('selectedVehicle') || 'jeep'));
        const _harita = String(v.harita || 'countryside');
        // 🔴 `bagla-rakip.js` `_yarisMi()` KAPISI: NPC'ler YALNIZ yarış modunda
        //   doğar (bilinçli perf düzeltmesi). Bu satır olmadan lobide gösterilen
        //   rakipler piste ÇIKMAZ.
        Game.gameMode = 'race';
        UI._selectedMode = 'race';
        UI._botModeSelected = true;
        this._startGame(_arac, _harita, true);
        return;
      }
    }
  },

  // ── MENÜ EYLEMLERİ (3 Ağu) — ana menü VE etkinlikler ekranı ortak kullanır ──
  //   26 ikon ana menüden kalkıp `etkinlikler` ekranına taşındı; eylemler
  //   birebir AYNI olduğu için tek yerde tutulur (kopyala-yapıştır YOK).
  //   🔴 `ulke_XX` TAM ÖNEK kontrolü `ulke`den ÖNCE kalmalı (31 Tmz tuzağı).
  _menuEylem(action) {
    if (!action) return;
    // ── YENİ HCR2 EKRANLARI (3 Ağu) — TAM EŞLEŞME ─────────────────────────
    //   `ana`         : yeni ana ekran (`js/ekran-ana.js`)
    //   `garage_eski` : ESKİ garaj ekranı. `garage` artık `EkranGaraj`'a
    //     yönleniyor (UI.goTo yönlendirmesi); nitro alımı / parça mağazası /
    //     sarf malzemesi YALNIZ eski ekranda olduğu için o da erişilebilir
    //     kalır. `ham=true` yönlendirmeyi atlar.
    if (action === 'ana')          { UI.goTo('ana'); return; }
    if (action === 'garage_eski')  { UI.goTo('garage', true); return; }
    if (action === 'play')         UI.goTo('vehicles');
    if (action === 'garage')       UI.goTo('garage');
    if (action === 'vehicles')     UI.goTo('vehicles');
    if (action === 'rankings')     UI.goTo('rankings');
    if (action === 'shop')         UI.goTo('shop');
    if (action === 'cup')          UI.goTo('cup');
    if (action === 'team')         UI.goTo('team');
    if (action === 'mapselect')    UI.goTo('mapselect');
    if (action === 'chests')       UI.goTo('chests');
    // ETKİNLİKLER (3 Ağu) — alt navın yeni sekmesi. TAM eşleşme.
    if (action === 'etkinlikler')  { UI.goTo('etkinlikler'); return; }
    if (action === 'seasonpass')   UI.goTo('seasonpass');
    if (action === 'multiplayer')  UI.goTo('multiplayer');
    if (action === 'environment')  { if (typeof Environment!=='undefined') Environment.load(); UI.goTo('environment'); }
    if (action === 'missions')     UI.goTo('missions');
    if (action === 'rewards')      UI.goTo('rewards');
    if (action === 'settings')     { UI._setTab = 'general'; UI._mapCfgOpen = null; UI._mapCfgScroll = 0; UI._mapGridScroll = 0; UI.goTo('settings'); }
    if (action === 'achievements') UI.goTo('achievements');
    if (action === 'career')       UI.goTo('career');
    if (action === 'campaign')     UI.goTo('campaign');
    if (action === 'tuning')       UI.goTo('tuning');
    if (action === 'seasonevents') UI.goTo('seasonevents');
    if (action === 'mprooms')      { if (typeof MPRooms !== 'undefined') MPRooms.openLobby(); UI.goTo('mprooms'); }
    if (action === 'openworld')    { if (typeof OpenWorld !== 'undefined') { this.setMode('openworld'); OpenWorld.init(); } }
    if (action === 'cardcollection') UI.goTo('cardcollection');
    if (action === 'luckwheel')    UI.goTo('luckwheel');
    // ÜLKE SEÇİMİ (31 Tmz) — ikon → ekran, kart → seçim.
    // ⚠ `ulke_XX` kontrolü `ulke` ekranından ÖNCE gelmeli, yoksa
    //   `action.indexOf('ulke')` eşleşmesi kart tıklamasını yutar.
    if (action.indexOf('ulke_') === 0) {
      try { if (typeof Ulke !== 'undefined' && Ulke.handleAction(action)) return; } catch (e) {}
      return;
    }
    if (action === 'ulke')         { UI.goTo('ulke'); return; }
    // KLAN (2 Ağu) — alt nav + ikon girişi. `klan_*` eylemleri `_dispatchUIAction`
    // içinde DAHA ÖNCE yakalanır (önek çakışması yok).
    if (action === 'klan')         { this._klanAc(); return; }
    if (action === 'profile')      UI.goTo('profile');
    if (action === 'replay')       UI.goTo('replay');
    if (action === 'shopoffers')   UI.goTo('shopoffers');
    if (action === 'powermodes')   { if (typeof PowerModes !== 'undefined' && PowerModes.openMenu) PowerModes.openMenu(); UI.goTo('powermodes'); }
    if (action === 'paint')        UI.goTo('paintshop');
    if (action === 'daily')        UI.goTo('dailyquests');
    if (action === 'skills')       UI.goTo('skilltree');
    if (action === 'stats')        UI.goTo('statspanel');
    if (action === 'prestigescr')  UI.goTo('prestigescr');
    if (action === 'market2')      UI.goTo('blackmarket');
  },

  _dispatchUIAction(action) {
    if (!action) return;
    const screen = UI.currentScreen;

    // Screens with their OWN back handler that navigates somewhere other than
    // the main menu (nested pages / sub-screens). The global back below must NOT
    // pre-empt them, otherwise their specialized back logic becomes dead code.
    const _screenHasOwnBack = (screen === 'customize' || screen === 'settings' ||
      screen === 'stats' || screen === 'vip' || screen === 'league' ||
      screen === 'market' || screen === 'spin');
    if (action === 'back' && !_screenHasOwnBack) { UI.goTo('menu'); return; }
    if (action === 'menu') { UI.goTo('menu'); return; }

    // ── KLAN SİSTEMİ (2 Ağu) ────────────────────────────────────────────────
    // 🔴 ÖNEK ÇAKIŞMASI TUZAĞI (31 Tmz `ulke_XX`): `klan_savas_odul` eylemi
    //   `klan_savas` önekiyle BAŞLADIĞI için `startsWith`/`indexOf` ile
    //   dallanmak onu sessizce yutardı. ▶ `_klanEylem` yalnız TAM EŞLEŞME
    //   (`===`) kullanır; önek karşılaştırması YAPMA.
    // ⚠ Bu blok ekran dallarından ÖNCE: klan eylemleri 8 ayrı ekrandan gelir.
    if (action.indexOf('klan_') === 0) { this._klanEylem(action); return; }

    // ── YENİ HCR2 EKRANLARI (3 Ağu) ─────────────────────────────────────────
    //   `ana_* · garaj_* · parca_* · cups_* · sandik_*` + çerçeve `ekr_geri`.
    //   ⚠ Ekran dallarından ÖNCE: sandık kaplaması HER ekranın üstünde açılır,
    //     `sandik_*` eylemi `chests`/`ana`/`cups` fark etmeksizin buraya düşer.
    //   🔴 `_ekranEylem` yalnız TAM EŞLEŞME (`===`) kullanır; tek istisna
    //     `ana_sandik_` / `ana_zaman_` ki onlar SABİT önektir ve başka hiçbir
    //     eylem o önekle başlamaz (31 Tmz `ulke_XX` tuzağı).
    if (action.indexOf('ana_') === 0 || action.indexOf('garaj_') === 0 ||
        action.indexOf('parca_') === 0 || action.indexOf('cups_') === 0 ||
        action.indexOf('sandik_') === 0 || action === 'ekr_geri') {
      this._ekranEylem(action);
      return;
    }

    // ── ÇERÇEVE ALT NAVİGASYONU (3 Ağu) ─────────────────────────────────────
    //   `ana` / `cups` / `yarisLobi` ekranlarının alt navı MENÜ ile AYNI 8
    //   kimliği üretir (`UI._EKRAN_NAV`) → `_menuEylem`e devredilir
    //   (kopyala-yapıştır YOK). `garaj`/`parcaGaraj` kendi çerçevesini çizer,
    //   alt nav YOKTUR — bu yüzden listede değiller.
    //   ⚠ Bu blok `_ekranEylem` prefix dallanmasından SONRA gelir; yoksa
    //     `ana_*`/`cups_*` eylemleri `_menuEylem`e düşer ve sessizce yutulur.
    if (screen === 'ana' || screen === 'cups' || screen === 'yarisLobi') {
      this._menuEylem(action);
      return;
    }

    if (screen === 'splash') {
      if (action === 'play')         UI.goTo('vehicles');
      if (action === 'achievements') UI.goTo('achievements');
      if (action === 'settings')     { UI._setTab = 'general'; UI._mapCfgOpen = null; UI._mapCfgScroll = 0; UI._mapGridScroll = 0; UI.goTo('settings'); }
      if (action === 'rankings')     UI.goTo('rankings');
      return;
    }

    if (screen === 'menu') { this._menuEylem(action); return; }

    // ── ETKİNLİKLER EKRANI (3 Ağu) ──────────────────────────────────────────
    //   Ana menüden kalkan 25 ikon buraya taşındı. Eylemler MENÜ ile AYNI
    //   olduğu için `_menuEylem`e devredilir (kopyala-yapıştır yok).
    //   🔴 TAM EŞLEŞME: 'etkinlikler' / 'etk_ac' önek karşılaştırmasıyla
    //     dallanılmaz (31 Tmz `ulke_XX` tuzağı).
    if (screen === 'etkinlikler') {
      if (action === 'ikon_menu_kapat') { UI.goTo('menu'); return; }
      if (action === 'etk_ac') {
        const _eid = UI._etkId; UI._etkId = null;
        if (_eid) this._menuEylem(_eid);
        return;
      }
      this._menuEylem(action);       // yedek ızgara: ham ikon kimliği gelir
      return;
    }

    if (screen === 'career') {
      if (action === 'back') { UI.goTo('menu'); return; }
      if (action && action.indexOf('career_claim_') === 0) {
        const idx = parseInt(action.slice(13), 10);
        if (typeof Career !== 'undefined' && Career.claim) {
          const r = Career.claim(idx);
          if (r) {
            let msg = '🎖️ Ödül:';
            if (r.gold)     msg += ' ⧆' + r.gold;
            if (r.diamonds) msg += ' ◆' + r.diamonds;
            if (r.scrap)    msg += ' ◈' + r.scrap;
            if (r.vehicle)  msg += ' 🚗 yeni araç!';
            if (r.part)     msg += ' 🔩 yeni parça!';
            UI.showToast(msg);
            if (typeof Audio !== 'undefined') { if (Audio.playModeWin) Audio.playModeWin(); else if (Audio.playTierUp) Audio.playTierUp(); }
          } else UI.showToast('Bu bölüm henüz hazır değil.');
        }
        return;
      }
      return;
    }

    if (screen === 'chests') {
      if (action === 'back') { UI.goTo('menu'); return; }
      if (action === 'chest_collect') { UI._chestReveal = null; return; }
      if (action && action.indexOf('open_chest_') === 0) {
        // 🔴 TEK YOL (3 Ağu): satın alma + ses + istatistik + AÇILIŞ ANİMASYONU
        //   `_sandikAc()` içinde. `EkranSandik` yoksa eski `UI._chestReveal`
        //   kartına düşer (oyun çökmez, davranış eskisiyle birebir aynı).
        this._sandikAc(action.replace('open_chest_', ''));
      }
      return;
    }

    if (screen === 'multiplayer') {
      if (action === 'back') { UI.goTo('menu'); return; }
      if (action === 'mp_find') {
        UI._selectedMode = 'ghostmp';
        UI._botModeSelected = false;
        if (typeof Multiplayer !== 'undefined' && Multiplayer.prefetch) {
          const _mid = SaveData._ALL_MAPS[Math.round(UI._carMapTarget || 0)] || 'countryside';
          Multiplayer.prefetch(_mid);
        }
        UI.showToast(typeof Multiplayer !== 'undefined' && Multiplayer.backend === 'firebase' ? '🌐 Çevrimiçi rakipler aranıyor! Pist seç.' : '🔍 Rakip hayaletler bulundu! Pist seç.');
        UI.goTo('mapselect');
        return;
      }
      return;
    }

    if (screen === 'seasonpass') {
      if (action === 'back') { UI.goTo('menu'); return; }
      if (action === 'buy_premium') {
        if (Economy.buyPremiumPass()) UI.showToast('⭐ Premium Pass unlocked!');
        else UI.showToast('Not enough diamonds!');
        return;
      }
      if (action && action.indexOf('claim_season_') === 0) {
        const rest = action.replace('claim_season_', '');
        const premium = rest.charAt(0) === 'p';
        const tier = parseInt(rest.slice(2), 10);
        const curTier = Economy.seasonTier(SaveData.getSeasonXP ? SaveData.getSeasonXP() : 0);
        if (curTier <= tier) { UI.showToast('Tier not reached yet!'); return; }
        if (premium && !SaveData.get('premiumPass')) { UI.showToast('Premium pass required!'); return; }
        if (SaveData.isSeasonClaimed(tier, premium)) { UI.showToast('Already claimed!'); return; }
        const r = Economy.claimSeasonReward(tier, premium);
        SaveData.setSeasonClaimed(tier, premium);
        UI.showToast('Claimed: ' + (r.gold ? ('⧆ ' + r.gold) : r.diamonds ? ('◆ ' + r.diamonds) : ('◈ ' + r.scrap)));
        return;
      }
      return;
    }

    if (screen === 'vehicles') {
      if (action === 'prev_vehicle') {
        UI._carVehTarget = Math.max(0, (UI._carVehTarget||0) - 1);
      } else if (action === 'next_vehicle') {
        UI._carVehTarget = Math.min(Object.keys(VehicleDefs).length - 1, (UI._carVehTarget||0) + 1);
      } else if (action === 'customize') {
        const vids = Object.keys(VehicleDefs);
        UI._customizeVeh = vids[Math.round(UI._carVehTarget||0)] || 'jeep';
        UI.goTo('customize');
      } else if (action === 'select_vehicle' || action === 'buy_vehicle') {
        const vids = Object.keys(VehicleDefs);
        const vid  = vids[Math.round(UI._carVehTarget||0)];
        if (!vid) return;
        if (SaveData.get('ownedVehicles').includes(vid)) {
          SaveData.set('selectedVehicle', vid); if (Audio.playEquip) Audio.playEquip(); UI.goTo('garage');
        } else {
          if (Economy.buyVehicle(vid)) { SaveData.set('selectedVehicle', vid); if (Audio.playUnlockVehicle) Audio.playUnlockVehicle(); else if (Audio.playPurchaseBig) Audio.playPurchaseBig(); UI.goTo('garage'); }
          else { UI.showToast('Yeterli altın yok! ⧆ ' + (VehicleDefs[vid].price||0).toLocaleString()); if (Audio.playError) Audio.playError(); }
        }
      }
      return;
    }

    if (screen === 'customize') {
      const vid = UI._customizeVeh || SaveData.get('selectedVehicle') || 'jeep';
      if (action === 'back') { UI.goTo('vehicles'); return; }
      if (action === 'reset_paint') {
        if (SaveData.clearPaint) SaveData.clearPaint(vid);
        UI.showToast('Renkler sıfırlandı');
        return;
      }
      if (action.startsWith('paint_c1_') || action.startsWith('paint_c2_')) {
        const isC1 = action.startsWith('paint_c1_');
        const hex  = action.slice(9);
        const def  = VehicleDefs[vid] || VehicleDefs.jeep;
        const cur  = (SaveData.getPaint && SaveData.getPaint(vid)) || { c1: def.color, c2: def.color2 };
        const c1 = isC1 ? hex : (cur.c1 || def.color);
        const c2 = isC1 ? (cur.c2 || def.color2) : hex;
        if (SaveData.setPaint) SaveData.setPaint(vid, c1, c2);
        return;
      }
      if (action.startsWith('tire_')) {
        const type = action.slice(5);
        if (SaveData.setTire) SaveData.setTire(vid, type);
        UI.showToast('Lastik: ' + type.toUpperCase());
        return;
      }
      return;
    }

    if (screen === 'settings') {
      // ── Top tabs: GENEL / MAP AYARLARI ──
      if (action === 'settings_tab_general') { UI._setTab = 'general'; return; }
      if (action === 'settings_tab_maps')    { UI._setTab = 'maps'; return; }

      // ── MAP AYARLARI flow ──
      if (action === 'back') {
        // Env config page → return to the Environment screen.
        if (UI._mapCfgOpen === 'environment') {
          UI._mapCfgOpen = null; UI._mapCfgScroll = 0; UI._mapCfgReturn = 'settings';
          UI.goTo('environment'); return;
        }
        // Back within map config: page → grid → leave settings
        if (UI._setTab === 'maps' && UI._mapCfgOpen) { UI._mapCfgOpen = null; UI._mapCfgScroll = 0; return; }
        UI.goTo('menu'); return;
      }
      if (action.indexOf('mapcfg_open_') === 0) {
        UI._mapCfgOpen = action.slice(12);
        UI._mapCfgScroll = 0;
        return;
      }
      if (action === 'mapcfg_back') {
        if (UI._mapCfgReturn === 'environment') {
          UI._mapCfgOpen = null; UI._mapCfgScroll = 0; UI._mapCfgReturn = 'settings';
          UI.goTo('environment'); return;
        }
        UI._mapCfgOpen = null; UI._mapCfgScroll = 0; return;
      }
      if (action.indexOf('mapcfg_reset_') === 0) {
        const mid = action.slice(13);
        if (typeof MapSettings !== 'undefined') MapSettings.reset(mid);
        UI.showToast('Sıfırlandı: ' + mid);
        return;
      }
      if (action.indexOf('mapcfg_inc_') === 0) {
        const rest = action.slice(11); const sep = rest.indexOf('__');
        UI._mapCfgStep(rest.slice(0, sep), rest.slice(sep + 2), +1); return;
      }
      if (action.indexOf('mapcfg_dec_') === 0) {
        const rest = action.slice(11); const sep = rest.indexOf('__');
        UI._mapCfgStep(rest.slice(0, sep), rest.slice(sep + 2), -1); return;
      }
      if (action.indexOf('mapcfg_tog_') === 0) {
        const rest = action.slice(11); const sep = rest.indexOf('__');
        UI._mapCfgToggle(rest.slice(0, sep), rest.slice(sep + 2)); return;
      }
      if (action === 'mapcfg_help_close') { UI._helpOpen = false; return; }
      if (action.indexOf('mapcfg_help_') === 0) {
        // 'mapcfg_help_' is 12 chars (one longer than 'mapcfg_inc_' = 11).
        const rest = action.slice(12); const sep = rest.indexOf('__');
        const mid = rest.slice(0, sep), id = rest.slice(sep + 2);
        UI._helpText = (typeof MapSettings !== 'undefined' && MapSettings.desc)
          ? (MapSettings.desc(mid, id) || '') : '';
        UI._helpTitle = '';
        UI._helpOpen = true;
        return;
      }
      if (action === 'mapcfg_scroll_up')   { UI._mapCfgHalfPage(-1); return; }
      if (action === 'mapcfg_scroll_down') { UI._mapCfgHalfPage(+1); return; }

      const S = (typeof Settings !== 'undefined') ? Settings : null;
      if (S && action.indexOf('set_toggle_') === 0) { S.toggle(action.slice(11)); return; }
      if (S && action === 'set_cycle_volMaster') { const o=[0.2,0.4,0.6,0.8,1.0]; const i=o.indexOf(S.get('volMaster')); S.set('volMaster', o[(i+1)%o.length] || 0.2); return; }
      // BUGFIX(30 Tmz) — 6 KADEMELİ KALİTE ULAŞILAMAZDI.
      // js/kalite.js 6 kademe × 59 anahtar taşıyor (dusuk…ultra) ama bu satır
      // yalnız eski Settings'in 3 değerini döndürüyordu ve `Kalite.kur()`
      // proje genelinde SIFIR kez çağrılıyordu → kullanıcı ULTRA'da kilitliydi,
      // telefonda takılsa bile düşüremiyordu. Kalite varsa ONA devret.
      if (action === 'set_cycle_graphics') {
        try {
          if (typeof Kalite !== 'undefined' && Kalite.sonraki) { Kalite.sonraki(); return; }
        } catch (e) {}
        if (S) { S.cycle('graphics', ['low','med','high']); return; }
        return;
      }
      if (S && action === 'set_cycle_cameraMode'){ S.cycle('cameraMode', ['normal','near','wide','cinematic']); return; }
      // ── MOBİL İKON MENÜSÜ (28 Tmz): 24 ikon tek butonda toplandı.
      if (action === 'ikon_menu_ac')    { UI._ikonMenuAcik = true;  UI._ikonPanelScroll = 0; return; }
      if (action === 'ikon_menu_kapat') { UI._ikonMenuAcik = false; return; }

      // ── DİL (28 Tmz): 2 dil arasında dönmek yerine 10 dilli seçici panel açılır.
      if (action === 'set_cycle_language') { UI._langOpen = true; return; }
      if (action === 'lang_close')         { UI._langOpen = false; return; }
      if (action.indexOf('lang_pick_') === 0) {
        var _kod = action.slice(10);
        // I18N.set() yalnız ÇEVİRİSİ HAZIR dilleri kabul eder; hazır değilse
        // false döner ve ayar DEĞİŞMEZ (yarım çeviriyle karşılaşmak imkânsız).
        if (typeof I18N !== 'undefined' && I18N.set && I18N.set(_kod)) {
          UI._langOpen = false;
          UI.showToast(I18N.nativeName(_kod));
        }
        return;
      }
      if (action === 'set_cycle_botLevel') { const _c = Math.max(1, Math.min(20, (SaveData.get && SaveData.get('botLevel')) || 1)); const _n = _c >= 20 ? 1 : _c + 1; if (SaveData.set) SaveData.set('botLevel', _n); const _v = _n<=5?'Jeep':_n<=10?'Rally':'Formula'; UI.showToast('🤖 Bot Seviye: ' + _n + '/20 · ' + _v); return; }
      if (action === 'open_stats') { UI.goTo('stats'); return; }
      if (action === 'cloud_sync') {
        try {
          const raw = localStorage.getItem('ahmet_save_v3');
          if (raw) { localStorage.setItem('ahmet_cloud_sync', JSON.stringify({ data: raw, time: Date.now() })); UI.showToast('☁ Yedeklendi'); }
          else UI.showToast('Kayıt bulunamadı');
        } catch (e) { UI.showToast('Senkron hatası'); }
        return;
      }
      if (action === 'reset_data') {
        if (!UI._confirmReset) { UI._confirmReset = true; UI.showToast('⚠ Tekrar bas: TÜM VERİ SİLİNİR'); setTimeout(() => { UI._confirmReset = false; }, 3000); return; }
        UI._confirmReset = false;
        // BUGFIX(28 Tmz): "TÜM VERİ SİLİNİR" deyip yalnız ahmet_save_v3 siliniyordu.
        // Geride kalanlar: ahmet_upgrades_v1 (economy.js ayrı yükseltme sistemi),
        // ahmet_cloud_sync (eski kaydın tam kopyası), ahmet_backup_* , ahmet_admin_mode.
        // Artık "ahmet_" ile başlayan HER anahtar siliniyor → sıfırlama gerçekten sıfırlıyor.
        // 🔴 GECİKMELİ YAZMA TUZAĞI (29 Tmz): SaveData.save() artık hemen
        //   yazmıyor, 1 sn sonra yazıyor. Bekleyen bir yazma varsa aşağıda
        //   sildiğimiz veriyi `beforeunload` kancası GERİ YAZARDI.
        //   ▶ Önce bekleyen yazmayı İPTAL et, sonra sil.
        try {
          if (typeof SaveData !== 'undefined') {
            SaveData._kirli = false;
            if (SaveData._yazmaZaman) { clearTimeout(SaveData._yazmaZaman); SaveData._yazmaZaman = null; }
          }
        } catch (e) {}
        try {
          const _sil = [];
          for (let _i = 0; _i < localStorage.length; _i++) {
            const _k = localStorage.key(_i);
            if (_k && _k.indexOf('ahmet_') === 0) _sil.push(_k);
          }
          _sil.forEach(function (_k) { try { localStorage.removeItem(_k); } catch (e) {} });
        } catch (e) {}
        location.reload();
        return;
      }
      return;
    }

    if (screen === 'stats') { if (action === 'back') { UI.goTo('settings'); return; } if (action === 'cloud_sync') { UI.goTo('settings'); } return; }

    if (screen === 'rewards' || screen === 'vip' || screen === 'league' || screen === 'market' || screen === 'spin') {
      if (action === 'back') { UI.goTo(screen === 'rewards' ? 'menu' : 'rewards'); return; }
      const R = (typeof Rewards !== 'undefined') ? Rewards : null;
      // Hub navigasyon
      if (action === 'league')       { UI.goTo('league'); return; }
      if (action === 'vip')          { UI.goTo('vip'); return; }
      if (action === 'market')       { UI.goTo('market'); return; }
      if (action === 'spin')         { UI.goTo('spin'); return; }
      if (action === 'achievements') { UI.goTo('achievements'); return; }
      // Çarkı çevir
      if (action === 'do_spin') {
        if (R && R.canSpin() && UI._spin && !UI._spin.spinning) {
          R.markSpun();
          UI._spin.spinning = true; UI._spin.result = -1; UI._spin.showT = 0;
          UI._spin.vel = 9 + Math.random() * 4;
        }
        return;
      }
      // Günlük ödül
      if (action === 'reward_daily') {
        if (R) { const r = R.claimDaily(); if (r) { UI.showToast('🎁 Gün ' + r.streak + ': +' + r.gold + ' altın' + (r.dia ? ' +' + r.dia + '◆' : '')); if (Audio.playDailyClaim) Audio.playDailyClaim(); } else UI.showToast('Bugün zaten aldın'); }
        return;
      }
      // Reklam bonusu — önce 5 sn'lik yer-tutucu reklam, sonra ödül (claimAd).
      if (action === 'reward_ad') {
        if (R) {
          if (!R.adReady()) { UI.showToast('⏳ ' + Math.ceil(R.adCooldownLeft() / 60000) + ' dk sonra'); return; }
          this._showAdOverlay(() => {
            const g = R.claimAd();
            if (g > 0) UI.showToast('📺 Bonus: +' + g + ' altın');
            else UI.showToast('⏳ ' + Math.ceil(R.adCooldownLeft() / 60000) + ' dk sonra');
          });
        }
        return;
      }
      // VIP satın al
      if (action === 'buy_vip_7')  { if (R && R.buyVIP(7, 30))  UI.showToast('👑 7 gün VIP aktif!'); else UI.showToast('Yetersiz elmas (◆30)'); return; }
      if (action === 'buy_vip_30') { if (R && R.buyVIP(30, 90)) UI.showToast('👑 30 gün VIP aktif!'); else UI.showToast('Yetersiz elmas (◆90)'); return; }
      // Pazar
      if (action.indexOf('market_buyscrap_') === 0)  { const n = parseInt(action.slice(16), 10); if (R && R.buyScrap(n)) UI.showToast('+' + n + ' hurda aldın'); else UI.showToast('Yetersiz altın'); return; }
      if (action.indexOf('market_sellscrap_') === 0) { const n = parseInt(action.slice(17), 10); if (R && R.sellScrap(n)) UI.showToast(n + ' hurda sattın'); else UI.showToast('Yetersiz hurda'); return; }
      return;
    }

    if (screen === 'missions') {
      if (action === 'back') { UI.goTo('menu'); return; }
      if (typeof Missions === 'undefined') return;
      if (action.indexOf('claim_mission_') === 0) {
        const r = Missions.claim(action.slice(14));
        if (r > 0) { UI.showToast('🎁 +' + r + ' altın'); if (typeof Audio !== 'undefined' && Audio.playMissionComplete) Audio.playMissionComplete(); if (typeof SaveData !== 'undefined' && SaveData.bumpStat) SaveData.bumpStat('missionsCompleted', 1); }
        return;
      }
      if (action === 'claim_all_missions') {
        const r = Missions.claimAll();
        if (r > 0) { UI.showToast('🎁 +' + r + ' altın'); if (typeof Audio !== 'undefined' && Audio.playMissionComplete) Audio.playMissionComplete(); }
        return;
      }
      return;
    }

    if (screen === 'environment') {
      if (action === 'back') { UI.goTo('menu'); return; }
      if (action === 'env_open_settings') {
        UI._mapCfgReturn = 'environment';
        UI._mapCfgOpen = 'environment';
        UI._mapCfgScroll = 0;
        UI._setTab = 'maps';
        UI.goTo('settings');
        return;
      }
      if (typeof Environment === 'undefined') return;
      if (action.startsWith('env_day_')) { Environment.toggle('dayNight', action.slice(8)); return; }
      if (action.startsWith('env_wx_'))  { Environment.toggle('weather',  action.slice(7)); return; }
      if (action === 'env_obstacles') { Environment.toggle('obstacles', !Environment.settings.obstacles); UI.showToast('Engeller: ' + (Environment.settings.obstacles?'AÇIK':'KAPALI')); return; }
      if (action === 'env_disasters') { Environment.toggle('disasters', !Environment.settings.disasters); UI.showToast('Afetler: ' + (Environment.settings.disasters?'AÇIK':'KAPALI')); return; }
      if (action === 'env_damage')    { Environment.toggle('damage', !Environment.settings.damage); UI.showToast('Hasar: ' + (Environment.settings.damage?'AÇIK':'KAPALI')); return; }
      if (action === 'env_endless')   { Environment.toggle('endless', !Environment.settings.endless); UI.showToast('Sonsuz Mod: ' + (Environment.settings.endless?'AÇIK':'KAPALI')); return; }
      return;
    }

    if (screen === 'mapselect') {
      if (action === 'prev_map' || action === 'next_map') {
        if (action === 'prev_map') UI._carMapTarget = Math.max(0, (UI._carMapTarget||0) - 1);
        else UI._carMapTarget = Math.min(SaveData._ALL_MAPS.length - 1, (UI._carMapTarget||0) + 1);
        if (UI._selectedMode === 'ghostmp' && typeof Multiplayer !== 'undefined' && Multiplayer.prefetch) {
          Multiplayer.prefetch(SaveData._ALL_MAPS[Math.round(UI._carMapTarget||0)] || 'countryside');
        }
      } else if (action === 'toggle_bot') {
        UI._botModeSelected = !UI._botModeSelected;
      } else if (action === 'bot_lvl_dec' || action === 'bot_lvl_inc') {
        const _cur = Math.max(1, Math.min(20, (SaveData.get && SaveData.get('botLevel')) || 1));
        const _new = Math.max(1, Math.min(20, _cur + (action === 'bot_lvl_inc' ? 1 : -1)));
        if (SaveData.set) SaveData.set('botLevel', _new);
      } else if (action && action.indexOf('mode_') === 0) {
        UI._selectedMode = action.slice(5);
        if (UI._selectedMode === 'race') UI._botModeSelected = true;
      } else if (action === 'play_map') {
        const mapId = SaveData._ALL_MAPS[Math.round(UI._carMapTarget||0)] || 'countryside';
        const vid   = SaveData.get('selectedVehicle') || 'jeep';
        Game.gameMode = UI._selectedMode || 'normal';
        this._startGame(vid, mapId, UI._botModeSelected);
      }
      return;
    }

    if (screen === 'garage') {
      if (action === 'garage_to_map') {
        UI.goTo('mapselect'); return;
      } else if (action === 'buy_nitro') {
        if (SaveData.buyNitro && SaveData.buyNitro()) {
          UI.showToast('⚡ Nitro +%25 dolduruldu (depo %' + SaveData.getNitroReserve() + ')');
          if (Audio.playPurchase) Audio.playPurchase(); else if (Audio.playMenuClick) Audio.playMenuClick();
        } else {
          UI.showToast(SaveData.getNitroReserve() >= 100 ? 'Nitro deposu zaten dolu' : 'Yeterli altın yok! (10.000 gerekli)');
          if (Audio.playError) Audio.playError();
        }
      } else if (action === 'prev_vehicle') {
        UI._carVehTarget = Math.max(0, (UI._carVehTarget||0) - 1);
      } else if (action === 'next_vehicle') {
        UI._carVehTarget = Math.min(Object.keys(VehicleDefs).length - 1, (UI._carVehTarget||0) + 1);
      } else if (action === 'select_vehicle') {
        const vid = Object.keys(VehicleDefs)[Math.round(UI._carVehTarget||0)];
        if (vid && SaveData.get('ownedVehicles').includes(vid)) {
          SaveData.set('selectedVehicle', vid); UI.showToast('Araç seçildi!');
        } else if (vid) {
          if (Economy.buyVehicle(vid)) { UI.showToast('Araç satın alındı!'); if (Audio.playUnlockVehicle) Audio.playUnlockVehicle(); }
          else { UI.showToast('Yeterli altın yok!'); if (Audio.playError) Audio.playError(); }
        }
      } else if (action === 'open_upgrades') {
        const vid = SaveData.get('selectedVehicle') || 'jeep';
        if (typeof UpgradeUI !== 'undefined') UpgradeUI.open(vid);
      } else if (action === 'garage_tab_0') {
        UI._garageTab = 0;
      } else if (action === 'garage_tab_1') {
        UI._garageTab = 1;
      } else if (action.startsWith('downgrade_')) {
        const vid = SaveData.get('selectedVehicle') || 'jeep';
        const stat = action.replace('downgrade_','');
        const cur = SaveData.getUpgrade(vid, stat);
        if (cur > 1) { SaveData.setUpgrade(vid, stat, cur - 1); UI.showToast('▼ ' + stat + ' Sv.' + (cur-1)); }
      } else if (action.startsWith('upgrade_part_scrap_')) {
        const partId = action.replace('upgrade_part_scrap_','');
        if (Economy.upgradePartScrap(partId)) UI.showToast('◈ Part upgraded! Lv.' + SaveData.getPartLevel(partId));
        else UI.showToast('Not enough scrap or MAX level!');
      } else if (action.startsWith('upgrade_part_')) {
        const partId = action.replace('upgrade_part_','');
        if (Economy.upgradePart(partId)) { UI.showToast('◆ Parça yükseltildi! Sv.' + SaveData.getPartLevel(partId)); if (Audio.playTierUp) Audio.playTierUp(); }
        else UI.showToast('Yeterli elmas yok veya MAX seviye!');
      } else if (action.startsWith('upgrade_')) {
        const vid = SaveData.get('selectedVehicle') || 'jeep';
        const _stat = action.replace('upgrade_','');
        if (!Economy.doUpgrade(vid, _stat)) {
          // Sebebi ayırt et: MAX seviyede "Yeterli altın yok!" demek yanıltıcıydı.
          const _cur = SaveData.getUpgrade ? SaveData.getUpgrade(vid, _stat) : 1;
          const _max = (typeof Economy !== 'undefined' && Economy.UP_MAX) ? Economy.UP_MAX : 25;   // TUNING(2 Agu): yedek 50 → 25
          if (_cur >= _max) UI.showToast('★ Zaten MAX seviye (' + _max + '/' + _max + ')');
          else {
            const _cost = Economy.getUpgradeCost ? Economy.getUpgradeCost(_stat, _cur) : null;
            UI.showToast('Yeterli altın yok!' + (_cost ? ' Gerekli: ' + _cost.toLocaleString('tr-TR') : ''));
          }
        }
        else if (Audio.playTierUp) Audio.playTierUp();
      } else if (action.startsWith('buy_part_gold_')) {
        if (!Economy.buyPart(action.replace('buy_part_gold_',''), false)) { UI.showToast('Yeterli altın yok!'); if (Audio.playError) Audio.playError(); }
        else { UI.showToast('Parça satın alındı!'); if (Audio.playPurchase) Audio.playPurchase(); }
      } else if (action.startsWith('buy_part_diamond_')) {
        if (!Economy.buyPart(action.replace('buy_part_diamond_',''), true)) { UI.showToast('Yeterli elmas yok!'); if (Audio.playError) Audio.playError(); }
        else { UI.showToast('Parça satın alındı!'); if (Audio.playPurchase) Audio.playPurchase(); }
      } else if (action.startsWith('toggle_part_')) {
        const partId = action.replace('toggle_part_','');
        if (SaveData.ownsPart(partId)) { SaveData.toggleEquipPart(partId); if (Audio.playEquip) Audio.playEquip(); }
        else UI.showToast('Önce parçayı satın alın!');
      } else if (action.startsWith('buy_item_')) {
        const iid = action.replace('buy_item_','');
        const r = Economy.buyConsumable(iid);
        if (r && r.ok) { if (Audio.playPurchase) Audio.playPurchase(); else if (Audio.play) Audio.play('buyItem'); UI.showToast((Economy.SHOP_ITEMS[iid].name)+' alındı! (x'+r.count+')'); }
        else if (r && r.error === 'diamond') UI.showToast('Yeterli elmas yok!');
        else UI.showToast('Yeterli altın yok!');
      }
      return;
    }

    if (screen === 'cup') {
      if (action.startsWith('cup_play_')) {
        const mapSets = [
          ['countryside','desert','beach'],['winter','mountains','city'],
          ['arctic','jungle','mars'],['cave','highland','swamp'],
          ['volcano','underwater','moon'],['neon_city','wasteland','canyon']
        ];
        const idx = parseInt(action.replace('cup_play_',''));
        this._startGame(SaveData.get('selectedVehicle') || 'jeep', (mapSets[idx]||mapSets[0])[0], false);
      }
      return;
    }

    if (screen === 'team') {
      if (action === 'create_team') {
        const name = prompt('Takım adınızı girin:');
        if (name && name.trim()) { SaveData.set('teamName', name.trim()); SaveData.set('teamLevel', 1); UI.showToast('Takım oluşturuldu!'); }
      } else if (action.startsWith('join_team_')) {
        const teams = ['Speed Demons','Ahmeters','Road Warriors'];
        SaveData.set('teamName', teams[parseInt(action.replace('join_team_',''))] || 'Ahmeters');
        SaveData.set('teamLevel', 3); UI.showToast('Takıma katıldınız!');
      } else if (action === 'leave_team') {
        if (confirm('Takımdan ayrılmak istediğinizden emin misiniz?')) { SaveData.set('teamName', null); UI.showToast('Takımdan ayrıldınız.'); }
      }
      return;
    }
    if (screen === 'shop') {
      if (action.startsWith('shop_tab_')) { UI._shopTab = parseInt(action.replace('shop_tab_','')); }
      else if (action.startsWith('buy_gold_')) {
        const amt = [500,5000,20000,100000][parseInt(action.replace('buy_gold_',''))] || 500;
        SaveData.addGold(amt); UI.showToast('+' + amt + ' Altın eklendi! (Demo)');
      } else if (action.startsWith('buy_diamond_')) {
        const amt = [10,55,120,300][parseInt(action.replace('buy_diamond_',''))] || 10;
        SaveData.addDiamonds(amt); UI.showToast('+' + amt + ' Elmas eklendi! (Demo)');
      } else if (action === 'watch_ad') {
        this._showAdOverlay(() => { SaveData.addGold(300); UI.showToast('Ücretsiz Altın eklendi!'); });
      }
      return;
    }
  },

};

window.addEventListener('DOMContentLoaded', () => Main.init());


// ================================================================
// MAIN_UTILS — Global utility helpers
// ================================================================
const MAIN_UTILS = (() => {
  function formatNumber(n){
    if(n>=1e6) return (n/1e6).toFixed(1)+'M';
    if(n>=1e3) return (n/1e3).toFixed(1)+'K';
    return String(Math.floor(n));
  }
  function formatTime(ms){
    const s=Math.floor(ms/1000), m=Math.floor(s/60), sec=s%60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  }
  function formatDistance(m){
    return Math.floor(m).toLocaleString('tr-TR')+' m';
  }
  function formatSpeed(mps){ return Math.round(mps*3.6)+' km/h'; }
  function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
  function lerp(a,b,t){ return a+(b-a)*t; }
  function rng(lo,hi){ return lo+Math.random()*(hi-lo); }
  function seededRng(seed){
    let s=seed>>>0;
    return ()=>{ s=(s^61)^(s>>16); s+=s<<3; s^=s>>4; s*=0x27d4eb2d; s^=s>>15; return (s>>>0)/0xffffffff; };
  }
  function throttle(fn, ms){
    let last=0;
    return (...args)=>{ const now=Date.now(); if(now-last>=ms){ last=now; fn(...args); } };
  }
  function debounce(fn, ms){
    let id;
    return (...args)=>{ clearTimeout(id); id=setTimeout(()=>fn(...args),ms); };
  }
  function deepClone(obj){ try{return JSON.parse(JSON.stringify(obj));}catch(e){return obj;} }
  function uuid(){ return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)); }
  function dateStr(d){ const dt=d||new Date(); return dt.toISOString().slice(0,10); }
  function weekKey(d){ const dt=d||new Date(); const jan1=new Date(dt.getFullYear(),0,1); return dt.getFullYear()+'W'+Math.ceil((((dt-jan1)/86400000)+jan1.getDay()+1)/7); }
  function hexToRgb(hex){ const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return {r,g,b}; }
  function isMobile(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent); }
  function getDevicePixelRatio(){ return Math.min(window.devicePixelRatio||1, 2); }
  function supportsWebGL(){ try{const c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'));}catch(e){return false;} }
  function getStorageSizeKB(){ try{let s=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);s+=k.length+(localStorage.getItem(k)||'').length;}return Math.round(s/512);}catch(e){return 0;} }
  function on(el,event,fn){ (el||document).addEventListener(event,fn); return ()=>(el||document).removeEventListener(event,fn); }
  function qs(selector,ctx){ return (ctx||document).querySelector(selector); }
  function qsa(selector,ctx){ return [...(ctx||document).querySelectorAll(selector)]; }
  function show(el){ if(el)el.style.display=''; }
  function hide(el){ if(el)el.style.display='none'; }
  function toggle(el,force){ if(el)el.style.display=(force===undefined?(el.style.display==='none'?'':'none'):(force?'':'none')); }

  return { formatNumber, formatTime, formatDistance, formatSpeed, clamp, lerp, rng, seededRng,
           throttle, debounce, deepClone, uuid, dateStr, weekKey, hexToRgb,
           isMobile, getDevicePixelRatio, supportsWebGL, getStorageSizeKB,
           on, qs, qsa, show, hide, toggle };
})();


// ================================================================
// MAIN_EVENT_SYSTEM — Global pub/sub event bus
// ================================================================
const MAIN_EVENT_SYSTEM = (() => {
  const _listeners = new Map();
  let _eventLog    = [];
  const LOG_LIMIT  = 200;

  function on(event, fn, once) {
    if (!_listeners.has(event)) _listeners.set(event, []);
    const entry = { fn, once:!!once };
    _listeners.get(event).push(entry);
    return () => off(event, fn);
  }

  function once(event, fn) { return on(event, fn, true); }

  function off(event, fn) {
    if (!_listeners.has(event)) return;
    const arr = _listeners.get(event).filter(e=>e.fn!==fn);
    _listeners.set(event, arr);
  }

  function emit(event, data) {
    _eventLog.push({ e:event, d:data, t:Date.now() });
    if (_eventLog.length > LOG_LIMIT) _eventLog.shift();
    if (!_listeners.has(event)) return;
    const listeners = [..._listeners.get(event)];
    const remaining = [];
    for (const entry of listeners) {
      try { entry.fn(data); } catch(e){}
      if (!entry.once) remaining.push(entry);
    }
    _listeners.set(event, remaining);
  }

  function clearAll()     { _listeners.clear(); _eventLog=[]; }
  function clearEvent(e)  { _listeners.delete(e); }
  function listenerCount(e){ return (_listeners.get(e)||[]).length; }
  function getLog(n)      { return _eventLog.slice(-(n||20)); }
  function getRegistered(){ return [..._listeners.keys()]; }

  // Predefined game events
  const EVENTS = {
    GAME_START:        'game:start',
    GAME_PAUSE:        'game:pause',
    GAME_RESUME:       'game:resume',
    GAME_OVER:         'game:over',
    RACE_START:        'race:start',
    RACE_FINISH:       'race:finish',
    RACE_CHECKPOINT:   'race:checkpoint',
    VEHICLE_CRASH:     'vehicle:crash',
    VEHICLE_FLIP:      'vehicle:flip',
    VEHICLE_JUMP:      'vehicle:jump',
    VEHICLE_LAND:      'vehicle:land',
    COIN_COLLECT:      'coin:collect',
    GEM_COLLECT:       'gem:collect',
    FUEL_COLLECT:      'fuel:collect',
    ACHIEVEMENT_UNLOCK:'achievement:unlock',
    LEVEL_UP:          'player:levelup',
    UPGRADE_BUY:       'upgrade:buy',
    VEHICLE_UNLOCK:    'vehicle:unlock',
    SHOP_OPEN:         'shop:open',
    SETTINGS_CHANGE:   'settings:change',
    SAVE_COMPLETE:     'save:complete',
    TERRAIN_CHUNK:     'terrain:chunk_loaded',
    WEATHER_CHANGE:    'weather:change',
    HAZARD_TRIGGER:    'hazard:trigger',
    COMBO_BREAK:       'combo:break',
    TRICK_LANDED:      'trick:landed',
    DAILY_LOGIN:       'daily:login',
    BATTLE_PASS_TIER:  'battlepass:tier',
    ADMIN_ACTION:      'admin:action',
  };

  return { on, once, off, emit, clearAll, clearEvent, listenerCount, getLog, getRegistered, EVENTS };
})();

// ================================================================
// MAIN_GAME_LOOP — Core game loop with fixed timestep and interpolation
// ================================================================
const MAIN_GAME_LOOP = (() => {
  const FIXED_DT     = 1/60;     // 60 Hz physics
  const MAX_FRAME_DT = 0.05;     // cap at 50ms to prevent spiral of death
  let   _accumulator  = 0;
  let   _lastTime     = 0;
  let   _running      = false;
  let   _rafId        = null;
  let   _frame        = 0;
  let   _fps          = 0;
  let   _fpsAccum     = 0;
  let   _fpsCount     = 0;
  let   _targetFPS    = 60;

  // Hooks
  let _onUpdate  = null; // fn(dt) — fixed timestep physics
  let _onRender  = null; // fn(alpha) — interpolation alpha
  let _onPause   = null;
  let _onResume  = null;

  function setUpdateFn(fn)  { _onUpdate = fn; }
  function setRenderFn(fn)  { _onRender = fn; }
  function setOnPause(fn)   { _onPause  = fn; }
  function setOnResume(fn)  { _onResume = fn; }

  function _tick(timestamp) {
    if (!_running) return;
    _rafId = requestAnimationFrame(_tick);

    let dt = (timestamp - _lastTime) / 1000;
    _lastTime = timestamp;
    if (dt < 0 || dt > MAX_FRAME_DT) dt = MAX_FRAME_DT;

    // FPS counter
    _fpsAccum += dt;
    _fpsCount++;
    if (_fpsAccum >= 0.5) {
      _fps      = Math.round(_fpsCount / _fpsAccum);
      _fpsAccum = 0;
      _fpsCount = 0;
    }

    // Fixed timestep update
    _accumulator += dt;
    while (_accumulator >= FIXED_DT) {
      if (_onUpdate) _onUpdate(FIXED_DT);
      _accumulator -= FIXED_DT;
      _frame++;
    }

    // Render with interpolation alpha
    const alpha = _accumulator / FIXED_DT;
    if (_onRender) _onRender(alpha);
  }

  function start() {
    if (_running) return;
    _running   = true;
    _lastTime  = performance.now();
    _accumulator = 0;
    _rafId     = requestAnimationFrame(_tick);
    if (_onResume) _onResume();
  }

  function stop() {
    _running = false;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId=null; }
    if (_onPause) _onPause();
  }

  function pause()  { if (_running) stop(); }
  function resume() { if (!_running) start(); }

  function setTargetFPS(fps) {
    _targetFPS = fps;
    // In rAF loop, FPS is browser-controlled. This flag lets renderers adapt.
  }

  function getStats() {
    return { fps:_fps, frame:_frame, running:_running, fixedDT:FIXED_DT, targetFPS:_targetFPS };
  }

  function getFrame()  { return _frame; }
  function getFPS()    { return _fps; }
  function isRunning() { return _running; }

  return { setUpdateFn, setRenderFn, setOnPause, setOnResume, start, stop, pause, resume, setTargetFPS, getStats, getFrame, getFPS, isRunning, FIXED_DT };
})();
