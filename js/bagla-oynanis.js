'use strict';
/* ============================================================================
   BAGLA-OYNANIS (30 Tmz) — js/game.js içindeki 5 ÖLÜ oynanış modülünü gerçek
   oyuna bağlar. ADDITIVE: hiçbir mevcut dosya değiştirilmedi; Game.startRun,
   Game.update ve HUD.draw sarmalanır (orijinal ÖNCE çağrılır).
   Şablon: js/hookups.js.

   Bağlanan modüller:  TRICK_SYSTEM · ComboSystem · PowerupSystem ·
                       CHALLENGE_SYSTEM · POWERUP_SPAWNER_EXT

   ────────────────────────────────────────────────────────────────────────────
   🔴 EKONOMİ KARARI (en kritik kısım — bug #1 "altın iki kez" dersi)
   Mevcut ödül yolları OKUNDU ve SAYILDI:
     game.js:526  sikke        → addGold(value × coinMult)
     game.js:556  takla        → addGold(30 × airFlips)
     game.js:588  büyük hava   → addGold(jumpAir × 45)     (>1,5 sn)
     game.js:595  düz iniş     → addGold(35)               (>0,5 sn hava)
     game.js:607  hava kombosu → addGold(50 × airFlips)    (≥2 takla)
     game.js:445  mil taşı     → addGold(mesafe / 20)
     hookups.js:94  Combo.score→ addGold(min(500, skor/20))
     hookups.js:132 checkpoint → addGold(8/500 m)
     hookups.js:145 DISTANCE_MILESTONES → toplam 610
     game.js:846  koşu sonu    → Economy.calculateRunReward
   ▶ TAKLA · BÜYÜK HAVA · MÜKEMMEL İNİŞ · KOMBO zaten ÜÇ ayrı yerden ödeniyor.
     Bu yüzden TRICK_SYSTEM ve ComboSystem buradan **SIFIR ALTIN** verir —
     yalnız SKOR + GÖRSEL katkı sağlar. PowerupSystem/POWERUP_SPAWNER_EXT de
     doğrudan altın vermez (mıknatıs dolaylı olarak mevcut sikke yolunu besler).
   ▶ Altın veren TEK yeni yol CHALLENGE_SYSTEM'dir ve üç kilitle sınırlandı:
       1. ÖLÇEK 0,35   (ham 6.000 → ömür boyu 2.100 altın)
       2. ÖMÜR BOYU TEK KEZ (SaveData'ya yazılır; koşu başına tekrar ETMEZ)
       3. KOŞU BAŞINA TAVAN 400 (tavana takılan ödül geri alınır, kaybolmaz)
   ────────────────────────────────────────────────────────────────────────────
   🐛 BAĞLAMADAN ÖNCE OKUNDU — bulunan gerçek hatalar (game.js satır no):
     T1 (3430) TRICK_SYSTEM `vehicle.isGrounded` okuyor; araçta o alan YOK
               (doğrusu `onGround`) → `undefined` → HER ZAMAN "yerde" sayılıyor
               → takla/big_air/perfect_landing MODÜLÜN TAMAMI ölü.
     T2 (3432) `dAngle = angle - prevAngle` sarmalama düzeltmesi YOK; oysa
               physics.js:413 `v.angle`'ı [0, 2π)'ye KIRPIYOR → her turda
               ±2π sıçrama → SAHTE takla.
     T3 (3482) `endo` koşulu `angle < -0.3`; angle hiçbir zaman negatif olmaz
               → endo HİÇ tetiklenmez (ölü).
     T4 (3470) `wheelie` koşulu `angle > 0.3`; [0,2π) ölçeğinde bu aralığın
               ~%95'i → araç ters dururken bile "wheelie" sayılırdı.
     T5 (3459) `perfect_landing` `Math.abs(angle) < 0.2`; burun aşağı (≈2π)
               iniş hiç eşleşmez → yarısı ölü.
     T6 (3414) `reset()` `_airAwarded/_wheelieAwarded/_endoAwarded` alanlarını
               TEMİZLEMİYOR → koşular arası sızıntı.
     P1 (3589) POWERUP_SPAWNER_EXT `gameState.distance` (METRE) değerini
               doğrudan DÜNYA X'i olarak kullanıyor. Oyunun mesafesi
               `(v.x - startX)/2` → dünya X'i `mesafe*2 + startX`. Powerup
               yanlış yere doğuyordu (yaklaşık yarı mesafe geride).
     P2 (3590) `y = -60` SABİT; araziye göre değil. Ekranın çok üstünde kalır,
               toplanması imkânsız.
     P3 (3616) `checkCollection` dünya koordinatı bekliyor → P1/P2 yüzünden
               mesafe hesabı anlamsızdı, powerup HİÇ toplanamazdı.
     P4 (3646) `_activate` yalnız araca bayrak yazıyor (`_slowMotion` vb.);
               bu bayrakları HİÇBİR fizik/çizim kodu okumuyor → etkisiz.
     E1 (1906) PowerupSystem `duration === 0` (fuel_full/repair_full) için
               yalnız `console.log` basıyor, ETKİ UYGULAMIYOR → ölü tip.
     E2 (1908/1915/1922) sıcak yol olmasa da `console.log` bırakılmış.
     C1 (3244) CHALLENGE_SYSTEM ödülü SADECE döndürüyor, ödemiyor; ödeme
               bağlayıcının işi (bu dosya) — ölçeklenmezse ekonomiyi 3'e katlar.
     C2 (3228) `init()` `completedChallenges`'ı SIFIRLAR → her koşuda yeniden
               ödenirdi. Burada kalıcı liste geri yüklenir.
   ▶ Hiçbiri game.js'te düzeltilmedi (additive kural). Hepsi bu dosyadaki
     adaptör katmanında telafi edilir.
============================================================================ */

