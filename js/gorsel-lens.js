'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-LENS — Bloom piramidi + objektif (lens) efektleri son-işlem katmanı
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında "kameranın kendisi"ni
// simüle eder. `gorsel.js` renk derecelendirme + tek geçişli bloom yapar,
// `gorsel-isik.js` ışık/gölge yapar; BURASI objektifin fiziği:
// çok kademeli parlama, anamorfik çizgi, hayalet halkalar, lens kiri,
// kromatik sapma ve varil distorsiyonu. Çizim koduna HİÇ dokunmaz.
//
// EFEKTLER (her biri AYRI kalite anahtarıyla geçitli — 0 ise TEK çizim yok):
//   · varil         — hafif varil/fıçı distorsiyonu (halka halka örnekleme kayması)
//   · kromatik      — kenarda güçlenen, merkezde SIFIR olan RGB kayması
//   · parlakEsik    — parlak-geçir eşiği (bloom/anamorfik'in ORTAK ön aşaması)
//   · bloomPiramit  — 1/2 · 1/4 · 1/8 ölçekte ayrı blur geçişleri, ağırlıklı toplam
//   · anamorfik     — yatay uzayan mavi-mor anamorfik lens çizgisi
//   · lensHalka     — güneşin ekran KARŞITI yönünde dizilmiş hayalet halkalar
//   · lensKir       — bir kez üretilip önbelleklenen lens kiri/leke dokusu
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bu dosya HİÇBİR bare global'e güvenmez (Game/Terrain/Camera `window`'da
// DEĞİL — CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle · ba.camera
//   ba.terrain · ba.t · ba.dt · ba.kalite(ad) · ba.gr(anahtar, uretici)
//
// 🔴 PERFORMANS + GÜVENLİK KURALLARI
//   1. `createLinearGradient` / `createRadialGradient` DOĞRUDAN ÇAĞRILMAZ.
//      Hepsi `this._gr(...)` → `ba.gr(...)` önbelleğinden geçer. Konumu her
//      karede değişen efektler (halka, kir maskesi) BİRİM UZAYDA (0,0,r=1)
//      üretilmiş gradient + `translate/scale` ile çizilir; gradient boyası
//      BOYAMA anındaki dönüşümde çözülür → tek önbellek yeter, anahtarda
//      KONUM/ZAMAN YOKTUR (yoksa kare başına yeni gradient üretilir).
//   2. `getImageData` / `putImageData` YOK. Tek istisna yok: lens kiri dokusu
//      bile piksel okumadan, katmanlı `arc` + `blur()` ile BİR KEZ üretilir.
//   3. Her efekt `ba.kalite('...')` ile geçitli; 0 dönerse tek bir çizim
//      çağrısı bile yapılmaz (selfTest bunu SAYARAK doğrular).
//   4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
//   5. `globalAlpha` / `globalCompositeOperation` / `filter` her hâlükârda
//      geri konur (bir efekt yarıda patlasa bile).
//   6. Offscreen tamponlar TEMBEL kurulur (kalitesi 0 olan efektin tamponu
//      hiç ayrılmaz) ve boyut değişince topluca atılır.
//
// 🔴 BLOOM PATLAMASI TUZAĞI (CLAUDE.md · §8B.28/P — canlıda yaşandı):
//    İlk ULTRA ayarı 27/27 doğrulayıcıyı geçiyordu ama ekran BEMBEYAZ
//    patlamıştı. Sebep: parlak-geçir eşiği `brightness(1.35) contrast(2.1)`
//    ile TÜM sahneyi geçiriyordu. Doğrusu: ÖNCE KARART (`brightness(<1)`),
//    SONRA sert `contrast`. Bu dosyada bindirme alfası toplamı da kilitli:
//    `_BLOOM_AGIRLIK` toplamı 0.30'u AŞAMAZ (selfTest bunu ölçer).
//
// ── 🔴 YARI ÇÖZÜNÜRLÜKLÜ 'lighter' TOPLAYICI (`_ara`, 2 Ağu) ──────────────
//   `_bloomPiramit` + `_anamorfik` `ciz()` içinde ARDIŞIKtır ve İKİSİ DE
//   `lighter`dır → tek şeffaf tamponda toplanıp ekrana TEK kez bindirilirler.
//   Taşınan 5 TAM EKRAN geçişi (bloom 1/2 · 1/4 · 1/8 + anamorfik ×2).
//
//   🔴 GÖRÜNTÜ NEDEN AYNI: `lighter` TOPLAMALIdır → B⊕L1⊕…⊕Ln ≡ B⊕(L1⊕…⊕Ln).
//      Kelepçe (clamp) de bozmaz: kanal başına doğrudan yol ardışık
//      `min(1, ...)` uygular, tampon yolu bir kez uygular; toplam 1'i aşınca
//      İKİSİ DE 1 verir, aşmayınca ikisi de tam toplamı verir. Ayrıca
//      `lighter` ön-çarpımlı renk ≤ alfa değişmezini korur, dolayısıyla
//      tamponda alfa doyması renk bilgisini KIRPMAZ.
//      ÖLÇÜLEN üst sınır zaten çok altta: bloom 0,11+0,10+0,08 = 0,29 ·
//      anamorfik 0,09+0,05 = 0,14 → toplam 0,43 < 1,00 (doyma imkânsız).
//      Tamponun taban dönüşümü `setTransform(W'/W, 0, 0, H'/H, 0, 0)` olduğu
//      için efekt kodunun TEK SATIRI değişmez; tek fark örnekleme
//      çözünürlüğüdür. Kaynaklar (k0=W/2 · k1=W/4 · k2=W/8 · anaA=W/4)
//      ZATEN yarı çözünürlüğün altında ve blur'lu → bilgi kaybı YOK.
//      ⛔ HİÇBİR EFEKT SİLİNMEDİ, hiçbir kalite anahtarı düşürülmedi, hiçbir
//         hayalet/saçak/kademe sayısı azaltılmadı; alfa formülleri BİREBİR aynı.
//
//   🔴 KAZANÇ KURALI (ÖLÇMEDEN TAŞIMA YOK): tampona almanın sabit bedeli
//      `0,25` (tampon temizliği) + `1,00` (bindirme) = 1,25; taşınan alan A
//      ise `A × 0,75 > 1,25`, yani `A > 1,667` olmalı.
//      `node port-araclari\dogrula-dolgu.js` ÖLÇÜMÜ (blizzard/hızlı):
//        bloomPiramit(412/415/418) + anamorfik(493/495)  A = 4,992
//                                    → 0,25 + 4,992×0,25 + 1,00 = 2,498
//                                    KÂR 2,494 ✅  (TAŞINDI)
//        lensHalka (4 çağrı yeri, `lighter`)             A = 0,134 → 0,034
//          Tampon ZATEN açık olduğu için sabit bedeli yok; DENENDİ ve ÖLÇÜLDÜ:
//          lens 11,79 → 11,70 · toplam 46,66 → 46,56 = yalnız 0,10 (%0,21). ❌
//          ⚠ İKİ gerekçeyle GERİ ALINDI:
//            1. `kalite < 0,55`te bulanıklık UYGULANMAZ (`_bulanik` geçidi);
//               halka/altıgen kenarları KESKİNdir → yarı çözünürlükte gözle
//               görülür yumuşama olur. "Aynı görüntüyü daha ucuza" bozulur.
//            2. Hayalet alfaları yüksek (0,85 × gradyan durağı 0,72 ≈ 0,61) →
//               tamponun birikimi 0,43'ten ~1,0'a yaklaşır ve "doyma imkânsız"
//               marjı (birebir eşdeğerlik güvencesi) erir. 0,10 buna değmez.
//        lensKir (663 `overlay` A=1,000 · 699 `screen` A=1,000)        ❌
//          ⚠ İKİ FARKLI karışım modu → aynı tamponda birleşmez; `overlay`
//            zaten toplamalı/birleşmeli DEĞİL. Tek tek de kârsız:
//            1,000 → 0,25 + 0,25 + 1,00 = 1,50 → her biri ZARAR +0,50.
//
//   🔴 SIRA KİLİDİ: `_varil`(186) · `_kromatik`(252/264) · `_piramit`(358)
//      canlı tuvali (`ctx.canvas`) OKUR. Bu yüzden `_bloomPiramit` ve
//      `_anamorfik` EKRAN bağlamını AYRI bir `ekr` parametresiyle alır —
//      `_piramit` her zaman EKRANI örnekler, tamponu DEĞİL. Tampon bindirmesi
//      `_lensKir`ten (farklı mod) ÖNCE, `_lensHalka`dan da önce yapılır;
//      ardışık `lighter` katmanları yer değiştirmeli olduğu için sıra korunur.
//
//   🔴 BULANIKLIK: bu grupta `ctx.filter` KULLANILMAZ (blur yalnız `_gecis`
//      offscreen piramidinde ve `_lensHalka`da; ikisi de çözünürlük
//      değiştirmiyor) → yarıya bölünecek bir `blur(Npx)` YOKTUR.
//
//   🔴 YEDEK YOL: bindirme patlarsa "sessizce çizmemek" KABUL EDİLMEZ —
//      hızlı yol KALICI kapatılır (`_araBozuk`) ve aynı iki efekt ESKİ tam
//      çözünürlüklü yolla YENİDEN çizilir (`_piramit` kare önbelleği
//      sayesinde piramit ikinci kez KURULMAZ).
// ═══════════════════════════════════════════════════════════════════════════
const GorselLens = {
  ad: 'lens',

  // ── iç durum ─────────────────────────────────────────────────────────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _olcu: null,              // {w2,h2,w4,h4,w8,h8} — piramit kademelerinin boyu
  _buflar: {},              // tembel kurulan offscreen tamponlar (ad → canvas)
  _grYerel: {},             // ba.gr verilmediyse kullanılan yedek önbellek
  _grUretim: 0,             // ölçüm: yedek önbellekte kaç YENİ gradient üretildi
  _blurDestek: null,        // ctx.filter blur destekliyor mu (bir kez ölçülür)
  _kirDoku: null,           // lens kiri dokusu — BİR KEZ üretilir
  _kirDenendi: false,
  _kaynakOnbellek: {},      // paletten türeyen ışık kaynağı sabitleri
  _kareNo: 0,
  _piramitKare: -1,         // piramit bu kare numarasında kuruldu mu
  _piramitVar: false,
  _piramitSayac: 0,         // ölçüm: piramit kaç kez kuruldu (kare başına ≤1)
  _testFabrika: null,       // selfTest/duman testi için sahte kanvas üreteci

  // ── YARI ÇÖZÜNÜRLÜKLÜ 'lighter' TOPLAYICI (bkz. başlıktaki blok) ─────────
  _araAcik: false,          // bu karede toplayıcı kullanılıyor mu
  _araBozuk: false,         // bindirme bir kez patladıysa hızlı yol KALICI kapalı
  _tuvalSayaci: 0,          // ÖLÇÜM: kaç offscreen tuval AYRILDI (kare başına 0 kanıtı)
  _araKatman: 0,            // ÖLÇÜM: tampona kaç KATMAN yönlendirildi (kümülatif)
  _araBindirme: 0,          // ÖLÇÜM: ekrana kaç TEK bindirme yapıldı (kümülatif)
  _araYedek: 0,             // ÖLÇÜM: kaç kez tam çözünürlüklü yedek yola düşüldü

  // ── Bloom piramidi bindirme ağırlıkları ──────────────────────────────────
  // 🔴 TOPLAMI 0.30'U AŞMAMALI. Aşarsa sahne beyaza doyar (canlı kanıt var).
  //    1/2 kademe = ince parlama · 1/4 = gövde · 1/8 = geniş hale.
  _BLOOM_AGIRLIK: [0.11, 0.10, 0.08],

  // Anamorfik bindirme. Kaynağı PARLAK-GEÇİR tamponu (çoğunlukla siyah)
  // olduğu için genel parlaklığa katkısı yok; yine de düşük tutulur.
  _ANA_AGIRLIK: [0.09, 0.05],

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // Hayalet halka dizilimi: f = merkeze göre konum çarpanı (ışığın KARŞITI yön),
  // r = min(W,H) yarıçap çarpanı, a = alfa, tip = görsel karakter.
  _HAYALET: [
    { f: -0.34, r: 0.052, a: 0.15, tip: 'halka' },
    { f:  0.19, r: 0.030, a: 0.30, tip: 'disk'  },
    { f:  0.43, r: 0.078, a: 0.13, tip: 'halka' },
    { f:  0.67, r: 0.041, a: 0.25, tip: 'disk'  },
    { f:  0.98, r: 0.118, a: 0.09, tip: 'halka' },
    { f:  1.44, r: 0.063, a: 0.17, tip: 'halka' }
  ],
  // Diyafram (iris) hayaletleri — yalnız yüksek kalitede, altıgen.
  _IRIS: [
    { f: 0.31, r: 0.046, a: 0.10 },
    { f: 0.80, r: 0.068, a: 0.07 },
    { f: 1.19, r: 0.036, a: 0.12 }
  ],

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
    // Boyut değişti → TÜM tamponlar geçersiz (tembel olarak yeniden kurulur)
    // ve ekran-uzayı gradientleri geçersiz.
    this._buflar = {};
    this._grYerel = {};
    this._grUretim = 0;
    this._blurDestek = null;
    this._piramitKare = -1;
    this._piramitVar = false;
    // Yeni boyut → hızlı yola YENİDEN şans ver (eski patlama boyuta bağlıydı).
    this._araAcik = false;
    this._araBozuk = false;
    this._olcu = {
      w2: Math.max(8, Math.ceil(W / 2)), h2: Math.max(8, Math.ceil(H / 2)),
      w4: Math.max(8, Math.ceil(W / 4)), h4: Math.max(8, Math.ceil(H / 4)),
      w8: Math.max(8, Math.ceil(W / 8)), h8: Math.max(8, Math.ceil(H / 8))
    };
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM — dünya dönüşümü KAPALI, ekran uzayında çalışır
  // Sıra ÖNEMLİ: önce geometri (varil → kromatik), sonra ışık (bloom →
  // anamorfik → halka), en son objektifin önündeki kir.
  // ═════════════════════════════════════════════════════════════════════════
  ciz(ctx, W, H, ba) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    ba = ba || {};
    const p = ba.palet || this._VARSAYILAN_PALET;
    if (!this._hazirlandi || this._W !== Math.round(W) || this._H !== Math.round(H)) {
      this.hazir(W, H);
    }
    this._kareNo++;

    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;
    let k = null;
    try { k = this._kaynak(ba, p, W, H); } catch (e) { k = null; }
    if (!k) k = { x: W * 0.78, y: H * 0.14, guc: 0.6, kapali: 0.2, renk: p.gun || '#ffe8b0' };

    try { this._varil(ctx, W, H, ba, p); } catch (e) {}
    try { this._kromatik(ctx, W, H, ba, p); } catch (e) {}

    // 🔴 İKİ katman (ikisi de `lighter`, ardışık) YARI ÇÖZÜNÜRLÜKLÜ `_ara`
    //   tamponunda toplanır ve ekrana TEK kez bindirilir. `ekr` HER ZAMAN
    //   gerçek ekran bağlamıdır: `_piramit` parlak-geçir kaynağını EKRANDAN
    //   örneklemek zorunda (sıra kilidi), tampondan DEĞİL.
    const hedef = this._toplayiciAc(ctx, W, H, ba);
    try { this._bloomPiramit(hedef, W, H, ba, p, ctx); } catch (e) {}
    try { this._anamorfik(hedef, W, H, ba, p, k, ctx); } catch (e) {}
    if (hedef !== ctx && !this._toplayiciKapat(ctx, W, H)) {
      // 🔴 Bindirme patladı → iki katman EKRANA HİÇ GİTMEDİ. "Sessizce
      //   çizmemek" KABUL EDİLMEZ: hızlı yol kalıcı kapatılır ve aynı iki
      //   katman ESKİ tam çözünürlüklü yolla YENİDEN çizilir. (`_piramit`
      //   bu karede zaten kurulduğu için ikinci kez KURULMAZ.)
      this._araBozuk = true;
      this._araYedek++;
      try { this._bloomPiramit(ctx, W, H, ba, p, ctx); } catch (e) {}
      try { this._anamorfik(ctx, W, H, ba, p, k, ctx); } catch (e) {}
    }

    try { this._lensHalka(ctx, W, H, ba, p, k); } catch (e) {}
    try { this._lensKir(ctx, W, H, ba, p, k); } catch (e) {}

    // Kural 5: durumu her hâlükârda geri koy.
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    this._filtre(ctx, 'none');
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARI ÇÖZÜNÜRLÜKLÜ 'lighter' TOPLAYICI — aç / kapat
  // ═════════════════════════════════════════════════════════════════════════
  // Dönen değer ÇİZİM HEDEFİdir: tampon bağlamı (hızlı yol) ya da `ctx`'in
  // KENDİSİ (yedek yol). Çağıran taraf ayırt etmek zorunda değildir; yalnız
  // `hedef !== ctx` ise `_toplayiciKapat` çağırır.
  //
  // 🔴 TABAN DÖNÜŞÜMÜ: `setTransform(W'/W, 0, 0, H'/H, 0, 0)`. Efekt kodu
  //   DEĞİŞMEDEN aynı (W,H) koordinatlarını kullanır; tuval yarı boyutta
  //   olduğu için her boyama 0,25 ekran alanı eder. Efektlerin kendi
  //   `save/restore`'ları bu tabana geri döner (ikisi de dengeli).
  //
  // 🔴 KÂR GEÇİDİ: yalnız İKİ efekt de açıkken tampona geçilir. Tek efekt
  //   taşımak kârsızdır (bloom tek başına A=3,00 → 2,00 kâr 1,00; anamorfik
  //   tek başına A=1,992 → 1,748 kâr yalnız 0,244 ve o zaman bloom tam
  //   çözünürlükte KALIR). `parlakEsik` 0 ise ikisi de zaten hiç çizmez →
  //   boş tampon temizlemenin bedelini ödememek için o da geçitte.
  //
  // 🔴 TAHSİS: tampon `_buf()` üzerinden alınır — boyut aynıysa AYNI tuval
  //   döner, kare başına YENİ tuval ayrılmaz (`dogrula-dolgu.js` bunu
  //   "ara tuval tahsisi/kare: 0.00" diye ölçer, selfTest 60 karede sayaç
  //   sabitliğiyle kilitler).
  _toplayiciAc(ctx, W, H, ba) {
    this._araAcik = false;
    if (this._araBozuk) return ctx;
    if (!ctx || !(W > 0) || !(H > 0)) return ctx;
    if (!(this._k(ba, 'parlakEsik') > 0)) return ctx;
    if (!(this._k(ba, 'bloomPiramit') > 0)) return ctx;
    if (!(this._k(ba, 'anamorfik') > 0)) return ctx;
    const o = this._olcu;
    if (!o) return ctx;
    const ara = this._buf('ara', o.w2, o.h2);
    const ac = this._ctx(ara);
    if (!ara || !ac || !(ara.width > 0) || !(ara.height > 0)) return ctx;
    if (typeof ac.setTransform !== 'function' ||
        typeof ac.clearRect !== 'function') return ctx;
    try {
      ac.setTransform(ara.width / W, 0, 0, ara.height / H, 0, 0);
      ac.globalAlpha = 1;
      ac.globalCompositeOperation = 'source-over';
      this._filtre(ac, 'none');
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

  // Tamponu ekrana TEK `lighter` bindirmeyle geçirir. Başarılıysa `true`.
  // `false` dönerse çağıran taraf katmanları tam çözünürlükte YENİDEN çizer.
  // 🔴 Bindirme modu GRUBUN MODUDUR (`lighter`) ve alfa 1'dir — katman
  //   alfaları tamponun İÇİNDE zaten uygulandı, burada TEKRAR uygulanmaz.
  _toplayiciKapat(ctx, W, H) {
    if (!this._araAcik) return false;
    const ara = this._buflar.ara;
    const ac = this._ctx(ara);
    if (!ara || !ctx) { this._araAcik = false; return false; }
    // Kural 5: tampon durumu her hâlde temiz bırakılır (yarıda patlasa bile).
    try {
      if (ac) {
        ac.globalAlpha = 1;
        ac.globalCompositeOperation = 'source-over';
        this._filtre(ac, 'none');
        if (typeof ac.setTransform === 'function') ac.setTransform(1, 0, 0, 1, 0, 0);
      }
    } catch (e) {}
    let tamam = false;
    ctx.save();
    try {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      this._filtre(ctx, 'none');
      ctx.drawImage(ara, 0, 0, W, H);     // ← TEK bindirme (eskiden 5 tam ekran geçişi)
      tamam = true;
    } catch (e) { tamam = false; }
    ctx.restore();
    // ⚠ Bayrak bindirmeden SONRA düşer: yedek yol testi "tam bindirme anında"
    //   patlatabilsin diye. Patlasa bile burada mutlaka temizlenir.
    this._araAcik = false;
    if (tamam) this._araBindirme++;
    return tamam;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) VARİL (FIÇI) DİSTORSİYONU
  // Gerçek warp için piksel okumak gerekir (YASAK). Bunun yerine ekran
  // merkezinden dışa doğru HALKA HALKA dilimlenir ve her halka, yarıçapın
  // KARESİYLE artan bir ölçekle yeniden örneklenir — optik varil eğrisinin
  // (r' = r(1 + k·r²)) parçalı-sabit yaklaşımı.
  // ⚠ Alfa içeriden dışarı RAMPALANIR; yoksa 0.42R'de keskin bir "yumuşaklık
  //   halkası" görünür (merkez keskin, kenar yumuşak geçişi doğal olmalı).
  // ═════════════════════════════════════════════════════════════════════════
  _varil(ctx, W, H, ba, p) {
    const g = this._k(ba, 'varil');
    if (g <= 0) return;
    const o = this._olcu;
    if (!o) return;
    const b = this._buf('varil', o.w2, o.h2);
    const bc = this._ctx(b);
    const kay = ctx.canvas;
    if (!b || !bc || !kay) return;

    // Sahne kopyası (yarım çözünürlük — kenar yumuşaklığı zaten isteniyor)
    this._filtre(bc, 'none');
    bc.globalCompositeOperation = 'source-over';
    bc.globalAlpha = 1;
    bc.fillStyle = '#000';
    bc.fillRect(0, 0, b.width, b.height);
    bc.drawImage(kay, 0, 0, b.width, b.height);

    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.sqrt(W * W + H * H) * 0.5;
    const BASLA = 0.42;                       // merkez KESKİN kalır
    const N = 7;
    const buk = 0.024 * g;                    // varil katsayısı (çok hafif)

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < N; i++) {
      const t0 = BASLA + (1 - BASLA) * (i / N);
      const t1 = BASLA + (1 - BASLA) * ((i + 1) / N);
      const tm = (t0 + t1) * 0.5;
      const s = 1 + buk * tm * tm;
      const a = Math.max(0, Math.min(1, (tm - BASLA) / 0.34)) * (0.30 + 0.70 * g);
      if (a <= 0.004) continue;
      ctx.save();
      // Halka kırpması: dış daire + ters yönlü iç daire = gerçek annulus.
      ctx.beginPath();
      ctx.arc(cx, cy, R * t1, 0, Math.PI * 2);
      ctx.arc(cx, cy, R * t0, 0, Math.PI * 2, true);
      ctx.clip();
      ctx.globalAlpha = a;
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.drawImage(b, -cx, -cy, W, H);
      ctx.restore();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) KROMATİK SAPMA — kenarda güçlü, MERKEZDE TAM SIFIR
  //
  // Naif yöntem (sahneyi kaydırıp 'lighter' ile bindirmek) görüntüyü
  // AYDINLATIR. Burada kanal ayrıştırması yapılır ve parlaklık KORUNUR:
  //   caR = sahne × (1,0,0)      → yalnız kırmızı kanal
  //   caC = sahne × (0,1,1)      → yalnız yeşil+mavi kanal
  //   caO = caR·(1+k) ⊕ caC·(1−k)   ('lighter' → kanallar geri toplanır)
  // Sonra `destination-in` + merkezi ŞEFFAF radyal maske ile yalnız kenarlar
  // bırakılır → merkezde sapma matematiksel olarak 0'dır.
  // ⚠ Ölçek MERKEZ etrafında olduğu için kayma miktarı yarıçapla doğrusal
  //   büyür; ayrıca maske ile kareselleştirilir.
  // ═════════════════════════════════════════════════════════════════════════
  _kromatik(ctx, W, H, ba, p) {
    const g = this._k(ba, 'kromatik');
    if (g <= 0) return;
    const o = this._olcu;
    if (!o) return;
    const bR = this._buf('kaR', o.w2, o.h2);
    const bC = this._buf('kaC', o.w2, o.h2);
    const bO = this._buf('kaO', o.w2, o.h2);
    const cR = this._ctx(bR), cC = this._ctx(bC), cO = this._ctx(bO);
    const kay = ctx.canvas;
    if (!bR || !bC || !bO || !cR || !cC || !cO || !kay) return;

    const w = bO.width, h = bO.height;
    const kayma = 0.0045 * g;                 // kenarda ≈ %0.45 yarıçap kayması

    // a) kırmızı kanal kopyası
    this._filtre(cR, 'none');
    cR.globalCompositeOperation = 'source-over';
    cR.globalAlpha = 1;
    cR.fillStyle = '#000';
    cR.fillRect(0, 0, w, h);
    cR.drawImage(kay, 0, 0, w, h);
    cR.globalCompositeOperation = 'multiply';
    cR.fillStyle = '#ff0000';
    cR.fillRect(0, 0, w, h);
    cR.globalCompositeOperation = 'source-over';

    // b) yeşil+mavi kanal kopyası
    this._filtre(cC, 'none');
    cC.globalCompositeOperation = 'source-over';
    cC.globalAlpha = 1;
    cC.fillStyle = '#000';
    cC.fillRect(0, 0, w, h);
    cC.drawImage(kay, 0, 0, w, h);
    cC.globalCompositeOperation = 'multiply';
    cC.fillStyle = '#00ffff';
    cC.fillRect(0, 0, w, h);
    cC.globalCompositeOperation = 'source-over';

    // c) kanalları farklı ölçeklerde geri topla (parlaklık korunur)
    this._filtre(cO, 'none');
    cO.globalCompositeOperation = 'source-over';
    cO.globalAlpha = 1;
    cO.fillStyle = '#000';
    cO.fillRect(0, 0, w, h);
    cO.globalCompositeOperation = 'lighter';
    cO.save();
    cO.translate(w * 0.5, h * 0.5);
    cO.scale(1 + kayma, 1 + kayma);
    cO.drawImage(bR, -w * 0.5, -h * 0.5, w, h);
    cO.restore();
    cO.save();
    cO.translate(w * 0.5, h * 0.5);
    cO.scale(1 - kayma, 1 - kayma);
    cO.drawImage(bC, -w * 0.5, -h * 0.5, w, h);
    cO.restore();

    // d) merkezi şeffaflaştır → sapma yalnız kenarlarda kalsın
    cO.globalCompositeOperation = 'destination-in';
    cO.globalAlpha = 1;
    cO.fillStyle = this._gr(cO, ba, 'lens-kamaske|' + w + 'x' + h, function (c) {
      const gr = c.createRadialGradient(
        w * 0.5, h * 0.5, Math.min(w, h) * 0.26,
        w * 0.5, h * 0.5, Math.sqrt(w * w + h * h) * 0.52
      );
      gr.addColorStop(0.00, 'rgba(0,0,0,0)');
      gr.addColorStop(0.42, 'rgba(0,0,0,0.14)');
      gr.addColorStop(0.72, 'rgba(0,0,0,0.52)');
      gr.addColorStop(1.00, 'rgba(0,0,0,1)');
      return gr;
    });
    cO.fillRect(0, 0, w, h);
    cO.globalCompositeOperation = 'source-over';

    // e) ekrana geri bas — merkez şeffaf olduğu için orası HİÇ değişmez
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, 0.92 * g);
    ctx.drawImage(bO, 0, 0, W, H);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) PARLAK-GEÇİR + BLOOM PİRAMİDİ (ortak ön aşama)
  //
  // Piramit kare başına EN FAZLA BİR KEZ kurulur (`_piramitKare`); hem
  // `bloomPiramit` hem `anamorfik` aynı sonucu kullanır.
  //
  // 🔴 `parlakEsik` yalnız bir "açık/kapalı" değil, eşiğin SEÇİCİLİĞİDİR:
  //    değer büyüdükçe daha çok karartıp daha sert kontrast uygular →
  //    yalnız GERÇEKTEN parlak pikseller geçer. Yüksek kalite = daha TEMİZ
  //    bloom (daha parlak değil). Şiddeti `bloomPiramit` belirler.
  //    Eşik 0 ise bloom/anamorfik HİÇ çizilmez (patlama riskine karşı).
  // ═════════════════════════════════════════════════════════════════════════
  _esikFiltre(esik) {
    // ÖNCE KARART, SONRA SERT KONTRAST (bkz. başlıktaki patlama tuzağı).
    const b = 0.70 - 0.10 * esik;             // 0.70 → 0.60
    const k = 3.00 + 1.40 * esik;             // 3.00 → 4.40
    const d = 1.10 + 0.25 * esik;             // hafif doygunluk artışı
    return 'brightness(' + b.toFixed(3) + ') contrast(' + k.toFixed(2) +
           ') saturate(' + d.toFixed(2) + ')';
  },

  _piramit(ctx, W, H, ba) {
    if (this._piramitKare === this._kareNo) return this._piramitVar;
    this._piramitKare = this._kareNo;
    this._piramitVar = false;

    const esik = this._k(ba, 'parlakEsik');
    if (esik <= 0) return false;
    const o = this._olcu;
    if (!o) return false;
    const be = this._buf('esik', o.w2, o.h2);
    const k0 = this._buf('k0', o.w2, o.h2);
    const k1 = this._buf('k1', o.w4, o.h4);
    const k2 = this._buf('k2', o.w8, o.h8);
    const ce = this._ctx(be), c0 = this._ctx(k0), c1 = this._ctx(k1), c2 = this._ctx(k2);
    const kay = ctx.canvas;
    if (!be || !k0 || !k1 || !k2 || !ce || !c0 || !c1 || !c2 || !kay) return false;

    // a) PARLAK-GEÇİR — sahnenin yalnız parlak çekirdekleri kalsın
    ce.globalCompositeOperation = 'source-over';
    ce.globalAlpha = 1;
    this._filtre(ce, 'none');
    ce.fillStyle = '#000';
    ce.fillRect(0, 0, be.width, be.height);
    this._filtre(ce, this._esikFiltre(esik));
    ce.drawImage(kay, 0, 0, be.width, be.height);
    this._filtre(ce, 'none');

    // b) ÜÇ KADEME — her kademe bir öncekinden hem KÜÇÜLTÜLÜR hem BULANIR.
    //    Küçültmenin kendisi de alçak geçiren süzgeçtir → tek geçişli
    //    bloom'dan çok daha geniş ve yumuşak bir hale çıkar.
    this._gecis(c0, k0, be, 2.0);
    this._gecis(c1, k1, k0, 3.0);
    this._gecis(c2, k2, k1, 4.0);

    this._piramitVar = true;
    this._piramitSayac++;
    return true;
  },

  // Tek kademe geçişi: siyah opak taban + 'lighter' → kenarlarda saydamlık
  // oluşmaz (saydam kenar bindirmede koyu halka üretir).
  _gecis(dc, d, s, blurPx) {
    dc.globalCompositeOperation = 'source-over';
    dc.globalAlpha = 1;
    this._filtre(dc, 'none');
    dc.fillStyle = '#000';
    dc.fillRect(0, 0, d.width, d.height);
    dc.globalCompositeOperation = 'lighter';
    if (this._blurVar(dc) && blurPx > 0) {
      this._filtre(dc, 'blur(' + blurPx.toFixed(2) + 'px)');
      dc.drawImage(s, 0, 0, d.width, d.height);
      this._filtre(dc, 'none');
    } else {
      // blur() desteklenmiyorsa 5 örnekli kaydırmalı toplama (yumuşaklık taklidi)
      const off = Math.max(1, blurPx * 0.6);
      dc.globalAlpha = 0.34;
      dc.drawImage(s, 0, 0, d.width, d.height);
      dc.drawImage(s, -off, 0, d.width, d.height);
      dc.drawImage(s, off, 0, d.width, d.height);
      dc.drawImage(s, 0, -off, d.width, d.height);
      dc.drawImage(s, 0, off, d.width, d.height);
      dc.globalAlpha = 1;
    }
    dc.globalCompositeOperation = 'source-over';
  },

  // ⚠ `ctx` = ÇİZİM HEDEFİ (ekran ya da yarı çözünürlüklü toplayıcı).
  //   `ekr` = parlak-geçir kaynağı olarak OKUNACAK gerçek EKRAN bağlamı.
  //   İkisini ayırmazsak toplayıcı açıkken `_piramit` boş tamponu örnekler.
  _bloomPiramit(ctx, W, H, ba, p, ekr) {
    const g = this._k(ba, 'bloomPiramit');
    if (g <= 0) return;
    if (!this._piramit(ekr || ctx, W, H, ba)) return;
    const k0 = this._buflar.k0, k1 = this._buflar.k1, k2 = this._buflar.k2;
    if (!k0 || !k1 || !k2) return;
    const a = this._BLOOM_AGIRLIK;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 1/2 — ince, kaynağa yapışık parlama
    ctx.globalAlpha = a[0] * g;
    ctx.drawImage(k0, 0, 0, W, H);
    // 1/4 — gövde
    ctx.globalAlpha = a[1] * g;
    ctx.drawImage(k1, 0, 0, W, H);
    // 1/8 — geniş atmosferik hale (hafifçe büyütülerek taşırılır)
    ctx.globalAlpha = a[2] * g;
    ctx.drawImage(k2, -W * 0.012, -H * 0.012, W * 1.024, H * 1.024);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) ANAMORFİK LENS ÇİZGİSİ
  // Anamorfik objektifin imzası: parlak noktalardan YATAY uzayan mavi-mor
  // çizgi. Piramidin 1/4 kademesinden başlayıp 4 ping-pong geçişinde
  // (±2, ±4, ±8, ±16 tampon pikseli) yatayda yayılır → ekranda ~240 px iz.
  // ⚠ Renklendirme 'multiply' ile yapılır: parlak-geçir tamponu OPAKTIR,
  //   'source-atop' kullanılsa siyah alanlar da morarır ve tüm sahneye
  //   uniform mavi bir sis biner (denendi, YANLIŞ).
  // ═════════════════════════════════════════════════════════════════════════
  // ⚠ `ctx` / `ekr` ayrımı `_bloomPiramit`'teki ile aynı (bkz. oradaki not).
  _anamorfik(ctx, W, H, ba, p, k, ekr) {
    const g = this._k(ba, 'anamorfik');
    if (g <= 0) return;
    if (!this._piramit(ekr || ctx, W, H, ba)) return;
    const o = this._olcu;
    const kay1 = this._buflar.k1;
    if (!o || !kay1) return;
    const A = this._buf('anaA', o.w4, o.h4);
    const B = this._buf('anaB', o.w4, o.h4);
    const ca = this._ctx(A), cb = this._ctx(B);
    if (!A || !B || !ca || !cb) return;
    const w = A.width, h = A.height;

    // a) başlangıç: orta kademe parlak tampon
    this._filtre(ca, 'none');
    ca.globalCompositeOperation = 'source-over';
    ca.globalAlpha = 1;
    ca.fillStyle = '#000';
    ca.fillRect(0, 0, w, h);
    ca.drawImage(kay1, 0, 0, w, h);

    // b) 4 ping-pong yatay yayma geçişi (üstel adım → uzun ve ucuz iz)
    let kA = A, kB = B, cA = ca, cB = cb;
    for (let i = 0; i < 4; i++) {
      const off = (1 << i) * 2;
      cB.globalCompositeOperation = 'source-over';
      cB.globalAlpha = 1;
      this._filtre(cB, 'none');
      cB.fillStyle = '#000';
      cB.fillRect(0, 0, w, h);
      cB.globalCompositeOperation = 'lighter';
      cB.globalAlpha = 0.52;
      cB.drawImage(kA, -off, 0, w, h);
      cB.drawImage(kA, off, 0, w, h);
      cB.globalCompositeOperation = 'source-over';
      cB.globalAlpha = 1;
      const tk = kA; kA = kB; kB = tk;
      const tc = cA; cA = cB; cB = tc;
    }

    // c) mavi-mor renklendirme (multiply → siyah siyah kalır)
    const self = this;
    cA.globalCompositeOperation = 'multiply';
    cA.globalAlpha = 0.88;
    cA.fillStyle = this._gr(cA, ba, 'lens-anatint|' + w + 'x' + h + '|' + (p.bloom || ''), function (c) {
      const gr = c.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0.00, 'rgba(86,116,255,1)');
      gr.addColorStop(0.28, 'rgba(132,104,255,1)');
      gr.addColorStop(0.50, self._rgba(self._karis(p.bloom || '#c8d0ff', '#b8c0ff', 0.55), 1));
      gr.addColorStop(0.72, 'rgba(132,104,255,1)');
      gr.addColorStop(1.00, 'rgba(86,116,255,1)');
      return gr;
    });
    cA.fillRect(0, 0, w, h);
    cA.globalCompositeOperation = 'source-over';
    cA.globalAlpha = 1;

    // d) ekrana bindir — geniş iz + hafifçe sıkıştırılmış parlak çekirdek
    const ag = this._ANA_AGIRLIK;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = ag[0] * g;
    ctx.drawImage(kA, 0, 0, W, H);
    ctx.globalAlpha = ag[1] * g;
    ctx.drawImage(kA, -W * 0.03, H * 0.004, W * 1.06, H * 0.992);
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) HAYALET HALKALAR (lens flare ghosts)
  // Gerçek objektifte hayaletler ışık kaynağı ile ekran MERKEZİNİN belirlediği
  // eksen üzerinde, kaynağın KARŞI tarafında dizilir:
  //     hayalet = merkez + (merkez − kaynak) · f
  // Tüm gradientler BİRİM UZAYDA önbelleklenir (anahtar: tip + renk),
  // konum/ölçek `translate/scale` ile verilir → kare başına 0 yeni gradient.
  // ═════════════════════════════════════════════════════════════════════════
  _lensHalka(ctx, W, H, ba, p, k) {
    const g = this._k(ba, 'lensHalka');
    if (g <= 0) return;
    const cx = W * 0.5, cy = H * 0.5;
    const dx = cx - k.x, dy = cy - k.y;
    const kose = Math.sqrt(W * W + H * H) * 0.5;
    const uz = Math.min(1, Math.sqrt(dx * dx + dy * dy) / Math.max(1, kose));
    // Kaynak merkeze yaklaştıkça parlama güçlenir (gerçek davranış).
    const gorunur = (0.42 + 0.58 * (1 - uz)) * Math.max(0.12, k.guc) * (1 - k.kapali * 0.45);
    if (gorunur <= 0.01) return;
    const taban = Math.min(W, H);
    const renkler = [
      p.gun || '#ffe8b0', '#7fb0ff', p.bloom || '#ffeec8',
      '#c98cff', p.tint || '#8fa8c0', '#8ff0e0'
    ];

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (g >= 0.55) this._bulanik(ctx, Math.min(9, 1.5 + 6 * g));

    for (let i = 0; i < this._HAYALET.length; i++) {
      const hy = this._HAYALET[i];
      const gx = cx + dx * hy.f;
      const gy = cy + dy * hy.f;
      const r = Math.max(2, taban * hy.r * (0.85 + 0.30 * g));
      const renk = renkler[i % renkler.length];
      const a = hy.a * g * gorunur;
      // 🔴 PERF(31 Tmz · §8B.33) — eşik 0,003 → 1/255 (8-bit görünürlük sınırı).
      //   Bu blokta bulanıklık AÇIK olabilir; bulanıklık alfayı YAYAR ama
      //   ARTIRMAZ (çıkış ≤ giriş), yani görünmez kaynak bulanıkken de
      //   görünmezdir → elemek güvenlidir.
      if (!(a >= 1 / 255)) continue;

      ctx.save();
      ctx.globalAlpha = Math.min(0.85, a);
      ctx.translate(gx, gy);
      ctx.scale(r, r);
      ctx.fillStyle = this._halkaGr(ctx, ba, hy.tip, renk);
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Hayaletin kendi kromatik saçağı (kırmızı içte, mavi dışta)
      if (g >= 0.75 && hy.tip === 'halka') {
        // Saçak alfaları ana halkanın 0,38 / 0,32 katı → ana halka görünürken
        // bunlar 1/255 altına düşebiliyor (ölçüldü: kare başına 1,8 görünmez dolgu).
        const aMavi = Math.min(0.4, a * 0.38);
        if (aMavi >= 1 / 255) {
          ctx.save();
          ctx.globalAlpha = aMavi;
          ctx.translate(gx, gy);
          ctx.scale(r * 1.06, r * 1.06);
          ctx.fillStyle = this._halkaGr(ctx, ba, 'halka', '#5a8cff');
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        const aKirmizi = Math.min(0.4, a * 0.32);
        if (aKirmizi >= 1 / 255) {
          ctx.save();
          ctx.globalAlpha = aKirmizi;
          ctx.translate(gx, gy);
          ctx.scale(r * 0.93, r * 0.93);
          ctx.fillStyle = this._halkaGr(ctx, ba, 'halka', '#ff6a5a');
          ctx.beginPath();
          ctx.arc(0, 0, 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    // Diyafram (iris) hayaletleri — altıgen, objektif bıçaklarının izi
    if (g >= 0.6) {
      for (let j = 0; j < this._IRIS.length; j++) {
        const ir = this._IRIS[j];
        const gx = cx + dx * ir.f;
        const gy = cy + dy * ir.f;
        const r = Math.max(2, taban * ir.r * (0.85 + 0.3 * g));
        const a = ir.a * g * gorunur;
        if (!(a >= 1 / 255)) continue;             // PERF: görünmez iris hayaleti
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, a);
        ctx.translate(gx, gy);
        ctx.rotate(0.28 + j * 0.21);
        ctx.scale(r, r);
        ctx.fillStyle = this._halkaGr(ctx, ba, 'iris', renkler[(j + 1) % renkler.length]);
        this._poligon(ctx, 6, 1);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  },

  _poligon(ctx, n, r) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  },

  // Birim uzayda (0,0,r=1) önbelleklenmiş hayalet gradienti.
  _halkaGr(ctx, ba, tip, renk) {
    const self = this;
    return this._gr(ctx, ba, 'lens-hy|' + tip + '|' + renk, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      const ak = self._karis(renk, '#ffffff', 0.55);
      if (tip === 'halka') {
        gr.addColorStop(0.00, self._rgba(renk, 0));
        gr.addColorStop(0.52, self._rgba(renk, 0.03));
        gr.addColorStop(0.72, self._rgba(renk, 0.30));
        gr.addColorStop(0.85, self._rgba(ak, 0.66));
        gr.addColorStop(0.94, self._rgba(renk, 0.22));
        gr.addColorStop(1.00, self._rgba(renk, 0));
      } else if (tip === 'iris') {
        gr.addColorStop(0.00, self._rgba(ak, 0.30));
        gr.addColorStop(0.55, self._rgba(renk, 0.24));
        gr.addColorStop(0.88, self._rgba(renk, 0.34));
        gr.addColorStop(1.00, self._rgba(renk, 0));
      } else {
        gr.addColorStop(0.00, self._rgba(ak, 0.72));
        gr.addColorStop(0.34, self._rgba(renk, 0.34));
        gr.addColorStop(0.70, self._rgba(renk, 0.12));
        gr.addColorStop(1.00, self._rgba(renk, 0));
      }
      return gr;
    });
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) LENS KİRİ / LEKE
  // Doku BİR KEZ üretilir (512×288) ve ekrana GERİLEREK basılır — lens kiri
  // ekran uzayında SABİTTİR, kayan bir desen DEĞİLDİR (döşeme kullanılmaz).
  // İki katman:
  //   · 'overlay' — sürekli, çok hafif; camın hep kirli olduğunu hissettirir
  //   · 'screen'  — ışık kaynağının çevresinde parlar (kir ancak ışık ona
  //                 vurunca görünür; maske ışıkla birlikte HAREKET EDER)
  // ⚠ Maske gradienti BİRİM UZAYDA önbelleklenir; ışık konumu `translate` ile
  //   verilir, anahtara GİRMEZ → kare başına 0 yeni gradient.
  // ═════════════════════════════════════════════════════════════════════════
  _lensKir(ctx, W, H, ba, p, k) {
    const g = this._k(ba, 'lensKir');
    if (g <= 0) return;
    const dok = this._kir();
    if (!dok) return;

    ctx.save();
    // a) sürekli, çok hafif kirlilik
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(0.22, 0.15 * g);
    ctx.drawImage(dok, 0, 0, W, H);
    ctx.restore();

    // b) ışığın vurduğu bölgede parlayan kir
    const o = this._olcu;
    const kb = o ? this._buf('kir', o.w4, o.h4) : null;
    const kc = this._ctx(kb);
    if (!kb || !kc) return;
    const w = kb.width, h = kb.height;

    this._filtre(kc, 'none');
    kc.globalCompositeOperation = 'source-over';
    kc.globalAlpha = 1;
    kc.clearRect(0, 0, w, h);
    kc.drawImage(dok, 0, 0, w, h);
    // Işık çevresinde yumuşak maske (doku saydam zeminli → destination-in doğru)
    kc.globalCompositeOperation = 'destination-in';
    kc.save();
    kc.translate((k.x / W) * w, (k.y / H) * h);
    const yari = Math.max(w, h) * 0.62;
    kc.scale(yari, yari);
    kc.fillStyle = this._gr(kc, ba, 'lens-kirmaske', function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0.00, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.62)');
      gr.addColorStop(0.72, 'rgba(255,255,255,0.18)');
      gr.addColorStop(1.00, 'rgba(255,255,255,0)');
      return gr;
    });
    kc.fillRect(-1, -1, 2, 2);
    kc.restore();
    kc.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = Math.min(0.34, 0.26 * g * Math.max(0.15, k.guc));
    ctx.drawImage(kb, 0, 0, W, H);
    ctx.restore();
  },

  // ── Lens kiri dokusu — BİR KEZ üretilir, sonsuza dek önbellekte ──────────
  // ⚠ `getImageData`/`putImageData` YOK: lekeler katmanlı `arc` + `blur()` ile
  //   çizilir. Rastgelelik DETERMİNİSTİK bir üreteçten gelir (aynı doku her
  //   açılışta aynı — ekran görüntüsü kıyaslaması yapılabilsin diye).
  _kir() {
    if (this._kirDenendi) return this._kirDoku;
    this._kirDenendi = true;
    this._kirDoku = null;
    const EN = 512, BOY = 288;
    const c = this._kanvas(EN, BOY);
    const x = this._ctx(c);
    if (!c || !x) return null;
    const rnd = this._rastgele(0x5eed1e5);

    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    this._filtre(x, 'none');
    x.clearRect(0, 0, EN, BOY);

    // a) büyük yağlı lekeler — 8 katmanlı alfa rampasıyla yumuşatılır
    this._bulanik(x, 2.2);
    for (let i = 0; i < 64; i++) {
      const px = rnd() * EN, py = rnd() * BOY;
      const r = 5 + rnd() * 34;
      const ac = rnd() < 0.62;                 // açık mı koyu mu leke
      const taban = (0.05 + rnd() * 0.13);
      const ez = 0.55 + rnd() * 0.9;           // lekeler eliptik
      const don = rnd() * Math.PI;
      for (let j = 8; j >= 1; j--) {
        const t = j / 8;
        x.save();
        x.translate(px, py);
        x.rotate(don);
        x.scale(1, ez);
        x.globalAlpha = taban * (1 - t) * 0.9 + taban * 0.10;
        x.fillStyle = ac ? 'rgba(255,255,255,1)' : 'rgba(24,26,34,1)';
        x.beginPath();
        x.arc(0, 0, r * t, 0, Math.PI * 2);
        x.fill();
        x.restore();
      }
    }

    // b) ince toz zerrecikleri
    this._filtre(x, 'none');
    for (let i = 0; i < 220; i++) {
      const px = rnd() * EN, py = rnd() * BOY;
      const r = 0.5 + rnd() * 2.1;
      x.globalAlpha = 0.07 + rnd() * 0.26;
      x.fillStyle = rnd() < 0.7 ? 'rgba(255,255,255,1)' : 'rgba(18,20,28,1)';
      x.beginPath();
      x.arc(px, py, r, 0, Math.PI * 2);
      x.fill();
    }

    // c) kıl/çizik izleri
    this._bulanik(x, 0.8);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    for (let i = 0; i < 14; i++) {
      const x0 = rnd() * EN, y0 = rnd() * BOY;
      const x1 = x0 + (rnd() - 0.5) * 190;
      const y1 = y0 + (rnd() - 0.5) * 120;
      const kx = (x0 + x1) * 0.5 + (rnd() - 0.5) * 90;
      const ky = (y0 + y1) * 0.5 + (rnd() - 0.5) * 70;
      x.globalAlpha = 0.05 + rnd() * 0.14;
      x.strokeStyle = 'rgba(255,255,255,1)';
      x.lineWidth = 0.5 + rnd() * 1.7;
      x.beginPath();
      x.moveTo(x0, y0);
      x.quadraticCurveTo(kx, ky, x1, y1);
      x.stroke();
    }

    // d) parmak izi kavisleri (kısmi eşmerkezli yaylar)
    for (let i = 0; i < 5; i++) {
      const px = rnd() * EN, py = rnd() * BOY;
      const a0 = rnd() * Math.PI * 2;
      const yay = 1.1 + rnd() * 2.2;
      for (let j = 1; j <= 7; j++) {
        x.globalAlpha = 0.035 + rnd() * 0.05;
        x.strokeStyle = 'rgba(255,255,255,1)';
        x.lineWidth = 0.6 + rnd() * 0.9;
        x.beginPath();
        x.arc(px, py, 4 + j * 3.4, a0, a0 + yay);
        x.stroke();
      }
    }

    this._filtre(x, 'none');
    x.globalAlpha = 1;
    this._kirDoku = c;
    return c;
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

  // ── Offscreen tampon (TEMBEL kurulur, boyut değişince atılır) ────────────
  // ⚠ `_tuvalSayaci`'nı ARTIRIR: "kare başına tahsis 0" iddiasının ölçüldüğü yer.
  _kanvas(w, h) {
    try {
      if (this._testFabrika) {
        const t = this._testFabrika(w, h);
        if (t) this._tuvalSayaci++;
        return t;
      }
      if (typeof document !== 'undefined' && document && document.createElement) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        this._tuvalSayaci++;
        return c;
      }
    } catch (e) {}
    return null;
  },
  _buf(ad, w, h) {
    w = Math.max(8, Math.round(w || 0));
    h = Math.max(8, Math.round(h || 0));
    let b = this._buflar[ad];
    if (b && b.width === w && b.height === h) return b;
    b = this._kanvas(w, h);
    if (!b) return null;
    this._buflar[ad] = b;
    return b;
  },
  _ctx(b) {
    try { return (b && b.getContext) ? b.getContext('2d') : null; } catch (e) { return null; }
  },

  // ── ctx.filter güvenli kullanımı ─────────────────────────────────────────
  // ⚠ `ctx.filter` her tarayıcıda YOK. Yazma try/catch'te, destek ölçümü
  //   bir kez yapılır; desteklenmiyorsa bulanıklık isteyen efekt katmanlı
  //   çizime düşer (bkz. `_gecis`).
  _filtre(c, f) {
    if (!c) return;
    try { c.filter = f; } catch (e) {}
  },
  _blurVar(c) {
    if (this._blurDestek !== null) return this._blurDestek;
    let ok = false;
    try {
      const eski = c.filter;
      c.filter = 'blur(1px)';
      ok = (c.filter === 'blur(1px)');
      c.filter = eski || 'none';
    } catch (e) { ok = false; }
    this._blurDestek = ok;
    return ok;
  },
  _bulanik(c, px) {
    if (!(px > 0)) return;
    if (!this._blurVar(c)) return;
    this._filtre(c, 'blur(' + px.toFixed(2) + 'px)');
  },

  // ── IŞIK KAYNAĞI — paletten + zamandan türetilir ─────────────────────────
  // `gorsel-isik.js`'teki güneş modeliyle AYNI sezgi (aynı sonucu vermesi
  // gerekmez, ikisi bağımsız katman): `palet.gun` ışığın karakteri,
  // `palet.sis` ortamın kapalılığı. Konum çok yavaş sürüklenir.
  _kaynak(ba, p, W, H) {
    p = p || this._VARSAYILAN_PALET;
    const mid = (ba && ba.mapId) || 'varsayilan';
    const anahtar = mid + '|' + (p.gun || '') + '|' + (p.sis || '');
    let s = this._kaynakOnbellek[anahtar];
    if (!s) {
      const gr = this._rgb(p.gun || '#ffe8b0');
      const sr = this._rgb(p.sis || '#cfe0f0');
      const parlak = (gr.r + gr.g + gr.b) / 765;
      const sicak = (gr.r - gr.b) / 255;
      const sisParlak = (sr.r + sr.g + sr.b) / 765;
      const kapali = Math.max(0, Math.min(1, 1 - sisParlak * 1.15));
      s = {
        yuk: Math.max(0.07, Math.min(0.94, 0.16 + parlak * 0.66 - sicak * 0.34)),
        yon: ((this._hash(mid) % 200) / 100) - 1,
        guc: Math.max(0.10, Math.min(1, parlak * (1 - kapali * 0.62))),
        kapali: kapali,
        renk: p.gun || '#ffe8b0'
      };
      this._kaynakOnbellek[anahtar] = s;
    }
    const t = (ba && ba.t) || 0;
    const yuk = Math.max(0.06, Math.min(0.96, s.yuk + Math.sin(t * 0.0175) * 0.13));
    const yon = Math.max(-1, Math.min(1, s.yon + Math.cos(t * 0.0175) * 0.35));
    return {
      x: W * (0.5 + yon * 0.40),
      y: H * (0.46 - yuk * 0.40),
      guc: s.guc,
      kapali: s.kapali,
      renk: s.renk
    };
  },

  // ── Determinist rastgele (xorshift32) — doku üretimi için ────────────────
  _rastgele(tohum) {
    let x = (tohum || 1) >>> 0;
    if (x === 0) x = 0x9e3779b9;
    return function () {
      x ^= (x << 13); x >>>= 0;
      x ^= (x >>> 17);
      x ^= (x << 5); x >>>= 0;
      return x / 4294967296;
    };
  },

  // ── Renk yardımcıları ────────────────────────────────────────────────────
  // ⚠ `_rgb` HEM `#rgb`/`#rrggbb` HEM `rgb(r,g,b)` biçimini anlar. Sebep:
  //   `_karis` çıktısı tekrar `_rgba`ya girebiliyor; yalnız hex kabul eden bir
  //   ayrıştırıcı bunu sessizce VARSAYILAN RENGE düşürür (gözle fark edilmez,
  //   tüm karışım renkleri yanlış çıkar). `_karis` de bu yüzden HEX döndürür.
  _rgb(hex) {
    const s = String(hex == null ? '' : hex).trim();
    const m = /^rgba?\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i.exec(s);
    if (m) {
      return {
        r: Math.max(0, Math.min(255, parseInt(m[1], 10))),
        g: Math.max(0, Math.min(255, parseInt(m[2], 10))),
        b: Math.max(0, Math.min(255, parseInt(m[3], 10)))
      };
    }
    const h = s.replace('#', '');
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    if (!/^[0-9a-fA-F]{6}/.test(t)) return { r: 255, g: 232, b: 176 };
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 255, g: 232, b: 176 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  _iki(n) {
    const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return s.length < 2 ? ('0' + s) : s;
  },
  _karis(hexA, hexB, t) {
    const a = this._rgb(hexA), b = this._rgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    return '#' + this._iki(a.r + (b.r - a.r) * k) +
                 this._iki(a.g + (b.g - a.g) * k) +
                 this._iki(a.b + (b.b - a.b) * k);
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

  // ═════════════════════════════════════════════════════════════════════════
  // TEST ALTYAPISI — gerçek canvas GEREKTİRMEZ
  // ═════════════════════════════════════════════════════════════════════════
  _sahteCtx(say) {
    say = say || { save: 0, restore: 0, ciz: 0, gradient: 0 };
    const grad = { addColorStop: function () {} };
    // ⚠ `_kendi`: BU bağlamın kendi sayacı. Paylaşılan `say` toplamı verir,
    //   `_kendi` ise "hangi geçiş EKRANA, hangisi TAMPONA gitti"yi ayırır —
    //   yarı çözünürlüklü taşımanın SAYARAK doğrulanması buna dayanır.
    const kendi = { ciz: 0, temizle: 0, donusum: 0 };
    const c = {
      _say: say,
      _kendi: kendi,
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
      quadraticCurveTo: function () {},
      arc: function () {},
      clip: function () {},
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      setTransform: function () { kendi.donusum++; },
      resetTransform: function () { kendi.donusum++; },
      clearRect: function () { kendi.temizle++; },
      fill: function () { say.ciz++; kendi.ciz++; },
      stroke: function () { say.ciz++; kendi.ciz++; },
      fillRect: function () { say.ciz++; kendi.ciz++; },
      strokeRect: function () { say.ciz++; kendi.ciz++; },
      drawImage: function () { say.ciz++; kendi.ciz++; },
      createLinearGradient: function () { say.gradient++; return grad; },
      createRadialGradient: function () { say.gradient++; return grad; }
    };
    return c;
  },

  // Sahte offscreen kanvas fabrikası (gerçek `document` yokken de çalışır).
  _sahteKanvasFabrika(say) {
    const self = this;
    return function (w, h) {
      const c = { width: w, height: h, _ctx: null };
      c.getContext = function () {
        if (!c._ctx) {
          c._ctx = self._sahteCtx(say);
          c._ctx.canvas = c;
        }
        return c._ctx;
      };
      return c;
    };
  },

  // Test için sahte bağlam nesnesi
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

  // Testten sonra gerçek kullanım kirlenmesin diye durumu sıfırla.
  _testTemizle() {
    this._testFabrika = null;
    this._sonTestCtx = null;
    this._buflar = {};
    this._hazirlandi = false;
    this._W = 0;
    this._H = 0;
    this._olcu = null;
    this._blurDestek = null;
    this._kirDoku = null;
    this._kirDenendi = false;
    this._piramitKare = -1;
    this._piramitVar = false;
    this._grYerel = {};
    this._grUretim = 0;
    this._araAcik = false;
    this._araBozuk = false;
    this._tuvalSayaci = 0;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — sahte ctx + sahte kanvas üzerinde ÖLÇEREK doğrular
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const PAL = { tint: '#e04a1a', pow: 0.32, doy: 1.16, kon: 1.22, bloom: '#ffa040', sis: '#5a2418', gun: '#ff7030' };

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'lens') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');

    // 2) Renk + hash yardımcıları
    r.rgbDogru = (function (s) {
      const c = s._rgb('#ff8000'), k = s._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 && k.r === 255 && k.g === 136 && k.b === 0;
    })(this);
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.bozukRenkGuvenli = !!this._rgb('boyle-renk-yok') && !!this._rgb(null);
    r.hashKararli = this._hash('volcano') === this._hash('volcano') &&
                    this._hash('volcano') !== this._hash('cave');
    // 🔴 `_karis` HEX döndürmeli ve çıktısı TEKRAR ayrıştırılabilmeli; 'rgb(...)'
    //    döndürseydi `_rgba(_karis(...))` sessizce varsayılan renge düşerdi.
    r.karisTurDonusu = (function (s) {
      const m = s._karis('#000000', '#ffffff', 0.5);
      const geri = s._rgb(m);
      return m.charAt(0) === '#' && m.length === 7 &&
             geri.r === 128 && geri.g === 128 && geri.b === 128 &&
             s._rgba(s._karis('#ff0000', '#0000ff', 0), 1) === 'rgba(255,0,0,1)' &&
             s._rgb('rgb(10,20,30)').g === 20;
    })(this);

    // 3) Determinist rastgele — aynı tohum aynı diziyi vermeli, 0..1 arası
    r.rastgeleDeterminist = (function (s) {
      const a = s._rastgele(1234), b = s._rastgele(1234);
      let ok = true, ilk = null, farkli = false;
      for (let i = 0; i < 50; i++) {
        const x = a(), y = b();
        if (x !== y) ok = false;
        if (!(x >= 0 && x < 1)) ok = false;
        if (ilk === null) ilk = x; else if (x !== ilk) farkli = true;
      }
      return ok && farkli;
    })(this);

    // 4) 🔴 BLOOM PATLAMA KİLİDİ — eşik ÖNCE karartmalı, bindirme ≤ 0.30
    r.bloomAlfaSiniri = this._BLOOM_AGIRLIK.reduce(function (a, b) { return a + b; }, 0) <= 0.30001;
    r.esikOnceKarartiyor = (function (s) {
      const f1 = s._esikFiltre(1), f0 = s._esikFiltre(0.2);
      const p1 = parseFloat(/brightness\(([\d.]+)\)/.exec(f1)[1]);
      const p0 = parseFloat(/brightness\(([\d.]+)\)/.exec(f0)[1]);
      const k1 = parseFloat(/contrast\(([\d.]+)\)/.exec(f1)[1]);
      // Her iki uçta da KARARTMA (<1) ve SERT kontrast (>2.5) olmalı,
      // yüksek kalite daha seçici (daha karanlık eşik) olmalı.
      return p1 < 1 && p0 < 1 && k1 > 2.5 && p1 < p0;
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

    // 6) Kalite geçidi: 0 => TEK BİR çizim ve TEK BİR gradient bile olmamalı
    r.kaliteSifirCizmez = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const ctx = s._sahteCtx(say);
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('volcano', PAL, 0);
      s.ciz(ctx, 800, 450, ba);
      const ok = say.ciz === 0 && say.gradient === 0 && ba._sayac.yeni === 0;
      s._testTemizle();
      return ok;
    })(this);

    // 7) Tam kalitede gerçekten çiziyor + save/restore DENGELİ + durum geri konuyor
    const olcum = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const ctx = s._sahteCtx(say);
      s._sonTestCtx = ctx;
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const ba = s._sahteBa('volcano', PAL, 1);
      const pOnce = s._piramitSayac;
      s.ciz(ctx, 800, 450, ba);
      const sonuc = {
        ciz: say.ciz,
        dengeli: say.save === say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor',
        filtre: ctx.filter === 'none',
        piramit: s._piramitSayac - pOnce,
        yeniGradient: ba._sayac.yeni
      };
      s._testTemizle();
      return sonuc;
    })(this);
    r.tamKaliteCiziyor = olcum.ciz > 30;
    r.saveRestoreDengeli = olcum.dengeli;
    r.durumGeriKonuyor = olcum.alfa && olcum.karisim && olcum.filtre;
    // Piramit kare başına EN FAZLA BİR KEZ kurulmalı (bloom + anamorfik paylaşır)
    r.piramitTekKere = olcum.piramit === 1;
    r.gradientUretiliyor = olcum.yeniGradient > 0;

    // 8) İkinci kare YENİ gradient üretmemeli (anahtarlarda konum/zaman YOK)
    r.kareBasinaSifirGradient = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const ctx = s._sahteCtx(say);
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('neon_city',
        { tint: '#c040e0', pow: 0.30, doy: 1.34, kon: 1.20, bloom: '#ff60ff', sis: '#2a1040', gun: '#a050ff' }, 1);
      s.ciz(ctx, 800, 450, ba);
      const ilk = ba._sayac.yeni;
      for (let i = 0; i < 5; i++) {
        ba.t = 13 + i * 0.75;                  // ışık kaynağı KAYIYOR
        s.ciz(ctx, 800, 450, ba);
      }
      const ok = ilk > 0 && ba._sayac.yeni === ilk;
      s._testTemizle();
      return ok;
    })(this);

    // 9) Eksik/bozuk bağlam çökertmemeli
    r.eksikBaglamGuvenli = (function (s) {
      try {
        s._testTemizle();
        const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
        s._testFabrika = s._sahteKanvasFabrika(say);
        const ctx = s._sahteCtx(say);
        s._sonTestCtx = ctx;
        s.ciz(ctx, 640, 360, { mapId: 'cave', t: 3, kalite: function () { return 1; } });
        s.ciz(ctx, 640, 360, {});
        s.ciz(ctx, 640, 360, null);
        s.ciz(null, 640, 360, {});
        s.ciz(ctx, 0, 0, {});
        s._testTemizle();
        return true;
      } catch (e) { s._testTemizle(); return false; }
    })(this);

    // 10) hazir() boyut değişimini yakalıyor ve tamponları ATIYOR
    r.hazirBoyut = (function (s) {
      s._testTemizle();
      s._testFabrika = s._sahteKanvasFabrika();
      s.hazir(400, 300);
      const ayni = (s.hazir(400, 300) === false);
      s._buf('deneme', 100, 100);
      const vardi = !!s._buflar.deneme;
      const degisti = (s.hazir(500, 300) === true);
      const atildi = !s._buflar.deneme;
      s._testTemizle();
      return ayni && degisti && vardi && atildi;
    })(this);

    // 11) Lens kiri dokusu BİR KEZ üretilip önbellekleniyor
    r.kirDokusuOnbellekli = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const d1 = s._kir();
      const cizOnce = say.ciz;
      const d2 = s._kir();
      const ok = !!d1 && d1 === d2 && cizOnce > 200 && say.ciz === cizOnce &&
                 d1.width === 512 && d1.height === 288;
      s._testTemizle();
      return ok;
    })(this);

    // 12) Kanvas yoksa (sunucu tarafı) sessizce atlamalı, çökmemeli
    r.kanvasYokGuvenli = (function (s) {
      s._testTemizle();
      s._testFabrika = function () { return null; };
      try {
        const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
        const ctx = s._sahteCtx(say);
        s._sonTestCtx = ctx;
        s.ciz(ctx, 800, 450, s._sahteBa('desert', PAL, 1));
        s._testTemizle();
        return true;
      } catch (e) { s._testTemizle(); return false; }
    })(this);

    // 13) Işık kaynağı modeli — palet farkı davranışa yansımalı, ekranda kalmalı
    r.kaynakModeli = (function (s) {
      const kV = s._kaynak({ mapId: 'volcano', t: 0 }, { gun: '#ff7030', sis: '#5a2418' }, 800, 450);
      const kK = s._kaynak({ mapId: 'arctic', t: 0 }, { gun: '#d0eaff', sis: '#e0f6ff' }, 800, 450);
      const kM = s._kaynak({ mapId: 'cave', t: 0 }, { gun: '#6090c0', sis: '#20304a' }, 800, 450);
      const icerde = [kV, kK, kM].every(function (k) {
        return isFinite(k.x) && isFinite(k.y) &&
               k.x > -800 && k.x < 1600 && k.y > -450 && k.y < 450 &&
               k.guc > 0 && k.guc <= 1 && k.kapali >= 0 && k.kapali <= 1;
      });
      // volkan alçak / kutup tepede; mağara kapalı ve zayıf
      return icerde && kV.y > kK.y && kM.kapali > kK.kapali && kM.guc < kK.guc;
    })(this);

    // 14) Hayalet dizilimi ışığın KARŞI tarafında (f>0 => merkezin ötesi)
    r.hayaletDizilimi = (function (s) {
      const artan = s._HAYALET.every(function (h, i) {
        return i === 0 || h.f > s._HAYALET[i - 1].f;
      });
      const sayi = s._HAYALET.length >= 4 && s._HAYALET.length <= 6;
      const karsi = s._HAYALET.filter(function (h) { return h.f > 0; }).length >= 4;
      return artan && sayi && karsi;
    })(this);

    // ═══════════════════════════════════════════════════════════════════════
    // 15) 🔴 YARI ÇÖZÜNÜRLÜKLÜ TOPLAYICI — TAŞIMAYI SAYARAK DOĞRULAR
    // Ölçülen: tampon EKRANIN TAM YARISI · tampona kaç KATMAN yönlendirildi ·
    // tamponda kaç GEÇİŞ boyandı · ekrana kaç TEK bindirme yapıldı ·
    // yedek yola HİÇ düşülmedi mi.
    // ═══════════════════════════════════════════════════════════════════════
    r.araTasimaSayildi = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const ctx = s._sahteCtx(say);
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('volcano', PAL, 1);
      const k0 = s._araKatman, b0 = s._araBindirme, y0 = s._araYedek;
      s.ciz(ctx, 800, 450, ba);
      const ara = s._buflar.ara;
      const ac = ara ? ara.getContext('2d') : null;
      const ok = !!ara && !!ac &&
        // a) tampon ekranın TAM YARISI (400x225)
        ara.width === 400 && ara.height === 225 &&
        // b) 2 katman (bloomPiramit + anamorfik) tampona yönlendirildi
        (s._araKatman - k0) === 2 &&
        // c) ekrana TEK bindirme, yedek yola HİÇ düşülmedi
        (s._araBindirme - b0) === 1 && (s._araYedek - y0) === 0 &&
        // d) tamponda TAM 5 geçiş boyandı (bloom 1/2+1/4+1/8 · anamorfik x2)
        ac._kendi.ciz === 5 &&
        // e) tampon her karede TEMİZLENİYOR (hayalet kalmasın)
        ac._kendi.temizle === 1 &&
        // f) taban dönüşümü kuruldu ve kapanışta geri alındı
        ac._kendi.donusum === 2;
      s._testTemizle();
      return ok;
    })(this);

    // 16) EKRAN YÜKÜ GERÇEKTEN DÜŞTÜ MÜ — hızlı yol ile eski yol KIYASLANIR.
    //     5 tam ekran geçişi gitti, yerine 1 bindirme geldi → fark TAM 4.
    //     (Aynı kare, aynı bağlam; tek fark `_araBozuk`.)
    r.araEkranYukuDustu = (function (s) {
      function kos(bozuk) {
        s._testTemizle();
        const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
        s._testFabrika = s._sahteKanvasFabrika(say);
        const ctx = s._sahteCtx(say);
        s._sonTestCtx = ctx;
        // ⚠ `hazir()` hızlı yola YENİDEN şans verir (`_araBozuk=false`) —
        //   bayrağı ONDAN SONRA kur, yoksa iki koşu da aynı yolu ölçer.
        s.hazir(800, 450);
        s._araBozuk = bozuk;
        s.ciz(ctx, 800, 450, s._sahteBa('volcano', PAL, 1));
        return ctx._kendi.ciz;
      }
      const eski = kos(true);                   // eski tam çözünürlüklü yol
      const yeni = kos(false);                  // yarı çözünürlüklü toplayıcı
      s._testTemizle();
      return eski > 0 && (eski - yeni) === 4;
    })(this);

    // 17) TAHSİS SIFIR — 60 kare boyunca YENİ offscreen tuval ayrılmamalı.
    //     (`dogrula-dolgu.js` bunu "ara tuval tahsisi/kare: 0.00" diye ölçer.)
    r.araTahsisSifir = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const ctx = s._sahteCtx(say);
      s._sonTestCtx = ctx;
      const ba = s._sahteBa('volcano', PAL, 1);
      s.ciz(ctx, 800, 450, ba);          // ilk kare: tamponlar KURULUR
      const t0 = s._tuvalSayaci;
      for (let i = 0; i < 60; i++) {
        ba.t = 20 + i * 0.37;            // ışık kaynağı kayıyor
        s.ciz(ctx, 800, 450, ba);
      }
      const ok = t0 > 0 && s._tuvalSayaci === t0;
      s._testTemizle();
      return ok;
    })(this);

    // 18) 🔴 YEDEK YOL — bindirme patlarsa katmanlar EKRANA YİNE GİDER.
    //     "Sessizce çizmemek" kabul edilmez. Ayrıca piramit ikinci kez
    //     KURULMAZ (kare önbelleği) ve hızlı yol KALICI kapanır.
    r.araYedekYolu = (function (s) {
      s._testTemizle();
      const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
      s._testFabrika = s._sahteKanvasFabrika(say);
      const ctx = s._sahteCtx(say);
      s._sonTestCtx = ctx;
      const gercek = ctx.drawImage;
      // YALNIZ tampon bindirmesi patlasın (o an `_araAcik` hâlâ true).
      ctx.drawImage = function () {
        if (s._araAcik) throw new Error('bindirme patladi');
        return gercek.apply(ctx, arguments);
      };
      const ba = s._sahteBa('volcano', PAL, 1);
      const y0 = s._araYedek, p0 = s._piramitSayac;
      const e0 = ctx._kendi.ciz;
      s.ciz(ctx, 800, 450, ba);
      const dustu = (s._araYedek - y0) === 1 && s._araBozuk === true &&
                    (s._piramitSayac - p0) === 1 &&
                    // 5 tam ekran geçişi ekrana YİNE çizildi (bindirme hariç)
                    (ctx._kendi.ciz - e0) > 5;
      // Sonraki kare doğrudan ESKİ yola gitmeli (tampon hiç açılmamalı)
      const k1 = s._araKatman;
      s.ciz(ctx, 800, 450, ba);
      const kalici = (s._araKatman === k1) && (s._araAcik === false);
      s._testTemizle();
      return dustu && kalici;
    })(this);

    // 19) KALİTE GEÇİDİ — bloom/anamorfik/eşikten biri 0 ise tampon HİÇ
    //     açılmaz (boş tampon temizlemenin 0,25'ini ödemeyelim).
    r.araKaliteGecidi = (function (s) {
      function kos(deger) {
        s._testTemizle();
        const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
        s._testFabrika = s._sahteKanvasFabrika(say);
        const ctx = s._sahteCtx(say);
        s._sonTestCtx = ctx;
        const k0 = s._araKatman;
        s.ciz(ctx, 800, 450, s._sahteBa('volcano', PAL, deger));
        return { katman: s._araKatman - k0, ara: !!s._buflar.ara };
      }
      const sifir = kos(0);
      const tam = kos(1);
      s._testTemizle();
      return sifir.katman === 0 && sifir.ara === false &&
             tam.katman === 2 && tam.ara === true;
    })(this);

    this._testTemizle();
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselLens = GorselLens;
