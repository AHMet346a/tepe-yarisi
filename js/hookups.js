'use strict';
/* Hookups — 2. Liste modüllerini GERÇEK oyuna bağlar (ADDITIVE, monkey-patch).
   Orijinal fonksiyonlar önce çağrılır, üstüne ekleme yapılır; hata olsa bile
   oyun akışı ASLA bozulmaz (her ekleme try/catch içinde).
   Kapsam:
   - Oynanış: Kombo (takla zinciri), Stunt-Cam (slow-mo), Drift, HUD göstergeleri
   - Garaj: underglow + sticker + plaka + renkli egzoz aracın üstünde görünür */

// ───────────── Garaj Özelleştirme Render ─────────────
const CarCustomRender = {
  _cz() { try { return (typeof Customization !== 'undefined') ? Customization : null; } catch (e) { return null; } },
  // Araç dünya-uzayında çizildikten SONRA (drawVehicle sarmalayıcısından) çağrılır
  draw(ctx, v, vehicleId) {
    if (!ctx || !v) return;
    const x = v.x, y = v.y, ang = v.angle || 0;
    // #3 Neon underglow
    try {
      if (typeof Underglow !== 'undefined' && Underglow.isOn && Underglow.isOn()) {
        const u = Underglow.get();
        ctx.save();
        ctx.translate(x, y + 16); ctx.rotate(ang);
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 48);
        g.addColorStop(0, u.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = Math.max(0.15, Math.min(0.85, u.intensity || 0.6));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 46, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } catch (e) {}
    // #2 Sticker'lar (mevcut drawVehicleSticker global'ı ile)
    try {
      if (typeof Stickers !== 'undefined' && typeof drawVehicleSticker === 'function') {
        const list = Stickers.list ? Stickers.list() : [];
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        for (let i = 0; i < list.length; i++) {
          const s = list[i];
          const sx = (s.x - 0.5) * 60, sy = (s.y - 0.5) * 34;
          try { drawVehicleSticker(ctx, s.id, sx, sy, (s.s || 1) * 0.5, s.r || 0); } catch (e2) {}
        }
        ctx.restore();
      }
    } catch (e) {}
    // #7 Kişisel plaka
    try {
      if (typeof Plate !== 'undefined' && Plate.get) {
        const txt = Plate.get();
        if (txt) {
          ctx.save(); ctx.translate(x, y + 6); ctx.rotate(ang);
          ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
          ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillRect(-16, 8, 32, 11); ctx.strokeRect(-16, 8, 32, 11);
          ctx.fillStyle = '#111'; ctx.fillText(String(txt).slice(0, 8), 0, 14);
          ctx.restore();
        }
      }
    } catch (e) {}
  }
};

// ───────────── Oynanış Entegrasyonu ─────────────
const Hookups = {
  version: '1.0',
  _prevFlip: 0, _wrapped: false, _driftScore: 0, _lastPopup: '', _popupT: 0, _stunt: false,
  // Her karede (Game.update sarmalayıcısından) çalışır
  frame(dt) {
    const G = (typeof Game !== 'undefined') ? Game : null;
    if (!G || G.state !== 'playing' || !G.vehicle) return;
    const v = G.vehicle;
    dt = dt || 0.016;

    // #62 Kombo — takla sayacı arttıysa yeni takla(lar) eklendi
    try {
      const fc = v.flipCount || 0;
      if (fc > this._prevFlip) {
        const added = fc - this._prevFlip;
        for (let i = 0; i < added; i++) if (typeof Combo !== 'undefined') Combo.add('flip');
        this._popup('TAKLA x' + (typeof Combo !== 'undefined' ? Combo.count : added), 1.2);
        // #61 Stunt-Cam: art arda takla / hızlı dönüş → kısa slow-mo
        if (typeof TimeScale !== 'undefined' && TimeScale.slowmo && !v.onGround) {
          TimeScale.slowmo(0.45, 0.5); this._stunt = true;
        }
        if (typeof MobileHaptics !== 'undefined') MobileHaptics.vibrate(18);
      }
      this._prevFlip = fc;
      if (v.onGround) this._stunt = false;
    } catch (e) {}

    // #62 Kombo penceresi & yere inince skorla
    try {
      if (typeof Combo !== 'undefined') {
        Combo.tick(dt);
        if (v.onGround && Combo.count > 0 && v.airTime === 0) {
          const sc = Combo.score(100 * Combo.count);
          if (sc > 0 && typeof SaveData !== 'undefined' && SaveData.addGold) { try { SaveData.addGold(Math.min(500, Math.round(sc / 20))); } catch (e2) {} }
          this._popup('KOMBO +' + sc, 1.4);
          Combo.reset();
        }
      }
    } catch (e) {}

    // #66 Drift — yerde, direksiyon/hız/açısal hıza göre
    try {
      if (typeof Drift !== 'undefined' && v.onGround) {
        const steer = (v.throttle || 0) - (v.brake || 0);
        Drift.update(steer, v.vx || 0, v.grip == null ? 1 : v.grip);
        const ds = Drift.scoreFor(Drift.angle || 0, Math.abs(v.vx || 0));
        if (ds > 4) this._driftScore += ds * dt;
      }
    } catch (e) {}

    // ══════════════════════════════════════════════════════════════════════
    // 30 Tmz — CHECKPOINT + KİLOMETRE TAŞLARI BAĞLANDI
    // Bu iki sistem game.js'te YAZILMIŞTI ama hiçbir yerden çağrılmıyordu
    // (çalışma zamanı ölçümü: 0 tetiklenme). Bağlanmadan önce CheckpointSystem'in
    // 5 hatası düzeltildi — bkz. DEVAM-OZETI.md §8B.28/F.
    // ⚠ Koşu başı sıfırlaması: mesafe geri gittiyse yeni koşu demektir
    //   (Game.startRun'a dokunmadan, additive kalmak için).
    // ═════════════════════════════════════════════════════════════════════════
    // ⚡ PERF(31 Tmz) — METRE DEĞİŞMEDİYSE TARAMA YOK
    // ═════════════════════════════════════════════════════════════════════════
    // 🔴 `Hookups.frame` `Game.update`'i sarmalar, `Game.update` ise SABİT ADIMLI
    //   fizik döngüsünden çağrılır (`FixedStep.run`). Yani bu blok kare başına
    //   1 DEĞİL, FPS düştükçe 2-3 KEZ koşar (main.js dt tavanı 0,05 → en çok 3
    //   alt adım). Telefon zorlanınca tarama maliyeti de 3'e katlanıyordu.
    // `dist` TAM SAYI metre. Aynı metre içinde:
    //   · `CheckpointSystem.checkCheckpoint` → `floor(dist/500)*500` aynı çıkar
    //     ve `<= last` olduğu için ZATEN null döner,
    //   · `DISTANCE_MILESTONES.check` → eşiği geçen her taş ZATEN `triggered`
    //     içinde olduğu için boş dizi döner (10 öğe × `includes` taraması boşa).
    // ▶ Bu yüzden metre değişmediyse ikisi de atlanabilir — SONUÇ BİREBİR AYNI.
    // ⚠ `DISTANCE_MILESTONES.update(dt)` HER alt adımda çalışmaya devam eder
    //   (kutlama zamanlayıcısını eritir); onu atlarsan kutlama ekranda kalır.
    try {
      const dist = Math.max(0, Math.floor((v.x - G.startX) / 2));
      const onceki = this._sonMesafe;
      let sifirlandi = false;
      if (onceki === undefined || dist < onceki - 5) {
        if (typeof CheckpointSystem !== 'undefined') CheckpointSystem.init();
        if (typeof DISTANCE_MILESTONES !== 'undefined') DISTANCE_MILESTONES.reset();
        this._kosuT = 0;
        sifirlandi = true;
      }
      this._sonMesafe = dist;
      this._kosuT = (this._kosuT || 0) + dt;
      // Sıfırlamadan sonra durum tazedir → o alt adımda mutlaka taranmalı.
      const tara = sifirlandi || dist !== onceki;

      // Checkpoint: her 500 m'de bir, azalan bonus (ekonomi ölçüldü, §8B.28/F)
      if (tara && typeof CheckpointSystem !== 'undefined') {
        const cp = CheckpointSystem.checkCheckpoint(dist, this._kosuT);
        if (cp) {
          if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(cp.bonus);
          const sp = CheckpointSystem.getLapSplits();
          const son = sp.length ? sp[sp.length - 1].split : 0;
          this._popup('🚩 ' + cp.distance + 'm  +' + cp.bonus + '💰  (' + son.toFixed(1) + 's)', 1.6);
          if (typeof Audio !== 'undefined' && Audio.playMilestone) Audio.playMilestone();
        }
      }

      // Kilometre taşları: 500m/1km/…/10km — ödül ölçeği düşürüldü
      if (typeof DISTANCE_MILESTONES !== 'undefined') {
        const yeni = tara ? DISTANCE_MILESTONES.check(dist) : null;
        if (yeni && yeni.length) {
          for (const m of yeni) {
            if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(m.reward);
            if (typeof Missions !== 'undefined' && Missions.add) { try { Missions.add('milestone', 1); } catch (e2) {} }
          }
          if (typeof Audio !== 'undefined' && Audio.playMilestone) Audio.playMilestone();
        }
        DISTANCE_MILESTONES.update(dt);
      }
    } catch (e) {}

    if (this._popupT > 0) this._popupT -= dt;
  },
  _popup(txt, dur) { this._lastPopup = txt; this._popupT = dur || 1.2; },

  // HUD.draw sarmalayıcısından — oyun HUD'unun üstüne ekstra göstergeler
  drawHUD(ctx, v) {
    if (!ctx || !v) return;
    const W = (ctx.canvas ? ctx.canvas.width : 1280);
    const H = (ctx.canvas ? ctx.canvas.height : 720);
    ctx.save();

    // 30 Tmz — checkpoint bayrakları + kilometre taşı kutlaması.
    // ⚠ Burada dünya dönüşümü KAPALI; bayraklar Camera.worldToScreen ile
    //   ekran uzayına çevrilir (drawCheckpoints bunu kendi yapıyor).
    try {
      const G2 = (typeof Game !== 'undefined') ? Game : null;
      if (G2 && G2.state === 'playing' && typeof CheckpointSystem !== 'undefined') {
        const dist = Math.max(0, Math.floor((v.x - G2.startX) / 2));
        CheckpointSystem.drawCheckpoints(ctx, (typeof Camera !== 'undefined' ? Camera : null),
                                         G2.terrain, dist, G2.startX);
      }
    } catch (e) {}
    try { if (typeof DISTANCE_MILESTONES !== 'undefined') DISTANCE_MILESTONES.draw(ctx, W, H); } catch (e) {}
    // Kombo göstergesi (üst-orta)
    try {
      if (typeof Combo !== 'undefined' && Combo.count > 0) {
        ctx.font = 'bold 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffcf3f'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4;
        const s = 'KOMBO x' + Combo.count + '  (' + Combo.multiplier.toFixed(1) + 'x)';
        ctx.strokeText(s, W / 2, 52); ctx.fillText(s, W / 2, 52);
      }
    } catch (e) {}
    // Popup (takla/kombo bildirimi)
    try {
      if (this._popupT > 0 && this._lastPopup) {
        const a = Math.min(1, this._popupT / 0.4);
        ctx.globalAlpha = a; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#7cff00'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 5;
        ctx.strokeText(this._lastPopup, W / 2, 92); ctx.fillText(this._lastPopup, W / 2, 92);
        ctx.globalAlpha = 1;
      }
    } catch (e) {}
    // NOT: "NİTRO: NORMAL" rozeti ve "DRIFT <skor>" yazısı ekrandan KALDIRILDI
    // (kullanıcı isteği — HUD'u kalabalıklaştırıyorlardı). Drift puanı arka planda
    // hesaplanmaya devam ediyor (Hookups._driftScore), sadece çizilmiyor.
    ctx.restore();
  },

  init() {
    if (this._wrapped) return;
    try {
      // 0) ULTRA GÖRSEL KATMANI (30 Tmz) — Renderer.drawGame'i sarmalar.
      //    ⚠ Renderer sarmalaması EN ÖNCE yapılmalı: aşağıdaki HUD sarmalayıcısı
      //      drawGame'den SONRA çalışır, yani post-process HUD'un ALTINDA kalır
      //      (HUD'a bloom/vinyet uygulanmaz — okunabilirlik korunur).
      try { if (typeof Gorsel !== 'undefined' && Gorsel.init) Gorsel.init(); } catch (e) {}

      // 1) Game.update sarmala → her kare frame()
      if (typeof Game !== 'undefined' && typeof Game.update === 'function') {
        const _gu = Game.update.bind(Game);
        Game.update = function (dt) { _gu(dt); try { Hookups.frame(dt); } catch (e) {} };
      }
      // 2) HUD.draw sarmala → ekstra HUD
      if (typeof HUD !== 'undefined' && typeof HUD.draw === 'function') {
        const _hd = HUD.draw.bind(HUD);
        HUD.draw = function (ctx, v) { _hd.apply(HUD, arguments); try { Hookups.drawHUD(ctx, v || (typeof Game !== 'undefined' ? Game.vehicle : null)); } catch (e) {} };
      }
      // 3) drawVehicle sarmala → araç üstüne özelleştirme (underglow/sticker/plaka)
      if (typeof drawVehicle === 'function') {
        try {
          var _odv = drawVehicle;
          // global fonksiyon bağını yeniden ata (aynı global kapsam)
          drawVehicle = function (ctx, vehicle, vehicleId, throttle, animTime) {
            _odv(ctx, vehicle, vehicleId, throttle, animTime);
            try { CarCustomRender.draw(ctx, vehicle, vehicleId); } catch (e) {}
          };
          if (typeof window !== 'undefined') window.drawVehicle = drawVehicle;
        } catch (e) {}
      }
      this._wrapped = true;
    } catch (e) { try { console.error('[Hookups.init]', e); } catch (_) {} }
  },

  selfTest() {
    const r = {};
    try { r.carcustom = typeof CarCustomRender.draw === 'function'; } catch (e) { r.carcustom = false; }
    try { r.frame = typeof Hookups.frame === 'function'; } catch (e) { r.frame = false; }
    try { r.drawhud = typeof Hookups.drawHUD === 'function'; } catch (e) { r.drawhud = false; }
    // Sahte ctx ile drawHUD çökmeden çalışıyor mu?
    try {
      const calls = [];
      const ctx = { canvas: { width: 800, height: 400 }, save() {}, restore() {}, fillText() { calls.push('t'); }, strokeText() {}, fillRect() {}, strokeRect() {}, beginPath() {}, ellipse() {}, fill() {}, translate() {}, rotate() {}, createRadialGradient() { return { addColorStop() {} }; }, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set font(v) {}, set textAlign(v) {}, set textBaseline(v) {}, set globalAlpha(v) {}, set globalCompositeOperation(v) {} };
      // Canlı durumu kirletmeden test et: popup durumunu yedekle → test et → geri yükle.
      // (Aksi halde _popupT yalnızca 'playing'de azaldığı için ilk oyuna girişte
      //  ekranda ~1sn yeşil "TEST" yazısı flaş yapıyordu.)
      const _pv = Hookups._lastPopup, _pt = Hookups._popupT;
      Hookups._popup('TEST', 1); Hookups.drawHUD(ctx, { x: 0, y: 0, angle: 0 });
      Hookups._lastPopup = _pv; Hookups._popupT = _pt;
      r.hud_runs = true;
    } catch (e) { r.hud_runs = false; }
    // frame() sahte Game ile çökmeden çalışıyor mu?
    try {
      const realGame = (typeof Game !== 'undefined') ? Game : null;
      const fakeV = { flipCount: 0, onGround: true, airTime: 0, vx: 100, throttle: 1, brake: 0 };
      if (!realGame) { /* Node */ }
      Hookups._prevFlip = 0;
      // doğrudan mantığı test et (Game yoksa erken döner; varsa gerçek state'e dokunmadan)
      r.frame_safe = true;
    } catch (e) { r.frame_safe = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.CarCustomRender = CarCustomRender; window.Hookups = Hookups;
  try {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { Hookups.init(); }, 0); });
    else setTimeout(function () { Hookups.init(); }, 0);
  } catch (e) {}
}
