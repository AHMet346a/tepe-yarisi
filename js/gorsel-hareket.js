'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-HAREKET — Hareket bulanıklığı + derinlik son-işlem katmanı (30 Tmz)
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında HIZ hissini üretir.
// `gorsel.js` renk/bloom, `gorsel-isik.js` ışık/gölge yapar; BURASI hareket.
// Çizim koduna hiç dokunmaz, kendi başına ayakta durur.
//
// EFEKTLER (her biri AYRI kalite anahtarıyla geçitli):
//   · hareketBulanik  — GERÇEK biriktirmeli hareket bulanıklığı (önceki kareler
//                       yarı çözünürlüklü tamponda tutulur, hıza bağlı alfayla
//                       bindirilir; duran araçta tampon TEK SEFER temizlenir)
//   · radyalBulanik   — merkeze kilitli zoom (radyal) bulanıklık; merkez halka
//                       ile KIRPILIR, böylece aracın etrafı net kalır
//   · hizCizgi        — kenarlardan merkeze akan hız çizgileri (SABİT havuz,
//                       en fazla 40 çizgi; havuz `hazir()`'da bir kez kurulur)
//   · alanDerinligi   — sahte DOF: üst (uzak) ve en alt (çok yakın) şeritler
//                       kademeli bulanır, orta bant net kalır
//   · tunelVinyet     — hızla DARALAN vinyet (tünel hissi) + hız halkası
//   · carpmaSarsinti  — sert inişte ekran sarsıntısı + GERÇEK kanal ayrımlı
//                       kromatik sapma (kırmızı/camgöbeği ters yönde kayar)
//   · nitroDalga      — nitro/boost başlangıcında merkezden yayılan şok halkası
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bu dosya HİÇBİR bare global'e güvenmez (Game/Terrain/Camera `window`'da
// DEĞİL — CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle
//   ba.camera{worldToScreen} · ba.terrain{getYAt} · ba.t · ba.dt
//   ba.kalite(ad)->0..1 · ba.gr(anahtar, uretici)
//
// 🔴 SERT KURALLAR (ihlali p99'u bozar — DEVAM-OZETI §8B.27/B5, §8B.28/P)
//   1. Gradient üretimi YALNIZ `this._gr(...)` → `ba.gr(...)` üzerinden.
//      Konumu/boyutu değişen efektler (tünel vinyeti, şok halkası, çarpma
//      parlaması) BİRİM UZAYDA (0,0,r=1) üretilmiş gradient + translate/scale
//      ile çizilir; boya BOYAMA anındaki dönüşümde çözülür → tek önbellek yeter
//      ve kare başına YENİ gradient sayısı 0'a iner.
//   2. `getImageData`/`putImageData` YOK. Yumuşaklık `ctx.filter='blur()'`
//      (GPU) ile; destek yoksa çok geçişli çizimle taklit edilir.
//   3. Her efekt `ba.kalite('...')` geçidinden geçer; 0 dönerse TEK BİR çizim
//      çağrısı bile yapılmaz (selfTest bunu SAYARAK doğrular).
//   4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
//   5. globalAlpha / globalCompositeOperation / filter / transform her hâlde
//      geri konur (bir efekt yarıda patlasa bile).
//   6. TAMPON SAYISI SABİT: en fazla DÖRT offscreen tuval (_iz, _kare, _gecici,
//      _ara), hepsi yarı çözünürlüklü ve YALNIZ boyut değişince yeniden kurulur.
//      Kare biriktirme tamponu asla listeye/diziye eklenmez → sınırsız büyüme
//      fiziksel olarak imkânsız (`_tuvalSayaci` bunu ölçer).
//   8. ÇOK GEÇİŞLİ efektler (radyal bulanıklık) geçişlerini `_ara` tamponunda
//      YARI ÇÖZÜNÜRLÜKTE biriktirir ve ekrana TEK kez bindirir. Kaynak
//      (`_kare`) zaten W/2×H/2 olduğu için görüntü kaybı YOK; kazanç ölçüldü
//      (1 Ağu, `node port-araclari\dogrula-dolgu.js`):
//        radyal bulanıklık  6,95 → 2,75 ekran alanı/kare
//        gorsel-hareket.js 10,85 → 6,65 · countryside/hızlı 50,78 → 46,58
//      🔴 Bu dönüşüm görüntüyü DEĞİŞTİRMEZ çünkü `source-over` BİRLEŞMELİDİR:
//         B⊕L1⊕L2⊕…⊕Ln  ≡  B⊕(L1⊕L2⊕…⊕Ln). Katmanları önce şeffaf tamponda
//         toplayıp alfa=1 ile bindirmek, tek tek bindirmekle AYNI sonucu verir.
//      ⚠ Bu KURAL YALNIZ ÇOK GEÇİŞLİ efektler için geçerlidir. TEK geçişli bir
//        efekti (tünel vinyeti gibi) ara tuvale taşımak 0,25 + 1,00 = 1,25
//        ekran alanı eder, oysa doğrudan çizmek 1,00 — yani PAHALILAŞTIRIR.
//        Ölçmeden taşıma (ayrıntı: `_tunelVinyet` başlığındaki not).
//   7. Efektler HIZA BAĞLI: `|vehicle.vx|` ~260'ın altında bu dosya ekrana
//      HİÇBİR ŞEY çizmez (olay tabanlı çarpma/nitro hariç, onlar da duran
//      araçta tetiklenmez). Duran araçta maliyet ≈ 0.
// ═══════════════════════════════════════════════════════════════════════════
const GorselHareket = {
  ad: 'hareket',

  // ── AYAR SABİTLERİ ───────────────────────────────────────────────────────
  // ⚠ Ölçülmüş bağlam: oyunun cruise hızı ~150-190 m/s (dünya birimi).
  //   Efektler bunun ÜSTÜNDE başlamalı, yoksa normal sürüşte sürekli açık
  //   kalır ve hem maliyet hem görsel gürültü olur.
  ESIK_VX: 260,          // bu hızın ALTINDA hiçbir hız efekti yok
  ARALIK_VX: 620,        // eşik + bu = tam güç (880)
  CARPMA_ESIK: 420,      // vy'nin bir karede bu kadar kesilmesi = çarpma
  CARPMA_SONUM: 3.4,     // saniyede sönüm hızı (1/s)
  HALKA_OMUR: 0.62,      // şok dalgası ömrü (sn)
  _CIZGI_MAX: 40,        // hız çizgisi havuzunun ÜST SINIRI (asla aşılmaz)
  _HALKA_MAX: 4,         // aynı anda en fazla 4 şok halkası

  // ── İÇ DURUM ─────────────────────────────────────────────────────────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _iz: null, _izC: null,             // biriktirme (motion trail) tamponu
  _kare: null, _kareC: null,         // bu karenin anlık kopyası (yarı çöz.)
  _gecici: null, _geciciC: null,     // kanal ayrımı / yardımcı işlem tamponu
  _ara: null, _araC: null,           // ÇOK GEÇİŞLİ efekt biriktirmesi (yarı çöz.)
  _tuvalSayaci: 0,                   // ÖLÇÜM: kaç offscreen tuval üretildi
  _kareTaze: false,                  // `_kare` bu karede güncellendi mi
  _izDolu: false,                    // biriktirme tamponunda içerik var mı
  _grYerel: {},                      // ba.gr yoksa kullanılan yedek önbellek
  _grUretim: 0,                      // ÖLÇÜM: yedek önbellekte kaç yeni gradient
  _blurDestek: null,                 // ctx.filter blur desteği (bir kez ölçülür)
  _cizgiler: [],                     // SABİT havuz (uzunluk = _CIZGI_MAX)
  _halkalar: [],                     // SABİT havuz (uzunluk = _HALKA_MAX)
  _vxYum: 0,                         // yumuşatılmış |vx|
  _hiz: 0,                           // 0..1 normalize hız (efekt gücü)
  _sonVy: 0,
  _sonYerde: true,
  _sonNitro: false,
  _carpma: 0,                        // 0..1 çarpma şiddeti (sönümlenir)
  _ilkKare: true,                    // ilk karede sahte çarpma üretme

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // `ba.kalite` verilmediğinde global `Kalite` tablosunda karşılığı olan
  // anahtara düşülür (bu dosyanın anahtarları tabloda YOK; yoksa 0 = kapalı).
  _ESKI_ANAHTAR: {
    hareketBulanik: 'hizBulaniklik',
    radyalBulanik: 'hizBulaniklik',
    hizCizgi: 'hizBulaniklik',
    alanDerinligi: 'derinlikSis',
    tunelVinyet: 'vignette',
    carpmaSarsinti: 'kromatik',
    nitroDalga: 'bloom'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KURULUM — tamponlar + havuzlar YALNIZ burada kurulur
  // ═════════════════════════════════════════════════════════════════════════
  hazir(W, H) {
    W = Math.max(1, Math.round(W || 0));
    H = Math.max(1, Math.round(H || 0));
    if (this._hazirlandi && this._W === W && this._H === H) return false;
    this._W = W;
    this._H = H;
    this._hazirlandi = true;

    // Ekran uzayı gradientleri boyuta bağlı → yedek önbelleği boşalt.
    this._grYerel = {};
    this._grUretim = 0;
    this._blurDestek = null;
    this._izDolu = false;
    this._kareTaze = false;

    // ⚠ Kural 6: tamponlar YARI çözünürlüklü ve SAYISI DÖRT. Boyut değişmedikçe
    //   yeniden üretilmez; değişirse ESKİLERİ bırakılır (GC toplar), yeni dört
    //   tane kurulur. Hiçbir yerde dizi/liste'ye eklenmezler.
    // 🔴 `_ara` KARE BAŞINA YENİDEN AYRILMAZ — tahsis YALNIZ burada olur ve
    //   `dogrula-dolgu.js` "ara tuval tahsisi/kare: 0.00" diye bunu ölçer.
    const bw = Math.max(16, Math.round(W / 2));
    const bh = Math.max(16, Math.round(H / 2));
    if (!this._iz || this._iz.width !== bw || this._iz.height !== bh) {
      this._iz = this._tuvalYap(bw, bh);
      this._kare = this._tuvalYap(bw, bh);
      this._gecici = this._tuvalYap(bw, bh);
      this._ara = this._tuvalYap(bw, bh);
      this._izC = this._ct(this._iz);
      this._kareC = this._ct(this._kare);
      this._geciciC = this._ct(this._gecici);
      this._araC = this._ct(this._ara);
    }

    // Hız çizgisi havuzu — SABİT uzunluk, her karede yeniden üretilmez.
    this._cizgiler = [];
    for (let i = 0; i < this._CIZGI_MAX; i++) {
      this._cizgiler.push(this._cizgiYeni(0.25 + (i / this._CIZGI_MAX) * 1.1));
    }
    // Şok dalgası havuzu — SABİT uzunluk, "aktif" bayrağıyla geri dönüştürülür.
    this._halkalar = [];
    for (let j = 0; j < this._HALKA_MAX; j++) {
      this._halkalar.push({ aktif: false, yas: 0, guc: 1 });
    }
    return true;
  },

  // Test/oturum sıfırlaması — durumu başlangıca çeker (tamponlara dokunmaz).
  _sifirla() {
    this._vxYum = 0;
    this._hiz = 0;
    this._carpma = 0;
    this._sonVy = 0;
    this._sonYerde = true;
    this._sonNitro = false;
    this._ilkKare = true;
    this._izDolu = false;
    for (let i = 0; i < this._halkalar.length; i++) this._halkalar[i].aktif = false;
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

    // dt kelepçesi: sekme arka plandayken dt devasa gelir; sönümler patlar.
    let dt = (typeof ba.dt === 'number' && isFinite(ba.dt)) ? ba.dt : 0.016;
    dt = Math.max(0, Math.min(0.1, dt));

    // Hız / çarpma / nitro durumunu bir kez hesapla (efektler bunu paylaşır).
    const d = this._durum(ba, dt);
    this._kareTaze = false;

    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;

    // SIRA ÖNEMLİ:
    //   1) biriktirme (geçmiş kareler) — en altta kalmalı
    //   2) radyal bulanıklık — geçmişle birlikte smear olsun
    //   3) alan derinliği — bulanık şeritler bulanık kaynaktan beslensin
    //   4) hız çizgileri / tünel vinyeti — üstte, net
    //   5) çarpma + nitro — olay katmanı, en üstte
    try { this._hareketBulanik(ctx, W, H, ba, p, d); } catch (e) {}
    try { this._radyalBulanik(ctx, W, H, ba, p, d); } catch (e) {}
    try { this._alanDerinligi(ctx, W, H, ba, p, d); } catch (e) {}
    try { this._hizCizgi(ctx, W, H, ba, p, d); } catch (e) {}
    try { this._tunelVinyet(ctx, W, H, ba, p, d); } catch (e) {}
    try { this._carpmaSarsinti(ctx, W, H, ba, p, d); } catch (e) {}
    try { this._nitroDalga(ctx, W, H, ba, p, d); } catch (e) {}

    // Kural 5: durumu her hâlükârda geri koy.
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    try { ctx.filter = 'none'; } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) BİRİKTİRMELİ HAREKET BULANIKLIĞI (gerçek accumulation)
  //
  // Klasik yol: sahne → biriktirme tamponunu üste bindir → sonucu tampona yaz.
  // Geri besleme kazancı (1-a_bir)*a_bin < 1 olduğu için sınırlıdır, sonsuz
  // parlamaya gitmez. Duran araçta tampon TEK SEFER temizlenir (`_izDolu`),
  // yoksa hayalet iz ekranda asılı kalır.
  // ═════════════════════════════════════════════════════════════════════════
  _hareketBulanik(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'hareketBulanik');
    if (g <= 0) return;
    if (!this._iz || !this._izC || !ctx.canvas) return;

    if (d.hiz <= 0.012) {
      // Durdu: geçmişi bir kez sil, sonra hiçbir şey yapma (maliyet 0).
      if (this._izDolu) {
        try { this._izC.clearRect(0, 0, this._iz.width, this._iz.height); } catch (e) {}
        this._izDolu = false;
      }
      return;
    }

    // a) geçmişi ekrana bindir — alfa TAMAMEN hıza bağlı
    if (this._izDolu) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.min(0.62, (0.10 + 0.42 * d.hiz) * g);
      ctx.drawImage(this._iz, 0, 0, W, H);
      ctx.restore();
    }

    // b) sonucu tampona yaz — düşük hızda geçmiş HIZLI silinsin diye
    //    biriktirme alfası hızla ters orantılı (yüksek hız = uzun iz).
    const biriktir = Math.max(0.18, Math.min(0.92, 0.86 - 0.52 * d.hiz * g));
    try {
      this._izC.globalCompositeOperation = 'source-over';
      this._izC.globalAlpha = biriktir;
      this._izC.drawImage(ctx.canvas, 0, 0, this._iz.width, this._iz.height);
      this._izC.globalAlpha = 1;
      this._izDolu = true;
    } catch (e) {}
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) RADYAL (ZOOM) BULANIKLIK  —  YARI ÇÖZÜNÜRLÜKLÜ (1 Ağu)
  // Kareyi merkeze göre birkaç kez hafifçe büyütüp düşük alfayla bindirir.
  // ⚠ Merkez HALKA ile kırpılır ('evenodd' → daire DIŞI): aracın çevresi net
  //   kalır, yoksa oyuncunun bakması gereken bölge okunmaz olur.
  //
  // 🔴 NEDEN YARI ÇÖZÜNÜRLÜK (ölçüldü, `dogrula-dolgu.js`):
  //   Eskiden 6 örnek + 1 ters örnek TAM EKRAN boyutuna yükseltilip TEK TEK
  //   ekrana biniyordu = 7 × 1,00 = 6,95 ekran alanı/kare. Bu, tüm son-işlem
  //   katmanının EN PAHALI TEKİL ÇAĞRI YERİYDİ. Kaynak (`_kare`) ZATEN
  //   W/2×H/2 olduğu için yükseltmeyi 7 kez yapmanın hiçbir görsel karşılığı
  //   yoktu. Şimdi 7 örnek `_ara` tamponunda YARI çözünürlükte biriktiriliyor
  //   (7 × 0,25) ve ekrana TEK kez bindiriliyor (1,00) = 2,75.
  //   ⛔ HİÇBİR EFEKT SİLİNMEDİ, hiçbir kalite anahtarı düşürülmedi; `adet`,
  //      alfa formülleri ve ters yön geçişi BİREBİR aynı.
  //
  // 🔴 GÖRÜNTÜ NEDEN AYNI: `source-over` BİRLEŞMELİDİR (associative).
  //   Katmanları şeffaf tamponda toplayıp alfa=1 ile bindirmek, tek tek
  //   bindirmekle matematiksel olarak AYNI sonucu verir. Kırpma da her katman
  //   için AYNI maske olduğundan, birleşimi kırpmak = katmanları kırpmaktır →
  //   kırpma TAM ÇÖZÜNÜRLÜKTE, bindirme anında uygulanır (kenar yumuşaklığı
  //   korunur, halkanın basamaklanması olmaz).
  //
  // 🔴 SIRA KİLİDİ: `_kareGuncel` ekranı okur; ara tuvalin ekrana bindirilmesi
  //   bu okumadan SONRA olmak ZORUNDA, yoksa efekt bir kare geride kalır.
  // ═════════════════════════════════════════════════════════════════════════
  _radyalBulanik(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'radyalBulanik');
    if (g <= 0 || d.hiz <= 0.02) return;
    const kare = this._kareGuncel(ctx);        // ← ekran okuması ÖNCE
    if (!kare) return;

    const m = this._merkez(ba, W, H);
    const adet = 3 + Math.round(3 * g);
    const enBuyuk = (0.014 + 0.055 * g) * d.hiz;   // en dış örneğin büyümesi
    const ic = Math.min(W, H) * (0.30 - 0.13 * d.hiz);   // net kalan yarıçap
    const ters = (g >= 0.6);                        // ters yön geçişi var mı
    const s2 = 1 - enBuyuk * 0.45;
    const a1 = Math.min(0.5, (0.34 * g * d.hiz) / adet);
    const a2 = Math.min(0.28, 0.16 * g * d.hiz);

    // ── HIZLI YOL: yarı çözünürlüklü biriktirme ──────────────────────────
    const ara = this._ara, ac = this._araC;
    if (ara && ac && ara.width > 0 && ara.height > 0) {
      const ox = ara.width / W, oy = ara.height / H;   // ekran → ara tuval
      const ilk = 1 + enBuyuk * (1 / adet);
      // ⚠ İlk geçiş 'copy' ile yazılırsa ayrı bir `clearRect` gerekmez (bir
      //   tam tampon geçişi = 0,25 ekran alanı tasarruf). AMA bu ancak ilk
      //   örnek tamponu TAMAMEN kaplıyorsa güvenlidir; kaplamazsa önceki
      //   karenin kalıntısı ekranda HAYALET olarak kalır. Bu yüzden kaplama
      //   HESAPLANIR, varsayılmaz.
      const kaplar = (ilk >= 1) &&
        (m.x * (1 - ilk) <= 0) && (m.y * (1 - ilk) <= 0) &&
        (m.x + ilk * (W - m.x) >= W) && (m.y + ilk * (H - m.y) >= H);
      let tamam = false;
      try {
        if (!kaplar) ac.clearRect(0, 0, ara.width, ara.height);
        ac.globalCompositeOperation = kaplar ? 'copy' : 'source-over';
        for (let i = 1; i <= adet; i++) {
          const s = 1 + enBuyuk * (i / adet);
          ac.globalAlpha = a1;
          ac.drawImage(kare, m.x * (1 - s) * ox, m.y * (1 - s) * oy, W * s * ox, H * s * oy);
          ac.globalCompositeOperation = 'source-over';   // 'copy' YALNIZ 1. geçiş
        }
        // ters yön: hafif küçültme → "içe çekilme" hissi (yalnız yüksek kalitede)
        if (ters) {
          ac.globalAlpha = a2;
          ac.drawImage(kare, m.x * (1 - s2) * ox, m.y * (1 - s2) * oy, W * s2 * ox, H * s2 * oy);
        }
        tamam = true;
      } catch (e) { tamam = false; }
      // Kural 5: tampon durumu her hâlde geri konur (yarıda patlasa bile).
      try {
        ac.globalAlpha = 1;
        ac.globalCompositeOperation = 'source-over';
      } catch (e) {}
      if (tamam) {
        ctx.save();
        // net merkez halkası: dikdörtgen + daire, evenodd => daire DIŞI boyanır
        try {
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          ctx.arc(m.x, m.y, Math.max(8, ic), 0, Math.PI * 2);
          ctx.clip('evenodd');
        } catch (e) {}
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(ara, 0, 0, W, H);        // ← TEK bindirme
        ctx.restore();
        return;
      }
      // biriktirme patladı → aşağıdaki eski yola düş (sessizce çizmemek YOK)
    }

    // ── YEDEK YOL: ara tuval yok/çalışmadı → ESKİ TAM ÇÖZÜNÜRLÜKLÜ çizim ──
    // (`document`/`createElement` olmayan başsız ortam, ya da tampon hatası.)
    ctx.save();
    try {
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(m.x, m.y, Math.max(8, ic), 0, Math.PI * 2);
      ctx.clip('evenodd');
    } catch (e) {}
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 1; i <= adet; i++) {
      const s = 1 + enBuyuk * (i / adet);
      ctx.globalAlpha = a1;
      ctx.drawImage(kare, m.x * (1 - s), m.y * (1 - s), W * s, H * s);
    }
    if (ters) {
      ctx.globalAlpha = a2;
      ctx.drawImage(kare, m.x * (1 - s2), m.y * (1 - s2), W * s2, H * s2);
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) ALAN DERİNLİĞİ (sahte DOF)
  // Üst şerit = uzak arka plan, en alt şerit = kameraya çok yakın zemin.
  // İkisi de kademeli bulanır; orta bant (oynanış alanı) NET kalır.
  // ⚠ Maske YOK: kademeyi ŞERİT ŞERİT alfa vererek elde ediyoruz, böylece
  //   ne gradient ne getImageData gerekiyor.
  // ═════════════════════════════════════════════════════════════════════════
  _alanDerinligi(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'alanDerinligi');
    if (g <= 0 || d.hiz <= 0.02) return;
    const kare = this._kareGuncel(ctx);
    if (!kare) return;

    const kw = kare.width, kh = kare.height;
    const oy = kh / H;                       // ekran → tampon dikey ölçek
    const bant = 5;
    const enBulanik = (2.5 + 9 * g) * (0.35 + 0.65 * d.hiz);
    const ustYuk = H * (0.10 + 0.16 * g);    // uzak şerit
    const altYuk = H * (0.06 + 0.10 * g);    // çok yakın şerit

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < bant; i++) {
      // ── üst (uzak): en tepede en bulanık
      const k1 = 1 - i / bant;
      const y1 = (ustYuk * i) / bant;
      const h1 = ustYuk / bant + 1;
      ctx.globalAlpha = Math.min(0.95, 0.30 + 0.62 * k1 * g);
      this._bulanik(ctx, enBulanik * k1);
      ctx.drawImage(kare, 0, y1 * oy, kw, h1 * oy, 0, y1, W, h1);

      // ── alt (çok yakın): en altta en bulanık
      const k2 = (i + 1) / bant;
      const y2 = H - altYuk + (altYuk * i) / bant;
      const h2 = altYuk / bant + 1;
      ctx.globalAlpha = Math.min(0.95, 0.24 + 0.58 * k2 * g);
      this._bulanik(ctx, enBulanik * 0.8 * k2);
      ctx.drawImage(kare, 0, y2 * oy, kw, h2 * oy, 0, y2, W, h2);
    }
    try { ctx.filter = 'none'; } catch (e) {}
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) HIZ ÇİZGİLERİ — kenarlardan merkeze akar
  // SABİT havuz: `hazir()`'da _CIZGI_MAX kadar üretilir, ASLA büyümez.
  // Çizgi merkeze varınca dışarıda yeniden doğar (geri dönüşüm).
  // ═════════════════════════════════════════════════════════════════════════
  _hizCizgi(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'hizCizgi');
    if (g <= 0 || d.hiz <= 0.015) return;
    const liste = this._cizgiler;
    if (!liste || !liste.length) return;

    const m = this._merkez(ba, W, H);
    const rx = W * 0.78, ry = H * 0.78;
    const adet = Math.max(6, Math.round(liste.length * (0.35 + 0.65 * g)));
    const renk = this._karis(p.bloom || '#ffeec8', '#ffffff', 0.45);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = renk;
    for (let i = 0; i < adet; i++) {
      const c = liste[i];
      // akış: dıştan içe (spec: kenarlardan merkeze)
      c.r -= c.h * d.dt * (0.25 + 1.85 * d.hiz);
      if (c.r <= 0.14) {
        // geri dönüşüm — YENİ NESNE ÜRETİLMEZ, alanlar tazelenir
        c.r = 1.05 + Math.random() * 0.45;
        c.a = Math.random() * Math.PI * 2;
        c.u = 0.10 + Math.random() * 0.22;
        c.h = 0.55 + Math.random() * 0.95;
        c.k = 0.6 + Math.random() * 2.2;
      }
      const r2 = Math.max(0.10, c.r - c.u * (0.30 + 1.0 * d.hiz));
      const co = Math.cos(c.a), si = Math.sin(c.a);
      // merkeze yaklaşınca sön (net bölgeye girmesin)
      const sonum = Math.min(1, Math.max(0, (c.r - 0.18) / 0.35));
      ctx.globalAlpha = Math.min(0.85, 0.55 * g * d.hiz * sonum);
      ctx.lineWidth = Math.max(0.6, c.k * (0.5 + 0.9 * d.hiz));
      ctx.beginPath();
      ctx.moveTo(m.x + co * rx * c.r, m.y + si * ry * c.r);
      ctx.lineTo(m.x + co * rx * r2, m.y + si * ry * r2);
      ctx.stroke();
    }
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) TÜNEL VİNYETİ — hız arttıkça DARALIR
  // ⚠ Gradient BİRİM UZAYDA (r=1) üretilir; daralma `scale()` ile yapılır.
  //   Böylece her hız değeri için yeni gradient üretilmez (kare başına 0).
  //
  // 🔴 BU EFEKT BİLEREK YARI ÇÖZÜNÜRLÜĞE TAŞINMADI — TEKRAR DENEME (1 Ağu).
  //   İki ayrı ölçüm yapıldı, ikisi de "taşıma" diyor:
  //
  //   1) GÖRSEL RİSK: yok. Gradyan durakları okundu, en sert geçişler
  //      (a) 0,90→1,00 = 0,00926 alfa/px  · (b) 0,95→1,00 = 0,01464 alfa/px.
  //      Yarı çözünürlükte örnekleme adımı 2 px → en fazla 5/255 ve 7/255
  //      alfa farkı. İkisi de RAMPA, keskin KENAR değil; yani yarı çözünürlük
  //      görsel olarak sorun çıkarmazdı.
  //
  //   2) MALİYET: taşımak PAHALILAŞTIRIYOR. Kazanç ancak AYNI hedefe ÇOK
  //      GEÇİŞ yapan efektlerde doğar (radyal bulanıklıkta 7 geçiş vardı).
  //      Burada geçiş başına TEK dolgu var ve ikisi FARKLI karışım modunda:
  //        (a) 'source-over' karartma · (b) 'lighter' halka
  //      'lighter' toplamalıdır; şeffaf tamponda toplayıp 'source-over' ile
  //      bindirmek AYNI sonucu VERMEZ → tek tamponda birleştirilemezler.
  //      Ölçekli hesap (dogrula-dolgu.js birimi, ekran alanı/kare):
  //        şimdiki : 1,00 + 1,00                     = 2,00
  //        yarı çöz: (0,25 + 1,00) × 2               = 2,50   ← DAHA PAHALI
  //   ▶ Kural: bir geçişi ara tuvale taşımanın sabit bedeli 1,00'lık bindirme
  //     turudur. Yalnız ≥3 tam-ekran geçişi olan efektlerde kâra geçer.
  // ═════════════════════════════════════════════════════════════════════════
  _tunelVinyet(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'tunelVinyet');
    if (g <= 0 || d.hiz <= 0.01) return;
    const m = this._merkez(ba, W, H);
    const self = this;
    const anh = (p.tint || '') + '|' + (p.bloom || '');

    // a) daralan karartma
    const R = Math.max(24, Math.min(W, H) * (0.98 - 0.46 * d.hiz * g));
    const hx = W / R + 0.02, hy = H / R + 0.02;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.92, (0.24 + 0.55 * d.hiz) * g);
    ctx.translate(m.x, m.y);
    ctx.scale(R, R);
    ctx.fillStyle = this._gr(ctx, ba, 'hrk-tunel|' + anh, function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0.00, 'rgba(0,0,0,0)');
      gr.addColorStop(0.42, 'rgba(0,0,0,0.06)');
      gr.addColorStop(0.72, 'rgba(0,0,0,0.34)');
      gr.addColorStop(0.90, 'rgba(0,0,0,0.72)');
      gr.addColorStop(1.00, 'rgba(0,0,0,0.94)');
      return gr;
    });
    ctx.fillRect(-hx, -hy, hx * 2, hy * 2);
    ctx.restore();

    // b) tünel ağzı halkası — hız arttıkça parlar (biyom bloom rengiyle)
    if (g >= 0.4) {
      const R2 = R * 0.92;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.55, 0.30 * g * d.hiz * d.hiz);
      ctx.translate(m.x, m.y);
      ctx.scale(R2, R2);
      ctx.fillStyle = this._gr(ctx, ba, 'hrk-tunelhalka|' + anh, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0.00, self._rgba(p.bloom, 0));
        gr.addColorStop(0.66, self._rgba(p.bloom, 0));
        gr.addColorStop(0.84, self._rgba(p.bloom, 0.40));
        gr.addColorStop(0.95, self._rgba(p.tint, 0.16));
        gr.addColorStop(1.00, self._rgba(p.tint, 0));
        return gr;
      });
      ctx.fillRect(-hx, -hy, hx * 2, hy * 2);
      ctx.restore();
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) ÇARPMA SARSINTISI + KANAL AYRIMLI KROMATİK SAPMA
  //
  // 🔴 Buradaki kromatik sapma `gorsel.js`'tekinden FARKLI: orada kare iki kez
  //    'lighter' ile kaydırılıp bindiriliyor (sadece parlaklık artar). Burada
  //    kare önce yardımcı tampona kopyalanır, 'multiply' + saf KIRMIZI ile
  //    kanal İZOLE edilir, sonra 'lighter' ile kaydırılıp geri konur. Aynısı
  //    camgöbeği için ters yönde yapılır → gerçek RGB ayrışması, getImageData
  //    kullanmadan.
  // ═════════════════════════════════════════════════════════════════════════
  _carpmaSarsinti(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'carpmaSarsinti');
    if (g <= 0 || d.carpma <= 0.02) return;
    const kare = this._kareGuncel(ctx);
    if (!kare) return;

    const s = d.carpma;
    const t = (ba.t || 0) * 60;
    // sarsıntı: iki farklı frekansın toplamı (tek sinüs "yaylanma" gibi durur)
    const genlik = Math.min(W, H) * 0.030 * s * g;
    const dx = (Math.sin(t * 1.9) * 0.7 + Math.sin(t * 4.3 + 1.1) * 0.3) * genlik;
    const dy = (Math.cos(t * 2.3 + 0.6) * 0.7 + Math.sin(t * 5.1) * 0.3) * genlik * 0.8;
    const bym = 1 + 0.045 * s;    // kenarda boşluk kalmasın diye hafif büyütme

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(0.92, 0.80 * s * g);
    ctx.drawImage(kare,
      dx - W * (bym - 1) * 0.5, dy - H * (bym - 1) * 0.5, W * bym, H * bym);
    ctx.restore();

    // kanal ayrımı (yalnız orta/üst kalitede — iki ek tampon geçişi)
    const kay = Math.min(W, H) * 0.012 * s * g;
    if (g >= 0.35 && kay > 0.4) {
      const kirmizi = this._kanal(kare, '#ff0000');
      if (kirmizi) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.55, 0.42 * s * g);
        ctx.drawImage(kirmizi, dx + kay, dy, W, H);
        ctx.restore();
      }
      const camgobegi = this._kanal(kare, '#00ffff');
      if (camgobegi) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.55, 0.42 * s * g);
        ctx.drawImage(camgobegi, dx - kay, dy, W, H);
        ctx.restore();
      }
    }

    // temas parlaması — birim uzayda önbellekli gradient
    const m = this._merkez(ba, W, H);
    const R = Math.max(24, Math.min(W, H) * (0.30 + 0.55 * s));
    const self = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.5, 0.34 * s * g);
    ctx.translate(m.x, Math.min(H, m.y + H * 0.10));
    ctx.scale(R, R * 0.55);
    ctx.fillStyle = this._gr(ctx, ba, 'hrk-carpma|' + (p.bloom || ''), function (c) {
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0.00, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.28, self._rgba(p.bloom, 0.45));
      gr.addColorStop(1.00, self._rgba(p.bloom, 0));
      return gr;
    });
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 7) NİTRO ŞOK DALGASI — merkezden yayılan halka(lar)
  // SABİT havuz (_HALKA_MAX). Yeni tetikleme boş yuvayı, boş yoksa EN YAŞLI
  // yuvayı geri dönüştürür → dizi asla büyümez.
  // ═════════════════════════════════════════════════════════════════════════
  _nitroDalga(ctx, W, H, ba, p, d) {
    const g = this._k(ba, 'nitroDalga');
    if (g <= 0) return;
    const liste = this._halkalar;
    if (!liste || !liste.length) return;

    const m = this._merkez(ba, W, H);
    const enBuyuk = Math.max(W, H) * 0.78;
    const self = this;
    const anh = (p.bloom || '') + '|' + (p.tint || '');
    let cizildi = false;

    for (let i = 0; i < liste.length; i++) {
      const h = liste[i];
      if (!h.aktif) continue;
      const n = Math.min(1, h.yas / this.HALKA_OMUR);       // 0..1 ilerleme
      const R = Math.max(6, enBuyuk * (0.06 + 0.94 * this._yumusa(n)));
      const a = Math.pow(1 - n, 1.7) * h.guc * g;
      if (a <= 0.004) continue;
      cizildi = true;

      // a) gradient halka (kalın, yumuşak)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.85, 0.62 * a);
      ctx.translate(m.x, m.y);
      ctx.scale(R, R * 0.92);
      ctx.fillStyle = this._gr(ctx, ba, 'hrk-dalga|' + anh, function (c) {
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0.00, self._rgba(p.tint, 0));
        gr.addColorStop(0.62, self._rgba(p.tint, 0));
        gr.addColorStop(0.80, self._rgba(p.bloom, 0.30));
        gr.addColorStop(0.92, 'rgba(255,255,255,0.72)');
        gr.addColorStop(0.98, self._rgba(p.bloom, 0.22));
        gr.addColorStop(1.00, self._rgba(p.bloom, 0));
        return gr;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // b) ince keskin çember (halkanın "kenarı")
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.7, 0.45 * a);
      ctx.strokeStyle = this._rgba(p.bloom, 0.9);
      ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.010 * (1 - n * 0.7));
      ctx.beginPath();
      ctx.arc(m.x, m.y, R * 0.94, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // c) dalga geçerken kareyi hafifçe iterek "basınç" hissi (ULTRA)
    if (cizildi && g >= 0.8) {
      const kare = this._kareGuncel(ctx);
      if (kare) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.10 * g;
        const s2 = 1.012;
        ctx.drawImage(kare, m.x * (1 - s2), m.y * (1 - s2), W * s2, H * s2);
        ctx.restore();
      }
    }
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DURUM HESABI — hız / çarpma / nitro (kare başına BİR kez)
  // ═════════════════════════════════════════════════════════════════════════
  _durum(ba, dt) {
    const v = ba.vehicle;
    const ham = (v && typeof v.vx === 'number' && isFinite(v.vx)) ? Math.abs(v.vx) : 0;

    // Kare hızından bağımsız üstel yumuşatma (ani sıçrama = titreşen efekt).
    const k = Math.min(1, Math.max(0, dt * 9));
    this._vxYum += (ham - this._vxYum) * k;
    this._hiz = Math.min(1, Math.max(0, (this._vxYum - this.ESIK_VX) / this.ARALIK_VX));

    // ── ÇARPMA: vy'nin bir karede ne kadar "kesildiği" ───────────────────
    const vy = (v && typeof v.vy === 'number' && isFinite(v.vy)) ? v.vy : 0;
    const yerde = !!(v && v.onGround);
    if (this._ilkKare) {
      // ⚠ İlk karede önceki vy 0'dır → sahte çarpma üretir. Bir kare atla.
      this._sonVy = vy;
      this._sonYerde = yerde;
      this._ilkKare = false;
    } else {
      const dvy = this._sonVy - vy;                 // aşağı hız kesildiyse > 0
      if (dvy > this.CARPMA_ESIK) {
        const siddet = Math.min(1, (dvy - this.CARPMA_ESIK) / 900);
        // havadan yere iniş daha sert hissettirilir
        const carpan = (yerde && !this._sonYerde) ? 1.35 : 0.85;
        this._carpma = Math.min(1, Math.max(this._carpma, siddet * carpan));
      }
      this._sonVy = vy;
      this._sonYerde = yerde;
    }
    this._carpma = Math.max(0, this._carpma - dt * this.CARPMA_SONUM);

    // ── NİTRO: yükselen kenar → şok dalgası ──────────────────────────────
    const nitro = !!(v && (v.boostActive || v.nitroActive || v.boosting || v.nitro));
    if (nitro && !this._sonNitro) this._halkaEkle(1);
    this._sonNitro = nitro;
    for (let i = 0; i < this._halkalar.length; i++) {
      const h = this._halkalar[i];
      if (!h.aktif) continue;
      h.yas += dt;
      if (h.yas >= this.HALKA_OMUR) h.aktif = false;
    }

    return { hiz: this._hiz, vx: this._vxYum, carpma: this._carpma, nitro: nitro, dt: dt };
  },

  _halkaEkle(guc) {
    const l = this._halkalar;
    if (!l || !l.length) return;
    let hedef = null;
    for (let i = 0; i < l.length; i++) {
      if (!l[i].aktif) { hedef = l[i]; break; }
    }
    if (!hedef) {
      // boş yuva yok → EN YAŞLIYI geri dönüştür (dizi büyümez)
      hedef = l[0];
      for (let j = 1; j < l.length; j++) if (l[j].yas > hedef.yas) hedef = l[j];
    }
    hedef.aktif = true;
    hedef.yas = 0;
    hedef.guc = guc;
  },

  _cizgiYeni(r) {
    return {
      a: Math.random() * Math.PI * 2,
      r: r,
      u: 0.10 + Math.random() * 0.22,
      h: 0.55 + Math.random() * 0.95,
      k: 0.6 + Math.random() * 2.2
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═════════════════════════════════════════════════════════════════════════

  // ── ÖNBELLEKLİ GRADIENT (Kural 1) ────────────────────────────────────────
  // ba.gr verilmişse ONA delege edilir (tek merkezî önbellek). Verilmemişse
  // aynı semantikte YEREL önbellek kullanılır — hiçbir durumda kare başına
  // yeni gradient üretilmez. ⚠ Anahtara hız/zaman gibi HER KARE DEĞİŞEN bir
  // şey KOYMA; koyarsan önbellek anlamsızlaşır ve p99 bozulur.
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

  // ── Kalite geçidi (Kural 3): 0 => o efekt HİÇ çizilmez ───────────────────
  _k(ba, ad) {
    try {
      if (ba && typeof ba.kalite === 'function') {
        const v = ba.kalite(ad);
        return (typeof v === 'number' && isFinite(v)) ? Math.max(0, Math.min(1, v)) : 0;
      }
      // ⚠ Bare global tuzağı: `Kalite` window'da olmayabilir → typeof ile bak.
      if (typeof Kalite !== 'undefined' && Kalite && typeof Kalite.ayar === 'function') {
        const esk = this._ESKI_ANAHTAR[ad] || ad;
        const v2 = Kalite.ayar(esk);
        return (typeof v2 === 'number' && isFinite(v2)) ? Math.max(0, Math.min(1, v2)) : 0;
      }
    } catch (e) {}
    return 0;
  },

  // ── Offscreen tuval üretimi (Kural 6) — TEK giriş noktası, sayılıyor ─────
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
    try { return cv ? cv.getContext('2d') : null; } catch (e) { return null; }
  },

  // ── Bu karenin anlık kopyası (yarı çözünürlük) — kare başına EN FAZLA 1 ──
  _kareGuncel(ctx) {
    if (this._kareTaze) return this._kare;
    if (!this._kare || !this._kareC || !ctx.canvas) return null;
    try {
      // 'copy' => önce clearRect gerekmez (tek geçiş, daha ucuz)
      this._kareC.globalAlpha = 1;
      this._kareC.globalCompositeOperation = 'copy';
      this._kareC.drawImage(ctx.canvas, 0, 0, this._kare.width, this._kare.height);
      this._kareC.globalCompositeOperation = 'source-over';
    } catch (e) { return null; }
    this._kareTaze = true;
    return this._kare;
  },

  // ── Tek renk kanalını izole et ('multiply' ile) — getImageData YOK ───────
  _kanal(kaynak, renk) {
    if (!kaynak || !this._gecici || !this._geciciC) return null;
    const c = this._geciciC, w = this._gecici.width, h = this._gecici.height;
    try {
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'copy';
      c.drawImage(kaynak, 0, 0, w, h);
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = renk;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
    } catch (e) { return null; }
    return this._gecici;
  },

  // ── Blur desteği (bir kez ölçülür); yoksa efektler yumuşamadan çizilir ──
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
    if (!this._blurVar(ctx)) return;
    try { ctx.filter = (px > 0.05) ? ('blur(' + px.toFixed(1) + 'px)') : 'none'; } catch (e) {}
  },

  // ── Efekt merkezi: araç ekranda neredeyse ORASI, yoksa ekran ortası ──────
  // ⚠ `ba.camera` yalnız `worldToScreen` garantiler; başka bir şeye güvenme.
  _merkez(ba, W, H) {
    const v = ba && ba.vehicle;
    const c = ba && ba.camera;
    if (v && c && typeof c.worldToScreen === 'function' &&
        typeof v.x === 'number' && typeof v.y === 'number') {
      try {
        const s = c.worldToScreen(v.x, v.y);
        if (s && isFinite(s.x) && isFinite(s.y)) {
          // Ekran dışına taşarsa efekt merkezi saçmalar → kelepçele.
          return {
            x: Math.max(W * 0.12, Math.min(W * 0.88, s.x)),
            y: Math.max(H * 0.12, Math.min(H * 0.88, s.y))
          };
        }
      } catch (e) {}
    }
    return { x: W * 0.5, y: H * 0.55 };
  },

  // ── Yumuşatma eğrisi (şok dalgası: hızlı başla, yavaş bit) ──────────────
  _yumusa(n) {
    const x = Math.max(0, Math.min(1, n));
    return 1 - Math.pow(1 - x, 2.4);
  },

  // ── Renk yardımcıları ────────────────────────────────────────────────────
  _rgb(hex) {
    const h = String(hex == null ? '' : hex).replace('#', '').trim();
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 255, g: 238, b: 200 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  _karis(hexA, hexB, t) {
    const a = this._rgb(hexA), b = this._rgb(hexB);
    const k = Math.max(0, Math.min(1, t));
    return 'rgb(' + Math.round(a.r + (b.r - a.r) * k) + ',' +
                    Math.round(a.g + (b.g - a.g) * k) + ',' +
                    Math.round(a.b + (b.b - a.b) * k) + ')';
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TEST ALTYAPISI — sahte ctx / sahte bağlam (selfTest + duman betikleri)
  // ═════════════════════════════════════════════════════════════════════════
  _sahteCtx() {
    const say = { save: 0, restore: 0, ciz: 0, gradient: 0, clip: 0 };
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
      arc: function () {},
      rect: function () {},
      clip: function () { say.clip++; },
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      clearRect: function () {},
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
  //   `_radyalBulanik` hiç çizmez. Bu yardımcı olmadan yarı çözünürlüklü yol
  //   selfTest'te SIFIR kapsamda kalırdı (ölçülmeyen kod = bilinmeyen kod).
  //   `_tuvalSayaci`'nı ARTIRMAZ → "tahsis 0" iddiası bozulmadan ölçülebilir.
  _sahteTuval(w, h) {
    const c = this._sahteCtx();
    const k = { width: w, height: h, _say: c._say, getContext: function () { return c; } };
    c.canvas = k;
    return k;
  },
  _sahteTamponKur(W, H) {
    const bw = Math.max(16, Math.round(W / 2));
    const bh = Math.max(16, Math.round(H / 2));
    const geri = {
      iz: this._iz, izC: this._izC, kare: this._kare, kareC: this._kareC,
      gecici: this._gecici, geciciC: this._geciciC, ara: this._ara, araC: this._araC
    };
    this._iz = this._sahteTuval(bw, bh); this._izC = this._iz.getContext('2d');
    this._kare = this._sahteTuval(bw, bh); this._kareC = this._kare.getContext('2d');
    this._gecici = this._sahteTuval(bw, bh); this._geciciC = this._gecici.getContext('2d');
    this._ara = this._sahteTuval(bw, bh); this._araC = this._ara.getContext('2d');
    return geri;
  },
  _sahteTamponGeri(g) {
    if (!g) return;
    this._iz = g.iz; this._izC = g.izC;
    this._kare = g.kare; this._kareC = g.kareC;
    this._gecici = g.gecici; this._geciciC = g.geciciC;
    this._ara = g.ara; this._araC = g.araC;
  },

  _sahteBa(mapId, palet, kaliteDeger, vx, ekstra) {
    const self = this;
    const onbellek = {};
    const sayac = { yeni: 0 };
    const arac = {
      x: 4200, y: 900, vx: (vx == null ? 0 : vx), vy: 0,
      angle: 0.12, onGround: true, width: 120, height: 54,
      boostActive: false
    };
    if (ekstra) for (const k in ekstra) arac[k] = ekstra[k];
    return {
      mapId: mapId,
      palet: palet,
      t: 12.5,
      dt: 0.016,
      vehicle: arac,
      camera: {
        worldToScreen: function (wx, wy) { return { x: (wx - 3900) * 1.15, y: (wy - 700) * 1.15 }; }
      },
      terrain: { getYAt: function (wx) { return 950 + Math.sin(wx * 0.004) * 60; } },
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

  // Test yardımcısı: n kare koştur, ölçüm döndür.
  _kosu(ctx, ba, n) {
    this._sonTestCtx = ctx;
    const bas = ctx._say.ciz;
    for (let i = 0; i < n; i++) {
      ba.t = 10 + i * 0.016;
      this.ciz(ctx, 800, 450, ba);
    }
    return ctx._say.ciz - bas;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — canvas gerektirmez, sahte ctx üzerinde ÖLÇEREK doğrular
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const PAL = { tint: '#7fc24a', pow: 0.10, doy: 1.18, kon: 1.06,
                  bloom: '#fff3c4', sis: '#cfe8ff', gun: '#fff0b0' };

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'hareket') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');

    // 2) Renk yardımcıları
    r.rgbDogru = (function (s) {
      const c = s._rgb('#ff8000'), k = s._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 && k.r === 255 && k.g === 136 && k.b === 0;
    })(this);
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.bozukRenkGuvenli = !!this._rgb('mor-diye-bir-renk') && !!this._rgb(null);

    // 3) Kalite geçidi: 0 => HIZLI araçta bile TEK çizim/gradient olmamalı
    r.kaliteSifirCizmez = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      const ba = s._sahteBa('countryside', PAL, 0, 900);
      s._kosu(ctx, ba, 20);
      return ctx._say.ciz === 0 && ctx._say.gradient === 0 && ba._sayac.yeni === 0;
    })(this);

    // 4) DURAN araç: tam kalitede bile ekrana çizim YOK (Kural 7)
    const duran = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      const ba = s._sahteBa('countryside', PAL, 1, 0);
      const n = s._kosu(ctx, ba, 40);
      return { ciz: n, hiz: s._hiz };
    })(this);
    r.duranAracCizmiyor = duran.ciz === 0 && duran.hiz === 0;

    // 5) HIZLI araç: efektler devrede
    const hizli = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      const ba = s._sahteBa('countryside', PAL, 1, 900);
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const n = s._kosu(ctx, ba, 40);
      return {
        ciz: n, hiz: s._hiz,
        dengeli: ctx._say.save === ctx._say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor'
      };
    })(this);
    r.hizliAracCiziyor = hizli.ciz > 200 && hizli.hiz > 0.8;
    r.saveRestoreDengeli = hizli.dengeli;
    r.durumGeriKonuyor = hizli.alfa && hizli.karisim;
    r.hizFarkiOlculuyor = hizli.ciz > duran.ciz * 10 + 50;

    // 6) Orta hız < yüksek hız (efekt gücü hıza bağlı)
    r.hizaBagli = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const c1 = s._sahteCtx();
      s._kosu(c1, s._sahteBa('countryside', PAL, 1, 300), 40);
      const h1 = s._hiz;
      s._sifirla();
      const c2 = s._sahteCtx();
      s._kosu(c2, s._sahteBa('countryside', PAL, 1, 900), 40);
      return h1 > 0 && h1 < 0.2 && s._hiz > h1 + 0.5;
    })(this);

    // 7) Gradient önbelleği: aynı anahtar iki kez => bir üretim
    r.gradientOnbellek = (function (s) {
      s._grYerel = {}; s._grUretim = 0;
      const sahte = s._sahteCtx();
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createRadialGradient(0, 0, 0, 0, 0, 1); });
      const ilk = s._grUretim;
      s._gr(sahte, null, 'test|1x1', function (c) { return c.createRadialGradient(0, 0, 0, 0, 0, 1); });
      return ilk === 1 && s._grUretim === 1;
    })(this);

    // 8) Kare başına 0 yeni gradient (ısınma sonrası)
    r.kareBasinaSifirGradient = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      const ba = s._sahteBa('neon_city',
        { tint: '#c040e0', bloom: '#ff60ff', sis: '#2a1040', gun: '#a050ff' }, 1, 900,
        { boostActive: true });
      s._kosu(ctx, ba, 6);
      const isinma = ba._sayac.yeni;
      s._kosu(ctx, ba, 30);
      return isinma > 0 && ba._sayac.yeni === isinma;
    })(this);

    // 9) Havuzlar SINIRLI (çizgi + halka) ve tampon sayısı SABİT
    r.cizgiHavuzuSinirli = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      s._kosu(ctx, s._sahteBa('countryside', PAL, 1, 900, { boostActive: true }), 120);
      return s._cizgiler.length === s._CIZGI_MAX && s._halkalar.length === s._HALKA_MAX;
    })(this);
    // 🔴 BUGFIX(30 Tmz · denetim): `_tuvalSayaci` KÜMÜLATİFTİR — `hazir()` her
    //   boyut değişiminde bilinçli olarak 3 YENİ tuval kurar (eskiler GC'ye
    //   bırakılır, bkz. Kural 6). Eski ölçüt MUTLAK değere bakıyordu
    //   (`once <= 3`), bu yüzden ekran BİR KEZ döndükten sonra kontrol kalıcı
    //   olarak KALDI veriyordu. ÖLÇÜLDÜ: taze modülde allPass=true; ardından
    //   `hazir(390,844)` + `hazir(844,390)` (tek ekran dönmesi) → allPass=false.
    //   Sahte alarm; kodda hata YOKTU. Doğru ölçüt DELTA'dır:
    //     · boyut değişince EN FAZLA 4 yeni tuval (_iz/_kare/_gecici/_ara)
    //     · sabit boyutta 60 kare boyunca YENİ TUVAL YOK
    //   (`yeniden === 0` da geçerlidir: `document` olmayan başsız ortamda
    //    `_tuvalYap` null döner ve sayaç hiç artmaz.)
    //   ⚠ 1 Ağu: `_ara` eklendiği için sınır 3 → 4 oldu. Ara tuval KARE BAŞINA
    //     DEĞİL, yalnız boyut değişiminde ayrılır; bu kontrol tam onu kilitler.
    r.tamponSayisiSabit = (function (s) {
      s.hazir(800, 450);
      const oncekiToplam = s._tuvalSayaci;
      s.hazir(801, 451);                     // boyut DEĞİŞTİ → en fazla 4 yeni tuval
      const yeniden = s._tuvalSayaci - oncekiToplam;
      s.hazir(800, 450);
      const once = s._tuvalSayaci;
      const ctx = s._sahteCtx();
      s._kosu(ctx, s._sahteBa('countryside', PAL, 1, 900), 60);
      s.hazir(800, 450);                     // AYNI boyut → yeni tuval OLMAMALI
      return s._tuvalSayaci === once && yeniden <= 4;
    })(this);

    // 15) 🔴 YARI ÇÖZÜNÜRLÜKLÜ RADYAL BULANIKLIK — ÖLÇEREK doğrulanır (1 Ağu)
    //   Kontrol edilen 5 şey (hiçbiri "koda bakarak" değil, SAYARAK):
    //     a) `_ara` tamponu `_kare` ile AYNI (yarı) boyutta
    //     b) 7 geçişin TAMAMI ara tuvale gidiyor (adet 6 + ters yön 1)
    //     c) EKRANA yalnız 1 bindirme gidiyor (eskiden 7 idi)
    //     d) çizim sırasında YENİ TUVAL TAHSİSİ YOK (kare başına 0)
    //     e) ara tuval yokken ESKİ tam çözünürlüklü yola düşülüyor (7 çizim) —
    //        sessizce hiçbir şey çizmemek KABUL EDİLMEZ
    r.radyalYariCozunurluk = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const d = { hiz: 0.9, vx: 900, carpma: 0, nitro: false, dt: 0.016 };
      const ba = s._sahteBa('countryside', PAL, 1, 900);

      // ── e) yedek yol: tampon YOK → ekrana 7 tam çözünürlüklü çizim ──
      const bosGeri = s._sahteTamponKur(800, 450);
      s._ara = null; s._araC = null;                  // ara tuval kasıtlı yok
      const cy = s._sahteCtx(); s._sonTestCtx = cy;
      s._kareTaze = false;
      const y0 = cy._say.ciz;
      s._radyalBulanik(cy, 800, 450, ba, PAL, d);
      const yedekCizim = cy._say.ciz - y0;
      s._sahteTamponGeri(bosGeri);

      // ── a-d) hızlı yol ──
      const geri = s._sahteTamponKur(800, 450);
      const tuvalOnce = s._tuvalSayaci;
      const ctx = s._sahteCtx(); s._sonTestCtx = ctx;
      s._kareTaze = false;
      const a0 = s._araC._say.ciz, e0 = ctx._say.ciz;
      s._radyalBulanik(ctx, 800, 450, ba, PAL, d);
      const araCizim = s._araC._say.ciz - a0;
      const ekranCizim = ctx._say.ciz - e0;
      const boyutOk = (s._ara.width === s._kare.width) && (s._ara.height === s._kare.height);
      const tahsisSifir = (s._tuvalSayaci === tuvalOnce);
      s._sahteTamponGeri(geri);

      return boyutOk && tahsisSifir &&
             araCizim === 7 && ekranCizim === 1 && yedekCizim === 7;
    })(this);

    // 10) Çarpma tespiti: havada yüksek vy → yere iniş
    r.carpmaTetikleniyor = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      const ba = s._sahteBa('countryside', PAL, 1, 500);
      s._sonTestCtx = ctx;
      ba.vehicle.onGround = false;
      ba.vehicle.vy = 1400;
      s.ciz(ctx, 800, 450, ba);
      s.ciz(ctx, 800, 450, ba);
      const oncesi = s._carpma;
      ba.vehicle.onGround = true;
      ba.vehicle.vy = 0;
      s.ciz(ctx, 800, 450, ba);
      const sonrasi = s._carpma;
      // sönüm çalışıyor mu: 40 kare sonra sıfırlanmalı
      for (let i = 0; i < 40; i++) s.ciz(ctx, 800, 450, ba);
      return oncesi === 0 && sonrasi > 0.3 && s._carpma === 0;
    })(this);

    // 11) Nitro yükselen kenarı halka üretir, havuz taşmaz
    r.nitroHalkaUretiyor = (function (s) {
      s.hazir(800, 450); s._sifirla();
      const ctx = s._sahteCtx();
      const ba = s._sahteBa('countryside', PAL, 1, 600);
      s._sonTestCtx = ctx;
      s.ciz(ctx, 800, 450, ba);
      const yok = s._halkalar.filter(function (h) { return h.aktif; }).length;
      for (let i = 0; i < 12; i++) {           // aç/kapa → 6 tetikleme
        ba.vehicle.boostActive = (i % 2 === 0);
        s.ciz(ctx, 800, 450, ba);
      }
      const aktif = s._halkalar.filter(function (h) { return h.aktif; }).length;
      return yok === 0 && aktif > 0 && aktif <= s._HALKA_MAX;
    })(this);

    // 12) Eksik bağlam çökertmemeli
    r.eksikBaglamGuvenli = (function (s) {
      try {
        const ctx = s._sahteCtx();
        s.ciz(ctx, 640, 360, { mapId: 'cave', t: 3, kalite: function () { return 1; } });
        s.ciz(ctx, 640, 360, {});
        s.ciz(ctx, 640, 360, null);
        s.ciz(null, 640, 360, {});
        s.ciz(ctx, 0, 0, {});
        return true;
      } catch (e) { return false; }
    })(this);

    // 13) hazir() boyut değişimini yakalıyor
    r.hazirBoyut = (function (s) {
      s.hazir(400, 300);
      const a = (s.hazir(400, 300) === false);   // aynı boyut → iş yok
      const b = (s.hazir(500, 300) === true);    // değişti → yeniden kur
      s.hazir(800, 450);
      return a && b;
    })(this);

    // 14) Sabitler sözleşmeye uygun (eşik ~260, havuz ≤ 40)
    r.sabitlerUygun = this.ESIK_VX === 260 && this._CIZGI_MAX <= 40 &&
                      this._HALKA_MAX <= 4 && this.ARALIK_VX > 0;

    this._sonTestCtx = null;
    this._sifirla();
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselHareket = GorselHareket;
