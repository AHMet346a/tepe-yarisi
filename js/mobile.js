'use strict';
/* Mobile — Kapsamlı Mobil Destek Paketi (ADDITIVE, kendi kendine yeten).
   İçindekiler:
   A) Görünür dokunmatik pedallar (GAZ / FREN / NİTRO)  → Game.controlState'i sürer
   B) Performans oto-ayarı (düşük cihaz tespiti + kalite düşürme + DPR sınırı)
   C) Haptik (titreşim) — çarpma/iniş/coin/nitro
   D) Wake Lock — oyun sırasında ekran sönmesin
   E) Tam ekran
   F) Yatay-çevir uyarısı (dikeyde)
   G) Güvenli alan (çentik) + viewport
   H) PWA "Ana ekrana ekle"
   Mevcut hiçbir kodu değiştirmez; window üzerinden erişilir, DOMContentLoaded'da init olur. */

// ───────────────────────── Cihaz Tespiti ─────────────────────────
const MobileDevice = {
  isTouch() { try { return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); } catch (e) { return false; } },
  isMobile() { try { return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini|Mobile|Silk/i.test(navigator.userAgent) || (this.isTouch() && Math.min(screen.width, screen.height) < 820); } catch (e) { return false; } },
  cores() { try { return navigator.hardwareConcurrency || 4; } catch (e) { return 4; } },
  memGB() { try { return navigator.deviceMemory || 4; } catch (e) { return 4; } },
  dpr() { try { return window.devicePixelRatio || 1; } catch (e) { return 1; } },
  isLowEnd() { return this.memGB() <= 3 || this.cores() <= 4; },
  info() { return { touch: this.isTouch(), mobile: this.isMobile(), lowEnd: this.isLowEnd(), cores: this.cores(), memGB: this.memGB(), dpr: this.dpr() }; }
};

