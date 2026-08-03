'use strict';
// ═══════════════════════════════════════════════════════════════════════════
//  bagla-arayuz.js — 5 ÖLÜ ARAYÜZ/GEÇİŞ MODÜLÜNÜ GERÇEK OYUNA BAĞLAR (30 Tmz)
//
//  Bu 5 modül YAZILMIŞTI ama hiçbir yerden çağrılmıyordu (ölçüm: 0 tetiklenme):
//    ANIMATED_MENU_BG          (js/ui.js:8640)      → alt ekranların canlı fonu
//    UIAnimator                (js/ui.js:8865)      → tween motoru (update yok)
//    TransitionSystem          (js/camera.js:793)   → geçiş perdesi
//    LEVEL_TRANSITION_RENDERER (js/renderer.js:7952)→ fade/star/slide perdesi
//    SCORE_POPUP_RENDERER      (js/renderer.js:8181)→ uçan "+N" yazıları
//
//  ADDITIVE: hiçbir dosya DEĞİŞTİRİLMEDİ. Bağlama, hookups.js kalıbıyla
//  çalışma zamanı sarmalama (monkey-patch) ile yapılır.
//
// ───────────────────────────────────────────────────────────────────────────
// 🔴 1) TIKLAMA/HITBOX KURALI — EN KRİTİK
//   `UI.buttons` kutularına HİÇ DOKUNULMAZ; hiçbir buton kaydırılmaz,
//   ölçeklenmez, animasyonlanmaz. Yalnız (a) ekranın ARKA PLANI ve
//   (b) her şeyin ÜSTÜNDEKİ perde çizilir. Bu yüzden madde 29 (tıklama
//   görünenden farklı yere gider) bu dosyada FİZİKSEL OLARAK imkânsızdır.
//   `selfTest.butonlarDokunulmadi` bunu ÖLÇEREK doğrular.
//   ⚠ UIAnimator buton konumu sürmek için KULLANILMADI (aynı sebep) —
//     yalnız geçiş perdesinin alfasını sürer.
//   ⚠ `UI._kaydirmaliCiz` / `UI._kirpButonlar` / `MobilHedef.buyut`
//     mantığına dokunulmaz: hepsi `_drawScreenBg` çağrıldıktan SONRA çalışır
//     ve bizim sarmalayıcımız yalnız o fonksiyonun İÇİNİ değiştirir.
//     (`_kaydirmaliCiz` `_drawScreenBg`'yi geçici olarak boşa alır ve geri
//      koyar — bizim sarmalayıcımız da o yolla doğru şekilde saklanıp döner.)
//
// 🔴 2) GRADIENT — kare başına ÜRETİLEN gradient hedefi 0
//   `ANIMATED_MENU_BG.draw` her karede 2 gradient üretiyordu (sky + ground).
//   Modülü DEĞİŞTİRMEDEN çözmek için `ctx` bir Proxy ile sarmalanır:
//   `createLinearGradient` gerçek gradient yerine havuzdan bir "tarif"
//   döndürür; `fillStyle = tarif` atandığı anda tarif ÖNBELLEKTEN çözülür.
//   → ilk kareden sonra üretilen gradient sayısı 0 (selfTest ölçer).
//   ⚠ `getImageData` KULLANILMAZ.
//
// 🔴 3) GEÇİŞ GÜVENLİK AĞI
//   Geçiş süresi `dt` BİRİKTİREREK değil DUVAR SAATİYLE ölçülür (intro.js
//   dersi). `MAX_SURE`(1,2 sn) aşılırsa geçiş zorla kapatılır. Tıklama kilidi
//   en fazla `KILIT_MAX`(0,22 sn) sürer ve o da duvar saatinden türer →
//   kilit ASLA takılamaz.
//   ⚠ Perde YALNIZCA "aç" yönünde çalışır (ekran zaten değişmiştir, altta
//     DOĞRU ekran vardır) → görünmeyen butona basma riski yapısal olarak yok.
//
// 🔴 4) KALİTE GEÇİDİ (js/kalite.js — o dosyaya DOKUNULMADI)
//   Üç ayrı anahtarla geçitlenir, üçü de DÜŞÜK kademede kapanır:
//     dekorYogunluk ≥ 0.50 → canlı menü fonu   (dusuk 0.30 → KAPALI)
//     parcacikCarpan ≥ 0.50 → skor popup'ları  (dusuk 0.35 → KAPALI)
//     tunelVinyet   >  0    → geçiş perdesi     (dusuk 0.00 → KAPALI)
//   ⚠ `dekorYogunluk` ve `parcacikCarpan` CLAUDE.md'de "ÖLÜ ANAHTAR" diye
//     işaretliydi (tabloda var, hiçbir kod okumuyor) — artık okunuyorlar.
//
// 🔴 5) Her efekt AYRI try/catch (bug #18 dersi: tek istisna zinciri kesti).
// 🔴 6) Bare global tuzağı: `window.UI` YOKTUR → `typeof X !== 'undefined'`.
//
//  BAĞLANMAYAN (bilinçli):
//    LEVEL_TRANSITION_RENDERER.drawVictoryScreen — kare başına 9 gradient,
//      sabit 52px font (dar telefonda taşar) ve sözlükte olmayan sabit
//      İngilizce metin ('VICTORY!'); ayrıca mevcut ölüm ekranını örterdi.
//    ANIMATED_MENU_BG ana menüde (drawMenu kendi sahnesini çiziyor).
//
//  ⚠ KURULUM: bu dosya `index.html`'e (hookups.js'ten SONRA) ve `sw.js`
//    ASSETS listesine eklenmelidir. Bu görevde o iki dosyaya dokunulmadı.
//
//  Doğrulama: BaglaArayuz.selfTest().allPass === true
// ═══════════════════════════════════════════════════════════════════════════

