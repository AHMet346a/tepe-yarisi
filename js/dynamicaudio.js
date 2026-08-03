/* =====================================================================
 * dynamicaudio.js  —  DİNAMİK MOTOR SESİ + OYNANIŞA TEPKİ VEREN MÜZİK
 * ---------------------------------------------------------------------
 * Kendi-başına, opsiyonel bir KATMAN modülü. Mevcut `Audio` modülünü
 * (js/audio.js) BOZMAZ; onun DOĞRULANMIŞ metodlarının üstüne biner:
 *
 *   - Audio.ctx                      (AudioContext)                 [guard]
 *   - Audio.updateEngine(throttle,   speed)   -> motor perde/gain   [guard]
 *   - Audio.musicGain (.gain)        -> reaktif müzik yoğunluğu     [guard]
 *   - Audio.getEffectiveVolume(cat)  (opsiyonel okuma)             [guard]
 *
 * Kurallar: localStorage YOK. AudioContext yoksa no-op. Settings sfx/music
 * kapalıyken sessiz. Tüm metod/param erişimleri guard'lı, NaN guard'lı.
 * Uydurma Audio metodu ÇAĞRILMAZ — yalnız yukarıdaki doğrulanmışlar.
 *
 * API:
 *   DynamicAudio.update(vehicle, dt)   // her karede (oyun döngüsünden)
 *   DynamicAudio.onRunStart()          // koşu başlarken
 *   DynamicAudio.onRunEnd()            // koşu biterken
 * ===================================================================== */
(function (global) {
  'use strict';

  // ── küçük yardımcılar (hepsi NaN/Inf güvenli) ─────────────────────
  function num(x, d) { return (typeof x === 'number' && isFinite(x)) ? x : (d || 0); }
  function clamp(x, a, b) { x = num(x, a); return x < a ? a : (x > b ? b : x); }
  function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }
  // kare-hızından bağımsız yumuşatma katsayısı (dt saniye)
  function smoothK(rate, dt) { return clamp(1 - Math.pow(rate, clamp(dt, 0, 0.1)), 0, 1); }

  // ── durum ─────────────────────────────────────────────────────────
  var S = {
    active: false,
    smThrottle: 0,   // yumuşatılmış gaz (0..1)
    smSpeed: 0,      // yumuşatılmış hız (|vx|)
    intensity: 0,    // yumuşatılmış müzik yoğunluğu (0..1)
    musicBase: null  // koşu başında yakalanan musicGain taban değeri
  };

  // ── guard'lar ─────────────────────────────────────────────────────
  function audioReady() {
    return (typeof Audio !== 'undefined') && Audio && Audio.ctx;
  }
  function sfxOn() {
    try {
      if (typeof Settings !== 'undefined' && Settings && typeof Settings.get === 'function') {
        return Settings.get('sfx') !== false;
      }
    } catch (e) {}
    return true; // Settings yoksa varsayılan açık
  }
  function musicOn() {
    try {
      if (typeof Settings !== 'undefined' && Settings && typeof Settings.get === 'function') {
        return Settings.get('music') !== false;
      }
    } catch (e) {}
    return true;
  }

  // ── koşu yaşam döngüsü ────────────────────────────────────────────
  function onRunStart() {
    if (!audioReady()) return;          // AudioContext yoksa no-op
    S.active = true;
    S.smThrottle = 0;
    S.smSpeed = 0;
    S.intensity = 0;
    // müzik taban değerini bir kez yakala (geri yükleme için)
    S.musicBase = null;
    try {
      if (Audio.musicGain && Audio.musicGain.gain) {
        S.musicBase = num(Audio.musicGain.gain.value, 0.4);
      }
    } catch (e) { S.musicBase = null; }
  }

  function onRunEnd() {
    // müzik yoğunluğunu tabana yumuşakça geri getir (mevcut sistemi bozmadan)
    try {
      if (S.musicBase !== null && audioReady() && Audio.musicGain && Audio.musicGain.gain) {
        Audio.musicGain.gain.setTargetAtTime(S.musicBase, Audio.ctx.currentTime, 0.3);
      }
    } catch (e) {}
    S.active = false;
    S.musicBase = null;
  }

  // ── her-kare güncelleme ───────────────────────────────────────────
  function update(vehicle, dt) {
    if (!audioReady()) return;          // AudioContext yoksa no-op
    if (!vehicle) return;

    dt = num(dt, 0.016);
    if (dt <= 0) dt = 0.016;
    if (dt > 0.1) dt = 0.1;

    // her ikisi de kapalıysa hiçbir şey yapma (sessiz)
    var sfx = sfxOn();
    var music = musicOn();
    if (!sfx && !music) return;

    // araç durumu (guard'lı okuma)
    var throttle = clamp(vehicle.throttle, 0, 1);
    var speed = Math.abs(num(vehicle.vx, 0));
    var onGround = vehicle.onGround !== false;  // undefined -> yerde varsay
    var boost = vehicle.boostActive === true;

    // yumuşat
    S.smThrottle = lerp(S.smThrottle, throttle, smoothK(0.001, dt)); // hızlı
    S.smSpeed = lerp(S.smSpeed, speed, smoothK(0.02, dt));           // yavaş

    // ── MOTOR SESİ: mevcut Audio.updateEngine(throttle, speed) besle ──
    if (sfx && typeof Audio.updateEngine === 'function') {
      // yük modeli: boost devri/yükü artırır; havadayken serbest-devir hissi
      var effThrottle = S.smThrottle;
      if (boost) effThrottle = clamp(effThrottle + 0.35, 0, 1.3);
      if (!onGround) effThrottle = clamp(effThrottle * 0.6 + 0.25, 0, 1.3);
      var effSpeed = clamp(S.smSpeed, 0, 100000);
      // NaN guard (updateEngine setTargetAtTime kullanır — kirli değer çökertmesin)
      if (isFinite(effThrottle) && isFinite(effSpeed)) {
        try { Audio.updateEngine(effThrottle, effSpeed); } catch (e) {}
      }
    }

    // ── REAKTİF MÜZİK: musicGain üzerinden ince yoğunluk modülasyonu ──
    if (music && S.musicBase !== null &&
        Audio.musicGain && Audio.musicGain.gain && Audio.ctx) {
      // hız normalize (~800 referans üst hız) + boost + hava katkısı
      var speedNorm = clamp(S.smSpeed / 800, 0, 1);
      var target = speedNorm * 0.7;
      if (boost) target += 0.25;
      if (!onGround) target += 0.15;
      target = clamp(target, 0, 1);

      S.intensity = lerp(S.intensity, target, smoothK(0.05, dt));

      // tabanın etrafında yumuşak modülasyon: en fazla +%35
      var g = clamp(S.musicBase * (1 + S.intensity * 0.35), 0, 1.5);
      if (isFinite(g)) {
        try { Audio.musicGain.gain.setTargetAtTime(g, Audio.ctx.currentTime, 0.15); } catch (e) {}
      }
    }
  }

  // ── dışa aç ───────────────────────────────────────────────────────
  var DynamicAudio = {
    update: update,
    onRunStart: onRunStart,
    onRunEnd: onRunEnd
  };

  if (typeof global !== 'undefined') global.DynamicAudio = DynamicAudio;
  if (typeof module !== 'undefined' && module.exports) module.exports = DynamicAudio;

})(typeof window !== 'undefined' ? window : this);
