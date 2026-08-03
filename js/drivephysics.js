'use strict';
/* ============================================================================
   DrivePhysics — Gelişmiş Fizik & Sürüş Modeli  (100-özellik: C. #21–#30)
   engine.js/perf.js gibi ADDITIVE: mevcut oyunu bozmaz. Her sistem bağımsız,
   saf fonksiyonel model olarak window'a açılır; oyun kademeli benimser.

     #21 TerrainDeform  — şekil-değiştiren zemin (çamur/kar/kum), tekerlek izi/batma
     #22 Suspension     — yay-damper (bump/rebound damper eğrisi)
     #23 TireModel      — lastik kavrama eğrisi (Pacejka-lite slip curve) + deformasyon
     #24 Drivetrain     — vites kutusu + tork eğrisi + diferansiyel
     #25 Aero           — aerodinamik (downforce/drag ∝ v², havada denge)
     #26 WeightTransfer — ağırlık transferi (fren/gazda öne-arka yük kayması)
     #27 CCD            — sürekli çarpışma tespiti (tünelleme önleme, swept)
     #28 ChassisFlex    — şasi esnekliği (tork/yük farkı ile bükülme)
     #29 Winch          — halat/vinç/çekici (yay-kısıt kurtarma mekaniği)
     #30 Wind           — rüzgâr alanı + rüzgâr rafları (gust)
   ============================================================================ */

const _clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

