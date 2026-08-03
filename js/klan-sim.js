'use strict';
/* ============================================================================
   KlanSim — TOHUMLU BOT DÜNYASI (ADDITIVE, 2 Ağu 2026 · Ajan C)
   ============================================================================
   Oyun SUNUCUSUZ. Klan sisteminin rekabet tarafının anlamlı olması için
   "sahte ama tutarlı" bir dünya gerekiyor: 500 bot klan, 16 kademeli lig
   tablosu, ülke/bölge sıralamaları, ELO ve tahmin modelleri.

   🔴 TEK KURAL: **Aynı `haftaId` → aynı tablo.** Oyuncu her açılışta farklı
      sıralama görürse sistem sahte hissettirir ve tüm rekabet çöker.
      Bu yüzden `Math.random()` bu dosyada HİÇ kullanılmaz; `selfTest`
      `Math.random`'ı geçici olarak sarmalayıp çağrı sayısının 0 olduğunu
      ÖLÇEREK kanıtlar.

   ── PRNG ────────────────────────────────────────────────────────────────
   `_rng` = mulberry32, `js/procgen.js:4`'teki `_pg_rng` ile AYNI algoritma.
   🔴 `js/liveops.js:32`'deki düz çarpımlı `_lo_hash` KOPYALANMADI (sözleşme §7):
      düz `*` çarpım double'da yuvarlanır ve C# portunda `ulong` ile eşleşmez
      (20.005 vakada 19.724 hata ölçülmüş). `Math.imul` TAM 32-bit'tir →
      C#'ta `uint` ile birebir tutar. Bu dosyadaki `_hash32` de FNV-1a'nın
      `Math.imul`'lu sürümüdür.

   ── KAYNAK TASARIM ──────────────────────────────────────────────────────
     §5.4  — 16 kademeli lig (puan aralığı · çarpan · yükselme/düşme · klan sayısı)
     §12.2 — sezon takvimi (İlkbahar 1 Mart · Yaz 1 Haziran · Sonbahar 1 Eylül · Kış 1 Aralık)
     §12.3 — haftalık sıralama → sezon puanı katsayısı
     §29.5 — ELO (K=32)
     §31   — bölgesel / ülke bazlı lig
     §35   — ömür tahmini · aday skoru · savaş kazanma olasılığı

   ── DIŞ BAĞIMLILIKLAR (hepsi opsiyonel, `typeof` ile korunuyor — tuzak #10) ──
     `Klan.yasakliMi()`  → bot adları küfür filtresinden geçirilir
     `Klan.al()`         → oyuncunun klanı (lig/ülke tablosuna eklenir)
     `Ulke.kod()`        → oyuncunun ülkesi (varsayılan 'TR')
     `Bayraklar.T`       → ülke kodları (193 ülke, yeni liste YAZILMADI)

   ── TASARIMDAN SAPMALAR (gerekçeli) ─────────────────────────────────────
   S1. §5.4 "Klan Sayısı" sütunu toplam **37.550** klan diyor; tek cihazda
       500 bot üretiliyor. Sütun **oran olarak** korunur: en büyük kalan
       (Hare) yöntemiyle 500'e ölçeklenir, her kademeye **en az 1** klan
       verilir. Aksi hâlde Efsane 0,33 klan → tavan ligi BOŞ olurdu ve
       yükselme hedefi anlamsızlaşırdı. Kota ELLE YAZILMAZ, türetilir.
   S2. §5.4'te Efsane'nin üst sınırı yok ("12.000.001+"). Puan üretiminde
       tavan `min + 8.000.000` alındı (sonsuz aralıktan örnekleme yapılamaz).
   S3. §31 "ana bölge" seçimini oyuncuya bırakıyor; oyunda böyle bir ayar
       YOK. Bölge, `js/ulke.js`'in zaten tuttuğu ülke kodundan TÜRETİLİR.
   S4. Bu bir Türkiye pazarı oyunu → 500 botun **60'ı (%12)** TR'ye sabitlenir,
       gerisi ağırlıklı çekilişle dağıtılır. Böylece TR seçili oyuncunun
       ülke tablosunda her zaman yeterli rakip olur. Nadir bir ülke seçilirse
       `ulkeTablosu` o ülkeye özel TOHUMLU ek botlar üretir (en az 40).
   ============================================================================ */

