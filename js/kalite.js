'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// KALITE — Grafik kalite kademesi (30 Tmz · 6 kademeye genişletildi)
//
// Kullanıcı kararı: **kademe olsun ama varsayılan ULTRA**.
// Mevcut `Settings.graphics` yalnız 'low'|'med'|'high' biliyordu; 'ultra'
// eklendi ve varsayılan yapıldı. Settings'e DOKUNULMADI (additive) —
// eski kayıtlar bozulmasın diye burada sarmalanıyor.
//
// ⚠ ÖLÇÜLMÜŞ BAĞLAM (DEVAM-OZETI.md §8B.27/B4-B5):
//   Oyunun p99'u 44 ms, kare başına 83 gradient üretiliyor, en kötü kare
//   1.233 ms. Yani ULTRA varsayılanı BEDAVA DEĞİL. Her ağır efekt burada
//   bir bayrağın arkasında; takılma olursa tek yerden kısılır.
//   Telefon otomatik düşürülmez (kullanıcı isteği) ama `oneri()` cihazı
//   ölçüp öneri döndürür; ayarlar ekranı bunu gösterebilir.
//
// ── 6 KADEME (30 Tmz) ──────────────────────────────────────────────────────
//   dusuk · orta · ortaustu · yuksek · cokyuksek · ultra
//   `dusuk`  = telefonda akıcı olmalı → yalnız BEDAVA sayılabilecek efektler
//              açık; bloom piramidi, godRay, yansıma, hareket bulanıklığı,
//              lens ve hava parçacıkları TAMAMEN 0.
//   `ultra`  = HER anahtar > 0 (hiçbir efekt kapalı değil).
//
// 🔴 İKİ KURAL (selfTest ÖLÇEREK doğrular, kırılırsa `allPass` düşer):
//   1. **MONOTON ARTIŞ**: her anahtar için
//      dusuk ≤ orta ≤ ortaustu ≤ yuksek ≤ cokyuksek ≤ ultra.
//      (Bir kademeyi elle "iyileştirirken" ters yön vermek çok kolay;
//       kademe kaydırıcısı bunu kullanıcıya "yükselttim ama kötüleşti"
//       diye gösterir. Bu yüzden ölçülüyor.)
//   2. **TABLO TAM**: her kademede her anahtar tanımlı olmalı — eksik anahtar
//      `ayar()`'dan sessizce 0 döner ve efekt "hiç yazılmamış" gibi ölür.
//
// 🔴 DEĞER ANLAMI: tüm anahtarlar **ŞİDDET/GÜÇ**tür, 0 = efekt HİÇ çizilmez.
//   Eşik/oran gibi "ters" okunabilecek anahtarlar da bilerek güç olarak
//   tanımlandı (örn. `parlakEsik` = parlaklık ayıklamasının GÜCÜ, eşik
//   DEĞERİ değil) — yoksa monoton artış kuralı anlamsızlaşırdı.
//   İstisnalar (0-1 aralığında değil, ama yine artan):
//     `gokKatman` = gökyüzü katman SAYISI · `parcacikCarpan`,
//     `dekorYogunluk` = çarpan.
//   ⚠ `gorsel-isik.js:_k()` okuduğu değeri **[0,1] aralığına kelepçeler**;
//     ışık grubuna 1'den büyük değer yazmanın etkisi yoktur.
// ═══════════════════════════════════════════════════════════════════════════
const Kalite = {
  KADEMELER: ['dusuk', 'orta', 'ortaustu', 'yuksek', 'cokyuksek', 'ultra'],
  VARSAYILAN: 'ultra',

  ETIKETLER: {
    dusuk: 'DÜŞÜK', orta: 'ORTA', ortaustu: 'ORTA-ÜSTÜ',
    yuksek: 'YÜKSEK', cokyuksek: 'ÇOK YÜKSEK', ultra: 'ULTRA'
  },

  // Efekt aileleri — ayarlar ekranı bunları başlık olarak kullanabilir.
  // ⚠ `_TABLO` bu sıradan üretilir; buraya eklenen her anahtarın `_RAMPA`da
  //   karşılığı OLMALI (yoksa selfTest.tabloTam düşer).
  GRUPLAR: {
    temel: ['bloom', 'grade', 'vignette', 'grain', 'isikHuzmesi', 'islakZemin',
            'hizBulaniklik', 'kromatik', 'derinlikSis', 'parcacikCarpan',
            'gokKatman', 'dekorYogunluk', 'golge'],
    isik: ['gunesDiski', 'temasGolge', 'dinamikIsik', 'aoZemin', 'isikTitresim'],
    lens: ['bloomPiramit', 'parlakEsik', 'anamorfik', 'lensHalka', 'lensKir', 'varil'],
    atmosfer: ['katmanliSis', 'godRay', 'tozZerre', 'isiDalgasi', 'bulutGolgesi',
               'atmosferikPerspektif', 'ufukParlama'],
    yansima: ['ekranYansima', 'sudalga', 'birikinti', 'buzYansima', 'yansimaRenk'],
    renk: ['tonEsleme', 'bolunmusTon', 'doygunluk', 'kontrastEgri', 'biyomKimlik',
           'gunDongusu', 'hizTonu', 'vinyetRenkli'],
    hareket: ['hareketBulanik', 'radyalBulanik', 'hizCizgi', 'alanDerinligi',
              'tunelVinyet', 'carpmaSarsinti', 'nitroDalga'],
    hava: ['camDamla', 'yagmurCizgi', 'karTanesi', 'tipiPerde', 'kumFirtina',
           'korKul', 'simsek', 'camBuz']
  },

  // ── RAMPA: anahtar → [dusuk, orta, ortaustu, yuksek, cokyuksek, ultra] ────
  // ⚠ TABLO ELLE YAZILMAZ, BURADAN ÜRETİLİR. 6 kademe × 59 anahtar = 354 sayıyı
  //   elle yazmak monoton artış hatasını kaçınılmaz yapardı; rampa satırında
  //   yön hatası GÖZLE görülür, ayrıca selfTest ölçer.
  // ⚠ Dört eski kademenin (dusuk/orta/yuksek/ultra) değerleri 30 Tmz'deki
  //   canlı sürümle BİREBİR aynı bırakıldı; yeni ortaustu/cokyuksek aralara
  //   girdi. Yani mevcut oyuncunun görüntüsü DEĞİŞMEDİ.
  _RAMPA: {
    // ── temel (30 Tmz'den beri gorsel.js tarafından okunuyor) ──────────────
    bloom:          [0,    0.25, 0.40, 0.55, 0.78, 1.00],
    grade:          [0.35, 0.60, 0.72, 0.85, 0.93, 1.00],
    vignette:       [0.15, 0.25, 0.29, 0.32, 0.35, 0.38],
    grain:          [0,    0.02, 0.028, 0.035, 0.043, 0.05],
    isikHuzmesi:    [0,    0.30, 0.45, 0.60, 0.80, 1.00],
    islakZemin:     [0,    0.20, 0.35, 0.50, 0.68, 0.85],
    hizBulaniklik:  [0,    0.15, 0.25, 0.35, 0.45, 0.55],
    kromatik:       [0,    0,    0.12, 0.25, 0.35, 0.45],
    derinlikSis:    [0,    0.30, 0.45, 0.60, 0.80, 1.00],
    parcacikCarpan: [0.35, 0.65, 0.82, 1.00, 1.20, 1.40],
    gokKatman:      [1,    2,    3,    3,    4,    4],   // katman SAYISI (tam sayı)
    dekorYogunluk:  [0.30, 0.60, 0.72, 0.85, 0.93, 1.00],
    golge:          [0,    0.40, 0.55, 0.70, 0.85, 1.00],

    // ── ışık (gorsel-isik.js okur; [0,1] kelepçeli) ────────────────────────
    gunesDiski:     [0,    0.30, 0.45, 0.60, 0.80, 1.00],  // güneş diski + korona
    temasGolge:     [0,    0.25, 0.40, 0.55, 0.75, 0.95],  // nesne-zemin temas gölgesi
    dinamikIsik:    [0,    0,    0.25, 0.45, 0.70, 1.00],  // hareketli ışık kaynakları (AĞIR)
    aoZemin:        [0,    0.20, 0.35, 0.50, 0.70, 0.90],  // zeminde ambient occlusion
    isikTitresim:   [0,    0.15, 0.25, 0.40, 0.60, 0.80],  // ateş/neon titreşimi

    // ── lens ───────────────────────────────────────────────────────────────
    bloomPiramit:   [0,    0,    0.20, 0.45, 0.70, 1.00],  // çok geçişli bloom (ÇOK AĞIR)
    parlakEsik:     [0,    0.25, 0.40, 0.55, 0.75, 1.00],  // parlaklık ayıklamasının GÜCÜ
    anamorfik:      [0,    0,    0.15, 0.35, 0.60, 0.85],  // yatay anamorfik parlama
    lensHalka:      [0,    0,    0.12, 0.30, 0.55, 0.80],  // hayalet halkalar
    lensKir:        [0,    0,    0.15, 0.30, 0.50, 0.70],  // lens kiri dokusu
    varil:          [0,    0,    0,    0.20, 0.40, 0.60],  // varil bozulması (EN AĞIR)

    // ── atmosfer ───────────────────────────────────────────────────────────
    katmanliSis:          [0, 0.25, 0.40, 0.55, 0.78, 1.00],
    godRay:               [0, 0,    0.20, 0.40, 0.70, 1.00],  // hacimsel huzme (AĞIR)
    tozZerre:             [0, 0.15, 0.30, 0.50, 0.75, 1.00],
    isiDalgasi:           [0, 0,    0.15, 0.30, 0.55, 0.80],  // sıcak hava kırılması
    bulutGolgesi:         [0, 0.15, 0.30, 0.45, 0.70, 0.90],
    atmosferikPerspektif: [0, 0.30, 0.45, 0.60, 0.80, 1.00],
    ufukParlama:          [0, 0.25, 0.40, 0.55, 0.75, 0.95],

    // ── yansıma (hepsi ekranı yeniden çizer → dusuk'te KAPALI) ─────────────
    ekranYansima:   [0,    0,    0.18, 0.38, 0.65, 0.95],
    sudalga:        [0,    0,    0.15, 0.35, 0.60, 0.85],
    birikinti:      [0,    0.15, 0.30, 0.45, 0.68, 0.90],
    buzYansima:     [0,    0.15, 0.28, 0.45, 0.65, 0.85],
    yansimaRenk:    [0,    0.20, 0.35, 0.50, 0.72, 1.00],

    // ── renk (ucuz kompozit dolgular; `biyomKimlik` fiilen bedava) ─────────
    tonEsleme:      [0,    0.35, 0.50, 0.65, 0.85, 1.00],
    bolunmusTon:    [0,    0.20, 0.35, 0.50, 0.72, 0.95],
    doygunluk:      [0,    0.30, 0.45, 0.60, 0.80, 1.00],
    kontrastEgri:   [0,    0.30, 0.45, 0.60, 0.80, 1.00],
    biyomKimlik:    [0.40, 0.60, 0.72, 0.85, 0.93, 1.00],  // palet seçimi = renk sabiti
    gunDongusu:     [0,    0.30, 0.45, 0.60, 0.80, 1.00],
    hizTonu:        [0,    0.20, 0.32, 0.45, 0.68, 0.90],
    vinyetRenkli:   [0,    0.20, 0.32, 0.45, 0.65, 0.85],

    // ── hareket ────────────────────────────────────────────────────────────
    hareketBulanik: [0,    0,    0.20, 0.40, 0.65, 0.90],  // (AĞIR)
    radyalBulanik:  [0,    0,    0.15, 0.35, 0.60, 0.85],  // (AĞIR)
    hizCizgi:       [0,    0.20, 0.35, 0.50, 0.72, 0.95],
    alanDerinligi:  [0,    0,    0.12, 0.30, 0.55, 0.80],  // (AĞIR)
    tunelVinyet:    [0,    0.20, 0.32, 0.45, 0.68, 0.90],
    // ⚠ `carpmaSarsinti` tek bir `translate` — piksel maliyeti YOK, oynanış
    //   hissi taşıdığı için DÜŞÜK'te de açık bırakıldı (bilinçli).
    carpmaSarsinti: [0.25, 0.40, 0.55, 0.70, 0.85, 1.00],
    nitroDalga:     [0,    0.20, 0.35, 0.50, 0.72, 0.95],

    // ── hava (parçacık/perde → dusuk'te KAPALI) ────────────────────────────
    camDamla:       [0,    0.20, 0.35, 0.50, 0.72, 0.95],
    yagmurCizgi:    [0,    0.25, 0.40, 0.55, 0.78, 1.00],
    karTanesi:      [0,    0.25, 0.40, 0.55, 0.78, 1.00],
    tipiPerde:      [0,    0,    0.20, 0.40, 0.65, 0.90],
    kumFirtina:     [0,    0,    0.20, 0.40, 0.65, 0.90],
    korKul:         [0,    0.15, 0.30, 0.45, 0.70, 0.95],
    simsek:         [0,    0.30, 0.45, 0.60, 0.80, 1.00],
    camBuz:         [0,    0.15, 0.28, 0.45, 0.68, 0.90]
  },

  // DÜŞÜK kademede açık kalmasına İZİN VERİLEN anahtarlar (hepsi ya renk
  // sabiti ya tek dolgu/translate). Bu listede OLMAYAN her anahtar dusuk'te
  // 0 olmak ZORUNDA — selfTest bunu tek tek ölçer.
  _UCUZ: ['grade', 'vignette', 'parcacikCarpan', 'gokKatman', 'dekorYogunluk',
          'biyomKimlik', 'carpmaSarsinti'],

  // Rampadan üretilir (dosya sonundaki `_tabloKur()`).
  _TABLO: {},
  ANAHTARLAR: [],

  _kademe: null,

  // ── Tablo üretimi ────────────────────────────────────────────────────────
  _tabloKur() {
    const tablo = {}, anahtarlar = [];
    for (let i = 0; i < this.KADEMELER.length; i++) tablo[this.KADEMELER[i]] = {};
    const gruplar = Object.keys(this.GRUPLAR);
    for (let g = 0; g < gruplar.length; g++) {
      const liste = this.GRUPLAR[gruplar[g]];
      for (let a = 0; a < liste.length; a++) {
        const ad = liste[a], r = this._RAMPA[ad];
        if (anahtarlar.indexOf(ad) < 0) anahtarlar.push(ad);
        for (let i = 0; i < this.KADEMELER.length; i++) {
          // Rampa eksikse 0 YAZMA — anahtarı tanımsız bırak ki selfTest.tabloTam
          // sessizce geçmesin (0 yazsaydık "efekt kapalı" gibi görünürdü).
          if (r && typeof r[i] === 'number') tablo[this.KADEMELER[i]][ad] = r[i];
        }
      }
    }
    this._TABLO = tablo;
    this.ANAHTARLAR = anahtarlar;
    return tablo;
  },

  // ── Okuma ────────────────────────────────────────────────────────────────
  kademe() {
    if (this._kademe) return this._kademe;
    let k = null;
    try {
      if (typeof Settings !== 'undefined' && Settings.get) {
        const g = Settings.get('graphics');
        // ⚠ `'high'` Settings'in FABRİKA VARSAYILANI (settings.js:10) — oyuncunun
        //   bilinçli seçimi DEĞİL. Onu 'yuksek'e eşlersek herkes ULTRA yerine
        //   YÜKSEK'te kalır (canlıda ölçüldü, kullanıcı "varsayılan ULTRA" dedi).
        //   Bu yüzden yalnız AÇIK BİR DÜŞÜRME ('low'/'med') dikkate alınır;
        //   'high' ve 'ultra' → ULTRA.
        //   ⚠ Yeni kademeler (ortaustu/cokyuksek) Settings'te KARŞILIĞI OLMAYAN
        //     kademelerdir; buraya eşleme EKLENMEZ — yalnız `ahmet_kalite`
        //     üzerinden gelirler (aşağıya bak).
        k = ({ low: 'dusuk', med: 'orta' })[g] || null;
      }
    } catch (e) {}
    try {
      const kayitli = localStorage.getItem('ahmet_kalite');
      if (kayitli && this.KADEMELER.indexOf(kayitli) >= 0) k = kayitli;
    } catch (e) {}
    // ⚠ 31 Tmz: burada cihaza göre OTOMATİK DÜŞÜRME denendi ve GERİ ALINDI.
    //   Kullanıcı kararı: "ULTRA'yı sakın alt kademeye geçirme, ULTRA grafikler
    //   için; sorun varsa sorunu düzelt." Doğru yaklaşım kaliteyi kısmak değil,
    //   kare maliyetini düşürmek. Takılma düzeltmeleri için §8B.33'e bak.
    //   🔴 Buraya bir daha otomatik düşürme EKLEME.
    this._kademe = k || this.VARSAYILAN;
    return this._kademe;
  },

  ayar(ad) {
    const t = this._TABLO[this.kademe()] || this._TABLO.ultra;
    return t[ad] === undefined ? 0 : t[ad];
  },

  ultraMi() { return this.kademe() === 'ultra'; },

  // Bir kademenin toplam "ağırlığı" (tüm anahtarların toplamı). Kademeler
  // arası farkı tek sayıyla ölçmek için; selfTest artan olduğunu doğrular.
  agirlik(k) {
    const t = this._TABLO[k || this.kademe()];
    if (!t) return 0;
    let s = 0;
    for (let i = 0; i < this.ANAHTARLAR.length; i++) {
      const v = t[this.ANAHTARLAR[i]];
      if (typeof v === 'number') s += v;
    }
    return Math.round(s * 1000) / 1000;
  },

  // ── Yazma ────────────────────────────────────────────────────────────────
  kur(k) {
    if (this.KADEMELER.indexOf(k) < 0) return false;
    this._kademe = k;
    try { localStorage.setItem('ahmet_kalite', k); } catch (e) {}
    // Eski Settings alanını da senkron tut (perfScale onu okuyor).
    // ⚠ Settings yalnız 3 değer biliyor; ortaustu→'med', cokyuksek→'high'
    //   (aşağı yuvarlanır) — geri okumada `ahmet_kalite` zaten her şeyi ezer.
    try {
      if (typeof Settings !== 'undefined' && Settings.set) {
        Settings.set('graphics', ({
          dusuk: 'low', orta: 'med', ortaustu: 'med',
          yuksek: 'high', cokyuksek: 'high', ultra: 'high'
        })[k]);
      }
    } catch (e) {}
    // Gradient önbelleği kademe alfalarını içinde taşıyor olabilir → tazele.
    try {
      if (typeof Gorsel !== 'undefined' && Gorsel && Gorsel._onbellekTemizle) {
        Gorsel._onbellekTemizle();
      }
    } catch (e) {}
    return true;
  },

  sonraki() {
    const i = this.KADEMELER.indexOf(this.kademe());
    this.kur(this.KADEMELER[(i + 1) % this.KADEMELER.length]);
    return this.kademe();
  },

  etiket(k) {
    return this.ETIKETLER[k || this.kademe()] || 'ULTRA';
  },

  // ── Cihaz ölçümü (öneri; OTOMATİK DÜŞÜRMEZ — kullanıcı kararı) ──────────
  // ⚠ Puan 1..6 → KADEMELER indeksi 0..5. 4 kademeden 6'ya çıkınca eski
  //   `puan-1` kelepçesi (0..3) ULTRA'yı erişilemez yapardı; ölçek genişletildi.
  oneri() {
    let puan = 6;                                   // 6 = ultra
    try {
      const mobil = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
      const cek = navigator.hardwareConcurrency || 4;
      const bellek = navigator.deviceMemory || 4;
      if (mobil) puan -= 2;
      if (cek <= 4) puan -= 1;
      if (cek <= 2) puan -= 1;
      if (bellek <= 4) puan -= 1;
      if (bellek <= 2) puan -= 1;
      if (mobil && cek <= 4 && bellek <= 3) puan -= 1;
    } catch (e) {}
    return this.KADEMELER[Math.max(0, Math.min(this.KADEMELER.length - 1, puan - 1))];
  },

  // ⚠ Otomatik düşürme YOK. Yalnız p99 çok kötüyse UYARI bayrağı kaldırır;
  //   kısma kararını oyuncuya bırakır (kullanıcı "varsayılan ULTRA" dedi).
  _kareGecmisi: [],
  kareOlc(ms) {
    const g = this._kareGecmisi;
    g.push(ms);
    if (g.length > 240) g.shift();
    if (g.length < 240) return null;
    const s = g.slice().sort((a, b) => a - b);
    const p99 = s[Math.floor(s.length * 0.99)];
    return { p99: p99, agirMi: p99 > 60 };
  },

  selfTest() {
    const r = {};
    const K = this.KADEMELER, T = this._TABLO;

    r.altiKademe = K.length === 6 &&
      K.join(',') === 'dusuk,orta,ortaustu,yuksek,cokyuksek,ultra';
    r.kademeGecerli = K.indexOf(this.kademe()) >= 0;
    r.varsayilanUltra = this.VARSAYILAN === 'ultra';
    r.etiketTam = K.every(k => typeof this.ETIKETLER[k] === 'string' && this.ETIKETLER[k].length > 0);

    // TABLO TAM: her kademede her anahtar SAYI olmalı.
    r.tabloTam = this.ANAHTARLAR.length > 0 && K.every(k =>
      T[k] && this.ANAHTARLAR.every(a => typeof T[k][a] === 'number' && isFinite(T[k][a])));

    // MONOTON ARTIŞ: dusuk ≤ orta ≤ ortaustu ≤ yuksek ≤ cokyuksek ≤ ultra.
    let ters = 0;
    this.ANAHTARLAR.forEach(a => {
      for (let i = 1; i < K.length; i++) {
        if (!(T[K[i]][a] >= T[K[i - 1]][a])) ters++;
      }
    });
    r.kademeArtan = ters === 0;

    // Ağırlık (toplam) KESİN artan olmalı — iki kademe aynıysa fark hissedilmez.
    let agirlikArtan = true;
    for (let i = 1; i < K.length; i++) {
      if (!(this.agirlik(K[i]) > this.agirlik(K[i - 1]))) agirlikArtan = false;
    }
    r.agirlikArtan = agirlikArtan;

    // DÜŞÜK: `_UCUZ` listesinde olmayan HER anahtar 0.
    r.dusukHafif = this.ANAHTARLAR.every(a =>
      this._UCUZ.indexOf(a) >= 0 || T.dusuk[a] === 0);
    // Adı geçen ağır aileler ayrıca tek tek (regresyon kilidi).
    r.dusukAgirKapali = ['bloom', 'bloomPiramit', 'godRay', 'ekranYansima',
      'hareketBulanik', 'varil', 'lensHalka', 'kromatik', 'isikHuzmesi',
      'yagmurCizgi', 'karTanesi', 'tipiPerde'].every(a => T.dusuk[a] === 0);

    // ULTRA: hiçbir anahtar 0 kalmasın.
    r.ultraTamAcik = this.ANAHTARLAR.every(a => T.ultra[a] > 0);

    // Her kademede `ayar()` sayı döndürmeli (tablo değil, GERÇEK okuma yolu).
    const eskiKademe = this._kademe;
    let ayarSayi = true;
    K.forEach(k => {
      this._kademe = k;
      this.ANAHTARLAR.forEach(a => {
        const v = this.ayar(a);
        if (typeof v !== 'number' || !isFinite(v)) ayarSayi = false;
      });
    });
    this._kademe = eskiKademe;
    r.ayarSayiDonduruyor = ayarSayi;

    r.oneriGecerli = K.indexOf(this.oneri()) >= 0;
    r.allPass = Object.keys(r).every(k => k === 'allPass' || r[k] === true);
    return r;
  }
};

Kalite._tabloKur();

if (typeof window !== 'undefined') window.Kalite = Kalite;
