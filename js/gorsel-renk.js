'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// GORSEL-RENK — Gelişmiş renk derecelendirme + ton eşleme katmanı (30 Tmz)
//
// NE YAPAR: Sahne çizildikten SONRA, ekran uzayında sinematik renk
// derecelendirmesi uygular. `gorsel.js`'in ve `gorsel-isik.js`'in kardeşidir:
//   · bloom / hız / sis        → gorsel.js
//   · ışık / gölge / güneş     → gorsel-isik.js
//   · TON EĞRİSİ ve RENK       → BURASI
// Çizim koduna hiç dokunmaz, `ba` bağlamından beslenir.
//
// EFEKTLER (sırayla uygulanır, hepsi ayrı kalite anahtarıyla geçitli):
//   1. tonEsleme     — ACES benzeri filmsel ton eşleme (parlak sıkıştır + gölge kaldır)
//   2. kontrastEgri  — gerçek S-eğrisi kontrast + dikey sinematik gradyan
//   3. biyomKimlik   — 51 haritanın her birine ayrı renk kimliği (tint + pow)
//   4. bolunmusTon   — split-tone: gölge SOĞUK, parlaklık SICAK (paletten türer)
//   5. doygunluk     — `palet.doy` değerini uygulayan `saturation` katmanı
//   6. gunDongusu    — şafak → gündüz → alacakaranlık → gece renk kayması
//   7. hizTonu       — hızlandıkça soğuk + doymuş ton kayması
//   8. vinyetRenkli  — nötr siyah değil, palet rengiyle tonlanmış vinyet
//
// ── DIŞ DÜNYA SÖZLEŞMESİ ──────────────────────────────────────────────────
// Bare global'e GÜVENİLMEZ (Game/Terrain/Camera `window`'da DEĞİL —
// CLAUDE.md "Kritik teknik tuzaklar"). Her şey `ba` bağlamından gelir:
//   ba.mapId · ba.palet{tint,pow,doy,kon,bloom,sis,gun} · ba.vehicle · ba.camera
//   ba.terrain · ba.t · ba.dt · ba.kalite(ad) · ba.gr(anahtar, uretici)
//
// 🔴 PERFORMANS + GÜVENLİK KURALLARI
//   1. `createLinearGradient`/`createRadialGradient` DOĞRUDAN ÇAĞRILMAZ.
//      Hepsi `_gr()` → `ba.gr()` önbelleğinden geçer. Üstelik gradientler
//      İLK KAREDE ön-ısıtılır (`_onIsit`): oyuncu hızlanınca ortada yeni
//      gradient doğup takılma yapmaz. Kare 2'den sonra üretim = 0.
//   2. `getImageData`/`putImageData` YOK. Tüm derecelendirme
//      `globalCompositeOperation` karışım modlarıyla yapılır (GPU).
//   3. Her efekt `ba.kalite('...')` ile geçitli; 0 dönerse TEK BİR çizim
//      çağrısı bile yapılmaz (selfTest bunu sayarak doğrular).
//   4. Her efekt kendi try/catch'inde — biri patlarsa diğerleri çizilir.
//   5. `globalAlpha` / `globalCompositeOperation` / `filter` geri konur.
//
// 🔴 OKUNABİLİRLİK GÜVENCESİ (bu dosyanın ayırt edici parçası)
//   Karışım modlarının sonucu ANALİTİK OLARAK SİMÜLE EDİLİR (`_sim`): aynı
//   katman listesi 5 gri örnek üzerinde W3C karışım formülleriyle çalıştırılır.
//   Beyaz metin çok kararıyor, orta ton çok kayıyor ya da eğri tersine
//   dönüyorsa TÜM katman alfaları topluca kısılır (`_koruma`). Yani HUD'un
//   okunabilirliği "göz kararı" değil, ÖLÇÜLMÜŞ bir kısıttır ve selfTest
//   bunu 51 harita × 4 gün evresinde doğrular.
//   ⚠ Bu yüzden ekrana çizilen her katman ÖNCE listeye kurulur, SONRA çizilir.
//      Yeni efekt eklerken doğrudan `ctx.fillRect` YAZMA — `_ekle()` kullan,
//      yoksa koruma o katmanı göremez.
// ═══════════════════════════════════════════════════════════════════════════
const GorselRenk = {
  ad: 'renk',

  // Çizim + kalite anahtarı sırası (vinyet EN SONDA olmalı).
  EFEKTLER: [
    'tonEsleme', 'kontrastEgri', 'biyomKimlik', 'bolunmusTon',
    'doygunluk', 'gunDongusu', 'hizTonu', 'vinyetRenkli'
  ],

  // `ba.kalite` verilmediyse GLOBAL `Kalite`ye düşülür; oradaki tablo bu yeni
  // anahtarları bilmiyor (kalite.js'e DOKUNULMADI) → eski anahtarlara eşlenir.
  // ⚠ `ba.kalite` her zaman ÖNCELİKLİDİR; konak bu eşlemeyi ezebilir.
  ESLEME: {
    tonEsleme: 'grade', kontrastEgri: 'grade', biyomKimlik: 'grade',
    bolunmusTon: 'grade', doygunluk: 'grade', gunDongusu: 'grade',
    hizTonu: 'hizBulaniklik', vinyetRenkli: 'vignette'
  },

  // ── iç durum ─────────────────────────────────────────────────────────────
  _W: 0,
  _H: 0,
  _hazirlandi: false,
  _onIsitildi: false,
  _grYerel: {},            // ba.gr yoksa kullanılan yedek gradient önbelleği
  _grUretim: 0,            // ölçüm: yedek önbellekte kaç YENİ gradient üretildi
  _rgbOnbellek: {},        // hex → [r,g,b] (0..1)
  _turetOnbellek: {},      // palet → türetilmiş renkler (harita başına 1 kez)
  _korumaOnbellek: {},     // durum anahtarı → güvenlik çarpanı
  _korumaSayi: 0,
  _havuz: [],              // katman nesnesi havuzu (kare başına çöp üretmez)
  _sayi: 0,
  _sonVx: 0,
  _vxIlk: true,
  _dur: { hiz: 0, evre: null, W: 0, H: 0 },
  _evC: { v: [0, 0, 0], s: '' },   // gün döngüsü çarpım rengi (kare başına tazelenir)
  _evT: { v: [0, 0, 0], s: '' },   // gün döngüsü tarama (screen) rengi

  _VARSAYILAN_PALET: {
    tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08,
    bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0'
  },

  // ── GÜN DÖNGÜSÜ EVRELERİ ─────────────────────────────────────────────────
  // `carp` = multiply rengi (parlaklığa oturur), `tara` = screen rengi
  // (gölgeye oturur). İkisi birlikte gerçek bir "gün ışığı sıcaklığı" verir.
  // ⚠ Hız `gorsel-isik.js` ile AYNI (0.0175 rad/sn ≈ 6 dk tam tur) — ışık ve
  //   renk aynı saati göstermezse sahne kendisiyle çelişir.
  GUN_HIZI: 0.0175,
  GUN_EVRELERI: [
    { ad: 'safak',          carp: '#ffd2a8', tara: '#331606', guc: 0.85 },
    { ad: 'gunduz',         carp: '#fffaf0', tara: '#0c1018', guc: 0.32 },
    { ad: 'alacakaranlik',  carp: '#e2b8ea', tara: '#2a0f38', guc: 0.78 },
    { ad: 'gece',           carp: '#9fb4e0', tara: '#050c22', guc: 1.00 }
  ],

  // ── Hız eşiği (gorsel.js ile aynı: 260'tan sonra başlar) ────────────────
  HIZ_ESIK: 260,
  HIZ_ARALIK: 620,

  // Okunabilirlik kısıtları — bu değerler AŞILIRSA katmanlar topluca kısılır.
  KORUMA: {
    beyazEnAz: 0.62,    // beyaz HUD metni bu parlaklığın altına DÜŞMEZ
    siyahEnCok: 0.52,   // siyah gölgeler bu kadar yıkanabilir
    ortaSapma: 0.20,    // orta ton 0.5'ten bu kadar kayabilir
    // BUGFIX(30 Tmz) — RENK KAYMASI SINIRI.
    // Eski koruma yalnız GRİ örneklerde PARLAKLIK ölçüyordu (`_PROB` hepsi gri,
    // `_okunur` yalnız `_lum` bakıyordu). Griyi bozmadan HUE'yu kaydıran bir
    // derecelendirme zinciri bu testlerin HEPSİNDEN geçiyordu.
    // ÖLÇÜLDÜ (countryside, ULTRA, canlı tuval): gökyüzü mavisi
    //   GorselRenk kapalı [142,192,202] → açık [130,177,154]
    //   = mavinin %24'ü siliniyor, gök yeşile dönüyor.
    // Griyle yakalanamaz; bu yüzden DOYGUN referans renkler eklendi.
    renkKayma: 0.10     // parlaklığa göre normalize kanal oranı bu kadar kayabilir
  },
  _KORUMA_ADIM: [1, 0.88, 0.76, 0.64, 0.52, 0.40, 0.28, 0.16, 0.06],
  _PROB: [0.02, 0.20, 0.50, 0.78, 0.97],
  // Doygun referanslar — hue kaymasını yakalamak için (gri bunu göremez).
  // gök mavisi · çim yeşili · araç kırmızısı · kum sarısı · ten/turuncu
  _RENK_PROB: [
    [0.43, 0.70, 0.90],
    [0.32, 0.62, 0.24],
    [0.78, 0.20, 0.18],
    [0.86, 0.74, 0.42],
    [0.90, 0.55, 0.30]
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
    // Ekran uzayı gradientleri boyuta bağlıdır → yedek önbelleği boşalt.
    this._grYerel = {};
    this._grUretim = 0;
    this._onIsitildi = false;
    this._korumaOnbellek = {};
    this._korumaSayi = 0;
    this._vxIlk = true;
    return true;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ANA ÇİZİM — dünya dönüşümü KAPALI, ekran uzayında çalışır
  // ═════════════════════════════════════════════════════════════════════════
  ciz(ctx, W, H, ba) {
    if (!ctx || !(W > 0) || !(H > 0)) return;
    ba = ba || {};
    const p = this._paletDuzelt(ba.palet);
    if (!this._hazirlandi || this._W !== Math.round(W) || this._H !== Math.round(H)) {
      this.hazir(W, H);
    }

    const d = this._turet(p);
    const dur = this._dur;
    dur.W = W;
    dur.H = H;
    dur.evre = this._evre(ba.t || 0);
    dur.hiz = this._hizOku(ba);

    // 1) KATMANLARI KUR (çizim yok — yalnız tanım). Her efekt ayrı try/catch.
    this._kur(ba, p, d, dur);

    // 2) OKUNABİLİRLİK KORUMASI — katmanların TOPLAM etkisi ölçülür.
    const kf = this._koruma(ba, p, dur);

    // 3) ÇİZ — efekt efekt, her biri kendi try/catch'inde.
    const eskiAlfa = ctx.globalAlpha;
    const eskiKarisim = ctx.globalCompositeOperation;
    // Gradientler ilk karede toptan üretilir; sonraki karelerde üretim = 0.
    try { this._onIsit(ctx, W, H, ba, d); } catch (e) {}
    for (let gi = 0; gi < this.EFEKTLER.length; gi++) {
      const ad = this.EFEKTLER[gi];
      try {
        for (let i = 0; i < this._sayi; i++) {
          const L = this._havuz[i];
          if (L.grup === ad) this._cizKatman(ctx, W, H, ba, L, kf);
        }
      } catch (e) {}
    }

    // 4) Durumu her hâlükârda geri koy (bir efekt yarıda patlasa bile).
    ctx.globalAlpha = eskiAlfa;
    ctx.globalCompositeOperation = eskiKarisim;
    try { ctx.filter = 'none'; } catch (e) {}
  },

  // ── Katman listesini kur (çizim YOK) ─────────────────────────────────────
  _kur(ba, p, d, dur) {
    this._sayi = 0;
    try { this._katTon(ba, p, d, dur); } catch (e) {}
    try { this._katKontrast(ba, p, d, dur); } catch (e) {}
    try { this._katKimlik(ba, p, d, dur); } catch (e) {}
    try { this._katSplit(ba, p, d, dur); } catch (e) {}
    try { this._katDoygunluk(ba, p, d, dur); } catch (e) {}
    try { this._katGun(ba, p, d, dur); } catch (e) {}
    try { this._katHiz(ba, p, d, dur); } catch (e) {}
    try { this._katVinyet(ba, p, d, dur); } catch (e) {}
    return this._sayi;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 1) TON EŞLEME — ACES benzeri filmsel eğri, üç karışım katmanıyla
  //
  // Matematik (Cb = arka plan, a = alfa, cs = kaynak):
  //   · multiply(cs≈0.88, a) → Cr = Cb·(1−a(1−cs))   ⇒ TAM BEYAZ en çok düşer
  //                                                     = parlaklık sıkışması
  //   · screen(cs koyu, a)   → Cr = Cb + a·cs·(1−Cb)  ⇒ TAM SİYAH en çok kalkar
  //                                                     = gölge kaldırma (lift)
  //   · overlay(cs≈0.53, a)  → 0.5 altında eğim 2cs, üstünde 2(1−cs)
  //                            ⇒ omuz (shoulder): üst uçta eğim düşer
  // Üçü birlikte ACES'in karakterini verir: beyaz 1.0 → ~0.90, siyah 0 → ~0.04,
  // orta ton neredeyse yerinde (HUD okunabilirliği bozulmaz).
  // ⚠ Sabitler `selfTest.tonEgrisi` ile KİLİTLİ — değiştirirsen test düşer.
  // ═════════════════════════════════════════════════════════════════════════
  _katTon(ba, p, d, dur) {
    const g = this._k(ba, 'tonEsleme');
    if (g <= 0) return;
    this._ekle('tonEsleme', 'multiply', d.tonKazanc, 0.55 * g, false, null, false);
    this._ekle('tonEsleme', 'screen',   d.tonLift,   0.55 * g, false, null, false);
    this._ekle('tonEsleme', 'overlay',  d.tonOmuz,   0.50 * g, false, null, false);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 2) KONTRAST — GERÇEK S-EĞRİSİ + dikey sinematik gradyan
  //
  // 🔴 İnce nokta: `overlay` modunda KAYNAK olarak sahnenin KENDİSİ çizilirse
  //    (drawImage(ctx.canvas)) sonuç overlay(x,x) olur:
  //        x ≤ 0.5 → 2x²        x > 0.5 → 1 − 2(1−x)²
  //    Bu, tam olarak klasik kontrast S-eğrisidir (uçlarda eğim 0, ortada 2).
  //    getImageData GEREKMEZ, GPU'da tek geçiş. Katman `kendi:true` ile
  //    işaretlenir; simülatör de aynı formülü kullanır, yani koruma bunu görür.
  // İkinci katman ekranın üstünü açıp altını koyultan dikey gradyandır
  // (gökyüzü/zemin ayrımı). Uçları yumuşak: orta bölge tamamen nötrdür.
  // ═════════════════════════════════════════════════════════════════════════
  _katKontrast(ba, p, d, dur) {
    const g = this._k(ba, 'kontrastEgri');
    if (g <= 0) return;
    const kon = Math.max(0.5, Math.min(2, p.kon));
    this._ekle('kontrastEgri', 'overlay', null,
      Math.min(0.45, (kon - 1) * 2.2) * g, true, null, false);
    this._ekle('kontrastEgri', 'overlay', d.notr,
      Math.min(0.26, (kon - 1) * 1.6) * g, false, 'kontrast', true);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 3) BİYOM KİMLİĞİ — 51 haritanın her biri AYRI hissetmeli
  //
  // Üç katman birlikte "bu harita bu renktir" duygusunu verir:
  //   a) multiply(tint→beyaza %72 karışmış) — parlaklığa oturan biyom dökümü
  //   b) soft-light(tint)                   — orta tonlara oturan karakter
  //   c) hue(tint)                          — ton açısını biyoma çeker
  //      (`hue` parlaklığı KORUR: setLum(…, Lum(Cb)) — bu yüzden okunabilirlik
  //       bozulmadan renk kimliği güçlenir; düşük alfada yeterlidir.)
  // Etki gücü `palet.pow` ile ölçeklenir → çöl 0.18, neon 0.30, mağara 0.34.
  // ⚠ selfTest 51 haritanın nötr gri üzerindeki çıktısının FARKLI olduğunu
  //   sayarak doğrular ("hepsi farklı hissettirir" iddiası ölçülür).
  // ═════════════════════════════════════════════════════════════════════════
  _katKimlik(ba, p, d, dur) {
    const g = this._k(ba, 'biyomKimlik');
    if (g <= 0) return;
    const pow = Math.max(0, Math.min(0.6, p.pow));
    this._ekle('biyomKimlik', 'multiply',   d.kimlikCarp, Math.min(0.50, pow * 1.60) * g, false, null, false);
    this._ekle('biyomKimlik', 'soft-light', d.tint,       Math.min(0.55, pow * 1.80) * g, false, null, false);
    this._ekle('biyomKimlik', 'hue',        d.tintDoygun, Math.min(0.22, pow * 0.50) * g, false, null, false);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 4) BÖLÜNMÜŞ TON (split-tone) — gölge SOĞUK, parlaklık SICAK
  //
  // Neden bu iki mod: türev alınca hangi bölgeye vurduğu netleşir.
  //   multiply → Δ(r−b) = a·Cb·(cs_r − cs_b)     ⇒ Cb ile büyür  = PARLAKLIK
  //   screen   → Δ(r−b) = a·(1−Cb)·(cs_r − cs_b) ⇒ Cb ile küçülür = GÖLGE
  // Renkler PALETTEN türer ama yön GARANTİ ALTINA alınır:
  //   parlak renk = karis(palet.gun, sıcak referans) → her zaman r > b
  //   gölge rengi = karis(palet.sis, soğuk referans) → her zaman b > r
  // (Kutup gibi soğuk paletlerde `gun` mavidir; ham hâliyle kullanılsaydı
  //  "parlaklara sıcak" iddiası 51 haritanın bir kısmında YANLIŞ olurdu.)
  // ⚠ selfTest bunu 51 haritanın HEPSİNDE ölçerek doğrular.
  // ═════════════════════════════════════════════════════════════════════════
  _katSplit(ba, p, d, dur) {
    const g = this._k(ba, 'bolunmusTon');
    if (g <= 0) return;
    this._ekle('bolunmusTon', 'multiply', d.parlakSicak, 0.28 * g, false, null, false);
    this._ekle('bolunmusTon', 'screen',   d.golgeSoguk,  0.30 * g, false, null, false);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 5) DOYGUNLUK — `saturation` karışım modu
  //
  // W3C: saturation → SetLum(SetSat(Cb, Sat(Cs)), Lum(Cb))
  //   yani KAYNAĞIN doygunluğu, ARKA PLANIN ton + parlaklığı.
  //   · palet.doy > 1 → kaynak TAM DOYGUN renk  ⇒ doygunluk yukarı çekilir
  //   · palet.doy < 1 → kaynak NÖTR GRİ (sat 0) ⇒ doygunluk aşağı çekilir
  // Parlaklık her iki hâlde de KORUNUR (Lum(Cb)) → HUD kararmaz.
  // ═════════════════════════════════════════════════════════════════════════
  _katDoygunluk(ba, p, d, dur) {
    const g = this._k(ba, 'doygunluk');
    if (g <= 0) return;
    const doy = Math.max(0.2, Math.min(2, p.doy));
    const a = (doy >= 1)
      ? Math.min(0.42, (doy - 1) * 0.85)
      : Math.min(0.42, (1 - doy) * 1.10);
    this._ekle('doygunluk', 'saturation', (doy >= 1 ? d.tintDoygun : d.notr), a * g, false, null, false);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 6) GÜN DÖNGÜSÜ — şafak → gündüz → alacakaranlık → gece
  //
  // Evreler arası geçiş smoothstep ile yumuşatılır; renkler KARE BAŞINA
  // değiştiği için bu efekt GRADIENT KULLANMAZ (düz dolgu) — yoksa her karede
  // yeni gradient doğardı (§8B.27/B5 tuzağı).
  // Gece bilinçli olarak "koyu ama okunur": çarpım rengi 0.62 parlaklığın
  // altına inmez, üstelik koruma katmanı ayrıca ölçer.
  // ═════════════════════════════════════════════════════════════════════════
  _katGun(ba, p, d, dur) {
    const g = this._k(ba, 'gunDongusu');
    if (g <= 0) return;
    const ev = dur.evre;
    this._ekle('gunDongusu', 'multiply', this._evC, 0.30 * ev.guc * g, false, null, false);
    this._ekle('gunDongusu', 'screen',   this._evT, 0.30 * ev.guc * g, false, null, false);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 7) HIZ TONU — hızlandıkça soğuk + doymuş
  //
  // Üç katman: soğuk `screen` (gölgeler maviye kayar), `saturation` yükseltme,
  // ve kenarlara oturan soğuk radyal gradyan (tünel hissi).
  // ⚠ Gradient RENGİ hıza bağlı DEĞİL (palete bağlı) — hıza bağlı olan yalnız
  //   `globalAlpha`. Böylece hız değiştikçe yeni gradient üretilmez.
  // ═════════════════════════════════════════════════════════════════════════
  _katHiz(ba, p, d, dur) {
    const g = this._k(ba, 'hizTonu');
    if (g <= 0) return;
    const h = dur.hiz;
    if (h <= 0.01) return;
    this._ekle('hizTonu', 'screen',     d.hizSoguk,  0.20 * h * g, false, null, false);
    this._ekle('hizTonu', 'saturation', d.hizDoygun, 0.26 * h * g, false, null, false);
    this._ekle('hizTonu', 'screen',     d.hizSoguk,  0.30 * h * g, false, 'hiz', true);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // 8) RENKLİ VİNYET — nötr siyah DEĞİL, palet rengine boyanmış
  //
  // `multiply` modunda köşelere doğru koyulaşan palet rengi: köşeler yalnız
  // kararmaz, biyomun rengine de bürünür (mağarada lacivert, çölde kum).
  // ⚠ Alfa SERT TAVANLI (0.42) ve koruma ölçümünün DIŞINDA (`disari:true`):
  //   vinyet ekran kenarındadır, orta bölgedeki HUD ölçümünü temsil etmez.
  //   Bu yüzden güvenliği tavanla sağlanır, ölçümle değil.
  // ═════════════════════════════════════════════════════════════════════════
  _katVinyet(ba, p, d, dur) {
    const g = this._k(ba, 'vinyetRenkli');
    if (g <= 0) return;
    this._ekle('vinyetRenkli', 'multiply', d.vinyet, Math.min(0.42, 0.42 * g), false, 'vinyet', true);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KATMAN HAVUZU — kare başına çöp üretmez (§8B.27 bellek notu)
  // ═════════════════════════════════════════════════════════════════════════
  _ekle(grup, mod, renk, a, kendi, grad, disari) {
    if (!(a > 0.002)) return null;
    let L = this._havuz[this._sayi];
    if (!L) {
      L = { grup: '', mod: '', renk: null, a: 0, kendi: false, grad: null, disari: false };
      this._havuz[this._sayi] = L;
    }
    L.grup = grup;
    L.mod = mod;
    L.renk = renk;
    L.a = Math.min(1, a);
    L.kendi = !!kendi;
    L.grad = grad || null;
    L.disari = !!disari;
    this._sayi++;
    return L;
  },

  // ── Tek katmanı çiz ──────────────────────────────────────────────────────
  _cizKatman(ctx, W, H, ba, L, kf) {
    const a = L.a * kf;
    if (!(a > 0.002)) return;
    ctx.globalCompositeOperation = L.mod;
    ctx.globalAlpha = Math.min(1, a);
    if (L.kendi) {
      // Sahnenin kendisini kaynak olarak kullan (S-eğrisi). getImageData YOK.
      if (ctx.canvas) ctx.drawImage(ctx.canvas, 0, 0, W, H);
      return;
    }
    if (L.grad) {
      const g = this._gradient(ctx, ba, W, H, L.grad);
      if (!g) return;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    ctx.fillStyle = L.renk.s || this._css(L.renk.v);
    ctx.fillRect(0, 0, W, H);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GRADIENTLER — üçü de ÖNBELLEKLİ ve renkleri ZAMANA/HIZA BAĞLI DEĞİL
  // ═════════════════════════════════════════════════════════════════════════
  _gradient(ctx, ba, W, H, tip) {
    const d = this._sonTuret;
    if (!d) return null;
    if (tip === 'kontrast') return this._grKontrast(ctx, ba, W, H);
    if (tip === 'vinyet') return this._grVinyet(ctx, ba, W, H, d);
    if (tip === 'hiz') return this._grHiz(ctx, ba, W, H, d);
    return null;
  },

  _grKontrast(ctx, ba, W, H) {
    return this._gr(ctx, ba, 'renk-kontrast|' + W + 'x' + H, function (c) {
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0.00, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.40, 'rgba(128,128,128,0.00)');
      gr.addColorStop(0.60, 'rgba(128,128,128,0.00)');
      gr.addColorStop(1.00, 'rgba(0,0,0,0.55)');
      return gr;
    });
  },

  _grVinyet(ctx, ba, W, H, d) {
    const renk = d.vinyet.v;
    const self = this;
    return this._gr(ctx, ba, 'renk-vinyet|' + W + 'x' + H + '|' + d.anahtar, function (c) {
      const gr = c.createRadialGradient(
        W * 0.5, H * 0.5, Math.min(W, H) * 0.36,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      gr.addColorStop(0.0, self._cssA([1, 1, 1], 1));       // multiply'da nötr
      gr.addColorStop(0.55, self._cssA(self._karisN(renk, [1, 1, 1], 0.55), 1));
      gr.addColorStop(1.0, self._cssA(renk, 1));
      return gr;
    });
  },

  _grHiz(ctx, ba, W, H, d) {
    const renk = d.hizSoguk.v;
    const self = this;
    return this._gr(ctx, ba, 'renk-hiz|' + W + 'x' + H + '|' + d.anahtar, function (c) {
      const gr = c.createRadialGradient(
        W * 0.5, H * 0.55, Math.min(W, H) * 0.22,
        W * 0.5, H * 0.55, Math.max(W, H) * 0.72);
      gr.addColorStop(0.0, self._cssA(renk, 0));
      gr.addColorStop(0.6, self._cssA(renk, 0.22));
      gr.addColorStop(1.0, self._cssA(renk, 0.85));
      return gr;
    });
  },

  // ── ÖN-ISITMA: tüm gradientler İLK karede üretilir ──────────────────────
  // Aksi hâlde oyuncu 260 birim hızı ilk kez geçtiği anda yeni gradient doğar
  // ve o karede takılma olur. Kalitesi 0 olan efektin gradienti ÜRETİLMEZ.
  _onIsit(ctx, W, H, ba, d) {
    if (this._onIsitildi) return;
    this._onIsitildi = true;
    if (this._k(ba, 'kontrastEgri') > 0) this._grKontrast(ctx, ba, W, H);
    if (this._k(ba, 'hizTonu') > 0) this._grHiz(ctx, ba, W, H, d);
    if (this._k(ba, 'vinyetRenkli') > 0) this._grVinyet(ctx, ba, W, H, d);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // OKUNABİLİRLİK KORUMASI — katmanların TOPLAM etkisini ölçer
  // ═════════════════════════════════════════════════════════════════════════
  // Sonuç harita + gün evresi + hız + kalite kovasına göre önbelleklenir;
  // tipik karede tek bir sözlük araması yapılır.
  _koruma(ba, p, dur) {
    const anahtar = (ba.mapId || '?') + '|' + Math.floor(dur.evre.u * 72) +
                    '|' + Math.round(dur.hiz * 8) + '|' + this._kaliteKovasi(ba);
    const v = this._korumaOnbellek[anahtar];
    if (v !== undefined) return v;
    let k = 0.06;
    for (let i = 0; i < this._KORUMA_ADIM.length; i++) {
      if (this._okunur(this._KORUMA_ADIM[i])) { k = this._KORUMA_ADIM[i]; break; }
    }
    // ⚠ Önbellek SINIRSIZ büyümemeli (§8B.27'deki iki sızıntının aynısı):
    //   anahtar uzayı harita × 72 evre × 9 hız kovası. Tavana gelirse boşalt.
    if (this._korumaSayi > 512) { this._korumaOnbellek = {}; this._korumaSayi = 0; }
    this._korumaOnbellek[anahtar] = k;
    this._korumaSayi++;
    return k;
  },

  // Katman zincirini 5 gri örnek üzerinde çalıştırıp kısıtları dener.
  _okunur(kf) {
    const P = this._PROB;
    let onceki = -1;
    let sonuc = true;
    for (let i = 0; i < P.length; i++) {
      const c = this._sim([P[i], P[i], P[i]], kf, null);
      const l = this._lum(c);
      if (!isFinite(l)) return false;
      if (l <= onceki) sonuc = false;              // eğri MONOTON kalmalı
      onceki = l;
      if (i === 0 && l > this.KORUMA.siyahEnCok) sonuc = false;
      if (i === 2 && Math.abs(l - 0.5) > this.KORUMA.ortaSapma) sonuc = false;
      if (i === P.length - 1 && l < this.KORUMA.beyazEnAz) sonuc = false;
    }
    // BUGFIX(30 Tmz) — RENK KAYMASI KISITI (yukarıdaki döngü GRİ, bu DOYGUN).
    // Gri örnekler hue kaymasını GÖREMEZ: r=g=b iken bir yeşil tint gri'yi
    // yalnız parlaklıkta oynatır, testler geçer, ama gökyüzü yeşile döner.
    // ⚠ Parlaklığa NORMALİZE oran karşılaştırılır — böylece kısıt yalnız RENK
    //   kaymasını cezalandırır, meşru parlaklık/kontrast işini engellemez.
    const RP = this._RENK_PROB;
    const sinir = this.KORUMA.renkKayma;
    for (let i = 0; i < RP.length && sonuc; i++) {
      const c0 = RP[i];
      const c1 = this._sim([c0[0], c0[1], c0[2]], kf, null);
      const l0 = this._lum(c0), l1 = this._lum(c1);
      if (!isFinite(l1)) return false;
      // Siyaha çok yakınsa oran gürültülüdür — atla (0'a bölme koruması).
      if (l0 < 0.02 || l1 < 0.02) continue;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(c1[k] / l1 - c0[k] / l0) > sinir) { sonuc = false; break; }
      }
    }
    return sonuc;
  },

  // ── Katman zincirinin ANALİTİK simülasyonu ──────────────────────────────
  // `disari:true` katmanlar (vinyet, dikey gradyan) ekran kenarına özgüdür;
  // orta bölgedeki HUD'u temsil etmez → simülasyona GİRMEZ.
  _sim(c0, kf, filtre) {
    let c = [c0[0], c0[1], c0[2]];
    for (let i = 0; i < this._sayi; i++) {
      const L = this._havuz[i];
      if (L.disari) continue;
      if (filtre && !filtre[L.grup]) continue;
      const a = Math.min(1, L.a * (kf === undefined || kf === null ? 1 : kf));
      if (!(a > 0.002)) continue;
      const kaynak = L.kendi ? c : L.renk.v;
      c = this._karistir(c, kaynak, L.mod, a);
    }
    return c;
  },

  _kaliteKovasi(ba) {
    let s = 0;
    for (let i = 0; i < this.EFEKTLER.length; i++) s += this._k(ba, this.EFEKTLER[i]);
    return Math.round(s * 10);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // KARIŞIM MATEMATİĞİ — W3C Compositing 1 (canvas ile birebir aynı formüller)
  // ═════════════════════════════════════════════════════════════════════════
  _AYRIK: {
    'source-over': function (b, s) { return s; },
    'multiply':    function (b, s) { return b * s; },
    'screen':      function (b, s) { return b + s - b * s; },
    'overlay':     function (b, s) { return b <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s); },
    'hard-light':  function (b, s) { return s <= 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s); },
    'soft-light':  function (b, s) {
      if (s <= 0.5) return b - (1 - 2 * s) * b * (1 - b);
      const dd = (b <= 0.25) ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
      return b + (2 * s - 1) * (dd - b);
    },
    'color-dodge': function (b, s) { if (b <= 0) return 0; if (s >= 1) return 1; return Math.min(1, b / (1 - s)); },
    'color-burn':  function (b, s) { if (b >= 1) return 1; if (s <= 0) return 0; return 1 - Math.min(1, (1 - b) / s); },
    'darken':      function (b, s) { return Math.min(b, s); },
    'lighten':     function (b, s) { return Math.max(b, s); }
  },

  _karistir(cb, cs, mod, a) {
    const f = this._AYRIK[mod];
    let B;
    if (f) {
      B = [f(cb[0], cs[0]), f(cb[1], cs[1]), f(cb[2], cs[2])];
    } else if (mod === 'lighter') {
      B = [Math.min(1, cb[0] + cs[0]), Math.min(1, cb[1] + cs[1]), Math.min(1, cb[2] + cs[2])];
    } else if (mod === 'hue') {
      B = this._setLum(this._setSat(cs, this._sat(cb)), this._lum(cb));
    } else if (mod === 'saturation') {
      B = this._setLum(this._setSat(cb, this._sat(cs)), this._lum(cb));
    } else if (mod === 'color') {
      B = this._setLum([cs[0], cs[1], cs[2]], this._lum(cb));
    } else if (mod === 'luminosity') {
      B = this._setLum([cb[0], cb[1], cb[2]], this._lum(cs));
    } else {
      B = [cs[0], cs[1], cs[2]];
    }
    return [
      this._sik(cb[0] + a * (B[0] - cb[0])),
      this._sik(cb[1] + a * (B[1] - cb[1])),
      this._sik(cb[2] + a * (B[2] - cb[2]))
    ];
  },

  // ── Ayrık olmayan modların yardımcıları (W3C sözde kodu birebir) ────────
  _lum(c) { return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; },
  _sat(c) { return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]); },
  _kirp(c) {
    const l = this._lum(c);
    const n = Math.min(c[0], c[1], c[2]);
    const x = Math.max(c[0], c[1], c[2]);
    if (n < 0 && l !== n) {
      for (let i = 0; i < 3; i++) c[i] = l + (c[i] - l) * l / (l - n);
    }
    if (x > 1 && x !== l) {
      for (let i = 0; i < 3; i++) c[i] = l + (c[i] - l) * (1 - l) / (x - l);
    }
    return c;
  },
  _setLum(c, l) {
    const d = l - this._lum(c);
    return this._kirp([c[0] + d, c[1] + d, c[2] + d]);
  },
  _setSat(c, s) {
    let mi = 0, ma = 0;
    for (let i = 1; i < 3; i++) {
      if (c[i] < c[mi]) mi = i;
      if (c[i] > c[ma]) ma = i;
    }
    if (c[ma] <= c[mi]) return [0, 0, 0];      // tüm kanallar eşit → doygunluk 0
    const md = 3 - mi - ma;
    const r = [0, 0, 0];
    r[md] = (c[md] - c[mi]) * s / (c[ma] - c[mi]);
    r[ma] = s;
    r[mi] = 0;
    return r;
  },
  _sik(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); },

  // ═════════════════════════════════════════════════════════════════════════
  // PALETTEN RENK TÜRETME — harita başına BİR KEZ
  // ═════════════════════════════════════════════════════════════════════════
  _turet(p) {
    const anahtar = p.tint + '|' + p.gun + '|' + p.sis + '|' + p.bloom + '|' +
                    p.pow + '|' + p.doy + '|' + p.kon;
    let d = this._turetOnbellek[anahtar];
    if (d) { this._sonTuret = d; return d; }

    const tint = this._rgbN(p.tint);
    const gun = this._rgbN(p.gun);
    const sis = this._rgbN(p.sis);
    const AK = [1, 1, 1], KARA = [0, 0, 0];
    // Referans uçlar: split-tone yönünü 51 haritanın HEPSİNDE garantiler.
    const SICAK = this._rgbN('#ffd8a0');
    const SOGUK = this._rgbN('#5878c8');
    const HIZ_MAVI = this._rgbN('#3aa8ff');

    // 🔴 ÖLÇÜLDÜ (30 Tmz): yalnız karıştırmak YETMİYOR. Ham hâlde 51 haritanın
    //    30'unda yön TERSİNE dönüyordu — `cave/underwater/neon_city/cyber_grid`
    //    gibi SOĞUK `gun` paletlerinde parlaklık ısınmıyor, `desert/mars/volcano`
    //    gibi SICAK `sis` paletlerinde gölge soğumuyordu. Bu yüzden karışımdan
    //    sonra yön AÇIKÇA GARANTİ ALTINA alınır (`_yonGaranti`).
    //    Eşikler keyfî değil: `multiply` katkısı ~0.238·pd, `screen` katkısı
    //    ~0.264·gd; test toleransı 0.004 → pd ≥ 0.06 ve gd ≥ 0.085 güvenli.
    const parlak = this._yonGaranti(this._karisN(this._karisN(gun, SICAK, 0.62), AK, 0.55), 0.060, true);
    const golge = this._yonGaranti(this._karisN(this._karisN(sis, SOGUK, 0.75), KARA, 0.80), 0.085, false);
    const hizS = this._karisN(this._karisN(tint, HIZ_MAVI, 0.78), KARA, 0.68);

    d = {
      anahtar: anahtar,
      // ton eşleme sabitleri (ACES benzeri eğrinin üç parçası)
      tonKazanc: this._renk([0.878, 0.863, 0.839]),   // multiply → parlak sıkıştır
      tonLift:   this._renk([0.039, 0.055, 0.102]),   // screen   → gölge kaldır
      tonOmuz:   this._renk([0.530, 0.530, 0.530]),   // overlay  → omuz
      notr:      this._renk([0.500, 0.500, 0.500]),
      tint:      this._renk(tint),
      tintDoygun: this._renk(this._setLum(this._setSat(tint, 1), Math.max(0.32, Math.min(0.72, this._lum(tint))))),
      kimlikCarp: this._renk(this._karisN(tint, AK, 0.72)),
      parlakSicak: this._renk(parlak),
      golgeSoguk: this._renk(golge),
      hizSoguk: this._renk(hizS),
      hizDoygun: this._renk(this._setLum(this._setSat(this._karisN(tint, HIZ_MAVI, 0.7), 1), 0.5)),
      vinyet: this._renk(this._karisN(tint, KARA, 0.62))
    };
    this._turetOnbellek[anahtar] = d;
    this._sonTuret = d;
    return d;
  },
  _sonTuret: null,

  _paletDuzelt(p) {
    if (!p || !p.tint) return this._VARSAYILAN_PALET;
    const v = this._VARSAYILAN_PALET;
    return {
      tint: p.tint || v.tint,
      pow: isFinite(p.pow) ? p.pow : v.pow,
      doy: isFinite(p.doy) ? p.doy : v.doy,
      kon: isFinite(p.kon) ? p.kon : v.kon,
      bloom: p.bloom || v.bloom,
      sis: p.sis || v.sis,
      gun: p.gun || v.gun
    };
  },

  // ═════════════════════════════════════════════════════════════════════════
  // GÜN EVRESİ + HIZ
  // ═════════════════════════════════════════════════════════════════════════
  _evre(t) {
    const n = this.GUN_EVRELERI.length;
    let u = ((t * this.GUN_HIZI) / (Math.PI * 2)) % 1;
    if (!isFinite(u)) u = 0;
    if (u < 0) u += 1;
    const f = u * n;
    const i = Math.floor(f) % n;
    const j = (i + 1) % n;
    let k = f - Math.floor(f);
    k = k * k * (3 - 2 * k);                      // smoothstep — sert geçiş yok
    const A = this.GUN_EVRELERI[i], B = this.GUN_EVRELERI[j];
    this._renkYaz(this._evC, this._karisN(this._rgbN(A.carp), this._rgbN(B.carp), k));
    this._renkYaz(this._evT, this._karisN(this._rgbN(A.tara), this._rgbN(B.tara), k));
    return { u: u, i: i, k: k, ad: (k < 0.5 ? A.ad : B.ad), guc: A.guc + (B.guc - A.guc) * k };
  },

  _hizOku(ba) {
    const v = ba && ba.vehicle;
    const vx = (v && isFinite(v.vx)) ? Math.abs(v.vx) : 0;
    // ⚠ İLK örnek yumuşatılmaz: aksi hâlde hız ~14 kare sonra eşiği geçer ve
    //   gradient ön-ısıtması işe yaramaz (kare ortasında yeni gradient doğar).
    if (this._vxIlk) { this._sonVx = vx; this._vxIlk = false; }
    else this._sonVx = this._sonVx * 0.88 + vx * 0.12;
    return Math.max(0, Math.min(1, (this._sonVx - this.HIZ_ESIK) / this.HIZ_ARALIK));
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
        if (typeof v === 'number' && isFinite(v)) return Math.max(0, Math.min(1, v));
      }
      // Bağlam kalite vermediyse global kademeye düş (yoksa 0 = güvenli).
      if (typeof Kalite !== 'undefined' && Kalite && typeof Kalite.ayar === 'function') {
        const v2 = Kalite.ayar(this.ESLEME[ad] || ad);
        if (typeof v2 === 'number' && isFinite(v2)) return Math.max(0, Math.min(1, v2));
      }
    } catch (e) {}
    return 0;
  },

  // ── Renk yardımcıları ────────────────────────────────────────────────────
  _rgb(hex) {
    const h = String(hex == null ? '' : hex).replace('#', '').trim();
    const t = (h.length === 3) ? (h[0] + h[0] + h[1] + h[1] + h[2] + h[2]) : h;
    const n = parseInt(t.slice(0, 6), 16);
    if (!isFinite(n)) return { r: 143, g: 168, b: 192 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },
  _rgbN(hex) {
    let v = this._rgbOnbellek[hex];
    if (!v) {
      const c = this._rgb(hex);
      v = [c.r / 255, c.g / 255, c.b / 255];
      this._rgbOnbellek[hex] = v;
    }
    return v;
  },
  _rgba(hex, a) {
    const c = this._rgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  },
  _karisN(a, b, k) {
    const t = Math.max(0, Math.min(1, k));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  },
  // ── SICAK/SOĞUK YÖN GARANTİSİ ────────────────────────────────────────────
  // Split-tone'un iddiası ("parlaklar sıcak, gölgeler soğuk") 51 haritanın
  // HEPSİNDE doğru olmalı. Renk paletten türer ama kırmızı-mavi farkı en az
  // `m` kadar olacak biçimde bükülür. Kanal tavana/tabana dayanırsa açık
  // eksik diğer kanaldan kapatılır — böylece garanti kırpma altında da tutar.
  _yonGaranti(c, m, sicakMi) {
    const r = [this._sik(c[0]), this._sik(c[1]), this._sik(c[2])];
    const a = sicakMi ? 0 : 2;          // yükseltilecek kanal
    const b = sicakMi ? 2 : 0;          // düşürülecek kanal
    if (r[a] - r[b] >= m) return r;
    const k = (m - (r[a] - r[b])) / 2;
    r[a] = this._sik(r[a] + k);
    r[b] = this._sik(r[b] - k);
    if (r[a] - r[b] < m) r[b] = this._sik(r[a] - m);      // üst kanal tavana dayandı
    if (r[a] - r[b] < m) r[a] = this._sik(r[b] + m);      // alt kanal tabana dayandı
    return r;
  },
  _css(v) {
    return 'rgb(' + Math.round(this._sik(v[0]) * 255) + ',' +
                    Math.round(this._sik(v[1]) * 255) + ',' +
                    Math.round(this._sik(v[2]) * 255) + ')';
  },
  _cssA(v, a) {
    return 'rgba(' + Math.round(this._sik(v[0]) * 255) + ',' +
                     Math.round(this._sik(v[1]) * 255) + ',' +
                     Math.round(this._sik(v[2]) * 255) + ',' + a + ')';
  },
  _renk(v) { return { v: [v[0], v[1], v[2]], s: this._css(v) }; },
  _renkYaz(hedef, v) {
    hedef.v[0] = v[0]; hedef.v[1] = v[1]; hedef.v[2] = v[2];
    hedef.s = this._css(v);
    return hedef;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TEST ALTYAPISI — canvas gerektirmez
  // ═════════════════════════════════════════════════════════════════════════
  _sahteCtx() {
    const say = { save: 0, restore: 0, ciz: 0, gradient: 0 };
    const grad = { addColorStop: function () {} };
    return {
      _say: say,
      canvas: { width: 800, height: 450 },
      filter: 'none',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      fillStyle: '#000',
      save: function () { say.save++; },
      restore: function () { say.restore++; },
      beginPath: function () {},
      translate: function () {},
      rotate: function () {},
      scale: function () {},
      fill: function () { say.ciz++; },
      fillRect: function () { say.ciz++; },
      drawImage: function () { say.ciz++; },
      createLinearGradient: function () { say.gradient++; return grad; },
      createRadialGradient: function () { say.gradient++; return grad; }
    };
  },

  _sahteBa(mapId, palet, kaliteDeger, t, vx) {
    const self = this;
    const onbellek = {};
    const sayac = { yeni: 0 };
    return {
      mapId: mapId,
      palet: palet,
      t: (t == null ? 12.5 : t),
      dt: 0.016,
      vehicle: { x: 4200, y: 900, vx: (vx == null ? 620 : vx), vy: -20, angle: 0.18, onGround: true },
      camera: { worldToScreen: function (wx, wy) { return { x: wx * 1.15, y: wy * 1.15 }; } },
      terrain: { getYAt: function (wx) { return 950 + Math.sin(wx * 0.004) * 60; } },
      kalite: function () { return kaliteDeger; },
      gr: function (anahtar, uret) {
        let g = onbellek[anahtar];
        if (!g) { g = uret(self._sonTestCtx || self._sahteCtx()); onbellek[anahtar] = g; sayac.yeni++; }
        return g;
      },
      _sayac: sayac
    };
  },
  _sonTestCtx: null,

  // Palet tablosu: `gorsel.js` yüklüyse ORADAN (51 harita), değilse yedek.
  _paletTablosu() {
    try {
      if (typeof Gorsel !== 'undefined' && Gorsel && Gorsel.PALET &&
          Object.keys(Gorsel.PALET).length >= 8) return Gorsel.PALET;
    } catch (e) {}
    return {
      countryside: { tint: '#7fc24a', pow: 0.10, doy: 1.18, kon: 1.06, bloom: '#fff3c4', sis: '#cfe8ff', gun: '#fff0b0' },
      desert:      { tint: '#e8a24a', pow: 0.18, doy: 1.12, kon: 1.10, bloom: '#ffdf9a', sis: '#f6dcae', gun: '#ffd070' },
      arctic:      { tint: '#8ed8f0', pow: 0.24, doy: 0.88, kon: 1.16, bloom: '#eafaff', sis: '#e0f6ff', gun: '#d0eaff' },
      cave:        { tint: '#3a4a6a', pow: 0.34, doy: 0.86, kon: 1.24, bloom: '#8fd0ff', sis: '#20304a', gun: '#6090c0' },
      volcano:     { tint: '#e04a1a', pow: 0.32, doy: 1.16, kon: 1.22, bloom: '#ffa040', sis: '#5a2418', gun: '#ff7030' },
      neon_city:   { tint: '#c040e0', pow: 0.30, doy: 1.34, kon: 1.20, bloom: '#ff60ff', sis: '#2a1040', gun: '#a050ff' },
      moon:        { tint: '#8a90a8', pow: 0.26, doy: 0.72, kon: 1.20, bloom: '#dfe8ff', sis: '#2a3048', gun: '#e8f0ff' },
      candy:       { tint: '#ff70c0', pow: 0.24, doy: 1.42, kon: 1.06, bloom: '#ffd0f0', sis: '#ffd8ec', gun: '#fff0c0' }
    };
  },

  // Test kolaylığı: verilen palet için katmanları kurup gri örneği simüle et.
  _olc(mapId, palet, gri, filtre, t, vx) {
    const ba = this._sahteBa(mapId, palet, 1, t, vx);
    const p = this._paletDuzelt(palet);
    const d = this._turet(p);
    const dur = this._dur;
    dur.W = 800; dur.H = 450;
    dur.evre = this._evre(ba.t);
    this._vxIlk = true;
    dur.hiz = this._hizOku(ba);
    this._kur(ba, p, d, dur);
    return this._sim([gri, gri, gri], 1, filtre || null);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SELF TEST — hepsi ÖLÇEREK doğrular (canvas gerekmez)
  // ═════════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const self = this;
    const TAB = this._paletTablosu();
    const adlar = Object.keys(TAB);

    // 1) Zorunlu arayüz
    r.arayuz = (this.ad === 'renk') &&
               (typeof this.hazir === 'function') &&
               (typeof this.ciz === 'function') &&
               (typeof this.selfTest === 'function');
    r.efektListesi = this.EFEKTLER.length === 8 &&
                     this.EFEKTLER[this.EFEKTLER.length - 1] === 'vinyetRenkli';

    // 2) Renk yardımcıları
    r.rgbDogru = (function () {
      const c = self._rgb('#ff8000'), k = self._rgb('#f80');
      return c.r === 255 && c.g === 128 && c.b === 0 && k.r === 255 && k.g === 136 && k.b === 0;
    })();
    r.rgbaDogru = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)';
    r.bozukRenkGuvenli = !!this._rgb('lacivert-yok') && !!this._rgb(null) && !!this._rgbN('#zzz');

    // 3) KARIŞIM MATEMATİĞİ — W3C değerleriyle karşılaştır
    r.karisimMat = (function () {
      const yak = function (a, b) { return Math.abs(a - b) < 1e-9; };
      const A = self._AYRIK;
      return yak(A.multiply(0.5, 0.4), 0.2) &&
             yak(A.screen(0.5, 0.4), 0.7) &&
             yak(A.overlay(0.25, 0.6), 0.3) &&
             yak(A.overlay(0.75, 0.6), 0.8) &&
             yak(A['soft-light'](0.5, 0.5), 0.5) &&
             yak(A['color-dodge'](0.4, 0.5), 0.8) &&
             yak(A['color-burn'](0.5, 0.5), 0) &&
             yak(A.overlay(0.5, 0.5), 0.5);
    })();
    r.ayrikOlmayanMat = (function () {
      // saturation: arka planın parlaklığı KORUNUR, doygunluk kaynaktan gelir
      const cb = [0.6, 0.4, 0.2], cs = [1, 0, 0];
      const out = self._karistir(cb, cs, 'saturation', 1);
      const lumKorundu = Math.abs(self._lum(out) - self._lum(cb)) < 1e-6;
      const doyArtti = self._sat(out) > self._sat(cb);
      // luminosity: parlaklık kaynaktan, renk arka plandan
      const out2 = self._karistir(cb, [0.9, 0.9, 0.9], 'luminosity', 1);
      const lumDegisti = self._lum(out2) > self._lum(cb);
      // setSat sınır durumu: tüm kanallar eşitse doygunluk 0
      const esit = self._setSat([0.5, 0.5, 0.5], 1);
      return lumKorundu && doyArtti && lumDegisti &&
             esit[0] === 0 && esit[1] === 0 && esit[2] === 0;
    })();

    // 4) TON EĞRİSİ — ACES karakteri ÖLÇÜLÜR
    r.tonEgrisi = (function () {
      const p = self._paletDuzelt(TAB[adlar[0]]);
      const ba = self._sahteBa('t', p, 1, 0, 0);
      const d = self._turet(p);
      self._sayi = 0;
      self._katTon(ba, p, d, { hiz: 0, evre: self._evre(0), W: 8, H: 8 });
      const f = function (x) { return self._lum(self._sim([x, x, x], 1, null)); };
      let monoton = true;
      let onc = -1;
      for (let i = 0; i <= 32; i++) {
        const y = f(i / 32);
        if (y <= onc) monoton = false;
        onc = y;
      }
      const beyaz = f(1), siyah = f(0), orta = f(0.5);
      const egimUst = (f(1.0) - f(0.85)) / 0.15;
      const egimOrta = (f(0.6) - f(0.4)) / 0.20;
      return monoton &&
             beyaz < 0.97 && beyaz > 0.70 &&      // parlaklar SIKIŞTI
             siyah > 0.008 && siyah < 0.20 &&     // gölgeler KALKTI
             Math.abs(orta - 0.5) < 0.12 &&       // orta ton korundu (okunabilirlik)
             egimUst < egimOrta;                  // OMUZ var (shoulder)
    })();

    // 5) SPLIT-TONE yönü — 51 haritanın HEPSİNDE doğru olmalı
    r.splitYonu = (function () {
      let ok = 0;
      for (let i = 0; i < adlar.length; i++) {
        const p = self._paletDuzelt(TAB[adlar[i]]);
        const ba = self._sahteBa(adlar[i], p, 1, 0, 0);
        const d = self._turet(p);
        self._sayi = 0;
        self._katSplit(ba, p, d, { hiz: 0, evre: self._evre(0), W: 8, H: 8 });
        const par = self._sim([0.85, 0.85, 0.85], 1, null);
        const gol = self._sim([0.12, 0.12, 0.12], 1, null);
        if ((par[0] - par[2]) > 0.004 && (gol[2] - gol[0]) > 0.004) ok++;
      }
      return ok === adlar.length;
    })();

    // 6) DOYGUNLUK yönü — doy>1 artırmalı, doy<1 azaltmalı
    r.doygunlukYonu = (function () {
      const gir = [0.62, 0.44, 0.30];
      const olc = function (doy) {
        const p = self._paletDuzelt({ tint: '#c040e0', pow: 0.2, doy: doy, kon: 1.1, bloom: '#fff', sis: '#345', gun: '#fda' });
        const ba = self._sahteBa('x', p, 1, 0, 0);
        const d = self._turet(p);
        self._sayi = 0;
        self._katDoygunluk(ba, p, d, { hiz: 0, evre: self._evre(0), W: 8, H: 8 });
        return self._sat(self._sim(gir, 1, null));
      };
      const taban = self._sat(gir);
      return olc(1.45) > taban + 0.01 && olc(0.72) < taban - 0.01;
    })();

    // 7) BİYOM KİMLİĞİ — her harita FARKLI bir sonuç vermeli
    r.biyomKimligi = (function () {
      const gorulen = {};
      let adet = 0;
      for (let i = 0; i < adlar.length; i++) {
        const p = self._paletDuzelt(TAB[adlar[i]]);
        const ba = self._sahteBa(adlar[i], p, 1, 0, 0);
        const d = self._turet(p);
        self._sayi = 0;
        self._katKimlik(ba, p, d, { hiz: 0, evre: self._evre(0), W: 8, H: 8 });
        const c = self._sim([0.5, 0.5, 0.5], 1, null);
        const im = self._css(c);
        if (!gorulen[im]) { gorulen[im] = 1; adet++; }
      }
      return adet === adlar.length;
    })();

    // 8) GÜN DÖNGÜSÜ — 4 evre farklı + şafak sıcak, gece soğuk/koyu
    r.gunDongusu = (function () {
      const p = self._paletDuzelt(TAB[adlar[0]]);
      const d = self._turet(p);
      const per = (Math.PI * 2) / self.GUN_HIZI;      // tam tur (sn)
      const olc = function (u) {
        const ba = self._sahteBa('g', p, 1, u * per, 0);
        self._sayi = 0;
        self._katGun(ba, p, d, { hiz: 0, evre: self._evre(u * per), W: 8, H: 8 });
        return self._sim([0.62, 0.62, 0.62], 1, null);
      };
      const safak = olc(0.00), gunduz = olc(0.25), alaca = olc(0.50), gece = olc(0.75);
      const sicaklik = function (c) { return c[0] - c[2]; };
      const farkli = self._css(safak) !== self._css(gunduz) &&
                     self._css(gunduz) !== self._css(alaca) &&
                     self._css(alaca) !== self._css(gece) &&
                     self._css(gece) !== self._css(safak);
      return farkli &&
             sicaklik(safak) > sicaklik(gunduz) &&        // şafak turuncu
             sicaklik(gece) < sicaklik(gunduz) &&         // gece mavi
             self._lum(gece) < self._lum(gunduz) &&       // gece daha koyu
             alaca[2] > alaca[1] &&                       // alacakaranlık mor (mavi > yeşil)
             self._lum(gece) > 0.30;                      // ama okunur kalır
    })();

    // 9) HIZ TONU — durunca katman YOK, hızlanınca soğuk + doygun
    // 🔴 ÖLÇÜM TUZAĞI (30 Tmz'de bu test yakaladı): "soğudu mu" sorusu RENKLİ
    //    bir örnekte sorulamaz. `saturation` katmanı arka planın TONUNU korur;
    //    arka plan sıcaksa doygunluğu artırmak r−b farkını BÜYÜTÜR ve efekt
    //    "ısınmış" görünür. Bu yüzden soğuma NÖTR GRİDE (doygunluk katmanının
    //    matematiksel olarak etkisiz olduğu yerde), doygunluk ise RENKLİ
    //    örnekte ölçülür. İkisini tek örnekte ölçmek yanlış sonuç verir.
    r.hizTonu = (function () {
      const p = self._paletDuzelt(TAB[adlar[0]]);
      const d = self._turet(p);
      const olc = function (vx) {
        const ba = self._sahteBa('h', p, 1, 0, vx);
        self._vxIlk = true;
        const dur = { hiz: 0, evre: self._evre(0), W: 8, H: 8 };
        dur.hiz = self._hizOku(ba);
        self._sayi = 0;
        self._katHiz(ba, p, d, dur);
        return {
          n: self._sayi,
          gri: self._sim([0.50, 0.50, 0.50], 1, null),
          renkli: self._sim([0.55, 0.42, 0.36], 1, null)
        };
      };
      const dur0 = olc(0), yavas = olc(200), hizli = olc(880);
      const soguk = function (c) { return c[2] - c[0]; };
      return dur0.n === 0 && yavas.n === 0 && hizli.n >= 2 &&
             soguk(hizli.gri) > soguk(dur0.gri) + 0.01 &&
             self._sat(hizli.renkli) > self._sat(dur0.renkli) + 0.01;
    })();

    // 10) OKUNABİLİRLİK — 51 harita × 4 gün evresi, KORUMA sonrası
    r.okunabilirlik = (function () {
      const per = (Math.PI * 2) / self.GUN_HIZI;
      let kotu = 0, en = 1;
      for (let i = 0; i < adlar.length; i++) {
        for (let e = 0; e < 4; e++) {
          const p = self._paletDuzelt(TAB[adlar[i]]);
          const ba = self._sahteBa(adlar[i], p, 1, (e / 4) * per, 720);
          const d = self._turet(p);
          const dur = { hiz: 0, evre: self._evre(ba.t), W: 800, H: 450 };
          self._vxIlk = true;
          dur.hiz = self._hizOku(ba);
          self._kur(ba, p, d, dur);
          self._korumaOnbellek = {};
          const kf = self._koruma(ba, p, dur);
          if (kf < en) en = kf;
          const beyaz = self._lum(self._sim([0.97, 0.97, 0.97], kf, null));
          const orta = self._lum(self._sim([0.50, 0.50, 0.50], kf, null));
          const siyah = self._lum(self._sim([0.02, 0.02, 0.02], kf, null));
          if (beyaz < self.KORUMA.beyazEnAz - 1e-9) kotu++;
          if (Math.abs(orta - 0.5) > self.KORUMA.ortaSapma + 1e-9) kotu++;
          if (siyah > self.KORUMA.siyahEnCok + 1e-9) kotu++;
          if (!(siyah < orta && orta < beyaz)) kotu++;
        }
      }
      self._sonKorumaEnDusuk = en;
      return kotu === 0;
    })();

    // 10b) KORUMA GERÇEKTEN DEVREYE GİRİYOR MU?
    // ⚠ 51 gerçek palet kısıtları zaten sağlıyor (çarpan hep 1) — yani bu kod
    //    yolu "hiç koşmamış" olabilirdi. Uç bir palet ÜRETİLİP kısmanın
    //    gerçekten çalıştığı ve kıstıktan sonra kısıtların sağlandığı ölçülür.
    //    Ölçüm: 51 gerçek palet × 4 evre × 2 hızda çarpan HEP 1 çıkıyor (yani
    //    derecelendirme sınırların içinde kalıyor). Bu iyi haber ama mekanizmayı
    //    "hiç koşmamış kod" yapardı → SENTETİK bir aşırı karartma katmanıyla
    //    kısmanın gerçekten çalıştığı ve kıstıktan sonra kısıtın sağlandığı
    //    ölçülür.
    r.korumaDevreyeGiriyor = (function () {
      const p = self._paletDuzelt(TAB[adlar[0]]);
      const ba = self._sahteBa('sentetik', p, 1, 0, 0);
      const dur = { hiz: 0, evre: self._evre(0), W: 800, H: 450 };
      self._sayi = 0;
      self._ekle('tonEsleme', 'multiply', self._renk([0.25, 0.25, 0.25]), 0.90, false, null, false);
      const kisilmamis = self._lum(self._sim([0.97, 0.97, 0.97], 1, null));
      self._korumaOnbellek = {}; self._korumaSayi = 0;
      const kf = self._koruma(ba, p, dur);
      const kisilmis = self._lum(self._sim([0.97, 0.97, 0.97], kf, null));
      self._korumaOnbellek = {}; self._korumaSayi = 0;
      return kisilmamis < self.KORUMA.beyazEnAz &&      // sentetik katman ihlal ediyor
             kf < 1 &&                                  // koruma KISTI
             kisilmis >= self.KORUMA.beyazEnAz;         // kıstıktan sonra okunur
    })();

    // 11) Kalite 0 => TEK BİR çizim ve TEK BİR gradient bile olmamalı
    r.kaliteSifirCizmez = (function () {
      const ctx = self._sahteCtx();
      self._sonTestCtx = ctx;
      self.hazir(800, 450);
      const ba = self._sahteBa('volcano', TAB[adlar[0]], 0, 5, 800);
      self.ciz(ctx, 800, 450, ba);
      return ctx._say.ciz === 0 && ctx._say.gradient === 0 && ba._sayac.yeni === 0;
    })();

    // 12) Tam kalitede çiziyor + durum geri konuyor + save/restore dengeli
    const olcum = (function () {
      const ctx = self._sahteCtx();
      self._sonTestCtx = ctx;
      self.hazir(800, 450);
      ctx.globalAlpha = 0.33;
      ctx.globalCompositeOperation = 'xor';
      const ba = self._sahteBa('neon_city', TAB[adlar[0]], 1, 5, 800);
      self.ciz(ctx, 800, 450, ba);
      const ilk = { ciz: ctx._say.ciz, grad: ba._sayac.yeni };
      for (let i = 0; i < 8; i++) { ba.t = 5 + i * 0.016; self.ciz(ctx, 800, 450, ba); }
      return {
        ciz: ilk.ciz,
        ilkGrad: ilk.grad,
        sonGrad: ba._sayac.yeni,
        dengeli: ctx._say.save === ctx._say.restore,
        alfa: ctx.globalAlpha === 0.33,
        karisim: ctx.globalCompositeOperation === 'xor'
      };
    })();
    r.tamKaliteCiziyor = olcum.ciz >= 10;
    r.saveRestoreDengeli = olcum.dengeli;
    r.durumGeriKonuyor = olcum.alfa && olcum.karisim;
    r.ilkKaredeGradient = olcum.ilkGrad === 3;      // kontrast + hız + vinyet
    r.sonrakiKarelerdeSifirGradient = olcum.sonGrad === olcum.ilkGrad;

    // 13) Gradient önbelleği (yedek yol)
    r.gradientOnbellek = (function () {
      self._grYerel = {}; self._grUretim = 0;
      const sahte = self._sahteCtx();
      const u = function (c) { return c.createLinearGradient(0, 0, 1, 0); };
      self._gr(sahte, null, 'test|1x1', u);
      const ilk = self._grUretim;
      self._gr(sahte, null, 'test|1x1', u);
      return ilk === 1 && self._grUretim === 1;
    })();

    // 14) Eksik bağlam çökertmemeli
    r.eksikBaglamGuvenli = (function () {
      try {
        const ctx = self._sahteCtx();
        self._sonTestCtx = ctx;
        self.ciz(ctx, 640, 360, { mapId: 'cave', t: 3, kalite: function () { return 1; } });
        self.ciz(ctx, 640, 360, { palet: { tint: null }, kalite: function () { return 1; } });
        self.ciz(ctx, 640, 360, {});
        self.ciz(ctx, 640, 360, null);
        self.ciz(null, 640, 360, {});
        self.ciz(ctx, 0, 0, {});
        return true;
      } catch (e) { return false; }
    })();

    // 15) hazir() boyut değişimini yakalıyor
    r.hazirBoyut = (function () {
      const eskiW = self._W, eskiH = self._H, eskiHz = self._hazirlandi;
      self.hazir(400, 300);
      const a = (self.hazir(400, 300) === false);
      const b = (self.hazir(500, 300) === true);
      self._W = eskiW; self._H = eskiH; self._hazirlandi = eskiHz;
      return a && b;
    })();

    // 16) Türetme önbelleği: aynı palet iki kez türetilmemeli
    r.turetOnbellek = (function () {
      const p = self._paletDuzelt(TAB[adlar[0]]);
      const a = self._turet(p);
      const b = self._turet(self._paletDuzelt(TAB[adlar[0]]));
      return a === b;
    })();

    this._sonTestCtx = null;
    r.allPass = Object.keys(r).every(function (k) { return k === 'allPass' || r[k] === true; });
    return r;
  }
};

if (typeof window !== 'undefined') window.GorselRenk = GorselRenk;