const KlanSim = {
  version: '1.0',
  ad: 'klanSim',

  // Bot sayısı ve ülke tablosu tabanı
  BOT_SAYISI: 500,
  ULKE_MIN: 40,          // ulkeTablosu'nda en az bu kadar rakip olsun (S4)
  TR_TABAN: 60,          // 500 botun kaçı TR (S4)
  HAFTA_MS: 604800000,   // 7 * 86400000 — js/social.js:28 `ClanWar.weekId()` ile AYNI
  ELO_K: 32,             // §29.5
  ELO_TABAN: 1000,

  _testZaman: null,      // test kancası; canlıda daima null

  // ═══════════════════════════════════════════════════════════════
  //  §5.4 — 16 KADEMELİ LİG (tablodan AYNEN)
  // ═══════════════════════════════════════════════════════════════
  // max: o kademenin ÜST sınırı (dahil). Efsane sonsuz → `Infinity`.
  // yuk: "Yükselme (İlk kaç)"  ·  dus: "Düşme (Son kaç)"
  // odul: "Ödül Çarpanı"  ·  klanSayisi: tasarımdaki dünya nüfusu (S1)
  LIG: [
    { id: 'bronz3',  lig: 'Bronz',  kademe: 'III', min: 0,        max: 50000,    carpan: 1.0, yuk: 3, dus: 0, odul: 1.0, klanSayisi: 10000, renk: '#b07a4a' },
    { id: 'bronz2',  lig: 'Bronz',  kademe: 'II',  min: 50001,    max: 100000,   carpan: 1.1, yuk: 2, dus: 2, odul: 1.1, klanSayisi: 8000,  renk: '#b07a4a' },
    { id: 'bronz1',  lig: 'Bronz',  kademe: 'I',   min: 100001,   max: 200000,   carpan: 1.2, yuk: 1, dus: 2, odul: 1.2, klanSayisi: 6000,  renk: '#b07a4a' },
    { id: 'gumus3',  lig: 'Gümüş',  kademe: 'III', min: 200001,   max: 350000,   carpan: 1.3, yuk: 2, dus: 2, odul: 1.3, klanSayisi: 4000,  renk: '#c8ccd6' },
    { id: 'gumus2',  lig: 'Gümüş',  kademe: 'II',  min: 350001,   max: 500000,   carpan: 1.5, yuk: 2, dus: 2, odul: 1.5, klanSayisi: 3000,  renk: '#c8ccd6' },
    { id: 'gumus1',  lig: 'Gümüş',  kademe: 'I',   min: 500001,   max: 750000,   carpan: 1.7, yuk: 1, dus: 2, odul: 1.7, klanSayisi: 2000,  renk: '#c8ccd6' },
    { id: 'altin3',  lig: 'Altın',  kademe: 'III', min: 750001,   max: 1000000,  carpan: 2.0, yuk: 2, dus: 2, odul: 2.0, klanSayisi: 1500,  renk: '#e8b23a' },
    { id: 'altin2',  lig: 'Altın',  kademe: 'II',  min: 1000001,  max: 1500000,  carpan: 2.3, yuk: 2, dus: 2, odul: 2.3, klanSayisi: 1000,  renk: '#e8b23a' },
    { id: 'altin1',  lig: 'Altın',  kademe: 'I',   min: 1500001,  max: 2000000,  carpan: 2.6, yuk: 1, dus: 2, odul: 2.6, klanSayisi: 800,   renk: '#e8b23a' },
    { id: 'platin3', lig: 'Platin', kademe: 'III', min: 2000001,  max: 3000000,  carpan: 3.0, yuk: 2, dus: 2, odul: 3.0, klanSayisi: 500,   renk: '#7fe0d0' },
    { id: 'platin2', lig: 'Platin', kademe: 'II',  min: 3000001,  max: 4500000,  carpan: 3.5, yuk: 2, dus: 2, odul: 3.5, klanSayisi: 300,   renk: '#7fe0d0' },
    { id: 'platin1', lig: 'Platin', kademe: 'I',   min: 4500001,  max: 6000000,  carpan: 4.0, yuk: 1, dus: 2, odul: 4.0, klanSayisi: 200,   renk: '#7fe0d0' },
    { id: 'elmas3',  lig: 'Elmas',  kademe: 'III', min: 6000001,  max: 8000000,  carpan: 4.5, yuk: 2, dus: 2, odul: 4.5, klanSayisi: 100,   renk: '#6ad2ff' },
    { id: 'elmas2',  lig: 'Elmas',  kademe: 'II',  min: 8000001,  max: 10000000, carpan: 5.0, yuk: 2, dus: 2, odul: 5.0, klanSayisi: 75,    renk: '#6ad2ff' },
    { id: 'elmas1',  lig: 'Elmas',  kademe: 'I',   min: 10000001, max: 12000000, carpan: 5.5, yuk: 1, dus: 2, odul: 5.5, klanSayisi: 50,    renk: '#6ad2ff' },
    { id: 'efsane',  lig: 'Efsane', kademe: '',    min: 12000001, max: Infinity, carpan: 6.0, yuk: 0, dus: 3, odul: 6.0, klanSayisi: 25,    renk: '#e06ad2' }
  ],
  EFSANE_TAVAN_EK: 8000000,   // S2

  // §12.3 — haftalık sıralama → sezon puanı katsayısı
  SEZON_KATSAYI: [
    { enFazla: 1,   k: 5.0 },
    { enFazla: 3,   k: 4.0 },
    { enFazla: 10,  k: 3.0 },
    { enFazla: 25,  k: 2.5 },
    { enFazla: 50,  k: 2.0 },
    { enFazla: 100, k: 1.5 },
    { enFazla: 500, k: 1.0 },
    { enFazla: Infinity, k: 0.5 }
  ],

  // 6 klan sınıfı (§30.2) — `Klan.SINIF` ile aynı anahtarlar
  SINIFLAR: ['yarisci', 'akrobat', 'hazineavcisi', 'savaslord', 'diplomat', 'muhendis'],

  // Amblem havuzu (Ajan G'nin çizeceği amblem indeksleri) ve renk paleti.
  // 🔴 Renkler HEX olmalı — `_drawCard` accent + '33' diye alfa ekler (tuzak #5).
  AMBLEM_SAYISI: 24,
  _RENK: [
    '#e8b23a', '#e0553a', '#3aa0e8', '#48c48a', '#c46ae8', '#e08a3a',
    '#8a93a8', '#6ad2ff', '#e06ad2', '#7fe0d0', '#b07a4a', '#d6d94a',
    '#4a6ed9', '#d94a7a', '#4ad98f', '#a84ad9', '#d9784a', '#4ad9d0'
  ],
  _RENK2: ['#1d2a44', '#22182e', '#12242a', '#2a1d1d', '#181f2e', '#26221a'],

  // ═══════════════════════════════════════════════════════════════
  //  AD HAVUZU — Türkçe + uluslararası karışık
  // ═══════════════════════════════════════════════════════════════
  // 🔴 `Klan.RE_AD` = /^[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s]{3,20}$/ — kesme işareti,
  //    tire, nokta YASAK ve ad 20 karakteri AŞAMAZ. Havuzdaki her kelime
  //    buna göre seçildi; üretim sırasında ayrıca ölçülüp uzun olan elenir.
  _SIFAT_TR: [
    'Çelik', 'Ateşli', 'Kara', 'Yıldız', 'Vahşi', 'Gölge', 'Altın', 'Demir',
    'Şimşek', 'Fırtına', 'Kızıl', 'Hızlı', 'Cesur', 'Yıkıcı', 'Sonsuz',
    'Gizli', 'Yeşil', 'Mavi', 'Beyaz', 'Ölümsüz', 'Zirve', 'Yalnız', 'Asi',
    'Kudretli', 'Soğuk', 'Yanan', 'Bozkır', 'Anadolu', 'Ege', 'Toros',
    'Bengi', 'Uçan', 'Sessiz', 'Keskin', 'Tunç', 'Bakır', 'Gümüş', 'Buzlu',
    'Çılgın', 'Korkusuz'
  ],
  _ISIM_TR: [
    'Şahinler', 'Kurtlar', 'Kartallar', 'Aslanlar', 'Ejderler', 'Yolcular',
    'Tepeler', 'Yıldızlar', 'Ustalar', 'Krallar', 'Ruhlar', 'Atlılar',
    'Avcılar', 'Gezginler', 'Fırtınalar', 'Alevler', 'Zirveler', 'Motorlar',
    'Tekerler', 'Pilotlar', 'Kahramanlar', 'Kaşifler', 'Efsaneler',
    'Gölgeler', 'Korucular', 'Panterler', 'Ayılar', 'Boğalar', 'Doruklar',
    'Yarışçılar'
  ],
  _SIFAT_EN: [
    'Neon', 'Turbo', 'Nitro', 'Iron', 'Wild', 'Dark', 'Royal', 'Rapid',
    'Alpha', 'Omega', 'Crimson', 'Silver', 'Thunder', 'Storm', 'Savage',
    'Phantom', 'Rogue', 'Quantum', 'Titan', 'Vortex', 'Blaze', 'Frost',
    'Hyper', 'Prime', 'Nova', 'Apex', 'Cyber', 'Delta', 'Echo', 'Solar',
    'Lunar', 'Atomic', 'Vector', 'Onyx', 'Ember', 'Zenith'
  ],
  _ISIM_EN: [
    'Riders', 'Racers', 'Drivers', 'Wolves', 'Eagles', 'Hawks', 'Titans',
    'Legends', 'Rebels', 'Raiders', 'Wheels', 'Engines', 'Pistons',
    'Bandits', 'Rangers', 'Knights', 'Vipers', 'Falcons', 'Hunters',
    'Climbers', 'Squad', 'Crew', 'Force', 'Union', 'Kings', 'Ghosts',
    'Blades', 'Storms', 'Comets', 'Pilots', 'Racing', 'Drift'
  ],

  // ═══════════════════════════════════════════════════════════════
  //  ÜLKE AĞIRLIKLARI + BÖLGE (§31) — `js/ulke.js` / `js/bayraklar.js`
  //  ZATEN 193 ülkeyi tutuyor; BURADA YENİ ÜLKE LİSTESİ YAZILMADI.
  //  Buradaki tablo yalnız "hangi ülkede kaç bot klan olsun" ağırlığıdır.
  // ═══════════════════════════════════════════════════════════════
  _ULKE_AGIRLIK: {
    TR: 90, US: 46, BR: 24, DE: 30, GB: 22, RU: 20, FR: 18, IT: 16, ES: 15,
    PL: 14, ID: 14, IN: 15, MX: 13, JP: 12, KR: 11, NL: 10, UA: 9, AR: 9,
    CA: 9, AU: 8, EG: 8, SA: 8, SE: 8, AZ: 7, DZ: 7, MA: 7, PH: 7, TH: 7,
    VN: 7, PK: 7, IR: 7, NG: 7, ZA: 6, RO: 6, PT: 6, GR: 6, BG: 5, RS: 5,
    CZ: 5, HU: 5, AT: 5, CH: 5, BE: 5, CL: 5, CO: 5, MY: 5, NO: 4, DK: 4,
    FI: 4, IE: 4, IL: 4, PE: 4, VE: 4, KZ: 4, UZ: 4, BD: 4, TN: 4, IQ: 4,
    SG: 3, NZ: 3, HR: 3, SK: 3, LT: 3
  },
  _BOLGE: {
    avrupa: ['TR', 'DE', 'GB', 'RU', 'FR', 'IT', 'ES', 'PL', 'NL', 'UA', 'SE',
      'RO', 'PT', 'GR', 'BG', 'RS', 'CZ', 'HU', 'AT', 'CH', 'BE', 'NO', 'DK',
      'FI', 'IE', 'HR', 'SK', 'LT'],
    asya: ['ID', 'IN', 'JP', 'KR', 'SA', 'AZ', 'PH', 'TH', 'VN', 'PK', 'IR',
      'IL', 'KZ', 'UZ', 'BD', 'IQ', 'SG', 'MY'],
    amerika: ['US', 'BR', 'MX', 'AR', 'CA', 'CL', 'CO', 'PE', 'VE'],
    afrika: ['EG', 'DZ', 'MA', 'NG', 'ZA', 'TN'],
    okyanusya: ['AU', 'NZ']
  },

  // ═══════════════════════════════════════════════════════════════
  //  TOHUMLU ÜRETEÇ — Math.imul tabanlı (Math.random YASAK)
  // ═══════════════════════════════════════════════════════════════
  // mulberry32 — `js/procgen.js:4` `_pg_rng` ile AYNI algoritma.
  _rng(tohum) {
    let a = (tohum >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // FNV-1a — 🔴 `Math.imul` ile (düz `*` DEĞİL, sözleşme §7 / tuzak D16).
  _hash32(metin) {
    const s = String(metin);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },
  _tam(rnd, alt, ust) { return alt + Math.floor(rnd() * (ust - alt + 1)); },
  _sec(rnd, dizi) { return dizi[Math.floor(rnd() * dizi.length) % dizi.length]; },
  _kis(v, alt, ust) { return v < alt ? alt : (v > ust ? ust : v); },
  _sayi(v, vars) { const n = Number(v); return isFinite(n) ? n : (vars || 0); },
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },

  // ═══════════════════════════════════════════════════════════════
  //  ZAMAN KİMLİKLERİ
  // ═══════════════════════════════════════════════════════════════
  // 🔴 `js/social.js:28` `ClanWar.weekId()` ile BİREBİR aynı olmalı:
  //    `Math.floor(Date.now() / (7 * 86400000))`
  haftaId(zaman) {
    const t = (zaman == null) ? this._simdi() : Number(zaman);
    return Math.floor(t / this.HAFTA_MS);
  },
  // §12.2 — İlkbahar 1 Mart · Yaz 1 Haziran · Sonbahar 1 Eylül · Kış 1 Aralık.
  // ⚠ Kış Aralık'ta BAŞLAR ve Şubat'ta biter → Ocak/Şubat bir ÖNCEKİ yılın kışıdır.
  sezonId(zaman) {
    const d = new Date((zaman == null) ? this._simdi() : Number(zaman));
    const y = d.getFullYear(), ay = d.getMonth() + 1;
    if (ay >= 3 && ay <= 5) return y + '-ilkbahar';
    if (ay >= 6 && ay <= 8) return y + '-yaz';
    if (ay >= 9 && ay <= 11) return y + '-sonbahar';
    return (ay === 12 ? y : y - 1) + '-kis';
  },
  // Sezonun kaçıncı haftasındayız (§12.1 "3 ay" ≈ 12-13 hafta)
  sezonHaftasi(zaman) {
    const t = (zaman == null) ? this._simdi() : Number(zaman);
    const d = new Date(t);
    const y = d.getFullYear(), ay = d.getMonth() + 1;
    let bY = y, bAy;
    if (ay >= 3 && ay <= 5) bAy = 3;
    else if (ay >= 6 && ay <= 8) bAy = 6;
    else if (ay >= 9 && ay <= 11) bAy = 9;
    else { bAy = 12; if (ay !== 12) bY = y - 1; }
    const bas = new Date(bY, bAy - 1, 1, 0, 0, 0, 0).getTime();
    return Math.max(1, Math.floor((t - bas) / this.HAFTA_MS) + 1);
  },

  // ═══════════════════════════════════════════════════════════════
  //  §5.4 LİG YARDIMCILARI
  // ═══════════════════════════════════════════════════════════════
  ligBul(ligPuan) {
    const p = Math.max(0, Math.floor(this._sayi(ligPuan, 0)));
    for (let i = 0; i < this.LIG.length; i++) {
      if (p >= this.LIG[i].min && p <= this.LIG[i].max) {
        return { indeks: i, id: this.LIG[i].id, ad: this._ligAdi(i), veri: this.LIG[i] };
      }
    }
    // Ulaşılamaz (Efsane max = Infinity) ama savunmacı dal duruyor.
    const s = this.LIG.length - 1;
    return { indeks: s, id: this.LIG[s].id, ad: this._ligAdi(s), veri: this.LIG[s] };
  },
  _ligAdi(i) {
    const l = this.LIG[i];
    return l.kademe ? (l.lig + ' ' + l.kademe) : l.lig;
  },
  ligIndeksi(ligId) {
    for (let i = 0; i < this.LIG.length; i++) if (this.LIG[i].id === ligId) return i;
    return -1;
  },
  // §5.4 "Yükselme (İlk kaç)" / "Düşme (Son kaç)".
  // `toplam` verilmezse o kademenin bot kotası + 1 (oyuncu) varsayılır.
  ligGecis(mevcutLig, siralama, toplam) {
    const i = (typeof mevcutLig === 'number') ? mevcutLig : this.ligIndeksi(String(mevcutLig));
    if (i < 0 || i >= this.LIG.length) return { yon: 'kalma', yeniLig: null, hata: 'ERR_LIG' };
    const l = this.LIG[i];
    const s = Math.max(1, Math.floor(this._sayi(siralama, 1)));
    const n = (toplam == null) ? (this.kota()[i] + 1) : Math.max(1, Math.floor(this._sayi(toplam, 1)));
    // 🔴 GRUP BÜYÜKLÜĞÜ KORUMASI (selfTest yakaladı): §5.4 sayıları 37.550
    //    klanlık dünyaya göre yazılmış. 500'e ölçeklenince Efsane'de 1 bot +
    //    oyuncu = 2 klan kalıyor; ham kural ("son 3 düşer") BİRİNCİYİ BİLE
    //    düşürüyordu. Kural yalnız grup hem yükselme hem düşme bölgesini
    //    barındırabilecek kadar büyükse uygulanır.
    if (l.yuk > 0 && i < this.LIG.length - 1 && n > l.yuk && s <= l.yuk) {
      return { yon: 'yukselme', yeniLig: this.LIG[i + 1].id, indeks: i + 1, ad: this._ligAdi(i + 1) };
    }
    if (l.dus > 0 && i > 0 && n > l.yuk + l.dus && s > n - l.dus) {
      return { yon: 'dusme', yeniLig: this.LIG[i - 1].id, indeks: i - 1, ad: this._ligAdi(i - 1) };
    }
    return { yon: 'kalma', yeniLig: l.id, indeks: i, ad: this._ligAdi(i) };
  },
  // §12.3 — haftalık sıralamanın sezon puanı katsayısı
  sezonKatsayi(siralama) {
    const s = Math.max(1, Math.floor(this._sayi(siralama, 9999)));
    for (let i = 0; i < this.SEZON_KATSAYI.length; i++) {
      if (s <= this.SEZON_KATSAYI[i].enFazla) return this.SEZON_KATSAYI[i].k;
    }
    return 0.5;
  },

  // ── Kota (S1): §5.4 "Klan Sayısı" oranını 500'e ölçekle ────────────────
  // 🔴 ELLE YAZILMAZ, türetilir. En büyük kalan (Hare) + her kademeye en az 1.
  _kotaOnbellek: null,
  kota(toplam) {
    const T = (toplam == null) ? this.BOT_SAYISI : Math.floor(toplam);
    if (toplam == null && this._kotaOnbellek) return this._kotaOnbellek;
    const n = this.LIG.length;
    let taban = 0;
    for (let i = 0; i < n; i++) taban += this.LIG[i].klanSayisi;
    const kalan = Math.max(0, T - n);        // her kademeye 1 taban ayrıldı
    const pay = [], kesir = [];
    let dagitilan = 0;
    for (let i = 0; i < n; i++) {
      const x = kalan * this.LIG[i].klanSayisi / taban;
      const f = Math.floor(x);
      pay.push(f); kesir.push({ i: i, k: x - f }); dagitilan += f;
    }
    // ⚠ Kararlı sıralama: eşit kesirde küçük indeks (büyük lig) önce gelir —
    //    yoksa aynı girdi farklı motorlarda farklı kota üretebilirdi.
    kesir.sort(function (a, b) { return (b.k - a.k) || (a.i - b.i); });
    const eksik = kalan - dagitilan;
    for (let j = 0; j < eksik && j < kesir.length; j++) pay[kesir[j].i]++;
    for (let i = 0; i < n; i++) pay[i] += 1;
    if (toplam == null) this._kotaOnbellek = pay;
    return pay;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §29.5 — ELO
  // ═══════════════════════════════════════════════════════════════
  //   Beklenen = 1 / (1 + 10^((Rakip - Bizim) / 400))
  //   Yeni     = Eski + K × (Sonuç - Beklenen)        K = 32
  eloBeklenen(bizim, rakip) {
    const a = this._sayi(bizim, this.ELO_TABAN), b = this._sayi(rakip, this.ELO_TABAN);
    return 1 / (1 + Math.pow(10, (b - a) / 400));
  },
  elo(bizim, rakip, sonuc) {
    const a = this._sayi(bizim, this.ELO_TABAN);
    const s = this._kis(this._sayi(sonuc, 0), 0, 1);
    return a + this.ELO_K * (s - this.eloBeklenen(a, rakip));
  },
  // Turnuva tohumu (§29.5): ELO'ya göre AZALAN, kararlı (id ile tie-break)
  // ⚠ Girdiyi DEĞİŞTİRMEZ (önbellekteki bot nesnelerine `tohum` yazmaz) — bkz.
  //   `_kopya` notundaki önbellek kirlenmesi tuzağı.
  tohumla(klanlar) {
    const l = [];
    if (Array.isArray(klanlar)) for (let i = 0; i < klanlar.length; i++) l.push(this._kopya(klanlar[i]));
    l.sort(function (a, b) {
      const ea = Number(a && a.elo) || 0, eb = Number(b && b.elo) || 0;
      if (eb !== ea) return eb - ea;
      const ia = String(a && a.id), ib = String(b && b.id);
      return ia < ib ? -1 : (ia > ib ? 1 : 0);
    });
    for (let i = 0; i < l.length; i++) l[i].tohum = i + 1;
    return l;
  },

  // ═══════════════════════════════════════════════════════════════
  //  BOT ÜRETİMİ
  // ═══════════════════════════════════════════════════════════════
  _onbellek: {},          // haftaId -> 500 klan
  _onbellekSira: [],      // en fazla 3 hafta tutulur (bellek sızıntısı yok)
  _ist: { isabet: 0, kacirma: 0, adRet: 0, etiketRet: 0 },

  botKlanlar(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const anahtar = String(h);
    if (Object.prototype.hasOwnProperty.call(this._onbellek, anahtar)) {
      this._ist.isabet++;
      return this._onbellek[anahtar];
    }
    this._ist.kacirma++;
    const liste = this._uret(h);
    this._onbellek[anahtar] = liste;
    this._onbellekSira.push(anahtar);
    while (this._onbellekSira.length > 3) {
      const eski = this._onbellekSira.shift();
      delete this._onbellek[eski];
    }
    return liste;
  },
  onbellegiTemizle() {
    this._onbellek = {}; this._onbellekSira = [];
    this._ist = { isabet: 0, kacirma: 0, adRet: 0, etiketRet: 0 };
    return true;
  },

  // Küfür/yasaklı kelime süzgeci — `Klan.yasakliMi()` varsa ONDAN geçir.
  _yasakli(metin) {
    try {
      const K = (typeof Klan !== 'undefined') ? Klan
        : ((typeof window !== 'undefined' && window.Klan) ? window.Klan : null);
      if (K && typeof K.yasakliMi === 'function') return K.yasakliMi(metin) === true;
    } catch (e) { }
    return false;
  },

  // Ad üret — havuzdan sıfat + isim. Aile içi eşleştirme ağırlıklı
  // (TR sıfat + TR isim), %14 çapraz ("Neon Şahinler" gibi gerçek örnekler var).
  _adUret(rnd, adSet) {
    for (let deneme = 0; deneme < 400; deneme++) {
      const trAile = rnd() < 0.55;
      const caprazSifat = rnd() < 0.14;
      const sifatHavuz = (trAile !== caprazSifat) ? this._SIFAT_TR : this._SIFAT_EN;
      const isimHavuz = trAile ? this._ISIM_TR : this._ISIM_EN;
      const ad = this._sec(rnd, sifatHavuz) + ' ' + this._sec(rnd, isimHavuz);
      if (ad.length < 3 || ad.length > 20) { this._ist.adRet++; continue; }   // Klan.RE_AD
      if (adSet[ad]) { this._ist.adRet++; continue; }
      if (this._yasakli(ad)) { this._ist.adRet++; continue; }
      adSet[ad] = 1;
      return ad;
    }
    // Havuz tükendi (500'de olmuyor) — sayı ekiyle benzersizleştir.
    let n = 2;
    while (n < 9999) {
      const ad = 'Klan ' + n;
      if (!adSet[ad]) { adSet[ad] = 1; return ad; }
      n++;
    }
    return 'Klan';
  },

  // Etiket üret — 🔴 `Klan.RE_ETIKET` = /^[A-Z]{3,4}$/ : YALNIZ A-Z, 3-4 harf.
  //   Rakam/karakter YASAK → çakışmayı harf değiştirerek çöz.
  _HARF: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  _etiketUret(ad, rnd, etiketSet) {
    const ascii = String(ad).toUpperCase()
      .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
      .replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/İ/g, 'I').replace(/I/g, 'I')
      .replace(/[^A-Z ]/g, '');
    const kelimeler = ascii.split(/\s+/).filter(function (k) { return k.length > 0; });
    let taban = '';
    for (let i = 0; i < kelimeler.length && taban.length < 4; i++) taban += kelimeler[i][0];
    const duz = kelimeler.join('');
    for (let i = 0; taban.length < 4 && i < duz.length; i++) {
      if (duz[i] !== taban[0]) taban += duz[i];
    }
    taban = (taban + 'KLN').slice(0, 4);
    if (!etiketSet[taban]) { etiketSet[taban] = 1; return taban; }
    this._ist.etiketRet++;
    // 4. harfi sırayla değiştir
    for (let i = 0; i < 26; i++) {
      const e = taban.slice(0, 3) + this._HARF[i];
      if (!etiketSet[e]) { etiketSet[e] = 1; return e; }
    }
    // 3. harfi de değiştir
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const e = taban.slice(0, 2) + this._HARF[i] + this._HARF[j];
        if (!etiketSet[e]) { etiketSet[e] = 1; return e; }
      }
    }
    // Tamamen tohumlu çekiliş (456.976 kombinasyon → asla tükenmez)
    for (let d = 0; d < 5000; d++) {
      let e = '';
      for (let i = 0; i < 4; i++) e += this._HARF[Math.floor(rnd() * 26) % 26];
      if (!etiketSet[e]) { etiketSet[e] = 1; return e; }
    }
    return taban;
  },

  // Ülke dağıtımı: ağırlıklı tohumlu çekiliş. S4 gereği ilk `TR_TABAN` klan TR.
  _ulkeAgirlikListesi: null,
  _ulkeHavuz() {
    if (this._ulkeAgirlikListesi) return this._ulkeAgirlikListesi;
    const kodlar = [], kum = [];
    let t = 0;
    for (const k in this._ULKE_AGIRLIK) {
      if (!Object.prototype.hasOwnProperty.call(this._ULKE_AGIRLIK, k)) continue;
      const a = this._ULKE_AGIRLIK[k];
      if (!(a > 0) || !/^[A-Z]{2}$/.test(k)) continue;   // 'RS2' gibi hatalı satırı ele
      t += a; kodlar.push(k); kum.push(t);
    }
    this._ulkeAgirlikListesi = { kodlar: kodlar, kum: kum, toplam: t };
    return this._ulkeAgirlikListesi;
  },
  _ulkeSec(rnd) {
    const h = this._ulkeHavuz();
    const x = rnd() * h.toplam;
    // ikili arama — kararlı ve O(log n)
    let lo = 0, hi = h.kum.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (x < h.kum[m]) hi = m; else lo = m + 1;
    }
    return h.kodlar[lo];
  },
  bolge(ulkeKodu) {
    const k = String(ulkeKodu || '').toUpperCase();
    for (const b in this._BOLGE) {
      if (!Object.prototype.hasOwnProperty.call(this._BOLGE, b)) continue;
      if (this._BOLGE[b].indexOf(k) >= 0) return b;
    }
    return 'dunya';
  },

  // ── Tek bot klanın alanlarını üret ────────────────────────────────────
  // `ligIx` dışarıdan verilir (kota ile), böylece §5.4 dağılımı korunur.
  _klanUret(tohum, id, ligIx, ulkeKodu, adSet, etiketSet) {
    const rnd = this._rng(tohum);
    const L = this.LIG[ligIx];
    const tavan = (L.max === Infinity) ? (L.min + this.EFSANE_TAVAN_EK) : L.max;   // S2
    const ligPuan = this._tam(rnd, L.min, tavan);

    const ad = this._adUret(rnd, adSet);
    const etiket = this._etiketUret(ad, rnd, etiketSet);

    const uyeSayisi = this._kis(Math.round(6 + ligIx * 1.35 + rnd() * 8), 3, 30);
    const aktifUye = this._kis(Math.round(uyeSayisi * (0.35 + rnd() * 0.55)), 1, uyeSayisi);
    const seviye = this._kis(Math.round(3 + ligIx * 2.85 + rnd() * 8), 1, 50);
    // Haftalık puan = lig puanının %3-10'u (sezon 12-13 haftalık birikim, §12.3)
    const haftalikPuan = Math.max(1, Math.round(ligPuan * (0.03 + rnd() * 0.07)));
    const elo = Math.round(this.ELO_TABAN + ligIx * 62 + rnd() * 90 - 45);

    const savasToplam = Math.round(rnd() * 40 + ligIx * 3);
    const kazanmaOran = this._kis(0.30 + (ligIx / 15) * 0.35 + (rnd() - 0.5) * 0.24, 0.05, 0.95);
    const savasGalibiyet = this._kis(Math.round(savasToplam * kazanmaOran), 0, savasToplam);

    return {
      id: id,
      ad: ad,
      etiket: etiket,
      amblem: Math.floor(rnd() * this.AMBLEM_SAYISI),
      renk1: this._sec(rnd, this._RENK),
      renk2: this._sec(rnd, this._RENK2),
      seviye: seviye,
      lig: L.id,
      ligPuan: ligPuan,
      haftalikPuan: haftalikPuan,
      uyeSayisi: uyeSayisi,
      elo: elo,
      ulkeKodu: ulkeKodu,
      sinif: (seviye >= 15) ? this._sec(rnd, this.SINIFLAR) : null,   // §30.2 sınıf sv15
      savasGecmisi: {
        toplam: savasToplam,
        galibiyet: savasGalibiyet,
        maglubiyet: savasToplam - savasGalibiyet,
        seri: Math.floor(rnd() * 6)
      },
      // ── §35 tahmin modelleri için ek alanlar (additive) ──
      bolge: this.bolge(ulkeKodu),
      aktifUye: aktifUye,
      yeniUye: Math.floor(rnd() * 5),
      ayrilanUye: Math.floor(rnd() * 5),
      haftalikTrend: Math.round((rnd() * 2 - 1) * 100) / 100,   // -1..+1
      liderSonAktifGun: Math.floor(rnd() * 12),
      ortKatki: Math.round(haftalikPuan / Math.max(1, uyeSayisi)),
      bot: true
    };
  },

  // ── 500 klanı üret (TOHUMLU) ──────────────────────────────────────────
  _uret(haftaId) {
    const N = this.BOT_SAYISI;
    const kota = this.kota();
    // 1) Lig dizisi: kota kadar tekrar
    const ligDizi = [];
    for (let i = 0; i < kota.length; i++) for (let j = 0; j < kota[i]; j++) ligDizi.push(i);
    // 2) Fisher-Yates (tohumlu) — id numarası ligi ele vermesin
    const kar = this._rng(this._hash32('karistir:' + haftaId));
    for (let i = ligDizi.length - 1; i > 0; i--) {
      const j = Math.floor(kar() * (i + 1)) % (i + 1);
      const t = ligDizi[i]; ligDizi[i] = ligDizi[j]; ligDizi[j] = t;
    }
    // 3) Ülkeler — ilk TR_TABAN klan TR (S4), gerisi ağırlıklı çekiliş
    const ur = this._rng(this._hash32('ulke:' + haftaId));
    const ulkeler = [];
    for (let i = 0; i < N; i++) ulkeler.push(i < this.TR_TABAN ? 'TR' : this._ulkeSec(ur));

    const adSet = {}, etiketSet = {}, liste = [];
    const on = 'B' + haftaId.toString(36).toUpperCase() + '-';
    for (let i = 0; i < N; i++) {
      const id = on + i;
      liste.push(this._klanUret(this._hash32('klan:' + haftaId + ':' + i), id,
        ligDizi[i % ligDizi.length], ulkeler[i], adSet, etiketSet));
    }
    return liste;
  },

  // ═══════════════════════════════════════════════════════════════
  //  SIRALAMA — 🔴 KARARLI VE TAM (eşit puanda bile tek bir doğru sıra)
  // ═══════════════════════════════════════════════════════════════
  // JS `sort` ES2019+ kararlıdır ama girdi sırası değişirse sonuç da değişir.
  // Bu yüzden tie-break AÇIKÇA yazılır: ligPuan ↓ → elo ↓ → id ↑ (benzersiz).
  _kars(a, b) {
    const pa = Number(a.ligPuan) || 0, pb = Number(b.ligPuan) || 0;
    if (pb !== pa) return pb - pa;
    const ea = Number(a.elo) || 0, eb = Number(b.elo) || 0;
    if (eb !== ea) return eb - ea;
    const ia = String(a.id), ib = String(b.id);
    return ia < ib ? -1 : (ia > ib ? 1 : 0);
  },
  // 🔴 ÖNBELLEK KİRLENMESİ TUZAĞI (selfTest yakaladı): ilk sürüm `siralama`yı
  //    doğrudan bot nesnesine yazıyordu. Botlar ÖNBELLEKTE paylaşıldığı için
  //    `ligTablosu` çağrısı `botKlanlar()`ın çıktısını kalıcı olarak
  //    değiştiriyordu → "aynı haftaId → aynı tablo" garantisi KIRILIYORDU
  //    (determinizmAyniHafta = false ölçüldü). Artık KOPYA numaralanır.
  _kopya(k) {
    const o = {};
    for (const a in k) if (Object.prototype.hasOwnProperty.call(k, a)) o[a] = k[a];
    if (k.savasGecmisi) {
      o.savasGecmisi = {
        toplam: k.savasGecmisi.toplam, galibiyet: k.savasGecmisi.galibiyet,
        maglubiyet: k.savasGecmisi.maglubiyet, seri: k.savasGecmisi.seri
      };
    }
    return o;
  },
  _siralaVeNumarala(liste) {
    const l = [];
    for (let i = 0; i < liste.length; i++) l.push(this._kopya(liste[i]));
    l.sort(this._kars);
    for (let i = 0; i < l.length; i++) l[i].siralama = i + 1;
    return l;
  },

  // Oyuncunun klanını tablo girdisine çevir. `oyuncuPuan` verilirse o kullanılır.
  _oyuncuGirdisi(oyuncuPuan) {
    let k = null;
    try {
      const K = (typeof Klan !== 'undefined') ? Klan
        : ((typeof window !== 'undefined' && window.Klan) ? window.Klan : null);
      if (K && typeof K.al === 'function') k = K.al();
    } catch (e) { k = null; }
    const puanVerildi = (oyuncuPuan != null && isFinite(Number(oyuncuPuan)));
    if (!k && !puanVerildi) return null;
    const puan = puanVerildi ? Math.max(0, Math.floor(Number(oyuncuPuan)))
      : Math.max(0, Math.floor(this._sayi(k.ligPuan, 0)));
    const L = this.ligBul(puan);
    return {
      id: 'OYUNCU',
      ad: (k && k.ad) ? k.ad : 'Senin Klanın',
      etiket: (k && k.etiket) ? k.etiket : 'SEN',
      amblem: (k && k.amblem != null) ? k.amblem : 0,
      renk1: (k && k.renk1) ? k.renk1 : '#e8b23a',
      renk2: (k && k.renk2) ? k.renk2 : '#1d2a44',
      seviye: (k) ? Math.max(1, Math.floor(this._sayi(k.seviye, 1))) : 1,
      lig: L.id,
      ligPuan: puan,
      haftalikPuan: (k) ? Math.max(0, Math.floor(this._sayi(k.haftalikPuan, 0))) : 0,
      uyeSayisi: (k && Array.isArray(k.uyeler)) ? k.uyeler.length : 1,
      elo: (k && isFinite(Number(k.elo))) ? Number(k.elo) : this.ELO_TABAN,
      ulkeKodu: this.oyuncuUlkesi(),
      sinif: (k && k.sinif) ? k.sinif : null,
      savasGecmisi: {
        toplam: (k) ? this._sayi(k.savasToplam, 0) : 0,
        galibiyet: (k) ? this._sayi(k.savasKazanilan, 0) : 0,
        maglubiyet: (k) ? Math.max(0, this._sayi(k.savasToplam, 0) - this._sayi(k.savasKazanilan, 0)) : 0,
        seri: 0
      },
      bolge: this.bolge(this.oyuncuUlkesi()),
      aktifUye: (k && Array.isArray(k.uyeler)) ? k.uyeler.length : 1,
      yeniUye: (k) ? this._sayi(k.haftalikYeni, 0) : 0,
      ayrilanUye: (k) ? this._sayi(k.haftalikAyrilan, 0) : 0,
      haftalikTrend: 0,
      liderSonAktifGun: 0,
      ortKatki: 0,
      bot: false,
      oyuncu: true
    };
  },
  oyuncuUlkesi() {
    try {
      const U = (typeof Ulke !== 'undefined') ? Ulke
        : ((typeof window !== 'undefined' && window.Ulke) ? window.Ulke : null);
      if (U && typeof U.kod === 'function') return U.kod();
    } catch (e) { }
    return 'TR';
  },

  // ═══════════════════════════════════════════════════════════════
  //  §5.4 LİG TABLOSU — oyuncu İÇERİDE, doğru yerde
  // ═══════════════════════════════════════════════════════════════
  ligTablosu(haftaId, oyuncuPuan) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const oy = this._oyuncuGirdisi(oyuncuPuan);
    const ligId = oy ? oy.lig : this.LIG[0].id;
    const botlar = this.botKlanlar(h);
    const liste = [];
    for (let i = 0; i < botlar.length; i++) if (botlar[i].lig === ligId) liste.push(botlar[i]);
    if (oy) liste.push(oy);
    return this._siralaVeNumarala(liste);
  },
  // Lig tablosunun özeti — oyuncunun sırası ve haftalık geçişi
  ligOzeti(haftaId, oyuncuPuan) {
    const t = this.ligTablosu(haftaId, oyuncuPuan);
    let sira = 0, benim = null;
    for (let i = 0; i < t.length; i++) if (t[i].oyuncu) { sira = t[i].siralama; benim = t[i]; break; }
    const L = benim ? this.ligBul(benim.ligPuan) : this.ligBul(0);
    return {
      lig: L.id, ligAd: L.ad, indeks: L.indeks,
      carpan: L.veri.carpan, odulCarpani: L.veri.odul,
      toplam: t.length, siralama: sira,
      gecis: sira ? this.ligGecis(L.indeks, sira, t.length) : null,
      sezonKatsayi: sira ? this.sezonKatsayi(sira) : 0.5,
      tablo: t
    };
  },
  // Dünya tablosu (tüm ligler, tek liste). `limit` ile kısaltılır.
  dunyaTablosu(haftaId, oyuncuPuan, limit) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const oy = this._oyuncuGirdisi(oyuncuPuan);
    const liste = this.botKlanlar(h).slice();
    if (oy) liste.push(oy);
    const t = this._siralaVeNumarala(liste);
    const n = (limit == null) ? t.length : Math.max(1, Math.floor(limit));
    return t.slice(0, n);
  },

  // ═══════════════════════════════════════════════════════════════
  //  §31 — BÖLGESEL / ÜLKE BAZLI TABLO
  // ═══════════════════════════════════════════════════════════════
  // 🔴 `js/ulke.js` (193 ülke) ve `js/bayraklar.js` ZATEN VAR — burada YENİ
  //    ülke listesi yazılmadı, yalnız kodlar kullanıldı.
  // Küresel 500'de o ülkeden yeterli rakip yoksa (nadir ülke), o ülkeye ÖZEL
  // tohumlu ek botlar üretilir (S4). Ek botlar küresel tabloyu DEĞİŞTİRMEZ.
  ulkeTablosu(ulkeKodu, haftaId, oyuncuPuan) {
    const kod = String(ulkeKodu || this.oyuncuUlkesi()).toUpperCase();
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const botlar = this.botKlanlar(h);
    const liste = [], adSet = {}, etiketSet = {};
    for (let i = 0; i < botlar.length; i++) {
      adSet[botlar[i].ad] = 1; etiketSet[botlar[i].etiket] = 1;
      if (botlar[i].ulkeKodu === kod) liste.push(botlar[i]);
    }
    const eksik = this.ULKE_MIN - liste.length;
    if (eksik > 0) {
      const kota = this.kota(Math.max(this.LIG.length, eksik));
      const ligDizi = [];
      for (let i = 0; i < kota.length; i++) for (let j = 0; j < kota[i]; j++) ligDizi.push(i);
      const kar = this._rng(this._hash32('yerelkaristir:' + kod + ':' + h));
      for (let i = ligDizi.length - 1; i > 0; i--) {
        const j = Math.floor(kar() * (i + 1)) % (i + 1);
        const t = ligDizi[i]; ligDizi[i] = ligDizi[j]; ligDizi[j] = t;
      }
      const on = 'Y' + kod + h.toString(36).toUpperCase() + '-';
      for (let i = 0; i < eksik; i++) {
        const k = this._klanUret(this._hash32('yerel:' + kod + ':' + h + ':' + i),
          on + i, ligDizi[i % ligDizi.length], kod, adSet, etiketSet);
        k.yerel = true;
        liste.push(k);
      }
    }
    const oyUlke = this.oyuncuUlkesi();
    if (oyUlke === kod || (oyuncuPuan != null && isFinite(Number(oyuncuPuan)))) {
      const oy = this._oyuncuGirdisi(oyuncuPuan);
      if (oy) { oy.ulkeKodu = kod; oy.bolge = this.bolge(kod); liste.push(oy); }
    }
    return this._siralaVeNumarala(liste);
  },
  // §31.2 — bölgesel liderlik tablosu (avrupa|asya|amerika|afrika|okyanusya|dunya)
  bolgeTablosu(bolgeAdi, haftaId, oyuncuPuan) {
    const b = String(bolgeAdi || this.bolge(this.oyuncuUlkesi()));
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const botlar = this.botKlanlar(h);
    const liste = [];
    for (let i = 0; i < botlar.length; i++) if (botlar[i].bolge === b) liste.push(botlar[i]);
    const oy = this._oyuncuGirdisi(oyuncuPuan);
    if (oy && this.bolge(this.oyuncuUlkesi()) === b) liste.push(oy);
    return this._siralaVeNumarala(liste);
  },
  // §31.1 — coğrafi tabanlı eşleştirme: aynı bölgeden, ELO'su en yakın rakip
  esRakip(bizimKlan, haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const botlar = this.botKlanlar(h);
    const bizElo = this._sayi(bizimKlan && bizimKlan.elo, this.ELO_TABAN);
    const bizBolge = (bizimKlan && bizimKlan.bolge) ? bizimKlan.bolge : this.bolge(this.oyuncuUlkesi());
    let enIyi = null, enIyiFark = Infinity, yedek = null, yedekFark = Infinity;
    for (let i = 0; i < botlar.length; i++) {
      const b = botlar[i];
      if (bizimKlan && b.id === bizimKlan.id) continue;
      const f = Math.abs(b.elo - bizElo);
      // ⚠ Kararlılık: eşit farkta id'si küçük olan kazanır (sıra bağımsız sonuç)
      if (b.bolge === bizBolge && (f < enIyiFark || (f === enIyiFark && enIyi && b.id < enIyi.id))) {
        enIyi = b; enIyiFark = f;
      }
      if (f < yedekFark || (f === yedekFark && yedek && b.id < yedek.id)) { yedek = b; yedekFark = f; }
    }
    return enIyi || yedek;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §35 — TAHMİN MODELLERİ
  // ═══════════════════════════════════════════════════════════════
  // §35.1  Tahmini_Ömür (gün) = (Aktif_Üye / Toplam_Üye) × 90 × Büyüme_Oranı
  // ⚠ Tasarım "Büyüme_Oranı"nı TANIMLAMIYOR. Belgenin saydığı 4 faktörden
  //    türetildi: katılan/ayrılan dengesi × haftalık puan trendi × liderin
  //    son aktifliği. 0,20-2,00 arasına kelepçelendi (aksi hâlde tek ayrılan
  //    üye ömrü sıfıra düşürüyordu).
  omurTahmini(klan) {
    const k = klan || {};
    const toplam = Math.max(1, this._sayi(k.uyeSayisi, 1));
    const aktif = this._kis(this._sayi(k.aktifUye, toplam), 0, toplam);
    const yeni = Math.max(0, this._sayi(k.yeniUye, 0));
    const ayrilan = Math.max(0, this._sayi(k.ayrilanUye, 0));
    const trend = this._kis(this._sayi(k.haftalikTrend, 0), -1, 1);
    const liderGun = Math.max(0, this._sayi(k.liderSonAktifGun, 0));
    const akis = (yeni + 1) / (ayrilan + 1);              // katılım/ayrılma dengesi
    const trendCarpan = 1 + trend * 0.35;                  // düşüşte ömür kısalır
    const liderCarpan = (liderGun <= 3) ? 1 : this._kis(1 - (liderGun - 3) * 0.06, 0.4, 1);
    const buyume = this._kis(akis * trendCarpan * liderCarpan, 0.20, 2.00);
    const gun = (aktif / toplam) * 90 * buyume;
    return {
      gun: Math.round(gun * 10) / 10,
      riskli: gun < 30,                                    // §35.1 "30 günün altı → uyarı"
      aktifOran: Math.round((aktif / toplam) * 1000) / 1000,
      buyume: Math.round(buyume * 1000) / 1000
    };
  },

  // §35.2  Aday_Skoru =
  //   (Geçmiş_Klan_Süresi/30 × 0.3) + (Ort_Haftalık_Katkı/5000 × 0.4) +
  //   (Başarım_Sayısı/10 × 0.2) + (Davet_Edenin_Güvenilirliği × 0.1)
  // ⚠ Formül 1.0'ı AŞABİLİR (100 haftalık üye → 3,33×0,3). Ham skor da
  //    döndürülür ama `skor` 0..1'e kelepçelenir; UI yüzde gösterecek.
  adaySkoru(aday) {
    const a = aday || {};
    const sure = Math.max(0, this._sayi(a.gecmisKlanSuresi, 0));       // gün
    const katki = Math.max(0, this._sayi(a.ortHaftalikKatki, 0));
    const basarim = Math.max(0, this._sayi(a.basarimSayisi, 0));
    const guven = this._kis(this._sayi(a.davetGuvenilirlik, 0), 0, 1);
    const ham = (sure / 30) * 0.3 + (katki / 5000) * 0.4 + (basarim / 10) * 0.2 + guven * 0.1;
    const skor = this._kis(ham, 0, 1);
    let kademe = 'zayif';
    if (skor >= 0.75) kademe = 'mukemmel';
    else if (skor >= 0.5) kademe = 'iyi';
    else if (skor >= 0.25) kademe = 'orta';
    return { skor: Math.round(skor * 1000) / 1000, ham: Math.round(ham * 1000) / 1000, kademe: kademe };
  },

  // §35.3  Klan_Gücü = (Ort_Üye_Katkısı × 0.5) + (Savaş_Kazanma_Oranı × 100 × 0.3)
  //                    + (Klan_Seviyesi × 2 × 0.2)
  klanGucu(klan) {
    const k = klan || {};
    const uye = Math.max(1, this._sayi(k.uyeSayisi, 1));
    const ortKatki = isFinite(Number(k.ortKatki)) && Number(k.ortKatki) > 0
      ? Number(k.ortKatki)
      : (this._sayi(k.haftalikPuan, 0) / uye);
    const sg = k.savasGecmisi || {};
    const top = Math.max(0, this._sayi(sg.toplam, 0));
    const oran = top > 0 ? this._kis(this._sayi(sg.galibiyet, 0) / top, 0, 1) : 0.5;
    const seviye = this._kis(this._sayi(k.seviye, 1), 1, 50);
    return (ortKatki * 0.5) + (oran * 100 * 0.3) + (seviye * 2 * 0.2);
  },
  // §35.3  Kazanma_Olasılığı = 1 / (1 + 10^((Rakip_Güç - Bizim_Güç) / 400))
  savasKazanmaOlasiligi(bizim, rakip) {
    const bg = this.klanGucu(bizim), rg = this.klanGucu(rakip);
    const p = 1 / (1 + Math.pow(10, (rg - bg) / 400));
    return { olasilik: Math.round(p * 10000) / 10000, bizimGuc: Math.round(bg * 10) / 10, rakipGuc: Math.round(rg * 10) / 10 };
  },

  hazir() {
    this.kota();
    this._ulkeHavuz();
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  SELFTEST — 🔴 ASIL İŞİ DETERMİNİZMİ ÖLÇMEK
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const eskiZaman = this._testZaman;
    try {
      this.hazir();
      const H1 = 2900, H2 = 2901;

      // ── 1) Math.random SAYAÇ ────────────────────────────────────────────
      // Tüm ağır yolları Math.random sarmalıyken koştur → çağrı 0 olmalı.
      const gercekRandom = Math.random;
      let rndSayac = 0;
      Math.random = function () { rndSayac++; return gercekRandom.call(Math); };
      this.onbellegiTemizle();
      const A = this.botKlanlar(H1);
      this.ligTablosu(H1, 1234567);
      this.ulkeTablosu('TR', H1, 1234567);
      this.ulkeTablosu('MT', H1);              // nadir ülke → ek bot üretimi
      this.bolgeTablosu('avrupa', H1, 1234567);
      this.dunyaTablosu(H1, 1234567, 50);
      Math.random = gercekRandom;
      r.mathRandomCagrisiSifir = (rndSayac === 0);
      r._mathRandomSayaci = rndSayac;

      // ── 2) DETERMİNİZM ──────────────────────────────────────────────────
      const A_json = JSON.stringify(A);
      this.onbellegiTemizle();                 // önbelleği sil → gerçekten yeniden üret
      const B = this.botKlanlar(H1);
      r.determinizmAyniHafta = (JSON.stringify(B) === A_json) && (A.length === 500);
      const C = this.botKlanlar(H2);
      r.determinizmFarkliHafta = (JSON.stringify(C) !== A_json);
      // Farklı hafta da kendi içinde deterministik olmalı
      this.onbellegiTemizle();
      r.determinizmFarkliHaftaTutarli = (JSON.stringify(this.botKlanlar(H2)) === JSON.stringify(C));

      // ── 3) ÖNBELLEK ─────────────────────────────────────────────────────
      this.onbellegiTemizle();
      this.botKlanlar(H1);                     // kaçırma
      this.botKlanlar(H1); this.botKlanlar(H1);// 2 isabet
      r.onbellekIsabet = (this._ist.isabet === 2 && this._ist.kacirma === 1);
      r._onbellekIst = this._ist.isabet + '/' + this._ist.kacirma;

      // ── 4) AD / ETİKET BENZERSİZLİĞİ + FORMAT ───────────────────────────
      const adG = {}, etG = {};
      let adTekrar = 0, etTekrar = 0, adBozuk = 0, etBozuk = 0, yasak = 0, renkBozuk = 0;
      const reAd = /^[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s]{3,20}$/;   // Klan.RE_AD birebir
      const reEt = /^[A-Z]{3,4}$/;                        // Klan.RE_ETIKET birebir
      const reHex = /^#[0-9a-fA-F]{6}$/;
      for (let i = 0; i < A.length; i++) {
        const k = A[i];
        if (adG[k.ad]) adTekrar++; adG[k.ad] = 1;
        if (etG[k.etiket]) etTekrar++; etG[k.etiket] = 1;
        if (!reAd.test(k.ad)) adBozuk++;
        if (!reEt.test(k.etiket)) etBozuk++;
        if (this._yasakli(k.ad) || this._yasakli(k.etiket)) yasak++;
        if (!reHex.test(k.renk1) || !reHex.test(k.renk2)) renkBozuk++;
      }
      r.adBenzersiz = (adTekrar === 0);
      r.etiketBenzersiz = (etTekrar === 0);
      r.adFormatiGecerli = (adBozuk === 0);
      r.etiketFormatiGecerli = (etBozuk === 0);
      r.yasakliKelimeYok = (yasak === 0);
      r.renklerHex = (renkBozuk === 0);        // tuzak #5

      // ── 5) §5.4 LİG DAĞILIMI ────────────────────────────────────────────
      const kota = this.kota();
      const say = {};
      for (let i = 0; i < A.length; i++) say[A[i].lig] = (say[A[i].lig] || 0) + 1;
      let kotaUyum = true, kotaToplam = 0, monoton = true;
      for (let i = 0; i < this.LIG.length; i++) {
        kotaToplam += kota[i];
        if ((say[this.LIG[i].id] || 0) !== kota[i]) kotaUyum = false;
        if (i > 0 && kota[i] > kota[i - 1]) monoton = false;
      }
      r.ligDagilimiKotayaUyuyor = kotaUyum;
      r.ligKotasiToplam500 = (kotaToplam === this.BOT_SAYISI);
      r.ligKotasiMonotonAzalan = monoton;      // §5.4 oranı korunuyor mu
      r.herKademedeEnAzBirKlan = (function (k) { for (let i = 0; i < k.length; i++) if (k[i] < 1) return false; return true; })(kota);
      r._kota = kota.join(',');

      // ── 6) ligBul TUTARLILIĞI (500/500) ─────────────────────────────────
      let ligHata = 0;
      for (let i = 0; i < A.length; i++) if (this.ligBul(A[i].ligPuan).id !== A[i].lig) ligHata++;
      r.ligPuanKademeyleTutarli = (ligHata === 0);
      // Sınır değerleri
      r.ligSinirlari = (this.ligBul(0).id === 'bronz3' && this.ligBul(50000).id === 'bronz3'
        && this.ligBul(50001).id === 'bronz2' && this.ligBul(12000001).id === 'efsane'
        && this.ligBul(999999999).id === 'efsane');

      // ── 7) §29.5 ELO (3 bilinen vaka) ───────────────────────────────────
      const b0 = this.eloBeklenen(1500, 1500);
      const bP = this.eloBeklenen(1900, 1500);      // +400 → 0.909090...
      const bM = this.eloBeklenen(1500, 1900);      // -400 → 0.090909...
      r.eloBeklenenEsit = (b0 === 0.5);
      r.eloBeklenenArti400 = (Math.abs(bP - (1 / 1.1)) < 1e-12);
      r.eloBeklenenEksi400 = (Math.abs(bM - (0.1 / 1.1)) < 1e-12);
      r.eloYeniPuan = (Math.abs(this.elo(1500, 1500, 1) - 1516) < 1e-9)
        && (Math.abs(this.elo(1500, 1500, 0) - 1484) < 1e-9)
        && (Math.abs(this.elo(1500, 1500, 0.5) - 1500) < 1e-9);
      r.eloToplamiKorunur = (Math.abs((this.elo(1600, 1400, 1) - 1600) + (this.elo(1400, 1600, 0) - 1400)) < 1e-9);

      // ── 8) LİG TABLOSU — oyuncu içeride ve doğru yerde ──────────────────
      const oyPuan = 260000;                   // Gümüş III
      const T = this.ligTablosu(H1, oyPuan);
      let oyIx = -1;
      for (let i = 0; i < T.length; i++) if (T[i].oyuncu) { oyIx = i; break; }
      r.ligTablosundaOyuncuVar = (oyIx >= 0);
      r.ligTablosuAyniLig = (oyIx >= 0) && (T[oyIx].lig === 'gumus3');
      // Sıralama gerçekten azalan mı
      let azalan = true;
      for (let i = 1; i < T.length; i++) if (T[i].ligPuan > T[i - 1].ligPuan) azalan = false;
      r.ligTablosuAzalanSirali = azalan;
      // Oyuncunun sırası = kendisinden yüksek puanlı klan sayısı + 1
      let ustunde = 0;
      for (let i = 0; i < T.length; i++) if (!T[i].oyuncu && T[i].ligPuan > oyPuan) ustunde++;
      r.oyuncuSiralamasiDogru = (oyIx >= 0) && (T[oyIx].siralama === ustunde + 1);
      r.ligTablosuNumarali = (T.length > 0 && T[0].siralama === 1 && T[T.length - 1].siralama === T.length);
      // 🔴 Tablo üretimi ÖNBELLEĞİ KİRLETMEMELİ (yukarıdaki `_kopya` notu)
      let kirli = 0;
      const AA = this.botKlanlar(H1);
      for (let i = 0; i < AA.length; i++) if ('siralama' in AA[i] || 'tohum' in AA[i]) kirli++;
      r.onbellekKirlenmiyor = (kirli === 0);
      // Kararlılık: iki kez çağır → aynı sıra
      const T2 = this.ligTablosu(H1, oyPuan);
      let ayniSira = (T.length === T2.length);
      for (let i = 0; ayniSira && i < T.length; i++) if (T[i].id !== T2[i].id) ayniSira = false;
      r.siralamaKararli = ayniSira;

      // ── 9) §31 ÜLKE TABLOSU ─────────────────────────────────────────────
      const UT = this.ulkeTablosu('TR', H1, oyPuan);
      let yabanci = 0, uOyIx = -1;
      for (let i = 0; i < UT.length; i++) {
        if (UT[i].ulkeKodu !== 'TR') yabanci++;
        if (UT[i].oyuncu) uOyIx = i;
      }
      r.ulkeTablosuHepsiAyniKod = (yabanci === 0);
      r.ulkeTablosundaOyuncuVar = (uOyIx >= 0);
      let uUstunde = 0;
      for (let i = 0; i < UT.length; i++) if (!UT[i].oyuncu && UT[i].ligPuan > oyPuan) uUstunde++;
      r.ulkeOyuncuSiralamasiDogru = (uOyIx >= 0) && (UT[uOyIx].siralama === uUstunde + 1);
      r.ulkeYeterliRakip = (UT.length >= this.ULKE_MIN);
      // TR tabanı (S4) gerçekten tutuyor mu — ek bot ÜRETİLMEDEN
      let trSayi = 0;
      for (let i = 0; i < A.length; i++) if (A[i].ulkeKodu === 'TR') trSayi++;
      r.trTabaniTutuyor = (trSayi >= this.TR_TABAN);
      r._trBotSayisi = trSayi;
      // Nadir ülke → tohumlu ek botlarla yine de dolu ve DETERMİNİSTİK
      const MT1 = this.ulkeTablosu('MT', H1), MT2 = this.ulkeTablosu('MT', H1);
      r.nadirUlkeDoluyor = (MT1.length >= this.ULKE_MIN);
      r.nadirUlkeDeterministik = (JSON.stringify(MT1) === JSON.stringify(MT2));
      // Ülke çeşitliliği (tek ülkeye yığılmamış)
      const uSet = {};
      let uAdet = 0;
      for (let i = 0; i < A.length; i++) if (!uSet[A[i].ulkeKodu]) { uSet[A[i].ulkeKodu] = 1; uAdet++; }
      r.ulkeCesitliligi = (uAdet >= 25);
      r._farkliUlke = uAdet;

      // ── 10) §31.2 BÖLGE ─────────────────────────────────────────────────
      const BT = this.bolgeTablosu('avrupa', H1, oyPuan);
      let bYabanci = 0;
      for (let i = 0; i < BT.length; i++) if (BT[i].bolge !== 'avrupa') bYabanci++;
      r.bolgeTablosuTutarli = (BT.length > 0 && bYabanci === 0);
      r.bolgeEslemesi = (this.bolge('TR') === 'avrupa' && this.bolge('JP') === 'asya'
        && this.bolge('BR') === 'amerika' && this.bolge('EG') === 'afrika'
        && this.bolge('AU') === 'okyanusya' && this.bolge('ZZ') === 'dunya');

      // ── 11) §5.4 YÜKSELME / DÜŞME ───────────────────────────────────────
      const g1 = this.ligGecis('bronz3', 1, 100);            // ilk 3 → yükselme
      const g2 = this.ligGecis('gumus3', 99, 100);           // son 2 → düşme
      const g3 = this.ligGecis('gumus3', 50, 100);           // orta → kalma
      const g4 = this.ligGecis('bronz3', 100, 100);          // en alt lig DÜŞMEZ
      const g5 = this.ligGecis('efsane', 1, 100);            // tavan lig YÜKSELMEZ
      r.ligGecisYukselme = (g1.yon === 'yukselme' && g1.yeniLig === 'bronz2');
      r.ligGecisDusme = (g2.yon === 'dusme' && g2.yeniLig === 'bronz1');
      r.ligGecisKalma = (g3.yon === 'kalma');
      r.ligGecisAltTavanKorumasi = (g4.yon === 'kalma' && g5.yon === 'kalma');
      // Küçük grup koruması: 2 klanlık Efsane tablosunda BİRİNCİ düşmemeli
      r.ligGecisKucukGrup = (this.ligGecis('efsane', 1, 2).yon === 'kalma'
        && this.ligGecis('efsane', 2, 2).yon === 'kalma'
        && this.ligGecis('elmas1', 1, 2).yon !== 'dusme'      // 1. sıra düşemez
        && this.ligGecis('elmas1', 2, 2).yon !== 'dusme');    // 2/2 için grup çok küçük
      // Her kademede varsayılan (toplam verilmemiş) çağrı da tutarlı olmalı
      let gecisBozuk = 0;
      for (let i = 0; i < this.LIG.length; i++) {
        const gy = this.ligGecis(i, 1), gd = this.ligGecis(i, this.kota()[i] + 1);
        if (i === 0 && gd.yon === 'dusme') gecisBozuk++;                        // en alt lig düşmez
        if (i === this.LIG.length - 1 && gy.yon === 'yukselme') gecisBozuk++;   // tavan lig yükselmez
        if (gy.yon === 'dusme') gecisBozuk++;                                   // 1. sıra ASLA düşmez
      }
      r.ligGecisTumKademeler = (gecisBozuk === 0);

      // ── 12) §12 ZAMAN KİMLİKLERİ ────────────────────────────────────────
      // 🔴 js/social.js:28 ClanWar.weekId() ile birebir aynı formül
      const simdi = Date.now();
      r.haftaIdSocialIle = (this.haftaId(simdi) === Math.floor(simdi / (7 * 86400000)));
      this._testZaman = new Date(2026, 6, 15, 12, 0, 0).getTime();   // 15 Tem 2026
      const sYaz = this.sezonId();
      this._testZaman = new Date(2026, 0, 20, 12, 0, 0).getTime();   // 20 Oca 2026
      const sKis = this.sezonId();
      this._testZaman = new Date(2026, 11, 5, 12, 0, 0).getTime();   // 5 Ara 2026
      const sAra = this.sezonId();
      this._testZaman = new Date(2026, 2, 1, 0, 0, 0).getTime();     // 1 Mar 2026
      const sMar = this.sezonId(), hMar = this.sezonHaftasi();
      this._testZaman = eskiZaman;
      r.sezonIdBicimi = (sYaz === '2026-yaz' && sKis === '2025-kis'
        && sAra === '2026-kis' && sMar === '2026-ilkbahar');
      r.sezonHaftasiIlk = (hMar === 1);
      r.sezonKatsayilari = (this.sezonKatsayi(1) === 5.0 && this.sezonKatsayi(3) === 4.0
        && this.sezonKatsayi(10) === 3.0 && this.sezonKatsayi(500) === 1.0
        && this.sezonKatsayi(501) === 0.5);

      // ── 13) §35 TAHMİN MODELLERİ ────────────────────────────────────────
      // Sağlıklı klan: 20/20 aktif, büyüyor → ömür uzun
      const saglikli = this.omurTahmini({ uyeSayisi: 20, aktifUye: 20, yeniUye: 4, ayrilanUye: 0, haftalikTrend: 0.5, liderSonAktifGun: 0 });
      // Ölmekte olan klan: 2/20 aktif, kaçış var, lider 30 gündür yok
      const olen = this.omurTahmini({ uyeSayisi: 20, aktifUye: 2, yeniUye: 0, ayrilanUye: 6, haftalikTrend: -0.9, liderSonAktifGun: 30 });
      r.omurSaglikliUzun = (saglikli.gun > 90 && saglikli.riskli === false);
      r.omurOlenRiskli = (olen.gun < 30 && olen.riskli === true);
      r.omurSirasiDogru = (saglikli.gun > olen.gun);
      // §35.2 elle hesap: (60/30×0.3)+(2500/5000×0.4)+(5/10×0.2)+(0.8×0.1)
      //                 = 0.6 + 0.2 + 0.1 + 0.08 = 0.98
      const ask = this.adaySkoru({ gecmisKlanSuresi: 60, ortHaftalikKatki: 2500, basarimSayisi: 5, davetGuvenilirlik: 0.8 });
      r.adaySkoruBilinenVaka = (Math.abs(ask.ham - 0.98) < 1e-9 && ask.kademe === 'mukemmel');
      r.adaySkoruSifir = (this.adaySkoru({}).skor === 0);
      // §35.3 — aynı klan kendisiyle savaşırsa olasılık tam 0.5
      const ornek = A[0];
      const p1 = this.savasKazanmaOlasiligi(ornek, ornek);
      r.savasOlasiligiEsit = (Math.abs(p1.olasilik - 0.5) < 1e-9);
      // Simetri: p(a,b) + p(b,a) = 1
      const pa = this.savasKazanmaOlasiligi(A[1], A[2]).olasilik;
      const pb = this.savasKazanmaOlasiligi(A[2], A[1]).olasilik;
      r.savasOlasiligiSimetrik = (Math.abs(pa + pb - 1) < 1e-3);
      // Güçlü klan zayıfa karşı favori
      const guclu = { uyeSayisi: 20, haftalikPuan: 400000, ortKatki: 20000, seviye: 50, savasGecmisi: { toplam: 40, galibiyet: 36 } };
      const zayif = { uyeSayisi: 20, haftalikPuan: 4000, ortKatki: 200, seviye: 3, savasGecmisi: { toplam: 10, galibiyet: 2 } };
      r.savasGucluFavori = (this.savasKazanmaOlasiligi(guclu, zayif).olasilik > 0.9);

      // ── 14) EŞLEŞTİRME + TOHUMLAMA ──────────────────────────────────────
      const rakip = this.esRakip(A[10], H1);
      r.esRakipBulunuyor = (!!rakip && rakip.id !== A[10].id);
      r.esRakipAyniBolge = (!!rakip && rakip.bolge === A[10].bolge);
      const toh = this.tohumla(A.slice(0, 32));
      let tohOk = (toh.length === 32 && toh[0].tohum === 1 && toh[31].tohum === 32);
      for (let i = 1; i < toh.length; i++) if (toh[i].elo > toh[i - 1].elo) tohOk = false;
      r.turnuvaTohumuSirali = tohOk;

      // ── 15) VERİ BÜTÜNLÜĞÜ + PERFORMANS ─────────────────────────────────
      const gerekliAlan = ['id', 'ad', 'etiket', 'amblem', 'renk1', 'renk2', 'seviye',
        'lig', 'ligPuan', 'haftalikPuan', 'uyeSayisi', 'elo', 'ulkeKodu', 'sinif', 'savasGecmisi'];
      let alanEksik = 0, sayisalBozuk = 0, sinifBozuk = 0;
      for (let i = 0; i < A.length; i++) {
        const k = A[i];
        for (let j = 0; j < gerekliAlan.length; j++) {
          if (!(gerekliAlan[j] in k)) alanEksik++;
        }
        if (!isFinite(k.ligPuan) || !isFinite(k.elo) || !isFinite(k.haftalikPuan)
          || !isFinite(k.seviye) || !isFinite(k.uyeSayisi)) sayisalBozuk++;
        if (k.sinif !== null && this.SINIFLAR.indexOf(k.sinif) < 0) sinifBozuk++;
        if (k.sinif !== null && k.seviye < 15) sinifBozuk++;   // §30.2 sınıf sv15'te açılır
      }
      r.tumAlanlarVar = (alanEksik === 0);
      r.sayisalAlanlarSaglam = (sayisalBozuk === 0);
      r.sinifKuraliDogru = (sinifBozuk === 0);
      this.onbellegiTemizle();
      const t0 = Date.now();
      this.botKlanlar(H1);
      const sure = Date.now() - t0;
      r.uretimHizli = (sure < 400);            // kare başına DEĞİL, önbellekli
      r._uretimMs = sure;

      r._botSayisi = A.length;
      r._adRet = this._ist.adRet;
      r._etiketRet = this._ist.etiketRet;
    } catch (e) {
      r.hata = String(e && e.message ? e.message : e);
    }
    this._testZaman = eskiZaman;
    let allPass = !r.hata;
    for (const k in r) if (typeof r[k] === 'boolean' && r[k] === false) allPass = false;
    r.allPass = allPass;
    return r;
  }
};

if (typeof window !== 'undefined') window.KlanSim = KlanSim;
if (typeof module !== 'undefined' && module.exports) module.exports = KlanSim;
