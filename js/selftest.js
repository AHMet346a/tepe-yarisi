'use strict';
// ============================================================================
//  selftest.js  ·  Kendi kendine yeten + KENDİ KENDİNE KURULAN sağlık kontrolü
// ----------------------------------------------------------------------------
//  AMAÇ: Açılışta otomatik "health check" — tüm kritik modüllerin yüklendiğini
//  ve beklenen API'lerin (draw/handleClick vb.) mevcut olduğunu doğrular.
//  Bir modül eksik/bozuksa geliştiriciye konsolda NET rapor verir (regresyon
//  yakalama). Ayrıca birkaç saf-mantık invaryant testi çalıştırır.
//
//  KULLANIM: index.html'de EN SON script olarak (main.js'den SONRA) yüklenir.
//  DOMContentLoaded'dan ~1.2sn sonra kendi kendine bir kez çalışır.
//
//  KURALLAR:
//   · Oyunu ASLA engellemez/yavaşlatmaz — tek seferlik, hafif.
//   · GERÇEK kayıt verisini BOZMAZ (yalnızca '__selftest__' test anahtarı,
//     o da hemen silinir). Başka localStorage yazımı YOK.
//   · Her kontrol try/catch içinde: biri patlarsa diğerleri devam eder.
// ============================================================================