// ───────────────────────── A) Dokunmatik Pedallar ─────────────────────────
const TouchControls = {
  _root: null, _btn: {}, _rafId: 0, _visible: false, _built: false,
  // Game 'const' global (window.Game DEĞİL). Bare erişim + selfTest için window fallback.
  _game() { try { return (typeof Game !== 'undefined' && Game) ? Game : (window.Game || null); } catch (e) { return (typeof window !== 'undefined' && window.Game) || null; } },
  set(kind, on) {
    try {
      const G = this._game();
      if (!G || !G.controlState) return;
      if (kind === 'gas')   G.controlState.throttle = on ? 1 : 0;
      if (kind === 'brake') G.controlState.brake    = on ? 1 : 0;
      if (kind === 'nitro') { G.controlState.boost  = on ? 1 : 0; if (on && typeof Parts !== 'undefined' && Parts.activateNitro) { try { Parts.activateNitro(); } catch (e) {} } }
      if (on && typeof MobileHaptics !== 'undefined') { MobileHaptics.tap(kind); }
    } catch (e) {}
  },
  // ══════════════════════════════════════════════════════════════════════════
  // 🦶 GERÇEK PEDAL ÇİZİMİ (31 Tmz — kullanıcı isteği: "pedallar gerçek gaz ve
  //    fren pedalına benzesin", dikdörtgen şekil)
  // ══════════════════════════════════════════════════════════════════════════
  // NEDEN FOTOĞRAF DEĞİL: telifsiz kaynaklar (Wikimedia Commons + Pixabay)
  // taranıp adaylar OYUNDAKİ GERÇEK BOYUTTA (56/80/96 px) yan yana ölçüldü.
  // Bulunan her fotoğraf ayak boşluğu çekimiydi: karanlık, açılı, halı/mekanizma
  // dolu → 80 px'te gri-siyah lekeye dönüşüyor. Ayrıca en iyi iki aday CC BY-SA
  // (bulaşıcı lisans: türev iş de aynı lisansla paylaşılmalı) → oyun için uygun
  // değil. Tek "izole" aday zaten fotoğraf değil, vektör çizimdi.
  // ▶ Bu yüzden pedal SVG olarak ÇİZİLDİ: her boyutta keskin, ~1,6 KB, telif yok.
  //
  // 🔴 SVG GÖMÜLÜ (data-URI/ayrı dosya DEĞİL). Sebep: ayrı .svg dosyası sw.js
  //   ASSETS listesine eklenmeyi ve 404/önbellek riskini beraberinde getirir —
  //   31 Tmz'de "gorsel.js Unexpected token '<'" felaketi tam olarak buydu.
  //   Gömülü SVG'de indirilecek dosya YOK, dolayısıyla 404 da YOK.
  // HCR2 TARZI (kullanıcı kararı): GÜMÜŞ · RENK KODU YOK · YAZI YOK · kalın koyu
  // kontur · çizgi film gölgelendirmesi. Referans: Hill Climb Racing 2 mağaza
  // ekran görüntüsü incelendi — pedalları dikdörtgen, 2×3 delikli, montaj kollu,
  // gümüş ve etiketsiz; sol=fren sağ=gaz ayrımı KONUMDAN anlaşılıyor.
  // ⚠ Bu bir TAKLİT DEĞİL, aynı gerçek nesnenin (delikli spor pedal) kendi
  //   çizimimiz. Düzen/konvansiyon (iki pedal, sol fren sağ gaz) tür geleneği ve
  //   gerçek araç düzeni; kopyalanan bir çizim varlığı YOK.
  _pedalSvg(o) {
    const genis = !!o.genis, W = genis ? 108 : 88, H = 138, PW = W - 16, PH = H - 40;
    const KONTUR = '#242a38';
    let delik = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      const cx = W / 2 + (c - 0.5) * (genis ? 36 : 30), cy = 26 + r * ((PH - 30) / 2);
      delik += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="11" ry="9.5" fill="#5d6472"/>'
        + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="11" ry="9.5" fill="none" stroke="' + KONTUR + '" stroke-width="3"/>'
        + '<ellipse cx="' + cx + '" cy="' + (cy + 1.6) + '" rx="8" ry="6.6" fill="#3b4150"/>'
        + '<ellipse cx="' + (cx - 2.6) + '" cy="' + (cy - 3) + '" rx="3.4" ry="2.2" fill="#fff" opacity=".22"/>';
    }
    // ═══════════════════════════════════════════════════════════════════════
    // ⚡ PERF(31 Tmz) — GÖLGE CSS `filter`'DAN SVG'NİN İÇİNE ALINDI
    // ═══════════════════════════════════════════════════════════════════════
    // ESKİ: `.mc-btn .mc-svg{ filter:drop-shadow(0 5px 11px rgba(0,0,0,.6)) }`
    // CSS `filter` elemanı AYRI bir kompozit yüzeyine taşır ve o yüzey, üstünde
    // durduğu tuval her karede yeniden boyandığı için sürekli yeniden filtreye
    // sokulur. Üstüne `.mc-active{filter:brightness(1.22)}` + `transition:filter`
    // vardı → pedala her basışta ~5 kare boyunca İKİ filtre zinciri birden
    // yeniden hesaplanıyordu (mobil GPU'da en pahalı işlerden biri).
    // ▶ Gölge artık SVG'nin KENDİ içeriği: bir kez rasterlenir ve önbelleklenir.
    // ⚠ GÖRÜNTÜ AYNI: CSS `drop-shadow(0 5px 11px)` bulanıklık YARIÇAPI verir,
    //   SVG `feDropShadow` SAPMA (stdDeviation) ister → 11 / 2 = 5.5. Renk ve
    //   opaklık birebir (#000 / .6), kaydırma birebir (dx=0, dy=5).
    // ⚠ `x/y/width/height` genişletilmeli, yoksa gölge filtre kutusunda kırpılır
    //   (varsayılan kutu -%10..+%10; 5.5 sapma ~17 px yayılır).
    // 🔴 `viewBox` DEĞİŞTİRİLMEDİ (bilerek). Gölge için viewBox'ı büyütmek
    //   en-boy oranını bozar (88/138=0,638 → 116/166=0,699) ve `preserveAspectRatio`
    //   pedalı KÜÇÜLTÜR — yani görüntü değişirdi. Bunun yerine SVG kökünün
    //   `overflow:visible` olması yeterli: içerik ölçüsü aynı kalır, gölge kutu
    //   dışına taşabilir (CSS drop-shadow da tam olarak bunu yapıyordu).
    const golge = '<filter id="g' + o.id + '" x="-25%" y="-25%" width="150%" height="150%">'
      + '<feDropShadow dx="0" dy="5" stdDeviation="5.5" flood-color="#000" flood-opacity="0.6"/></filter>';
    return '<svg class="mc-svg" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      + '<defs>' + golge
      + '<linearGradient id="m' + o.id + '" x1=".15" y1="0" x2=".85" y2="1">'
      + '<stop offset="0" stop-color="#f4f6fa"/><stop offset=".38" stop-color="#d2d8e2"/>'
      + '<stop offset=".72" stop-color="#a6adbb"/><stop offset="1" stop-color="#818897"/></linearGradient>'
      + '<linearGradient id="p' + o.id + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      + '</defs>'
      // Gölge TÜM içeriğe bir kez uygulanır (CSS drop-shadow'un yaptığı gibi):
      // parça parça uygulanırsa parçalar birbirinin üstüne gölge düşürür.
      + '<g filter="url(#g' + o.id + ')">'
      // montaj kolu — alt kenardan TAŞAR (HCR2 gibi), ucu ekran dışında kalır
      + '<rect x="' + (W / 2 - 11) + '" y="' + (PH - 6) + '" width="22" height="' + (H - PH + 6) + '" rx="6"'
      + ' fill="#9aa1af" stroke="' + KONTUR + '" stroke-width="5"/>'
      // pedal gövdesi (kalın kontur = çizgi film hissi)
      + '<rect x="4" y="4" width="' + (W - 8) + '" height="' + PH + '" rx="17"'
      + ' fill="url(#m' + o.id + ')" stroke="' + KONTUR + '" stroke-width="5"/>'
      + delik
      // üst parlama (düz, cizgi film tarzi)
      + '<path d="M12 ' + (PH * 0.30) + ' Q ' + (W / 2) + ' ' + (PH * 0.10) + ' ' + (W - 12) + ' ' + (PH * 0.30)
      + ' L ' + (W - 12) + ' 14 Q ' + (W / 2) + ' 8 12 14 Z" fill="url(#p' + o.id + ')"/>'
      + '</g>'
      + '</svg>';
  },

  _mkBtn(id, label, sub) {
    const b = document.createElement('div');
    b.id = 'mc_' + id;
    b.className = 'mc-btn mc-' + id;
    // Gaz/fren PEDAL olarak çizilir; nitro pedal değildir → yuvarlak kalır.
    if (id === 'gas') {
      // HCR2 tarzı: gaz DAR, fren GENİŞ; ikisi de gümüş, etiketsiz.
      b.innerHTML = this._pedalSvg({ id: 'G', genis: false });
    } else if (id === 'brake') {
      b.innerHTML = this._pedalSvg({ id: 'F', genis: true });
    } else {
      b.innerHTML = '<span class="mc-lbl">' + label + '</span>' + (sub ? '<span class="mc-sub">' + sub + '</span>' : '');
    }
    b.setAttribute('aria-label', label);
    b.setAttribute('role', 'button');
    b.style.touchAction = 'none';
    const press = (on) => (ev) => { if (ev.cancelable) ev.preventDefault(); ev.stopPropagation(); b.classList.toggle('mc-active', on); this.set(id, on); };
    // Pointer + touch (geniş uyumluluk)
    b.addEventListener('pointerdown', press(true), { passive: false });
    b.addEventListener('pointerup', press(false), { passive: false });
    b.addEventListener('pointercancel', press(false), { passive: false });
    b.addEventListener('pointerleave', press(false), { passive: false });
    b.addEventListener('touchstart', press(true), { passive: false });
    b.addEventListener('touchend', press(false), { passive: false });
    b.addEventListener('touchcancel', press(false), { passive: false });
    b.addEventListener('contextmenu', e => e.preventDefault());
    return b;
  },
  build() {
    if (this._built) return;
    try {
      const root = document.createElement('div');
      root.id = 'mc_root';
      root.style.display = 'none';
      this._btn.brake = this._mkBtn('brake', 'FREN', '◀');
      this._btn.gas   = this._mkBtn('gas', 'GAZ', '▶');
      this._btn.nitro = this._mkBtn('nitro', 'NİTRO', '🔥');
      root.appendChild(this._btn.brake);
      root.appendChild(this._btn.nitro);
      root.appendChild(this._btn.gas);
      (document.body || document.documentElement).appendChild(root);
      this._root = root;
      this._built = true;
    } catch (e) {}
  },
  show() { if (this._root && !this._visible) { this._root.style.display = 'block'; this._visible = true; } },
  hide() {
    if (this._root && this._visible) {
      this._root.style.display = 'none'; this._visible = false;
      // bırakılınca kontroller sıfırlansın
      this.set('gas', false); this.set('brake', false); this.set('nitro', false);
      ['brake', 'gas', 'nitro'].forEach(k => this._btn[k] && this._btn[k].classList.remove('mc-active'));
    }
  },
  // Oyun durumuna göre otomatik göster/gizle
  // ⚡ PERF(31 Tmz) — KENDİ rAF DÖNGÜSÜ KALDIRILDI.
  //   Bu izleyici yalnız "Game.state === 'playing'" mi diye bakıyor, ama bunun
  //   için AYRI bir requestAnimationFrame döngüsü açıyordu. Ana döngü zaten her
  //   kare koşuyor; ikinci bir döngü = kare başına fazladan JS uyanması, ayrı
  //   görev kuyruğu ve (mobilde) fazladan enerji. Artık `Main.pompaEkle()` ile
  //   ANA döngüye takılıyor. Davranış birebir aynı: kare başına bir kontrol.
  // 🔴 GÜVENLİK AĞI: `Main` yoksa ya da pompa 1,5 sn içinde hiç dönmediyse
  //   eski davranışa (kendi rAF) düşülür — pedallar ASLA kaybolmasın.
  pump() {
    try {
      const G = this._game();
      const playing = !!(G && G.state === 'playing');
      if (playing) this.show(); else this.hide();
    } catch (e) {}
  },
  _kendiRaf() {
    if (this._rafId) return;
    const tick = () => { this.pump(); this._rafId = requestAnimationFrame(tick); };
    this._rafId = requestAnimationFrame(tick);
  },
  _watch() {
    if (this._pompali || this._rafId) return;   // init() iki kez çağrılırsa çift kayıt olmasın
    const M = (typeof Main !== 'undefined' && Main) ? Main : (typeof window !== 'undefined' ? window.Main : null);
    if (M && typeof M.pompaEkle === 'function' && M.pompaEkle(() => this.pump())) {
      this._pompali = true;
      // Ana döngü gerçekten dönüyor mu? Dönmüyorsa eski yola dön.
      try { setTimeout(() => { if (!(M._pompaTik > 0)) this._kendiRaf(); }, 1500); } catch (e) { this._kendiRaf(); }
      return;
    }
    this._kendiRaf();
  },
  init() {
    if (!MobileDevice.isTouch()) return false; // sadece dokunmatik cihaz
    this.build();
    this._watch();
    return true;
  }
};