(function () {

  // ── Bare-global erişimi (window.X YOK — CLAUDE.md "Kritik teknik tuzaklar")
  function _ui()   { try { return (typeof UI     !== 'undefined') ? UI     : null; } catch (e) { return null; } }
  function _main() { try { return (typeof Main   !== 'undefined') ? Main   : null; } catch (e) { return null; } }
  function _game() { try { return (typeof Game   !== 'undefined') ? Game   : null; } catch (e) { return null; } }
  function _cam()  { try { return (typeof Camera !== 'undefined') ? Camera : null; } catch (e) { return null; } }
  function _kalite() { try { return (typeof Kalite !== 'undefined') ? Kalite : null; } catch (e) { return null; } }
  function _mbg()  { try { return (typeof ANIMATED_MENU_BG !== 'undefined') ? ANIMATED_MENU_BG : null; } catch (e) { return null; } }
  function _uia()  { try { return (typeof UIAnimator !== 'undefined') ? UIAnimator : null; } catch (e) { return null; } }
  function _ts()   { try { return (typeof TransitionSystem !== 'undefined') ? TransitionSystem : null; } catch (e) { return null; } }
  function _ltr()  { try { return (typeof LEVEL_TRANSITION_RENDERER !== 'undefined') ? LEVEL_TRANSITION_RENDERER : null; } catch (e) { return null; } }
  function _spop() { try { return (typeof SCORE_POPUP_RENDERER !== 'undefined') ? SCORE_POPUP_RENDERER : null; } catch (e) { return null; } }

  // Duvar saati (dt BİRİKTİRME YOK — intro.js'te takılmaya bu sebep olmuştu)
  function _simdi() {
    try { if (typeof performance !== 'undefined' && performance && performance.now) return performance.now(); } catch (e) {}
    return Date.now();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  GRADIENT ÖNBELLEĞİ  (kare başına ÜRETİLEN gradient hedefi: 0)
  // ═════════════════════════════════════════════════════════════════════════
  var _grOnbellek = {};   // anahtar → gerçek CanvasGradient
  var _grAdet = 0;        // önbellekteki kayıt sayısı
  var _grYeni = 0;        // GERÇEKTEN üretilen gradient sayısı (kümülatif)
  var _havuz  = [];       // tarif havuzu — kare başına yeni nesne üretilmesin
  var _havuzN = 0;

  function _Tarif() { this.__grTarif = true; this.t = 'l'; this.a = ''; this.s = ''; }
  // Gerçek addColorStop undefined döndürür; burada dönüş değeri kullanılmıyor.
  _Tarif.prototype.addColorStop = function (o, c) { this.s += o + '~' + c + ';'; };

  function _tarifAl(tur, arg) {
    var t = _havuz[_havuzN];
    if (!t) { t = new _Tarif(); _havuz[_havuzN] = t; }
    if (_havuzN < 32) _havuzN++;        // havuz taşarsa son gözü tekrar kullan
    t.t = tur; t.a = arg; t.s = '';
    return t;
  }
  function _lgrad(x0, y0, x1, y1) { return _tarifAl('l', x0 + ',' + y0 + ',' + x1 + ',' + y1); }
  function _rgrad(x0, y0, r0, x1, y1, r1) { return _tarifAl('r', x0 + ',' + y0 + ',' + r0 + ',' + x1 + ',' + y1 + ',' + r1); }

  // ⚠ Gradient onu ÜRETEN bağlama aittir — anahtara bağlam kimliği eklenmezse
  //   ikinci bir kanvas (ör. çevrimdışı tampon) yanlış nesneyi kullanır.
  var _ctxSayac = 0;
  function _ctxId(ctx) {
    if (!ctx.__grCtxId) { _ctxSayac++; try { ctx.__grCtxId = _ctxSayac; } catch (e) { return 0; } }
    return ctx.__grCtxId;
  }

  function _coz(ctx, tarif) {
    var k = _ctxId(ctx) + '|' + tarif.t + '|' + tarif.a + '|' + tarif.s;
    var g = _grOnbellek[k];
    if (g) return g;
    var p = String(tarif.a).split(',');
    g = (tarif.t === 'l')
      ? ctx.createLinearGradient(+p[0], +p[1], +p[2], +p[3])
      : ctx.createRadialGradient(+p[0], +p[1], +p[2], +p[3], +p[4], +p[5]);
    var d = tarif.s.split(';');
    for (var i = 0; i < d.length; i++) {
      if (!d[i]) continue;
      var j = d[i].indexOf('~');
      if (j < 0) continue;
      g.addColorStop(parseFloat(d[i].slice(0, j)), d[i].slice(j + 1));
    }
    if (_grAdet >= 64) { _grOnbellek = {}; _grAdet = 0; }   // sınırsız büyüme yok
    _grOnbellek[k] = g; _grAdet++; _grYeni++;
    return g;
  }

  // ── Font kısaltıcı: font SADECE H'ye bağlı olamaz (madde 9) ──────────────
  //   ANIMATED_MENU_BG araç ikonlarını `H * 0.06` ile çiziyor; 360x800 dar-uzun
  //   telefonda bu 48 px eder. Modülü değiştirmeden, proxy'nin `font` yazma
  //   yolunda genişliğe göre kelepçelenir.
  var _FONT_RE = /(\d+(?:\.\d+)?)px/;
  function _fontKis(f, W) {
    if (!W || typeof f !== 'string') return f;
    var m = _FONT_RE.exec(f);
    if (!m) return f;
    var maks = Math.max(9, W * 0.09);
    if (!(parseFloat(m[1]) > maks)) return f;
    return f.replace(_FONT_RE, Math.round(maks) + 'px');
  }

  // ── ctx Proxy: gradient tarifi + font kelepçesi ──────────────────────────
  function _pctxYap(ctx) {
    if (typeof Proxy === 'undefined') return null;
    var bagli = {};   // metot adı → bound fonksiyon (kare başına closure ÜRETME)
    return new Proxy(ctx, {
      get: function (t, k) {
        if (k === 'createLinearGradient') return _lgrad;
        if (k === 'createRadialGradient') return _rgrad;
        var f = bagli[k];
        if (f) return f;
        var v = t[k];
        if (typeof v === 'function') { f = v.bind(t); bagli[k] = f; return f; }
        return v;
      },
      set: function (t, k, v) {
        if (v && v.__grTarif) v = _coz(t, v);
        else if (k === 'font') v = _fontKis(v, BA._sonW);
        t[k] = v;
        return true;
      }
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  var BA = {
    version: '1.0',

    // ── Ayarlar ──────────────────────────────────────────────────────────
    PERDE:      0.72,   // canlı fon üstüne konan koyu zemin alfası (kontrast)
    MAX_SURE:   1.20,   // GÜVENLİK AĞI: geçiş bundan uzun süremez (sn)
    KILIT_MAX:  0.22,   // tıklama kilidi üst sınırı (sn) — asla takılmaz
    POPUP_MAX:  12,     // aynı anda ekrandaki popup üst sınırı

    // ── Durum ────────────────────────────────────────────────────────────
    _kurulu: false, _deneme: 0,
    _loopBagli: false, _bgBagli: false, _tikBagli: false,
    _kareNo: 0, _sure: 0, _dt: 0.016, _sonNow: null,
    _sonW: 0, _sonH: 0,
    _pctx: null, _pctxHam: null,
    _bgToken: -1,
    _sonMod: undefined, _sonCoin: null,
    _gecis: null, _fadeP: 1, _animId: 0,
    _sayac: { bg: 0, anim: 0, gecis: 0, popup: 0, perde: 0 },
    _hatalar: [],

    _hata: function (yer, e) {
      if (this._hatalar.length < 20) this._hatalar.push(yer + ': ' + (e && e.message ? e.message : e));
    },

    // ── Kalite geçidi ────────────────────────────────────────────────────
    kaliteAcik: function (ad, esik) {
      var K = _kalite();
      if (!K || typeof K.ayar !== 'function') return true;   // kalite yoksa açık
      var v;
      try { v = K.ayar(ad); } catch (e) { return true; }
      if (typeof v !== 'number' || !isFinite(v)) return true;
      return v >= esik;
    },

    // ═══════════════════════════════════════════════════════════════════
    //  1) ANIMATED_MENU_BG — alt ekranların CANLI arka planı
    //     `UI._drawScreenBg` sarmalanır: önce sahne çizilir, sonra ekranın
    //     KENDİ koyu zemini yarı saydam olarak üstüne konur → metin
    //     kontrastı korunur, arkada hafif hareket görünür.
    //     ⚠ `drawMenu` bu fonksiyonu ÇAĞIRMAZ (kendi sahnesi var) → ana menü
    //       görüntüsü hiç değişmez.
    // ═══════════════════════════════════════════════════════════════════
    _bgSar: function () {
      var U = _ui();
      if (!U || U.__baglaArayuzBg) return false;
      var eski = U._drawScreenBg;
      if (typeof eski !== 'function') return false;
      U.__baglaArayuzBg = true;
      U._drawScreenBg = function (ctx, W, H, tint) {
        var cizildi = false;
        try { cizildi = BA._menuFon(ctx, W, H); }
        catch (e) { BA._hata('menufon', e); cizildi = false; }
        if (!cizildi) return eski.call(this, ctx, W, H, tint);
        // Sahnenin üstüne ORİJİNAL zemin — yarı saydam (kontrast + tint aynen)
        ctx.save();
        try { ctx.globalAlpha = BA.PERDE; eski.call(this, ctx, W, H, tint); }
        catch (e2) { BA._hata('zemin', e2); }
        finally { ctx.restore(); }
      };
      this._bgBagli = true;
      return true;
    },

    _menuFon: function (ctx, W, H) {
      if (!ctx || !(W > 0) || !(H > 0)) return false;
      var M = _mbg();
      if (!M || typeof M.draw !== 'function') return false;
      if (!this.kaliteAcik('dekorYogunluk', 0.5)) return false;

      // Kare başına EN FAZLA bir kez (bazı ekranlar zemini iki kez çizer)
      var token = this._loopBagli ? this._kareNo : Math.floor(_simdi() / 12);
      if (token === this._bgToken) return false;
      this._bgToken = token;

      this._sonW = W; this._sonH = H;
      _havuzN = 0;                                  // tarif havuzunu geri sar
      if (this._pctxHam !== ctx) { this._pctx = _pctxYap(ctx); this._pctxHam = ctx; }
      var c = this._pctx || ctx;                    // Proxy yoksa doğrudan ctx

      try { if (typeof M.update === 'function') M.update(this._dt); } catch (e) { this._hata('bgupdate', e); }
      M.draw(c, W, H, this._sure);
      this._sayac.bg++;
      return true;
    },

    // ═══════════════════════════════════════════════════════════════════
    //  2) GEÇİŞ — TransitionSystem (zaman+wipe) + LEVEL_TRANSITION_RENDERER
    //     (fade) + UIAnimator (fade alfasını süren tween).
    //     YALNIZ "aç" yönü: ekran zaten değişmiştir, perde açılarak yeni
    //     ekranı ortaya çıkarır → görünmeyen butona basma riski YOK.
    // ═══════════════════════════════════════════════════════════════════
    _gecisBaslat: function (tur, sure) {
      if (this._gecis) return false;                       // üst üste binmesin
      if (!this.kaliteAcik('tunelVinyet', 0.01)) return false;
      if (!(sure > 0)) sure = 0.32;
      this._gecis = { tur: tur, t0: _simdi(), sure: sure };
      this._fadeP = 0;
      this._sayac.gecis++;

      if (tur === 'wipe') {
        try {
          var TS = _ts();
          if (TS && typeof TS.playTransition === 'function') {
            // ⚠ TransitionSystem'in 'wipe' efekti 0→0.5'te KAPATIR, 0.5→1'de
            //   AÇAR. Bize yalnız açma yarısı lazım: süreyi iki katına alıp
            //   sayacı ortadan başlatıyoruz → saf "perde açılıyor".
            TS.playTransition('wipe', sure * 2);
            if (TS._active) TS._active.elapsed = sure;
          }
        } catch (e) { this._hata('ts-baslat', e); }
      } else {
        try {
          var UA = _uia();
          if (UA && typeof UA.animate === 'function') {
            this._animId = UA.animate(0, 1, sure, 'easeOut', function (v) {
              if (typeof v === 'number' && isFinite(v)) BA._fadeP = v;
            });
          }
        } catch (e2) { this._hata('uia-baslat', e2); }
      }
      return true;
    },

    _gecisGuncelle: function (dt) {
      var g = this._gecis;
      if (!g) return;
      var gecen = (_simdi() - g.t0) / 1000;
      // 🔴 GÜVENLİK AĞI — duvar saati otoritedir, dt biriktirilmez
      if (!isFinite(gecen) || gecen >= g.sure || gecen > this.MAX_SURE) { this._gecisBitir(); return; }
      if (g.tur === 'wipe') {
        try {
          var TS = _ts();
          if (TS && typeof TS.updateTransition === 'function') TS.updateTransition(dt);
        } catch (e) { this._hata('ts-guncelle', e); this._gecisBitir(); }
      }
      // fade: alfayı UIAnimator sürer (her karede zaten update ediliyor)
    },

    _gecisCiz: function (ctx, W, H) {
      var g = this._gecis;
      if (!g || !ctx || !(W > 0) || !(H > 0)) return;
      var p = (_simdi() - g.t0) / 1000 / g.sure;
      if (!isFinite(p)) { this._gecisBitir(); return; }
      if (p < 0) p = 0; if (p > 1) p = 1;

      ctx.save();
      try {
        if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        var cizildi = false;
        if (g.tur === 'wipe') {
          var TS = _ts();
          if (TS && typeof TS.drawTransition === 'function' && TS.isActive && TS.isActive()) {
            TS.drawTransition(ctx, W, H); cizildi = true;
          }
        }
        if (!cizildi) {
          var L = _ltr();
          // fadeIn: progress 0 → tam siyah, 1 → tamamen şeffaf (perde AÇILIR)
          var fp = (typeof this._fadeP === 'number' && isFinite(this._fadeP)) ? this._fadeP : p;
          if (g.tur !== 'fade') fp = p;
          if (L && typeof L.drawFadeIn === 'function') { L.drawFadeIn(ctx, W, H, fp); cizildi = true; }
        }
        if (cizildi) this._sayac.perde++;
      } catch (e) { this._hata('perde', e); this._gecisBitir(); }
      finally { ctx.restore(); }
    },

    _gecisBitir: function () {
      this._gecis = null;
      this._fadeP = 1;
      try { var TS = _ts(); if (TS) TS._active = null; } catch (e) {}
      try {
        var UA = _uia();
        if (UA && this._animId && typeof UA.cancel === 'function') UA.cancel(this._animId);
      } catch (e2) {}
      this._animId = 0;
    },

    // Tıklama kilidi — TAMAMEN duvar saatinden türer, takılması imkânsız.
    kilitli: function () {
      var g = this._gecis;
      if (!g) return false;
      var gecen = (_simdi() - g.t0) / 1000;
      if (!isFinite(gecen) || gecen < 0) return false;
      var sinir = Math.min(this.KILIT_MAX, g.sure * 0.5);
      return gecen < sinir;
    },

    _tikSar: function () {
      var M = _main();
      if (!M || M.__baglaArayuzTik) return false;
      M.__baglaArayuzTik = true;
      var adlar = ['_handleUIClick', '_handleTouch'];
      for (var i = 0; i < adlar.length; i++) {
        (function (ad) {
          var eski = M[ad];
          if (typeof eski !== 'function') return;
          M[ad] = function (e) {
            try {
              if (BA.kilitli()) {
                // dokunmada varsayılanı yine engelle (hayalet tıklama olmasın)
                if (e && typeof e.preventDefault === 'function' && ad === '_handleTouch') e.preventDefault();
                return;
              }
            } catch (err) { BA._hata('kilit', err); }
            return eski.apply(this, arguments);
          };
        })(adlar[i]);
      }
      this._tikBagli = true;
      return true;
    },

    // ═══════════════════════════════════════════════════════════════════
    //  3) SCORE_POPUP_RENDERER — sikke toplayınca uçan "+N"
    //     ⚠ Metin YOK (yalnız sayı) → 10 dilin hiçbirinde çeviri gerekmez.
    //     ⚠ Boyut min(H, W) ile ölçeklenir (madde 9).
    //     ⚠ hookups.js'in TAKLA/KOMBO popup'ları ayrı sistem — çakışmasın
    //       diye burada yalnız sikke olayı kullanıldı.
    // ═══════════════════════════════════════════════════════════════════
    _yaziBoyu: function (W, H) {
      return Math.max(11, Math.round(Math.min(H * 0.028, W * 0.045)));
    },

    _ekranPos: function (v, W, H) {
      var x = W * 0.5, y = H * 0.34;
      try {
        var C = _cam();
        if (C && typeof C.worldToScreen === 'function') {
          var p = C.worldToScreen(v.x, (v.y || 0) - 34);
          if (p && isFinite(p.x) && isFinite(p.y)) { x = p.x; y = p.y; }
        }
      } catch (e) { this._hata('ekranpos', e); }
      // Ekran dışına taşmasın (yazı ortalı çizilir)
      if (!(x > W * 0.14)) x = W * 0.14;
      if (x > W * 0.86) x = W * 0.86;
      if (!(y > H * 0.18)) y = H * 0.18;
      if (y > H * 0.74) y = H * 0.74;
      return { x: x, y: y };
    },

    _popupKare: function (ctx, W, H, M) {
      var SP = _spop();
      if (!SP || typeof SP.add !== 'function') return;
      var G = _game();
      var oyunda = !!(M && M.mode === 'game' && G && G.state === 'playing' && G.vehicle);
      if (!oyunda || !this.kaliteAcik('parcacikCarpan', 0.5)) {
        if (SP._popups && SP._popups.length) SP._popups.length = 0;   // sızıntı yok
        this._sonCoin = null;
        return;
      }
      var c = G.coinsCollected | 0;
      if (this._sonCoin === null) this._sonCoin = c;
      if (c > this._sonCoin) {
        var p = this._ekranPos(G.vehicle, W, H);
        SP.add(p.x, p.y, '+' + (c - this._sonCoin), '#FFD700', this._yaziBoyu(W, H));
        this._sayac.popup++;
      }
      this._sonCoin = c;
      SP.update();
      if (SP._popups.length > this.POPUP_MAX) SP._popups.splice(0, SP._popups.length - this.POPUP_MAX);
      if (!SP._popups.length) return;
      ctx.save();
      try {
        if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        SP.draw(ctx);
      } finally { ctx.restore(); }
    },

    // ═══════════════════════════════════════════════════════════════════
    //  4) KARE KANCASI — Main.loop sarmalanır
    // ═══════════════════════════════════════════════════════════════════
    _loopSar: function () {
      var M = _main();
      if (!M || M.__baglaArayuzLoop) return false;
      var eski = M.loop;
      if (typeof eski !== 'function') return false;
      M.__baglaArayuzLoop = true;
      M.loop = function (now) {
        try { BA._kareBasi(now); } catch (e) { BA._hata('karebasi', e); }
        var r = eski.apply(this, arguments);
        try { BA._kareSonu(); } catch (e2) { BA._hata('karesonu', e2); }
        return r;
      };
      this._loopBagli = true;
      return true;
    },

    _kareBasi: function (now) {
      var t = (typeof now === 'number' && isFinite(now)) ? now : _simdi();
      var dt = (this._sonNow === null) ? 0.016 : (t - this._sonNow) / 1000;
      if (!isFinite(dt) || dt < 0) dt = 0.016;
      if (dt > 0.05) dt = 0.05;
      this._sonNow = t; this._dt = dt;
      this._kareNo++; this._sure += dt;

      // UIAnimator — motoru kimse çevirmiyordu, tüm tween'ler ölüydü
      try {
        var UA = _uia();
        if (UA && typeof UA.update === 'function') {
          if (UA._animations && UA._animations.length > 64) {
            UA._animations.splice(0, UA._animations.length - 64);   // sınırsız büyüme yok
          }
          UA.update(dt);
          this._sayac.anim++;
        }
      } catch (e) { this._hata('uianimator', e); }

      // Mod değişimi → geçiş perdesi (menü ↔ oyun; UI ekran geçişinde YOK:
      // ui.js `_drawGecisEfektleri` orada zaten kendi fade'ini çiziyor)
      try {
        var M = _main();
        var mod = M ? M.mode : null;
        if (this._sonMod !== undefined && mod !== this._sonMod) {
          if (mod === 'ui') this._gecisBaslat('fade', 0.32);
          else              this._gecisBaslat('wipe', 0.42);
        }
        this._sonMod = mod;
      } catch (e2) { this._hata('mod', e2); }

      try { this._gecisGuncelle(dt); } catch (e3) { this._hata('gecis', e3); this._gecisBitir(); }
    },

    _kareSonu: function () {
      var M = _main();
      if (!M || !M.ctx || !M.canvas) return;
      var ctx = M.ctx, W = M.canvas.width, H = M.canvas.height;
      if (!(W > 0) || !(H > 0)) return;
      this._sonW = W; this._sonH = H;
      try { this._popupKare(ctx, W, H, M); } catch (e) { this._hata('popup', e); }
      try { this._gecisCiz(ctx, W, H); }    catch (e2) { this._hata('gecisciz', e2); this._gecisBitir(); }
    },

    // ── Kurulum ──────────────────────────────────────────────────────────
    init: function () {
      if (this._kurulu) return true;
      var a = false, b = false, c = false;
      try { a = this._loopSar(); } catch (e) { this._hata('loopsar', e); }
      try { b = this._bgSar();   } catch (e2) { this._hata('bgsar', e2); }
      try { c = this._tikSar();  } catch (e3) { this._hata('tiksar', e3); }
      if (a || b || c) { this._kurulu = true; return true; }
      return false;
    },

    olcum: function () {
      return {
        kare: this._kareNo,
        uretilenGradient: _grYeni,
        onbellektekiGradient: _grAdet,
        fonCizim: this._sayac.bg,
        gradientKareBasi: this._sayac.bg > 1 ? (_grYeni - 3) / (this._sayac.bg - 1) : 0,
        gecis: this._sayac.gecis,
        popup: this._sayac.popup,
        hata: this._hatalar.length
      };
    },

    // ═══════════════════════════════════════════════════════════════════
    //  selfTest — ÖLÇEREK doğrular (varsayım yok)
    // ═══════════════════════════════════════════════════════════════════
    _sahteCtx: function () {
      var gr = { adet: 0 };
      var c = {
        _gr: gr,
        globalAlpha: 1, globalCompositeOperation: 'source-over',
        fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt',
        font: '', textAlign: '', textBaseline: '', lineDashOffset: 0,
        shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
        createLinearGradient: function () { gr.adet++; return { addColorStop: function () {} }; },
        createRadialGradient: function () { gr.adet++; return { addColorStop: function () {} }; },
        save: function () {}, restore: function () {}, beginPath: function () {},
        closePath: function () {}, fill: function () {}, stroke: function () {},
        clip: function () {}, arc: function () {}, ellipse: function () {},
        rect: function () {}, roundRect: function () {}, moveTo: function () {},
        lineTo: function () {}, quadraticCurveTo: function () {}, bezierCurveTo: function () {},
        translate: function () {}, scale: function () {}, rotate: function () {},
        setTransform: function () {}, resetTransform: function () {},
        fillRect: function () {}, strokeRect: function () {}, clearRect: function () {},
        fillText: function () {}, strokeText: function () {},
        measureText: function () { return { width: 10 }; },
        setLineDash: function () {}, getLineDash: function () { return []; },
        drawImage: function () {}
      };
      return c;
    },

    selfTest: function () {
      var r = {};

      // 1) Beş modülün beşi de görünüyor mu
      r.modulMenuFon   = !!_mbg();
      r.modulAnimator  = !!_uia();
      r.modulGecis     = !!_ts();
      r.modulPerde     = !!_ltr();
      r.modulPopup     = !!_spop();

      // 2) Kancalar kurulu mu (Main/UI yoksa bu test atlanır → true)
      r.kancaLoop = _main() ? this._loopBagli : true;
      r.kancaFon  = _ui()   ? this._bgBagli   : true;
      r.kancaTik  = _main() ? this._tikBagli  : true;

      // 3) GRADIENT — ilk kare sonrası ÜRETİLEN gradient 0 olmalı
      var g0 = _grYeni, sahte = this._sahteCtx(), sayimTamam = true;
      try {
        var ph = this._pctx, phH = this._pctxHam, tok = this._bgToken, sw = this._sonW;
        this._pctx = _pctxYap(sahte); this._pctxHam = sahte;
        var M = _mbg(), uretilen = [];
        if (M) {
          for (var i = 0; i < 3; i++) {
            this._bgToken = -100 - i;                    // kare simüle et
            _havuzN = 0; this._sonW = 390;
            var once = _grYeni;
            var cc = this._pctx || sahte;
            try { M.update(0.016); } catch (e0) {}
            M.draw(cc, 390, 844, 5 + i * 0.016);
            uretilen.push(_grYeni - once);
          }
          // 1. kare önbelleği doldurur, 2. ve 3. karede ÜRETİM 0 olmalı
          r.gradientIlkKare  = uretilen[0] > 0;
          r.gradientSonraki0 = (uretilen[1] === 0 && uretilen[2] === 0);
          r.gradientSayimTutuyor = (sahte._gr.adet === uretilen[0]);
        } else {
          r.gradientIlkKare = true; r.gradientSonraki0 = true; r.gradientSayimTutuyor = true;
        }
        this._pctx = ph; this._pctxHam = phH; this._bgToken = tok; this._sonW = sw;
      } catch (e) { sayimTamam = false; this._hata('selftest-gr', e); }
      r.gradientOlcumu = sayimTamam;

      // 4) HITBOX — kancalarımız UI.buttons kutularına DOKUNMAMALI
      var U = _ui();
      if (U) {
        var yedek = U.buttons;
        U.buttons = [{ id: 'test', x: 11, y: 22, w: 33, h: 44 }];
        try { this._kareSonu(); } catch (e2) {}
        try { this._menuFon(sahte, 390, 844); } catch (e3) {}
        var b = U.buttons[0];
        r.butonlarDokunulmadi = !!(b && b.id === 'test' && b.x === 11 && b.y === 22 && b.w === 33 && b.h === 44);
        U.buttons = yedek;
      } else {
        r.butonlarDokunulmadi = true;
      }

      // 5) GEÇİŞ GÜVENLİK AĞI — süre aşılınca zorla kapanır, kilit çözülür
      try {
        this._gecisBitir();
        var basladi = this._gecisBaslat('fade', 0.32);
        if (basladi) {
          r.kilitBaslangicta = this.kilitli() === true;
          this._gecis.t0 = _simdi() - 9000;              // 9 sn geçmiş gibi
          r.kilitZamanAsiminda = this.kilitli() === false;
          this._gecisGuncelle(0.016);
          r.gecisZorlaKapandi = (this._gecis === null);
        } else {
          // kalite DÜŞÜK → geçiş kapalı; kilit de kapalı olmalı
          r.kilitBaslangicta = true;
          r.kilitZamanAsiminda = this.kilitli() === false;
          r.gecisZorlaKapandi = (this._gecis === null);
        }
        r.kilitBostaKapali = (this._gecis === null) ? (this.kilitli() === false) : true;
      } catch (e4) {
        r.kilitBaslangicta = false; r.kilitZamanAsiminda = false;
        r.gecisZorlaKapandi = false; r.kilitBostaKapali = false;
        this._hata('selftest-gecis', e4);
      }
      this._gecisBitir();

      // 6) FONT — sadece H'ye bağlı büyük font W ile kelepçelenir
      r.fontKelepce = (_fontKis('48px Arial', 360) === '32px Arial') &&
                      (_fontKis('12px Arial', 360) === '12px Arial');

      // 7) POPUP boyutu min(H, W) ile ölçeklenir + sınırlı büyür
      //   dar-uzun telefonda W, geniş-alçak (yatay) telefonda H sınırlar;
      //   taban 11 px okunabilirlik için bilinçli.
      var by = this._yaziBoyu(360, 800);
      r.popupBoyuW = (by <= Math.round(360 * 0.045) && by >= 11);
      r.popupBoyuYatay = (this._yaziBoyu(820, 360) === Math.max(11, Math.round(360 * 0.028)));
      try {
        var SP = _spop();
        if (SP) {
          var yed = SP._popups.slice();
          SP._popups.length = 0;
          for (var k = 0; k < 40; k++) SP.add(10, 10, '+1', '#fff', 12);
          if (SP._popups.length > this.POPUP_MAX) SP._popups.splice(0, SP._popups.length - this.POPUP_MAX);
          r.popupSinirli = SP._popups.length <= this.POPUP_MAX;
          SP._popups.length = 0;
          for (var m = 0; m < yed.length; m++) SP._popups.push(yed[m]);
        } else { r.popupSinirli = true; }
      } catch (e5) { r.popupSinirli = false; }

      // 8) KALİTE — üç geçidin üçü de DÜŞÜK kademede kapanmalı
      try {
        var K = _kalite();
        if (K && K._TABLO && K._TABLO.dusuk) {
          var d = K._TABLO.dusuk;
          r.kaliteDusuktekapali = (d.dekorYogunluk < 0.5) && (d.parcacikCarpan < 0.5) && !(d.tunelVinyet > 0);
          var u = K._TABLO.ultra;
          r.kaliteUltradaAcik = (u.dekorYogunluk >= 0.5) && (u.parcacikCarpan >= 0.5) && (u.tunelVinyet > 0);
        } else { r.kaliteDusuktekapali = true; r.kaliteUltradaAcik = true; }
      } catch (e6) { r.kaliteDusuktekapali = false; r.kaliteUltradaAcik = false; }

      // 9) Bağlama sırasında hata birikmemeli
      r.hatasiz = this._hatalar.length === 0;

      var hepsi = true;
      for (var anahtar in r) { if (r[anahtar] !== true) hepsi = false; }
      r.allPass = hepsi;
      r.olcum = this.olcum();
      r.hatalar = this._hatalar.slice(0, 5);
      return r;
    }
  };

  // ── Global (window.X — bare global DEĞİL, dışarıdan çağrılabilsin diye) ──
  //   ⚠ Dosya index.html'e yanlışlıkla İKİ KEZ eklenirse: kancalar zaten
  //     `__baglaArayuz*` bayrakları sayesinde İKİ KEZ kurulmaz (efekt çift
  //     uygulanmaz). Burada da KURULU olan ilk örnek korunur ki `selfTest`
  //     kurulmamış ikinci örneği ölçüp sahte "KALDI" vermesin.
  function _oncekiKurulu() {
    try {
      var g = (typeof window !== 'undefined' && window) ? window : null;
      return !!(g && g.BaglaArayuz && g.BaglaArayuz !== BA && g.BaglaArayuz._kurulu);
    } catch (e) { return false; }
  }
  if (!_oncekiKurulu()) {
    try { if (typeof window !== 'undefined' && window) window.BaglaArayuz = BA; } catch (e) {}
    try { if (typeof globalThis !== 'undefined') globalThis.BaglaArayuz = BA; } catch (e) {}
  }

  // ── Açılış ───────────────────────────────────────────────────────────────
  function _kur() {
    if (_oncekiKurulu()) return;
    var ok = false;
    try { ok = BA.init(); } catch (e) { BA._hata('init', e); }
    if (!ok && BA._deneme < 25) { BA._deneme++; setTimeout(_kur, 100); }
  }
  try {
    if (typeof document !== 'undefined' && document && document.addEventListener) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(_kur, 0); });
      } else {
        setTimeout(_kur, 0);
      }
    }
  } catch (e) {}

})();
