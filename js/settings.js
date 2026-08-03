'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS — Tüm kullanıcı tercihleri (ses, grafik, kamera, kontroller, dil...)
// SaveData('settings') içinde kalıcı. apply() ile oyuna uygulanır.
// ═══════════════════════════════════════════════════════════════════════════
const Settings = {
  defaults: {
    music: true, sfx: true, vibrate: true,
    volMaster: 0.8,
    graphics: 'high',        // 'low' | 'med' | 'high'  (39 performans)
    cameraMode: 'normal',    // 'near' | 'normal' | 'wide' | 'cinematic'  (31)
    slowmo: true,            // 29 büyük taklada ağır çekim
    shake: true,             // 28 ekran sarsıntısı
    mobileControls: false,   // 33 ekranda gaz/fren butonları (kullanıcı seçimi)
    tutorial: true,          // 36 ilk oyun rehberi (kullanıcı seçimi)
    language: 'tr',          // 38 (varsayılan Türkçe; Ayarlar'dan İngilizce yapılabilir)

    // ── EK AYARLAR (additive; varsayılanlar mevcut davranışı korur) ──
    // Ses alt seviyeleri (volMaster ile çarpılır). music/sfx aç-kapa hâlâ geçerli.
    volMusic: 0.8,           // müzik alt ses (0..1)
    volSfx: 1.0,             // efekt alt ses (0..1)
    uiSoundFx: true,         // menü/buton tık sesleri

    // Grafik nüansı
    particleAmount: 1.0,     // partikül yoğunluğu çarpanı (0..1)
    motionBlur: false,       // hız hareket bulanıklığı (kapalı = mevcut davranış)
    reflections: 'auto',     // 'off' | 'auto' | 'high' su/parlaklık yansımaları
    antialias: true,         // kenar yumuşatma
    targetFPS: 60,           // 30 | 60 | 120 hedef kare hızı
    showFps: false,          // ekranda FPS sayacı
    dynamicResolution: false,// düşük FPS'de çözünürlüğü otomatik düşür

    // Kamera tercihleri (mevcut cameraMode korunur; bunlar ince ayar)
    cameraZoomFine: 1.0,     // manuel zoom ince ayarı (0.5..1.5)
    cameraSmoothing: 'normal', // 'tight' | 'normal' | 'loose' takip yumuşaklığı
    cameraShakeFollow: true, // sarsıntı kamerayı da etkilesin mi

    // Kontrol tercihleri
    invertControls: false,   // gaz/fren yerlerini değiştir
    controlSensitivity: 1.0, // dokunma/basış hassasiyeti (0.5..2.0)
    autoAccel: false,        // otomatik gaz (erişilebilirlik)
    hapticStrength: 1.0,     // titreşim şiddeti çarpanı (0..1)

    // HUD (gösterge) aç-kapa — varsayılan hepsi açık (mevcut görünüm)
    hudSpeedometer: true,    // hız göstergesi
    hudFuel: true,           // yakıt çubuğu
    hudDistance: true,       // mesafe sayacı
    hudCoins: true,          // para sayacı
    hudMinimap: false,       // mini harita (varsayılan kapalı = mevcut davranış)
    hudTimer: true,          // süre/tur göstergesi

    // Erişilebilirlik / görsel
    colorblindMode: 'off',   // 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia'
    highContrast: false,     // yüksek kontrast renkler
    reducedMotion: false,    // hareketi azalt (sarsıntı/partikül/blur kısılır)
    shakeAmount: 1.0,        // ekran sarsıntısı miktarı çarpanı (0..1)
    largeText: false,        // büyük yazı tipi
    damageFlash: true,       // hasar/çarpışma ekran parlaması

    // Oyun akışı
    countdownStart: true,    // yarış başında 3-2-1 geri sayım
    ghostRacer: false,       // en iyi turun hayalet aracı

    // ── EK GENEL AYARLAR (additive; varsayılanlar mevcut davranışı korur) ──
    // Kontrol düzeni / sürüş yardımı
    controlLayout: 'right',  // 'right' | 'left' ekran kontrol butonlarının tarafı
    autoNitro: false,        // otomatik nitro (erişilebilirlik; varsayılan kapalı)
    brakeAssist: false,      // otomatik fren yardımı (kapalı = mevcut davranış)
    controlDeadzone: 0.0,    // dokunma ölü bölge (0..0.4)

    // Birim / gösterim tercihleri (kozmetik; okuyan modül yoksa zararsız kalıcı)
    speedUnit: 'kmh',        // 'kmh' | 'mph' hız birimi
    distanceUnit: 'm',       // 'm' | 'ft' mesafe birimi

    // HUD ince ayar
    hudScale: 1.0,           // HUD boyut çarpanı (0.75..1.5)
    hudOpacity: 1.0,         // HUD saydamlığı (0.3..1)
    fpsCounterCorner: 'tl',  // 'tl' | 'tr' | 'bl' | 'br' FPS sayaç köşesi

    // Görsel efekt şiddeti (reducedMotion bunları da kısar)
    damageFlashAmount: 1.0,  // hasar/çarpışma parlaması şiddeti (0..1)
    flashIntensity: 1.0,     // genel ekran parlaması çarpanı (0..1)

    // Performans / sistem
    vsync: true,             // dikey senkron (kozmetik; motor destekliyorsa)
    backgroundPause: true,   // sekme arka plana geçince oyunu duraklat
    muteOnBlur: true,        // sekme arka plandayken sesi kıs

    // Güvenlik / arayüz (kozmetik no-op ama kalıcı)
    confirmReset: true,      // "tüm veriyi sil" işleminde onay iste
    menuTheme: 'auto',       // 'auto' | 'dark' | 'light' menü teması

    // ── EK GÖRSEL & AKIŞ AYARLARI (additive; varsayılanlar mevcut davranışı korur) ──
    // Görsel efekt aç-kapa / şiddet (reducedMotion bunları da kısar)
    filmGrain: false,        // sinematik film greni kaplaması (kapalı = mevcut davranış)
    filmGrainAmount: 0.5,    // film greni yoğunluğu (0..1)
    screenFlashIntensity: 1.0, // genel ekran parlaması/flash şiddeti çarpanı (0..1)
    cameraTilt: false,       // sinematik kamera yatması (yeni; kapalı = mevcut davranış)
    cameraTiltAmount: 1.0,   // kamera yatma miktarı çarpanı (0..1)
    petalAmbient: true,      // ortam yaprak/parçacık atmosferi (açık = mevcut davranış)

    // HUD görünüm tercihleri
    highContrastHud: false,  // yüksek kontrast HUD (okunabilirlik; kapalı = mevcut davranış)
    coinPopups: true,        // para toplarken +N açılır bildirimi (açık = mevcut davranış)

    // Oyun akışı yardımı
    autoRetry: false,        // başarısız olunca otomatik yeniden dene (kapalı = mevcut davranış)

    // ── EK ERİŞİLEBİLİRLİK & KALİTE AYARLARI (additive; varsayılanlar mevcut davranışı korur) ──
    // Ses ince ayar (uiSoundFx aç-kapa hâlâ geçerli; bu yalnızca alt çarpan)
    uiSoundVolume: 1.0,      // menü/buton tık sesleri alt ses çarpanı (0..1)
    // Erişilebilirlik okunabilirlik bayrakları (kozmetik; okuyan modül yoksa zararsız kalıcı)
    dyslexiaFont: false,     // disleksi dostu yazı tipi (kapalı = mevcut davranış)
    subtitles: true,         // altyazı / metin bildirimleri (açık = mevcut davranış)
    screenReaderHints: false,// ekran okuyucu ipuçları (kapalı = mevcut davranış)
    // HUD / geri bildirim
    showDamageNumbers: false // hasar/çarpışma sayısal göstergesi (kapalı = mevcut davranış)
  },

  get(k) {
    const s = (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('settings') || {}) : {};
    return (s[k] !== undefined) ? s[k] : this.defaults[k];
  },
  set(k, v) {
    const s = (typeof SaveData !== 'undefined' && SaveData.get) ? (SaveData.get('settings') || {}) : {};
    s[k] = v;
    // eski isimle uyum (audio.js 'vibration' anahtarını okur)
    if (k === 'vibrate') s.vibration = v;
    if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('settings', s);
    this.apply();
  },
  toggle(k) { this.set(k, !this.get(k)); },
  cycle(k, opts) { const i = opts.indexOf(this.get(k)); this.set(k, opts[(i + 1) % opts.length]); },

  // ── Türev değerler ──
  perfScale() { const g = this.get('graphics'); return g === 'low' ? 0.35 : g === 'med' ? 0.65 : 1; },
  shakeScale() { return this.get('shake') ? 1 : 0; },
  cameraZoomMult() {
    switch (this.get('cameraMode')) {
      case 'near':      return 1.28;
      case 'wide':      return 0.78;
      case 'cinematic': return 0.92;
      default:          return 1;
    }
  },

  // ── EK türev/yardımcı değerler (guarded; yeni anahtarlar için) ──
  // Güvenli 0..1 kıskacı (bir sayı değilse geri düşer).
  _clamp01(v, fb) { v = +v; if (!isFinite(v)) return (fb === undefined ? 1 : fb); return v < 0 ? 0 : v > 1 ? 1 : v; },
  _clampRange(v, lo, hi, fb) { v = +v; if (!isFinite(v)) return fb; return v < lo ? lo : v > hi ? hi : v; },

  // Efektif ses seviyeleri (aç-kapa + volMaster + alt seviye). Audio doğrudan kullanabilir.
  musicVolume() { return this.get('music') === false ? 0 : this._clamp01(this.get('volMaster'), 0.8) * this._clamp01(this.get('volMusic'), 0.8); },
  sfxVolume()   { return this.get('sfx')   === false ? 0 : this._clamp01(this.get('volMaster'), 0.8) * this._clamp01(this.get('volSfx'), 1.0); },
  uiVolume()    { return this.get('uiSoundFx') === false ? 0 : this.sfxVolume(); },

  // Sarsıntı ve partikül miktarı (reduced-motion bunları kısar). shakeScale ile birlikte kullanılır.
  shakeIntensity() { if (this.get('reducedMotion')) return 0; return this.shakeScale() * this._clamp01(this.get('shakeAmount'), 1.0); },
  particleScale()  { const rm = this.get('reducedMotion') ? 0.35 : 1; return this.perfScale() * this._clamp01(this.get('particleAmount'), 1.0) * rm; },
  motionBlurOn()   { return this.get('reducedMotion') ? false : this.get('motionBlur') === true; },

  // Kamera ince ayarı (mevcut cameraZoomMult ile çarpılır).
  cameraZoomMultFine() { return this.cameraZoomMult() * this._clampRange(this.get('cameraZoomFine'), 0.5, 1.5, 1.0); },
  cameraSmoothFactor() {
    switch (this.get('cameraSmoothing')) {
      case 'tight': return 0.28;
      case 'loose': return 0.08;
      default:      return 0.16;
    }
  },

  // Kontrol türevleri.
  controlSens()  { return this._clampRange(this.get('controlSensitivity'), 0.5, 2.0, 1.0); },
  hapticScale()  { return this.get('vibrate') === false ? 0 : this._clamp01(this.get('hapticStrength'), 1.0); },
  invertOn()     { return this.get('invertControls') === true; },

  // Hedef kare hızı (güvenli değerlere kıskaçlanır).
  targetFps() { const f = +this.get('targetFPS'); return (f === 30 || f === 60 || f === 120) ? f : 60; },

  // HUD gösterge açık mı? Bilinmeyen anahtarlar için varsayılan açık.
  hudShow(name) { const v = this.get('hud' + name); return v === undefined ? true : v !== false; },

  // Renk körlüğü / kontrast durumları.
  colorblind()      { const m = this.get('colorblindMode'); return (m && m !== 'off') ? m : null; },
  highContrastOn()  { return this.get('highContrast') === true; },
  reducedMotionOn() { return this.get('reducedMotion') === true; },

  // ── EK türev/yardımcı değerler (guarded; yeni anahtarlar için) ──
  // Kontrol düzeni ve sürüş yardımı.
  controlLayoutLeft() { return this.get('controlLayout') === 'left'; },
  autoNitroOn()       { return this.get('autoNitro') === true; },
  brakeAssistOn()     { return this.get('brakeAssist') === true; },
  controlDeadzoneVal(){ return this._clampRange(this.get('controlDeadzone'), 0, 0.4, 0); },

  // Birim dönüşümleri (m/s tabanlı motor için; okuyan modül isterse kullanır).
  speedIsMph()   { return this.get('speedUnit') === 'mph'; },
  distanceIsFt() { return this.get('distanceUnit') === 'ft'; },
  // Hız/mesafe birim çarpanı ve etiketi (temel değer metre-cinsi varsayılır).
  speedUnitFactor()  { return this.speedIsMph() ? 2.2369363 : 3.6; }, // m/s -> mph : km/h
  speedUnitLabel()   { return this.speedIsMph() ? 'mph' : 'km/h'; },
  distanceUnitFactor(){ return this.distanceIsFt() ? 3.2808399 : 1; }, // m -> ft : m
  distanceUnitLabel(){ return this.distanceIsFt() ? 'ft' : 'm'; },

  // HUD ince ayar çarpanları.
  hudScaleFactor()   { return this._clampRange(this.get('hudScale'), 0.75, 1.5, 1.0); },
  hudOpacityFactor() { return this._clampRange(this.get('hudOpacity'), 0.3, 1.0, 1.0); },
  fpsCorner()        { const c = this.get('fpsCounterCorner'); return (c === 'tr' || c === 'bl' || c === 'br') ? c : 'tl'; },

  // Ekran parlaması şiddeti (reducedMotion kapatır; damageFlash aç-kapa hâlâ geçerli).
  damageFlashScale() { if (this.get('reducedMotion')) return 0; return this.get('damageFlash') === false ? 0 : this._clamp01(this.get('damageFlashAmount'), 1.0) * this._clamp01(this.get('flashIntensity'), 1.0); },

  // Performans / sistem durumları.
  vsyncOn()          { return this.get('vsync') !== false; },
  backgroundPauseOn(){ return this.get('backgroundPause') !== false; },
  muteOnBlurOn()     { return this.get('muteOnBlur') !== false; },

  // Arayüz durumları.
  confirmResetOn()   { return this.get('confirmReset') !== false; },
  menuThemeVal()     { const t = this.get('menuTheme'); return (t === 'dark' || t === 'light') ? t : 'auto'; },

  // ── EK türev/yardımcı değerler (guarded; yeni görsel/akış anahtarları için) ──
  // Film greni (reducedMotion kapatır; aç-kapa + şiddet birlikte). 0 = kapalı.
  filmGrainScale()  { if (this.get('reducedMotion')) return 0; return this.get('filmGrain') === true ? this._clamp01(this.get('filmGrainAmount'), 0.5) : 0; },
  // Ekran flash/parlaması efektif şiddeti (reducedMotion kapatır). damageFlashScale'den bağımsız genel çarpan.
  screenFlashScale(){ if (this.get('reducedMotion')) return 0; return this._clamp01(this.get('screenFlashIntensity'), 1.0); },
  // Sinematik kamera yatması (reducedMotion kapatır; aç-kapa + miktar). 0 = yatma yok.
  cameraTiltOn()    { return this.get('reducedMotion') ? false : this.get('cameraTilt') === true; },
  cameraTiltScale() { return this.cameraTiltOn() ? this._clamp01(this.get('cameraTiltAmount'), 1.0) : 0; },
  // Ortam yaprak/parçacık atmosferi (reducedMotion ve partikül çarpanı ile kısılır). 0 = kapalı.
  petalAmbientScale(){ if (this.get('petalAmbient') === false) return 0; return this.particleScale(); },
  petalAmbientOn()  { return this.get('petalAmbient') !== false && !this.get('reducedMotion'); },
  // HUD görünüm tercihleri.
  highContrastHudOn(){ return this.get('highContrastHud') === true || this.highContrastOn(); },
  coinPopupsOn()    { return this.get('coinPopups') !== false; },
  // Oyun akışı: başarısızlıkta otomatik yeniden dene.
  autoRetryOn()     { return this.get('autoRetry') === true; },

  // ── EK türev/yardımcı değerler (guarded; erişilebilirlik & kalite anahtarları için) ──
  // UI tık sesi efektif seviyesi (uiSoundFx aç-kapa + sfx zinciri + alt çarpan). 0 = sessiz.
  uiSoundLevel()       { return this.get('uiSoundFx') === false ? 0 : this.sfxVolume() * this._clamp01(this.get('uiSoundVolume'), 1.0); },
  // Erişilebilirlik okunabilirlik bayrakları.
  dyslexiaFontOn()     { return this.get('dyslexiaFont') === true; },
  subtitlesOn()        { return this.get('subtitles') !== false; },
  screenReaderHintsOn(){ return this.get('screenReaderHints') === true; },
  // HUD sayısal hasar göstergesi.
  showDamageNumbersOn(){ return this.get('showDamageNumbers') === true; },

  // ── Oyuna uygula ──
  apply() {
    if (typeof Audio !== 'undefined') {
      const master = this.get('volMaster');
      if (Audio.setMasterVolume) Audio.setMasterVolume(this.get('sfx') === false && this.get('music') === false ? 0 : master);
      if (Audio.setMusicEnabled) Audio.setMusicEnabled(this.get('music') !== false);
      if (Audio.setSfxEnabled) Audio.setSfxEnabled(this.get('sfx') !== false);
      // Ek: alt ses seviyeleri (Audio destekliyorsa; guarded, geriye uyumlu)
      try {
        if (Audio.setMusicVolume) Audio.setMusicVolume(this.musicVolume());
        if (Audio.setSfxVolume)   Audio.setSfxVolume(this.sfxVolume());
      } catch (e) {}
    }
  }
};
if (typeof window !== 'undefined') { try { Settings.apply(); } catch (e) {} }