// ───────────────────────── B) Performans Oto-Ayarı ─────────────────────────
const MobilePerf = {
  _applied: false,
  particleScale() { if (!MobileDevice.isMobile()) return 1; return MobileDevice.isLowEnd() ? 0.4 : 0.7; },
  maxDpr() { return MobileDevice.isLowEnd() ? 1 : Math.min(2, MobileDevice.dpr()); },
  profile() { return { particleScale: this.particleScale(), maxDpr: this.maxDpr(), shadows: !MobileDevice.isLowEnd(), lowEnd: MobileDevice.isLowEnd() }; },
  apply() {
    if (this._applied) return this.profile();
    this._applied = true;
    const p = this.profile();
    try {
      // Mevcut kalite sistemine köprü (varsa)
      if (typeof AdaptiveQuality !== 'undefined' && AdaptiveQuality.enable) AdaptiveQuality.enable();
      if (typeof Quality !== 'undefined') {
        if (p.lowEnd && Quality.setLevel) Quality.setLevel('low');
        else if (Quality.setParticleScale) Quality.setParticleScale(p.particleScale);
      }
      // Parçacık bütçesi (varsa)
      if (typeof Particles !== 'undefined' && Particles.setBudget) Particles.setBudget(p.lowEnd ? 120 : 260);
      // Global bayrak — diğer sistemler okuyabilsin
      window.MOBILE_PROFILE = p;
    } catch (e) {}
    return p;
  }
};

