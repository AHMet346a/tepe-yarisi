/* ============================================================
   AHMET — Tepe Yarışı
   telemetry.js  —  Hafif olay telemetrisi + FPS/performans ölçer
                    + geliştirici overlay (VARSAYILAN KAPALI)

   © Ahmet. Tüm hakları saklıdır. Özgün yapımdır.

   KENDİ KENDİNE YETEN MODÜL — başka dosyaya bağımlı değildir.
   Global: window.Telemetry

   API:
     Telemetry.log(event, data)   → halka tampona {t,event,data} ekler (ucuz)
     Telemetry.count(key)         → sayaç +1  (kaç ölüm, kaç yarış vb.)
     Telemetry.getCounters()      → {key:sayı,...} kopyası
     Telemetry.getLog()           → son olayların kopyası (yeni→eski)
     Telemetry.getStats()         → {fps, avg, min, max, low1, ms} anlık istatistik
     Telemetry.frame(dt)          → (opsiyonel) her kareden çağır — dt saniye/ms olabilir
     Telemetry.toggle() / .show() / .hide()   → overlay aç/kapa
     Telemetry.reset()            → tampon + sayaç + istatistik sıfırla

   AÇ/KAPA KISAYOLU:  Ctrl+Shift+D
     (tek harf DEĞİL — oyun içi tuşlarla çakışmasın diye)

   PERFORMANS SÖZLEŞMESİ:
     Overlay KAPALIYKEN sürekli hiçbir iş yapılmaz:
       - kendi requestAnimationFrame döngüsü ÇALIŞMAZ
       - DOM overlay ilk açılışta LAZY oluşturulur (kapalıyken DOM yok)
       - log/count çağrıları sadece ucuz dizi/sayı işlemleri yapar
     frame(dt) çağrılırsa istatistik her zaman güncel tutulur (çok ucuz),
     ama çizim yalnızca overlay açıkken ve throttle'lı yapılır.
   ============================================================ */