// ─────────────────────────────────────────────────────────────────────────────
// #21 TerrainDeform — şekil-değiştiren zemin
//   x ekseni boyunca deformasyon derinliği tutar. Yumuşak zeminde tekerlek batar
//   (iz bırakır) ve kavrama düşer. sample(x) derinlik, deform(x,load,soft) uygular.
// ─────────────────────────────────────────────────────────────────────────────
const TerrainDeform = {
  _cell: 12, _map: Object.create(null), maxDepth: 26,
  _k(x) { return Math.round(x / this._cell); },
  sample(x) { return this._map[this._k(x)] || 0; },
  // load: tekerlek yükü (0..1), soft: zemin yumuşaklığı (0 sert .. 1 çamur)
  deform(x, load, soft) {
    const k = this._k(x);
    const add = _clamp((load || 0.5) * (soft || 0) * 6, 0, this.maxDepth);
    const cur = this._map[k] || 0;
    this._map[k] = Math.min(this.maxDepth, cur + add * 0.25);
    return this._map[k];
  },
  // Deformasyonun kavramaya etkisi: derin iz → daha az kavrama (0.4..1.0)
  gripFactor(x, soft) { const d = this.sample(x); return _clamp(1 - (d / this.maxDepth) * (0.5 * (soft || 0) + 0.2), 0.4, 1); },
  recover(dt) { const r = (dt || 0.016) * 4; for (const k in this._map) { this._map[k] = Math.max(0, this._map[k] - r); if (this._map[k] <= 0) delete this._map[k]; } },
  reset() { this._map = Object.create(null); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #22 Suspension — yay-damper (asimetrik bump/rebound eğrisi)
//   F = -k·x - c·v.  Sıkışırken (bump) ve açılırken (rebound) farklı sönümleme.
// ─────────────────────────────────────────────────────────────────────────────
const Suspension = {
  // compression x (m, +sıkışma), velocity v (m/s, +sıkışma yönü)
  force(x, v, k, cBump, cRebound) {
    k = k || 42000; cBump = cBump || 3500; cRebound = cRebound || 5200;
    const spring = -k * x;
    const damp = -(v > 0 ? cBump : cRebound) * v;
    return spring + damp;
  },
  // tam damper eğrisi (düşük hızda lineer, yüksekte doygun — gerçekçi)
  damperCurve(v, cLow, vKnee, cHigh) {
    cLow = cLow || 4200; vKnee = vKnee || 0.3; cHigh = cHigh || 1500;
    const a = Math.abs(v), s = Math.sign(v);
    if (a <= vKnee) return -s * cLow * a;
    return -s * (cLow * vKnee + cHigh * (a - vKnee));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #23 TireModel — kavrama eğrisi (Pacejka-lite) + deformasyon
//   Slip arttıkça kavrama önce artar (tepe), sonra düşer. Gerçekçi kayma hissi.
// ─────────────────────────────────────────────────────────────────────────────
const TireModel = {
  // slip: kayma oranı (0..~1+). Dönüş: normalize kavrama kuvveti (0..1)
  grip(slip, peak, shape) {
    peak = peak || 0.14; shape = shape || 1.6;
    const s = Math.abs(slip);
    // basitleştirilmiş sihirli formül: tepe noktasına kadar artar, sonra azalır
    const g = Math.sin(shape * Math.atan(s / peak));
    return _clamp(g, 0, 1);
  },
  // maksimum kavramaya karşı gereken kuvvet aşılırsa kayar
  frictionForce(slip, load, mu) { return this.grip(slip) * (load || 1) * (mu || 1.1); },
  // lastik deformasyonu (yük altında ezilme, görsel/kavrama için)
  deformation(load, stiffness) { return _clamp((load || 0) / (stiffness || 6000), 0, 0.08); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #24 Drivetrain — vites kutusu + tork eğrisi + diferansiyel
//   Devir (rpm) tekerlek hızından; tork eğrisi devre göre; otomatik vites.
// ─────────────────────────────────────────────────────────────────────────────
function Drivetrain(gears, finalDrive, wheelR) {
  this.gears = gears || [3.2, 2.1, 1.5, 1.15, 0.9];
  this.final = finalDrive || 3.7;
  this.wheelR = wheelR || 0.35;
  this.gear = 0; this.rpm = 900;
  this.idle = 900; this.redline = 7200;
}
Drivetrain.prototype.torqueCurve = function (rpm) {
  // idle→pik(~4500)→redline: çan eğrisi
  const p = _clamp((rpm - this.idle) / (this.redline - this.idle), 0, 1);
  return Math.sin(p * Math.PI) * 0.85 + 0.15;   // 0.15..1.0
};
Drivetrain.prototype.update = function (wheelAngVel, throttle) {
  const ratio = this.gears[this.gear] * this.final;
  this.rpm = _clamp(Math.abs(wheelAngVel) * ratio * 9.549, this.idle, this.redline);
  // otomatik vites
  if (this.rpm > this.redline * 0.92 && this.gear < this.gears.length - 1) this.gear++;
  else if (this.rpm < this.idle * 1.6 && this.gear > 0) this.gear--;
  return this.rpm;
};
Drivetrain.prototype.driveTorque = function (throttle) {
  const ratio = this.gears[this.gear] * this.final;
  return this.torqueCurve(this.rpm) * (throttle || 0) * ratio;
};
// diferansiyel: giriş torkunu iki tekere yüke göre paylaştırır
Drivetrain.prototype.differential = function (torque, loadL, loadR) {
  const tot = (loadL || 1) + (loadR || 1);
  return { left: torque * (loadL || 1) / tot, right: torque * (loadR || 1) / tot };
};

// ─────────────────────────────────────────────────────────────────────────────
// #25 Aero — aerodinamik (downforce/drag ∝ v²) + havada denge
// ─────────────────────────────────────────────────────────────────────────────
const Aero = {
  rho: 1.225,
  drag(v, Cd, area) { Cd = Cd || 0.35; area = area || 2.0; return 0.5 * this.rho * Cd * area * v * Math.abs(v); },
  downforce(v, Cl, area) { Cl = Cl || 0.9; area = area || 1.6; return 0.5 * this.rho * Cl * area * v * v; },
  // havada burun dengesi: hız yönüne hizalanma torku (spin'i yumuşatır)
  airBalanceTorque(angle, angVel, vAngle, k, c) {
    k = k || 2.2; c = c || 1.4;
    let d = vAngle - angle; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return k * d - c * angVel;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #26 WeightTransfer — ağırlık transferi (öne/arkaya yük kayması)
//   İvmede yük arkaya, frende öne kayar → kavrama dağılımı değişir.
// ─────────────────────────────────────────────────────────────────────────────
const WeightTransfer = {
  // accelX (m/s²), mass, cgHeight, wheelbase → {front, rear} statik+dinamik yük (N)
  compute(accelX, mass, cgHeight, wheelbase, g) {
    mass = mass || 1200; cgHeight = cgHeight || 0.55; wheelbase = wheelbase || 2.4; g = g || 9.81;
    const staticEach = mass * g / 2;
    const transfer = (mass * accelX * cgHeight) / wheelbase;   // arkaya (+ivme) / öne (-)
    return { front: _clamp(staticEach - transfer, 0, mass * g), rear: _clamp(staticEach + transfer, 0, mass * g) };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #27 CCD — sürekli çarpışma tespiti (swept)
//   Hızlı hareket eden nokta bir kareyi bir kareye geçerken zemini "delmesin".
//   Segmenti örnekler, ilk zemin-altı geçişini bulur.
// ─────────────────────────────────────────────────────────────────────────────
const CCD = {
  // p0→p1 arası, groundYFn(x) zemin yüksekliği verir. İlk çarpışma noktası/null.
  sweep(x0, y0, x1, y1, groundYFn, steps) {
    steps = steps || Math.max(2, Math.min(32, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6)));
    let prevAbove = (y0 <= groundYFn(x0));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const gy = groundYFn(x), above = (y <= gy);
      if (prevAbove && !above) return { x: x, y: gy, t: t };   // zemine ilk giriş
      prevAbove = above;
    }
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #28 ChassisFlex — şasi esnekliği (torsiyon)
//   Ön/arka yük farkı gövdeyi bükeR (görsel/his). Küçük açı döndürür.
// ─────────────────────────────────────────────────────────────────────────────
const ChassisFlex = {
  stiffness: 90000,   // Nm/rad
  // yük farkı (N) + kol uzunluğu (m) → bükülme açısı (rad, çok küçük)
  twist(loadFront, loadRear, arm) { arm = arm || 0.8; const torque = (loadFront - loadRear) * arm; return _clamp(torque / this.stiffness, -0.06, 0.06); }
};

// ─────────────────────────────────────────────────────────────────────────────
// #29 Winch — halat/vinç/çekici (yay-kısıt)
//   İki nokta arası esnek halat: gerildiğinde çeker, gevşekken kuvvet yok.
// ─────────────────────────────────────────────────────────────────────────────
const Winch = {
  // ax,ay çapa; px,py araç; restLen halat boş boyu; k sertlik; c sönüm; pvx,pvy araç hızı
  force(ax, ay, px, py, restLen, k, c, pvx, pvy) {
    k = k || 1400; c = c || 40;
    const dx = ax - px, dy = ay - py, dist = Math.hypot(dx, dy) || 1e-6;
    if (dist <= restLen) return { fx: 0, fy: 0, taut: false };
    const nx = dx / dist, ny = dy / dist, stretch = dist - restLen;
    const relV = (pvx || 0) * nx + (pvy || 0) * ny;
    const mag = k * stretch - c * relV;
    return { fx: nx * mag, fy: ny * mag, taut: true, stretch: stretch };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// #30 Wind — rüzgâr alanı + rüzgâr rafları (gust)
//   Konum + zamana bağlı yatay rüzgâr; ara ara sert raflar. Haritayı etkiler.
// ─────────────────────────────────────────────────────────────────────────────
const Wind = {
  base: 0, gustAmp: 60, dir: 1,
  set(base, gustAmp, dir) { this.base = base || 0; if (gustAmp != null) this.gustAmp = gustAmp; if (dir != null) this.dir = dir; },
  // x konum, t zaman → rüzgâr kuvveti (yatay, N benzeri)
  at(x, t) {
    const gust = Math.sin(t * 0.7 + x * 0.002) * 0.6 + Math.sin(t * 1.9 + x * 0.005) * 0.4;
    return this.dir * (this.base + this.gustAmp * gust);
  },
  // araca uygulanacak ivme (kütleye böl): havadayken daha etkili
  accel(x, t, mass, airborneFactor) { return this.at(x, t) / (mass || 1000) * (airborneFactor || 1); }
};

// ── DrivePhysics kimliği + kendi kendine tanılama ──
const DrivePhysics = {
  version: '1.0',
  systems: ['TerrainDeform', 'Suspension', 'TireModel', 'Drivetrain', 'Aero', 'WeightTransfer', 'CCD', 'ChassisFlex', 'Winch', 'Wind'],
  ready() { return this.systems.every(function (s) { return typeof window !== 'undefined' && typeof window[s] !== 'undefined'; }); },
  selfTest() {
    const r = {};
    try { TerrainDeform.reset(); TerrainDeform.deform(100, 1, 1); r.terraindeform = TerrainDeform.sample(100) > 0 && TerrainDeform.gripFactor(100, 1) < 1; } catch (e) { r.terraindeform = false; }
    try { r.suspension = Suspension.force(0.05, 1, 40000, 3000, 5000) < 0 && typeof Suspension.damperCurve(0.5) === 'number'; } catch (e) { r.suspension = false; }
    try { const g0 = TireModel.grip(0.14), g1 = TireModel.grip(1.0); r.tiremodel = g0 > g1 && g0 > 0; } catch (e) { r.tiremodel = false; }
    try { const dt = new Drivetrain(); dt.update(50, 1); r.drivetrain = dt.rpm > dt.idle && dt.driveTorque(1) > 0 && dt.differential(100, 1, 3).right > dt.differential(100, 1, 3).left; } catch (e) { r.drivetrain = false; }
    try { r.aero = Aero.drag(30) > Aero.drag(10) && Aero.downforce(30) > 0; } catch (e) { r.aero = false; }
    try { const wt = WeightTransfer.compute(5, 1200, 0.55, 2.4); r.weighttransfer = wt.rear > wt.front; } catch (e) { r.weighttransfer = false; }
    try { const hit = CCD.sweep(0, 0, 0, 100, function () { return 50; }); r.ccd = hit && Math.abs(hit.y - 50) < 1; } catch (e) { r.ccd = false; }
    try { r.chassisflex = Math.abs(ChassisFlex.twist(6000, 3000, 0.8)) > 0; } catch (e) { r.chassisflex = false; }
    try { const w = Winch.force(0, 0, 100, 0, 50, 1400, 40, 0, 0); r.winch = w.taut === true && w.fx < 0; } catch (e) { r.winch = false; }
    try { Wind.set(20, 60, 1); r.wind = typeof Wind.at(100, 1.5) === 'number' && typeof Wind.accel(100, 1.5, 1000, 2) === 'number'; } catch (e) { r.wind = false; }
    r.allPass = Object.keys(r).every(function (k) { return r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.TerrainDeform = TerrainDeform;
  window.Suspension = Suspension;
  window.TireModel = TireModel;
  window.Drivetrain = Drivetrain;
  window.Aero = Aero;
  window.WeightTransfer = WeightTransfer;
  window.CCD = CCD;
  window.ChassisFlex = ChassisFlex;
  window.Winch = Winch;
  window.Wind = Wind;
  window.DrivePhysics = DrivePhysics;
}
