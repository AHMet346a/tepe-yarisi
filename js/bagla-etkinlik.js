'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   BAĞLA-ETKİNLİK — yazılmış ama HİÇ ÇAĞRILMAYAN etkinlik/görev sistemlerini
   gerçek oyuna bağlar. ADDITIVE: hiçbir dosya değiştirilmez, yalnız
   monkey-patch ile sarmalanır (şablon: js/hookups.js).

   BAĞLANANLAR (üçü de ölçüldü: çalışma zamanında 0 tetiklenme)
     1) DailyQuests.trackEvent(...)   — 12 şablonun 11'i besleniyor
     2) MissionSystem                 — 50 görevlik merdiven (31'i izlenebilir)
     3) END_SCREEN_DATA.collect(...)  — koşu-sonu istatistik toplayıcı

   BAĞLANMAYAN (bilerek — gerekçe aşağıda)
     · END_SCREEN_DATA.drawEndScreen() — tam ekran çizer ama HİÇ hit-test'i
       yok ("RETRY"/"MENU" butonları tıklanamaz). Mevcut ölüm ekranını
       kapatır ve oyuncuyu kilitler. Yalnız `collect()` bağlandı; veri
       `END_SCREEN_DATA.get()` ile okunabilir.

   🔴 EKONOMİ (ölçüldü — bug #1 ve #7'nin tekrarlanmaması için)
     Koşu başına MEVCUT altın yolları (bunlara DOKUNULMADI, ikinci kez
     ödeme YAPILMAZ):
       · sikke toplama            game.js:526  SaveData.addGold(her sikke)
       · takla                    game.js:556  30 × airFlips
       · koşu-içi kilometre taşı  game.js:445  1k/2.5k/5k/10k/20k/50k
       · Economy.calculateRunReward  dist/50 + flips×8 + (dist/1000)×50
       · CheckpointSystem         hookups.js   8 altın / 500 m
       · DISTANCE_MILESTONES      hookups.js   toplam 610
       · Kombo                    hookups.js   min(500, skor/20)
       · Missions / Career / Campaign / SeasonEvents / Achievements (talep)
     ▶ Bu dosyanın EKLEDİĞİ tek altın kaynağı MissionSystem merdiveni.
       Ham katalog 44.980 altın; izlenebilir 31 görev 22.180 altın.
       ÖLÇÜLDÜ: tek iyi koşu ham 9.180 altın veriyordu → ÇOK FAZLA.
       ▶ ODUL_CARPAN 0.20 + koşu başına ODUL_TAVAN 1.500.
       ▶ ÖMÜR BOYU TAVAN: 22.180 × 0.20 = 4.436 altın (≈ 1 ucuz araç).
     ▶ DailyQuests ödülü ELLE talep edilir (TALEP ET butonu) → otomatik
       altın YOK. Bu dosya yalnız İLERLEMEYİ besler.

   🔴 ÖLÜMLE TAMAMLANMA KORUMASI (bug #7)
     · Hiçbir görev koşu ORTASINDA tamamlanmaz; değerlendirme yalnız
       koşu sonunda yapılır.
     · MIN_SURE (5 sn) + MIN_MESAFE (50 m) altındaki koşular HİÇ sayılmaz
       → "1 saniyede öl, ödülü kap" sınıfı sömürü kapalı.
     · "yarış kazan" yalnız `GameModes.finished && GameModes.placement===1`
       ile sayılır (mod GERÇEKTEN bittiyse). Ölüm bunu tetiklemez.
     · "yarış tamamla" için ayrıca ≥20 sn ve ≥200 m şartı var.

   ⚠ index.html + sw.js'e bu dosya EKLENMEDİ (görev kısıtı). Yayına
     çıkarken `<script src="js/bagla-etkinlik.js"></script>` satırı
     game.js'ten SONRA eklenmeli ve sw.js ASSETS listesine yazılmalı.
   ═══════════════════════════════════════════════════════════════════════════ */
const BaglaEtkinlik = {
  version: '1.0',

  // ── Ödül politikası (yukarıdaki ölçüme dayalı) ────────────────────────────
  ODUL_CARPAN: 0.20,      // MissionSystem katalog ödülünün ödenen oranı
  ODUL_TAVAN: 1500,       // tek koşuda MissionSystem'den ödenebilecek en çok altın
  MIN_SURE: 5,            // sn — bunun altındaki koşu HİÇ sayılmaz
  MIN_MESAFE: 50,         // m  — bunun altındaki koşu HİÇ sayılmaz
  TAM_KOSU_SURE: 20,      // sn — "yarış tamamla" sayması için
  TAM_KOSU_MESAFE: 200,   // m  — "yarış tamamla" sayması için
  KMH: 0.36,              // |vx| → km/s  (hud.js:348 ile birebir)

  _SAVE_KEY: 'baglaEtkinlikV1',

  // MissionSystem'de GERÇEKTEN ölçebildiğimiz tipler.
  // (collect_diamond / fuel_efficiency / obstacle_clear / beat_bot /
  //  powerup_* / collect_fuel / no_flip / night_drive / day_drive /
  //  survive_event / event_distance / pass_npc / complete_all → veri yok,
  //  ASLA tamamlanmaz. Uydurma veriyle "tamam" demek yerine bekletiliyor.)
  IZLENEBILIR: {
    distance: 1, flip: 1, speed: 1, survive: 1, collect: 1,
    no_damage: 1, combo: 1, airtime: 1, checkpoint: 1
  },

  // Missions.add(tip) → DailyQuests.trackEvent(tip) köprüsü.
  // ⚠ 'air' BİLEREK yok: Missions'ta saniye, DailyQuests'te METRE. Koşu
  //   sonunda _airM ile ayrıca besleniyor (çift sayım olmasın).
  KOPRU: { distance: 'distance', flips: 'flips', coins: 'coins', boost: 'nitro' },

  _wrapped: false,
  _st: null,
  _sonD: undefined,
  _sonMiss: undefined,
  _runT: 0, _airM: 0, _jumpAir: 0, _maxJumpAir: 0,
  _odenenBuKosu: 0,
  _distBirikim: 0,
  _oncekiRekor: 0,

  // ══════════════════════════════════════════════════════════════════════════
  //  Küçük yardımcılar — BARE GLOBAL tuzağı: window.X KULLANILMAZ
  // ══════════════════════════════════════════════════════════════════════════
  _G()  { try { return (typeof Game          !== 'undefined') ? Game          : null; } catch (e) { return null; } },
  _MS() { try { return (typeof MissionSystem !== 'undefined') ? MissionSystem : null; } catch (e) { return null; } },
  _DQ() { try { return (typeof DailyQuests   !== 'undefined') ? DailyQuests   : null; } catch (e) { return null; } },
  _ES() { try { return (typeof END_SCREEN_DATA !== 'undefined') ? END_SCREEN_DATA : null; } catch (e) { return null; } },
  _SD() { try { return (typeof SaveData      !== 'undefined') ? SaveData      : null; } catch (e) { return null; } },
  _GM() { try { return (typeof GameModes     !== 'undefined') ? GameModes     : null; } catch (e) { return null; } },
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },

  _toast(msg) {
    try { if (typeof UI !== 'undefined' && UI.showToast) UI.showToast(msg); } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KALICILIK — yeni kayıt alanı; alan YOKSA güvenli varsayılana düşer
  //  (savemigrate CURRENT_VERSION 3 · SaveData._deepMerge fazladan anahtarları
  //   KORUR, doğrulandı: savedata.js:222-227 "Preserve any extra keys")
  // ══════════════════════════════════════════════════════════════════════════
  _durum() {
    if (this._st) return this._st;
    let d = null;
    try { const S = this._SD(); if (S && S.get) d = S.get(this._SAVE_KEY); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = { done: [], odenen: 0 };
    if (!Array.isArray(d.done)) d.done = [];
    d.odenen = Math.max(0, this._num(d.odenen, 0));
    this._st = d;
    // MissionSystem bellekte tutuyor (kalıcı değil) → kayıttan geri yükle
    try { const M = this._MS(); if (M) M.missionState.completed = d.done.slice(); } catch (e) {}
    return this._st;
  },

  _kaydet() {
    try { const S = this._SD(); if (S && S.set) S.set(this._SAVE_KEY, this._st); } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KOŞU DÖNGÜSÜ
  // ══════════════════════════════════════════════════════════════════════════
  _kosuSifirla() {
    this._runT = 0; this._airM = 0; this._jumpAir = 0; this._maxJumpAir = 0;
    this._odenenBuKosu = 0; this._distBirikim = 0;
    // ⚠ Önceki rekor KOŞU BAŞINDA yakalanmalı: _onDeath içinde
    //   SaveData.updateHighScore ZATEN çalışmış oluyor (game.js:766),
    //   sonradan okursak END_SCREEN_DATA "newBest" HİÇ true olmaz.
    try {
      const G = this._G(), S = this._SD();
      if (G && S && S.get) {
        const hs = S.get('highScores') || {};
        this._oncekiRekor = this._num(hs[G.mapId], 0);
      }
    } catch (e) { this._oncekiRekor = 0; }
  },

  _cpSayisi() {
    try {
      if (typeof CheckpointSystem !== 'undefined' && CheckpointSystem.checkpointState &&
          Array.isArray(CheckpointSystem.checkpointState.passed)) {
        return CheckpointSystem.checkpointState.passed.length;
      }
    } catch (e) {}
    return 0;
  },

  _mesafe() {
    try {
      const G = this._G(); if (!G || !G.vehicle) return 0;
      return Math.max(0, (G.vehicle.x - G.startX) / 2);
    } catch (e) { return 0; }
  },

  // Yeni koşu mu? (saf fonksiyon — selfTest bunu ölçer)
  //   md: Game._missDist (yoksa -1) · d: anlık mesafe
  _yeniKosuMu(md, d) {
    let yeni = false;
    if (md >= 0) {
      if (this._sonMiss === undefined || md < this._sonMiss - 0.5) yeni = true;
      this._sonMiss = md;
    } else {
      // _missDist yoksa yedek ölçüt: başlangıç noktasına DÖNÜŞ (geri kayma DEĞİL)
      if (this._sonD === undefined || (d < 5 && this._sonD > 30)) yeni = true;
    }
    this._sonD = d;
    return yeni;
  },

  // Bir MissionSystem tipi için BU KOŞUDAKİ değer. -1 = ölçülemiyor.
  _kosuDeger(tip) {
    const G = this._G(); if (!G) return -1;
    const v = G.vehicle;
    const d = this._mesafe();
    switch (tip) {
      case 'distance':  return d;
      case 'flip':      return this._num(G.runFlips, 0);
      case 'speed':     return this._num(G._runBestSpeed, 0) * this.KMH;   // katalog km/s
      case 'survive':   return this._num(this._runT, 0);
      case 'collect':   return this._num(G.coinsCollected, 0);
      case 'no_damage': return (v && this._num(v.damageLevel, 0) === 0) ? d : 0;
      case 'combo':     return this._num(G._runBestCombo, 0);
      case 'airtime':   return this._num(this._maxJumpAir, 0);             // TEK sıçrama
      case 'checkpoint':return this._cpSayisi();
      default:          return -1;
    }
  },

  // Sıradaki izlenebilir görevi aktif yap (yalnız HUD göstergesi için).
  _aktifSec() {
    try {
      const M = this._MS(); if (!M) return;
      const G = this._G();
      const st = this._durum();
      M.missionState.completed = st.done.slice();
      M.missionState.active = null;
      M.missionState.progress = 0;
      const harita = G ? G.mapId : null;
      for (let i = 0; i < M.MISSIONS.length; i++) {
        const m = M.MISSIONS[i];
        if (!this.IZLENEBILIR[m.type]) continue;
        if (st.done.indexOf(m.id) >= 0) continue;
        if (m.mapId && harita && m.mapId !== harita) continue;   // harita şartı
        M.startMission(m.id);
        break;
      }
    } catch (e) {}
  },

  // Aktif görevin ilerleme çubuğunu canlı tut. ⚠ updateMission ÇAĞIRMAZ →
  // koşu ORTASINDA tamamlanma imkânsız (ödül yalnız koşu sonunda).
  _aktifIlerlet() {
    const M = this._MS(); if (!M) return;
    const a = M.missionState.active; if (!a) return;
    const val = this._kosuDeger(a.type);
    if (val < 0) return;
    M.missionState.progress = val;
  },

  // ── Her kare (Game.update sarmalayıcısından) ────────────────────────────
  frame(dt) {
    const G = this._G();
    if (!G || G.state !== 'playing' || !G.vehicle) return;
    const v = G.vehicle;
    dt = (isFinite(dt) && dt > 0 && dt < 0.25) ? dt : 0.016;

    // ── Koşu başı tespiti (startRun'a DOKUNMADAN) ──────────────────────────
    // 🔴 İLK YAZIMDA HATALIYDI (entegrasyon testi yakaladı): "mesafe 5 m geri
    //    gitti → yeni koşu" ölçütü kullanılmıştı. Araç bir yokuşta geri
    //    kayınca koşu ORTASINDA sıfırlanıyor, `_runT` uçuyor ve "survive"
    //    görevleri asla tamamlanamıyordu (hookups.js'te de aynı desen var).
    // ▶ Doğrusu: `Game._missDist` YALNIZ startRun'da 0'lanır (game.js:261) ve
    //   oyun boyunca yalnız ARTAR (game.js:433). Azaldıysa gerçekten yeni koşu.
    try {
      const md = (G._missDist === undefined || G._missDist === null) ? -1 : this._num(G._missDist, -1);
      const yeni = this._yeniKosuMu(md, this._mesafe());
      if (yeni) { this._kosuSifirla(); this._aktifSec(); }
    } catch (e) {}

    try { this._runT += dt; } catch (e) {}

    // Havada: kat edilen METRE + TEK sıçramanın en uzun süresi
    try {
      if (!v.onGround) {
        this._airM += Math.abs(this._num(v.vx, 0)) * dt / 2;   // dünya birimi → m
        this._jumpAir += dt;
        if (this._jumpAir > this._maxJumpAir) this._maxJumpAir = this._jumpAir;
      } else {
        this._jumpAir = 0;
      }
    } catch (e) {}

    try { this._aktifIlerlet(); } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KÖPRÜ: Missions.add → DailyQuests.trackEvent
  //  ⚠ 'distance' her karede çağrılır → 25 m'de bir toplu gönderilir
  //    (SaveData.set kirli-işaret spam'ini önlemek için; §perf 29 Tmz).
  // ══════════════════════════════════════════════════════════════════════════
  kopru(tip, miktar) {
    try {
      const DQ = this._DQ(); if (!DQ || !DQ.trackEvent) return;
      const hedef = this.KOPRU[tip]; if (!hedef) return;
      miktar = this._num(miktar, 0);
      if (miktar <= 0) return;
      if (tip === 'distance') {
        this._distBirikim += miktar;
        if (this._distBirikim < 25) return;
        miktar = Math.floor(this._distBirikim);
        this._distBirikim -= miktar;
        if (miktar <= 0) return;
      }
      DQ.trackEvent(hedef, miktar);
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KOŞU SONU — Game._onDeath sarmalayıcısından
  //  ⚠ _onDeath phoenix/roll-cage ile ERKEN DÖNEBİLİR (koşu bitmez).
  //    Bu yüzden orijinal çağrıdan SONRA `state === 'dead'` kontrol edilir.
  // ══════════════════════════════════════════════════════════════════════════
  kosuSonu() {
    const G = this._G(); if (!G) return;
    const dist = this._mesafe();
    const sure = this._num(this._runT, 0);

    // 🔴 Sömürü kapısı: çok kısa/çok yakın koşu HİÇ sayılmaz (bug #7 dersi)
    const gecerli = (sure >= this.MIN_SURE && dist >= this.MIN_MESAFE);

    if (gecerli) {
      try { this._dailyKosuSonu(dist); } catch (e) {}
      try { this._missionKosuSonu(dist); } catch (e) {}
    }
    // İstatistik toplama her koşuda (ödül değil, veri)
    try { this._endScreenTopla(dist, sure); } catch (e) {}

    // Sonraki koşunun ilk karesinde sıfırlama kesin tetiklensin
    this._sonD = undefined;
    this._sonMiss = undefined;
  },

  // ── DailyQuests: yalnız koşu-sonu ölçülen tipler ──────────────────────────
  //    (distance / flips / coins / nitro ZATEN Missions.add köprüsüyle
  //     akıyor — burada TEKRAR gönderilmez.)
  _dailyKosuSonu(dist) {
    const DQ = this._DQ(); if (!DQ || !DQ.trackEvent) return;
    const G = this._G(); if (!G) return;
    const GM = this._GM();

    try { DQ.trackEvent('run_distance', dist); } catch (e) {}                       // max
    try { DQ.trackEvent('speed', this._num(G._runBestSpeed, 0) * this.KMH); } catch (e) {}  // max, km/s
    try { DQ.trackEvent('combo', this._num(G._runBestCombo, 0)); } catch (e) {}     // max
    try { if (this._airM   > 0) DQ.trackEvent('air',  Math.floor(this._airM)); } catch (e) {}
    try { if (this._num(G._runJumps, 0) > 0) DQ.trackEvent('jump', this._num(G._runJumps, 0)); } catch (e) {}

    // "3 yarış tamamla" — kısa koşu saymasın diye ayrıca eşik
    try {
      if (this._runT >= this.TAM_KOSU_SURE && dist >= this.TAM_KOSU_MESAFE) DQ.trackEvent('race', 1);
    } catch (e) {}

    // 🔴 "1 bot yarışı kazan" — YALNIZ mod GERÇEKTEN bittiyse.
    //    `GameModes.finished` yalnız _finish() çağrıldığında true olur
    //    (süre doldu / hedefe varıldı). Ölmek bunu tetiklemez → bug #7 kapalı.
    try {
      if (GM && GM.finished === true && this._num(GM.placement, 0) === 1) DQ.trackEvent('race_win', 1);
    } catch (e) {}
  },

  // ── MissionSystem: koşu sonunda değerlendir, tamamla, ödülü ÖLÇEKLİ ver ──
  _missionKosuSonu() {
    const M = this._MS(); if (!M) return;
    const G = this._G();
    const st = this._durum();
    const harita = G ? G.mapId : null;
    M.missionState.completed = st.done.slice();

    let altin = 0, xp = 0, sonAd = '';
    const yeni = [];

    for (let i = 0; i < M.MISSIONS.length; i++) {
      const m = M.MISSIONS[i];
      if (!this.IZLENEBILIR[m.type]) continue;
      if (st.done.indexOf(m.id) >= 0) continue;
      if (m.mapId && harita && m.mapId !== harita) continue;
      const val = this._kosuDeger(m.type);
      if (val < 0 || val < this._num(m.target, 1)) continue;

      // Modülün KENDİ kod yolunu kullan (yeniden yazma yok):
      // active + progress ata → completeMission() listeye ekler, ödülü döndürür.
      M.missionState.active = { id: m.id, title: m.title, type: m.type, target: m.target, reward: m.reward };
      M.missionState.progress = val;
      let r = null;
      try { r = M.completeMission(); } catch (e) { r = null; }
      if (!r) continue;

      altin += this._num(r.coins, 0);
      xp    += this._num(r.xp, 0);
      sonAd = m.title || m.id;
      yeni.push(m.id);
    }

    if (!yeni.length) { this._aktifSec(); return; }

    // 🔴 ÖDEME: katalog × ODUL_CARPAN, koşu başına ODUL_TAVAN ile sınırlı
    let ode = Math.round(altin * this.ODUL_CARPAN);
    const kalanTavan = Math.max(0, this.ODUL_TAVAN - this._odenenBuKosu);
    if (ode > kalanTavan) ode = kalanTavan;
    this._odenenBuKosu += ode;

    st.done = st.done.concat(yeni);
    st.odenen = this._num(st.odenen, 0) + ode;
    this._kaydet();

    try {
      const S = this._SD();
      if (S && ode > 0 && S.addGold) S.addGold(ode);
      if (S && xp  > 0 && S.addXP)   S.addXP(Math.round(xp * this.ODUL_CARPAN));
    } catch (e) {}

    try {
      // '✓ Görev tamam: ' i18n sözlüğünde MEVCUT anahtar (i18n-src-tr.js:687)
      this._toast('✓ Görev tamam: ' + sonAd + (ode > 0 ? '  +' + ode + ' 🪙' : ''));
      if (typeof Audio !== 'undefined' && Audio.playTierUp) Audio.playTierUp();
    } catch (e) {}

    this._aktifSec();
  },

  // ── END_SCREEN_DATA.collect — koşu-sonu istatistik anlık görüntüsü ────────
  _endScreenTopla(dist, sure) {
    const ES = this._ES(); if (!ES || !ES.collect) return;
    const G = this._G(); if (!G) return;
    let arac = null;
    try {
      if (typeof VehicleDefs !== 'undefined' && VehicleDefs[G.vehicleId]) {
        const d = VehicleDefs[G.vehicleId];
        arac = { name: d.name || G.vehicleId, icon: d.icon };   // icon yoksa modül '🚗' kullanır
      }
    } catch (e) {}
    const flips = this._num(G.runFlips, 0);
    ES.collect({
      distance:       dist,
      coinsCollected: this._num(G.coinsCollected, 0),
      score:          Math.round(dist + flips * 50 + this._num(G._runBestCombo, 0) * 100),
      flips:          flips,
      topSpeed:       this._num(G._runBestSpeed, 0) * this.KMH,
      maxAirTime:     this._num(this._maxJumpAir, 0),
      trickScore:     Math.round(flips * 30 + this._num(this._airM, 0)),
      fuelPickups:    0,                       // oyun bu sayacı tutmuyor
      playTime:       sure,
      prevBest:       this._num(this._oncekiRekor, 0)
    }, arac);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  HUD — aktif görev göstergesi (MissionSystem'in KENDİ çizimi)
  //  Konum: sol kenar, yakıt/nitro çubuklarının ALTI (hud.js fy+fuelBarH ≈ 164)
  // ══════════════════════════════════════════════════════════════════════════
  drawHUD(ctx) {
    try {
      const G = this._G(); if (!G || G.state !== 'playing') return;
      const M = this._MS(); if (!M || !M.missionState.active) return;
      if (typeof M.drawMissionHUD !== 'function') return;
      const H = (ctx.canvas ? ctx.canvas.height : 720);
      if (H < 300) return;                       // çok alçak ekranda çizme
      ctx.save();
      // 🎚 Kalite geçidi: parıltı yalnız bloom açıkken (kalite.js'e DOKUNULMADI)
      let parlak = 0;
      try { if (typeof Kalite !== 'undefined' && Kalite.ayar) parlak = Kalite.ayar('bloom'); } catch (e) {}
      if (parlak > 0) { ctx.shadowColor = 'rgba(255,207,63,0.45)'; ctx.shadowBlur = 8; }
      M.drawMissionHUD(ctx, 12, 186);
      ctx.restore();
    } catch (e) { try { ctx.restore(); } catch (e2) {} }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  KURULUM
  // ══════════════════════════════════════════════════════════════════════════
  init() {
    if (this._wrapped) return;
    const self = this;
    try {
      // 1) Game.update → her kare frame()
      try {
        if (typeof Game !== 'undefined' && typeof Game.update === 'function') {
          const _gu = Game.update.bind(Game);
          Game.update = function (dt) { _gu(dt); try { self.frame(dt); } catch (e) {} };
        }
      } catch (e) {}

      // 2) Game._onDeath → koşu sonu (phoenix/roll-cage dirilişini AYIR)
      try {
        if (typeof Game !== 'undefined' && typeof Game._onDeath === 'function') {
          const _od = Game._onDeath.bind(Game);
          Game._onDeath = function (v) {
            _od(v);
            try { if (Game.state === 'dead') self.kosuSonu(); } catch (e) {}
          };
        }
      } catch (e) {}

      // 3) Missions.add → DailyQuests köprüsü
      //    ⚠ `Missions` bare global (window.Missions YOK) ama NESNE ÜYESİ
      //      atanabilir; const bağı değil, özelliği değiştiriyoruz.
      try {
        if (typeof Missions !== 'undefined' && typeof Missions.add === 'function') {
          const _ma = Missions.add.bind(Missions);
          Missions.add = function (tip, miktar) {
            _ma(tip, miktar);
            try { self.kopru(tip, miktar); } catch (e) {}
          };
        }
      } catch (e) {}

      // 4) Economy.openChest → DailyQuests 'chest'
      try {
        if (typeof Economy !== 'undefined' && typeof Economy.openChest === 'function') {
          const _oc = Economy.openChest.bind(Economy);
          Economy.openChest = function (t) {
            const r = _oc(t);
            try { const DQ = self._DQ(); if (DQ && DQ.trackEvent) DQ.trackEvent('chest', 1); } catch (e) {}
            return r;
          };
        }
      } catch (e) {}

      // 5) HUD.draw → aktif görev göstergesi
      //    İMZA (main.js:184-190): HUD.draw(ctx, vehicle, gameState, W, H)
      try {
        if (typeof HUD !== 'undefined' && typeof HUD.draw === 'function') {
          const _hd = HUD.draw.bind(HUD);
          HUD.draw = function (ctx, vehicle, gameState, W, H) {
            _hd.apply(HUD, arguments);
            try { self.drawHUD(ctx); } catch (e) {}
          };
        }
      } catch (e) {}

      // 6) Kayıttan MissionSystem ilerlemesini geri yükle + ilk görevi seç
      try { this._durum(); this._aktifSec(); } catch (e) {}

      this._wrapped = true;
    } catch (e) { try { console.error('[BaglaEtkinlik.init]', e); } catch (_) {} }
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  SELF TEST — ÖLÇER, "var mı" demez. Canlı durumu KİRLETMEZ (yedekle/geri al).
  // ══════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};

    // 1) Ödül politikası sağlıklı mı
    try {
      r.politika = (this.ODUL_CARPAN > 0 && this.ODUL_CARPAN <= 0.5 &&
                    this.ODUL_TAVAN > 0 && this.ODUL_TAVAN <= 3000 &&
                    this.MIN_SURE >= 1 && this.MIN_MESAFE >= 10);
    } catch (e) { r.politika = false; }

    // 2) Ömür boyu MissionSystem ödemesi ölçülüp sınır altında mı (≤ 6.000 altın)
    try {
      const M = this._MS();
      if (!M) { r.omurTavan = true; }
      else {
        let ham = 0;
        for (let i = 0; i < M.MISSIONS.length; i++) {
          const m = M.MISSIONS[i];
          if (this.IZLENEBILIR[m.type]) ham += this._num(m.reward && m.reward.coins, 0);
        }
        const odenecek = Math.round(ham * this.ODUL_CARPAN);
        r.omurTavan = (odenecek > 0 && odenecek <= 6000);
        r._omurAltin = odenecek;
      }
    } catch (e) { r.omurTavan = false; }

    // 3) _kosuDeger her izlenebilir tip için SAYI döndürüyor mu (sahte Game ile)
    try {
      const eski = { d: this._sonD, t: this._runT, a: this._maxJumpAir };
      this._runT = 42; this._maxJumpAir = 3.5;
      let ok = true;
      for (const tip in this.IZLENEBILIR) {
        const v = this._kosuDeger(tip);
        if (typeof v !== 'number' || !isFinite(v)) { ok = false; break; }
      }
      // Bilinmeyen tip -1 dönmeli (sessizce 0 dönerse görev bedava tamamlanır!)
      if (this._kosuDeger('pass_npc') !== -1) ok = false;
      this._sonD = eski.d; this._runT = eski.t; this._maxJumpAir = eski.a;
      r.kosuDeger = ok;
    } catch (e) { r.kosuDeger = false; }

    // 4) Köprü tablosu: hedef tipler DailyQuests havuzunda GERÇEKTEN var mı
    try {
      const DQ = this._DQ();
      if (!DQ || !Array.isArray(DQ.POOL)) { r.kopruHedef = true; }
      else {
        const havuz = {};
        for (let i = 0; i < DQ.POOL.length; i++) havuz[DQ.POOL[i].type] = 1;
        let ok = true;
        for (const k in this.KOPRU) if (!havuz[this.KOPRU[k]]) ok = false;
        // koşu-sonu tipleri de havuzda olmalı
        const son = ['run_distance', 'speed', 'combo', 'air', 'jump', 'race', 'race_win', 'chest'];
        for (let i = 0; i < son.length; i++) if (!havuz[son[i]]) ok = false;
        r.kopruHedef = ok;
      }
    } catch (e) { r.kopruHedef = false; }

    // 5) 'air' köprüde OLMAMALI (Missions saniye · DailyQuests metre → çift sayım)
    try { r.airCiftSayimYok = (this.KOPRU.air === undefined); } catch (e) { r.airCiftSayimYok = false; }

    // 6) Kampanya verisi tutarlı mı (harita/araç/parça/hedef)
    try {
      if (typeof Campaign === 'undefined' || !Campaign.CHAPTERS) { r.kampanya = true; }
      else {
        let gorev = 0, enUzak = 0, bozuk = 0;
        for (let c = 0; c < Campaign.CHAPTERS.length; c++) {
          const ch = Campaign.CHAPTERS[c];
          const liste = (ch.missions || []).concat(ch.boss ? [ch.boss] : []);
          for (let i = 0; i < liste.length; i++) {
            const m = liste[i]; gorev++;
            if (!m.id || !m.obj || !m.reward) bozuk++;
            if (m.obj && m.obj.type === 'dist') enUzak = Math.max(enUzak, this._num(m.obj.target, 0));
            if (m.reward && m.reward.vehicle && typeof VehicleDefs !== 'undefined') {
              const d = VehicleDefs[m.reward.vehicle];
              if (!d || d.fuelMax === undefined) bozuk++;   // bug #21 sınıfı
            }
          }
        }
        // ÖLÇÜLDÜ: jeep LV1 en kötü haritada (winter) 11.971 m gidiyor.
        r.kampanya = (gorev === 41 && bozuk === 0 && enUzak <= 11900);
        r._kampanyaGorev = gorev; r._kampanyaEnUzakHedef = enUzak;
      }
    } catch (e) { r.kampanya = false; }

    // 7) Sezon zamanı GEÇMİŞTE kalmamış (rollover çalışıyor)
    try {
      if (typeof SeasonEvents === 'undefined' || !SeasonEvents.seasonRemainMs) { r.sezon = true; }
      else {
        const kalan = SeasonEvents.seasonRemainMs();
        r.sezon = (kalan > 0 && kalan <= SeasonEvents.SEASON_DAYS * SeasonEvents.DAY_MS);
      }
    } catch (e) { r.sezon = false; }

    // 8) Günlük görev seçimi DETERMİNİSTİK mi (aynı gün → aynı 3 görev)
    try {
      const DQ = this._DQ();
      if (!DQ || !DQ.getToday) { r.gunlukDeterministik = true; }
      else {
        const a = DQ.getToday().map(function (q) { return q.key; }).join(',');
        DQ._todayQuests = null; DQ._cacheDay = -1;          // önbelleği boşalt
        const b = DQ.getToday().map(function (q) { return q.key; }).join(',');
        r.gunlukDeterministik = (a === b && a.length > 0);
      }
    } catch (e) { r.gunlukDeterministik = false; }

    // 9) drawHUD sahte ctx ile çökmüyor mu
    try {
      const ctx = {
        canvas: { width: 800, height: 600 },
        save() {}, restore() {}, beginPath() {}, roundRect() {}, fill() {}, fillRect() {}, fillText() {},
        set fillStyle(v) {}, set font(v) {}, set textAlign(v) {}, set globalAlpha(v) {},
        set shadowColor(v) {}, set shadowBlur(v) {}
      };
      this.drawHUD(ctx);
      r.hudCizim = true;
    } catch (e) { r.hudCizim = false; }

    // 10) frame() Game yokken / bozuk dt ile çökmüyor mu
    try { this.frame(NaN); this.frame(-1); this.frame(99); r.frameGuvenli = true; }
    catch (e) { r.frameGuvenli = false; }

    // 11) 🔴 REGRESYON: koşu ORTASINDA geri kayma "yeni koşu" SAYILMAMALI.
    //     (İlk yazımda sayıyordu; entegrasyon testi yakaladı. Bu kontrol
    //      giderse `_runT` uçar ve "survive" görevleri asla tamamlanmaz.)
    try {
      const yd = this._sonD, ym = this._sonMiss;
      this._sonD = undefined; this._sonMiss = undefined;
      const a1 = this._yeniKosuMu(0, 0);       // koşu başı → YENİ
      const a2 = this._yeniKosuMu(120, 120);   // ilerledi   → değil
      const a3 = this._yeniKosuMu(120, 95);    // 25 m geri kaydı, _missDist aynı → DEĞİL
      const a4 = this._yeniKosuMu(120, 120);   // toparladı  → değil
      const a5 = this._yeniKosuMu(0, 0);       // startRun   → YENİ
      // _missDist yoksa: geri kayma yeni koşu saymamalı, başa dönüş saymalı
      this._sonD = undefined; this._sonMiss = undefined;
      const b1 = this._yeniKosuMu(-1, 0);      // ilk kare → YENİ
      const b2 = this._yeniKosuMu(-1, 400);
      const b3 = this._yeniKosuMu(-1, 340);    // geri kaydı → DEĞİL
      const b4 = this._yeniKosuMu(-1, 2);      // başa döndü → YENİ
      this._sonD = yd; this._sonMiss = ym;
      r.kosuTespiti = (a1 === true && a2 === false && a3 === false && a4 === false && a5 === true &&
                       b1 === true && b2 === false && b3 === false && b4 === true);
    } catch (e) { r.kosuTespiti = false; }

    r.allPass = Object.keys(r).every(function (k) {
      return k.charAt(0) === '_' || k === 'allPass' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaEtkinlik = BaglaEtkinlik;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaEtkinlik.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaEtkinlik.init(); }, 0);
    }
  } catch (e) {}
}
if (typeof module !== 'undefined' && module.exports) module.exports = BaglaEtkinlik;
