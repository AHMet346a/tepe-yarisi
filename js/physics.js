'use strict';
// ── Physics Engine — Spring-Damper Suspension ──────────────────────────────
// Real spring-mass-damper per wheel + angular inertia body rotation.
// Body angle is governed by angular velocity (not instant lerp) → satisfying
// AHMET bounce, body sway, landing rebound.
const Physics = {
  GRAVITY: 500,
  DRIVE_SCALE: 12,   // hızlanma rampası (düşük = daha yavaş hızlanma; top hız maxSpeed ile ayrı)
  SURFACE_FRICTION: {
    asfalt:1.0, grass:0.82, dirt:0.78, sand:0.60,
    snow:0.52, ice:0.22, mud:0.42, water:0.28, rock:0.88
  },

  // ── LASTİK TİPLERİ: yüzeye göre tutuş çarpanı (1.0 = nötr) ──
  TIRE_GRIP: {
    standard: {},                                                              // her yüzeyde dengeli
    mud:      { mud:1.9, dirt:1.5, grass:1.35, sand:1.3, snow:1.2, asfalt:0.8, ice:0.9 },  // arazi/çamur
    ice:      { ice:2.6, snow:2.1, mud:1.3, grass:1.05, asfalt:0.85 },         // buz/kar (çivili)
    road:     { asfalt:1.25, rock:1.1, grass:0.95, dirt:0.8, sand:0.7, mud:0.6, ice:0.7 }, // yol/slick
    offroad:  { sand:1.6, rock:1.4, dirt:1.4, mud:1.4, grass:1.2, snow:1.25, asfalt:0.95 } // off-road
  },
  tireGrip(tireType, surface) {
    const tbl = this.TIRE_GRIP[tireType] || this.TIRE_GRIP.standard;
    return tbl[surface] || 1.0;
  },

  createVehicle(x, y, cfg) {
    const wheels = (cfg.wheelPositions || cfg.wheels || []).map(wp => {
      const r = wp.radius || wp.r || 20;
      return {
        lx: wp.x || wp.lx || 0,
        ly: wp.y || wp.ly || 20,
        r, radius: r,
        wx: x, wy: y, x: x, y: y,
        comp: 0, spin: 0,
        contact: false, onGround: false,
        surfaceType: 'grass',
        suspStiffness: cfg.suspStiffness || 4000,
        suspDamping:   cfg.suspDamping   || 300,
        isSki:   wp.isSki   || false,
        isHover: wp.isHover || false,
        isLeg:   wp.isLeg   || false,
        isTrack: wp.isTrack || false
      };
    });
    return {
      x, y, vx: 0, vy: 0,
      angle: 0, angularVel: 0,
      downforce: cfg.downforce || 0,   // YERÇEKİMİ yükseltmesi → yere yapışma gücü
      ability: cfg.ability || null,    // özel yetenek: 'fly' (uç) / 'hover' (süzül)
      id: cfg.id || null,              // araç kimliği (formula güç istisnası için)
      tireType: cfg.tireType || 'standard',  // lastik tipi → yüzey tutuşunu değiştirir
      pitchOffset: 0,                  // fren dalışı / gaz squat (ağırlık transferi) görsel pitch
      width:  cfg.width  || cfg.w || 100,
      height: cfg.height || cfg.h || 50,
      mass:   cfg.mass   || 800,
      torque: cfg.torque || 5000,
      maxSpeed: cfg.maxSpeed || 500,
      fuelMax: cfg.fuelMax || 80,
      fuel:    cfg.fuelMax || 80,
      fuelBurnRate: cfg.fuelBurnRate || cfg.burn || 3,
      // 🔴 BUGFIX(28 Tmz): `cfg.gripMul` KOPYALANMIYORDU → lastik yükseltmesi ve
      //   Derin Garaj tutuş ayarı fiziğe hiç ulaşmıyordu (fizik `v._gripMul` okur).
      //   ⚠ game.js harita ayarını buna ÇARPAR (üzerine yazmaz) — bkz. game.js:285.
      _gripMul: cfg.gripMul || 1,
      _boostMul: cfg.boostMul || 1,   // nitro ustalık dalı (28 Tmz) — game.js harita çarpanıyla ÇARPAR
      throttle: 0, brake: 0,
      onGround: false, airTime: 0,
      dead: false,
      bodyTilt: 0, prevVx: 0,
      flipCount: 0, lastAngle: 0, totalRotation: 0,
      boostActive: false, boostFuel: 140, boostMax: 140,
      landingShock: 0,
      wheels,
      suspAnim: wheels.map(() => 0),
      // ── HCR2 tarzı YAYLI GÖVDE (sprung-mass) süspansiyon ──
      // Tekerler yere basılı kalır; gövde yayların üstünde yumuşakça zıplar.
      suspBob: 0, suspBobVel: 0,             // gövdenin tekerlere göre dikey yaylanması (px)
      // TUNING(28 Tmz, 2. tur): "hâlâ taş gibi" geri bildirimi → çok daha yumuşak.
      //   100 → 62 → **34**. Damper de oranla düşürüldü (zeta ~0.21 korunuyor:
      //   C = 2·zeta·√K → √34≈5.83 → C≈2.45). Yalnız K düşürülseydi araç
      //   sürekli zıplar, yaylanma hiç oturmazdı.
      //   Strok da ±42 → ±64 açıldı (aşağıda), yoksa yumuşak yay kelepçeye
      //   çarpıp yine "sert duvar" hissi verirdi.
      suspBobK:     cfg.suspBobK     || 34,  // yay sertliği (62→34: çok yumuşak)
      suspBobC:     cfg.suspBobC     || 2.45,// damper (3.3→2.45: zeta sabit)
      suspBobDrive: cfg.suspBobDrive || 0.78 // iniş/tümsek darbesinin yaya aktarım oranı (arttırıldı)
    };
  },

  // ── PERF(31 Tmz) — `step()` teker tamponları ──────────────────────────────
  // Kare başına yeni dizi/nesne ayırmamak için modül düzeyinde yeniden kullanılan
  // üç sayı dizisi. `step` özyinelemeli DEĞİLDİR (kendini çağırmaz) ve tampon
  // yalnız aynı çağrı içinde okunur → paylaşım güvenli.
  // 🔴 `step` içinden başka bir `Physics.step` çağıran kod EKLEME (bot/hayalet
  //    araçlar sırayla, iç içe DEĞİL adımlanır) — yoksa tamponlar karışır.
  _sPen: [], _sFri: [], _sGy: [],

  step(v, terrain, dt) {
    if (v.dead) return;
    dt = Math.min(dt, 0.025);
    const prevVx = v.vx;
    const prevVy = v.vy;

    // ── Harita ayarları (MapSettings) çarpanlarını bir kez oku ──
    const _mid = (terrain && terrain.mapId) ? terrain.mapId : null;
    const _MS  = (typeof MapSettings !== 'undefined' && _mid) ? MapSettings : null;
    const _msGrav  = _MS ? _MS.gravityMult(_mid)  : 1;
    const _msDrive = _MS ? _MS.driveMult(_mid)    : 1;
    const _msBrake = _MS ? _MS.brakeMult(_mid)    : 1;
    const _msWheel = _MS ? _MS.wheelieMult(_mid)  : 1;
    const _msAir   = _MS ? _MS.airCtrlMult(_mid)  : 1;
    const _msTop   = _MS ? _MS.maxSpeedMult(_mid) : 1;

    v.vy += this.GRAVITY * _msGrav * dt;

    // ── UÇAN/SÜZÜLEN ARAÇLAR (ör. Moonlander 3 itici) ──
    if (v.ability === 'fly') {
      // Gaz = yukarı+ileri itki (tırmanır); GAZ BIRAKINCA yerçekimi serbest çeker → düzgün iner
      if (v.throttle > 0 && v.fuel > 0) {
        v.vy -= (this.GRAVITY * _msGrav + 360) * v.throttle * dt;   // tırmanış (yerçekimini biraz aşar)
        v.vx += Math.cos(v.angle) * 75 * v.throttle * dt;           // ileri itiş (asıl hareket)
        if (v.vy < -360) v.vy = -360;                               // tırmanış hız sınırı (uzaya gitmesin)
      }
      if (v.brake > 0) v.vy += 620 * v.brake * dt;                  // fren = hızlı alçal / in
      // dikey sönüm YOK → gaz bırakınca serbest düşüşle iner; yalnız yatay sürtünme
      v.vx *= Math.pow(0.995, dt * 60);
    } else if (v.ability === 'hover') {
      // Süzülme: yerçekiminin ÇOĞUNU iptal eder ama %15 kalır → gaz yoksa yavaşça iner
      v.vy -= this.GRAVITY * _msGrav * 0.85 * dt;
      if (v.throttle > 0) v.vy -= 340 * v.throttle * dt;            // gaz = yüksel
      if (v.brake > 0)    v.vy += 520 * v.brake * dt;               // fren = alçal / in
      if (v.vy < -320) v.vy = -320;
    }

    // YERÇEKİMİ yükseltmesi (downforce) — hıza bağlı aşağı kuvvet, aracı yere yapıştırır
    if (v.downforce) {
      v.vy += v.downforce * (Math.abs(v.vx) * 0.12 + 35) * dt;              // aşağı çekim (azaltıldı)
      // Yukarı fırlamayı hafifçe bastır — ama artık rampadan uçabilir
      if (v.vy < 0) v.vy *= (1 - Math.min(0.35, v.downforce * 0.10));
    }

    let onGround = false;
    let bestFriction = 0;
    let frontPen = 0, rearPen = 0;
    let rearContact = false;   // arka (tahrik) teker yere değiyor mu
    let frontContact = false;  // ön teker yere değiyor mu (güç ölçekleme için)
    const cos = Math.cos(v.angle), sin = Math.sin(v.angle);

    // Pass 1: compute wheel world positions + penetrations (no correction yet)
    // ── PERF(31 Tmz): `penArr` her karede yeni bir dizi + teker başına yeni bir
    //   `{pen,friction,gy}` nesnesi ayırıyordu; üç `forEach` de kare başına üç
    //   kapanış (closure) üretiyordu. Artık MODÜL DÜZEYİNDE yeniden kullanılan
    //   üç sayı dizisi + indeksli döngü var. `step` özyinelemeli değildir
    //   (Physics.step içinden Physics.step çağrılmaz) → paylaşılan tampon
    //   güvenlidir. Hesap ve sıra birebir aynı.
    let maxPen = 0;
    const _nw = v.wheels.length;
    const _pen = this._sPen, _fri = this._sFri, _sgy = this._sGy;
    for (let wi = 0; wi < _nw; wi++) {
      const w = v.wheels[wi];
      w.wx = v.x + cos * w.lx - sin * w.ly;
      w.wy = v.y + sin * w.lx + cos * w.ly;
      w.x = w.wx; w.y = w.wy;
      const gy = terrain.getYAt(w.wx);
      w.surfaceType = terrain.getSurfaceAt ? terrain.getSurfaceAt(w.wx) : 'grass';
      const friction = (this.SURFACE_FRICTION[w.surfaceType] || 0.78) * this.tireGrip(v.tireType, w.surfaceType);
      const pen = (w.wy + w.r) - gy;
      _pen[wi] = pen; _fri[wi] = friction; _sgy[wi] = gy;
      if (pen > 0) maxPen = Math.max(maxPen, pen);
    }

    // Pass 2: gövde konumu düzeltme (KATI — tekerler yere basılı, asla gömülmez).
    // Yumuşaklık ayrı bir katmanda: aşağıdaki YAYLI GÖVDE (suspBob) darbeyi emer.
    if (maxPen > 0) {
      v.y -= maxPen;               // tam pozisyon düzeltme
      if (v.vy > 0) v.vy *= 0.08;  // aşağı hızı neredeyse tümüyle kes
    }

    // Pass 3: update wheel contact state with corrected body position
    for (let wi = 0; wi < _nw; wi++) {
      const w = v.wheels[wi];
      const pen = _pen[wi], friction = _fri[wi], gy = _sgy[wi];
      // Recalculate wy after body correction
      const cosA = Math.cos(v.angle), sinA = Math.sin(v.angle);
      w.wy = v.y + sinA * w.lx + cosA * w.ly;
      w.wy = v.y + sinA * w.lx + cosA * w.ly;
      w.y  = w.wy;
      const correctedPen = (w.wy + w.r) - gy;

      if (correctedPen > -2) {
        w.contact = true; w.onGround = true;
        onGround = true;
        bestFriction = Math.max(bestFriction, friction);
        if (w.lx < 0) { rearPen = Math.max(rearPen, Math.max(0, correctedPen)); rearContact = true; }
        else         { frontPen = Math.max(frontPen, Math.max(0, correctedPen)); frontContact = true; }
        // Yumuşak yay hareketi: anında değil, hedefe yaylanarak yaklaş (görsel süspansiyon)
        // Küçük tekerlerde (Formula gibi) comp'un anında doyup titremesini önle: bölen'e alt sınır
        const targetComp = Math.min(1, Math.max(0, correctedPen) / Math.max(w.r * 1.3, 22));
        w.comp += (targetComp - w.comp) * Math.min(1, 12 * dt);
      } else {
        w.contact = false; w.onGround = false;
        w.comp = Math.max(0, w.comp - dt * 22);   // havada teker sıkışması HIZLA nötre dönsün
      }
      w.spin += v.vx / Math.max(1, w.r) * dt;
      v.suspAnim[wi] = w.comp;
    }

    // Pass 4: ABSOLUTE HARD CLAMP — tekerlekler HİÇBİR ZAMAN zeminin altına giremez
    // ── PERF(31 Tmz): burada `terrain.getYAt(w.x)` YENİDEN çağrılıyordu, oysa
    //   `w.x` Pass 1'den beri DEĞİŞMEDİ (Pass 2/3 yalnız `v.y`/`w.y`/`w.wy`
    //   günceller) → değer Pass 1'de zaten `_sGy[wi]`'ye yazılmıştı. Aynı
    //   argümanla yapılan çağrılar birebir aynı sonucu verdiği için doğrudan
    //   tampondan okunuyor: teker başına 2 (kelepçe girerse 3) `getYAt` → 0.
    {
      let hardLift = 0;
      for (let wi = 0; wi < _nw; wi++) {
        const w = v.wheels[wi];
        const pen = (w.y + w.r) - _sgy[wi];
        if (pen > 0) hardLift = Math.max(hardLift, pen);
      }
      if (hardLift > 0) {
        v.y -= hardLift;
        if (v.vy > 0) v.vy = 0;
        const cosA = Math.cos(v.angle), sinA = Math.sin(v.angle);
        for (let wi = 0; wi < _nw; wi++) {
          const w = v.wheels[wi];
          w.wy = v.y + sinA * w.lx + cosA * w.ly;
          w.y  = w.wy;
          // Hard-clamp wheel center above surface
          const gy2 = _sgy[wi];
          if (w.y + w.r > gy2) w.y = gy2 - w.r;
          w.wy = w.y;
        }
      }
    }

    // ── GROUND SNAP: dik/normal inişte araç zeminden SEKMESİN, yere yapışarak takip etsin ──
    // Geçen kare yerdeyken şimdi az bir boşlukla havadaysa ve yukarı fırlamıyorsa (rampa değilse),
    // aracı aşağı çekip zemine yapıştır. Böylece inişte titreme/sekme/arka kalkma olmaz.
    if (!onGround && v.onGround && v.vy > -40) {
      let minGap = Infinity;
      for (let wi = 0; wi < _nw; wi++) {
        const w = v.wheels[wi];
        // PERF(31 Tmz): `w.x` değişmedi → zemin yüksekliği Pass 1'deki değerle aynı.
        const gap = _sgy[wi] - (w.y + w.r);              // >0 = teker zeminin üstünde
        if (gap < minGap) minGap = gap;
      }
      if (minGap > 0 && minGap < 16) {                    // sadece çok küçük boşlukta yapış → tepeden/tümsekten fırlayabilsin
        v.y += minGap;                                    // aşağı çekip zemine oturt
        if (v.vy < 0) v.vy = 0;
        onGround = true;
        if (bestFriction < 0.5) bestFriction = 0.75;
        rearContact = true;
        const cosA = Math.cos(v.angle), sinA = Math.sin(v.angle);
        for (let wi = 0; wi < v.wheels.length; wi++) {
          const w = v.wheels[wi];
          w.wy = v.y + sinA * w.lx + cosA * w.ly; w.y = w.wy;
          w.contact = true; w.onGround = true;
        }
      }
    }

    // ── PERF(31 Tmz): AYNI ARGÜMANLI `getYAt` ÇAĞRILARI TEKİLLEŞTİRİLDİ ──────
    // `v.x` bu noktadan konum entegrasyonuna (`v.x += v.vx*dt`, çok aşağıda)
    // kadar DEĞİŞMEZ; `terrain.points` de `step` içinde değişmez. Dolayısıyla
    // `getYAt(v.x±30)` ve `getYAt(v.x±40)` ikişer yerde BİREBİR aynı değeri
    // döndürüyordu (eğim + zemin-takip + çekiş açısı + açı yayı). Tek okuma
    // yeterli: kare başına 4 gereksiz `getYAt` gider, sonuç bit bit aynı.
    // 🔴 Bu satırların ALTINA `v.x`'i değiştiren kod EKLEME — tekilleştirme bozulur.
    let _g30p = 0, _g30m = 0, _g40p = 0, _g40m = 0;
    if (onGround) {
      _g30p = terrain.getYAt(v.x + 30); _g30m = terrain.getYAt(v.x - 30);
      _g40p = terrain.getYAt(v.x + 40); _g40m = terrain.getYAt(v.x - 40);
    }

    // İNİŞTE TİTREME/SEKME ÖNLEME: araç yerden daha hızlı düşemez → zemin hızında pürüzsüz iner.
    // Böylece "düş-yakala" döngüsündeki sub-pixel titreme tamamen kalkar.
    if (onGround && v.vy > 0) {
      const _slp = (_g30p - _g30m) / 60;                                        // zemin eğimi (ekran)
      const _followVy = _slp * v.vx;                                            // zeminin düşme hızı
      if (v.vy > _followVy) v.vy = Math.max(0, _followVy);
    }

    v.onGround = onGround;

    // Landing shock (for visual + angular impulse)
    if (onGround && v.airTime > 0.2) {
      v.landingShock = Math.min(1, Math.abs(prevVy) / 400);
      // Angular impulse: nose-up on landing (like real AHMET)
      v.angularVel -= v.landingShock * 1.8;
    }
    // Yaylı gövdeye iniş darbesi impulsu — SADECE gerçek inişlerde (küçük hoplar dahil).
    // Sürekli yokuş inişinde tetiklenmez → süspansiyon artık şiddetli vurmaz.
    // TUNING(28 Tmz): eşik 0.15→0.08 — küçük hoplamalar da süspansiyonu çalıştırsın.
    if (onGround && v.airTime > 0.08) {
      v.suspBobVel += Math.min(520, Math.abs(prevVy)) * 0.65;
    }
    if (v.landingShock > 0) v.landingShock = Math.max(0, v.landingShock - dt * 4);

    if (onGround) {
      v.airTime = 0;

      // Drive force — çekiş arka (tahrik) tekerin yerde olmasını gerektirir.
      // Arka teker havadaysa güç %85 düşer → havada teker dönerken tırmanma olmaz.
      if (v.throttle > 0 && v.fuel > 0) {
        // Tekerlekler yere değmiyorsa (araç devrik/yan/ters) güç AKTARILMAZ.
        // Araca özgü teker yönü: şasi araziye göre ~66°'den fazla eğikse tekerlekler havadadır.
        const _ta = Math.atan2(_g40p - _g40m, 80);   // PERF: tekilleştirilmiş ±40 örneği
        let _tilt = v.angle - _ta; while (_tilt > Math.PI) _tilt -= 2 * Math.PI; while (_tilt < -Math.PI) _tilt += 2 * Math.PI;
        const _wheelsDown = Math.abs(_tilt) < 1.15;
        // Yerdeki teker sayısına göre güç: 2 teker=tam, 1 teker=yarım, hiç=minimum, devrik=0
        const _grounded = (rearContact ? 1 : 0) + (frontContact ? 1 : 0);
        const traction = !_wheelsDown ? 0 : (_grounded >= 2 ? 1 : (_grounded === 1 ? 0.5 : 0.15));
        // TUNING(28 Tmz): "arabaların hızını düşür" → güç bir kademe daha kısıldı.
        // Formula da artık muaf DEĞİL (eski 1.0 → 0.85); yine de en güçlü araç kalıyor.
        const _powMul = (v.id === 'formula') ? 0.85 : 0.60;   // eski: 1 / 0.72
        const acc = v.throttle * v.torque * this.DRIVE_SCALE * _msDrive * bestFriction * traction * (v._gripMul || 1) * _powMul / v.mass;
        v.vx += acc * dt;
      }

      // Braking
      if (v.brake > 0) {
        // 🔴 BUGFIX(28 Tmz): `_msBrake` HESAPLANIP HİÇ KULLANILMIYORDU (satır 94).
        //   Diğer beş harita çarpanı (_msGrav/_msDrive/_msWheel/_msAir/_msTop)
        //   okunuyordu, yalnız fren atlanmıştı. Sonuç: mapsettings.js'teki
        //   `winter: brake_power 65`, `glacier: 54`, `otoyol: 126` değerlerinin
        //   tamamı etkisizdi — buzda fren otoyoldakiyle aynıydı.
        const brakePow = Math.min(0.98, v.brake * bestFriction * 2.2 * _msBrake);
        v.vx *= 1 - brakePow * dt * 60 * dt;
        if (v.vx > -120 * bestFriction) v.vx -= 80 * bestFriction * v.brake * _msBrake * dt;
      }

      // Rolling resistance — gaz/fren yokken çok daha güçlü (araç kendiliğinden dursun)
      const coasting = (v.throttle === 0 && v.brake === 0);
      const rollRes = coasting ? 2.0 : 0.18 * (1 - v.throttle * 0.85);
      v.vx *= 1 - Math.min(0.9, rollRes * dt);
      // Düşük hızda gaz/fren yoksa tam dur (sürünme olmasın)
      if (coasting && Math.abs(v.vx) < 30) v.vx *= 0.80;
      if (coasting && Math.abs(v.vx) < 4)  v.vx = 0;

      // ── EĞİM YERÇEKİMİ: yokuş çıkarken yavaşla/güç kaybet, inerken hızlan (aynı hızla gitmesin) ──
      const _slope = (_g30p - _g30m) / 60;         // dy/dx (ekran, y aşağı) — PERF: tekilleştirilmiş ±30 örneği
      v.vx += this.GRAVITY * _slope * 0.38 * dt;   // yokuş(slope<0)→yavaşlar, iniş(slope>0)→hızlanır

      // ── TÜMSEK HASSASİYETİ: eğim DEĞİŞİMİ (kurvatür) yaylı gövdeye bindirilir →
      //    araç tümsek/çukurda yumuşakça yaylanır; sabit yokuşta (değişim yok) tetiklenmez. ──
      // TUNING(28 Tmz): "çukurda/taşın üstünde süspansiyon çalışsın" →
      //   kazanç 34→62, kelepçe ±11→±26. Eski ±11, iniş darbesinin (~338) yanında
      //   fark edilmiyordu; küçük engeller fiilen görünmezdi.
      if (v._prevSlope !== undefined) {
        v.suspBobVel += Math.max(-26, Math.min(26, (v._prevSlope - _slope) * 62));
      }
      v._prevSlope = _slope;

      // ── ENGEL/ÇUKUR DARBESİ: tekerin ANLIK batma değişimi de yaya bindirilir.
      //    Eğim kurvatürü yalnız gövde altındaki genel araziyi görür; tek bir taş
      //    ya da dar çukur eğimi değiştirmeden tekeri iter. Bunu ayrıca yakalıyoruz.
      const _penNow = Math.max(rearPen, frontPen);
      if (v._prevPen !== undefined) {
        const _dPen = _penNow - v._prevPen;
        if (Math.abs(_dPen) > 0.4) {
          v.suspBobVel += Math.max(-30, Math.min(30, _dPen * 11));
        }
      }
      v._prevPen = _penNow;

      // ── Angular spring-damper (terrain following with inertia) ──────────
      const dy1 = _g40m;                            // PERF: tekilleştirilmiş ±40 örneği
      const dy2 = _g40p;
      const targetAngle = Math.atan2(dy2 - dy1, 80);

      let angleDiff = targetAngle - v.angle;
      // Wrap to [-PI, PI]
      while (angleDiff >  Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      // ── YERDE: WHEELIE + geriye devrilme (hill-climb zorluğu) ───────────────
      // Gaza asılınca ön kalkar (wheelie). Tam gaz + yokuş/tümsek birleşince burun
      // devrilme eşiğini aşar → yay zayıflar → araç geriye devrilir → kafa yere → ölüm.
      // Gazı feather'lamak (bırakıp basmak) wheelie'yi kontrol eder = zorluk.
      let dev = v.angle - targetAngle;         // araziye göreli sapma (<0 = wheelie/burun yukarı)
      while (dev >  Math.PI) dev -= 2 * Math.PI;
      while (dev < -Math.PI) dev += 2 * Math.PI;
      // ── DEVRİLME: DÜNYA-uzayı burun açısına göre (arazi eğimi + wheelie birleşir).
      // Düz zeminde wheelie güvenli; yokuşta tam gaz eşiği aşınca devrilir. Ek kapı:
      // yalnızca araç araziden belirgin geriye kalkmışsa (aktif wheelie) → dik yokuşta
      // coasting'de yanlış devrilme olmaz. ──
      let worldAng = v.angle;
      while (worldAng >  Math.PI) worldAng -= 2 * Math.PI;
      while (worldAng < -Math.PI) worldAng += 2 * Math.PI;
      // tipping: devrilme bölgesi VEYA araç 92°+ ters (kapak/tavan üstü) → yay zayıf,
      // araç kendini düzeltip ölümsüz olamaz (düşünce düzeltme bug'ı kapatıldı).
      const tipping = ((worldAng < -1.1) && (dev < -0.15)) || (Math.abs(worldAng) > 1.6);
      const angSpring = angleDiff * (tipping ? 4 : 22);   // devrilirken yay zayıf → geri toparlayamaz
      const angDamp   = -v.angularVel * (tipping ? 3 : 9);
      v.angularVel += (angSpring + angDamp) * dt;

      // Tekerlek sıkışma farkı → tümsek şasiyi kaldırır (devrilmeyi tetikleyebilir)
      const diffPen = frontPen - rearPen;
      v.angularVel -= diffPen * 0.13 * dt;

      // WHEELIE torku: burun YALNIZCA yokuş tırmanırken kalkar (düz zeminde kalkmaz).
      // _uphill: 0 = düz/iniş → burun kalkmaz; 1 = ~26°+ yokuş → tam wheelie.
      const _spd2w = Math.abs(v.vx);
      const _uphill = Math.max(0, Math.min(1, -targetAngle / 0.45));
      const wheelie = v.throttle * _msWheel * (v._wheelieMul || 1) * 11.0 * (1 - Math.min(0.55, _spd2w / 520)) * _uphill;
      v.angularVel -= wheelie * dt;
      v._wheelieCharge = 0;

    } else {
      v.airTime += dt;
      // ── HAVA DOWNFORCE: azaltıldı — düşük yerçekimi + az downforce = rampadan uçuş ──
      v.vy += Math.abs(v.vx) * 0.08 * dt;
      // ── HAVA KONTROLÜ: gaz(sağ)=öne takla, fren(sol)=arkaya takla — daha responsif ──
      if (v.throttle > 0) v.angularVel += 7.5 * _msAir * (v._airMul || 1) * dt;
      if (v.brake    > 0) v.angularVel -= 7.5 * _msAir * (v._airMul || 1) * dt;
      // Hafif hava sürtünmesi — az sönüm → taklalar AKICI ve tatmin edici döner
      v.angularVel *= Math.pow(0.985, dt * 60);

      // ── YENİ(28 Tmz) HAVA DİRENCİ: tepeden fırlayınca araç havada yavaşlasın. ──
      // Daha önce havada YATAY hıza hiçbir sürtünme uygulanmıyordu; araç fırladığı
      // hızı iniş anına kadar birebir koruyordu. Kuadratik (v²) model kullanıldı:
      // gerçek hava direnci gibi HIZLA BİRLİKTE artar → yavaş zıplama neredeyse
      // etkilenmez, yüksek hızlı uzun uçuşlar belirgin yavaşlar.
      //   500 px/s → ~55 px/s² (%11/sn) · 900 px/s → ~178 px/s² (%20/sn)
      //
      // 🔴 BUGFIX(28 Tmz): UÇAN/SÜZÜLEN ARAÇLAR MUAF.
      //   İlk yazdığımda "bu dala hiç girmezler" sanmıştım — YANLIŞ. `fly`/`hover`
      //   işlemesi satır 102-118'de AYRI bir if zincirinde; uçan araç yerde
      //   olmadığı için buraya da HER KAREDE giriyordu ve kendi sürtünmesinin
      //   (satır 111: 0.995^dt) ÜSTÜNE bir de kuadratik direnç yiyordu.
      //   Sonuç: Moonlander/UfoDisc 900 px/s'de tasarlanandan ~%20/sn yavaştı.
      if (v.ability !== 'fly' && v.ability !== 'hover') {
        v.vx -= v.vx * Math.abs(v.vx) * 0.00022 * dt;
      }

      // Havadayken teker batması yok; iniş darbesi ayrı hesaplanıyor (satır ~247).
      // Sıfırlanmazsa iniş anında _prevPen sıçraması engel darbesini İKİNCİ kez ekler.
      v._prevPen = 0;
    }

    // Clamp angular velocity — YERDE yavaş (pinwheel/olduğu yerde takla YOK, ağır devrilir),
    // HAVADA serbest (rampadan uçunca takla atabilir)
    const _angClamp = onGround ? 9 : 14;
    v.angularVel = Math.max(-_angClamp, Math.min(_angClamp, v.angularVel));

    // Integrate angle
    v.angle += v.angularVel * dt;
    v.angle = ((v.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // ── FİNAL TEKER-ZEMİN DÜZELTMESİ ─────────────────────────────────────────
    // Penetrasyon açı güncellenmeden ÖNCE düzeltiliyordu; açı değişince (tümsek/
    // wheelie/devrilme) tekerler bir kare zeminin altına gömülüyordu. Açıdan SONRA
    // son bir düzeltme: yerdeyken hiçbir teker zeminin altına girmesin.
    if (onGround) {
      const _cW = Math.cos(v.angle), _sW = Math.sin(v.angle);
      let _lastPen = 0;
      for (let _wi = 0; _wi < v.wheels.length; _wi++) {
        const _w = v.wheels[_wi];
        if (_w.isHover || _w.isLeg) continue;
        const _wx = v.x + _cW * _w.lx - _sW * _w.ly;
        const _wy = v.y + _sW * _w.lx + _cW * _w.ly;
        const _pen = (_wy + (_w.r || _w.radius || 12)) - terrain.getYAt(_wx);
        if (_pen > _lastPen) _lastPen = _pen;
      }
      if (_lastPen > 0.5) v.y -= _lastPen;   // 0.5px tolerans → titreme olmadan gömülmeyi kapatır
    }

    // ── HCR: SÜRÜCÜNÜN BAŞI YERE DEĞERSE ÖLÜM ──
    // Baş noktası gövdenin üstünde; araç devrilince/ters inince yere değer → ölüm.
    // Havada takla serbesttir; sadece kafanın üstüne yakın konumda yere değince ölür.
    if (!v.dead && (!_MS || _MS.headDeath(_mid))) {
      const _cA = Math.cos(v.angle), _sA = Math.sin(v.angle);
      const _hlx = -(v.width || 100) * 0.05;               // baş: hafif geride
      const _hly = -((v.height || 50) * 0.5 + 24);          // baş: gövdenin üstünde
      const _hx = v.x + _cA * _hlx - _sA * _hly;
      const _hy = v.y + _sA * _hlx + _cA * _hly;
      // Kafa yere 8px'e kadar yaklaşınca ölür (daha hassas HCR hissi)
      if (_hy >= terrain.getYAt(_hx) - 8) { v.dead = true; v.deathReason = 'crashed'; v.canopyBreak = true; v._headHitX = _hx; v._headHitY = _hy; }
      // Ek güvence: araç belirgin ters döndüyse (çatı aşağı) ve yere yakınsa da ölür
      else {
        let _na = v.angle; if (_na > Math.PI) _na -= Math.PI * 2;   // [-PI,PI]
        if (Math.abs(_na) > 1.55) {   // ~89°+ devrik/ters — tavanlı/kapaklı araçlar da KESİN ölür (kendini düzeltemez)
          const _gap = terrain.getYAt(v.x) - v.y;
          if (_gap < (v.height || 50) * 1.6 + 60) { v.dead = true; v.deathReason = 'crashed'; v.canopyBreak = true; }
        }
      }
    }

    // ── TERS KALMA SAYACI: araç 0.6 sn'den fazla TERS (97°+) kalırsa KESİN ölür ──
    // Kendini yavaşça düzeltip ölümsüz olmasını engeller (kapaklı/tavanlı araç dahil).
    // Uçan/hover araçlar hariç; kısa hava taklalar (<0.6sn) etkilenmez; loop modu Physics.step
    // kullanmadığı için etkilenmez.
    if (!v.dead && v.ability !== 'fly' && v.ability !== 'hover') {
      let _wa3 = v.angle; if (_wa3 > Math.PI) _wa3 -= 2 * Math.PI;
      if (Math.abs(_wa3) > 1.7) {
        v._invT = (v._invT || 0) + dt;
        if (v._invT > 0.6) { v.dead = true; v.deathReason = 'crashed'; v.canopyBreak = true; }
      } else {
        v._invT = 0;
      }
    }

    // Speed cap
    // TUNING(28 Tmz): top hız kademesi düşürüldü (0.85→0.72; formula 1→0.88).
    // TUNING(31 Tmz): kullanıcı "araçlar hâlâ baya hızlı" dedi → %3 DAHA düşürüldü.
    //   0.72 → 0.6984  (0.72 × 0.97)   ·   formula 0.88 → 0.8536  (0.88 × 0.97)
    //   ⚠ Bu YALNIZ tavan hızıdır. Güç/ivme çarpanı `_powMul` (satır ~280) AYRI bir
    //     ayardır ve BİLEREK dokunulmadı — kullanıcı "maks hız" dedi, ivme değil.
    //   ⚠ YAN ETKİ: yakıt ZAMANLA tükendiği için %3 yavaş araç %3 kısa menzil demektir.
    //     Ölçüldü; yalnız `minitank` bidon aralığının altına düştü (802 m < 803 m) →
    //     fuelMax 70 → 72 ile menzili geri alındı (js/vehicles.js:144). Diğerleri geçti.
    // Harita ayarı _msTop ile hâlâ artırılabilir.
    const topSpeed = (v.boostActive ? v.maxSpeed * 1.5 * (v._boostMul || 1) : v.maxSpeed) * _msTop * (v.id === 'formula' ? 0.8536 : 0.6984);
    if (v.vx >  topSpeed)       v.vx =  topSpeed;
    if (v.vx < -topSpeed * 0.3) v.vx = -topSpeed * 0.3;

    // Body tilt visual (lean from linear accel)
    const accel = (v.vx - prevVx) / Math.max(dt, 0.001);
    v.bodyTilt += (accel * 0.00009 - v.bodyTilt) * Math.min(1, 10 * dt);
    v.bodyTilt  = Math.max(-0.10, Math.min(0.10, v.bodyTilt));   // daha az eğim → burun batmaz
    v.prevVx    = v.vx;

    // ── AĞIRLIK TRANSFERİ: sert frende ön basar/arka kalkar (HCR2 hissi) — ölçülü, burun batmasın ──
    const _spd = Math.min(1, Math.abs(v.vx) / 250);
    const _targetPitch = v.brake * 0.13 * (0.4 + _spd * 0.6) - v.throttle * 0.07;
    v.pitchOffset += (_targetPitch - v.pitchOffset) * Math.min(1, 9 * dt);
    v.pitchOffset = Math.max(-0.10, Math.min(0.13, v.pitchOffset));  // sınırla: burun yere girmesin

    // Flip tracking
    const da = v.angle - v.lastAngle;
    if (Math.abs(da) < Math.PI) v.totalRotation += da;
    if (Math.abs(v.totalRotation) >= Math.PI * 2) { v.flipCount++; v.totalRotation = 0; }
    v.lastAngle = v.angle;

    // Boost
    if (v.boostActive && v.boostFuel > 0) {
      v.vx += Math.cos(v.angle) * 700 * dt;
      v.boostFuel -= 25.2 * dt;   // %10 daha yavaş biter
      if (v.boostFuel <= 0) { v.boostActive = false; v.boostFuel = 0; }
    }

    // Integrate position
    v.x += v.vx * dt;
    v.y += v.vy * dt;

    // ── YAYLI GÖVDE (sprung-mass) — yumuşak süspansiyon zıplaması ──────────
    // Dikey ivme (iniş/tümsek darbesi) gövdeyi yaya bindirir; düşük sertlik +
    // düşük sönüm → gövde yumuşakça çöküp birkaç kez zıplayarak oturur.
    // (Yalnızca gövde görselini etkiler; tekerler yere basılı kalır → gerçek HCR2 hissi.)
    // Yaylı gövde: yalnızca yay-damper ile yumuşakça nötre döner.
    // Darbe impulsu SADECE iniş anında verilir (yukarıda) → sürekli dik yokuş inişindeki
    // gürültülü dikey ivme artık süspansiyonu "şiddetli vurdurmaz".
    const bobAcc = -v.suspBobK * v.suspBob - v.suspBobC * v.suspBobVel;
    v.suspBobVel += bobAcc * dt;
    v.suspBob    += v.suspBobVel * dt;
    // TUNING(28 Tmz): strok ±30→±42 px. Yay yumuşadığı için aynı darbe daha çok
    // çöküyor; eski ±30'da kelepçeye çarpıp "sert duvar" hissi veriyordu.
    if (v.suspBob >  64) { v.suspBob =  64; if (v.suspBobVel > 0) v.suspBobVel = 0; }
    if (v.suspBob < -64) { v.suspBob = -64; if (v.suspBobVel < 0) v.suspBobVel = 0; }

    // Fuel consumption
    if (v.throttle > 0) v.fuel = Math.max(0, v.fuel - v.fuelBurnRate * v.throttle * (_MS ? _MS.fuelBurnMult(_mid) : 1) * dt);
    if (v.fuel <= 0) {
      v.throttle = 0;
      // 🔴 DEĞİŞİKLİK(28 Tmz) — YAKIT BİTİNCE ARAÇ DURSUN.
      //   Eskiden yalnız gaz kesiliyordu; araç momentumla uzun süre yuvarlanmaya
      //   devam ediyordu ("benzin bitti ama araba gitmeye devam ediyor").
      //   Artık motor durmuş gibi güçlü bir yavaşlama uygulanır ve düşük hızda
      //   tamamen durur. Yerde değilken (havadayken) uygulanmaz — havada
      //   frenlemek gerçekçi değil, iniş beklenir.
      if (onGround) {
        v.vx *= 1 - Math.min(0.9, 1.6 * dt);
        if (Math.abs(v.vx) < 26) v.vx = 0;
      }
    }

    // Death checks
    const groundUnder = terrain.getYAt(v.x);
    if (v.y > groundUnder + 350) { v.dead = true; v.deathReason = 'fell_off'; return; }
    const deg = ((v.angle * 180 / Math.PI) % 360 + 360) % 360;
    if (deg > 120 && deg < 240 && onGround && Math.abs(v.vx) < 30) { v.dead = true; v.deathReason = 'crashed'; }
  }
,
  // ═══════════════════════════════════════════════════════════════
  // ADVANCED PHYSICS CONSTANTS & TUNING
  // ═══════════════════════════════════════════════════════════════
  SURFACE_PHYSICS: {
    asfalt: { friction: 0.92, rollRes: 0.015, grip: 1.0,  bounciness: 0.05 },
    rock:   { friction: 0.80, rollRes: 0.030, grip: 0.75, bounciness: 0.15 },
    ice:    { friction: 0.35, rollRes: 0.005, grip: 0.25, bounciness: 0.02 },
    mud:    { friction: 0.55, rollRes: 0.060, grip: 0.50, bounciness: 0.04 },
    sand:   { friction: 0.65, rollRes: 0.050, grip: 0.60, bounciness: 0.03 },
    snow:   { friction: 0.45, rollRes: 0.035, grip: 0.40, bounciness: 0.05 },
    metal:  { friction: 0.88, rollRes: 0.010, grip: 0.90, bounciness: 0.12 },
    lava:   { friction: 0.70, rollRes: 0.040, grip: 0.65, bounciness: 0.06 },
    water:  { friction: 0.40, rollRes: 0.080, grip: 0.35, bounciness: 0.02 },
    moon:   { friction: 0.75, rollRes: 0.008, grip: 0.70, bounciness: 0.18 },
    neon:   { friction: 0.90, rollRes: 0.012, grip: 0.95, bounciness: 0.08 },
    dust:   { friction: 0.60, rollRes: 0.045, grip: 0.55, bounciness: 0.03 },
    canyon: { friction: 0.82, rollRes: 0.025, grip: 0.78, bounciness: 0.12 },
  },

  GRAVITY_MULTIPLIERS: {
    moon:       0.165,  // 1/6th Earth gravity
    mars:       0.376,  // Mars gravity
    underwater: 0.2,    // buoyancy reduces effective gravity
    default:    1.0,
  },

  getGravity(mapId) {
    return (this.GRAVITY_MULTIPLIERS[mapId] || 1.0) * 980;
  },

  getSurfacePhysics(mapId) {
    const surfaceMap = {
      countryside: 'rock',
      desert:      'sand',
      winter:      'snow',
      beach:       'sand',
      city:        'asfalt',
      jungle:      'mud',
      mars:        'dust',
      moon:        'moon',
      neon:        'neon',
      volcano:     'lava',
      underwater:  'water',
      wasteland:   'dust',
      canyon:      'rock',
    };
    return this.SURFACE_PHYSICS[surfaceMap[mapId]] || this.SURFACE_PHYSICS.asfalt;
  },

  // ═══════════════════════════════════════════════════════════════
  // ADVANCED SUSPENSION MODEL
  // ═══════════════════════════════════════════════════════════════

  SUSPENSION_CONFIGS: {
    default:   { stiffness: 280, damping: 32, travel: 0.25, preload: 0.15 },
    sport:     { stiffness: 380, damping: 40, travel: 0.18, preload: 0.18 },
    off_road:  { stiffness: 200, damping: 24, travel: 0.40, preload: 0.12 },
    rally:     { stiffness: 320, damping: 36, travel: 0.30, preload: 0.15 },
    race:      { stiffness: 450, damping: 50, travel: 0.14, preload: 0.20 },
    dirt:      { stiffness: 240, damping: 28, travel: 0.35, preload: 0.13 },
    truck:     { stiffness: 180, damping: 20, travel: 0.50, preload: 0.10 },
    monster:   { stiffness: 150, damping: 16, travel: 0.65, preload: 0.08 },
  },

  getSuspensionForVehicle(vehicleId) {
    const configs = {
      jeep: 'off_road', motocross: 'dirt', monster: 'monster', racecar: 'race',
      tractor: 'off_road', superDiesel: 'truck', rallyCar: 'rally', muscleCar: 'sport',
      sportsCar: 'sport', formula: 'race', duneBuggy: 'off_road', dirtBike: 'dirt',
      snowMobile: 'off_road', chopper: 'sport', scooter: 'default', atv: 'off_road',
      tank: 'truck', loader: 'truck', semiTruck: 'truck', van: 'default',
      ambulance: 'default', hoverCar: 'sport', moonLander: 'off_road', lawnMower: 'default',
      rickshaw: 'default', hipsterCar: 'default', paintingTruck: 'default', supercar: 'race',
      bugatti: 'race', helicopter: 'default', submarine: 'truck', dragster: 'race',
      pickup: 'off_road', dune4x4: 'off_road', warthog: 'off_road', offroader: 'off_road',
      cybertruck: 'sport',
    };
    return this.SUSPENSION_CONFIGS[configs[vehicleId] || 'default'];
  },

  // ═══════════════════════════════════════════════════════════════
  // AERODYNAMICS MODEL
  // ═══════════════════════════════════════════════════════════════

  AERO_CONFIGS: {
    jeep:       { dragCoef: 0.45, liftCoef: 0.05, downforce: 0.0 },
    racecar:    { dragCoef: 0.30, liftCoef: -0.2, downforce: 0.4 },
    formula:    { dragCoef: 0.35, liftCoef: -0.5, downforce: 0.8 },
    sportsCar:  { dragCoef: 0.32, liftCoef: -0.1, downforce: 0.2 },
    muscleCar:  { dragCoef: 0.40, liftCoef: 0.02, downforce: 0.05 },
    bugatti:    { dragCoef: 0.28, liftCoef: -0.15, downforce: 0.3 },
    supercar:   { dragCoef: 0.30, liftCoef: -0.18, downforce: 0.35 },
    dragster:   { dragCoef: 0.55, liftCoef: -0.1, downforce: 0.1 },
    monster:    { dragCoef: 0.65, liftCoef: 0.08, downforce: 0.0 },
    tank:       { dragCoef: 0.80, liftCoef: 0.0,  downforce: 0.0 },
    hoverCar:   { dragCoef: 0.20, liftCoef: -0.3, downforce: 0.5 },
    helicopter: { dragCoef: 0.60, liftCoef: -0.8, downforce: 0.0 },
  },

  getAeroForce(vehicleId, speed, angle) {
    const cfg = this.AERO_CONFIGS[vehicleId] || this.AERO_CONFIGS.jeep;
    const airDensity = 1.225;
    const frontalArea = 2.0; // m^2 (approximate)
    const speedMs = Math.abs(speed) / 100; // convert to m/s
    const dynamicPressure = 0.5 * airDensity * speedMs * speedMs;
    const drag = -cfg.dragCoef * frontalArea * dynamicPressure * Math.sign(speed);
    const lift = cfg.liftCoef * frontalArea * dynamicPressure;
    const downforce = cfg.downforce * frontalArea * dynamicPressure;
    return { drag, lift, downforce };
  },

  // ═══════════════════════════════════════════════════════════════
  // WHEEL SPIN / SLIP MODEL
  // ═══════════════════════════════════════════════════════════════

  computeWheelSlip(throttle, speed, surfaceGrip, vehicleMass) {
    const maxTraction = surfaceGrip * vehicleMass * 980 * 0.001;
    const requestedForce = throttle * vehicleMass * 0.5;
    const slipRatio = Math.max(0, requestedForce - maxTraction) / maxTraction;
    return Math.min(1, slipRatio);
  },

  getSlipEffects(slipRatio) {
    return {
      smokeIntensity: slipRatio * 0.8,
      tractionLoss:   slipRatio * 0.6,
      sound:          slipRatio > 0.2 ? 'tire_squeal' : null,
      sparkChance:    slipRatio * 0.15,
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // IMPACT / CRASH PHYSICS
  // ═══════════════════════════════════════════════════════════════

  computeImpactDamage(velocity, vehicleMass, armorLevel) {
    const speedAtImpact = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
    const kineticEnergy = 0.5 * vehicleMass * speedAtImpact * speedAtImpact;
    const baseDamage = kineticEnergy / 50000;
    const armorMult = 1 / (1 + armorLevel * 0.1);
    return Math.floor(baseDamage * armorMult);
  },

  getImpactResponse(speedAtImpact, surfaceBounciness) {
    const minImpactSpeed = 3;
    if (speedAtImpact < minImpactSpeed) return null;
    return {
      bounceX: 0,
      bounceY: -speedAtImpact * surfaceBounciness,
      particleCount: Math.floor(speedAtImpact * 0.8),
      screenShake: Math.min(20, speedAtImpact * 1.5),
      damageFactor: Math.max(0, (speedAtImpact - minImpactSpeed) / 20),
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // FLIP DETECTION
  // ═══════════════════════════════════════════════════════════════

  _flipState: {
    lastAngle: 0,
    totalRotation: 0,
    inFlip: false,
    airborne: false,
    flipCount: 0,
    lastFlipTime: 0
  },

  detectFlip(angle, airborne, t) {
    const fs = this._flipState;
    let delta = angle - fs.lastAngle;
    // Normalize delta to [-PI, PI]
    while (delta > Math.PI)  delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    fs.lastAngle = angle;
    if (airborne) {
      fs.airborne = true;
      fs.totalRotation += delta;
      // Check if completed 360
      if (Math.abs(fs.totalRotation) >= Math.PI * 2) {
        fs.flipCount++;
        fs.totalRotation -= Math.sign(fs.totalRotation) * Math.PI * 2;
        fs.lastFlipTime = t;
        return { isFlip: true, flipCount: fs.flipCount, direction: delta > 0 ? 'forward' : 'backward' };
      }
    } else {
      if (fs.airborne) {
        // Just landed
        fs.totalRotation = 0;
      }
      fs.airborne = false;
    }
    return { isFlip: false, flipCount: fs.flipCount };
  },

  resetFlipDetector() {
    this._flipState.totalRotation = 0;
    this._flipState.flipCount = 0;
    this._flipState.lastFlipTime = 0;
    this._flipState.airborne = false;
  },

  getPartialFlipProgress() {
    return Math.abs(this._flipState.totalRotation) / (Math.PI * 2);
  },

  // ═══════════════════════════════════════════════════════════════
  // SCREEN SHAKE
  // ═══════════════════════════════════════════════════════════════

  _shakeIntensity: 0,
  _shakeDecay: 0.85,
  _shakeOffset: { x: 0, y: 0 },

  addShake(intensity) {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  },

  updateShake() {
    if (this._shakeIntensity < 0.1) { this._shakeOffset.x = 0; this._shakeOffset.y = 0; return; }
    this._shakeIntensity *= this._shakeDecay;
    this._shakeOffset.x = (Math.random() - 0.5) * this._shakeIntensity * 2;
    this._shakeOffset.y = (Math.random() - 0.5) * this._shakeIntensity;
  },

  getShakeOffset() { return this._shakeOffset; },

  // ═══════════════════════════════════════════════════════════════
  // MAP GRAVITY / BUOYANCY
  // ═══════════════════════════════════════════════════════════════

  getMapPhysicsConstants(mapId) {
    const constants = {
      moon:      { g: 162,  airDensity: 0,    fluidDensity: 0,    windBase: 0    },
      mars:      { g: 372,  airDensity: 0.02, fluidDensity: 0,    windBase: 3    },
      underwater:{ g: 980,  airDensity: 0,    fluidDensity: 1000, windBase: 0    },
      volcano:   { g: 980,  airDensity: 1.4,  fluidDensity: 0,    windBase: 1    },
      neon:      { g: 980,  airDensity: 1.225,fluidDensity: 0,    windBase: 0    },
      desert:    { g: 980,  airDensity: 1.1,  fluidDensity: 0,    windBase: 5    },
      wasteland: { g: 980,  airDensity: 1.0,  fluidDensity: 0,    windBase: 4    },
      winter:    { g: 980,  airDensity: 1.35, fluidDensity: 0,    windBase: 2    },
      default:   { g: 980,  airDensity: 1.225,fluidDensity: 0,    windBase: 0    },
    };
    return constants[mapId] || constants.default;
  },

  computeBuoyancy(vehicleMass, fluidDensity, submergedPct) {
    if (fluidDensity <= 0) return 0;
    const vehicleVolume = vehicleMass / 800; // approximate density ~ 800 kg/m^3
    return fluidDensity * vehicleVolume * 980 * submergedPct;
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // TIRE_MODEL - Advanced Pacejka "Magic Formula" Tire Physics
  // ═══════════════════════════════════════════════════════════════════════════
  // Models longitudinal (Fx) and lateral (Fy) tire forces using a simplified
  // version of the Pacejka Magic Formula. Includes slip angle, slip ratio,
  // temperature-dependent grip, and progressive wear degradation.

  TIRE_MODEL: {

    // ── Pacejka coefficients per vehicle class ──────────────────────────────
    // Format: { B, C, D, E } for Magic Formula F = D * sin(C * atan(B*x - E*(B*x - atan(B*x))))
    // B = stiffness factor, C = shape factor, D = peak value, E = curvature factor
    pacejkaCoeffs: {
      jeep:       { longitudinal: { B: 10.0, C: 1.9, D: 1.0,  E: 0.97 }, lateral: { B: 8.0,  C: 1.5, D: 0.95, E: -1.0 } },
      monster:    { longitudinal: { B: 7.5,  C: 1.8, D: 1.2,  E: 0.9  }, lateral: { B: 6.0,  C: 1.4, D: 1.1,  E: -0.8 } },
      racecar:    { longitudinal: { B: 13.5, C: 2.0, D: 1.05, E: 0.98 }, lateral: { B: 11.0, C: 1.7, D: 1.0,  E: -1.2 } },
      dirtbike:   { longitudinal: { B: 9.0,  C: 1.85,D: 0.98, E: 0.95 }, lateral: { B: 7.5,  C: 1.5, D: 0.9,  E: -0.9 } },
      buggy:      { longitudinal: { B: 11.0, C: 1.95,D: 1.02, E: 0.96 }, lateral: { B: 9.0,  C: 1.6, D: 0.97, E: -1.1 } },
      truck:      { longitudinal: { B: 8.5,  C: 1.75,D: 1.15, E: 0.92 }, lateral: { B: 7.0,  C: 1.45,D: 1.08, E: -0.85} },
      atv:        { longitudinal: { B: 9.5,  C: 1.88,D: 1.0,  E: 0.94 }, lateral: { B: 8.0,  C: 1.55,D: 0.93, E: -0.95} },
      snowmobile: { longitudinal: { B: 6.0,  C: 1.7, D: 0.85, E: 0.88 }, lateral: { B: 5.0,  C: 1.35,D: 0.78, E: -0.75} },
      dragster:   { longitudinal: { B: 15.0, C: 2.1, D: 1.08, E: 0.99 }, lateral: { B: 12.5, C: 1.8, D: 1.02, E: -1.3 } },
      default:    { longitudinal: { B: 10.0, C: 1.9, D: 1.0,  E: 0.97 }, lateral: { B: 8.0,  C: 1.5, D: 0.95, E: -1.0 } }
    },

    // ── Tire temperature model ───────────────────────────────────────────────
    // Tire grip varies with temperature. Cold tires = low grip. Optimal = full grip.
    // Overheated tires = reduced grip due to rubber degradation.
    temperatureModel: {
      coldTemp:        15,   // °C — below this, grip is significantly reduced
      optimalTempLow:  80,   // °C — lower bound of optimal operating window
      optimalTempHigh: 110,  // °C — upper bound of optimal operating window
      overheatTemp:    150,  // °C — above this, grip degrades rapidly
      maxTemp:         200,  // °C — absolute maximum; tire failure
      heatGenerationCoeff: 0.012,   // heat generated per unit of slip work (slip * force * coeff)
      coolingRateAir:      0.008,   // °C lost per frame at highway speed (air cooling)
      coolingRateStatic:   0.002,   // °C lost per frame when stationary
      coldGripFactor:      0.55,    // grip multiplier at coldTemp
      optimalGripFactor:   1.00,    // grip multiplier at optimal temperature
      overheatGripFactor:  0.70,    // grip multiplier at overheatTemp
      failureGripFactor:   0.30     // grip multiplier at maxTemp (blowout imminent)
    },

    // ── Tire wear model ─────────────────────────────────────────────────────
    tireWear: {
      // wear accumulated per unit of slip (0 = new, 1 = worn out)
      wearRatePerSlipUnit:   0.00003,
      // additional wear from overheating
      wearRateOverheatMult:  3.5,
      // grip factor as a function of wear (linear interpolation)
      newTireGrip:    1.00,
      halfWornGrip:   0.92,
      wornOutGrip:    0.68,
      // wear thresholds
      newThreshold:      0.0,
      halfWornThreshold: 0.5,
      wornOutThreshold:  1.0
    },

    // ── Core Magic Formula evaluator ─────────────────────────────────────────
    /**
     * Evaluates the Pacejka Magic Formula for a given slip value and coefficients.
     * F = D * sin(C * atan(B*slip - E*(B*slip - atan(B*slip))))
     * @param {number} slip   - dimensionless slip value (slip ratio or tan of slip angle)
     * @param {object} coeffs - { B, C, D, E }
     * @returns {number} normalized force coefficient (-1 to ~1)
     */
    magicFormula(slip, coeffs) {
      const { B, C, D, E } = coeffs;
      const Bx   = B * slip;
      const atBx = Math.atan(Bx);
      return D * Math.sin(C * Math.atan(Bx - E * (Bx - atBx)));
    },

    /**
     * Compute longitudinal tire force (Fx) — driving or braking force.
     * @param {string} vehicleId     - vehicle identifier for coefficient lookup
     * @param {number} slipRatio     - (ωr - v) / max(v, ωr) ; positive = driving, negative = braking
     * @param {number} normalLoad    - N, normal force on the tire
     * @param {number} gripModifier  - combined grip factor from temperature + wear (0–1)
     * @returns {number} Fx in Newtons
     */
    computeFx(vehicleId, slipRatio, normalLoad, gripModifier) {
      const coeffs = (this.pacejkaCoeffs[vehicleId] || this.pacejkaCoeffs.default).longitudinal;
      const mu = this.magicFormula(slipRatio, coeffs) * gripModifier;
      return mu * normalLoad;
    },

    /**
     * Compute lateral tire force (Fy) — cornering force.
     * @param {string} vehicleId     - vehicle identifier
     * @param {number} slipAngleDeg  - tire slip angle in degrees
     * @param {number} normalLoad    - N
     * @param {number} gripModifier  - 0–1
     * @returns {number} Fy in Newtons
     */
    computeFy(vehicleId, slipAngleDeg, normalLoad, gripModifier) {
      const coeffs = (this.pacejkaCoeffs[vehicleId] || this.pacejkaCoeffs.default).lateral;
      const slipRad = slipAngleDeg * Math.PI / 180;
      const mu = this.magicFormula(Math.tan(slipRad), coeffs) * gripModifier;
      return mu * normalLoad;
    },

    /**
     * Compute slip angle from vehicle velocity components.
     * α = atan2(vy, |vx|) — the angle between wheel heading and actual travel direction.
     * @param {number} vx - longitudinal velocity component (m/s)
     * @param {number} vy - lateral velocity component (m/s)
     * @returns {number} slip angle in degrees
     */
    computeSlipAngle(vx, vy) {
      if (Math.abs(vx) < 0.01) return 0;
      return Math.atan2(vy, Math.abs(vx)) * 180 / Math.PI;
    },

    /**
     * Compute longitudinal slip ratio.
     * κ = (ω * r - vx) / max(|vx|, |ω * r|, 0.1)
     * @param {number} wheelAngularVel - rad/s
     * @param {number} wheelRadius     - m (typical: 0.33 for car, 0.5 for monster)
     * @param {number} vx              - vehicle longitudinal speed m/s
     * @returns {number} slip ratio (–1 to +1 range typical)
     */
    computeSlipRatio(wheelAngularVel, wheelRadius, vx) {
      const wheelSpeed = wheelAngularVel * wheelRadius;
      const denom = Math.max(Math.abs(vx), Math.abs(wheelSpeed), 0.1);
      return (wheelSpeed - vx) / denom;
    },

    /**
     * Update tire temperature based on slip work and current speed.
     * @param {number} currentTemp   - current tire temperature °C
     * @param {number} slipMagnitude - dimensionless slip magnitude
     * @param {number} normalLoad    - N
     * @param {number} speed         - vehicle speed m/s
     * @param {number} dt            - time step s
     * @returns {number} new tire temperature °C
     */
    updateTireTemperature(currentTemp, slipMagnitude, normalLoad, speed, dt) {
      const tm = this.temperatureModel;
      // Heat generation: proportional to slip work (force × slip distance)
      const heatGenerated = slipMagnitude * normalLoad * tm.heatGenerationCoeff * dt;
      // Cooling: stronger at higher speeds (convective air cooling)
      const coolingRate = speed > 5
        ? tm.coolingRateAir * (1 + speed * 0.03)
        : tm.coolingRateStatic;
      const heatLost = (currentTemp - 20) * coolingRate * dt;  // ambient = 20°C
      return Math.max(20, currentTemp + heatGenerated - heatLost);
    },

    /**
     * Get grip multiplier based on current tire temperature.
     * @param {number} temperature - °C
     * @returns {number} grip factor 0–1
     */
    getTemperatureGripFactor(temperature) {
      const tm = this.temperatureModel;
      if (temperature <= tm.coldTemp) {
        return tm.coldGripFactor;
      } else if (temperature <= tm.optimalTempLow) {
        // Linear ramp from cold to optimal
        const t = (temperature - tm.coldTemp) / (tm.optimalTempLow - tm.coldTemp);
        return tm.coldGripFactor + t * (tm.optimalGripFactor - tm.coldGripFactor);
      } else if (temperature <= tm.optimalTempHigh) {
        return tm.optimalGripFactor;
      } else if (temperature <= tm.overheatTemp) {
        // Linear drop from optimal to overheat
        const t = (temperature - tm.optimalTempHigh) / (tm.overheatTemp - tm.optimalTempHigh);
        return tm.optimalGripFactor + t * (tm.overheatGripFactor - tm.optimalGripFactor);
      } else if (temperature <= tm.maxTemp) {
        // Rapid drop toward failure
        const t = (temperature - tm.overheatTemp) / (tm.maxTemp - tm.overheatTemp);
        return tm.overheatGripFactor + t * (tm.failureGripFactor - tm.overheatGripFactor);
      }
      return tm.failureGripFactor;
    },

    /**
     * Update tire wear and return new wear value.
     * @param {number} currentWear   - 0 (new) to 1 (worn out)
     * @param {number} slipMagnitude - dimensionless slip work
     * @param {number} temperature   - °C (higher temp = faster wear)
     * @param {number} dt            - time step s
     * @returns {number} updated wear value clamped to [0, 1]
     */
    updateTireWear(currentWear, slipMagnitude, temperature, dt) {
      const tw = this.tireWear;
      const tm = this.temperatureModel;
      let wearRate = slipMagnitude * tw.wearRatePerSlipUnit;
      if (temperature > tm.overheatTemp) {
        wearRate *= tw.wearRateOverheatMult;
      }
      return Math.min(1.0, currentWear + wearRate * dt);
    },

    /**
     * Get grip multiplier from wear level.
     * @param {number} wear - 0 to 1
     * @returns {number} grip factor
     */
    getWearGripFactor(wear) {
      const tw = this.tireWear;
      if (wear <= tw.halfWornThreshold) {
        const t = wear / tw.halfWornThreshold;
        return tw.newTireGrip + t * (tw.halfWornGrip - tw.newTireGrip);
      } else {
        const t = (wear - tw.halfWornThreshold) / (tw.wornOutThreshold - tw.halfWornThreshold);
        return tw.halfWornGrip + t * (tw.wornOutGrip - tw.halfWornGrip);
      }
    },

    /**
     * Combined grip modifier from temperature and wear.
     * @param {number} temperature
     * @param {number} wear
     * @returns {number} combined grip factor 0–1
     */
    getCombinedGripFactor(temperature, wear) {
      return this.getTemperatureGripFactor(temperature) * this.getWearGripFactor(wear);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE_TORQUE_CURVES - Per-vehicle RPM→Torque lookup tables and helpers
  // ═══════════════════════════════════════════════════════════════════════════
  // Torque curves are defined as arrays of [rpm, torqueNm] breakpoints.
  // getTorqueAtRPM linearly interpolates between the nearest breakpoints.
  // Values are in Newton-meters at the crankshaft (before drivetrain losses).

  ENGINE_TORQUE_CURVES: {

    curves: {
      jeep: {
        idleRPM: 750,
        maxRPM:  5200,
        redlineRPM: 4800,
        // [rpm, torque_Nm]
        data: [
          [  750,  95 ], [1000, 150], [1200, 200], [1500, 250],
          [1800, 290], [2200, 330], [2500, 355], [2800, 370],
          [3000, 380], [3200, 385], [3500, 382], [3800, 375],
          [4000, 360], [4200, 340], [4500, 310], [4800, 270],
          [5000, 220], [5200, 160]
        ]
      },
      monster: {
        idleRPM: 800,
        maxRPM:  6000,
        redlineRPM: 5500,
        data: [
          [  800, 120], [1000, 185], [1400, 280], [1800, 360],
          [2200, 430], [2600, 490], [3000, 540], [3400, 570],
          [3800, 590], [4000, 595], [4200, 590], [4500, 575],
          [4800, 545], [5000, 510], [5200, 470], [5500, 410],
          [5800, 340], [6000, 260]
        ]
      },
      racecar: {
        idleRPM: 1200,
        maxRPM:  9000,
        redlineRPM: 8500,
        data: [
          [1200,  80], [2000, 160], [3000, 270], [4000, 360],
          [5000, 430], [5500, 460], [6000, 480], [6500, 495],
          [7000, 505], [7500, 510], [8000, 505], [8200, 498],
          [8500, 480], [8700, 450], [9000, 380]
        ]
      },
      dirtbike: {
        idleRPM: 1500,
        maxRPM:  11000,
        redlineRPM: 10500,
        data: [
          [1500,  28], [2500,  45], [3500,  60], [4500,  75],
          [5500,  88], [6500,  98], [7000, 102], [7500, 105],
          [8000, 106], [8500, 104], [9000, 100], [9500,  94],
          [10000, 85], [10500, 72], [11000, 54]
        ]
      },
      buggy: {
        idleRPM: 1000,
        maxRPM:  7500,
        redlineRPM: 7000,
        data: [
          [1000,  65], [1500, 110], [2000, 165], [2500, 215],
          [3000, 260], [3500, 300], [4000, 330], [4500, 350],
          [5000, 362], [5500, 368], [6000, 365], [6500, 352],
          [7000, 325], [7300, 290], [7500, 240]
        ]
      },
      truck: {
        idleRPM: 650,
        maxRPM:  4800,
        redlineRPM: 4400,
        data: [
          [  650, 180], [ 900, 280], [1200, 380], [1500, 460],
          [1800, 520], [2000, 550], [2200, 565], [2400, 572],
          [2600, 575], [2800, 570], [3000, 558], [3200, 538],
          [3500, 505], [3800, 460], [4000, 410], [4200, 350],
          [4500, 280], [4800, 200]
        ]
      },
      atv: {
        idleRPM: 1100,
        maxRPM:  8500,
        redlineRPM: 8000,
        data: [
          [1100,  35], [1500,  55], [2000,  80], [2500, 105],
          [3000, 128], [3500, 148], [4000, 163], [4500, 173],
          [5000, 179], [5500, 182], [6000, 181], [6500, 175],
          [7000, 164], [7500, 147], [8000, 124], [8500,  95]
        ]
      },
      snowmobile: {
        idleRPM: 1400,
        maxRPM:  8800,
        redlineRPM: 8400,
        data: [
          [1400,  40], [2000,  68], [2500,  92], [3000, 118],
          [3500, 142], [4000, 162], [4500, 178], [5000, 190],
          [5500, 198], [6000, 202], [6500, 200], [7000, 192],
          [7500, 178], [8000, 157], [8400, 130], [8800, 100]
        ]
      },
      dragster: {
        idleRPM: 1800,
        maxRPM:  10500,
        redlineRPM: 10000,
        data: [
          [1800, 120], [2500, 220], [3500, 370], [4500, 510],
          [5000, 580], [5500, 640], [6000, 685], [6500, 715],
          [7000, 730], [7500, 735], [8000, 730], [8500, 715],
          [9000, 685], [9500, 640], [10000, 570], [10500, 450]
        ]
      }
    },

    /**
     * Linearly interpolate torque from the RPM breakpoint table.
     * @param {string} vehicleId
     * @param {number} rpm
     * @returns {number} torque in Nm (0 if below idle or above max)
     */
    getTorqueAtRPM(vehicleId, rpm) {
      const def = this.curves[vehicleId] || this.curves.jeep;
      const data = def.data;
      if (rpm <= data[0][0]) return data[0][1] * (rpm / data[0][0]);
      if (rpm >= data[data.length - 1][0]) return 0;
      for (let i = 1; i < data.length; i++) {
        if (rpm <= data[i][0]) {
          const [r0, t0] = data[i - 1];
          const [r1, t1] = data[i];
          const frac = (rpm - r0) / (r1 - r0);
          return t0 + frac * (t1 - t0);
        }
      }
      return 0;
    },

    /**
     * @param {string} vehicleId
     * @returns {number} maximum RPM (hard rev limit)
     */
    getMaxRPM(vehicleId) {
      return (this.curves[vehicleId] || this.curves.jeep).maxRPM;
    },

    /**
     * @param {string} vehicleId
     * @returns {number} idle RPM
     */
    getIdleRPM(vehicleId) {
      return (this.curves[vehicleId] || this.curves.jeep).idleRPM;
    },

    /**
     * @param {string} vehicleId
     * @returns {number} redline RPM (power starts dropping sharply)
     */
    getRedlineRPM(vehicleId) {
      return (this.curves[vehicleId] || this.curves.jeep).redlineRPM;
    },

    /**
     * Peak torque value and the RPM at which it occurs.
     * @param {string} vehicleId
     * @returns {{ torque: number, rpm: number }}
     */
    getPeakTorque(vehicleId) {
      const def = this.curves[vehicleId] || this.curves.jeep;
      let best = { torque: 0, rpm: 0 };
      for (const [rpm, torque] of def.data) {
        if (torque > best.torque) { best.torque = torque; best.rpm = rpm; }
      }
      return best;
    },

    /**
     * Drivetrain efficiency factor (accounts for gearbox, differential losses).
     * Returns torque at the wheels.
     * @param {number} crankTorque  - Nm at crankshaft
     * @param {number} gearRatio    - total gear ratio (gearbox × final drive)
     * @param {number} efficiency   - drivetrain efficiency 0–1 (default 0.88)
     * @returns {number} wheel torque in Nm
     */
    getWheelTorque(crankTorque, gearRatio, efficiency = 0.88) {
      return crankTorque * gearRatio * efficiency;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AERODYNAMICS - Drag, downforce, ground effect, and altitude corrections
  // ═══════════════════════════════════════════════════════════════════════════
  // Uses standard aerodynamic equations. Air density varies with altitude via
  // ISA (International Standard Atmosphere) approximation.

  AERODYNAMICS: {

    // Air properties at sea level (ISA)
    airDensitySL:    1.225,   // kg/m³
    gasMolarMass:    0.02897, // kg/mol (dry air)
    gasConstant:     8.314,   // J/(mol·K)
    lapseRate:       0.0065,  // K/m (temperature lapse rate)
    seaLevelTemp:    288.15,  // K (15 °C)
    seaLevelPressure:101325,  // Pa

    // Per-vehicle aerodynamic parameters
    // Cd: drag coefficient, A: frontal area m², Cl: lift coefficient (negative = downforce),
    // groundEffectStart: ride height m below which ground effect activates
    vehicleAero: {
      jeep:       { Cd: 0.52, A: 2.90, Cl: -0.05, groundEffectStart: 0.40, groundEffectMax: 0.15 },
      monster:    { Cd: 0.82, A: 5.20, Cl:  0.10, groundEffectStart: 0.70, groundEffectMax: 0.05 },
      racecar:    { Cd: 0.30, A: 1.80, Cl: -0.75, groundEffectStart: 0.08, groundEffectMax: 0.90 },
      dirtbike:   { Cd: 0.48, A: 0.65, Cl:  0.00, groundEffectStart: 0.20, groundEffectMax: 0.05 },
      buggy:      { Cd: 0.45, A: 1.65, Cl: -0.20, groundEffectStart: 0.25, groundEffectMax: 0.25 },
      truck:      { Cd: 0.58, A: 4.10, Cl:  0.05, groundEffectStart: 0.55, groundEffectMax: 0.08 },
      atv:        { Cd: 0.50, A: 0.90, Cl:  0.02, groundEffectStart: 0.30, groundEffectMax: 0.07 },
      snowmobile: { Cd: 0.44, A: 0.75, Cl:  0.00, groundEffectStart: 0.25, groundEffectMax: 0.03 },
      dragster:   { Cd: 0.35, A: 1.40, Cl: -1.20, groundEffectStart: 0.06, groundEffectMax: 1.40 },
      default:    { Cd: 0.50, A: 2.00, Cl: -0.10, groundEffectStart: 0.30, groundEffectMax: 0.20 }
    },

    /**
     * Air density at a given altitude using ISA troposphere formula.
     * ρ = ρ₀ * (T/T₀)^(g*M/(R*L) - 1)  ≈  ρ₀ * (1 - L*h/T₀)^5.256
     * @param {number} altitudeM - altitude in meters above sea level
     * @returns {number} air density kg/m³
     */
    getAirDensity(altitudeM) {
      const alt = Math.max(0, altitudeM);
      if (alt > 11000) return this.airDensitySL * 0.297;  // tropopause plateau
      const tempRatio = 1 - (this.lapseRate * alt) / this.seaLevelTemp;
      return this.airDensitySL * Math.pow(tempRatio, 5.256);
    },

    /**
     * Aerodynamic drag force.
     * F_drag = 0.5 * ρ * Cd * A * v²
     * @param {string} vehicleId
     * @param {number} speedMs    - speed in m/s
     * @param {number} altitudeM  - altitude m (affects air density)
     * @returns {number} drag force in Newtons (opposing motion)
     */
    computeDragForce(vehicleId, speedMs, altitudeM = 0) {
      const aero = this.vehicleAero[vehicleId] || this.vehicleAero.default;
      const rho  = this.getAirDensity(altitudeM);
      return 0.5 * rho * aero.Cd * aero.A * speedMs * speedMs;
    },

    /**
     * Aerodynamic lift/downforce. Negative return = downforce (pushes vehicle down).
     * F_lift = 0.5 * ρ * Cl * A * v²
     * @param {string} vehicleId
     * @param {number} speedMs
     * @param {number} altitudeM
     * @returns {number} lift force N (negative = downforce)
     */
    computeLiftForce(vehicleId, speedMs, altitudeM = 0) {
      const aero = this.vehicleAero[vehicleId] || this.vehicleAero.default;
      const rho  = this.getAirDensity(altitudeM);
      return 0.5 * rho * aero.Cl * aero.A * speedMs * speedMs;
    },

    /**
     * Ground effect additional downforce.
     * Increases exponentially as ride height decreases below threshold.
     * @param {string} vehicleId
     * @param {number} speedMs
     * @param {number} rideHeightM - current ride height in meters
     * @param {number} altitudeM
     * @returns {number} extra downforce N (always negative / downward)
     */
    computeGroundEffect(vehicleId, speedMs, rideHeightM, altitudeM = 0) {
      const aero = this.vehicleAero[vehicleId] || this.vehicleAero.default;
      if (rideHeightM >= aero.groundEffectStart) return 0;
      const rho       = this.getAirDensity(altitudeM);
      const proximity = 1 - rideHeightM / aero.groundEffectStart; // 0→1 as height → 0
      const geFactor  = aero.groundEffectMax * proximity * proximity; // quadratic increase
      return -0.5 * rho * geFactor * aero.A * speedMs * speedMs;
    },

    /**
     * Compute all aerodynamic forces combined.
     * @param {string} vehicleId
     * @param {number} speedMs
     * @param {number} pitchAngleDeg - vehicle pitch (affects effective frontal area)
     * @param {number} altitudeM
     * @param {number} rideHeightM
     * @returns {{ drag: number, lift: number, groundEffect: number, totalNormal: number }}
     */
    computeAeroForces(vehicleId, speedMs, pitchAngleDeg = 0, altitudeM = 0, rideHeightM = 0.3) {
      // Pitch correction: steeper angle increases effective frontal area
      const pitchRad    = pitchAngleDeg * Math.PI / 180;
      const areaMult    = 1.0 + 0.3 * Math.abs(Math.sin(pitchRad));
      const aero        = this.vehicleAero[vehicleId] || this.vehicleAero.default;
      const rho         = this.getAirDensity(altitudeM);
      const v2          = speedMs * speedMs;
      const drag        = 0.5 * rho * aero.Cd * aero.A * areaMult * v2;
      const lift        = 0.5 * rho * aero.Cl * aero.A * v2;
      const groundEffect = this.computeGroundEffect(vehicleId, speedMs, rideHeightM, altitudeM);
      // Total normal force contribution from aero (downforce increases grip)
      const totalNormal = -(lift + groundEffect);  // positive = extra downforce
      return { drag, lift, groundEffect, totalNormal };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUSPENSION_DYNAMICS - Spring, damper, anti-roll bar, and travel limits
  // ═══════════════════════════════════════════════════════════════════════════

  SUSPENSION_DYNAMICS: {

    // Per-vehicle suspension parameters
    // springRate: N/m, dampingCoeff: N·s/m, antiRollRate: N·m/deg,
    // travelM: total suspension travel m, preloadN: static preload N
    vehicleSuspension: {
      jeep: {
        springRate:     35000,   // N/m
        dampingCoeff:    4200,   // N·s/m (critical ~ 2*sqrt(k*m))
        antiRollRate:     800,   // N·m per degree of body roll
        travelM:          0.28,  // m total travel
        preloadN:        1800,   // N (static preload at design ride height)
        bumpStopStiffness: 180000, // N/m (very stiff at end of travel)
        bumpStopEngageM:   0.04,  // m before travel limit where bumpstop activates
        naturalFreqHz:     1.8    // Hz (target for comfortable ride)
      },
      monster: {
        springRate:     60000,
        dampingCoeff:    7500,
        antiRollRate:     400,
        travelM:          0.55,
        preloadN:        3500,
        bumpStopStiffness: 300000,
        bumpStopEngageM:   0.06,
        naturalFreqHz:     1.4
      },
      racecar: {
        springRate:     90000,
        dampingCoeff:   12000,
        antiRollRate:    4500,
        travelM:          0.10,
        preloadN:        4200,
        bumpStopStiffness: 500000,
        bumpStopEngageM:   0.015,
        naturalFreqHz:     3.5
      },
      dirtbike: {
        springRate:     22000,
        dampingCoeff:    2800,
        antiRollRate:       0,  // no anti-roll on bikes
        travelM:          0.32,
        preloadN:         900,
        bumpStopStiffness: 150000,
        bumpStopEngageM:   0.03,
        naturalFreqHz:     2.0
      },
      buggy: {
        springRate:     42000,
        dampingCoeff:    5200,
        antiRollRate:    1200,
        travelM:          0.38,
        preloadN:        2200,
        bumpStopStiffness: 220000,
        bumpStopEngageM:   0.04,
        naturalFreqHz:     2.1
      },
      truck: {
        springRate:     55000,
        dampingCoeff:    6800,
        antiRollRate:    2000,
        travelM:          0.22,
        preloadN:        4500,
        bumpStopStiffness: 280000,
        bumpStopEngageM:   0.03,
        naturalFreqHz:     1.6
      },
      atv: {
        springRate:     28000,
        dampingCoeff:    3500,
        antiRollRate:     300,
        travelM:          0.25,
        preloadN:        1200,
        bumpStopStiffness: 160000,
        bumpStopEngageM:   0.03,
        naturalFreqHz:     2.2
      },
      snowmobile: {
        springRate:     20000,
        dampingCoeff:    2400,
        antiRollRate:     200,
        travelM:          0.30,
        preloadN:         800,
        bumpStopStiffness: 130000,
        bumpStopEngageM:   0.03,
        naturalFreqHz:     1.9
      },
      dragster: {
        springRate:     110000,
        dampingCoeff:   15000,
        antiRollRate:    6000,
        travelM:          0.08,
        preloadN:        5000,
        bumpStopStiffness: 600000,
        bumpStopEngageM:   0.01,
        naturalFreqHz:     4.2
      },
      default: {
        springRate:     35000,
        dampingCoeff:    4200,
        antiRollRate:     800,
        travelM:          0.28,
        preloadN:        1800,
        bumpStopStiffness: 180000,
        bumpStopEngageM:   0.04,
        naturalFreqHz:     1.8
      }
    },

    /**
     * Compute suspension force at given compression and velocity.
     * Force = spring force + damping force + bumpstop force
     * @param {number} compressionM   - suspension compression from design position (m, positive = compressed)
     * @param {number} velocityMs     - rate of compression (m/s, positive = compressing)
     * @param {string} vehicleId
     * @returns {number} suspension force N (positive = pushing vehicle up)
     */
    computeSuspensionForce(compressionM, velocityMs, vehicleId) {
      const susp = this.vehicleSuspension[vehicleId] || this.vehicleSuspension.default;
      // Spring force (linear, with preload)
      const springForce  = susp.springRate * compressionM + susp.preloadN;
      // Damping force (linear viscous)
      const dampingForce = susp.dampingCoeff * velocityMs;
      // Bumpstop: extra stiffness near travel limits
      let bumpStopForce = 0;
      const remainingTravel = susp.travelM - compressionM;
      if (remainingTravel < susp.bumpStopEngageM && compressionM > 0) {
        const bumpComp = susp.bumpStopEngageM - remainingTravel;
        bumpStopForce  = susp.bumpStopStiffness * bumpComp * bumpComp; // progressive
      }
      // Rebound stop: prevent tension beyond droop limit
      let reboundStopForce = 0;
      if (compressionM < -susp.travelM * 0.15) {
        reboundStopForce = susp.springRate * 5 * Math.abs(compressionM + susp.travelM * 0.15);
      }
      return springForce + dampingForce + bumpStopForce - reboundStopForce;
    },

    /**
     * Anti-roll bar torque resisting body roll.
     * @param {number} rollAngleDeg - current body roll angle in degrees
     * @param {string} vehicleId
     * @returns {number} restoring torque N·m
     */
    computeAntiRollTorque(rollAngleDeg, vehicleId) {
      const susp = this.vehicleSuspension[vehicleId] || this.vehicleSuspension.default;
      return susp.antiRollRate * rollAngleDeg;
    },

    /**
     * @param {string} vehicleId
     * @returns {number} total suspension travel in meters
     */
    getSuspensionTravel(vehicleId) {
      return (this.vehicleSuspension[vehicleId] || this.vehicleSuspension.default).travelM;
    },

    /**
     * Whether the suspension has bottomed out.
     * @param {number} compressionM
     * @param {string} vehicleId
     * @returns {boolean}
     */
    getBottomOut(vehicleId, compressionM) {
      const susp = this.vehicleSuspension[vehicleId] || this.vehicleSuspension.default;
      return compressionM >= susp.travelM;
    },

    /**
     * Natural frequency of the suspension system.
     * ωn = sqrt(k/m),  fn = ωn / (2π)
     * @param {string} vehicleId
     * @param {number} cornerMassKg - sprung mass at this corner
     * @returns {number} natural frequency in Hz
     */
    getNaturalFrequency(vehicleId, cornerMassKg) {
      const susp = this.vehicleSuspension[vehicleId] || this.vehicleSuspension.default;
      return (1 / (2 * Math.PI)) * Math.sqrt(susp.springRate / Math.max(cornerMassKg, 1));
    },

    /**
     * Damping ratio (zeta). Values: <1 = underdamped (bouncy), 1 = critical, >1 = overdamped.
     * ζ = c / (2 * sqrt(k * m))
     * @param {string} vehicleId
     * @param {number} cornerMassKg
     * @returns {number} damping ratio
     */
    getDampingRatio(vehicleId, cornerMassKg) {
      const susp = this.vehicleSuspension[vehicleId] || this.vehicleSuspension.default;
      const critical = 2 * Math.sqrt(susp.springRate * Math.max(cornerMassKg, 1));
      return susp.dampingCoeff / critical;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLISION_SYSTEM - AABB, circle/polygon collision and impulse resolution
  // ═══════════════════════════════════════════════════════════════════════════

  COLLISION_SYSTEM: {

    // Restitution coefficients per material pair
    restitution: {
      vehicle_terrain:  0.25,
      vehicle_vehicle:  0.35,
      vehicle_rock:     0.15,
      vehicle_barrier:  0.20,
      vehicle_ramp:     0.40,
      default:          0.25
    },

    // Friction coefficients (µ) for impulse resolution
    frictionCoeff: {
      vehicle_terrain:  0.65,
      vehicle_vehicle:  0.45,
      vehicle_rock:     0.55,
      vehicle_barrier:  0.30,
      vehicle_ramp:     0.40,
      default:          0.50
    },

    /**
     * Axis-Aligned Bounding Box overlap test.
     * @param {object} a - { x, y, w, h }
     * @param {object} b - { x, y, w, h }
     * @returns {boolean}
     */
    aabbOverlap(a, b) {
      return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
      );
    },

    /**
     * AABB penetration depth and normal.
     * @param {object} a - { x, y, w, h }
     * @param {object} b
     * @returns {{ normal: {x,y}, depth: number }|null}
     */
    aabbPenetration(a, b) {
      const aCx = a.x + a.w / 2, aCy = a.y + a.h / 2;
      const bCx = b.x + b.w / 2, bCy = b.y + b.h / 2;
      const dx   = bCx - aCx,    dy   = bCy - aCy;
      const overlapX = (a.w + b.w) / 2 - Math.abs(dx);
      const overlapY = (a.h + b.h) / 2 - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) return null;
      if (overlapX < overlapY) {
        return { normal: { x: Math.sign(dx), y: 0 }, depth: overlapX };
      } else {
        return { normal: { x: 0, y: Math.sign(dy) }, depth: overlapY };
      }
    },

    /**
     * Circle vs circle collision.
     * @param {object} c1 - { cx, cy, r }
     * @param {object} c2
     * @returns {{ normal: {x,y}, depth: number }|null}
     */
    circleCircle(c1, c2) {
      const dx  = c2.cx - c1.cx;
      const dy  = c2.cy - c1.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sumR  = c1.r + c2.r;
      if (dist >= sumR) return null;
      const invDist = dist < 0.0001 ? 0 : 1 / dist;
      return {
        normal: { x: dx * invDist, y: dy * invDist },
        depth:  sumR - dist
      };
    },

    /**
     * Circle vs convex polygon (SAT — Separating Axis Theorem, simplified).
     * Polygon vertices must be in counter-clockwise order.
     * @param {object} circle  - { cx, cy, r }
     * @param {Array}  verts   - [{x,y}, ...] polygon vertices (CCW)
     * @returns {{ normal: {x,y}, depth: number }|null}
     */
    circlePolygon(circle, verts) {
      let minDepth = Infinity;
      let minNormal = null;
      const n = verts.length;
      for (let i = 0; i < n; i++) {
        const v0 = verts[i];
        const v1 = verts[(i + 1) % n];
        // Edge normal (outward for CCW)
        const ex = v1.x - v0.x, ey = v1.y - v0.y;
        const len = Math.sqrt(ex * ex + ey * ey) || 1;
        const nx = ey / len, ny = -ex / len;
        // Project polygon onto this normal
        let polyMin = Infinity, polyMax = -Infinity;
        for (const v of verts) {
          const proj = v.x * nx + v.y * ny;
          polyMin = Math.min(polyMin, proj);
          polyMax = Math.max(polyMax, proj);
        }
        // Project circle onto this normal
        const circProj = circle.cx * nx + circle.cy * ny;
        const circMin  = circProj - circle.r;
        const circMax  = circProj + circle.r;
        // Check separation
        if (circMax < polyMin || circMin > polyMax) return null;
        const depth = Math.min(circMax - polyMin, polyMax - circMin);
        if (depth < minDepth) { minDepth = depth; minNormal = { x: nx, y: ny }; }
      }
      return { normal: minNormal, depth: minDepth };
    },

    /**
     * Compute collision impulse magnitude (1D, along normal).
     * j = -(1 + e) * vRel·n / (1/mA + 1/mB)
     * @param {object} relVel   - relative velocity { x, y } of bodyA w.r.t bodyB
     * @param {object} normal   - collision normal { x, y } (from A to B)
     * @param {number} massA
     * @param {number} massB
     * @param {number} restitution - coefficient of restitution
     * @returns {number} scalar impulse magnitude (positive = separating)
     */
    computeImpulse(relVel, normal, massA, massB, restitution) {
      const vRelN = relVel.x * normal.x + relVel.y * normal.y;
      if (vRelN >= 0) return 0;  // already separating
      const invMassSum = (massA > 0 ? 1 / massA : 0) + (massB > 0 ? 1 / massB : 0);
      if (invMassSum === 0) return 0;
      return -(1 + restitution) * vRelN / invMassSum;
    },

    /**
     * Compute friction impulse along the tangent direction.
     * Coulomb friction: |jt| <= µ * |jn|
     * @param {object} relVel
     * @param {object} normal
     * @param {number} massA
     * @param {number} massB
     * @param {number} normalImpulse  - magnitude of normal impulse (j)
     * @param {number} mu             - friction coefficient
     * @returns {number} friction impulse magnitude (along tangent)
     */
    computeFrictionImpulse(relVel, normal, massA, massB, normalImpulse, mu) {
      // Tangent direction (perpendicular to normal)
      const tx = -normal.y, ty = normal.x;
      const vRelT = relVel.x * tx + relVel.y * ty;
      const invMassSum = (massA > 0 ? 1 / massA : 0) + (massB > 0 ? 1 / massB : 0);
      if (invMassSum === 0) return 0;
      const jt = -vRelT / invMassSum;
      // Clamp to Coulomb cone
      return Math.max(-mu * normalImpulse, Math.min(mu * normalImpulse, jt));
    },

    /**
     * Full collision resolution: apply impulses to both bodies.
     * Mutates bodyA and bodyB velocity in place.
     * @param {object} bodyA    - { vx, vy, mass, restitutionType? }
     * @param {object} bodyB
     * @param {object} contact  - { normal: {x,y}, depth: number }
     * @param {string} pairType - key into restitution table
     */
    resolveCollision(bodyA, bodyB, contact, pairType = 'default') {
      const e   = this.restitution[pairType]   || this.restitution.default;
      const mu  = this.frictionCoeff[pairType] || this.frictionCoeff.default;
      const n   = contact.normal;
      const relVel = {
        x: (bodyA.vx || 0) - (bodyB.vx || 0),
        y: (bodyA.vy || 0) - (bodyB.vy || 0)
      };
      const j   = this.computeImpulse(relVel, n, bodyA.mass, bodyB.mass, e);
      const jt  = this.computeFrictionImpulse(relVel, n, bodyA.mass, bodyB.mass, j, mu);
      // Tangent vector
      const tx  = -n.y, ty = n.x;
      // Apply normal impulse
      if (bodyA.mass > 0) {
        bodyA.vx = (bodyA.vx || 0) + (j / bodyA.mass)  * n.x;
        bodyA.vy = (bodyA.vy || 0) + (j / bodyA.mass)  * n.y;
        bodyA.vx += (jt / bodyA.mass) * tx;
        bodyA.vy += (jt / bodyA.mass) * ty;
      }
      if (bodyB.mass > 0) {
        bodyB.vx = (bodyB.vx || 0) - (j / bodyB.mass)  * n.x;
        bodyB.vy = (bodyB.vy || 0) - (j / bodyB.mass)  * n.y;
        bodyB.vx -= (jt / bodyB.mass) * tx;
        bodyB.vy -= (jt / bodyB.mass) * ty;
      }
      // Positional correction (Baumgarte stabilization) to prevent sinking
      const slop        = 0.005;  // penetration allowance m
      const correction  = Math.max(contact.depth - slop, 0) * 0.4;
      const totalInvMass = (bodyA.mass > 0 ? 1/bodyA.mass : 0) + (bodyB.mass > 0 ? 1/bodyB.mass : 0);
      if (totalInvMass > 0) {
        if (bodyA.mass > 0) {
          bodyA.x = (bodyA.x || 0) - (correction / totalInvMass / bodyA.mass) * n.x;
          bodyA.y = (bodyA.y || 0) - (correction / totalInvMass / bodyA.mass) * n.y;
        }
        if (bodyB.mass > 0) {
          bodyB.x = (bodyB.x || 0) + (correction / totalInvMass / bodyB.mass) * n.x;
          bodyB.y = (bodyB.y || 0) + (correction / totalInvMass / bodyB.mass) * n.y;
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VEHICLE_DYNAMICS - Weight transfer, roll moment, CoG, stability analysis
  // ═══════════════════════════════════════════════════════════════════════════

  VEHICLE_DYNAMICS: {

    // Per-vehicle center of gravity and geometric parameters
    // All dimensions in meters, mass in kg
    vehicleParams: {
      jeep: {
        mass: 1850, cogHeight: 0.72, wheelbase: 2.70, trackWidth: 1.65,
        momentOfInertiaRoll: 850,  momentOfInertiaPitch: 2200, momentOfInertiaYaw: 2500,
        rollStiffness: 28000, frontWeightBias: 0.54
      },
      monster: {
        mass: 4500, cogHeight: 1.80, wheelbase: 3.40, trackWidth: 3.00,
        momentOfInertiaRoll: 8000, momentOfInertiaPitch: 18000, momentOfInertiaYaw: 20000,
        rollStiffness: 45000, frontWeightBias: 0.50
      },
      racecar: {
        mass: 780,  cogHeight: 0.28, wheelbase: 2.50, trackWidth: 1.80,
        momentOfInertiaRoll: 200,  momentOfInertiaPitch: 650,  momentOfInertiaYaw: 800,
        rollStiffness: 80000, frontWeightBias: 0.47
      },
      dirtbike: {
        mass: 115,  cogHeight: 0.70, wheelbase: 1.48, trackWidth: 0.00,  // 2-wheel
        momentOfInertiaRoll: 18,   momentOfInertiaPitch: 42,   momentOfInertiaYaw: 55,
        rollStiffness: 0, frontWeightBias: 0.45  // no anti-roll
      },
      buggy: {
        mass: 680,  cogHeight: 0.55, wheelbase: 2.40, trackWidth: 1.72,
        momentOfInertiaRoll: 280,  momentOfInertiaPitch: 900,  momentOfInertiaYaw: 1100,
        rollStiffness: 35000, frontWeightBias: 0.48
      },
      truck: {
        mass: 3200, cogHeight: 0.85, wheelbase: 3.20, trackWidth: 1.90,
        momentOfInertiaRoll: 2800, momentOfInertiaPitch: 9500, momentOfInertiaYaw: 11000,
        rollStiffness: 55000, frontWeightBias: 0.55
      },
      atv: {
        mass: 380,  cogHeight: 0.55, wheelbase: 1.20, trackWidth: 1.10,
        momentOfInertiaRoll: 85,   momentOfInertiaPitch: 200,  momentOfInertiaYaw: 260,
        rollStiffness: 15000, frontWeightBias: 0.50
      },
      snowmobile: {
        mass: 290,  cogHeight: 0.50, wheelbase: 1.35, trackWidth: 0.90,
        momentOfInertiaRoll: 60,   momentOfInertiaPitch: 160,  momentOfInertiaYaw: 200,
        rollStiffness: 10000, frontWeightBias: 0.52
      },
      dragster: {
        mass: 1100, cogHeight: 0.35, wheelbase: 2.90, trackWidth: 1.50,
        momentOfInertiaRoll: 320,  momentOfInertiaPitch: 1400, momentOfInertiaYaw: 1600,
        rollStiffness: 90000, frontWeightBias: 0.35  // rear-heavy
      },
      default: {
        mass: 1500, cogHeight: 0.65, wheelbase: 2.60, trackWidth: 1.60,
        momentOfInertiaRoll: 600,  momentOfInertiaPitch: 1800, momentOfInertiaYaw: 2000,
        rollStiffness: 30000, frontWeightBias: 0.52
      }
    },

    /**
     * Compute longitudinal weight transfer during acceleration or braking.
     * ΔW = m * a * h_cog / wheelbase
     * @param {object} vehicle   - object with vehicleId and/or direct params
     * @param {number} accelMs2  - longitudinal acceleration m/s² (positive = forward accel)
     * @returns {{ frontTransfer: number, rearTransfer: number }} N (positive = load increase)
     */
    computeWeightTransfer(vehicle, accelMs2) {
      const vId   = vehicle.vehicleId || 'default';
      const p     = this.vehicleParams[vId] || this.vehicleParams.default;
      const g     = 9.81;
      const delta = p.mass * accelMs2 * p.cogHeight / p.wheelbase;
      // During acceleration (positive a): weight transfers to rear
      return {
        frontTransfer: -delta,  // front loses load
        rearTransfer:  +delta   // rear gains load
      };
    },

    /**
     * Compute lateral weight transfer during cornering.
     * ΔW_lateral = m * ay * h_cog / trackWidth
     * @param {object} vehicle
     * @param {number} latAccelMs2 - lateral acceleration m/s² (positive = left turn → load to right)
     * @returns {{ leftTransfer: number, rightTransfer: number }}
     */
    computeLateralWeightTransfer(vehicle, latAccelMs2) {
      const vId   = vehicle.vehicleId || 'default';
      const p     = this.vehicleParams[vId] || this.vehicleParams.default;
      if (p.trackWidth === 0) return { leftTransfer: 0, rightTransfer: 0 };
      const delta = p.mass * latAccelMs2 * p.cogHeight / p.trackWidth;
      return {
        leftTransfer:  -delta,
        rightTransfer: +delta
      };
    },

    /**
     * Roll moment acting on the vehicle body.
     * M_roll = m * ay * h_cog
     * @param {object} vehicle
     * @param {number} latAccelMs2
     * @returns {number} roll moment in N·m
     */
    computeRollMoment(vehicle, latAccelMs2) {
      const vId = vehicle.vehicleId || 'default';
      const p   = this.vehicleParams[vId] || this.vehicleParams.default;
      return p.mass * Math.abs(latAccelMs2) * p.cogHeight;
    },

    /**
     * Determine if vehicle is at risk of rolling over.
     * Static stability factor SSF = trackWidth / (2 * cogHeight)
     * Rollover if |ay| > g * SSF
     * @param {object} vehicle
     * @param {number} latAccelMs2
     * @returns {boolean}
     */
    isRollingOver(vehicle, latAccelMs2) {
      const vId = vehicle.vehicleId || 'default';
      const p   = this.vehicleParams[vId] || this.vehicleParams.default;
      if (p.trackWidth === 0) return false;  // bikes fall differently
      const ssf = p.trackWidth / (2 * p.cogHeight);
      return Math.abs(latAccelMs2) > 9.81 * ssf;
    },

    /**
     * Static stability factor SSF = trackWidth / (2 * cogHeight).
     * Higher SSF = more stable. SSF < 1.0 = high rollover risk.
     * @param {object} vehicle
     * @returns {number}
     */
    getStabilityFactor(vehicle) {
      const vId = vehicle.vehicleId || 'default';
      const p   = this.vehicleParams[vId] || this.vehicleParams.default;
      if (p.trackWidth === 0) return 0.5;  // bikes are inherently unstable laterally
      return p.trackWidth / (2 * p.cogHeight);
    },

    /**
     * Vehicle yaw response (oversteer / understeer tendency).
     * Returns normalized understeer gradient: positive = understeer, negative = oversteer.
     * @param {object} vehicle
     * @param {number} speedMs
     * @returns {number} understeer gradient (deg/g)
     */
    getUnderSteerGradient(vehicle, speedMs) {
      const vId = vehicle.vehicleId || 'default';
      const p   = this.vehicleParams[vId] || this.vehicleParams.default;
      // Simplified: based on front/rear weight bias and CoG height
      const frontBias = p.frontWeightBias;
      // Speed-dependent understeer tendency
      const speedFactor = Math.min(speedMs / 30, 1.0);
      const gradient    = (frontBias - 0.50) * 8.0 + p.cogHeight * 1.5 * speedFactor;
      return gradient;  // deg/g; positive = push/understeer, negative = snap/oversteer
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SURFACE_INTERACTION - Mud, water, ice, sand, grass, rock physics
  // ═══════════════════════════════════════════════════════════════════════════

  SURFACE_INTERACTION: {

    // Surface properties table
    // gripFactor: multiplier on base tire grip (1.0 = dry tarmac)
    // dragCoeff:  additional resistance force per (vehicle_weight * speed) [dimensionless]
    // sinkFactor: how deeply tires sink (affects ride height and drag)
    // damageRate: structural damage per second at speed
    surfaces: {
      asphalt:   { gripFactor: 1.00, dragCoeff: 0.010, sinkFactor: 0.00, damageRate: 0.0,  dustEmission: false, splashEmission: false },
      dirt:      { gripFactor: 0.78, dragCoeff: 0.025, sinkFactor: 0.02, damageRate: 0.0,  dustEmission: true,  splashEmission: false },
      mud:       { gripFactor: 0.40, dragCoeff: 0.120, sinkFactor: 0.08, damageRate: 0.0,  dustEmission: false, splashEmission: true  },
      sand:      { gripFactor: 0.55, dragCoeff: 0.080, sinkFactor: 0.05, damageRate: 0.0,  dustEmission: true,  splashEmission: false },
      grass:     { gripFactor: 0.70, dragCoeff: 0.035, sinkFactor: 0.01, damageRate: 0.0,  dustEmission: false, splashEmission: false },
      gravel:    { gripFactor: 0.68, dragCoeff: 0.040, sinkFactor: 0.02, damageRate: 0.1,  dustEmission: true,  splashEmission: false },
      ice:       { gripFactor: 0.12, dragCoeff: 0.005, sinkFactor: 0.00, damageRate: 0.0,  dustEmission: false, splashEmission: false },
      snow:      { gripFactor: 0.30, dragCoeff: 0.050, sinkFactor: 0.04, damageRate: 0.0,  dustEmission: false, splashEmission: false },
      water:     { gripFactor: 0.35, dragCoeff: 0.180, sinkFactor: 0.15, damageRate: 0.0,  dustEmission: false, splashEmission: true  },
      rock:      { gripFactor: 0.85, dragCoeff: 0.015, sinkFactor: 0.00, damageRate: 1.5,  dustEmission: false, splashEmission: false },
      lava:      { gripFactor: 0.90, dragCoeff: 0.020, sinkFactor: 0.00, damageRate: 8.0,  dustEmission: false, splashEmission: false },
      default:   { gripFactor: 0.80, dragCoeff: 0.020, sinkFactor: 0.01, damageRate: 0.0,  dustEmission: false, splashEmission: false }
    },

    /**
     * Mud resistance force.
     * Combines viscous drag (proportional to speed) and a constant sinkage term.
     * @param {number} speedMs      - vehicle speed m/s
     * @param {number} vehicleWeightN - vehicle weight in Newtons
     * @param {number} depth        - mud depth normalized 0–1
     * @returns {number} resistance force N
     */
    computeMudForce(speedMs, vehicleWeightN, depth) {
      const viscousDrag = 0.18 * depth * vehicleWeightN * speedMs * 0.1;
      const sinkageForce = 0.08 * depth * vehicleWeightN;
      return viscousDrag + sinkageForce;
    },

    /**
     * Water buoyancy and hydrodynamic drag.
     * @param {number} speedMs
     * @param {number} vehicleWeightN
     * @param {number} submergedFraction - fraction of vehicle submerged (0–1)
     * @param {number} vehicleMassKg
     * @returns {{ buoyancy: number, hydroDrag: number }}
     */
    computeWaterForces(speedMs, vehicleWeightN, submergedFraction, vehicleMassKg) {
      const waterDensity = 1000;  // kg/m³
      const vehicleVolume = vehicleMassKg / 800;  // approx density 800 kg/m³
      const buoyancy  = waterDensity * vehicleVolume * 9.81 * submergedFraction;
      // Hydrodynamic drag: Cd_water * 0.5 * rho_water * A * v²  (simplified)
      const CdWater   = 1.2;
      const frontalA  = 2.0;  // m² approximate
      const hydroDrag = CdWater * 0.5 * waterDensity * frontalA * submergedFraction * speedMs * speedMs;
      return { buoyancy, hydroDrag };
    },

    /**
     * Ice slip physics — greatly reduced lateral grip, speed-dependent.
     * Returns additional lateral drift velocity induced by ice.
     * @param {number} latVelocityMs  - current lateral velocity m/s
     * @param {number} dt             - time step s
     * @returns {number} modified lateral velocity m/s
     */
    computeIceSlip(latVelocityMs, dt) {
      // Ice provides almost no restoring force — lateral velocity barely decays
      const iceDecay = 0.98;  // per frame (vs ~0.7 on tarmac)
      return latVelocityMs * Math.pow(iceDecay, dt * 60);
    },

    /**
     * Sand resistance — increases with speed (churning effect).
     * @param {number} speedMs
     * @param {number} vehicleWeightN
     * @param {number} depth - sand depth 0–1
     * @returns {number} resistance N
     */
    computeSandResistance(speedMs, vehicleWeightN, depth) {
      const base       = 0.06 * depth * vehicleWeightN;
      const velocityTerm = 0.015 * depth * vehicleWeightN * speedMs;
      return base + velocityTerm;
    },

    /**
     * Grass resistance — mainly a constant drag with small speed component.
     * @param {number} speedMs
     * @param {number} vehicleWeightN
     * @returns {number} resistance N
     */
    computeGrassResistance(speedMs, vehicleWeightN) {
      return 0.025 * vehicleWeightN + 0.005 * vehicleWeightN * speedMs * 0.05;
    },

    /**
     * Rock impact damage calculation.
     * @param {number} speedMs       - impact speed m/s
     * @param {number} rockHardness  - 0–1 (1 = granite, 0 = soft rock)
     * @returns {number} damage points 0–100
     */
    computeRockImpactDamage(speedMs, rockHardness) {
      if (speedMs < 2) return 0;
      const baseDamage = speedMs * speedMs * rockHardness * 0.08;
      return Math.min(100, baseDamage);
    },

    /**
     * General surface force computation combining grip and drag.
     * @param {string} surfaceType
     * @param {number} speedMs
     * @param {number} vehicleWeightN
     * @returns {{ gripFactor: number, resistanceForce: number, damageRate: number }}
     */
    computeSurfaceForce(surfaceType, speedMs, vehicleWeightN) {
      const s = this.surfaces[surfaceType] || this.surfaces.default;
      const resistanceForce = s.dragCoeff * vehicleWeightN * (1 + speedMs * 0.05);
      return {
        gripFactor:    s.gripFactor,
        resistanceForce,
        damageRate:    s.damageRate,
        sinkFactor:    s.sinkFactor
      };
    },

    /**
     * Determine if vehicle is hydroplaning (tires lose contact with road through water film).
     * Hydroplaning onset speed ≈ 9 * sqrt(tire_pressure_psi) km/h
     * @param {number} speedKmh
     * @param {number} tirePressurePsi
     * @param {string} surfaceType
     * @returns {boolean}
     */
    isHydroplaning(speedKmh, tirePressurePsi, surfaceType) {
      if (surfaceType !== 'water' && surfaceType !== 'mud') return false;
      const onsetSpeed = 9 * Math.sqrt(Math.max(tirePressurePsi, 10));
      return speedKmh > onsetSpeed;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NITRO_PHYSICS - Nitrous oxide thrust, heat, and efficiency
  // ═══════════════════════════════════════════════════════════════════════════

  NITRO_PHYSICS: {

    // Per-vehicle nitro parameters
    vehicleNitro: {
      jeep:       { maxThrust: 3500,  heatRate: 12.0, coolingRate: 4.5, optimalCharge: 0.7, maxTemp: 320 },
      monster:    { maxThrust: 8000,  heatRate: 18.0, coolingRate: 5.0, optimalCharge: 0.6, maxTemp: 380 },
      racecar:    { maxThrust: 5500,  heatRate: 20.0, coolingRate: 8.0, optimalCharge: 0.8, maxTemp: 350 },
      dirtbike:   { maxThrust: 1200,  heatRate:  8.0, coolingRate: 6.0, optimalCharge: 0.9, maxTemp: 280 },
      buggy:      { maxThrust: 2800,  heatRate: 11.0, coolingRate: 5.5, optimalCharge: 0.75,maxTemp: 310 },
      truck:      { maxThrust: 6000,  heatRate: 15.0, coolingRate: 4.0, optimalCharge: 0.65,maxTemp: 360 },
      atv:        { maxThrust: 1800,  heatRate:  9.0, coolingRate: 5.0, optimalCharge: 0.8, maxTemp: 290 },
      snowmobile: { maxThrust: 1500,  heatRate:  8.5, coolingRate: 7.0, optimalCharge: 0.85,maxTemp: 270 },
      dragster:   { maxThrust: 12000, heatRate: 25.0, coolingRate: 3.0, optimalCharge: 0.5, maxTemp: 450 },
      default:    { maxThrust: 3500,  heatRate: 12.0, coolingRate: 4.5, optimalCharge: 0.7, maxTemp: 320 }
    },

    // Efficiency curve: efficiency as a function of charge level (0–1)
    // Below optimal = low efficiency (NOS too lean)
    // Above optimal = high efficiency plateau
    // Beyond 90% = risk of flooding (efficiency drops)
    getEfficiency(charge, optimalCharge) {
      if (charge <= 0) return 0;
      if (charge < optimalCharge * 0.5) {
        // Very lean — poor efficiency
        return 0.3 + 0.4 * (charge / (optimalCharge * 0.5));
      } else if (charge < optimalCharge) {
        // Ramp to peak
        return 0.7 + 0.3 * ((charge - optimalCharge * 0.5) / (optimalCharge * 0.5));
      } else if (charge <= 0.90) {
        // Peak efficiency plateau
        return 1.0;
      } else {
        // Flooding risk — efficiency degrades
        return 1.0 - 0.6 * ((charge - 0.90) / 0.10);
      }
    },

    /**
     * Compute nitro thrust force.
     * Thrust is modulated by charge level efficiency, speed (less effective at very high speed
     * due to reduced mass flow rate advantage), and temperature (overheating reduces output).
     * @param {number} charge     - 0 to 1 (NOS charge level)
     * @param {string} vehicleId
     * @param {number} speedMs    - current vehicle speed m/s
     * @param {number} nitrTemp   - current nitro system temperature °C
     * @returns {number} thrust force in Newtons
     */
    getNitroThrust(charge, vehicleId, speedMs, nitrTemp = 25) {
      const n = this.vehicleNitro[vehicleId] || this.vehicleNitro.default;
      if (charge <= 0) return 0;
      const efficiency   = this.getEfficiency(charge, n.optimalCharge);
      // Speed efficiency: NOS effectiveness drops above ~60 m/s (216 km/h)
      const speedFactor  = Math.max(0.2, 1.0 - Math.max(0, speedMs - 40) * 0.012);
      // Heat penalty: above 80% of max temp, efficiency reduces
      const heatFactor   = nitrTemp > n.maxTemp * 0.8
        ? Math.max(0.1, 1.0 - (nitrTemp - n.maxTemp * 0.8) / (n.maxTemp * 0.2))
        : 1.0;
      return n.maxThrust * charge * efficiency * speedFactor * heatFactor;
    },

    // ── Nitro heat model ─────────────────────────────────────────────────────
    nitroHeatModel: {
      // Heat generated per second when nitro is active (at full charge)
      heatGenerationRate: 45,   // °C/s at full charge
      // Passive cooling rate (°C/s) - increases with vehicle speed
      baseCoolingRate: 4.0,     // °C/s at rest
      speedCoolingCoeff: 0.15,  // additional °C/s per m/s of speed
      // Ambient temperature
      ambientTemp: 25,          // °C

      /**
       * Update nitro system temperature.
       * @param {number} currentTemp  - °C
       * @param {boolean} isActive    - is NOS currently firing?
       * @param {number} charge       - NOS charge (0–1)
       * @param {number} speedMs      - vehicle speed m/s
       * @param {string} vehicleId    - for max temp lookup
       * @param {number} dt           - time step s
       * @param {object} nitroPhysics - reference to NITRO_PHYSICS (this)
       * @returns {number} new temperature °C
       */
      update(currentTemp, isActive, charge, speedMs, vehicleId, dt, nitroPhysics) {
        const n = nitroPhysics.vehicleNitro[vehicleId] || nitroPhysics.vehicleNitro.default;
        const heatIn   = isActive ? n.heatRate * charge * dt : 0;
        const cooling  = (this.baseCoolingRate + speedMs * this.speedCoolingCoeff) * dt;
        const newTemp  = currentTemp + heatIn - cooling * (currentTemp > this.ambientTemp ? 1 : 0);
        return Math.max(this.ambientTemp, Math.min(n.maxTemp + 50, newTemp));
      }
    },

    /**
     * Deplete NOS charge at given flow rate.
     * @param {number} charge   - current charge 0–1
     * @param {number} flowRate - units/s consumed (typically 0.1–0.3)
     * @param {number} dt       - time step s
     * @returns {number} new charge
     */
    depleteCharge(charge, flowRate, dt) {
      return Math.max(0, charge - flowRate * dt);
    },

    /**
     * Passive NOS charge refill (if vehicle has refill system).
     * @param {number} charge
     * @param {number} refillRate - units/s (typically 0.02–0.05)
     * @param {number} dt
     * @returns {number} new charge
     */
    rechargeNitro(charge, refillRate, dt) {
      return Math.min(1.0, charge + refillRate * dt);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // JUMP_PHYSICS - Angular momentum, air torque, flip detection, bonuses
  // ═══════════════════════════════════════════════════════════════════════════

  JUMP_PHYSICS: {

    // Per-vehicle air physics params
    vehicleAirParams: {
      jeep:       { momentOfInertia: 1200, airTorqueCoeff: 0.18, maxAngularVel: 6.0,  size: 'large'  },
      monster:    { momentOfInertia: 9500, airTorqueCoeff: 0.08, maxAngularVel: 3.5,  size: 'xlarge' },
      racecar:    { momentOfInertia:  550, airTorqueCoeff: 0.25, maxAngularVel: 9.0,  size: 'small'  },
      dirtbike:   { momentOfInertia:   80, airTorqueCoeff: 0.45, maxAngularVel: 14.0, size: 'tiny'   },
      buggy:      { momentOfInertia:  700, airTorqueCoeff: 0.28, maxAngularVel: 8.0,  size: 'medium' },
      truck:      { momentOfInertia: 5500, airTorqueCoeff: 0.12, maxAngularVel: 4.5,  size: 'large'  },
      atv:        { momentOfInertia:  250, airTorqueCoeff: 0.38, maxAngularVel: 11.0, size: 'small'  },
      snowmobile: { momentOfInertia:  180, airTorqueCoeff: 0.35, maxAngularVel: 10.0, size: 'small'  },
      dragster:   { momentOfInertia:  900, airTorqueCoeff: 0.20, maxAngularVel: 7.0,  size: 'medium' },
      default:    { momentOfInertia: 1000, airTorqueCoeff: 0.20, maxAngularVel: 7.0,  size: 'medium' }
    },

    // Flip bonus thresholds (degrees of rotation)
    flipBonuses: [
      { minRotation:  355, maxRotation:  365, bonus: 1000, label: 'Backflip'         },
      { minRotation:  710, maxRotation:  730, bonus: 2500, label: 'Double Backflip'  },
      { minRotation: 1065, maxRotation: 1095, bonus: 5000, label: 'Triple Backflip'  },
      { minRotation: 1420, maxRotation: 1460, bonus: 8500, label: 'Quad Backflip'    },
      { minRotation:  170, maxRotation:  195, bonus:  400, label: 'Half Flip'        },
      { minRotation:  530, maxRotation:  550, bonus: 1200, label: 'Front Flip'       }
    ],

    // Running state for flip tracking (per vehicle instance)
    _flipState: {
      totalRotation: 0,
      angularVelocity: 0,
      inAir: false,
      lastGroundAngle: 0,
      bonusAwarded: []
    },

    /**
     * Compute aerodynamic torque acting on the vehicle in air.
     * Larger vehicles experience more air resistance torque, slowing rotations.
     * @param {number} angularVelocityRads - current rotation speed rad/s
     * @param {string} vehicleId
     * @returns {number} damping torque N·m (opposing rotation)
     */
    computeAirTorque(angularVelocityRads, vehicleId) {
      const p = this.vehicleAirParams[vehicleId] || this.vehicleAirParams.default;
      // Air resistance torque is proportional to angular velocity squared
      const airDampingTorque = p.airTorqueCoeff * angularVelocityRads * Math.abs(angularVelocityRads);
      return -airDampingTorque;  // opposing rotation
    },

    /**
     * Apply angular impulse (e.g., from ramp launch) and update angular velocity.
     * @param {number} angularVelocity - current rad/s
     * @param {number} torqueImpulse   - N·m·s impulse
     * @param {string} vehicleId
     * @returns {number} new angular velocity rad/s
     */
    applyAngularImpulse(angularVelocity, torqueImpulse, vehicleId) {
      const p = this.vehicleAirParams[vehicleId] || this.vehicleAirParams.default;
      const newVel = angularVelocity + torqueImpulse / p.momentOfInertia;
      return Math.max(-p.maxAngularVel, Math.min(p.maxAngularVel, newVel));
    },

    /**
     * Update angular velocity in air accounting for air torque damping.
     * Uses Euler integration: α = τ / I
     * @param {number} angularVelocity
     * @param {string} vehicleId
     * @param {number} dt - time step s
     * @returns {number} updated angular velocity rad/s
     */
    updateInAir(angularVelocity, vehicleId, dt) {
      const p      = this.vehicleAirParams[vehicleId] || this.vehicleAirParams.default;
      const torque = this.computeAirTorque(angularVelocity, vehicleId);
      const alpha  = torque / p.momentOfInertia;  // angular acceleration
      return angularVelocity + alpha * dt;
    },

    /**
     * Track total rotation while in air.
     * @param {number} totalRotation    - accumulated degrees so far
     * @param {number} angularVelocity  - rad/s
     * @param {number} dt
     * @returns {number} updated total rotation degrees
     */
    trackRotation(totalRotation, angularVelocity, dt) {
      return totalRotation + angularVelocity * dt * (180 / Math.PI);
    },

    /**
     * Check if a flip bonus should be awarded for the current total rotation.
     * Returns the matching bonus entry or null.
     * @param {number} totalRotation - degrees accumulated since leaving ground
     * @returns {{ bonus: number, label: string }|null}
     */
    getFlipBonus(totalRotation) {
      for (const fb of this.flipBonuses) {
        if (totalRotation >= fb.minRotation && totalRotation <= fb.maxRotation) {
          return { bonus: fb.bonus, label: fb.label };
        }
      }
      return null;
    },

    /**
     * Detect forward vs backward flip direction.
     * @param {number} angularVelocity - rad/s; positive = backflip (typically)
     * @returns {'backflip'|'frontflip'|'none'}
     */
    getFlipDirection(angularVelocity) {
      if (Math.abs(angularVelocity) < 0.5) return 'none';
      return angularVelocity > 0 ? 'backflip' : 'frontflip';
    },

    /**
     * Compute landing impact angular velocity after a flip.
     * When vehicle lands, rotational energy partly transfers to vertical bounce.
     * @param {number} angularVelocity - rad/s at moment of landing
     * @param {string} vehicleId
     * @returns {{ remainingAngularVel: number, verticalImpulse: number }}
     */
    computeLandingRotation(angularVelocity, vehicleId) {
      const p = this.vehicleAirParams[vehicleId] || this.vehicleAirParams.default;
      // Energy transfer fraction (heavier vehicles transfer less rotational to vertical)
      const transferFraction = 0.15;
      const rotKE   = 0.5 * p.momentOfInertia * angularVelocity * angularVelocity;
      const vertKE  = rotKE * transferFraction;
      const vertVel = Math.sqrt(2 * vertKE / (p.momentOfInertia / 50 + 1));  // approximate
      return {
        remainingAngularVel: angularVelocity * (1 - transferFraction),
        verticalImpulse:     vertVel
      };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DAMAGE_MODEL - Structural integrity, impact zones, repair system
  // ═══════════════════════════════════════════════════════════════════════════

  DAMAGE_MODEL: {

    // Structural integrity starts at 100, reaches 0 at vehicle destruction
    // Impact zones: front, rear, top, bottom, left, right
    // Each zone has independent integrity and different thresholds

    vehicleDamageParams: {
      jeep: {
        mass: 1850,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        // Damage threshold: speed (m/s) required to cause any damage per zone
        damageThreshold: { front: 4.0, rear: 3.5, top: 5.0, bottom: 2.5, left: 3.8, right: 3.8 },
        // Damage multiplier per zone (some zones are weaker)
        zoneDamageMultiplier: { front: 1.0, rear: 0.8, top: 1.5, bottom: 0.6, left: 0.9, right: 0.9 },
        repairCostPerPoint: 12,    // currency per damage point
        destroyedAtIntegrity: 0,   // overall integrity % at which vehicle is disabled
        fireThreshold: 15,         // engine bay damage % that triggers fire
        criticalZones: ['top', 'bottom']
      },
      monster: {
        mass: 4500,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 8.0, rear: 7.0, top: 9.0, bottom: 5.0, left: 7.5, right: 7.5 },
        zoneDamageMultiplier: { front: 0.8, rear: 0.7, top: 1.2, bottom: 0.5, left: 0.75, right: 0.75 },
        repairCostPerPoint: 30,
        destroyedAtIntegrity: 0,
        fireThreshold: 10,
        criticalZones: ['bottom']
      },
      racecar: {
        mass: 780,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 3.0, rear: 2.8, top: 4.0, bottom: 2.0, left: 3.2, right: 3.2 },
        zoneDamageMultiplier: { front: 1.3, rear: 1.1, top: 2.0, bottom: 0.8, left: 1.1, right: 1.1 },
        repairCostPerPoint: 25,
        destroyedAtIntegrity: 0,
        fireThreshold: 20,
        criticalZones: ['top', 'front']
      },
      dirtbike: {
        mass: 115,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 2.5, rear: 2.0, top: 3.0, bottom: 1.5, left: 2.5, right: 2.5 },
        zoneDamageMultiplier: { front: 1.0, rear: 0.9, top: 1.4, bottom: 0.7, left: 1.0, right: 1.0 },
        repairCostPerPoint: 8,
        destroyedAtIntegrity: 0,
        fireThreshold: 25,
        criticalZones: ['front']
      },
      buggy: {
        mass: 680,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 3.5, rear: 3.0, top: 4.5, bottom: 2.2, left: 3.5, right: 3.5 },
        zoneDamageMultiplier: { front: 1.1, rear: 0.9, top: 1.6, bottom: 0.65, left: 0.95, right: 0.95 },
        repairCostPerPoint: 15,
        destroyedAtIntegrity: 0,
        fireThreshold: 18,
        criticalZones: ['top']
      },
      truck: {
        mass: 3200,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 6.0, rear: 5.5, top: 7.0, bottom: 4.0, left: 6.0, right: 6.0 },
        zoneDamageMultiplier: { front: 0.9, rear: 0.75, top: 1.3, bottom: 0.55, left: 0.8, right: 0.8 },
        repairCostPerPoint: 22,
        destroyedAtIntegrity: 0,
        fireThreshold: 12,
        criticalZones: ['bottom']
      },
      atv: {
        mass: 380,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 3.0, rear: 2.5, top: 3.5, bottom: 1.8, left: 3.0, right: 3.0 },
        zoneDamageMultiplier: { front: 1.0, rear: 0.85, top: 1.5, bottom: 0.6, left: 0.9, right: 0.9 },
        repairCostPerPoint: 10,
        destroyedAtIntegrity: 0,
        fireThreshold: 22,
        criticalZones: ['top']
      },
      snowmobile: {
        mass: 290,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 2.8, rear: 2.5, top: 3.2, bottom: 1.6, left: 2.8, right: 2.8 },
        zoneDamageMultiplier: { front: 0.95, rear: 0.8, top: 1.4, bottom: 0.55, left: 0.85, right: 0.85 },
        repairCostPerPoint: 9,
        destroyedAtIntegrity: 0,
        fireThreshold: 20,
        criticalZones: ['front']
      },
      dragster: {
        mass: 1100,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 5.0, rear: 4.0, top: 5.5, bottom: 3.0, left: 4.5, right: 4.5 },
        zoneDamageMultiplier: { front: 1.2, rear: 2.0, top: 1.8, bottom: 0.7, left: 1.0, right: 1.0 },
        repairCostPerPoint: 35,
        destroyedAtIntegrity: 0,
        fireThreshold: 8,
        criticalZones: ['rear', 'top']  // engine is in rear, roll cage on top
      },
      default: {
        mass: 1500,
        zoneIntegrity: { front: 100, rear: 100, top: 100, bottom: 100, left: 100, right: 100 },
        damageThreshold: { front: 4.0, rear: 3.5, top: 5.0, bottom: 2.5, left: 3.8, right: 3.8 },
        zoneDamageMultiplier: { front: 1.0, rear: 0.8, top: 1.5, bottom: 0.6, left: 0.9, right: 0.9 },
        repairCostPerPoint: 12,
        destroyedAtIntegrity: 0,
        fireThreshold: 15,
        criticalZones: ['top', 'bottom']
      }
    },

    /**
     * Get damage multiplier for a given vehicle and impact zone.
     * @param {string} vehicleId
     * @param {string} zone - 'front'|'rear'|'top'|'bottom'|'left'|'right'
     * @returns {number}
     */
    getDamageMultiplier(vehicleId, zone) {
      const p = this.vehicleDamageParams[vehicleId] || this.vehicleDamageParams.default;
      return p.zoneDamageMultiplier[zone] || 1.0;
    },

    /**
     * Compute structural damage from an impact.
     * damage = max(0, (velocity - threshold)² * zoneMult * massFactor)
     * @param {number} velocityMs  - impact velocity m/s
     * @param {number} angleDeg    - impact angle from zone normal (0 = direct hit)
     * @param {string} vehicleId
     * @param {string} zone
     * @returns {number} damage points 0–100
     */
    computeImpactDamage(velocityMs, angleDeg, vehicleId, zone) {
      const p         = this.vehicleDamageParams[vehicleId] || this.vehicleDamageParams.default;
      const threshold = p.damageThreshold[zone] || 4.0;
      const mult      = p.zoneDamageMultiplier[zone] || 1.0;
      if (velocityMs <= threshold) return 0;
      // Angular correction: glancing blows cause less damage
      const angleRad   = angleDeg * Math.PI / 180;
      const cosAngle   = Math.abs(Math.cos(angleRad));
      const excess     = velocityMs - threshold;
      // Non-linear: damage scales with velocity squared (kinetic energy proportional)
      const massFactor = Math.sqrt(1500 / Math.max(p.mass, 100));  // lighter vehicles take more relative damage
      const rawDamage  = excess * excess * mult * cosAngle * massFactor * 0.5;
      return Math.min(100, rawDamage);
    },

    /**
     * Compute overall structural integrity as average across all zones.
     * @param {object} zoneIntegrity - { front, rear, top, bottom, left, right }
     * @returns {number} 0–100
     */
    getOverallIntegrity(zoneIntegrity) {
      const zones = Object.values(zoneIntegrity);
      return zones.reduce((s, v) => s + v, 0) / zones.length;
    },

    /**
     * Compute repair cost for a given damage state.
     * @param {number} totalDamagePoints - sum of damage across all zones
     * @param {string} vehicleId
     * @returns {number} repair cost in game currency
     */
    getRepairCost(totalDamagePoints, vehicleId) {
      const p = this.vehicleDamageParams[vehicleId] || this.vehicleDamageParams.default;
      // Non-linear: heavily damaged vehicles cost disproportionately more to fix
      const baseCost    = totalDamagePoints * p.repairCostPerPoint;
      const severityMult = totalDamagePoints > 200
        ? 1.0 + (totalDamagePoints - 200) * 0.008
        : 1.0;
      return Math.round(baseCost * severityMult);
    },

    /**
     * Determine if a zone is critically damaged (integrity below 30%).
     * @param {number} zoneIntegrity - zone integrity value 0–100
     * @returns {boolean}
     */
    isCriticalDamage(zoneIntegrity) {
      return zoneIntegrity < 30;
    },

    /**
     * Check if vehicle should catch fire based on engine zone damage.
     * @param {number} engineZoneIntegrity - typically the 'front' or 'rear' zone (vehicle-dependent)
     * @param {string} vehicleId
     * @returns {boolean}
     */
    shouldCatchFire(engineZoneIntegrity, vehicleId) {
      const p = this.vehicleDamageParams[vehicleId] || this.vehicleDamageParams.default;
      return (100 - engineZoneIntegrity) > (100 - p.fireThreshold);
    },

    /**
     * Performance degradation from damage.
     * Computes multiplier applied to engine power, braking, and handling.
     * @param {object} zoneIntegrity
     * @param {string} vehicleId
     * @returns {{ enginePower: number, braking: number, handling: number }}
     */
    getPerformanceDegradation(zoneIntegrity, vehicleId) {
      const overall = this.getOverallIntegrity(zoneIntegrity);
      // BUGFIX(21 Tmz): `|| 100` truthy zinciriydi → bütünlüğü TAM 0 (yok olmuş) olan bölge
      // 100 (hasarsız) sayılıyordu. Artık yalnız TANIMSIZ alan 100 varsayılır.
      const frontDmg  = (100 - (zoneIntegrity.front  !== undefined ? zoneIntegrity.front  : 100)) / 100;
      const rearDmg   = (100 - (zoneIntegrity.rear   !== undefined ? zoneIntegrity.rear   : 100)) / 100;
      const bottomDmg = (100 - (zoneIntegrity.bottom !== undefined ? zoneIntegrity.bottom : 100)) / 100;
      // Engine power affected by front/rear damage
      const enginePower = Math.max(0.1, 1.0 - frontDmg * 0.5 - rearDmg * 0.3);
      // Braking affected by front damage
      const braking     = Math.max(0.2, 1.0 - frontDmg * 0.4);
      // Handling affected by bottom/overall damage
      const handling    = Math.max(0.15, 1.0 - bottomDmg * 0.35 - (100 - overall) / 100 * 0.25);
      return { enginePower, braking, handling };
    },

    /**
     * Apply damage to a vehicle's zone integrity state.
     * Clamps integrity to [0, 100].
     * @param {object} zoneIntegrity - mutable integrity object
     * @param {string} zone
     * @param {number} damagePoints
     * @returns {object} mutated zoneIntegrity
     */
    applyDamage(zoneIntegrity, zone, damagePoints) {
      if (zone in zoneIntegrity) {
        zoneIntegrity[zone] = Math.max(0, zoneIntegrity[zone] - damagePoints);
      }
      return zoneIntegrity;
    },

    /**
     * Repair a vehicle's zone by a given amount (e.g., pit stop, power-up).
     * @param {object} zoneIntegrity
     * @param {string} zone - or 'all' to repair every zone
     * @param {number} repairAmount
     * @returns {object} updated zoneIntegrity
     */
    repairZone(zoneIntegrity, zone, repairAmount) {
      if (zone === 'all') {
        for (const z of Object.keys(zoneIntegrity)) {
          zoneIntegrity[z] = Math.min(100, zoneIntegrity[z] + repairAmount);
        }
      } else if (zone in zoneIntegrity) {
        zoneIntegrity[zone] = Math.min(100, zoneIntegrity[zone] + repairAmount);
      }
      return zoneIntegrity;
    }
  }


};
if (typeof module !== 'undefined') module.exports = Physics;


// ============================================================
// WIND_SYSTEM — wind simulation constants and drag coefficients
// ============================================================
const WIND_SYSTEM = {
  defaultSpeed:     8.0,      // m/s base wind speed
  maxGustSpeed:     25.0,     // m/s maximum gust
  gustFrequency:    0.15,     // gusts per second probability
  gustDuration:     { min: 0.8, max: 2.5 },
  directions:       ['N','NE','E','SE','S','SW','W','NW'],
  defaultDir:       'W',
  changeInterval:   30,       // seconds between direction shifts

  // Aerodynamic drag coefficient (Cd) per vehicle
  dragCoefficients: {
    jeep:        0.45,
    motorbike:   0.55,
    truck:       0.70,
    formula:     0.22,
    hovercar:    0.30,
    cybertruck:  0.38,
    hovercraft:  0.60,
    mech_walker: 0.90,
    submarine:   0.35,
    skateboard:  0.80,
    horse_cart:  0.75,
    spaceship:   0.20,
    tank:        0.65,
    rickshaw:    0.70,
    ice_bike:    0.50,
    swamp_buggy: 0.62,
  },

  // Frontal area (m²) per vehicle — used with drag coefficient
  frontalAreas: {
    jeep:        2.5,
    motorbike:   0.9,
    truck:       6.0,
    formula:     1.2,
    hovercar:    2.0,
    cybertruck:  3.0,
    hovercraft:  4.0,
    mech_walker: 4.5,
    submarine:   5.5,
    skateboard:  0.5,
    horse_cart:  3.5,
    spaceship:   2.8,
    tank:        7.0,
    rickshaw:    1.4,
    ice_bike:    0.85,
    swamp_buggy: 3.2,
  },

  airDensity: 1.225,   // kg/m³ at sea level
};

// ============================================================
// WATER_PHYSICS — buoyancy, drag, and wave forces in water
// ============================================================
const WATER_PHYSICS = {
  waterDensity:    1000,   // kg/m³
  gravity:         9.8,
  surfaceTension:  0.072,  // N/m
  waveAmplitude:   12,     // pixels
  waveFrequency:   0.5,    // Hz
  waveSpeed:       60,     // px/s

  // Per-vehicle buoyancy factor (1 = fully buoyant, 0 = sinks immediately)
  buoyancyFactor: {
    jeep:        0.30,
    motorbike:   0.20,
    truck:       0.15,
    formula:     0.10,
    hovercar:    0.55,
    cybertruck:  0.25,
    hovercraft:  0.90,
    mech_walker: 0.05,
    submarine:   1.00,
    skateboard:  0.70,
    horse_cart:  0.40,
    spaceship:   0.35,
    tank:        0.02,
    rickshaw:    0.50,
    ice_bike:    0.28,
    swamp_buggy: 0.45,
  },

  // Water drag multiplier (higher = slows more in water)
  waterDragMultiplier: {
    jeep:        3.5,
    motorbike:   4.0,
    truck:       5.0,
    formula:     5.5,
    hovercar:    2.0,
    cybertruck:  3.8,
    hovercraft:  0.8,
    mech_walker: 6.0,
    submarine:   0.6,
    skateboard:  4.5,
    horse_cart:  4.2,
    spaceship:   2.5,
    tank:        6.5,
    rickshaw:    3.0,
    ice_bike:    3.8,
    swamp_buggy: 2.8,
  },

  underwaterGravityMult: 0.4,   // gravity reduced underwater
  splashThreshold:       80,    // px/s to trigger splash
  foamDuration:          1.2,   // seconds
};

// ============================================================
// MUD_PHYSICS — mud terrain mechanics
// ============================================================
const MUD_PHYSICS = {
  density:         1700,   // kg/m³ wet mud
  viscosity:       50,     // Pa·s
  sinkDepthMax:    0.6,    // fraction of wheel radius

  // Per-vehicle sink depth multiplier
  sinkMultiplier: {
    jeep:        1.0,
    motorbike:   0.7,
    truck:       1.4,
    formula:     1.6,
    hovercar:    0.2,
    cybertruck:  1.1,
    hovercraft:  0.0,
    mech_walker: 0.3,
    submarine:   0.5,
    skateboard:  1.8,
    horse_cart:  1.2,
    spaceship:   0.4,
    tank:        0.8,
    rickshaw:    1.3,
    ice_bike:    0.9,
    swamp_buggy: 0.3,
  },

  // Drag multiplier applied when in mud
  dragMultiplier: {
    jeep:        2.5,
    motorbike:   3.5,
    truck:       2.0,
    formula:     4.5,
    hovercar:    1.2,
    cybertruck:  2.3,
    hovercraft:  1.0,
    mech_walker: 1.5,
    submarine:   2.0,
    skateboard:  5.0,
    horse_cart:  2.8,
    spaceship:   3.0,
    tank:        1.3,
    rickshaw:    3.2,
    ice_bike:    3.0,
    swamp_buggy: 1.1,
  },

  escapeForce:     1500,   // N required to free stuck vehicle
  splashRadius:    40,     // pixels for mud splash VFX
  mudThrowRate:    0.8,    // mud particle emission per meter
};

// ============================================================
// ICE_PHYSICS — ice surface mechanics
// ============================================================
const ICE_PHYSICS = {
  baseFriction:      0.03,   // near-zero kinetic friction
  staticFriction:    0.05,
  edgeGrip:          0.25,   // grip when at very low speed
  slideAngleFactor:  0.85,   // how much lateral force transfers to slide

  // Per-vehicle friction multiplier on ice
  iceFrictionMult: {
    jeep:        1.0,
    motorbike:   1.2,
    truck:       0.8,
    formula:     1.5,
    hovercar:    1.1,
    cybertruck:  0.9,
    hovercraft:  0.4,
    mech_walker: 0.6,
    submarine:   0.7,
    skateboard:  1.4,
    horse_cart:  1.3,
    spaceship:   1.0,
    tank:        0.7,
    rickshaw:    1.2,
    ice_bike:    0.2,
    swamp_buggy: 1.1,
  },

  crackThreshold:    800,    // N impact force to crack ice
  crackPropagation:  60,     // pixels
  meltRate:          0.002,  // fraction per second (vehicle heat)
  snowFlakeRate:     15,     // particles/s at high speed
};

// ============================================================
// SAND_PHYSICS — sand terrain mechanics
// ============================================================
const SAND_PHYSICS = {
  density:           1600,   // kg/m³ dry sand
  softSinkDepth:     0.35,   // fraction of wheel radius
  momentumLoss:      0.65,   // fraction of momentum retained entering sand

  // Per-vehicle sink multiplier in sand
  sandSinkMult: {
    jeep:        1.0,
    motorbike:   0.8,
    truck:       1.3,
    formula:     1.7,
    hovercar:    0.1,
    cybertruck:  1.0,
    hovercraft:  0.0,
    mech_walker: 0.4,
    submarine:   0.6,
    skateboard:  2.0,
    horse_cart:  1.1,
    spaceship:   0.3,
    tank:        0.9,
    rickshaw:    1.4,
    ice_bike:    1.0,
    swamp_buggy: 0.5,
  },

  rollingResistance: {
    jeep:        0.12,
    motorbike:   0.16,
    truck:       0.10,
    formula:     0.20,
    hovercar:    0.03,
    cybertruck:  0.11,
    hovercraft:  0.01,
    mech_walker: 0.08,
    submarine:   0.14,
    skateboard:  0.25,
    horse_cart:  0.14,
    spaceship:   0.06,
    tank:        0.09,
    rickshaw:    0.15,
    ice_bike:    0.13,
    swamp_buggy: 0.06,
  },

  dustEmissionRate:  20,     // particles/s
  dustLiftHeight:    35,     // pixels
  dustColor:         'rgba(210,180,140,',
};

// ============================================================
// GRAVITY_VARIANTS — gravitational acceleration per map type
// ============================================================
const GRAVITY_VARIANTS = {
  moon:    { g: 1.62,  airDensity: 0.0,   desc: 'Lunar surface — low gravity, no atmosphere' },
  mars:    { g: 3.72,  airDensity: 0.02,  desc: 'Martian surface — low gravity, thin atmosphere' },
  earth:   { g: 9.81,  airDensity: 1.225, desc: 'Standard Earth gravity' },
  jupiter: { g: 24.79, airDensity: 1.3,   desc: 'Jovian gravity simulation (cloud layer)' },
  venus:   { g: 8.87,  airDensity: 67.0,  desc: 'Venusian surface — crushing atmosphere' },
  asteroid:{ g: 0.20,  airDensity: 0.0,   desc: 'Micro-gravity asteroid — everything floats' },
};

// ============================================================
// VEHICLE_MASS_TABLE — realistic mass in kg per vehicle
// ============================================================
const VEHICLE_MASS_TABLE = {
  jeep:        1800,
  motorbike:   210,
  truck:       3500,
  formula:     720,
  hovercar:    1200,
  cybertruck:  2900,
  hovercraft:  2200,
  mech_walker: 5500,
  submarine:   15000,
  skateboard:  4,
  horse_cart:  600,
  spaceship:   8000,
  tank:        45000,
  rickshaw:    120,
  ice_bike:    185,
  swamp_buggy: 1400,
};

// ============================================================
// calcAeroDrag — aerodynamic drag force vector (N)
// ============================================================
function calcAeroDrag(vehicleId, vx, vy, windSystem) {
  const ws  = windSystem || WIND_SYSTEM;
  const Cd  = ws.dragCoefficients[vehicleId]  || 0.45;
  const A   = ws.frontalAreas[vehicleId]      || 2.0;
  const rho = ws.airDensity                   || 1.225;

  // Relative velocity (vehicle velocity minus wind velocity)
  const windAngle = (ws.currentAngleRad !== undefined) ? ws.currentAngleRad : Math.PI; // default: wind from west
  const windSpeed = ws.currentSpeed  || ws.defaultSpeed || 8.0;
  const windVx = Math.cos(windAngle) * windSpeed;
  const windVy = Math.sin(windAngle) * windSpeed;

  const relVx = vx - windVx;
  const relVy = vy - windVy;
  const relSpeedSq = relVx * relVx + relVy * relVy;
  const relSpeed   = Math.sqrt(relSpeedSq);

  if (relSpeed < 0.01) return { fx: 0, fy: 0 };

  const forceMag = 0.5 * rho * Cd * A * relSpeedSq;
  return {
    fx: -forceMag * (relVx / relSpeed),
    fy: -forceMag * (relVy / relSpeed),
  };
}

// ============================================================
// calcBuoyancy — buoyancy force (N) on vehicle in water
// ============================================================
function calcBuoyancy(vehicle, waterLevel, vehicleId) {
  const mass     = VEHICLE_MASS_TABLE[vehicleId] || 1000;
  const bFactor  = WATER_PHYSICS.buoyancyFactor[vehicleId] || 0.3;
  const submerge = Math.max(0, Math.min(1, (waterLevel - vehicle.y) / (vehicle.height || 30)));

  const buoyForce  = mass * WATER_PHYSICS.gravity * bFactor * submerge;
  const waterDragX = -(vehicle.vx || 0) * WATER_PHYSICS.waterDragMultiplier[vehicleId] * submerge * 10;
  const waterDragY = -(vehicle.vy || 0) * WATER_PHYSICS.waterDragMultiplier[vehicleId] * submerge * 10;

  return {
    fy:       buoyForce,
    dragX:    waterDragX,
    dragY:    waterDragY,
    submerge: submerge,
  };
}

// ============================================================
// calcSurfaceFriction — friction coefficient for surface+vehicle
// ============================================================
function calcSurfaceFriction(surfaceType, vehicleId, speed) {
  const base = {
    asphalt: 0.85,
    dirt:    0.60,
    grass:   0.45,
    mud:     0.20,
    sand:    0.30,
    ice:     0.04,
    snow:    0.15,
    rock:    0.70,
    water:   0.10,
    metal:   0.55,
    wood:    0.50,
  };

  let mu = base[surfaceType] || 0.50;

  // Vehicle-specific surface adjustments
  const adjustments = {
    ice_bike:    { ice: +0.50, snow: +0.30 },
    swamp_buggy: { mud: +0.40, dirt: +0.20 },
    tank:        { rock: +0.15, asphalt: -0.10 },
    hovercraft:  { water: +0.60, mud: +0.50, ice: +0.40 },
    submarine:   { water: +0.70 },
    formula:     { asphalt: +0.15, dirt: -0.20, mud: -0.30 },
    motorbike:   { asphalt: +0.08, mud: -0.15 },
    skateboard:  { asphalt: +0.12, dirt: -0.25, grass: -0.30 },
  };

  if (adjustments[vehicleId] && adjustments[vehicleId][surfaceType] !== undefined) {
    mu += adjustments[vehicleId][surfaceType];
  }

  // Speed-dependent friction reduction (aquaplaning / heat)
  if (speed > 150) {
    mu *= Math.max(0.5, 1.0 - (speed - 150) / 500);
  }

  return Math.max(0.01, Math.min(1.5, mu));
}

// ============================================================
// applyEnvironmentForces — composite env force application
// ============================================================
function applyEnvironmentForces(vehicle, env, dt) {
  const vehicleId = vehicle.type || 'jeep';
  const mass      = VEHICLE_MASS_TABLE[vehicleId] || 1000;

  // 1. Gravity
  const gravVariant = GRAVITY_VARIANTS[env.gravityType || 'earth'];
  const g = gravVariant ? gravVariant.g : 9.81;
  vehicle.vy = (vehicle.vy || 0) + g * dt;

  // 2. Aerodynamic drag
  if (env.wind) {
    const drag = calcAeroDrag(vehicleId, vehicle.vx || 0, vehicle.vy || 0, env.wind);
    vehicle.vx = (vehicle.vx || 0) + (drag.fx / mass) * dt;
    vehicle.vy = (vehicle.vy || 0) + (drag.fy / mass) * dt;
  }

  // 3. Buoyancy (if in water)
  if (env.waterLevel !== undefined && vehicle.y >= env.waterLevel - 20) {
    const buoy = calcBuoyancy(vehicle, env.waterLevel, vehicleId);
    vehicle.vy = (vehicle.vy || 0) - (buoy.fy / mass) * dt;
    vehicle.vx = (vehicle.vx || 0) + (buoy.dragX / mass) * dt;
    vehicle.vy = (vehicle.vy || 0) + (buoy.dragY / mass) * dt;
    vehicle._submerge = buoy.submerge;
  }

  // 4. Surface friction
  if (vehicle.onGround && env.surface) {
    const speed = Math.sqrt((vehicle.vx||0)**2 + (vehicle.vy||0)**2);
    const mu    = calcSurfaceFriction(env.surface, vehicleId, speed);
    const frictionDecel = mu * g * dt;
    const spd   = Math.max(0.001, speed);
    const fx    = -(vehicle.vx / spd) * frictionDecel;
    const fy    = -(vehicle.vy / spd) * frictionDecel;
    vehicle.vx  = (vehicle.vx||0) + fx;
    vehicle.vy  = (vehicle.vy||0) + fy;
  }

  // 5. Mud sink force
  if (env.surface === 'mud') {
    const sinkMult = MUD_PHYSICS.sinkMultiplier[vehicleId] || 1.0;
    const mudDrag  = MUD_PHYSICS.dragMultiplier[vehicleId] || 2.5;
    vehicle.vx = (vehicle.vx||0) * (1 - mudDrag * dt * 0.1 * sinkMult);
    vehicle.vy = (vehicle.vy||0) * (1 - mudDrag * dt * 0.05 * sinkMult);
  }

  // 6. Sand momentum loss
  if (env.surface === 'sand') {
    const sandSink = SAND_PHYSICS.sandSinkMult[vehicleId] || 1.0;
    const rr       = SAND_PHYSICS.rollingResistance[vehicleId] || 0.15;
    vehicle.vx = (vehicle.vx||0) * (1 - rr * sandSink * dt);
  }

  return vehicle;
}

// ============================================================
// CRASH_DETECTION — collision and deformation parameters
// ============================================================
const CRASH_DETECTION = {
  // Velocity thresholds for crash severity
  minorCrashVelocity:    200,   // px/s
  moderateCrashVelocity: 500,
  severeCrashVelocity:   900,
  catastrophicVelocity:  1400,

  // Damage multiplier per vehicle
  crashDamageMultiplier: {
    jeep:        1.0,
    motorbike:   1.8,
    truck:       0.6,
    formula:     2.2,
    hovercar:    1.3,
    cybertruck:  0.5,
    hovercraft:  1.5,
    mech_walker: 0.4,
    submarine:   0.7,
    skateboard:  3.0,
    horse_cart:  1.6,
    spaceship:   2.0,
    tank:        0.2,
    rickshaw:    2.5,
    ice_bike:    1.7,
    swamp_buggy: 0.8,
  },

  // Deformation visual thresholds (damage level 0-1)
  deformationStages: {
    scratch:    0.05,
    dented:     0.20,
    crumpled:   0.45,
    destroyed:  0.80,
  },

  // Rebound coefficient (bounciness)
  reboundCoeff: {
    jeep:        0.25,
    motorbike:   0.35,
    truck:       0.15,
    formula:     0.40,
    hovercar:    0.30,
    cybertruck:  0.20,
    hovercraft:  0.28,
    mech_walker: 0.10,
    submarine:   0.18,
    skateboard:  0.50,
    horse_cart:  0.22,
    spaceship:   0.32,
    tank:        0.08,
    rickshaw:    0.38,
    ice_bike:    0.33,
    swamp_buggy: 0.20,
  },

  rolloverAngle:     1.2,    // radians — vehicle considered rolled over
  crashParticles:    35,
  sparksPerCrash:    20,
  debrisCount:       12,
};

// ============================================================
// TIRE_WEAR_MODEL — tire degradation simulation
// ============================================================
const TIRE_WEAR_MODEL = {
  // Wear rate per meter on each surface (fraction of tire life used)
  wearRatePerMeter: {
    asphalt: 0.000010,
    dirt:    0.000018,
    grass:   0.000012,
    mud:     0.000025,
    sand:    0.000022,
    ice:     0.000005,
    snow:    0.000008,
    rock:    0.000040,
    water:   0.000003,
    metal:   0.000015,
    wood:    0.000012,
  },

  // Slip-induced additional wear (multiplied by slip ratio)
  slipWearMultiplier: 8.0,

  // Grip degradation curve (wear 0-1 → grip multiplier)
  gripAtWear: [
    { wear: 0.00, grip: 1.00 },
    { wear: 0.20, grip: 0.98 },
    { wear: 0.40, grip: 0.92 },
    { wear: 0.60, grip: 0.80 },
    { wear: 0.75, grip: 0.65 },
    { wear: 0.90, grip: 0.40 },
    { wear: 1.00, grip: 0.15 },
  ],

  // Per-vehicle tire durability multiplier
  durabilityMult: {
    jeep:        1.0,
    motorbike:   0.8,
    truck:       1.4,
    formula:     0.6,
    hovercar:    1.1,
    cybertruck:  1.2,
    hovercraft:  0.0,
    mech_walker: 0.9,
    submarine:   0.0,
    skateboard:  0.5,
    horse_cart:  1.3,
    spaceship:   0.7,
    tank:        1.8,
    rickshaw:    0.75,
    ice_bike:    0.85,
    swamp_buggy: 1.5,
  },

  getTireGrip(wear) {
    const curve = TIRE_WEAR_MODEL.gripAtWear;
    for (let i = 1; i < curve.length; i++) {
      if (wear <= curve[i].wear) {
        const t = (wear - curve[i-1].wear) / (curve[i].wear - curve[i-1].wear);
        return curve[i-1].grip + t * (curve[i].grip - curve[i-1].grip);
      }
    }
    return 0.15;
  },
};

// ============================================================
// ENGINE_HEAT_MODEL — engine temperature management
// ============================================================
const ENGINE_HEAT_MODEL = {
  ambientTemp:       25,    // degrees C
  idleHeatRate:      0.8,   // °C/s at idle
  maxHeatRate:       8.0,   // °C/s at full throttle
  cooldownRate:      3.5,   // °C/s when throttle off
  overheatThreshold: 110,   // °C
  seizureThreshold:  145,   // °C — engine fails

  // Power loss curve when hot (temp over overheatThreshold → power fraction)
  powerLossAtTemp: [
    { temp: 110, power: 1.00 },
    { temp: 120, power: 0.90 },
    { temp: 130, power: 0.72 },
    { temp: 140, power: 0.45 },
    { temp: 145, power: 0.10 },
  ],

  // Per-vehicle thermal capacity (higher = heats up slower)
  thermalCapacity: {
    jeep:        180,
    motorbike:   90,
    truck:       280,
    formula:     60,
    hovercar:    140,
    cybertruck:  200,
    hovercraft:  160,
    mech_walker: 350,
    submarine:   400,
    skateboard:  0,
    horse_cart:  120,
    spaceship:   80,
    tank:        500,
    rickshaw:    70,
    ice_bike:    85,
    swamp_buggy: 190,
  },

  getEnginePower(vehicleId, engineTemp) {
    if (engineTemp < ENGINE_HEAT_MODEL.overheatThreshold) return 1.0;
    const curve = ENGINE_HEAT_MODEL.powerLossAtTemp;
    for (let i = 1; i < curve.length; i++) {
      if (engineTemp <= curve[i].temp) {
        const t = (engineTemp - curve[i-1].temp) / (curve[i].temp - curve[i-1].temp);
        return curve[i-1].power + t * (curve[i].power - curve[i-1].power);
      }
    }
    return 0.05;
  },
};

// ============================================================
// SUSPENSION_LIMITS — per-vehicle suspension travel limits
// ============================================================
const SUSPENSION_LIMITS = {
  jeep:        { minTravel: -40, maxTravel: 60, springK: 18000, dampC: 1800 },
  motorbike:   { minTravel: -30, maxTravel: 50, springK: 12000, dampC: 1200 },
  truck:       { minTravel: -55, maxTravel: 90, springK: 28000, dampC: 2800 },
  formula:     { minTravel: -20, maxTravel: 30, springK: 40000, dampC: 3500 },
  hovercar:    { minTravel: -35, maxTravel: 55, springK: 15000, dampC: 1500 },
  cybertruck:  { minTravel: -45, maxTravel: 70, springK: 22000, dampC: 2200 },
  hovercraft:  { minTravel:   0, maxTravel:  0, springK:  5000, dampC:  500 },
  mech_walker: { minTravel: -25, maxTravel: 80, springK: 35000, dampC: 4000 },
  submarine:   { minTravel: -10, maxTravel: 20, springK:  8000, dampC:  900 },
  skateboard:  { minTravel:  -8, maxTravel: 12, springK:  6000, dampC:  400 },
  horse_cart:  { minTravel: -30, maxTravel: 55, springK: 10000, dampC: 1000 },
  spaceship:   { minTravel: -15, maxTravel: 25, springK: 20000, dampC: 1600 },
  tank:        { minTravel: -20, maxTravel: 35, springK: 50000, dampC: 5000 },
  rickshaw:    { minTravel: -25, maxTravel: 40, springK:  9000, dampC:  900 },
  ice_bike:    { minTravel: -28, maxTravel: 45, springK: 11000, dampC: 1100 },
  swamp_buggy: { minTravel: -50, maxTravel: 80, springK: 20000, dampC: 2000 },
};

// ============================================================
// calcWheelSlip — compute slip ratio for a wheel
// ============================================================
function calcWheelSlip(wheel, vehicle, surface) {
  const vehicleId = vehicle.type || 'jeep';
  const vx     = vehicle.vx || 0;
  const vy     = vehicle.vy || 0;
  const speed  = Math.sqrt(vx * vx + vy * vy);
  const omega  = wheel.angularVelocity || 0;
  const r      = wheel.radius || 14;
  const tipSpeed = omega * r;

  let slip;
  if (speed < 0.5) {
    slip = tipSpeed > 1 ? 1.0 : 0.0;
  } else {
    slip = (tipSpeed - speed) / Math.max(speed, tipSpeed, 0.5);
  }

  // Clamp to [-1, 1]
  slip = Math.max(-1.0, Math.min(1.0, slip));

  // Surface modifier
  const mu = calcSurfaceFriction(surface || 'asphalt', vehicleId, speed);

  return {
    slipRatio:       slip,
    lateralForce:    slip * mu * (VEHICLE_MASS_TABLE[vehicleId] || 1000) * 0.3,
    longitudinalForce: slip * mu * (VEHICLE_MASS_TABLE[vehicleId] || 1000) * 0.7,
    isSpinning:      Math.abs(slip) > 0.3,
  };
}

// ============================================================
// GEAR_RATIOS — transmission gear ratios per vehicle
// ============================================================
const GEAR_RATIOS = {
  jeep:        { final: 3.73, gears: [0, 4.46, 2.61, 1.72, 1.25, 1.00, 0.84], reverse: -4.46 },
  motorbike:   { final: 3.10, gears: [0, 2.85, 1.95, 1.43, 1.10, 0.89, 0.75], reverse: 0 },
  truck:       { final: 4.10, gears: [0, 5.62, 3.36, 2.04, 1.38, 1.00, 0.79, 0.65], reverse: -5.62 },
  formula:     { final: 3.07, gears: [0, 2.83, 2.00, 1.55, 1.22, 0.97, 0.82, 0.73], reverse: 0 },
  hovercar:    { final: 3.20, gears: [0, 3.50, 2.30, 1.65, 1.25, 1.00, 0.80], reverse: -3.50 },
  cybertruck:  { final: 1.00, gears: [0, 1.00], reverse: -1.00 },   // single-speed EV
  hovercraft:  { final: 2.80, gears: [0, 3.00, 2.00, 1.40], reverse: -3.00 },
  mech_walker: { final: 5.00, gears: [0, 6.00, 4.00, 2.80, 2.00], reverse: -6.00 },
  submarine:   { final: 4.50, gears: [0, 4.00, 2.80], reverse: -4.00 },
  skateboard:  { final: 1.00, gears: [0, 1.00], reverse: 0 },       // no gears
  horse_cart:  { final: 4.00, gears: [0, 5.00, 3.20, 2.00], reverse: -5.00 },
  spaceship:   { final: 1.50, gears: [0, 1.80, 1.40, 1.10, 0.90, 0.75, 0.62], reverse: -1.80 },
  tank:        { final: 6.50, gears: [0, 7.00, 5.00, 3.50, 2.50, 1.80], reverse: -7.00 },
  rickshaw:    { final: 3.50, gears: [0, 3.80, 2.50, 1.80], reverse: -3.80 },
  ice_bike:    { final: 3.00, gears: [0, 3.20, 2.10, 1.55, 1.20, 0.95], reverse: 0 },
  swamp_buggy: { final: 4.20, gears: [0, 5.00, 3.30, 2.20, 1.60, 1.25], reverse: -5.00 },
};

// ============================================================
// calcEngineTorqueAtRPM — engine torque output at given RPM
// ============================================================
function calcEngineTorqueAtRPM(vehicleId, rpm, gear) {
  // Torque curves defined as [rpm, torqueNm] breakpoints
  const torqueCurves = {
    jeep:        [[0,180],[1000,250],[2500,320],[3500,340],[4500,310],[5500,260],[6500,180]],
    motorbike:   [[0,60], [2000,90], [4000,130],[6000,150],[8000,140],[10000,110],[12000,70]],
    truck:       [[0,400],[800,600],[1500,800],[2500,820],[3500,760],[4500,650],[5500,480]],
    formula:     [[0,150],[3000,280],[5000,350],[7000,420],[9000,400],[11000,340],[13000,250]],
    hovercar:    [[0,200],[1500,280],[3000,340],[5000,360],[7000,320],[9000,250],[11000,160]],
    cybertruck:  [[0,900],[100,900],[500,900],[2000,900],[6000,600],[8000,400],[10000,200]],
    hovercraft:  [[0,120],[1000,160],[2500,200],[4000,210],[5500,190],[7000,150]],
    mech_walker: [[0,800],[500,1000],[1000,1100],[2000,1050],[3000,950],[4000,750]],
    submarine:   [[0,300],[500,380],[1000,400],[1500,380],[2000,320],[2500,230]],
    skateboard:  [[0,0],[100,0],[500,0]],
    horse_cart:  [[0,100],[200,140],[500,160],[800,150],[1000,120],[1200,80]],
    spaceship:   [[0,500],[1000,800],[3000,1200],[6000,1500],[9000,1400],[12000,1000]],
    tank:        [[0,1200],[300,1600],[800,1800],[1500,1750],[2000,1600],[2500,1200]],
    rickshaw:    [[0,40],[1000,65],[2500,80],[4000,85],[5500,75],[7000,50]],
    ice_bike:    [[0,55],[2000,85],[4500,120],[7000,135],[9000,120],[11000,85]],
    swamp_buggy: [[0,220],[1000,300],[2500,380],[4000,395],[5000,360],[6000,280]],
  };

  const curve = torqueCurves[vehicleId] || torqueCurves.jeep;
  const clampedRPM = Math.max(0, rpm);

  // Interpolate torque from curve
  let torque = curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (clampedRPM <= curve[i][0]) {
      const t  = (clampedRPM - curve[i-1][0]) / (curve[i][0] - curve[i-1][0]);
      torque   = curve[i-1][1] + t * (curve[i][1] - curve[i-1][1]);
      break;
    }
    torque = curve[i][1];
  }

  // Multiply by gear ratio for wheel torque
  const gearData   = GEAR_RATIOS[vehicleId] || GEAR_RATIOS.jeep;
  const gearIdx    = Math.max(1, Math.min(gear || 1, gearData.gears.length - 1));
  const gearRatio  = gearData.gears[gearIdx] || 1.0;
  const finalRatio = gearData.final || 3.5;

  return torque * gearRatio * finalRatio;
}


// ============================================================
// TERRAIN_TRANSITION — blending parameters between surfaces
// ============================================================
const TERRAIN_TRANSITION = {
  blendDistance:   80,     // pixels over which surface properties blend
  decelOnEntry: {          // speed fraction applied entering each surface
    mud:    0.80,
    sand:   0.88,
    water:  0.70,
    ice:    1.00,   // no entry deceleration on ice
    snow:   0.92,
    grass:  0.95,
    rock:   0.97,
    asphalt:1.00,
  },
  visualEffectDelay: 0.1,  // seconds before surface VFX activates
};

// ============================================================
// SLOPE_PHYSICS — slope angle effects on vehicle dynamics
// ============================================================
const SLOPE_PHYSICS = {
  // Maximum climbable angle per vehicle (radians)
  maxClimbAngle: {
    jeep:        0.65,
    motorbike:   0.70,
    truck:       0.55,
    formula:     0.30,
    hovercar:    0.50,
    cybertruck:  0.60,
    hovercraft:  0.20,
    mech_walker: 1.20,
    submarine:   0.15,
    skateboard:  0.45,
    horse_cart:  0.50,
    spaceship:   0.80,
    tank:        0.75,
    rickshaw:    0.55,
    ice_bike:    0.62,
    swamp_buggy: 0.68,
  },

  // Gravity component along slope: g * sin(angle)
  calcSlopeForce(angle, vehicleId) {
    const mass = VEHICLE_MASS_TABLE[vehicleId] || 1000;
    const g    = 9.81;
    return mass * g * Math.sin(angle);
  },

  // Whether vehicle can hold position on slope (static friction)
  canHoldSlope(angle, vehicleId, surface) {
    const mu = calcSurfaceFriction(surface || 'asphalt', vehicleId, 0);
    return Math.tan(angle) <= mu;
  },

  // Rolling downhill acceleration (m/s² on slope ignoring engine)
  rollAcceleration(angle, vehicleId, surface) {
    const mu = calcSurfaceFriction(surface || 'asphalt', vehicleId, 10);
    const g  = 9.81;
    return g * (Math.sin(angle) - mu * Math.cos(angle));
  },
};

// ============================================================
// JUMP_PHYSICS — airborne vehicle dynamics
// ============================================================
const JUMP_PHYSICS = {
  // Per-vehicle air control authority (0-1)
  airControl: {
    jeep:        0.40,
    motorbike:   0.70,
    truck:       0.20,
    formula:     0.45,
    hovercar:    0.85,
    cybertruck:  0.35,
    hovercraft:  1.00,
    mech_walker: 0.15,
    submarine:   0.05,
    skateboard:  0.80,
    horse_cart:  0.25,
    spaceship:   1.20,
    tank:        0.08,
    rickshaw:    0.50,
    ice_bike:    0.65,
    swamp_buggy: 0.38,
  },

  // Rotational inertia multiplier (higher = harder to flip)
  rotationalInertia: {
    jeep:        1.0,
    motorbike:   0.5,
    truck:       2.5,
    formula:     0.7,
    hovercar:    0.9,
    cybertruck:  1.8,
    hovercraft:  1.6,
    mech_walker: 3.0,
    submarine:   4.0,
    skateboard:  0.2,
    horse_cart:  1.4,
    spaceship:   0.6,
    tank:        5.0,
    rickshaw:    0.55,
    ice_bike:    0.45,
    swamp_buggy: 1.2,
  },

  // Landing impact damage threshold (m/s vertical velocity)
  landingDamageThreshold: {
    jeep:        8.0,
    motorbike:   6.0,
    truck:       12.0,
    formula:     5.0,
    hovercar:    7.0,
    cybertruck:  10.0,
    hovercraft:  9.0,
    mech_walker: 14.0,
    submarine:   6.0,
    skateboard:  4.0,
    horse_cart:  7.0,
    spaceship:   8.0,
    tank:        20.0,
    rickshaw:    5.5,
    ice_bike:    6.5,
    swamp_buggy: 9.0,
  },
};

// ============================================================
// FUEL_CONSUMPTION — fuel burn model per vehicle
// ============================================================
const FUEL_CONSUMPTION = {
  // Litres per 100km at cruise speed
  baseConsumption: {
    jeep:        14.0,
    motorbike:    5.5,
    truck:       28.0,
    formula:     40.0,
    hovercar:    18.0,
    cybertruck:   0.0,   // electric — uses energy (kWh)
    hovercraft:  22.0,
    mech_walker: 35.0,
    submarine:   30.0,
    skateboard:   0.0,
    horse_cart:   0.0,
    spaceship:   80.0,
    tank:        60.0,
    rickshaw:     4.0,
    ice_bike:     6.0,
    swamp_buggy: 18.0,
  },

  // Multiplier at full throttle vs cruise
  fullThrottleMult: 2.4,
  // Multiplier when idle
  idleMult:         0.15,
  // Electric vehicles use kWh/100km instead
  electricConsumption: {
    cybertruck: 25.0,   // kWh/100km
  },

  // Tank capacity in litres (or kWh for EVs)
  tankCapacity: {
    jeep:         65,
    motorbike:    18,
    truck:       150,
    formula:      80,
    hovercar:     70,
    cybertruck:  100,   // kWh battery
    hovercraft:   90,
    mech_walker: 200,
    submarine:   500,
    skateboard:    0,
    horse_cart:    0,
    spaceship:   300,
    tank:        800,
    rickshaw:     10,
    ice_bike:     16,
    swamp_buggy:  75,
  },

  calcBurnRate(vehicleId, throttle, speed) {
    // BUGFIX(21 Tmz): `|| 15` truthy zinciriydi → baseConsumption'ı 0 olan elektrikli/
    // motorsuz araçlar (cybertruck, skateboard, horse_cart) 15 L/100km yakıyordu.
    // Artık yalnız TABLODA OLMAYAN araç 15 varsayılır; açıkça 0 yazan 0 kalır.
    const bc = FUEL_CONSUMPTION.baseConsumption[vehicleId];
    const base = bc !== undefined ? bc : 15;
    const thMult = 1 + (FUEL_CONSUMPTION.fullThrottleMult - 1) * throttle;
    // Convert L/100km to L/s given speed in px/s (assume 10px = 1m, 1000m = 1km)
    const kmPerSec = speed / 10000;
    return base * thMult * kmPerSec / 100;
  },
};

// ============================================================
// NITRO_BOOST_SYSTEM — nitrous oxide boost parameters
// ============================================================
const NITRO_BOOST_SYSTEM = {
  boostForce:       2500,   // N additional thrust
  boostDuration:    3.0,    // seconds per bottle
  bottleCapacity:   3,      // max bottles
  refillTime:       15.0,   // seconds to refill 1 bottle
  activationDelay:  0.1,    // seconds lag before force applies
  deactivateGracePeriod: 0.2,

  // Per-vehicle boost multiplier (some handle it better)
  boostMult: {
    jeep:        1.0,
    motorbike:   1.3,
    truck:       0.7,
    formula:     1.5,
    hovercar:    1.2,
    cybertruck:  1.0,
    hovercraft:  1.1,
    mech_walker: 0.6,
    submarine:   0.4,
    skateboard:  1.8,
    horse_cart:  0.5,
    spaceship:   0.8,
    tank:        0.4,
    rickshaw:    1.4,
    ice_bike:    1.3,
    swamp_buggy: 0.9,
  },

  exhaustColor: '#ffaa00',
  particleCount:    25,
  particleSpeed: [200, 400],
  soundPitch:    1.8,
};

// ============================================================
// IMPACT_RESPONSE — physics response to collisions
// ============================================================
const IMPACT_RESPONSE = {
  // Coefficient of restitution (bounciness) for object types
  restitution: {
    rock:      0.40,
    tree:      0.25,
    barrel:    0.55,
    wall:      0.50,
    vehicle:   0.30,
    ground:    0.20,
    water:     0.10,
    mud:       0.05,
    ramp:      0.60,
    spring:    0.90,
  },

  // Friction during collision (affects tangential velocity retention)
  collisionFriction: {
    rock:   0.70,
    tree:   0.55,
    barrel: 0.40,
    wall:   0.80,
    ramp:   0.35,
    ground: 0.60,
  },

  // Impulse transfer ratio when vehicles collide
  vehicleImpulseRatio: 0.6,

  // Calculate impulse magnitude from relative velocity
  calcImpulseMag(relVelocity, combinedMass, restitution) {
    return -(1 + restitution) * relVelocity * combinedMass * 0.5;
  },
};

// ============================================================
// WEATHER_PHYSICS — weather effects on vehicle physics
// ============================================================
const WEATHER_PHYSICS = {
  rain: {
    surfaceFrictionMult: 0.75,
    visibilityReduction: 0.40,
    enginePowerMult:     1.00,
    windGustBonus:       1.30,
    puddleFormRate:      0.02,  // puddles per second per m²
  },
  snow: {
    surfaceFrictionMult: 0.55,
    visibilityReduction: 0.60,
    enginePowerMult:     0.95,
    driftFactor:         1.50,
    snowAccumRate:       0.005, // cm/s
  },
  fog: {
    surfaceFrictionMult: 1.00,
    visibilityReduction: 0.70,
    enginePowerMult:     1.00,
    windGustBonus:       0.80,
  },
  storm: {
    surfaceFrictionMult: 0.65,
    visibilityReduction: 0.50,
    enginePowerMult:     0.90,
    windGustBonus:       2.50,
    lightningStrikeProb: 0.001, // per second
  },
  heatwave: {
    surfaceFrictionMult: 0.92,
    visibilityReduction: 0.10,
    enginePowerMult:     0.88,  // engine heat issues
    tireDegradationMult: 1.40,
  },
  blizzard: {
    surfaceFrictionMult: 0.30,
    visibilityReduction: 0.85,
    enginePowerMult:     0.80,
    windGustBonus:       3.00,
    driftFactor:         2.20,
  },

  apply(vehicle, weatherType, dt) {
    const w = WEATHER_PHYSICS[weatherType];
    if (!w) return;
    if (w.surfaceFrictionMult) {
      vehicle._weatherFrictionMult = w.surfaceFrictionMult;
    }
    if (w.enginePowerMult) {
      vehicle._weatherEngineMult = w.enginePowerMult;
    }
  },
};

// ============================================================
// calcRPMFromSpeed — estimate engine RPM from vehicle speed
// ============================================================
function calcRPMFromSpeed(vehicleId, speed, gear) {
  const gearData  = GEAR_RATIOS[vehicleId]  || GEAR_RATIOS.jeep;
  const gearIdx   = Math.max(1, Math.min(gear || 1, gearData.gears.length - 1));
  const gearRatio = gearData.gears[gearIdx] || 1.0;
  const final     = gearData.final          || 3.73;
  // Assume typical wheel circumference 2m
  const wheelCirc = 2.0; // metres
  const wheelRPS  = speed / wheelCirc;
  return wheelRPS * gearRatio * final * 60; // RPM
}

// ============================================================
// selectGear — choose optimal gear for current RPM/speed
// ============================================================
function selectGear(vehicleId, currentRPM, speed, throttle) {
  const gearData = GEAR_RATIOS[vehicleId] || GEAR_RATIOS.jeep;
  const numGears = gearData.gears.length - 1;
  const shiftUpRPM   = 5500;
  const shiftDownRPM = 2000;

  let gear = 1;
  for (let g = 1; g <= numGears; g++) {
    const rpmAtGear = calcRPMFromSpeed(vehicleId, speed, g);
    if (rpmAtGear < shiftUpRPM) {
      gear = g;
    }
  }

  // Don't downshift if RPM would spike over redline
  const projRPM = calcRPMFromSpeed(vehicleId, speed, Math.max(1, gear - 1));
  if (projRPM > shiftUpRPM * 1.1) gear = Math.min(gear, numGears);

  return Math.max(1, Math.min(gear, numGears));
}

// ============================================================
// COLLISION_GROUPS — which object types interact with what
// ============================================================
const COLLISION_GROUPS = {
  vehicle:  { collidesWith: ['terrain','obstacle','vehicle','pickup','water'] },
  terrain:  { collidesWith: [] },
  obstacle: { collidesWith: ['vehicle','obstacle'] },
  pickup:   { collidesWith: ['vehicle'] },
  water:    { collidesWith: ['vehicle'] },
  particle: { collidesWith: [] },
  trigger:  { collidesWith: ['vehicle'] },

  canCollide(typeA, typeB) {
    const groupA = COLLISION_GROUPS[typeA];
    return groupA ? groupA.collidesWith.includes(typeB) : false;
  },
};

// ============================================================
// PHYSICS_DEBUG_FLAGS — toggles for physics debug visualisation
// ============================================================
const PHYSICS_DEBUG_FLAGS = {
  showForceVectors:      false,
  showContactNormals:    false,
  showBoundingBoxes:     false,
  showWheelSlip:         false,
  showSuspensionTravel:  false,
  showAirborne:          false,
  showSurfaceType:       false,
  showWindVector:        false,
  showEngineTemp:        false,
  showTireWear:          false,
  logCrashEvents:        false,
  forceVectorScale:      0.005,   // multiplier for display
  normalLineLength:      30,
};


// ============================================================
// VEHICLE_TORQUE_CURVES_EXTENDED — expanded torque data tables
// ============================================================
const VEHICLE_TORQUE_CURVES_EXTENDED = {
  // Full torque-vs-RPM lookup tables (25 breakpoints each)
  jeep: [
    [0,130],[400,165],[800,200],[1200,235],[1600,265],[2000,290],
    [2400,310],[2800,325],[3200,338],[3600,342],[4000,340],[4400,334],
    [4800,324],[5200,310],[5600,292],[6000,270],[6400,244],[6800,215],
    [7200,184],[7600,152],[8000,120],[8400,92],[8800,68],[9200,48],[9600,30],
  ],
  motorbike: [
    [0,45],[500,55],[1000,68],[1500,80],[2000,90],[2500,100],
    [3000,110],[3500,120],[4000,130],[4500,138],[5000,145],[5500,150],
    [6000,152],[6500,150],[7000,145],[7500,137],[8000,126],[8500,113],
    [9000,99],[9500,84],[10000,70],[10500,56],[11000,44],[11500,33],[12000,24],
  ],
  truck: [
    [0,320],[300,400],[600,490],[900,570],[1200,640],[1500,700],
    [1800,745],[2100,778],[2400,800],[2700,812],[3000,815],[3300,808],
    [3600,795],[3900,775],[4200,748],[4500,715],[4800,676],[5100,632],
    [5400,584],[5700,533],[6000,480],[6300,425],[6600,368],[6900,312],[7200,256],
  ],
  formula: [
    [0,120],[1000,155],[2000,198],[3000,242],[4000,286],[5000,324],
    [6000,356],[7000,382],[8000,400],[9000,412],[10000,418],[11000,416],
    [12000,408],[13000,394],[14000,374],[15000,348],[16000,316],[17000,280],
    [18000,240],[19000,196],[20000,150],[21000,104],[22000,60],[23000,20],[24000,0],
  ],
  tank: [
    [0,900],[200,1100],[400,1300],[600,1500],[800,1680],[1000,1800],
    [1200,1870],[1400,1900],[1600,1900],[1800,1880],[2000,1845],[2200,1800],
    [2400,1744],[2600,1680],[2800,1608],[3000,1530],[3200,1446],[3400,1356],
    [3600,1262],[3800,1164],[4000,1064],[4200,962],[4400,860],[4600,758],[4800,656],
  ],
};

// ============================================================
// AERODYNAMIC_DOWNFORCE — downforce tables per vehicle
// ============================================================
const AERODYNAMIC_DOWNFORCE = {
  // Downforce (N) at various speeds (km/h)
  // Higher downforce = better cornering at speed, heavier effective mass
  jeep: [
    { speed: 0,   force: 0 },   { speed: 50,  force: 80 },
    { speed: 100, force: 320 }, { speed: 150, force: 720 },
    { speed: 200, force: 1280 },
  ],
  motorbike: [
    { speed: 0,   force: 0 },   { speed: 50,  force: 40 },
    { speed: 100, force: 160 }, { speed: 150, force: 360 },
    { speed: 200, force: 640 }, { speed: 250, force: 1000 },
  ],
  formula: [
    { speed: 0,   force: 0 },    { speed: 50,  force: 500 },
    { speed: 100, force: 2000 }, { speed: 150, force: 4500 },
    { speed: 200, force: 8000 }, { speed: 250, force: 12500 },
    { speed: 300, force: 18000 },
  ],
  truck: [
    { speed: 0,   force: 0 },   { speed: 50,  force: 150 },
    { speed: 100, force: 600 }, { speed: 150, force: 1350 },
  ],
  spaceship: [
    { speed: 0,   force: -500 }, // negative = lift (wants to fly)
    { speed: 100, force: -200 },
    { speed: 200, force: 0 },
    { speed: 300, force: 500 },
  ],

  getDownforce(vehicleId, speedKmH) {
    const table = AERODYNAMIC_DOWNFORCE[vehicleId];
    if (!table || !Array.isArray(table)) return 0;
    for (let i = 1; i < table.length; i++) {
      if (speedKmH <= table[i].speed) {
        const t = (speedKmH - table[i-1].speed) / (table[i].speed - table[i-1].speed);
        return table[i-1].force + t * (table[i].force - table[i-1].force);
      }
    }
    return table[table.length - 1].force;
  },
};

// ============================================================
// SPRING_DAMPER_SIM — spring/damper physics for suspension
// ============================================================
const SPRING_DAMPER_SIM = {
  // Simulate one spring-damper step; returns new extension and velocity
  step(extension, velocity, naturalLength, springK, dampC, externalForce, mass, dt) {
    const springForce = -springK * (extension - naturalLength);
    const dampForce   = -dampC   * velocity;
    const totalForce  = springForce + dampForce + externalForce;
    const accel       = totalForce / mass;
    const newVel      = velocity  + accel  * dt;
    const newExt      = extension + newVel * dt;
    return { extension: newExt, velocity: newVel, force: totalForce };
  },

  // Critical damping coefficient for a given spring and mass
  criticalDamping(springK, mass) {
    return 2 * Math.sqrt(springK * mass);
  },

  // Damping ratio (1 = critically damped, <1 = oscillates, >1 = overdamped)
  dampingRatio(dampC, springK, mass) {
    return dampC / (2 * Math.sqrt(springK * mass));
  },

  // Natural frequency (Hz)
  naturalFreq(springK, mass) {
    return Math.sqrt(springK / mass) / (2 * Math.PI);
  },
};

// ============================================================
// TRACK_SURFACE_MAP — track segment surface type definitions
// ============================================================
const TRACK_SURFACE_MAP = {
  // Each entry: [fromKm, toKm, surfaceType, slope, width]
  default_track: [
    { from: 0,    to: 0.5,  surface: 'asphalt', slope: 0.0,  width: 80 },
    { from: 0.5,  to: 1.0,  surface: 'dirt',    slope: 0.15, width: 70 },
    { from: 1.0,  to: 1.5,  surface: 'rock',    slope: 0.30, width: 60 },
    { from: 1.5,  to: 2.0,  surface: 'mud',     slope: 0.10, width: 55 },
    { from: 2.0,  to: 2.5,  surface: 'asphalt', slope: -0.20,width: 80 },
    { from: 2.5,  to: 3.0,  surface: 'grass',   slope: 0.05, width: 90 },
    { from: 3.0,  to: 3.5,  surface: 'sand',    slope: 0.08, width: 75 },
    { from: 3.5,  to: 4.0,  surface: 'rock',    slope: 0.25, width: 60 },
    { from: 4.0,  to: 4.5,  surface: 'asphalt', slope: 0.0,  width: 80 },
    { from: 4.5,  to: 5.0,  surface: 'mud',     slope: 0.12, width: 65 },
  ],
  arctic_track: [
    { from: 0,    to: 1.0,  surface: 'ice',  slope: 0.0,  width: 80 },
    { from: 1.0,  to: 2.0,  surface: 'snow', slope: 0.20, width: 70 },
    { from: 2.0,  to: 3.0,  surface: 'ice',  slope: -0.10,width: 90 },
    { from: 3.0,  to: 4.0,  surface: 'snow', slope: 0.15, width: 75 },
    { from: 4.0,  to: 5.0,  surface: 'ice',  slope: 0.0,  width: 80 },
  ],
  swamp_track: [
    { from: 0,    to: 0.8,  surface: 'mud',   slope: 0.05, width: 70 },
    { from: 0.8,  to: 1.6,  surface: 'water', slope: 0.0,  width: 60 },
    { from: 1.6,  to: 2.4,  surface: 'mud',   slope: 0.10, width: 65 },
    { from: 2.4,  to: 3.2,  surface: 'grass', slope: 0.05, width: 80 },
    { from: 3.2,  to: 4.0,  surface: 'mud',   slope: 0.08, width: 70 },
    { from: 4.0,  to: 5.0,  surface: 'water', slope: -0.05,width: 60 },
  ],
  desert_track: [
    { from: 0,    to: 1.0,  surface: 'sand',   slope: 0.0,  width: 90 },
    { from: 1.0,  to: 2.0,  surface: 'rock',   slope: 0.25, width: 60 },
    { from: 2.0,  to: 3.0,  surface: 'sand',   slope: -0.15,width: 85 },
    { from: 3.0,  to: 4.0,  surface: 'asphalt',slope: 0.0,  width: 70 },
    { from: 4.0,  to: 5.0,  surface: 'sand',   slope: 0.10, width: 80 },
  ],
  moon_track: [
    { from: 0,    to: 5.0,  surface: 'rock', slope: 0.0, width: 100 },
  ],
};

// ============================================================
// PHYSICS_CONSTANTS — fundamental constants used across engine
// ============================================================
const PHYSICS_CONSTANTS = {
  G:              9.81,        // m/s² standard gravity
  PI:             Math.PI,
  TWO_PI:         Math.PI * 2,
  HALF_PI:        Math.PI / 2,
  DEG_TO_RAD:     Math.PI / 180,
  RAD_TO_DEG:     180 / Math.PI,
  AIR_DENSITY_SL: 1.225,       // kg/m³ sea level
  WATER_DENSITY:  1000,        // kg/m³
  MUD_DENSITY:    1700,        // kg/m³
  SAND_DENSITY:   1600,        // kg/m³
  ICE_FRICTION:   0.03,        // kinetic friction on ice
  MIN_TIMESTEP:   0.002,       // s
  MAX_TIMESTEP:   0.016,       // s — clamp physics dt
  PX_PER_METER:   10,          // 10 pixels = 1 metre
  SPEED_OF_SOUND: 343,         // m/s at 20°C
};

// ============================================================
// FORCE_ACCUMULATOR — collects and applies forces each tick
// ============================================================
const FORCE_ACCUMULATOR = {
  // Initialize accumulator state on a vehicle object
  init(vehicle) {
    vehicle._forces  = { fx: 0, fy: 0 };
    vehicle._torques = 0;
  },

  // Add a force (Newtons) in world space
  addForce(vehicle, fx, fy) {
    vehicle._forces = vehicle._forces || { fx: 0, fy: 0 };
    vehicle._forces.fx += fx;
    vehicle._forces.fy += fy;
  },

  // Add a torque (N·m, positive = clockwise)
  addTorque(vehicle, torque) {
    vehicle._torques = (vehicle._torques || 0) + torque;
  },

  // Apply accumulated forces to velocity (Euler integration)
  flush(vehicle, vehicleId, dt) {
    const mass    = VEHICLE_MASS_TABLE[vehicleId] || 1000;
    const inertia = mass * 0.3; // rough moment of inertia
    const f = vehicle._forces || { fx: 0, fy: 0 };

    vehicle.vx          = (vehicle.vx || 0) + (f.fx / mass) * dt;
    vehicle.vy          = (vehicle.vy || 0) + (f.fy / mass) * dt;
    vehicle.angularVel  = (vehicle.angularVel || 0) + ((vehicle._torques || 0) / inertia) * dt;
    vehicle.angle       = (vehicle.angle || 0) + vehicle.angularVel * dt;
    vehicle.x           = (vehicle.x || 0) + vehicle.vx * dt;
    vehicle.y           = (vehicle.y || 0) + vehicle.vy * dt;

    // Reset accumulators
    vehicle._forces  = { fx: 0, fy: 0 };
    vehicle._torques = 0;
  },
};

// ============================================================
// calcWheelContactForce — normal and friction at each wheel
// ============================================================
function calcWheelContactForce(wheel, vehicle, vehicleId, surface, dt) {
  const mass      = VEHICLE_MASS_TABLE[vehicleId] || 1000;
  const numWheels = (typeof VehicleDefs !== 'undefined' && VehicleDefs[vehicleId])
                    ? (VehicleDefs[vehicleId].wheels || []).length
                    : 2;
  const weightPerWheel = (mass * PHYSICS_CONSTANTS.G) / Math.max(1, numWheels);

  const suspLimits = SUSPENSION_LIMITS[vehicleId] || SUSPENSION_LIMITS.jeep;
  const springF    = suspLimits.springK * Math.max(0, -wheel.compression || 0);
  const dampF      = suspLimits.dampC   * (wheel.compressionVel || 0);
  const normalF    = Math.max(0, springF - dampF + weightPerWheel);

  const slip       = calcWheelSlip(wheel, vehicle, surface);
  const mu         = calcSurfaceFriction(surface, vehicleId, Math.hypot(vehicle.vx||0, vehicle.vy||0));
  const frictionF  = Math.min(Math.abs(slip.longitudinalForce), mu * normalF);

  return {
    normal:   normalF,
    friction: frictionF * Math.sign(slip.slipRatio),
    slip:     slip.slipRatio,
    grip:     mu,
  };
}

// ============================================================
// ANTI_ROLLOVER_SYSTEM — stabilisation torques to prevent tip
// ============================================================
const ANTI_ROLLOVER_SYSTEM = {
  // Max angle (rad) before stabilisation kicks in
  activationAngle: {
    jeep:        0.30,
    motorbike:   0.50,
    truck:       0.22,
    formula:     0.25,
    hovercar:    0.35,
    cybertruck:  0.28,
    hovercraft:  0.15,
    mech_walker: 0.45,
    submarine:   0.20,
    skateboard:  0.60,
    horse_cart:  0.32,
    spaceship:   0.18,
    tank:        0.18,
    rickshaw:    0.40,
    ice_bike:    0.48,
    swamp_buggy: 0.28,
  },

  // Torque strength of anti-rollover system
  torqueStrength: {
    jeep:        800,
    motorbike:   300,
    truck:       2000,
    formula:     600,
    hovercar:    500,
    cybertruck:  1200,
    hovercraft:  400,
    mech_walker: 3000,
    submarine:   1500,
    skateboard:  150,
    horse_cart:  600,
    spaceship:   800,
    tank:        5000,
    rickshaw:    250,
    ice_bike:    280,
    swamp_buggy: 900,
  },

  // Compute stabilisation torque
  calcTorque(vehicle, vehicleId) {
    const angle = vehicle.angle || 0;
    const threshold = ANTI_ROLLOVER_SYSTEM.activationAngle[vehicleId] || 0.30;
    const strength  = ANTI_ROLLOVER_SYSTEM.torqueStrength[vehicleId]  || 800;

    // Only apply when leaning beyond threshold
    if (Math.abs(angle) < threshold) return 0;
    const excess = angle - Math.sign(angle) * threshold;
    return -excess * strength;
  },
};

// ============================================================
// SKID_MARK_SYSTEM — persistent skid mark management
// ============================================================
const SKID_MARK_SYSTEM = {
  maxMarks:      2000,
  markLifetime:  30,     // seconds
  markWidth:     {
    jeep: 6, motorbike: 3, truck: 10, formula: 5, hovercar: 4,
    cybertruck: 8, hovercraft: 0, mech_walker: 8, submarine: 0,
    skateboard: 2, horse_cart: 5, spaceship: 0, tank: 14,
    rickshaw: 3, ice_bike: 3, swamp_buggy: 8,
  },
  minSlipForMark:  0.25,   // slip ratio threshold
  minSpeedForMark: 30,     // px/s minimum speed

  marks: [],

  addMark(x, y, vehicleId, slipRatio, speed) {
    if (Math.abs(slipRatio) < SKID_MARK_SYSTEM.minSlipForMark) return;
    if (speed < SKID_MARK_SYSTEM.minSpeedForMark) return;
    const alpha = Math.min(0.7, Math.abs(slipRatio) * 0.9);
    SKID_MARK_SYSTEM.marks.push({
      x, y,
      width: SKID_MARK_SYSTEM.markWidth[vehicleId] || 5,
      alpha,
      age: 0,
      vehicleId,
    });
    if (SKID_MARK_SYSTEM.marks.length > SKID_MARK_SYSTEM.maxMarks) {
      SKID_MARK_SYSTEM.marks.shift();
    }
  },

  update(dt) {
    SKID_MARK_SYSTEM.marks = SKID_MARK_SYSTEM.marks.filter(m => {
      m.age += dt;
      return m.age < SKID_MARK_SYSTEM.markLifetime;
    });
  },

  draw(ctx) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i < SKID_MARK_SYSTEM.marks.length; i++) {
      const prev = SKID_MARK_SYSTEM.marks[i - 1];
      const curr = SKID_MARK_SYSTEM.marks[i];
      if (curr.vehicleId !== prev.vehicleId) continue;
      const fadeAlpha = curr.alpha * (1 - curr.age / SKID_MARK_SYSTEM.markLifetime);
      if (fadeAlpha <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `rgba(20,15,10,${fadeAlpha.toFixed(3)})`;
      ctx.lineWidth   = curr.width;
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ============================================================
// VEHICLE_SHADOW_LENGTHS — shadow projection per vehicle
// ============================================================
const VEHICLE_SHADOW_LENGTHS = {
  jeep:        { scaleX: 1.2, scaleY: 0.22, offsetY: 24, alpha: 0.20 },
  motorbike:   { scaleX: 0.9, scaleY: 0.18, offsetY: 18, alpha: 0.18 },
  truck:       { scaleX: 1.5, scaleY: 0.25, offsetY: 32, alpha: 0.25 },
  formula:     { scaleX: 1.1, scaleY: 0.18, offsetY: 16, alpha: 0.22 },
  hovercar:    { scaleX: 1.2, scaleY: 0.20, offsetY: 35, alpha: 0.15 },
  cybertruck:  { scaleX: 1.3, scaleY: 0.23, offsetY: 26, alpha: 0.22 },
  hovercraft:  { scaleX: 1.4, scaleY: 0.20, offsetY: 40, alpha: 0.12 },
  mech_walker: { scaleX: 1.3, scaleY: 0.28, offsetY: 45, alpha: 0.25 },
  submarine:   { scaleX: 1.6, scaleY: 0.22, offsetY: 30, alpha: 0.20 },
  skateboard:  { scaleX: 0.7, scaleY: 0.14, offsetY: 12, alpha: 0.16 },
  horse_cart:  { scaleX: 1.4, scaleY: 0.24, offsetY: 26, alpha: 0.20 },
  spaceship:   { scaleX: 1.2, scaleY: 0.20, offsetY: 50, alpha: 0.10 },
  tank:        { scaleX: 1.6, scaleY: 0.28, offsetY: 36, alpha: 0.28 },
  rickshaw:    { scaleX: 0.9, scaleY: 0.18, offsetY: 20, alpha: 0.16 },
  ice_bike:    { scaleX: 0.85,scaleY: 0.17, offsetY: 18, alpha: 0.15 },
  swamp_buggy: { scaleX: 1.2, scaleY: 0.23, offsetY: 28, alpha: 0.22 },
};


// ============================================================
// PROXIMITY_SENSOR — detect nearby objects for AI and physics
// ============================================================
const PROXIMITY_SENSOR = {
  ranges: {
    jeep:        { front: 120, side: 60, rear: 80  },
    motorbike:   { front: 90,  side: 40, rear: 60  },
    truck:       { front: 180, side: 90, rear: 120 },
    formula:     { front: 70,  side: 35, rear: 50  },
    hovercar:    { front: 100, side: 50, rear: 70  },
    cybertruck:  { front: 140, side: 70, rear: 100 },
    hovercraft:  { front: 160, side: 80, rear: 100 },
    mech_walker: { front: 110, side: 55, rear: 75  },
    submarine:   { front: 200, side: 100,rear: 150 },
    skateboard:  { front: 60,  side: 30, rear: 40  },
    horse_cart:  { front: 130, side: 65, rear: 90  },
    spaceship:   { front: 60,  side: 30, rear: 40  },
    tank:        { front: 200, side: 100,rear: 150 },
    rickshaw:    { front: 80,  side: 40, rear: 55  },
    ice_bike:    { front: 85,  side: 42, rear: 58  },
    swamp_buggy: { front: 130, side: 65, rear: 85  },
  },

  // Check if an object at (ox,oy) is within sensor range
  inRange(vehicle, vehicleId, ox, oy, sensorDir) {
    const dx  = ox - (vehicle.x || 0);
    const dy  = oy - (vehicle.y || 0);
    const dist = Math.hypot(dx, dy);
    const range = (PROXIMITY_SENSOR.ranges[vehicleId] || PROXIMITY_SENSOR.ranges.jeep)[sensorDir] || 100;
    return dist <= range;
  },
};

// ============================================================
// TERRAIN_DEFORMATION — tracks where terrain is modified
// ============================================================
const TERRAIN_DEFORMATION = {
  maxPits:          500,
  pitRadius:        20,   // pixels
  pitDepth:         8,    // pixels of deformation
  recoveryRate:     0.01, // per second

  // Per-vehicle terrain deformation strength
  deformStrength: {
    jeep:        1.0,
    motorbike:   0.5,
    truck:       1.8,
    formula:     0.3,
    hovercar:    0.0,
    cybertruck:  1.5,
    hovercraft:  0.0,
    mech_walker: 3.0,
    submarine:   0.2,
    skateboard:  0.1,
    horse_cart:  0.8,
    spaceship:   0.0,
    tank:        4.0,
    rickshaw:    0.4,
    ice_bike:    0.6,
    swamp_buggy: 1.6,
  },

  pits: [],

  addPit(x, y, vehicleId) {
    // BUGFIX(21 Tmz): `|| 1.0` truthy zinciriydi → deformStrength'i 0 olan UÇAN araçlar
    // (hovercar, hovercraft, spaceship) 1.0'a çevriliyor, `strength <= 0` kontrolü hiç
    // tutmuyor ve havada giden araç zeminde çukur açıyordu.
    const ds = TERRAIN_DEFORMATION.deformStrength[vehicleId];
    const strength = ds !== undefined ? ds : 1.0;
    if (strength <= 0) return;
    TERRAIN_DEFORMATION.pits.push({ x, y, depth: TERRAIN_DEFORMATION.pitDepth * strength, age: 0 });
    if (TERRAIN_DEFORMATION.pits.length > TERRAIN_DEFORMATION.maxPits) {
      TERRAIN_DEFORMATION.pits.shift();
    }
  },

  update(dt) {
    TERRAIN_DEFORMATION.pits.forEach(p => {
      p.age  += dt;
      p.depth = Math.max(0, p.depth - TERRAIN_DEFORMATION.recoveryRate * dt);
    });
    TERRAIN_DEFORMATION.pits = TERRAIN_DEFORMATION.pits.filter(p => p.depth > 0.1);
  },

  getDepthAt(x, y) {
    let totalDepth = 0;
    for (const pit of TERRAIN_DEFORMATION.pits) {
      const d = Math.hypot(x - pit.x, y - pit.y);
      if (d < TERRAIN_DEFORMATION.pitRadius) {
        totalDepth += pit.depth * (1 - d / TERRAIN_DEFORMATION.pitRadius);
      }
    }
    return totalDepth;
  },
};

// ============================================================
// PHYSICS_PROFILER — lightweight performance tracker
// ============================================================
const PHYSICS_PROFILER = {
  enabled:     false,
  samples:     {},
  maxSamples:  60,

  begin(label) {
    if (!PHYSICS_PROFILER.enabled) return;
    if (!PHYSICS_PROFILER.samples[label]) PHYSICS_PROFILER.samples[label] = [];
    PHYSICS_PROFILER.samples[label]._start = performance.now();
  },

  end(label) {
    if (!PHYSICS_PROFILER.enabled) return;
    const arr = PHYSICS_PROFILER.samples[label];
    if (!arr || arr._start === undefined) return;
    arr.push(performance.now() - arr._start);
    if (arr.length > PHYSICS_PROFILER.maxSamples) arr.shift();
  },

  avg(label) {
    const arr = PHYSICS_PROFILER.samples[label];
    if (!arr || !arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  report() {
    const lines = [];
    for (const label of Object.keys(PHYSICS_PROFILER.samples)) {
      lines.push(`${label}: ${PHYSICS_PROFILER.avg(label).toFixed(3)}ms avg`);
    }
    return lines.join('\n');
  },
};

// ============================================================
// validatePhysicsState — sanity-check a vehicle state object
// ============================================================
function validatePhysicsState(vehicle, vehicleId) {
  const errors = [];
  if (!isFinite(vehicle.x   || 0)) errors.push('x NaN');
  if (!isFinite(vehicle.y   || 0)) errors.push('y NaN');
  if (!isFinite(vehicle.vx  || 0)) errors.push('vx NaN');
  if (!isFinite(vehicle.vy  || 0)) errors.push('vy NaN');
  if (!isFinite(vehicle.angle || 0)) errors.push('angle NaN');

  const mass = VEHICLE_MASS_TABLE[vehicleId] || 1000;
  const speed = Math.hypot(vehicle.vx||0, vehicle.vy||0);
  // Speed sanity: nothing should exceed ~800 px/s (≈ 288km/h at 10px/m)
  if (speed > 2000) errors.push(`speed too high: ${speed.toFixed(1)}`);

  if (errors.length > 0) {
    console.warn(`Physics state error [${vehicleId}]:`, errors.join(', '));
    return false;
  }
  return true;
}


// ============================================================
// PHYSICS_EVENT_HOOKS — extensible event callback system
// ============================================================
const PHYSICS_EVENT_HOOKS = {
  _hooks: {},

  on(event, fn) {
    if (!PHYSICS_EVENT_HOOKS._hooks[event]) PHYSICS_EVENT_HOOKS._hooks[event] = [];
    PHYSICS_EVENT_HOOKS._hooks[event].push(fn);
  },

  off(event, fn) {
    const arr = PHYSICS_EVENT_HOOKS._hooks[event];
    if (!arr) return;
    PHYSICS_EVENT_HOOKS._hooks[event] = arr.filter(f => f !== fn);
  },

  emit(event, data) {
    const arr = PHYSICS_EVENT_HOOKS._hooks[event] || [];
    for (const fn of arr) {
      try { fn(data); } catch(e) { /* ignore hook errors */ }
    }
  },

  // Pre-defined physics events:
  // 'collision'   — { vehicle, other, impactVelocity, surfaceNormal }
  // 'landing'     — { vehicle, vehicleId, verticalSpeed }
  // 'airborne'    — { vehicle, vehicleId }
  // 'surfaceChange' — { vehicle, vehicleId, from, to }
  // 'overheat'    — { vehicle, vehicleId, temp }
  // 'tireWorn'    — { vehicle, vehicleId, wheelIndex, wear }
  // 'nitroStart'  — { vehicle, vehicleId }
  // 'nitroEnd'    — { vehicle, vehicleId }
  // 'fuel_empty'  — { vehicle, vehicleId }
  // 'crash'       — { vehicle, vehicleId, severity, damage }
};

// ============================================================
// PHYSICS_CONFIG — global tuning knobs for the physics engine
// ============================================================
const PHYSICS_CONFIG = {
  substeps:           3,       // physics substeps per frame
  maxDeltaTime:       0.033,   // s — max dt before clamping
  gravityScale:       1.0,     // global gravity multiplier
  frictionScale:      1.0,     // global friction multiplier
  restitutionScale:   1.0,     // global bounciness multiplier
  windEnabled:        true,
  waterEnabled:       true,
  terrainDeformEnabled: false,  // disabled by default (expensive)
  tireWearEnabled:    false,    // track tire wear
  engineHeatEnabled:  false,    // track engine temperature
  antiRolloverEnabled:true,
  skidMarksEnabled:   true,
  debugDraw:          false,

  // Tuning presets
  presets: {
    arcade: {
      gravityScale: 0.7,  frictionScale: 0.5, restitutionScale: 1.5,
      substeps: 2, antiRolloverEnabled: true,
    },
    simulation: {
      gravityScale: 1.0,  frictionScale: 1.0, restitutionScale: 0.8,
      substeps: 5, tireWearEnabled: true, engineHeatEnabled: true,
    },
    moon: {
      gravityScale: 0.165, frictionScale: 0.8, restitutionScale: 1.2,
      substeps: 3, windEnabled: false,
    },
  },

  applyPreset(name) {
    const p = PHYSICS_CONFIG.presets[name];
    if (!p) return false;
    Object.assign(PHYSICS_CONFIG, p);
    return true;
  },
};


// =============================================================================
// RAGDOLL_PHYSICS — Araç parça dağılma simülasyonu
// =============================================================================
const RAGDOLL_PHYSICS = (() => {
  const PART_JOINTS = {
    hood:         { partId: 'hood',         connected_to: 'chassis', break_force: 4200,  angular_limit: { min: -15, max: 90  } },
    trunk:        { partId: 'trunk',        connected_to: 'chassis', break_force: 3800,  angular_limit: { min: -10, max: 80  } },
    door_fl:      { partId: 'door_fl',      connected_to: 'chassis', break_force: 5000,  angular_limit: { min: -5,  max: 120 } },
    door_fr:      { partId: 'door_fr',      connected_to: 'chassis', break_force: 5000,  angular_limit: { min: -120,max: 5   } },
    door_rl:      { partId: 'door_rl',      connected_to: 'chassis', break_force: 4500,  angular_limit: { min: -5,  max: 110 } },
    door_rr:      { partId: 'door_rr',      connected_to: 'chassis', break_force: 4500,  angular_limit: { min: -110,max: 5   } },
    bumper_front: { partId: 'bumper_front', connected_to: 'chassis', break_force: 2500,  angular_limit: { min: -20, max: 20  } },
    bumper_rear:  { partId: 'bumper_rear',  connected_to: 'chassis', break_force: 2500,  angular_limit: { min: -20, max: 20  } },
    fender_fl:    { partId: 'fender_fl',    connected_to: 'chassis', break_force: 3000,  angular_limit: { min: -30, max: 60  } },
    fender_fr:    { partId: 'fender_fr',    connected_to: 'chassis', break_force: 3000,  angular_limit: { min: -60, max: 30  } },
    roof:         { partId: 'roof',         connected_to: 'chassis', break_force: 6000,  angular_limit: { min: -5,  max: 5   } },
    exhaust:      { partId: 'exhaust',      connected_to: 'chassis', break_force: 1800,  angular_limit: { min: -45, max: 45  } },
  };

  const _detachedParts = [];

  /**
   * detachPart — Araçtan bir parçayı koparır ve fizik simülasyonuna ekler.
   * @param {Object} vehicle  — mevcut araç nesnesi
   * @param {string} partId   — koparılacak parça kimliği
   * @param {Object} impulse  — { x, y, torque } kopma kuvveti
   * @returns {Object|null}   — eklenen parça nesnesi veya null
   */
  function detachPart(vehicle, partId, impulse = { x: 0, y: 0, torque: 0 }) {
    const jointDef = PART_JOINTS[partId];
    if (!jointDef) return null;
    const massMap = {
      hood: 18, trunk: 15, door_fl: 22, door_fr: 22, door_rl: 20, door_rr: 20,
      bumper_front: 8, bumper_rear: 8, fender_fl: 6, fender_fr: 6, roof: 30, exhaust: 4,
    };
    const mass = massMap[partId] || 10;
    const part = {
      id: partId,
      x: vehicle.x + (Math.random() - 0.5) * 20,
      y: vehicle.y - 10,
      vx: vehicle.vx + impulse.x / mass + (Math.random() - 0.5) * 3,
      vy: vehicle.vy + impulse.y / mass - Math.abs(impulse.y) * 0.5,
      angle: vehicle.angle,
      angularVel: impulse.torque / (mass * 0.8) + (Math.random() - 0.5) * 0.4,
      mass: mass,
      restitution: 0.35,
      friction: 0.55,
      alive: true,
      lifetime: 0,
      maxLifetime: 12000,
      width: 40 + Math.random() * 20,
      height: 15 + Math.random() * 10,
      color: vehicle.color || '#888',
      sparks: Math.random() < 0.4,
    };
    _detachedParts.push(part);
    return part;
  }

  /**
   * updateDetachedParts — Kopan parçaları fizik simülasyonu ile günceller.
   * @param {Array}  parts — _detachedParts dizisi
   * @param {number} dt    — delta-time (ms)
   */
  function updateDetachedParts(parts, dt) {
    const GRAVITY   = 0.00098 * dt;
    const GROUND_Y  = typeof TERRAIN !== 'undefined' ? null : 9999;
    const AIR_DRAG  = 0.998;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (!p.alive) { parts.splice(i, 1); continue; }
      p.vy += GRAVITY;
      p.vx *= AIR_DRAG;
      p.vy *= AIR_DRAG;
      p.x  += p.vx * dt * 0.06;
      p.y  += p.vy * dt * 0.06;
      p.angle += p.angularVel * dt * 0.04;
      const groundY = (typeof TERRAIN !== 'undefined' && typeof getTerrainY === 'function')
        ? getTerrainY(p.x) : 500;
      if (p.y > groundY - p.height * 0.5) {
        p.y  = groundY - p.height * 0.5;
        p.vy = -p.vy * p.restitution;
        p.vx *=  p.friction;
        p.angularVel *= 0.7;
        if (Math.abs(p.vy) < 0.5) { p.vy = 0; }
      }
      p.lifetime += dt;
      if (p.lifetime >= p.maxLifetime) p.alive = false;
    }
  }

  /**
   * drawDetachedParts — Kopan parçaları canvas üzerine çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array}  parts
   * @param {Object} camera — { x, y, scale }
   */
  function drawDetachedParts(ctx, parts, camera) {
    for (const p of parts) {
      if (!p.alive) continue;
      ctx.save();
      const sx = (p.x - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
      const sy = (p.y - camera.y) * camera.scale + ctx.canvas.height * 0.5;
      ctx.translate(sx, sy);
      ctx.rotate(p.angle);
      ctx.scale(camera.scale, camera.scale);
      const alpha = p.lifetime > p.maxLifetime * 0.75
        ? 1 - (p.lifetime - p.maxLifetime * 0.75) / (p.maxLifetime * 0.25) : 1;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle   = p.color;
      ctx.strokeStyle = '#333';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(-p.width * 0.5, -p.height * 0.5, p.width, p.height, 3);
      ctx.fill();
      ctx.stroke();
      if (p.sparks && Math.random() < 0.3) {
        ctx.fillStyle = '#FFD700';
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.arc(
            (Math.random() - 0.5) * p.width,
            (Math.random() - 0.5) * p.height,
            1.5, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  return { PART_JOINTS, detachPart, updateDetachedParts, drawDetachedParts, _detachedParts };
})();

// =============================================================================
// ROPE_PHYSICS — İp / Zincir simülasyonu (köprü kabloları için)
// =============================================================================
const ROPE_PHYSICS = (() => {
  /**
   * RopeSegment — Tek bir ip segmenti.
   * @param {number} x — başlangıç X konumu
   * @param {number} y — başlangıç Y konumu
   * @param {boolean} pinned — sabitlenmiş mi
   */
  class RopeSegment {
    constructor(x, y, pinned = false) {
      this.x       = x;
      this.y       = y;
      this.prevX   = x;
      this.prevY   = y;
      this.pinned  = pinned;
      this.mass    = 1;
      this.constraints = [];
    }

    applyForce(fx, fy) {
      if (this.pinned) return;
      const invM = 1 / this.mass;
      const vx   = this.x - this.prevX;
      const vy   = this.y - this.prevY;
      this.prevX = this.x;
      this.prevY = this.y;
      this.x    += vx + fx * invM;
      this.y    += vy + fy * invM;
    }
  }

  /**
   * createRope — Yeni bir ip oluşturur.
   * @param {number} x1, y1 — başlangıç noktası
   * @param {number} x2, y2 — bitiş noktası
   * @param {number} segments — segment sayısı
   * @param {boolean} pinStart — başlangıcı sabitle
   * @param {boolean} pinEnd   — sonu sabitle
   */
  function createRope(x1, y1, x2, y2, segments = 12, pinStart = true, pinEnd = true) {
    const segs = [];
    for (let i = 0; i <= segments; i++) {
      const t   = i / segments;
      const seg = new RopeSegment(
        x1 + (x2 - x1) * t,
        y1 + (y2 - y1) * t,
        (i === 0 && pinStart) || (i === segments && pinEnd)
      );
      segs.push(seg);
    }
    const segLen = Math.hypot(x2 - x1, y2 - y1) / segments;
    return { segments: segs, restLength: segLen, stiffness: 0.92, damping: 0.98 };
  }

  /**
   * solveRopeConstraints — Verlet kısıtlamalarını çözer.
   * @param {Object} rope       — createRope() ile oluşturulan ip
   * @param {number} iterations — çözümleme iterasyon sayısı
   */
  function solveRopeConstraints(rope, iterations = 8) {
    const { segments, restLength, stiffness } = rope;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < segments.length - 1; i++) {
        const a = segments[i];
        const b = segments[i + 1];
        const dx  = b.x - a.x;
        const dy  = b.y - a.y;
        const len = Math.hypot(dx, dy) || 0.001;
        const diff = (len - restLength) / len * stiffness;
        if (!a.pinned) { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; }
        if (!b.pinned) { b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    }
  }

  /**
   * updateRope — İpi fizik simülasyonu ile günceller (Verlet entegrasyonu).
   * @param {Object} rope — ip nesnesi
   * @param {number} dt   — delta-time (ms)
   */
  function updateRope(rope, dt) {
    const GRAVITY  = 0.00042 * dt;
    const DAMPING  = rope.damping;
    for (const seg of rope.segments) {
      if (seg.pinned) continue;
      const vx = (seg.x - seg.prevX) * DAMPING;
      const vy = (seg.y - seg.prevY) * DAMPING;
      seg.prevX = seg.x;
      seg.prevY = seg.y;
      seg.x    += vx;
      seg.y    += vy + GRAVITY;
    }
    solveRopeConstraints(rope, 10);
  }

  /**
   * drawRope — İpi canvas üzerine çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} rope
   * @param {Object} camera — { x, y, scale }
   * @param {string} color  — çizgi rengi
   * @param {number} width  — çizgi kalınlığı
   */
  function drawRope(ctx, rope, camera, color = '#8B6914', width = 3) {
    const segs = rope.segments;
    if (segs.length < 2) return;
    const toScreen = (wx, wy) => ({
      x: (wx - camera.x) * camera.scale + ctx.canvas.width  * 0.5,
      y: (wy - camera.y) * camera.scale + ctx.canvas.height * 0.5,
    });
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = width * camera.scale;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    const s0 = toScreen(segs[0].x, segs[0].y);
    ctx.moveTo(s0.x, s0.y);
    for (let i = 1; i < segs.length; i++) {
      const s = toScreen(segs[i].x, segs[i].y);
      ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  return { RopeSegment, createRope, solveRopeConstraints, updateRope, drawRope };
})();

// =============================================================================
// FLUID_DYNAMICS_LITE — Hafif sıvı simülasyonu (su sıçramaları)
// =============================================================================
const FLUID_DYNAMICS_LITE = (() => {
  const waterParticles = [];
  const MAX_PARTICLES  = 400;

  /**
   * spawnWaterSplash — Su sıçraması parçacıkları oluşturur.
   * @param {number} x, y   — sıçrama konumu (dünya koordinatı)
   * @param {number} vx, vy — başlangıç hızı
   * @param {number} count  — oluşturulacak parçacık sayısı
   */
  function spawnWaterSplash(x, y, vx, vy, count = 20) {
    const free = MAX_PARTICLES - waterParticles.length;
    const n    = Math.min(count, free);
    for (let i = 0; i < n; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const speed  = Math.random() * 4 + 1;
      waterParticles.push({
        x, y,
        vx: vx * 0.3 + Math.cos(angle) * speed,
        vy: vy * 0.3 + Math.sin(angle) * speed - 3,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.018,
        r: 2 + Math.random() * 3,
        color: `hsl(200,${60 + Math.random() * 30}%,${55 + Math.random() * 20}%)`,
      });
    }
  }

  /**
   * updateFluid — Su parçacıklarını günceller.
   * @param {number} dt — delta-time (ms)
   */
  function updateFluid(dt) {
    const GRAVITY = 0.00088 * dt;
    const DRAG    = 0.994;
    for (let i = waterParticles.length - 1; i >= 0; i--) {
      const p = waterParticles[i];
      p.vy  += GRAVITY;
      p.vx  *= DRAG;
      p.vy  *= DRAG;
      p.x   += p.vx * dt * 0.05;
      p.y   += p.vy * dt * 0.05;
      p.life -= p.decay * (dt / 16);
      if (p.life <= 0) waterParticles.splice(i, 1);
    }
  }

  /**
   * drawFluid — Su parçacıklarını canvas üzerine çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} camera — { x, y, scale }
   */
  function drawFluid(ctx, camera) {
    ctx.save();
    for (const p of waterParticles) {
      const sx = (p.x - camera.x) * camera.scale + ctx.canvas.width  * 0.5;
      const sy = (p.y - camera.y) * camera.scale + ctx.canvas.height * 0.5;
      ctx.globalAlpha = Math.max(0, p.life * 0.85);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r * camera.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return { waterParticles, spawnWaterSplash, updateFluid, drawFluid };
})();

// =============================================================================
// DESTRUCTIBLE_TERRAIN — Yıkılabilir arazi elemanları
// =============================================================================
const DESTRUCTIBLE_TERRAIN = (() => {
  const DESTRUCTIBLES = {
    crate:     { w: 40,  h: 40,  mass: 30,  hp: 80,  color: '#A0522D', reward: 5   },
    barrel:    { w: 30,  h: 50,  mass: 25,  hp: 60,  color: '#708090', reward: 8   },
    fence:     { w: 80,  h: 30,  mass: 8,   hp: 25,  color: '#DEB887', reward: 2   },
    sign:      { w: 20,  h: 60,  mass: 12,  hp: 40,  color: '#FFD700', reward: 3   },
    lamp_post: { w: 15,  h: 120, mass: 45,  hp: 120, color: '#C0C0C0', reward: 10  },
    bush:      { w: 60,  h: 35,  mass: 3,   hp: 15,  color: '#228B22', reward: 1   },
    snowman:   { w: 35,  h: 70,  mass: 5,   hp: 20,  color: '#FFFAFA', reward: 4   },
  };

  const _activeDestructibles = [];
  let _nextId = 0;

  /**
   * spawnDestructible — Bir yıkılabilir nesneyi dünyaya ekler.
   * @param {string} type — DESTRUCTIBLES anahtarı
   * @param {number} x, y — dünya konumu
   */
  function spawnDestructible(type, x, y) {
    const def = DESTRUCTIBLES[type];
    if (!def) return null;
    const obj = {
      id:        _nextId++,
      type,
      x, y,
      vx: 0, vy: 0,
      angle: 0,
      angularVel: 0,
      hp: def.hp,
      maxHp: def.hp,
      destroyed: false,
      debris: [],
      ...def,
    };
    _activeDestructibles.push(obj);
    return obj;
  }

  /**
   * checkDestructibleCollision — Araç ile yıkılabilir nesnelerin çarpışmasını kontrol eder.
   * @param {Object} vehicle
   * @param {Array}  destructibles
   * @returns {Array} çarpışan nesneler
   */
  function checkDestructibleCollision(vehicle, destructibles) {
    const hits = [];
    const vr   = Math.hypot(vehicle.vx, vehicle.vy);
    for (const d of destructibles) {
      if (d.destroyed) continue;
      const dx = Math.abs(vehicle.x - d.x);
      const dy = Math.abs(vehicle.y - d.y);
      if (dx < (vehicle.width || 80) * 0.5 + d.w * 0.5 &&
          dy < (vehicle.height|| 30) * 0.5 + d.h * 0.5) {
        const dmg = vr * d.mass * 0.012;
        d.hp -= dmg;
        d.vx  = vehicle.vx * 0.4 + (Math.random() - 0.5) * 3;
        d.vy  = vehicle.vy * 0.3 - Math.abs(vr) * 0.2;
        d.angularVel = (Math.random() - 0.5) * 0.3;
        hits.push({ obj: d, damage: dmg });
        if (d.hp <= 0) destroyDestructible(d.id, { x: vehicle.vx, y: vehicle.vy });
      }
    }
    return hits;
  }

  /**
   * destroyDestructible — Bir nesneyi yok eder ve enkaz parçaları oluşturur.
   * @param {number} id      — nesne id
   * @param {Object} impulse — { x, y } darbe yönü
   */
  function destroyDestructible(id, impulse = { x: 0, y: 0 }) {
    const obj = _activeDestructibles.find(d => d.id === id);
    if (!obj || obj.destroyed) return;
    obj.destroyed = true;
    const pieceCount = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < pieceCount; i++) {
      obj.debris.push({
        x: obj.x + (Math.random() - 0.5) * obj.w,
        y: obj.y + (Math.random() - 0.5) * obj.h,
        vx: impulse.x * 0.5 + (Math.random() - 0.5) * 6,
        vy: impulse.y * 0.5 - Math.random() * 5,
        angle: Math.random() * Math.PI * 2,
        angularVel: (Math.random() - 0.5) * 0.5,
        size: obj.w * (0.15 + Math.random() * 0.25),
        life: 1.0,
        decay: 0.008 + Math.random() * 0.01,
        color: obj.color,
      });
    }
  }

  /**
   * updateDestructibles — Yıkılabilir nesneleri ve enkazlarını günceller.
   * @param {number} dt — delta-time (ms)
   */
  function updateDestructibles(dt) {
    const GRAVITY = 0.00085 * dt;
    for (const d of _activeDestructibles) {
      if (!d.destroyed) {
        if (Math.abs(d.vx) > 0.01 || Math.abs(d.vy) > 0.01) {
          d.vy     += GRAVITY;
          d.vx     *= 0.96;
          d.x      += d.vx * dt * 0.05;
          d.y      += d.vy * dt * 0.05;
          d.angle  += d.angularVel * dt * 0.04;
          d.angularVel *= 0.94;
        }
      }
      for (let i = d.debris.length - 1; i >= 0; i--) {
        const p = d.debris[i];
        p.vy    += GRAVITY;
        p.vx    *= 0.97;
        p.x     += p.vx * dt * 0.05;
        p.y     += p.vy * dt * 0.05;
        p.angle += p.angularVel * dt * 0.04;
        p.life  -= p.decay * (dt / 16);
        if (p.life <= 0) d.debris.splice(i, 1);
      }
    }
    for (let i = _activeDestructibles.length - 1; i >= 0; i--) {
      if (_activeDestructibles[i].destroyed && _activeDestructibles[i].debris.length === 0) {
        _activeDestructibles.splice(i, 1);
      }
    }
  }

  /**
   * drawDestructibles — Yıkılabilir nesneleri ve enkazlarını çizer.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Array}  destructibles
   * @param {Object} camera
   */
  function drawDestructibles(ctx, destructibles, camera) {
    const toScreen = (wx, wy) => ({
      x: (wx - camera.x) * camera.scale + ctx.canvas.width  * 0.5,
      y: (wy - camera.y) * camera.scale + ctx.canvas.height * 0.5,
    });
    for (const d of destructibles) {
      if (!d.destroyed) {
        const s = toScreen(d.x, d.y);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(d.angle);
        ctx.fillStyle   = d.color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth   = 1.5 * camera.scale;
        ctx.fillRect(-d.w * 0.5 * camera.scale, -d.h * 0.5 * camera.scale,
                      d.w * camera.scale, d.h * camera.scale);
        ctx.strokeRect(-d.w * 0.5 * camera.scale, -d.h * 0.5 * camera.scale,
                        d.w * camera.scale, d.h * camera.scale);
        if (d.hp < d.maxHp) {
          const pct = d.hp / d.maxHp;
          ctx.fillStyle = `hsl(${pct * 120},80%,45%)`;
          ctx.fillRect(-d.w * 0.5 * camera.scale, -d.h * 0.5 * camera.scale - 8 * camera.scale,
                        d.w * pct * camera.scale, 4 * camera.scale);
        }
        ctx.restore();
      }
      for (const p of d.debris) {
        const s = toScreen(p.x, p.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(s.x, s.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        const sz = p.size * camera.scale;
        ctx.fillRect(-sz * 0.5, -sz * 0.5, sz, sz);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
  }

  return {
    DESTRUCTIBLES, spawnDestructible, checkDestructibleCollision,
    destroyDestructible, updateDestructibles, drawDestructibles,
    _activeDestructibles,
  };
})();

// =============================================================================
// VEHICLE_FLIP_PHYSICS — Takla fiziği detayları
// =============================================================================
const VEHICLE_FLIP_PHYSICS = (() => {
  const FLIP_THRESHOLDS = {
    half:   { minAngle: Math.PI * 0.9,  maxAngle: Math.PI * 1.1,  reward: 50,  label: 'HALF FLIP!'    },
    full:   { minAngle: Math.PI * 1.85, maxAngle: Math.PI * 2.15, reward: 100, label: 'FULL FLIP!'    },
    double: { minAngle: Math.PI * 3.85, maxAngle: Math.PI * 4.15, reward: 250, label: 'DOUBLE FLIP!'  },
    triple: { minAngle: Math.PI * 5.85, maxAngle: Math.PI * 6.15, reward: 500, label: 'TRIPLE FLIP!'  },
  };

  /**
   * calcFlipAngularMomentum — Araç için anlık açısal momentum hesaplar.
   * @param {Object} vehicle
   * @returns {number} açısal momentum (kg⋅m²/s)
   */
  function calcFlipAngularMomentum(vehicle) {
    const mass    = vehicle.mass || 1200;
    const width   = vehicle.width  || 80;
    const height  = vehicle.height || 35;
    const inertia = (1 / 12) * mass * (width * width + height * height);
    return inertia * (vehicle.angularVel || 0);
  }

  /**
   * detectFlipComplete — Bir taklanın tamamlanıp tamamlanmadığını kontrol eder.
   * @param {Object} vehicle   — mevcut araç
   * @param {number} prevAngle — bir önceki frame açısı (radyan, birikimli)
   * @returns {Object|null}    — tamamlanan takla verisi veya null
   */
  function detectFlipComplete(vehicle, prevAngle) {
    const totalRot = Math.abs(vehicle.totalRotation || 0);
    const prevRot  = Math.abs(prevAngle || 0);
    for (const [key, thresh] of Object.entries(FLIP_THRESHOLDS)) {
      if (prevRot < thresh.minAngle && totalRot >= thresh.minAngle) {
        return { type: key, reward: thresh.reward, label: thresh.label };
      }
    }
    return null;
  }

  /**
   * accumulateRotation — Her frame araç dönüşünü biriktirir.
   * @param {Object} vehicle
   * @param {number} dt
   */
  function accumulateRotation(vehicle, dt) {
    if (!vehicle._isAirborne) {
      vehicle.totalRotation = 0;
      return;
    }
    vehicle.totalRotation = (vehicle.totalRotation || 0) + Math.abs((vehicle.angularVel || 0) * dt * 0.04);
  }

  return { FLIP_THRESHOLDS, calcFlipAngularMomentum, detectFlipComplete, accumulateRotation };
})();

// =============================================================================
// CONTACT_PATCH — Tekerlek-zemin temas modeli
// =============================================================================
const CONTACT_PATCH = (() => {
  /**
   * calcContactPatchSize — Tekerleğin zemin ile temas yüzeyini hesaplar.
   * @param {Object} wheel  — { radius, width, pressure, compound }
   * @param {number} load   — dikey yük (Newton)
   * @returns {Object}      — { length, width, area } (cm cinsinden)
   */
  function calcContactPatchSize(wheel, load) {
    const { radius = 30, width: w = 20, pressure = 220, compound = 'medium' } = wheel;
    const compoundFactor = { soft: 1.25, medium: 1.0, hard: 0.78 }[compound] || 1.0;
    const area   = (load / pressure) * compoundFactor;
    const length = Math.sqrt(area * radius / w) * 2.4;
    return {
      length: Math.min(length, radius * 1.2),
      width:  w,
      area,
      compoundFactor,
    };
  }

  /**
   * calcLateralGrip — Temas yüzeyine dayalı yanal tutunma kuvvetini hesaplar.
   * @param {Object} contactPatch — calcContactPatchSize() çıktısı
   * @param {number} speed        — hız (km/h)
   * @param {number} slipAngle    — kayma açısı (derece)
   * @returns {number}            — yanal kuvvet (Newton)
   */
  function calcLateralGrip(contactPatch, speed, slipAngle) {
    const { area, compoundFactor } = contactPatch;
    const slipRad   = Math.abs(slipAngle) * Math.PI / 180;
    const peakSlip  = 10 * Math.PI / 180;
    const gripCoeff = compoundFactor * 1.4;
    const normalForce = area * 220;
    const latForce    = normalForce * gripCoeff *
      Math.sin(Math.min(slipRad, peakSlip) / peakSlip * Math.PI * 0.5);
    const speedPenalty = Math.max(0, 1 - (speed - 120) / 200);
    return latForce * speedPenalty;
  }

  // BUGFIX(21 Tmz): IIFE hiçbir şey döndürmüyordu → CONTACT_PATCH === undefined idi,
  // calcContactPatchSize/calcLateralGrip erişilemez (ölü modül) durumdaydı.
  return { calcContactPatchSize, calcLateralGrip };
})();
const LONGITUDINAL_GRIP = (() => {
  /**
   * calcLongitudinalGrip — Boyuna tutunma kuvveti (traksiyon / fren).
   * @param {Object} contactPatch
   * @param {number} slipRatio    — slip oranı (0–1)
   * @param {number} load
   * @returns {number}
   */
  function calcLongitudinalGrip(contactPatch, slipRatio, load) {
    const { compoundFactor } = contactPatch;
    const peakSlip  = 0.15;
    const gripCoeff = compoundFactor * 1.55;
    const ratio     = Math.min(Math.abs(slipRatio), 1.0);
    const mu = gripCoeff * Math.sin(Math.min(ratio, peakSlip) / peakSlip * Math.PI * 0.5)
      * (1 - Math.max(0, ratio - peakSlip) * 0.6);
    return load * mu * Math.sign(slipRatio);
  }

  return { calcLongitudinalGrip };
})();


// ============================================================
// TIRE_PHYSICS — Advanced Tire Simulation System
// ============================================================
const TIRE_PHYSICS = (() => {
  'use strict';

  // ── Compound definitions ──────────────────────────────────
  const COMPOUNDS = {
    soft: {
      name: 'Soft',
      optimalTempMin: 70,
      optimalTempMax: 100,
      peakGrip: 1.45,
      wearRate: 0.0035,
      heatRate: 0.018,
      coolRate: 0.008,
      wetPenalty: 0.55,
      rollingResistance: 0.011,
      flexModulus: 0.72,
    },
    medium: {
      name: 'Medium',
      optimalTempMin: 80,
      optimalTempMax: 110,
      peakGrip: 1.30,
      wearRate: 0.0020,
      heatRate: 0.013,
      coolRate: 0.010,
      wetPenalty: 0.60,
      rollingResistance: 0.013,
      flexModulus: 0.85,
    },
    hard: {
      name: 'Hard',
      optimalTempMin: 95,
      optimalTempMax: 130,
      peakGrip: 1.18,
      wearRate: 0.0010,
      heatRate: 0.009,
      coolRate: 0.012,
      wetPenalty: 0.65,
      rollingResistance: 0.015,
      flexModulus: 0.95,
    },
    rain: {
      name: 'Rain',
      optimalTempMin: 40,
      optimalTempMax: 80,
      peakGrip: 1.10,
      wearRate: 0.0025,
      heatRate: 0.007,
      coolRate: 0.015,
      wetPenalty: 0.05,
      rollingResistance: 0.018,
      flexModulus: 0.65,
    },
  };

  // ── Thermal state thresholds (°C) ────────────────────────
  const THERMAL_STATES = {
    COLD:       { max: 40,  gripMult: 0.72, label: 'cold' },
    WARMING:    { max: 70,  gripMult: 0.88, label: 'warming' },
    OPTIMAL:    { max: 120, gripMult: 1.00, label: 'optimal' },
    HOT:        { max: 150, gripMult: 0.90, label: 'hot' },
    OVERHEATED: { max: Infinity, gripMult: 0.65, label: 'overheated' },
  };

  // ── Road surface thermal conductivity multipliers ─────────
  const SURFACE_CONDUCTIVITY = {
    asphalt: 1.00,
    concrete: 0.92,
    dirt:     0.55,
    gravel:   0.48,
    sand:     0.38,
    mud:      0.30,
    ice:      1.35,
    water:    1.20,
    grass:    0.40,
    snow:     0.80,
    rock:     0.70,
  };

  // ── Rolling resistance surface modifiers ─────────────────
  const ROLLING_RESISTANCE_SURFACE = {
    asphalt:  1.00,
    concrete: 1.05,
    dirt:     1.60,
    gravel:   1.75,
    sand:     2.20,
    mud:      2.80,
    ice:      0.80,
    water:    1.40,
    grass:    1.55,
    snow:     1.90,
    rock:     1.65,
  };

  // ── Pressure operating ranges (PSI) ──────────────────────
  const PRESSURE_SPECS = {
    minSafe:    18,
    optimal:    32,
    maxSafe:    48,
    blowoutRisk: 55,
  };

  // ── Contact patch geometry constants ─────────────────────
  const PATCH_WIDTH_BASE   = 0.225; // metres
  const PATCH_LENGTH_BASE  = 0.12;  // metres at rated load
  const LOAD_SENSITIVITY   = 0.0004;
  const MAX_PATCH_AREA     = 0.045; // m²

  // ── Hydroplaning model ────────────────────────────────────
  const HYDRO_ONSET_SPEED   = 12.0; // m/s (~43 km/h)
  const HYDRO_FULL_SPEED    = 25.0; // m/s (~90 km/h)
  const GROOVE_DEPTH_NEW    = 8.0;  // mm
  const HYDRO_DEPTH_THRESH  = 0.5;  // mm standing water for hydroplaning

  // ────────────────────────────────────────────────────────
  // Utility helpers
  // ────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // ────────────────────────────────────────────────────────
  // Thermal model
  // ────────────────────────────────────────────────────────

  /**
   * Compute new tire temperature after one physics tick.
   * @param {number} currentTemp  °C
   * @param {number} slipRatio    0–1
   * @param {number} slipAngle    radians
   * @param {number} load         N
   * @param {number} speed        m/s
   * @param {string} compound     'soft'|'medium'|'hard'|'rain'
   * @param {string} surface      surface key
   * @param {number} ambientTemp  °C
   * @param {number} dt           seconds
   * @returns {number} new temperature °C
   */
  function updateTireTemp(currentTemp, slipRatio, slipAngle, load, speed,
                          compound, surface, ambientTemp, dt) {
    const comp = COMPOUNDS[compound] || COMPOUNDS.medium;
    const cond = SURFACE_CONDUCTIVITY[surface] || 1.0;

    // Heat generated by slip friction
    const slipMagnitude = Math.sqrt(slipRatio * slipRatio + slipAngle * slipAngle);
    const frictionHeat  = slipMagnitude * load * 0.0012 * comp.heatRate;

    // Heat generated by rolling resistance (always positive)
    const rollingHeat   = speed * load * comp.rollingResistance * 0.0003;

    // Cooling: convective airflow + conduction to road
    const convection    = (speed * 0.6 + 2.0) * (currentTemp - ambientTemp) * 0.00018;
    const conduction    = cond * (currentTemp - ambientTemp) * comp.coolRate * 0.001;

    const dTemp = (frictionHeat + rollingHeat - convection - conduction) * dt;
    return currentTemp + dTemp;
  }

  /**
   * Classify a temperature into a thermal state object.
   * @param {number} temp °C
   * @param {string} compound
   * @returns {{ label: string, gripMult: number }}
   */
  function classifyThermalState(temp, compound) {
    const comp = COMPOUNDS[compound] || COMPOUNDS.medium;
    // Override OPTIMAL boundaries with compound-specific values
    if (temp < THERMAL_STATES.COLD.max)    return { ...THERMAL_STATES.COLD };
    if (temp < comp.optimalTempMin)        return { ...THERMAL_STATES.WARMING };
    if (temp <= comp.optimalTempMax)       return { ...THERMAL_STATES.OPTIMAL };
    if (temp < THERMAL_STATES.HOT.max)    return { ...THERMAL_STATES.HOT };
    return { ...THERMAL_STATES.OVERHEATED };
  }

  /**
   * Smooth grip multiplier across the full temperature range.
   */
  function thermalGripMultiplier(temp, compound) {
    const comp = COMPOUNDS[compound] || COMPOUNDS.medium;
    const { optimalTempMin: tLo, optimalTempMax: tHi } = comp;

    if (temp < 0)   return 0.50;
    if (temp < 20)  return lerp(0.50, 0.65, temp / 20);
    if (temp < 40)  return lerp(0.65, 0.72, (temp - 20) / 20);
    if (temp < tLo) return lerp(0.72, 1.00, (temp - 40) / (tLo - 40));
    if (temp <= tHi) return 1.00;
    if (temp < 150) return lerp(1.00, 0.85, (temp - tHi) / (150 - tHi));
    if (temp < 180) return lerp(0.85, 0.65, (temp - 150) / 30);
    return 0.50;
  }

  // ────────────────────────────────────────────────────────
  // Wear model
  // ────────────────────────────────────────────────────────

  /**
   * Compute incremental tire wear per dt.
   * @param {number} wearLevel  0 (new) – 1 (destroyed)
   * @param {number} slipRatio
   * @param {number} slipAngle  radians
   * @param {number} load       N
   * @param {number} temp       °C
   * @param {string} compound
   * @param {string} surface
   * @param {number} dt
   * @returns {number} new wearLevel
   */
  function updateTireWear(wearLevel, slipRatio, slipAngle, load, temp,
                          compound, surface, dt) {
    if (wearLevel >= 1.0) return 1.0;

    const comp   = COMPOUNDS[compound] || COMPOUNDS.medium;
    const surf   = ROLLING_RESISTANCE_SURFACE[surface] || 1.0;

    // Slip-driven abrasion
    const slipMag    = Math.sqrt(slipRatio * slipRatio + slipAngle * slipAngle);
    const abrasion   = slipMag * load * comp.wearRate * surf * 0.0001;

    // Thermal wear: peaks near 160°C
    const thermalWear = Math.max(0, (temp - 120) / 300) * comp.wearRate * 0.5;

    // Wear rate increases when already worn (less rubber = less cushion)
    const wearFeedback = 1.0 + wearLevel * 0.8;

    return Math.min(1.0, wearLevel + (abrasion + thermalWear) * wearFeedback * dt);
  }

  /**
   * Grip multiplier from wear (new → worn).
   * Soft loses more grip when worn than hard.
   */
  function wearGripMultiplier(wearLevel, compound) {
    if (wearLevel < 0.3) return 1.0;
    if (wearLevel < 0.6) return lerp(1.00, 0.92, (wearLevel - 0.3) / 0.3);
    if (wearLevel < 0.8) return lerp(0.92, 0.78, (wearLevel - 0.6) / 0.2);
    if (wearLevel < 0.95) return lerp(0.78, 0.55, (wearLevel - 0.8) / 0.15);
    return lerp(0.55, 0.30, (wearLevel - 0.95) / 0.05);
  }

  /**
   * Remaining tread depth in mm (new = GROOVE_DEPTH_NEW).
   */
  function treadDepth(wearLevel) {
    return Math.max(0, GROOVE_DEPTH_NEW * (1 - wearLevel));
  }

  // ────────────────────────────────────────────────────────
  // Pressure model
  // ────────────────────────────────────────────────────────

  /**
   * Compute tire pressure change over time.
   * Pressure rises slightly with temperature (ideal gas law approximation).
   * @param {number} pressure  PSI
   * @param {number} temp      °C
   * @param {number} ambientTemp °C
   * @param {number} dt        seconds
   * @returns {number} updated pressure PSI
   */
  function updateTirePressure(pressure, temp, ambientTemp, dt) {
    // Pressure rise from heat: ~0.08 PSI per °C above ambient
    const thermalPressure = (temp - ambientTemp) * 0.08;
    const targetPressure  = PRESSURE_SPECS.optimal + thermalPressure;
    // Slow drift toward target (slow leak or thermal equilibrium)
    return pressure + (targetPressure - pressure) * 0.0002 * dt;
  }

  /**
   * Grip multiplier from tire pressure.
   * Optimal at 32 PSI; drops off for under/over inflation.
   */
  function pressureGripMultiplier(pressure) {
    const opt = PRESSURE_SPECS.optimal;
    if (pressure < 10)  return 0.40; // flat tire
    if (pressure < 18)  return lerp(0.40, 0.80, (pressure - 10) / 8);
    if (pressure < 26)  return lerp(0.80, 0.95, (pressure - 18) / 8);
    // BUGFIX(21 Tmz): sınır 38 idi ama bölen 6 (26→32 aralığı) — yani eşik `opt`(32) olmalıydı.
    // 38 yüzünden: (a) alttaki `pressure <= opt` dalı ERİŞİLEMEZ ölü koddu,
    // (b) 32-38 PSI tam tutuş (1.00) görünüp 38'de aniden 0.975'e düşüyordu (süreksizlik).
    if (pressure < opt)  return lerp(0.95, 1.00, (pressure - 26) / 6);
    if (pressure <= opt) return 1.00;
    if (pressure < 44)  return lerp(1.00, 0.95, (pressure - opt) / 12);
    if (pressure < 55)  return lerp(0.95, 0.80, (pressure - 44) / 11);
    return 0.60; // near blowout
  }

  /**
   * Handling characteristic from pressure (understeer/oversteer index).
   * Returns -1 (heavy understeer) to +1 (heavy oversteer).
   */
  function pressureHandlingBias(frontPSI, rearPSI) {
    const frontFactor = (frontPSI - PRESSURE_SPECS.optimal) / PRESSURE_SPECS.optimal;
    const rearFactor  = (rearPSI  - PRESSURE_SPECS.optimal) / PRESSURE_SPECS.optimal;
    // Higher front pressure → understeer; higher rear pressure → oversteer
    return clamp(rearFactor - frontFactor, -1, 1);
  }

  // ────────────────────────────────────────────────────────
  // Wet grip / hydroplaning
  // ────────────────────────────────────────────────────────

  /**
   * Hydroplaning factor: 0 = full contact, 1 = full aquaplane.
   * @param {number} speed       m/s
   * @param {number} waterDepth  mm
   * @param {number} wear        0–1
   * @param {string} compound
   * @returns {number} hydroplane factor 0–1
   */
  function hydroplaningFactor(speed, waterDepth, wear, compound) {
    if (waterDepth < HYDRO_DEPTH_THRESH) return 0;

    const groove   = treadDepth(wear);
    const drainage = clamp(groove / GROOVE_DEPTH_NEW, 0.05, 1.0);

    // Rain compound resists hydroplaning due to tread design
    const compBonus = (compound === 'rain') ? 1.6 : 1.0;
    const effectiveOnset = HYDRO_ONSET_SPEED * drainage * compBonus;
    const effectiveFull  = HYDRO_FULL_SPEED  * drainage * compBonus;

    // Scale by water depth (deeper = worse)
    const depthFactor = Math.min(2.0, waterDepth / 5.0);

    return smoothstep(effectiveOnset, effectiveFull, speed) * depthFactor;
  }

  /**
   * Wet grip multiplier combining compound wet penalty and hydroplaning.
   */
  function wetGripMultiplier(speed, waterDepth, wear, compound) {
    const comp    = COMPOUNDS[compound] || COMPOUNDS.medium;
    const hydro   = hydroplaningFactor(speed, waterDepth, wear, compound);
    const wetBase = 1.0 - comp.wetPenalty * smoothstep(0, 3, waterDepth);
    return Math.max(0.05, wetBase * (1 - hydro));
  }

  // ────────────────────────────────────────────────────────
  // Contact patch
  // ────────────────────────────────────────────────────────

  /**
   * Contact patch dimensions under load.
   * @param {number} load      N
   * @param {number} pressure  PSI
   * @param {number} wear      0–1
   * @returns {{ width: number, length: number, area: number }} metres / m²
   */
  function contactPatch(load, pressure, wear) {
    const pressFactor = PRESSURE_SPECS.optimal / Math.max(5, pressure);
    const loadIncrease = load * LOAD_SENSITIVITY;

    const width  = PATCH_WIDTH_BASE * (1 + wear * 0.05);
    const length = Math.min(
      PATCH_LENGTH_BASE + loadIncrease * pressFactor,
      PATCH_LENGTH_BASE * 2.5
    );
    const area   = Math.min(width * length, MAX_PATCH_AREA);
    return { width, length, area };
  }

  /**
   * Flex deformation index: how much the sidewall bulges.
   * 1.0 = rigid; higher = more flex.
   */
  function sidewallFlexIndex(load, pressure, compound) {
    const comp       = COMPOUNDS[compound] || COMPOUNDS.medium;
    const normalLoad = 4000; // N reference load
    const pressFactor = PRESSURE_SPECS.optimal / Math.max(5, pressure);
    return (1.0 + (load / normalLoad) * 0.35) * pressFactor * comp.flexModulus;
  }

  // ────────────────────────────────────────────────────────
  // Rolling resistance
  // ────────────────────────────────────────────────────────

  /**
   * Rolling resistance force (N).
   * @param {number} load      N (normal force)
   * @param {number} speed     m/s
   * @param {number} pressure  PSI
   * @param {string} compound
   * @param {string} surface
   * @param {number} temp      °C
   * @returns {number} force N
   */
  function rollingResistanceForce(load, speed, pressure, compound, surface, temp) {
    const comp   = COMPOUNDS[compound] || COMPOUNDS.medium;
    const surf   = ROLLING_RESISTANCE_SURFACE[surface] || 1.0;

    // Base Crr rises slightly with speed (viscoelastic heating)
    const speedFactor = 1.0 + speed * 0.004;

    // Cold tires have higher rolling resistance
    const tempFactor = (temp < 60) ? lerp(1.5, 1.0, temp / 60) : 1.0;

    // Under-inflation dramatically increases Crr
    const pressFactor = PRESSURE_SPECS.optimal / Math.max(5, pressure);

    const Crr = comp.rollingResistance * surf * speedFactor * tempFactor * pressFactor;
    return load * Crr;
  }

  // ────────────────────────────────────────────────────────
  // Combined grip output
  // ────────────────────────────────────────────────────────

  /**
   * Overall grip multiplier combining all factors.
   * @param {Object} state Tire state object
   * @param {Object} env  Environment (surface, waterDepth, ambientTemp)
   * @returns {number} multiplier applied to base friction coefficient
   */
  function overallGripMultiplier(state, env) {
    const thermal  = thermalGripMultiplier(state.temp, state.compound);
    const wear     = wearGripMultiplier(state.wear, state.compound);
    const pressure = pressureGripMultiplier(state.pressure);
    const wet      = wetGripMultiplier(state.speed, env.waterDepth || 0,
                                       state.wear, state.compound);
    return thermal * wear * pressure * wet;
  }

  /**
   * Full per-tick tire update — returns new tire state.
   * @param {Object} state  { temp, wear, pressure, speed, compound }
   * @param {Object} inputs { slipRatio, slipAngle, load, surface, waterDepth, ambientTemp }
   * @param {number} dt     seconds
   * @returns {Object} updated state
   */
  function tickTire(state, inputs, dt) {
    const { slipRatio, slipAngle, load, surface, waterDepth, ambientTemp } = inputs;

    const newTemp     = updateTireTemp(state.temp, slipRatio, slipAngle, load,
                                       state.speed, state.compound, surface,
                                       ambientTemp, dt);
    const newWear     = updateTireWear(state.wear, slipRatio, slipAngle, load,
                                       newTemp, state.compound, surface, dt);
    const newPressure = updateTirePressure(state.pressure, newTemp, ambientTemp, dt);

    const thermalState = classifyThermalState(newTemp, state.compound);
    const grip         = overallGripMultiplier(
      { ...state, temp: newTemp, wear: newWear, pressure: newPressure },
      { waterDepth: waterDepth || 0 }
    );
    const rr           = rollingResistanceForce(load, state.speed, newPressure,
                                                state.compound, surface, newTemp);
    const patch        = contactPatch(load, newPressure, newWear);
    const flex         = sidewallFlexIndex(load, newPressure, state.compound);

    return {
      temp:         newTemp,
      wear:         newWear,
      pressure:     newPressure,
      compound:     state.compound,
      speed:        state.speed,
      thermalState: thermalState.label,
      grip,
      rollingResistanceForce: rr,
      contactPatch: patch,
      sidewallFlex: flex,
      treadDepthMM: treadDepth(newWear),
    };
  }

  /**
   * Create a default fresh tire state.
   */
  function createTireState(compound = 'medium', ambientTemp = 20) {
    return {
      temp:     ambientTemp + 5,
      wear:     0,
      pressure: PRESSURE_SPECS.optimal,
      compound,
      speed:    0,
    };
  }

  /**
   * Estimated lap distance remaining before tire change needed.
   * @param {number} wear         current wear 0–1
   * @param {number} wearPerMetre estimated wear per metre
   * @returns {number} metres
   */
  function estimatedTireLife(wear, wearPerMetre) {
    const remaining = Math.max(0, 0.95 - wear);
    return wearPerMetre > 0 ? remaining / wearPerMetre : Infinity;
  }

  /**
   * Blowout probability per second (rises sharply above safe pressure/temp).
   */
  function blowoutProbability(pressure, temp, wear, speed) {
    let risk = 0;
    if (pressure > PRESSURE_SPECS.maxSafe) {
      risk += Math.pow((pressure - PRESSURE_SPECS.maxSafe) / 10, 2) * 0.02;
    }
    if (temp > 160) {
      risk += Math.pow((temp - 160) / 30, 2) * 0.015;
    }
    if (wear > 0.90) {
      risk += Math.pow((wear - 0.90) / 0.10, 2) * 0.025;
    }
    // High speed amplifies risk
    risk *= (1 + speed * 0.01);
    return clamp(risk, 0, 1);
  }

  // ── Public API ────────────────────────────────────────────
  return {
    COMPOUNDS,
    THERMAL_STATES,
    SURFACE_CONDUCTIVITY,
    PRESSURE_SPECS,
    createTireState,
    tickTire,
    updateTireTemp,
    updateTireWear,
    updateTirePressure,
    classifyThermalState,
    thermalGripMultiplier,
    wearGripMultiplier,
    pressureGripMultiplier,
    pressureHandlingBias,
    wetGripMultiplier,
    hydroplaningFactor,
    rollingResistanceForce,
    contactPatch,
    sidewallFlexIndex,
    overallGripMultiplier,
    treadDepth,
    estimatedTireLife,
    blowoutProbability,
  };
})();

// ============================================================
// AERODYNAMICS — Vehicle Aerodynamics Simulation
// ============================================================
const AERODYNAMICS = (() => {
  'use strict';

  const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³ at 15°C
  const GAS_CONSTANT_AIR      = 287.05; // J/(kg·K)
  const LAPSE_RATE            = 0.0065; // K/m
  const SEA_LEVEL_TEMP_K      = 288.15; // K
  const SEA_LEVEL_PRESSURE    = 101325; // Pa

  // ── Vehicle aero profiles ─────────────────────────────────
  const VEHICLE_PROFILES = {
    hatchback:  { CdBase: 0.32, frontalArea: 2.10, CdBody: 0.30 },
    suv:        { CdBase: 0.38, frontalArea: 2.65, CdBody: 0.36 },
    sports:     { CdBase: 0.28, frontalArea: 1.90, CdBody: 0.26 },
    truck:      { CdBase: 0.45, frontalArea: 3.10, CdBody: 0.44 },
    formula:    { CdBase: 0.70, frontalArea: 1.50, CdBody: 0.20 },
    motorcycle: { CdBase: 0.55, frontalArea: 0.60, CdBody: 0.50 },
    buggy:      { CdBase: 0.60, frontalArea: 1.80, CdBody: 0.58 },
  };

  // ── Wing / spoiler configs ────────────────────────────────
  const WING_DATA = {
    none:       { ClBase: 0,    CdAdd: 0,     angleMin: 0,  angleMax: 0  },
    small:      { ClBase: 0.15, CdAdd: 0.008, angleMin: 0,  angleMax: 20 },
    medium:     { ClBase: 0.30, CdAdd: 0.018, angleMin: 0,  angleMax: 30 },
    large:      { ClBase: 0.55, CdAdd: 0.040, angleMin: 0,  angleMax: 45 },
    drs:        { ClBase: 0.60, CdAdd: 0.045, angleMin: -5, angleMax: 45 },
    diffuser:   { ClBase: 0.40, CdAdd: 0.010, angleMin: 0,  angleMax: 15 },
  };

  // ── Diffuser ride-height curve (metres → multiplier) ─────
  const DIFFUSER_CURVE = [
    [0.00, 0.00], [0.02, 0.30], [0.04, 0.65], [0.06, 0.90],
    [0.08, 1.00], [0.10, 0.95], [0.15, 0.75], [0.20, 0.50],
    [0.30, 0.20], [0.50, 0.00],
  ];

  // ── Slipstream model ──────────────────────────────────────
  const SLIPSTREAM_CONE_HALF_ANGLE = 8;   // degrees
  const SLIPSTREAM_MAX_DISTANCE    = 25;  // metres
  const SLIPSTREAM_PEAK_REDUCTION  = 0.28;

  // ── Beaufort / wind table ─────────────────────────────────
  const BEAUFORT_TABLE = [
    { scale: 0, label: 'Calm',           speedMs: 0.0  },
    { scale: 1, label: 'Light air',      speedMs: 0.8  },
    { scale: 2, label: 'Light breeze',   speedMs: 2.4  },
    { scale: 3, label: 'Gentle breeze',  speedMs: 4.4  },
    { scale: 4, label: 'Moderate',       speedMs: 6.7  },
    { scale: 5, label: 'Fresh',          speedMs: 9.3  },
    { scale: 6, label: 'Strong',         speedMs: 12.3 },
    { scale: 7, label: 'Near gale',      speedMs: 15.5 },
    { scale: 8, label: 'Gale',           speedMs: 18.9 },
    { scale: 9, label: 'Strong gale',    speedMs: 22.6 },
    { scale: 10, label: 'Storm',         speedMs: 26.4 },
    { scale: 11, label: 'Violent storm', speedMs: 30.5 },
    { scale: 12, label: 'Hurricane',     speedMs: 32.7 },
  ];

  // ────────────────────────────────────────────────────────
  // Utility
  // ────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

  function lerpCurve(curve, x) {
    if (x <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
      if (x <= curve[i][0]) {
        const t = (x - curve[i-1][0]) / (curve[i][0] - curve[i-1][0]);
        return lerp(curve[i-1][1], curve[i][1], t);
      }
    }
    return curve[curve.length - 1][1];
  }

  // ────────────────────────────────────────────────────────
  // Air density
  // ────────────────────────────────────────────────────────

  /**
   * Air density at altitude using barometric formula.
   * @param {number} altitudeM  metres above sea level
   * @param {number} tempC      ambient temperature °C (sea-level ref)
   * @returns {number} kg/m³
   */
  function airDensity(altitudeM, tempC = 15) {
    const tempK  = SEA_LEVEL_TEMP_K + (tempC - 15);
    const tempAlt = tempK - LAPSE_RATE * altitudeM;
    const pressure = SEA_LEVEL_PRESSURE * Math.pow(tempAlt / tempK, 5.2561);
    return pressure / (GAS_CONSTANT_AIR * tempAlt);
  }

  // ────────────────────────────────────────────────────────
  // Drag
  // ────────────────────────────────────────────────────────

  /**
   * Drag force (N) on a vehicle.
   * @param {number} speed      m/s (vehicle speed relative to air)
   * @param {string} vehicle    profile key
   * @param {string} wingType   wing config key
   * @param {number} wingAngle  degrees
   * @param {number} altitude   m
   * @param {number} tempC      °C
   * @returns {number} N
   */
  function dragForce(speed, vehicle, wingType, wingAngle, altitude = 0, tempC = 15) {
    const vp   = VEHICLE_PROFILES[vehicle] || VEHICLE_PROFILES.hatchback;
    const wing = WING_DATA[wingType] || WING_DATA.none;
    const rho  = airDensity(altitude, tempC);

    // Wing angle adds drag proportional to sin²(angle)
    const angleRad  = wingAngle * Math.PI / 180;
    const wingCd    = wing.CdAdd * (1 + Math.sin(angleRad) * 0.6);

    const CdA = (vp.CdBase + wingCd) * vp.frontalArea;
    return 0.5 * rho * CdA * speed * speed;
  }

  /**
   * Drag coefficient at a given speed accounting for compressibility
   * (Mach number effect, relevant for very high speeds).
   */
  function effectiveCd(Cd0, speedMs, tempC = 15) {
    const speedOfSound = 331.3 * Math.sqrt(1 + tempC / 273.15);
    const mach = speedMs / speedOfSound;
    if (mach < 0.3) return Cd0;
    // Slight compressibility rise — Prandtl-Glauert approximation
    return Cd0 / Math.sqrt(Math.max(0.001, 1 - mach * mach));
  }

  // ────────────────────────────────────────────────────────
  // Downforce & Lift
  // ────────────────────────────────────────────────────────

  /**
   * Downforce (N) from wings and body.
   * Negative lift = downforce.
   */
  function downforce(speed, vehicle, wingType, wingAngle, rideHeightM,
                     altitude = 0, tempC = 15) {
    const vp   = VEHICLE_PROFILES[vehicle] || VEHICLE_PROFILES.hatchback;
    const wing = WING_DATA[wingType] || WING_DATA.none;
    const rho  = airDensity(altitude, tempC);

    const angleRad = wingAngle * Math.PI / 180;
    // Wing downforce rises with sin(angle) up to stall ~45°
    const Cl_wing  = wing.ClBase * Math.min(1, Math.sin(angleRad * 1.2));

    // Ground effect via diffuser
    const diffMult = lerpCurve(DIFFUSER_CURVE, rideHeightM);
    const Cl_diff  = (WING_DATA.diffuser.ClBase * diffMult) *
                     (vp.frontalArea / 2.0);

    // Body lift (positive Cl = lift, negative = downforce for sports cars)
    const Cl_body  = -0.05; // slight downforce for most cars

    const ClTotal  = Cl_wing + Cl_diff + Cl_body;
    const refArea  = vp.frontalArea * 2.0; // plan view area approx
    return 0.5 * rho * ClTotal * refArea * speed * speed;
  }

  /**
   * Weight transfer from aerodynamic downforce distribution.
   * Returns { front: N, rear: N } downforce per axle.
   */
  function downforceAxleDistribution(totalDownforce, wingType, vehicle) {
    // Wings tend to be at rear; front splitter adds front downforce
    const rearBias = (wingType === 'none') ? 0.50 : 0.65;
    return {
      front: totalDownforce * (1 - rearBias),
      rear:  totalDownforce * rearBias,
    };
  }

  /**
   * Lift reduction of effective vehicle weight at high speed.
   * @param {number} vehicleMassKg
   * @param {number} df            downforce N (positive = pressed down)
   * @returns {number} effective weight N
   */
  function effectiveWeight(vehicleMassKg, df) {
    const gravity = 9.81;
    return vehicleMassKg * gravity + df;
  }

  // ────────────────────────────────────────────────────────
  // Side force (yaw / crosswind)
  // ────────────────────────────────────────────────────────

  /**
   * Lateral (side) aerodynamic force from crosswind or yaw.
   * @param {number} vehicleSpeed   m/s
   * @param {number} windSpeed      m/s
   * @param {number} windAngleDeg   angle between wind and vehicle heading (0=headwind)
   * @param {string} vehicle
   * @param {number} altitude
   * @param {number} tempC
   * @returns {number} side force N (positive = pushes vehicle right)
   */
  function sideForce(vehicleSpeed, windSpeed, windAngleDeg, vehicle,
                     altitude = 0, tempC = 15) {
    const vp  = VEHICLE_PROFILES[vehicle] || VEHICLE_PROFILES.hatchback;
    const rho = airDensity(altitude, tempC);

    // Relative wind components
    const windRad    = windAngleDeg * Math.PI / 180;
    const vWindLong  = vehicleSpeed - windSpeed * Math.cos(windRad);
    const vWindLat   = windSpeed * Math.sin(windRad);

    // Side force coefficient ~0.7 for a typical car side area
    const Cy    = 0.70;
    const sideArea = vp.frontalArea * 2.0; // rough side area

    return 0.5 * rho * Cy * sideArea * vWindLat * Math.abs(vWindLat);
  }

  // ────────────────────────────────────────────────────────
  // Slipstream
  // ────────────────────────────────────────────────────────

  /**
   * Slipstream drag reduction factor when following another vehicle.
   * @param {number} distanceM   gap between vehicles (front to rear) metres
   * @param {number} lateralOffM lateral offset metres
   * @param {number} leadWidth   width of leading vehicle metres
   * @returns {number} 0 = no effect, up to SLIPSTREAM_PEAK_REDUCTION
   */
  function slipstreamReduction(distanceM, lateralOffM, leadWidth = 1.8) {
    if (distanceM <= 0 || distanceM > SLIPSTREAM_MAX_DISTANCE) return 0;

    // Cone half-width at this distance
    const coneWidth = distanceM * Math.tan(SLIPSTREAM_CONE_HALF_ANGLE * Math.PI / 180)
                      + leadWidth * 0.5;
    if (Math.abs(lateralOffM) > coneWidth) return 0;

    const lateralFrac = 1 - Math.abs(lateralOffM) / coneWidth;
    const distFrac    = 1 - distanceM / SLIPSTREAM_MAX_DISTANCE;
    return SLIPSTREAM_PEAK_REDUCTION * lateralFrac * distFrac;
  }

  /**
   * Effective drag force accounting for slipstream.
   */
  function dragForceWithSlipstream(speed, vehicle, wingType, wingAngle,
                                   altitude, tempC, slipReduction) {
    const base = dragForce(speed, vehicle, wingType, wingAngle, altitude, tempC);
    return base * (1 - clamp(slipReduction, 0, 0.5));
  }

  // ────────────────────────────────────────────────────────
  // Wing angle optimisation
  // ────────────────────────────────────────────────────────

  /**
   * Compute downforce-to-drag ratio for a wing angle.
   * Higher is better for cornering grip; lower is better for top speed.
   */
  function wingEfficiency(wingType, angleDeg) {
    const wing = WING_DATA[wingType] || WING_DATA.none;
    const rad  = clamp(angleDeg, wing.angleMin, wing.angleMax) * Math.PI / 180;
    const Cl   = wing.ClBase * Math.sin(rad * 1.2);
    const Cd   = wing.CdAdd * (1 + Math.sin(rad) * 0.6);
    return Cd > 0 ? Cl / Cd : 0;
  }

  /**
   * Optimal wing angle for a target speed (compromise between drag and downforce).
   * @param {string} wingType
   * @param {number} targetSpeedMs
   * @param {number} cornerRadiusM  target corner radius (tighter = more downforce)
   * @returns {number} angle degrees
   */
  function optimalWingAngle(wingType, targetSpeedMs, cornerRadiusM = 50) {
    const wing = WING_DATA[wingType] || WING_DATA.none;
    // Need more downforce for tighter corners and higher speed
    const grip_demand = (targetSpeedMs * targetSpeedMs) / cornerRadiusM / 9.81;
    // Map demand to angle
    const angleFrac = clamp(grip_demand / 3.0, 0, 1);
    return lerp(wing.angleMin, wing.angleMax, angleFrac);
  }

  // ────────────────────────────────────────────────────────
  // Turbulence behind vehicles
  // ────────────────────────────────────────────────────────

  /**
   * Turbulence intensity behind a large vehicle (0–1).
   * Affects handling stability of following vehicle.
   */
  function turbulenceIntensity(leadVehicle, distanceM, speed) {
    const vp = VEHICLE_PROFILES[leadVehicle] || VEHICLE_PROFILES.hatchback;
    if (distanceM > 15) return 0;
    // Larger vehicles create more turbulence; decays with distance
    const sizeFactor = vp.frontalArea / 1.9;
    const distDecay  = 1 - distanceM / 15;
    const speedScale = clamp(speed / 30, 0, 1);
    return sizeFactor * distDecay * speedScale;
  }

  /**
   * Steering correction needed due to turbulence (radians).
   * Should be combined with a noise function in the sim.
   */
  function turbulenceSteeringPerturbation(intensity, vehicleMassKg) {
    const massDampen = clamp(1500 / vehicleMassKg, 0.3, 2.0);
    return intensity * 0.08 * massDampen;
  }

  // ────────────────────────────────────────────────────────
  // Aerodynamic efficiency curves (speed-dependent)
  // ────────────────────────────────────────────────────────

  // Cd vs speed lookup for each body type (speed m/s → relative Cd)
  const AERO_EFFICIENCY_CURVES = {
    sports:    [[0,1.00],[20,0.98],[40,0.96],[60,0.95],[80,0.94],[100,0.95]],
    hatchback: [[0,1.00],[20,0.99],[40,0.99],[60,1.00],[80,1.02],[100,1.05]],
    suv:       [[0,1.00],[20,1.00],[40,1.01],[60,1.03],[80,1.06],[100,1.10]],
    truck:     [[0,1.00],[20,1.01],[40,1.03],[60,1.06],[80,1.10],[100,1.15]],
    formula:   [[0,1.00],[20,1.00],[40,1.01],[60,1.02],[80,1.03],[100,1.05]],
    motorcycle:[[0,1.00],[20,0.97],[40,0.95],[60,0.94],[80,0.94],[100,0.95]],
    buggy:     [[0,1.00],[20,1.00],[40,1.02],[60,1.04],[80,1.07],[100,1.11]],
  };

  /**
   * Speed-corrected drag coefficient.
   */
  function speedCorrectedCd(vehicle, speedMs) {
    const vp    = VEHICLE_PROFILES[vehicle] || VEHICLE_PROFILES.hatchback;
    const curve = AERO_EFFICIENCY_CURVES[vehicle] || AERO_EFFICIENCY_CURVES.hatchback;
    return vp.CdBase * lerpCurve(curve, speedMs);
  }

  // ────────────────────────────────────────────────────────
  // Complete aero state for one tick
  // ────────────────────────────────────────────────────────

  /**
   * Compute all aerodynamic forces for the current frame.
   * @param {Object} vehicle   { type, massKg, wingType, wingAngle, rideHeightM }
   * @param {Object} motion    { speed, lateralSpeed, altitude, heading }
   * @param {Object} wind      { speed, directionDeg }
   * @param {Object} lead      { distanceM, lateralOffM, vehicleType } or null
   * @param {number} tempC
   * @returns {Object} aero forces
   */
  function computeAeroState(vehicle, motion, wind, lead, tempC = 15) {
    const { type, massKg, wingType, wingAngle, rideHeightM } = vehicle;
    const { speed, altitude, heading } = motion;
    const rho = airDensity(altitude || 0, tempC);

    // Wind angle relative to vehicle heading
    const windRelAngle = (wind.directionDeg - heading + 360) % 360;

    const slipR = lead
      ? slipstreamReduction(lead.distanceM, lead.lateralOffM)
      : 0;

    const drag = dragForceWithSlipstream(speed, type, wingType, wingAngle,
                                          altitude, tempC, slipR);
    const df   = downforce(speed, type, wingType, wingAngle,
                           rideHeightM || 0.10, altitude, tempC);
    const sf   = sideForce(speed, wind.speed, windRelAngle, type, altitude, tempC);
    const turb = lead
      ? turbulenceIntensity(lead.vehicleType || type, lead.distanceM, speed)
      : 0;
    const effW = effectiveWeight(massKg, df);
    const axle = downforceAxleDistribution(df, wingType, type);

    return {
      dragForce:    drag,
      downforce:    df,
      sideForce:    sf,
      effectiveWeight: effW,
      axleDownforce:  axle,
      slipstreamReduction: slipR,
      turbulenceIntensity: turb,
      airDensity:   rho,
      wingEfficiency: wingEfficiency(wingType, wingAngle),
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    VEHICLE_PROFILES,
    WING_DATA,
    BEAUFORT_TABLE,
    AERO_EFFICIENCY_CURVES,
    airDensity,
    dragForce,
    effectiveCd,
    downforce,
    downforceAxleDistribution,
    effectiveWeight,
    sideForce,
    slipstreamReduction,
    dragForceWithSlipstream,
    wingEfficiency,
    optimalWingAngle,
    turbulenceIntensity,
    turbulenceSteeringPerturbation,
    speedCorrectedCd,
    computeAeroState,
  };
})();

// ============================================================
// DAMAGE_SYSTEM — Progressive Vehicle Damage Model
// ============================================================
const DAMAGE_SYSTEM = (() => {
  'use strict';

  // ── Component definitions ─────────────────────────────────
  const COMPONENTS = {
    engine:     { maxHp: 100, repairCostPerHp: 120, perfImpact: 'power',      tolerance: 40 },
    suspension: { maxHp: 100, repairCostPerHp: 80,  perfImpact: 'handling',   tolerance: 60 },
    body:       { maxHp: 100, repairCostPerHp: 50,  perfImpact: 'drag',       tolerance: 70 },
    frontWheel: { maxHp: 100, repairCostPerHp: 90,  perfImpact: 'steering',   tolerance: 55 },
    rearWheel:  { maxHp: 100, repairCostPerHp: 90,  perfImpact: 'traction',   tolerance: 55 },
    gearbox:    { maxHp: 100, repairCostPerHp: 110, perfImpact: 'gearChange', tolerance: 35 },
    fuel:       { maxHp: 100, repairCostPerHp: 60,  perfImpact: 'fuelLeak',   tolerance: 80 },
    exhaust:    { maxHp: 100, repairCostPerHp: 40,  perfImpact: 'power',      tolerance: 85 },
  };

  // ── Damage zones & routing ────────────────────────────────
  const DAMAGE_ZONES = {
    front: {
      components: ['engine', 'frontWheel', 'gearbox'],
      tolerance: 50,
      weights: { engine: 0.45, frontWheel: 0.35, gearbox: 0.20 },
    },
    rear: {
      components: ['gearbox', 'rearWheel', 'exhaust', 'fuel'],
      tolerance: 55,
      weights: { gearbox: 0.25, rearWheel: 0.35, exhaust: 0.20, fuel: 0.20 },
    },
    side: {
      components: ['body', 'suspension', 'fuel'],
      tolerance: 65,
      weights: { body: 0.50, suspension: 0.35, fuel: 0.15 },
    },
    roof: {
      components: ['body', 'suspension'],
      tolerance: 40,
      weights: { body: 0.60, suspension: 0.40 },
    },
    underside: {
      components: ['suspension', 'exhaust', 'fuel'],
      tolerance: 60,
      weights: { suspension: 0.40, exhaust: 0.35, fuel: 0.25 },
    },
  };

  // ── Visual damage levels ──────────────────────────────────
  const VISUAL_LEVELS = [
    { minBodyHp: 85, label: 'pristine',  paintAlpha: 1.00, deformFactor: 0.00 },
    { minBodyHp: 65, label: 'scratched', paintAlpha: 0.95, deformFactor: 0.05 },
    { minBodyHp: 40, label: 'dented',    paintAlpha: 0.85, deformFactor: 0.20 },
    { minBodyHp: 20, label: 'crumpled',  paintAlpha: 0.70, deformFactor: 0.50 },
    { minBodyHp: 0,  label: 'wrecked',   paintAlpha: 0.50, deformFactor: 1.00 },
  ];

  // ── Collision thresholds ──────────────────────────────────
  const SOFT_THRESHOLD  = 500;    // N — cosmetic only
  const HARD_THRESHOLD  = 4000;   // N — structural damage starts
  const SEVERE_THRESHOLD = 15000; // N — catastrophic

  // ── Rollover multiplier ───────────────────────────────────
  const ROLLOVER_DAMAGE_MULT = 1.8;

  // ── Structural integrity thresholds ──────────────────────
  // Below these averages, handling degrades
  const STRUCT_CRITICAL = 30;
  const STRUCT_SEVERE   = 15;

  // ────────────────────────────────────────────────────────
  // Utility
  // ────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

  // ────────────────────────────────────────────────────────
  // Impact force calculation
  // ────────────────────────────────────────────────────────

  /**
   * Peak impact force from a collision.
   * @param {number} massKg         vehicle mass
   * @param {number} deltaV         change in velocity m/s
   * @param {number} contactTimeMs  duration of contact milliseconds
   * @returns {number} peak force N
   */
  function impactForce(massKg, deltaV, contactTimeMs = 50) {
    return massKg * Math.abs(deltaV) / (contactTimeMs / 1000);
  }

  /**
   * Classify the severity of an impact.
   * @returns {'none'|'soft'|'hard'|'severe'}
   */
  function impactSeverity(forceN) {
    if (forceN < SOFT_THRESHOLD)   return 'none';
    if (forceN < HARD_THRESHOLD)   return 'soft';
    if (forceN < SEVERE_THRESHOLD) return 'hard';
    return 'severe';
  }

  // ────────────────────────────────────────────────────────
  // Damage application
  // ────────────────────────────────────────────────────────

  /**
   * Apply damage from an impact to a zone.
   * @param {Object} damageState  { engine: hp, suspension: hp, ... }
   * @param {string} zone         zone key
   * @param {number} forceN       impact force
   * @param {boolean} rollover
   * @returns {Object} updated damageState + log entry
   */
  function applyImpact(damageState, zone, forceN, rollover = false) {
    const zoneDef  = DAMAGE_ZONES[zone];
    if (!zoneDef) return { state: damageState, log: null };

    const severity = impactSeverity(forceN);
    if (severity === 'none') return { state: damageState, log: null };

    const mult = rollover ? ROLLOVER_DAMAGE_MULT : 1.0;
    const effectiveForce = forceN * mult;

    // Damage amount scales logarithmically above threshold
    const baseDamage = Math.log10(effectiveForce / SOFT_THRESHOLD) * 18;

    const newState = { ...damageState };
    const applied  = {};

    for (const comp of zoneDef.components) {
      const w   = zoneDef.weights[comp] || 0.25;
      const dmg = baseDamage * w;
      const prev = newState[comp] !== undefined ? newState[comp] : 100;
      newState[comp] = clamp(prev - dmg, 0, 100);
      applied[comp]  = dmg;
    }

    return {
      state: newState,
      log: {
        zone, severity, forceN: Math.round(forceN),
        rollover, applied, timestamp: Date.now(),
      },
    };
  }

  // ────────────────────────────────────────────────────────
  // Performance degradation
  // ────────────────────────────────────────────────────────

  /**
   * Power output multiplier from engine + exhaust damage.
   */
  function powerMultiplier(damageState) {
    const eng = (damageState.engine  || 100) / 100;
    const exh = (damageState.exhaust || 100) / 100;
    // Engine damage has primary impact; exhaust secondary
    return clamp(eng * 0.85 + exh * 0.15, 0, 1);
  }

  /**
   * Handling multiplier from suspension + wheel damage.
   */
  function handlingMultiplier(damageState) {
    const sus  = (damageState.suspension || 100) / 100;
    const fwhl = (damageState.frontWheel || 100) / 100;
    const rwhl = (damageState.rearWheel  || 100) / 100;
    return clamp(sus * 0.50 + fwhl * 0.30 + rwhl * 0.20, 0, 1);
  }

  /**
   * Steering multiplier from front wheel + body deformation.
   */
  function steeringMultiplier(damageState) {
    const fwhl = (damageState.frontWheel || 100) / 100;
    const body = (damageState.body       || 100) / 100;
    return clamp(fwhl * 0.70 + body * 0.30, 0, 1);
  }

  /**
   * Traction multiplier from rear wheel damage.
   */
  function tractionMultiplier(damageState) {
    const rwhl = (damageState.rearWheel || 100) / 100;
    return clamp(rwhl, 0, 1);
  }

  /**
   * Gear change reliability from gearbox damage.
   * Returns probability of successful shift (0–1).
   */
  function shiftSuccessProbability(damageState) {
    const gb = (damageState.gearbox || 100) / 100;
    // Perfect at 100hp; catastrophic shift failures below 20hp
    if (gb > 0.8) return 1.0;
    if (gb > 0.5) return lerp(0.85, 1.0, (gb - 0.5) / 0.3);
    if (gb > 0.2) return lerp(0.40, 0.85, (gb - 0.2) / 0.3);
    return lerp(0.05, 0.40, gb / 0.2);
  }

  /**
   * Fuel leak rate (L/s) from fuel system damage.
   */
  function fuelLeakRate(damageState) {
    const fuel = (damageState.fuel || 100) / 100;
    if (fuel > 0.70) return 0;
    if (fuel > 0.40) return lerp(0, 0.005, (0.70 - fuel) / 0.30);
    if (fuel > 0.10) return lerp(0.005, 0.05, (0.40 - fuel) / 0.30);
    return 0.10; // severe leak
  }

  /**
   * Aerodynamic drag increase from body damage.
   */
  function bodyDragIncrease(damageState) {
    const body = (damageState.body || 100) / 100;
    // Crumpled panels increase Cd
    return lerp(0.25, 0, body); // up to 25% more drag when destroyed
  }

  // ────────────────────────────────────────────────────────
  // Structural integrity
  // ────────────────────────────────────────────────────────

  /**
   * Overall structural integrity score 0–100.
   */
  function structuralIntegrity(damageState) {
    const keys = ['body', 'suspension', 'frontWheel', 'rearWheel'];
    const avg  = keys.reduce((s, k) => s + (damageState[k] || 100), 0) / keys.length;
    return avg;
  }

  /**
   * Chassis flex from structural damage — affects suspension geometry.
   * Returns lateral flex coefficient (0 = rigid, 1 = floppy).
   */
  function chassisFlexCoefficient(damageState) {
    const si = structuralIntegrity(damageState) / 100;
    return Math.pow(1 - si, 2); // quadratic — severe above 50% damage
  }

  // ────────────────────────────────────────────────────────
  // Visual damage
  // ────────────────────────────────────────────────────────

  /**
   * Visual damage level descriptor.
   */
  function visualDamageLevel(damageState) {
    const bodyHp = damageState.body || 100;
    for (const level of VISUAL_LEVELS) {
      if (bodyHp >= level.minBodyHp) return { ...level };
    }
    return { ...VISUAL_LEVELS[VISUAL_LEVELS.length - 1] };
  }

  /**
   * Per-panel deformation map (0 = pristine, 1 = destroyed).
   * Useful for driving visual mesh deformation.
   */
  function panelDeformationMap(damageState) {
    return {
      hood:       1 - clamp((damageState.engine  || 100) / 100, 0, 1),
      frontBumper:1 - clamp((damageState.frontWheel || 100) / 100, 0, 1),
      rearBumper: 1 - clamp((damageState.rearWheel  || 100) / 100, 0, 1),
      leftDoor:   1 - clamp((damageState.body        || 100) / 100, 0, 1),
      rightDoor:  1 - clamp((damageState.body        || 100) / 100, 0, 1),
      roof:       1 - clamp((damageState.body        || 100) / 100, 0, 1) * 0.6,
      underside:  1 - clamp((damageState.suspension  || 100) / 100, 0, 1),
    };
  }

  // ────────────────────────────────────────────────────────
  // Repair cost
  // ────────────────────────────────────────────────────────

  /**
   * Total repair cost in game currency.
   */
  function repairCost(damageState) {
    let total = 0;
    for (const [key, comp] of Object.entries(COMPONENTS)) {
      const current = damageState[key] !== undefined ? damageState[key] : 100;
      const missing = 100 - current;
      total += missing * comp.repairCostPerHp;
    }
    return Math.round(total);
  }

  /**
   * Partial repair: restore all components by a fixed HP amount (clamp to 100).
   */
  function partialRepair(damageState, hpRestored) {
    const result = {};
    for (const key of Object.keys(COMPONENTS)) {
      const cur = damageState[key] !== undefined ? damageState[key] : 100;
      result[key] = Math.min(100, cur + hpRestored);
    }
    return result;
  }

  /**
   * Full repair — reset everything to 100.
   */
  function fullRepair() {
    const result = {};
    for (const key of Object.keys(COMPONENTS)) result[key] = 100;
    return result;
  }

  // ────────────────────────────────────────────────────────
  // Damage history
  // ────────────────────────────────────────────────────────

  /**
   * Create a new damage session log.
   */
  function createDamageLog() {
    return { entries: [], totalForce: 0, impacts: 0 };
  }

  /**
   * Append an impact log entry.
   */
  function logImpact(damageLog, logEntry) {
    if (!logEntry) return damageLog;
    return {
      entries: [...damageLog.entries, logEntry],
      totalForce: damageLog.totalForce + logEntry.forceN,
      impacts: damageLog.impacts + 1,
    };
  }

  /**
   * Summarise a damage log.
   */
  function summariseDamageLog(damageLog) {
    const bySeverity = { soft: 0, hard: 0, severe: 0 };
    const byZone     = {};
    for (const entry of damageLog.entries) {
      bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
      byZone[entry.zone]         = (byZone[entry.zone]         || 0) + 1;
    }
    return {
      totalImpacts: damageLog.impacts,
      totalForce:   Math.round(damageLog.totalForce),
      bySeverity, byZone,
      avgForce: damageLog.impacts > 0
        ? Math.round(damageLog.totalForce / damageLog.impacts) : 0,
    };
  }

  // ────────────────────────────────────────────────────────
  // Combined per-tick update
  // ────────────────────────────────────────────────────────

  /**
   * Create a fresh damage state.
   */
  function createDamageState() {
    return fullRepair();
  }

  /**
   * Derive all performance multipliers from current damage state.
   */
  function performanceMultipliers(damageState) {
    return {
      power:        powerMultiplier(damageState),
      handling:     handlingMultiplier(damageState),
      steering:     steeringMultiplier(damageState),
      traction:     tractionMultiplier(damageState),
      shiftSuccess: shiftSuccessProbability(damageState),
      fuelLeak:     fuelLeakRate(damageState),
      dragIncrease: bodyDragIncrease(damageState),
      integrity:    structuralIntegrity(damageState),
      chassisFlex:  chassisFlexCoefficient(damageState),
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    COMPONENTS,
    DAMAGE_ZONES,
    VISUAL_LEVELS,
    SOFT_THRESHOLD,
    HARD_THRESHOLD,
    SEVERE_THRESHOLD,
    createDamageState,
    createDamageLog,
    impactForce,
    impactSeverity,
    applyImpact,
    logImpact,
    summariseDamageLog,
    powerMultiplier,
    handlingMultiplier,
    steeringMultiplier,
    tractionMultiplier,
    shiftSuccessProbability,
    fuelLeakRate,
    bodyDragIncrease,
    structuralIntegrity,
    chassisFlexCoefficient,
    visualDamageLevel,
    panelDeformationMap,
    repairCost,
    partialRepair,
    fullRepair,
    performanceMultipliers,
  };
})();

// ============================================================
// TERRAIN_PHYSICS — Surface Material Database & Traction Model
// ============================================================
const TERRAIN_PHYSICS = (() => {
  'use strict';

  // ── Surface material database ─────────────────────────────
  const SURFACES = {
    asphalt: {
      mu_static:  0.90, mu_dynamic: 0.75, rollingResist: 1.00,
      deformable: false, hardness: 9, dustThreshold: 60,
      suspRebound: 1.00, slopeResist: 1.00,
      label: 'Asphalt',
    },
    concrete: {
      mu_static:  0.88, mu_dynamic: 0.73, rollingResist: 1.05,
      deformable: false, hardness: 10, dustThreshold: 80,
      suspRebound: 1.10, slopeResist: 1.00,
      label: 'Concrete',
    },
    dirt: {
      mu_static:  0.65, mu_dynamic: 0.52, rollingResist: 1.50,
      deformable: true,  hardness: 4, dustThreshold: 30,
      suspRebound: 0.85, slopeResist: 1.20,
      label: 'Dirt',
    },
    gravel: {
      mu_static:  0.60, mu_dynamic: 0.50, rollingResist: 1.70,
      deformable: true,  hardness: 5, dustThreshold: 25,
      suspRebound: 0.80, slopeResist: 1.30,
      label: 'Gravel',
    },
    sand: {
      mu_static:  0.45, mu_dynamic: 0.38, rollingResist: 2.10,
      deformable: true,  hardness: 2, dustThreshold: 15,
      suspRebound: 0.65, slopeResist: 1.60,
      label: 'Sand',
    },
    mud: {
      mu_static:  0.35, mu_dynamic: 0.28, rollingResist: 2.70,
      deformable: true,  hardness: 1, dustThreshold: Infinity,
      suspRebound: 0.55, slopeResist: 1.90,
      label: 'Mud',
    },
    ice: {
      mu_static:  0.12, mu_dynamic: 0.08, rollingResist: 0.80,
      deformable: false, hardness: 7, dustThreshold: Infinity,
      suspRebound: 1.20, slopeResist: 0.70,
      label: 'Ice',
    },
    water: {
      mu_static:  0.20, mu_dynamic: 0.15, rollingResist: 1.40,
      deformable: false, hardness: 0, dustThreshold: Infinity,
      suspRebound: 0.70, slopeResist: 1.10,
      label: 'Water',
    },
    grass: {
      mu_static:  0.55, mu_dynamic: 0.44, rollingResist: 1.55,
      deformable: true,  hardness: 3, dustThreshold: 40,
      suspRebound: 0.80, slopeResist: 1.25,
      label: 'Grass',
    },
    snow: {
      mu_static:  0.25, mu_dynamic: 0.18, rollingResist: 1.85,
      deformable: true,  hardness: 2, dustThreshold: Infinity,
      suspRebound: 0.75, slopeResist: 1.40,
      label: 'Snow',
    },
    rock: {
      mu_static:  0.80, mu_dynamic: 0.65, rollingResist: 1.60,
      deformable: false, hardness: 10, dustThreshold: 50,
      suspRebound: 1.30, slopeResist: 1.10,
      label: 'Rock',
    },
  };

  // ── Seasonal modifiers ────────────────────────────────────
  const SEASONAL_MODIFIERS = {
    spring: { mud: { mu_static: 0.28, mu_dynamic: 0.22, rollingResist: 3.10 },
              dirt: { mu_static: 0.55, mu_dynamic: 0.44 } },
    summer: { asphalt: { mu_static: 0.85 },   // hot asphalt slightly lower
              sand: { rollingResist: 2.30 } },  // dry loose sand
    autumn: { grass: { mu_static: 0.45, mu_dynamic: 0.36 },
              dirt:  { mu_static: 0.58, mu_dynamic: 0.46 } },
    winter: { asphalt: { mu_static: 0.60, mu_dynamic: 0.48 },
              concrete: { mu_static: 0.55, mu_dynamic: 0.44 },
              grass: { mu_static: 0.30, mu_dynamic: 0.22 } },
  };

  // ── Rut / deformation parameters ─────────────────────────
  const DEFORM_RATE       = 0.00008; // per Newton per second
  const MAX_RUT_DEPTH     = 0.12;    // metres
  const RUT_RECOVERY_RATE = 0.00002; // per second (mud/sand dry out)

  // ── Dust generation constants ─────────────────────────────
  const DUST_SPEED_SCALE  = 0.04;  // dust intensity per m/s
  const DUST_LOFT_HEIGHT  = 1.5;   // metres above surface

  // ── Puddle constants ──────────────────────────────────────
  const PUDDLE_MAX_DEPTH  = 0.08;  // metres
  const PUDDLE_DRAIN_RATE = 0.0005; // m/s drainage

  // ────────────────────────────────────────────────────────
  // Utility
  // ────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

  // ────────────────────────────────────────────────────────
  // Surface lookup with season override
  // ────────────────────────────────────────────────────────

  /**
   * Get effective surface parameters for a given season.
   */
  function getSurface(surfaceKey, season = 'summer') {
    const base = SURFACES[surfaceKey] || SURFACES.asphalt;
    const mod  = (SEASONAL_MODIFIERS[season] || {})[surfaceKey] || {};
    return { ...base, ...mod };
  }

  // ────────────────────────────────────────────────────────
  // Friction
  // ────────────────────────────────────────────────────────

  /**
   * Friction force using Coulomb + viscous model.
   * @param {number} normalForce  N
   * @param {string} surface      key
   * @param {number} slipSpeed    m/s (0 = static, >0 = kinetic)
   * @param {string} season
   * @param {number} wetness      0–1
   * @returns {number} friction force N
   */
  function frictionForce(normalForce, surface, slipSpeed, season = 'summer', wetness = 0) {
    const s    = getSurface(surface, season);
    // Transition smoothly from static to dynamic
    const t    = clamp(slipSpeed / 0.5, 0, 1);
    const mu   = lerp(s.mu_static, s.mu_dynamic, t);

    // Wet friction reduction (more pronounced on hard surfaces)
    const wetFactor = (surface === 'asphalt' || surface === 'concrete')
      ? lerp(1.0, 0.55, wetness)
      : lerp(1.0, 0.80, wetness);

    return normalForce * mu * wetFactor;
  }

  /**
   * Friction coefficient directly.
   */
  function frictionCoeff(surface, slipSpeed, season = 'summer', wetness = 0) {
    const s      = getSurface(surface, season);
    const t      = clamp(slipSpeed / 0.5, 0, 1);
    const mu     = lerp(s.mu_static, s.mu_dynamic, t);
    const wetFac = (surface === 'asphalt' || surface === 'concrete')
      ? lerp(1.0, 0.55, wetness) : lerp(1.0, 0.80, wetness);
    return mu * wetFac;
  }

  // ────────────────────────────────────────────────────────
  // Slope resistance
  // ────────────────────────────────────────────────────────

  /**
   * Additional resistance force on a slope, modified by surface.
   * @param {number} massKg
   * @param {number} slopeAngleDeg  positive = uphill
   * @param {string} surface
   * @param {string} season
   * @returns {number} N (positive resists motion uphill, negative = gravity assist)
   */
  function slopeResistance(massKg, slopeAngleDeg, surface, season = 'summer') {
    const s    = getSurface(surface, season);
    const rad  = slopeAngleDeg * Math.PI / 180;
    const base = massKg * 9.81 * Math.sin(rad);
    return base * s.slopeResist;
  }

  // ────────────────────────────────────────────────────────
  // Deformation (ruts)
  // ────────────────────────────────────────────────────────

  /**
   * Update rut depth in a deformable surface.
   * @param {number} rutDepth     current metres
   * @param {number} load         N
   * @param {string} surface
   * @param {number} dt           seconds
   * @returns {number} new rut depth metres
   */
  function updateRutDepth(rutDepth, load, surface, dt) {
    const s = getSurface(surface);
    if (!s.deformable) return 0;
    // Harder surfaces deform less
    const hardnessFactor = (10 - s.hardness) / 10;
    const growth = load * DEFORM_RATE * hardnessFactor * dt;
    const recovery = rutDepth * RUT_RECOVERY_RATE * dt;
    return clamp(rutDepth + growth - recovery, 0, MAX_RUT_DEPTH);
  }

  /**
   * Speed penalty from rut depth (ruts slow vehicle and reduce handling).
   * @returns {{ speedMult: number, handlingMult: number }}
   */
  function rutPenalty(rutDepth) {
    const normalized = clamp(rutDepth / MAX_RUT_DEPTH, 0, 1);
    return {
      speedMult:    lerp(1.0, 0.70, normalized),
      handlingMult: lerp(1.0, 0.55, normalized),
    };
  }

  // ────────────────────────────────────────────────────────
  // Suspension rebound
  // ────────────────────────────────────────────────────────

  /**
   * Suspension rebound factor for the surface.
   * Hard surfaces cause higher rebound (more bounce).
   */
  function suspensionRebound(surface, season = 'summer') {
    return getSurface(surface, season).suspRebound;
  }

  // ────────────────────────────────────────────────────────
  // Dust generation
  // ────────────────────────────────────────────────────────

  /**
   * Dust intensity (0–1) for particle effects.
   * @param {number} speed   m/s
   * @param {string} surface
   * @param {number} wetness 0–1 (wet suppresses dust)
   * @returns {number} 0–1
   */
  function dustIntensity(speed, surface, wetness = 0) {
    const s = getSurface(surface);
    if (!s.deformable || speed < s.dustThreshold * 0.1) return 0;
    const speedFactor = clamp((speed - s.dustThreshold * 0.1) * DUST_SPEED_SCALE, 0, 1);
    return speedFactor * (1 - wetness);
  }

  /**
   * Dust loft height at a given speed.
   */
  function dustLoftHeight(speed) {
    return DUST_LOFT_HEIGHT * clamp(speed / 30, 0, 1);
  }

  // ────────────────────────────────────────────────────────
  // Puddle simulation
  // ────────────────────────────────────────────────────────

  /**
   * Update puddle depth over time (rain adds, drainage removes).
   * @param {number} puddleDepth metres
   * @param {number} rainRateMmH mm/hour
   * @param {number} dt          seconds
   * @returns {number} new depth metres
   */
  function updatePuddleDepth(puddleDepth, rainRateMmH, dt) {
    const rainMs   = rainRateMmH / (1000 * 3600); // m/s fill rate
    const drainage = PUDDLE_DRAIN_RATE;
    return clamp(puddleDepth + (rainMs - drainage) * dt, 0, PUDDLE_MAX_DEPTH);
  }

  /**
   * Spray intensity behind vehicle on wet surface.
   */
  function wheelSprayIntensity(speed, puddleDepth) {
    if (puddleDepth < 0.002) return 0;
    return clamp(speed / 25, 0, 1) * clamp(puddleDepth / 0.03, 0, 1);
  }

  // ────────────────────────────────────────────────────────
  // Surface transition blending
  // ────────────────────────────────────────────────────────

  /**
   * Blend two surface friction coefficients over a transition zone.
   * @param {string} surfA
   * @param {string} surfB
   * @param {number} t     0=surfA, 1=surfB
   * @param {number} slip  m/s
   * @param {string} season
   * @param {number} wetness
   * @returns {number} blended mu
   */
  function blendedFriction(surfA, surfB, t, slip, season = 'summer', wetness = 0) {
    const muA = frictionCoeff(surfA, slip, season, wetness);
    const muB = frictionCoeff(surfB, slip, season, wetness);
    // Cubic ease for smoother transition
    const ease = t * t * (3 - 2 * t);
    return lerp(muA, muB, ease);
  }

  /**
   * Blend two surface rolling resistance coefficients.
   */
  function blendedRollingResist(surfA, surfB, t, season = 'summer') {
    const rA = getSurface(surfA, season).rollingResist;
    const rB = getSurface(surfB, season).rollingResist;
    return lerp(rA, rB, t * t * (3 - 2 * t));
  }

  // ────────────────────────────────────────────────────────
  // Texture-based traction variation
  // ────────────────────────────────────────────────────────

  /**
   * Pseudo-random traction variation from surface texture.
   * Use world-space position to drive micro-variation.
   * @param {number} x, z world coords
   * @param {string} surface
   * @returns {number} traction multiplier near 1.0
   */
  function textureVariation(x, z, surface) {
    const s = getSurface(surface);
    // Harder surfaces have less texture variation
    const amplitude = (10 - s.hardness) * 0.008;
    // Simple hash-based pseudo-noise
    const nx = Math.sin(x * 0.37 + z * 0.13) * 43758.5453;
    const nz = Math.sin(x * 0.19 + z * 0.41) * 93651.3371;
    const n  = (Math.sin(nx + nz) * 0.5 + 0.5) * 2 - 1;
    return 1.0 + n * amplitude;
  }

  // ────────────────────────────────────────────────────────
  // Complete terrain state for a tick
  // ────────────────────────────────────────────────────────

  /**
   * Full terrain physics output for the current frame.
   * @param {Object} vehicle   { massKg, speed, load, slipSpeed }
   * @param {Object} terrain   { surface, season, wetness, puddleDepth,
   *                             slopeAngleDeg, rutDepth, x, z }
   * @param {number} dt
   * @returns {Object}
   */
  function computeTerrainState(vehicle, terrain, dt) {
    const { massKg, speed, load, slipSpeed } = vehicle;
    const { surface, season, wetness, puddleDepth, slopeAngleDeg, rutDepth, x, z } = terrain;

    const mu          = frictionCoeff(surface, slipSpeed || 0, season, wetness);
    const texVar      = textureVariation(x || 0, z || 0, surface);
    const effMu       = mu * texVar;
    const friction    = load * effMu;
    const slope       = slopeResistance(massKg, slopeAngleDeg || 0, surface, season);
    const newRut      = updateRutDepth(rutDepth || 0, load, surface, dt);
    const rut         = rutPenalty(newRut);
    const dust        = dustIntensity(speed, surface, wetness);
    const spray       = wheelSprayIntensity(speed, puddleDepth || 0);
    const suspReb     = suspensionRebound(surface, season);
    const surf        = getSurface(surface, season);

    return {
      frictionForceN:   friction,
      frictionCoeff:    effMu,
      slopeResistanceN: slope,
      rutDepth:         newRut,
      rutSpeedMult:     rut.speedMult,
      rutHandlingMult:  rut.handlingMult,
      dustIntensity:    dust,
      sprayIntensity:   spray,
      suspensionRebound: suspReb,
      rollingResistMult: surf.rollingResist,
      isDeformable:     surf.deformable,
      surfaceLabel:     surf.label,
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    SURFACES,
    SEASONAL_MODIFIERS,
    getSurface,
    frictionForce,
    frictionCoeff,
    slopeResistance,
    updateRutDepth,
    rutPenalty,
    suspensionRebound,
    dustIntensity,
    dustLoftHeight,
    updatePuddleDepth,
    wheelSprayIntensity,
    blendedFriction,
    blendedRollingResist,
    textureVariation,
    computeTerrainState,
  };
})();

// ============================================================
// WIND_PHYSICS — Wind Simulation & Atmospheric Effects
// ============================================================
const WIND_PHYSICS = (() => {
  'use strict';

  // ── Beaufort scale ────────────────────────────────────────
  const BEAUFORT = [
    { scale: 0,  label: 'Calm',            speedMs: [0.0,  0.2],  gameEffect: 'none'     },
    { scale: 1,  label: 'Light Air',       speedMs: [0.3,  1.5],  gameEffect: 'leaves'   },
    { scale: 2,  label: 'Light Breeze',    speedMs: [1.6,  3.3],  gameEffect: 'leaves'   },
    { scale: 3,  label: 'Gentle Breeze',   speedMs: [3.4,  5.4],  gameEffect: 'flags'    },
    { scale: 4,  label: 'Moderate Breeze', speedMs: [5.5,  7.9],  gameEffect: 'branches' },
    { scale: 5,  label: 'Fresh Breeze',    speedMs: [8.0, 10.7],  gameEffect: 'branches' },
    { scale: 6,  label: 'Strong Breeze',   speedMs: [10.8,13.8],  gameEffect: 'trees'    },
    { scale: 7,  label: 'Near Gale',       speedMs: [13.9,17.1],  gameEffect: 'trees'    },
    { scale: 8,  label: 'Gale',            speedMs: [17.2,20.7],  gameEffect: 'debris'   },
    { scale: 9,  label: 'Strong Gale',     speedMs: [20.8,24.4],  gameEffect: 'debris'   },
    { scale: 10, label: 'Storm',           speedMs: [24.5,28.4],  gameEffect: 'storm'    },
    { scale: 11, label: 'Violent Storm',   speedMs: [28.5,32.6],  gameEffect: 'storm'    },
    { scale: 12, label: 'Hurricane',       speedMs: [32.7,999 ],  gameEffect: 'hurricane'},
  ];

  // ── Gust model constants ──────────────────────────────────
  const GUST_DURATION_MIN  = 2.0;   // seconds
  const GUST_DURATION_MAX  = 8.0;
  const GUST_AMPLITUDE     = 0.40;  // fraction above mean speed
  const GUST_FREQUENCY     = 0.07;  // gusts per second base rate

  // ── Wind shadow zones (terrain features) ──────────────────
  const SHADOW_RECOVERY_DISTANCE = 30; // metres before wind resumes

  // ── Micro-turbulence constants ────────────────────────────
  const MICRO_TURB_HEIGHT  = 2.0;   // metres above ground
  const MICRO_TURB_SCALE   = 0.15;  // fraction of wind speed

  // ── Vegetation sway thresholds (m/s) ─────────────────────
  const VEG_SWAY = {
    grass:    { start: 2,  full: 8  },
    shrub:    { start: 3,  full: 12 },
    tree:     { start: 5,  full: 18 },
    conifer:  { start: 6,  full: 20 },
  };

  // ────────────────────────────────────────────────────────
  // Utility
  // ────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** Wrap angle to [0, 360) */
  function wrapAngle(deg) { return ((deg % 360) + 360) % 360; }

  // ────────────────────────────────────────────────────────
  // Beaufort classification
  // ────────────────────────────────────────────────────────

  function classifyBeaufort(speedMs) {
    for (let i = BEAUFORT.length - 1; i >= 0; i--) {
      if (speedMs >= BEAUFORT[i].speedMs[0]) return { ...BEAUFORT[i] };
    }
    return { ...BEAUFORT[0] };
  }

  // ────────────────────────────────────────────────────────
  // Wind state (persistent simulation)
  // ────────────────────────────────────────────────────────

  /**
   * Create initial wind state.
   * @param {number} meanSpeed    m/s
   * @param {number} directionDeg 0=North, 90=East, …
   */
  function createWindState(meanSpeed = 5, directionDeg = 270) {
    return {
      meanSpeed,
      directionDeg,
      currentSpeed:     meanSpeed,
      currentDirection: directionDeg,
      gustTimer:        0,
      gustDuration:     0,
      gustAmplitude:    0,
      stormPhase:       0,    // 0–1, building storm
      isStorming:       false,
    };
  }

  // ────────────────────────────────────────────────────────
  // Gust simulation
  // ────────────────────────────────────────────────────────

  /**
   * Pseudo-random deterministic noise at a given time.
   */
  function windNoise(t, seed = 1337) {
    const s = Math.sin(t * 0.73 + seed) * 43758.5453 +
              Math.sin(t * 1.37 + seed * 0.5) * 22134.6 +
              Math.cos(t * 0.29 + seed * 1.3) * 18793.4;
    return (s - Math.floor(s)) * 2 - 1; // -1 to 1
  }

  /**
   * Advance wind simulation by dt seconds.
   * @param {Object} state   wind state from createWindState / previous tick
   * @param {number} dt      seconds
   * @param {number} timeNow absolute time seconds (for noise)
   * @returns {Object} updated wind state
   */
  function tickWind(state, dt, timeNow) {
    let { meanSpeed, directionDeg, currentSpeed, currentDirection,
          gustTimer, gustDuration, gustAmplitude, stormPhase, isStorming } = state;

    // ─ Storm progression ─
    if (isStorming) {
      stormPhase = Math.min(1, stormPhase + dt * 0.01);
      meanSpeed  = lerp(meanSpeed, 30, stormPhase * 0.005);
    } else {
      stormPhase = Math.max(0, stormPhase - dt * 0.005);
    }

    // ─ Gust logic ─
    gustTimer -= dt;
    if (gustTimer <= 0) {
      // Roll for a new gust
      const roll = (windNoise(timeNow * 0.1) + 1) * 0.5;
      if (roll < GUST_FREQUENCY * dt) {
        gustDuration  = lerp(GUST_DURATION_MIN, GUST_DURATION_MAX,
                             (windNoise(timeNow * 0.23) + 1) * 0.5);
        gustAmplitude = GUST_AMPLITUDE * ((windNoise(timeNow * 0.41) + 1) * 0.5 + 0.5);
        gustTimer     = gustDuration;
      } else {
        gustAmplitude = Math.max(0, gustAmplitude - dt * 0.3);
      }
    }

    // Gust speed envelope
    const gustProgress = 1 - clamp(gustTimer / (gustDuration || 1), 0, 1);
    const gustEnvelope = (gustProgress < 0.2)
      ? smoothstep(0, 0.2, gustProgress)
      : (gustProgress < 0.8)
        ? 1
        : smoothstep(1, 0.8, gustProgress);
    const gustSpeed = meanSpeed * gustAmplitude * gustEnvelope;

    // Background turbulence
    const turbulence = windNoise(timeNow * 1.7) * meanSpeed * 0.08;

    currentSpeed = Math.max(0, meanSpeed + gustSpeed + turbulence);

    // Direction wanders slowly
    const dirDrift = windNoise(timeNow * 0.05) * 15; // ±15°
    currentDirection = wrapAngle(directionDeg + dirDrift);

    return {
      meanSpeed, directionDeg, currentSpeed, currentDirection,
      gustTimer, gustDuration, gustAmplitude, stormPhase, isStorming,
      beaufort: classifyBeaufort(currentSpeed),
    };
  }

  // ────────────────────────────────────────────────────────
  // Force on vehicle
  // ────────────────────────────────────────────────────────

  /**
   * Headwind/tailwind speed component along vehicle heading.
   * @param {number} windSpeed     m/s
   * @param {number} windDirDeg    direction wind comes FROM
   * @param {number} vehicleHeadDeg vehicle facing direction
   * @returns {number} speed m/s (positive = headwind, negative = tailwind)
   */
  function headwindComponent(windSpeed, windDirDeg, vehicleHeadDeg) {
    const relAngle = wrapAngle(windDirDeg - vehicleHeadDeg + 180);
    return windSpeed * Math.cos(relAngle * Math.PI / 180);
  }

  /**
   * Crosswind component perpendicular to vehicle heading.
   * @returns {number} m/s (positive = wind from right)
   */
  function crosswindComponent(windSpeed, windDirDeg, vehicleHeadDeg) {
    const relAngle = wrapAngle(windDirDeg - vehicleHeadDeg + 180);
    return windSpeed * Math.sin(relAngle * Math.PI / 180);
  }

  /**
   * Lateral force on vehicle from crosswind.
   * @param {number} crosswindMs   m/s
   * @param {number} vehicleSpeedMs m/s
   * @param {number} vehicleMassKg
   * @param {number} sideArea      m² (approx vehicle side area)
   * @param {number} rho           air density kg/m³
   * @returns {number} N
   */
  function crosswindLateralForce(crosswindMs, vehicleSpeedMs, vehicleMassKg,
                                  sideArea = 4.0, rho = 1.225) {
    const Cy        = 0.70;
    const relWind   = crosswindMs - vehicleSpeedMs * 0.1; // slight drag reduction at speed
    return 0.5 * rho * Cy * sideArea * relWind * Math.abs(relWind);
  }

  /**
   * Speed effect from headwind/tailwind (added to aerodynamic drag/thrust).
   * Headwind effectively increases airspeed → more drag.
   * @returns {number} effective air speed m/s (combine with vehicle speed for drag)
   */
  function effectiveAirspeed(vehicleSpeedMs, headwindMs) {
    return vehicleSpeedMs + headwindMs;
  }

  // ────────────────────────────────────────────────────────
  // Wind shadow
  // ────────────────────────────────────────────────────────

  /**
   * Wind reduction in the shadow of a terrain feature.
   * @param {number} distancePastFeatureM  metres past the obstacle
   * @param {number} featureHeightM
   * @returns {number} wind multiplier 0–1
   */
  function windShadowMultiplier(distancePastFeatureM, featureHeightM) {
    const shadowLength = featureHeightM * 8; // rough rule of thumb
    if (distancePastFeatureM >= shadowLength) return 1.0;
    return smoothstep(shadowLength, 0, distancePastFeatureM);
  }

  /**
   * Wind recovery distance after leaving shadow.
   */
  function windRecoveryFactor(distanceFromShadowEdgeM) {
    return smoothstep(0, SHADOW_RECOVERY_DISTANCE, distanceFromShadowEdgeM);
  }

  // ────────────────────────────────────────────────────────
  // Micro-turbulence near ground
  // ────────────────────────────────────────────────────────

  /**
   * Micro-turbulence speed variation near ground level.
   * @param {number} heightM    vehicle CoG height above ground
   * @param {number} windSpeedMs
   * @param {number} timeNow
   * @returns {number} speed variation m/s
   */
  function microTurbulenceVariation(heightM, windSpeedMs, timeNow) {
    if (heightM > MICRO_TURB_HEIGHT) return 0;
    const heightFactor = 1 - heightM / MICRO_TURB_HEIGHT;
    const noise        = Math.sin(timeNow * 3.7) * Math.cos(timeNow * 2.1) * 0.6
                       + Math.sin(timeNow * 7.3) * 0.4;
    return windSpeedMs * MICRO_TURB_SCALE * heightFactor * noise;
  }

  // ────────────────────────────────────────────────────────
  // Vegetation sway
  // ────────────────────────────────────────────────────────

  /**
   * Sway amplitude factor (0–1) for a vegetation type.
   */
  function vegetationSwayFactor(vegType, windSpeedMs) {
    const thresholds = VEG_SWAY[vegType] || VEG_SWAY.tree;
    return smoothstep(thresholds.start, thresholds.full, windSpeedMs);
  }

  /**
   * Sway frequency (Hz) — higher wind = faster sway.
   */
  function vegetationSwayFrequency(vegType, windSpeedMs) {
    const baseFreq = { grass: 2.5, shrub: 1.5, tree: 0.6, conifer: 0.5 };
    const base     = baseFreq[vegType] || 0.6;
    return base * (1 + smoothstep(5, 25, windSpeedMs) * 0.5);
  }

  // ────────────────────────────────────────────────────────
  // Storm system
  // ────────────────────────────────────────────────────────

  /**
   * Trigger a storm on a wind state.
   */
  function triggerStorm(state) {
    return { ...state, isStorming: true, stormPhase: 0 };
  }

  /**
   * Resolve a storm (wind dies back down).
   */
  function resolveStorm(state) {
    return { ...state, isStorming: false };
  }

  /**
   * Storm rain rate estimate in mm/h based on wind speed.
   */
  function stormRainRate(windSpeedMs) {
    if (windSpeedMs < 10) return 0;
    if (windSpeedMs < 20) return lerp(2, 20,  (windSpeedMs - 10) / 10);
    if (windSpeedMs < 30) return lerp(20, 60, (windSpeedMs - 20) / 10);
    return lerp(60, 120, clamp((windSpeedMs - 30) / 10, 0, 1));
  }

  // ────────────────────────────────────────────────────────
  // Audio cue data
  // ────────────────────────────────────────────────────────

  /**
   * Wind audio parameters for a given wind state.
   * @returns {{ volume: number, pitch: number, gustVolume: number, ambientLayer: string }}
   */
  function windAudioCues(windState) {
    const { currentSpeed, gustAmplitude, beaufort } = windState;
    const volume = clamp(currentSpeed / 35, 0, 1);
    const pitch  = 0.8 + clamp(currentSpeed / 40, 0, 0.5);
    const gustVol = clamp(gustAmplitude, 0, 1);
    let layer = 'light';
    if (currentSpeed > 20) layer = 'storm';
    else if (currentSpeed > 12) layer = 'moderate';
    else if (currentSpeed > 6)  layer = 'fresh';
    return { volume, pitch, gustVolume: gustVol, ambientLayer: layer };
  }

  /**
   * Wind direction change prediction — returns estimated direction in N seconds.
   */
  function predictWindDirection(state, futureSeconds) {
    const driftPerSec = 15 / 60; // 15° per minute typical
    return wrapAngle(state.currentDirection + driftPerSec * futureSeconds);
  }

  // ────────────────────────────────────────────────────────
  // Full wind frame output
  // ────────────────────────────────────────────────────────

  /**
   * Compute all wind effects for a vehicle frame.
   */
  function computeWindEffects(windState, vehicle, dt, timeNow) {
    const { currentSpeed, currentDirection } = windState;
    const { heading, speedMs, massKg, sideArea, heightM } = vehicle;

    const headwind  = headwindComponent(currentSpeed, currentDirection, heading);
    const crosswind = crosswindComponent(currentSpeed, currentDirection, heading);
    const lateralF  = crosswindLateralForce(crosswind, speedMs, massKg, sideArea);
    const airspeed  = effectiveAirspeed(speedMs, headwind);
    const microTurb = microTurbulenceVariation(heightM || 0.5, currentSpeed, timeNow);
    const audio     = windAudioCues(windState);

    return {
      headwindMs:      headwind,
      crosswindMs:     crosswind,
      lateralForceN:   lateralF,
      effectiveAirspeedMs: airspeed,
      microTurbulenceMs:   microTurb,
      beaufort:        windState.beaufort,
      audio,
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    BEAUFORT,
    VEG_SWAY,
    createWindState,
    tickWind,
    classifyBeaufort,
    headwindComponent,
    crosswindComponent,
    crosswindLateralForce,
    effectiveAirspeed,
    windShadowMultiplier,
    windRecoveryFactor,
    microTurbulenceVariation,
    vegetationSwayFactor,
    vegetationSwayFrequency,
    triggerStorm,
    resolveStorm,
    stormRainRate,
    windAudioCues,
    predictWindDirection,
    computeWindEffects,
  };
})();

// ============================================================
// ENGINE_PHYSICS — Detailed Engine & Drivetrain Simulation
// ============================================================
const ENGINE_PHYSICS = (() => {
  'use strict';

  // ────────────────────────────────────────────────────────
  // Torque curves — [RPM, Nm] lookup tables for each engine type
  // ────────────────────────────────────────────────────────
  const TORQUE_CURVES = {
    v4: [
      [0,0],[500,60],[1000,110],[1500,155],[2000,190],[2500,215],
      [3000,235],[3500,250],[4000,260],[4500,265],[5000,263],
      [5500,255],[6000,240],[6500,218],[7000,190],[7500,160],[8000,120],
    ],
    v6: [
      [0,0],[500,80],[1000,145],[1500,205],[2000,255],[2500,295],
      [3000,325],[3500,348],[4000,365],[4500,375],[5000,378],
      [5500,372],[6000,358],[6500,335],[7000,302],[7500,260],[8000,210],
    ],
    v8: [
      [0,0],[500,100],[1000,190],[1500,270],[2000,340],[2500,398],
      [3000,445],[3500,483],[4000,512],[4500,530],[5000,540],
      [5500,540],[6000,530],[6500,510],[7000,478],[7500,430],[8000,368],
    ],
    v12: [
      [0,0],[500,130],[1000,245],[1500,355],[2000,450],[2500,535],
      [3000,608],[3500,668],[4000,718],[4500,758],[5000,785],
      [5500,798],[6000,798],[6500,783],[7000,750],[7500,700],[8000,630],
    ],
    electric: [
      [0,580],[200,600],[500,610],[1000,610],[2000,608],[3000,600],
      [4000,585],[5000,560],[6000,525],[7000,480],[8000,425],
      [9000,360],[10000,290],[12000,200],[15000,120],
    ],
    diesel: [
      [0,0],[500,130],[800,230],[1000,320],[1500,430],[2000,500],
      [2500,520],[3000,530],[3500,528],[4000,515],[4500,490],
      [5000,455],[5500,405],[6000,345],[6500,275],
    ],
    turbo: [
      [0,0],[500,60],[1000,120],[1500,200],[2000,300],[2200,380],
      [2500,430],[3000,470],[3500,490],[4000,498],[4500,498],
      [5000,490],[5500,475],[6000,450],[6500,415],[7000,368],[7500,300],
    ],
    supercharged: [
      [0,0],[500,90],[1000,170],[1500,250],[2000,325],[2500,390],
      [3000,445],[3500,490],[4000,525],[4500,552],[5000,568],
      [5500,572],[6000,565],[6500,545],[7000,510],[7500,458],[8000,390],
    ],
    hybrid: [
      [0,250],[500,310],[1000,370],[1500,410],[2000,440],[2500,460],
      [3000,475],[3500,488],[4000,498],[4500,505],[5000,508],
      [5500,505],[6000,495],[6500,475],[7000,445],[7500,400],[8000,340],
    ],
    rotary: [
      [0,0],[1000,140],[2000,200],[3000,240],[4000,265],[5000,280],
      [6000,288],[7000,290],[8000,285],[9000,272],[10000,250],
      [11000,220],[12000,180],[13000,130],
    ],
  };

  // ── Power band metadata per engine type ──────────────────
  const ENGINE_META = {
    v4:          { displacement: 1.6, cylinders: 4, idleRpm: 750,  redlineRpm: 7500,  peakPowerRpm: 6000, mass: 120 },
    v6:          { displacement: 3.0, cylinders: 6, idleRpm: 750,  redlineRpm: 7500,  peakPowerRpm: 6200, mass: 160 },
    v8:          { displacement: 5.0, cylinders: 8, idleRpm: 700,  redlineRpm: 7500,  peakPowerRpm: 5800, mass: 200 },
    v12:         { displacement: 6.5, cylinders:12, idleRpm: 650,  redlineRpm: 8000,  peakPowerRpm: 6000, mass: 280 },
    electric:    { displacement: 0,   cylinders: 0, idleRpm: 0,    redlineRpm:15000,  peakPowerRpm: 4000, mass: 220 },
    diesel:      { displacement: 3.0, cylinders: 6, idleRpm: 700,  redlineRpm: 5500,  peakPowerRpm: 3500, mass: 195 },
    turbo:       { displacement: 2.0, cylinders: 4, idleRpm: 800,  redlineRpm: 7000,  peakPowerRpm: 5500, mass: 145 },
    supercharged:{ displacement: 5.0, cylinders: 8, idleRpm: 750,  redlineRpm: 7500,  peakPowerRpm: 6000, mass: 210 },
    hybrid:      { displacement: 2.5, cylinders: 4, idleRpm: 0,    redlineRpm: 7500,  peakPowerRpm: 5500, mass: 180 },
    rotary:      { displacement: 1.3, cylinders: 2, idleRpm: 800,  redlineRpm:12000,  peakPowerRpm: 7000, mass: 105 },
  };

  // ── Gear ratio sets ───────────────────────────────────────
  const GEAR_RATIOS = {
    sport5:   { ratios: [3.82, 2.36, 1.69, 1.30, 1.00],       final: 3.91 },
    sport6:   { ratios: [3.82, 2.36, 1.69, 1.30, 1.03, 0.82], final: 3.73 },
    economy5: { ratios: [4.21, 2.49, 1.66, 1.24, 0.95],       final: 3.58 },
    economy6: { ratios: [4.21, 2.49, 1.66, 1.24, 0.95, 0.77], final: 3.45 },
    truck4:   { ratios: [4.63, 2.83, 1.87, 1.34],             final: 4.10 },
    ev1:      { ratios: [1.00],                                final: 9.80 },
  };

  // ── Turbo model constants ─────────────────────────────────
  const TURBO_SPOOL_RATE   = 0.15;  // boost fraction per second spool-up
  const TURBO_BLEED_RATE   = 0.30;  // fraction per second spool-down
  const TURBO_MAX_BOOST    = 1.45;  // multiplier (45% over atmospheric)
  const TURBO_LAG_RPM      = 2200;  // effective boost onset RPM

  // ── Fuel consumption constants (L/100km base) ─────────────
  const FUEL_EFFICIENCY_BASE = {
    v4: 7.5, v6: 10.0, v8: 14.0, v12: 20.0, electric: 0,
    diesel: 6.5, turbo: 9.0, supercharged: 15.0, hybrid: 5.0, rotary: 11.0,
  };

  // ── Engine temperature model ──────────────────────────────
  const ENGINE_TEMP_COLD    = 20;   // °C
  const ENGINE_TEMP_OPTIMAL = 90;   // °C
  const ENGINE_TEMP_HOT     = 110;  // °C
  const ENGINE_TEMP_OVERH   = 130;  // °C

  // ── Rev limiter ───────────────────────────────────────────
  const REV_LIMITER_CUT_MS  = 80;   // milliseconds fuel cut

  // ── Nitro / boost injection ───────────────────────────────
  const NITRO_POWER_MULT    = 1.60;
  const NITRO_BURN_RATE     = 0.15; // fraction per second
  const NITRO_AFTERBURN_DUR = 1.2;  // seconds

  // ────────────────────────────────────────────────────────
  // Utility
  // ────────────────────────────────────────────────────────

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)    { return a + (b - a) * clamp(t, 0, 1); }

  function lerpCurve(curve, x) {
    if (x <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
      if (x <= curve[i][0]) {
        const t = (x - curve[i-1][0]) / (curve[i][0] - curve[i-1][0]);
        return lerp(curve[i-1][1], curve[i][1], t);
      }
    }
    return curve[curve.length - 1][1];
  }

  // ────────────────────────────────────────────────────────
  // Torque & Power
  // ────────────────────────────────────────────────────────

  /**
   * Interpolated torque at a given RPM from the curve.
   */
  function torqueAtRpm(engineType, rpm) {
    const curve = TORQUE_CURVES[engineType] || TORQUE_CURVES.v4;
    return lerpCurve(curve, rpm);
  }

  /**
   * Power output in kW at a given RPM.
   */
  function powerAtRpm(engineType, rpm) {
    const torque = torqueAtRpm(engineType, rpm);
    return torque * rpm * (Math.PI / 30) / 1000; // kW
  }

  /**
   * Peak torque and power values.
   */
  function enginePeakValues(engineType) {
    const curve = TORQUE_CURVES[engineType] || TORQUE_CURVES.v4;
    let peakTorque = 0, peakTorqueRpm = 0;
    let peakPower  = 0, peakPowerRpm  = 0;
    for (const [rpm, torque] of curve) {
      if (torque > peakTorque) { peakTorque = torque; peakTorqueRpm = rpm; }
      const pwr = torque * rpm * (Math.PI / 30) / 1000;
      if (pwr > peakPower) { peakPower = pwr; peakPowerRpm = rpm; }
    }
    return { peakTorque, peakTorqueRpm, peakPower: Math.round(peakPower), peakPowerRpm };
  }

  // ────────────────────────────────────────────────────────
  // Gear simulation
  // ────────────────────────────────────────────────────────

  /**
   * Wheel torque in a given gear.
   * @param {string} engineType
   * @param {string} gearSetKey
   * @param {number} gear         1-indexed
   * @param {number} rpm
   * @param {number} transmissionEff  0–1 (typical 0.92)
   * @returns {number} Nm at wheels
   */
  function wheelTorque(engineType, gearSetKey, gear, rpm, transmissionEff = 0.92) {
    const gs   = GEAR_RATIOS[gearSetKey] || GEAR_RATIOS.sport6;
    const idx  = clamp(gear - 1, 0, gs.ratios.length - 1);
    const ratio = gs.ratios[idx] * gs.final;
    return torqueAtRpm(engineType, rpm) * ratio * transmissionEff;
  }

  /**
   * Vehicle speed (m/s) at a given RPM and gear.
   * @param {string} gearSetKey
   * @param {number} gear
   * @param {number} rpm
   * @param {number} wheelRadiusM
   * @returns {number} m/s
   */
  function speedAtRpm(gearSetKey, gear, rpm, wheelRadiusM = 0.315) {
    const gs   = GEAR_RATIOS[gearSetKey] || GEAR_RATIOS.sport6;
    const idx  = clamp(gear - 1, 0, gs.ratios.length - 1);
    const ratio = gs.ratios[idx] * gs.final;
    const wheelRpm = rpm / ratio;
    return (wheelRpm / 60) * 2 * Math.PI * wheelRadiusM;
  }

  /**
   * RPM from speed in a given gear.
   */
  function rpmFromSpeed(gearSetKey, gear, speedMs, wheelRadiusM = 0.315) {
    const gs   = GEAR_RATIOS[gearSetKey] || GEAR_RATIOS.sport6;
    const idx  = clamp(gear - 1, 0, gs.ratios.length - 1);
    const ratio = gs.ratios[idx] * gs.final;
    const wheelRpm = speedMs / (2 * Math.PI * wheelRadiusM) * 60;
    return wheelRpm * ratio;
  }

  /**
   * Optimal upshift RPM — shift when power would be higher in next gear.
   */
  function upshiftRpm(engineType, gearSetKey, currentGear) {
    const gs    = GEAR_RATIOS[gearSetKey] || GEAR_RATIOS.sport6;
    const meta  = ENGINE_META[engineType] || ENGINE_META.v4;
    if (currentGear >= gs.ratios.length) return meta.redlineRpm;
    // Find RPM where next-gear power > current-gear power
    const maxRpm = meta.redlineRpm;
    let best = maxRpm * 0.85;
    let bestPowerDiff = -Infinity;
    for (let rpm = 2000; rpm <= maxRpm; rpm += 100) {
      const nextGearRpm = rpm * gs.ratios[currentGear] / gs.ratios[currentGear - 1];
      if (nextGearRpm < 1000) continue;
      const diffPower = powerAtRpm(engineType, nextGearRpm) - powerAtRpm(engineType, rpm) * 0.98;
      if (diffPower > bestPowerDiff) {
        bestPowerDiff = diffPower;
        best = rpm;
      }
    }
    return best;
  }

  /**
   * Optimal downshift RPM.
   */
  function downshiftRpm(engineType) {
    const meta = ENGINE_META[engineType] || ENGINE_META.v4;
    return meta.idleRpm + 500;
  }

  // ────────────────────────────────────────────────────────
  // Clutch slip
  // ────────────────────────────────────────────────────────

  /**
   * Clutch slip fraction during a gear change.
   * @param {number} shiftProgress  0–1 (0=start, 1=complete)
   * @returns {number} 0=full slip, 1=fully engaged
   */
  function clutchEngagement(shiftProgress) {
    if (shiftProgress < 0.2) return 0;
    if (shiftProgress < 0.8) return smoothstep(0.2, 0.8, shiftProgress);
    return 1.0;

    function smoothstep(e0, e1, x) {
      const t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    }
  }

  /**
   * Torque transmitted through a slipping clutch.
   */
  function clutchTransmittedTorque(engineTorque, clutchEng, maxClutchTorque = 600) {
    return Math.min(engineTorque * clutchEng, maxClutchTorque * clutchEng);
  }

  // ────────────────────────────────────────────────────────
  // Engine braking
  // ────────────────────────────────────────────────────────

  // Engine braking torque at a given RPM (overrun condition)
  const ENGINE_BRAKING_COEFF = {
    v4: 0.18, v6: 0.20, v8: 0.22, v12: 0.25,
    electric: 0.45, // regen braking
    diesel: 0.28, turbo: 0.20, supercharged: 0.22,
    hybrid: 0.40, rotary: 0.15,
  };

  /**
   * Engine braking torque (Nm) at wheel in overrun.
   * @param {string} engineType
   * @param {string} gearSetKey
   * @param {number} gear
   * @param {number} rpm
   * @returns {number} N·m (opposing rotation)
   */
  function engineBrakingTorque(engineType, gearSetKey, gear, rpm) {
    const coeff = ENGINE_BRAKING_COEFF[engineType] || 0.20;
    const gs    = GEAR_RATIOS[gearSetKey] || GEAR_RATIOS.sport6;
    const idx   = clamp(gear - 1, 0, gs.ratios.length - 1);
    const ratio  = gs.ratios[idx] * gs.final;
    // Braking torque rises with RPM
    const baseBrake = coeff * Math.max(0, rpm - 1000) * 0.03;
    return baseBrake * ratio;
  }

  // ────────────────────────────────────────────────────────
  // Turbo boost model
  // ────────────────────────────────────────────────────────

  /**
   * Create initial turbo state.
   */
  function createTurboState() {
    return { boost: 0, spooling: false };
  }

  /**
   * Advance turbo state.
   * @param {Object} state    { boost, spooling }
   * @param {number} rpm
   * @param {number} throttle 0–1
   * @param {string} engineType
   * @param {number} dt
   */
  function tickTurbo(state, rpm, throttle, engineType, dt) {
    if (engineType !== 'turbo' && engineType !== 'hybrid') {
      return { boost: 1.0, spooling: false };
    }
    const meta    = ENGINE_META[engineType] || ENGINE_META.turbo;
    const boostRpm = TURBO_LAG_RPM;
    const targetBoost = (rpm >= boostRpm && throttle > 0.3)
      ? lerp(1.0, TURBO_MAX_BOOST, smoothstep(boostRpm, meta.redlineRpm * 0.7, rpm))
      : 1.0;

    const rate = (targetBoost > state.boost) ? TURBO_SPOOL_RATE : TURBO_BLEED_RATE;
    const newBoost = lerp(state.boost, targetBoost, clamp(rate * dt, 0, 1));

    function smoothstep(e0, e1, x) {
      const t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    return { boost: newBoost, spooling: newBoost < targetBoost };
  }

  /**
   * Torque adjusted for turbo boost.
   */
  function boostedTorque(engineType, rpm, boostFactor) {
    const base = torqueAtRpm(engineType, rpm);
    return base * (engineType === 'turbo' ? boostFactor : 1.0);
  }

  // ────────────────────────────────────────────────────────
  // Fuel consumption
  // ────────────────────────────────────────────────────────

  /**
   * Instantaneous fuel consumption rate (L/s).
   * @param {string} engineType
   * @param {number} rpm
   * @param {number} throttle    0–1
   * @param {number} load        0–1 (fraction of max torque demanded)
   * @returns {number} L/s
   */
  function fuelConsumptionRate(engineType, rpm, throttle, load) {
    if (engineType === 'electric') return 0;
    const baseLper100 = FUEL_EFFICIENCY_BASE[engineType] || 10;
    // Crude BSFC model: increases at low RPM and very high load
    const rpmFactor   = lerp(1.6, 1.0, clamp((rpm - 1000) / 4000, 0, 1));
    const loadFactor  = 0.4 + load * 0.9;
    const throttleFactor = 0.1 + throttle * 1.2;
    // Convert L/100km to L/s (assume reference speed 100km/h = 27.78 m/s)
    const refLs = baseLper100 / (100000 / 27.78);
    return refLs * rpmFactor * loadFactor * throttleFactor;
  }

  // ────────────────────────────────────────────────────────
  // Engine temperature model
  // ────────────────────────────────────────────────────────

  /**
   * Update engine temperature.
   * @param {number} temp       current °C
   * @param {number} rpm
   * @param {number} throttle
   * @param {number} speedMs    for air cooling
   * @param {number} ambientC
   * @param {number} dt
   * @returns {number} new temp °C
   */
  function updateEngineTemp(temp, rpm, throttle, speedMs, ambientC = 20, dt = 0.016) {
    const loadHeat    = rpm * throttle * 0.0000025;
    const airCool     = (temp - ambientC) * (0.0003 + speedMs * 0.00004);
    const radCool     = (temp > ENGINE_TEMP_OPTIMAL)
      ? (temp - ENGINE_TEMP_OPTIMAL) * 0.0015 : 0;
    const dTemp       = (loadHeat - airCool - radCool) * dt;
    return temp + dTemp;
  }

  /**
   * Engine power output multiplier based on temperature.
   */
  function engineTempMultiplier(temp) {
    if (temp < ENGINE_TEMP_COLD + 20) return lerp(0.75, 1.0, (temp - ENGINE_TEMP_COLD) / 20);
    if (temp < ENGINE_TEMP_OPTIMAL)   return 1.0;
    if (temp < ENGINE_TEMP_HOT)       return lerp(1.0, 0.97, (temp - ENGINE_TEMP_OPTIMAL) / (ENGINE_TEMP_HOT - ENGINE_TEMP_OPTIMAL));
    if (temp < ENGINE_TEMP_OVERH)     return lerp(0.97, 0.80, (temp - ENGINE_TEMP_HOT) / (ENGINE_TEMP_OVERH - ENGINE_TEMP_HOT));
    return lerp(0.80, 0.30, clamp((temp - ENGINE_TEMP_OVERH) / 30, 0, 1));
  }

  // ────────────────────────────────────────────────────────
  // Rev limiter
  // ────────────────────────────────────────────────────────

  /**
   * Rev limiter state.
   * @param {Object} state  { cutting, cutTimer }
   * @param {number} rpm
   * @param {string} engineType
   * @param {number} dt ms
   * @returns {{ throttleMult: number, state: Object }}
   */
  function revLimiter(state, rpm, engineType, dt) {
    const meta    = ENGINE_META[engineType] || ENGINE_META.v4;
    let { cutting, cutTimer } = state;

    if (rpm >= meta.redlineRpm && !cutting) {
      cutting  = true;
      cutTimer = REV_LIMITER_CUT_MS;
    }
    if (cutting) {
      cutTimer -= dt * 1000;
      if (cutTimer <= 0) { cutting = false; cutTimer = 0; }
    }
    return {
      throttleMult: cutting ? 0 : 1,
      state: { cutting, cutTimer },
    };
  }

  // ────────────────────────────────────────────────────────
  // Nitro / boost injection
  // ────────────────────────────────────────────────────────

  /**
   * Create nitro state.
   */
  function createNitroState(tankFraction = 1.0) {
    return { tank: tankFraction, active: false, afterburnTimer: 0 };
  }

  /**
   * Activate nitro if tank available.
   */
  function activateNitro(state) {
    if (state.tank <= 0) return state;
    return { ...state, active: true };
  }

  /**
   * Advance nitro state.
   */
  function tickNitro(state, throttle, dt) {
    let { tank, active, afterburnTimer } = state;

    if (active && tank > 0) {
      tank          -= NITRO_BURN_RATE * dt;
      afterburnTimer = NITRO_AFTERBURN_DUR;
      if (tank <= 0) { tank = 0; active = false; }
    } else {
      active = false;
    }

    if (!active && afterburnTimer > 0) {
      afterburnTimer = Math.max(0, afterburnTimer - dt);
    }

    const powerMult = active
      ? NITRO_POWER_MULT
      : (afterburnTimer > 0 ? lerp(1.0, NITRO_POWER_MULT, afterburnTimer / NITRO_AFTERBURN_DUR * 0.4) : 1.0);

    return { tank: clamp(tank, 0, 1), active, afterburnTimer, powerMult };
  }

  // ────────────────────────────────────────────────────────
  // Complete engine state per tick
  // ────────────────────────────────────────────────────────

  /**
   * Create initial engine state.
   */
  function createEngineState(engineType = 'v4', gearSet = 'sport6') {
    return {
      engineType,
      gearSet,
      rpm:        (ENGINE_META[engineType] || ENGINE_META.v4).idleRpm,
      gear:       1,
      temp:       ENGINE_TEMP_COLD,
      turbo:      createTurboState(),
      nitro:      createNitroState(),
      revLimState:{ cutting: false, cutTimer: 0 },
      shiftProgress: 1.0, // 1 = fully shifted
      fuelUsed:   0,
    };
  }

  /**
   * Full engine tick.
   * @param {Object} state    engine state
   * @param {Object} inputs   { throttle, braking, targetRpm, speedMs, ambientC, dt }
   * @returns {Object} updated engine state + outputs
   */
  function tickEngine(state, inputs) {
    const { throttle, braking, targetRpm, speedMs, ambientC = 20, dt } = inputs;
    const meta = ENGINE_META[state.engineType] || ENGINE_META.v4;

    // ─ Rev limiter ─
    const rl = revLimiter(state.revLimState, state.rpm, state.engineType, dt);
    const effectiveThrottle = throttle * rl.throttleMult;

    // ─ RPM update ─
    const idleRpm   = meta.idleRpm;
    const rpmTarget = Math.max(idleRpm,
      targetRpm || rpmFromSpeed(state.gearSet, state.gear, speedMs));
    const rpmDelta  = (rpmTarget - state.rpm) * Math.min(1, dt * 8);
    const newRpm    = clamp(state.rpm + rpmDelta, idleRpm, meta.redlineRpm * 1.05);

    // ─ Turbo ─
    const newTurbo  = tickTurbo(state.turbo, newRpm, effectiveThrottle, state.engineType, dt);

    // ─ Engine temperature ─
    const newTemp   = updateEngineTemp(state.temp, newRpm, effectiveThrottle, speedMs, ambientC, dt);
    const tempMult  = engineTempMultiplier(newTemp);

    // ─ Nitro ─
    const newNitro  = tickNitro(state.nitro, effectiveThrottle, dt);

    // ─ Torque & power ─
    const baseTorque  = boostedTorque(state.engineType, newRpm, newTurbo.boost);
    const finalTorque = baseTorque * effectiveThrottle * tempMult * newNitro.powerMult;
    const finalPower  = finalTorque * newRpm * (Math.PI / 30) / 1000;

    // ─ Wheel torque ─
    const wTorque    = wheelTorque(state.engineType, state.gearSet, state.gear,
                                   newRpm, 0.92) * effectiveThrottle * tempMult * newNitro.powerMult;

    // ─ Engine braking ─
    const engBrake = (braking > 0.05 && effectiveThrottle < 0.05)
      ? engineBrakingTorque(state.engineType, state.gearSet, state.gear, newRpm) : 0;

    // ─ Fuel ─
    const load    = clamp(finalTorque / (torqueAtRpm(state.engineType, newRpm) || 1), 0, 1);
    const fuelDt  = fuelConsumptionRate(state.engineType, newRpm, effectiveThrottle, load) * dt;

    return {
      state: {
        ...state,
        rpm:         newRpm,
        temp:        newTemp,
        turbo:       newTurbo,
        nitro:       newNitro,
        revLimState: rl.state,
        fuelUsed:    state.fuelUsed + fuelDt,
      },
      outputs: {
        engineTorque:     finalTorque,
        enginePowerKw:    finalPower,
        wheelTorque:      wTorque,
        engineBrakeTorque: engBrake,
        boostFactor:      newTurbo.boost,
        nitroActive:      newNitro.active,
        nitroPowerMult:   newNitro.powerMult,
        revLimiterCutting: rl.throttleMult === 0,
        fuelConsumptionLs: fuelDt / dt,
        engineTemp:       newTemp,
        tempMultiplier:   tempMult,
      },
    };
  }

  // ── Public API ────────────────────────────────────────────
  return {
    TORQUE_CURVES,
    ENGINE_META,
    GEAR_RATIOS,
    FUEL_EFFICIENCY_BASE,
    createEngineState,
    createTurboState,
    createNitroState,
    tickEngine,
    tickTurbo,
    tickNitro,
    torqueAtRpm,
    powerAtRpm,
    enginePeakValues,
    wheelTorque,
    speedAtRpm,
    rpmFromSpeed,
    upshiftRpm,
    downshiftRpm,
    clutchEngagement,
    clutchTransmittedTorque,
    engineBrakingTorque,
    updateEngineTemp,
    engineTempMultiplier,
    revLimiter,
    activateNitro,
    fuelConsumptionRate,
    boostedTorque,
  };
})();


// ============================================================
// RIGID_BODY_DYNAMICS — Full 2D rigid body simulation
// ============================================================
const RIGID_BODY_DYNAMICS = (() => {
  'use strict';

  const SLEEP_LINEAR_THRESHOLD  = 0.01;  // m/s
  const SLEEP_ANGULAR_THRESHOLD = 0.01;  // rad/s
  const SLEEP_TIME_THRESHOLD    = 0.5;   // seconds before sleeping
  const SUBSTEPS                = 4;
  const SOLVER_ITERATIONS       = 10;
  const BAUMGARTE               = 0.2;
  const SLOP                    = 0.005; // positional slop (m)

  // ── Math helpers ──────────────────────────────────────────
  function v2(x,y){return{x,y};}
  function v2add(a,b){return{x:a.x+b.x,y:a.y+b.y};}
  function v2sub(a,b){return{x:a.x-b.x,y:a.y-b.y};}
  function v2scale(a,s){return{x:a.x*s,y:a.y*s};}
  function v2dot(a,b){return a.x*b.x+a.y*b.y;}
  function v2cross(a,b){return a.x*b.y-a.y*b.x;}
  function v2crossScalar(s,v){return{x:-s*v.y,y:s*v.x};}
  function v2len(a){return Math.sqrt(a.x*a.x+a.y*a.y);}
  function v2norm(a){const l=v2len(a)||1;return{x:a.x/l,y:a.y/l};}
  function v2perp(a){return{x:-a.y,y:a.x};}
  function v2rotate(v,a){const c=Math.cos(a),s=Math.sin(a);return{x:v.x*c-v.y*s,y:v.x*s+v.y*c};}

  // ── Material restitution table ────────────────────────────
  const RESTITUTION_TABLE = {
    metal_metal:   0.3,
    metal_rubber:  0.5,
    rubber_ground: 0.2,
    metal_ground:  0.1,
    wood_metal:    0.25,
    wood_ground:   0.15,
    plastic_metal: 0.35,
    default:       0.2,
  };

  function getRestitution(matA, matB) {
    const key = [matA,matB].sort().join('_');
    return RESTITUTION_TABLE[key] !== undefined ? RESTITUTION_TABLE[key] : RESTITUTION_TABLE.default;
  }

  // ── Friction table (static/kinetic) ──────────────────────
  const FRICTION_TABLE = {
    metal_metal:   {s:0.15,k:0.10},
    rubber_ground: {s:0.85,k:0.70},
    metal_ground:  {s:0.40,k:0.30},
    wood_ground:   {s:0.50,k:0.40},
    default:       {s:0.35,k:0.25},
  };

  function getFriction(matA, matB) {
    const key = [matA,matB].sort().join('_');
    return FRICTION_TABLE[key] || FRICTION_TABLE.default;
  }

  // ── Body creation ─────────────────────────────────────────
  let _bodyId = 0;
  function createBody(opts) {
    const o = opts || {};
    const mass   = o.mass   !== undefined ? o.mass   : 1.0;
    const isStatic = mass === 0;
    return {
      id:           ++_bodyId,
      position:     o.position     || v2(0,0),
      velocity:     o.velocity     || v2(0,0),
      angle:        o.angle        || 0,
      angularVel:   o.angularVel   || 0,
      mass:         mass,
      invMass:      isStatic ? 0 : 1/mass,
      inertia:      o.inertia      || computeInertia(o.shape || {type:'circle',radius:0.5}, mass),
      invInertia:   0,
      force:        v2(0,0),
      torque:       0,
      restitution:  o.restitution  !== undefined ? o.restitution : 0.3,
      staticFric:   o.staticFric   !== undefined ? o.staticFric  : 0.4,
      kineticFric:  o.kineticFric  !== undefined ? o.kineticFric : 0.3,
      material:     o.material     || 'metal',
      shape:        o.shape        || {type:'circle',radius:0.5},
      isStatic:     isStatic,
      isSleeping:   false,
      sleepTimer:   0,
      linearDamp:   o.linearDamp   !== undefined ? o.linearDamp  : 0.01,
      angularDamp:  o.angularDamp  !== undefined ? o.angularDamp : 0.01,
      aabb:         {minX:0,minY:0,maxX:0,maxY:0},
      userData:     o.userData     || null,
    };
  }

  function finalizeBody(body) {
    if (!body.isStatic) {
      body.invInertia = body.inertia > 0 ? 1/body.inertia : 0;
    }
    updateAABB(body);
    return body;
  }

  // ── Inertia for common shapes ─────────────────────────────
  function computeInertia(shape, mass) {
    if (mass === 0) return 0;
    switch (shape.type) {
      case 'circle':  return 0.5 * mass * shape.radius * shape.radius;
      case 'box': {
        const w = shape.width, h = shape.height;
        return (mass / 12) * (w*w + h*h);
      }
      case 'polygon': return computePolygonInertia(shape.vertices, mass);
      default:        return mass;
    }
  }

  function computePolygonInertia(verts, mass) {
    let num = 0, den = 0;
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const j = (i+1) % n;
      const a = verts[i], b = verts[j];
      const cross = Math.abs(v2cross(a, b));
      num += cross * (v2dot(a,a) + v2dot(a,b) + v2dot(b,b));
      den += cross;
    }
    return (mass / 6) * (num / den);
  }

  // ── AABB update ───────────────────────────────────────────
  function updateAABB(body) {
    const s = body.shape, p = body.position, a = body.angle;
    if (s.type === 'circle') {
      const r = s.radius;
      body.aabb = {minX:p.x-r, minY:p.y-r, maxX:p.x+r, maxY:p.y+r};
    } else if (s.type === 'box') {
      const hw = s.width/2, hh = s.height/2;
      const verts = [v2(-hw,-hh),v2(hw,-hh),v2(hw,hh),v2(-hw,hh)];
      let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
      for (const v of verts) {
        const r = v2add(p, v2rotate(v, a));
        if(r.x<mnX)mnX=r.x; if(r.y<mnY)mnY=r.y;
        if(r.x>mxX)mxX=r.x; if(r.y>mxY)mxY=r.y;
      }
      body.aabb = {minX:mnX,minY:mnY,maxX:mxX,maxY:mxY};
    } else if (s.type === 'polygon') {
      let mnX=Infinity,mnY=Infinity,mxX=-Infinity,mxY=-Infinity;
      for (const v of s.vertices) {
        const r = v2add(p, v2rotate(v, a));
        if(r.x<mnX)mnX=r.x; if(r.y<mnY)mnY=r.y;
        if(r.x>mxX)mxX=r.x; if(r.y>mxY)mxY=r.y;
      }
      body.aabb = {minX:mnX,minY:mnY,maxX:mxX,maxY:mxY};
    }
  }

  // ── Broad phase: sweep-and-prune ──────────────────────────
  function broadPhase(bodies) {
    const pairs = [];
    const sorted = bodies.slice().sort((a,b) => a.aabb.minX - b.aabb.minX);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i+1; j < sorted.length; j++) {
        if (sorted[j].aabb.minX > sorted[i].aabb.maxX) break;
        const a = sorted[i].aabb, b = sorted[j].aabb;
        if (a.maxY < b.minY || b.maxY < a.minY) continue;
        if (sorted[i].isStatic && sorted[j].isStatic) continue;
        pairs.push([sorted[i], sorted[j]]);
      }
    }
    return pairs;
  }

  // ── Narrow phase: SAT ─────────────────────────────────────
  function getAxes(body) {
    const s = body.shape, a = body.angle;
    if (s.type === 'circle') return [];
    const verts = s.type === 'box'
      ? [v2(-s.width/2,-s.height/2),v2(s.width/2,-s.height/2),v2(s.width/2,s.height/2),v2(-s.width/2,s.height/2)]
      : s.vertices;
    const axes = [];
    for (let i = 0; i < verts.length; i++) {
      const j = (i+1) % verts.length;
      const edge = v2sub(v2rotate(verts[j],a), v2rotate(verts[i],a));
      axes.push(v2norm(v2perp(edge)));
    }
    return axes;
  }

  function projectShape(body, axis) {
    const s = body.shape, p = body.position, a = body.angle;
    if (s.type === 'circle') {
      const c = v2dot(p, axis);
      return {min: c - s.radius, max: c + s.radius};
    }
    const verts = s.type === 'box'
      ? [v2(-s.width/2,-s.height/2),v2(s.width/2,-s.height/2),v2(s.width/2,s.height/2),v2(-s.width/2,s.height/2)]
      : s.vertices;
    let mn = Infinity, mx = -Infinity;
    for (const v of verts) {
      const proj = v2dot(v2add(p, v2rotate(v,a)), axis);
      if(proj < mn) mn = proj;
      if(proj > mx) mx = proj;
    }
    return {min:mn, max:mx};
  }

  function satTest(bodyA, bodyB) {
    const axes = [...getAxes(bodyA), ...getAxes(bodyB)];
    if (bodyA.shape.type === 'circle' || bodyB.shape.type === 'circle') {
      const aIsCirc = bodyA.shape.type === 'circle';
      const circ = aIsCirc ? bodyA : bodyB;
      const other = aIsCirc ? bodyB : bodyA;
      const cp = closestPointOnShape(other, circ.position);
      const dir = v2sub(circ.position, cp);
      const l = v2len(dir);
      if (l > 0) axes.push(v2scale(dir, 1/l));
      else axes.push(v2(1,0));
    }
    if (axes.length === 0) return null;
    let minOverlap = Infinity, minAxis = null;
    for (const axis of axes) {
      const pA = projectShape(bodyA, axis);
      const pB = projectShape(bodyB, axis);
      const overlap = Math.min(pA.max, pB.max) - Math.max(pA.min, pB.min);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) { minOverlap = overlap; minAxis = axis; }
    }
    const d = v2sub(bodyB.position, bodyA.position);
    if (v2dot(d, minAxis) < 0) minAxis = v2scale(minAxis, -1);
    return { normal: minAxis, depth: minOverlap };
  }

  function closestPointOnShape(body, point) {
    const s = body.shape, p = body.position, a = body.angle;
    if (s.type === 'circle') {
      const d = v2norm(v2sub(point, p));
      return v2add(p, v2scale(d, s.radius));
    }
    const verts = s.type === 'box'
      ? [v2(-s.width/2,-s.height/2),v2(s.width/2,-s.height/2),v2(s.width/2,s.height/2),v2(-s.width/2,s.height/2)]
      : s.vertices;
    const wVerts = verts.map(v => v2add(p, v2rotate(v, a)));
    let best = wVerts[0], bestD = v2len(v2sub(point, wVerts[0]));
    for (let i = 0; i < wVerts.length; i++) {
      const j = (i+1) % wVerts.length;
      const seg = closestPointOnSegment(wVerts[i], wVerts[j], point);
      const d = v2len(v2sub(point, seg));
      if (d < bestD) { bestD = d; best = seg; }
    }
    return best;
  }

  function closestPointOnSegment(a, b, p) {
    const ab = v2sub(b, a), ap = v2sub(p, a);
    const t = Math.max(0, Math.min(1, v2dot(ap, ab) / (v2dot(ab, ab) || 1)));
    return v2add(a, v2scale(ab, t));
  }

  // ── Contact point generation ──────────────────────────────
  function generateContactPoints(bodyA, bodyB, manifold) {
    const n = manifold.normal;
    const contacts = [];
    if (bodyA.shape.type === 'circle') {
      const cp = v2add(bodyA.position, v2scale(n, bodyA.shape.radius));
      contacts.push(cp);
    } else if (bodyB.shape.type === 'circle') {
      const cp = v2sub(bodyB.position, v2scale(n, bodyB.shape.radius));
      contacts.push(cp);
    } else {
      const edges = getSignificantEdges(bodyA, bodyB, n);
      contacts.push(...clipEdges(edges[0], edges[1], n));
    }
    manifold.contacts = contacts;
    return contacts;
  }

  function getSignificantEdges(bodyA, bodyB, normal) {
    return [getSupportEdge(bodyA, normal), getSupportEdge(bodyB, v2scale(normal,-1))];
  }

  function getSupportEdge(body, dir) {
    const s = body.shape, p = body.position, a = body.angle;
    const verts = s.type === 'box'
      ? [v2(-s.width/2,-s.height/2),v2(s.width/2,-s.height/2),v2(s.width/2,s.height/2),v2(-s.width/2,s.height/2)]
      : (s.vertices || []);
    const wVerts = verts.map(v => v2add(p, v2rotate(v, a)));
    let maxP = -Infinity, idx = 0;
    for (let i = 0; i < wVerts.length; i++) {
      const d = v2dot(wVerts[i], dir);
      if (d > maxP) { maxP = d; idx = i; }
    }
    const prev = wVerts[(idx - 1 + wVerts.length) % wVerts.length];
    const next = wVerts[(idx + 1) % wVerts.length];
    const v = wVerts[idx];
    const e1 = v2norm(v2sub(v, prev)), e2 = v2norm(v2sub(v, next));
    return v2dot(e1, dir) <= v2dot(e2, dir)
      ? [prev, v] : [v, next];
  }

  function clipEdges(edgeA, edgeB, normal) {
    const d1 = v2dot(normal, edgeA[0]) - v2dot(normal, edgeB[0]);
    const d2 = v2dot(normal, edgeA[1]) - v2dot(normal, edgeB[0]);
    const pts = [];
    if (d1 >= 0) pts.push(edgeA[0]);
    if (d2 >= 0) pts.push(edgeA[1]);
    if (pts.length === 0) pts.push(edgeA[0]);
    return pts.slice(0, 2);
  }

  // ── Impulse-based collision resolution ────────────────────
  function resolveCollision(bodyA, bodyB, manifold) {
    const n = manifold.normal;
    const contacts = manifold.contacts || [v2(0,0)];
    const e = (bodyA.restitution + bodyB.restitution) * 0.5;
    const mu_s = (bodyA.staticFric + bodyB.staticFric) * 0.5;
    const mu_k = (bodyA.kineticFric + bodyB.kineticFric) * 0.5;

    for (const cp of contacts) {
      const rA = v2sub(cp, bodyA.position);
      const rB = v2sub(cp, bodyB.position);

      const vA = v2add(bodyA.velocity, v2crossScalar(bodyA.angularVel, rA));
      const vB = v2add(bodyB.velocity, v2crossScalar(bodyB.angularVel, rB));
      const relV = v2sub(vA, vB);
      const relVn = v2dot(relV, n);

      if (relVn > 0) continue;

      const rAcN = v2cross(rA, n);
      const rBcN = v2cross(rB, n);
      const invMassSum = bodyA.invMass + bodyB.invMass
        + rAcN * rAcN * bodyA.invInertia
        + rBcN * rBcN * bodyB.invInertia;

      const j = (-(1 + e) * relVn) / (invMassSum * contacts.length);

      const impulse = v2scale(n, j);
      if (!bodyA.isStatic) {
        bodyA.velocity = v2add(bodyA.velocity, v2scale(impulse, bodyA.invMass));
        bodyA.angularVel += bodyA.invInertia * v2cross(rA, impulse);
      }
      if (!bodyB.isStatic) {
        bodyB.velocity = v2sub(bodyB.velocity, v2scale(impulse, bodyB.invMass));
        bodyB.angularVel -= bodyB.invInertia * v2cross(rB, impulse);
      }

      // Friction impulse
      const vA2 = v2add(bodyA.velocity, v2crossScalar(bodyA.angularVel, rA));
      const vB2 = v2add(bodyB.velocity, v2crossScalar(bodyB.angularVel, rB));
      const relV2 = v2sub(vA2, vB2);
      const tangent = v2norm(v2sub(relV2, v2scale(n, v2dot(relV2, n))));
      const jt = -v2dot(relV2, tangent) / (invMassSum * contacts.length);
      let frictionImpulse;
      if (Math.abs(jt) < j * mu_s) {
        frictionImpulse = v2scale(tangent, jt);
      } else {
        frictionImpulse = v2scale(tangent, -j * mu_k);
      }
      if (!bodyA.isStatic) {
        bodyA.velocity = v2add(bodyA.velocity, v2scale(frictionImpulse, bodyA.invMass));
        bodyA.angularVel += bodyA.invInertia * v2cross(rA, frictionImpulse);
      }
      if (!bodyB.isStatic) {
        bodyB.velocity = v2sub(bodyB.velocity, v2scale(frictionImpulse, bodyB.invMass));
        bodyB.angularVel -= bodyB.invInertia * v2cross(rB, frictionImpulse);
      }
    }

    // Positional correction (Baumgarte)
    const correction = Math.max(manifold.depth - SLOP, 0) * BAUMGARTE
      / (bodyA.invMass + bodyB.invMass || 1);
    const corrVec = v2scale(n, correction);
    if (!bodyA.isStatic) bodyA.position = v2add(bodyA.position, v2scale(corrVec, bodyA.invMass));
    if (!bodyB.isStatic) bodyB.position = v2sub(bodyB.position, v2scale(corrVec, bodyB.invMass));
  }

  // ── Distance constraint ───────────────────────────────────
  function createDistanceConstraint(bodyA, bodyB, anchorA, anchorB, restLength) {
    return { type:'distance', bodyA, bodyB, anchorA: anchorA||v2(0,0), anchorB: anchorB||v2(0,0), restLength: restLength||1, lambda: 0 };
  }

  function solveDistanceConstraint(c) {
    const {bodyA, bodyB, anchorA, anchorB, restLength} = c;
    const wA = v2add(bodyA.position, v2rotate(anchorA, bodyA.angle));
    const wB = v2add(bodyB.position, v2rotate(anchorB, bodyB.angle));
    const d = v2sub(wB, wA);
    const dist = v2len(d);
    if (dist < 1e-6) return;
    const n = v2scale(d, 1/dist);
    const err = dist - restLength;
    const rAcN = v2cross(v2sub(wA, bodyA.position), n);
    const rBcN = v2cross(v2sub(wB, bodyB.position), n);
    const invMassSum = bodyA.invMass + bodyB.invMass
      + rAcN * rAcN * bodyA.invInertia
      + rBcN * rBcN * bodyB.invInertia;
    if (invMassSum < 1e-10) return;
    const lambda = -err / invMassSum;
    const impulse = v2scale(n, lambda);
    if (!bodyA.isStatic) {
      bodyA.position = v2sub(bodyA.position, v2scale(impulse, bodyA.invMass));
      bodyA.angle -= bodyA.invInertia * v2cross(v2sub(wA, bodyA.position), impulse);
    }
    if (!bodyB.isStatic) {
      bodyB.position = v2add(bodyB.position, v2scale(impulse, bodyB.invMass));
      bodyB.angle += bodyB.invInertia * v2cross(v2sub(wB, bodyB.position), impulse);
    }
  }

  // ── Hinge joint ───────────────────────────────────────────
  function createHingeConstraint(bodyA, bodyB, worldAnchor) {
    const localA = v2rotate(v2sub(worldAnchor, bodyA.position), -bodyA.angle);
    const localB = v2rotate(v2sub(worldAnchor, bodyB.position), -bodyB.angle);
    return { type:'hinge', bodyA, bodyB, localA, localB, lambda: v2(0,0) };
  }

  function solveHingeConstraint(c) {
    const {bodyA, bodyB, localA, localB} = c;
    const wA = v2add(bodyA.position, v2rotate(localA, bodyA.angle));
    const wB = v2add(bodyB.position, v2rotate(localB, bodyB.angle));
    const err = v2sub(wB, wA);
    const scale = BAUMGARTE;
    const K = [
      [bodyA.invMass + bodyB.invMass, 0],
      [0, bodyA.invMass + bodyB.invMass],
    ];
    const invK = invertMat2(K);
    const lambda = {x: -(invK[0][0]*err.x + invK[0][1]*err.y),
                    y: -(invK[1][0]*err.x + invK[1][1]*err.y)};
    const imp = v2scale(lambda, scale);
    if (!bodyA.isStatic) {
      bodyA.position = v2add(bodyA.position, v2scale(imp, bodyA.invMass));
      const rA = v2sub(wA, bodyA.position);
      bodyA.angle += bodyA.invInertia * v2cross(rA, imp);
    }
    if (!bodyB.isStatic) {
      bodyB.position = v2sub(bodyB.position, v2scale(imp, bodyB.invMass));
      const rB = v2sub(wB, bodyB.position);
      bodyB.angle -= bodyB.invInertia * v2cross(rB, imp);
    }
  }

  function invertMat2(m) {
    const det = m[0][0]*m[1][1] - m[0][1]*m[1][0] || 1;
    return [[m[1][1]/det, -m[0][1]/det],[-m[1][0]/det, m[0][0]/det]];
  }

  // ── Motor constraint ──────────────────────────────────────
  function createMotorConstraint(bodyA, bodyB, targetAngularVel, maxTorque) {
    return { type:'motor', bodyA, bodyB, targetAngularVel: targetAngularVel||0, maxTorque: maxTorque||100 };
  }

  function solveMotorConstraint(c, dt) {
    const {bodyA, bodyB, targetAngularVel, maxTorque} = c;
    const relAngVel = bodyA.angularVel - bodyB.angularVel;
    const err = relAngVel - targetAngularVel;
    const invI = (bodyA.invInertia + bodyB.invInertia) || 1;
    const lambda = -err / invI;
    const clamped = Math.max(-maxTorque * dt, Math.min(maxTorque * dt, lambda));
    if (!bodyA.isStatic) bodyA.angularVel += bodyA.invInertia * clamped;
    if (!bodyB.isStatic) bodyB.angularVel -= bodyB.invInertia * clamped;
  }

  // ── Sleep management ──────────────────────────────────────
  function updateSleep(body, dt) {
    if (body.isStatic) { body.isSleeping = true; return; }
    const lv = v2len(body.velocity);
    const av = Math.abs(body.angularVel);
    if (lv < SLEEP_LINEAR_THRESHOLD && av < SLEEP_ANGULAR_THRESHOLD) {
      body.sleepTimer += dt;
      if (body.sleepTimer > SLEEP_TIME_THRESHOLD) {
        body.isSleeping = true;
        body.velocity = v2(0,0);
        body.angularVel = 0;
      }
    } else {
      body.sleepTimer = 0;
      body.isSleeping = false;
    }
  }

  function wakeBody(body) {
    body.isSleeping = false;
    body.sleepTimer = 0;
  }

  // ── Integration ───────────────────────────────────────────
  function integrateBody(body, gravity, dt) {
    if (body.isStatic || body.isSleeping) return;
    const ax = body.force.x * body.invMass + gravity.x;
    const ay = body.force.y * body.invMass + gravity.y;
    body.velocity.x += ax * dt;
    body.velocity.y += ay * dt;
    body.angularVel  += body.torque * body.invInertia * dt;
    body.velocity.x  *= (1 - body.linearDamp  * dt);
    body.velocity.y  *= (1 - body.linearDamp  * dt);
    body.angularVel  *= (1 - body.angularDamp * dt);
    body.position.x  += body.velocity.x * dt;
    body.position.y  += body.velocity.y * dt;
    body.angle       += body.angularVel  * dt;
    body.force   = v2(0,0);
    body.torque  = 0;
    updateAABB(body);
  }

  // ── World step with sub-stepping ─────────────────────────
  function stepWorld(world, dt) {
    const subDt = dt / SUBSTEPS;
    for (let sub = 0; sub < SUBSTEPS; sub++) {
      for (const body of world.bodies) integrateBody(body, world.gravity, subDt);
      const pairs  = broadPhase(world.bodies);
      const manifolds = [];
      for (const [a, b] of pairs) {
        const m = satTest(a, b);
        if (m) {
          generateContactPoints(a, b, m);
          manifolds.push({bodyA:a, bodyB:b, ...m});
        }
      }
      for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
        for (const m of manifolds) resolveCollision(m.bodyA, m.bodyB, m);
        for (const c of world.constraints) {
          if (c.type === 'distance') solveDistanceConstraint(c);
          else if (c.type === 'hinge') solveHingeConstraint(c);
          else if (c.type === 'motor') solveMotorConstraint(c, subDt);
        }
      }
      for (const body of world.bodies) updateSleep(body, subDt);
    }
  }

  function createWorld(gravity) {
    return { bodies:[], constraints:[], gravity: gravity || v2(0, -9.81) };
  }

  function addBody(world, body) { world.bodies.push(finalizeBody(body)); return body; }
  function removeBody(world, body) { world.bodies = world.bodies.filter(b => b !== body); }
  function addConstraint(world, c) { world.constraints.push(c); return c; }

  return {
    createBody, createWorld, addBody, removeBody, addConstraint, stepWorld,
    createDistanceConstraint, createHingeConstraint, createMotorConstraint,
    wakeBody, updateAABB, broadPhase, satTest, resolveCollision,
    computeInertia, getRestitution, getFriction,
    v2, v2add, v2sub, v2scale, v2dot, v2cross, v2len, v2norm, v2rotate,
    SLEEP_LINEAR_THRESHOLD, SLEEP_ANGULAR_THRESHOLD, SUBSTEPS, SOLVER_ITERATIONS,
  };
})();


// ============================================================
// FLUID_DYNAMICS_SIM — Water/fluid simulation for vehicles
// ============================================================
const FLUID_DYNAMICS_SIM = (() => {
  'use strict';

  const WATER_DENSITY    = 1000;   // kg/m³
  const AIR_DENSITY      = 1.225;  // kg/m³
  const GRAVITY          = 9.81;
  const DRAG_WATER       = 0.82;   // Cd in water
  const DRAG_AIR         = 0.35;
  const ADDED_MASS_COEFF = 0.5;    // virtual mass coefficient

  // ── Water body descriptor ─────────────────────────────────
  function createWaterBody(opts) {
    const o = opts || {};
    return {
      surfaceY:       o.surfaceY      || 0,
      density:        o.density       || WATER_DENSITY,
      currentVel:     o.currentVel    || {x:0, y:0},
      waveAmplitude:  o.waveAmplitude || 0.1,
      waveFrequency:  o.waveFrequency || 0.5,
      waveSpeed:      o.waveSpeed     || 2.0,
      turbulenceZones: o.turbulenceZones || [],
      viscosity:      o.viscosity     || 0.001,
      dragCoeff:      o.dragCoeff     || DRAG_WATER,
      boatModeThreshold: o.boatModeThreshold || 0.7,
      underwaterSoundMult: o.underwaterSoundMult || 0.3,
    };
  }

  // ── Wave height sampling ──────────────────────────────────
  function waveHeight(water, x, time) {
    const A = water.waveAmplitude;
    const f = water.waveFrequency;
    const s = water.waveSpeed;
    // Superposition of two sine waves for realism
    return water.surfaceY
      + A * Math.sin(2 * Math.PI * (f * time - x / (s * 5)))
      + (A * 0.4) * Math.sin(2 * Math.PI * (f * 1.7 * time - x / (s * 3)));
  }

  // ── Submerged volume fraction for simple shapes ───────────
  function submergedFraction(vehicle, water, time) {
    const wh = waveHeight(water, vehicle.position.x, time);
    const top    = vehicle.position.y + vehicle.halfHeight;
    const bottom = vehicle.position.y - vehicle.halfHeight;
    if (top <= wh)     return 0; // fully above water
    if (bottom >= wh)  return 1; // fully submerged
    return (wh - bottom) / (2 * vehicle.halfHeight);
  }

  // ── Buoyancy force (Archimedes) ───────────────────────────
  function buoyancyForce(vehicle, water, time) {
    const frac    = submergedFraction(vehicle, water, time);
    const volume  = vehicle.volume * frac;
    const Fb      = water.density * GRAVITY * volume;
    return { x: 0, y: Fb, fraction: frac };
  }

  // ── Hydrodynamic drag ─────────────────────────────────────
  function hydrodynamicDrag(vehicle, water) {
    const frac = vehicle._subFraction || 0;
    if (frac <= 0) return {x:0, y:0};
    const relVx = vehicle.velocity.x - water.currentVel.x;
    const relVy = vehicle.velocity.y - water.currentVel.y;
    const speed2 = relVx * relVx + relVy * relVy;
    const speed  = Math.sqrt(speed2);
    if (speed < 1e-6) return {x:0, y:0};
    const Cd  = water.dragCoeff;
    const rho = water.density * frac + AIR_DENSITY * (1 - frac);
    const F   = 0.5 * rho * speed2 * Cd * vehicle.frontalArea;
    return { x: -F * (relVx / speed), y: -F * (relVy / speed) };
  }

  // ── Added mass effect ─────────────────────────────────────
  function addedMassForce(vehicle, water, acceleration) {
    const frac = vehicle._subFraction || 0;
    const ma   = ADDED_MASS_COEFF * water.density * vehicle.volume * frac;
    return { x: -ma * acceleration.x, y: -ma * acceleration.y };
  }

  // ── Current force ─────────────────────────────────────────
  function currentForce(vehicle, water) {
    const frac = vehicle._subFraction || 0;
    if (frac <= 0) return {x:0, y:0};
    const Cd  = 0.5;
    const rho = water.density;
    const A   = vehicle.frontalArea;
    const cx  = water.currentVel.x, cy = water.currentVel.y;
    const speed = Math.sqrt(cx*cx + cy*cy);
    if (speed < 1e-6) return {x:0,y:0};
    const F = 0.5 * rho * speed * speed * Cd * A * frac;
    return { x: F * (cx/speed) * frac, y: F * (cy/speed) * frac };
  }

  // ── Water entry splash force ──────────────────────────────
  function splashForce(vehicle, water, dt) {
    if (!vehicle._wasAboveWater) return { x:0, y:0, splash: false };
    const frac = vehicle._subFraction || 0;
    if (frac <= 0.01) return { x:0, y:0, splash: false };
    const impactVy = Math.abs(vehicle.velocity.y);
    const F = 0.5 * water.density * impactVy * impactVy * vehicle.frontalArea * 1.5;
    vehicle._wasAboveWater = false;
    return { x: 0, y: F, splash: true, impactVelocity: impactVy };
  }

  // ── Turbulence force ──────────────────────────────────────
  function turbulenceForce(vehicle, water, rng) {
    for (const zone of water.turbulenceZones) {
      const dx = vehicle.position.x - zone.cx;
      const dy = vehicle.position.y - zone.cy;
      if (dx*dx + dy*dy < zone.radius * zone.radius) {
        const strength = zone.strength * (vehicle._subFraction || 0);
        return {
          x: (rng() - 0.5) * 2 * strength,
          y: (rng() - 0.5) * 2 * strength,
        };
      }
    }
    return {x:0, y:0};
  }

  // ── Depth-based resistance ────────────────────────────────
  function depthResistance(vehicle, water) {
    const depth = waveHeight(water, vehicle.position.x, 0) - vehicle.position.y;
    if (depth <= 0) return 1.0;
    const maxDepth = 5.0;
    const factor   = 1.0 + (depth / maxDepth) * 2.5;
    return factor;
  }

  // ── Air-water interface transition ────────────────────────
  function interfaceTransition(frac) {
    // Smooth transition coefficient at the interface
    const t = Math.max(0, Math.min(1, frac));
    return t * t * (3 - 2 * t); // smoothstep
  }

  // ── Propeller/wheel traction in water ────────────────────
  function waterWheelTraction(normalTraction, subFraction) {
    const reductionFactor = 0.15 + (1 - subFraction) * 0.85;
    return normalTraction * reductionFactor;
  }

  // ── Boat mode detection ───────────────────────────────────
  function isBoatMode(vehicle, water, time) {
    const frac = submergedFraction(vehicle, water, time);
    return frac >= water.boatModeThreshold;
  }

  // ── Marine physics step ───────────────────────────────────
  function marinePhysicsStep(vehicle, water, time, dt, rng) {
    const frac = submergedFraction(vehicle, water, time);
    const prevFrac = vehicle._subFraction || 0;
    vehicle._wasAboveWater = prevFrac < 0.05 && frac >= 0.05;
    vehicle._subFraction = frac;

    const buoy    = buoyancyForce(vehicle, water, time);
    const drag    = hydrodynamicDrag(vehicle, water);
    const curr    = currentForce(vehicle, water);
    const turb    = turbulenceForce(vehicle, water, rng || Math.random.bind(Math));
    const splash  = splashForce(vehicle, water, dt);
    const depthR  = depthResistance(vehicle, water);
    const boatM   = isBoatMode(vehicle, water, time);
    const wh      = waveHeight(water, vehicle.position.x, time);
    const smooth  = interfaceTransition(frac);

    const totalFx = (drag.x + curr.x + turb.x + splash.x) * depthR;
    const totalFy = buoy.y + (drag.y + curr.y + turb.y + splash.y) * depthR;
    const wheelTr = waterWheelTraction(vehicle.wheelTraction || 1, frac);

    return {
      force:            { x: totalFx, y: totalFy },
      buoyancyForce:    buoy,
      dragForce:        drag,
      currentForce:     curr,
      turbulenceForce:  turb,
      splashEvent:      splash,
      submergedFraction: frac,
      depthResistance:  depthR,
      isBoatMode:       boatM,
      waveHeightAtPos:  wh,
      interfaceSmooth:  smooth,
      wheelTractionReduced: wheelTr,
      underwaterSound:  frac > 0.5 ? water.underwaterSoundMult : 1.0,
      waterParticleEmit: splash.splash || (frac > 0.02 && frac < 0.8),
    };
  }

  // ── Underwater sound propagation ──────────────────────────
  const UNDERWATER_SOUND = {
    speedOfSound:    1484,   // m/s in water vs 343 in air
    absorptionCoeff: 0.003,  // dB/m at 1kHz
    lowPassCutoff:   800,    // Hz — muffled effect
    reverbTime:      1.2,    // seconds
    compute(distance, freq) {
      const atten = Math.exp(-this.absorptionCoeff * distance);
      const freqAtten = Math.min(1, this.lowPassCutoff / Math.max(freq, 1));
      return atten * freqAtten;
    },
  };

  // ── Wave parameters presets ───────────────────────────────
  const WAVE_PRESETS = {
    calm:      { waveAmplitude:0.03, waveFrequency:0.3, waveSpeed:1.5, currentVel:{x:0.1,y:0} },
    moderate:  { waveAmplitude:0.12, waveFrequency:0.6, waveSpeed:2.5, currentVel:{x:0.5,y:0} },
    rough:     { waveAmplitude:0.35, waveFrequency:1.0, waveSpeed:4.0, currentVel:{x:1.2,y:0} },
    river:     { waveAmplitude:0.05, waveFrequency:0.8, waveSpeed:3.0, currentVel:{x:2.5,y:0} },
    underwater:{ waveAmplitude:0.01, waveFrequency:0.1, waveSpeed:0.5, currentVel:{x:0.2,y:-0.1} },
  };

  return {
    createWaterBody, waveHeight, submergedFraction, buoyancyForce,
    hydrodynamicDrag, addedMassForce, currentForce, splashForce,
    turbulenceForce, depthResistance, interfaceTransition, waterWheelTraction,
    isBoatMode, marinePhysicsStep,
    UNDERWATER_SOUND, WAVE_PRESETS,
    WATER_DENSITY, AIR_DENSITY, DRAG_WATER, DRAG_AIR, ADDED_MASS_COEFF,
  };
})();


// ============================================================
// SOFT_BODY_SIM — Spring-mass chassis flex simulation
// ============================================================
const SOFT_BODY_SIM = (() => {
  'use strict';

  const NODE_COUNT    = 20;
  const SPRING_K      = 18000;   // N/m stiffness
  const SPRING_DAMP   = 350;     // N·s/m damping
  const YIELD_STRESS  = 45000;   // Pa — plastic deformation threshold
  const PLASTIC_SET   = 0.08;    // permanent set fraction at yield

  // ── Node definition ───────────────────────────────────────
  function createNode(x, y, mass) {
    return {
      pos:     {x, y},
      prevPos: {x, y},
      vel:     {x:0, y:0},
      force:   {x:0, y:0},
      mass:    mass || 1.0,
      pinned:  false,
      plastic: 0,   // permanent deformation accumulator
    };
  }

  // ── Spring definition ─────────────────────────────────────
  function createSpring(i, j, nodes, k, damp) {
    const dx = nodes[j].pos.x - nodes[i].pos.x;
    const dy = nodes[j].pos.y - nodes[i].pos.y;
    return {
      i, j,
      restLength: Math.sqrt(dx*dx + dy*dy),
      k:    k    || SPRING_K,
      damp: damp || SPRING_DAMP,
      stress: 0,
    };
  }

  // ── 20-node chassis mesh ──────────────────────────────────
  function createChassisMesh(cx, cy, width, height, totalMass) {
    const nodeMass = totalMass / NODE_COUNT;
    const nodes = [];
    // Perimeter nodes
    const cols = 5, rows = 4;
    const dx = width  / (cols - 1);
    const dy = height / (rows - 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r > 0 && r < rows-1 && c > 0 && c < cols-1) continue;
        nodes.push(createNode(cx - width/2 + c*dx, cy - height/2 + r*dy, nodeMass));
      }
    }
    // Fill to exactly NODE_COUNT
    while (nodes.length < NODE_COUNT) {
      const c = (nodes.length % cols);
      const r = Math.floor(nodes.length / cols) % rows;
      nodes.push(createNode(cx - width/2 + c*dx, cy - height/2 + r*dy, nodeMass));
    }
    // Pin corner nodes to rigid body
    [0, cols-1, NODE_COUNT-cols, NODE_COUNT-1].forEach(idx => {
      if (nodes[idx]) nodes[idx].pinned = true;
    });

    // Springs: edges + diagonals
    const springs = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i+1; j < nodes.length; j++) {
        const dx2 = nodes[j].pos.x - nodes[i].pos.x;
        const dy2 = nodes[j].pos.y - nodes[i].pos.y;
        const dist = Math.sqrt(dx2*dx2 + dy2*dy2);
        if (dist < width * 0.75) {
          springs.push(createSpring(i, j, nodes));
        }
      }
    }

    return { nodes, springs, cx, cy, width, height, energy: 0 };
  }

  // ── Apply spring forces ───────────────────────────────────
  function applySpringForces(mesh) {
    mesh.energy = 0;
    for (const sp of mesh.springs) {
      const a = mesh.nodes[sp.i], b = mesh.nodes[sp.j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1e-6;
      const stretch = len - sp.restLength;
      const nx = dx/len, ny = dy/len;
      const dvx = b.vel.x - a.vel.x, dvy = b.vel.y - a.vel.y;
      const dampF = sp.damp * (dvx*nx + dvy*ny);
      const Fmag  = sp.k * stretch + dampF;
      const Fx = Fmag * nx, Fy = Fmag * ny;
      if (!a.pinned) { a.force.x += Fx; a.force.y += Fy; }
      if (!b.pinned) { b.force.x -= Fx; b.force.y -= Fy; }
      sp.stress = Math.abs(Fmag) / (sp.restLength * 0.02 || 1);
      mesh.energy += 0.5 * sp.k * stretch * stretch;
      // Plastic deformation
      if (sp.stress > YIELD_STRESS) {
        const excess = (sp.stress - YIELD_STRESS) / YIELD_STRESS;
        const plasticSet = excess * PLASTIC_SET * sp.restLength;
        sp.restLength += plasticSet * Math.sign(stretch);
        a.plastic += plasticSet * 0.5;
        b.plastic += plasticSet * 0.5;
      }
    }
  }

  // ── Integrate nodes ───────────────────────────────────────
  function integrateNodes(mesh, gravity, dt) {
    for (const n of mesh.nodes) {
      if (n.pinned) { n.force = {x:0,y:0}; continue; }
      n.force.y -= n.mass * gravity;
      const ax = n.force.x / n.mass, ay = n.force.y / n.mass;
      n.vel.x += ax * dt;
      n.vel.y += ay * dt;
      n.vel.x *= 0.995;
      n.vel.y *= 0.995;
      n.pos.x += n.vel.x * dt;
      n.pos.y += n.vel.y * dt;
      n.force = {x:0, y:0};
    }
  }

  // ── Pin nodes to rigid body transform ─────────────────────
  function syncToRigidBody(mesh, body) {
    const cx = body.position.x, cy = body.position.y, angle = body.angle;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (const n of mesh.nodes) {
      if (!n.pinned) continue;
      const lx = n.pos.x - mesh.cx, ly = n.pos.y - mesh.cy;
      n.pos.x = cx + lx * cos - ly * sin;
      n.pos.y = cy + lx * sin + ly * cos;
      n.vel   = {x: body.velocity.x, y: body.velocity.y};
    }
    mesh.cx = cx; mesh.cy = cy;
  }

  // ── Suspension bushing deformation ────────────────────────
  const BUSHING_STIFFNESS = 25000;  // N/m
  const BUSHING_DAMPING   = 400;

  function bushingForce(deflection, velocity) {
    return BUSHING_STIFFNESS * deflection + BUSHING_DAMPING * velocity;
  }

  // ── Tire sidewall flex ────────────────────────────────────
  function tireFlexModel(opts) {
    const o = opts || {};
    return {
      sidewallStiffness: o.sidewallStiffness || 180000,
      sidewallDamping:   o.sidewallDamping   || 500,
      deflection:        0,
      deflectionRate:    0,
      maxDeflection:     o.maxDeflection     || 0.04,
      visualOffset:      {x:0, y:0},
    };
  }

  function updateTireFlex(flex, normalForce, dt) {
    const targetDefl = normalForce / flex.sidewallStiffness;
    const cappedDefl = Math.min(targetDefl, flex.maxDeflection);
    const err  = cappedDefl - flex.deflection;
    const acc  = (flex.sidewallStiffness * err - flex.sidewallDamping * flex.deflectionRate) / 1.5;
    flex.deflectionRate += acc * dt;
    flex.deflection     += flex.deflectionRate * dt;
    flex.deflection      = Math.max(0, Math.min(flex.maxDeflection, flex.deflection));
    flex.visualOffset.y  = -flex.deflection;
    return flex.deflection;
  }

  // ── Panel vibration model ─────────────────────────────────
  function createPanelVibration(naturalFreq, damping) {
    return {
      naturalFreq: naturalFreq || 12,  // Hz
      damping:     damping     || 0.08,
      displacement:0,
      velocity:    0,
    };
  }

  function updatePanelVibration(panel, excitation, dt) {
    const wn  = 2 * Math.PI * panel.naturalFreq;
    const acc = -wn * wn * panel.displacement - 2 * panel.damping * wn * panel.velocity + excitation;
    panel.velocity    += acc * dt;
    panel.displacement += panel.velocity * dt;
    return panel.displacement;
  }

  // ── Crumple zone energy absorption ───────────────────────
  const CRUMPLE_ZONES = {
    front: { stiffness:150000, length:0.3, absorbed:0, maxAbsorb:15000 },
    rear:  { stiffness:120000, length:0.25, absorbed:0, maxAbsorb:12000 },
    side:  { stiffness:90000,  length:0.15, absorbed:0, maxAbsorb:8000 },
  };

  function crumpleForce(zone, deflection) {
    if (zone.absorbed >= zone.maxAbsorb) return 0;
    const F = zone.stiffness * deflection * (1 - zone.absorbed / zone.maxAbsorb);
    return Math.max(0, F);
  }

  function absorbCrumpleEnergy(zone, force, deflectionRate, dt) {
    const work = force * Math.abs(deflectionRate) * dt;
    zone.absorbed = Math.min(zone.maxAbsorb, zone.absorbed + work);
    return zone.absorbed / zone.maxAbsorb; // damage fraction
  }

  // ── Full soft body step ───────────────────────────────────
  function stepSoftBody(mesh, body, gravity, dt) {
    syncToRigidBody(mesh, body);
    applySpringForces(mesh);
    integrateNodes(mesh, gravity, dt);
    const maxPlastic = mesh.nodes.reduce((m, n) => Math.max(m, n.plastic), 0);
    const maxStress  = mesh.springs.reduce((m, s) => Math.max(m, s.stress), 0);
    return { meshEnergy: mesh.energy, maxPlasticDeformation: maxPlastic, maxStress };
  }

  return {
    createNode, createSpring, createChassisMesh, applySpringForces,
    integrateNodes, syncToRigidBody, stepSoftBody,
    bushingForce, tireFlexModel, updateTireFlex,
    createPanelVibration, updatePanelVibration,
    crumpleForce, absorbCrumpleEnergy, CRUMPLE_ZONES,
    NODE_COUNT, SPRING_K, SPRING_DAMP, YIELD_STRESS, PLASTIC_SET,
  };
})();


// ============================================================
// THERMAL_DYNAMICS_SIM — Heat transfer across vehicle components
// ============================================================
const THERMAL_DYNAMICS_SIM = (() => {
  'use strict';

  const AMBIENT_TEMP     = 25;    // °C default
  const STEFAN_BOLTZMANN = 5.67e-8;

  // ── Component thermal properties ──────────────────────────
  const THERMAL_PROPS = {
    engine:      { mass:180, cp:500,  emissivity:0.7,  area:0.4  },
    coolant:     { mass:6,   cp:3800, emissivity:0.1,  area:0.05 },
    radiator:    { mass:8,   cp:900,  emissivity:0.85, area:1.2  },
    brakeDisc:   { mass:4,   cp:490,  emissivity:0.9,  area:0.06 },
    turbo:       { mass:5,   cp:510,  emissivity:0.75, area:0.03 },
    exhaust:     { mass:12,  cp:480,  emissivity:0.95, area:0.25 },
    fuel:        { mass:30,  cp:2100, emissivity:0.05, area:0.1  },
    oil:         { mass:4,   cp:1900, emissivity:0.1,  area:0.05 },
    transmission:{ mass:40,  cp:500,  emissivity:0.6,  area:0.15 },
    tireRubber:  { mass:5,   cp:1250, emissivity:0.92, area:0.08 },
  };

  // ── Thermal resistance table (K/W) ───────────────────────
  const THERMAL_RESISTANCE = {
    engine_coolant:      0.003,
    coolant_radiator:    0.008,
    engine_oil:          0.005,
    engine_exhaust:      0.010,
    engine_turbo:        0.012,
    turbo_exhaust:       0.006,
    brakeDisc_ambient:   0.15,
    tire_ambient:        0.50,
  };

  // ── Component temperature state ───────────────────────────
  function createThermalState(ambientTemp) {
    const T = ambientTemp !== undefined ? ambientTemp : AMBIENT_TEMP;
    const state = {};
    for (const [name, props] of Object.entries(THERMAL_PROPS)) {
      state[name] = {
        temp:        T + (name === 'engine' ? 20 : 0),
        props:       { ...props },
        heatInput:   0,
        heatOutput:  0,
      };
    }
    return state;
  }

  // ── Heat transfer between connected components ────────────
  function heatTransfer(tempA, tempB, resistance) {
    return (tempA - tempB) / resistance;
  }

  // ── Convective cooling ────────────────────────────────────
  function convectiveCooling(temp, ambient, area, velocity) {
    const h = 10 + 15 * Math.sqrt(Math.max(0, velocity)); // W/(m²·K), forced convection
    return h * area * (temp - ambient);
  }

  // ── Radiative heat loss ───────────────────────────────────
  function radiativeHeatLoss(temp, ambient, emissivity, area) {
    const Tk = temp    + 273.15;
    const Ta = ambient + 273.15;
    return emissivity * STEFAN_BOLTZMANN * area * (Tk*Tk*Tk*Tk - Ta*Ta*Ta*Ta);
  }

  // ── Friction heat generation: Q = μ * N * v ──────────────
  function frictionHeat(mu, normalForce, velocity) {
    return mu * normalForce * Math.abs(velocity);
  }

  // ── Brake temperature rise ────────────────────────────────
  function brakeHeatInput(brakePressure, wheelSpeed, discRadius) {
    const brakeTorque = brakePressure * 0.8 * discRadius;
    return brakeTorque * Math.abs(wheelSpeed);
  }

  // ── Turbo temperature model ───────────────────────────────
  function turboHeatInput(boostPressureRatio, massFlowRate) {
    const isentropicWork = 1005 * (boostPressureRatio ** (0.4/1.4) - 1);
    const efficiency = 0.72;
    const actualWork  = isentropicWork / efficiency;
    return massFlowRate * actualWork * (1 - efficiency);
  }

  // ── Fuel temperature effect on injection timing ───────────
  function fuelTempCorrectionMs(fuelTemp) {
    const nominalTemp = 30;
    const correction  = (fuelTemp - nominalTemp) * 0.002;
    return Math.max(-0.3, Math.min(0.3, correction));
  }

  // ── Oil viscosity vs temperature (kinematic, cSt) ─────────
  function oilViscosity(oilTemp) {
    // Walther equation approximation
    if (oilTemp < 20)  return 220;
    if (oilTemp > 150) return 3.5;
    return 220 * Math.exp(-0.035 * (oilTemp - 20));
  }

  // ── Thermal expansion affecting clearances ────────────────
  const THERMAL_EXPANSION = {
    steel:    11.7e-6, // /°C
    aluminum: 23.1e-6,
    cast_iron: 10.8e-6,
  };

  function thermalExpansion(length, material, deltaTemp) {
    const alpha = THERMAL_EXPANSION[material] || THERMAL_EXPANSION.steel;
    return length * alpha * deltaTemp;
  }

  // ── Engine thermal load per cylinder ─────────────────────
  function engineHeatInput(torque, rpm, thermalEfficiency) {
    const omega    = rpm * Math.PI / 30;
    const mechPow  = torque * omega;
    const eta      = thermalEfficiency || 0.35;
    const heatRej  = mechPow * (1 - eta) / eta;
    return heatRej;
  }

  // ── Exhaust heat signature ────────────────────────────────
  function exhaustHeatSignature(exhaustTemp, massFlow) {
    return massFlow * 1005 * (exhaustTemp - AMBIENT_TEMP);
  }

  // ── Full thermal step ─────────────────────────────────────
  function stepThermal(state, inputs, dt) {
    const amb = inputs.ambientTemp !== undefined ? inputs.ambientTemp : AMBIENT_TEMP;
    const vel = inputs.vehicleSpeed || 0;

    // Engine heat input
    if (inputs.engineTorque !== undefined) {
      state.engine.heatInput = engineHeatInput(inputs.engineTorque, inputs.rpm || 3000, 0.35);
    }

    // Turbo heat
    if (inputs.boostPressureRatio !== undefined) {
      state.turbo.heatInput = turboHeatInput(inputs.boostPressureRatio, inputs.massFlowRate || 0.05);
    }

    // Brake heat
    if (inputs.brakePressure !== undefined) {
      state.brakeDisc.heatInput = brakeHeatInput(inputs.brakePressure, inputs.wheelSpeed || 0, 0.15);
    }

    // Tire friction heat
    if (inputs.tireSlip !== undefined) {
      const tireN = (inputs.vehicleMass || 1000) * 9.81 / 4;
      state.tireRubber.heatInput = frictionHeat(0.8, tireN, inputs.tireSlip * vel);
    }

    // Heat flows between components
    const flows = {
      eng_cool:   heatTransfer(state.engine.temp, state.coolant.temp, THERMAL_RESISTANCE.engine_coolant),
      cool_rad:   heatTransfer(state.coolant.temp, state.radiator.temp, THERMAL_RESISTANCE.coolant_radiator),
      eng_oil:    heatTransfer(state.engine.temp, state.oil.temp, THERMAL_RESISTANCE.engine_oil),
      eng_exh:    heatTransfer(state.engine.temp, state.exhaust.temp, THERMAL_RESISTANCE.engine_exhaust),
      eng_turbo:  heatTransfer(state.engine.temp, state.turbo.temp, THERMAL_RESISTANCE.engine_turbo),
      turbo_exh:  heatTransfer(state.turbo.temp, state.exhaust.temp, THERMAL_RESISTANCE.turbo_exhaust),
    };

    // Convective/radiative losses to ambient
    const losses = {};
    for (const [name, comp] of Object.entries(state)) {
      const conv = convectiveCooling(comp.temp, amb, comp.props.area, vel);
      const rad  = radiativeHeatLoss(comp.temp, amb, comp.props.emissivity, comp.props.area);
      losses[name] = conv + rad;
      comp.heatOutput = losses[name];
    }

    // Update temperatures: dT = (Qin - Qout) / (m * cp) * dt
    const update = (comp, netQ) => {
      const dT = netQ / (comp.props.mass * comp.props.cp) * dt;
      comp.temp += dT;
      comp.temp = Math.max(amb - 5, comp.temp); // can't go below ambient much
    };

    update(state.engine,      state.engine.heatInput     + flows.cool_rad   - flows.eng_cool  - flows.eng_oil  - flows.eng_exh  - flows.eng_turbo - losses.engine);
    update(state.coolant,     flows.eng_cool              - flows.cool_rad                                                                          - losses.coolant);
    update(state.radiator,    flows.cool_rad                                                                                                        - losses.radiator);
    update(state.oil,         flows.eng_oil                                                                                                         - losses.oil);
    update(state.exhaust,     flows.eng_exh + flows.turbo_exh                                                                                       - losses.exhaust);
    update(state.turbo,       state.turbo.heatInput  + flows.eng_turbo - flows.turbo_exh                                                            - losses.turbo);
    update(state.brakeDisc,   state.brakeDisc.heatInput                                                                                             - losses.brakeDisc);
    update(state.tireRubber,  state.tireRubber.heatInput                                                                                            - losses.tireRubber);
    update(state.fuel,        0                                                                                                                      - losses.fuel);
    update(state.transmission,0                                                                                                                      - losses.transmission);

    return {
      engineTemp:       state.engine.temp,
      coolantTemp:      state.coolant.temp,
      oilTemp:          state.oil.temp,
      exhaustTemp:      state.exhaust.temp,
      turboTemp:        state.turbo.temp,
      brakeDiscTemp:    state.brakeDisc.temp,
      tireTemp:         state.tireRubber.temp,
      oilViscosity:     oilViscosity(state.oil.temp),
      fuelTempCorrection: fuelTempCorrectionMs(state.fuel.temp),
      overheating:      state.engine.temp > 105,
      brakeFade:        state.brakeDisc.temp > 500,
      exhaustSignature: exhaustHeatSignature(state.exhaust.temp, inputs.massFlowRate || 0.04),
    };
  }

  return {
    THERMAL_PROPS, THERMAL_RESISTANCE, THERMAL_EXPANSION,
    createThermalState, stepThermal,
    heatTransfer, convectiveCooling, radiativeHeatLoss,
    frictionHeat, brakeHeatInput, turboHeatInput,
    fuelTempCorrectionMs, oilViscosity, thermalExpansion,
    engineHeatInput, exhaustHeatSignature,
    AMBIENT_TEMP, STEFAN_BOLTZMANN,
  };
})();


// ============================================================
// CONTACT_MECHANICS_SIM — Advanced contact + Pacejka Magic Formula
// ============================================================
const CONTACT_MECHANICS_SIM = (() => {
  'use strict';

  // ── Pacejka 2002 Magic Formula coefficients ───────────────
  const PACEJKA_DEFAULTS = {
    // Longitudinal (Fx)
    pCx1: 1.685,  pDx1: 1.21,   pDx2: -0.037, pEx1: 0.344,
    pEx2: 0.095,  pEx3: -0.02,  pEx4: 0.0,    pKx1: 21.51,
    pKx2: -0.163, pKx3: 0.245,  pHx1: 0.0,    pHx2: 0.0,
    pVx1: 0.0,    pVx2: 0.0,
    // Lateral (Fy)
    // BUGFIX(21 Tmz): pDy3 hiç tanımlanmamıştı → magicFormulaFy'de `c.pDy3 * camber²`
    // NaN üretiyor, `|| 1` onu yutuyordu (kamber etkisi sessizce yok sayılıyordu).
    pCy1: 1.193,  pDy1: -0.99,  pDy2: 0.145,  pDy3: 0.0,  pEy1: -1.003,
    pEy2: -0.537, pEy3: -0.083, pEy4: -4.787, pKy1: -14.95,
    pKy2: 1.719,  pKy3: -0.028, pHy1: -0.001, pHy2: 0.0,
    pVy1: -0.008, pVy2: -0.01,
    // Aligning moment (Mz)
    qBz1: 9.557,  qBz2: -0.82,  qCz1: 1.104,  qDz1: 0.0947,
    qDz2: -0.002, qEz1: -0.96,  qHz1: 0.0,    qHz2: 0.0,
    // Scale factors
    lambdaMux: 1.0, lambdaMuy: 1.0, lambdaMuz: 1.0,
  };

  // ── Pure longitudinal slip force (Fx) ─────────────────────
  function magicFormulaFx(kappa, Fz, camber, P, coeff) {
    const c = coeff || PACEJKA_DEFAULTS;
    const dFz  = (Fz - 4000) / 4000;
    const C    = c.pCx1;
    const D    = Fz * (c.pDx1 + c.pDx2 * dFz);
    const E    = (c.pEx1 + c.pEx2 * dFz + c.pEx3 * dFz*dFz) * (1 - c.pEx4 * Math.sign(kappa));
    const K    = Fz * (c.pKx1 + c.pKx2 * dFz) * Math.exp(c.pKx3 * dFz);
    const Sh   = c.pHx1 + c.pHx2 * dFz;
    const Sv   = Fz * (c.pVx1 + c.pVx2 * dFz) * c.lambdaMux;
    const x    = kappa + Sh;
    const B    = K / (C * D || 1);
    const Fx   = D * Math.sin(C * Math.atan(B*x - E*(B*x - Math.atan(B*x)))) + Sv;
    return Fx * c.lambdaMux;
  }

  // ── Pure lateral slip force (Fy) ──────────────────────────
  function magicFormulaFy(alpha, Fz, camber, P, coeff) {
    const c = coeff || PACEJKA_DEFAULTS;
    const dFz  = (Fz - 4000) / 4000;
    const C    = c.pCy1;
    // BUGFIX(21 Tmz): `(1 + X || 1)` aslında `((1+X) || 1)` demekti; X NaN olunca 1'e
    // düşüyor, X = -1 olunca da 0 yerine 1 veriyordu. Doğrusu: eksik katsayıyı 0 saymak.
    const D    = Fz * (c.pDy1 + c.pDy2 * dFz) * (1 + (c.pDy3 || 0) * camber * camber);
    const E    = (c.pEy1 + c.pEy2 * dFz) * (1 - (c.pEy3 + c.pEy4 * camber) * Math.sign(alpha));
    const Ky   = c.pKy1 * 4000 * Math.sin(2 * Math.atan(Fz / (c.pKy2 * 4000 || 1)));
    const Sh   = c.pHy1 + c.pHy2 * dFz;
    const Sv   = Fz * (c.pVy1 + c.pVy2 * dFz) * c.lambdaMuy;
    const x    = alpha + Sh;
    const B    = Ky / (C * D || 1);
    const Fy   = D * Math.sin(C * Math.atan(B*x - E*(B*x - Math.atan(B*x)))) + Sv;
    return Fy * c.lambdaMuy;
  }

  // ── Aligning moment (Mz) ──────────────────────────────────
  function magicFormulaMz(alpha, Fz, Fy, coeff) {
    const c = coeff || PACEJKA_DEFAULTS;
    const dFz = (Fz - 4000) / 4000;
    const R0  = 0.315; // nominal radius
    const Bt  = (c.qBz1 + c.qBz2 * dFz) * c.lambdaMuz;
    const Ct  = c.qCz1;
    const Dt  = Fz * R0 * (c.qDz1 + c.qDz2 * dFz) * c.lambdaMuz;
    const Et  = c.qEz1;
    const Sht = c.qHz1 + c.qHz2 * dFz;
    const t   = Dt * Math.cos(Ct * Math.atan(Bt*(alpha+Sht) - Et*(Bt*(alpha+Sht) - Math.atan(Bt*(alpha+Sht)))));
    return -t * Fy;
  }

  // ── Combined slip (Pacejka 2002 combined) ─────────────────
  function combinedSlipForces(kappa, alpha, Fz, camber, P, coeff) {
    const Fxp = magicFormulaFx(kappa, Fz, camber, P, coeff);
    const Fyp = magicFormulaFy(alpha, Fz, camber, P, coeff);
    // Combined slip correction (Ellipse method)
    const Fxo = magicFormulaFx(kappa, Fz, 0, P, coeff);
    const Fyo = magicFormulaFy(alpha, Fz, 0, P, coeff);
    const eps  = 1e-6;
    const Gxa  = Math.sqrt(Fxp*Fxp / (Fxo*Fxo + eps)) || 1;
    const Gyk  = Math.sqrt(Fyp*Fyp / (Fyo*Fyo + eps)) || 1;
    return {
      Fx: Fxp * Math.min(1, 1 / (Math.sqrt(1 + (Fxp/Fxo||1)**2) || 1)),
      Fy: Fyp * Math.min(1, 1 / (Math.sqrt(1 + (Fyp/Fyo||1)**2) || 1)),
      Mz: magicFormulaMz(alpha, Fz, Fyp, coeff),
      Gxa, Gyk,
    };
  }

  // ── Contact patch geometry ────────────────────────────────
  function contactPatchGeometry(Fz, inflationPressure, tireWidth) {
    const P   = inflationPressure || 220000;
    const w   = tireWidth         || 0.225;
    const a   = Math.sqrt(Fz / (Math.PI * P)); // Hertzian half-axis
    const b   = w * 0.4;
    return { halfLength: a, halfWidth: b, area: Math.PI * a * b, aspectRatio: a/b };
  }

  // ── Normal force distribution across patch ────────────────
  function normalForceDistribution(Fz, patch, x, y) {
    const {halfLength: a, halfWidth: b} = patch;
    const r2 = (x/a)*(x/a) + (y/b)*(y/b);
    if (r2 > 1) return 0;
    const p0 = 3 * Fz / (2 * Math.PI * a * b);
    return p0 * Math.sqrt(1 - r2);
  }

  // ── Shear stress distribution (trapezoidal brush model) ───
  function brushModelShear(slipRatio, normalPressure, muPeak, bristleStiffness) {
    const cp = bristleStiffness || 2e6; // N/m³
    const deflection = slipRatio * 0.01;
    const elasticShear = cp * deflection;
    const frictionLimit = muPeak * normalPressure;
    return Math.sign(deflection) * Math.min(Math.abs(elasticShear), frictionLimit);
  }

  // ── Camber angle effect on Fy ─────────────────────────────
  function camberThrustForce(camberAngle, Fz, camberStiffness) {
    const cs = camberStiffness || 12000;
    return cs * camberAngle * (Fz / 4000);
  }

  // ── Inflation pressure correction ────────────────────────
  function pressureCorrection(P, Pnom, Fz, coeff) {
    const ratio = (P - Pnom) / Pnom;
    return { dFx: 0.05 * ratio * Fz, dFy: -0.04 * ratio * Fz };
  }

  // ── Road roughness PSD ────────────────────────────────────
  function roadPSD(frequency, roughnessClass) {
    // ISO 8608 road roughness spectrum: S(n) = S0 * (n/n0)^(-w)
    const S0 = { A:1e-6, B:4e-6, C:16e-6, D:64e-6, E:256e-6 };
    const s0 = S0[roughnessClass] || S0['B'];
    const n0 = 0.1; // reference spatial frequency 1/m
    const w  = 2.0;
    return s0 * Math.pow(frequency / n0, -w);
  }

  // ── Contact force smoothing filter ───────────────────────
  function createContactFilter(cutoffHz) {
    const fc = cutoffHz || 50;
    return { fc, alpha: 0, prevF: {x:0,y:0,z:0} };
  }

  function updateContactFilter(filter, rawForce, dt) {
    const rc = 1 / (2 * Math.PI * filter.fc);
    const alpha = dt / (rc + dt);
    filter.prevF.x += alpha * (rawForce.x - filter.prevF.x);
    filter.prevF.y += alpha * (rawForce.y - filter.prevF.y);
    filter.prevF.z += alpha * (rawForce.z - filter.prevF.z);
    return { ...filter.prevF };
  }

  // ── Pure slip reference curves ────────────────────────────
  function pureSlipCurve(type, Fz) {
    const pts = [];
    if (type === 'longitudinal') {
      for (let k = -1; k <= 1; k += 0.05) {
        pts.push({ slip: k, force: magicFormulaFx(k, Fz, 0, 220000) });
      }
    } else {
      for (let a = -0.35; a <= 0.35; a += 0.017) {
        pts.push({ angle: a, force: magicFormulaFy(a, Fz, 0, 220000) });
      }
    }
    return pts;
  }

  return {
    PACEJKA_DEFAULTS,
    magicFormulaFx, magicFormulaFy, magicFormulaMz, combinedSlipForces,
    contactPatchGeometry, normalForceDistribution, brushModelShear,
    camberThrustForce, pressureCorrection,
    roadPSD, createContactFilter, updateContactFilter, pureSlipCurve,
  };
})();


// ============================================================
// MULTI_BODY_SYSTEM_SIM — Articulated vehicle dynamics
// ============================================================
const MULTI_BODY_SYSTEM_SIM = (() => {
  'use strict';

  // ── Joint types ───────────────────────────────────────────
  const JOINT_TYPE = {
    REVOLUTE:  'revolute',
    PRISMATIC: 'prismatic',
    SPHERICAL: 'spherical',
    FIXED:     'fixed',
    UNIVERSAL: 'universal',
  };

  // ── Link (rigid body segment) ─────────────────────────────
  function createLink(opts) {
    const o = opts || {};
    return {
      name:        o.name     || 'link',
      mass:        o.mass     || 10,
      inertia:     o.inertia  || 1,  // scalar for 2D
      position:    o.position || {x:0, y:0},
      angle:       o.angle    || 0,
      velocity:    {x:0, y:0},
      angularVel:  0,
      force:       {x:0, y:0},
      torque:      0,
      parentJoint: null,
      childJoints: [],
    };
  }

  // ── Joint definition ──────────────────────────────────────
  function createJoint(type, parentLink, childLink, opts) {
    const o = opts || {};
    const joint = {
      type,
      parent:       parentLink,
      child:        childLink,
      localPosParent: o.localPosParent || {x:0,y:0},
      localPosChild:  o.localPosChild  || {x:0,y:0},
      // Generalized coordinate
      q:    0,  // position (angle for revolute, displacement for prismatic)
      dq:   0,  // velocity
      ddq:  0,  // acceleration
      // Limits
      qMin:   o.qMin !== undefined ? o.qMin : -Math.PI,
      qMax:   o.qMax !== undefined ? o.qMax :  Math.PI,
      // Compliance & damping
      compliance: o.compliance || 0,
      damping:    o.damping    || 10,
      // Motor
      motorTargetVel: 0,
      motorGain:      o.motorGain || 50,
      motorMaxTorque: o.motorMaxTorque || 100,
      // Constraint force (Lagrange multiplier)
      lambda: 0,
    };
    if (childLink) childLink.parentJoint = joint;
    if (parentLink) parentLink.childJoints.push(joint);
    return joint;
  }

  // ── World-space anchor positions ──────────────────────────
  function worldAnchorParent(joint) {
    const p = joint.parent;
    const lp = joint.localPosParent;
    const cos = Math.cos(p.angle), sin = Math.sin(p.angle);
    return {
      x: p.position.x + lp.x * cos - lp.y * sin,
      y: p.position.y + lp.x * sin + lp.y * cos,
    };
  }

  function worldAnchorChild(joint) {
    const c = joint.child;
    if (!c) return {x:0,y:0};
    const lc = joint.localPosChild;
    const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
    return {
      x: c.position.x + lc.x * cos - lc.y * sin,
      y: c.position.y + lc.x * sin + lc.y * cos,
    };
  }

  // ── Jacobian row for a revolute joint ─────────────────────
  function jacobianRevolute(joint, link) {
    // For 2D: J = [-sin(q)*r_x - cos(q)*r_y, cos(q)*r_x - sin(q)*r_y, 1]
    const anchor = worldAnchorParent(joint);
    const r = { x: anchor.x - link.position.x, y: anchor.y - link.position.y };
    return [-r.y, r.x, 1];
  }

  // ── Recursive Newton-Euler forward dynamics ───────────────
  function forwardDynamicsLink(link, gravity, dt) {
    if (!link) return;
    // Apply gravity
    link.force.y -= link.mass * gravity;
    // Apply joint motor force from parent
    if (link.parentJoint) {
      const j = link.parentJoint;
      const motorErr = j.motorTargetVel - j.dq;
      const motorTorque = Math.max(-j.motorMaxTorque, Math.min(j.motorMaxTorque, j.motorGain * motorErr));
      link.torque += motorTorque;
      // Joint damping
      link.torque -= j.damping * j.dq;
      // Constraint: keep child anchor at parent anchor
      const wp = worldAnchorParent(j), wc = worldAnchorChild(j);
      const errX = wp.x - wc.x, errY = wp.y - wc.y;
      const kCorr = 200;
      link.force.x += kCorr * errX * link.mass;
      link.force.y += kCorr * errY * link.mass;
    }
    // Integrate
    link.velocity.x += (link.force.x / link.mass) * dt;
    link.velocity.y += (link.force.y / link.mass) * dt;
    link.angularVel  += (link.torque / link.inertia) * dt;
    link.velocity.x  *= 0.99;
    link.velocity.y  *= 0.99;
    link.angularVel  *= 0.99;
    link.position.x  += link.velocity.x * dt;
    link.position.y  += link.velocity.y * dt;
    link.angle       += link.angularVel  * dt;
    link.force  = {x:0, y:0};
    link.torque = 0;
    // Update generalized coordinate for parent joint
    if (link.parentJoint) {
      const j = link.parentJoint;
      if (j.type === JOINT_TYPE.REVOLUTE) {
        j.q  = link.angle - j.parent.angle;
        j.dq = link.angularVel - j.parent.angularVel;
        // Apply limits
        if (j.q < j.qMin) { j.q = j.qMin; if (j.dq < 0) j.dq = 0; }
        if (j.q > j.qMax) { j.q = j.qMax; if (j.dq > 0) j.dq = 0; }
      }
    }
    for (const childJoint of link.childJoints) {
      forwardDynamicsLink(childJoint.child, gravity, dt);
    }
  }

  // ── Multi-body system ─────────────────────────────────────
  function createSystem(opts) {
    return {
      root:    null,
      links:   [],
      joints:  [],
      gravity: opts && opts.gravity !== undefined ? opts.gravity : 9.81,
    };
  }

  function addLink(system, link) { system.links.push(link); return link; }
  function addJoint(system, joint) { system.joints.push(joint); return joint; }
  function setRoot(system, link) { system.root = link; }

  function stepSystem(system, dt) {
    if (system.root) forwardDynamicsLink(system.root, system.gravity, dt);
  }

  // ── Suspension kinematics (4-bar linkage approximation) ───
  function suspensionKinematics(opts) {
    const o = opts || {};
    return {
      upperArmLength: o.upperArmLength || 0.28,
      lowerArmLength: o.lowerArmLength || 0.32,
      rideHeight:     o.rideHeight     || 0.3,
      camberCurve:    o.camberCurve    || [0, -0.5, -1.2, -2.1, -3.2],
      toeCurve:       o.toeCurve       || [0,  0.1,  0.2,  0.25, 0.28],
      castor:         o.castor         || 5.0, // degrees
    };
  }

  function suspensionCamber(susp, wheelTravel) {
    const t = Math.max(0, Math.min(1, (wheelTravel + 0.05) / 0.15));
    const idx = Math.floor(t * (susp.camberCurve.length - 1));
    const frac = t * (susp.camberCurve.length - 1) - idx;
    const a = susp.camberCurve[Math.min(idx, susp.camberCurve.length-1)];
    const b = susp.camberCurve[Math.min(idx+1, susp.camberCurve.length-1)];
    return (a + frac * (b - a)) * Math.PI / 180;
  }

  function suspensionToe(susp, wheelTravel) {
    const t = Math.max(0, Math.min(1, (wheelTravel + 0.05) / 0.15));
    const idx = Math.floor(t * (susp.toeCurve.length - 1));
    const frac = t * (susp.toeCurve.length - 1) - idx;
    const a = susp.toeCurve[Math.min(idx, susp.toeCurve.length-1)];
    const b = susp.toeCurve[Math.min(idx+1, susp.toeCurve.length-1)];
    return (a + frac * (b - a)) * Math.PI / 180;
  }

  // ── Lagrange multipliers solver (small scale) ─────────────
  function lagrangeConstraintForce(invMass, jacobian, bias, lambda) {
    const J   = jacobian;
    const JT  = J; // 1D case, J = JT
    const Jmi = J * invMass * J;
    const dLambda = -(J * /* velocity */ 0 + bias) / (Jmi || 1);
    return JT * dLambda;
  }

  // ── PD motor controller ───────────────────────────────────
  function pdMotor(joint, targetAngle, dt) {
    const err  = targetAngle - joint.q;
    const derr = -joint.dq;
    const kp = joint.motorGain, kd = joint.damping;
    const torque = kp * err + kd * derr;
    return Math.max(-joint.motorMaxTorque, Math.min(joint.motorMaxTorque, torque));
  }

  // ── Forward kinematics: compute link world positions ──────
  function forwardKinematics(system) {
    const result = [];
    function traverse(link) {
      if (!link) return;
      result.push({ name: link.name, position: {...link.position}, angle: link.angle });
      for (const j of link.childJoints) traverse(j.child);
    }
    traverse(system.root);
    return result;
  }

  // ── Inverse kinematics (CCD for 2-link chain) ─────────────
  function inverseKinematicsCCD(links, targetPos, iterations) {
    const maxIter = iterations || 10;
    for (let iter = 0; iter < maxIter; iter++) {
      for (let i = links.length - 1; i >= 0; i--) {
        const link = links[i];
        const endEff = links[links.length - 1].position;
        const toEnd  = { x: endEff.x - link.position.x, y: endEff.y - link.position.y };
        const toTgt  = { x: targetPos.x - link.position.x, y: targetPos.y - link.position.y };
        const angleEnd = Math.atan2(toEnd.y, toEnd.x);
        const angleTgt = Math.atan2(toTgt.y, toTgt.x);
        link.angle += angleTgt - angleEnd;
      }
    }
  }

  return {
    JOINT_TYPE, createLink, createJoint, createSystem,
    addLink, addJoint, setRoot, stepSystem,
    worldAnchorParent, worldAnchorChild, jacobianRevolute,
    forwardDynamicsLink, suspensionKinematics, suspensionCamber, suspensionToe,
    lagrangeConstraintForce, pdMotor, forwardKinematics, inverseKinematicsCCD,
  };
})();


// ============================================================
// VEHICLE_DYNAMICS_MODEL — 3-DOF bicycle model + ESC/TCS/ABS
// ============================================================
const VEHICLE_DYNAMICS_MODEL = (() => {
  'use strict';

  // ── Bicycle model state ───────────────────────────────────
  function createVehicleState(opts) {
    const o = opts || {};
    return {
      // Position & orientation
      x:       o.x     || 0,
      y:       o.y     || 0,
      psi:     o.psi   || 0,  // yaw angle
      // Velocities (body frame)
      vx:      o.vx    || 0,
      vy:      o.vy    || 0,
      r:       o.r     || 0,  // yaw rate
      // Wheel speeds
      omegaFL: 0, omegaFR: 0, omegaRL: 0, omegaRR: 0,
      // Brake pressures per wheel
      brakeFL: 0, brakeFR: 0, brakeRL: 0, brakeRR: 0,
      // ABS state
      absActive: false, absTimer: 0,
      // TCS state
      tcsActive: false, tcsThrottle: 1,
      // ESC state
      escActive: false, escYawMoment: 0,
    };
  }

  // ── Vehicle parameters ────────────────────────────────────
  function createVehicleParams(opts) {
    const o = opts || {};
    return {
      mass:          o.mass          || 1200,
      Iz:            o.Iz            || 1800,  // yaw inertia kg·m²
      lf:            o.lf            || 1.1,   // CG to front axle
      lr:            o.lr            || 1.4,   // CG to rear axle
      wheelbase:     o.wheelbase     || 2.5,
      trackWidth:    o.trackWidth    || 1.5,
      CαF:           o.CαF           || 80000, // front cornering stiffness N/rad
      CαR:           o.CαR           || 95000, // rear cornering stiffness N/rad
      rollStiffF:    o.rollStiffF    || 18000, // N·m/rad
      rollStiffR:    o.rollStiffR    || 14000,
      antiRollF:     o.antiRollF     || 0.6,   // ARB fraction
      antiRollR:     o.antiRollR     || 0.3,
      CgH:           o.CgH           || 0.55,  // CG height m
      muMax:         o.muMax         || 1.1,
      wheelRadius:   o.wheelRadius   || 0.315,
      wheelInertia:  o.wheelInertia  || 1.2,   // kg·m²
    };
  }

  // ── Load transfer ─────────────────────────────────────────
  function loadTransfer(params, ax, ay) {
    const {mass:m, lf, lr, wheelbase:L, trackWidth:tw, CgH:h} = params;
    const g = 9.81;
    const dFzLong = m * ax * h / L;
    const dFzLat  = m * ay * h / tw;
    const Fz_static_f = m * g * lr / L;
    const Fz_static_r = m * g * lf / L;
    return {
      FL: Math.max(0, Fz_static_f/2 - dFzLong/2 + dFzLat/2),
      FR: Math.max(0, Fz_static_f/2 - dFzLong/2 - dFzLat/2),
      RL: Math.max(0, Fz_static_r/2 + dFzLong/2 + dFzLat/2),
      RR: Math.max(0, Fz_static_r/2 + dFzLong/2 - dFzLat/2),
    };
  }

  // ── Slip angles ───────────────────────────────────────────
  function slipAngles(state, params, steerAngle) {
    const {vx, vy, r} = state;
    const {lf, lr} = params;
    const vxSafe = Math.max(Math.abs(vx), 0.5) * Math.sign(vx || 1);
    const alphaF = steerAngle - Math.atan2(vy + r * lf, Math.abs(vxSafe));
    const alphaR = -Math.atan2(vy - r * lr, Math.abs(vxSafe));
    return { alphaF, alphaR };
  }

  // ── Cornering forces (linear) ─────────────────────────────
  function corneringForces(alphaF, alphaR, params, Fz) {
    const {CαF, CαR, muMax} = params;
    const g = 9.81;
    const FyFmax = muMax * (Fz ? Fz.front : params.mass * g * 0.47);
    const FyRmax = muMax * (Fz ? Fz.rear  : params.mass * g * 0.53);
    let FyF = CαF * alphaF;
    let FyR = CαR * alphaR;
    // Saturate (simple magic-formula-like saturation)
    FyF = FyFmax * Math.tanh(FyF / (FyFmax || 1));
    FyR = FyRmax * Math.tanh(FyR / (FyRmax || 1));
    return { FyF, FyR };
  }

  // ── Roll stiffness / anti-roll bar ────────────────────────
  function rollMoment(params, ay) {
    const m = params.mass, h = params.CgH, g = 9.81;
    const totalRoll = m * ay * h;
    const frontFrac = params.rollStiffF / (params.rollStiffF + params.rollStiffR || 1);
    return { front: totalRoll * frontFrac, rear: totalRoll * (1 - frontFrac) };
  }

  // ── Stability factor & understeer gradient ────────────────
  function stabilityFactor(params) {
    const {mass:m, CαF, CαR, lf, lr, wheelbase:L} = params;
    const k = (m / (L * L)) * (lr / CαF - lf / CαR);
    return k; // >0 understeer, <0 oversteer
  }

  function criticalSpeed(params) {
    const k = stabilityFactor(params);
    if (k >= 0) return Infinity;
    return Math.sqrt(-params.wheelbase / k);
  }

  // ── Yaw moment from differential wheel speeds ─────────────
  function yawMomentDiff(FxFL, FxFR, FxRL, FxRR, tw) {
    const frontMoment = (FxFR - FxFL) * tw / 2;
    const rearMoment  = (FxRR - FxRL) * tw / 2;
    return frontMoment + rearMoment;
  }

  // ── Electronic Stability Control ──────────────────────────
  function updateESC(state, params, steerAngle, throttle, dt) {
    const {vx, r} = state;
    const L = params.wheelbase, CgH = params.CgH;
    const vxSafe = Math.max(Math.abs(vx), 1);
    const k = stabilityFactor(params);
    // Target yaw rate
    const rTarget = vx * Math.tan(steerAngle) / (L * (1 + k * vx * vx));
    const rError  = r - rTarget;
    const threshold = 0.05; // rad/s

    state.escActive = Math.abs(rError) > threshold && vxSafe > 5;
    if (state.escActive) {
      const gain = 1500;
      state.escYawMoment = -gain * rError;
    } else {
      state.escYawMoment = 0;
    }
    return state.escYawMoment;
  }

  // ── Traction Control System ───────────────────────────────
  function updateTCS(state, params, throttle, slipRatios, dt) {
    const maxSlip = 0.15;
    const maxSlipAny = Math.max(...Object.values(slipRatios).map(Math.abs));
    state.tcsActive = maxSlipAny > maxSlip;
    if (state.tcsActive) {
      const reduction = (maxSlipAny - maxSlip) / maxSlipAny;
      state.tcsThrottle = Math.max(0.1, 1 - reduction * 1.5);
    } else {
      state.tcsThrottle = Math.min(1, state.tcsThrottle + 0.05);
    }
    return state.tcsThrottle;
  }

  // ── ABS brake pressure modulation ────────────────────────
  function updateABS(state, params, brakePressure, slipRatios, dt) {
    const ABS_SLIP_THRESHOLD = 0.25;
    const wheelKeys = ['FL','FR','RL','RR'];
    state.absActive = false;
    for (const w of wheelKeys) {
      const slip = Math.abs(slipRatios[w] || 0);
      if (slip > ABS_SLIP_THRESHOLD) {
        state.absActive = true;
        state.absTimer += dt;
        // Pulse brake at ~12Hz
        const pulse = Math.sin(state.absTimer * 2 * Math.PI * 12);
        state['brake'+w] = brakePressure * (0.5 + 0.4 * pulse);
      } else {
        state['brake'+w] = brakePressure;
      }
    }
    if (!state.absActive) state.absTimer = 0;
    return state.absActive;
  }

  // ── Wheel slip ratio calculation ──────────────────────────
  function slipRatio(wheelOmega, vehicleSpeed, wheelRadius) {
    const vw = wheelOmega * wheelRadius;
    const v  = Math.abs(vehicleSpeed) || 0.01;
    if (vehicleSpeed > 0.1) return (vw - vehicleSpeed) / v;
    if (vehicleSpeed < -0.1) return (vw - vehicleSpeed) / Math.abs(vehicleSpeed);
    return 0;
  }

  // ── Full 3-DOF bicycle model step ────────────────────────
  function stepVehicle(state, params, inputs, dt) {
    const {steerAngle=0, throttleTorque=0, brakePressure=0, engineBrake=0} = inputs;
    const {mass:m, Iz, lf, lr, wheelRadius:R, wheelInertia:Iw, muMax} = params;
    const g = 9.81;

    const {alphaF, alphaR} = slipAngles(state, params, steerAngle);
    const Fz = loadTransfer(params, 0, 0);
    const {FyF, FyR} = corneringForces(alphaF, alphaR, params, {
      front: Fz.FL + Fz.FR, rear: Fz.RL + Fz.RR
    });

    // Longitudinal forces
    const FxR = throttleTorque / R - engineBrake / R - brakePressure * 0.8;
    const FxF = -brakePressure * 0.4;

    // Body frame accelerations
    const ax = (FxF + FxR - m * state.r * state.vy) / m;
    const ay = (FyF + FyR + m * state.r * state.vx) / m;  // note: sign convention
    const ar = (FyF * lf - FyR * lr + state.escYawMoment) / Iz;

    state.vx += ax * dt;
    state.vy += ay * dt;
    state.r  += ar * dt;

    // Damping
    state.vx *= (1 - 0.003 * dt);
    state.vy *= (1 - 0.005 * dt);

    // World frame integration
    const psi = state.psi;
    state.x   += (state.vx * Math.cos(psi) - state.vy * Math.sin(psi)) * dt;
    state.y   += (state.vx * Math.sin(psi) + state.vy * Math.cos(psi)) * dt;
    state.psi += state.r * dt;

    // ESC, TCS, ABS
    const slipRatios = { FL:0, FR:0, RL:0, RR:0 };
    updateESC(state, params, steerAngle, inputs.throttle || 0, dt);
    updateTCS(state, params, inputs.throttle || 0, slipRatios, dt);
    updateABS(state, params, brakePressure, slipRatios, dt);

    const k = stabilityFactor(params);
    return {
      position:     { x: state.x, y: state.y, psi: state.psi },
      velocity:     { vx: state.vx, vy: state.vy, r: state.r },
      lateralForces:{ FyF, FyR },
      longitudinalF:{ FxF, FxR },
      slipAngles:   { alphaF, alphaR },
      loadTransfer: Fz,
      stabilityFactor: k,
      understeering:k > 0,
      oversteering: k < 0,
      escActive:    state.escActive,
      tcsActive:    state.tcsActive,
      absActive:    state.absActive,
    };
  }

  return {
    createVehicleState, createVehicleParams, stepVehicle,
    loadTransfer, slipAngles, corneringForces, rollMoment,
    stabilityFactor, criticalSpeed, yawMomentDiff,
    updateESC, updateTCS, updateABS, slipRatio,
  };
})();


// ============================================================
// PERFORMANCE_PHYSICS — LOD, sleeping, spatial hashing, determinism
// ============================================================
const PERFORMANCE_PHYSICS = (() => {
  'use strict';

  // ── LOD levels ────────────────────────────────────────────
  const LOD_LEVEL = {
    FULL:       0,   // full simulation, near camera
    REDUCED:    1,   // fewer substeps, approximate
    SIMPLIFIED: 2,   // kinematics only
    GHOST:      3,   // position interpolation only
    FROZEN:     4,   // no update
  };

  const LOD_DISTANCES = [0, 15, 40, 80, 150]; // meters

  function getLODLevel(distToCamera) {
    for (let i = LOD_DISTANCES.length - 1; i >= 0; i--) {
      if (distToCamera >= LOD_DISTANCES[i]) return i;
    }
    return LOD_LEVEL.FULL;
  }

  // ── Physics budget ────────────────────────────────────────
  const FRAME_BUDGET_MS  = 4.0;   // max ms for physics per frame
  const OVERFLOW_FALLBACK = true;

  function createBudget() {
    return { used: 0, limit: FRAME_BUDGET_MS, overflowed: false, skippedBodies: 0 };
  }

  function budgetStart(budget) {
    budget.used = performance.now();
    budget.overflowed = false;
    budget.skippedBodies = 0;
  }

  function budgetCheck(budget) {
    budget.used = performance.now() - budget.used;
    budget.overflowed = budget.used > budget.limit;
    return !budget.overflowed;
  }

  // ── Spatial hash ─────────────────────────────────────────
  function createSpatialHash(cellSize) {
    return { cellSize: cellSize || 2.0, map: new Map() };
  }

  function hashKey(hash, x, y) {
    const cx = Math.floor(x / hash.cellSize);
    const cy = Math.floor(y / hash.cellSize);
    return cx * 73856093 ^ cy * 19349663;
  }

  function spatialHashInsert(hash, body) {
    const {minX, minY, maxX, maxY} = body.aabb || {minX:body.position.x-0.5,minY:body.position.y-0.5,maxX:body.position.x+0.5,maxY:body.position.y+0.5};
    const x0 = Math.floor(minX / hash.cellSize), x1 = Math.floor(maxX / hash.cellSize);
    const y0 = Math.floor(minY / hash.cellSize), y1 = Math.floor(maxY / hash.cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const key = cx * 73856093 ^ cy * 19349663;
        if (!hash.map.has(key)) hash.map.set(key, []);
        hash.map.get(key).push(body);
      }
    }
  }

  function spatialHashQuery(hash, aabb) {
    const found = new Set();
    const x0 = Math.floor(aabb.minX / hash.cellSize), x1 = Math.floor(aabb.maxX / hash.cellSize);
    const y0 = Math.floor(aabb.minY / hash.cellSize), y1 = Math.floor(aabb.maxY / hash.cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const key = cx * 73856093 ^ cy * 19349663;
        const cell = hash.map.get(key);
        if (cell) for (const b of cell) found.add(b);
      }
    }
    return Array.from(found);
  }

  function spatialHashClear(hash) { hash.map.clear(); }

  // ── Island detection ──────────────────────────────────────
  function detectIslands(bodies, contacts) {
    const id     = new Map();
    const islands = [];
    let islandId = 0;

    for (const body of bodies) id.set(body, -1);

    function flood(body, iid) {
      if (id.get(body) !== -1) return;
      id.set(body, iid);
      for (const c of contacts) {
        if (c.bodyA === body && id.get(c.bodyB) === -1) flood(c.bodyB, iid);
        if (c.bodyB === body && id.get(c.bodyA) === -1) flood(c.bodyA, iid);
      }
    }

    for (const body of bodies) {
      if (id.get(body) === -1 && !body.isSleeping) {
        flood(body, islandId++);
      }
    }

    for (let i = 0; i < islandId; i++) {
      islands.push(bodies.filter(b => id.get(b) === i));
    }
    return islands;
  }

  // ── Warm-start impulse cache ──────────────────────────────
  const warmCache = new Map();

  function warmStartKey(idA, idB, contactIndex) {
    return `${Math.min(idA,idB)}_${Math.max(idA,idB)}_${contactIndex}`;
  }

  function warmStartStore(idA, idB, index, lambda) {
    warmCache.set(warmStartKey(idA, idB, index), lambda);
  }

  function warmStartGet(idA, idB, index) {
    return warmCache.get(warmStartKey(idA, idB, index)) || 0;
  }

  function warmStartClear() { warmCache.clear(); }

  // ── Deterministic seeded RNG (Mulberry32) ─────────────────
  function createSeededRNG(seed) {
    let s = seed || 12345;
    return function() {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Fixed-point arithmetic (Q16.16) ──────────────────────
  const FP_SHIFT = 16, FP_SCALE = 1 << FP_SHIFT;
  function toFixed(f)     { return Math.round(f * FP_SCALE) | 0; }
  function fromFixed(fp)  { return fp / FP_SCALE; }
  function fixedMul(a, b) { return (a * b >> FP_SHIFT) | 0; }
  function fixedDiv(a, b) { return b !== 0 ? (a / b * FP_SCALE) | 0 : 0; }
  function fixedAdd(a, b) { return (a + b) | 0; }
  function fixedSub(a, b) { return (a - b) | 0; }

  // ── Vectorized math helpers (SIMD-like in JS) ─────────────
  function vec4Add(a, b, out) {
    out[0] = a[0]+b[0]; out[1] = a[1]+b[1]; out[2] = a[2]+b[2]; out[3] = a[3]+b[3];
  }
  function vec4Mul(a, b, out) {
    out[0] = a[0]*b[0]; out[1] = a[1]*b[1]; out[2] = a[2]*b[2]; out[3] = a[3]*b[3];
  }
  function vec4Scale(a, s, out) {
    out[0] = a[0]*s; out[1] = a[1]*s; out[2] = a[2]*s; out[3] = a[3]*s;
  }
  function vec4Dot(a, b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]; }

  // ── Physics benchmark ─────────────────────────────────────
  function runBenchmark(stepFn, iterations) {
    const n = iterations || 100;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) stepFn(1/60);
    const elapsed = performance.now() - t0;
    return {
      totalMs:    elapsed,
      perStepMs:  elapsed / n,
      stepsPerSec: n / (elapsed / 1000),
      budgetUsage: (elapsed / n) / FRAME_BUDGET_MS,
    };
  }

  // ── LOD simplified physics step ───────────────────────────
  function simplifiedStep(body, gravity, dt) {
    if (!body || body.isStatic) return;
    body.velocity.x *= 0.98;
    body.velocity.y += gravity.y * dt;
    body.velocity.y *= 0.98;
    body.position.x += body.velocity.x * dt;
    body.position.y += body.velocity.y * dt;
    body.angle      += body.angularVel * dt;
    body.angularVel *= 0.97;
  }

  function ghostStep(body, targetPosition, dt) {
    if (!body) return;
    const alpha = Math.min(1, dt * 8);
    body.position.x += (targetPosition.x - body.position.x) * alpha;
    body.position.y += (targetPosition.y - body.position.y) * alpha;
  }

  // ── Overflow fallback: simple position integration ────────
  function fallbackStep(bodies, gravity, dt) {
    for (const body of bodies) {
      if (body.isStatic || body.isSleeping) continue;
      body.velocity.y += gravity.y * dt;
      body.velocity.x *= 0.99;
      body.velocity.y *= 0.99;
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
    }
  }

  // ── Adaptive step selector ────────────────────────────────
  function adaptiveStep(world, dt, budget, camPos) {
    budgetStart(budget);
    const hash = createSpatialHash(3.0);

    for (const body of world.bodies) {
      if (body.isSleeping || body.isStatic) continue;
      const dist = camPos
        ? Math.sqrt((body.position.x-camPos.x)**2 + (body.position.y-camPos.y)**2)
        : 0;
      const lod = getLODLevel(dist);

      if (!budgetCheck(budget) && OVERFLOW_FALLBACK) {
        fallbackStep([body], world.gravity, dt);
        budget.skippedBodies++;
        continue;
      }

      if (lod === LOD_LEVEL.FULL || lod === LOD_LEVEL.REDUCED) {
        // Full physics handled by the main world stepper
      } else if (lod === LOD_LEVEL.SIMPLIFIED) {
        simplifiedStep(body, world.gravity, dt);
      } else if (lod >= LOD_LEVEL.GHOST) {
        // Ghost: no update needed, driven externally
      }
      spatialHashInsert(hash, body);
    }
    return hash;
  }

  // ── Replay determinism support ────────────────────────────
  const REPLAY_SEED = 0xDEADBEEF;
  const replayRng   = createSeededRNG(REPLAY_SEED);

  function deterministicRandom() { return replayRng(); }

  function snapshotState(world) {
    return world.bodies.map(b => ({
      id: b.id,
      position: { ...b.position },
      velocity: { ...b.velocity },
      angle:    b.angle,
      angularVel: b.angularVel,
      isSleeping: b.isSleeping,
    }));
  }

  function restoreSnapshot(world, snapshot) {
    for (const s of snapshot) {
      const body = world.bodies.find(b => b.id === s.id);
      if (!body) continue;
      body.position   = { ...s.position };
      body.velocity   = { ...s.velocity };
      body.angle      = s.angle;
      body.angularVel = s.angularVel;
      body.isSleeping = s.isSleeping;
    }
  }

  return {
    LOD_LEVEL, LOD_DISTANCES, getLODLevel,
    createBudget, budgetStart, budgetCheck,
    createSpatialHash, spatialHashInsert, spatialHashQuery, spatialHashClear,
    detectIslands,
    warmStartStore, warmStartGet, warmStartClear,
    createSeededRNG, deterministicRandom,
    toFixed, fromFixed, fixedMul, fixedDiv, fixedAdd, fixedSub,
    vec4Add, vec4Mul, vec4Scale, vec4Dot,
    runBenchmark,
    simplifiedStep, ghostStep, fallbackStep, adaptiveStep,
    snapshotState, restoreSnapshot,
    FRAME_BUDGET_MS, REPLAY_SEED,
  };
})();


// ============================================================
// PHYSICS_MATERIALS_DB — Comprehensive material physics database
// ============================================================
const PHYSICS_MATERIALS_DB = (() => {
  'use strict';

  // ── Material properties database ──────────────────────────
  const MATERIALS = {
    // Metals
    steel: {
      density: 7850, youngsModulus: 200e9, poissonsRatio: 0.30,
      yieldStrength: 250e6, ultimateTensile: 400e6,
      thermalConductivity: 50, specificHeat: 500,
      thermalExpansion: 11.7e-6, emissivity: 0.7,
      frictionDry: 0.15, frictionLubricated: 0.05,
      hardness: 120, fractureToughness: 50e6,
    },
    aluminum: {
      density: 2700, youngsModulus: 70e9, poissonsRatio: 0.33,
      yieldStrength: 270e6, ultimateTensile: 310e6,
      thermalConductivity: 237, specificHeat: 900,
      thermalExpansion: 23.1e-6, emissivity: 0.05,
      frictionDry: 0.35, frictionLubricated: 0.08,
      hardness: 65, fractureToughness: 25e6,
    },
    cast_iron: {
      density: 7200, youngsModulus: 170e9, poissonsRatio: 0.26,
      yieldStrength: 180e6, ultimateTensile: 260e6,
      thermalConductivity: 52, specificHeat: 490,
      thermalExpansion: 10.8e-6, emissivity: 0.95,
      frictionDry: 0.14, frictionLubricated: 0.04,
      hardness: 200, fractureToughness: 15e6,
    },
    titanium: {
      density: 4510, youngsModulus: 116e9, poissonsRatio: 0.32,
      yieldStrength: 880e6, ultimateTensile: 950e6,
      thermalConductivity: 22, specificHeat: 520,
      thermalExpansion: 8.6e-6, emissivity: 0.12,
      frictionDry: 0.36, frictionLubricated: 0.10,
      hardness: 320, fractureToughness: 60e6,
    },
    magnesium: {
      density: 1740, youngsModulus: 45e9, poissonsRatio: 0.35,
      yieldStrength: 160e6, ultimateTensile: 220e6,
      thermalConductivity: 156, specificHeat: 1020,
      thermalExpansion: 25.2e-6, emissivity: 0.07,
      frictionDry: 0.42, frictionLubricated: 0.11,
      hardness: 50, fractureToughness: 12e6,
    },
    // Polymers
    rubber: {
      density: 1200, youngsModulus: 0.01e9, poissonsRatio: 0.49,
      yieldStrength: 15e6, ultimateTensile: 25e6,
      thermalConductivity: 0.16, specificHeat: 1250,
      thermalExpansion: 150e-6, emissivity: 0.92,
      frictionDry: 0.85, frictionLubricated: 0.25,
      hardness: 60, fractureToughness: 0.1e6,
    },
    nylon: {
      density: 1140, youngsModulus: 3e9, poissonsRatio: 0.39,
      yieldStrength: 75e6, ultimateTensile: 85e6,
      thermalConductivity: 0.25, specificHeat: 1700,
      thermalExpansion: 80e-6, emissivity: 0.90,
      frictionDry: 0.30, frictionLubricated: 0.08,
      hardness: 85, fractureToughness: 3e6,
    },
    carbon_fiber: {
      density: 1600, youngsModulus: 230e9, poissonsRatio: 0.28,
      yieldStrength: 1500e6, ultimateTensile: 3500e6,
      thermalConductivity: 8, specificHeat: 700,
      thermalExpansion: 0.5e-6, emissivity: 0.85,
      frictionDry: 0.20, frictionLubricated: 0.05,
      hardness: 400, fractureToughness: 30e6,
    },
    // Ground surfaces
    asphalt: {
      density: 2300, youngsModulus: 3e9, poissonsRatio: 0.35,
      yieldStrength: 2e6, ultimateTensile: 3e6,
      thermalConductivity: 1.2, specificHeat: 920,
      thermalExpansion: 7e-6, emissivity: 0.93,
      frictionDry: 0.75, frictionLubricated: 0.45,
      hardness: 50, fractureToughness: 0.5e6,
    },
    concrete: {
      density: 2400, youngsModulus: 30e9, poissonsRatio: 0.20,
      yieldStrength: 30e6, ultimateTensile: 3e6,
      thermalConductivity: 1.7, specificHeat: 880,
      thermalExpansion: 12e-6, emissivity: 0.88,
      frictionDry: 0.70, frictionLubricated: 0.40,
      hardness: 20, fractureToughness: 0.8e6,
    },
    gravel: {
      density: 1700, youngsModulus: 0.1e9, poissonsRatio: 0.30,
      yieldStrength: 0.5e6, ultimateTensile: 0.1e6,
      thermalConductivity: 0.5, specificHeat: 840,
      thermalExpansion: 9e-6, emissivity: 0.85,
      frictionDry: 0.55, frictionLubricated: 0.35,
      hardness: 15, fractureToughness: 0.05e6,
    },
    mud: {
      density: 1800, youngsModulus: 0.002e9, poissonsRatio: 0.45,
      yieldStrength: 0.05e6, ultimateTensile: 0.02e6,
      thermalConductivity: 0.8, specificHeat: 1600,
      thermalExpansion: 15e-6, emissivity: 0.94,
      frictionDry: 0.30, frictionLubricated: 0.20,
      hardness: 2, fractureToughness: 0.001e6,
    },
    snow: {
      density: 300, youngsModulus: 0.0003e9, poissonsRatio: 0.40,
      yieldStrength: 0.02e6, ultimateTensile: 0.005e6,
      thermalConductivity: 0.25, specificHeat: 2090,
      thermalExpansion: 50e-6, emissivity: 0.97,
      frictionDry: 0.18, frictionLubricated: 0.10,
      hardness: 1, fractureToughness: 0.0002e6,
    },
    ice: {
      density: 917, youngsModulus: 9e9, poissonsRatio: 0.33,
      yieldStrength: 3e6, ultimateTensile: 1e6,
      thermalConductivity: 2.2, specificHeat: 2090,
      thermalExpansion: 52e-6, emissivity: 0.97,
      frictionDry: 0.05, frictionLubricated: 0.02,
      hardness: 2, fractureToughness: 0.1e6,
    },
    sand: {
      density: 1600, youngsModulus: 0.05e9, poissonsRatio: 0.33,
      yieldStrength: 0.1e6, ultimateTensile: 0.02e6,
      thermalConductivity: 0.3, specificHeat: 840,
      thermalExpansion: 11e-6, emissivity: 0.90,
      frictionDry: 0.45, frictionLubricated: 0.30,
      hardness: 7, fractureToughness: 0.002e6,
    },
    grass: {
      density: 800, youngsModulus: 0.001e9, poissonsRatio: 0.48,
      yieldStrength: 0.01e6, ultimateTensile: 0.003e6,
      thermalConductivity: 0.2, specificHeat: 1800,
      thermalExpansion: 30e-6, emissivity: 0.94,
      frictionDry: 0.55, frictionLubricated: 0.30,
      hardness: 1, fractureToughness: 0.0005e6,
    },
    wood: {
      density: 600, youngsModulus: 12e9, poissonsRatio: 0.30,
      yieldStrength: 40e6, ultimateTensile: 60e6,
      thermalConductivity: 0.12, specificHeat: 1700,
      thermalExpansion: 5e-6, emissivity: 0.90,
      frictionDry: 0.40, frictionLubricated: 0.15,
      hardness: 3, fractureToughness: 2e6,
    },
  };

  // ── Friction pair lookup ──────────────────────────────────
  const FRICTION_PAIRS = {
    rubber_asphalt:   { static: 0.85, kinetic: 0.72, rolling: 0.012 },
    rubber_concrete:  { static: 0.80, kinetic: 0.67, rolling: 0.013 },
    rubber_gravel:    { static: 0.60, kinetic: 0.50, rolling: 0.025 },
    rubber_mud:       { static: 0.40, kinetic: 0.30, rolling: 0.050 },
    rubber_snow:      { static: 0.30, kinetic: 0.22, rolling: 0.030 },
    rubber_ice:       { static: 0.12, kinetic: 0.08, rolling: 0.010 },
    rubber_sand:      { static: 0.52, kinetic: 0.42, rolling: 0.035 },
    rubber_grass:     { static: 0.58, kinetic: 0.48, rolling: 0.020 },
    rubber_water:     { static: 0.15, kinetic: 0.10, rolling: 0.005 },
    steel_steel:      { static: 0.15, kinetic: 0.10, rolling: 0.001 },
    steel_asphalt:    { static: 0.40, kinetic: 0.30, rolling: 0.015 },
    aluminum_steel:   { static: 0.35, kinetic: 0.25, rolling: 0.002 },
    cast_iron_steel:  { static: 0.14, kinetic: 0.09, rolling: 0.001 },
  };

  function getFrictionPair(matA, matB) {
    const key = [matA, matB].sort().join('_');
    return FRICTION_PAIRS[key] || { static: 0.35, kinetic: 0.25, rolling: 0.015 };
  }

  // ── Elastic collision restitution by material pair ────────
  const RESTITUTION_PAIRS = {
    rubber_asphalt: 0.35, rubber_steel:  0.45, steel_steel: 0.28,
    aluminum_steel: 0.30, wood_steel:    0.32, wood_concrete: 0.20,
    rubber_rubber:  0.60, glass_steel:   0.25, carbon_fiber_steel: 0.22,
  };

  function getRestitutionPair(matA, matB) {
    const key = [matA, matB].sort().join('_');
    return RESTITUTION_PAIRS[key] !== undefined ? RESTITUTION_PAIRS[key] : 0.25;
  }

  // ── Material stiffness for contact model ─────────────────
  function hertzContactStiffness(matA, matB) {
    const mA = MATERIALS[matA] || MATERIALS.steel;
    const mB = MATERIALS[matB] || MATERIALS.steel;
    const EA = mA.youngsModulus, vA = mA.poissonsRatio;
    const EB = mB.youngsModulus, vB = mB.poissonsRatio;
    const Estar = 1 / ((1 - vA*vA)/EA + (1 - vB*vB)/EB);
    return Estar;
  }

  // ── Wear rate (Archard) ───────────────────────────────────
  function archardWear(normalForce, slidingDistance, hardness, wearCoeff) {
    const H = hardness || 100e6;
    const K = wearCoeff || 1e-7;
    return K * normalForce * slidingDistance / H;
  }

  // ── Tire compound database ────────────────────────────────
  const TIRE_COMPOUNDS = {
    soft:     { peakMu: 1.25, tempOptimal: 90,  durability: 0.60, warmupRate: 1.5 },
    medium:   { peakMu: 1.15, tempOptimal: 80,  durability: 0.85, warmupRate: 1.0 },
    hard:     { peakMu: 1.05, tempOptimal: 70,  durability: 1.00, warmupRate: 0.7 },
    wet:      { peakMu: 0.95, tempOptimal: 40,  durability: 0.90, warmupRate: 0.8 },
    slick:    { peakMu: 1.40, tempOptimal: 100, durability: 0.45, warmupRate: 2.0 },
    allSeason:{ peakMu: 1.00, tempOptimal: 60,  durability: 1.00, warmupRate: 0.9 },
    offRoad:  { peakMu: 0.90, tempOptimal: 55,  durability: 1.10, warmupRate: 0.8 },
    winter:   { peakMu: 0.85, tempOptimal: -5,  durability: 0.95, warmupRate: 0.6 },
    run_flat: { peakMu: 1.05, tempOptimal: 72,  durability: 0.80, warmupRate: 0.9 },
  };

  function tireMuAtTemp(compound, tireTemp) {
    const comp = TIRE_COMPOUNDS[compound] || TIRE_COMPOUNDS.medium;
    const dT   = tireTemp - comp.tempOptimal;
    const falloff = Math.exp(-0.0005 * dT * dT);
    return comp.peakMu * falloff;
  }

  function tireWearRate(compound, normalForce, slipRatio, tireTemp) {
    const comp = TIRE_COMPOUNDS[compound] || TIRE_COMPOUNDS.medium;
    const tempFactor = 1 + Math.max(0, (tireTemp - comp.tempOptimal) / comp.tempOptimal) * 2;
    const slipFactor = slipRatio * slipRatio * 4;
    return normalForce * slipFactor * tempFactor / (comp.durability * 1e7);
  }

  // ── Fluid viscosity database ──────────────────────────────
  const FLUID_VISCOSITY = {
    water:       { dynamic: 0.001,   kinematic: 1e-6,   density: 1000 },
    engine_oil_5w30: { dynamic: 0.050, kinematic: 60e-6, density: 865 },
    engine_oil_10w40: { dynamic: 0.080, kinematic: 90e-6, density: 875 },
    brake_fluid: { dynamic: 0.003,   kinematic: 3.5e-6, density: 1050 },
    coolant:     { dynamic: 0.002,   kinematic: 2e-6,   density: 1060 },
    fuel_petrol: { dynamic: 0.00052, kinematic: 0.6e-6, density: 750 },
    fuel_diesel: { dynamic: 0.0035,  kinematic: 4e-6,   density: 840 },
    transmission_fluid: { dynamic: 0.025, kinematic: 28e-6, density: 855 },
    gear_oil:    { dynamic: 0.15,    kinematic: 165e-6, density: 890 },
    power_steering_fluid: { dynamic: 0.015, kinematic: 18e-6, density: 855 },
    mud_water_mix: { dynamic: 0.05,  kinematic: 30e-6,  density: 1400 },
    sand_water:  { dynamic: 0.10,    kinematic: 70e-6,  density: 1600 },
    air:         { dynamic: 1.81e-5, kinematic: 1.48e-5,density: 1.225 },
  };

  function reynoldsNumber(velocity, length, fluid) {
    const f = FLUID_VISCOSITY[fluid] || FLUID_VISCOSITY.air;
    return velocity * length / f.kinematic;
  }

  function dragCoeffFromRe(Re) {
    if (Re < 1)      return 24 / Re;           // Stokes
    if (Re < 1000)   return 24/Re + 6/(1+Math.sqrt(Re)) + 0.4;  // Intermediate
    if (Re < 200000) return 0.44;              // Newton
    return 0.10;                               // Turbulent
  }

  // ── Structural properties for crash simulation ────────────
  const CRASH_MATERIAL_PROPS = {
    ultra_high_strength_steel: { energy_absorption: 25000, crush_strength: 300e6, strain_hardening: 0.15 },
    high_strength_steel:       { energy_absorption: 18000, crush_strength: 210e6, strain_hardening: 0.18 },
    mild_steel:                { energy_absorption: 12000, crush_strength: 160e6, strain_hardening: 0.25 },
    aluminum_5xxx:             { energy_absorption: 8000,  crush_strength: 120e6, strain_hardening: 0.20 },
    aluminum_6xxx:             { energy_absorption: 7000,  crush_strength: 110e6, strain_hardening: 0.15 },
    carbon_fiber_composite:    { energy_absorption: 40000, crush_strength: 400e6, strain_hardening: 0.00 },
    glass_fiber_composite:     { energy_absorption: 15000, crush_strength: 150e6, strain_hardening: 0.00 },
    foam_aluminum:             { energy_absorption: 6000,  crush_strength:  8e6,  strain_hardening: 0.02 },
    honeycomb_aluminum:        { energy_absorption: 20000, crush_strength: 40e6,  strain_hardening: 0.01 },
  };

  function crushForce(material, deformation, area) {
    const m = CRASH_MATERIAL_PROPS[material] || CRASH_MATERIAL_PROPS.mild_steel;
    const sh = m.strain_hardening;
    return m.crush_strength * area * (1 + sh * deformation);
  }

  function energyAbsorbed(material, crushLength, area) {
    const m = CRASH_MATERIAL_PROPS[material] || CRASH_MATERIAL_PROPS.mild_steel;
    return m.energy_absorption * area * crushLength;
  }

  return {
    MATERIALS, FRICTION_PAIRS, RESTITUTION_PAIRS,
    TIRE_COMPOUNDS, FLUID_VISCOSITY, CRASH_MATERIAL_PROPS,
    getFrictionPair, getRestitutionPair, hertzContactStiffness,
    archardWear, tireMuAtTemp, tireWearRate,
    reynoldsNumber, dragCoeffFromRe, crushForce, energyAbsorbed,
  };
})();


// ============================================================
// SUSPENSION_DYNAMICS_EXT — Extended suspension model
// ============================================================
const SUSPENSION_DYNAMICS_EXT = (() => {
  'use strict';

  // ── Corner suspension state ───────────────────────────────
  function createCornerState(opts) {
    const o = opts || {};
    return {
      position:   o.position   || 0,   // wheel travel (m)
      velocity:   o.velocity   || 0,   // travel rate (m/s)
      springF:    0,
      damperF:    0,
      totalF:     0,
      bumpStop:   false,
      reboundStop:false,
      tireDefl:   0,
      contactPatchLoad: 0,
    };
  }

  // ── Spring characteristics (progressive rate) ─────────────
  const SPRING_PRESETS = {
    soft:        { rate: 18000,  progressivity: 0.15, preload: 2000 },
    medium:      { rate: 28000,  progressivity: 0.20, preload: 2800 },
    hard:        { rate: 40000,  progressivity: 0.25, preload: 3500 },
    race:        { rate: 65000,  progressivity: 0.35, preload: 5000 },
    rally:       { rate: 55000,  progressivity: 0.30, preload: 4200 },
    offroad:     { rate: 22000,  progressivity: 0.12, preload: 2500 },
    drift:       { rate: 38000,  progressivity: 0.22, preload: 3200 },
    drag:        { rate: 50000,  progressivity: 0.28, preload: 4000 },
  };

  function springForce(spring, travel) {
    const {rate:k, progressivity:p, preload:F0} = spring;
    const kEff = k * (1 + p * Math.abs(travel));
    return F0 + kEff * travel;
  }

  // ── Damper characteristics (digressive) ───────────────────
  const DAMPER_PRESETS = {
    oem_soft:    { bump: 1800, rebound: 2800, digressive: 0.30 },
    oem_medium:  { bump: 2500, rebound: 3800, digressive: 0.35 },
    oem_hard:    { bump: 3500, rebound: 5000, digressive: 0.40 },
    sport:       { bump: 4500, rebound: 7000, digressive: 0.45 },
    race_mono:   { bump: 6000, rebound: 9500, digressive: 0.50 },
    rally_coil:  { bump: 5000, rebound: 8000, digressive: 0.48 },
    coilover:    { bump: 5500, rebound: 8500, digressive: 0.50 },
    air_ride:    { bump: 3000, rebound: 4500, digressive: 0.25 },
  };

  function damperForce(damper, velocity) {
    const {bump:b, rebound:r, digressive:d} = damper;
    if (velocity >= 0) {
      return b * velocity / (1 + d * Math.abs(velocity));
    } else {
      return r * velocity / (1 + d * Math.abs(velocity));
    }
  }

  // ── Bump stop model ───────────────────────────────────────
  const BUMP_STOP_RATE    = 200000; // N/m — very stiff
  const BUMP_STOP_ENGAGE  = 0.005;  // m before end of travel

  function bumpStopForce(travel, maxBump, maxRebound) {
    const towardsBump    = travel - (maxBump    - BUMP_STOP_ENGAGE);
    const towardsRebound = (-maxRebound + BUMP_STOP_ENGAGE) - travel;
    let F = 0;
    if (towardsBump    > 0) F += BUMP_STOP_RATE * towardsBump * towardsBump;
    if (towardsRebound > 0) F -= BUMP_STOP_RATE * towardsRebound * towardsRebound;
    return F;
  }

  // ── Anti-roll bar model ───────────────────────────────────
  function antiRollForce(rollStiffness, leftTravel, rightTravel) {
    const diff = leftTravel - rightTravel;
    const F    = rollStiffness * diff;
    return { left: -F, right: F };
  }

  // ── Full corner step ──────────────────────────────────────
  function stepCorner(corner, spring, damper, inputs, dt) {
    const {vehicleSideAccel=0, maxBump=0.10, maxRebound=0.12, staticLoad=3000} = inputs;
    const bsF = bumpStopForce(corner.position, maxBump, maxRebound);
    const spF = -springForce(spring, corner.position);
    const dpF = -damperForce(damper, corner.velocity);
    const totalF = spF + dpF + bsF;
    corner.springF = spF;
    corner.damperF = dpF;
    corner.bumpStop = bsF !== 0;
    corner.totalF  = totalF;
    const wheelMass = 15; // kg
    const acc = (totalF - staticLoad) / wheelMass;
    corner.velocity += acc * dt;
    corner.position += corner.velocity * dt;
    corner.position = Math.max(-maxRebound, Math.min(maxBump, corner.position));
    corner.contactPatchLoad = Math.max(0, staticLoad + spF);
    return corner;
  }

  // ── Four-corner suspension ────────────────────────────────
  function stepFourCorner(corners, springs, dampers, vehicle, dt) {
    const {ax=0, ay=0, mass=1200, trackWidth=1.5, wheelbase=2.5, cgHeight=0.55} = vehicle;
    const g = 9.81;
    const lf = wheelbase * 0.44, lr = wheelbase * 0.56;
    const staticF = mass * g;
    const dFzLong = mass * ax * cgHeight / wheelbase;
    const dFzLat  = mass * ay * cgHeight / trackWidth;
    const fzFL = Math.max(0, (staticF * lr / wheelbase / 2) - dFzLong/2 + dFzLat/2);
    const fzFR = Math.max(0, (staticF * lr / wheelbase / 2) - dFzLong/2 - dFzLat/2);
    const fzRL = Math.max(0, (staticF * lf / wheelbase / 2) + dFzLong/2 + dFzLat/2);
    const fzRR = Math.max(0, (staticF * lf / wheelbase / 2) + dFzLong/2 - dFzLat/2);

    const fLoads = [fzFL, fzFR, fzRL, fzRR];
    const keys   = ['FL','FR','RL','RR'];
    const results = {};

    for (let i = 0; i < 4; i++) {
      const k = keys[i];
      const res = stepCorner(corners[k], springs[k] || springs.default || SPRING_PRESETS.medium,
        dampers[k] || dampers.default || DAMPER_PRESETS.oem_medium,
        { staticLoad: fLoads[i], maxBump: 0.10, maxRebound: 0.12 }, dt);
      results[k] = { travel: res.position, velocity: res.velocity, load: res.contactPatchLoad };
    }

    // Anti-roll correction
    const rollF = antiRollForce(20000, corners.FL.position, corners.FR.position);
    corners.FL.velocity += rollF.left  / 15 * dt;
    corners.FR.velocity += rollF.right / 15 * dt;
    const rollR = antiRollForce(15000, corners.RL.position, corners.RR.position);
    corners.RL.velocity += rollR.left  / 15 * dt;
    corners.RR.velocity += rollR.right / 15 * dt;

    return results;
  }

  // ── Ride height & attitude ────────────────────────────────
  function vehicleAttitude(corners) {
    const avg  = (a, b) => (a + b) / 2;
    const roll = ((corners.FL.position + corners.RL.position) - (corners.FR.position + corners.RR.position)) / 2;
    const pitch= ((corners.FL.position + corners.FR.position) - (corners.RL.position + corners.RR.position)) / 2;
    const heave= avg(avg(corners.FL.position, corners.FR.position), avg(corners.RL.position, corners.RR.position));
    return { roll, pitch, heave };
  }

  // ── Damper velocity → force lookup tables ─────────────────
  const DAMPER_CURVES = {
    race_mono: [
      { v: -2.0, F: -9500 }, { v: -1.0, F: -7200 }, { v: -0.5, F: -4800 },
      { v: -0.2, F: -2600 }, { v:  0.0, F:  0    }, { v:  0.2, F:  1400 },
      { v:  0.5, F:  2800 }, { v:  1.0, F:  4200 }, { v:  2.0, F:  6000 },
    ],
    street: [
      { v: -2.0, F: -4800 }, { v: -1.0, F: -3500 }, { v: -0.5, F: -2200 },
      { v: -0.2, F: -1200 }, { v:  0.0, F:  0    }, { v:  0.2, F:   800 },
      { v:  0.5, F:  1500 }, { v:  1.0, F:  2200 }, { v:  2.0, F:  3000 },
    ],
  };

  function damperCurveLookup(curve, velocity) {
    const pts = DAMPER_CURVES[curve] || DAMPER_CURVES.street;
    for (let i = 1; i < pts.length; i++) {
      if (velocity <= pts[i].v) {
        const t = (velocity - pts[i-1].v) / (pts[i].v - pts[i-1].v);
        return pts[i-1].F + t * (pts[i].F - pts[i-1].F);
      }
    }
    return pts[pts.length-1].F;
  }

  // ── Suspension geometry: roll center height ───────────────
  function rollCenterHeight(suspGeom) {
    const {innerPivotHeight, outerPivotHeight, trackWidth, cgHeight} = suspGeom;
    const slope = (outerPivotHeight - innerPivotHeight) / (trackWidth / 2);
    return innerPivotHeight + slope * (trackWidth / 2);
  }

  return {
    createCornerState, SPRING_PRESETS, DAMPER_PRESETS,
    springForce, damperForce, bumpStopForce,
    antiRollForce, stepCorner, stepFourCorner, vehicleAttitude,
    DAMPER_CURVES, damperCurveLookup, rollCenterHeight,
    BUMP_STOP_RATE, BUMP_STOP_ENGAGE,
  };
})();


// ============================================================
// POWERTRAIN_DYNAMICS_EXT — Detailed drivetrain simulation
// ============================================================
const POWERTRAIN_DYNAMICS_EXT = (() => {
  'use strict';

  // ── Transmission types ────────────────────────────────────
  const TRANSMISSION_TYPE = {
    MANUAL:     'manual',
    AUTOMATIC:  'automatic',
    DCT:        'dct',
    CVT:        'cvt',
    SEQUENTIAL: 'sequential',
  };

  // ── Gear set definitions ──────────────────────────────────
  const GEAR_SETS = {
    sport_6speed: {
      type: TRANSMISSION_TYPE.MANUAL,
      ratios: [3.82, 2.36, 1.69, 1.31, 1.04, 0.84],
      finalDrive: 3.55,
      reverseRatio: 3.79,
      synchroTime: 0.08,
    },
    rally_6speed: {
      type: TRANSMISSION_TYPE.SEQUENTIAL,
      ratios: [3.50, 2.18, 1.55, 1.16, 0.92, 0.75],
      finalDrive: 3.90,
      reverseRatio: 3.50,
      synchroTime: 0.04,
    },
    suv_8speed: {
      type: TRANSMISSION_TYPE.AUTOMATIC,
      ratios: [4.71, 3.14, 2.10, 1.67, 1.29, 1.00, 0.84, 0.67],
      finalDrive: 3.15,
      reverseRatio: 3.89,
      synchroTime: 0.12,
    },
    truck_10speed: {
      type: TRANSMISSION_TYPE.AUTOMATIC,
      ratios: [4.70, 2.99, 2.15, 1.80, 1.52, 1.28, 1.00, 0.85, 0.69, 0.58],
      finalDrive: 3.73,
      reverseRatio: 4.87,
      synchroTime: 0.15,
    },
    race_7speed_dct: {
      type: TRANSMISSION_TYPE.DCT,
      ratios: [3.15, 2.11, 1.56, 1.21, 0.97, 0.80, 0.65],
      finalDrive: 3.85,
      reverseRatio: 3.50,
      synchroTime: 0.018,
    },
    cvt_steel: {
      type: TRANSMISSION_TYPE.CVT,
      ratioMin: 0.45, ratioMax: 2.50,
      finalDrive: 3.90, synchroTime: 0,
    },
  };

  // ── Differential types ────────────────────────────────────
  const DIFF_TYPE = {
    OPEN:    'open',
    LSD:     'lsd',
    TORSEN:  'torsen',
    LOCKER:  'locker',
    EDIFF:   'ediff',
  };

  // ── Open differential ─────────────────────────────────────
  function openDiff(driveTorque) {
    return { left: driveTorque / 2, right: driveTorque / 2 };
  }

  // ── LSD (limited slip) ────────────────────────────────────
  function lsdDiff(driveTorque, speedDiff, preload, lockFactor) {
    const preF = preload  || 50;
    const lf   = lockFactor || 0.4;
    const lockTorque = Math.min(Math.abs(speedDiff) * lf * 200, driveTorque * 0.8);
    const base = driveTorque / 2;
    const bias = Math.sign(speedDiff) * Math.min(lockTorque + preF, driveTorque * 0.5);
    return { left: base - bias, right: base + bias };
  }

  // ── Torsen differential ───────────────────────────────────
  function torsenDiff(driveTorque, speedDiff) {
    const biasRatio = 4.0;
    const totalTrq  = Math.abs(driveTorque);
    const base      = totalTrq / 2;
    const bias      = speedDiff === 0 ? 0 : (biasRatio - 1) / (biasRatio + 1) * base;
    return {
      left:  base + (speedDiff > 0 ? -bias : bias),
      right: base + (speedDiff > 0 ?  bias : -bias),
    };
  }

  // ── Electronic LSD ────────────────────────────────────────
  function ediff(driveTorque, speedDiff, targetBias) {
    const bias = Math.max(-1, Math.min(1, targetBias || 0));
    const half = driveTorque / 2;
    const shift = bias * half * 0.5;
    return { left: half - shift, right: half + shift };
  }

  // ── Clutch model ──────────────────────────────────────────
  function createClutch(opts) {
    const o = opts || {};
    return {
      engagement:  o.engagement  || 0,    // 0=open, 1=fully engaged
      maxTorque:   o.maxTorque   || 500,  // Nm
      slipping:    false,
      slipTorque:  0,
      frictionCoeff: o.frictionCoeff || 0.40,
      plateArea:   o.plateArea   || 0.06, // m²
      plates:      o.plates      || 6,
      springForce: o.springForce || 8000, // N
    };
  }

  function clutchTransmittedTorque(clutch, engineTorque, shaftOmegaDiff) {
    const maxF = clutch.frictionCoeff * clutch.springForce * clutch.engagement * clutch.plates;
    const radius = Math.sqrt(clutch.plateArea / Math.PI) * 0.67;
    const maxT   = maxF * radius;
    clutch.slipping = Math.abs(engineTorque) > maxT;
    if (clutch.slipping) {
      clutch.slipTorque = Math.sign(shaftOmegaDiff) * maxT;
      return Math.sign(engineTorque) * maxT;
    }
    clutch.slipTorque = 0;
    return engineTorque * clutch.engagement;
  }

  // ── Torque converter ──────────────────────────────────────
  const TORQUE_CONVERTER_CURVE = [
    // [speed_ratio, torque_ratio, capacity_factor]
    [0.00, 2.00, 180], [0.10, 1.90, 190], [0.20, 1.75, 200],
    [0.30, 1.58, 210], [0.40, 1.42, 218], [0.50, 1.28, 225],
    [0.60, 1.15, 230], [0.70, 1.04, 233], [0.80, 0.96, 235],
    [0.85, 0.92, 234], [0.90, 0.95, 230], [1.00, 1.00, 220],
  ];

  function torqueConverterOutput(inputRpm, outputRpm, inputTorque) {
    const speedRatio = inputRpm > 0 ? Math.min(outputRpm / inputRpm, 1) : 0;
    let tr = 1, cf = 220;
    for (let i = 1; i < TORQUE_CONVERTER_CURVE.length; i++) {
      if (speedRatio <= TORQUE_CONVERTER_CURVE[i][0]) {
        const t = (speedRatio - TORQUE_CONVERTER_CURVE[i-1][0])
                / (TORQUE_CONVERTER_CURVE[i][0] - TORQUE_CONVERTER_CURVE[i-1][0]);
        tr = TORQUE_CONVERTER_CURVE[i-1][1] + t * (TORQUE_CONVERTER_CURVE[i][1] - TORQUE_CONVERTER_CURVE[i-1][1]);
        cf = TORQUE_CONVERTER_CURVE[i-1][2] + t * (TORQUE_CONVERTER_CURVE[i][2] - TORQUE_CONVERTER_CURVE[i-1][2]);
        break;
      }
    }
    const outputTorque = inputTorque * tr;
    const pumpTorque   = inputRpm * inputRpm / (cf * cf);
    return { outputTorque, torqueRatio: tr, capacityFactor: cf, pumpTorque };
  }

  // ── Powertrain state ──────────────────────────────────────
  function createPowertrainState(opts) {
    const o = opts || {};
    return {
      currentGear:  o.gear     || 1,
      gearChanging: false,
      changeTimer:  0,
      clutchEngage: 1.0,
      engineRpm:    o.rpm      || 800,
      wheelOmega:   { FL:0, FR:0, RL:0, RR:0 },
      driveType:    o.driveType || 'RWD', // FWD, RWD, AWD
      centerDiffSplit: o.centerSplit || 0.4, // AWD front fraction
    };
  }

  // ── Gear selection logic ──────────────────────────────────
  function autoShiftLogic(state, gearSet, rpm, throttle) {
    const upshiftRpm   = 5500 + throttle * 500;
    const downshiftRpm = 2000 + throttle * 1000;
    if (state.gearChanging) return state.currentGear;
    const ratios = gearSet.ratios;
    if (!ratios) return state.currentGear;
    if (rpm > upshiftRpm && state.currentGear < ratios.length) {
      return state.currentGear + 1;
    }
    if (rpm < downshiftRpm && state.currentGear > 1) {
      return state.currentGear - 1;
    }
    return state.currentGear;
  }

  // ── Full powertrain step ──────────────────────────────────
  function stepPowertrain(state, gearSet, engineTorque, brakeInput, wheelSpeeds, dt) {
    if (state.gearChanging) {
      state.changeTimer += dt;
      const synchro = gearSet.synchroTime || 0.08;
      if (state.changeTimer >= synchro) {
        state.gearChanging = false;
        state.changeTimer  = 0;
        state.clutchEngage = 1.0;
      } else {
        state.clutchEngage = state.changeTimer / synchro;
      }
    }
    const ratios = gearSet.ratios;
    const gRatio = ratios ? (ratios[state.currentGear - 1] || 1) : 1;
    const fd     = gearSet.finalDrive || 3.55;
    const totalR = gRatio * fd;
    const avgWheelOmega = (wheelSpeeds.RL + wheelSpeeds.RR) / 2 || 0;
    const engineOmegaFromWheels = avgWheelOmega * totalR;
    // Blend engine speed toward wheel-driven speed
    state.engineRpm += (engineOmegaFromWheels * 60 / (2 * Math.PI) - state.engineRpm) * Math.min(1, dt * 5);
    state.engineRpm  = Math.max(700, state.engineRpm);

    const transmittedT = engineTorque * state.clutchEngage * totalR * 0.95;
    const driveFL = 0, driveFR = 0;
    let driveRL = 0, driveRR = 0;
    if (state.driveType === 'RWD' || state.driveType === 'AWD') {
      const rearT = state.driveType === 'AWD' ? transmittedT * (1 - state.centerDiffSplit) : transmittedT;
      const diff  = lsdDiff(rearT, wheelSpeeds.RL - wheelSpeeds.RR, 60, 0.35);
      driveRL = diff.left; driveRR = diff.right;
    }

    return {
      engineRpm:        state.engineRpm,
      gearRatio:        gRatio,
      totalRatio:       totalR,
      driveTorque:      { FL: driveFL, FR: driveFR, RL: driveRL, RR: driveRR },
      clutchEngagement: state.clutchEngage,
      gearChanging:     state.gearChanging,
    };
  }

  // ── AWD torque vectoring ──────────────────────────────────
  function awd4WheelTorque(totalTorque, frontFrac, slipRatios) {
    const frontT = totalTorque * frontFrac;
    const rearT  = totalTorque * (1 - frontFrac);
    const fDiff  = lsdDiff(frontT, slipRatios.FL - slipRatios.FR, 40, 0.30);
    const rDiff  = lsdDiff(rearT,  slipRatios.RL - slipRatios.RR, 50, 0.35);
    return { FL: fDiff.left, FR: fDiff.right, RL: rDiff.left, RR: rDiff.right };
  }

  // ── Drivetrain efficiency ─────────────────────────────────
  const DRIVETRAIN_EFFICIENCY = {
    manual_rwd:  0.95, manual_fwd:  0.94, manual_awd:  0.90,
    auto_rwd:    0.92, auto_fwd:    0.91, auto_awd:    0.87,
    dct_rwd:     0.96, dct_fwd:     0.95, dct_awd:     0.92,
    cvt_fwd:     0.88, cvt_awd:     0.84,
  };

  function drivetrainLoss(torque, type) {
    const eta = DRIVETRAIN_EFFICIENCY[type] || 0.92;
    return torque * (1 - eta);
  }

  return {
    TRANSMISSION_TYPE, GEAR_SETS, DIFF_TYPE, TORQUE_CONVERTER_CURVE,
    DRIVETRAIN_EFFICIENCY,
    openDiff, lsdDiff, torsenDiff, ediff,
    createClutch, clutchTransmittedTorque, torqueConverterOutput,
    createPowertrainState, autoShiftLogic, stepPowertrain,
    awd4WheelTorque, drivetrainLoss,
  };
})();


// ============================================================
// AERODYNAMICS_EXT — Extended aerodynamic simulation
// ============================================================
const AERODYNAMICS_EXT = (() => {
  'use strict';

  const AIR_DENSITY_SL  = 1.225; // kg/m³ sea level
  const GAS_CONSTANT    = 287;   // J/(kg·K)
  const GRAVITY         = 9.81;

  // ── Atmosphere model (ISA) ────────────────────────────────
  function airDensity(altitudeM, tempCelsius) {
    const T = (tempCelsius !== undefined ? tempCelsius + 273.15 : 288.15);
    const P = 101325 * Math.pow(1 - 0.0000225577 * altitudeM, 5.25588);
    return P / (GAS_CONSTANT * T);
  }

  // ── Drag model ────────────────────────────────────────────
  const VEHICLE_DRAG_PROFILES = {
    hatchback:   { Cd: 0.31, frontalArea: 2.15, liftFront: 0.10, liftRear: 0.05 },
    sedan:       { Cd: 0.27, frontalArea: 2.20, liftFront: 0.12, liftRear: 0.08 },
    suv:         { Cd: 0.38, frontalArea: 2.80, liftFront: 0.22, liftRear: 0.18 },
    sports:      { Cd: 0.29, frontalArea: 1.95, liftFront: -0.08, liftRear: -0.15 },
    race_open:   { Cd: 0.90, frontalArea: 1.50, liftFront: -1.20, liftRear: -2.50 },
    race_gt:     { Cd: 0.38, frontalArea: 2.00, liftFront: -0.80, liftRear: -1.80 },
    pickup:      { Cd: 0.41, frontalArea: 3.10, liftFront: 0.25, liftRear: 0.20 },
    van:         { Cd: 0.45, frontalArea: 3.80, liftFront: 0.30, liftRear: 0.25 },
    motorcycle:  { Cd: 0.55, frontalArea: 0.70, liftFront: 0.02, liftRear: -0.01 },
    buggy:       { Cd: 0.65, frontalArea: 1.80, liftFront: -0.10, liftRear: -0.05 },
    monster:     { Cd: 0.80, frontalArea: 5.00, liftFront: 0.40, liftRear: 0.35 },
    go_kart:     { Cd: 0.95, frontalArea: 1.00, liftFront: -0.05, liftRear: -0.10 },
  };

  function aeroDrag(speed, rho, profile) {
    const q = 0.5 * rho * speed * speed;
    return q * profile.Cd * profile.frontalArea;
  }

  function aeroLift(speed, rho, profile) {
    const q = 0.5 * rho * speed * speed;
    const A = profile.frontalArea * 1.3;
    return {
      front: q * profile.liftFront * A * 0.45,
      rear:  q * profile.liftRear  * A * 0.55,
    };
  }

  // ── Wing/spoiler model ────────────────────────────────────
  function wingForce(velocity, rho, chordLength, spanLength, angle, clSlope, cdMin) {
    const area = chordLength * spanLength;
    const CL   = clSlope * angle;
    const CD   = cdMin + CL * CL / (Math.PI * (spanLength / chordLength) * 0.85);
    const q    = 0.5 * rho * velocity * velocity;
    return { lift: -q * CL * area, drag: q * CD * area, CL, CD };
  }

  // ── Diffuser ground effect ────────────────────────────────
  function groundEffect(rideHeight, speed, rho, diffuserArea) {
    const h    = Math.max(0.02, rideHeight);
    const CL_ge = -1.8 / (h * h);  // simplified ground effect
    const CLmax = -3.5;
    const CL    = Math.max(CLmax, CL_ge * 0.05);
    return 0.5 * rho * speed * speed * CL * diffuserArea;
  }

  // ── Crosswind force ───────────────────────────────────────
  function crosswindForce(crosswindVelocity, vehicleLength, rho) {
    const Cy   = 0.45;
    const area = vehicleLength * 1.5;
    return 0.5 * rho * crosswindVelocity * crosswindVelocity * Cy * area;
  }

  // ── Yaw moment from crosswind ─────────────────────────────
  function crosswindYawMoment(crosswindForce, vehicleLength) {
    return crosswindForce * vehicleLength * 0.25;
  }

  // ── Cooling drag ──────────────────────────────────────────
  function coolingDragPenalty(speed, rho, coolingAirFlow, frontalArea) {
    const q   = 0.5 * rho * speed * speed;
    const dCd = 0.02 * coolingAirFlow;
    return q * dCd * frontalArea;
  }

  // ── Aerodynamic pitch moment ──────────────────────────────
  function aeroRollMoment(speed, rho, crosswindV, profile) {
    const q     = 0.5 * rho * (speed * speed + crosswindV * crosswindV);
    const Cmr   = 0.08;
    return q * Cmr * profile.frontalArea * 1.5;
  }

  // ── Speed-dependent downforce map ─────────────────────────
  const DOWNFORCE_MAP = {
    formula:  [[0,0],[50,800],[100,3200],[150,7200],[200,12800],[250,20000]],
    gt_car:   [[0,0],[50,200],[100, 800],[150,1800],[200, 3200],[250, 5000]],
    street:   [[0,0],[50, 20],[100,  80],[150, 180],[200,  320],[250,  500]],
  };

  function downforceAtSpeed(mapName, speedKmh) {
    const map = DOWNFORCE_MAP[mapName] || DOWNFORCE_MAP.street;
    for (let i = 1; i < map.length; i++) {
      if (speedKmh <= map[i][0]) {
        const t = (speedKmh - map[i-1][0]) / (map[i][0] - map[i-1][0]);
        return map[i-1][1] + t * (map[i][1] - map[i-1][1]);
      }
    }
    return map[map.length-1][1];
  }

  // ── Wake turbulence (following another vehicle) ───────────
  function wakeTurbulenceDrag(distanceBehind, leadVehicleDrag, ownDrag) {
    if (distanceBehind <= 0) return ownDrag;
    const slipstreamFactor = Math.exp(-distanceBehind / 12);
    return ownDrag * (1 - slipstreamFactor * 0.35);
  }

  // ── Reynolds number for vehicle ───────────────────────────
  function vehicleReynolds(speed, length, rho, mu) {
    const visc = mu || 1.81e-5;
    return rho * speed * length / visc;
  }

  // ── Aero balance (front/rear downforce split) ─────────────
  function aeroBalance(frontDownforce, rearDownforce) {
    const total = frontDownforce + rearDownforce;
    if (total === 0) return 0.5;
    return frontDownforce / total;
  }

  // ── Full aero step ────────────────────────────────────────
  function stepAerodynamics(vehicle, wind, altitude, dt) {
    const {speed=0, yawAngle=0, rideHeight=0.12, vehicleType='sedan'} = vehicle;
    const {speedX=0, speedY=0} = wind || {};
    const rho     = airDensity(altitude || 0, vehicle.ambientTemp);
    const profile = VEHICLE_DRAG_PROFILES[vehicleType] || VEHICLE_DRAG_PROFILES.sedan;
    const relSpeed = Math.sqrt((speed - speedX)**2 + speedY**2);

    const drag   = aeroDrag(relSpeed, rho, profile);
    const lift   = aeroLift(relSpeed, rho, profile);
    const ge     = groundEffect(rideHeight, speed, rho, 0.8);
    const cwF    = crosswindForce(speedY, 4.5, rho);
    const cwYaw  = crosswindYawMoment(cwF, 4.5);
    const wake   = wakeTurbulenceDrag(vehicle.distBehindLeader || 999, 0, drag);
    const balance = aeroBalance(lift.front + ge * 0.4, lift.rear + ge * 0.6);

    return {
      dragForce:        -drag,
      liftFront:        lift.front,
      liftRear:         lift.rear,
      groundEffect:     ge,
      crosswindForce:   cwF,
      crosswindYawMoment: cwYaw,
      effectiveDrag:    wake,
      aeroBalance:      balance,
      dynamicPressure:  0.5 * rho * relSpeed * relSpeed,
      airDensity:       rho,
    };
  }

  return {
    airDensity, VEHICLE_DRAG_PROFILES, DOWNFORCE_MAP,
    aeroDrag, aeroLift, wingForce, groundEffect,
    crosswindForce, crosswindYawMoment, coolingDragPenalty,
    aeroRollMoment, downforceAtSpeed, wakeTurbulenceDrag,
    vehicleReynolds, aeroBalance, stepAerodynamics,
    AIR_DENSITY_SL, GAS_CONSTANT,
  };
})();


// ============================================================
// TERRAIN_PHYSICS_EXT — Extended terrain interaction
// ============================================================
const TERRAIN_PHYSICS_EXT = (() => {
  'use strict';

  // ── Terrain type database ─────────────────────────────────
  const TERRAIN_TYPES = {
    tarmac_dry:   { mu: 0.90, rolling: 0.012, sinkage: 0.000, roughness: 0.5,  deform: false },
    tarmac_wet:   { mu: 0.55, rolling: 0.014, sinkage: 0.000, roughness: 0.6,  deform: false },
    tarmac_ice:   { mu: 0.08, rolling: 0.010, sinkage: 0.000, roughness: 0.1,  deform: false },
    gravel_dry:   { mu: 0.60, rolling: 0.025, sinkage: 0.010, roughness: 2.5,  deform: true  },
    gravel_wet:   { mu: 0.45, rolling: 0.030, sinkage: 0.015, roughness: 2.8,  deform: true  },
    dirt_dry:     { mu: 0.65, rolling: 0.022, sinkage: 0.008, roughness: 3.0,  deform: true  },
    dirt_wet:     { mu: 0.40, rolling: 0.035, sinkage: 0.030, roughness: 4.0,  deform: true  },
    mud_soft:     { mu: 0.30, rolling: 0.060, sinkage: 0.080, roughness: 5.0,  deform: true  },
    mud_deep:     { mu: 0.20, rolling: 0.120, sinkage: 0.200, roughness: 6.0,  deform: true  },
    sand_dry:     { mu: 0.45, rolling: 0.040, sinkage: 0.050, roughness: 3.5,  deform: true  },
    sand_wet:     { mu: 0.35, rolling: 0.055, sinkage: 0.070, roughness: 4.0,  deform: true  },
    snow_packed:  { mu: 0.30, rolling: 0.025, sinkage: 0.020, roughness: 1.5,  deform: true  },
    snow_deep:    { mu: 0.18, rolling: 0.080, sinkage: 0.150, roughness: 3.0,  deform: true  },
    ice_clear:    { mu: 0.05, rolling: 0.010, sinkage: 0.000, roughness: 0.2,  deform: false },
    ice_rough:    { mu: 0.12, rolling: 0.015, sinkage: 0.000, roughness: 1.0,  deform: false },
    grass_dry:    { mu: 0.58, rolling: 0.020, sinkage: 0.005, roughness: 2.0,  deform: true  },
    grass_wet:    { mu: 0.38, rolling: 0.030, sinkage: 0.015, roughness: 2.5,  deform: true  },
    rock_solid:   { mu: 0.75, rolling: 0.018, sinkage: 0.000, roughness: 8.0,  deform: false },
    rock_loose:   { mu: 0.55, rolling: 0.030, sinkage: 0.010, roughness: 9.0,  deform: true  },
    water_shallow:{ mu: 0.12, rolling: 0.005, sinkage: 0.000, roughness: 0.3,  deform: false },
    concrete:     { mu: 0.80, rolling: 0.013, sinkage: 0.000, roughness: 0.8,  deform: false },
    cobblestone:  { mu: 0.65, rolling: 0.020, sinkage: 0.000, roughness: 5.0,  deform: false },
    wood_plank:   { mu: 0.55, rolling: 0.016, sinkage: 0.000, roughness: 2.0,  deform: false },
  };

  // ── Terrain blending at transition zone ───────────────────
  function blendTerrain(typeA, typeB, alpha) {
    const tA = TERRAIN_TYPES[typeA] || TERRAIN_TYPES.tarmac_dry;
    const tB = TERRAIN_TYPES[typeB] || TERRAIN_TYPES.tarmac_dry;
    const t  = Math.max(0, Math.min(1, alpha));
    return {
      mu:        tA.mu        + t * (tB.mu        - tA.mu),
      rolling:   tA.rolling   + t * (tB.rolling   - tA.rolling),
      sinkage:   tA.sinkage   + t * (tB.sinkage   - tA.sinkage),
      roughness: tA.roughness + t * (tB.roughness - tA.roughness),
      deform:    t > 0.5 ? tB.deform : tA.deform,
    };
  }

  // ── Wheel sinkage model (Bekker soil model) ───────────────
  function bekkerSinkage(normalForce, tireWidth, tireLength, terrain) {
    const kc  = 1400, kPhi = 820000, n = 0.65; // soil parameters
    const A   = tireWidth * tireLength;
    const p   = normalForce / A;
    const b   = Math.min(tireWidth, tireLength);
    const z   = Math.pow(p / (kc/b + kPhi), 1/n);
    return Math.min(z, terrain.sinkage * 2);
  }

  // ── Thrust from wheel-soil interaction ───────────────────
  function soilThrust(drawbarPull, sinkage, terrain) {
    const Kx = 0.025; // soil shear deformation modulus
    const coh = 1500, phi = 0.35; // cohesion and friction angle
    const A = 0.05;
    const maxThrust = A * (coh + drawbarPull * Math.tan(phi));
    const j = 0.05; // wheel slip
    return maxThrust * (1 - Math.exp(-j / Kx));
  }

  // ── Terrain roughness excitation ──────────────────────────
  function roughnessExcitation(terrain, speed, wheelbase, rng) {
    const PSD_amplitude = terrain.roughness * 1e-5; // m²/(rad/m)
    const spatialFreq   = speed / wheelbase;
    const amplitude     = Math.sqrt(PSD_amplitude * spatialFreq);
    return amplitude * (rng() - 0.5) * 2;
  }

  // ── Terrain deformation (rut depth) ──────────────────────
  function terrainDeform(terrain, normalForce, numPasses) {
    if (!terrain.deform) return 0;
    const baseRut = bekkerSinkage(normalForce, 0.22, 0.15, terrain);
    return baseRut * Math.pow(numPasses, 0.6); // saturating accumulation
  }

  // ── Slope resistance ──────────────────────────────────────
  function slopeResistanceForce(mass, slopeAngleRad) {
    return mass * 9.81 * Math.sin(slopeAngleRad);
  }

  function maxClimbAngle(mu, rollingR) {
    return Math.atan(mu - rollingR);
  }

  // ── Rolling resistance ────────────────────────────────────
  function rollingResistanceForce(mass, terrain, speed) {
    const Cr = terrain.rolling * (1 + 0.000015 * speed * speed); // speed-dependent
    return mass * 9.81 * Cr;
  }

  // ── Terrain type from height map (simplified) ─────────────
  const HEIGHT_TO_TERRAIN = [
    { maxHeight: -0.5, type: 'water_shallow' },
    { maxHeight:  0.5, type: 'sand_wet'      },
    { maxHeight:  5.0, type: 'grass_dry'     },
    { maxHeight: 20.0, type: 'dirt_dry'      },
    { maxHeight: 40.0, type: 'rock_loose'    },
    { maxHeight: 100,  type: 'rock_solid'    },
  ];

  function terrainTypeFromHeight(height) {
    for (const entry of HEIGHT_TO_TERRAIN) {
      if (height <= entry.maxHeight) return entry.type;
    }
    return 'rock_solid';
  }

  // ── Surface wetness modifier ──────────────────────────────
  function wetnessMuModifier(wetnessLevel) {
    return 1 - wetnessLevel * 0.45;
  }

  function wetnessRollingModifier(wetnessLevel) {
    return 1 + wetnessLevel * 1.2;
  }

  // ── Wheel-terrain contact forces ──────────────────────────
  function wheelTerrainForce(wheel, terrain, wetnessLevel) {
    const t      = terrain;
    const wet    = wetnessLevel || 0;
    const mu     = t.mu * wetnessMuModifier(wet);
    const Cr     = t.rolling * wetnessRollingModifier(wet);
    const normalF= wheel.normalForce || 3000;
    const maxTrac = mu * normalF;
    const rolling = Cr * normalF;
    const sinkage = bekkerSinkage(normalF, wheel.width || 0.22, wheel.contactLength || 0.15, t);
    const excite  = roughnessExcitation(t, wheel.speed || 0, 0.315, Math.random);
    return { maxTraction: maxTrac, rollingForce: rolling, sinkage, roughnessExcitation: excite };
  }

  // ── Vehicle stability on slope ────────────────────────────
  function rolloverRisk(cgHeight, trackWidth, slopeAngle) {
    const staticRollAngle = Math.atan(trackWidth / (2 * cgHeight));
    const margin = staticRollAngle - Math.abs(slopeAngle);
    return { rollAngleLimit: staticRollAngle, margin, risk: margin < 0.15 };
  }

  return {
    TERRAIN_TYPES, HEIGHT_TO_TERRAIN,
    blendTerrain, bekkerSinkage, soilThrust, roughnessExcitation,
    terrainDeform, slopeResistanceForce, maxClimbAngle,
    rollingResistanceForce, terrainTypeFromHeight,
    wetnessMuModifier, wetnessRollingModifier,
    wheelTerrainForce, rolloverRisk,
  };
})();


// ============================================================
// COLLISION_RESPONSE_EXT — Extended collision response + damage
// ============================================================
const COLLISION_RESPONSE_EXT = (() => {
  'use strict';

  // ── Damage zones ──────────────────────────────────────────
  const DAMAGE_ZONES = {
    front_bumper:   { id: 0, maxHP: 100, area: 0.25, crushable: true,  critical: false },
    front_left:     { id: 1, maxHP:  80, area: 0.15, crushable: true,  critical: false },
    front_right:    { id: 2, maxHP:  80, area: 0.15, crushable: true,  critical: false },
    hood:           { id: 3, maxHP:  70, area: 0.35, crushable: true,  critical: false },
    roof:           { id: 4, maxHP: 120, area: 0.40, crushable: false, critical: true  },
    windshield:     { id: 5, maxHP:  40, area: 0.30, crushable: false, critical: true  },
    side_left:      { id: 6, maxHP:  90, area: 0.60, crushable: true,  critical: false },
    side_right:     { id: 7, maxHP:  90, area: 0.60, crushable: true,  critical: false },
    rear_bumper:    { id: 8, maxHP:  80, area: 0.22, crushable: true,  critical: false },
    rear_left:      { id: 9, maxHP:  70, area: 0.14, crushable: true,  critical: false },
    rear_right:     { id:10, maxHP:  70, area: 0.14, crushable: true,  critical: false },
    engine:         { id:11, maxHP: 200, area: 0.20, crushable: false, critical: true  },
    fuel_tank:      { id:12, maxHP: 150, area: 0.10, crushable: false, critical: true  },
    suspension_fl:  { id:13, maxHP:  60, area: 0.05, crushable: false, critical: true  },
    suspension_fr:  { id:14, maxHP:  60, area: 0.05, crushable: false, critical: true  },
    suspension_rl:  { id:15, maxHP:  60, area: 0.05, crushable: false, critical: true  },
    suspension_rr:  { id:16, maxHP:  60, area: 0.05, crushable: false, critical: true  },
    tire_fl:        { id:17, maxHP:  50, area: 0.04, crushable: false, critical: true  },
    tire_fr:        { id:18, maxHP:  50, area: 0.04, crushable: false, critical: true  },
    tire_rl:        { id:19, maxHP:  50, area: 0.04, crushable: false, critical: true  },
    tire_rr:        { id:20, maxHP:  50, area: 0.04, crushable: false, critical: true  },
  };

  // ── Damage state ──────────────────────────────────────────
  function createDamageState() {
    const state = {};
    for (const [name, zone] of Object.entries(DAMAGE_ZONES)) {
      state[name] = { hp: zone.maxHP, crushDepth: 0, visualDmg: 0, disabled: false };
    }
    return state;
  }

  // ── Collision energy calculation ──────────────────────────
  function collisionEnergy(massA, massB, relativeSpeed) {
    const reducedMass = (massA * massB) / (massA + massB || 1);
    return 0.5 * reducedMass * relativeSpeed * relativeSpeed;
  }

  // ── Damage application ────────────────────────────────────
  function applyCollisionDamage(damageState, energy, impactAngle, contactPoint) {
    const affectedZones = getAffectedZones(impactAngle, contactPoint);
    const totalArea = affectedZones.reduce((s, z) => s + (DAMAGE_ZONES[z] ? DAMAGE_ZONES[z].area : 0.1), 0);
    const events = [];

    for (const zoneName of affectedZones) {
      const zone   = DAMAGE_ZONES[zoneName];
      if (!zone) continue;
      const zState = damageState[zoneName];
      if (!zState || zState.disabled) continue;
      const fraction     = zone.area / (totalArea || 1);
      const energyInZone = energy * fraction;
      const damageHP     = energyInZone / 1000; // scale factor

      zState.hp   = Math.max(0, zState.hp - damageHP);
      if (zone.crushable) {
        zState.crushDepth += energyInZone / (zone.maxHP * 500);
        zState.crushDepth  = Math.min(0.3, zState.crushDepth);
      }
      zState.visualDmg = 1 - (zState.hp / zone.maxHP);
      if (zState.hp <= 0 && !zState.disabled) {
        zState.disabled = true;
        events.push({ zone: zoneName, critical: zone.critical, destroyed: true });
      }
    }

    return events;
  }

  function getAffectedZones(impactAngle, contactPoint) {
    // Simplified zone selection based on impact angle
    const a = ((impactAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (a < Math.PI * 0.25 || a > Math.PI * 1.75) {
      return ['front_bumper', 'front_left', 'front_right', 'hood', 'engine'];
    } else if (a < Math.PI * 0.75) {
      return ['side_right', 'suspension_fr', 'suspension_rr', 'tire_fr', 'tire_rr'];
    } else if (a < Math.PI * 1.25) {
      return ['rear_bumper', 'rear_left', 'rear_right', 'fuel_tank'];
    } else {
      return ['side_left', 'suspension_fl', 'suspension_rl', 'tire_fl', 'tire_rl'];
    }
  }

  // ── Structural integrity ──────────────────────────────────
  function structuralIntegrity(damageState) {
    let totalMax = 0, totalCurrent = 0, criticalFailures = 0;
    for (const [name, zone] of Object.entries(DAMAGE_ZONES)) {
      const zs = damageState[name];
      if (!zs) continue;
      totalMax     += zone.maxHP;
      totalCurrent += zs.hp;
      if (zone.critical && zs.disabled) criticalFailures++;
    }
    return {
      integrity:       totalCurrent / (totalMax || 1),
      criticalFailures,
      catastrophic:    criticalFailures >= 2,
      driveable:       !damageState.engine?.disabled && !damageState.suspension_fl?.disabled,
    };
  }

  // ── Deformation vector ────────────────────────────────────
  function deformationVector(damageState) {
    const v = { x: 0, y: 0 };
    const front = (damageState.front_bumper?.crushDepth || 0) + (damageState.hood?.crushDepth || 0);
    const rear  = (damageState.rear_bumper?.crushDepth  || 0);
    const left  = (damageState.side_left?.crushDepth    || 0);
    const right = (damageState.side_right?.crushDepth   || 0);
    v.x = right - left;
    v.y = front - rear;
    return v;
  }

  // ── Fire risk from fuel tank + heat ──────────────────────
  function fireRisk(damageState, engineTemp) {
    const fuelTankDmg = damageState.fuel_tank?.visualDmg || 0;
    const engineDmg   = damageState.engine?.visualDmg    || 0;
    const tempFactor  = Math.max(0, (engineTemp - 200) / 400);
    return fuelTankDmg * engineDmg * tempFactor;
  }

  // ── Wheel loss (tire detachment physics) ──────────────────
  function wheelLossEffect(damageState, cornerId) {
    const suspKey = 'suspension_' + cornerId;
    const tireKey = 'tire_' + cornerId;
    const suspGone = damageState[suspKey]?.disabled || false;
    const tireGone = damageState[tireKey]?.disabled || false;
    return {
      suspensionLost: suspGone,
      tireLost:       tireGone,
      frictionMultiplier: tireGone ? 0.05 : (suspGone ? 0.2 : 1.0),
      loadTransferLost: suspGone,
    };
  }

  // ── Impact spark / explosion data ─────────────────────────
  const IMPACT_EFFECTS = {
    metal_spark:    { threshold: 5000,   duration: 0.3,  intensity: 0.8 },
    glass_shatter:  { threshold: 2000,   duration: 0.1,  intensity: 1.0 },
    rubber_smoke:   { threshold: 3000,   duration: 1.5,  intensity: 0.5 },
    fluid_leak:     { threshold: 8000,   duration: 5.0,  intensity: 0.6 },
    fire_start:     { threshold: 20000,  duration: 10.0, intensity: 1.0 },
    explosion:      { threshold: 50000,  duration: 0.2,  intensity: 2.0 },
  };

  function getImpactEffects(energy, affectedZones, damageState) {
    const effects = [];
    for (const [effect, props] of Object.entries(IMPACT_EFFECTS)) {
      if (energy >= props.threshold) {
        effects.push({ type: effect, duration: props.duration, intensity: props.intensity * Math.min(2, energy / props.threshold) });
      }
    }
    return effects;
  }

  // ── Repair cost estimate ──────────────────────────────────
  const REPAIR_COSTS = {
    front_bumper: 800,  front_left: 1200, front_right: 1200,
    hood: 600,          roof: 2000,        windshield: 400,
    side_left: 900,     side_right: 900,   rear_bumper: 700,
    rear_left: 1100,    rear_right: 1100,  engine: 5000,
    fuel_tank: 600,     suspension_fl: 1500, suspension_fr: 1500,
    suspension_rl: 1200, suspension_rr: 1200,
    tire_fl: 150,        tire_fr: 150,     tire_rl: 150, tire_rr: 150,
  };

  function repairCostEstimate(damageState) {
    let total = 0;
    for (const [name, costs] of Object.entries(REPAIR_COSTS)) {
      const zs = damageState[name];
      if (!zs) continue;
      const dmgFrac = 1 - (zs.hp / (DAMAGE_ZONES[name]?.maxHP || 100));
      total += costs * dmgFrac;
    }
    return Math.round(total);
  }

  return {
    DAMAGE_ZONES, IMPACT_EFFECTS, REPAIR_COSTS,
    createDamageState, collisionEnergy, applyCollisionDamage,
    getAffectedZones, structuralIntegrity, deformationVector,
    fireRisk, wheelLossEffect, getImpactEffects, repairCostEstimate,
  };
})();


// ============================================================
// PHYSICS_INTERPOLATOR — State interpolation + replay system
// ============================================================
const PHYSICS_INTERPOLATOR = (() => {
  'use strict';

  const MAX_HISTORY = 256;

  // ── State snapshot ────────────────────────────────────────
  function captureSnapshot(entities, tick, timestamp) {
    return {
      tick,
      timestamp,
      states: entities.map(e => ({
        id:         e.id,
        px:         e.position.x,
        py:         e.position.y,
        angle:      e.angle,
        vx:         e.velocity.x,
        vy:         e.velocity.y,
        angVel:     e.angularVel,
        sleeping:   e.isSleeping,
      })),
    };
  }

  // ── Ring buffer for snapshots ─────────────────────────────
  function createHistoryBuffer() {
    return { buffer: new Array(MAX_HISTORY), head: 0, size: 0 };
  }

  function pushSnapshot(history, snapshot) {
    history.buffer[history.head] = snapshot;
    history.head = (history.head + 1) % MAX_HISTORY;
    if (history.size < MAX_HISTORY) history.size++;
  }

  function getSnapshotAt(history, targetTime) {
    let bestA = null, bestB = null;
    for (let i = 0; i < history.size; i++) {
      const idx = (history.head - 1 - i + MAX_HISTORY) % MAX_HISTORY;
      const s   = history.buffer[idx];
      if (!s) continue;
      if (s.timestamp <= targetTime) { bestA = s; break; }
      bestB = s;
    }
    return { before: bestA, after: bestB };
  }

  // ── Linear interpolation of state ────────────────────────
  function interpolateState(snapA, snapB, targetTime) {
    if (!snapA) return snapB ? snapB.states : [];
    if (!snapB) return snapA.states;
    const t = (targetTime - snapA.timestamp) / ((snapB.timestamp - snapA.timestamp) || 1);
    const alpha = Math.max(0, Math.min(1, t));
    const result = [];
    for (let i = 0; i < snapA.states.length; i++) {
      const a = snapA.states[i], b = snapB.states[i];
      if (!a || !b || a.id !== b.id) continue;
      result.push({
        id:    a.id,
        px:    a.px    + alpha * (b.px    - a.px),
        py:    a.py    + alpha * (b.py    - a.py),
        angle: lerpAngle(a.angle, b.angle, alpha),
        vx:    a.vx    + alpha * (b.vx    - a.vx),
        vy:    a.vy    + alpha * (b.vy    - a.vy),
        angVel:a.angVel+ alpha * (b.angVel- a.angVel),
      });
    }
    return result;
  }

  function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
    return a + diff * t;
  }

  // ── Hermite spline interpolation ──────────────────────────
  function hermiteInterp(p0, p1, v0, v1, t) {
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2*t3 - 3*t2 + 1;
    const h10 = t3 - 2*t2 + t;
    const h01 = -2*t3 + 3*t2;
    const h11 = t3 - t2;
    return h00*p0 + h10*v0 + h01*p1 + h11*v1;
  }

  function interpolateHermite(snapA, snapB, targetTime, dt) {
    if (!snapA || !snapB) return interpolateState(snapA, snapB, targetTime);
    const T = (targetTime - snapA.timestamp) / ((snapB.timestamp - snapA.timestamp) || 1);
    const alpha = Math.max(0, Math.min(1, T));
    return snapA.states.map((a, i) => {
      const b = snapB.states[i];
      if (!b || a.id !== b.id) return a;
      const span = snapB.timestamp - snapA.timestamp;
      return {
        id: a.id,
        px:    hermiteInterp(a.px, b.px, a.vx*span, b.vx*span, alpha),
        py:    hermiteInterp(a.py, b.py, a.vy*span, b.vy*span, alpha),
        angle: lerpAngle(a.angle, b.angle, alpha),
        vx: a.vx + alpha * (b.vx - a.vx),
        vy: a.vy + alpha * (b.vy - a.vy),
        angVel: a.angVel + alpha * (b.angVel - a.angVel),
      };
    });
  }

  // ── Rollback / rewind ─────────────────────────────────────
  function rewindToTick(history, targetTick) {
    for (let i = 0; i < history.size; i++) {
      const idx = (history.head - 1 - i + MAX_HISTORY) % MAX_HISTORY;
      const s   = history.buffer[idx];
      if (s && s.tick === targetTick) return s;
    }
    return null;
  }

  function applySnapshot(entities, snapshot) {
    if (!snapshot) return;
    for (const state of snapshot.states) {
      const e = entities.find(x => x.id === state.id);
      if (!e) continue;
      e.position.x = state.px;
      e.position.y = state.py;
      e.angle      = state.angle;
      e.velocity.x = state.vx;
      e.velocity.y = state.vy;
      e.angularVel = state.angVel;
      e.isSleeping = state.sleeping;
    }
  }

  // ── Replay system ─────────────────────────────────────────
  function createReplay(fps) {
    return {
      fps:       fps || 60,
      frames:    [],
      recording: false,
      playback:  false,
      currentFrame: 0,
    };
  }

  function replayRecord(replay, snapshot) {
    if (!replay.recording) return;
    replay.frames.push(snapshot);
    if (replay.frames.length > 3600) replay.frames.shift(); // max 60s at 60fps
  }

  function replayStart(replay) {
    replay.playback = true;
    replay.currentFrame = 0;
  }

  function replayStep(replay) {
    if (!replay.playback || replay.frames.length === 0) return null;
    const frame = replay.frames[replay.currentFrame];
    replay.currentFrame = (replay.currentFrame + 1) % replay.frames.length;
    return frame;
  }

  // ── Ghost car interpolation ───────────────────────────────
  function createGhostCar(replayData) {
    return {
      frames:   replayData,
      cursor:   0,
      looping:  true,
      position: {x:0, y:0},
      angle:    0,
      speed:    0,
    };
  }

  function stepGhostCar(ghost, dt, fps) {
    if (!ghost.frames || ghost.frames.length === 0) return;
    const frameRate = fps || 60;
    const floatIdx  = ghost.cursor;
    const idxA = Math.floor(floatIdx) % ghost.frames.length;
    const idxB = (idxA + 1) % ghost.frames.length;
    const t    = floatIdx - Math.floor(floatIdx);
    const a    = ghost.frames[idxA];
    const b    = ghost.frames[idxB];
    if (!a || !b) return;
    ghost.position.x = a.px + t * (b.px - a.px);
    ghost.position.y = a.py + t * (b.py - a.py);
    ghost.angle      = lerpAngle(a.angle, b.angle, t);
    ghost.speed      = Math.sqrt(a.vx*a.vx + a.vy*a.vy);
    ghost.cursor    += dt * frameRate;
    if (ghost.looping && ghost.cursor >= ghost.frames.length) {
      ghost.cursor = 0;
    }
  }

  // ── Delta compression for replay storage ─────────────────
  function deltaCompress(prevSnapshot, currSnapshot) {
    if (!prevSnapshot) return { full: true, data: currSnapshot };
    const deltas = [];
    for (let i = 0; i < currSnapshot.states.length; i++) {
      const a = prevSnapshot.states[i], b = currSnapshot.states[i];
      if (!a || !b) continue;
      const THRESHOLD = 1e-4;
      const d = {};
      if (Math.abs(b.px  - a.px)  > THRESHOLD) d.px  = b.px  - a.px;
      if (Math.abs(b.py  - a.py)  > THRESHOLD) d.py  = b.py  - a.py;
      if (Math.abs(b.angle - a.angle) > THRESHOLD) d.angle = b.angle - a.angle;
      if (Math.abs(b.vx  - a.vx)  > THRESHOLD) d.vx  = b.vx  - a.vx;
      if (Math.abs(b.vy  - a.vy)  > THRESHOLD) d.vy  = b.vy  - a.vy;
      if (Object.keys(d).length > 0) { d.id = b.id; deltas.push(d); }
    }
    return { full: false, tick: currSnapshot.tick, timestamp: currSnapshot.timestamp, deltas };
  }

  function deltaDecompress(prevSnapshot, delta) {
    if (delta.full) return delta.data;
    const states = prevSnapshot.states.map(s => ({ ...s }));
    for (const d of delta.deltas) {
      const s = states.find(x => x.id === d.id);
      if (!s) continue;
      if (d.px    !== undefined) s.px    += d.px;
      if (d.py    !== undefined) s.py    += d.py;
      if (d.angle !== undefined) s.angle += d.angle;
      if (d.vx    !== undefined) s.vx    += d.vx;
      if (d.vy    !== undefined) s.vy    += d.vy;
    }
    return { tick: delta.tick, timestamp: delta.timestamp, states };
  }

  return {
    MAX_HISTORY,
    captureSnapshot, createHistoryBuffer, pushSnapshot, getSnapshotAt,
    interpolateState, lerpAngle, hermiteInterp, interpolateHermite,
    rewindToTick, applySnapshot,
    createReplay, replayRecord, replayStart, replayStep,
    createGhostCar, stepGhostCar,
    deltaCompress, deltaDecompress,
  };
})();


// ============================================================
// NOISE_AND_VIBRATION — NVH simulation (noise, vibration, harshness)
// ============================================================
const NOISE_AND_VIBRATION = (() => {
  'use strict';

  // ── Engine vibration orders ───────────────────────────────
  const ENGINE_VIBRATION_ORDERS = {
    // Order: {relative_amplitude, phase_offset}
    I4: {
      0.5: { amp: 0.05, phase: 0 },
      1.0: { amp: 0.15, phase: 0.1 },
      2.0: { amp: 1.00, phase: 0 },   // Primary order for I4
      4.0: { amp: 0.35, phase: 0.05 },
      6.0: { amp: 0.12, phase: 0 },
    },
    I6: {
      0.5: { amp: 0.02, phase: 0 },
      1.0: { amp: 0.08, phase: 0 },
      3.0: { amp: 1.00, phase: 0 },
      6.0: { amp: 0.30, phase: 0 },
    },
    V6: {
      1.5: { amp: 0.40, phase: 0 },
      3.0: { amp: 1.00, phase: 0 },
      6.0: { amp: 0.25, phase: 0 },
    },
    V8: {
      2.0: { amp: 0.20, phase: 0 },
      4.0: { amp: 1.00, phase: 0 },
      8.0: { amp: 0.18, phase: 0 },
    },
    V10: {
      2.5: { amp: 0.15, phase: 0 },
      5.0: { amp: 1.00, phase: 0 },
      10:  { amp: 0.12, phase: 0 },
    },
    V12: {
      3.0: { amp: 0.10, phase: 0 },
      6.0: { amp: 1.00, phase: 0 },
      12:  { amp: 0.08, phase: 0 },
    },
  };

  // ── Vibration amplitude at given RPM ─────────────────────
  function engineVibrationAmplitude(rpm, engineType, baseAmplitude) {
    const orders = ENGINE_VIBRATION_ORDERS[engineType] || ENGINE_VIBRATION_ORDERS.I4;
    const freq   = rpm / 60;
    let total    = 0;
    for (const [order, props] of Object.entries(orders)) {
      const orderFreq = freq * parseFloat(order);
      total += baseAmplitude * props.amp;
    }
    return total;
  }

  // ── Transfer function (body/chassis) ─────────────────────
  const TRANSFER_FUNCTIONS = {
    sporty:   { resonances: [{f:8,q:3.5},{f:22,q:2.0},{f:45,q:1.5}], baseDamp: 0.08 },
    comfort:  { resonances: [{f:5,q:2.0},{f:14,q:1.5},{f:35,q:1.2}], baseDamp: 0.15 },
    race:     { resonances: [{f:15,q:5.0},{f:40,q:3.5},{f:80,q:2.5}], baseDamp: 0.05 },
    suv:      { resonances: [{f:6,q:2.5},{f:18,q:1.8},{f:40,q:1.3}], baseDamp: 0.12 },
  };

  function transferAmplitude(freq, profile) {
    const tf = TRANSFER_FUNCTIONS[profile] || TRANSFER_FUNCTIONS.comfort;
    let amp = 1.0;
    for (const res of tf.resonances) {
      const r     = freq / res.f;
      const denom = Math.sqrt((1 - r*r)**2 + (2*tf.baseDamp*r)**2);
      amp *= 1 / (denom || 1) * Math.min(res.q, 8);
    }
    return Math.min(amp, 20);
  }

  // ── Road noise model ──────────────────────────────────────
  function roadNoiseSPL(speed, roughness, tireType) {
    // Sound pressure level in dB(A)
    const baseRef = 60;
    const speedTerm   = 30 * Math.log10(Math.max(1, speed) / 50);
    const roughTerm   = 10 * Math.log10(Math.max(0.1, roughness));
    const tireFactor  = { quiet: -5, standard: 0, aggressive: 8, offroad: 15 };
    const tf = tireFactor[tireType] || 0;
    return baseRef + speedTerm + roughTerm + tf;
  }

  // ── Wind noise ────────────────────────────────────────────
  function windNoiseSPL(speed, Cd, sealQuality) {
    const ref    = 45;
    const vTerm  = 60 * Math.log10(Math.max(1, speed) / 100);
    const cdTerm = 20 * Math.log10(Cd / 0.30);
    const seal   = sealQuality || 1.0; // 1=good, 2=poor
    return ref + vTerm + cdTerm + 10 * Math.log10(seal);
  }

  // ── Engine noise ──────────────────────────────────────────
  function engineNoiseSPL(rpm, load, engineType) {
    const base   = 55;
    const rpmT   = 20 * Math.log10(Math.max(1000, rpm) / 3000);
    const loadT  = 10 * load;
    const typeAdj = { I4: 0, I6: -3, V6: -2, V8: -5, V12: -8, flat6: -4 };
    const adj = typeAdj[engineType] || 0;
    return base + rpmT + loadT + adj;
  }

  // ── Combined interior noise ───────────────────────────────
  function interiorNoiseSPL(road, wind, engine, insulation) {
    // Logarithmic addition of noise sources
    const ins = insulation || 0; // dB reduction
    const total = 10 * Math.log10(
      Math.pow(10, road   / 10) +
      Math.pow(10, wind   / 10) +
      Math.pow(10, engine / 10)
    );
    return total - ins;
  }

  // ── Structural resonance check ────────────────────────────
  const STRUCTURAL_RESONANCES = {
    steering_column: 18,  // Hz
    dashboard:       22,
    door_panel_f:    14,
    door_panel_r:    12,
    rear_shelf:      10,
    seat:             8,
    exhaust:         95,
    drive_shaft:     42,
    wheel_rim:       30,
    tire:            12,
  };

  function resonanceExcitation(rpm, engineType) {
    const orders = ENGINE_VIBRATION_ORDERS[engineType] || ENGINE_VIBRATION_ORDERS.I4;
    const freq   = rpm / 60;
    const excited = [];
    for (const [component, resFreq] of Object.entries(STRUCTURAL_RESONANCES)) {
      for (const order of Object.keys(orders)) {
        const excFreq = freq * parseFloat(order);
        if (Math.abs(excFreq - resFreq) < 2) {
          excited.push({ component, frequency: excFreq, order: parseFloat(order) });
        }
      }
    }
    return excited;
  }

  // ── Damping treatments ────────────────────────────────────
  const DAMPING_MATERIALS = {
    butyl_sheet:     { density: 2.0, lossFactor: 0.2,  effectiveness: 0.15 },
    constrained_ld:  { density: 4.5, lossFactor: 0.35, effectiveness: 0.25 },
    spray_deadener:  { density: 1.5, lossFactor: 0.18, effectiveness: 0.12 },
    foam_absorber:   { density: 0.5, lossFactor: 0.80, effectiveness: 0.35 },
    mass_loaded:     { density: 6.0, lossFactor: 0.25, effectiveness: 0.20 },
  };

  function dampingReduction(material, coverage, baseNoise) {
    const m   = DAMPING_MATERIALS[material] || DAMPING_MATERIALS.butyl_sheet;
    const eff = m.effectiveness * Math.sqrt(coverage);
    return baseNoise * (1 - eff);
  }

  // ── Vibration comfort rating ──────────────────────────────
  function vibrationComfortRating(rmsAcceleration) {
    // ISO 2631-1 comfort thresholds (m/s²)
    if (rmsAcceleration < 0.315) return { rating: 'not_uncomfortable', score: 5 };
    if (rmsAcceleration < 0.630) return { rating: 'a_little_uncomfortable', score: 4 };
    if (rmsAcceleration < 1.000) return { rating: 'fairly_uncomfortable', score: 3 };
    if (rmsAcceleration < 1.600) return { rating: 'uncomfortable', score: 2 };
    if (rmsAcceleration < 2.500) return { rating: 'very_uncomfortable', score: 1 };
    return { rating: 'extremely_uncomfortable', score: 0 };
  }

  // ── Frequency weighting (ISO 2631) ───────────────────────
  function iso2631Weighting(freq) {
    // Simplified Wk weighting for whole-body vibration (vertical, seated)
    if (freq < 0.5)  return 0.3;
    if (freq < 2.0)  return 1.0;  // peak sensitivity
    if (freq < 8.0)  return 1.0;
    if (freq < 80.0) return 8.0 / freq;
    return 0.1;
  }

  // ── Full NVH step ─────────────────────────────────────────
  function stepNVH(vehicle, terrain, dt) {
    const rpm    = vehicle.rpm    || 1000;
    const speed  = vehicle.speed  || 0;
    const load   = vehicle.throttle || 0;
    const rough  = terrain.roughness || 1;

    const roadSPL   = roadNoiseSPL(speed * 3.6, rough, vehicle.tireType || 'standard');
    const windSPL   = windNoiseSPL(speed * 3.6, vehicle.Cd || 0.32, 1.0);
    const engSPL    = engineNoiseSPL(rpm, load, vehicle.engineType || 'I4');
    const interior  = interiorNoiseSPL(roadSPL, windSPL, engSPL, vehicle.insulation || 15);
    const vibAmp    = engineVibrationAmplitude(rpm, vehicle.engineType || 'I4', 0.5e-3);
    const resonances= resonanceExcitation(rpm, vehicle.engineType || 'I4');
    const comfort   = vibrationComfortRating(vibAmp * 100);

    return {
      roadNoiseSPL:    roadSPL,
      windNoiseSPL:    windSPL,
      engineNoiseSPL:  engSPL,
      interiorNoiseSPL: interior,
      vibrationAmplitude: vibAmp,
      activeResonances:  resonances,
      comfortRating:   comfort,
    };
  }

  return {
    ENGINE_VIBRATION_ORDERS, TRANSFER_FUNCTIONS,
    STRUCTURAL_RESONANCES, DAMPING_MATERIALS,
    engineVibrationAmplitude, transferAmplitude,
    roadNoiseSPL, windNoiseSPL, engineNoiseSPL, interiorNoiseSPL,
    resonanceExcitation, dampingReduction,
    vibrationComfortRating, iso2631Weighting, stepNVH,
  };
})();


// ============================================================
// PHYSICS_PARTICLE_SIM — Physics-based particle emitters for effects
// ============================================================
const PHYSICS_PARTICLE_SIM = (() => {
  'use strict';

  const MAX_PARTICLES = 2048;

  // ── Particle pool ─────────────────────────────────────────
  function createParticlePool() {
    const pool = {
      px:       new Float32Array(MAX_PARTICLES),
      py:       new Float32Array(MAX_PARTICLES),
      vx:       new Float32Array(MAX_PARTICLES),
      vy:       new Float32Array(MAX_PARTICLES),
      life:     new Float32Array(MAX_PARTICLES),
      maxLife:  new Float32Array(MAX_PARTICLES),
      mass:     new Float32Array(MAX_PARTICLES),
      radius:   new Float32Array(MAX_PARTICLES),
      typeId:   new Uint8Array(MAX_PARTICLES),
      active:   new Uint8Array(MAX_PARTICLES),
      count:    0,
    };
    return pool;
  }

  // ── Particle types ────────────────────────────────────────
  const PARTICLE_TYPE = {
    DUST:    0, SPARK:   1, SMOKE:   2, WATER:   3,
    MUD:     4, GRAVEL:  5, SNOW:    6, FIRE:    7,
    EXHAUST: 8, OIL:     9, DEBRIS: 10, TIRE:   11,
  };

  // ── Emitter configs ───────────────────────────────────────
  const EMITTER_CONFIGS = {
    tire_smoke: {
      rate: 15, typeId: PARTICLE_TYPE.SMOKE,
      velRange: {minX:-0.5,maxX:0.5,minY:0.2,maxY:1.5},
      lifeRange: {min:0.8, max:1.8},
      massRange: {min:0.001,max:0.005},
      radiusRange:{min:0.05,max:0.15},
      gravity: 0.5, drag: 2.0,
    },
    exhaust: {
      rate: 20, typeId: PARTICLE_TYPE.EXHAUST,
      velRange:{minX:-0.2,maxX:0.2,minY:-2.0,maxY:-1.0},
      lifeRange:{min:0.5,max:1.2},
      massRange:{min:0.0001,max:0.0005},
      radiusRange:{min:0.03,max:0.08},
      gravity: -0.3, drag: 1.5,
    },
    water_spray: {
      rate: 30, typeId: PARTICLE_TYPE.WATER,
      velRange:{minX:-2.0,maxX:2.0,minY:1.0,maxY:4.0},
      lifeRange:{min:0.4,max:1.0},
      massRange:{min:0.002,max:0.01},
      radiusRange:{min:0.02,max:0.06},
      gravity: 9.81, drag: 0.5,
    },
    mud_spray: {
      rate: 12, typeId: PARTICLE_TYPE.MUD,
      velRange:{minX:-1.5,maxX:1.5,minY:0.5,maxY:3.0},
      lifeRange:{min:1.0,max:2.5},
      massRange:{min:0.005,max:0.02},
      radiusRange:{min:0.03,max:0.10},
      gravity: 9.81, drag: 1.0,
    },
    spark: {
      rate: 40, typeId: PARTICLE_TYPE.SPARK,
      velRange:{minX:-3.0,maxX:3.0,minY:0.5,maxY:4.0},
      lifeRange:{min:0.1,max:0.4},
      massRange:{min:0.0001,max:0.001},
      radiusRange:{min:0.005,max:0.015},
      gravity: 9.81, drag: 0.2,
    },
    dust: {
      rate: 8, typeId: PARTICLE_TYPE.DUST,
      velRange:{minX:-1.0,maxX:1.0,minY:0.1,maxY:0.8},
      lifeRange:{min:1.5,max:3.5},
      massRange:{min:0.0001,max:0.001},
      radiusRange:{min:0.05,max:0.20},
      gravity: 0.1, drag: 3.0,
    },
    snow_spray: {
      rate: 20, typeId: PARTICLE_TYPE.SNOW,
      velRange:{minX:-1.0,maxX:1.0,minY:0.5,maxY:2.0},
      lifeRange:{min:0.8,max:2.0},
      massRange:{min:0.0005,max:0.002},
      radiusRange:{min:0.02,max:0.08},
      gravity: 2.0, drag: 2.5,
    },
    gravel: {
      rate: 5, typeId: PARTICLE_TYPE.GRAVEL,
      velRange:{minX:-2.5,maxX:2.5,minY:1.0,maxY:5.0},
      lifeRange:{min:0.5,max:1.5},
      massRange:{min:0.01,max:0.05},
      radiusRange:{min:0.01,max:0.04},
      gravity: 9.81, drag: 0.3,
    },
  };

  // ── Emit particles ────────────────────────────────────────
  function emit(pool, config, emitX, emitY, rate, rng, dt) {
    const numToEmit = Math.floor(rate * dt + rng());
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < numToEmit; i++) {
      if (pool.active[i]) continue;
      const c = config;
      pool.px[i]      = emitX + (rng() - 0.5) * 0.2;
      pool.py[i]      = emitY + (rng() - 0.5) * 0.2;
      pool.vx[i]      = c.velRange.minX + rng() * (c.velRange.maxX - c.velRange.minX);
      pool.vy[i]      = c.velRange.minY + rng() * (c.velRange.maxY - c.velRange.minY);
      pool.maxLife[i] = c.lifeRange.min + rng() * (c.lifeRange.max - c.lifeRange.min);
      pool.life[i]    = pool.maxLife[i];
      pool.mass[i]    = c.massRange.min + rng() * (c.massRange.max - c.massRange.min);
      pool.radius[i]  = c.radiusRange.min + rng() * (c.radiusRange.max - c.radiusRange.min);
      pool.typeId[i]  = c.typeId;
      pool.active[i]  = 1;
      pool.count++;
      spawned++;
    }
    return spawned;
  }

  // ── Step all particles ────────────────────────────────────
  function stepParticles(pool, wind, dt) {
    const wx = (wind && wind.x) || 0, wy = (wind && wind.y) || 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!pool.active[i]) continue;
      pool.life[i] -= dt;
      if (pool.life[i] <= 0) { pool.active[i] = 0; pool.count--; continue; }
      const config = getConfigForType(pool.typeId[i]);
      const invMass = 1 / (pool.mass[i] || 0.001);
      const drag    = config ? config.drag : 1.0;
      const grav    = config ? config.gravity : 9.81;
      // Forces: gravity + drag + wind
      const ax = (-drag * (pool.vx[i] - wx)) * invMass * pool.mass[i];
      const ay = grav + (-drag * (pool.vy[i] - wy)) * invMass * pool.mass[i];
      pool.vx[i] += ax * dt;
      pool.vy[i] += ay * dt;
      pool.px[i] += pool.vx[i] * dt;
      pool.py[i] += pool.vy[i] * dt;
    }
  }

  function getConfigForType(typeId) {
    for (const [name, cfg] of Object.entries(EMITTER_CONFIGS)) {
      if (cfg.typeId === typeId) return cfg;
    }
    return null;
  }

  // ── Ground bounce for heavy particles ────────────────────
  function groundBounce(pool, groundY, restitution) {
    const e = restitution || 0.3;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!pool.active[i]) continue;
      if (pool.py[i] < groundY && pool.vy[i] < 0) {
        pool.py[i] = groundY;
        pool.vy[i] = -pool.vy[i] * e;
        pool.vx[i] *= 0.7;
        if (Math.abs(pool.vy[i]) < 0.1) { pool.vy[i] = 0; pool.vx[i] *= 0.5; }
      }
    }
  }

  // ── Collect render data ───────────────────────────────────
  function collectRenderData(pool) {
    const out = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (!pool.active[i]) continue;
      out.push({
        x:       pool.px[i],
        y:       pool.py[i],
        radius:  pool.radius[i],
        alpha:   pool.life[i] / pool.maxLife[i],
        typeId:  pool.typeId[i],
      });
    }
    return out;
  }

  // ── Named emitter helpers ─────────────────────────────────
  function emitTireSmoke(pool, wx, wy, slipRatio, rng, dt) {
    if (Math.abs(slipRatio) < 0.1) return;
    const rate = EMITTER_CONFIGS.tire_smoke.rate * Math.abs(slipRatio) * 3;
    return emit(pool, EMITTER_CONFIGS.tire_smoke, wx, wy, rate, rng, dt);
  }

  function emitExhaust(pool, wx, wy, rpm, load, rng, dt) {
    const rate = EMITTER_CONFIGS.exhaust.rate * (load + 0.2);
    return emit(pool, EMITTER_CONFIGS.exhaust, wx, wy, rate, rng, dt);
  }

  function emitWaterSplash(pool, wx, wy, impactSpeed, rng, dt) {
    if (impactSpeed < 1.0) return;
    const rate = EMITTER_CONFIGS.water_spray.rate * impactSpeed;
    return emit(pool, EMITTER_CONFIGS.water_spray, wx, wy, rate, rng, dt);
  }

  function emitMudSpray(pool, wx, wy, speed, rng, dt) {
    const rate = EMITTER_CONFIGS.mud_spray.rate * speed / 10;
    return emit(pool, EMITTER_CONFIGS.mud_spray, wx, wy, rate, rng, dt);
  }

  function emitSparks(pool, wx, wy, energy, rng, dt) {
    if (energy < 500) return;
    const rate = EMITTER_CONFIGS.spark.rate * Math.min(energy / 5000, 5);
    return emit(pool, EMITTER_CONFIGS.spark, wx, wy, rate, rng, dt);
  }

  return {
    MAX_PARTICLES, PARTICLE_TYPE, EMITTER_CONFIGS,
    createParticlePool, emit, stepParticles, groundBounce, collectRenderData,
    emitTireSmoke, emitExhaust, emitWaterSplash, emitMudSpray, emitSparks,
  };
})();


// ============================================================
// VEHICLE_SENSORS — Virtual sensor suite for physics feedback
// ============================================================
const VEHICLE_SENSORS = (() => {
  'use strict';

  // ── Sensor noise models ───────────────────────────────────
  function gaussianNoise(value, stdDev, rng) {
    // Box-Muller transform
    const u1 = rng(), u2 = rng();
    const z  = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
    return value + z * stdDev;
  }

  // ── IMU (Inertial Measurement Unit) ──────────────────────
  const IMU_CONFIG = {
    accelNoise:     0.002, // m/s²
    gyroNoise:      0.001, // rad/s
    biasDrift:      1e-5,
    sampleRate:     200,   // Hz
    range_accel:    16,    // g
    range_gyro:     2000,  // deg/s
  };

  function createIMU(config) {
    const c = config || IMU_CONFIG;
    return {
      ...c,
      accelBias: { x: 0, y: 0, z: 0 },
      gyroBias:  { x: 0, y: 0, z: 0 },
      prevAccel: { x: 0, y: 0, z: 0 },
      prevGyro:  { x: 0, y: 0, z: 0 },
    };
  }

  function readIMU(imu, trueAccel, trueAngVel, rng, dt) {
    // Update bias drift
    imu.accelBias.x += (rng() - 0.5) * imu.biasDrift * dt;
    imu.accelBias.y += (rng() - 0.5) * imu.biasDrift * dt;
    imu.gyroBias.x  += (rng() - 0.5) * imu.biasDrift * dt;

    const ax = gaussianNoise(trueAccel.x + imu.accelBias.x, imu.accelNoise, rng);
    const ay = gaussianNoise(trueAccel.y + imu.accelBias.y, imu.accelNoise, rng);
    const gz = gaussianNoise(trueAngVel  + imu.gyroBias.x,  imu.gyroNoise,  rng);

    // Clamp to range
    const gMax = imu.range_accel * 9.81;
    return {
      accelX: Math.max(-gMax, Math.min(gMax, ax)),
      accelY: Math.max(-gMax, Math.min(gMax, ay)),
      gyroZ:  Math.max(-imu.range_gyro * Math.PI/180, Math.min(imu.range_gyro * Math.PI/180, gz)),
    };
  }

  // ── GPS model ─────────────────────────────────────────────
  const GPS_CONFIG = {
    positionNoise:  0.5,   // m CEP
    velocityNoise:  0.05,  // m/s
    updateRate:     10,    // Hz
    hdop:           1.2,
  };

  function createGPS(config) {
    return { ...(config || GPS_CONFIG), timer: 0, lastRead: { x: 0, y: 0, vx: 0, vy: 0 } };
  }

  function readGPS(gps, truePos, trueVel, rng, dt) {
    gps.timer += dt;
    if (gps.timer < 1 / gps.updateRate) return gps.lastRead;
    gps.timer = 0;
    const dilution = gps.hdop || 1;
    gps.lastRead = {
      x:  gaussianNoise(truePos.x, gps.positionNoise * dilution, rng),
      y:  gaussianNoise(truePos.y, gps.positionNoise * dilution, rng),
      vx: gaussianNoise(trueVel.x, gps.velocityNoise, rng),
      vy: gaussianNoise(trueVel.y, gps.velocityNoise, rng),
      valid: true,
      hdop: gps.hdop,
    };
    return gps.lastRead;
  }

  // ── Wheel speed sensors ───────────────────────────────────
  function createWheelSpeedSensor(pulsesPerRev) {
    return { ppr: pulsesPerRev || 48, accumPulses: 0, lastOmega: 0 };
  }

  function readWheelSpeed(sensor, trueOmega, rng, dt) {
    const noise   = gaussianNoise(trueOmega, 0.1, rng);
    const omega   = Math.max(0, noise);
    sensor.lastOmega = omega;
    return { omega, rpm: omega * 60 / (2 * Math.PI) };
  }

  // ── Steering angle sensor ─────────────────────────────────
  function readSteeringAngle(trueSteering, rng) {
    return gaussianNoise(trueSteering, 0.002, rng); // 0.1° std dev
  }

  // ── Brake pressure sensor ─────────────────────────────────
  function readBrakePressure(truePressure, rng) {
    return Math.max(0, gaussianNoise(truePressure, 500, rng)); // Pa noise
  }

  // ── Suspension travel sensors ─────────────────────────────
  function readSuspensionTravel(trueTravel, rng) {
    return gaussianNoise(trueTravel, 0.001, rng); // 1mm noise
  }

  // ── Lateral acceleration sensor ───────────────────────────
  function readLateralAccel(trueAy, rng) {
    return gaussianNoise(trueAy, 0.05, rng);
  }

  // ── Yaw rate sensor (gyroscope) ───────────────────────────
  function readYawRate(trueYawRate, rng) {
    return gaussianNoise(trueYawRate, 0.005, rng);
  }

  // ── Engine knock sensor ───────────────────────────────────
  function knockSensorModel(compressionRatio, octaneRating, rpm, load) {
    const knockProne = compressionRatio > 10 && octaneRating < 95;
    const probability = knockProne
      ? Math.max(0, (rpm - 2000) / 4000 * load * (compressionRatio - 9) / 3)
      : 0;
    return { knocking: probability > 0.5, severity: probability };
  }

  // ── Lambda/O2 sensor ─────────────────────────────────────
  function readO2Sensor(lambda, rng, catalystWarmup) {
    if (!catalystWarmup) return { reading: 0, valid: false };
    // Narrow-band: outputs ~0.1V lean, ~0.9V rich
    const v = lambda >= 1 ? 0.1 + rng() * 0.05 : 0.9 - rng() * 0.05;
    return { reading: v, lambda: v < 0.5 ? 'rich' : 'lean', valid: true };
  }

  // ── Temperature sensors ───────────────────────────────────
  function readTemperatureSensor(trueTemp, noise, rng) {
    return gaussianNoise(trueTemp, noise || 1.0, rng);
  }

  // ── Radar/ultrasonic proximity ────────────────────────────
  function createProximitySensor(maxRange, angleSpread) {
    return { maxRange: maxRange || 5.0, angleSpread: angleSpread || 0.3, resolution: 0.05 };
  }

  function readProximitySensor(sensor, trueDistance, rng) {
    if (trueDistance > sensor.maxRange) return { detected: false, distance: null };
    const noise = gaussianNoise(trueDistance, sensor.resolution, rng);
    return { detected: true, distance: Math.max(0, noise) };
  }

  // ── Tire pressure sensors (TPMS) ─────────────────────────
  function readTPMS(truePressure, rng) {
    return {
      pressure: gaussianNoise(truePressure, 2000, rng), // Pa
      temperature: gaussianNoise(35, 1, rng),
      warning: truePressure < 190000, // < 27.5 psi
    };
  }

  // ── Fuel level sensor ─────────────────────────────────────
  function readFuelLevel(trueFraction, rng) {
    const noisy = Math.max(0, Math.min(1, gaussianNoise(trueFraction, 0.01, rng)));
    return { fraction: noisy, liters: noisy * 50, warning: noisy < 0.1 };
  }

  // ── Comprehensive sensor suite read ──────────────────────
  function readAllSensors(sensors, trueState, rng, dt) {
    const imu  = readIMU(sensors.imu,  trueState.accel, trueState.angVel, rng, dt);
    const gps  = readGPS(sensors.gps,  trueState.pos,   trueState.vel,    rng, dt);
    return {
      imu,
      gps,
      wheelSpeeds: {
        FL: readWheelSpeed(sensors.wsFL, trueState.omegaFL || 0, rng, dt),
        FR: readWheelSpeed(sensors.wsFR, trueState.omegaFR || 0, rng, dt),
        RL: readWheelSpeed(sensors.wsRL, trueState.omegaRL || 0, rng, dt),
        RR: readWheelSpeed(sensors.wsRR, trueState.omegaRR || 0, rng, dt),
      },
      steeringAngle: readSteeringAngle(trueState.steer || 0, rng),
      brakePressure: {
        FL: readBrakePressure(trueState.brakeFL || 0, rng),
        FR: readBrakePressure(trueState.brakeFR || 0, rng),
        RL: readBrakePressure(trueState.brakeRL || 0, rng),
        RR: readBrakePressure(trueState.brakeRR || 0, rng),
      },
      yawRate:       readYawRate(trueState.yawRate || 0, rng),
      lateralAccel:  readLateralAccel(trueState.ay || 0, rng),
      engineTemp:    readTemperatureSensor(trueState.engineTemp || 90, 1, rng),
      oilPressure:   readTemperatureSensor(trueState.oilPressure || 350000, 5000, rng),
      fuelLevel:     readFuelLevel(trueState.fuelFraction || 0.5, rng),
      tpms: {
        FL: readTPMS(trueState.tirePressFL || 220000, rng),
        FR: readTPMS(trueState.tirePressFR || 220000, rng),
        RL: readTPMS(trueState.tirePressRL || 220000, rng),
        RR: readTPMS(trueState.tirePressRR || 220000, rng),
      },
      knock: knockSensorModel(trueState.cr || 10, trueState.octane || 95,
                              trueState.rpm || 3000, trueState.throttle || 0),
      o2:    readO2Sensor(trueState.lambda || 1.0, rng, trueState.catalystWarm !== false),
    };
  }

  return {
    IMU_CONFIG, GPS_CONFIG,
    gaussianNoise,
    createIMU, readIMU, createGPS, readGPS,
    createWheelSpeedSensor, readWheelSpeed,
    readSteeringAngle, readBrakePressure, readSuspensionTravel,
    readLateralAccel, readYawRate, knockSensorModel, readO2Sensor,
    readTemperatureSensor, createProximitySensor, readProximitySensor,
    readTPMS, readFuelLevel, readAllSensors,
  };
})();


// ============================================================
// PHYSICS_MATH_UTILS — Extended math library for physics
// ============================================================
const PHYSICS_MATH_UTILS = (() => {
  'use strict';

  // ── Constants ─────────────────────────────────────────────
  const PI   = Math.PI;
  const TAU  = 2 * PI;
  const DEG  = PI / 180;
  const RAD  = 180 / PI;
  const SQRT2= Math.SQRT2;
  const SQRT3= Math.sqrt(3);
  const PHI  = (1 + Math.sqrt(5)) / 2; // golden ratio
  const EPS  = 1e-9;

  // ── Scalar utils ──────────────────────────────────────────
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t)    { return a + t * (b - a); }
  function smoothstep(lo, hi, x) { const t = clamp((x-lo)/(hi-lo||EPS),0,1); return t*t*(3-2*t); }
  function smootherstep(lo, hi, x) { const t = clamp((x-lo)/(hi-lo||EPS),0,1); return t*t*t*(t*(t*6-15)+10); }
  function sign(x)          { return x > 0 ? 1 : x < 0 ? -1 : 0; }
  function fract(x)         { return x - Math.floor(x); }
  function mod(x, y)        { return ((x % y) + y) % y; }
  function saturate(x)      { return clamp(x, 0, 1); }
  function sqr(x)           { return x * x; }
  function cube(x)          { return x * x * x; }
  function remap(v, lo1, hi1, lo2, hi2) { return lo2 + (v - lo1) / ((hi1-lo1)||EPS) * (hi2-lo2); }

  // ── Angle utilities ───────────────────────────────────────
  function wrapAngle(a)       { return mod(a + PI, TAU) - PI; }
  function angleDiff(a, b)    { return wrapAngle(b - a); }
  function lerpAngle(a, b, t) { return a + wrapAngle(b - a) * t; }
  function deg2rad(d)         { return d * DEG; }
  function rad2deg(r)         { return r * RAD; }

  // ── 2D vector ─────────────────────────────────────────────
  const V = {
    create: (x,y) => ({x:x||0, y:y||0}),
    zero:   () => ({x:0,y:0}),
    add:    (a,b) => ({x:a.x+b.x, y:a.y+b.y}),
    sub:    (a,b) => ({x:a.x-b.x, y:a.y-b.y}),
    mul:    (a,b) => ({x:a.x*b.x, y:a.y*b.y}),
    scale:  (a,s) => ({x:a.x*s,   y:a.y*s}),
    dot:    (a,b) => a.x*b.x + a.y*b.y,
    cross:  (a,b) => a.x*b.y - a.y*b.x,
    len:    (a)   => Math.sqrt(a.x*a.x + a.y*a.y),
    len2:   (a)   => a.x*a.x + a.y*a.y,
    norm:   (a)   => { const l=Math.sqrt(a.x*a.x+a.y*a.y)||EPS; return {x:a.x/l,y:a.y/l}; },
    perp:   (a)   => ({x:-a.y, y:a.x}),
    neg:    (a)   => ({x:-a.x, y:-a.y}),
    rot:    (a,t) => { const c=Math.cos(t),s=Math.sin(t); return {x:a.x*c-a.y*s, y:a.x*s+a.y*c}; },
    lerp:   (a,b,t) => ({x:a.x+t*(b.x-a.x), y:a.y+t*(b.y-a.y)}),
    clamp:  (a,lo,hi) => ({x:clamp(a.x,lo.x,hi.x), y:clamp(a.y,lo.y,hi.y)}),
    angle:  (a)   => Math.atan2(a.y, a.x),
    fromAngle: (t,l) => ({x:Math.cos(t)*(l||1), y:Math.sin(t)*(l||1)}),
    dist:   (a,b) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2),
    dist2:  (a,b) => (a.x-b.x)**2+(a.y-b.y)**2,
    reflect:(v,n) => { const d=2*V.dot(v,n); return {x:v.x-d*n.x, y:v.y-d*n.y}; },
    project:(a,b) => { const d=V.dot(a,b)/V.len2(b)||0; return V.scale(b,d); },
    reject: (a,b) => V.sub(a, V.project(a,b)),
    max:    (a,b) => ({x:Math.max(a.x,b.x), y:Math.max(a.y,b.y)}),
    min:    (a,b) => ({x:Math.min(a.x,b.x), y:Math.min(a.y,b.y)}),
    abs:    (a)   => ({x:Math.abs(a.x), y:Math.abs(a.y)}),
    eq:     (a,b) => Math.abs(a.x-b.x)<EPS && Math.abs(a.y-b.y)<EPS,
  };

  // ── 3D vector ─────────────────────────────────────────────
  const V3 = {
    create: (x,y,z) => ({x:x||0,y:y||0,z:z||0}),
    add:  (a,b) => ({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}),
    sub:  (a,b) => ({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),
    scale:(a,s) => ({x:a.x*s,y:a.y*s,z:a.z*s}),
    dot:  (a,b) => a.x*b.x+a.y*b.y+a.z*b.z,
    cross:(a,b) => ({x:a.y*b.z-a.z*b.y, y:a.z*b.x-a.x*b.z, z:a.x*b.y-a.y*b.x}),
    len:  (a)   => Math.sqrt(a.x*a.x+a.y*a.y+a.z*a.z),
    norm: (a)   => { const l=Math.sqrt(a.x*a.x+a.y*a.y+a.z*a.z)||EPS; return {x:a.x/l,y:a.y/l,z:a.z/l}; },
    neg:  (a)   => ({x:-a.x,y:-a.y,z:-a.z}),
    lerp: (a,b,t) => ({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y),z:a.z+t*(b.z-a.z)}),
    dist: (a,b) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2),
    reflect:(v,n) => { const d=2*V3.dot(v,n); return V3.sub(v,V3.scale(n,d)); },
  };

  // ── 2x2 matrix ────────────────────────────────────────────
  const M2 = {
    create: (a,b,c,d) => [a,b,c,d],
    identity: () => [1,0,0,1],
    mul:  (A,B) => [A[0]*B[0]+A[1]*B[2], A[0]*B[1]+A[1]*B[3], A[2]*B[0]+A[3]*B[2], A[2]*B[1]+A[3]*B[3]],
    mulV: (A,v) => ({x:A[0]*v.x+A[1]*v.y, y:A[2]*v.x+A[3]*v.y}),
    det:  (A)   => A[0]*A[3]-A[1]*A[2],
    inv:  (A)   => { const d=M2.det(A)||EPS; return [A[3]/d,-A[1]/d,-A[2]/d,A[0]/d]; },
    rot:  (t)   => { const c=Math.cos(t),s=Math.sin(t); return [c,-s,s,c]; },
    scale:(sx,sy)=> [sx,0,0,sy],
    transpose:(A)=> [A[0],A[2],A[1],A[3]],
  };

  // ── 3x3 matrix ────────────────────────────────────────────
  const M3 = {
    identity:() => [1,0,0, 0,1,0, 0,0,1],
    mulV: (A,v) => ({
      x: A[0]*v.x+A[1]*v.y+A[2]*(v.z||0),
      y: A[3]*v.x+A[4]*v.y+A[5]*(v.z||0),
      z: A[6]*v.x+A[7]*v.y+A[8]*(v.z||0),
    }),
    det: (A) => A[0]*(A[4]*A[8]-A[5]*A[7])-A[1]*(A[3]*A[8]-A[5]*A[6])+A[2]*(A[3]*A[7]-A[4]*A[6]),
    transpose:(A) => [A[0],A[3],A[6], A[1],A[4],A[7], A[2],A[5],A[8]],
  };

  // ── Numerical integration ─────────────────────────────────
  function eulerStep(state, deriv, dt) {
    const d = deriv(state);
    return { x: state.x + d.x * dt, y: state.y + d.y * dt };
  }

  function rk4Step(state, deriv, dt) {
    const k1 = deriv(state);
    const k2 = deriv({ x: state.x + k1.x*dt/2, y: state.y + k1.y*dt/2 });
    const k3 = deriv({ x: state.x + k2.x*dt/2, y: state.y + k2.y*dt/2 });
    const k4 = deriv({ x: state.x + k3.x*dt,   y: state.y + k3.y*dt });
    return {
      x: state.x + dt*(k1.x + 2*k2.x + 2*k3.x + k4.x)/6,
      y: state.y + dt*(k1.y + 2*k2.y + 2*k3.y + k4.y)/6,
    };
  }

  // ── Filters ───────────────────────────────────────────────
  function createLowPass(cutoffHz) { return { alpha: 0, cutoffHz, prev: 0 }; }
  function lpFilter(f, value, dt) {
    const rc = 1 / (2 * PI * f.cutoffHz);
    f.alpha  = dt / (rc + dt);
    f.prev  += f.alpha * (value - f.prev);
    return f.prev;
  }

  function createPID(kp, ki, kd) {
    return { kp, ki, kd, integral: 0, prevError: 0, output: 0 };
  }

  function pidStep(pid, setpoint, measured, dt) {
    const err    = setpoint - measured;
    pid.integral += err * dt;
    const deriv  = (err - pid.prevError) / (dt || EPS);
    pid.prevError = err;
    pid.output    = pid.kp * err + pid.ki * pid.integral + pid.kd * deriv;
    return pid.output;
  }

  // ── Curve fitting / interpolation ─────────────────────────
  function linearInterp1D(xArr, yArr, x) {
    if (x <= xArr[0]) return yArr[0];
    if (x >= xArr[xArr.length-1]) return yArr[yArr.length-1];
    for (let i = 1; i < xArr.length; i++) {
      if (x <= xArr[i]) {
        const t = (x - xArr[i-1]) / ((xArr[i] - xArr[i-1]) || EPS);
        return yArr[i-1] + t * (yArr[i] - yArr[i-1]);
      }
    }
    return yArr[yArr.length-1];
  }

  function bilinearInterp(x0,y0,x1,y1, q00,q10,q01,q11, x, y) {
    const tx = (x - x0) / ((x1 - x0) || EPS);
    const ty = (y - y0) / ((y1 - y0) || EPS);
    return q00*(1-tx)*(1-ty) + q10*tx*(1-ty) + q01*(1-tx)*ty + q11*tx*ty;
  }

  // ── Statistics ────────────────────────────────────────────
  function mean(arr) { return arr.reduce((s,v) => s+v, 0) / (arr.length || 1); }
  function variance(arr) { const m = mean(arr); return mean(arr.map(v => (v-m)**2)); }
  function stdDev(arr) { return Math.sqrt(variance(arr)); }
  function rms(arr) { return Math.sqrt(mean(arr.map(v => v*v))); }

  return {
    PI, TAU, DEG, RAD, SQRT2, SQRT3, PHI, EPS,
    clamp, lerp, smoothstep, smootherstep, sign, fract, mod, saturate, sqr, cube, remap,
    wrapAngle, angleDiff, lerpAngle, deg2rad, rad2deg,
    V, V3, M2, M3,
    eulerStep, rk4Step,
    createLowPass, lpFilter, createPID, pidStep,
    linearInterp1D, bilinearInterp,
    mean, variance, stdDev, rms,
  };
})();


// ============================================================
// RACE_PHYSICS_SYSTEMS — Race-specific physics: drafting, pit,
//   penalty, timing, track limits, fuel strategy
// ============================================================
const RACE_PHYSICS_SYSTEMS = (() => {
  'use strict';

  // ── Drafting / slipstream ────────────────────────────────
  const DRAFT_ZONES = [
    { distMin:0,  distMax:5,  dragRed:0.32, thrustBonus:0.05 },
    { distMin:5,  distMax:10, dragRed:0.22, thrustBonus:0.02 },
    { distMin:10, distMax:18, dragRed:0.10, thrustBonus:0.00 },
    { distMin:18, distMax:30, dragRed:0.03, thrustBonus:0.00 },
  ];

  function draftEffect(distBehindLeader, leaderSpeed, ownSpeed) {
    for (const zone of DRAFT_ZONES) {
      if (distBehindLeader >= zone.distMin && distBehindLeader < zone.distMax) {
        const speedRatio = Math.min(1.2, ownSpeed / (leaderSpeed || 1));
        return {
          dragReduction:   zone.dragRed * speedRatio,
          thrustBonus:     zone.thrustBonus,
          inDraft:         true,
          zone:            DRAFT_ZONES.indexOf(zone),
        };
      }
    }
    return { dragReduction: 0, thrustBonus: 0, inDraft: false, zone: -1 };
  }

  // ── Dirty air (following closely) ────────────────────────
  function dirtyAirEffect(distBehindLeader) {
    if (distBehindLeader > 15) return { aeroLoss: 0 };
    const loss = (1 - distBehindLeader / 15) * 0.25;
    return { aeroLoss: loss, handlingDegradation: loss * 0.3 };
  }

  // ── Pit stop physics ─────────────────────────────────────
  const PIT_SERVICES = {
    tire_change_dry:   { time: 2.5,  fuelAdded: 0,   tireRestored: true  },
    tire_change_wet:   { time: 3.0,  fuelAdded: 0,   tireRestored: true  },
    refuel_only:       { time: 0,    fuelAdded: 50,  tireRestored: false },
    full_service:      { time: 4.0,  fuelAdded: 40,  tireRestored: true  },
    damage_repair:     { time: 12.0, fuelAdded: 0,   tireRestored: false },
    front_wing:        { time: 5.0,  fuelAdded: 0,   tireRestored: false },
    splash_fuel:       { time: 0,    fuelAdded: 10,  tireRestored: false },
    drive_through:     { time: 0,    fuelAdded: 0,   tireRestored: false, penalty: true },
  };

  function createPitStopState() {
    return {
      inPit:    false,
      service:  null,
      timer:    0,
      complete: false,
      totalPitTime: 0,
      pitCount: 0,
    };
  }

  function stepPitStop(state, dt) {
    if (!state.inPit || !state.service) return state;
    const svc = PIT_SERVICES[state.service];
    if (!svc) return state;
    state.timer += dt;
    const totalTime = svc.time + 2.0; // entry + exit
    if (state.timer >= totalTime) {
      state.complete = true;
      state.inPit    = false;
      state.totalPitTime += state.timer;
      state.pitCount++;
      state.timer = 0;
    }
    return state;
  }

  // ── Lap timing ────────────────────────────────────────────
  function createLapTimer() {
    return {
      currentLapTime: 0,
      lapTimes:       [],
      sectorTimes:    [],
      currentSector:  0,
      sectorStart:    0,
      bestLap:        Infinity,
      lapCount:       0,
    };
  }

  function updateLapTimer(timer, dt, crossedLine, sectorLine) {
    timer.currentLapTime += dt;
    if (sectorLine !== undefined) {
      timer.sectorTimes.push({ sector: timer.currentSector, time: timer.currentLapTime - timer.sectorStart });
      timer.sectorStart = timer.currentLapTime;
      timer.currentSector = (timer.currentSector + 1) % 3;
    }
    if (crossedLine) {
      const lap = timer.currentLapTime;
      timer.lapTimes.push(lap);
      if (lap < timer.bestLap) timer.bestLap = lap;
      timer.currentLapTime = 0;
      timer.currentSector  = 0;
      timer.sectorStart    = 0;
      timer.lapCount++;
    }
    return timer;
  }

  // ── Track limits ──────────────────────────────────────────
  function createTrackLimitsSystem() {
    return { violations: 0, warningCount: 0, penaltyPending: false, lapViolations: 0 };
  }

  function checkTrackLimits(limits, wheels, trackBoundary) {
    let wheelsOutside = 0;
    for (const w of wheels) {
      if (!trackBoundary.contains(w.x, w.y)) wheelsOutside++;
    }
    if (wheelsOutside >= 2) {
      limits.violations++;
      limits.lapViolations++;
      if (limits.lapViolations >= 3) {
        limits.penaltyPending = true;
        limits.lapViolations  = 0;
      }
      return { violation: true, wheelsOut: wheelsOutside };
    }
    return { violation: false, wheelsOut: wheelsOutside };
  }

  // ── Fuel strategy ─────────────────────────────────────────
  function fuelStrategyModel(opts) {
    const o = opts || {};
    return {
      tankCapacity:   o.tankCapacity   || 60,    // liters
      currentFuel:    o.startFuel      || 60,
      fuelDensity:    0.75,   // kg/L
      consumptionMap: o.consumptionMap || defaultFuelMap(),
      lapFuelTarget:  o.lapFuelTarget  || 2.8,   // L/lap
    };
  }

  function defaultFuelMap() {
    // [throttle_fraction → L/100km]
    return [[0,2],[0.2,6],[0.4,12],[0.6,18],[0.8,26],[1.0,35]];
  }

  function fuelConsumptionRate(strategy, throttle, speed) {
    const map = strategy.consumptionMap;
    let L100 = 2;
    for (let i = 1; i < map.length; i++) {
      if (throttle <= map[i][0]) {
        const t = (throttle - map[i-1][0]) / ((map[i][0]-map[i-1][0])||1);
        L100 = map[i-1][1] + t * (map[i][1]-map[i-1][1]);
        break;
      }
    }
    const speedKmh  = speed * 3.6;
    const rateL_s   = speedKmh > 1 ? L100 * speedKmh / 360000 : L100 * 0.001;
    return rateL_s;
  }

  function updateFuelStrategy(strategy, throttle, speed, dt) {
    const rate = fuelConsumptionRate(strategy, throttle, speed);
    strategy.currentFuel = Math.max(0, strategy.currentFuel - rate * dt);
    const fuelMass = strategy.currentFuel * strategy.fuelDensity;
    return {
      fuelRemaining: strategy.currentFuel,
      fuelMassKg:    fuelMass,
      fuelFraction:  strategy.currentFuel / strategy.tankCapacity,
      rateLS:        rate,
      empty:         strategy.currentFuel < 0.5,
    };
  }

  // ── Traction circle ───────────────────────────────────────
  function tractionCircle(Fx, Fy, muMax, normalForce) {
    const maxF = muMax * normalForce;
    const used = Math.sqrt(Fx*Fx + Fy*Fy) / (maxF || 1);
    const remaining = Math.max(0, 1 - used);
    return { usage: Math.min(1, used), remaining, saturated: used >= 1 };
  }

  // ── Optimal racing line (simplified) ─────────────────────
  function apexSpeed(cornerRadius, muMax, mass, downforce) {
    const totalWeight = mass * 9.81 + downforce;
    const Fcentripetal = muMax * totalWeight;
    const vMax = Math.sqrt(Fcentripetal * cornerRadius / mass);
    return vMax;
  }

  function brakingDistance(speed, decelG, downforceKg) {
    const totalG = decelG + downforceKg * 9.81 / 100; // rough downforce boost
    return (speed * speed) / (2 * totalG * 9.81);
  }

  // ── Weather effects on race ───────────────────────────────
  const RACE_WEATHER_EFFECTS = {
    dry:       { gripMult: 1.00, visibilityM: 500, safetyCarLikely: 0.02 },
    damp:      { gripMult: 0.80, visibilityM: 400, safetyCarLikely: 0.08 },
    light_rain:{ gripMult: 0.65, visibilityM: 300, safetyCarLikely: 0.15 },
    heavy_rain:{ gripMult: 0.45, visibilityM: 150, safetyCarLikely: 0.40 },
    fog:       { gripMult: 0.85, visibilityM:  80, safetyCarLikely: 0.30 },
    snow:      { gripMult: 0.25, visibilityM: 100, safetyCarLikely: 0.80 },
  };

  // ── Safety car physics ────────────────────────────────────
  function safetyCarSpeed(trackLength, conditions) {
    const weather = RACE_WEATHER_EFFECTS[conditions] || RACE_WEATHER_EFFECTS.dry;
    const baseSpeed = 80 / 3.6; // m/s
    return baseSpeed * weather.gripMult;
  }

  return {
    DRAFT_ZONES, PIT_SERVICES, RACE_WEATHER_EFFECTS,
    draftEffect, dirtyAirEffect,
    createPitStopState, stepPitStop,
    createLapTimer, updateLapTimer,
    createTrackLimitsSystem, checkTrackLimits,
    fuelStrategyModel, fuelConsumptionRate, updateFuelStrategy,
    tractionCircle, apexSpeed, brakingDistance, safetyCarSpeed,
  };
})();


// ============================================================
// VEHICLE_SETUP_PROFILES — Comprehensive setup tables and
//   tuning parameter ranges for all vehicle categories
// ============================================================
const VEHICLE_SETUP_PROFILES = (() => {
  'use strict';

  // ── Vehicle categories ────────────────────────────────────
  const CATEGORIES = {
    SUPER_CAR:    'super_car',
    SPORTS:       'sports',
    MUSCLE:       'muscle',
    RALLY:        'rally',
    OFFROAD:      'offroad',
    MONSTER:      'monster',
    BUGGY:        'buggy',
    MOTOCROSS:    'motocross',
    DRAG:         'drag',
    DRIFT:        'drift',
    FORMULA:      'formula',
    GT_RACE:      'gt_race',
    SUV:          'suv',
    PICKUP:       'pickup',
    VAN:          'van',
  };

  // ── Setup ranges per category ─────────────────────────────
  const SETUP_RANGES = {
    super_car: {
      suspSpringF:  {min:45000, max:85000, default:65000},
      suspSpringR:  {min:40000, max:80000, default:60000},
      suspDampF:    {min:4000,  max:9000,  default:6500},
      suspDampR:    {min:3500,  max:8500,  default:6000},
      rideHeightF:  {min:0.06,  max:0.12,  default:0.09},
      rideHeightR:  {min:0.05,  max:0.11,  default:0.08},
      camberF:      {min:-3.5,  max:0,     default:-2.0},
      camberR:      {min:-2.5,  max:0,     default:-1.5},
      toeF:         {min:-0.2,  max:0.2,   default:0.0},
      toeR:         {min:-0.4,  max:0.1,   default:-0.1},
      antiRollF:    {min:15000, max:35000, default:25000},
      antiRollR:    {min:10000, max:25000, default:18000},
      brakeBias:    {min:0.50,  max:0.70,  default:0.60},
      diffRear:     {min:0.20,  max:0.80,  default:0.50},
      aeroFront:    {min:0,     max:8,     default:3},
      aeroRear:     {min:0,     max:12,    default:5},
      tirePressF:   {min:180,   max:260,   default:220},
      tirePressR:   {min:175,   max:255,   default:215},
    },
    rally: {
      suspSpringF:  {min:25000, max:55000, default:38000},
      suspSpringR:  {min:22000, max:50000, default:35000},
      suspDampF:    {min:3000,  max:7000,  default:4800},
      suspDampR:    {min:2800,  max:6500,  default:4500},
      rideHeightF:  {min:0.14,  max:0.24,  default:0.18},
      rideHeightR:  {min:0.13,  max:0.23,  default:0.17},
      camberF:      {min:-2.0,  max:1.0,   default:-0.5},
      camberR:      {min:-1.5,  max:0.5,   default:-0.3},
      toeF:         {min:-0.3,  max:0.3,   default:0.0},
      toeR:         {min:-0.2,  max:0.4,   default:0.2},
      antiRollF:    {min:8000,  max:20000, default:13000},
      antiRollR:    {min:6000,  max:18000, default:11000},
      brakeBias:    {min:0.45,  max:0.65,  default:0.55},
      diffRear:     {min:0.40,  max:1.00,  default:0.75},
      aeroFront:    {min:0,     max:4,     default:2},
      aeroRear:     {min:0,     max:6,     default:3},
      tirePressF:   {min:160,   max:240,   default:195},
      tirePressR:   {min:155,   max:235,   default:190},
    },
    offroad: {
      suspSpringF:  {min:15000, max:35000, default:22000},
      suspSpringR:  {min:14000, max:32000, default:20000},
      suspDampF:    {min:2500,  max:5500,  default:3800},
      suspDampR:    {min:2200,  max:5000,  default:3500},
      rideHeightF:  {min:0.20,  max:0.40,  default:0.28},
      rideHeightR:  {min:0.18,  max:0.38,  default:0.26},
      camberF:      {min:-1.0,  max:2.0,   default:0.5},
      camberR:      {min:-0.5,  max:1.5,   default:0.3},
      toeF:         {min:-0.2,  max:0.5,   default:0.1},
      toeR:         {min:0.0,   max:0.6,   default:0.3},
      antiRollF:    {min:3000,  max:10000, default:6000},
      antiRollR:    {min:2500,  max:9000,  default:5000},
      brakeBias:    {min:0.40,  max:0.60,  default:0.50},
      diffRear:     {min:0.60,  max:1.00,  default:0.90},
      aeroFront:    {min:0,     max:2,     default:0},
      aeroRear:     {min:0,     max:3,     default:1},
      tirePressF:   {min:100,   max:200,   default:145},
      tirePressR:   {min:95,    max:195,   default:140},
    },
    formula: {
      suspSpringF:  {min:80000, max:180000, default:120000},
      suspSpringR:  {min:70000, max:160000, default:110000},
      suspDampF:    {min:6000,  max:14000,  default:10000},
      suspDampR:    {min:5500,  max:13000,  default:9000},
      rideHeightF:  {min:0.03,  max:0.07,   default:0.04},
      rideHeightR:  {min:0.04,  max:0.09,   default:0.06},
      camberF:      {min:-4.5,  max:-1.0,   default:-3.0},
      camberR:      {min:-3.5,  max:-0.5,   default:-2.5},
      toeF:         {min:-0.1,  max:0.1,    default:0.0},
      toeR:         {min:-0.3,  max:0.0,    default:-0.1},
      antiRollF:    {min:20000, max:60000,  default:40000},
      antiRollR:    {min:15000, max:50000,  default:30000},
      brakeBias:    {min:0.52,  max:0.72,   default:0.62},
      diffRear:     {min:0.30,  max:0.90,   default:0.60},
      aeroFront:    {min:5,     max:25,     default:12},
      aeroRear:     {min:8,     max:35,     default:18},
      tirePressF:   {min:170,   max:230,    default:200},
      tirePressR:   {min:165,   max:225,    default:195},
    },
    drag: {
      suspSpringF:  {min:30000, max:70000, default:45000},
      suspSpringR:  {min:60000, max:140000,default:90000},
      suspDampF:    {min:3000,  max:7000,  default:4500},
      suspDampR:    {min:5000,  max:11000, default:7000},
      rideHeightF:  {min:0.05,  max:0.12,  default:0.08},
      rideHeightR:  {min:0.08,  max:0.18,  default:0.12},
      camberF:      {min:0,     max:1.0,   default:0.2},
      camberR:      {min:-1.0,  max:0.0,   default:-0.5},
      toeF:         {min:0,     max:0.2,   default:0.05},
      toeR:         {min:-0.1,  max:0.1,   default:0.0},
      antiRollF:    {min:2000,  max:8000,  default:4000},
      antiRollR:    {min:5000,  max:20000, default:12000},
      brakeBias:    {min:0.35,  max:0.55,  default:0.45},
      diffRear:     {min:0.80,  max:1.00,  default:1.00},
      aeroFront:    {min:0,     max:4,     default:1},
      aeroRear:     {min:0,     max:8,     default:3},
      tirePressF:   {min:120,   max:180,   default:145},
      tirePressR:   {min:80,    max:160,   default:115},
    },
    drift: {
      suspSpringF:  {min:35000, max:65000, default:48000},
      suspSpringR:  {min:20000, max:45000, default:32000},
      suspDampF:    {min:3500,  max:7500,  default:5200},
      suspDampR:    {min:2500,  max:5500,  default:3800},
      rideHeightF:  {min:0.06,  max:0.13,  default:0.09},
      rideHeightR:  {min:0.07,  max:0.15,  default:0.11},
      camberF:      {min:-4.0,  max:-1.0,  default:-2.5},
      camberR:      {min:-3.0,  max:0.0,   default:-1.5},
      toeF:         {min:-0.3,  max:0.0,   default:-0.1},
      toeR:         {min:0.1,   max:0.6,   default:0.3},
      antiRollF:    {min:12000, max:30000, default:20000},
      antiRollR:    {min:5000,  max:15000, default:9000},
      brakeBias:    {min:0.48,  max:0.68,  default:0.58},
      diffRear:     {min:0.70,  max:1.00,  default:0.90},
      aeroFront:    {min:0,     max:5,     default:2},
      aeroRear:     {min:0,     max:8,     default:4},
      tirePressF:   {min:160,   max:230,   default:195},
      tirePressR:   {min:140,   max:210,   default:175},
    },
  };

  // ── Normalize setup value ─────────────────────────────────
  function normalizeSetup(category, param, value) {
    const ranges = SETUP_RANGES[category];
    if (!ranges || !ranges[param]) return 0.5;
    const r = ranges[param];
    return (value - r.min) / ((r.max - r.min) || 1);
  }

  function denormalizeSetup(category, param, normalized) {
    const ranges = SETUP_RANGES[category];
    if (!ranges || !ranges[param]) return 0;
    const r = ranges[param];
    return r.min + normalized * (r.max - r.min);
  }

  // ── Default setup for category ────────────────────────────
  function defaultSetup(category) {
    const ranges = SETUP_RANGES[category];
    if (!ranges) return {};
    const setup = {};
    for (const [param, r] of Object.entries(ranges)) {
      setup[param] = r.default;
    }
    return setup;
  }

  // ── Setup validation ──────────────────────────────────────
  function validateSetup(category, setup) {
    const ranges = SETUP_RANGES[category];
    if (!ranges) return { valid: false, errors: ['Unknown category'] };
    const errors = [];
    for (const [param, value] of Object.entries(setup)) {
      const r = ranges[param];
      if (!r) continue;
      if (value < r.min) errors.push(`${param}: ${value} below min ${r.min}`);
      if (value > r.max) errors.push(`${param}: ${value} above max ${r.max}`);
    }
    return { valid: errors.length === 0, errors };
  }

  // ── Setup randomizer ──────────────────────────────────────
  function randomSetup(category, rng) {
    const ranges = SETUP_RANGES[category];
    if (!ranges) return {};
    const setup = {};
    const r2 = rng || Math.random.bind(Math);
    for (const [param, r] of Object.entries(ranges)) {
      setup[param] = r.min + r2() * (r.max - r.min);
    }
    return setup;
  }

  // ── Setup presets ─────────────────────────────────────────
  const NAMED_PRESETS = {
    'super_car.tarmac_grip': {
      category: 'super_car',
      note: 'Maximum mechanical grip on smooth tarmac',
      overrides: { camberF: -3.0, camberR: -2.0, toeR: -0.2, antiRollF: 30000 },
    },
    'rally.scandinavian': {
      category: 'rally',
      note: 'Loose surface setup with high rear bias',
      overrides: { rideHeightF: 0.20, rideHeightR: 0.19, diffRear: 0.90, toeR: 0.3 },
    },
    'offroad.rock_crawl': {
      category: 'offroad',
      note: 'Maximum articulation for rock crawling',
      overrides: { rideHeightF: 0.36, rideHeightR: 0.34, tirePressF: 110, tirePressR: 105 },
    },
    'drag.quarter_mile': {
      category: 'drag',
      note: 'Maximize straight line acceleration',
      overrides: { tirePressR: 100, diffRear: 1.0, antiRollR: 18000, suspDampR: 9000 },
    },
    'formula.monaco': {
      category: 'formula',
      note: 'High downforce, low straight-line speed',
      overrides: { aeroFront: 22, aeroRear: 32, rideHeightF: 0.035, camberF: -4.0 },
    },
    'formula.monza': {
      category: 'formula',
      note: 'Low drag, high straight-line efficiency',
      overrides: { aeroFront: 6, aeroRear: 9, rideHeightF: 0.055, camberF: -2.5 },
    },
  };

  function applyPreset(presetName) {
    const preset = NAMED_PRESETS[presetName];
    if (!preset) return null;
    const base = defaultSetup(preset.category);
    return { ...base, ...preset.overrides, _preset: presetName, _note: preset.note };
  }

  // ── Weight sensitivity coefficients ──────────────────────
  const SETUP_SENSITIVITY = {
    suspSpringF:  { laptime: -0.012, handling: 0.08, comfort: -0.05 },
    suspDampF:    { laptime: -0.008, handling: 0.05, comfort: -0.07 },
    rideHeightF:  { laptime: 0.020,  handling:-0.12, comfort:  0.04 },
    camberF:      { laptime: -0.015, handling: 0.10, comfort: -0.03 },
    antiRollF:    { laptime: -0.010, handling: 0.07, comfort: -0.06 },
    brakeBias:    { laptime: -0.005, handling: 0.03, comfort:  0.00 },
    diffRear:     { laptime: -0.018, handling: 0.12, comfort: -0.02 },
    aeroRear:     { laptime: -0.025, handling: 0.15, comfort:  0.00 },
    tirePressF:   { laptime: -0.008, handling: 0.06, comfort: -0.04 },
  };

  function setupBalanceScore(category, setup) {
    const def = defaultSetup(category);
    let lapScore = 0, handScore = 0, comfScore = 0;
    for (const [param, sens] of Object.entries(SETUP_SENSITIVITY)) {
      if (setup[param] === undefined || def[param] === undefined) continue;
      const n = normalizeSetup(category, param, setup[param]);
      lapScore  += n * sens.laptime;
      handScore += n * sens.handling;
      comfScore += n * sens.comfort;
    }
    return { laptimeBonus: lapScore, handlingScore: handScore, comfortScore: comfScore };
  }

  return {
    CATEGORIES, SETUP_RANGES, NAMED_PRESETS, SETUP_SENSITIVITY,
    normalizeSetup, denormalizeSetup, defaultSetup,
    validateSetup, randomSetup, applyPreset, setupBalanceScore,
  };
})();


// ============================================================
// AI_PHYSICS_DRIVER — Physics-aware AI driving model
// ============================================================
const AI_PHYSICS_DRIVER = (() => {
  'use strict';

  // ── AI skill levels ───────────────────────────────────────
  const SKILL_LEVELS = {
    novice:       { brakePointFactor:0.85, throttleResponse:0.60, steerSmooth:0.4, errorSigma:0.08 },
    amateur:      { brakePointFactor:0.90, throttleResponse:0.72, steerSmooth:0.5, errorSigma:0.05 },
    intermediate: { brakePointFactor:0.94, throttleResponse:0.82, steerSmooth:0.6, errorSigma:0.03 },
    advanced:     { brakePointFactor:0.97, throttleResponse:0.91, steerSmooth:0.7, errorSigma:0.018 },
    professional: { brakePointFactor:1.00, throttleResponse:1.00, steerSmooth:0.8, errorSigma:0.010 },
    elite:        { brakePointFactor:1.02, throttleResponse:1.00, steerSmooth:0.9, errorSigma:0.005 },
  };

  // ── AI driver state ───────────────────────────────────────
  function createAIDriver(skill, rng) {
    const s = SKILL_LEVELS[skill] || SKILL_LEVELS.intermediate;
    return {
      skill:          s,
      targetLane:     0,
      targetSpeed:    0,
      steerOutput:    0,
      throttleOutput: 0,
      brakeOutput:    0,
      currentBehav:   'follow',
      overtakeTimer:  0,
      overtakeSide:   0,
      lookaheadDist:  30,
      rng:            rng || Math.random.bind(Math),
      pidSteer:       createSimplePID(1.5, 0.05, 0.3),
      pidSpeed:       createSimplePID(0.8, 0.02, 0.1),
      errorAccum:     0,
    };
  }

  function createSimplePID(kp, ki, kd) {
    return { kp, ki, kd, integral: 0, prev: 0 };
  }

  function pidStep(pid, err, dt) {
    pid.integral += err * dt;
    const d = (err - pid.prev) / (dt || 0.016);
    pid.prev = err;
    return pid.kp * err + pid.ki * pid.integral + pid.kd * d;
  }

  // ── Look-ahead path following ─────────────────────────────
  function lookAheadPoint(path, currentPos, lookDist) {
    let cumDist = 0, best = path[0];
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i-1].x, dy = path[i].y - path[i-1].y;
      const segLen = Math.sqrt(dx*dx + dy*dy);
      cumDist += segLen;
      if (cumDist >= lookDist) {
        const t = (cumDist - lookDist) / (segLen || 1);
        best = { x: path[i].x - dx*t, y: path[i].y - dy*t };
        break;
      }
      best = path[i];
    }
    return best;
  }

  // ── Lateral error for steering ────────────────────────────
  function lateralError(vehiclePos, vehicleAngle, targetPoint) {
    const dx = targetPoint.x - vehiclePos.x;
    const dy = targetPoint.y - vehiclePos.y;
    const fwd = { x: Math.cos(vehicleAngle), y: Math.sin(vehicleAngle) };
    const right = { x: -fwd.y, y: fwd.x };
    return dx * right.x + dy * right.y;
  }

  // ── Speed planning ────────────────────────────────────────
  function targetSpeedForCorner(cornerRadius, mu, mass, downforce) {
    const Fmax = mu * (mass * 9.81 + downforce);
    return Math.sqrt(Fmax * cornerRadius / mass);
  }

  function brakingProfile(currentSpeed, targetSpeed, decelG, distToCorner) {
    const dV    = currentSpeed - targetSpeed;
    const decel = decelG * 9.81;
    const distNeeded = (currentSpeed * currentSpeed - targetSpeed * targetSpeed) / (2 * decel);
    return {
      shouldBrake:  distNeeded >= distToCorner && dV > 0,
      brakeAmount:  Math.max(0, Math.min(1, (distNeeded - distToCorner) / (distNeeded || 1))),
      distNeeded,
    };
  }

  // ── Steering smoothing ────────────────────────────────────
  function smoothSteering(current, target, smoothFactor, dt) {
    return current + (target - current) * Math.min(1, smoothFactor * dt * 10);
  }

  // ── Overtake decision ─────────────────────────────────────
  function shouldOvertake(aiDriver, gapAhead, leaderSpeed, ownSpeed, oppSide) {
    const speedAdvantage = ownSpeed - leaderSpeed;
    const timeToClose    = gapAhead / (speedAdvantage || 0.01);
    const shouldAttempt  = speedAdvantage > 0.5 && timeToClose < 8 && gapAhead < 25;
    if (shouldAttempt && aiDriver.currentBehav !== 'overtake') {
      aiDriver.currentBehav = 'overtake';
      aiDriver.overtakeSide = oppSide !== undefined ? -oppSide : (aiDriver.rng() > 0.5 ? 1 : -1);
      aiDriver.overtakeTimer = 0;
    }
    return shouldAttempt;
  }

  // ── Defensive driving ─────────────────────────────────────
  function defensiveSteer(aiDriver, challengerPos, ownPos, ownAngle) {
    const dx = challengerPos.x - ownPos.x;
    const dy = challengerPos.y - ownPos.y;
    const right = { x: -Math.sin(ownAngle), y: Math.cos(ownAngle) };
    const lateralOffset = dx * right.x + dy * right.y;
    // Block: move toward challenger
    const blockAmount = Math.sign(lateralOffset) * 0.3;
    return blockAmount;
  }

  // ── Full AI step ──────────────────────────────────────────
  function stepAIDriver(driver, state, path, corners, opponents, dt) {
    const {position, angle, speed} = state;
    const skill = driver.skill;
    // Add driver error
    const errorNoise = (driver.rng() - 0.5) * 2 * skill.errorSigma;

    // Path following
    const laPoint = lookAheadPoint(path, position, driver.lookaheadDist);
    const latErr  = lateralError(position, angle, laPoint) + errorNoise * 2;
    const steerRaw = pidStep(driver.pidSteer, latErr, dt);

    // Speed planning
    let targetV = state.maxSpeed || 30;
    for (const corner of (corners || [])) {
      const dist = Math.sqrt((corner.x - position.x)**2 + (corner.y - position.y)**2);
      const cSpeed = targetSpeedForCorner(corner.radius, 0.85, state.mass || 1200, 500);
      const bp     = brakingProfile(speed, cSpeed, 0.85 * skill.brakePointFactor, dist);
      if (bp.shouldBrake && cSpeed < targetV) {
        targetV = cSpeed;
        driver.brakeOutput = bp.brakeAmount * skill.throttleResponse;
      }
    }

    const speedErr = (targetV - speed);
    const throttleRaw = pidStep(driver.pidSpeed, speedErr, dt);

    // Opponents
    for (const opp of (opponents || [])) {
      const dist = Math.sqrt((opp.x - position.x)**2 + (opp.y - position.y)**2);
      if (dist < 15 && dist > 0) {
        shouldOvertake(driver, dist, opp.speed || speed, speed, opp.side);
      }
    }

    // Overtake correction
    let steerFinal = steerRaw;
    if (driver.currentBehav === 'overtake') {
      steerFinal += driver.overtakeSide * 0.2;
      driver.overtakeTimer += dt;
      if (driver.overtakeTimer > 5) { driver.currentBehav = 'follow'; driver.overtakeTimer = 0; }
    }

    // Smooth outputs
    driver.steerOutput    = smoothSteering(driver.steerOutput, steerFinal, skill.steerSmooth, dt);
    driver.throttleOutput = smoothSteering(driver.throttleOutput, Math.max(0, throttleRaw), 0.5, dt);
    driver.throttleOutput = Math.max(0, Math.min(1, driver.throttleOutput)) * skill.throttleResponse;
    driver.brakeOutput    = Math.max(0, Math.min(1, driver.brakeOutput));

    return {
      steer:    driver.steerOutput,
      throttle: driver.throttleOutput,
      brake:    driver.brakeOutput,
      behavior: driver.currentBehav,
    };
  }

  // ── Rubberband AI (catch-up mechanic) ────────────────────
  function rubberbandFactor(aiPosition, playerPosition, numVehicles) {
    const positionRatio = aiPosition / (numVehicles || 1);
    const distToPlayer  = Math.abs(aiPosition - playerPosition);
    if (aiPosition < playerPosition) {
      // AI is ahead: slight slowdown
      return 1.0 - positionRatio * 0.08;
    } else {
      // AI is behind: boost proportional to gap
      return 1.0 + Math.min(0.20, distToPlayer / numVehicles * 0.15);
    }
  }

  // ── Formation driving ─────────────────────────────────────
  function formationTarget(leaderPos, leaderAngle, slot, spacing) {
    const sp = spacing || 8;
    const angle = leaderAngle + Math.PI; // behind leader
    const lateralOffset = (slot % 2 === 0 ? 1 : -1) * 1.5;
    const longitudinalOffset = -(Math.floor(slot / 2) + 1) * sp;
    return {
      x: leaderPos.x + Math.cos(leaderAngle) * longitudinalOffset - Math.sin(leaderAngle) * lateralOffset,
      y: leaderPos.y + Math.sin(leaderAngle) * longitudinalOffset + Math.cos(leaderAngle) * lateralOffset,
    };
  }

  return {
    SKILL_LEVELS,
    createAIDriver, createSimplePID, pidStep,
    lookAheadPoint, lateralError,
    targetSpeedForCorner, brakingProfile, smoothSteering,
    shouldOvertake, defensiveSteer, stepAIDriver,
    rubberbandFactor, formationTarget,
  };
})();


// ============================================================
// PHYSICS_EVENTS_EXT — Extended event system for physics triggers
// ============================================================
const PHYSICS_EVENTS_EXT = (() => {
  'use strict';

  const EVENT_TYPES = {
    COLLISION:        'collision',
    FLIP:             'flip',
    LANDING:          'landing',
    AIRBORNE:         'airborne',
    SLIDE:            'slide',
    SPIN:             'spin',
    NEAR_MISS:        'near_miss',
    WHEEL_LIFT:       'wheel_lift',
    GROUNDING:        'grounding',
    FUEL_LOW:         'fuel_low',
    ENGINE_STALL:     'engine_stall',
    OVERHEAT:         'overheat',
    BRAKE_FADE:       'brake_fade',
    TIRE_BURST:       'tire_burst',
    NITRO_START:      'nitro_start',
    NITRO_END:        'nitro_end',
    GEAR_CHANGE:      'gear_change',
    ABS_ENGAGE:       'abs_engage',
    TCS_ENGAGE:       'tcs_engage',
    ESC_ENGAGE:       'esc_engage',
    CHECKPOINT:       'checkpoint',
    LAP_COMPLETE:     'lap_complete',
    TRACK_LIMIT:      'track_limit',
    PIT_ENTRY:        'pit_entry',
    PIT_EXIT:         'pit_exit',
    IMPACT_MILD:      'impact_mild',
    IMPACT_MODERATE:  'impact_moderate',
    IMPACT_SEVERE:    'impact_severe',
    ROLLOVER_RISK:    'rollover_risk',
    SURFACE_CHANGE:   'surface_change',
    WATER_ENTRY:      'water_entry',
    WATER_EXIT:       'water_exit',
    JUMP_START:       'jump_start',
    JUMP_LAND:        'jump_land',
    BOOST_COLLECTED:  'boost_collected',
    OBSTACLE_HIT:     'obstacle_hit',
  };

  // ── Event bus ─────────────────────────────────────────────
  function createEventBus() {
    return {
      listeners: {},
      queue:     [],
      fired:     [],
      maxQueue:  200,
    };
  }

  function subscribe(bus, type, handler, priority) {
    if (!bus.listeners[type]) bus.listeners[type] = [];
    bus.listeners[type].push({ handler, priority: priority || 0 });
    bus.listeners[type].sort((a, b) => b.priority - a.priority);
  }

  function unsubscribe(bus, type, handler) {
    if (!bus.listeners[type]) return;
    bus.listeners[type] = bus.listeners[type].filter(l => l.handler !== handler);
  }

  function emit(bus, type, data) {
    if (bus.queue.length >= bus.maxQueue) bus.queue.shift();
    bus.queue.push({ type, data, timestamp: performance.now() });
  }

  function flushEvents(bus, dt) {
    bus.fired = [];
    while (bus.queue.length > 0) {
      const event = bus.queue.shift();
      bus.fired.push(event);
      const listeners = bus.listeners[event.type];
      if (listeners) {
        for (const l of listeners) {
          try { l.handler(event.data, event.type, event.timestamp); }
          catch (e) { /* silently skip bad handlers */ }
        }
      }
    }
    return bus.fired;
  }

  // ── Physics event detector ────────────────────────────────
  function createEventDetector() {
    return {
      prevOnGround:  true,
      prevAngle:     0,
      prevSpeed:     0,
      prevRpm:       0,
      flipTimer:     0,
      slideTimer:    0,
      airborneTimer: 0,
      prevSurface:   '',
      prevSubmerged: false,
      absWasActive:  false,
      tcsWasActive:  false,
      escWasActive:  false,
      nitroWasActive:false,
      prevGear:      1,
    };
  }

  function detectPhysicsEvents(detector, vehicle, physics, dt, bus) {
    const angle   = vehicle.angle;
    const speed   = vehicle.speed;
    const onGround= vehicle.onGround !== false;
    const rpm     = vehicle.rpm || 0;
    const gear    = vehicle.gear || 1;
    const subFrac = physics.submergedFraction || 0;

    // Airborne detection
    if (!onGround) {
      detector.airborneTimer += dt;
      if (detector.prevOnGround) emit(bus, EVENT_TYPES.AIRBORNE, { speed, angle });
    } else {
      if (!detector.prevOnGround && detector.airborneTimer > 0.2) {
        emit(bus, EVENT_TYPES.LANDING, { airTime: detector.airborneTimer, speed, impactVel: physics.impactVelocity });
      }
      detector.airborneTimer = 0;
    }

    // Flip detection
    const rollAngle = Math.abs(angle) % (2 * Math.PI);
    const isFlipped = rollAngle > Math.PI * 0.7 && rollAngle < Math.PI * 1.3;
    if (isFlipped) {
      detector.flipTimer += dt;
      if (detector.flipTimer > 0.1) emit(bus, EVENT_TYPES.FLIP, { angle, duration: detector.flipTimer });
    } else {
      detector.flipTimer = 0;
    }

    // Slide detection
    if (physics.lateralSlip !== undefined && Math.abs(physics.lateralSlip) > 0.15) {
      detector.slideTimer += dt;
      if (detector.slideTimer > 0.2) emit(bus, EVENT_TYPES.SLIDE, { slip: physics.lateralSlip, duration: detector.slideTimer });
    } else {
      detector.slideTimer = 0;
    }

    // Water events
    if (subFrac > 0.05 && !detector.prevSubmerged) emit(bus, EVENT_TYPES.WATER_ENTRY, { speed, fraction: subFrac });
    if (subFrac < 0.02 && detector.prevSubmerged)   emit(bus, EVENT_TYPES.WATER_EXIT,  { speed });
    detector.prevSubmerged = subFrac > 0.05;

    // System activation events
    if (physics.absActive   && !detector.absWasActive)   emit(bus, EVENT_TYPES.ABS_ENGAGE, {});
    if (physics.tcsActive   && !detector.tcsWasActive)   emit(bus, EVENT_TYPES.TCS_ENGAGE, {});
    if (physics.escActive   && !detector.escWasActive)   emit(bus, EVENT_TYPES.ESC_ENGAGE, {});
    if (physics.nitroActive && !detector.nitroWasActive) emit(bus, EVENT_TYPES.NITRO_START, {});
    if (!physics.nitroActive && detector.nitroWasActive) emit(bus, EVENT_TYPES.NITRO_END,   {});
    detector.absWasActive   = !!physics.absActive;
    detector.tcsWasActive   = !!physics.tcsActive;
    detector.escWasActive   = !!physics.escActive;
    detector.nitroWasActive = !!physics.nitroActive;

    // Gear change
    if (gear !== detector.prevGear) emit(bus, EVENT_TYPES.GEAR_CHANGE, { from: detector.prevGear, to: gear, rpm });
    detector.prevGear = gear;

    // Overheat
    if (physics.engineTemp > 108) emit(bus, EVENT_TYPES.OVERHEAT, { temp: physics.engineTemp });

    // Brake fade
    if (physics.brakeFade) emit(bus, EVENT_TYPES.BRAKE_FADE, { temp: physics.brakeDiscTemp });

    // Fuel low
    if (physics.fuelFraction < 0.10) emit(bus, EVENT_TYPES.FUEL_LOW, { fraction: physics.fuelFraction });

    // Engine stall
    if (rpm < 400 && detector.prevRpm > 600 && vehicle.throttle < 0.05) {
      emit(bus, EVENT_TYPES.ENGINE_STALL, { rpm });
    }

    // Rollover risk
    if (physics.rolloverRisk && physics.rolloverRisk.risk) {
      emit(bus, EVENT_TYPES.ROLLOVER_RISK, { margin: physics.rolloverRisk.margin });
    }

    // Surface change
    if (physics.currentSurface && physics.currentSurface !== detector.prevSurface) {
      emit(bus, EVENT_TYPES.SURFACE_CHANGE, { from: detector.prevSurface, to: physics.currentSurface });
      detector.prevSurface = physics.currentSurface;
    }

    detector.prevOnGround = onGround;
    detector.prevAngle    = angle;
    detector.prevSpeed    = speed;
    detector.prevRpm      = rpm;
  }

  // ── Collision severity classification ─────────────────────
  function classifyCollision(energy) {
    if (energy < 2000)  return { type: EVENT_TYPES.IMPACT_MILD,     severity: 'mild',     score: 1 };
    if (energy < 15000) return { type: EVENT_TYPES.IMPACT_MODERATE, severity: 'moderate', score: 5 };
    return                    { type: EVENT_TYPES.IMPACT_SEVERE,    severity: 'severe',   score: 10 };
  }

  // ── Score accumulator from events ─────────────────────────
  const SCORE_TABLE = {
    [EVENT_TYPES.FLIP]:        50,  [EVENT_TYPES.LANDING]:       30,
    [EVENT_TYPES.AIRBORNE]:    10,  [EVENT_TYPES.NEAR_MISS]:     25,
    [EVENT_TYPES.SLIDE]:        5,  [EVENT_TYPES.NITRO_START]:   10,
    [EVENT_TYPES.IMPACT_MILD]: -5,  [EVENT_TYPES.IMPACT_MODERATE]:-20,
    [EVENT_TYPES.IMPACT_SEVERE]:-50,[EVENT_TYPES.TRACK_LIMIT]:   -10,
    [EVENT_TYPES.LAP_COMPLETE]: 100,[EVENT_TYPES.CHECKPOINT]:    20,
    [EVENT_TYPES.BOOST_COLLECTED]:15,
  };

  function accumulateScore(events) {
    let total = 0;
    for (const ev of events) {
      if (SCORE_TABLE[ev.type] !== undefined) total += SCORE_TABLE[ev.type];
    }
    return total;
  }

  // ── Event cooldown manager ────────────────────────────────
  function createCooldownManager(cooldowns) {
    const timers = {};
    for (const [type, cd] of Object.entries(cooldowns || {})) {
      timers[type] = 0;
    }
    return { cooldowns: cooldowns || {}, timers };
  }

  function checkCooldown(mgr, type, dt) {
    const cd = mgr.cooldowns[type] || 0;
    mgr.timers[type] = (mgr.timers[type] || 0) + dt;
    if (mgr.timers[type] >= cd) {
      mgr.timers[type] = 0;
      return true;
    }
    return false;
  }

  const DEFAULT_COOLDOWNS = {
    [EVENT_TYPES.OVERHEAT]:     2.0,
    [EVENT_TYPES.FUEL_LOW]:     5.0,
    [EVENT_TYPES.ABS_ENGAGE]:   0.5,
    [EVENT_TYPES.TCS_ENGAGE]:   0.5,
    [EVENT_TYPES.ESC_ENGAGE]:   0.5,
    [EVENT_TYPES.ROLLOVER_RISK]:1.0,
    [EVENT_TYPES.SLIDE]:        0.3,
  };

  return {
    EVENT_TYPES, SCORE_TABLE, DEFAULT_COOLDOWNS,
    createEventBus, subscribe, unsubscribe, emit, flushEvents,
    createEventDetector, detectPhysicsEvents,
    classifyCollision, accumulateScore,
    createCooldownManager, checkCooldown,
  };
})();


// ============================================================
// STUNT_PHYSICS — Stunt detection, scoring and special moves
// ============================================================
const STUNT_PHYSICS = (() => {
  'use strict';

  // ── Stunt types ───────────────────────────────────────────
  const STUNT = {
    WHEELIE:         'wheelie',
    STOPPIE:         'stoppie',
    BARREL_ROLL:     'barrel_roll',
    BACKFLIP:        'backflip',
    FRONTFLIP:       'frontflip',
    DONUT:           'donut',
    POWER_SLIDE:     'power_slide',
    NEAR_MISS:       'near_miss',
    LONG_JUMP:       'long_jump',
    HIGH_AIR:        'high_air',
    TWO_WHEELS:      'two_wheels',
    DRIFT_CHAIN:     'drift_chain',
    PERFECT_LANDING: 'perfect_landing',
    CLIFF_HANGER:    'cliff_hanger',
    SCRAPE:          'scrape',
  };

  // ── Stunt scoring ─────────────────────────────────────────
  const STUNT_BASE_SCORES = {
    wheelie:         { base:200,  multiplierPerSec:50, name:'Wheelie'         },
    stoppie:         { base:250,  multiplierPerSec:60, name:'Stoppie'         },
    barrel_roll:     { base:1200, multiplierPerSec:0,  name:'Barrel Roll'     },
    backflip:        { base:1500, multiplierPerSec:0,  name:'Backflip'        },
    frontflip:       { base:1500, multiplierPerSec:0,  name:'Frontflip'       },
    donut:           { base:300,  multiplierPerSec:80, name:'Donut'           },
    power_slide:     { base:150,  multiplierPerSec:40, name:'Power Slide'     },
    near_miss:       { base:500,  multiplierPerSec:0,  name:'Near Miss'       },
    long_jump:       { base:100,  multiplierPerMeter:20, name:'Long Jump'     },
    high_air:        { base:100,  multiplierPerMeter:50, name:'High Air'      },
    two_wheels:      { base:400,  multiplierPerSec:100, name:'Two Wheels'     },
    drift_chain:     { base:200,  multiplierPerChain:300, name:'Drift Chain'  },
    perfect_landing: { base:800,  multiplierPerSec:0,  name:'Perfect Landing' },
    cliff_hanger:    { base:1000, multiplierPerSec:200, name:'Cliff Hanger'  },
    scrape:          { base:100,  multiplierPerMeter:15, name:'Scrape'        },
  };

  // ── Stunt state machine ───────────────────────────────────
  function createStuntState() {
    return {
      active:        {},     // current active stunts
      multiplier:    1.0,
      comboTimer:    0,
      comboCount:    0,
      totalScore:    0,
      lastStunt:     null,
      history:       [],
      driftAngle:    0,
      driftTimer:    0,
      driftChain:    0,
      airTime:       0,
      airHeight:     0,
      airDistance:   0,
      airStartPos:   null,
      rotationAccum: 0,
      wheelieTimer:  0,
      stoppieTimer:  0,
      twoWheelTimer: 0,
      scrapeTimer:   0,
      donutAngle:    0,
      cliffTimer:    0,
    };
  }

  // ── Wheelie detection ─────────────────────────────────────
  function detectWheelie(vehicle, dt) {
    const frContact = vehicle.frontWheelContact !== false;
    const rrContact = vehicle.rearWheelContact  !== false;
    const angle     = vehicle.angle || 0;
    const speedOK   = vehicle.speed > 3;
    return !frContact && rrContact && angle > 0.05 && speedOK;
  }

  function detectStoppie(vehicle, dt) {
    const frContact = vehicle.frontWheelContact !== false;
    const rrContact = vehicle.rearWheelContact  !== false;
    const angle     = vehicle.angle || 0;
    const speedOK   = vehicle.speed > 5;
    return frContact && !rrContact && angle < -0.05 && speedOK;
  }

  // ── Flip detection ────────────────────────────────────────
  function detectFlipType(prevAngle, currAngle, airTime) {
    if (airTime < 0.3) return null;
    const delta = currAngle - prevAngle;
    const wrappedDelta = ((delta + Math.PI) % (2 * Math.PI)) - Math.PI;
    const fullRotations = Math.abs(wrappedDelta) / (2 * Math.PI);
    if (fullRotations < 0.85) return null;
    return wrappedDelta > 0 ? STUNT.BACKFLIP : STUNT.FRONTFLIP;
  }

  // ── Barrel roll ───────────────────────────────────────────
  function detectBarrelRoll(vehicle, rotationAccum, airTime) {
    if (airTime < 0.5) return false;
    const fullRotations = Math.abs(rotationAccum) / (2 * Math.PI);
    return fullRotations >= 0.9;
  }

  // ── Donut detection ───────────────────────────────────────
  function detectDonut(vehicle, stuntState, dt) {
    const yawRate = vehicle.yawRate || 0;
    const speed   = vehicle.speed   || 0;
    const slip    = vehicle.lateralSlip || 0;
    if (Math.abs(yawRate) > 1.5 && speed < 15 && Math.abs(slip) > 0.3) {
      stuntState.donutAngle += Math.abs(yawRate) * dt;
      return stuntState.donutAngle > Math.PI * 2;
    }
    stuntState.donutAngle *= 0.9;
    return false;
  }

  // ── Drift chain detection ─────────────────────────────────
  function updateDriftChain(stuntState, vehicle, dt) {
    const slip = vehicle.lateralSlip || 0;
    if (Math.abs(slip) > 0.20 && vehicle.speed > 5) {
      stuntState.driftTimer += dt;
      if (stuntState.driftTimer > 0.5) {
        stuntState.active[STUNT.POWER_SLIDE] = {
          timer: stuntState.driftTimer,
          score: STUNT_BASE_SCORES.power_slide.base + stuntState.driftTimer * STUNT_BASE_SCORES.power_slide.multiplierPerSec,
        };
      }
    } else {
      if (stuntState.driftTimer > 1.0) {
        stuntState.driftChain++;
        finishStunt(stuntState, STUNT.DRIFT_CHAIN, { chain: stuntState.driftChain });
      }
      stuntState.driftTimer = 0;
      delete stuntState.active[STUNT.POWER_SLIDE];
    }
  }

  // ── Near miss detection ───────────────────────────────────
  function detectNearMiss(vehiclePos, otherPositions, threshold) {
    const th = threshold || 2.5;
    for (const other of otherPositions) {
      const d = Math.sqrt((vehiclePos.x-other.x)**2 + (vehiclePos.y-other.y)**2);
      if (d < th) return { detected: true, distance: d, threat: other };
    }
    return { detected: false };
  }

  // ── Scrape detection (side grind) ────────────────────────
  function detectScrape(vehicle, surfaceContact) {
    const sideContact = surfaceContact && surfaceContact.side;
    const speed = vehicle.speed || 0;
    return sideContact && speed > 2;
  }

  // ── Two-wheel detection ───────────────────────────────────
  function detectTwoWheels(vehicle) {
    const FL = vehicle.wheelFL_contact !== false;
    const FR = vehicle.wheelFR_contact !== false;
    const RL = vehicle.wheelRL_contact !== false;
    const RR = vehicle.wheelRR_contact !== false;
    const contacts = [FL,FR,RL,RR].filter(Boolean).length;
    const lateralLean = Math.abs(vehicle.rollAngle || 0) > 0.15;
    return contacts === 2 && lateralLean;
  }

  // ── Landing quality ───────────────────────────────────────
  function landingQuality(vehicle, airTime, airHeight) {
    const angle    = Math.abs(vehicle.angle || 0);
    const speed    = vehicle.speed || 0;
    const landAngle= angle % (2 * Math.PI);
    const flat     = landAngle < 0.15 || landAngle > (2 * Math.PI - 0.15);
    const impact   = vehicle.landingImpact || 0;
    let quality = 'rough';
    let bonus   = 0;
    if (flat && impact < 5) {
      quality = 'perfect';
      bonus   = STUNT_BASE_SCORES.perfect_landing.base + airTime * 100;
    } else if (landAngle < 0.30 && impact < 10) {
      quality = 'good';
      bonus   = 300;
    } else {
      quality = 'rough';
      bonus   = 50;
    }
    return { quality, bonus, airTime, airHeight };
  }

  // ── Finish a stunt and award points ──────────────────────
  function finishStunt(stuntState, stuntType, data) {
    const cfg = STUNT_BASE_SCORES[stuntType];
    if (!cfg) return;
    let score = cfg.base;
    if (data && data.duration) score += data.duration * (cfg.multiplierPerSec || 0);
    if (data && data.distance) score += data.distance * (cfg.multiplierPerMeter || 0);
    if (data && data.chain)    score += data.chain    * (cfg.multiplierPerChain || 0);
    score *= stuntState.multiplier;
    stuntState.totalScore += Math.round(score);
    stuntState.comboCount++;
    stuntState.comboTimer = 3.0;
    stuntState.multiplier = Math.min(8, 1 + stuntState.comboCount * 0.3);
    stuntState.lastStunt  = { type: stuntType, name: cfg.name, score: Math.round(score) };
    stuntState.history.push(stuntState.lastStunt);
    if (stuntState.history.length > 50) stuntState.history.shift();
    delete stuntState.active[stuntType];
    return Math.round(score);
  }

  // ── Main stunt update step ────────────────────────────────
  function stepStunts(stuntState, vehicle, physics, others, dt) {
    // Combo timer decay
    if (stuntState.comboTimer > 0) {
      stuntState.comboTimer -= dt;
      if (stuntState.comboTimer <= 0) {
        stuntState.multiplier = 1.0;
        stuntState.comboCount = 0;
      }
    }

    const onGround = vehicle.onGround !== false;

    // Airborne tracking
    if (!onGround) {
      const prevPos = stuntState.airStartPos || vehicle.position;
      if (!stuntState.airStartPos) stuntState.airStartPos = { ...vehicle.position };
      stuntState.airTime     += dt;
      stuntState.airHeight    = Math.max(stuntState.airHeight, vehicle.position.y - stuntState.airStartPos.y);
      stuntState.airDistance  = Math.sqrt(
        (vehicle.position.x - stuntState.airStartPos.x)**2 +
        (vehicle.position.y - stuntState.airStartPos.y)**2
      );
      stuntState.rotationAccum += (vehicle.angularVel || 0) * dt;
    } else {
      if (stuntState.airTime > 0.5) {
        const landing = landingQuality(vehicle, stuntState.airTime, stuntState.airHeight);
        if (landing.quality === 'perfect') finishStunt(stuntState, STUNT.PERFECT_LANDING, {});
        if (stuntState.airDistance > 15) {
          finishStunt(stuntState, STUNT.LONG_JUMP, { distance: stuntState.airDistance });
        }
        if (stuntState.airHeight > 5) {
          finishStunt(stuntState, STUNT.HIGH_AIR, { distance: stuntState.airHeight });
        }
        const flipType = detectFlipType(stuntState.prevAngle, vehicle.angle, stuntState.airTime);
        if (flipType) finishStunt(stuntState, flipType, { duration: stuntState.airTime });
        if (detectBarrelRoll(vehicle, stuntState.rotationAccum, stuntState.airTime)) {
          finishStunt(stuntState, STUNT.BARREL_ROLL, {});
        }
      }
      stuntState.airTime       = 0;
      stuntState.airHeight     = 0;
      stuntState.airDistance   = 0;
      stuntState.airStartPos   = null;
      stuntState.rotationAccum = 0;
    }

    stuntState.prevAngle = vehicle.angle;

    // Ground stunts
    if (onGround) {
      if (detectWheelie(vehicle, dt)) {
        stuntState.wheelieTimer += dt;
        stuntState.active[STUNT.WHEELIE] = { timer: stuntState.wheelieTimer };
        if (stuntState.wheelieTimer > 0.5 && stuntState.wheelieTimer % 1 < dt) {
          // Award incrementally per second
        }
      } else if (stuntState.wheelieTimer > 0.5) {
        finishStunt(stuntState, STUNT.WHEELIE, { duration: stuntState.wheelieTimer });
        stuntState.wheelieTimer = 0;
      } else { stuntState.wheelieTimer = 0; }

      if (detectStoppie(vehicle, dt)) {
        stuntState.stoppieTimer += dt;
        stuntState.active[STUNT.STOPPIE] = { timer: stuntState.stoppieTimer };
      } else if (stuntState.stoppieTimer > 0.4) {
        finishStunt(stuntState, STUNT.STOPPIE, { duration: stuntState.stoppieTimer });
        stuntState.stoppieTimer = 0;
      } else { stuntState.stoppieTimer = 0; }

      if (detectTwoWheels(vehicle)) {
        stuntState.twoWheelTimer += dt;
        stuntState.active[STUNT.TWO_WHEELS] = { timer: stuntState.twoWheelTimer };
      } else if (stuntState.twoWheelTimer > 0.5) {
        finishStunt(stuntState, STUNT.TWO_WHEELS, { duration: stuntState.twoWheelTimer });
        stuntState.twoWheelTimer = 0;
      } else { stuntState.twoWheelTimer = 0; }
    }

    // Near miss
    if (others) {
      const nm = detectNearMiss(vehicle.position, others.map(o => o.position), 2.5);
      if (nm.detected) finishStunt(stuntState, STUNT.NEAR_MISS, {});
    }

    // Drift
    updateDriftChain(stuntState, vehicle, dt);

    // Donut
    if (detectDonut(vehicle, stuntState, dt)) {
      finishStunt(stuntState, STUNT.DONUT, { duration: 1 });
      stuntState.donutAngle = 0;
    }

    return {
      active:      Object.keys(stuntState.active),
      multiplier:  stuntState.multiplier,
      comboCount:  stuntState.comboCount,
      totalScore:  stuntState.totalScore,
      lastStunt:   stuntState.lastStunt,
    };
  }

  return {
    STUNT, STUNT_BASE_SCORES,
    createStuntState, stepStunts,
    detectWheelie, detectStoppie, detectFlipType, detectBarrelRoll,
    detectDonut, updateDriftChain, detectNearMiss, detectScrape,
    detectTwoWheels, landingQuality, finishStunt,
  };
})();


// ============================================================
// PHYSICS_TUNING_AI — Automated setup optimizer
// ============================================================
const PHYSICS_TUNING_AI = (() => {
  'use strict';

  // ── Objective function types ──────────────────────────────
  const OBJECTIVES = {
    LAPTIME:    'laptime',
    STABILITY:  'stability',
    TRACTION:   'traction',
    BALANCE:    'balance',
    OFFROAD:    'offroad',
    COMFORT:    'comfort',
  };

  // ── Parameter space ───────────────────────────────────────
  function createParamSpace(category, params) {
    const space = [];
    for (const [name, range] of Object.entries(params)) {
      space.push({ name, min: range.min, max: range.max, current: range.default });
    }
    return space;
  }

  // ── Ahmeting optimizer ───────────────────────────────
  function createHillClimber(paramSpace, stepSize) {
    return {
      params: paramSpace.map(p => ({ ...p })),
      step:   stepSize || 0.05,
      bestScore: -Infinity,
      bestParams: paramSpace.map(p => p.current),
      iteration: 0,
    };
  }

  function hillClimbStep(climber, scoreFn) {
    climber.iteration++;
    const base = scoreFn(climber.params.map(p => p.current));
    if (base > climber.bestScore) {
      climber.bestScore  = base;
      climber.bestParams = climber.params.map(p => p.current);
    }
    // Try each dimension
    for (let i = 0; i < climber.params.length; i++) {
      const p     = climber.params[i];
      const delta = (p.max - p.min) * climber.step;
      for (const sign of [1, -1]) {
        const newVal = Math.max(p.min, Math.min(p.max, p.current + sign * delta));
        const oldVal = p.current;
        p.current    = newVal;
        const score  = scoreFn(climber.params.map(q => q.current));
        if (score > climber.bestScore) {
          climber.bestScore  = score;
          climber.bestParams = climber.params.map(q => q.current);
        } else {
          p.current = oldVal;
        }
      }
    }
    // Reduce step over time
    if (climber.iteration % 10 === 0) climber.step *= 0.95;
    return { iteration: climber.iteration, bestScore: climber.bestScore, bestParams: climber.bestParams };
  }

  // ── Genetic algorithm ─────────────────────────────────────
  function createGeneticOpt(paramSpace, popSize, rng) {
    const rand = rng || Math.random.bind(Math);
    const population = [];
    for (let i = 0; i < (popSize || 20); i++) {
      population.push(paramSpace.map(p => p.min + rand() * (p.max - p.min)));
    }
    return { population, fitnesses: [], generation: 0, bestIdx: 0, rng: rand };
  }

  function geneticStep(ga, scoreFn, mutationRate) {
    ga.generation++;
    ga.fitnesses = ga.population.map(ind => scoreFn(ind));
    const bestScore = Math.max(...ga.fitnesses);
    ga.bestIdx = ga.fitnesses.indexOf(bestScore);

    // Selection + crossover
    const newPop = [ga.population[ga.bestIdx]]; // elitism
    while (newPop.length < ga.population.length) {
      const parentA = tournamentSelect(ga.population, ga.fitnesses, 3, ga.rng);
      const parentB = tournamentSelect(ga.population, ga.fitnesses, 3, ga.rng);
      const child   = uniformCrossover(parentA, parentB, ga.rng);
      const mutated = mutate(child, 0.01, mutationRate || 0.15, ga.rng);
      newPop.push(mutated);
    }
    ga.population = newPop;
    return { generation: ga.generation, bestScore, bestParams: ga.population[ga.bestIdx] };
  }

  function tournamentSelect(pop, fits, k, rng) {
    let best = Math.floor(rng() * pop.length);
    for (let i = 1; i < k; i++) {
      const idx = Math.floor(rng() * pop.length);
      if (fits[idx] > fits[best]) best = idx;
    }
    return pop[best];
  }

  function uniformCrossover(a, b, rng) {
    return a.map((v, i) => rng() > 0.5 ? v : b[i]);
  }

  function mutate(ind, delta, rate, rng) {
    return ind.map(v => rng() < rate ? v + (rng() - 0.5) * 2 * delta : v);
  }

  // ── Simulated annealing ───────────────────────────────────
  function createSimulatedAnnealing(paramSpace, tempStart) {
    return {
      params:    paramSpace.map(p => p.current),
      paramSpace,
      temp:      tempStart || 1000,
      cooling:   0.995,
      bestScore: -Infinity,
      bestParams:paramSpace.map(p => p.current),
      iteration: 0,
    };
  }

  function saStep(sa, scoreFn, rng) {
    sa.iteration++;
    const rand   = rng || Math.random.bind(Math);
    const curScore = scoreFn(sa.params);

    // Generate neighbor
    const i      = Math.floor(rand() * sa.params.length);
    const p      = sa.paramSpace[i];
    const delta  = (p.max - p.min) * 0.05 * (rand() - 0.5);
    const neighbor= [...sa.params];
    neighbor[i]  = Math.max(p.min, Math.min(p.max, neighbor[i] + delta));

    const newScore = scoreFn(neighbor);
    const dS       = newScore - curScore;

    if (dS > 0 || rand() < Math.exp(dS / (sa.temp || 1))) {
      sa.params = neighbor;
      if (newScore > sa.bestScore) {
        sa.bestScore  = newScore;
        sa.bestParams = [...neighbor];
      }
    }
    sa.temp *= sa.cooling;
    return { iteration: sa.iteration, temp: sa.temp, bestScore: sa.bestScore, bestParams: sa.bestParams };
  }

  // ── Multi-objective Pareto front ──────────────────────────
  function paretoFront(solutions, objectives) {
    const dominated = new Array(solutions.length).fill(false);
    for (let i = 0; i < solutions.length; i++) {
      for (let j = 0; j < solutions.length; j++) {
        if (i === j) continue;
        if (dominates(solutions[j].scores, solutions[i].scores)) {
          dominated[i] = true; break;
        }
      }
    }
    return solutions.filter((_, i) => !dominated[i]);
  }

  function dominates(a, b) {
    return a.every((v, i) => v >= b[i]) && a.some((v, i) => v > b[i]);
  }

  // ── Score model for lap time optimization ─────────────────
  function laptimeScore(params, trackProfile) {
    // Simplified model: balance cornering vs. straight-line vs. stability
    const stiffF   = params[0] || 50000;
    const stiffR   = params[1] || 50000;
    const camberF  = params[2] || -2;
    const arb      = params[3] || 20000;
    const aeroF    = params[4] || 5;
    const aeroR    = params[5] || 8;

    const cornerScore = (Math.abs(camberF) / 4 * 0.3) + (arb / 40000 * 0.2);
    const aeroBal     = 1 - Math.abs(aeroF / aeroR - 0.45);
    const stability   = (stiffF + stiffR) / 200000;
    return cornerScore + aeroBal * 0.3 + stability * 0.2;
  }

  // ── Parameter sensitivity analysis ───────────────────────
  function sensitivityAnalysis(params, scoreFn, delta) {
    const base = scoreFn(params);
    const d    = delta || 0.01;
    return params.map((v, i) => {
      const hi = [...params]; hi[i] = v + d;
      const lo = [...params]; lo[i] = v - d;
      return { index: i, sensitivity: (scoreFn(hi) - scoreFn(lo)) / (2 * d) };
    }).sort((a, b) => Math.abs(b.sensitivity) - Math.abs(a.sensitivity));
  }

  return {
    OBJECTIVES,
    createParamSpace,
    createHillClimber, hillClimbStep,
    createGeneticOpt, geneticStep, tournamentSelect, uniformCrossover, mutate,
    createSimulatedAnnealing, saStep,
    paretoFront, dominates, laptimeScore, sensitivityAnalysis,
  };
})();

// ============================================================
// PHYSICS_CONSTANTS_EXT — Additional physics constants and unit
//   conversion utilities
// ============================================================
const PHYSICS_CONSTANTS_EXT = (() => {
  'use strict';

  const C = {
    // Fundamental
    G:           6.674e-11,   // gravitational constant
    GRAVITY_SL:  9.80665,     // standard gravity m/s²
    R_AIR:       287.058,     // specific gas constant for air J/(kg·K)
    GAMMA_AIR:   1.4,         // adiabatic index air
    SB:          5.6704e-8,   // Stefan-Boltzmann W/(m²·K⁴)
    AVOGADRO:    6.022e23,
    BOLTZMANN:   1.38e-23,

    // Fluid
    RHO_AIR_SL:  1.225,       // kg/m³ sea level 15°C
    RHO_WATER:   1000,
    RHO_SEA:     1025,
    MU_AIR:      1.81e-5,     // dynamic viscosity Pa·s
    MU_WATER:    1.00e-3,
    SOUND_AIR:   343,         // m/s at 20°C
    SOUND_WATER: 1484,

    // Thermal
    CP_AIR:      1005,        // J/(kg·K)
    CP_WATER:    4182,
    K_AIR:       0.0257,      // thermal conductivity W/(m·K)
    K_WATER:     0.598,
    T_STD:       288.15,      // K standard temperature
    P_STD:       101325,      // Pa standard pressure

    // Vehicle-specific
    G_EARTH:     9.81,
    G_MOON:      1.62,
    G_MARS:      3.72,
    TIRE_PRESSURE_NOM: 220000, // Pa 32psi
    FUEL_ENERGY_PETROL: 32e6,  // J/L
    FUEL_ENERGY_DIESEL: 35e6,
    FUEL_DENSITY_PETROL: 750,  // kg/m³
    FUEL_DENSITY_DIESEL: 840,

    // Conversions
    KMH_TO_MS:   1/3.6,
    MS_TO_KMH:   3.6,
    MPH_TO_MS:   0.44704,
    MS_TO_MPH:   2.23694,
    RPM_TO_RADS: Math.PI/30,
    RADS_TO_RPM: 30/Math.PI,
    DEG_TO_RAD:  Math.PI/180,
    RAD_TO_DEG:  180/Math.PI,
    HP_TO_W:     745.7,
    W_TO_HP:     1/745.7,
    NM_TO_LBFT:  0.73756,
    LBFT_TO_NM:  1.35582,
    KG_TO_LB:    2.20462,
    LB_TO_KG:    0.453592,
    M_TO_FEET:   3.28084,
    FEET_TO_M:   0.3048,
    PSI_TO_PA:   6894.76,
    PA_TO_PSI:   1/6894.76,
    BAR_TO_PA:   100000,
    PA_TO_BAR:   1e-5,
    ATM_TO_PA:   101325,
    L_TO_M3:     0.001,
    M3_TO_L:     1000,
  };

  // ── Unit converters ───────────────────────────────────────
  const UNIT = {
    speed:       (v, from, to) => convertSpeed(v, from, to),
    force:       (v, from, to) => convertForce(v, from, to),
    pressure:    (v, from, to) => convertPressure(v, from, to),
    power:       (v, from, to) => convertPower(v, from, to),
    torque:      (v, from, to) => convertTorque(v, from, to),
    temperature: (v, from, to) => convertTemp(v, from, to),
    mass:        (v, from, to) => convertMass(v, from, to),
    length:      (v, from, to) => convertLength(v, from, to),
  };

  function convertSpeed(v, from, to) {
    const toMS = { ms:1, kmh:C.KMH_TO_MS, mph:C.MPH_TO_MS };
    const ms   = v * (toMS[from] || 1);
    return ms / (toMS[to] || 1);
  }

  function convertForce(v, from, to) {
    const toN = { N:1, kN:1000, lbf:4.44822 };
    return v * (toN[from] || 1) / (toN[to] || 1);
  }

  function convertPressure(v, from, to) {
    const toPa = { Pa:1, kPa:1000, MPa:1e6, bar:C.BAR_TO_PA, psi:C.PSI_TO_PA, atm:C.ATM_TO_PA };
    return v * (toPa[from] || 1) / (toPa[to] || 1);
  }

  function convertPower(v, from, to) {
    const toW = { W:1, kW:1000, MW:1e6, hp:C.HP_TO_W, PS:735.5 };
    return v * (toW[from] || 1) / (toW[to] || 1);
  }

  function convertTorque(v, from, to) {
    const toNm = { Nm:1, kNm:1000, 'lb-ft':C.LBFT_TO_NM };
    return v * (toNm[from] || 1) / (toNm[to] || 1);
  }

  function convertTemp(v, from, to) {
    let kelvin;
    if      (from === 'K')  kelvin = v;
    else if (from === 'C')  kelvin = v + 273.15;
    else if (from === 'F')  kelvin = (v - 32) * 5/9 + 273.15;
    else                    kelvin = v;
    if      (to === 'K')    return kelvin;
    else if (to === 'C')    return kelvin - 273.15;
    else if (to === 'F')    return (kelvin - 273.15) * 9/5 + 32;
    return kelvin;
  }

  function convertMass(v, from, to) {
    const toKg = { kg:1, g:0.001, t:1000, lb:C.LB_TO_KG, oz:0.02835 };
    return v * (toKg[from] || 1) / (toKg[to] || 1);
  }

  function convertLength(v, from, to) {
    const toM = { m:1, km:1000, cm:0.01, mm:0.001, ft:C.FEET_TO_M, in:0.0254, mi:1609.34 };
    return v * (toM[from] || 1) / (toM[to] || 1);
  }

  // ── Dimensional analysis helpers ──────────────────────────
  function kineticEnergy(mass, speed)   { return 0.5 * mass * speed * speed; }
  function potentialEnergy(mass, h)     { return mass * C.G_EARTH * h; }
  function momentum(mass, speed)        { return mass * speed; }
  function impulse(force, time)         { return force * time; }
  function centripetaForce(mass, speed, radius) { return mass * speed * speed / radius; }
  function dynamicPressure(rho, speed)  { return 0.5 * rho * speed * speed; }
  function reynoldsNumber(rho, v, L, mu){ return rho * v * L / mu; }
  function macherNumber(speed)          { return speed / C.SOUND_AIR; }
  function froudeNumber(speed, length)  { return speed / Math.sqrt(C.G_EARTH * length); }

  return {
    C, UNIT,
    convertSpeed, convertForce, convertPressure, convertPower,
    convertTorque, convertTemp, convertMass, convertLength,
    kineticEnergy, potentialEnergy, momentum, impulse,
    centripetaForce, dynamicPressure, reynoldsNumber, macherNumber, froudeNumber,
  };
})();


// ============================================================
// VEHICLE_DYNAMICS_DATA — Large lookup table database for vehicle
//   performance data, map configurations, and track profiles
// ============================================================
const VEHICLE_DYNAMICS_DATA = (() => {
  'use strict';

  // ── Engine performance maps (RPM → torque in Nm) ─────────
  const ENGINE_MAPS = {
    // I4 naturally aspirated 1.6L
    i4_na_1600: {
      rpm:    [800,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6500,7000],
      torque: [ 80,  95, 118, 132, 145, 152, 158, 162, 163, 160, 154, 142, 118,  85],
      power:  [  7,  10,  18,  28,  38,  48,  58,  68,  77,  84,  89,  89,  80,  62],
    },
    // I4 turbocharged 2.0L
    i4_turbo_2000: {
      rpm:    [800,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6500],
      torque: [ 90, 110, 200, 320, 370, 370, 370, 360, 340, 310, 275, 230, 175],
      power:  [  8,  12,  31,  67, 97, 116, 135, 150, 160, 162, 158, 144, 119],
    },
    // V6 naturally aspirated 3.5L
    v6_na_3500: {
      rpm:    [800,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6500],
      torque: [120, 145, 230, 300, 340, 360, 370, 373, 370, 360, 340, 305, 250],
      power:  [ 10,  15,  36,  63,  89, 113, 135, 156, 174, 188, 196, 191, 170],
    },
    // V8 naturally aspirated 5.0L
    v8_na_5000: {
      rpm:    [800,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6500],
      torque: [200, 240, 380, 480, 540, 570, 580, 585, 580, 570, 545, 490, 390],
      power:  [ 17,  25,  60, 100, 141, 179, 212, 245, 273, 298, 314, 307, 265],
    },
    // V8 supercharged 6.2L
    v8_sc_6200: {
      rpm:    [800,1000,1500,2000,2500,3000,3500,4000,4500,5000,5500,6000,6500],
      torque: [250, 310, 500, 650, 750, 820, 850, 850, 830, 800, 750, 670, 540],
      power:  [ 21,  32,  78, 136, 196, 257, 311, 355, 390, 418, 432, 421, 367],
    },
    // Electric motor high perf
    electric_motor_280kw: {
      rpm:    [0, 500,1000,2000,3000,4000,5000,6000,7000,8000,9000,10000,12000],
      torque: [650,650, 640, 620, 590, 560, 530, 495, 455, 410, 360,  300,  210],
      power:  [  0,  34,  67, 130, 185, 234, 277, 311, 334, 343, 340,  314,  264],
    },
    // Small diesel 2.0L
    diesel_2000_tdi: {
      rpm:    [800,1000,1200,1500,2000,2500,3000,3500,4000,4500],
      torque: [100, 140, 200, 330, 400, 420, 410, 390, 350, 280],
      power:  [  8,  15,  25,  52,  84, 110, 129, 143, 147, 132],
    },
    // Formula 1 style hybrid
    formula_hybrid_1600: {
      rpm:    [5000,6000,7000,8000,9000,10000,11000,12000,13000,14000,15000],
      torque: [ 340, 355, 365, 372, 376,  375,  365,  348,  320,  280,  225],
      power:  [ 178, 223, 267, 312, 355,  393,  420,  437,  435,  410,  353],
    },
  };

  // ── Interpolate torque at rpm ─────────────────────────────
  function interpolateTorque(mapName, rpm) {
    const map = ENGINE_MAPS[mapName];
    if (!map) return 0;
    const rArr = map.rpm, tArr = map.torque;
    if (rpm <= rArr[0]) return tArr[0];
    if (rpm >= rArr[rArr.length-1]) return tArr[tArr.length-1];
    for (let i = 1; i < rArr.length; i++) {
      if (rpm <= rArr[i]) {
        const t = (rpm - rArr[i-1]) / (rArr[i] - rArr[i-1]);
        return tArr[i-1] + t * (tArr[i] - tArr[i-1]);
      }
    }
    return 0;
  }

  // ── Track profiles (simplified segments) ─────────────────
  const TRACK_PROFILES = {
    city_sprint: {
      length: 1850,
      segments: [
        {type:'straight',  length:200, width:10, surface:'asphalt', maxSpeed:120},
        {type:'corner',    radius:25,  length:45, surface:'asphalt', maxSpeed:45},
        {type:'straight',  length:150, width:9,  surface:'asphalt', maxSpeed:110},
        {type:'chicane',   length:80,  width:8,  surface:'asphalt', maxSpeed:60},
        {type:'straight',  length:180, width:10, surface:'asphalt', maxSpeed:130},
        {type:'hairpin',   radius:12,  length:40, surface:'asphalt', maxSpeed:30},
        {type:'straight',  length:220, width:10, surface:'asphalt', maxSpeed:140},
        {type:'corner',    radius:40,  length:65, surface:'asphalt', maxSpeed:65},
        {type:'straight',  length:160, width:9,  surface:'asphalt', maxSpeed:120},
        {type:'corner',    radius:30,  length:52, surface:'asphalt', maxSpeed:55},
        {type:'straight',  length:350, width:12, surface:'asphalt', maxSpeed:160},
        {type:'hairpin',   radius:15,  length:48, surface:'asphalt', maxSpeed:35},
        {type:'straight',  length:210, width:10, surface:'asphalt', maxSpeed:125},
      ],
    },
    mountain_pass: {
      length: 4200,
      segments: [
        {type:'straight',  length:300, width:7,  surface:'asphalt', maxSpeed:100, gradient: 0.08},
        {type:'corner',    radius:60,  length:100, surface:'asphalt', maxSpeed:70, gradient:0.06},
        {type:'straight',  length:250, width:7,  surface:'asphalt', maxSpeed:110, gradient:0.05},
        {type:'hairpin',   radius:10,  length:36, surface:'asphalt', maxSpeed:25, gradient:0.12},
        {type:'straight',  length:180, width:6,  surface:'gravel',   maxSpeed:70, gradient:0.04},
        {type:'corner',    radius:35,  length:58, surface:'gravel',   maxSpeed:45, gradient:0.03},
        {type:'straight',  length:400, width:7,  surface:'asphalt', maxSpeed:130, gradient:-0.05},
        {type:'corner',    radius:50,  length:82, surface:'asphalt', maxSpeed:60, gradient:-0.06},
        {type:'straight',  length:500, width:8,  surface:'asphalt', maxSpeed:150, gradient:-0.07},
        {type:'hairpin',   radius:12,  length:40, surface:'asphalt', maxSpeed:28, gradient:-0.10},
        {type:'straight',  length:350, width:7,  surface:'asphalt', maxSpeed:120, gradient:-0.04},
        {type:'corner',    radius:45,  length:74, surface:'asphalt', maxSpeed:55, gradient:-0.03},
        {type:'straight',  length:600, width:9,  surface:'asphalt', maxSpeed:160, gradient:0.02},
        {type:'hairpin',   radius:8,   length:30, surface:'asphalt', maxSpeed:20, gradient:0.08},
        {type:'straight',  length:430, width:7,  surface:'asphalt', maxSpeed:140, gradient:0.03},
      ],
    },
    off_road_circuit: {
      length: 3500,
      segments: [
        {type:'straight',  length:150, width:15, surface:'dirt_dry',  maxSpeed:80},
        {type:'corner',    radius:30,  length:50, surface:'dirt_wet',  maxSpeed:40},
        {type:'jump',      length:30,  airTime:1.2, surface:'dirt_dry', maxSpeed:70},
        {type:'straight',  length:200, width:14, surface:'mud_soft',  maxSpeed:45},
        {type:'corner',    radius:20,  length:36, surface:'mud_soft',  maxSpeed:28},
        {type:'straight',  length:180, width:12, surface:'gravel_wet',maxSpeed:65},
        {type:'water',     length:40,  depth:0.6, surface:'water_shallow',maxSpeed:25},
        {type:'straight',  length:250, width:15, surface:'sand_dry',  maxSpeed:60},
        {type:'dune',      height:3.5, length:60, surface:'sand_dry', maxSpeed:55},
        {type:'straight',  length:180, width:13, surface:'dirt_dry',  maxSpeed:75},
        {type:'rocks',     length:100, surface:'rock_loose',           maxSpeed:20},
        {type:'straight',  length:300, width:16, surface:'grass_dry', maxSpeed:70},
        {type:'corner',    radius:35,  length:58, surface:'grass_wet', maxSpeed:35},
        {type:'straight',  length:400, width:18, surface:'dirt_dry',  maxSpeed:85},
        {type:'hairpin',   radius:15,  length:48, surface:'gravel_dry',maxSpeed:30},
        {type:'straight',  length:200, width:14, surface:'dirt_dry',  maxSpeed:75},
        {type:'uphill',    gradient:0.18, length:120, surface:'dirt_dry',maxSpeed:40},
        {type:'straight',  length:240, width:15, surface:'dirt_dry',  maxSpeed:80},
      ],
    },
    beach_race: {
      length: 2800,
      segments: [
        {type:'straight',  length:400, width:20, surface:'sand_wet',  maxSpeed:75},
        {type:'wave',      length:50,  amplitude:0.3, surface:'water_shallow',maxSpeed:35},
        {type:'straight',  length:300, width:18, surface:'sand_dry',  maxSpeed:65},
        {type:'corner',    radius:50,  length:82, surface:'sand_wet',  maxSpeed:45},
        {type:'straight',  length:250, width:16, surface:'sand_dry',  maxSpeed:70},
        {type:'water',     length:60,  depth:0.4, surface:'water_shallow',maxSpeed:30},
        {type:'straight',  length:350, width:20, surface:'sand_dry',  maxSpeed:72},
        {type:'corner',    radius:35,  length:58, surface:'sand_wet',  maxSpeed:38},
        {type:'straight',  length:450, width:22, surface:'sand_dry',  maxSpeed:80},
        {type:'wave',      length:80,  amplitude:0.5, surface:'water_shallow',maxSpeed:28},
        {type:'straight',  length:260, width:18, surface:'sand_wet',  maxSpeed:68},
        {type:'corner',    radius:45,  length:74, surface:'sand_dry',  maxSpeed:42},
        {type:'straight',  length:300, width:20, surface:'sand_dry',  maxSpeed:75},
      ],
    },
  };

  // ── Vehicle performance benchmarks ───────────────────────
  const PERFORMANCE_BENCHMARKS = {
    // [0-100 kmh (s), top_speed (kmh), 0-200 kmh (s), braking 100-0 (m), lap_nurburgring (min)]
    city_hatchback:   { acc0100: 10.2, topSpeed: 185, acc0200: null, brake100: 42, grip: 0.82 },
    sport_compact:    { acc0100:  7.5, topSpeed: 220, acc0200: 26.0, brake100: 38, grip: 0.95 },
    hot_hatch:        { acc0100:  6.0, topSpeed: 245, acc0200: 19.5, brake100: 35, grip: 1.05 },
    sports_car:       { acc0100:  4.5, topSpeed: 280, acc0200: 13.0, brake100: 32, grip: 1.15 },
    super_car:        { acc0100:  3.0, topSpeed: 330, acc0200:  8.5, brake100: 28, grip: 1.35 },
    hyper_car:        { acc0100:  2.3, topSpeed: 400, acc0200:  5.8, brake100: 24, grip: 1.55 },
    muscle_car:       { acc0100:  4.2, topSpeed: 275, acc0200: 12.0, brake100: 36, grip: 1.05 },
    pickup_truck:     { acc0100:  8.5, topSpeed: 180, acc0200: null, brake100: 48, grip: 0.78 },
    suv_compact:      { acc0100:  9.8, topSpeed: 185, acc0200: null, brake100: 44, grip: 0.80 },
    suv_sport:        { acc0100:  6.5, topSpeed: 240, acc0200: 22.0, brake100: 38, grip: 0.92 },
    rally_car:        { acc0100:  4.0, topSpeed: 200, acc0200: 11.5, brake100: 30, grip: 1.05 },
    offroad_buggy:    { acc0100:  5.5, topSpeed: 160, acc0200: null, brake100: 38, grip: 0.75 },
    monster_truck:    { acc0100: 12.0, topSpeed: 100, acc0200: null, brake100: 65, grip: 0.70 },
    formula_car:      { acc0100:  2.0, topSpeed: 370, acc0200:  4.5, brake100: 18, grip: 2.50 },
    gt_race:          { acc0100:  3.5, topSpeed: 310, acc0200:  7.5, brake100: 22, grip: 1.80 },
    drag_car:         { acc0100:  2.5, topSpeed: 350, acc0200:  6.0, brake100: 35, grip: 1.60 },
    drift_car:        { acc0100:  4.8, topSpeed: 260, acc0200: 15.0, brake100: 33, grip: 1.10 },
    electric_sport:   { acc0100:  2.9, topSpeed: 320, acc0200:  8.0, brake100: 30, grip: 1.25 },
    electric_hyper:   { acc0100:  1.9, topSpeed: 410, acc0200:  4.2, brake100: 23, grip: 1.60 },
    motocross_bike:   { acc0100:  4.8, topSpeed: 175, acc0200: null, brake100: 28, grip: 0.95 },
    go_kart:          { acc0100:  4.5, topSpeed: 130, acc0200: null, brake100: 22, grip: 1.80 },
  };

  // ── Aerodynamic coefficient map by speed ─────────────────
  const AERO_SPEED_MAPS = {
    super_car_highDF: {
      speedKmh: [0,  50,  100, 150, 200, 250, 300],
      CdxA:     [0.7, 0.72,0.75,0.79,0.84,0.90,0.98],
      ClxA_F:   [0, -0.12,-0.48,-1.10,-1.95,-3.05,-4.40],
      ClxA_R:   [0, -0.20,-0.80,-1.80,-3.20,-5.00,-7.20],
    },
    sports_car_lowDF: {
      speedKmh: [0,  50,  100, 150, 200, 250, 300],
      CdxA:     [0.55,0.56,0.57,0.59,0.61,0.64,0.67],
      ClxA_F:   [0, -0.02,-0.08,-0.18,-0.32,-0.50,-0.72],
      ClxA_R:   [0, -0.04,-0.16,-0.36,-0.64,-1.00,-1.44],
    },
  };

  function interpolateAeroMap(mapName, speedKmh, coeff) {
    const map = AERO_SPEED_MAPS[mapName];
    if (!map) return 0;
    const s = map.speedKmh, c = map[coeff];
    if (!c) return 0;
    if (speedKmh <= s[0]) return c[0];
    if (speedKmh >= s[s.length-1]) return c[c.length-1];
    for (let i = 1; i < s.length; i++) {
      if (speedKmh <= s[i]) {
        const t = (speedKmh - s[i-1]) / (s[i] - s[i-1]);
        return c[i-1] + t * (c[i] - c[i-1]);
      }
    }
    return 0;
  }

  return {
    ENGINE_MAPS, TRACK_PROFILES, PERFORMANCE_BENCHMARKS,
    AERO_SPEED_MAPS,
    interpolateTorque, interpolateAeroMap,
  };
})();


// ============================================================
// PHYSICS_SCENARIO_ENGINE — Scenario/challenge physics conditions
// ============================================================
const PHYSICS_SCENARIO_ENGINE = (() => {
  'use strict';

  // ── Scenario types ────────────────────────────────────────
  const SCENARIO_TYPE = {
    TIME_TRIAL:      'time_trial',
    ELIMINATION:     'elimination',
    DRIFT_CHALLENGE: 'drift_challenge',
    STUNT_ARENA:     'stunt_arena',
    ENDURANCE:       'endurance',
    DRAG_RACE:       'drag_race',
    HILL_CLIMB:      'hill_climb',
    BEACH_RACE:      'beach_race',
    MUD_BOG:         'mud_bog',
    MONSTER_JAM:     'monster_jam',
    CIRCUIT_RACE:    'circuit_race',
    RALLY_STAGE:     'rally_stage',
    DEMOLITION:      'demolition',
  };

  // ── Scenario physics conditions ───────────────────────────
  const SCENARIO_CONDITIONS = {
    time_trial: {
      gravity:         9.81, weatherPreset: 'dry', dayTime: true,
      trafficEnabled:  false, restarts: true, ghostEnabled: true,
      nitroEnabled:    true, damageEnabled: false,
    },
    drift_challenge: {
      gravity:         9.81, weatherPreset: 'dry', dayTime: true,
      trafficEnabled:  false, restarts: true, ghostEnabled: false,
      nitroEnabled:    false, damageEnabled: false,
      tireGrip:        0.85, // slightly reduced for drifting
    },
    stunt_arena: {
      gravity:         8.0,  weatherPreset: 'dry', dayTime: true,
      trafficEnabled:  false, restarts: true, ghostEnabled: false,
      nitroEnabled:    true, damageEnabled: false,
      specialRamps:    true, magnets: false,
    },
    mud_bog: {
      gravity:         9.81, weatherPreset: 'heavy_rain', dayTime: false,
      trafficEnabled:  false, restarts: false, ghostEnabled: false,
      nitroEnabled:    true, damageEnabled: true,
      terrainDeform:   true, waterLevel: 0.8,
    },
    demolition: {
      gravity:         9.81, weatherPreset: 'damp', dayTime: true,
      trafficEnabled:  false, restarts: false, ghostEnabled: false,
      nitroEnabled:    false, damageEnabled: true,
      damageMult:      2.0, engineDmgEnabled: true,
    },
    hill_climb: {
      gravity:         9.81, weatherPreset: 'dry', dayTime: true,
      trafficEnabled:  false, restarts: true, ghostEnabled: true,
      nitroEnabled:    true, damageEnabled: false,
      slopeMax:        0.45, // 45% gradient max
    },
    endurance: {
      gravity:         9.81, weatherPreset: 'moderate', dayTime: true,
      trafficEnabled:  false, restarts: false, ghostEnabled: false,
      nitroEnabled:    true, damageEnabled: true,
      fuelEnabled:     true, pitEnabled: true, tireWear: true,
    },
    rally_stage: {
      gravity:         9.81, weatherPreset: 'moderate', dayTime: true,
      trafficEnabled:  false, restarts: false, ghostEnabled: true,
      nitroEnabled:    false, damageEnabled: true,
      codriverEnabled: true, narrowRoads: true,
    },
  };

  // ── Physics modifier per scenario ────────────────────────
  function getScenarioMods(scenarioType) {
    const cond = SCENARIO_CONDITIONS[scenarioType] || SCENARIO_CONDITIONS.time_trial;
    return {
      gravityMult:  cond.gravity / 9.81,
      gripMult:     cond.tireGrip || 1.0,
      damageMult:   cond.damageMult || 1.0,
      fuelEnabled:  !!cond.fuelEnabled,
      tireWear:     !!cond.tireWear,
      terrainDeform:!!cond.terrainDeform,
    };
  }

  // ── Dynamic weather timeline ──────────────────────────────
  function createWeatherTimeline(duration, changes) {
    return {
      duration,
      changes: changes || [],
      currentIdx: 0,
      elapsed: 0,
    };
  }

  function stepWeatherTimeline(timeline, dt) {
    timeline.elapsed += dt;
    while (timeline.currentIdx < timeline.changes.length - 1 &&
           timeline.elapsed >= timeline.changes[timeline.currentIdx + 1].time) {
      timeline.currentIdx++;
    }
    const curr = timeline.changes[timeline.currentIdx];
    const next = timeline.changes[Math.min(timeline.currentIdx + 1, timeline.changes.length - 1)];
    if (!curr) return { preset: 'dry', alpha: 1 };
    const elapsed = timeline.elapsed - curr.time;
    const span    = (next.time - curr.time) || 1;
    const alpha   = Math.max(0, Math.min(1, elapsed / span));
    return { from: curr.preset, to: next.preset, alpha, current: alpha > 0.5 ? next.preset : curr.preset };
  }

  // Example timeline presets
  const WEATHER_TIMELINES = {
    dry_to_wet: {
      duration: 300,
      changes: [
        {time:0,   preset:'dry'},
        {time:120, preset:'damp'},
        {time:200, preset:'light_rain'},
        {time:260, preset:'heavy_rain'},
      ],
    },
    wet_to_dry: {
      duration: 240,
      changes: [
        {time:0,   preset:'heavy_rain'},
        {time:80,  preset:'light_rain'},
        {time:160, preset:'damp'},
        {time:220, preset:'dry'},
      ],
    },
    night_race: {
      duration: 600,
      changes: [
        {time:0,   preset:'dry'},
        {time:100, preset:'dry'},
        {time:200, preset:'fog'},
        {time:350, preset:'dry'},
        {time:500, preset:'damp'},
      ],
    },
  };

  // ── Challenge objectives ──────────────────────────────────
  const CHALLENGE_OBJECTIVES = {
    reach_speed:      { desc:'Reach %v km/h',        eval: (v,t) => v.speed * 3.6 >= t.target },
    maintain_speed:   { desc:'Maintain %v km/h',      eval: (v,t) => v.speed * 3.6 >= t.target },
    lap_in_time:      { desc:'Complete lap in %t sec', eval: (v,t) => v.lapTime <= t.target },
    drift_score:      { desc:'Score %s drift points',  eval: (v,t) => v.driftScore >= t.target },
    stunt_score:      { desc:'Score %s stunt points',  eval: (v,t) => v.stuntScore >= t.target },
    no_damage:        { desc:'Finish without damage',   eval: (v,t) => v.damageIntegrity >= 0.99 },
    survive_time:     { desc:'Survive %t seconds',      eval: (v,t) => v.elapsed >= t.target },
    collect_all:      { desc:'Collect all items',        eval: (v,t) => v.itemsCollected >= t.total },
    beat_ghost:       { desc:'Beat ghost car',           eval: (v,t) => v.lapTime < t.ghostTime },
    laps_clean_3:     { desc:'Complete 3 clean laps',    eval: (v,t) => v.cleanLaps >= 3 },
    reach_checkpoint: { desc:'Reach checkpoint in time', eval: (v,t) => v.checkpointTime <= t.target },
    destroy_targets:  { desc:'Destroy %n targets',       eval: (v,t) => v.destroyed >= t.target },
  };

  // ── Objective evaluator ───────────────────────────────────
  function evaluateObjectives(objectives, vehicleState) {
    const results = [];
    for (const obj of objectives) {
      const def = CHALLENGE_OBJECTIVES[obj.type];
      if (!def) continue;
      const passed = def.eval(vehicleState, obj);
      results.push({ type: obj.type, passed, desc: def.desc });
    }
    const allPassed = results.every(r => r.passed);
    return { results, allPassed, passedCount: results.filter(r => r.passed).length };
  }

  // ── Environmental physics overrides ──────────────────────
  function applyEnvironmentOverrides(physicsConfig, scenario, weatherState) {
    const mods = getScenarioMods(scenario);
    return {
      ...physicsConfig,
      gravity:    physicsConfig.gravity * mods.gravityMult,
      globalGripMult: mods.gripMult * (1 - (weatherState.wetness || 0) * 0.4),
      damageMult: mods.damageMult,
    };
  }

  // ── Scenario timer ────────────────────────────────────────
  function createScenarioTimer(duration) {
    return { duration, elapsed: 0, running: false, finished: false };
  }

  function stepScenarioTimer(timer, dt) {
    if (!timer.running || timer.finished) return timer;
    timer.elapsed += dt;
    if (timer.duration > 0 && timer.elapsed >= timer.duration) {
      timer.finished = true;
      timer.elapsed  = timer.duration;
    }
    return timer;
  }

  function scenarioTimeRemaining(timer) {
    return Math.max(0, timer.duration - timer.elapsed);
  }

  // ── Checkpoint system ─────────────────────────────────────
  function createCheckpointSystem(checkpoints) {
    return {
      points:  checkpoints.map((cp, i) => ({ ...cp, id: i, triggered: false })),
      next:    0,
      missed:  0,
      times:   [],
    };
  }

  function updateCheckpoints(system, vehiclePos, elapsed) {
    if (system.next >= system.points.length) return { complete: true };
    const cp = system.points[system.next];
    const dx = vehiclePos.x - cp.x, dy = vehiclePos.y - cp.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < (cp.radius || 5)) {
      cp.triggered = true;
      system.times.push({ id: cp.id, time: elapsed });
      system.next++;
      return { triggered: true, id: cp.id, nextIdx: system.next, split: elapsed };
    }
    return { triggered: false, distToNext: dist };
  }

  return {
    SCENARIO_TYPE, SCENARIO_CONDITIONS, WEATHER_TIMELINES, CHALLENGE_OBJECTIVES,
    getScenarioMods, createWeatherTimeline, stepWeatherTimeline,
    evaluateObjectives, applyEnvironmentOverrides,
    createScenarioTimer, stepScenarioTimer, scenarioTimeRemaining,
    createCheckpointSystem, updateCheckpoints,
  };
})();


// ============================================================
// PHYSICS_INTEGRATION_LAYER — Unified integration API that
//   connects all physics subsystems for the game engine
// ============================================================
const PHYSICS_INTEGRATION_LAYER = (() => {
  'use strict';

  // ── World configuration ───────────────────────────────────
  function createWorld(opts) {
    const o = opts || {};
    return {
      gravity:         o.gravity         || { x: 0, y: -9.81 },
      airDensity:      o.airDensity      || 1.225,
      ambientTemp:     o.ambientTemp     || 25,
      windVelocity:    o.windVelocity    || { x: 0, y: 0 },
      waterBodies:     o.waterBodies     || [],
      // BUGFIX(21 Tmz): varsayılan 'asphalt' idi ama TERRAIN_TYPES'ta böyle bir anahtar YOK
      // (doğrusu 'tarmac_dry') → arama hep fallback'e düşüyor, terrainType ayarı anlamsızdı.
      terrainType:     o.terrainType     || 'tarmac_dry',
      wetnessLevel:    o.wetnessLevel    || 0,
      time:            0,
      paused:          false,
      tickCount:       0,
    };
  }

  // ── Vehicle physics state ─────────────────────────────────
  function createVehiclePhysics(opts) {
    const o = opts || {};
    return {
      // Core rigid body
      rigidBody:     RIGID_BODY_DYNAMICS.createBody({ mass: o.mass || 1200, position: o.position || { x:0, y:0 } }),
      // Vehicle dynamics
      vehicleState:  VEHICLE_DYNAMICS_MODEL.createVehicleState(),
      vehicleParams: VEHICLE_DYNAMICS_MODEL.createVehicleParams(o),
      // Suspension corners
      cornerFL: SUSPENSION_DYNAMICS_EXT.createCornerState(),
      cornerFR: SUSPENSION_DYNAMICS_EXT.createCornerState(),
      cornerRL: SUSPENSION_DYNAMICS_EXT.createCornerState(),
      cornerRR: SUSPENSION_DYNAMICS_EXT.createCornerState(),
      // Thermal
      thermalState:  THERMAL_DYNAMICS_SIM.createThermalState(o.ambientTemp),
      // Soft body (optional)
      softMesh:      null,
      // Damage
      damageState:   COLLISION_RESPONSE_EXT.createDamageState(),
      // Fuel
      fuelStrategy:  RACE_PHYSICS_SYSTEMS.fuelStrategyModel({ startFuel: o.startFuel }),
      // Powertrain
      powertrain:    POWERTRAIN_DYNAMICS_EXT.createPowertrainState(o),
      // Stunt
      stuntState:    STUNT_PHYSICS.createStuntState(),
      // Sensors
      sensorSuite:   {
        imu:  VEHICLE_SENSORS.createIMU(),
        gps:  VEHICLE_SENSORS.createGPS(),
        wsFL: VEHICLE_SENSORS.createWheelSpeedSensor(),
        wsFR: VEHICLE_SENSORS.createWheelSpeedSensor(),
        wsRL: VEHICLE_SENSORS.createWheelSpeedSensor(),
        wsRR: VEHICLE_SENSORS.createWheelSpeedSensor(),
      },
      // NVH
      nvhState: null,
      // Interpolation
      historyBuffer: PHYSICS_INTERPOLATOR.createHistoryBuffer(),
      // Event detection
      eventDetector: PHYSICS_EVENTS_EXT.createEventDetector(),
      // Particles
      particlePool: PHYSICS_PARTICLE_SIM.createParticlePool(),
      // Current outputs (cached last step)
      outputs: {},
    };
  }

  // ── Integrated physics step ───────────────────────────────
  function stepVehiclePhysics(vp, world, inputs, dt, rng, camPos) {
    if (world.paused) return vp.outputs;
    const {
      throttle = 0, brake = 0, steer = 0,
      nitro = false, handbrake = false,
    } = inputs;
    const terrain = TERRAIN_PHYSICS_EXT.TERRAIN_TYPES[world.terrainType] || TERRAIN_PHYSICS_EXT.TERRAIN_TYPES.tarmac_dry;
    const rb    = vp.rigidBody;
    const vs    = vp.vehicleState;
    const vp_   = vp.vehicleParams;
    const speed = Math.sqrt(vs.vx * vs.vx + vs.vy * vs.vy);

    // 1. Engine / powertrain
    const engineTorque = inputs.engineTorque || 200 * throttle;
    const ptOut = POWERTRAIN_DYNAMICS_EXT.stepPowertrain(
      vp.powertrain, POWERTRAIN_DYNAMICS_EXT.GEAR_SETS.sport_6speed,
      engineTorque, brake * 5000,
      { RL: vs.omegaRL || 0, RR: vs.omegaRR || 0, FL: 0, FR: 0 }, dt
    );

    // 2. Thermal
    const thermalOut = THERMAL_DYNAMICS_SIM.stepThermal(vp.thermalState, {
      engineTorque, rpm: vp.powertrain.engineRpm, vehicleSpeed: speed,
      brakePressure: brake * 8000000, wheelSpeed: speed / (vp_.wheelRadius || 0.315),
      tireSlip: vs.vy / (speed || 1), vehicleMass: vp_.mass,
      ambientTemp: world.ambientTemp, boostPressureRatio: 1.3, massFlowRate: 0.04,
    }, dt);

    // 3. Aerodynamics
    const aeroOut = AERODYNAMICS_EXT.stepAerodynamics({
      speed, yawAngle: vs.psi, rideHeight: 0.10, vehicleType: 'sports',
      ambientTemp: world.ambientTemp, Cd: 0.29,
      // BUGFIX(21 Tmz): world.windVelocity {x,y} şeklinde ama stepAerodynamics
      // {speedX,speedY} bekliyor → rüzgâr aeroda FİİLEN 0 kalıyordu. Alan adları eşlendi.
    }, { speedX: world.windVelocity.x, speedY: world.windVelocity.y }, 0, dt);

    // 4. Vehicle dynamics
    const vdOut = VEHICLE_DYNAMICS_MODEL.stepVehicle(vs, vp_, {
      steerAngle: steer * 0.4, throttleTorque: ptOut.driveTorque.RL + ptOut.driveTorque.RR,
      brakePressure: brake * 8000000, engineBrake: ptOut.engineRpm > 800 ? 50 : 0,
      throttle,
    }, dt);

    // 5. Suspension
    const suspOut = SUSPENSION_DYNAMICS_EXT.stepFourCorner(
      { FL: vp.cornerFL, FR: vp.cornerFR, RL: vp.cornerRL, RR: vp.cornerRR },
      { default: SUSPENSION_DYNAMICS_EXT.SPRING_PRESETS.medium },
      { default: SUSPENSION_DYNAMICS_EXT.DAMPER_PRESETS.oem_medium },
      { ax: vdOut.longitudinalF.FxF / vp_.mass, ay: vdOut.lateralForces.FyF / vp_.mass,
        mass: vp_.mass, trackWidth: vp_.trackWidth, wheelbase: vp_.wheelbase, cgHeight: vp_.CgH }, dt
    );

    // 6. Terrain interaction
    const wheelForce = TERRAIN_PHYSICS_EXT.wheelTerrainForce(
      { normalForce: vdOut.loadTransfer.FL, speed, width: 0.22, contactLength: 0.15 },
      terrain, world.wetnessLevel
    );

    // 7. Water physics
    let fluidOut = null;
    for (const wb of world.waterBodies) {
      if (FLUID_DYNAMICS_SIM.isBoatMode({ position: { x: vs.x, y: vs.y }, halfHeight: 0.8 }, wb, world.time)) {
        fluidOut = FLUID_DYNAMICS_SIM.marinePhysicsStep(
          { position: { x: vs.x, y: vs.y }, velocity: { x: vs.vx, y: vs.vy },
            halfHeight: 0.8, volume: 3.5, frontalArea: 2.2, _subFraction: 0, wheelTraction: 1 },
          wb, world.time, dt, rng
        );
        break;
      }
    }

    // 8. Fuel update
    const fuelOut = RACE_PHYSICS_SYSTEMS.updateFuelStrategy(vp.fuelStrategy, throttle, speed, dt);

    // 9. NVH
    const nvhOut = NOISE_AND_VIBRATION.stepNVH(
      { rpm: vp.powertrain.engineRpm, speed, throttle, tireType: 'standard',
        Cd: 0.29, engineType: 'I4', insulation: 18, ambientTemp: world.ambientTemp },
      terrain, dt
    );

    // 10. Stunt detection
    const stuntOut = STUNT_PHYSICS.stepStunts(vp.stuntState, {
      position: { x: vs.x, y: vs.y }, angle: vs.psi,
      speed, yawRate: vs.r, angularVel: vs.r,
      onGround: true, lateralSlip: vs.vy / (speed || 1),
    }, {}, [], dt);

    // 11. Sensor readings
    const sensorOut = VEHICLE_SENSORS.readAllSensors(vp.sensorSuite, {
      accel: { x: vdOut.longitudinalF.FxF / vp_.mass, y: vdOut.lateralForces.FyF / vp_.mass },
      angVel: vs.r, pos: { x: vs.x, y: vs.y }, vel: { x: vs.vx, y: vs.vy },
      omegaFL: 0, omegaFR: 0, omegaRL: vs.omegaRL || 0, omegaRR: vs.omegaRR || 0,
      steer, yawRate: vs.r, ay: vdOut.lateralForces.FyF / vp_.mass,
      engineTemp: thermalOut.engineTemp, fuelFraction: fuelOut.fuelFraction,
      rpm: vp.powertrain.engineRpm, throttle, lambda: 1.0, catalystWarm: true,
    }, rng || Math.random, dt);

    // 12. Particles
    const rngFn = rng || Math.random.bind(Math);
    PHYSICS_PARTICLE_SIM.stepParticles(vp.particlePool, world.windVelocity, dt);
    if (Math.abs(vs.vy / (speed || 1)) > 0.2) {
      PHYSICS_PARTICLE_SIM.emitTireSmoke(vp.particlePool, vs.x, vs.y, vs.vy / (speed || 1), rngFn, dt);
    }
    PHYSICS_PARTICLE_SIM.emitExhaust(vp.particlePool, vs.x, vs.y, vp.powertrain.engineRpm, throttle, rngFn, dt);
    if (fluidOut && fluidOut.splashEvent && fluidOut.splashEvent.splash) {
      PHYSICS_PARTICLE_SIM.emitWaterSplash(vp.particlePool, vs.x, vs.y, fluidOut.splashEvent.impactVelocity, rngFn, dt);
    }

    // 13. Events
    const eventBus = world.eventBus || PHYSICS_EVENTS_EXT.createEventBus();
    PHYSICS_EVENTS_EXT.detectPhysicsEvents(vp.eventDetector, {
      angle: vs.psi, speed, rpm: vp.powertrain.engineRpm, gear: vp.powertrain.currentGear,
      position: { x: vs.x, y: vs.y }, throttle, onGround: true,
    }, {
      absActive:    vdOut.absActive, tcsActive: vdOut.tcsActive, escActive: vdOut.escActive,
      engineTemp:   thermalOut.engineTemp, brakeFade: thermalOut.brakeFade,
      brakeDiscTemp:thermalOut.brakeDiscTemp, fuelFraction: fuelOut.fuelFraction,
    }, dt, eventBus);

    // 14. Snapshot for replay
    PHYSICS_INTERPOLATOR.pushSnapshot(vp.historyBuffer,
      PHYSICS_INTERPOLATOR.captureSnapshot([rb], world.tickCount, world.time));

    // 15. LOD
    const lod = PERFORMANCE_PHYSICS.getLODLevel(
      camPos ? Math.sqrt((vs.x - camPos.x)**2 + (vs.y - camPos.y)**2) : 0
    );

    // Compose outputs
    vp.outputs = {
      vehicleState:    vdOut,
      powertrain:      ptOut,
      thermal:         thermalOut,
      aerodynamics:    aeroOut,
      suspension:      suspOut,
      terrain:         wheelForce,
      fluid:           fluidOut,
      fuel:            fuelOut,
      nvh:             nvhOut,
      stunts:          stuntOut,
      sensors:         sensorOut,
      particles:       PHYSICS_PARTICLE_SIM.collectRenderData(vp.particlePool),
      lod,
      time:            world.time,
    };
    world.time     += dt;
    world.tickCount++;
    return vp.outputs;
  }

  // ── LOD step ──────────────────────────────────────────────
  function stepVehicleLOD(vp, world, inputs, dt, lod) {
    if (lod >= PERFORMANCE_PHYSICS.LOD_LEVEL.SIMPLIFIED) {
      PERFORMANCE_PHYSICS.simplifiedStep(vp.rigidBody, world.gravity, dt);
    }
  }

  // ── World tick ────────────────────────────────────────────
  function stepWorld(world, vehicles, inputsMap, dt, rng, camPos) {
    const budget = PERFORMANCE_PHYSICS.createBudget();
    PERFORMANCE_PHYSICS.budgetStart(budget);
    const outputs = {};
    for (const veh of vehicles) {
      const inputs = inputsMap[veh.id] || {};
      const lod    = PERFORMANCE_PHYSICS.getLODLevel(
        camPos ? Math.sqrt((veh.vehicleState.x - camPos.x)**2 + (veh.vehicleState.y - camPos.y)**2) : 0
      );
      if (lod >= PERFORMANCE_PHYSICS.LOD_LEVEL.SIMPLIFIED) {
        stepVehicleLOD(veh, world, inputs, dt, lod);
      } else {
        outputs[veh.id] = stepVehiclePhysics(veh, world, inputs, dt, rng, camPos);
      }
      if (!PERFORMANCE_PHYSICS.budgetCheck(budget) && PERFORMANCE_PHYSICS.OVERFLOW_FALLBACK) {
        break; // out of budget, skip remaining vehicles
      }
    }
    return { outputs, budget };
  }

  return {
    createWorld, createVehiclePhysics,
    stepVehiclePhysics, stepVehicleLOD, stepWorld,
  };
})();


// ============================================================
// PHYSICS_DIAGNOSTICS — Runtime diagnostics and telemetry
// ============================================================
const PHYSICS_DIAGNOSTICS = (() => {
  'use strict';

  // ── Telemetry channel definitions ────────────────────────
  const TELEMETRY_CHANNELS = [
    'speed_ms',       'speed_kmh',      'rpm',            'gear',
    'throttle',       'brake',          'steer',          'lat_accel',
    'long_accel',     'yaw_rate',       'slip_angle_f',   'slip_angle_r',
    'slip_ratio_fl',  'slip_ratio_fr',  'slip_ratio_rl',  'slip_ratio_rr',
    'tire_load_fl',   'tire_load_fr',   'tire_load_rl',   'tire_load_rr',
    'susp_travel_fl', 'susp_travel_fr', 'susp_travel_rl', 'susp_travel_rr',
    'susp_vel_fl',    'susp_vel_fr',    'susp_vel_rl',    'susp_vel_rr',
    'engine_temp',    'coolant_temp',   'oil_temp',       'brake_temp',
    'turbo_boost',    'fuel_level',     'fuel_rate',      'downforce_f',
    'downforce_r',    'drag_force',     'aero_balance',   'wind_speed',
    'road_noise_db',  'engine_noise_db','interior_spl',   'nvh_comfort',
    'submerged_frac', 'buoy_force',     'water_drag',     'boat_mode',
    'stunt_score',    'combo_mult',     'drift_angle',    'air_time',
    'damage_front',   'damage_rear',    'damage_side',    'struct_integ',
    'abs_active',     'tcs_active',     'esc_active',     'nitro_active',
    'lap_time',       'sector_time',    'best_lap',       'fuel_per_lap',
    'tire_temp_fl',   'tire_temp_fr',   'tire_temp_rl',   'tire_temp_rr',
    'tire_wear_fl',   'tire_wear_fr',   'tire_wear_rl',   'tire_wear_rr',
  ];

  // ── Telemetry buffer ──────────────────────────────────────
  const TELEMETRY_HISTORY = 600; // 10s at 60fps

  function createTelemetryBuffer() {
    const buf = {};
    for (const ch of TELEMETRY_CHANNELS) {
      buf[ch] = new Float32Array(TELEMETRY_HISTORY);
    }
    buf._head = 0;
    buf._size = 0;
    return buf;
  }

  function recordTelemetry(buf, values) {
    const h = buf._head;
    for (const ch of TELEMETRY_CHANNELS) {
      if (values[ch] !== undefined) buf[ch][h] = values[ch];
    }
    buf._head = (h + 1) % TELEMETRY_HISTORY;
    if (buf._size < TELEMETRY_HISTORY) buf._size++;
  }

  function getTelemetrySlice(buf, channel, samples) {
    const n    = Math.min(samples || 60, buf._size);
    const out  = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const idx = (buf._head - n + i + TELEMETRY_HISTORY) % TELEMETRY_HISTORY;
      out[i] = buf[channel][idx];
    }
    return out;
  }

  function telemetryStats(buf, channel) {
    const data = getTelemetrySlice(buf, channel, buf._size);
    let mn = Infinity, mx = -Infinity, sum = 0, sum2 = 0;
    for (const v of data) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
      sum += v; sum2 += v * v;
    }
    const n    = data.length || 1;
    const mean = sum / n;
    const rms  = Math.sqrt(sum2 / n);
    const std  = Math.sqrt(sum2/n - mean*mean);
    return { min: mn, max: mx, mean, rms, std, samples: n };
  }

  // ── Performance metrics ───────────────────────────────────
  function createPerfMetrics() {
    return {
      frameTime:      0,
      physicsTime:    0,
      renderTime:     0,
      particleTime:   0,
      audioTime:      0,
      totalTime:      0,
      fps:            0,
      physicsOverrun: 0,
      bodyCount:      0,
      constraintCount:0,
      contactCount:   0,
      particleCount:  0,
      sleepingBodies: 0,
      samples:        new Float32Array(120),
      sampleHead:     0,
    };
  }

  function updatePerfMetrics(metrics, timings) {
    metrics.physicsTime  = timings.physics    || 0;
    metrics.renderTime   = timings.render     || 0;
    metrics.particleTime = timings.particles  || 0;
    metrics.audioTime    = timings.audio      || 0;
    metrics.totalTime    = timings.total      || 0;
    metrics.fps          = 1000 / (timings.total || 16.67);
    metrics.physicsOverrun = metrics.physicsTime > 4 ? 1 : 0;
    metrics.samples[metrics.sampleHead] = metrics.fps;
    metrics.sampleHead   = (metrics.sampleHead + 1) % 120;
    return metrics;
  }

  function averageFPS(metrics) {
    let sum = 0;
    for (const v of metrics.samples) sum += v;
    return sum / metrics.samples.length;
  }

  // ── Debug overlay data ────────────────────────────────────
  function buildDebugOverlay(vehicle, physics, metrics) {
    const vs  = vehicle.vehicleState  || {};
    const out = physics.outputs       || {};
    const pt  = out.powertrain        || {};
    const th  = out.thermal           || {};
    const ae  = out.aerodynamics      || {};
    const fu  = out.fuel              || {};
    const st  = out.stunts            || {};
    return {
      // Motion
      speed:        Math.sqrt((vs.vx||0)**2 + (vs.vy||0)**2) * 3.6,
      rpm:          pt.engineRpm  || 0,
      gear:         pt.currentGear || 1,
      steeringAngle: vs.steerAngle || 0,
      yawRate:      vs.r          || 0,
      // Temps
      engineTemp:   th.engineTemp  || 0,
      oilTemp:      th.oilTemp     || 0,
      brakeTemp:    th.brakeDiscTemp || 0,
      // Aero
      downforceFront: ae.liftFront  || 0,
      downforceRear:  ae.liftRear   || 0,
      drag:           ae.dragForce  || 0,
      // Fuel
      fuelKg:       fu.fuelMassKg  || 0,
      fuelFrac:     fu.fuelFraction || 0,
      // Stunts
      stuntScore:   st.totalScore   || 0,
      comboMult:    st.multiplier   || 1,
      // Performance
      fps:          metrics.fps        || 0,
      physicsMs:    metrics.physicsTime || 0,
    };
  }

  // ── Physics assertion checker ─────────────────────────────
  function assertsPhysicsValid(outputs) {
    const errs = [];
    const vs = outputs.vehicleState || {};
    if (isNaN(vs.vx) || isNaN(vs.vy)) errs.push('NaN velocity');
    if (Math.abs(vs.vx || 0) > 200)   errs.push('Velocity explosion: vx=' + vs.vx);
    if (Math.abs(vs.vy || 0) > 200)   errs.push('Velocity explosion: vy=' + vs.vy);
    if (isNaN(vs.r))                   errs.push('NaN yaw rate');
    const th = outputs.thermal || {};
    if (th.engineTemp > 500)           errs.push('Engine temp extreme: ' + th.engineTemp);
    return { valid: errs.length === 0, errors: errs };
  }

  // ── Lap data logger ───────────────────────────────────────
  function createLapLogger() {
    return { laps: [], currentLap: { samples: [], startTime: 0 } };
  }

  function logLapSample(logger, sample) {
    logger.currentLap.samples.push(sample);
  }

  function commitLap(logger, lapTime) {
    logger.laps.push({ ...logger.currentLap, lapTime });
    logger.currentLap = { samples: [], startTime: lapTime };
    if (logger.laps.length > 20) logger.laps.shift();
  }

  function bestLapData(logger) {
    if (logger.laps.length === 0) return null;
    return logger.laps.reduce((best, l) => l.lapTime < best.lapTime ? l : best);
  }

  // ── Channel export (for external tools) ──────────────────
  function exportTelemetryCSV(buf, channels, samples) {
    const n = samples || buf._size;
    const rows = [channels.join(',')];
    for (let i = 0; i < n; i++) {
      const idx = (buf._head - n + i + TELEMETRY_HISTORY) % TELEMETRY_HISTORY;
      rows.push(channels.map(ch => (buf[ch] ? buf[ch][idx] : 0).toFixed(4)).join(','));
    }
    return rows.join('\n');
  }

  // ── Physics health score ──────────────────────────────────
  function physicsHealthScore(outputs, metrics) {
    let score = 100;
    if (metrics.fps < 30)          score -= 20;
    if (metrics.physicsTime > 6)   score -= 15;
    if (metrics.physicsOverrun > 0) score -= 10;
    const check = assertsPhysicsValid(outputs);
    if (!check.valid)              score -= 30 * check.errors.length;
    return Math.max(0, score);
  }

  return {
    TELEMETRY_CHANNELS, TELEMETRY_HISTORY,
    createTelemetryBuffer, recordTelemetry, getTelemetrySlice, telemetryStats,
    createPerfMetrics, updatePerfMetrics, averageFPS,
    buildDebugOverlay, assertsPhysicsValid,
    createLapLogger, logLapSample, commitLap, bestLapData,
    exportTelemetryCSV, physicsHealthScore,
  };
})();


// ================================================================
// VEHICLE_SUSPENSION_SIM — Detailed suspension simulation
// ================================================================
const VEHICLE_SUSPENSION_SIM = (() => {
  // Each wheel: {restLength, stiffness, damping, travel, angle}
  function createWheel(restLength, stiffness, damping, travel) {
    return {
      restLength: restLength || 0.35,
      stiffness:  stiffness  || 28000,
      damping:    damping    || 2800,
      travel:     travel     || 0.25,
      compression: 0,
      velocity:    0,
      force:       0,
      isGrounded:  false,
      contactNormal: { x:0, y:-1 },
      contactPoint:  { x:0, y:0 },
    };
  }

  function updateWheel(wheel, chassisVelY, groundDist, dt) {
    const { restLength, stiffness, damping, travel } = wheel;
    // If no ground contact
    if (groundDist > restLength + travel) {
      wheel.compression = 0;
      wheel.force       = 0;
      wheel.isGrounded  = false;
      wheel.velocity    = Math.max(wheel.velocity - 9.8*dt, -20);
      return;
    }
    wheel.isGrounded  = true;
    const prevComp    = wheel.compression;
    wheel.compression = Math.max(0, Math.min(travel, restLength - groundDist));
    wheel.velocity    = (wheel.compression - prevComp) / dt;
    // Spring + damper force
    wheel.force = wheel.compression * stiffness + wheel.velocity * damping;
  }

  function createVehicleWheels(config) {
    // config: {frontStiff, rearStiff, frontDamp, rearDamp, frontTravel, rearTravel, restLength}
    const rl = config.restLength || 0.35;
    return {
      frontLeft:  createWheel(rl, config.frontStiff||30000, config.frontDamp||3000, config.frontTravel||0.22),
      frontRight: createWheel(rl, config.frontStiff||30000, config.frontDamp||3000, config.frontTravel||0.22),
      rearLeft:   createWheel(rl, config.rearStiff ||25000, config.rearDamp ||2500, config.rearTravel ||0.28),
      rearRight:  createWheel(rl, config.rearStiff ||25000, config.rearDamp ||2500, config.rearTravel ||0.28),
    };
  }

  function getTotalForce(wheels) {
    return (wheels.frontLeft.force||0) + (wheels.frontRight.force||0) +
           (wheels.rearLeft.force||0)  + (wheels.rearRight.force||0);
  }

  function getGroundedCount(wheels) {
    return [wheels.frontLeft, wheels.frontRight, wheels.rearLeft, wheels.rearRight].filter(w=>w.isGrounded).length;
  }

  function isFullyGrounded(wheels) { return getGroundedCount(wheels)===4; }
  function isFrontGrounded(wheels) { return wheels.frontLeft.isGrounded && wheels.frontRight.isGrounded; }
  function isRearGrounded(wheels)  { return wheels.rearLeft.isGrounded  && wheels.rearRight.isGrounded; }

  function getBodyRoll(wheels, trackWidth) {
    const tw = trackWidth||1.5;
    const leftForce  = (wheels.frontLeft.force  + wheels.rearLeft.force) /2;
    const rightForce = (wheels.frontRight.force + wheels.rearRight.force)/2;
    return (leftForce - rightForce) / (tw * 20000);
  }

  function getPitch(wheels, wheelBase) {
    const wb = wheelBase||2.5;
    const frontForce = (wheels.frontLeft.force + wheels.frontRight.force)/2;
    const rearForce  = (wheels.rearLeft.force  + wheels.rearRight.force) /2;
    return (rearForce - frontForce) / (wb * 20000);
  }

  return { createWheel, updateWheel, createVehicleWheels, getTotalForce, getGroundedCount, isFullyGrounded, isFrontGrounded, isRearGrounded, getBodyRoll, getPitch };
})();

// ================================================================
// TRACTION_CONTROL_SYSTEM — Anti-spin / ABS simulation
// ================================================================
const TRACTION_CONTROL_SYSTEM = (() => {
  const SLIP_THRESHOLD_DRIVE = 0.25;
  const SLIP_THRESHOLD_BRAKE = 0.15;
  const INTERVENTION_STRENGTH = 0.7;

  function createState() {
    return {
      tcActive:  false,  // traction control intervening
      absActive: false,  // ABS intervening
      tcReduction: 0,    // 0-1, how much torque was cut
      absReduction: 0,
      slipFront: 0,
      slipRear:  0,
    };
  }

  function update(state, wheelSpeedFront, wheelSpeedRear, vehicleSpeed, brakingTorque, driveTorque) {
    // Longitudinal slip ratio
    const spd = Math.max(0.1, vehicleSpeed);
    state.slipRear  = Math.abs(wheelSpeedRear  - spd) / spd;
    state.slipFront = Math.abs(wheelSpeedFront - spd) / spd;

    // Traction control (rear wheel spin under power)
    if (driveTorque > 0 && state.slipRear > SLIP_THRESHOLD_DRIVE) {
      state.tcActive    = true;
      state.tcReduction = Math.min(1, (state.slipRear - SLIP_THRESHOLD_DRIVE) * INTERVENTION_STRENGTH * 4);
    } else {
      state.tcActive    = false;
      state.tcReduction = Math.max(0, state.tcReduction - 0.05);
    }

    // ABS (wheel lockup under braking)
    if (brakingTorque > 0 && state.slipFront > SLIP_THRESHOLD_BRAKE) {
      state.absActive    = true;
      state.absReduction = Math.min(1, (state.slipFront - SLIP_THRESHOLD_BRAKE) * INTERVENTION_STRENGTH * 5);
    } else {
      state.absActive    = false;
      state.absReduction = Math.max(0, state.absReduction - 0.08);
    }

    return {
      adjustedDriveTorque:  driveTorque  * (1 - state.tcReduction),
      adjustedBrakeTorque:  brakingTorque* (1 - state.absReduction),
      tcActive: state.tcActive,
      absActive: state.absActive,
    };
  }

  function isIntervening(state) { return state.tcActive || state.absActive; }
  function getIndicator(state)  {
    if (state.tcActive && state.absActive) return 'TC+ABS';
    if (state.tcActive)  return 'TC';
    if (state.absActive) return 'ABS';
    return '';
  }

  return { createState, update, isIntervening, getIndicator, SLIP_THRESHOLD_DRIVE, SLIP_THRESHOLD_BRAKE };
})();

// ================================================================
// COLLISION_RESPONSE_ENGINE — Vehicle collision resolution
// ================================================================
const COLLISION_RESPONSE_ENGINE = (() => {
  function resolveCircleVsLine(circle, line, restitution, friction) {
    // circle: {x,y,r,vx,vy,mass}
    // line: {ax,ay,bx,by}
    const dx  = line.bx - line.ax;
    const dy  = line.by - line.ay;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const nx  = -dy/len, ny = dx/len; // normal pointing "up" from line

    // Distance from circle center to line
    const px  = circle.x - line.ax;
    const py  = circle.y - line.ay;
    const dot = px*nx + py*ny;

    if (dot > circle.r || dot < -circle.r*2) return null; // no collision

    const penetration = circle.r - dot;
    if (penetration <= 0) return null;

    // Push circle out of line
    const cx = circle.x + nx*penetration;
    const cy = circle.y + ny*penetration;

    // Velocity along normal
    const vn = circle.vx*nx + circle.vy*ny;
    if (vn > 0) return { cx, cy, vx:circle.vx, vy:circle.vy }; // moving away

    const e  = restitution !== undefined ? restitution : 0.3;
    const mu = friction    !== undefined ? friction    : 0.6;

    // Normal impulse
    const jn = -(1+e)*vn;
    let vxNew = circle.vx + jn*nx;
    let vyNew = circle.vy + jn*ny;

    // Tangential friction
    const tx  =  ny, ty = -nx;
    const vt  = vxNew*tx + vyNew*ty;
    const jt  = Math.max(-mu*Math.abs(jn), Math.min(mu*Math.abs(jn), -vt));
    vxNew += jt*tx;
    vyNew += jt*ty;

    return { cx, cy, vx:vxNew, vy:vyNew, penetration, normal:{x:nx,y:ny} };
  }

  function resolveCircleVsCircle(a, b, restitution) {
    const dx  = b.x - a.x;
    const dy  = b.y - a.y;
    const dist= Math.sqrt(dx*dx+dy*dy) || 0.001;
    const minDist = (a.r||1) + (b.r||1);
    if (dist >= minDist) return null;

    const nx = dx/dist, ny = dy/dist;
    const pen = minDist - dist;
    const e   = restitution !== undefined ? restitution : 0.4;

    // Relative velocity
    const rvx = (b.vx||0) - (a.vx||0);
    const rvy = (b.vy||0) - (a.vy||0);
    const rvn = rvx*nx + rvy*ny;
    if (rvn > 0) return { pen, nx, ny }; // separating

    const mA = a.mass||1, mB = b.mass||1;
    const j  = -(1+e)*rvn / (1/mA + 1/mB);

    return {
      pen, nx, ny,
      impulseA: { x:-j*nx/mA, y:-j*ny/mA },
      impulseB: { x: j*nx/mB, y: j*ny/mB },
    };
  }

  function resolveAABBvsAABB(a, b) {
    // a,b: {x,y,w,h,vx,vy}
    const overlapX = (a.w+b.w)/2 - Math.abs(a.x-b.x);
    const overlapY = (a.h+b.h)/2 - Math.abs(a.y-b.y);
    if (overlapX <= 0 || overlapY <= 0) return null;

    if (overlapX < overlapY) {
      const nx = a.x < b.x ? -1 : 1;
      return { pen:overlapX, nx, ny:0 };
    } else {
      const ny = a.y < b.y ? -1 : 1;
      return { pen:overlapY, nx:0, ny };
    }
  }

  function applyImpulse(body, impulseX, impulseY) {
    body.vx = (body.vx||0) + impulseX / (body.mass||1);
    body.vy = (body.vy||0) + impulseY / (body.mass||1);
  }

  return { resolveCircleVsLine, resolveCircleVsCircle, resolveAABBvsAABB, applyImpulse };
})();
