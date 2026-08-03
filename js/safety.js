// ============================================================================
//  safety.js  —  Kendi kendine yeten + KENDİ KENDİNE KURULAN güvenlik katmanı
// ----------------------------------------------------------------------------
//  AMAÇ: Bir ekran/modül çizim veya tıklama fonksiyonunda hata fırlatırsa
//        oyunun KARARMASINI (siyah ekran) önlemek. Hataları yakala, tek
//        seferlik / kısıtlı (throttle'lı) logla, o modülü/metodu izole et.
//
//  Bu dosya HİÇBİR başka dosyaya dokunmaz. Sadece window.Safe'i kurar ve
//  DOMContentLoaded'da güvenli modülleri otomatik sarar. localStorage YOK.
//
//  index.html'e eklenmesi: game.js'den SONRA, main.js'den ÖNCE:
//      <script src="js/game.js"></script>
//      <script src="js/safety.js"></script>   <-- BURAYA
//      <script src="js/main.js"></script>
// ============================================================================
(function () {
  'use strict';

  // ── Ayarlar ────────────────────────────────────────────────────────────
  var THROTTLE_MS       = 3000; // aynı label için ~3sn'de 1 uyarı
  var DISABLE_THRESHOLD = 5;    // bir metot bu kadar hata verirse no-op'a düşer

  // ── Durum (localStorage YOK, sadece bellek içi Map/sayaç) ──────────────
  var _lastWarn = Object.create(null); // label -> son uyarı zamanı (ms)
  var _errCount = Object.create(null); // "Modul#metot" -> hata sayısı

  function _now() {
    try {
      if (typeof performance !== 'undefined' && performance.now) {
        return performance.now();
      }
    } catch (e) {}
    return Date.now();
  }

  // Varsa index.html'deki #ahmet-error şeridine yaz; yoksa OLUŞTURMA.
  function _stripe(msg) {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return;
      var d = document.getElementById('ahmet-error');
      if (!d) return; // yoksa sadece console — yeni div oluşturma
      d.style.display = 'block';
      d.textContent = '⚠ ' + msg + '\n(kapatmak için tıkla)';
    } catch (e) {}
  }

  // Throttle'lı uyarı: aynı label için THROTTLE_MS içinde en fazla 1 kez.
  function _reportThrottled(label, err) {
    var now = _now();
    var last = _lastWarn[label];
    if (last != null && (now - last) < THROTTLE_MS) return;
    _lastWarn[label] = now;

    var msg;
    try { msg = (err && err.message) ? err.message : String(err); }
    catch (e) { msg = 'bilinmeyen hata'; }

    try { console.warn('[Safe] ' + label + ': ' + msg); } catch (e) {}
    _stripe('Safe/' + label + ': ' + msg);
  }

  // ── Ana API ─────────────────────────────────────────────────────────────
  var Safe = {
    // Ayarları dışarıdan görülebilir/ayarlanabilir yap (opsiyonel).
    THROTTLE_MS: THROTTLE_MS,
    DISABLE_THRESHOLD: DISABLE_THRESHOLD,

    // Kurulumda sarılan modüllerin adları burada listelenir.
    wrapped: [],

    /**
     * Safe.run(label, fn, fallback)
     * fn'i try/catch içinde çalıştırır. Hata olursa throttle'lı uyarı verir
     * ve fallback döndürür.
     */
    run: function (label, fn, fallback) {
      try {
        return fn();
      } catch (err) {
        _reportThrottled(label || 'run', err);
        return fallback;
      }
    },

    /**
     * Safe.wrap(obj, methods)
     * obj'in belirtilen metotlarını try/catch ile sarar.
     *  - Orijinali `_safeOrig_<m>`'e saklar.
     *  - Çift-sarmayı önler (zaten sarılıysa atlar).
     *  - Bir metot çok hata verirse (DISABLE_THRESHOLD) tamamen no-op olur;
     *    diğer metotlar etkilenmez.
     *  - fallback: 'handleClick' -> null, diğerleri (draw/update ...) -> undefined
     */
    wrap: function (obj, methods) {
      if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return obj;
      var list = methods || [];
      var label = (obj._safeName && String(obj._safeName)) || 'obj';

      for (var i = 0; i < list.length; i++) {
        (function (m) {
          var orig = obj[m];
          if (typeof orig !== 'function') return;              // metot yok
          if (obj['_safeWrapped_' + m]) return;                // zaten sarılı
          if (obj['_safeOrig_' + m] !== undefined) return;     // ekstra koruma

          obj['_safeOrig_' + m] = orig;
          obj['_safeWrapped_' + m] = true;

          var key = label + '#' + m;
          var fallback = (m === 'handleClick') ? null : undefined;

          obj[m] = function () {
            // Çok hata verdiyse metot komple devre dışı (her kare spam olmasın).
            if (_errCount[key] >= DISABLE_THRESHOLD) return fallback;
            try {
              return orig.apply(this, arguments);
            } catch (err) {
              _errCount[key] = (_errCount[key] || 0) + 1;
              _reportThrottled(key, err);
              if (_errCount[key] === DISABLE_THRESHOLD) {
                try {
                  console.warn('[Safe] ' + key +
                    ' devre dışı bırakıldı (çok fazla hata).');
                } catch (e) {}
              }
              return fallback;
            }
          };
        })(list[i]);
      }
      return obj;
    }
  };

  // ── KENDİ KENDİNE KURULUM ───────────────────────────────────────────────
  // Klasik <script>'ler aynı global lexical scope'u paylaşır; bu yüzden
  // modüllere adlarıyla doğrudan erişebiliriz. `typeof X` guard'ı, X hiç
  // tanımlı değilse bile ReferenceError atmadan güvenli çalışır.
  //
  // ÇEKİRDEK objelere (UI, Game, Physics, Main, Renderer, Camera) DOKUNMA.
  var SAFE_METHODS = ['draw', 'handleClick', 'update'];

  function _install(name, obj) {
    if (!obj || typeof obj !== 'object') return;
    try {
      obj._safeName = name;
      Safe.wrap(obj, SAFE_METHODS);
      if (Safe.wrapped.indexOf(name) === -1) Safe.wrapped.push(name);
    } catch (e) {
      try { console.warn('[Safe] wrap başarısız: ' + name); } catch (e2) {}
    }
  }

  function _installAll() {
    // Her biri için `typeof X !== 'undefined'` guard'ı (çekirdek dışı modüller).
    if (typeof PaintShop      !== 'undefined') _install('PaintShop',      PaintShop);
    if (typeof DailyQuests    !== 'undefined') _install('DailyQuests',    DailyQuests);
    if (typeof SkillTree      !== 'undefined') _install('SkillTree',      SkillTree);
    if (typeof StatsPanel     !== 'undefined') _install('StatsPanel',     StatsPanel);
    if (typeof Prestige       !== 'undefined') _install('Prestige',       Prestige);
    if (typeof BlackMarket    !== 'undefined') _install('BlackMarket',    BlackMarket);
    if (typeof CardCollection !== 'undefined') _install('CardCollection', CardCollection);
    if (typeof LuckWheel      !== 'undefined') _install('LuckWheel',      LuckWheel);
    if (typeof Profile        !== 'undefined') _install('Profile',        Profile);
    if (typeof PowerModes     !== 'undefined') _install('PowerModes',     PowerModes);
    if (typeof Replay         !== 'undefined') _install('Replay',         Replay);
    if (typeof ShopOffers     !== 'undefined') _install('ShopOffers',     ShopOffers);
    if (typeof DynamicAudio   !== 'undefined') _install('DynamicAudio',   DynamicAudio);
    if (typeof Intro          !== 'undefined') _install('Intro',          Intro);

    try {
      console.log('[Safe] Kuruldu. Sarılan modüller: ' +
        (Safe.wrapped.length ? Safe.wrapped.join(', ') : '(hiçbiri bulunamadı)'));
    } catch (e) {}
  }

  // Zaten yüklüyse hemen; değilse DOMContentLoaded'da.
  try {
    if (typeof document !== 'undefined' &&
        document.readyState !== 'loading') {
      _installAll();
    } else if (typeof document !== 'undefined') {
      document.addEventListener('DOMContentLoaded', _installAll);
    } else {
      _installAll();
    }
  } catch (e) {
    try { _installAll(); } catch (e2) {}
  }

  // ── Dışa aç ─────────────────────────────────────────────────────────────
  try { window.Safe = Safe; } catch (e) {}

})();