const SelfTest = {

  // ── Kritik global modüller (bare-identifier güvenli çözücüler) ────────────
  //    NOT: Modüller top-level `const X = {}` olduğundan bare identifier ile
  //    erişilir (bazıları ayrıca window.X'e de atanır). `typeof X` her iki
  //    durumda da güvenlidir; tanımsızsa ReferenceError atmadan 'undefined' verir.
  _REFS: {
    // Çekirdek
    SaveData:       function () { return typeof SaveData       !== 'undefined' ? SaveData       : undefined; },
    UI:             function () { return typeof UI             !== 'undefined' ? UI             : undefined; },
    Game:           function () { return typeof Game           !== 'undefined' ? Game           : undefined; },
    Physics:        function () { return typeof Physics        !== 'undefined' ? Physics        : undefined; },
    Camera:         function () { return typeof Camera         !== 'undefined' ? Camera         : undefined; },
    Renderer:       function () { return typeof Renderer       !== 'undefined' ? Renderer       : undefined; },
    Audio:          function () { return typeof Audio          !== 'undefined' ? Audio          : undefined; },
    Particles:      function () { return typeof Particles      !== 'undefined' ? Particles      : undefined; },
    Terrain:        function () { return typeof Terrain        !== 'undefined' ? Terrain        : undefined; },
    Economy:        function () { return typeof Economy        !== 'undefined' ? Economy        : undefined; },
    Main:           function () { return typeof Main           !== 'undefined' ? Main           : undefined; },
    // Yeni modüller
    PaintShop:      function () { return typeof PaintShop      !== 'undefined' ? PaintShop      : undefined; },
    DailyQuests:    function () { return typeof DailyQuests    !== 'undefined' ? DailyQuests    : undefined; },
    SkillTree:      function () { return typeof SkillTree      !== 'undefined' ? SkillTree      : undefined; },
    StatsPanel:     function () { return typeof StatsPanel     !== 'undefined' ? StatsPanel     : undefined; },
    Prestige:       function () { return typeof Prestige       !== 'undefined' ? Prestige       : undefined; },
    BlackMarket:    function () { return typeof BlackMarket    !== 'undefined' ? BlackMarket    : undefined; },
    CardCollection: function () { return typeof CardCollection !== 'undefined' ? CardCollection : undefined; },
    LuckWheel:      function () { return typeof LuckWheel      !== 'undefined' ? LuckWheel      : undefined; },
    Profile:        function () { return typeof Profile        !== 'undefined' ? Profile        : undefined; },
    PowerModes:     function () { return typeof PowerModes     !== 'undefined' ? PowerModes     : undefined; },
    Replay:         function () { return typeof Replay         !== 'undefined' ? Replay         : undefined; },
    ShopOffers:     function () { return typeof ShopOffers     !== 'undefined' ? ShopOffers     : undefined; },
    DynamicAudio:   function () { return typeof DynamicAudio   !== 'undefined' ? DynamicAudio   : undefined; },
    Intro:          function () { return typeof Intro          !== 'undefined' ? Intro          : undefined; }
  },

  // Sırayla kontrol edilecek kritik global adları
  _CRITICAL: [
    'SaveData','UI','Game','Physics','Camera','Renderer','Audio','Particles','Terrain','Economy','Main',
    'PaintShop','DailyQuests','SkillTree','StatsPanel','Prestige','BlackMarket','CardCollection',
    'LuckWheel','Profile','PowerModes','Replay','ShopOffers','DynamicAudio','Intro'
  ],

  // Ekran-modülleri: draw + handleClick FONKSİYON olmalı.
  //   (DynamicAudio bir ses sistemi olduğundan ekran API'si yoktur → hariç.)
  _SCREENS: [
    'PaintShop','DailyQuests','SkillTree','StatsPanel','Prestige','BlackMarket','CardCollection',
    'LuckWheel','Profile','PowerModes','Replay','ShopOffers','Intro'
  ],

  // ── Bir modülü güvenle çöz (tanımsızsa undefined) ─────────────────────────
  _resolve: function (name) {
    const fn = this._REFS[name];
    if (typeof fn !== 'function') return undefined;
    try { return fn(); } catch (_) { return undefined; }
  },

  // ── run(): tüm kontrolleri çalıştır → {passed, failed, results:[]} ─────────
  run: function () {
    const results = [];
    const self = this;

    // Küçük yardımcı: bir kontrolü try/catch içinde çalıştır ve kaydet.
    //   fn → true/false döndürmeli (veya {ok, detail}); patlarsa fail.
    function check(name, fn) {
      let ok = false, detail = '';
      try {
        const r = fn();
        if (r && typeof r === 'object') { ok = !!r.ok; detail = r.detail || ''; }
        else { ok = !!r; }
      } catch (e) {
        ok = false;
        detail = 'EXCEPTION: ' + (e && e.message ? e.message : String(e));
      }
      results.push({ name: name, ok: ok, detail: detail });
    }

    // ── 1) Kritik global'ler tanımlı mı? (her biri ayrı satır → net regresyon)
    this._CRITICAL.forEach(function (name) {
      check('global:' + name, function () {
        const mod = self._resolve(name);
        return { ok: mod !== undefined && mod !== null, detail: mod === undefined ? 'tanımsız (yüklenmedi?)' : '' };
      });
    });

    // ── 2) Ekran-modüllerinde draw & handleClick fonksiyon mu?
    this._SCREENS.forEach(function (name) {
      const mod = self._resolve(name);
      check('api:' + name + '.draw', function () {
        if (mod === undefined) return { ok: false, detail: 'modül yok — atlandı' };
        return { ok: typeof mod.draw === 'function', detail: typeof mod.draw === 'function' ? '' : 'draw fonksiyon değil (' + typeof mod.draw + ')' };
      });
      check('api:' + name + '.handleClick', function () {
        if (mod === undefined) return { ok: false, detail: 'modül yok — atlandı' };
        return { ok: typeof mod.handleClick === 'function', detail: typeof mod.handleClick === 'function' ? '' : 'handleClick fonksiyon değil (' + typeof mod.handleClick + ')' };
      });
    });

    // ── 3a) SaveData get/set: '__selftest__' anahtarıyla yaz-oku-sil (temizlenir)
    check('logic:SaveData.get/set', function () {
      const SD = self._resolve('SaveData');
      if (!SD) return { ok: false, detail: 'SaveData yok' };
      // En güvenli yol: get patlamamalı.
      if (typeof SD.get !== 'function') return { ok: false, detail: 'SaveData.get fonksiyon değil' };
      // set varsa tam yaz-oku-sil döngüsü (GERÇEK veriye dokunmaz).
      if (typeof SD.set === 'function') {
        const KEY = '__selftest__';
        const TOKEN = 0xC0FFEE; // 12648430
        let restored = true;
        try {
          SD.set(KEY, TOKEN);
          const readBack = SD.get(KEY);
          const ok = (readBack === TOKEN);
          // TEMİZLİK: test anahtarını kalıcı olarak sil (gerçek veriyi bozmadan).
          try {
            if (SD.data && Object.prototype.hasOwnProperty.call(SD.data, KEY)) {
              delete SD.data[KEY];
              if (typeof SD.save === 'function') SD.save();
            } else {
              SD.set(KEY, undefined);
            }
          } catch (_) { restored = false; }
          return { ok: ok, detail: ok ? (restored ? 'yaz-oku-sil OK' : 'yaz-oku OK ama temizlik şüpheli') : 'okunan değer beklenenle uyuşmadı' };
        } catch (e) {
          return { ok: false, detail: 'set/get döngüsü patladı: ' + (e.message || e) };
        }
      }
      // set yoksa: sadece get'in patlamadığını doğrula.
      SD.get('gold');
      return { ok: true, detail: 'yalnız get testi (set yok) — patlamadı' };
    });

    // ── 3b) Physics.createVehicle: yan-etkisiz oluştur, x/y/angle finite mi?
    //        (fizik ADIMI çalıştırılmaz — sadece nesne kurulur.)
    check('logic:Physics.createVehicle', function () {
      const P = self._resolve('Physics');
      if (!P) return { ok: false, detail: 'Physics yok' };
      if (typeof P.createVehicle !== 'function') return { ok: true, detail: 'createVehicle yok — atlandı' };
      // buildVehicleConfig varsa onu kullan; yoksa minimal güvenli cfg.
      let cfg;
      try {
        if (typeof buildVehicleConfig === 'function') { cfg = buildVehicleConfig('jeep'); }
      } catch (_) { cfg = undefined; }
      if (!cfg || typeof cfg !== 'object') {
        cfg = {
          id: '__selftest__', mass: 800, torque: 5000, maxSpeed: 500, fuelMax: 80,
          width: 100, height: 50,
          wheelPositions: [ { x: -30, ly: 20, r: 20 }, { x: 30, ly: 20, r: 20 } ]
        };
      }
      const v = P.createVehicle(0, 0, cfg);
      if (!v) return { ok: false, detail: 'createVehicle boş döndü' };
      const ok = isFinite(v.x) && isFinite(v.y) && isFinite(v.angle);
      return { ok: ok, detail: ok ? 'x/y/angle finite' : ('finite değil: x=' + v.x + ' y=' + v.y + ' angle=' + v.angle) };
    });

    // ── 3c) SkillTree.getBonus('coinMult') → sayı ve > 0 olmalı
    check('logic:SkillTree.getBonus(coinMult)', function () {
      const ST = self._resolve('SkillTree');
      if (!ST) return { ok: false, detail: 'SkillTree yok' };
      if (typeof ST.getBonus !== 'function') return { ok: false, detail: 'getBonus fonksiyon değil' };
      const b = ST.getBonus('coinMult');
      const ok = (typeof b === 'number') && isFinite(b) && b > 0;
      return { ok: ok, detail: ok ? ('coinMult=' + b) : ('geçersiz bonus: ' + b) };
    });

    // ── 3d) DDA.getBotBonus() → sayı olmalı (DDA yüklüyse; değilse atla)
    check('logic:DDA.getBotBonus', function () {
      const DDAref = (typeof DDA !== 'undefined') ? DDA : undefined;
      if (!DDAref) return { ok: true, detail: 'DDA yüklü değil — atlandı' };
      if (typeof DDAref.getBotBonus !== 'function') return { ok: true, detail: 'getBotBonus yok — atlandı' };
      const b = DDAref.getBotBonus();
      const ok = (typeof b === 'number') && isFinite(b);
      return { ok: ok, detail: ok ? ('botBonus=' + b) : ('sayı değil: ' + b) };
    });

    // ── Özet hesapla ──────────────────────────────────────────────────────
    let passed = 0, failed = 0;
    const fails = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].ok) passed++;
      else { failed++; fails.push(results[i]); }
    }

    // ── Konsol raporu ─────────────────────────────────────────────────────
    try {
      if (failed === 0) {
        console.log(
          '%c✔ SelfTest: ' + passed + '/' + results.length + ' kontrol GEÇTİ — tüm modüller sağlıklı.',
          'color:#4caf50;font-weight:bold;'
        );
      } else {
        console.log(
          '%c⚠ SelfTest: ' + passed + '/' + results.length + ' geçti, ' + failed + ' BAŞARISIZ.',
          'color:#ff9800;font-weight:bold;'
        );
        fails.forEach(function (f) {
          console.warn('  - [SelfTest FAIL] ' + f.name + (f.detail ? '  ->  ' + f.detail : ''));
        });
      }
    } catch (_) { /* konsol yoksa sessiz */ }

    return { passed: passed, failed: failed, results: results };
  },

  // ── autoRun(): run() + başarısızsa ekranda küçük uyarı şeridi ──────────────
  autoRun: function () {
    let res;
    try {
      res = this.run();
    } catch (e) {
      try { console.warn('[SelfTest] run() beklenmedik hata:', e); } catch (_) {}
      return;
    }
    if (res && res.failed > 0) {
      try { this._showBanner(res); } catch (_) { /* banner opsiyonel */ }
    }
    // Hepsi geçtiyse: sessiz (yalnızca run() içindeki yeşil console.log).
  },

  // ── Başarısızlıkta küçük uyarı şeridi (varsa #ahmet-error, yoksa oluştur) ──
  _showBanner: function (res) {
    if (typeof document === 'undefined') return;
    const fails = res.results.filter(function (r) { return !r.ok; });
    const msg = '⚠ SelfTest: ' + res.failed + ' kontrol başarısız → ' +
      fails.slice(0, 4).map(function (f) { return f.name; }).join(', ') +
      (fails.length > 4 ? ' …(+' + (fails.length - 4) + ')' : '') +
      '  · Ayrıntı için konsola bakın.';

    let el = document.getElementById('ahmet-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
      return;
    }
    // Yoksa hafif, tek seferlik bir şerit oluştur.
    el = document.createElement('div');
    el.id = 'selftest-error';
    el.textContent = msg;
    el.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'top:0', 'z-index:99999',
      'background:#b71c1c', 'color:#fff', 'font:12px/1.5 monospace',
      'padding:6px 12px', 'box-shadow:0 2px 8px rgba(0,0,0,.4)',
      'text-align:center', 'cursor:pointer'
    ].join(';');
    el.title = 'Kapatmak için tıklayın';
    el.addEventListener('click', function () { el.style.display = 'none'; });
    if (document.body) document.body.appendChild(el);
  }
};

// ── Global erişim ───────────────────────────────────────────────────────────
if (typeof window !== 'undefined') window.SelfTest = SelfTest;

// ── KENDİ KENDİNE KURULUM ────────────────────────────────────────────────────
//   DOMContentLoaded'dan ~1.2sn SONRA (tüm modüller + Main.init otursun diye)
//   tek sefer çalışır. Oyunu bloklamaz.
(function () {
  if (typeof document === 'undefined') return; // Node/--check ortamında etkisiz
  function schedule() {
    try {
      setTimeout(function () {
        try { SelfTest.autoRun(); }
        catch (e) { try { console.warn('[SelfTest] autoRun hata:', e); } catch (_) {} }
      }, 1200);
    } catch (_) { /* setTimeout yoksa sessiz */ }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule(); // DOMContentLoaded çoktan geçmişse hemen zamanla
  }
})();

// ── Node/CommonJS uyumu (tarayıcıda etkisiz; test/--check kolaylığı) ─────────
if (typeof module !== 'undefined' && module.exports) module.exports = SelfTest;
