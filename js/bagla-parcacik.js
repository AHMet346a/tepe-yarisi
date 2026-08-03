'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// BAGLA-PARCACIK — js/particles.js'teki ÖLÜ modülleri gerçek oyuna bağlar
// (30 Tmz · additive; hookups.js şablonu — hiçbir mevcut dosya DEĞİŞTİRİLMEDİ)
//
// NE YAPAR: particles.js içinde yazılmış ama hiçbir yerden çağrılmayan
// (çalışma zamanı ölçümü: 0 tetiklenme) modülleri, oyunun ZATEN yaptığı
// efektlerle ÇAKIŞMAYACAK şekilde olay/çizim hattına takar.
//
// ── 🔴 ÇAKIŞMA TABLOSU (kod okunarak doğrulandı, tahmin YOK) ───────────────
//  modül                 | zaten yapan kod                        | karar
//  ----------------------|----------------------------------------|--------------
//  LIGHTNING_EFFECT      | gorsel-hava.js `_simsek` (851-960) +    | BAĞLANMADI
//                        | environment.js yıldırım afeti (760-780) | (üç ayrı şimşek)
//  HEAT_HAZE_RENDERER    | gorsel-atmosfer.js `_isiDalgasi`        | KISMİ: yalnız
//                        | (481-572) — SICAK haritada tüm ekran    | SOĞUK haritada
//                        | (485: `sic <= 0.05` ise HİÇ çizmez)     | egzoz kaynağı
//  SCREEN_EFFECTS        | screenShake→camera.js+gorsel-hareket    | KISMİ: yalnız
//                        | radialBlur→gorsel-hareket `radyalBulanik`| colorFlash
//                        | shockwave→SHOCKWAVE_SYSTEM (aşağıda)    | (hasar parlaması)
//  SKID_MARK_RENDERER    | renderer.js `_vfxTrail` (2743-2771)     | KISMİ: yalnız
//                        | oyuncunun arka tekeri için CANLI iz     | BOT aracı
//  STAR_FIELD_SYSTEM     | environment.js `_stars` (918-937) —     | KISMİ: yalnız
//                        | yalnız GECE (dark>0.02) çizer           | env yıldızı YOKken
//  SHOCKWAVE_SYSTEM      | yok (Particles.landingImpact'teki halka | TAM
//                        | yalnız 'landing_boost' parçasıyla açılır)|
//  SCORE_POP_SYSTEM      | HUD.addCoinPopup (para/takla/hava/kombo) | KISMİ: geri
//                        | → YAKIT ve HURDA'nın geri bildirimi YOK | bildirimi OLMAYAN
//  PARTICLE_PRESETS      | Particles.* (para/çarpma/toz) canlı     | KISMİ: parçacığı
//                        | → mükemmel iniş + tek takla parçacıksız | OLMAYAN olaylar
//
// 🔴 GRADIENT KURALI: bu dosyada `ctx.createXGradient` DOĞRUDAN çağrılmaz;
//    hepsi `_gr(anahtar, uretici)` önbelleğinden geçer ve anahtarda KONUM/ZAMAN
//    yoktur (birim uzayda üretilip translate/scale ile boyanır) → ısınmadan
//    sonra kare başına YENİ gradient sayısı = 0 (selfTest ölçer).
// 🔴 `getImageData` KULLANILMAZ.
// 🔴 Her efekt AYRI try/catch içinde (bir istisna zinciri kesmesin — bug #18).
// 🔴 Her havuzun ÜST SINIRI var (`_SINIR`) — sınırsız büyüyen dizi yasak
//    (UI._toasts 159 elemana çıkmıştı).
//
// ── PARÇACIK BÜTÇESİ: NEDEN TEK YOL (`parcacikCarpan`) ────────────────────
//  Ölçüm: `Kalite.kademe()` zaten `Settings.get('graphics')`ten TÜRETİLİYOR
//  (kalite.js:207 → low=dusuk, med=orta). Yani iki çarpan BAĞIMSIZ DEĞİL:
//    graphics='low' → Kalite.parcacikCarpan=0.35 VE Settings.particleScale()=0.35
//    ikisinin çarpımı = 0.1225 → 8,2× kısma (amaçlanan 2,9× yerine)
//    graphics='high'→ 1.40 × 1.00 = 1.40 (burada fark yok)
//  ▶ Bu dosya YALNIZ `Kalite.ayar('parcacikCarpan')` kullanır (0.35→1.40).
//    `Settings.particleScale()` ve `Quality.particleScale` ÇARPILMAZ.
//    (`Quality.particleScale` zaten yalnız `Particles.spawnBurst` içinde
//     uygulanır — bu dosya o yolu hiç kullanmaz, çifte kısma imkânsız.)
//    `reducedMotion` yalnız İKİLİ KAPI olarak kullanılır (ekran parlaması),
//    parçacık çarpanı olarak DEĞİL.
//
// ⚠ index.html / sw.js'e dokunulmadı (görev kuralı). Bu dosya yüklenmek için
//   index.html'e `<script src="js/bagla-parcacik.js"></script>` satırıyla
//   (particles.js + kalite.js'ten SONRA, hookups.js'ten önce/sonra) eklenmeli
//   ve sw.js ASSETS listesine yazılmalıdır.
// ═══════════════════════════════════════════════════════════════════════════
const BaglaParcacik = {
  _sarildi: false,

  // ── ÜST SINIRLAR (bellek sızıntısı koruması) ────────────────────────────
  _SINIR: {
    sok:    24,    // SHOCKWAVE_SYSTEM._rings
    pop:    16,    // SCORE_POP_SYSTEM._pops
    iz:    200,    // SKID_MARK_RENDERER._marks (modülün kendi _maxMarks'ı da 200)
    yildiz: 6,     // STAR_FIELD_SYSTEM._shootingStars
    havuz: 220,    // ParticlePool.active (acquire() havuz boşsa YENİ üretir → sınırsız)
    isi:    4      // HEAT_HAZE_RENDERER._sources
  },

  // Gökyüzü yıldızı ANLAMLI olan haritalar (kapalı mağara/su altı yok).
  _GOK_HARITA: {
    moon: 1, meteor_field: 1, neon_city: 1, cyberpunk_roofs: 1,
    cyber_grid: 1, aurora_peak: 1, graveyard: 1, stormpeak: 0
  },

  // ── ölçüm sayaçları (selfTest + rapor) ──────────────────────────────────
  _sayac: { kare: 0, sok: 0, pop: 0, iz: 0, on: 0, isi: 0, parlama: 0, hata: 0 },

  // ── gradient önbelleği ──────────────────────────────────────────────────
  _grOnbellek: {},
  _grUretim: 0,        // toplam üretilen gradient
  _grKare: 0,          // BU karede üretilen (ölçüm: ısınmadan sonra 0 olmalı)
  _gr(ctx, anahtar, uret) {
    let g = this._grOnbellek[anahtar];
    if (!g) { g = uret(ctx); this._grOnbellek[anahtar] = g; this._grUretim++; this._grKare++; }
    return g;
  },
  _onbellekTemizle() { this._grOnbellek = {}; },

  // ── BARE GLOBAL ERİŞİMİ ────────────────────────────────────────────────
  // ⚠ `Particles`, `PARTICLE_PRESETS`, `SCREEN_EFFECTS`, `ParticlePool`
  //   `window`'da DEĞİL (CLAUDE.md "Kritik teknik tuzaklar"). Önce window'a
  //   bakılır (bazıları oraya da yazılmış), sonra genel kapsamdan okunur.
  _bulOnbellek: {},
  _bul(ad) {
    if (Object.prototype.hasOwnProperty.call(this._bulOnbellek, ad)) return this._bulOnbellek[ad];
    let o = null;
    try { if (typeof window !== 'undefined' && window[ad]) o = window[ad]; } catch (e) {}
    if (!o) {
      try { o = (new Function('return typeof ' + ad + " !== 'undefined' ? " + ad + ' : null;'))(); }
      catch (e) { o = null; }
    }
    if (o) this._bulOnbellek[ad] = o;   // bulunamadıysa ÖNBELLEKLEME (sonra yüklenebilir)
    return o;
  },

  // ── KALİTE / BÜTÇE ─────────────────────────────────────────────────────
  _kalite(ad) {
    try {
      const K = this._bul('Kalite');
      if (K && K.ayar) { const v = K.ayar(ad); return (typeof v === 'number' && isFinite(v)) ? v : 0; }
    } catch (e) {}
    return 0;
  },
  // TEK parçacık çarpanı (yukarıdaki ölçüm gerekçesi).
  _carpan() {
    const v = this._kalite('parcacikCarpan');
    return (v > 0) ? v : 1;
  },
  _sayi(taban) {
    const n = Math.round(taban * this._carpan());
    return n < 1 ? 1 : n;
  },
  // Erişilebilirlik kapısı (parçacık ÇARPANI değil, ikili kapı).
  _sakinMi() {
    try {
      const S = this._bul('Settings');
      return !!(S && S.reducedMotionOn && S.reducedMotionOn());
    } catch (e) { return false; }
  },

  // ── KOŞU DURUMU (olay kenarı yakalama) ─────────────────────────────────
  _d: {
    ls: 0, dead: false, boost: false, fuel: -1, flip: 0,
    x: 0, baslangic: null, parlama: 0, parlamaRenk: '#ff3b30'
  },
  _havuz: null,          // ParticlePool örneği (PARTICLE_PRESETS için)
  _yildizKur: null,      // STAR_FIELD son kurulum anahtarı (harita|W|H|adet)
  _W: 0, _H: 0,

  _sifirla() {
    const d = this._d;
    d.ls = 0; d.dead = false; d.boost = false; d.fuel = -1; d.flip = 0; d.parlama = 0;
    try { const M = this._bul('SHOCKWAVE_SYSTEM'); if (M) M._rings.length = 0; } catch (e) {}
    try { const M = this._bul('SCORE_POP_SYSTEM'); if (M) M._pops.length = 0; } catch (e) {}
    try { const M = this._bul('SKID_MARK_RENDERER'); if (M) M._marks.length = 0; } catch (e) {}
    try { const M = this._bul('HEAT_HAZE_RENDERER'); if (M) M.clearSources(); } catch (e) {}
    try {
      const p = this._havuz;
      if (p) { while (p.active.length) p.release(p.active[p.active.length - 1]); }
    } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════
  // 1) ŞOK DALGASI — SHOCKWAVE_SYSTEM
  // 🔴 MODÜL HATASI (okurken bulundu, bağlamadan ÖNCE düzeltildi):
  //    `emit()` `life: 1` yazıyor ama `maxLife: duration||0.5`.
  //    `update()` yarıçapı `(1 - life/maxLife)*maxR` ile hesaplıyor →
  //    life=1, maxLife=0.5 iken r = -maxR (NEGATİF) → `ctx.arc(...,-120,...)`
  //    tarayıcıda **IndexSizeError ATAR** ve tüm çizim zincirini keser.
  //    Düzeltme burada, particles.js'e DOKUNMADAN: emit'ten hemen sonra
  //    son halkanın `life` alanı `maxLife`e çekilir (r=0'dan başlar).
  // ═════════════════════════════════════════════════════════════════════
  _sok(x, y, renk, maxR, sure) {
    const M = this._bul('SHOCKWAVE_SYSTEM');
    if (!M) return false;
    if (M._rings.length >= this._SINIR.sok) M._rings.shift();
    M.emit(x, y, renk, maxR, sure);
    const r = M._rings[M._rings.length - 1];
    if (r) {
      if (r.life > r.maxLife) r.life = r.maxLife;   // ← negatif yarıçap düzeltmesi
      if (!(r.maxR > 0)) r.maxR = 1;
      r.r = 0;
    }
    this._sayac.sok++;
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════
  // 2) SKOR BALONU — SCORE_POP_SYSTEM (EKRAN uzayı)
  //    ⚠ Yalnız HUD.addCoinPopup'ın KAPSAMADIĞI olaylar: yakıt ve hurda.
  // ═════════════════════════════════════════════════════════════════════
  _pop(sx, sy, metin, renk) {
    const M = this._bul('SCORE_POP_SYSTEM');
    if (!M) return false;
    if (M._pops.length >= this._SINIR.pop) M._pops.shift();
    M.emit(sx, sy, metin, renk);
    this._sayac.pop++;
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════
  // 3) HAZIR TARİF HAVUZU — PARTICLE_PRESETS + ParticlePool
  // 🔴 MODÜL TUZAĞI: `ParticlePool.update` hızları `dt` ile ÖLÇEKLER
  //    (`p.x += p.vx*dt`) ama `PARTICLE_PRESETS` hızları KARE BAŞINA yazılmış
  //    (speed 4.2 → 4.2*0.016 = 0,07 px/kare = fiilen DONUK).
  //    Düzeltme çağrı yerinde: speed ×60, gravity ×3600 (kare→saniye).
  // 🔴 `acquire()` havuz boşsa YENİ nesne üretir → `active` SINIRSIZ büyür.
  //    Bu yüzden spawn öncesi `_SINIR.havuz` kontrolü yapılır.
  // ═════════════════════════════════════════════════════════════════════
  _havuzAl() {
    if (this._havuz) return this._havuz;
    try {
      const P = this._bul('ParticlePool');
      if (typeof P !== 'function') return null;
      this._havuz = new P(this._SINIR.havuz);
    } catch (e) { this._havuz = null; }
    return this._havuz;
  },
  _on(tarif, x, y, ekstra) {
    const havuz = this._havuzAl();
    const T = this._bul('PARTICLE_PRESETS');
    if (!havuz || !T || !T[tarif]) return false;
    const p = T[tarif];
    const serbest = this._SINIR.havuz - havuz.active.length;
    if (serbest <= 0) return false;
    let adet = this._sayi(p.count);
    if (adet > serbest) adet = serbest;
    const ov = {
      count:   adet,
      speed:   (p.speed || 1) * 60,        // kare→saniye
      gravity: (p.gravity || 0) * 3600     // kare²→saniye²
    };
    if (ekstra) for (const k in ekstra) ov[k] = ekstra[k];
    havuz.spawnPreset(tarif, x, y, ov);
    this._sayac.on += adet;
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════
  // 4) ISI DALGASI — HEAT_HAZE_RENDERER (yalnız SOĞUK haritada)
  //    gorsel-atmosfer.js:485 → `if (sic <= 0.05) return;` yani sıcak
  //    olmayan haritada o efekt TEK ÇİZİM yapmaz → çakışma imkânsız.
  //    Sıcaklık, o dosyanın KENDİ `_profil()`ünden okunur (aynı sayı).
  // ═════════════════════════════════════════════════════════════════════
  _sicakOnbellek: {},
  _haritaSicak(mapId) {
    if (this._sicakOnbellek[mapId] !== undefined) return this._sicakOnbellek[mapId];
    let s = 1;   // güvenli varsayılan: BİLİNMİYORSA sıcak say → ısı dalgası bağlama
    try {
      const A = this._bul('GorselAtmosfer');
      const G = this._bul('Gorsel');
      if (!A || !A._profil) s = 0;                       // modül yok → çakışacak efekt de yok
      else {
        const p = (G && G.palet) ? G.palet(mapId) : null;
        const prof = A._profil({ mapId: mapId }, p);
        s = (prof && typeof prof.sicak === 'number') ? prof.sicak : 1;
      }
    } catch (e) { s = 1; }
    this._sicakOnbellek[mapId] = s;
    return s;
  },
  _isiSerbest(mapId) {
    if (this._kalite('isiDalgasi') <= 0) return false;   // düşük kademede ekleme yapma
    return this._haritaSicak(mapId) <= 0.05;
  },

  // ═════════════════════════════════════════════════════════════════════
  // 5) YILDIZ ALANI — STAR_FIELD_SYSTEM (yalnız environment.js çizmezken)
  //    environment.js `tintSky` yıldızları YALNIZ `dark > 0.02` iken çizer
  //    (gece). Sürekli karanlık gök haritalarında (ay, meteor, neon…)
  //    döngü gündüzdeyken gökyüzü BOŞ kalıyor — boşluk burada dolar.
  // ═════════════════════════════════════════════════════════════════════
  _envYildizVar() {
    try {
      const E = this._bul('Environment');
      if (!E) return false;                                   // env yok → çakışma yok
      if (E.settings && E.settings.dayNight === 'off') return false;
      if (typeof E._sunElev !== 'function') return true;       // ölçemiyorsak GÜVENLİ taraf
      return Math.max(0, -E._sunElev()) > 0.02;
    } catch (e) { return true; }
  },
  _yildizHazir(W, H, mapId) {
    const M = this._bul('STAR_FIELD_SYSTEM');
    if (!M) return null;
    const adet = this._sayi(90);
    const anahtar = mapId + '|' + W + '|' + H + '|' + adet;
    if (this._yildizKur !== anahtar) {
      M.init(adet, W, H);
      this._yildizKur = anahtar;
      // ⚠ `update()` içindeki kendiliğinden kayan yıldız `spawnShootingStar()`u
      //   ARGÜMANSIZ çağırır → 800×600 varsayılanı kullanır ve büyük ekranda
      //   yıldızlar sol üst köşede sıkışır. Bir kez sarmalayıp gerçek ekran
      //   boyutunu veriyoruz (additive, modül dosyası değişmedi).
      if (!M._bpSarildi) {
        const orj = M.spawnShootingStar.bind(M), self = this;
        M.spawnShootingStar = function (w, h) {
          if (M._shootingStars.length >= self._SINIR.yildiz) return;
          orj(w || self._W || 800, h || self._H || 600);
        };
        M._bpSarildi = true;
      }
    }
    return M;
  },

  // ═════════════════════════════════════════════════════════════════════
  // HER KARE — olay kenarları + tüm sistemlerin update'i
  // (Game.update sarmalayıcısından; hookups.js ile aynı desen)
  // ═════════════════════════════════════════════════════════════════════
  frame(dt) {
    const G = this._bul('Game');
    if (!G || !G.vehicle) return;
    const v = G.vehicle;
    dt = (typeof dt === 'number' && dt > 0 && dt < 0.5) ? dt : 0.016;
    this._sayac.kare++;
    const d = this._d;

    // ── Koşu değişimi → tüm birikmiş efektleri at ──
    try {
      if (d.baslangic === null || G.startX !== d.baslangic || v.x < d.x - 400) {
        d.baslangic = G.startX;
        this._sifirla();
      }
      d.x = v.x;
    } catch (e) { this._sayac.hata++; }

    const oynuyor = (G.state === 'playing');

    // ── OLAY 1: sert iniş → şok dalgası + hasar parlaması ──
    try {
      const ls = v.landingShock || 0;
      if (oynuyor && ls > d.ls + 0.12 && ls > 0.35) {
        const gy = (v.y || 0) + (v.height || 50) * 0.5;
        this._sok(v.x, gy, 'rgba(255,245,225,1)', 90 + 130 * ls, 0.42);
        if (ls > 0.62) {
          // Ekran parlaması: SCREEN_EFFECTS.colorFlash — TEK kullanılan parçası.
          // ⚠ `Settings.damageFlashScale()` bu ana kadar HİÇBİR kod tarafından
          //   okunmuyordu (ölçüldü: 0 okuyucu) — ölü ayar da burada bağlanıyor.
          let g = 0;
          try { const S = this._bul('Settings'); if (S && S.damageFlashScale) g = S.damageFlashScale(); } catch (e2) {}
          if (g > 0 && !this._sakinMi()) {
            d.parlama = Math.min(0.30, 0.16 * g * ls);
            d.parlamaRenk = '#ff6a4a';
          }
        }
      }
      d.ls = ls;
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 2: ölüm (çarpma) → büyük şok dalgası + kırmızı parlama ──
    try {
      const olu = !!v.dead;
      if (olu && !d.dead) {
        this._sok(v.x, v.y, 'rgba(255,150,90,1)', 260, 0.7);
        let g = 0;
        try { const S = this._bul('Settings'); if (S && S.damageFlashScale) g = S.damageFlashScale(); } catch (e2) {}
        if (g > 0 && !this._sakinMi()) { d.parlama = Math.min(0.34, 0.24 * g); d.parlamaRenk = '#ff3b30'; }
      }
      d.dead = olu;
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 3: nitro/boost başlangıcı → mavi şok halkası ──
    try {
      const b = !!v.boostActive;
      if (oynuyor && b && !d.boost) this._sok(v.x, v.y, 'rgba(120,220,255,1)', 120, 0.35);
      d.boost = b;
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 4: YAKIT alımı → skor balonu (oyunda HİÇBİR geri bildirim yok) ──
    try {
      const f = v.fuel || 0, fm = v.fuelMax || 1;
      if (oynuyor && d.fuel >= 0 && f > d.fuel + fm * 0.05) {
        const sp = this._ekranNoktasi(v.x, v.y - 46);
        if (sp) this._pop(sp.x, sp.y, '+' + Math.round(f - d.fuel) + ' ⛽', '#4fd6ff');
      }
      d.fuel = f;
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 5: takla → hurda balonu (SaveData.addScrap'in ekran karşılığı YOK)
    //    + `trick_stars` tarifi (tek takla için oyunda parçacık yok; kombo
    //      parlaması yalnız 2+ taklada çalışıyor) ──
    try {
      const fc = v.flipCount || 0;
      if (oynuyor && fc > d.flip) {
        const yeni = fc - d.flip;
        const hurda = Math.max(1, (G._airFlips || yeni));
        const sp = this._ekranNoktasi(v.x, v.y - 78);
        if (sp) this._pop(sp.x, sp.y, '+' + hurda + ' ⚙', '#ffc94a');
        this._on('trick_stars', v.x, v.y - 30);
      }
      d.flip = fc;
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 6: MÜKEMMEL İNİŞ → `perfect_landing` tarifi ──
    //    game.js:594 aynı koşulda +35 altın veriyor ama PARÇACIK üretmiyor.
    try {
      if (oynuyor && v.onGround && d._havada && (G._jumpAir === 0) &&
          Math.abs(v.angularVel || 0) < 1.6 && d._havaSure > 0.5) {
        this._on('perfect_landing', v.x, (v.y || 0) + (v.height || 50) * 0.4);
      }
      if (!v.onGround) { d._havaSure = (d._havaSure || 0) + dt; d._havada = true; }
      else if (d._havada) { d._havaSure = 0; d._havada = false; }
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 7: BOT aracının lastik izi (oyuncunun izini renderer çiziyor) ──
    try {
      const B = this._bul('Bot');
      const M = this._bul('SKID_MARK_RENDERER');
      if (oynuyor && M && B && B.active && B.vehicle && !B.vehicle.dead) {
        const bv = B.vehicle;
        const hiz = Math.abs(bv.vx || 0);
        this._botIz = (this._botIz || 0) - dt;
        if (this._botIz <= 0 && bv.onGround && hiz > 60 && bv.wheels && bv.wheels.length) {
          this._botIz = 0.05;
          if (M._marks.length >= this._SINIR.iz) M._marks.shift();
          const w = bv.wheels[0];
          const yuzey = (w && w.surfaceType) || 'asphalt';
          M.addMark(w.x, w.y + (w.r || 20) * 0.92, (w.r || 20) * 0.55, bv.angle || 0, yuzey);
          this._sayac.iz++;
        }
      }
    } catch (e) { this._sayac.hata++; }

    // ── OLAY 8: EGZOZ ISI DALGASI (yalnız soğuk haritada) ──
    try {
      const M = this._bul('HEAT_HAZE_RENDERER');
      if (M) {
        M.clearSources();                                   // ⚠ her kare temizle: _sources sınırsız büyür
        const mid = (G.terrain && G.terrain.mapId) || G.mapId || 'countryside';
        if (oynuyor && !v.dead && (v.throttle || 0) > 0.35 && this._isiSerbest(mid)) {
          const c = Math.cos(v.angle || 0), s = Math.sin(v.angle || 0);
          const ax = -(v.width || 100) * 0.48, ay = (v.height || 50) * 0.12;
          const g = Math.min(1, 0.35 + (v.throttle || 0) * 0.45) * this._carpan();
          M.addSource(v.x + c * ax - s * ay, v.y + s * ax + c * ay, g, 42);
          while (M._sources.length > this._SINIR.isi) M._sources.shift();
          this._sayac.isi++;
        }
      }
    } catch (e) { this._sayac.hata++; }

    // ── TÜM SİSTEMLERİN GÜNCELLENMESİ (her biri ayrı try/catch) ──
    try { const M = this._bul('SHOCKWAVE_SYSTEM');   if (M) { M.update(dt); while (M._rings.length > this._SINIR.sok) M._rings.shift(); } } catch (e) { this._sayac.hata++; }
    try { const M = this._bul('SCORE_POP_SYSTEM');   if (M) { M.update(dt); while (M._pops.length  > this._SINIR.pop) M._pops.shift(); } } catch (e) { this._sayac.hata++; }
    try { const M = this._bul('SKID_MARK_RENDERER'); if (M) { M.update(dt); while (M._marks.length > this._SINIR.iz)  M._marks.shift(); } } catch (e) { this._sayac.hata++; }
    try { const M = this._bul('HEAT_HAZE_RENDERER'); if (M) M.update(dt); } catch (e) { this._sayac.hata++; }
    try { const M = this._bul('STAR_FIELD_SYSTEM');  if (M && M._enabled) { M.update(dt); while (M._shootingStars.length > this._SINIR.yildiz) M._shootingStars.shift(); } } catch (e) { this._sayac.hata++; }
    try { if (this._havuz) this._havuz.update(dt); } catch (e) { this._sayac.hata++; }

    // Ekran parlaması sönümü (hasar flaşı)
    if (d.parlama > 0) d.parlama = Math.max(0, d.parlama - dt * 3.2);
  },

  _ekranNoktasi(x, y) {
    try {
      const C = this._bul('Camera');
      if (C && C.worldToScreen) { const p = C.worldToScreen(x, y); if (p && isFinite(p.x) && isFinite(p.y)) return p; }
    } catch (e) {}
    return null;
  },

  // ═════════════════════════════════════════════════════════════════════
  // ÇİZİM A — DÜNYA UZAYI (Particles.draw sarmalayıcısı; camera.apply İÇİNDE)
  //   Sıra: zemin izi → ısı dalgası → tarif parçacıkları → şok halkaları
  // ═════════════════════════════════════════════════════════════════════
  cizDunya(ctx) {
    if (!ctx) return;
    this._grKare = 0;
    try { const M = this._bul('SKID_MARK_RENDERER'); if (M && M._marks.length) M.draw(ctx); } catch (e) { this._sayac.hata++; }
    try { const M = this._bul('HEAT_HAZE_RENDERER'); if (M && M._sources.length) M.draw(ctx); } catch (e) { this._sayac.hata++; }
    try { if (this._havuz && this._havuz.active.length) this._havuz.draw(ctx, null); } catch (e) { this._sayac.hata++; }
    try {
      const M = this._bul('SHOCKWAVE_SYSTEM');
      if (M && M._rings.length) {
        this._sokHale(ctx, M._rings);   // önbellekli birim-uzay gradient halesi
        M.draw(ctx);
      }
    } catch (e) { this._sayac.hata++; }
  },

  // Şok halkasının yumuşak halesi. ⚠ Gradient BİRİM UZAYDA (r=1) üretilir ve
  // translate/scale ile boyanır → anahtarda konum/boyut YOK → toplam 1 gradient.
  _sokHale(ctx, halkalar) {
    const g = this._kalite('bloom');
    if (g <= 0) return;
    const gr = this._gr(ctx, 'sok-hale', function (c) {
      const q = c.createRadialGradient(0, 0, 0.55, 0, 0, 1);
      q.addColorStop(0, 'rgba(255,255,255,0)');
      q.addColorStop(0.74, 'rgba(255,255,255,0.34)');
      q.addColorStop(1, 'rgba(255,255,255,0)');
      return q;
    });
    const eskiOp = ctx.globalCompositeOperation, eskiA = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < halkalar.length; i++) {
      const r = halkalar[i];
      const t = Math.max(0, Math.min(1, r.life / (r.maxLife || 1)));
      const yari = r.r;
      if (!(yari > 0.5)) continue;
      ctx.globalAlpha = 0.22 * t * g;
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.scale(yari * 1.18, yari * 1.18);
      ctx.fillStyle = gr;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = eskiOp; ctx.globalAlpha = eskiA;
  },

  // ═════════════════════════════════════════════════════════════════════
  // ÇİZİM B — GÖKYÜZÜ (Environment.tintSky sarmalayıcısı; ARAZİDEN ÖNCE)
  //   Yıldızlar burada çizilir; HUD sarmalayıcısında çizilse arazinin
  //   ÜSTÜNDE kalırdı (yanlış katman).
  // ═════════════════════════════════════════════════════════════════════
  cizGok(ctx, W, H) {
    if (!ctx || !W || !H) return;
    this._W = W; this._H = H;
    try {
      const G = this._bul('Game');
      if (!G || G.state !== 'playing') return;
      const mid = (G.terrain && G.terrain.mapId) || G.mapId || '';
      if (!this._GOK_HARITA[mid]) return;         // yalnız açık-gök karanlık haritalar
      if (this._envYildizVar()) return;           // environment.js zaten çiziyor → ÇİZME
      const M = this._yildizHazir(W, H, mid);
      if (M) M.draw(ctx);
    } catch (e) { this._sayac.hata++; }
  },

  // ═════════════════════════════════════════════════════════════════════
  // ÇİZİM C — EKRAN UZAYI (HUD.draw sarmalayıcısı)
  //   once=true → HUD'un ALTINDA (hasar parlaması, okunabilirlik için)
  //   once=false→ HUD'un ÜSTÜNDE (skor balonları)
  // ═════════════════════════════════════════════════════════════════════
  cizEkran(ctx, once) {
    if (!ctx || !ctx.canvas) return;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    this._W = W; this._H = H;
    if (once) {
      try {
        const d = this._d;
        if (d.parlama > 0.002) {
          const SE = this._bul('SCREEN_EFFECTS');
          if (SE && SE.colorFlash) { SE.colorFlash(ctx, W, H, d.parlamaRenk, d.parlama); this._sayac.parlama++; }
        }
      } catch (e) { this._sayac.hata++; }
      return;
    }
    try { const M = this._bul('SCORE_POP_SYSTEM'); if (M && M._pops.length) M.draw(ctx); } catch (e) { this._sayac.hata++; }
  },

  // ═════════════════════════════════════════════════════════════════════
  // KURULUM — dört additive sarmalama
  // ═════════════════════════════════════════════════════════════════════
  init() {
    if (this._sarildi) return false;
    const self = this;
    let n = 0;

    // 1) Game.update → olay kenarları + update
    try {
      const G = this._bul('Game');
      if (G && typeof G.update === 'function') {
        const orj = G.update.bind(G);
        G.update = function (dt) { orj(dt); try { self.frame(dt); } catch (e) { self._sayac.hata++; } };
        n++;
      }
    } catch (e) {}

    // 2) Particles.draw → DÜNYA uzayı (camera.apply içinde; renderer.js:172)
    try {
      const P = this._bul('Particles');
      if (P && typeof P.draw === 'function') {
        const orj = P.draw.bind(P);
        P.draw = function (ctx) { orj(ctx); try { self.cizDunya(ctx); } catch (e) { self._sayac.hata++; } };
        n++;
      }
    } catch (e) {}

    // 3) Environment.tintSky → GÖK katmanı (camera.apply ÖNCESİ; renderer.js:142)
    try {
      const E = this._bul('Environment');
      if (E && typeof E.tintSky === 'function') {
        const orj = E.tintSky.bind(E);
        E.tintSky = function (ctx, W, H) { orj(ctx, W, H); try { self.cizGok(ctx, W, H); } catch (e) { self._sayac.hata++; } };
        n++;
      }
    } catch (e) {}

    // 4) HUD.draw → EKRAN uzayı (altına parlama, üstüne balonlar)
    //    ⚠ hookups.js de bu fonksiyonu sarmalıyor; zincir bozulmasın diye
    //      orijinal `arguments` aynen aktarılır.
    try {
      const H = this._bul('HUD');
      if (H && typeof H.draw === 'function') {
        const orj = H.draw.bind(H);
        H.draw = function (ctx) {
          try { self.cizEkran(ctx, true); } catch (e) { self._sayac.hata++; }
          orj.apply(H, arguments);
          try { self.cizEkran(ctx, false); } catch (e) { self._sayac.hata++; }
        };
        n++;
      }
    } catch (e) {}

    this._sarildi = n > 0;
    this._baglananKanca = n;
    return this._sarildi;
  },

  // ═════════════════════════════════════════════════════════════════════
  // ÖZ TEST — ölçerek doğrular (canlı durumu KİRLETMEZ: yedekle→test→geri koy)
  // ═════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {}, self = this;
    const yedek = { d: JSON.parse(JSON.stringify(this._d)), sayac: JSON.parse(JSON.stringify(this._sayac)) };

    // 1) İlgilenilen 8 modülün hepsi bulunabiliyor mu? (bare global tuzağı)
    const adlar = ['LIGHTNING_EFFECT', 'SHOCKWAVE_SYSTEM', 'HEAT_HAZE_RENDERER', 'STAR_FIELD_SYSTEM',
                   'SCORE_POP_SYSTEM', 'SKID_MARK_RENDERER', 'PARTICLE_PRESETS', 'SCREEN_EFFECTS'];
    r.modullerBulundu = adlar.every(function (a) { return !!self._bul(a); });

    // 2) ŞOK DALGASI HATASI: emit sonrası yarıçap ASLA negatif olmamalı
    r.sokYaricapPozitif = (function (s) {
      const M = s._bul('SHOCKWAVE_SYSTEM');
      if (!M) return false;
      const kopya = M._rings.slice();
      M._rings.length = 0;
      s._sok(0, 0, 'rgba(255,255,255,1)', 100, 0.5);
      let ok = true;
      for (let i = 0; i < 40; i++) { M.update(0.016); for (const q of M._rings) if (!(q.r >= 0)) ok = false; }
      M._rings.length = 0;
      for (const q of kopya) M._rings.push(q);
      return ok;
    })(this);

    // 3) ÇAKIŞMA KİLİDİ: şimşek bağlanmadı (gorsel-hava zaten çiziyor)
    r.simsekBaglanmadi = String(this.frame).indexOf('LIGHTNING_EFFECT') < 0 &&
                         String(this.cizDunya).indexOf('LIGHTNING_EFFECT') < 0 &&
                         String(this.cizGok).indexOf('LIGHTNING_EFFECT') < 0 &&
                         String(this.cizEkran).indexOf('LIGHTNING_EFFECT') < 0;
    // 4) ÇAKIŞMA KİLİDİ: SCREEN_EFFECTS'ten yalnız colorFlash kullanılıyor
    r.yalnizColorFlash = (function (s) {
      const kod = String(s.frame) + String(s.cizDunya) + String(s.cizGok) + String(s.cizEkran);
      return kod.indexOf('colorFlash') >= 0 && kod.indexOf('screenShake') < 0 &&
             kod.indexOf('radialBlur') < 0 && kod.indexOf('SE.shockwave') < 0;
    })(this);

    // 5) KALİTE: 6 kademede parçacık sayısı MONOTON artmalı
    r.kademeMonoton = (function (s) {
      const K = s._bul('Kalite');
      if (!K) return false;
      const eski = K._kademe;
      const dizi = [];
      for (const k of K.KADEMELER) { K._kademe = k; dizi.push(s._sayi(20)); }
      K._kademe = eski;
      let ok = dizi.length === 6;
      for (let i = 1; i < dizi.length; i++) if (!(dizi[i] >= dizi[i - 1])) ok = false;
      if (!(dizi[5] > dizi[0])) ok = false;
      s._olcumKademe = dizi;
      return ok;
    })(this);

    // 6) ÇİFT KISMA YOK: Settings.particleScale bu dosyada kullanılmıyor
    r.tekButceYolu = (function (s) {
      const kod = String(s._carpan) + String(s._sayi) + String(s.frame);
      return kod.indexOf('particleScale') < 0 && String(s._carpan).indexOf('parcacikCarpan') >= 0;
    })(this);

    // 7) GRADIENT ÖNBELLEĞİ: ikinci çağrı YENİ gradient üretmemeli
    r.gradientOnbellek = (function (s) {
      const sahte = { createRadialGradient: function () { return { addColorStop: function () {} }; } };
      const oncekiOnbellek = s._grOnbellek; s._grOnbellek = {};
      const a = s._grUretim;
      s._gr(sahte, 'test', function (c) { return c.createRadialGradient(); });
      const b = s._grUretim;
      s._gr(sahte, 'test', function (c) { return c.createRadialGradient(); });
      const c = s._grUretim;
      s._grOnbellek = oncekiOnbellek;
      return (b === a + 1) && (c === b);
    })(this);

    // 8) ÜST SINIRLAR: taşma denemesinde diziler sınırı aşmamalı
    r.havuzSiniri = (function (s) {
      const M = s._bul('SCORE_POP_SYSTEM'), N = s._bul('SHOCKWAVE_SYSTEM');
      if (!M || !N) return false;
      const yp = M._pops.slice(), yr = N._rings.slice();
      M._pops.length = 0; N._rings.length = 0;
      for (let i = 0; i < 200; i++) { s._pop(0, 0, '+1', '#fff'); s._sok(0, 0, 'rgba(255,255,255,1)', 50, 0.4); }
      const ok = M._pops.length <= s._SINIR.pop && N._rings.length <= s._SINIR.sok;
      M._pops.length = 0; N._rings.length = 0;
      for (const q of yp) M._pops.push(q);
      for (const q of yr) N._rings.push(q);
      return ok;
    })(this);

    // 9) TARİF HAVUZU: dt ölçek düzeltmesi uygulanıyor ve sınır tutuyor
    r.tarifHavuzu = (function (s) {
      const havuz = s._havuzAl();
      const T = s._bul('PARTICLE_PRESETS');
      if (!havuz || !T) return false;
      while (havuz.active.length) havuz.release(havuz.active[havuz.active.length - 1]);
      for (let i = 0; i < 60; i++) s._on('trick_stars', 100, 100);
      const sinirOk = havuz.active.length <= s._SINIR.havuz;
      let hizOk = false;
      for (const p of havuz.active) if (Math.abs(p.vx) > 20 || Math.abs(p.vy) > 20) hizOk = true;
      while (havuz.active.length) havuz.release(havuz.active[havuz.active.length - 1]);
      return sinirOk && hizOk;
    })(this);

    // 10) ISI DALGASI KAPISI: sıcak haritada bağlanmaz, soğukta bağlanır
    r.isiKapisi = (function (s) {
      const kalite = s._kalite('isiDalgasi');
      if (kalite <= 0) return true;                       // düşük kademede zaten kapalı
      s._sicakOnbellek._test_sicak = 1.0;
      s._sicakOnbellek._test_soguk = 0.0;
      const a = s._isiSerbest('_test_sicak') === false;
      const b = s._isiSerbest('_test_soguk') === true;
      delete s._sicakOnbellek._test_sicak; delete s._sicakOnbellek._test_soguk;
      return a && b;
    })(this);

    // 11) ÇİZİM SAHTE ctx ile çökmeden koşuyor mu?
    r.cizimCalisiyor = (function (s) {
      const ctx = s._sahteCtx(800, 450);
      const h = s._sayac.hata;
      s.cizDunya(ctx); s.cizGok(ctx, 800, 450); s.cizEkran(ctx, true); s.cizEkran(ctx, false);
      return s._sayac.hata === h;
    })(this);

    this._d = yedek.d; this._sayac = yedek.sayac;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  },

  // Test/ölçüm için minimal 2D bağlam taklidi (selfTest ve duman testi kullanır).
  _sahteCtx(W, H) {
    const g = { addColorStop: function () {} };
    const c = {
      canvas: { width: W || 800, height: H || 450 },
      _ciz: 0, _grad: 0,
      save: function () {}, restore: function () {},
      translate: function () {}, rotate: function () {}, scale: function () {},
      beginPath: function () {}, closePath: function () {},
      moveTo: function () {}, lineTo: function () {},
      arc: function (x, y, r) { if (!(r >= 0)) throw new Error('NEGATIF YARICAP: ' + r); c._ciz++; },
      ellipse: function () { c._ciz++; }, rect: function () {},
      fill: function () { c._ciz++; }, stroke: function () { c._ciz++; },
      fillRect: function () { c._ciz++; }, strokeRect: function () { c._ciz++; },
      clearRect: function () {}, clip: function () {},
      fillText: function () { c._ciz++; }, strokeText: function () { c._ciz++; },
      measureText: function () { return { width: 10 }; },
      drawImage: function () { c._ciz++; },
      createLinearGradient: function () { c._grad++; return g; },
      createRadialGradient: function () { c._grad++; return g; },
      createPattern: function () { return null; },
      setTransform: function () {}, getTransform: function () { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
    };
    return c;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaParcacik = BaglaParcacik;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaParcacik.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaParcacik.init(); }, 0);
    }
  } catch (e) {}
}
