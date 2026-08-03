'use strict';
// ═══════════════════════════════════════════════════════════════════════════
//  mprooms.js  —  GERÇEK ZAMANLI HİSSİYATLI ÇOK OYUNCULU (Oda / Lobi)
//  ---------------------------------------------------------------------------
//  Gerçek bir backend YOK. "Canlı yarış" hissini vermek için:
//   • LOBİ: oda oluştur/katıl, 3-5 YAPAY rakip (isim/renk/beceri havuzundan).
//   • YARIŞ: rakipler senle AYNI ANDA canlı ilerler (hız profili + rastgelelik +
//     lastik-bant / rubber-band), gerçek zamanlı sıralama HUD'u, ekranda rakip
//     araçları/işaretçileri.
//   • BİTİŞ: sıralama + yer'e göre ödül (altın/elmas/kupa), yeniden oyna / lobi.
//
//  Tamamen kendi kendine yeten `MPRooms` objesi. İsteğe bağlı olarak mevcut
//  `Multiplayer` hayalet havuzunu rakip TOHUMU olarak kullanır (varsa).
//  localStorage KULLANMAZ. Tüm sayısal işlemlerde NaN koruması vardır.
//
//  Genel API:
//    MPRooms.openLobby()                → lobiyi (yeniden) kur
//    MPRooms.drawLobby(ctx, W, H)       → lobi ekranını çiz
//    MPRooms.handleClick(x, y)          → lobi + bitiş ekranı tıklamaları
//    MPRooms.startRace()                → yarışı başlat (Game.startRun + oyun modu)
//    MPRooms.update(dt)                 → rakip pozisyonları + bitiş mantığı
//    MPRooms.drawRace(ctx, camera)      → rakip araçlarını/işaretçilerini çiz
//    MPRooms.drawHUD(ctx, W, H)         → canlı sıralama + bitiş sonuç panosu
//    MPRooms.isActive()                 → bir MP yarışı sürüyor/bitti mi?
// ═══════════════════════════════════════════════════════════════════════════
const MPRooms = {
  // ── Tema (oyunun koyu/turuncu paleti) ──
  C: {
    bg0:'#12070a', bg1:'#05060c', panel:'rgba(14,10,20,0.82)',
    card:'rgba(22,16,28,0.9)', line:'rgba(255,255,255,0.10)',
    fire:'#ff5a1e', hot:'#ff8a2b', amber:'#ffb020', gold:'#ffd24a',
    green:'#2ecc71', text:'#eef2fb', dim:'#9aa4c0', you:'#ff3d00'
  },
  // Rakip renk paleti (birbirinden ayırt edilebilir, temayla uyumlu)
  PALETTE: ['#ff8a3d', '#5bd0ff', '#a0ff5b', '#ff5bd0', '#c05bff', '#ffd24a'],
  COLOR_NAMES: ['Turuncu', 'Mavi', 'Yeşil', 'Pembe', 'Mor', 'Sarı'],
  // Multiplayer yoksa yedek isim havuzu (özgün, tekrarsız)
  FALLBACK_NAMES: ['Kaan', 'Zeynep', 'Mert', 'Elif', 'Burak', 'Deniz', 'Ada',
    'Emir', 'Ceren', 'Arda', 'Yusuf', 'Ece', 'Baran', 'Nil', 'Toprak', 'Poyraz'],

  // ── Durum ──
  active:   false,           // bir MP oturumu var mı (lobi/yarış/bitiş)
  phase:    'lobby',         // 'lobby' | 'racing' | 'finished'
  roomId:   '',
  mapId:    'countryside',
  vehicleId:'jeep',
  raceMeters: 1200,          // yarış hedef mesafesi (m)
  opponents: [],             // rakip dizisi
  results:   [],             // bitişte hesaplanan sıralama
  timeLimit: 150,            // güvenlik: en fazla süre (s)

  _startX:  200,             // yarış başlangıç dünya-x'i (Game.startX)
  _clock:   0,               // yarış saati (geri sayım bittikten sonra)
  _playerFinished: false,
  _playerFinishTime: null,
  _awarded: false,           // ödül bir kez verilsin
  _seedBase: 0,              // rakip tohumu ofseti (yeni odada değişir)
  _lobbyBtns: [],            // lobi buton hit-kutuları
  _finishBtns: [],           // bitiş ekranı buton hit-kutuları
  _cdEnd:   0,               // lobi geri sayım bitiş zaman damgası (ms); 0 = pasif
  _now:     0,               // en son wall-clock (ms)

  // ── Küçük yardımcılar ──
  _clamp(v, lo, hi) { v = +v; if (!isFinite(v)) v = lo; return v < lo ? lo : v > hi ? hi : v; },
  _num(v, d) { v = +v; return isFinite(v) ? v : (d || 0); },
  _rand(a, b) { return a + Math.random() * (b - a); },
  _wall() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  },

  // Multiplayer profilinden tempo imzası çek (yoksa dengeli varsayılan)
  _profileParams(id) {
    try {
      if (typeof Multiplayer !== 'undefined' && Array.isArray(Multiplayer.PROFILES)) {
        const p = Multiplayer.PROFILES.find(x => x && x.id === id);
        if (p) return { amp: this._num(p.paceAmp, 0.12), hz: this._num(p.paceHz, 0.5) };
      }
    } catch (e) {}
    return { amp: 0.12, hz: 0.5 };
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  LOBİ
  // ═════════════════════════════════════════════════════════════════════════

  // Lobiyi (yeniden) kur: yeni oda + 3-5 rakip. Menü/mod girişinden çağrılır.
  openLobby() {
    this.active = true;
    this.phase  = 'lobby';
    this._cdEnd = 0;
    this._awarded = false;
    this._playerFinished = false;
    this._playerFinishTime = null;
    this._clock = 0;
    this.results = [];

    // Seçili araç + seçili haritayı (map-select karuselinden) yakala
    try {
      this.vehicleId = (typeof SaveData !== 'undefined' && SaveData.get &&
        SaveData.get('selectedVehicle')) || 'jeep';
    } catch (e) { this.vehicleId = 'jeep'; }
    try {
      const maps = (typeof SaveData !== 'undefined' && SaveData._ALL_MAPS) || ['countryside'];
      let idx = 0;
      if (typeof UI !== 'undefined' && typeof UI._carMapTarget === 'number') idx = Math.round(UI._carMapTarget);
      idx = this._clamp(idx, 0, maps.length - 1) | 0;
      this.mapId = maps[idx] || 'countryside';
    } catch (e) { this.mapId = 'countryside'; }

    // Oda kimliği + hedef mesafe + rakip kadrosu
    this.roomId = this._makeRoomId();
    this.raceMeters = Math.round(this._rand(800, 1500) / 100) * 100;   // 800..1500 (100'lük)
    this._seedBase = (Math.random() * 1e6) | 0;
    const n = 3 + ((Math.random() * 3) | 0);                           // 3..5 rakip
    this.opponents = this._makeOpponents(n);
  },

  _makeRoomId() {
    const chars = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += chars[(Math.random() * chars.length) | 0];
    return '#' + s;
  },

  // n yapay rakip üret (Multiplayer tohumu varsa ondan isim/beceri/profil çeker)
  _makeOpponents(n) {
    n = this._clamp(n, 3, 5) | 0;
    const out = [];
    for (let i = 0; i < n; i++) {
      let g = null;
      try {
        if (typeof Multiplayer !== 'undefined' && Multiplayer._seedGhost) {
          g = Multiplayer._seedGhost(this.mapId, this._seedBase + i * 7 + 1, null);
        }
      } catch (e) { g = null; }

      const skill = g ? this._clamp(g.skill, 0, 1) : this._rand(0.15, 0.95);
      const profId = (g && g.profile) || 'dengeli';
      const pp = this._profileParams(profId);
      const ci = i % this.PALETTE.length;
      const name = (g && g.name) ||
        this.FALLBACK_NAMES[(i * 3 + ((Math.random() * this.FALLBACK_NAMES.length) | 0)) % this.FALLBACK_NAMES.length];

      out.push({
        name: name,
        skill: skill,
        profile: profId,
        flair: (g && g.flair) || '🏎️',
        vehicleId: (g && g.vehicleId) || 'jeep',
        color: this.PALETTE[ci],
        colorName: this.COLOR_NAMES[ci],
        ready: true,                                   // yapay rakipler hazır
        // hız modeli
        baseSpeed: 205 + skill * 380 + this._rand(-25, 45),   // px/s
        pAmp: this._clamp(pp.amp * this._rand(0.7, 1.25), 0, 0.6),
        pHz:  this._clamp(pp.hz * this._rand(0.8, 1.25), 0.05, 2.5),
        pPh:  this._rand(0, 6.283),
        // yarış durumu
        x: this._startX,
        t: 0,
        finished: false,
        finishTime: null,
        place: 0
      });
    }
    return out;
  },

  // Lobi ekranı — koyu/turuncu tema. handleClick için buton kutularını kaydeder.
  drawLobby(ctx, W, H) {
    if (!ctx) return;
    if (!this.opponents || !this.opponents.length) this.openLobby();
    this._now = this._wall();

    // Lobi geri sayımı bittiyse yarışı başlat
    if (this._cdEnd && this._now >= this._cdEnd) { this._cdEnd = 0; this.startRace(); return; }

    W = this._num(W, 800); H = this._num(H, 600);
    const C = this.C;
    this._lobbyBtns = [];

    // Arka plan
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.bg0); bg.addColorStop(1, C.bg1);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // hafif turuncu ışıma
    const glow = ctx.createRadialGradient(W / 2, H * 0.18, 20, W / 2, H * 0.18, H * 0.6);
    glow.addColorStop(0, 'rgba(255,120,30,0.16)'); glow.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // Başlık
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C.amber;
    ctx.font = '900 26px Impact, "Arial Black", sans-serif';
    ctx.fillText('🏁 CANLI YARIŞ ODASI', W / 2, 40);
    ctx.fillStyle = C.dim; ctx.font = 'bold 13px Arial';
    ctx.fillText('Oda ' + this.roomId + '  ·  ' + this._mapName() + '  ·  Hedef ' + this.raceMeters + ' m',
      W / 2, 66);

    // Kart alanı
    const cardW = Math.min(440, W - 32);
    const cardX = (W - cardW) / 2;
    let y = 92;
    const rowH = 42;
    const rows = this.opponents.length + 1;              // +1 = sen
    const listH = rows * (rowH + 6) + 14;

    ctx.fillStyle = C.panel;
    ctx.beginPath(); ctx.roundRect(cardX, y, cardW, listH, 14); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();

    let ry = y + 14;
    // Oyuncu satırı (SEN)
    this._drawRacerRow(ctx, cardX + 12, ry, cardW - 24, rowH,
      { name: 'SEN', flair: '⭐', color: C.you, skill: 0.7, ready: true }, true);
    ry += rowH + 6;
    // Rakip satırları
    for (let i = 0; i < this.opponents.length; i++) {
      this._drawRacerRow(ctx, cardX + 12, ry, cardW - 24, rowH, this.opponents[i], false);
      ry += rowH + 6;
    }

    // Butonlar
    const by = y + listH + 18;
    const bw = (cardW - 12) / 2;
    // GERİ
    this._lobbyBtn(ctx, 'back', cardX, by, bw, 46, '⬅ GERİ', C.card, C.text, C.line);
    // YENİ ODA
    this._lobbyBtn(ctx, 'reroll', cardX + bw + 12, by, bw, 46, '🎲 YENİ ODA', C.card, C.hot, 'rgba(255,138,43,0.4)');
    // HAZIR / BAŞLA (tam genişlik)
    const rdy = !!this._cdEnd;
    this._lobbyBtn(ctx, 'ready', cardX, by + 56, cardW, 52,
      rdy ? '⏳ HAZIRLANIYOR…' : '✅ HAZIR — YARIŞA BAŞLA',
      rdy ? 'rgba(120,80,10,0.9)' : C.fire, '#fff', 'rgba(255,215,74,0.5)');

    // Geri sayım kaplaması
    if (this._cdEnd) {
      const rem = Math.max(0, (this._cdEnd - this._now) / 1000);
      const n = Math.ceil(rem);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      const frac = rem - Math.floor(rem);
      const scale = 1.6 - frac * 0.6;
      ctx.translate(W / 2, H * 0.42); ctx.scale(scale, scale);
      ctx.font = '900 96px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(String(Math.max(1, n)), 0, 0);
      ctx.fillStyle = C.gold; ctx.fillText(String(Math.max(1, n)), 0, 0);
      ctx.restore();
      ctx.fillStyle = C.text; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
      ctx.fillText('Yarış başlıyor…', W / 2, H * 0.42 + 80);
    }
  },

  // Tek yarışçı satırı (renk noktası + flair + isim + beceri barı + HAZIR rozeti)
  _drawRacerRow(ctx, x, y, w, h, r, isYou) {
    const C = this.C;
    ctx.fillStyle = isYou ? 'rgba(255,61,0,0.14)' : C.card;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    if (isYou) { ctx.strokeStyle = 'rgba(255,90,30,0.55)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    // renk noktası
    ctx.fillStyle = r.color || '#888';
    ctx.beginPath(); ctx.arc(x + 18, y + h / 2, 7, 0, 6.283); ctx.fill();
    // flair + isim
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '16px Arial'; ctx.fillText(r.flair || '🏎️', x + 34, y + h / 2 + 1);
    ctx.fillStyle = isYou ? '#fff' : C.text;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(String(r.name || 'Oyuncu'), x + 58, y + h / 2 + 1);
    // beceri barı (sağda)
    const barW = 78, barX = x + w - barW - 74, barY = y + h / 2 - 3;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, 6, 3); ctx.fill();
    ctx.fillStyle = C.amber;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW * this._clamp(r.skill, 0.05, 1), 6, 3); ctx.fill();
    // HAZIR rozeti
    ctx.textAlign = 'right';
    ctx.fillStyle = r.ready ? C.green : C.dim;
    ctx.font = 'bold 12px Arial';
    ctx.fillText(r.ready ? '● HAZIR' : '○ BEKLE', x + w - 10, y + h / 2 + 1);
  },

  _lobbyBtn(ctx, id, x, y, w, h, label, bg, tc, bd) {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 11); ctx.fill();
    ctx.strokeStyle = bd || this.C.line; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = tc; ctx.font = 'bold 15px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    this._lobbyBtns.push({ id: id, x: x, y: y, w: w, h: h });
  },

  _mapName() {
    // Okunur harita adı (MapSettings varsa oradan, yoksa id'yi başlıklaştır)
    try {
      if (typeof MapSettings !== 'undefined' && MapSettings.name) {
        const nm = MapSettings.name(this.mapId);
        if (nm) return nm;
      }
    } catch (e) {}
    const s = String(this.mapId || 'harita');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  TIKLAMA (lobi + bitiş ekranı). Ana menü dispatch'i buraya yönlendirir.
  //  Dönüş: işlenen aksiyonun kimliği (string) ya da null.
  // ═════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    x = this._num(x, -1); y = this._num(y, -1);

    // Bitiş ekranı butonları
    if (this.phase === 'finished' && this._finishBtns) {
      for (const b of this._finishBtns) {
        if (this._hit(b, x, y)) {
          if (b.id === 'replay') { this.startRace(); return 'replay'; }
          if (b.id === 'lobby')  { this.openLobby(); this._toUI('mprooms'); return 'lobby'; }
          if (b.id === 'menu')   { this.exit(); return 'menu'; }
        }
      }
      return null;
    }

    // Lobi butonları
    if (this.phase === 'lobby' && this._lobbyBtns) {
      for (const b of this._lobbyBtns) {
        if (this._hit(b, x, y)) {
          if (b.id === 'back')   { this.exit(); return 'back'; }
          if (b.id === 'reroll') { if (!this._cdEnd) this.openLobby(); return 'reroll'; }
          if (b.id === 'ready')  {
            if (!this._cdEnd) { this._cdEnd = this._wall() + 3200; if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick(); }
            return 'ready';
          }
        }
      }
    }
    return null;
  },

  _hit(b, x, y) { return b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; },

  // UI ekranına dön (self-contained; UI varsa)
  _toUI(screen) {
    try {
      if (typeof Main !== 'undefined' && Main.setMode) Main.setMode('ui');
      if (typeof UI !== 'undefined' && UI.goTo) UI.goTo(screen || 'menu');
      if (screen === 'menu' && typeof Audio !== 'undefined') {
        if (Audio.stopEngine) Audio.stopEngine();
        if (Audio.playBGM) Audio.playBGM('menu');
      }
    } catch (e) {}
  },

  // MP oturumunu tamamen kapat → ana menü
  exit() {
    this.active = false;
    this.phase = 'lobby';
    this._cdEnd = 0;
    this._toUI('menu');
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  YARIŞ BAŞLAT — gerçek oyun turunu başlatır, rakipleri başlangıç çizgisine koyar
  // ═════════════════════════════════════════════════════════════════════════
  startRace() {
    this.active = true;
    this.phase  = 'racing';
    this._cdEnd = 0;
    this._clock = 0;
    this._awarded = false;
    this._playerFinished = false;
    this._playerFinishTime = null;
    this.results = [];

    // Rakipleri sıfırla (aynı kadro, yeni tempo fazı)
    for (const o of this.opponents) {
      o.t = 0; o.finished = false; o.finishTime = null; o.place = 0;
      o.pPh = this._rand(0, 6.283);
    }

    // Gerçek oyun turunu başlat
    try {
      if (typeof Game !== 'undefined') {
        Game.gameMode = 'ghostmp';
        if (typeof Main !== 'undefined' && Main.setMode) Main.setMode('game');
        if (Game.startRun) Game.startRun(this.vehicleId, this.mapId, false);
        this._startX = this._num(Game.startX, 200);
      }
    } catch (e) { this._startX = 200; }

    // Rakipleri başlangıç dünya-x'ine hizala
    for (const o of this.opponents) o.x = this._startX;
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  GÜNCELLE — rakip pozisyonları + bitiş mantığı. Her karede oyun döngüsünden.
  // ═════════════════════════════════════════════════════════════════════════
  update(dt) {
    if (!this.active || this.phase !== 'racing') return;
    if (!(dt > 0)) dt = 0.016; else if (dt > 0.05) dt = 0.05;

    let V = null, startX = this._startX;
    try { V = (typeof Game !== 'undefined') ? Game.vehicle : null; } catch (e) { V = null; }
    if (!V) return;

    // Geri sayım sürerken rakipler bekler (oyunun 3-2-1'i ile senkron)
    let countdownActive = false;
    try { countdownActive = (typeof Game !== 'undefined' && Game._countdown > 0); } catch (e) {}
    if (countdownActive) { for (const o of this.opponents) o.x = startX; return; }

    this._clock += dt;
    const playerX = this._num(V.x, startX);
    const targetX = startX + this.raceMeters * 2;   // dünya-x cinsinden hedef

    // Rakipleri ilerlet
    for (const o of this.opponents) {
      if (o.finished) continue;
      o.t += dt;
      // temel hız + tempo dalgalanması (surge/lull)
      const pace = 1 + o.pAmp * Math.sin(o.t * o.pHz + o.pPh);
      let spd = o.baseSpeed * pace;
      // rubber-band: oyuncudan geride kalırsa hızlan, çok öndeyse hafif yavaşla
      const gap = playerX - o.x;                    // + = rakip geride
      spd += this._clamp(gap * 0.10, -55, 130);
      // küçük rastgelelik → canlı, öngörülemez his
      spd += this._rand(-28, 28);
      spd = this._clamp(spd, 45, 1400);
      o.x = this._num(o.x + spd * dt, o.x);
      // rakip hedefe ulaştı mı
      if (o.x >= targetX) { o.x = targetX; o.finished = true; o.finishTime = this._clock; }
    }

    // Oyuncu bitişi
    const pdist = (playerX - startX) / 2;
    if (!this._playerFinished && pdist >= this.raceMeters) {
      this._playerFinished = true; this._playerFinishTime = this._clock;
    }

    // Bitiş koşulları: oyuncu bitirdi / öldü / süre doldu / tüm rakipler bitirdi
    let dead = false;
    try { dead = !!(V.dead || (typeof Game !== 'undefined' && Game.state === 'dead')); } catch (e) {}
    const allDone = this.opponents.every(o => o.finished);
    if (this._playerFinished || dead || this._clock >= this.timeLimit || allDone) {
      this._finalize(V, startX);
    }
  },

  // Sıralama + ödül hesapla, bitiş fazına geç (bir kez)
  _finalize(V, startX) {
    if (this._awarded) { this.phase = 'finished'; return; }
    this._awarded = true;
    this.phase = 'finished';

    const targetM = this.raceMeters;
    const racers = [];
    // Oyuncu
    const pdist = this._clamp((this._num(V && V.x, startX) - startX) / 2, 0, targetM);
    racers.push({
      name: 'SEN', isPlayer: true, color: this.C.you, flair: '⭐',
      finished: this._playerFinished, finishTime: this._playerFinishTime,
      dist: this._playerFinished ? targetM : pdist
    });
    // Rakipler
    for (const o of this.opponents) {
      const d = this._clamp((o.x - startX) / 2, 0, targetM);
      racers.push({
        name: o.name, isPlayer: false, color: o.color, flair: o.flair,
        finished: o.finished, finishTime: o.finishTime,
        dist: o.finished ? targetM : d
      });
    }

    // Sıralama: bitirenler süreye göre (küçük önce), sonra kalanlar mesafeye göre (büyük önce)
    racers.sort((a, b) => {
      if (a.finished && b.finished) return this._num(a.finishTime, 1e9) - this._num(b.finishTime, 1e9);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return this._num(b.dist, 0) - this._num(a.dist, 0);
    });
    racers.forEach((r, i) => { r.place = i + 1; });
    this.results = racers;

    // Oyuncunun yeri + ödül
    const me = racers.find(r => r.isPlayer);
    const place = me ? me.place : racers.length;
    this._awardForPlace(place, racers.length);
  },

  // Yer'e göre ödül: altın/elmas/kupa. Yalnız güvenli SaveData API'leri kullanılır.
  _awardForPlace(place, total) {
    const tiers = {
      1: { gold: 500, dia: 5, cup: 3 },
      2: { gold: 320, dia: 3, cup: 2 },
      3: { gold: 200, dia: 1, cup: 1 }
    };
    const r = tiers[place] || { gold: 90, dia: 0, cup: 0 };
    this._reward = { place: place, total: total, gold: r.gold, dia: r.dia, cup: r.cup };
    try {
      if (typeof SaveData !== 'undefined') {
        if (r.gold && SaveData.addGold) SaveData.addGold(r.gold);
        if (r.dia && SaveData.addDiamonds) SaveData.addDiamonds(r.dia);
        if (r.cup && SaveData.get && SaveData.set) {
          const cur = this._num(SaveData.get('mpTrophies'), 0);
          SaveData.set('mpTrophies', cur + r.cup);
        }
      }
    } catch (e) {}
    try {
      if (typeof Audio !== 'undefined') {
        if (place === 1 && Audio.playModeWin) Audio.playModeWin();
        else if (Audio.playTierUp) Audio.playTierUp();
        else if (Audio.playPickup) Audio.playPickup();
      }
    } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  RAKİPLERİ ÇİZ — oyun render'ından SONRA, ekran uzayında (camera.worldToScreen)
  // ═════════════════════════════════════════════════════════════════════════
  drawRace(ctx, camera) {
    if (!ctx || !this.active || this.phase !== 'racing') return;
    const cam = camera || (typeof Camera !== 'undefined' ? Camera : null);
    if (!cam || !cam.worldToScreen) return;
    let terr = null;
    try { terr = (typeof Game !== 'undefined') ? Game.terrain : null; } catch (e) {}
    if (!terr || !terr.getYAt) return;

    const W = this._num(cam.width, 800), H = this._num(cam.height, 600);
    const startX = this._startX;
    const targetX = startX + this.raceMeters * 2;

    // Bitiş çizgisi
    this._drawFinishLine(ctx, cam, terr, targetX, H);

    for (const o of this.opponents) {
      const wx = this._num(o.x, startX);
      const gy = this._num(terr.getYAt(wx), 400);
      const s = cam.worldToScreen(wx, gy);
      const sx = this._num(s.x, -999), sy = this._num(s.y, -999);

      // Ekran dışıysa kenar oku çiz
      if (sx < -40 || sx > W + 40) {
        this._drawEdgeArrow(ctx, o, sx < 0 ? 14 : W - 14, this._clamp(sy, 60, H - 60));
        continue;
      }
      if (sy < -60 || sy > H + 60) continue;

      this._drawOppVehicle(ctx, o, sx, sy);
    }
  },

  _drawFinishLine(ctx, cam, terr, targetX, H) {
    const gy = this._num(terr.getYAt(targetX), 400);
    const top = cam.worldToScreen(targetX, gy - 220);
    const bot = cam.worldToScreen(targetX, gy + 40);
    const tx = this._num(top.x, -999);
    if (tx < -30 || tx > this._num(cam.width, 800) + 30) return;
    ctx.save();
    // dama deseni direk
    const y0 = this._num(top.y, 0), y1 = this._num(bot.y, H);
    const seg = 12;
    for (let yy = y0, k = 0; yy < y1; yy += seg, k++) {
      ctx.fillStyle = (k % 2 === 0) ? '#ffffff' : '#111318';
      ctx.fillRect(tx - 4, yy, 8, seg);
    }
    ctx.fillStyle = this.C.amber; ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText('BİTİŞ', tx, y0 - 4);
    ctx.restore();
  },

  // Basit rakip aracı + isim etiketi + yer rozeti (ekran uzayı)
  _drawOppVehicle(ctx, o, sx, sy) {
    ctx.save();
    ctx.globalAlpha = o.finished ? 0.55 : 1;
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 2, 20, 6, 0, 0, 6.283); ctx.fill();
    // gövde
    ctx.fillStyle = o.color || '#ff8a3d';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(sx - 18, sy - 20, 36, 16, 5); ctx.fill(); ctx.stroke();
    // kabin
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.roundRect(sx - 8, sy - 27, 16, 9, 3); ctx.fill();
    // tekerler
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(sx - 11, sy - 4, 5.5, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(sx + 11, sy - 4, 5.5, 0, 6.283); ctx.fill();
    // isim etiketi
    ctx.globalAlpha = 1;
    const label = (o.flair || '') + ' ' + String(o.name || '');
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = (ctx.measureText ? ctx.measureText(label).width : label.length * 6) + 14;
    const ty = sy - 44;
    ctx.fillStyle = 'rgba(12,10,20,0.8)';
    ctx.beginPath(); ctx.roundRect(sx - tw / 2, ty - 9, tw, 18, 5); ctx.fill();
    ctx.fillStyle = o.color || '#fff';
    ctx.beginPath(); ctx.arc(sx - tw / 2 + 7, ty, 3, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#eef2fb';
    ctx.fillText(label, sx + 4, ty + 0.5);
    ctx.restore();
  },

  // Ekran dışı rakip için kenar oku (renk + isim baş harfi)
  _drawEdgeArrow(ctx, o, ex, ey) {
    ctx.save();
    ctx.fillStyle = o.color || '#ff8a3d';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    const dir = ex < 40 ? -1 : 1;
    ctx.moveTo(ex + dir * 10, ey);
    ctx.lineTo(ex - dir * 8, ey - 8);
    ctx.lineTo(ex - dir * 8, ey + 8);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0c0a14'; ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(o.name || '?').charAt(0), ex - dir * 3, ey);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  //  HUD — canlı sıralama (yarışırken) + sonuç panosu (bitişte)
  // ═════════════════════════════════════════════════════════════════════════
  drawHUD(ctx, W, H) {
    if (!ctx || !this.active) return;
    W = this._num(W, 800); H = this._num(H, 600);
    if (this.phase === 'racing')   this._drawLiveHUD(ctx, W, H);
    if (this.phase === 'finished') this._drawResults(ctx, W, H);
  },

  // Gerçek zamanlı sıralama panosu (sağ üst) + hedef ilerleme çubuğu
  _drawLiveHUD(ctx, W, H) {
    const C = this.C;
    let V = null, startX = this._startX;
    try { V = (typeof Game !== 'undefined') ? Game.vehicle : null; } catch (e) {}
    const targetM = this.raceMeters;

    // Canlı skorla sırala (bitirenler süreyle önde, kalanlar mesafeyle)
    const list = [];
    const pdist = V ? this._clamp((this._num(V.x, startX) - startX) / 2, 0, targetM) : 0;
    list.push({ name: 'SEN', isPlayer: true, color: C.you, flair: '⭐',
      finished: this._playerFinished, finishTime: this._playerFinishTime, dist: pdist });
    for (const o of this.opponents) {
      list.push({ name: o.name, isPlayer: false, color: o.color, flair: o.flair,
        finished: o.finished, finishTime: o.finishTime,
        dist: this._clamp((o.x - startX) / 2, 0, targetM) });
    }
    list.sort((a, b) => {
      if (a.finished && b.finished) return this._num(a.finishTime, 1e9) - this._num(b.finishTime, 1e9);
      if (a.finished) return -1;
      if (b.finished) return 1;
      return this._num(b.dist, 0) - this._num(a.dist, 0);
    });

    // Pano
    const pw = 176, ph = 26 + list.length * 22 + 8;
    const px = W - pw - 10, py = 54;
    ctx.save();
    ctx.fillStyle = C.panel;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill();
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.amber; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
    ctx.fillText('🏆 SIRALAMA', px + 10, py + 15);
    ctx.textAlign = 'right'; ctx.fillStyle = C.dim; ctx.font = 'bold 10px Arial';
    ctx.fillText(this.raceMeters + ' m', px + pw - 10, py + 15);

    let ry = py + 32;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.isPlayer) {
        ctx.fillStyle = 'rgba(255,61,0,0.16)';
        ctx.beginPath(); ctx.roundRect(px + 4, ry - 10, pw - 8, 20, 5); ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? C.gold : (i === 1 ? '#dfe7ef' : (i === 2 ? '#d0955b' : C.dim));
      ctx.font = 'bold 12px Arial';
      ctx.fillText((i + 1) + '.', px + 10, ry);
      ctx.fillStyle = r.color || '#888';
      ctx.beginPath(); ctx.arc(px + 30, ry, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = r.isPlayer ? '#fff' : C.text; ctx.font = 'bold 11px Arial';
      const nm = String(r.name || '');
      ctx.fillText(nm.length > 10 ? nm.slice(0, 10) : nm, px + 40, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = r.finished ? C.green : C.dim; ctx.font = '10px Arial';
      ctx.fillText(r.finished ? '✓' : (Math.round(r.dist) + 'm'), px + pw - 10, ry);
      ry += 22;
    }
    ctx.restore();

    // Hedef ilerleme çubuğu (üst orta)
    const barW = Math.min(280, W - 120), barX = (W - barW) / 2, barY = 14;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, 8, 4); ctx.fill();
    ctx.fillStyle = C.fire;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW * this._clamp(pdist / targetM, 0, 1), 8, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(Math.round(pdist) + ' / ' + targetM + ' m', barX + barW / 2, barY - 2);
    ctx.restore();
  },

  // Bitiş sonuç panosu — sıralama listesi + ödül + butonlar
  _drawResults(ctx, W, H) {
    const C = this.C;
    this._finishBtns = [];
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);

    const list = this.results || [];
    const cardW = Math.min(340, W - 36);
    const cardH = 150 + list.length * 30 + 116;
    const cx = W / 2, cy = H / 2;
    const cardX = cx - cardW / 2, cardY = cy - cardH / 2;

    const g = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    g.addColorStop(0, '#1a1020'); g.addColorStop(1, '#0b0810');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,138,43,0.5)'; ctx.lineWidth = 2; ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rw = this._reward || { place: list.length, gold: 0, dia: 0, cup: 0 };
    const placeTxt = rw.place === 1 ? '🥇 1. OLDUN!' : rw.place === 2 ? '🥈 2. OLDUN' :
      rw.place === 3 ? '🥉 3. OLDUN' : rw.place + '. OLDUN';
    ctx.fillStyle = C.gold; ctx.font = '900 24px Impact, "Arial Black", sans-serif';
    ctx.fillText(placeTxt, cx, cardY + 34);
    ctx.fillStyle = C.dim; ctx.font = 'bold 11px Arial';
    ctx.fillText('Oda ' + this.roomId + '  ·  ' + this.raceMeters + ' m', cx, cardY + 56);

    // Sıralama listesi
    let ry = cardY + 82;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.isPlayer) {
        ctx.fillStyle = 'rgba(255,61,0,0.16)';
        ctx.beginPath(); ctx.roundRect(cardX + 14, ry - 12, cardW - 28, 26, 6); ctx.fill();
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? C.gold : (i === 1 ? '#dfe7ef' : (i === 2 ? '#d0955b' : C.dim));
      ctx.font = 'bold 13px Arial';
      ctx.fillText((i + 1) + '.', cardX + 22, ry);
      ctx.fillStyle = r.color || '#888';
      ctx.beginPath(); ctx.arc(cardX + 44, ry, 5, 0, 6.283); ctx.fill();
      ctx.fillStyle = r.isPlayer ? '#fff' : C.text; ctx.font = 'bold 12px Arial';
      ctx.fillText((r.flair || '') + ' ' + String(r.name || ''), cardX + 56, ry);
      ctx.textAlign = 'right';
      ctx.fillStyle = r.finished ? C.green : C.dim; ctx.font = '11px Arial';
      ctx.fillText(r.finished ? this._fmtTime(r.finishTime) : (Math.round(r.dist) + ' m'), cardX + cardW - 22, ry);
      ry += 30;
    }

    // Ödül şeridi
    ry += 4;
    ctx.textAlign = 'center';
    ctx.fillStyle = C.amber; ctx.font = 'bold 12px Arial';
    ctx.fillText('ÖDÜL', cx, ry); ry += 22;
    let rewardTxt = '⧆ ' + this._num(rw.gold, 0);
    if (rw.dia) rewardTxt += '    ◆ ' + rw.dia;
    if (rw.cup) rewardTxt += '    🏆 ' + rw.cup;
    ctx.fillStyle = C.gold; ctx.font = 'bold 17px Arial';
    ctx.fillText(rewardTxt, cx, ry); ry += 28;

    // Butonlar
    const bw = cardW - 44, bx = cx - bw / 2;
    this._finishBtn(ctx, 'replay', bx, ry, bw, 42, '↻ YENİDEN OYNA', C.green, '#fff'); ry += 50;
    const hw = (bw - 10) / 2;
    this._finishBtn(ctx, 'lobby', bx, ry, hw, 38, '🏁 LOBİ', C.card, C.text);
    this._finishBtn(ctx, 'menu', bx + hw + 10, ry, hw, 38, '✖ MENÜ', 'rgba(180,60,50,0.9)', '#fff');
    ctx.restore();
  },

  _finishBtn(ctx, id, x, y, w, h, label, bg, tc) {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = this.C.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = tc; ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    this._finishBtns.push({ id: id, x: x, y: y, w: w, h: h });
  },

  _fmtTime(sec) {
    sec = this._clamp(sec, 0, 5999);
    const m = (sec / 60) | 0, s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  },

  // Dışarıdan durum sorgusu: bir MP yarışı sürüyor mu ya da bitti mi?
  isActive() { return !!this.active && (this.phase === 'racing' || this.phase === 'finished'); }
};

// Global erişim (script tag ile yüklendiğinde)
if (typeof window !== 'undefined') { window.MPRooms = MPRooms; }
