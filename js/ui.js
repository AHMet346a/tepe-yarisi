'use strict';
// ═══════════════════════════════════════════════════════════════════════════
//  ui.js  –  AHMET Clone  –  v3.0  AHMET1-STYLE INTERFACE
//  Horizontal carousel  ·  Parts garage  ·  Bot race  ·  Diamond currency
// ═══════════════════════════════════════════════════════════════════════════

const UI = {
  currentScreen: 'splash',
  animTime:  0,
  buttons:   [],
  _pts:      [],
  _toasts:   [],

  // Carousel state
  _carVehIdx:   0,   // selected vehicle index (float for animation)
  _carVehTarget:0,
  _carVehDrag:  null,
  _carMapIdx:   0,
  _carMapTarget:0,
  _carMapDrag:  null,

  _shopTab:    0,
  _garageTab:  0,   // 0=upgrade 1=parts

  // ── Settings screen transient state (GENEL / MAP AYARLARI) ──────────────────
  _setTab:      'general', // 'general' | 'maps'
  _mapCfgOpen:  null,      // null (grid) | mapId (per-map page)
  _mapCfgScroll: 0,        // vertical scroll offset (px) for map grid / per-map list
  _mapGridScroll: 0,       // separate scroll offset for the map grid
  _SB_W: 12,               // draggable scrollbar track width (px)
  _sbGeom: null,           // last-drawn scrollbar geometry {kind,trackX,trackY,trackH,thumbY,thumbH,maxScroll,contentH,topY,viewH}
  _sbView: null,           // last-drawn viewport metrics {topY,viewH,contentH,maxScroll,...}
  _sbDrag: null,           // active thumb-drag state {startY,startScroll,ratio} or null
  _mapCfgReturn: 'settings',// where mapcfg_back returns: 'settings' (map grid) | 'environment'
  _sliderBars: null,        // per-frame array of visible slider bar hit-rects for drag-to-set
  _sliderDrag: null,        // active slider drag {id,mn,mx,st,barX,barW,target,settingId} or null
  _helpOpen: false,         // per-setting help popup open?
  _helpText: '',            // help body text (may contain \n newlines)
  _helpTitle: '',           // optional help panel title

  C: {
    bg:'#06060a', panel:'#0c0c1c', card:'#111128',
    fire:'#FF3D00', hot:'#FF8800', cyan:'#00CCFF',
    gold:'#FFD700', green:'#00CC44', red:'#FF1A1A',
    purple:'#AA22FF', text:'#E0E4F8', dim:'#4455AA',
    diamond:'#44DDFF'
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🎨 SATIR RENK PALETİ (31 Tmz — kullanıcı: "menüler çok sade, tüm tuşlar
  //    farklı renkte olsun, az hava kat")
  // ══════════════════════════════════════════════════════════════════════════
  // Ayarlar listesi tek tip lacivert karttı; AÇIK anahtarların HEPSİ aynı turuncu
  // vurguyu kullanıyordu → 18 satır birbirinden ayırt edilemiyordu.
  // Artık her satır sırasına göre kendi rengini alır (kimlik + tarama kolaylığı).
  // ⚠ 12 renk BİLEREK: komşu satırlar hep farklı, ama palet tekrarı 12 satırda
  //   bir olduğu için ekran "gökkuşağı çöplüğü"ne dönmüyor.
  // 🔴 Renkler HEX (#rrggbb) OLMALI — `_drawCard` `accent + '33'` diye alfa
  //   ekliyor; rgba() verirsen sessizce bozuk renk çıkar.
  _SATIR_RENK: [
    '#00CCFF', '#FF8800', '#00CC44', '#AA22FF', '#FFD700', '#FF3D00',
    '#44DDFF', '#FF5FA2', '#7CFF3D', '#5B8CFF', '#FFB020', '#00E5C0'
  ],
  _satirRenk(i) {
    const P = this._SATIR_RENK;
    return P[((i | 0) % P.length + P.length) % P.length];
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 🛞 ARAÇ TABANI — "küçük tekerli araçlar havada asılı kalıyor" (31 Tmz)
  // ══════════════════════════════════════════════════════════════════════════
  // KÖK NEDEN: menü/garaj/karusel aracı GÖVDE MERKEZİNDEN konumlandırıyordu
  // (`translate(W/2, showY)`), gölge ise SABİT `showY + 24`'e çiziliyordu.
  // Ama aracın görsel alt kenarı tekere göre değişir: yerel uzayda
  // `max(teker.y + teker.r)` ÖLÇÜLDÜ → **23 px (hovercar) … 66 px (monster)**,
  // yani **43 px yayılım**. Sabit gölgeye göre alt kenarı sığ olan araçlar
  // (formula 26 · racecar 29 · scooter 29 · gokart 30 …) havada duruyordu.
  // ▶ Artık araç TEKERLERİNDEN zemine oturtulur: taban çizgisi sabit, araç
  //   ona göre kaydırılır. Büyük tekerli araçlarda görüntü DEĞİŞMEZ (zaten
  //   yakındılar), küçük tekerliler yere iner.
  // ⚠ Ölçek `_drawMenuCar` içindeki ile AYNI formülle hesaplanmalı
  //   (`min(2.8, hedefGenislik / def.w)`), yoksa taban kayar.
  // ⚠ Ski/hover/leg tekerleri HARİÇ: onlar zaten yere değmez (kızak/hava yastığı).
  _aracTabani(def, hedefGenislik) {
    try {
      if (!def) return 0;
      const wl = def.wheels || def.wheelPositions || [];
      let alt = 0, bulundu = false;
      for (let i = 0; i < wl.length; i++) {
        const w = wl[i];
        if (!w || w.isSki || w.isHover || w.isLeg) continue;
        const a = (w.y || 0) + (w.r || w.radius || 20);
        if (!bulundu || a > alt) { alt = a; bulundu = true; }
      }
      if (!bulundu) alt = (def.h || def.height || 40) * 0.5;   // tekersiz → gövde yarısı
      const olcek = Math.min(2.8, (hedefGenislik > 0 ? hedefGenislik : 240) /
                                  Math.max(def.w || def.width || 100, 1));
      return alt * olcek;
    } catch (e) { return 0; }
  },
  // Hex'i k oranında karart (kapalı satırın şeridi bağırmasın). Hep #rrggbb döner.
  _karart(hex, k) {
    try {
      const s = String(hex).replace('#', '');
      if (s.length !== 6) return hex;
      const n = parseInt(s, 16);
      const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
      const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    } catch (e) { return hex; }
  },
  // Hex → rgba(...) (alfa gereken yerler için)
  _hexA(hex, a) {
    try {
      const s = String(hex).replace('#', '');
      if (s.length !== 6) return hex;
      const n = parseInt(s, 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    } catch (e) { return hex; }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚡ PERF(31 Tmz) — KANVAS DİKDÖRTGENİ ÖNBELLEĞİ (ZORUNLU YENİDEN DÜZEN AVI)
  // ═══════════════════════════════════════════════════════════════════════════
  // `getBoundingClientRect()` **senkron yeniden düzen (forced reflow)** tetikler:
  // tarayıcı o an bekleyen tüm stil/düzen işini bitirmeden değeri veremez.
  // ÖLÇÜLDÜ: dokunmatik kaydırma/karusel `touchmove` başına 1 çağrı vardı.
  // 120 Hz telefonda sürükleme sırasında saniyede **120 zorunlu yeniden düzen**
  // demek — hem de tuval her karede yeniden boyandığı için düzen hep "kirli".
  // ▶ Kanvas dikdörtgeni kaydırma/dokunma sırasında DEĞİŞMEZ (tam ekran, sabit
  //   konumlu). Bir kez okunur, `_rectBoz()` ile geçersiz kılınır.
  // 🔴 `main.js _resize()` bu fonksiyonu ÇAĞIRMALI — çağırmazsa cihaz döndürünce
  //   dokunma koordinatları eski ölçekte kalır.
  _rectOnb: null,
  _cvRect() {
    if (this._rectOnb) return this._rectOnb;
    const cv = this.canvas;
    if (!cv || !cv.getBoundingClientRect) return { left: 0, top: 0, width: 1, height: 1, sx: 1, sy: 1 };
    const r = cv.getBoundingClientRect();
    this._rectOnb = {
      left: r.left, top: r.top, width: r.width, height: r.height,
      sx: (r.width  > 0) ? cv.width  / r.width  : 1,
      sy: (r.height > 0) ? cv.height / r.height : 1
    };
    return this._rectOnb;
  },
  _rectBoz() { this._rectOnb = null; },

  // ── Init ──────────────────────────────────────────────────────────────────
  init(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    // Kaydırma/döndürme dikdörtgeni bozar; sayfa kaydırması bu oyunda yok ama
    // adres çubuğu hareketi `scroll` üretir → önbelleği düşür (ucuz, olay başına).
    try {
      const boz = () => this._rectBoz();
      window.addEventListener('scroll', boz, { passive: true });
      window.addEventListener('resize', boz, { passive: true });
      window.addEventListener('orientationchange', boz, { passive: true });
      document.addEventListener('fullscreenchange', boz);
      // Mobilde adres çubuğu hareketi YALNIZ visualViewport olayını tetikleyebilir.
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', boz);
        window.visualViewport.addEventListener('scroll', boz);
      }
    } catch (e) {}
    this._initPts();
    const ids = Object.keys(VehicleDefs);
    const sel = SaveData.get('selectedVehicle') || 'jeep';
    this._carVehIdx = this._carVehTarget = Math.max(0, ids.indexOf(sel));

    // Touch/mouse drag for carousels
    this._bindCarouselInput(canvas);
  },

  // 🔴 KARUSEL SÜRÜKLEME (28 Tmz'de yeniden yazıldı) ─────────────────────────
  //   ESKİ HÂLİN ÜÇ HATASI vardı ve "yanlış yerlere tıklanıyor" şikâyetinin
  //   büyük kısmı buradan geliyordu:
  //     1. EŞİK YOKTU. Parmakta kaçınılmaz 3-10 px kayma bile `dx/140` ile
  //        seçili aracı/haritayı değiştiriyordu → kullanıcı bir butona basıyor,
  //        araç değişiyordu.
  //     2. `dragTarget` HİÇ SIFIRLANMIYORDU. Araç ekranından çıkıp başka bir
  //        ekrana geçince eski hedef ('veh') takılı kalıyor, oradaki sürüklemeler
  //        de aracı değiştiriyordu.
  //     3. `y` parametresi KULLANILMIYORDU: ekranın en üstüne/altına (ikon
  //        paneli, alt menü şeridi) dokunmak da karuseli sürüklüyordu.
  //   ▶ Artık: 10 px eşik · her başlangıçta hedef yeniden belirlenir ·
  //     yalnız ekranın ORTA ŞERİDİNDE (dikeyde %25-%75) sürükleme başlar.
  _bindCarouselInput(canvas) {
    let startX = 0, dragging = false, startIdx = 0, dragTarget = '';
    let esikAsildi = false;
    const ESIK = 10;   // px — altında sürükleme SAYILMAZ, tıklama olarak kalır

    // Canvas ölçeği (CSS boyutu ≠ iç çözünürlük olabilir)
    // ⚡ PERF(31 Tmz): `getBoundingClientRect()` doğrudan çağrılmıyor → `_cvRect()`
    //   önbelleği. Sürükleme sırasında kare başına 1 ZORUNLU YENİDEN DÜZEN idi.
    const olcek = () => this._cvRect();

    const onStart = (cx, cy) => {
      dragTarget = '';                 // her seferinde SIFIRLA (eski takılı kalmasın)
      esikAsildi = false;
      dragging = false;

      const o = olcek();
      const y = (cy - o.top) * o.sy;
      const h = canvas.height || 1;
      // Yalnız orta şeritte sürükleme başlat — üstteki ikon paneli ve alttaki
      // menü şeridi karuseli sürüklememeli.
      if (y < h * 0.25 || y > h * 0.75) return;

      startX = (cx - o.left) * o.sx;
      if (this.currentScreen === 'vehicles')       { startIdx = this._carVehTarget; dragTarget = 'veh'; dragging = true; }
      else if (this.currentScreen === 'mapselect') { startIdx = this._carMapTarget; dragTarget = 'map'; dragging = true; }
    };

    const onMove = (cx) => {
      if (!dragging || !dragTarget) return;
      const o = olcek();
      const x = (cx - o.left) * o.sx;
      const dx = x - startX;
      if (!esikAsildi) {
        if (Math.abs(dx) < ESIK) return;   // küçük kayma → tıklama olarak kalsın
        esikAsildi = true;
        this._kaydiriliyor = true;         // handleClick bu tıklamayı yutar
      }
      const ids = Object.keys(VehicleDefs);
      const maps = this._mapList();
      if (dragTarget === 'veh') {
        this._carVehTarget = Math.max(0, Math.min(ids.length - 1, startIdx - dx / 140));
      } else if (dragTarget === 'map') {
        this._carMapTarget = Math.max(0, Math.min(maps.length - 1, startIdx - dx / 140));
      }
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      if (esikAsildi) {
        if (dragTarget === 'veh') this._carVehTarget = Math.round(this._carVehTarget);
        if (dragTarget === 'map') this._carMapTarget = Math.round(this._carMapTarget);
        setTimeout(() => { this._kaydiriliyor = false; }, 60);
      }
      dragTarget = '';
      esikAsildi = false;
    };

    canvas.addEventListener('mousedown',  e => onStart(e.clientX, e.clientY));
    canvas.addEventListener('mousemove',  e => { if (dragging) onMove(e.clientX); });
    canvas.addEventListener('mouseup',    onEnd);
    canvas.addEventListener('touchstart', e => { const t = e.touches[0]; onStart(t.clientX, t.clientY); }, { passive: true });
    canvas.addEventListener('touchmove',  e => { const t = e.touches[0]; onMove(t.clientX); },            { passive: true });
    canvas.addEventListener('touchend',   onEnd, { passive: true });
  },

  _mapList() {
    return [
      { id:'countryside', name:'COUNTRYSIDE', col:'#1a5c0a', col2:'#2d8a20', dist:'∞' },
      { id:'desert',      name:'DESERT',        col:'#6a3a08', col2:'#cc7018', dist:'∞' },
      { id:'winter',      name:'WINTER',     col:'#0a2a5a', col2:'#2060cc', dist:'∞' },
      { id:'beach',       name:'BEACH',        col:'#0a3060', col2:'#1070c0', dist:'∞' },
      { id:'mountains',   name:'MOUNTAINS',      col:'#2a3050', col2:'#5060a0', dist:'∞' },
      { id:'city',        name:'CITY',         col:'#1a1a38', col2:'#4040a0', dist:'∞' },
      { id:'arctic',      name:'ARCTIC',        col:'#080e28', col2:'#1040a0', dist:'∞' },
      { id:'jungle',      name:'JUNGLE',         col:'#0a280a', col2:'#1a6018', dist:'∞' },
      { id:'mars',        name:'MARS',          col:'#3a0c04', col2:'#9a3010', dist:'∞' },
      { id:'cave',        name:'CAVE',        col:'#080408', col2:'#301818', dist:'∞' },
      { id:'highland',    name:'HIGHLAND',        col:'#182818', col2:'#3a7030', dist:'∞' },
      { id:'swamp',       name:'SWAMP',       col:'#0a1808', col2:'#2a4a18', dist:'∞' },
      { id:'volcano',     name:'VOLCANO',      col:'#300808', col2:'#881808', dist:'∞' },
      { id:'underwater',  name:'UNDERWATER',   col:'#040c28', col2:'#0828a0', dist:'∞' },
      { id:'moon',        name:'MOON',            col:'#181828', col2:'#505060', dist:'∞' },
      { id:'neon_city',   name:'NEON CITY',    col:'#0a0020', col2:'#4400cc', dist:'∞' },
      { id:'wasteland',   name:'WASTELAND',         col:'#2a1808', col2:'#6a3a08', dist:'∞' },
      { id:'canyon',      name:'CANYON',        col:'#3a1804', col2:'#883018', dist:'∞' },
      { id:'otoyol',     name:'HIGHWAY 🏁',      col:'#1a1a1a', col2:'#555555', dist:'∞' },
      { id:'dag',        name:'MOUNTAIN ⛰️ HARD',     col:'#20242e', col2:'#5a554f', dist:'∞' },
      { id:'hotwheels',  name:'HOT WHEELS 🔥',  col:'#e85d04', col2:'#ff7a1a', dist:'∞' },
      { id:'construction',  name:'CONSTRUCTION 🏗️', col:'#5c5c46', col2:'#9a9a78', dist:'∞' },
      { id:'blizzard',      name:'BLIZZARD ❄️',     col:'#7c8ca8', col2:'#f4f8ff', dist:'∞' },
      { id:'candy',         name:'CANDY LAND 🍬',   col:'#d95fa0', col2:'#ff8fc7', dist:'∞' },
      { id:'toxic',         name:'TOXIC SWAMP ☢️',  col:'#1c561c', col2:'#3aa83a', dist:'∞' },
      { id:'rollercoaster', name:'ROLLERCOASTER 🎢',col:'#7c1020', col2:'#d0203f', dist:'∞' },
      { id:'skyland',      name:'SKYLAND 🌤️',       col:'#2a6ab0', col2:'#5aa0e0', dist:'∞' },
      { id:'sakura',       name:'SAKURA 🌸',        col:'#c2185b', col2:'#f48fb1', dist:'∞' },
      { id:'graveyard',    name:'GRAVEYARD 🪦',     col:'#3a3450', col2:'#7a6a9a', dist:'∞' },
      { id:'carnival',     name:'CARNIVAL 🎪',      col:'#c02060', col2:'#e5487f', dist:'∞' },
      { id:'windmill',     name:'WINDMILL 🌷',      col:'#c0562a', col2:'#e8734a', dist:'∞' },
      { id:'bamboo',       name:'BAMBOO 🎋',        col:'#2e7a44', col2:'#4a9e5c', dist:'∞' },
      { id:'lava_river',   name:'LAVA RIVER 🌋',    col:'#6b2010', col2:'#e0541a', dist:'∞' },
      { id:'crystal_cave', name:'CRYSTAL CAVE 💎',  col:'#2a1a5a', col2:'#7a5ad0', dist:'∞' },
      { id:'cyber_grid',   name:'CYBER GRID 🌐',    col:'#063030', col2:'#18d0b0', dist:'∞' },
      { id:'autumn',       name:'AUTUMN 🍂',        col:'#7a3a10', col2:'#d07a2a', dist:'∞' },
      { id:'glacier',      name:'GLACIER 🧊',       col:'#2a6a8a', col2:'#8cd0ee', dist:'∞' },
      { id:'savanna',      name:'SAVANNA 🦁',       col:'#8a6a1a', col2:'#e0b85a', dist:'∞' },
      { id:'ruins',        name:'ANCIENT RUINS 🏛️', col:'#6b5c40', col2:'#c2a878', dist:'∞' },
      { id:'mushroom',     name:'MUSHROOM 🍄',      col:'#5a2a6a', col2:'#c05ad0', dist:'∞' },
      { id:'stormpeak',    name:'STORM PEAK ⛈️',    col:'#2a2838', col2:'#6a68a0', dist:'∞' },
      { id:'rainbow_road',    name:'RAINBOW ROAD 🌈',    col:'#a03080', col2:'#ff5aa0', dist:'∞' },
      { id:'sandstorm',       name:'SANDSTORM 🌪️',       col:'#8a5f2a', col2:'#c8934a', dist:'∞' },
      { id:'crystal_forest',  name:'CRYSTAL FOREST 💠',  col:'#182e46', col2:'#5ad8ff', dist:'∞' },
      { id:'desert_oasis',    name:'DESERT OASIS 🏝️',    col:'#a07a2e', col2:'#d8b45a', dist:'∞' },
      { id:'junkyard',        name:'JUNKYARD 🗑️',        col:'#3e362a', col2:'#8a7a58', dist:'∞' },
      { id:'cyberpunk_roofs', name:'CYBERPUNK ROOFS 🌃', col:'#0e1322', col2:'#b02bff', dist:'∞' },
      { id:'cloud_kingdom',   name:'CLOUD KINGDOM ☁️',   col:'#5a8ac0', col2:'#b8d0ee', dist:'∞' },
      { id:'meteor_field',    name:'METEOR FIELD ☄️',    col:'#221e2e', col2:'#7a6ab0', dist:'∞' },
      { id:'firefly_forest',  name:'FIREFLY FOREST ✨',  col:'#1a2e20', col2:'#2a4a30', dist:'∞' },
      { id:'aurora_peak',     name:'AURORA PEAK 🌌',     col:'#0a1838', col2:'#5affb4', dist:'∞' }
    ];
  },

  // ── Particles ─────────────────────────────────────────────────────────────
  _initPts() {
    const W = this.canvas ? this.canvas.width : 400;
    const H = this.canvas ? this.canvas.height : 700;
    this._pts = [];
    for (let i = 0; i < 70; i++) this._pts.push(this._newPt(W, H, true));
  },
  _newPt(W, H, rnd) {
    const t = Math.random();
    return {
      x: Math.random() * W, y: rnd ? Math.random() * H : H + 4,
      vx: (Math.random() - 0.5) * 0.4, vy: -(0.3 + Math.random() * 1.0),
      r: 0.5 + Math.random() * 2.2, life: 0, maxLife: 0.5 + Math.random() * 0.5,
      col: t < 0.5 ? '#FF3D00' : t < 0.8 ? '#FF8800' : '#FFD700'
    };
  },
  _updatePts(dt) {
    const W = this.canvas.width, H = this.canvas.height;
    for (let i = this._pts.length - 1; i >= 0; i--) {
      const p = this._pts[i];
      p.x += p.vx; p.y += p.vy; p.life += dt * 0.28;
      if (p.life > p.maxLife || p.y < -5) this._pts[i] = this._newPt(W, H, false);
    }
    while (this._pts.length < 70) this._pts.push(this._newPt(W, H, true));
  },

  // ── Draw dispatch ─────────────────────────────────────────────────────────
  draw(dt) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    this.animTime += dt;
    this._lastDt = dt;   // exposed for per-frame easing (e.g. map-select smooth scroll)

    this._updatePts(dt);
    for (let i = this._toasts.length - 1; i >= 0; i--) {
      this._toasts[i].life -= dt;
      if (this._toasts[i].life <= 0) this._toasts.splice(i, 1);
    }
    // Smooth carousel animation
    // TUNING(31 Tmz) — `Math.min(1, dt*10)` KARE HIZINA BAĞLIYDI: 30 fps'te
    // yarı hızda, 144 fps'te aşırı hızlı akıyordu (aynı hareket farklı cihazda
    // farklı hissediliyordu). Üstel yumuşatma kare hızından bağımsızdır.
    const _cdt = Math.max(0.001, Math.min(0.05, dt || 0.016));
    const _carK = 1 - Math.exp(-9 * _cdt);
    this._carVehIdx += (this._carVehTarget - this._carVehIdx) * _carK;
    this._carMapIdx += (this._carMapTarget - this._carMapIdx) * _carK;
    // Mikro-hareket kesme: hedefe oturunca tam otur (sonsuz yaklaşma olmasın)
    if (Math.abs(this._carVehTarget - this._carVehIdx) < 0.001) this._carVehIdx = this._carVehTarget;
    if (Math.abs(this._carMapTarget - this._carMapIdx) < 0.001) this._carMapIdx = this._carMapTarget;

    // 🌊 Yumuşak kaydırma (31 Tmz) — kayıtlı tüm kaydırıcıları ilerlet.
    // ⚠ `_KAYDIRMALI` dalından ÖNCE olmalı: o dal `return` ediyor.
    try { this._kaydirmaTick(_cdt); } catch (e) {}

    // ── YENİ HCR2 EKRANLARI (3 Ağu) — ana/garaj/parcaGaraj/cups/yarisLobi ────
    //   🔴 `_KAYDIRMALI`'ya EKLENMEZ: `cups` ve `parcaGaraj` KENDİ kaydırmasını
    //     tutar (`EkranCups._kay` / `EkranGaraj._kay`), `ana` ve `yarisLobi`
    //     zaten her boyutta sığar. İkisi birden olursa kaydırma üst üste biner.
    //   ⚠ `_KAYDIRMALI` dalından ÖNCE gelir: `cup` -> `cups` yönlendirmesinden
    //     sonra bile eski `cup` girdisi listede duruyor (modül yoksa yedek yol).
    if (this._yeniEkranCiz(ctx, W, H, dt)) {
      this._sandikKaplama(ctx, W, H, dt);
      this._drawToasts(ctx, W, H);
      this._drawGecisEfektleri(ctx, W, H, dt);
      return;
    }

    // Kendi kaydırması OLMAYAN ekranlar genel sarmalayıcıdan geçer (28 Tmz).
    const _kaydAd = this._KAYDIRMALI[this.currentScreen];
    if (_kaydAd && typeof this[_kaydAd] === 'function') {
      this._kaydirmaliCiz(ctx, W, H, this.currentScreen, this[_kaydAd]);
      this._sandikKaplama(ctx, W, H, dt);
      this._drawToasts(ctx, W, H);
      this._drawGecisEfektleri(ctx, W, H, dt);
      return;
    }

    // ── KLAN SİSTEMİ (2 Ağu) — 8 ekran tamamen `KlanUI`'ye devredilir ────────
    //   🔴 `_KAYDIRMALI`'ya EKLENMEZ: 8 ekranın da KENDİ kaydırması var
    //     (`KlanUI._kay`, `KlanUI.kaydirmaBagla()` merkezî yumuşatmaya bağlar).
    //     İkisi birden olursa kaydırma üst üste biner (28 Tmz'de ölçüldü).
    //   ⚠ Buton kutuları `UI.buttons`'a AKTARILIR — ölçüm/tarama araçları
    //     (`dogrula-tasma.js`, mobil taramalar) yalnız `UI.buttons` okuyor.
    //     TIKLAMA yolu yine `KlanUI.tikla()` (bkz. `handleClick`), çünkü
    //     `veri` alanı (renk/üye/kutu kimliği) yalnız orada taşınıyor.
    if (typeof KlanUI !== 'undefined' && KlanUI.EKRANLAR &&
        KlanUI.EKRANLAR.indexOf(this.currentScreen) >= 0) {
      KlanUI.ciz(ctx, W, H, this.currentScreen, this._lastDt);
      this.buttons = KlanUI.butonlar(this.currentScreen);
      this._sandikKaplama(ctx, W, H, dt);
      this._drawToasts(ctx, W, H);
      this._drawGecisEfektleri(ctx, W, H, dt);
      return;
    }

    switch (this.currentScreen) {
      case 'splash':       this.drawSplash(ctx, W, H);       break;
      case 'intro':        if (typeof Intro !== 'undefined') Intro.draw(ctx, W, H, this._lastDt); break;
      // Mobil ikon paneli menünün ÜSTÜNE çizilir (28 Tmz).
      case 'menu':         this.drawMenu(ctx, W, H);
                           if (this._ikonMenuAcik) this._drawIkonPanel(ctx, W, H);
                           break;
      // ── ETKİNLİKLER (3 Ağu) — alt navın 4. sekmesi ────────────────────────
      //   🔴 `_KAYDIRMALI`'ya EKLENMEZ: `Etkinlikler` modülünün KENDİ kaydırması
      //     var; ikisi birden olursa kaydırma üst üste biner (28 Tmz'de ölçüldü).
      case 'etkinlikler':  this.drawEtkinlikler(ctx, W, H); break;
      case 'campaign':     if (typeof Campaign !== 'undefined')     Campaign.draw(ctx, W, H);     break;
      // ÜLKE SEÇİMİ (31 Tmz) — 193 BM ülkesi, bayraklar kodla çizilir.
      case 'ulke':         if (typeof Ulke !== 'undefined')         Ulke.draw(ctx, W, H);         break;
      case 'tuning':       if (typeof Tuning !== 'undefined')       Tuning.draw(ctx, W, H);       break;
      case 'seasonevents': if (typeof SeasonEvents !== 'undefined') SeasonEvents.draw(ctx, W, H); break;
      case 'mprooms':      if (typeof MPRooms !== 'undefined')      MPRooms.drawLobby(ctx, W, H); break;
      case 'cardcollection': if (typeof CardCollection !== 'undefined') CardCollection.draw(ctx, W, H); break;
      case 'luckwheel':    if (typeof LuckWheel !== 'undefined')    LuckWheel.draw(ctx, W, H, this._lastDt); break;
      case 'profile':      if (typeof Profile !== 'undefined')      Profile.draw(ctx, W, H);      break;
      case 'replay':       if (typeof Replay !== 'undefined')       Replay.draw(ctx, W, H);       break;
      case 'shopoffers':   if (typeof ShopOffers !== 'undefined')   ShopOffers.draw(ctx, W, H);   break;
      case 'powermodes':   if (typeof PowerModes !== 'undefined')   PowerModes.draw(ctx, W, H);   break;
      case 'paintshop':    if (typeof PaintShop !== 'undefined')    PaintShop.draw(ctx, W, H, this._lastDt); break;
      case 'dailyquests':  if (typeof DailyQuests !== 'undefined')  DailyQuests.draw(ctx, W, H, this._lastDt); break;
      case 'skilltree':    if (typeof SkillTree !== 'undefined')    SkillTree.draw(ctx, W, H, this._lastDt); break;
      case 'statspanel':   if (typeof StatsPanel !== 'undefined')   StatsPanel.draw(ctx, W, H, this._lastDt); break;
      case 'prestigescr':  if (typeof Prestige !== 'undefined')     Prestige.draw(ctx, W, H, this._lastDt); break;
      case 'blackmarket':  if (typeof BlackMarket !== 'undefined')  BlackMarket.draw(ctx, W, H, this._lastDt); break;
      case 'chests':       this.drawChests(ctx, W, H);       break;
      case 'seasonpass':   this.drawSeasonPass(ctx, W, H);   break;
      case 'multiplayer':  this.drawMultiplayer(ctx, W, H);  break;
      case 'environment':  this.drawEnvironment(ctx, W, H);  break;
      case 'missions':     this.drawMissions(ctx, W, H);     break;
      case 'rewards':      this.drawRewards(ctx, W, H);      break;
      case 'vip':          this.drawVIP(ctx, W, H);          break;
      case 'league':       this.drawLeague(ctx, W, H);       break;
      case 'market':       this.drawMarket(ctx, W, H);       break;
      case 'spin':         this.drawSpinWheel(ctx, W, H);     break;
      case 'vehicles':     this.drawVehicles(ctx, W, H);     break;
      case 'customize':    this.drawCustomize(ctx, W, H);    break;
      case 'mapselect':    this.drawMapSelect(ctx, W, H);    break;
      case 'garage':       this.drawGarage(ctx, W, H);       break;
      case 'gameover':     this.drawGameOver(ctx, W, H, window._lastRunStats); break;
      case 'achievements': this.drawAchievements(ctx, W, H); break;
      case 'settings':     this.drawSettings(ctx, W, H);     break;
      case 'stats':        this.drawStats(ctx, W, H);        break;
      case 'career':       this.drawCareer(ctx, W, H);       break;
      case 'cup':          this.drawCup(ctx, W, H);          break;
      case 'team':         this.drawTeam(ctx, W, H);         break;
      case 'shop':         this.drawShop(ctx, W, H);         break;
      case 'rankings':     this.drawRankings(ctx, W, H);     break;
    }
    this._sandikKaplama(ctx, W, H, dt);
    this._drawToasts(ctx, W, H);
    this._drawGecisEfektleri(ctx, W, H, dt);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  YENİ HCR2 EKRANLARI (3 Ağu) — `js/ekran-*.js` bağlaması
  // ══════════════════════════════════════════════════════════════════════════
  //   Dört modül `index.html`'de `etkinlikler.js`'ten SONRA yüklenir
  //   (ekran-sandik.js parça ikonlarını `EkranGaraj`'dan okuduğu için
  //    ekran-garaj.js'ten SONRA gelmek ZORUNDA).
  //
  //   🔴 Her erişim `typeof X !== 'undefined'` ile korunur (bare global; bunlar
  //     `window.X` üzerinden DE var ama `_yeniMod()` tek kapı olarak kullanılır).
  //     Modül yüklenmemişse `_yeniEkranCiz` false döner ve `goTo()` yönlendirmesi
  //     de devreye girmez → oyun ESKİ ekrana düşer, ÇÖKMEZ.
  //
  //   ⚠ `EkranGaraj` KENDİ üst şeridini (para) ve KENDİ GERİ/BAŞLA butonlarını
  //     çizer → ona çerçeve UYGULANMAZ. `EkranAna` / `EkranCups` ise
  //     `icerikAlani()` ile üst şerit + alt nav bandını BOŞ bırakır; o iki bandı
  //     `_ekranCerceve()` doldurur (yoksa geri dönüş yolu OLMAZDI).
  _YENI_EKRAN: {
    ana: 'EkranAna',
    garaj: 'EkranGaraj', parcaGaraj: 'EkranGaraj',
    cups: 'EkranCups',   yarisLobi: 'EkranCups'
  },
  _EKRAN_BASLIK: { ana: 'HOME', cups: 'CUPS', yarisLobi: 'RACE' },

  // Alt navigasyon — `drawMenu` ile AYNI 8 kimlik (kopya değil, tek liste
  // burada; menü kendi çizimini yapar). Kimlikler `_menuEylem`e gider.
  _EKRAN_NAV: [
    { id: 'garage',      icon: '🔧', label: 'GARAGE' },
    { id: 'mapselect',   icon: '🗺️', label: 'MAPS'   },
    { id: 'cup',         icon: '🏆', label: 'CUPS'   },
    { id: 'etkinlikler', icon: '🎉', label: 'EVENT'  },
    { id: 'chests',      icon: '🎁', label: 'CHESTS' },
    { id: 'shop',        icon: '🛒', label: 'SHOP'   },
    { id: 'klan',        icon: '🛡️', label: 'CLAN'   },
    { id: 'rankings',    icon: '🏅', label: 'RANK'   }
  ],

  _yeniMod(ad) {
    try {
      if (ad === 'EkranAna')    return (typeof EkranAna    !== 'undefined') ? EkranAna    : null;
      if (ad === 'EkranGaraj')  return (typeof EkranGaraj  !== 'undefined') ? EkranGaraj  : null;
      if (ad === 'EkranCups')   return (typeof EkranCups   !== 'undefined') ? EkranCups   : null;
      if (ad === 'EkranSandik') return (typeof EkranSandik !== 'undefined') ? EkranSandik : null;
    } catch (e) {}
    return null;
  },

  // Şu anki ekran yeni modüllerden birine mi ait? -> modül nesnesi | null
  _yeniEkranMod(ekran) {
    const ad = this._YENI_EKRAN[ekran || this.currentScreen];
    return ad ? this._yeniMod(ad) : null;
  },

  _yeniEkranCiz(ctx, W, H, dt) {
    const s = this.currentScreen;
    const ad = this._YENI_EKRAN[s];
    if (!ad) return false;
    const M = this._yeniMod(ad);
    if (!M) return false;                       // modül yok → eski yola devam
    this._yeniKaydirmaBagla();
    try { if (typeof M.hazir === 'function') M.hazir(); } catch (e) {}
    try {
      if (ad === 'EkranAna') { M.ciz(ctx, W, H, this._lastDt); this.buttons = M.butonlar() || []; }
      else                   { M.ciz(ctx, W, H, s, this._lastDt); this.buttons = M.butonlar(s) || []; }
    } catch (e) { this.buttons = []; }
    if (ad !== 'EkranGaraj') {
      try { this._ekranCerceve(ctx, W, H, s, M); } catch (e) {}
    }
    return true;
  },

  // Üst şerit (GERİ + başlık + para) ve alt navigasyon.
  // 🔴 Buton kutuları `this.buttons`'a MODÜL butonlarından SONRA eklenir; iki
  //   küme çakışmaz (modül `icerikAlani()` dışına hiçbir şey koymaz).
  _ekranCerceve(ctx, W, H, ekran, M) {
    let A = null;
    try { A = (M && typeof M.icerikAlani === 'function') ? M.icerikAlani(W, H) : null; } catch (e) { A = null; }
    const ust = Math.max(28, Math.round((A && A.ust) || Math.max(44, Math.min(64, H * 0.075))));
    const alt = Math.max(28, Math.round((A && A.alt) || Math.max(44, Math.min(72, H * 0.095))));

    // ── ÜST ŞERİT ──────────────────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = '#0e1422'; ctx.fillRect(0, 0, W, ust);
    ctx.fillStyle = '#ffb020'; ctx.fillRect(0, ust - 2, W, 2);

    const gb = Math.max(44, Math.min(58, ust - 4));
    const gy = Math.max(0, Math.round((ust - gb) / 2));
    ctx.fillStyle = '#26314a';
    ctx.beginPath(); ctx.roundRect(5, gy, gb, gb, 8); ctx.fill();
    ctx.fillStyle = '#dbe6ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(gb * 0.5) + 'px Arial';
    ctx.fillText('‹', 5 + gb / 2, gy + gb / 2, gb - 6);
    this.buttons.push({ id: 'ekr_geri', x: 5, y: gy, w: gb, h: gb });

    // Başlık — İNGİLİZCE anahtar; i18n kancası çevirir.
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold ' + Math.round(Math.max(12, Math.min(20, Math.min(ust * 0.42, W * 0.05)))) + 'px Arial';
    const _bas = this._EKRAN_BASLIK[ekran] || '';
    ctx.fillText(_bas, W / 2, ust / 2, Math.max(20, W * 0.34));

    // Para — sağ üst (altın + elmas)
    let _gold = 0, _dia = 0;
    try {
      const SD = (typeof SaveData !== 'undefined') ? SaveData : null;
      if (SD && SD.data) { _gold = Math.floor(SD.data.gold || 0); _dia = Math.floor(SD.data.diamonds || 0); }
    } catch (e) {}
    ctx.font = 'bold ' + Math.round(Math.max(9, Math.min(13, ust * 0.26))) + 'px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd24a';
    ctx.fillText('⧆ ' + _gold, W - 8, ust * 0.32, Math.max(24, W * 0.26));
    ctx.fillStyle = '#5fd8ff';
    ctx.fillText('◆ ' + _dia, W - 8, ust * 0.72, Math.max(24, W * 0.26));
    ctx.restore();

    // ── ALT NAVİGASYON ─────────────────────────────────────────────────────
    // 🔴 Dokunma hedefi ≥ 44 px: hücre genişliği W/n ile sınırlı. Sığmayan
    //   öğeler SONDAN düşer; hepsi `menu` ekranındaki 8'li navdan (GERİ ile bir
    //   tık ötede) ve ikon panelinden hâlâ ulaşılabilir → ölü ekran YOK.
    const _tam = this._EKRAN_NAV;
    const n = Math.max(3, Math.min(_tam.length, Math.floor(W / 44)));
    const navY = H - alt, iw = W / n;
    ctx.save();
    ctx.fillStyle = '#0a0f1c'; ctx.fillRect(0, navY, W, alt);
    ctx.fillStyle = '#ffb020'; ctx.fillRect(0, navY, W, 2);
    const _etiketVar = alt >= 50;
    const _ikonPx = Math.round(Math.max(14, Math.min(24, Math.min(alt * 0.36, iw * 0.42))));
    const _etPx  = Math.round(Math.max(7, Math.min(10, Math.min(alt * 0.15, iw * 0.17))));
    for (let i = 0; i < n; i++) {
      const it = _tam[i], bx = i * iw;
      const cx = bx + iw / 2;
      if (i > 0) { ctx.fillStyle = '#1b2233'; ctx.fillRect(bx, navY + alt * 0.18, 1, alt * 0.64); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = _ikonPx + 'px Arial'; ctx.fillStyle = '#ffffff';
      ctx.fillText(it.icon, cx, navY + alt * (_etiketVar ? 0.40 : 0.52), iw - 4);
      if (_etiketVar) {
        ctx.font = 'bold ' + _etPx + 'px Arial'; ctx.fillStyle = '#9fb4d8';
        ctx.fillText(it.label, cx, navY + alt * 0.78, iw - 4);
      }
      this.buttons.push({ id: it.id, x: bx, y: navY, w: iw, h: alt });
    }
    ctx.restore();
  },

  // Kaydırma: `cups` ızgarası + `parcaGaraj` envanteri. Merkezî yumuşatmaya
  // (28 ara kare + fırlatma ataleti) bedavaya bağlanır. Bir kez bağlanır.
  _yeniKaydirmaBagla() {
    if (this._yeniKayBagli) return;
    if (!this.canvas || typeof this._dokunmatikKaydirma !== 'function') return;
    this._yeniKayBagli = true;
    const self = this;
    const kur = function (ekran, modAd) {
      const M0 = self._yeniMod(modAd);
      if (!M0) return;
      self._dokunmatikKaydirma('yeniekr_' + ekran,
        function () { return self.currentScreen === ekran; },
        function () {
          const M = self._yeniMod(modAd);
          if (!M) return null;
          const H = self.canvas ? self.canvas.height : 640;
          let ust = 0, alt = 0;
          try { const A = M.icerikAlani ? M.icerikAlani(self.canvas.width, H) : null; if (A) { ust = A.ust; alt = A.alt; } } catch (e) {}
          return { viewH: Math.max(60, H - ust - alt), viewTop: ust,
                   maxScroll: Math.max(0, Number(M._maxKay) || 0) };
        },
        function () { const M = self._yeniMod(modAd); return M ? (Number(M._kay) || 0) : 0; },
        function (v) {
          const M = self._yeniMod(modAd);
          if (!M || typeof M.kaydirma !== 'function') return;
          M.kaydirma(ekran, (Number(v) || 0) - (Number(M._kay) || 0));   // delta API
        });
    };
    kur('cups', 'EkranCups');
    kur('parcaGaraj', 'EkranGaraj');
  },

  // ── SANDIK AÇILIŞ KAPLAMASI (3 Ağu) ──────────────────────────────────────
  //   🔴 KAPLAMA: hangi ekranda olursak olalım, `draw()`ın EN SONUNDA çizilir
  //     ve `handleClick`in EN BAŞINDA sorulur. `aktif()` "kaplama açık mı"
  //     demektir ("animasyon oynuyor mu" DEĞİL) — sonuç aşamasında da true.
  _sandikKaplama(ctx, W, H, dt) {
    const S = this._yeniMod('EkranSandik');
    if (!S) return;
    let acik = false;
    try { acik = S.aktif() === true; } catch (e) { return; }
    if (!acik) return;
    try {
      S.ciz(ctx, W, H, this._lastDt);
      const b = S.butonlar();
      this.buttons = Array.isArray(b) ? b.slice() : [];   // altındaki ekrana tıklama SIZMAZ
    } catch (e) {}
  },

  // Ödül listesini animasyonla göster. Boş liste gelirse AÇMAZ (sözleşme).
  sandikAc(oduller, kaynak) {
    const S = this._yeniMod('EkranSandik');
    if (!S || !oduller || !oduller.length) return false;
    try { S.baslat(oduller, kaynak || ''); } catch (e) { return false; }
    let a = false;
    try { a = S.aktif() === true; } catch (e) { a = false; }
    return a;
  },

  // Geçiş fade + ripple — hem normal hem kaydırmalı yoldan çağrılır.
  _drawGecisEfektleri(ctx, W, H, dt) {
    // ── Ekran geçiş fade (yumuşak giriş) ──
    if (this._transT > 0) {
      this._transT = Math.max(0, this._transT - dt);
      const a = this._transT / 0.26;
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = '#05060c';
      ctx.fillRect(0, 0, W, H);
      // hafif yukarı kayma hissi için üstte parlak şerit
      ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#ffb020';
      ctx.fillRect(0, H * (1 - a) - 2, W, 3);
      ctx.restore();
    }

    // ── Tıklama ripple efekti ──
    if (this._ripple && this._ripple.t < 0.4) {
      this._ripple.t += dt;
      const p = this._ripple, k = p.t / 0.4;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + k * 34, 0, 6.28); ctx.stroke();
      ctx.restore();
    }
  },

  // ── GENEL SAYFA KAYDIRMA (28 Tmz) ─────────────────────────────────────────
  //
  //   SORUN: aşağıdaki 14 ekranın hiçbirinde kaydırma YOKTU. Dikey telefonda
  //   sığıyorlardı ama YATAY telefonda (H≈360-412) içeriğin 76-210 px'i ekranın
  //   ALTINDA kalıyor ve o kartlara ULAŞMANIN HİÇBİR YOLU yoktu
  //   (ör. chests: 7 kart × 72 px = 592 px; 360 px ekranda 3 kart görünmez).
  //
  //   ÇÖZÜM: ekranların çizim kodu HİÇ DEĞİŞMEDEN sarmalanır:
  //     1. arka plan + başlık şeridi bir kez KAYMADAN çizilir,
  //     2. ekranın kendi `_drawScreenBg/_drawHeader/_drawBackBtn` çağrıları
  //        geçici olarak boşa alınır (yoksa kayınca altta boşluk kalırdı),
  //     3. içerik bölgesi kırpılıp -sc kadar kaydırılarak ekran çizdirilir,
  //     4. bu çizimde kaydedilen buton kutuları da -sc kaydırılır
  //        (⚠ bu OLMAZSA tıklama görünenden farklı yere gider — madde 29'un
  //         aynısı olurdu),
  //     5. başlık + geri butonu ÜSTE yeniden çizilir (sabit kalır).
  //
  //   İçerik yüksekliği butonların en altından ÖLÇÜLÜR → düzen kodu bilinmeden
  //   çalışır. İlk karede maxScroll 0'dır, ikinci kareden itibaren doğrudur;
  //   düzen deterministik olduğu için gözle görülmez.
  //
  //   ⚠ Kendi kaydırması OLAN ekranlar (garage/shop/settings/stats/career/
  //     mapselect) bu listeye EKLENMEZ — iki kaydırma üst üste biner.
  _KAYDIRMALI: {
    chests: 'drawChests', rewards: 'drawRewards', vip: 'drawVIP',
    spin: 'drawSpinWheel', environment: 'drawEnvironment', missions: 'drawMissions',
    market: 'drawMarket', league: 'drawLeague', cup: 'drawCup', team: 'drawTeam',
    rankings: 'drawRankings', multiplayer: 'drawMultiplayer',
    seasonpass: 'drawSeasonPass', achievements: 'drawAchievements',
    customize: 'drawCustomize'
  },

  _kaydirmaliCiz(ctx, W, H, ad, ciz) {
    const UST = 56;                                  // sabit başlık şeridi
    this._sayfaKay = this._sayfaKay || {};
    const st = this._sayfaKay[ad] || (this._sayfaKay[ad] = { sc: 0, maxScroll: 0, viewH: 0 });
    st.viewH = Math.max(40, H - UST);
    st.sc = Math.max(0, Math.min(st.maxScroll, st.sc || 0));
    const sc = st.sc;

    this._ensureSayfaKaydirma();

    // 1) Arka plan + başlık — kaymadan, bir kez
    this._drawScreenBg(ctx, W, H, this._sayfaBgRenk[ad] || 'rgba(68,221,255,0.18)');

    // 2) Ekranın kendi kabuk çizimlerini boşa al
    const _bg = this._drawScreenBg, _hd = this._drawHeader, _bk = this._drawBackBtn;
    let baslik = '';
    const bos = function () {};
    this._drawScreenBg = bos;
    this._drawHeader   = function (c, w, metin) { baslik = metin; };
    this._drawBackBtn  = bos;

    // 3) İçeriği kırp + kaydır
    ctx.save();
    ctx.beginPath(); ctx.rect(0, UST, W, H - UST); ctx.clip();
    ctx.translate(0, -sc);
    try { ciz.call(this, ctx, W, H); }
    finally {
      ctx.restore();
      this._drawScreenBg = _bg; this._drawHeader = _hd; this._drawBackBtn = _bk;
    }

    // 4) Buton kutularını aynı miktarda kaydır + içerik yüksekliğini ölç
    let alt = 0;
    const b = this.buttons;
    for (let i = 0; i < b.length; i++) {
      if (b[i].id === 'back') continue;              // geri butonu sabit şeritte
      b[i].y -= sc;
      const gercekAlt = b[i].y + b[i].h + sc;        // kaydırmasız koordinat
      if (gercekAlt > alt) alt = gercekAlt;
      // Başlık şeridinin altında kalan butonlar tıklanamaz olmalı
      if (b[i].y + b[i].h < UST) { b[i].y = -9999; }
    }
    st.maxScroll = Math.max(0, Math.round(alt + 14 - H));
    if (st.sc > st.maxScroll) st.sc = st.maxScroll;

    // 5) Başlık + geri butonu üste
    if (baslik) {
      ctx.save();
      ctx.fillStyle = 'rgba(6,9,18,0.92)'; ctx.fillRect(0, 0, W, UST - 2);
      ctx.restore();
      _hd.call(this, ctx, W, baslik);
    }
    _bk.call(this, ctx);
    // Kaydırma göstergesi
    if (st.maxScroll > 0) {
      const trkH = H - UST - 8, thH = Math.max(26, trkH * (st.viewH / (st.viewH + st.maxScroll)));
      const thY = UST + 4 + (trkH - thH) * (sc / st.maxScroll);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(W - 5, UST + 4, 3, trkH, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(0,204,255,0.55)';
      ctx.beginPath(); ctx.roundRect(W - 5, thY, 3, thH, 1.5); ctx.fill();
    }
  },

  // Ekran başına arka plan vurgusu (sarmalayıcı kendi çizdiği için gerekli)
  _sayfaBgRenk: {
    chests: 'rgba(255,180,40,0.22)', rewards: 'rgba(68,221,255,0.20)',
    vip: 'rgba(255,215,0,0.22)', spin: 'rgba(255,120,220,0.20)',
    environment: 'rgba(120,255,160,0.18)', missions: 'rgba(255,160,60,0.20)',
    market: 'rgba(120,220,255,0.18)', league: 'rgba(255,200,60,0.20)',
    cup: 'rgba(255,215,0,0.20)', team: 'rgba(120,180,255,0.18)',
    rankings: 'rgba(0,204,255,0.20)', multiplayer: 'rgba(180,120,255,0.20)',
    seasonpass: 'rgba(255,120,60,0.20)', achievements: 'rgba(255,215,0,0.18)',
    customize: 'rgba(170,34,255,0.20)'
  },

  _ensureSayfaKaydirma() {
    this._dokunmatikKaydirma('sayfa',
      () => !!(this._KAYDIRMALI[this.currentScreen]),
      () => (this._sayfaKay && this._sayfaKay[this.currentScreen]) || null,
      () => (this._sayfaKay[this.currentScreen] || {}).sc || 0,
      (v) => { if (this._sayfaKay[this.currentScreen]) this._sayfaKay[this.currentScreen].sc = v; }
    );
  },

  // ── SPLASH ────────────────────────────────────────────────────────────────
  drawSplash(ctx, W, H) {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#04040a'); bg.addColorStop(1, '#0a080e');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Animated diagonal speed lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255,61,0,0.035)'; ctx.lineWidth = 1;
    const t = this.animTime * 28;
    for (let i = 0; i < 18; i++) {
      const ox = ((i * 93 + t) % (W + H)) - H;
      ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox + H, H); ctx.stroke();
    }
    ctx.restore();

    // Fire particles
    for (const p of this._pts) {
      const a = (1 - p.life / p.maxLife) * 0.6;
      if (a <= 0) continue;
      ctx.globalAlpha = a; ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bottom glow
    const glow = ctx.createLinearGradient(0, H * 0.55, 0, H);
    glow.addColorStop(0, 'rgba(255,61,0,0)'); glow.addColorStop(1, 'rgba(200,10,0,0.18)');
    ctx.fillStyle = glow; ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Edge vignette for cinematic depth
    const vig = ctx.createRadialGradient(W/2, H*0.42, Math.min(W, H)*0.25, W/2, H*0.42, Math.max(W, H)*0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    const lY = H * 0.28;
    const pulse = 0.5 + Math.abs(Math.sin(this.animTime * 0.9)) * 0.5;

    // Soft breathing halo behind the title block
    const halo = ctx.createRadialGradient(W/2, lY + 20, 10, W/2, lY + 20, W*0.55);
    halo.addColorStop(0, 'rgba(255,80,20,' + (0.10 + pulse * 0.08) + ')');
    halo.addColorStop(0.5, 'rgba(255,40,0,0.05)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, lY - 90, W, 240);

    // Accent bars
    ctx.fillStyle = this.C.fire;
    ctx.fillRect(W * 0.12, lY - 64, W * 0.76, 3);
    ctx.fillRect(W * 0.12, lY + 86, W * 0.76, 2);

    // "Ahmet"
    ctx.save();
    ctx.shadowColor = '#FF3D00'; ctx.shadowBlur = 22 + pulse * 14;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.floor(W * 0.095) + 'px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Ahmet', W / 2, lY - 10);
    ctx.restore();

    // "RACING 2"
    ctx.save();
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 28 + pulse * 18;
    const rg = ctx.createLinearGradient(W / 2 - 150, 0, W / 2 + 150, 0);
    rg.addColorStop(0, '#FF8800'); rg.addColorStop(0.4, '#FF3D00');
    rg.addColorStop(0.7, '#FFD700'); rg.addColorStop(1, '#FF8800');
    ctx.fillStyle = rg;
    ctx.font = 'bold ' + Math.floor(W * 0.132) + 'px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('RACING 2', W / 2, lY + 46);
    ctx.restore();

    // Car silhouette
    ctx.save();
    ctx.translate(W / 2, lY + 120);
    ctx.globalAlpha = 0.55;
    this._drawSimpleCarSilhouette(ctx, 'jeep', 0.62);
    ctx.restore();
    ctx.globalAlpha = 1;

    // PLAY button (with animated shine sweep)
    const tapY = H * 0.67;
    const bw   = Math.min(W * 0.74, 330);
    const btnX = W / 2 - bw / 2;
    this._drawFireBtn(ctx, btnX, tapY, bw, 60, '▶  START PLAYING');
    ctx.save();
    ctx.beginPath(); ctx.roundRect(btnX, tapY, bw, 60, 3); ctx.clip();
    const sweep = ((this.animTime * 0.5) % 1) * (bw + 80) - 40;
    const swg = ctx.createLinearGradient(btnX + sweep - 30, tapY, btnX + sweep + 30, tapY);
    swg.addColorStop(0, 'rgba(255,255,255,0)'); swg.addColorStop(0.5, 'rgba(255,255,255,0.28)'); swg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = swg; ctx.fillRect(btnX + sweep - 30, tapY, 60, 60);
    ctx.restore();

    const sbY = tapY + 74, sbW = (bw - 10) / 2;
    this._drawDarkBtn(ctx, W / 2 - bw / 2, sbY, sbW, 44, '★  ACHIEVEMENTS');
    this._drawDarkBtn(ctx, W / 2 + 5,       sbY, sbW, 44, '⚙  SETTINGS');

    // Version
    ctx.fillStyle = 'rgba(200,210,255,0.15)'; ctx.font = '10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('AHMET Clone  v3.0', W / 2, H - 8);

    this.buttons = [
      { id:'play',         x: W/2 - bw/2, y: tapY, w: bw,  h: 60 },
      { id:'achievements', x: W/2 - bw/2, y: sbY,  w: sbW, h: 44 },
      { id:'settings',     x: W/2 + 5,    y: sbY,  w: sbW, h: 44 }
    ];
  },

  // ── MAIN MENU ─────────────────────────────────────────────────────────────
  drawMenu(ctx, W, H) {
    const t = Number.isFinite(this.animTime) ? this.animTime : (this.animTime = 0);
    const rm = this._menuReducedMotion();      // erişilebilirlik: hareketi sakinleştir
    const mt = rm ? 0 : t;                      // dekoratif hareket saati (rm iken donuk)
    this.buttons = [];

    // ── Responsive dikey yerleşim (yatay-öncelikli; kısa ekranda taşma/kayma yok) ──
    // Alt bar + OYNA yüksekliği H'ye göre ölçeklenir → sabit pikselden kaynaklı kayma biter.
    const _R = (typeof Responsive !== 'undefined') ? Responsive
             : { isLandscape: W >= H, isTablet() { return false; }, ui: 1 };
    // 🔴 ALT NAV 6 → 8 ÖĞE (3 Ağu). Dokunma hedefi asgarisi 44 px.
    //   Tek sıra hücre genişliği = W/8. 44 px eşiği W = 352 px'e denk gelir
    //   (360 px'te 45,0 px — geçer; 320 px'te 40,0 px — GEÇMEZ).
    //   ▶ W < 352 iken 4+4 iki sıraya geçilir; hücre 8 satır yerine 4 olur
    //     (320 px'te 80,0 px). İki sıra alt barı yükseltir, bu yüzden
    //     `_navH` BURADA hesaplanır → `_rowY`/`_playY` kendiliğinden uyar.
    //   ⚠ Test edilen 8 telefon boyutunun HEPSİ W ≥ 360 → iki sıra devreye
    //     GİRMEZ, PLAY butonu ve üstündeki içerik hiç kaymaz (ölçüldü).
    const _NAV_N  = 8;
    const _navH0  = Math.round(Math.max(46, Math.min(_R.isTablet() ? 92 : 80, H * (_R.isLandscape ? 0.155 : 0.112))));
    const _navIki = (W / _NAV_N) < 44;
    const _navH   = _navIki ? Math.round(_navH0 * 1.72) : _navH0;
    const _playH  = Math.round(Math.max(44, Math.min(_R.isTablet() ? 66 : 58, H * 0.12)));
    const _playGap= Math.round(Math.max(8, Math.min(18, H * 0.028)));
    const _rowY   = H - _navH;                  // alt navigasyon üst kenarı
    const _playY  = _rowY - _playGap - _playH;  // OYNA üst kenarı (alt barın hemen üstünde)
    // İkon paneli konumu (aşağıda doldurulur) — araba bunun altına yerleşir, çakışmaz.
    let _gridBottomY = H * 0.18, _gridPanelLeft = W;

    // ── Golden-hour arcade sky (layered depth) ──
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0,    '#1f7fc4');
    sky.addColorStop(0.32, '#33a6e4');
    sky.addColorStop(0.58, '#8ad4f2');
    sky.addColorStop(0.82, '#eaf6ff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Warm horizon bloom behind the hills (golden-hour glow → atmosferik derinlik)
    const _horY = H * 0.60;
    const _hg = ctx.createLinearGradient(0, _horY - H * 0.24, 0, _horY + 10);
    _hg.addColorStop(0, 'rgba(255,214,140,0)'); _hg.addColorStop(1, 'rgba(255,196,96,0.42)');
    ctx.fillStyle = _hg; ctx.fillRect(0, _horY - H * 0.24, W, H * 0.24 + 10);

    // Sun with layered bloom + slow soft rays
    const sunX = W * 0.82, sunY = H * 0.15;
    const sg = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 108);
    sg.addColorStop(0, 'rgba(255,249,205,0.98)'); sg.addColorStop(0.38, 'rgba(255,224,120,0.45)'); sg.addColorStop(1, 'rgba(255,224,120,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, 108, 0, Math.PI * 2); ctx.fill();
    if (!rm) {
      ctx.save(); ctx.translate(sunX, sunY); ctx.rotate(mt * 0.06);
      ctx.strokeStyle = 'rgba(255,238,170,0.16)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      for (let r = 0; r < 12; r++) {
        const a = r / 12 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 34, Math.sin(a) * 34); ctx.lineTo(Math.cos(a) * 66, Math.sin(a) * 66); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = '#fff2ab'; ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, Math.PI * 2); ctx.fill();

    // Drifting clouds
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (let i = 0; i < 4; i++) {
      const cx = ((mt * (7 + i * 3) + i * 240) % (W + 220)) - 110;
      const cy = H * (0.09 + i * 0.07), s = 0.8 + (i % 2) * 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy, 18 * s, 0, Math.PI * 2);
      ctx.arc(cx + 20 * s, cy + 4, 14 * s, 0, Math.PI * 2);
      ctx.arc(cx - 20 * s, cy + 4, 14 * s, 0, Math.PI * 2);
      ctx.arc(cx, cy + 8, 22 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant hazy ridge — depth layer between sky and the play hills
    ctx.fillStyle = 'rgba(120,170,150,0.32)';
    ctx.beginPath(); ctx.moveTo(0, H * 0.62);
    for (let x = 0; x <= W; x += 26) {
      const y = H * 0.54 - Math.sin((x + 120) * 0.006) * 16 - Math.sin(x * 0.017) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H * 0.62); ctx.closePath(); ctx.fill();

    // Floating light motes (hafif canlılık)
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const mx = (i * 71 + mt * (9 + (i % 3) * 5)) % W;
      const my = H * 0.12 + Math.sin(mt * 0.8 + i * 1.7) * 18 + i * 8;
      const ma = 0.10 + 0.08 * (0.5 + 0.5 * Math.sin(mt * 1.6 + i));
      ctx.globalAlpha = ma; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(mx, my, 1.6 + (i % 2), 0, 6.283); ctx.fill();
    }
    ctx.restore();

    // ── Parallax rolling hills (3 layers) ──
    const hill = (baseY, col, amp, off) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, baseY);
      for (let x = 0; x <= W; x += 18) {
        const y = baseY - Math.sin((x + off) * 0.008) * amp - Math.sin((x + off) * 0.021) * amp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    hill(H * 0.58, '#8fd35f', 22, mt * 6);
    hill(H * 0.64, '#62b53f', 26, mt * 11);
    hill(H * 0.71, '#3f8a2c', 30, mt * 18);
    ctx.fillStyle = '#347322'; ctx.fillRect(0, H * 0.71, W, H * 0.29);
    ctx.fillStyle = '#9a7442'; ctx.fillRect(0, H * 0.80, W, 16);
    // Checkered start-line accent on the dirt — subtle arcade-racing signal
    ctx.save(); ctx.globalAlpha = 0.32;
    const _ckW = 14, _ckY = H * 0.80;
    for (let _cxk = 0; _cxk < W; _cxk += _ckW) {
      ctx.fillStyle = (Math.floor(_cxk / _ckW) % 2 === 0) ? 'rgba(255,255,255,0.6)' : 'rgba(18,18,18,0.55)';
      ctx.fillRect(_cxk, _ckY, _ckW, 5);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, H * 0.80 + 16, W, 4);

    // Speed-energy streaks rushing past the hero (guarded / calmed by reduced motion)
    this._menuSpeedLines(ctx, W, H, t, rm);

    // ── ⚙ AYARLAR — SOL ÜST (3 Ağu, kullanıcı isteği) ──────────────────────
    //   Eskiden 26 ikonluk ızgaranın İLK hücresiydi; ızgara kaldırıldığı için
    //   ayarlara ulaşmanın TEK yolu bu buton. 44×44 = asgari dokunma hedefi.
    //   ⚠ `id:'settings'` DEĞİŞMEZ — `main.js` bu eylemi zaten biliyor.
    const _stS = 44, _stX = 8, _stY = 8;
    const _stG = ctx.createLinearGradient(_stX, _stY, _stX, _stY + _stS);
    _stG.addColorStop(0, 'rgba(34,46,78,0.94)'); _stG.addColorStop(1, 'rgba(14,20,38,0.94)');
    ctx.fillStyle = _stG;
    ctx.beginPath(); ctx.roundRect(_stX, _stY, _stS, _stS, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,176,32,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(_stX + 0.75, _stY + 0.75, _stS - 1.5, _stS - 1.5, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.roundRect(_stX + 2, _stY + 2, _stS - 4, _stS * 0.42, 9); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '22px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚙', _stX + _stS / 2, _stY + _stS / 2 + 1);
    this.buttons.push({ id: 'settings', x: _stX, y: _stY, w: _stS, h: _stS });

    // ── 🏠 ANA EKRAN + 🛠️ ESKİ GARAJ — ⚙'nın ALTINA (3 Ağu) ────────────────
    //   🔴 BU İKİ BUTON OLMAZSA İKİ EKRAN DA ULAŞILAMAZ:
    //     · `js/etkinlikler.js` KENDİ 25 ikonluk listesini tutuyor; `ui.js`
    //       `_ikonListesi` yalnız modül YÜKLENMEZSE kullanılan yedektir.
    //       Yani yeni girdiyi oraya eklemek gerçek ekranda görünmez.
    //     · `garage` artık `EkranGaraj`'a yönleniyor; nitro alımı / parça
    //       mağazası / sarf malzemesi YALNIZ eski garajda yaşıyor.
    //   Konum: logonun sol kenarı W*0.19 (390'da 74 px) → x=8..52 BOŞ.
    //   Para hapları SAĞ üstte → çakışma yok (ölçüldü, 8 boyut).
    //   Modül yoksa buton HİÇ ÇİZİLMEZ (ölü hitbox bırakma kuralı).
    const _ekKisayol = [];
    if (typeof EkranAna !== 'undefined' && EkranAna) _ekKisayol.push({ id: 'ana', e: '🏠' });
    _ekKisayol.push({ id: 'garage_eski', e: '🛠️' });
    for (let _ki = 0; _ki < _ekKisayol.length; _ki++) {
      const _ky = _stY + (_ki + 1) * (_stS + 6);
      if (_ky + _stS > H - 8) break;                  // çok kısa ekranda çizme
      ctx.fillStyle = _stG;
      ctx.beginPath(); ctx.roundRect(_stX, _ky, _stS, _stS, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,176,32,0.30)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(_stX + 0.75, _ky + 0.75, _stS - 1.5, _stS - 1.5, 12); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '20px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(_ekKisayol[_ki].e, _stX + _stS / 2, _ky + _stS / 2 + 1);
      this.buttons.push({ id: _ekKisayol[_ki].id, x: _stX, y: _ky, w: _stS, h: _stS });
    }

    // ── Currency HUD pills — SAĞ ÜSTE YASLI (3 Ağu, 2. tur) ────────────────
    //   🔴 İLK DENEME YANLIŞTI VE PNG'DE YAKALANDI. Haplar önce x=8'deydi, ayar
    //     butonu gelince x=60'a kaydırıldı — ama orası **AHMET kelime-markasının
    //     ALTI**. Skia ile ölçüldü (390×844): marka x=106..284, haplar x=60..293
    //     → **179 px örtüşme (%77)**; elmas ve hurda TAMAMEN okunmuyordu,
    //     320 px'te altın miktarı bile kayboluyordu. Marka haplardan SONRA
    //     çizildiği için z-sırası da onları örtüyordu.
    //   ▶ ÇÖZÜM: haplar **sağ üste** yaslandı. Orası 26 ikonluk ızgara
    //     kaldırıldığı için tamamen boş; marka ortada, ayar solda, para sağda.
    //     Kullanıcının "para birimlerini yana kaydır" isteği de bu.
    //   🔴 Dar ekranda sığmazsa önce HURDA gizlenir, sonra font 12→10 px'e iner.
    //     Altın ve elmas HER ZAMAN görünür (kural).
    //   ⚠ Yeni bir üst-şerit öğesi eklersen ÖNCE `kanit-anamenu.js` ile marka
    //     örtüşmesini ölç — bu hata göz kararıyla fark edilmiyordu.
    //   🔴 NEDEN DİKEY İSTİF: ölçüldü — 3 hap YATAY 233 px + ortadaki logo
    //     178 px + ayar 44 px + boşluklar = **455 px**. 390 px'lik telefona tek
    //     satırda FİZİKSEL OLARAK SIĞMIYOR. Sağa yaslamak da yetmedi (135 px
    //     örtüşme kaldı). Logo ORTADA olduğu için tek boş bölge sağ kenar:
    //     genişliği `W/2 - 97` (390'da 98 px · 360'ta 83 · 320'de 63).
    //     ▶ Haplar sağ kenara **alt alta** dizilir; her biri o bölgeye sığar.
    const _pilY = _stY + (_stS - 26) / 2;          // ayar butonuyla dikey ortalı
    const _pilX0 = _stX + _stS + 8;                // haplar için EN SOL sınır
    const gold = SaveData.get('gold') || 0, dia = SaveData.get('diamonds') || 0, scrap = SaveData.getScrap ? SaveData.getScrap() : 0;
    const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n.toLocaleString();
    const _pilT = [fmt(gold), String(dia), fmt(scrap)];
    // Logonun sağ kenarı: `_lw = max(60, W*0.62)` ile kelepçeli, ORTALI çizilir.
    // Ölçülen gerçek genişlik bundan dar olabilir; güvenli üst sınır alınır.
    const _logoSag = W / 2 + Math.min(W * 0.31, 89) + 8;
    const _pilAlan = Math.max(46, W - 8 - _logoSag);   // sağ kenardaki boş şerit
    let _pilF = 12;
    const _pilW = (f) => {
      ctx.font = 'bold ' + f + 'px Arial';
      return _pilT.map(s => 22 + ctx.measureText(s).width + 10);
    };
    let _pw = _pilW(_pilF);
    // En geniş hap şeride sığmıyorsa fontu 12 → 10 → 9'a indir (metin ayrıca
    // `maxWidth` ile de korunur; hiçbir koşulda taşmaz).
    if (Math.max.apply(null, _pw) > _pilAlan) { _pilF = 10; _pw = _pilW(_pilF); }
    if (Math.max.apply(null, _pw) > _pilAlan) { _pilF = 9; _pw = _pilW(_pilF); }
    const _pilN = 3;                                   // üçü de her zaman görünür
    const _pilGen = Math.min(_pilAlan, Math.max.apply(null, _pw));  // ortak genişlik
    const pill = (y, icon, txt, ic, w) => {
      const x = W - 8 - w;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(x, y, w, 26, 13); ctx.fill();
      ctx.fillStyle = ic; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (_pilF + 1) + 'px Arial';
      ctx.fillText(icon, x + 7, y + 13);
      ctx.fillStyle = '#fff'; ctx.font = 'bold ' + _pilF + 'px Arial';
      ctx.fillText(txt, x + 21, y + 13, w - 26);
      return y + 26 + 5;
    };
    const _pilIco = ['⧆', '◆', '◈'], _pilCol = ['#ffcf3f', '#4fd0ff', '#9fe0a0'];
    let py = _pilY;
    for (let _p = 0; _p < _pilN; _p++) py = pill(py, _pilIco[_p], _pilT[_p], _pilCol[_p], _pilGen);
    // ÖLÇÜM KANCASI — `port-araclari/olc-anamenu.js` ve `kanit-anamenu.js` bunu
    // OKUR (çakışma/taşma kanıtı göz kararıyla değil SAYIYLA verilsin diye).
    // Oyun mantığı kullanmaz.
    this._olcPara = { x0: W - 8 - _pilGen, y: _pilY, h: 26, n: _pilN, font: _pilF,
                      sag: W - 8, ayarSag: _stX + _stS, enSolSinir: _pilX0,
                      dikey: true, genislik: _pilGen, alan: _pilAlan, logoSag: _logoSag,
                      alt: py - 5 };

    // ── ETKİNLİKLER LİSTESİ (3 Ağu) — ARTIK ANA MENÜDE ÇİZİLMEZ ─────────────
    //   🔴 Kullanıcı isteği: 26 ikonluk ızgara paneli ana menüden KALDIRILDI
    //     ("bu özellikler ekranda çok yer kaplıyo"). Hepsi alt navdaki
    //     ETKİNLİKLER sekmesinden açılır (`js/etkinlikler.js`), `settings`
    //     ise sol üstteki ⚙ butonuna taşındı (yukarıda).
    //   ⚠ Liste SİLİNMEDİ: `_drawIkonPanel` yedek ekranı (Etkinlikler modülü
    //     yüklenmemişse) bu diziyi kullanır → hiçbir ekran ULAŞILAMAZ olmaz.
    //   ⚠ Buton kutusu ARTIK EKLENMİYOR — görünmeyen yere tıklanmasın (ölü hitbox).
    const _icons = [
      // 🔴 YENİ HCR2 EKRANLARI (3 Ağu) — ikon paneline EKLENMEZSE ULAŞILAMAZ.
      //   `ana`        : yeni HCR2 ana ekranı (rütbe + sandık + görev + YARIŞ)
      //   `garage_eski`: ESKİ garaj. `garage` artık `EkranGaraj`'a yönleniyor
      //     ama nitro alımı / parça mağazası / sarf malzemesi YALNIZ eski
      //     ekranda var → o ekran ölmesin diye ayrı giriş bırakıldı.
      { id:'ana',         e:'🏠', l:'ANA EKRAN' },
      { id:'garage_eski', e:'🛠️', l:'ESKİ GARAJ' },
      { id:'settings',    e:'⚙',  l:'AYAR'    },
      { id:'profile',     e:'👤', l:'PROFİL'  },
      { id:'campaign',    e:'📖', l:'SEFER'   },
      { id:'openworld',   e:'🌍', l:'DÜNYA'   },
      { id:'mprooms',     e:'🏁', l:'ODA'     },
      { id:'powermodes',  e:'⏱️', l:'GÜÇ'     },
      { id:'cardcollection', e:'🃏', l:'KART'  },
      { id:'luckwheel',   e:'🎡', l:'ÇARK'    },
      { id:'tuning',      e:'🔧', l:'TUNE'    },
      { id:'seasonevents',e:'🏆', l:'SEZON'   },
      { id:'shopoffers',  e:'🔥', l:'FIRSAT'  },
      { id:'paint',       e:'🎨', l:'BOYA'     },
      { id:'daily',       e:'📋', l:'GÜNLÜK'   },
      { id:'skills',      e:'🌳', l:'YETENEK'  },
      { id:'stats',       e:'📊', l:'İSTATİSTİK' },
      { id:'prestigescr', e:'⭐', l:'PRESTİJ'  },
      { id:'market2',     e:'🕯️', l:'KARABORSA' },
      { id:'replay',      e:'🎬', l:'TEKRAR'  },
      { id:'career',      e:'🎖️', l:'KARİYER' },
      { id:'missions',    e:'🎯', l:'GÖREV'   },
      { id:'environment', e:'🌦', l:'HAVA'    },
      { id:'ulke',        e:'🌍', l:'ÜLKE'    },
      // 🔴 KLAN (2 Ağu) — ikon paneline EKLENMEZSE ekrana ULAŞILAMAZ.
      //   `team` ekranı tam bu yüzden menüden erişilemez durumdaydı.
      { id:'klan',        e:'🛡️', l:'KLAN'    },
      { id:'multiplayer', e:'🌐', l:'ONLINE'  },
      { id:'seasonpass',  e:'🎫', l:'PASS'    },
      { id:'rewards',     e:'💎', l:'ÖDÜL'    }
    ];
    // Yalnızca yedek ekranın veri kaynağı olarak saklanır — ÇİZİM/BUTON YOK.
    this._ikonListesi = _icons;
    // Panel kalktığı için araç bandı üst sınırı yalnız para/ayar şeridine bağlı.
    _gridBottomY = Math.max(_gridBottomY, _stY + _stS + 6);

    // ── Araç bandı ÖNCE hesaplanır (31 Tmz): logo ona göre ölçeklenecek ──
    let showY = H * 0.52, _carScale = 1;
    if (_R.isLandscape) {
      const _bandTop = _gridBottomY + 6, _bandBot = _playY - 6;
      showY = (_bandTop + _bandBot) / 2;
      _carScale = Math.max(0.5, Math.min(1, (_bandBot - _bandTop) / 132));
    }

    // ── AHMET wordmark (bold characterful title + racing badge) ──
    // 🔴 BUGFIX(31 Tmz) — LOGO, ARAÇ İSİM PLAKASININ ÜSTÜNE BİNİYORDU.
    //   Logo SABİT `ly = 68` ve 46 px fontla çiziliyordu; blok ~45..104 px arası.
    //   Telefon yatayken (H≈335) araç bandının merkezi showY≈142, isim plakası
    //   `showY-72` = 70 px'te başlıyor → logo ile ÇAKIŞIYORDU (telefonda görüldü:
    //   "AHMET" yazısının üstünde "JEEP"/"YARIŞ CAR" plakası duruyor).
    //   ▶ Logo bloğu, plakanın üstünde KALAN boşluğa göre ölçeklenir.
    //     Blok yüksekliği ölçek s için: üst yarı 23s + rozet boşluğu 16s + rozet 20s.
    //     Üst kenarı 12 px'e sabitleyip alt kenarı plakanın 6 px üstünde tutuyoruz.
    //   ⚠ Boşluk çok azsa (s < 0.45) logo HİÇ ÇİZİLMEZ — tamamen dekoratif,
    //     oynanışı etkilemez; kısa yatay ekranda yer açmak okunabilirliği artırır.
    const _logoBosluk = (_R.isLandscape ? (showY - 76) : H * 0.30) - 18;
    const _ls = Math.max(0, Math.min(1, _logoBosluk / 59));
    if (_ls >= 0.45) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const _lf = Math.round(46 * _ls);
      const lx = W / 2, ly = Math.round(12 + 23 * _ls);
      const _font = '900 ' + _lf + 'px Impact, "Arial Black", sans-serif';
      const _lw = Math.max(60, W * 0.62);          // dar ekranda yatay taşma koruması
      // soft drop shadow pass for depth
      ctx.save();
      ctx.shadowColor = 'rgba(10,20,40,0.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.font = _font;
      ctx.lineWidth = 8 * _ls; ctx.strokeStyle = '#16264a'; ctx.strokeText('AHMET', lx, ly, _lw);
      ctx.restore();
      // crisp dark outline
      ctx.font = _font;
      ctx.lineWidth = 8 * _ls; ctx.strokeStyle = '#16264a'; ctx.strokeText('AHMET', lx, ly, _lw);
      // warm metallic fill
      const lgr = ctx.createLinearGradient(0, ly - 23 * _ls, 0, ly + 23 * _ls);
      lgr.addColorStop(0, '#fff2b0'); lgr.addColorStop(0.5, '#ffb020'); lgr.addColorStop(1, '#e8730a');
      ctx.fillStyle = lgr; ctx.fillText('AHMET', lx, ly, _lw);
      // secondary label as a premium racing badge (clear hierarchy, subordinate)
      ctx.font = 'bold ' + Math.max(8, Math.round(11 * _ls)) + 'px Arial';
      const _lbw = ctx.measureText('HILL RACING').width + 34 * _ls, _lbh = Math.round(20 * _ls);
      const _lbx = lx - _lbw / 2, _lby = ly + 16 * _ls;
      const _lbg = ctx.createLinearGradient(0, _lby, 0, _lby + _lbh);
      _lbg.addColorStop(0, 'rgba(20,30,54,0.92)'); _lbg.addColorStop(1, 'rgba(10,16,32,0.92)');
      ctx.fillStyle = _lbg; ctx.beginPath(); ctx.roundRect(_lbx, _lby, _lbw, _lbh, 10 * _ls); ctx.fill();
      ctx.strokeStyle = 'rgba(255,176,32,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(_lbx, _lby, _lbw, _lbh, 10 * _ls); ctx.stroke();
      ctx.fillStyle = '#ffcf3f'; ctx.textBaseline = 'middle';
      ctx.fillText('HILL RACING', lx, _lby + _lbh / 2 + 1, _lbw - 8);
    }

    // ── Hero vehicle (tap to change) ──
    const vehIds = Object.keys(VehicleDefs);
    let selVid = SaveData.get('selectedVehicle') || vehIds[0];
    if (VehicleDefs[vehIds[Math.round(this._carVehTarget)]]) selVid = vehIds[Math.round(this._carVehTarget)];
    ctx.save(); ctx.translate(W / 2, showY); ctx.scale(_carScale, _carScale); ctx.translate(-W / 2, -showY);
    const shad = ctx.createRadialGradient(W / 2, showY + 24, 6, W / 2, showY + 24, 95);
    shad.addColorStop(0, 'rgba(0,0,0,0.3)'); shad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shad; ctx.beginPath(); ctx.ellipse(W / 2, showY + 24, 95, 16, 0, 0, Math.PI * 2); ctx.fill();
    // podyum ışığı — hero aracı öne çıkaran yumuşak sıcak spot (arka planda)
    const _spot = ctx.createRadialGradient(W / 2, showY - 8, 8, W / 2, showY - 8, 128);
    _spot.addColorStop(0, 'rgba(255,214,140,0.30)'); _spot.addColorStop(0.6, 'rgba(255,196,96,0.10)'); _spot.addColorStop(1, 'rgba(255,196,96,0)');
    ctx.fillStyle = _spot; ctx.beginPath(); ctx.ellipse(W / 2, showY - 8, 128, 96, 0, 0, Math.PI * 2); ctx.fill();
    const bounce = Math.sin(t * 2.4) * 3;
    // 🔴 EKRANLA ÖLÇEKLENME (29 Tmz): burada `_drawMenuCar`'a hedef genişlik
    //   VERİLMİYORDU → araç her ekranda 240 px genişlikte çiziliyor, dar
    //   telefonda ekranı taşıyor ve isim/butonları eziyordu.
    //   `_carScale` yalnız DİKEY banda bakıyor, genişliği hiç hesaplamıyor.
    // 🔴 BUGFIX(31 Tmz) — MENÜ ARACI TELEFONDA DEV GİBİYDİ.
    //   Eski: `Math.min(240, W * 0.62)` — genişliğe bakıyor, YÜKSEKLİĞE HİÇ BAKMIYOR.
    //   Telefon yatayken H küçüktür (≈335 CSS px): 240 px genişlikteki araç
    //   ekran yüksekliğinin yarısından fazlasını kaplıyor, tavanı üst şeride
    //   giriyor ve MENÜ/OYNA butonlarını eziyordu.
    //   ▶ Yükseklik kısıtı eklendi. `_carScale` de ayrıca çarpıldığı için
    //     (satır ~918) burada H'ye göre kelepçelemek yeterli.
    const _menuAracW = Math.min(240, W * 0.62, H * 0.46);
    // 🛞 BUGFIX(31 Tmz) — araç artık TEKERLERİNDEN zemine oturur (bkz. `_aracTabani`).
    //   Eskiden gövde merkezi `showY`'ye konuyordu; gölge ise sabit `showY+24`'te.
    //   Aracın görsel alt kenarı 23…66 px arasında değiştiği için küçük tekerli
    //   araçlar gölgenin üstünde HAVADA duruyordu.
    const _zeminY = showY + 24;                                   // gölge/taban çizgisi
    const _tabanOfs = this._aracTabani(VehicleDefs[selVid], _menuAracW);
    ctx.save(); ctx.translate(W / 2, _zeminY - _tabanOfs + bounce);
    this._drawMenuCar(ctx, selVid, t, _menuAracW); ctx.restore();
    const vdef = VehicleDefs[selVid];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    const _npg = ctx.createLinearGradient(0, showY - 72, 0, showY - 48);
    _npg.addColorStop(0, 'rgba(20,16,6,0.82)'); _npg.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = _npg; ctx.beginPath(); ctx.roundRect(W / 2 - 80, showY - 72, 160, 24, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,207,63,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W / 2 - 79.5, showY - 71.5, 159, 23, 7); ctx.stroke();
    ctx.save(); ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 5;
    ctx.fillStyle = '#ffcf3f'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((vdef && vdef.name || '').toUpperCase(), W / 2, showY - 60);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = 'bold 34px Arial';
    ctx.fillText('‹', W / 2 - W * 0.20, showY); ctx.fillText('›', W / 2 + W * 0.20, showY);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.font = '9px Arial'; ctx.fillText('TAP TO CHANGE VEHICLE', W / 2, showY + 46);
    ctx.restore();
    // Dokunma alanları: ölçekli + sağ-üst ikon paneline TAŞMASIN (arabaya basınca prestij açılmasın).
    const _aOff = (W * 0.20) * _carScale;              // ok konumları (ölçekli)
    const _carHalf = (W * 0.22) * _carScale;
    let _carRight = W / 2 + _carHalf;
    if (_R.isLandscape) _carRight = Math.min(_carRight, _gridPanelLeft - 6);
    const _carLeft = Math.max(2, Math.min(W / 2 - _carHalf, _carRight - 14));
    this.buttons.push({ id: 'vehicles', x: _carLeft, y: showY - 46 * _carScale, w: _carRight - _carLeft, h: 96 * _carScale });
    this.buttons.push({ id: 'vehicles', x: W / 2 - _aOff - 30, y: showY - 26, w: 60, h: 52 });
    this.buttons.push({ id: 'vehicles', x: Math.min(W / 2 + _aOff - 30, _gridPanelLeft - 62), y: showY - 26, w: 60, h: 52 });

    // ── Primary CTA — the one unmistakable PLAY button (≥56px tall) ──
    const playW = Math.min(_R.isTablet() ? 460 : 300, W * 0.64), playX = W / 2 - playW / 2, playH = _playH, playY = _playY;
    const pulseP = rm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3);   // rm iken sabit, sakin nefes efekti
    ctx.save();
    ctx.shadowColor = 'rgba(30,220,90,' + (0.45 + pulseP * 0.35) + ')'; ctx.shadowBlur = 16 + pulseP * 12; ctx.shadowOffsetY = 4;
    const pgrad = ctx.createLinearGradient(0, playY, 0, playY + playH);
    pgrad.addColorStop(0, '#7cf39a'); pgrad.addColorStop(0.5, '#2fca5c'); pgrad.addColorStop(1, '#12933b');
    ctx.fillStyle = pgrad; ctx.beginPath(); ctx.roundRect(playX, playY, playW, playH, 16); ctx.fill();
    ctx.restore();
    // glossy top highlight
    ctx.save();
    ctx.beginPath(); ctx.roundRect(playX + 3, playY + 3, playW - 6, playH * 0.44, 12); ctx.clip();
    const _gloss = ctx.createLinearGradient(0, playY + 3, 0, playY + 3 + playH * 0.44);
    _gloss.addColorStop(0, 'rgba(255,255,255,0.5)'); _gloss.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = _gloss; ctx.fillRect(playX, playY, playW, playH);
    ctx.restore();
    // crisp double edge (dark outer + light inner)
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(playX, playY, playW, playH, 16); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(playX + 1.5, playY + 1.5, playW - 3, playH - 3, 14); ctx.stroke();
    // speed chevrons flanking the label — arcade thrust
    ctx.save();
    const _chA = 0.35 + (rm ? 0.12 : 0.25 * pulseP);
    ctx.strokeStyle = 'rgba(10,58,24,' + _chA + ')'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let _c = 0; _c < 3; _c++) {
      const _cxr = playX + playW - 24 - _c * 9;
      ctx.beginPath(); ctx.moveTo(_cxr, playY + playH / 2 - 7); ctx.lineTo(_cxr + 6, playY + playH / 2); ctx.lineTo(_cxr, playY + playH / 2 + 7); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#0a3a18'; ctx.font = '900 ' + Math.round(Math.max(19, Math.min(30, playH * 0.46))) + 'px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('▶  PLAY', W / 2 - 8, playY + playH / 2 + 1);
    this.buttons.push({ id: 'play', x: playX, y: playY, w: playW, h: playH });

    // ── Bottom menu row — 8 ÖĞE (3 Ağu, kullanıcı isteği) ───────────────────
    //   Sıra birebir kullanıcının tarifi:
    //     · ETKİNLİK "sandıklar ve kupaların arasına"
    //     · KLAN     "mağazayla sıranın yanına"
    //   ⚠ Etiketler İNGİLİZCE ANAHTAR olarak yazılır; `i18n.js` kancası çevirir
    //     ('EVENTS'→ETKİNLİKLER, 'CLAN'→KLAN). Türkçe yazarsan çeviri ÇALIŞMAZ.
    const items = [
      { id: 'garage',      icon: '🔧', label: 'GARAGE' },
      { id: 'mapselect',   icon: '🗺️', label: 'MAPS'   },
      { id: 'cup',         icon: '🏆', label: 'CUPS'   },
      // 🔴 'EVENTS' DEĞİL 'EVENT': Türkçesi 'ETKİNLİKLER' (11 harf) 45 px'lik
      //   hücreye ancak %72 yatay sıkıştırmayla sığıyordu (okunmuyordu).
      //   'EVENT' → 'ETKİNLİK' (8 harf) ≈ %98 → sıkışma YOK. Bölüm BAŞLIĞI
      //   yine "ETKİNLİKLER" (js/etkinlikler.js); bu yalnız sekme etiketi.
      { id: 'etkinlikler', icon: '🎉', label: 'EVENT'  },
      { id: 'chests',      icon: '🎁', label: 'CHESTS' },
      { id: 'shop',        icon: '🛒', label: 'SHOP'   },
      { id: 'klan',        icon: '🛡️', label: 'CLAN'   },
      { id: 'rankings',    icon: '🏅', label: 'RANK'   }
    ];
    // Dar ekranda 4+4 iki sıra (bkz. `_navIki`, yukarıda `_navH` ile hesaplandı).
    const _nCol = _navIki ? 4 : items.length;
    const _nRow = _navIki ? 2 : 1;
    const rowH = _navH, rowY = _rowY, iw = W / _nCol;
    const _cellH = rowH / _nRow;
    const _showLbl = _cellH >= 54;                     // çok kısa barda etiketi gizle
    const _navIcon = Math.round(Math.max(15, Math.min(26, Math.min(_cellH * 0.33, iw * 0.42))));
    const _chS = Math.min(iw * 0.78, Math.max(26, _cellH * 0.58));
    // 🔴 ETİKET FONTU HÜCRE GENİŞLİĞİNE DE BAĞLI: 8 öğede hücre 45 px'e iner,
    //   sabit 10 px font "ETKİNLİKLER"i taşırırdı. `maxWidth` ayrıca konur.
    const _lblF = Math.round(Math.max(7, Math.min(10, Math.min(_cellH * 0.12, iw * 0.17))));
    const _barG = ctx.createLinearGradient(0, rowY, 0, rowY + rowH);
    _barG.addColorStop(0, 'rgba(14,20,34,0.96)'); _barG.addColorStop(1, 'rgba(6,9,18,0.96)');
    ctx.fillStyle = _barG; ctx.fillRect(0, rowY, W, rowH);
    // glowing gold accent rail
    ctx.save(); ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffb020'; ctx.fillRect(0, rowY, W, 3); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, rowY + 3, W, 1);
    items.forEach((it, i) => {
      const _c = i % _nCol, _r = (i / _nCol) | 0;
      const _bx = _c * iw, _by = rowY + _r * _cellH;
      const cx = _bx + iw / 2;
      const _iconY = _showLbl ? _by + _cellH * 0.40 : _by + _cellH * 0.52;
      // subtle rounded icon backing chip
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.roundRect(cx - _chS / 2, _by + _cellH * 0.12, _chS, _cellH * (_showLbl ? 0.50 : 0.72), 9); ctx.fill();
      // thin divider between items
      if (_c > 0) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(_bx, _by + _cellH * 0.18, 1, _cellH * 0.64); }
      ctx.font = _navIcon + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(it.icon, cx, _iconY);
      if (_showLbl) {
        ctx.font = 'bold ' + _lblF + 'px Arial';
        ctx.fillStyle = 'rgba(220,230,255,0.9)'; ctx.textBaseline = 'bottom';
        ctx.fillText(it.label, cx, _by + _cellH - Math.max(4, _cellH * 0.09), iw - 4);
      }
      this.buttons.push({ id: it.id, x: _bx, y: _by, w: iw, h: _cellH });
    });
  },

  // ── MENU-only helpers (drawMenu) ───────────────────────────────────────────
  // Reduced-motion flag, fully guarded (Settings tanımsız/erişilemezse → false).
  _menuReducedMotion() {
    try {
      return (typeof Settings !== 'undefined' && Settings && typeof Settings.get === 'function'
              && Settings.get('reducedMotion') === true);
    } catch (e) { return false; }
  },

  // Atmospheric speed streaks around the hero; calmed (fewer + static) on reduced motion.
  _menuSpeedLines(ctx, W, H, t, rm) {
    ctx.save();
    const n = rm ? 3 : 7;
    const _t2 = Number.isFinite(t) ? t : 0;             // NaN koruması (kırmızı hata olmasın)
    const band = Math.max(1, H * 0.30);                 // % 0 → NaN olmasın
    for (let i = 0; i < n; i++) {
      const speed = 200 + (i % 3) * 120;
      const prog = rm ? (i + 0.5) / n : (((_t2 * speed + i * 137) % (W + 220)) / (W + 220));
      const x = -110 + prog * (W + 220);
      const y = H * 0.30 + ((i * 53) % band);
      const len = 44 + (i % 3) * 34;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;   // sonlu değilse çiz(me)
      const a = rm ? 0.05 : 0.12 * (0.55 + 0.45 * Math.sin((_t2 + i) * 2));
      const g = ctx.createLinearGradient(x, y, x + len, y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.restore();
  },

  // ── CHESTS ───────────────────────────────────────────────────────────────
  drawChests(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,180,40,0.22)');
    this._drawHeader(ctx, W, '🎁  CHESTS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const gold = SaveData.get('gold')||0, dia = SaveData.get('diamonds')||0, scrap = SaveData.getScrap ? SaveData.getScrap() : 0;
    this._drawCard(ctx, 14, 60, W-28, 24, { r:8, fill:['rgba(24,20,10,0.9)','rgba(14,12,8,0.9)'] });
    ctx.font='bold 12px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffcf3f';
    ctx.fillText('⧆ '+gold.toLocaleString()+'     ◆ '+dia+'     ◈ '+scrap, W/2, 72);

    // Reward reveal overlay
    if (this._chestReveal) {
      const r = this._chestReveal;
      ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(0,0,W,H);
      const cx=W/2, cy=H*0.38; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#ffd24a'; ctx.font='bold 18px Arial'; ctx.fillText('✦ CHEST OPENED ✦', cx, cy-96);
      const pop = 1 + Math.sin(this.animTime*6)*0.06;
      ctx.save(); ctx.translate(cx, cy-36); ctx.scale(pop,pop); ctx.font='64px Arial'; ctx.fillText('🎁', 0, 0); ctx.restore();
      let y=cy+34; ctx.font='bold 16px Arial';
      if (r.gold)     { ctx.fillStyle='#ffcf3f'; ctx.fillText('⧆  +'+r.gold+' GOLD', cx, y); y+=32; }
      if (r.diamonds) { ctx.fillStyle='#4fd0ff'; ctx.fillText('◆  +'+r.diamonds+' DIAMONDS', cx, y); y+=32; }
      if (r.scrap)    { ctx.fillStyle='#9fe0a0'; ctx.fillText('◈  +'+r.scrap+' SCRAP', cx, y); y+=32; }
      if (!r.gold && !r.diamonds && !r.scrap) { ctx.fillStyle='#aaa'; ctx.fillText('Empty this time!', cx, y); }
      const bw=160,bx=W/2-80,by=cy+128;
      this._drawSmallBtn(ctx,bx,by,bw,42,'✔ COLLECT', this.C.green);
      this.buttons.push({id:'chest_collect', x:bx, y:by, w:bw, h:42});
      return;
    }

    const today = new Date().toDateString();
    const dailyClaimed = SaveData.get('lastDailyChest') === today;
    const chests = [
      { id:'daily',    name:'DAILY CHEST',     col:'#00cc66', cost:'FREE',    desc:'Once per day — free rewards', dis:dailyClaimed, ic:'🎉' },
      { id:'bronze',   name:'BRONZE CHEST',    col:'#cd7f32', cost:'⧆ 2000',  desc:'Gold + Scrap', ic:'🎁' },
      { id:'silver',   name:'SILVER CHEST',    col:'#c0c0c0', cost:'⧆ 8000',  desc:'Gold + Scrap + Diamond chance', ic:'🎁' },
      { id:'gold',     name:'GOLD CHEST',      col:'#ffd700', cost:'◆ 8',     desc:'Big Gold + Diamonds + Scrap', ic:'🎁' },
      { id:'platinum', name:'PLATINUM CHEST',  col:'#7fe0ff', cost:'◆ 20',    desc:'Huge Gold + Diamonds + Scrap', ic:'🧊' },
      { id:'legendary',name:'LEGENDARY CHEST', col:'#ff8c42', cost:'◆ 45',    desc:'Legendary haul + big diamonds', ic:'🔥' },
      { id:'mythic',   name:'MYTHIC CHEST',    col:'#c56bff', cost:'◆ 90',    desc:'Mythic jackpot — max rewards', ic:'🌌' }
    ];
    const cardH=62, startY=88;
    chests.forEach((c,i)=>{
      const y=startY+i*(cardH+10);
      const ready = !c.dis;
      this._drawCard(ctx, 14, y, W-28, cardH, { r:12, accent:c.col, active:ready, glow:ready });
      // icon disk
      ctx.save();
      ctx.beginPath(); ctx.arc(52, y+cardH/2, 26, 0, 6.283);
      const ig = ctx.createRadialGradient(52, y+cardH/2-6, 4, 52, y+cardH/2, 28);
      ig.addColorStop(0, c.col+'55'); ig.addColorStop(1, 'rgba(0,0,0,0.2)');
      ctx.fillStyle = ig; ctx.fill();
      ctx.strokeStyle = c.col+'88'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      ctx.font='34px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff';
      ctx.fillText(c.ic, 52, y+cardH/2+1);
      ctx.fillStyle=c.col; ctx.font='bold 15px Arial'; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText(c.name, 90, y+20);
      ctx.fillStyle='rgba(190,200,235,0.72)'; ctx.font='10px Arial'; ctx.fillText(c.desc, 90, y+46);
      // MOBIL: buton yuksekligi 38 → 44 (parmak hedefi asgarisi). cardH 62 olduğu
      // için 44 rahat sığar (üstte/altta 9'ar px boşluk).
      const bh=44, bw=92,bx=W-14-bw-8,by=y+cardH/2-bh/2;
      if (c.dis) {
        ctx.fillStyle='rgba(70,72,84,0.4)'; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,8); ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,8); ctx.stroke();
        ctx.fillStyle='#888'; ctx.font='bold 10px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('CLAIMED', bx+bw/2, by+bh/2);
      } else {
        this._drawPill(ctx, bx, by, bw, bh, c.cost, c.col);
        this.buttons.push({id:'open_chest_'+c.id, x:bx, y:by, w:bw, h:bh});
      }
    });
  },

  // ── SEASON PASS ────────────────────────────────────────────────────────────
  drawSeasonPass(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,176,32,0.20)');
    this._drawHeader(ctx, W, '🎫  SEASON PASS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const xp = SaveData.getSeasonXP ? SaveData.getSeasonXP() : 0;
    const curTier = Economy.seasonTier(xp);
    const perTier = Economy.SEASON_XP_PER_TIER;
    const intoTier = xp - curTier * perTier;
    const premium = !!SaveData.get('premiumPass');

    this._drawCard(ctx, 12, 58, W-24, 34, { r:9, accent:'#ffb020', fill:['rgba(30,24,10,0.92)','rgba(14,12,8,0.92)'] });
    ctx.font='bold 14px Impact, Arial Black'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#ffd873';
    ctx.fillText('TIER ' + curTier + ' / ' + Economy.SEASON_MAX_TIER, W/2, 75);
    const bx=30, bw=W-60, by=98;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(bx,by,bw,9,4); ctx.fill();
    const pg = ctx.createLinearGradient(bx,by,bx+bw,by); pg.addColorStop(0,'#ffcf3f'); pg.addColorStop(1,'#ff9500');
    ctx.fillStyle=pg; ctx.beginPath(); ctx.roundRect(bx,by,Math.max(4,bw*Math.min(1,intoTier/perTier)),9,4); ctx.fill();
    ctx.fillStyle='rgba(200,210,255,0.6)'; ctx.font='9px Arial'; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(intoTier + ' / ' + perTier + ' XP', W/2, by+13);

    if (!premium) {
      this._drawSmallBtn(ctx,30,126,W-60,44,'⭐ UNLOCK PREMIUM  ◆ 50', this.C.gold);
      this.buttons.push({ id:'buy_premium', x:30, y:126, w:W-60, h:44 });
    } else {
      ctx.fillStyle=this.C.gold; ctx.font='bold 12px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⭐ PREMIUM ACTIVE', W/2, 140);
    }

    ctx.font='bold 9px Arial'; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillStyle=this.C.dim; ctx.fillText('FREE', W*0.36, 178);
    ctx.fillStyle=this.C.gold; ctx.fillText('PREMIUM', W*0.74, 178);

    const rewTxt = r => r.gold ? ('⧆ '+r.gold) : r.diamonds ? ('◆ '+r.diamonds) : r.scrap ? ('◈ '+r.scrap) : '-';
    const start=Math.max(0, curTier-1), rowH=50, listY=192;
    for (let i=0;i<6;i++){
      const tier=start+i; if (tier>=Economy.SEASON_MAX_TIER) break;
      const y=listY+i*(rowH+6);
      ctx.fillStyle = tier===curTier ? 'rgba(255,176,32,0.14)' : 'rgba(12,14,26,0.9)';
      ctx.beginPath(); ctx.roundRect(10,y,W-20,rowH,8); ctx.fill();
      ctx.fillStyle='#ffb020'; ctx.font='bold 13px Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText('T'+tier, 16, y+rowH/2);
      const reached = curTier > tier;
      this._seasonCell(ctx, W*0.36, y, rowH, rewTxt(Economy.seasonReward(tier,false)), reached, SaveData.isSeasonClaimed(tier,false), true,    'claim_season_f_'+tier);
      this._seasonCell(ctx, W*0.74, y, rowH, rewTxt(Economy.seasonReward(tier,true)),  reached, SaveData.isSeasonClaimed(tier,true),  premium, 'claim_season_p_'+tier);
    }
  },
  _seasonCell(ctx, cx, y, rowH, txt, reached, claimed, allowed, id) {
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font='bold 11px Arial'; ctx.fillStyle = (allowed && reached) ? '#fff' : 'rgba(150,160,190,0.5)';
    ctx.fillText(txt, cx, y+16);
    const bw=76, bx=cx-bw/2, by=y+rowH-22, bh=18;
    if (!allowed) { ctx.fillStyle='rgba(150,160,190,0.45)'; ctx.font='9px Arial'; ctx.fillText('🔒 premium', cx, by+9); return; }
    if (claimed)  { ctx.fillStyle=this.C.green; ctx.font='bold 9px Arial'; ctx.fillText('✔ claimed', cx, by+9); return; }
    if (!reached) { ctx.fillStyle='rgba(150,160,190,0.5)'; ctx.font='9px Arial'; ctx.fillText('🔒 locked', cx, by+9); return; }
    ctx.fillStyle='rgba(0,200,80,0.25)'; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,5); ctx.fill();
    ctx.fillStyle=this.C.green; ctx.font='bold 9px Arial'; ctx.fillText('CLAIM', cx, by+9);
    this.buttons.push({ id:id, x:bx, y:y, w:bw, h:rowH });
  },

  // ── MULTIPLAYER (online-style, AI opponents) ──────────────────────────────
  drawMultiplayer(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(0,204,255,0.20)');
    this._drawHeader(ctx, W, '🌐  MULTIPLAYER');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    ctx.fillStyle = 'rgba(190,210,245,0.7)'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Live race vs AI-driven opponents', W/2, 58);

    // FIND MATCH button
    const bw = W - 60, bx = 30, by = 76, bh = 44;
    ctx.save(); ctx.shadowColor = 'rgba(0,180,255,0.5)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    const pg = ctx.createLinearGradient(0, by, 0, by + bh); pg.addColorStop(0, '#5fd0ff'); pg.addColorStop(1, '#1f7ad0');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 12); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx + 3, by + 3, bw - 6, bh * 0.42, 10); ctx.stroke();
    ctx.fillStyle = '#03203a'; ctx.font = '900 18px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔍  FIND MATCH', W/2, by + bh/2 + 1);
    this.buttons.push({ id:'mp_find', x:bx, y:by, w:bw, h:bh });

    // Simulated live leaderboard
    this._drawBand(ctx, 14, 132, W - 28, '🏆 LIVE LEADERBOARD', this.C.gold);
    const names = ['SpeedyAli', 'GhostRider', 'TurboZoe', 'RexRacer', 'NitroKing', 'MudQueen', 'ViperX', 'BlazeBoy', 'IcePilot', 'DuneHawk', 'MaxPower', 'FoxTrot'];
    const myBest = Object.values(SaveData.get('highScores') || {}).reduce((a, b) => Math.max(a, b), 0);
    const gp = SaveData.get('gamesPlayed') || 1;
    const entries = [];
    for (let i = 0; i < 8; i++) {
      const seed = (i * 97 + gp * 13) % names.length;
      const dist = Math.floor(myBest * (1.4 - i * 0.13) + 500 + (i * i * 40) % 700);
      entries.push({ name: names[seed], dist: Math.max(120, dist) });
    }
    entries.push({ name: 'YOU', dist: myBest, me: true });
    entries.sort((a, b) => b.dist - a.dist);
    let y = 160;
    entries.slice(0, 9).forEach((e, i) => {
      const medalCols = ['#ffd24a', '#c0c0c0', '#cd7f32'];
      const medal = i < 3 ? medalCols[i] : null;
      this._drawCard(ctx, 14, y, W - 28, 34, { r:6, accent: e.me ? this.C.gold : medal, active: e.me, glow: e.me });
      // rank disc
      ctx.save();
      if (medal) {
        ctx.shadowColor = medal; ctx.shadowBlur = 6;
        const rg = ctx.createRadialGradient(31, y + 14, 1, 31, y + 17, 11);
        rg.addColorStop(0, this._lighten(medal, 35)); rg.addColorStop(1, this._lighten(medal, -25));
        ctx.fillStyle = rg;
      } else { ctx.fillStyle = 'rgba(40,46,72,0.9)'; }
      ctx.beginPath(); ctx.arc(31, y + 17, 11, 0, 6.283); ctx.fill(); ctx.restore();
      ctx.fillStyle = medal ? '#1a1206' : (e.me ? '#ffd24a' : this.C.dim);
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), 31, y + 17);
      // name (crown for #1)
      ctx.fillStyle = e.me ? '#ffd24a' : '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
      ctx.fillText((i === 0 ? '👑 ' : '') + e.name, 50, y + 17);
      // distance chip
      const ds = (typeof Economy !== 'undefined' && Economy.formatDistance) ? Economy.formatDistance(e.dist) : (e.dist + ' m');
      ctx.font = 'bold 11px Arial'; const dw = ctx.measureText(ds).width + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(W - 20 - dw, y + 8, dw, 18, 9); ctx.fill();
      ctx.fillStyle = e.me ? '#ffd24a' : 'rgba(200,210,245,0.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ds, W - 20 - dw / 2, y + 17);
      y += 38;
    });
  },

  // ── VEHICLE CAROUSEL ─────────────────────────────────────────────────────
  drawVehicles(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,61,0,0.20)');
    this._drawHeader(ctx, W, '⛋  SELECT VEHICLE');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const ids   = Object.keys(VehicleDefs);
    const curI  = this._carVehIdx;
    const cIdx  = Math.round(this._carVehTarget);
    const selId = ids[cIdx] || 'jeep';
    const def   = VehicleDefs[selId];
    const owned = (SaveData.get('ownedVehicles') || []).includes(selId);
    const isSelected = SaveData.get('selectedVehicle') === selId;

    // ── Responsive dikey yerleşim: aksiyon butonu + statlar + bilgi kartı ALTA
    //    sabitlenir; carousel üstte kalan alanı doldurur → yatay kısa ekranda
    //    "HARİTAYA GİT / SELECT" butonu asla ekran dışına düşmez. ──
    const _Rv = (typeof Responsive !== 'undefined') ? Responsive : { isTablet() { return false; } };
    const _safeB = 8;
    const btnH   = _Rv.isTablet() ? 54 : 46;
    const btnY   = H - _safeB - btnH;
    const statH  = 28;
    const statsY = btnY - 6 - statH;
    const infoH  = 42;
    const infoY  = statsY - 6 - infoH;
    // Carousel track (üst şerit: header altından bilgi kartının üstüne)
    const trackY = 52, trackH = Math.max(90, infoY - 8 - trackY);
    const carW = W * 0.62, carX = W / 2 - carW / 2;

    // Spotlight
    const spot = ctx.createRadialGradient(W/2, trackY + trackH*0.5, 10, W/2, trackY + trackH*0.5, W*0.55);
    spot.addColorStop(0, 'rgba(255,61,0,0.08)'); spot.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spot; ctx.fillRect(0, trackY - 20, W, trackH + 40);

    // ── Showroom stage: back-wall glow + floor plane (depth, controlled) ──
    {
      const floorY = trackY + trackH * 0.55 + 34;
      const wall = ctx.createLinearGradient(0, 56, 0, floorY);
      wall.addColorStop(0, 'rgba(30,20,16,0)'); wall.addColorStop(1, 'rgba(44,28,20,0.34)');
      ctx.fillStyle = wall; ctx.fillRect(0, 56, W, Math.max(0, floorY - 56));
      const floor = ctx.createLinearGradient(0, floorY, 0, floorY + 92);
      floor.addColorStop(0, 'rgba(12,10,16,0.55)'); floor.addColorStop(1, 'rgba(4,4,8,0)');
      ctx.fillStyle = floor; ctx.fillRect(0, floorY, W, 92);
      ctx.strokeStyle = 'rgba(255,90,30,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();
    }

    // ── Glowing display podium under the centered vehicle ──
    {
      const _pt = this.animTime;
      const podCol = isSelected ? this.C.green : (owned ? this.C.cyan : this.C.fire);
      const podY = trackY + trackH * 0.55 + 34;
      const podW = W * 0.5, podH = 22;
      // rotating light rays behind the car
      ctx.save();
      ctx.translate(W/2, trackY + trackH * 0.5);
      ctx.globalAlpha = 0.10;
      for (let r = 0; r < 10; r++) {
        ctx.rotate((Math.PI * 2 / 10));
        const rg = ctx.createLinearGradient(0, 0, 0, -W*0.5);
        rg.addColorStop(0, podCol); rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.lineTo(3, -W*0.5); ctx.lineTo(-3, -W*0.5); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // pulsing glow ellipse (contact shadow)
      const gp = 0.5 + 0.5 * Math.sin(_pt * 2.2);
      ctx.save();
      ctx.shadowColor = podCol; ctx.shadowBlur = 18 + gp * 12;
      const peg = ctx.createRadialGradient(W/2, podY, 4, W/2, podY, podW/2);
      peg.addColorStop(0, podCol + '55'); peg.addColorStop(0.6, podCol + '18'); peg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = peg; ctx.beginPath(); ctx.ellipse(W/2, podY, podW/2, podH/2, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      // bright rim ring
      ctx.strokeStyle = podCol + 'aa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(W/2, podY, podW/2, podH/2, 0, 0, Math.PI*2); ctx.stroke();
    }

    // Draw 5 vehicles: -2,-1, center, +1, +2
    for (let di = -2; di <= 2; di++) {
      const vi = Math.round(curI) + di;
      if (vi < 0 || vi >= ids.length) continue;
      const vid2 = ids[vi];
      const dist = (vi - curI);
      const sc   = Math.max(0.38, 1 - Math.abs(dist) * 0.3);
      const vx2  = W / 2 + dist * W * 0.58;
      const vy2  = trackY + trackH * 0.55;
      const alpha = Math.max(0.1, 1 - Math.abs(dist) * 0.55);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(vx2, vy2);
      ctx.scale(sc, sc);
      // Karusel ölçeği (sc) MESAFEYE göredir; ekran genişliğini hesaplamaz.
      // Hedef genişlik de verilmeli, yoksa dar telefonda araçlar dev kalır.
      // BUGFIX(31 Tmz): YÜKSEKLİK kısıtı da eklendi — menü aracındaki hatanın
      // aynısı buradaydı. Telefon yatayken (H≈335) 240 px'lik araç ekran
      // yüksekliğinin %72'sini kaplıyordu.
      // 🛞 BUGFIX(31 Tmz): araçlar artık TEKERLERİNDEN aynı hizaya oturuyor.
      //   Eskiden hepsi gövde merkezinden konumlanıyordu; görsel alt kenar
      //   23…66 px arasında değiştiği için küçük tekerliler havada kalıyordu.
      //   ⚠ `sc` ölçeği ZATEN uygulandı → taban ofsetini burada ÖLÇEKLEME,
      //     yoksa iki kez ölçeklenir.
      const _khedef = Math.min(240, W * 0.55, H * 0.46);
      ctx.translate(0, -this._aracTabani(VehicleDefs[vid2], _khedef));
      this._drawMenuCar(ctx, vid2, di === 0 ? this.animTime : 0, _khedef);
      ctx.restore();
    }

    // ── Local state (all default-safe) ───────────────────────────────
    const reduce = (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion') === true);
    const gold   = (SaveData.get && SaveData.get('gold')) || 0;
    const price  = (def && def.price) || 0;
    const canAfford = gold >= price;
    const stats  = (def && def.stats) || { engine:5, suspension:5, tires:5, fuel:5 };
    // paint colours (colour hint) — default-safe
    const _paint = (SaveData.getPaint && SaveData.getPaint(selId)) || null;
    const pc1 = (_paint && _paint.c1) || (def && def.color)  || '#c0392b';
    const pc2 = (_paint && _paint.c2) || (def && def.color2) || '#2c3e50';
    // power score (base stats + owned upgrades)
    const _up = ((SaveData.get('upgrades') || {})[selId]) || { engine:1, suspension:1, tires:1, fuel:1 };
    const _pw = Math.round(stats.engine*3 + stats.suspension*1.5 + stats.tires*1.5 + stats.fuel
                + ((_up.engine||1)+(_up.suspension||1)+(_up.tires||1)+(_up.fuel||1) - 4) * 6);
    const accent = isSelected ? this.C.green : (owned ? this.C.cyan : this.C.fire);

    // ── HERO INFO CARD (name • status • power • paint) — infoY/infoH yukarıda ──
    this._drawCard(ctx, 8, infoY, W - 16, infoH, { r:12, accent: accent, active:true, glow: !reduce,
      fill:['rgba(24,18,14,0.92)','rgba(8,7,12,0.92)'] });

    // Status pill (top-left) — label + shape, never colour-only
    {
      const stTxt = isSelected ? 'ACTIVE' : (owned ? 'OWNED' : 'LOCKED');
      const stCol = isSelected ? this.C.green : (owned ? this.C.cyan : '#9aa2c4');
      ctx.font = 'bold 9px Arial';
      const pw = ctx.measureText(stTxt).width + 24;
      const pillX = 16, pillY = infoY + 7, pillH = 15;
      ctx.fillStyle = stCol + '26';
      ctx.beginPath(); ctx.roundRect(pillX, pillY, pw, pillH, 7); ctx.fill();
      ctx.strokeStyle = stCol + '99'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(pillX + 0.5, pillY + 0.5, pw - 1, pillH - 1, 7); ctx.stroke();
      const gx = pillX + 10, gy = pillY + pillH / 2;
      if (!owned) {
        this._drawLockIcon(ctx, gx, gy + 1, 11, reduce ? 0 : this.animTime);
      } else if (isSelected) {
        ctx.strokeStyle = stCol; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(gx - 3.5, gy); ctx.lineTo(gx - 1, gy + 3); ctx.lineTo(gx + 4, gy - 3.5); ctx.stroke();
      } else {
        ctx.fillStyle = stCol; ctx.beginPath(); ctx.arc(gx, gy, 3, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(stTxt, pillX + 18, gy + 0.5);
    }

    // Vehicle name (dominant, centred)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.floor(W * 0.052) + 'px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText((def && def.name || selId).toUpperCase(), W / 2, infoY + infoH - 8);
    ctx.restore();

    // Power badge + paint swatches (top-right)
    {
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 5;
      ctx.fillStyle = '#ffce54'; ctx.fillText('⚡ ' + _pw, W - 16, infoY + 14); ctx.restore();
      const swW = 13, swH = 9, swY = infoY + 24, swX = W - 16 - swW * 2 - 4;
      [pc2, pc1].forEach((c, ci) => {
        const bx = swX + (1 - ci) * (swW + 4);
        ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(bx, swY, swW, swH, 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx + 0.5, swY + 0.5, swW - 1, swH - 1, 2); ctx.stroke();
      });
    }

    // ── STAT BARS — konum yukarıda alta-sabit hesaplandı ──
    // Etiket: bu çubuklar aracın doğuştan özelliği; yükseltme seviyesi garajda.
    ctx.save();
    ctx.fillStyle = 'rgba(159,176,200,0.75)';
    ctx.font = 'bold 8px system-ui, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('ARAÇ ÖZELLİĞİ (yükseltme değil — garajda yükseltirsin)', 10, statsY - 4);
    ctx.restore();
    this._drawVehStatBars(ctx, 8, statsY, W - 16, stats);

    // ── PRIMARY ACTION (dominant) + optional PAINT (owned) — btnY/btnH yukarıda ──
    let ctaX = 20, ctaW = W - 40;
    if (owned) {
      // Compact paint/customize button (left); ≥44px touch target
      this._customizeVeh = selId;
      const pbW = 46;
      this._drawIconBtn(ctx, 20, btnY, pbW, btnH, '🎨', true);
      this.buttons.push({ id:'customize', x:18, y:btnY - 2, w:pbW + 6, h:btnH + 4 });
      ctaX = 20 + pbW + 8; ctaW = W - ctaX - 20;
    }
    // Idle glow pulse to lead the eye to the primary CTA (guarded)
    if (!reduce && (owned || canAfford)) {
      const gp = 0.5 + 0.5 * Math.sin(this.animTime * 3);
      ctx.save(); ctx.globalAlpha = 0.30 + gp * 0.35;
      ctx.shadowColor = accent; ctx.shadowBlur = 12 + gp * 12;
      ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(ctaX, btnY, ctaW, btnH, 4); ctx.fill();
      ctx.restore();
    }
    if (!owned) {
      const pstr = '⧆ ' + price.toLocaleString();
      if (canAfford) {
        this._drawFireBtn(ctx, ctaX, btnY, ctaW, btnH, pstr + '   BUY');
      } else {
        this._drawDarkBtn(ctx, ctaX, btnY, ctaW, btnH, pstr + '  ·  +' + (price - gold).toLocaleString() + ' GEREK');
      }
      this.buttons.push({ id:'buy_vehicle', x:ctaX, y:btnY, w:ctaW, h:btnH });
    } else if (!isSelected) {
      this._drawCyanBtn(ctx, ctaX, btnY, ctaW, btnH, '✔  SELECT');
      this.buttons.push({ id:'select_vehicle', x:ctaX, y:btnY, w:ctaW, h:btnH });
    } else {
      this._drawFireBtn(ctx, ctaX, btnY, ctaW, btnH, '▶  GO TO MAP');
      this.buttons.push({ id:'select_vehicle', x:ctaX, y:btnY, w:ctaW, h:btnH });
    }

    // Dots indicator
    const dotY = 62, maxDots = Math.min(ids.length, 30);
    const dotSpacing = Math.min(13, (W - 50) / maxDots);
    const dotStartX = W/2 - maxDots * dotSpacing / 2;
    for (let d = 0; d < maxDots; d++) {
      ctx.fillStyle = d === cIdx ? this.C.fire : 'rgba(150,160,220,0.22)';
      ctx.beginPath(); ctx.arc(dotStartX + d*dotSpacing, dotY, d===cIdx?4:2, 0, Math.PI*2); ctx.fill();
    }

    // Arrow buttons — enlarged carousel nav (≥44px touch targets)
    const arW = 44, arH = 56;
    const arY = trackY + trackH * 0.5 - arH / 2;
    this._drawIconBtn(ctx, 4,        arY, arW, arH, '◄', cIdx > 0);
    this._drawIconBtn(ctx, W-4-arW,  arY, arW, arH, '►', cIdx < ids.length - 1);
    this.buttons.push(
      { id:'prev_vehicle', x:2,        y:arY-4, w:arW+6, h:arH+8 },
      { id:'next_vehicle', x:W-6-arW,  y:arY-4, w:arW+6, h:arH+8 }
    );
  },

  // Yükseltme tavanını tek yerden oku (Economy yoksa 25'e düşer).
  // TUNING(2 Agu): yedek değer 50 → 25 (Economy.UP_MAX ile aynı olmalı).
  _upMax() {
    try { if (typeof Economy !== 'undefined' && Economy.UP_MAX) return Economy.UP_MAX; } catch (e) {}
    return 25;
  },

  // Vehicle stat bars: 4 cells, each with label + numeric value + fill bar.
  // Readable at a glance; value shown as text so it never relies on colour alone.
  // DİKKAT: Bunlar aracın DOĞUŞTAN GELEN özellikleridir (Monster Truck'ın süspansiyonu
  // iyidir gibi) — senin yükseltme seviyen DEĞİL. Yükseltme seviyesi garajda görünür.
  // Her stat'ın gerçek tavanı farklı (veri taramasından): engine 1-20, suspension 1-14,
  // tires 2-20, fuel 2-10. Eskiden hepsi /20 bölünüyordu; bu yüzden yakıt çubuğu asla
  // yarıyı geçemiyor, 10'luk statlar da "yarı yükseltilmiş" gibi görünüyordu.
  _drawVehStatBars(ctx, x, y, w, stats) {
    stats = stats || { engine:5, suspension:5, tires:5, fuel:5 };
    const list = [
      { key:'engine',     label:'ENGINE', col:this.C.fire, max:20 },
      { key:'suspension', label:'SUSP',   col:'#00BBFF',   max:14 },
      { key:'tires',      label:'GRIP',   col:'#00DD44',   max:20 },
      { key:'fuel',       label:'FUEL',   col:'#FFAA00',   max:10 }
    ];
    const gap = 6, h = 28;
    const cw = (w - gap * (list.length - 1)) / list.length;
    list.forEach((s, i) => {
      const cx = x + i * (cw + gap);
      const scg = ctx.createLinearGradient(cx, y, cx, y + h);
      scg.addColorStop(0, 'rgba(26,28,48,0.9)'); scg.addColorStop(1, 'rgba(9,10,20,0.9)');
      ctx.fillStyle = scg; ctx.beginPath(); ctx.roundRect(cx, y, cw, h, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cx + 0.5, y + 0.5, cw - 1, h - 1, 6); ctx.stroke();
      // left accent stripe
      ctx.fillStyle = s.col; ctx.beginPath(); ctx.roundRect(cx, y, 3, h, [6, 0, 0, 6]); ctx.fill();
      // label + numeric value
      const raw = Math.max(0, Math.min(s.max, (stats[s.key] != null ? stats[s.key] : 5)));
      ctx.fillStyle = 'rgba(214,222,250,0.92)'; ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s.label, cx + 7, y + 8);
      ctx.fillStyle = s.col; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'right';
      ctx.fillText(String(Math.round(raw)), cx + cw - 6, y + 8);
      // track + glowing fill
      const bx = cx + 6, bw = cw - 12, by = y + 19;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 6, 3); ctx.fill();
      ctx.save(); ctx.shadowColor = s.col; ctx.shadowBlur = 4;
      ctx.fillStyle = s.col; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(3, bw * (raw / s.max)), 6, 3); ctx.fill(); ctx.restore();
    });
  },

  // ── REWARDS HUB (💎) ─────────────────────────────────────────────────────
  drawRewards(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(68,221,255,0.20)');
    this._drawHeader(ctx, W, '💎  REWARDS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    const R = (typeof Rewards !== 'undefined') ? Rewards : null;
    const cards = [
      { id:'reward_daily',  ic:'🎁', t:'DAILY REWARD',  s: R && R.canClaimDaily() ? 'HAZIR — Topla!' : 'Yarın tekrar gel', hot: !!(R && R.canClaimDaily()) },
      { id:'spin',          ic:'🎡', t:'DAILY SPIN',    s: R && R.canSpin() ? 'HAZIR — Çevir!' : 'Yarın tekrar gel', hot: !!(R && R.canSpin()) },
      { id:'league',        ic:'🏆', t:'SEASON LEAGUE', s: R ? (R.tier().name + ' • ' + R.trophies() + '🏆') : '—' },
      { id:'vip',           ic:'👑', t:'VIP',           s: R && R.isVIP() ? (R.vipDaysLeft() + ' gün kaldı') : 'Perkleri gör' },
      { id:'reward_ad',     ic:'📺', t:'FREE BONUS',    s: R && R.adReady() ? 'İZLE → +altın' : 'Bekleniyor...', hot: !!(R && R.adReady()) },
      { id:'market',        ic:'🛒', t:'MARKET',        s:'Altın ↔ Hurda takas' },
      { id:'achievements',  ic:'🏅', t:'BADGES',        s:'Başarım rozetleri' }
    ];
    const cols = 2, gap = 14, cw = (W - gap * (cols + 1)) / cols, ch = 96;
    const y0 = 64;
    cards.forEach((c, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = gap + col * (cw + gap), cy = y0 + row * (ch + gap);
      this._drawCard(ctx, x, cy, cw, ch, { r:12, accent: c.hot ? '#4be07a' : this.C.cyan, active: !!c.hot, glow: !!c.hot });
      // icon glow disk
      ctx.save();
      ctx.beginPath(); ctx.arc(x + cw/2, cy + 27, 22, 0, 6.283);
      const rig = ctx.createRadialGradient(x + cw/2, cy + 22, 3, x + cw/2, cy + 27, 24);
      rig.addColorStop(0, (c.hot ? '#4be07a' : this.C.cyan) + '44'); rig.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rig; ctx.fill(); ctx.restore();
      ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
      ctx.fillText(c.ic, x + cw / 2, cy + 12);
      ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#fff'; ctx.fillText(c.t, x + cw / 2, cy + 50);
      ctx.font = '10px Arial'; ctx.fillStyle = c.hot ? '#dfffe0' : 'rgba(190,200,240,0.75)'; ctx.fillText(c.s, x + cw / 2, cy + 70);
      if (c.hot) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x + cw - 12, cy + 12, 6, 0, 6.28); ctx.fill(); }
      this.buttons.push({ id: c.id, x: x, y: cy, w: cw, h: ch });
    });
    if (R && R.isVIP()) {
      ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('👑 VIP AKTİF — tüm kazançlar x1.5', W / 2, y0 + 3 * (ch + gap) + 8);
    }
  },

  // ── VIP (👑) ─────────────────────────────────────────────────────────────
  drawVIP(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,215,0,0.22)');
    this._drawHeader(ctx, W, '👑  VIP');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    const R = (typeof Rewards !== 'undefined') ? Rewards : null;
    const active = R && R.isVIP();
    // status band with soft glow + crown accent
    this._drawCard(ctx, 14, 60, W - 28, 26, { r:9, accent: active ? this.C.green : this.C.gold, active:true,
      fill:['rgba(38,30,8,0.92)','rgba(16,13,6,0.92)'] });
    ctx.save();
    ctx.shadowColor = active ? 'rgba(46,204,113,0.7)' : 'rgba(255,215,0,0.6)'; ctx.shadowBlur = 8;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = active ? '#2ecc71' : '#ffd873'; ctx.font = 'bold 13px Arial';
    ctx.fillText(active ? ('✓ AKTİF — ' + R.vipDaysLeft() + ' gün kaldı') : '👑 Şu an VIP değilsin', W / 2, 73);
    ctx.restore();
    const perks = ['💰  Tüm altın kazançları x1.5', '🎁  Günlük ödül 2 katı', '📺  Bonuslar 2 katı', '🏆  Ligde +kupa avantajı', '🎨  Özel VIP rozeti'];
    const perkIcons = ['💰', '🎁', '📺', '🏆', '🎨'];
    const perkTags  = ['x1.5', 'x2', 'x2', '+KUPA', 'ROZET'];
    let y = 96;
    perks.forEach((p, pi) => {
      this._drawCard(ctx, 16, y, W - 32, 40, { r:8, accent:this.C.gold });
      // glowing icon disc
      ctx.save();
      const dg = ctx.createRadialGradient(40, y + 16, 2, 40, y + 20, 15);
      dg.addColorStop(0, 'rgba(255,215,0,0.4)'); dg.addColorStop(1, 'rgba(255,215,0,0.06)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(40, y + 20, 14, 0, 6.283); ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,0,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(40, y + 20, 14, 0, 6.283); ctx.stroke();
      ctx.font = '15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(perkIcons[pi] || '★', 40, y + 20);
      ctx.restore();
      // clean label (leading emoji stripped)
      const label = p.replace(/^\S+\s+/, '');
      ctx.fillStyle = '#fff'; ctx.font = '12.5px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label.replace(/\s+x1\.5$|\s+2 katı$/, ''), 64, y + 20);
      // value tag
      const tag = perkTags[pi];
      if (tag) {
        ctx.font = 'bold 10px Arial';
        const tw = ctx.measureText(tag).width + 14;
        ctx.save(); ctx.shadowColor = this.C.gold; ctx.shadowBlur = 5;
        const tg = ctx.createLinearGradient(W - 24 - tw, y + 10, W - 24 - tw, y + 30);
        tg.addColorStop(0, this._lighten(this.C.gold, 24)); tg.addColorStop(1, this._lighten(this.C.gold, -30));
        ctx.fillStyle = tg; ctx.beginPath(); ctx.roundRect(W - 24 - tw, y + 10, tw, 20, 6); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#1a1206'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(tag, W - 24 - tw / 2, y + 20);
      }
      y += 48;
    });
    y += 8;
    this._drawCyanBtn(ctx, 16, y, W - 32, 46, '7 GÜN VIP  —  ◆ 30');
    this.buttons.push({ id:'buy_vip_7', x:16, y:y, w:W-32, h:46 }); y += 54;
    this._drawFireBtn(ctx, 16, y, W - 32, 46, '30 GÜN VIP  —  ◆ 90');
    this.buttons.push({ id:'buy_vip_30', x:16, y:y, w:W-32, h:46 });
    this._drawValueTag(ctx, W - 30 - 54, y - 7, 'EN İYİ', this.C.gold);
  },

  // ── SEASON LEAGUE (🏆) ────────────────────────────────────────────────────
  drawLeague(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,215,0,0.20)');
    this._drawHeader(ctx, W, '🏆  SEASON LEAGUE');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    const R = (typeof Rewards !== 'undefined') ? Rewards : null;
    if (!R) return;
    const tier = R.tier(), nxt = R.nextTier(), tp = R.tierProgress(), tr = R.trophies();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // medallion with soft glow + gradient
    ctx.save(); ctx.shadowColor = tier.col; ctx.shadowBlur = 22;
    const mg = ctx.createRadialGradient(W/2, 108, 6, W/2, 118, 54);
    mg.addColorStop(0, this._lighten(tier.col, 40)); mg.addColorStop(1, this._lighten(tier.col, -40));
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(W / 2, 118, 52, 0, 6.28); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, 118, 52, 0, 6.28); ctx.stroke();
    ctx.font = '38px Arial'; ctx.fillText('🏆', W / 2, 118);
    ctx.fillStyle = tier.col; ctx.font = 'bold 22px Impact, Arial Black'; ctx.fillText(tier.name, W / 2, 188);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.fillText(tr + ' 🏆', W / 2, 212);
    if (nxt) {
      const bx = 30, bw = W - 60, by = 234;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, 14, 7); ctx.fill();
      ctx.save(); ctx.shadowColor = tier.col; ctx.shadowBlur = 6;
      const lpg = ctx.createLinearGradient(bx, by, bx + bw, by);
      lpg.addColorStop(0, this._lighten(tier.col, 30)); lpg.addColorStop(1, tier.col);
      ctx.fillStyle = lpg; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(6, bw * tp), 14, 7); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(220,230,255,0.85)'; ctx.font = '10px Arial'; ctx.textBaseline = 'top';
      ctx.fillText((nxt.min - tr) + ' kupa → ' + nxt.name, W / 2, by + 20);
    } else {
      ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 12px Arial'; ctx.fillText('EN ÜST LİG!', W / 2, 240);
    }
    let y = 278; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    R.TIERS.forEach((x, xi) => {
      const on = x.name === tier.name;
      const reached = tr >= x.min;
      this._drawCard(ctx, 16, y, W - 32, 30, { r:6, accent: x.col, active: on, glow: on });
      // numbered rank disc (dim if not yet reached)
      ctx.save(); if (on) { ctx.shadowColor = x.col; ctx.shadowBlur = 7; }
      const dg = ctx.createRadialGradient(37, y + 12, 1, 37, y + 15, 10);
      dg.addColorStop(0, this._lighten(x.col, 35)); dg.addColorStop(1, this._lighten(x.col, -28));
      ctx.fillStyle = reached ? dg : 'rgba(56,62,86,0.75)';
      ctx.beginPath(); ctx.arc(37, y + 15, 10, 0, 6.28); ctx.fill(); ctx.restore();
      ctx.fillStyle = reached ? '#0c0c14' : 'rgba(190,200,240,0.55)'; ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(xi + 1), 37, y + 15);
      // tier name
      ctx.fillStyle = reached ? '#fff' : 'rgba(160,170,210,0.55)'; ctx.font = on ? 'bold 12px Arial' : '12px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(x.name, 56, y + 15);
      // right side: current marker or requirement
      if (on) {
        ctx.save(); ctx.shadowColor = x.col; ctx.shadowBlur = 6;
        ctx.fillStyle = x.col; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'right';
        ctx.fillText('◄ SEN', W - 24, y + 15); ctx.restore();
      } else {
        ctx.fillStyle = reached ? 'rgba(46,204,113,0.9)' : 'rgba(190,200,240,0.65)'; ctx.font = '10px Arial'; ctx.textAlign = 'right';
        ctx.fillText((reached ? '✔ ' : '') + x.min + '🏆', W - 24, y + 15);
      }
      ctx.textAlign = 'left';
      y += 36;
    });
  },

  // ── DAILY SPIN (🎡) ───────────────────────────────────────────────────────
  drawSpinWheel(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(170,34,255,0.20)');
    this._drawHeader(ctx, W, '🎡  DAILY SPIN');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    const R = (typeof Rewards !== 'undefined') ? Rewards : null;
    if (!R) return;
    ctx.fillStyle = 'rgba(205,180,255,0.7)'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Her gün bir kez çevir — bedava ödül!', W / 2, 58);
    const prizes = R.SPIN_PRIZES, n = prizes.length;
    const cx = W / 2, cy = H * 0.44, rad = Math.min(W * 0.36, 155);

    if (!this._spin) this._spin = { angle: 0, vel: 0, spinning: false, result: -1, showT: 0, lastT: this.animTime };
    const sp = this._spin;
    const dt = Math.max(0, Math.min(0.05, this.animTime - sp.lastT)); sp.lastT = this.animTime;
    if (sp.spinning) {
      sp.angle += sp.vel * dt;
      sp.vel *= Math.pow(0.4, dt);
      if (sp.vel < 0.2) {
        sp.spinning = false;
        const wa = ((Math.PI * 1.5 - sp.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        sp.result = Math.floor(wa / (Math.PI * 2 / n)) % n;
        const p = R.awardSpin(sp.result);
        sp.showT = 3.2;
        if (this.showToast) this.showToast('🎉 ' + p.label + ' kazandın!');
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
      }
    } else if (sp.showT > 0) sp.showT -= dt;

    // Dış parlayan çember (statik)
    ctx.save();
    ctx.shadowColor = 'rgba(255,210,74,0.7)'; ctx.shadowBlur = 18;
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, rad + 6, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // stud'lar (küçük ışıklar)
    for (let s = 0; s < n; s++) {
      const sa = s / n * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = s % 2 ? '#fff' : '#ffcf3f';
      ctx.beginPath(); ctx.arc(cx + Math.cos(sa) * (rad + 6), cy + Math.sin(sa) * (rad + 6), 2.4, 0, 6.283); ctx.fill();
    }

    // Çark
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(sp.angle);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      ctx.fillStyle = prizes[i].col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, a0, a1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.rotate((a0 + a1) / 2);
      ctx.fillStyle = '#111'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(prizes[i].label, rad - 8, 0); ctx.restore();
    }
    ctx.restore();
    // glossy sheen over the wheel (3D sheen)
    ctx.save();
    const gloss = ctx.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    gloss.addColorStop(1, 'rgba(0,0,0,0.20)');
    ctx.fillStyle = gloss; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
    ctx.restore();
    // Merkez göbek + üst ok
    const hubg = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 18);
    hubg.addColorStop(0, '#3a3a52'); hubg.addColorStop(1, '#141420');
    ctx.fillStyle = hubg; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd21e'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.283); ctx.fill();
    ctx.save(); ctx.shadowColor = '#ffd21e'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd21e'; ctx.beginPath();
    ctx.moveTo(cx - 13, cy - rad - 6); ctx.lineTo(cx + 13, cy - rad - 6); ctx.lineTo(cx, cy - rad + 16); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Buton / sonuç / bekle
    const by = cy + rad + 34;
    if (sp.showT > 0 && sp.result >= 0) {
      ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 18px Impact, Arial Black'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🎉 ' + prizes[sp.result].label + ' KAZANDIN!', W / 2, by);
    } else if (sp.spinning) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Çevriliyor...', W / 2, by);
    } else if (R.canSpin()) {
      this._drawFireBtn(ctx, W / 2 - 95, by - 24, 190, 48, '🎡  ÇEVİR');
      this.buttons.push({ id: 'do_spin', x: W / 2 - 95, y: by - 24, w: 190, h: 48 });
    } else {
      ctx.fillStyle = 'rgba(200,210,255,0.6)'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Bugün çevirdin — yarın tekrar gel', W / 2, by);
    }
  },

  // ── MARKET (🛒) ───────────────────────────────────────────────────────────
  drawMarket(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(159,224,160,0.20)');
    this._drawHeader(ctx, W, '🛒  MARKET');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    const gold = SaveData.get('gold') || 0, scrap = SaveData.getScrap ? SaveData.getScrap() : 0;
    this._drawCard(ctx, 14, 56, W - 28, 40, { r:9, accent:this.C.gold, fill:['rgba(24,20,10,0.9)','rgba(14,12,8,0.9)'] });
    // twin balance readout with divider
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.shadowColor = 'rgba(255,207,63,0.5)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffcf3f'; ctx.font = 'bold 15px Arial';
    ctx.fillText('⧆ ' + gold.toLocaleString(), W / 2 - 54, 71);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 + 6, 62); ctx.lineTo(W / 2 + 6, 82); ctx.stroke();
    ctx.save(); ctx.shadowColor = 'rgba(159,224,160,0.5)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#9fe0a0'; ctx.font = 'bold 15px Arial';
    ctx.fillText('◈ ' + scrap, W / 2 + 64, 71);
    ctx.restore();
    ctx.fillStyle = 'rgba(190,200,240,0.7)'; ctx.font = '9px Arial';
    ctx.fillText('Kur: 12 altın = 1 hurda', W / 2, 89);
    const drawRow = (label, opts, prefix, col, y) => {
      this._drawBand(ctx, 16, y, W - 32, label, col); y += 28;
      const bw = (W - 32 - 12) / 3;
      opts.forEach((o, i) => {
        const x = 16 + i * (bw + 6);
        this._drawCard(ctx, x, y, bw, 52, { r:8, accent: col });
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 6;
        ctx.fillStyle = col; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(o[1], x + bw / 2, y + 9); ctx.restore();
        // price chip
        ctx.font = 'bold 10px Arial';
        const pw = ctx.measureText(o[2]).width + 12;
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.roundRect(x + bw / 2 - pw / 2, y + 30, pw, 16, 8); ctx.fill();
        ctx.fillStyle = '#ffcf3f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o[2], x + bw / 2, y + 38);
        this.buttons.push({ id: prefix + o[0], x: x, y: y, w: bw, h: 52 });
      });
      return y + 68;
    };
    let y = 104;
    y = drawRow('HURDA AL (altınla)', [[10,'+10◈','⧆120'],[50,'+50◈','⧆600'],[100,'+100◈','⧆1200']], 'market_buyscrap_', '#9fe0a0', y);
    y = drawRow('HURDA SAT (%70 geri)', [[10,'-10◈','⧆84'],[50,'-50◈','⧆420'],[100,'-100◈','⧆840']], 'market_sellscrap_', '#ff9f6a', y);
  },

  // ── MISSIONS (GÜNLÜK GÖREVLER) ──────────────────────────────────────────────
  drawMissions(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,61,0,0.20)');
    this._drawHeader(ctx, W, '🎯  DAILY MISSIONS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    if (typeof Missions === 'undefined') return;
    const st = Missions.state();

    ctx.fillStyle = 'rgba(180,190,230,0.6)'; ctx.font = '10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Her gün yenilenir — ilerleme yarışlarda kaydedilir', W/2, 56);

    // overall completion chip (top-right of subtitle band)
    const _doneCt = st.list.filter(m => m.done).length, _totCt = st.list.length || 1;
    ctx.font = 'bold 9px Arial';
    const _cs = '✓ ' + _doneCt + '/' + _totCt;
    const _cw = ctx.measureText(_cs).width + 14;
    ctx.save(); ctx.shadowColor = 'rgba(46,204,113,0.5)'; ctx.shadowBlur = 5;
    ctx.fillStyle = 'rgba(46,204,113,0.18)'; ctx.beginPath(); ctx.roundRect(W - 14 - _cw, 52, _cw, 16, 8); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(46,204,113,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(W - 14 - _cw, 52, _cw, 16, 8); ctx.stroke();
    ctx.fillStyle = '#2ecc71'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(_cs, W - 14 - _cw / 2, 60);

    let y = 84;
    st.list.forEach((m) => {
      const d = Missions.def(m.id); if (!d) return;
      const cardH = 78, pct = Math.max(0, Math.min(1, m.prog / d.goal));
      const acc = m.done ? '#2ecc71' : this.C.fire;
      this._drawCard(ctx, 14, y, W-28, cardH, { r:10, accent: acc, active: m.done && !m.claimed, glow: m.done && !m.claimed });
      // metin
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(d.text, 28, y + 12);
      ctx.fillStyle = '#ffd21e'; ctx.font = 'bold 12px Arial';
      ctx.fillText('⧆ ' + d.reward, 28, y + 32);
      // ilerleme barı
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(28, y + 52, W - 200, 10, 5); ctx.fill();
      const mpc = m.done ? this.C.green : '#3aa0ff';
      ctx.save(); ctx.shadowColor = mpc; ctx.shadowBlur = 5;
      ctx.fillStyle = mpc; ctx.beginPath(); ctx.roundRect(28, y + 52, Math.max(4,(W - 200) * pct), 10, 5); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '10px Arial'; ctx.textAlign = 'left';
      ctx.fillText(Math.floor(m.prog) + ' / ' + d.goal, 28, y + 64);
      // percent label at bar end
      ctx.fillStyle = m.done ? this.C.green : '#8fb8ff'; ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(Math.round(pct * 100) + '%', 28 + (W - 200), y + 49);
      ctx.textBaseline = 'top';
      // buton (topla / tamamlandı / durum)
      const bw = 96, bx = W - 14 - bw - 8, by = y + 20, bh = 44;
      if (m.claimed) {
        ctx.fillStyle = 'rgba(46,204,113,0.2)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
        ctx.fillStyle = this.C.green; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✓ ALINDI', bx + bw/2, by + bh/2);
      } else if (m.done) {
        this._drawFireBtn(ctx, bx, by, bw, bh, 'TOPLA');
        this.buttons.push({ id: 'claim_mission_' + m.id, x: bx, y: by, w: bw, h: bh });
      } else {
        ctx.fillStyle = 'rgba(40,44,66,0.8)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
        ctx.fillStyle = 'rgba(180,190,230,0.6)'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('DEVAM', bx + bw/2, by + bh/2);
      }
      y += cardH + 12;
    });

    const allDone = st.list.every(m => m.done && !m.claimed);
    if (allDone && st.list.some(m => !m.claimed)) {
      this._drawCyanBtn(ctx, 14, y + 4, W - 28, 44, '🎁  HEPSİNİ TOPLA');
      this.buttons.push({ id: 'claim_all_missions', x: 14, y: y + 4, w: W - 28, h: 44 });
    }
  },

  // ── ENVIRONMENT (ORTAM AYAR PANELİ) ─────────────────────────────────────────
  drawEnvironment(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(0,204,255,0.18)');
    this._drawHeader(ctx, W, '🌦  ENVIRONMENT');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];
    const S = (typeof Environment !== 'undefined') ? Environment.settings
              : { dayNight:'auto', weather:'auto', obstacles:false, disasters:false, endless:false };

    let y = 66;
    const rowOpts = (label, opts, curVal, prefix) => {
      ctx.fillStyle = this.C.fire; ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label, 16, y); y += 20;
      const gap = 6, n = opts.length, bw = (W - 32 - gap*(n-1)) / n, bh = 44;
      opts.forEach((o, i) => {
        const x = 16 + i*(bw+gap), on = curVal === o.val;
        ctx.save();
        if (on) {
          ctx.shadowColor = this.C.fire; ctx.shadowBlur = 8;
          const og = ctx.createLinearGradient(x, y, x, y+bh);
          og.addColorStop(0, '#FF5500'); og.addColorStop(1, '#CC1A00');
          ctx.fillStyle = og;
        } else { ctx.fillStyle = 'rgba(20,22,40,0.85)'; }
        ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 7); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 7); ctx.stroke();
        ctx.fillStyle = on ? '#fff' : '#cfd6ff'; ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.lbl, x+bw/2, y+bh/2);
        this.buttons.push({ id: prefix + o.val, x: x, y: y, w: bw, h: bh });
      });
      y += bh + 16;
    };
    rowOpts('DAY / NIGHT', [{lbl:'OFF',val:'off'},{lbl:'DAY',val:'day'},{lbl:'NIGHT',val:'night'},{lbl:'AUTO',val:'auto'}], S.dayNight, 'env_day_');
    rowOpts('WEATHER', [{lbl:'AUTO',val:'auto'},{lbl:'CLEAR',val:'clear'},{lbl:'RAIN',val:'rain'},{lbl:'SNOW',val:'snow'},{lbl:'FOG',val:'fog'},{lbl:'WIND',val:'wind'}], S.weather, 'env_wx_');

    const toggleRow = (label, desc, on, id) => {
      this._drawCard(ctx, 16, y, W-32, 46, { r:8, accent: on ? this.C.fire : null, active: on });
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(label, 26, y+8);
      ctx.fillStyle = 'rgba(200,210,255,0.6)'; ctx.font = '9px Arial'; ctx.fillText(desc, 26, y+27);
      const sw = 52, sh = 26, sx = W - 16 - sw - 10, sy = y + 10;
      ctx.save(); if (on) { ctx.shadowColor = this.C.fire; ctx.shadowBlur = 8; }
      ctx.fillStyle = on ? this.C.fire : '#333a55'; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 13); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(on ? sx+sw-13 : sx+13, sy+sh/2, 10, 0, 6.28); ctx.fill();
      this.buttons.push({ id: id, x: 16, y: y, w: W-32, h: 46 });
      y += 54;
    };
    toggleRow('OBSTACLES', 'Kaya, testere, çivi, trambolin, rampa, altın halka', !!S.obstacles, 'env_obstacles');
    toggleRow('NATURAL DISASTERS', 'Meteor yağmuru, deprem, çığ', !!S.disasters, 'env_disasters');
    toggleRow('DAMAGE / DEFORMATION', 'Sert çarpmada araç hasar alır ve imha olur', !!S.damage, 'env_damage');
    toggleRow('ENDLESS MODE', 'Mesafeyle artan zorluk', !!S.endless, 'env_endless');

    // Prominent gateway to the 1000 disaster/environment settings list.
    y += 2;
    const btnH = 44;
    ctx.save();
    ctx.shadowColor = this.C.fire; ctx.shadowBlur = 12;
    const bg = ctx.createLinearGradient(16, y, 16, y + btnH);
    bg.addColorStop(0, '#FF6A00'); bg.addColorStop(1, '#CC1400');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(16, y, W - 32, btnH, 10); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(16, y, W - 32, btnH, 10); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('☄️ AFET & ORTAM AYARLARI (1000)', W / 2, y + btnH / 2);
    this.buttons.push({ id: 'env_open_settings', x: 16, y: y, w: W - 32, h: btnH });
    y += btnH + 10;

    ctx.fillStyle = 'rgba(180,190,230,0.55)'; ctx.font = '9px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Ayarlar sonraki yarışta uygulanır', W/2, y + 2);
  },

  // ── CUSTOMIZE (BOYA + LASTİK) ───────────────────────────────────────────────
  drawCustomize(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(170,34,255,0.20)');
    this._drawHeader(ctx, W, '🎨  CUSTOMIZE');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const vid = this._customizeVeh || SaveData.get('selectedVehicle') || 'jeep';
    const def = VehicleDefs[vid] || VehicleDefs.jeep;
    const paint = SaveData.getPaint ? SaveData.getPaint(vid) : null;
    const curTire = SaveData.getTire ? SaveData.getTire(vid) : 'standard';

    // ⚠ 28 Tmz — DÜZEN H ORANLARINDAN AKIŞA ÇEVRİLDİ.
    //   Eskiden her şey H'nin kesriyle konumlanıyordu (0.19/0.30/0.375/0.525/0.66).
    //   Yatay telefonda (H=360) bloklar ÜST ÜSTE BİNİYORDU ve renk kutuları
    //   30 px genişlikteydi (parmakla basılamaz). Artık yukarıdan aşağı akıyor;
    //   sığmazsa `_KAYDIRMALI` sarmalayıcısı kaydırıyor.
    const _darC  = (W < 620);   // sütun sayısı DAR GENİŞLİĞE bakar
    const _kisaC = (H < 520);   // önizleme boyu KISA YÜKSEKLİĞE bakar
    let cy = 64;

    // Araç önizleme — yüksekliği TAHMİN EDİLMEZ, araç tanımından HESAPLANIR.
    // (İlk denemede sabit 132 px varsaydım; yatayda araç adın ve ilk renk
    //  satırının ÜZERİNE taşıyordu. `_drawMenuCar` origin'i aks hizasında:
    //  gövde yukarı def.h, tekerler aşağı max(y+r) kadar uzanır.)
    // ⚠ `W - 40` dar ekranda yetersiz sınır: 320 px'de 280 verir (ekranın %87'si).
    //   Oransal sınır da şart.
    const _oncW  = Math.min(W - 40, W * 0.58, _kisaC ? 148 : 230);
    const _olc   = Math.min(2.8, _oncW / Math.max(def.w || 100, 1));
    // ⚠ `def.h` yalnız GÖVDE yüksekliği; kabin/roof onun üstüne çizilir. 1.0
    //   katsayısıyla aracın tavanı başlık şeridinin altında KESİLİYORDU (canlıda
    //   görüldü). 1.7 kabini de kapsıyor.
    const _ust   = (def.h || 46) * _olc * 1.7;
    const _alt   = Math.max.apply(null, (def.wheels && def.wheels.length ? def.wheels : [{ y:22, r:20 }])
                     .map(function (w) { return (w.y || 0) + (w.r || w.radius || 20); })) * _olc;
    const _oncH  = Math.round(_ust + _alt) + 14;
    const _oy    = cy + _ust + 7;                 // araç origin'i (aks hizası)

    const shg = ctx.createRadialGradient(W/2, _oy + _alt * 0.9, 6, W/2, _oy + _alt * 0.9, Math.max(60, _oncW * 0.42));
    shg.addColorStop(0, 'rgba(0,0,0,0.32)'); shg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shg; ctx.beginPath();
    ctx.ellipse(W/2, _oy + _alt * 0.9, _oncW * 0.42, 15, 0, 0, Math.PI*2); ctx.fill();
    ctx.save();
    ctx.translate(W / 2, _oy);
    this._drawMenuCar(ctx, vid, this.animTime, _oncW);
    ctx.restore();
    cy += _oncH;
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.min(26, Math.floor(W * 0.05)) + 'px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((def.name || vid).toUpperCase(), W / 2, cy + 12);
    cy += 32;

    const PAL = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e84393',
                 '#ffffff','#95a5a6','#34495e','#111111','#00b3d6','#ff2e63','#FFD700','#8e44ad'];
    const c1 = paint ? (paint.c1 || def.color)  : def.color;
    const c2 = paint ? (paint.c2 || def.color2) : def.color2;

    // Dar ekranda 6 sütun → hücre ≈ 50 px (44 px hedef sağlanır); geniş ekranda 8.
    const drawSwatches = (label, y, prefix, activeHex) => {
      ctx.fillStyle = this.C.fire; ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(label, 16, y);
      const y0 = y + 18;
      const per = _darC ? 6 : 8, gap = 6;
      const hucre = (W - 32 - gap * (per - 1)) / per;
      const size = Math.min(hucre, _darC ? 44 : 34);
      const satirH = Math.max(size, 44) + gap;
      PAL.forEach((hex, i) => {
        const col = i % per, row = Math.floor(i / per);
        const hx = 16 + col * (hucre + gap), hy = y0 + row * satirH;
        const x = hx + (hucre - size) / 2, yy = hy + (satirH - gap - size) / 2;
        const on = (activeHex && activeHex.toLowerCase() === hex.toLowerCase());
        ctx.save(); if (on) { ctx.shadowColor = hex; ctx.shadowBlur = 9; }
        ctx.fillStyle = hex; ctx.beginPath(); ctx.roundRect(x, yy, size, size, 5); ctx.fill(); ctx.restore();
        // gloss
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, yy, size, size, 5); ctx.clip();
        const swg = ctx.createLinearGradient(x, yy, x, yy + size*0.55);
        swg.addColorStop(0, 'rgba(255,255,255,0.35)'); swg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = swg; ctx.fillRect(x, yy, size, size*0.55); ctx.restore();
        ctx.strokeStyle = on ? '#fff' : 'rgba(0,0,0,0.4)'; ctx.lineWidth = on ? 3 : 1;
        ctx.beginPath(); ctx.roundRect(x, yy, size, size, 5); ctx.stroke();
        // Dokunma kutusu HÜCRENİN TAMAMI — görsel kutu küçük olsa da ≥44 px.
        this.buttons.push({ id: prefix + hex, x: hx, y: hy, w: hucre, h: satirH - gap });
      });
      return y0 + Math.ceil(PAL.length / per) * satirH;
    };
    cy = drawSwatches('PRIMARY COLOR',   cy, 'paint_c1_', c1) + 8;
    cy = drawSwatches('SECONDARY COLOR', cy, 'paint_c2_', c2) + 8;

    // Lastikler
    ctx.fillStyle = this.C.fire; ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('TIRES  (surface grip)', 16, cy);
    cy += 18;
    const tires = [['standard','STD'],['mud','MUD'],['ice','ICE'],['road','ROAD'],['offroad','OFF']];
    const tw = (W - 32 - 6 * 4) / 5;
    tires.forEach((tt, i) => {
      const x = 16 + i * (tw + 6), y = cy, h = 44;
      const on = curTire === tt[0];
      ctx.save();
      if (on) {
        ctx.shadowColor = this.C.fire; ctx.shadowBlur = 8;
        const tg = ctx.createLinearGradient(x, y, x, y+h);
        tg.addColorStop(0, '#FF5500'); tg.addColorStop(1, '#CC1A00'); ctx.fillStyle = tg;
      } else { ctx.fillStyle = 'rgba(20,22,40,0.85)'; }
      ctx.beginPath(); ctx.roundRect(x, y, tw, h, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = on ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, tw, h, 7); ctx.stroke();
      ctx.fillStyle = on ? '#fff' : '#cfd6ff'; ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(tt[1], x + tw / 2, y + h / 2);
      this.buttons.push({ id: 'tire_' + tt[0], x: x, y: y, w: tw, h: h });
    });

    // Renkleri sıfırla
    const ry = cy + 54;
    this._drawCyanBtn(ctx, 16, ry, W - 32, 44, '↺  RESET COLORS');
    this.buttons.push({ id:'reset_paint', x:16, y:ry, w:W - 32, h:44 });
  },

  // ── MAP SELECT ─────────────────────────────────────────────────────────────
  drawMapSelect(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(0,204,255,0.18)');
    this._drawHeader(ctx, W, '⊞  SELECT MAP');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const maps     = this._mapList();
    const unlocked = SaveData.get('unlockedMaps') || ['countryside'];
    const botMode  = this._botModeSelected || false;

    // Bot race toggle — BÜYÜK, dokunulabilir
    const toggleW = 172, toggleH = 44, toggleX = W - toggleW - 10, toggleY = 54;
    const _tg = ctx.createLinearGradient(toggleX, toggleY, toggleX, toggleY + toggleH);
    if (botMode) { _tg.addColorStop(0, 'rgba(255,90,20,0.9)'); _tg.addColorStop(1, 'rgba(200,50,0,0.9)'); }
    else { _tg.addColorStop(0, 'rgba(24,30,50,0.92)'); _tg.addColorStop(1, 'rgba(12,16,30,0.92)'); }
    ctx.fillStyle = _tg; ctx.beginPath(); ctx.roundRect(toggleX, toggleY, toggleW, toggleH, 10); ctx.fill();
    ctx.strokeStyle = botMode ? '#ffb020' : 'rgba(255,255,255,0.2)'; ctx.lineWidth = botMode ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(toggleX, toggleY, toggleW, toggleH, 10); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '22px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🤖', toggleX + 12, toggleY + toggleH / 2);
    ctx.font = 'bold 13px Arial'; ctx.fillStyle = botMode ? '#fff' : 'rgba(190,200,240,0.8)';
    ctx.fillText('BOT RACE', toggleX + 44, toggleY + toggleH / 2 - 7);
    ctx.font = 'bold 12px Arial'; ctx.fillStyle = botMode ? '#ffe08a' : 'rgba(150,160,200,0.7)';
    ctx.fillText(botMode ? 'ON' : 'OFF', toggleX + 44, toggleY + toggleH / 2 + 9);
    this.buttons.push({ id:'toggle_bot', x:toggleX, y:toggleY, w:toggleW, h:toggleH });

    // ── Bot seviye seçici (◀ ... ▶) — BOT RACE düğmesinin SOLUNDA, aynı satırda ──
    // (Mod satırının üstünde kalır; KARGO vb. ile çakışmaz, tam tıklanabilir.)
    if (botMode) {
      const _bl = Math.max(1, Math.min(20, (SaveData.get && SaveData.get('botLevel')) || 1));
      const _bveh = (_bl <= 5) ? 'Jeep' : (_bl <= 10) ? 'Rally' : 'Formula';
      const lvW = 146, lvH = toggleH, lvY = toggleY;
      const lvX = Math.max(58, toggleX - lvW - 8);   // düğmenin solu; dar ekranda geri butonunu ezmesin
      ctx.fillStyle = 'rgba(16,20,36,0.94)'; ctx.beginPath(); ctx.roundRect(lvX, lvY, lvW, lvH, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,176,32,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(lvX, lvY, lvW, lvH, 10); ctx.stroke();
      ctx.fillStyle = '#ffb020'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('◀', lvX + 22, lvY + lvH / 2);
      ctx.fillText('▶', lvX + lvW - 22, lvY + lvH / 2);
      ctx.fillStyle = (_bl >= 20) ? '#FFD700' : (_bl > 10) ? '#ffcf5a' : '#fff'; ctx.font = 'bold 13px Arial';
      ctx.fillText('SVY ' + _bl + '/20', lvX + lvW / 2, lvY + lvH / 2 - 7);
      ctx.fillStyle = 'rgba(200,210,240,0.75)'; ctx.font = 'bold 10px Arial';
      ctx.fillText(_bveh + (_bl >= 20 ? ' ⚡' : ''), lvX + lvW / 2, lvY + lvH / 2 + 8);
      this.buttons.push({ id:'bot_lvl_dec', x:lvX, y:lvY, w:46, h:lvH });
      this.buttons.push({ id:'bot_lvl_inc', x:lvX + lvW - 46, y:lvY, w:46, h:lvH });
    }

    // ── Oyun modu seçici ──
    const _modes = [['normal','NORMAL'],['race','RACE'],['timetrial','TIME'],['survival','SURV'],['boss','BOSS'],['ghostmp','GHOST'],['checkpoint','RUSH'],['coinrush','COIN'],['fueltrial','FUEL'],['delivery','KARGO']];
    const _curMode = this._selectedMode || 'normal';
    // MOBIL (28 Tmz): 10 mod tek sırada W=360'ta 34 px genişlik veriyordu —
    // parmakla isabetli basmak İMKÂNSIZ. Dar ekranda 2 sıra × 5 mod → 68 px.
    // ⚠ Sıra sayısı değişince altındaki ızgaranın üst sınırı da kayar (_mmToplamH).
    const _mmSut = (W < 620) ? 5 : _modes.length;
    const _mmSira = Math.ceil(_modes.length / _mmSut);
    const _mmW = (W - 20) / _mmSut, _mmY = 104, _mmH = 44;
    const _mmToplamH = _mmSira * _mmH + (_mmSira - 1) * 4;
    _modes.forEach((m, i) => {
      const _c = i % _mmSut, _r = Math.floor(i / _mmSut);
      const mx = 10 + _c * _mmW, my = _mmY + _r * (_mmH + 4), on = _curMode === m[0];
      ctx.save();
      if (on) {
        ctx.shadowColor = this.C.fire; ctx.shadowBlur = 7;
        const mmg = ctx.createLinearGradient(mx, my, mx, my + _mmH);
        mmg.addColorStop(0, '#FF5500'); mmg.addColorStop(1, '#CC1A00'); ctx.fillStyle = mmg;
      } else { ctx.fillStyle = 'rgba(10,10,22,0.75)'; }
      ctx.beginPath(); ctx.roundRect(mx, my, _mmW - 3, _mmH, 6); ctx.fill(); ctx.restore();
      ctx.strokeStyle = on ? '#fff' : 'rgba(255,255,255,0.15)'; ctx.lineWidth = on ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(mx, my, _mmW - 3, _mmH, 6); ctx.stroke();
      ctx.fillStyle = on ? '#fff' : 'rgba(180,190,230,0.7)'; ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m[1], mx + (_mmW - 3) / 2, my + _mmH / 2);
      this.buttons.push({ id: 'mode_' + m[0], x: mx, y: my, w: _mmW - 3, h: _mmH });
    });

    // ── Rich, scrollable "world select" grid ─────────────────────────────────
    const reduce = (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion') === true);
    const t      = reduce ? 0 : this.animTime;
    const highs  = SaveData.get('highScores') || {};
    const selIdx = Math.max(0, Math.min(maps.length - 1, Math.round(this._carMapTarget || 0)));

    // Fixed header/back/bot-toggle/mode-row stay above; a fixed action bar stays
    // below; the map grid scrolls between them. Own _mapSelScroll state — does
    // NOT collide with _mapGridScroll/_mapCfgScroll/_setGenScroll/_statsScroll/
    // _garagePartsScroll/_shopScroll/_sbGeom/_sbView.
    const pad = 12, gap = 10, cols = 2;
    const barH = 56, barY = H - barH - 8;
    const viewTop  = _mmY + _mmToplamH + 10;   // mod satırı 2 sıra olabilir (mobil)
    const viewH    = Math.max(90, (barY - 10) - viewTop);
    const cardW    = (W - pad * 2 - gap * (cols - 1)) / cols;
    const cardH    = 118;                         // ≥44px tappable card
    const rowStep  = cardH + gap;
    const rowCount = Math.ceil(maps.length / cols);
    const contentH = rowCount * rowStep - gap + 6;
    const maxScroll = Math.max(0, contentH - viewH);
    // Smooth scroll: wheel/drag/selection move a TARGET; the drawn position eases
    // toward it each frame (exp smoothing → inertial, non-jarring feel). Both the
    // eased value and its target are kept clamped to [0, maxScroll].
    if (this._mapSelScrollTarget === undefined) this._mapSelScrollTarget = this._mapSelScroll || 0;
    this._mapSelScroll       = Math.max(0, Math.min(maxScroll, this._mapSelScroll || 0));
    this._mapSelScrollTarget = Math.max(0, Math.min(maxScroll, this._mapSelScrollTarget));
    this._mapSelView   = { top: viewTop, h: viewH, viewH: viewH, maxScroll: maxScroll };
    this._ensureMapSelInput();

    // Keep the selected card visible when selection changes via arrows/tap,
    // but never fight an in-progress finger scroll. Retargets (animation eases in).
    if (this._mapSelLastSel !== selIdx && !this._mapSelDragging) {
      const rTop = Math.floor(selIdx / cols) * rowStep;
      const rBot = rTop + cardH;
      if (rTop - this._mapSelScrollTarget < 0) this._mapSelScrollTarget = rTop;
      else if (rBot - this._mapSelScrollTarget > viewH) this._mapSelScrollTarget = rBot - viewH;
      this._mapSelScrollTarget = Math.max(0, Math.min(maxScroll, this._mapSelScrollTarget));
    }
    this._mapSelLastSel = selIdx;

    // Exponential ease toward target — frame-rate independent via dt.
    const _msDt = Math.min(0.05, this._lastDt || 0.016);
    const _msK  = 1 - Math.exp(-14 * _msDt);   // rate 14 ≈ smooth but responsive
    this._mapSelScroll += (this._mapSelScrollTarget - this._mapSelScroll) * _msK;
    if (Math.abs(this._mapSelScrollTarget - this._mapSelScroll) < 0.15) this._mapSelScroll = this._mapSelScrollTarget;
    this._mapSelScroll = Math.max(0, Math.min(maxScroll, this._mapSelScroll));
    const sc = this._mapSelScroll;

    // Atmospheric inset panel behind the grid
    ctx.save();
    ctx.beginPath(); ctx.roundRect(pad - 4, viewTop - 4, W - (pad - 4) * 2, viewH + 8, 14); ctx.clip();
    ctx.fillStyle = 'rgba(6,9,18,0.55)'; ctx.fillRect(pad - 4, viewTop - 4, W - (pad - 4) * 2, viewH + 8);
    const _pg = ctx.createRadialGradient(W / 2, viewTop + viewH * 0.35, 20, W / 2, viewTop + viewH * 0.5, W * 0.75);
    _pg.addColorStop(0, 'rgba(0,204,255,0.06)'); _pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = _pg; ctx.fillRect(pad - 4, viewTop - 4, W - (pad - 4) * 2, viewH + 8);
    ctx.restore();

    // Clipped, culled card grid
    this._mapSelCards = [];
    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();
    for (let i = 0; i < maps.length; i++) {
      const cc = i % cols, rr = Math.floor(i / cols);
      const cx = pad + cc * (cardW + gap);
      const cy = viewTop + rr * rowStep - sc;
      if (cy + cardH <= viewTop || cy >= viewTop + viewH) continue;   // cull off-screen (no hitbox)
      this._mapSelCards.push({ x: cx, y: cy, w: cardW, h: cardH, idx: i });
      this._drawWorldCard(ctx, cx, cy, cardW, cardH, maps[i], i, unlocked.includes(maps[i].id), highs, selIdx === i, t, reduce);
    }
    ctx.restore();

    // Overflow affordances: edge fades + slim scrollbar
    if (maxScroll > 0) {
      const fh = 18;
      if (sc > 1) { const fg = ctx.createLinearGradient(0, viewTop, 0, viewTop + fh); fg.addColorStop(0, 'rgba(4,7,14,0.9)'); fg.addColorStop(1, 'rgba(4,7,14,0)'); ctx.fillStyle = fg; ctx.fillRect(pad - 4, viewTop, W - (pad - 4) * 2, fh); }
      if (sc < maxScroll - 1) { const fg2 = ctx.createLinearGradient(0, viewTop + viewH - fh, 0, viewTop + viewH); fg2.addColorStop(0, 'rgba(4,7,14,0)'); fg2.addColorStop(1, 'rgba(4,7,14,0.9)'); ctx.fillStyle = fg2; ctx.fillRect(pad - 4, viewTop + viewH - fh, W - (pad - 4) * 2, fh); }
      const trkX = W - 5, trkH = viewH - 8;
      const thH = Math.max(28, trkH * (viewH / contentH));
      const thY = viewTop + 4 + (trkH - thH) * (sc / maxScroll);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.roundRect(trkX, viewTop + 4, 3, trkH, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(0,204,255,0.55)'; ctx.beginPath(); ctx.roundRect(trkX, thY, 3, thH, 1.5); ctx.fill();
    }

    // ── Fixed bottom action bar: ◄ prev_map | START/LOCKED play_map | next_map ─
    const sideW = 52;
    const arH = 48, arY = barY + (barH - arH) / 2;
    this._drawIconBtn(ctx, pad, arY, sideW - 4, arH, '◄', selIdx > 0);
    this.buttons.push({ id:'prev_map', x:pad, y:barY, w:sideW, h:barH });
    this._drawIconBtn(ctx, W - pad - (sideW - 4), arY, sideW - 4, arH, '►', selIdx < maps.length - 1);
    this.buttons.push({ id:'next_map', x:W - pad - sideW, y:barY, w:sideW, h:barH });

    const selMap = maps[selIdx];
    const isUnl  = unlocked.includes(selMap.id);
    const cX = pad + sideW + 8;
    const cW = (W - pad - sideW - 8) - cX;
    if (isUnl) {
      const label = botMode ? '🤖 RACE WITH BOT' : '▶ START RACE';
      this._drawFireBtn(ctx, cX, barY, cW, barH, label);
      this.buttons.push({ id:'play_map', x:cX, y:barY, w:cW, h:barH });
    } else {
      this._drawDarkBtn(ctx, cX, barY, cW, barH, '🔒 LOCKED');
    }
  },

  // One rich, tappable "world" card: biome thumbnail + name + best distance
  // (meters) + locked/selected state + a subtle derived difficulty hint.
  _drawWorldCard(ctx, x, y, w, h, map, idx, unlocked, highs, selected, t, reduce) {
    const rad = 12;
    const thumbH = Math.round(h * 0.60);
    const infoY = y + thumbH, infoH = h - thumbH;
    const acc = unlocked ? (map.col2 || this.C.cyan) : 'rgba(120,130,170,0.5)';

    ctx.save();
    // Press feedback — scale only, respects reducedMotion (150–300ms window)
    if (!reduce && this._mapSelPress && this._mapSelPress.idx === idx) {
      const el = this.animTime - this._mapSelPress.t0;
      if (el >= 0 && el < 0.2) {
        const s = 0.94 + 0.06 * (el / 0.2);
        ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
      }
    }

    // Base + drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#0c1020';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.fill();
    ctx.restore();

    // Thumbnail (biome scene) with legibility scrim; dimmed + locked when locked
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, thumbH, [rad, rad, 0, 0]); ctx.clip();
    this._mapScene(ctx, x, y, w, thumbH + 14, map);
    const sg = ctx.createLinearGradient(x, y, x, y + thumbH);
    sg.addColorStop(0, 'rgba(0,0,0,0.30)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = sg; ctx.fillRect(x, y, w, thumbH);
    if (!unlocked) {
      ctx.fillStyle = 'rgba(4,6,12,0.62)'; ctx.fillRect(x, y, w, thumbH);
      ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(210,218,248,0.9)';
      ctx.fillText('🔒', x + w / 2, y + thumbH / 2 - 1);
    } else {
      // Derived difficulty hint (non-emoji pips — later maps rank harder)
      const diff = Math.min(3, 1 + Math.floor(idx / 12));
      const pw2 = 5, pgap = 3, py2 = y + 8;
      const px2 = x + w - 8 - (pw2 * 3 + pgap * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.roundRect(px2 - 4, py2 - 3, pw2 * 3 + pgap * 2 + 8, 10, 4); ctx.fill();
      for (let d = 0; d < 3; d++) {
        ctx.fillStyle = d < diff ? acc : 'rgba(255,255,255,0.22)';
        ctx.fillRect(px2 + d * (pw2 + pgap), py2, pw2, 4);
      }
    }
    ctx.restore();

    // Info strip
    ctx.fillStyle = selected ? 'rgba(20,27,46,0.97)' : 'rgba(11,14,25,0.97)';
    ctx.beginPath(); ctx.roundRect(x, infoY, w, infoH, [0, 0, rad, rad]); ctx.fill();
    ctx.fillStyle = acc; ctx.fillRect(x, infoY + 4, 3, infoH - 8);

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = unlocked ? '#FFFFFF' : 'rgba(150,160,200,0.55)';
    ctx.font = 'bold 12px Impact, Arial Black';
    ctx.fillText(map.name, x + 10, infoY + infoH * 0.34, w - 18);

    ctx.font = 'bold 10px Arial';
    if (unlocked) {
      const best = highs[map.id] || 0;
      if (best > 0 && typeof SaveData.getRank === 'function') {
        const rank = SaveData.getRank(best);
        ctx.fillStyle = (SaveData.getRankColor ? SaveData.getRankColor(rank) : '#FFD24A');
        const dtxt = (typeof Economy !== 'undefined' && Economy.formatDistance) ? Economy.formatDistance(best) : (best + ' m');
        ctx.fillText('★ ' + this._rankEN(rank) + '  ' + dtxt, x + 10, infoY + infoH * 0.72, w - 18);
      } else {
        ctx.fillStyle = 'rgba(160,170,210,0.6)';
        ctx.fillText('NO RECORD YET', x + 10, infoY + infoH * 0.72, w - 18);
      }
    } else {
      ctx.fillStyle = 'rgba(150,160,200,0.6)';
      ctx.fillText('🔒 LOCKED', x + 10, infoY + infoH * 0.72, w - 18);
    }

    // Selection glow / idle hairline border
    if (selected) {
      ctx.save();
      if (!reduce) { const gp = 0.5 + 0.5 * Math.sin(t * 3); ctx.shadowColor = unlocked ? acc : 'rgba(170,180,220,0.8)'; ctx.shadowBlur = 8 + gp * 8; }
      ctx.strokeStyle = unlocked ? acc : 'rgba(180,190,225,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(x + 1.25, y + 1.25, w - 2.5, h - 2.5, rad); ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, rad); ctx.stroke();
    }
    ctx.restore();
  },

  // One-time, screen-scoped input for the SELECT MAP grid: mouse wheel + finger
  // scroll over the clipped viewport, plus tap-to-select (sets _carMapTarget —
  // the SAME state the ◄/► arrows and START button already read, so main.js
  // dispatch is untouched). Modeled on _ensureStatsWheel/_ensureGarageWheel.
  _ensureMapSelInput() {
    if (this._mapSelInputHooked || !this.canvas) return;
    this._mapSelInputHooked = true;
    const cv = this.canvas;
    // ⚡ PERF(31 Tmz): `_cvRect()` önbelleği — eskiden her hareket olayında
    //   `getBoundingClientRect()` = 1 zorunlu yeniden düzen.
    const xy = (src) => { const r = this._cvRect(); return { x: (src.clientX - r.left)*r.sx, y: (src.clientY - r.top)*r.sy }; };
    const inView = (p) => { const v = this._mapSelView; return !!(v && p.y >= v.top && p.y <= v.top + v.h); };
    let downX = 0, downY = 0, downScroll = 0, moved = false;

    const start = (src) => {
      if (this.currentScreen !== 'mapselect' || !src) return;
      const p = xy(src);
      if (!inView(p)) { this._mapSelDragging = false; return; }
      this._mapSelDragging = true; moved = false;
      downX = p.x; downY = p.y; downScroll = (this._mapSelScrollTarget != null ? this._mapSelScrollTarget : (this._mapSelScroll || 0));
    };
    const move = (src) => {
      if (!this._mapSelDragging || this.currentScreen !== 'mapselect' || !src) return;
      const p = xy(src);
      const dy = p.y - downY, dx = p.x - downX;
      if (Math.abs(dy) > 5 || Math.abs(dx) > 5) moved = true;
      if (Math.abs(dy) >= Math.abs(dx)) {
        const v = this._mapSelView;
        if (v && v.maxScroll > 0) this._mapSelScrollTarget = Math.max(0, Math.min(v.maxScroll, downScroll - dy));
      }
    };
    const end = (src) => {
      if (!this._mapSelDragging) return;
      this._mapSelDragging = false;
      if (moved || this.currentScreen !== 'mapselect' || !src) return;
      const p = xy(src);
      const cards = this._mapSelCards || [];
      for (const c of cards) {
        if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
          this._carMapTarget = c.idx;
          this._mapSelPress = { idx: c.idx, t0: this.animTime };
          if (typeof Audio !== 'undefined' && Audio.playMenuClick) { try { Audio.playMenuClick(); } catch (e) {} }
          break;
        }
      }
    };

    cv.addEventListener('mousedown', (e) => start(e), { passive: true });
    window.addEventListener('mousemove', (e) => move(e), { passive: true });
    window.addEventListener('mouseup', (e) => end(e));
    cv.addEventListener('touchstart', (e) => start(e.touches && e.touches[0]), { passive: true });
    cv.addEventListener('touchmove', (e) => move(e.touches && e.touches[0]), { passive: true });
    cv.addEventListener('touchend', (e) => end(e.changedTouches && e.changedTouches[0]), { passive: true });
    cv.addEventListener('wheel', (e) => {
      if (this.currentScreen !== 'mapselect') return;
      const v = this._mapSelView;
      if (!v || v.maxScroll <= 0) return;
      e.preventDefault();
      const step = Math.max(60, Math.round(v.viewH * 0.35));
      const _base = (this._mapSelScrollTarget != null ? this._mapSelScrollTarget : (this._mapSelScroll || 0));
      this._mapSelScrollTarget = Math.max(0, Math.min(v.maxScroll, _base + (e.deltaY > 0 ? step : -step)));
    }, { passive: false });
  },

  // ── GARAGE ────────────────────────────────────────────────────────────────
  drawGarage(ctx, W, H) {
    const reduce = (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion') === true);
    const t = reduce ? 0 : this.animTime;

    this._drawScreenBg(ctx, W, H, 'rgba(255,61,0,0.18)');
    this._drawGarageBay(ctx, W, H);          // atmospheric workshop grid + metal floor
    this._drawHeader(ctx, W, '⛋  GARAGE');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const vid    = SaveData.get('selectedVehicle') || 'jeep';
    const def    = VehicleDefs[vid] || VehicleDefs.jeep;
    const upg    = (SaveData.get('upgrades') || {})[vid] || { engine:1, suspension:1, tires:1, fuel:1 };
    const gold   = SaveData.get('gold') || 0;

    // Tab bar: UPGRADE | PARTS  (≥44px touch height)
    const tabs = ['⬆ UPGRADE', '⚙ PARTS'];
    const tabW = (W - 20) / 2;
    const tabY = 56, tabH = 44;
    tabs.forEach((tab, ti) => {
      const tx = 10 + ti * tabW;
      const isAct = ti === (this._garageTab || 0);
      this._drawTab(ctx, tx, tabY, tabW - 2, tabH, tab, isAct, this.C.fire);
      this.buttons.push({ id:'garage_tab_' + ti, x:tx, y:tabY, w:tabW-2, h:tabH });
    });

    // Advanced Upgrade Button  (≥44px)
    const upgBtnW = Math.min(220, W - 40), upgBtnX = W/2 - upgBtnW/2;
    const upgBtnY = tabY + tabH + 6;  // tab bar altı
    this._drawPill(ctx, upgBtnX, upgBtnY, upgBtnW, 44, '⚡ ADVANCED UPGRADE', this.C.gold, { dark:true });
    this.buttons.push({ id:'open_upgrades', x:upgBtnX, y:upgBtnY, w:upgBtnW, h:44 });

    // ▶ Alt sabit satır: [⚡ NİTRO %X → DOLDUR]  [HARİTAYA GİT]
    {
      const _rowY = H - 56, _rowH = 46, _pad = 10;
      const _nitW = Math.max(120, Math.min(160, (W - _pad * 3) * 0.42));
      const _goW  = Math.min(240, W - _pad * 3 - _nitW);
      const _nitX = _pad, _goX = W - _pad - _goW;
      const _res  = (SaveData.getNitroReserve ? SaveData.getNitroReserve() : 0);
      const _full = _res >= 100;
      // Nitro pill arkalığı
      const _ng = ctx.createLinearGradient(_nitX, _rowY, _nitX, _rowY + _rowH);
      _ng.addColorStop(0, 'rgba(20,26,46,0.95)'); _ng.addColorStop(1, 'rgba(8,12,24,0.95)');
      ctx.fillStyle = _ng; ctx.beginPath(); ctx.roundRect(_nitX, _rowY, _nitW, _rowH, 10); ctx.fill();
      ctx.strokeStyle = _full ? 'rgba(120,130,160,0.5)' : 'rgba(90,210,255,0.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(_nitX, _rowY, _nitW, _rowH, 10); ctx.stroke();
      // depo çubuğu
      const _barX = _nitX + 10, _barY = _rowY + _rowH - 11, _barW = _nitW - 20, _barH = 5;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.roundRect(_barX, _barY, _barW, _barH, 3); ctx.fill();
      ctx.fillStyle = '#39c6ff'; ctx.beginPath(); ctx.roundRect(_barX, _barY, _barW * (_res / 100), _barH, 3); ctx.fill();
      ctx.fillStyle = '#bfe9ff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('⚡ NİTRO %' + _res, _nitX + 10, _rowY + 12);
      ctx.fillStyle = _full ? '#8a92a8' : '#ffcf3f'; ctx.font = 'bold 9.5px Arial';
      ctx.fillText(_full ? 'DEPO DOLU' : 'DOLDUR  10.000 → %25', _nitX + 10, _rowY + 25);
      if (!_full) this.buttons.push({ id:'buy_nitro', x:_nitX, y:_rowY, w:_nitW, h:_rowH });
      // Haritaya git
      this._drawFireBtn(ctx, _goX, _rowY, _goW, _rowH, '▶ HARİTAYA GİT');
      this.buttons.push({ id:'garage_to_map', x:_goX, y:_rowY, w:_goW, h:_rowH });
    }

    // Vehicle preview on a glowing display pad
    const vehY = upgBtnY + 44 + 22;

    // 🔴 MOBİLDE ARAÇ ÇOK KÜÇÜK ÇİZİLİR (28 Tmz).
    //   Alçak ekranda (yatay telefon, H≈390) sabit 240 px genişlik aracın
    //   sekmeleri örtmesine ve yükseltme listesine ~96 px kalmasına yol açıyordu.
    //   ⚠ Bu üç sabit, aşağıdaki ışık pedi bloğundan ÖNCE tanımlanmalı —
    //     `const` TDZ'dir; sonra tanımlarsan ped çiziminde ReferenceError atar.
    const _dar = (H < 520);                       // yatay telefon / küçük pencere
    // 🔴 GENİŞLİK DE HESABA KATILMALI (29 Tmz): `_dar` yalnız H'ye bakıyordu.
    //   320×568 gibi DAR-DİKEY telefonda `_dar` false olduğu için araç 240 px
    //   kalıyor ve ekran genişliğinin **%75'ini** kaplıyordu (ölçüldü).
    const _aracW = _dar ? Math.min(120, W * 0.30) // mobil yatay: çok daha küçük
                        : Math.min(240, W * 0.58); // dikey: ekranla ölçeklenir
    // Yatay telefonda liste sağ yarıda → araç SOL yarının ortasına alınır,
    // yoksa listenin üstüne biner. (Dikey ve masaüstünde ortada kalır.)
    const _aracX = (_dar && W > H) ? Math.round(W * 0.23) : W / 2;

    // soft glowing display pad under the car
    {
      const _gp = 0.5 + 0.5 * Math.sin(t * 2);
      ctx.save();
      ctx.shadowColor = this.C.fire; ctx.shadowBlur = 14 + _gp * 8;
      const _pad = ctx.createRadialGradient(_aracX, vehY + 18, 4, _aracX, vehY + 18, W*0.28);
      _pad.addColorStop(0, 'rgba(255,90,20,0.30)'); _pad.addColorStop(0.6, 'rgba(255,61,0,0.08)'); _pad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = _pad; ctx.beginPath(); ctx.ellipse(_aracX, vehY + 18, (_dar && W > H ? W*0.16 : W*0.24), 14, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.translate(_aracX, vehY); this._drawMenuCar(ctx, vid, t, _aracW); ctx.restore();

    // Ad ve ustalık satırları da dar ekranda araca yakınlaşır (boşluk kazanılır)
    const _adDy  = _dar ? 16 : 28;
    const _mstDy = _dar ? 28 : 44;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold ' + (_dar ? 11 : 13) + 'px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText((def.name || vid).toUpperCase(), _aracX, vehY + _adDy);
    // Vehicle mastery level (★) — increases as you drive this vehicle
    const _ml = SaveData.getMasteryLevel ? SaveData.getMasteryLevel(vid) : 1;
    ctx.fillStyle = '#FFD24A'; ctx.font = 'bold ' + (_dar ? 9 : 10) + 'px Arial';
    ctx.fillText('★ MASTERY ' + _ml + '/10', _aracX, vehY + _mstDy);

    const tab = this._garageTab || 0;

    if (tab === 0) {
      // ── Upgrades ──────────────────────────────────────────────────────────
      // Dar ekranda liste yukarı çekilir → görünür satır sayısı 1,8'den ~3,4'e çıkar.
      const statsY = vehY + (_dar ? 40 : 60);
      const statList = [
        { key:'engine',     label:'ENGINE',      col: this.C.fire },
        { key:'suspension', label:'SUSPENSION',  col: '#00BBFF' },
        { key:'tires',      label:'TIRES',       col: '#00DD44' },
        { key:'fuel',       label:'FUEL',        col: '#FFAA00' }
      ];
      // Formula-specific: GRAVITY (ground grip) upgrade
      if (vid === 'formula') statList.push({ key:'gravity', label:'GRAVITY', col: '#B266FF' });

      // ── Scrollable list viewport (own _garagePartsScroll state; isolated) ───
      // Fixed chrome (header, tabs, ADVANCED UPGRADE, HARİTAYA GİT) lives OUTSIDE
      // this clipped region, so it stays reachable. Rows are offset by the scroll
      // and culled off-screen so their hitboxes are not registered (no phantom
      // clicks) and visible rows stay clickable at their real positions.
      // 🔴 YATAY TELEFONDA İKİ SÜTUN (28 Tmz).
      //   Alçak+geniş ekranda (800×360 gibi) liste için yalnız ~86 px kalıyordu
      //   → 4 yükseltmeden 2'si görünüyor, gerisi kaydırma gerektiriyordu.
      //   Yatayda bol YATAY yer var: araç sola, liste sağa alınır ve liste
      //   sekmelerin hemen altından başlar → 4 satır da tek ekrana sığar.
      const _yatayTel = _dar && (W > H);
      const _lstX = _yatayTel ? Math.round(W * 0.46) : 0;
      const _lstW = _yatayTel ? (W - _lstX) : W;
      const viewTop   = _yatayTel ? (tabY + tabH + 6) : statsY;
      const viewH     = Math.max(60, (H - 56 - 6) - viewTop);
      const contentH  = statList.length * 54;
      const maxScroll = Math.max(0, contentH - viewH);
      this._garagePartsScroll = Math.max(0, Math.min(maxScroll, this._garagePartsScroll || 0));
      const sc = this._garagePartsScroll;
      this._garageView = { viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll };
      this._ensureGarageWheel();

      ctx.save();
      ctx.beginPath(); ctx.rect(_lstX, viewTop, _lstW, viewH); ctx.clip();
      const _btnBas = this.buttons.length;   // ⬇ kırpma için başlangıç indeksi
      statList.forEach((s, si) => {
        const sy = viewTop + si * 54 - sc;
        if (sy + 54 <= viewTop || sy >= viewTop + viewH) return;   // cull off-screen (no hitbox)
        // Tavana kırp — SABİT SAYI DEĞİL (TUNING(2 Agu): tavan artık 25). Eskiden burada
        // Math.min(20, ...) vardı; seviye 20'nin üstündeyken arayüz "LV 20" ve
        // 20. seviyenin fiyatını gösteriyor, tıklayınca doUpgrade gerçek seviyeyi
        // görüp reddediyordu → "Yeterli altın yok!" yanılgısı.
        const lvl = Math.min(this._upMax(), upg[s.key] || 1);
        const cost = Economy.getUpgradeCost(s.key, lvl);
        this._drawGarageUpgradeRow(ctx, W, sy, s, lvl, cost, gold, t, reduce, _lstX, _lstW);
      });
      ctx.restore();
      this._kirpButonlar(_btnBas, viewTop, viewTop + viewH);
      this._drawGarageScrollInd(ctx, W, viewTop, viewH, sc, maxScroll, contentH);

    } else {
      // ── Parts ──────────────────────────────────────────────────────────────
      const partsY = vehY + 50;
      const partList = Object.values(Economy.PARTS);
      // Scrap balance (used to upgrade parts) — FIXED, above the scroll viewport
      ctx.fillStyle = '#9fe0a0'; ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText('◈ ' + (SaveData.getScrap ? SaveData.getScrap() : 0) + ' SCRAP', W - 12, partsY - 4);

      // ── Scrollable list viewport (own _garagePartsScroll state; isolated) ───
      // Fixed chrome stays OUTSIDE this clipped region. Rows (and the trailing
      // EQUIPPED card) are offset by the scroll and culled off-screen so their
      // hitboxes are not registered when out of view.
      const eqCardOff = partList.length * 58 + 8;   // EQUIPPED card offset within content
      const viewTop   = partsY;
      const viewH     = Math.max(60, (H - 56 - 6) - viewTop);
      const contentH  = eqCardOff + 32;             // part rows + EQUIPPED indicator
      const maxScroll = Math.max(0, contentH - viewH);
      this._garagePartsScroll = Math.max(0, Math.min(maxScroll, this._garagePartsScroll || 0));
      const sc = this._garagePartsScroll;
      this._garageView = { viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll };
      this._ensureGarageWheel();

      ctx.save();
      ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();

      const _btnBas2 = this.buttons.length;   // ⬇ kırpma için başlangıç indeksi
      partList.forEach((part, pi) => {
        const py = partsY + pi * 58 - sc;
        if (py + 50 <= viewTop || py >= viewTop + viewH) return;   // cull off-screen (no hitbox)
        const owned   = SaveData.ownsPart(part.id);
        const equip   = SaveData.isPartEquipped(part.id);

        this._drawCard(ctx, 10, py, W-20, 50, {
          r:10, accent: Economy.rarityColor(part.id), active: equip, glow: equip,
          fill: owned ? null : ['rgba(6,6,16,0.7)','rgba(4,4,12,0.7)']
        });
        // Rarity label (top-right of card)
        ctx.fillStyle = Economy.rarityColor(part.id); ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText((Economy.RARITY_NAMES[part.rarity] || ''), W - 14, py + 5);

        // Icon + Name
        ctx.font = '24px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(part.icon, 18, py + 25);
        ctx.fillStyle = owned ? '#FFFFFF' : 'rgba(150,160,200,0.6)';
        ctx.font = 'bold 12px Arial'; ctx.textBaseline = 'top'; ctx.fillText(part.name, 52, py + 8);
        ctx.fillStyle = owned ? this.C.dim : 'rgba(100,110,150,0.5)';
        ctx.font = '9px Arial';
        const desc = (part.desc||'').split('\n')[0];
        ctx.fillText(desc, 52, py + 26);

        if (owned) {
          const lv = SaveData.getPartLevel(part.id);
          const maxLv = Economy.PART_MAX_LEVEL;
          // Seviye rozeti
          ctx.font = 'bold 10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillStyle = this.C.diamond;
          ctx.fillText('Lv.' + lv + '/' + maxLv, 52, py + 38);

          // Hurdayla (◈) YÜKSELT butonu (TAK butonunun soluna)
          const ub = { x: W - 150, y: py + 3, w: 66, h: 44 };
          const upCost = Economy.partScrapCost(part.id, lv);
          if (upCost != null) {
            this._drawSmallBtn(ctx, ub.x, ub.y, ub.w, ub.h, '◈ ' + upCost, '#9fe0a0');
            this.buttons.push({ id:'upgrade_part_scrap_' + part.id, ...ub });
          } else {
            ctx.fillStyle = 'rgba(0,200,60,0.18)'; ctx.fillRect(ub.x, ub.y, ub.w, ub.h);
            ctx.fillStyle = this.C.green; ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('★ MAX', ub.x + ub.w/2, ub.y + ub.h/2);
          }

          const epW = 64, epH = 44, epX = W - 80, epY2 = py + 3;
          ctx.fillStyle = equip ? 'rgba(255,61,0,0.3)' : 'rgba(0,200,60,0.2)';
          ctx.fillRect(epX, epY2, epW, epH);
          ctx.fillStyle = equip ? this.C.fire : this.C.green;
          ctx.fillRect(epX, epY2, 2, epH);
          ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = equip ? this.C.fire : this.C.green;
          ctx.fillText(equip ? '✔ EQUIPPED' : '+ EQUIP', epX + epW/2, epY2 + epH/2);
          this.buttons.push({ id:'toggle_part_' + part.id, x:epX, y:epY2, w:epW, h:epH });
        } else {
          // Buy buttons
          const gb = { x:W-120, y:py+3, w:52, h:44 };
          const db = { x:W-64,  y:py+3, w:52, h:44 };
          this._drawSmallBtn(ctx, gb.x, gb.y, gb.w, gb.h, '⧆ ' + part.goldCost, this.C.gold);
          this._drawSmallBtn(ctx, db.x, db.y, db.w, db.h, '◆ ' + part.diamondCost, this.C.diamond);
          this.buttons.push(
            { id:'buy_part_gold_' + part.id,    ...gb },
            { id:'buy_part_diamond_' + part.id, ...db }
          );
        }
      });

      // Equipped indicator (scrolls with the list — last content row)
      const eq = SaveData.get('equippedParts') || [];
      const eqY = partsY + eqCardOff - sc;
      if (eqY + 32 > viewTop && eqY < viewTop + viewH) {
        this._drawCard(ctx, 10, eqY, W-20, 32, { r:8, accent:this.C.fire });
        ctx.fillStyle = this.C.fire; ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('EQUIPPED: ' + (eq.length > 0 ? eq.map(id => Economy.PARTS[id] && Economy.PARTS[id].name).filter(Boolean).join(' + ') : 'NONE'), W/2, eqY + 16);
      }

      ctx.restore();
      this._kirpButonlar(_btnBas2, viewTop, viewTop + viewH);
      this._drawGarageScrollInd(ctx, W, viewTop, viewH, sc, maxScroll, contentH);
    }
  },

  // ── KAYDIRILAN LİSTEDE HITBOX KIRPMA (29 Tmz) ────────────────────────────
  //
  //   🔴 CANLIDA ÖLÇÜLEN BUG: garajda liste kaydırılınca en üstteki yükseltme
  //   satırı SEKME ŞERİDİNİN ALTINA giriyor. Çizim `ctx.clip()` ile kırpılıyor
  //   ama BUTON KUTUSU tam yükseklikte kalıyordu → "MOTOR yükselt"e basmak
  //   `garage_tab_1`'i (sekme) tetikliyordu.
  //   15.535 tıklama denemesinin 1'i buydu; göz kararıyla asla bulunamazdı.
  //
  //   ▶ Kırpma `clip()` ile aynı dikey aralığa uygulanır. Görünür kısmı
  //     6 px'ten azsa kutu tamamen devre dışı bırakılır (y = -9999).
  //
  //   ⚠ Kendi kaydırması olan HER ekranda bu gerekir. `_kaydirmaliCiz`
  //     (genel sayfa kaydırma) aynı korumayı kendi içinde yapar.
  _kirpButonlar(bas, ust, alt) {
    for (let i = bas; i < this.buttons.length; i++) {
      const b = this.buttons[i];
      if (!b || typeof b.y !== 'number' || typeof b.h !== 'number') continue;
      const y0 = Math.max(b.y, ust), y1 = Math.min(b.y + b.h, alt);
      if (y1 - y0 < 6) { b.y = -9999; continue; }
      b.y = y0; b.h = y1 - y0;
    }
  },

  // One-time wheel hook for the GARAGE screen (own _garagePartsScroll state).
  // Isolated from the stats/settings/map scroll systems; only acts while the
  // garage screen is showing and its list actually overflows. Guarded so a
  // single listener is ever attached (mirrors _ensureStatsWheel/_ensureSetGenWheel).
  // 🔴 ORTAK DOKUNMATİK KAYDIRMA (28 Tmz) ────────────────────────────────────
  //   SORUN: garaj, ayarlar, mağaza, istatistik ve kariyer ekranlarının kaydırması
  //   YALNIZCA `wheel` (fare tekerleği) olayına bağlıydı. Telefonda tek bir
  //   `touchmove` dinleyicisi yoktu → parmakla aşağı kaydırmak FİZİKSEL OLARAK
  //   İMKÂNSIZDI. Yatay telefonda garajda listeye ~96 px kalıyor, TIRES/FUEL
  //   satırlarına hiç ulaşılamıyordu.
  //
  //   ▶ Bu yardımcı hem `wheel` hem `touchstart/touchmove/touchend` bağlar.
  //     · aktif(): bu ekran şu an görünür mü
  //     · gorunum(): { viewH, maxScroll } döndürür
  //     · oku()/yaz(): kaydırma değerini okur/yazar
  //
  //   ⚠ EŞİK ŞART: 6 px'den küçük hareket kaydırma sayılmaz — yoksa her dokunuş
  //     hafif kayma yüzünden kaydırmaya dönüşür ve BUTONLAR TIKLANAMAZ olur.
  //   ⚠ `_kaydiriliyor` bayrağı: kaydırma yapıldıysa parmak kalkınca tıklama
  //     ÜRETİLMEZ (handleClick bunu kontrol eder) — kaydırırken yanlışlıkla
  //     butona basılmasın.
  // ══════════════════════════════════════════════════════════════════════════
  // 🌊 YUMUŞAK KAYDIRMA KATMANI (31 Tmz — kullanıcı isteği: "kaydırma taş gibi")
  // ══════════════════════════════════════════════════════════════════════════
  // ESKİ DAVRANIŞ: her girdi `yaz()` ile kaydırma değerini DOĞRUDAN atıyordu.
  //   → tekerlek her tıkta 0.35×viewH ANINDA zıplıyordu (ara kare yok),
  //   → parmak kalkınca hareket ANINDA duruyordu (atalet yok).
  //   Bu yüzden "taş gibi" hissediliyordu. `_mapSelScroll` (harita seçimi) zaten
  //   hedef+easing kullanıyordu; o desen buraya GENELLEŞTİRİLDİ.
  //
  // YENİ DAVRANIŞ — üç kip, ASLA aynı anda çalışmazlar:
  //   1. `surukleniyor`  → parmak ekranda: 1:1 TAKİP (easing YOK).
  //      🔴 Parmağı easing'e bağlamak GECİKME hissi verir; sürükleme daima birebir.
  //   2. `hiz != 0`      → parmak kalktı: FIRLATMA (flick) ataleti, üstel sönüm.
  //   3. `hedef != null` → tekerlek/tuş/sayfa atlama: hedefe üstel yaklaşma.
  //
  // 🔴 Kare hızından BAĞIMSIZ: `1 - exp(-oran*dt)`. `dt*sabit` YAZMA — 30 fps'te
  //    yarı hızda, 144 fps'te aşırı hızlı olur (`_carVehIdx` bu hatayı yapıyor).
  // 🔴 `dt` KELEPÇELİ (≤50 ms): sekme arka plandayken dt devasa gelir ve kaydırma
  //    tek karede sona fırlar.
  // ⚠ Kaynak doğruluk `oku()/yaz()`tadır; hedef/hız YALNIZ burada tutulur — böylece
  //   ekranın kendi kelepçesi (`Math.min(maxScroll, ...)`) hâlâ son sözü söyler.
  _KAY: {
    oran:  13,     // hedefe yaklaşma hızı (büyük = daha çabuk oturur)
    sonum: 5.0,    // fırlatma sönümü (büyük = daha çabuk durur)
    esik:  6,      // px — bunun altı kaydırma sayılmaz (tıklamayı bozmasın)
    maxHiz: 2600,  // px/s — fırlatma tavanı (kontrolsüz savrulma olmasın)
    dur:   0.4,    // px — bu kadar kalınca hedefe otur (sonsuz mikro-hareket yok)
    // ÖLÇÜLDÜ: eşik 1 px/s iken 1800 px/s'lik bir fırlatma 1,50 sn sürüyordu ama
    // son ~0,9 sn'de kare başına 0,02 px ilerliyordu = GÖRÜNMEZ sürünme + boşuna
    // her karede yazma. 8 px/s'de görünür hareket bitince temiz duruyor (0,64 sn).
    durHiz: 8      // px/s — bunun altında fırlatma bitmiş sayılır
  },
  _kayKayit: {},

  // Her karede `UI.draw` başında çağrılır. Kayıtlı TÜM kaydırıcıları ilerletir.
  // ⚠ Aktif olmayan ekranın hızı/hedefi SIFIRLANIR — ekran değişince eski
  //   atalet devam edip yeni ekranı kaydırmasın.
  _kaydirmaTick(dt) {
    dt = Math.max(0.001, Math.min(0.05, dt || 0.016));
    const P = this._KAY, K = this._kayKayit;
    for (const ad in K) {
      const r = K[ad];
      try {
        if (!r.aktif()) { r.hiz = 0; r.hedef = null; continue; }
        const v = r.gorunum();
        if (!v || !(v.maxScroll > 0)) { r.hiz = 0; r.hedef = null; continue; }
        if (r.surukleniyor) { r.hiz = 0; r.hedef = null; continue; }   // kip 1

        const maxS = v.maxScroll;
        let d = r.oku() || 0;

        if (Math.abs(r.hiz) > P.durHiz) {                               // kip 2
          d += r.hiz * dt;
          r.hiz *= Math.exp(-P.sonum * dt);
          // Kenara çarpınca ataleti KES — yoksa sınırda titrer
          if (d <= 0)    { d = 0;    r.hiz = 0; }
          if (d >= maxS) { d = maxS; r.hiz = 0; }
          if (Math.abs(r.hiz) <= P.durHiz) r.hiz = 0;
          r.yaz(Math.max(0, Math.min(maxS, d)));
          continue;
        }
        r.hiz = 0;

        if (r.hedef != null) {                                          // kip 3
          r.hedef = Math.max(0, Math.min(maxS, r.hedef));
          d += (r.hedef - d) * (1 - Math.exp(-P.oran * dt));
          if (Math.abs(r.hedef - d) < P.dur) { d = r.hedef; r.hedef = null; }
          r.yaz(Math.max(0, Math.min(maxS, d)));
        }
      } catch (e) {}
    }
  },

  // Dışarıdan yumuşak kaydırma isteği (tuş/sayfa atlama buraya bağlanabilir).
  // Hedef ZATEN varsa onun üstüne biner → arka arkaya tekerlek tıkları BİRİKİR.
  _kayHedefeIt(ad, delta) {
    const r = this._kayKayit[ad];
    if (!r) return false;
    const v = r.gorunum(); if (!v || !(v.maxScroll > 0)) return false;
    r.hiz = 0;
    const bas = (r.hedef != null) ? r.hedef : (r.oku() || 0);
    r.hedef = Math.max(0, Math.min(v.maxScroll, bas + delta));
    return true;
  },

  _dokunmatikKaydirma(ad, aktif, gorunum, oku, yaz) {
    // Kayıt her çağrıda TAZELENİR (kapanışlar ekran durumunu yakalıyor olabilir),
    // ama olay dinleyicileri YALNIZ BİR KEZ bağlanır.
    const k = this._kayKayit[ad] || (this._kayKayit[ad] = { hedef: null, hiz: 0, surukleniyor: false });
    k.aktif = aktif; k.gorunum = gorunum; k.oku = oku; k.yaz = yaz;

    const bayrak = '_kaydHook_' + ad;
    if (this[bayrak] || !this.canvas) return;
    this[bayrak] = true;

    const adim = (v) => Math.max(60, Math.round(v.viewH * 0.35));

    this.canvas.addEventListener('wheel', (e) => {
      if (!aktif()) return;
      const v = gorunum();
      if (!v || v.maxScroll <= 0) return;
      e.preventDefault();
      // Anında atamak yerine HEDEFİ it — `_kaydirmaTick` araya kare koyar.
      this._kayHedefeIt(ad, e.deltaY > 0 ? adim(v) : -adim(v));
    }, { passive: false });

    let basY = 0, basDeger = 0, izliyor = false, kaydi = false;
    let sonY = 0, sonT = 0;

    this.canvas.addEventListener('touchstart', (e) => {
      if (!aktif()) return;
      const v = gorunum();
      if (!v || v.maxScroll <= 0) return;
      const t = e.touches[0]; if (!t) return;
      basY = t.clientY; basDeger = oku() || 0; izliyor = true; kaydi = false;
      sonY = t.clientY; sonT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      k.hiz = 0; k.hedef = null;          // devam eden atalet/easing'i parmak KESER
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!izliyor || !aktif()) return;
      const v = gorunum();
      if (!v || v.maxScroll <= 0) return;
      const t = e.touches[0]; if (!t) return;
      // Canvas ölçeği: CSS boyutu ile iç çözünürlük farklıysa hareket kayar
      // ⚡ PERF(31 Tmz): önbellekli — eskiden her `touchmove`'da zorunlu yeniden düzen.
      const sy = this._cvRect().sy;
      const dy = (basY - t.clientY) * sy;
      if (!kaydi && Math.abs(dy) < this._KAY.esik) return;  // eşik — tıklamayı bozmasın
      kaydi = true;
      k.surukleniyor = true;
      this._kaydiriliyor = true;                    // handleClick bunu görür
      if (e.cancelable) e.preventDefault();

      // Anlık hız kestirimi (fırlatma için). Üstel yumuşatma → tek kare gürültüsü
      // savurmaya dönüşmesin. ⚠ dtS=0 olabilir (aynı ms'te iki olay) → böl-sıfır.
      const su = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const dtS = (su - sonT) / 1000;
      if (dtS > 0.001) {
        const anlik = ((sonY - t.clientY) * sy) / dtS;
        k.hiz = k.hiz * 0.35 + anlik * 0.65;
        sonY = t.clientY; sonT = su;
      }
      yaz(Math.max(0, Math.min(v.maxScroll, basDeger + dy)));   // 1:1 — easing YOK
    }, { passive: false });

    const bitir = () => {
      izliyor = false;
      k.surukleniyor = false;
      // Parmak kalkmadan önce DURDUYSA (>90 ms hareketsiz) fırlatma SAYILMAZ —
      // yoksa kullanıcı listeyi tutup bıraktığında ekran kendi kendine kayar.
      const su = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (!kaydi || su - sonT > 90) k.hiz = 0;
      else k.hiz = Math.max(-this._KAY.maxHiz, Math.min(this._KAY.maxHiz, k.hiz));
      // Kaydırma bittikten hemen sonraki tıklamayı yut, sonra bayrağı temizle
      if (kaydi) setTimeout(() => { this._kaydiriliyor = false; }, 60);
      else this._kaydiriliyor = false;
    };
    this.canvas.addEventListener('touchend', bitir, { passive: true });
    this.canvas.addEventListener('touchcancel', bitir, { passive: true });
  },

  _ensureGarageWheel() {
    this._dokunmatikKaydirma('garage',
      () => this.currentScreen === 'garage',
      () => this._garageView,
      () => this._garagePartsScroll,
      (v) => { this._garagePartsScroll = v; });
  },

  // Minimal scroll affordance for the garage list: a slim right-edge track/thumb
  // plus ▲/▼ hint arrows. Own draw only — does not touch _drawScrollbar/_sbGeom.
  _drawGarageScrollInd(ctx, W, viewTop, viewH, sc, maxScroll, contentH) {
    if (maxScroll <= 0) return;
    const trackX = W - 6, trackY = viewTop + 2, trackH = viewH - 4;
    ctx.save();
    ctx.fillStyle = 'rgba(20,24,44,0.55)';
    ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
    const frac = Math.max(0, Math.min(1, viewH / contentH));
    const thumbH = Math.max(24, Math.round(trackH * frac));
    const thumbY = trackY + (trackH - thumbH) * (sc / maxScroll);
    ctx.fillStyle = 'rgba(255,90,20,0.78)';
    ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
    // ▲/▼ hint arrows (fade out at the ends of the range)
    ctx.fillStyle = 'rgba(255,150,90,0.9)';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (sc > 1)             ctx.fillText('▲', trackX + 2, viewTop + 8);
    if (sc < maxScroll - 1) ctx.fillText('▼', trackX + 2, viewTop + viewH - 8);
    ctx.restore();
  },

  // ── GARAGE-ONLY VISUAL HELPERS (performance / tuning-bay aesthetic) ────────
  // Atmospheric workshop backdrop: warm shop lighting, metallic wall panels and
  // a subtle receding floor grid. Drawn BEHIND all content (very low alpha so
  // card text stays fully legible). Static — no reduced-motion concern.
  _drawGarageBay(ctx, W, H) {
    ctx.save();
    // Warm overhead shop-light pool
    const lg = ctx.createRadialGradient(W/2, 34, 0, W/2, 34, W*0.9);
    lg.addColorStop(0, 'rgba(255,130,50,0.11)');
    lg.addColorStop(0.5, 'rgba(255,80,20,0.045)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H*0.62);

    // Metallic wall panels down each side (brushed vertical seams)
    const panelW = 24;
    ctx.globalAlpha = 0.55;
    [true, false].forEach((left) => {
      const px = left ? 0 : W - panelW;
      const pg = ctx.createLinearGradient(px, 0, px + panelW, 0);
      if (left) { pg.addColorStop(0, 'rgba(46,52,78,0.40)'); pg.addColorStop(1, 'rgba(28,32,50,0)'); }
      else      { pg.addColorStop(0, 'rgba(28,32,50,0)');    pg.addColorStop(1, 'rgba(46,52,78,0.40)'); }
      ctx.fillStyle = pg; ctx.fillRect(px, 56, panelW, H - 56);
      // panel bolt seams
      ctx.fillStyle = 'rgba(120,130,165,0.10)';
      for (let sy = 90; sy < H; sy += 46) ctx.fillRect(left ? panelW - 2 : px, sy, 2, 30);
    });

    // Receding perspective floor grid (lower third)
    const vpX = W/2, horizon = H*0.66;
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,110,40,0.10)';
    for (let i = 1; i <= 7; i++) {
      const f = i/7, y = horizon + (H - horizon) * (f*f);
      ctx.globalAlpha = 0.42 * (1 - f) + 0.12;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 0.22;
    for (let i = -6; i <= 6; i++) {
      const bx = W/2 + i * (W/6);
      ctx.beginPath(); ctx.moveTo(bx, H); ctx.lineTo(vpX + i*7, horizon); ctx.stroke();
    }
    ctx.restore();
  },

  // A single upgrade stat row: tuning dial (level gauge), stat label, a 0..20
  // progress bar and a dominant UPGRADE action pill. Registers the
  // `upgrade_<key>` hitbox (>=44px) so main.js dispatch keeps working.
  _drawGarageUpgradeRow(ctx, W, sy, s, lvl, cost, gold, t, reduce, x0, gen) {
    // 28 Tmz: yatay telefonda iki sutun icin x/genislik parametrelendi.
    //   Verilmezse eski davranis (tam genislik) — masaustu/dikey degismez.
    const _x0 = (typeof x0 === 'number') ? x0 : 0;
    const _gw = (typeof gen === 'number' && gen > 0) ? gen : W;
    const rowH  = 48;
    const maxed = (cost == null);
    const afford = !maxed && (gold >= cost);
    const _upMax = this._upMax();
    const frac  = Math.max(0, Math.min(1, lvl / _upMax));
    const pulse = reduce ? 1 : (0.8 + 0.2 * Math.sin(t * 3 + sy * 0.05));

    this._drawCard(ctx, _x0 + 10, sy, _gw - 20, rowH, {
      r:10, accent:s.col, active: afford || maxed, glow: afford || maxed
    });

    // ── Left tuning dial (circular level gauge) ──
    const cx = _x0 + 34, cy = sy + rowH/2, rr = 14;
    const gcol = maxed ? this.C.green : s.col;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.arc(cx, cy, rr, Math.PI*0.75, Math.PI*2.25); ctx.stroke();
    ctx.strokeStyle = gcol; ctx.shadowColor = gcol; ctx.shadowBlur = 6 * pulse;
    ctx.beginPath(); ctx.arc(cx, cy, rr, Math.PI*0.75, Math.PI*0.75 + Math.PI*1.5*frac); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(lvl), cx, cy + 1);

    // ── Label + level tag + progress bar ──
    const lx = _x0 + 58, bBtnX = _x0 + _gw - 88;
    const barX = lx, barY = sy + 29, barW = (bBtnX - 10) - lx, barH = 7;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = s.col; ctx.font = 'bold 12px Arial';
    ctx.fillText(s.label, lx, sy + 20);
    ctx.textAlign = 'right';
    ctx.fillStyle = maxed ? this.C.green : 'rgba(208,216,255,0.75)';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(maxed ? '★ MAX' : ('LV ' + lvl + ' / ' + _upMax), barX + barW, sy + 18);
    // track
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3.5); ctx.fill();
    // fill
    const fw = maxed ? barW : (frac > 0 ? Math.max(5, barW * frac) : 0);
    if (fw > 0) {
      ctx.save();
      const fg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fg.addColorStop(0, this._lighten(s.col, 8)); fg.addColorStop(1, this._lighten(s.col, 46));
      ctx.fillStyle = maxed ? this.C.green : fg;
      ctx.shadowColor = maxed ? this.C.green : s.col; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.roundRect(barX, barY, fw, barH, 3.5); ctx.fill();
      ctx.restore();
    }
    // segment ticks (quarters)
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let i = 1; i < 5; i++) ctx.fillRect(barX + barW * (i/5), barY, 1, barH);

    // ── Right action: primary UPGRADE pill (>=44px) or MAX badge ──
    const bx = bBtnX, by = sy + 2, bw = 74, bh = 44;
    if (maxed) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,204,68,0.16)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(0,204,68,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 8); ctx.stroke();
      ctx.fillStyle = this.C.green; ctx.font = 'bold 12px Impact, Arial Black';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★ MAX', bx + bw/2, by + bh/2 + 1);
      ctx.restore();
      // No hitbox at max (no upgrade dispatch) — matches parts MAX behaviour.
    } else {
      const bcol = afford ? this.C.gold : s.col;
      ctx.save();
      if (!afford) ctx.globalAlpha = 0.5;
      const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
      bg.addColorStop(0, this._lighten(bcol, 30)); bg.addColorStop(1, this._lighten(bcol, -34));
      if (afford) { ctx.shadowColor = bcol + '99'; ctx.shadowBlur = 8 * pulse; ctx.shadowOffsetY = 2; }
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
      ctx.restore();
      // glossy top
      ctx.save();
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.clip();
      const gl = ctx.createLinearGradient(bx, by, bx, by + bh*0.5);
      gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(bx, by, bw, bh*0.5);
      ctx.restore();
      // labels
      ctx.save();
      if (!afford) ctx.globalAlpha = 0.85;
      ctx.fillStyle = afford ? '#1a1206' : 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('UPGRADE', bx + bw/2, by + 13);
      ctx.font = 'bold 12px Impact, Arial Black';
      const cstr = cost >= 10000 ? Math.round(cost/1000) + 'k' : cost.toLocaleString();
      ctx.fillText('⧆ ' + cstr, bx + bw/2, by + 30);
      ctx.restore();
      // unaffordable affordance (drawn padlock — not color alone, not emoji)
      if (!afford) this._drawGarageLock(ctx, bx + bw - 13, by + 7, s.col);
      this.buttons.push({ id:'upgrade_' + s.key, x:bx, y:by, w:bw, h:bh });
    }
  },

  // Tiny drawn padlock used to mark an unaffordable upgrade (canvas shapes only).
  _drawGarageLock(ctx, x, y, col) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(x + 4, y + 2, 3, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.roundRect(x, y + 2, 8, 6, 1.5); ctx.fill();
    ctx.restore();
  },

  // ── RANKINGS ──────────────────────────────────────────────────────────────
  drawRankings(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,215,0,0.18)');
    this._drawHeader(ctx, W, '◈  RANK & RECORDS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    // Rank thresholds
    const ranks = [
      { name:'BEGINNER',       min:0,     col:'#888899' },
      { name:'BRONZE',         min:200,   col:'#CD7F32' },
      { name:'SILVER',         min:800,   col:'#C0C0C0' },
      { name:'GOLD',           min:3000,  col:'#FFD700' },
      { name:'DIAMOND',        min:10000, col:'#00CCFF' },
      { name:'LEGEND',         min:50000, col:'#FF3D00' }
    ];

    // Current best distance
    const scores = SaveData.get('highScores') || {};
    const bestDist = Math.max(0, ...Object.values(scores).map(Number));
    const curRank = SaveData.getRank(bestDist);
    const curCol  = SaveData.getRankColor(curRank);

    // Current rank badge
    const badgeY = 62;
    this._drawCard(ctx, 10, badgeY, W-20, 56, { r:12, accent:curCol, active:true, glow:true });
    // 🔴 BUGFIX(31 Tmz) — RÜTBE YAZISI KARTTAN TAŞIYORDU (telefonda görüldü).
    //   Eski: `Math.floor(W * 0.065)` — font YALNIZ GENİŞLİĞE bağlıydı ve kartın
    //   56 px'lik yüksekliğiyle hiç karşılaştırılmıyordu. ÖLÇÜLDÜ:
    //     telefon yatay 915x335 → 59 px  ·  masaüstü 1280x720 → 83 px
    //   ikisi de 56 px'lik karttan TAŞIYOR (ekran görüntüsünde "ACEMİ" devasa,
    //   sola taşmış hâlde). Dikeyde (412 px) 26 px çıktığı için fark edilmemiş.
    //   ▶ Hem H'ye hem mutlak tavana kelepçelenir + fillText maxWidth ile
    //     yatayda "BEST: …" yazısının üstüne binmesi engellenir.
    const _rankF = Math.max(14, Math.min(Math.floor(W * 0.065), Math.floor(H * 0.085), 30));
    ctx.font = 'bold ' + _rankF + 'px Impact, Arial Black';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = curCol;
    ctx.fillText(this._rankEN(curRank), 22, badgeY + 28, Math.max(60, W - 22 - 120));
    ctx.fillStyle = 'rgba(200,210,255,0.55)'; ctx.font = '10px Arial';
    ctx.textAlign = 'right'; ctx.fillText('BEST: ' + Economy.formatDistance(bestDist), W-14, badgeY + 20);

    // Progress toward next rank (inside badge)
    const nextR = ranks.find(r => r.min > bestDist);
    if (nextR) {
      let curMin = 0; ranks.forEach(r => { if (r.min <= bestDist) curMin = r.min; });
      const frac = Math.max(0, Math.min(1, (bestDist - curMin) / (nextR.min - curMin)));
      const pbx = 22, pbw = W - 36, pby = badgeY + 42;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, 5, 2.5); ctx.fill();
      ctx.save(); ctx.shadowColor = curCol; ctx.shadowBlur = 5;
      ctx.fillStyle = curCol; ctx.beginPath(); ctx.roundRect(pbx, pby, Math.max(4, pbw * frac), 5, 2.5); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(200,210,255,0.6)'; ctx.font = '9px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(Economy.formatDistance(Math.max(0, nextR.min - bestDist)) + ' → ' + nextR.name, W - 14, pby - 1);
      ctx.textBaseline = 'middle';
    }

    // Rank ladder
    const ladderY = badgeY + 64;
    ranks.forEach((r, ri) => {
      const ry = ladderY + ri * 42;
      const isAchieved = bestDist >= r.min;
      const isCurrent  = this._rankEN(curRank) === r.name;
      this._drawCard(ctx, 10, ry, W-20, 36, {
        r:9, accent:r.col, active:isCurrent, glow:isCurrent,
        fill: isAchieved ? null : ['rgba(8,9,18,0.7)','rgba(5,5,12,0.7)']
      });
      ctx.fillStyle = isAchieved ? r.col : 'rgba(100,110,150,0.4)';
      ctx.font = 'bold ' + (isCurrent ? 13 : 11) + 'px Impact, Arial Black';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText((isAchieved ? '✔ ' : '  ') + r.name, 20, ry + 18);
      ctx.fillStyle = 'rgba(180,190,230,0.5)'; ctx.font = '9px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(Economy.formatDistance(r.min) + '+', W-14, ry + 18);
    });

    // Recent best scores per map
    const scY = ladderY + ranks.length * 42 + 12;
    this._drawBand(ctx, 10, scY - 2, W - 20, 'MAP RECORDS', this.C.fire);
    const mapEntries = Object.entries(scores).filter(([,v]) => v > 0).sort(([,a],[,b]) => b-a).slice(0, 5);
    mapEntries.forEach(([mapId, dist], mi) => {
      const ey = scY + 24 + mi * 32;
      const mcol = SaveData.getRankColor(SaveData.getRank(dist));
      this._drawCard(ctx, 10, ey, W-20, 28, { r:8, accent:mcol });
      ctx.fillStyle = this.C.text; ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(mapId.toUpperCase().replace('_',' '), 18, ey + 14);
      ctx.fillStyle = this.C.gold; ctx.font = '10px Arial'; ctx.textAlign = 'right';
      ctx.fillText(Economy.formatDistance(dist), W-14, ey + 14);
    });
  },

  // ── CUP ───────────────────────────────────────────────────────────────────
  drawCup(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,215,0,0.20)');
    this._drawHeader(ctx, W, '★  CUPS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const cups = [
      { name:'BRONZE CUP',  maps:'Countryside, Desert, Beach',  reward:500,   col:'#cd7f32' },
      { name:'SILVER CUP',  maps:'Winter, Mountains, City',      reward:1500,  col:'#b0b8c8' },
      { name:'GOLD CUP',    maps:'Arctic, Jungle, Mars',        reward:5000,  col:'#FFD700' },
      { name:'LEGEND CUP',  maps:'Cave, Highland, Swamp',       reward:15000, col:'#FF3D00' }
    ];
    const cardH = Math.floor((H - 70) / cups.length) - 8;
    cups.forEach((cup, i) => {
      const cy = 62 + i * (cardH + 8);
      this._drawCard(ctx, 12, cy, W-24, cardH, { r:12, accent:cup.col, active:true, glow:true });

      // trophy in a glowing disk
      ctx.save();
      const dg = ctx.createRadialGradient(36, cy + cardH*0.5 - 6, 3, 36, cy + cardH*0.5, 26);
      dg.addColorStop(0, cup.col + '55'); dg.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(36, cy + cardH*0.5, 24, 0, 6.283); ctx.fill();
      ctx.strokeStyle = cup.col + '99'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = cup.col;
      // 🔴 TASMA (29 Tmz): font kart YUKSEKLIGINE bagliydi. Tablet boyutunda
      //   (600x1024) 4 kart 230 px yuksekliginde → yildiz 96 px olup x=36
      //   merkezinden EKRANIN SOLUNA tasiyordu. Ikon zaten 24 px yaricapli
      //   diskin icine oturmali → 34 px tavan.
      ctx.font = Math.min(34, Math.floor(cardH * 0.42)) + 'px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', 36, cy + cardH * 0.5 + 1);
      ctx.textAlign = 'left';
      // Metin alani: ikon diskinden (62) PLAY butonuna (W-88) kadar
      const _metinGen = Math.max(60, (W - 88) - 62 - 8);
      ctx.fillStyle = cup.col;
      ctx.font = 'bold ' + Math.min(26, Math.floor(cardH * 0.18)) + 'px Impact, Arial Black';
      ctx.textBaseline = 'top'; ctx.fillText(cup.name, 62, cy + 8, _metinGen);
      ctx.fillStyle = 'rgba(200,210,255,0.55)'; ctx.font = '10px Arial';
      ctx.fillText(cup.maps, 62, cy + 8 + cardH * 0.24, _metinGen);
      ctx.fillStyle = this.C.gold; ctx.font = 'bold 10px Arial'; ctx.textBaseline = 'bottom';
      ctx.fillText('⧆ ' + cup.reward.toLocaleString() + ' REWARD', 62, cy + cardH - 6, _metinGen);

      const pbW = 70, pbH = 44, pbX = W-88, pbY2 = cy + (cardH-pbH)/2;
      this._drawPill(ctx, pbX, pbY2, pbW, pbH, '▶ PLAY', cup.col, { dark: cup.col === '#FFD700' });
      this.buttons.push({ id:'cup_play_' + i, x:pbX, y:pbY2, w:pbW, h:pbH });
    });
  },

  // ── TEAM ──────────────────────────────────────────────────────────────────
  drawTeam(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(170,34,255,0.20)');
    this._drawHeader(ctx, W, '◈  TEAM');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const teamName = SaveData.get('teamName');
    const teamLevel = SaveData.get('teamLevel') || 0;

    if (teamName) {
      this._drawCard(ctx, 12, 66, W-24, 76, { r:12, accent:this.C.purple, active:true, glow:true });
      ctx.fillStyle = this.C.purple; ctx.font = 'bold 18px Impact, Arial Black';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(teamName.toUpperCase(), 24, 74);
      ctx.fillStyle = this.C.dim; ctx.font = '11px Arial'; ctx.fillText('LEVEL ' + teamLevel, 24, 100);

      ['YOU','SpeedKing','HillMaster','DirtRider'].forEach((m, mi) => {
        const my = 154 + mi * 36;
        this._drawCard(ctx, 12, my, W-24, 32, {
          r:8, accent: mi===0 ? this.C.purple : this.C.dim, active: mi===0
        });
        ctx.fillStyle = mi===0?'#FFF':this.C.text; ctx.font='bold 12px Arial';
        ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(mi===0?'★ '+m:m, 22, my+16);
        ctx.fillStyle = this.C.gold; ctx.font='10px Arial'; ctx.textAlign='right';
        ctx.fillText('⧆ '+[1250,980,730,540][mi], W-20, my+16);
      });

      this._drawDarkBtn(ctx, 12, H-60, W-24, 44, '✖  LEAVE TEAM');
      this.buttons.push({ id:'leave_team', x:12, y:H-60, w:W-24, h:44 });
    } else {
      ctx.fillStyle = this.C.dim; ctx.font='12px Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('Join a team or create a new one!', W/2, 100);
      this._drawFireBtn(ctx, 12, 122, W-24, 44, '⊕  CREATE NEW TEAM');
      this.buttons.push({ id:'create_team', x:12, y:122, w:W-24, h:44 });
      ['Speed Demons - LV8','Ahmeters - LV5','Road Warriors - LV3'].forEach((tn, ti) => {
        const ty = 178 + ti * 54;
        this._drawCard(ctx, 12, ty, W-24, 46, { r:10, accent:this.C.purple });
        ctx.fillStyle=this.C.text; ctx.font='bold 12px Arial';
        ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(tn, 22, ty+16);
        ctx.fillStyle=this.C.dim; ctx.font='10px Arial';
        ctx.fillText('◈ '+[24,18,11][ti]+' members  -  '+[48200,32100,18500][ti]+' score', 22, ty+32);
        this._drawSmallBtn(ctx, W-76, ty+1, 60, 44, 'JOIN', this.C.purple);
        this.buttons.push({ id:'join_team_'+ti, x:W-76, y:ty+1, w:60, h:44 });
      });
    }
  },

  // ── SHOP ──────────────────────────────────────────────────────────────────
  drawShop(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(0,204,255,0.18)');
    this._drawHeader(ctx, W, '◉  SHOP');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const reduce = (typeof this._menuReducedMotion === 'function') ? this._menuReducedMotion() : false;
    const M = 12;

    // ── FIXED: category tabs (≥44px touch height) ──────────────────────────
    const tabs = ['GOLD', 'DIAMONDS', 'PARTS', 'ITEMS'];
    const tabW = (W-24)/tabs.length;
    const tabY = 60, tabH = 44;
    tabs.forEach((tb, ti) => {
      const tx = 12 + ti*tabW, isAct = ti===(this._shopTab||0);
      this._drawTab(ctx, tx, tabY, tabW-4, tabH, tb, isAct, this.C.fire);
      this.buttons.push({ id:'shop_tab_'+ti, x:tx, y:tabY, w:tabW-4, h:tabH });
    });

    const tab = this._shopTab||0;

    // ── Guarded currency balances ──────────────────────────────────────────
    const gold     = (typeof SaveData!=='undefined' && SaveData.get) ? (Number(SaveData.get('gold'))||0)     : 0;
    const diamonds = (typeof SaveData!=='undefined' && SaveData.get) ? (Number(SaveData.get('diamonds'))||0) : 0;

    // ── FIXED: prominent balance strip below the tab strip ─────────────────
    const balY = tabY + tabH + 8, balH = 30;
    this._drawShopBalance(ctx, W, balY, balH, gold, diamonds, tab);

    // ── Reset scroll when the active tab changes (self-contained) ──────────
    if (this._shopScrollTab !== tab) { this._shopScrollTab = tab; this._shopScroll = 0; }

    // ── Scrollable viewport geometry ───────────────────────────────────────
    const viewTop = balY + balH + 8;
    const viewH   = Math.max(60, H - viewTop - 8);
    const rowH = 62, rowAdv = rowH + 8;
    const cellH = 104, cellGap = 8, colGap = 8;
    const colW = (W - 2*M - colGap) / 2;

    // ── Measure content height for the active tab ──────────────────────────
    let contentH = 0, ids = null, parts = null;
    if (tab === 0 || tab === 1) { contentH = 4 * rowAdv; }
    else if (tab === 2) {
      parts = (typeof Economy!=='undefined' && Economy.PARTS) ? Object.values(Economy.PARTS) : [];
      contentH = parts.length * rowAdv;
    } else {
      ids = (typeof Economy!=='undefined' && Economy.SHOP_ITEMS) ? Object.keys(Economy.SHOP_ITEMS) : [];
      contentH = Math.ceil(ids.length / 2) * (cellH + cellGap);
    }

    const maxScroll = Math.max(0, contentH - viewH);
    this._shopScroll = Math.max(0, Math.min(maxScroll, this._shopScroll || 0));
    const sc = this._shopScroll;
    this._shopView = { viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll };
    this._ensureShopWheel();

    // ── Clip the content area and offset it by the scroll amount ───────────
    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();
    const baseY  = viewTop - sc;
    const vis = (top, h) => (top + h > viewTop && top < viewTop + viewH);

    if (tab === 0 || tab === 1) {
      const packs = (tab === 0) ? [
        { label:'⧆ 500',    price:'AD',     col:'#FFD700', sub:'Watch & earn' },
        { label:'⧆ 5.000',  price:'TL 29',  col:'#FFD700', sub:'Popular' },
        { label:'⧆ 20.000', price:'TL 99',  col:'#FF8800', sub:'Valuable' },
        { label:'⧆ 100K',   price:'TL 399', col:'#FF3D00', sub:'Legend' }
      ] : [
        { label:'◆ 10',   price:'TL 29',  col:this.C.diamond, sub:'Starter' },
        { label:'◆ 50',   price:'TL 99',  col:this.C.diamond, sub:'Popular' },
        { label:'◆ 200',  price:'TL 299', col:this.C.cyan,    sub:'Valuable' },
        { label:'◆ 1000', price:'TL 999', col:'#FF3D00',      sub:'Legend' }
      ];
      const idBase = (tab === 0) ? 'buy_gold_' : 'buy_diamonds_';
      packs.forEach((pk, pi) => {
        const top = baseY + pi*rowAdv;
        if (!vis(top, rowH)) return;
        const best = (pi === 3);
        this._drawCard(ctx, M, top, W-2*M, rowH, { r:12, accent:pk.col, active:best, glow: best && !reduce });
        ctx.save(); ctx.shadowColor = pk.col; ctx.shadowBlur = 6;
        ctx.fillStyle = pk.col; ctx.font = 'bold 18px Impact, Arial Black';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(pk.label, M+14, top+22);
        ctx.restore();
        ctx.fillStyle = this.C.dim; ctx.font = '10px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(pk.sub, M+14, top+43);
        if (best) this._drawValueTag(ctx, W-2*M-98, top-4, 'BEST VALUE', pk.col);
        // buy button — ≥44px touch target
        const bw = 84, bh = 44, bx = W-M-bw-2, by = top + (rowH-bh)/2;
        this._drawPill(ctx, bx, by, bw, bh, pk.price, pk.col, { dark:true });
        if (vis(by, bh)) this.buttons.push({ id: idBase+pi, x:bx, y:by, w:bw, h:bh });
      });
    } else if (tab === 2) {
      parts.forEach((part, pi) => {
        const top = baseY + pi*rowAdv;
        if (!vis(top, rowH)) return;
        const owned = (typeof SaveData!=='undefined' && SaveData.ownsPart) ? SaveData.ownsPart(part.id) : false;
        const racc  = (typeof Economy!=='undefined' && Economy.rarityColor) ? Economy.rarityColor(part.id) : (part.color || this.C.fire);
        this._drawCard(ctx, M, top, W-2*M, rowH, { r:12, accent: owned ? this.C.green : racc, active: owned, glow: owned && !reduce });
        // icon disk
        ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(part.icon || '▣', M+24, top + rowH/2);
        // name
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = owned ? this.C.green : '#FFFFFF'; ctx.font = 'bold 13px Arial';
        ctx.fillText(part.name || 'Part', M+46, top+22);
        // rarity chip
        const rr = String(part.rarity || '').toUpperCase();
        if (rr) {
          ctx.font = 'bold 8px Arial';
          const rw = ctx.measureText(rr).width + 10;
          ctx.fillStyle = racc + '33';
          ctx.beginPath(); ctx.roundRect(M+46, top+28, rw, 13, 4); ctx.fill();
          ctx.fillStyle = racc; ctx.textBaseline = 'middle';
          ctx.fillText(rr, M+51, top+35);
        }
        ctx.fillStyle = this.C.dim; ctx.font = '9px Arial'; ctx.textBaseline = 'middle';
        ctx.fillText((part.desc || '').split('\n')[0].slice(0, 28), M+46, top+50);
        if (owned) {
          ctx.fillStyle = this.C.green; ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText('✔ OWNED', W-M-14, top + rowH/2);
        } else {
          const bh = 44, gbw = 58, dbw = 58, gap = 6;
          const dbx = W-M-dbw-2, gbx = dbx - gbw - gap, by = top + (rowH-bh)/2;
          const canG = gold >= (part.goldCost||0), canD = diamonds >= (part.diamondCost||0);
          this._drawPill(ctx, gbx, by, gbw, bh, '⧆'+(part.goldCost||0),    this.C.gold,    { dark:true, disabled: !canG });
          this._drawPill(ctx, dbx, by, dbw, bh, '◆'+(part.diamondCost||0), this.C.diamond, { disabled: !canD });
          if (vis(by, bh)) this.buttons.push(
            { id:'buy_part_gold_'+part.id,    x:gbx, y:by, w:gbw, h:bh },
            { id:'buy_part_diamond_'+part.id, x:dbx, y:by, w:dbw, h:bh }
          );
        }
      });
    } else {
      // ── ITEMS: tüketilebilir item'lar (2 sütun grid, envanterde stoklanır) ──
      ids.forEach((id, ii) => {
        const it = Economy.SHOP_ITEMS[id];
        const col = ii % 2, rowIdx = Math.floor(ii / 2);
        const cx = M + col*(colW + colGap);
        const cy = baseY + rowIdx*(cellH + cellGap);
        if (!vis(cy, cellH)) return;
        const owned = ((typeof SaveData!=='undefined' && SaveData.getItem) ? SaveData.getItem(id) : 0) || 0;
        const dOnly = (it.diamondCost > 0 && !(it.goldCost > 0));
        const both  = (it.diamondCost > 0 && it.goldCost > 0);
        const acc = owned > 0 ? this.C.green : dOnly ? this.C.diamond : both ? this.C.fire : this.C.gold;
        this._drawCard(ctx, cx, cy, colW, cellH, { r:11, accent: acc, active: owned > 0, glow: owned > 0 && !reduce });
        ctx.font = '24px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(it.icon || '▣', cx + 10, cy + 10);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
        ctx.fillText((it.name || 'Item').slice(0, 16), cx + 44, cy + 12);
        ctx.fillStyle = this.C.dim; ctx.font = '8px Arial';
        ctx.fillText((it.desc || '').slice(0, 20), cx + 44, cy + 28);
        if (owned > 0) {
          ctx.fillStyle = this.C.green; ctx.font = 'bold 11px Arial';
          ctx.textAlign = 'right'; ctx.textBaseline = 'top';
          ctx.fillText('x' + owned, cx + colW - 10, cy + 12);
        }
        const cost = both ? ('⧆' + it.goldCost + '  ◆' + it.diamondCost)
                   : dOnly ? ('◆' + it.diamondCost) : ('⧆' + (it.goldCost||0));
        const canBuy = (!(it.goldCost > 0) || gold >= it.goldCost) && (!(it.diamondCost > 0) || diamonds >= it.diamondCost);
        const bh = 44, bx = cx + 8, by = cy + cellH - bh - 8, bw = colW - 16;
        this._drawPill(ctx, bx, by, bw, bh, 'AL   ' + cost, dOnly ? this.C.diamond : this.C.gold, { dark:true, disabled: !canBuy });
        if (vis(by, bh)) this.buttons.push({ id: 'buy_item_' + id, x: bx, y: by, w: bw, h: bh });
      });
    }
    ctx.restore();

    // ── Scroll affordance (own draw; isolated from other scrollbars) ───────
    this._drawShopScrollbar(ctx, W, viewTop, viewH, sc, maxScroll, contentH);
  },

  // ── SHOP DRAW HELPERS (drawShop-scoped; additive) ─────────────────────────
  // Compact-format a currency amount for the balance header.
  _shopFmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n/1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e4) return (n/1e3).toFixed(0) + 'K';
    return n.toLocaleString();
  },

  // Fixed balance strip: gold + diamond totals and the active category caption.
  _drawShopBalance(ctx, W, y, h, gold, diamonds, tab) {
    const M = 12;
    this._drawCard(ctx, M, y, W-2*M, h, { r:9, accent:this.C.gold,
      fill:['rgba(26,22,10,0.92)','rgba(14,12,8,0.92)'] });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let cxp = M + 12;
    // gold
    ctx.fillStyle = this.C.gold; ctx.font = 'bold 14px Arial';
    ctx.fillText('⧆', cxp, y + h/2 + 1); cxp += 16;
    const gtxt = this._shopFmtNum(gold);
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 14px Arial';
    ctx.fillText(gtxt, cxp, y + h/2 + 1);
    cxp += ctx.measureText(gtxt).width + 20;
    // diamonds
    ctx.fillStyle = this.C.diamond; ctx.font = 'bold 14px Arial';
    ctx.fillText('◆', cxp, y + h/2 + 1); cxp += 15;
    const dtxt = this._shopFmtNum(diamonds);
    ctx.fillStyle = '#bfeeff'; ctx.font = 'bold 14px Arial';
    ctx.fillText(dtxt, cxp, y + h/2 + 1);
    // category caption (right)
    const caps = ['COIN PACKS', 'DIAMOND PACKS', 'PERFORMANCE PARTS', 'POWER-UPS'];
    ctx.fillStyle = this.C.dim; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'right';
    ctx.fillText(caps[tab] || '', W - M - 12, y + h/2 + 1);
  },

  // Slim right-edge scrollbar for the shop list (own draw; does not touch the
  // stats/garage/settings scroll systems).
  _drawShopScrollbar(ctx, W, viewTop, viewH, sc, maxScroll, contentH) {
    if (maxScroll <= 0) return;
    const trackX = W - 6, trackY = viewTop + 2, trackH = viewH - 4;
    ctx.save();
    ctx.fillStyle = 'rgba(20,24,44,0.55)';
    ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
    const frac = Math.max(0, Math.min(1, viewH / contentH));
    const thumbH = Math.max(24, Math.round(trackH * frac));
    const thumbY = trackY + (trackH - thumbH) * (sc / maxScroll);
    ctx.fillStyle = 'rgba(0,204,255,0.72)';
    ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,210,255,0.9)';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (sc > 1)             ctx.fillText('▲', trackX + 2, viewTop + 8);
    if (sc < maxScroll - 1) ctx.fillText('▼', trackX + 2, viewTop + viewH - 8);
    ctx.restore();
  },

  // One-time wheel hook for the SHOP screen (own _shopScroll state). Isolated
  // from every other screen's scroll system; only active while on the shop.
  _ensureShopWheel() {
    // 28 Tmz: wheel-only idi → parmakla kaydirilamiyordu. Ortak yardimciya bagli.
    this._dokunmatikKaydirma('shop',
      () => this.currentScreen === 'shop',
      () => this._shopView,
      () => this._shopScroll,
      (v) => { this._shopScroll = v; });
  },

  // ── ACHIEVEMENTS ─────────────────────────────────────────────────────────
  drawAchievements(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,215,0,0.18)');
    this._drawHeader(ctx, W, '★  ACHIEVEMENTS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const achs  = (typeof Achievements !== 'undefined' && Achievements.list) ? Achievements.list : [];
    const savedAch = SaveData.get('achievements');
    const earned = savedAch && typeof savedAch === 'object' ? Object.keys(savedAch) : [];
    const earnedSet = {}; earned.forEach(id => { earnedSet[id] = true; });
    const doneCount = achs.reduce((n, a) => n + (earnedSet[a.id] ? 1 : 0), 0);
    const total = achs.length || 1;

    // ── completion summary strip ──
    const sy = 60, sh = 30, sInner = W - 28;
    this._drawCard(ctx, 14, sy, sInner, sh, { r:9, accent:this.C.gold, active:true,
      fill:['rgba(34,28,8,0.92)','rgba(16,13,6,0.92)'] });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd873'; ctx.font = 'bold 11px Arial';
    ctx.fillText('★ ' + doneCount + ' / ' + achs.length + ' UNLOCKED', 26, sy + sh/2);
    // mini progress bar (right side of the strip)
    const pbx = W - 14 - 120, pbw = 108, pby = sy + sh/2 - 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, 8, 4); ctx.fill();
    ctx.save(); ctx.shadowColor = this.C.gold; ctx.shadowBlur = 5;
    const pg = ctx.createLinearGradient(pbx, pby, pbx + pbw, pby);
    pg.addColorStop(0, '#ffe680'); pg.addColorStop(1, this.C.gold);
    ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(pbx, pby, Math.max(4, pbw * doneCount / total), 8, 4); ctx.fill();
    ctx.restore();

    const cardH  = 50, startY = sy + sh + 8;
    achs.forEach((a, ai) => {
      const ay = startY + ai * (cardH + 6);
      if (ay > H) return;                         // skip fully off-screen rows (perf)
      const done = !!earnedSet[a.id];
      const acc  = done ? this.C.gold : this.C.dim;
      this._drawCard(ctx, 12, ay, W-24, cardH, { r:10, accent: acc, active: done, glow: done });
      // icon disk
      const dcx = 40, dcy = ay + cardH/2;
      ctx.save();
      const dg = ctx.createRadialGradient(dcx, dcy - 4, 2, dcx, dcy, 20);
      dg.addColorStop(0, (done ? '#ffd700' : '#33406a') + '66'); dg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(dcx, dcy, 18, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = done ? 1 : 0.4;
      ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.icon || (done ? '★' : '☆'), dcx, dcy + 1);
      ctx.restore();
      // name + desc
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = done ? '#FFFFFF' : 'rgba(160,170,220,0.5)';
      ctx.font = 'bold 12px Arial'; ctx.fillText(a.name, 66, ay + cardH*0.34);
      ctx.fillStyle = done ? 'rgba(255,224,128,0.8)' : 'rgba(100,110,160,0.45)';
      ctx.font = '9px Arial'; ctx.fillText(a.desc || '', 66, ay + cardH*0.68);
      // status
      if (done) {
        this._drawPill(ctx, W - 92, dcy - 11, 68, 22, '✓ DONE', this.C.gold, { dark:true, flat:true });
      } else {
        ctx.fillStyle = 'rgba(120,130,180,0.4)'; ctx.font = '15px Arial';
        ctx.textAlign = 'right'; ctx.fillText('🔒', W - 26, dcy);
      }
    });
    if (achs.length === 0) {
      ctx.fillStyle=this.C.dim; ctx.font='13px Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('Loading achievements...', W/2, H/2);
    }
  },

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  // ── STATS (📊 İSTATİSTİK) ────────────────────────────────────────────────
  drawStats(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(0,204,255,0.18)');
    this._drawHeader(ctx, W, '📊  STATISTICS');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const g = (k, d) => { const v = SaveData.get(k); return (v === undefined || v === null) ? d : v; };

    // ── Lifetime stats (fully guarded so old saves without a stats bag work) ──
    const LS = (typeof SaveData !== 'undefined' && SaveData.getStats) ? (SaveData.getStats() || {}) : {};
    const sg = (k) => { const v = Number(LS ? LS[k] : 0); return (isFinite(v) && v >= 0) ? v : 0; };
    const fmtInt = (n) => (Number(n) || 0).toLocaleString();
    const fmtDist = (d) => (typeof Economy !== 'undefined' && Economy.formatDistance)
      ? Economy.formatDistance(Number(d) || 0) : ((Number(d) || 0) + ' m');
    // seconds → "Xsa Ydk" / "Xdk Ysn" / "Zsn"
    const fmtDur = (s) => {
      s = Math.max(0, Math.round(Number(s) || 0));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
      if (h > 0) return h + 'sa ' + m + 'dk';
      if (m > 0) return m + 'dk ' + ss + 'sn';
      return ss + 'sn';
    };
    const pretty = (id) => String(id || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const totalDist = g('totalDistance', 0);
    const cardRows = [
      { ic:'🛣️', label:'Toplam Mesafe', val: fmtDist(totalDist), acc: this.C.fire },
      { ic:'🔄', label:'Toplam Takla',  val: fmtInt(g('totalFlips', 0)), acc: this.C.cyan },
      { ic:'🎮', label:'Oynanan Oyun',  val: fmtInt(g('gamesPlayed', 0)), acc: this.C.green },
      { ic:'⧆',  label:'Toplam Altın',  val: fmtInt(g('totalCoins', g('gold', 0))), acc: this.C.gold },
      { ic:'🏆', label:'Kupa (Lig)',    val: fmtInt(typeof Rewards !== 'undefined' ? Rewards.trophies() : 0), acc: this.C.purple },
      { ic:'🚗', label:'Açılan Araç',   val: ((SaveData.get('ownedVehicles') || []).length) + ' / ' + Object.keys(VehicleDefs).length, acc: this.C.hot },
      { ic:'🗺️', label:'Açılan Harita',  val: ((SaveData.get('unlockedMaps') || ['countryside']).length) + ' / ' + (SaveData._ALL_MAPS ? SaveData._ALL_MAPS.length : 26), acc: this.C.diamond },
      { ic:'👑', label:'VIP Durumu',    val: (typeof Rewards !== 'undefined' && Rewards.isVIP()) ? (Rewards.vipDaysLeft() + ' gün') : 'Yok', acc: this.C.gold }
    ];

    // Build a flat, typed item list so the whole screen can scroll uniformly.
    const items = [];
    cardRows.forEach((r) => items.push({ t:'card', ic:r.ic, label:r.label, val:r.val, acc:r.acc }));

    // ── NEW: lifetime achievement counters section (additive) ──
    const lifeRows = [
      { ic:'🔄', label:'Toplam Takla',      val: fmtInt(sg('totalFlips')),        acc: this.C.cyan },
      { ic:'✈️', label:'Havada Kalış',       val: fmtDur(sg('totalAirtime')),      acc: this.C.diamond },
      { ic:'⬆️', label:'Toplam Zıplama',     val: fmtInt(sg('totalJumps')),        acc: this.C.green },
      { ic:'🎯', label:'En İyi Kombo',       val: fmtInt(sg('bestCombo')) + 'x',   acc: this.C.hot },
      { ic:'🛡️', label:'Hasarsız Tur',       val: fmtInt(sg('noDamageRuns')),      acc: this.C.fire },
      { ic:'🎁', label:'Açılan Sandık',      val: fmtInt(sg('chestsOpened')),      acc: this.C.gold },
      { ic:'✅', label:'Tamamlanan Görev',   val: fmtInt(sg('missionsCompleted')), acc: this.C.purple },
      { ic:'⏱️', label:'Oynama Süresi',      val: fmtDur(sg('totalPlayTime')),     acc: this.C.cyan }
    ];
    items.push({ t:'header', text:'YAŞAM BOYU' });
    lifeRows.forEach((r) => items.push({ t:'card', ic:r.ic, label:r.label, val:r.val, acc:r.acc }));

    // ── NEW: compact "best distance per map" mini-list (top few) ──
    const perMap = (LS && LS.perMapBestDistance && typeof LS.perMapBestDistance === 'object' && !Array.isArray(LS.perMapBestDistance))
      ? LS.perMapBestDistance : {};
    const meta = (typeof MapSettings !== 'undefined' && MapSettings.MAPS_META) ? MapSettings.MAPS_META : {};
    const mapArr = Object.keys(perMap)
      .map((id) => ({ id: id, d: Number(perMap[id]) || 0 }))
      .filter((o) => o.d > 0)
      .sort((a, b) => b.d - a.d)
      .slice(0, 5);
    if (mapArr.length) {
      const mapAcc = [this.C.fire, this.C.cyan, this.C.green, this.C.gold, this.C.purple];
      items.push({ t:'header', text:'HARİTA REKORLARI' });
      mapArr.forEach((o, i) => items.push({
        t:'map',
        emoji: (meta[o.id] && meta[o.id].emoji) || '🗺️',
        name: pretty(o.id),
        val: fmtDist(o.d),
        acc: mapAcc[i % mapAcc.length]
      }));
    }

    // ── Measure content + clamp own scroll state (isolated from other screens) ──
    const advOf = (it) => (it.t === 'card' ? 52 : it.t === 'map' ? 38 : 34);
    let contentH = 0;
    items.forEach((it) => { contentH += advOf(it); });
    const viewTop = 62;
    const viewH = Math.max(60, H - viewTop - 8);
    const maxScroll = Math.max(0, contentH - viewH);
    this._statsScroll = Math.max(0, Math.min(maxScroll, this._statsScroll || 0));
    const sc = this._statsScroll;
    this._statsView = { viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll };
    this._ensureStatsWheel();

    // ── Draw: clip the content area, offset by scroll ──
    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();
    let y = viewTop - sc;
    const vis = (top, h) => (top + h > viewTop && top < viewTop + viewH);

    for (const it of items) {
      const adv = advOf(it);
      if (it.t === 'card') {
        if (vis(y, 46)) {
          const acc = it.acc || this.C.cyan;
          this._drawCard(ctx, 14, y, W - 28, 46, { r:9, accent: acc });
          const dcx = 40, dcy = y + 23;
          ctx.save();
          const dg = ctx.createRadialGradient(dcx, dcy - 4, 2, dcx, dcy, 20);
          dg.addColorStop(0, acc + '55'); dg.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(dcx, dcy, 17, 0, 6.283); ctx.fill();
          ctx.restore();
          ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
          ctx.fillText(it.ic, dcx, dcy + 1);
          ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(210,220,255,0.85)';
          ctx.fillText(it.label, 66, dcy);
          ctx.font = 'bold 16px Impact, Arial Black'; ctx.fillStyle = '#ffd21e'; ctx.textAlign = 'right';
          ctx.fillText(String(it.val), W - 28, dcy);
        }
      } else if (it.t === 'map') {
        if (vis(y, 32)) {
          const acc = it.acc || this.C.green;
          this._drawCard(ctx, 14, y, W - 28, 32, { r:7, accent: acc });
          ctx.font = '16px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
          ctx.fillText(it.emoji, 26, y + 16);
          ctx.font = 'bold 11px Arial'; ctx.fillStyle = 'rgba(210,220,255,0.85)';
          ctx.fillText(it.name, 48, y + 16);
          ctx.font = 'bold 13px Impact, Arial Black'; ctx.fillStyle = '#ffd21e'; ctx.textAlign = 'right';
          ctx.fillText(String(it.val), W - 28, y + 16);
        }
      } else { // header
        if (vis(y, adv)) {
          ctx.save();
          ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
          ctx.font = 'bold 11px Arial'; ctx.fillStyle = this.C.cyan || '#00ccff';
          ctx.fillText(it.text, 16, y + 22);
          const tw = ctx.measureText(it.text).width;
          ctx.strokeStyle = 'rgba(0,204,255,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(24 + tw, y + 22); ctx.lineTo(W - 16, y + 22); ctx.stroke();
          ctx.restore();
        }
      }
      y += adv;
    }
    ctx.restore();

    // ── Minimal scroll indicator (own draw; isolated from other scrollbars) ──
    if (maxScroll > 0) {
      const trackX = W - 6, trackY = viewTop + 2, trackH = viewH - 4;
      ctx.save();
      ctx.fillStyle = 'rgba(20,24,44,0.55)';
      ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
      const frac = Math.max(0, Math.min(1, viewH / contentH));
      const thumbH = Math.max(24, Math.round(trackH * frac));
      const thumbY = trackY + (trackH - thumbH) * (sc / maxScroll);
      ctx.fillStyle = 'rgba(0,204,255,0.72)';
      ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
      ctx.restore();
    }
  },

  // One-time wheel hook for the STATS screen (own _statsScroll state). Isolated
  // from the settings/map scroll systems; only active while on the stats screen.
  _ensureStatsWheel() {
    // 28 Tmz: wheel-only idi → parmakla kaydirilamiyordu. Ortak yardimciya bagli.
    this._dokunmatikKaydirma('stats',
      () => this.currentScreen === 'stats',
      () => this._statsView,
      () => this._statsScroll,
      (v) => { this._statsScroll = v; });
  },

  // ── KARİYER (CAREER) ─────────────────────────────────────────────────────
  // Polished, scrollable career board. Uses the global `Career` module (guarded
  // with typeof so nothing breaks if it is absent). Own _careerScroll state +
  // _ensureCareerWheel — isolated from every other scroll system on this file.
  drawCareer(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(255,215,0,0.18)');
    this._drawHeader(ctx, W, '🎖  KARİYER');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    const hasC   = (typeof Career !== 'undefined');
    const stages = (hasC && Career.STAGES) ? Career.STAGES : [];
    const total  = stages.length || 0;
    const claimed = (hasC && Career.claimedCount) ? (Career.claimedCount() | 0) : 0;
    const reduce = (typeof Settings !== 'undefined' && Settings.get &&
      (Settings.get('reducedMotion') === true || Settings.get('lowGraphics') === true));
    const t = reduce ? 0 : this.animTime;

    // ── completion summary chip ──
    const sy = 60, sh = 30;
    this._drawCard(ctx, 14, sy, W - 28, sh, { r:9, accent:this.C.gold, active:true,
      fill:['rgba(34,28,8,0.92)','rgba(16,13,6,0.92)'] });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd873'; ctx.font = 'bold 11px Arial';
    ctx.fillText('🎖 ' + claimed + ' / ' + total + ' bölüm tamamlandı', 26, sy + sh / 2);
    const pbx = W - 14 - 120, pbw = 108, pby = sy + sh / 2 - 4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(pbx, pby, pbw, 8, 4); ctx.fill();
    ctx.save(); if (!reduce) { ctx.shadowColor = this.C.gold; ctx.shadowBlur = 5; }
    const pg = ctx.createLinearGradient(pbx, pby, pbx + pbw, pby);
    pg.addColorStop(0, '#ffe680'); pg.addColorStop(1, this.C.gold);
    ctx.fillStyle = pg; ctx.beginPath();
    ctx.roundRect(pbx, pby, Math.max(4, pbw * claimed / Math.max(1, total)), 8, 4); ctx.fill();
    ctx.restore();

    if (!hasC || total === 0) {
      ctx.fillStyle = this.C.dim; ctx.font = '13px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Kariyer yükleniyor...', W / 2, H / 2);
      return;
    }

    // ── per-stage state + variable row heights ──
    const PAD = 12, GAP = 8;
    const st = [];
    for (let i = 0; i < total; i++) {
      const unlocked  = Career.isUnlocked ? Career.isUnlocked(i) : true;
      const isClaimed = Career.isClaimed ? Career.isClaimed(i) : false;
      const canClaim  = Career.canClaim ? Career.canClaim(i) : false;
      const objs = (stages[i] && stages[i].objectives) ? stages[i].objectives : [];
      let h;
      if (!unlocked)       h = 50;
      else if (isClaimed)  h = 54;
      else                 h = 12 + 34 + objs.length * 28 + 22 + (canClaim ? 52 : 0);
      st.push({ unlocked: unlocked, isClaimed: isClaimed, canClaim: canClaim, objs: objs, h: h });
    }
    // content-space row tops
    const tops = [];
    let contentH = 0;
    for (let i = 0; i < total; i++) { tops.push(contentH); contentH += st[i].h + GAP; }

    const viewTop = sy + sh + 8;
    const viewH   = Math.max(80, H - viewTop - 8);
    const maxScroll = Math.max(0, contentH - viewH);

    // ── one-time auto-scroll to the current stage (does not fight user scroll) ──
    if (!this._careerAutoScrolled) {
      this._careerAutoScrolled = true;
      let ci = (Career.currentIndex ? Career.currentIndex() : 0) | 0;
      ci = Math.max(0, Math.min(total - 1, ci));
      this._careerScroll = Math.max(0, Math.min(maxScroll, (tops[ci] || 0) - 10));
    }
    this._careerScroll = Math.max(0, Math.min(maxScroll, this._careerScroll || 0));
    const sc = this._careerScroll;
    this._careerView = { viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll };
    this._ensureCareerWheel();

    // ── draw the list: clip the viewport, cull off-screen rows (no stray hitboxes) ──
    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();
    const cardW = W - PAD * 2;
    for (let i = 0; i < total; i++) {
      const s = st[i], stage = stages[i];
      const y = viewTop + tops[i] - sc;
      if (y + s.h <= viewTop || y >= viewTop + viewH) continue;   // cull off-screen

      const acc = s.isClaimed ? this.C.green
                : s.canClaim  ? this.C.gold
                : s.unlocked  ? this.C.cyan
                : 'rgba(120,130,170,0.5)';
      this._drawCard(ctx, PAD, y, cardW, s.h,
        { r:11, accent: acc, active: s.canClaim || s.isClaimed, glow: s.canClaim && !reduce });

      // stage icon + name
      const dcx = PAD + 26, dcy = y + 25;
      ctx.save(); ctx.globalAlpha = s.unlocked ? 1 : 0.4;
      ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(stage.icon || '🎖', dcx, dcy);
      ctx.restore();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = s.unlocked ? '#FFFFFF' : 'rgba(160,170,220,0.5)';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(stage.name || ('Bölüm ' + (i + 1)), dcx + 22, y + ((s.unlocked && !s.isClaimed) ? 18 : 25));

      if (!s.unlocked) {
        ctx.fillStyle = 'rgba(160,170,220,0.55)'; ctx.font = '18px Arial';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText('🔒', W - PAD - 12, dcy);
        continue;
      }
      if (s.isClaimed) {
        ctx.fillStyle = this.C.green; ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText('✓', W - PAD - 14, dcy);
        ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(120,220,150,0.8)'; ctx.font = '9px Arial';
        ctx.fillText('Tamamlandı', dcx + 22, y + 38);
        continue;
      }

      // unlocked + unclaimed: desc, objectives (progress bars), reward, claim button
      if (stage.desc) {
        ctx.fillStyle = 'rgba(180,190,235,0.6)'; ctx.font = '9px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(String(stage.desc).slice(0, 46), dcx + 22, y + 33);
      }
      let oy = y + 48;
      const ox = PAD + 14, ow = cardW - 28;
      for (const obj of s.objs) {
        let pr = { cur:0, target:1, done:false };
        try { pr = Career.objProgress(obj) || pr; } catch (e) {}
        const cur = Number(pr.cur) || 0, tgt = Number(pr.target) || 1, done = !!pr.done;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = done ? this.C.green : 'rgba(210,220,255,0.85)'; ctx.font = 'bold 10px Arial';
        ctx.fillText((done ? '✓ ' : '') + (obj.label || 'Görev'), ox, oy);
        ctx.textAlign = 'right'; ctx.fillStyle = done ? this.C.green : '#ffd21e'; ctx.font = 'bold 10px Arial';
        ctx.fillText(cur + ' / ' + tgt, ox + ow, oy);
        const pct = Math.max(0, Math.min(1, tgt > 0 ? cur / tgt : 0));
        this._drawProgressBar(ctx, ox, oy + 8, ow, 6, pct,
          done ? '#7cf39a' : '#3aa0ff', done ? '#2fca5c' : '#1f77c4');
        oy += 28;
      }

      // reward summary
      const rw = stage.reward || {};
      const parts = [];
      if (rw.gold)     parts.push('⧆ ' + rw.gold);
      if (rw.diamonds) parts.push('◆ ' + rw.diamonds);
      if (rw.scrap)    parts.push('◈ ' + rw.scrap);
      if (rw.vehicle)  parts.push('🚗 ' + rw.vehicle);
      if (rw.part)     parts.push('🔩 ' + rw.part);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,215,0,0.55)'; ctx.font = 'bold 9px Arial';
      ctx.fillText('ÖDÜL', ox, oy + 4);
      ctx.fillStyle = '#ffd873'; ctx.font = 'bold 11px Arial';
      ctx.fillText(parts.join('   ') || '—', ox + 36, oy + 4);
      oy += 22;

      // glowing "ÖDÜL AL" claim button
      if (s.canClaim) {
        const bw = Math.min(200, cardW - 28), bh = 44;
        const bx = PAD + (cardW - bw) / 2, by = oy;
        ctx.save();
        if (!reduce) { const gl = 0.5 + 0.5 * Math.sin(t * 4); ctx.shadowColor = this.C.gold; ctx.shadowBlur = 8 + gl * 10; }
        this._drawPill(ctx, bx, by, bw, bh, '🎁  ÖDÜL AL', this.C.gold, { dark:true });
        ctx.restore();
        this.buttons.push({ id: 'career_claim_' + i, x: bx, y: by, w: bw, h: bh });
      }
    }
    ctx.restore();

    // ── slim scroll indicator (own draw; isolated) ──
    if (maxScroll > 0) {
      const trackX = W - 6, trackY = viewTop + 2, trackH = viewH - 4;
      ctx.save();
      ctx.fillStyle = 'rgba(20,24,44,0.55)';
      ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
      const frac = Math.max(0, Math.min(1, viewH / contentH));
      const thumbH = Math.max(24, Math.round(trackH * frac));
      const thumbY = trackY + (trackH - thumbH) * (sc / maxScroll);
      ctx.fillStyle = 'rgba(255,215,0,0.72)';
      ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
      ctx.restore();
    }
  },

  // One-time wheel hook for the CAREER screen (own _careerScroll state). Isolated
  // from every other scroll system; only active while on the career screen.
  // Modeled exactly on _ensureStatsWheel / _ensureGarageWheel.
  _ensureCareerWheel() {
    // 28 Tmz: wheel-only idi → parmakla kaydirilamiyordu. Ortak yardimciya bagli.
    this._dokunmatikKaydirma('career',
      () => this.currentScreen === 'career',
      () => this._careerView,
      () => this._careerScroll,
      (v) => { this._careerScroll = v; });
  },

  drawSettings(ctx, W, H) {
    this._drawScreenBg(ctx, W, H, 'rgba(0,204,255,0.16)');
    this._drawHeader(ctx, W, '⚙  AYARLAR');
    this._drawBackBtn(ctx);
    this.buttons = [{ id:'back', x:4, y:4, w:48, h:48 }];

    // Environment config page: full-screen reuse of the map config page, no tab
    // strip (it was opened from the Environment screen, not the maps tab).
    if (this._mapCfgOpen === 'environment') {
      this._drawMapConfigPage(ctx, W, H, 'environment');
      return;
    }

    // ── Top tab strip: GENEL AYARLAR / MAP AYARLARI ───────────────────────────
    const tabY = 60, tabH = 44, tabGap = 6;
    const tabW = (W - 24 - tabGap) / 2;
    const genActive = this._setTab !== 'maps';
    this._drawTab(ctx, 12, tabY, tabW, tabH, 'GENEL AYARLAR', genActive, this.C.cyan);
    this._drawTab(ctx, 12 + tabW + tabGap, tabY, tabW, tabH, 'MAP AYARLARI', !genActive, this.C.fire);
    this.buttons.push({ id: 'settings_tab_general', x: 12, y: tabY, w: tabW, h: tabH });
    this.buttons.push({ id: 'settings_tab_maps', x: 12 + tabW + tabGap, y: tabY, w: tabW, h: tabH });

    if (this._setTab === 'maps') {
      if (this._mapCfgOpen) this._drawMapConfigPage(ctx, W, H, this._mapCfgOpen);
      else                  this._drawMapGrid(ctx, W, H);
      return;
    }

    // GENEL AYARLAR → existing settings content (rendered below the tab strip)
    this._drawSettingsGeneral(ctx, W, H, tabY + tabH + 6);

    // DİL SEÇİCİ paneli — her şeyin ÜSTÜNE çizilir (28 Tmz).
    if (this._langOpen) this._drawLangPicker(ctx, W, H);
  },

  // ── DİL SEÇİCİ (28 Tmz) ───────────────────────────────────────────────────
  // 10 dil; çevirisi hazır olanlar seçilebilir, olmayanlar SOLUK + "YAKINDA".
  // ⚠ Panel açıkken `this.buttons` SIFIRLANIR: hit-test listedeki İLK eşleşmeyi
  //   döndürdüğü için, sıfırlanmazsa panelin altındaki ayar satırları da
  //   tıklanır (tıklama panelden "sızar"). Yalnız panelin kendi butonları kalır.
  _drawLangPicker(ctx, W, H) {
    var LANGS = (typeof I18N !== 'undefined' && I18N.LANGS) ? I18N.LANGS : [];
    var simdi = (typeof I18N !== 'undefined' && I18N.current) ? I18N.current() : 'en';

    // Arka planı karart + alttaki tıklamaları iptal et
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, W, H);
    // ⚠ Tam ekran "dışına basınca kapat" alanı EN SONA eklenir (fonksiyon sonunda).
    //   Başa eklenirse hit-test ilk eşleşeni döndürdüğü için panelin İÇİNDEKİ
    //   tıklamalar da ona düşer ve hiçbir dil seçilemez.
    this.buttons = [];

    var pw = Math.min(W - 40, 560);
    var ph = Math.min(H - 40, 430);
    var px = (W - pw) / 2, py = (H - ph) / 2;

    // Panel
    ctx.fillStyle = 'rgba(14,20,40,0.98)';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,255,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(px + 0.75, py + 0.75, pw - 1.5, ph - 1.5, 14); ctx.stroke();

    // Başlık
    ctx.fillStyle = '#9fd0ff';
    ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    // ⚠ Başlık olarak sadece 'LANGUAGE' yazılır — i18n kancası bunu kendisi
    //   çevirir (tr→DİL, de→SPRACHE, en→LANGUAGE). "DİL / LANGUAGE" yazılsaydı
    //   ikinci kelime de çevrilip "DİL / DİL" olurdu (canlıda görüldü).
    ctx.fillText('LANGUAGE', px + 18, py + 26);

    // Kapat (×)
    var cs = 30, cx = px + pw - cs - 12, cy = py + 11;
    ctx.fillStyle = 'rgba(255,80,80,0.20)';
    ctx.beginPath(); ctx.roundRect(cx, cy, cs, cs, 7); ctx.fill();
    ctx.fillStyle = '#ff9c9c'; ctx.font = 'bold 17px Arial'; ctx.textAlign = 'center';
    ctx.fillText('×', cx + cs / 2, cy + cs / 2 + 1);
    this.buttons.push({ id: 'lang_close', x: cx, y: cy, w: cs, h: cs });

    // Izgara: 2 sütun × 5 satır
    var COLS = 2, ROWS = Math.ceil(LANGS.length / COLS);
    var pad = 16, gap = 8, gridTop = py + 46;
    var cw = (pw - pad * 2 - gap * (COLS - 1)) / COLS;
    var ch = (ph - (gridTop - py) - pad - gap * (ROWS - 1)) / ROWS;

    for (var i = 0; i < LANGS.length; i++) {
      var L = LANGS[i];
      var col = i % COLS, row = Math.floor(i / COLS);
      var x = px + pad + col * (cw + gap);
      var y = gridTop + row * (ch + gap);
      var secili = (L.code === simdi);
      var hazir = !!L.ready;

      // Kart
      if (secili)      ctx.fillStyle = 'rgba(0,190,255,0.22)';
      else if (hazir)  ctx.fillStyle = 'rgba(40,52,88,0.85)';
      else             ctx.fillStyle = 'rgba(26,30,46,0.75)';   // hazır değil → soluk
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 8); ctx.fill();

      ctx.strokeStyle = secili ? 'rgba(120,220,255,0.85)'
                    : (hazir ? 'rgba(120,150,210,0.25)' : 'rgba(90,95,120,0.18)');
      ctx.lineWidth = secili ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, cw - 1, ch - 1, 8); ctx.stroke();

      // Dilin kendi adı
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = hazir ? (secili ? '#ffffff' : '#d8e4ff') : 'rgba(150,158,185,0.55)';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(L.native, x + 14, y + ch / 2 - (hazir ? 0 : 6));

      if (!hazir) {
        ctx.fillStyle = 'rgba(255,190,90,0.65)';
        ctx.font = 'bold 9px Arial';
        ctx.fillText('YAKINDA', x + 14, y + ch / 2 + 9);
      } else if (secili) {
        ctx.fillStyle = '#7fe3ff'; ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('✓', x + cw - 14, y + ch / 2);
      }

      // Yalnız HAZIR diller tıklanabilir — hazır olmayan için buton kaydedilmez,
      // böylece dokunmak hiçbir şey yapmaz (yanlış seçim imkânsız).
      if (hazir) this.buttons.push({ id: 'lang_pick_' + L.code, x: x, y: y, w: cw, h: ch });
    }

    // EN SON: panelin dışına basınca kapat (yukarıdaki uyarıya bak — sıra önemli)
    this.buttons.push({ id: 'lang_close', x: 0, y: 0, w: W, h: H });

    ctx.textAlign = 'left';
  },

  // General-settings content. Declarative row list → measured content height →
  // the whole panel scrolls vertically (own _setGenScroll state) so extra rows
  // never overflow short screens. Isolated from the MAP AYARLARI scroll system.
  _drawSettingsGeneral(ctx, W, H, startY) {
    const S = (typeof Settings !== 'undefined') ? Settings : null;
    const gv = (k) => S ? S.get(k) : false;
    // Only surface keys that actually exist in Settings.defaults (additive).
    const has = (k) => !!(S && S.defaults && Object.prototype.hasOwnProperty.call(S.defaults, k));

    const rowH = 44, rowGap = 4;

    // Build the row list first so content height is known up-front (deterministic
    // layout ⇒ no need to touch the map-config scroll bookkeeping).
    const rows = [];
    const T = (label, key, hint) => rows.push({ t: 'toggle', label: label, key: key, hint: hint });
    const C = (label, key, valText) => rows.push({ t: 'cycle', label: label, key: key, valText: valText });

    T('MUSIC', 'music');
    T('SOUND EFFECTS', 'sfx');
    T('VIBRATION', 'vibrate');
    C('VOLUME', 'volMaster', Math.round(gv('volMaster') * 100) + '%');
    // BUGFIX(30 Tmz) — 6 kademeli Kalite etiketi. Eski 3 değerli eşleme
    // ULTRA/ÇOK YÜKSEK/ORTA ÜSTÜ kademelerini "YÜKSEK" diye gösteriyordu.
    C('GRAPHICS', 'graphics', (function () {
      try { if (typeof Kalite !== 'undefined' && Kalite.etiket) return Kalite.etiket(); } catch (e) {}
      return { low:'PERFORMANS', med:'NORMAL', high:'YÜKSEK' }[gv('graphics')] || 'NORMAL';
    })());
    C('CAMERA', 'cameraMode', String(gv('cameraMode')).toUpperCase());
    T('SLOW MOTION', 'slowmo', 'Büyük taklada ağır çekim');
    T('SCREEN SHAKE', 'shake', 'Çarpma/afet sarsıntısı');
    T('ON-SCREEN CONTROLS', 'mobileControls', 'Ekranda gaz/fren butonları');
    T('TUTORIAL', 'tutorial', 'İlk oyun rehberi');
    // DİL (28 Tmz): artık 2 dil arasında dönmüyor — tıklanınca 10 dilli seçici
    // panel açılıyor (bkz. _drawLangPicker). Değer olarak dilin KENDİ adı yazılır.
    C('LANGUAGE', 'language',
      (typeof I18N !== 'undefined' && I18N.nativeName)
        ? I18N.nativeName(gv('language')).toUpperCase()
        : String(gv('language')).toUpperCase());

    // ── NEW toggle rows (additive; generic set_toggle_<key> dispatch works with
    // no other changes). Rendered only when the key exists in Settings.defaults.
    if (has('reducedMotion')) T('AZ HAREKET', 'reducedMotion', 'Animasyon/sarsıntı azalt');
    if (has('autoNitro'))     T('OTO NİTRO', 'autoNitro', 'Otomatik nitro');
    if (has('brakeAssist'))   T('FREN DESTEĞİ', 'brakeAssist');
    if (has('showFps'))       T('FPS GÖSTER', 'showFps');
    if (has('muteOnBlur'))    T('ODAK YOK=SESSİZ', 'muteOnBlur');
    // Bot yarışı zorluğu (1-20) — SaveData'da; set_cycle_botLevel özel olarak işlenir
    C('BOT SEVİYESİ (1-20)', 'botLevel', (((typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('botLevel') || 1) : 1)) + ' / 20');

    // ── Measure content + clamp scroll (own state, separate from map scroll) ──
    const bw2 = (W - 24 - 8) / 2;
    const actionsH = 4 + 44 + 8 + 44;   // gap + STATS/CLOUD row + gap + DELETE row
    const contentH = rows.length * (rowH + rowGap) + actionsH;
    const viewTop = startY;
    const viewH = Math.max(40, H - viewTop - 10);
    const maxScroll = Math.max(0, contentH - viewH);
    this._setGenScroll = Math.max(0, Math.min(maxScroll, this._setGenScroll || 0));
    const sc = this._setGenScroll;
    this._setGenView = { viewTop: viewTop, viewH: viewH, contentH: contentH, maxScroll: maxScroll };
    this._ensureSetGenWheel();

    // ── Draw: clip the row area, offset by scroll ──
    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();

    let y = viewTop - sc;                                   // screen-space cursor
    const vis = (top, h) => (top + h > viewTop && top < viewTop + viewH);

    // 🎨 31 Tmz — her satır kendi rengini alır (bkz. `_SATIR_RENK`).
    //    Metin konumları, satır yüksekliği (44) ve buton id/kutuları AYNEN korundu;
    //    değişen YALNIZ renk. Böylece `dogrula-tasma`/`dogrula-mobil` etkilenmez.
    for (let ri = 0; ri < rows.length; ri++) {
      const r = rows[ri];
      const renk = this._satirRenk(ri);
      if (vis(y, rowH)) {
        if (r.t === 'toggle') {
          const on = gv(r.key) !== false;
          // Şerit KAPALIYKEN de duruyor (satır kimliği kaybolmasın) ama karartılmış.
          this._drawCard(ctx, 12, y, W-24, rowH,
            { r:9, accent: on ? renk : this._karart(renk, 0.42), active: on, glow: on });
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(r.label, 22, y + rowH/2 - (r.hint?5:0));
          if (r.hint) { ctx.fillStyle = 'rgba(170,180,220,0.5)'; ctx.font = '8px Arial'; ctx.fillText(r.hint, 22, y + rowH/2 + 8); }
          const tw = 46, th = 22, tx = W - tw - 16, ty = y + (rowH-th)/2;
          ctx.fillStyle = on ? this._hexA(renk, 0.30) : 'rgba(40,40,70,0.5)';
          ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, th/2); ctx.fill();
          ctx.strokeStyle = on ? this._hexA(renk, 0.55) : 'rgba(255,255,255,0.10)';
          ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(tx+0.5, ty+0.5, tw-1, th-1, (th-1)/2); ctx.stroke();
          ctx.save(); if (on) { ctx.shadowColor = renk; ctx.shadowBlur = 8; }
          ctx.fillStyle = on ? renk : '#445';
          ctx.beginPath(); ctx.arc(on ? tx+tw-th/2 : tx+th/2, ty+th/2, th/2-2, 0, 6.28); ctx.fill(); ctx.restore();
          this.buttons.push({ id: 'set_toggle_' + r.key, x: 12, y: y, w: W-24, h: rowH });
        } else {
          this._drawCard(ctx, 12, y, W-24, rowH, { r:9, accent: this._karart(renk, 0.62) });
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(r.label, 22, y + rowH/2);
          const bw = 96, bx = W - bw - 16, by = y + (rowH-24)/2;
          // Değer hapı artık satırın rengini taşıyor (eskiden HEPSİ aynı maviydi).
          const cyg = ctx.createLinearGradient(bx, by, bx, by+24);
          cyg.addColorStop(0, this._hexA(renk, 0.40)); cyg.addColorStop(1, this._hexA(this._karart(renk, 0.45), 0.55));
          ctx.fillStyle = cyg; ctx.beginPath(); ctx.roundRect(bx, by, bw, 24, 7); ctx.fill();
          ctx.strokeStyle = this._hexA(renk, 0.45); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(bx+0.5, by+0.5, bw-1, 23, 7); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
          ctx.fillText('‹ ' + r.valText + ' ›', bx + bw/2, y + rowH/2, bw - 10);
          this.buttons.push({ id: 'set_cycle_' + r.key, x: 12, y: y, w: W-24, h: rowH });
        }
      }
      y += rowH + rowGap;
    }

    // Aksiyon butonları (STATS / CLOUD / DELETE) — reachable at end of scroll.
    y += 4;
    if (vis(y, 44)) {
      this._drawCyanBtn(ctx, 12, y, bw2, 44, '📊 STATS');
      this.buttons.push({ id: 'open_stats', x: 12, y: y, w: bw2, h: 44 });
      this._drawCyanBtn(ctx, 12 + bw2 + 8, y, bw2, 44, '☁ CLOUD SYNC');
      this.buttons.push({ id: 'cloud_sync', x: 12 + bw2 + 8, y: y, w: bw2, h: 44 });
    }
    y += 52;
    if (vis(y, 44)) {
      this._drawDarkBtn(ctx, 12, y, W - 24, 44, '✖  DELETE ALL DATA');
      this.buttons.push({ id: 'reset_data', x: 12, y: y, w: W - 24, h: 44 });
    }
    ctx.restore();

    // ── Minimal scroll indicator (own draw; does not touch _drawScrollbar/_sbGeom) ──
    if (maxScroll > 0) {
      const trackX = W - 6, trackY = viewTop + 2, trackH = viewH - 4;
      ctx.save();
      ctx.fillStyle = 'rgba(20,24,44,0.55)';
      ctx.beginPath(); ctx.roundRect(trackX, trackY, 4, trackH, 2); ctx.fill();
      const frac = Math.max(0, Math.min(1, viewH / contentH));
      const thumbH = Math.max(24, Math.round(trackH * frac));
      const thumbY = trackY + (trackH - thumbH) * (sc / maxScroll);
      ctx.fillStyle = 'rgba(0,204,255,0.72)';
      ctx.beginPath(); ctx.roundRect(trackX, thumbY, 4, thumbH, 2); ctx.fill();
      ctx.restore();
    }
  },

  // One-time wheel hook for the GENEL AYARLAR panel. main.js's wheel handler is
  // gated by _onMapsScreen() (false on this tab), so we scroll _setGenScroll here.
  // Guarded so only a single listener is ever attached.
  _ensureSetGenWheel() {
    // 28 Tmz: wheel-only idi → parmakla kaydirilamiyordu. Ortak yardimciya bagli.
    this._dokunmatikKaydirma('setgen',
      () => this.currentScreen === 'settings' && this._setTab !== 'maps' && !this._mapCfgOpen,
      () => this._setGenView,
      () => this._setGenScroll,
      (v) => { this._setGenScroll = v; });
  },

  // ── MAP AYARLARI: grid of all 26 maps ─────────────────────────────────────
  _drawMapConfigMapIds() {
    return (typeof MapSettings !== 'undefined' && MapSettings.MAPS_META)
      ? Object.keys(MapSettings.MAPS_META) : [];
  },

  _drawMapGrid(ctx, W, H) {
    if (typeof MapSettings === 'undefined') return;
    const ids = this._drawMapConfigMapIds();
    const topY = 100;                 // below header + tab strip
    const viewH = H - topY - 10;
    const cols = W < 420 ? 2 : 3;
    const pad = 12, gap = 10;
    const cardH = 96;
    const rows0 = Math.ceil(ids.length / cols);
    const contentH = rows0 * (cardH + gap);
    const maxScroll0 = Math.max(0, contentH - viewH);
    // reserve a gutter on the right for the scrollbar when the grid scrolls
    const gutter = maxScroll0 > 0 ? this._SB_W + 6 : 0;
    const cardW = (W - pad * 2 - gutter - gap * (cols - 1)) / cols;
    const maxScroll = maxScroll0;
    this._mapGridScroll = Math.max(0, Math.min(maxScroll, this._mapGridScroll || 0));
    const sc = this._mapGridScroll;
    // publish viewport metrics so wheel/keyboard/scrollbar can page correctly
    this._sbView = { topY: topY, viewH: viewH, contentH: contentH, maxScroll: maxScroll };

    // clip region for the grid
    ctx.save();
    ctx.beginPath(); ctx.rect(0, topY, W, viewH); ctx.clip();

    for (let i = 0; i < ids.length; i++) {
      const mid = ids[i];
      const meta = MapSettings.meta(mid) || { emoji:'🗺', col:'#00CCFF', theme:mid };
      const cx = pad + (i % cols) * (cardW + gap);
      const cy = topY + Math.floor(i / cols) * (cardH + gap) - sc;
      if (cy + cardH < topY || cy > topY + viewH) continue;  // cull

      this._drawCard(ctx, cx, cy, cardW, cardH, { r:12, accent: meta.col, active: true, glow: false });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '34px Arial'; ctx.fillStyle = '#fff';
      ctx.fillText(meta.emoji || '🗺', cx + cardW/2, cy + 34);
      ctx.fillStyle = meta.col;
      ctx.font = 'bold 11px Arial';
      this._fitText(ctx, UI._trBuyuk(meta.theme || mid), cx + cardW/2, cy + 66, cardW - 12);
      ctx.fillStyle = 'rgba(180,190,225,0.6)';
      ctx.font = '8px Arial';
      ctx.fillText('AYARLA ▸', cx + cardW/2, cy + 84);

      this.buttons.push({ id: 'mapcfg_open_' + mid, x: cx, y: Math.max(topY, cy), w: cardW,
        h: Math.min(cardH, cy + cardH - Math.max(topY, cy)) });
    }
    ctx.restore();

    // scroll hint + on-screen scroll buttons (▲/▼) + draggable scrollbar
    if (maxScroll > 0) {
      this._drawScrollButtons(ctx, W, H, topY, viewH, sc, maxScroll, 'mapcfg_scroll');
      this._drawScrollbar(ctx, W, topY, viewH, sc, maxScroll, contentH, 'grid');
    } else {
      this._sbGeom = null;
    }
  },

  // ── MAP AYARLARI: per-map settings page ───────────────────────────────────
  _drawMapConfigPage(ctx, W, H, mid) {
    if (typeof MapSettings === 'undefined') return;
    // Clear per-frame slider-bar hit-rects; _drawSettingRow re-populates them.
    this._sliderBars = [];
    const isEnv = (mid === 'environment');
    const meta = isEnv
      ? { emoji: '☄️', col: this.C.fire, theme: 'AFET & ORTAM AYARLARI' }
      : (MapSettings.meta(mid) || { emoji:'🗺', col:'#00CCFF', theme:mid });
    const acc = meta.col;

    // Sub-header row (emoji + theme + GERİ + SIFIRLA)
    const shY = 96, shH = 34;
    this._drawCard(ctx, 12, shY, W - 24, shH, { r:9, accent: acc, active: true });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '20px Arial'; ctx.fillStyle = '#fff';
    ctx.fillText(meta.emoji || '🗺', 22, shY + shH/2);
    ctx.fillStyle = acc; ctx.font = 'bold 12px Arial';
    ctx.fillText(UI._trBuyuk(meta.theme || mid), 50, shY + shH/2);

    // GERİ + SIFIRLA buttons (right side)
    const rbW = 66, rbH = 24, rbY = shY + (shH - rbH)/2;
    const resetX = W - 12 - rbW;
    const backX = resetX - rbW - 6;
    this._drawPill(ctx, backX, rbY, rbW, rbH, '◀ GERİ', this.C.dim, { flat:true });
    this._drawPill(ctx, resetX, rbY, rbW, rbH, 'SIFIRLA', this.C.red, { flat:true });
    this.buttons.push({ id: 'mapcfg_back', x: backX, y: rbY, w: rbW, h: rbH });
    this.buttons.push({ id: 'mapcfg_reset_' + mid, x: resetX, y: rbY, w: rbW, h: rbH });

    // ── Scrollable list of 200 settings ──
    const defs = MapSettings.defsFor(mid) || [];
    const common = (typeof MapSettings.COMMON_COUNT === 'number') ? MapSettings.COMMON_COUNT : 100;
    const topY = shY + shH + 8;
    const viewH = H - topY - 10;
    const rowH = 40, rowGap = 6, labelH = 24;

    // Compute content height from the REAL row count + dividers (none on the env page)
    const contentH = defs.length * (rowH + rowGap) + (isEnv ? 0 : 2 * (labelH + 4));
    const maxScroll = Math.max(0, contentH - viewH);
    this._mapCfgScroll = Math.max(0, Math.min(maxScroll, this._mapCfgScroll || 0));
    const sc = this._mapCfgScroll;
    // publish viewport metrics (used by wheel/keyboard paging + scrollbar drag)
    this._sbView = { topY: topY, viewH: viewH, contentH: contentH, maxScroll: maxScroll, rowH: rowH, rowGap: rowGap };

    // reserve a gutter on the right for the scrollbar when the list scrolls
    const gutter = maxScroll > 0 ? this._SB_W + 6 : 0;
    const Wc = W - gutter;   // effective width for rows/labels so they don't overlap the bar

    ctx.save();
    ctx.beginPath(); ctx.rect(0, topY, Wc, viewH); ctx.clip();

    let y = topY - sc;
    // ORTAK AYARLAR divider (map pages only; the environment page has no common rows)
    if (defs.length && !isEnv) {
      this._drawGroupLabel(ctx, Wc, y, topY, viewH, 'ORTAK AYARLAR (' + Math.min(common, defs.length) + ')', this.C.cyan);
      y += labelH + 4;
    }
    for (let i = 0; i < defs.length; i++) {
      if (!isEnv && i === common) {
        this._drawGroupLabel(ctx, Wc, y, topY, viewH, "MAP'E ÖZEL (" + (defs.length - common) + ')', this.C.fire);
        y += labelH + 4;
      }
      const d = defs[i];
      // cull off-screen rows (still advance y)
      if (y + rowH >= topY && y <= topY + viewH) {
        this._drawSettingRow(ctx, Wc, y, rowH, mid, d, acc);
      }
      y += rowH + rowGap;
    }
    ctx.restore();

    if (maxScroll > 0) {
      this._drawScrollButtons(ctx, W, H, topY, viewH, sc, maxScroll, 'mapcfg_scroll');
      this._drawScrollbar(ctx, W, topY, viewH, sc, maxScroll, contentH, 'cfg');
    } else {
      this._sbGeom = null;
    }

    // Per-setting help popup (modal). Drawn last so it sits above the rows;
    // it clears + re-registers buttons so only its close targets are clickable.
    if (this._helpOpen) this._drawHelpPopup(ctx, W, H);
  },

  // Modal explanation popup for a single setting. When open, it is the ONLY
  // interactive layer: it clears this.buttons and registers just the two
  // close targets (full-screen backdrop + ✕ KAPAT), both id 'mapcfg_help_close'.
  // handleClick() returns the FIRST matching button, so clearing guarantees no
  // row button underneath can leak through.
  _drawHelpPopup(ctx, W, H) {
    const raw = (this._helpText || '').toString();
    // Dark translucent full-screen backdrop.
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,16,0.72)';
    ctx.fillRect(0, 0, W, H);

    // Only the popup is clickable while it's open.
    this.buttons = [];
    // Backdrop tap closes.
    this.buttons.push({ id: 'mapcfg_help_close', x: 0, y: 0, w: W, h: H });

    const pw = Math.min(560, W - 40);
    const px = (W - pw) / 2;
    const padX = 18, padTop = 44, lineH = 18, maxTextW = pw - padX * 2;

    // Word-wrap: honor explicit \n, then wrap each paragraph to maxTextW.
    ctx.font = '13px Arial';
    const lines = [];
    const paras = raw.split('\n');
    for (let p = 0; p < paras.length; p++) {
      const words = paras[p].split(/\s+/).filter(Boolean);
      if (!words.length) { lines.push(''); continue; }
      let cur = '';
      for (let wi = 0; wi < words.length; wi++) {
        const test = cur ? (cur + ' ' + words[wi]) : words[wi];
        if (ctx.measureText(test).width > maxTextW && cur) { lines.push(cur); cur = words[wi]; }
        else cur = test;
      }
      if (cur) lines.push(cur);
    }

    const title = (this._helpTitle || 'AÇIKLAMA').toString();
    const bodyH = lines.length * lineH;
    const btnH = 30, btnGap = 14;
    let panelH = padTop + bodyH + btnGap + btnH + 16;
    const maxPanelH = H - 40;
    if (panelH > maxPanelH) panelH = maxPanelH;
    const py = Math.max(20, (H - panelH) / 2);

    // Panel (rounded, dark).
    ctx.beginPath(); ctx.roundRect(px, py, pw, panelH, 14);
    ctx.fillStyle = 'rgba(16,20,40,0.98)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = this.C.cyan; ctx.stroke();

    // Title.
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.C.cyan; ctx.font = 'bold 13px Arial';
    ctx.fillText(title, px + padX, py + 26);
    ctx.strokeStyle = 'rgba(0,204,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + padX, py + 34); ctx.lineTo(px + pw - padX, py + 34); ctx.stroke();

    // Body text (clipped to the panel so long text never spills out).
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py + padTop - lineH, pw, panelH - padTop - btnH - btnGap);
    ctx.clip();
    ctx.fillStyle = this.C.text; ctx.font = '13px Arial';
    let ty = py + padTop;
    for (let i = 0; i < lines.length; i++) { ctx.fillText(lines[i], px + padX, ty); ty += lineH; }
    ctx.restore();

    // ✕ KAPAT button (bottom-right of panel).
    const cbW = 96, cbX = px + pw - padX - cbW, cbY = py + panelH - btnH - 12;
    this._drawPill(ctx, cbX, cbY, cbW, btnH, '✕ KAPAT', this.C.red, { flat:true });
    this.buttons.push({ id: 'mapcfg_help_close', x: cbX, y: cbY, w: cbW, h: btnH });

    ctx.restore();
  },

  _drawGroupLabel(ctx, W, y, topY, viewH, label, accent) {
    if (y + 22 < topY || y > topY + viewH) return;
    this._drawBand(ctx, 12, y, W - 24, label, accent);
  },

  // One setting row (slider with −/＋ or toggle pill)
  _drawSettingRow(ctx, W, y, rowH, mid, d, acc) {
    const isTog = d.t === 't';
    this._drawCard(ctx, 12, y, W - 24, rowH, { r:8, accent: acc });
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial';
    const _labMaxW = W * 0.5;
    this._fitTextLeft(ctx, d.l, 22, y + 13, _labMaxW);

    // Small circular "?" help button just to the RIGHT of the label text.
    // Position after the measured label width, clamped so it never runs past
    // the label zone into the value / −／＋ / toggle controls.
    ctx.font = 'bold 10px Arial';
    let _labW = ctx.measureText(d.l).width;
    if (_labW > _labMaxW) _labW = _labMaxW;
    const _hr = 8;                       // radius (16px circle)
    let _hcx = 22 + _labW + 6 + _hr;
    const _hcxMax = 22 + _labMaxW + 6 + _hr;   // hard cap at end of label zone
    if (_hcx > _hcxMax) _hcx = _hcxMax;
    const _hcy = y + 13;
    ctx.save();
    ctx.beginPath(); ctx.arc(_hcx, _hcy, _hr, 0, 6.28);
    ctx.fillStyle = 'rgba(0,204,255,0.16)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = this.C.cyan; ctx.stroke();
    ctx.fillStyle = this.C.cyan; ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?', _hcx, _hcy + 0.5);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    this.buttons.push({ id: 'mapcfg_help_' + mid + '__' + d.i, x: _hcx - _hr - 2, y: _hcy - _hr - 2, w: (_hr + 2) * 2, h: (_hr + 2) * 2 });

    if (isTog) {
      const on = MapSettings.get(mid, d.i) === true || MapSettings.get(mid, d.i) === 1;
      const pw = 58, ph = 22, px = W - 12 - pw - 8, py = y + (rowH - ph)/2;
      ctx.fillStyle = on ? 'rgba(0,204,68,0.35)' : 'rgba(40,40,70,0.5)';
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph/2); ctx.fill();
      ctx.save(); if (on) { ctx.shadowColor = this.C.green; ctx.shadowBlur = 7; }
      ctx.fillStyle = on ? this.C.green : '#556';
      ctx.beginPath(); ctx.arc(on ? px+pw-ph/2 : px+ph/2, py+ph/2, ph/2-2, 0, 6.28); ctx.fill(); ctx.restore();
      ctx.fillStyle = on ? '#dfffe6' : 'rgba(180,190,225,0.7)'; ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(on ? 'ON' : 'OFF', on ? px+ph/2+3 : px+pw-ph/2-3, py+ph/2);
      this.buttons.push({ id: 'mapcfg_tog_' + mid + '__' + d.i, x: px, y: py, w: pw, h: ph });
    } else {
      const val = MapSettings.get(mid, d.i);
      const mn = d.mn, mx = d.mx;
      const frac = (mx > mn) ? Math.max(0, Math.min(1, (val - mn) / (mx - mn))) : 0;
      // value + unit text (right of label area, second line)
      const vt = this._fmtNum(val) + (d.u ? (' ' + d.u) : '');
      ctx.textAlign = 'left'; ctx.fillStyle = acc; ctx.font = 'bold 9px Arial';
      ctx.fillText(vt, 22, y + 29);
      // − / ＋ buttons on the right
      const bs = 24, gap = 6;
      const plusX = W - 12 - bs - 8;
      const minusX = plusX - bs - gap;
      // filled bar between label and buttons
      const barX = 22, barW = minusX - barX - 10, barY = y + 20, barH = 6;
      const bx2 = W * 0.5 + 4;
      const bgX = bx2, bgW = minusX - bgX - 10;
      const bgY = y + rowH/2 - 3;
      if (bgW > 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.roundRect(bgX, bgY, bgW, 6, 3); ctx.fill();
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.roundRect(bgX, bgY, Math.max(4, bgW * frac), 6, 3); ctx.fill();
        // Draggable knob for affordance (press+drag on the bar sweeps mn..mx).
        const knobX = bgX + bgW * frac;
        const knobCY = bgY + 3;
        ctx.save();
        ctx.shadowColor = acc; ctx.shadowBlur = 6;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(knobX, knobCY, 6, 0, 6.28); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = acc; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(knobX, knobCY, 6, 0, 6.28); ctx.stroke();
        // Record this slider bar's hit-rect + range so main.js can drag-to-set.
        // Generous vertical padding so the whole row-height band grabs the bar.
        if (this._sliderBars) {
          this._sliderBars.push({
            settingId: d.i, mn: mn, mx: mx, st: (d.st || 1),
            barX: bgX, barW: bgW, barY: bgY,
            x: bgX, y: y + 2, w: bgW, h: rowH - 4
          });
        }
      }
      this._drawPill(ctx, minusX, y + (rowH - bs)/2, bs, bs, '−', this.C.dim, { flat:true });
      this._drawPill(ctx, plusX,  y + (rowH - bs)/2, bs, bs, '＋', acc, { flat:true });
      this.buttons.push({ id: 'mapcfg_dec_' + mid + '__' + d.i, x: minusX, y: y + (rowH - bs)/2, w: bs, h: bs });
      this.buttons.push({ id: 'mapcfg_inc_' + mid + '__' + d.i, x: plusX,  y: y + (rowH - bs)/2, w: bs, h: bs });
    }
  },

  // On-screen scroll ▲/▼ buttons (right edge, left of the scrollbar gutter).
  // Each press jumps ~half a viewport (see main.js dispatch).
  _drawScrollButtons(ctx, W, H, topY, viewH, sc, maxScroll, idPrefix) {
    const bs = 30, bx = W - bs - 6 - (this._SB_W + 6);  // sit left of the scrollbar
    const upY = topY + 4, dnY = topY + viewH - bs - 4;
    // up
    ctx.save(); ctx.globalAlpha = sc > 0 ? 1 : 0.35;
    this._drawPill(ctx, bx, upY, bs, bs, '▲', this.C.cyan, { flat:true });
    ctx.restore();
    // down
    ctx.save(); ctx.globalAlpha = sc < maxScroll ? 1 : 0.35;
    this._drawPill(ctx, bx, dnY, bs, bs, '▼', this.C.cyan, { flat:true });
    ctx.restore();
    this.buttons.push({ id: idPrefix + '_up',   x: bx, y: upY, w: bs, h: bs });
    this.buttons.push({ id: idPrefix + '_down', x: bx, y: dnY, w: bs, h: bs });
  },

  // Visible, draggable scrollbar (track + thumb) on the far right edge.
  // Thumb height reflects viewport/content fraction, position reflects sc.
  // Geometry is stashed on this._sbGeom so main.js can hit-test drag/track taps.
  _drawScrollbar(ctx, W, topY, viewH, sc, maxScroll, contentH, kind) {
    const sbW = this._SB_W;
    const trackX = W - sbW - 4;
    const trackY = topY + 2;
    const trackH = viewH - 4;
    // track
    ctx.save();
    ctx.fillStyle = 'rgba(20,24,44,0.55)';
    ctx.beginPath(); ctx.roundRect(trackX, trackY, sbW, trackH, sbW / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,220,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(trackX + 0.5, trackY + 0.5, sbW - 1, trackH - 1, sbW / 2); ctx.stroke();
    // thumb — height = visible fraction, min 24px so it stays grabbable on a ~600-row list
    const frac = contentH > 0 ? Math.max(0, Math.min(1, viewH / contentH)) : 1;
    const thumbH = Math.max(24, Math.round(trackH * frac));
    const scrollFrac = maxScroll > 0 ? (sc / maxScroll) : 0;
    const thumbY = trackY + (trackH - thumbH) * scrollFrac;
    const dragging = this._sbDrag && this._sbDrag.kind === kind;
    ctx.fillStyle = dragging ? this.C.cyan : 'rgba(0,204,255,0.72)';
    ctx.save();
    if (dragging) { ctx.shadowColor = this.C.cyan; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.roundRect(trackX + 1, thumbY, sbW - 2, thumbH, (sbW - 2) / 2); ctx.fill();
    ctx.restore();
    // grip lines
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    const gcx = trackX + sbW / 2, gcy = thumbY + thumbH / 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(gcx - 3, gcy + i * 3); ctx.lineTo(gcx + 3, gcy + i * 3); ctx.stroke();
    }
    ctx.restore();
    this._sbGeom = { kind: kind, trackX: trackX, trackY: trackY, trackH: trackH, sbW: sbW,
      thumbY: thumbY, thumbH: thumbH, maxScroll: maxScroll, contentH: contentH, topY: topY, viewH: viewH };
  },

  _fmtNum(v) {
    if (typeof v !== 'number') return String(v);
    if (Number.isInteger(v)) return String(v);
    return (Math.round(v * 100) / 100).toString();
  },

  // ── TÜRKÇE BÜYÜK HARF (2 Ağu) ────────────────────────────────────────────
  // 🔴 `String.toUpperCase()` DİLDEN BAĞIMSIZDIR: `i → I`. Türkçede `i → İ`.
  // Klan ekranlarının PNG'sine bakarken yakalandı; aynı hata `ui.js`'in harita
  // seçim kartlarındaydı. ÖLÇÜLDÜ: `MapSettings.MAPS_META[*].theme` üzerinde
  // 51 haritanın 17'si bozuluyordu — Sahil→SAHIL · Şehir→ŞEHIR ·
  // Dağ Zirvesi→DAĞ ZIRVESI · Hız Treni→HIZ TRENI · Lav Nehri→LAV NEHRI ·
  // Sakura Bahçesi→SAKURA BAHÇESI · Toksik→TOKSIK …
  // ⚠ `toLocaleUpperCase('tr')` desteklenmeyen ortamda yedek eşlemeye düşer.
  // ⚠ Türkçe metni BÜYÜTEN yeni kod yazarken `toUpperCase()` DEĞİL bunu kullan.
  _TR_BUYUK: { 'i': 'İ', 'ı': 'I', 'ğ': 'Ğ', 'ü': 'Ü', 'ş': 'Ş', 'ö': 'Ö', 'ç': 'Ç' },
  _trBuyuk(metin) {
    const s = String(metin == null ? '' : metin);
    try {
      const b = s.toLocaleUpperCase('tr');
      if (b.indexOf('İ') >= 0 || s.indexOf('i') < 0) return b;
    } catch (e) { }
    let o = '';
    for (let i = 0; i < s.length; i++) {
      const c = s.charAt(i);
      o += (this._TR_BUYUK[c] || c.toUpperCase());
    }
    return o;
  },

  // fit centered text into maxW (shrink font if needed)
  _fitText(ctx, txt, cx, cy, maxW) {
    let fs = 11;
    ctx.font = 'bold ' + fs + 'px Arial';
    while (ctx.measureText(txt).width > maxW && fs > 7) { fs--; ctx.font = 'bold ' + fs + 'px Arial'; }
    ctx.textAlign = 'center';
    ctx.fillText(txt, cx, cy);
  },
  _fitTextLeft(ctx, txt, x, y, maxW) {
    let t = txt;
    while (ctx.measureText(t).width > maxW && t.length > 4) t = t.slice(0, -1);
    if (t !== txt) t = t.slice(0, -1) + '…';
    ctx.fillText(t, x, y);
  },

  // ── MAP AYARLARI: apply an inc/dec/toggle then re-render happens next frame ─
  _mapCfgStep(mid, id, dir) {
    if (typeof MapSettings === 'undefined') return;
    const defs = MapSettings.defsFor(mid) || [];
    const d = defs.find(x => x.i === id);
    if (!d) return;
    if (d.t === 't') return;
    let v = MapSettings.get(mid, id);
    if (typeof v !== 'number') v = d.d;
    // Adaptif adım: geniş aralıklı ayarlarda (1..10000) her tık ~%20 değiştirsin (belirgin)
    let step = d.st || 1;
    if ((d.mx - d.mn) >= 500) step = Math.max(20, Math.round(Math.abs(v) * 0.20));
    v = v + dir * step;
    v = Math.max(d.mn, Math.min(d.mx, Math.round(v)));
    MapSettings.set(mid, id, v);
  },
  _mapCfgToggle(mid, id) {
    if (typeof MapSettings === 'undefined') return;
    const cur = MapSettings.get(mid, id);
    MapSettings.set(mid, id, !(cur === true || cur === 1));
  },
  // Current scroll offset of whichever map screen is active.
  _mapCfgGetScroll() {
    return this._mapCfgOpen ? (this._mapCfgScroll || 0) : (this._mapGridScroll || 0);
  },
  // Set scroll offset, clamped to [0, maxScroll] using the last-drawn viewport.
  _mapCfgSetScroll(v) {
    const max = (this._sbView && typeof this._sbView.maxScroll === 'number') ? this._sbView.maxScroll : Infinity;
    v = Math.max(0, Math.min(max, v || 0));
    if (this._mapCfgOpen) this._mapCfgScroll = v; else this._mapGridScroll = v;
  },
  // Scroll the active map screen by delta px (used by wheel + buttons). Clamped.
  _mapCfgScrollBy(delta) {
    this._mapCfgSetScroll(this._mapCfgGetScroll() + delta);
  },
  // Wheel step: ~40% of the viewport per notch (fast on a ~600-row list).
  _mapCfgWheelStep(dir) {
    const vh = (this._sbView && this._sbView.viewH) ? this._sbView.viewH : 300;
    this._mapCfgScrollBy(dir * Math.max(120, Math.round(vh * 0.4)));
  },
  // Page by (nearly) a full viewport (PageUp/PageDown, track taps).
  _mapCfgPageBy(dir) {
    const vh = (this._sbView && this._sbView.viewH) ? this._sbView.viewH : 300;
    this._mapCfgScrollBy(dir * Math.max(160, Math.round(vh * 0.9)));
  },
  // ▲/▼ button step: half a viewport per press.
  _mapCfgHalfPage(dir) {
    const vh = (this._sbView && this._sbView.viewH) ? this._sbView.viewH : 300;
    this._mapCfgScrollBy(dir * Math.max(120, Math.round(vh * 0.5)));
  },
  // Jump to the very top / bottom (Home / End).
  _mapCfgScrollHome() { this._mapCfgSetScroll(0); },
  _mapCfgScrollEnd()  { this._mapCfgSetScroll((this._sbView && this._sbView.maxScroll) || 0); },

  // ── Scrollbar pointer support (wired from main.js) ────────────────────────
  // Returns 'thumb' if (x,y) is on the thumb, 'track' if on the track (not thumb),
  // or null. Only meaningful when a scrollbar was drawn this frame.
  _sbHitKind(x, y) {
    const g = this._sbGeom;
    if (!g) return null;
    if (x < g.trackX - 4 || x > g.trackX + g.sbW + 4) return null;
    if (y < g.trackY || y > g.trackY + g.trackH) return null;
    if (y >= g.thumbY && y <= g.thumbY + g.thumbH) return 'thumb';
    return 'track';
  },
  // Begin dragging the thumb from press point (x,y).
  _sbBeginDrag(x, y) {
    const g = this._sbGeom;
    if (!g) return false;
    const kind = this._sbHitKind(x, y);
    if (kind === 'thumb') {
      this._sbDrag = { kind: g.kind, grabOffset: y - g.thumbY };
      return true;
    }
    if (kind === 'track') {
      // page toward the tap, then start dragging so the user can keep sliding
      this._mapCfgPageBy(y < g.thumbY ? -1 : +1);
      this._sbDrag = { kind: g.kind, grabOffset: g.thumbH / 2 };
      return true;
    }
    return false;
  },
  // Continue an active thumb drag: map thumb-top position → scroll offset.
  _sbDragTo(y) {
    if (!this._sbDrag) return;
    const g = this._sbGeom;
    if (!g) return;
    const usable = g.trackH - g.thumbH;
    if (usable <= 0) return;
    let f = (y - this._sbDrag.grabOffset - g.trackY) / usable;
    f = Math.max(0, Math.min(1, f));
    this._mapCfgSetScroll(f * g.maxScroll);
  },
  _sbEndDrag() { this._sbDrag = null; },
  _sbIsDragging() { return !!this._sbDrag; },

  // ── Slider drag-to-set support (wired from main.js) ───────────────────────
  // Current settings target for the open config page (mapId or 'environment').
  _mapCfgTarget() { return this._mapCfgOpen; },
  // Returns the slider-bar hit-rect under (x,y), or null. Bars are recorded per
  // frame by _drawSettingRow. The scrollbar takes precedence — callers must
  // check _sbHitKind first so a press on the bar gutter never becomes a set.
  _sliderHitAt(x, y) {
    const bars = this._sliderBars;
    if (!bars || !bars.length) return null;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  },
  // Begin a slider drag from press point (x,y); immediately sets to that x.
  _sliderBeginDrag(x, y) {
    const b = this._sliderHitAt(x, y);
    if (!b) return false;
    const target = this._mapCfgTarget();
    if (!target) return false;
    this._sliderDrag = {
      settingId: b.settingId, mn: b.mn, mx: b.mx, st: b.st,
      barX: b.barX, barW: b.barW, target: target
    };
    this._sliderDragTo(x);
    return true;
  },
  // Continue a slider drag: map pointer x → value in [mn,mx], snap to step.
  _sliderDragTo(x) {
    const s = this._sliderDrag;
    if (!s || typeof MapSettings === 'undefined') return;
    if (s.barW <= 0) return;
    let f = (x - s.barX) / s.barW;
    f = Math.max(0, Math.min(1, f));
    let v = s.mn + f * (s.mx - s.mn);
    const step = s.st || 1;
    v = Math.round(v / step) * step;
    v = Math.max(s.mn, Math.min(s.mx, v));
    MapSettings.set(s.target, s.settingId, v);
  },
  _sliderEndDrag() { this._sliderDrag = null; },
  _sliderIsDragging() { return !!this._sliderDrag; },

  // ── GAME OVER ────────────────────────────────────────────────────────────
  drawGameOver(ctx, W, H, stats) {
    if (!stats) stats = { distance:0, coins:0, flips:0, isNewRecord:false };
    const _t = this.animTime;

    // ── Default-safe field reads (support both new + legacy stat names) ──────
    const _dist   = stats.distance || 0;
    const _flips  = stats.flips || 0;
    const _gold   = (stats.gold != null ? stats.gold : (stats.coins || 0)) | 0;
    const _diam   = (stats.diamonds != null ? stats.diamonds : (stats.diamondsEarned || 0)) | 0;
    const _isNew  = !!(stats.isNew || stats.isNewRecord);
    const _best   = stats.bestDist || 0;
    const _botOn  = !!(stats.botRace || stats.botRaceMode);
    const _botWin = _botOn && !stats.botWon;

    // ── Reduced-motion + staggered-reveal timing ────────────────────────────
    const _reduce = (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion') === true);
    if (this._goStatsRef !== stats) { this._goStatsRef = stats; this._goEnterT = _t; }
    const _el = _reduce ? 999 : (_t - (this._goEnterT || 0));
    // smoothstep-eased 0..1 progress for element revealed at `delay` over `dur`
    const _rv = (delay, dur) => { const p = Math.max(0, Math.min(1, (_el - delay) / (dur || 0.22))); return p*p*(3-2*p); };
    // wrap a draw block in a staggered fade + subtle rise
    const _blk = (delay, fn) => { const p = _rv(delay, 0.24); if (p <= 0) return; ctx.save(); ctx.globalAlpha = p; if (!_reduce) ctx.translate(0, (1-p)*9); fn(p); ctx.restore(); };

    // ── Atmosphere ──────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(0, 0, W, H);
    const _bgGlow = ctx.createRadialGradient(W/2, H*0.42, 20, W/2, H*0.42, Math.max(W, H) * 0.72);
    const _gc = _isNew ? ['rgba(255,190,0,0.16)', 'rgba(200,90,0,0.06)'] : ['rgba(255,61,0,0.13)', 'rgba(120,20,0,0.05)'];
    _bgGlow.addColorStop(0, _gc[0]); _bgGlow.addColorStop(0.5, _gc[1]); _bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = _bgGlow; ctx.fillRect(0, 0, W, H);
    // faint diagonal speed streaks for energy/depth (motion-gated)
    if (!_reduce) {
      ctx.save(); ctx.globalAlpha = 0.10;
      for (let i = 0; i < 7; i++) {
        const sp = ((_t * 0.18 + i * 0.1428) % 1);
        const sx = -80 + sp * (W + 160);
        ctx.strokeStyle = i % 2 ? this.C.fire : this.C.hot; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, H * (0.12 + i * 0.11)); ctx.lineTo(sx + 70, H * (0.12 + i * 0.11) - 26); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    const panW = Math.min(W - 24, 380);
    const panH = Math.min(400, H - 16);
    const panX = W/2 - panW/2, panY = H/2 - panH/2;

    // Celebratory confetti when a new record is set (motion-gated)
    if (_isNew && !_reduce) {
      ctx.save();
      const cols = ['#FFD700', '#FF8800', '#00CCFF', '#00CC44', '#FF3D00'];
      for (let i = 0; i < 30; i++) {
        const seed = i * 12.9898;
        const cxp = panX + ((Math.sin(seed) * 0.5 + 0.5) * panW);
        const phase = (_t * (0.35 + (i % 5) * 0.06) + i * 0.37) % 1;
        const cyp = panY - 12 + phase * (panH + 24);
        const sway = Math.sin(_t * 2 + i) * 7;
        ctx.globalAlpha = 0.85 * (1 - Math.abs(phase - 0.5) * 0.9);
        ctx.fillStyle = cols[i % cols.length];
        ctx.save(); ctx.translate(cxp + sway, cyp); ctx.rotate(_t * 3 + i);
        ctx.fillRect(-2, -3.5, 4, 7); ctx.restore();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // ── Panel ───────────────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = _isNew ? 'rgba(255,180,0,0.55)' : 'rgba(255,61,0,0.5)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 6;
    const panGrad = ctx.createLinearGradient(panX, panY, panX, panY+panH);
    panGrad.addColorStop(0, '#1c1c34'); panGrad.addColorStop(0.5, '#12122a'); panGrad.addColorStop(1, '#08080e');
    ctx.fillStyle = panGrad;
    ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, 14); ctx.fill();
    ctx.restore();
    // Inner top sheen for a glassier panel
    ctx.save();
    ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, 14); ctx.clip();
    const _pSheen = ctx.createLinearGradient(panX, panY, panX, panY + panH * 0.5);
    _pSheen.addColorStop(0, 'rgba(255,255,255,0.06)'); _pSheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = _pSheen; ctx.fillRect(panX, panY, panW, panH * 0.5);
    ctx.restore();
    // Border — gold pulsing edge when a record is set, otherwise fire edge
    if (_isNew) {
      const _bp = _reduce ? 0.8 : (0.55 + 0.45 * Math.sin(_t * 4));
      ctx.save(); ctx.strokeStyle = 'rgba(255,205,0,' + (0.5 + _bp*0.4).toFixed(3) + ')'; ctx.lineWidth = 2.4;
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 6 + _bp * 10;
      ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, 14); ctx.stroke(); ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(255,90,20,0.65)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(panX, panY, panW, panH, 14); ctx.stroke();
    }

    // ── Header bar ──────────────────────────────────────────────────────────
    const hg = ctx.createLinearGradient(panX, panY, panX, panY+44);
    hg.addColorStop(0, '#FF5500'); hg.addColorStop(1, '#CC1A00');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.roundRect(panX, panY, panW, 44, [14, 14, 0, 0]); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(panX, panY, panW, 44, [14, 14, 0, 0]); ctx.clip();
    const hsh = ctx.createLinearGradient(panX, panY, panX, panY+22);
    hsh.addColorStop(0, 'rgba(255,255,255,0.25)'); hsh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hsh; ctx.fillRect(panX, panY, panW, 22); ctx.restore();
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💥  CRASH!', W/2, panY+22); ctx.restore();

    // ── Rank badge ──────────────────────────────────────────────────────────
    const rank = stats.rank || SaveData.getRank(_dist);
    const rankCol = stats.rankColor || SaveData.getRankColor(rank);
    _blk(0.05, () => {
      const ry = panY + 54;
      const _rbg = ctx.createLinearGradient(panX+10, ry, panX+10, ry+26);
      _rbg.addColorStop(0, rankCol + '3a'); _rbg.addColorStop(1, rankCol + '12');
      ctx.fillStyle = _rbg; ctx.beginPath(); ctx.roundRect(panX+10, ry, panW-20, 26, 8); ctx.fill();
      ctx.strokeStyle = rankCol + '77'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(panX+10.5, ry+0.5, panW-21, 25, 8); ctx.stroke();
      ctx.save(); ctx.shadowColor = rankCol; ctx.shadowBlur = 8;
      ctx.fillStyle = rankCol; ctx.font = 'bold 14px Impact, Arial Black';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('RANK · ' + this._rankEN(rank), W/2, ry+13);
      ctx.restore();
    });

    // ── Bot result pill (optional) ──────────────────────────────────────────
    if (_botOn) _blk(0.09, () => {
      const by = panY + 86, bh = 22;
      const _bc = _botWin ? this.C.green : this.C.fire;
      ctx.fillStyle = _botWin ? 'rgba(0,200,60,0.16)' : 'rgba(255,61,0,0.16)';
      ctx.beginPath(); ctx.roundRect(panX+10, by, panW-20, bh, 7); ctx.fill();
      ctx.strokeStyle = _bc + '66'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(panX+10.5, by+0.5, panW-21, bh-1, 7); ctx.stroke();
      ctx.fillStyle = _bc; ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(_botWin ? '🏆 YOU BEAT THE BOT!' : '🤖 BOT WON', W/2, by + bh/2);
    });

    // ── Bottom-anchored action buttons (compute first, layout the rest above) ─
    const _mB = panW - 24;                       // full-width buttons
    const _menuH = 44, _retryH = 52, _gap = 8, _bottom = 16;
    const _menuY  = panY + panH - _bottom - _menuH;
    const _retryY = _menuY - _gap - _retryH;
    const _bx = panX + 12;

    // ── HERO: run distance (dominant) ───────────────────────────────────────
    const _rewH = 62;
    const _rewY = _retryY - 12 - _rewH;
    const _heroTop = panY + (_botOn ? 112 : 86);
    const _heroBot = _rewY - 6;
    const _heroCY  = (_heroTop + _heroBot) / 2;
    _blk(0.12, (p) => {
      // eyebrow label
      ctx.fillStyle = 'rgba(170,185,220,0.7)'; ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('DISTANCE', W/2, _heroCY - 30);
      // big number — fit to width
      const numStr = Math.floor(_dist).toLocaleString('tr-TR');
      let fs = 52;
      ctx.font = 'bold ' + fs + 'px Impact, Arial Black';
      const maxNumW = panW - 96;
      let nw = ctx.measureText(numStr).width;
      if (nw > maxNumW) { fs = Math.max(26, Math.floor(fs * maxNumW / nw)); ctx.font = 'bold ' + fs + 'px Impact, Arial Black'; nw = ctx.measureText(numStr).width; }
      ctx.save();
      ctx.shadowColor = _isNew ? 'rgba(255,205,0,0.75)' : 'rgba(0,204,255,0.55)';
      ctx.shadowBlur = _isNew ? 18 : 12;
      const _ng = ctx.createLinearGradient(W/2, _heroCY - fs*0.6, W/2, _heroCY + fs*0.2);
      if (_isNew) { _ng.addColorStop(0, '#FFF3B0'); _ng.addColorStop(1, '#FFB800'); }
      else { _ng.addColorStop(0, '#EAFBFF'); _ng.addColorStop(1, '#00CCFF'); }
      ctx.fillStyle = _ng; ctx.textBaseline = 'middle';
      ctx.fillText(numStr, W/2 - 8, _heroCY + 2);
      ctx.restore();
      // "m" unit tucked to the right of the number
      ctx.fillStyle = _isNew ? 'rgba(255,210,90,0.9)' : 'rgba(120,220,255,0.85)';
      ctx.font = 'bold ' + Math.max(13, Math.floor(fs*0.34)) + 'px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(' m', W/2 - 8 + nw/2, _heroCY + fs*0.16);
      // sub-line: NEW RECORD celebration or personal best
      ctx.textAlign = 'center';
      if (_isNew) {
        const _pp = _reduce ? 1 : (0.7 + 0.3 * Math.sin(_t * 5));
        ctx.save(); ctx.globalAlpha = p * _pp; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 6 + _pp*8;
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px Impact, Arial Black';
        ctx.fillText('★  NEW RECORD  ★', W/2, _heroCY + 34); ctx.restore();
      } else if (_best > 0) {
        ctx.fillStyle = 'rgba(150,165,205,0.75)'; ctx.font = '10px Arial';
        ctx.fillText('BEST  ' + Economy.formatDistance(_best), W/2, _heroCY + 32);
      }
    });

    // ── Rewards breakdown chips (gold · diamonds · flips) ────────────────────
    const _chips = [
      { icon:'⧆', val:'+' + _gold.toLocaleString('tr-TR'), label:'GOLD',     col:this.C.gold },
      { icon:'◆', val:'+' + _diam,                         label:'DIAMONDS', col:this.C.diamond },
      { icon:'↻', val:_flips.toString(),                   label:'FLIPS',    col:this.C.fire }
    ];
    const _chipGap = 8;
    const _chipW = (_mB - _chipGap * (_chips.length - 1)) / _chips.length;
    _chips.forEach((c, ci) => {
      _blk(0.18 + ci * 0.06, () => {
        this._drawRewardChip(ctx, _bx + ci * (_chipW + _chipGap), _rewY, _chipW, _rewH, c.icon, c.val, c.label, c.col, ci === 1 && _diam > 0 && !_reduce ? (0.5 + 0.5*Math.sin(_t*3)) : 0);
      });
    });

    // ── Primary CTA: RETRY (dominant) + secondary MENU (lighter) ─────────────
    _blk(0.32, () => {
      this._drawFireBtn(ctx, _bx, _retryY, _mB, _retryH, '↺  RETRY');
      // animated shine sweep to draw the eye (motion-gated)
      if (!_reduce) {
        ctx.save();
        ctx.beginPath(); ctx.roundRect(_bx, _retryY, _mB, _retryH, 3); ctx.clip();
        const _sw = ((_t * 0.5) % 1.5) * (_mB + 80) - 40;
        const _swg = ctx.createLinearGradient(_bx + _sw - 28, _retryY, _bx + _sw + 28, _retryY);
        _swg.addColorStop(0, 'rgba(255,255,255,0)'); _swg.addColorStop(0.5, 'rgba(255,255,255,0.32)'); _swg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = _swg; ctx.fillRect(_bx + _sw - 28, _retryY, 56, _retryH);
        ctx.restore();
      }
      this._drawDarkBtn(ctx, _bx, _menuY, _mB, _menuH, '⌂  MENU');
    });

    // ── Hitboxes (ids + dispatch preserved exactly; both ≥44px tall) ─────────
    this.buttons = [
      { id:'retry', x:_bx, y:_retryY, w:_mB, h:_retryH },
      { id:'menu',  x:_bx, y:_menuY,  w:_mB, h:_menuH }
    ];
  },

  // ── GAME-OVER PRIVATE HELPERS ─────────────────────────────────────────────
  // Compact reward-breakdown chip: icon on top, big value, small label.
  // `glow` (0..1) adds a soft pulse to the icon (used for diamonds).
  _drawRewardChip(ctx, x, y, w, h, icon, value, label, col, glow) {
    // card
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, col + '22'); g.addColorStop(1, 'rgba(255,255,255,0.03)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = col + '55'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
    // top accent stripe
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x, y, w, 3, [8, 8, 0, 0]); ctx.fill();
    // icon
    ctx.save();
    if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 3 + glow * 6; }
    ctx.fillStyle = col; ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x + w/2, y + 15);
    ctx.restore();
    // value — auto-shrink to fit chip width
    let vfs = 17;
    ctx.font = 'bold ' + vfs + 'px Impact, Arial Black';
    const maxVW = w - 10;
    if (ctx.measureText(value).width > maxVW) {
      vfs = Math.max(10, Math.floor(vfs * maxVW / ctx.measureText(value).width));
      ctx.font = 'bold ' + vfs + 'px Impact, Arial Black';
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(value, x + w/2, y + h/2 + 5);
    // label
    ctx.fillStyle = 'rgba(170,185,220,0.7)'; ctx.font = 'bold 8px Arial';
    ctx.fillText(label, x + w/2, y + h - 9);
  },

  // ── BUTTON PRIMITIVES ────────────────────────────────────────────────────
  _drawFireBtn(ctx, x, y, w, h, label) {
    ctx.fillStyle = 'rgba(255,61,0,0.18)'; ctx.fillRect(x+2, y+4, w, h);
    const g = ctx.createLinearGradient(x, y, x, y+h);
    g.addColorStop(0, '#FF5500'); g.addColorStop(0.5, '#FF3D00'); g.addColorStop(1, '#CC1A00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
    const gl = ctx.createLinearGradient(x, y, x, y+h*0.45);
    gl.addColorStop(0, 'rgba(255,255,255,0.2)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.roundRect(x+1, y+1, w-2, h*0.45, [2,2,0,0]); ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,0,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.max(11, Math.floor(h*0.28)) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x+w/2, y+h/2+1);
  },

  _drawCyanBtn(ctx, x, y, w, h, label) {
    const g = ctx.createLinearGradient(x, y, x, y+h);
    g.addColorStop(0, '#00CCFF'); g.addColorStop(1, '#006688');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold ' + Math.max(11, Math.floor(h*0.28)) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x+w/2, y+h/2+1);
  },

  _drawDarkBtn(ctx, x, y, w, h, label) {
    ctx.fillStyle = 'rgba(10,10,30,0.88)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.stroke();
    ctx.fillStyle = 'rgba(175,185,230,0.75)';
    ctx.font = 'bold ' + Math.max(9, Math.floor(h*0.25)) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x+w/2, y+h/2+1);
  },

  _drawSmallBtn(ctx, x, y, w, h, label, col) {
    ctx.fillStyle = (col||this.C.fire) + '33'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col||this.C.fire; ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = col||this.C.fire; ctx.font='bold 9px Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label, x+w/2, y+h/2);
  },

  _drawIconBtn(ctx, x, y, w, h, label, enabled) {
    ctx.fillStyle = enabled?'rgba(10,10,25,0.8)':'rgba(4,4,12,0.4)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
    ctx.fillStyle = enabled?'rgba(200,210,255,0.8)':'rgba(90,100,150,0.25)';
    ctx.font='bold 13px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label, x+w/2, y+h/2);
  },

  _drawHeader(ctx, W, title) {
    // Rich gradient bar with subtle sheen + glowing accent underline
    const hg = ctx.createLinearGradient(0, 0, 0, 56);
    hg.addColorStop(0, 'rgba(20,22,40,0.98)');
    hg.addColorStop(0.55, 'rgba(9,10,22,0.98)');
    hg.addColorStop(1, 'rgba(4,4,11,0.98)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, 56);
    // top hairline sheen
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 0, W, 1);
    // accent underline with soft glow
    ctx.save();
    ctx.shadowColor = this.C.fire; ctx.shadowBlur = 8;
    ctx.fillStyle = this.C.fire; ctx.fillRect(0, 54, W, 2);
    ctx.restore();
    ctx.fillStyle = this.C.fire; ctx.fillRect(0, 0, 3, 54);
    // title with soft shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Impact, Arial Black';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, W/2, 27);
    ctx.restore();
    // currency pill (top-right)
    const gold = SaveData.get('gold') || 0;
    const diamonds = SaveData.get('diamonds') || 0;
    const cstr = '⧆' + gold.toLocaleString() + '  ◆' + diamonds;
    ctx.font = 'bold 9px Arial';
    const cw = ctx.measureText(cstr).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(W - 8 - cw, 15, cw, 24, 12); ctx.fill();
    ctx.fillStyle = this.C.gold;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(cstr, W-16, 27);
  },

  _drawBackBtn(ctx) {
    // Rounded glossy back button (same 46x46 footprint / hit area)
    const g = ctx.createLinearGradient(4, 4, 4, 50);
    g.addColorStop(0, 'rgba(255,90,20,0.30)'); g.addColorStop(1, 'rgba(200,26,0,0.20)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(6, 6, 42, 42, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,0,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(6, 6, 42, 42, 10); ctx.stroke();
    ctx.fillStyle = this.C.fire; ctx.fillRect(6, 8, 3, 38);
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('◄', 27, 28);
  },

  // ── ADDITIVE VISUAL HELPERS (screen polish, no layout changes) ────────────
  // Rich vertical gradient background for menu screens.
  _drawScreenBg(ctx, W, H, tint) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0a18');
    g.addColorStop(0.45, this.C.bg);
    g.addColorStop(1, '#050510');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (tint) {
      const rg = ctx.createRadialGradient(W/2, -40, 0, W/2, -40, W*0.9);
      rg.addColorStop(0, tint); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, Math.min(H, 260)); ctx.restore();
    }
  },

  // Soft rounded card with drop shadow, gradient fill, left accent + thin border.
  // opt: { accent, active, r, fill, glow }
  _drawCard(ctx, x, y, w, h, opt) {
    opt = opt || {};
    const r = opt.r != null ? opt.r : 10;
    const accent = opt.accent || null;
    ctx.save();
    // drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = opt.active ? 14 : 8;
    ctx.shadowOffsetY = 4;
    const g = ctx.createLinearGradient(x, y, x, y + h);
    if (opt.fill) { g.addColorStop(0, opt.fill[0]); g.addColorStop(1, opt.fill[1]); }
    else if (opt.active && accent) { g.addColorStop(0, accent + '33'); g.addColorStop(1, 'rgba(14,16,32,0.94)'); }
    else { g.addColorStop(0, 'rgba(22,26,46,0.94)'); g.addColorStop(1, 'rgba(11,13,26,0.94)'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    ctx.restore();
    // top sheen
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    const sh = ctx.createLinearGradient(x, y, x, y + h * 0.42);
    sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(x, y, w, h * 0.42);
    ctx.restore();
    // left accent stripe
    if (accent) {
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.roundRect(x, y, 5, h, [r, 0, 0, r]); ctx.fill();
      if (opt.glow) {
        ctx.save(); ctx.globalAlpha = 0.5; ctx.shadowColor = accent; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.roundRect(x, y, 5, h, [r, 0, 0, r]); ctx.fill(); ctx.restore();
      }
    }
    // border
    ctx.strokeStyle = opt.active && accent ? accent : 'rgba(255,255,255,0.12)';
    ctx.lineWidth = opt.active ? 1.6 : 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.stroke();
  },

  // Small titled strip below the header ("section band").
  _drawBand(ctx, x, y, w, label, accent) {
    accent = accent || this.C.fire;
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, accent + '2e'); g.addColorStop(1, 'rgba(10,12,26,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, 22, 6); ctx.fill();
    ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(x, y, 4, 22, [6, 0, 0, 6]); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 12, y + 11);
    ctx.restore();
  },

  // Small glowing "ribbon" tag for highlighting best-value shop items.
  _drawValueTag(ctx, x, y, label, col) {
    col = col || this.C.gold;
    ctx.save();
    ctx.font = 'bold 7px Arial';
    const tw = ctx.measureText(label).width + 12;
    const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 4);
    ctx.shadowColor = col; ctx.shadowBlur = 4 + pulse * 5;
    const g = ctx.createLinearGradient(x, y, x, y + 14);
    g.addColorStop(0, this._lighten(col, 30)); g.addColorStop(1, this._lighten(col, -30));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(x, y, tw, 14, 4); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1a1206'; ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + tw/2, y + 8);
  },

  // Rounded segmented tab (active = colored gradient + underline glow).
  _drawTab(ctx, x, y, w, h, label, active, accent) {
    accent = accent || this.C.fire;
    ctx.save();
    if (active) {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, accent + '3a'); g.addColorStop(1, 'rgba(12,14,28,0.85)');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = 'rgba(10,12,24,0.6)';
    }
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = active ? accent + '99' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = active ? 1.4 : 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 8); ctx.stroke();
    if (active) {
      ctx.shadowColor = accent; ctx.shadowBlur = 6;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.roundRect(x + w*0.2, y + h - 3, w*0.6, 2, 1); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    ctx.fillStyle = active ? '#FFFFFF' : this.C.dim;
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w/2, y + h/2 + 1);
  },

  // Rounded pill button with color gradient + glossy top (visual only).
  _drawPill(ctx, x, y, w, h, label, col, opt) {
    opt = opt || {};
    col = col || this.C.fire;
    ctx.save();
    if (!opt.flat) { ctx.shadowColor = col + '66'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, this._lighten(col, 34)); g.addColorStop(1, this._lighten(col, -30));
    ctx.fillStyle = opt.disabled ? 'rgba(70,74,90,0.5)' : g;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(h/2, 8)); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(h/2, 8)); ctx.clip();
    const sh = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    sh.addColorStop(0, 'rgba(255,255,255,0.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(x, y, w, h * 0.5);
    ctx.restore();
    ctx.fillStyle = opt.disabled ? '#999' : (opt.dark ? '#1a1206' : '#fff');
    ctx.font = 'bold ' + Math.max(9, Math.floor(h * 0.34)) + 'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
  },

  // Lighten/darken a #rrggbb hex by amt (−255..255).
  _lighten(hex, amt) {
    if (!hex || hex[0] !== '#' || hex.length < 7) return hex || '#888';
    let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
  },

  // Map Turkish rank names (from SaveData.getRank) to English for display
  _rankEN(rank) {
    return { 'YENİ BAŞLAYAN':'BEGINNER','BRONZ':'BRONZE','GÜMÜŞ':'SILVER','ALTIN':'GOLD','ELMAS':'DIAMOND','EFSANE':'LEGEND' }[rank] || rank;
  },

  // ── Vehicle helpers ───────────────────────────────────────────────────────
  _drawMenuCar(ctx, vehicleId, t, hedefGenislik) {
    const def = VehicleDefs[vehicleId] || VehicleDefs.jeep;
    // 🔴 DEĞİŞİKLİK(28 Tmz) — ÖLÇEK ARTIK EKRANA GÖRE.
    //   Eskiden sabitti: `min(2.8, 240 / def.w)`. Jeep'te 2.18 → araç ~240×105 px.
    //   Yatay telefonda (H≈390) bu, sekmeleri ve "ADVANCED UPGRADE" butonunu
    //   üstten örtüyor, altta yükseltme listesine yalnız ~96 px bırakıyordu →
    //   TIRES/FUEL satırlarına hiç ulaşılamıyordu.
    //   ▶ Artık çağıran ekran hedef genişlik verebilir; vermezse eski davranış.
    const _hedef = (typeof hedefGenislik === 'number' && hedefGenislik > 0) ? hedefGenislik : 240;
    const scale = Math.min(2.8, _hedef / Math.max(def.w || 100, 1));
    ctx.save(); ctx.scale(scale, scale);
    try {
      const fakeWheels = (def.wheels||[]).map(w => ({
        x: w.x||0, y: w.y||0, wx: w.x||0, wy: w.y||0,
        lx: w.x||0, ly: w.y||0,
        radius: w.r||w.radius||20, r: w.r||w.radius||20,
        spin: t * 2.5,
        comp: 0, contact: false,
        isSki: w.isSki||false, isHover: w.isHover||false, isLeg: w.isLeg||false
      }));
      drawVehicle(ctx,
        { x:0, y:0, angle:0, vx:10, vy:0, bodyTilt:0,
          wheels: fakeWheels, suspAnim: fakeWheels.map(()=>0) },
        vehicleId, 0.5, t);
    } catch(e) {
      ctx.fillStyle = def.color || '#555';
      ctx.beginPath(); ctx.roundRect(-(def.w||80)/2, -(def.h||40), def.w||80, def.h||40, 6); ctx.fill();
    }
    ctx.restore();
  },

  _drawSimpleCarSilhouette(ctx, vehicleId, scale) {
    const def = VehicleDefs[vehicleId] || VehicleDefs.jeep;
    ctx.save(); ctx.scale(scale||0.65, scale||0.65);
    ctx.fillStyle = def.color || '#555';
    ctx.beginPath(); ctx.roundRect(-(def.w||100)/2, -(def.h||48), def.w||100, def.h||48, 6); ctx.fill();
    (def.wheels||[]).forEach(wp => {
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(wp.x||0, 0, wp.r||wp.radius||18, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();
  },

  // ── Toasts ────────────────────────────────────────────────────────────────
  // 🔴 SIZINTI DÜZELTMESİ (29 Tmz): `_toasts` YALNIZ `UI.draw()` içinde
  //   temizleniyordu. Oyun içindeyken ekranı `Renderer` çiziyor, `UI.draw`
  //   çağrılmıyor → toast'lar HİÇ silinmiyordu. 2.000 karelik ölçümde liste
  //   **159 elemana** çıkmıştı ve her çizimde baştan sona geziliyordu.
  //   ▶ Ekleme anında hem süresi geçmişleri at hem de listeyi sınırla.
  _TOAST_MAX: 6,
  showToast(msg) {
    const t = this._toasts;
    const simdi = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    for (let i = t.length - 1; i >= 0; i--) {
      if (t[i]._t0 && simdi - t[i]._t0 > (t[i].maxLife || 2.5) * 1000) t.splice(i, 1);
    }
    t.push({ msg, life: 2.5, maxLife: 2.5, _t0: simdi });
    while (t.length > this._TOAST_MAX) t.shift();     // en eskiyi düşür
  },

  _drawToasts(ctx, W, H) {
    this._toasts.forEach((toast, ti) => {
      const alpha = Math.min(1, toast.life*2, (toast.maxLife-toast.life)*3);
      ctx.save(); ctx.globalAlpha = alpha;
      const tw = Math.min(W-40, 300), tx = W/2-tw/2, ty = H-80-ti*46;
      ctx.fillStyle='rgba(4,4,14,0.94)';
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, 38, 4); ctx.fill();
      ctx.fillStyle=this.C.fire; ctx.fillRect(tx, ty, 3, 38);
      ctx.fillStyle='#FFFFFF'; ctx.font='bold 11px Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(toast.msg, W/2, ty+19);
      ctx.restore();
    });
  },

  // ── Navigation helpers ────────────────────────────────────────────────────
  handleClick(x, y) {
    // 🔴 KAYDIRMA SONRASI TIKLAMAYI YUT (28 Tmz).
    //   Parmakla listeyi kaydırıp bıraktığında `touchend` normalde bir tıklama
    //   üretir ve parmağın kalktığı yerdeki butona basılır. Kullanıcının
    //   "yanlış yerlere tıklanıyor" dediği durumlardan biri buydu.
    //   `_kaydiriliyor` bayrağını `_dokunmatikKaydirma()` kurar (6 px eşik aşılınca).
    if (this._kaydiriliyor) return null;

    // ── SANDIK KAPLAMASI (3 Ağu) — HER EKRANIN ÜSTÜNDE, EN ÖNCE SORULUR ─────
    //   Kaplama açıkken altındaki ekranın butonlarına tıklama SIZMAMALI.
    //   `EkranSandik.tikla` animasyon oynarken her yere "sandik_atla" der.
    //   🔴 `veri` yan kanaldan (`UI._sandikVeri`) `main.js`'e geçer (KlanUI deseni).
    {
      const _ES = this._yeniMod('EkranSandik');
      let _esAcik = false;
      if (_ES) { try { _esAcik = _ES.aktif() === true; } catch (e) { _esAcik = false; } }
      if (_esAcik) {
        let r = null;
        try { r = _ES.tikla(x, y); } catch (e) { r = null; }
        this._ripple = { x: x, y: y, t: 0 };
        if (!r || !r.eylem) { this._sandikVeri = null; return null; }
        this._sandikVeri = r.veri || {};
        return r.eylem;
      }
    }

    // ── YENİ HCR2 EKRANLARI (3 Ağu) — `{eylem, veri}` döner ─────────────────
    //   `handleClick` sözleşmesi DİZE döndürmek → `veri` yan kanaldan
    //   (`UI._ekrVeri`). Modül "isabet yok" derse AŞAĞIYA DÜŞÜLÜR: üst şerit /
    //   alt nav kutuları genel döngüde bulunur (onlar `this.buttons`'ta ama
    //   modülün `_btn` listesinde DEĞİL).
    {
      const _YM = this._yeniEkranMod(this.currentScreen);
      if (_YM) {
        let r = null;
        try {
          r = (_YM === (typeof EkranAna !== 'undefined' ? EkranAna : null))
              ? _YM.tikla(x, y)
              : _YM.tikla(x, y, this.currentScreen);
        } catch (e) { r = null; }
        this._ekrVeri = null;
        if (r && r.eylem) {
          this._ripple = { x: x, y: y, t: 0 };
          this._ekrVeri = r.veri || {};
          return r.eylem;
        }
      }
    }

    // Giriş sinematiği: her yere dokunmak menüye geçirir
    if (this.currentScreen === 'intro' && typeof Intro !== 'undefined') { Intro.handleClick(x, y); return null; }
    // Yeni sistem ekranları kendi tıklamalarını yönetir
    if (this.currentScreen === 'campaign' && typeof Campaign !== 'undefined') { Campaign.handleClick(x, y); return null; }
    if (this.currentScreen === 'mprooms' && typeof MPRooms !== 'undefined') { MPRooms.handleClick(x, y); return null; }
    if (this.currentScreen === 'tuning' && typeof Tuning !== 'undefined') return Tuning.handleClick(x, y);         // 'back'|null
    if (this.currentScreen === 'seasonevents' && typeof SeasonEvents !== 'undefined') return SeasonEvents.handleClick(x, y); // 'back'|null
    if (this.currentScreen === 'cardcollection' && typeof CardCollection !== 'undefined') return CardCollection.handleClick(x, y);
    if (this.currentScreen === 'luckwheel' && typeof LuckWheel !== 'undefined') return LuckWheel.handleClick(x, y);
    if (this.currentScreen === 'profile' && typeof Profile !== 'undefined') return Profile.handleClick(x, y);
    if (this.currentScreen === 'replay' && typeof Replay !== 'undefined') return Replay.handleClick(x, y);
    if (this.currentScreen === 'shopoffers' && typeof ShopOffers !== 'undefined') return ShopOffers.handleClick(x, y);
    if (this.currentScreen === 'powermodes' && typeof PowerModes !== 'undefined') return PowerModes.handleClick(x, y);
    if (this.currentScreen === 'paintshop' && typeof PaintShop !== 'undefined') return PaintShop.handleClick(x, y);
    if (this.currentScreen === 'dailyquests' && typeof DailyQuests !== 'undefined') return DailyQuests.handleClick(x, y);
    if (this.currentScreen === 'skilltree' && typeof SkillTree !== 'undefined') return SkillTree.handleClick(x, y);
    if (this.currentScreen === 'statspanel' && typeof StatsPanel !== 'undefined') return StatsPanel.handleClick(x, y);
    if (this.currentScreen === 'prestigescr' && typeof Prestige !== 'undefined') return Prestige.handleClick(x, y);
    if (this.currentScreen === 'blackmarket' && typeof BlackMarket !== 'undefined') return BlackMarket.handleClick(x, y);
    // ── ETKİNLİKLER (3 Ağu) — `Etkinlikler.tikla()` `{eylem,id}` döndürür ────
    //   `handleClick` sözleşmesi DİZE döndürmek; `id` yan kanaldan (`UI._etkId`)
    //   `main.js`'e geçer (KlanUI ile aynı desen).
    //   ⚠ Modül yoksa BU DAL ÇALIŞMAZ → yedek ızgaranın `UI.buttons`'ı
    //     aşağıdaki genel döngüden okunur (ham ikon kimliği döner).
    if (this.currentScreen === 'etkinlikler' &&
        typeof Etkinlikler !== 'undefined' && Etkinlikler &&
        typeof Etkinlikler.tikla === 'function') {
      let r = null;
      try { r = Etkinlikler.tikla(x, y); } catch (e) { r = null; }
      if (!r) { this._etkId = null; return null; }
      this._ripple = { x: x, y: y, t: 0 };
      if (typeof r === 'string') { this._etkId = null; return r; }
      if (r.eylem === 'geri') { this._etkId = null; return 'back'; }
      if (r.eylem === 'ac' && r.id) { this._etkId = String(r.id); return 'etk_ac'; }
      this._etkId = null;
      return r.eylem || null;
    }
    // ── KLAN (2 Ağu) — `KlanUI.tikla()` `{eylem, veri}` döndürür ─────────────
    //   `handleClick` sözleşmesi DİZE döndürmek olduğu için `veri` yan kanaldan
    //   (`UI._klanVeri`) `main.js`'e geçirilir. `UI.buttons`'a da yazıyoruz ama
    //   oradan okumak `veri`yi KAYBEDERDİ → tıklama BURADAN yönetilir.
    if (typeof KlanUI !== 'undefined' && KlanUI.EKRANLAR &&
        KlanUI.EKRANLAR.indexOf(this.currentScreen) >= 0) {
      let r = null;
      try { r = KlanUI.tikla(x, y, this.currentScreen); } catch (e) { r = null; }
      if (!r || !r.eylem) { this._klanVeri = null; return null; }
      this._ripple = { x: x, y: y, t: 0 };
      this._klanVeri = r.veri || {};
      return r.eylem;
    }
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x+btn.w && y >= btn.y && y <= btn.y+btn.h) {
        this._ripple = { x: x, y: y, t: 0 };   // tıklama efekti
        return btn.id;
      }
    }
    return null;
  },

  // ── MOBİL İKON PANELİ (28 Tmz) ────────────────────────────────────────────
  //   Dar ekranda ana menüdeki 24 ikon "☰ MENÜ" butonuna toplanır; bu panel
  //   onları BÜYÜK dokunma hedefleriyle (≥56 px) tam ekranda gösterir.
  //   ⚠ `this.buttons` SIFIRLANIR — panel açıkken altındaki menü butonlarına
  //     tıklama SIZMAMALI. Tam ekran kapatma alanı EN SONA eklenir (hit-test
  //     ilk eşleşeni döndürür; başa eklenirse hiçbir ikon seçilemez).
  // ── ETKİNLİKLER EKRANI (3 Ağu) ─────────────────────────────────────────────
  //   Çizim `js/etkinlikler.js`'e (Ajan B) devredilir. Modül YÜKLENMEMİŞSE
  //   yedek olarak eski ikon ızgarası çizilir → 25 ekranın hiçbiri
  //   ULAŞILAMAZ olmaz (index.html/sw.js bağlaması ayrı bir iş).
  //   ⚠ `typeof` ile korunur; modül yoksa oyun ÇÖKMEZ.
  drawEtkinlikler(ctx, W, H) {
    if (typeof Etkinlikler !== 'undefined' && Etkinlikler && typeof Etkinlikler.ciz === 'function') {
      Etkinlikler.ciz(ctx, W, H, this._lastDt);
      if (typeof Etkinlikler.butonlar === 'function') {
        const b = Etkinlikler.butonlar();
        this.buttons = Array.isArray(b) ? b : [];
      }
      return;
    }
    this._drawIkonPanel(ctx, W, H, 'back');          // yedek: eski ızgara
  },

  _drawIkonPanel(ctx, W, H, kapatId) {
    // Panel taşarsa parmakla kaydırılabilsin (ilk çizimde bir kez bağlanır)
    this._dokunmatikKaydirma('ikonpanel',
      () => (this.currentScreen === 'menu' && !!this._ikonMenuAcik) ||
            this.currentScreen === 'etkinlikler',
      () => this._ikonPanelView,
      () => this._ikonPanelScroll,
      (v) => { this._ikonPanelScroll = v; });

    const liste = this._ikonListesi || [];
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, W, H);
    this.buttons = [];

    // Başlık + kapat
    ctx.fillStyle = '#9fd0ff'; ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('MENÜ', 16, 24);
    const cs = 44, cx = W - cs - 10, cy = 4;   // 38→44: parmak hedefi asgarisi
    ctx.fillStyle = 'rgba(255,80,80,0.22)';
    ctx.beginPath(); ctx.roundRect(cx, cy, cs, cs, 8); ctx.fill();
    ctx.fillStyle = '#ff9c9c'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
    ctx.fillText('×', cx + cs / 2, cy + cs / 2 + 1);
    this.buttons.push({ id: kapatId || 'ikon_menu_kapat', x: cx, y: cy, w: cs, h: cs });

    // Izgara: dokunma hedefi asla 56 px altına inmesin
    const pad = 12, ust = 48, alt = 12;
    const kullanW = W - pad * 2;
    let cols = Math.max(3, Math.floor(kullanW / 74));
    let hucreW = kullanW / cols;
    let hucreH = Math.max(62, Math.min(78, hucreW));
    const rows = Math.ceil(liste.length / cols);

    // Taşarsa kaydırılabilir yap (dokunmatik kaydırma _dokunmatikKaydirma ile)
    const gorunumH = H - ust - alt;
    const icerikH = rows * hucreH;
    const maxKay = Math.max(0, icerikH - gorunumH);
    this._ikonPanelView = { viewH: gorunumH, maxScroll: maxKay };
    const kay = Math.max(0, Math.min(maxKay, this._ikonPanelScroll || 0));
    this._ikonPanelScroll = kay;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, ust, W, gorunumH); ctx.clip();

    for (let i = 0; i < liste.length; i++) {
      const it = liste[i];
      const c = i % cols, r = (i / cols) | 0;
      const x = pad + c * hucreW;
      const y = ust + r * hucreH - kay;
      if (y + hucreH < ust || y > ust + gorunumH) continue;   // görünmeyeni çizme

      const cw = hucreW - 6, ch = hucreH - 6;
      const g = ctx.createLinearGradient(x, y, x, y + ch);
      g.addColorStop(0, 'rgba(34,46,78,0.96)'); g.addColorStop(1, 'rgba(14,20,38,0.96)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(x + 0.6, y + 0.6, cw - 1.2, ch - 1.2, 10); ctx.stroke();

      ctx.font = Math.round(ch * 0.36) + 'px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(it.e, x + cw / 2, y + ch * 0.38);

      ctx.font = 'bold 9px Arial';
      ctx.fillStyle = 'rgba(220,230,255,0.92)';
      const tw = ctx.measureText(it.l).width, maxTw = cw - 6;
      ctx.save();
      if (tw > maxTw) { ctx.translate(x + cw / 2, 0); ctx.scale(maxTw / tw, 1); ctx.translate(-(x + cw / 2), 0); }
      ctx.fillText(it.l, x + cw / 2, y + ch * 0.78);
      ctx.restore();

      // ÖDÜL / KARİYER bildirim noktaları korunur
      if (it.id === 'rewards' && typeof Rewards !== 'undefined' && Rewards.canClaimDaily && Rewards.canClaimDaily()) {
        ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x + cw - 8, y + 8, 5, 0, 6.28); ctx.fill();
      }
      if (it.id === 'career' && typeof Career !== 'undefined' && Career.claimableCount) {
        let cc = 0; try { cc = Career.claimableCount() | 0; } catch (e) { cc = 0; }
        if (cc > 0) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(x + cw - 8, y + 8, 6, 0, 6.28); ctx.fill(); }
      }

      this.buttons.push({ id: it.id, x: x, y: y, w: cw, h: ch });
    }
    ctx.restore();

    // Kaydırma göstergesi
    if (maxKay > 0) {
      const tH = Math.max(30, gorunumH * (gorunumH / icerikH));
      const tY = ust + (gorunumH - tH) * (kay / maxKay);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(W - 5, ust, 3, gorunumH);
      ctx.fillStyle = 'rgba(160,200,255,0.65)'; ctx.fillRect(W - 5, tY, 3, tH);
    }

    // EN SON: panel dışına basınca kapat (sıra kritik — yukarıdaki uyarı)
    this.buttons.push({ id: 'ikon_menu_kapat', x: 0, y: 0, w: W, h: H });
    ctx.textAlign = 'left';
  },

  // _langOpen sıfırlanır: ayarlardan çıkıp geri gelince panel açık kalmasın (28 Tmz).
  //   _ikonMenuAcik de sıfırlanır — ekran değişince panel açık kalmasın.
  //   Sayfa kaydırması da sıfırlanır — yeni ekran ortasından açılmasın (28 Tmz).
  goTo(screen, ham) {
    // ── ESKİ → YENİ EKRAN YÖNLENDİRMESİ (3 Ağu) ────────────────────────────
    //   Kullanıcı kararı: "garaj böyle gözüksün", "yarışlar cups'tan girilsin".
    //   Yönlendirme TEK KAPIDA (goTo) yapılır → `_menuEylem`, alt nav, ikon
    //   paneli ve her `UI.goTo('garage'|'cup')` çağrısı otomatik kapsanır.
    //   🔴 Modül yüklenmemişse yönlendirme YAPILMAZ → eski ekran çalışır.
    //   ⚠ `ham === true` yönlendirmeyi ATLAR (eski garaj ekranı hâlâ gerekli:
    //     nitro alımı / parça mağazası / sarf malzemesi orada yaşıyor).
    if (!ham) {
      if (screen === 'garage' && typeof EkranGaraj !== 'undefined' && EkranGaraj) screen = 'garaj';
      else if (screen === 'cup' && typeof EkranCups !== 'undefined' && EkranCups) screen = 'cups';
    }
    this.currentScreen = screen; this.buttons = []; this._transT = 0.26;
    this._langOpen = false; this._ikonMenuAcik = false;
    if (this._sayfaKay && this._sayfaKay[screen]) this._sayfaKay[screen].sc = 0;
  },

  getSelectedVehicle() {
    const ids = Object.keys(VehicleDefs);
    return ids[Math.round(this._carVehTarget)] || 'jeep';
  },

  getSelectedMap() {
    const maps = this._mapList();
    return (maps[Math.round(this._carMapTarget)] || maps[0]).id;
  }
,
  // ═══════════════════════════════════════════════════════════════
  // PARTICLE ANIMATION SYSTEM (pure CSS-free canvas particles for UI)
  // ═══════════════════════════════════════════════════════════════
  _uiParticles: [],
  _uiParticleTime: 0,

  _spawnUiParticle(x, y, type) {
    const colors = {
      gold:    ['#FFD700','#FFA500','#FFEE44'],
      diamond: ['#00CCFF','#AA88FF','#44FFFF'],
      star:    ['#FFFFFF','#FFFF88','#88FFFF'],
      confetti:['#FF3366','#33AAFF','#33FF66','#FFAA00','#AA33FF']
    };
    const cols = colors[type] || colors.star;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 1 + Math.random() * 3;
      this._uiParticles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2,
        life: 1, maxLife: 0.5 + Math.random() * 0.8,
        color: cols[Math.floor(Math.random() * cols.length)],
        size: 3 + Math.random() * 5,
        type: Math.random() > 0.5 ? 'circle' : 'rect',
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.15
      });
    }
  },

  _updateUiParticles(ctx, dt) {
    this._uiParticleTime += dt;
    const alive = [];
    for (const p of this._uiParticles) {
      p.life -= dt / p.maxLife;
      if (p.life <= 0) continue;
      p.vx *= 0.96; p.vy = p.vy * 0.96 + 0.08;
      p.x += p.vx; p.y += p.vy;
      if (p.rot !== undefined) p.rot += p.rotSpd;
      ctx.save();
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      if (p.rot !== undefined) ctx.rotate(p.rot);
      if (p.type === 'rect') { ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.5); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.size/2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
      alive.push(p);
    }
    this._uiParticles = alive;
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATED RANK BADGE
  // ═══════════════════════════════════════════════════════════════
  drawRankBadge(ctx, x, y, rank, t, large) {
    const rankColors = {
      'YENİ BAŞLAYAN': ['#78909c','#546e7a'],
      'BRONZ':  ['#CD7F32','#8B4513'],
      'GÜMÜŞ':  ['#C0C0C0','#808080'],
      'ALTIN':  ['#FFD700','#FFA500'],
      'ELMAS':  ['#00CCFF','#0044FF'],
      'EFSANE': ['#FF00FF','#AA00FF'],
    };
    const cols = rankColors[rank] || rankColors['YENİ BAŞLAYAN'];
    const sz = large ? 44 : 28;
    ctx.save();
    ctx.translate(x, y);
    // Glow for high ranks
    if (['ELMAS','EFSANE'].includes(rank)) {
      ctx.shadowColor = cols[0];
      ctx.shadowBlur = 12 + Math.sin(t * 3) * 6;
    }
    // Badge background
    const bg = ctx.createRadialGradient(0, -sz*0.2, sz*0.1, 0, 0, sz);
    bg.addColorStop(0, cols[0]);
    bg.addColorStop(1, cols[1]);
    ctx.fillStyle = bg;
    // Diamond / hexagon shape for badge
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
      i === 0 ? ctx.moveTo(Math.cos(ang)*sz, Math.sin(ang)*sz)
              : ctx.lineTo(Math.cos(ang)*sz, Math.sin(ang)*sz);
    }
    ctx.closePath(); ctx.fill();
    // Inner ring
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const r = sz * 0.6;
      i === 0 ? ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r)
              : ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
    }
    ctx.closePath(); ctx.fill();
    // Rank text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${large ? 13 : 8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Short rank label
    const short = { 'YENİ BAŞLAYAN':'NEW','BRONZ':'BRONZE','GÜMÜŞ':'SILVER','ALTIN':'GOLD','ELMAS':'DIAMOND','EFSANE':'LEGEND'};
    ctx.fillText(short[rank] || rank, 0, 0);
    // Rotating stars for EFSANE
    if (rank === 'EFSANE') {
      for (let s = 0; s < 3; s++) {
        const sa = t * 2 + s * Math.PI * 2 / 3;
        const sr = sz * 1.3;
        ctx.fillStyle = '#FFD700';
        ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(Math.cos(sa)*sr, Math.sin(sa)*sr, 3, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // SHOP SCREEN HELPERS
  // ═══════════════════════════════════════════════════════════════
  _drawShopItem(ctx, x, y, w, item, t) {
    const h = 100;
    // Card background
    const cardG = ctx.createLinearGradient(x, y, x, y+h);
    cardG.addColorStop(0, 'rgba(40,50,70,0.95)');
    cardG.addColorStop(1, 'rgba(20,30,50,0.95)');
    ctx.fillStyle = cardG;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,180,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();
    // Icon
    ctx.font = '28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon || '📦', x + w/2, y + 30);
    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(item.name || 'Item', x + w/2, y + 56);
    // Price
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`⧆ ${(item.cost || 0).toLocaleString()}`, x + w/2, y + 74);
    // Shine on hover
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h/2, [10,10,0,0]); ctx.fill();
  },

  _drawProgressBar(ctx, x, y, w, h, pct, col1, col2, label) {
    col1 = col1 || '#FFD700'; col2 = col2 || '#FFA500';
    // Track
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h/2); ctx.fill();
    // Fill
    if (pct > 0) {
      const fillW = Math.max(h, w * Math.min(1, pct));
      const fg = ctx.createLinearGradient(x, y, x + fillW, y);
      fg.addColorStop(0, col1); fg.addColorStop(1, col2);
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.roundRect(x, y, fillW, h, h/2); ctx.fill();
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.roundRect(x, y, fillW, h/2, [h/2,h/2,0,0]); ctx.fill();
    }
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h/2); ctx.stroke();
    // Label
    if (label) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${h}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w/2, y + h/2);
    }
  },

  _drawCoinCounter(ctx, x, y, gold, diamonds, t) {
    // Gold coin
    ctx.save();
    const cg = ctx.createRadialGradient(x-2, y-2, 1, x, y, 14);
    cg.addColorStop(0, '#FFF176'); cg.addColorStop(0.5, '#FFD700'); cg.addColorStop(1, '#E65100');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#FF8F00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#E65100';
    ctx.font = 'bold 9px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⧆', x, y);
    // Gold text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(gold.toLocaleString(), x + 18, y);
    // Diamond
    const dx = x + 90;
    const dg = ctx.createRadialGradient(dx-2, y-2, 1, dx, y, 11);
    dg.addColorStop(0,'#FFFFFF'); dg.addColorStop(0.4,'#88DDFF'); dg.addColorStop(1,'#0044FF');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(dx, y-11); ctx.lineTo(dx+8, y-2); ctx.lineTo(dx, y+11); ctx.lineTo(dx-8, y-2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(100,200,255,0.6)'; ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(dx, y-11); ctx.lineTo(dx+8, y-2); ctx.lineTo(dx, y+11); ctx.lineTo(dx-8, y-2);
    ctx.closePath(); ctx.stroke();
    // Diamond text
    ctx.fillStyle = '#00CCFF';
    ctx.font = 'bold 13px Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(diamonds.toLocaleString(), dx + 14, y);
    ctx.restore();
  },

  // Draws a UNIQUE themed scene per map inside the given rect (each theme looks different)
  _mapScene(ctx, px, py, pw, ph, map) {
    const mcfg = (typeof Terrain !== 'undefined' && Terrain.MAPS && Terrain.MAPS[map.id]) ? Terrain.MAPS[map.id] : null;
    const id = map.id;
    const sky = mcfg ? mcfg.bgColor : (map.col2 || '#6ca5d6');
    const gnd = mcfg ? (mcfg.groundColor || '#3f8a2c') : (map.col || '#357322');
    const gnd2 = mcfg ? (mcfg.groundColor2 || gnd) : gnd;
    const inA = arr => arr.indexOf(id) >= 0;
    const A = inA(['desert','wasteland']) ? 'dunes'
      : inA(['winter','blizzard','arctic']) ? 'snow'
      : inA(['city','neon_city','construction']) ? 'city'
      : inA(['mountains','highland','dag','canyon']) ? 'peaks'
      : inA(['mars','moon']) ? 'space'
      : inA(['volcano']) ? 'volcano'
      : inA(['beach']) ? 'beach'
      : inA(['underwater']) ? 'water'
      : inA(['hotwheels','otoyol','rollercoaster']) ? 'track'
      : inA(['cave']) ? 'cave'
      : 'hills';
    const S = id.length;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.clip();
    ctx.fillStyle = sky; ctx.fillRect(px, py, pw, ph);
    const gy = py + ph * 0.6;
    const disc = (cx, cy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
    const wave = (baseY, amp, freq, col, off) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px, baseY);
      for (let sx = 0; sx <= pw; sx += 5) ctx.lineTo(px + sx, baseY - Math.sin((sx + off) * freq + S) * amp);
      ctx.lineTo(px + pw, py + ph); ctx.closePath(); ctx.fill();
    };
    const peaks = (baseY, hgt, col, shift) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px, py + ph);
      const n = 4; for (let k = 0; k <= n; k++) ctx.lineTo(px + pw * (k + shift) / n, baseY - ((k % 2) ? hgt : hgt * 0.15));
      ctx.lineTo(px + pw, py + ph); ctx.closePath(); ctx.fill();
    };

    if (A === 'hills') {
      disc(px + pw * 0.8, py + ph * 0.24, ph * 0.11, 'rgba(255,246,190,0.92)');
      wave(gy + ph * 0.06, ph * 0.13, 0.05, gnd2, 30); wave(gy + ph * 0.18, ph * 0.16, 0.045, gnd, 0);
      ctx.fillStyle = '#1f5016'; for (const tx of [0.25, 0.55, 0.82]) { const p = px + pw * tx; disc(p, gy + ph * 0.15, ph * 0.07, '#1f5016'); ctx.fillRect(p - 1.5, gy + ph * 0.15, 3, ph * 0.12); }
    } else if (A === 'dunes') {
      disc(px + pw * 0.76, py + ph * 0.26, ph * 0.14, 'rgba(255,228,150,0.95)');
      wave(gy + ph * 0.14, ph * 0.09, 0.02, gnd2, 40); wave(gy + ph * 0.26, ph * 0.11, 0.018, gnd, 0);
      ctx.fillStyle = gnd2; ctx.beginPath(); ctx.moveTo(px + pw * 0.55, gy + ph * 0.08); ctx.lineTo(px + pw * 0.67, gy + ph * 0.32); ctx.lineTo(px + pw * 0.43, gy + ph * 0.32); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = Math.max(2, pw * 0.013); ctx.beginPath(); ctx.moveTo(px + pw * 0.2, gy + ph * 0.36); ctx.lineTo(px + pw * 0.2, gy + ph * 0.12); ctx.moveTo(px + pw * 0.2, gy + ph * 0.22); ctx.lineTo(px + pw * 0.26, gy + ph * 0.18); ctx.stroke();
    } else if (A === 'snow') {
      peaks(gy + ph * 0.08, ph * 0.32, gnd, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (let k = 1; k < 4; k += 2) { const xx = px + pw * k / 4; ctx.beginPath(); ctx.moveTo(xx - pw * 0.06, gy - ph * 0.06); ctx.lineTo(xx, gy + ph * 0.08 - ph * 0.32); ctx.lineTo(xx + pw * 0.06, gy - ph * 0.06); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; for (let k = 0; k < 10; k++) ctx.fillRect(px + pw * (k / 10 + 0.03), py + ph * (0.12 + (k % 4) * 0.1), Math.max(1.4, pw * 0.007), Math.max(1.4, pw * 0.007));
    } else if (A === 'city') {
      ctx.fillStyle = gnd; ctx.fillRect(px, gy + ph * 0.18, pw, ph);
      for (let k = 0; k < 7; k++) { const bx = px + pw * (k / 7); const bw = pw * 0.115; const bh = ph * (0.18 + ((k * 7 + S) % 5) * 0.08);
        ctx.fillStyle = id === 'neon_city' ? '#1a0e34' : '#1c2238'; ctx.fillRect(bx, gy + ph * 0.18 - bh, bw, bh);
        ctx.fillStyle = id === 'neon_city' ? 'rgba(0,255,200,0.75)' : 'rgba(255,220,120,0.6)';
        for (let w2 = 0; w2 < 3; w2++) ctx.fillRect(bx + bw * 0.2 + w2 * bw * 0.28, gy + ph * 0.18 - bh + ph * 0.05, bw * 0.13, ph * 0.045);
      }
    } else if (A === 'peaks') {
      peaks(gy, ph * 0.35, gnd2, 0); peaks(gy + ph * 0.12, ph * 0.24, gnd, 0.5);
    } else if (A === 'space') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (let k = 0; k < 14; k++) ctx.fillRect(px + pw * ((k * 37 % 100) / 100), py + ph * ((k * 53 % 55) / 100), 1.4, 1.4);
      disc(px + pw * 0.2, py + ph * 0.24, ph * 0.12, id === 'moon' ? '#3a6cc0' : '#c85a2a');
      ctx.fillStyle = gnd; ctx.fillRect(px, gy + ph * 0.12, pw, ph);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (const c of [0.22, 0.5, 0.76]) { ctx.beginPath(); ctx.ellipse(px + pw * c, gy + ph * 0.22, pw * 0.07, ph * 0.03, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (A === 'volcano') {
      ctx.fillStyle = gnd; ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px, gy); ctx.lineTo(px + pw * 0.5, gy - ph * 0.34); ctx.lineTo(px + pw, gy); ctx.lineTo(px + pw, py + ph); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,90,0,0.9)'; ctx.fillRect(px + pw * 0.42, gy - ph * 0.34, pw * 0.16, ph * 0.12);
      ctx.fillStyle = 'rgba(255,120,0,0.55)'; ctx.fillRect(px, py + ph * 0.88, pw, ph * 0.12);
      disc(px + pw * 0.5, gy - ph * 0.44, ph * 0.06, 'rgba(120,120,120,0.5)');
    } else if (A === 'beach') {
      disc(px + pw * 0.8, py + ph * 0.24, ph * 0.12, 'rgba(255,238,160,0.95)');
      ctx.fillStyle = 'rgba(30,140,220,0.85)'; ctx.fillRect(px, gy, pw, ph * 0.2);
      ctx.fillStyle = gnd; ctx.fillRect(px, gy + ph * 0.2, pw, ph);
      ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = Math.max(2, pw * 0.013); ctx.beginPath(); ctx.moveTo(px + pw * 0.2, gy + ph * 0.34); ctx.quadraticCurveTo(px + pw * 0.17, gy + ph * 0.08, px + pw * 0.24, gy + ph * 0.04); ctx.stroke();
      disc(px + pw * 0.24, gy + ph * 0.03, ph * 0.06, '#2e7d32');
    } else if (A === 'water') {
      ctx.fillStyle = gnd; ctx.fillRect(px, gy + ph * 0.22, pw, ph);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.4; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(px + pw * ((k * 29 % 100) / 100), py + ph * ((k * 41 % 80) / 100), Math.max(1.4, pw * 0.009), 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#ffb020'; ctx.beginPath(); ctx.moveTo(px + pw * 0.62, gy - ph * 0.02); ctx.lineTo(px + pw * 0.74, gy - ph * 0.06); ctx.lineTo(px + pw * 0.74, gy + ph * 0.02); ctx.closePath(); ctx.fill();
    } else if (A === 'track') {
      const rc = id === 'rollercoaster';
      wave(gy + ph * 0.16, rc ? ph * 0.22 : ph * 0.05, 0.03, gnd, 0);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); for (let sx = 0; sx <= pw; sx += 5) { const yy = gy + ph * 0.16 - ph * 0.07 - (rc ? Math.sin((sx) * 0.03 + S) * ph * 0.22 : 0); if (sx === 0) ctx.moveTo(px + sx, yy); else ctx.lineTo(px + sx, yy); } ctx.stroke(); ctx.setLineDash([]);
      if (id === 'hotwheels') { ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + pw * 0.72, gy - ph * 0.06, ph * 0.15, 0, Math.PI * 2); ctx.stroke(); }
    } else if (A === 'cave') {
      ctx.fillStyle = gnd; ctx.fillRect(px, gy + ph * 0.1, pw, ph);
      ctx.fillStyle = '#191320';
      for (let k = 0; k < 5; k++) { const xx = px + pw * (k / 5 + 0.05);
        ctx.beginPath(); ctx.moveTo(xx - pw * 0.03, py); ctx.lineTo(xx + pw * 0.03, py); ctx.lineTo(xx, py + ph * 0.24); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(xx - pw * 0.03, py + ph); ctx.lineTo(xx + pw * 0.03, py + ph); ctx.lineTo(xx, gy + ph * 0.1); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.stroke();
  },

  _drawMapCard(ctx, x, y, w, h, map, locked, selected, t) {
    // Card BG
    const bgG = ctx.createLinearGradient(x, y, x, y+h);
    if (selected) {
      bgG.addColorStop(0, 'rgba(255,200,0,0.25)');
      bgG.addColorStop(1, 'rgba(200,120,0,0.2)');
    } else {
      bgG.addColorStop(0, 'rgba(30,40,60,0.9)');
      bgG.addColorStop(1, 'rgba(15,20,35,0.9)');
    }
    ctx.fillStyle = bgG;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    // Border (glow if selected)
    ctx.strokeStyle = selected ? `rgba(255,200,0,${0.8 + Math.sin(t*3)*0.2})` : 'rgba(80,100,160,0.4)';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    if (selected) { ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Mini terrain postcard preview (from the map's own theme) ──
    const mcfg = (typeof Terrain !== 'undefined' && Terrain.MAPS && Terrain.MAPS[map.id]) ? Terrain.MAPS[map.id] : null;
    const surf = mcfg ? mcfg.surface : 'grass';
    const pvX = x + 6, pvY = y + 6, pvW = w - 12, pvH = h * 0.70;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(pvX, pvY, pvW, pvH, 8); ctx.clip();
    // Sky + subtle horizon haze
    ctx.fillStyle = mcfg ? mcfg.bgColor : (map.col2 || '#6ca5d6'); ctx.fillRect(pvX, pvY, pvW, pvH);
    const haze = ctx.createLinearGradient(pvX, pvY + pvH * 0.3, pvX, pvY + pvH * 0.62);
    haze.addColorStop(0, 'rgba(255,255,255,0)'); haze.addColorStop(1, 'rgba(255,255,255,0.14)');
    ctx.fillStyle = haze; ctx.fillRect(pvX, pvY, pvW, pvH);
    // Sun (day) or moon (night)
    const night = ['metal', 'moon', 'neon'].indexOf(surf) >= 0 || map.id === 'neon_city' || map.id === 'rollercoaster';
    ctx.fillStyle = night ? 'rgba(232,236,255,0.9)' : 'rgba(255,246,190,0.92)';
    ctx.beginPath(); ctx.arc(pvX + pvW * 0.78, pvY + pvH * 0.26, pvH * 0.13, 0, Math.PI * 2); ctx.fill();
    // Hills (2 layers)
    const g2 = mcfg ? (mcfg.groundColor || '#3f8a2c') : (map.col2 || '#5aa040');
    const g1 = mcfg ? (mcfg.groundColor2 || g2) : (map.col || '#357322');
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer === 0 ? g1 : g2;
      const baseY = pvY + pvH * (0.5 + layer * 0.24);
      ctx.beginPath(); ctx.moveTo(pvX, pvY + pvH);
      for (let sx = 0; sx <= pvW; sx += 5) {
        const yy = baseY - Math.sin((sx + layer * 26) * 0.05 + map.id.length) * pvH * 0.16;
        ctx.lineTo(pvX + sx, yy);
      }
      ctx.lineTo(pvX + pvW, pvY + pvH); ctx.closePath(); ctx.fill();
    }
    // Theme props on the front hill
    const propY = pvY + pvH * 0.74;
    if (surf === 'grass') {
      ctx.fillStyle = '#215217';
      for (const tx of [0.22, 0.52, 0.82]) { const p = pvX + pvW * tx; ctx.beginPath(); ctx.arc(p, propY, pvH * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(p - 1, propY, 2, pvH * 0.12); }
    } else if (surf === 'sand') {
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(pvX + pvW * 0.3, propY + pvH * 0.08); ctx.lineTo(pvX + pvW * 0.3, propY - pvH * 0.06); ctx.stroke();
    } else if (surf === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(pvX + pvW * (k / 6 + 0.05), pvY + pvH * (0.18 + (k % 3) * 0.14), 1.3, 0, Math.PI * 2); ctx.fill(); }
    } else if (surf === 'metal') {
      ctx.fillStyle = 'rgba(18,24,44,0.92)';
      for (const bx of [0.14, 0.4, 0.62, 0.85]) { const p = pvX + pvW * bx; ctx.fillRect(p, propY - pvH * 0.22, pvW * 0.1, pvH * 0.34); }
    } else if (surf === 'rock' || surf === 'lava') {
      ctx.fillStyle = 'rgba(255,90,0,0.5)'; ctx.fillRect(pvX, pvY + pvH * 0.85, pvW, pvH * 0.15);
    } else if (surf === 'mud') {
      ctx.fillStyle = 'rgba(120,255,120,0.45)';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(pvX + pvW * (0.25 + k * 0.25), propY, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(pvX, pvY, pvW, pvH, 8); ctx.stroke();
    // Theme icon badge
    ctx.font = '15px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(map.icon || '🗺️', pvX + 4, pvY + 3);
    // Map name — at the BOTTOM, under the image, centered
    ctx.fillStyle = locked ? '#888' : '#fff';
    ctx.font = `bold ${Math.min(12, w/7)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(map.name || map.id, x + w/2, y + h - 13);
    // Lock overlay
    if (locked) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
      ctx.font = '20px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🔒', x + w/2, y + h*0.5);
    }
    // Selected checkmark
    if (selected && !locked) {
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 14px Arial';
      ctx.textAlign='right'; ctx.textBaseline='top';
      ctx.fillText('✓', x + w - 6, y + 4);
    }
  },

  _drawStatsPanel(ctx, x, y, w, h, stats) {
    // Background
    const sg = ctx.createLinearGradient(x, y, x, y+h);
    sg.addColorStop(0, 'rgba(20,30,50,0.92)');
    sg.addColorStop(1, 'rgba(10,15,30,0.92)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,200,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.stroke();
    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 11px Arial'; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText('📊 STATISTICS', x + w/2, y + 10);
    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x+12, y+26); ctx.lineTo(x+w-12, y+26); ctx.stroke();
    // Stats
    const rows = [
      { icon:'🏆', label:'Best Distance',  val: (stats.maxDist||0) + ' m' },
      { icon:'🔄', label:'Total Runs',     val: stats.runs||0 },
      { icon:'🤸', label:'Total Flips',    val: stats.flips||0 },
      { icon:'💰', label:'Total Coins',    val: (stats.coins||0).toLocaleString() },
      { icon:'⚡', label:'Nitro Uses',     val: stats.nitroUses||0 },
      { icon:'🌟', label:'Achievements',   val: `${stats.achUnlocked||0}/${stats.achTotal||0}` },
    ];
    rows.forEach((row, i) => {
      const ry = y + 34 + i * 22;
      ctx.fillStyle = '#aaa'; ctx.font = '11px Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(row.icon + ' ' + row.label, x + 12, ry);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign='right';
      ctx.fillText(row.val, x + w - 12, ry);
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // ANIMATED LOGO / SPLASH HELPERS
  // ═══════════════════════════════════════════════════════════════
  _drawAnimatedTitle(ctx, x, y, t) {
    ctx.save();
    const scale = 1 + Math.sin(t * 1.5) * 0.02;
    ctx.translate(x, y); ctx.scale(scale, scale);
    // Shadow layers (depth effect)
    for (let d = 4; d > 0; d--) {
      ctx.fillStyle = `rgba(0,0,0,${0.15 * d})`;
      ctx.font = 'bold 56px Arial Black, Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('AHMET', d*1.5, d*1.5);
    }
    // Main gradient text
    const tg = ctx.createLinearGradient(-100, -30, 100, 30);
    tg.addColorStop(0, '#FFD700');
    tg.addColorStop(0.3, '#FFF176');
    tg.addColorStop(0.6, '#FF8F00');
    tg.addColorStop(1, '#E65100');
    ctx.fillStyle = tg;
    ctx.font = 'bold 56px Arial Black, Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AHMET', 0, 0);
    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText('AHMET', 0, 0);
    // Shine sweep
    const shinePct = (t * 0.4) % 1.2 - 0.1;
    const shineX = -120 + shinePct * 240;
    const shineG = ctx.createLinearGradient(shineX - 30, -30, shineX + 30, 30);
    shineG.addColorStop(0, 'rgba(255,255,255,0)');
    shineG.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    shineG.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineG;
    ctx.font = 'bold 56px Arial Black, Arial';
    ctx.fillText('AHMET', 0, 0);
    ctx.restore();
  },

  _drawSubtitle(ctx, x, y, text, t) {
    ctx.save();
    ctx.globalAlpha = 0.7 + Math.sin(t * 2) * 0.15;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // NOTIFICATION / TOAST SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _notifications: [],

  pushNotification(icon, title, msg, duration) {
    this._notifications.push({
      icon, title, msg,
      life: 1, maxLife: duration || 3,
      slideIn: 0
    });
    if (this._notifications.length > 4) this._notifications.shift();
  },

  drawNotifications(ctx, W, H, dt) {
    const nw = 240, nh = 56, nx0 = W - nw - 10;
    let ny = 60;
    const alive = [];
    for (const n of this._notifications) {
      n.life -= dt / n.maxLife;
      if (n.life <= 0) continue;
      n.slideIn = Math.min(1, (n.slideIn || 0) + dt * 4);
      const nx = nx0 + (1 - n.slideIn) * (nw + 20);
      const alpha = Math.min(1, n.life * 3);
      ctx.save();
      ctx.globalAlpha = alpha;
      // Card
      const ng = ctx.createLinearGradient(nx, ny, nx, ny+nh);
      ng.addColorStop(0, 'rgba(30,40,60,0.95)');
      ng.addColorStop(1, 'rgba(15,20,40,0.95)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(100,150,255,0.4)';
      ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(nx, ny, nw, nh, 8); ctx.stroke();
      // Icon
      ctx.font = '20px Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(n.icon || '🎯', nx + 12, ny + nh/2);
      // Title
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign='left';
      ctx.fillText(n.title || '', nx + 38, ny + 16);
      // Message
      ctx.fillStyle = '#aaa'; ctx.font = '9px Arial';
      ctx.fillText(n.msg || '', nx + 38, ny + 34);
      // Progress bar
      this._drawProgressBar(ctx, nx + 6, ny + nh - 5, nw - 12, 3, n.life, '#4488FF', '#2266FF');
      ctx.restore();
      ny += nh + 6;
      alive.push(n);
    }
    this._notifications = alive;
  },

  // ═══════════════════════════════════════════════════════════════
  // TUTORIAL OVERLAY SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _tutSteps: [
    { icon:'⬅️', text:'Press left side → brake/reverse', region:'left' },
    { icon:'➡️', text:'Press right side → gas', region:'right' },
    { icon:'🔥', text:'Middle zone → Nitro (if ready)', region:'mid' },
    { icon:'⏸', text:'Top-right corner → Pause', region:'top-right' },
  ],
  _tutVisible: false,
  _tutStep: 0,
  _tutTimer: 0,

  showTutorial() {
    this._tutVisible = true;
    this._tutStep = 0;
    this._tutTimer = 0;
  },

  hideTutorial() {
    this._tutVisible = false;
  },

  drawTutorial(ctx, W, H, dt) {
    if (!this._tutVisible) return;
    this._tutTimer += dt;
    const step = this._tutSteps[this._tutStep];
    if (!step) { this._tutVisible = false; return; }
    if (this._tutTimer > 3) { this._tutStep++; this._tutTimer = 0; return; }
    const alpha = Math.min(1, this._tutTimer * 3) * Math.min(1, (3 - this._tutTimer) * 3);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    // Dimming overlay in relevant region
    const regions = {
      left:      { x: 0,       y: H*0.3, w: W*0.35, h: H*0.5 },
      right:     { x: W*0.65,  y: H*0.3, w: W*0.35, h: H*0.5 },
      mid:       { x: W*0.35,  y: H*0.3, w: W*0.3,  h: H*0.5 },
      'top-right':{ x: W-70,   y: 0,     w: 70,     h: 80     },
    };
    const reg = regions[step.region];
    if (reg) {
      ctx.fillStyle = 'rgba(255,200,0,0.12)';
      ctx.strokeStyle = 'rgba(255,200,0,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath(); ctx.roundRect(reg.x, reg.y, reg.w, reg.h, 8); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Tooltip bubble
    const tx = W/2, ty = H * 0.18;
    const tw = 220, th = 56;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath(); ctx.roundRect(tx - tw/2, ty, tw, th, 10); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(tx - tw/2, ty, tw, th, 10); ctx.stroke();
    ctx.font = '20px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='#fff'; ctx.fillText(step.icon, tx - tw/2 + 24, ty + th/2);
    ctx.font='12px Arial'; ctx.textAlign='left';
    ctx.fillText(step.text, tx - tw/2 + 46, ty + th/2);
    // Step dots
    for (let s = 0; s < this._tutSteps.length; s++) {
      ctx.fillStyle = s === this._tutStep ? '#FFD700' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(tx - (this._tutSteps.length-1)*8 + s*16, ty + th + 12, 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

,

  // ═══════════════════════════════════════════════════════════════
  // ANIMATED MENU TRANSITIONS
  // ═══════════════════════════════════════════════════════════════

  _menuTransition(ctx, W, H, from_, to, t, duration) {
    const progress = Math.min(1, t / duration);
    const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
    // Slide + fade cross-dissolve
    ctx.save();
    // Old screen sliding out
    ctx.globalAlpha = 1 - eased;
    ctx.translate(-W * eased * 0.3, 0);
    if (from_ && from_.draw) from_.draw(ctx, W, H);
    ctx.restore();
    // New screen sliding in
    ctx.save();
    ctx.globalAlpha = eased;
    ctx.translate(W * (1 - eased) * 0.3, 0);
    if (to && to.draw) to.draw(ctx, W, H);
    ctx.restore();
    // Flash at midpoint
    if (progress > 0.45 && progress < 0.55) {
      const flashA = Math.sin((progress - 0.45) / 0.1 * Math.PI) * 0.18;
      ctx.fillStyle = `rgba(255,255,255,${flashA})`;
      ctx.fillRect(0, 0, W, H);
    }
  },

  _slideIn(ctx, W, H, element, direction, t) {
    // direction: 'left'|'right'|'up'|'down'
    const p = Math.min(1, t * 3.5);
    const ease = 1 - Math.pow(1 - p, 3);
    let dx = 0, dy = 0;
    if (direction === 'left')  dx = W * (1 - ease);
    if (direction === 'right') dx = -W * (1 - ease);
    if (direction === 'up')    dy = H * (1 - ease);
    if (direction === 'down')  dy = -H * (1 - ease);
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(dx, dy);
    if (element && element.draw) element.draw(ctx, W, H);
    ctx.restore();
  },

  _fadeIn(ctx, alpha) {
    // Call before drawing the element you want to fade in
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  },

  _fadeOut(ctx, alpha) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - alpha));
  },

  _scaleIn(ctx, W, H, t) {
    const p = Math.min(1, t * 4);
    const ease = 1 - Math.pow(1 - p, 3);
    const scale = 0.7 + ease * 0.3;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalAlpha = ease;
  },

  _rippleEffect(ctx, x, y, t, color) {
    const maxR = 60;
    const duration = 0.6;
    const phase = (t % duration) / duration;
    for (let i = 0; i < 3; i++) {
      const rPhase = (phase + i / 3) % 1;
      const r = rPhase * maxR;
      const alpha = (1 - rPhase) * 0.55;
      ctx.strokeStyle = color || 'rgba(255,255,255,0.7)';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2 - rPhase * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  // ═══════════════════════════════════════════════════════════════
  // SHOP SCREEN COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  _drawShopCurrency(ctx, x, y, gold, diamonds) {
    ctx.save();
    ctx.translate(x, y);
    // Gold coin
    const gGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 10);
    gGrad.addColorStop(0, '#ffe066');
    gGrad.addColorStop(0.6, '#f0a500');
    gGrad.addColorStop(1, '#b07000');
    ctx.fillStyle = gGrad;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffee88';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('G', 0, 0);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
    ctx.fillText(gold >= 1e6 ? (gold/1e6).toFixed(1)+'M' : gold >= 1e3 ? (gold/1e3).toFixed(1)+'K' : String(gold), 14, 1);
    // Diamond
    ctx.translate(70, 0);
    ctx.fillStyle = '#44ddff';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
    ctx.fillText(String(diamonds), 12, 1);
    ctx.restore();
  },

  _drawShopBundle(ctx, x, y, bundle, t) {
    ctx.save();
    ctx.translate(x, y);
    const W = bundle.w || 120, H = bundle.h || 160;
    const pulse = Math.sin(t * 2) * 0.03;
    ctx.scale(1 + pulse, 1 + pulse);
    // Glow aura
    const auraGrad = ctx.createRadialGradient(0, 0, W * 0.2, 0, 0, W * 0.8);
    auraGrad.addColorStop(0, `rgba(${bundle.glowRGB || '255,200,0'},0.25)`);
    auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath(); ctx.ellipse(0, 0, W * 0.8, H * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // Box body
    const bGrad = ctx.createLinearGradient(-W/2, -H/2, W/2, H/2);
    bGrad.addColorStop(0, bundle.color || '#aa4400');
    bGrad.addColorStop(1, bundle.darkColor || '#662200');
    ctx.fillStyle = bGrad;
    ctx.beginPath(); ctx.roundRect(-W/2, -H/2, W, H, 10); ctx.fill();
    // Ribbon horizontal
    ctx.fillStyle = bundle.ribbonColor || '#ffcc00';
    ctx.fillRect(-W/2, -8, W, 16);
    // Ribbon vertical
    ctx.fillRect(-8, -H/2, 16, H);
    // Bow
    ctx.fillStyle = bundle.ribbonColor || '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.bezierCurveTo(-20, -30, -35, -20, -20, -8); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.bezierCurveTo(20, -30, 35, -20, 20, -8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -8, 6, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(bundle.name || 'BUNDLE', 0, H/2 - 18);
    // Price tag
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.roundRect(-24, H/2 - 8, 48, 14, 6); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(bundle.price || '4.99$', 0, H/2 - 1);
    ctx.restore();
  },

  _drawShopItemDetailed(ctx, x, y, item, owned, t) {
    ctx.save();
    ctx.translate(x, y);
    const W = item.cardW || 110, H = item.cardH || 140;
    // Card bg
    const rarity = item.rarity || 'common';
    const rarityColors = { common:'#334', uncommon:'#234a23', rare:'#223355', epic:'#442255', legendary:'#553311' };
    ctx.fillStyle = rarityColors[rarity] || '#334';
    ctx.beginPath(); ctx.roundRect(-W/2, -H/2, W, H, 10); ctx.fill();
    // Rarity glow border
    const rarityGlows = { common:'#888', uncommon:'#44ff44', rare:'#4488ff', epic:'#cc44ff', legendary:'#ffaa00' };
    ctx.strokeStyle = rarityGlows[rarity] || '#888';
    ctx.lineWidth = owned ? 2 : 1.5;
    if (item.selected) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
    }
    ctx.beginPath(); ctx.roundRect(-W/2, -H/2, W, H, 10); ctx.stroke();
    // Item icon area
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.roundRect(-W/2 + 8, -H/2 + 8, W - 16, 70, 6); ctx.fill();
    // Icon placeholder / actual icon
    if (item.icon) {
      ctx.font = '32px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, 0, -H/2 + 44);
    }
    // Name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(item.name || 'Item', 0, -H/2 + 84);
    // Description
    ctx.fillStyle = 'rgba(200,200,200,0.8)';
    ctx.font = '8px Arial';
    ctx.fillText(item.desc || '', 0, -H/2 + 98);
    // Owned badge / price
    if (owned) {
      ctx.fillStyle = '#22cc44';
      ctx.beginPath(); ctx.roundRect(-20, H/2 - 22, 40, 14, 5); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Arial';
      ctx.fillText('OWNED', 0, H/2 - 15);
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.roundRect(-28, H/2 - 22, 56, 14, 5); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 9px Arial';
      ctx.fillText((item.price || '100') + ' 🪙', 0, H/2 - 15);
    }
    ctx.restore();
  },

  _drawOpenChest(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    const phase = Math.min(1, t);
    const shake = phase < 0.4 ? Math.sin(t * 28) * (0.4 - phase) * 6 : 0;
    ctx.translate(shake, 0);
    // Base glow
    if (phase > 0.6) {
      const openGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 50 * (phase - 0.6) * 2.5);
      openGlow.addColorStop(0, 'rgba(255,220,0,0.7)');
      openGlow.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = openGlow;
      ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
    }
    // Chest base
    const cGrad = ctx.createLinearGradient(-35, 0, 35, 40);
    cGrad.addColorStop(0, '#8B5E3C');
    cGrad.addColorStop(1, '#5C3A1E');
    ctx.fillStyle = cGrad;
    ctx.beginPath(); ctx.roundRect(-35, 0, 70, 40, [0,0,8,8]); ctx.fill();
    // Metal bands
    ctx.fillStyle = '#888';
    ctx.fillRect(-35, 10, 70, 4);
    ctx.fillRect(-35, 26, 70, 4);
    // Lock
    const lockOpen = phase > 0.35;
    ctx.fillStyle = lockOpen ? '#888' : '#FFD700';
    ctx.beginPath(); ctx.arc(0, 2, 7, 0, Math.PI * 2); ctx.fill();
    if (!lockOpen) {
      ctx.fillStyle = '#aa8800';
      ctx.beginPath(); ctx.roundRect(-5, 2, 10, 8, 2); ctx.fill();
    }
    // Lid (opens with animation)
    const lidAngle = phase > 0.4 ? -Math.PI * 0.8 * ((phase - 0.4) / 0.6) : 0;
    ctx.save();
    ctx.translate(-35, 0);
    ctx.rotate(lidAngle);
    ctx.translate(35, 0);
    const lGrad = ctx.createLinearGradient(-35, -20, 35, 0);
    lGrad.addColorStop(0, '#a0724a');
    lGrad.addColorStop(1, '#6B4226');
    ctx.fillStyle = lGrad;
    ctx.beginPath(); ctx.roundRect(-35, -20, 70, 22, [8,8,0,0]); ctx.fill();
    ctx.fillStyle = '#888';
    ctx.fillRect(-35, -4, 70, 4);
    ctx.restore();
    // Sparkles when open
    if (phase > 0.7) {
      for (let s = 0; s < 8; s++) {
        const sAngle = s * Math.PI / 4 + t * 2;
        const sDist = 25 + s * 5 + Math.sin(t * 5 + s) * 8;
        const sAlpha = (phase - 0.7) * 3 * (0.5 + 0.5 * Math.sin(t * 8 + s));
        ctx.fillStyle = `rgba(255,220,60,${sAlpha})`;
        ctx.beginPath();
        ctx.arc(Math.cos(sAngle) * sDist, -10 + Math.sin(sAngle) * sDist * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  _drawGachaAnimation(ctx, W, H, result, t) {
    ctx.save();
    // Dark overlay
    ctx.fillStyle = `rgba(0,0,20,${Math.min(0.92, t * 3)})`;
    ctx.fillRect(0, 0, W, H);
    const phase = t;
    // Spinning circles
    for (let c = 0; c < 5; c++) {
      const r = 30 + c * 22;
      const speed = (5 - c) * 0.8 + 1;
      ctx.strokeStyle = `rgba(${c%2?'0,150,255':'255,150,0'},${0.3 - c*0.04})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W/2, H/2, r, phase * speed, phase * speed + Math.PI * 1.5);
      ctx.stroke();
    }
    // Center card reveal
    if (phase > 0.5) {
      const revP = Math.min(1, (phase - 0.5) * 2);
      const cardH = 200 * revP;
      const rarity = result.rarity || 'rare';
      const rarityGlows = { common:'#888', uncommon:'#44ff44', rare:'#4488ff', epic:'#cc44ff', legendary:'#ffaa00' };
      const glowColor = rarityGlows[rarity] || '#4488ff';
      // Card glow
      const cGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 120);
      cGrad.addColorStop(0, `${glowColor}55`);
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.arc(W/2, H/2, 120, 0, Math.PI * 2); ctx.fill();
      // Card body
      ctx.save();
      ctx.translate(W/2, H/2);
      ctx.scale(revP, revP);
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.roundRect(-65, -cardH/2, 130, cardH, 12); ctx.fill();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(-65, -cardH/2, 130, cardH, 12); ctx.stroke();
      if (revP > 0.85) {
        ctx.font = '42px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(result.icon || '⭐', 0, -20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(result.name || 'Item', 0, 30);
        ctx.fillStyle = glowColor;
        ctx.font = '11px Arial';
        ctx.fillText(rarity.toUpperCase(), 0, 52);
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // VEHICLE SELECTION ENHANCEMENTS
  // ═══════════════════════════════════════════════════════════════

  _drawVehicleShowcase(ctx, W, H, vehicleId, def, t) {
    ctx.save();
    const cx = W / 2, cy = H / 2;
    // Rotating platform
    const rotAngle = t * 0.4;
    // Platform ellipse
    const pGrad = ctx.createRadialGradient(cx, cy + 40, 5, cx, cy + 40, 120);
    pGrad.addColorStop(0, 'rgba(100,150,255,0.3)');
    pGrad.addColorStop(0.6, 'rgba(60,100,200,0.12)');
    pGrad.addColorStop(1, 'rgba(20,40,120,0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath(); ctx.ellipse(cx, cy + 40, 110, 22, 0, 0, Math.PI * 2); ctx.fill();
    // Rotating ring
    ctx.strokeStyle = 'rgba(100,180,255,0.5)';
    ctx.lineWidth = 2;
    ctx.save();
    ctx.translate(cx, cy + 40);
    ctx.scale(1, 0.2);
    ctx.beginPath(); ctx.arc(0, 0, 108, rotAngle, rotAngle + Math.PI * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 90, rotAngle + Math.PI, rotAngle + Math.PI * 2.6); ctx.stroke();
    ctx.restore();
    // Vehicle name plate
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(cx - 70, cy + 60, 140, 28, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((def && def.name) || vehicleId || 'Vehicle', cx, cy + 74);
    // Hover bob
    ctx.translate(0, Math.sin(t * 1.8) * 4);
    ctx.restore();
  },

  _drawVehicleStats(ctx, x, y, def) {
    ctx.save();
    ctx.translate(x, y);
    const radius = 55;
    const stats = [
      { label: 'Speed',    value: def.topSpeed   || 50 },
      { label: 'Accel',    value: def.accel       || 50 },
      { label: 'Grip',     value: def.grip        || 50 },
      { label: 'Suspend',  value: def.suspension  || 50 },
      { label: 'Boost',    value: def.nitro       || 50 },
      { label: 'Armor',    value: def.armor       || 50 },
    ];
    const n = stats.length;
    // Background web
    for (let ring = 1; ring <= 4; ring++) {
      ctx.strokeStyle = `rgba(100,150,255,${0.1 + ring * 0.05})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = radius * (ring / 4);
        const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
    }
    // Spokes
    stats.forEach((stat, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = 'rgba(100,150,255,0.2)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.stroke();
    });
    // Stat polygon
    ctx.beginPath();
    stats.forEach((stat, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = radius * (Math.min(100, stat.value) / 100);
      const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(80,160,255,0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.85)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // Dots
    stats.forEach((stat, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = radius * (Math.min(100, stat.value) / 100);
      ctx.fillStyle = '#88ccff';
      ctx.beginPath(); ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 3, 0, Math.PI * 2); ctx.fill();
    });
    // Labels
    stats.forEach((stat, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const lx = Math.cos(angle) * (radius + 14), ly = Math.sin(angle) * (radius + 14);
      ctx.fillStyle = 'rgba(200,220,255,0.9)';
      ctx.font = '8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(stat.label, lx, ly);
    });
    ctx.restore();
  },

  _drawVehicleComparison(ctx, x, y, v1, v2) {
    ctx.save();
    ctx.translate(x, y);
    const stats = ['topSpeed','accel','grip','suspension','nitro','armor'];
    const labels = ['Speed','Accel','Grip','Susp.','Boost','Armor'];
    const barW = 80;
    ctx.fillStyle = 'rgba(200,220,255,0.8)';
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(v1.name || 'V1', -barW - 30, -10);
    ctx.fillText(v2.name || 'V2', barW + 30, -10);
    stats.forEach((key, i) => {
      const vy = i * 18;
      const val1 = Math.min(100, (v1[key] || 50));
      const val2 = Math.min(100, (v2[key] || 50));
      // Label
      ctx.fillStyle = 'rgba(180,200,255,0.8)';
      ctx.font = '8px Arial'; ctx.textAlign = 'center';
      ctx.fillText(labels[i], 0, vy);
      // Bar v1 (left)
      ctx.fillStyle = 'rgba(255,100,100,0.3)';
      ctx.fillRect(-barW, vy - 5, barW, 10);
      ctx.fillStyle = 'rgba(255,100,100,0.85)';
      ctx.fillRect(-barW, vy - 5, barW * (val1 / 100), 10);
      // Bar v2 (right)
      ctx.fillStyle = 'rgba(100,150,255,0.3)';
      ctx.fillRect(0, vy - 5, barW, 10);
      ctx.fillStyle = 'rgba(100,150,255,0.85)';
      ctx.fillRect(0, vy - 5, barW * (val2 / 100), 10);
      // Value labels
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Arial'; ctx.textAlign = 'right';
      ctx.fillText(val1, -barW - 3, vy + 1);
      ctx.textAlign = 'left';
      ctx.fillText(val2, barW + 3, vy + 1);
    });
    ctx.restore();
  },

  _drawVehicleParts(ctx, x, y, parts) {
    ctx.save();
    ctx.translate(x, y);
    const partSlots = ['engine','transmission','suspension','tires','nitro','bodykit'];
    const slotIcons = ['🔧','⚙️','🔩','🏎️','🔥','🚗'];
    const slotColors = { common:'#888', uncommon:'#44aa44', rare:'#4488ff', epic:'#aa44ff', legendary:'#ffaa00' };
    partSlots.forEach((slot, i) => {
      const px = (i % 3) * 70 - 70, py = Math.floor(i / 3) * 55;
      const part = parts && parts[slot];
      // Slot bg
      ctx.fillStyle = part ? (slotColors[part.rarity] || '#444') + '44' : 'rgba(50,50,80,0.5)';
      ctx.beginPath(); ctx.roundRect(px - 28, py - 20, 56, 44, 6); ctx.fill();
      ctx.strokeStyle = part ? (slotColors[part.rarity] || '#888') : 'rgba(100,100,150,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(px - 28, py - 20, 56, 44, 6); ctx.stroke();
      // Icon
      ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(slotIcons[i], px, py - 4);
      // Part name or "Empty"
      ctx.fillStyle = part ? '#fff' : 'rgba(150,150,180,0.6)';
      ctx.font = '7px Arial'; ctx.textBaseline = 'top';
      ctx.fillText(part ? (part.name || slot) : 'Empty', px, py + 10);
      // Stat bonus
      if (part && part.bonus) {
        ctx.fillStyle = '#88ff88';
        ctx.font = 'bold 7px Arial';
        ctx.fillText('+' + part.bonus, px, py + 20);
      }
    });
    ctx.restore();
  },

  _drawLockIcon(ctx, x, y, size, t) {
    ctx.save();
    ctx.translate(x, y);
    const s = size || 24;
    const pulse = 1 + Math.sin(t * 3) * 0.06;
    ctx.scale(pulse, pulse);
    // Shackle
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = s * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.28, Math.PI, 0);
    ctx.stroke();
    // Body
    const lGrad = ctx.createLinearGradient(-s/2, -s*0.08, s/2, s*0.5);
    lGrad.addColorStop(0, '#888');
    lGrad.addColorStop(1, '#444');
    ctx.fillStyle = lGrad;
    ctx.beginPath(); ctx.roundRect(-s*0.42, -s*0.08, s*0.84, s*0.56, s*0.1); ctx.fill();
    // Keyhole
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(0, s*0.18, s*0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-s*0.06, s*0.18, s*0.12, s*0.18);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // MAP SELECTION ENHANCEMENTS
  // ═══════════════════════════════════════════════════════════════

  _drawMapPreview(ctx, x, y, W, H, mapId, t) {
    ctx.save();
    ctx.translate(x, y);
    // Clip to preview rect
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 8); ctx.clip();
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0, '#1a3a6e');
    skyGrad.addColorStop(1, '#4a7ab5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.55);
    // Ground
    const grdGrad = ctx.createLinearGradient(0, H*0.55, 0, H);
    grdGrad.addColorStop(0, '#2d5a27');
    grdGrad.addColorStop(1, '#1a3a18');
    ctx.fillStyle = grdGrad;
    ctx.fillRect(0, H*0.55, W, H*0.45);
    // Track line preview (sinusoidal path)
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let px2 = 0; px2 <= W; px2 += 2) {
      const py2 = H * 0.65 - Math.sin(px2 / W * Math.PI * 2.5 + t * 0.5) * H * 0.25;
      px2 === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Map ID label
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(4, 4, W - 8, 18, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((mapId || 'Map').toUpperCase(), W/2, 13);
    // Border
    ctx.strokeStyle = 'rgba(100,150,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 8); ctx.stroke();
    ctx.restore();
  },

  _drawMapDifficulty(ctx, x, y, stars) {
    ctx.save();
    ctx.translate(x, y);
    const maxStars = 5;
    for (let s = 0; s < maxStars; s++) {
      const filled = s < (stars || 0);
      const sx = s * 18 - (maxStars * 18) / 2 + 9;
      // Star path
      ctx.fillStyle = filled ? '#FFD700' : 'rgba(100,100,100,0.4)';
      ctx.strokeStyle = filled ? '#cc8800' : 'rgba(80,80,80,0.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2 - Math.PI / 2;
        const r = p % 2 === 0 ? 7 : 3;
        const px2 = Math.cos(a) * r + sx, py2 = Math.sin(a) * r;
        p === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },

  _drawMapRecord(ctx, x, y, record) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(-60, -12, 120, 24, 6); ctx.fill();
    // Trophy icon
    ctx.font = '14px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🏆', -54, 0);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(record && record.time ? record.time : '--:--:--', -34, 0);
    if (record && record.player) {
      ctx.fillStyle = 'rgba(200,200,200,0.8)';
      ctx.font = '9px Arial';
      ctx.fillText(record.player, -34, 12);
    }
    ctx.restore();
  },

  _drawMapUnlockCondition(ctx, x, y, condition) {
    ctx.save();
    ctx.translate(x, y);
    // Lock background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(-70, -16, 140, 32, 8); ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-70, -16, 140, 32, 8); ctx.stroke();
    // Lock icon small
    this._drawLockIcon(ctx, -52, 0, 14, 0);
    ctx.fillStyle = 'rgba(200,200,200,0.9)';
    ctx.font = '9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const condText = typeof condition === 'string' ? condition :
                     condition && condition.level ? `Level ${condition.level}` :
                     condition && condition.stars ? `${condition.stars} ⭐ required` : 'Locked';
    ctx.fillText(condText, -34, 0);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS SCREEN
  // ═══════════════════════════════════════════════════════════════

  drawSettingsScreen(ctx, W, H, settings, selected, t) {
    ctx.save();
    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0d1b2a');
    bgGrad.addColorStop(1, '#1a2a3a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('⚙️ SETTINGS', W/2, 20);
    ctx.strokeStyle = 'rgba(100,150,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W*0.1, 50); ctx.lineTo(W*0.9, 50); ctx.stroke();
    const items = [
      { label: 'Sound Effects', key: 'sfx',       type: 'toggle' },
      { label: 'Music',         key: 'music',      type: 'toggle' },
      { label: 'Vibration',     key: 'vibration',  type: 'toggle' },
      { label: 'Volume',        key: 'volume',     type: 'slider', min:0, max:100 },
      { label: 'Music Vol.',    key: 'musicVol',   type: 'slider', min:0, max:100 },
      { label: 'Quality',       key: 'quality',    type: 'dropdown', options:['Low','Medium','High','Ultra'] },
      { label: 'Left: Gas',     key: 'leftBtn',    type: 'keybind' },
      { label: 'Right: Brake',  key: 'rightBtn',   type: 'keybind' },
    ];
    items.forEach((item, i) => {
      const iy = 68 + i * 52;
      const isSelected = selected === i;
      // Row bg
      ctx.fillStyle = isSelected ? 'rgba(80,120,255,0.22)' : (i%2===0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)');
      ctx.beginPath(); ctx.roundRect(W*0.05, iy, W*0.9, 44, 6); ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = 'rgba(100,150,255,0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(W*0.05, iy, W*0.9, 44, 6); ctx.stroke();
      }
      // Label
      ctx.fillStyle = '#ddd';
      ctx.font = '13px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(item.label, W*0.09, iy + 22);
      // Control
      const val = settings && settings[item.key];
      if (item.type === 'toggle') {
        this._drawToggle(ctx, W*0.82, iy + 22, val, t);
      } else if (item.type === 'slider') {
        this._drawSlider(ctx, W*0.55, iy + 22, W*0.38, val || 50, item.min, item.max, t);
      } else if (item.type === 'dropdown') {
        this._drawDropdown(ctx, W*0.55, iy + 10, W*0.36, item.options, val || item.options[0], false, t);
      } else if (item.type === 'keybind') {
        this._drawKeyBinding(ctx, W*0.7, iy + 22, val || '?', item.label, false);
      }
    });
    ctx.restore();
  },

  _drawToggle(ctx, x, y, value, t) {
    ctx.save();
    ctx.translate(x, y);
    const on = !!value;
    const trackW = 38, trackH = 20;
    // Track
    ctx.fillStyle = on ? '#4488ff' : '#444';
    ctx.beginPath(); ctx.roundRect(-trackW/2, -trackH/2, trackW, trackH, trackH/2); ctx.fill();
    // Thumb
    const thumbX = on ? trackW/2 - 11 : -trackW/2 + 11;
    const tGrad = ctx.createRadialGradient(thumbX - 2, -2, 1, thumbX, 0, 9);
    tGrad.addColorStop(0, '#fff');
    tGrad.addColorStop(1, '#ccc');
    ctx.fillStyle = tGrad;
    ctx.beginPath(); ctx.arc(thumbX, 0, 9, 0, Math.PI * 2); ctx.fill();
    // ON/OFF text
    ctx.fillStyle = on ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(on ? 'ON' : 'OFF', on ? -8 : 8, 0);
    ctx.restore();
  },

  _drawSlider(ctx, x, y, W, value, min, max, t) {
    ctx.save();
    ctx.translate(x, y);
    const norm = ((value || 0) - (min || 0)) / ((max || 100) - (min || 0));
    const trackH = 6;
    // Track bg
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.roundRect(0, -trackH/2, W, trackH, trackH/2); ctx.fill();
    // Fill
    ctx.fillStyle = '#4488ff';
    ctx.beginPath(); ctx.roundRect(0, -trackH/2, W * norm, trackH, trackH/2); ctx.fill();
    // Thumb
    const tx2 = W * norm;
    const tGrad = ctx.createRadialGradient(tx2 - 2, -2, 1, tx2, 0, 10);
    tGrad.addColorStop(0, '#fff');
    tGrad.addColorStop(1, '#88aaff');
    ctx.fillStyle = tGrad;
    ctx.beginPath(); ctx.arc(tx2, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,150,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(tx2, 0, 9, 0, Math.PI * 2); ctx.stroke();
    // Value label
    ctx.fillStyle = '#ccc';
    ctx.font = '9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(value || 0), tx2 + 13, 0);
    ctx.restore();
  },

  _drawDropdown(ctx, x, y, W, options, selected, open, t) {
    ctx.save();
    ctx.translate(x, y);
    const H2 = 24;
    // Main button
    ctx.fillStyle = 'rgba(40,60,100,0.8)';
    ctx.beginPath(); ctx.roundRect(0, 0, W, H2, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(100,150,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H2, 5); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(selected || '', 8, H2/2);
    // Arrow
    ctx.fillStyle = '#88aaff';
    ctx.font = '10px Arial'; ctx.textAlign = 'right';
    ctx.fillText(open ? '▲' : '▼', W - 6, H2/2);
    // Dropdown options
    if (open && options) {
      options.forEach((opt, i) => {
        const oy = H2 + i * 22;
        ctx.fillStyle = opt === selected ? 'rgba(60,100,200,0.85)' : 'rgba(20,30,60,0.95)';
        ctx.beginPath(); ctx.roundRect(0, oy, W, 22, i === options.length-1 ? [0,0,5,5] : 0); ctx.fill();
        ctx.strokeStyle = 'rgba(60,100,180,0.3)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
        ctx.fillStyle = opt === selected ? '#fff' : '#aaa';
        ctx.font = '11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(opt, 8, oy + 11);
      });
    }
    ctx.restore();
  },

  _drawKeyBinding(ctx, x, y, key, action, editing) {
    ctx.save();
    ctx.translate(x, y);
    const kw = 48, kh = 26;
    // Key cap
    ctx.fillStyle = editing ? 'rgba(255,180,0,0.3)' : 'rgba(40,40,60,0.8)';
    ctx.beginPath(); ctx.roundRect(-kw/2, -kh/2, kw, kh, 5); ctx.fill();
    ctx.strokeStyle = editing ? '#FFD700' : 'rgba(120,140,200,0.6)';
    ctx.lineWidth = editing ? 2 : 1.2;
    ctx.beginPath(); ctx.roundRect(-kw/2, -kh/2, kw, kh, 5); ctx.stroke();
    // Bottom shadow edge (keycap 3D)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-kw/2 + 2, kh/2 - 3, kw - 4, 3);
    ctx.fillStyle = editing ? '#FFD700' : '#ddd';
    ctx.font = `bold ${key && key.length > 1 ? 8 : 12}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(key || '?', 0, -1);
    if (editing) {
      ctx.fillStyle = 'rgba(255,200,0,0.8)';
      ctx.font = '8px Arial';
      ctx.fillText('Press key...', 0, kh/2 + 8);
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // SPECIAL SCREENS
  // ═══════════════════════════════════════════════════════════════

  drawPrestigeScreen(ctx, W, H, prestigeLevel, t) {
    ctx.save();
    // Dramatic dark bg
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    // Gold particle radial
    for (let p = 0; p < 20; p++) {
      const pa = (p / 20) * Math.PI * 2 + t * 0.3;
      const pr = 80 + Math.sin(t * 1.5 + p) * 20;
      const px2 = W/2 + Math.cos(pa) * pr, py2 = H/2 + Math.sin(pa) * pr * 0.5;
      ctx.fillStyle = `rgba(255,${150 + p*5},0,${0.2 + Math.sin(t*3+p)*0.1})`;
      ctx.beginPath(); ctx.arc(px2, py2, 2 + Math.sin(t*4+p)*1, 0, Math.PI*2); ctx.fill();
    }
    // Center star burst
    const sbGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 120);
    sbGrad.addColorStop(0, 'rgba(255,200,0,0.35)');
    sbGrad.addColorStop(0.5, 'rgba(255,100,0,0.12)');
    sbGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sbGrad;
    ctx.beginPath(); ctx.arc(W/2, H/2, 120, 0, Math.PI * 2); ctx.fill();
    // Prestige badge
    ctx.save();
    ctx.translate(W/2, H/2 - 30);
    const bGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 55);
    bGrad.addColorStop(0, '#ffe066');
    bGrad.addColorStop(0.5, '#f0a500');
    bGrad.addColorStop(1, '#7a5000');
    ctx.fillStyle = bGrad;
    // Hexagon badge
    ctx.beginPath();
    for (let h = 0; h < 6; h++) {
      const ha = h / 6 * Math.PI * 2 - Math.PI / 6;
      h === 0 ? ctx.moveTo(Math.cos(ha)*55, Math.sin(ha)*55) : ctx.lineTo(Math.cos(ha)*55, Math.sin(ha)*55);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff8'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(prestigeLevel || 1, 0, 0);
    ctx.restore();
    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('PRESTIGE ' + (prestigeLevel || 1), W/2, H/2 + 48);
    ctx.fillStyle = 'rgba(255,220,150,0.8)';
    ctx.font = '13px Arial';
    ctx.fillText('All progress reset. Legacy unlocked.', W/2, H/2 + 80);
    // Rewards section
    const rewards = ['🏆 Exclusive Badge', '🎨 Special Paint', '⚡ +5% Boost', '💎 200 Diamonds'];
    rewards.forEach((r, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px Arial';
      ctx.fillText(r, W/2, H/2 + 108 + i * 22);
    });
    ctx.restore();
  },

  drawSeasonPassScreen(ctx, W, H, pass, t) {
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0d1b3e');
    bgGrad.addColorStop(1, '#1a0d3e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    // Season title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText((pass && pass.name) || 'Season 1: Inferno', W/2, 16);
    // Timer
    ctx.fillStyle = 'rgba(255,180,60,0.9)';
    ctx.font = '11px Arial';
    ctx.fillText('⏱ ' + ((pass && pass.daysLeft) || 30) + ' days remaining', W/2, 42);
    // Progress bar
    const prog = (pass && pass.level || 0) / ((pass && pass.maxLevel) || 50);
    this._drawProgressBar(ctx, W*0.05, 62, W*0.9, 12, prog, '#FFD700', '#aa7700');
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`Level ${pass && pass.level || 0} / ${pass && pass.maxLevel || 50}`, W/2, 68);
    // Reward track
    const rewards = (pass && pass.rewards) || Array.from({length:8}, (_,i) => ({ level: i*5+5, icon: ['🏎️','💰','🔥','⭐','🎨','💎','🏆','👑'][i], name: ['Car','Gold','Nitro','XP','Paint','Diamond','Trophy','Crown'][i], premium: i % 3 === 2 }));
    rewards.forEach((r, i) => {
      const rx = W * 0.06 + i * ((W * 0.88) / (rewards.length - 1));
      const ry = 100;
      const reached = (pass && pass.level || 0) >= r.level;
      // Node circle
      ctx.fillStyle = reached ? '#FFD700' : '#334';
      ctx.beginPath(); ctx.arc(rx, ry, 16, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = r.premium ? '#aa44ff' : (reached ? '#fff' : '#556');
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(rx, ry, 16, 0, Math.PI*2); ctx.stroke();
      // Icon
      ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(r.icon, rx, ry);
      // Level
      ctx.fillStyle = reached ? '#FFD700' : '#888';
      ctx.font = '8px Arial'; ctx.textBaseline = 'top';
      ctx.fillText(r.level, rx, ry + 20);
      // Connector line
      if (i < rewards.length - 1) {
        const nx = W * 0.06 + (i+1) * ((W * 0.88) / (rewards.length - 1));
        ctx.strokeStyle = reached ? 'rgba(255,215,0,0.5)' : 'rgba(80,80,100,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rx + 16, ry); ctx.lineTo(nx - 16, ry); ctx.stroke();
      }
    });
    // Free vs Premium tracks label
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.font = '9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('FREE', W*0.05, 86);
    ctx.fillStyle = 'rgba(180,80,255,0.9)';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('PREMIUM', W*0.05, 146);
    ctx.restore();
  },

  drawDailyDealsScreen(ctx, W, H, deals, t) {
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0a1a0a');
    bgGrad.addColorStop(1, '#1a2a1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    // Title
    ctx.fillStyle = '#44ff88';
    ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🏪 DAILY DEALS', W/2, 14);
    // Refresh timer
    const h = new Date().getHours(), m = new Date().getMinutes();
    const hoursLeft = 23 - h, minsLeft = 59 - m;
    ctx.fillStyle = 'rgba(150,220,150,0.8)';
    ctx.font = '10px Arial';
    ctx.fillText(`Refreshes in ${hoursLeft}h ${minsLeft}m`, W/2, 38);
    // Deal cards
    const dealList = deals || [
      { name:'Speed Boost',    icon:'⚡', origPrice:500,  salePrice:199,  discount:60, rarity:'rare' },
      { name:'Diamond Pack',   icon:'💎', origPrice:1000, salePrice:450,  discount:55, rarity:'epic' },
      { name:'Rally Car',      icon:'🏎️', origPrice:5000, salePrice:1990, discount:60, rarity:'legendary' },
      { name:'Nitro x3',       icon:'🔥', origPrice:300,  salePrice:149,  discount:50, rarity:'uncommon' },
    ];
    const cardW = (W - 32) / 2, cardH = 115;
    dealList.forEach((d, i) => {
      const cx2 = (i % 2) * (cardW + 8) + 12;
      const cy2 = Math.floor(i / 2) * (cardH + 10) + 58;
      // Card
      const rarityColors = { uncommon:'#234a23', rare:'#223355', epic:'#442255', legendary:'#553311' };
      ctx.fillStyle = rarityColors[d.rarity] || '#223';
      ctx.beginPath(); ctx.roundRect(cx2, cy2, cardW, cardH, 8); ctx.fill();
      const rarityGlows = { uncommon:'#44ff44', rare:'#4488ff', epic:'#cc44ff', legendary:'#ffaa00' };
      ctx.strokeStyle = rarityGlows[d.rarity] || '#444';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx2, cy2, cardW, cardH, 8); ctx.stroke();
      // Discount badge
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); ctx.arc(cx2 + cardW - 14, cy2 + 14, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('-'+d.discount+'%', cx2 + cardW - 14, cy2 + 14);
      // Icon
      ctx.font = '30px Arial'; ctx.textBaseline = 'top';
      ctx.fillText(d.icon, cx2 + cardW/2, cy2 + 10);
      ctx.textBaseline = 'middle';
      // Name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Arial';
      ctx.fillText(d.name, cx2 + cardW/2, cy2 + 56);
      // Price
      ctx.fillStyle = 'rgba(200,200,200,0.6)';
      ctx.font = '9px Arial';
      ctx.fillText('Was: ' + d.origPrice + ' 🪙', cx2 + cardW/2, cy2 + 72);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(d.salePrice + ' 🪙', cx2 + cardW/2, cy2 + 86);
      // Buy button
      ctx.fillStyle = '#22aa44';
      ctx.beginPath(); ctx.roundRect(cx2 + cardW/2 - 26, cy2 + 97, 52, 14, 5); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px Arial';
      ctx.fillText('BUY NOW', cx2 + cardW/2, cy2 + 104);
    });
    ctx.restore();
  },

  drawStatisticsScreen(ctx, W, H, stats, page, t) {
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0d1a2e');
    bgGrad.addColorStop(1, '#0a1020');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('📊 STATISTICS', W/2, 14);
    // Page tabs
    const pages = ['General','Vehicle','Race','Social'];
    pages.forEach((pg, i) => {
      const tx2 = W * 0.12 + i * (W * 0.2);
      const isActive = (page || 0) === i;
      ctx.fillStyle = isActive ? 'rgba(80,120,255,0.4)' : 'rgba(40,50,80,0.5)';
      ctx.beginPath(); ctx.roundRect(tx2 - 2, 36, W * 0.18, 22, [6,6,0,0]); ctx.fill();
      if (isActive) {
        ctx.fillStyle = '#88aaff';
        ctx.beginPath(); ctx.roundRect(tx2 - 2, 56, W * 0.18, 2, 0); ctx.fill();
      }
      ctx.fillStyle = isActive ? '#fff' : '#888';
      ctx.font = `${isActive?'bold ':''}9px Arial`; ctx.textAlign = 'center';
      ctx.fillText(pg, tx2 + W*0.09 - 2, 44);
    });
    // Stats list
    const statGroups = {
      0: [
        { label:'Total Races',    value: stats && stats.races || 0,       unit:'' },
        { label:'Wins',           value: stats && stats.wins || 0,        unit:'' },
        { label:'Win Rate',       value: stats && stats.winRate || 0,     unit:'%' },
        { label:'Total Distance', value: stats && stats.distance || 0,    unit:' km' },
        { label:'Playtime',       value: stats && stats.playtime || 0,    unit:' hrs' },
        { label:'Gold Earned',    value: stats && stats.goldEarned || 0,  unit:'' },
        { label:'Best Streak',    value: stats && stats.bestStreak || 0,  unit:' wins' },
      ],
      1: [
        { label:'Vehicles Owned', value: stats && stats.vehiclesOwned || 0, unit:'' },
        { label:'Most Used',      value: stats && stats.mostUsed || 'None', unit:'', isStr:true },
        { label:'Upgrades Done',  value: stats && stats.upgrades || 0,    unit:'' },
        { label:'Parts Equipped', value: stats && stats.parts || 0,       unit:'' },
      ],
    };
    const currentStats = statGroups[page || 0] || statGroups[0];
    currentStats.forEach((s, i) => {
      const sy = 68 + i * 34;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
      ctx.fillRect(W * 0.05, sy, W * 0.9, 30);
      ctx.fillStyle = 'rgba(180,200,255,0.8)';
      ctx.font = '11px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(s.label, W * 0.09, sy + 15);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'right';
      const valStr = s.isStr ? String(s.value) : Number(s.value).toLocaleString() + (s.unit || '');
      ctx.fillText(valStr, W * 0.92, sy + 15);
    });
    ctx.restore();
  },

  drawCustomizationScreen(ctx, W, H, vehicleId, paintJob, decal, t) {
    ctx.save();
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#111');
    bgGrad.addColorStop(1, '#1a1a2a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('🎨 CUSTOMIZE', W/2, 14);
    // Vehicle preview area
    ctx.fillStyle = 'rgba(30,30,50,0.7)';
    ctx.beginPath(); ctx.roundRect(W*0.05, 38, W*0.9, 120, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(100,120,200,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W*0.05, 38, W*0.9, 120, 10); ctx.stroke();
    ctx.fillStyle = 'rgba(150,150,180,0.5)';
    ctx.font = '11px Arial'; ctx.textBaseline = 'middle';
    ctx.fillText((vehicleId || 'Vehicle') + ' — Preview', W/2, 98);
    // Paint swatches
    ctx.fillStyle = 'rgba(180,200,255,0.7)';
    ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('Paint', W*0.05, 168);
    const paints = ['#cc2200','#0044cc','#22aa22','#cc9900','#cc00cc','#00aacc','#ffffff','#222222'];
    paints.forEach((c, i) => {
      const px2 = W*0.05 + i * (W*0.1);
      const isActive = paintJob && paintJob.primary === c;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(px2 + 14, 188, 12, 0, Math.PI*2); ctx.fill();
      if (isActive) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(px2 + 14, 188, 14, 0, Math.PI*2); ctx.stroke();
      }
    });
    // Decal section
    ctx.fillStyle = 'rgba(180,200,255,0.7)';
    ctx.font = '10px Arial'; ctx.textAlign = 'left';
    ctx.fillText('Decals', W*0.05, 212);
    const decals = ['⚡','🔥','💀','⭐','🦅','🐲','👁','∞'];
    decals.forEach((d, i) => {
      const dx2 = W*0.05 + i * (W*0.1);
      const isActive = decal === d;
      ctx.fillStyle = isActive ? 'rgba(80,120,255,0.4)' : 'rgba(40,40,60,0.5)';
      ctx.beginPath(); ctx.roundRect(dx2 + 2, 230, 22, 22, 4); ctx.fill();
      if (isActive) {
        ctx.strokeStyle = '#88aaff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(dx2 + 2, 230, 22, 22, 4); ctx.stroke();
      }
      ctx.font = '14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d, dx2 + 13, 241);
    });
    // Apply button
    ctx.fillStyle = '#2255cc';
    ctx.beginPath(); ctx.roundRect(W*0.3, H - 44, W*0.4, 32, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('APPLY', W/2, H - 28);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // JOYSTICK & KEYBOARD HINTS
  // ═══════════════════════════════════════════════════════════════

  drawJoystick(ctx, x, y, size, input, t) {
    ctx.save();
    ctx.translate(x, y);
    const r = size / 2;
    const ix = input ? (input.x || 0) * r * 0.55 : 0;
    const iy = input ? (input.y || 0) * r * 0.55 : 0;
    // Outer ring shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    // Base plate
    const baseGrad = ctx.createRadialGradient(-r*0.2, -r*0.2, r*0.1, 0, 0, r);
    baseGrad.addColorStop(0, 'rgba(60,70,100,0.7)');
    baseGrad.addColorStop(1, 'rgba(20,25,45,0.85)');
    ctx.fillStyle = baseGrad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(100,150,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // Directional markers
    ctx.strokeStyle = 'rgba(150,180,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -r*0.7); ctx.lineTo(0, r*0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r*0.7, 0); ctx.lineTo(r*0.7, 0); ctx.stroke();
    // Stick shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(ix + 2, iy + 3, r * 0.35, 0, Math.PI*2); ctx.fill();
    // Stick nub
    const nubGrad = ctx.createRadialGradient(ix - r*0.08, iy - r*0.08, r*0.04, ix, iy, r*0.35);
    nubGrad.addColorStop(0, 'rgba(160,180,255,0.95)');
    nubGrad.addColorStop(0.5, 'rgba(80,110,200,0.9)');
    nubGrad.addColorStop(1, 'rgba(30,50,130,0.85)');
    ctx.fillStyle = nubGrad;
    ctx.beginPath(); ctx.arc(ix, iy, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,210,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(ix, iy, r * 0.35, 0, Math.PI * 2); ctx.stroke();
    // Gloss on nub
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(ix - r*0.07, iy - r*0.1, r*0.14, r*0.09, -0.4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  },

  drawKeyboardHints(ctx, W, H, screen) {
    ctx.save();
    const hints = {
      game:    [{ key:'←→', desc:'Gas/Brake' }, { key:'↑', desc:'Nitro' }, { key:'P', desc:'Pause' }, { key:'R', desc:'Restart' }],
      menu:    [{ key:'↑↓', desc:'Navigate' }, { key:'Enter', desc:'Select' }, { key:'Esc', desc:'Back' }],
      garage:  [{ key:'←→', desc:'Browse' }, { key:'U', desc:'Upgrade' }, { key:'B', desc:'Buy' }, { key:'Esc', desc:'Back' }],
      default: [{ key:'Esc', desc:'Back' }, { key:'Enter', desc:'Confirm' }],
    };
    const hintList = hints[screen] || hints.default;
    const totalW = hintList.length * 90;
    let startX = (W - totalW) / 2;
    hintList.forEach((h2) => {
      // Key cap
      const kw = Math.max(24, h2.key.length * 7 + 10);
      ctx.fillStyle = 'rgba(30,35,55,0.85)';
      ctx.beginPath(); ctx.roundRect(startX, H - 34, kw, 22, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(120,140,200,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(startX, H - 34, kw, 22, 4); ctx.stroke();
      // Bottom edge (3D)
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(startX + 2, H - 14, kw - 4, 3);
      ctx.fillStyle = '#ddd';
      ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(h2.key, startX + kw/2, H - 23);
      // Desc
      ctx.fillStyle = 'rgba(160,170,200,0.75)';
      ctx.font = '8px Arial';
      ctx.fillText(h2.desc, startX + kw/2, H - 8);
      startX += kw + 12;
    });
    ctx.restore();
  }

};

if (typeof module !== 'undefined') module.exports = UI;

// =============================================================================
// TUTORIAL_SYSTEM - Yeni başlayan rehberi (10 adım)
// =============================================================================
const TUTORIAL_SYSTEM = {
  steps: [
    { id: 0, title: 'WELCOME!', desc: 'Welcome to Ahmet! We\'ll teach you the controls.', highlight: null, action: 'tap_to_continue' },
    { id: 1, title: 'GAS PEDAL', desc: 'Press the right side and drive your car forward!', highlight: 'right', action: 'press_throttle', icon: '🚀' },
    { id: 2, title: 'BRAKE', desc: 'Press the left side to brake. Use it carefully!', highlight: 'left', action: 'press_brake', icon: '🛑' },
    { id: 3, title: 'NITRO', desc: 'Use the nitro booster and speed up! Limited amount available.', highlight: 'nitro', action: 'press_nitro', icon: '⚡' },
    { id: 4, title: 'FUEL', desc: 'Watch your fuel gauge. If it runs out, your engine stops!', highlight: 'fuel', action: 'watch_fuel', icon: '⛽' },
    { id: 5, title: 'COLLECT COINS', desc: 'Collect the coins on the road. Needed for vehicle upgrades!', highlight: 'coins', action: 'collect_coins', icon: '💰' },
    { id: 6, title: 'BALANCE', desc: 'Don\'t let your vehicle tip over! Balance with gas and brake.', highlight: 'balance', action: 'balance_vehicle', icon: '⚖️' },
    { id: 7, title: 'UPGRADES', desc: 'Power up your vehicle with upgrades in the garage!', highlight: 'upgrade', action: 'open_garage', icon: '🔧' },
    { id: 8, title: 'FUEL CANISTER', desc: 'Collect fuel canisters on the road and go further!', highlight: 'fuel_pickup', action: 'collect_fuel', icon: '🛢️' },
    { id: 9, title: 'READY!', desc: 'Great! You\'re ready to race in Ahmet! Good luck!', highlight: null, action: 'finish', icon: '🏆' }
  ],
  currentStep: 0,
  active: false,
  stepTimer: 0,
  arrowAnim: 0,

  start() {
    this.active = true;
    this.currentStep = 0;
    this.stepTimer = 0;
    this.arrowAnim = 0;
  },

  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.stepTimer = 0;
    } else {
      this.finish();
    }
  },

  finish() {
    this.active = false;
    this.currentStep = 0;
  },

  update(dt) {
    if (!this.active) return;
    this.stepTimer += dt;
    this.arrowAnim += dt * 3;
  },

  drawTutorialStep(ctx, step, W, H) {
    if (!this.active) return;
    const s = this.steps[step] || this.steps[0];
    const t = this.stepTimer;
    const fadeIn = Math.min(1, t * 3);

    ctx.save();
    ctx.globalAlpha = fadeIn * 0.82;
    // Overlay background
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,20,60,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Panel
    const pw = Math.min(W - 40, 520);
    const ph = 160;
    const px = (W - pw) / 2;
    const py = H - ph - 30;

    ctx.globalAlpha = fadeIn * 0.95;
    ctx.fillStyle = 'rgba(10,20,50,0.96)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,160,255,0.7)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Icon
    if (s.icon) {
      ctx.font = `bold ${H * 0.065}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(s.icon, px + 44, py + 52);
    }

    // Title
    ctx.font = `bold ${Math.round(H * 0.038)}px Arial`;
    ctx.fillStyle = '#4FC3F7';
    ctx.textAlign = 'left';
    ctx.fillText(s.title, px + 76, py + 40);

    // Description
    ctx.font = `${Math.round(H * 0.028)}px Arial`;
    ctx.fillStyle = '#E3F0FF';
    // Word wrap
    const words = s.desc.split(' ');
    let line = '';
    let lineY = py + 72;
    const maxW = pw - 90;
    for (let w of words) {
      const test = line + (line ? ' ' : '') + w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, px + 76, lineY);
        line = w;
        lineY += 26;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, px + 76, lineY);

    // Step indicator dots
    const dotCount = this.steps.length;
    const dotSpacing = 18;
    const dotStart = px + pw / 2 - (dotCount * dotSpacing) / 2;
    for (let i = 0; i < dotCount; i++) {
      ctx.beginPath();
      ctx.arc(dotStart + i * dotSpacing, py + ph - 22, i === step ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === step ? '#4FC3F7' : 'rgba(100,140,200,0.4)';
      ctx.fill();
    }

    // Continue hint
    ctx.font = `italic ${Math.round(H * 0.022)}px Arial`;
    ctx.fillStyle = 'rgba(160,200,255,0.65)';
    ctx.textAlign = 'right';
    ctx.fillText('Tap to continue ▶', px + pw - 14, py + ph - 14);

    // Highlight arrow
    if (s.highlight) {
      this.drawTutorialArrow(ctx, W, H, s.highlight, this.arrowAnim);
    }

    ctx.restore();
  },

  drawTutorialArrow(ctx, W, H, target, t) {
    let ax = W / 2, ay = H / 2, dir = 'down';
    if (target === 'right') { ax = W * 0.82; ay = H * 0.72; dir = 'down'; }
    else if (target === 'left') { ax = W * 0.18; ay = H * 0.72; dir = 'down'; }
    else if (target === 'nitro') { ax = W * 0.5; ay = H * 0.68; dir = 'up'; }
    else if (target === 'fuel') { ax = W * 0.15; ay = H * 0.12; dir = 'up'; }
    else if (target === 'coins') { ax = W * 0.5; ay = H * 0.4; dir = 'down'; }

    const bounce = Math.sin(t * 2) * 10;
    const alpha = 0.7 + 0.3 * Math.sin(t * 2.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#FFD600';
    ctx.fillStyle = '#FFD600';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#FFD600';
    ctx.shadowBlur = 14;

    const size = 28;
    let bx = ax, by = ay + (dir === 'down' ? bounce : -bounce);

    ctx.beginPath();
    if (dir === 'down') {
      ctx.moveTo(bx, by + size);
      ctx.lineTo(bx - size * 0.55, by);
      ctx.lineTo(bx - size * 0.2, by);
      ctx.lineTo(bx - size * 0.2, by - size * 0.9);
      ctx.lineTo(bx + size * 0.2, by - size * 0.9);
      ctx.lineTo(bx + size * 0.2, by);
      ctx.lineTo(bx + size * 0.55, by);
      ctx.closePath();
    } else {
      ctx.moveTo(bx, by - size);
      ctx.lineTo(bx + size * 0.55, by);
      ctx.lineTo(bx + size * 0.2, by);
      ctx.lineTo(bx + size * 0.2, by + size * 0.9);
      ctx.lineTo(bx - size * 0.2, by + size * 0.9);
      ctx.lineTo(bx - size * 0.2, by);
      ctx.lineTo(bx - size * 0.55, by);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
};

// =============================================================================
// NOTIFICATION_QUEUE - Bildirim sırası sistemi
// =============================================================================
const NOTIFICATION_QUEUE = {
  queue: [],
  active: [],
  maxActive: 4,
  nextId: 1,

  TYPES: {
    achievement: { color: '#FFD600', bg: 'rgba(60,50,0,0.95)', icon: '🏅', border: '#FFD600' },
    reward:      { color: '#00E676', bg: 'rgba(0,50,20,0.95)', icon: '🎁', border: '#00E676' },
    rank_up:     { color: '#FF6D00', bg: 'rgba(60,20,0,0.95)', icon: '⬆️', border: '#FF6D00' },
    new_vehicle: { color: '#00B0FF', bg: 'rgba(0,30,60,0.95)', icon: '🚗', border: '#00B0FF' },
    event_start: { color: '#E040FB', bg: 'rgba(40,0,60,0.95)', icon: '🎪', border: '#E040FB' },
    info:        { color: '#B0BEC5', bg: 'rgba(20,25,35,0.92)', icon: 'ℹ️', border: '#546E7A' }
  },

  addNotification(type, text, icon, duration) {
    const notif = {
      id: this.nextId++,
      type: type || 'info',
      text: text || '',
      icon: icon || null,
      duration: duration || 3.5,
      timer: 0,
      slideIn: 0,
      removing: false
    };
    this.queue.push(notif);
    this._processQueue();
  },

  _processQueue() {
    while (this.active.length < this.maxActive && this.queue.length > 0) {
      this.active.push(this.queue.shift());
    }
  },

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const n = this.active[i];
      n.timer += dt;
      if (!n.removing) n.slideIn = Math.min(1, n.slideIn + dt * 5);
      if (n.timer >= n.duration) {
        n.removing = true;
      }
      if (n.removing && n.slideIn > 0) {
        n.slideIn -= dt * 4;
        if (n.slideIn <= 0) {
          this.active.splice(i, 1);
          this._processQueue();
        }
      }
    }
  },

  drawNotifications(ctx, W, H, t) {
    const nw = Math.min(320, W * 0.5);
    const nh = 58;
    const margin = 10;
    const startY = 80;

    ctx.save();
    for (let i = 0; i < this.active.length; i++) {
      const n = this.active[i];
      const style = this.TYPES[n.type] || this.TYPES.info;
      const slideX = (1 - n.slideIn) * (nw + 20);
      const x = W - nw - margin + slideX;
      const y = startY + i * (nh + margin);

      // Shadow
      ctx.shadowColor = style.border;
      ctx.shadowBlur = 12;

      // Background
      ctx.fillStyle = style.bg;
      ctx.beginPath();
      ctx.roundRect(x, y, nw, nh, 12);
      ctx.fill();

      // Border
      ctx.strokeStyle = style.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Progress bar
      const progress = Math.max(0, 1 - n.timer / n.duration);
      ctx.fillStyle = style.border;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x + 2, y + nh - 5, (nw - 4) * progress, 3);
      ctx.globalAlpha = n.slideIn;

      // Icon
      const displayIcon = n.icon || style.icon;
      ctx.font = `${Math.round(nh * 0.52)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(displayIcon, x + 30, y + nh * 0.58);

      // Text
      ctx.font = `bold ${Math.round(H * 0.022)}px Arial`;
      ctx.fillStyle = style.color;
      ctx.textAlign = 'left';
      // Type label
      ctx.fillText(n.type.replace('_', ' ').toUpperCase(), x + 52, y + 22);
      // Message
      ctx.font = `${Math.round(H * 0.019)}px Arial`;
      ctx.fillStyle = '#E8EAF0';
      const maxTW = nw - 60;
      let txt = n.text;
      while (ctx.measureText(txt).width > maxTW && txt.length > 10) txt = txt.slice(0, -4) + '...';
      ctx.fillText(txt, x + 52, y + 40);
    }
    ctx.restore();
  }
};

// =============================================================================
// DAILY_CHALLENGE_UI - Günlük görev ekranı
// =============================================================================
const DAILY_CHALLENGE_UI = {
  challengeTypes: [
    { id: 'distance',    label: 'DISTANCE RECORD',  icon: '📏', color: '#2196F3', desc: 'Reach 2000m',      reward: 150, xp: 80  },
    { id: 'coin_rush',   label: 'COIN RUSH',        icon: '💰', color: '#FFD600', desc: 'Collect 100 coins',reward: 200, xp: 100 },
    { id: 'flip_master', label: 'FLIP MASTER',      icon: '🔄', color: '#E040FB', desc: 'Do 5 flips',       reward: 250, xp: 120 },
    { id: 'fuel_saver',  label: 'FUEL SAVER',       icon: '⛽', color: '#00E676', desc: 'Don\'t take any fuel', reward: 300, xp: 150 },
    { id: 'no_damage',   label: 'NO DAMAGE',        icon: '🛡️', color: '#FF6D00', desc: 'Go 1km without damage', reward: 175, xp: 90  }
  ],
  completedIds: [],
  scrollY: 0,

  drawDailyChallengeScreen(ctx, W, H, t) {
    ctx.save();
    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0D1B2A');
    bgGrad.addColorStop(1, '#1B2838');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = 'rgba(255,214,0,0.12)';
    ctx.fillRect(0, 0, W, 70);
    ctx.font = `bold ${Math.round(H * 0.05)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD600';
    ctx.shadowColor = '#FFD600';
    ctx.shadowBlur = 18;
    ctx.fillText('📅 DAILY MISSIONS', W / 2, 46);
    ctx.shadowBlur = 0;

    // Reset timer display
    ctx.font = `${Math.round(H * 0.022)}px Arial`;
    ctx.fillStyle = 'rgba(180,200,220,0.7)';
    ctx.fillText('Reset: 08:34:12', W / 2, 66);

    const cardW = Math.min(W - 40, 500);
    const cardH = 100;
    const cardX = (W - cardW) / 2;
    const startY = 90;

    for (let i = 0; i < this.challengeTypes.length; i++) {
      const ch = this.challengeTypes[i];
      const cy = startY + i * (cardH + 14) + this.scrollY;
      if (cy + cardH < 0 || cy > H) continue;
      const done = this.completedIds.includes(ch.id);
      const pulse = done ? 1 : 0.7 + 0.3 * Math.sin(t * 2 + i * 1.2);

      // Card BG
      ctx.fillStyle = done ? 'rgba(0,60,20,0.9)' : 'rgba(20,30,50,0.92)';
      ctx.beginPath();
      ctx.roundRect(cardX, cy, cardW, cardH, 14);
      ctx.fill();
      ctx.strokeStyle = done ? '#00E676' : ch.color;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Left color bar
      ctx.fillStyle = ch.color;
      ctx.beginPath();
      ctx.roundRect(cardX, cy, 7, cardH, [14, 0, 0, 14]);
      ctx.fill();

      // Icon
      ctx.font = `${Math.round(cardH * 0.48)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(ch.icon, cardX + 36, cy + cardH * 0.6);

      // Label
      ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
      ctx.fillStyle = done ? '#00E676' : '#E3F0FF';
      ctx.textAlign = 'left';
      ctx.fillText(ch.label, cardX + 60, cy + 32);

      // Description
      ctx.font = `${Math.round(H * 0.022)}px Arial`;
      ctx.fillStyle = 'rgba(180,200,220,0.8)';
      ctx.fillText(ch.desc, cardX + 60, cy + 56);

      // Reward
      ctx.font = `bold ${Math.round(H * 0.022)}px Arial`;
      ctx.fillStyle = '#FFD600';
      ctx.textAlign = 'right';
      ctx.fillText(`💰 ${ch.reward}`, cardX + cardW - 14, cy + 32);
      ctx.fillStyle = '#80DEEA';
      ctx.fillText(`✨ ${ch.xp} XP`, cardX + cardW - 14, cy + 56);

      // Done checkmark
      if (done) {
        ctx.fillStyle = '#00E676';
        ctx.font = `bold ${Math.round(H * 0.04)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('✓', cardX + cardW - 28, cy + cardH * 0.62);
      } else {
        // Claim button
        ctx.fillStyle = ch.color;
        ctx.beginPath();
        ctx.roundRect(cardX + cardW - 80, cy + cardH - 34, 68, 24, 8);
        ctx.fill();
        ctx.font = `bold ${Math.round(H * 0.02)}px Arial`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('CLAIM', cardX + cardW - 46, cy + cardH - 18);
      }
    }

    ctx.restore();
  }
};

// =============================================================================
// EVENT_UI - Etkinlik afişi ve sıralaması
// =============================================================================
const EVENT_UI = {
  drawEventBanner(ctx, W, H, eventData, t) {
    if (!eventData) eventData = { name: 'WEEKLY TOURNAMENT', subtitle: 'Be the fastest, grab the reward!', color: '#E040FB', endTime: '2d 14h', icon: '🏁' };
    ctx.save();
    const bh = Math.round(H * 0.22);

    // Banner gradient
    const grad = ctx.createLinearGradient(0, 0, W, bh);
    grad.addColorStop(0, 'rgba(80,0,100,0.97)');
    grad.addColorStop(0.5, 'rgba(140,0,200,0.97)');
    grad.addColorStop(1, 'rgba(80,0,100,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, bh);

    // Animated shimmer lines
    const shimmerX = ((t * 0.4) % 1.4) * W - W * 0.2;
    const shimGrad = ctx.createLinearGradient(shimmerX - 60, 0, shimmerX + 60, 0);
    shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.09)');
    shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimGrad;
    ctx.fillRect(0, 0, W, bh);

    // Border bottom
    ctx.strokeStyle = eventData.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, bh);
    ctx.lineTo(W, bh);
    ctx.stroke();

    // Icon
    const pulse = 1 + 0.05 * Math.sin(t * 3);
    ctx.font = `${Math.round(bh * 0.55 * pulse)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(eventData.icon, W * 0.12, bh * 0.62);

    // Event name
    ctx.font = `bold ${Math.round(H * 0.048)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = eventData.color;
    ctx.shadowBlur = 20;
    ctx.textAlign = 'left';
    ctx.fillText(eventData.name, W * 0.22, bh * 0.42);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.round(H * 0.025)}px Arial`;
    ctx.fillStyle = 'rgba(220,180,255,0.9)';
    ctx.fillText(eventData.subtitle, W * 0.22, bh * 0.66);

    // Countdown
    ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${eventData.endTime}`, W - 16, bh * 0.45);
    ctx.font = `${Math.round(H * 0.02)}px Arial`;
    ctx.fillStyle = 'rgba(200,180,255,0.7)';
    ctx.fillText('TIME LEFT', W - 16, bh * 0.65);

    // Participate button
    const btnW = 130, btnH = 34;
    const btnX = W - btnW - 16;
    const btnY = bh - btnH - 10;
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGrad.addColorStop(0, '#E040FB');
    btnGrad.addColorStop(1, '#7B1FA2');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.font = `bold ${Math.round(H * 0.025)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('JOIN →', btnX + btnW / 2, btnY + btnH * 0.64);

    ctx.restore();
  },

  drawEventLeaderboard(ctx, W, H, data) {
    if (!data || !data.players) {
      data = {
        title: 'LEADERBOARD',
        players: [
          { rank: 1, name: 'TurboKral99',   score: 48230, country: '🇹🇷', you: false },
          { rank: 2, name: 'MadRacer',       score: 44100, country: '🇩🇪', you: false },
          { rank: 3, name: 'You',            score: 39800, country: '🇹🇷', you: true  },
          { rank: 4, name: 'NitroKing',      score: 35500, country: '🇬🇧', you: false },
          { rank: 5, name: 'SpeedFreak42',   score: 28900, country: '🇺🇸', you: false }
        ]
      };
    }
    ctx.save();
    const lw = Math.min(W - 20, 480);
    const lx = (W - lw) / 2;
    const rowH = 52;
    const startY = 30;

    // Title
    ctx.font = `bold ${Math.round(H * 0.035)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FFD600';
    ctx.shadowBlur = 10;
    ctx.fillText('🏆 ' + (data.title || 'LEADERBOARD'), W / 2, startY + 28);
    ctx.shadowBlur = 0;

    const rankColors = ['#FFD600', '#B0BEC5', '#CD7F32'];

    for (let i = 0; i < data.players.length; i++) {
      const p = data.players[i];
      const ry = startY + 48 + i * (rowH + 6);

      // Row BG
      if (p.you) {
        ctx.fillStyle = 'rgba(0,180,255,0.18)';
        ctx.strokeStyle = '#00B0FF';
      } else {
        ctx.fillStyle = 'rgba(20,30,50,0.85)';
        ctx.strokeStyle = 'rgba(80,100,140,0.4)';
      }
      ctx.lineWidth = p.you ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(lx, ry, lw, rowH, 10);
      ctx.fill();
      ctx.stroke();

      // Rank
      ctx.font = `bold ${Math.round(H * 0.03)}px Arial`;
      ctx.fillStyle = rankColors[i] || '#90A4AE';
      ctx.textAlign = 'center';
      ctx.fillText(p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank-1] : `#${p.rank}`, lx + 32, ry + rowH * 0.6);

      // Country + Name
      ctx.font = `bold ${Math.round(H * 0.026)}px Arial`;
      ctx.fillStyle = p.you ? '#00E5FF' : '#E3F0FF';
      ctx.textAlign = 'left';
      ctx.fillText(`${p.country}  ${p.name}${p.you ? '  (You)' : ''}`, lx + 60, ry + rowH * 0.6);

      // Score
      ctx.font = `bold ${Math.round(H * 0.026)}px Arial`;
      ctx.fillStyle = '#FFD600';
      ctx.textAlign = 'right';
      ctx.fillText(p.score.toLocaleString(), lx + lw - 14, ry + rowH * 0.6);
    }
    ctx.restore();
  }
};

// =============================================================================
// PRESTIGE_UI - Prestij ekranı ve rozeti
// =============================================================================
const PRESTIGE_UI = {
  PRESTIGE_COLORS: [
    '#9E9E9E', '#9E9E9E',
    '#78909C', '#78909C',
    '#CD7F32', '#CD7F32',
    '#B0BEC5', '#B0BEC5',
    '#FFD600', '#FFD600',
    '#E040FB', '#E040FB',
    '#00B0FF', '#00B0FF',
    '#00E676', '#00E676',
    '#FF6D00', '#FF6D00',
    '#F44336', '#F44336'
  ],
  PRESTIGE_NAMES: [
    'BRONZE I', 'BRONZE II', 'SILVER I', 'SILVER II',
    'GOLD I', 'GOLD II', 'PLATINUM I', 'PLATINUM II',
    'DIAMOND I', 'DIAMOND II', 'MASTER I',  'MASTER II',
    'CHAMPION I', 'CHAMPION II', 'LEGEND I', 'LEGEND II',
    'DIVINE I', 'DIVINE II', 'IMMORTAL I', 'IMMORTAL II'
  ],

  drawPrestigeScreen(ctx, W, H, level, t) {
    level = Math.max(0, Math.min(level || 0, 19));
    const col = this.PRESTIGE_COLORS[level] || '#9E9E9E';
    const name = this.PRESTIGE_NAMES[level] || 'BRONZE I';

    ctx.save();
    // BG
    const bgG = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H));
    bgG.addColorStop(0, 'rgba(10,15,30,1)');
    bgG.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, W, H);

    // Glow ring
    const ringR = Math.min(W, H) * 0.28;
    const pulse = 1 + 0.04 * Math.sin(t * 2);
    const ringGrad = ctx.createRadialGradient(W/2, H*0.42, ringR*0.6*pulse, W/2, H*0.42, ringR*1.1*pulse);
    ringGrad.addColorStop(0, 'rgba(0,0,0,0)');
    ringGrad.addColorStop(0.85, 'rgba(0,0,0,0)');
    const _rr = parseInt(col.slice(1, 3), 16), _gg = parseInt(col.slice(3, 5), 16), _bb = parseInt(col.slice(5, 7), 16);
    ringGrad.addColorStop(0.9, 'rgba(' + _rr + ',' + _gg + ',' + _bb + ',0.3)');
    ringGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ringGrad;
    ctx.fillRect(0, 0, W, H);

    // Badge center
    this.drawPrestigeBadge(ctx, W/2, H*0.42, level, t);

    // Level name
    ctx.font = `bold ${Math.round(H * 0.055)}px Arial`;
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.shadowColor = col;
    ctx.shadowBlur = 22;
    ctx.fillText(name, W/2, H*0.72);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.round(H * 0.028)}px Arial`;
    ctx.fillStyle = 'rgba(180,200,220,0.7)';
    ctx.fillText(`Prestige Level ${level + 1}`, W/2, H*0.78);

    // Progress to next
    if (level < 19) {
      const barW = Math.min(W * 0.55, 340);
      const barH2 = 16;
      const barX = (W - barW) / 2;
      const barY = H * 0.83;
      const prog = 0.6 + 0.3 * Math.sin(t * 0.5);

      ctx.fillStyle = 'rgba(30,40,60,0.9)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH2, 8);
      ctx.fill();

      const barGrad2 = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      barGrad2.addColorStop(0, col);
      barGrad2.addColorStop(1, '#fff');
      ctx.fillStyle = barGrad2;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * prog, barH2, 8);
      ctx.fill();

      ctx.font = `bold ${Math.round(H * 0.022)}px Arial`;
      ctx.fillStyle = '#E3F0FF';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(prog * 100)}% → ${this.PRESTIGE_NAMES[level+1]}`, W/2, barY + barH2 + 20);
    }
    ctx.restore();
  },

  drawPrestigeBadge(ctx, x, y, level, t) {
    level = Math.max(0, Math.min(level || 0, 19));
    const col = this.PRESTIGE_COLORS[level] || '#9E9E9E';
    const r = 54 + 3 * Math.sin((t||0) * 1.8);

    ctx.save();
    ctx.translate(x, y);

    // Outer glow
    const glowG = ctx.createRadialGradient(0, 0, r*0.5, 0, 0, r*1.5);
    glowG.addColorStop(0, 'rgba(200,200,200,0.25)');
    glowG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowG;
    ctx.beginPath();
    ctx.arc(0, 0, r*1.5, 0, Math.PI*2);
    ctx.fill();

    // Main circle
    const cg = ctx.createRadialGradient(-r*0.3, -r*0.3, 0, 0, 0, r);
    cg.addColorStop(0, '#fff');
    cg.addColorStop(0.4, col);
    cg.addColorStop(1, '#000');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Star icon
    ctx.font = `bold ${Math.round(r * 0.9)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('⭐', 0, 2);

    // Level number
    ctx.font = `bold ${Math.round(r * 0.38)}px Arial`;
    ctx.fillStyle = '#000';
    ctx.fillText(level + 1, 0, r * 0.45);
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }
};

// =============================================================================
// VEHICLE_COMPARE_UI - İki araç yan yana karşılaştırma
// =============================================================================
const VEHICLE_COMPARE_UI = {
  statKeys: ['speed', 'acceleration', 'traction', 'fuel_tank', 'mass', 'nitro'],
  statLabels: { speed: 'SPEED', acceleration: 'ACCELERATION', traction: 'TRACTION', fuel_tank: 'TANK', mass: 'WEIGHT', nitro: 'NITRO' },
  statIcons:  { speed: '💨', acceleration: '⚡', traction: '🔥', fuel_tank: '⛽', mass: '⚖️', nitro: '🚀' },

  drawCompareScreen(ctx, W, H, vehicleA, vehicleB, t) {
    if (!vehicleA) vehicleA = { name: 'VEHICLE A', color: '#2196F3', stats: { speed:65, acceleration:70, traction:55, fuel_tank:80, mass:60, nitro:50 } };
    if (!vehicleB) vehicleB = { name: 'VEHICLE B', color: '#F44336', stats: { speed:75, acceleration:55, traction:70, fuel_tank:65, mass:75, nitro:80 } };

    ctx.save();
    // BG
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.font = `bold ${Math.round(H * 0.042)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#E3F0FF';
    ctx.fillText('VEHICLE COMPARE', W/2, 44);

    // Vehicle columns
    const colW = W * 0.38;
    const colAX = W * 0.07;
    const colBX = W * 0.55;
    const headerY = 78;

    [vehicleA, vehicleB].forEach((v, idx) => {
      const cx = idx === 0 ? colAX : colBX;
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(cx, headerY, colW, 50, 10);
      ctx.fill();
      ctx.font = `bold ${Math.round(H * 0.03)}px Arial`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(v.name, cx + colW/2, headerY + 32);
    });

    // VS
    ctx.font = `bold ${Math.round(H * 0.045)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.shadowColor = '#FFD600';
    ctx.shadowBlur = 14;
    ctx.textAlign = 'center';
    ctx.fillText('VS', W/2, headerY + 34);
    ctx.shadowBlur = 0;

    // Stats
    const statStartY = headerY + 72;
    const statRowH = 46;
    for (let i = 0; i < this.statKeys.length; i++) {
      const key = this.statKeys[i];
      const ry = statStartY + i * statRowH;
      const valA = vehicleA.stats[key] || 0;
      const valB = vehicleB.stats[key] || 0;
      const winner = valA > valB ? 'A' : valB > valA ? 'B' : 'tie';

      // Row BG
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, ry, W, statRowH);

      // Stat label center
      ctx.font = `bold ${Math.round(H * 0.024)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#90A4AE';
      ctx.fillText(`${this.statIcons[key]} ${this.statLabels[key]}`, W/2, ry + statRowH * 0.58);

      // Bar A (right-to-left from center)
      const barMaxW = colW * 0.85;
      const barH2 = 12;
      const barY = ry + statRowH/2 - barH2/2;
      const progA = valA / 100;
      const progB = valB / 100;
      const midX = W/2 - 44;
      const rightX = W/2 + 44;

      ctx.fillStyle = 'rgba(30,50,80,0.7)';
      ctx.fillRect(midX - barMaxW, barY, barMaxW, barH2);
      ctx.fillStyle = winner === 'A' ? vehicleA.color : 'rgba(33,150,243,0.6)';
      ctx.fillRect(midX - barMaxW * progA, barY, barMaxW * progA, barH2);

      ctx.fillStyle = 'rgba(30,50,80,0.7)';
      ctx.fillRect(rightX, barY, barMaxW, barH2);
      ctx.fillStyle = winner === 'B' ? vehicleB.color : 'rgba(244,67,54,0.6)';
      ctx.fillRect(rightX, barY, barMaxW * progB, barH2);

      // Values
      ctx.font = `bold ${Math.round(H * 0.026)}px Arial`;
      ctx.textAlign = 'right';
      ctx.fillStyle = winner === 'A' ? '#FFD600' : '#E3F0FF';
      ctx.fillText(valA, midX - barMaxW - 6, ry + statRowH * 0.62);
      ctx.textAlign = 'left';
      ctx.fillStyle = winner === 'B' ? '#FFD600' : '#E3F0FF';
      ctx.fillText(valB, rightX + barMaxW + 6, ry + statRowH * 0.62);
    }

    ctx.restore();
  }
};

// =============================================================================
// COLLECTION_UI - Araç koleksiyon ızgara görünümü (3x5 grid)
// =============================================================================
const COLLECTION_UI = {
  COLS: 3,
  ROWS: 5,
  selectedIdx: -1,

  drawCollectionGrid(ctx, W, H, vehicles, ownedIds, t) {
    if (!vehicles || vehicles.length === 0) {
      vehicles = Array.from({length: 15}, (_, i) => ({
        id: i, name: `VEHICLE ${i+1}`, color: `hsl(${i*24},70%,55%)`, icon: ['🚗','🚙','🏎️','🚕','🚌'][i%5], tier: ['Standard','Rare','Legend'][Math.floor(i/5)]
      }));
    }
    if (!ownedIds) ownedIds = [0, 1, 3, 7];

    ctx.save();
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, W, H);

    ctx.font = `bold ${Math.round(H * 0.04)}px Arial`;
    ctx.fillStyle = '#E3F0FF';
    ctx.textAlign = 'center';
    ctx.fillText('🚗 VEHICLE COLLECTION', W/2, 40);

    ctx.font = `${Math.round(H * 0.022)}px Arial`;
    ctx.fillStyle = 'rgba(144,164,174,0.7)';
    ctx.fillText(`${ownedIds.length} / ${vehicles.length} owned`, W/2, 62);

    const margin = 12;
    const gridW = W - margin * 2;
    const cellW = gridW / this.COLS;
    const cellH = (H - 80) / this.ROWS;

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const idx = r * this.COLS + c;
        if (idx >= vehicles.length) continue;
        const v = vehicles[idx];
        const cx = margin + c * cellW;
        const cy = 80 + r * cellH;
        const owned = ownedIds.includes(v.id);
        const selected = this.selectedIdx === idx;
        const pulse = selected ? 1 + 0.05 * Math.sin(t * 3) : 1;

        // Cell BG
        ctx.fillStyle = owned ? 'rgba(20,40,70,0.92)' : 'rgba(10,15,25,0.92)';
        ctx.beginPath();
        ctx.roundRect(cx + 4, cy + 4, cellW - 8, cellH - 8, 12);
        ctx.fill();

        if (selected || owned) {
          ctx.strokeStyle = selected ? '#FFD600' : v.color;
          ctx.lineWidth = selected ? 3 : 1.5;
          ctx.globalAlpha = selected ? 1 : 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Lock overlay
        if (!owned) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.beginPath();
          ctx.roundRect(cx + 4, cy + 4, cellW - 8, cellH - 8, 12);
          ctx.fill();
        }

        // Vehicle icon
        ctx.font = `${Math.round(cellH * 0.38 * pulse)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = owned ? '#fff' : 'rgba(255,255,255,0.25)';
        ctx.fillText(owned ? v.icon : '🔒', cx + cellW/2, cy + cellH * 0.52);

        // Name
        ctx.font = `bold ${Math.round(H * 0.018)}px Arial`;
        ctx.fillStyle = owned ? '#E3F0FF' : 'rgba(100,120,150,0.6)';
        ctx.fillText(v.name, cx + cellW/2, cy + cellH * 0.77);

        // Tier badge
        const tierColors = { 'Standard': '#78909C', 'Rare': '#AB47BC', 'Legend': '#FFD600' };
        ctx.font = `${Math.round(H * 0.014)}px Arial`;
        ctx.fillStyle = tierColors[v.tier] || '#78909C';
        ctx.fillText(v.tier, cx + cellW/2, cy + cellH * 0.91);
      }
    }
    ctx.restore();
  }
};

// =============================================================================
// FRIENDS_UI - Arkadaş listesi ekranı (simüle edilmiş)
// =============================================================================
const FRIENDS_UI = {
  STATUS_COLORS: { online: '#00E676', playing: '#FFD600', offline: '#546E7A' },

  drawFriendsScreen(ctx, W, H, friends, t) {
    if (!friends) {
      friends = [
        { name: 'TurboAhmet',   status: 'playing', score: 48230, avatar: '😎', level: 42 },
        { name: 'HızlıMehmet',  status: 'online',  score: 35100, avatar: '🤠', level: 38 },
        { name: 'YıldızAyşe',   status: 'online',  score: 29800, avatar: '👩', level: 31 },
        { name: 'NitroKan',     status: 'offline', score: 25600, avatar: '😤', level: 27 },
        { name: 'RampçıFatma',  status: 'playing', score: 22000, avatar: '🧕', level: 24 },
        { name: 'DağKelebeği',  status: 'offline', score: 18900, avatar: '🦋', level: 19 }
      ];
    }

    ctx.save();
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = 'rgba(0,176,255,0.1)';
    ctx.fillRect(0, 0, W, 68);
    ctx.font = `bold ${Math.round(H * 0.044)}px Arial`;
    ctx.fillStyle = '#00B0FF';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00B0FF';
    ctx.shadowBlur = 16;
    ctx.fillText('👥 FRIENDS', W/2, 44);
    ctx.shadowBlur = 0;

    const onlineCount = friends.filter(f => f.status !== 'offline').length;
    ctx.font = `${Math.round(H * 0.022)}px Arial`;
    ctx.fillStyle = '#00E676';
    ctx.fillText(`${onlineCount} online`, W/2, 62);

    const rowH = 66;
    const rowW = Math.min(W - 30, 500);
    const rowX = (W - rowW) / 2;

    for (let i = 0; i < friends.length; i++) {
      const f = friends[i];
      const ry = 80 + i * (rowH + 8);
      const statusCol = this.STATUS_COLORS[f.status] || '#546E7A';
      const anim = f.status === 'playing' ? 0.88 + 0.12 * Math.sin(t * 2 + i) : 1;

      // Row BG
      ctx.fillStyle = 'rgba(20,35,60,0.92)';
      ctx.beginPath();
      ctx.roundRect(rowX, ry, rowW, rowH, 12);
      ctx.fill();

      // Status bar
      ctx.fillStyle = statusCol;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.roundRect(rowX, ry, 5, rowH, [12, 0, 0, 12]);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Avatar circle
      ctx.fillStyle = `hsl(${i * 60}, 60%, 35%)`;
      ctx.beginPath();
      ctx.arc(rowX + 38, ry + rowH/2, 22, 0, Math.PI*2);
      ctx.fill();
      ctx.font = `${Math.round(rowH * 0.5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(f.avatar, rowX + 38, ry + rowH * 0.62);

      // Status dot
      ctx.fillStyle = statusCol;
      ctx.globalAlpha = anim;
      ctx.beginPath();
      ctx.arc(rowX + 54, ry + rowH/2 + 12, 6, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Name
      ctx.font = `bold ${Math.round(H * 0.027)}px Arial`;
      ctx.fillStyle = '#E3F0FF';
      ctx.textAlign = 'left';
      ctx.fillText(f.name, rowX + 68, ry + rowH * 0.42);

      // Status text
      ctx.font = `${Math.round(H * 0.02)}px Arial`;
      ctx.fillStyle = statusCol;
      const statusTxt = f.status === 'playing' ? '🎮 Playing' : f.status === 'online' ? '✅ Online' : '💤 Offline';
      ctx.fillText(statusTxt, rowX + 68, ry + rowH * 0.68);

      // Level + Score
      ctx.font = `bold ${Math.round(H * 0.024)}px Arial`;
      ctx.fillStyle = '#FFD600';
      ctx.textAlign = 'right';
      ctx.fillText(`Lvl ${f.level}`, rowX + rowW - 10, ry + rowH * 0.42);
      ctx.font = `${Math.round(H * 0.02)}px Arial`;
      ctx.fillStyle = '#80CBC4';
      ctx.fillText(f.score.toLocaleString(), rowX + rowW - 10, ry + rowH * 0.68);
    }

    ctx.restore();
  }
};

// =============================================================================
// CLAN_WAR_UI - Klan savaşı ekranı
// =============================================================================
const CLAN_WAR_UI = {
  drawClanWarScreen(ctx, W, H, warData, t) {
    if (!warData) {
      warData = {
        myClan:    { name: 'TURKISH LIONS', color: '#E53935', score: 128450, members: 28, flag: '🦁' },
        enemyClan: { name: 'GERMAN LIGHTNING', color: '#1565C0', score: 112300, members: 30, flag: '⚡' },
        timeLeft: '14:22:08',
        phase: 'WAR',
        myRank: 5,
        topPlayers: [
          { name: 'You',         score: 18200, clan: 'mine' },
          { name: 'TurboKral',   score: 16500, clan: 'mine' },
          { name: 'BlitzKing',   score: 15800, clan: 'enemy' },
          { name: 'SpeedMaster', score: 14200, clan: 'enemy' },
          { name: 'NitroGott',   score: 13900, clan: 'enemy' }
        ]
      };
    }

    ctx.save();
    ctx.fillStyle = '#0A0F1E';
    ctx.fillRect(0, 0, W, H);

    // War header
    const headerH = H * 0.32;
    const headerGrad = ctx.createLinearGradient(0, 0, W, headerH);
    headerGrad.addColorStop(0, warData.myClan.color + 'CC');
    headerGrad.addColorStop(0.5, '#111827CC');
    headerGrad.addColorStop(1, warData.enemyClan.color + 'CC');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, W, headerH);

    // My clan
    ctx.font = `${Math.round(headerH * 0.3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(warData.myClan.flag, W * 0.2, headerH * 0.48);
    ctx.font = `bold ${Math.round(H * 0.03)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.fillText(warData.myClan.name, W * 0.2, headerH * 0.7);
    ctx.font = `bold ${Math.round(H * 0.038)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.fillText(warData.myClan.score.toLocaleString(), W * 0.2, headerH * 0.88);

    // Enemy clan
    ctx.font = `${Math.round(headerH * 0.3)}px Arial`;
    ctx.fillText(warData.enemyClan.flag, W * 0.8, headerH * 0.48);
    ctx.font = `bold ${Math.round(H * 0.03)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.fillText(warData.enemyClan.name, W * 0.8, headerH * 0.7);
    ctx.font = `bold ${Math.round(H * 0.038)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.fillText(warData.enemyClan.score.toLocaleString(), W * 0.8, headerH * 0.88);

    // VS + Timer center
    ctx.font = `bold ${Math.round(H * 0.06)}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.fillText('⚔️', W/2, headerH * 0.48);
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(H * 0.026)}px Arial`;
    ctx.fillStyle = '#FF6D00';
    ctx.fillText(`⏱ ${warData.timeLeft}`, W/2, headerH * 0.72);
    ctx.font = `${Math.round(H * 0.02)}px Arial`;
    ctx.fillStyle = 'rgba(200,200,200,0.7)';
    ctx.fillText(warData.phase, W/2, headerH * 0.88);

    // Score bar
    const totalScore = warData.myClan.score + warData.enemyClan.score;
    const myRatio = warData.myClan.score / totalScore;
    const barW = W - 30;
    const barX = 15;
    const barY = headerH + 12;
    const barH2 = 18;

    ctx.fillStyle = warData.enemyClan.color;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH2, 9);
    ctx.fill();
    ctx.fillStyle = warData.myClan.color;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * myRatio, barH2, 9);
    ctx.fill();

    // Top Players
    const listY = headerH + 44;
    ctx.font = `bold ${Math.round(H * 0.028)}px Arial`;
    ctx.fillStyle = '#E3F0FF';
    ctx.textAlign = 'center';
    ctx.fillText('TOP FIGHTERS', W/2, listY + 22);

    const rowH = 46;
    for (let i = 0; i < warData.topPlayers.length; i++) {
      const p = warData.topPlayers[i];
      const ry = listY + 36 + i * rowH;
      const isMine = p.clan === 'mine';

      ctx.fillStyle = isMine ? 'rgba(229,57,53,0.15)' : 'rgba(21,101,192,0.15)';
      ctx.beginPath();
      ctx.roundRect(10, ry, W - 20, rowH - 4, 8);
      ctx.fill();

      ctx.strokeStyle = isMine ? warData.myClan.color : warData.enemyClan.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `bold ${Math.round(H * 0.024)}px Arial`;
      ctx.fillStyle = '#E3F0FF';
      ctx.textAlign = 'left';
      ctx.fillText(`${i+1}. ${p.name}`, 22, ry + rowH * 0.6);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#FFD600';
      ctx.fillText(p.score.toLocaleString(), W - 20, ry + rowH * 0.6);
    }

    ctx.restore();
  }
};

// =============================================================================
// SEASON_PASS_UI - Sezon geçiş ilerlemesi (30 ödül basamağı)
// =============================================================================
const SEASON_PASS_UI = {
  REWARDS: Array.from({length: 30}, (_, i) => ({
    level: i + 1,
    free:  { type: ['coins','xp','fuel'][i%3], amount: 50 * (i+1), icon: ['💰','✨','⛽'][i%3] },
    paid:  { type: ['vehicle','cosmetic','gems'][i%3], amount: i < 9 ? 1 : i < 19 ? 5 : 10, icon: ['🚗','🎨','💎'][i%3] }
  })),

  drawSeasonPass(ctx, W, H, currentLevel, hasPaid, t) {
    currentLevel = currentLevel || 8;
    ctx.save();
    ctx.fillStyle = '#0B0F1F';
    ctx.fillRect(0, 0, W, H);

    // Header
    const headerGrad = ctx.createLinearGradient(0, 0, W, 0);
    headerGrad.addColorStop(0, '#1A237E');
    headerGrad.addColorStop(0.5, '#283593');
    headerGrad.addColorStop(1, '#1A237E');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, W, 62);

    ctx.font = `bold ${Math.round(H * 0.042)}px Arial`;
    ctx.fillStyle = '#FFD600';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FFD600';
    ctx.shadowBlur = 14;
    ctx.fillText('⭐ SEASON PASS', W/2, 40);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.round(H * 0.02)}px Arial`;
    ctx.fillStyle = 'rgba(180,200,255,0.7)';
    ctx.fillText(`Level ${currentLevel} / 30`, W/2, 58);

    // Scroll container - horizontal row display
    const itemW = 64;
    const itemH = 110;
    const gap = 8;
    const startX = 10;
    const rowY = 74;

    // Free row label
    ctx.font = `bold ${Math.round(H * 0.022)}px Arial`;
    ctx.fillStyle = '#90A4AE';
    ctx.textAlign = 'left';
    ctx.fillText('FREE', startX, rowY + 18);

    // Paid row label
    ctx.fillStyle = hasPaid ? '#FFD600' : '#546E7A';
    ctx.fillText(hasPaid ? '⭐ PREMIUM' : '🔒 PREMIUM', startX, rowY + 18 + itemH + 8);

    const labelW = 78;
    const visibleCount = Math.floor((W - labelW - 10) / (itemW + gap));

    for (let i = 0; i < Math.min(this.REWARDS.length, visibleCount + currentLevel); i++) {
      const r = this.REWARDS[i];
      const ix = labelW + i * (itemW + gap);
      if (ix + itemW > W - 10) break;
      const unlocked = r.level <= currentLevel;
      const isCurrent = r.level === currentLevel;
      const pulse = isCurrent ? 1 + 0.06 * Math.sin(t * 3) : 1;

      // Free reward cell
      ctx.fillStyle = unlocked ? 'rgba(0,60,120,0.9)' : 'rgba(15,22,40,0.9)';
      ctx.beginPath();
      ctx.roundRect(ix, rowY + 24, itemW * pulse, itemH - 24, 8);
      ctx.fill();

      if (isCurrent) {
        ctx.strokeStyle = '#FFD600';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (unlocked) {
        ctx.strokeStyle = 'rgba(100,180,255,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Level number
      ctx.font = `bold ${Math.round(H * 0.018)}px Arial`;
      ctx.fillStyle = isCurrent ? '#FFD600' : unlocked ? '#80CBC4' : '#546E7A';
      ctx.textAlign = 'center';
      ctx.fillText(r.level, ix + itemW/2, rowY + 36);

      // Free icon
      ctx.font = `${Math.round(itemH * 0.3)}px Arial`;
      ctx.fillStyle = unlocked ? '#fff' : 'rgba(100,120,150,0.5)';
      ctx.fillText(r.free.icon, ix + itemW/2, rowY + 70);

      // Amount
      ctx.font = `bold ${Math.round(H * 0.016)}px Arial`;
      ctx.fillStyle = unlocked ? '#FFD600' : '#546E7A';
      ctx.fillText('x' + r.free.amount, ix + itemW/2, rowY + 90);

      // Paid reward cell
      const py2 = rowY + itemH + 8 + 24;
      ctx.fillStyle = hasPaid ? (unlocked ? 'rgba(100,50,0,0.9)' : 'rgba(20,10,5,0.9)') : 'rgba(10,10,10,0.7)';
      ctx.beginPath();
      ctx.roundRect(ix, py2, itemW, itemH - 24, 8);
      ctx.fill();

      if (hasPaid) {
        ctx.strokeStyle = unlocked ? '#FFD600' : 'rgba(100,80,0,0.4)';
        ctx.lineWidth = unlocked ? 1.5 : 1;
        ctx.stroke();
      }

      ctx.font = `${Math.round(itemH * 0.3)}px Arial`;
      ctx.fillStyle = hasPaid ? (unlocked ? '#fff' : 'rgba(200,150,0,0.4)') : 'rgba(80,80,80,0.5)';
      ctx.fillText(hasPaid ? r.paid.icon : '🔒', ix + itemW/2, py2 + 30);

      ctx.font = `bold ${Math.round(H * 0.016)}px Arial`;
      ctx.fillStyle = hasPaid && unlocked ? '#FFD600' : '#546E7A';
      ctx.fillText(hasPaid ? 'x' + r.paid.amount : '---', ix + itemW/2, py2 + 50);
    }

    ctx.restore();
  }
};

// =============================================================================
// drawLoadingBar - Yükleme çubuğu
// =============================================================================
function drawLoadingBar(ctx, W, H, progress, text) {
  ctx.save();
  progress = Math.max(0, Math.min(1, progress || 0));

  // BG overlay
  ctx.fillStyle = 'rgba(5,10,20,0.97)';
  ctx.fillRect(0, 0, W, H);

  // Logo area
  ctx.font = `bold ${Math.round(H * 0.08)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD600';
  ctx.shadowColor = '#FFD600';
  ctx.shadowBlur = 30;
  ctx.fillText('🏁 AHMET', W/2, H * 0.38);
  ctx.shadowBlur = 0;

  ctx.font = `${Math.round(H * 0.028)}px Arial`;
  ctx.fillStyle = 'rgba(144,164,174,0.8)';
  ctx.fillText('Ahmet', W/2, H * 0.46);

  // Bar
  const barW = Math.min(W * 0.65, 400);
  const barH2 = 20;
  const barX = (W - barW) / 2;
  const barY = H * 0.58;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH2, 10);
  ctx.fill();

  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, '#1565C0');
  barGrad.addColorStop(0.5, '#00B0FF');
  barGrad.addColorStop(1, '#00E5FF');
  ctx.fillStyle = barGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * progress, barH2, 10);
  ctx.fill();

  // Shimmer on bar
  if (progress > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progress, barH2 * 0.45, 10);
    ctx.fill();
  }

  // Percentage
  ctx.font = `bold ${Math.round(H * 0.03)}px Arial`;
  ctx.fillStyle = '#E3F0FF';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(progress * 100)}%`, W/2, barY + barH2 + 26);

  // Loading text
  if (text) {
    ctx.font = `${Math.round(H * 0.022)}px Arial`;
    ctx.fillStyle = 'rgba(120,150,180,0.7)';
    ctx.fillText(text, W/2, barY + barH2 + 48);
  }

  ctx.restore();
}

// =============================================================================
// drawCountdown - 3-2-1-GO sayım animasyonu (yarış ışığı dizisi)
// =============================================================================
// easeOutBack: snappy overshoot for a punchy scale-in pop.
function _countdownEase(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  const p = x - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

function drawCountdown(ctx, W, H, n, t) {
  ctx.save();

  const isGo  = n <= 0;
  const d     = Math.max(1, Math.min(3, Math.ceil(n)));   // displayed number 3/2/1
  const label = isGo ? 'GO!' : String(d);

  // Race-light palette: 3=red, 2=orange, 1=yellow, GO=green. (dark-track cohesive)
  const stageCols = { 3: '#FF2D2D', 2: '#FF8A00', 1: '#FFD400' };
  const col = isGo ? '#00E676' : stageCols[d];

  // Accessibility: reducedMotion → show numeral clearly with minimal motion. Guarded (undefined→false).
  let reduced = false;
  try {
    if (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion') === true) reduced = true;
  } catch (e) {}

  const cx = W / 2, cy = H / 2;
  const phase = t % 1;                       // per-tick progress 0→1

  // Timing (~snap in over first third, hold, fade over last ~28%).
  const inP  = Math.min(1, phase / 0.32);
  const outP = Math.max(0, (phase - 0.72) / 0.28);
  const eb   = _countdownEase(inP);          // overshoot → satisfying pop
  const scale = reduced ? 1 : ((isGo ? 0.55 : 0.5) + eb * (isGo ? 0.62 : 0.58));
  const alpha = reduced ? 1 : Math.max(0, 1 - outP);

  const baseR = H * (isGo ? 0.34 : 0.28);

  // --- Contrast backdrop: subtle radial dim so numerals read on any track ---
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6);
  vg.addColorStop(0, `rgba(2,8,20,${(reduced ? 0.45 : 0.55) * alpha})`);
  vg.addColorStop(1, 'rgba(2,8,20,0)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // --- Burst / ring pulse on each tick (bigger, layered burst on GO) ---
  if (!reduced) {
    const rings = isGo ? 3 : 1;
    for (let i = 0; i < rings; i++) {
      const rp = (phase - i * 0.12) / 0.6;
      if (rp <= 0 || rp >= 1) continue;
      const rr = baseR * (0.45 + rp * (isGo ? 1.5 : 1.15));
      const ra = (1 - rp) * 0.6 * alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.globalAlpha = ra;
      ctx.lineWidth = (isGo ? 8 : 6) * (1 - rp * 0.6);
      ctx.shadowColor = col;
      ctx.shadowBlur = 24 * ra;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // --- Race-light pods (F1-style staging cue: fills up as the count descends) ---
  {
    const pods = 3;
    const podR = H * 0.018;
    const gap  = podR * 3.2;
    const totalW = (pods - 1) * gap;
    const py   = cy - baseR * 0.95;
    const podCols = ['#FF2D2D', '#FF8A00', '#FFD400'];
    for (let i = 0; i < pods; i++) {
      const value  = 3 - i;                  // pod0=3, pod1=2, pod2=1
      const lit    = isGo || value >= d;
      const active = !isGo && value === d;
      const pcol   = isGo ? '#00E676' : podCols[i];
      const px     = cx - totalW / 2 + i * gap;
      ctx.beginPath();
      ctx.arc(px, py, podR, 0, Math.PI * 2);
      ctx.globalAlpha = alpha;
      if (lit) {
        ctx.fillStyle   = pcol;
        ctx.shadowColor = pcol;
        ctx.shadowBlur  = ((active || isGo) && !reduced) ? 18 : 8;
      } else {
        ctx.fillStyle  = 'rgba(120,140,160,0.28)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // --- Big bold numeral / GO! (high-contrast, glowing) ---
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${Math.round(H * 0.22 * scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.72)';
  ctx.lineWidth = Math.max(6, H * 0.012);
  ctx.strokeText(label, cx, cy);
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = (reduced ? 12 : 46) * alpha;
  ctx.fillText(label, cx, cy);
  // Soft top gloss for depth.
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillText(label, cx, cy - H * 0.006);

  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.restore();
}

// =============================================================================
// drawRacePosition - Yarış sıralaması HUD
// =============================================================================
function drawRacePosition(ctx, position, total, W, H) {
  ctx.save();
  const pw = 90, ph = 54;
  const px2 = W - pw - 10;
  const py = 10;

  ctx.fillStyle = 'rgba(0,10,30,0.88)';
  ctx.beginPath();
  ctx.roundRect(px2, py, pw, ph, 10);
  ctx.fill();
  ctx.strokeStyle = position === 1 ? '#FFD600' : '#1565C0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `bold ${Math.round(H * 0.055)}px Arial`;
  ctx.fillStyle = position === 1 ? '#FFD600' : '#E3F0FF';
  ctx.textAlign = 'center';
  ctx.fillText(`${position}`, px2 + pw * 0.42, py + ph * 0.68);

  const suffixes = ['st','nd','rd'];
  ctx.font = `bold ${Math.round(H * 0.025)}px Arial`;
  ctx.fillStyle = '#90A4AE';
  ctx.fillText(suffixes[position-1] || 'th', px2 + pw * 0.68, py + ph * 0.48);

  ctx.font = `${Math.round(H * 0.02)}px Arial`;
  ctx.fillStyle = 'rgba(144,164,174,0.7)';
  ctx.fillText(`/ ${total}`, px2 + pw * 0.68, py + ph * 0.74);

  ctx.restore();
}

// =============================================================================
// drawCombo - Kombo sayacı gösterimi
// =============================================================================
function drawCombo(ctx, combo, W, H, t) {
  if (!combo || combo < 2) return;
  ctx.save();
  const pulse = 1 + 0.12 * Math.sin(t * 5);
  const alpha = Math.min(1, combo * 0.3);
  const colors = ['#FF6D00','#FF1744','#E040FB','#FFD600'];
  const col = colors[Math.min(Math.floor(combo/3), colors.length-1)];

  ctx.globalAlpha = alpha;
  ctx.font = `bold ${Math.round(H * 0.065 * pulse)}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = 28;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = 6;
  ctx.strokeText(`${combo}x COMBO!`, W/2, H * 0.3);
  ctx.fillText(`${combo}x COMBO!`, W/2, H * 0.3);
  ctx.shadowBlur = 0;

  // Stars below
  ctx.font = `${Math.round(H * 0.04)}px Arial`;
  const stars = '⭐'.repeat(Math.min(combo, 5));
  ctx.fillText(stars, W/2, H * 0.3 + Math.round(H * 0.055));

  ctx.globalAlpha = 1;
  ctx.restore();
}

// =============================================================================
// ANIMATED_MENU_BG - Menü arka planı (araçlar geçiyor, dağlar)
// =============================================================================
const ANIMATED_MENU_BG = {
  vehicles: [
    { x: -80, y: 0.72, speed: 0.18, scale: 1,    icon: '🚗',  yOff: 0 },
    { x: 0.3,  y: 0.78, speed: 0.12, scale: 0.7,  icon: '🏎️', yOff: 0 },
    { x: 0.65, y: 0.75, speed: 0.22, scale: 0.85, icon: '🚙',  yOff: 0 },
    { x: 1.1,  y: 0.8,  speed: 0.14, scale: 0.6,  icon: '🚕',  yOff: 0 }
  ],
  clouds: Array.from({length: 6}, (_, i) => ({ x: i / 6, y: 0.08 + (i%3) * 0.07, speed: 0.015 + i * 0.005, size: 0.06 + (i%3)*0.02 })),
  stars: Array.from({length: 60}, () => ({ x: Math.random(), y: Math.random() * 0.55, r: 1 + Math.random() * 2.5 })),
  sunAngle: 0,

  update(dt) {
    for (const v of this.vehicles) {
      v.x += v.speed * dt;
      v.yOff = Math.sin(v.x * 8) * 3;
      if (v.x > 1.3) v.x = -0.15;
    }
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 1.2) c.x = -0.2;
    }
    this.sunAngle += dt * 0.05;
  },

  draw(ctx, W, H, t) {
    ctx.save();
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    const hour = (t * 0.01) % 1;
    const isDawn = hour < 0.2 || hour > 0.85;
    if (isDawn) {
      skyGrad.addColorStop(0, '#1A0F2E');
      skyGrad.addColorStop(0.5, '#5C1F3C');
      skyGrad.addColorStop(1, '#E8652A');
    } else {
      skyGrad.addColorStop(0, '#0D1B4B');
      skyGrad.addColorStop(0.5, '#1565C0');
      skyGrad.addColorStop(1, '#42A5F5');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.75);

    // Stars (night)
    for (const s of this.stars) {
      const twink = 0.5 + 0.5 * Math.sin(t * (1 + s.r) + s.x * 10);
      ctx.fillStyle = `rgba(255,255,255,${isDawn ? twink * 0.8 : twink * 0.3})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon/Sun
    const sunX = W * (0.5 + 0.4 * Math.cos(this.sunAngle));
    const sunY = H * (0.15 - 0.08 * Math.sin(this.sunAngle));
    if (isDawn) {
      // Moon
      ctx.fillStyle = '#FFF9C4';
      ctx.shadowColor = '#FFF9C4';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Sun
      ctx.shadowColor = '#FFD600';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#FFD600';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Clouds
    for (const c of this.clouds) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = isDawn ? 'rgba(255,180,140,0.6)' : 'rgba(255,255,255,0.75)';
      const cx = c.x * W;
      const cy = c.y * H;
      const cr = c.size * W;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + cr * 0.6, cy + cr * 0.1, cr * 0.65, cr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - cr * 0.5, cy + cr * 0.15, cr * 0.5, cr * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Mountains back
    ctx.fillStyle = isDawn ? '#2D1B3D' : '#1A2744';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.65);
    for (let x = 0; x <= W; x += W / 8) {
      const peak = H * (0.38 + 0.1 * Math.sin(x * 0.003 + 1));
      ctx.lineTo(x, peak);
    }
    ctx.lineTo(W, H * 0.65);
    ctx.lineTo(0, H * 0.65);
    ctx.fill();

    // Mountains front
    ctx.fillStyle = isDawn ? '#1A0F20' : '#0F1A2D';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72);
    for (let x = 0; x <= W; x += W / 10) {
      const peak = H * (0.48 + 0.12 * Math.sin(x * 0.004 + t * 0.02));
      ctx.lineTo(x, peak);
    }
    ctx.lineTo(W, H * 0.72);
    ctx.lineTo(0, H * 0.72);
    ctx.fill();

    // Ground
    const gGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
    gGrad.addColorStop(0, '#2E4D1E');
    gGrad.addColorStop(0.3, '#1B3A12');
    gGrad.addColorStop(1, '#0D1F0A');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // Road
    ctx.fillStyle = '#1C2030';
    ctx.fillRect(0, H * 0.78, W, H * 0.14);
    // Road lines
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 20]);
    ctx.lineDashOffset = -(t * 80 % 50);
    ctx.beginPath();
    ctx.moveTo(0, H * 0.85);
    ctx.lineTo(W, H * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vehicles
    for (const v of this.vehicles) {
      const vx = v.x * W;
      const vy = v.y * H + v.yOff;
      ctx.font = `${Math.round(H * 0.06 * v.scale)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(v.icon, vx, vy);
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(vx, vy + 6, 24 * v.scale, 6 * v.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
};

// =============================================================================
// drawStarBurst - Yıldız patlaması efekti
// =============================================================================
function drawStarBurst(ctx, x, y, n, r, t) {
  ctx.save();
  n = n || 8;
  r = r || 40;
  const colors = ['#FFD600','#FF6D00','#FF1744','#E040FB','#00E676','#00B0FF'];
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + t * 2;
    const dist = r * (0.5 + 0.5 * (t % 0.5) * 2);
    const px2 = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const alpha = Math.max(0, 1 - (t % 0.5) * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors[i % colors.length];
    ctx.shadowColor = colors[i % colors.length];
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px2, py, 5 + 3 * Math.sin(t * 4 + i), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// =============================================================================
// drawConfetti - Konfeti yağışı
// =============================================================================
const _confettiParticles = Array.from({length: 90}, (_, i) => ({
  x: Math.random(),
  y: Math.random(),
  vx: (Math.random() - 0.5) * 0.003,
  vy: 0.002 + Math.random() * 0.004,
  rot: Math.random() * Math.PI * 2,
  rotV: (Math.random() - 0.5) * 0.15,
  w: 8 + Math.random() * 10,
  h: 5 + Math.random() * 6,
  color: `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`,
  phase: Math.random() * Math.PI * 2
}));

function drawConfetti(ctx, W, H, t) {
  ctx.save();
  for (const p of _confettiParticles) {
    p.y += p.vy;
    p.x += p.vx + 0.001 * Math.sin(t * 2 + p.phase);
    p.rot += p.rotV;
    if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
    if (p.x < -0.05) p.x = 1.05;
    if (p.x > 1.05) p.x = -0.05;

    ctx.save();
    ctx.translate(p.x * W, p.y * H);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// =============================================================================
// UIAnimator - Tween sistemi (lerp, easeIn, easeOut, spring)
// =============================================================================
const UIAnimator = {
  _animations: [],
  _nextId: 1,

  lerp(a, b, t) { return a + (b - a) * t; },
  easeIn(t)  { return t * t; },
  easeOut(t) { return 1 - (1 - t) * (1 - t); },
  easeInOut(t) { return t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; },
  spring(t, stiffness, damping) {
    stiffness = stiffness || 200;
    damping   = damping   || 20;
    const omega = Math.sqrt(stiffness);
    const zeta  = damping / (2 * omega);
    if (zeta < 1) {
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (Math.cos(omegaD * t) + (zeta * omega / omegaD) * Math.sin(omegaD * t));
    }
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  },

  animate(from, to, duration, easing, onUpdate, onComplete) {
    const id = this._nextId++;
    this._animations.push({ id, from, to, duration, easing: easing || 'linear', onUpdate, onComplete, elapsed: 0, done: false });
    return id;
  },

  cancel(id) {
    const idx = this._animations.findIndex(a => a.id === id);
    if (idx !== -1) this._animations.splice(idx, 1);
  },

  update(dt) {
    for (let i = this._animations.length - 1; i >= 0; i--) {
      const a = this._animations[i];
      if (a.done) { this._animations.splice(i, 1); continue; }
      a.elapsed += dt;
      const rawT = Math.min(1, a.elapsed / a.duration);
      let easedT;
      switch (a.easing) {
        case 'easeIn':    easedT = this.easeIn(rawT);    break;
        case 'easeOut':   easedT = this.easeOut(rawT);   break;
        case 'easeInOut': easedT = this.easeInOut(rawT); break;
        case 'spring':    easedT = this.spring(rawT);    break;
        default:          easedT = rawT;
      }
      const val = this.lerp(a.from, a.to, easedT);
      if (typeof a.onUpdate === 'function') a.onUpdate(val, easedT);
      if (rawT >= 1) {
        a.done = true;
        if (typeof a.onComplete === 'function') a.onComplete();
      }
    }
  },

  // Shorthand helpers
  fadeIn(setter, duration)  { return this.animate(0, 1, duration || 0.4, 'easeOut', setter); },
  fadeOut(setter, duration) { return this.animate(1, 0, duration || 0.4, 'easeIn',  setter); },
  slideIn(setter, from, to, duration) { return this.animate(from, to, duration || 0.35, 'spring', setter); },
  bounce(setter, peak, duration) {
    this.animate(0, peak, duration * 0.4, 'easeOut', setter, () => {
      this.animate(peak, 0, duration * 0.6, 'easeIn', setter);
    });
  }
};

if (typeof module !== 'undefined') module.exports = { TUTORIAL_SYSTEM, NOTIFICATION_QUEUE, DAILY_CHALLENGE_UI, EVENT_UI, PRESTIGE_UI, VEHICLE_COMPARE_UI, COLLECTION_UI, FRIENDS_UI, CLAN_WAR_UI, SEASON_PASS_UI, drawLoadingBar, drawCountdown, drawRacePosition, drawCombo, ANIMATED_MENU_BG, drawStarBurst, drawConfetti, UIAnimator };


// =============================================================================
// REPLAY_UI — Replay oynatıcı arayüzü
// =============================================================================
const REPLAY_UI = (() => {
  /**
   * drawReplayControls — Replay kontrol çubuğunu çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H     — canvas boyutları
   * @param {boolean} playing — oynatılıyor mu
   * @param {number}  speed   — hız çarpanı (0.25 / 0.5 / 1 / 2)
   * @param {number}  progress — 0–1 arası ilerleme
   */
  function drawReplayControls(ctx, W, H, playing, speed, progress) {
    const BAR_H = 56, BAR_Y = H - BAR_H - 12, PAD = 16;
    ctx.save();
    ctx.fillStyle   = 'rgba(10,10,20,0.82)';
    ctx.strokeStyle = 'rgba(0,220,255,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(PAD, BAR_Y, W - PAD * 2, BAR_H, 12);
    ctx.fill(); ctx.stroke();
    const BTN_SIZE = 28, BTN_Y = BAR_Y + BAR_H * 0.5;
    const buttons = [
      { icon: '⏮', x: PAD + 36 },
      { icon: playing ? '⏸' : '▶', x: PAD + 76 },
      { icon: '⏭', x: PAD + 116 },
    ];
    for (const b of buttons) {
      ctx.fillStyle   = 'rgba(0,200,255,0.18)';
      ctx.strokeStyle = 'rgba(0,200,255,0.6)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(b.x, BTN_Y, BTN_SIZE * 0.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font      = `16px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.icon, b.x, BTN_Y);
    }
    const TRACK_X = PAD + 160, TRACK_W = W - PAD * 2 - 200, TRACK_Y = BTN_Y;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 4;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(TRACK_X, TRACK_Y);
    ctx.lineTo(TRACK_X + TRACK_W, TRACK_Y);
    ctx.stroke();
    ctx.strokeStyle = '#00DCFF';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.moveTo(TRACK_X, TRACK_Y);
    ctx.lineTo(TRACK_X + TRACK_W * Math.max(0, Math.min(1, progress)), TRACK_Y);
    ctx.stroke();
    const thumbX = TRACK_X + TRACK_W * Math.max(0, Math.min(1, progress));
    ctx.fillStyle   = '#00DCFF';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(thumbX, TRACK_Y, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = 'rgba(0,220,255,0.9)';
    ctx.font         = `bold 11px 'Orbitron', monospace`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${speed}`, W - PAD - 10, BTN_Y);
    ctx.restore();
  }

  /**
   * drawReplayTimeline — Replay olay zaman çizelgesini çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   * @param {Array}  events   — [{ t, type, label }]
   * @param {number} progress — 0–1
   */
  function drawReplayTimeline(ctx, W, H, events, progress) {
    const TL_Y = H - 80, TL_H = 14, PAD = 16;
    const TL_X = PAD + 156, TL_W = W - PAD * 2 - 196;
    ctx.save();
    const typeColors = { flip: '#FF6B35', coin: '#FFD700', crash: '#FF3333', boost: '#00FF88', start: '#AAAAFF', finish: '#FFFFFF' };
    for (const ev of events) {
      const ex = TL_X + TL_W * Math.max(0, Math.min(1, ev.t));
      const col = typeColors[ev.type] || '#FFFFFF';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(ex, TL_Y + TL_H * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * drawReplayWatermark — Replay damgasını çizer (sol üst).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   */
  function drawReplayWatermark(ctx, W, H) {
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle   = '#00DCFF';
    ctx.font        = `bold 18px 'Orbitron', monospace`;
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor  = '#00DCFF';
    ctx.shadowBlur   = 12;
    ctx.fillText('⏺ REPLAY', 18, 18);
    ctx.shadowBlur   = 0;
    ctx.globalAlpha  = 1;
    ctx.restore();
  }

  return { drawReplayControls, drawReplayTimeline, drawReplayWatermark };
})();

// =============================================================================
// SANDBOX_UI — Sandbox mod arayüzü
// =============================================================================
const SANDBOX_UI = (() => {
  /**
   * drawSandboxToolbar — Sandbox araç çubuğunu çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   * @param {string} activeTool — aktif araç id
   * @param {Array}  tools      — [{ id, icon, label }]
   */
  function drawSandboxToolbar(ctx, W, H, activeTool, tools) {
    const TOOL_SIZE = 52, GAP = 8, PAD = 12;
    const totalW = tools.length * (TOOL_SIZE + GAP) - GAP + PAD * 2;
    const startX = (W - totalW) * 0.5;
    const startY = H - TOOL_SIZE - PAD * 2;
    ctx.save();
    ctx.fillStyle   = 'rgba(8,8,18,0.86)';
    ctx.strokeStyle = 'rgba(150,100,255,0.4)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(startX, startY, totalW, TOOL_SIZE + PAD * 2, 14);
    ctx.fill(); ctx.stroke();
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const tx   = startX + PAD + i * (TOOL_SIZE + GAP);
      const ty   = startY + PAD;
      const isActive = tool.id === activeTool;
      ctx.fillStyle   = isActive ? 'rgba(150,100,255,0.55)' : 'rgba(255,255,255,0.08)';
      ctx.strokeStyle = isActive ? '#9B6AFF' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth   = isActive ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, TOOL_SIZE, TOOL_SIZE, 10);
      ctx.fill(); ctx.stroke();
      ctx.font         = '22px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tool.icon, tx + TOOL_SIZE * 0.5, ty + TOOL_SIZE * 0.45);
      ctx.fillStyle    = isActive ? '#C0A0FF' : 'rgba(255,255,255,0.55)';
      ctx.font         = `9px sans-serif`;
      ctx.fillText(tool.label, tx + TOOL_SIZE * 0.5, ty + TOOL_SIZE - 8);
    }
    ctx.restore();
  }

  /**
   * drawSandboxHints — Sandbox ipuçlarını çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   */
  function drawSandboxHints(ctx, W, H) {
    ctx.save();
    const hints = ['[G] Gravity', '[T] Slow-Mo', '[E] Explosion', '[R] Reset', '[N] Nitro∞'];
    ctx.fillStyle    = 'rgba(8,8,18,0.72)';
    ctx.strokeStyle  = 'rgba(150,100,255,0.3)';
    ctx.lineWidth    = 1;
    const hintW = 110, hintH = hints.length * 22 + 12;
    ctx.beginPath();
    ctx.roundRect(W - hintW - 10, 10, hintW, hintH, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = 'rgba(200,180,255,0.85)';
    ctx.font         = `11px monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < hints.length; i++) {
      ctx.fillText(hints[i], W - hintW - 2, 18 + i * 22);
    }
    ctx.restore();
  }

  return { drawSandboxToolbar, drawSandboxHints };
})();

// =============================================================================
// TOURNAMENT_UI — Turnuva ekranları
// =============================================================================
const TOURNAMENT_UI = (() => {
  /**
   * drawTournamentBracket — Turnuva şemasını çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   * @param {Object} bracket — { rounds: [[{ name, score, winner }]] }
   */
  function drawTournamentBracket(ctx, W, H, bracket) {
    if (!bracket || !bracket.rounds) return;
    ctx.save();
    const rounds    = bracket.rounds;
    const roundW    = W / (rounds.length + 1);
    const matchH    = 50;
    for (let r = 0; r < rounds.length; r++) {
      const matches = rounds[r];
      const matchCount = matches.length;
      const totalH  = matchCount * matchH + (matchCount - 1) * 20;
      const startY  = (H - totalH) * 0.5;
      for (let m = 0; m < matchCount; m++) {
        const match = matches[m];
        const mx    = 60 + r * roundW;
        const my    = startY + m * (matchH + 20);
        ctx.fillStyle   = match.winner ? 'rgba(0,200,100,0.2)' : 'rgba(30,30,50,0.8)';
        ctx.strokeStyle = match.winner ? '#00C864' : 'rgba(100,120,200,0.5)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(mx, my, roundW - 20, matchH, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle    = '#FFFFFF';
        ctx.font         = `bold 11px 'Orbitron', monospace`;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(match.name || 'TBD', mx + 10, my + matchH * 0.5);
        if (match.score !== undefined) {
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'right';
          ctx.fillText(match.score, mx + roundW - 30, my + matchH * 0.5);
        }
      }
    }
    ctx.restore();
  }

  /**
   * drawTournamentResults — Turnuva sonuçlarını çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   * @param {Object} results — { rank, label, medal, rewards }
   */
  function drawTournamentResults(ctx, W, H, results) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,15,0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle    = '#FFD700';
    ctx.font         = `bold 42px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = '#FFD700';
    ctx.shadowBlur   = 24;
    ctx.fillText(results.medal || '🏆', W * 0.5, H * 0.3);
    ctx.shadowBlur   = 0;
    ctx.font         = `bold 26px 'Orbitron', monospace`;
    ctx.fillStyle    = '#FFFFFF';
    ctx.fillText(results.label || '1st Place', W * 0.5, H * 0.46);
    if (results.rewards) {
      ctx.font      = `16px 'Orbitron', monospace`;
      ctx.fillStyle = '#AAFFAA';
      ctx.fillText(`+${results.rewards.coins || 0} coins`, W * 0.5, H * 0.58);
      ctx.fillStyle = '#AAAAFF';
      ctx.fillText(`+${results.rewards.gems  || 0} gems`,  W * 0.5, H * 0.64);
    }
    ctx.restore();
  }

  /**
   * drawTrophyCeremony — Kupa töreni animasyonunu çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} W, H
   * @param {number} rank — 1, 2, 3
   * @param {number} t    — zaman (ms)
   */
  function drawTrophyCeremony(ctx, W, H, rank, t) {
    ctx.save();
    const scale = 1 + Math.sin(t * 0.002) * 0.06;
    const posY  = H * 0.35 + Math.sin(t * 0.003) * 8;
    const colors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
    const emojis = { 1: '🏆', 2: '🥈', 3: '🥉' };
    ctx.font         = `${72 * scale}px sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[rank] || '🎗️', W * 0.5, posY);
    const beamCount = 12;
    for (let i = 0; i < beamCount; i++) {
      const angle = (i / beamCount) * Math.PI * 2 + t * 0.0008;
      const len   = 80 + Math.sin(t * 0.005 + i) * 20;
      ctx.strokeStyle = colors[rank] || '#FFFFFF';
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.25 + Math.sin(t * 0.004 + i) * 0.15;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, posY);
      ctx.lineTo(W * 0.5 + Math.cos(angle) * len, posY + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle   = colors[rank] || '#FFFFFF';
    ctx.font        = `bold 20px 'Orbitron', monospace`;
    ctx.fillText(`RANK #${rank}`, W * 0.5, posY + 70);
    ctx.restore();
  }

  return { drawTournamentBracket, drawTournamentResults, drawTrophyCeremony };
})();

// =============================================================================
// DRIFT_UI — Drift göstergesi arayüzü
// =============================================================================
const DRIFT_UI = (() => {
  /**
   * drawDriftAngle — Drift açısını gösterir.
   */
  function drawDriftAngle(ctx, W, H, angle, score) {
    if (angle < 5) return;
    ctx.save();
    const x = W * 0.5, y = H * 0.78;
    ctx.fillStyle    = `hsl(${Math.max(0, 160 - angle * 1.5)},90%,55%)`;
    ctx.font         = `bold 22px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = ctx.fillStyle;
    ctx.shadowBlur   = 14;
    ctx.fillText(`${Math.round(angle)}°  DRIFT`, x, y);
    ctx.shadowBlur   = 0;
    ctx.restore();
  }

  /**
   * drawDriftCombo — Drift kombo göstergesi.
   */
  function drawDriftCombo(ctx, W, H, combo, t) {
    if (combo <= 1) return;
    ctx.save();
    const pulse = 1 + Math.sin(t * 0.015) * 0.08;
    ctx.font         = `bold ${32 * pulse}px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#FF6B35';
    ctx.shadowColor  = '#FF6B35';
    ctx.shadowBlur   = 22;
    ctx.fillText(`×${combo} COMBO`, W * 0.5, H * 0.68);
    ctx.shadowBlur   = 0;
    ctx.restore();
  }

  return { drawDriftAngle, drawDriftCombo };
})();

// =============================================================================
// FREE_ROAM_UI — Serbest gezinti arayüzü
// =============================================================================
const FREE_ROAM_UI = (() => {
  /**
   * drawExplorationHUD — Keşif durumu çubuğunu çizer.
   */
  function drawExplorationHUD(ctx, W, H, discovered, total) {
    if (total <= 0) return;
    ctx.save();
    const BAR_W = 220, BAR_H = 18, BAR_X = W * 0.5 - BAR_W * 0.5, BAR_Y = 14;
    ctx.fillStyle   = 'rgba(10,10,25,0.75)';
    ctx.strokeStyle = 'rgba(0,200,130,0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(BAR_X - 10, BAR_Y - 6, BAR_W + 20, BAR_H + 30, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, 8);
    ctx.fill();
    const pct = discovered / total;
    const grad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0);
    grad.addColorStop(0,   '#00C864');
    grad.addColorStop(1,   '#00FFAA');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(BAR_X, BAR_Y, BAR_W * pct, BAR_H, 8);
    ctx.fill();
    ctx.fillStyle    = '#FFFFFF';
    ctx.font         = `bold 10px 'Orbitron', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`EXPLORATION  ${discovered}/${total}`, W * 0.5, BAR_Y + BAR_H + 4);
    ctx.restore();
  }

  /**
   * drawHiddenObjectIndicator — Gizli nesneye işaret okunu çizer.
   */
  function drawHiddenObjectIndicator(ctx, vehicle, object, camera) {
    const sx_v  = (vehicle.x  - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
    const sy_v  = (vehicle.y  - camera.y) * camera.scale + ctx.canvas.height * 0.5;
    const sx_o  = (object.x   - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
    const sy_o  = (object.y   - camera.y) * camera.scale + ctx.canvas.height * 0.5;
    const dx = sx_o - sx_v, dy = sy_o - sy_v;
    const dist  = Math.hypot(dx, dy);
    if (dist < 80) return;
    const angle = Math.atan2(dy, dx);
    const arrowR = 60;
    const ax = sx_v + Math.cos(angle) * arrowR;
    const ay = sy_v + Math.sin(angle) * arrowR;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    const pulse = 0.85 + Math.sin(object.pulse * 4) * 0.15;
    ctx.scale(pulse, pulse);
    ctx.fillStyle    = '#FFD700';
    ctx.shadowColor  = '#FFD700';
    ctx.shadowBlur   = 10;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  return { drawExplorationHUD, drawHiddenObjectIndicator };
})();

// =============================================================================
// PHOTO_MODE_UI — Fotoğraf modu arayüzü
// =============================================================================
const PHOTO_MODE_UI = (() => {
  const PHOTO_FILTERS = {
    normal:  { label: 'Normal',   css: 'none'                                   },
    sepia:   { label: 'Sepia',    css: 'sepia(0.8)'                             },
    noir:    { label: 'Noir',     css: 'grayscale(1) contrast(1.3)'             },
    vivid:   { label: 'Vivid',    css: 'saturate(1.8) contrast(1.1)'           },
    vintage: { label: 'Vintage',  css: 'sepia(0.4) saturate(0.8) brightness(1.05)' },
    neon:    { label: 'Neon',     css: 'saturate(2.5) hue-rotate(20deg)'       },
  };

  const PHOTO_FRAMES = {
    plain:          { label: 'Plain',         border: null                     },
    polaroid:       { label: 'Polaroid',      border: '12px solid #FFFEF0',   shadow: '4px 4px 16px rgba(0,0,0,0.4)' },
    racing_stripe:  { label: 'Racing Stripe', border: '6px solid #E50000',    stripe: true },
    gold:           { label: 'Gold',          border: '8px solid #FFD700',    shadow: '0 0 18px rgba(255,215,0,0.6)' },
    neon_border:    { label: 'Neon Border',   border: '4px solid #00FFFF',    glow: '#00FFFF' },
  };

  /**
   * drawPhotoFrame — Fotoğraf çerçevesi seçiciyi çizer.
   */
  function drawPhotoFrame(ctx, W, H, frameKey) {
    const frame = PHOTO_FRAMES[frameKey];
    if (!frame || !frame.border) return;
    ctx.save();
    const borderW = parseInt(frame.border) || 8;
    const color   = frame.border.replace(/\d+px solid /, '');
    ctx.strokeStyle = color;
    ctx.lineWidth   = borderW;
    if (frame.glow) {
      ctx.shadowColor = frame.glow;
      ctx.shadowBlur  = 20;
    }
    ctx.strokeRect(borderW * 0.5, borderW * 0.5, W - borderW, H - borderW);
    if (frame.stripe) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, borderW);
      ctx.fillRect(0, H - borderW, W, borderW);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /**
   * drawPhotoFilter — Filtre önizlemesi için overlay çizer.
   */
  function drawPhotoFilter(ctx, W, H, filterKey) {
    const filter = PHOTO_FILTERS[filterKey];
    if (!filter || filter.css === 'none') return;
    ctx.save();
    if (filterKey === 'sepia' || filterKey === 'vintage') {
      ctx.fillStyle = 'rgba(112,66,20,0.18)';
      ctx.fillRect(0, 0, W, H);
    } else if (filterKey === 'noir') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, W, H);
    } else if (filterKey === 'neon') {
      ctx.fillStyle = 'rgba(0,255,200,0.07)';
      ctx.fillRect(0, 0, W, H);
    } else if (filterKey === 'vivid') {
      ctx.fillStyle = 'rgba(255,100,0,0.06)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /**
   * drawPhotoModeHUD — Fotoğraf modu üst bilgisini çizer.
   */
  function drawPhotoModeHUD(ctx, W, H, activeFilter, activeFrame) {
    ctx.save();
    ctx.fillStyle    = 'rgba(8,8,18,0.78)';
    ctx.strokeStyle  = 'rgba(255,200,0,0.4)';
    ctx.lineWidth    = 1;
    ctx.beginPath();
    ctx.roundRect(10, 10, 180, 56, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = '#FFD700';
    ctx.font         = `bold 13px 'Orbitron', monospace`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('📷 PHOTO MODE', 18, 16);
    ctx.fillStyle    = 'rgba(255,255,255,0.7)';
    ctx.font         = `10px monospace`;
    ctx.fillText(`Filter: ${PHOTO_FILTERS[activeFilter]?.label || activeFilter}`, 18, 34);
    ctx.fillText(`Frame:  ${PHOTO_FRAMES[activeFrame]?.label  || activeFrame}`, 18, 46);
    ctx.restore();
  }

  return { PHOTO_FILTERS, PHOTO_FRAMES, drawPhotoFrame, drawPhotoFilter, drawPhotoModeHUD };
})();

// =============================================================================
// drawKeyboardLayout — Klavye ipuçları ekranı
// =============================================================================
function drawKeyboardLayout(ctx, W, H, mode) {
  const layouts = {
    drive: [
      { key: '←→',   action: 'Accelerate / Brake'  },
      { key: '↑↓',   action: 'Tilt Forward / Back'  },
      { key: 'Space', action: 'Nitro Boost'          },
      { key: 'R',     action: 'Restart'              },
      { key: 'P',     action: 'Pause'                },
      { key: 'M',     action: 'Mute'                 },
    ],
    replay: [
      { key: 'Space', action: 'Play / Pause'         },
      { key: '←→',   action: 'Seek ±5s'             },
      { key: '1/2',   action: 'Speed ×0.5 / ×2'     },
      { key: 'Esc',   action: 'Exit Replay'          },
    ],
    sandbox: [
      { key: 'G',     action: 'Toggle Gravity'       },
      { key: 'T',     action: 'Slow Motion'          },
      { key: 'E',     action: 'Explosion'            },
      { key: 'R',     action: 'Reset Vehicle'        },
      { key: 'N',     action: 'Infinite Nitro'       },
      { key: 'Esc',   action: 'Exit Sandbox'         },
    ],
    photo: [
      { key: 'F',     action: 'Cycle Filter'         },
      { key: 'B',     action: 'Cycle Frame'          },
      { key: 'Enter', action: 'Take Photo'           },
      { key: 'Esc',   action: 'Exit Photo Mode'      },
    ],
  };

  const entries = layouts[mode] || layouts.drive;
  ctx.save();
  const ROWS   = entries.length;
  const ROW_H  = 30;
  const PANEL_W = 260, PANEL_H = ROWS * ROW_H + 28;
  const PANEL_X = W * 0.5 - PANEL_W * 0.5;
  const PANEL_Y = H * 0.5 - PANEL_H * 0.5;
  ctx.fillStyle   = 'rgba(8,8,20,0.92)';
  ctx.strokeStyle = 'rgba(100,140,255,0.5)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 14);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle    = '#8EB4FF';
  ctx.font         = `bold 13px 'Orbitron', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('KEYBOARD CONTROLS', PANEL_X + PANEL_W * 0.5, PANEL_Y + 8);
  for (let i = 0; i < entries.length; i++) {
    const e  = entries[i];
    const ry = PANEL_Y + 30 + i * ROW_H;
    ctx.fillStyle    = 'rgba(100,140,255,0.22)';
    ctx.strokeStyle  = 'rgba(100,140,255,0.5)';
    ctx.lineWidth    = 1;
    ctx.beginPath();
    ctx.roundRect(PANEL_X + 10, ry + 4, 60, 20, 6);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle    = '#FFFFFF';
    ctx.font         = `bold 10px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.key, PANEL_X + 40, ry + 14);
    ctx.fillStyle    = 'rgba(220,220,255,0.85)';
    ctx.font         = `11px sans-serif`;
    ctx.textAlign    = 'left';
    ctx.fillText(e.action, PANEL_X + 82, ry + 14);
  }
  ctx.restore();
}

// ============================================================
// LEADERBOARD_UI MODULE
// ============================================================
const LEADERBOARD_UI = (function() {
  'use strict';

  const COUNTRY_FLAGS = {
    'US':'🇺🇸','GB':'🇬🇧','DE':'🇩🇪','FR':'🇫🇷','ES':'🇪🇸',
    'IT':'🇮🇹','PT':'🇵🇹','BR':'🇧🇷','AR':'🇦🇷','MX':'🇲🇽',
    'CA':'🇨🇦','AU':'🇦🇺','NZ':'🇳🇿','JP':'🇯🇵','KR':'🇰🇷',
    'CN':'🇨🇳','IN':'🇮🇳','RU':'🇷🇺','TR':'🇹🇷','SA':'🇸🇦',
    'AE':'🇦🇪','EG':'🇪🇬','ZA':'🇿🇦','NG':'🇳🇬','KE':'🇰🇪',
    'PL':'🇵🇱','NL':'🇳🇱','BE':'🇧🇪','SE':'🇸🇪','NO':'🇳🇴',
    'DK':'🇩🇰','FI':'🇫🇮','CH':'🇨🇭','AT':'🇦🇹','CZ':'🇨🇿',
    'HU':'🇭🇺','RO':'🇷🇴','GR':'🇬🇷','UA':'🇺🇦','PH':'🇵🇭',
    'ID':'🇮🇩','TH':'🇹🇭','VN':'🇻🇳','MY':'🇲🇾','SG':'🇸🇬',
    'PK':'🇵🇰','BD':'🇧🇩','IR':'🇮🇷','IQ':'🇮🇶','IL':'🇮🇱'
  };

  const SORT_OPTIONS = ['distance','coins','tricks','survival','trophies'];
  const FILTER_TABS  = ['Global','Friends','Country','Weekly','AllTime'];

  let _state = {
    activeFilter : 'Global',
    activeSort   : 'trophies',
    page         : 0,
    loading      : false,
    refreshCooldown : 0,
    entries      : [],
    ownEntry     : null,
    searchQuery  : ''
  };

  function _rankChangeHTML(delta) {
    if (delta > 0)  return `<span class="lb-rank-up">▲${delta}</span>`;
    if (delta < 0)  return `<span class="lb-rank-down">▼${Math.abs(delta)}</span>`;
    return `<span class="lb-rank-same">–</span>`;
  }

  function _avatarHTML(player) {
    const initials = (player.name||'?').slice(0,2).toUpperCase();
    const hue = [...(player.name||'X')].reduce((a,c)=>a+c.charCodeAt(0),0) % 360;
    return `<div class="lb-avatar" style="background:hsl(${hue},60%,45%)">${initials}</div>`;
  }

  function _vehicleIconHTML(vehicle) {
    const icons = {jeep:'🚙',bike:'🏍️',truck:'🚛',atv:'🚐',tank:'🛡️'};
    return `<span class="lb-vehicle-icon" title="${vehicle}">${icons[vehicle]||'🚗'}</span>`;
  }

  function _entryHTML(entry, index, isFriend, isOwn) {
    const flag  = COUNTRY_FLAGS[entry.country] || '🏳️';
    const extra = isOwn ? ' lb-entry--own' : isFriend ? ' lb-entry--friend' : '';
    return `
    <div class="lb-entry${extra}" data-player-id="${entry.id}" data-rank="${entry.rank}"
         style="animation-delay:${index*40}ms">
      <div class="lb-entry-rank">
        <span class="lb-rank-num">${entry.rank}</span>
        ${_rankChangeHTML(entry.rankDelta||0)}
      </div>
      ${_avatarHTML(entry)}
      <div class="lb-entry-info">
        <div class="lb-entry-name">${flag} ${entry.name}</div>
        <div class="lb-entry-sub">${_vehicleIconHTML(entry.vehicle)} ${entry.vehicle||'Unknown'}</div>
      </div>
      <div class="lb-entry-score">
        <div class="lb-score-value">${Number(entry.score||0).toLocaleString()}</div>
        <div class="lb-trophy-count">🏆 ${entry.trophies||0}</div>
      </div>
    </div>`;
  }

  function _ownRankHTML(own) {
    if (!own) return '';
    return `
    <div class="lb-own-rank-sticky">
      <div class="lb-own-rank-label">Your Rank</div>
      ${_entryHTML(own, 0, false, true)}
    </div>`;
  }

  function _filterTabsHTML() {
    return FILTER_TABS.map(tab => `
      <button class="lb-filter-tab${_state.activeFilter===tab?' lb-filter-tab--active':''}"
              data-lb-filter="${tab}">${tab}</button>`).join('');
  }

  function _sortOptionsHTML() {
    return `<select class="lb-sort-select" id="lb-sort-select">
      ${SORT_OPTIONS.map(s=>`<option value="${s}"${_state.activeSort===s?' selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
    </select>`;
  }

  function _searchBarHTML() {
    return `<div class="lb-search-wrap">
      <input type="text" class="lb-search-input" id="lb-search-input"
             placeholder="Search player…" value="${_state.searchQuery}">
      <button class="lb-search-btn" id="lb-search-btn">🔍</button>
    </div>`;
  }

  function _refreshBtnHTML() {
    const disabled = _state.refreshCooldown > 0;
    const label    = disabled ? `${_state.refreshCooldown}s` : '↻ Refresh';
    return `<button class="lb-refresh-btn${disabled?' lb-refresh-btn--disabled':''}"
                    id="lb-refresh-btn" ${disabled?'disabled':''}>${label}</button>`;
  }

  function _categorySelectorHTML() {
    const cats = ['Overall','Map: Highlands','Map: Arctic','Map: Desert',
                  'Vehicle: Jeep','Vehicle: Bike','Vehicle: Truck'];
    return `<select class="lb-category-select" id="lb-category-select">
      ${cats.map(c=>`<option>${c}</option>`).join('')}
    </select>`;
  }

  function _listHTML() {
    if (!_state.entries.length) {
      return `<div class="lb-empty">No entries found. Try a different filter.</div>`;
    }
    return _state.entries
      .filter(e => !_state.searchQuery ||
        e.name.toLowerCase().includes(_state.searchQuery.toLowerCase()))
      .map((e,i) => _entryHTML(e, i, e.isFriend, false))
      .join('');
  }

  function generateHTML() {
    return `
    <div class="leaderboard-screen" id="leaderboard-screen">
      <div class="lb-header">
        <h2 class="lb-title">🏆 Leaderboards</h2>
        <div class="lb-controls-row">
          ${_searchBarHTML()}
          ${_sortOptionsHTML()}
          ${_categorySelectorHTML()}
          ${_refreshBtnHTML()}
        </div>
        <div class="lb-filter-tabs">${_filterTabsHTML()}</div>
      </div>
      <div class="lb-list-wrap" id="lb-list-wrap">
        <div class="lb-list" id="lb-list">
          ${_listHTML()}
        </div>
        <div class="lb-load-more-wrap">
          <button class="lb-load-more-btn" id="lb-load-more-btn">Load More</button>
        </div>
      </div>
      ${_ownRankHTML(_state.ownEntry)}
      <div class="lb-profile-preview" id="lb-profile-preview" style="display:none"></div>
    </div>`;
  }

  function _profilePreviewHTML(player) {
    const flag = COUNTRY_FLAGS[player.country]||'🏳️';
    return `
    <div class="lb-preview-card">
      <button class="lb-preview-close" id="lb-preview-close">✕</button>
      ${_avatarHTML(player)}
      <div class="lb-preview-name">${flag} ${player.name}</div>
      <div class="lb-preview-stats">
        <div class="lb-preview-stat"><span>Trophies</span><strong>${player.trophies||0}</strong></div>
        <div class="lb-preview-stat"><span>Best Distance</span><strong>${player.bestDistance||0}m</strong></div>
        <div class="lb-preview-stat"><span>Coins Earned</span><strong>${Number(player.coins||0).toLocaleString()}</strong></div>
        <div class="lb-preview-stat"><span>Best Tricks</span><strong>${player.bestTricks||0}</strong></div>
        <div class="lb-preview-stat"><span>Rank</span><strong>#${player.rank}</strong></div>
      </div>
      <div class="lb-preview-vehicle">Favourite: ${_vehicleIconHTML(player.vehicle)} ${player.vehicle||'Unknown'}</div>
    </div>`;
  }

  function attachEvents(container) {
    if (!container) container = document;

    container.addEventListener('click', function(e) {
      // Filter tabs
      const filterBtn = e.target.closest('[data-lb-filter]');
      if (filterBtn) {
        _state.activeFilter = filterBtn.dataset.lbFilter;
        _state.page = 0;
        refresh();
        return;
      }
      // Entry profile preview
      const entry = e.target.closest('.lb-entry');
      if (entry && !e.target.closest('.lb-entry--own')) {
        const preview = document.getElementById('lb-profile-preview');
        if (preview) {
          const pid = entry.dataset.playerId;
          const player = _state.entries.find(x=>x.id===pid) || {};
          preview.innerHTML = _profilePreviewHTML(player);
          preview.style.display = 'block';
        }
        return;
      }
      // Close preview
      if (e.target.closest('#lb-preview-close')) {
        const preview = document.getElementById('lb-profile-preview');
        if (preview) preview.style.display = 'none';
        return;
      }
      // Load more
      if (e.target.closest('#lb-load-more-btn')) {
        _loadMore();
        return;
      }
      // Refresh
      if (e.target.closest('#lb-refresh-btn') && !_state.refreshCooldown) {
        _triggerRefresh();
        return;
      }
    });

    container.addEventListener('change', function(e) {
      if (e.target.id === 'lb-sort-select') {
        _state.activeSort = e.target.value;
        _state.page = 0;
        refresh();
      }
    });

    const searchInput = document.getElementById('lb-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        _state.searchQuery = this.value;
        _renderList();
      });
    }

    // Pagination on scroll
    const listWrap = document.getElementById('lb-list-wrap');
    if (listWrap) {
      listWrap.addEventListener('scroll', function() {
        if (this.scrollTop + this.clientHeight >= this.scrollHeight - 40) {
          _loadMore();
        }
      });
    }
  }

  function _renderList() {
    const list = document.getElementById('lb-list');
    if (list) list.innerHTML = _listHTML();
  }

  function _loadMore() {
    if (_state.loading) return;
    _state.loading = true;
    _state.page++;
    // Simulate async load
    setTimeout(function() {
      _state.loading = false;
      _renderList();
    }, 600);
  }

  function _triggerRefresh() {
    _state.refreshCooldown = 30;
    const btn = document.getElementById('lb-refresh-btn');
    if (btn) { btn.disabled = true; btn.textContent = '30s'; }
    const iv = setInterval(function() {
      _state.refreshCooldown--;
      if (btn) btn.textContent = _state.refreshCooldown > 0 ? `${_state.refreshCooldown}s` : '↻ Refresh';
      if (_state.refreshCooldown <= 0) {
        clearInterval(iv);
        if (btn) btn.disabled = false;
      }
    }, 1000);
    refresh();
  }

  function setEntries(entries, ownEntry) {
    _state.entries  = entries || [];
    _state.ownEntry = ownEntry || null;
  }

  function refresh() {
    const screen = document.getElementById('leaderboard-screen');
    if (screen) screen.innerHTML = generateHTML().replace(/^[\s\S]*?<div class="leaderboard-screen[^>]*>/, '').replace(/<\/div>\s*$/, '');
    _renderList();
  }

  return { generateHTML, attachEvents, setEntries, refresh, COUNTRY_FLAGS };
})();


// ============================================================
// SEASON_PASS_UI MODULE
// ============================================================
const SEASON_PASS_UI_EX = (function() {
  'use strict';

  const REWARD_ICONS = {
    coins    : '🪙',
    diamonds : '💎',
    vehicle  : '🚗',
    cosmetic : '🎨',
    xp       : '⭐',
    chest    : '📦',
    emote    : '😎',
    decal    : '🏷️'
  };

  let _state = {
    currentTier   : 4,
    maxTier       : 30,
    isPremium     : false,
    seasonXP      : 1240,
    xpPerTier     : 500,
    daysLeft      : 18,
    hoursLeft     : 6,
    minutesLeft   : 32,
    recentXP      : [],
    bossHP        : 7500,
    bossMaxHP     : 10000,
    timerHandle   : null
  };

  function _tierRewards(tier) {
    const freePool = [
      {type:'coins',   value:500},
      {type:'xp',      value:200},
      {type:'chest',   value:1},
      {type:'coins',   value:1000},
      {type:'decal',   value:1},
      {type:'coins',   value:2000},
      {type:'emote',   value:1},
      {type:'chest',   value:2},
      {type:'coins',   value:5000},
      {type:'vehicle', value:'ATV Mk2'}
    ];
    const premPool = [
      {type:'diamonds', value:10},
      {type:'cosmetic', value:'Paint: Crimson'},
      {type:'diamonds', value:20},
      {type:'chest',    value:3},
      {type:'cosmetic', value:'Decal: Flames'},
      {type:'diamonds', value:50},
      {type:'vehicle',  value:'Monster Truck'},
      {type:'diamonds', value:80},
      {type:'cosmetic', value:'Livery: Carbon'},
      {type:'diamonds', value:200}
    ];
    return {
      free    : freePool[tier % freePool.length],
      premium : premPool[tier % premPool.length]
    };
  }

  function _rewardCardHTML(reward, unlocked) {
    const icon  = REWARD_ICONS[reward.type] || '🎁';
    const label = typeof reward.value === 'number'
      ? `${reward.value.toLocaleString()}`
      : reward.value;
    return `<div class="sp-reward-card${unlocked?'':' sp-reward-card--locked'}">
      <div class="sp-reward-icon">${icon}</div>
      <div class="sp-reward-label">${label}</div>
      ${unlocked ? '' : '<div class="sp-reward-lock">🔒</div>'}
    </div>`;
  }

  function _tierHTML(tier) {
    const rewards   = _tierRewards(tier);
    const isCurrent = tier === _state.currentTier;
    const isPast    = tier < _state.currentTier;
    const cls       = isCurrent ? ' sp-tier--current' : isPast ? ' sp-tier--past' : '';
    return `
    <div class="sp-tier${cls}" data-tier="${tier}">
      <div class="sp-tier-num">${tier+1}</div>
      <div class="sp-tier-track sp-tier-track--free">
        ${_rewardCardHTML(rewards.free, isPast || isCurrent)}
      </div>
      <div class="sp-tier-track sp-tier-track--premium">
        ${_rewardCardHTML(rewards.premium, _state.isPremium && (isPast || isCurrent))}
      </div>
    </div>`;
  }

  function _tiersHTML() {
    let html = '';
    for (let i = 0; i < _state.maxTier; i++) html += _tierHTML(i);
    return html;
  }

  function _xpBarHTML() {
    const xpInTier   = _state.seasonXP % _state.xpPerTier;
    const pct        = Math.min(100, (xpInTier / _state.xpPerTier) * 100).toFixed(1);
    return `
    <div class="sp-xp-section">
      <div class="sp-xp-label">Season XP: ${_state.seasonXP.toLocaleString()}
        <span class="sp-xp-needed">(+${_state.xpPerTier - xpInTier} to next tier)</span></div>
      <div class="sp-xp-bar-track">
        <div class="sp-xp-bar-fill" style="width:${pct}%"></div>
        <div class="sp-xp-bar-text">${pct}%</div>
      </div>
    </div>`;
  }

  function _timerHTML() {
    return `
    <div class="sp-timer" id="sp-timer">
      <span class="sp-timer-label">Season ends in:</span>
      <span class="sp-timer-days" id="sp-days">${_state.daysLeft}</span>d
      <span class="sp-timer-hours" id="sp-hours">${_state.hoursLeft}</span>h
      <span class="sp-timer-mins" id="sp-mins">${String(_state.minutesLeft).padStart(2,'0')}</span>m
    </div>`;
  }

  function _bossCardHTML() {
    const pct = ((_state.bossHP / _state.bossMaxHP) * 100).toFixed(1);
    return `
    <div class="sp-boss-card">
      <div class="sp-boss-title">⚔️ Season Boss</div>
      <div class="sp-boss-name">The Iron Colossus</div>
      <div class="sp-boss-hp-bar-track">
        <div class="sp-boss-hp-fill" style="width:${pct}%"></div>
      </div>
      <div class="sp-boss-hp-text">${_state.bossHP.toLocaleString()} / ${_state.bossMaxHP.toLocaleString()} HP</div>
      <div class="sp-boss-reward-hint">💎 Defeat for exclusive Diamond reward!</div>
    </div>`;
  }

  function _recentXPHTML() {
    if (!_state.recentXP.length) return '';
    return `<div class="sp-recent-xp">
      <div class="sp-recent-xp-title">Recent XP Gains</div>
      ${_state.recentXP.slice(-6).reverse().map(x=>`
        <div class="sp-xp-log-entry">
          <span class="sp-xp-log-icon">${REWARD_ICONS.xp}</span>
          <span class="sp-xp-log-desc">${x.desc}</span>
          <span class="sp-xp-log-val">+${x.xp}</span>
        </div>`).join('')}
    </div>`;
  }

  function _purchaseBtnHTML() {
    if (_state.isPremium) {
      return `<div class="sp-premium-badge">✅ Premium Pass Active</div>`;
    }
    return `<button class="sp-purchase-btn" id="sp-purchase-btn">
      💎 Get Premium Pass — 999 Diamonds
    </button>`;
  }

  function _chapterHTML() {
    const chapters = [
      'Chapter 1: The Muddy Start',
      'Chapter 2: Into the Highlands',
      'Chapter 3: Arctic Crossing',
      'Chapter 4: Desert Storm',
      'Chapter 5: Final Showdown'
    ];
    const active = Math.floor((_state.currentTier / _state.maxTier) * chapters.length);
    return `<div class="sp-story-chapters">
      <div class="sp-story-title">📖 Season Story</div>
      ${chapters.map((ch,i)=>`
        <div class="sp-chapter${i<active?' sp-chapter--done':i===active?' sp-chapter--active':''}">
          ${i<active?'✅':i===active?'▶️':'🔒'} ${ch}
        </div>`).join('')}
    </div>`;
  }

  function _cosmeticsGalleryHTML() {
    const exclusives = [
      {name:'Seasonal Paint',icon:'🎨'},{name:'Boss Decal',icon:'🏷️'},
      {name:'Victory Emote',icon:'🎉'},{name:'Champion Wheel',icon:'⚙️'},
      {name:'Gold Plate',icon:'🥇'},{name:'Neon Underglow',icon:'💡'}
    ];
    return `<div class="sp-cosmetics-gallery">
      <div class="sp-cosmetics-title">🌟 Season Exclusives</div>
      <div class="sp-cosmetics-grid">
        ${exclusives.map(c=>`
          <div class="sp-cosmetic-item">
            <div class="sp-cosmetic-icon">${c.icon}</div>
            <div class="sp-cosmetic-name">${c.name}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function _statsHTML() {
    return `<div class="sp-stats-summary">
      <div class="sp-stats-title">📊 Your Season Stats</div>
      <div class="sp-stats-grid">
        <div class="sp-stat-item"><span>Races Completed</span><strong>47</strong></div>
        <div class="sp-stat-item"><span>Total Distance</span><strong>12,340m</strong></div>
        <div class="sp-stat-item"><span>Coins Earned</span><strong>45,200</strong></div>
        <div class="sp-stat-item"><span>Tricks Landed</span><strong>183</strong></div>
        <div class="sp-stat-item"><span>Challenges Done</span><strong>12/20</strong></div>
        <div class="sp-stat-item"><span>Boss Damage</span><strong>2,500</strong></div>
      </div>
    </div>`;
  }

  function generateHTML() {
    return `
    <div class="season-pass-screen" id="season-pass-screen">
      <div class="sp-header">
        <h2 class="sp-title">🎫 Season Pass</h2>
        ${_timerHTML()}
        ${_purchaseBtnHTML()}
      </div>
      ${_xpBarHTML()}
      <div class="sp-track-labels">
        <div class="sp-track-label-free">Free Track</div>
        <div class="sp-track-label-premium">Premium Track</div>
      </div>
      <div class="sp-tiers-scroll" id="sp-tiers-scroll">
        <div class="sp-tiers-container" id="sp-tiers-container">
          ${_tiersHTML()}
        </div>
      </div>
      <div class="sp-bottom-section">
        ${_bossCardHTML()}
        ${_recentXPHTML()}
        ${_chapterHTML()}
        ${_cosmeticsGalleryHTML()}
        ${_statsHTML()}
      </div>
    </div>`;
  }

  function _startTimer() {
    if (_state.timerHandle) clearInterval(_state.timerHandle);
    _state.timerHandle = setInterval(function() {
      _state.minutesLeft--;
      if (_state.minutesLeft < 0) { _state.minutesLeft = 59; _state.hoursLeft--; }
      if (_state.hoursLeft < 0)   { _state.hoursLeft = 23;  _state.daysLeft--;  }
      if (_state.daysLeft < 0)    { _state.daysLeft = 0; _state.hoursLeft = 0; _state.minutesLeft = 0; clearInterval(_state.timerHandle); }
      const d = document.getElementById('sp-days');
      const h = document.getElementById('sp-hours');
      const m = document.getElementById('sp-mins');
      if (d) d.textContent = _state.daysLeft;
      if (h) h.textContent = _state.hoursLeft;
      if (m) m.textContent = String(_state.minutesLeft).padStart(2,'0');
    }, 60000);
  }

  function attachEvents(container) {
    if (!container) container = document;
    container.addEventListener('click', function(e) {
      if (e.target.closest('#sp-purchase-btn')) {
        if (typeof GAME !== 'undefined' && GAME.spendDiamonds) {
          if (GAME.spendDiamonds(999)) { _state.isPremium = true; _rerenderPurchase(); }
          else { alert('Not enough diamonds!'); }
        } else {
          _state.isPremium = true; _rerenderPurchase();
        }
      }
    });
    _startTimer();
    // Scroll to current tier
    setTimeout(function() {
      const current = document.querySelector('.sp-tier--current');
      if (current) current.scrollIntoView({inline:'center', behavior:'smooth'});
    }, 300);
  }

  function _rerenderPurchase() {
    const btn = document.getElementById('sp-purchase-btn');
    if (btn) btn.outerHTML = _purchaseBtnHTML();
  }

  function addXP(amount, desc) {
    _state.seasonXP += amount;
    _state.recentXP.push({xp: amount, desc: desc || 'Activity'});
    if (_state.recentXP.length > 20) _state.recentXP.shift();
    const newTier = Math.floor(_state.seasonXP / _state.xpPerTier);
    if (newTier > _state.currentTier) _state.currentTier = Math.min(newTier, _state.maxTier - 1);
  }

  function setPremium(val) { _state.isPremium = !!val; }

  return { generateHTML, attachEvents, addXP, setPremium };
})();


// ============================================================
// CUSTOMIZATION_UI MODULE
// ============================================================
const CUSTOMIZATION_UI = (function() {
  'use strict';

  const CATEGORIES = ['paint','livery','decal','bodykit','wheels','accessories'];
  const CATEGORY_LABELS = {
    paint:'🎨 Paint', livery:'🖼️ Livery', decal:'🏷️ Decals',
    bodykit:'🔩 Body Kit', wheels:'⚙️ Wheels', accessories:'💡 Accessories'
  };

  const COLOR_PRESETS = [
    '#FF0000','#FF6600','#FFCC00','#00CC00','#00CCFF',
    '#0033FF','#9900CC','#FF0099','#FFFFFF','#888888',
    '#333333','#000000','#FFD700','#C0C0C0','#CD7F32'
  ];

  const LIVERY_PATTERNS = [
    {id:'solid',     name:'Solid'},    {id:'stripe',    name:'Stripes'},
    {id:'camo',      name:'Camo'},     {id:'flames',    name:'Flames'},
    {id:'carbon',    name:'Carbon'},   {id:'checker',   name:'Checker'},
    {id:'tribal',    name:'Tribal'},   {id:'grunge',    name:'Grunge'},
    {id:'racing',    name:'Racing'},   {id:'gradient',  name:'Gradient'}
  ];

  const DECAL_CATEGORIES = ['Numbers','Logos','Animals','Geometric','Text','Seasonal'];

  const BODY_PARTS = [
    {id:'bumper',  name:'Front Bumper'}, {id:'skirt',   name:'Side Skirt'},
    {id:'hood',    name:'Hood Scoop'},   {id:'roof',    name:'Roof Rack'},
    {id:'rear',    name:'Rear Bar'}
  ];

  const WHEEL_SKINS = [
    {id:'stock',   name:'Stock'},    {id:'sport',   name:'Sport'},
    {id:'offroad', name:'Off-Road'}, {id:'chrome',  name:'Chrome'},
    {id:'gold',    name:'Gold'},     {id:'carbon',  name:'Carbon'},
    {id:'neon',    name:'Neon'},     {id:'classic', name:'Classic'}
  ];

  const ACCESSORIES = [
    {id:'spoiler',  name:'Spoiler',    icon:'🛡️'},
    {id:'exhaust',  name:'Exhaust',    icon:'💨'},
    {id:'underglow',name:'Underglow',  icon:'💡'},
    {id:'antenna',  name:'Antenna',    icon:'📡'},
    {id:'rollcage', name:'Roll Cage',  icon:'🔩'},
    {id:'winch',    name:'Winch',      icon:'🪝'}
  ];

  let _state = {
    activeCategory : 'paint',
    paintColor     : '#FF0000',
    paintGradientA : '#FF0000',
    paintGradientB : '#0000FF',
    useGradient    : false,
    liveryPattern  : 'solid',
    liveryTint     : '#FFFFFF',
    activeDecalCat : 'Numbers',
    bodyParts      : {},
    wheelSkin      : 'sport',
    accessories    : {spoiler:false, exhaust:false, underglow:false, antenna:false, rollcage:false, winch:false},
    savedPresets   : [],
    favorites      : new Set(),
    searchQuery    : '',
    rotating       : false
  };

  function _tabsHTML() {
    return `<div class="cu-tabs">
      ${CATEGORIES.map(c=>`
        <button class="cu-tab${_state.activeCategory===c?' cu-tab--active':''}" data-cu-cat="${c}">
          ${CATEGORY_LABELS[c]}
        </button>`).join('')}
    </div>`;
  }

  function _previewPanelHTML() {
    return `
    <div class="cu-preview-panel" id="cu-preview-panel">
      <div class="cu-vehicle-preview" id="cu-vehicle-preview"
           style="background:${_state.useGradient
             ? `linear-gradient(135deg,${_state.paintGradientA},${_state.paintGradientB})`
             : _state.paintColor}">
        <div class="cu-vehicle-silhouette">🚙</div>
      </div>
      <div class="cu-preview-controls">
        <button class="cu-rotate-btn${_state.rotating?' cu-rotate-btn--active':''}" id="cu-rotate-btn">
          🔄 ${_state.rotating ? 'Stop' : 'Rotate'}
        </button>
        <button class="cu-randomize-btn" id="cu-randomize-btn">🎲 Randomize</button>
        <button class="cu-share-btn" id="cu-share-btn">📤 Share</button>
      </div>
    </div>`;
  }

  function _paintPanelHTML() {
    return `
    <div class="cu-panel cu-paint-panel">
      <div class="cu-panel-section">
        <div class="cu-section-title">Color Presets</div>
        <div class="cu-color-presets">
          ${COLOR_PRESETS.map(c=>`
            <button class="cu-color-preset${_state.paintColor===c&&!_state.useGradient?' cu-color-preset--active':''}"
                    data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
        </div>
      </div>
      <div class="cu-panel-section">
        <div class="cu-section-title">Custom Color</div>
        <input type="color" class="cu-color-picker" id="cu-color-picker" value="${_state.paintColor}">
        <span class="cu-color-hex">${_state.paintColor}</span>
      </div>
      <div class="cu-panel-section">
        <div class="cu-section-title">Gradient Editor</div>
        <label class="cu-toggle-label">
          <input type="checkbox" id="cu-gradient-toggle" ${_state.useGradient?'checked':''}>
          Use Gradient
        </label>
        <div class="cu-gradient-editors${_state.useGradient?'':' cu-hidden'}">
          <label>Start: <input type="color" id="cu-grad-a" value="${_state.paintGradientA}"></label>
          <label>End:   <input type="color" id="cu-grad-b" value="${_state.paintGradientB}"></label>
          <div class="cu-gradient-preview" id="cu-gradient-preview"
               style="background:linear-gradient(90deg,${_state.paintGradientA},${_state.paintGradientB})"></div>
        </div>
      </div>
    </div>`;
  }

  function _liveryPanelHTML() {
    return `
    <div class="cu-panel cu-livery-panel">
      <div class="cu-panel-section">
        <div class="cu-section-title">Pattern</div>
        <div class="cu-livery-grid">
          ${LIVERY_PATTERNS.map(p=>`
            <button class="cu-livery-thumb${_state.liveryPattern===p.id?' cu-livery-thumb--active':''}"
                    data-livery="${p.id}">
              <div class="cu-livery-preview cu-livery-preview--${p.id}"></div>
              <div class="cu-livery-name">${p.name}</div>
            </button>`).join('')}
        </div>
      </div>
      <div class="cu-panel-section">
        <div class="cu-section-title">Tint Color</div>
        <input type="color" class="cu-color-picker" id="cu-livery-tint" value="${_state.liveryTint}">
      </div>
    </div>`;
  }

  function _decalPanelHTML() {
    return `
    <div class="cu-panel cu-decal-panel">
      <div class="cu-decal-cats">
        ${DECAL_CATEGORIES.map(c=>`
          <button class="cu-decal-cat-btn${_state.activeDecalCat===c?' cu-decal-cat-btn--active':''}"
                  data-decal-cat="${c}">${c}</button>`).join('')}
      </div>
      <div class="cu-search-row">
        <input type="text" class="cu-search-input" id="cu-decal-search" placeholder="Search decals…">
      </div>
      <div class="cu-decal-grid" id="cu-decal-grid">
        ${_decalGridHTML()}
      </div>
      <div class="cu-decal-placement-hint">Tap a decal then drag to place on vehicle</div>
    </div>`;
  }

  function _decalGridHTML() {
    const decals = ['#1','#2','#3','#4','#5','#6','#7','#8','#9','#0',
                    'Star','Crown','Skull','Flame','Lightning','Checkered',
                    'Logo A','Logo B','Logo C','Logo D'];
    const q = _state.searchQuery.toLowerCase();
    return decals.filter(d=>!q||d.toLowerCase().includes(q)).map(d=>`
      <button class="cu-decal-item" data-decal="${d}">
        <div class="cu-decal-icon">🏷️</div>
        <div class="cu-decal-name">${d}</div>
      </button>`).join('');
  }

  function _bodykitPanelHTML() {
    return `
    <div class="cu-panel cu-bodykit-panel">
      <div class="cu-section-title">Body Parts</div>
      ${BODY_PARTS.map(p=>`
        <div class="cu-bodypart-slot" data-part="${p.id}">
          <div class="cu-bodypart-name">${p.name}</div>
          <select class="cu-bodypart-select" data-part-select="${p.id}">
            <option value="">Stock</option>
            <option value="sport">Sport</option>
            <option value="offroad">Off-Road</option>
            <option value="race">Race</option>
            <option value="armored">Armored</option>
          </select>
          <div class="cu-bodypart-cost">500 🪙</div>
        </div>`).join('')}
    </div>`;
  }

  function _wheelsPanelHTML() {
    return `
    <div class="cu-panel cu-wheels-panel">
      <div class="cu-section-title">Wheel Skin</div>
      <div class="cu-wheels-grid">
        ${WHEEL_SKINS.map(w=>`
          <button class="cu-wheel-thumb${_state.wheelSkin===w.id?' cu-wheel-thumb--active':''}"
                  data-wheel="${w.id}">
            <div class="cu-wheel-icon">⚙️</div>
            <div class="cu-wheel-name">${w.name}</div>
          </button>`).join('')}
      </div>
    </div>`;
  }

  function _accessoriesPanelHTML() {
    return `
    <div class="cu-panel cu-accessories-panel">
      <div class="cu-section-title">Accessories</div>
      ${ACCESSORIES.map(a=>`
        <div class="cu-accessory-row">
          <span class="cu-acc-icon">${a.icon}</span>
          <span class="cu-acc-name">${a.name}</span>
          <label class="cu-toggle">
            <input type="checkbox" data-accessory="${a.id}" ${_state.accessories[a.id]?'checked':''}>
            <span class="cu-toggle-slider"></span>
          </label>
        </div>`).join('')}
    </div>`;
  }

  function _presetsBarHTML() {
    return `
    <div class="cu-presets-bar">
      <div class="cu-presets-label">Saved Presets</div>
      <div class="cu-presets-list">
        ${_state.savedPresets.slice(0,10).map((p,i)=>`
          <button class="cu-preset-btn" data-preset-idx="${i}" title="${p.name}">${i+1}</button>`).join('')}
        ${_state.savedPresets.length < 10
          ? `<button class="cu-preset-save-btn" id="cu-preset-save">+ Save</button>` : ''}
      </div>
    </div>`;
  }

  function _activePanelHTML() {
    switch (_state.activeCategory) {
      case 'paint':       return _paintPanelHTML();
      case 'livery':      return _liveryPanelHTML();
      case 'decal':       return _decalPanelHTML();
      case 'bodykit':     return _bodykitPanelHTML();
      case 'wheels':      return _wheelsPanelHTML();
      case 'accessories': return _accessoriesPanelHTML();
      default: return '';
    }
  }

  function generateHTML() {
    return `
    <div class="customization-screen" id="customization-screen">
      <div class="cu-header">
        <h2 class="cu-title">🔧 Customize Vehicle</h2>
      </div>
      ${_previewPanelHTML()}
      ${_tabsHTML()}
      <div class="cu-content-panel" id="cu-content-panel">
        ${_activePanelHTML()}
      </div>
      ${_presetsBarHTML()}
    </div>`;
  }

  function _updatePreview() {
    const preview = document.getElementById('cu-vehicle-preview');
    if (!preview) return;
    preview.style.background = _state.useGradient
      ? `linear-gradient(135deg,${_state.paintGradientA},${_state.paintGradientB})`
      : _state.paintColor;
  }

  function _saveCurrentPreset() {
    const name = `Preset ${_state.savedPresets.length + 1}`;
    _state.savedPresets.push({
      name,
      paintColor  : _state.paintColor,
      liveryPattern : _state.liveryPattern,
      wheelSkin   : _state.wheelSkin,
      accessories : Object.assign({}, _state.accessories)
    });
  }

  function _randomize() {
    _state.paintColor = COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];
    _state.liveryPattern = LIVERY_PATTERNS[Math.floor(Math.random() * LIVERY_PATTERNS.length)].id;
    _state.wheelSkin = WHEEL_SKINS[Math.floor(Math.random() * WHEEL_SKINS.length)].id;
    Object.keys(_state.accessories).forEach(k => { _state.accessories[k] = Math.random() > 0.5; });
    _updatePreview();
  }

  function _generateShareCode() {
    const data = {c:_state.paintColor, l:_state.liveryPattern, w:_state.wheelSkin};
    return btoa(JSON.stringify(data));
  }

  function attachEvents(container) {
    if (!container) container = document;

    container.addEventListener('click', function(e) {
      const tab = e.target.closest('[data-cu-cat]');
      if (tab) {
        _state.activeCategory = tab.dataset.cuCat;
        const panel = document.getElementById('cu-content-panel');
        if (panel) panel.innerHTML = _activePanelHTML();
        container.querySelectorAll('.cu-tab').forEach(t=>t.classList.toggle('cu-tab--active', t.dataset.cuCat===_state.activeCategory));
        return;
      }
      const colorBtn = e.target.closest('[data-color]');
      if (colorBtn) {
        _state.paintColor = colorBtn.dataset.color;
        _state.useGradient = false;
        _updatePreview();
        return;
      }
      const liveryBtn = e.target.closest('[data-livery]');
      if (liveryBtn) { _state.liveryPattern = liveryBtn.dataset.livery; return; }

      const wheelBtn = e.target.closest('[data-wheel]');
      if (wheelBtn) { _state.wheelSkin = wheelBtn.dataset.wheel; return; }

      if (e.target.closest('#cu-rotate-btn')) {
        _state.rotating = !_state.rotating;
        const btn = document.getElementById('cu-rotate-btn');
        if (btn) btn.textContent = _state.rotating ? '⏹ Stop' : '🔄 Rotate';
        const sil = document.querySelector('.cu-vehicle-silhouette');
        if (sil) sil.style.animation = _state.rotating ? 'cu-spin 2s linear infinite' : 'none';
        return;
      }
      if (e.target.closest('#cu-randomize-btn')) { _randomize(); return; }
      if (e.target.closest('#cu-share-btn')) {
        const code = _generateShareCode();
        if (navigator.clipboard) navigator.clipboard.writeText(code);
        alert('Share code copied: ' + code);
        return;
      }
      if (e.target.closest('#cu-preset-save')) { _saveCurrentPreset(); return; }

      const presetBtn = e.target.closest('[data-preset-idx]');
      if (presetBtn) {
        const p = _state.savedPresets[parseInt(presetBtn.dataset.presetIdx)];
        if (p) {
          _state.paintColor    = p.paintColor;
          _state.liveryPattern = p.liveryPattern;
          _state.wheelSkin     = p.wheelSkin;
          Object.assign(_state.accessories, p.accessories);
          _updatePreview();
        }
        return;
      }
    });

    container.addEventListener('change', function(e) {
      if (e.target.id === 'cu-color-picker') {
        _state.paintColor = e.target.value;
        _state.useGradient = false;
        _updatePreview();
      }
      if (e.target.id === 'cu-gradient-toggle') {
        _state.useGradient = e.target.checked;
        const editors = container.querySelector('.cu-gradient-editors');
        if (editors) editors.classList.toggle('cu-hidden', !_state.useGradient);
        _updatePreview();
      }
      if (e.target.id === 'cu-grad-a') { _state.paintGradientA = e.target.value; _updatePreview(); }
      if (e.target.id === 'cu-grad-b') { _state.paintGradientB = e.target.value; _updatePreview(); }
      const accToggle = e.target.closest('[data-accessory]');
      if (accToggle) { _state.accessories[accToggle.dataset.accessory] = e.target.checked; }
    });
  }

  return { generateHTML, attachEvents };
})();


// ============================================================
// EVENTS_UI MODULE
// ============================================================
const EVENTS_UI = (function() {
  'use strict';

  const EVENT_TYPES = {
    speedrun    : {icon:'⚡', label:'Speed Run'},
    collection  : {icon:'📦', label:'Collection'},
    survival    : {icon:'💀', label:'Survival'},
    trick       : {icon:'🤸', label:'Trick Attack'},
    tournament  : {icon:'🏆', label:'Tournament'}
  };

  const PARTNER_EVENTS = [
    {name:'Monster Energy Cup', sponsor:'Monster', color:'#00FF00', logo:'🐲'},
    {name:'Red Bull Air Race',  sponsor:'Red Bull', color:'#CC0000', logo:'🐂'}
  ];

  let _state = {
    activeMonth   : new Date().getMonth(),
    activeYear    : new Date().getFullYear(),
    selectedEvent : null,
    events        : [],
    voteChoices   : {},
    notifSettings : {push:true, email:false}
  };

  function _daysInMonth(m, y) { return new Date(y, m+1, 0).getDate(); }
  function _firstDay(m, y)    { return new Date(y, m, 1).getDay(); }

  function _calendarGridHTML() {
    const days     = _daysInMonth(_state.activeMonth, _state.activeYear);
    const first    = _firstDay(_state.activeMonth, _state.activeYear);
    const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    let html = `<div class="ev-calendar-grid">`;
    html += dayNames.map(d=>`<div class="ev-cal-dayname">${d}</div>`).join('');
    for (let i = 0; i < first; i++) html += `<div class="ev-cal-empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const eventsOnDay = _state.events.filter(e => e.day === d);
      const hasDot = eventsOnDay.length > 0;
      const today  = d === new Date().getDate() &&
                     _state.activeMonth === new Date().getMonth() &&
                     _state.activeYear  === new Date().getFullYear();
      html += `<div class="ev-cal-day${today?' ev-cal-day--today':''}${hasDot?' ev-cal-day--has-event':''}"
                    data-cal-day="${d}">
        <span>${d}</span>
        ${hasDot ? `<div class="ev-cal-dot ev-cal-dot--pulse"></div>` : ''}
      </div>`;
    }
    html += '</div>';
    return html;
  }

  function _eventCardHTML(ev, compact) {
    const type = EVENT_TYPES[ev.type] || {icon:'🎮', label:ev.type};
    const active = ev.active ? '<span class="ev-active-dot">●</span> LIVE' : '';
    if (compact) {
      return `<div class="ev-card-compact" data-event-id="${ev.id}">
        ${type.icon} <strong>${ev.name}</strong> ${active}
        <span class="ev-card-time">${ev.timeLeft||'Soon'}</span>
      </div>`;
    }
    return `
    <div class="ev-card" data-event-id="${ev.id}">
      <div class="ev-card-header" style="background:${ev.color||'#1a1a2e'}">
        <span class="ev-card-icon">${type.icon}</span>
        <div class="ev-card-title-wrap">
          <div class="ev-card-title">${ev.name}</div>
          <div class="ev-card-type">${type.label} ${active}</div>
        </div>
        <div class="ev-card-time-badge">${ev.timeLeft||'Upcoming'}</div>
      </div>
      <div class="ev-card-body">
        <div class="ev-card-rewards">
          ${(ev.rewards||[]).map(r=>`<span class="ev-reward-badge">${r}</span>`).join('')}
        </div>
        <div class="ev-card-requirements">${ev.requirements||'No requirements'}</div>
        <div class="ev-card-actions">
          <button class="ev-card-play-btn" data-ev-play="${ev.id}">▶ Enter</button>
          <button class="ev-card-detail-btn" data-ev-detail="${ev.id}">Info</button>
          <button class="ev-card-share-btn" data-ev-share="${ev.id}">📤</button>
        </div>
      </div>
    </div>`;
  }

  function _eventDetailModalHTML(ev) {
    const type = EVENT_TYPES[ev.type] || {icon:'🎮', label:ev.type};
    return `
    <div class="ev-modal-overlay" id="ev-modal-overlay">
      <div class="ev-modal" id="ev-modal">
        <button class="ev-modal-close" id="ev-modal-close">✕</button>
        <div class="ev-modal-header" style="background:${ev.color||'#1a1a2e'}">
          <span class="ev-modal-icon">${type.icon}</span>
          <div class="ev-modal-title">${ev.name}</div>
          <div class="ev-modal-type">${type.label}</div>
        </div>
        <div class="ev-modal-body">
          <div class="ev-modal-section">
            <div class="ev-modal-section-title">Rules</div>
            <div class="ev-modal-rules">${ev.rules||'Standard event rules apply.'}</div>
          </div>
          <div class="ev-modal-section">
            <div class="ev-modal-section-title">Reward Tiers</div>
            <div class="ev-reward-tiers">
              ${(ev.rewardTiers||[
                {rank:'🥇 1st',  reward:'500 💎'},
                {rank:'🥈 2nd',  reward:'200 💎'},
                {rank:'🥉 3rd',  reward:'100 💎'},
                {rank:'Top 10', reward:'50 💎'},
                {rank:'Top 100',reward:'10 💎'}
              ]).map(t=>`
                <div class="ev-reward-tier-row">
                  <span class="ev-tier-rank">${t.rank}</span>
                  <span class="ev-tier-reward">${t.reward}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="ev-modal-section">
            <div class="ev-modal-section-title">Leaderboard Preview</div>
            <div class="ev-modal-lb-preview">
              ${(ev.topPlayers||[
                {rank:1, name:'SpeedKing99',  score:'4,250m'},
                {rank:2, name:'TurboJane',    score:'4,100m'},
                {rank:3, name:'DirtDemon',    score:'3,980m'}
              ]).map(p=>`
                <div class="ev-lb-row">
                  <span class="ev-lb-rank">#${p.rank}</span>
                  <span class="ev-lb-name">${p.name}</span>
                  <span class="ev-lb-score">${p.score}</span>
                </div>`).join('')}
            </div>
          </div>
          <button class="ev-modal-play-btn" data-ev-play="${ev.id}">▶ Enter Event</button>
        </div>
      </div>
    </div>`;
  }

  function _timelineHTML() {
    const upcoming = _state.events.filter(e=>!e.active).slice(0,5);
    if (!upcoming.length) return '';
    return `<div class="ev-timeline">
      <div class="ev-timeline-title">⏭ Upcoming Events</div>
      ${upcoming.map(e=>`
        <div class="ev-timeline-item">
          <div class="ev-timeline-dot"></div>
          <div class="ev-timeline-content">
            ${_eventCardHTML(e, true)}
          </div>
        </div>`).join('')}
    </div>`;
  }

  function _holidayBannersHTML() {
    const banners = [
      {name:'Halloween Haul',color:'#FF6600',icon:'🎃'},
      {name:'Winter Wonderland',color:'#00CCFF',icon:'❄️'},
      {name:'Summer Sizzle',color:'#FF9900',icon:'☀️'}
    ];
    return `<div class="ev-holiday-banners">
      ${banners.map(b=>`
        <div class="ev-holiday-banner" style="border-color:${b.color}">
          <span class="ev-holiday-icon">${b.icon}</span>
          <span class="ev-holiday-name">${b.name}</span>
        </div>`).join('')}
    </div>`;
  }

  function _communityVoteHTML() {
    const choices = ['Mountain Pass','Arctic Tundra','City Chaos','Swamp Run'];
    return `<div class="ev-community-vote">
      <div class="ev-vote-title">🗳 Community Vote: Next Event Map</div>
      <div class="ev-vote-options">
        ${choices.map(c=>`
          <button class="ev-vote-btn${_state.voteChoices.map===c?' ev-vote-btn--selected':''}"
                  data-vote-map="${c}">${c}</button>`).join('')}
      </div>
      <div class="ev-vote-result-hint">Results shown in 24h</div>
    </div>`;
  }

  function _partnerEventsHTML() {
    return `<div class="ev-partner-section">
      <div class="ev-partner-title">🤝 Partner Events</div>
      ${PARTNER_EVENTS.map(p=>`
        <div class="ev-partner-card" style="border-color:${p.color}">
          <span class="ev-partner-logo">${p.logo}</span>
          <div class="ev-partner-info">
            <div class="ev-partner-name">${p.name}</div>
            <div class="ev-partner-sponsor">Sponsored by ${p.sponsor}</div>
          </div>
          <button class="ev-partner-enter-btn" data-partner="${p.sponsor}">Enter</button>
        </div>`).join('')}
    </div>`;
  }

  function _pastEventsHTML() {
    return `<div class="ev-past-section">
      <div class="ev-past-title">📁 Past Events — Your Results</div>
      <div class="ev-past-list">
        ${[
          {name:'Spring Sprint',    rank:'#42',  reward:'50 💎'},
          {name:'Mud Madness',      rank:'#118', reward:'10 💎'},
          {name:'Night Ride Cup',   rank:'#7',   reward:'200 💎'}
        ].map(p=>`
          <div class="ev-past-row">
            <span class="ev-past-name">${p.name}</span>
            <span class="ev-past-rank">${p.rank}</span>
            <span class="ev-past-reward">${p.reward}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function _notifSettingsHTML() {
    return `<div class="ev-notif-settings">
      <div class="ev-notif-title">🔔 Event Notifications</div>
      <label class="ev-notif-label">
        <input type="checkbox" id="ev-notif-push" ${_state.notifSettings.push?'checked':''}> Push
      </label>
      <label class="ev-notif-label">
        <input type="checkbox" id="ev-notif-email" ${_state.notifSettings.email?'checked':''}> Email
      </label>
    </div>`;
  }

  function generateHTML() {
    const liveEvents = _state.events.filter(e=>e.active);
    const allEvents  = _state.events;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `
    <div class="events-screen" id="events-screen">
      <div class="ev-header">
        <h2 class="ev-title">🎮 Events</h2>
        <div class="ev-month-nav">
          <button class="ev-month-btn" id="ev-month-prev">‹</button>
          <span class="ev-month-label">${monthNames[_state.activeMonth]} ${_state.activeYear}</span>
          <button class="ev-month-btn" id="ev-month-next">›</button>
        </div>
      </div>
      ${_calendarGridHTML()}
      ${_holidayBannersHTML()}
      <div class="ev-live-section">
        <div class="ev-live-title">🔴 Live Now</div>
        ${liveEvents.length
          ? liveEvents.map(e=>_eventCardHTML(e,false)).join('')
          : '<div class="ev-no-live">No live events right now</div>'}
      </div>
      <div class="ev-all-section">
        <div class="ev-all-title">All Events</div>
        ${allEvents.map(e=>_eventCardHTML(e,false)).join('')}
      </div>
      ${_timelineHTML()}
      ${_communityVoteHTML()}
      ${_partnerEventsHTML()}
      ${_pastEventsHTML()}
      ${_notifSettingsHTML()}
    </div>`;
  }

  function attachEvents(container) {
    if (!container) container = document;

    container.addEventListener('click', function(e) {
      if (e.target.closest('#ev-month-prev')) {
        _state.activeMonth--;
        if (_state.activeMonth < 0) { _state.activeMonth = 11; _state.activeYear--; }
        _rerenderCalendar(); return;
      }
      if (e.target.closest('#ev-month-next')) {
        _state.activeMonth++;
        if (_state.activeMonth > 11) { _state.activeMonth = 0; _state.activeYear++; }
        _rerenderCalendar(); return;
      }
      const detailBtn = e.target.closest('[data-ev-detail]');
      if (detailBtn) {
        const ev = _state.events.find(x=>x.id===detailBtn.dataset.evDetail) || {id:'?',name:'Event'};
        document.body.insertAdjacentHTML('beforeend', _eventDetailModalHTML(ev));
        return;
      }
      if (e.target.closest('#ev-modal-close') || e.target.closest('#ev-modal-overlay') === e.target) {
        const modal = document.getElementById('ev-modal-overlay');
        if (modal) modal.remove();
        return;
      }
      const voteBtn = e.target.closest('[data-vote-map]');
      if (voteBtn) { _state.voteChoices.map = voteBtn.dataset.voteMap; return; }
      const shareBtn = e.target.closest('[data-ev-share]');
      if (shareBtn) {
        const msg = `Check out this event in AHMET! ID: ${shareBtn.dataset.evShare}`;
        if (navigator.clipboard) navigator.clipboard.writeText(msg);
        alert('Copied: ' + msg);
        return;
      }
    });

    container.addEventListener('change', function(e) {
      if (e.target.id === 'ev-notif-push')  _state.notifSettings.push  = e.target.checked;
      if (e.target.id === 'ev-notif-email') _state.notifSettings.email = e.target.checked;
    });
  }

  function _rerenderCalendar() {
    const grid = document.querySelector('.ev-calendar-grid');
    if (grid) grid.outerHTML = _calendarGridHTML();
    const label = document.querySelector('.ev-month-label');
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (label) label.textContent = `${monthNames[_state.activeMonth]} ${_state.activeYear}`;
  }

  function setEvents(events) { _state.events = events || []; }

  return { generateHTML, attachEvents, setEvents };
})();


// ============================================================
// DAILY_QUESTS_UI MODULE
// ============================================================
const DAILY_QUESTS_UI = (function() {
  'use strict';

  const QUEST_CATEGORIES = {
    speed    : {icon:'⚡', color:'#FFD700'},
    coins    : {icon:'🪙', color:'#FFA500'},
    tricks   : {icon:'🤸', color:'#FF69B4'},
    distance : {icon:'📏', color:'#00BFFF'},
    vehicle  : {icon:'🚙', color:'#7CFC00'}
  };

  const SAMPLE_QUESTS = [
    {id:'q1', type:'speed',    title:'Speed Demon',       desc:'Reach 120 km/h in any race',         target:1,   progress:0,  reward:'500 🪙',  daily:true},
    {id:'q2', type:'distance', title:'Long Haul',         desc:'Travel 2000m in a single run',        target:2000,progress:750,'reward':'1 💎',   daily:true},
    {id:'q3', type:'tricks',   title:'Trick Master',      desc:'Land 5 backflips',                    target:5,   progress:3,  reward:'200 🪙',  daily:true},
    {id:'q4', type:'coins',    title:'Coin Collector',    desc:'Collect 500 coins this week',         target:500, progress:210, reward:'3 💎',   daily:false},
    {id:'q5', type:'vehicle',  title:'Jeep Jockey',       desc:'Complete 3 runs with the Jeep',       target:3,   progress:1,  reward:'800 🪙',  daily:true, premium:true},
    {id:'q6', type:'speed',    title:'Nitro Junkie',      desc:'Use nitro 10 times',                  target:10,  progress:4,  reward:'2 💎',   daily:true, premium:true},
    {id:'q7', type:'tricks',   title:'Combo King',        desc:'Perform a 3-move trick combo',        target:1,   progress:0,  reward:'5 💎',   daily:true, premium:true}
  ];

  let _state = {
    quests        : JSON.parse(JSON.stringify(SAMPLE_QUESTS)),
    streak        : 7,
    isPremium     : false,
    resetHours    : 14,
    resetMinutes  : 23,
    timerHandle   : null,
    notifBadge    : 0
  };

  function _pct(q) { return Math.min(100, (q.progress / q.target) * 100); }
  function _done(q) { return q.progress >= q.target; }

  function _questCardHTML(q) {
    const cat   = QUEST_CATEGORIES[q.type] || {icon:'🎯', color:'#888'};
    const pct   = _pct(q);
    const done  = _done(q);
    const prem  = q.premium && !_state.isPremium;
    return `
    <div class="dq-card${done?' dq-card--done':''}${prem?' dq-card--locked':''}" data-quest-id="${q.id}">
      <div class="dq-card-icon" style="color:${cat.color}">${cat.icon}</div>
      <div class="dq-card-body">
        <div class="dq-card-title">${q.title} ${prem?'🔒':''}</div>
        <div class="dq-card-desc">${q.desc}</div>
        ${prem ? `<div class="dq-card-premium-hint">Premium quest — upgrade to unlock</div>` : `
        <div class="dq-progress-bar-track">
          <div class="dq-progress-bar-fill" style="width:${pct}%;background:${cat.color}"></div>
        </div>
        <div class="dq-progress-text">${q.progress} / ${q.target}</div>`}
      </div>
      <div class="dq-card-right">
        <div class="dq-reward">${q.reward}</div>
        ${done && !prem
          ? `<button class="dq-claim-btn" data-dq-claim="${q.id}">Claim!</button>`
          : done ? '<div class="dq-claimed-badge">✅</div>' : ''}
      </div>
    </div>`;
  }

  function _streakHTML() {
    return `
    <div class="dq-streak">
      <span class="dq-streak-icon">🔥</span>
      <span class="dq-streak-count">${_state.streak}</span>
      <span class="dq-streak-label">Day Streak</span>
    </div>`;
  }

  function _timerHTML() {
    return `
    <div class="dq-timer" id="dq-timer">
      <span class="dq-timer-label">Resets in:</span>
      <span id="dq-reset-h">${String(_state.resetHours).padStart(2,'0')}</span>:
      <span id="dq-reset-m">${String(_state.resetMinutes).padStart(2,'0')}</span>
    </div>`;
  }

  function _badgeHTML() {
    const incomplete = _state.quests.filter(q=>!_done(q)&&(!q.premium||_state.isPremium)).length;
    if (!incomplete) return '';
    return `<span class="dq-home-badge" id="dq-home-badge">${incomplete}</span>`;
  }

  function _weeklyQuestHTML() {
    const wq = _state.quests.find(q=>!q.daily);
    if (!wq) return '';
    return `
    <div class="dq-weekly-section">
      <div class="dq-section-title">📅 Weekly Quest</div>
      ${_questCardHTML(wq)}
    </div>`;
  }

  function _premiumUpsellHTML() {
    if (_state.isPremium) return `<div class="dq-premium-active">✅ Premium Quests Unlocked</div>`;
    return `<div class="dq-premium-upsell">
      <div class="dq-upsell-text">🌟 Unlock 3 harder premium quests for extra rewards</div>
      <button class="dq-upsell-btn" id="dq-premium-unlock">Unlock — 499 🪙</button>
    </div>`;
  }

  function generateHTML() {
    const daily   = _state.quests.filter(q=>q.daily && !q.premium);
    const premium = _state.quests.filter(q=>q.daily &&  q.premium);
    return `
    <div class="daily-quests-screen" id="daily-quests-screen">
      <div class="dq-header">
        <h2 class="dq-title">📋 Daily Quests ${_badgeHTML()}</h2>
        <div class="dq-header-right">
          ${_streakHTML()}
          ${_timerHTML()}
        </div>
      </div>
      <div class="dq-daily-section">
        <div class="dq-section-title">Daily Quests</div>
        ${daily.map(q=>_questCardHTML(q)).join('')}
      </div>
      ${_weeklyQuestHTML()}
      <div class="dq-premium-section">
        <div class="dq-section-title">Premium Quests</div>
        ${_premiumUpsellHTML()}
        ${premium.map(q=>_questCardHTML(q)).join('')}
      </div>
    </div>`;
  }

  function _claimReward(questId) {
    const q = _state.quests.find(x=>x.id===questId);
    if (!q || !_done(q)) return;
    // Mark claimed and show celebration
    const card = document.querySelector(`[data-quest-id="${questId}"]`);
    if (card) {
      card.classList.add('dq-card--claimed');
      card.querySelector('.dq-claim-btn') && (card.querySelector('.dq-claim-btn').outerHTML = '<div class="dq-claimed-badge">✅</div>');
      _animateCelebration(card);
    }
  }

  function _animateCelebration(card) {
    const burst = document.createElement('div');
    burst.className = 'dq-celebrate-burst';
    burst.textContent = '🎉';
    card.appendChild(burst);
    setTimeout(()=>burst.remove(), 1200);
  }

  function _startTimer() {
    if (_state.timerHandle) clearInterval(_state.timerHandle);
    _state.timerHandle = setInterval(function() {
      _state.resetMinutes--;
      if (_state.resetMinutes < 0) {
        _state.resetMinutes = 59;
        _state.resetHours--;
        if (_state.resetHours < 0) { _state.resetHours = 23; _resetQuests(); }
      }
      const h = document.getElementById('dq-reset-h');
      const m = document.getElementById('dq-reset-m');
      if (h) h.textContent = String(_state.resetHours).padStart(2,'0');
      if (m) m.textContent = String(_state.resetMinutes).padStart(2,'0');
    }, 60000);
  }

  function _resetQuests() {
    _state.streak++;
    _state.quests.forEach(q => { if (q.daily) q.progress = 0; });
    const screen = document.getElementById('daily-quests-screen');
    if (screen) screen.outerHTML = generateHTML();
    _startTimer();
  }

  function updateProgress(questId, amount) {
    const q = _state.quests.find(x=>x.id===questId);
    if (!q) return;
    q.progress = Math.min(q.target, q.progress + amount);
    const card = document.querySelector(`[data-quest-id="${questId}"]`);
    if (card) {
      const fill = card.querySelector('.dq-progress-bar-fill');
      const text = card.querySelector('.dq-progress-text');
      if (fill) fill.style.width = _pct(q) + '%';
      if (text) text.textContent = `${q.progress} / ${q.target}`;
      if (_done(q) && !card.querySelector('.dq-claim-btn')) {
        const right = card.querySelector('.dq-card-right');
        if (right) right.insertAdjacentHTML('beforeend', `<button class="dq-claim-btn" data-dq-claim="${questId}">Claim!</button>`);
      }
    }
    // Update home badge
    const badge = document.getElementById('dq-home-badge');
    const incomplete = _state.quests.filter(q=>!_done(q)&&(!q.premium||_state.isPremium)).length;
    if (badge) badge.textContent = incomplete;
  }

  function attachEvents(container) {
    if (!container) container = document;
    container.addEventListener('click', function(e) {
      const claimBtn = e.target.closest('[data-dq-claim]');
      if (claimBtn) { _claimReward(claimBtn.dataset.dqClaim); return; }
      if (e.target.closest('#dq-premium-unlock')) {
        _state.isPremium = true;
        const upsell = document.querySelector('.dq-premium-upsell');
        if (upsell) upsell.outerHTML = `<div class="dq-premium-active">✅ Premium Quests Unlocked</div>`;
        document.querySelectorAll('.dq-card--locked').forEach(c=>{
          const id = c.dataset.questId;
          const q  = _state.quests.find(x=>x.id===id);
          if (q) c.outerHTML = _questCardHTML(q);
        });
        return;
      }
    });
    _startTimer();
  }

  return { generateHTML, attachEvents, updateProgress };
})();


// ============================================================
// SETTINGS_EXTENDED_UI MODULE
// ============================================================
const SETTINGS_EXTENDED_UI = (function() {
  'use strict';

  const LANGUAGES = [
    {code:'en', native:'English'},    {code:'de', native:'Deutsch'},
    {code:'fr', native:'Français'},   {code:'es', native:'Español'},
    {code:'pt', native:'Português'},  {code:'it', native:'Italiano'},
    {code:'ru', native:'Русский'},    {code:'tr', native:'Türkçe'},
    {code:'ar', native:'العربية'},    {code:'zh', native:'中文'},
    {code:'ja', native:'日本語'},     {code:'ko', native:'한국어'},
    {code:'pl', native:'Polski'},     {code:'nl', native:'Nederlands'},
    {code:'sv', native:'Svenska'},    {code:'da', native:'Dansk'},
    {code:'fi', native:'Suomi'},      {code:'no', native:'Norsk'},
    {code:'th', native:'ไทย'},        {code:'id', native:'Indonesia'}
  ];

  const REGIONS = ['Global','North America','Europe','Asia','South America','Africa','Middle East','Oceania'];

  const QUALITY_PRESETS = ['Low','Medium','High','Ultra'];

  let _state = {
    activeSection    : 'graphics',
    graphics: {
      quality        : 'High',
      particles      : true,
      shadows        : true,
      weather        : true,
      bloom          : true,
      motionBlur     : false,
      screenShake    : true
    },
    audio: {
      master : 80,
      music  : 70,
      sfx    : 90,
      voice  : 60
    },
    controls: {
      layout      : 'default',
      sensitivity : 5
    },
    language   : 'en',
    region     : 'Global',
    privacy: {
      profileVisibility : 'friends',
      scoreVisibility   : 'global'
    },
    notifications: {
      push_events    : true,
      push_friends   : true,
      push_store     : false,
      email_events   : false,
      email_news     : true
    },
    accessibility: {
      colorblind    : false,
      largeUI       : false,
      reducedMotion : false
    },
    sections: ['graphics','audio','controls','language','privacy','notifications','data','accessibility','account']
  };

  function _navHTML() {
    const labels = {
      graphics:'🎮 Graphics', audio:'🔊 Audio', controls:'🕹 Controls',
      language:'🌐 Language', privacy:'🔒 Privacy', notifications:'🔔 Notifications',
      data:'💾 Data', accessibility:'♿ Accessibility', account:'👤 Account'
    };
    return `<div class="se-nav">
      ${_state.sections.map(s=>`
        <button class="se-nav-btn${_state.activeSection===s?' se-nav-btn--active':''}" data-se-section="${s}">
          ${labels[s]||s}
        </button>`).join('')}
    </div>`;
  }

  function _qualityPresetBtnsHTML() {
    return QUALITY_PRESETS.map(p=>`
      <button class="se-quality-btn${_state.graphics.quality===p?' se-quality-btn--active':''}"
              data-quality="${p}">${p}</button>`).join('');
  }

  function _toggleHTML(key, label, section) {
    const val = _state[section][key];
    return `<div class="se-toggle-row">
      <span class="se-toggle-label">${label}</span>
      <label class="se-toggle">
        <input type="checkbox" data-se-toggle="${section}.${key}" ${val?'checked':''}>
        <span class="se-toggle-slider"></span>
      </label>
    </div>`;
  }

  function _sliderHTML(key, label, section, min, max) {
    const val = _state[section][key];
    return `<div class="se-slider-row">
      <span class="se-slider-label">${label}</span>
      <input type="range" class="se-slider" min="${min}" max="${max}" value="${val}"
             data-se-slider="${section}.${key}">
      <span class="se-slider-val" id="se-slider-val-${section}-${key}">${val}</span>
    </div>`;
  }

  function _graphicsSectionHTML() {
    return `<div class="se-section se-graphics-section">
      <div class="se-section-title">Quality Preset</div>
      <div class="se-quality-btns">${_qualityPresetBtnsHTML()}</div>
      <div class="se-section-title">Individual Settings</div>
      ${_toggleHTML('particles',  '✨ Particles',     'graphics')}
      ${_toggleHTML('shadows',    '🌑 Shadows',       'graphics')}
      ${_toggleHTML('weather',    '🌦 Weather',       'graphics')}
      ${_toggleHTML('bloom',      '💡 Bloom',         'graphics')}
      ${_toggleHTML('motionBlur', '💨 Motion Blur',   'graphics')}
      ${_toggleHTML('screenShake','📳 Screen Shake',  'graphics')}
    </div>`;
  }

  function _audioSectionHTML() {
    return `<div class="se-section se-audio-section">
      ${_sliderHTML('master', '🔊 Master',  'audio', 0, 100)}
      ${_sliderHTML('music',  '🎵 Music',   'audio', 0, 100)}
      ${_sliderHTML('sfx',    '💥 SFX',     'audio', 0, 100)}
      ${_sliderHTML('voice',  '🗣 Voice',   'audio', 0, 100)}
    </div>`;
  }

  function _controlsSectionHTML() {
    return `<div class="se-section se-controls-section">
      <div class="se-section-title">Button Layout</div>
      <div class="se-layout-options">
        ${['default','left-handed','minimal','custom'].map(l=>`
          <button class="se-layout-btn${_state.controls.layout===l?' se-layout-btn--active':''}"
                  data-layout="${l}">${l.charAt(0).toUpperCase()+l.slice(1)}</button>`).join('')}
      </div>
      <div class="se-section-title">Tilt Sensitivity</div>
      ${_sliderHTML('sensitivity', '🎮 Sensitivity', 'controls', 1, 10)}
    </div>`;
  }

  function _languageSectionHTML() {
    return `<div class="se-section se-language-section">
      <div class="se-section-title">Language</div>
      <div class="se-lang-grid">
        ${LANGUAGES.map(l=>`
          <button class="se-lang-btn${_state.language===l.code?' se-lang-btn--active':''}"
                  data-lang="${l.code}">${l.native}</button>`).join('')}
      </div>
      <div class="se-section-title">Leaderboard Region</div>
      <select class="se-region-select" id="se-region-select">
        ${REGIONS.map(r=>`<option${_state.region===r?' selected':''}>${r}</option>`).join('')}
      </select>
    </div>`;
  }

  function _privacySectionHTML() {
    return `<div class="se-section se-privacy-section">
      <div class="se-section-title">Profile Visibility</div>
      <select class="se-select" data-se-select="privacy.profileVisibility">
        <option value="global"  ${_state.privacy.profileVisibility==='global'  ?'selected':''}>Everyone</option>
        <option value="friends" ${_state.privacy.profileVisibility==='friends' ?'selected':''}>Friends Only</option>
        <option value="private" ${_state.privacy.profileVisibility==='private' ?'selected':''}>Private</option>
      </select>
      <div class="se-section-title">Score Visibility</div>
      <select class="se-select" data-se-select="privacy.scoreVisibility">
        <option value="global"  ${_state.privacy.scoreVisibility==='global'  ?'selected':''}>Global</option>
        <option value="friends" ${_state.privacy.scoreVisibility==='friends' ?'selected':''}>Friends Only</option>
        <option value="private" ${_state.privacy.scoreVisibility==='private' ?'selected':''}>Private</option>
      </select>
    </div>`;
  }

  function _notificationsSectionHTML() {
    const rows = [
      ['push_events',  '📲 Event Alerts (Push)'],
      ['push_friends', '👥 Friend Activity (Push)'],
      ['push_store',   '🛒 Store Deals (Push)'],
      ['email_events', '📧 Event Emails'],
      ['email_news',   '📰 News Emails']
    ];
    return `<div class="se-section se-notifications-section">
      ${rows.map(([k,l])=>_toggleHTML(k, l, 'notifications')).join('')}
    </div>`;
  }

  function _dataSectionHTML() {
    return `<div class="se-section se-data-section">
      <div class="se-data-row">
        <span>Cache Size</span>
        <span>24 MB</span>
        <button class="se-data-btn" id="se-clear-cache">Clear</button>
      </div>
      <div class="se-data-row">
        <span>Export Save</span>
        <button class="se-data-btn" id="se-export-save">📤 Export</button>
      </div>
      <div class="se-data-row">
        <span>Import Save</span>
        <button class="se-data-btn" id="se-import-save">📥 Import</button>
        <input type="file" id="se-import-file" style="display:none" accept=".json">
      </div>
      <div class="se-data-row">
        <span>Credits &amp; Changelog</span>
        <button class="se-data-btn" id="se-credits-btn">View</button>
      </div>
    </div>`;
  }

  function _accessibilitySectionHTML() {
    return `<div class="se-section se-accessibility-section">
      ${_toggleHTML('colorblind',    '👁 Colorblind Mode',    'accessibility')}
      ${_toggleHTML('largeUI',       '🔍 Large UI Mode',      'accessibility')}
      ${_toggleHTML('reducedMotion', '🧘 Reduced Motion',     'accessibility')}
    </div>`;
  }

  function _accountSectionHTML() {
    return `<div class="se-section se-account-section">
      <div class="se-section-title">Linked Accounts</div>
      <button class="se-account-link-btn" data-provider="google">
        🔗 Link Google Account
      </button>
      <button class="se-account-link-btn" data-provider="apple">
        🔗 Link Apple ID
      </button>
      <button class="se-account-link-btn" data-provider="facebook">
        🔗 Link Facebook
      </button>
      <div class="se-section-title">Danger Zone</div>
      <button class="se-danger-btn" id="se-logout-btn">🚪 Log Out</button>
      <button class="se-danger-btn se-danger-btn--red" id="se-delete-btn">⚠️ Delete Account</button>
    </div>`;
  }

  function _creditsModalHTML() {
    return `<div class="se-modal-overlay" id="se-credits-modal">
      <div class="se-modal">
        <button class="se-modal-close" id="se-credits-close">✕</button>
        <h3>AHMET Clone — Credits</h3>
        <div class="se-credits-body">
          <p>Game Engine: Custom Canvas 2D</p>
          <p>Physics: Rapier-inspired custom solver</p>
          <p>UI: Vanilla JS modules</p>
          <p>Fonts: Orbitron (Google Fonts)</p>
          <p>Version: 1.0.0-alpha</p>
          <p>Changelog: Initial release</p>
        </div>
      </div>
    </div>`;
  }

  function _activeSectionHTML() {
    switch (_state.activeSection) {
      case 'graphics':      return _graphicsSectionHTML();
      case 'audio':         return _audioSectionHTML();
      case 'controls':      return _controlsSectionHTML();
      case 'language':      return _languageSectionHTML();
      case 'privacy':       return _privacySectionHTML();
      case 'notifications': return _notificationsSectionHTML();
      case 'data':          return _dataSectionHTML();
      case 'accessibility': return _accessibilitySectionHTML();
      case 'account':       return _accountSectionHTML();
      default: return '';
    }
  }

  function generateHTML() {
    return `
    <div class="settings-extended-screen" id="settings-extended-screen">
      <div class="se-header">
        <h2 class="se-title">⚙️ Settings</h2>
      </div>
      <div class="se-layout">
        ${_navHTML()}
        <div class="se-content" id="se-content">
          ${_activeSectionHTML()}
        </div>
      </div>
    </div>`;
  }

  function _rerenderContent() {
    const content = document.getElementById('se-content');
    if (content) content.innerHTML = _activeSectionHTML();
    document.querySelectorAll('.se-nav-btn').forEach(b=>
      b.classList.toggle('se-nav-btn--active', b.dataset.seSection===_state.activeSection));
  }

  function attachEvents(container) {
    if (!container) container = document;

    container.addEventListener('click', function(e) {
      const navBtn = e.target.closest('[data-se-section]');
      if (navBtn) { _state.activeSection = navBtn.dataset.seSection; _rerenderContent(); return; }

      const qualityBtn = e.target.closest('[data-quality]');
      if (qualityBtn) {
        _state.graphics.quality = qualityBtn.dataset.quality;
        document.querySelectorAll('[data-quality]').forEach(b=>
          b.classList.toggle('se-quality-btn--active', b.dataset.quality===_state.graphics.quality));
        return;
      }
      const layoutBtn = e.target.closest('[data-layout]');
      if (layoutBtn) {
        _state.controls.layout = layoutBtn.dataset.layout;
        document.querySelectorAll('[data-layout]').forEach(b=>
          b.classList.toggle('se-layout-btn--active', b.dataset.layout===_state.controls.layout));
        return;
      }
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) {
        _state.language = langBtn.dataset.lang;
        document.querySelectorAll('[data-lang]').forEach(b=>
          b.classList.toggle('se-lang-btn--active', b.dataset.lang===_state.language));
        return;
      }
      if (e.target.closest('#se-clear-cache')) { alert('Cache cleared!'); return; }
      if (e.target.closest('#se-export-save')) {
        const data = JSON.stringify({language:_state.language, graphics:_state.graphics, audio:_state.audio});
        const blob = new Blob([data], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ahmet_save.json';
        a.click();
        return;
      }
      if (e.target.closest('#se-import-save')) {
        const f = document.getElementById('se-import-file');
        if (f) f.click();
        return;
      }
      if (e.target.closest('#se-credits-btn')) {
        document.body.insertAdjacentHTML('beforeend', _creditsModalHTML());
        return;
      }
      if (e.target.closest('#se-credits-close') ||
          e.target.id === 'se-credits-modal') {
        const modal = document.getElementById('se-credits-modal');
        if (modal) modal.remove();
        return;
      }
      if (e.target.closest('#se-logout-btn'))  { if (confirm('Log out?')) alert('Logged out.'); return; }
      if (e.target.closest('#se-delete-btn'))  { if (confirm('Delete account permanently?')) alert('Account deleted.'); return; }
      const providerBtn = e.target.closest('[data-provider]');
      if (providerBtn) { alert(`Linking ${providerBtn.dataset.provider} account…`); return; }
    });

    container.addEventListener('change', function(e) {
      const toggleEl = e.target.closest('[data-se-toggle]');
      if (toggleEl) {
        const [section, key] = toggleEl.dataset.seToggle.split('.');
        _state[section][key] = e.target.checked;
        return;
      }
      const sliderEl = e.target.closest('[data-se-slider]');
      if (sliderEl) {
        const [section, key] = sliderEl.dataset.seSlider.split('.');
        _state[section][key] = parseInt(e.target.value);
        const valEl = document.getElementById(`se-slider-val-${section}-${key}`);
        if (valEl) valEl.textContent = e.target.value;
        return;
      }
      const selectEl = e.target.closest('[data-se-select]');
      if (selectEl) {
        const [section, key] = selectEl.dataset.seSelect.split('.');
        _state[section][key] = e.target.value;
        return;
      }
      if (e.target.id === 'se-region-select') { _state.region = e.target.value; return; }
      if (e.target.id === 'se-import-file') {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
          try {
            const data = JSON.parse(ev.target.result);
            if (data.graphics) Object.assign(_state.graphics, data.graphics);
            if (data.audio)    Object.assign(_state.audio,    data.audio);
            if (data.language) _state.language = data.language;
            alert('Save imported!');
          } catch(err) { alert('Invalid save file.'); }
        };
        reader.readAsText(file);
      }
    });
  }

  function getSettings() { return JSON.parse(JSON.stringify(_state)); }

  return { generateHTML, attachEvents, getSettings };
})();


// ============================================================
// TUTORIAL_SYSTEM MODULE
// ============================================================
const TUTORIAL_SYSTEM_EX = (function() {
  'use strict';

  const STEPS = [
    {
      id: 'welcome',
      title: 'Welcome to AHMET!',
      text: 'Get ready for an epic hill-climbing adventure. Let\'s show you the ropes!',
      highlight: null,
      action: 'tap_anywhere',
      triggerCondition: 'always'
    },
    {
      id: 'accelerate',
      title: 'Accelerate!',
      text: 'Tap and hold the RIGHT button to hit the gas and move forward.',
      highlight: '#btn-accelerate',
      action: 'hold_accelerate',
      triggerCondition: 'first_run'
    },
    {
      id: 'brake',
      title: 'Brake & Reverse',
      text: 'Tap the LEFT button to brake or reverse. Use it to balance on hills!',
      highlight: '#btn-brake',
      action: 'hold_brake',
      triggerCondition: 'first_run'
    },
    {
      id: 'fuel',
      title: 'Watch Your Fuel',
      text: 'The fuel gauge at the top drains as you drive. Collect fuel cans to keep going!',
      highlight: '#hud-fuel',
      action: 'tap_anywhere',
      triggerCondition: 'first_run'
    },
    {
      id: 'coins',
      title: 'Collect Coins',
      text: 'Drive over golden coins to collect them. Use coins to upgrade your vehicle!',
      highlight: '.coin-sprite',
      action: 'collect_coin',
      triggerCondition: 'first_run'
    },
    {
      id: 'tricks',
      title: 'Pull Off Tricks',
      text: 'Get airborne and tilt your vehicle for backflips and frontflips for bonus coins!',
      highlight: null,
      action: 'land_trick',
      triggerCondition: 'first_air'
    },
    {
      id: 'upgrade',
      title: 'Upgrade Your Ride',
      text: 'Tap the wrench icon to upgrade Engine, Suspension, Tyres and Fuel Tank.',
      highlight: '#btn-garage',
      action: 'tap_upgrade',
      triggerCondition: 'first_run_end'
    },
    {
      id: 'garage_engine',
      title: 'Engine Upgrades',
      text: 'A stronger engine means more power and speed. Upgrade it first!',
      highlight: '#upgrade-engine',
      action: 'tap_anywhere',
      triggerCondition: 'garage_open'
    },
    {
      id: 'garage_suspension',
      title: 'Suspension',
      text: 'Better suspension helps on rough terrain and prevents flipping.',
      highlight: '#upgrade-suspension',
      action: 'tap_anywhere',
      triggerCondition: 'garage_open'
    },
    {
      id: 'garage_tyres',
      title: 'Tyres',
      text: 'Tyres give you better grip. Essential for climbing steep hills!',
      highlight: '#upgrade-tyres',
      action: 'tap_anywhere',
      triggerCondition: 'garage_open'
    },
    {
      id: 'maps',
      title: 'New Maps',
      text: 'Each map has unique terrain and challenges. Unlock more maps as you progress!',
      highlight: '#btn-map-select',
      action: 'tap_anywhere',
      triggerCondition: 'map_unlocked'
    },
    {
      id: 'events',
      title: 'Events & Challenges',
      text: 'Compete in limited-time events for exclusive rewards and trophies!',
      highlight: '#btn-events',
      action: 'tap_anywhere',
      triggerCondition: 'level_5'
    },
    {
      id: 'leaderboard',
      title: 'Challenge the World',
      text: 'Check the leaderboard to see where you rank against players worldwide.',
      highlight: '#btn-leaderboard',
      action: 'tap_anywhere',
      triggerCondition: 'first_run_end'
    },
    {
      id: 'season_pass',
      title: 'Season Pass',
      text: 'Complete challenges to earn XP and unlock amazing season rewards!',
      highlight: '#btn-season',
      action: 'tap_anywhere',
      triggerCondition: 'level_3'
    },
    {
      id: 'complete',
      title: 'You\'re Ready!',
      text: 'That\'s everything! Good luck on the hills. Come back for daily quests!',
      highlight: null,
      action: 'tap_anywhere',
      triggerCondition: 'always',
      reward: {type:'coins', value:500}
    }
  ];

  const HINT_MESSAGES = [
    'Tip: Use nitro on flat sections for maximum distance!',
    'Tip: Slow down before steep descents to avoid flipping.',
    'Tip: Backflips give huge coin bonuses!',
    'Tip: Upgrade your fuel tank to go further each run.',
    'Tip: Check daily quests every day for a streak bonus.',
    'Tip: Watch ads to double your end-run coin reward.',
    'Tip: Gyroscope control is available in settings.',
    'Tip: The Season Pass offers incredible value for active players.',
    'Tip: Friend races give bonus trophy multipliers.'
  ];

  let _state = {
    currentStep     : 0,
    completed       : {},
    skipped         : false,
    hintTimer       : null,
    hintVisible     : false,
    hintIndex       : 0,
    inactivityTimer : null,
    firstRunFlags   : {},
    helpVisible     : {}
  };

  function _overlayHTML(step) {
    const hasHighlight = !!step.highlight;
    return `
    <div class="tut-overlay" id="tut-overlay">
      <div class="tut-backdrop" id="tut-backdrop"></div>
      ${hasHighlight ? `<div class="tut-spotlight" id="tut-spotlight"></div>` : ''}
      <div class="tut-dialog" id="tut-dialog">
        <div class="tut-step-indicator">
          ${STEPS.map((s,i)=>`<div class="tut-step-dot${i===_state.currentStep?' tut-step-dot--active':i<_state.currentStep?' tut-step-dot--done':''}"></div>`).join('')}
        </div>
        <div class="tut-dialog-icon">💡</div>
        <div class="tut-dialog-title">${step.title}</div>
        <div class="tut-dialog-text">${step.text}</div>
        ${step.reward ? `<div class="tut-reward">🎁 Reward: ${step.reward.value} ${step.reward.type==='coins'?'🪙':'💎'}</div>` : ''}
        <div class="tut-dialog-actions">
          <button class="tut-next-btn" id="tut-next-btn">
            ${_state.currentStep < STEPS.length-1 ? 'Next ›' : '🎉 Finish!'}
          </button>
          <button class="tut-skip-btn" id="tut-skip-btn">Skip Tutorial</button>
        </div>
      </div>
      <div class="tut-arrow-pointer" id="tut-arrow-pointer" style="display:none">▼</div>
    </div>`;
  }

  function _hintToastHTML(msg) {
    return `<div class="tut-hint-toast" id="tut-hint-toast">
      <span class="tut-hint-icon">💡</span>
      <span class="tut-hint-text">${msg}</span>
      <button class="tut-hint-close" id="tut-hint-close">✕</button>
    </div>`;
  }

  function _helpTooltipHTML(screenId) {
    const tips = {
      garage   : 'Spend coins here to upgrade your vehicle. Engine first!',
      events   : 'Limited-time events reset daily. Check back often!',
      leaderboard : 'Your rank updates after each run ends.',
      season   : 'Earn XP by playing normally — it adds up fast!',
      quests   : 'Complete all 3 daily quests for a streak bonus.'
    };
    return `<div class="tut-help-tooltip" id="tut-help-tooltip-${screenId}">
      <div class="tut-help-text">${tips[screenId]||'Explore this screen to discover its features!'}</div>
      <button class="tut-help-close" data-help-screen="${screenId}">Got it</button>
    </div>`;
  }

  function _contextualHelpBtnHTML(screenId) {
    return `<button class="tut-help-btn" data-help-btn="${screenId}" title="Help">?</button>`;
  }

  function _positionSpotlight(targetSelector) {
    const target = document.querySelector(targetSelector);
    const spot   = document.getElementById('tut-spotlight');
    const arrow  = document.getElementById('tut-arrow-pointer');
    if (!target || !spot) return;
    const rect = target.getBoundingClientRect();
    spot.style.cssText = `
      position:fixed;
      left:${rect.left-8}px;
      top:${rect.top-8}px;
      width:${rect.width+16}px;
      height:${rect.height+16}px;
      border-radius:8px;
      box-shadow:0 0 0 9999px rgba(0,0,0,0.75);
      z-index:9998;
      pointer-events:none;`;
    if (arrow) {
      arrow.style.cssText = `
        position:fixed;
        left:${rect.left + rect.width/2 - 12}px;
        top:${rect.bottom+8}px;
        display:block;
        font-size:24px;
        color:#FFD700;
        z-index:9999;
        animation:tut-bounce 0.6s infinite alternate;`;
    }
  }

  function _showStep(idx) {
    _state.currentStep = Math.max(0, Math.min(idx, STEPS.length-1));
    const step = STEPS[_state.currentStep];
    let overlay = document.getElementById('tut-overlay');
    if (overlay) overlay.remove();
    document.body.insertAdjacentHTML('beforeend', _overlayHTML(step));
    if (step.highlight) {
      requestAnimationFrame(function() { _positionSpotlight(step.highlight); });
    }
    const nextBtn = document.getElementById('tut-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', _nextStep);
    const skipBtn = document.getElementById('tut-skip-btn');
    if (skipBtn) skipBtn.addEventListener('click', _skipTutorial);
  }

  function _nextStep() {
    const step = STEPS[_state.currentStep];
    _state.completed[step.id] = true;
    if (step.reward) _giveReward(step.reward);
    if (_state.currentStep >= STEPS.length - 1) {
      _finish();
    } else {
      _showStep(_state.currentStep + 1);
    }
  }

  function _skipTutorial() {
    _state.skipped = true;
    const overlay = document.getElementById('tut-overlay');
    if (overlay) overlay.remove();
    _saveFlags();
  }

  function _finish() {
    const overlay = document.getElementById('tut-overlay');
    if (overlay) {
      overlay.classList.add('tut-overlay--done');
      setTimeout(()=>overlay.remove(), 800);
    }
    _saveFlags();
    // Completion reward is granted by _nextStep via the 'complete' step's
    // `reward` field; granting it again here would double-pay the player.
  }

  function _giveReward(reward) {
    if (typeof GAME !== 'undefined' && GAME.addCoins && reward.type==='coins') {
      GAME.addCoins(reward.value);
    }
    // Show floating reward
    const el = document.createElement('div');
    el.className = 'tut-reward-popup';
    el.textContent = `+${reward.value} ${reward.type==='coins'?'🪙':'💎'}`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 1500);
  }

  function _saveFlags() {
    try {
      localStorage.setItem('ahmet_tutorial', JSON.stringify({
        completed : _state.completed,
        skipped   : _state.skipped
      }));
    } catch(e) {}
  }

  function _loadFlags() {
    try {
      const data = JSON.parse(localStorage.getItem('ahmet_tutorial')||'{}');
      _state.completed = data.completed || {};
      _state.skipped   = data.skipped   || false;
    } catch(e) {}
  }

  function _startHintSystem() {
    _resetInactivityTimer();
    document.addEventListener('touchstart', _resetInactivityTimer);
    document.addEventListener('click',      _resetInactivityTimer);
    document.addEventListener('keydown',    _resetInactivityTimer);
  }

  function _resetInactivityTimer() {
    clearTimeout(_state.inactivityTimer);
    _state.inactivityTimer = setTimeout(_showHint, 30000);
  }

  function _showHint() {
    if (_state.hintVisible) return;
    const msg = HINT_MESSAGES[_state.hintIndex % HINT_MESSAGES.length];
    _state.hintIndex++;
    _state.hintVisible = true;
    document.body.insertAdjacentHTML('beforeend', _hintToastHTML(msg));
    const close = document.getElementById('tut-hint-close');
    if (close) close.addEventListener('click', _hideHint);
    setTimeout(_hideHint, 8000);
  }

  function _hideHint() {
    _state.hintVisible = false;
    const toast = document.getElementById('tut-hint-toast');
    if (toast) { toast.classList.add('tut-hint-toast--out'); setTimeout(()=>toast.remove(), 400); }
    _resetInactivityTimer();
  }

  function showContextualHelp(screenId) {
    const existing = document.getElementById(`tut-help-tooltip-${screenId}`);
    if (existing) { existing.remove(); _state.helpVisible[screenId]=false; return; }
    _state.helpVisible[screenId] = true;
    const btn = document.querySelector(`[data-help-btn="${screenId}"]`);
    const html = _helpTooltipHTML(screenId);
    if (btn) {
      btn.insertAdjacentHTML('afterend', html);
    } else {
      document.body.insertAdjacentHTML('beforeend', html);
    }
  }

  function renderHelpBtn(screenId) {
    return _contextualHelpBtnHTML(screenId);
  }

  function attachHelpEvents(container) {
    if (!container) container = document;
    container.addEventListener('click', function(e) {
      const helpBtn = e.target.closest('[data-help-btn]');
      if (helpBtn) { showContextualHelp(helpBtn.dataset.helpBtn); return; }
      const helpClose = e.target.closest('[data-help-screen]');
      if (helpClose) {
        const tooltip = document.getElementById(`tut-help-tooltip-${helpClose.dataset.helpScreen}`);
        if (tooltip) { tooltip.remove(); _state.helpVisible[helpClose.dataset.helpScreen]=false; }
        return;
      }
    });
  }

  function start() {
    _loadFlags();
    if (_state.skipped || Object.keys(_state.completed).length === STEPS.length) return;
    const firstIncomplete = STEPS.findIndex(s=>!_state.completed[s.id]);
    _showStep(firstIncomplete >= 0 ? firstIncomplete : 0);
    _startHintSystem();
  }

  function reset() {
    _state.completed = {}; _state.skipped = false; _state.currentStep = 0;
    _saveFlags();
    start();
  }

  function isComplete() {
    return _state.skipped || Object.keys(_state.completed).length >= STEPS.length;
  }

  function generateVideoLinkHTML() {
    return `<div class="tut-video-links">
      <div class="tut-video-title">📹 Video Tutorials</div>
      <a class="tut-video-link" href="#" data-video="basics">Getting Started</a>
      <a class="tut-video-link" href="#" data-video="tricks">Trick System</a>
      <a class="tut-video-link" href="#" data-video="upgrades">Upgrade Guide</a>
      <a class="tut-video-link" href="#" data-video="advanced">Advanced Tips</a>
    </div>`;
  }

  return { start, reset, isComplete, showContextualHelp, renderHelpBtn, attachHelpEvents, generateVideoLinkHTML, STEPS };
})();



// ================================================================
// UI_ANIMATION_ENGINE — CSS-in-JS animation system for game UI
// ================================================================
const UI_ANIMATION_ENGINE = (() => {
  const _running = [];

  function easeInOut(t) { return t<0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function easeOut(t)   { return 1-(1-t)*(1-t); }
  function easeIn(t)    { return t*t; }
  function bounce(t)    {
    if (t<0.3636) return 7.5625*t*t;
    if (t<0.7272) { t-=0.5454; return 7.5625*t*t+0.75; }
    if (t<0.9090) { t-=0.8181; return 7.5625*t*t+0.9375; }
    t-=0.9545; return 7.5625*t*t+0.984375;
  }

  const EASINGS = { linear: t=>t, easeIn, easeOut, easeInOut, bounce };

  function animate({ el, from, to, duration, easing, onUpdate, onComplete }) {
    const start = performance.now();
    const ease  = EASINGS[easing] || EASINGS.easeOut;
    const anim  = { el, from, to, duration, ease, onUpdate, onComplete, startTime: start, done: false };
    _running.push(anim);
    return anim;
  }

  function tick(now) {
    for (let i = _running.length-1; i >= 0; i--) {
      const a = _running[i];
      if (a.done) { _running.splice(i,1); continue; }
      const elapsed = (now || performance.now()) - a.startTime;
      const t = Math.min(1, elapsed / a.duration);
      const eased = a.ease(t);
      // Interpolate numeric properties
      const current = {};
      for (const key of Object.keys(a.from)) {
        current[key] = a.from[key] + (a.to[key] - a.from[key]) * eased;
      }
      if (a.onUpdate) a.onUpdate(current, eased);
      if (a.el) {
        if (current.opacity  !== undefined) a.el.style.opacity   = current.opacity;
        if (current.scale    !== undefined) a.el.style.transform = `scale(${current.scale})`;
        if (current.translateY!== undefined) a.el.style.transform= `translateY(${current.translateY}px)`;
        if (current.translateX!== undefined) a.el.style.transform= `translateX(${current.translateX}px)`;
      }
      if (t >= 1) {
        a.done = true;
        if (a.onComplete) a.onComplete();
      }
    }
  }

  function fadeIn(el, durationMs)  { el.style.opacity=0; animate({ el, from:{opacity:0}, to:{opacity:1}, duration:durationMs||300 }); }
  function fadeOut(el, durationMs, cb) { animate({ el, from:{opacity:1}, to:{opacity:0}, duration:durationMs||300, onComplete:cb }); }
  function slideUp(el, durationMs) { animate({ el, from:{translateY:40, opacity:0}, to:{translateY:0, opacity:1}, duration:durationMs||350 }); }
  function popIn(el, durationMs)   { animate({ el, from:{scale:0.5, opacity:0}, to:{scale:1, opacity:1}, duration:durationMs||250, easing:'bounce' }); }
  function shake(el) {
    let t = 0;
    const id = setInterval(() => {
      el.style.transform = `translateX(${Math.sin(t*0.5)*8}px)`;
      t += 1;
      if (t > 20) { clearInterval(id); el.style.transform=''; }
    }, 16);
  }

  function stopAll() { _running.length = 0; }
  function runningCount() { return _running.length; }

  return { animate, tick, fadeIn, fadeOut, slideUp, popIn, shake, stopAll, runningCount, EASINGS };
})();

// ================================================================
// UI_TOAST_SYSTEM — Game notification toasts
// ================================================================
const UI_TOAST_SYSTEM = (() => {
  const _toasts = [];
  let _container = null;

  const TYPES = {
    info:    { bg:'#1a2040', border:'#4488ff', icon:'ℹ️' },
    success: { bg:'#0a2a0a', border:'#44ff88', icon:'✅' },
    warning: { bg:'#2a1a00', border:'#ffaa00', icon:'⚠️' },
    error:   { bg:'#2a0a0a', border:'#ff4444', icon:'❌' },
    coin:    { bg:'#2a1a00', border:'#FFD700', icon:'🪙' },
    diamond: { bg:'#001a2a', border:'#00BFFF', icon:'💎' },
    trophy:  { bg:'#1a1000', border:'#FFD700', icon:'🏆' },
    level:   { bg:'#001a1a', border:'#00FFFF', icon:'⬆️' },
    trick:   { bg:'#1a001a', border:'#FF00FF', icon:'🎯' }
  };

  function _ensureContainer() {
    if (_container && document.body.contains(_container)) return;
    _container = document.createElement('div');
    _container.id = 'ahmet-toast-container';
    Object.assign(_container.style, {
      position:'fixed', top:'80px', right:'16px', zIndex:'9999',
      display:'flex', flexDirection:'column', gap:'8px', pointerEvents:'none',
      maxWidth:'320px'
    });
    document.body.appendChild(_container);
  }

  function show(message, type, durationMs) {
    _ensureContainer();
    const cfg = TYPES[type] || TYPES.info;
    const el  = document.createElement('div');
    Object.assign(el.style, {
      background:   cfg.bg,
      border:       `1px solid ${cfg.border}`,
      borderRadius: '10px',
      padding:      '10px 14px',
      color:        '#fff',
      fontSize:     '13px',
      display:      'flex',
      alignItems:   'center',
      gap:          '8px',
      boxShadow:    `0 4px 20px ${cfg.border}44`,
      opacity:      '0',
      transform:    'translateX(40px)',
      transition:   'all 0.3s ease',
      pointerEvents:'none',
      fontFamily:   'sans-serif'
    });
    el.innerHTML = `<span>${cfg.icon}</span><span>${message}</span>`;
    _container.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity   = '1';
      el.style.transform = 'translateX(0)';
    });
    const dur = durationMs || 2800;
    setTimeout(() => {
      el.style.opacity   = '0';
      el.style.transform = 'translateX(40px)';
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }, dur);
    _toasts.push({ el, type, message, addedAt: Date.now() });
    if (_toasts.length > 20) _toasts.shift();
  }

  function coinToast(amount)   { show(`+${amount} Coin`, 'coin',    2000); }
  function diamondToast(amount){ show(`+${amount} 💎`,   'diamond', 2000); }
  function levelToast(level)   { show(`Level ${level}!`, 'level',   3000); }
  function trickToast(name, score) { show(`${name} — ${score} pts`, 'trick', 2500); }
  function achievementToast(name)  { show(`🏅 ${name}`, 'trophy',  3500); }
  function errorToast(msg)     { show(msg, 'error', 3000); }
  function infoToast(msg)      { show(msg, 'info',  2500); }

  function clear() {
    if (_container) _container.innerHTML = '';
    _toasts.length = 0;
  }

  return { show, coinToast, diamondToast, levelToast, trickToast, achievementToast, errorToast, infoToast, clear, TYPES };
})();

// ================================================================
// UI_THEME_ENGINE — Dynamic theme switching
// ================================================================
const UI_THEME_ENGINE = (() => {
  const THEMES = {
    dark_gold: {
      '--bg-primary':    '#0a0a0f',
      '--bg-secondary':  '#12121a',
      '--bg-card':       '#1a1a25',
      '--bg-elevated':   '#222230',
      '--border-color':  'rgba(255,215,0,0.15)',
      '--text-primary':  '#ffffff',
      '--text-secondary':'#cccccc',
      '--text-muted':    '#888899',
      '--tt-gold':      '#FFD700',
      '--tt-gold-dark': '#B8860B',
      '--tt-gold-light':'#FFE55C',
      '--tt-diamond':   '#00BFFF',
      '--tt-fire':      '#FF4500',
      '--tt-green':     '#00FF7F',
      '--tt-red':       '#FF3333',
      '--shadow-gold':   '0 0 20px rgba(255,215,0,0.3)'
    },
    midnight_blue: {
      '--bg-primary':    '#05050f',
      '--bg-secondary':  '#0a0a1f',
      '--bg-card':       '#10102a',
      '--bg-elevated':   '#18183a',
      '--border-color':  'rgba(100,149,237,0.2)',
      '--text-primary':  '#e0e8ff',
      '--text-secondary':'#a0b0d0',
      '--text-muted':    '#607090',
      '--tt-gold':      '#7EB3FF',
      '--tt-gold-dark': '#4488cc',
      '--tt-gold-light':'#aaccff',
      '--tt-diamond':   '#00FFFF',
      '--tt-fire':      '#FF6666',
      '--tt-green':     '#66FFAA',
      '--tt-red':       '#FF4466',
      '--shadow-gold':   '0 0 20px rgba(100,149,237,0.3)'
    },
    forest_green: {
      '--bg-primary':    '#050f05',
      '--bg-secondary':  '#0a1a0a',
      '--bg-card':       '#0f220f',
      '--bg-elevated':   '#182818',
      '--border-color':  'rgba(0,200,80,0.2)',
      '--text-primary':  '#e0ffe0',
      '--text-secondary':'#a0c8a0',
      '--text-muted':    '#608060',
      '--tt-gold':      '#7CFC00',
      '--tt-gold-dark': '#4a9800',
      '--tt-gold-light':'#ADFF2F',
      '--tt-diamond':   '#00CED1',
      '--tt-fire':      '#FF8C00',
      '--tt-green':     '#00FF00',
      '--tt-red':       '#FF6347',
      '--shadow-gold':   '0 0 20px rgba(0,200,80,0.3)'
    },
    crimson_dark: {
      '--bg-primary':    '#0f0505',
      '--bg-secondary':  '#1a0a0a',
      '--bg-card':       '#220f0f',
      '--bg-elevated':   '#2e1515',
      '--border-color':  'rgba(220,20,60,0.2)',
      '--text-primary':  '#ffe0e0',
      '--text-secondary':'#c8a0a0',
      '--text-muted':    '#906060',
      '--tt-gold':      '#FF4040',
      '--tt-gold-dark': '#CC0000',
      '--tt-gold-light':'#FF8080',
      '--tt-diamond':   '#FF69B4',
      '--tt-fire':      '#FF6600',
      '--tt-green':     '#90EE90',
      '--tt-red':       '#FF0000',
      '--shadow-gold':   '0 0 20px rgba(220,20,60,0.35)'
    },
    neon_cyber: {
      '--bg-primary':    '#000008',
      '--bg-secondary':  '#050515',
      '--bg-card':       '#0a0a20',
      '--bg-elevated':   '#0f0f2a',
      '--border-color':  'rgba(0,255,255,0.2)',
      '--text-primary':  '#00FFFF',
      '--text-secondary':'#00CCCC',
      '--text-muted':    '#008888',
      '--tt-gold':      '#00FFFF',
      '--tt-gold-dark': '#0099AA',
      '--tt-gold-light':'#80FFFF',
      '--tt-diamond':   '#FF00FF',
      '--tt-fire':      '#FF4400',
      '--tt-green':     '#00FF44',
      '--tt-red':       '#FF0040',
      '--shadow-gold':   '0 0 25px rgba(0,255,255,0.4)'
    }
  };

  let _current = 'dark_gold';

  function apply(themeName) {
    const theme = THEMES[themeName];
    if (!theme) return false;
    _current = themeName;
    const root = document.documentElement;
    if (!root) return true;
    for (const [prop, val] of Object.entries(theme)) {
      root.style.setProperty(prop, val);
    }
    try { localStorage.setItem('ahmet_theme', themeName); } catch(e) {}
    return true;
  }

  function loadSaved() {
    try {
      const saved = localStorage.getItem('ahmet_theme');
      if (saved && THEMES[saved]) apply(saved);
    } catch(e) {}
  }

  function getCurrent()   { return _current; }
  function getTheme(name) { return THEMES[name] || null; }
  function listThemes()   { return Object.keys(THEMES); }
  function getThemeCount(){ return Object.keys(THEMES).length; }

  function buildThemePreviewHTML() {
    return Object.entries(THEMES).map(([id, t]) =>
      `<div class="theme-preview" data-theme="${id}" style="background:${t['--bg-card']};border:1px solid ${t['--border-color']};border-radius:8px;padding:8px;cursor:pointer;">
        <span style="color:${t['--tt-gold']}">${id}</span>
        <div style="display:flex;gap:4px;margin-top:4px">
          <div style="width:16px;height:16px;border-radius:50%;background:${t['--tt-gold']}"></div>
          <div style="width:16px;height:16px;border-radius:50%;background:${t['--tt-diamond']}"></div>
          <div style="width:16px;height:16px;border-radius:50%;background:${t['--tt-fire']}"></div>
        </div>
      </div>`
    ).join('');
  }

  return { apply, loadSaved, getCurrent, getTheme, listThemes, getThemeCount, buildThemePreviewHTML, THEMES };
})();

// ================================================================
// UI_MODAL_SYSTEM — Centralized modal management
// ================================================================
const UI_MODAL_SYSTEM = (() => {
  const _stack = [];
  let _overlay  = null;

  function _ensureOverlay() {
    if (_overlay && document.body.contains(_overlay)) return;
    _overlay = document.createElement('div');
    _overlay.id = 'ahmet-modal-overlay';
    Object.assign(_overlay.style, {
      position:'fixed', inset:'0', background:'rgba(0,0,0,0.75)',
      zIndex:'8000', display:'none', alignItems:'center', justifyContent:'center'
    });
    _overlay.addEventListener('click', e => { if (e.target === _overlay) closeTop(); });
    document.body.appendChild(_overlay);
  }

  function open(id, contentHTML, opts) {
    _ensureOverlay();
    const cfg = opts || {};
    const modal = document.createElement('div');
    modal.dataset.modalId = id;
    Object.assign(modal.style, {
      background:   'var(--bg-elevated, #222)',
      border:       '1px solid var(--border-color, rgba(255,215,0,0.2))',
      borderRadius: '16px',
      padding:      '24px',
      maxWidth:     cfg.width  || '500px',
      maxHeight:    cfg.height || '80vh',
      overflowY:    'auto',
      color:        'var(--text-primary, #fff)',
      position:     'relative',
      animation:    'modalIn 0.25s ease'
    });
    modal.innerHTML = `
      <button onclick="UI_MODAL_SYSTEM.closeById('${id}')" style="position:absolute;top:12px;right:12px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;line-height:1">✕</button>
      ${contentHTML}`;
    _overlay.innerHTML = '';
    _overlay.appendChild(modal);
    _overlay.style.display = 'flex';
    _stack.push(id);
    document.body.style.overflow = 'hidden';
    if (cfg.onOpen) cfg.onOpen(modal);
    return modal;
  }

  function closeTop() {
    if (!_stack.length) return;
    _stack.pop();
    if (!_stack.length) {
      if (_overlay) _overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function closeById(id) {
    const idx = _stack.indexOf(id);
    if (idx !== -1) _stack.splice(idx, 1);
    if (!_stack.length) {
      if (_overlay) _overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function closeAll() {
    _stack.length = 0;
    if (_overlay) _overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function isOpen(id) { return _stack.includes(id); }
  function getStack()  { return _stack.slice(); }

  function confirm(message, onYes, onNo) {
    open('confirm', `
      <p style="margin:0 0 16px;font-size:15px">${message}</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="UI_MODAL_SYSTEM.closeById('confirm')" style="padding:8px 20px;background:#333;border:1px solid #555;border-radius:8px;color:#fff;cursor:pointer">Cancel</button>
        <button id="ahmet-confirm-yes" style="padding:8px 20px;background:var(--tt-gold,#FFD700);border:none;border-radius:8px;color:#000;font-weight:700;cursor:pointer">Yes</button>
      </div>`, { width:'360px' });
    setTimeout(() => {
      const btn = document.getElementById('ahmet-confirm-yes');
      if (btn) btn.addEventListener('click', () => { closeById('confirm'); if (onYes) onYes(); });
    }, 50);
  }

  return { open, closeTop, closeById, closeAll, isOpen, getStack, confirm };
})();

// ================================================================
// UI_FORM_HELPERS — Form building & validation utilities
// ================================================================
const UI_FORM_HELPERS = (() => {
  function textInput(id, label, placeholder, value) {
    return `<div style="margin-bottom:12px">
      <label for="${id}" style="display:block;font-size:12px;color:var(--text-muted,#888);margin-bottom:4px">${label}</label>
      <input id="${id}" type="text" placeholder="${placeholder||''}" value="${value||''}"
        style="width:100%;padding:8px 12px;background:var(--bg-secondary,#111);border:1px solid var(--border-color,rgba(255,215,0,0.15));
               border-radius:8px;color:var(--text-primary,#fff);font-size:14px;box-sizing:border-box;outline:none">
    </div>`;
  }

  function select(id, label, options, selectedVal) {
    const opts = options.map(o =>
      `<option value="${o.value}" ${o.value===selectedVal?'selected':''}>${o.label}</option>`).join('');
    return `<div style="margin-bottom:12px">
      <label for="${id}" style="display:block;font-size:12px;color:var(--text-muted,#888);margin-bottom:4px">${label}</label>
      <select id="${id}" style="width:100%;padding:8px 12px;background:var(--bg-secondary,#111);border:1px solid var(--border-color,rgba(255,215,0,0.15));border-radius:8px;color:var(--text-primary,#fff);font-size:14px">${opts}</select>
    </div>`;
  }

  function toggle(id, label, checked) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span style="font-size:14px;color:var(--text-primary,#fff)">${label}</span>
      <label style="position:relative;width:44px;height:24px;display:block">
        <input type="checkbox" id="${id}" ${checked?'checked':''} style="opacity:0;width:0;height:0">
        <span style="position:absolute;inset:0;background:${checked?'var(--tt-gold,#FFD700)':'#444'};border-radius:12px;cursor:pointer;transition:background 0.3s"></span>
      </label>
    </div>`;
  }

  function slider(id, label, min, max, step, value) {
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <label for="${id}" style="font-size:12px;color:var(--text-muted,#888)">${label}</label>
        <span id="${id}-val" style="font-size:12px;color:var(--tt-gold,#FFD700)">${value}</span>
      </div>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step||1}" value="${value}"
        oninput="document.getElementById('${id}-val').textContent=this.value"
        style="width:100%;accent-color:var(--tt-gold,#FFD700)">
    </div>`;
  }

  function submitBtn(label, onclick) {
    return `<button onclick="${onclick}" style="width:100%;padding:12px;background:var(--tt-gold,#FFD700);border:none;border-radius:10px;color:#000;font-weight:700;font-size:15px;cursor:pointer;margin-top:8px">${label}</button>`;
  }

  function getValue(id)  { const el=document.getElementById(id); return el?el.value:null; }
  function isChecked(id) { const el=document.getElementById(id); return el?el.checked:false; }

  function validate(rules) {
    const errors = [];
    for (const { id, label, required, minLen, maxLen, pattern } of rules) {
      const val = getValue(id) || '';
      if (required && !val.trim()) { errors.push(`${label} cannot be empty`); continue; }
      if (minLen && val.length < minLen) errors.push(`${label} must be at least ${minLen} characters`);
      if (maxLen && val.length > maxLen) errors.push(`${label} can be at most ${maxLen} characters`);
      if (pattern && !pattern.test(val)) errors.push(`${label} format is invalid`);
    }
    return errors;
  }

  return { textInput, select, toggle, slider, submitBtn, getValue, isChecked, validate };
})();


// ================================================================
// UI_VEHICLE_COMPARE — Side-by-side vehicle comparison panel
// ================================================================
const UI_VEHICLE_COMPARE = (() => {
  let _slotA = null;
  let _slotB = null;
  let _visible = false;

  const STATS_TO_COMPARE = [
    { key:'topSpeed',    label:'Top Speed',    icon:'⚡', unit:'km/h', max:300 },
    { key:'acceleration',label:'Acceleration', icon:'🚀', unit:'',     max:100 },
    { key:'grip',        label:'Grip',         icon:'🛞', unit:'',     max:100 },
    { key:'suspension',  label:'Suspension',   icon:'🔧', unit:'',     max:100 },
    { key:'weight',      label:'Weight',       icon:'⚖️', unit:'kg',   max:2000, lowerIsBetter:true },
    { key:'fuel',        label:'Fuel Capacity',icon:'⛽', unit:'L',    max:100 },
    { key:'armor',       label:'Armor',        icon:'🛡️', unit:'',     max:100 },
    { key:'nitroBoost',  label:'Nitro',        icon:'💨', unit:'',     max:100 },
  ];

  function open(vehicleA, vehicleB) {
    _slotA   = vehicleA || null;
    _slotB   = vehicleB || null;
    _visible = true;
  }

  function close() { _visible=false; _slotA=null; _slotB=null; }
  function isVisible() { return _visible; }
  function setSlotA(v){ _slotA=v; }
  function setSlotB(v){ _slotB=v; }

  function getComparison() {
    if (!_slotA || !_slotB) return null;
    return STATS_TO_COMPARE.map(stat=>{
      const a = _slotA.stats?.[stat.key] || 0;
      const b = _slotB.stats?.[stat.key] || 0;
      const pctA = Math.min(1, a/stat.max);
      const pctB = Math.min(1, b/stat.max);
      const winner = stat.lowerIsBetter ? (a<b?'A':(b<a?'B':'tie')) : (a>b?'A':(b>a?'B':'tie'));
      return { ...stat, a, b, pctA, pctB, winner, diff:a-b };
    });
  }

  function renderHTML(containerEl, vehicleData) {
    if (!containerEl) return;
    const cmp = getComparison();
    if (!cmp || !_slotA || !_slotB) { containerEl.innerHTML='<p style="color:#888;text-align:center">Select two vehicles to compare</p>'; return; }

    let html = `<div class="compare-grid">`;
    html += `<div class="compare-header"><div class="compare-name-a">${_slotA.name||'Vehicle A'}</div><div class="compare-label">Stat</div><div class="compare-name-b">${_slotB.name||'Vehicle B'}</div></div>`;
    for (const s of cmp) {
      const winClass = s.winner==='A'?'winner-a':(s.winner==='B'?'winner-b':'');
      html += `<div class="compare-row ${winClass}">`;
      html += `<div class="compare-bar-a"><div class="compare-fill" style="width:${Math.round(s.pctA*100)}%"></div><span>${s.a}${s.unit}</span></div>`;
      html += `<div class="compare-stat-label">${s.icon} ${s.label}</div>`;
      html += `<div class="compare-bar-b"><div class="compare-fill" style="width:${Math.round(s.pctB*100)}%"></div><span>${s.b}${s.unit}</span></div>`;
      html += `</div>`;
    }
    html += `</div>`;
    containerEl.innerHTML = html;
  }

  return { open, close, isVisible, setSlotA, setSlotB, getComparison, renderHTML, STATS_TO_COMPARE };
})();

// ================================================================
// UI_MAP_SELECTOR — Map browsing and filtering UI logic
// ================================================================
const UI_MAP_SELECTOR = (() => {
  let _maps      = [];
  let _filter    = { biome:null, difficulty:null, unlocked:null, search:'' };
  let _sortBy    = 'id'; // id|difficulty|stars|name
  let _selected  = null;
  let _page      = 0;
  const PAGE_SIZE= 12;

  function setMaps(maps) { _maps = maps; }

  function setFilter(key, value) {
    _filter[key] = value;
    _page = 0;
  }

  function setSort(field) { _sortBy = field; _page = 0; }
  function nextPage() { _page++; }
  function prevPage() { _page = Math.max(0, _page-1); }
  function selectMap(id) { _selected = id; }
  function getSelected() { return _maps.find(m=>m.id===_selected)||null; }

  function getFiltered() {
    let result = [..._maps];
    if (_filter.biome)      result = result.filter(m=>m.biome===_filter.biome);
    if (_filter.difficulty !== null && _filter.difficulty !== undefined) result = result.filter(m=>m.difficulty===_filter.difficulty);
    if (_filter.unlocked !== null)  result = result.filter(m=>!!m.unlocked === _filter.unlocked);
    if (_filter.search)     result = result.filter(m=>(m.name||'').toLowerCase().includes(_filter.search.toLowerCase()));
    // Sort
    result.sort((a,b)=>{
      if (_sortBy==='name')       return (a.name||'').localeCompare(b.name||'');
      if (_sortBy==='difficulty') return (a.difficulty||0)-(b.difficulty||0);
      if (_sortBy==='stars')      return (b.stars||0)-(a.stars||0);
      return 0;
    });
    return result;
  }

  function getPage() {
    const all   = getFiltered();
    const start = _page * PAGE_SIZE;
    return { items:all.slice(start, start+PAGE_SIZE), total:all.length, page:_page, pages:Math.ceil(all.length/PAGE_SIZE) };
  }

  function getBiomes() { return [...new Set(_maps.map(m=>m.biome).filter(Boolean))]; }
  function getDifficulties() { return [...new Set(_maps.map(m=>m.difficulty).filter(v=>v!==undefined))].sort((a,b)=>a-b); }

  function getStats() {
    const all      = _maps;
    const unlocked = all.filter(m=>m.unlocked).length;
    const stars    = all.reduce((s,m)=>s+(m.stars||0),0);
    const maxStars = all.length*3;
    return { total:all.length, unlocked, locked:all.length-unlocked, stars, maxStars };
  }

  return { setMaps, setFilter, setSort, nextPage, prevPage, selectMap, getSelected, getFiltered, getPage, getBiomes, getDifficulties, getStats };
})();

// ================================================================
// UI_SETTINGS_V2 — Settings manager with presets
// ================================================================
const UI_SETTINGS_V2 = (() => {
  const LS_KEY = 'ahmet_settings_v2';

  const DEFAULTS = {
    sfxVolume:      0.8,
    musicVolume:    0.6,
    masterVolume:   1.0,
    graphicsQuality:'auto',   // low|medium|high|auto
    showFPS:        false,
    showPing:       false,
    particleLevel:  'high',   // off|low|medium|high
    shadowsEnabled: true,
    postProcess:    true,
    cameraShake:    true,
    controlScheme:  'buttons', // buttons|tilt|keyboard
    invertSteer:    false,
    hapticFeedback: true,
    language:       'en',
    theme:          'dark_gold',
    uiScale:        1.0,
    showHints:      true,
    autoSave:       true,
    autoSaveInterval: 30, // seconds
    notifications:  true,
    lowPowerMode:   false,
    fpsTarget:      60, // 30|60|120
    colorBlindMode: 'none', // none|deuteranopia|protanopia|tritanopia
  };

  const PRESETS = {
    performance: { graphicsQuality:'low', shadowsEnabled:false, postProcess:false, particleLevel:'low', fpsTarget:60 },
    balanced:    { graphicsQuality:'medium', shadowsEnabled:true, postProcess:true, particleLevel:'medium', fpsTarget:60 },
    quality:     { graphicsQuality:'high', shadowsEnabled:true, postProcess:true, particleLevel:'high', fpsTarget:60 },
    battery:     { graphicsQuality:'low', shadowsEnabled:false, postProcess:false, particleLevel:'off', fpsTarget:30, lowPowerMode:true },
  };

  let _data = {};

  function load() {
    try { _data = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS_KEY)||'{}') }; }
    catch(e){ _data = { ...DEFAULTS }; }
    return _data;
  }

  function save() { try{localStorage.setItem(LS_KEY, JSON.stringify(_data));}catch(e){} }

  function get(key) { return _data[key]; }
  function set(key, value) { _data[key]=value; save(); }
  function setMany(obj) { Object.assign(_data,obj); save(); }

  function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return false;
    Object.assign(_data, p);
    save();
    return true;
  }

  function reset() { _data={...DEFAULTS}; save(); }

  function detectAutoQuality() {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const cores    = navigator.hardwareConcurrency||2;
    const mem      = navigator.deviceMemory||2;
    if (isMobile || mem<=2 || cores<=2) return 'low';
    if (mem>=8 && cores>=8) return 'high';
    return 'medium';
  }

  function resolveGraphicsQuality() {
    if (_data.graphicsQuality !== 'auto') return _data.graphicsQuality;
    return detectAutoQuality();
  }

  function getAll() { return { ..._data }; }

  load();
  return { load, save, get, set, setMany, applyPreset, reset, detectAutoQuality, resolveGraphicsQuality, getAll, DEFAULTS, PRESETS };
})();

// ================================================================
// UI_QUICK_ACTIONS — Floating action bar for in-game quick actions
// ================================================================
const UI_QUICK_ACTIONS = (() => {
  const _actions = [];
  let   _visible = true;
  let   _collapsed = false;

  function add(action) {
    // action: {id, icon, label, shortcut, onTap, enabled, cooldownMs}
    const a = { cooldownRemaining:0, ...action };
    _actions.push(a);
    return a;
  }

  function remove(id) {
    const i = _actions.findIndex(a=>a.id===id);
    if (i>=0) _actions.splice(i,1);
  }

  function trigger(id) {
    const a = _actions.find(a=>a.id===id);
    if (!a || !a.enabled || a.cooldownRemaining>0) return false;
    if (a.onTap) a.onTap();
    if (a.cooldownMs) a.cooldownRemaining = a.cooldownMs;
    return true;
  }

  function update(dt) {
    for (const a of _actions) {
      if (a.cooldownRemaining > 0) a.cooldownRemaining = Math.max(0, a.cooldownRemaining-dt*1000);
    }
  }

  function show()   { _visible=true; }
  function hide()   { _visible=false; }
  function toggle() { _visible=!_visible; }
  function collapse(){ _collapsed=true; }
  function expand() { _collapsed=false; }
  function isVisible()   { return _visible; }
  function isCollapsed() { return _collapsed; }
  function getActions()  { return [..._actions]; }
  function getAction(id) { return _actions.find(a=>a.id===id)||null; }
  function setEnabled(id, v){ const a=getAction(id); if(a) a.enabled=v; }

  // Default AHMET actions
  function setupDefaults() {
    add({ id:'nitro',   icon:'💨', label:'Nitro',   shortcut:'N', enabled:true, cooldownMs:3000  });
    add({ id:'repair',  icon:'🔧', label:'Repair',  shortcut:'R', enabled:true, cooldownMs:30000 });
    add({ id:'magnet',  icon:'🧲', label:'Magnet',  shortcut:'M', enabled:true, cooldownMs:20000 });
    add({ id:'shield',  icon:'🛡️', label:'Shield',  shortcut:'S', enabled:true, cooldownMs:25000 });
    add({ id:'turbo',   icon:'⚡', label:'Turbo',   shortcut:'T', enabled:true, cooldownMs:15000 });
    add({ id:'restart', icon:'🔄', label:'Restart', shortcut:'',  enabled:true, cooldownMs:0     });
  }

  return { add, remove, trigger, update, show, hide, toggle, collapse, expand, isVisible, isCollapsed, getActions, getAction, setEnabled, setupDefaults };
})();