(function () {
  'use strict';

  var RING_MAX = 200;         // halka tampon boyu
  var STAT_WINDOW = 120;      // frame-time istatistik penceresi (kare)
  var DRAW_INTERVAL = 250;    // overlay tazeleme aralığı (ms) — ucuz tutmak için
  var TOGGLE_KEY = 'D';       // Ctrl+Shift+D

  // ---- Durum ----
  var ring = new Array(RING_MAX);   // önceden ayrılmış halka
  var ringHead = 0;                 // bir sonraki yazma indeksi
  var ringLen = 0;                  // dolu kayıt sayısı
  var counters = Object.create(null);

  // frame-time (ms) kayan pencere
  var ftBuf = new Float32Array(STAT_WINDOW);
  var ftHead = 0, ftLen = 0;
  var lastFrameTs = 0;              // frame() çağrılmadığında rAF için
  var statFps = 0, statMs = 0, statAvg = 0, statMin = 0, statMax = 0, statLow1 = 0;
  var statDirty = false;

  // overlay
  var enabled = false;
  var el = null;                    // kök overlay div
  var elFps = null, elBars = null, elCounters = null, elEvents = null;
  var rafId = 0;
  var lastDraw = 0;
  var ownLoopRunning = false;       // kendi rAF örnekleyicimiz çalışıyor mu

  // ---- Yardımcılar ----
  function now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now() : Date.now();
  }

  // dt'yi ms'e normalize et: saniye (<1 tipik) ise 1000'le çarp
  function toMs(dt) {
    if (dt == null || !isFinite(dt) || dt <= 0) return 0;
    return dt < 1 ? dt * 1000 : dt;
  }

  function pushFrameTime(ms) {
    if (ms <= 0 || ms > 1000) return; // absürt değerleri (sekme arka planı vb.) yut
    ftBuf[ftHead] = ms;
    ftHead = (ftHead + 1) % STAT_WINDOW;
    if (ftLen < STAT_WINDOW) ftLen++;
    statDirty = true;
  }

  // İstatistikleri yalnızca gerekince (overlay çizerken) hesapla → ucuz
  function computeStats() {
    if (!statDirty) return;
    statDirty = false;
    var n = ftLen;
    if (n === 0) { statFps = statMs = statAvg = statMin = statMax = statLow1 = 0; return; }
    var sum = 0, mn = Infinity, mx = 0;
    // son (en yeni) değer = anlık ms
    var newestIdx = (ftHead - 1 + STAT_WINDOW) % STAT_WINDOW;
    statMs = ftBuf[newestIdx];
    // ortalama/min/max
    for (var i = 0; i < n; i++) {
      var v = ftBuf[i];
      sum += v;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    statAvg = sum / n;
    statMin = mn;
    statMax = mx;
    statFps = statMs > 0 ? (1000 / statMs) : 0;
    // %1 düşük FPS = en kötü (en büyük) frame-time'ların ~%1'inin ortalaması
    statLow1 = compute1PercentLowMs(n);
  }

  function compute1PercentLowMs(n) {
    // Kopyala + sırala (yalnızca overlay açıkken, seyrek → kabul edilebilir)
    var arr = [];
    for (var i = 0; i < n; i++) arr.push(ftBuf[i]);
    arr.sort(function (a, b) { return a - b; });
    var take = Math.max(1, Math.round(n * 0.01));
    var sum = 0;
    for (var j = 0; j < take; j++) sum += arr[n - 1 - j]; // en büyük ms'ler
    var worstMs = sum / take;
    return worstMs > 0 ? (1000 / worstMs) : 0;
  }

  // ================= PUBLIK API =================
  var Telemetry = {

    // Halka tampona olay ekle — çok ucuz (yeni nesne + indeks ilerlet)
    log: function (event, data) {
      ring[ringHead] = { t: now(), event: String(event), data: (data === undefined ? null : data) };
      ringHead = (ringHead + 1) % RING_MAX;
      if (ringLen < RING_MAX) ringLen++;
      return Telemetry;
    },

    // Sayaç artır
    count: function (key, by) {
      var k = String(key);
      counters[k] = (counters[k] || 0) + (by == null ? 1 : by);
      return counters[k];
    },

    getCounters: function () {
      var out = {};
      for (var k in counters) out[k] = counters[k];
      return out;
    },

    // Son olaylar (yeni → eski)
    getLog: function (limit) {
      var out = [];
      var count = ringLen;
      if (limit && limit < count) count = limit;
      for (var i = 0; i < count; i++) {
        var idx = (ringHead - 1 - i + RING_MAX) % RING_MAX;
        var rec = ring[idx];
        if (rec) out.push(rec);
      }
      return out;
    },

    // Her kareden çağrılabilir — dt (saniye VEYA ms) veya boş bırakılabilir
    frame: function (dt) {
      var ms;
      if (dt != null) {
        ms = toMs(dt);
      } else {
        var t = now();
        ms = lastFrameTs ? (t - lastFrameTs) : 0;
        lastFrameTs = t;
      }
      pushFrameTime(ms);
      return Telemetry;
    },

    getStats: function () {
      computeStats();
      return {
        fps: statFps, ms: statMs, avg: statAvg,
        min: statMin, max: statMax, low1: statLow1,
        samples: ftLen
      };
    },

    // ---- Overlay kontrol ----
    toggle: function () { enabled ? Telemetry.hide() : Telemetry.show(); return enabled; },

    show: function () {
      enabled = true;
      ensureOverlay();
      if (el) el.style.display = 'block';
      startLoop();
      Telemetry.log('telemetry:overlay', 'on');
    },

    hide: function () {
      enabled = false;
      if (el) el.style.display = 'none';
      stopLoop();
    },

    isVisible: function () { return enabled; },

    reset: function () {
      ringHead = ringLen = 0;
      ring = new Array(RING_MAX);
      counters = Object.create(null);
      ftHead = ftLen = 0;
      ftBuf = new Float32Array(STAT_WINDOW);
      statDirty = true;
      return Telemetry;
    }
  };

  // ================= KENDİ rAF ÖRNEKLEYİCİ =================
  // Sadece overlay AÇIKKEN çalışır. dış frame() yeterince beslerse yine de
  // sorun yok (pushFrameTime absürt değerleri yutar). Kapalıyken hiç rAF yok.
  function loop() {
    if (!enabled) { ownLoopRunning = false; return; }
    var t = now();
    // Kendi frame-time örneğimiz (dış frame() çağrılmıyorsa bu doldurur)
    if (lastFrameTs) pushFrameTime(t - lastFrameTs);
    lastFrameTs = t;
    // Overlay'i throttle ile tazele
    if (t - lastDraw >= DRAW_INTERVAL) { lastDraw = t; draw(); }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (ownLoopRunning) return;
    ownLoopRunning = true;
    lastFrameTs = now();
    lastDraw = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    ownLoopRunning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  // ================= OVERLAY DOM (LAZY) =================
  function ensureOverlay() {
    if (el) return;
    if (typeof document === 'undefined' || !document.body) return;

    el = document.createElement('div');
    el.id = 'ahmet-telemetry';
    el.style.cssText =
      'position:fixed;top:8px;right:8px;z-index:2147483000;' +
      'width:220px;max-height:70vh;overflow:hidden;' +
      'background:rgba(8,12,24,0.82);color:#cfe3ff;' +
      'font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;' +
      'border:1px solid rgba(120,160,255,0.28);border-radius:8px;' +
      'padding:8px 9px;pointer-events:none;user-select:none;' +
      'box-shadow:0 6px 22px rgba(0,0,0,0.4);backdrop-filter:blur(3px);';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
      'font-weight:700;color:#8fb3ff;letter-spacing:.06em;margin-bottom:5px;';
    head.innerHTML = '<span>TELEMETRY</span><span style="opacity:.55;font-weight:400">Ctrl+Shift+D</span>';
    el.appendChild(head);

    elFps = document.createElement('div');
    elFps.style.cssText = 'font-size:12px;margin-bottom:4px;color:#e6f0ff;';
    el.appendChild(elFps);

    elBars = document.createElement('div');
    elBars.style.cssText = 'margin-bottom:6px;';
    el.appendChild(elBars);

    var cLabel = document.createElement('div');
    cLabel.textContent = 'SAYAÇLAR';
    cLabel.style.cssText = 'color:#7f9;opacity:.75;font-size:9px;letter-spacing:.1em;margin:4px 0 2px;';
    el.appendChild(cLabel);
    elCounters = document.createElement('div');
    elCounters.style.cssText = 'margin-bottom:4px;max-height:90px;overflow:hidden;';
    el.appendChild(elCounters);

    var eLabel = document.createElement('div');
    eLabel.textContent = 'SON OLAYLAR';
    eLabel.style.cssText = 'color:#fc8;opacity:.75;font-size:9px;letter-spacing:.1em;margin:4px 0 2px;';
    el.appendChild(eLabel);
    elEvents = document.createElement('div');
    elEvents.style.cssText = 'max-height:150px;overflow:hidden;opacity:.9;';
    el.appendChild(elEvents);

    el.style.display = 'none';
    document.body.appendChild(el);
  }

  function fmt(n, d) { return (isFinite(n) ? n : 0).toFixed(d == null ? 0 : d); }

  function colorForFps(fps) {
    if (fps >= 55) return '#7dffa8';
    if (fps >= 40) return '#ffe27d';
    if (fps >= 25) return '#ffb26b';
    return '#ff7d7d';
  }

  var _drawEvBuf = ''; // yeniden kullanılabilir (küçük GC baskısı)

  function draw() {
    if (!el || !enabled) return;
    computeStats();

    var c = colorForFps(statFps);
    elFps.innerHTML =
      '<b style="color:' + c + '">' + fmt(statFps, 0) + ' FPS</b>' +
      ' <span style="opacity:.7">· ' + fmt(statMs, 1) + ' ms</span>';

    elBars.innerHTML =
      row('avg', fmt(statAvg, 1) + ' ms') +
      row('min/max', fmt(statMin, 1) + ' / ' + fmt(statMax, 1) + ' ms') +
      row('1% low', fmt(statLow1, 0) + ' FPS');

    // Sayaçlar
    var cbuf = '';
    var keys = Object.keys(counters).sort();
    if (keys.length === 0) cbuf = '<span style="opacity:.4">—</span>';
    else for (var i = 0; i < keys.length; i++) {
      cbuf += row(keys[i], String(counters[keys[i]]));
    }
    elCounters.innerHTML = cbuf;

    // Son olaylar (en fazla 8)
    var log = Telemetry.getLog(8);
    _drawEvBuf = '';
    if (log.length === 0) _drawEvBuf = '<span style="opacity:.4">—</span>';
    else for (var j = 0; j < log.length; j++) {
      var r = log[j];
      var d = r.data;
      var ds = (d == null) ? '' : (typeof d === 'object' ? shortJson(d) : String(d));
      _drawEvBuf += '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        '<span style="color:#9cc">' + esc(r.event) + '</span>' +
        (ds ? ' <span style="opacity:.6">' + esc(ds) + '</span>' : '') + '</div>';
    }
    elEvents.innerHTML = _drawEvBuf;
  }

  function row(label, val) {
    return '<div style="display:flex;justify-content:space-between;gap:8px">' +
      '<span style="opacity:.65;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(label) + '</span>' +
      '<span style="color:#dfe">' + esc(val) + '</span></div>';
  }

  function shortJson(o) {
    try {
      var s = JSON.stringify(o);
      return s.length > 42 ? s.slice(0, 40) + '…' : s;
    } catch (e) { return '[obj]'; }
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ================= KENDİ KENDİNE KURULUM =================
  function onKey(e) {
    // Ctrl+Shift+D — büyük/küçük ve klavye düzeninden bağımsız kontrol
    if (e.ctrlKey && e.shiftKey && !e.altKey &&
        (e.key === TOGGLE_KEY || e.key === 'd' || e.code === 'KeyD')) {
      e.preventDefault();
      Telemetry.toggle();
    }
  }

  function install() {
    try {
      window.addEventListener('keydown', onKey, true);
    } catch (e) { /* sessiz */ }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', install, { once: true });
    } else {
      install();
    }
  }

  // Yükleme olayını (ucuz) kaydet
  try { Telemetry.log('telemetry:init', { ring: RING_MAX }); } catch (e) {}

  window.Telemetry = Telemetry;
})();
