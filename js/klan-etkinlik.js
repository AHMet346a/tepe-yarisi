'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KlanEtkinlik — HAFTALIK ETKİNLİK · SEZON · İLERİ MEKANİKLER   (Ajan E)

   Kaynak tasarım: "Klan sistemi.txt"
     §5   haftalık etkinlik (6 tür · puan formülleri · klan skoru · ödüller)
     §12  sezon (3 ay · takvim · katsayı · sıfırlama/taşıma)
     §25  ileri mekanikler (araç sınıfı matrisi · hava · pist mod. · handikap)
     §26  lider özel etkinliği (seviye 34)
     §34  özel gün etkinlikleri

   🔴 TOP-LEVEL AD: yalnız `KlanEtkinlik` (sözleşme §2).
   🔴 ÖDÜL: yalnız KP. §5.5 ve §12.4'teki altın+elmas tabloları
      `Klan.kpCevir(altin, elmas)` ile KP'ye çevrilir (sözleşme §6).
   🔴 `Math.random()` bu dosyada HİÇ kullanılmaz — haftanın türü/haritası/
      havası/pist modifikasyonu TOHUMLUDUR (aynı haftaId → aynı etkinlik).
      `selfTest` `Math.random`'ı sarmalayıp çağrı sayısının 0 olduğunu ÖLÇER.

   ── DIŞ BAĞIMLILIKLAR (hepsi opsiyonel, `typeof` korumalı — tuzak #10) ──
     Klan.kpCevir/kpOdul/odulCarpani/sinifCarpani/ozellikAcik/xpEkle/duyuru
     KlanSim.haftaId/sezonId/sezonHaftasi/sezonKatsayi/botKlanlar
     KlanKutu.ver          (Ajan D — yoksa sessizce atlanır)
     Terrain.MAPS          (45 gerçek harita)
     GorselHava.HAVA       (gerçek hava tablosu)
     VehicleDefs           (159 gerçek araç)

   ── TASARIMDAN SAPMALAR (hepsi ÖLÇÜLDÜ, gerekçeli) ──────────────────────
   E1. §5.2 MESAFE tablosundaki "6000m → 6000 + 100 + 150 + 50 = 6300"
       ÖRNEĞİ KENDİ İÇİNDE TUTARSIZ. 1. kademe kuralı "her 100m'de +2" →
       6000/100×2 = 120, örnekte 100 yazıyor (yani 1. kademe 5000'de
       kesilmiş), ama 2. kademe aynı örnekte KESİLMEMİŞ (150 = (6000-1000)/
       100×3). Aynı tablodaki 1000m (+20) ve 2000m (+40+30) örnekleri
       KESİNTİSİZ (kümülatif) kuralı doğruluyor ve §5.2'nin ANA hesabı
       (3500m → 5.533) da kümülatif. ▶ KÜMÜLATİF uygulandı.
       Ölçüm: kümülatif 6000m → 6.320 · örnekteki değer 6.300 (fark 20).
   E2. §5.2 HIZ tablosundaki "210 → 2100 + 50×2 + 10×5 = 2250" örneği
       1. kademeyi 200 km/h'de KESİYOR. E1 ile aynı tutarsızlık.
       ▶ KÜMÜLATİF uygulandı. Ölçüm: 210 km/h → 2.270 · örnek 2.250 (fark 20).
       Kilit örnek (180 km/h → 2.455) her iki yorumda da AYNI.
   E3. §5.2 TAKLA "combo" satırı "5 takla → 250 + 50" (yani n×10) diyor, ama
       ANA hesap "(12 - 1) × 10 = 110" (yani (n-1)×10). Kilitlenen sonuç
       (1.331) yalnız (n-1)×10 ile çıkıyor. ▶ (n-1)×10 uygulandı.
   E4. §5.2 ÖZEL KURAL "Puan Formülü: Aynı kombinasyon" diyor, ama ÖRNEĞİ
       MESAFE formülünü kullanıyor (3500m → 6.640). ▶ `altTur` parametresi
       eklendi, VARSAYILANI 'mesafe' (kilit örnek böyle tutuyor). Lider
       'kombinasyon' seçerse o formül kullanılır.
   E5. §25.1 matrisindeki 6 sınıf adı (Kamyon/Motosiklet/Formula/SUV/Canavar
       Kamyon/Spor Araba) oyunda YOK — `js/vehicles.js` 159 aracın hiçbirinde
       sınıf alanı tutmuyor (ölçüldü: `class`/`category` alanı 0 araçta var).
       ▶ 159 araç ELLE eşlendi (`ARAC_SINIF`), eşleşmeyen 64 araç (tekne,
       uçak, tren, tank, oyuncak) `diger` sınıfında ve TÜM türlerde ×1.00.
       Uydurma sınıf YAZILMADI.
   E6. §25.2'nin 6 hava koşulu oyunda ZATEN VAR ama harita bazlı:
       `js/gorsel-hava.js` `HAVA` tablosu (yağmur/kar/tipi/kum/kül/şimşek/buz)
       + `js/terrain.js` `MAPS[].bgColor`. ▶ YENİ HAVA SİSTEMİ YAZILMADI;
       koşul sınıfı bu iki gerçek kaynaktan TÜRETİLİR (`_havaTuret`).
       "Gece" hava değil zaman → `bgColor` PARLAKLIĞINDAN türetilir
       (eşik 0,20; ölçüldü: 45 haritanın 11'i gece).
       Dağılım (45 harita): güneşli 19 · gece 11 · sis 5 · karlı 4 ·
       yağmurlu 3 · fırtına 3 → 6 koşulun HEPSİ gerçek haritaya bağlı.
   E7. §25.5 handikap formülü METİNDE `1 + (oyuncu-sunucu)/sunucu × 0.1`
       yazıyor, ama HEMEN ALTINDAKİ cümle "oyuncu ortalamadan yüksekse
       çarpan 1'in ALTINA düşer (örn. 0.95)" diyor. Yazılı formül bunun
       TERSİNİ üretir (+%20 üstünse 1.02). ▶ İkisi de sunuluyor:
       `handikapHam()` metindeki formülü BİREBİR, `handikap()` metnin
       ANLATTIĞI davranışı (işaret düzeltilmiş) verir. Oyun `handikap()`
       kullanır. Sınır: [0.80, 1.20] (tasarımda sınır yok; sınırsız bırakılırsa
       10× ortalama bir oyuncuda çarpan 0.10'a düşüp puanı yok ederdi).
   E8. §25.5 "Sunucu_Ortalaması" tek cihazda YOK. ▶ `KlanSim.botKlanlar()`
       tablosundaki `ortKatki` (haftalık puan / üye sayısı) ortalaması
       kullanılır — mevcut TEK sunucu-benzeri referans budur.
   E9. §5.5 ve §12.4 tablolarının "Elmas + Altın" sütunları KP'ye çevrildi
       (sözleşme §6). Kutu sütunu `KlanKutu`'ya devredildi.
   E10. §12.1 "her sezon klanlar SIFIRDAN başlar" ile §12.5 "lig puanı %50
       taşınır" çelişiyor. ▶ §12.5 uygulandı (daha ayrıntılı ve sayısal).
   E11. §34 "Oyunun Yıl Dönümü" tarihi tasarımda YOK ve depoda da bir çıkış
       tarihi sabiti yok (arandı: 0 sonuç). ▶ `OZEL_GUN.yildonumu` tek
       noktadan değiştirilebilir yer tutucu (15 Mayıs ±3 gün); ana oturum
       gerçek tarihi girecek.
   E12. Sözleşme "KlanSim.tohumla() varsa onu kullan" diyor, ama o fonksiyon
       PRNG DEĞİL — turnuva tohumlaması (ELO'ya göre sıralayıp `tohum` alanı
       yazar). ▶ PRNG olarak `KlanSim._rng` ile AYNI mulberry32 + `Math.imul`
       FNV-1a yazıldı (yükleme sırasına bağımlılık olmasın diye kendi kopyası).
       `js/liveops.js:32`'deki düz çarpımlı hash KOPYALANMADI.
   E13. §5.1 "Pazartesi 00:00 başlar" — `haftaId` epoch tabanlı olduğu için
       hafta PERŞEMBE 00:00 UTC'de döner (1 Ocak 1970 Perşembe). `KlanSim`
       ve `js/social.js` ile AYNI olması determinizm için zorunlu →
       `haftaId` DEĞİŞTİRİLMEDİ, §5.1 çizelgesi haftanın kendi 0. anına göre
       yeniden konumlandırıldı (`ZAMAN_CIZELGESI` saat cinsinden offset).

   ⚠ Template literal / backtick YOK (proje tuzağı #9).
   ⚠ Renkler HEX (tuzak #5).
   ⚠ Ekran çizen kod YOK — UI Ajan G'nin (`js/klan-ui.js`).
   ═══════════════════════════════════════════════════════════════════════ */

const KlanEtkinlik = {
  ad: 'klanEtkinlik',
  surum: '1.0',

  HAFTA_MS: 604800000,          // KlanSim.HAFTA_MS ve social.js ile AYNI
  _testZaman: null,             // test kancası; canlıda daima null

  // ═══════════════════════════════════════════════════════════════
  //  §5.2 — 6 ETKİNLİK TÜRÜ
  // ═══════════════════════════════════════════════════════════════
  TURLER: ['mesafe', 'hiz', 'takla', 'coin', 'kombinasyon', 'ozel'],

  TUR_META: {
    mesafe:      { ad: 'Mesafe Yarışı',      kural: 'En uzak mesafeyi git.',                   renk: '#3aa0e8', ikon: '📏' },
    hiz:         { ad: 'Hız Denemesi',       kural: 'En yüksek hıza ulaş.',                    renk: '#e0553a', ikon: '⚡' },
    takla:       { ad: 'Takla Şovu',         kural: 'En çok takla at.',                        renk: '#c46ae8', ikon: '🌀' },
    coin:        { ad: 'Sikke Avı',          kural: 'En çok sikke topla.',                     renk: '#e8b23a', ikon: '🪙' },
    kombinasyon: { ad: 'Kombinasyon',        kural: 'Mesafe, hız, takla ve sikke bir arada.',  renk: '#48c48a', ikon: '🎯' },
    ozel:        { ad: 'Özel Kural',         kural: 'Yalnız belirli bir araç sınıfı yarışır.', renk: '#e08a3a', ikon: '🔒' }
  },

  // §5.2 puan sabitleri — ELLE DEĞİŞTİRME, selfTest 6 örnekle kilitli.
  PUAN: {
    mesafe: { esik1: 100, bonus1: 2, esik2: 1000, bonus2: 3, esik3: 5000, bonus3: 5 },
    hiz:    { taban: 10, esik1: 150, bonus1: 2, esik2: 200, bonus2: 5 },
    takla:  { taban: 50, combo: 10, uclu: 100, besli: 300 },
    coin:   { taban: 2, altin: 1.5, elmas: 3 },
    komb:   { mesafe: 0.3, hiz: 2, takla: 10, coin: 1, klanIlk3: 200, dunyaIlk10: 500 },
    ozel:   { sinifBonus: 1.20 }
  },
  CARPAN: { rekor: 1.10, kazasiz: 1.15, ilk3: 1.20 },

  // §5.3 — her üyenin EN İYİ KAÇ yarışının ortalaması klana yazılır
  EN_IYI_N: 3,

  // ═══════════════════════════════════════════════════════════════
  //  §25.1 — ARAÇ SINIFI × ETKİNLİK TÜRÜ ÇARPAN MATRİSİ (6×6)
  // ═══════════════════════════════════════════════════════════════
  // Tasarım tablosundan BİREBİR. `diger` = tasarımdaki 6 sınıfa karşılığı
  // olmayan gerçek araçlar (tekne/uçak/tren/tank/oyuncak) → nötr (E5).
  SINIF_MATRIS: {
    kamyon:     { mesafe: 1.2, hiz: 0.8, takla: 0.9, coin: 1.1, kombinasyon: 1.0, ozel: 1.3 },
    motosiklet: { mesafe: 0.9, hiz: 1.3, takla: 1.2, coin: 0.9, kombinasyon: 1.1, ozel: 1.0 },
    formula:    { mesafe: 1.0, hiz: 1.5, takla: 0.7, coin: 1.0, kombinasyon: 1.2, ozel: 0.8 },
    suv:        { mesafe: 1.1, hiz: 0.9, takla: 1.0, coin: 1.2, kombinasyon: 1.0, ozel: 1.1 },
    canavar:    { mesafe: 1.3, hiz: 0.7, takla: 1.5, coin: 1.0, kombinasyon: 1.2, ozel: 1.4 },
    spor:       { mesafe: 0.8, hiz: 1.4, takla: 1.0, coin: 1.1, kombinasyon: 1.1, ozel: 0.9 },
    diger:      { mesafe: 1.0, hiz: 1.0, takla: 1.0, coin: 1.0, kombinasyon: 1.0, ozel: 1.0 }
  },
  SINIF_AD: {
    kamyon: 'Kamyon', motosiklet: 'Motosiklet', formula: 'Formula', suv: 'SUV',
    canavar: 'Canavar Kamyon', spor: 'Spor Araba', diger: 'Diğer'
  },

  // 🔴 GERÇEK araç kimlikleri (`js/vehicles.js` `VehicleDefs`, 159 araç).
  //    Listede OLMAYAN araç `diger` sayılır ve ×1.00 alır (E5).
  //    selfTest: (a) çakışma yok  (b) hepsi VehicleDefs'te var.
  ARAC_SINIF: {
    kamyon: [
      'superdiesel', 'semitruck', 'racetruck', 'firetruck', 'garbagetruck', 'towtruck',
      'dumptruck', 'cementmixer', 'crane', 'armortruck', 'steamtruck', 'snowplow',
      'sweeper', 'logmobile', 'orehauler', 'paintingtruck', 'icecream', 'ambulance',
      'van', 'microbus', 'surfvan', 'campervan', 'bus', 'partybus', 'loader',
      'forklift', 'tractor', 'harvester', 'steamroller', 'roadroller2', 'zamboni',
      'snowcat', 'snowgroomer', 'icethresher', 'sanddigger', 'tunnelborer', 'hearse'
    ],
    motosiklet: [
      'motocross', 'dirtbike', 'chopper', 'scooter', 'sportsbike', 'rocketbike',
      'velocitymoto', 'hoverbike', 'jetpackbike', 'pizzascooter', 'mopedcar',
      'monsterbike', 'pennyfarthing', 'unicycle', 'monowheel', 'sidecar'
    ],
    formula: ['formula', 'racecar', 'dragster', 'rocketcar', 'rocketdart', 'rocketsled', 'gokart'],
    suv: [
      'jeep', 'pickup', 'atv', 'quadracer', 'dunebuggy', 'sandrail', 'desertfox',
      'peakcrawler', 'swampfan', 'snowmobile', 'golfcart', 'lawnmower'
    ],
    canavar: [
      'monster', 'bigfoot', 'beasthauler', 'trophytruck', 'warthog', 'dunecat',
      'offroader', 'dune4x4', 'cybertruck'
    ],
    spor: [
      'sportscar', 'supercar', 'bugatti', 'musclecar', 'rallycar', 'speedster',
      'solarcruiser', 'neonracer', 'police', 'limo', 'platinumlimo', 'classic',
      'retroclassic', 'oldtimer'
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  //  §25.2 — HAVA / PİST KOŞULU (gerçek sisteme bağlı, E6)
  // ═══════════════════════════════════════════════════════════════
  HAVA_KOSUL: {
    gunesli:  { ad: 'Güneşli',  carpan: 1.00, renk: '#e8b23a', etki: 'Temiz görüş. Varsayılan koşul.' },
    yagmurlu: { ad: 'Yağmurlu', carpan: 1.15, renk: '#3aa0e8', etki: 'Kaygan zemin; çekiş azalır, takla bonusu artar.', cekis: -0.30, taklaEk: 0.20 },
    karli:    { ad: 'Karlı',    carpan: 1.30, renk: '#c8ccd6', etki: 'Çok kaygan; çekiş yarıya iner, sikke değeri artar.', cekis: -0.50, coinEk: 0.25 },
    gece:     { ad: 'Gece',     carpan: 1.10, renk: '#4a6ed9', etki: 'Görüş mesafesi kısalır, hız bonusu azalır.', hizEk: -0.10 },
    sis:      { ad: 'Sis',      carpan: 1.25, renk: '#8a93a8', etki: 'Görüş çok düşük; mesafe puanı azalır, yakıt tüketimi artar.', mesafeEk: -0.05, yakitEk: 0.20 },
    firtina:  { ad: 'Fırtına',  carpan: 1.40, renk: '#e06ad2', etki: 'Şimşek ve rüzgâr; araç savrulur.', ruzgar: 1.0 }
  },
  GECE_PARLAKLIK_ESIK: 0.20,    // E6 — bgColor göreli parlaklık eşiği

  // ═══════════════════════════════════════════════════════════════
  //  §25.3 — PİST MODİFİKASYONLARI
  // ═══════════════════════════════════════════════════════════════
  // ⚠ Bunlar OYNANIŞI değiştirir; bu modül yalnız TANIM + ÇARPAN + HANGİ
  //   HAFTA AKTİF bilgisini üretir. Fiziğe uygulama ana oturumun işi.
  PIST_MOD: {
    rampa:      { ad: 'Rampa Çılgınlığı', aciklama: 'Piste ekstra rampalar eklenir.',                 renk: '#c46ae8', puanTur: 'takla', puanCarpan: 1.5, oynanis: { rampaSiklik: 2.0, dusmeRiski: 1.4 } },
    coinyagmur: { ad: 'Sikke Yağmuru',    aciklama: 'Pist boyunca havadan sikke yağar.',              renk: '#e8b23a', puanTur: 'coin',  puanCarpan: 1.3, oynanis: { coinSiklik: 2.2, dikkatDagitma: 1.0 } },
    tersyon:    { ad: 'Ters Yön',         aciklama: 'Pist yönü ters çevrilir, ezber bozulur.',        renk: '#3aa0e8', puanTur: null,    puanCarpan: 1.0, oynanis: { aynaMod: true } },
    engelcenneti: { ad: 'Engel Cenneti',  aciklama: 'Daha fazla dinamik engel; kaza riski yüksek.',   renk: '#e0553a', puanTur: 'kazasiz', puanCarpan: 2.0, oynanis: { engelYogunluk: 2.0, hareketliTehlike: true } },
    yakitkitligi: { ad: 'Yakıt Kıtlığı',  aciklama: 'Yakıt bidonları %40 azalır.',                    renk: '#8a93a8', puanTur: null,    puanCarpan: 1.0, oynanis: { yakitSiklik: 0.6 } },
    dusukyercekimi: { ad: 'Düşük Yerçekimi', aciklama: 'Araçlar yavaş düşer, yükseğe zıplar.',        renk: '#6ad2ff', puanTur: 'takla', puanCarpan: 1.25, oynanis: { yercekimi: 0.6, havaSuresi: 1.5 } }
  },
  MOD_MAKS: 2,                  // §26.1 lider en fazla 2 modifikasyon seçer

  // ═══════════════════════════════════════════════════════════════
  //  §25.4 — ETKİNLİK İÇİ GÜÇLENDİRİCİLER (fiyatlar KP, tasarımdan aynen)
  // ═══════════════════════════════════════════════════════════════
  // ⚠ Satın alma/envanter `KlanKutu` (Ajan D) işidir; burada yalnız TANIM +
  //   puan etkisi var. Savaşta fiyat %50 yüksek (§25.4 son satır).
  BOOST: {
    ciftpuan:  { ad: 'Çift Puan',      sure: '1 yarış', kp: 200, etki: 'O yarıştan alınan tüm puanlar ×2.', puanCarpan: 2.0 },
    sinirsizyakit: { ad: 'Sınırsız Yakıt', sure: '1 yarış', kp: 150, etki: 'Yakıt tükenmez.', puanCarpan: 1.0 },
    manyetik:  { ad: 'Manyetik Sikke', sure: '1 yarış', kp: 100, etki: 'Tüm sikkeler otomatik çekilir.', puanCarpan: 1.0 },
    zirh:      { ad: 'Zırh',           sure: '1 yarış', kp: 250, etki: 'Bir kez kaza yapmayı engeller.', puanCarpan: 1.0 },
    hizasisi:  { ad: 'Hız Aşısı',      sure: '1 yarış', kp: 180, etki: 'Maksimum hız %20 artar.', puanCarpan: 1.0 },
    taklaustasi: { ad: 'Takla Ustası', sure: '1 yarış', kp: 120, etki: 'Her takla +10 ekstra puan verir.', puanCarpan: 1.0, taklaEk: 10 }
  },
  BOOST_SAVAS_ZAM: 1.5,

  // ═══════════════════════════════════════════════════════════════
  //  §25.5 — HANDİKAP
  // ═══════════════════════════════════════════════════════════════
  HANDIKAP_KATSAYI: 0.1,
  HANDIKAP_ALT: 0.80,
  HANDIKAP_UST: 1.20,

  // ═══════════════════════════════════════════════════════════════
  //  §5.5 — ETKİNLİK ÖDÜL TABLOSU (8 kademe)  →  KP (sözleşme §6)
  // ═══════════════════════════════════════════════════════════════
  // `altin`/`elmas` YALNIZ kaynak belgeye izlenebilirlik için duruyor;
  // oyuncuya ASLA verilmez, `kp` alanı türetilir (`_kpTablo()`).
  ODUL_ETKINLIK: [
    { enFazla: 1,        altin: 20000, elmas: 1000, klanXp: 5000, kutu: { tur: 'efsanevi', adet: 2 }, ozel: 'Efsanevi Rozeti + Klan Bannerı', ad: '1.' },
    { enFazla: 3,        altin: 15000, elmas: 750,  klanXp: 3500, kutu: { tur: 'efsanevi', adet: 1 }, ozel: 'Altın Rozeti', ad: '2.-3.' },
    { enFazla: 10,       altin: 10000, elmas: 500,  klanXp: 2500, kutu: { tur: 'altin',    adet: 2 }, ozel: null, ad: '4.-10.' },
    { enFazla: 25,       altin: 7500,  elmas: 300,  klanXp: 1800, kutu: { tur: 'gumus',    adet: 2 }, ozel: null, ad: '11.-25.' },
    { enFazla: 50,       altin: 5000,  elmas: 200,  klanXp: 1200, kutu: { tur: 'bronz',    adet: 2 }, ozel: null, ad: '26.-50.' },
    { enFazla: 100,      altin: 3000,  elmas: 100,  klanXp: 800,  kutu: { tur: 'bronz',    adet: 1 }, ozel: null, ad: '51.-100.' },
    { enFazla: 500,      altin: 1500,  elmas: 50,   klanXp: 500,  kutu: { tur: 'katilim',  adet: 1 }, ozel: null, ad: '101.-500.' },
    { enFazla: Infinity, altin: 500,   elmas: 25,   klanXp: 250,  kutu: { tur: 'katilim',  adet: 1 }, ozel: null, ad: '501.+' }
  ],

  // ═══════════════════════════════════════════════════════════════
  //  §12 — SEZON
  // ═══════════════════════════════════════════════════════════════
  // §12.2 takvim — ay numarası (1-12) ve başlangıç ayı
  SEZON: [
    { id: 'ilkbahar', ad: 'İlkbahar', basAy: 3,  bitAy: 5,  renk: '#48c48a' },
    { id: 'yaz',      ad: 'Yaz',      basAy: 6,  bitAy: 8,  renk: '#e8b23a' },
    { id: 'sonbahar', ad: 'Sonbahar', basAy: 9,  bitAy: 11, renk: '#e08a3a' },
    { id: 'kis',      ad: 'Kış',      basAy: 12, bitAy: 2,  renk: '#6ad2ff' }   // Aralık→Şubat
  ],
  // §12.3 haftalık sıralama → sezon puanı katsayısı (KlanSim.SEZON_KATSAYI kopyası)
  SEZON_KATSAYI: [
    { enFazla: 1,        k: 5.0 },
    { enFazla: 3,        k: 4.0 },
    { enFazla: 10,       k: 3.0 },
    { enFazla: 25,       k: 2.5 },
    { enFazla: 50,       k: 2.0 },
    { enFazla: 100,      k: 1.5 },
    { enFazla: 500,      k: 1.0 },
    { enFazla: Infinity, k: 0.5 }
  ],
  // §12.4 sezon ödülleri → KP
  ODUL_SEZON: [
    { enFazla: 1,        altin: 100000, elmas: 5000, klanXp: 20000, ozel: 'Efsanevi Sezon Rozeti + Özel Klan Bannerı', ad: '1.' },
    { enFazla: 3,        altin: 75000,  elmas: 3000, klanXp: 15000, ozel: 'Altın Sezon Rozeti', ad: '2.-3.' },
    { enFazla: 10,       altin: 50000,  elmas: 2000, klanXp: 10000, ozel: 'Gümüş Sezon Rozeti', ad: '4.-10.' },
    { enFazla: 25,       altin: 25000,  elmas: 1000, klanXp: 5000,  ozel: 'Bronz Sezon Rozeti', ad: '11.-25.' },
    { enFazla: 50,       altin: 10000,  elmas: 500,  klanXp: 2500,  ozel: 'Katılım Rozeti', ad: '26.-50.' },
    { enFazla: Infinity, altin: 2000,   elmas: 100,  klanXp: 500,   ozel: 'Katılım Rozeti', ad: '51.+' }
  ],
  SEZON_TASIMA: 0.50,           // §12.5 — lig puanının %50'si taşınır

  // ═══════════════════════════════════════════════════════════════
  //  §34 — ÖZEL GÜN ETKİNLİKLERİ (ödül YALNIZ KP + kozmetik)
  // ═══════════════════════════════════════════════════════════════
  // Tarih aralıkları [basAy, basGun] – [bitAy, bitGun] (dahil).
  // Yıl sınırını aşan aralık (yılbaşı) desteklenir.
  OZEL_GUN: {
    cadilar: {
      ad: 'Cadılar Bayramı', ikon: '\u{1F383}', basAy: 10, basGun: 24, bitAy: 10, bitGun: 31,
      tema: 'Karanlık, sisli haritalar, balkabağı sikkeleri',
      kural: 'Yalnız Canavar Kamyon sınıfı; gece modu zorunlu.',
      renk: '#e08a3a',
      zorlaSinif: 'canavar', zorlaHava: 'gece',
      haritaTercih: ['graveyard', 'cave', 'crystal_cave', 'toxic', 'mushroom'],
      kpBonus: 400,
      kozmetik: ['banner_cadilar', 'boya_balkabagi']
    },
    yilbasi: {
      ad: 'Yılbaşı', ikon: '\u{1F384}', basAy: 12, basGun: 20, bitAy: 1, bitGun: 6,
      tema: 'Karlı haritalar, sikke yerine hediye kutuları',
      kural: 'Tüm araç sınıfları serbest; hediye kutuları ekstra puan.',
      renk: '#6ad2ff',
      zorlaSinif: null, zorlaHava: 'karli',
      haritaTercih: ['winter', 'arctic', 'glacier', 'blizzard', 'aurora_peak'],
      kpBonus: 500,
      kozmetik: ['rozet_yilbasi', 'egzoz_havaifisek']
    },
    yaz: {
      ad: 'Yaz Festivali', ikon: '\u{1F31E}', basAy: 7, basGun: 1, bitAy: 8, bitGun: 31,
      tema: 'Plaj haritaları, güneşli hava',
      kural: 'Sınırsız yakıt, çift sikke.',
      renk: '#e8b23a',
      zorlaSinif: null, zorlaHava: 'gunesli',
      haritaTercih: ['beach', 'desert_oasis', 'savanna', 'carnival', 'countryside'],
      kpBonus: 350,
      kozmetik: ['banner_yaz', 'kiyafet_yaz']
    },
    // ⚠ E11 — gerçek çıkış tarihi belgelenmemiş. TEK NOKTADAN değiştir.
    yildonumu: {
      ad: 'Yıl Dönümü', ikon: '\u{1F382}', basAy: 5, basGun: 12, bitAy: 5, bitGun: 18,
      tema: 'Oyunun geçmişine yolculuk, klasik haritalar',
      kural: 'Yalnız oyunun ilk araçları kullanılabilir.',
      renk: '#e8b23a',
      zorlaSinif: null, zorlaHava: null,
      haritaTercih: ['countryside', 'desert', 'winter', 'city', 'mountains'],
      izinliAraclar: ['jeep', 'motocross', 'monster', 'racecar', 'tractor'],
      kpBonus: 600,
      kozmetik: ['rozet_kurucu', 'kaplama_yildonumu'],
      yerTutucuTarih: true
    }
  },

  // ═══════════════════════════════════════════════════════════════
  //  §26 — LİDER ÖZEL ETKİNLİĞİ
  // ═══════════════════════════════════════════════════════════════
  LIDER_SEVIYE: 34,                            // Klan.KILIT.ozelEtkinlik
  LIDER_SURE_SAAT: [24, 48, 72],               // §26.1
  LIDER_DAGITIM: [0.40, 0.25, 0.15],           // §26.2 — 1./2./3.
  LIDER_KALAN: 0.20,                           // 4.-10. eşit paylaşır
  LIDER_KALAN_SON: 10,

  // §5.1 zaman çizelgesi — haftanın 0. anından itibaren SAAT (E13)
  ZAMAN_CIZELGESI: [
    { saat: 0,   olay: 'Etkinlik başladı' },
    { saat: 12,  olay: 'İlk liderlik tablosu' },
    { saat: 18,  olay: 'Orta nokta uyarısı' },
    { saat: 48,  olay: 'Etkinliğin yarısı geçildi' },
    { saat: 108, olay: 'Final sprint başlangıcı' },
    { saat: 144, olay: 'Son 24 saat' },
    { saat: 162, olay: 'Son 6 saat' },
    { saat: 168, olay: 'Etkinlik bitti, ödüller hesaplanıyor' }
  ],

  // 🔴 Terrain.MAPS YEDEĞİ — 45 GERÇEK harita (js/terrain.js'ten ölçüldü).
  //    Canlıda `Terrain.MAPS` okunur; bu liste yalnız Terrain yüklü değilken
  //    (node doğrulaması) kullanılır. Terrain'e yeni harita eklenirse canlı
  //    taraf kendiliğinden büyür; selfTest farkı raporlar.
  _HARITA_YEDEK: [
    'rainbow_road', 'sandstorm', 'crystal_forest', 'desert_oasis', 'junkyard',
    'cyberpunk_roofs', 'cloud_kingdom', 'meteor_field', 'firefly_forest',
    'aurora_peak', 'skyland', 'sakura', 'graveyard', 'carnival', 'windmill',
    'bamboo', 'lava_river', 'crystal_cave', 'cyber_grid', 'autumn', 'glacier',
    'savanna', 'ruins', 'mushroom', 'stormpeak', 'dag', 'hotwheels',
    'construction', 'blizzard', 'candy', 'toxic', 'rollercoaster',
    'countryside', 'desert', 'winter', 'beach', 'mountains', 'city', 'arctic',
    'jungle', 'mars', 'cave', 'otoyol', 'highland', 'swamp'
  ],

  // 🔴 HAVA SINIFI YEDEĞİ — `_havaTuret()` kuralının 45 harita üzerindeki
  //    ÖLÇÜLMÜŞ çıktısı. Canlıda GorselHava + Terrain'den yeniden türetilir;
  //    selfTest ikisinin AYNI olduğunu doğrular (kural bozulursa yakalanır).
  _HAVA_YEDEK: {
    rainbow_road: 'gece', sandstorm: 'sis', crystal_forest: 'gece',
    desert_oasis: 'gunesli', junkyard: 'gunesli', cyberpunk_roofs: 'gece',
    cloud_kingdom: 'gunesli', meteor_field: 'sis', firefly_forest: 'yagmurlu',
    aurora_peak: 'karli', skyland: 'gunesli', sakura: 'gunesli',
    graveyard: 'firtina', carnival: 'gunesli', windmill: 'gunesli',
    bamboo: 'gunesli', lava_river: 'sis', crystal_cave: 'gece',
    cyber_grid: 'gece', autumn: 'gunesli', glacier: 'karli',
    savanna: 'gunesli', ruins: 'gunesli', mushroom: 'gunesli',
    stormpeak: 'firtina', dag: 'gece', hotwheels: 'gece',
    construction: 'gece', blizzard: 'firtina', candy: 'gunesli',
    toxic: 'gece', rollercoaster: 'gece', countryside: 'gunesli',
    desert: 'sis', winter: 'karli', beach: 'gunesli', mountains: 'gunesli',
    city: 'gunesli', arctic: 'karli', jungle: 'yagmurlu', mars: 'sis',
    cave: 'gece', otoyol: 'gunesli', highland: 'gunesli', swamp: 'yagmurlu'
  },

  // Yedek parlaklık tablosu (Terrain yokken `_havaTuret` gece kararı için).
  _PARLAKLIK_YEDEK: {
    cyberpunk_roofs: 0.032, cyber_grid: 0.037, cave: 0.039, meteor_field: 0.045,
    crystal_cave: 0.058, rainbow_road: 0.075, rollercoaster: 0.081,
    hotwheels: 0.082, toxic: 0.089, aurora_peak: 0.092, crystal_forest: 0.093,
    arctic: 0.094, lava_river: 0.095, firefly_forest: 0.108, mars: 0.137,
    dag: 0.141, swamp: 0.147, graveyard: 0.152, winter: 0.160, stormpeak: 0.163,
    construction: 0.167, jungle: 0.192, junkyard: 0.209, mountains: 0.221,
    mushroom: 0.303, highland: 0.425, autumn: 0.442, beach: 0.489,
    blizzard: 0.544, sandstorm: 0.575, skyland: 0.587, carnival: 0.661,
    ruins: 0.667, desert_oasis: 0.720, savanna: 0.728, cloud_kingdom: 0.748,
    countryside: 0.757, desert: 0.757, city: 0.757, otoyol: 0.757,
    windmill: 0.771, glacier: 0.813, bamboo: 0.818, sakura: 0.820, candy: 0.880
  },

  // ═══════════════════════════════════════════════════════════════
  //  ALTYAPI — TOHUMLU ÜRETEÇ (Math.random YASAK)
  // ═══════════════════════════════════════════════════════════════
  // mulberry32 — `KlanSim._rng` / `procgen.js` `_pg_rng` ile AYNI (E12).
  _rng(tohum) {
    let a = (tohum >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // FNV-1a — 🔴 `Math.imul` ile (düz `*` DEĞİL; sözleşme §7, tuzak D16).
  _hash32(metin) {
    const s = String(metin);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },
  _sayi(v, vars) { const n = Number(v); return isFinite(n) ? n : (vars || 0); },
  _kis(v, alt, ust) { return v < alt ? alt : (v > ust ? ust : v); },
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },

  // ── Dış modül erişimi (bare global tuzağı #10) ──────────────────────────
  _mod(ad) {
    try {
      /* eslint-disable no-undef */
      if (ad === 'Klan') return (typeof Klan !== 'undefined') ? Klan : ((typeof window !== 'undefined' && window.Klan) ? window.Klan : null);
      if (ad === 'KlanSim') return (typeof KlanSim !== 'undefined') ? KlanSim : ((typeof window !== 'undefined' && window.KlanSim) ? window.KlanSim : null);
      if (ad === 'KlanKutu') return (typeof KlanKutu !== 'undefined') ? KlanKutu : ((typeof window !== 'undefined' && window.KlanKutu) ? window.KlanKutu : null);
      if (ad === 'Terrain') return (typeof Terrain !== 'undefined') ? Terrain : ((typeof window !== 'undefined' && window.Terrain) ? window.Terrain : null);
      if (ad === 'GorselHava') return (typeof GorselHava !== 'undefined') ? GorselHava : ((typeof window !== 'undefined' && window.GorselHava) ? window.GorselHava : null);
      if (ad === 'VehicleDefs') return (typeof VehicleDefs !== 'undefined') ? VehicleDefs : ((typeof window !== 'undefined' && window.VehicleDefs) ? window.VehicleDefs : null);
      /* eslint-enable no-undef */
    } catch (e) { }
    return null;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ZAMAN — KlanSim'e devredilir, yoksa AYNI formül
  // ═══════════════════════════════════════════════════════════════
  haftaId(zaman) {
    const S = this._mod('KlanSim');
    if (S && typeof S.haftaId === 'function') return S.haftaId(zaman);
    const t = (zaman == null) ? this._simdi() : Number(zaman);
    return Math.floor(t / this.HAFTA_MS);
  },
  sezonId(zaman) {
    const S = this._mod('KlanSim');
    if (S && typeof S.sezonId === 'function') return S.sezonId(zaman);
    const d = new Date((zaman == null) ? this._simdi() : Number(zaman));
    const y = d.getFullYear(), ay = d.getMonth() + 1;
    if (ay >= 3 && ay <= 5) return y + '-ilkbahar';
    if (ay >= 6 && ay <= 8) return y + '-yaz';
    if (ay >= 9 && ay <= 11) return y + '-sonbahar';
    return (ay === 12 ? y : y - 1) + '-kis';
  },
  sezonHaftasi(zaman) {
    const S = this._mod('KlanSim');
    if (S && typeof S.sezonHaftasi === 'function') return S.sezonHaftasi(zaman);
    const t = (zaman == null) ? this._simdi() : Number(zaman);
    const d = new Date(t), y = d.getFullYear(), ay = d.getMonth() + 1;
    let bY = y, bAy;
    if (ay >= 3 && ay <= 5) bAy = 3;
    else if (ay >= 6 && ay <= 8) bAy = 6;
    else if (ay >= 9 && ay <= 11) bAy = 9;
    else { bAy = 12; if (ay !== 12) bY = y - 1; }
    const bas = new Date(bY, bAy - 1, 1, 0, 0, 0, 0).getTime();
    return Math.max(1, Math.floor((t - bas) / this.HAFTA_MS) + 1);
  },
  // Sezonun mevsim kaydı (§12.2)
  sezonMevsim(zaman) {
    const id = this.sezonId(zaman);
    const par = String(id).split('-');
    const anahtar = par[par.length - 1];
    for (let i = 0; i < this.SEZON.length; i++) if (this.SEZON[i].id === anahtar) return this.SEZON[i];
    return this.SEZON[0];
  },
  sezonKatsayi(siralama) {
    const S = this._mod('KlanSim');
    if (S && typeof S.sezonKatsayi === 'function') return S.sezonKatsayi(siralama);
    const s = Math.max(1, Math.floor(this._sayi(siralama, 9999)));
    for (let i = 0; i < this.SEZON_KATSAYI.length; i++) {
      if (s <= this.SEZON_KATSAYI[i].enFazla) return this.SEZON_KATSAYI[i].k;
    }
    return 0.5;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §5.2 — PUAN HESAPLAMA (6 tür)
  // ═══════════════════════════════════════════════════════════════
  // Ortak çarpan hesabı. `v` = koşu verisi.
  _carpanlar(v, kazasizVar, ilk3Var) {
    let c = 1;
    if (v && v.rekor) c *= this.CARPAN.rekor;
    if (kazasizVar && v && v.kazasiz) c *= this.CARPAN.kazasiz;
    if (ilk3Var && v && v.ilk3) c *= this.CARPAN.ilk3;
    return c;
  },

  // A) MESAFE — kilit: 3500m + rekor + kazasız + ilk3 → 5.533
  puanMesafe(v) {
    const P = this.PUAN.mesafe;
    const d = Math.max(0, this._sayi(v && v.mesafe, 0));
    let ham = d;
    ham += Math.floor(d / P.esik1) * P.bonus1;
    if (d > P.esik2) ham += Math.floor((d - P.esik2) / P.esik1) * P.bonus2;
    if (d > P.esik3) ham += Math.floor((d - P.esik3) / P.esik1) * P.bonus3;
    const c = this._carpanlar(v, true, true);
    return { ham: ham, carpan: c, puan: Math.round(ham * c) };
  },

  // B) HIZ — kilit: 180 km/h + rekor + ilk3 → 2.455
  puanHiz(v) {
    const P = this.PUAN.hiz;
    const s = Math.max(0, this._sayi(v && v.maksHiz, 0));
    let ham = s * P.taban;
    if (s > P.esik1) ham += Math.floor(s - P.esik1) * P.bonus1;
    if (s > P.esik2) ham += Math.floor(s - P.esik2) * P.bonus2;
    const c = this._carpanlar(v, false, true);
    return { ham: ham, carpan: c, puan: Math.round(ham * c) };
  },

  // C) TAKLA — kilit: 12 takla + 2 üçlü + 1 beşli + rekor → 1.331
  puanTakla(v) {
    const P = this.PUAN.takla;
    const f = Math.max(0, Math.floor(this._sayi(v && v.takla, 0)));
    let ham = f * P.taban;
    ham += Math.max(0, f - 1) * P.combo;                                    // E3
    ham += Math.max(0, Math.floor(this._sayi(v && v.uclu, 0))) * P.uclu;
    ham += Math.max(0, Math.floor(this._sayi(v && v.besli, 0))) * P.besli;
    const c = this._carpanlar(v, false, false);
    return { ham: ham, carpan: c, puan: Math.round(ham * c) };
  },

  // D) COIN — kilit: 200 altın + 50 elmas sikke + rekor → 990
  puanCoin(v) {
    const P = this.PUAN.coin;
    const n = Math.max(0, this._sayi(v && v.sikke, 0));
    const a = Math.max(0, this._sayi(v && v.altinSikke, 0));
    const e = Math.max(0, this._sayi(v && v.elmasSikke, 0));
    const ham = P.taban * (n + a * P.altin + e * P.elmas);
    const c = this._carpanlar(v, false, false);
    return { ham: ham, carpan: c, puan: Math.round(ham * c) };
  },

  // E) KOMBİNASYON — kilit: 2000m/160/8/150 + klan ilk3 + dünya ilk10 → 1.850
  puanKombinasyon(v) {
    const P = this.PUAN.komb;
    let ham = Math.max(0, this._sayi(v && v.mesafe, 0)) * P.mesafe
      + Math.max(0, this._sayi(v && v.maksHiz, 0)) * P.hiz
      + Math.max(0, this._sayi(v && v.takla, 0)) * P.takla
      + Math.max(0, this._sayi(v && v.sikke, 0)) * P.coin;
    if (v && v.klanIlk3) ham += P.klanIlk3;
    if (v && v.dunyaIlk10) ham += P.dunyaIlk10;
    const c = this._carpanlar(v, false, false);
    return { ham: ham, carpan: c, puan: Math.round(ham * c) };
  },

  // F) ÖZEL KURAL — araç sınıfı filtresi + ×1.20 (E4)
  //    `v.altTur` hangi taban formülün kullanılacağını söyler (vars. 'mesafe').
  puanOzel(v) {
    const alt = (v && v.altTur) ? String(v.altTur) : 'mesafe';
    const taban = this._puanlaTur(alt, v);
    const c = taban.carpan * this.PUAN.ozel.sinifBonus;
    return { ham: taban.ham, carpan: c, puan: Math.round(taban.ham * c), altTur: alt };
  },

  _puanlaTur(tur, v) {
    switch (String(tur)) {
      case 'mesafe': return this.puanMesafe(v);
      case 'hiz': return this.puanHiz(v);
      case 'takla': return this.puanTakla(v);
      case 'coin': return this.puanCoin(v);
      case 'kombinasyon': return this.puanKombinasyon(v);
      case 'ozel': return this.puanOzel(v);
      default: return { ham: 0, carpan: 1, puan: 0 };
    }
  },
  // Dışa açık ham puan (bir yarışın etkinlik puanı, çarpansız dünya etkileri hariç)
  puanla(tur, v) { return this._puanlaTur(tur, v); },

  // ═══════════════════════════════════════════════════════════════
  //  ARAÇ SINIFI
  // ═══════════════════════════════════════════════════════════════
  _sinifTers: null,
  _sinifIndeks() {
    if (this._sinifTers) return this._sinifTers;
    const t = {};
    for (const s in this.ARAC_SINIF) {
      if (!Object.prototype.hasOwnProperty.call(this.ARAC_SINIF, s)) continue;
      const l = this.ARAC_SINIF[s];
      for (let i = 0; i < l.length; i++) t[l[i]] = s;
    }
    this._sinifTers = t;
    return t;
  },
  aracSinifi(aracId) {
    const t = this._sinifIndeks();
    const s = t[String(aracId)];
    return s ? s : 'diger';
  },
  // §25.1 — araç çarpanı
  aracCarpani(aracId, tur) {
    const s = this.aracSinifi(aracId);
    const sat = this.SINIF_MATRIS[s] || this.SINIF_MATRIS.diger;
    const c = sat[String(tur)];
    return (typeof c === 'number') ? c : 1.0;
  },
  sinifCarpaniTablo(sinifId) {
    return this.SINIF_MATRIS[String(sinifId)] || this.SINIF_MATRIS.diger;
  },
  // Etkinliğin araç sınıfı filtresine uyuyor mu (F türü / özel gün)
  aracUygunMu(etkinlik, aracId) {
    if (!etkinlik) return true;
    if (Array.isArray(etkinlik.izinliAraclar) && etkinlik.izinliAraclar.length) {
      return etkinlik.izinliAraclar.indexOf(String(aracId)) >= 0;
    }
    if (!etkinlik.aracSinifi || etkinlik.aracSinifi === 'tumu') return true;
    return this.aracSinifi(aracId) === etkinlik.aracSinifi;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §25.2 — HAVA KOŞULU (gerçek sistemden TÜRETİLİR, E6)
  // ═══════════════════════════════════════════════════════════════
  _parlaklik(hex) {
    let h = String(hex == null ? '' : hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length < 6) return 1;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) return 1;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  },
  _haritaParlaklik(mapId) {
    const T = this._mod('Terrain');
    if (T && T.MAPS && T.MAPS[mapId] && T.MAPS[mapId].bgColor) return this._parlaklik(T.MAPS[mapId].bgColor);
    const p = this._PARLAKLIK_YEDEK[mapId];
    return (typeof p === 'number') ? p : 1;
  },
  // 🔴 SIRA ÖNEMLİ — değiştirirsen `_HAVA_YEDEK` ile uyuşmaz ve selfTest KALDI verir.
  _havaTuret(mapId) {
    const G = this._mod('GorselHava');
    const h = (G && G.HAVA) ? G.HAVA[mapId] : null;
    if (h) {
      const sim = this._sayi(h.simsek, 0), tip = this._sayi(h.tipi, 0);
      if (sim >= 0.5 || tip >= 0.5) return 'firtina';
      if (this._sayi(h.kar, 0) > 0 || this._sayi(h.buz, 0) >= 0.6) return 'karli';
      if (this._sayi(h.kum, 0) > 0 || this._sayi(h.kul, 0) > 0) return 'sis';
      if (this._sayi(h.yagmur, 0) > 0) return 'yagmurlu';
    }
    if (this._haritaParlaklik(mapId) < this.GECE_PARLAKLIK_ESIK) return 'gece';
    if (h && this._sayi(h.damla, 0) > 0) return 'yagmurlu';
    return 'gunesli';
  },
  havaSinifi(mapId) {
    const id = String(mapId == null ? '' : mapId);
    const G = this._mod('GorselHava');
    if (G && G.HAVA) return this._havaTuret(id);      // canlı: gerçek kaynaktan
    const y = this._HAVA_YEDEK[id];
    if (y) return y;                                   // node: ölçülmüş yedek
    return this._havaTuret(id);
  },
  havaCarpani(mapId) {
    const k = this.HAVA_KOSUL[this.havaSinifi(mapId)];
    return k ? k.carpan : 1.0;
  },
  havaBilgi(mapId) {
    const id = this.havaSinifi(mapId);
    const k = this.HAVA_KOSUL[id];
    return { id: id, ad: k.ad, carpan: k.carpan, renk: k.renk, etki: k.etki };
  },

  // ═══════════════════════════════════════════════════════════════
  //  HAFTANIN ETKİNLİĞİ — TAMAMEN TOHUMLU
  // ═══════════════════════════════════════════════════════════════
  // 🔴 Tür: TEK bir tohumlu permütasyon (σ) + h%6 indeksi.
  //    Böylece "ardışık hafta ASLA aynı tür" MATEMATİKSEL GARANTİ
  //    (σ bijektif, h%6 ile (h-1)%6 farklı). Rastgele seçim yapılsaydı
  //    1/6 olasılıkla üst üste aynı tür gelirdi.
  _permOnbellek: null,
  _turPerm() {
    if (this._permOnbellek) return this._permOnbellek;
    const t = this.TURLER.slice();
    const rnd = this._rng(this._hash32('KlanEtkinlik:turSirasi'));
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1)) % (i + 1);
      const x = t[i]; t[i] = t[j]; t[j] = x;
    }
    this._permOnbellek = t;
    return t;
  },
  tur(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const p = this._turPerm();
    return p[((h % p.length) + p.length) % p.length];
  },

  // Harita: aynı mantık — 45 haritanın tohumlu permütasyonu, h%N indeksi.
  // Garanti: ardışık hafta ASLA aynı harita; N hafta sonunda her harita bir kez.
  _haritaListe() {
    const T = this._mod('Terrain');
    if (T && T.MAPS) {
      const l = [];
      for (const k in T.MAPS) if (Object.prototype.hasOwnProperty.call(T.MAPS, k)) l.push(k);
      if (l.length) { l.sort(); return l; }
    }
    return this._HARITA_YEDEK.slice().sort();
  },
  _haritaPermOnbellek: null,
  _haritaPermAnahtar: '',
  _haritaPerm() {
    const l = this._haritaListe();
    const anahtar = l.length + '|' + l[0] + '|' + l[l.length - 1];
    if (this._haritaPermOnbellek && this._haritaPermAnahtar === anahtar) return this._haritaPermOnbellek;
    const rnd = this._rng(this._hash32('KlanEtkinlik:haritaSirasi|' + anahtar));
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1)) % (i + 1);
      const x = l[i]; l[i] = l[j]; l[j] = x;
    }
    this._haritaPermOnbellek = l;
    this._haritaPermAnahtar = anahtar;
    return l;
  },
  harita(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const p = this._haritaPerm();
    return p[((h % p.length) + p.length) % p.length];
  },

  // Pist modifikasyonları: 0-2 adet, TOHUMLU (§25.3 + §26.1 MOD_MAKS).
  pistModlari(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const idler = [];
    for (const k in this.PIST_MOD) if (Object.prototype.hasOwnProperty.call(this.PIST_MOD, k)) idler.push(k);
    idler.sort();
    const rnd = this._rng(this._hash32('KlanEtkinlik:pistMod|' + h));
    // %30 hiç mod yok · %45 tek mod · %25 iki mod
    const r0 = rnd();
    const adet = (r0 < 0.30) ? 0 : (r0 < 0.75 ? 1 : 2);
    const secili = [];
    const havuz = idler.slice();
    for (let i = 0; i < adet && havuz.length; i++) {
      const j = Math.floor(rnd() * havuz.length) % havuz.length;
      secili.push(havuz[j]);
      havuz.splice(j, 1);
    }
    secili.sort();
    return secili;
  },

  // Özel kural (F) haftasında hangi araç sınıfı zorunlu — TOHUMLU
  ozelSinif(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const l = ['kamyon', 'motosiklet', 'formula', 'suv', 'canavar', 'spor'];
    const rnd = this._rng(this._hash32('KlanEtkinlik:ozelSinif|' + h));
    return l[Math.floor(rnd() * l.length) % l.length];
  },

  // ── Haftanın TAM etkinlik tanımı ────────────────────────────────────────
  hafta(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const tur = this.tur(h);
    const harita = this.harita(h);
    const hava = this.havaBilgi(harita);
    const modlar = this.pistModlari(h);
    const ozelGun = this.ozelGun(h * this.HAFTA_MS + this.HAFTA_MS / 2);

    let aracSinifi = (tur === 'ozel') ? this.ozelSinif(h) : 'tumu';
    let etkinHava = hava;
    let izinliAraclar = null;
    if (ozelGun) {
      if (ozelGun.zorlaSinif) aracSinifi = ozelGun.zorlaSinif;
      if (ozelGun.zorlaHava && this.HAVA_KOSUL[ozelGun.zorlaHava]) {
        const k = this.HAVA_KOSUL[ozelGun.zorlaHava];
        etkinHava = { id: ozelGun.zorlaHava, ad: k.ad, carpan: k.carpan, renk: k.renk, etki: k.etki };
      }
      // ⚠ Açık araç listesi sınıf filtresini EZER (`aracUygunMu` önce ona bakar).
      //   UI çelişkili filtre göstermesin diye sınıf da 'tumu'ya çekilir.
      if (Array.isArray(ozelGun.izinliAraclar)) {
        izinliAraclar = ozelGun.izinliAraclar.slice();
        aracSinifi = 'tumu';
      }
    }

    const meta = this.TUR_META[tur];
    return {
      haftaId: h,
      tur: tur,
      turAd: meta.ad,
      kural: meta.kural,
      renk: ozelGun ? ozelGun.renk : meta.renk,
      ikon: meta.ikon,
      harita: harita,
      hava: etkinHava,
      pistModlari: modlar,
      pistModDetay: this.modDetaylari(modlar),
      aracSinifi: aracSinifi,
      izinliAraclar: izinliAraclar,
      ozelGun: ozelGun ? ozelGun.id : null,
      ozelGunAd: ozelGun ? ozelGun.ad : null,
      baslangic: h * this.HAFTA_MS,
      bitis: (h + 1) * this.HAFTA_MS - 1,
      sezonId: this.sezonId(h * this.HAFTA_MS),
      sezonHaftasi: this.sezonHaftasi(h * this.HAFTA_MS),
      acik: this.acikMi()
    };
  },
  modDetaylari(idler) {
    const l = [];
    if (!Array.isArray(idler)) return l;
    for (let i = 0; i < idler.length; i++) {
      const d = this.PIST_MOD[idler[i]];
      if (d) l.push({ id: idler[i], ad: d.ad, aciklama: d.aciklama, renk: d.renk, puanTur: d.puanTur, puanCarpan: d.puanCarpan, oynanis: d.oynanis });
    }
    return l;
  },
  // §4.3 seviye 4 kapısı
  acikMi() {
    const K = this._mod('Klan');
    if (!K || typeof K.ozellikAcik !== 'function') return false;
    return !!K.ozellikAcik('etkinlik');
  },
  // §5.1 çizelgesinde neredeyiz
  ilerleme(zaman) {
    const t = (zaman == null) ? this._simdi() : Number(zaman);
    const h = this.haftaId(t);
    const gecen = t - h * this.HAFTA_MS;
    const saat = gecen / 3600000;
    let son = this.ZAMAN_CIZELGESI[0];
    for (let i = 0; i < this.ZAMAN_CIZELGESI.length; i++) {
      if (saat >= this.ZAMAN_CIZELGESI[i].saat) son = this.ZAMAN_CIZELGESI[i];
    }
    return {
      haftaId: h, gecenSaat: Math.floor(saat), kalanSaat: Math.max(0, Math.ceil(168 - saat)),
      oran: this._kis(saat / 168, 0, 1), asama: son.olay
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §25.2 — FİNAL SKOR
  //  Final = Ham × Araç × Koşul × PistMod × Handikap × KlanSınıfı
  // ═══════════════════════════════════════════════════════════════
  finalSkor(etkinlik, kosu) {
    const e = etkinlik || this.hafta();
    const k = kosu || {};
    const tur = e.tur;

    // Araç sınıfı filtresi (F türü / özel gün)
    if (!this.aracUygunMu(e, k.aracId)) {
      return { puan: 0, ham: 0, gecersiz: true, sebep: 'ARAC_SINIFI_UYGUN_DEGIL', beklenen: e.aracSinifi };
    }

    // 1) Ham puan (§5.2)
    const veri = {};
    for (const a in k) if (Object.prototype.hasOwnProperty.call(k, a)) veri[a] = k[a];
    if (tur === 'ozel' && !veri.altTur) veri.altTur = 'mesafe';
    const taban = this._puanlaTur(tur, veri);

    // 2) Araç çarpanı (§25.1)
    const cArac = this.aracCarpani(k.aracId, tur);

    // 3) Hava koşulu (§25.2)
    const cHava = (e.hava && typeof e.hava.carpan === 'number') ? e.hava.carpan : 1.0;

    // 4) Pist modifikasyonları (§25.3) — yalnız ilgili tür/koşul için
    let cMod = 1.0;
    const modUyg = [];
    const modlar = Array.isArray(e.pistModlari) ? e.pistModlari : [];
    for (let i = 0; i < modlar.length; i++) {
      const d = this.PIST_MOD[modlar[i]];
      if (!d || !d.puanTur) continue;
      const uygun = (d.puanTur === 'kazasiz') ? !!veri.kazasiz : (d.puanTur === tur);
      if (uygun) { cMod *= d.puanCarpan; modUyg.push(modlar[i]); }
    }

    // 5) Güçlendirici (§25.4) — yalnız verilmişse
    let cBoost = 1.0;
    if (Array.isArray(k.boostlar)) {
      for (let i = 0; i < k.boostlar.length; i++) {
        const b = this.BOOST[k.boostlar[i]];
        if (b && typeof b.puanCarpan === 'number') cBoost *= b.puanCarpan;
      }
    }

    // 6) Klan sınıfı bonusu (§30.2 — Klan.sinifCarpani)
    let cKlanSinif = 1.0;
    const K = this._mod('Klan');
    if (K && typeof K.sinifCarpani === 'function') cKlanSinif = this._sayi(K.sinifCarpani(tur), 1);

    // 7) Handikap (§25.5) — yalnız açıkça istenirse
    let cHandikap = 1.0;
    if (k.handikap === true) cHandikap = this.handikap(k.oyuncuOrt, k.sunucuOrt, e.haftaId);
    else if (typeof k.handikap === 'number' && isFinite(k.handikap)) cHandikap = k.handikap;

    const toplam = cArac * cHava * cMod * cBoost * cKlanSinif * cHandikap;
    return {
      ham: taban.ham,
      tabanPuan: taban.puan,
      aracCarpan: cArac,
      havaCarpan: cHava,
      modCarpan: cMod,
      boostCarpan: cBoost,
      klanSinifCarpan: cKlanSinif,
      handikapCarpan: cHandikap,
      toplamCarpan: toplam,
      uygulananModlar: modUyg,
      puan: Math.round(taban.puan * toplam),
      gecersiz: false
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §5.3 — ETKİNLİK PUANININ KLAN SKORUNA DÖNÜŞÜMÜ
  //  Klan_Skoru = Σ (üyenin EN İYİ 3 yarışının ORTALAMASI)
  // ═══════════════════════════════════════════════════════════════
  enIyiOrtalama(puanlar) {
    if (!Array.isArray(puanlar) || !puanlar.length) return 0;
    const l = [];
    for (let i = 0; i < puanlar.length; i++) {
      const n = this._sayi(puanlar[i], 0);
      if (n > 0) l.push(n);
    }
    if (!l.length) return 0;
    l.sort(function (a, b) { return b - a; });                 // AZALAN
    const n = Math.min(this.EN_IYI_N, l.length);               // <3 yarış → mevcut kadar
    let t = 0;
    for (let i = 0; i < n; i++) t += l[i];
    return Math.round(t / n);
  },
  // `uyeler`: [{ id, ad, puanlar:[...] }]  → { toplam, satirlar[] }
  klanSkoru(uyeler) {
    const satirlar = [];
    let toplam = 0;
    if (Array.isArray(uyeler)) {
      for (let i = 0; i < uyeler.length; i++) {
        const u = uyeler[i] || {};
        const ort = this.enIyiOrtalama(u.puanlar);
        toplam += ort;
        satirlar.push({
          id: u.id != null ? u.id : ('uye' + i),
          ad: u.ad != null ? String(u.ad) : '',
          yarisSayisi: Array.isArray(u.puanlar) ? u.puanlar.length : 0,
          ortalama: ort
        });
      }
    }
    satirlar.sort(function (a, b) {
      if (b.ortalama !== a.ortalama) return b.ortalama - a.ortalama;
      const ia = String(a.id), ib = String(b.id);
      return ia < ib ? -1 : (ia > ib ? 1 : 0);
    });
    for (let i = 0; i < satirlar.length; i++) satirlar[i].siralama = i + 1;
    return { toplam: toplam, satirlar: satirlar, uyeSayisi: satirlar.length };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §25.5 — HANDİKAP (E7)
  // ═══════════════════════════════════════════════════════════════
  // Tasarım METNİNDEKİ formül (işaret hatalı, karşılaştırma için duruyor).
  handikapHam(oyuncuOrt, sunucuOrt) {
    const s = this._sayi(sunucuOrt, 0);
    if (s <= 0) return 1;
    const o = this._sayi(oyuncuOrt, 0);
    return 1 + ((o - s) / s) * this.HANDIKAP_KATSAYI;
  },
  // Tasarımın ANLATTIĞI davranış: güçlü oyuncu 1'in ALTINA düşer.
  handikap(oyuncuOrt, sunucuOrt, haftaId) {
    const s = (sunucuOrt == null) ? this.sunucuOrtalamasi(haftaId) : this._sayi(sunucuOrt, 0);
    if (!(s > 0)) return 1;
    const o = this._sayi(oyuncuOrt, 0);
    const c = 1 - ((o - s) / s) * this.HANDIKAP_KATSAYI;
    return this._kis(c, this.HANDIKAP_ALT, this.HANDIKAP_UST);
  },
  // E8 — "sunucu ortalaması" karşılığı: bot tablosunun üye başı katkı ortalaması
  _sunucuOnbellek: {},
  sunucuOrtalamasi(haftaId) {
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    if (this._sunucuOnbellek[h] != null) return this._sunucuOnbellek[h];
    const S = this._mod('KlanSim');
    let ort = 0;
    if (S && typeof S.botKlanlar === 'function') {
      const l = S.botKlanlar(h);
      if (Array.isArray(l) && l.length) {
        let t = 0;
        for (let i = 0; i < l.length; i++) t += this._sayi(l[i].ortKatki, 0);
        ort = t / l.length;
      }
    }
    this._sunucuOnbellek[h] = ort;
    return ort;
  },
  oyuncuOrtalamasi(puanlar) {
    if (!Array.isArray(puanlar) || !puanlar.length) return 0;
    let t = 0, n = 0;
    for (let i = 0; i < puanlar.length; i++) { const v = this._sayi(puanlar[i], 0); if (v > 0) { t += v; n++; } }
    return n ? t / n : 0;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ÖDÜLLER — 🔴 YALNIZ KP (sözleşme §6)
  // ═══════════════════════════════════════════════════════════════
  // Merkezi dönüşüm `Klan.kpCevir`; Klan yüklü değilse BİREBİR AYNI formül.
  _kp(altin, elmas) {
    const K = this._mod('Klan');
    if (K && typeof K.kpCevir === 'function') return K.kpCevir(altin, elmas);
    const a = Math.max(0, this._sayi(altin, 0)), e = Math.max(0, this._sayi(elmas, 0));
    return Math.round(a / 100 + e * 4);
  },
  _odulCarpani() {
    const K = this._mod('Klan');
    if (K && typeof K.odulCarpani === 'function') return this._sayi(K.odulCarpani(), 1);
    return 1;
  },
  // Ham KP (çarpansız) — sözleşme §6 tablosuyla kilitlenen değer budur.
  _kademe(tablo, siralama) {
    const s = Math.max(1, Math.floor(this._sayi(siralama, 9999)));
    for (let i = 0; i < tablo.length; i++) if (s <= tablo[i].enFazla) return tablo[i];
    return tablo[tablo.length - 1];
  },
  etkinlikOdulu(siralama) {
    const k = this._kademe(this.ODUL_ETKINLIK, siralama);
    const ham = this._kp(k.altin, k.elmas);
    return {
      kademe: k.ad, siralama: Math.max(1, Math.floor(this._sayi(siralama, 9999))),
      kp: ham, kpCarpanli: Math.round(ham * this._odulCarpani()),
      klanXp: k.klanXp, kutu: k.kutu, ozel: k.ozel,
      kaynakAltin: k.altin, kaynakElmas: k.elmas       // izlenebilirlik (verilmez)
    };
  },
  sezonOdulu(siralama) {
    const k = this._kademe(this.ODUL_SEZON, siralama);
    const ham = this._kp(k.altin, k.elmas);
    return {
      kademe: k.ad, siralama: Math.max(1, Math.floor(this._sayi(siralama, 9999))),
      kp: ham, kpCarpanli: Math.round(ham * this._odulCarpani()),
      klanXp: k.klanXp, ozel: k.ozel,
      kaynakAltin: k.altin, kaynakElmas: k.elmas
    };
  },

  // ÖDEME ÖLÇEĞİ (2 Ağu — ana oturum) ────────────────────────────────────
  // 🔴 `etkinlikOdulu().kp` sözleşme §6 ile KİLİTLİ (501+ → 105, 1. → 4.200);
  //    o tabloya DOKUNULMAZ. Ölçek yalnız ÖDEME anında uygulanır — `klan-savas.js`
  //    `ODUL_OLCEK` deseniyle aynı.
  // GEREKÇE (ölçüldü, `dogrula-klan.js` D bölümü): sv20'de haftalık toplam KP
  //   girişi kutu+görev 530 · etkinlik 332 · sezon 48 · savaş 178 = **1.088**.
  //   Sözleşme hedefi 600-900. Savaş zaten 0,01'e çekildi; kalan taşma
  //   etkinlik+sezondan geliyor. 0,55 ölçek → etkinlik 183 + sezon 26 = 209,
  //   yeni toplam ≈ **917 → görev ölçeği 0,25→0,18 ile ≈ 841.**
  // ⚠ Bunu değiştirirsen `dogrula-klan.js` D bölümü bandı da güncellenmeli.
  ODEME_OLCEK: 0.55,
  _ode(kpCarpanli) { return Math.max(1, Math.round(kpCarpanli * this.ODEME_OLCEK)); },

  // Etkinlik sonu: KP + XP + kutu dağıtımı (kutu Ajan D'ye devredilir)
  etkinlikOdulDagit(siralama, haftaId) {
    const o = this.etkinlikOdulu(siralama);
    const K = this._mod('Klan');
    const sonuc = { kp: 0, xp: 0, kutu: null, ozel: o.ozel, siralama: o.siralama, kademe: o.kademe };
    if (!K || typeof K.kpEkle !== 'function') return sonuc;
    o.kpCarpanli = this._ode(o.kpCarpanli);
    sonuc.kp = o.kpCarpanli;
    K.kpEkle(o.kpCarpanli, 'etkinlik');
    // §4.1 klan XP — etkinlik katılımı (Klan kendi günlük sınırını uygular)
    if (typeof K.xpEkle === 'function') sonuc.xp = 1;
    if (typeof K.xpEkle === 'function') K.xpEkle('etkinlik', o.klanXp);
    // Kutu → KlanKutu (yoksa sessizce atla)
    const KK = this._mod('KlanKutu');
    if (KK && o.kutu && typeof KK.ver === 'function') {
      try { KK.ver(o.kutu.tur, o.kutu.adet, 'etkinlik'); sonuc.kutu = o.kutu; } catch (e) { }
    }
    if (typeof K.duyuru === 'function') {
      K.duyuru('etkinlik', 'Haftalık etkinlik bitti: ' + o.kademe + ' sıra, +' + o.kpCarpanli + ' KP.',
        { haftaId: (haftaId == null ? this.haftaId() : haftaId), siralama: o.siralama, kp: o.kpCarpanli });
    }
    return sonuc;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §12.3 / §12.5 — SEZON PUANI VE SIFIRLAMA
  // ═══════════════════════════════════════════════════════════════
  // Bir haftanın sezon puanı katkısı = haftalık puan × sıra katsayısı
  haftaSezonPuani(haftalikPuan, siralama) {
    return Math.round(Math.max(0, this._sayi(haftalikPuan, 0)) * this.sezonKatsayi(siralama));
  },
  // `haftalar`: [{ puan, siralama }] → toplam sezon puanı (§12.3 örneği kilitli)
  sezonPuani(haftalar) {
    let t = 0;
    const satirlar = [];
    if (Array.isArray(haftalar)) {
      for (let i = 0; i < haftalar.length; i++) {
        const h = haftalar[i] || {};
        const k = this.sezonKatsayi(h.siralama);
        const p = this.haftaSezonPuani(h.puan, h.siralama);
        t += p;
        satirlar.push({ hafta: i + 1, puan: this._sayi(h.puan, 0), siralama: this._sayi(h.siralama, 0), katsayi: k, sezonPuani: p });
      }
    }
    return { toplam: t, satirlar: satirlar };
  },
  // §12.5 — sezon sonu. Girdiyi DEĞİŞTİRMEZ, yeni durum döner.
  sezonKapat(durum, siralama) {
    const d = durum || {};
    const eskiLig = Math.max(0, Math.floor(this._sayi(d.ligPuan, 0)));
    const odul = this.sezonOdulu(siralama);
    return {
      sezonPuan: 0,
      haftalikPuan: 0,
      ligPuan: Math.floor(eskiLig * this.SEZON_TASIMA),
      tasinanOran: this.SEZON_TASIMA,
      eskiLigPuan: eskiLig,
      odul: odul,
      rozet: odul.ozel
    };
  },
  // Sezon kapanışını gerçekten uygula (KP + duyuru). Klan verisini Klan yazar.
  sezonOdulDagit(siralama) {
    const o = this.sezonOdulu(siralama);
    const K = this._mod('Klan');
    o.kpCarpanli = this._ode(o.kpCarpanli);   // ödeme ölçeği (yukarı bak)
    if (K && typeof K.kpEkle === 'function') K.kpEkle(o.kpCarpanli, 'sezon');
    if (K && typeof K.duyuru === 'function') {
      K.duyuru('sezon', 'Sezon bitti: ' + o.kademe + ' sıra, +' + o.kpCarpanli + ' KP.',
        { siralama: o.siralama, kp: o.kpCarpanli, rozet: o.ozel });
    }
    return o;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §34 — ÖZEL GÜN ETKİNLİKLERİ
  // ═══════════════════════════════════════════════════════════════
  _tarihIcinde(ay, gun, k) {
    const bas = k.basAy * 100 + k.basGun;
    const bit = k.bitAy * 100 + k.bitGun;
    const su = ay * 100 + gun;
    if (bas <= bit) return su >= bas && su <= bit;
    return su >= bas || su <= bit;      // yıl sınırını aşan aralık (yılbaşı)
  },
  ozelGun(zaman) {
    const t = (zaman == null) ? this._simdi() : Number(zaman);
    const d = new Date(t);
    const ay = d.getMonth() + 1, gun = d.getDate();
    // Sıra sabit ve belirleyici (çakışırsa ilk eşleşen kazanır)
    const sira = ['cadilar', 'yilbasi', 'yaz', 'yildonumu'];
    for (let i = 0; i < sira.length; i++) {
      const k = this.OZEL_GUN[sira[i]];
      if (this._tarihIcinde(ay, gun, k)) {
        const o = {};
        for (const a in k) if (Object.prototype.hasOwnProperty.call(k, a)) o[a] = k[a];
        o.id = sira[i];
        return o;
      }
    }
    return null;
  },
  // Özel gün ödülü: 🔴 YALNIZ KP + kozmetik (altın/elmas alanı YOK)
  ozelGunOdulu(id) {
    const k = this.OZEL_GUN[String(id)];
    if (!k) return null;
    const kp = Math.max(0, Math.floor(this._sayi(k.kpBonus, 0)));
    return {
      id: String(id), ad: k.ad, tema: k.tema, kural: k.kural, renk: k.renk,
      kp: kp, kpCarpanli: Math.round(kp * this._odulCarpani()),
      kozmetik: Array.isArray(k.kozmetik) ? k.kozmetik.slice() : []
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §26 — LİDER ÖZEL ETKİNLİĞİ (seviye 34)
  // ═══════════════════════════════════════════════════════════════
  liderAcikMi() {
    const K = this._mod('Klan');
    if (!K || typeof K.ozellikAcik !== 'function') return false;
    return !!K.ozellikAcik('ozelEtkinlik');
  },
  // Parametreleri doğrula ve etkinliği kur. Hata → { ok:false, hata }
  liderEtkinlikKur(p) {
    const par = p || {};
    if (!this.liderAcikMi()) return { ok: false, hata: 'ERR_SEVIYE', mesaj: 'Klan seviyesi ' + this.LIDER_SEVIYE + ' gerekiyor.' };

    const tur = String(par.tur == null ? '' : par.tur);
    if (this.TURLER.indexOf(tur) < 0) return { ok: false, hata: 'ERR_TUR', mesaj: 'Geçersiz etkinlik türü.' };

    const haritalar = this._haritaListe();
    let harita = String(par.harita == null ? 'rastgele' : par.harita);
    if (harita === 'rastgele') {
      const rnd = this._rng(this._hash32('lider|' + this.haftaId() + '|' + tur));
      harita = haritalar[Math.floor(rnd() * haritalar.length) % haritalar.length];
    } else if (haritalar.indexOf(harita) < 0) {
      return { ok: false, hata: 'ERR_HARITA', mesaj: 'Bilinmeyen harita.' };
    }

    const sinif = String(par.aracSinifi == null ? 'tumu' : par.aracSinifi);
    if (sinif !== 'tumu' && !this.SINIF_MATRIS[sinif]) return { ok: false, hata: 'ERR_SINIF', mesaj: 'Bilinmeyen araç sınıfı.' };

    const sure = Math.floor(this._sayi(par.sureSaat, 24));
    if (this.LIDER_SURE_SAAT.indexOf(sure) < 0) return { ok: false, hata: 'ERR_SURE', mesaj: 'Süre 24, 48 veya 72 saat olmalı.' };

    let hava = par.hava;
    if (hava == null || hava === 'rastgele') hava = this.havaSinifi(harita);
    if (!this.HAVA_KOSUL[hava]) return { ok: false, hata: 'ERR_HAVA', mesaj: 'Bilinmeyen hava koşulu.' };

    const modlar = [];
    if (Array.isArray(par.pistModlari)) {
      for (let i = 0; i < par.pistModlari.length; i++) {
        const m = String(par.pistModlari[i]);
        if (!this.PIST_MOD[m]) return { ok: false, hata: 'ERR_MOD', mesaj: 'Bilinmeyen pist modifikasyonu.' };
        if (modlar.indexOf(m) < 0) modlar.push(m);
      }
    }
    if (modlar.length > this.MOD_MAKS) return { ok: false, hata: 'ERR_MOD_SAYI', mesaj: 'En fazla ' + this.MOD_MAKS + ' modifikasyon.' };

    const havuz = Math.max(0, Math.floor(this._sayi(par.odulHavuzuKP, 0)));
    const K = this._mod('Klan');
    if (K && typeof K.kp === 'function' && havuz > K.kp()) {
      return { ok: false, hata: 'ERR_KASA', mesaj: 'Klan kasasında yeterli KP yok.' };
    }

    const k = this.HAVA_KOSUL[hava];
    const bas = this._simdi();
    const et = {
      lider: true,
      tur: tur,
      turAd: this.TUR_META[tur].ad,
      kural: this.TUR_META[tur].kural,
      renk: this.TUR_META[tur].renk,
      harita: harita,
      hava: { id: hava, ad: k.ad, carpan: k.carpan, renk: k.renk, etki: k.etki },
      pistModlari: modlar,
      pistModDetay: this.modDetaylari(modlar),
      aracSinifi: sinif,
      izinliAraclar: null,
      sureSaat: sure,
      baslangic: bas,
      bitis: bas + sure * 3600000,
      odulHavuzuKP: havuz,
      odulKutusu: par.odulKutusu ? String(par.odulKutusu) : null,
      dagitim: this.liderOdulDagit(havuz)
    };
    return { ok: true, hata: null, etkinlik: et };
  },
  // §26.2 — %40 / %25 / %15 / (4.-10. kalan %20 eşit)
  liderOdulDagit(havuzKP, katilimci) {
    const havuz = Math.max(0, Math.floor(this._sayi(havuzKP, 0)));
    const n = Math.max(1, Math.floor(this._sayi(katilimci, this.LIDER_KALAN_SON)));
    const paylar = [];
    let dagitilan = 0;
    for (let i = 0; i < this.LIDER_DAGITIM.length && i < n; i++) {
      const v = Math.floor(havuz * this.LIDER_DAGITIM[i]);
      paylar.push({ siralama: i + 1, oran: this.LIDER_DAGITIM[i], kp: v });
      dagitilan += v;
    }
    const kalanKisi = Math.max(0, Math.min(n, this.LIDER_KALAN_SON) - this.LIDER_DAGITIM.length);
    if (kalanKisi > 0) {
      const kalanTop = Math.floor(havuz * this.LIDER_KALAN);
      const kisiBasi = Math.floor(kalanTop / kalanKisi);
      for (let i = 0; i < kalanKisi; i++) {
        paylar.push({ siralama: this.LIDER_DAGITIM.length + i + 1, oran: this.LIDER_KALAN / kalanKisi, kp: kisiBasi });
        dagitilan += kisiBasi;
      }
    }
    // Yuvarlama artığı 1.'ye — havuz KORUNUR (selfTest ölçer).
    const artik = havuz - dagitilan;
    if (artik > 0 && paylar.length) { paylar[0].kp += artik; dagitilan += artik; }
    return { havuz: havuz, dagitilan: dagitilan, paylar: paylar, oranToplami: this.LIDER_DAGITIM[0] + this.LIDER_DAGITIM[1] + this.LIDER_DAGITIM[2] + this.LIDER_KALAN };
  },

  // ═══════════════════════════════════════════════════════════════
  hazir() {
    this._sinifTers = null;
    this._permOnbellek = null;
    this._haritaPermOnbellek = null;
    this._haritaPermAnahtar = '';
    this._sunucuOnbellek = {};
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  selfTest — HER KONTROL ÖLÇEREK
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const eski = this._testZaman;
    this.hazir();

    // ── 1-6) §5.2'nin ALTI ÖRNEK HESABI (birebir kilit) ──────────────────
    r.ornekMesafe = (this.puanMesafe({ mesafe: 3500, rekor: true, kazasiz: true, ilk3: true }).puan === 5533);
    r.ornekHiz = (this.puanHiz({ maksHiz: 180, rekor: true, ilk3: true }).puan === 2455);
    r.ornekTakla = (this.puanTakla({ takla: 12, uclu: 2, besli: 1, rekor: true }).puan === 1331);
    r.ornekCoin = (this.puanCoin({ altinSikke: 200, elmasSikke: 50, rekor: true }).puan === 990);
    r.ornekKombinasyon = (this.puanKombinasyon({ mesafe: 2000, maksHiz: 160, takla: 8, sikke: 150, klanIlk3: true, dunyaIlk10: true }).puan === 1850);
    r.ornekOzel = (this.puanOzel({ mesafe: 3500, rekor: true, kazasiz: true, ilk3: true }).puan === 6640);

    // Tasarımın ara örnekleri de tutmalı (kümülatif kural kanıtı)
    r.mesafeAra = (this.puanMesafe({ mesafe: 1000 }).puan === 1020 &&
      this.puanMesafe({ mesafe: 2000 }).puan === 2070);

    // ── 7-9) SÖZLEŞME §6 — KP DÖNÜŞÜMÜ ──────────────────────────────────
    r.kpEtkinlik501 = (this.etkinlikOdulu(9999).kp === 105);
    r.kpEtkinlik1 = (this.etkinlikOdulu(1).kp === 4200);
    r.kpSezon1 = (this.sezonOdulu(1).kp === 21000);
    // 8 kademenin hepsi hesaplanabiliyor ve AZALAN
    (function (self) {
      let ok = true, once = Infinity;
      const sira = [1, 2, 4, 11, 26, 51, 101, 501];
      for (let i = 0; i < sira.length; i++) {
        const k = self.etkinlikOdulu(sira[i]).kp;
        if (!(k > 0) || k >= once) { ok = false; break; }
        once = k;
      }
      r.odulTablosuAzalan = ok;
    })(this);
    // Ödül nesnesinde oyuncuya verilecek altın/elmas alanı YOK
    (function (self) {
      const o = self.etkinlikOdulu(1);
      r.odulYalnizKP = (typeof o.kp === 'number' && o.altin === undefined && o.elmas === undefined);
    })(this);

    // ── 10) §5.3 — EN İYİ 3 ORTALAMASI (tasarım örneği: 3.367) ──────────
    (function (self) {
      const s = self.klanSkoru([
        { id: 'u1', puanlar: [1200, 1100, 1050] },
        { id: 'u2', puanlar: [950, 900, 850] },
        { id: 'u3', puanlar: [800, 750, 700] },
        { id: 'u4', puanlar: [650, 600, 550] }
      ]);
      r.klanSkoruOrnek = (s.toplam === 3367 && s.satirlar[0].ortalama === 1117);
      // 5 yarıştan yalnız EN İYİ 3'ü sayılmalı
      const s2 = self.enIyiOrtalama([100, 100, 1200, 1100, 1050]);
      r.enIyiUcSecimi = (s2 === 1117);
    })(this);

    // ── 11-12) DETERMİNİZM ───────────────────────────────────────────────
    (function (self) {
      const a = self.hafta(2900), b = self.hafta(2900);
      r.ayniHaftaAyniEtkinlik = (JSON.stringify(a) === JSON.stringify(b));
      let farkli = true, turler = {}, harFarkli = true;
      for (let h = 2000; h < 2500; h++) {
        const t = self.tur(h);
        turler[t] = 1;
        if (t === self.tur(h - 1)) { farkli = false; break; }
        if (self.harita(h) === self.harita(h - 1)) { harFarkli = false; break; }
      }
      r.ardisikHaftaFarkliTur = farkli;
      r.ardisikHaftaFarkliHarita = harFarkli;
      r.altiTurDeKullaniliyor = (Object.keys(turler).length === 6);
      // Pist modifikasyonu tohumlu ve 0..2 arası
      let modOk = true;
      for (let h = 2000; h < 2200; h++) {
        const m1 = self.pistModlari(h), m2 = self.pistModlari(h);
        if (m1.join(',') !== m2.join(',') || m1.length > self.MOD_MAKS) { modOk = false; break; }
        for (let i = 0; i < m1.length; i++) if (!self.PIST_MOD[m1[i]]) { modOk = false; break; }
      }
      r.pistModTohumlu = modOk;
      // 45 hafta içinde her harita tam bir kez
      const gor = {};
      const N = self._haritaPerm().length;
      for (let h = 0; h < N; h++) gor[self.harita(h)] = (gor[self.harita(h)] || 0) + 1;
      let kapsam = (Object.keys(gor).length === N);
      for (const k in gor) if (gor[k] !== 1) kapsam = false;
      r.haritaKapsami = kapsam;
    })(this);

    // ── 13) Math.random ÇAĞRISI 0 ────────────────────────────────────────
    (function (self) {
      const org = Math.random;
      let sayac = 0;
      Math.random = function () { sayac++; return org(); };
      try {
        self.hazir();
        for (let h = 3000; h < 3020; h++) {
          self.hafta(h); self.tur(h); self.harita(h); self.pistModlari(h); self.ozelSinif(h);
          self.finalSkor(self.hafta(h), { mesafe: 1200, maksHiz: 120, takla: 3, sikke: 40, aracId: 'jeep' });
        }
        self.etkinlikOdulu(1); self.sezonOdulu(1); self.liderOdulDagit(10000);
      } catch (e) { sayac = -1; }
      Math.random = org;
      r.mathRandomKullanilmiyor = (sayac === 0);
    })(this);

    // ── 14) §12.2 SEZON TAKVİMİ — 4 mevsim sınırı ────────────────────────
    (function (self) {
      const y = 2026;
      // ⚠ `_testZaman`'a GÜVENME: `sezonId` KlanSim'e devrediyor ve onun kendi
      //   `_testZaman`'ı var. Zaman AÇIKÇA geçilir (KlanSim yüklüyken de tutar).
      const s = function (ay, gun) { return self.sezonId(new Date(y, ay - 1, gun, 12, 0, 0, 0).getTime()); };
      const ok =
        s(3, 1) === y + '-ilkbahar' && s(5, 31) === y + '-ilkbahar' &&
        s(6, 1) === y + '-yaz' && s(8, 31) === y + '-yaz' &&
        s(9, 1) === y + '-sonbahar' && s(11, 30) === y + '-sonbahar' &&
        s(12, 1) === y + '-kis' && s(2, 28) === (y - 1) + '-kis' && s(1, 15) === (y - 1) + '-kis';
      self._testZaman = null;
      r.sezonTakvimi4Mevsim = ok;
      r.sezonTablosu4Kayit = (self.SEZON.length === 4);
    })(this);

    // ── 15) §12.3 SEZON KATSAYILARI ──────────────────────────────────────
    (function (self) {
      const bek = [[1, 5.0], [2, 4.0], [3, 4.0], [4, 3.0], [10, 3.0], [11, 2.5], [25, 2.5],
      [26, 2.0], [50, 2.0], [51, 1.5], [100, 1.5], [101, 1.0], [500, 1.0], [501, 0.5], [9999, 0.5]];
      let ok = true;
      for (let i = 0; i < bek.length; i++) if (self.sezonKatsayi(bek[i][0]) !== bek[i][1]) { ok = false; break; }
      r.sezonKatsayilari = ok;
      // §12.3 tasarım örneği: 735.000 + 450.000 + 1.750.000 = 2.935.000
      const sp = self.sezonPuani([
        { puan: 245000, siralama: 5 }, { puan: 180000, siralama: 12 }, { puan: 350000, siralama: 1 }
      ]);
      r.sezonPuaniOrnek = (sp.toplam === 2935000);
    })(this);

    // ── 16) §12.5 %50 TAŞIMA ─────────────────────────────────────────────
    (function (self) {
      const k = self.sezonKapat({ ligPuan: 1234567, sezonPuan: 999, haftalikPuan: 77 }, 1);
      r.sezonTasima50 = (k.ligPuan === 617283 && k.sezonPuan === 0 && k.haftalikPuan === 0 && k.odul.kp === 21000);
    })(this);

    // ── 17) §25.1 MATRİS 6×6 DOLU ────────────────────────────────────────
    (function (self) {
      const sinif = ['kamyon', 'motosiklet', 'formula', 'suv', 'canavar', 'spor'];
      let dolu = true, sayac = 0;
      for (let i = 0; i < sinif.length; i++) {
        for (let j = 0; j < self.TURLER.length; j++) {
          const v = self.SINIF_MATRIS[sinif[i]][self.TURLER[j]];
          if (typeof v !== 'number' || !(v > 0)) { dolu = false; }
          sayac++;
        }
      }
      r.matris6x6Dolu = (dolu && sayac === 36);
      // Tasarım tablosundan rastgele 4 nokta
      r.matrisDegerleri = (self.SINIF_MATRIS.canavar.takla === 1.5 &&
        self.SINIF_MATRIS.formula.hiz === 1.5 &&
        self.SINIF_MATRIS.kamyon.ozel === 1.3 &&
        self.SINIF_MATRIS.spor.mesafe === 0.8);
      // `diger` her türde nötr
      let notr = true;
      for (let j = 0; j < self.TURLER.length; j++) if (self.SINIF_MATRIS.diger[self.TURLER[j]] !== 1.0) notr = false;
      r.eslesmeyenNotr = notr;
    })(this);

    // ── 18) ARAÇ EŞLEMESİ — çakışma yok + gerçek araçlar ─────────────────
    (function (self) {
      const gor = {}; let cakisma = false, adet = 0;
      for (const s in self.ARAC_SINIF) {
        const l = self.ARAC_SINIF[s];
        for (let i = 0; i < l.length; i++) {
          if (gor[l[i]]) cakisma = true;
          gor[l[i]] = s; adet++;
        }
      }
      r.aracSinifCakismaYok = (!cakisma && Object.keys(gor).length === adet);
      const V = self._mod('VehicleDefs');
      if (V) {
        let hepsiVar = true, eksik = [];
        for (const id in gor) if (!V[id]) { hepsiVar = false; eksik.push(id); }
        r.aracIdleriGercek = hepsiVar;
        r._eslesmeyenAracSayisi = Object.keys(V).length - adet;
      } else {
        r.aracIdleriGercek = true;          // VehicleDefs yok (node) — atlanır
        r._eslesmeyenAracSayisi = null;
      }
      r._eslesenAracSayisi = adet;
      r.aracCarpaniCalisiyor = (self.aracCarpani('monster', 'takla') === 1.5 &&
        self.aracCarpani('formula', 'hiz') === 1.5 &&
        self.aracCarpani('bilinmeyen_arac', 'hiz') === 1.0);
    })(this);

    // ── 19) HAVA — 6 koşul GERÇEK haritalara bağlı ───────────────────────
    (function (self) {
      const l = self._haritaListe();
      const say = {};
      let hepsiTanimli = true;
      for (let i = 0; i < l.length; i++) {
        const s = self.havaSinifi(l[i]);
        if (!self.HAVA_KOSUL[s]) { hepsiTanimli = false; }
        say[s] = (say[s] || 0) + 1;
      }
      r.havaHerHaritaTanimli = hepsiTanimli;
      r.altiHavaKosuluGercekHaritada = (Object.keys(self.HAVA_KOSUL).length === 6 &&
        Object.keys(say).length === 6);
      r._havaDagilimi = say;
      // Çarpanlar tasarım tablosuyla birebir
      r.havaCarpanlari = (self.HAVA_KOSUL.gunesli.carpan === 1.00 &&
        self.HAVA_KOSUL.yagmurlu.carpan === 1.15 && self.HAVA_KOSUL.karli.carpan === 1.30 &&
        self.HAVA_KOSUL.gece.carpan === 1.10 && self.HAVA_KOSUL.sis.carpan === 1.25 &&
        self.HAVA_KOSUL.firtina.carpan === 1.40);
      // Canlıda GorselHava varsa: türetim ile ölçülmüş yedek AYNI olmalı
      const G = self._mod('GorselHava');
      if (G && G.HAVA) {
        let ayni = true, fark = [];
        for (const k in self._HAVA_YEDEK) {
          if (self._havaTuret(k) !== self._HAVA_YEDEK[k]) { ayni = false; fark.push(k); }
        }
        r.havaTuretimYedekleUyusuyor = ayni;
        if (!ayni) r._havaFarklari = fark;
      } else {
        r.havaTuretimYedekleUyusuyor = true;      // GorselHava yok — atlanır
      }
      // Gerçek harita adları: yedek liste Terrain ile uyuşuyor mu
      const T = self._mod('Terrain');
      if (T && T.MAPS) {
        let eksik = [];
        for (let i = 0; i < self._HARITA_YEDEK.length; i++) if (!T.MAPS[self._HARITA_YEDEK[i]]) eksik.push(self._HARITA_YEDEK[i]);
        r.yedekHaritalarGercek = (eksik.length === 0);
        if (eksik.length) r._eksikHaritalar = eksik;
      } else {
        r.yedekHaritalarGercek = true;
      }
    })(this);

    // ── 20) §25.3 PİST MODİFİKASYONU — 6 tanım ───────────────────────────
    (function (self) {
      const k = Object.keys(self.PIST_MOD);
      let ok = (k.length === 6);
      for (let i = 0; i < k.length; i++) {
        const d = self.PIST_MOD[k[i]];
        if (!d.ad || !d.aciklama || typeof d.puanCarpan !== 'number' || !d.oynanis) ok = false;
        if (String(d.renk).indexOf('#') !== 0) ok = false;         // HEX zorunlu
      }
      r.pistMod6Tanim = ok;
      r.pistModCarpanlari = (self.PIST_MOD.rampa.puanCarpan === 1.5 &&
        self.PIST_MOD.coinyagmur.puanCarpan === 1.3 &&
        self.PIST_MOD.engelcenneti.puanCarpan === 2.0 &&
        self.PIST_MOD.dusukyercekimi.puanCarpan === 1.25);
    })(this);

    // ── 21) §25.5 HANDİKAP — yön + sınırlar ──────────────────────────────
    (function (self) {
      const gucluOyuncu = self.handikap(1200, 1000);     // %20 üstün → 0.98
      const zayifOyuncu = self.handikap(800, 1000);      // %20 zayıf  → 1.02
      r.handikapYonu = (gucluOyuncu < 1 && zayifOyuncu > 1 &&
        Math.abs(gucluOyuncu - 0.98) < 1e-9 && Math.abs(zayifOyuncu - 1.02) < 1e-9);
      // ⚠ ÜST sınır normal girdiyle ULAŞILAMAZ: katsayı 0,1 olduğu için hiç
      //   puan almayan oyuncu bile en fazla ×1,10 alır. Üst kelepçe savunmacıdır
      //   (bozuk/negatif ortalama gelirse). İkisi de ÖLÇÜLÜYOR.
      r.handikapSinirlari = (self.handikap(1000000, 1000) === self.HANDIKAP_ALT &&
        Math.abs(self.handikap(0, 1000) - 1.1) < 1e-9 &&
        self.handikap(-1e9, 1000) === self.HANDIKAP_UST &&
        self.handikap(1000, 0) === 1 &&
        self.handikap(1000, 1000) === 1);
      // Tasarım METNİNDEKİ formül tersini veriyor — ikisi de ölçülüyor (E7)
      r.handikapHamTersYonde = (self.handikapHam(1200, 1000) > 1 &&
        Math.abs(self.handikapHam(1200, 1000) - 1.02) < 1e-9);
    })(this);

    // ── 22) §34 ÖZEL GÜN TARİH ARALIKLARI ────────────────────────────────
    (function (self) {
      const t = function (ay, gun) { const o = self.ozelGun(new Date(2026, ay - 1, gun, 12, 0, 0, 0).getTime()); return o ? o.id : null; };
      const ok =
        t(10, 24) === 'cadilar' && t(10, 31) === 'cadilar' && t(10, 23) === null &&
        t(12, 20) === 'yilbasi' && t(12, 31) === 'yilbasi' && t(1, 6) === 'yilbasi' && t(1, 7) === null &&
        t(7, 1) === 'yaz' && t(8, 31) === 'yaz' && t(9, 1) === null &&
        t(5, 12) === 'yildonumu' && t(5, 18) === 'yildonumu' && t(5, 19) === null &&
        t(4, 15) === null;
      r.ozelGunTarihAraliklari = ok;
      r.ozelGun4Tanim = (Object.keys(self.OZEL_GUN).length === 4);
      // 🔴 Ödül YALNIZ KP + kozmetik
      let yalnizKP = true;
      for (const k in self.OZEL_GUN) {
        const o = self.ozelGunOdulu(k);
        if (!o || typeof o.kp !== 'number' || o.altin !== undefined || o.elmas !== undefined) yalnizKP = false;
        if (!Array.isArray(o.kozmetik) || !o.kozmetik.length) yalnizKP = false;
      }
      r.ozelGunOduluYalnizKP = yalnizKP;
    })(this);

    // ── 23) §26 LİDER ETKİNLİĞİ — dağıtım %40/25/15/20 ───────────────────
    (function (self) {
      const d = self.liderOdulDagit(10000);
      const oranTop = self.LIDER_DAGITIM[0] + self.LIDER_DAGITIM[1] + self.LIDER_DAGITIM[2] + self.LIDER_KALAN;
      r.liderDagitimToplami100 = (Math.abs(oranTop - 1.0) < 1e-9);
      r.liderPaylari = (d.paylar.length === 10 && d.paylar[0].kp >= 4000 &&
        d.paylar[1].kp === 2500 && d.paylar[2].kp === 1500);
      r.liderHavuzKorunuyor = (d.dagitilan === d.havuz);
      // Yuvarlama artığı olan bir havuzda da korunmalı
      const d2 = self.liderOdulDagit(3333);
      r.liderHavuzKorunuyorArtikli = (d2.dagitilan === 3333);
      r.liderSeviye34 = (self.LIDER_SEVIYE === 34);
      // Klan yokken kurulum reddedilmeli (seviye kapısı)
      const kur = self.liderEtkinlikKur({ tur: 'mesafe', sureSaat: 24 });
      r.liderSeviyeKapisi = (kur.ok === false && kur.hata === 'ERR_SEVIYE');
    })(this);

    // ── 24) FİNAL SKOR ZİNCİRİ ───────────────────────────────────────────
    (function (self) {
      // Kontrollü etkinlik: mesafe · güneşli · modsuz · canavar araç (×1.3)
      const et = {
        haftaId: 1, tur: 'mesafe', harita: 'countryside',
        hava: { id: 'gunesli', carpan: 1.00 }, pistModlari: [], aracSinifi: 'tumu'
      };
      const s = self.finalSkor(et, { mesafe: 3500, rekor: true, kazasiz: true, ilk3: true, aracId: 'monster' });
      r.finalSkorZinciri = (s.tabanPuan === 5533 && s.aracCarpan === 1.3 &&
        s.puan === Math.round(5533 * 1.3));
      // Hava çarpanı gerçekten uygulanıyor (fırtına ×1.40)
      const et2 = { haftaId: 1, tur: 'mesafe', harita: 'stormpeak', hava: self.havaBilgi('stormpeak'), pistModlari: [], aracSinifi: 'tumu' };
      const s2 = self.finalSkor(et2, { mesafe: 3500, rekor: true, kazasiz: true, ilk3: true, aracId: 'jeep' });
      r.havaCarpaniUygulaniyor = (s2.havaCarpan === 1.40 && s2.puan === Math.round(5533 * 1.1 * 1.40));
      // Araç sınıfı filtresi gerçekten engelliyor
      const et3 = { haftaId: 1, tur: 'ozel', harita: 'countryside', hava: { id: 'gunesli', carpan: 1 }, pistModlari: [], aracSinifi: 'canavar' };
      const s3 = self.finalSkor(et3, { mesafe: 3500, aracId: 'formula' });
      const s4 = self.finalSkor(et3, { mesafe: 3500, aracId: 'monster' });
      r.aracSinifiFiltresi = (s3.gecersiz === true && s3.puan === 0 && s4.gecersiz === false && s4.puan > 0);
      // Pist modifikasyonu doğru türde uygulanıyor
      const et5 = { haftaId: 1, tur: 'takla', harita: 'countryside', hava: { id: 'gunesli', carpan: 1 }, pistModlari: ['rampa'], aracSinifi: 'tumu' };
      const s5 = self.finalSkor(et5, { takla: 12, uclu: 2, besli: 1, rekor: true, aracId: 'jeep' });
      r.pistModUygulaniyor = (s5.modCarpan === 1.5 && s5.uygulananModlar.length === 1);
    })(this);

    // ── 25) RENKLER HEX (tuzak #5) ───────────────────────────────────────
    (function (self) {
      let ok = true;
      const kontrol = function (o) {
        for (const k in o) {
          const v = o[k];
          if (v && typeof v === 'object' && typeof v.renk === 'string' && v.renk.indexOf('#') !== 0) ok = false;
        }
      };
      kontrol(self.TUR_META); kontrol(self.HAVA_KOSUL); kontrol(self.PIST_MOD);
      kontrol(self.OZEL_GUN);
      for (let i = 0; i < self.SEZON.length; i++) if (self.SEZON[i].renk.indexOf('#') !== 0) ok = false;
      r.renklerHex = ok;
    })(this);

    // ── 26) HAFTA NESNESİ BÜTÜNLÜĞÜ ──────────────────────────────────────
    (function (self) {
      const h = self.hafta(2900);
      r.haftaNesnesiTam = (self.TURLER.indexOf(h.tur) >= 0 &&
        typeof h.harita === 'string' && h.harita.length > 0 &&
        !!self.HAVA_KOSUL[h.hava.id] &&
        Array.isArray(h.pistModlari) && h.pistModlari.length <= self.MOD_MAKS &&
        typeof h.sezonId === 'string' && h.sezonHaftasi >= 1 &&
        h.bitis > h.baslangic);
      // Özel kural haftasında araç sınıfı gerçekten belirlenmiş
      let ozelOk = true;
      for (let i = 0; i < 12; i++) {
        const hh = self.hafta(2900 + i);
        if (hh.tur === 'ozel' && hh.aracSinifi === 'tumu' && !hh.ozelGun) ozelOk = false;
      }
      r.ozelHaftaSinifBelirli = ozelOk;
      // §5.1 çizelgesi 8 kilometre taşı, artan
      let artan = true;
      for (let i = 1; i < self.ZAMAN_CIZELGESI.length; i++) {
        if (self.ZAMAN_CIZELGESI[i].saat <= self.ZAMAN_CIZELGESI[i - 1].saat) artan = false;
      }
      r.zamanCizelgesiArtan = (artan && self.ZAMAN_CIZELGESI.length === 8);
    })(this);

    // ── 27) §25.4 GÜÇLENDİRİCİLER (6 tanım, KP fiyatı) ───────────────────
    (function (self) {
      const k = Object.keys(self.BOOST);
      let ok = (k.length === 6);
      for (let i = 0; i < k.length; i++) if (!(self.BOOST[k[i]].kp > 0)) ok = false;
      r.boost6Tanim = ok;
      r.boostFiyatlari = (self.BOOST.ciftpuan.kp === 200 && self.BOOST.zirh.kp === 250 &&
        self.BOOST.manyetik.kp === 100);
    })(this);

    this._testZaman = eski;
    this.hazir();
    r.allPass = Object.keys(r).every(function (k) {
      return k === 'allPass' || k.charAt(0) === '_' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') window.KlanEtkinlik = KlanEtkinlik;
if (typeof module !== 'undefined' && module.exports) module.exports = KlanEtkinlik;
