'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// REPLAY — TEKRAR İZLEME + HAYALET KAYDI  (bağımsız modül)
// ---------------------------------------------------------------------------
// · KAYIT   : koşu boyunca araç durumunu (x,y,angle,throttle,t) örnekler.
//             Koşu bitince EN İYİ mesafe ise harita başına SaveData'ya yazar.
// · OYNATMA : kaydı terrain üzerinde geri oynatır (interpolasyonlu), kamera takip.
// · HAYALET : en iyi replay'i kendi formatında hayalet olarak sunar.
// · LİSTE   : harita başına kayıtlı en iyi koşular + "İZLE" butonu.
//
// DIŞ BAĞIMLILIKLAR (hepsi savunmalı okunur):
//   Game, Terrain, Camera, drawVehicle, VehicleDefs, SaveData, UI, Audio
// localStorage KULLANILMAZ — kalıcılık yalnızca SaveData üzerinden.
// ═══════════════════════════════════════════════════════════════════════════
const Replay = {
  VERSION:      1,
  SAVE_KEY:     'replays',   // SaveData.data.replays[mapId] = { ...replay }
  SAMPLE_EVERY: 3,           // her 3 karede bir örnek al (bellek dostu)
  MAX_POINTS:   2000,        // örnek üst sınırı — aşınca çözünürlük yarıya iner
  PLAY_SPEED:   1,           // oynatma hız çarpanı

  // ── KAYIT durumu ──
  _rec: null,   // { sig, mapId, vehicleId, seed, startX, stride, frame, elapsed, lastX, pts:[] }

  // ── OYNATMA durumu ──
  _play: null,  // { mapId, vehicleId, seed, pts, dist, t, dur, i, cur, wheels, over }

  // ── LİSTE ekranı durumu ──
  _buttons: [],
  _scroll:  0,

  // ═══════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════════════
  _num(v, d) { v = Number(v); return isFinite(v) ? v : (d || 0); },
  _round(v, p) { const m = Math.pow(10, p || 0); return Math.round(this._num(v) * m) / m; },

  _store() {
    try {
      if (typeof SaveData === 'undefined' || !SaveData.data) return {};
      let all = SaveData.data[this.SAVE_KEY];
      if (!all || typeof all !== 'object' || Array.isArray(all)) { all = {}; SaveData.data[this.SAVE_KEY] = all; }
      return all;
    } catch (e) { return {}; }
  },

  // Kaydedilmiş replay'i güvenle getir (biçim/veri doğrulamalı) — yoksa null
  getReplay(mapId) {
    if (!mapId) return null;
    const r = this._store()[mapId];
    if (!r || typeof r !== 'object') return null;
    if (!Array.isArray(r.pts) || r.pts.length < 2) return null;
    return r;
  },

  // Harita listesi: kaydı olan haritalar, mesafeye göre azalan
  listReplays() {
    const all = this._store();
    const out = [];
    for (const m in all) {
      if (!Object.prototype.hasOwnProperty.call(all, m)) continue;
      const r = all[m];
      if (r && Array.isArray(r.pts) && r.pts.length >= 2) {
        out.push({ mapId: m, vehicleId: r.vehicleId || 'jeep', dist: this._num(r.dist), date: this._num(r.date) });
      }
    }
    out.sort((a, b) => b.dist - a.dist);
    return out;
  },

  // ── HAYALET: en iyi replay'i sade hayalet nesnesi olarak sun ──
  // (Multiplayer hayalet havuzundan bağımsız kendi biçimimiz.)
  getGhost(mapId) {
    const r = this.getReplay(mapId);
    if (!r) return null;
    return {
      source:    'replay',
      mapId:     mapId,
      vehicleId: r.vehicleId || 'jeep',
      dist:      this._num(r.dist),
      seed:      this._num(r.seed),
      // t'ye göre örneklenmiş yol — çağıran sampleAt ile ara konum okuyabilir
      pts:       r.pts,
      duration:  (r.pts.length ? this._num(r.pts[r.pts.length - 1].t) : 0),
      // verilen zamanda (sn) araç durumunu döndürür — hayalet takip/çizim için
      sampleAt:  (tt) => Replay._sampleAt(r.pts, tt)
    };
  },

  // Verilen t (sn) için noktalar arasında interpolasyon → {x,y,angle,throttle,vx}
  _sampleAt(pts, tt) {
    if (!Array.isArray(pts) || pts.length === 0) return null;
    tt = this._num(tt);
    if (tt <= pts[0].t) { const p = pts[0]; return { x: p.x, y: p.y, angle: p.a, throttle: p.th, vx: 0 }; }
    const last = pts[pts.length - 1];
    if (tt >= last.t) return { x: last.x, y: last.y, angle: last.a, throttle: last.th, vx: 0 };
    // ikili arama (pts.t artan)
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].t <= tt) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi];
    const span = (b.t - a.t) || 1;
    let k = (tt - a.t) / span; if (k < 0) k = 0; else if (k > 1) k = 1;
    const dt = span || 0.016;
    return {
      x:  a.x + (b.x - a.x) * k,
      y:  a.y + (b.y - a.y) * k,
      angle: this._lerpAngle(a.a, b.a, k),
      throttle: a.th,
      vx: (b.x - a.x) / dt
    };
  },

  _lerpAngle(a, b, k) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * k;
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  KAYIT
  // ═══════════════════════════════════════════════════════════════════════
  // Yeni koşuya geçerken kaydı sıfırla (isteğe bağlı; record() zaten kendini yönetir)
  reset() { this._rec = null; },

  _sig() {
    const map = (typeof Game !== 'undefined' && Game.mapId) ? Game.mapId : 'countryside';
    const veh = (typeof Game !== 'undefined' && Game.vehicleId) ? Game.vehicleId : 'jeep';
    return map + '|' + veh;
  },

  _startRec() {
    const map = (typeof Game !== 'undefined' && Game.mapId) ? Game.mapId : 'countryside';
    const veh = (typeof Game !== 'undefined' && Game.vehicleId) ? Game.vehicleId : 'jeep';
    let seed = 0;
    try { if (typeof Game !== 'undefined' && Game.terrain && Game.terrain._seed != null) seed = this._num(Game.terrain._seed); } catch (e) {}
    const startX = (typeof Game !== 'undefined') ? this._num(Game.startX) : 0;
    this._rec = {
      sig: map + '|' + veh, mapId: map, vehicleId: veh, seed: seed,
      startX: startX, stride: this.SAMPLE_EVERY, frame: 0, elapsed: 0,
      lastX: startX, pts: []
    };
  },

  // Her karede çağır: Replay.record(Game.vehicle, dt)
  record(v, dt) {
    if (!v) return;
    const x = Number(v.x), y = Number(v.y);
    if (!isFinite(x) || !isFinite(y)) return;           // NaN guard
    dt = this._num(dt, 0.016);
    if (dt <= 0 || dt > 0.2) dt = 0.016;                // spike/duraklama koruması

    // Yeni koşu tespiti: imza değişti, kayıt yok, ya da araç başa ışınlandı (restart)
    if (!this._rec || this._rec.sig !== this._sig() || x < this._rec.lastX - 600) {
      this._startRec();
    }
    const rec = this._rec;
    rec.elapsed += dt;
    rec.lastX = x;
    rec.frame++;
    if (rec.frame % rec.stride !== 0) return;           // örnekleme aralığı

    rec.pts.push({
      x:  this._round(x, 1),
      y:  this._round(y, 1),
      a:  this._round(this._num(v.angle), 3),
      th: v.throttle ? 1 : 0,
      t:  this._round(rec.elapsed, 3)
    });

    // Bellek sınırı: sınıra gelince noktaları seyrelt (birer atlayarak) + adımı ikiye katla
    if (rec.pts.length >= this.MAX_POINTS) {
      const dec = [];
      for (let i = 0; i < rec.pts.length; i += 2) dec.push(rec.pts[i]);
      rec.pts = dec;
      rec.stride *= 2;
    }
  },

  // Koşu bitince çağır: Replay.saveIfBest(mapId, dist). En iyi mesafe ise kalıcılaştırır.
  saveIfBest(mapId, dist) {
    dist = Number(dist);
    if (!isFinite(dist) || dist < 0) return false;
    const rec = this._rec;
    // Kayıt yoksa / bu harita için değilse / anlamlı uzunlukta değilse çıkma
    if (!rec || !Array.isArray(rec.pts) || rec.pts.length < 2) { return false; }
    if (mapId && rec.mapId && mapId !== rec.mapId) { this._rec = null; return false; }
    const map = mapId || rec.mapId;

    const all = this._store();
    const prev = all[map];
    const isBest = !prev || !Array.isArray(prev.pts) || dist > this._num(prev.dist);
    if (isBest) {
      all[map] = {
        v:         this.VERSION,
        mapId:     map,
        vehicleId: rec.vehicleId,
        seed:      rec.seed,
        dist:      Math.floor(dist),
        stride:    rec.stride,
        date:      Date.now(),
        pts:       rec.pts.slice()
      };
      try { if (typeof SaveData !== 'undefined' && SaveData.save) SaveData.save(); } catch (e) {}
    }
    this._rec = null;   // koşu bitti → sonraki record() taze başlar
    return isBest;
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  OYNATMA
  // ═══════════════════════════════════════════════════════════════════════
  isPlaying() { return !!this._play; },

  // Oynatmayı başlat. Terrain'i kayıtlı seed ile yeniden üretir. true = başladı.
  play(mapId) {
    const r = this.getReplay(mapId);
    if (!r) { if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Kayıt bulunamadı'); return false; }
    // Terrain'i replay'in seed'iyle yeniden üret (hayalet zemine oturur)
    try { if (typeof Terrain !== 'undefined' && Terrain.generate) Terrain.generate(mapId, this._num(r.seed)); } catch (e) {}
    const pts = r.pts;
    this._play = {
      mapId:     mapId,
      vehicleId: r.vehicleId || 'jeep',
      seed:      this._num(r.seed),
      pts:       pts,
      dist:      this._num(r.dist),
      t:         0,
      dur:       this._num(pts[pts.length - 1].t),
      cur:       this._sampleAt(pts, 0),
      wheels:    this._ghostWheels(r.vehicleId || 'jeep'),
      over:      false,
      overT:     0
    };
    // Kamerayı ilk kareye ışınla
    try {
      if (typeof Camera !== 'undefined' && Camera.snapTo && this._play.cur) {
        Camera.snapTo({ x: this._play.cur.x, y: this._play.cur.y, vx: 0, vy: 0, onGround: true, angle: this._play.cur.angle });
      }
    } catch (e) {}
    if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick();
    return true;
  },

  stop() { this._play = null; },

  // Oynatma araçları için sahte tekerlek dizisi (drawVehicle tekerlek okur)
  _ghostWheels(vehicleId) {
    let n = 2;
    try {
      const def = (typeof VehicleDefs !== 'undefined') ? VehicleDefs[vehicleId] : null;
      if (def && Array.isArray(def.wheels)) n = def.wheels.length;
    } catch (e) {}
    const out = [];
    for (let i = 0; i < n; i++) out.push({ comp: 0, spin: 0, contact: true });
    return out;
  },

  // Her karede çağır (oynatma modunda): Replay.update(dt)
  update(dt) {
    const p = this._play;
    if (!p) return;
    dt = this._num(dt, 0.016);
    if (dt <= 0 || dt > 0.2) dt = 0.016;

    if (!p.over) {
      p.t += dt * this.PLAY_SPEED;
      if (p.t >= p.dur) { p.t = p.dur; p.over = true; }
    } else {
      p.overT += dt;
      if (p.overT > 2.2) { this._play = null; return; }   // bitiş ekranı 2.2 sn sonra kapanır
    }

    const s = this._sampleAt(p.pts, p.t);
    if (s) p.cur = s;

    // Tekerlek dönüşü (görsel) — hız ile
    const vx = this._num(p.cur ? p.cur.vx : 0);
    for (let i = 0; i < p.wheels.length; i++) p.wheels[i].spin += (vx / 22) * dt;

    // Kamera takip — sahte araç durumuyla
    try {
      if (typeof Camera !== 'undefined' && Camera.follow && p.cur) {
        Camera.follow({
          x: p.cur.x, y: p.cur.y, vx: vx, vy: 0,
          onGround: true, airTime: 0, angle: p.cur.angle
        }, dt);
      }
    } catch (e) {}
  },

  // Her karede çağır (oynatma modunda): Replay.drawPlayback(ctx)
  drawPlayback(ctx) {
    const p = this._play;
    if (!p || !ctx) return;
    const cv = ctx.canvas || {};
    const W = cv.width || 800, H = cv.height || 600;

    // Arka plan (kamera dünyasına geçmeden önce)
    ctx.save();
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a1428'); bg.addColorStop(1, '#05070e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // ── Dünya çizimi: terrain + hayalet araç ──
    try {
      if (typeof Camera !== 'undefined' && Camera.apply) {
        Camera.apply(ctx);
        if (typeof Terrain !== 'undefined' && Terrain.draw) Terrain.draw(ctx, Camera);
        if (p.cur && typeof drawVehicle === 'function') {
          const g = {
            x: p.cur.x, y: p.cur.y, angle: this._num(p.cur.angle),
            throttle: p.cur.throttle ? 1 : 0, brake: 0, vx: this._num(p.cur.vx),
            airTime: 0, angularVel: 0, bodyTilt: 0, pitchOffset: 0,
            landingShock: 0, wheels: p.wheels
          };
          // hafif hayalet parıltısı
          ctx.save();
          ctx.globalAlpha = 0.96;
          drawVehicle(ctx, g, p.vehicleId, g.throttle, p.t);
          ctx.restore();
        }
        Camera.restore(ctx);
      }
    } catch (e) {
      try { if (typeof Camera !== 'undefined' && Camera.restore) Camera.restore(ctx); } catch (e2) {}
    }

    // ── Ekran üstü arayüz (dünya dışı) ──
    this._drawPlaybackHUD(ctx, W, H);
  },

  _drawPlaybackHUD(ctx, W, H) {
    const p = this._play;
    if (!p) return;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Üst bant: TEKRAR rozeti + mesafe
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(12, 12, 190, 40, 8); else ctx.rect(12, 12, 190, 40); ctx.fill();
    ctx.fillStyle = '#ff5bd0';
    ctx.font = 'bold 15px Arial';
    ctx.fillText('▶ TEKRAR', 24, 32);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(this._mapName(p.mapId) + '  ·  ' + Math.floor(p.dist) + ' m', 100, 32);

    // Geri butonu (sağ üst)
    const bw = 92, bh = 40, bx = W - bw - 12, by = 12;
    ctx.fillStyle = 'rgba(30,30,40,0.8)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 8); else ctx.rect(bx, by, bw, bh); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⬅ ÇIKIŞ', bx + bw / 2, by + bh / 2);
    this._backBtn = { x: bx, y: by, w: bw, h: bh };

    // İlerleme çubuğu (alt)
    const pad = 20, pbY = H - 26, pbW = W - pad * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(pad, pbY, pbW, 6, 3); else ctx.rect(pad, pbY, pbW, 6); ctx.fill();
    let prog = p.dur > 0 ? (p.t / p.dur) : 1; if (prog < 0) prog = 0; else if (prog > 1) prog = 1;
    ctx.fillStyle = '#ff5bd0';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(pad, pbY, pbW * prog, 6, 3); else ctx.rect(pad, pbY, pbW * prog, 6); ctx.fill();

    // Bitiş kartı
    if (p.over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H / 2 - 46, W, 92);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
      ctx.fillText('🏁 TEKRAR BİTTİ', W / 2, H / 2 - 8);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial';
      ctx.fillText(Math.floor(p.dist) + ' metre', W / 2, H / 2 + 22);
    }
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  LİSTE EKRANI  (UI.currentScreen === 'replay')
  // ═══════════════════════════════════════════════════════════════════════
  draw(ctx, W, H) {
    W = W || (ctx.canvas ? ctx.canvas.width : 800);
    H = H || (ctx.canvas ? ctx.canvas.height : 600);
    this._buttons = [];

    // Arka plan
    ctx.save();
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0f1c'); bg.addColorStop(1, '#05060c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Başlık
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5bd0'; ctx.font = 'bold 26px Arial';
    ctx.fillText('▶ TEKRAR İZLE', W / 2, 42);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '13px Arial';
    ctx.fillText('Harita başına en iyi koşuların', W / 2, 68);

    // Geri butonu (sol üst)
    const back = { x: 12, y: 12, w: 78, h: 36, id: 'back' };
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(back.x, back.y, back.w, back.h, 8); else ctx.rect(back.x, back.y, back.w, back.h); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
    ctx.fillText('⬅ GERİ', back.x + back.w / 2, back.y + back.h / 2);
    this._buttons.push(back);

    // Liste
    const list = this.listReplays();
    const top = 96, rowH = 66, gap = 10, rowW = Math.min(560, W - 40), rowX = (W - rowW) / 2;

    if (list.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
      ctx.fillText('Henüz kayıtlı tekrar yok.', W / 2, H / 2 - 10);
      ctx.font = '13px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('Bir koşu tamamla — en iyi mesafen otomatik kaydedilir.', W / 2, H / 2 + 16);
      ctx.restore();
      return;
    }

    // Basit kaydırma sınırlaması
    const visH = H - top - 16;
    const totalH = list.length * (rowH + gap);
    const maxScroll = Math.max(0, totalH - visH);
    if (this._scroll < 0) this._scroll = 0; else if (this._scroll > maxScroll) this._scroll = maxScroll;

    ctx.save();
    ctx.beginPath(); ctx.rect(0, top - 6, W, visH + 12); ctx.clip();
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const ry = top + i * (rowH + gap) - this._scroll;
      if (ry + rowH < top - 6 || ry > H) continue;      // görünmeyeni atla

      // kart
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rowX, ry, rowW, rowH, 12); else ctx.rect(rowX, ry, rowW, rowH); ctx.fill();
      ctx.strokeStyle = 'rgba(255,91,208,0.25)'; ctx.lineWidth = 1; ctx.stroke();

      // sıra rozeti
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = i === 0 ? '#ffd700' : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 22px Arial';
      ctx.fillText('#' + (i + 1), rowX + 16, ry + rowH / 2);

      // harita + araç
      ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Arial';
      ctx.fillText(this._mapName(it.mapId), rowX + 64, ry + 22);
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '13px Arial';
      ctx.fillText('🚗 ' + this._vehName(it.vehicleId) + '   ·   ' + Math.floor(it.dist) + ' m', rowX + 64, ry + 44);

      // İZLE butonu
      const bw = 92, bh = 40, bx = rowX + rowW - bw - 14, by = ry + (rowH - bh) / 2;
      ctx.fillStyle = '#ff5bd0';
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10); else ctx.rect(bx, by, bw, bh); ctx.fill();
      ctx.fillStyle = '#12030d'; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
      ctx.fillText('▶ İZLE', bx + bw / 2, by + bh / 2);
      // buton kaydı yalnızca görünür alandaysa
      if (by + bh > top - 6 && by < H) this._buttons.push({ x: bx, y: by, w: bw, h: bh, id: 'watch', mapId: it.mapId });
    }
    ctx.restore();
    ctx.restore();
  },

  // Kaydırma (isteğe bağlı bağlanır): Replay.scroll(dy)
  scroll(dy) { this._scroll += this._num(dy); },

  // Tıklama yönlendirme. Oynatmadaysa çıkış/kontrol; değilse liste butonları.
  // Dönüş: 'back' → menüye dön (main halleder); null → dahili işlendi.
  handleClick(x, y) {
    // Oynatma sırasında: yalnızca çıkış butonu
    if (this._play) {
      const b = this._backBtn;
      if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.stop();
        if (typeof Audio !== 'undefined' && Audio.playMenuClick) Audio.playMenuClick();
      }
      return null;
    }
    // Liste ekranı
    for (const btn of this._buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        if (btn.id === 'back') return 'back';
        if (btn.id === 'watch') { this.play(btn.mapId); return null; }
      }
    }
    return null;
  },

  // ── Ad çözümleyiciler (savunmalı) ──
  _mapName(mapId) {
    try {
      if (typeof UI !== 'undefined' && UI.MAP_NAMES && UI.MAP_NAMES[mapId]) return UI.MAP_NAMES[mapId];
      if (typeof MapSettings !== 'undefined' && MapSettings.name) { const n = MapSettings.name(mapId); if (n) return n; }
    } catch (e) {}
    return (mapId || '').replace(/_/g, ' ').toUpperCase();
  },
  _vehName(vehicleId) {
    try {
      if (typeof VehicleDefs !== 'undefined' && VehicleDefs[vehicleId] && VehicleDefs[vehicleId].name) return VehicleDefs[vehicleId].name;
    } catch (e) {}
    return (vehicleId || 'jeep').toUpperCase();
  }
};

// Global erişim (diğer modüllerle aynı desen)
if (typeof window !== 'undefined') window.Replay = Replay;
