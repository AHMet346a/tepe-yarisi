'use strict';
const Renderer = {
  canvas: null, ctx: null,

  init(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); },

  // Ekran kontrolleri (mobil) — görünür gaz/fren/boost. Girişi mevcut dokunma bölgeleri yönetir.
  _drawTouchControls(ctx, W, H, v) {
    // Konum/yarıçap SABİT — mevcut dokunma hit-zone'larıyla uyumlu.
    const r = Math.max(38, Math.min(58, W * 0.09));   // çap 76–116px ( ≥44px hedef )
    const by = H - r - 24;
    // reducedMotion güvenli erişim: açıkken nabız/animasyon yok (sakin).
    const reduced = (typeof Settings !== 'undefined' && Settings.get) ? !!Settings.get('reducedMotion') : false;
    const pulse = reduced ? 0.5 : (Math.sin(Date.now() * 0.005) * 0.5 + 0.5);
    const cs = (typeof Game !== 'undefined' && Game.controlState) ? Game.controlState : {};
    // Karanlık-enerjik palet: fren sıcak-kırmızı, gaz yeşil, boost mavi/cyan.
    const BRAKE    = { hi: '#ff8a72', mid: '#e74c3c', lo: '#7a1712', glow: 'rgba(255,96,72,1)' };
    const THROTTLE = { hi: '#7dffb0', mid: '#2ecc71', lo: '#0e6e34', glow: 'rgba(64,235,140,1)' };
    const BOOST    = { hi: '#8bebff', mid: '#22a2d6', lo: '#0a4562', glow: 'rgba(70,205,255,1)' };
    this._touchPad(ctx, r + 20,     by, r, '◀',  BRAKE,    cs.brake === 1,    pulse); // fren (sol)
    this._touchPad(ctx, W - r - 20, by, r, '▶',  THROTTLE, cs.throttle === 1, pulse); // gaz (sağ)
    this._touchPad(ctx, W / 2,      by, r, '🚀', BOOST,    cs.boost === 1,    pulse); // boost (orta)
  },

  // Tek bir dokunma pedini çizer (premium arcade pedal hissi). Yalnız _drawTouchControls kullanır.
  // Basılı durum RENKTEN BAĞIMSIZ da belli: dış hâle + iç parıltı + inset halka + büyüyen etiket.
  _touchPad(ctx, cx, by, r, label, c, active, pulse) {
    const TAU = 6.2832;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 1) Basılıyken dış enerji hâlesi (footprint'i büyütmez; sadece görsel).
    if (active) {
      ctx.globalAlpha = 0.30 + pulse * 0.25;
      const og = GradyanDeposu.rad(ctx, cx, by, r * 0.55, cx, by, r * 1.55, [0, c.glow, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = og;
      ctx.beginPath(); ctx.arc(cx, by, r * 1.55, 0, TAU); ctx.fill();
    }

    // 2) Ana disk — zengin radyal gradyan (yarı saydam, oyun görüşünü kapatmaz).
    ctx.globalAlpha = active ? 0.92 : 0.5;
    const g = ctx.createRadialGradient(cx, by - r * 0.35, r * 0.12, cx, by, r);
    if (active) {
      g.addColorStop(0, c.hi);
      g.addColorStop(0.55, c.mid);
      g.addColorStop(1, c.lo);
    } else {
      g.addColorStop(0, c.mid);
      g.addColorStop(0.62, c.lo);
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, by, r, 0, TAU); ctx.fill();

    // 3) Bevel — üstte ışık, altta gölge (hacim hissi).
    const bw = Math.max(2, r * 0.06);
    ctx.lineWidth = bw;
    ctx.strokeStyle = 'rgba(255,255,255,' + (active ? 0.55 : 0.32) + ')';
    ctx.beginPath(); ctx.arc(cx, by, r - bw * 0.5, -2.5, -0.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.arc(cx, by, r - bw * 0.5, 0.6, 2.5); ctx.stroke();

    // 4) Keskin dış rim.
    ctx.lineWidth = 2;
    ctx.strokeStyle = active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx, by, r, 0, TAU); ctx.stroke();

    if (active) {
      // 5a) BASILI: iç parıltı + inset halka (renk-dışı sinyal).
      const ir = r * 0.72;
      const ig = GradyanDeposu.rad(ctx, cx, by, ir * 0.2, cx, by, ir, [0, c.glow, 1, 'rgba(0,0,0,0)']);
      ctx.globalAlpha = 0.5 + pulse * 0.3;
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(cx, by, ir, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.arc(cx, by, ir, 0, TAU); ctx.stroke();
    } else {
      // 5b) BOŞTA: yumuşak üst parlaklık (idle sheen).
      ctx.globalAlpha = 0.26;
      const sh = GradyanDeposu.rad(ctx, cx, by - r * 0.45, 2, cx, by - r * 0.45, r * 0.7, [0, 'rgba(255,255,255,0.9)', 1, 'rgba(255,255,255,0)']);
      ctx.fillStyle = sh;
      ctx.beginPath(); ctx.ellipse(cx, by - r * 0.35, r * 0.55, r * 0.35, 0, 0, TAU); ctx.fill();
    }

    // 6) Etiket — okunur; basılıyken hafif büyür (boyut = ek durum sinyali).
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.floor(r * (active ? 0.54 : 0.5)) + 'px Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = active ? 6 : 3;
    ctx.fillText(label, cx, by + 1);
    ctx.restore();
  },

  drawGame(vehicle, vehicleId, terrain, camera, particles, animTime) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const mapId = terrain.mapId;
    const cfg = terrain.MAPS[mapId] || terrain.MAPS.countryside;

    // ── Sky ──────────────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    const skies = {
      countryside: ['#87CEEB','#B0E0FF'],
      desert:      ['#FDB97D','#FFD97D'],
      winter:      ['#1a2a4a','#2d4a6a'],
      beach:       ['#1a90e0','#87CEEB'],
      mountains:   ['#4a5a6a','#6a7a8a'],
      city:        ['#87CEEB','#B0D8FF'],
      arctic:      ['#0a1a3a','#0a2a4a'],
      jungle:      ['#1a3a1a','#2a4a1a'],
      mars:        ['#4a1a0a','#6a2a0a'],
      cave:        ['#050505','#0a0a0a'],
      highland:    ['#7a9a7a','#9aba9a'],
      swamp:       ['#1a2a1a','#2a3a2a'],
      volcano:     ['#1a0a00','#3a0a00'],
      underwater:  ['#001a3a','#003a5a'],
      moon:        ['#000000','#080810'],
      neon_city:   ['#020210','#080820'],
      wasteland:   ['#3a2a1a','#6a4a2a'],
      canyon:      ['#8a4a2a','#c06a3a']
    };
    const sk = skies[mapId] || skies.countryside;
    skyGrad.addColorStop(0, sk[0]); skyGrad.addColorStop(1, sk[1]);
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);

    // Fog overlay
    if (cfg.fogColor) {
      ctx.fillStyle = cfg.fogColor; ctx.fillRect(0, 0, W, H);
    }

    // ── Ortam: gece/gündüz gökyüzü tint (screen-space) ──
    if (typeof Environment !== 'undefined') Environment.tintSky(ctx, W, H);

    // ── Far background elements ───────────────────────────
    camera.apply(ctx);
    if (typeof Environment !== 'undefined') Environment.applyShake(ctx);   // deprem/afet sarsıntısı
    this._drawBackground(ctx, camera, mapId, animTime);
    terrain.draw(ctx, camera);

    // ── Ortam: engeller + afetler + farlar (world-space) ──
    if (typeof Environment !== 'undefined') Environment.drawWorld(ctx, camera);
    // ── Oyun modları: checkpoint, bitiş çizgisi, hayalet, boss (world-space) ──
    if (typeof GameModes !== 'undefined') GameModes.drawWorld(ctx, camera);

    // ── Hot Wheels loop halkaları (dünya uzayı) ──
    if (typeof Loops !== 'undefined') Loops.draw(ctx, camera, terrain);

    // ── Water for beach / swamp ───────────────────────────
    if (mapId === 'beach') {
      this._drawWater(ctx, camera, animTime);
    }
    if (mapId === 'swamp') {
      this._drawSwampWater(ctx, camera, animTime);
    }

    // ── Snow particles ────────────────────────────────────
    if (mapId === 'winter' || mapId === 'arctic') {
      Particles.snowfall(camera.x, camera.y, camera.width / camera.zoom, camera.height / camera.zoom);
    }

    // ── Particles (world-space, inside camera.apply) ──────
    Particles.draw(ctx);

    // ── Bot Vehicle ───────────────────────────────────────
    if (typeof Bot !== 'undefined' && Bot.active && Bot.vehicle && !Bot.vehicle.dead) {
      this._drawBotVehicle(ctx, Bot.vehicle, animTime);
    }

    // ── Araç dünya-uzayı FX (ORİJİNAL): far konisi, lastik izi, nitro alevi, alt parıltı ──
    if (vehicle && !vehicle.dead) {
      this._drawVehicleWorldFX(ctx, vehicle, vehicleId, mapId, animTime);
    }

    // ── Vehicle ───────────────────────────────────────────
    if (vehicle && !vehicle.dead) {
      drawVehicle(ctx, vehicle, vehicleId, vehicle.throttle, animTime);
    }

    // ── Araç gövdesi hasar/yıpranma katmanı (ORİJİNAL): gövde ÜSTÜNDE çizik/ezik/kurum/kir/cam çatlağı ──
    if (vehicle && !vehicle.dead) {
      this._drawVehicleDamageOverlay(ctx, vehicle, vehicleId, mapId, animTime);
    }

    // ── Cave ceiling stalactites (world-space) ────────────
    if (mapId === 'cave') {
      this._drawCaveCeiling(ctx, camera, animTime);
    }

    camera.restore(ctx);

    // ── Screen space effects ──────────────────────────────

    // ── Ortam: hava efektleri + gece karanlığı + afet flash (screen-space) ──
    if (typeof Environment !== 'undefined') Environment.drawScreen(ctx, W, H);
    // ── EK: hava-tepkili atmosfer ışık katmanları (terrain üstünde, HUD altında) ──
    this._atmosphereOverlay(ctx, W, H, mapId, animTime);
    // ── EK: hıza-tepkili hareket katmanı (dünya üstünde, HUD altında) ──
    this._speedOverlay(ctx, W, H, vehicle, animTime);
    // ── EK: ekran-uzayı görsel cila (DOF vinyet, güneş parlaması, kromatik
    //    kenar bloomu, opsiyonel film greni) — dünya üstünde, HUD altında;
    //    tek ek geçiş, pipeline sırası değişmez. ──
    this._screenPolish(ctx, W, H, vehicle, mapId, animTime);
    // ── EK: yere yakın yansıma parıltısı (su/plaj/sualtı/bataklık) veya sıcak
    //    haritalarda alçak ısı-serap şeridi — dünya üstünde, HUD altında; tek ek
    //    geçiş, pipeline sırası değişmez. ──
    this._groundShimmerOverlay(ctx, W, H, mapId, animTime);
    // ── EK: gece far konileri + kırmızı stop lambası ışıması (oyuncu aracı) ve
    //    uzak şehir siluetlerinde parlayan pencereler — YALNIZ gece; ayrı ek
    //    geçiş, dünya üstünde / HUD altında; pipeline sırası değişmez. ──
    this._nightGlowOverlay(ctx, W, H, mapId, vehicle, camera, animTime);
    // ── Oyun modları HUD: zamanlayıcı, boss barı, bitiş bandı (screen-space) ──
    if (typeof GameModes !== 'undefined') GameModes.drawHUD(ctx, W, H);

    // ── Ekran kontrolleri (mobil) — ayar açıkken görünür gaz/fren/boost butonları ──
    if (typeof Settings !== 'undefined' && Settings.get && Settings.get('mobileControls') && vehicle && !vehicle.dead) {
      this._drawTouchControls(ctx, W, H, vehicle);
    }

    // Arctic aurora overlay (screen-space)
    if (mapId === 'arctic') {
      this._drawAuroraOverlay(ctx, W, H, animTime);
    }

    if (vehicle && vehicle.boostActive) {
      // Odak noktasından yayılan, akan hız çizgileri (deterministik — titremesiz)
      ctx.save();
      const fx = W * 0.5, fy = H * 0.52;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineCap = 'round';
      const N = 26;
      const ring = H * 0.42;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + Math.sin(animTime * 2 + i) * 0.04;
        const seed = (i * 97.31) % 1;
        const r0 = H * 0.26 + ((animTime * 280 + seed * ring) % ring);
        const r1 = r0 + 42 + seed * 80;
        ctx.globalAlpha = 0.05 + (r0 / (H * 0.7)) * 0.16;
        ctx.lineWidth = 1 + seed * 1.6;
        ctx.beginPath();
        ctx.moveTo(fx + Math.cos(a) * r0, fy + Math.sin(a) * r0);
        ctx.lineTo(fx + Math.cos(a) * r1, fy + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
      // Mavi kenar vinyeti
      const bv = GradyanDeposu.rad(ctx, W/2, H/2, H*0.22, W/2, H/2, H*0.72, [0, 'rgba(0,100,255,0)', 1, 'rgba(0,120,255,0.16)']);
      ctx.fillStyle = bv; ctx.fillRect(0,0,W,H);
      // İnce kromatik saçak (hız hissi)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cf = GradyanDeposu.rad(ctx, W/2, H/2, H*0.32, W/2, H/2, H*0.75, [0, 'rgba(0,0,0,0)', 1, 'rgba(255,50,90,0.05)']);
      ctx.fillStyle = cf; ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    // Atmosferik vinyet (haritaya göre tonlanmış kenar)
    const vgTint = this._vignetteTint(mapId);
    const vg = GradyanDeposu.rad(ctx, W/2, H*0.52, H*0.28, W/2, H*0.52, H*0.8, [0, 'rgba(0,0,0,0)', 0.68, 'rgba(0,0,0,0.12)', 1, vgTint]);
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
  },

  // ════════════════════════════════════════════════════════════════════
  // ATMOSFER IŞIK KATMANLARI (EK — additive/multiply ekran-uzayı geçişleri)
  // drawGame içinde camera.restore SONRASI, HUD'dan ÖNCE çağrılır. Environment
  // durumunu (activeWeather / gece-gündüz) SAVUNMACI okur. Hiçbir mevcut efekt,
  // parallax arka plan yardımcısı (_bgParallaxDepth vb.) veya araç hasar/kir/mud/
  // gölge görseli DEĞİŞTİRİLMEZ — yalnızca dünya üzerine yarı saydam ışık geçişleri
  // EKLENİR. Ağır katmanlar _bgQuality (perfScale dâhil) ile ölçeklenir.
  // ════════════════════════════════════════════════════════════════════
  _atmoState() {
    // Savunmacı Environment okuması → normalize edilmiş atmosfer durumu.
    const s = { weather: 'clear', elev: 1, night: false, sunAng: null };
    try {
      if (typeof Environment !== 'undefined') {
        if (typeof Environment.activeWeather === 'string') s.weather = Environment.activeWeather;
        if (typeof Environment._sunElev === 'function') {
          const e = Environment._sunElev();
          if (typeof e === 'number' && isFinite(e)) s.elev = e;
        } else if (typeof Environment.timeOfDay === 'number') {
          const tod = Environment.timeOfDay;
          if (isFinite(tod)) s.elev = Math.sin((tod - 0.25) * Math.PI * 2);
        }
        if (typeof Environment.isNight === 'function') { try { s.night = !!Environment.isNight(); } catch (e2) {} }
        if (typeof Environment.sunAngle === 'number' && isFinite(Environment.sunAngle)) s.sunAng = Environment.sunAngle;
        else if (typeof Environment.lightDir === 'number' && isFinite(Environment.lightDir)) s.sunAng = Environment.lightDir;
      }
    } catch (e) {}
    return s;
  },

  _atmosphereOverlay(ctx, W, H, mapId, t) {
    let st;
    try { st = this._atmoState(); } catch (e) { return; }
    if (!st) return;
    let q = 1;
    try { q = this._bgQuality(); } catch (e) { q = 1; }
    if (!(q > 0)) return;
    const tt = (typeof t === 'number' && isFinite(t)) ? t : 0;
    try {
      const w = st.weather;
      if (w === 'rain')      this._atmoRain(ctx, W, H, tt, q);
      else if (w === 'snow') this._atmoSnow(ctx, W, H, tt, q);
      else if (w === 'fog')  this._atmoFog(ctx, W, H, tt, q);
      // Gündüz döngüsünden alçak-güneş sıcak ışıması — hava koşulundan bağımsız.
      this._atmoDusk(ctx, W, H, tt, q, st);
    } catch (e) {}
  },

  // ════════════════════════════════════════════════════════════════════
  // YERE YAKIN PARILTI KATMANI (EK — ekran-uzayı geçiş, dünya üstünde / HUD altında)
  // drawGame içinde camera.restore SONRASI, HUD'dan ÖNCE çağrılır. İki mod:
  //  • Su temalı haritalar (water/beach/underwater/swamp/pond/river/lake) →
  //    ekranın altına yakın yumuşak yansıma parıltısı + hafif dalga bandı.
  //  • Sıcak haritalar (desert/volcano/lava/wasteland) → alçak, ince ısı-serap şeridi.
  // Hiçbir mevcut efekt (araç hasar/kir görseli, parallax arka plan,
  // _atmosphereOverlay, _speedOverlay, _screenPolish, _drawTouchControls)
  // DEĞİŞTİRİLMEZ — yalnız yarı saydam ışık geçişi EKLENİR. mapId ile korunur,
  // _bgQuality (perfScale dâhil) ile ölçeklenir, reducedMotion açıkken
  // sakinleştirilir (kımıldayan bileşenler durur). Her şey savunmacı guard'lı.
  // ════════════════════════════════════════════════════════════════════
  _groundShimmerOverlay(ctx, W, H, mapId, t) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    const WATER = { water: 1, beach: 1, underwater: 1, swamp: 1, pond: 1, river: 1, lake: 1, ocean: 1 };
    const HOT   = { desert: 1, volcano: 1, lava: 1, wasteland: 1, dunes: 1, canyon: 1 };
    const isWater = !!WATER[mapId];
    const isHot   = !!HOT[mapId];
    if (!isWater && !isHot) return;

    let q = 1;
    try { q = this._bgQuality(); } catch (e) { q = 1; }
    if (!(q > 0)) return;

    let reduced = false;
    try {
      if (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion')) reduced = true;
    } catch (e) {}

    const tt = (typeof t === 'number' && isFinite(t)) ? t : 0;

    try {
      if (isWater) this._waterSheenBand(ctx, W, H, tt, q, reduced, mapId);
      else         this._heatMirageStrip(ctx, W, H, tt, q, reduced);
    } catch (e) {}
  },

  // Yere yakın yumuşak yansıma parıltısı + hafif kaygan dalga bandı (su temalı).
  _waterSheenBand(ctx, W, H, t, q, reduced, mapId) {
    // Sualtı biraz yukarıda, diğer su haritaları ekranın dibine yakın.
    const bandTop = (mapId === 'underwater') ? H * 0.60 : H * 0.72;
    const bandH   = H - bandTop;
    if (!(bandH > 0)) return;

    // Renk: sualtı/bataklık daha yeşilimsi-koyu, plaj/su daha açık camgöbeği.
    const cool = (mapId === 'swamp' || mapId === 'underwater');
    const sheen = cool ? '150,210,190' : '175,225,245';

    // 1) Taban yansıma parıltısı (screen) — sabit, titremesiz.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createLinearGradient(0, bandTop, 0, H);
    g.addColorStop(0,    'rgba(' + sheen + ',0)');
    g.addColorStop(0.55, 'rgba(' + sheen + ',' + (0.05 + 0.05 * q).toFixed(3) + ')');
    g.addColorStop(1,    'rgba(' + sheen + ',' + (0.10 + 0.08 * q).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, bandTop, W, bandH);
    ctx.restore();

    // 2) Yumuşak yatay dalga şeritleri (screen, deterministik). reducedMotion
    //    açıkken hareketsiz (faz sabit), yoksa yavaşça kayar.
    const rows = Math.max(2, Math.round((3 + 3 * q)));
    const phase = reduced ? 0 : t * 0.6;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < rows; i++) {
      const fr = (i + 0.5) / rows;              // 0..1 band içinde
      const y = bandTop + fr * bandH;
      const wob = reduced ? 0 : Math.sin(phase + i * 1.7) * (bandH * 0.02);
      const a = (0.03 + 0.05 * q) * (0.4 + 0.6 * fr);   // dibe doğru güçlenir
      ctx.globalAlpha = Math.min(0.16, a);
      ctx.fillStyle = 'rgba(' + sheen + ',0.9)';
      const lh = Math.max(1, bandH * 0.03);
      ctx.fillRect(0, y + wob, W, lh);
    }
    ctx.restore();

    // 3) Ufak parlak vurgu (dip kenarında ince ışık çizgisi) — su yüzeyi hissi.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const hg = GradyanDeposu.lin(ctx, 0, H - Math.max(2, bandH * 0.06), 0, H, [0, 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,' + (0.05 + 0.05 * q).toFixed(3) + ')']);
    ctx.fillStyle = hg;
    ctx.fillRect(0, H - Math.max(2, bandH * 0.06), W, Math.max(2, bandH * 0.06));
    ctx.restore();
  },

  // Alçak, ince ısı-serap şeridi (sıcak haritalar). Dilim dilim yatay ötelenmiş
  // saydam bantlarla titreşim hissi; reducedMotion açıkken hareket durur.
  _heatMirageStrip(ctx, W, H, t, q, reduced) {
    const stripTop = H * 0.74;
    const stripH   = H - stripTop;
    if (!(stripH > 0)) return;

    // Sıcak sarımsı-turuncu serap tonu (çok hafif).
    const warm = '255,220,170';

    // 1) Taban sıcak ışıma (screen) — sabit.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const g = GradyanDeposu.lin(ctx, 0, stripTop, 0, H, [0, 'rgba(' + warm + ',0)', 1, 'rgba(' + warm + ',' + (0.05 + 0.05 * q).toFixed(3) + ')']);
    ctx.fillStyle = g;
    ctx.fillRect(0, stripTop, W, stripH);
    ctx.restore();

    // 2) Yatay serap dilimleri — her dilim hafifçe yana kayarak titreşir.
    const slices = Math.max(4, Math.round(8 + 8 * q));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < slices; i++) {
      const fr = i / slices;
      const y = stripTop + fr * stripH;
      const sh = stripH / slices + 1;
      // Kayma miktarı: reducedMotion açıkken 0 (hareketsiz sıcak ışıma kalır).
      const shift = reduced ? 0 : Math.sin(t * 2.2 + fr * 6.0) * (W * 0.006) * (0.4 + fr);
      const a = (0.02 + 0.04 * q) * (0.3 + 0.7 * fr);   // dibe doğru güçlenir
      ctx.globalAlpha = Math.min(0.10, a);
      ctx.fillStyle = 'rgba(' + warm + ',0.8)';
      ctx.fillRect(shift, y, W, sh);
    }
    ctx.restore();
  },

  // ════════════════════════════════════════════════════════════════════
  // HIZ / HAREKET KATMANI (EK — ekran-uzayı geçiş, dünya üstünde / HUD altında)
  // Aracın hızına göre yoğunlaşan ince radyal hız çizgileri + hafif kenar
  // vinyeti ve dışa doğru bulanıklık ipucu. YALNIZCA yüksek hızda görünür;
  // düşük hızda tamamen kaybolur. Hız (vehicle.speed) SAVUNMACI okunur.
  // Settings.get('reducedMotion') açıkken hareket çizgileri atlanır ve efekt
  // yumuşatılır. Ağır kısımlar _bgQuality (perfScale dâhil) ile ölçeklenir.
  // Mevcut hiçbir efekt (araç hasar/kir görseli, parallax arka plan,
  // _atmosphereOverlay hava katmanı, boost hız çizgileri) DEĞİŞTİRİLMEZ —
  // bu ayrı, additive bir ekran-uzayı geçişidir.
  // ════════════════════════════════════════════════════════════════════
  _speedOverlay(ctx, W, H, vehicle, t) {
    if (!vehicle || vehicle.dead) return;
    // Savunmacı hız okuması.
    let sp = 0;
    try {
      sp = Math.abs(vehicle.speed || 0);
      if (typeof sp !== 'number' || !isFinite(sp)) return;
    } catch (e) { return; }

    // Eşik: bu hızın altında efekt yoktur (düşük hızda tamamen kaybolur).
    const LO = 12, HI = 34;
    if (sp <= LO) return;
    let intensity = (sp - LO) / (HI - LO);
    if (intensity > 1) intensity = 1;
    if (!(intensity > 0)) return;

    // reducedMotion: hareketli çizgileri/parıltıyı atla, efekti yumuşat.
    let reduced = false;
    try {
      if (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion')) reduced = true;
    } catch (e) {}

    let q = 1;
    try { q = this._bgQuality(); } catch (e) { q = 1; }
    if (!(q > 0)) return;
    if (reduced) intensity *= 0.4;

    const tt = (typeof t === 'number' && isFinite(t)) ? t : 0;
    const fx = W * 0.5, fy = H * 0.52;

    // ── Radyal hız çizgileri (additive, deterministik — titremesiz) ──
    if (!reduced) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const N = Math.round((16 + intensity * 22) * (0.5 + 0.5 * q));
      const ring = H * 0.55;
      const rInner = H * 0.30;
      const flow = tt * (240 + intensity * 360);
      for (let i = 0; i < N; i++) {
        const seed = (i * 61.79) % 1;
        const a = (i / N) * Math.PI * 2 + Math.sin(tt * 1.6 + i * 0.7) * 0.05;
        const r0 = rInner + ((flow + seed * ring) % ring);
        const r1 = r0 + (26 + seed * 70) * (0.5 + intensity);
        const edge = Math.max(0, (r0 - rInner) / ring);   // kenara doğru güçlenir
        ctx.globalAlpha = Math.min(0.22, (0.04 + 0.10 * intensity) * edge);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1 + seed * 1.4;
        ctx.beginPath();
        ctx.moveTo(fx + Math.cos(a) * r0, fy + Math.sin(a) * r0);
        ctx.lineTo(fx + Math.cos(a) * r1, fy + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Hız vinyeti: kenar koyulaşması (bulanıklık hissi), hıza göre daralır ──
    ctx.save();
    const vig = GradyanDeposu.rad(ctx, fx, fy, H * (0.34 - 0.06 * intensity), fx, fy, H * 0.82, [0, 'rgba(0,0,0,0)', 0.7, 'rgba(0,0,0,' + (0.05 * intensity).toFixed(3) + ')', 1, 'rgba(0,0,0,' + (0.20 * intensity).toFixed(3) + ')']);
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // ── Kenar bulanıklık ipucu: dışa doğru soluk beyaz halka (screen) ──
    if (!reduced) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const gl = GradyanDeposu.rad(ctx, fx, fy, H * 0.42, fx, fy, H * 0.85, [0, 'rgba(255,255,255,0)', 1, 'rgba(235,242,255,' + (0.05 * intensity * q).toFixed(3) + ')']);
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },

  // ════════════════════════════════════════════════════════════════════
  // GECE IŞIMA KATMANI (EK — additive ekran-uzayı geçişi, dünya üstünde /
  // HUD altında). drawGame içinde camera.restore SONRASI, _groundShimmerOverlay'den
  // SONRA, HUD'dan ÖNCE tek bir ek geçiş olarak çağrılır. YALNIZCA gece
  // (Environment gece-gündüz _atmoState ile savunmacı okunur) etkinleşir. İki alt katman:
  //  • Oyuncu aracının yumuşak far konileri (öne) + kırmızı stop lambası ışıması (arkaya).
  //  • Uzak şehir siluetlerinde (city / neon_city) nazik parlayan pencere ışıması.
  // Hiçbir mevcut efekt (araç hasar/kir görseli, parallax arka plan,
  // _atmosphereOverlay, _speedOverlay, _screenPolish, _groundShimmerOverlay,
  // _drawTouchControls) DEĞİŞTİRİLMEZ — yalnız yeni, ayrı, yarı saydam additive
  // ışık geçişi EKLENİR. _bgQuality (perfScale dâhil) ile ölçeklenir, reducedMotion
  // açıkken nabız/titreşim durur (sabit ışıma kalır). Her alt katman try/catch ile izole.
  // ════════════════════════════════════════════════════════════════════
  _nightGlowOverlay(ctx, W, H, mapId, vehicle, camera, t) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    // Gece guard: yalnız gece çiz (savunmacı Environment okuması).
    let st = null;
    try { st = this._atmoState(); } catch (e) { st = null; }
    if (!st || !st.night) return;
    let q = 1;
    try { q = this._bgQuality(); } catch (e) { q = 1; }
    if (!(q > 0)) return;
    let reduced = false;
    try {
      if (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion')) reduced = true;
    } catch (e) {}
    const tt = (typeof t === 'number' && isFinite(t)) ? t : 0;
    // 1) Oyuncu aracı far konileri + kırmızı stop lambası ışıması.
    try { this._nightVehicleGlow(ctx, W, H, vehicle, camera, tt, q, reduced); } catch (e) {}
    // 2) Uzak şehir pencereleri (yalnız city / neon_city).
    try {
      if (mapId === 'city' || mapId === 'neon_city') {
        this._nightCityWindows(ctx, W, H, mapId, camera, tt, q, reduced);
      }
    } catch (e) {}
  },

  // Oyuncu aracının gece far konileri (öne, sıcak beyaz) + kırmızı stop lambası
  // ışıması (arkaya). Aracın ekran konumu camera.worldToScreen ile, yönü
  // vehicle.angle ile savunmacı okunur; ekran dışıysa çizilmez. additive
  // ('lighter'). reducedMotion açıkken hafif nabız durur (sabit kalır).
  _nightVehicleGlow(ctx, W, H, vehicle, camera, t, q, reduced) {
    if (!vehicle || vehicle.dead) return;
    // Araç dünya konumu → ekran konumu (savunmacı).
    let sx, sy;
    try {
      if (camera && typeof camera.worldToScreen === 'function' &&
          typeof vehicle.x === 'number' && typeof vehicle.y === 'number') {
        const s = camera.worldToScreen(vehicle.x, vehicle.y);
        if (s) { sx = s.x; sy = s.y; }
      }
    } catch (e) {}
    if (typeof sx !== 'number' || !isFinite(sx) || typeof sy !== 'number' || !isFinite(sy)) {
      // Yedek: araç genelde ekran ortasına yakın.
      sx = W * 0.5; sy = H * 0.52;
    }
    // Ekran dışındaysa (küçük pay ile) çizme.
    if (sx < -W * 0.4 || sx > W * 1.4 || sy < -H * 0.4 || sy > H * 1.4) return;
    // Yön: vehicle.angle (radyan). Yerel +x ileri kabul edilir.
    let ang = 0;
    try { if (typeof vehicle.angle === 'number' && isFinite(vehicle.angle)) ang = vehicle.angle; } catch (e) {}
    // Ölçek: kamera zoom ile araç boyutuna orantılı; yoksa makul sabit.
    let zoom = 1;
    try { if (camera && typeof camera.zoom === 'number' && isFinite(camera.zoom) && camera.zoom > 0) zoom = camera.zoom; } catch (e) {}
    const unit = Math.max(20, Math.min(H * 0.5, 46 * zoom));   // ~araç uzunluğu ölçeği
    const fwdX = Math.cos(ang), fwdY = Math.sin(ang);
    const perpX = -fwdY, perpY = fwdX;
    // Hafif nabız (reducedMotion açıkken sabit).
    const pulse = reduced ? 1 : (0.9 + 0.1 * Math.sin(t * 4));

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ── Far konisi (öne, sıcak beyaz) ──
    const headX = sx + fwdX * unit * 0.9 - fwdY * unit * 0.18;
    const headY = sy + fwdY * unit * 0.9 + fwdX * unit * 0.18;
    const coneLen = unit * (2.6 + 1.2 * q) * pulse;
    const coneW = unit * (0.9 + 0.5 * q);
    const tipX = headX + fwdX * coneLen;
    const tipY = headY + fwdY * coneLen;
    const cg = GradyanDeposu.lin(ctx, headX, headY, tipX, tipY, [0, 'rgba(255,244,210,' + (0.22 * q * pulse).toFixed(3) + ')', 0.5, 'rgba(255,240,200,' + (0.10 * q).toFixed(3) + ')', 1, 'rgba(255,236,190,0)']);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(headX + perpX * coneW * 0.18, headY + perpY * coneW * 0.18);
    ctx.lineTo(tipX + perpX * coneW, tipY + perpY * coneW);
    ctx.lineTo(tipX - perpX * coneW, tipY - perpY * coneW);
    ctx.lineTo(headX - perpX * coneW * 0.18, headY - perpY * coneW * 0.18);
    ctx.closePath();
    ctx.fill();
    // Far kaynağı yumuşak nokta parıltısı.
    const hg = GradyanDeposu.rad(ctx, headX, headY, 0, headX, headY, unit * 0.7, [0, 'rgba(255,248,220,' + (0.5 * pulse).toFixed(3) + ')', 1, 'rgba(255,244,210,0)']);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(headX, headY, unit * 0.7, 0, Math.PI * 2); ctx.fill();

    // ── Kırmızı stop lambası ışıması (arkaya) ──
    const tailX = sx - fwdX * unit * 0.9 - fwdY * unit * 0.10;
    const tailY = sy - fwdY * unit * 0.9 + fwdX * unit * 0.10;
    const tg = GradyanDeposu.rad(ctx, tailX, tailY, 0, tailX, tailY, unit * 0.85, [0, 'rgba(255,60,40,' + (0.42 * pulse).toFixed(3) + ')', 0.6, 'rgba(220,30,20,0.160)', 1, 'rgba(200,20,15,0)']);
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(tailX, tailY, unit * 0.85, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  },

  // Uzak şehir siluetlerinde (city / neon_city) nazik parlayan pencere ışıması —
  // ufuk bandında deterministik yumuşak pencere noktaları, hafif parallax ile
  // derinlik. Ekran-uzayı additive geçiş; _bgCity / _bgNeonCity siluetlerini
  // DEĞİŞTİRMEZ, yalnız üzerine yumuşak ışıma ekler. reducedMotion açıkken
  // titreme (flicker) durur, sabit ışıma kalır. _bgQuality ile nokta sayısı ölçeklenir.
  _nightCityWindows(ctx, W, H, mapId, camera, t, q, reduced) {
    const neon = (mapId === 'neon_city');
    // Ufuk bandı (ekran fraksiyonu) — siluetlerin oturduğu yaklaşık bölge.
    const bandTop = H * 0.30, bandBot = H * 0.56;
    const bandH = bandBot - bandTop;
    if (!(bandH > 0)) return;
    // Hafif parallax kayması (kamera x'e bağlı).
    let camX = 0;
    try { if (camera && typeof camera.x === 'number' && isFinite(camera.x)) camX = camera.x; } catch (e) {}
    const span = W * 1.2;
    const shift = -camX * 0.05;
    const count = Math.round((neon ? 90 : 60) * (0.4 + 0.6 * q));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      // Deterministik yatay dağılım + parallax kayması (sarmalı).
      const base = (i * 137.31) % span;
      const sx = (((base + shift) % span) + span) % span - W * 0.1;
      const rowSeed = (i * 53.17) % 1;
      const sy = bandTop + rowSeed * bandH;
      // Titreme (reducedMotion açıkken sabit).
      let on = true, glow = 0.5;
      if (!reduced) {
        on = Math.sin(t * 2.2 + i * 1.7) > -0.6;
        glow = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.9));
      }
      if (!on) continue;
      // Ufka yakın (üstte) daha soluk → derinlik hissi.
      const depth = 1 - (sy - bandTop) / bandH;      // üstte 1, altta 0
      const a = (neon ? 0.16 : 0.11) * q * glow * (0.5 + 0.5 * (1 - depth));
      const r = (neon ? 3.2 : 2.4) * (0.7 + 0.6 * (1 - depth));
      // Renk: neon → soğuk camgöbeği/macenta; klasik → sıcak sarı/mavi.
      let col;
      if (neon) {
        col = (i % 3 === 0) ? '255,80,220' : (i % 3 === 1 ? '80,220,255' : '180,120,255');
      } else {
        col = (i % 5 === 0) ? '170,205,255' : '255,235,170';
      }
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
      g.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, r * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ════════════════════════════════════════════════════════════════════
  // EKRAN-UZAYI GÖRSEL CİLA (EK — additive/post geçişleri, dünya üstünde /
  // HUD altında). drawGame içinde camera.restore SONRASI, _speedOverlay'den
  // SONRA, HUD'dan ÖNCE tek bir ek geçiş olarak çağrılır. Mevcut hiçbir efekt
  // (araç hasar/kir görseli, parallax arka plan, _atmosphereOverlay hava
  // katmanı, _speedOverlay hareket katmanı, _drawTouchControls) DEĞİŞTİRİLMEZ —
  // yalnızca yeni, ayrı, yarı saydam ekran-uzayı katmanları EKLENİR. Ağır
  // kısımlar _bgQuality (perfScale dâhil) ile ölçeklenir; reducedMotion açıkken
  // hareket yumuşatılır. Her alt katman savunmacı try/catch ile izole edilir.
  // ════════════════════════════════════════════════════════════════════
  _screenPolish(ctx, W, H, vehicle, mapId, t) {
    let q = 1;
    try { q = this._bgQuality(); } catch (e) { q = 1; }
    if (!(q > 0)) return;
    let reduced = false;
    try {
      if (typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion')) reduced = true;
    } catch (e) {}
    const tt = (typeof t === 'number' && isFinite(t)) ? t : 0;
    let st = null;
    try { st = this._atmoState(); } catch (e) { st = null; }

    // 1) Yumuşak derinlik-alan (DOF) vinyeti — sakinken geniş, hızda hafif daralır.
    try { this._polishDepthVignette(ctx, W, H, vehicle, q); } catch (e) {}
    // 2) Güneşe bakınca dinamik lens parlaması (yalnız gündüz; yön/yükseklik savunmacı).
    try { this._polishSunFlare(ctx, W, H, st, tt, q, reduced); } catch (e) {}
    // 3) Yüksek hızda nazik kromatik kenar bloomu (RGB saçak; düşük hızda kaybolur).
    try { this._polishChromaticBloom(ctx, W, H, vehicle, q, reduced); } catch (e) {}
    // 4) Film greni + tarama çizgisi — YALNIZCA Settings bayrağı açıkken (guard).
    try {
      let on = false;
      try {
        on = !!(typeof Settings !== 'undefined' && Settings.get &&
          (Settings.get('filmGrain') || Settings.get('retroFilter')));
      } catch (e2) {}
      if (on) this._polishFilmGrain(ctx, W, H, tt, q, reduced);
    } catch (e) {}
  },

  // Yumuşak derinlik-alan (DOF) vinyeti: kenarlara doğru çok hafif koyulaşma.
  // Mevcut harita/hız vinyetlerinden BAĞIMSIZ, çok düşük yoğunluklu. Araç
  // yavaş/duruyorken (menü benzeri sakin) odak geniş; hızlanınca hafifçe
  // daralır. Salt görsel; oyun görüşünü kapatmaz. Hız savunmacı okunur.
  _polishDepthVignette(ctx, W, H, vehicle, q) {
    let sp = 0;
    try { sp = Math.abs((vehicle && vehicle.speed) || 0); if (!isFinite(sp)) sp = 0; } catch (e) { sp = 0; }
    const focus = Math.min(1, sp / 40);            // 0 = sakin (menü hissi), 1 = yarış
    const cx = W * 0.5, cy = H * 0.5;
    const inner = H * (0.54 - 0.10 * focus);       // hızda odak daralır
    const outer = H * 0.94;
    const strength = (0.09 + 0.05 * focus) * (0.6 + 0.4 * q);
    ctx.save();
    const g = GradyanDeposu.rad(ctx, cx, cy, inner, cx, cy, outer, [0, 'rgba(0,0,0,0)', 0.72, 'rgba(0,0,0,' + (strength * 0.35).toFixed(3) + ')', 1, 'rgba(0,0,0,' + strength.toFixed(3) + ')']);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // Güneşe bakınca dinamik lens parlaması: alçak-orta yükseklikte güneş ekran
  // içindeyken güneş konumundan ekran merkezine hizalı yumuşak parıltı +
  // anamorfik yatay çizgi + eksen boyunca birkaç hayalet halka. Additive,
  // YALNIZ gündüz. Yön/yükseklik _atmoState'ten savunmacı okunur; güneş yatayda
  // kenara yakınken (ona "bakarken") parlama güçlenir. reducedMotion açıkken
  // titreşim/çizgi yumuşatılır.
  _polishSunFlare(ctx, W, H, st, t, q, reduced) {
    if (!st || st.night) return;
    const elev = (typeof st.elev === 'number' && isFinite(st.elev)) ? st.elev : 1;
    if (!(elev > 0.02)) return;                    // güneş ufkun üstünde olmalı
    let side = 0.5;
    if (typeof st.sunAng === 'number' && isFinite(st.sunAng)) side = 0.5 + Math.cos(st.sunAng) * 0.42;
    side = Math.max(0.06, Math.min(0.94, side));
    const sunX = W * side;
    const sunY = H * (0.30 - 0.18 * Math.min(1, elev));   // yüksek güneş daha yukarıda
    const face = Math.max(0, 1 - Math.abs(side - 0.5) / 0.5); // merkeze bakış hizası
    let str = Math.min(1, elev * 1.4) * (0.30 + 0.70 * face);
    if (str <= 0.02) return;
    if (reduced) str *= 0.5;
    const tw = reduced ? 1 : (0.88 + 0.12 * Math.sin(t * 2.6));
    const cx = W * 0.5, cy = H * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Ana yumuşak parıltı diski.
    const core = GradyanDeposu.rad(ctx, sunX, sunY, 0, sunX, sunY, H * (0.10 + 0.12 * str), [0, 'rgba(255,246,214,' + (0.16 * str * tw).toFixed(3) + ')', 0.4, 'rgba(255,224,170,' + (0.07 * str * tw).toFixed(3) + ')', 1, 'rgba(255,210,150,0)']);
    ctx.fillStyle = core; ctx.fillRect(0, 0, W, H);
    // Anamorfik yatay çizgi (streak) — sakin modda atlanır.
    if (!reduced) {
      const streakW = W * (0.26 + 0.30 * str);
      const streakH = Math.max(2, H * 0.008);
      const sg = GradyanDeposu.lin(ctx, sunX - streakW, sunY, sunX + streakW, sunY, [0, 'rgba(255,230,180,0)', 0.5, 'rgba(255,240,205,' + (0.10 * str * tw).toFixed(3) + ')', 1, 'rgba(255,230,180,0)']);
      ctx.fillStyle = sg;
      ctx.fillRect(sunX - streakW, sunY - streakH * 0.5, streakW * 2, streakH);
    }
    // Merkez ekseni boyunca birkaç hayalet halka (renkli — hafif ayrışma).
    const ghosts = Math.max(1, Math.round(3 * q));
    for (let i = 1; i <= ghosts; i++) {
      const f = i / (ghosts + 1);
      const gx = sunX + (cx - sunX) * (0.6 + 1.1 * f);
      const gy = sunY + (cy - sunY) * (0.6 + 1.1 * f);
      const gr = H * (0.02 + 0.05 * (1 - f));
      const ga = 0.05 * str * (1 - f) * tw;
      if (ga <= 0.004) continue;
      const hue = (i % 2 === 0) ? '150,200,255' : '255,205,170';
      const gg = GradyanDeposu.rad(ctx, gx, gy, 0, gx, gy, gr, [0, 'rgba(' + hue + ',' + ga.toFixed(3) + ')', 1, 'rgba(' + hue + ',0)']);
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // Yüksek hızda nazik kromatik kenar bloomu: ekran çevresine doğru çok hafif
  // kırmızı/cyan RGB saçak (screen composite). YALNIZ yüksek hızda görünür;
  // düşük hızda tamamen kaybolur. _speedOverlay'den (beyaz radyal çizgiler)
  // AYRI ve farklıdır — bu, renk ayrışması hissidir. Hız savunmacı okunur.
  _polishChromaticBloom(ctx, W, H, vehicle, q, reduced) {
    let sp = 0;
    try { sp = Math.abs((vehicle && vehicle.speed) || 0); if (!isFinite(sp)) return; } catch (e) { return; }
    const LO = 30, HI = 52;
    if (sp <= LO) return;                          // düşük hızda hiç yok
    let k = (sp - LO) / (HI - LO);
    if (k > 1) k = 1;
    if (!(k > 0)) return;
    if (reduced) k *= 0.5;
    const cx = W * 0.5, cy = H * 0.52;
    const inner = H * 0.44, outer = H * 0.9;
    const dx = W * 0.012;                           // R/C zıt yönlere kayar → ayrışma
    const aR = 0.05 * k * q;
    const aC = 0.05 * k * q;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const rg = GradyanDeposu.rad(ctx, cx + dx, cy, inner, cx + dx, cy, outer, [0, 'rgba(255,40,60,0)', 1, 'rgba(255,40,60,' + aR.toFixed(3) + ')']);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    const cg = GradyanDeposu.rad(ctx, cx - dx, cy, inner, cx - dx, cy, outer, [0, 'rgba(40,230,255,0)', 1, 'rgba(40,230,255,' + aC.toFixed(3) + ')']);
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // Film greni + hafif tarama çizgileri (retro post). YALNIZCA Settings bayrağı
  // ('filmGrain' veya 'retroFilter') açıkken _screenPolish tarafından çağrılır.
  // Ucuz: küçük gürültü karosu bir kez üretilip önbelleğe alınır (_grainTile),
  // düşük alfa ile döşenir. reducedMotion açıkken statik (kaymayan) gren. Ağır
  // kısımlar _bgQuality ile ölçeklenir. document yoksa savunmacı çıkar.
  _polishFilmGrain(ctx, W, H, t, q, reduced) {
    let tile = this._grainTile;
    if (!tile) {
      try {
        if (typeof document === 'undefined') return;
        const S = 128;
        const c = document.createElement('canvas');
        c.width = S; c.height = S;
        const tctx = c.getContext('2d');
        const img = tctx.createImageData(S, S);
        const d = img.data;
        let seed = 1337;                            // deterministik → titremesiz karo
        for (let i = 0; i < d.length; i += 4) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const v = (seed >> 8) & 0xff;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        tctx.putImageData(img, 0, 0);
        this._grainTile = tile = c;
      } catch (e) { return; }
    }
    const ts = tile.width;
    // Gren karosunu döşe (reducedMotion değilse zamanla kaydır).
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.05 + 0.04 * q;
    const off = reduced ? 0 : ((t * 60) | 0);
    const ox = -(off % ts), oy = -(((off * 1.7) | 0) % ts);
    for (let y = oy; y < H; y += ts) {
      for (let x = ox; x < W; x += ts) {
        ctx.drawImage(tile, x, y);
      }
    }
    ctx.restore();
    // Hafif tarama çizgileri (statik, çok düşük yoğunluk).
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.05 + 0.03 * q;
    ctx.fillStyle = '#000';
    const step = 3;
    for (let y = 0; y < H; y += step) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  },

  // Yağmur: serin/koyu yıkama (multiply) + ıslak zemin parıltısı (additive glimmer).
  _atmoRain(ctx, W, H, t, q) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const wash = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(122,140,170,1)', 1, 'rgba(92,106,136,1)']);
    ctx.globalAlpha = 0.20 + 0.10 * q;
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gy = H * 0.72;
    const sheen = GradyanDeposu.lin(ctx, 0, gy, 0, H, [0, 'rgba(150,180,220,0)', 1, 'rgba(140,175,215,' + (0.06 + 0.06 * q).toFixed(3) + ')']);
    ctx.fillStyle = sheen; ctx.fillRect(0, gy, W, H - gy);
    const N = Math.round(4 + q * 5);
    for (let i = 0; i < N; i++) {
      const seed = (i * 73.13) % 1;
      const x = ((seed * W) + t * (16 + seed * 30)) % (W + 120) - 60;
      const y = gy + (0.2 + seed * 0.7) * (H - gy);
      const r = 20 + seed * 46;
      const a = (0.05 + 0.06 * q) * (0.55 + 0.45 * Math.sin(t * 2 + i * 1.3));
      const g = GradyanDeposu.rad(ctx, x, y, 0, x, y, r, [0, 'rgba(180,205,240,' + Math.max(0, a).toFixed(3) + ')', 1, 'rgba(180,205,240,0)']);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // Kar: yumuşak mavi-beyaz aydınlatma (additive) + sis-difüze ışık (soft bloom).
  _atmoSnow(ctx, W, H, t, q) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createLinearGradient(0, 0, 0, H);
    glow.addColorStop(0, 'rgba(200,220,255,' + (0.05 + 0.05 * q).toFixed(3) + ')');
    glow.addColorStop(0.6, 'rgba(225,235,255,' + (0.03 + 0.03 * q).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(235,242,255,' + (0.07 + 0.07 * q).toFixed(3) + ')');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.09 + 0.10 * q;
    const bloom = GradyanDeposu.rad(ctx, W * 0.5, H * 0.32, H * 0.1, W * 0.5, H * 0.42, H * 0.85, [0, 'rgba(245,248,255,0.5)', 1, 'rgba(220,232,255,0)']);
    ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // Sis: kontrast düşüren gri örtü (normal) + eğik yumuşak ışık huzmeleri (additive).
  _atmoFog(ctx, W, H, t, q) {
    ctx.save();
    const veil = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(175,182,190,0.17)', 0.5, 'rgba(168,176,186,0.11)', 1, 'rgba(150,158,170,0.19)']);
    ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const N = Math.round(3 + q * 3);
    const shear = 0.28;
    for (let i = 0; i < N; i++) {
      const seed = (i * 61.7) % 1;
      const baseX = (i / N) * W + Math.sin(t * 0.25 + i) * 40 + seed * 60;
      const sw = 60 + seed * 120;
      const a = (0.03 + 0.04 * q) * (0.55 + 0.45 * Math.sin(t * 0.6 + i * 1.7));
      ctx.save();
      ctx.translate(baseX, -H * 0.1);
      ctx.transform(1, 0, shear, 1, 0, 0);
      const sh = GradyanDeposu.lin(ctx, 0, 0, 0, H * 1.3, [0, 'rgba(255,250,225,' + Math.max(0, a).toFixed(3) + ')', 0.5, 'rgba(255,248,220,' + Math.max(0, a * 0.5).toFixed(3) + ')', 1, 'rgba(255,245,215,0)']);
      ctx.fillStyle = sh;
      ctx.fillRect(-sw * 0.5, 0, sw, H * 1.3);
      ctx.restore();
    }
    ctx.restore();
  },

  // Alacakaranlık/şafak: alçak güneşin sıcak ışıması (additive, yön odaklı) + ufuk bandı.
  _atmoDusk(ctx, W, H, t, q, st) {
    if (st.night) return;
    const elev = st.elev;
    if (!(elev < 0.42 && elev > -0.12)) return;
    const f = Math.max(0, 1 - Math.abs(elev - 0.10) / 0.34);
    if (f <= 0.02) return;
    let side = 0.5;
    if (typeof st.sunAng === 'number' && isFinite(st.sunAng)) side = 0.5 + Math.cos(st.sunAng) * 0.42;
    side = Math.max(0.12, Math.min(0.88, side));
    const gx = W * side, gy = H * 0.62;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = (0.16 + 0.12 * q) * f;
    const glow = GradyanDeposu.rad(ctx, gx, gy, 0, gx, gy, H * (0.6 + 0.3 * q), [0, 'rgba(255,180,110,' + a.toFixed(3) + ')', 0.4, 'rgba(255,150,80,' + (a * 0.5).toFixed(3) + ')', 1, 'rgba(255,120,60,0)']);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    const ba = (0.08 + 0.07 * q) * f;
    const band = GradyanDeposu.lin(ctx, 0, H * 0.45, 0, H, [0, 'rgba(255,140,70,0)', 1, 'rgba(255,120,55,' + ba.toFixed(3) + ')']);
    ctx.fillStyle = band; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    ctx.restore();
  },

  _drawBackground(ctx, camera, mapId, t) {
    const W = camera.width / camera.zoom;
    const camX = camera.x, camY = camera.y;
    // Ek uzak parallax derinlik katmanları — TÜM harita çiziminin ARKASINDA,
    // terrain'den önce (drawGame sıralaması korunur, yalnızca ARKA katman eklenir).
    this._bgParallaxDepth(ctx, camX, camY, W, t, mapId);
    switch(mapId) {
      case 'countryside': this._bgCountryside(ctx, camX, camY, W, t); break;
      case 'desert':      this._bgDesert(ctx, camX, camY, W, t); break;
      case 'winter':      this._bgWinter(ctx, camX, camY, W, t); break;
      case 'beach':       this._bgBeach(ctx, camX, camY, W, t); break;
      case 'mountains':   this._bgMountains(ctx, camX, camY, W, t); break;
      case 'city':        this._bgCity(ctx, camX, camY, W, t); break;
      case 'arctic':      this._bgArctic(ctx, camX, camY, W, t); break;
      case 'jungle':      this._bgJungle(ctx, camX, camY, W, t); break;
      case 'mars':        this._bgMars(ctx, camX, camY, W, t); break;
      case 'cave':        this._bgCave(ctx, camX, camY, W, t); break;
      case 'highland':    this._bgHighland(ctx, camX, camY, W, t); break;
      case 'swamp':       this._bgSwamp(ctx, camX, camY, W, t); break;
      case 'volcano':     this._bgVolcano(ctx, camX, camY, W, t); break;
      case 'underwater':  this._bgUnderwater(ctx, camX, camY, W, t); break;
      case 'moon':        this._bgMoon(ctx, camX, camY, W, t); break;
      case 'neon_city':   this._bgNeonCity(ctx, camX, camY, W, t); break;
      case 'wasteland':   this._bgWasteland(ctx, camX, camY, W, t); break;
      case 'canyon':      this._bgCanyon(ctx, camX, camY, W, t); break;
    }
  },

  // ── Additive parallax depth helpers (ORİJİNAL) ─────────
  // Bunlar Environment modülünün gökyüzü tint/hava/gece-gündüz katmanıyla
  // ÇAKIŞMAZ; sadece uzak siluet, bulut ve ufuk pusu derinliği ekler.
  // Tümü _drawBackground içinde (camera.apply sonrası, dünya-uzayı) çağrılır.
  // Parallax: uzak katman -cx*faktör ile yavaş kayar. Faktör küçüldükçe uzaklaşır.

  // Yumuşak dikey gökyüzü derinlik gradyanı (üst berrak → ufuk pusu).
  // topRGBA/botRGBA yarı saydam olmalı ki Environment tint'i bozulmasın.
  _bgSkyDepth(ctx, cx, cy, W, topRGBA, botRGBA, topFrac, botFrac) {
    const y0 = cy + (topFrac != null ? topFrac : -40);
    const y1 = cy + (botFrac != null ? botFrac : 300);
    const g = GradyanDeposu.lin(ctx, 0, y0, 0, y1, [0, topRGBA, 1, botRGBA]);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(cx - W * 0.2, y0, W * 1.4, y1 - y0);
    ctx.restore();
  },

  // Tek bir uzak siluet katmanı (tepe/dağ dalgası). parallax küçük katsayı.
  // amp: tepe yüksekliği, baseY: taban çizgisi (cy+baseY), rough: dalga sıklığı.
  _bgFarRidge(ctx, cx, cy, W, opt) {
    const o = opt || {};
    const parallax = o.parallax != null ? o.parallax : 0.15;
    const shift = -cx * parallax;
    const baseY = cy + (o.baseY != null ? o.baseY : 260);
    const amp = o.amp != null ? o.amp : 120;
    const rough = o.rough != null ? o.rough : 0.8;
    const seed = o.seed != null ? o.seed : 0;
    const steps = o.steps != null ? o.steps : 14;
    const span = W * 1.5;
    const x0 = cx - W * 0.25;
    // Ufuk çizgisi noktalarını bir kez hesapla (siluet + isteğe bağlı kar başlığı paylaşır)
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const rx = x0 + f * span;
      const nRaw = Math.abs(Math.sin(i * rough + seed))
                 + Math.abs(Math.sin(i * rough * 2.3 + seed * 1.7)) * 0.45
                 + Math.abs(Math.sin(i * rough * 5.1 + seed * 0.6)) * 0.18; // ekstra detay tırtıklı sırt
      const ry = baseY - (nRaw / 1.63) * amp + Math.sin(rx * 0.0015 + seed) * amp * 0.12;
      pts.push({ rx, ry, n: nRaw / 1.63 });
    }
    // Siluet dolgusu — temiz parallax için translate(shift) ile
    ctx.save();
    ctx.translate(shift, 0);
    // İsteğe bağlı dikey ton gradyanı (üst açık → alt koyu) daha hacimli görünsün
    if (o.gradTop) {
      const g2 = GradyanDeposu.lin(ctx, 0, baseY - amp, 0, baseY + 60, [0, o.gradTop, 1, o.color || '#556']);
      ctx.fillStyle = g2;
    } else {
      ctx.fillStyle = o.color || '#556';
    }
    ctx.beginPath();
    ctx.moveTo(x0, baseY + 60);
    for (const p of pts) ctx.lineTo(p.rx, p.ry);
    ctx.lineTo(x0 + span, baseY + 60);
    ctx.closePath();
    ctx.fill();
    if (o.snow) {
      // Kar başlığı: yüksek tepelere yumuşak beyaz taç (önceden hesaplanan pts'i tekrar kullan)
      ctx.fillStyle = o.snowColor || 'rgba(240,248,255,0.9)';
      for (const p of pts) {
        if (p.n > 0.6) {
          ctx.beginPath();
          ctx.moveTo(p.rx, p.ry);
          ctx.lineTo(p.rx - amp * 0.11, p.ry + amp * 0.17);
          ctx.lineTo(p.rx - amp * 0.03, p.ry + amp * 0.12);
          ctx.lineTo(p.rx + amp * 0.05, p.ry + amp * 0.16);
          ctx.lineTo(p.rx + amp * 0.11, p.ry + amp * 0.17);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    // İsteğe bağlı: sırt tabanında hafif atmosferik puslama (uzaklık hissi)
    if (o.mistBase) {
      const mg = GradyanDeposu.lin(ctx, 0, baseY - amp * 0.2, 0, baseY + 60, [0, 'rgba(0,0,0,0)', 1, o.mistBase]);
      ctx.fillStyle = mg;
      ctx.fillRect(x0, baseY - amp * 0.2, span, amp * 0.2 + 60);
    }
    ctx.restore();
  },

  // Yavaş kayan yumuşak bulut bandı (yatay). speed: dünya sürükleme oranı.
  _bgCloudBand(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const parallax = o.parallax != null ? o.parallax : 0.08;
    const drift = (t * (o.speed != null ? o.speed : 6));
    const shift = -cx * parallax + drift;
    const count = o.count != null ? o.count : 4;
    const baseY = cy + (o.baseY != null ? o.baseY : 90);
    const spread = o.spread != null ? o.spread : W * 1.4;
    const scale = o.scale != null ? o.scale : 1;
    const col = o.color || 'rgba(255,255,255,0.55)';
    ctx.save();
    ctx.fillStyle = col;
    for (let i = 0; i < count; i++) {
      const seed = i * 977.3 + (o.seed || 0);
      const raw = (seed % spread) + shift;
      const px = cx - W * 0.2 + ((raw % (spread + 200) + (spread + 200)) % (spread + 200));
      const py = baseY + Math.sin(i * 1.7 + (o.seed || 0)) * (o.yVar != null ? o.yVar : 26);
      const r = (24 + (i % 3) * 10) * scale;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.arc(px + r * 0.9, py + r * 0.18, r * 0.75, 0, Math.PI * 2);
      ctx.arc(px - r * 0.85, py + r * 0.22, r * 0.62, 0, Math.PI * 2);
      ctx.arc(px + r * 0.35, py - r * 0.35, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // Ufuk pusu: yatay atmosferik bant (uzak katmanları yumuşatır).
  _bgHorizonHaze(ctx, cx, cy, W, opt) {
    const o = opt || {};
    const y0 = cy + (o.topFrac != null ? o.topFrac : 150);
    const y1 = cy + (o.botFrac != null ? o.botFrac : 300);
    const g = GradyanDeposu.lin(ctx, 0, y0, 0, y1, [0, o.color0 || 'rgba(255,255,255,0)', 1, o.color1 || 'rgba(255,255,255,0.28)']);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(cx - W * 0.25, y0, W * 1.5, y1 - y0);
    ctx.restore();
  },

  // ── Ek atmosfer katmanları (ORİJİNAL, additive) ─────────
  // Aşağıdakiler var olan yardımcılarla aynı sözleşmeyi izler; imzaları
  // değiştirmez, yalnızca gökyüzü derinliği ve ambiyansı zenginleştirir.

  // Düşük grafik kalitesinde ağır efektleri azaltmak için yumuşak bir ölçek
  // döndürür (0..1). Herhangi bir ayar modülü yoksa 1 döner (tam kalite).
  _bgQuality() {
    try {
      if (typeof Settings !== 'undefined' && Settings.get) {
        const q = Settings.get('graphicsQuality') || Settings.get('quality');
        if (q === 'low') return 0.4;
        if (q === 'medium') return 0.7;
        if (typeof q === 'number') return Math.max(0.2, Math.min(1, q));
      }
      if (typeof Environment !== 'undefined' && typeof Environment.perfScale === 'number') {
        return Math.max(0.2, Math.min(1, Environment.perfScale));
      }
    } catch (e) {}
    return 1;
  },

  // Yumuşak güneş/ay diski: katmanlı radyal parıltı + isteğe bağlı taç halka.
  // Sabit bir gökyüzü noktasına demirlenir (küçük parallax ile hafif kayar).
  // opt: { xFrac, yFrac, r, core, glow, halo, parallax, rays }
  _bgCelestialGlow(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const q = this._bgQuality();
    const parallax = o.parallax != null ? o.parallax : 0.02;
    const gx = cx + W * (o.xFrac != null ? o.xFrac : 0.78) - cx * parallax;
    const gy = cy + (o.yFrac != null ? o.yFrac : 55);
    const r = (o.r != null ? o.r : 26);
    const core = o.core || 'rgba(255,244,214,0.95)';
    const glow = o.glow || 'rgba(255,226,150,0.55)';
    ctx.save();
    // Geniş atmosferik hâle (uzak yumuşak ışıma)
    const haloR = r * (o.halo != null ? o.halo : 6) * (0.7 + q * 0.3);
    const hg = GradyanDeposu.rad(ctx, gx, gy, r * 0.4, gx, gy, haloR, [0, glow, 0.4, o.glow2 || 'rgba(255,210,140,0.18)', 1, 'rgba(255,210,140,0)']);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(gx, gy, haloR, 0, Math.PI * 2); ctx.fill();
    // Disk gövdesi
    const dg = GradyanDeposu.rad(ctx, gx - r * 0.25, gy - r * 0.25, r * 0.1, gx, gy, r, [0, core, 0.8, o.rim || core, 1, o.rimEdge || 'rgba(255,220,150,0.6)']);
    ctx.fillStyle = dg;
    ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
    // İsteğe bağlı: hafif dönen ışın tacı (yüksek kalitede)
    if (o.rays && q > 0.45) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = o.rayColor || 'rgba(255,235,180,0.35)';
      ctx.lineWidth = 1.5;
      const rc = 12;
      for (let i = 0; i < rc; i++) {
        const a = (i / rc) * Math.PI * 2 + t * 0.05;
        const r0 = r * 1.25;
        const r1 = r * (1.7 + Math.sin(t * 0.8 + i) * 0.25);
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0);
        ctx.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  // Hacimsel ışık şaftları (god-rays): bir kaynak noktasından yayılan yumuşak
  // ışık üçgenleri. Gökyüzü derinliğine sıcak/soğuk atmosfer katar.
  // opt: { xFrac, yFrac, count, spread, length, color, parallax }
  _bgSunShafts(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const q = this._bgQuality();
    if (q < 0.5) return; // düşük kalitede atla
    const parallax = o.parallax != null ? o.parallax : 0.03;
    const sx = cx + W * (o.xFrac != null ? o.xFrac : 0.78) - cx * parallax;
    const sy = cy + (o.yFrac != null ? o.yFrac : 55);
    const count = Math.max(3, Math.round((o.count != null ? o.count : 7) * (0.6 + q * 0.4)));
    const spread = o.spread != null ? o.spread : 1.5;
    const length = o.length != null ? o.length : 300;
    const col0 = o.color || 'rgba(255,238,190,0.10)';
    ctx.save();
    ctx.globalCompositeOperation = o.blend || 'lighter';
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1) - 0.5;
      const baseA = (o.baseAngle != null ? o.baseAngle : Math.PI * 0.62);
      const a = baseA + f * spread + Math.sin(t * 0.2 + i) * 0.03;
      const ex = sx + Math.cos(a) * length;
      const ey = sy + Math.sin(a) * length;
      const w0 = (o.width != null ? o.width : 10) + (i % 3) * 5;
      const flick = 0.6 + Math.sin(t * 0.5 + i * 1.3) * 0.4;
      const perp = a + Math.PI / 2;
      const px = Math.cos(perp), py = Math.sin(perp);
      const g = GradyanDeposu.lin(ctx, sx, sy, ex, ey, [0, col0, 1, o.colorEnd || 'rgba(255,238,190,0)']);
      ctx.globalAlpha = flick;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex + px * w0, ey + py * w0);
      ctx.lineTo(ex - px * w0, ey - py * w0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // Uzak kuş sürüsü: yavaşça geçen V dizilimi (kanat çırpma animasyonlu).
  // opt: { count, yFrac, speed, span, color, wing, parallax }
  _bgFlock(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const q = this._bgQuality();
    const count = Math.max(3, Math.round((o.count != null ? o.count : 7) * (0.5 + q * 0.5)));
    const parallax = o.parallax != null ? o.parallax : 0.04;
    const speed = o.speed != null ? o.speed : 16;
    const span = o.span != null ? o.span : W * 1.6;
    const lead = -cx * parallax + t * speed;
    const leadX = cx - W * 0.3 + ((lead % span) + span) % span;
    const leadY = cy + (o.yFrac != null ? o.yFrac : 70) + Math.sin(t * 0.3) * 14;
    const col = o.color || 'rgba(40,45,55,0.7)';
    const wing = o.wing != null ? o.wing : 9;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = o.lineWidth != null ? o.lineWidth : 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const side = (i % 2 === 0) ? 1 : -1;
      const rank = Math.floor(i / 2) + 1;
      const bx = leadX - rank * 16;
      const by = leadY + side * rank * 9;
      const flap = Math.sin(t * 5 + i * 0.9) * wing * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx - wing, by + flap);
      ctx.quadraticCurveTo(bx - wing * 0.5, by, bx, by - 1);
      ctx.quadraticCurveTo(bx + wing * 0.5, by, bx + wing, by + flap);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Yavaş sürüklenen ambiyans partikülleri (polen/kül/toz/spor).
  // Deterministik konumlar + yumuşak salınım; hafif parallax ile derinlik.
  // opt: { count, color, size, yTop, yBot, drift, rise, parallax, glow, seed }
  _bgAmbientDrift(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const q = this._bgQuality();
    let count = Math.round((o.count != null ? o.count : 26) * (0.35 + q * 0.65));
    if (count <= 0) return;
    const parallax = o.parallax != null ? o.parallax : 0.10;
    const shift = -cx * parallax;
    const yTop = cy + (o.yTop != null ? o.yTop : 40);
    const yBot = cy + (o.yBot != null ? o.yBot : 300);
    const span = W * 1.4;
    const col = o.color || 'rgba(255,248,210,0.55)';
    const glow = o.glow;
    const drift = o.drift != null ? o.drift : 10;
    const rise = o.rise != null ? o.rise : 6;
    const seed = o.seed != null ? o.seed : 0;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const h1 = (i * 137.51 + seed) % 1;
      const h2 = (i * 71.13 + seed * 1.7) % 1;
      const baseX = cx - W * 0.2 + h1 * span;
      const sway = Math.sin(t * 0.6 + i * 1.3) * drift;
      const px = baseX + shift + sway;
      // Dikey döngü (yavaş yükseliş/iniş)
      const cyc = ((t * rise * 0.05 + h2) % 1);
      const py = yBot - cyc * (yBot - yTop);
      const size = (o.size != null ? o.size : 2) * (0.6 + (i % 3) * 0.25);
      const a = 0.35 + Math.sin(t * 1.2 + i) * 0.25;
      if (glow) {
        const gg = GradyanDeposu.rad(ctx, px, py, 0, px, py, size * 3, [0, glow, 1, 'rgba(0,0,0,0)']);
        ctx.fillStyle = gg;
        ctx.globalAlpha = a * 0.5;
        ctx.beginPath(); ctx.arc(px, py, size * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Ek uzak derinlik katmanları (ORİJİNAL, additive) ────
  // Bu katmanlar _drawBackground'un EN BAŞINDA, tüm mevcut harita çiziminin
  // ARKASINDA çağrılır (terrain'den önce). Yalnızca ekstra parallax derinliği
  // katarlar: çok-duraklı gökyüzü bantları, uzak silüetler, yıldız/aurora, pus.
  // Var olan katmanlar (çoğu yarı saydam) bunların ÜSTÜNE oturur; imza/isim
  // değişmez, hiçbir mevcut efekt kaldırılmaz. Ağır katmanlar _bgQuality ile
  // (perfScale dâhil) ölçeklenir.

  // Çok duraklı, yarı saydam dikey gökyüzü bandı (haritaya göre tonlanmış).
  // stops: [[offset,'rgba'],...]  → Environment tint'i bozmayacak şekilde saydam.
  _bgSkyBands(ctx, cx, cy, W, stops, topFrac, botFrac) {
    if (!stops || !stops.length) return;
    const y0 = cy + (topFrac != null ? topFrac : -60);
    const y1 = cy + (botFrac != null ? botFrac : 300);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(cx - W * 0.25, y0, W * 1.5, y1 - y0);
    ctx.restore();
  },

  // Katmanlı yatay atmosfer pusu: birden çok yumuşak bant → derinlik/uzaklık.
  // opt: { bands, topFrac, botFrac, color, parallax }
  _bgAtmosphericHaze(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const bands = o.bands != null ? o.bands : 3;
    const y0 = cy + (o.topFrac != null ? o.topFrac : 120);
    const y1 = cy + (o.botFrac != null ? o.botFrac : 300);
    const parallax = o.parallax != null ? o.parallax : 0.02;
    const shift = -cx * parallax;
    const col = o.color || 'rgba(255,255,255,0.10)';
    const span = W * 1.6, x0 = cx - W * 0.3;
    ctx.save();
    ctx.translate(shift, 0);
    for (let i = 0; i < bands; i++) {
      const f = i / bands;
      const by = y0 + f * (y1 - y0);
      const bh = ((y1 - y0) / bands) * (1.5 - f * 0.4);
      const drift = Math.sin(t * 0.15 + i * 1.3) * 6;
      const g = ctx.createLinearGradient(0, by, 0, by + bh);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x0 + drift, by, span, bh);
    }
    ctx.restore();
  },

  // Uzak parallax yıldız alanı (deterministik dağılım + hafif twinkle).
  // Gece/uzay manzaraları için. opt: { count, yTop, yBot, parallax, color,
  // twinkle, big, seed }
  _bgFarStars(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const q = this._bgQuality();
    let count = Math.round((o.count != null ? o.count : 90) * (0.35 + q * 0.65));
    if (count <= 0) return;
    const parallax = o.parallax != null ? o.parallax : 0.012;
    const shift = -cx * parallax;
    const yTop = cy + (o.yTop != null ? o.yTop : -90);
    const yBot = cy + (o.yBot != null ? o.yBot : 140);
    const span = W * 1.6, x0 = cx - W * 0.3;
    const col = o.color || 'rgba(255,255,255,0.9)';
    const seed = o.seed != null ? o.seed : 0;
    const frac = (x) => x - Math.floor(x);
    ctx.save();
    ctx.fillStyle = col;
    for (let i = 0; i < count; i++) {
      const rx = frac(Math.sin(i * 12.9898 + seed) * 43758.5453);
      const ry = frac(Math.sin(i * 78.233 + seed * 2.13) * 12543.777);
      const raw = rx * span + shift;
      const px = x0 + (((raw % span) + span) % span);
      const py = yTop + ry * (yBot - yTop);
      const tw = (o.twinkle === false) ? 1 : (0.45 + Math.sin(t * 1.6 + i * 2.3) * 0.55);
      const sz = (o.big && (i % 11 === 0)) ? 1.9 : (0.55 + (i % 3) * 0.35);
      ctx.globalAlpha = Math.max(0.05, tw);
      ctx.beginPath();
      ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // Dünya-uzayı aurora şeritleri (kutup/gece manzaraları için, çok yavaş
  // parallax). Ekran-uzayı _drawAuroraOverlay'den BAĞIMSIZ ek derinlik katmanı.
  // opt: { bands, yFrac, height, parallax, colors, seed }
  _bgAuroraBands(ctx, cx, cy, W, t, opt) {
    const o = opt || {};
    const q = this._bgQuality();
    if (q < 0.45) return; // düşük kalitede atla
    const bands = o.bands != null ? o.bands : 3;
    const parallax = o.parallax != null ? o.parallax : 0.02;
    const shift = -cx * parallax;
    const baseY = cy + (o.yFrac != null ? o.yFrac : -20);
    const height = o.height != null ? o.height : 90;
    const colors = o.colors || ['rgba(80,255,180,0.20)', 'rgba(120,180,255,0.15)', 'rgba(200,120,255,0.13)'];
    const seed = o.seed != null ? o.seed : 0;
    const span = W * 1.6, x0 = cx - W * 0.3, steps = 26;
    ctx.save();
    ctx.translate(shift, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < bands; b++) {
      const col = colors[b % colors.length];
      const yOff = baseY + b * 22;
      const g = GradyanDeposu.lin(ctx, 0, yOff - height, 0, yOff + height * 0.5, [0, 'rgba(0,0,0,0)', 0.5, col, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, yOff + height * 0.5);
      for (let i = 0; i <= steps; i++) {
        const f = i / steps;
        const rx = x0 + f * span;
        const wob = Math.sin(f * 6 + t * 0.5 + b * 1.7 + seed) * 22
                  + Math.sin(f * 13 + t * 0.8 + b) * 10;
        ctx.lineTo(rx, yOff + wob);
      }
      ctx.lineTo(x0 + span, yOff + height * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // Uzak silüet manzarası: parallax'lı bina/mesa/harabe sırası (en arka plan).
  // Deterministik konum/boyut → titremesiz. style: 'city' | 'mesa' | 'ruin'.
  // opt: { parallax, baseY, count, minH, maxH, minW, maxW, color, style, seed }
  _bgFarSkyline(ctx, cx, cy, W, opt) {
    const o = opt || {};
    const parallax = o.parallax != null ? o.parallax : 0.05;
    const shift = -cx * parallax;
    const baseY = cy + (o.baseY != null ? o.baseY : 290);
    const count = o.count != null ? o.count : 20;
    const minH = o.minH != null ? o.minH : 50;
    const maxH = o.maxH != null ? o.maxH : 170;
    const minW = o.minW != null ? o.minW : 24;
    const maxW = o.maxW != null ? o.maxW : 55;
    const style = o.style || 'city';
    const seed = o.seed != null ? o.seed : 0;
    const span = W * 1.5, x0 = cx - W * 0.25;
    ctx.save();
    ctx.translate(shift, 0);
    ctx.fillStyle = o.color || 'rgba(60,72,92,0.5)';
    for (let i = 0; i < count; i++) {
      const r1 = (Math.sin(i * 45.11 + seed) * 0.5 + 0.5);
      const r2 = (Math.sin(i * 91.7 + seed * 1.9) * 0.5 + 0.5);
      const bx = x0 + (i / count) * span + (r1 - 0.5) * (span / count) * 0.6;
      const bw = minW + r2 * (maxW - minW);
      const bh = minH + r1 * (maxH - minH);
      const topY = baseY - bh;
      if (style === 'mesa') {
        // Yassı tepeli mesa/tepe silüeti
        ctx.beginPath();
        ctx.moveTo(bx - bw * 0.15, baseY);
        ctx.lineTo(bx - bw * 0.02, topY);
        ctx.lineTo(bx + bw * 0.9, topY);
        ctx.lineTo(bx + bw, baseY);
        ctx.closePath();
        ctx.fill();
      } else if (style === 'ruin') {
        // Kırık üstlü harabe (iki alt sütun farklı yükseklikte)
        const hb = bh * (0.5 + r2 * 0.5);
        ctx.fillRect(bx, baseY - hb, bw * 0.5, hb);
        ctx.fillRect(bx + bw * 0.5, topY, bw * 0.5, bh);
      } else {
        // Şehir bloğu (bazılarında çatı detayı)
        ctx.fillRect(bx, topY, bw, bh);
        if (r2 > 0.6) ctx.fillRect(bx + bw * 0.35, topY - bh * 0.10, bw * 0.2, bh * 0.10);
      }
    }
    ctx.restore();
  },

  // Harita bazlı ek uzak derinlik dağıtıcısı. _drawBackground'un EN BAŞINDA,
  // mevcut tüm katmanların ARKASINDA çağrılır. Additive: hiçbir mevcut çizim
  // değişmez, yalnızca daha uzak bir parallax katmanı eklenir.
  _bgParallaxDepth(ctx, cx, cy, W, t, mapId) {
    switch (mapId) {
      case 'countryside':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(120,185,230,0.0)'], [0.55, 'rgba(150,200,225,0.10)'], [1, 'rgba(200,225,230,0.28)']
        ], -60, 250);
        this._bgFarRidge(ctx, cx, cy, W, { parallax:0.028, baseY:242, amp:110, rough:0.4, seed:5.2, color:'rgba(150,175,195,0.32)' });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:150, botFrac:250, color:'rgba(205,225,225,0.10)' });
        break;
      case 'desert':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(255,225,160,0.0)'], [0.5, 'rgba(255,205,130,0.14)'], [1, 'rgba(240,190,110,0.34)']
        ], -60, 250);
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.03, baseY:250, count:8, minH:30, maxH:80, minW:70, maxW:150, style:'mesa', color:'rgba(200,165,110,0.32)', seed:3 });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:4, topFrac:140, botFrac:255, color:'rgba(250,215,150,0.12)' });
        break;
      case 'winter':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(70,110,170,0.0)'], [0.5, 'rgba(120,150,200,0.14)'], [1, 'rgba(200,215,240,0.30)']
        ], -60, 250);
        this._bgFarStars(ctx, cx, cy, W, t, { count:40, yBot:60, color:'rgba(230,240,255,0.6)', parallax:0.012, seed:7 });
        this._bgAuroraBands(ctx, cx, cy, W, t, { bands:2, yFrac:-30, height:70, colors:['rgba(120,220,200,0.14)','rgba(140,170,255,0.12)'], seed:2 });
        break;
      case 'beach':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(70,170,235,0.0)'], [0.6, 'rgba(150,210,235,0.10)'], [1, 'rgba(220,235,225,0.26)']
        ], -60, 240);
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.03, baseY:205, count:5, minH:20, maxH:55, minW:80, maxW:170, style:'mesa', color:'rgba(120,155,150,0.30)', seed:6 });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:150, botFrac:240, color:'rgba(200,230,235,0.10)' });
        break;
      case 'mountains':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(90,125,170,0.0)'], [0.5, 'rgba(130,160,195,0.14)'], [1, 'rgba(185,205,228,0.30)']
        ], -70, 260);
        this._bgFarRidge(ctx, cx, cy, W, { parallax:0.018, baseY:250, amp:250, rough:0.4, seed:2.9, color:'rgba(150,168,192,0.30)', snow:true, snowColor:'rgba(225,235,248,0.5)' });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:4, topFrac:150, botFrac:290, color:'rgba(195,212,232,0.10)' });
        break;
      case 'city':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(130,160,195,0.0)'], [0.5, 'rgba(160,180,205,0.12)'], [1, 'rgba(185,198,215,0.30)']
        ], -60, 250);
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.025, baseY:300, count:26, minH:90, maxH:210, minW:20, maxW:44, style:'city', color:'rgba(95,112,140,0.35)', seed:11 });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:150, botFrac:300, color:'rgba(185,195,212,0.12)' });
        break;
      case 'arctic':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(6,18,50,0.0)'], [0.5, 'rgba(10,32,68,0.22)'], [1, 'rgba(18,55,90,0.35)']
        ], -80, 250);
        this._bgFarStars(ctx, cx, cy, W, t, { count:110, big:true, yBot:120, color:'rgba(220,235,255,0.9)', parallax:0.01, seed:4 });
        this._bgAuroraBands(ctx, cx, cy, W, t, { bands:3, yFrac:-40, height:100, colors:['rgba(80,255,180,0.20)','rgba(120,180,255,0.15)','rgba(190,120,255,0.13)'], seed:1 });
        break;
      case 'jungle':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(60,120,70,0.0)'], [0.5, 'rgba(90,150,90,0.14)'], [1, 'rgba(150,190,150,0.30)']
        ], -50, 250);
        this._bgFarRidge(ctx, cx, cy, W, { parallax:0.03, baseY:240, amp:120, rough:0.7, seed:6.6, color:'rgba(70,120,85,0.35)', mistBase:'rgba(190,220,195,0.4)' });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:4, topFrac:120, botFrac:250, color:'rgba(180,215,180,0.12)' });
        break;
      case 'mars':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(90,35,15,0.0)'], [0.5, 'rgba(120,55,25,0.18)'], [1, 'rgba(150,80,45,0.34)']
        ], -70, 250);
        this._bgFarStars(ctx, cx, cy, W, t, { count:70, yBot:80, color:'rgba(255,225,200,0.7)', parallax:0.012, seed:9 });
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.03, baseY:255, count:7, minH:40, maxH:110, minW:70, maxW:160, style:'mesa', color:'rgba(120,55,30,0.4)', seed:8 });
        break;
      case 'cave':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(10,8,14,0.0)'], [0.6, 'rgba(20,16,26,0.25)'], [1, 'rgba(30,22,38,0.4)']
        ], -60, 260);
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:120, botFrac:260, color:'rgba(60,50,80,0.10)' });
        break;
      case 'highland':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(110,150,120,0.0)'], [0.5, 'rgba(140,175,145,0.12)'], [1, 'rgba(180,205,180,0.30)']
        ], -60, 250);
        this._bgFarRidge(ctx, cx, cy, W, { parallax:0.025, baseY:245, amp:150, rough:0.5, seed:3.7, color:'rgba(120,150,130,0.32)', mistBase:'rgba(200,220,205,0.4)' });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:150, botFrac:250, color:'rgba(200,220,205,0.10)' });
        break;
      case 'swamp':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(40,70,45,0.0)'], [0.5, 'rgba(55,85,55,0.16)'], [1, 'rgba(90,120,90,0.32)']
        ], -50, 250);
        this._bgFarRidge(ctx, cx, cy, W, { parallax:0.028, baseY:238, amp:90, rough:0.6, seed:4.2, color:'rgba(55,85,60,0.35)', mistBase:'rgba(150,180,150,0.45)' });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:4, topFrac:130, botFrac:255, color:'rgba(150,180,150,0.13)' });
        break;
      case 'volcano':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(40,10,0,0.0)'], [0.5, 'rgba(80,20,5,0.22)'], [1, 'rgba(120,35,10,0.38)']
        ], -70, 250);
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.03, baseY:255, count:6, minH:60, maxH:150, minW:80, maxW:180, style:'mesa', color:'rgba(45,18,12,0.5)', seed:5 });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:120, botFrac:250, color:'rgba(180,70,30,0.10)' });
        break;
      case 'underwater':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(0,30,70,0.0)'], [0.5, 'rgba(0,45,85,0.20)'], [1, 'rgba(0,20,50,0.40)']
        ], -80, 300);
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:4, topFrac:-40, botFrac:300, color:'rgba(40,120,170,0.10)' });
        break;
      case 'moon':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(0,0,0,0.0)'], [0.7, 'rgba(4,4,10,0.30)'], [1, 'rgba(10,10,20,0.50)']
        ], -90, 250);
        this._bgFarStars(ctx, cx, cy, W, t, { count:140, big:true, yBot:150, color:'rgba(255,255,255,0.95)', parallax:0.008, twinkle:false, seed:12 });
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.02, baseY:295, count:9, minH:30, maxH:100, minW:60, maxW:150, style:'mesa', color:'rgba(40,42,55,0.5)', seed:14 });
        break;
      case 'neon_city':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(5,5,25,0.0)'], [0.5, 'rgba(20,10,45,0.28)'], [1, 'rgba(35,15,60,0.45)']
        ], -80, 250);
        this._bgFarStars(ctx, cx, cy, W, t, { count:80, yBot:90, color:'rgba(180,200,255,0.7)', parallax:0.01, seed:15 });
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.025, baseY:300, count:24, minH:100, maxH:220, minW:22, maxW:46, style:'city', color:'rgba(40,25,70,0.55)', seed:16 });
        break;
      case 'wasteland':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(80,55,30,0.0)'], [0.5, 'rgba(110,80,45,0.18)'], [1, 'rgba(150,110,65,0.34)']
        ], -60, 250);
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.03, baseY:295, count:16, minH:50, maxH:150, minW:26, maxW:52, style:'ruin', color:'rgba(75,58,40,0.45)', seed:17 });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:4, topFrac:140, botFrac:255, color:'rgba(200,160,110,0.12)' });
        break;
      case 'canyon':
        this._bgSkyBands(ctx, cx, cy, W, [
          [0, 'rgba(150,70,40,0.0)'], [0.5, 'rgba(180,95,50,0.16)'], [1, 'rgba(200,120,70,0.34)']
        ], -60, 250);
        this._bgFarSkyline(ctx, cx, cy, W, { parallax:0.028, baseY:260, count:8, minH:60, maxH:160, minW:75, maxW:165, style:'mesa', color:'rgba(150,80,50,0.4)', seed:18 });
        this._bgAtmosphericHaze(ctx, cx, cy, W, t, { bands:3, topFrac:150, botFrac:255, color:'rgba(220,160,110,0.12)' });
        break;
    }
  },

  // ── Existing background methods ────────────────────────

  _bgCountryside(ctx, cx, cy, W, t) {
    // Additive derinlik: yumuşak gökyüzü, 3 katman tepe, bulut, ufuk pusu
    this._bgSkyDepth(ctx, cx, cy, W, 'rgba(150,205,235,0.0)', 'rgba(200,225,235,0.35)', -40, 250);
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.06, baseY:250, amp:150, rough:0.55, seed:0.3, color:'rgba(120,150,175,0.55)' });
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.11, baseY:265, amp:110, rough:0.9,  seed:1.9, color:'rgba(130,168,140,0.7)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.05, speed:5, baseY:80, count:4, color:'rgba(255,255,255,0.6)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.09, speed:9, baseY:130, count:3, scale:0.7, seed:400, color:'rgba(255,255,255,0.45)' });
    // Yumuşak öğleden sonra güneşi + hafif ışık şaftları + uzak sürü + polen
    this._bgCelestialGlow(ctx, cx, cy, W, t, { xFrac:0.82, yFrac:45, r:24, core:'rgba(255,250,225,0.95)', glow:'rgba(255,232,160,0.5)', halo:6, rays:true });
    this._bgSunShafts(ctx, cx, cy, W, t, { xFrac:0.82, yFrac:45, count:6, spread:1.2, length:280, color:'rgba(255,240,190,0.08)' });
    this._bgFlock(ctx, cx, cy, W, t, { count:7, yFrac:65, speed:14, color:'rgba(50,55,65,0.6)' });
    this._bgAmbientDrift(ctx, cx, cy, W, t, { count:20, color:'rgba(255,250,200,0.5)', size:1.8, drift:12, rise:5, parallax:0.12 });
    this._bgHorizonHaze(ctx, cx, cy, W, { topFrac:150, botFrac:255, color1:'rgba(210,232,220,0.3)' });
    this._bgCountrysideOrig(ctx, cx, cy, W, t);
  },

  _bgCountrysideOrig(ctx, cx, cy, W, t) {
    // Far mountains
    ctx.fillStyle = '#8ab08a';
    ctx.beginPath(); ctx.moveTo(cx, cy + 300);
    for (let i = 0; i <= 10; i++) {
      const mx = cx + (i/10)*W*1.2;
      const my = cy + 200 - Math.abs(Math.sin(i*0.8+cx*0.001))*120;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(cx+W*1.2, cy+300); ctx.closePath(); ctx.fill();
    // Windmill
    const wx = cx + W * 0.8, wy = cy + 180;
    ctx.fillStyle = '#888';
    ctx.fillRect(wx, wy, 8, 80);
    for (let b = 0; b < 4; b++) {
      const ba = b * Math.PI/2 + t * 1.2;
      ctx.save(); ctx.translate(wx+4, wy+10);
      ctx.rotate(ba);
      ctx.fillStyle = '#ccc';
      ctx.fillRect(-3, -30, 6, 30);
      ctx.restore();
    }
    // Birds
    for (let i = 0; i < 3; i++) {
      const bx = cx + ((t*30 + i*200) % (W*1.1));
      const by = cy + 80 + Math.sin(t*0.8 + i) * 20;
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx-8, by); ctx.quadraticCurveTo(bx-4, by-5, bx, by);
      ctx.quadraticCurveTo(bx+4, by-5, bx+8, by); ctx.stroke();
    }
  },

  _bgDesert(ctx, cx, cy, W, t) {
    // Additive derinlik: sıcak gökyüzü gradyanı + uzak kum sırtları + puslu ufuk
    this._bgSkyDepth(ctx, cx, cy, W, 'rgba(255,220,150,0.0)', 'rgba(240,200,120,0.4)', -40, 250);
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.05, baseY:255, amp:120, rough:0.5, seed:2.1, color:'rgba(190,150,90,0.5)', mistBase:'rgba(240,205,140,0.4)' });
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.10, baseY:268, amp:90,  rough:0.75, seed:5.5, color:'rgba(205,160,90,0.65)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.05, speed:4, baseY:70, count:3, scale:1.1, color:'rgba(255,240,210,0.5)' });
    // Kavurucu çöl güneşi (büyük hâle) + sıcak ışık şaftları + havada dönen toz
    this._bgCelestialGlow(ctx, cx, cy, W, t, { xFrac:0.7, yFrac:50, r:30, core:'rgba(255,248,220,0.98)', glow:'rgba(255,210,120,0.55)', glow2:'rgba(255,180,90,0.2)', halo:7, rays:true, rayColor:'rgba(255,220,150,0.3)' });
    this._bgSunShafts(ctx, cx, cy, W, t, { xFrac:0.7, yFrac:50, count:8, spread:1.6, length:320, color:'rgba(255,225,150,0.09)' });
    this._bgAmbientDrift(ctx, cx, cy, W, t, { count:22, color:'rgba(230,200,150,0.4)', size:1.6, drift:16, rise:4, parallax:0.14, yTop:60, yBot:290 });
    this._bgHorizonHaze(ctx, cx, cy, W, { topFrac:150, botFrac:255, color1:'rgba(245,210,140,0.35)' });
    // Pyramid
    const px = cx + W * 0.6, py = cy + 220;
    ctx.fillStyle = '#c8a04a';
    ctx.beginPath(); ctx.moveTo(px, py-120); ctx.lineTo(px-80, py); ctx.lineTo(px+80, py); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a07830'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py-120); ctx.lineTo(px-80, py); ctx.stroke();
    // Sand dunes bg
    ctx.fillStyle = '#d4a04a';
    ctx.beginPath(); ctx.moveTo(cx, cy+260);
    for (let i=0; i<=8; i++) {
      ctx.quadraticCurveTo(cx+i*W*0.15+W*0.07, cy+160, cx+(i+1)*W*0.15, cy+260);
    }
    ctx.lineTo(cx+W*1.2, cy+300); ctx.lineTo(cx, cy+300); ctx.closePath(); ctx.fill();
  },

  _bgWinter(ctx, cx, cy, W, t) {
    // Additive derinlik: soğuk gökyüzü + uzak karlı sırtlar + puslu ufuk
    this._bgSkyDepth(ctx, cx, cy, W, 'rgba(190,215,245,0.0)', 'rgba(210,225,245,0.45)', -40, 250);
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.05, baseY:250, amp:160, rough:0.6, seed:0.7, color:'rgba(150,175,205,0.55)', snow:true, snowColor:'rgba(235,244,255,0.85)', mistBase:'rgba(215,228,245,0.5)' });
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.10, baseY:262, amp:120, rough:0.95, seed:3.3, color:'rgba(170,192,215,0.7)', snow:true, snowColor:'rgba(245,250,255,0.9)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.05, speed:4, baseY:75, count:4, color:'rgba(230,238,250,0.55)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.09, speed:7, baseY:120, count:3, scale:0.7, seed:300, color:'rgba(225,235,248,0.4)' });
    this._bgHorizonHaze(ctx, cx, cy, W, { topFrac:150, botFrac:250, color1:'rgba(220,232,248,0.4)' });
    // Snow mountains
    ctx.fillStyle = '#c8d8e8';
    ctx.beginPath(); ctx.moveTo(cx, cy+280);
    for (let i=0; i<=8; i++) {
      const mx = cx + (i/8)*W*1.1;
      const my = cy + 150 - Math.abs(Math.sin(i*1.2))*150;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(cx+W*1.2, cy+280); ctx.closePath(); ctx.fill();
    // Snowcaps
    ctx.fillStyle = '#e8f0ff';
    for (let i=0; i<=8; i++) {
      const mx = cx + (i/8)*W*1.1;
      const my = cy + 150 - Math.abs(Math.sin(i*1.2))*150;
      ctx.beginPath(); ctx.moveTo(mx, my);
      ctx.lineTo(mx-20, my+30); ctx.lineTo(mx+20, my+30); ctx.closePath(); ctx.fill();
    }
    // Pine trees bg
    for (let i=0; i<5; i++) {
      const tx = cx + W*(0.05+i*0.18);
      const ty = cy + 230;
      const th = 50 + (i%3)*15;
      ctx.fillStyle = '#1a4a1a';
      ctx.beginPath(); ctx.moveTo(tx, ty-th); ctx.lineTo(tx-th*0.4, ty); ctx.lineTo(tx+th*0.4, ty); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8f0ff';
      ctx.beginPath(); ctx.moveTo(tx, ty-th-5); ctx.lineTo(tx-8, ty-th+15); ctx.lineTo(tx+8, ty-th+15); ctx.closePath(); ctx.fill();
    }
  },

  _bgBeach(ctx, cx, cy, W, t) {
    // Additive derinlik: berrak gökyüzü + uzak ada silüeti + bulut + deniz ufku pusu
    this._bgSkyDepth(ctx, cx, cy, W, 'rgba(120,200,240,0.0)', 'rgba(160,215,235,0.35)', -40, 240);
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.045, baseY:210, amp:70, rough:0.6, seed:2.6, color:'rgba(110,150,140,0.45)', mistBase:'rgba(190,222,225,0.4)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.04, speed:4, baseY:65, count:4, scale:1.1, color:'rgba(255,255,255,0.6)' });
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.08, speed:7, baseY:110, count:3, scale:0.7, seed:250, color:'rgba(255,255,255,0.42)' });
    // Deniz üstünde alçak güneş + parlak şaftlar + uzak martı sürüsü
    this._bgCelestialGlow(ctx, cx, cy, W, t, { xFrac:0.62, yFrac:60, r:26, core:'rgba(255,252,235,0.98)', glow:'rgba(255,238,180,0.5)', halo:7, rays:true });
    this._bgSunShafts(ctx, cx, cy, W, t, { xFrac:0.62, yFrac:60, count:7, spread:1.4, length:300, color:'rgba(255,245,200,0.08)' });
    this._bgFlock(ctx, cx, cy, W, t, { count:5, yFrac:55, speed:12, color:'rgba(90,100,110,0.55)', wing:11 });
    this._bgHorizonHaze(ctx, cx, cy, W, { topFrac:165, botFrac:250, color1:'rgba(200,230,235,0.32)' });
    // Palms
    for (let i=0; i<3; i++) {
      const px = cx + W*(0.15+i*0.3), py = cy + 240;
      const ph = 80 + i*20;
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 8; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px+10, py-ph*0.5, px-5, py-ph);
      ctx.stroke();
      // Leaves
      for (let l=0; l<5; l++) {
        const la = (l/5)*Math.PI*2 + t*0.3;
        ctx.strokeStyle = '#2d8a22'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(px-5, py-ph);
        ctx.lineTo(px-5+Math.cos(la)*50, py-ph+Math.sin(la)*25);
        ctx.stroke();
      }
    }
    // Distant wave
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0; i<=10; i++) {
      const wx = cx+i*W*0.11;
      const wy = cy + 180 + Math.sin(t*1.5+i*0.8)*8;
      i===0 ? ctx.moveTo(wx,wy) : ctx.lineTo(wx,wy);
    }
    ctx.stroke();
  },

  // ── New background methods ─────────────────────────────

  _bgMountains(ctx, cx, cy, W, t) {
    // Additive derinlik: atmosferik gökyüzü + en uzak soluk sıra + ufuk pusu
    this._bgSkyDepth(ctx, cx, cy, W, 'rgba(120,150,185,0.0)', 'rgba(170,190,215,0.4)', -50, 260);
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.03, baseY:260, amp:220, rough:0.45, seed:1.1, color:'rgba(120,140,165,0.45)', snow:true, snowColor:'rgba(230,238,250,0.7)', mistBase:'rgba(175,195,220,0.45)' });
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.055, baseY:275, amp:180, rough:0.7, seed:4.7, color:'rgba(95,118,145,0.6)', snow:true, snowColor:'rgba(235,242,252,0.78)' });
    // Distant far peaks (darkest layer)
    ctx.fillStyle = '#1a2530';
    ctx.beginPath(); ctx.moveTo(cx, cy+320);
    for (let i=0; i<=12; i++) {
      const mx = cx + (i/12)*W*1.3;
      const my = cy + 220 - Math.abs(Math.sin(i*0.7 + cx*0.0005))*180;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(cx+W*1.3, cy+320); ctx.closePath(); ctx.fill();

    // Mid peaks
    ctx.fillStyle = '#3a4a58';
    ctx.beginPath(); ctx.moveTo(cx, cy+310);
    for (let i=0; i<=10; i++) {
      const mx = cx + (i/10)*W*1.2;
      const my = cy + 180 - Math.abs(Math.sin(i*1.1 + 0.5))*200;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(cx+W*1.2, cy+310); ctx.closePath(); ctx.fill();

    // Snow caps on mid peaks
    ctx.fillStyle = '#e8eef5';
    for (let i=0; i<=10; i++) {
      const mx = cx + (i/10)*W*1.2;
      const my = cy + 180 - Math.abs(Math.sin(i*1.1 + 0.5))*200;
      // Only cap peaks that are high enough
      if (my < cy + 180) {
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - 25, my + 40);
        ctx.lineTo(mx + 25, my + 40);
        ctx.closePath(); ctx.fill();
      }
    }

    // Eagles soaring
    for (let i=0; i<2; i++) {
      const ex = cx + ((t*18 + i*350) % (W*1.2));
      const ey = cy + 60 + Math.sin(t*0.4 + i*2) * 30;
      const wing = Math.sin(t*2 + i) * 8;
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - 22, ey + wing);
      ctx.quadraticCurveTo(ex - 11, ey, ex, ey);
      ctx.quadraticCurveTo(ex + 11, ey, ex + 22, ey + wing);
      ctx.stroke();
      // Body
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.ellipse(ex, ey, 5, 3, 0, 0, Math.PI*2); ctx.fill();
    }

    // Floating clouds between peaks
    for (let i=0; i<3; i++) {
      const cloudX = cx + ((cx*0.02 + i*W*0.35) % (W*1.1));
      const cloudY = cy + 110 + i*25;
      ctx.fillStyle = 'rgba(200,210,220,0.5)';
      ctx.beginPath(); ctx.arc(cloudX, cloudY, 30, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cloudX+25, cloudY+5, 22, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cloudX-22, cloudY+8, 18, 0, Math.PI*2); ctx.fill();
    }
    // Vadi pusu — yüksek katmanları yumuşatan atmosferik bant
    this._bgHorizonHaze(ctx, cx, cy, W, { topFrac:170, botFrac:290, color1:'rgba(195,212,232,0.35)' });
  },

  _bgCity(ctx, cx, cy, W, t) {
    // Additive derinlik: puslu şehir gökyüzü + uzak silüet bloklar + ufuk pusu (smog)
    this._bgSkyDepth(ctx, cx, cy, W, 'rgba(150,170,195,0.0)', 'rgba(175,190,210,0.4)', -50, 250);
    this._bgFarRidge(ctx, cx, cy, W, { parallax:0.04, baseY:255, amp:150, rough:1.6, seed:6.2, color:'rgba(120,138,160,0.5)', mistBase:'rgba(180,192,210,0.4)' });
    // Uzak silüet gökdelen sırası (parallax, en arkada, sisli)
    ctx.save();
    ctx.translate(-cx * 0.07, 0);
    ctx.fillStyle = 'rgba(110,128,152,0.45)';
    for (let i = 0; i < 22; i++) {
      const bx2 = cx - W * 0.15 + (i * 89.3 % (W * 1.35));
      const bh2 = 70 + (i * 53 % 130);
      const bw2 = 22 + (i * 17 % 30);
      ctx.fillRect(bx2, cy + 300 - bh2, bw2, bh2);
    }
    ctx.restore();
    // Yavaş smog bulut bandı
    this._bgCloudBand(ctx, cx, cy, W, t, { parallax:0.05, speed:3, baseY:90, count:3, scale:1.2, color:'rgba(180,188,200,0.35)' });
    // Sky gradient backdrop (lighter blue)
    // Far background buildings (muted)
    const buildingConfigs = [
      { x:0.05, w:60, h:180, color:'#5a6a7a' },
      { x:0.12, w:45, h:140, color:'#4a5a6a' },
      { x:0.20, w:70, h:220, color:'#3a4a5a' },
      { x:0.30, w:50, h:160, color:'#506070' },
      { x:0.38, w:80, h:260, color:'#404f60' },
      { x:0.48, w:55, h:190, color:'#4a5a6a' },
      { x:0.57, w:65, h:200, color:'#3a4a5a' },
      { x:0.66, w:90, h:240, color:'#506070' },
      { x:0.75, w:50, h:150, color:'#4a5a6a' },
      { x:0.83, w:75, h:210, color:'#404f60' },
      { x:0.92, w:60, h:170, color:'#3a4a5a' }
    ];

    for (const b of buildingConfigs) {
      const bx = cx + W * b.x;
      const by = cy + 300 - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by, b.w, b.h);

      // Windows (lit up, some flickering)
      // PERF(31 Tmz): pencerelerin ~%95'i AYNI rengi kullaniyor; olcumde kare
      //   basina **60,5 GEREKSIZ fillStyle atamasi** cikti (her atama bir CSS
      //   renk ayristirmasi demektir). Renk yalniz DEGISTIGINDE atanir.
      //   ⚠ Math.random() cagrisi KORUNDU — RNG dizisi degisirse pencere
      //   deseni degisir; yalniz ATAMA elendi, gorunum birebir ayni.
      //   ⚠ `_sonPencereRenk` her binada sifirlanir: ustteki `ctx.fillStyle =
      //   b.color` atamasi durumu degistirdigi icin izleyici bayatlar.
      const wRows = Math.floor(b.h / 18);
      const wCols = Math.floor(b.w / 14);
      let _sonPencereRenk = null;
      for (let r=0; r<wRows; r++) {
        for (let c=0; c<wCols; c++) {
          const wx = bx + 5 + c*14;
          const wy = by + 8 + r*18;
          // Flicker some windows
          const flicker = Math.sin(t*3 + bx*0.1 + r*7 + c*13) > 0.2;
          if (flicker) {
            const _pr = Math.random() > 0.05
              ? 'rgba(255,240,160,0.85)'
              : 'rgba(160,200,255,0.7)';
            if (_pr !== _sonPencereRenk) { ctx.fillStyle = _pr; _sonPencereRenk = _pr; }
            ctx.fillRect(wx, wy, 8, 10);
          }
        }
      }

      // Rooftop details (antenna, water tower)
      if (b.h > 180) {
        ctx.fillStyle = '#333';
        ctx.fillRect(bx + b.w/2 - 1, by - 20, 2, 20);
        // Blinking light
        const blink = Math.sin(t*2) > 0;
        ctx.fillStyle = blink ? '#ff4444' : '#aa2222';
        ctx.beginPath(); ctx.arc(bx + b.w/2, by - 22, 3, 0, Math.PI*2); ctx.fill();
      }
    }

    // Traffic lights (animated)
    for (let i=0; i<3; i++) {
      const tlx = cx + W*(0.25 + i*0.25);
      const tly = cy + 240;
      ctx.fillStyle = '#222';
      ctx.fillRect(tlx, tly, 14, 40);
      ctx.fillRect(tlx-6, tly, 26, 50);
      // Cycle: green 3s, yellow 0.5s, red 3s
      const phase = (t * 0.5 + i * 2.2) % 6.5;
      const isGreen = phase < 3;
      const isYellow = phase >= 3 && phase < 3.5;
      const isRed = phase >= 3.5;
      ctx.fillStyle = isRed ? '#ff3333' : '#441111';
      ctx.beginPath(); ctx.arc(tlx+7, tly+10, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = isYellow ? '#ffcc00' : '#443311';
      ctx.beginPath(); ctx.arc(tlx+7, tly+23, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = isGreen ? '#33ff66' : '#114422';
      ctx.beginPath(); ctx.arc(tlx+7, tly+36, 5, 0, Math.PI*2); ctx.fill();
      // Pole
      ctx.fillStyle = '#444';
      ctx.fillRect(tlx+6, tly+50, 3, 60);
    }

    // Moving cars (silhouettes far back)
    for (let i=0; i<4; i++) {
      const carX = cx + ((t*35 + i*180) % (W*1.1));
      const carY = cy + 285;
      ctx.fillStyle = ['#c0392b','#2980b9','#f39c12','#8e44ad'][i];
      ctx.beginPath(); ctx.roundRect(carX, carY, 30, 12, 3); ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(carX+6, carY+12, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(carX+22, carY+12, 4, 0, Math.PI*2); ctx.fill();
    }
    // Zemin seviyesi smog pusu (derinlik + atmosfer)
    this._bgHorizonHaze(ctx, cx, cy, W, { topFrac:180, botFrac:300, color1:'rgba(170,182,200,0.32)' });
  },

  _bgArctic(ctx, cx, cy, W, t) {
    // Aurora borealis — wavy color bands (world-space, subtle)
    const auroraColors = [
      'rgba(0,255,120,0.12)',
      'rgba(80,180,255,0.10)',
      'rgba(160,80,255,0.08)',
      'rgba(0,200,180,0.09)'
    ];
    for (let band=0; band<4; band++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + 40 + band*30);
      for (let i=0; i<=20; i++) {
        const ax = cx + (i/20)*W*1.1;
        const ay = cy + 40 + band*30
                  + Math.sin(i*0.5 + t*(0.4+band*0.1) + band) * (20+band*12)
                  + Math.sin(i*0.3 + t*0.2 + band*2) * 15;
        ctx.lineTo(ax, ay);
      }
      ctx.lineTo(cx + W*1.1, cy);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fillStyle = auroraColors[band];
      ctx.fill();
    }

    // Stars
    for (let i=0; i<40; i++) {
      const sx = cx + (i*137.5 % (W*1.1));
      const sy = cy + (i*93.7 % 140);
      const alpha = 0.3 + Math.sin(t*1.5 + i) * 0.3;
      ctx.fillStyle = `rgba(200,220,255,${alpha})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1+((i%3)*0.5), 0, Math.PI*2); ctx.fill();
    }

    // Icebergs in distance
    for (let i=0; i<3; i++) {
      const ibx = cx + W*(0.1+i*0.35);
      const iby = cy + 270;
      ctx.fillStyle = '#88c8e8';
      ctx.beginPath();
      ctx.moveTo(ibx-40, iby);
      ctx.lineTo(ibx-15, iby-70);
      ctx.lineTo(ibx+5, iby-50);
      ctx.lineTo(ibx+20, iby-80);
      ctx.lineTo(ibx+45, iby);
      ctx.closePath(); ctx.fill();
      // Ice sheen
      ctx.fillStyle = 'rgba(200,240,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(ibx-15, iby-70);
      ctx.lineTo(ibx, iby-55);
      ctx.lineTo(ibx+5, iby-50);
      ctx.closePath(); ctx.fill();
    }

    // Snowflakes drifting
    for (let i=0; i<15; i++) {
      const sf = ((t*12 + i*60) % (W*1.1 + 40)) - 20;
      const sfy = cy + 50 + ((t*8 + i*47) % 220);
      const alpha = 0.4 + Math.sin(t+i)*0.3;
      ctx.fillStyle = `rgba(200,230,255,${alpha})`;
      ctx.beginPath(); ctx.arc(cx+sf, sfy, 2, 0, Math.PI*2); ctx.fill();
    }
  },

  _bgJungle(ctx, cx, cy, W, t) {
    // Dense dark canopy backdrop
    ctx.fillStyle = '#0d2010';
    ctx.fillRect(cx, cy, W*1.1, 300);

    // Kanopiden süzülen yeşil-altın ışık şaftları + havada dalgalanan spor tozu
    this._bgSunShafts(ctx, cx, cy, W, t, { xFrac:0.68, yFrac:-20, count:6, spread:1.7, length:340, color:'rgba(180,230,120,0.06)', baseAngle:Math.PI*0.55 });
    this._bgAmbientDrift(ctx, cx, cy, W, t, { count:24, color:'rgba(200,240,150,0.4)', glow:'rgba(180,255,120,0.3)', size:1.7, drift:9, rise:4, parallax:0.13, yTop:50, yBot:290 });

    // Back-layer tall trees
    for (let i=0; i<8; i++) {
      const tx = cx + W*(0.05+i*0.13);
      const th = 150 + (i%4)*40;
      const ty = cy + 300;

      // Trunk
      ctx.strokeStyle = '#3a2010'; ctx.lineWidth = 10 + (i%3)*4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.sin(i)*8, ty - th); ctx.stroke();

      // Canopy layers
      const leafColors = ['#0a3a0a','#1a4a0a','#0d3a0a','#154a10'];
      for (let l=0; l<3; l++) {
        ctx.fillStyle = leafColors[(i+l)%4];
        ctx.beginPath();
        ctx.arc(tx + Math.sin(i)*8, ty - th - l*20, 35 - l*5, 0, Math.PI*2);
        ctx.fill();
      }
    }

    // Hanging vines
    for (let i=0; i<6; i++) {
      const vx = cx + W*(0.08+i*0.16);
      ctx.strokeStyle = '#2a5a10'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vx, cy);
      for (let s=0; s<=10; s++) {
        const vy = cy + s*22;
        const vwave = Math.sin(s*0.8 + t*0.5 + i) * 8;
        s===0 ? ctx.moveTo(vx+vwave, vy) : ctx.lineTo(vx+vwave, vy);
      }
      ctx.stroke();
      // Leaves on vine
      for (let l=2; l<9; l+=2) {
        const lx = vx + Math.sin(l*0.8 + t*0.5 + i) * 8;
        const ly = cy + l*22;
        ctx.fillStyle = '#2a6010';
        ctx.beginPath();
        ctx.ellipse(lx+8, ly, 10, 5, Math.PI/4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath();
        ctx.ellipse(lx-8, ly, 10, 5, -Math.PI/4, 0, Math.PI*2); ctx.fill();
      }
    }

    // Exotic birds (toucans silhouette)
    for (let i=0; i<2; i++) {
      const bx = cx + ((t*20 + i*300) % (W*1.1));
      const by = cy + 80 + Math.sin(t*0.6 + i*3) * 25;
      ctx.fillStyle = '#1a1a1a';
      // Body
      ctx.beginPath(); ctx.ellipse(bx, by, 12, 8, 0, 0, Math.PI*2); ctx.fill();
      // Beak (colorful)
      ctx.fillStyle = '#e8a020';
      ctx.beginPath(); ctx.moveTo(bx+12, by); ctx.lineTo(bx+28, by+3); ctx.lineTo(bx+12, by+6); ctx.closePath(); ctx.fill();
      // Wings flap
      const wf = Math.sin(t*4+i) * 0.4;
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx-14, by - 15 + wf*10);
      ctx.lineTo(bx-2, by+3);
      ctx.closePath(); ctx.fill();
    }

    // Mist / ground fog
    ctx.fillStyle = 'rgba(0,40,0,0.18)';
    ctx.fillRect(cx, cy+240, W*1.1, 80);
  },

  _bgMars(ctx, cx, cy, W, t) {
    // Far red mountains silhouette
    ctx.fillStyle = '#3a0e04';
    ctx.beginPath(); ctx.moveTo(cx, cy+300);
    for (let i=0; i<=12; i++) {
      const mx = cx + (i/12)*W*1.2;
      const my = cy + 220 - Math.abs(Math.sin(i*0.9+0.3))*160
                        - Math.abs(Math.sin(i*1.7))*60;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(cx+W*1.2, cy+300); ctx.closePath(); ctx.fill();

    // Craters in distance
    for (let i=0; i<4; i++) {
      const crx = cx + W*(0.1+i*0.23);
      const cry = cy + 260;
      const cr = 20+i*8;
      ctx.strokeStyle = '#5a2010'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(crx, cry, cr, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(80,20,5,0.4)';
      ctx.beginPath(); ctx.arc(crx, cry, cr-4, 0, Math.PI*2); ctx.fill();
    }

    // Dust devil whirlwind
    const ddx = cx + W*0.75 + Math.sin(t*0.2)*30;
    const ddy = cy + 200;
    for (let layer=0; layer<5; layer++) {
      const alpha = 0.06 - layer*0.01;
      const radius = 8 + layer*14;
      const offsetY = layer*20;
      const spin = t*(1.5-layer*0.2);
      ctx.strokeStyle = `rgba(180,80,20,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ddx + Math.sin(spin)*layer*3, ddy+offsetY, radius, 0, Math.PI*2);
      ctx.stroke();
    }

    // Dust clouds drifting
    for (let i=0; i<5; i++) {
      const dx2 = cx + ((t*8 + i*180) % (W*1.1));
      const dy2 = cy + 180 + Math.sin(t*0.3+i)*20;
      const alpha = 0.08 + Math.sin(t+i)*0.04;
      ctx.fillStyle = `rgba(160,70,20,${alpha})`;
      ctx.beginPath(); ctx.arc(dx2, dy2, 35+i*10, 0, Math.PI*2); ctx.fill();
    }

    // Distant sun (small, dim through dust)
    ctx.fillStyle = 'rgba(255,180,80,0.4)';
    ctx.beginPath(); ctx.arc(cx+W*0.85, cy+40, 18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,100,0.2)';
    ctx.beginPath(); ctx.arc(cx+W*0.85, cy+40, 35, 0, Math.PI*2); ctx.fill();
    // İnce Mars atmosferi pusu içinden solgun sarımsı ışık şaftları + toz taneleri
    this._bgSunShafts(ctx, cx, cy, W, t, { xFrac:0.85, yFrac:40, count:5, spread:1.1, length:260, color:'rgba(255,170,90,0.05)' });
    this._bgAmbientDrift(ctx, cx, cy, W, t, { count:22, color:'rgba(200,110,60,0.4)', size:1.5, drift:18, rise:3, parallax:0.15, yTop:70, yBot:290, seed:5 });
  },

  _bgCave(ctx, cx, cy, W, t) {
    // Absolute darkness background
    ctx.fillStyle = '#060606';
    ctx.fillRect(cx, cy, W*1.1, 400);

    // Bioluminescent crystal clusters on walls
    const crystalColors = [
      'rgba(80,200,255,0.7)',
      'rgba(160,80,255,0.6)',
      'rgba(80,255,160,0.5)',
      'rgba(255,160,80,0.4)'
    ];
    for (let i=0; i<10; i++) {
      const crx = cx + W*(0.05+i*0.1);
      const cry = cy + 220 + Math.sin(i*1.3)*40;
      const color = crystalColors[i%4];

      // Crystal spires
      for (let s=0; s<3; s++) {
        const sh = 20+s*15;
        const sw = 6+s*3;
        const sx = crx + (s-1)*12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, cry);
        ctx.lineTo(sx-sw/2, cry+sh);
        ctx.lineTo(sx+sw/2, cry+sh);
        ctx.closePath(); ctx.fill();

        // Glow
        const glow = GradyanDeposu.rad(ctx, sx, cry+sh/2, 0, sx, cry+sh/2, sw*2, [0, color, 1, 'rgba(0,0,0,0)']);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sx, cry+sh/2, sw*2, 0, Math.PI*2); ctx.fill();
      }
    }

    // Bats flying
    for (let i=0; i<5; i++) {
      const batX = cx + ((t*25 + i*220) % (W*1.2));
      const batY = cy + 80 + Math.sin(t*1.2+i*2)*30;
      const wingSpan = Math.sin(t*5+i) * 0.5;

      ctx.fillStyle = 'rgba(30,10,30,0.9)';
      // Body
      ctx.beginPath(); ctx.ellipse(batX, batY, 5, 3, 0, 0, Math.PI*2); ctx.fill();
      // Wings
      ctx.beginPath();
      ctx.moveTo(batX, batY);
      ctx.bezierCurveTo(batX-8, batY-8+wingSpan*8, batX-16, batY+wingSpan*6, batX-18, batY+2);
      ctx.bezierCurveTo(batX-12, batY-2, batX-5, batY-5+wingSpan*5, batX, batY);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(batX, batY);
      ctx.bezierCurveTo(batX+8, batY-8+wingSpan*8, batX+16, batY+wingSpan*6, batX+18, batY+2);
      ctx.bezierCurveTo(batX+12, batY-2, batX+5, batY-5+wingSpan*5, batX, batY);
      ctx.fill();
    }

    // Glowing pool reflections on floor
    for (let i=0; i<3; i++) {
      const px = cx + W*(0.2+i*0.3);
      const py = cy + 290;
      ctx.fillStyle = `rgba(80,160,255,${0.05+Math.sin(t+i)*0.03})`;
      ctx.beginPath(); ctx.ellipse(px, py, 40, 8, 0, 0, Math.PI*2); ctx.fill();
    }
  },

  _bgHighland(ctx, cx, cy, W, t) {
    // Rolling green hills far background
    ctx.fillStyle = '#2a5a2a';
    ctx.beginPath(); ctx.moveTo(cx, cy+320);
    for (let i=0; i<=16; i++) {
      const hx = cx + (i/16)*W*1.2;
      const hy = cy + 240 - Math.abs(Math.sin(i*0.6))*80 - Math.abs(Math.sin(i*1.4+1))*40;
      ctx.lineTo(hx, hy);
    }
    ctx.lineTo(cx+W*1.2, cy+320); ctx.closePath(); ctx.fill();

    // Mid-ground rolling hills
    ctx.fillStyle = '#3a6a3a';
    ctx.beginPath(); ctx.moveTo(cx, cy+320);
    for (let i=0; i<=12; i++) {
      const hx = cx + (i/12)*W*1.1;
      const hy = cy + 280 - Math.abs(Math.sin(i*0.8+0.5))*60;
      ctx.lineTo(hx, hy);
    }
    ctx.lineTo(cx+W*1.1, cy+320); ctx.closePath(); ctx.fill();

    // Ruined castle silhouette
    const castleX = cx + W*0.75, castleY = cy + 250;
    ctx.fillStyle = '#2a3a2a';
    // Main tower
    ctx.fillRect(castleX, castleY-100, 30, 100);
    // Battlements
    for (let b=0; b<4; b++) {
      ctx.fillRect(castleX+b*8, castleY-110, 5, 12);
    }
    // Side wall
    ctx.fillRect(castleX-40, castleY-60, 40, 60);
    ctx.fillRect(castleX+30, castleY-50, 30, 50);
    // Window
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(castleX+11, castleY-80, 8, 12);

    // Stone walls (hedgerows)
    for (let i=0; i<4; i++) {
      const wx = cx + W*(0.05+i*0.22);
      const wy = cy + 295;
      ctx.fillStyle = '#5a6a4a';
      ctx.fillRect(wx, wy, 55, 8);
      // Stone texture dots
      ctx.fillStyle = '#4a5a3a';
      for (let s=0; s<6; s++) {
        ctx.beginPath(); ctx.arc(wx+5+s*8, wy+4, 2, 0, Math.PI*2); ctx.fill();
      }
    }

    // Sheep silhouettes
    for (let i=0; i<4; i++) {
      const sx = cx + W*(0.08+i*0.22) + Math.sin(t*0.3+i)*15;
      const sy = cy + 288;
      ctx.fillStyle = '#e8e8e8';
      // Body
      ctx.beginPath(); ctx.ellipse(sx, sy, 14, 10, 0, 0, Math.PI*2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(sx+14, sy-4, 7, 0, Math.PI*2); ctx.fill();
      // Legs
      ctx.fillStyle = '#ccc';
      ctx.fillRect(sx-8, sy+8, 4, 8);
      ctx.fillRect(sx, sy+8, 4, 8);
      ctx.fillRect(sx+8, sy+8, 4, 8);
    }

    // Clouds (fluffy, light)
    for (let i=0; i<3; i++) {
      const clx = cx + ((cx*0.015 + i*W*0.33) % (W*1.1));
      const cly = cy + 60 + i*20;
      ctx.fillStyle = 'rgba(220,230,220,0.7)';
      ctx.beginPath(); ctx.arc(clx, cly, 28, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(clx+22, cly+5, 20, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(clx-20, cly+8, 16, 0, Math.PI*2); ctx.fill();
    }
  },

  _bgSwamp(ctx, cx, cy, W, t) {
    // Dark murky sky
    ctx.fillStyle = 'rgba(15,25,10,0.5)';
    ctx.fillRect(cx, cy, W*1.1, 320);

    // Dead / gnarled trees
    const drawDeadTree = (x, y, h, lean) => {
      ctx.strokeStyle = '#2a2a18'; ctx.lineWidth = 10; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+lean, y-h); ctx.stroke();
      // Gnarled branches
      for (let b=0; b<4; b++) {
        const brY = y - h*(0.4+b*0.18);
        const brX = x + lean*(0.4+b*0.18);
        const brLen = 30+b*10;
        const brAngle = (b%2===0 ? 1 : -1) * (0.7+b*0.2);
        ctx.lineWidth = 5-b;
        ctx.beginPath(); ctx.moveTo(brX, brY);
        ctx.lineTo(brX+Math.cos(brAngle)*brLen, brY+Math.sin(brAngle)*20-brLen*0.3);
        ctx.stroke();
      }
    };
    for (let i=0; i<6; i++) {
      drawDeadTree(cx+W*(0.05+i*0.18), cy+300, 140+i*20, (i%2===0?-1:1)*15);
    }

    // Hanging Spanish moss
    for (let i=0; i<8; i++) {
      const mx = cx + W*(0.04+i*0.14);
      ctx.strokeStyle = `rgba(60,70,30,${0.4+i%3*0.1})`;
      ctx.lineWidth = 1.5;
      for (let s=0; s<3; s++) {
        ctx.beginPath();
        ctx.moveTo(mx+s*5, cy+80);
        for (let d=0; d<=8; d++) {
          const moss_x = mx+s*5 + Math.sin(d*0.8+t*0.2+i)*4;
          const moss_y = cy+80+d*18;
          d===0 ? ctx.moveTo(moss_x,moss_y) : ctx.lineTo(moss_x,moss_y);
        }
        ctx.stroke();
      }
    }

    // Thick fog layers
    for (let layer=0; layer<3; layer++) {
      const fogAlpha = 0.08 + layer*0.04;
      const fogY = cy + 240 - layer*30;
      const fogShift = Math.sin(t*0.15+layer) * 30;
      ctx.fillStyle = `rgba(80,100,50,${fogAlpha})`;
      ctx.beginPath();
      ctx.moveTo(cx, fogY);
      for (let i=0; i<=15; i++) {
        const fx = cx + (i/15)*W*1.1;
        const fy = fogY + Math.sin(i*0.5+t*0.2+layer)*15 + fogShift*0.3;
        i===0 ? ctx.moveTo(fx,fy) : ctx.lineTo(fx,fy);
      }
      ctx.lineTo(cx+W*1.1, fogY+80);
      ctx.lineTo(cx, fogY+80);
      ctx.closePath(); ctx.fill();
    }

    // Fireflies (blinking dots)
    for (let i=0; i<12; i++) {
      const ffx = cx + (i*137.5 % (W*1.1));
      const ffy = cy + 160 + (i*93.7 % 120);
      const blink = Math.sin(t*2.5+i*1.7) > 0.3;
      if (blink) {
        const alpha = (Math.sin(t*2.5+i*1.7) - 0.3) * 1.43;
        ctx.fillStyle = `rgba(180,255,80,${alpha*0.8})`;
        ctx.beginPath(); ctx.arc(ffx, ffy, 2.5, 0, Math.PI*2); ctx.fill();
        // Glow
        ctx.fillStyle = `rgba(200,255,100,${alpha*0.2})`;
        ctx.beginPath(); ctx.arc(ffx, ffy, 8, 0, Math.PI*2); ctx.fill();
      }
    }

    // Frog silhouettes on logs
    for (let i=0; i<2; i++) {
      const frx = cx + W*(0.3+i*0.4);
      const fry = cy + 292;
      // Log
      ctx.fillStyle = '#3a2a10';
      ctx.beginPath(); ctx.ellipse(frx, fry+5, 25, 8, 0, 0, Math.PI*2); ctx.fill();
      // Frog body
      ctx.fillStyle = '#2a5a10';
      ctx.beginPath(); ctx.ellipse(frx, fry-2, 10, 7, 0, 0, Math.PI*2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#aaf030';
      ctx.beginPath(); ctx.arc(frx-5, fry-7, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(frx+5, fry-7, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(frx-5, fry-7, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(frx+5, fry-7, 1.5, 0, Math.PI*2); ctx.fill();
    }
  },

  // ── Cave ceiling (world-space stalactites) ─────────────

  _drawCaveCeiling(ctx, camera, t) {
    const W = camera.width / camera.zoom;
    const ceilY = camera.y + 30; // ceiling just above view top
    const cx = camera.x;

    ctx.fillStyle = '#080808';
    ctx.fillRect(cx, camera.y, W*1.1, 30);

    // Tavandan aşağı sönümlenen karanlık (derinlik hissi)
    const ceilFade = GradyanDeposu.lin(ctx, 0, camera.y + 30, 0, camera.y + 110, [0, 'rgba(5,5,8,0.7)', 1, 'rgba(5,5,8,0)']);
    ctx.fillStyle = ceilFade;
    ctx.fillRect(cx, camera.y + 30, W*1.1, 80);

    // Stalactites hanging from ceiling
    for (let i=0; i<18; i++) {
      const sx = cx + (i*137.5 % (W*1.05));
      const sh = 40 + (i*73 % 80);
      const sw = 8 + (i*31 % 14);

      // Stone gradient
      const stGrad = GradyanDeposu.lin(ctx, sx, ceilY, sx, ceilY+sh, [0, '#2a2a2a', 1, '#141414']);
      ctx.fillStyle = stGrad;

      ctx.beginPath();
      ctx.moveTo(sx - sw/2, ceilY);
      ctx.lineTo(sx, ceilY + sh);
      ctx.lineTo(sx + sw/2, ceilY);
      ctx.closePath(); ctx.fill();

      // Drip highlight (yavaş parlayan mineral ışıltısı)
      const glint = 0.25 + Math.sin(t * 1.5 + i * 1.3) * 0.15;
      ctx.fillStyle = `rgba(80,160,255,${glint})`;
      ctx.beginPath(); ctx.arc(sx, ceilY+sh-2, 2, 0, Math.PI*2); ctx.fill();
      // Ara sıra düşen su damlası
      const dripPhase = (t * 0.5 + i * 0.37) % 3;
      if (dripPhase < 1) {
        ctx.fillStyle = 'rgba(120,190,255,0.5)';
        ctx.beginPath();
        ctx.arc(sx, ceilY + sh + dripPhase * 120, 1.6, 0, Math.PI*2);
        ctx.fill();
      }
    }
  },

  // ── Aurora screen-space overlay ────────────────────────

  _drawAuroraOverlay(ctx, W, H, t) {
    // Subtle screen-space aurora at top portion of screen
    const aColors = [
      [0, 255, 120],
      [80, 180, 255],
      [160, 80, 255]
    ];
    for (let band=0; band<3; band++) {
      const [r,g,b] = aColors[band];
      const grad = GradyanDeposu.lin(ctx, 0, 0, 0, H*0.45, [0, `rgba(${r},${g},${b},0.07)`, 0.6, `rgba(${r},${g},${b},0.03)`, 1, `rgba(${r},${g},${b},0)`]);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i=0; i<=20; i++) {
        const ax = (i/20)*W;
        const ay = H*0.12 + band*H*0.06
                  + Math.sin(i*0.4 + t*(0.3+band*0.08)) * H*0.04
                  + Math.sin(i*0.25 + t*0.15+band) * H*0.025;
        ctx.lineTo(ax, ay);
      }
      ctx.lineTo(W, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  },

  // ── Swamp water ────────────────────────────────────────

  _drawSwampWater(ctx, camera, t) {
    const waterY = window.innerHeight * 0.72 / camera.zoom + camera.y;
    const W = camera.width / camera.zoom;
    const waveGrad = ctx.createLinearGradient(0, waterY, 0, waterY + 80);
    waveGrad.addColorStop(0, 'rgba(30,60,15,0.6)');
    waveGrad.addColorStop(1, 'rgba(15,35,8,0.8)');
    ctx.fillStyle = waveGrad;

    ctx.beginPath();
    ctx.moveTo(camera.x, waterY);
    for (let i=0; i<=20; i++) {
      const wx = camera.x + (i/20)*W;
      const wy = waterY + Math.sin(t*0.8 + i*0.6)*3;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(camera.x+W, waterY+200);
    ctx.lineTo(camera.x, waterY+200);
    ctx.closePath(); ctx.fill();

    // Bulanık yüzey ışıltısı (durgun su yansıması)
    const swampSurf = GradyanDeposu.lin(ctx, 0, waterY, 0, waterY + 16, [0, 'rgba(120,150,80,0.18)', 1, 'rgba(120,150,80,0)']);
    ctx.fillStyle = swampSurf;
    ctx.fillRect(camera.x, waterY, W, 16);
    // Lily pads
    ctx.fillStyle = 'rgba(40,80,20,0.7)';
    for (let i=0; i<5; i++) {
      const lx = camera.x + ((t*5+i*180) % W);
      ctx.beginPath(); ctx.ellipse(lx, waterY+4, 12, 6, 0, 0, Math.PI*2); ctx.fill();
      // Nilüfer üzeri parlaklık
      ctx.fillStyle = 'rgba(90,140,50,0.4)';
      ctx.beginPath(); ctx.ellipse(lx-3, waterY+2, 5, 2.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(40,80,20,0.7)';
    }
    // Yüzen bataklık pusu (yavaş sürüklenen sisli lekeler)
    ctx.fillStyle = 'rgba(150,170,130,0.06)';
    for (let m=0; m<4; m++) {
      const mx = camera.x + ((t*8 + m*W*0.32) % (W*1.1));
      const my = waterY - 6 + Math.sin(t*0.5 + m)*4;
      ctx.beginPath(); ctx.ellipse(mx, my, 60+m*20, 12, 0, 0, Math.PI*2); ctx.fill();
    }
  },

  // ── Existing methods ───────────────────────────────────

  _drawWater(ctx, camera, t) {
    const waterY = window.innerHeight * 0.72 / camera.zoom + camera.y;
    const W = camera.width / camera.zoom;
    const waveGrad = GradyanDeposu.lin(ctx, 0, waterY, 0, waterY + 200, [0, 'rgba(30,150,220,0.55)', 0.35, 'rgba(0,110,190,0.65)', 1, 'rgba(0,55,120,0.82)']);
    ctx.fillStyle = waveGrad;
    // Wavy top edge
    ctx.beginPath();
    ctx.moveTo(camera.x, waterY);
    for (let i=0; i<=20; i++) {
      const wx = camera.x + (i/20)*W;
      const wy = waterY + Math.sin(t*2 + i*0.8)*5;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(camera.x+W, waterY+200);
    ctx.lineTo(camera.x, waterY+200);
    ctx.closePath(); ctx.fill();
    // Yüzey parlaklık bandı (gökyüzü yansıması)
    const surfGrad = GradyanDeposu.lin(ctx, 0, waterY, 0, waterY + 22, [0, 'rgba(200,240,255,0.28)', 1, 'rgba(200,240,255,0)']);
    ctx.fillStyle = surfGrad;
    ctx.fillRect(camera.x, waterY, W, 22);
    // Shimmer
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i=0; i<6; i++) {
      const sx = camera.x + ((t*40+i*120) % W);
      const sy = waterY + 10 + Math.sin(t+i)*8;
      ctx.beginPath(); ctx.ellipse(sx, sy, 20+Math.sin(t*2+i)*5, 3, 0, 0, Math.PI*2); ctx.fill();
    }
    // İnce ikincil dalgacık çizgileri (yüzey detayı)
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    for (let k=0; k<3; k++) {
      ctx.beginPath();
      for (let i=0; i<=24; i++) {
        const wx = camera.x + (i/24)*W;
        const wy = waterY + 18 + k*14 + Math.sin(t*1.6 + i*0.5 + k)*3;
        i===0 ? ctx.moveTo(wx,wy) : ctx.lineTo(wx,wy);
      }
      ctx.stroke();
    }
    // Kırışık kostik pırıltıları (yüzeyde titreşen ışık noktaları) — ORİJİNAL
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let s=0; s<16; s++) {
      const sx = camera.x + ((s*137.5 + t*22) % W);
      const twk = 0.5 + Math.sin(t*4 + s*1.7)*0.5;
      const sy = waterY + 6 + ((s*53) % 40);
      const sr = 1.4 + twk*2.2;
      ctx.globalAlpha = 0.10 + twk*0.28;
      ctx.fillStyle = 'rgba(210,245,255,1)';
      ctx.beginPath(); ctx.ellipse(sx, sy, sr, sr*0.5, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },


  // ── Bot Vehicle Renderer ──────────────────────────────
  _drawBotVehicle(ctx, v, t) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle || 0);
    // Simple jeep-like bot in red with BOT label
    ctx.fillStyle = '#CC1100';
    ctx.beginPath(); ctx.roundRect(-50, -22, 100, 38, 5); ctx.fill();
    // Highlight
    const hg = GradyanDeposu.lin(ctx, 0, -22, 0, 16, [0, 'rgba(255,255,255,0.3)', 1, 'rgba(0,0,0,0.2)']);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.roundRect(-50,-22,100,38,5); ctx.fill();
    // Cabin
    ctx.fillStyle = '#990000';
    ctx.beginPath(); ctx.roundRect(-18,-40,62,22,4); ctx.fill();
    // Windshield
    ctx.fillStyle = 'rgba(255,100,80,0.4)';
    ctx.beginPath(); ctx.moveTo(-12,-38); ctx.lineTo(38,-38); ctx.lineTo(36,-20); ctx.lineTo(-14,-20); ctx.closePath(); ctx.fill();
    // BOT label
    ctx.fillStyle = '#FF4444'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🤖 BOT', 0, -5);
    // Glow
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(255,50,50,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-50,-22,100,38,5); ctx.stroke();
    ctx.shadowBlur = 0;
    // Far lambaları + gece/karanlık haritada ileri koni (ORİJİNAL)
    let _botNight = false;
    try { if (typeof Environment !== 'undefined' && Environment.isNight) _botNight = Environment.isNight(); } catch (e) {}
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (_botNight) {
      const bcg = GradyanDeposu.lin(ctx, 50, -4, 220, -4, [0, 'rgba(255,244,200,0.28)', 1, 'rgba(255,238,180,0)']);
      ctx.fillStyle = bcg;
      ctx.beginPath(); ctx.moveTo(50, -4); ctx.lineTo(210, -60); ctx.lineTo(210, 40); ctx.closePath(); ctx.fill();
    }
    const lg = GradyanDeposu.rad(ctx, 52, -6, 0, 52, -6, 12, [0, 'rgba(255,252,230,0.95)', 1, 'rgba(255,240,190,0)']);
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(52, -6, 12, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.restore();
    // Wheels
    if (v.wheels) v.wheels.forEach(w => {
      ctx.save();
      ctx.translate(w.x||w.wx, w.y||w.wy);
      ctx.rotate(w.angle||0);
      const r = w.radius||w.r||20;
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#550000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#880000'; ctx.beginPath(); ctx.arc(0,0,r*0.5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  },

  // ── Araç dünya-uzayı FX (ORİJİNAL, additive) ──────────
  // drawGame içinde, drawVehicle'dan HEMEN ÖNCE (camera.apply içinde) çağrılır.
  // Aracın imzasını/çizimini DEĞİŞTİRMEZ; çevresine ışık/iz/alev derinliği ekler.
  // Gece/karanlık haritada far konisi, hızda lastik izi + toz, boost'ta nitro alevi.

  // Haritaya göre toz/duman rengi (lastik arkası partikülleri).
  _vfxDustColor(mapId) {
    switch (mapId) {
      case 'desert': case 'canyon': case 'wasteland': return 'rgba(220,190,140,0.5)';
      case 'winter': case 'arctic':                    return 'rgba(240,248,255,0.6)';
      case 'volcano': case 'mars':                     return 'rgba(120,70,50,0.5)';
      case 'beach':                                    return 'rgba(235,215,170,0.5)';
      case 'moon':                                     return 'rgba(190,190,205,0.5)';
      case 'swamp': case 'jungle':                     return 'rgba(90,100,70,0.5)';
      default:                                         return 'rgba(150,130,100,0.45)';
    }
  },

  // Haritaya göre atmosferik vinyet kenar rengi (koyu ambiyans).
  _vignetteTint(mapId) {
    switch (mapId) {
      case 'cave': case 'moon':   return 'rgba(0,0,0,0.55)';
      case 'volcano':             return 'rgba(30,0,0,0.42)';
      case 'underwater':          return 'rgba(0,10,40,0.5)';
      case 'neon_city':           return 'rgba(10,0,25,0.46)';
      case 'mars':                return 'rgba(30,5,0,0.38)';
      case 'arctic': case 'winter': return 'rgba(10,20,40,0.36)';
      case 'swamp':               return 'rgba(5,15,5,0.4)';
      default:                    return 'rgba(0,0,0,0.35)';
    }
  },

  _drawVehicleWorldFX(ctx, v, vehicleId, mapId, t) {
    if (!v) return;
    const q = this._bgQuality();
    const vx = v.x, vy = v.y, ang = v.angle || 0;
    const halfW = (v.width || 60) * 0.5;
    const halfH = (v.height || 22) * 0.5;
    const speed = Math.sqrt((v.vx || 0) * (v.vx || 0) + (v.vy || 0) * (v.vy || 0));
    const grounded = (v.airTime || 0) < 0.06;
    const thr = v.throttle || 0;
    const boost = !!v.boostActive;
    let night = false;
    try { if (typeof Environment !== 'undefined' && Environment.isNight) night = Environment.isNight(); } catch (e) {}
    const darkMap = (mapId === 'cave' || mapId === 'moon' || mapId === 'underwater' || mapId === 'neon_city' || mapId === 'volcano');

    // ── Yumuşak temas gölgesi (süspansiyonla ezilen zemin gölgesi) ──
    this._drawVehicleContactShadow(ctx, v, q);

    // ── Lastik izi kaydı (dünya-uzayı, deterministik tampon) ──
    if (!this._vfxTrail) this._vfxTrail = [];
    if (grounded && speed > 2.2) {
      // Arka teker temas noktası ~ merkezden -x lokal ve zemine yakın
      const bxL = -halfW * 0.72, byL = halfH + 8;
      const wx = vx + Math.cos(ang) * bxL - Math.sin(ang) * byL;
      const wy = vy + Math.sin(ang) * bxL + Math.cos(ang) * byL;
      const last = this._vfxTrail[this._vfxTrail.length - 1];
      if (!last || ((wx - last.x) * (wx - last.x) + (wy - last.y) * (wy - last.y)) > 64) {
        this._vfxTrail.push({ x: wx, y: wy, a: Math.min(1, speed / 12), skid: (v.brake || 0) > 0.4 ? 1 : 0 });
        if (this._vfxTrail.length > 46) this._vfxTrail.shift();
      }
    }
    const tr = this._vfxTrail;
    if (tr && tr.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 1; i < tr.length; i++) {
        const p0 = tr[i - 1], p1 = tr[i];
        const f = i / tr.length;
        const a = f * 0.30 * p1.a;
        if (a <= 0.012) continue;
        ctx.strokeStyle = p1.skid ? 'rgba(14,11,9,' + (a * 1.35).toFixed(3) + ')'
                                  : 'rgba(42,33,25,' + a.toFixed(3) + ')';
        ctx.lineWidth = (p1.skid ? 6 : 4) * (0.5 + f * 0.5);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
      ctx.restore();
    }

    // ── Araç lokal çerçevesi (alt parıltı, far, nitro) ──
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(ang);

    // Alt/temas ambiyans parıltısı (sıcak yumuşak nabız)
    const breathe = 0.035 + Math.sin(t * 1.6) * 0.012 + thr * 0.05;
    if (breathe > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ug = GradyanDeposu.rad(ctx, 0, halfH * 0.4, 4, 0, halfH * 0.4, halfW * 1.7, [0, 'rgba(255,220,160,' + breathe.toFixed(3) + ')', 0.6, 'rgba(255,170,90,' + (breathe * 0.4).toFixed(3) + ')', 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = ug;
      ctx.beginPath(); ctx.ellipse(0, halfH * 0.6, halfW * 1.7, halfW * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Gece / karanlık haritada far konisi (ileri = +x lokal)
    if ((night || darkMap) && q > 0.3) {
      const lampX = halfW * 0.92, lampY = -2;
      const len = 205 + speed * 4;
      const spread = 0.32;
      const tanS = Math.tan(spread);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bg = GradyanDeposu.lin(ctx, lampX, lampY, lampX + len, lampY, [0, 'rgba(255,244,200,0.34)', 0.5, 'rgba(255,238,180,0.13)', 1, 'rgba(255,238,180,0)']);
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(lampX, lampY);
      ctx.lineTo(lampX + len, lampY - tanS * len - 10);
      ctx.lineTo(lampX + len, lampY + tanS * len + 24);
      ctx.closePath();
      ctx.fill();
      // Parlak lamba çekirdeği
      const cg = GradyanDeposu.rad(ctx, lampX, lampY, 0, lampX, lampY, 15, [0, 'rgba(255,252,235,0.9)', 1, 'rgba(255,240,190,0)']);
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.arc(lampX, lampY, 15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Nitro / boost arka alevi (araç arkası = -x lokal)
    if (boost || thr > 0.92) {
      const bx = -halfW * 0.96, by = 2;
      const pulse = boost ? 1 : 0.5;
      const flick = 0.6 + Math.sin(t * 30) * 0.24 + Math.sin(t * 53) * 0.14;
      const flen = (26 + speed * 1.2) * pulse * (0.8 + flick * 0.3);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fg = GradyanDeposu.lin(ctx, bx, by, bx - flen, by, [0, 'rgba(255,240,180,' + (0.75 * pulse).toFixed(3) + ')', 0.4, 'rgba(255,140,30,' + (0.5 * pulse).toFixed(3) + ')', 1, 'rgba(255,60,0,0)']);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(bx, by - 7);
      ctx.quadraticCurveTo(bx - flen * 0.6, by - 4, bx - flen, by);
      ctx.quadraticCurveTo(bx - flen * 0.6, by + 4, bx, by + 7);
      ctx.closePath(); ctx.fill();
      if (boost) {
        const cg2 = GradyanDeposu.lin(ctx, bx, by, bx - flen * 0.55, by, [0, 'rgba(220,245,255,0.85)', 0.6, 'rgba(90,170,255,0.4)', 1, 'rgba(90,170,255,0)']);
        ctx.fillStyle = cg2;
        ctx.beginPath();
        ctx.moveTo(bx, by - 4);
        ctx.quadraticCurveTo(bx - flen * 0.3, by - 2, bx - flen * 0.55, by);
        ctx.quadraticCurveTo(bx - flen * 0.3, by + 2, bx, by + 4);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();

    // ── Hızda arka tekerden kalkan toz (dünya-uzayı, seyahat yönünün tersi) ──
    if (grounded && speed > 6 && q > 0.4) {
      const vlen = speed || 1;
      const dirx = (v.vx || 0) / vlen, diry = (v.vy || 0) / vlen;
      const dustCol = this._vfxDustColor(mapId);
      const base = Math.min(0.4, (speed - 6) / 24);
      ctx.save();
      ctx.fillStyle = dustCol;
      for (let i = 0; i < 3; i++) {
        const off = ((t * 3 + i * 2.1) % 1);
        const dist = halfW + off * 30 + i * 8;
        const dx = vx - dirx * dist;
        const dy = vy - diry * dist + halfH * 0.9;
        const r = 6 + off * 14 + i * 3;
        ctx.globalAlpha = base * (1 - off);
        ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // ── Hasara bağlı dünya-uzayı yıpranma (duman/kıvılcım/yağ) ──
    this._drawVehicleWearWorld(ctx, v, mapId, t, q);
  },

  // ── Yumuşak temas gölgesi (dünya-uzayı, ORİJİNAL) ──────
  // Aracın altına zemine oturan yumuşak eliptik gölge. Süspansiyon
  // sıkışınca (suspBob) yayılıp koyulaşır; havadayken küçülür ve solar.
  _drawVehicleContactShadow(ctx, v, q) {
    if (!v) return;
    const halfW = (v.width || 60) * 0.5;
    const halfH = (v.height || 22) * 0.5;
    const air = v.airTime || 0;
    // Havadayken zemin Y bilinmediğinden gölge hızla solar (yanlış konumda kalmasın)
    const airFade = Math.max(0, 1 - air / 0.45);
    if (airFade <= 0.02) return;
    const ang = v.angle || 0;
    // Süspansiyon sıkışması: suspBob (px, +aşağı) → gölge yayılır
    let bob = 0;
    if (typeof v.suspBob === 'number') bob = Math.max(-18, Math.min(18, v.suspBob));
    const squash = 1 + Math.max(0, bob) / 26;        // sıkışınca genişle
    const lift = Math.max(0, -bob) / 22;             // gerilince incel
    // ── Işık yönü: Environment varsa güneşe göre, yoksa üst-sol varsayılan ──
    // (gölge ışığın yatay bileşeninin tersine kayar → açı-farkında ofset)
    let lightAng = -Math.PI * 0.5 - 0.32;
    try {
      if (typeof Environment !== 'undefined') {
        if (typeof Environment.sunAngle === 'number') lightAng = Environment.sunAngle;
        else if (typeof Environment.lightDir === 'number') lightAng = Environment.lightDir;
      }
    } catch (e) {}
    const shOff = Math.cos(lightAng) * (halfW * 0.32) * airFade;   // yatay kayma
    const gy = v.y + halfH + 6 - Math.min(6, air * 40);
    const cx = v.x - shOff;
    // Gövde eğimini zemine kısmen yansıt (açı-farkında dönüş)
    const tilt = Math.max(-0.7, Math.min(0.7, ang * 0.55));
    const rx = halfW * (1.3 * squash) * (1 - lift * 0.18);
    const ry = Math.max(4, halfH * 0.52 * (1 - lift * 0.3));
    const alpha = 0.32 * airFade * (0.85 + Math.min(0.3, Math.max(0, bob) / 40));
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    // Katman 1: geniş, çok yumuşak penumbra (yumuşak kenar için daha büyük + soluk)
    if (q > 0.3) {
      const gp = ctx.createRadialGradient(cx, gy, 1, cx, gy, Math.max(3, rx * 1.38));
      gp.addColorStop(0, 'rgba(0,0,0,' + (alpha * 0.5).toFixed(3) + ')');
      gp.addColorStop(0.42, 'rgba(0,0,0,' + (alpha * 0.34).toFixed(3) + ')');   // daha yumuşak geçiş (ek durak, ek çizim yok)
      gp.addColorStop(0.68, 'rgba(0,0,0,' + (alpha * 0.2).toFixed(3) + ')');
      gp.addColorStop(0.86, 'rgba(0,0,0,' + (alpha * 0.08).toFixed(3) + ')');   // uzatılmış penumbra → daha yumuşak kenar
      gp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gp;
      ctx.beginPath(); ctx.ellipse(cx, gy, Math.max(3, rx * 1.38), ry * 1.16, tilt, 0, Math.PI * 2); ctx.fill();
    }
    // Katman 2: ana gölge (açı-farkında, eğik elips)
    const g = ctx.createRadialGradient(cx, gy, 1, cx, gy, Math.max(2, rx));
    g.addColorStop(0, 'rgba(0,0,0,' + alpha.toFixed(3) + ')');
    g.addColorStop(0.62, 'rgba(0,0,0,' + (alpha * 0.55).toFixed(3) + ')');
    g.addColorStop(0.84, 'rgba(0,0,0,' + (alpha * 0.2).toFixed(3) + ')');   // daha yumuşak dış kenar (ek durak, ek çizim yok)
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, gy, Math.max(2, rx), ry, tilt, 0, Math.PI * 2); ctx.fill();
    // Aracın tam altında daha koyu, dar çekirdek (asıl temas noktası)
    if (q > 0.4 && air < 0.05) {
      const cg = GradyanDeposu.rad(ctx, v.x, gy, 1, v.x, gy, Math.max(2, rx * 0.5), [0, 'rgba(0,0,0,' + (alpha * 0.6).toFixed(3) + ')', 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(v.x, gy + 1, Math.max(2, rx * 0.5), ry * 0.7, tilt, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Hasara bağlı dünya-uzayı yıpranma (ORİJİNAL) ───────
  // damageLevel 0..1 (tanımsız→0). Yüksek hasarda motordan yükselen kurum
  // dumanı, ağır hasarda zemine sürtünen kıvılcım, dururken yağ damlası.
  _drawVehicleWearWorld(ctx, v, mapId, t, q) {
    if (!v) return;
    const dmg = Math.max(0, Math.min(1, v.damageLevel || 0));
    if (dmg <= 0.02) return;
    const halfW = (v.width || 60) * 0.5;
    const halfH = (v.height || 22) * 0.5;
    const ang = v.angle || 0;
    const speed = Math.sqrt((v.vx || 0) * (v.vx || 0) + (v.vy || 0) * (v.vy || 0));
    const grounded = (v.airTime || 0) < 0.06;
    const rnd = (n) => { const s = Math.sin(n * 127.1 + 11.3) * 43758.5453; return s - Math.floor(s); };

    // Motor kurumu/duman: hasar arttıkça yükselen gri-siyah puf (araç üstü)
    if (dmg > 0.3 && q > 0.35) {
      const ex = halfW * 0.35, ey = -halfH * 0.9;            // motor ~ ön-üst (lokal)
      const wx = v.x + Math.cos(ang) * ex - Math.sin(ang) * ey;
      const wy = v.y + Math.sin(ang) * ex + Math.cos(ang) * ey;
      const puffs = Math.round(2 + dmg * 3);
      ctx.save();
      for (let i = 0; i < puffs; i++) {
        const ph = (t * 0.5 + i / puffs) % 1;                 // 0..1 yükselme fazı
        const rise = ph * (34 + dmg * 34);
        const sway = Math.sin(t * 1.3 + i * 2.0) * (6 + ph * 10);
        const px = wx + sway - (v.vx || 0) * 0.012;
        const py = wy - rise - 6;
        const r = 5 + ph * (10 + dmg * 8) + i;
        const a = (0.30 * dmg) * (1 - ph);
        if (a <= 0.01) continue;
        const dark = dmg > 0.6 ? 55 : 90;                     // ağır hasar → siyah kurum
        ctx.fillStyle = 'rgba(' + dark + ',' + dark + ',' + dark + ',' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Ağır hasarda zemine sürtünen kıvılcımlar (grounded + hız)
    if (dmg > 0.6 && grounded && speed > 4 && q > 0.4) {
      const bx = -halfW * 0.85, by = halfH + 2;               // arka-alt (lokal)
      const wx = v.x + Math.cos(ang) * bx - Math.sin(ang) * by;
      const wy = v.y + Math.sin(ang) * bx + Math.cos(ang) * by;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const sp = ((t * 6 + i * 1.7) % 1);
        const dx = wx - (v.vx || 0) * 0.02 * sp - sp * 14;
        const dy = wy - Math.sin(sp * 3.14159) * 8;
        const a = (1 - sp) * 0.9 * ((dmg - 0.6) / 0.4);
        if (a <= 0.01) continue;
        ctx.fillStyle = 'rgba(255,' + Math.floor(150 + rnd(i + Math.floor(t)) * 90) + ',40,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(dx, dy, 1.4 + sp * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Yağ kaçağı: yavaş/dururken araç altına damlayan koyu leke
    if (dmg > 0.45 && speed < 3 && q > 0.4) {
      const gy = v.y + halfH + 5;
      const drip = (t * 0.3) % 1;
      ctx.save();
      ctx.fillStyle = 'rgba(20,14,8,' + (0.3 * (dmg - 0.45) / 0.55).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(v.x - halfW * 0.2, gy, 5 + drip * 5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Kritik hasarda motordan yükselen alev dili + yükselen korlar (dmg > 0.8)
    if (dmg > 0.8 && q > 0.4) {
      const fx = halfW * 0.35, fy = -halfH * 0.9;              // motor ~ ön-üst (lokal)
      const wx = v.x + Math.cos(ang) * fx - Math.sin(ang) * fy;
      const wy = v.y + Math.sin(ang) * fx + Math.cos(ang) * fy;
      const crit = (dmg - 0.8) / 0.2;
      const flick = 0.7 + Math.sin(t * 26) * 0.2 + Math.sin(t * 41) * 0.1;
      const fh = (13 + crit * 16) * flick;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const fg = GradyanDeposu.rad(ctx, wx, wy - fh * 0.4, 1, wx, wy - fh * 0.4, fh, [0, 'rgba(255,240,180,' + (0.6 * crit).toFixed(3) + ')', 0.45, 'rgba(255,130,30,' + (0.4 * crit).toFixed(3) + ')', 1, 'rgba(200,40,0,0)']);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(wx - 5, wy);
      ctx.quadraticCurveTo(wx - 3, wy - fh * 0.6, wx + Math.sin(t * 8) * 3, wy - fh);
      ctx.quadraticCurveTo(wx + 3, wy - fh * 0.6, wx + 5, wy);
      ctx.closePath(); ctx.fill();
      // Yükselen korlar (embers)
      for (let i = 0; i < 3; i++) {
        const ep = ((t * 1.4 + i / 3) % 1);
        const ex2 = wx + Math.sin(t * 3 + i * 2) * (4 + ep * 8);
        const ey2 = wy - ep * (fh + 12);
        const ea = (1 - ep) * 0.7 * crit;
        if (ea <= 0.01) continue;
        ctx.fillStyle = 'rgba(255,' + (140 + Math.floor(rnd(i + Math.floor(t)) * 80)) + ',40,' + ea.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(ex2, ey2, 1 + ep * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },

  // ── Araç gövdesi hasar/yıpranma katmanı (ORİJİNAL, additive) ──
  // drawGame içinde drawVehicle'dan SONRA çağrılır (gövde üstünde görünür).
  // damageLevel 0..1 (tanımsız→0): çizik, ezik, kurum. Uzun mesafede kir filmi.
  // Ağır hasarda ön cam çatlağı bindirmesi.
  _drawVehicleDamageOverlay(ctx, v, vehicleId, mapId, t) {
    if (!v) return;
    const q = this._bgQuality();
    // Yüzeye göre çamur/kar/toz birikimi (hasardan bağımsız; gövde üstünde)
    this._drawVehicleSurfaceMud(ctx, v, mapId, t, q);
    const dmg = Math.max(0, Math.min(1, v.damageLevel || 0));
    // Mesafeye bağlı kir birikimi (uzun sürüşte artar)
    let dist = 0;
    try {
      if (typeof v.distance === 'number') dist = v.distance;
      else if (typeof gameState !== 'undefined' && gameState && typeof gameState.distance === 'number') dist = gameState.distance;
    } catch (e) {}
    const dirt = Math.max(0, Math.min(1, dist / 3000));       // ~3km'de dolu kir
    if (dmg <= 0.02 && dirt <= 0.02) return;

    const halfW = (v.width || 60) * 0.5;
    const halfH = (v.height || 22) * 0.5;
    const rnd = (n) => { const s = Math.sin(n * 91.7 + 4.1) * 43758.5453; return s - Math.floor(s); };

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle || 0);

    // Gövde bölgesine kırp (taşma olmasın) — cam çatlağı bu bloğun DIŞINDA çizilir
    ctx.save();
    ctx.beginPath();
    ctx.rect(-halfW * 1.05, -halfH * 1.1, halfW * 2.1, halfH * 2.6);
    ctx.clip();

    // 1) Kir filmi: alt gövdeye koyu-kahve translucent degrade + sıçramalar
    if (dirt > 0.03 && q > 0.35) {
      const dg = ctx.createLinearGradient(0, -halfH, 0, halfH * 1.4);
      const da = dirt * 0.28;
      dg.addColorStop(0, 'rgba(70,55,35,0)');
      dg.addColorStop(0.55, 'rgba(70,55,35,' + (da * 0.5).toFixed(3) + ')');
      dg.addColorStop(1, 'rgba(48,38,24,' + da.toFixed(3) + ')');
      ctx.fillStyle = dg;
      ctx.fillRect(-halfW * 1.05, -halfH, halfW * 2.1, halfH * 2.4);
      const spN = Math.round(dirt * 10);
      ctx.fillStyle = 'rgba(55,42,26,' + (dirt * 0.4).toFixed(3) + ')';
      for (let i = 0; i < spN; i++) {
        const sx = -halfW + rnd(i) * halfW * 2;
        const sy = halfH * (0.2 + rnd(i + 40) * 0.9);
        const r = 1.5 + rnd(i + 80) * 3;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 2) Çizikler: hasarla artan ince çizgiler (koyu oluk + parlak metal hat)
    if (dmg > 0.12) {
      const scN = Math.round(dmg * 7);
      ctx.lineCap = 'round';
      for (let i = 0; i < scN; i++) {
        const x0 = -halfW * 0.9 + rnd(i * 3 + 1) * halfW * 1.8;
        const y0 = -halfH * 0.7 + rnd(i * 3 + 2) * halfH * 1.5;
        const len = 6 + rnd(i * 3 + 3) * 22;
        const ac = 0.15 + rnd(i + 7) * 0.2;
        ctx.strokeStyle = 'rgba(20,18,16,' + (ac * 0.9).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + len, y0 - 2 + rnd(i) * 4); ctx.stroke();
        ctx.strokeStyle = 'rgba(230,225,215,' + (ac * 0.5).toFixed(3) + ')';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(x0, y0 - 0.8); ctx.lineTo(x0 + len, y0 - 2.8 + rnd(i) * 4); ctx.stroke();
      }
    }

    // 3) Ezikler + kurum: hasarla artan yumuşak koyu blob'lar + parlak bükülme kenarı
    if (dmg > 0.25) {
      const dnN = Math.round(dmg * 5);
      for (let i = 0; i < dnN; i++) {
        const cx = -halfW * 0.85 + rnd(i * 5 + 9) * halfW * 1.7;
        const cy = -halfH * 0.5 + rnd(i * 5 + 13) * halfH * 1.3;
        const r = 4 + rnd(i * 5 + 17) * 7;
        const eg = GradyanDeposu.rad(ctx, cx, cy, 1, cx, cy, r, [0, 'rgba(0,0,0,' + (0.35 * dmg).toFixed(3) + ')', 0.7, 'rgba(0,0,0,' + (0.12 * dmg).toFixed(3) + ')', 1, 'rgba(0,0,0,0)']);
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 * dmg).toFixed(3) + ')';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(cx - 1, cy - 1, r * 0.7, Math.PI * 0.9, Math.PI * 1.7); ctx.stroke();
      }
      // Arka/egzoz kurumu
      const soot = GradyanDeposu.rad(ctx, -halfW * 0.7, 0, 1, -halfW * 0.7, 0, halfW * 0.6, [0, 'rgba(15,12,10,' + (0.3 * dmg).toFixed(3) + ')', 1, 'rgba(15,12,10,0)']);
      ctx.fillStyle = soot;
      ctx.beginPath(); ctx.arc(-halfW * 0.7, 0, halfW * 0.6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();   // kırpma kaldır

    // 4) Ön cam çatlağı: ağır hasarda üst-ön bölgeye çatlak ağı (kırpma dışı)
    if (dmg > 0.6) {
      const ca = (dmg - 0.6) / 0.4;
      const impX = halfW * 0.28 + (rnd(1) - 0.5) * halfW * 0.4;   // çarpma odağı
      const impY = -halfH * 1.5 + (rnd(2) - 0.5) * halfH * 0.6;
      ctx.strokeStyle = 'rgba(235,240,255,' + (0.5 * ca).toFixed(3) + ')';
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      const rays = 7;
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2 + rnd(i) * 0.4;
        const rr = halfH * (0.7 + rnd(i + 5) * 1.1);
        ctx.beginPath(); ctx.moveTo(impX, impY);
        for (let s = 1; s <= 3; s++) {
          const f = s / 3;
          const jx = Math.cos(a) * rr * f + (rnd(i * 4 + s) - 0.5) * 4;
          const jy = Math.sin(a) * rr * f + (rnd(i * 4 + s + 9) - 0.5) * 4;
          ctx.lineTo(impX + jx, impY + jy);
        }
        ctx.stroke();
      }
      // Konsantrik kırık halkalar
      ctx.strokeStyle = 'rgba(220,228,245,' + (0.35 * ca).toFixed(3) + ')';
      for (let ri = 1; ri <= 2; ri++) {
        ctx.beginPath();
        const rad = ri * halfH * 0.5;
        for (let k = 0; k <= 10; k++) {
          const aa = (k / 10) * Math.PI * 2;
          const jr = rad + (rnd(ri * 20 + k) - 0.5) * 3;
          const xx = impX + Math.cos(aa) * jr, yy = impY + Math.sin(aa) * jr;
          if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      // Kırık camda ışık kırılması (hafif sis)
      ctx.fillStyle = 'rgba(200,220,255,' + (0.06 * ca).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(impX, impY, halfH * 0.9, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();   // translate/rotate
  },

  // ── Yüzeye bağlı çamur/kar/toz birikimi (ORİJİNAL, additive) ──
  // Sürüş mesafesi arttıkça alt gövdeye yüzey rengine göre çamur bandı ve
  // sıçrama kümeleri birikir; su/şehir haritalarında birikim azalır.
  // damageLevel'dan bağımsız; drawVehicle'dan SONRA (gövde üstünde) çizilir.
  _drawVehicleSurfaceMud(ctx, v, mapId, t, q) {
    if (!v || q < 0.35) return;
    // Sürüş mesafesi → birikim miktarı
    let dist = 0;
    try {
      if (typeof v.distance === 'number') dist = v.distance;
      else if (typeof gameState !== 'undefined' && gameState && typeof gameState.distance === 'number') dist = gameState.distance;
    } catch (e) {}
    // Yüzey türüne göre birikim çarpanı + renk (ORİJİNAL palet)
    let surf = 0.6, col = '150,130,95';
    switch (mapId) {
      case 'swamp': case 'jungle':                                   surf = 1.15; col = '70,80,45';   break; // koyu ıslak çamur
      case 'desert': case 'canyon': case 'wasteland': case 'beach':  surf = 0.85; col = '205,178,120'; break; // kum
      case 'winter': case 'arctic':                                  surf = 1.0;  col = '235,242,250'; break; // kar/sulusepken
      case 'volcano': case 'mars':                                   surf = 0.9;  col = '110,70,55';   break; // kızıl kül
      case 'moon':                                                   surf = 0.7;  col = '175,175,185'; break; // regolit
      case 'underwater':                                             surf = 0.2;  col = '60,90,90';    break; // su yıkar
      case 'city': case 'neon_city':                                 surf = 0.45; col = '90,85,80';    break; // ıslak kir
      default:                                                       surf = 0.6;  col = '150,130,95';  break;
    }
    const mud = Math.max(0, Math.min(1, (dist / 2600) * surf));
    if (mud <= 0.03) return;
    const grounded = (v.airTime || 0) < 0.06;
    const halfW = (v.width || 60) * 0.5;
    const halfH = (v.height || 22) * 0.5;
    const rnd = (n) => { const s = Math.sin(n * 57.31 + 2.17) * 43758.5453; return s - Math.floor(s); };

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle || 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-halfW * 1.05, -halfH * 1.15, halfW * 2.1, halfH * 2.7);
    ctx.clip();

    // Alt gövdeye yüzey renginde degrade çamur bandı (aşağı doğru koyulaşır)
    const mg = GradyanDeposu.lin(ctx, 0, halfH * 0.1, 0, halfH * 1.5, [0, 'rgba(' + col + ',0)', 0.6, 'rgba(' + col + ',' + (mud * 0.36).toFixed(3) + ')', 1, 'rgba(' + col + ',' + (mud * 0.6).toFixed(3) + ')']);
    ctx.fillStyle = mg;
    ctx.fillRect(-halfW * 1.05, -halfH * 0.4, halfW * 2.1, halfH * 2.2);

    // Sıçrama kümeleri (teker hattı boyunca yoğun, deterministik)
    const clumps = Math.round(6 + mud * 16);
    for (let i = 0; i < clumps; i++) {
      const sx = -halfW + rnd(i * 2.3) * halfW * 2;
      const sy = halfH * (0.12 + rnd(i * 2.3 + 11) * 1.0);
      const r = 1.4 + rnd(i * 2.3 + 21) * (2.4 + mud * 3);
      const a = mud * (0.22 + rnd(i * 2.3 + 31) * 0.4);
      ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }

    // Taze/ıslak sıçrama (hareket halinde arka tekerden fışkıran yeni damla)
    if (grounded && mud > 0.2 && q > 0.4) {
      const kx = -halfW * 0.72, ky = halfH * 0.85;
      const throb = 0.5 + Math.sin(t * 6) * 0.5;
      ctx.fillStyle = 'rgba(' + col + ',' + (mud * 0.5).toFixed(3) + ')';
      for (let j = 0; j < 3; j++) {
        const jx = kx + rnd(j + Math.floor(t * 4)) * halfW * 0.5;
        const jy = ky - rnd(j + 7) * 4;
        ctx.beginPath(); ctx.arc(jx, jy, 1 + throb * 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();   // kırpma kaldır
    ctx.restore();   // translate/rotate
  },

  // ── New Map Backgrounds ───────────────────────────────

  _bgVolcano(ctx, cx, cy, W, t) {
    // Glowing lava sky
    const lsg = GradyanDeposu.lin(ctx, 0, cy, 0, cy+400, [0, '#3a0a00', 0.5, '#6a1a00', 1, '#aa2200']);
    ctx.fillStyle = lsg; ctx.fillRect(cx, cy, W*1.2, 400);
    // Volcano silhouette in bg
    const vx = cx + W*0.7, vy = cy + 300;
    ctx.fillStyle = '#1a0500';
    ctx.beginPath(); ctx.moveTo(vx-180, vy); ctx.lineTo(vx, vy-220); ctx.lineTo(vx+180, vy); ctx.closePath(); ctx.fill();
    // Crater glow
    const cg2 = GradyanDeposu.rad(ctx, vx, vy-220, 0, vx, vy-220, 60, [0, 'rgba(255,140,0,0.9)', 0.4, 'rgba(255,60,0,0.5)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = cg2; ctx.beginPath(); ctx.arc(vx, vy-220, 60, 0, Math.PI*2); ctx.fill();
    // Havada yükselen közler (kırmızı-turuncu parıltılı ambiyans partikülleri)
    this._bgAmbientDrift(ctx, cx, cy, W, t, { count:26, color:'rgba(255,150,60,0.6)', glow:'rgba(255,90,20,0.4)', size:2, drift:8, rise:9, parallax:0.1, yTop:30, yBot:300, seed:3 });
    // Lava particles raining from crater
    for (let li = 0; li < 8; li++) {
      const lt = (t * 0.8 + li * 0.3) % 3;
      const lx = vx + Math.sin(li * 1.4) * 30;
      const ly = vy - 220 - lt * 60;
      const la = lt < 1.5 ? lt/1.5 : (3-lt)/1.5;
      ctx.fillStyle = `rgba(255,${100+Math.floor(li*15)},0,${la*0.8})`;
      ctx.beginPath(); ctx.arc(lx, ly, 3+li%3, 0, Math.PI*2); ctx.fill();
    }
    // Ash clouds
    for (let ac = 0; ac < 5; ac++) {
      const ax = cx + ((t*25 + ac*210) % (W*1.3));
      const ay = cy + 60 + ac*20;
      ctx.fillStyle = `rgba(40,20,10,${0.25+ac*0.05})`;
      ctx.beginPath(); ctx.arc(ax, ay, 30+ac*8, 0, Math.PI*2); ctx.fill();
    }
    // Lava rivers on hills bg
    ctx.fillStyle = 'rgba(255,80,0,0.4)';
    ctx.beginPath(); ctx.moveTo(cx, cy+280);
    for (let i = 0; i <= 6; i++) {
      const mx = cx+i*W*0.2;
      const my = cy + 240 + Math.sin(t*0.5+i)*15;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(cx+W*1.2, cy+300); ctx.lineTo(cx, cy+300); ctx.closePath(); ctx.fill();
  },

  _bgUnderwater(ctx, cx, cy, W, t) {
    // Deep blue gradient
    const uwg = GradyanDeposu.lin(ctx, 0, cy, 0, cy+500, [0, '#001a3a', 0.5, '#002a50', 1, '#000a18']);
    ctx.fillStyle = uwg; ctx.fillRect(cx, cy, W*1.2, 500);
    // God rays from surface
    for (let gr = 0; gr < 7; gr++) {
      const grx = cx + W*0.1 + gr*W*0.12;
      const grw = 15 + gr*4;
      const gra = GradyanDeposu.lin(ctx, grx, cy, grx, cy+400, [0, `rgba(0,150,255,${0.1+Math.sin(t*0.3+gr)*0.04})`, 1, 'rgba(0,50,150,0)']);
      ctx.fillStyle = gra;
      ctx.beginPath();
      ctx.moveTo(grx - grw, cy);
      ctx.lineTo(grx + grw, cy);
      ctx.lineTo(grx + grw*0.5 + Math.sin(t*0.5+gr)*20, cy + 400);
      ctx.lineTo(grx - grw*0.5 + Math.sin(t*0.5+gr)*20, cy + 400);
      ctx.closePath(); ctx.fill();
    }
    // Bubbles floating up
    for (let bi = 0; bi < 12; bi++) {
      const bprog = ((t * 0.6 + bi * 0.22) % 3) / 3;
      const bx = cx + W * (0.05 + (bi * 0.083) % 0.9);
      const by = cy + 400 - bprog * 420;
      const br = 2 + bi % 4;
      ctx.fillStyle = `rgba(100,200,255,${0.15 + bprog*0.25})`;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill();
    }
    // Coral silhouettes
    for (let co = 0; co < 6; co++) {
      const cox = cx + co * W * 0.18;
      const coy = cy + 310;
      const coh = 40 + co * 12;
      ctx.fillStyle = `rgba(${150+co*15},${40+co*10},${80+co*8},0.6)`;
      // Branch coral
      ctx.beginPath(); ctx.moveTo(cox, coy); ctx.lineTo(cox, coy-coh);
      ctx.lineTo(cox-12, coy-coh+15); ctx.lineTo(cox, coy-coh*0.7);
      ctx.lineTo(cox+12, coy-coh+10); ctx.closePath(); ctx.fill();
    }
    // Fish
    for (let fi = 0; fi < 4; fi++) {
      const fx = cx + ((t*40 + fi*160) % (W*1.3));
      const fy = cy + 120 + Math.sin(t*0.8+fi*1.3)*50;
      ctx.fillStyle = `rgba(255,${150+fi*20},0,0.7)`;
      ctx.beginPath(); ctx.ellipse(fx, fy, 10, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx-10, fy); ctx.lineTo(fx-18, fy-5); ctx.lineTo(fx-18, fy+5); ctx.closePath(); ctx.fill();
    }
    // Seaweed swaying
    for (let sw = 0; sw < 5; sw++) {
      const swx = cx + sw * W * 0.22;
      const swy = cy + 300;
      ctx.strokeStyle = `rgba(0,${120+sw*12},${40+sw*6},0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(swx, swy);
      for (let sy = 0; sy < 5; sy++) {
        const seg = sy / 5;
        ctx.quadraticCurveTo(
          swx + Math.sin(t*1.2 + sw + seg)*18, swy - 15 - sy*15,
          swx + Math.sin(t*0.8 + sw + seg + 0.5)*12, swy - 30 - sy*15
        );
      }
      ctx.stroke();
    }
  },

  _bgMoon(ctx, cx, cy, W, t) {
    // Stars (many more on moon)
    for (let si = 0; si < 80; si++) {
      const sx = cx + ((si * 137.5 * 3.2) % (W*1.2));
      const sy = cy + ((si * 73.1) % 250);
      const ss = si % 5 === 0 ? 2.5 : 1;
      const sa = 0.4 + Math.abs(Math.sin(t*0.3 + si)) * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${sa})`;
      ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI*2); ctx.fill();
    }
    // Earth in background
    const ex = cx + W * 0.85, ey = cy + 100;
    const eg = GradyanDeposu.rad(ctx, ex-12, ey-15, 0, ex, ey, 55, [0, '#4488ff', 0.4, '#1155cc', 0.7, '#2266aa', 1, '#003366']);
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 55, 0, Math.PI*2); ctx.fill();
    // Earth landmass
    ctx.fillStyle = 'rgba(50,180,50,0.7)';
    ctx.beginPath(); ctx.ellipse(ex-12, ey-8, 22, 18, -0.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex+14, ey+10, 16, 14, 0.4, 0, Math.PI*2); ctx.fill();
    // Earth clouds
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(ex-5, ey-15, 28, 8, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex+8, ey+5, 20, 6, -0.2, 0, Math.PI*2); ctx.fill();
    // Moon atmosphere haze
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx+W*0.4, cy+350, W*0.55, 80, 0, 0, Math.PI*2); ctx.fill();
    // Crater ring silhouettes in bg
    for (let cr = 0; cr < 4; cr++) {
      const crx = cx + W*(0.1+cr*0.25);
      const cry = cy + 280;
      const crr = 20 + cr * 12;
      ctx.strokeStyle = 'rgba(60,60,80,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(crx, cry, crr, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(30,30,50,0.3)';
      ctx.beginPath(); ctx.arc(crx, cry, crr, 0, Math.PI*2); ctx.fill();
    }
  },

  _bgNeonCity(ctx, cx, cy, W, t) {
    // City buildings with neon glow
    const buildings = [
      {x:0.02,w:0.08,h:0.55,col:'#110022'},{x:0.11,w:0.06,h:0.72,col:'#001122'},
      {x:0.18,w:0.10,h:0.45,col:'#220011'},{x:0.29,w:0.05,h:0.80,col:'#110033'},
      {x:0.35,w:0.09,h:0.60,col:'#001122'},{x:0.45,w:0.07,h:0.50,col:'#220022'},
      {x:0.53,w:0.11,h:0.68,col:'#001133'},{x:0.65,w:0.06,h:0.42,col:'#110022'},
      {x:0.72,w:0.08,h:0.75,col:'#002211'},{x:0.81,w:0.10,h:0.55,col:'#110022'},
      {x:0.92,w:0.09,h:0.48,col:'#220011'},
    ];
    const neonCols = ['#ff00ff','#00ffff','#ff0088','#00ff88','#8800ff','#ff4400','#00aaff'];
    buildings.forEach((b, bi) => {
      const bx = cx + b.x * W, bw = b.w * W;
      const by = cy + 400 - b.h * 400;
      const bh = b.h * 400;
      // Building
      ctx.fillStyle = b.col;
      ctx.fillRect(bx, by, bw, bh);
      // Windows
      ctx.fillStyle = `rgba(255,255,150,${0.1+Math.sin(t*2+bi)*0.05})`;
      for (let wr = 0; wr < Math.floor(b.h*8); wr++) {
        for (let wc = 0; wc < Math.floor(b.w*30); wc++) {
          if (Math.sin(bi*7+wr*3+wc*5) > 0.1) {
            ctx.fillRect(bx+5+wc*8, by+8+wr*12, 5, 7);
          }
        }
      }
      // Neon sign glow on top
      const nc = neonCols[bi % neonCols.length];
      ctx.shadowColor = nc; ctx.shadowBlur = 12;
      ctx.fillStyle = nc; ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = nc.replace('ff','44') + '88';
      ctx.fillRect(bx-4, by-2, bw+8, 8);
      ctx.shadowBlur = 0;
    });
    // Neon grid on ground
    ctx.strokeStyle = `rgba(0,255,255,${0.08+Math.sin(t*0.5)*0.03})`; ctx.lineWidth = 1;
    for (let gi = 0; gi < 20; gi++) {
      const gx = cx + ((gi * W/10 - (t*20)%( W/10)) % (W*1.2));
      ctx.beginPath(); ctx.moveTo(gx, cy+200); ctx.lineTo(gx, cy+400); ctx.stroke();
    }
    // Flying cars
    for (let fc = 0; fc < 3; fc++) {
      const fcx = cx + ((t*60 + fc*250) % (W*1.3));
      const fcy = cy + 60 + fc*40;
      ctx.fillStyle = neonCols[fc];
      ctx.shadowColor = neonCols[fc]; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(fcx, fcy, 15, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Rain streaks
    ctx.strokeStyle = 'rgba(0,150,255,0.15)'; ctx.lineWidth = 1;
    for (let ri2 = 0; ri2 < 25; ri2++) {
      const rx = cx + ((ri2*73 - t*60) % (W*1.2));
      const ry = cy + (t*80 + ri2*30) % 400;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx-2, ry+12); ctx.stroke();
    }
  },

  _bgWasteland(ctx, cx, cy, W, t) {
    // Hazy post-apocalyptic sky
    const wsg = GradyanDeposu.lin(ctx, 0, cy, 0, cy+400, [0, '#3a2a1a', 0.5, '#5a3a1a', 1, '#8a5a2a']);
    ctx.fillStyle = wsg; ctx.fillRect(cx, cy, W*1.2, 400);
    // Dust storm at horizon
    const dg = GradyanDeposu.lin(ctx, 0, cy+200, 0, cy+320, [0, 'rgba(180,120,60,0)', 0.5, 'rgba(180,120,60,0.3)', 1, 'rgba(100,70,30,0)']);
    ctx.fillStyle = dg; ctx.fillRect(cx, cy+200, W*1.2, 120);
    // Dead trees
    for (let dt = 0; dt < 5; dt++) {
      const dtx = cx + dt * W * 0.22;
      const dty = cy + 290;
      ctx.fillStyle = '#1a0a00'; ctx.strokeStyle = '#2a1a00'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(dtx, dty); ctx.lineTo(dtx, dty-70); ctx.stroke();
      // Bare branches
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dtx, dty-50); ctx.lineTo(dtx-20, dty-70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dtx, dty-45); ctx.lineTo(dtx+18, dty-65); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dtx, dty-35); ctx.lineTo(dtx-15, dty-48); ctx.stroke();
    }
    // Ruined building shell
    const rbx = cx + W*0.65;
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(rbx, cy+180, 70, 120);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(rbx+10, cy+200, 18, 25); // windows (broken)
    ctx.fillRect(rbx+42, cy+200, 18, 25);
    ctx.fillRect(rbx+10, cy+235, 18, 25);
    // Skull/warning sign
    ctx.fillStyle = 'rgba(255,200,0,0.6)'; ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('☢', cx+W*0.35, cy+150);
    // Dust whirls
    for (let dw = 0; dw < 3; dw++) {
      const dwx = cx + ((t*30 + dw*200) % (W*1.2));
      const dwy = cy + 270;
      ctx.strokeStyle = `rgba(180,130,60,${0.2+dw*0.06})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dwx, dwy, 15+dw*8, 0, Math.PI*2); ctx.stroke();
    }
  },

  _bgCanyon(ctx, cx, cy, W, t) {
    // Canyon wall gradients
    const cwg = GradyanDeposu.lin(ctx, 0, cy, 0, cy+400, [0, '#8a4a2a', 0.4, '#aa5a2a', 0.7, '#c06030', 1, '#7a3a1a']);
    ctx.fillStyle = cwg; ctx.fillRect(cx, cy, W*1.2, 400);
    // Far canyon walls (silhouettes)
    ctx.fillStyle = '#6a3a1a';
    for (let cw = 0; cw < 3; cw++) {
      const cwx = cx + cw * W * 0.4;
      const cwh = 120 + cw * 30;
      ctx.beginPath(); ctx.moveTo(cwx, cy + cwh);
      for (let pt = 0; pt < 8; pt++) {
        const px = cwx + pt * W * 0.055;
        const py = cy + cwh - Math.abs(Math.sin(pt * 1.8 + cw)) * 60;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(cwx + W*0.42, cy + cwh);
      ctx.closePath(); ctx.fill();
    }
    // Rock strata layers
    const strataColors = ['rgba(180,100,50,0.3)','rgba(200,130,60,0.2)','rgba(160,80,40,0.35)'];
    strataColors.forEach((sc, si) => {
      ctx.fillStyle = sc;
      ctx.fillRect(cx, cy + 200 + si * 30, W * 1.2, 12 + si * 4);
    });
    // Eagle
    const eax = cx + ((t*15) % (W*1.2));
    const eay = cy + 80 + Math.sin(t*0.4)*20;
    ctx.strokeStyle = '#2a1800'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(eax-12, eay); ctx.quadraticCurveTo(eax-6, eay-6, eax, eay);
    ctx.quadraticCurveTo(eax+6, eay-6, eax+12, eay); ctx.stroke();
    // Canyon river sparkle at bottom
    ctx.fillStyle = 'rgba(100,180,255,0.15)';
    ctx.beginPath(); ctx.moveTo(cx, cy+350);
    for (let ri3 = 0; ri3 <= 10; ri3++) {
      const ry = cy + 350 + Math.sin(t + ri3)*5;
      ctx.lineTo(cx + ri3*W*0.12, ry);
    }
    ctx.lineTo(cx+W*1.2, cy+360); ctx.lineTo(cx, cy+360); ctx.closePath(); ctx.fill();
  },

  drawControls(ctx, W, H, throttle, brake) {
    const btnR = Math.min(60, W * 0.1);
    const padX = 16, padY = H - btnR - 16;
    // Brake button (left)
    ctx.globalAlpha = brake > 0 ? 0.8 : 0.5;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(padX + btnR, padY, btnR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.floor(btnR*0.45)+'px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('◀', padX + btnR, padY);
    // Gas button (right)
    ctx.globalAlpha = throttle > 0 ? 0.85 : 0.5;
    ctx.fillStyle = '#27ae60';
    ctx.beginPath(); ctx.arc(W - padX - btnR, padY, btnR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('▶', W - padX - btnR, padY);
    ctx.globalAlpha = 1;
    return {
      leftBtn: { x: padX, y: padY - btnR, r: btnR + 10 },
      rightBtn: { x: W - padX - btnR * 2, y: padY - btnR, r: btnR + 10 }
    };
  }
,
  // ═══════════════════════════════════════════════════════════════
  // WEATHER OVERLAY SYSTEM
  // ═══════════════════════════════════════════════════════════════
  _weatherTime: 0,
  _weatherDrops: [],
  _weatherSnow: [],

  _initWeatherDrops(W, H, count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 8 + Math.random() * 6,
        len: 10 + Math.random() * 14,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    return arr;
  },

  _initSnowFlakes(W, H, count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.5 + Math.random() * 3,
        speed: 0.5 + Math.random() * 1.5,
        drift: (Math.random() - 0.5) * 0.5,
        opacity: 0.4 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03
      });
    }
    return arr;
  },

  drawWeather(ctx, W, H, mapId, dt) {
    this._weatherTime += dt;
    const t = this._weatherTime;

    // Rain maps: countryside, city, jungle, beach, canyon
    const rainMaps = ['countryside','city','jungle','beach','canyon','mars'];
    // Snow maps: winter
    const snowMaps = ['winter','moon'];
    // Ash maps: volcano
    const ashMaps = ['volcano'];
    // Dust maps: desert, wasteland
    const dustMaps = ['desert','wasteland'];
    // Bubble maps: underwater
    const bubbleMaps = ['underwater'];

    if (rainMaps.includes(mapId)) {
      this._drawRainOverlay(ctx, W, H, t);
    } else if (snowMaps.includes(mapId)) {
      this._drawSnowOverlay(ctx, W, H, t);
    } else if (ashMaps.includes(mapId)) {
      this._drawAshOverlay(ctx, W, H, t);
    } else if (dustMaps.includes(mapId)) {
      this._drawDustOverlay(ctx, W, H, t);
    } else if (bubbleMaps.includes(mapId)) {
      this._drawBubbleOverlay(ctx, W, H, t);
    }
  },

  _drawRainOverlay(ctx, W, H, t) {
    if (this._weatherDrops.length === 0) this._weatherDrops = this._initWeatherDrops(W, H, 80);
    ctx.save();
    ctx.strokeStyle = 'rgba(150,180,220,0.45)';
    ctx.lineWidth = 1.2;
    for (const d of this._weatherDrops) {
      d.y += d.speed;
      d.x -= d.speed * 0.25;
      if (d.y > H + 20) { d.y = -20; d.x = Math.random() * W; }
      if (d.x < -20) { d.x = W + 20; }
      ctx.globalAlpha = d.opacity;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.25, d.y + d.len);
      ctx.stroke();
    }
    // Puddle shimmer on ground (bottom 10%)
    ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.04;
    const pw = GradyanDeposu.lin(ctx, 0, H * 0.9, 0, H, [0, 'rgba(100,140,200,0)', 1, 'rgba(100,140,200,0.5)']);
    ctx.fillStyle = pw;
    ctx.fillRect(0, H * 0.9, W, H * 0.1);
    ctx.restore();
  },

  _drawSnowOverlay(ctx, W, H, t) {
    if (this._weatherSnow.length === 0) this._weatherSnow = this._initSnowFlakes(W, H, 60);
    ctx.save();
    for (const f of this._weatherSnow) {
      f.wobble += f.wobbleSpeed;
      f.x += f.drift + Math.sin(f.wobble) * 0.3;
      f.y += f.speed;
      if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W; }
      if (f.x < -10) f.x = W + 10;
      if (f.x > W + 10) f.x = -10;
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = 'rgba(230,240,255,0.9)';
      ctx.beginPath();
      // Draw snowflake (simple 6-arm)
      for (let arm = 0; arm < 6; arm++) {
        const ang = (arm / 6) * Math.PI * 2;
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(f.x + Math.cos(ang) * f.r, f.y + Math.sin(ang) * f.r);
      }
      ctx.strokeStyle = 'rgba(220,235,255,0.8)';
      ctx.lineWidth = f.r > 2.5 ? 1.5 : 1;
      ctx.stroke();
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    // Snow accumulation hint at bottom
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'rgba(230,240,255,0.6)';
    ctx.beginPath();
    let sx = 0;
    while (sx < W) {
      const bumpH = 4 + Math.sin(sx * 0.05 + t * 0.2) * 3;
      ctx.lineTo(sx, H - bumpH);
      sx += 8;
    }
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  _drawAshOverlay(ctx, W, H, t) {
    ctx.save();
    // Ash particle shower
    const ashCount = 40;
    for (let i = 0; i < ashCount; i++) {
      const seed = i * 7.3 + t * 0.3;
      const x = ((i * 123.7 + t * 30) % W + W) % W;
      const y = ((i * 97.3 + t * 20) % H + H) % H;
      const r = 1.5 + Math.sin(seed) * 1;
      ctx.globalAlpha = 0.2 + Math.abs(Math.sin(seed * 2)) * 0.3;
      ctx.fillStyle = `rgba(${80+Math.floor(i*3%40)},${70+Math.floor(i*2%30)},${60+Math.floor(i%20)},1)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // Red tint atmosphere
    ctx.globalAlpha = 0.06 + Math.sin(t * 0.5) * 0.03;
    ctx.fillStyle = 'rgba(255,50,0,1)';
    ctx.fillRect(0, 0, W, H);
    // Heat haze lines
    ctx.globalAlpha = 0.04 + Math.sin(t * 2) * 0.02;
    ctx.strokeStyle = 'rgba(255,120,0,0.3)';
    ctx.lineWidth = 2;
    for (let hz = 0; hz < 6; hz++) {
      const hy = H * (0.4 + hz * 0.08);
      ctx.beginPath();
      for (let hx = 0; hx < W; hx += 4) {
        hx === 0 ? ctx.moveTo(hx, hy + Math.sin(hx * 0.05 + t * 3) * 3)
                 : ctx.lineTo(hx, hy + Math.sin(hx * 0.05 + t * 3 + hz) * 3);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawDustOverlay(ctx, W, H, t) {
    ctx.save();
    // Horizontal dust streaks
    ctx.globalAlpha = 0.12 + Math.sin(t * 1.5) * 0.06;
    ctx.fillStyle = 'rgba(210,185,140,0.5)';
    for (let ds = 0; ds < 8; ds++) {
      const dy = H * (0.2 + ds * 0.08) + Math.sin(t + ds) * 10;
      const dw = 80 + Math.sin(t * 2 + ds) * 40;
      const dx = ((ds * 200 + t * 80) % (W + dw) + W) % (W + dw) - dw;
      ctx.beginPath();
      ctx.ellipse(dx, dy, dw, 4 + Math.random() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Overall haze
    ctx.globalAlpha = 0.04 + Math.sin(t * 0.4) * 0.02;
    ctx.fillStyle = 'rgba(200,175,120,1)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  _drawBubbleOverlay(ctx, W, H, t) {
    ctx.save();
    // Rising bubbles
    const bubCount = 20;
    for (let bi = 0; bi < bubCount; bi++) {
      const seed = bi * 11.7;
      const x = (seed * 127.3) % W;
      const y = H - ((seed * 73.1 + t * 30) % H);
      const r = 3 + Math.sin(seed * 2) * 3;
      ctx.globalAlpha = 0.3 + Math.abs(Math.sin(seed + t)) * 0.3;
      ctx.strokeStyle = `rgba(150,200,255,0.7)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      // Bubble highlight
      ctx.fillStyle = 'rgba(200,230,255,0.4)';
      ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // Blue-green tint
    ctx.globalAlpha = 0.08 + Math.sin(t * 0.3) * 0.03;
    ctx.fillStyle = 'rgba(0,80,150,1)';
    ctx.fillRect(0, 0, W, H);
    // God rays
    ctx.globalAlpha = 0.04;
    for (let gr = 0; gr < 5; gr++) {
      const gx = W * (0.1 + gr * 0.2) + Math.sin(t * 0.5 + gr) * 20;
      const rayG = GradyanDeposu.lin(ctx, gx, 0, gx + 30, H, [0, 'rgba(100,200,255,0.5)', 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = rayG;
      ctx.beginPath();
      ctx.moveTo(gx - 15, 0); ctx.lineTo(gx + 15, 0);
      ctx.lineTo(gx + 50, H); ctx.lineTo(gx - 50, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // MAP-SPECIFIC AMBIENT EFFECTS (drawn over terrain, under vehicles)
  // ═══════════════════════════════════════════════════════════════

  drawAmbientEffects(ctx, W, H, mapId, camX, t) {
    switch(mapId) {
      case 'volcano':   this._ambientVolcano(ctx, W, H, camX, t); break;
      case 'underwater':this._ambientUnderwater(ctx, W, H, camX, t); break;
      case 'neon':      this._ambientNeon(ctx, W, H, camX, t); break;
      case 'moon':      this._ambientMoon(ctx, W, H, camX, t); break;
      case 'mars':      this._ambientMars(ctx, W, H, camX, t); break;
      case 'night':     this._ambientNight(ctx, W, H, camX, t); break;
    }
  },

  _ambientVolcano(ctx, W, H, camX, t) {
    // Lava glow on ground
    ctx.save();
    const glowY = H * 0.75;
    const lg = GradyanDeposu.lin(ctx, 0, glowY, 0, H, [0, 'rgba(255,80,0,0)', 1, `rgba(255,40,0,${0.15 + Math.sin(t * 2) * 0.05})`]);
    ctx.fillStyle = lg;
    ctx.fillRect(0, glowY, W, H - glowY);
    // Random lava pops
    if (Math.random() < 0.05) {
      const lpx = Math.random() * W;
      const lpy = H * (0.8 + Math.random() * 0.15);
      const lpg = GradyanDeposu.rad(ctx, lpx, lpy, 0, lpx, lpy, 20, [0, 'rgba(255,200,0,0.6)', 1, 'rgba(255,0,0,0)']);
      ctx.fillStyle = lpg;
      ctx.beginPath(); ctx.arc(lpx, lpy, 20, 0, Math.PI * 2); ctx.fill();
    }
    // Ember particles rising
    for (let em = 0; em < 3; em++) {
      const emx = (camX * 0.3 + em * 200 + t * 40) % W;
      const emy = H - (t * 20 + em * 80) % (H * 0.5);
      ctx.globalAlpha = 0.4 + Math.sin(t * 5 + em) * 0.3;
      ctx.fillStyle = Math.random() > 0.5 ? '#FF4400' : '#FFAA00';
      ctx.beginPath(); ctx.arc(emx, emy, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  _ambientUnderwater(ctx, W, H, camX, t) {
    ctx.save();
    // Caustic light patterns
    ctx.globalAlpha = 0.06 + Math.sin(t * 1.5) * 0.03;
    for (let ca = 0; ca < 8; ca++) {
      const cx = ((ca * 150 + camX * 0.1) % W + W) % W;
      const cy = H * (0.1 + Math.sin(t + ca) * 0.08 + ca * 0.1);
      const cr = 30 + Math.sin(t * 2 + ca) * 15;
      const cg2 = GradyanDeposu.rad(ctx, cx, cy, 0, cx, cy, cr, [0, 'rgba(100,220,255,0.8)', 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = cg2;
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    }
    // Fish silhouettes
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#004466';
    const fishX = ((camX * 0.2 + t * 20) % (W + 80) + W) % (W + 80) - 80;
    const fishY = H * 0.3 + Math.sin(t * 0.5) * 20;
    ctx.beginPath();
    ctx.ellipse(fishX, fishY, 20, 8, Math.sin(t * 0.3) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fishX - 20, fishY); ctx.lineTo(fishX - 30, fishY - 6); ctx.lineTo(fishX - 30, fishY + 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  _ambientNeon(ctx, W, H, camX, t) {
    ctx.save();
    // Scanline effect
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000';
    for (let sl = 0; sl < H; sl += 4) {
      ctx.fillRect(0, sl, W, 2);
    }
    // Neon flicker on screen edges
    ctx.globalAlpha = 0.1 + Math.sin(t * 8) * 0.05;
    const edgeG = GradyanDeposu.lin(ctx, 0, 0, 60, 0, [0, 'rgba(255,0,255,0.4)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = edgeG; ctx.fillRect(0, 0, 60, H);
    const edgeG2 = GradyanDeposu.lin(ctx, W, 0, W - 60, 0, [0, 'rgba(0,255,255,0.4)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = edgeG2; ctx.fillRect(W - 60, 0, 60, H);
    ctx.restore();
  },

  _ambientMoon(ctx, W, H, camX, t) {
    ctx.save();
    // Starfield twinkle overlay
    ctx.globalAlpha = 0.3;
    for (let s = 0; s < 20; s++) {
      const sx = (s * 137.5) % W;
      const sy = (s * 97.3) % (H * 0.6);
      const sr = 0.5 + Math.abs(Math.sin(t * 2 + s)) * 1;
      ctx.fillStyle = 'rgba(255,255,220,0.8)';
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    // Faint Earth glow from upper right
    ctx.globalAlpha = 0.04 + Math.sin(t * 0.2) * 0.01;
    const earthG = GradyanDeposu.rad(ctx, W * 0.85, H * 0.08, 20, W * 0.85, H * 0.08, 120, [0, 'rgba(60,140,220,0.6)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = earthG;
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.08, 120, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  _ambientMars(ctx, W, H, camX, t) {
    ctx.save();
    // Red dust haze
    ctx.globalAlpha = 0.08 + Math.sin(t * 0.3) * 0.04;
    ctx.fillStyle = 'rgba(200,80,30,1)';
    ctx.fillRect(0, 0, W, H);
    // Dust devils
    const ddx = ((camX * 0.1 + t * 15) % (W + 60) + W) % (W + 60) - 60;
    const ddy = H * 0.5;
    ctx.globalAlpha = 0.1 + Math.sin(t * 3) * 0.05;
    const ddg = GradyanDeposu.lin(ctx, ddx, ddy, ddx + 8, H * 0.2, [0, 'rgba(200,100,50,0.4)', 1, 'rgba(150,70,30,0)']);
    ctx.fillStyle = ddg;
    ctx.beginPath();
    ctx.moveTo(ddx - 4, ddy); ctx.lineTo(ddx + 4, ddy);
    ctx.lineTo(ddx + 20, H * 0.2); ctx.lineTo(ddx - 20, H * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  _ambientNight(ctx, W, H, camX, t) {
    ctx.save();
    // Headlight cone effect (simulated from vehicle)
    const lightConeG = GradyanDeposu.lin(ctx, W * 0.55, H * 0.6, W * 0.9, H * 0.8, [0, `rgba(255,250,200,${0.12 + Math.sin(t * 0.5) * 0.02})`, 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = lightConeG;
    ctx.beginPath();
    ctx.moveTo(W * 0.55, H * 0.5);
    ctx.lineTo(W, H * 0.65);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.45, H);
    ctx.closePath(); ctx.fill();
    // Night vignette
    const nvg = GradyanDeposu.rad(ctx, W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,30,0.35)']);
    ctx.fillStyle = nvg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED SCREEN EFFECTS
  // ═══════════════════════════════════════════════════════════════

  drawScreenFX(ctx, W, H, fxType, intensity) {
    intensity = intensity || 1;
    ctx.save();
    switch(fxType) {
      case 'speed_blur':
        // Horizontal motion blur lines
        ctx.globalAlpha = 0.06 * intensity;
        for (let sb = 0; sb < 12; sb++) {
          const sy = H * 0.2 + sb * (H * 0.6 / 12);
          const sw = 60 + Math.random() * 120;
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(0, sy - 0.5, sw * intensity, 1);
        }
        break;

      case 'nitro_flash':
        // Orange/blue flash vignette
        ctx.globalAlpha = 0.15 * intensity;
        const nfG = GradyanDeposu.rad(ctx, W/2, H/2, W*0.2, W/2, H/2, W*0.8, [0, 'rgba(0,0,0,0)', 1, 'rgba(255,120,0,0.7)']);
        ctx.fillStyle = nfG;
        ctx.fillRect(0, 0, W, H);
        break;

      case 'crash':
        // Red flash
        ctx.globalAlpha = 0.25 * intensity;
        const cfG = GradyanDeposu.rad(ctx, W/2, H/2, 0, W/2, H/2, W*0.8, [0, 'rgba(255,50,0,0.4)', 1, 'rgba(0,0,0,0)']);
        ctx.fillStyle = cfG;
        ctx.fillRect(0, 0, W, H);
        break;

      case 'rank_up':
        // Golden glow
        ctx.globalAlpha = 0.3 * intensity;
        const rugG = GradyanDeposu.rad(ctx, W/2, H/2, 0, W/2, H/2, W, [0, 'rgba(255,220,0,0.5)', 0.6, 'rgba(255,150,0,0.2)', 1, 'rgba(0,0,0,0)']);
        ctx.fillStyle = rugG;
        ctx.fillRect(0, 0, W, H);
        break;

      case 'vignette':
        // Always-on subtle vignette
        ctx.globalAlpha = 0.25 * intensity;
        const vigG = GradyanDeposu.rad(ctx, W/2, H/2, W*0.25, W/2, H/2, W*0.8, [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.7)']);
        ctx.fillStyle = vigG;
        ctx.fillRect(0, 0, W, H);
        break;
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // VEHICLE GLOW AND TRAIL EFFECTS
  // ═══════════════════════════════════════════════════════════════

  drawVehicleGlow(ctx, x, y, vehicleId, parts, thr, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Base ambient aura — subtle heartbeat so the car always feels "alive"
    {
      const breathe = 0.05 + Math.sin(t * 1.6) * 0.02;
      const ba = GradyanDeposu.rad(ctx, x, y, 6, x, y, 46, [0, `rgba(255,235,190,${breathe})`, 0.55, `rgba(255,180,120,${breathe * 0.4})`, 1, 'rgba(0,0,0,0)']);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ba;
      ctx.beginPath(); ctx.arc(x, y, 46, 0, Math.PI * 2); ctx.fill();
    }
    // Speed glow — grows hot & bright with throttle, with a warm-white core
    if (thr > 0.6) {
      const sf = (thr - 0.6) / 0.4; // 0..1
      const rad = 42 + sf * 24;
      ctx.globalAlpha = 0.35 + sf * 0.35;
      const sg = GradyanDeposu.rad(ctx, x, y, 4, x, y, rad, [0, `rgba(255,245,220,${0.35 + sf * 0.35})`, 0.35, `rgba(255,190,90,${0.25 + sf * 0.25})`, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    // Wing glow (anti-grav blue) — dual-layer with a shimmering inner core
    if (parts && parts.includes('wing')) {
      const shimmer = 0.15 + Math.sin(t * 3) * 0.08;
      const wg = GradyanDeposu.rad(ctx, x, y, 8, x, y, 56, [0, `rgba(140,230,255,${shimmer * 1.2})`, 0.4, `rgba(0,180,255,${shimmer})`, 1, 'rgba(0,0,0,0)']);
      ctx.globalAlpha = 1;
      ctx.fillStyle = wg;
      ctx.beginPath(); ctx.arc(x, y, 56, 0, Math.PI * 2); ctx.fill();
      // Bright pulsing core dot
      ctx.globalAlpha = 0.3 + Math.sin(t * 5) * 0.15;
      const wc = GradyanDeposu.rad(ctx, x, y, 0, x, y, 16, [0, 'rgba(210,245,255,0.6)', 1, 'rgba(0,180,255,0)']);
      ctx.fillStyle = wc;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    }
    // Nitro glow — flickering fiery halo trailing the rear
    if (parts && parts.includes('nitro') && thr > 0.5) {
      const flick = 0.22 + Math.sin(t * 22) * 0.08 + Math.random() * 0.12;
      const ng = GradyanDeposu.rad(ctx, x - 22, y, 0, x - 22, y, 40, [0, `rgba(255,235,180,${flick})`, 0.35, `rgba(255,120,20,${flick})`, 1, 'rgba(0,0,0,0)']);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(x - 22, y, 40, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // TERRAIN TINT OVERLAYS (map-specific ground tinting)
  // ═══════════════════════════════════════════════════════════════

  getMapGroundTint(mapId) {
    const tints = {
      countryside: null,
      desert:      'rgba(255,200,100,0.06)',
      winter:      'rgba(200,220,255,0.08)',
      beach:       'rgba(255,220,150,0.05)',
      city:        'rgba(100,100,130,0.06)',
      jungle:      'rgba(50,150,50,0.07)',
      mars:        'rgba(200,80,30,0.10)',
      moon:        'rgba(180,180,200,0.08)',
      neon:        'rgba(0,0,50,0.10)',
      volcano:     'rgba(200,50,0,0.10)',
      underwater:  'rgba(0,80,200,0.12)',
      wasteland:   'rgba(100,80,50,0.08)',
      canyon:      'rgba(180,100,50,0.07)',
    };
    return tints[mapId] || null;
  }

,

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED LIGHTING SYSTEM
  // ═══════════════════════════════════════════════════════════════

  LIGHT_SOURCES: [],

  addLight(x, y, radius, color, intensity, type) {
    const light = {
      id: Date.now() + Math.random(),
      x, y, radius,
      color: color || '#ffffff',
      intensity: intensity || 1.0,
      baseIntensity: intensity || 1.0,
      type: type || 'static',
      phase: Math.random() * Math.PI * 2
    };
    this.LIGHT_SOURCES.push(light);
    return light;
  },

  updateLights(dt, t, vehicleX) {
    for (let i = this.LIGHT_SOURCES.length - 1; i >= 0; i--) {
      const light = this.LIGHT_SOURCES[i];
      if (light.type === 'flicker') {
        light.intensity = light.baseIntensity + (Math.random() - 0.5) * 0.3;
      } else if (light.type === 'pulse') {
        light.intensity = light.baseIntensity + Math.sin(t * 2 + light.phase) * 0.4;
      } else if (light.type === 'sweep') {
        light.x = vehicleX + Math.sin(t + light.phase) * light.radius;
      }
      light.intensity = Math.max(0, Math.min(2, light.intensity));
      if (light.lifetime !== undefined) {
        light.lifetime -= dt;
        if (light.lifetime <= 0) {
          this.LIGHT_SOURCES.splice(i, 1);
        }
      }
    }
  },

  renderLights(ctx, W, H, camX) {
    if (!this.LIGHT_SOURCES || this.LIGHT_SOURCES.length === 0) return;
    ctx.save();
    // Ambient darkening overlay
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(40,40,60,0.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    for (const light of this.LIGHT_SOURCES) {
      const sx = light.x - camX;
      const sy = light.y;
      if (sx < -light.radius || sx > W + light.radius) continue;
      const col = light.color || '#ffffff';
      // Parse hex color to rgb for gradient
      let r = 255, g = 255, b = 255;
      if (col.startsWith('#') && col.length >= 7) {
        r = parseInt(col.slice(1, 3), 16);
        g = parseInt(col.slice(3, 5), 16);
        b = parseInt(col.slice(5, 7), 16);
      }
      const alpha = Math.min(1, Math.max(0, light.intensity * 0.6));
      const lightGrad = GradyanDeposu.rad(ctx, sx, sy, 0, sx, sy, light.radius, [0, `rgba(${r},${g},${b},${alpha})`, 0.4, `rgba(${r},${g},${b},${alpha * 0.4})`, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  applyDynamicShadow(ctx, lightX, lightY, objects) {
    if (!objects || objects.length === 0) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000000';
    for (const obj of objects) {
      const dx = obj.x - lightX;
      const dy = obj.y - lightY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx2 = dx / dist;
      const ny2 = dy / dist;
      const shadowLen = obj.h * 2;
      const sx1 = obj.x - obj.w / 2;
      const sx2 = obj.x + obj.w / 2;
      const sy1 = obj.y;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy1);
      ctx.lineTo(sx2 + nx2 * shadowLen * 0.6, sy1 + ny2 * shadowLen);
      ctx.lineTo(sx1 + nx2 * shadowLen * 0.6, sy1 + ny2 * shadowLen);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  getNightAmbient(mapId, timeOfDay) {
    const night = timeOfDay < 0.25 || timeOfDay > 0.75;
    const dusk = timeOfDay > 0.65 && timeOfDay <= 0.75;
    const dawn = timeOfDay >= 0.25 && timeOfDay < 0.35;
    const darkness = night ? 0.6 : (dusk || dawn) ? 0.25 : 0.0;
    const ambients = {
      city:       `rgba(20,20,60,${darkness * 0.7})`,
      neon:       `rgba(5,0,20,${darkness * 0.9})`,
      desert:     `rgba(0,0,20,${darkness})`,
      mars:       'rgba(40,10,0,0.3)',
      underwater: 'rgba(0,20,80,0.5)',
      space:      'rgba(0,0,5,0.8)',
      arctic:     `rgba(0,10,30,${darkness * 0.8})`,
      volcano:    'rgba(30,5,0,0.4)',
      jungle:     `rgba(0,15,5,${darkness * 0.9})`
    };
    return ambients[mapId] || `rgba(0,0,0,${darkness * 0.5})`;
  },

  // ═══════════════════════════════════════════════════════════════
  // POST-PROCESSING EFFECTS
  // ═══════════════════════════════════════════════════════════════

  applyMotionBlur(ctx, W, H, speed, angle) {
    const blurStrength = Math.min(speed / 200, 0.8);
    const samples = Math.max(1, Math.min(8, Math.floor(speed / 30)));
    if (blurStrength < 0.05 || samples < 1) return;
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(ctx.canvas, 0, 0);
    const offsetX = Math.cos(angle) * blurStrength * 12;
    const offsetY = Math.sin(angle) * blurStrength * 6;
    for (let s = 1; s <= samples; s++) {
      const alpha = (1 - s / (samples + 1)) * blurStrength * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(offscreen, offsetX * s / samples, offsetY * s / samples);
      ctx.restore();
    }
  },

  applyBloom(ctx, W, H, threshold, strength) {
    const t2 = threshold || 180;
    const str = Math.min(1, strength || 0.4);
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(ctx.canvas, 0, 0);
    const imageData = offCtx.getImageData(0, 0, W, H);
    const d = imageData.data;
    // Threshold pass
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum < t2) {
        d[i] = d[i + 1] = d[i + 2] = 0;
      }
    }
    offCtx.putImageData(imageData, 0, 0);
    // Composite bloom back with screen blending
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = str;
    for (let pass = 0; pass < 3; pass++) {
      const scale = 1 + pass * 0.015;
      const ox = W * (1 - scale) / 2;
      const oy = H * (1 - scale) / 2;
      ctx.drawImage(offscreen, ox, oy, W * scale, H * scale);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  applyChromaticAberration(ctx, W, H, intensity) {
    const px = Math.min(10, Math.max(1, Math.round(intensity)));
    const imageData = ctx.getImageData(0, 0, W, H);
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        // Red channel shifted right
        const rx = Math.min(W - 1, x + px);
        const ri = (y * W + rx) * 4;
        dst[i] = src[ri];
        // Green unchanged
        dst[i + 1] = src[i + 1];
        // Blue channel shifted left
        const bx = Math.max(0, x - px);
        const bi = (y * W + bx) * 4;
        dst[i + 2] = src[bi + 2];
        dst[i + 3] = src[i + 3];
      }
    }
    ctx.putImageData(imageData, 0, 0);
  },

  applyFilmGrain(ctx, W, H, intensity, t) {
    if (intensity <= 0) return;
    const grainAlpha = intensity * 0.15;
    const seed = Math.floor(t * 24);
    let s = seed;
    const lcg = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    ctx.save();
    ctx.globalAlpha = grainAlpha;
    const blockSize = 4;
    for (let y = 0; y < H; y += blockSize) {
      for (let x = 0; x < W; x += blockSize) {
        const v = Math.floor(lcg() * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  applyColorGrade(ctx, W, H, preset) {
    const imageData = ctx.getImageData(0, 0, W, H);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      switch (preset) {
        case 'warm':
          r = Math.min(255, r * 1.1 + 15);
          g = Math.min(255, g * 1.02);
          b = Math.max(0, b * 0.88);
          break;
        case 'cool':
          r = Math.max(0, r * 0.88);
          g = Math.min(255, g * 1.02);
          b = Math.min(255, b * 1.12 + 10);
          break;
        case 'vintage':
          r = Math.min(255, r * 0.95 + 20);
          g = Math.min(255, g * 0.92 + 15);
          b = Math.max(0, b * 0.75 + 10);
          break;
        case 'horror':
          r = Math.min(255, r * 1.3);
          g = Math.max(0, g * 0.7);
          b = Math.max(0, b * 0.7);
          break;
        case 'matrix':
          r = Math.max(0, r * 0.6);
          g = Math.min(255, g * 1.4);
          b = Math.max(0, b * 0.6);
          break;
        case 'night':
          r = Math.max(0, r * 0.7);
          g = Math.max(0, g * 0.75);
          b = Math.min(255, b * 0.9 + 20);
          break;
        case 'sunset':
          r = Math.min(255, r * 1.15 + 20);
          g = Math.min(255, g * 0.95 + 10);
          b = Math.max(0, b * 0.7);
          break;
      }
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    ctx.putImageData(imageData, 0, 0);
  },

  applyRadialBlur(ctx, W, H, cx, cy, amount) {
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(ctx.canvas, 0, 0);
    const samples = 8;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.globalCompositeOperation = 'source-over';
    for (let s = 1; s <= samples; s++) {
      const scale = 1 + (amount * s) / (samples * 100);
      const ox = cx - cx * scale;
      const oy = cy - cy * scale;
      ctx.drawImage(offscreen, ox, oy, W * scale, H * scale);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  applyScanlines(ctx, W, H, opacity) {
    if (!opacity || opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  applyPixelate(ctx, W, H, scale) {
    scale = Math.max(2, Math.min(16, Math.round(scale)));
    const smallW = Math.ceil(W / scale);
    const smallH = Math.ceil(H / scale);
    const offscreen = document.createElement('canvas');
    offscreen.width = smallW;
    offscreen.height = smallH;
    const offCtx = offscreen.getContext('2d');
    offCtx.imageSmoothingEnabled = false;
    offCtx.drawImage(ctx.canvas, 0, 0, smallW, smallH);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, W, H);
    ctx.imageSmoothingEnabled = true;
  },

  // ═══════════════════════════════════════════════════════════════
  // VEHICLE RENDER SYSTEM
  // ═══════════════════════════════════════════════════════════════

  renderVehicleComplete(ctx, vehicle, def, parts, t) {
    if (!vehicle || !def) return;
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle || 0);
    const W2 = def.width || 60;
    const H2 = def.height || 28;
    // Body shadow/glow
    const glowCfg = this.VEHICLE_GLOW_CONFIGS[def.type] || this.VEHICLE_GLOW_CONFIGS.standard;
    if (glowCfg) {
      ctx.shadowColor = glowCfg.color;
      ctx.shadowBlur = glowCfg.radius * glowCfg.intensity;
    }
    // Main body
    const bodyGrad = GradyanDeposu.lin(ctx, -W2 / 2, -H2, W2 / 2, 0, [0, def.colorLight || '#dddddd', 0.4, def.color || '#aaaaaa', 1, def.colorDark || '#666666']);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    if (def.shape === 'trapezoid') {
      ctx.moveTo(-W2 / 2, 0);
      ctx.lineTo(-W2 * 0.4, -H2);
      ctx.lineTo(W2 * 0.45, -H2);
      ctx.lineTo(W2 / 2, 0);
    } else {
      ctx.roundRect(-W2 / 2, -H2, W2, H2, 5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Windows
    ctx.fillStyle = 'rgba(150,210,240,0.55)';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-W2 * 0.18, -H2 + 2, W2 * 0.36, H2 * 0.45, 3);
    ctx.fill();
    ctx.stroke();
    // Window reflection sheen
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(-W2 * 0.16, -H2 + 4);
    ctx.lineTo(W2 * 0.02, -H2 + 4);
    ctx.lineTo(-W2 * 0.06, -H2 * 0.6 + 2);
    ctx.lineTo(-W2 * 0.16, -H2 * 0.6 + 2);
    ctx.closePath();
    ctx.fill();
    // Spoiler
    if (parts && parts.includes('spoiler')) {
      ctx.fillStyle = '#333';
      ctx.fillRect(-W2 / 2 - 2, -H2 - 6, W2 + 4, 4);
      ctx.fillRect(-W2 / 2 + 4, -H2 - 6, 5, 8);
      ctx.fillRect(W2 / 2 - 9, -H2 - 6, 5, 8);
    }
    // Armor plating
    if (parts && parts.includes('armor')) {
      ctx.fillStyle = 'rgba(80,80,90,0.7)';
      ctx.fillRect(-W2 / 2, -H2 * 0.6, W2, H2 * 0.2);
      ctx.fillStyle = 'rgba(90,90,100,0.5)';
      for (let p = 0; p < 4; p++) {
        ctx.fillRect(-W2 / 2 + p * W2 / 4, -H2 * 0.6, W2 / 4 - 1, H2 * 0.2);
      }
    }
    // Nitro tanks
    if (parts && parts.includes('nitro')) {
      ctx.fillStyle = '#0055bb';
      ctx.beginPath();
      ctx.ellipse(-W2 / 2 + 5, -H2 * 0.3, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W2 / 2 - 5, -H2 * 0.3, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wheels
    const wheelPositions = [
      { x: -W2 * 0.32, y: 0 },
      { x: W2 * 0.32, y: 0 }
    ];
    for (const wp of wheelPositions) {
      // Tire
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y + 2, 12, 0, Math.PI * 2);
      ctx.fill();
      // Tread
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y + 2, 12, 0, Math.PI * 2);
      ctx.stroke();
      // Hub
      const hubGrad = GradyanDeposu.rad(ctx, wp.x, wp.y + 2, 0, wp.x, wp.y + 2, 7, [0, '#ddd', 1, '#888']);
      ctx.fillStyle = hubGrad;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y + 2, 7, 0, Math.PI * 2);
      ctx.fill();
      // Spokes
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1.5;
      for (let sp = 0; sp < 5; sp++) {
        const spAng = (sp / 5) * Math.PI * 2 + t * 3;
        ctx.beginPath();
        ctx.moveTo(wp.x, wp.y + 2);
        ctx.lineTo(wp.x + Math.cos(spAng) * 6, wp.y + 2 + Math.sin(spAng) * 6);
        ctx.stroke();
      }
    }
    // Exhaust pipe
    ctx.fillStyle = '#555';
    ctx.fillRect(-W2 / 2 - 8, -H2 * 0.2, 8, 4);
    ctx.restore();
  },

  renderVehicleShadow(ctx, vehicle, def, groundY) {
    if (!vehicle || !def) return;
    ctx.save();
    const baseW = (def.width || 60) * 1.5;
    const baseH = (def.height || 28) * 0.3;
    const heightAboveGround = Math.max(0, groundY - vehicle.y);
    // Araç yükseldikçe gölge büyür, yumuşar ve soluklaşır (yumuşak dinamik gölge)
    const lift = Math.min(1, heightAboveGround / 220);
    const spread = 1 + lift * 0.55;           // yükseklikte yayılım
    const W2 = baseW * spread;
    const H2 = baseH * spread;
    const coreAlpha = Math.max(0.04, 0.34 * (1 - lift * 0.85));
    const softAlpha = Math.max(0.03, 0.18 * (1 - lift * 0.7));
    const rot = (vehicle.angle || 0) * 0.3;

    // 1) Geniş yumuşak penumbra (dış hale)
    const softGrad = GradyanDeposu.rad(ctx, vehicle.x, groundY, 0, vehicle.x, groundY, W2 * 0.75, [0, `rgba(0,0,0,${softAlpha})`, 0.55, `rgba(0,0,0,${softAlpha * 0.5})`, 1, 'rgba(0,0,0,0)']);
    ctx.save();
    ctx.translate(vehicle.x, groundY);
    ctx.rotate(rot);
    ctx.scale(1, (H2 * 1.15) / (W2 * 0.75));
    ctx.fillStyle = softGrad;
    ctx.beginPath();
    ctx.arc(0, 0, W2 * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2) Daha koyu, dar çekirdek (aracın hemen altı — temas gölgesi)
    const coreR = W2 / 2 * (1 - lift * 0.25);
    const coreGrad = GradyanDeposu.rad(ctx, vehicle.x, groundY, 0, vehicle.x, groundY, coreR, [0, `rgba(0,0,0,${coreAlpha})`, 0.6, `rgba(0,0,0,${coreAlpha * 0.65})`, 1, 'rgba(0,0,0,0)']);
    ctx.save();
    ctx.translate(vehicle.x, groundY);
    ctx.rotate(rot);
    ctx.scale(1, H2 / coreR);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  },

  renderVehicleLights(ctx, vehicle, def, t) {
    if (!vehicle || !def) return;
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle || 0);
    const W2 = def.width || 60;
    const H2 = def.height || 28;
    const flicker = 0.92 + Math.sin(t * 30) * 0.04 + Math.random() * 0.04;
    // Headlights (front)
    const headPositions = [{ x: W2 / 2, y: -H2 * 0.5 }];
    for (const hp of headPositions) {
      // Volumetric cone — soft-edged with a warm gradient falloff
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const coneGrad = GradyanDeposu.lin(ctx, hp.x, hp.y, hp.x + 140, hp.y, [0, `rgba(255,250,205,${0.55 * flicker})`, 0.5, `rgba(255,240,175,${0.22 * flicker})`, 1, 'rgba(255,235,160,0)']);
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y - 3);
      ctx.lineTo(hp.x + 145, hp.y - 34);
      ctx.quadraticCurveTo(hp.x + 155, hp.y, hp.x + 145, hp.y + 34);
      ctx.lineTo(hp.x, hp.y + 3);
      ctx.closePath();
      ctx.fill();
      // Bright inner beam core
      const beamGrad = GradyanDeposu.lin(ctx, hp.x, hp.y, hp.x + 100, hp.y, [0, `rgba(255,255,235,${0.5 * flicker})`, 1, 'rgba(255,250,210,0)']);
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y - 2);
      ctx.lineTo(hp.x + 105, hp.y - 12);
      ctx.lineTo(hp.x + 105, hp.y + 12);
      ctx.lineTo(hp.x, hp.y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Headlight lens with bloom halo
      const lensGlow = GradyanDeposu.rad(ctx, hp.x, hp.y, 0, hp.x, hp.y, 12, [0, `rgba(255,252,230,${0.8 * flicker})`, 1, 'rgba(255,250,210,0)']);
      ctx.fillStyle = lensGlow;
      ctx.beginPath(); ctx.arc(hp.x, hp.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffbe0';
      ctx.shadowColor = '#fffbe0';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Tail lights (rear) — glowing ember with soft halo
    const tailPositions = [{ x: -W2 / 2, y: -H2 * 0.5 }];
    for (const tp of tailPositions) {
      const tailPulse = 0.7 + Math.sin(t * 2) * 0.1;
      const tailGlow = GradyanDeposu.rad(ctx, tp.x, tp.y, 0, tp.x, tp.y, 14, [0, `rgba(255,40,10,${tailPulse})`, 0.5, `rgba(255,20,0,${tailPulse * 0.35})`, 1, 'rgba(255,0,0,0)']);
      ctx.fillStyle = tailGlow;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,60,20,0.95)';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Brake lights — intense red bloom when braking
    if (vehicle.braking) {
      const bx = -W2 / 2, by = -H2 * 0.5;
      const brakeGlow = GradyanDeposu.rad(ctx, bx, by, 0, bx, by, 24, [0, 'rgba(255,40,0,0.85)', 0.5, 'rgba(255,0,0,0.35)', 1, 'rgba(255,0,0,0)']);
      ctx.fillStyle = brakeGlow;
      ctx.beginPath(); ctx.arc(bx, by, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,0,0,0.98)';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Turn signals
    if (vehicle.turnSignal) {
      const blinking = Math.sin(t * 6) > 0;
      if (blinking) {
        ctx.fillStyle = 'rgba(255,160,0,0.9)';
        ctx.shadowColor = '#ffa000';
        ctx.shadowBlur = 8;
        const tsX = vehicle.turnSignal === 'right' ? W2 / 2 : -W2 / 2;
        ctx.beginPath();
        ctx.arc(tsX, -H2 * 0.25, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    // Underbody glow
    if (def.underbodyGlow) {
      const uGrad = GradyanDeposu.lin(ctx, -W2 / 2, 0, W2 / 2, 0, [0, 'rgba(0,200,255,0)', 0.5, `rgba(0,200,255,${0.15 + Math.sin(t * 2) * 0.05})`, 1, 'rgba(0,200,255,0)']);
      ctx.fillStyle = uGrad;
      ctx.fillRect(-W2 / 2, 0, W2, 8);
    }
    ctx.restore();
  },

  renderVehicleDamage(ctx, vehicle, damageState) {
    if (!vehicle || !damageState) return;
    const level = damageState.level || 0;
    if (level <= 0) return;
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle || 0);
    const W2 = (vehicle.def && vehicle.def.width) || 60;
    const H2 = (vehicle.def && vehicle.def.height) || 28;
    // Scratches
    if (level > 0.1) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      for (let sc = 0; sc < Math.floor(level * 10); sc++) {
        const sx = (sc * 13 - W2 / 2) % W2 - W2 / 4;
        const sy = -H2 + (sc * 7) % H2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 8, sy + 5);
        ctx.stroke();
      }
    }
    // Dents (darker patches)
    if (level > 0.35) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let d = 0; d < 3; d++) {
        const dx = -W2 / 3 + d * W2 / 3;
        const dy = -H2 * 0.5 + d * 4;
        ctx.beginPath();
        ctx.ellipse(dx, dy, 8 + d * 2, 5 + d, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Engine smoke
    if (level > 0.6) {
      for (let s = 0; s < 4; s++) {
        const smokeAge = (Date.now() / 1000 * 0.5 + s * 0.25) % 1;
        const smokeAlpha = Math.max(0, 0.5 - smokeAge * 0.5);
        const smokeR = 6 + smokeAge * 12;
        const smokeY = -H2 - smokeAge * 20 - s * 4;
        ctx.fillStyle = `rgba(60,55,50,${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(0, smokeY, smokeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Sparks
    if (level > 0.8) {
      ctx.fillStyle = '#ffaa00';
      for (let sp = 0; sp < 5; sp++) {
        const sx = -W2 / 2 + (sp * 17) % W2;
        const sy = -H2 * 0.4 + Math.sin(Date.now() / 100 + sp) * 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  renderVehicleTrails(ctx, vehicle, trailHistory) {
    if (!trailHistory || trailHistory.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Resolve base trail color once
    let cr = 150, cg = 150, cb = 150;
    const col = vehicle.trailColor || '#888888';
    if (typeof col === 'string' && col.startsWith('#') && col.length >= 7) {
      cr = parseInt(col.slice(1, 3), 16);
      cg = parseInt(col.slice(3, 5), 16);
      cb = parseInt(col.slice(5, 7), 16);
    }
    const n = trailHistory.length;
    // Pass 1: soft additive glow underlay
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < n; i++) {
      const p0 = trailHistory[i - 1];
      const p1 = trailHistory[i];
      const ageFactor = i / n;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ageFactor * 0.18})`;
      ctx.lineWidth = ageFactor * 11 + 2;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    // Pass 2: crisp core with age-based fade & taper
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 1; i < n; i++) {
      const p0 = trailHistory[i - 1];
      const p1 = trailHistory[i];
      const ageFactor = i / n;
      const alpha = ageFactor * 0.5;
      // brighten toward the newest segments
      const br = Math.min(255, cr + (i > n - 4 ? 60 : 0));
      const bg = Math.min(255, cg + (i > n - 4 ? 60 : 0));
      const bb = Math.min(255, cb + (i > n - 4 ? 60 : 0));
      ctx.strokeStyle = `rgba(${br},${bg},${bb},${alpha})`;
      ctx.lineWidth = ageFactor * 6;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
    ctx.restore();
  },

  renderNitroEffect(ctx, vehicle, parts, t) {
    if (!parts || !parts.includes('nitro')) return;
    if (!vehicle) return;
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle || 0);
    const W2 = (vehicle.def && vehicle.def.width) || 60;
    const H2 = (vehicle.def && vehicle.def.height) || 28;
    const oy = -H2 * 0.4;
    const ex = -W2 / 2; // exhaust origin
    // Rapid flicker for that jittery jet-flame feel
    const flick = 0.85 + Math.sin(t * 40) * 0.1 + Math.random() * 0.12;
    ctx.globalCompositeOperation = 'lighter';
    // Main flame — layered ellipses, hot white core -> blue -> orange tips
    const flameLen = 30 + Math.sin(t * 8) * 8 + Math.sin(t * 23) * 4;
    const flameColors = [
      { color: `rgba(255,120,0,${0.45 * flick})`,   r: 18, sq: 0.55 },
      { color: `rgba(0,120,255,${0.55 * flick})`,   r: 12, sq: 0.5  },
      { color: `rgba(140,215,255,${0.75 * flick})`, r: 8,  sq: 0.5  },
      { color: `rgba(255,255,255,${0.95 * flick})`, r: 4,  sq: 0.6  }
    ];
    for (const fc of flameColors) {
      const cx = ex - flameLen * 0.4 - fc.r * 0.4;
      const flameGrad = GradyanDeposu.rad(ctx, ex - flameLen * 0.2, oy, 0, cx, oy, fc.r + 8, [0, fc.color, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(cx, oy, fc.r + 8, fc.r * fc.sq, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Diamond shock-cone at the nozzle (classic afterburner look)
    ctx.fillStyle = `rgba(255,255,255,${0.5 * flick})`;
    ctx.beginPath();
    ctx.moveTo(ex - 2, oy);
    ctx.lineTo(ex - flameLen * 0.55, oy - 3);
    ctx.lineTo(ex - flameLen * 0.9, oy);
    ctx.lineTo(ex - flameLen * 0.55, oy + 3);
    ctx.closePath();
    ctx.fill();
    // Outer glow halo — breathing blue heat wash
    const haloR = 38 + Math.sin(t * 6) * 4;
    const haloGrad = GradyanDeposu.rad(ctx, ex, oy, 0, ex, oy, haloR, [0, `rgba(60,170,255,${0.28 * flick})`, 0.6, 'rgba(0,120,255,0.08)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(ex, oy, haloR, 0, Math.PI * 2);
    ctx.fill();
    // Backward sparks — glowing, size-varied embers
    for (let sp = 0; sp < 9; sp++) {
      const life = (t * 3 + sp * 0.7) % 1;
      const spX = ex - 8 - (life * 46 + Math.sin(t * 5 + sp) * 6);
      const spY = oy + Math.sin(t * 4 + sp * 1.5) * (6 + life * 6);
      const spR = (1 - life) * 2.2 + 0.6;
      const sa = (1 - life) * 0.9;
      const spGrad = GradyanDeposu.rad(ctx, spX, spY, 0, spX, spY, spR * 2.5, [0, `rgba(255,235,150,${sa})`, 1, 'rgba(255,120,0,0)']);
      ctx.fillStyle = spGrad;
      ctx.beginPath();
      ctx.arc(spX, spY, spR * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  VEHICLE_GLOW_CONFIGS: {
    standard: { color: '#ffaa00', radius: 30, intensity: 0.3 },
    sports:   { color: '#ff6600', radius: 40, intensity: 0.5 },
    muscle:   { color: '#ff0000', radius: 50, intensity: 0.6 },
    electric: { color: '#00ffff', radius: 60, intensity: 0.7 },
    monster:  { color: '#ff4400', radius: 80, intensity: 0.4 },
    buggy:    { color: '#ffcc00', radius: 35, intensity: 0.35 },
    truck:    { color: '#ff8800', radius: 55, intensity: 0.45 }
  },

  // ═══════════════════════════════════════════════════════════════
  // MAP-SPECIFIC RENDER SYSTEM
  // ═══════════════════════════════════════════════════════════════

  renderMapLayer(ctx, mapId, layer, camX, W, H, t) {
    if (layer === 'background') {
      if (mapId === 'volcano')    this._renderVolcanoLava(ctx, W, H, t);
      if (mapId === 'underwater') this._renderUnderwaterCaustics(ctx, W, H, t);
      if (mapId === 'space')      this._renderSpaceStars(ctx, W, H, t, camX * 0.1);
      if (mapId === 'neon')       this._renderNeonGlow(ctx, W, H, t);
      if (mapId === 'arctic' || mapId === 'winter') this._renderArcticAurora(ctx, W, H, t);
      if (mapId === 'desert')     this._renderDesertHeat(ctx, W, H, t);
    } else if (layer === 'overlay') {
      const cfg = (this.MAP_RENDER_CONFIGS || {})[mapId];
      const rain = cfg ? cfg.rainIntensity : 0;
      if (rain > 0) this._renderRainOverlay(ctx, W, H, t, rain);
    }
  },

  MAP_RENDER_CONFIGS: {
    countryside: { bgColor:'#87ceeb', fogColor:'rgba(255,255,255,0.15)', fogDensity:0.05, ambientLight:1.0,  rainIntensity:0,    specialEffect:null        },
    desert:      { bgColor:'#f5c040', fogColor:'rgba(255,200,100,0.2)',  fogDensity:0.08, ambientLight:1.1,  rainIntensity:0,    specialEffect:'heat'      },
    winter:      { bgColor:'#b0d0ff', fogColor:'rgba(200,220,255,0.3)',  fogDensity:0.12, ambientLight:0.9,  rainIntensity:0.05, specialEffect:'snow'      },
    beach:       { bgColor:'#60b0ff', fogColor:'rgba(255,255,255,0.1)',  fogDensity:0.04, ambientLight:1.05, rainIntensity:0,    specialEffect:null        },
    city:        { bgColor:'#607080', fogColor:'rgba(100,120,150,0.15)', fogDensity:0.06, ambientLight:0.95, rainIntensity:0.2,  specialEffect:'rain'      },
    jungle:      { bgColor:'#3a8a3a', fogColor:'rgba(50,100,50,0.25)',   fogDensity:0.15, ambientLight:0.75, rainIntensity:0.3,  specialEffect:'mist'      },
    mars:        { bgColor:'#c04010', fogColor:'rgba(200,100,50,0.18)',  fogDensity:0.09, ambientLight:0.85, rainIntensity:0,    specialEffect:'dust'      },
    moon:        { bgColor:'#000005', fogColor:'rgba(0,0,0,0)',          fogDensity:0,    ambientLight:0.5,  rainIntensity:0,    specialEffect:null        },
    neon:        { bgColor:'#030010', fogColor:'rgba(0,0,20,0.1)',       fogDensity:0.03, ambientLight:0.6,  rainIntensity:0.4,  specialEffect:'neon'      },
    volcano:     { bgColor:'#4a1a00', fogColor:'rgba(200,50,0,0.2)',     fogDensity:0.10, ambientLight:0.7,  rainIntensity:0,    specialEffect:'lava'      },
    underwater:  { bgColor:'#002244', fogColor:'rgba(0,50,150,0.3)',     fogDensity:0.20, ambientLight:0.6,  rainIntensity:0,    specialEffect:'caustics'  },
    wasteland:   { bgColor:'#8a7040', fogColor:'rgba(150,130,80,0.15)',  fogDensity:0.07, ambientLight:0.9,  rainIntensity:0.05, specialEffect:null        },
    canyon:      { bgColor:'#c07030', fogColor:'rgba(200,120,60,0.12)',  fogDensity:0.06, ambientLight:0.95, rainIntensity:0,    specialEffect:null        }
  },

  _renderVolcanoLava(ctx, W, H, t) {
    ctx.save();
    // Alttan gelen sıcak turuncu ambient parıltı (lav havuzunun aydınlattığı hava)
    const glowPulse = 0.10 + Math.sin(t * 1.3) * 0.03;
    const ambGlow = GradyanDeposu.lin(ctx, 0, H * 0.45, 0, H, [0, 'rgba(255,80,0,0)', 1, `rgba(255,90,0,${glowPulse})`]);
    ctx.fillStyle = ambGlow;
    ctx.fillRect(0, H * 0.45, W, H * 0.55);
    // Lava pool at bottom
    const lavaGrad = GradyanDeposu.lin(ctx, 0, H * 0.82, 0, H, [0, 'rgba(180,40,0,0)', 0.3, 'rgba(220,60,0,0.6)', 0.8, 'rgba(255,120,0,0.8)', 1, 'rgba(255,200,0,0.9)']);
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    // Lava veins (animated)
    ctx.strokeStyle = 'rgba(255,220,80,0.6)';
    ctx.lineWidth = 3;
    for (let v = 0; v < 8; v++) {
      const vx = (v * W / 7 + Math.sin(t * 0.4 + v) * 20) % W;
      ctx.beginPath();
      ctx.moveTo(vx, H);
      for (let seg = 1; seg <= 5; seg++) {
        const sy = H - seg * H * 0.03;
        ctx.lineTo(vx + Math.sin(t * 1.5 + v + seg * 0.7) * (8 + seg * 3), sy);
      }
      ctx.stroke();
    }
    // Heat distortion waves at surface
    ctx.strokeStyle = 'rgba(255,100,0,0.2)';
    ctx.lineWidth = 2;
    for (let w2 = 0; w2 < 5; w2++) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y2 = H * 0.82 + w2 * 4 + Math.sin(t * 3 + x / 40 + w2) * 3;
        x === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }
    // Lava bubbles
    for (let b = 0; b < 6; b++) {
      const burstPhase = (t * 0.8 + b * 0.7) % 1;
      const bx2 = (b * 137 + 50) % W;
      const by2 = H - 10 - burstPhase * 30;
      const br = burstPhase < 0.5 ? burstPhase * 12 : (1 - burstPhase) * 12;
      const alpha = burstPhase < 0.7 ? 0.7 : (1 - burstPhase) / 0.3 * 0.7;
      ctx.fillStyle = `rgba(255,160,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(bx2, by2, br + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Floating ember particles
    ctx.fillStyle = 'rgba(255,100,0,0.7)';
    for (let e = 0; e < 12; e++) {
      const ex = (e * 83 + t * 15 * (e % 2 === 0 ? 1 : -1)) % W;
      const ey = H * 0.85 - ((t * 25 + e * 37) % (H * 0.4));
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _renderUnderwaterCaustics(ctx, W, H, t) {
    ctx.save();
    // Derinlik gradyanı — yüzeye yakın açık, dibe koyu (dalış hissi)
    const depthGrad = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(40,120,180,0.10)', 1, 'rgba(0,20,60,0.28)']);
    ctx.fillStyle = depthGrad;
    ctx.fillRect(0, 0, W, H);
    // God-ray ışık şaftları (yüzeyden aşağı süzülen güneş)
    ctx.globalCompositeOperation = 'screen';
    for (let g = 0; g < 5; g++) {
      const gx = (g * W / 4) + Math.sin(t * 0.25 + g * 1.4) * 40;
      const gw = 26 + g * 8;
      const rayGrad = ctx.createLinearGradient(gx, 0, gx + gw * 0.6, H * 0.9);
      const gi = 0.05 + Math.sin(t * 0.5 + g) * 0.03;
      rayGrad.addColorStop(0, `rgba(140,220,255,${Math.max(0, gi)})`);
      rayGrad.addColorStop(1, 'rgba(140,220,255,0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + gw, 0);
      ctx.lineTo(gx + gw * 0.6 + 60, H * 0.9);
      ctx.lineTo(gx + gw * 0.6 - 20, H * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    // Yükselen kabarcıklar (parallax derinlik)
    ctx.fillStyle = 'rgba(200,240,255,0.35)';
    for (let b = 0; b < 14; b++) {
      const bx = (b * 97 + Math.sin(t * 0.6 + b) * 12) % W;
      const by = H - ((t * (18 + b % 5 * 6) + b * 71) % (H * 1.05));
      const br = 1 + (b % 4);
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    // Layer 1 — slow large caustics
    ctx.strokeStyle = 'rgba(80,180,255,0.12)';
    ctx.lineWidth = 2;
    for (let c = 0; c < 12; c++) {
      const cx = (c * W / 11 + Math.sin(t * 0.4 + c * 0.9) * 35) % W;
      const cy = H * 0.1 + Math.cos(t * 0.3 + c * 1.1) * H * 0.3 + c * H * 0.06;
      const cr = 22 + Math.sin(t + c) * 8;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Layer 2 — fast small caustics
    ctx.strokeStyle = 'rgba(120,220,255,0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 20; c++) {
      const cx = (c * W / 19 + Math.sin(t * 0.9 + c * 1.3) * 20) % W;
      const cy = H * 0.05 + Math.cos(t * 0.7 + c * 0.8) * H * 0.35 + c * H * 0.045;
      const cr = 10 + Math.sin(t * 2 + c) * 4;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Water surface
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(150,220,255,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) {
      const y2 = 12 + Math.sin(t * 1.2 + x / 60) * 5 + Math.cos(t * 0.8 + x / 40) * 3;
      x === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
    }
    ctx.stroke();
    // Surface sparkles
    for (let sp = 0; sp < 8; sp++) {
      const sx = (sp * 113 + t * 20) % W;
      const sy = 10 + Math.sin(t * 1.5 + sp) * 4;
      const alpha = 0.4 + Math.sin(t * 3 + sp * 1.7) * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _renderSpaceStars(ctx, W, H, t, parallaxOffset) {
    ctx.save();
    const px = parallaxOffset || 0;
    // Uzak nebula bulutları (renkli derinlik dokusu, çok yavaş parallax)
    ctx.globalCompositeOperation = 'screen';
    const nebulae = [
      { x: 0.2, y: 0.3, r: 180, col: [120, 40, 180] },
      { x: 0.7, y: 0.2, r: 220, col: [30, 80, 160] },
      { x: 0.5, y: 0.6, r: 160, col: [160, 40, 90] }
    ];
    for (const nb of nebulae) {
      const nx = ((nb.x * W - px * 0.04) % W + W) % W;
      const ny = nb.y * H;
      const pulse = 0.06 + Math.sin(t * 0.3 + nb.x * 10) * 0.02;
      const ng = GradyanDeposu.rad(ctx, nx, ny, 0, nx, ny, nb.r, [0, `rgba(${nb.col[0]},${nb.col[1]},${nb.col[2]},${pulse})`, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.arc(nx, ny, nb.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Layer 1 — tiny distant stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let s = 0; s < 150; s++) {
      const sx = ((s * 137.5 + px * 0.1) % W + W) % W;
      const sy = (s * 97.3) % H;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Layer 2 — medium stars with twinkle
    for (let s = 0; s < 60; s++) {
      const sx = ((s * 233.1 + px * 0.25) % W + W) % W;
      const sy = (s * 151.7) % H;
      const tw = 0.5 + Math.sin(t * 1.8 + s * 0.6) * 0.5;
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Layer 3 — large stars with glow
    for (let s = 0; s < 20; s++) {
      const sx = ((s * 389.3 + px * 0.5) % W + W) % W;
      const sy = (s * 271.1) % H;
      const tw = 0.6 + Math.sin(t * 2.5 + s * 1.2) * 0.4;
      // Glow
      const starGlow = GradyanDeposu.rad(ctx, sx, sy, 0, sx, sy, 6, [0, `rgba(200,220,255,${tw * 0.5})`, 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = starGlow;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Shooting star (rare)
    const shootPhase = (t * 0.08) % 1;
    if (shootPhase < 0.04) {
      const progress = shootPhase / 0.04;
      const sx = progress * W * 1.3 - 50;
      const sy = (1 - progress) * H * 0.3 + 20;
      ctx.strokeStyle = `rgba(255,255,255,${1 - progress})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 40 * progress, sy + 15 * progress);
      ctx.stroke();
    }
    ctx.restore();
  },

  _renderNeonGlow(ctx, W, H, t) {
    ctx.save();
    // Overall purple ambient
    const ambGrad = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(20,0,40,0.7)', 0.55, 'rgba(10,0,30,0.5)', 1, 'rgba(0,0,20,0.3)']);
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, W, H);
    // Islak zemin yansıma parıltısı (mor-camgöbeği renkli sheen)
    const wetGrad = GradyanDeposu.lin(ctx, 0, H * 0.82, 0, H, [0, 'rgba(120,0,180,0)', 0.5, `rgba(140,0,200,${0.06 + Math.sin(t * 1.2) * 0.02})`, 1, 'rgba(0,120,180,0.12)']);
    ctx.fillStyle = wetGrad;
    ctx.fillRect(0, H * 0.82, W, H * 0.18);
    // Yüzen renkli ışık zerreleri (atmosfer)
    ctx.globalCompositeOperation = 'screen';
    const moteCols = ['rgba(255,0,255,0.5)','rgba(0,255,255,0.5)','rgba(255,120,0,0.45)'];
    for (let m = 0; m < 14; m++) {
      const mx = (m * 113 + t * 12 * (m % 2 ? 1 : -1)) % W;
      const my = H * 0.85 - ((t * 10 + m * 53) % (H * 0.7));
      ctx.fillStyle = moteCols[m % moteCols.length];
      ctx.beginPath();
      ctx.arc((mx + W) % W, my, 1.3 + (m % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Neon sign blobs
    const neonPalette = ['#ff00ff','#00ffff','#ff0088','#00ff88','#ff8800'];
    for (let n = 0; n < 8; n++) {
      const nx = (n * W / 7 + 20) % W;
      const ny = H * 0.2 + n * H * 0.07;
      const nc = neonPalette[n % neonPalette.length];
      const pulse = 0.3 + Math.sin(t * 2 + n * 1.3) * 0.15;
      ctx.shadowColor = nc;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = nc;
      ctx.lineWidth = 2;
      ctx.globalAlpha = pulse;
      ctx.strokeRect(nx - 20, ny - 8, 40, 16);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      // Reflection on wet ground
      ctx.strokeStyle = nc.replace('#', 'rgba(').replace(/(.{2})(.{2})(.{2})/, (m, r, g, b) =>
        `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},0.15)`
      );
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nx, H * 0.85);
      ctx.lineTo(nx, H);
      ctx.stroke();
    }
    // Electrical crackle lines
    ctx.strokeStyle = 'rgba(200,200,255,0.25)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 3; c++) {
      if (Math.sin(t * 8 + c * 2.1) > 0.5) {
        const cx2 = (c * W / 2 + t * 30) % W;
        ctx.beginPath();
        ctx.moveTo(cx2, 0);
        let cy2 = 0;
        while (cy2 < H) {
          cy2 += 20 + Math.random() * 20;
          ctx.lineTo(cx2 + (Math.random() - 0.5) * 20, cy2);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  _renderArcticAurora(ctx, W, H, t) {
    ctx.save();
    // Star field background
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let s = 0; s < 80; s++) {
      const sx = (s * 137.5) % W;
      const sy = (s * 97.3) % (H * 0.65);
      const tw = 0.3 + Math.sin(t * 2 + s) * 0.3;
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Aurora bands
    const auroraData = [
      { color: [0, 255, 120], y: H * 0.1, speed: 0.6, amp: 25, offset: 0 },
      { color: [0, 200, 255], y: H * 0.2, speed: 0.5, amp: 20, offset: 2 },
      { color: [180, 0, 255], y: H * 0.15, speed: 0.4, amp: 18, offset: 4 }
    ];
    ctx.globalCompositeOperation = 'screen';
    for (const band of auroraData) {
      // Dikey degrade ile perde etkisi (üst parlak → aşağı sönümlenen ışık perdesi)
      ctx.save();
      const curtain = ctx.createLinearGradient(0, band.y - band.amp, 0, band.y + 90);
      const [cr, cg, cb] = band.color;
      curtain.addColorStop(0, `rgba(${cr},${cg},${cb},0.22)`);
      curtain.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.12)`);
      curtain.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = curtain;
      ctx.beginPath();
      ctx.moveTo(0, band.y);
      for (let x = 0; x <= W; x += 20) {
        const y2 = band.y + Math.sin(t * band.speed + x / 80 + band.offset) * band.amp;
        ctx.lineTo(x, y2);
      }
      for (let x = W; x >= 0; x -= 20) {
        const y2 = band.y + 90 + Math.sin(t * band.speed * 0.8 + x / 60 + band.offset + 1) * band.amp * 0.6;
        ctx.lineTo(x, y2);
      }
      ctx.closePath();
      ctx.fill();
      // Işık ışını çizgileri (dikey akış hissi)
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.14)`;
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 10; r++) {
        const rx = (r / 10) * W + Math.sin(t * band.speed + r) * 12;
        const topY = band.y + Math.sin(t * band.speed + rx / 80 + band.offset) * band.amp;
        ctx.beginPath();
        ctx.moveTo(rx, topY);
        ctx.lineTo(rx, topY + 70 + Math.sin(t + r) * 12);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  _renderDesertHeat(ctx, W, H, t) {
    ctx.save();
    // Sun
    ctx.fillStyle = '#fff8d0';
    ctx.shadowColor = '#ffee80';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.1, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Sun halos
    for (let h2 = 1; h2 <= 3; h2++) {
      const alpha = 0.08 / h2;
      ctx.strokeStyle = `rgba(255,230,100,${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.1, 30 + h2 * 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Dust haze (gradient overlay)
    const hazeGrad = GradyanDeposu.lin(ctx, 0, H * 0.6, 0, H, [0, 'rgba(200,170,80,0)', 1, 'rgba(200,160,60,0.12)']);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
    // Ufuk serabı — titreşen parlak ısı bandı (mirage)
    ctx.globalCompositeOperation = 'screen';
    for (let m = 0; m < 3; m++) {
      const my = H * 0.66 + m * 6;
      const alpha = (0.10 - m * 0.025) + Math.sin(t * 2 + m) * 0.02;
      ctx.strokeStyle = `rgba(255,245,210,${Math.max(0, alpha)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const y2 = my + Math.sin(t * 2.5 + x / 45 + m * 1.2) * 3.5;
        x === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }
    // Sürüklenen ince kum tozu partikülleri
    ctx.fillStyle = 'rgba(220,190,120,0.20)';
    for (let d = 0; d < 16; d++) {
      const dx = (d * 79 + t * 40) % W;
      const dy = H * 0.72 + Math.sin(t * 0.8 + d) * 18 + (d % 4) * 8;
      ctx.beginPath();
      ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // Heat shimmer strips
    ctx.strokeStyle = 'rgba(255,240,180,0.12)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 10; s++) {
      const sy = H * 0.78 + s * 5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const y2 = sy + Math.sin(t * 3.5 + x / 35 + s * 0.8) * 2.5;
        x === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  _renderRainOverlay(ctx, W, H, t, intensity) {
    if (!intensity || intensity <= 0) return;
    ctx.save();
    const dropCount = Math.floor(50 + intensity * 350);
    ctx.strokeStyle = 'rgba(150,190,255,0.3)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (let d = 0; d < dropCount; d++) {
      const dx = ((d * 37 + t * 200) % (W + 30)) - 15;
      const dy = ((d * 53 + t * 400) % (H + 20)) - 10;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - 3, dy + 14);
      ctx.stroke();
    }
    // Splash particles at bottom
    ctx.fillStyle = 'rgba(180,210,255,0.25)';
    for (let sp = 0; sp < Math.floor(intensity * 20); sp++) {
      const sx = ((sp * 113 + t * 120) % W);
      const sPhase = (t * 5 + sp * 0.4) % 1;
      const sr = sPhase * 5;
      const alpha = (1 - sPhase) * 0.35;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, H - 5, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Fog overlay at bottom
    const fogGrad = GradyanDeposu.lin(ctx, 0, H * 0.75, 0, H, [0, 'rgba(200,220,240,0)', 1, `rgba(200,220,240,${intensity * 0.15})`]);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, H * 0.75, W, H * 0.25);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // PARTICLE-RENDERER INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  drawParticleLayer(ctx, particles, camX, W, H) {
    if (!particles || particles.length === 0) return;
    ctx.save();
    for (const p of particles) {
      const sx = p.x - (camX || 0);
      const sy = p.y;
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;
      const life = p.maxLife > 0 ? (p.life / p.maxLife) : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, life * (p.alpha !== undefined ? p.alpha : 1)));
      ctx.fillStyle = p.color || '#ffffff';
      ctx.strokeStyle = p.strokeColor || p.color || '#ffffff';
      ctx.save();
      ctx.translate(sx, sy);
      if (p.rotation) ctx.rotate(p.rotation);
      const sz = (p.size || 4) * (p.growWithAge ? (1 - life) + 0.2 : 1);
      switch (p.shape) {
        case 'square':
          ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
          break;
        case 'star': {
          ctx.beginPath();
          for (let i2 = 0; i2 < 5; i2++) {
            const ang1 = (i2 / 5) * Math.PI * 2 - Math.PI / 2;
            const ang2 = ((i2 + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
            if (i2 === 0) ctx.moveTo(Math.cos(ang1) * sz, Math.sin(ang1) * sz);
            else ctx.lineTo(Math.cos(ang1) * sz, Math.sin(ang1) * sz);
            ctx.lineTo(Math.cos(ang2) * sz * 0.4, Math.sin(ang2) * sz * 0.4);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'spark':
          ctx.strokeStyle = p.color || '#ffaa00';
          ctx.lineWidth = p.size * 0.3 || 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-(p.vx || 0) * 0.15, -(p.vy || 0) * 0.15);
          ctx.stroke();
          break;
        default: // circle
          ctx.beginPath();
          ctx.arc(0, 0, sz / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  drawEnvironmentParticles(ctx, mapId, W, H, t, dt) {
    ctx.save();
    switch (mapId) {
      case 'winter':
      case 'arctic': {
        // Snow
        ctx.fillStyle = 'rgba(220,235,255,0.8)';
        for (let s = 0; s < 80; s++) {
          const sx = ((s * 71 + t * 12 * (1 + (s % 3) * 0.2)) % W + W) % W;
          const sy = ((s * 53 + t * 45 * (0.8 + (s % 4) * 0.15)) % H + H) % H;
          ctx.globalAlpha = 0.5 + Math.sin(t * 2 + s) * 0.3;
          ctx.beginPath();
          ctx.arc(sx, sy, 1 + (s % 3) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'volcano': {
        // Embers
        for (let e = 0; e < 30; e++) {
          const ex = ((e * 83 + t * 18 * (e % 2 === 0 ? 1 : -0.6)) % W + W) % W;
          const ey = H - ((t * 35 + e * 41) % (H * 0.6));
          const alpha = 0.5 + Math.sin(t * 4 + e) * 0.3;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = e % 3 === 0 ? '#ffaa00' : '#ff4400';
          ctx.beginPath();
          ctx.arc(ex, ey, 1.5 + (e % 3), 0, Math.PI * 2);
          ctx.fill();
        }
        // Ash
        ctx.fillStyle = 'rgba(80,70,60,0.4)';
        for (let a = 0; a < 25; a++) {
          const ax = ((a * 61 + t * 8) % W + W) % W;
          const ay = ((a * 43 + t * 22) % H + H) % H;
          ctx.globalAlpha = 0.2 + Math.sin(t + a) * 0.1;
          ctx.beginPath();
          ctx.arc(ax, ay, 2 + (a % 4), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'jungle': {
        // Fireflies
        for (let f = 0; f < 15; f++) {
          const fx = ((f * 97 + Math.sin(t * 0.3 + f) * 30 + t * 5) % W + W) % W;
          const fy = H * 0.5 + Math.sin(t * 0.5 + f * 1.2) * H * 0.25 + f * H * 0.03;
          const blink = Math.sin(t * 3 + f * 2.3) > 0.3;
          ctx.globalAlpha = blink ? 0.8 : 0.1;
          ctx.fillStyle = '#aaff44';
          ctx.shadowColor = '#88ff00';
          ctx.shadowBlur = blink ? 8 : 0;
          ctx.beginPath();
          ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // Falling leaves
        for (let l = 0; l < 20; l++) {
          const lx = ((l * 79 + t * 10 * (l % 2 === 0 ? 1 : -0.4)) % W + W) % W;
          const ly = ((t * 20 + l * 47) % H + H) % H;
          const angle = Math.sin(t * 0.8 + l) * 0.5;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(angle);
          ctx.fillStyle = l % 3 === 0 ? 'rgba(60,120,30,0.6)' : 'rgba(100,70,30,0.5)';
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }
      case 'desert': {
        // Dust particles
        for (let d = 0; d < 40; d++) {
          const dx = ((d * 67 + t * 14 + Math.sin(t + d) * 15) % W + W) % W;
          const dy = H * 0.75 + Math.sin(t * 0.6 + d * 0.8) * H * 0.15 + d * H * 0.006;
          ctx.globalAlpha = 0.15 + Math.sin(t + d) * 0.08;
          ctx.fillStyle = 'rgba(200,170,80,0.6)';
          ctx.beginPath();
          ctx.arc(dx, dy, 1.5 + (d % 4) * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'underwater': {
        // Rising bubbles
        for (let b = 0; b < 25; b++) {
          const bx2 = (b * 57 + 15) % W;
          const by2 = ((H - (t * 35 + b * 28)) % H + H) % H;
          const br = 2 + (b % 5);
          ctx.globalAlpha = 0.4 + Math.sin(t * 1.5 + b) * 0.2;
          ctx.strokeStyle = 'rgba(150,210,255,0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(bx2 + Math.sin(t * 0.5 + b) * 5, by2, br, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawTrailEffect(ctx, trail, color, width) {
    if (!trail || trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let r = 255, g = 255, b = 255;
    if (typeof color === 'string' && color.startsWith('#') && color.length >= 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.5;
      const w2 = (i / trail.length) * width;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = w2;
      if (i === 1) {
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
      }
      if (i < trail.length - 1) {
        const mx = (trail[i].x + trail[i + 1].x) / 2;
        const my = (trail[i].y + trail[i + 1].y) / 2;
        ctx.quadraticCurveTo(trail[i].x, trail[i].y, mx, my);
      } else {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(trail[i].x, trail[i].y);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // UI RENDER SYSTEMS
  // ═══════════════════════════════════════════════════════════════

  renderMinimapAdvanced(ctx, x, y, size, terrainData, vehicleX, botX) {
    ctx.save();
    ctx.translate(x, y);
    const w2 = size * 2.2;
    const h2 = size * 0.45;
    const now = Date.now() / 1000;
    // Background panel — glossy glass with gradient
    const panelGrad = GradyanDeposu.lin(ctx, 0, -4, 0, h2 + 4, [0, 'rgba(16,22,38,0.82)', 1, 'rgba(6,8,16,0.82)']);
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(-4, -4, w2 + 8, h2 + 8, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,175,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner top gloss
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(-4, -4, w2 + 8, (h2 + 8) * 0.4, 6);
    ctx.fill();
    // Terrain silhouette — gradient fill with a lit ridge line
    if (terrainData && terrainData.points && terrainData.points.length > 1) {
      const pts = terrainData.points;
      const totalLen = terrainData.length || (pts[pts.length - 1].x);
      const scaleX = w2 / totalLen;
      const terrGrad = GradyanDeposu.lin(ctx, 0, 0, 0, h2, [0, 'rgba(90,120,150,0.75)', 1, 'rgba(35,50,70,0.85)']);
      ctx.fillStyle = terrGrad;
      ctx.beginPath();
      ctx.moveTo(0, h2);
      for (const pt of pts) {
        const px2 = pt.x * scaleX;
        const py2 = h2 - pt.y * h2 * 0.7;
        ctx.lineTo(px2, py2);
      }
      ctx.lineTo(w2, h2);
      ctx.closePath();
      ctx.fill();
      // Glowing ridge line
      ctx.strokeStyle = 'rgba(140,200,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      let first = true;
      for (const pt of pts) {
        const px2 = pt.x * scaleX;
        const py2 = h2 - pt.y * h2 * 0.7;
        if (first) { ctx.moveTo(px2, py2); first = false; } else ctx.lineTo(px2, py2);
      }
      ctx.stroke();
    }
    // Biome color bands
    const biomeColors = ['rgba(80,140,60,0.25)','rgba(200,160,60,0.25)','rgba(60,60,180,0.25)'];
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = biomeColors[b % biomeColors.length];
      ctx.fillRect(b * w2 / 3, 0, w2 / 3, h2);
    }
    const pulse = 1 + Math.sin(now * 4) * 0.25;
    // Vehicle indicator (green dot) — pulsing radar ping
    if (vehicleX !== undefined && terrainData && terrainData.length) {
      const vMapX = Math.max(3, Math.min(w2 - 3, (vehicleX / terrainData.length) * w2));
      const halo = GradyanDeposu.rad(ctx, vMapX, h2 * 0.5, 0, vMapX, h2 * 0.5, 9 * pulse, [0, 'rgba(0,255,110,0.5)', 1, 'rgba(0,255,110,0)']);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(vMapX, h2 * 0.5, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#00ff66';
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(vMapX, h2 * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Bot indicator (red dot) — pulsing ping
    if (botX !== undefined && terrainData && terrainData.length) {
      const bMapX = Math.max(3, Math.min(w2 - 3, (botX / terrainData.length) * w2));
      const bhalo = GradyanDeposu.rad(ctx, bMapX, h2 * 0.5, 0, bMapX, h2 * 0.5, 8 * pulse, [0, 'rgba(255,60,60,0.45)', 1, 'rgba(255,60,60,0)']);
      ctx.fillStyle = bhalo;
      ctx.beginPath();
      ctx.arc(bMapX, h2 * 0.5, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3333';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(bMapX, h2 * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Progress bar at bottom
    if (vehicleX !== undefined && terrainData && terrainData.length) {
      const progress = Math.min(1, vehicleX / terrainData.length);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, h2 + 4, w2, 3);
      const pgGrad = GradyanDeposu.lin(ctx, 0, 0, w2, 0, [0, '#00ff66', 0.5, '#00ddaa', 1, '#00aaff']);
      ctx.fillStyle = pgGrad;
      ctx.shadowColor = '#00ddaa';
      ctx.shadowBlur = 5;
      ctx.fillRect(0, h2 + 4, w2 * progress, 3);
      ctx.shadowBlur = 0;
    }
    // Distance labels
    ctx.fillStyle = 'rgba(200,220,255,0.5)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0', 0, h2 + 14);
    if (terrainData && terrainData.length) {
      ctx.textAlign = 'right';
      ctx.fillText(`${(terrainData.length / 1000).toFixed(1)}km`, w2, h2 + 14);
    }
    ctx.restore();
  },

  renderSpeedometer(ctx, x, y, speed, maxSpeed) {
    ctx.save();
    ctx.translate(x, y);
    const R = 45;
    const startAng = Math.PI * 0.75;
    const endAng = Math.PI * 2.25;
    const totalArc = endAng - startAng;
    const speedRatio = Math.min(1, Math.max(0, speed / (maxSpeed || 200)));
    // Glassy dial face
    const faceGrad = GradyanDeposu.rad(ctx, 0, -R * 0.3, 2, 0, 0, R + 4, [0, 'rgba(40,46,62,0.92)', 0.7, 'rgba(18,20,30,0.92)', 1, 'rgba(6,8,14,0.95)']);
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R + 4, 0, Math.PI * 2);
    ctx.fill();
    // Bezel ring
    ctx.strokeStyle = 'rgba(120,135,165,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R + 4, 0, Math.PI * 2);
    ctx.stroke();
    // Outer track ring
    ctx.strokeStyle = 'rgba(70,74,92,0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, R, startAng, endAng);
    ctx.stroke();
    // Redline segment on the track (top 15%)
    ctx.strokeStyle = 'rgba(200,30,20,0.5)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, R, startAng + totalArc * 0.85, endAng);
    ctx.stroke();
    // Speed arc (gradient: green -> yellow -> red) with glow
    const arcColor = speedRatio < 0.6
      ? `rgb(${Math.round(speedRatio / 0.6 * 255)},220,50)`
      : `rgb(255,${Math.round((1 - (speedRatio - 0.6) / 0.4) * 220)},0)`;
    const arcGrad = GradyanDeposu.lin(ctx, -R, R, R, -R, [0, '#33dd66', 0.6, '#ffdd22', 1, '#ff3311']);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = arcColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, R, startAng, startAng + totalArc * speedRatio);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Tick marks
    ctx.strokeStyle = 'rgba(200,210,220,0.6)';
    for (let i = 0; i <= 10; i++) {
      const ang = startAng + (i / 10) * totalArc;
      const isMajor = i % 2 === 0;
      const innerR = isMajor ? R - 10 : R - 6;
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * innerR, Math.sin(ang) * innerR);
      ctx.lineTo(Math.cos(ang) * (R - 1), Math.sin(ang) * (R - 1));
      ctx.stroke();
      if (isMajor) {
        ctx.fillStyle = 'rgba(180,190,210,0.8)';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labelR = innerR - 8;
        ctx.fillText(Math.round(i / 10 * (maxSpeed || 200)), Math.cos(ang) * labelR, Math.sin(ang) * labelR);
      }
    }
    // Needle — tapered with glowing tip and counterweight tail
    const needleAng = startAng + totalArc * speedRatio;
    const tipX = Math.cos(needleAng) * (R - 8);
    const tipY = Math.sin(needleAng) * (R - 8);
    const tailX = Math.cos(needleAng + Math.PI) * 11;
    const tailY = Math.sin(needleAng + Math.PI) * 11;
    // counterweight tail
    ctx.strokeStyle = 'rgba(90,90,110,0.9)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    // main needle
    ctx.strokeStyle = '#ff5522';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    // glowing tip
    ctx.fillStyle = '#ffdd88';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Center cap
    const capGrad = GradyanDeposu.rad(ctx, -2, -2, 0, 0, 0, 7, [0, '#eeeeee', 1, '#555555']);
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Speed number
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 14px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(speed), 0, 14);
    ctx.fillStyle = 'rgba(160,170,190,0.8)';
    ctx.font = '7px sans-serif';
    ctx.fillText('KM/H', 0, 24);
    ctx.restore();
  },

  renderFuelGauge(ctx, x, y, fuel, maxFuel) {
    ctx.save();
    ctx.translate(x, y);
    const W2 = 60;
    const H2 = 18;
    const ratio = Math.min(1, Math.max(0, fuel / (maxFuel || 100)));
    const low = ratio < 0.15;
    const blink = low && Math.floor(Date.now() / 350) % 2 === 0;
    // Low-fuel warning glow around the whole gauge
    if (low) {
      const warnA = 0.15 + Math.abs(Math.sin(Date.now() / 250)) * 0.25;
      ctx.save();
      ctx.shadowColor = '#ff2a00';
      ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(255,40,0,${warnA})`;
      ctx.beginPath();
      ctx.roundRect(-W2 / 2 - 4, -H2 / 2 - 4, W2 + 8 + 22, H2 + 8, 5);
      ctx.fill();
      ctx.restore();
    }
    // Outer frame — glossy dark panel
    const frameGrad = GradyanDeposu.lin(ctx, 0, -H2 / 2 - 4, 0, H2 / 2 + 4, [0, 'rgba(38,42,56,0.9)', 1, 'rgba(14,16,24,0.9)']);
    ctx.fillStyle = frameGrad;
    ctx.beginPath();
    ctx.roundRect(-W2 / 2 - 4, -H2 / 2 - 4, W2 + 8 + 22, H2 + 8, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,180,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Fill bar background (recessed)
    ctx.fillStyle = 'rgba(18,20,28,0.95)';
    ctx.fillRect(-W2 / 2, -H2 / 2, W2, H2);
    // Fill bar — vertical gloss gradient
    const cTop = ratio > 0.5 ? '#4dff77' : ratio > 0.25 ? '#ffd24d' : '#ff5a33';
    const cBot = ratio > 0.5 ? '#12a838' : ratio > 0.25 ? '#d99000' : '#c22000';
    const barGrad = GradyanDeposu.lin(ctx, 0, -H2 / 2, 0, H2 / 2, [0, cTop, 0.5, cBot, 1, cTop]);
    ctx.fillStyle = blink ? 'rgba(255,50,0,0.95)' : barGrad;
    ctx.fillRect(-W2 / 2, -H2 / 2, W2 * ratio, H2);
    // Top gloss highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-W2 / 2, -H2 / 2, W2 * ratio, H2 * 0.35);
    // Segment ticks
    ctx.strokeStyle = 'rgba(10,12,18,0.5)';
    ctx.lineWidth = 1;
    for (let s = 1; s < 10; s++) {
      const sx = -W2 / 2 + (W2 / 10) * s;
      ctx.beginPath();
      ctx.moveTo(sx, -H2 / 2);
      ctx.lineTo(sx, H2 / 2);
      ctx.stroke();
    }
    // Bar border
    ctx.strokeStyle = 'rgba(120,140,180,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-W2 / 2, -H2 / 2, W2, H2);
    // Fuel drop icon
    ctx.fillStyle = '#66aaff';
    ctx.beginPath();
    ctx.arc(W2 / 2 + 10, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#99ccff';
    ctx.beginPath();
    ctx.moveTo(W2 / 2 + 10, -10);
    ctx.bezierCurveTo(W2 / 2 + 6, -4, W2 / 2 + 4, 0, W2 / 2 + 10, 6);
    ctx.bezierCurveTo(W2 / 2 + 16, 0, W2 / 2 + 14, -4, W2 / 2 + 10, -10);
    ctx.fill();
    // Percentage text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(ratio * 100)}%`, 0, 0);
    // FUEL label
    ctx.fillStyle = 'rgba(160,180,220,0.7)';
    ctx.font = '7px sans-serif';
    ctx.fillText('FUEL', 0, H2 / 2 + 8);
    ctx.restore();
  },

  renderTachometer(ctx, x, y, rpm, maxRPM, engineTemp) {
    ctx.save();
    ctx.translate(x, y);
    const R = 42;
    const startAng = Math.PI * 0.75;
    const endAng = Math.PI * 2.25;
    const totalArc = endAng - startAng;
    const rpmRatio = Math.min(1, Math.max(0, rpm / (maxRPM || 8000)));
    const redlining = rpmRatio > 0.8;
    // Glassy dial face
    const faceGrad = GradyanDeposu.rad(ctx, 0, -R * 0.3, 2, 0, 0, R + 4, [0, 'rgba(34,40,56,0.92)', 0.7, 'rgba(14,16,26,0.92)', 1, 'rgba(6,8,14,0.95)']);
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(0, 0, R + 4, 0, Math.PI * 2);
    ctx.fill();
    // Bezel — flashes when redlining
    ctx.strokeStyle = redlining && Math.floor(Date.now() / 120) % 2 === 0
      ? 'rgba(255,60,40,0.85)' : 'rgba(110,125,155,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, R + 4, 0, Math.PI * 2);
    ctx.stroke();
    // Redline zone (last 20%) — glowing when active
    ctx.strokeStyle = redlining ? 'rgba(255,20,0,0.7)' : 'rgba(200,0,0,0.4)';
    ctx.lineWidth = 8;
    if (redlining) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 8; }
    ctx.beginPath();
    ctx.arc(0, 0, R, startAng + totalArc * 0.8, endAng);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Outer track ring
    ctx.strokeStyle = 'rgba(70,74,92,0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, R, startAng, endAng);
    ctx.stroke();
    // RPM arc — gradient cyan -> red with glow
    const rpmColor = rpmRatio < 0.8 ? '#00ccff' : '#ff2200';
    const rpmGrad = GradyanDeposu.lin(ctx, -R, 0, R, 0, [0, '#00d0ff', 0.75, '#33e0ff', 1, '#ff2200']);
    ctx.strokeStyle = rpmGrad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = rpmColor;
    ctx.shadowBlur = redlining ? 12 : 7;
    ctx.beginPath();
    ctx.arc(0, 0, R, startAng, startAng + totalArc * rpmRatio);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Tick marks
    ctx.strokeStyle = 'rgba(180,190,210,0.5)';
    for (let i = 0; i <= 8; i++) {
      const ang = startAng + (i / 8) * totalArc;
      const inR = R - 8;
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.strokeStyle = i >= 6 ? 'rgba(200,50,50,0.7)' : 'rgba(180,190,210,0.5)';
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * inR, Math.sin(ang) * inR);
      ctx.lineTo(Math.cos(ang) * (R - 2), Math.sin(ang) * (R - 2));
      ctx.stroke();
    }
    // Needle — glowing tip, counterweight tail
    const needleAng = startAng + totalArc * rpmRatio;
    const nTipX = Math.cos(needleAng) * (R - 6);
    const nTipY = Math.sin(needleAng) * (R - 6);
    ctx.strokeStyle = 'rgba(90,90,110,0.9)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(needleAng + Math.PI) * 9, Math.sin(needleAng + Math.PI) * 9);
    ctx.stroke();
    ctx.strokeStyle = redlining ? '#ff3300' : '#ff5522';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = redlining ? '#ff0000' : '#ff3300';
    ctx.shadowBlur = redlining ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(nTipX, nTipY);
    ctx.stroke();
    ctx.fillStyle = '#ffdd88';
    ctx.beginPath();
    ctx.arc(nTipX, nTipY, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Center cap
    const tCap = GradyanDeposu.rad(ctx, -1, -1, 0, 0, 0, 5, [0, '#cccccc', 1, '#444']);
    ctx.fillStyle = tCap;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // RPM number
    ctx.fillStyle = '#ccddff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(rpm / 100) / 10 + 'k', 0, 10);
    ctx.fillStyle = 'rgba(150,160,180,0.7)';
    ctx.font = '7px sans-serif';
    ctx.fillText('RPM', 0, 20);
    // Engine temperature bar
    const tempRatio = Math.min(1, Math.max(0, (engineTemp || 80) / 120));
    const tempW = R * 1.6;
    ctx.fillStyle = 'rgba(20,20,30,0.8)';
    ctx.fillRect(-tempW / 2, R + 4, tempW, 6);
    const tempGrad = GradyanDeposu.lin(ctx, -tempW / 2, 0, tempW / 2, 0, [0, '#0055ff', 0.5, '#00ffaa', 1, '#ff2200']);
    ctx.fillStyle = tempGrad;
    ctx.fillRect(-tempW / 2, R + 4, tempW * tempRatio, 6);
    ctx.strokeStyle = 'rgba(100,120,160,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-tempW / 2, R + 4, tempW, 6);
    ctx.fillStyle = 'rgba(160,170,200,0.6)';
    ctx.font = '6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(engineTemp || 80)}°C`, 0, R + 16);
    // Warning indicator if overheating
    if (tempRatio > 0.9) {
      ctx.fillStyle = Math.floor(Date.now() / 300) % 2 === 0 ? '#ff0000' : 'rgba(255,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(tempW / 2 + 8, R + 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

};

// =============================================================================
// WEATHER_RENDERER — yağmur, kar, sis, kum fırtınası, şimşek render sistemi
// =============================================================================
const WEATHER_RENDERER = {
  // Yağmur damlaları
  drawRain(ctx, W, H, intensity, windX, t) {
    ctx.save();
    const count = Math.floor(intensity * 400);
    ctx.strokeStyle = 'rgba(174,214,241,0.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const seed = i * 7919;
      const x = ((seed * 1.3 + t * (windX + 2) * 60) % W + W) % W;
      const y = ((seed * 0.7 + t * 380) % H + H) % H;
      const len = 10 + (seed % 8);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + windX * 0.12 * len, y + len);
      ctx.stroke();
    }
    // Yağmur sisi
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgba(100,140,180,${0.04 * intensity})`);
    grad.addColorStop(1, `rgba(100,140,180,${0.12 * intensity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // Kar taneleri
  drawSnow(ctx, W, H, density, t) {
    ctx.save();
    const count = Math.floor(density * 300);
    for (let i = 0; i < count; i++) {
      const seed = i * 6271;
      const sx = (seed * 1.7 + Math.sin(t * 0.3 + i) * 20) % W;
      const sy = ((seed * 0.9 + t * (20 + (seed % 15))) % H + H) % H;
      const r = 1.5 + (seed % 3) * 0.8;
      const alpha = 0.5 + (seed % 5) * 0.1;
      ctx.beginPath();
      ctx.arc(((sx % W) + W) % W, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
    // Kar yüzey birikimi parıltısı
    const sg = ctx.createLinearGradient(0, H * 0.85, 0, H);
    sg.addColorStop(0, 'rgba(220,240,255,0)');
    sg.addColorStop(1, `rgba(220,240,255,${0.15 * density})`);
    ctx.fillStyle = sg;
    ctx.fillRect(0, H * 0.85, W, H * 0.15);
    ctx.restore();
  },

  // Sis katmanı
  drawFog(ctx, W, H, density, color) {
    ctx.save();
    const [r, g, b] = color || [200, 210, 220];
    // Katmanlı sis
    for (let layer = 0; layer < 4; layer++) {
      const y0 = H * (0.2 + layer * 0.2);
      const grad = ctx.createLinearGradient(0, y0, 0, y0 + H * 0.25);
      const a = density * (0.12 + layer * 0.06);
      grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${a})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, y0, W, H * 0.25);
    }
    // Genel sis örtüsü
    ctx.fillStyle = `rgba(${r},${g},${b},${density * 0.25})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // Kum fırtınası
  drawSandstorm(ctx, W, H, t) {
    ctx.save();
    const particleCount = 600;
    for (let i = 0; i < particleCount; i++) {
      const seed = i * 3571;
      const x = ((seed * 1.1 + t * (150 + (seed % 80))) % W + W) % W;
      const y = H * 0.1 + (seed % Math.floor(H * 0.8));
      const w = 3 + (seed % 12);
      const h2 = 1 + (seed % 2);
      const alpha = 0.1 + (seed % 7) * 0.05;
      ctx.fillStyle = `rgba(194,154,90,${alpha})`;
      ctx.fillRect(x, y, w, h2);
    }
    // Turuncu-sarı sis tonu
    const sg = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(180,130,60,0.15)', 0.6, 'rgba(200,160,80,0.22)', 1, 'rgba(160,110,40,0.08)']);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  // Şimşek efekti
  drawLightning(ctx, W, H, t) {
    ctx.save();
    // Şimşek belirli aralıklarda yanıp söner
    const cycle = Math.floor(t * 2) % 7;
    if (cycle === 0 || cycle === 1) {
      const x0 = W * (0.2 + (Math.floor(t * 13) % 60) / 100);
      ctx.strokeStyle = 'rgba(220,220,255,0.95)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#aaaaff';
      ctx.shadowBlur = 18;
      let cx = x0, cy = 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const segments = 8 + (Math.floor(t * 7) % 6);
      for (let s = 0; s < segments; s++) {
        cx += (Math.random() - 0.5) * 60;
        cy += H / segments;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      // Dallanma
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(200,200,255,0.55)';
      const bx = x0 + (Math.random() - 0.5) * 40, by = H * 0.35;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + (Math.random() - 0.5) * 80, by + H * 0.2);
      ctx.stroke();
      // Flaş
      ctx.fillStyle = 'rgba(200,200,255,0.08)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
};

// =============================================================================
// PARALLAX_LAYERS — 6 harita için arka plan parallax sistemi
// =============================================================================
const PARALLAX_LAYERS = {
  // Her harita için katman listesi: [{speed, drawFn}]
  layers: {
    'village': [
      {
        speed: 0.05,
        drawFn(ctx, W, H, camX, t) {
          // Uzak dağlar
          ctx.save();
          ctx.fillStyle = '#8aab7a';
          const ox = (camX * 0.05) % W;
          for (let m = -1; m < 3; m++) {
            const mx = m * W * 0.45 - ox;
            ctx.beginPath();
            ctx.moveTo(mx, H);
            ctx.lineTo(mx + W * 0.1, H * 0.45);
            ctx.lineTo(mx + W * 0.2, H * 0.6);
            ctx.lineTo(mx + W * 0.3, H * 0.38);
            ctx.lineTo(mx + W * 0.4, H * 0.55);
            ctx.lineTo(mx + W * 0.45, H);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      },
      {
        speed: 0.15,
        drawFn(ctx, W, H, camX, t) {
          // Orta plan ağaçlar — SABİT (kamerayla hareket etmez)
          ctx.save();
          const ox = 0;
          ctx.fillStyle = '#4a7a40';
          for (let i = 0; i < 8; i++) {
            const tx = (i * 140 - ox + W * 2) % (W + 140) - 70;
            const th = 60 + (i * 17 % 40);
            ctx.beginPath();
            ctx.arc(tx, H * 0.7, 30, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(tx - 5, H * 0.7, 10, th);
          }
          ctx.restore();
        }
      },
      {
        speed: 0.3,
        drawFn(ctx, W, H, camX, t) {
          // Yakın çit
          ctx.save();
          const ox = (camX * 0.3) % 80;
          ctx.strokeStyle = '#7a5a30';
          ctx.lineWidth = 3;
          for (let f = -1; f < W / 80 + 1; f++) {
            const fx = f * 80 - ox;
            ctx.beginPath();
            ctx.moveTo(fx + 10, H * 0.75);
            ctx.lineTo(fx + 10, H * 0.88);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(fx + 50, H * 0.75);
            ctx.lineTo(fx + 50, H * 0.88);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(fx, H * 0.8);
            ctx.lineTo(fx + 80, H * 0.8);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    ],

    'arctic': [
      {
        speed: 0.04,
        drawFn(ctx, W, H, camX, t) {
          // Aurora borealis
          ctx.save();
          for (let band = 0; band < 3; band++) {
            const yOff = H * (0.1 + band * 0.12);
            const amp = 18 + band * 8;
            const freq = 0.005 + band * 0.002;
            const hue = 140 + band * 40;
            const grad = ctx.createLinearGradient(0, yOff - amp, 0, yOff + amp + 15);
            grad.addColorStop(0, `hsla(${hue},80%,60%,0)`);
            grad.addColorStop(0.5, `hsla(${hue},80%,60%,0.22)`);
            grad.addColorStop(1, `hsla(${hue},80%,60%,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, yOff + Math.sin(t * 0.4 + band) * amp);
            for (let px = 0; px < W; px += 8) {
              ctx.lineTo(px, yOff + Math.sin(px * freq + t * 0.4 + band) * amp);
            }
            ctx.lineTo(W, yOff + amp + 15);
            ctx.lineTo(0, yOff + amp + 15);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      },
      {
        speed: 0.12,
        drawFn(ctx, W, H, camX, t) {
          // Kar tepeleri
          ctx.save();
          const ox = (camX * 0.12) % W;
          ctx.fillStyle = '#ddeeff';
          for (let i = 0; i < 6; i++) {
            const hx = (i * 180 - ox + W * 2) % (W + 200) - 100;
            ctx.beginPath();
            ctx.arc(hx, H * 0.82, 110, Math.PI, 0);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    ],

    'desert': [
      {
        speed: 0.03,
        drawFn(ctx, W, H, camX, t) {
          // Güneş hüzmesi arka plan
          ctx.save();
          const cx = W * 0.8, cy = H * 0.15;
          for (let r = 0; r < 8; r++) {
            const angle = (r / 8) * Math.PI * 2 + t * 0.05;
            const len = 200 + r * 30;
            const grad = GradyanDeposu.lin(ctx, cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len, [0, 'rgba(255,220,80,0.08)', 1, 'rgba(255,220,80,0)']);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.stroke();
          }
          ctx.restore();
        }
      },
      {
        speed: 0.1,
        drawFn(ctx, W, H, camX, t) {
          // Kum tepeleri (dunes)
          ctx.save();
          const ox = (camX * 0.1) % 300;
          ctx.fillStyle = '#d4a855';
          ctx.beginPath();
          ctx.moveTo(-ox, H);
          for (let px = 0; px <= W + 300; px += 8) {
            const y = H * 0.68 + Math.sin((px - ox) * 0.008) * H * 0.08;
            ctx.lineTo(px - ox, y);
          }
          ctx.lineTo(W + 300 - ox, H);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    ],

    'volcano': [
      {
        speed: 0.05,
        drawFn(ctx, W, H, camX, t) {
          // Volkan arka planda
          ctx.save();
          const ox = (camX * 0.05) % W;
          ctx.fillStyle = '#3a1a0a';
          ctx.beginPath();
          ctx.moveTo(W * 0.5 - ox, H);
          ctx.lineTo(W * 0.5 - ox + W * 0.15, H * 0.3);
          ctx.lineTo(W * 0.5 - ox + W * 0.3, H);
          ctx.closePath();
          ctx.fill();
          // Lav parıltısı
          const lg = GradyanDeposu.rad(ctx, W * 0.65 - ox, H * 0.3, 0, W * 0.65 - ox, H * 0.3, 80, [0, `rgba(255,100,0,${0.4 + Math.sin(t * 2) * 0.1})`, 1, 'rgba(255,80,0,0)']);
          ctx.fillStyle = lg;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      },
      {
        speed: 0.2,
        drawFn(ctx, W, H, camX, t) {
          // Kül parçacıkları
          ctx.save();
          for (let i = 0; i < 30; i++) {
            const seed = i * 997;
            const ax = ((seed * 1.3 + camX * 0.2 + t * (20 + i % 15)) % W + W) % W;
            const ay = (seed * 0.6 + t * (10 + i % 8)) % H;
            ctx.fillStyle = `rgba(80,60,50,${0.3 + (seed % 5) * 0.07})`;
            ctx.beginPath();
            ctx.arc(ax, ay, 2 + seed % 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    ],

    'forest': [
      {
        speed: 0.04,
        drawFn(ctx, W, H, camX, t) {
          // Uzak çam ormanı
          ctx.save();
          const ox = (camX * 0.04) % 120;
          ctx.fillStyle = '#1a4a1a';
          for (let i = -1; i < W / 120 + 2; i++) {
            const fx = i * 120 - ox;
            ctx.beginPath();
            ctx.moveTo(fx + 60, H * 0.35);
            ctx.lineTo(fx + 30, H * 0.7);
            ctx.lineTo(fx + 90, H * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(fx + 60, H * 0.25);
            ctx.lineTo(fx + 38, H * 0.58);
            ctx.lineTo(fx + 82, H * 0.58);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      },
      {
        speed: 0.18,
        drawFn(ctx, W, H, camX, t) {
          // Salınan yapraklar
          ctx.save();
          for (let i = 0; i < 20; i++) {
            const seed = i * 2311;
            const lx = ((seed * 1.5 + camX * 0.18) % W + W) % W;
            const ly = H * 0.3 + (seed % Math.floor(H * 0.3));
            const sw = Math.sin(t * (0.8 + seed % 5 * 0.2) + seed) * 15;
            ctx.fillStyle = `rgba(30,120,30,${0.4 + seed % 4 * 0.1})`;
            ctx.beginPath();
            ctx.ellipse(lx + sw, ly, 12, 6, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
    ],

    'city': [
      {
        speed: 0.06,
        drawFn(ctx, W, H, camX, t) {
          // Uzak binalar silueti
          ctx.save();
          const ox = (camX * 0.06) % W;
          ctx.fillStyle = '#1a1a2e';
          const buildings = [
            {w: 60, h: 160}, {w: 40, h: 200}, {w: 80, h: 130},
            {w: 35, h: 220}, {w: 55, h: 170}, {w: 70, h: 145}
          ];
          let bx = -ox;
          for (let rep = 0; rep < 4; rep++) {
            for (const b of buildings) {
              const by = H * 0.85 - b.h;
              ctx.fillRect(bx, by, b.w, b.h + 10);
              // Pencereler
              ctx.fillStyle = Math.random() > 0.3 ? 'rgba(255,220,100,0.6)' : 'rgba(50,50,80,0.5)';
              for (let wy = by + 10; wy < H * 0.85 - 15; wy += 18) {
                for (let wx = bx + 5; wx < bx + b.w - 8; wx += 14) {
                  ctx.fillRect(wx, wy, 8, 10);
                }
              }
              ctx.fillStyle = '#1a1a2e';
              bx += b.w + 6;
            }
          }
          ctx.restore();
        }
      }
    ]
  },

  // Tüm katmanları çiz
  draw(ctx, W, H, mapId, camX, t) {
    const layerList = this.layers[mapId];
    if (!layerList) return;
    for (const layer of layerList) {
      layer.drawFn(ctx, W, H, camX, t);
    }
  }
};

// =============================================================================
// WATER_RENDERER — su yüzeyi ve su altı efektleri
// =============================================================================
const WATER_RENDERER = {
  // Dalgalanan su yüzeyi
  drawWaterSurface(ctx, x, y, w, h, t) {
    ctx.save();
    // Su gövdesi gradyanı
    const wg = GradyanDeposu.lin(ctx, x, y, x, y + h, [0, 'rgba(30,140,200,0.88)', 0.4, 'rgba(20,100,170,0.92)', 1, 'rgba(10,60,120,0.95)']);
    ctx.fillStyle = wg;
    ctx.fillRect(x, y, w, h);

    // Dalga yüzeyi
    ctx.beginPath();
    ctx.moveTo(x, y);
    const wavePoints = Math.ceil(w / 8) + 2;
    for (let i = 0; i <= wavePoints; i++) {
      const wx = x + i * 8;
      const wy = y + Math.sin(i * 0.4 + t * 2.5) * 4 + Math.sin(i * 0.15 + t * 1.1) * 7;
      if (i === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.lineTo(x + w, y);
    ctx.closePath();
    const sg = GradyanDeposu.lin(ctx, x, y - 10, x, y + 15, [0, 'rgba(120,200,255,0.6)', 1, 'rgba(40,150,220,0.2)']);
    ctx.fillStyle = sg;
    ctx.fill();

    // Yansıma ışıltıları
    for (let g = 0; g < 6; g++) {
      const gx = x + (g * 137 + Math.sin(t + g) * 30) % w;
      const gy = y + Math.sin(g * 0.7 + t * 3) * 5;
      const rg = GradyanDeposu.rad(ctx, gx, gy, 0, gx, gy, 22, [0, 'rgba(255,255,255,0.45)', 1, 'rgba(255,255,255,0)']);
      ctx.fillStyle = rg;
      ctx.fillRect(gx - 22, gy - 22, 44, 44);
    }

    // Baloncuklar
    for (let b = 0; b < 8; b++) {
      const bx = x + (b * 97 + Math.sin(t * 0.5 + b) * 20) % w;
      const by = y + h * 0.2 + (b * 83 + t * 15) % (h * 0.75);
      ctx.beginPath();
      ctx.arc(bx, by, 2 + b % 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(180,230,255,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  },

  // Su altı efekti
  drawUnderwaterEffect(ctx, W, H, depth, t) {
    ctx.save();
    // Mavi-yeşil overlay
    const ug = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, `rgba(20,80,160,${0.15 + depth * 0.3})`, 1, `rgba(10,40,100,${0.3 + depth * 0.4})`]);
    ctx.fillStyle = ug;
    ctx.fillRect(0, 0, W, H);

    // Işık huzmeleri
    ctx.globalAlpha = 0.12;
    for (let ray = 0; ray < 5; ray++) {
      const rx = W * (0.1 + ray * 0.2) + Math.sin(t * 0.3 + ray) * 30;
      ctx.fillStyle = 'rgba(100,200,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(rx - 15, 0);
      ctx.lineTo(rx + 15, 0);
      ctx.lineTo(rx + 60 + Math.sin(t + ray) * 20, H * 0.7);
      ctx.lineTo(rx - 60 - Math.sin(t + ray) * 20, H * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    // Su yüzeyi dalgalanma efekti üstte
    const wg2 = GradyanDeposu.lin(ctx, 0, 0, 0, H * 0.15, [0, 'rgba(100,200,255,0.35)', 1, 'rgba(100,200,255,0)']);
    ctx.globalAlpha = 1;
    ctx.fillStyle = wg2;
    ctx.fillRect(0, 0, W, H * 0.15);

    // Balık / plankton parçacıkları
    for (let p = 0; p < 15; p++) {
      const seed = p * 1013;
      const px = (seed * 1.4 + t * (5 + p % 8)) % W;
      const py = H * 0.1 + (seed * 0.9 + t * (3 + p % 5)) % (H * 0.85);
      ctx.fillStyle = `rgba(180,240,255,${0.2 + seed % 5 * 0.06})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + seed % 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// =============================================================================
// NIGHT_RENDERER — gece gökyüzü, araç farları, sokak lambaları
// =============================================================================
const NIGHT_RENDERER = {
  _stars: null,

  _initStars(count) {
    this._stars = [];
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random(),
        y: Math.random() * 0.65,
        r: 0.4 + Math.random() * 1.4,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  },

  // Yıldızlı gece gökyüzü + ay
  drawNightSky(ctx, W, H, t) {
    if (!this._stars) this._initStars(180);
    ctx.save();

    // Gökyüzü gradyanı
    const sky = GradyanDeposu.lin(ctx, 0, 0, 0, H * 0.7, [0, '#050a1a', 0.5, '#0d1a3a', 1, '#162848']);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H * 0.72);

    // Yıldızlar
    for (const s of this._stars) {
      const alpha = 0.5 + 0.5 * Math.sin(t * s.speed + s.twinkle);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,240,${alpha})`;
      ctx.fill();
    }

    // Ay
    const moonX = W * 0.82, moonY = H * 0.12;
    const moonR = 30;
    const moonGrad = GradyanDeposu.rad(ctx, moonX - 8, moonY - 8, 0, moonX, moonY, moonR, [0, '#fffff0', 0.6, '#e8e4b0', 1, '#c8c080']);
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
    // Ay hüzmesi
    const moonHalo = GradyanDeposu.rad(ctx, moonX, moonY, moonR, moonX, moonY, moonR * 3.5, [0, 'rgba(255,255,200,0.18)', 1, 'rgba(255,255,200,0)']);
    ctx.fillStyle = moonHalo;
    ctx.fillRect(moonX - moonR * 4, moonY - moonR * 4, moonR * 8, moonR * 8);

    ctx.restore();
  },

  // Araç farları ışık konisi
  drawHeadlights(ctx, vehicle, zoom) {
    if (!vehicle) return;
    ctx.save();
    const vx = vehicle.screenX || 0;
    const vy = vehicle.screenY || 0;
    const dir = vehicle.facingRight !== false ? 1 : -1;
    const coneLen = 280 * zoom;
    const coneW = 90 * zoom;

    // Ana ışık konisi
    const lg = GradyanDeposu.lin(ctx, vx, vy, vx + dir * coneLen, vy - coneLen * 0.15, [0, 'rgba(255,250,200,0.55)', 0.5, 'rgba(255,240,180,0.22)', 1, 'rgba(255,230,150,0)']);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(vx, vy - 8 * zoom);
    ctx.lineTo(vx + dir * coneLen, vy - coneLen * 0.15 - coneW);
    ctx.lineTo(vx + dir * coneLen, vy - coneLen * 0.15 + coneW);
    ctx.closePath();
    ctx.fill();

    // Far kaynağı
    const src = GradyanDeposu.rad(ctx, vx + dir * 10, vy - 5, 0, vx + dir * 10, vy - 5, 20 * zoom, [0, 'rgba(255,255,220,0.9)', 1, 'rgba(255,255,220,0)']);
    ctx.fillStyle = src;
    ctx.beginPath();
    ctx.arc(vx + dir * 10, vy - 5, 20 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // Sokak lambaları
  drawStreetlights(ctx, terrain, camX, camY, zoom) {
    if (!terrain || !terrain.streetlights) return;
    ctx.save();
    for (const lamp of terrain.streetlights) {
      const sx = (lamp.x - camX) * zoom;
      const sy = (lamp.y - camY) * zoom;
      // Direk
      ctx.strokeStyle = '#555566';
      ctx.lineWidth = 3 * zoom;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy - 60 * zoom);
      ctx.lineTo(sx + 18 * zoom, sy - 60 * zoom);
      ctx.stroke();
      // Lamba ışığı
      const lampGrad = GradyanDeposu.rad(ctx, sx + 18 * zoom, sy - 60 * zoom, 0, sx + 18 * zoom, sy - 60 * zoom, 80 * zoom, [0, 'rgba(255,230,120,0.7)', 0.3, 'rgba(255,200,80,0.3)', 1, 'rgba(255,180,50,0)']);
      ctx.fillStyle = lampGrad;
      ctx.beginPath();
      ctx.arc(sx + 18 * zoom, sy - 60 * zoom, 80 * zoom, 0, Math.PI * 2);
      ctx.fill();
      // Lamba kafası
      ctx.fillStyle = '#ffeeaa';
      ctx.beginPath();
      ctx.arc(sx + 18 * zoom, sy - 60 * zoom, 5 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// =============================================================================
// EXPLOSION_RENDERER — patlama animasyonu
// =============================================================================
const EXPLOSION_RENDERER = {
  // particles: [{x,y,vx,vy,life,maxLife,r,color}]
  draw(ctx, particles) {
    if (!particles || !particles.length) return;
    ctx.save();
    for (const p of particles) {
      const progress = p.life / p.maxLife;
      const alpha = progress;
      const r = p.r * (1 + (1 - progress) * 1.5);
      // Kor kırmızısından sarıya
      const R = 255, G = Math.floor(200 * progress), B = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${R},${G},${B},${alpha})`;
      ctx.fill();
      // Parlama
      if (progress > 0.6) {
        const glow = GradyanDeposu.rad(ctx, p.x, p.y, 0, p.x, p.y, r * 2.5, [0, `rgba(255,200,50,${alpha * 0.4})`, 1, 'rgba(255,100,0,0)']);
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - r * 2.5, p.y - r * 2.5, r * 5, r * 5);
      }
    }
    // Duman
    for (const p of particles) {
      const progress = p.life / p.maxLife;
      if (progress < 0.5) {
        const alpha = (0.5 - progress) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 0.3, p.y - p.vy * 0.3, p.r * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80,70,60,${alpha})`;
        ctx.fill();
      }
    }
    ctx.restore();
  },

  // Patlama anı: büyük flash
  drawFlash(ctx, x, y, W, H, intensity) {
    ctx.save();
    const grad = GradyanDeposu.rad(ctx, x, y, 0, x, y, 200 * intensity, [0, `rgba(255,240,200,${0.9 * intensity})`, 0.3, `rgba(255,180,50,${0.5 * intensity})`, 1, 'rgba(255,100,0,0)']);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
};

// =============================================================================
// drawSkidMarks — lastik izi çizimi
// =============================================================================
function drawSkidMarks(ctx, vehicle, terrain, camera) {
  if (!vehicle || !vehicle.skidMarks || !vehicle.skidMarks.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const mark of vehicle.skidMarks) {
    if (!mark || mark.length < 2) continue;
    const age = mark.age || 0;
    const alpha = Math.max(0, 0.55 - age * 0.008);
    ctx.strokeStyle = `rgba(40,30,20,${alpha})`;
    ctx.lineWidth = 7;
    ctx.beginPath();
    let started = false;
    for (const pt of mark.points || mark) {
      const sx = (pt.x - camera.x) * camera.zoom;
      const sy = (pt.y - camera.y) * camera.zoom;
      if (!started) { ctx.moveTo(sx, sy); started = true; }
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// =============================================================================
// drawDust — toz bulutu efekti
// =============================================================================
function drawDust(ctx, vehicle, t) {
  if (!vehicle || !vehicle.dustParticles) return;
  ctx.save();
  for (const p of vehicle.dustParticles) {
    const progress = p.life / p.maxLife;
    const alpha = progress * 0.35;
    const r = p.r * (1 + (1 - progress) * 2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,150,100,${alpha})`;
    ctx.fill();
  }
  // Tekerlek altı küçük toz
  if (vehicle.speed && Math.abs(vehicle.speed) > 2) {
    const wx = vehicle.screenX - (vehicle.facingRight !== false ? 20 : -20);
    const wy = vehicle.screenY + 10;
    for (let i = 0; i < 4; i++) {
      const px = wx + (Math.random() - 0.5) * 25;
      const py = wy + Math.random() * 10;
      const r2 = 3 + Math.random() * 6;
      const rg = GradyanDeposu.rad(ctx, px, py, 0, px, py, r2, [0, 'rgba(200,170,110,0.35)', 1, 'rgba(200,170,110,0)']);
      ctx.fillStyle = rg;
      ctx.fillRect(px - r2, py - r2, r2 * 2, r2 * 2);
    }
  }
  ctx.restore();
}

// =============================================================================
// drawSpeedLines — hız çizgileri efekti
// =============================================================================
function drawSpeedLines(ctx, vehicle, W, H, camera) {
  if (!vehicle) return;
  const speed = Math.abs(vehicle.speed || 0);
  if (speed < 8) return;
  ctx.save();
  const intensity = Math.min(1, (speed - 8) / 20);
  const cx = W / 2, cy = H / 2;
  const lineCount = Math.floor(12 + intensity * 20);
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2;
    const startR = 80 + Math.random() * 60;
    const len = (50 + Math.random() * 120) * intensity;
    const alpha = (0.15 + Math.random() * 0.3) * intensity;
    const sx = cx + Math.cos(angle) * startR;
    const sy = cy + Math.sin(angle) * startR;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(cx + Math.cos(angle) * (startR + len), cy + Math.sin(angle) * (startR + len));
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.stroke();
  }
  // Merkez radyal bulanıklık efekti
  const radGrad = GradyanDeposu.rad(ctx, cx, cy, 0, cx, cy, 120, [0, `rgba(255,255,255,${0.04 * intensity})`, 1, 'rgba(255,255,255,0)']);
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// =============================================================================
// CHECKPOINT_RENDERER — checkpoint bayrağı ve animasyonlu halka
// =============================================================================
const CHECKPOINT_RENDERER = {
  draw(ctx, checkpoint, camera, t) {
    if (!checkpoint) return;
    ctx.save();
    const cx = (checkpoint.x - camera.x) * camera.zoom;
    const cy = (checkpoint.y - camera.y) * camera.zoom;
    const z = camera.zoom;

    // Animasyonlu halka
    const ringR = 40 * z + Math.sin(t * 3) * 5 * z;
    const ringAlpha = 0.5 + 0.3 * Math.sin(t * 4);
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,220,0,${ringAlpha})`;
    ctx.lineWidth = 4 * z;
    ctx.stroke();

    // İkinci halka (zıt faz)
    const ring2R = 30 * z + Math.sin(t * 3 + Math.PI) * 5 * z;
    ctx.beginPath();
    ctx.arc(cx, cy, ring2R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,160,0,${ringAlpha * 0.6})`;
    ctx.lineWidth = 2 * z;
    ctx.stroke();

    // Bayrak direği
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 3 * z;
    ctx.beginPath();
    ctx.moveTo(cx - 2 * z, cy + 60 * z);
    ctx.lineTo(cx - 2 * z, cy - 60 * z);
    ctx.stroke();

    // Bayrak
    const wave = Math.sin(t * 4) * 8 * z;
    ctx.fillStyle = checkpoint.reached ? '#00cc44' : '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(cx - 2 * z, cy - 60 * z);
    ctx.lineTo(cx - 2 * z + 35 * z, cy - 45 * z + wave);
    ctx.lineTo(cx - 2 * z + 35 * z, cy - 30 * z + wave * 0.5);
    ctx.lineTo(cx - 2 * z, cy - 15 * z);
    ctx.closePath();
    ctx.fill();

    // Dama deseni
    ctx.fillStyle = checkpoint.reached ? '#006622' : '#cc9900';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillRect(
            cx - 2 * z + col * (35 * z / 3),
            cy - 60 * z + row * (45 * z / 3) + (row < 1.5 ? wave : wave * 0.5),
            35 * z / 3, 45 * z / 3
          );
        }
      }
    }

    // Puan etiketi
    if (checkpoint.label) {
      ctx.fillStyle = 'white';
      ctx.font = `bold ${14 * z}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(checkpoint.label, cx, cy - 75 * z);
    }
    ctx.restore();
  }
};

// =============================================================================
// drawFinishLine — bitiş çizgisi
// =============================================================================
function drawFinishLine(ctx, x, y, camera) {
  ctx.save();
  const fx = (x - camera.x) * camera.zoom;
  const fy = (y - camera.y) * camera.zoom;
  const z = camera.zoom;
  const bannerH = 180 * z;
  const bannerW = 80 * z;

  // İki direk
  ctx.fillStyle = '#888899';
  ctx.fillRect(fx - bannerW / 2 - 4 * z, fy - bannerH, 6 * z, bannerH);
  ctx.fillRect(fx + bannerW / 2 - 2 * z, fy - bannerH, 6 * z, bannerH);

  // Üst çubuk
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(fx - bannerW / 2 - 4 * z, fy - bannerH, bannerW + 10 * z, 6 * z);

  // Dama deseni zemin çizgisi
  const squareW = 12 * z;
  for (let i = -6; i < 6; i++) {
    const col = i % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillStyle = col;
    ctx.fillRect(fx + i * squareW, fy - 8 * z, squareW, 8 * z);
  }

  // Banner dama
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const color = (row + col) % 2 === 0 ? '#ffffff' : '#000000';
      ctx.fillStyle = color;
      ctx.fillRect(fx - bannerW / 2 + col * (bannerW / 4), fy - bannerH + row * (bannerH / 6), bannerW / 4, bannerH / 6);
    }
  }

  // "FINISH" yazısı
  ctx.fillStyle = '#ffee00';
  ctx.font = `bold ${16 * z}px Arial`;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.fillText('FINISH', fx, fy - bannerH / 2 + 6 * z);
  ctx.restore();
}

// =============================================================================
// MINIMAP_RENDERER — gelişmiş minimap (araç ikonu, yol çizgisi, zoom)
// =============================================================================
const MINIMAP_RENDERER = {
  draw(ctx, mapData, vehicle, camera, options) {
    const opts = options || {};
    const mmX = opts.x || 20;
    const mmY = opts.y || 20;
    const mmW = opts.width || 200;
    const mmH = opts.height || 60;
    const scale = opts.scale || 0.03;
    const camOffX = opts.cameraX || 0;

    ctx.save();

    // Arka plan
    ctx.fillStyle = 'rgba(10,10,20,0.75)';
    ctx.strokeStyle = 'rgba(150,200,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mmX, mmY, mmW, mmH, 6);
    ctx.fill();
    ctx.stroke();

    // Clip minimap alanına
    ctx.beginPath();
    ctx.roundRect(mmX + 2, mmY + 2, mmW - 4, mmH - 4, 5);
    ctx.clip();

    // Arazi çizgisi
    if (mapData && mapData.points && mapData.points.length > 1) {
      const totalWidth = mapData.totalWidth || 10000;
      const mapScale = mmW / totalWidth;
      const viewLeft = camOffX;

      ctx.strokeStyle = '#4a8a4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let firstDrawn = false;
      for (const pt of mapData.points) {
        const px = mmX + (pt.x / totalWidth) * mmW;
        const py = mmY + mmH - (pt.y / (mapData.maxHeight || 500)) * mmH * 0.8 - 4;
        if (!firstDrawn) { ctx.moveTo(px, py); firstDrawn = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Görüş alanı vurgusu
    if (camera && mapData) {
      const totalWidth = mapData.totalWidth || 10000;
      const viewX = mmX + (camera.x / totalWidth) * mmW;
      const viewW = mmW * 0.12;
      ctx.fillStyle = 'rgba(100,180,255,0.15)';
      ctx.fillRect(viewX - viewW / 2, mmY, viewW, mmH);
      ctx.strokeStyle = 'rgba(100,180,255,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(viewX - viewW / 2, mmY, viewW, mmH);
    }

    // Checkpoint'ler
    if (mapData && mapData.checkpoints) {
      for (const cp of mapData.checkpoints) {
        const totalWidth = mapData.totalWidth || 10000;
        const px = mmX + (cp.x / totalWidth) * mmW;
        ctx.fillStyle = cp.reached ? '#00cc44' : '#ffcc00';
        ctx.fillRect(px - 2, mmY + 4, 4, mmH - 8);
      }
    }

    // Araç ikonu (kırmızı üçgen)
    if (vehicle && mapData) {
      const totalWidth = mapData.totalWidth || 10000;
      const vx = mmX + (vehicle.x / totalWidth) * mmW;
      const vy = mmY + mmH - (vehicle.y / (mapData.maxHeight || 500)) * mmH * 0.8 - 4;
      ctx.fillStyle = '#ff4444';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(vx, vy - 7);
      ctx.lineTo(vx - 5, vy + 4);
      ctx.lineTo(vx + 5, vy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
};

// =============================================================================
// POST_PROCESS_STACK genişletme: vignette, lens flare, heat haze
// =============================================================================
if (typeof POST_PROCESS_STACK !== 'undefined') {
  POST_PROCESS_STACK.drawVignette = function(ctx, W, H, intensity) {
    ctx.save();
    intensity = intensity || 0.5;
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${intensity})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  POST_PROCESS_STACK.drawLensFlare = function(ctx, W, H, lightX, lightY, t) {
    ctx.save();
    // Ana lens
    const dist = Math.sqrt((lightX - W/2)**2 + (lightY - H/2)**2);
    const flareAlpha = Math.max(0, 1 - dist / (W * 0.6)) * 0.6;
    if (flareAlpha < 0.01) { ctx.restore(); return; }

    const lg = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 80);
    lg.addColorStop(0, `rgba(255,240,200,${flareAlpha})`);
    lg.addColorStop(0.4, `rgba(255,200,100,${flareAlpha * 0.4})`);
    lg.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(lightX - 80, lightY - 80, 160, 160);

    // Yansıma zincirleri
    const dx = W/2 - lightX, dy = H/2 - lightY;
    const flarePositions = [0.3, 0.5, 0.7, 0.85, 1.1, 1.4];
    const flareColors = ['rgba(200,200,255,', 'rgba(255,200,200,', 'rgba(200,255,200,',
                         'rgba(255,255,200,', 'rgba(200,220,255,', 'rgba(255,210,180,'];
    for (let i = 0; i < flarePositions.length; i++) {
      const fx2 = lightX + dx * flarePositions[i];
      const fy2 = lightY + dy * flarePositions[i];
      const fr = 5 + i * 4 + Math.sin(t + i) * 2;
      const fg = GradyanDeposu.rad(ctx, fx2, fy2, 0, fx2, fy2, fr, [0, `${flareColors[i % flareColors.length]}${flareAlpha * 0.5})`, 1, `${flareColors[i % flareColors.length]}0)`]);
      ctx.fillStyle = fg;
      ctx.fillRect(fx2 - fr, fy2 - fr, fr * 2, fr * 2);
    }
    ctx.restore();
  };

  POST_PROCESS_STACK.drawHeatHaze = function(ctx, W, H, t, intensity) {
    // Heat haze: canvas'ı distort etmek doğrudan mümkün değil,
    // bunun yerine dalga şeklinde yatay gradient şeritler çizeriz
    ctx.save();
    intensity = intensity || 0.4;
    const stripeH = 4;
    for (let y = H * 0.5; y < H; y += stripeH * 2) {
      const offset = Math.sin(y * 0.05 + t * 3) * 6 * intensity;
      const alpha = 0.04 * intensity;
      ctx.fillStyle = `rgba(255,200,100,${alpha})`;
      ctx.fillRect(offset, y, W, stripeH);
    }
    ctx.restore();
  };
}

// POST_PROCESS_STACK yoksa standalone versiyonlar
const POST_PROCESS_EXTRA = {
  drawVignette(ctx, W, H, intensity) {
    ctx.save();
    intensity = intensity || 0.5;
    const vg = GradyanDeposu.rad(ctx, W/2, H/2, H*0.3, W/2, H/2, H*0.85, [0, 'rgba(0,0,0,0)', 1, `rgba(0,0,0,${intensity})`]);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawLensFlare(ctx, W, H, lightX, lightY, t) {
    ctx.save();
    const dist = Math.sqrt((lightX - W/2)**2 + (lightY - H/2)**2);
    const flareAlpha = Math.max(0, 1 - dist / (W * 0.6)) * 0.6;
    if (flareAlpha < 0.01) { ctx.restore(); return; }
    const lg = GradyanDeposu.rad(ctx, lightX, lightY, 0, lightX, lightY, 80, [0, `rgba(255,240,200,${flareAlpha})`, 1, 'rgba(255,150,50,0)']);
    ctx.fillStyle = lg;
    ctx.fillRect(lightX - 80, lightY - 80, 160, 160);
    ctx.restore();
  },

  drawHeatHaze(ctx, W, H, t, intensity) {
    ctx.save();
    intensity = intensity || 0.4;
    for (let y = H * 0.5; y < H; y += 8) {
      const offset = Math.sin(y * 0.05 + t * 3) * 6 * intensity;
      ctx.fillStyle = `rgba(255,200,100,${0.04 * intensity})`;
      ctx.fillRect(offset, y, W, 4);
    }
    ctx.restore();
  }
};

// =============================================================================
// drawHealthBar — araç sağlık göstergesi (kamera-bağımlı, HUD üzerinde)
// =============================================================================
function drawHealthBar(ctx, vehicle, camera, W, H) {
  if (!vehicle) return;
  ctx.save();
  const health = vehicle.health != null ? vehicle.health : 100;
  const maxHealth = vehicle.maxHealth || 100;
  const pct = Math.max(0, Math.min(1, health / maxHealth));

  // Bar konumu: araç üzerinde
  const bx = (vehicle.x - camera.x) * camera.zoom - 35;
  const by = (vehicle.y - camera.y) * camera.zoom - 50 * camera.zoom;
  const bw = 70, bh = 8;

  // Arka plan
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);

  // Renk gradyanı: yeşil -> sarı -> kırmızı
  let barColor;
  if (pct > 0.6) barColor = `hsl(${120},80%,45%)`;
  else if (pct > 0.3) barColor = `hsl(${Math.floor(pct * 200)},80%,45%)`;
  else barColor = `hsl(0,80%,45%)`;

  ctx.fillStyle = barColor;
  ctx.fillRect(bx, by, bw * pct, bh);

  // Parlama
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(bx, by, bw * pct, bh / 3);

  // Çerçeve
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);

  // HP metni
  ctx.fillStyle = 'white';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 3;
  ctx.fillText(`${Math.ceil(health)}/${maxHealth}`, bx + bw / 2, by - 3);
  ctx.restore();
}

// =============================================================================
// TERRAIN_OVERLAY_RENDERER — zemin tip renklendirme
// =============================================================================
const TERRAIN_OVERLAY_RENDERER = {
  typeColors: {
    'ice':    [100, 180, 255, 0.18],  // mavi
    'mud':    [100,  65,  20, 0.22],  // kahverengi
    'sand':   [210, 180,  90, 0.20],  // sarı
    'lava':   [255,  60,   0, 0.25],  // turuncu-kırmızı
    'water':  [ 30, 120, 220, 0.20],  // mavi
    'grass':  [ 50, 160,  50, 0.12],  // yeşil
    'rock':   [110, 100,  90, 0.15],  // gri
    'snow':   [220, 240, 255, 0.14],  // beyaz-mavi
    'crystal':[ 140, 60, 220, 0.18], // mor
    'default':null
  },

  // Bir terrain segmentini renklendirerek çiz
  drawSegmentOverlay(ctx, terrainPoints, terrainType, camera) {
    if (!terrainPoints || terrainPoints.length < 2) return;
    const colorData = this.typeColors[terrainType];
    if (!colorData) return;
    const [r, g, b, a] = colorData;
    ctx.save();
    ctx.beginPath();
    const first = terrainPoints[0];
    ctx.moveTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom);
    for (const pt of terrainPoints) {
      ctx.lineTo((pt.x - camera.x) * camera.zoom, (pt.y - camera.y) * camera.zoom);
    }
    const last = terrainPoints[terrainPoints.length - 1];
    ctx.lineTo((last.x - camera.x) * camera.zoom, (last.y - camera.y) * camera.zoom + 80);
    ctx.lineTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom + 80);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fill();
    // Özel zemin desenleri
    if (terrainType === 'ice') {
      // Buz çizikleri
      ctx.strokeStyle = `rgba(200,230,255,0.3)`;
      ctx.lineWidth = 1;
      for (let i = 0; i < terrainPoints.length - 1; i += 3) {
        const pt = terrainPoints[i];
        const sx = (pt.x - camera.x) * camera.zoom;
        const sy = (pt.y - camera.y) * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy - 2);
        ctx.lineTo(sx + 15, sy + 1);
        ctx.stroke();
      }
    } else if (terrainType === 'lava') {
      // Lav çatlakları aydınlanması
      ctx.strokeStyle = `rgba(255,150,0,0.4)`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < terrainPoints.length - 2; i += 5) {
        const pt = terrainPoints[i];
        const sx = (pt.x - camera.x) * camera.zoom;
        const sy = (pt.y - camera.y) * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 20, sy + 5);
        ctx.lineTo(sx + 12, sy + 12);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
};



// ============================================================
// TRAIL_RENDERER — araç arkası iz sistemi
// ============================================================
const TRAIL_RENDERER = {

  drawSkidTrail(ctx, points, color, width, alpha) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha !== undefined ? alpha : 0.55;
    ctx.strokeStyle = color || '#222222';
    ctx.lineWidth = width || 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const mx = (points[i-1].x + points[i].x) * 0.5;
      const my = (points[i-1].y + points[i].y) * 0.5;
      ctx.quadraticCurveTo(points[i-1].x, points[i-1].y, mx, my);
    }
    ctx.stroke();
    // Fade effect at trail end
    if (points.length > 4) {
      const tail = points.slice(-5);
      const tailGrad = GradyanDeposu.lin(ctx, tail[0].x, tail[0].y, tail[tail.length-1].x, tail[tail.length-1].y, [0, color || '#222222', 1, 'transparent']);
      ctx.beginPath();
      ctx.moveTo(tail[0].x, tail[0].y);
      for (let i = 1; i < tail.length; i++) {
        ctx.lineTo(tail[i].x, tail[i].y);
      }
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = (width || 6) * 0.5;
      ctx.stroke();
    }
    ctx.restore();
  },

  drawNitroTrail(ctx, points, t) {
    if (!points || points.length < 2) return;
    ctx.save();
    const colorCycle = (i, total) => {
      const ph = (t * 4 + i / total * Math.PI * 2) % (Math.PI * 2);
      const r = Math.floor(200 + 55 * Math.sin(ph));
      const g = Math.floor(80 + 80 * Math.sin(ph + 2.1));
      const b = Math.floor(50 + 50 * Math.sin(ph + 4.2));
      return `rgb(${r},${g},${b})`;
    };
    for (let i = 1; i < points.length; i++) {
      const alpha = (i / points.length) * 0.8;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colorCycle(i, points.length);
      ctx.lineWidth = 8 + (i / points.length) * 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[i-1].x, points[i-1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
    // Spark particles along trail
    ctx.globalAlpha = 0.9;
    for (let s = 0; s < 5; s++) {
      const pidx = Math.floor(Math.random() * points.length);
      const sp = points[pidx];
      if (!sp) continue;
      const sr = Math.random() * 2.5 + 0.5;
      ctx.beginPath();
      ctx.arc(
        sp.x + (Math.random()-0.5)*10,
        sp.y + (Math.random()-0.5)*10,
        sr, 0, Math.PI*2
      );
      ctx.fillStyle = Math.random() > 0.5 ? '#ffcc00' : '#ff4400';
      ctx.fill();
    }
    ctx.restore();
  },

  drawWaterTrail(ctx, points) {
    if (!points || points.length < 2) return;
    ctx.save();
    // Main wake
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    // Foam highlights
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#cceeff';
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Droplets
    ctx.globalAlpha = 0.7;
    for (let d = 0; d < points.length; d += 4) {
      const dp = points[d];
      if (!dp) continue;
      for (let dd = 0; dd < 3; dd++) {
        ctx.beginPath();
        ctx.arc(
          dp.x + (Math.random()-0.5)*24,
          dp.y - Math.random()*18,
          Math.random()*2.5+0.5, 0, Math.PI*2
        );
        ctx.fillStyle = '#aaddff';
        ctx.fill();
      }
    }
    ctx.restore();
  },

  drawMudTrail(ctx, points) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#6a4a2a';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    // Mud texture blobs
    ctx.globalAlpha = 0.45;
    for (let m = 0; m < points.length; m += 3) {
      const mp = points[m];
      if (!mp) continue;
      ctx.beginPath();
      ctx.ellipse(
        mp.x + (Math.random()-0.5)*20,
        mp.y + (Math.random()-0.5)*12,
        Math.random()*8+3,
        Math.random()*5+2,
        Math.random()*Math.PI, 0, Math.PI*2
      );
      ctx.fillStyle = Math.random() > 0.5 ? '#5a3a1a' : '#7a5a30';
      ctx.fill();
    }
    ctx.restore();
  }
};

// ============================================================
// GLOW_RENDERER — parlama efektleri
// ============================================================
const GLOW_RENDERER = {

  drawGlow(ctx, x, y, r, color, intensity) {
    ctx.save();
    const ints = intensity !== undefined ? intensity : 1.0;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    // Parse color to add alpha
    const c = color || '#ffffff';
    grad.addColorStop(0,   c.replace(')', `,${0.7 * ints})`).replace('rgb(', 'rgba(').replace('#', 'rgba(') );
    grad.addColorStop(0.4, c + Math.floor(0.35 * ints * 255).toString(16).padStart(2,'0'));
    grad.addColorStop(1,   'transparent');

    // Fallback simple approach
    const glowGrad = GradyanDeposu.rad(ctx, x, y, 0, x, y, r, [0, `rgba(255,255,255,${0.4 * ints})`, 0.3, color + '88', 1, 'transparent']);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = ints * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();
    ctx.restore();
  },

  drawNeonLine(ctx, x1, y1, x2, y2, color, width) {
    ctx.save();
    const w = width || 3;
    // Outer glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = color || '#00ffff';
    ctx.shadowBlur = w * 6;
    ctx.strokeStyle = color || '#00ffff';
    ctx.lineWidth = w * 2.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    // Mid glow
    ctx.lineWidth = w * 1.4;
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    // Core line
    ctx.lineWidth = w * 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = w * 2;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.restore();
  },

  drawEnergyAura(ctx, x, y, r, color, t) {
    ctx.save();
    const spikes = 12;
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < spikes; s++) {
      const baseAngle = (s / spikes) * Math.PI * 2;
      const wobble = Math.sin(t * 3.5 + s * 0.9) * 0.18;
      const spikeAngle = baseAngle + wobble;
      const spikeLen = r * (0.7 + Math.sin(t * 5 + s * 1.4) * 0.35);
      const ex = x + Math.cos(spikeAngle) * (r + spikeLen);
      const ey = y + Math.sin(spikeAngle) * (r + spikeLen);
      const sGrad = GradyanDeposu.lin(ctx, x, y, ex, ey, [0, color || '#00aaff', 1, 'transparent']);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(spikeAngle)*r*0.5, y + Math.sin(spikeAngle)*r*0.5);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = sGrad;
      ctx.lineWidth = 2.5 + Math.sin(t * 4 + s) * 1.5;
      ctx.globalAlpha = 0.5 + Math.sin(t * 6 + s * 0.7) * 0.3;
      ctx.stroke();
    }
    // Core pulse
    const pulseR = r * (0.8 + Math.sin(t * 4) * 0.15);
    const coreGrad = GradyanDeposu.rad(ctx, x, y, 0, x, y, pulseR, [0, '#ffffff', 0.3, color || '#00aaff', 1, 'transparent']);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.restore();
  }
};

// ============================================================
// OVERLAY_HUD_ELEMENTS — ekran üstü HUD elemanları
// ============================================================
const OVERLAY_HUD_ELEMENTS = {

  drawBoostIndicator(ctx, x, y, active, t) {
    ctx.save();
    const radius = 22;
    const pulseScale = active ? 1 + Math.sin(t * 12) * 0.08 : 1;
    ctx.translate(x, y);
    ctx.scale(pulseScale, pulseScale);
    // Background circle
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = active ? '#ff6600' : '#333344';
    ctx.globalAlpha = active ? 0.9 : 0.6;
    ctx.fill();
    ctx.strokeStyle = active ? '#ffaa00' : '#555566';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Lightning bolt icon
    ctx.fillStyle = active ? '#ffff00' : '#888899';
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(5, -14); ctx.lineTo(-4, -2); ctx.lineTo(2, -2);
    ctx.lineTo(-5, 14); ctx.lineTo(4, 2);   ctx.lineTo(-2, 2);
    ctx.closePath();
    ctx.fill();
    if (active) {
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 14;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8800';
      ctx.fill();
    }
    ctx.restore();
  },

  drawAirTime(ctx, x, y, airTime) {
    if (!airTime || airTime < 0.2) return;
    ctx.save();
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const seconds = (airTime / 1000).toFixed(1);
    const alpha = Math.min(1.0, airTime / 500);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#00ccff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00ddff';
    ctx.fillText(`AIR ${seconds}s`, x, y);
    // Subtle bounce animation
    const bounce = Math.sin(Date.now() * 0.006) * 2;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#88eeff';
    ctx.fillText('IN THE AIR!', x, y + 20 + bounce);
    ctx.restore();
  },

  drawFlipCounter(ctx, x, y, flips) {
    if (!flips || flips < 1) return;
    ctx.save();
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 14;
    ctx.fillStyle = flips >= 3 ? '#ff4400' : '#ffcc00';
    ctx.fillText(`x${flips} FLIP!`, x, y);
    if (flips >= 2) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(flips >= 3 ? 'INSANE!' : 'DOUBLE!', x, y + 24);
    }
    ctx.restore();
  },

  drawWheelieIndicator(ctx, x, y, duration) {
    if (!duration || duration < 300) return;
    ctx.save();
    const seconds = (duration / 1000).toFixed(1);
    ctx.font = 'bold 17px monospace';
    ctx.textAlign = 'center';
    const shimmer = Math.sin(Date.now() * 0.01) * 0.15;
    ctx.globalAlpha = 0.85 + shimmer;
    ctx.shadowColor = '#aa44ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#cc66ff';
    ctx.fillText(`WHEELIE ${seconds}s`, x, y);
    // Progress bar
    const barW = 100, barH = 8;
    const progress = Math.min(1.0, duration / 5000);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#222';
    ctx.fillRect(x - barW/2, y + 8, barW, barH);
    const barGrad = GradyanDeposu.lin(ctx, x - barW/2, 0, x + barW/2, 0, [0, '#7700cc', 1, '#ff00ff']);
    ctx.fillStyle = barGrad;
    ctx.fillRect(x - barW/2, y + 8, barW * progress, barH);
    ctx.restore();
  }
};

// ============================================================
// ENVIRONMENT_DETAILS — arka plan çevre detayları
// ============================================================
const ENVIRONMENT_DETAILS = {

  drawClouds(ctx, W, H, camX, t, density) {
    ctx.save();
    const dens = density || 5;
    const seed = 12345;
    ctx.globalAlpha = 0.75;
    for (let c = 0; c < dens; c++) {
      const rng = ((seed * (c + 1) * 6271) % 9973) / 9973;
      const rng2 = ((seed * (c + 1) * 3331) % 7919) / 7919;
      const cloudX = ((rng * W * 3 - camX * 0.08 + t * 18) % (W * 3)) - W * 0.5;
      const cloudY = H * 0.05 + rng2 * H * 0.28;
      const cloudW = 80 + rng * 120;
      const cloudH = 28 + rng2 * 38;
      const cloudAlpha = 0.5 + rng * 0.45;
      ctx.globalAlpha = cloudAlpha;
      const cGrad = GradyanDeposu.rad(ctx, cloudX, cloudY, 0, cloudX, cloudY, cloudW * 0.7, [0, 'rgba(255,255,255,0.9)', 0.5, 'rgba(230,240,255,0.5)', 1, 'transparent']);
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, cloudW * 0.7, cloudH * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = cGrad;
      ctx.fill();
      // Puff details
      for (let p = 0; p < 4; p++) {
        const pr = ((seed * (c*4+p+1) * 4447) % 6263) / 6263;
        ctx.beginPath();
        ctx.ellipse(
          cloudX + (pr - 0.5) * cloudW,
          cloudY - cloudH * 0.2 + pr * cloudH * 0.3,
          cloudW * (0.2 + pr * 0.25),
          cloudH * (0.4 + pr * 0.3),
          0, 0, Math.PI * 2
        );
        ctx.fillStyle = `rgba(255,255,255,${0.4 + pr * 0.3})`;
        ctx.fill();
      }
    }
    ctx.restore();
  },

  drawMountainSilhouette(ctx, W, H, camX, layers) {
    ctx.save();
    const numLayers = layers || 3;
    for (let layer = 0; layer < numLayers; layer++) {
      const parallax = 0.05 + layer * 0.04;
      const offsetX = -camX * parallax;
      const baseY = H * (0.55 + layer * 0.08);
      const lightness = 60 + layer * 18;
      const saturation = 20 - layer * 5;
      ctx.globalAlpha = 0.6 + layer * 0.15;
      ctx.fillStyle = `hsl(200,${saturation}%,${lightness}%)`;
      ctx.beginPath();
      ctx.moveTo(0, H);
      const peaks = 8 + layer * 3;
      for (let p = 0; p <= peaks; p++) {
        const px = (p / peaks) * W * 1.2 + (offsetX % (W * 0.2));
        const peakH = H * (0.18 + ((p * 7919 + layer * 3331) % 100) * 0.0028);
        const midX = px - (W / peaks) * 0.5;
        ctx.lineTo(midX, baseY - peakH * (layer === 0 ? 1.0 : 0.7));
        ctx.lineTo(px, baseY);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  drawGroundDetails(ctx, terrain, camX, camY, zoom) {
    if (!terrain || terrain.length < 2) return;
    ctx.save();
    const zm = zoom || 1;
    // Rocks scattered along terrain
    for (let i = 0; i < terrain.length - 1; i += 3) {
      const pt = terrain[i];
      if (!pt) continue;
      const sx = (pt.x - camX) * zm;
      const sy = (pt.y - camY) * zm;
      if (sx < -40 || sx > ctx.canvas.width + 40) continue;
      const rngR = ((i * 4447 + 1) % 100) / 100;
      if (rngR > 0.65) {
        const rSize = 4 + rngR * 10;
        ctx.beginPath();
        ctx.ellipse(sx, sy - rSize * 0.4, rSize, rSize * 0.65, rngR * Math.PI, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(30,${15+rngR*20}%,${35+rngR*25}%)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0,0,0,0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Grass tufts
      const rngG = ((i * 3331 + 7) % 100) / 100;
      if (rngG > 0.5) {
        const blades = 3 + Math.floor(rngG * 3);
        for (let b = 0; b < blades; b++) {
          const bx = sx + (b - blades/2) * 5;
          const bh = 6 + rngG * 10;
          const lean = (rngG - 0.5) * 0.6;
          ctx.beginPath();
          ctx.moveTo(bx, sy);
          ctx.quadraticCurveTo(bx + lean * bh, sy - bh * 0.6, bx + lean * bh * 1.5, sy - bh);
          ctx.strokeStyle = `hsl(${100+rngG*40},${55+rngG*25}%,${30+rngG*20}%)`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  },

  drawSunRays(ctx, W, H, t) {
    ctx.save();
    const sunX = W * 0.75;
    const sunY = H * 0.12;
    const numRays = 14;
    ctx.globalCompositeOperation = 'lighter';
    for (let r = 0; r < numRays; r++) {
      const angle = (r / numRays) * Math.PI * 2 + t * 0.04;
      const wobble = Math.sin(t * 2 + r * 0.85) * 0.05;
      const rayAngle = angle + wobble;
      const rayLen = W * (0.5 + Math.sin(t * 1.5 + r * 0.6) * 0.15);
      const ex = sunX + Math.cos(rayAngle) * rayLen;
      const ey = sunY + Math.sin(rayAngle) * rayLen;
      const rGrad = GradyanDeposu.lin(ctx, sunX, sunY, ex, ey, [0, 'rgba(255,230,100,0.18)', 0.4, 'rgba(255,200,50,0.06)', 1, 'transparent']);
      const halfW = 18 + Math.sin(t * 3 + r) * 8;
      const perpX = Math.cos(rayAngle + Math.PI/2) * halfW;
      const perpY = Math.sin(rayAngle + Math.PI/2) * halfW;
      ctx.beginPath();
      ctx.moveTo(sunX + perpX * 0.1, sunY + perpY * 0.1);
      ctx.lineTo(ex + perpX * 0.8, ey + perpY * 0.8);
      ctx.lineTo(ex - perpX * 0.8, ey - perpY * 0.8);
      ctx.lineTo(sunX - perpX * 0.1, sunY - perpY * 0.1);
      ctx.closePath();
      ctx.fillStyle = rGrad;
      ctx.fill();
    }
    // Sun core
    const sunGrad = GradyanDeposu.rad(ctx, sunX, sunY, 0, sunX, sunY, 55, [0, 'rgba(255,255,200,0.9)', 0.3, 'rgba(255,220,80,0.5)', 1, 'transparent']);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 55, 0, Math.PI * 2);
    ctx.fillStyle = sunGrad;
    ctx.fill();
    ctx.restore();
  }
};


// ============================================================
// PARTICLE_BURST_RENDERER — patlama ve ödül partikülleri
// ============================================================
const PARTICLE_BURST_RENDERER = {

  createBurst(x, y, options) {
    const opts = options || {};
    const count    = opts.count    || 20;
    const speed    = opts.speed    || 4;
    const life     = opts.life     || 60;
    const colors   = opts.colors   || ['#ffcc00', '#ff8800', '#ff4400'];
    const sizeMin  = opts.sizeMin  || 2;
    const sizeMax  = opts.sizeMax  || 8;
    const gravity  = opts.gravity  !== undefined ? opts.gravity : 0.18;
    const spread   = opts.spread   || Math.PI * 2;
    const baseAngle= opts.baseAngle|| -Math.PI / 2;

    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const spd   = speed * (0.5 + Math.random() * 0.8);
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life,
        maxLife: life,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity,
        alpha: 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
    return particles;
  },

  updateBurst(particles) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.rotation += p.rotSpeed;
      p.life--;
      p.alpha = p.life / p.maxLife;
      if (p.life <= 0) particles.splice(i, 1);
    }
  },

  drawBurst(ctx, particles) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.beginPath();
      ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
  },

  drawCoinBurst(ctx, x, y, coinCount) {
    ctx.save();
    const radius = 28 + coinCount * 2;
    for (let c = 0; c < Math.min(coinCount, 8); c++) {
      const angle = (c / Math.min(coinCount, 8)) * Math.PI * 2;
      const cx = x + Math.cos(angle) * radius;
      const cy = y + Math.sin(angle) * radius;
      // Coin body
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      const cg = GradyanDeposu.rad(ctx, cx-2, cy-2, 1, cx, cy, 8, [0, '#ffee88', 0.5, '#ffcc00', 1, '#cc8800']);
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.strokeStyle = '#aa6600';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Coin shine
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }
    // Count text
    if (coinCount > 1) {
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00';
      ctx.shadowColor = '#cc8800';
      ctx.shadowBlur = 8;
      ctx.fillText(`+${coinCount}`, x, y - radius - 10);
    }
    ctx.restore();
  },

  drawGemBurst(ctx, x, y, color) {
    ctx.save();
    const c = color || '#00aaff';
    // Gem shape
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + 12, y - 4);
    ctx.lineTo(x + 8,  y + 14);
    ctx.lineTo(x - 8,  y + 14);
    ctx.lineTo(x - 12, y - 4);
    ctx.closePath();
    const gg = GradyanDeposu.lin(ctx, x-12, y-18, x+12, y+14, [0, '#ffffff', 0.3, c, 1, c + '88']);
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Shine line
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 14);
    ctx.lineTo(x + 4, y - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glow
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    const rg = GradyanDeposu.rad(ctx, x, y, 0, x, y, 26, [0, c, 1, 'transparent']);
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.restore();
  }
};

// ============================================================
// LEVEL_TRANSITION_RENDERER — bölüm geçiş animasyonları
// ============================================================
const LEVEL_TRANSITION_RENDERER = {

  drawFadeIn(ctx, W, H, progress) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawFadeOut(ctx, W, H, progress) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, progress);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawStarWipe(ctx, W, H, progress, color) {
    ctx.save();
    const c = color || '#000000';
    const cx = W * 0.5, cy = H * 0.5;
    const maxR = Math.sqrt(cx*cx + cy*cy) * 1.1;
    const r = maxR * progress;
    const spikes = 16;
    ctx.beginPath();
    for (let s = 0; s < spikes * 2; s++) {
      const ang = (s / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const dist = s % 2 === 0 ? r : r * 0.72;
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist;
      s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.restore();
  },

  drawSlide(ctx, W, H, progress, direction) {
    ctx.save();
    ctx.fillStyle = '#111111';
    const dir = direction || 'left';
    switch (dir) {
      case 'left':  ctx.fillRect(-W + progress * W, 0, W, H); break;
      case 'right': ctx.fillRect(W - progress * W, 0, W, H);  break;
      case 'up':    ctx.fillRect(0, -H + progress * H, W, H); break;
      case 'down':  ctx.fillRect(0, H - progress * H, W, H);  break;
    }
    ctx.restore();
  },

  drawVictoryScreen(ctx, W, H, t, vehicleId, distance, coins) {
    ctx.save();
    // Background overlay
    const vbg = GradyanDeposu.lin(ctx, 0, 0, 0, H, [0, 'rgba(10,5,30,0.92)', 1, 'rgba(30,10,5,0.92)']);
    ctx.fillStyle = vbg;
    ctx.fillRect(0, 0, W, H);

    // Star burst background
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 8; s++) {
      const sa = (s / 8) * Math.PI * 2 + t * 0.5;
      const sr = 120 + Math.sin(t * 2 + s) * 30;
      const sg = GradyanDeposu.lin(ctx, W/2, H/2, W/2 + Math.cos(sa)*sr, H/2 + Math.sin(sa)*sr, [0, 'rgba(255,200,0,0.3)', 1, 'transparent']);
      ctx.beginPath();
      ctx.moveTo(W/2, H/2);
      ctx.lineTo(W/2 + Math.cos(sa)*sr*2, H/2 + Math.sin(sa)*sr*2);
      ctx.strokeStyle = sg;
      ctx.lineWidth = 22;
      ctx.stroke();
    }

    // Victory text
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 28;
    ctx.fillStyle = '#ffee88';
    ctx.font = `bold ${Math.floor(52 + Math.sin(t*3)*3)}px sans-serif`;
    ctx.fillText('VICTORY!', W/2, H * 0.28);

    // Distance
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#0044ff';
    ctx.shadowBlur = 14;
    ctx.fillText(`${distance}m`, W/2, H * 0.44);

    // Coins
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#cc8800';
    ctx.fillText(`+${coins} coins`, W/2, H * 0.56);

    ctx.restore();
  }
};

// ============================================================
// WEATHER_RENDERER — hava durumu efektleri
// ============================================================
const WEATHER_RENDERER_EXT = {

  drawRain(ctx, W, H, camX, t, intensity) {
    ctx.save();
    const ints = intensity || 0.7;
    const dropCount = Math.floor(80 * ints);
    ctx.strokeStyle = 'rgba(180,210,255,0.55)';
    ctx.lineWidth = 1.2;
    for (let d = 0; d < dropCount; d++) {
      const seed = d * 3571;
      const dx = ((seed * 1337 + t * 180 * ints) % (W + 80)) - 40;
      const dy = ((seed * 2771 + t * 280 * ints) % (H + 50));
      const dlen = 12 + (seed % 20) * ints;
      const angle = 0.2 + ints * 0.15;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + Math.sin(angle) * dlen, dy + Math.cos(angle) * dlen);
      ctx.globalAlpha = 0.4 + (seed % 10) * 0.04;
      ctx.stroke();
    }
    ctx.restore();
  },

  drawSnow(ctx, W, H, camX, t, intensity) {
    ctx.save();
    const ints = intensity || 0.6;
    const flakeCount = Math.floor(60 * ints);
    for (let f = 0; f < flakeCount; f++) {
      const seed = f * 2311;
      const fx = ((seed * 997 + t * 25 + Math.sin(t * 0.5 + f) * 30) % (W + 40)) - 20;
      const fy = ((seed * 1447 + t * 45 * ints) % (H + 30));
      const fr = 2 + (seed % 5) * ints;
      ctx.globalAlpha = 0.5 + (seed % 10) * 0.04;
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fillStyle = '#eeeeff';
      ctx.fill();
    }
    ctx.restore();
  },

  drawFog(ctx, W, H, density, t) {
    ctx.save();
    const dens = Math.min(1, density || 0.5);
    for (let layer = 0; layer < 4; layer++) {
      const layerAlpha = dens * (0.15 + layer * 0.08);
      const scrollX = (t * (8 + layer * 3)) % (W * 2);
      const fogGrad = GradyanDeposu.lin(ctx, 0, H * 0.4, 0, H, [0, `rgba(220,230,240,0)`, 0.4, `rgba(220,230,240,${layerAlpha})`, 1, `rgba(200,215,230,${layerAlpha * 1.5})`]);
      ctx.fillStyle = fogGrad;
      ctx.globalAlpha = 1;
      ctx.fillRect(-scrollX, 0, W * 2, H);
      ctx.fillRect(-scrollX + W * 2, 0, W * 2, H);
    }
    ctx.restore();
  },

  drawLightning(ctx, W, H, t, lastBolt) {
    if (!lastBolt || t - lastBolt > 0.15) return;
    ctx.save();
    const boltX = W * 0.3 + Math.random() * W * 0.4;
    ctx.globalAlpha = Math.max(0, 0.9 - (t - lastBolt) * 6);
    ctx.strokeStyle = '#aaccff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25;
    let cx2 = boltX, cy = 0;
    ctx.beginPath();
    ctx.moveTo(cx2, cy);
    while (cy < H * 0.7) {
      cy += 25 + Math.random() * 30;
      cx2 += (Math.random() - 0.5) * 60;
      ctx.lineTo(cx2, cy);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 40;
    ctx.stroke();
    // Flash
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, (0.3 - (t - lastBolt) * 2));
    ctx.fillStyle = 'rgba(200,220,255,0.25)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawSandstorm(ctx, W, H, camX, t, intensity) {
    ctx.save();
    const ints = intensity || 0.7;
    // Base dust haze
    const dg = GradyanDeposu.lin(ctx, 0, 0, W, 0, [0, `rgba(200,160,80,${0.25 * ints})`, 0.5, `rgba(220,180,100,${0.4 * ints})`, 1, `rgba(180,140,60,${0.3 * ints})`]);
    ctx.fillStyle = dg;
    ctx.fillRect(0, 0, W, H);
    // Flying particles
    const pCount = Math.floor(120 * ints);
    for (let p = 0; p < pCount; p++) {
      const seed = p * 1777;
      const px = ((seed * 997 + t * 200 * ints) % (W + 100)) - 50;
      const py = H * (0.1 + (seed % 80) * 0.0115);
      const plen = 6 + (seed % 18) * ints;
      const psize = 0.5 + (seed % 4) * 0.3;
      ctx.globalAlpha = 0.2 + (seed % 8) * 0.05;
      ctx.beginPath();
      ctx.ellipse(px, py, plen, psize, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${30 + seed % 20},${55 + seed%20}%,${50+seed%25}%)`;
      ctx.fill();
    }
    ctx.restore();
  }
};

// ============================================================
// SCORE_POPUP_RENDERER — puanlama popup'ları
// ============================================================
const SCORE_POPUP_RENDERER = {
  _popups: [],

  add(x, y, text, color, size) {
    this._popups.push({
      x, y, text: String(text),
      color: color || '#ffcc00',
      size: size || 18,
      life: 80, maxLife: 80,
      vy: -1.8
    });
  },

  addCombo(x, y, multiplier) {
    this.add(x, y, `x${multiplier} COMBO!`, '#ff4400', 22);
  },

  addDistance(x, y, meters) {
    this.add(x, y, `${meters}m`, '#ffffff', 16);
  },

  addFlip(x, y, flipCount) {
    const labels = ['FLIP!', 'DOUBLE FLIP!', 'TRIPLE FLIP!', 'QUAD FLIP!', 'INSANE FLIP!'];
    const label = labels[Math.min(flipCount - 1, 4)];
    this.add(x, y, label, '#ff8800', 20);
  },

  update() {
    for (let i = this._popups.length - 1; i >= 0; i--) {
      const p = this._popups[i];
      p.y  += p.vy;
      p.vy += 0.03;
      p.life--;
      if (p.life <= 0) this._popups.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const p of this._popups) {
      ctx.save();
      const progress = p.life / p.maxLife;
      ctx.globalAlpha = progress < 0.3 ? progress / 0.3 : 1.0;
      ctx.font = `bold ${p.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      // Scale pop effect at beginning
      const scale = progress > 0.85 ? 1.0 + (1 - progress) / 0.15 * 0.3 : 1.0;
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
  }
};


// ============================================================
// MINIMAP_RENDERER — mini harita çizici
// ============================================================
const MINIMAP_RENDERER_EXT = {

  draw(ctx, x, y, w, h, terrain, vehicleX, vehicleY, camX, camY, zoom) {
    if (!terrain || terrain.length < 2) return;
    ctx.save();

    // Background
    ctx.fillStyle = 'rgba(10,15,25,0.82)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,140,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Terrain bounds
    const minX = terrain[0].x;
    const maxX = terrain[terrain.length - 1].x;
    const minY = Math.min(...terrain.map(p => p.y)) - 40;
    const maxY = Math.max(...terrain.map(p => p.y)) + 20;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const toMapX = (wx) => x + ((wx - minX) / rangeX) * w;
    const toMapY = (wy) => y + ((wy - minY) / rangeY) * h;

    // Terrain line
    ctx.beginPath();
    ctx.moveTo(toMapX(terrain[0].x), toMapY(terrain[0].y));
    for (let i = 1; i < terrain.length; i++) {
      ctx.lineTo(toMapX(terrain[i].x), toMapY(terrain[i].y));
    }
    ctx.strokeStyle = '#4a8a3a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill under terrain
    ctx.lineTo(toMapX(terrain[terrain.length-1].x), y + h);
    ctx.lineTo(toMapX(terrain[0].x), y + h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(40,80,30,0.35)';
    ctx.fill();

    // Camera viewport
    if (camX !== undefined && zoom) {
      const vpW = (800 / zoom) / rangeX * w;
      const vpX = toMapX(camX);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vpX, y, vpW, h);
    }

    // Vehicle dot
    const vx = toMapX(vehicleX);
    const vy = toMapY(vehicleY);
    ctx.beginPath();
    ctx.arc(vx, vy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4400';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Finish line indicator
    const last = terrain[terrain.length - 1];
    ctx.beginPath();
    ctx.arc(toMapX(last.x), toMapY(last.y), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff88';
    ctx.fill();

    ctx.restore();
  }
};

// ============================================================
// SPEEDOMETER_RENDERER — detaylı hız göstergesi
// ============================================================
const SPEEDOMETER_RENDERER = {

  draw(ctx, x, y, r, speed, maxSpeed, unit, needleColor) {
    ctx.save();
    ctx.translate(x, y);

    // Outer bezel
    const bezelGrad = GradyanDeposu.rad(ctx, 0, 0, r*0.8, 0, 0, r, [0, '#2a2a3a', 1, '#111118']);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fillStyle = bezelGrad;
    ctx.fill();
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dial face
    const faceGrad = GradyanDeposu.rad(ctx, -r*0.1, -r*0.1, r*0.05, 0, 0, r*0.88, [0, '#1a1a2a', 1, '#0a0a15']);
    ctx.beginPath();
    ctx.arc(0, 0, r*0.88, 0, Math.PI*2);
    ctx.fillStyle = faceGrad;
    ctx.fill();

    // Tick marks
    const startAngle = Math.PI * 0.75;
    const endAngle   = Math.PI * 2.25;
    const arcRange   = endAngle - startAngle;
    const ticks = 10;
    for (let t = 0; t <= ticks; t++) {
      const a = startAngle + (t / ticks) * arcRange;
      const major = t % 2 === 0;
      const innerR = major ? r * 0.68 : r * 0.74;
      const outerR = r * 0.82;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*innerR, Math.sin(a)*innerR);
      ctx.lineTo(Math.cos(a)*outerR, Math.sin(a)*outerR);
      ctx.strokeStyle = major ? '#ffffff' : '#aaaaaa';
      ctx.lineWidth = major ? 2 : 1;
      ctx.stroke();

      // Speed label on majors
      if (major) {
        const labelSpeed = Math.round((t / ticks) * maxSpeed);
        const lx = Math.cos(a) * r * 0.56;
        const ly = Math.sin(a) * r * 0.56;
        ctx.font = `bold ${Math.floor(r*0.16)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#cccccc';
        ctx.fillText(String(labelSpeed), lx, ly);
      }
    }

    // Red zone arc (last 20%)
    ctx.beginPath();
    ctx.arc(0, 0, r*0.78, startAngle + arcRange*0.8, endAngle, false);
    ctx.strokeStyle = 'rgba(220,30,10,0.6)';
    ctx.lineWidth = r * 0.06;
    ctx.stroke();

    // Speed arc fill
    const speedRatio = Math.min(1, speed / maxSpeed);
    const needleAngle = startAngle + speedRatio * arcRange;
    ctx.beginPath();
    ctx.arc(0, 0, r*0.78, startAngle, needleAngle, false);
    ctx.strokeStyle = speedRatio > 0.8 ? '#ff4400' : speedRatio > 0.6 ? '#ffcc00' : '#00aaff';
    ctx.lineWidth = r * 0.04;
    ctx.stroke();

    // Needle
    ctx.save();
    ctx.rotate(needleAngle);
    ctx.beginPath();
    ctx.moveTo(-r*0.12, 0);
    ctx.lineTo(r*0.72, 0);
    const ng = GradyanDeposu.lin(ctx, -r*0.12, 0, r*0.72, 0, [0, '#333', 0.3, needleColor || '#ff2200', 1, '#ff6600']);
    ctx.strokeStyle = ng;
    ctx.lineWidth = r * 0.055;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Center cap
    const capGrad = GradyanDeposu.rad(ctx, -r*0.04, -r*0.04, r*0.01, 0, 0, r*0.12, [0, '#555566', 1, '#111118']);
    ctx.beginPath();
    ctx.arc(0, 0, r*0.12, 0, Math.PI*2);
    ctx.fillStyle = capGrad;
    ctx.fill();

    // Speed text
    ctx.font = `bold ${Math.floor(r*0.22)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = 8;
    ctx.fillText(Math.round(speed).toString(), 0, r*0.35);
    ctx.font = `${Math.floor(r*0.13)}px monospace`;
    ctx.fillStyle = '#aaaaaa';
    ctx.shadowBlur = 0;
    ctx.fillText(unit || 'km/h', 0, r*0.52);

    ctx.restore();
  }
};

// ============================================================
// DAMAGE_OVERLAY_RENDERER — hasar ekran efektleri
// ============================================================
const DAMAGE_OVERLAY_RENDERER = {

  drawBloodVignette(ctx, W, H, intensity) {
    if (!intensity || intensity <= 0) return;
    ctx.save();
    const alpha = Math.min(0.85, intensity * 0.9);
    const vg = GradyanDeposu.rad(ctx, W/2, H/2, W*0.25, W/2, H/2, W*0.75, [0, 'transparent', 1, `rgba(180,0,0,${alpha})`]);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },

  drawCrackOverlay(ctx, W, H, damage) {
    if (!damage || damage < 40) return;
    ctx.save();
    const intensity = (damage - 40) / 60;
    ctx.globalAlpha = intensity * 0.75;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;

    const crackSeeds = [
      [W*0.15, H*0.2], [W*0.8, H*0.15], [W*0.5, H*0.85],
      [W*0.1, H*0.7], [W*0.9, H*0.6]
    ];

    for (const [cx, cy] of crackSeeds.slice(0, Math.ceil(intensity * 5))) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let lx = cx, ly = cy;
      for (let seg = 0; seg < 6; seg++) {
        const nx = lx + (Math.random() - 0.5) * W * 0.18;
        const ny = ly + (Math.random() - 0.5) * H * 0.18;
        ctx.lineTo(nx, ny);
        if (Math.random() > 0.65) {
          ctx.moveTo(nx, ny);
          ctx.lineTo(nx + (Math.random()-0.5)*W*0.1, ny + (Math.random()-0.5)*H*0.1);
          ctx.moveTo(nx, ny);
        }
        lx = nx; ly = ny;
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  drawHeatDistortion(ctx, W, H, t, intensity) {
    if (!intensity || intensity <= 0) return;
    ctx.save();
    // Shimmer at bottom of screen (simulated with opacity bands)
    const bands = 8;
    for (let b = 0; b < bands; b++) {
      const by = H * (0.6 + b / bands * 0.38);
      const alpha = intensity * 0.04 * Math.sin(t*8 + b*0.9);
      ctx.globalAlpha = Math.abs(alpha);
      ctx.fillStyle = `rgba(255,180,80,${Math.abs(alpha)})`;
      ctx.fillRect(0, by, W, H / bands * 0.5);
    }
    ctx.restore();
  }
};


// ============================================================
// RENDERER_CONFIG — renderer yapılandırma sabitleri
// ============================================================
const RENDERER_CONFIG_VERSION = '2.4.1';
const RENDERER_SETTINGS = {
  maxTrailPoints: 80,
  maxDecals: 80,
  shadowQuality: 'medium',   // 'low' | 'medium' | 'high'
  particleLimit: 400,
  glowEnabled: true,
  neonEnabled: true,
  weatherEffects: true,
  parallaxLayers: 3,
  minimapEnabled: true,
  minimapOpacity: 0.82,
  hudScale: 1.0,
  antiAlias: true,
  targetFPS: 60
};

// ============================================================
// MODULE 1: LIGHTING_SYSTEM
// ============================================================
const LIGHTING_SYSTEM = (function() {
  'use strict';

  const MAX_LIGHTS = 32;
  const DAY_CYCLE_STOPS = [
    { t: 0.00, r: 5,   g: 5,   b: 20  }, // midnight
    { t: 0.08, r: 10,  g: 10,  b: 35  }, // deep night
    { t: 0.17, r: 25,  g: 15,  b: 50  }, // pre-dawn
    { t: 0.21, r: 80,  g: 40,  b: 60  }, // dawn start
    { t: 0.25, r: 180, g: 90,  b: 60  }, // sunrise orange
    { t: 0.29, r: 220, g: 140, b: 80  }, // sunrise pink
    { t: 0.33, r: 240, g: 190, b: 130 }, // early morning
    { t: 0.38, r: 200, g: 210, b: 240 }, // morning blue
    { t: 0.42, r: 180, g: 210, b: 255 }, // mid-morning
    { t: 0.50, r: 160, g: 200, b: 255 }, // noon
    { t: 0.58, r: 170, g: 205, b: 250 }, // afternoon
    { t: 0.63, r: 200, g: 210, b: 235 }, // late afternoon
    { t: 0.67, r: 230, g: 200, b: 180 }, // golden hour
    { t: 0.71, r: 240, g: 160, b: 90  }, // sunset orange
    { t: 0.75, r: 200, g: 100, b: 70  }, // sunset red
    { t: 0.79, r: 140, g: 70,  b: 90  }, // dusk purple
    { t: 0.83, r: 70,  g: 40,  b: 80  }, // twilight
    { t: 0.88, r: 20,  g: 15,  b: 45  }, // evening
    { t: 0.92, r: 8,   g: 8,   b: 30  }, // night
    { t: 1.00, r: 5,   g: 5,   b: 20  }, // midnight
  ];

  const lights = [];
  let offscreenCanvas = null;
  let offscreenCtx = null;
  let lightMapCanvas = null;
  let lightMapCtx = null;
  let bloomCanvas = null;
  let bloomCtx = null;
  let dayTime = 0.5; // 0..1
  let starField = [];
  let starCount = 200;
  let moonPhase = 0; // 0..1
  let flickerTime = 0;

  // ── Light constructors ──────────────────────────────────────
  function PointLight(x, y, radius, color, intensity, falloff, flicker) {
    return { type: 'point', x, y, radius: radius || 120, color: color || '#ffffaa',
      intensity: intensity !== undefined ? intensity : 1.0,
      falloff: falloff || 2.0, flicker: flicker || 0, _phase: Math.random() * Math.PI * 2 };
  }

  function SpotLight(x, y, angle, spread, range, color, intensity, castShadow) {
    return { type: 'spot', x, y, angle: angle || 0, spread: spread || 0.5,
      range: range || 200, color: color || '#ffffff',
      intensity: intensity !== undefined ? intensity : 1.0,
      castShadow: !!castShadow };
  }

  function DirectionalLight(angle, color, intensity) {
    return { type: 'directional', angle: angle || -Math.PI / 4,
      color: color || '#fffff0', intensity: intensity !== undefined ? intensity : 0.6 };
  }

  function AreaLight(x, y, width, height, color, intensity) {
    return { type: 'area', x, y, width: width || 60, height: height || 20,
      color: color || '#ffffcc', intensity: intensity !== undefined ? intensity : 0.8 };
  }

  function EmissiveLight(x, y, radius, color, intensity) {
    return { type: 'emissive', x, y, radius: radius || 40,
      color: color || '#ff6600', intensity: intensity !== undefined ? intensity : 1.2 };
  }

  function AmbientLight(color, intensity) {
    return { type: 'ambient', color: color || '#334466', intensity: intensity !== undefined ? intensity : 0.4 };
  }

  // ── Internal helpers ────────────────────────────────────────
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : { r:255, g:255, b:255 };
  }

  function lerpColor(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  function getAmbientColor(t) {
    const stops = DAY_CYCLE_STOPS;
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].t && t <= stops[i+1].t) {
        const localT = (t - stops[i].t) / (stops[i+1].t - stops[i].t);
        return lerpColor(stops[i], stops[i+1], localT);
      }
    }
    return stops[0];
  }

  function ensureOffscreen(w, h) {
    if (!offscreenCanvas || offscreenCanvas.width !== w || offscreenCanvas.height !== h) {
      offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = w;
      offscreenCanvas.height = h;
      offscreenCtx = offscreenCanvas.getContext('2d');
    }
    if (!bloomCanvas || bloomCanvas.width !== w || bloomCanvas.height !== h) {
      bloomCanvas = document.createElement('canvas');
      bloomCanvas.width = Math.floor(w / 2);
      bloomCanvas.height = Math.floor(h / 2);
      bloomCtx = bloomCanvas.getContext('2d');
    }
  }

  function initStarField() {
    starField = [];
    for (let i = 0; i < starCount; i++) {
      starField.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        r: Math.random() * 1.5 + 0.3,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 3 + 1,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  // ── Public API ──────────────────────────────────────────────
  function addLight(light) {
    if (lights.length >= MAX_LIGHTS) lights.shift();
    lights.push(light);
    return lights.length - 1;
  }

  function removeLight(index) {
    if (index >= 0 && index < lights.length) lights.splice(index, 1);
  }

  function clearLights() { lights.length = 0; }

  function setDayTime(t) { dayTime = Math.max(0, Math.min(1, t)); }
  function setMoonPhase(p) { moonPhase = Math.max(0, Math.min(1, p)); }

  function updateFlicker(dt) {
    flickerTime += dt;
    for (const l of lights) {
      if (l.flicker > 0) {
        l._phase = (l._phase || 0) + dt * (4 + l.flicker * 6);
        l._flickerIntensity = 1.0 - l.flicker * 0.3 * (0.5 + 0.5 * Math.sin(l._phase * 7.3 + Math.cos(l._phase * 3.1)));
      } else {
        l._flickerIntensity = 1.0;
      }
    }
  }

  // ── Star field renderer ────────────────────────────────────
  function renderStars(ctx, w, h, now) {
    const nightFactor = dayTime < 0.25 ? 1 - dayTime / 0.25 :
                        dayTime > 0.75 ? (dayTime - 0.75) / 0.25 : 0;
    if (nightFactor < 0.01) return;
    for (const s of starField) {
      const tw = 0.6 + 0.4 * Math.sin(now * s.twinkleSpeed * 0.001 + s.twinklePhase);
      const alpha = nightFactor * tw * s.brightness;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
      if (s.r > 1.0) {
        ctx.globalAlpha = alpha * 0.4;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Moon renderer ──────────────────────────────────────────
  function renderMoon(ctx, w, h, now) {
    const nightFactor = dayTime < 0.25 ? 1 - dayTime / 0.25 :
                        dayTime > 0.75 ? (dayTime - 0.75) / 0.25 : 0;
    if (nightFactor < 0.01) return;
    const moonAngle = (dayTime > 0.5 ? dayTime - 0.5 : dayTime + 0.5) * Math.PI * 2 - Math.PI;
    const mx = w * 0.5 + Math.cos(moonAngle) * w * 0.4;
    const my = h * 0.35 - Math.sin(Math.abs(moonAngle)) * h * 0.25;
    const moonRadius = 22;
    ctx.save();
    ctx.globalAlpha = nightFactor * 0.9;

    // Moon glow
    const glowGrad = GradyanDeposu.rad(ctx, mx, my, 0, mx, my, moonRadius * 3, [0, 'rgba(230,230,200,0.3)', 1, 'rgba(230,230,200,0)']);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonRadius * 3, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    const moonGrad = GradyanDeposu.rad(ctx, mx - moonRadius * 0.3, my - moonRadius * 0.3, 0, mx, my, moonRadius, [0, '#fffde8', 0.7, '#e8e8c8', 1, '#c8c8a8']);
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Moon phase shadow
    const phaseOffset = (moonPhase - 0.5) * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, moonRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    if (phaseOffset >= 0) {
      ctx.ellipse(mx + phaseOffset * moonRadius, my, moonRadius * (1 - Math.abs(phaseOffset)), moonRadius, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(mx + phaseOffset * moonRadius, my, moonRadius * (1 - Math.abs(phaseOffset)), moonRadius, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ── Sun renderer ───────────────────────────────────────────
  function renderSun(ctx, w, h) {
    const isDay = dayTime > 0.25 && dayTime < 0.75;
    if (!isDay) return;
    const sunAngle = (dayTime - 0.25) / 0.5 * Math.PI;
    const sx = w * 0.15 + (w * 0.7) * ((dayTime - 0.25) / 0.5);
    const sy = h * 0.4 - Math.sin(sunAngle) * h * 0.3;
    const sunRadius = 28;

    ctx.save();
    // Sun corona
    const coronaGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunRadius * 4);
    const isSunrise = dayTime < 0.35;
    const isSunset = dayTime > 0.65;
    if (isSunrise || isSunset) {
      coronaGrad.addColorStop(0, 'rgba(255,200,100,0.6)');
      coronaGrad.addColorStop(0.3, 'rgba(255,120,40,0.3)');
      coronaGrad.addColorStop(1, 'rgba(255,80,20,0)');
    } else {
      coronaGrad.addColorStop(0, 'rgba(255,255,200,0.5)');
      coronaGrad.addColorStop(0.3, 'rgba(255,240,150,0.2)');
      coronaGrad.addColorStop(1, 'rgba(255,220,100,0)');
    }
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sunRadius * 4, 0, Math.PI * 2);
    ctx.fill();

    // Sun disk
    const sunGrad = GradyanDeposu.rad(ctx, sx - sunRadius * 0.2, sy - sunRadius * 0.2, 0, sx, sy, sunRadius, [0, '#fffde0', 0.6, '#ffe060', 1, '#ffb830']);
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Volumetric god rays ────────────────────────────────────
  function renderGodRays(ctx, w, h) {
    const isDay = dayTime > 0.25 && dayTime < 0.75;
    if (!isDay) return;
    const rayAlpha = Math.min(1, Math.sin((dayTime - 0.25) / 0.5 * Math.PI)) * 0.12;
    if (rayAlpha < 0.01) return;
    const sx = w * 0.15 + (w * 0.7) * ((dayTime - 0.25) / 0.5);
    const sy = h * 0.4 - Math.sin((dayTime - 0.25) / 0.5 * Math.PI) * h * 0.3;
    ctx.save();
    ctx.globalAlpha = rayAlpha;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const dx = Math.cos(angle) * w * 1.5;
      const dy = Math.sin(angle) * h * 1.5;
      const grad = ctx.createLinearGradient(sx, sy, sx + dx, sy + dy);
      grad.addColorStop(0, 'rgba(255,245,200,0.35)');
      grad.addColorStop(0.15, 'rgba(255,240,180,0.08)');
      grad.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const spread = 0.12;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dx + dy * spread, sy + dy - dx * spread);
      ctx.lineTo(sx + dx - dy * spread, sy + dy + dx * spread);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Lens flare ─────────────────────────────────────────────
  function renderLensFlare(ctx, w, h, cx, cy, intensity, color) {
    if (!intensity || intensity < 0.01) return;
    const flareColor = color || '#ffffff';
    const rgb = hexToRgb(flareColor);
    ctx.save();
    const dx = cx - w * 0.5;
    const dy = cy - h * 0.5;
    const positions = [0.3, 0.5, 0.7, 1.1, 1.4, -0.3, -0.6];
    const sizes = [8, 14, 5, 20, 10, 6, 12];
    for (let i = 0; i < positions.length; i++) {
      const fx = w * 0.5 + dx * positions[i];
      const fy = h * 0.5 + dy * positions[i];
      const fs = sizes[i] * intensity;
      const flareGrad = GradyanDeposu.rad(ctx, fx, fy, 0, fx, fy, fs, [0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.6 * intensity})`, 0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.2 * intensity})`, 1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`]);
      ctx.fillStyle = flareGrad;
      ctx.beginPath();
      ctx.arc(fx, fy, fs, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Point light rendering ──────────────────────────────────
  function renderPointLight(ctx, light, camX, camY) {
    const sx = light.x - camX;
    const sy = light.y - camY;
    const fi = light._flickerIntensity !== undefined ? light._flickerIntensity : 1;
    const intensity = light.intensity * fi;
    if (intensity < 0.01) return;
    const radius = light.radius * (1 + (fi - 1) * 0.1);
    const rgb = hexToRgb(light.color);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(1, intensity * 0.8)})`);
    grad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(1, intensity * 0.3)})`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Spot light rendering ───────────────────────────────────
  function renderSpotLight(ctx, light, camX, camY) {
    const sx = light.x - camX;
    const sy = light.y - camY;
    const endX = sx + Math.cos(light.angle) * light.range;
    const endY = sy + Math.sin(light.angle) * light.range;
    const rgb = hexToRgb(light.color);
    const coneWidth = light.range * Math.tan(light.spread);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, light.range);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(0.9, light.intensity * 0.8)})`);
    grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(0.5, light.intensity * 0.3)})`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, light.range, light.angle - light.spread, light.angle + light.spread);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Area light rendering ───────────────────────────────────
  function renderAreaLight(ctx, light, camX, camY) {
    const sx = light.x - camX;
    const sy = light.y - camY;
    const rgb = hexToRgb(light.color);
    const grad = ctx.createLinearGradient(sx, sy - light.height * 2, sx, sy + light.height * 3);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    grad.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${light.intensity * 0.5})`);
    grad.addColorStop(0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},${light.intensity * 0.3})`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(sx - light.width / 2, sy - light.height * 2, light.width, light.height * 5);
  }

  // ── Specular highlight on surface ─────────────────────────
  function renderSpecular(ctx, x, y, w, h, lightX, lightY, intensity) {
    const dx = lightX - (x + w / 2);
    const dy = lightY - (y + h / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const specX = x + w * 0.5 + nx * w * 0.25;
    const specY = y + h * 0.5 + ny * h * 0.25;
    const specRad = Math.min(w, h) * 0.15;
    const alpha = Math.min(0.6, intensity / (1 + dist / 200));
    const grad = GradyanDeposu.rad(ctx, specX, specY, 0, specX, specY, specRad, [0, `rgba(255,255,255,${alpha})`, 1, `rgba(255,255,255,0)`]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(specX, specY, specRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Bloom pipeline ─────────────────────────────────────────
  function applyBloom(ctx, srcCanvas, threshold, blurRadius, intensity) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const bw = Math.floor(w / 2);
    const bh = Math.floor(h / 2);
    if (!bloomCanvas || bloomCanvas.width !== bw || bloomCanvas.height !== bh) {
      bloomCanvas = document.createElement('canvas');
      bloomCanvas.width = bw;
      bloomCanvas.height = bh;
      bloomCtx = bloomCanvas.getContext('2d');
    }
    bloomCtx.clearRect(0, 0, bw, bh);
    bloomCtx.drawImage(srcCanvas, 0, 0, bw, bh);
    bloomCtx.filter = `blur(${blurRadius}px)`;
    bloomCtx.drawImage(bloomCanvas, 0, 0);
    bloomCtx.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = intensity || 0.4;
    ctx.drawImage(bloomCanvas, 0, 0, w, h);
    ctx.restore();
  }

  // ── Shadow casting ─────────────────────────────────────────
  function castShadow(ctx, objectX, objectY, objectW, objectH, lightX, lightY, groundY, alpha) {
    const ox = objectX + objectW / 2;
    const oy = objectY;
    const dx = ox - lightX;
    const dy = oy - lightY;
    if (dy >= 0) return; // light below object
    const t = (groundY - lightY) / dy;
    const shadowCX = lightX + dx * t;
    const shadowW = objectW * t * 0.8;
    const shadowH = objectH * 0.15;
    ctx.save();
    ctx.globalAlpha = (alpha || 0.35) * Math.min(1, 200 / Math.abs(groundY - oy));
    const shadowGrad = GradyanDeposu.rad(ctx, shadowCX, groundY, 0, shadowCX, groundY, shadowW, [0, 'rgba(0,0,0,0.7)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(shadowCX, groundY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Main composite lighting render ─────────────────────────
  function renderLighting(ctx, w, h, camX, camY, dt, now) {
    ensureOffscreen(w, h);
    updateFlicker(dt);

    // Ambient sky color
    const ambient = getAmbientColor(dayTime);
    const nightFactor = dayTime < 0.25 ? 1 - dayTime / 0.25 :
                        dayTime > 0.75 ? (dayTime - 0.75) / 0.25 : 0;
    if (nightFactor > 0.02) {
      ctx.save();
      ctx.globalAlpha = nightFactor * 0.5;
      ctx.fillStyle = `rgb(${ambient.r},${ambient.g},${ambient.b})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Stars and moon
    if (nightFactor > 0.05) {
      renderStars(ctx, w, h, now);
      renderMoon(ctx, w, h, now);
    }

    // Sun
    renderSun(ctx, w, h);
    renderGodRays(ctx, w, h);

    // Composite dynamic lights on offscreen canvas
    offscreenCtx.clearRect(0, 0, w, h);
    offscreenCtx.save();
    offscreenCtx.globalCompositeOperation = 'source-over';
    for (const l of lights) {
      if (!l) continue;
      switch (l.type) {
        case 'point':      renderPointLight(offscreenCtx, l, camX, camY); break;
        case 'spot':       renderSpotLight(offscreenCtx, l, camX, camY); break;
        case 'area':       renderAreaLight(offscreenCtx, l, camX, camY); break;
        case 'emissive':   renderPointLight(offscreenCtx, l, camX, camY); break;
      }
    }
    offscreenCtx.restore();

    // Blend light map into scene
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7;
    ctx.drawImage(offscreenCanvas, 0, 0);
    ctx.restore();
  }

  // ── Subsurface scattering approximation ───────────────────
  function renderSubsurface(ctx, x, y, w, h, lightX, lightY, scatterColor, thickness) {
    const dist = Math.hypot(lightX - x - w/2, lightY - y - h/2);
    const alpha = Math.max(0, 1 - dist / 300) * (thickness || 0.5);
    if (alpha < 0.01) return;
    const rgb = hexToRgb(scatterColor || '#ff9966');
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  if (starField.length === 0) initStarField();

  return {
    PointLight, SpotLight, DirectionalLight, AreaLight, EmissiveLight, AmbientLight,
    addLight, removeLight, clearLights,
    setDayTime, setMoonPhase,
    renderLighting, renderStars, renderMoon, renderSun, renderGodRays,
    renderLensFlare, renderSpecular, renderSubsurface, castShadow, applyBloom,
    getAmbientColor, updateFlicker,
    get dayTime() { return dayTime; },
    get lights() { return lights; },
    initStarField
  };
})();


// ============================================================
// MODULE 2: WEATHER_RENDERER_V2
// ============================================================
const WEATHER_RENDERER_V2 = (function() {
  'use strict';

  // ── Constants ───────────────────────────────────────────────
  const MAX_RAIN = 800;
  const MAX_SNOW = 600;
  const MAX_HAIL = 200;
  const MAX_PARTICLES = 500;
  const MAX_RIPPLES = 80;
  const MAX_LIGHTNING_SEGMENTS = 120;

  // ── State pools ─────────────────────────────────────────────
  const rainDrops = [];
  const snowFlakes = [];
  const hailDrops = [];
  const particles = []; // debris, leaves
  const ripples = [];
  const lightningBolts = [];
  const puddlePositions = [];

  let weatherType = 'none'; // 'rain'|'snow'|'hail'|'fog'|'sandstorm'|'clear'
  let windX = 0;
  let windY = 0;
  let intensity = 1.0;
  let fogDensity = 0;
  let lightningTimer = 0;
  let lightningInterval = 5000;
  let flashAlpha = 0;
  let wetGroundTimer = 0;
  let rainbowAlpha = 0;
  let thunderShake = 0;
  let snowAccum = {}; // key: Math.floor(x/20) -> height

  // ── Utility ─────────────────────────────────────────────────
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  // ── Rain drop pool init ──────────────────────────────────────
  function initRain(canvasW, canvasH) {
    rainDrops.length = 0;
    for (let i = 0; i < MAX_RAIN; i++) {
      rainDrops.push(makeRainDrop(canvasW, canvasH, true));
    }
  }

  function makeRainDrop(w, h, random) {
    return {
      x: random ? rand(0, w) : rand(-20, w + 20),
      y: random ? rand(-h, h) : -rand(5, 30),
      len: rand(10, 22),
      speed: rand(18, 32),
      opacity: rand(0.3, 0.7),
      width: rand(0.5, 1.5)
    };
  }

  function updateRain(dt, w, h) {
    const dtS = dt / 1000;
    const angle = Math.atan2(windX, -20) || 0.15;
    for (const d of rainDrops) {
      d.x += windX * dtS * 0.5;
      d.y += d.speed * dtS * 60;
      if (d.y > h + 30 || d.x < -50 || d.x > w + 50) {
        d.x = rand(0, w) + windX * 2;
        d.y = -30;
        d.len = rand(10, 22);
        d.speed = rand(18, 32);
        d.opacity = rand(0.3, 0.7);

        // Spawn ripple on ground (bottom ~25% of canvas)
        if (ripples.length < MAX_RIPPLES) {
          ripples.push({ x: d.x, y: h * rand(0.75, 0.9), r: 0, maxR: rand(8, 20), alpha: 0.6, speed: rand(30, 60) });
        }
      }
    }
  }

  function renderRain(ctx, w, h) {
    ctx.save();
    const windAngle = Math.atan2(windX * 0.4, 20);
    for (const d of rainDrops) {
      ctx.globalAlpha = d.opacity * intensity;
      ctx.strokeStyle = '#a0c8ff';
      ctx.lineWidth = d.width;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - Math.sin(windAngle) * d.len, d.y - Math.cos(windAngle) * d.len * (-1));
      ctx.lineTo(d.x + Math.sin(windAngle) * d.len * 0.05, d.y + Math.cos(windAngle) * d.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Snow flakes ──────────────────────────────────────────────
  function initSnow(w, h) {
    snowFlakes.length = 0;
    for (let i = 0; i < MAX_SNOW; i++) {
      snowFlakes.push(makeSnowFlake(w, h, true));
    }
  }

  function makeSnowFlake(w, h, random) {
    return {
      x: random ? rand(0, w) : rand(0, w),
      y: random ? rand(-h, h) : -10,
      r: rand(2, 6),
      speed: rand(1, 3.5),
      drift: rand(-0.5, 0.5),
      angle: rand(0, Math.PI * 2),
      angleSpeed: rand(-0.02, 0.02),
      opacity: rand(0.5, 0.9)
    };
  }

  function updateSnow(dt, w, h) {
    const dtS = dt / 1000;
    for (const f of snowFlakes) {
      f.x += (windX * 0.3 + f.drift) * dtS * 30;
      f.y += f.speed * dtS * 40;
      f.angle += f.angleSpeed;
      if (f.y > h + 10) {
        f.x = rand(0, w);
        f.y = -10;
        // accumulate snow on ground
        const key = Math.floor(f.x / 20);
        snowAccum[key] = Math.min(30, (snowAccum[key] || 0) + 0.02);
      }
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;
    }
  }

  function renderSnowFlake(ctx, f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.strokeStyle = '#e8f4ff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = f.opacity;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * f.r, Math.sin(a) * f.r);
      // side branches
      const bx = Math.cos(a) * f.r * 0.5;
      const by = Math.sin(a) * f.r * 0.5;
      const ba1 = a + Math.PI / 3;
      const ba2 = a - Math.PI / 3;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba1) * f.r * 0.3, by + Math.sin(ba1) * f.r * 0.3);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(ba2) * f.r * 0.3, by + Math.sin(ba2) * f.r * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderSnow(ctx) {
    for (const f of snowFlakes) renderSnowFlake(ctx, f);
  }

  function renderSnowAccumulation(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(240,248,255,0.85)';
    for (const key of Object.keys(snowAccum)) {
      const x = parseInt(key) * 20;
      const snowH = snowAccum[key];
      ctx.beginPath();
      ctx.ellipse(x + 10, h - 2, 12, snowH, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Hail ─────────────────────────────────────────────────────
  function initHail(w, h) {
    hailDrops.length = 0;
    for (let i = 0; i < MAX_HAIL; i++) {
      hailDrops.push(makeHailDrop(w, h, true));
    }
  }

  function makeHailDrop(w, h, random) {
    return {
      x: random ? rand(0, w) : rand(0, w),
      y: random ? rand(-h, 0) : -10,
      r: rand(2, 5),
      speed: rand(25, 45),
      bouncing: false,
      bounceVY: 0,
      bounceCount: 0
    };
  }

  function updateHail(dt, w, h) {
    const dtS = dt / 1000;
    for (const d of hailDrops) {
      if (d.bouncing) {
        d.y += d.bounceVY * dtS * 60;
        d.bounceVY += 0.8 * dtS * 60;
        d.x += windX * 0.2 * dtS * 30;
        if (d.y > h - 5) {
          d.bounceCount++;
          if (d.bounceCount > 2) {
            Object.assign(d, makeHailDrop(w, h, false));
            d.bouncing = false;
          } else {
            d.bounceVY = -d.bounceVY * 0.5;
          }
        }
      } else {
        d.x += windX * 0.3 * dtS * 30;
        d.y += d.speed * dtS * 60;
        if (d.y > h - 5) {
          d.bouncing = true;
          d.bounceVY = -d.speed * 0.3;
          d.bounceCount = 0;
        }
      }
      if (d.x < -10 || d.x > w + 10) {
        Object.assign(d, makeHailDrop(w, h, false));
      }
    }
  }

  function renderHail(ctx) {
    ctx.save();
    for (const d of hailDrops) {
      ctx.globalAlpha = 0.8 * intensity;
      ctx.fillStyle = '#d0e8ff';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a0c0e0';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Fog layer ─────────────────────────────────────────────────
  function renderFog(ctx, w, h, now) {
    if (fogDensity < 0.01) return;
    ctx.save();
    // Multiple fog layers with different speeds
    for (let layer = 0; layer < 3; layer++) {
      const speed = 0.00005 * (layer + 1);
      const offset = ((now * speed) % 1) * w;
      const fogAlpha = fogDensity * (0.2 + layer * 0.1);
      const fogY = h * (0.3 + layer * 0.15);
      const fogH = h * (0.25 + layer * 0.1);
      const grad = GradyanDeposu.lin(ctx, 0, fogY - fogH * 0.5, 0, fogY + fogH * 0.5, [0, `rgba(200,210,220,0)`, 0.4, `rgba(200,210,220,${fogAlpha})`, 0.6, `rgba(200,210,220,${fogAlpha})`, 1, `rgba(200,210,220,0)`]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      // Draw fog band with horizontal waves
      ctx.beginPath();
      ctx.moveTo(-offset, fogY - fogH * 0.5);
      for (let x = -offset; x < w * 2; x += 80) {
        const wave = Math.sin((x + now * 0.02) * 0.01) * 15;
        ctx.lineTo(x, fogY + wave);
      }
      ctx.lineTo(w * 2, fogY + fogH * 0.5);
      ctx.lineTo(-offset, fogY + fogH * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    // Dense ground fog
    const groundFog = GradyanDeposu.lin(ctx, 0, h * 0.7, 0, h, [0, `rgba(210,220,230,0)`, 1, `rgba(210,220,230,${fogDensity * 0.4})`]);
    ctx.fillStyle = groundFog;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
    ctx.restore();
  }

  // ── Sandstorm ─────────────────────────────────────────────────
  function renderSandstorm(ctx, w, h, now) {
    if (weatherType !== 'sandstorm') return;
    ctx.save();
    // Horizontal sand streaks
    for (let i = 0; i < 120; i++) {
      const seedX = (i * 137.5) % w;
      const seedY = (i * 47.3) % h;
      const speed = 0.15 + (i % 7) * 0.05;
      const x = ((seedX + now * speed * (1 + i % 3)) % (w + 200)) - 100;
      const len = 20 + (i % 40);
      const alpha = (0.1 + (i % 5) * 0.04) * intensity;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `rgb(${180 + (i%30)},${140 + (i%20)},${80 + (i%30)})`;
      ctx.lineWidth = 0.5 + (i % 3) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, seedY);
      ctx.lineTo(x + len, seedY + (i % 3) - 1);
      ctx.stroke();
    }
    // Visibility reduction overlay
    const visGrad = GradyanDeposu.lin(ctx, 0, 0, w, 0, [0, `rgba(180,140,80,${intensity * 0.25})`, 0.5, `rgba(180,140,80,${intensity * 0.15})`, 1, `rgba(180,140,80,${intensity * 0.25})`]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = visGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Lightning ─────────────────────────────────────────────────
  function generateLightningBolt(startX, startY, endX, endY, branchDepth) {
    const segments = [];
    function recurse(x1, y1, x2, y2, depth) {
      if (depth === 0) {
        segments.push({ x1, y1, x2, y2, depth: branchDepth });
        return;
      }
      const mx = (x1 + x2) * 0.5 + (Math.random() - 0.5) * 60 / depth;
      const my = (y1 + y2) * 0.5 + (Math.random() - 0.5) * 20 / depth;
      recurse(x1, y1, mx, my, depth - 1);
      recurse(mx, my, x2, y2, depth - 1);
      if (Math.random() < 0.35 && depth > 1) {
        const bx = mx + (Math.random() - 0.5) * 80;
        const by = my + Math.random() * 60;
        recurse(mx, my, bx, by, depth - 2);
      }
    }
    recurse(startX, startY, endX, endY, 5);
    return segments;
  }

  function updateLightning(dt, w, h) {
    lightningTimer -= dt;
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt / 200);
    if (thunderShake > 0) thunderShake = Math.max(0, thunderShake - dt / 500);
    if (lightningTimer <= 0 && (weatherType === 'rain' || weatherType === 'hail')) {
      if (Math.random() < 0.3) {
        const boltX = rand(0, w);
        const bolt = generateLightningBolt(boltX, 0, boltX + rand(-80, 80), h * rand(0.5, 0.9));
        lightningBolts.push({ segments: bolt, life: 180, maxLife: 180 });
        flashAlpha = 0.5 + Math.random() * 0.3;
        thunderShake = 0.8 + Math.random() * 0.5;
        rainbowAlpha = Math.max(rainbowAlpha, 0.3);
      }
      lightningTimer = rand(lightningInterval * 0.5, lightningInterval * 1.5);
    }
    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      lightningBolts[i].life -= dt;
      if (lightningBolts[i].life <= 0) lightningBolts.splice(i, 1);
    }
    if (rainbowAlpha > 0) rainbowAlpha = Math.max(0, rainbowAlpha - dt / 8000);
  }

  function renderLightning(ctx) {
    if (flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#e8f0ff';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
    for (const bolt of lightningBolts) {
      const alpha = bolt.life / bolt.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      for (const seg of bolt.segments) {
        const w = Math.max(0.5, 3 - seg.depth * 0.4);
        ctx.strokeStyle = '#c8d8ff';
        ctx.lineWidth = w * 2;
        ctx.shadowColor = '#80a0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = w * 0.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── Water ripples ─────────────────────────────────────────────
  function updateRipples(dt) {
    const dtS = dt / 1000;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += r.speed * dtS;
      r.alpha -= 0.8 * dtS;
      if (r.alpha <= 0 || r.r >= r.maxR) ripples.splice(i, 1);
    }
  }

  function renderRipples(ctx) {
    ctx.save();
    for (const r of ripples) {
      ctx.globalAlpha = r.alpha * intensity;
      ctx.strokeStyle = 'rgba(150,200,255,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r, r.r * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Wet ground sheen ──────────────────────────────────────────
  function renderWetGround(ctx, w, h, now) {
    if (wetGroundTimer < 0.01) return;
    ctx.save();
    const y = h * 0.75;
    const shimmer = Math.sin(now * 0.003) * 5;
    const grad = ctx.createLinearGradient(0, y + shimmer, 0, h);
    grad.addColorStop(0, `rgba(100,130,180,${wetGroundTimer * 0.12})`);
    grad.addColorStop(0.5, `rgba(120,150,200,${wetGroundTimer * 0.18})`);
    grad.addColorStop(1, `rgba(80,110,160,${wetGroundTimer * 0.08})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y + shimmer, w, h - y);
    ctx.restore();
  }

  // ── Puddle reflections ────────────────────────────────────────
  function renderPuddles(ctx, w, h, camX) {
    if (puddlePositions.length === 0) return;
    ctx.save();
    for (const p of puddlePositions) {
      const px = p.x - camX;
      if (px < -100 || px > w + 100) continue;
      ctx.globalAlpha = p.alpha * wetGroundTimer;
      const grad = GradyanDeposu.rad(ctx, px, p.y, 0, px, p.y, p.r, [0, 'rgba(180,210,240,0.4)', 0.6, 'rgba(140,180,220,0.2)', 1, 'rgba(100,150,200,0)']);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(px, p.y, p.r, p.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Wind debris ───────────────────────────────────────────────
  function initDebris(w, h) {
    particles.length = 0;
    const types = ['leaf', 'paper', 'tumbleweed'];
    for (let i = 0; i < 30; i++) {
      particles.push({
        type: types[i % types.length],
        x: rand(0, w),
        y: rand(h * 0.3, h * 0.85),
        vx: rand(1, 4) * Math.sign(windX || 1),
        vy: rand(-0.5, 0.5),
        angle: rand(0, Math.PI * 2),
        angleSpeed: rand(-0.08, 0.08),
        r: rand(4, 10),
        alpha: rand(0.4, 0.8)
      });
    }
  }

  function updateDebris(dt, w, h) {
    const dtS = dt / 1000;
    for (const p of particles) {
      p.x += (windX * 0.5 + p.vx) * dtS * 40;
      p.y += p.vy * dtS * 40;
      p.angle += p.angleSpeed;
      if (p.x > w + 50) p.x = -50;
      if (p.x < -50) p.x = w + 50;
      if (p.y > h * 0.95) p.vy -= 0.3;
      if (p.y < h * 0.2) p.vy += 0.3;
    }
  }

  function renderDebris(ctx) {
    ctx.save();
    for (const p of particles) {
      ctx.globalAlpha = p.alpha * intensity;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      switch (p.type) {
        case 'leaf':
          ctx.fillStyle = '#5a8a30';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.r * 1.5, p.r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#3a6a10';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-p.r * 1.4, 0);
          ctx.lineTo(p.r * 1.4, 0);
          ctx.stroke();
          break;
        case 'paper':
          ctx.fillStyle = 'rgba(240,235,220,0.8)';
          ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
          ctx.strokeStyle = 'rgba(180,170,150,0.5)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4);
          break;
        case 'tumbleweed':
          ctx.strokeStyle = '#8B6914';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, p.r, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * p.r, Math.sin(a) * p.r);
            ctx.stroke();
          }
          break;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Rainbow ───────────────────────────────────────────────────
  function renderRainbow(ctx, w, h) {
    if (rainbowAlpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = rainbowAlpha * 0.5;
    const cx = w * 0.5;
    const cy = h * 1.1;
    const colors = ['#ff0000','#ff7700','#ffff00','#00aa00','#0000ff','#8800aa','#ee00ee'];
    for (let i = 0; i < colors.length; i++) {
      const r = h * 0.5 + i * 8;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Heat haze ─────────────────────────────────────────────────
  function applyHeatHaze(ctx, srcCanvas, w, h, now, strength) {
    if (strength < 0.01) return;
    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const tCtx = temp.getContext('2d');
    tCtx.drawImage(srcCanvas, 0, 0);
    ctx.save();
    for (let y = 0; y < h; y += 4) {
      const offset = Math.sin(y * 0.05 + now * 0.003) * strength * 8;
      ctx.drawImage(temp, 0, y, w, 4, offset, y, w, 4);
    }
    ctx.restore();
  }

  // ── Ice surface ───────────────────────────────────────────────
  function renderIceSurface(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const iceGrad = GradyanDeposu.lin(ctx, 0, h * 0.8, 0, h, [0, '#b0d8f0', 0.5, '#d0eeff', 1, '#a0c8e8']);
    ctx.fillStyle = iceGrad;
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    // Crack lines
    ctx.strokeStyle = 'rgba(180,220,240,0.6)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      const sx = rand(0, w);
      const sy = rand(h * 0.82, h);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      let cx2 = sx, cy2 = sy;
      for (let j = 0; j < 5; j++) {
        cx2 += rand(-30, 30);
        cy2 += rand(-5, 10);
        ctx.lineTo(cx2, cy2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Thunder screen shake data ─────────────────────────────────
  function getThunderShakeOffset() {
    if (thunderShake < 0.01) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * thunderShake * 8,
      y: (Math.random() - 0.5) * thunderShake * 4
    };
  }

  // ── Main update & render ──────────────────────────────────────
  function setWeather(type, opts) {
    weatherType = type;
    opts = opts || {};
    intensity = opts.intensity !== undefined ? opts.intensity : 1.0;
    windX = opts.windX || 0;
    windY = opts.windY || 0;
    fogDensity = opts.fogDensity || (type === 'fog' ? 0.7 : 0);
    lightningInterval = opts.lightningInterval || 5000;
    wetGroundTimer = (type === 'rain' || type === 'hail') ? 1.0 : 0;
  }

  function update(dt, w, h, now) {
    if (weatherType === 'rain') {
      if (rainDrops.length === 0) initRain(w, h);
      updateRain(dt, w, h);
      updateRipples(dt);
      updateLightning(dt, w, h);
      wetGroundTimer = Math.min(1, wetGroundTimer + dt / 5000);
    } else if (weatherType === 'snow') {
      if (snowFlakes.length === 0) initSnow(w, h);
      updateSnow(dt, w, h);
    } else if (weatherType === 'hail') {
      if (hailDrops.length === 0) initHail(w, h);
      updateHail(dt, w, h);
      updateRipples(dt);
      updateLightning(dt, w, h);
    } else if (weatherType === 'sandstorm') {
      if (particles.length === 0) initDebris(w, h);
    }
    if (particles.length > 0) updateDebris(dt, w, h);
    if (wetGroundTimer > 0 && weatherType === 'clear') {
      wetGroundTimer = Math.max(0, wetGroundTimer - dt / 10000);
    }
    if (rainbowAlpha > 0) rainbowAlpha = Math.max(0, rainbowAlpha - dt / 8000);
  }

  function render(ctx, w, h, camX, now) {
    switch (weatherType) {
      case 'rain':
        renderRain(ctx, w, h);
        renderRipples(ctx);
        renderWetGround(ctx, w, h, now);
        renderPuddles(ctx, w, h, camX);
        renderLightning(ctx);
        renderRainbow(ctx, w, h);
        break;
      case 'snow':
        renderSnow(ctx);
        renderSnowAccumulation(ctx, w, h);
        break;
      case 'hail':
        renderHail(ctx);
        renderRipples(ctx);
        renderWetGround(ctx, w, h, now);
        renderLightning(ctx);
        break;
      case 'fog':
        renderFog(ctx, w, h, now);
        break;
      case 'sandstorm':
        renderSandstorm(ctx, w, h, now);
        renderDebris(ctx);
        break;
    }
    if (fogDensity > 0.01 && weatherType !== 'sandstorm') renderFog(ctx, w, h, now);
    if (particles.length > 0 && weatherType === 'rain') renderDebris(ctx);
  }

  function addPuddle(x, y, r, alpha) {
    puddlePositions.push({ x, y, r: r || 30, alpha: alpha || 0.8 });
  }

  return {
    setWeather, update, render, addPuddle,
    getThunderShakeOffset, applyHeatHaze, renderIceSurface,
    renderFog, renderRainbow, renderLightning, renderWetGround,
    get thunderShake() { return thunderShake; },
    get flashAlpha() { return flashAlpha; },
    get weatherType() { return weatherType; },
    get wetGroundTimer() { return wetGroundTimer; },
    clearSnowAccum() { snowAccum = {}; }
  };
})();


// ============================================================
// MODULE 3: POST_PROCESSING
// ============================================================
const POST_PROCESSING = (function() {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  let traumaLevel = 0;
  let shakeOffsetX = 0;
  let shakeOffsetY = 0;
  let grainTime = 0;
  let grainCanvas = null;
  let grainCtx = null;
  let grainData = null;
  let compositeCanvas = null;
  let compositeCtx = null;

  const settings = {
    bloomEnabled: false,
    bloomThreshold: 0.7,
    bloomBlur: 4,
    bloomIntensity: 0.4,
    chromaticAberration: 0,
    vignette: 0.5,
    vignetteColor: '#000000',
    motionBlur: 0,
    speedLines: false,
    speedLineCount: 40,
    speedLineIntensity: 0.5,
    colorGrade: null,
    filmGrain: 0,
    scanlines: false,
    scanlinesAlpha: 0.15,
    pixelSize: 1,
    depthOfField: false,
    underwater: false,
    underwaterStrength: 0.5,
    nightVision: false,
    thermalVision: false,
    slowMoBlend: 0
  };

  // ── Noise / perlin ───────────────────────────────────────────
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }

  const permTable = new Uint8Array(512);
  (function() {
    for (let i = 0; i < 256; i++) permTable[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [permTable[i], permTable[j]] = [permTable[j], permTable[i]];
    }
    for (let i = 0; i < 256; i++) permTable[256 + i] = permTable[i];
  })();

  function grad2(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return (h & 1 ? -u : u) + (h & 2 ? -v : v);
  }

  function perlinNoise2D(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = permTable[permTable[xi] + yi];
    const ab = permTable[permTable[xi] + yi + 1];
    const ba = permTable[permTable[xi + 1] + yi];
    const bb = permTable[permTable[xi + 1] + yi + 1];
    return lerp(
      lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
      lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u),
      v
    );
  }

  // ── Screen shake ─────────────────────────────────────────────
  function addTrauma(amount) { traumaLevel = Math.min(1, traumaLevel + amount); }

  function updateShake(dt) {
    traumaLevel = Math.max(0, traumaLevel - dt * 0.001 * 1.5);
    if (traumaLevel > 0) {
      const shake = traumaLevel * traumaLevel;
      const t = Date.now() * 0.01;
      shakeOffsetX = perlinNoise2D(t, 0) * shake * 20;
      shakeOffsetY = perlinNoise2D(0, t) * shake * 10;
    } else {
      shakeOffsetX = 0;
      shakeOffsetY = 0;
    }
  }

  function getShakeOffset() { return { x: shakeOffsetX, y: shakeOffsetY }; }

  // ── Vignette ──────────────────────────────────────────────────
  function renderVignette(ctx, w, h, strength, color) {
    if (!strength || strength < 0.01) return;
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;
    const r1 = Math.min(w, h) * 0.35;
    const r2 = Math.max(w, h) * 0.85;
    const grad = GradyanDeposu.rad(ctx, cx, cy, r1, cx, cy, r2, [0, 'rgba(0,0,0,0)', 0.6, `rgba(0,0,0,${strength * 0.3})`, 1, `rgba(0,0,0,${strength * 0.85})`]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Chromatic aberration ──────────────────────────────────────
  function applyChromatic(ctx, src, w, h, strength) {
    if (!strength || strength < 0.5) return;
    const off = Math.floor(strength);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.6;
    // Red channel shift
    ctx.drawImage(src, off, 0, w, h);
    // Blue channel shift
    ctx.drawImage(src, -off, 0, w, h);
    ctx.restore();
  }

  // ── Film grain ────────────────────────────────────────────────
  function ensureGrainCanvas(w, h) {
    if (!grainCanvas || grainCanvas.width !== w || grainCanvas.height !== h) {
      grainCanvas = document.createElement('canvas');
      grainCanvas.width = w;
      grainCanvas.height = h;
      grainCtx = grainCanvas.getContext('2d');
    }
  }

  function renderFilmGrain(ctx, w, h, strength, now) {
    if (!strength || strength < 0.01) return;
    ensureGrainCanvas(w, h);
    const imgData = grainCtx.createImageData(w, h);
    const data = imgData.data;
    const t = Math.floor(now / 40);
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * strength;
      data[i] = data[i+1] = data[i+2] = 128 + n;
      data[i+3] = Math.abs(n) * 1.5;
    }
    grainCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = strength * 0.5;
    ctx.drawImage(grainCanvas, 0, 0);
    ctx.restore();
  }

  // ── Scanlines ─────────────────────────────────────────────────
  function renderScanlines(ctx, w, h, alpha) {
    if (!alpha || alpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }

  // ── Speed lines ───────────────────────────────────────────────
  function renderSpeedLines(ctx, w, h, speed, centerX, centerY) {
    if (!speed || speed < 0.01) return;
    const cx = centerX !== undefined ? centerX : w / 2;
    const cy = centerY !== undefined ? centerY : h / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, speed) * settings.speedLineIntensity;
    for (let i = 0; i < settings.speedLineCount; i++) {
      const angle = (i / settings.speedLineCount) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const startR = 40 + Math.random() * 60;
      const endR = startR + 100 + Math.random() * 200 * speed;
      const lineAlpha = 0.3 + Math.random() * 0.4;
      ctx.strokeStyle = `rgba(255,255,255,${lineAlpha})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + cos * startR, cy + sin * startR);
      ctx.lineTo(cx + cos * endR, cy + sin * endR);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Motion blur ───────────────────────────────────────────────
  function applyMotionBlur(ctx, prevFrame, w, h, strength) {
    if (!prevFrame || !strength || strength < 0.01) return;
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.drawImage(prevFrame, 0, 0, w, h);
    ctx.restore();
  }

  // ── Pixelation ────────────────────────────────────────────────
  function applyPixelation(ctx, src, w, h, pixelSize) {
    if (!pixelSize || pixelSize <= 1) return;
    const pw = Math.floor(w / pixelSize);
    const ph = Math.floor(h / pixelSize);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, pw, ph);
    ctx.drawImage(ctx.canvas, 0, 0, pw, ph, 0, 0, w, h);
    ctx.restore();
  }

  // ── Color grading ─────────────────────────────────────────────
  function applyColorGrade(ctx, w, h, opts) {
    if (!opts) return;
    const { brightness, contrast, saturation, hue, tint } = opts;
    ctx.save();
    if (tint) {
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = (opts.tintStrength || 0.2);
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
    }
    if (brightness && brightness !== 1) {
      ctx.globalCompositeOperation = brightness > 1 ? 'screen' : 'multiply';
      ctx.globalAlpha = Math.abs(brightness - 1) * 0.5;
      ctx.fillStyle = brightness > 1 ? `rgba(255,255,255,1)` : `rgba(0,0,0,1)`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // ── Night vision mode ─────────────────────────────────────────
  function renderNightVision(ctx, w, h, now) {
    // Green tint overlay
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#00ff44';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // Scanlines
    renderScanlines(ctx, w, h, 0.25);
    // Noise
    renderFilmGrain(ctx, w, h, 0.3, now);
    // Vignette
    renderVignette(ctx, w, h, 0.7);
  }

  // ── Thermal vision ────────────────────────────────────────────
  function renderThermalVision(ctx, src, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114) / 255;
      // Map luminance to thermal color: black->blue->cyan->green->yellow->red->white
      let r, g, b;
      if (lum < 0.25) {
        r = 0; g = 0; b = Math.floor(lum / 0.25 * 255);
      } else if (lum < 0.5) {
        const t = (lum - 0.25) / 0.25;
        r = 0; g = Math.floor(t * 255); b = Math.floor((1-t) * 255);
      } else if (lum < 0.75) {
        const t = (lum - 0.5) / 0.25;
        r = Math.floor(t * 255); g = 255; b = 0;
      } else {
        const t = (lum - 0.75) / 0.25;
        r = 255; g = Math.floor((1-t) * 255); b = 0;
      }
      data[i] = r; data[i+1] = g; data[i+2] = b;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // ── Underwater distortion ─────────────────────────────────────
  function renderUnderwaterOverlay(ctx, w, h, now, strength) {
    if (!strength || strength < 0.01) return;
    ctx.save();
    // Blue-green tint
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = strength * 0.4;
    const grad = GradyanDeposu.lin(ctx, 0, 0, 0, h, [0, '#004488', 1, '#002244']);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // Caustic ripple lines
    ctx.save();
    ctx.globalAlpha = strength * 0.08;
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 10) {
        ctx.lineTo(x, y + Math.sin((x * 0.02) + (now * 0.002)) * 6 * strength);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Depth of field ────────────────────────────────────────────
  function applyDepthOfField(ctx, src, w, h, focalY, blurStrength) {
    if (!blurStrength || blurStrength < 0.01) return;
    ctx.save();
    // Blur elements above focal plane
    const blurAmount = Math.floor(blurStrength * 5);
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(src, 0, 0, w, focalY);
    ctx.filter = 'none';
    ctx.restore();
  }

  // ── Slow motion frame blend ───────────────────────────────────
  function applySlowMoBlend(ctx, prevFrames, w, h, blend) {
    if (!prevFrames || !prevFrames.length || !blend) return;
    ctx.save();
    const alpha = blend / prevFrames.length;
    for (const frame of prevFrames) {
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(frame, 0, 0, w, h);
    }
    ctx.restore();
  }

  // ── Bloom ─────────────────────────────────────────────────────
  function applyBloom(ctx, src, w, h, threshold, blurR, intensity) {
    if (!intensity || intensity < 0.01) return;
    // Use smaller canvas for blur performance
    const bw = Math.floor(w / 3);
    const bh = Math.floor(h / 3);
    if (!compositeCanvas || compositeCanvas.width !== bw || compositeCanvas.height !== bh) {
      compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = bw;
      compositeCanvas.height = bh;
      compositeCtx = compositeCanvas.getContext('2d');
    }
    compositeCtx.clearRect(0, 0, bw, bh);
    compositeCtx.filter = `blur(${Math.round(blurR)}px)`;
    compositeCtx.drawImage(src, 0, 0, bw, bh);
    compositeCtx.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = intensity;
    ctx.drawImage(compositeCanvas, 0, 0, w, h);
    ctx.restore();
  }

  // ── Main apply pipeline ───────────────────────────────────────
  function apply(ctx, src, w, h, opts, now) {
    const o = Object.assign({}, settings, opts || {});
    updateShake(16);

    if (o.bloomEnabled) applyBloom(ctx, src, w, h, o.bloomThreshold, o.bloomBlur, o.bloomIntensity);
    if (o.colorGrade) applyColorGrade(ctx, w, h, o.colorGrade);
    if (o.vignette > 0) renderVignette(ctx, w, h, o.vignette, o.vignetteColor);
    if (o.chromaticAberration > 0) applyChromatic(ctx, src, w, h, o.chromaticAberration);
    if (o.scanlines) renderScanlines(ctx, w, h, o.scanlinesAlpha);
    if (o.filmGrain > 0) renderFilmGrain(ctx, w, h, o.filmGrain, now || 0);
    if (o.nightVision) renderNightVision(ctx, w, h, now || 0);
    if (o.underwater) renderUnderwaterOverlay(ctx, w, h, now || 0, o.underwaterStrength);
  }

  return {
    apply,
    addTrauma, updateShake, getShakeOffset,
    renderVignette, renderScanlines, renderSpeedLines, renderFilmGrain,
    applyBloom, applyMotionBlur, applyPixelation, applyColorGrade,
    applyChromatic, applyDepthOfField, applySlowMoBlend,
    renderNightVision, renderThermalVision, renderUnderwaterOverlay,
    settings,
    get trauma() { return traumaLevel; }
  };
})();


// ============================================================
// MODULE 4: VEHICLE_RENDERER_EXTENDED
// ============================================================
const VEHICLE_RENDERER_EXTENDED = (function() {
  'use strict';

  const MAX_DECALS = 40;
  const MAX_EXHAUST = 80;
  const MAX_DUST = 120;
  const MAX_NITRO = 60;

  const decals = [];
  const exhaustParticles = [];
  const dustParticles = [];
  const nitroParticles = [];

  let dirtLevel = 0;
  let driverState = 'idle';
  let brakeLightAlpha = 0;
  let headlightOn = false;

  function rand(min, max) { return min + Math.random() * (max - min); }

  // ── Decals ─────────────────────────────────────────────────
  function addDecal(x, y, angle, type, scale) {
    if (decals.length >= MAX_DECALS) decals.shift();
    decals.push({ x, y, angle: angle || 0, type: type || 'scratch', scale: scale || 1, alpha: 0.8, age: 0 });
  }

  function updateDecals(dt) {
    for (const d of decals) {
      d.age += dt;
      if (d.age > 15000) d.alpha = Math.max(0, 0.8 - (d.age - 15000) / 5000);
    }
  }

  function renderDecal(ctx, decal) {
    ctx.save();
    ctx.translate(decal.x, decal.y);
    ctx.rotate(decal.angle);
    ctx.globalAlpha = decal.alpha;
    const s = decal.scale;
    switch (decal.type) {
      case 'scratch':
        ctx.strokeStyle = 'rgba(80,40,20,0.7)';
        ctx.lineWidth = 1.5 * s;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-12 * s + i * 5 * s, -3 * s);
          ctx.lineTo(-6 * s + i * 5 * s, 3 * s);
          ctx.stroke();
        }
        break;
      case 'mud':
        ctx.fillStyle = 'rgba(70,45,20,0.6)';
        for (let i = 0; i < 5; i++) {
          const mx = rand(-10, 10) * s;
          const my = rand(-8, 8) * s;
          const mr = rand(2, 6) * s;
          ctx.beginPath();
          ctx.arc(mx, my, mr, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'dent':
        ctx.strokeStyle = 'rgba(60,60,60,0.5)';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(40,40,40,0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 5 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'burn':
        const burnGrad = GradyanDeposu.rad(ctx, 0, 0, 0, 0, 0, 12 * s, [0, 'rgba(20,15,10,0.7)', 1, 'rgba(40,30,20,0)']);
        ctx.fillStyle = burnGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  function renderAllDecals(ctx) {
    for (const d of decals) renderDecal(ctx, d);
  }

  // ── Dirt overlay ───────────────────────────────────────────
  function renderDirtOverlay(ctx, x, y, w, h, level) {
    if (level < 0.01) return;
    ctx.save();
    ctx.globalAlpha = level * 0.45;
    ctx.fillStyle = 'rgba(90,60,30,0.6)';
    for (let i = 0; i < Math.floor(level * 18); i++) {
      const dx = x + rand(0, w);
      const dy = y + rand(h * 0.3, h);
      const dr = rand(1, 5);
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = level * 0.18;
    ctx.fillStyle = 'rgba(100,70,30,1)';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // ── Mud splat ──────────────────────────────────────────────
  function renderMudSplat(ctx, cx, cy, size) {
    ctx.save();
    ctx.fillStyle = 'rgba(65,40,15,0.65)';
    const blobCount = 6 + Math.floor(size / 4);
    for (let i = 0; i < blobCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * size;
      const r = size * 0.2 + Math.random() * size * 0.4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Dust ───────────────────────────────────────────────────
  function spawnDust(x, y, wheelRadius, speed) {
    const count = Math.floor(Math.abs(speed) * 0.5);
    for (let i = 0; i < count && dustParticles.length < MAX_DUST; i++) {
      dustParticles.push({
        x: x + rand(-wheelRadius, wheelRadius),
        y: y,
        vx: rand(-2, -0.5) * Math.sign(speed || 1),
        vy: rand(-2, -0.5),
        life: rand(300, 800),
        maxLife: 600,
        r: rand(2, 6),
        alpha: rand(0.3, 0.6),
        gray: 150 + Math.floor(rand(0, 50))
      });
    }
  }

  function updateDust(dt) {
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.r += dt * 0.003;
      p.life -= dt;
      p.alpha = (p.life / p.maxLife) * 0.5;
      if (p.life <= 0) dustParticles.splice(i, 1);
    }
  }

  function renderDust(ctx) {
    ctx.save();
    for (const p of dustParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgba(${p.gray},${p.gray - 20},${p.gray - 40},1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Exhaust smoke ──────────────────────────────────────────
  function spawnExhaust(x, y, throttle) {
    if (exhaustParticles.length >= MAX_EXHAUST) return;
    const count = Math.max(1, Math.floor(throttle * 3));
    for (let i = 0; i < count; i++) {
      exhaustParticles.push({
        x: x + rand(-3, 3),
        y: y + rand(-3, 3),
        vx: rand(-0.8, -0.2),
        vy: rand(-1.5, -0.5),
        r: rand(4, 8),
        life: rand(500, 1200),
        maxLife: 1000,
        alpha: 0.4 + throttle * 0.3,
        gray: Math.floor(rand(100, 180))
      });
    }
  }

  function updateExhaust(dt) {
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
      const p = exhaustParticles[i];
      p.x += p.vx * dt * 0.05;
      p.y += p.vy * dt * 0.05;
      p.r += dt * 0.005;
      p.life -= dt;
      p.alpha = (p.life / p.maxLife) * 0.35;
      if (p.life <= 0) exhaustParticles.splice(i, 1);
    }
  }

  function renderExhaust(ctx) {
    ctx.save();
    for (const p of exhaustParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `rgba(${p.gray},${p.gray},${p.gray},1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Engine heat shimmer ────────────────────────────────────
  function renderEngineHeat(ctx, hoodX, hoodY, hoodW, throttle, now) {
    if (throttle < 0.3) return;
    ctx.save();
    ctx.globalAlpha = throttle * 0.18;
    for (let i = 0; i < 5; i++) {
      const waveX = hoodX + (i / 4) * hoodW;
      ctx.strokeStyle = 'rgba(255,220,180,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(waveX, hoodY);
      for (let y = hoodY; y > hoodY - 40 * throttle; y -= 4) {
        ctx.lineTo(waveX + Math.sin((y * 0.15) + now * 0.005 + i) * 3 * throttle, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Headlights ─────────────────────────────────────────────
  function renderHeadlights(ctx, x, y, angle, range, color) {
    if (!headlightOn) return;
    const col = color || '#ffffcc';
    let r = 255, g = 255, b = 200;
    if (col.startsWith('#') && col.length === 7) {
      r = parseInt(col.slice(1,3),16);
      g = parseInt(col.slice(3,5),16);
      b = parseInt(col.slice(5,7),16);
    }
    const rng = range || 200;
    const spread = 0.45;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rng);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.3)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, rng, angle - spread, angle + spread);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Brake lights ───────────────────────────────────────────
  function renderBrakeLights(ctx, x, y, alpha) {
    if (alpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 30);
    grad.addColorStop(0, 'rgba(255,20,20,0.9)');
    grad.addColorStop(0.4, 'rgba(220,10,10,0.4)');
    grad.addColorStop(1, 'rgba(180,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Nitro burst ────────────────────────────────────────────
  function spawnNitro(x, y, angle) {
    for (let i = 0; i < 8 && nitroParticles.length < MAX_NITRO; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = rand(3, 8);
      nitroParticles.push({
        x: x + rand(-3, 3),
        y: y + rand(-3, 3),
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        r: rand(3, 8),
        life: rand(150, 350),
        maxLife: 300,
        hue: rand(180, 260)
      });
    }
  }

  function updateNitro(dt) {
    for (let i = nitroParticles.length - 1; i >= 0; i--) {
      const p = nitroParticles[i];
      p.x += p.vx * dt * 0.1;
      p.y += p.vy * dt * 0.1;
      p.r *= 0.98;
      p.life -= dt;
      if (p.life <= 0 || p.r < 0.5) nitroParticles.splice(i, 1);
    }
  }

  function renderNitro(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of nitroParticles) {
      const alpha = p.life / p.maxLife;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `hsla(${p.hue},100%,80%,${alpha})`);
      grad.addColorStop(0.5, `hsla(${p.hue + 30},100%,60%,${alpha * 0.5})`);
      grad.addColorStop(1, `hsla(${p.hue + 60},100%,40%,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Vehicle shadow ─────────────────────────────────────────
  function renderVehicleShadow(ctx, x, groundY, w, heightAbove) {
    const shadowScale = Math.max(0.3, 1 - heightAbove / 200);
    const shadowAlpha = Math.max(0.05, 0.4 * shadowScale);
    const shadowW = w * shadowScale * 0.85;
    const shadowH = 8 * shadowScale;
    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    const shadowGrad = GradyanDeposu.rad(ctx, x, groundY, 0, x, groundY, shadowW, [0, 'rgba(0,0,0,0.8)', 0.6, 'rgba(0,0,0,0.4)', 1, 'rgba(0,0,0,0)']);
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(x, groundY, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Suspension spring ──────────────────────────────────────
  function renderSuspension(ctx, wx, wy, bodyX, bodyY, compression, color) {
    const springLen = 20 - compression * 8;
    const coils = 5;
    ctx.save();
    ctx.strokeStyle = color || '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    for (let i = 0; i <= coils * 2; i++) {
      const t = i / (coils * 2);
      const coilX = wx + Math.sin(t * Math.PI * 2 * coils) * 4;
      const coilY = wy - t * springLen;
      if (i === 0) ctx.moveTo(coilX, coilY);
      else ctx.lineTo(coilX, coilY);
    }
    ctx.lineTo(bodyX, bodyY);
    ctx.stroke();
    ctx.restore();
  }

  // ── Wheel blur ─────────────────────────────────────────────
  function renderWheelSpinBlur(ctx, cx, cy, radius, rpm) {
    if (rpm < 100) return;
    const blurAlpha = Math.min(0.6, rpm / 2000);
    ctx.save();
    ctx.globalAlpha = blurAlpha;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const grad = GradyanDeposu.rad(ctx, cx, cy, 0, cx, cy, radius, [0, 'rgba(60,60,60,0)', 0.7, 'rgba(60,60,60,0.2)', 1, 'rgba(40,40,40,0.4)']);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, a, a + Math.PI / 3);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Body flex ──────────────────────────────────────────────
  function getBodyFlexTransform(bumpImpact, now) {
    if (bumpImpact < 0.01) return { scaleX: 1, scaleY: 1, skewX: 0 };
    const decay = Math.max(0, 1 - (now % 1000) / 1000);
    const oscillate = Math.sin(now * 0.04) * decay * bumpImpact;
    return {
      scaleX: 1 + oscillate * 0.02,
      scaleY: 1 - oscillate * 0.015,
      skewX: oscillate * 0.01
    };
  }

  // ── Paint reflections ──────────────────────────────────────
  function renderPaintReflection(ctx, x, y, w, h, lightAngle) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const n = lightAngle !== undefined ? lightAngle : -Math.PI / 4;
    const cos = Math.cos(n);
    const sin = Math.sin(n);
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      const lx = x + w * t;
      ctx.beginPath();
      ctx.moveTo(lx - cos * h, y + sin * h * 0.3);
      ctx.lineTo(lx + cos * h * 0.2, y - sin * h * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Driver character ───────────────────────────────────────
  function renderDriver(ctx, x, y, state, now) {
    ctx.save();
    ctx.translate(x, y);
    const head = () => {
      ctx.fillStyle = '#e8c090';
      ctx.beginPath();
      ctx.arc(0, -20, 8, 0, Math.PI * 2);
      ctx.fill();
    };
    const body = (rot) => {
      ctx.fillStyle = '#3060a0';
      ctx.save();
      if (rot) ctx.rotate(rot);
      ctx.fillRect(-8, -15, 16, 18);
      ctx.restore();
    };
    switch (state) {
      case 'idle':
        head();
        body(0);
        ctx.strokeStyle = '#e8c090';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.lineTo(-12, -5);
        ctx.moveTo(6, -10);
        ctx.lineTo(12, -5);
        ctx.stroke();
        break;
      case 'lean':
        ctx.translate(3, -2);
        head();
        body(0.2);
        break;
      case 'handsup':
        head();
        body(0);
        ctx.strokeStyle = '#e8c090';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const waveT = Math.sin(now * 0.006) * 3;
        ctx.moveTo(-6, -12);
        ctx.lineTo(-14, -28 + waveT);
        ctx.moveTo(6, -12);
        ctx.lineTo(14, -28 + waveT);
        ctx.stroke();
        break;
      case 'crash':
        ctx.save();
        ctx.rotate(0.8);
        head();
        body(0);
        ctx.restore();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + now * 0.005;
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 15, -25 + Math.sin(a) * 8, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  }

  function update(dt) {
    updateDecals(dt);
    updateDust(dt);
    updateExhaust(dt);
    updateNitro(dt);
    if (brakeLightAlpha > 0) brakeLightAlpha = Math.max(0, brakeLightAlpha - dt / 200);
  }

  return {
    addDecal, renderAllDecals, renderDirtOverlay, renderMudSplat,
    spawnDust, renderDust,
    spawnExhaust, renderExhaust,
    renderEngineHeat,
    renderHeadlights, renderBrakeLights,
    spawnNitro, renderNitro,
    renderVehicleShadow, renderSuspension, renderWheelSpinBlur,
    getBodyFlexTransform, renderPaintReflection, renderDriver,
    update,
    set dirtLevel(v) { dirtLevel = Math.max(0, Math.min(1, v)); },
    get dirtLevel() { return dirtLevel; },
    set driverState(v) { driverState = v; },
    get driverState() { return driverState; },
    set headlightOn(v) { headlightOn = !!v; },
    get headlightOn() { return headlightOn; },
    set brakeLightAlpha(v) { brakeLightAlpha = Math.max(0, Math.min(1, v)); },
    get brakeLightAlpha() { return brakeLightAlpha; }
  };
})();

// ============================================================
// MODULE 5: BACKGROUND_RENDERER
// ============================================================
const BACKGROUND_RENDERER = (function() {
  'use strict';

  // ── Layer definitions ──────────────────────────────────────
  const LAYER_SPEEDS = [0.0, 0.05, 0.1, 0.18, 0.28, 0.42, 0.65, 1.0];
  const LAYER_NAMES = ['sky','far-mountain','near-mountain','trees','buildings','detail','foreground','terrain'];

  let clouds = [];
  let stars = [];
  let auroraPoints = [];
  let causticsTime = 0;
  let cityBuildings = [];
  let caveFeatures = [];
  let mapTheme = 'default'; // 'default'|'arctic'|'city'|'underwater'|'volcano'|'cave'|'alien'

  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  // ── Cloud generation ───────────────────────────────────────
  function generateCloud(w, h, index) {
    const x = rand(0, w * 2);
    const y = rand(h * 0.05, h * 0.35);
    const scale = rand(0.6, 1.8);
    const speed = rand(0.01, 0.04);
    const blobs = [];
    const blobCount = randInt(4, 9);
    for (let i = 0; i < blobCount; i++) {
      blobs.push({
        dx: rand(-50, 50) * scale,
        dy: rand(-15, 15) * scale,
        r: rand(20, 45) * scale
      });
    }
    return { x, y, scale, speed, blobs, alpha: rand(0.5, 0.9) };
  }

  function initClouds(w, h) {
    clouds = [];
    for (let i = 0; i < 12; i++) clouds.push(generateCloud(w, h, i));
  }

  function updateClouds(dt, w, h, windX) {
    const dtS = dt / 1000;
    for (const c of clouds) {
      c.x += (c.speed + windX * 0.008) * dtS * 60;
      if (c.x > w * 2.5) {
        c.x = -200;
        c.y = rand(h * 0.05, h * 0.35);
      }
      if (c.x < -300) c.x = w * 2.5;
    }
  }

  function renderCloud(ctx, cloud, camX) {
    const sx = cloud.x - camX * 0.05;
    ctx.save();
    ctx.globalAlpha = cloud.alpha;
    ctx.fillStyle = '#f0f4f8';
    for (const b of cloud.blobs) {
      ctx.beginPath();
      ctx.arc(sx + b.dx, cloud.y + b.dy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Inner highlight
    ctx.globalAlpha = cloud.alpha * 0.4;
    ctx.fillStyle = '#ffffff';
    if (cloud.blobs.length > 0) {
      const mb = cloud.blobs[Math.floor(cloud.blobs.length / 2)];
      ctx.beginPath();
      ctx.arc(sx + mb.dx, cloud.y + mb.dy - mb.r * 0.2, mb.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function renderClouds(ctx, camX) {
    for (const c of clouds) renderCloud(ctx, c, camX);
  }

  // ── Mountain silhouettes ───────────────────────────────────
  function renderMountainLayer(ctx, w, h, camX, layerIndex, color, amplitude, frequency) {
    const speed = LAYER_SPEEDS[layerIndex] || 0.1;
    const offsetX = camX * speed;
    const baseY = h * 0.7;
    ctx.save();
    ctx.fillStyle = color || '#334455';
    ctx.beginPath();
    ctx.moveTo(0, h);
    const step = 8;
    for (let x = -step; x <= w + step; x += step) {
      const wx = x + offsetX;
      const y = baseY
        - Math.sin(wx * (frequency || 0.003) * 1.0) * (amplitude || 80)
        - Math.sin(wx * (frequency || 0.003) * 2.3 + 1.2) * (amplitude || 80) * 0.4
        - Math.sin(wx * (frequency || 0.003) * 0.7 + 3.1) * (amplitude || 80) * 0.6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Tree silhouettes ───────────────────────────────────────
  function renderTrees(ctx, w, h, camX, color, density, scale) {
    const speed = LAYER_SPEEDS[3];
    const offsetX = camX * speed;
    ctx.save();
    ctx.fillStyle = color || '#1a3a1a';
    const spacing = 60 / (density || 1);
    const baseY = h * 0.72;
    const s = scale || 1;
    const startX = Math.floor(offsetX / spacing) * spacing;
    for (let wx = startX; wx < offsetX + w + spacing; wx += spacing) {
      const x = wx - offsetX;
      const treeH = (40 + Math.sin(wx * 0.1) * 15) * s;
      const treeW = (18 + Math.sin(wx * 0.07) * 5) * s;
      // Trunk
      ctx.fillRect(x - treeW * 0.1, baseY - treeH * 0.3, treeW * 0.2, treeH * 0.35);
      // Triangle canopy (3 layers)
      for (let layer = 0; layer < 3; layer++) {
        const ly = baseY - treeH * 0.3 - layer * treeH * 0.28;
        const lw = treeW * (1 - layer * 0.2);
        ctx.beginPath();
        ctx.moveTo(x, ly - treeH * 0.35);
        ctx.lineTo(x - lw * 0.5, ly);
        ctx.lineTo(x + lw * 0.5, ly);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Sky gradient ───────────────────────────────────────────
  function renderSkyGradient(ctx, w, h, topColor, bottomColor) {
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    grad.addColorStop(0, topColor || '#1a2a4a');
    grad.addColorStop(1, bottomColor || '#4a7a9a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h * 0.75);
  }

  // ── Aurora borealis ────────────────────────────────────────
  function renderAurora(ctx, w, h, now) {
    if (mapTheme !== 'arctic') return;
    ctx.save();
    const time = now * 0.0005;
    for (let i = 0; i < 4; i++) {
      const hue = 120 + i * 30 + Math.sin(time + i) * 20;
      const y = h * (0.2 + i * 0.05);
      ctx.globalAlpha = 0.12 + Math.sin(time * 1.3 + i * 2) * 0.06;
      ctx.strokeStyle = `hsl(${hue},80%,60%)`;
      ctx.lineWidth = 30 + Math.sin(time + i * 1.5) * 15;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 20) {
        const waveY = y + Math.sin((x * 0.008) + time + i) * 25
                        + Math.sin((x * 0.02) + time * 1.7) * 10;
        ctx.lineTo(x, waveY);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── City skyline ───────────────────────────────────────────
  function generateCityBuildings(w, h) {
    cityBuildings = [];
    const count = 25 + Math.floor(w / 40);
    let x = 0;
    for (let i = 0; i < count; i++) {
      const bw = rand(25, 60);
      const bh = rand(40, h * 0.45);
      const floors = Math.floor(bh / 12);
      cityBuildings.push({ x, y: h * 0.7 - bh, w: bw, h: bh, floors,
        color: `rgb(${30 + Math.floor(rand(0,20))},${35 + Math.floor(rand(0,20))},${50 + Math.floor(rand(0,30))})`,
        windowColor: `rgba(${200 + Math.floor(rand(0,55))},${180 + Math.floor(rand(0,40))},${100 + Math.floor(rand(0,60))},0.7)`,
        windowOn: Array.from({length: floors * 4}, () => Math.random() < 0.6)
      });
      x += bw + rand(2, 8);
    }
  }

  function renderCityBuildings(ctx, w, h, camX, layerSpeed) {
    if (cityBuildings.length === 0) generateCityBuildings(w, h);
    const speed = layerSpeed || LAYER_SPEEDS[4];
    const offsetX = camX * speed;
    ctx.save();
    for (const b of cityBuildings) {
      const bx = b.x - offsetX;
      if (bx > w + 100 || bx + b.w < -100) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, b.y, b.w, b.h);
      // Windows
      const winW = Math.max(3, b.w / 5 - 2);
      const winH = 6;
      for (let row = 0; row < b.floors && row * 12 < b.h - 10; row++) {
        for (let col = 0; col < 4; col++) {
          if (!b.windowOn[row * 4 + col]) continue;
          const wx = bx + col * (b.w / 4) + 2;
          const wy = b.y + row * 12 + 4;
          ctx.fillStyle = b.windowColor;
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }
    ctx.restore();
  }

  // ── Underwater caustics ────────────────────────────────────
  function renderUnderwaterCaustics(ctx, w, h, now) {
    if (mapTheme !== 'underwater') return;
    causticsTime = now * 0.001;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#80d4ff';
    ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 40) {
      for (let x = 0; x < w; x += 40) {
        const size = 8 + Math.sin(x * 0.05 + causticsTime) * 5 + Math.sin(y * 0.07 + causticsTime * 1.3) * 4;
        ctx.beginPath();
        ctx.arc(x + Math.sin(causticsTime + y * 0.1) * 5, y + Math.cos(causticsTime + x * 0.1) * 5, size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Lava glow ──────────────────────────────────────────────
  function renderLavaGlow(ctx, w, h, now) {
    if (mapTheme !== 'volcano') return;
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.002);
    const grad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    grad.addColorStop(0, `rgba(255,80,0,0)`);
    grad.addColorStop(0.5, `rgba(255,60,0,${0.15 + pulse * 0.1})`);
    grad.addColorStop(1, `rgba(220,30,0,${0.3 + pulse * 0.15})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.restore();
  }

  // ── Cave features ──────────────────────────────────────────
  function generateCaveFeatures(w, h) {
    caveFeatures = [];
    // Stalactites (ceiling)
    for (let i = 0; i < 20; i++) {
      const x = rand(0, w);
      const len = rand(20, 80);
      const baseW = rand(8, 20);
      caveFeatures.push({ type: 'stalactite', x, y: 0, len, baseW });
    }
    // Stalagmites (floor)
    for (let i = 0; i < 15; i++) {
      const x = rand(0, w);
      const len = rand(15, 60);
      const baseW = rand(6, 18);
      caveFeatures.push({ type: 'stalagmite', x, y: h, len, baseW });
    }
  }

  function renderCaveFeatures(ctx, w, h, camX) {
    if (mapTheme !== 'cave') return;
    if (caveFeatures.length === 0) generateCaveFeatures(w, h);
    const speed = LAYER_SPEEDS[2];
    const offsetX = camX * speed;
    ctx.save();
    ctx.fillStyle = '#2a2030';
    for (const f of caveFeatures) {
      const fx = f.x - offsetX;
      if (fx < -60 || fx > w + 60) continue;
      if (f.type === 'stalactite') {
        ctx.beginPath();
        ctx.moveTo(fx - f.baseW / 2, f.y);
        ctx.lineTo(fx + f.baseW / 2, f.y);
        ctx.lineTo(fx, f.y + f.len);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(fx - f.baseW / 2, f.y);
        ctx.lineTo(fx + f.baseW / 2, f.y);
        ctx.lineTo(fx, f.y - f.len);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Forest dappled light ───────────────────────────────────
  function renderForestLight(ctx, w, h, now) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffaa';
    for (let i = 0; i < 15; i++) {
      const x = ((i * 137 + now * 0.01) % (w + 100)) - 50;
      const y = h * 0.3 + Math.sin(now * 0.001 + i) * h * 0.15;
      const r = 15 + Math.sin(now * 0.002 + i * 2) * 8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Alien sky ──────────────────────────────────────────────
  function renderAlienSky(ctx, w, h, now) {
    if (mapTheme !== 'alien') return;
    const grad = GradyanDeposu.lin(ctx, 0, 0, 0, h * 0.7, [0, '#0d0020', 0.5, '#1a0035', 1, '#2a0060']);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h * 0.7);
    // Alien nebula blobs
    ctx.save();
    for (let i = 0; i < 4; i++) {
      const nx = w * (0.2 + i * 0.22);
      const ny = h * (0.1 + Math.sin(now * 0.0003 + i) * 0.08);
      const nr = 60 + i * 20;
      const hue = 270 + i * 40;
      const nebulaGrad = GradyanDeposu.rad(ctx, nx, ny, 0, nx, ny, nr, [0, `hsla(${hue},100%,50%,0.15)`, 1, `hsla(${hue},80%,30%,0)`]);
      ctx.fillStyle = nebulaGrad;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Main render ────────────────────────────────────────────
  function render(ctx, w, h, camX, now, options) {
    const opts = options || {};
    const windX = opts.windX || 0;

    switch (mapTheme) {
      case 'arctic':
        renderSkyGradient(ctx, w, h, '#0a1525', '#1a3550');
        renderAurora(ctx, w, h, now);
        break;
      case 'underwater':
        renderSkyGradient(ctx, w, h, '#001830', '#003060');
        renderUnderwaterCaustics(ctx, w, h, now);
        break;
      case 'volcano':
        renderSkyGradient(ctx, w, h, '#1a0a00', '#3a1000');
        renderLavaGlow(ctx, w, h, now);
        break;
      case 'cave':
        renderSkyGradient(ctx, w, h, '#0a0a0f', '#12101a');
        renderCaveFeatures(ctx, w, h, camX);
        break;
      case 'alien':
        renderAlienSky(ctx, w, h, now);
        break;
      case 'city':
        renderSkyGradient(ctx, w, h, '#0d1a2a', '#1a2e40');
        renderCityBuildings(ctx, w, h, camX);
        break;
      default:
        renderSkyGradient(ctx, w, h, '#1a3a6a', '#5588aa');
        renderMountainLayer(ctx, w, h, camX, 1, '#2a3a4a', 90, 0.002);
        renderMountainLayer(ctx, w, h, camX, 2, '#3a4a5a', 60, 0.004);
        renderTrees(ctx, w, h, camX, '#1a3010', 1, 1);
        renderClouds(ctx, camX);
    }
    if (opts.showForestLight) renderForestLight(ctx, w, h, now);
    updateClouds(16, w, h, windX);
  }

  function setMapTheme(theme, w, h) {
    mapTheme = theme;
    cityBuildings = [];
    caveFeatures = [];
    clouds = [];
    if (theme === 'default' || theme === 'city' || theme === 'arctic') {
      initClouds(w || 800, h || 450);
    }
  }

  if (clouds.length === 0) initClouds(800, 450);

  return {
    render, setMapTheme, initClouds, updateClouds, renderClouds,
    renderSkyGradient, renderMountainLayer, renderTrees,
    renderAurora, renderCityBuildings, renderUnderwaterCaustics,
    renderLavaGlow, renderCaveFeatures, renderForestLight, renderAlienSky,
    get mapTheme() { return mapTheme; }
  };
})();

// ============================================================
// MODULE 6: UI_EFFECTS_RENDERER
// ============================================================
const UI_EFFECTS_RENDERER = (function() {
  'use strict';

  // ── State pools ────────────────────────────────────────────
  const floaters = [];       // damage/XP numbers
  const confetti = [];       // victory confetti
  const coinBursts = [];     // coin collect bursts
  const popups = [];         // achievement popups
  const comboTexts = [];     // combo animations
  const banners = [];        // distance milestone banners
  const pulses = [];         // HUD highlight pulses
  let checkpointFlash = 0;   // 0..1
  let defeatFade = 0;        // 0..1
  let levelUpAlpha = 0;      // 0..1
  let levelUpScale = 0;

  const MAX_FLOATERS = 30;
  const MAX_CONFETTI = 120;
  const MAX_BURSTS = 12;

  function rand(min, max) { return min + Math.random() * (max - min); }

  // ── Coin burst ─────────────────────────────────────────────
  function spawnCoinBurst(x, y, count) {
    count = count || 8;
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
      const speed = rand(2, 5);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: rand(4, 8),
        alpha: 1,
        life: rand(400, 700),
        maxLife: 600
      });
    }
    if (coinBursts.length >= MAX_BURSTS) coinBursts.shift();
    coinBursts.push({ x, y, particles, life: 700, maxLife: 700 });
  }

  function updateCoinBursts(dt) {
    for (let i = coinBursts.length - 1; i >= 0; i--) {
      const burst = coinBursts[i];
      burst.life -= dt;
      for (const p of burst.particles) {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vy += 0.12 * dt * 0.06;
        p.alpha = Math.max(0, p.life / p.maxLife);
        p.life -= dt;
      }
      if (burst.life <= 0) coinBursts.splice(i, 1);
    }
  }

  function renderCoinBursts(ctx) {
    ctx.save();
    for (const burst of coinBursts) {
      for (const p of burst.particles) {
        if (p.alpha < 0.01) continue;
        ctx.globalAlpha = p.alpha;
        // Coin circle
        const coinGrad = GradyanDeposu.rad(ctx, p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r, [0, '#ffe060', 0.7, '#e8a800', 1, '#c07000']);
        ctx.fillStyle = coinGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // $ symbol
        ctx.globalAlpha = p.alpha * 0.8;
        ctx.fillStyle = '#fffbe0';
        ctx.font = `bold ${Math.round(p.r * 1.2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', p.x, p.y);
      }
    }
    ctx.restore();
  }

  // ── Damage / XP number floaters ───────────────────────────
  function spawnFloater(x, y, text, type) {
    if (floaters.length >= MAX_FLOATERS) floaters.shift();
    const isXP = type === 'xp';
    const isDamage = type === 'damage';
    floaters.push({
      x, y: y,
      startY: y,
      text: String(text),
      type: type || 'generic',
      alpha: 1,
      scale: 0.5,
      life: 1200,
      maxLife: 1200,
      color: isDamage ? '#ff3030' : (isXP ? '#50ff70' : '#ffd040'),
      vx: rand(-0.3, 0.3),
      vy: -1.5 - rand(0, 0.8)
    });
  }

  function updateFloaters(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.y += f.vy * dt * 0.05;
      f.x += f.vx * dt * 0.05;
      f.vy *= 0.995;
      const t = 1 - f.life / f.maxLife;
      f.scale = t < 0.1 ? t / 0.1 * 1.3 : (t < 0.2 ? 1.3 - (t - 0.1) / 0.1 * 0.3 : 1.0);
      f.alpha = f.life < 400 ? f.life / 400 : 1;
      if (f.life <= 0) floaters.splice(i, 1);
    }
  }

  function renderFloaters(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floaters) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.scale, f.scale);
      ctx.globalAlpha = f.alpha;
      const fontSize = f.type === 'damage' ? 22 : (f.type === 'xp' ? 18 : 20);
      ctx.font = `bold ${fontSize}px sans-serif`;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(f.text, 2, 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Level up fanfare ───────────────────────────────────────
  function triggerLevelUp() {
    levelUpAlpha = 1;
    levelUpScale = 0.3;
  }

  function updateLevelUp(dt) {
    if (levelUpAlpha <= 0) return;
    levelUpScale = Math.min(1.2, levelUpScale + dt * 0.006);
    if (levelUpScale > 1.0) levelUpScale = 1.0 + (levelUpScale - 1.0) * 0.95;
    levelUpAlpha = Math.max(0, levelUpAlpha - dt / 2000);
  }

  function renderLevelUp(ctx, w, h) {
    if (levelUpAlpha < 0.01) return;
    ctx.save();
    ctx.globalAlpha = levelUpAlpha;
    ctx.save();
    ctx.translate(w / 2, h / 2 - 40);
    ctx.scale(levelUpScale, levelUpScale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Glow
    ctx.shadowColor = '#ffd040';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#ffffc0';
    ctx.fillText('LEVEL UP!', 0, 0);
    ctx.shadowBlur = 0;
    // Rays
    ctx.globalAlpha = levelUpAlpha * 0.3;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.strokeStyle = '#ffd040';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 40, Math.sin(angle) * 40);
      ctx.lineTo(Math.cos(angle) * 80, Math.sin(angle) * 80);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ── Achievement popup ──────────────────────────────────────
  function spawnAchievementPopup(title, description, iconColor) {
    popups.push({
      title: title || 'Achievement!',
      desc: description || '',
      iconColor: iconColor || '#ffd040',
      life: 3500,
      maxLife: 3500,
      slideIn: 0,
      alpha: 1
    });
  }

  function updatePopups(dt) {
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.life -= dt;
      p.slideIn = Math.min(1, p.slideIn + dt * 0.008);
      p.alpha = p.life < 500 ? p.life / 500 : 1;
      if (p.life <= 0) popups.splice(i, 1);
    }
  }

  function renderPopups(ctx, w) {
    ctx.save();
    let offsetY = 20;
    for (const p of popups) {
      const boxW = 280;
      const boxH = 70;
      const slideX = (1 - p.slideIn) * (boxW + 20);
      const x = w - boxW - 20 + slideX;
      const y = offsetY;
      ctx.globalAlpha = p.alpha;
      // Background
      ctx.fillStyle = 'rgba(20,20,30,0.88)';
      ctx.strokeStyle = p.iconColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();
      // Icon
      ctx.fillStyle = p.iconColor;
      ctx.beginPath();
      ctx.arc(x + 35, y + boxH / 2, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', x + 35, y + boxH / 2);
      // Text
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(p.title, x + 65, y + 20);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '12px sans-serif';
      ctx.fillText(p.desc, x + 65, y + 40);
      ctx.fillStyle = '#ffd040';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('ACHIEVEMENT UNLOCKED', x + 65, y + 56);
      offsetY += boxH + 10;
    }
    ctx.restore();
  }

  // ── Combo text ─────────────────────────────────────────────
  function spawnComboText(x, y, combo) {
    comboTexts.push({
      x, y, combo,
      life: 900, maxLife: 900,
      scale: 0, alpha: 1,
      color: combo > 10 ? '#ff6040' : (combo > 5 ? '#ffa020' : '#ffd040')
    });
  }

  function updateComboTexts(dt) {
    for (let i = comboTexts.length - 1; i >= 0; i--) {
      const c = comboTexts[i];
      c.life -= dt;
      const t = 1 - c.life / c.maxLife;
      c.scale = t < 0.15 ? t / 0.15 * 1.4 : 1.0;
      c.y -= dt * 0.03;
      c.alpha = c.life < 300 ? c.life / 300 : 1;
      if (c.life <= 0) comboTexts.splice(i, 1);
    }
  }

  function renderComboTexts(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const c of comboTexts) {
      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.font = `bold ${28 + c.combo}px sans-serif`;
      ctx.shadowColor = c.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = c.color;
      ctx.fillText(`x${c.combo} COMBO!`, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Distance milestone banner ──────────────────────────────
  function spawnDistanceBanner(distance, label) {
    banners.push({
      text: label || `${distance}m`,
      life: 2500,
      maxLife: 2500,
      slideIn: 0,
      alpha: 1
    });
  }

  function updateBanners(dt) {
    for (let i = banners.length - 1; i >= 0; i--) {
      const b = banners[i];
      b.life -= dt;
      b.slideIn = Math.min(1, b.slideIn + dt * 0.007);
      b.alpha = b.life < 500 ? b.life / 500 : 1;
      if (b.life <= 0) banners.splice(i, 1);
    }
  }

  function renderBanners(ctx, w, h) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      const bannerW = 320;
      const bannerH = 50;
      const x = w / 2;
      const slideY = (1 - b.slideIn) * -(bannerH + 20);
      const y = 30 + i * (bannerH + 8) + slideY;
      ctx.globalAlpha = b.alpha;
      // Banner background
      const grad = GradyanDeposu.lin(ctx, x - bannerW / 2, 0, x + bannerW / 2, 0, [0, 'rgba(0,0,0,0)', 0.15, 'rgba(20,60,120,0.85)', 0.85, 'rgba(20,60,120,0.85)', 1, 'rgba(0,0,0,0)']);
      ctx.fillStyle = grad;
      ctx.fillRect(x - bannerW / 2, y, bannerW, bannerH);
      // Gold border lines
      ctx.strokeStyle = '#ffd040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - bannerW * 0.45, y + 4);
      ctx.lineTo(x + bannerW * 0.45, y + 4);
      ctx.moveTo(x - bannerW * 0.45, y + bannerH - 4);
      ctx.lineTo(x + bannerW * 0.45, y + bannerH - 4);
      ctx.stroke();
      // Text
      ctx.fillStyle = '#ffd040';
      ctx.font = 'bold 22px sans-serif';
      ctx.shadowColor = '#ffa000';
      ctx.shadowBlur = 8;
      ctx.fillText(b.text, x, y + bannerH / 2);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // ── Checkpoint flash ───────────────────────────────────────
  function triggerCheckpointFlash() {
    checkpointFlash = 1.0;
  }

  function updateCheckpointFlash(dt) {
    if (checkpointFlash > 0) checkpointFlash = Math.max(0, checkpointFlash - dt / 400);
  }

  function renderCheckpointFlash(ctx, w, h) {
    if (checkpointFlash < 0.01) return;
    ctx.save();
    ctx.globalAlpha = checkpointFlash * 0.5;
    ctx.fillStyle = '#40ff80';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Victory confetti ───────────────────────────────────────
  function spawnConfetti(w) {
    confetti.length = 0;
    const colors = ['#ff4040','#40ff40','#4040ff','#ffd040','#ff40ff','#40ffff','#ff8040'];
    for (let i = 0; i < MAX_CONFETTI; i++) {
      confetti.push({
        x: rand(0, w),
        y: rand(-100, -10),
        vx: rand(-2, 2),
        vy: rand(2, 6),
        angle: rand(0, Math.PI * 2),
        angleV: rand(-0.1, 0.1),
        w: rand(6, 14),
        h: rand(4, 8),
        color: colors[i % colors.length],
        alpha: 1,
        life: rand(2000, 4000),
        maxLife: 3000
      });
    }
  }

  function updateConfetti(dt, canvasH) {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.x += c.vx * dt * 0.05;
      c.y += c.vy * dt * 0.05;
      c.angle += c.angleV;
      c.vy += 0.05 * dt * 0.05;
      c.life -= dt;
      c.alpha = c.life < 500 ? c.life / 500 : 1;
      if (c.y > canvasH + 20 || c.life <= 0) confetti.splice(i, 1);
    }
  }

  function renderConfetti(ctx) {
    ctx.save();
    for (const c of confetti) {
      ctx.globalAlpha = c.alpha;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Defeat fade ────────────────────────────────────────────
  function triggerDefeatFade() { defeatFade = 0; }

  function updateDefeatFade(dt) {
    defeatFade = Math.min(1, defeatFade + dt / 2500);
  }

  function renderDefeatFade(ctx, w, h) {
    if (defeatFade < 0.01) return;
    ctx.save();
    ctx.globalAlpha = defeatFade * 0.85;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    if (defeatFade > 0.4) {
      ctx.globalAlpha = (defeatFade - 0.4) / 0.6;
      ctx.fillStyle = '#cc3030';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 52px sans-serif';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.fillText('GAME OVER', w / 2, h / 2);
    }
    ctx.restore();
  }

  // ── HUD pulse highlight ────────────────────────────────────
  function spawnHUDPulse(x, y, w, h, color) {
    pulses.push({ x, y, w, h, color: color || '#ffffff', life: 600, maxLife: 600 });
  }

  function updatePulses(dt) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      pulses[i].life -= dt;
      if (pulses[i].life <= 0) pulses.splice(i, 1);
    }
  }

  function renderPulses(ctx) {
    ctx.save();
    for (const p of pulses) {
      const alpha = (p.life / p.maxLife) * 0.5;
      const expand = (1 - p.life / p.maxLife) * 8;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - expand, p.y - expand, p.w + expand * 2, p.h + expand * 2, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Master update ──────────────────────────────────────────
  function update(dt, w, h) {
    updateCoinBursts(dt);
    updateFloaters(dt);
    updateLevelUp(dt);
    updatePopups(dt);
    updateComboTexts(dt);
    updateBanners(dt);
    updateCheckpointFlash(dt);
    updateConfetti(dt, h);
    if (defeatFade > 0 && defeatFade < 1) updateDefeatFade(dt);
    updatePulses(dt);
  }

  // ── Master render ──────────────────────────────────────────
  function render(ctx, w, h) {
    renderCoinBursts(ctx);
    renderConfetti(ctx);
    renderComboTexts(ctx);
    renderFloaters(ctx);
    renderBanners(ctx, w, h);
    renderLevelUp(ctx, w, h);
    renderPopups(ctx, w);
    renderPulses(ctx);
    renderCheckpointFlash(ctx, w, h);
    if (defeatFade > 0) renderDefeatFade(ctx, w, h);
  }

  return {
    update, render,
    spawnCoinBurst, spawnFloater, spawnAchievementPopup, spawnComboText,
    spawnDistanceBanner, spawnHUDPulse, spawnConfetti,
    triggerLevelUp, triggerCheckpointFlash, triggerDefeatFade,
    renderCoinBursts, renderFloaters, renderLevelUp, renderPopups,
    renderComboTexts, renderBanners, renderCheckpointFlash,
    renderConfetti, renderDefeatFade, renderPulses,
    get defeatFade() { return defeatFade; },
    get levelUpAlpha() { return levelUpAlpha; },
    get checkpointFlash() { return checkpointFlash; }
  };
})();

// ============================================================
// ADVANCED_TERRAIN_RENDERER — Multi-layer terrain rendering (~40KB)
// ============================================================
const ADVANCED_TERRAIN_RENDERER = (function() {
  'use strict';

  // ── Surface definitions ──────────────────────────────────────
  const SURFACE_DEFS = {
    asphalt: {
      baseColor:    '#3a3a3a',
      surfaceColor: '#4a4a4a',
      edgeColor:    '#2a2a2a',
      subColor:     '#222222',
      shadowColor:  'rgba(0,0,0,0.4)',
      label:        'Asphalt'
    },
    dirt: {
      baseColor:    '#8B5E3C',
      surfaceColor: '#A0714F',
      edgeColor:    '#6B4423',
      subColor:     '#5A3820',
      shadowColor:  'rgba(50,20,0,0.35)',
      label:        'Dirt'
    },
    grass: {
      baseColor:    '#4a7c2f',
      surfaceColor: '#5a9938',
      edgeColor:    '#2e5c18',
      subColor:     '#3a6225',
      shadowColor:  'rgba(10,40,0,0.3)',
      label:        'Grass'
    },
    sand: {
      baseColor:    '#c8a96e',
      surfaceColor: '#dfc07a',
      edgeColor:    '#a88d50',
      subColor:     '#9a7e40',
      shadowColor:  'rgba(80,60,0,0.25)',
      label:        'Sand'
    },
    ice: {
      baseColor:    '#b0d8f0',
      surfaceColor: '#cce8ff',
      edgeColor:    '#80b8d8',
      subColor:     '#90c0e0',
      shadowColor:  'rgba(80,140,200,0.3)',
      label:        'Ice'
    },
    mud: {
      baseColor:    '#4a3020',
      surfaceColor: '#5a3e28',
      edgeColor:    '#321e12',
      subColor:     '#2a180e',
      shadowColor:  'rgba(20,10,0,0.5)',
      label:        'Mud'
    },
    lava: {
      baseColor:    '#2a0a00',
      surfaceColor: '#8a2000',
      edgeColor:    '#ff5500',
      subColor:     '#1a0500',
      shadowColor:  'rgba(200,50,0,0.5)',
      label:        'Lava'
    },
    rock: {
      baseColor:    '#555555',
      surfaceColor: '#666666',
      edgeColor:    '#333333',
      subColor:     '#2a2a2a',
      shadowColor:  'rgba(0,0,0,0.5)',
      label:        'Rock'
    }
  };

  // ── Crack / speckle / blade pattern drawing ──────────────────
  function drawAsphaltTexture(ctx, x, y, w, h, seed) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,20,20,0.3)';
    ctx.lineWidth   = 0.8;
    // Deterministic crack lines based on seed
    const rng = makePRNG(seed);
    const numCracks = Math.floor(w / 80) + 2;
    for (let i = 0; i < numCracks; i++) {
      const cx = x + rng() * w;
      const cy = y + rng() * h;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (rng() - 0.5) * 30, cy + rng() * 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDirtTexture(ctx, x, y, w, h, seed) {
    ctx.save();
    const rng = makePRNG(seed);
    const numStones = Math.floor(w / 40) + 3;
    for (let i = 0; i < numStones; i++) {
      const sx = x + rng() * w;
      const sy = y + rng() * h * 0.5 + h * 0.2;
      const sr = 1 + rng() * 3;
      ctx.fillStyle = `rgba(100,70,40,${0.3 + rng() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sr, sr * 0.7, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGrassTexture(ctx, x, y, w, h, seed) {
    ctx.save();
    const rng   = makePRNG(seed);
    const blades = Math.floor(w / 8) + 4;
    for (let i = 0; i < blades; i++) {
      const bx = x + rng() * w;
      const by = y + 2;
      const bh = 4 + rng() * 6;
      ctx.strokeStyle = `rgba(30,90,10,${0.4 + rng() * 0.4})`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + (rng() - 0.5) * 4, by - bh * 0.5, bx + (rng() - 0.5) * 3, by - bh);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSandTexture(ctx, x, y, w, h, seed, tick) {
    ctx.save();
    ctx.strokeStyle = 'rgba(160,120,60,0.25)';
    ctx.lineWidth   = 0.5;
    const rng = makePRNG(seed);
    const numRipples = Math.floor(h / 6) + 2;
    for (let i = 0; i < numRipples; i++) {
      const ry  = y + (i / numRipples) * h;
      const amp = 1 + rng() * 2;
      const freq= 0.05 + rng() * 0.05;
      const ph  = rng() * Math.PI * 2 + (tick || 0) * 0.01;
      ctx.beginPath();
      for (let px = x; px < x + w; px += 3) {
        const py = ry + Math.sin(px * freq + ph) * amp;
        px === x ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawIceTexture(ctx, x, y, w, h, seed) {
    ctx.save();
    const rng  = makePRNG(seed);
    const numFractures = Math.floor(w / 60) + 2;
    ctx.strokeStyle = 'rgba(180,220,255,0.5)';
    ctx.lineWidth   = 0.7;
    for (let i = 0; i < numFractures; i++) {
      const fx = x + rng() * w;
      const fy = y + rng() * h;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      let cx2 = fx, cy2 = fy;
      for (let seg = 0; seg < 4; seg++) {
        cx2 += (rng() - 0.3) * 20;
        cy2 += (rng() - 0.5) * 10;
        ctx.lineTo(cx2, cy2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMudTexture(ctx, x, y, w, h, seed, tick) {
    ctx.save();
    const rng     = makePRNG(seed);
    const numPuddles = Math.floor(w / 100) + 2;
    for (let i = 0; i < numPuddles; i++) {
      const px  = x + rng() * w;
      const py  = y + h * 0.3 + rng() * h * 0.4;
      const prx = 8 + rng() * 15;
      const pry = 3 + rng() * 5;
      const wavePhase = (tick || 0) * 0.05;
      // Puddle reflection
      const grad = ctx.createRadialGradient(px, py, 0, px, py, prx);
      grad.addColorStop(0,   'rgba(40,25,10,0.6)');
      grad.addColorStop(0.7, 'rgba(30,15,5,0.3)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(px, py, prx + Math.sin(wavePhase) * 1, pry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Lava animation ───────────────────────────────────────────
  function drawLavaTexture(ctx, x, y, w, h, tick) {
    ctx.save();
    const t = (tick || 0) * 0.04;
    const numWaves = 4;
    for (let i = 0; i < numWaves; i++) {
      const phase  = t + (i / numWaves) * Math.PI * 2;
      const yOff   = y + h * 0.5 + Math.sin(phase) * h * 0.25;
      const alpha  = 0.25 + Math.sin(phase * 1.3) * 0.1;
      ctx.fillStyle = `rgba(255,${80 + Math.floor(Math.sin(phase) * 30)},0,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(x, yOff);
      for (let px = x; px <= x + w; px += 8) {
        const py = yOff + Math.sin(px * 0.03 + phase) * h * 0.2;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Water level ───────────────────────────────────────────────
  function drawWaterLevel(ctx, x, y, w, waterY, cameraY, tick) {
    if (waterY < cameraY) return;
    ctx.save();
    const t    = (tick || 0) * 0.02;
    const grad = GradyanDeposu.lin(ctx, 0, waterY, 0, waterY + 200, [0, 'rgba(20,100,180,0.55)', 1, 'rgba(5,40,100,0.7)']);
    ctx.fillStyle = grad;
    // Wavy surface
    ctx.beginPath();
    ctx.moveTo(x, waterY);
    for (let px = x; px <= x + w; px += 8) {
      const py = waterY + Math.sin(px * 0.02 + t) * 4;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + w, waterY + 300);
    ctx.lineTo(x,     waterY + 300);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Cave ceiling ─────────────────────────────────────────────
  function drawCaveCeiling(ctx, segments, cameraX, cameraY) {
    if (!segments || !segments.length) return;
    ctx.save();
    ctx.fillStyle = '#1a1a1a';
    for (const seg of segments) {
      const sx = seg.x - cameraX;
      const sy = seg.ceilY - cameraY;
      // Hanging stalactites
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx + (seg.w || 40), sy + (seg.drop || 20));
      ctx.lineTo(sx + (seg.w || 40), 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Terrain edge rounding ─────────────────────────────────────
  function drawTerrainEdge(ctx, points, edgeColor, radius) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth   = radius || 3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Sub-surface depth ─────────────────────────────────────────
  function drawSubSurface(ctx, points, depth, subColor) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.fillStyle = subColor;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y + 2);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y + 2);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y + depth);
    ctx.lineTo(points[0].x, points[0].y + depth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Terrain shadow ────────────────────────────────────────────
  function drawTerrainShadow(ctx, points, shadowColor) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      // Shadow only on downhill side (next point is lower)
      const dy = points[i].y - points[i - 1].y;
      if (dy > 0) {
        const sx = points[i - 1].x + 3;
        const sy = points[i - 1].y + 4;
        ctx.lineTo(sx, sy);
      } else {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    for (let i = points.length - 1; i >= 0; i--) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── PRNG ──────────────────────────────────────────────────────
  function makePRNG(seed) {
    let s = seed || 42;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  // ── Main render function ─────────────────────────────────────
  function renderTerrain(ctx, terrainPoints, surfaceType, options) {
    const opts    = options || {};
    const tick    = opts.tick    || 0;
    const seed    = opts.seed    || 1;
    const waterY  = opts.waterY  || null;
    const cameraX = opts.cameraX || 0;
    const cameraY = opts.cameraY || 0;
    const def     = SURFACE_DEFS[surfaceType] || SURFACE_DEFS.dirt;

    if (!terrainPoints || terrainPoints.length < 2) return;

    const pts = terrainPoints.map(p => ({ x: p.x - cameraX, y: p.y - cameraY }));

    // 1 — Sub-surface
    drawSubSurface(ctx, pts, 120, def.subColor);

    // 2 — Base fill
    ctx.save();
    ctx.fillStyle = def.baseColor;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[pts.length - 1].x, 2000);
    ctx.lineTo(pts[0].x, 2000);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3 — Surface texture layer
    const bounds = {
      x: pts[0].x,
      y: Math.min(...pts.map(p => p.y)),
      w: pts[pts.length - 1].x - pts[0].x,
      h: 20
    };
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y + 20);
    ctx.lineTo(pts[0].x, pts[0].y + 20);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = def.surfaceColor;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, 20);
    switch (surfaceType) {
      case 'asphalt': drawAsphaltTexture(ctx, bounds.x, bounds.y, bounds.w, 16, seed); break;
      case 'dirt':    drawDirtTexture(ctx, bounds.x, bounds.y, bounds.w, 16, seed);    break;
      case 'grass':   drawGrassTexture(ctx, bounds.x, bounds.y, bounds.w, 16, seed);   break;
      case 'sand':    drawSandTexture(ctx, bounds.x, bounds.y, bounds.w, 16, seed, tick); break;
      case 'ice':     drawIceTexture(ctx, bounds.x, bounds.y, bounds.w, 16, seed);     break;
      case 'mud':     drawMudTexture(ctx, bounds.x, bounds.y, bounds.w, 16, seed, tick); break;
      case 'lava':    drawLavaTexture(ctx, bounds.x, bounds.y, bounds.w, 20, tick);    break;
    }
    ctx.restore();

    // 4 — Terrain shadow
    drawTerrainShadow(ctx, pts, def.shadowColor);

    // 5 — Edge
    drawTerrainEdge(ctx, pts, def.edgeColor, 2.5);

    // 6 — Water level
    if (waterY !== null) {
      drawWaterLevel(ctx, pts[0].x, 0, bounds.w + 200, waterY - cameraY, cameraY, tick);
    }
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    renderTerrain,
    drawWaterLevel,
    drawCaveCeiling,
    drawTerrainEdge,
    drawSubSurface,
    drawTerrainShadow,
    drawLavaTexture,
    SURFACE_DEFS,
    getSurfaceDef(type) { return SURFACE_DEFS[type] || SURFACE_DEFS.dirt; }
  };
})();

// ============================================================
// ANIMATION_SYSTEM_RENDERER — Frame-by-frame animation system (~40KB)
// ============================================================
const ANIMATION_SYSTEM_RENDERER = (function() {
  'use strict';

  // ── Easing library ───────────────────────────────────────────
  const Easing = {
    linear:      t => t,
    easeIn:      t => t * t,
    easeOut:     t => t * (2 - t),
    easeInOut:   t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    bounce:      t => {
      if (t < 1 / 2.75)  return 7.5625 * t * t;
      if (t < 2 / 2.75)  return 7.5625 * (t -= 1.5   / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75)return 7.5625 * (t -= 2.25  / 2.75) * t + 0.9375;
      return               7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    elastic:     t => {
      if (t === 0 || t === 1) return t;
      return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 0.3);
    },
    back:        t => t * t * (2.7 * t - 1.7)
  };

  // ── Tween system ─────────────────────────────────────────────
  const _tweens = [];

  function tween(from, to, duration, easing, onUpdate, onComplete) {
    const tw = {
      from, to, duration,
      easing:     Easing[easing] || Easing.linear,
      onUpdate:   onUpdate   || null,
      onComplete: onComplete || null,
      elapsed:    0,
      done:       false
    };
    _tweens.push(tw);
    return tw;
  }

  function updateTweens(dt) {
    for (let i = _tweens.length - 1; i >= 0; i--) {
      const tw = _tweens[i];
      if (tw.done) { _tweens.splice(i, 1); continue; }
      tw.elapsed += dt;
      const t    = Math.min(1, tw.elapsed / tw.duration);
      const et   = tw.easing(t);
      const val  = tw.from + (tw.to - tw.from) * et;
      if (tw.onUpdate) tw.onUpdate(val, t);
      if (t >= 1) {
        tw.done = true;
        if (tw.onComplete) tw.onComplete();
        _tweens.splice(i, 1);
      }
    }
  }

  // ── AnimationState pool ──────────────────────────────────────
  const _states = {};

  function createAnimState(id, frames, fps, loop, onComplete) {
    _states[id] = {
      id,
      frames:    frames || [],
      fps:       fps    || 12,
      loop:      loop !== undefined ? loop : true,
      onComplete:onComplete || null,
      frame:     0,
      frameTime: 0,
      playing:   true
    };
    return _states[id];
  }

  function updateAnimState(id, dt) {
    const s = _states[id];
    if (!s || !s.playing) return null;
    s.frameTime += dt;
    const frameDur = 1 / s.fps;
    if (s.frameTime >= frameDur) {
      s.frameTime -= frameDur;
      s.frame++;
      if (s.frame >= s.frames.length) {
        if (s.loop) {
          s.frame = 0;
        } else {
          s.frame   = s.frames.length - 1;
          s.playing = false;
          if (s.onComplete) s.onComplete();
        }
      }
    }
    return s.frames[s.frame];
  }

  // ── Vehicle animation draw commands ──────────────────────────
  const VEHICLE_ANIM_DEFS = {
    idle: {
      fps: 8, loop: true,
      frames: [
        { bodyOffsetY: 0,    breathScale: 1.000 },
        { bodyOffsetY: -0.5, breathScale: 1.002 },
        { bodyOffsetY: -1.0, breathScale: 1.005 },
        { bodyOffsetY: -0.5, breathScale: 1.002 },
        { bodyOffsetY: 0,    breathScale: 1.000 },
        { bodyOffsetY:  0.3, breathScale: 0.998 },
        { bodyOffsetY:  0.5, breathScale: 0.997 },
        { bodyOffsetY:  0.3, breathScale: 0.998 }
      ]
    },
    driving: {
      fps: 24, loop: true,
      frames: Array.from({ length: 8 }, (_, i) => ({
        bodyOffsetY:  Math.sin(i / 8 * Math.PI * 2) * 1.5,
        suspensionL:  Math.sin(i / 8 * Math.PI * 2 + 0.5) * 3,
        suspensionR:  Math.sin(i / 8 * Math.PI * 2 + 1.0) * 3
      }))
    },
    crash: {
      fps: 12, loop: false,
      frames: [
        { shakeX: 0,  shakeY: 0,  flashAlpha: 0   },
        { shakeX: 8,  shakeY: -5, flashAlpha: 0.5 },
        { shakeX: -6, shakeY: 4,  flashAlpha: 0.3 },
        { shakeX: 5,  shakeY: -3, flashAlpha: 0.1 },
        { shakeX: -3, shakeY: 2,  flashAlpha: 0   },
        { shakeX: 0,  shakeY: 0,  flashAlpha: 0   }
      ]
    }
  };

  // ── Driver character animation ────────────────────────────────
  const DRIVER_STATES = ['idle', 'driving', 'airborne', 'leaning_forward',
                         'leaning_back', 'celebrating', 'frightened', 'crashed'];

  const DRIVER_ANIM_DEFS = {
    idle:           { headTilt: 0,    bodyLean: 0,    armAngle: 0.1,   legBend: 0.2  },
    driving:        { headTilt: -0.1, bodyLean: 0.15, armAngle: -0.3,  legBend: 0.3  },
    airborne:       { headTilt: 0.2,  bodyLean: -0.1, armAngle: 0.5,   legBend: -0.1 },
    leaning_forward:{ headTilt: -0.3, bodyLean: 0.4,  armAngle: -0.5,  legBend: 0.4  },
    leaning_back:   { headTilt: 0.3,  bodyLean: -0.4, armAngle: 0.6,   legBend: 0.2  },
    celebrating:    { headTilt: 0.4,  bodyLean: -0.2, armAngle: -1.2,  legBend: 0.1  },
    frightened:     { headTilt: -0.5, bodyLean: 0.5,  armAngle: 1.0,   legBend: 0.5  },
    crashed:        { headTilt: 1.0,  bodyLean: 0.8,  armAngle: 1.5,   legBend: 0.8  }
  };

  function drawDriver(ctx, x, y, state, t) {
    const def = DRIVER_ANIM_DEFS[state] || DRIVER_ANIM_DEFS.idle;
    const wave = Math.sin(t * 6) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    // Body
    ctx.save();
    ctx.rotate(def.bodyLean + wave);
    ctx.fillStyle = '#e06020';
    ctx.fillRect(-8, -20, 16, 22);
    // Head
    ctx.save();
    ctx.translate(0, -22);
    ctx.rotate(def.headTilt);
    ctx.fillStyle = '#f0c080';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Helmet
    ctx.fillStyle = '#204080';
    ctx.beginPath();
    ctx.arc(0, -2, 8, Math.PI, 0);
    ctx.fill();
    ctx.restore();
    // Arms
    ctx.save();
    ctx.rotate(def.armAngle);
    ctx.fillStyle = '#e06020';
    ctx.fillRect(-14, -15, 6, 14);
    ctx.restore();
    ctx.save();
    ctx.scale(-1, 1);
    ctx.rotate(def.armAngle);
    ctx.fillStyle = '#e06020';
    ctx.fillRect(-14, -15, 6, 14);
    ctx.restore();
    // Legs
    ctx.save();
    ctx.translate(-5, 2);
    ctx.rotate(def.legBend);
    ctx.fillStyle = '#304080';
    ctx.fillRect(-3, 0, 6, 14);
    ctx.restore();
    ctx.save();
    ctx.translate(5, 2);
    ctx.rotate(-def.legBend);
    ctx.fillStyle = '#304080';
    ctx.fillRect(-3, 0, 6, 14);
    ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  // ── UI animations ────────────────────────────────────────────
  const UI_ANIM_DEFS = {
    button_press: {
      duration: 0.12, startScale: 1.0, endScale: 0.9, easing: 'easeOut'
    },
    button_release: {
      duration: 0.2,  startScale: 0.9, endScale: 1.0, easing: 'bounce'
    },
    screen_in: {
      duration: 0.3,  startAlpha: 0, endAlpha: 1, startY: 40, endY: 0, easing: 'easeOut'
    },
    screen_out: {
      duration: 0.25, startAlpha: 1, endAlpha: 0, startY: 0,  endY: -40, easing: 'easeIn'
    },
    coin_collect: {
      duration: 0.5,  startScale: 1.5, endScale: 0, easing: 'easeIn'
    }
  };

  // ── Environmental animations ──────────────────────────────────
  function drawFlameEffect(ctx, x, y, height, tick) {
    ctx.save();
    const t = tick * 0.1;
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const phase = t + i * 0.4;
      const w     = (10 - i * 1.5) + Math.sin(phase * 3) * 2;
      const h     = (height - i * height * 0.15) * (0.8 + Math.sin(phase * 2) * 0.2);
      const alpha = (1 - i / layers) * 0.7;
      const r     = 255;
      const g     = Math.floor(80 + i * 30 + Math.sin(phase) * 20);
      ctx.fillStyle = `rgba(${r},${g},0,${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.sin(phase * 1.5) * 3,
        y - h * 0.5,
        w, h * 0.5,
        Math.sin(phase) * 0.2,
        0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWaterfallEffect(ctx, x, y, h, w, tick) {
    ctx.save();
    const t = tick * 0.05;
    ctx.strokeStyle = 'rgba(120,180,255,0.6)';
    ctx.lineWidth   = 2;
    const streams   = Math.floor(w / 8) + 2;
    for (let i = 0; i < streams; i++) {
      const sx    = x + (i / streams) * w;
      const speed = 0.8 + (i % 3) * 0.2;
      ctx.beginPath();
      for (let py = y; py < y + h; py += 4) {
        const progress = ((py - y) / h + t * speed) % 1;
        const px       = sx + Math.sin(py * 0.08 + t * speed * 2) * 3;
        py === y ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 0.4 + Math.sin(t * speed + i) * 0.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawSpinningPlatformEffect(ctx, x, y, r, tick) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tick * 0.04);
    // Spokes
    ctx.strokeStyle = '#a06020';
    ctx.lineWidth   = 4;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      ctx.restore();
    }
    // Rim
    ctx.strokeStyle = '#c08040';
    ctx.lineWidth   = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Procedural joint character ────────────────────────────────
  function drawJointCharacter(ctx, joints, color) {
    // joints: [{ x, y }]
    if (!joints || joints.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color || '#ffffff';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(joints[0].x, joints[0].y);
    for (let i = 1; i < joints.length; i++) {
      ctx.lineTo(joints[i].x, joints[i].y);
    }
    ctx.stroke();
    // Joint dots
    ctx.fillStyle = color || '#ffffff';
    for (const j of joints) {
      ctx.beginPath();
      ctx.arc(j.x, j.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Particle cloth / hair ─────────────────────────────────────
  function drawClothSimulation(ctx, particles, color) {
    if (!particles || !particles.length) return;
    ctx.save();
    ctx.strokeStyle = color || '#ccaaaa';
    ctx.lineWidth   = 1.5;
    for (let i = 0; i < particles.length - 1; i++) {
      const a = particles[i];
      const b = particles[i + 1];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(
        (a.x + b.x) / 2 + a.vx * 2,
        (a.y + b.y) / 2 + a.vy * 2,
        b.x, b.y
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Scheduler ────────────────────────────────────────────────
  const _scheduled = [];

  function scheduleAnimation(delay, fn) {
    _scheduled.push({ delay, elapsed: 0, fn, fired: false });
  }

  function updateScheduled(dt) {
    for (const item of _scheduled) {
      if (item.fired) continue;
      item.elapsed += dt;
      if (item.elapsed >= item.delay) {
        item.fired = true;
        item.fn();
      }
    }
    // Clean up fired
    for (let i = _scheduled.length - 1; i >= 0; i--) {
      if (_scheduled[i].fired) _scheduled.splice(i, 1);
    }
  }

  // ── Main update ───────────────────────────────────────────────
  function update(dt) {
    updateTweens(dt);
    updateScheduled(dt);
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    update,
    tween,
    createAnimState,
    updateAnimState,
    drawDriver,
    drawFlameEffect,
    drawWaterfallEffect,
    drawSpinningPlatformEffect,
    drawJointCharacter,
    drawClothSimulation,
    scheduleAnimation,
    Easing,
    VEHICLE_ANIM_DEFS,
    DRIVER_STATES,
    DRIVER_ANIM_DEFS,
    UI_ANIM_DEFS,
    getState(id) { return _states[id] || null; },
    removeState(id) { delete _states[id]; }
  };
})();

// ============================================================
// ADVANCED_BACKGROUND_RENDERER_V2 — Extended parallax background (~35KB)
// ============================================================
const ADVANCED_BACKGROUND_RENDERER_V2 = (function() {
  'use strict';

  // ── Sky gradient presets ─────────────────────────────────────
  const SKY_PRESETS = {
    day_clear:    [{ stop: 0, color: '#87CEEB' }, { stop: 1, color: '#E0F0FF' }],
    day_sunset:   [{ stop: 0, color: '#FF7043' }, { stop: 0.4, color: '#FF9800' }, { stop: 1, color: '#FFF176' }],
    day_stormy:   [{ stop: 0, color: '#263238' }, { stop: 0.5, color: '#546E7A' }, { stop: 1, color: '#90A4AE' }],
    night_clear:  [{ stop: 0, color: '#0a0a1a' }, { stop: 0.6, color: '#0d0d2b' }, { stop: 1, color: '#1a1a3a' }],
    night_cloudy: [{ stop: 0, color: '#1a1a1a' }, { stop: 1, color: '#2a2a2a' }],
    dawn:         [{ stop: 0, color: '#1a1a4a' }, { stop: 0.4, color: '#8B5E83' }, { stop: 0.7, color: '#FFA07A' }, { stop: 1, color: '#FFD700' }],
    underwater:   [{ stop: 0, color: '#001830' }, { stop: 0.5, color: '#003060' }, { stop: 1, color: '#005080' }],
    volcano:      [{ stop: 0, color: '#1a0500' }, { stop: 0.5, color: '#3a0a00' }, { stop: 1, color: '#6a1500' }]
  };

  // ── Sky gradient ─────────────────────────────────────────────
  function drawSkyGradient(ctx, w, h, preset) {
    const stops = SKY_PRESETS[preset] || SKY_PRESETS.day_clear;
    const grad  = ctx.createLinearGradient(0, 0, 0, h);
    for (const s of stops) grad.addColorStop(s.stop, s.color);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Sun rendering ────────────────────────────────────────────
  function drawSun(ctx, cx, cy, radius, numRays, tick) {
    ctx.save();
    // Outer glow
    const glow = GradyanDeposu.rad(ctx, cx, cy, radius * 0.5, cx, cy, radius * 3, [0, 'rgba(255,230,100,0.4)', 0.4, 'rgba(255,200,50,0.15)', 1, 'rgba(255,180,0,0)']);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
    ctx.fill();
    // Sun disc
    const disc = GradyanDeposu.rad(ctx, cx, cy, 0, cx, cy, radius, [0, '#FFFFFF', 0.4, '#FFF8DC', 1, '#FFD700']);
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    // Rays
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((tick || 0) * 0.003);
    ctx.strokeStyle = 'rgba(255,220,80,0.35)';
    for (let i = 0; i < (numRays || 12); i++) {
      const angle = (i / (numRays || 12)) * Math.PI * 2;
      const r1    = radius * 1.2;
      const r2    = radius * (2 + Math.sin(angle * 3 + tick * 0.01) * 0.3);
      ctx.lineWidth = 2 + Math.sin(angle * 2) * 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
      ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // ── Moon phases ───────────────────────────────────────────────
  function drawMoon(ctx, cx, cy, radius, phase) {
    // phase: 0 = new moon (dark), 4 = full moon
    ctx.save();
    ctx.fillStyle = '#E8E0C8';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    // Shadow crescent
    const illumination = (phase / 8) * 2 - 1; // -1 to 1
    const shadowX = cx + illumination * radius * 0.5;
    ctx.globalCompositeOperation = 'destination-out';
    const shadowRad = radius * (1 - Math.abs(illumination) * 0.1);
    ctx.beginPath();
    ctx.arc(shadowX, cy, shadowRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // Craters
    ctx.fillStyle = 'rgba(160,150,120,0.3)';
    const craterData = [[0.3,0.2,0.1],[-.2,.3,.08],[.1,-.3,.12],[-0.3,-0.1,0.07]];
    for (const [dx, dy, cr] of craterData) {
      ctx.beginPath();
      ctx.arc(cx + dx * radius, cy + dy * radius, cr * radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Star field ────────────────────────────────────────────────
  const _stars = [];
  let _starsReady = false;

  function initStars(count, w, h) {
    _stars.length = 0;
    const rng = (s => { let x = s; return () => { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 0xffffffff; }; })(9301);
    for (let i = 0; i < (count || 500); i++) {
      _stars.push({
        x:        rng() * w,
        y:        rng() * h * 0.7,
        r:        0.5 + rng() * 1.5,
        phase:    rng() * Math.PI * 2,
        speed:    0.5 + rng() * 1.5,
        color:    rng() > 0.9 ? '#FFE8C0' : rng() > 0.8 ? '#C0D0FF' : '#FFFFFF'
      });
    }
    _starsReady = true;
  }

  function drawStars(ctx, tick, parallaxX) {
    if (!_starsReady) initStars(500, 800, 600);
    ctx.save();
    for (const star of _stars) {
      const alpha  = 0.5 + Math.sin(star.phase + tick * star.speed * 0.03) * 0.5;
      const sx     = ((star.x - parallaxX * 0.02) % ctx.canvas.width + ctx.canvas.width) % ctx.canvas.width;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = star.color;
      ctx.beginPath();
      ctx.arc(sx, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Aurora borealis ───────────────────────────────────────────
  function drawAurora(ctx, w, h, tick) {
    ctx.save();
    const t      = tick * 0.02;
    const colors = ['rgba(0,200,80,', 'rgba(80,0,200,', 'rgba(0,180,200,'];
    const bands  = 3;
    for (let b = 0; b < bands; b++) {
      const phase  = t + b * 1.2;
      const alpha  = 0.12 + Math.sin(phase * 0.7) * 0.06;
      const yBase  = h * (0.05 + b * 0.07);
      const yAmp   = h * 0.06;
      const col    = colors[b % colors.length];
      const grad   = ctx.createLinearGradient(0, yBase - yAmp, 0, yBase + yAmp * 3);
      grad.addColorStop(0,   col + '0)');
      grad.addColorStop(0.3, col + alpha.toFixed(2) + ')');
      grad.addColorStop(1,   col + '0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, yBase);
      for (let x = 0; x <= w; x += 10) {
        const y = yBase + Math.sin(x * 0.015 + phase) * yAmp + Math.sin(x * 0.03 + phase * 1.3) * yAmp * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, yBase + yAmp * 3);
      ctx.lineTo(0, yBase + yAmp * 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Procedural clouds ─────────────────────────────────────────
  const _clouds = [];
  let _cloudsReady = false;

  function initClouds(count, w, h) {
    _clouds.length = 0;
    const rng = (s => { let x = s; return () => { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 0xffffffff; }; })(4321);
    for (let i = 0; i < (count || 12); i++) {
      const numPuffs = 3 + Math.floor(rng() * 4);
      const puffs    = [];
      let cx = 0;
      for (let p = 0; p < numPuffs; p++) {
        cx += rng() * 40 - 10;
        puffs.push({ ox: cx, oy: (rng() - 0.5) * 15, r: 20 + rng() * 30 });
      }
      _clouds.push({
        x:      rng() * w * 2,
        y:      30 + rng() * h * 0.25,
        puffs,
        speed:  0.3 + rng() * 0.4,
        layer:  Math.floor(rng() * 3),
        alpha:  0.6 + rng() * 0.4
      });
    }
    _cloudsReady = true;
  }

  function drawCloud(ctx, x, y, puffs, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#FFFFFF';
    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(x + p.ox, y + p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bottom shadow
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle   = '#B0B8C0';
    for (const p of puffs) {
      ctx.beginPath();
      ctx.ellipse(x + p.ox, y + p.oy + p.r * 0.6, p.r * 0.9, p.r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawClouds(ctx, w, h, tick, cameraX) {
    if (!_cloudsReady) initClouds(12, w, h);
    const parallaxFactors = [0.03, 0.07, 0.12];
    ctx.save();
    for (const cloud of _clouds) {
      cloud.x += cloud.speed * 0.2;
      if (cloud.x > w + 200) cloud.x = -300;
      const parallax = cameraX * parallaxFactors[cloud.layer];
      const drawX    = ((cloud.x - parallax) % (w + 400) + w + 400) % (w + 400) - 200;
      drawCloud(ctx, drawX, cloud.y, cloud.puffs, cloud.alpha * (0.8 + Math.sin(tick * 0.01 + cloud.x) * 0.2));
    }
    ctx.restore();
  }

  // ── Underwater caustics ───────────────────────────────────────
  function drawUnderwaterCaustics(ctx, w, h, tick) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const t = tick * 0.04;
    for (let i = 0; i < 8; i++) {
      const cx   = (w * 0.15 * i + Math.sin(t + i * 0.9) * w * 0.08) % w;
      const cy   = h * (0.3 + Math.sin(t * 0.7 + i) * 0.3);
      const cr   = 30 + Math.sin(t * 1.1 + i * 0.5) * 15;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      grad.addColorStop(0,   'rgba(80,160,255,0.18)');
      grad.addColorStop(0.5, 'rgba(40,100,200,0.08)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ── Volcano ash cloud ─────────────────────────────────────────
  function drawVolcanoAshCloud(ctx, x, y, w, tick) {
    ctx.save();
    const t = tick * 0.02;
    for (let i = 0; i < 6; i++) {
      const ox  = Math.sin(t + i * 1.1) * w * 0.3;
      const oy  = -i * 20 + Math.sin(t * 0.8 + i) * 8;
      const r   = 30 + i * 15 + Math.sin(t + i) * 10;
      const alpha = (0.5 - i * 0.06);
      ctx.fillStyle = `rgba(60,50,50,${Math.max(0, alpha).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── City skyline ──────────────────────────────────────────────
  function drawCitySkyline(ctx, w, h, seed, parallaxX) {
    ctx.save();
    const rng = (s => { let x = s; return () => { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 0xffffffff; }; })(seed || 777);
    ctx.fillStyle = '#1a1a2a';
    const numBuildings = Math.floor(w / 40) + 4;
    let bx = -((parallaxX * 0.15) % (w * 1.5));
    for (let i = 0; i < numBuildings * 2; i++) {
      const bw  = 20 + rng() * 40;
      const bh  = 40 + rng() * (h * 0.4);
      ctx.fillRect(bx, h - bh, bw, bh);
      // Windows
      ctx.fillStyle = 'rgba(255,240,180,0.6)';
      for (let wy = h - bh + 8; wy < h - 8; wy += 12) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 10) {
          if (rng() > 0.35) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      ctx.fillStyle = '#1a1a2a';
      bx += bw + 2 + rng() * 10;
    }
    ctx.restore();
  }

  // ── Mountain silhouette layers ────────────────────────────────
  function drawMountainLayers(ctx, w, h, numLayers, cameraX, skyPreset) {
    const layerColors = ['#3a3a4a', '#4a4a5a', '#5a5a6a'];
    const parallaxFactors = [0.05, 0.12, 0.22];
    ctx.save();
    for (let layer = numLayers - 1; layer >= 0; layer--) {
      const pf      = parallaxFactors[layer % parallaxFactors.length];
      const color   = layerColors[layer % layerColors.length];
      const offsetX = cameraX * pf;
      const seed    = layer * 3131;
      const rng     = (s => { let x = s; return () => { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 0xffffffff; }; })(seed);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-offsetX % w, h);
      let mx = (-offsetX % w);
      ctx.lineTo(mx, h * (0.4 + layer * 0.1));
      while (mx < w + 300) {
        mx += 30 + rng() * 60;
        const peakH = h * (0.1 + layer * 0.1 + rng() * 0.25);
        ctx.lineTo(mx - 15, h - peakH - rng() * 20);
        ctx.lineTo(mx,      h * (0.4 + layer * 0.1));
      }
      ctx.lineTo(w + 200, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Fog gradient ──────────────────────────────────────────────
  function drawFogGradient(ctx, w, h, density, color) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    const c    = color || 'rgba(200,210,220,';
    const d    = density || 0.5;
    grad.addColorStop(0,   c + d.toFixed(2) + ')');
    grad.addColorStop(0.3, c + (d * 0.4).toFixed(2) + ')');
    grad.addColorStop(0.7, c + (d * 0.4).toFixed(2) + ')');
    grad.addColorStop(1,   c + d.toFixed(2) + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Main composite render ─────────────────────────────────────
  function renderBackground(ctx, w, h, options) {
    const opts      = options || {};
    const preset    = opts.skyPreset    || 'day_clear';
    const cameraX   = opts.cameraX     || 0;
    const tick      = opts.tick        || 0;
    const moonPhase = opts.moonPhase   || 4;
    const isNight   = preset.startsWith('night');
    const isUnder   = preset === 'underwater';
    const isVolcano = preset === 'volcano';

    drawSkyGradient(ctx, w, h, preset);

    if (isNight) {
      drawStars(ctx, tick, cameraX);
      drawAurora(ctx, w, h, tick);
      drawMoon(ctx, w * 0.8, h * 0.15, 30, moonPhase);
    } else if (!isUnder && !isVolcano) {
      drawSun(ctx, w * 0.75, h * 0.12, 28, 12, tick);
      drawClouds(ctx, w, h, tick, cameraX);
    }

    if (isUnder) drawUnderwaterCaustics(ctx, w, h, tick);
    if (isVolcano) drawVolcanoAshCloud(ctx, w * 0.3, h * 0.2, w * 0.4, tick);

    drawMountainLayers(ctx, w, h, 3, cameraX, preset);

    if (opts.showCity) drawCitySkyline(ctx, w, h, opts.citySeed || 1, cameraX);
    if (opts.fogDensity) drawFogGradient(ctx, w, h, opts.fogDensity, opts.fogColor);
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    renderBackground,
    drawSkyGradient,
    drawSun,
    drawMoon,
    drawStars,
    drawAurora,
    drawClouds,
    drawUnderwaterCaustics,
    drawVolcanoAshCloud,
    drawCitySkyline,
    drawMountainLayers,
    drawFogGradient,
    initStars,
    initClouds,
    SKY_PRESETS
  };
})();

// ============================================================
// SHADER_SIMULATION — Canvas 2D shader effect simulation (~35KB)
// ============================================================
const SHADER_SIMULATION = (function() {
  'use strict';

  // ── Color correction matrices ────────────────────────────────
  const COLOR_MATRICES = {
    normal: [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0],
    sepia:  [0.393,0.769,0.189,0,0, 0.349,0.686,0.168,0,0, 0.272,0.534,0.131,0,0, 0,0,0,1,0],
    cool:   [0.8,0,0.2,0,0, 0,0.9,0.1,0,0, 0.1,0.1,1.1,0,0, 0,0,0,1,0],
    warm:   [1.2,0.1,0,0,0, 0.1,1.0,0,0,0, 0,0,0.8,0,0, 0,0,0,1,0],
    vivid:  [1.3,0,0,0,-15, 0,1.3,0,0,-15, 0,0,1.3,0,-15, 0,0,0,1,0],
    noir:   [0.3,0.59,0.11,0,0, 0.3,0.59,0.11,0,0, 0.3,0.59,0.11,0,0, 0,0,0,1,0]
  };

  // ── Vignette ─────────────────────────────────────────────────
  function drawVignette(ctx, w, h, strength) {
    ctx.save();
    const s    = strength || 0.5;
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
    grad.addColorStop(0,   'rgba(0,0,0,0)');
    grad.addColorStop(0.5, `rgba(0,0,0,${(s * 0.2).toFixed(2)})`);
    grad.addColorStop(1,   `rgba(0,0,0,${s.toFixed(2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── Scanlines ────────────────────────────────────────────────
  function drawScanlines(ctx, w, h, alpha, spacing) {
    ctx.save();
    ctx.globalAlpha = alpha || 0.08;
    ctx.fillStyle   = '#000000';
    const sp = spacing || 2;
    for (let y = 0; y < h; y += sp * 2) {
      ctx.fillRect(0, y, w, sp);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Chromatic aberration ─────────────────────────────────────
  function drawChromaticAberration(ctx, sourceCanvas, offsetX, offsetY) {
    ctx.save();
    // Red channel shifted left
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sourceCanvas, -offsetX, 0);
    // Blue channel shifted right
    ctx.drawImage(sourceCanvas,  offsetX, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Pixel art mode ────────────────────────────────────────────
  function drawPixelated(ctx, sourceCanvas, pixelSize, destW, destH) {
    const ps = pixelSize || 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const smallW = Math.ceil(destW / ps);
    const smallH = Math.ceil(destH / ps);
    // Draw small version then scale up
    ctx.drawImage(sourceCanvas, 0, 0, smallW, smallH);
    ctx.drawImage(ctx.canvas, 0, 0, smallW, smallH, 0, 0, destW, destH);
    ctx.restore();
  }

  // ── Noise grain ──────────────────────────────────────────────
  let _grainCanvas = null;
  let _grainCtx    = null;

  function drawNoise(ctx, w, h, intensity, tick) {
    // Regenerate noise each frame
    if (!_grainCanvas || _grainCanvas.width !== w || _grainCanvas.height !== h) {
      _grainCanvas        = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(w, h)
        : { width: w, height: h, getContext: () => null };
      if (typeof document !== 'undefined' && !_grainCanvas.getContext) {
        _grainCanvas = document.createElement('canvas');
        _grainCanvas.width  = w;
        _grainCanvas.height = h;
      }
      _grainCtx = _grainCanvas.getContext ? _grainCanvas.getContext('2d') : null;
    }
    if (!_grainCtx) return;
    // Use fast pseudo-random based on tick to vary grain each frame
    const seed   = (tick || 0) * 6364136223846793005;
    const imgData = _grainCtx.createImageData(w, h);
    const data   = imgData.data;
    let rng      = seed;
    for (let i = 0; i < data.length; i += 4) {
      rng = (rng * 6364136223846793005 + 1442695040888963407) | 0;
      const noise = ((rng >>> 24) / 255) * (intensity || 0.08) * 255;
      data[i]     = noise;
      data[i + 1] = noise;
      data[i + 2] = noise;
      data[i + 3] = Math.floor(noise * 0.5);
    }
    _grainCtx.putImageData(imgData, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = intensity || 0.08;
    ctx.drawImage(_grainCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Rim lighting ─────────────────────────────────────────────
  function drawRimLight(ctx, x, y, w, h, angle, color) {
    ctx.save();
    const rimX  = x + Math.cos(angle + Math.PI) * w * 0.6;
    const rimY  = y + Math.sin(angle + Math.PI) * h * 0.6;
    const grad  = ctx.createRadialGradient(rimX, rimY, 0, rimX, rimY, Math.max(w, h) * 0.6);
    grad.addColorStop(0, color || 'rgba(255,220,100,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(x - w, y - h, w * 3, h * 3);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ── Specular highlight ────────────────────────────────────────
  function drawSpecular(ctx, x, y, r, lightAngle, intensity) {
    const sx   = x + Math.cos(lightAngle) * r * 0.4;
    const sy   = y + Math.sin(lightAngle) * r * 0.4;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.5);
    grad.addColorStop(0, `rgba(255,255,255,${(intensity || 0.6).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ── Normal map approximation ─────────────────────────────────
  function drawNormalMapLighting(ctx, x, y, w, h, surfaceAngle, lightX, lightY) {
    ctx.save();
    const lightDX = lightX - (x + w / 2);
    const lightDY = lightY - (y + h / 2);
    const lightDist = Math.sqrt(lightDX * lightDX + lightDY * lightDY);
    const normalX   = Math.cos(surfaceAngle + Math.PI / 2);
    const normalY   = Math.sin(surfaceAngle + Math.PI / 2);
    const dot       = (lightDX / lightDist) * normalX + (lightDY / lightDist) * normalY;
    const diffuse   = Math.max(0, dot);
    const shadow    = 1 - diffuse;
    ctx.fillStyle   = `rgba(0,0,0,${(shadow * 0.5).toFixed(2)})`;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // ── Gradient mesh ────────────────────────────────────────────
  function drawGradientMesh(ctx, meshPoints, w, h) {
    // meshPoints: [{ x, y, color }]
    if (!meshPoints || meshPoints.length < 2) return;
    ctx.save();
    for (let i = 0; i < meshPoints.length - 1; i++) {
      const a    = meshPoints[i];
      const b    = meshPoints[i + 1];
      const grad = GradyanDeposu.lin(ctx, a.x * w, a.y * h, b.x * w, b.y * h, [0, a.color, 1, b.color]);
      ctx.fillStyle = grad;
      ctx.fillRect(a.x * w, a.y * h, (b.x - a.x) * w || w, (b.y - a.y) * h || h);
    }
    ctx.restore();
  }

  // ── Motion trail ─────────────────────────────────────────────
  const _trailFrames = [];
  const MAX_TRAIL_FRAMES = 8;

  function pushTrailFrame(canvas) {
    _trailFrames.push(canvas);
    if (_trailFrames.length > MAX_TRAIL_FRAMES) _trailFrames.shift();
  }

  function drawMotionTrail(ctx, x, y) {
    ctx.save();
    for (let i = 0; i < _trailFrames.length; i++) {
      const alpha = ((i + 1) / _trailFrames.length) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.drawImage(_trailFrames[i], x || 0, y || 0);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Color correction (CSS filter fallback) ───────────────────
  function applyCSSColorCorrection(canvas, mode) {
    if (!canvas) return;
    switch (mode) {
      case 'sepia':  canvas.style.filter = 'sepia(1)';             break;
      case 'cool':   canvas.style.filter = 'hue-rotate(-20deg)';   break;
      case 'warm':   canvas.style.filter = 'hue-rotate(15deg) saturate(1.2)'; break;
      case 'vivid':  canvas.style.filter = 'saturate(1.6) contrast(1.1)'; break;
      case 'noir':   canvas.style.filter = 'grayscale(1) contrast(1.2)'; break;
      default:       canvas.style.filter = 'none';
    }
  }

  // ── Full post-process pass ────────────────────────────────────
  function applyPostProcess(ctx, w, h, options) {
    const opts = options || {};
    if (opts.vignette)  drawVignette(ctx, w, h, opts.vignette);
    if (opts.scanlines) drawScanlines(ctx, w, h, opts.scanlines);
    if (opts.grain)     drawNoise(ctx, w, h, opts.grain, opts.tick || 0);
    if (opts.rimLight)  drawRimLight(ctx, opts.rimLight.x, opts.rimLight.y,
                                     opts.rimLight.w, opts.rimLight.h,
                                     opts.rimLight.angle, opts.rimLight.color);
  }

  // ── Coordinate snap for pixel art ────────────────────────────
  function snapToGrid(val, gridSize) {
    return Math.round(val / gridSize) * gridSize;
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    applyPostProcess,
    drawVignette,
    drawScanlines,
    drawChromaticAberration,
    drawNoise,
    drawRimLight,
    drawSpecular,
    drawNormalMapLighting,
    drawGradientMesh,
    pushTrailFrame,
    drawMotionTrail,
    applyCSSColorCorrection,
    drawPixelated,
    snapToGrid,
    COLOR_MATRICES,

    // Convenience color matrix getter
    getColorMatrix(mode) { return COLOR_MATRICES[mode] || COLOR_MATRICES.normal; },

    // Composite effect: film look
    applyFilmLook(ctx, w, h, tick) {
      drawVignette(ctx, w, h, 0.45);
      drawScanlines(ctx, w, h, 0.05);
      drawNoise(ctx, w, h, 0.04, tick);
    },

    // Composite effect: retro arcade
    applyRetroArcade(ctx, w, h, tick) {
      drawScanlines(ctx, w, h, 0.15, 3);
      drawVignette(ctx, w, h, 0.6);
      drawNoise(ctx, w, h, 0.06, tick);
    }
  };
})();


// ================================================================
// RENDERER_DEBUG_TOOLS — Visual debugging overlays
// ================================================================
const RENDERER_DEBUG_TOOLS = (() => {
  let _enabled = false;
  const _watches = {};
  let _frameCount = 0;
  let _fpsHistory = [];
  let _lastFpsTime = Date.now();
  let _fpsTick = 0;

  function enable()  { _enabled = true; }
  function disable() { _enabled = false; }
  function toggle()  { _enabled = !_enabled; return _enabled; }
  function isEnabled(){ return _enabled; }

  function watch(key, valueFn) { _watches[key] = valueFn; }
  function unwatch(key)        { delete _watches[key]; }

  function tickFrame() {
    _frameCount++;
    _fpsTick++;
    const now = Date.now();
    if (now - _lastFpsTime >= 1000) {
      _fpsHistory.push(_fpsTick);
      if (_fpsHistory.length > 60) _fpsHistory.shift();
      _fpsTick = 0;
      _lastFpsTime = now;
    }
  }

  function getFps() {
    if (!_fpsHistory.length) return 0;
    return Math.round(_fpsHistory.reduce((a,b)=>a+b,0)/_fpsHistory.length);
  }

  function drawOverlay(ctx, x, y) {
    if (!_enabled) return;
    const lines = [
      `FPS: ${getFps()}`,
      `Frame: ${_frameCount}`,
      ...Object.entries(_watches).map(([k,fn]) => {
        try { return `${k}: ${fn()}`; } catch(e) { return `${k}: ERR`; }
      })
    ];
    ctx.save();
    ctx.font = '11px monospace';
    const lineH = 16, padding = 8;
    const w = 180, h = lines.length * lineH + padding * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x || 8, y || 8, w, h);
    ctx.fillStyle = '#00FF00';
    lines.forEach((line, i) => {
      ctx.fillText(line, (x||8)+padding, (y||8)+padding + i*lineH + 11);
    });
    ctx.restore();
  }

  function drawCollisionBoxes(ctx, objects, color) {
    if (!_enabled) return;
    ctx.save();
    ctx.strokeStyle = color || 'rgba(255,0,0,0.7)';
    ctx.lineWidth = 1;
    for (const o of objects) {
      if (o.x !== undefined && o.y !== undefined) {
        const w = o.width  || o.r*2 || 20;
        const h = o.height || o.r*2 || 20;
        ctx.strokeRect(o.x - w/2, o.y - h/2, w, h);
      }
    }
    ctx.restore();
  }

  function drawVectors(ctx, origin, vectors, scale, colors) {
    if (!_enabled) return;
    ctx.save();
    const defaultColors = ['#FF0000','#00FF00','#0000FF','#FFFF00'];
    vectors.forEach((v, i) => {
      const col = (colors && colors[i]) || defaultColors[i % defaultColors.length];
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(origin.x + v.x * (scale||1), origin.y + v.y * (scale||1));
      ctx.stroke();
      // Arrow head
      const angle = Math.atan2(v.y, v.x);
      const len = 8;
      ctx.beginPath();
      ctx.moveTo(origin.x + v.x*(scale||1), origin.y + v.y*(scale||1));
      ctx.lineTo(origin.x + v.x*(scale||1) - len*Math.cos(angle-0.4), origin.y + v.y*(scale||1) - len*Math.sin(angle-0.4));
      ctx.moveTo(origin.x + v.x*(scale||1), origin.y + v.y*(scale||1));
      ctx.lineTo(origin.x + v.x*(scale||1) - len*Math.cos(angle+0.4), origin.y + v.y*(scale||1) - len*Math.sin(angle+0.4));
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawGrid(ctx, camX, camY, cellSize, W, H) {
    if (!_enabled) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    const cs = cellSize || 100;
    const startX = Math.floor(camX/cs)*cs - camX;
    const startY = Math.floor(camY/cs)*cs - camY;
    for (let x=startX; x<W; x+=cs) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=startY; y<H; y+=cs) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    ctx.restore();
  }

  return { enable, disable, toggle, isEnabled, watch, unwatch, tickFrame, getFps, drawOverlay, drawCollisionBoxes, drawVectors, drawGrid };
})();

// ================================================================
// RENDERER_PALETTE — Canvas drawing utility library
// ================================================================
const RENDERER_PALETTE = (() => {
  function roundRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r||8, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rad, y);
    ctx.lineTo(x+w-rad, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+rad);
    ctx.lineTo(x+w, y+h-rad);
    ctx.quadraticCurveTo(x+w, y+h, x+w-rad, y+h);
    ctx.lineTo(x+rad, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-rad);
    ctx.lineTo(x, y+rad);
    ctx.quadraticCurveTo(x, y, x+rad, y);
    ctx.closePath();
  }

  function fillRoundRect(ctx, x, y, w, h, r, fill) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill || '#000';
    ctx.fill();
    ctx.restore();
  }

  function strokeRoundRect(ctx, x, y, w, h, r, stroke, lineWidth) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke || '#fff';
    ctx.lineWidth = lineWidth || 1;
    ctx.stroke();
    ctx.restore();
  }

  function progressBar(ctx, x, y, w, h, pct, bgColor, fgColor, radius) {
    fillRoundRect(ctx, x, y, w, h, radius||h/2, bgColor||'#222');
    if (pct > 0) fillRoundRect(ctx, x, y, Math.max(h, w * Math.min(1,pct)), h, radius||h/2, fgColor||'#FFD700');
  }

  function glowText(ctx, text, x, y, color, glowColor, glowSize, font) {
    ctx.save();
    if (font) ctx.font = font;
    ctx.shadowColor  = glowColor || color;
    ctx.shadowBlur   = glowSize || 8;
    ctx.fillStyle    = color || '#fff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function gradientFill(ctx, x, y, w, h, colors, vertical) {
    const grd = vertical
      ? ctx.createLinearGradient(x, y, x, y+h)
      : ctx.createLinearGradient(x, y, x+w, y);
    colors.forEach((c, i) => grd.addColorStop(i/(colors.length-1), c));
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);
  }

  function circle(ctx, cx, cy, r, fill, stroke, lineWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    if (fill)   { ctx.fillStyle=fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=lineWidth||1; ctx.stroke(); }
    ctx.restore();
  }

  function ring(ctx, cx, cy, outerR, innerR, startAngle, endAngle, color, lineWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color || '#FFD700';
    ctx.fill();
    ctx.restore();
  }

  function hexagon(ctx, cx, cy, r, fill, stroke) {
    ctx.save();
    ctx.beginPath();
    for (let i=0; i<6; i++) {
      const a = (i/6)*Math.PI*2 - Math.PI/6;
      i===0 ? ctx.moveTo(cx+r*Math.cos(a), cy+r*Math.sin(a))
            : ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
    }
    ctx.closePath();
    if (fill)   { ctx.fillStyle=fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle=stroke; ctx.lineWidth=1.5; ctx.stroke(); }
    ctx.restore();
  }

  return { roundRect, fillRoundRect, strokeRoundRect, progressBar, glowText, gradientFill, circle, ring, hexagon };
})();


// ================================================================
// RENDERER_LIGHT_MAP — Precomputed light map for static terrain
// ================================================================
const RENDERER_LIGHT_MAP = (() => {
  let _canvas = null;
  let _ctx    = null;
  let _width  = 0;
  let _height = 0;

  function init(width, height) {
    _canvas = document.createElement('canvas');
    _canvas.width  = _width  = width;
    _canvas.height = _height = height;
    _ctx = _canvas.getContext('2d');
  }

  function clear() { if(_ctx) _ctx.clearRect(0,0,_width,_height); }

  function addPointLight(x, y, radius, color, intensity) {
    if (!_ctx) return;
    const grad = _ctx.createRadialGradient(x,y,0,x,y,radius);
    const alpha = Math.min(1, intensity||0.8);
    // Parse color to rgba
    grad.addColorStop(0, color.replace(')',`,${alpha})`).replace('rgb(','rgba('));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    _ctx.globalCompositeOperation = 'source-over';
    _ctx.fillStyle = grad;
    _ctx.beginPath();
    _ctx.arc(x,y,radius,0,Math.PI*2);
    _ctx.fill();
  }

  function addDirectionalLight(direction, color, intensity, terrainPoints) {
    if (!_ctx || !terrainPoints) return;
    // Simple normal-based diffuse for each terrain point
    const cos = Math.cos(direction);
    const sin = Math.sin(direction);
    _ctx.globalCompositeOperation = 'source-over';
    for (let i=1; i<terrainPoints.length; i++) {
      const a = terrainPoints[i-1], b = terrainPoints[i];
      const dx = b.x-a.x, dy = b.y-a.y;
      const len = Math.sqrt(dx*dx+dy*dy)||1;
      const nx = -dy/len, ny = dx/len;
      const dot = Math.max(0, nx*cos+ny*sin);
      const alpha = dot*(intensity||0.5);
      if (alpha < 0.02) continue;
      _ctx.strokeStyle = color.replace(')',`,${alpha.toFixed(2)})`).replace('rgb(','rgba(');
      _ctx.lineWidth = 3;
      _ctx.beginPath();
      _ctx.moveTo(a.x, a.y);
      _ctx.lineTo(b.x, b.y);
      _ctx.stroke();
    }
  }

  function addAmbientOcclusion(terrainPoints, radius, strength) {
    if (!_ctx || !terrainPoints) return;
    // Darken concave areas
    _ctx.globalCompositeOperation = 'multiply';
    for (let i=1; i<terrainPoints.length-1; i++) {
      const prev = terrainPoints[i-1], curr = terrainPoints[i], next = terrainPoints[i+1];
      const dy1 = curr.y - prev.y;
      const dy2 = next.y - curr.y;
      const concavity = dy2 - dy1;
      if (concavity > 2) {
        const s = Math.min(0.4, concavity*(strength||0.02));
        const grad = GradyanDeposu.rad(_ctx, curr.x, curr.y, 0, curr.x, curr.y, radius||40, [0, `rgba(0,0,0,${s.toFixed(3)})`, 1, 'rgba(0,0,0,0)']);
        _ctx.fillStyle = grad;
        _ctx.beginPath();
        _ctx.arc(curr.x,curr.y,radius||40,0,Math.PI*2);
        _ctx.fill();
      }
    }
    _ctx.globalCompositeOperation = 'source-over';
  }

  function apply(targetCtx, x, y) {
    if (!_canvas) return;
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'multiply';
    targetCtx.globalAlpha = 0.6;
    targetCtx.drawImage(_canvas, x||0, y||0);
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.globalAlpha = 1;
    targetCtx.restore();
  }

  function getCanvas() { return _canvas; }

  return { init, clear, addPointLight, addDirectionalLight, addAmbientOcclusion, apply, getCanvas };
})();

// ================================================================
// RENDERER_SPRITE_ATLAS — Sprite atlas management for game objects
// ================================================================
const RENDERER_SPRITE_ATLAS = (() => {
  const _sprites  = {};
  const _atlases  = {};

  function addAtlas(name, image, frames) {
    // frames: [{id, x, y, w, h, anchorX, anchorY}]
    _atlases[name] = { image, frames:{} };
    for (const f of (frames||[])) _atlases[name].frames[f.id] = f;
  }

  function addSprite(id, image, anchorX, anchorY) {
    _sprites[id] = { image, anchorX:anchorX||0.5, anchorY:anchorY||0.5 };
  }

  function drawSprite(ctx, id, x, y, w, h, angle, alpha, flipH) {
    const sp = _sprites[id];
    if (!sp || !sp.image) return;
    ctx.save();
    ctx.globalAlpha   = alpha !== undefined ? alpha : 1;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    if (flipH) ctx.scale(-1,1);
    ctx.drawImage(sp.image, -(w||32)*sp.anchorX, -(h||32)*sp.anchorY, w||32, h||32);
    ctx.restore();
  }

  function drawAtlasFrame(ctx, atlasName, frameId, x, y, w, h, angle, alpha, flipH) {
    const atlas = _atlases[atlasName];
    if (!atlas || !atlas.image) return;
    const frame = atlas.frames[frameId];
    if (!frame) return;
    const dw = w||frame.w, dh = h||frame.h;
    ctx.save();
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;
    ctx.translate(x,y);
    if (angle) ctx.rotate(angle);
    if (flipH) ctx.scale(-1,1);
    ctx.drawImage(atlas.image, frame.x, frame.y, frame.w, frame.h, -dw*(frame.anchorX||0.5), -dh*(frame.anchorY||0.5), dw, dh);
    ctx.restore();
  }

  function has(id)               { return id in _sprites; }
  function hasAtlas(name)        { return name in _atlases; }
  function hasFrame(name, frameId){ return name in _atlases && frameId in _atlases[name].frames; }
  function getSprite(id)         { return _sprites[id]||null; }
  function getAtlasFrame(n,id)   { return _atlases[n]?.frames[id]||null; }
  function listSprites()         { return Object.keys(_sprites); }
  function listAtlases()         { return Object.keys(_atlases); }

  // Draw a debug placeholder box if sprite is missing
  function drawFallback(ctx, id, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = '#f0f';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x-(w||32)/2, y-(h||32)/2, w||32, h||32);
    ctx.fillStyle   = 'rgba(255,0,255,0.1)';
    ctx.fillRect(x-(w||32)/2, y-(h||32)/2, w||32, h||32);
    ctx.fillStyle   = '#f0f';
    ctx.font        = '8px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(id.substring(0,12), x, y);
    ctx.restore();
  }

  function drawAuto(ctx, id, x, y, w, h, angle, alpha, flipH) {
    if (has(id)) drawSprite(ctx,id,x,y,w,h,angle,alpha,flipH);
    else         drawFallback(ctx,id,x,y,w,h);
  }

  return { addAtlas, addSprite, drawSprite, drawAtlasFrame, has, hasAtlas, hasFrame, getSprite, getAtlasFrame, listSprites, listAtlases, drawFallback, drawAuto };
})();

// ================================================================
// RENDERER_TRAIL_SYSTEM — Vehicle wheel/exhaust trail rendering
// ================================================================
const RENDERER_TRAIL_SYSTEM = (() => {
  const _trails = new Map(); // id -> {points:[{x,y,alpha,w}], maxPoints, color, width}

  function createTrail(id, color, width, maxPoints) {
    _trails.set(id, { points:[], color:color||'rgba(80,80,80,0.6)', width:width||4, maxPoints:maxPoints||60 });
  }

  function removeTrail(id) { _trails.delete(id); }

  function addPoint(id, x, y, active) {
    const trail = _trails.get(id);
    if (!trail) return;
    if (!active) {
      // Fade out existing trail tail
      for (const p of trail.points) p.alpha = Math.max(0, p.alpha - 0.06);
      trail.points = trail.points.filter(p=>p.alpha>0.01);
      return;
    }
    trail.points.push({ x, y, alpha:1 });
    if (trail.points.length > trail.maxPoints) trail.points.shift();
    // Fade earlier points
    const n = trail.points.length;
    for (let i=0;i<n;i++) trail.points[i].alpha = (i+1)/n;
  }

  function update() {
    // Passive fade for all trails
    for (const trail of _trails.values()) {
      for (const p of trail.points) p.alpha = Math.max(0, p.alpha-0.004);
      // Don't remove here — addPoint handles cleanup
    }
  }

  function draw(ctx) {
    for (const trail of _trails.values()) {
      if (trail.points.length < 2) continue;
      const pts = trail.points;
      for (let i=1; i<pts.length; i++) {
        const a = pts[i-1], b = pts[i];
        const alpha = Math.min(a.alpha, b.alpha);
        if (alpha < 0.02) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = trail.color;
        ctx.lineWidth   = trail.width * alpha;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function clearTrail(id) { const t=_trails.get(id); if(t) t.points=[]; }
  function clearAll()     { for(const t of _trails.values()) t.points=[]; }
  function count()        { return _trails.size; }
  function getTotalPoints(){ let s=0; for(const t of _trails.values()) s+=t.points.length; return s; }

  return { createTrail, removeTrail, addPoint, update, draw, clearTrail, clearAll, count, getTotalPoints };
})();