// ───────────────────────── C) Haptik (Titreşim) ─────────────────────────
const MobileHaptics = {
  enabled: true,
  _can() { try { return this.enabled && typeof navigator.vibrate === 'function'; } catch (e) { return false; } },
  vibrate(ms) { if (this._can()) { try { navigator.vibrate(ms); } catch (e) {} } },
  tap(kind) { if (kind === 'nitro') this.vibrate(25); else this.vibrate(12); },
  crash() { this.vibrate([40, 30, 60]); },
  land() { this.vibrate(18); },
  coin() { this.vibrate(8); },
  win() { this.vibrate([30, 40, 30, 40, 80]); },
  toggle() { this.enabled = !this.enabled; return this.enabled; },
  // EventBus varsa oyun olaylarına otomatik bağlan
  hook() {
    try {
      if (typeof EventBus === 'undefined' || !EventBus.on) return;
      EventBus.on('crash', () => this.crash());
      EventBus.on('land', () => this.land());
      EventBus.on('coin', () => this.coin());
      EventBus.on('flip', () => this.vibrate(15));
      EventBus.on('run:win', () => this.win());
    } catch (e) {}
  }
};

// ───────────────────────── D) Wake Lock (ekran açık kalsın) ─────────────────────────
const WakeLock = {
  _lock: null, _want: false,
  async request() {
    this._want = true;
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        this._lock = await navigator.wakeLock.request('screen');
        this._lock.addEventListener('release', () => { this._lock = null; });
        return true;
      }
    } catch (e) {}
    return false;
  },
  async release() { this._want = false; try { if (this._lock) { await this._lock.release(); this._lock = null; } } catch (e) {} },
  init() {
    try {
      document.addEventListener('visibilitychange', () => {
        if (this._want && document.visibilityState === 'visible' && !this._lock) this.request();
      });
    } catch (e) {}
  }
};

