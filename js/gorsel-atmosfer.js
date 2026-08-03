'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-ATMOSFER — Hacimsel atmosfer son-işlem katmanı (30 Tmz)
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında HAVAYI çizer. `gorsel.js`
// renk derecelendirme/bloom yapar, `gorsel-isik.js` ışık/gölge yapar; BURASI
// ikisinin arasındaki "hava"dır: katmanlı sis, tanrı ışınları, süzülen zerre,
// ısı dalgası, bulut gölgesi, atmosferik perspektif, ufuk parlaması.
// Çizim koduna HİÇ dokunmaz — `ciz()` çağrılmazsa oyun aynen eskisi gibidir.
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bu dosya HİÇBİR bare global'e güvenmez (Game/Terrain/Camera `window`'da
// DEĞİL — CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle · ba.camera
//   ba.terrain · ba.t · ba.dt · ba.kalite(ad) · ba.gr(anahtar, uretici)
//
// ── KALİTE ANAHTARLARI (7 efekt, hepsi ayrı geçitli) ──────────────────────
//   katmanliSis          — 4 derinlik bandı, farklı hız/yoğunlukta yatay kayan
//   godRay               — güneşten yayılan, arazi siluetiyle KESİLEN huzmeler
//   tozZerre             — süzülen toz/kor/polen/kar/parıltı (SABİT HAVUZ)
//   isiDalgasi           — sıcak haritalarda dikey sinüs kaydırmalı refraksiyon
//   bulutGolgesi         — yer üzerinde kayan bulut gölgesi bantları
//   atmosferikPerspektif — ufka doğru sis rengine kayma
//   ufukParlama          — ufuk çizgisinde ince atmosferik parlama şeridi
//
// 🔴 PERFORMANS KURALLARI (ihlali p99'u bozar — DEVAM-OZETI §8B.27/B5)
//   1. `createLinearGradient` / `createRadialGradient` DOĞRUDAN ÇAĞRILMAZ.
//      Hepsi `this._gr(...)` → `ba.gr(...)` önbelleğinden geçer. KONUMU HER
//      KARE DEĞİŞEN efektler (sis bandı, ufuk, bulut, zerre) BİRİM UZAYDA
//      (-1..1 / r=1) üretilir; yerleştirme `translate/scale` ile yapılır.
//      Böylece anahtar sabit kalır → kare başına YENİ gradient = 0.
//      ⚠ Anahtara `ba.t`, ufuk yüksekliği gibi DEĞİŞEN değer KOYMA.
//   2. `getImageData` / `putImageData` YOK. Refraksiyon `drawImage` dilimleriyle
//      (GPU), yumuşaklık `ctx.filter='blur()'` ile yapılır.
//   3. Her efekt `ba.kalite('...')` ile geçitli; 0 dönerse TEK BİR çizim
//      çağrısı bile yapılmaz (selfTest bunu SAYARAK doğrular).
//   4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
//   5. `globalAlpha` / `globalCompositeOperation` / `filter` geri konur.
//   6. 🔴 PARÇACIK DİZİSİ BÜYÜMEZ. `_havuz` bir kez `_HAVUZ_MAX` uzunluğunda
//      kurulur; kalite yalnız KAÇ TANESİNİN çizileceğini belirler, dizi hiç
//      `push`lanmaz. (Bu projede `UI._toasts` ve `pendingToast` sınırsız
//      büyüyüp bellek sızdırmıştı — §8B.28 "Kök neden 3".)
//   7. ÇOK GEÇİŞLİ + AYNI KARIŞIM MODLU ardışık katmanlar `_ara` tamponunda
//      YARI ÇÖZÜNÜRLÜKTE toplanır ve ekrana TEK kez bindirilir (aşağı bak).
//
// ── 🔴 YARI ÇÖZÜNÜRLÜKLÜ TOPLAYICI (`_ara`, 1 Ağu) ────────────────────────
//   `_atmosferikPerspektif` + `_katmanliSis` `ciz()` içinde ARDIŞIKtır ve
//   İKİSİ DE `source-over`dır → tek şeffaf tamponda toplanabilirler.
//
//   🔴 GÖRÜNTÜ NEDEN AYNI: `source-over` BİRLEŞMELİDİR (associative).
//      B⊕L1⊕L2⊕…⊕Ln ≡ B⊕(L1⊕L2⊕…⊕Ln). Katmanları şeffaf tamponda toplayıp
//      alfa=1 · `source-over` ile bindirmek, tek tek bindirmekle AYNI sonucu
//      verir. Tamponun taban dönüşümü `setTransform(W'/W, 0, 0, H'/H, 0, 0)`
//      olduğu için efekt kodu HİÇ DEĞİŞMEDEN aynı geometriyi çizer; tek fark
//      örnekleme çözünürlüğüdür. Bu katmanların HEPSİ zaten yumuşak gradyan
//      (keskin kenar YOK) → yarı çözünürlükte görsel kayıp yok.
//      ⛔ HİÇBİR EFEKT SİLİNMEDİ, hiçbir kalite anahtarı düşürülmedi, hiçbir
//         bant/puf sayısı azaltılmadı; alfa formülleri BİREBİR aynı.
//
//   🔴 KAZANÇ KURALI (ÖLÇMEDEN TAŞIMA): bir efekt grubunu tampona almanın
//      bedeli sabittir → `0,25` (tampon temizliği) + `1,00` (bindirme) = 1,25.
//      Kazanç ancak grubun EKRAN ALANI toplamı `A` için `A × 0,75 > 1,25`,
//      yani `A > 1,667` iken doğar. `node port-araclari\dogrula-dolgu.js`
//      ile ÖLÇÜLEN alanlar (blizzard/hızlı, en ağır senaryo):
//        perspektif + sis (source-over, ardışık)  A = 3,147  → 2,037  KÂR 1,11 ✅
//        godRay        (lighter)                  A = 0,822  → 1,456  ZARAR ❌
//        bulutGolgesi  (multiply)                 A = 0,502  → 1,376  ZARAR ❌
//        ufukParlama   (lighter)                  A = 0,311  → 1,328  ZARAR ❌
//      ⚠ Farklı karışım modları AYNI tamponda birleşmez; godRay/ufukParlama
//        `lighter`, bulutGolgesi `multiply` ve aralarında mod değişimi var →
//        birleştirilemezler, ayrı ayrı da kârsızlar. TAŞINMADILAR.
//
//   🔴 SIRA KİLİDİ: `_isiDalgasi` `ctx.canvas`'ı OKUR (refraksiyon kaynağı).
//      Tampon ekrana MUTLAKA o okumadan ÖNCE bindirilir — `ciz()` içinde
//      bindirme 2. sıradadır, `_isiDalgasi` 6. sıradadır.
// ═══════════════════════════════════════════════════════════════════════════
const GorselAtmosfer = {
  ad: 'atmosfer',

  // ── iç durum ─────────────────────────────────────────────────────────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _grYerel: {},            // ba.gr verilmediyse kullanılan yedek önbellek
  _grUretim: 0,            // ölçüm: yedek önbellekte kaç YENİ gradient üretildi
  _tampon: null,           // ısı dalgası refraksiyon tamponu (offscreen)
  _ara: null,              // YARI çözünürlüklü source-over toplayıcı tamponu
  _araC: null,             // ^ bağlamı
  _araAcik: false,         // bu karede toplayıcı kullanılıyor mu
  _araBozuk: false,        // bindirme bir kez patladıysa hızlı yol KALICI kapalı
  _tuvalSayaci: 0,         // ÖLÇÜM: kaç offscreen tuval AYRILDI (kare başına 0 kanıtı)
  _araKatman: 0,           // ÖLÇÜM: tampona kaç KATMAN yönlendirildi (kümülatif)
  _araBindirme: 0,         // ÖLÇÜM: ekrana kaç TEK bindirme yapıldı (kümülatif)
  _araYedek: 0,            // ÖLÇÜM: kaç kez tam çözünürlüklü yedek yola düşüldü
  _blurDestek: null,       // ctx.filter blur destekliyor mu (bir kez ölçülür)
  _profilOnbellek: {},     // haritadan türeyen atmosfer sabitleri
  _havuz: [],              // 🔴 SABİT UZUNLUKLU parçacık havuzu
  _HAVUZ_MAX: 160,         // asla aşılmaz; dizi hiç push'lanmaz
  _sonCamX: null,          // parallaks için bir önceki kamera dünya-X'i
  _nkOnbellek: null,       // bu karenin arazi siluet noktaları
  _tohum: 1,               // deterministik seri (Math.random KULLANILMAZ)

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // ── Harita karakteri ─────────────────────────────────────────────────────
  // ⚠ Liste + palet sezgisi BİRLİKTE çalışır: listede olmayan harita da
  //   paletinden sınıflandırılır (51 harita var, hepsini elle yazmak kırılgan).
  SICAK: {
    volcano: 1, lava_river: 1, desert: 1, sandstorm: 1,
    mars: 0.8, hotwheels: 0.7, meteor_field: 0.8, savanna: 0.55,
    canyon: 0.5, desert_oasis: 0.45, wasteland: 0.45, junkyard: 0.35
  },
  MAGARA: {
    cave: 1, crystal_cave: 1, underwater: 0.9, mushroom: 0.8,
    graveyard: 0.6, moon: 0.5, neon_city: 0.45, cyberpunk_roofs: 0.5,
    cyber_grid: 0.45, firefly_forest: 0.55
  },
  SOGUK: {
    arctic: 1, blizzard: 1, winter: 0.9, glacier: 0.9, stormpeak: 0.75,
    mountains: 0.4, dag: 0.4, cloud_kingdom: 0.35, skyland: 0.3
  },
  ORMAN: {
    jungle: 1, bamboo: 1, firefly_forest: 1, countryside: 0.8,
    highland: 0.7, windmill: 0.7, sakura: 0.9, swamp: 0.6,
    crystal_forest: 0.5, autumn: 0.8
  },

  // Zerre tipi tanımları — hız/boy/alfa/twinkle karakteri
  ZERRE_TIP: {
    kor:     { vx:  6, vy: -46, sway: 26, r: 2.6, alfa: 0.85, twinkle: 1, karisim: 'lighter' },
    parilti: { vx:  4, vy:  -7, sway: 14, r: 2.1, alfa: 0.75, twinkle: 1, karisim: 'lighter' },
    kar:     { vx: 14, vy:  38, sway: 30, r: 3.0, alfa: 0.60, twinkle: 0, karisim: 'source-over' },
    polen:   { vx:  9, vy:   8, sway: 22, r: 2.2, alfa: 0.62, twinkle: 1, karisim: 'lighter' },
    toz:     { vx: 12, vy:   5, sway: 16, r: 2.4, alfa: 0.42, twinkle: 0, karisim: 'lighter' }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KURULUM
  // ═════════════════════════════════════════════════════════════════════════
  hazir(W, H) {
    W = Math.max(1, Math.round(W || 0));
    H = Math.max(1, Math.round(H || 0));
    if (this._hazirlandi && this._W === W && this._H === H) return false;
    this._W = W;
    this._H = H;
    this._hazirlandi = true;
    // Ekran uzayı gradientleri boyuta bağlıdır → yedek önbelleği boşalt.
    this._grYerel = {};
    this._grUretim = 0;
    this._blurDestek = null;
    this._sonCamX = null;
    this._araBozuk = false;
    this._araAcik = false;
    this._havuzKur(W, H);
    // Isı dalgası refraksiyon tamponu (yoksa efekt katkı moduna düşer).
    try {
      if (typeof document !== 'undefined' && document.createElement) {
        const bw = Math.max(16, Math.round(W));
        const bh = Math.max(16, Math.round(H * 0.55));
        if (!this._tampon || this._tampon.width !== bw || this._tampon.height !== bh) {
          this._tampon = this._tuvalYap(bw, bh);
        }
      } else {
        this._tampon = null;
      }
    } catch (e) {
      this._tampon = null;
    }
    // 🔴 YARI ÇÖZÜNÜRLÜKLÜ TOPLAYICI — tahsis YALNIZ BURADA olur. Kare başına
    //   YENİDEN AYRILMAZ; `dogrula-dolgu.js` bunu "ara tuval tahsisi/kare: 0.00"
    //   diye ölçer, `selfTest` ayrıca 60 karede sayaç sabitliğiyle kilitler.
    //   Boyut değişirse eskisi bırakılır (GC toplar), YENİ bir tane kurulur;
    //   hiçbir yerde dizi/listeye eklenmez → sınırsız büyüme imkânsız.
    const aw = Math.max(16, Math.round(W / 2));
    const ah = Math.max(16, Math.round(H / 2));
    if (!this._ara || this._ara.width !== aw || this._ara.height !== ah) {
      this._ara = this._tuvalYap(aw, ah);
      this._araC = this._ct(this._ara);
      if (!this._araC) this._ara = null;
    }
    return true;
  },

  // Offscreen tuval üretimi — `document` yoksa null (başsız ortam).
  // ⚠ `_tuvalSayaci`'nı ARTIRIR: "kare başına tahsis 0" iddiasının ölçüldüğü yer.
  _tuvalYap(w, h) {
    try {
      if (typeof document === 'undefined' || !document || !document.createElement) return null;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      if (typeof c.getContext !== 'function') return null;
      this._tuvalSayaci++;
      return c;
    } catch (e) { return null; }
  },
  _ct(cv) {
    if (!cv) return null;
    try { return cv.getContext('2d') || null; } catch (e) { return null; }
  },

  // 🔴 SABİT HAVUZ — tam `_HAVUZ_MAX` eleman, bir kez. Sonradan ASLA push yok.
  //    Dizi zaten doğru uzunluktaysa elemanlar yerinde tazelenir (yeni dizi
  //    ayırmak GC baskısı yaratır; 50 sn'de +23,6 MB sızıntısı böyle oluşmuştu).
  _havuzKur(W, H) {
    this._tohum = 1;
    const n = this._HAVUZ_MAX;
    const h = this._havuz;
    for (let i = 0; i < n; i++) {
      const z = h[i] || (h[i] = {});
      z.x = this._rnd() * W;
      z.y = this._rnd() * H;
      z.r0 = this._rnd();               // boy çeşitlemesi 0..1
      z.a0 = this._rnd();               // alfa çeşitlemesi 0..1
      z.faz = this._rnd() * Math.PI * 2;
      z.hiz = 0.5 + this._rnd();        // 0.5..1.5
      z.k = this._rnd();                // derinlik 0..1 (parallaks + boy)
    }
    // Fazla eleman kalmışsa kırp (boyut küçüldüyse bile uzunluk SABİT kalsın).
    if (h.length > n) h.length = n;
    return h.length === n;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM — dünya dönüşümü KAPALI, ekran uzayında çalışır
  // ═════════════════════════════════════════════════════════════════════════
  ciz(ctx, W, H, ba) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    ba = ba || {};
    const p = ba.palet || this._VARSAYILAN_PALET;
    if (!this._hazirlandi || this._W !== Math.round(W) || this._H !== Math.round(H)) {
      this.hazir(W, H);
    }

    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;
    const prof = this._profil(ba, p);
    const t = (typeof ba.t === 'number' && isFinite(ba.t)) ? ba.t : 0;
    const dt = Math.max(0, Math.min(0.1, (typeof ba.dt === 'number' && isFinite(ba.dt)) ? ba.dt : 0.016));

    // Arazi siluetini KARE BAŞINA BİR KEZ örnekle (godRay + bulutGolgesi +
    // ufuk yüksekliği aynı veriyi kullanır; 3 kez örneklemek 3× maliyettir).
    this._nkOnbellek = null;
    try { this._nkOnbellek = this._zeminNoktalari(ba, W, 40); } catch (e) { this._nkOnbellek = null; }
    const ufuk = this._ufukY(H, this._nkOnbellek);
    const gun = this._gunesKonum(W, H, prof, t);

    // Sıra ÖNEMLİ: uzaktan yakına. Perspektif → sis → huzme → gölge →
    // ufuk parlaması → ısı → zerre (en yakın katman, en üstte).
    //
    // 🔴 İlk İKİ katman (ikisi de `source-over`, ardışık) YARI ÇÖZÜNÜRLÜKLÜ
    //   `_ara` tamponunda toplanır ve ekrana TEK kez bindirilir. Bindirme,
    //   `_isiDalgasi`'nın ekran okumasından ÇOK ÖNCE olur (sıra kilidi).
    const hedef = this._toplayiciAc(ctx, W, H, ba);
    try { this._atmosferikPerspektif(hedef, W, H, ba, p, prof, ufuk); } catch (e) {}
    try { this._katmanliSis(hedef, W, H, ba, p, prof, ufuk, t); } catch (e) {}
    if (hedef !== ctx && !this._toplayiciKapat(ctx, W, H)) {
      // 🔴 Bindirme patladı → iki katman EKRANA HİÇ GİTMEDİ. "Sessizce
      //   çizmemek" KABUL EDİLMEZ: hızlı yol kalıcı kapatılır ve aynı iki
      //   katman ESKİ tam çözünürlüklü yolla YENİDEN çizilir.
      this._araBozuk = true;
      this._araYedek++;
      try { this._atmosferikPerspektif(ctx, W, H, ba, p, prof, ufuk); } catch (e) {}
      try { this._katmanliSis(ctx, W, H, ba, p, prof, ufuk, t); } catch (e) {}
    }
    try { this._godRay(ctx, W, H, ba, p, prof, gun, t); } catch (e) {}
    try { this._bulutGolgesi(ctx, W, H, ba, p, prof, t); } catch (e) {}
    try { this._ufukParlama(ctx, W, H, ba, p, prof, ufuk, gun, t); } catch (e) {}
    try { this._isiDalgasi(ctx, W, H, ba, p, prof, t); } catch (e) {}
    try { this._tozZerre(ctx, W, H, ba, p, prof, t, dt); } catch (e) {}

    this._nkOnbellek = null;
    // Kural 5: durumu her hâlükârda geri koy (bir efekt yarıda patlasa bile).
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    try { ctx.filter = 'none'; } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARI ÇÖZÜNÜRLÜKLÜ TOPLAYICI — aç / kapat
  // ═════════════════════════════════════════════════════════════════════════
  // Dönen değer ÇİZİM HEDEFİdir: tampon bağlamı (hızlı yol) ya da `ctx`'in
  // KENDİSİ (yedek yol). Çağıran taraf bu ikisini ayırt etmek zorunda değildir;
  // yalnız `hedef !== ctx` ise `_toplayiciKapat` çağırır.
  //
  // 🔴 TABAN DÖNÜŞÜMÜ: `setTransform(W'/W, 0, 0, H'/H, 0, 0)`. Efekt kodu
  //   DEĞİŞMEDEN aynı (W,H) koordinatlarını kullanır; tuval yarı boyutta
  //   olduğu için her boyama 0,25 ekran alanı eder. Efektlerin kendi
  //   `save/restore`'ları bu tabana geri döner (hepsi dengeli).
  //   ⚠ Gradyanlar BİRİM UZAYDA üretildiği (`scale()` + `fillRect(0,-1,1,2)`)
  //     ya da kullanıcı uzayında (`0..H`) tanımlandığı için AYNI önbellek
  //     nesnesi iki yolda da doğrudur → "yeni gradyan/kare" 0'da kalır.
  //
  // 🔴 KÂR GEÇİDİ: yalnız İKİ katman da açıkken tampona geçilir. Tek katman
  //   taşımak ÖLÇÜLDÜ ve ZARARDIR (yalnız sis: A=1,168 → 1,542). Kalite
  //   rampasında (`js/kalite.js`) iki anahtar da aynı kademede açılır, yani
  //   pratikte hiçbir kademe bu geçitten dolayı kayba uğramaz.
  _toplayiciAc(ctx, W, H, ba) {
    this._araAcik = false;
    if (this._araBozuk) return ctx;
    const ara = this._ara, ac = this._araC;
    if (!ara || !ac || !(ara.width > 0) || !(ara.height > 0) ||
        !(W > 0) || !(H > 0)) return ctx;
    if (typeof ac.setTransform !== 'function' ||
        typeof ac.clearRect !== 'function') return ctx;
    if (!(this._k(ba, 'atmosferikPerspektif') > 0)) return ctx;
    if (!(this._k(ba, 'katmanliSis') > 0)) return ctx;
    try {
      ac.setTransform(ara.width / W, 0, 0, ara.height / H, 0, 0);
      ac.globalAlpha = 1;
      ac.globalCompositeOperation = 'source-over';
      try { ac.filter = 'none'; } catch (e) {}
      // ⚠ `clearRect` de taban dönüşümünden geçer → (0,0,W,H) tamponun TAMAMIdır.
      //   Önceki karenin kalıntısı kalırsa ekranda HAYALET olur; temizlik ŞART.
      ac.clearRect(0, 0, W, H);
    } catch (e) {
      this._araYedek++;
      return ctx;
    }
    this._araAcik = true;
    this._araKatman += 2;
    return ac;
  },

  // Tamponu ekrana TEK `source-over` bindirmeyle geçirir. Başarılıysa `true`.
  // `false` dönerse çağıran taraf katmanları tam çözünürlükte YENİDEN çizer.
  _toplayiciKapat(ctx, W, H) {
    if (!this._araAcik) return false;
    this._araAcik = false;
    const ara = this._ara, ac = this._araC;
    if (!ara || !ctx) return false;
    // Kural 5: tampon durumu her hâlde temiz bırakılır (yarıda patlasa bile).
    try {
      if (ac) {
        ac.globalAlpha = 1;
        ac.globalCompositeOperation = 'source-over';
        if (typeof ac.setTransform === 'function') ac.setTransform(1, 0, 0, 1, 0, 0);
      }
    } catch (e) {}
    let tamam = false;
    ctx.save();
    try {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      try { ctx.filter = 'none'; } catch (e) {}
      ctx.drawImage(ara, 0, 0, W, H);      // ← TEK bindirme (eskiden 2 katman ayrı)
      tamam = true;
    } catch (e) { tamam = false; }
    ctx.restore();
    if (tamam) this._araBindirme++;
    return tamam;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) KATMANLI SİS — 4 derinlik bandı, her biri farklı hız/yoğunlukta
  // ⚠ Bantlar UFUK ÇİZGİSİNE göre konumlanır (ufuk her kare değişir), bu yüzden
  //   gradientler BİRİM UZAYDA üretilir; yerleştirme translate/scale iledir.
  // ═════════════════════════════════════════════════════════════════════════
  _katmanliSis(ctx, W, H, ba, p, prof, ufuk, t) {
    const g = this._k(ba, 'katmanliSis');
    if (g <= 0) return;
    const self = this;
    const sis = p.sis || '#cfe0f0';
    const yog = prof.sisYogun;                        // kar/mağara yoğun, çöl seyrek
    const camKay = this._camKayma(ba);                // dünya kayması (parallaks)
    const anh = sis + '|' + (prof.kapali > 0.5 ? 'k' : 'a');

    // 4 derinlik bandı: 0 = en uzak/en yüksek/en soluk, 3 = en yakın/en yoğun.
    const BANT = [
      { yOfs: -0.075, h: 0.070, a: 0.30, hiz:  5, puf: 3, pufW: 0.46, pufH: 0.055, px: 0.06 },
      { yOfs: -0.018, h: 0.085, a: 0.42, hiz: 11, puf: 4, pufW: 0.40, pufH: 0.070, px: 0.14 },
      { yOfs:  0.052, h: 0.105, a: 0.52, hiz: 19, puf: 5, pufW: 0.34, pufH: 0.090, px: 0.28 },
      { yOfs:  0.145, h: 0.135, a: 0.60, hiz: 31, puf: 6, pufW: 0.30, pufH: 0.115, px: 0.48 }
    ];
    const bantSayi = Math.max(2, Math.min(4, Math.round(1 + 3 * g)));

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < bantSayi; i++) {
      const b = BANT[i];
      const by = ufuk + H * b.yOfs;
      const bh = H * b.h;

      // a) bandın taban örtüsü — birim dikey gradient (-1..1)
      ctx.save();
      // TUNING(30 Tmz) — 0.55 → 0.30. ÖLÇÜLDÜ (countryside/ULTRA, canlı tuval,
      // zemin bandı y=0.55..0.95): ham parlaklık 43 → tüm efektlerle 89 (+%107);
      // bunun +18'i tek başına bu sis. Aracın alt yarısı süte karışıyordu.
      ctx.globalAlpha = Math.min(0.85, b.a * g * yog * 0.30);
      ctx.translate(0, by);
      ctx.scale(W, bh);
      ctx.fillStyle = this._gr(ctx, ba, 'atm-sisbant' + i + '|' + anh, function (c) {
        const gr = c.createLinearGradient(0, -1, 0, 1);
        gr.addColorStop(0.00, self._rgba(sis, 0));
        gr.addColorStop(0.34, self._rgba(sis, 0.42));
        gr.addColorStop(0.56, self._rgba(sis, 0.62));
        gr.addColorStop(1.00, self._rgba(sis, 0));
        return gr;
      });
      ctx.fillRect(0, -1, 1, 2);
      ctx.restore();

      // b) bandın içinde yatay kayan sis pufları (hacim hissi)
      const pufW = W * b.pufW;
      const pufH = bh * (1.35 + b.pufH * 2);
      const adim = W * 0.72 + pufW;
      const adet = Math.max(1, Math.round(b.puf * (0.45 + g * 0.75)));
      const kaydir = t * b.hiz - camKay * b.px;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = this._gr(ctx, ba, 'atm-sispuf|' + anh, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0.00, self._rgba(sis, 0.85));
        gr.addColorStop(0.42, self._rgba(sis, 0.42));
        gr.addColorStop(0.74, self._rgba(sis, 0.13));
        gr.addColorStop(1.00, self._rgba(sis, 0));
        return gr;
      });
      for (let j = 0; j < adet; j++) {
        const temel = j * adim + i * 137.5;
        const x = this._mod(temel + kaydir, adim * adet) - pufW * 0.5;
        // Her puf kendi ritminde nefes alır (aynı anda pompalanmasın diye faz).
        const nefes = 0.82 + 0.18 * Math.sin(t * 0.45 + j * 1.7 + i * 0.9);
        const dy = Math.sin(t * 0.31 + j * 2.1 + i) * bh * 0.22;
        ctx.save();
        ctx.globalAlpha = Math.min(0.8, b.a * g * yog * 0.20 * nefes);  // TUNING(30 Tmz) 0.34→0.20
        ctx.translate(x, by + dy);
        ctx.scale(pufW * nefes, pufH * nefes);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) GOD RAY — güneşten yayılan hacimsel huzmeler, ARAZİ SİLUETİYLE KESİLİR
  // ⚠ Kesme, gerçek ışın izleme yerine "gökyüzü poligonuna clip" ile yapılır:
  //   siluetin ALTI kırpma dışında kalır → huzmeler tepelerin arkasına geçmez.
  // ═════════════════════════════════════════════════════════════════════════
  _godRay(ctx, W, H, ba, p, prof, gun, t) {
    const g = this._k(ba, 'godRay');
    if (g <= 0) return;
    // Kapalı haritada (mağara/lav) huzme zayıflar ama tamamen kaybolmaz —
    // tavan çatlağından sızan ışık hissi.
    const gor = Math.max(0.10, gun.guc * (1 - prof.kapali * 0.62));
    const self = this;
    const renk = p.gun || '#ffe8b0';
    const anh = renk + '|' + (p.bloom || '');
    const nk = this._nkOnbellek;

    ctx.save();

    // ── Gökyüzü poligonuna kırp (siluetin üstü) ────────────────────────────
    ctx.beginPath();
    if (nk && nk.length > 1) {
      ctx.moveTo(0, -H);
      ctx.lineTo(W, -H);
      for (let i = nk.length - 1; i >= 0; i--) ctx.lineTo(nk[i].x, nk[i].y);
      ctx.closePath();
    } else {
      // Yedek: arazi yoksa ekranın üst %78'i gökyüzü sayılır.
      ctx.rect(0, -H, W, H * 1.78);
    }
    ctx.clip();

    ctx.globalCompositeOperation = 'lighter';

    // a) kaynak saçılması — huzmelerin çıktığı yumuşak hale
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, 0.20 * g * gor);
    ctx.translate(gun.x, gun.y);
    ctx.scale(Math.max(W, H) * 0.55, Math.max(W, H) * 0.55);
    ctx.fillStyle = this._gr(ctx, ba, 'atm-raysac|' + anh, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0.00, self._rgba(renk, 0.55));
      gr.addColorStop(0.22, self._rgba(renk, 0.20));
      gr.addColorStop(0.60, self._rgba(p.bloom || renk, 0.06));
      gr.addColorStop(1.00, self._rgba(p.bloom || renk, 0));
      return gr;
    });
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // b) huzme kolları — kama poligonlar, birim uzunlukta gradient boyalı
    const uzun = Math.max(W, H) * 1.85;
    const adet = Math.max(5, Math.round(6 + 10 * g));
    // Huzme demeti aracın ters yönünde eğik (klasik "arkadan gelen ışık").
    const merkez = Math.PI * 0.5 + gun.egim;
    this._bulanik(ctx, Math.min(20, 4 + 12 * g));
    ctx.save();
    ctx.translate(gun.x, gun.y);
    ctx.rotate(merkez);
    const huzmeGr = this._gr(ctx, ba, 'atm-rayhuzme|' + anh, function (c) {
      const gr = c.createLinearGradient(0, 0, 1, 0);
      gr.addColorStop(0.00, self._rgba(renk, 0.80));
      gr.addColorStop(0.18, self._rgba(renk, 0.45));
      gr.addColorStop(0.55, self._rgba(p.bloom || renk, 0.16));
      gr.addColorStop(1.00, self._rgba(p.bloom || renk, 0));
      return gr;
    });
    for (let i = 0; i < adet; i++) {
      // Her huzme kendi periyodunda salınır → demet "nefes alıyor" görünür.
      const yayilim = 0.62 + 0.10 * g;
      const taban = (i / (adet - 1) - 0.5) * 2 * yayilim;
      const sal = Math.sin(t * 0.23 + i * 0.83) * 0.045 +
                  Math.sin(t * 0.11 + i * 1.91) * 0.028;
      const a = taban + sal;
      const gen = 0.016 + 0.026 * Math.abs(Math.sin(t * 0.37 + i * 1.31));
      const alfa = (0.030 + 0.042 * (0.5 + 0.5 * Math.sin(t * 0.53 + i * 2.17))) * g * gor;
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, alfa);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-gen) * uzun, Math.sin(-gen) * uzun);
      ctx.lineTo(Math.cos(gen) * uzun, Math.sin(gen) * uzun);
      ctx.closePath();
      ctx.clip();
      ctx.scale(uzun, uzun);
      ctx.fillStyle = huzmeGr;
      ctx.fillRect(0, -1, 1, 2);
      ctx.restore();
    }
    ctx.restore();

    // c) huzmelerin içindeki "toz parlaması" — çok ince ikinci geçiş (ULTRA)
    if (g >= 0.75) {
      ctx.save();
      ctx.translate(gun.x, gun.y);
      ctx.rotate(merkez + Math.sin(t * 0.09) * 0.05);
      ctx.globalAlpha = Math.min(0.30, 0.11 * g * gor);
      ctx.scale(uzun * 0.8, uzun * 0.8);
      ctx.fillStyle = huzmeGr;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 1, -0.30, 0.30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) TOZ ZERRELERİ — SABİT HAVUZ, ekran uzayında sarmalanır
  // 🔴 `_havuz` uzunluğu `_HAVUZ_MAX`; kalite yalnız kaç tanesinin ÇİZİLECEĞİNİ
  //    belirler. Dizi hiçbir kod yolunda büyümez (selfTest sayarak doğrular).
  // ═════════════════════════════════════════════════════════════════════════
  _tozZerre(ctx, W, H, ba, p, prof, t, dt) {
    const g = this._k(ba, 'tozZerre');
    if (g <= 0) return;
    const h = this._havuz;
    if (!h.length) return;
    const tip = this.ZERRE_TIP[prof.zerreTip] || this.ZERRE_TIP.toz;
    const renk = prof.zerreRenk;
    const self = this;
    // Görünen zerre sayısı: kalite × harita yoğunluğu. Havuz boyunu AŞAMAZ.
    const n = Math.max(1, Math.min(h.length, Math.round(h.length * g * prof.zerreYogun)));
    const camKay = this._camKaymaDelta(ba);

    ctx.save();
    ctx.globalCompositeOperation = tip.karisim;
    const zerreGr = this._gr(ctx, ba, 'atm-zerre|' + renk, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0.00, self._rgba(renk, 0.95));
      gr.addColorStop(0.28, self._rgba(renk, 0.55));
      gr.addColorStop(0.62, self._rgba(renk, 0.14));
      gr.addColorStop(1.00, self._rgba(renk, 0));
      return gr;
    });
    ctx.fillStyle = zerreGr;

    const sinirX = W + 40;
    const sinirY = H + 40;
    // 🔴 PERF(31 Tmz · §8B.33) — EN AĞIR ALT EFEKT. ÖLÇÜLDÜ: 1.080 ctx çağrısı
    //   ve 136 save/restore ÇİFTİ (kare başına), yani tüm görsel katmanının
    //   ~%24'ü tek başına buradaydı. Zerre başına 8 çağrı yapılıyordu:
    //     save · globalAlpha · translate · scale · beginPath · arc · fill · restore
    //   `save/restore` canvas2d'nin EN PAHALI çift işlemidir (tam durum kaydı).
    //   ▶ Yerine TEK `setTransform` konur: matematiksel olarak
    //     M0 · translate(x,y) · scale(r,r) ile BİREBİR aynı dönüşüm.
    //     Zerre başına 8 → 5 çağrı, save/restore 136 → 0.
    //   ▶ Ayrıca EKRAN DIŞI zerreler atlanır. Havuz [-40, W+40] aralığında
    //     sarmalanıyor, yani kenar payındaki zerreler HİÇBİR piksele dokunmadan
    //     çiziliyordu. Kelepçe MUHAFAZAKÂR (yarıçap iki eksen normuyla şişirilir)
    //     → görünen bir zerre ASLA elenmez.
    //   ⚠ `getTransform` yoksa ESKİ yol aynen çalışır (görüntü değişmez).
    let M0 = null;
    if (typeof ctx.getTransform === 'function') {
      try { M0 = ctx.getTransform(); } catch (e) { M0 = null; }
    }
    const ma = M0 ? M0.a : 1, mb = M0 ? M0.b : 0, mc = M0 ? M0.c : 0,
          md = M0 ? M0.d : 1, me = M0 ? M0.e : 0, mf = M0 ? M0.f : 0;
    // Ölçek normu: birim daire bu dönüşümde en fazla bu kadar büyür.
    const olcek = M0 ? (Math.sqrt(ma * ma + mb * mb) + Math.sqrt(mc * mc + md * md)) : 2;
    const cw = (ctx.canvas && ctx.canvas.width) || W;
    const ch = (ctx.canvas && ctx.canvas.height) || H;
    for (let i = 0; i < n; i++) {
      const z = h[i];
      // ── güncelle ────────────────────────────────────────────────────────
      const derin = 0.25 + z.k * 0.95;                 // yakın zerre hızlı kayar
      const salinim = Math.sin(t * (0.6 + z.hiz * 0.7) + z.faz) * tip.sway;
      z.x += (tip.vx * z.hiz + salinim) * dt - camKay * derin;
      z.y += (tip.vy * (0.55 + z.hiz * 0.75)) * dt;
      // Ekran uzayında SARMALA — dizi büyümez, zerre tükenmez.
      if (z.x < -40) z.x += sinirX + 40; else if (z.x > sinirX) z.x -= sinirX + 40;
      if (z.y < -40) z.y += sinirY + 40; else if (z.y > sinirY) z.y -= sinirY + 40;
      if (!isFinite(z.x)) z.x = 0;
      if (!isFinite(z.y)) z.y = 0;

      // ── çiz ─────────────────────────────────────────────────────────────
      const r = tip.r * (0.45 + z.r0 * 1.25) * (0.45 + z.k * 1.0) * prof.zerreBoy;
      let a = tip.alfa * (0.32 + z.a0 * 0.68) * g;
      if (tip.twinkle) {
        a *= 0.42 + 0.58 * Math.abs(Math.sin(t * (1.6 + z.hiz * 2.6) + z.faz * 3.1));
      }
      if (a <= 0.004) continue;
      // Ekran dışı eleme (muhafazakâr): tek bir piksele bile dokunmayan zerre.
      const sx = ma * z.x + mc * z.y + me;
      const sy = mb * z.x + md * z.y + mf;
      const rr = r * olcek;
      if (sx + rr < 0 || sx - rr > cw || sy + rr < 0 || sy - rr > ch) continue;
      if (M0) {
        // M0 · translate(z.x,z.y) · scale(r,r) — save/restore GEREKMEZ.
        ctx.setTransform(ma * r, mb * r, mc * r, md * r, sx, sy);
        ctx.globalAlpha = Math.min(0.95, a);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.globalAlpha = Math.min(0.95, a);
        ctx.translate(z.x, z.y);
        ctx.scale(r, r);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (M0) ctx.setTransform(ma, mb, mc, md, me, mf);   // döngü sonrası geri al

    // Parıltı haçları — yalnız yüksek kalitede ve yalnız en parlak zerrelerde.
    if (g >= 0.7 && tip.twinkle) {
      const hac = Math.min(n, 22);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = this._rgba(renk, 0.9);
      for (let i = 0; i < hac; i++) {
        const z = h[i];
        const par = Math.abs(Math.sin(t * (2.1 + z.hiz * 2.2) + z.faz * 2.3));
        if (par < 0.86) continue;
        const L = tip.r * (2.6 + z.r0 * 3.4) * (0.5 + z.k);
        if (M0) {
          // M0 · translate(z.x,z.y) · rotate(φ) — save/restore GEREKMEZ.
          const fi = z.faz * 0.5, co = Math.cos(fi), si = Math.sin(fi);
          ctx.setTransform(ma * co + mc * si, mb * co + md * si,
                           mc * co - ma * si, md * co - mb * si,
                           ma * z.x + mc * z.y + me, mb * z.x + md * z.y + mf);
          ctx.globalAlpha = Math.min(0.55, (par - 0.86) * 3.4 * g);
          ctx.fillRect(-L, -0.6, L * 2, 1.2);
          ctx.fillRect(-0.6, -L * 0.7, 1.2, L * 1.4);
        } else {
          ctx.save();
          ctx.globalAlpha = Math.min(0.55, (par - 0.86) * 3.4 * g);
          ctx.translate(z.x, z.y);
          ctx.rotate(z.faz * 0.5);
          ctx.fillRect(-L, -0.6, L * 2, 1.2);
          ctx.fillRect(-0.6, -L * 0.7, 1.2, L * 1.4);
          ctx.restore();
        }
      }
      if (M0) ctx.setTransform(ma, mb, mc, md, me, mf);
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) ISI DALGASI — sıcak haritalarda yükselen refraksiyon
  // Yaklaşım: bölge bir kez tampona kopyalanır, sonra YATAY dilimler halinde
  // dikey sinüs kaydırmasıyla geri çizilir (gerçek kırılma, getImageData YOK).
  // Tampon yoksa (canvas olmayan ortam) katkı modunda ısı pusu çizilir.
  // ═════════════════════════════════════════════════════════════════════════
  _isiDalgasi(ctx, W, H, ba, p, prof, t) {
    const g = this._k(ba, 'isiDalgasi');
    if (g <= 0) return;
    const sic = prof.sicak;
    if (sic <= 0.05) return;                         // soğuk haritada hiç çizme
    const self = this;
    const y0 = Math.round(H * 0.45);
    const hgt = H - y0;
    if (hgt <= 4) return;

    // ── a) gerçek refraksiyon (tampon varsa) ───────────────────────────────
    let tampon = this._tampon;
    if (tampon && tampon.width >= W && tampon.height >= hgt) {
      let tc = null;
      try { tc = tampon.getContext('2d'); } catch (e) { tc = null; }
      if (tc) {
        try {
          tc.clearRect(0, 0, tampon.width, tampon.height);
          tc.drawImage(ctx.canvas, 0, y0, W, hgt, 0, 0, W, hgt);
          const dilim = Math.max(6, Math.round(10 + 26 * g));
          const dh = hgt / dilim;
          const genlik = (1.3 + 4.2 * g) * sic;
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          for (let i = 0; i < dilim; i++) {
            const sy = i * dh;
            const oran = i / dilim;                   // 0 = üst (uzak), 1 = alt
            // Alta doğru güçlenen, yukarı doğru "yükselen" sinüs dalgası.
            const dx = Math.sin(t * 2.4 + oran * 11.5) * genlik * (0.35 + oran) +
                       Math.sin(t * 1.13 + oran * 23.0) * genlik * 0.42 * oran;
            const ax = Math.round(dx);
            if (ax === 0) {
              ctx.drawImage(tampon, 0, sy, W, dh, 0, y0 + sy, W, dh);
            } else if (ax > 0) {
              // Kenar kelepçesi: açılan boşluk ilk sütunla doldurulur.
              ctx.drawImage(tampon, 0, sy, W - ax, dh, ax, y0 + sy, W - ax, dh);
              ctx.drawImage(tampon, 0, sy, 1, dh, 0, y0 + sy, ax, dh);
            } else {
              const k = -ax;
              ctx.drawImage(tampon, k, sy, W - k, dh, 0, y0 + sy, W - k, dh);
              ctx.drawImage(tampon, W - 1, sy, 1, dh, W - k, y0 + sy, k, dh);
            }
          }
          ctx.restore();
        } catch (e) {}
      }
    }

    // ── b) yükselen sıcak hava pusu (her zaman çizilir, katkı modunda) ─────
    const renk = p.bloom || '#ffb060';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.4, 0.10 * g * sic * (0.8 + 0.2 * Math.sin(t * 0.8)));
    ctx.translate(0, y0 + hgt * 0.5);
    ctx.scale(W, hgt * 0.5);
    ctx.fillStyle = this._gr(ctx, ba, 'atm-isipus|' + renk, function (c) {
      const gr = c.createLinearGradient(0, 1, 0, -1);
      gr.addColorStop(0.00, self._rgba(renk, 0.62));
      gr.addColorStop(0.34, self._rgba(renk, 0.24));
      gr.addColorStop(1.00, self._rgba(renk, 0));
      return gr;
    });
    ctx.fillRect(0, -1, 1, 2);
    ctx.restore();

    // ── c) yükselen ısı sütunları (dikey sinüs kaydırmalı şeritler) ────────
    const sutun = Math.max(2, Math.round(3 + 7 * g));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this._bulanik(ctx, Math.min(16, 5 + 9 * g));
    const sutunGr = this._gr(ctx, ba, 'atm-isisutun|' + renk, function (c) {
      const gr = c.createLinearGradient(0, 1, 0, -1);
      gr.addColorStop(0.00, self._rgba(renk, 0.55));
      gr.addColorStop(0.45, self._rgba(renk, 0.22));
      gr.addColorStop(1.00, self._rgba(renk, 0));
      return gr;
    });
    ctx.fillStyle = sutunGr;
    for (let i = 0; i < sutun; i++) {
      const faz = i * 2.39;
      const x = this._mod(i * (W / sutun) + Math.sin(t * 0.6 + faz) * W * 0.05, W);
      const gen = W * (0.05 + 0.05 * Math.abs(Math.sin(t * 0.9 + faz)));
      const yuk = hgt * (0.55 + 0.35 * Math.abs(Math.sin(t * 0.7 + faz * 1.7)));
      ctx.save();
      ctx.globalAlpha = Math.min(0.32, (0.045 + 0.055 * Math.abs(Math.sin(t * 1.4 + faz))) * g * sic);
      ctx.translate(x, H - yuk * 0.5);
      ctx.scale(gen, yuk * 0.5);
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) BULUT GÖLGESİ — yer üzerinde yavaşça kayan karartma bantları
  // ⚠ Yalnız ZEMİN bölgesine kırpılır (gökyüzüne bulut gölgesi düşmez).
  // ═════════════════════════════════════════════════════════════════════════
  _bulutGolgesi(ctx, W, H, ba, p, prof, t) {
    const g = this._k(ba, 'bulutGolgesi');
    if (g <= 0) return;
    // Kapalı haritada (mağara) bulut gölgesi ANLAMSIZ — tavan zaten kapalı.
    const guc = (1 - prof.kapali * 0.92) * (0.45 + prof.gunGuc * 0.75);
    if (guc <= 0.05) return;
    const self = this;
    const nk = this._nkOnbellek;
    const koyu = this._rgb(p.sis || '#404850');
    const kr = Math.round(koyu.r * 0.42);
    const kg = Math.round(koyu.g * 0.44);
    const kb = Math.round(koyu.b * 0.50);
    const anh = kr + ',' + kg + ',' + kb;
    const camKay = this._camKayma(ba);

    ctx.save();
    // Zemin poligonuna kırp
    ctx.beginPath();
    if (nk && nk.length > 1) {
      ctx.moveTo(0, H * 2);
      ctx.lineTo(W, H * 2);
      for (let i = nk.length - 1; i >= 0; i--) ctx.lineTo(nk[i].x, nk[i].y);
      ctx.closePath();
    } else {
      ctx.rect(0, H * 0.60, W, H * 0.40);
    }
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    this._bulanik(ctx, Math.min(26, 6 + 18 * g));

    const gr = this._gr(ctx, ba, 'atm-bulutgolge|' + anh, function (c) {
      const grd = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      grd.addColorStop(0.00, 'rgba(' + anh + ',0.92)');
      grd.addColorStop(0.42, 'rgba(' + anh + ',0.62)');
      grd.addColorStop(0.78, 'rgba(' + anh + ',0.18)');
      grd.addColorStop(1.00, 'rgba(' + anh + ',0)');
      return grd;
    });
    ctx.fillStyle = gr;

    const adet = Math.max(2, Math.round(3 + 4 * g));
    const genis = W * 0.55;
    const adim = genis * 1.55;
    const tur = adim * adet;
    for (let i = 0; i < adet; i++) {
      const kay = t * (16 + i * 5) - camKay * (0.30 + i * 0.05);
      const x = this._mod(i * adim + kay, tur) - genis * 0.6;
      const nefes = 0.85 + 0.15 * Math.sin(t * 0.33 + i * 1.6);
      ctx.save();
      ctx.globalAlpha = Math.min(0.60, (0.16 + 0.09 * Math.sin(t * 0.21 + i * 2.4)) * g * guc);
      ctx.translate(x, H * (0.74 + 0.05 * Math.sin(t * 0.17 + i)));
      ctx.scale(genis * nefes, H * 0.30 * nefes);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) ATMOSFERİK PERSPEKTİF — uzak nesnelerin sis rengine kayması
  // Fizik: ışık ne kadar çok hava katmanından geçerse o kadar sis rengine
  // yaklaşır. Ekran uzayında bu, UFKA doğru artan bir örtü demektir.
  // ═════════════════════════════════════════════════════════════════════════
  _atmosferikPerspektif(ctx, W, H, ba, p, prof, ufuk) {
    const g = this._k(ba, 'atmosferikPerspektif');
    if (g <= 0) return;
    const self = this;
    const sis = p.sis || '#cfe0f0';
    const yog = 0.5 + prof.sisYogun * 0.6;

    // a) ufka odaklı sis örtüsü (birim uzay: -1 üst, +1 alt)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    // TUNING(30 Tmz) — 0.26 → 0.14. Bu bant ufka odaklı ama H*0.55 yüksekliğinde,
    // yani ZEMİNE de taşıyor; ölçümde zemin parlaklığının +14'ünü tek başına
    // bu üretiyordu (89 → 75). Hava perspektifi UZAK arka plan içindir.
    ctx.globalAlpha = Math.min(0.55, 0.14 * g * yog);
    ctx.translate(0, ufuk);
    ctx.scale(W, Math.max(8, H * 0.55));
    ctx.fillStyle = this._gr(ctx, ba, 'atm-perspektif|' + sis, function (c) {
      const gr = c.createLinearGradient(0, -1, 0, 1);
      gr.addColorStop(0.00, self._rgba(sis, 0.04));
      gr.addColorStop(0.30, self._rgba(sis, 0.26));
      gr.addColorStop(0.50, self._rgba(sis, 0.72));
      gr.addColorStop(0.66, self._rgba(sis, 0.30));
      gr.addColorStop(1.00, self._rgba(sis, 0));
      return gr;
    });
    ctx.fillRect(0, -1, 1, 2);
    ctx.restore();

    // b) gökyüzünün üst kısmındaki hafif renk doygunluğu kaybı (yükseklikle)
    if (g >= 0.5) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.35, 0.13 * g * yog);
      ctx.fillStyle = this._gr(ctx, ba, 'atm-perstepe|' + W + 'x' + H + '|' + sis, function (c) {
        const gr = c.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0.00, self._rgba(sis, 0.30));
        gr.addColorStop(0.45, self._rgba(sis, 0.05));
        gr.addColorStop(1.00, self._rgba(sis, 0));
        return gr;
      });
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 7) UFUK PARLAMASI — ufuk çizgisinde ince atmosferik parlama şeridi
  // ═════════════════════════════════════════════════════════════════════════
  _ufukParlama(ctx, W, H, ba, p, prof, ufuk, gun, t) {
    const g = this._k(ba, 'ufukParlama');
    if (g <= 0) return;
    const self = this;
    const renk = p.gun || '#ffe8b0';
    const bloom = p.bloom || renk;
    const guc = (0.30 + prof.gunGuc * 0.85) * (1 - prof.kapali * 0.55);
    const nabiz = 0.86 + 0.14 * Math.sin(t * 0.42);
    const anh = renk + '|' + bloom;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // a) geniş, çok soluk atmosferik yayılma
    ctx.save();
    ctx.globalAlpha = Math.min(0.35, 0.09 * g * guc * nabiz);
    ctx.translate(0, ufuk);
    ctx.scale(W, Math.max(6, H * 0.11));
    ctx.fillStyle = this._gr(ctx, ba, 'atm-ufukgenis|' + anh, function (c) {
      const gr = c.createLinearGradient(0, -1, 0, 1);
      gr.addColorStop(0.00, self._rgba(bloom, 0));
      gr.addColorStop(0.42, self._rgba(bloom, 0.30));
      gr.addColorStop(0.50, self._rgba(bloom, 0.55));
      gr.addColorStop(0.58, self._rgba(bloom, 0.28));
      gr.addColorStop(1.00, self._rgba(bloom, 0));
      return gr;
    });
    ctx.fillRect(0, -1, 1, 2);
    ctx.restore();

    // b) ince, keskin parlama şeridi (asıl "ufuk çizgisi")
    ctx.save();
    ctx.globalAlpha = Math.min(0.60, 0.22 * g * guc * nabiz);
    ctx.translate(0, ufuk);
    ctx.scale(W, Math.max(1.5, H * 0.016));
    ctx.fillStyle = this._gr(ctx, ba, 'atm-ufukince|' + anh, function (c) {
      const gr = c.createLinearGradient(0, -1, 0, 1);
      gr.addColorStop(0.00, self._rgba(renk, 0));
      gr.addColorStop(0.38, self._rgba(renk, 0.45));
      gr.addColorStop(0.50, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.62, self._rgba(renk, 0.45));
      gr.addColorStop(1.00, self._rgba(renk, 0));
      return gr;
    });
    ctx.fillRect(0, -1, 1, 2);
    ctx.restore();

    // c) güneşin bulunduğu tarafta yoğunlaşan sıcak leke
    if (g >= 0.45) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, 0.16 * g * guc * nabiz);
      ctx.translate(gun.x, ufuk);
      ctx.scale(Math.max(20, W * 0.42), Math.max(4, H * 0.055));
      ctx.fillStyle = this._gr(ctx, ba, 'atm-ufukleke|' + anh, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0.00, self._rgba(renk, 0.80));
        gr.addColorStop(0.35, self._rgba(bloom, 0.32));
        gr.addColorStop(1.00, self._rgba(bloom, 0));
        return gr;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  // ── ÖNBELLEKLİ GRADIENT ──────────────────────────────────────────────────
  // ba.gr verilmişse ONA delege edilir (tek merkezi önbellek). Verilmemişse
  // aynı semantikte YEREL önbellek kullanılır — hiçbir durumda kare başına
  // yeni gradient üretilmez.
  _gr(ctx, ba, anahtar, uret) {
    if (ba && typeof ba.gr === 'function') {
      const g = ba.gr(anahtar, uret);
      if (g) return g;
    }
    let y = this._grYerel[anahtar];
    if (!y) {
      y = uret(ctx);
      this._grYerel[anahtar] = y;
      this._grUretim++;
    }
    return y;
  },

  // ── Kalite geçidi (0 => o efekt HİÇ çizilmez) ────────────────────────────
  _k(ba, ad) {
    try {
      if (ba && typeof ba.kalite === 'function') {
        const v = ba.kalite(ad);
        return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 0;
      }
      // Bağlam kalite vermediyse global kademeye düş (yoksa 0 = güvenli).
      if (typeof Kalite !== 'undefined' && Kalite && typeof Kalite.ayar === 'function') {
        const v2 = Kalite.ayar(ad);
        return (typeof v2 === 'number' && isFinite(v2)) ? Math.max(0, Math.min(1, v2)) : 0;
      }
    } catch (e) {}
    return 0;
  },

  // ── Blur desteği (bir kez ölçülür) ───────────────────────────────────────
  _blurVar(ctx) {
    if (this._blurDestek !== null) return this._blurDestek;
    let ok = false;
    try {
      const eski = ctx.filter;
      ctx.filter = 'blur(1px)';
      ok = (ctx.filter === 'blur(1px)');
      ctx.filter = eski || 'none';
    } catch (e) { ok = false; }
    this._blurDestek = ok;
    return ok;
  },
  _bulanik(ctx, px) {
    if (!(px > 0)) return;
    if (!this._blurVar(ctx)) return;
    try { ctx.filter = 'blur(' + px.toFixed(1) + 'px)'; } catch (e) {}
  },

  // ── Dünya→ekran dönüşümü ─────────────────────────────────────────────────
  // ⚠ `ba.camera` yalnız `worldToScreen` garantiler (screenToWorld imzası
  //   kamera modülleri arasında farklılaşıyor — ona GÜVENİLMEZ). Dönüşüm afin
  //   olduğu için iki örneklemeyle ölçek ve ters eşleme türetilir.
  _donusum(ba) {
    const c = ba && ba.camera;
    if (!c || typeof c.worldToScreen !== 'function') return null;
    const ax = (ba.vehicle && typeof ba.vehicle.x === 'number') ? ba.vehicle.x : 0;
    let a, b;
    try {
      a = c.worldToScreen(ax, 0);
      b = c.worldToScreen(ax + 1000, 0);
    } catch (e) { return null; }
    if (!a || !b || !isFinite(a.x) || !isFinite(a.y) || !isFinite(b.x)) return null;
    const olcek = (b.x - a.x) / 1000;
    if (!isFinite(olcek) || Math.abs(olcek) < 1e-6) return null;
    return {
      olcek: olcek,
      ekran: function (wx, wy) {
        try { return c.worldToScreen(wx, wy); } catch (e) { return null; }
      },
      dunyaX: function (sx) { return ax + (sx - a.x) / olcek; }
    };
  },

  // Ekranın sol kenarının dünya-X'i (parallaks tabanı). Kamera yoksa 0.
  _camKayma(ba) {
    const d = this._donusum(ba);
    if (!d) return 0;
    const x = d.dunyaX(0);
    return isFinite(x) ? x : 0;
  },

  // Bir önceki kareye göre kamera kayması — PARÇACIK parallaksı için.
  // ⚠ İlk karede 0 döner (yoksa zerreler açılışta ekranın dışına fırlar).
  _camKaymaDelta(ba) {
    const x = this._camKayma(ba);
    const d = this._donusum(ba);
    const olcek = d ? Math.abs(d.olcek) : 1;
    if (this._sonCamX === null) { this._sonCamX = x; return 0; }
    let dx = (x - this._sonCamX) * olcek;
    this._sonCamX = x;
    if (!isFinite(dx)) dx = 0;
    // Işınlanma (yeniden doğma / harita değişimi) parçacıkları savurmasın.
    return Math.max(-200, Math.min(200, dx));
  },

  // ── Arazi siluetinin ekran noktaları (kare başına BİR KEZ) ───────────────
  _zeminNoktalari(ba, W, adet) {
    const d = this._donusum(ba);
    const ter = (ba && ba.terrain && typeof ba.terrain.getYAt === 'function') ? ba.terrain : null;
    if (!d || !ter) return null;
    const nk = [];
    for (let i = 0; i <= adet; i++) {
      const sx = (W * i) / adet;
      const wx = d.dunyaX(sx);
      if (!isFinite(wx)) return null;
      let wy;
      try { wy = ter.getYAt(wx); } catch (e) { return null; }
      if (!isFinite(wy)) return null;
      const s = d.ekran(wx, wy);
      if (!s || !isFinite(s.y)) return null;
      nk.push({ x: sx, y: s.y });
    }
    return nk.length > 1 ? nk : null;
  },

  // ── Ufuk yüksekliği — arazi ortalamasından, sınırlandırılmış ─────────────
  // ⚠ Ortalama kullanılır (tek tepe ufku zıplatmasın); ayrıca ekranın
  //   %22-%86 aralığına kelepçelenir, yoksa dik yokuşta ufuk kaybolur.
  _ufukY(H, nk) {
    if (!nk || nk.length < 2) return H * 0.62;
    let top = 0;
    for (let i = 0; i < nk.length; i++) top += nk[i].y;
    const ort = top / nk.length;
    if (!isFinite(ort)) return H * 0.62;
    return Math.max(H * 0.22, Math.min(H * 0.86, ort));
  },

  // ── Güneş ekran konumu (paletten + haritadan + zamandan) ────────────────
  _gunesKonum(W, H, prof, t) {
    const yon = Math.max(-1, Math.min(1, prof.gunYon + Math.cos(t * 0.0175) * 0.28));
    const yuk = Math.max(0.05, Math.min(0.92, prof.gunYuk + Math.sin(t * 0.0175) * 0.11));
    return {
      x: W * (0.5 + yon * 0.38),
      y: H * (0.44 - yuk * 0.40),
      guc: prof.gunGuc,
      // Huzme demetinin eğimi: güneş ne kadar yandaysa huzmeler o kadar yatık.
      egim: -yon * 0.55 + Math.sin(t * 0.07) * 0.03
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ATMOSFER PROFİLİ — harita + palet → karakter (harita başına BİR KEZ)
  // Fikir: `palet.sis` ortamın KAPALILIĞINI, `palet.gun` ışığın SICAKLIĞINI,
  // `palet.tint` biyomun kimliğini taşır. Liste bunu keskinleştirir.
  // ═════════════════════════════════════════════════════════════════════════
  _profil(ba, p) {
    p = p || this._VARSAYILAN_PALET;
    const mid = (ba && ba.mapId) || 'varsayilan';
    const anahtar = mid + '|' + (p.gun || '') + '|' + (p.sis || '') + '|' + (p.tint || '');
    let s = this._profilOnbellek[anahtar];
    if (s) return s;

    const gr = this._rgb(p.gun || '#ffe8b0');
    const sr = this._rgb(p.sis || '#cfe0f0');
    const tr = this._rgb(p.tint || '#8fa8c0');
    const parlak = (gr.r + gr.g + gr.b) / 765;
    const sisParlak = (sr.r + sr.g + sr.b) / 765;
    const sicakRenk = (tr.r - tr.b) / 255;             // kırmızıya kayık = sıcak
    const yesil = (tr.g - (tr.r + tr.b) * 0.5) / 255;  // yeşile kayık = bitki
    const mavi = (tr.b - (tr.r + tr.g) * 0.5) / 255;

    // Kapalılık: sis rengi ne kadar koyuysa ortam o kadar kapalı.
    let kapali = Math.max(0, Math.min(1, 1 - sisParlak * 1.18));
    kapali = Math.max(kapali, (this.MAGARA[mid] || 0) * 0.92);

    // Sıcaklık: liste öncelikli, yoksa palet sezgisi.
    let sicak = this.SICAK[mid] || 0;
    if (!sicak && sicakRenk > 0.30 && parlak > 0.35) sicak = Math.min(0.7, sicakRenk * 1.4);

    // Soğukluk (yoğun sis + kar zerresi)
    let soguk = this.SOGUK[mid] || 0;
    if (!soguk && mavi > 0.16 && sisParlak > 0.78) soguk = Math.min(0.7, mavi * 2.2);

    const orman = this.ORMAN[mid] || (yesil > 0.14 ? Math.min(0.7, yesil * 3.0) : 0);

    // Zerre tipi — öncelik: kor > kar > parıltı > polen > toz
    let zerreTip = 'toz';
    if (sicak >= 0.7) zerreTip = 'kor';
    else if (soguk >= 0.7) zerreTip = 'kar';
    else if (kapali >= 0.62) zerreTip = 'parilti';
    else if (orman >= 0.6) zerreTip = 'polen';
    else if (sicak >= 0.4) zerreTip = 'toz';

    let zerreRenk;
    if (zerreTip === 'kor') zerreRenk = this._karis(p.bloom || '#ffb060', '#ff5a10', 0.45);
    else if (zerreTip === 'kar') zerreRenk = this._karis(p.bloom || '#eafaff', '#ffffff', 0.60);
    else if (zerreTip === 'parilti') zerreRenk = this._karis(p.bloom || '#8fd0ff', '#9fe0ff', 0.50);
    else if (zerreTip === 'polen') zerreRenk = this._karis(p.gun || '#f0ffb0', '#eaff90', 0.40);
    else zerreRenk = this._karis(p.gun || '#ffe8b0', p.sis || '#cfe0f0', 0.35);

    s = {
      kapali: kapali,
      sicak: Math.max(0, Math.min(1, sicak)),
      soguk: Math.max(0, Math.min(1, soguk)),
      orman: Math.max(0, Math.min(1, orman)),
      // Sis yoğunluğu: kar/kapalı ortam yoğun, çöl/sıcak seyrek.
      sisYogun: Math.max(0.28, Math.min(1.75,
        0.85 + soguk * 0.85 + kapali * 0.55 - sicak * 0.42)),
      zerreTip: zerreTip,
      zerreRenk: zerreRenk,
      zerreYogun: Math.max(0.25, Math.min(1,
        0.42 + sicak * 0.40 + soguk * 0.55 + kapali * 0.32 + orman * 0.30)),
      zerreBoy: (zerreTip === 'kar') ? 1.35 : (zerreTip === 'kor' ? 1.10 : 1.0),
      gunGuc: Math.max(0.10, Math.min(1, parlak * (1 - kapali * 0.62))),
      gunYon: ((this._hash(mid) % 200) / 100) - 1,          // -1..1, haritaya özel
      // Sıcak/loş ışık ufka yakın (uzun gölge), soğuk/parlak ışık tepede.
      gunYuk: Math.max(0.10, Math.min(0.92, 0.20 + parlak * 0.62 - sicakRenk * 0.30))
    };
    this._profilOnbellek[anahtar] = s;
    return s;
  },

  // ── Sayısal / renk yardımcıları ──────────────────────────────────────────
  _mod(a, n) {
    if (!(n > 0) || !isFinite(a)) return 0;
    return ((a % n) + n) % n;
  },
  // Deterministik seri — Math.random KULLANILMAZ (aynı tohum → aynı havuz,
  // duman testleri tekrarlanabilir olsun diye).
  _rnd() {
    this._tohum = (this._tohum * 1103515245 + 12345) % 2147483648;
    return this._tohum / 2147483648;
  },
  _rgb(hex) {
    const h = String(hex == null ? '' : hex).replace('#', '').trim();
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 200, g: 216, b: 232 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  // ⚠ HEX döner ('rgb(...)' DEĞİL) — çıktısı `_rgb`'ye geri beslenebilsin ve
  //   gradient önbellek anahtarında kararlı bir dize olsun diye.
  _karis(hexA, hexB, t) {
    const a = this._rgb(hexA), b = this._rgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    const r = Math.round(a.r + (b.r - a.r) * k);
    const g = Math.round(a.g + (b.g - a.g) * k);
    const bl = Math.round(a.b + (b.b - a.b) * k);
    const h2 = function (v) { const s = v.toString(16); return s.length < 2 ? '0' + s : s; };
    return '#' + h2(r) + h2(g) + h2(bl);
  },
  // ⚠ `Math.imul` TAM 32-bit çarpar. Düz `*` kullanılırsa double yuvarlaması
  //   devreye girer (CLAUDE.md tuzak D16) — burada bilinçli olarak imul.
  _hash(s) {
    s = String(s == null ? '' : s);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  },

  // ── Test için sahte 2D bağlam ────────────────────────────────────────────
  _sahteCtx() {
    const say = { save: 0, restore: 0, ciz: 0, gradient: 0, clip: 0,
                  donusum: 0, temizle: 0 };
    const grad = { addColorStop: function () {} };
    return {
      _say: say,
      canvas: { width: 800, height: 450 },
      filter: 'none',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      save: function () { say.save++; },
      restore: function () { say.restore++; },
      beginPath: function () {},
      closePath: function () {},
      moveTo: function () {},
      lineTo: function () {},
      rect: function () {},
      arc: function () {},
      clip: function () { say.clip++; },
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      // ⚠ `setTransform` VAR ama `getTransform` YOK — bu bilinçlidir:
      //   `_tozZerre` hızlı yolunu `getTransform` varlığıyla seçer, sahte
      //   bağlamda ESKİ yolu ölçmeye devam etmeliyiz (davranış değişmesin).
      setTransform: function () { say.donusum++; },
      clearRect: function () { say.temizle++; },
      fill: function () { say.ciz++; },
      stroke: function () { say.ciz++; },
      fillRect: function () { say.ciz++; },
      strokeRect: function () { say.ciz++; },
      drawImage: function () { say.ciz++; },
      createLinearGradient: function () { say.gradient++; return grad; },
      createRadialGradient: function () { say.gradient++; return grad; }
    };
  },

  // ── Sahte offscreen tuval (başsız ortamda tampon yolunu ÖLÇEBİLMEK için) ──
  // 🔴 node/selfTest ortamında `document` YOKTUR → `_tuvalYap` null döner ve
  //   yarı çözünürlüklü yol SIFIR kapsamda kalırdı (ölçülmeyen kod = bilinmeyen
  //   kod). `_tuvalSayaci`'nı ARTIRMAZ → "kare başına tahsis 0" iddiası
  //   bozulmadan ölçülebilir.
  _sahteTuval(w, h) {
    const c = this._sahteCtx();
    const k = { width: w, height: h, _say: c._say, getContext: function () { return c; } };
    c.canvas = k;
    return k;
  },
  _sahteAraKur(W, H) {
    const geri = { ara: this._ara, araC: this._araC, bozuk: this._araBozuk };
    this._ara = this._sahteTuval(Math.max(16, Math.round(W / 2)),
                                 Math.max(16, Math.round(H / 2)));
    this._araC = this._ara.getContext('2d');
    this._araBozuk = false;
    return geri;
  },
  _sahteAraGeri(g) {
    if (!g) return;
    this._ara = g.ara; this._araC = g.araC; this._araBozuk = g.bozuk;
    this._araAcik = false;
  },

  // ── Test için sahte bağlam nesnesi ───────────────────────────────────────
  _sahteBa(mapId, palet, kaliteDeger, t) {
    const self = this;
    const onbellek = {};
    const sayac = { yeni: 0 };
    return {
      mapId: mapId,
      palet: palet,
      t: (t == null ? 12.5 : t),
      dt: 0.016,
      vehicle: {
        x: 4200, y: 900, vx: 340, vy: -20, angle: 0.18, onGround: true,
        width: 120, height: 54
      },
      camera: {
        worldToScreen: function (wx, wy) { return { x: (wx - 3900) * 1.15, y: (wy - 700) * 1.15 }; }
      },
      terrain: {
        getYAt: function (wx) { return 950 + Math.sin(wx * 0.004) * 60; }
      },
      kalite: function () { return kaliteDeger; },
      gr: function (anahtar, uret) {
        let g = onbellek[anahtar];
        if (!g) { g = uret(self._sonTestCtx); onbellek[anahtar] = g; sayac.yeni++; }
        return g;
      },
      _sayac: sayac
    };
  },
  _sonTestCtx: null,

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — canvas gerektirmez, sahte ctx üzerinde ÖLÇEREK doğrular
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'atmosfer') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');

    // 2) Renk / sayı yardımcıları
    r.rgbDogru = (function (s) {
      const c = s._rgb('#ff8000'), k = s._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 &&
             k.r === 255 && k.g === 136 && k.b === 0;
    })(this);
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.karisHex = /^#[0-9a-f]{6}$/.test(this._karis('#000000', '#ffffff', 0.5));
    r.bozukRenkGuvenli = !!this._rgb('lacivert-yok') && !!this._rgb(null);
    r.modPozitif = this._mod(-30, 100) === 70 && this._mod(130, 100) === 30 && this._mod(5, 0) === 0;
    r.hashKararli = this._hash('volcano') === this._hash('volcano') &&
                    this._hash('volcano') !== this._hash('cave');

    // 3) Atmosfer profili — harita farkı gerçekten davranışa yansımalı
    const pV = { tint: '#e04a1a', bloom: '#ffa040', sis: '#5a2418', gun: '#ff7030' };
    const pM = { tint: '#3a4a6a', bloom: '#8fd0ff', sis: '#20304a', gun: '#6090c0' };
    const pK = { tint: '#8ed8f0', bloom: '#eafaff', sis: '#e0f6ff', gun: '#d0eaff' };
    const pO = { tint: '#3f9a3a', bloom: '#e8ffc0', sis: '#a8d8a0', gun: '#f0ffb0' };
    const fV = this._profil({ mapId: 'volcano' }, pV);
    const fM = this._profil({ mapId: 'cave' }, pM);
    const fK = this._profil({ mapId: 'arctic' }, pK);
    const fO = this._profil({ mapId: 'jungle' }, pO);
    r.profilVolkanSicak = fV.sicak >= 0.9 && fV.zerreTip === 'kor';
    r.profilMagaraKapali = fM.kapali > fK.kapali && fM.zerreTip === 'parilti';
    r.profilKutupSoguk = fK.soguk >= 0.9 && fK.zerreTip === 'kar';
    r.profilOrmanPolen = fO.zerreTip === 'polen';
    r.sisYogunlukSirasi = fK.sisYogun > fV.sisYogun;          // kar > volkan
    r.profilSiniri = [fV, fM, fK, fO].every(function (f) {
      return f.gunGuc > 0 && f.gunGuc <= 1 && f.gunYuk > 0 && f.gunYuk < 1 &&
             f.gunYon >= -1 && f.gunYon <= 1 && f.sisYogun > 0 && f.zerreYogun > 0 &&
             /^#[0-9a-f]{6}$/.test(f.zerreRenk);
    });

    // 4) Ufuk yüksekliği kelepçesi
    r.ufukKelepce = (function (s) {
      const yok = s._ufukY(400, null) === 400 * 0.62;
      const yuksek = s._ufukY(400, [{ x: 0, y: -9000 }, { x: 1, y: -9000 }]);
      const alcak = s._ufukY(400, [{ x: 0, y: 9000 }, { x: 1, y: 9000 }]);
      return yok && yuksek >= 400 * 0.22 && alcak <= 400 * 0.86;
    })(this);

    // 5) Gradient önbelleği — ikinci çağrı YENİ gradient ÜRETMEMELİ
    r.gradientOnbellek = (function (s) {
      s._grYerel = {}; s._grUretim = 0;
      const sahte = s._sahteCtx();
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      const ilk = s._grUretim;
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createLinearGradient(0, 0, 1, 0); });
      return ilk === 1 && s._grUretim === 1;
    })(this);

    // 6) Kalite geçidi: 0 => TEK BİR çizim çağrısı bile olmamalı
    r.kaliteSifirCizmez = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('volcano', pV, 0);
      s.ciz(ctx, 800, 450, ba);
      return ctx._say.ciz === 0 && ctx._say.gradient === 0 && ba._sayac.yeni === 0;
    })(this);

    // 7) Tam kalitede çiziyor + save/restore DENGELİ + durum geri konuyor
    const olcum = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const ba = s._sahteBa('volcano', pV, 1);
      s.ciz(ctx, 800, 450, ba);
      return {
        ciz: ctx._say.ciz,
        clip: ctx._say.clip,
        dengeli: ctx._say.save === ctx._say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor',
        yeniGradient: ba._sayac.yeni
      };
    })(this);
    r.tamKaliteCiziyor = olcum.ciz > 30;
    r.siluetKirpiliyor = olcum.clip >= 2;               // godRay + bulutGolgesi
    r.saveRestoreDengeli = olcum.dengeli;
    r.durumGeriKonuyor = olcum.alfa && olcum.karisim;

    // 8) İkinci kareden sonra YENİ gradient üretilmemeli (ba.gr önbelleği)
    r.kareBasinaSifirGradient = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('cave', pM, 1);
      for (let i = 0; i < 5; i++) { ba.t = 10 + i * 0.016; s.ciz(ctx, 800, 450, ba); }
      const ilk = ba._sayac.yeni;
      for (let i = 0; i < 40; i++) { ba.t = 11 + i * 0.016; s.ciz(ctx, 800, 450, ba); }
      return ilk > 0 && ba._sayac.yeni === ilk;
    })(this);

    // 9) 🔴 PARÇACIK HAVUZU SINIRLI — 200 karede uzunluk DEĞİŞMEMELİ
    r.havuzSabit = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const once = s._havuz.length;
      const ba = s._sahteBa('arctic', pK, 1);
      for (let i = 0; i < 200; i++) { ba.t = 20 + i * 0.016; s.ciz(ctx, 800, 450, ba); }
      const sonra = s._havuz.length;
      const sinirli = s._havuz.every(function (z) {
        return isFinite(z.x) && isFinite(z.y) &&
               z.x >= -50 && z.x <= 900 && z.y >= -50 && z.y <= 550;
      });
      return once === s._HAVUZ_MAX && sonra === s._HAVUZ_MAX && sinirli;
    })(this);

    // 10) Eksik bağlam (kamera/arazi/araç yok) çökertmemeli
    r.eksikBaglamGuvenli = (function (s) {
      try {
        const ctx = s._sahteCtx();
        s._sonTestCtx = ctx;
        s.ciz(ctx, 640, 360, { mapId: 'cave', t: 3, kalite: function () { return 1; } });
        s.ciz(ctx, 640, 360, {});
        s.ciz(ctx, 640, 360, null);
        s.ciz(null, 640, 360, {});
        s.ciz(ctx, 0, 0, {});
        return true;
      } catch (e) { return false; }
    })(this);

    // 11) Soğuk haritada ısı dalgası HİÇ çizilmemeli (gereksiz iş yok)
    r.sogukIsiDalgasiYok = (function (s) {
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('arctic', pK, 1);
      const f = s._profil(ba, pK);
      const once = ctx._say.ciz;
      s._isiDalgasi(ctx, 800, 450, ba, pK, f, 5);
      return ctx._say.ciz === once;
    })(this);

    // 12) hazir() boyut değişimini yakalıyor + havuzu yeniden kuruyor
    r.hazirBoyut = (function (s) {
      const eskiW = s._W, eskiH = s._H, eskiHz = s._hazirlandi;
      s.hazir(400, 300);
      const a = (s.hazir(400, 300) === false);      // aynı boyut → iş yok
      const b = (s.hazir(500, 300) === true);       // değişti → yeniden kur
      const c = (s._havuz.length === s._HAVUZ_MAX);
      s._W = eskiW; s._H = eskiH; s._hazirlandi = eskiHz;
      return a && b && c;
    })(this);

    // 13) Kalite anahtarlarının TAMAMI tanımlı ve `ciz` içinden geçiyor
    r.kaliteAnahtarlari = (function (s) {
      const beklenen = ['katmanliSis', 'godRay', 'tozZerre', 'isiDalgasi',
                        'bulutGolgesi', 'atmosferikPerspektif', 'ufukParlama'];
      const gorulen = {};
      const ctx = s._sahteCtx();
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('volcano', pV, 1);
      ba.kalite = function (ad) { gorulen[ad] = true; return 1; };
      s.ciz(ctx, 800, 450, ba);
      return beklenen.every(function (k) { return gorulen[k] === true; }) &&
             Object.keys(gorulen).length === beklenen.length;
    })(this);

    // 14) 🔴 YARI ÇÖZÜNÜRLÜKLÜ TOPLAYICI — ÖLÇEREK doğrulanır (1 Ağu)
    //   Hiçbiri "koda bakarak" değil, SAYARAK kontrol edilen 8 madde:
    //     a) `_ara` tamponu ekranın tam YARISI boyutunda
    //     b) perspektif + sis'in TÜM geçişleri (2 + 4 bant + 22 puf = 28)
    //        tampona gidiyor — hiçbiri düşmüyor, hiçbiri eklenmiyor
    //     c) o iki katmandan EKRANA yalnız 1 bindirme gidiyor
    //     d) tampon yolu ile yedek yol AYNI çizim sayısını üretiyor (kayıp yok)
    //     e) çizim sırasında YENİ TUVAL TAHSİSİ YOK (kare başına 0)
    //     f) tampon karede TAM 1 kez temizleniyor (hayalet yok, israf yok)
    //     g) bindirme patlarsa katmanlar tam çözünürlükte YENİDEN çiziliyor —
    //        "sessizce çizmemek" KABUL EDİLMEZ
    //     h) kalite 0'da tampon HİÇ açılmıyor (boşuna 1,25 alan harcanmaz)
    //   ⚠ Ölçüm SOĞUK haritada (arctic) yapılır: `_isiDalgasi` orada hiç
    //     çizmediği için `ciz()` içindeki TEK `drawImage` bindirmenin kendisi
    //     olur → (g) maddesinde sayılar karışmaz.
    r.yariCozunurlukToplayici = (function (s) {
      const W = 800, H = 450, mid = 'arctic', pal = pK;
      s.hazir(W, H);

      // ── Referans: iki katmanın TAM ÇÖZÜNÜRLÜKTE ürettiği çizim sayısı ──
      const cRef = s._sahteCtx(); s._sonTestCtx = cRef;
      const baRef = s._sahteBa(mid, pal, 1);
      const prof = s._profil(baRef, pal);
      s._atmosferikPerspektif(cRef, W, H, baRef, pal, prof, H * 0.6);
      s._katmanliSis(cRef, W, H, baRef, pal, prof, H * 0.6, 12.5);
      const katman = cRef._say.ciz;

      // Aynı kareyi iki yolda da aynı başlangıçtan koşturmak için durum sıfırı.
      const tazele = function () { s._havuzKur(W, H); s._sonCamX = null; };

      // ── a,b,c,e,f) HIZLI YOL ──
      const g1 = s._sahteAraKur(W, H);
      const boyutOk = (s._ara.width === Math.round(W / 2)) &&
                      (s._ara.height === Math.round(H / 2));
      const ctxH = s._sahteCtx(); s._sonTestCtx = ctxH;
      tazele();
      const tuvalOnce = s._tuvalSayaci, bindirmeOnce = s._araBindirme;
      s.ciz(ctxH, W, H, s._sahteBa(mid, pal, 1));
      const araCizim = s._araC._say.ciz;
      const araTemizlik = s._araC._say.temizle;
      const hizliEkran = ctxH._say.ciz;
      const tahsisSifir = (s._tuvalSayaci === tuvalOnce);
      const bindirme = s._araBindirme - bindirmeOnce;
      s._sahteAraGeri(g1);

      // ── d) YEDEK YOL: ara tuval kasıtlı YOK → katmanlar doğrudan ekrana ──
      const g2 = s._sahteAraKur(W, H);
      s._ara = null; s._araC = null;
      const ctxY = s._sahteCtx(); s._sonTestCtx = ctxY;
      tazele();
      s.ciz(ctxY, W, H, s._sahteBa(mid, pal, 1));
      const yedekEkran = ctxY._say.ciz;
      s._sahteAraGeri(g2);

      // ── g) BİNDİRME PATLIYOR → tam çözünürlüklü yeniden çizim ──
      const g3 = s._sahteAraKur(W, H);
      const ctxP = s._sahteCtx(); s._sonTestCtx = ctxP;
      ctxP.drawImage = function () { throw new Error('bindirme yok'); };
      tazele();
      s.ciz(ctxP, W, H, s._sahteBa(mid, pal, 1));
      const patlakEkran = ctxP._say.ciz;
      const bozuldu = (s._araBozuk === true);
      s._sahteAraGeri(g3);

      // ── h) kalite 0 → tampon HİÇ açılmasın ──
      const g4 = s._sahteAraKur(W, H);
      const ctx0 = s._sahteCtx(); s._sonTestCtx = ctx0;
      s.ciz(ctx0, W, H, s._sahteBa(mid, pal, 0));
      const sifirda = (s._araC._say.ciz === 0) && (s._araC._say.temizle === 0) &&
                      (ctx0._say.ciz === 0);
      s._sahteAraGeri(g4);
      s.hazir(W, H);
      tazele();

      return boyutOk && tahsisSifir && bozuldu && sifirda &&
             katman >= 20 &&                                    // anlamlı bir yük
             araCizim === katman &&                             // b) hepsi tampona
             araTemizlik === 1 &&                               // f) tek temizlik
             bindirme === 1 &&                                  // c) tek bindirme
             hizliEkran === yedekEkran - katman + 1 &&          // c+d) kayıp yok
             patlakEkran === yedekEkran;                        // g) yedek çalışıyor
    })(this);

    this._sonTestCtx = null;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselAtmosfer = GorselAtmosfer;