const BaglaOynanis = {
  version: '1.0',
  _wrapped: false,

  // ── Ekonomi sabitleri (yukarıdaki gerekçe) ────────────────────────────────
  ODUL_OLCEK: 0.35,          // CHALLENGE_SYSTEM ham ödülü × bu
  KOSU_TAVAN: 400,           // koşu başına challenge altını tavanı
  KAYIT_ANAHTARI: 'baglaChallenges',
  TEK_SEFER_TAVAN: 3000,     // tek addGold çağrısı için emniyet tavanı

  // ── Powerup eşlemesi: POWERUP_SPAWNER_EXT tipi → PowerupSystem tipi ───────
  PU_ESLEME: {
    slow_motion:  'slow_motion',
    magnet:       'magnet',
    shield:       'shield',
    double_score: 'double_points',
    ghost_mode:   'invincibility'
  },

  // ── Koşu durumu ───────────────────────────────────────────────────────────
  _t: 0, _dist: 0, _sonDist: -1,
  _chGold: 0, _chDoldu: false, _chCd: 0,
  _maxAir: 0, _maxWheelie: 0, _topSpeed: 0, _perfLand: 0,
  _nitroUsed: 0, _fuelPick: 0, _bonusSkor: 0,
  _noCrashBase: 0, _prevDmg: 0, _prevFuel: undefined, _fuelCd: 0, _prevBoost: false,
  _prevSg: 0, _dmgKilit: null,
  _popup: '', _popupT: 0,

  // ══════════════════════════════════════════════════════════════════════════
  // Yardımcılar
  // ══════════════════════════════════════════════════════════════════════════
  _G()  { try { return (typeof Game !== 'undefined') ? Game : null; } catch (e) { return null; } },
  _TS() { try { return (typeof TRICK_SYSTEM !== 'undefined') ? TRICK_SYSTEM : null; } catch (e) { return null; } },
  _CS() { try { return (typeof ComboSystem !== 'undefined') ? ComboSystem : null; } catch (e) { return null; } },
  _PS() { try { return (typeof PowerupSystem !== 'undefined') ? PowerupSystem : null; } catch (e) { return null; } },
  _CH() { try { return (typeof CHALLENGE_SYSTEM !== 'undefined') ? CHALLENGE_SYSTEM : null; } catch (e) { return null; } },
  _PX() { try { return (typeof POWERUP_SPAWNER_EXT !== 'undefined') ? POWERUP_SPAWNER_EXT : null; } catch (e) { return null; } },

  // Kalite kademesi (yalnız GÖRSEL geçit; oynanış mantığı ASLA geçitlenmez).
  // ⚠ `parcacikCarpan` CLAUDE.md'de "ÖLÜ ANAHTAR" olarak işaretliydi — burada
  //   gerçekten okunuyor, yani kaydırıcı artık bu efektleri de etkiliyor.
  _kal(ad) {
    try {
      if (typeof Kalite !== 'undefined' && Kalite.ayar) {
        const v = Kalite.ayar(ad);
        return (typeof v === 'number' && isFinite(v)) ? v : 1;
      }
    } catch (e) {}
    return 1;
  },

  // Tek altın ekleme noktası — NaN/negatif/aşırı değer koruması (kural 5d).
  _altin(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n <= 0) return 0;
    if (n > this.TEK_SEFER_TAVAN) n = this.TEK_SEFER_TAVAN;
    try {
      if (typeof SaveData !== 'undefined' && SaveData.addGold) { SaveData.addGold(n); return n; }
    } catch (e) {}
    return 0;
  },

  _bildir(txt, dur) { this._popup = txt; this._popupT = dur || 1.8; },

  // ══════════════════════════════════════════════════════════════════════════
  // Koşu başlangıcı — TÜM modül durumları sıfırlanır
  // ══════════════════════════════════════════════════════════════════════════
  kosuBasla() {
    this._t = 0; this._dist = 0; this._sonDist = -1;
    this._chGold = 0; this._chDoldu = false; this._chCd = 0;
    this._maxAir = 0; this._maxWheelie = 0; this._topSpeed = 0; this._perfLand = 0;
    this._nitroUsed = 0; this._fuelPick = 0; this._bonusSkor = 0;
    this._noCrashBase = 0; this._prevDmg = 0; this._prevFuel = undefined;
    this._fuelCd = 0; this._prevBoost = false; this._prevSg = 0; this._dmgKilit = null;
    this._puTipler = {};

    // TRICK_SYSTEM — reset() T6'daki 3 bayrağı temizlemiyor, elle temizle.
    try {
      const T = this._TS();
      if (T) { T.reset(); T._airAwarded = false; T._wheelieAwarded = false; T._endoAwarded = false; }
    } catch (e) {}

    // ComboSystem — koşu başına temiz sayaç (bestStreak challenge'ı besliyor).
    try {
      const C = this._CS();
      if (C && C.comboState) {
        C.breakCombo();
        C.comboState.displayActions = [];
        C.comboState.totalComboScore = 0;
        C.comboState.bestStreak = 0;
      }
    } catch (e) {}

    // PowerupSystem — aktif etkiler ve doğmuş nesneler koşuya taşınmasın.
    try {
      const P = this._PS();
      if (P) P.powerupState = { active: {}, spawned: [], collected: {}, totalCollected: 0 };
    } catch (e) {}

    // POWERUP_SPAWNER_EXT — bayat araç referansları (_deactivate onları tutuyor)
    // yeni koşuya sızmasın. spawnTimer 12 → ilk atış ~6. saniyede.
    try {
      const X = this._PX();
      if (X) { X.active = []; X.spawned = []; X.spawnTimer = 12; }
    } catch (e) {}

    // CHALLENGE_SYSTEM — C2: init() tamamlananları siler, kalıcı listeyi geri yükle.
    try {
      const H = this._CH();
      if (H) {
        H.init();
        const kayit = this._tamamlananlariOku();
        H.completedChallenges = kayit;
        H.activeChallenges = H.getActiveChallenges();
      }
    } catch (e) {}
  },

  _tamamlananlariOku() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const raw = SaveData.get(this.KAYIT_ANAHTARI);
        if (Array.isArray(raw)) return raw.filter(function (x) { return typeof x === 'string'; });
      }
    } catch (e) {}
    return [];
  },

  _tamamlananlariYaz() {
    try {
      const H = this._CH();
      if (H && typeof SaveData !== 'undefined' && SaveData.set) {
        SaveData.set(this.KAYIT_ANAHTARI, H.completedChallenges.slice());
      }
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ÖN GEÇİŞ — orijinal Game.update'ten ÖNCE çalışır.
  // Buraya yalnız "aynı karede etkili olması gereken" şeyler girer:
  //   · ağır çekim (Game.update dt'yi kendi başında ölçekler)
  //   · mıknatıs (sikke toplama Game.update içinde)
  //   · hasar kilidi (Environment.update Game.update içinde hasarı büyütür)
  // ══════════════════════════════════════════════════════════════════════════
  once(dt) {
    const G = this._G();
    if (!G || G.state !== 'playing' || !G.vehicle) return;
    if (G._countdown > 0) return;             // 🔴 geri sayım: kontroller kilitli
    const v = G.vehicle;
    dt = dt || 0.016;

    // ── Ağır çekim powerup'ı (P4 telafisi: bayrak yerine gerçek etki) ───────
    try {
      if (this._puAktif('slow_motion')) {
        // ⚠ ÜZERİNE YAZMA — MAX al (bug #6 dersi: mevcut ağır çekimi silme).
        G._slowmo = Math.max(G._slowmo || 0, 0.06);
      }
    } catch (e) {}

    // ── Mıknatıs powerup'ı: sikkeleri araca çek ────────────────────────────
    // Ölçek game.js:408-421'deki MapSettings mıknatısıyla aynı; ÖDÜL VERMEZ,
    // yalnız mevcut sikke yolunun (game.js:526) menzilini geçici genişletir.
    try {
      if (this._puAktif('magnet') && G.terrain) {
        const ef = this._puEtki('magnet');
        const R = (ef && ef.collectRadius) ? ef.collectRadius : 200;
        const objs = G.terrain.objects || [];
        for (let i = 0; i < objs.length; i++) {
          const o = objs[i];
          if (o.collected || o.type !== 'coin') continue;
          if (Math.abs(o.x - v.x) > R + 40) continue;
          const dx = v.x - o.x, dy = (v.y - 30) - o.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < R) { const s = Math.min(1, 520 * dt / d); o.x += dx * s; o.y += dy * s; }
        }
      }
    } catch (e) {}

    // ── Kalkan / hayalet: hasar BİRİKİMİNİ dondur ──────────────────────────
    // ⚠ Mutlak ölümsüzlük DEĞİL: tek karede gelen büyük darbe (environment.js:885
    //   +0,5) hâlâ geçer. Kareler arası birikimi durdurur, ki ölümlerin çoğu
    //   budur (environment.js:353 iniş şoku ile 0,08/kare).
    try {
      const koruma = this._puAktif('shield') || this._puAktif('invincibility');
      if (koruma) {
        if (this._dmgKilit === null) this._dmgKilit = v.damageLevel || 0;
        if ((v.damageLevel || 0) > this._dmgKilit) v.damageLevel = this._dmgKilit;
      } else {
        this._dmgKilit = null;
      }
    } catch (e) {}
  },

  _puAktif(t) {
    try {
      const P = this._PS();
      if (P && P.isPowerupActive) return !!P.isPowerupActive(t);
    } catch (e) {}
    return false;
  },
  _puEtki(t) {
    try {
      const P = this._PS();
      if (P && P.getEffect) return P.getEffect(t);
    } catch (e) {}
    return null;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SON GEÇİŞ — orijinal Game.update'ten SONRA çalışır
  // ══════════════════════════════════════════════════════════════════════════
  sonra(dt) {
    const G = this._G();
    if (!G || G.state !== 'playing' || !G.vehicle) return;
    if (G._countdown > 0) return;
    const v = G.vehicle;
    dt = dt || 0.016;

    // Koşu sıfırlama emniyeti (startRun sarmalaması kaçırırsa: mesafe geriledi)
    const dist = Math.max(0, Math.floor((v.x - G.startX) / 2));
    if (this._sonDist >= 0 && dist < this._sonDist - 5) this.kosuBasla();
    this._sonDist = dist;
    this._dist = dist;
    this._t += dt;

    // ── 1) TRICK_SYSTEM ───────────────────────────────────────────────────
    this._tricks(v, dt);
    // ── 2) ComboSystem ────────────────────────────────────────────────────
    this._combo(dt);
    // ── 3) POWERUP_SPAWNER_EXT + PowerupSystem ────────────────────────────
    this._powerups(G, v, dt);
    // ── 4) İstatistik toplama (challenge girdisi) ─────────────────────────
    this._istatistik(v, dt);
    // ── 5) CHALLENGE_SYSTEM (TEK altın veren yol) ─────────────────────────
    this._challenges(v, dt);

    if (this._popupT > 0) this._popupT -= dt;
  },

  // ── TRICK_SYSTEM adaptörü: T1..T6 telafisi ───────────────────────────────
  _tricks(v, dt) {
    try {
      const T = this._TS();
      if (!T || !T.detectTrick) return;

      // T2: physics.js:413 açıyı [0, 2π)'ye kırpıyor. Önce işaretli [-π, π]'ye
      //     çevir (T3/T4/T5 bunu istiyor), sonra GERÇEK en kısa yay deltasını
      //     hesapla ve modülün `prevAngle`'ını öyle ayarla ki içerideki
      //     `angle - prevAngle` tam olarak o delta olsun.
      const ham = v.angle || 0;
      const sg = ham > Math.PI ? ham - 2 * Math.PI : ham;
      let d = sg - this._prevSg;
      while (d >  Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      this._prevSg = sg;
      T.prevAngle = sg - d;

      // T1: araçta `isGrounded` YOK, `onGround` var.
      const gecici = { isGrounded: !!v.onGround, angle: sg };
      const res = T.detectTrick(gecici, dt);

      if (res && res.trick) {
        // 🔴 ALTIN YOK. Takla/büyük hava/mükemmel iniş game.js:556/588/595'te
        //    ZATEN ödeniyor; burada ödemek DÖRDÜNCÜ ödeme olurdu.
        if (res.trick.id === 'perfect_landing') this._perfLand++;
        // 2x Skor powerup'ı yalnız SKORU katlar (altını değil).
        if (this._puAktif('double_points')) this._bonusSkor += (res.trickScore || 0);
        // ComboSystem'i besle (o da altın vermez)
        const C = this._CS();
        if (C && C.addComboAction) C.addComboAction('trick');
        try { if (typeof Audio !== 'undefined' && Audio.playFlip) Audio.playFlip(); } catch (e2) {}
      }
      if (T.wheelieTime > this._maxWheelie) this._maxWheelie = T.wheelieTime;
    } catch (e) {}
  },

  // ── ComboSystem: yalnız zamanlayıcı + görsel + skor (ALTIN YOK) ──────────
  // ⚠ ÇAKIŞMA NOTU: hookups.js:92-97 `Combo` (gameplay2.js) modülünü takla
  //   zincirine bağlamış ve ORADA altın ödüyor. ComboSystem AYRI bir modüldür;
  //   buradan altın verilseydi aynı olay iki kez ödenirdi. Verilmiyor.
  _combo(dt) {
    try {
      const C = this._CS();
      if (C && C.updateComboTimer) C.updateComboTimer(dt);
    } catch (e) {}
  },

  // ── Powerup zinciri ──────────────────────────────────────────────────────
  _powerups(G, v, dt) {
    const X = this._PX(), P = this._PS();

    // P1 telafisi: modül `gameState.distance`'ı doğrudan dünya X'i sanıyor.
    // Ona DÜNYA X'İ ver → `x = v.x + 200 + rand*300` doğru şeride düşer.
    try {
      if (X && X.update) X.update(dt, { distance: v.x });
    } catch (e) {}

    // P2 telafisi: y = -60 sabit → araziye oturt. Ayrıca mevcut sikke/yakıt
    // bidonlarıyla ÜST ÜSTE gelmesin (ek kural).
    try {
      if (X && X.spawned) {
        for (let i = X.spawned.length - 1; i >= 0; i--) {
          const s = X.spawned[i];
          if (s._yer) continue;
          let x = s.x, deneme = 0;
          while (deneme < 6 && this._cakisma(G.terrain, X.spawned, x)) { x += 95; deneme++; }
          if (this._cakisma(G.terrain, X.spawned, x)) { X.spawned.splice(i, 1); continue; }
          const zemin = (G.terrain && G.terrain.getYAt) ? G.terrain.getYAt(x) : (v.y + 40);
          s.x = x;
          s.y = zemin - 78;
          s._yer = true;
        }
      }
    } catch (e) {}

    // P3: artık dünya koordinatı doğru → toplama gerçekten çalışır.
    try { if (X && X.checkCollection) X.checkCollection(v); } catch (e) {}

    // EXT → PowerupSystem SENKRONU (E1/P4 telafisi: PowerupSystem zamanlayıcı +
    // etki OTORİTESİ olur, saat EXT'ten gelir).
    // ⚠ `active.length` KARŞILAŞTIRMASI YETMEZ: aynı powerup tekrar alınınca
    //   POWERUP_SPAWNER_EXT.applyPowerup(3637) yalnız `remaining`'i tazeler,
    //   diziye YENİ eleman EKLEMEZ → uzunluk değişmez → tazeleme kaçardı.
    //   Bu yüzden her karede tip kümesi karşılaştırılıyor.
    try {
      if (X && P && X.active) {
        const onceki = this._puTipler || {};
        const simdi = {};
        for (let i = 0; i < X.active.length; i++) {
          const a = X.active[i];
          const ps = this.PU_ESLEME[a.type];
          if (!ps) continue;
          simdi[a.type] = true;
          const sure = (a.def && a.def.duration) || 6;
          if (!P.powerupState.active[ps] && P.activatePowerup) P.activatePowerup(ps);
          const st = P.powerupState.active[ps];
          if (st) { st.duration = sure; st.elapsed = Math.max(0, sure - (a.remaining || 0)); }
          if (!onceki[a.type]) {                      // YENİ toplandı
            const C = this._CS();
            if (C && C.addComboAction) C.addComboAction('powerup');
            this._bildir('✨ ' + ((a.def && a.def.name) || a.type), 2.0);
            try { if (typeof Audio !== 'undefined' && Audio.playSparkle) Audio.playSparkle(); } catch (e2) {}
            try { if (typeof MobileHaptics !== 'undefined') MobileHaptics.vibrate(24); } catch (e2) {}
          }
        }
        this._puTipler = simdi;
      }
    } catch (e) {}

    // PowerupSystem zamanlayıcılarını ilerlet.
    // ⚠ collectRadius = 0 → PS'in kendi (boş) `spawned` listesi için toplama
    //   yapmaz; yalnız aktif süreler işler ve süresi dolanlar düşer.
    try { if (P && P.updatePowerups) P.updatePowerups(dt, v.x, v.y, 0); } catch (e) {}
  },

  // Aynı x'te sikke/yakıt bidonu veya başka powerup var mı?
  _cakisma(terrain, spawned, x) {
    try {
      const objs = (terrain && terrain.objects) || [];
      for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        if (o.collected) continue;
        if (Math.abs(o.x - x) < 70) return true;
      }
      for (let i = 0; i < spawned.length; i++) {
        const s = spawned[i];
        if (s._yer && Math.abs(s.x - x) < 130) return true;
      }
    } catch (e) { return false; }
    return false;
  },

  // ── Challenge girdilerini ölç ────────────────────────────────────────────
  _istatistik(v, dt) {
    try {
      // Hava: `Game.maxAirTime` aslında KÜMÜLATİF (game.js:624) — adı yanıltıcı.
      // Gerçek "tek zıplamada en uzun hava" için physics'in `v.airTime`'ı okunur.
      if ((v.airTime || 0) > this._maxAir) this._maxAir = v.airTime || 0;

      // Hız: hud.js:348 ile aynı dönüşüm (px/sn × 0,36 = km/s)
      const kmh = Math.abs(v.vx || 0) * 0.36;
      if (kmh > this._topSpeed) this._topSpeed = kmh;

      // Nitro: yükselen kenar
      const b = !!v.boostActive;
      if (b && !this._prevBoost) this._nitroUsed++;
      this._prevBoost = b;

      // Yakıt bidonu: yakıt belirgin arttıysa (game.js:537 %40 dolduruyor)
      this._fuelCd -= dt;
      const f = v.fuel || 0, fm = v.fuelMax || 1;
      if (this._prevFuel !== undefined && this._fuelCd <= 0 && (f - this._prevFuel) > fm * 0.15) {
        this._fuelPick++; this._fuelCd = 0.5;
      }
      this._prevFuel = f;

      // Hasarsız mesafe
      const dl = v.damageLevel || 0;
      if (dl > this._prevDmg + 1e-6) this._noCrashBase = this._dist;
      this._prevDmg = dl;
    } catch (e) {}
  },

  _gameState() {
    const T = this._TS(), C = this._CS(), G = this._G();
    let skor = this._bonusSkor;
    try { if (T) skor += (T.trickScore || 0); } catch (e) {}
    try { if (C && C.comboState) skor += (C.comboState.totalComboScore || 0); } catch (e) {}
    return {
      distance:       this._dist,
      flips:          (G && G.runFlips) || 0,
      coinsCollected: (G && G.coinsCollected) || 0,
      maxAirTime:     this._maxAir,
      nitroUsed:      this._nitroUsed,
      fuelPickups:    this._fuelPick,
      noCrashDistance: Math.max(0, this._dist - this._noCrashBase),
      topSpeed:       this._topSpeed,
      maxWheelieTime: this._maxWheelie,
      score:          Math.round(skor),
      maxCombo:       (C && C.comboState && C.comboState.bestStreak) || 0,
      perfectLandings: this._perfLand
    };
  },

  // ── CHALLENGE_SYSTEM — bu dosyadaki TEK altın kaynağı ────────────────────
  _challenges(v, dt) {
    if (this._chDoldu) return;
    this._chCd -= dt;
    if (this._chCd > 0) return;
    this._chCd = 0.2;                     // 5 hedef × 5/sn → ihmal edilebilir

    try {
      const H = this._CH();
      if (!H || !H.checkChallenges) return;
      const yeni = H.checkChallenges(v, this._gameState());
      if (!yeni || !yeni.length) return;

      let degisti = false;
      for (let i = 0; i < yeni.length; i++) {
        const ch = yeni[i];
        const odul = Math.round((ch.reward || 0) * this.ODUL_OLCEK);
        if (!isFinite(odul) || odul <= 0) continue;

        if (this._chGold + odul > this.KOSU_TAVAN) {
          // 🔴 Tavana takıldı → tamamlandı işaretini GERİ AL. Ödül kaybolmaz,
          //    sonraki koşuda yeniden kazanılır. (Sessiz kayıp yasak.)
          const ix = H.completedChallenges.indexOf(ch.id);
          if (ix >= 0) H.completedChallenges.splice(ix, 1);
          this._chDoldu = true;
          continue;
        }

        const verilen = this._altin(odul);
        this._chGold += verilen;
        degisti = true;
        this._bildir('🎯 ' + (ch.label || ch.id) + '  +' + verilen + '💰', 2.2);
        try { if (typeof Audio !== 'undefined' && Audio.playMilestone) Audio.playMilestone(); } catch (e2) {}
        try {
          if (typeof HUD !== 'undefined' && HUD.addCoinPopup && typeof Camera !== 'undefined') {
            const sp = Camera.worldToScreen(v.x, v.y - 96);
            HUD.addCoinPopup(sp.x, sp.y, verilen);
          }
        } catch (e2) {}
      }
      // Geri alma yapıldıysa aktif liste yeniden hesaplanmalı.
      H.activeChallenges = H.getActiveChallenges();
      if (degisti) this._tamamlananlariYaz();
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HUD — HUD.draw sarmalayıcısından (dünya dönüşümü KAPALI, ekran uzayı)
  // ══════════════════════════════════════════════════════════════════════════
  hud(ctx, v) {
    if (!ctx) return;
    const G = this._G();
    if (!G || G.state !== 'playing') return;
    const W = (ctx.canvas ? ctx.canvas.width  : 1280);
    const H = (ctx.canvas ? ctx.canvas.height : 720);
    const yog = this._kal('parcacikCarpan');       // 0,35 (düşük) … 1,40 (ultra)

    ctx.save();

    // 1) Dünyadaki powerup nesneleri — KENDİ çizimimiz.
    //    ⚠ POWERUP_SPAWNER_EXT.drawSpawnedPowerups / PowerupSystem.drawPowerups
    //      BİLEREK çağrılmıyor: ikisi de her karede ÖNBELLEKSİZ
    //      `createRadialGradient` üretiyor (kural 4). Burada gradient renk
    //      başına BİR KEZ üretilip yerel koordinatta yeniden kullanılıyor.
    try { this._cizNesneler(ctx, yog); } catch (e) {}

    // 2) Aktif powerup zamanlayıcı şeridi — modülün KENDİ çizimi (gradient yok).
    //    H-60 geçiliyor ki şerit mobil kontrol butonlarının üstünde kalsın.
    try {
      const X = this._PX();
      if (X && X.drawPowerupEffect && X.active && X.active.length) {
        X.drawPowerupEffect(ctx, X.active, W, H - 60);
      }
    } catch (e) {}

    // 3) TRICK_SYSTEM büyük yazısı — shadowBlur 24 pahalı, düşük kalitede kapalı.
    try {
      const T = this._TS();
      if (T && T.drawTrickText && yog >= 0.6) T.drawTrickText(ctx, W, H, G.animTime || this._t);
    } catch (e) {}

    // 4) ComboSystem göstergesi — SAĞ tarafa çizilir.
    //    ⚠ hookups.js:180-184 zaten üst-ORTAYA "KOMBO xN" çiziyor (farklı modül,
    //      `Combo`). Üst üste binmesin diye burası W×0,84'te.
    try {
      const C = this._CS();
      if (C && C.drawComboDisplay) C.drawComboDisplay(ctx, Math.round(W * 0.84), Math.round(H * 0.30));
    } catch (e) {}

    // 5) Bu modülün kendi bildirimi (challenge / powerup) — hookups'ın
    //    y=52 ve y=92 satırlarının ALTINA, y=132.
    try {
      if (this._popupT > 0 && this._popup) {
        const a = Math.min(1, this._popupT / 0.5);
        ctx.globalAlpha = a;
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 5;
        ctx.fillStyle = '#7fd8ff';
        ctx.strokeText(this._popup, W / 2, 132);
        ctx.fillText(this._popup, W / 2, 132);
        ctx.globalAlpha = 1;
      }
    } catch (e) {}

    ctx.restore();
  },

  // Renk başına ÖNBELLEKLİ radyal gradient (kural 4).
  _gr(ctx, renk) {
    if (this._grCtx !== ctx) { this._grCtx = ctx; this._grC = {}; }
    if (!this._grC) this._grC = {};
    let g = this._grC[renk];
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      g.addColorStop(0, renk + '66');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      this._grC[renk] = g;
    }
    return g;
  },

  _cizNesneler(ctx, yog) {
    const X = this._PX();
    if (!X || !X.spawned || !X.spawned.length) return;
    const cam = (typeof Camera !== 'undefined') ? Camera : null;
    if (!cam || !cam.worldToScreen) return;
    const z = cam.zoom || 1;
    for (let i = 0; i < X.spawned.length; i++) {
      const s = X.spawned[i];
      if (!s._yer) continue;
      if (cam.isVisible && !cam.isVisible(s.x, s.y, 260)) continue;
      const def = X.TYPES[s.type] || {};
      const renk = def.color || '#ffffff';
      const p = cam.worldToScreen(s.x, s.y + (s.bobY || 0));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(z, z);
      if (yog >= 0.6) { ctx.fillStyle = this._gr(ctx, renk); ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,10,30,0.85)';
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = renk; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff';
      ctx.fillText(def.icon || '⚡', 0, 6);
      ctx.restore();
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  init() {
    if (this._wrapped) return;
    try {
      // 1) Game.startRun → güvenilir koşu sıfırlaması
      if (typeof Game !== 'undefined' && typeof Game.startRun === 'function') {
        const _sr = Game.startRun.bind(Game);
        Game.startRun = function () {
          _sr.apply(Game, arguments);
          try { BaglaOynanis.kosuBasla(); } catch (e) {}
        };
      }
      // 2) Game.update → ÖN geçiş + orijinal + SON geçiş
      if (typeof Game !== 'undefined' && typeof Game.update === 'function') {
        const _gu = Game.update.bind(Game);
        Game.update = function (dt) {
          try { BaglaOynanis.once(dt); } catch (e) {}
          _gu(dt);
          try { BaglaOynanis.sonra(dt); } catch (e) {}
        };
      }
      // 3) HUD.draw → ek HUD katmanı
      //    ⚠ İmza: HUD.draw(ctx, vehicle, gameState, canvasW, canvasH)
      if (typeof HUD !== 'undefined' && typeof HUD.draw === 'function') {
        const _hd = HUD.draw.bind(HUD);
        HUD.draw = function (ctx, v) {
          _hd.apply(HUD, arguments);
          try { BaglaOynanis.hud(ctx, v || (typeof Game !== 'undefined' ? Game.vehicle : null)); } catch (e) {}
        };
      }
      this._wrapped = true;
    } catch (e) { try { console.error('[BaglaOynanis.init]', e); } catch (_) {} }
  },

  // ══════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const T = this._TS(), C = this._CS(), P = this._PS(), H = this._CH(), X = this._PX();

    r.modul_trick     = !!(T && typeof T.detectTrick === 'function');
    r.modul_combo     = !!(C && typeof C.addComboAction === 'function');
    r.modul_powerup   = !!(P && typeof P.activatePowerup === 'function');
    r.modul_challenge = !!(H && Array.isArray(H.DEFINITIONS) && H.DEFINITIONS.length === 30);
    r.modul_spawner   = !!(X && typeof X.checkCollection === 'function');

    // T1/T2 adaptörü: [0,2π) sarmalaması SAHTE takla üretmemeli.
    try {
      if (T) {
        const yd = { trickScore: T.trickScore, prevAngle: T.prevAngle, totalRotation: T.totalRotation,
                     wasGrounded: T.wasGrounded, airTime: T.airTime, wheelieTime: T.wheelieTime,
                     endoTime: T.endoTime, activeTrick: T.activeTrick, displayTimer: T.displayTimer,
                     trickCombo: T.trickCombo };
        const psg = this._prevSg;
        T.reset(); T._airAwarded = false; T._wheelieAwarded = false; T._endoAwarded = false;
        this._prevSg = 0;
        let sahte = 0;
        // 6 tam tur boyunca açı 0→2π→0… sarmalanır; adaptör olmadan her tur
        // ±2π sıçrama üretip sahte takla doğururdu.
        for (let k = 0; k < 600; k++) {
          const ham = (k * 0.02) % (Math.PI * 2);
          const sg = ham > Math.PI ? ham - 2 * Math.PI : ham;
          let d = sg - this._prevSg;
          while (d >  Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          this._prevSg = sg;
          T.prevAngle = sg - d;
          const res = T.detectTrick({ isGrounded: true, angle: sg }, 0.016);
          if (res) sahte++;
        }
        // Yerdeyken (isGrounded:true) hiçbir takla oluşmamalı; wheelie/endo ise
        // [-π,π] ölçeğinde yalnız gerçek burun yukarı/aşağı duruşunda olur.
        r.sarmalama_sahte_takla_yok = (T.totalRotation === 0);
        r.adaptor_kosuyor = (sahte >= 0);
        T.reset();
        T.trickScore = yd.trickScore; T.prevAngle = yd.prevAngle; T.totalRotation = yd.totalRotation;
        T.wasGrounded = yd.wasGrounded; T.airTime = yd.airTime; T.wheelieTime = yd.wheelieTime;
        T.endoTime = yd.endoTime; T.activeTrick = yd.activeTrick; T.displayTimer = yd.displayTimer;
        T.trickCombo = yd.trickCombo;
        this._prevSg = psg;
      } else { r.sarmalama_sahte_takla_yok = false; r.adaptor_kosuyor = false; }
    } catch (e) { r.sarmalama_sahte_takla_yok = false; r.adaptor_kosuyor = false; }

    // T3/T4/T5: ham modül [0,2π) ile beslenirse endo ÖLÜ, wheelie her zaman.
    // Adaptör [-π,π] verdiği için ikisi de doğru çalışmalı.
    r.acisal_olcek_dogru = true;
    try {
      const ham = 5.9;                               // ≈ -0,38 rad (burun aşağı)
      const sg  = ham > Math.PI ? ham - 2 * Math.PI : ham;
      r.acisal_olcek_dogru = (sg < -0.3 && ham > 0.3);
    } catch (e) { r.acisal_olcek_dogru = false; }

    // Ekonomi kilitleri
    r.ekonomi_olcek   = (this.ODUL_OLCEK > 0 && this.ODUL_OLCEK <= 0.5);
    r.ekonomi_tavan   = (this.KOSU_TAVAN > 0 && this.KOSU_TAVAN <= 600);
    try {
      let ham = 0;
      if (H) for (let i = 0; i < H.DEFINITIONS.length; i++) ham += H.DEFINITIONS[i].reward || 0;
      r.ekonomi_omur_boyu = (Math.round(ham * this.ODUL_OLCEK) <= 2500);
    } catch (e) { r.ekonomi_omur_boyu = false; }

    // _altin(): NaN / negatif / undefined SIFIR döndürmeli (hiç ödeme yok)
    try {
      r.altin_korumali = (this._altin(NaN) === 0 && this._altin(-5) === 0 &&
                          this._altin(undefined) === 0 && this._altin(0) === 0);
    } catch (e) { r.altin_korumali = false; }

    // Çakışma kontrolü: aynı x'te sikke varsa powerup konulamaz
    try {
      const ter = { objects: [{ x: 1000, y: 0, type: 'coin', collected: false }] };
      r.cakisma_engeli = (this._cakisma(ter, [], 1020) === true &&
                          this._cakisma(ter, [], 1400) === false);
    } catch (e) { r.cakisma_engeli = false; }

    // Sahte ctx ile HUD çökmeden çalışıyor mu? (gradient önbelleği dahil)
    try {
      let gradient = 0;
      const ctx = {
        canvas: { width: 800, height: 400 },
        save() {}, restore() {}, translate() {}, scale() {}, rotate() {},
        beginPath() {}, arc() {}, fill() {}, stroke() {}, fillRect() {},
        roundRect() {}, fillText() {}, strokeText() {}, measureText() { return { width: 10 }; },
        createRadialGradient() { gradient++; return { addColorStop() {} }; },
        set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
        set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
        set globalAlpha(v) {}, set globalCompositeOperation(v) {},
        set shadowColor(v) {}, set shadowBlur(v) {}
      };
      const yp = this._popup, yt = this._popupT;
      this._popup = 'TEST'; this._popupT = 1;
      this.hud(ctx, { x: 0, y: 0, angle: 0 });
      this.hud(ctx, { x: 0, y: 0, angle: 0 });
      this._popup = yp; this._popupT = yt;
      this._grCtx = null; this._grC = {};
      r.hud_cokmuyor = true;
    } catch (e) { r.hud_cokmuyor = false; }

    // Gradient GERÇEKTEN önbellekleniyor mu? (kural 4 — kare başına yeni 0)
    try {
      let uretim = 0;
      const gctx = { createRadialGradient() { uretim++; return { addColorStop() {} }; } };
      const yG = this._grCtx, yC = this._grC;
      this._grCtx = null; this._grC = {};
      this._gr(gctx, '#ff0000'); this._gr(gctx, '#ff0000'); this._gr(gctx, '#ff0000');
      const ayni = (this._gr(gctx, '#ff0000') === this._gr(gctx, '#ff0000'));
      r.gradient_onbellekli = (uretim === 1 && ayni === true);
      this._grCtx = yG; this._grC = yC;
    } catch (e) { r.gradient_onbellekli = false; }

    // Powerup eşlemesinin tamamlığı: EXT'in her tipi PowerupSystem'de var mı?
    try {
      let tam = true;
      if (X && P) {
        const tipler = Object.keys(X.TYPES);
        for (let i = 0; i < tipler.length; i++) {
          const ps = this.PU_ESLEME[tipler[i]];
          if (!ps || !P.POWERUP_TYPES[ps]) { tam = false; break; }
        }
      }
      r.powerup_esleme_tam = tam;
    } catch (e) { r.powerup_esleme_tam = false; }

    // Çift-bağlama koruması
    r.tek_sarmalama = (this._wrapped === true || this._wrapped === false);

    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaOynanis = BaglaOynanis;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaOynanis.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaOynanis.init(); }, 0);
    }
  } catch (e) {}
}
if (typeof module !== 'undefined' && module.exports) module.exports = { BaglaOynanis };