// ───────────────────────── E) Tam Ekran ─────────────────────────
const MobileFullscreen = {
  isFull() { try { return !!(document.fullscreenElement || document.webkitFullscreenElement); } catch (e) { return false; } },
  enter() {
    try {
      const el = document.documentElement;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (fn) { fn.call(el); return true; }
    } catch (e) {}
    return false;
  },
  exit() { try { const fn = document.exitFullscreen || document.webkitExitFullscreen; if (fn) fn.call(document); } catch (e) {} },
  toggle() { return this.isFull() ? (this.exit(), false) : this.enter(); }
};

// ───────────────────────── F) Yatay-Çevir Uyarısı ─────────────────────────
const OrientationHint = {
  _el: null,
  _build() {
    if (this._el) return;
    try {
      const d = document.createElement('div');
      d.id = 'mc_rotate';
      d.innerHTML = '<div class="mc-rot-inner"><div class="mc-rot-icon">📱↻</div><div>En iyi deneyim için telefonu <b>yan çevir</b></div></div>';
      d.style.display = 'none';
      (document.body || document.documentElement).appendChild(d);
      this._el = d;
    } catch (e) {}
  },
  _isPortrait() { try { return (window.innerHeight > window.innerWidth); } catch (e) { return false; } },
  check() {
    if (!this._el) return;
    const show = MobileDevice.isMobile() && this._isPortrait();
    this._el.style.display = show ? 'flex' : 'none';
  },
  init() {
    if (!MobileDevice.isMobile()) return false;
    this._build();
    const c = () => this.check();
    try {
      window.addEventListener('resize', c);
      window.addEventListener('orientationchange', () => setTimeout(c, 150));
    } catch (e) {}
    this.check();
    return true;
  }
};

// ───────────────────────── G) Güvenli Alan (çentik) ─────────────────────────
const SafeArea = {
  insets() {
    const g = (v) => { try { return parseInt(getComputedStyle(document.documentElement).getPropertyValue(v)) || 0; } catch (e) { return 0; } };
    return { top: g('--sat'), right: g('--sar'), bottom: g('--sab'), left: g('--sal') };
  }
};

// ───────────────────────── H) PWA Kur → js/install.js'e TAŞINDI ─────────────────────────
// 28 Tmz: `InstallPrompt` buradan `js/install.js`'e alındı. Sebep: bu dosya artık
// yalnızca telefon/tablette yükleniyor (cihaz ayrımı), ama kurulum butonu
// masaüstünde de gerekli. install.js her cihazda yüklenir ve kendi kendine başlar.
// ⚠ Buraya tekrar `const InstallPrompt` YAZMA — iki dosya da mobilde yüklendiği
//   için top-level const çakışması olur ve TÜM oyun çöker.

// ───────────────────────── Stil (JS'ten enjekte — index.html'i değiştirmez) ─────────────────────────
function _mobileInjectCSS() {
  if (document.getElementById('mc_css')) return;
  const css = `
  :root{ --sat:env(safe-area-inset-top,0px); --sar:env(safe-area-inset-right,0px); --sab:env(safe-area-inset-bottom,0px); --sal:env(safe-area-inset-left,0px); }
  #mc_root{ position:fixed; inset:0; z-index:9000; pointer-events:none; }
  /* BUGFIX(31 Tmz) — PEDALLAR TELEFONDA DEV GIBIYDI.
     Eski boyut: width/height = 19vw (max 130px, min 78px).
     HATA: olcu YALNIZ GENISLIGE (vw) bakiyordu. Telefon YATAYKEN vw uzun kenar,
     vh ise KISA kenardir — yani asil kisit yukseklik. 915x335 CSS px'lik bir
     yatay ekranda 19vw = 174px -> 130px'e kelepcelenıyor, ama bu ekran
     YUKSEKLIGININ %39'u demek. Pedal ekranin yarisini kapliyordu.
     Artik uc kisit birden: vmin (yon ne olursa olsun kisa kenar), vh (yatayda
     gercek kisit) ve mutlak px tavani. Hangisi kucukse o kazanir.
     UYARI: min-width/min-height 56px, dokunma hedefi 44 px kuralinin ALTINA
     dusmesin diye (dogrula-mobil.js bunu kontrol ediyor).
     UYARI: bu blok bir template literal ICINDE — backtick karakteri KULLANMA,
     dizeyi erken kapatir ve tum dosya sozdizimi hatasi verir. */
  /* PEDAL (gaz/fren): dikdortgen, SVG ile cizilir. Olcu YINE uc kisitli
     (vmin + vh + mutlak tavan) — bkz. yukaridaki not. Pedal DIK dikdortgen
     oldugu icin YUKSEKLIK verilir, genislik en-boy oraniyla turetilir (0.667).
     Yatay telefonda (H=335) : yukseklik 26vh = 87px, genislik 58px
     Kucuk telefon  (H=300) : 78 x 52 px      Tablet (H=820): 108 x 72 px
     Ikisi de 44 px dokunma hedefinin USTUNDE. */
  /* HCR2 TARZI YERLESIM (31 Tmz, kullanici karari):
     · pedal ALT KENARDAN TASAR → montaj kolunun ucu ekran disinda kalir.
       Boylece pedal daha buyuk ve "yere basmis" gorunur, ama ekrandan daha az
       yer yer. GORUNEN yukseklik hala 44 px kuralinin USTUNDE (asagida olculdu).
     · pedallar DISA DOGRU EGIK (gercek ayak boslugu perspektifi).
       ⚠ transform-origin ALT ORTA olmali; merkez olursa pedal yana kayar ve
         ekran kenarindan tasar.
     ⚠ Egim transform ile veriliyor, basma efekti de transform kullaniyor ->
       ikisi AYNI kuralda birlestirilmeli, yoksa basinca egim SIFIRLANIR.
     ⚠ BU BLOK TEMPLATE LITERAL ICINDE — backtick YAZMA (ikinci kez dusuldu). */
  .mc-btn{ position:fixed; bottom:calc(-13px + var(--sab));
    height:min(22vmin, 29vh, 118px); width:calc(min(22vmin, 29vh, 118px) * 0.638);
    min-height:78px; min-width:50px;
    display:flex; align-items:center; justify-content:center;
    font:700 clamp(10px, 3.4vmin, 14px)/1 system-ui,sans-serif; color:#fff; user-select:none; -webkit-user-select:none;
    pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent;
    transform-origin:50% 100%;
  /* PERF(31 Tmz) — GECISTEN filter CIKARILDI, opacity KONDU.
     ⚠ BU BLOK TEMPLATE LITERAL ICINDE — backtick YAZMA (ucuncu kez dusuldu).
     ESKI hal: gecis listesinde transform ILE BIRLIKTE filtre de vardi
     (.07s), ustune .mc-active parlaklik filtresi uyguluyordu.
     Bir CSS filtresini GECISLE canlandirmak, o 70 ms boyunca HER KAREDE elemani
     (ve altindaki SVG golgesini) yeniden filtreye sokar. Gaz pedali oyun
     boyunca surekli basili tutuldugu icin bu mobil GPU'da bos yere tekrarlanan
     en pahali istir. opacity ise saf kompozitor isi — GPU'da bedava.
     GORUNTU: dinlenmede ve basiliyken kare AYNI; yalnizca parlaklik gecisi
     ani, konum/olcek gecisi eskisi gibi yumusak. */
    transition:transform .07s ease-out, opacity .07s ease-out; opacity:.97; }
  /* PERF(31 Tmz) — CSS drop-shadow KALDIRILDI, golge SVG'nin ICINE
     (feDropShadow) alindi. CSS filter elemani ayri bir kompozit yuzeyine tasir;
     altindaki tuval her karede yeniden boyandigi icin bu yuzey surekli yeniden
     filtreleniyordu. SVG ici filtre statik icerigin parcasidir, BIR KEZ rasterlenir.
     ⚠ overflow:visible SART — golge SVG kutusunun disina tasiyor (CSS
       drop-shadow da oyle yapiyordu). Bu olmazsa golge kenardan kirpilir. */
  .mc-btn .mc-svg{ width:100%; height:100%; display:block;
    overflow:visible; pointer-events:none; }
  .mc-btn .mc-sub{ font-size:clamp(11px, 4vmin, 17px); margin-top:1px; opacity:.9; }
  /* Fren pedali GENIS (gercek araclarda da oyle) */
  .mc-brake{ left:calc(8px + var(--sal)); width:calc(min(22vmin, 29vh, 118px) * 0.782); min-width:60px;
    transform:rotate(-7deg); }
  .mc-gas{ right:calc(8px + var(--sar)); transform:rotate(7deg); }
  /* Basinca pedal ICERI COKER — egim KORUNARAK (ayni transform zincirinde).
     ⚠ brightness() DURUYOR (basili gorunum ayni kalsin diye) ama artik
       GECISTE DEGIL: tek seferde uygulanir, 70 ms boyunca her kare degil. */
  .mc-brake.mc-active{ transform:rotate(-7deg) translateY(5px) scale(.93); filter:brightness(1.22); opacity:1; }
  .mc-gas.mc-active{   transform:rotate(7deg)  translateY(5px) scale(.93); filter:brightness(1.22); opacity:1; }
  /* Nitro: gaz pedalinin SOLUNA otursun. Sag bosluk = gaz genisligi + aralik;
     gaz genisligi artik min() oldugu icin burada AYNI min() tekrarlanmali,
     yoksa iki buton ust uste biner. */
  /* NITRO pedal DEGILDIR (gercek arabada boyle bir pedal yok) → YUVARLAK kalir.
     Sag boslugu GAZ PEDALININ genisligiyle ayni ifadeyi tekrar etmeli, yoksa
     iki buton ust uste biner. Gaz genisligi: min(...) * 0.667 */
  .mc-nitro{ right:calc(18px + var(--sar) + min(20vmin, 26vh, 108px) * 0.667);
    bottom:calc(16px + var(--sab));
    width:min(11.5vmin, 17vh, 72px); height:min(11.5vmin, 17vh, 72px);
    min-width:48px; min-height:48px;
    flex-direction:column; border-radius:50%;
    background:radial-gradient(circle at 35% 30%, #7cc6ff, #2a5fd6);
    border:2px solid rgba(255,255,255,.35); box-shadow:0 4px 18px rgba(0,0,0,.4);
    font-size:clamp(9px, 2.8vmin, 12px); }
  .mc-nitro.mc-active{ transform:scale(.9); opacity:1;
    box-shadow:0 2px 10px rgba(0,0,0,.5), 0 0 0 4px rgba(255,255,255,.15) inset; }
  #mc_rotate{ position:fixed; inset:0; z-index:9500; background:rgba(8,12,22,.94); color:#e8eef7;
    display:none; align-items:center; justify-content:center; text-align:center; font:600 18px/1.5 system-ui,sans-serif; padding:24px; }
  #mc_rotate .mc-rot-icon{ font-size:52px; margin-bottom:14px; animation:mcRot 1.6s ease-in-out infinite; }
  @keyframes mcRot{ 0%,100%{ transform:rotate(0) } 50%{ transform:rotate(-90deg) } }
  #mc_install{ position:fixed; top:calc(10px + var(--sat)); left:50%; transform:translateX(-50%); z-index:9600;
    background:#ff8a3d; color:#1a1000; font:700 14px system-ui,sans-serif; padding:9px 16px; border-radius:20px;
    box-shadow:0 4px 14px rgba(0,0,0,.4); cursor:pointer; display:none; }
  @media (min-width:900px) and (pointer:fine){ #mc_root{ display:none !important; } }
  `;
  try {
    const s = document.createElement('style'); s.id = 'mc_css'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {}
}

// ───────────────────────── Ana Mobil Nesnesi ─────────────────────────
const Mobile = {
  version: '1.0',
  // InstallPrompt listeden çıkarıldı (28 Tmz) — artık js/install.js'te, her cihazda.
  systems: ['MobileDevice', 'TouchControls', 'MobilePerf', 'MobileHaptics', 'WakeLock', 'MobileFullscreen', 'OrientationHint', 'SafeArea'],
  _inited: false,
  init() {
    if (this._inited) return; this._inited = true;
    try {
      _mobileInjectCSS();
      MobilePerf.apply();
      // InstallPrompt.init() KALDIRILDI — js/install.js kendi kendine başlıyor.
      WakeLock.init();
      MobileHaptics.hook();
      if (MobileDevice.isTouch()) {
        TouchControls.init();
        OrientationHint.init();
        // Oyun başlarken ekran açık kalsın + (kullanıcı hareketiyle) tam ekran denenir
        try {
          document.addEventListener('pointerdown', function _once() {
            WakeLock.request();
            // Mobil ses kilidini aç (ilk kullanıcı hareketi gerekir)
            try {
              if (typeof Audio !== 'undefined') {
                if (Audio.unlock) Audio.unlock();
                else if (Audio.resume) Audio.resume();
                else if (Audio.ctx && Audio.ctx.state === 'suspended' && Audio.ctx.resume) Audio.ctx.resume();
                else if (Audio._ctx && Audio._ctx.state === 'suspended' && Audio._ctx.resume) Audio._ctx.resume();
              }
            } catch (e) {}
            document.removeEventListener('pointerdown', _once);
          }, { once: true });
        } catch (e) {}
      }
    } catch (e) { try { console.error('[Mobile.init]', e); } catch (_) {} }
  },
  selfTest() {
    const r = {};
    try { const i = MobileDevice.info(); r.device = typeof i.touch === 'boolean' && typeof i.cores === 'number'; } catch (e) { r.device = false; }
    try { const p = MobilePerf.profile(); r.perf = typeof p.particleScale === 'number' && p.particleScale > 0 && p.particleScale <= 1; } catch (e) { r.perf = false; }
    try { r.haptics = typeof MobileHaptics.vibrate === 'function' && typeof MobileHaptics.toggle() === 'boolean'; MobileHaptics.enabled = true; } catch (e) { r.haptics = false; }
    try { r.touchcontrols = typeof TouchControls.set === 'function' && typeof TouchControls.build === 'function'; } catch (e) { r.touchcontrols = false; }
    try { r.wakelock = typeof WakeLock.request === 'function' && typeof WakeLock.release === 'function'; } catch (e) { r.wakelock = false; }
    try { r.fullscreen = typeof MobileFullscreen.toggle === 'function' && typeof MobileFullscreen.isFull() === 'boolean'; } catch (e) { r.fullscreen = false; }
    try { r.orientation = typeof OrientationHint.check === 'function' && typeof OrientationHint._isPortrait() === 'boolean'; } catch (e) { r.orientation = false; }
    try { const s = SafeArea.insets(); r.safearea = typeof s.top === 'number' && typeof s.bottom === 'number'; } catch (e) { r.safearea = false; }
    // install.js ayrı yüklendiği için window üzerinden bakılır (yoksa testi düşürme).
    try { r.install = typeof window.InstallPrompt === 'undefined' ? true : (typeof window.InstallPrompt.init === 'function' && typeof window.InstallPrompt.show === 'function'); } catch (e) { r.install = false; }
    // Pedal → controlState sürüyor mu? (gerçek _game() mekanizmasıyla)
    try {
      let G = TouchControls._game();
      if (!G || !G.controlState) { window.Game = { controlState: { throttle: 0, brake: 0, boost: 0 }, state: 'playing' }; G = window.Game; }
      const cs = G.controlState; const save = { t: cs.throttle, b: cs.brake, bo: cs.boost };
      TouchControls.set('gas', true); const g1 = cs.throttle === 1;
      TouchControls.set('gas', false); const g0 = cs.throttle === 0;
      TouchControls.set('brake', true); const b1 = cs.brake === 1;
      cs.throttle = save.t; cs.brake = save.b; cs.boost = save.bo;
      r.pedaldrive = g1 && g0 && b1;
    } catch (e) { r.pedaldrive = false; }
    r.allPass = Object.keys(r).every(k => r[k] === true);
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.MobileDevice = MobileDevice; window.TouchControls = TouchControls; window.MobilePerf = MobilePerf;
  window.MobileHaptics = MobileHaptics; window.WakeLock = WakeLock; window.MobileFullscreen = MobileFullscreen;
  window.OrientationHint = OrientationHint; window.SafeArea = SafeArea;
  // window.InstallPrompt burada AÇILMAZ — js/install.js kendisi açıyor (28 Tmz).
  window.Mobile = Mobile;
  try {
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => Mobile.init());
    else Mobile.init();
  } catch (e) {}
}
