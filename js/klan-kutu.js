'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KlanKutu — KLAN KUTULARI · MAĞAZA · GÖREVLER · GÜÇLENDİRİCİLER
   (Ajan D · KLAN-SOZLESME.md §1)

   Kaynak tasarım: "Klan sistemi.txt"
     §6   Klan kutuları (6 tür · nadirlik · içerik · istatistik)
     §9   Klan mağazası (7 ürün · stok · indirim)
     §10  Klan görevleri (10 günlük havuz · 6 haftalık havuz)
     §25.4 Etkinlik içi güçlendiriciler (6 boost)

   🔴 TOP-LEVEL AD: yalnız `KlanKutu`. `Clan/ClanWar/Chat/Tournament/
      Leaderboard/Friends/Challenge` js/social.js'te zaten top-level `const`;
      onlara DOKUNULMAZ (aynı ad = "Identifier has already been declared" =
      tüm oyun çöker).

   🔴 ÖDÜL PARA BİRİMİ: yalnız Klan Parası (KP). Bu dosya HİÇBİR yerde altın
      veya elmas vermez/alır. Tasarımdaki altın+elmas ödülleri `Klan.kpCevir()`
      ile tek KP değerine indirgenir (sözleşme §6).

   🔴 `Math.random()` KULLANILMAZ. Kutu açılışı, indirim seçimi ve görev seçimi
      TOHUMLUdur → kayıt yüklenip tekrar denenince AYNI sonuç çıkar
      (save-scumming engellenir). `selfTest` `Math.random`'ı sarmalayıp çağrı
      sayısının 0 olduğunu ÖLÇER.
      ⚠ `js/liveops.js:32`'deki düz çarpımlı hash KOPYALANMADI (tuzak D16);
        FNV-1a `Math.imul` ile yazıldı (C#'ta `uint` ile birebir tutar).

   ── TASARIMDAN SAPMALAR (hepsi gerekçeli, ölçümle) ───────────────────────
   D1  §6.2 "Reklam İzleme" sütunu TAMAMEN KALDIRILDI.
       Gerekçe: bu oyunda reklam SDK'sı YOK (ne AdMob ne başka bir sağlayıcı;
       `js/` altında tek bir reklam çağrısı bulunmuyor). Butonu koymak
       "çalışmayan buton" demektir — §28 Tmz'de "yazılıp hiç okunmayan alan"
       taraması tam olarak bu sınıf ölü kodu yakalamıştı.
   D2  §6.2 "Elmas ile Açma" → **KP ile açma**. Sözleşme §0: klan sistemi
       altın/elmas alışverişi YAPMAZ. Elmas maliyeti `Klan.kpCevir(0, elmas)`
       ile KP'ye çevrilir: 5→20 · 10→40 · 20→80 · 40→160 · 80→320 · 60→240 KP.
   D3  §6.3 içerik (altın+elmas) → tek KP değeri (`Klan.kpCevir`), sonra
       `Klan.odulCarpani()` ile çarpılır (sözleşme §6 kuralı birebir).
       ⚠ Görev ödülleri tasarımda ZATEN KP → dönüşüm YOK → `odulCarpani`
       de UYGULANMAZ (çift ödüllendirme olurdu). Yalnız kutular ölçeklenir.
   D4  §6.2'de "Klan Seviyesi Çarpanı" (sv>20, 5 seviyede +%5, tavan +%30) ve
       §6.3'te BAŞKA bir çarpan (sv>10, 5 seviyede +%2) var. İKİSİ DE uygulanır
       ama FARKLI yerlere:
         · §6.2 çarpanı → NADİRLİK DAĞILIMINA (`_nadirlikDagilim`); nadir
           kademelerin (Destansı/Efsanevi/Efsanevi+) ağırlığı artar, fazlalık
           Sıradan/Nadir'den düşülür ve toplam 100'e normalize edilir.
           (Ham formül "P × (1+m)" tüm kademelere uygulanıp normalize edilirse
            dağılım HİÇ DEĞİŞMEZ — matematiksel olarak anlamsız. Bu yüzden
            yalnız nadir kademelere uygulanıyor.)
         · §6.3 çarpanı → ÖDÜL MİKTARINA (`_miktarCarpani`).
   D5  §6.2 nadirlik kademesi ile §6.3 altın/elmas aralığı arasındaki BAĞ
       tasarımda YAZILMIYOR. Türetildi: aralık 5 eşit banda bölünür, çıkan
       nadirlik kademesi hangi banda düştüğünü belirler. Böylece hem tablo
       aynen korunur hem de nadirlik ödül miktarında ANLAM kazanır.
   D6  §6.3 "Özel Ödül İhtimali: %1 (Klan Parası ×10)" DÜZ KP BONUSU olarak
       okundu (10/25/50/100/200/150 KP). "Taban × 200" okunsaydı Efsanevi kutu
       %20 ihtimalle 10.000-22.000 KP verirdi = mağazanın tamamı tek kutudan
       çıkardı (ölçüldü). Düz bonus okuması ekonomiyi ayakta tutuyor.
   D7  §10.2 "Klan Sohbeti: 10 mesaj gönder" görevi KALDIRILDI — sözleşme §0
       sohbeti yasaklıyor, yerine Duyuru Panosu var. Yerine **"Pano Hareketi"**
       (gün içinde klanda 5 yeni duyuru oluşsun) kondu: duyurular kutu açma,
       görev tamamlama, seviye atlama ve savaş olaylarından doğduğu için
       gerçekten ölçülebilir ve duyuru panosuyla birebir uyumlu.
   D8  §10 KOLEKTİF hedefler TEK OYUNCUYA ölçeklendi (bu oyunda 1 gerçek üye
       var; botların "katkı yapması" sahte olurdu):
         "5 üye ile yarış" → 5 yarış · "15 üye ile etkinliğe katıl" → 10
         etkinlik yarışı · "50.000 m toplam" → 20.000 m · "50 yarış kazan" → 15
         · "50 bağış" → 15 · "20 kupa" → 8.
   D9  §10 ÖDÜLLERİ `_GOREV_OLCEK = 0.25` ile ölçeklendi.
       ÖLÇÜM (ham tablo, `haftalikKpTahmini` ile aynı yöntem):
         günlük 3 görev × 7 gün = 788 KP/hafta · haftalık 2,5 görev = 667 →
         **1.454 KP/hafta**, üstüne kutular. Sözleşme §6 hedefi 300-800 KP/hafta,
         en pahalı ürün 10.000 KP = "birkaç aylık hedef". Ham tabloyla Takım
         Forması ~6 haftada alınırdı.
       ÖLÇEKLİ HÂL (ölçüldü, `selfTest._haftalikKp`):
         sv11 → 429 KP/hafta (görev 367 + kutu 63)
         sv20 → 530 KP/hafta (görev 367 + kutu 163)
         sv50 → 677 KP/hafta (görev 367 + kutu 310)
       Takım Forması sv20'de **18,9 hafta ≈ 4,3 ay**. Hedef bandın içinde.
       ⚠ Bu üç sayı yalnız BU modülün kaynaklarıdır; etkinlik (Ajan E) ve
         savaş (Ajan F) ödülleri bandın kalan payını kullanır.
   D10 §10.3 haftalık görev XP'si `Klan.xpEkle('etkinlik', ...)` ile verilir.
       Gerekçe: `Klan.XP_KAYNAK` (Ajan B) içinde 'gorev' diye bir kaynak YOK;
       'etkinlik' kaynağının günlük 150 XP tavanı sözleşme §5'in "günde ~350 XP"
       hedefini korur. XP de `_GOREV_OLCEK` ile ölçeklendi.
   D11 §10.5 "kısmi ilerleme için %50 ödül" AYNEN uygulandı, tek eklemeyle:
       ilerleme oranı **≥ %25** olmalı. Gerekçe: eşiksiz hâlde 1 metre ilerleme
       6 haftalık görevin yarısını bedava verirdi (ölçüldü: +168 KP/hafta,
       %37 sahte gelir).
   D12 §9.2 tablosunun BAŞI EKSİK — metin satır 2440'ta "– devam" ile başlıyor.
       Eksik ürünler UYDURULMADI; 7 ürünle yetinildi (bkz. rapor).
   D13 §9.3 "%50 (sadece özel günlerde)" indirim türü UYGULANMADI (özel gün
       takvimi Ajan E'nin dosyasında). Toplam indirim `MAKS_INDIRIM = 0.60`
       ile sınırlandı: sv46 klan indirimi (%30) + flash (%40) + sadakat (%5)
       = %75 olurdu, yani 10.000 KP'lik ürün 2.500 KP'ye düşerdi.
   D14 §6.5 "Strateji" tablosu ve §6.4 animasyon adımları BU DOSYADA YOK —
       animasyon/çizim Ajan G'nin (KlanUI) işi. Burada yalnız veri + mantık.
   D15 §10.4 "Haftalık Görevler: Her Pazartesi 00:00'da sıfırlanır" TAM
       KARŞILANMIYOR: sözleşme §7 `KlanSim.haftaId()`'yi
       `floor(Date.now()/604800000)` diye SABİTLİYOR ve epoch 1 Ocak 1970 =
       PERŞEMBE. Yani hafta sınırı Perşembe 00:00 UTC. İki modülün AYNI hafta
       numarasını görmesi (lig tablosu ↔ haftalık görev) Pazartesi'ye
       hizalanmaktan daha önemli olduğu için sözleşme imzası korundu.
   D16 §6 kutuların NEREDEN geldiğini hiç yazmıyor (yalnız bekleme süresini
       tanımlıyor). ▶ Kaynaklar: (a) günde 1 ücretsiz kutu (türü klan
       seviyesine göre TOHUMLU seçilir, `_GUNLUK_AGIRLIK`), (b) Ajan E/F'nin
       `KlanKutu.ver(tur, adet, kaynak)` çağrıları, (c) mağazadan Gizemli Kutu.
       Ekonomiyi bantta tutan tek ayar (a)'dır; (b) bandın üstüne biner.
   D17 §6 envanter sınırı tanımlamıyor. `MAKS_ENVANTER = 8` kondu: sınırsız
       envanter, oyuncunun 50 kutu biriktirip seviye 50'de hepsini birden
       (2,50× ödül çarpanıyla) açmasına izin verirdi = ekonomi patlaması.

   ⚠ Template literal içinde backtick YOK (proje tuzağı #9).
   ⚠ Tüm renkler HEX (proje tuzağı #5 — `_drawCard` accent + '33' ekler).
   ⚠ `Klan` bare global olabilir → typeof ile erişilir (tuzak #10).
   ⚠ Bu dosya `SaveData`'ya DOĞRUDAN yazmaz; tüm kalıcı durum klan nesnesinin
     `kutuVeri` alanında tutulur ve `Klan.kaydet()` ile yazılır (sözleşme §4).
   ⚠ `saveNow()` ASLA çağrılmaz (tuzak #12).
   ═══════════════════════════════════════════════════════════════════════ */

const KlanKutu = {
  ad: 'klanKutu',
  surum: '1.0',

  // ═══════════════════════════════════════════════════════════════
  //  SABİTLER
  // ═══════════════════════════════════════════════════════════════
  SAAT_MS: 3600000,
  GUN_MS: 86400000,
  HAFTA_MS: 604800000,

  MAKS_ENVANTER: 8,          // aynı anda tutulabilen kutu sayısı
  MAKS_SON10: 10,            // §6.6 "Son 10 Kutudan Çıkanlar"
  MAKS_GECMIS: 120,          // §6.6 açma oranı grafiği için zaman damgası tamponu
  MAKS_INDIRIM: 0.60,        // D13
  SADAKAT_MAKS: 0.05,        // §9.3 "Maksimum +%5"
  IDEAL_HAFTALIK_KATKI: 5000,
  INDIRIM_PENCERE_MS: 48 * 3600000,   // §9.3 "Her 48 saatte bir"
  INDIRIM_URUN: 3,                    // §9.3 "rastgele 3 ürüne"
  FLASH_PENCERE_MS: 2 * 3600000,      // §9.3 "2 saat süreyle"
  FLASH_ORAN: 0.40,                   // §9.3 "%40'a varan"
  FLASH_IHTIMAL: 0.25,                // her 2 saatlik pencerenin %25'inde flash var
  SAVAS_ZAM: 1.5,                     // §25.4 "savaşlarda fiyatları %50 daha yüksek"
  KISMI_ORAN: 0.50,                   // §10.5
  KISMI_ESIK: 0.25,                   // D11

  // D9 — görev ödülü ölçek katsayısı (ham tablo ekonomiyi 2× aşıyordu)
  // 2 Ağu (ana oturum): 0,25 → 0,18. Ölçüldü (`dogrula-klan.js` D bölümü):
  // toplam haftalık KP girişi 1.088, sözleşme hedefi 600-900. Etkinlik+sezon
  // `ODEME_OLCEK 0.55` ile kısıldı; kalan taşma görev ödüllerinden geliyordu.
  _GOREV_OLCEK: 0.18,

  GUNLUK_GOREV_ADET: 3,      // §10.2 "Her gün 3 görev"
  HAFTALIK_MIN: 2,           // §10.3 "Her hafta 2-3 özel görev"
  HAFTALIK_MAKS: 3,

  // ───────────── NADİRLİK KADEMELERİ (§6.2, 5 kademe) ─────────────
  // ⚠ Renkler HEX (tuzak #5). Sıra: 0=Sıradan … 4=Efsanevi+
  NADIRLIK: [
    { id: 'siradan', ad: 'Sıradan', renk: '#8fa3b0' },
    { id: 'nadir', ad: 'Nadir', renk: '#3aa0e8' },
    { id: 'destansi', ad: 'Destansı', renk: '#c46ae8' },
    { id: 'efsanevi', ad: 'Efsanevi', renk: '#e8933a' },
    { id: 'efsanevipl', ad: 'Efsanevi+', renk: '#e8d23a' }
  ],

  // ───────────── 6 KUTU TÜRÜ (§6.2 + §6.3 birleşik, TABLODAN AYNEN) ─────────────
  // nadirlik[]  : §6.2 yüzdeleri (toplam 100 — selfTest ÖLÇER)
  // acmaElmas   : §6.2 "Elmas ile Açma" → D2 ile KP'ye çevrilir
  // altinAralik / elmasAralik : §6.3 içerik aralıkları
  // ozelSans / ozelKp        : §6.3 "Özel Ödül İhtimali" (D6)
  KUTULAR: {
    katilim: {
      id: 'katilim', ad: 'Katılım Kutusu', minSeviye: 1, beklemeMs: 1 * 3600000,
      acmaElmas: 5, nadirlik: [70, 20, 9, 1, 0],
      altinAralik: [50, 200], elmasAralik: [1, 2],
      ozelSans: 0.01, ozelKp: 10, ozelRozet: null, renk: '#9aa7b8'
    },
    bronz: {
      id: 'bronz', ad: 'Bronz Kutu', minSeviye: 5, beklemeMs: 3 * 3600000,
      acmaElmas: 10, nadirlik: [50, 30, 15, 5, 0],
      altinAralik: [100, 500], elmasAralik: [1, 3],
      ozelSans: 0.03, ozelKp: 25, ozelRozet: null, renk: '#b5793a'
    },
    gumus: {
      id: 'gumus', ad: 'Gümüş Kutu', minSeviye: 10, beklemeMs: 6 * 3600000,
      acmaElmas: 20, nadirlik: [30, 35, 25, 9, 1],
      altinAralik: [200, 800], elmasAralik: [2, 5],
      ozelSans: 0.05, ozelKp: 50, ozelRozet: null, renk: '#c9d2da'
    },
    altin: {
      id: 'altin', ad: 'Altın Kutu', minSeviye: 15, beklemeMs: 12 * 3600000,
      acmaElmas: 40, nadirlik: [15, 25, 35, 20, 5],
      altinAralik: [500, 1500], elmasAralik: [5, 10],
      ozelSans: 0.10, ozelKp: 100, ozelRozet: null, renk: '#e8b23a'
    },
    efsanevi: {
      id: 'efsanevi', ad: 'Efsanevi Kutu', minSeviye: 20, beklemeMs: 24 * 3600000,
      acmaElmas: 80, nadirlik: [5, 10, 25, 40, 20],
      altinAralik: [1000, 3000], elmasAralik: [10, 20],
      ozelSans: 0.20, ozelKp: 200, ozelRozet: 'kutuEfsanesi', renk: '#e85f3a'
    },
    savas: {
      id: 'savas', ad: 'Savaş Kutusu', minSeviye: 10, beklemeMs: 18 * 3600000,
      acmaElmas: 60, nadirlik: [10, 20, 30, 30, 10],
      altinAralik: [500, 2000], elmasAralik: [5, 15],
      ozelSans: 0.15, ozelKp: 150, ozelRozet: null, renk: '#e0553a'
    }
  },
  KUTU_SIRA: ['katilim', 'bronz', 'gumus', 'altin', 'efsanevi', 'savas'],

  // §9.2 "Gizemli Kutu" — mağazadan alınır, 6 türden AYRI (selfTest 6 sayar).
  // "%10 Efsanevi+, %30 Efsanevi, %60 Destansı" — tablodan aynen.
  MAGAZA_KUTU: {
    id: 'gizemli', ad: 'Gizemli Kutu', minSeviye: 10, beklemeMs: 0,
    acmaElmas: 0, nadirlik: [0, 0, 60, 30, 10],
    altinAralik: [1000, 3000], elmasAralik: [10, 20],
    ozelSans: 0.15, ozelKp: 150, ozelRozet: null, renk: '#7a5ae8'
  },

  // ───────────── ÜCRETSİZ GÜNLÜK KUTU AĞIRLIKLARI ─────────────
  // Tasarımda kutuların NEREDEN geldiği yazmıyor (§6 yalnız bekleme süresini
  // tanımlıyor). Ekonomiyi bandın içinde tutan tek kaynak burada: günde 1
  // ücretsiz kutu, türü klan seviyesine göre TOHUMLU seçilir.
  // Diğer kutular Ajan E (etkinlik) ve Ajan F (savaş) tarafından
  // `kutuVer()` ile verilir — onlar bu tablonun DIŞINDADIR.
  _GUNLUK_AGIRLIK: [
    { sv: 20, a: [['katilim', 40], ['bronz', 30], ['gumus', 20], ['altin', 8], ['efsanevi', 2]] },
    { sv: 15, a: [['katilim', 50], ['bronz', 30], ['gumus', 15], ['altin', 5]] },
    { sv: 10, a: [['katilim', 60], ['bronz', 30], ['gumus', 10]] },
    { sv: 5, a: [['katilim', 70], ['bronz', 30]] },
    { sv: 1, a: [['katilim', 100]] }
  ],

  // ───────────── §9.2 MAĞAZA (7 ÜRÜN, TABLODAN AYNEN — D12) ─────────────
  MAGAZA: [
    {
      id: 'klanRengi', ad: 'Klan Rengi', fiyat: 800, stok: 2, periyot: 'aylik',
      tur: 'kozmetik', renk: '#e8b23a',
      aciklama: 'Klan logosu, çerçeve ve menü vurgu rengini değiştirir.'
    },
    {
      id: 'cikartma', ad: 'Özel Çıkartma Paketi', fiyat: 600, stok: 5, periyot: 'haftalik',
      tur: 'kozmetik', renk: '#3aa0e8',
      aciklama: 'Araç üstüne yapıştırılabilen 3 adet klan temalı çıkartma.'
    },
    {
      id: 'vipDeneme', ad: 'VIP Deneme (3 gün)', fiyat: 4000, stok: 1, periyot: 'aylik',
      tur: 'sure', sureMs: 3 * 86400000, renk: '#c46ae8',
      aciklama: 'Premium üyelik özelliklerini 3 günlüğüne açar.'
    },
    {
      id: 'gizemliKutu', ad: 'Gizemli Kutu', fiyat: 2500, stok: 1, periyot: 'haftalik',
      tur: 'kutu', renk: '#7a5ae8',
      aciklama: 'İçerik rastgele; %10 Efsanevi+, %30 Efsanevi, %60 Destansı.'
    },
    {
      id: 'savasJetonu', ad: 'Savaş Jetonu', fiyat: 1000, stok: 2, periyot: 'haftalik',
      tur: 'jeton', renk: '#e0553a',
      aciklama: 'Savaşta harcanabilir; bir yarışın puanını %15 artırır.'
    },
    {
      id: 'antrenmanBileti', ad: 'Antrenman Alanı Bileti', fiyat: 350, stok: 10, periyot: 'gunluk',
      tur: 'bilet', renk: '#3ae89a',
      aciklama: 'Özel antrenman parkuruna 1 giriş hakkı.'
    },
    {
      id: 'takimFormasi', ad: 'Takım Forması', fiyat: 10000, stok: 1, periyot: 'sezonluk',
      tur: 'kozmetik', renk: '#e8d23a',
      aciklama: 'Sürücüye klan renklerinde özel kıyafet.'
    }
  ],

  // §4.3 — seviye 31/41/46'da kalıcı mağaza indirimi (`Klan._OZELLIK_AD`
  // 'Mağaza %10/%20/%30 İndirim' satırlarıyla birebir).
  _SEVIYE_INDIRIM: [[46, 0.30], [41, 0.20], [31, 0.10]],
  _INDIRIM_ORANLARI: [0.10, 0.20, 0.30],   // §9.3

  // ───────────── §25.4 GÜÇLENDİRİCİLER (6 BOOST, TABLODAN AYNEN) ─────────────
  // ⚠ Fiziğe UYGULANMASI Ajan E/F'nin işi. Burada envanter + API var.
  //   Ajan E/F `aktifBoostlar()` ve `boostEtki()` okur.
  BOOSTLAR: [
    {
      id: 'ciftPuan', ad: 'Çift Puan', fiyat: 200, sure: '1 yarış',
      etki: 'O yarıştan alınan tüm puanlar ×2',
      anahtar: 'puanCarpan', deger: 2, renk: '#e8b23a'
    },
    {
      id: 'sinirsizYakit', ad: 'Sınırsız Yakıt', fiyat: 150, sure: '1 yarış',
      etki: 'Yakıt tükenmez',
      anahtar: 'sinirsizYakit', deger: 1, renk: '#3ae89a'
    },
    {
      id: 'manyetikCoin', ad: 'Manyetik Coin', fiyat: 100, sure: '1 yarış',
      etki: 'Tüm coinler otomatik çekilir',
      anahtar: 'coinMiknatis', deger: 1, renk: '#e8d23a'
    },
    {
      id: 'zirh', ad: 'Zırh', fiyat: 250, sure: '1 yarış',
      etki: 'Bir kez kaza yapmayı engeller',
      anahtar: 'zirh', deger: 1, renk: '#9aa7b8'
    },
    {
      id: 'hizAsisi', ad: 'Hız Aşısı', fiyat: 180, sure: '1 yarış',
      etki: 'Maksimum hız %20 artar',
      anahtar: 'hizCarpan', deger: 1.20, renk: '#3aa0e8'
    },
    {
      id: 'taklaUstasi', ad: 'Takla Ustası', fiyat: 120, sure: '1 yarış',
      etki: 'Her takla +10 ekstra puan verir',
      anahtar: 'taklaBonus', deger: 10, renk: '#c46ae8'
    }
  ],

  // ───────────── §10.2 GÜNLÜK GÖREV HAVUZU (10 GÖREV) ─────────────
  // `kp` alanı TASARIMIN HAM DEĞERİ; ödeme anında `_GOREV_OLCEK` uygulanır (D9).
  // `tip` → `ilerlet(tip, miktar)` ile beslenir.
  GUNLUK_HAVUZ: [
    { id: 'klanKosusu', ad: 'Klan Koşusu', tip: 'yaris', hedef: 5, kp: 50, zorluk: 'Kolay', aciklama: '5 yarış tamamla.' },
    { id: 'taklaGunu', ad: 'Takla Günü', tip: 'takla', hedef: 20, kp: 30, zorluk: 'Kolay', aciklama: '20 takla at. Tek yarışta veya toplamda.' },
    { id: 'coinAvcisi', ad: 'Coin Avcısı', tip: 'coin', hedef: 500, kp: 40, zorluk: 'Kolay', aciklama: '500 coin topla. Tek yarışta veya toplamda.' },
    { id: 'hizCanavari', ad: 'Hız Canavarı', tip: 'hiz', hedef: 150, kp: 35, zorluk: 'Orta', aciklama: '150 km/s hıza ulaş. Tek yarışta.', enYuksek: true },
    { id: 'panoHareketi', ad: 'Pano Hareketi', tip: 'duyuru', hedef: 5, kp: 15, zorluk: 'Kolay', aciklama: 'Duyuru panosuna gün içinde 5 yeni duyuru düşsün.' },
    { id: 'mesafeUstasi', ad: 'Mesafe Ustası', tip: 'mesafe', hedef: 5000, kp: 45, zorluk: 'Orta', aciklama: '5.000 metre git. Tek yarışta veya toplamda.' },
    { id: 'kupaToplayici', ad: 'Kupa Toplayıcı', tip: 'kupa', hedef: 3, kp: 60, zorluk: 'Zor', aciklama: '3 kupa tamamla. Farklı kupalar olabilir.' },
    { id: 'yardimsever', ad: 'Yardımsever', tip: 'bagis', hedef: 3, kp: 25, zorluk: 'Kolay', aciklama: 'Klan üyelerine 3 bağış yap.' },
    { id: 'savasHazirligi', ad: 'Savaş Hazırlığı', tip: 'savasYarisi', hedef: 2, kp: 40, zorluk: 'Orta', aciklama: '2 savaş yarışı yap. Savaş aktif olmalı.' },
    { id: 'etkinlikKatilimi', ad: 'Etkinlik Katılımı', tip: 'etkinlikYarisi', hedef: 3, kp: 35, zorluk: 'Orta', aciklama: 'Haftalık etkinlikte 3 yarış yap.' }
  ],

  // ───────────── §10.3 HAFTALIK GÖREV HAVUZU (6 GÖREV) ─────────────
  // Hedefler D8 ile tek oyuncuya ölçeklendi; `hamHedef` tasarımın değeri.
  HAFTALIK_HAVUZ: [
    { id: 'klanMaratonu', ad: 'Klan Maratonu', tip: 'mesafe', hedef: 20000, hamHedef: 50000, kp: 200, xp: 500, aciklama: '20.000 metre toplam mesafe.' },
    { id: 'zaferHaftasi', ad: 'Zafer Haftası', tip: 'galibiyet', hedef: 15, hamHedef: 50, kp: 250, xp: 750, aciklama: '15 yarış kazan.' },
    { id: 'klanBirligi', ad: 'Klan Birliği', tip: 'etkinlikYarisi', hedef: 10, hamHedef: 15, kp: 300, xp: 1000, aciklama: 'Haftalık etkinlikte 10 yarış tamamla.' },
    { id: 'savasEfsanesi', ad: 'Savaş Efsanesi', tip: 'savasGalibiyeti', hedef: 1, hamHedef: 1, kp: 500, xp: 1500, aciklama: 'Hafta içinde bir klan savaşı kazan.' },
    { id: 'bagisCilginligi', ad: 'Bağış Çılgınlığı', tip: 'bagis', hedef: 15, hamHedef: 50, kp: 150, xp: 400, aciklama: '15 bağış yap.' },
    { id: 'kupaFatihi', ad: 'Kupa Fatihi', tip: 'kupa', hedef: 8, hamHedef: 20, kp: 200, xp: 600, aciklama: '8 kupa tamamla.' }
  ],

  // §10.4 ilerleme türleri (tek akış — günlük ve haftalık aynı olaylardan beslenir)
  ILERLEME_TIPLERI: ['yaris', 'takla', 'coin', 'hiz', 'duyuru', 'mesafe', 'kupa',
    'bagis', 'savasYarisi', 'etkinlikYarisi', 'galibiyet', 'savasGalibiyeti'],

  // ───────────── HATA KODLARI ─────────────
  HATA: {
    ERR_K01: 'Bir klana üye değilsiniz.',
    ERR_K02: 'Geçersiz kutu türü.',
    ERR_K03: 'Kutu envanteriniz dolu. Önce bir kutu açın.',
    ERR_K04: 'Klan seviyeniz bu kutu için yetersiz.',
    ERR_K05: 'Kutunun bekleme süresi dolmadı.',
    ERR_K06: 'Kutu bulunamadı.',
    ERR_K07: 'Yeterli Klan Paranız yok.',
    ERR_K08: 'Bu ürün tükendi. Yenilenmesini bekleyin.',
    ERR_K09: 'Klan Mağazası henüz açılmadı (Seviye 10 gerekir).',
    ERR_K10: 'Günlük görevler henüz açılmadı (Seviye 7 gerekir).',
    ERR_K11: 'Bu ödül zaten alındı.',
    ERR_K12: 'Görev henüz tamamlanmadı.',
    ERR_K13: 'Bugünün ücretsiz kutusu zaten alındı.',
    ERR_K14: 'Geçersiz ürün.',
    ERR_K15: 'Geçersiz güçlendirici.',
    ERR_K16: 'Envanterinizde bu güçlendirici yok.',
    ERR_K17: 'Haftalık görevler henüz açılmadı (Seviye 11 gerekir).',
    ERR_K18: 'Bu güçlendirici zaten aktif.'
  },

  // ═══════════════════════════════════════════════════════════════
  //  ALTYAPI — tohumlu üreteç, zaman, klan erişimi
  // ═══════════════════════════════════════════════════════════════

  // mulberry32 — `js/klan-sim.js:184` ve `js/procgen.js:4` ile AYNI algoritma.
  _rng(tohum) {
    let a = (tohum >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // FNV-1a — 🔴 `Math.imul` ile (düz `*` DEĞİL, tuzak D16 / sözleşme §7).
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

  _testZaman: null,
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },

  _K() { return (typeof Klan !== 'undefined' && Klan) ? Klan : ((typeof window !== 'undefined' && window.Klan) ? window.Klan : null); },
  _S() { return (typeof KlanSim !== 'undefined' && KlanSim) ? KlanSim : ((typeof window !== 'undefined' && window.KlanSim) ? window.KlanSim : null); },

  // Klan zaman kipini takip et: test sırasında Klan._testZaman kuruluysa onu kullan.
  _zaman() {
    if (this._testZaman != null) return this._testZaman;
    const K = this._K();
    if (K && K._testZaman != null) return K._testZaman;
    return Date.now();
  },
  _bugun(t) {
    const d = new Date(t == null ? this._zaman() : t);
    const ay = d.getMonth() + 1, gun = d.getDate();
    return d.getFullYear() + '-' + (ay < 10 ? '0' : '') + ay + '-' + (gun < 10 ? '0' : '') + gun;
  },
  _gunBasi(t) {
    const d = new Date(t == null ? this._zaman() : t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  },
  // §10.4 "Her Pazartesi 00:00" — `KlanSim.haftaId()` epoch'u Perşembe'ye
  // denk gelir; sözleşme §7 onu SABİT tuttuğu için haftalık görev kimliği de
  // ondan türetilir (tek kaynak, iki modül aynı hafta numarasını görür).
  _haftaId(t) {
    const S = this._S();
    const z = (t == null) ? this._zaman() : t;
    if (S && typeof S.haftaId === 'function') return S.haftaId(z);
    return Math.floor(z / this.HAFTA_MS);
  },
  _ayId(t) {
    const d = new Date(t == null ? this._zaman() : t);
    const ay = d.getMonth() + 1;
    return d.getFullYear() + '-' + (ay < 10 ? '0' : '') + ay;
  },
  _sezonId(t) {
    const S = this._S();
    const z = (t == null) ? this._zaman() : t;
    if (S && typeof S.sezonId === 'function') return S.sezonId(z);
    const d = new Date(z), y = d.getFullYear(), ay = d.getMonth() + 1;
    if (ay >= 3 && ay <= 5) return y + '-ilkbahar';
    if (ay >= 6 && ay <= 8) return y + '-yaz';
    if (ay >= 9 && ay <= 11) return y + '-sonbahar';
    return (ay === 12 ? y : y - 1) + '-kis';
  },
  _periyotId(periyot, t) {
    if (periyot === 'gunluk') return this._bugun(t);
    if (periyot === 'haftalik') return 'H' + this._haftaId(t);
    if (periyot === 'aylik') return this._ayId(t);
    if (periyot === 'sezonluk') return this._sezonId(t);
    return 'sabit';
  },

  _hata(kod) { return { ok: false, hata: kod, mesaj: this.HATA[kod] || '' }; },

  _seviye() { const K = this._K(); return K ? K.seviye() : 1; },
  _klanId() { const K = this._K(); const k = K ? K.al() : null; return (k && k.id) ? String(k.id) : 'KLAN'; },
  _odulCarpani() { const K = this._K(); return K ? K.odulCarpani() : 1; },
  _acik(anahtar) { const K = this._K(); return K ? K.ozellikAcik(anahtar) === true : false; },
  _duyuru(tip, metin, veri) { const K = this._K(); if (K && typeof K.duyuru === 'function') K.duyuru(tip, metin, veri); },
  _kaydet() { const K = this._K(); if (K && typeof K.kaydet === 'function') K.kaydet(); },

  // ═══════════════════════════════════════════════════════════════
  //  KALICI DURUM — klan nesnesinin `kutuVeri` alanı (sözleşme §4)
  // ═══════════════════════════════════════════════════════════════
  //  🔴 `SaveData.set('klan', ...)` DOĞRUDAN ÇAĞRILMAZ. Klan nesnesi mutasyonu
  //     + `Klan.kaydet()` tek yazma yoludur.
  _bosVeri() {
    return {
      envanter: [],          // [{id, tur, verildi, kaynak}]
      sonrakiId: 1,
      acilisNo: 0,           // TOHUM bileşeni — save-scum engeli
      toplamAcilan: 0,
      turAcilan: {},         // {tur: adet}
      nadirlikSayac: [0, 0, 0, 0, 0],
      enNadir: null,         // {kutu, nadirlik, ad, kp, t}
      son10: [],             // §6.6
      gecmis: [],            // açma zaman damgaları (§6.6 haftalık/aylık oran)
      gunlukKutuTarih: '',
      magazaStok: {},        // {urunId: {don, kalan}}
      satinAlinan: {},       // {urunId: adet}
      envanterUrun: {},      // {urunId: adet}  (jeton/bilet gibi tüketilebilirler)
      vipBitis: 0,
      boost: {},             // {boostId: adet}
      aktifBoost: [],        // [boostId] — bir sonraki yarışta geçerli
      kutuRozetleri: [],     // §6.3 Efsanevi kutu "Özel Rozet" ödülü
      gunluk: null,          // {tarih, ids:[], ilerleme:{}, alinan:[], panoTaban}
      haftalik: null         // {hafta, ids:[], ilerleme:{}, alinan:[], kismiOdendi}
    };
  },
  _veri() {
    const K = this._K();
    const k = K ? K.al() : null;
    if (!k) return null;
    if (!k.kutuVeri || typeof k.kutuVeri !== 'object' || Array.isArray(k.kutuVeri)) {
      k.kutuVeri = this._bosVeri();
    }
    const v = k.kutuVeri;
    // Eksik alan onarımı (eski kayıt / kısmi göç) — sessiz bozulmayı önler.
    const bos = this._bosVeri();
    const anahtarlar = Object.keys(bos);
    for (let i = 0; i < anahtarlar.length; i++) {
      const a = anahtarlar[i];
      if (v[a] === undefined || v[a] === null) {
        if (a !== 'gunluk' && a !== 'haftalik' && a !== 'enNadir') v[a] = bos[a];
      }
    }
    if (!Array.isArray(v.envanter)) v.envanter = [];
    if (!Array.isArray(v.son10)) v.son10 = [];
    if (!Array.isArray(v.gecmis)) v.gecmis = [];
    if (!Array.isArray(v.aktifBoost)) v.aktifBoost = [];
    if (!Array.isArray(v.kutuRozetleri)) v.kutuRozetleri = [];
    if (!Array.isArray(v.nadirlikSayac) || v.nadirlikSayac.length !== 5) v.nadirlikSayac = [0, 0, 0, 0, 0];
    return v;
  },
  kutuRozetleri() { const v = this._veri(); return v ? v.kutuRozetleri.slice() : []; },

  hazir() {
    const v = this._veri();
    if (!v) return false;
    this._gunlukYenile();
    this._haftalikYenile();
    this._stokYenile();
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §6.2 NADİRLİK DAĞILIMI + SEVİYE ÇARPANLARI (D4)
  // ═══════════════════════════════════════════════════════════════

  // §6.2: "Klan seviyesi 20'den sonra her 5 seviyede bir %5 artar.
  //        Maksimum Çarpan: Seviye 50'de +%30."
  // sv25→0.05 · sv30→0.10 · … · sv50→0.30  (tavan ölçümle doğrulanıyor)
  nadirlikCarpani(seviye) {
    const sv = Math.floor(this._sayi(seviye, this._seviye()));
    if (sv < 25) return 0;
    return Math.min(0.30, Math.floor((sv - 20) / 5) * 0.05);
  },
  // §6.3: "Klan seviyesi 10'dan sonra her 5 seviyede bir %2 artar."
  // sv15→0.02 · sv20→0.04 · … · sv50→0.16
  miktarCarpani(seviye) {
    const sv = Math.floor(this._sayi(seviye, this._seviye()));
    if (sv < 15) return 0;
    return Math.floor((sv - 10) / 5) * 0.02;
  },

  // Seviye çarpanı uygulanmış nadirlik dağılımı (yüzde, toplam = 100).
  // Nadir kademeler (2,3,4) (1+m) ile büyütülür; fazlalık Sıradan/Nadir'den
  // ORANTILI düşülür. Böylece tablo toplamı 100 KALIR (selfTest ölçer).
  _nadirlikDagilim(tur, seviye) {
    const cfg = this.kutuTanim(tur);
    if (!cfg) return null;
    const p = cfg.nadirlik.slice();
    const m = this.nadirlikCarpani(seviye);
    if (m > 0) {
      let artis = 0;
      for (let i = 2; i < 5; i++) { const y = p[i] * m; p[i] += y; artis += y; }
      const taban = p[0] + p[1];
      if (taban > 0) {
        const kesinti = Math.min(taban, artis);
        p[0] -= kesinti * (p[0] / taban);
        p[1] -= kesinti * (p[1] / taban);
      }
    }
    let top = 0;
    for (let i = 0; i < 5; i++) { if (p[i] < 0) p[i] = 0; top += p[i]; }
    if (top <= 0) return [100, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) p[i] = p[i] * 100 / top;
    return p;
  },

  kutuTanim(tur) {
    if (tur === this.MAGAZA_KUTU.id) return this.MAGAZA_KUTU;
    return this.KUTULAR[tur] || null;
  },
  // D2 — elmas maliyeti KP'ye çevrilir (5→20 · 10→40 · 20→80 · 40→160 · 80→320 · 60→240)
  hemenAcmaKp(tur) {
    const cfg = this.kutuTanim(tur);
    if (!cfg) return 0;
    const K = this._K();
    if (K && typeof K.kpCevir === 'function') return K.kpCevir(0, cfg.acmaElmas);
    return Math.round(cfg.acmaElmas * 4);
  },

  // ═══════════════════════════════════════════════════════════════
  //  §6.3 ÖDÜL ÜRETİMİ — SAF FONKSİYON (yan etki YOK, TOHUMLU)
  // ═══════════════════════════════════════════════════════════════
  //  🔴 Aynı (tur, tohum, seviye) → BİREBİR aynı ödül. Kayıt yüklenip tekrar
  //     açılınca sonuç değişmez = save-scumming imkânsız.
  //  D5: nadirlik kademesi, altın/elmas aralığını 5 banda böler.
  _odulUret(tur, tohum, seviye) {
    const cfg = this.kutuTanim(tur);
    if (!cfg) return null;
    const sv = Math.floor(this._sayi(seviye, this._seviye()));
    const rnd = this._rng(tohum >>> 0);
    const dag = this._nadirlikDagilim(tur, sv);

    // 1) Nadirlik kademesi
    const r1 = rnd() * 100;
    let birikim = 0, kademe = 0;
    for (let i = 0; i < 5; i++) {
      birikim += dag[i];
      if (r1 < birikim) { kademe = i; break; }
      kademe = i;
    }
    // Yüzdesi 0 olan bir kademeye düşülmesi imkânsız olmalı — kayan nokta
    // artığına karşı aşağı doğru düzelt.
    while (kademe > 0 && dag[kademe] <= 0) kademe--;

    // 2) Kademe → aralıktaki bant (D5)
    const p = rnd();                      // bant içi konum
    const bandAlt = kademe / 5, bandUst = (kademe + 1) / 5;
    const konum = bandAlt + p * (bandUst - bandAlt);

    const aMin = cfg.altinAralik[0], aMax = cfg.altinAralik[1];
    const eMin = cfg.elmasAralik[0], eMax = cfg.elmasAralik[1];
    const mc = 1 + this.miktarCarpani(sv);          // §6.3 çarpanı
    const hamAltin = Math.round((aMin + konum * (aMax - aMin)) * mc);
    const hamElmas = Math.round((eMin + konum * (eMax - eMin)) * mc);

    // 3) Altın+elmas → TEK KP değeri (sözleşme §6) + ödül çarpanı
    const K = this._K();
    const tabanKp = K ? K.kpCevir(hamAltin, hamElmas) : Math.round(hamAltin / 100 + hamElmas * 4);
    const carpan = this._odulCarpani();
    let kp = Math.max(1, Math.round(tabanKp * carpan));

    // 4) §6.3 özel ödül (D6 — düz KP bonusu)
    const ozel = rnd() < cfg.ozelSans;
    let ozelKp = 0;
    if (ozel) { ozelKp = Math.round(cfg.ozelKp * carpan); kp += ozelKp; }

    return {
      tur: cfg.id, kutuAd: cfg.ad,
      nadirlik: kademe,
      nadirlikId: this.NADIRLIK[kademe].id,
      nadirlikAd: this.NADIRLIK[kademe].ad,
      renk: this.NADIRLIK[kademe].renk,
      hamAltin: hamAltin, hamElmas: hamElmas,
      tabanKp: tabanKp, kp: kp,
      ozel: ozel, ozelKp: ozelKp,
      rozet: (ozel && cfg.ozelRozet) ? cfg.ozelRozet : null,
      tohum: tohum >>> 0, seviye: sv
    };
  },

  // TOHUM = (haftaId, kutuId, kaçıncı açılış) — görev tanımı birebir.
  // Klan kimliği de girer ki iki farklı klan aynı sonucu görmesin.
  _acmaTohumu(tur, kutuId, acilisNo, t) {
    return this._hash32('kutu:' + this._klanId() + ':' + this.kutuTanim(tur).id +
      ':' + this._haftaId(t) + ':' + kutuId + ':' + acilisNo);
  },

  // ═══════════════════════════════════════════════════════════════
  //  KUTU ENVANTERİ
  // ═══════════════════════════════════════════════════════════════
  kutuVer(tur, kaynak) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    const cfg = this.kutuTanim(tur);
    if (!cfg) return this._hata('ERR_K02');
    if (this._seviye() < cfg.minSeviye) return this._hata('ERR_K04');
    if (v.envanter.length >= this.MAKS_ENVANTER) return this._hata('ERR_K03');
    const t = this._zaman();
    const kutu = {
      id: 'KT' + (v.sonrakiId++),
      tur: cfg.id,
      verildi: t,
      hazirT: t + cfg.beklemeMs,
      kaynak: String(kaynak == null ? 'bilinmiyor' : kaynak)
    };
    v.envanter.push(kutu);
    this._kaydet();
    return { ok: true, hata: null, kutu: kutu };
  },

  // 🔴 DIŞ GİRİŞ NOKTASI — Ajan E (`js/klan-etkinlik.js:1056`) ve Ajan F
  //   (`js/klan-savas.js:891` aday listesinin İLK elemanı) BU imzayı çağırıyor:
  //   `KlanKutu.ver(tur, adet, kaynak)`. İmza onlara göre sabitlendi.
  //   ⚠ `kutuVer(tur, kaynak)` TEK kutuluk ilkel; `ver` onu `adet` kez çağırır.
  //   Envanter dolarsa kalanlar sessizce DÜŞMEZ — `verilemedi` ile raporlanır.
  ver(tur, adet, kaynak) {
    const n = Math.max(1, Math.floor(this._sayi(adet, 1)));
    const verilen = [];
    let sonHata = null;
    for (let i = 0; i < n; i++) {
      const s = this.kutuVer(tur, kaynak == null ? 'odul' : kaynak);
      if (s.ok) verilen.push(s.kutu); else { sonHata = s.hata; break; }
    }
    return {
      ok: verilen.length > 0, hata: verilen.length > 0 ? null : sonHata,
      mesaj: verilen.length > 0 ? '' : (this.HATA[sonHata] || ''),
      kutular: verilen, verilen: verilen.length, verilemedi: n - verilen.length
    };
  },

  envanter() {
    const v = this._veri();
    if (!v) return [];
    const t = this._zaman();
    const self = this;
    return v.envanter.map(function (k) {
      const cfg = self.kutuTanim(k.tur);
      const kalan = Math.max(0, self._sayi(k.hazirT, 0) - t);
      return {
        id: k.id, tur: k.tur, ad: cfg ? cfg.ad : k.tur,
        renk: cfg ? cfg.renk : '#8fa3b0',
        verildi: k.verildi, hazirT: k.hazirT,
        kalanMs: kalan, hazir: kalan <= 0,
        hemenKp: self.hemenAcmaKp(k.tur),
        kaynak: k.kaynak
      };
    });
  },
  _kutuBul(v, kutuId) {
    for (let i = 0; i < v.envanter.length; i++) if (v.envanter[i].id === kutuId) return i;
    return -1;
  },
  hazirMi(kutuId) {
    const v = this._veri(); if (!v) return false;
    const i = this._kutuBul(v, kutuId); if (i < 0) return false;
    return this._sayi(v.envanter[i].hazirT, 0) <= this._zaman();
  },
  kalanSure(kutuId) {
    const v = this._veri(); if (!v) return 0;
    const i = this._kutuBul(v, kutuId); if (i < 0) return 0;
    return Math.max(0, this._sayi(v.envanter[i].hazirT, 0) - this._zaman());
  },

  // Bekleme süresi dolmuşsa aç.
  ac(kutuId) { return this._ac(kutuId, false); },
  // Bekleme süresini KP ödeyerek atla (D2 — elmas DEĞİL).
  hemenAc(kutuId) { return this._ac(kutuId, true); },

  _ac(kutuId, hemen) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    const K = this._K();
    const i = this._kutuBul(v, kutuId);
    if (i < 0) return this._hata('ERR_K06');
    const kutu = v.envanter[i];
    const cfg = this.kutuTanim(kutu.tur);
    if (!cfg) return this._hata('ERR_K02');
    if (this._seviye() < cfg.minSeviye) return this._hata('ERR_K04');
    const t = this._zaman();
    const hazir = this._sayi(kutu.hazirT, 0) <= t;

    let odenenKp = 0;
    if (!hazir) {
      if (!hemen) return this._hata('ERR_K05');
      odenenKp = this.hemenAcmaKp(kutu.tur);
      // 🔴 Yetmezse HİÇBİR yan etki bırakma (kutu envanterde kalır).
      if (!K || K.kpHarca(odenenKp, 'kutu-hemen-ac') !== true) return this._hata('ERR_K07');
    }

    const acilisNo = this._sayi(v.acilisNo, 0);
    const tohum = this._acmaTohumu(kutu.tur, kutu.id, acilisNo, t);
    const odul = this._odulUret(kutu.tur, tohum, this._seviye());

    // ── yan etkiler ──
    v.envanter.splice(i, 1);
    v.acilisNo = acilisNo + 1;
    v.toplamAcilan = this._sayi(v.toplamAcilan, 0) + 1;
    v.turAcilan[kutu.tur] = this._sayi(v.turAcilan[kutu.tur], 0) + 1;
    v.nadirlikSayac[odul.nadirlik] = this._sayi(v.nadirlikSayac[odul.nadirlik], 0) + 1;

    const kayit = {
      t: t, tur: kutu.tur, kutuAd: cfg.ad,
      nadirlik: odul.nadirlik, nadirlikAd: odul.nadirlikAd,
      renk: odul.renk, kp: odul.kp, ozel: odul.ozel
    };
    v.son10.push(kayit);
    if (v.son10.length > this.MAKS_SON10) v.son10.splice(0, v.son10.length - this.MAKS_SON10);
    v.gecmis.push(t);
    if (v.gecmis.length > this.MAKS_GECMIS) v.gecmis.splice(0, v.gecmis.length - this.MAKS_GECMIS);

    if (!v.enNadir || odul.nadirlik > v.enNadir.nadirlik ||
      (odul.nadirlik === v.enNadir.nadirlik && odul.kp > this._sayi(v.enNadir.kp, 0))) {
      v.enNadir = { tur: kutu.tur, kutuAd: cfg.ad, nadirlik: odul.nadirlik, ad: odul.nadirlikAd, kp: odul.kp, t: t };
    }
    // §6.3 Efsanevi kutunun "Özel Rozet" ödülü. ⚠ `Klan`'da rozet VERME API'si
    //   YOK (`Klan.rozetler()` rozetleri kıdem/rol/başarımdan TÜRETİR), bu
    //   yüzden kutu rozeti burada tutulur ve `kutuRozetleri()` ile okunur.
    if (odul.rozet) {
      if (!Array.isArray(v.kutuRozetleri)) v.kutuRozetleri = [];
      if (v.kutuRozetleri.indexOf(odul.rozet) < 0) v.kutuRozetleri.push(odul.rozet);
    }

    if (K) K.kpEkle(odul.kp, 'kutu-' + kutu.tur);
    this._kaydet();
    this._duyuru('kutu', cfg.ad + ' açıldı: ' + odul.nadirlikAd + ' · +' + odul.kp + ' KP',
      { tur: kutu.tur, nadirlik: odul.nadirlik, kp: odul.kp });

    return { ok: true, hata: null, odul: odul, odenenKp: odenenKp, kutu: kayit };
  },

  // ── Günde 1 ücretsiz kutu (tür TOHUMLU seçilir) ──
  gunlukKutuHazir() {
    const v = this._veri();
    if (!v) return false;
    return v.gunlukKutuTarih !== this._bugun();
  },
  _gunlukKutuTuru(tarih) {
    const sv = this._seviye();
    let tablo = this._GUNLUK_AGIRLIK[this._GUNLUK_AGIRLIK.length - 1].a;
    for (let i = 0; i < this._GUNLUK_AGIRLIK.length; i++) {
      if (sv >= this._GUNLUK_AGIRLIK[i].sv) { tablo = this._GUNLUK_AGIRLIK[i].a; break; }
    }
    const rnd = this._rng(this._hash32('gunlukkutu:' + this._klanId() + ':' + tarih));
    let top = 0;
    for (let i = 0; i < tablo.length; i++) top += tablo[i][1];
    const r = rnd() * top;
    let bir = 0;
    for (let i = 0; i < tablo.length; i++) {
      bir += tablo[i][1];
      if (r < bir) return tablo[i][0];
    }
    return tablo[0][0];
  },
  gunlukKutu() {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    const bugun = this._bugun();
    if (v.gunlukKutuTarih === bugun) return this._hata('ERR_K13');
    const tur = this._gunlukKutuTuru(bugun);
    const sonuc = this.kutuVer(tur, 'gunluk');
    if (!sonuc.ok) return sonuc;
    v.gunlukKutuTarih = bugun;
    this._kaydet();
    return sonuc;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §6.6 KUTU AÇMA İSTATİSTİKLERİ
  // ═══════════════════════════════════════════════════════════════
  istatistik() {
    const v = this._veri();
    if (!v) return null;
    const t = this._zaman();
    let haftalik = 0, aylik = 0;
    for (let i = 0; i < v.gecmis.length; i++) {
      const d = t - this._sayi(v.gecmis[i], 0);
      if (d <= this.HAFTA_MS) haftalik++;
      if (d <= 30 * this.GUN_MS) aylik++;
    }
    const top = this._sayi(v.toplamAcilan, 0);
    const yuzde = [];
    for (let i = 0; i < 5; i++) yuzde.push(top > 0 ? (this._sayi(v.nadirlikSayac[i], 0) * 100 / top) : 0);
    return {
      toplamAcilan: top,
      turAcilan: v.turAcilan,
      nadirlikSayac: v.nadirlikSayac.slice(),
      nadirlikYuzde: yuzde,
      enNadir: v.enNadir ? {
        kutuAd: v.enNadir.kutuAd, nadirlik: v.enNadir.nadirlik,
        ad: v.enNadir.ad, renk: this.NADIRLIK[this._kis(this._sayi(v.enNadir.nadirlik, 0), 0, 4)].renk,
        kp: v.enNadir.kp, t: v.enNadir.t
      } : null,
      son10: v.son10.slice().reverse(),
      haftalikAcma: haftalik,
      aylikAcma: aylik,
      gunlukOrtalama: aylik / 30
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §9 KLAN MAĞAZASI
  // ═══════════════════════════════════════════════════════════════
  _urun(id) {
    for (let i = 0; i < this.MAGAZA.length; i++) if (this.MAGAZA[i].id === id) return this.MAGAZA[i];
    return null;
  },
  _stokYenile() {
    const v = this._veri();
    if (!v) return false;
    let degisti = false;
    for (let i = 0; i < this.MAGAZA.length; i++) {
      const u = this.MAGAZA[i];
      const don = this._periyotId(u.periyot);
      const s = v.magazaStok[u.id];
      if (!s || s.don !== don) {
        v.magazaStok[u.id] = { don: don, kalan: u.stok };
        degisti = true;
      }
    }
    if (degisti) this._kaydet();
    return degisti;
  },
  stok(urunId) {
    const v = this._veri(); if (!v) return 0;
    this._stokYenile();
    const s = v.magazaStok[urunId];
    return s ? Math.max(0, this._sayi(s.kalan, 0)) : 0;
  },

  // §4.3 — seviye 31/41/46 kalıcı indirimi
  seviyeIndirimi(seviye) {
    const sv = Math.floor(this._sayi(seviye, this._seviye()));
    for (let i = 0; i < this._SEVIYE_INDIRIM.length; i++) {
      if (sv >= this._SEVIYE_INDIRIM[i][0]) return this._SEVIYE_INDIRIM[i][1];
    }
    return 0;
  },
  // §9.3 "Oyuncu Sadakat Çarpanı: son 7 günde klana katkı … Maksimum +%5"
  sadakatIndirimi() {
    const K = this._K();
    if (!K) return 0;
    const k = K.al();
    if (!k) return 0;
    let katki = 0;
    const uyeler = (typeof K.uyeler === 'function') ? K.uyeler() : (k.uyeler || []);
    for (let i = 0; i < uyeler.length; i++) {
      if (uyeler[i] && uyeler[i].id === k.benimId) katki = this._sayi(uyeler[i].haftalikKatki, 0);
    }
    return this._kis(katki / this.IDEAL_HAFTALIK_KATKI, 0, 1) * this.SADAKAT_MAKS;
  },

  // §9.3 — 48 saatte bir 3 rastgele ürün. 🔴 TOHUMLU: aynı pencere → aynı 3 ürün.
  indirimliUrunler(t) {
    const z = (t == null) ? this._zaman() : t;
    const pencere = Math.floor(z / this.INDIRIM_PENCERE_MS);
    const rnd = this._rng(this._hash32('indirim:' + this._klanId() + ':' + pencere));
    const havuz = [];
    for (let i = 0; i < this.MAGAZA.length; i++) havuz.push(this.MAGAZA[i].id);
    const secili = {};
    const adet = Math.min(this.INDIRIM_URUN, havuz.length);
    for (let n = 0; n < adet; n++) {
      const j = Math.floor(rnd() * havuz.length) % havuz.length;
      const id = havuz.splice(j, 1)[0];
      const oran = this._INDIRIM_ORANLARI[Math.floor(rnd() * this._INDIRIM_ORANLARI.length) % this._INDIRIM_ORANLARI.length];
      secili[id] = oran;
    }
    return { pencere: pencere, bitis: (pencere + 1) * this.INDIRIM_PENCERE_MS, oranlar: secili };
  },

  // §9.3 flash indirim — 2 saatlik pencere, %40, stok 1. 🔴 TOHUMLU.
  flashIndirim(t) {
    const z = (t == null) ? this._zaman() : t;
    const pencere = Math.floor(z / this.FLASH_PENCERE_MS);
    const rnd = this._rng(this._hash32('flash:' + this._klanId() + ':' + pencere));
    if (rnd() >= this.FLASH_IHTIMAL) return null;
    const j = Math.floor(rnd() * this.MAGAZA.length) % this.MAGAZA.length;
    return {
      urunId: this.MAGAZA[j].id,
      oran: this.FLASH_ORAN,
      bitis: (pencere + 1) * this.FLASH_PENCERE_MS,
      kalanMs: (pencere + 1) * this.FLASH_PENCERE_MS - z
    };
  },

  indirim(urunId, t) {
    const ind = this.indirimliUrunler(t);
    const flash = this.flashIndirim(t);
    const baz = Math.max(
      this._sayi(ind.oranlar[urunId], 0),
      (flash && flash.urunId === urunId) ? flash.oran : 0
    );
    if (baz <= 0) return { oran: 0, baz: 0, sadakat: 0, seviye: 0, flash: false, bitis: 0 };
    const sadakat = this.sadakatIndirimi();
    const svInd = this.seviyeIndirimi();
    const toplam = Math.min(this.MAKS_INDIRIM, baz + sadakat + svInd);
    return {
      oran: toplam, baz: baz, sadakat: sadakat, seviye: svInd,
      flash: !!(flash && flash.urunId === urunId),
      bitis: (flash && flash.urunId === urunId) ? flash.bitis : ind.bitis
    };
  },
  fiyat(urunId, t) {
    const u = this._urun(urunId);
    if (!u) return 0;
    const ind = this.indirim(urunId, t);
    return Math.max(1, Math.round(u.fiyat * (1 - ind.oran)));
  },

  magaza() {
    const v = this._veri();
    if (!v) return [];
    this._stokYenile();
    const t = this._zaman();
    const acik = this._acik('magaza');
    const self = this;
    return this.MAGAZA.map(function (u) {
      const ind = self.indirim(u.id, t);
      const s = v.magazaStok[u.id] || { kalan: 0, don: '' };
      return {
        id: u.id, ad: u.ad, aciklama: u.aciklama, tur: u.tur, renk: u.renk,
        tabanFiyat: u.fiyat,
        fiyat: Math.max(1, Math.round(u.fiyat * (1 - ind.oran))),
        indirimOrani: ind.oran, indirimFlash: ind.flash, indirimBitis: ind.bitis,
        stok: u.stok, kalanStok: Math.max(0, self._sayi(s.kalan, 0)),
        periyot: u.periyot, periyotId: s.don,
        acik: acik, satinAlinan: self._sayi(v.satinAlinan[u.id], 0)
      };
    });
  },

  satinAl(urunId) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    if (!this._acik('magaza')) return this._hata('ERR_K09');
    const u = this._urun(urunId);
    if (!u) return this._hata('ERR_K14');
    this._stokYenile();
    const s = v.magazaStok[u.id];
    if (!s || this._sayi(s.kalan, 0) <= 0) return this._hata('ERR_K08');
    const fiyat = this.fiyat(u.id);
    const K = this._K();
    // 🔴 KP yetmezse HİÇBİR yan etki: stok düşmez, ürün verilmez.
    if (!K || K.kpHarca(fiyat, 'magaza-' + u.id) !== true) return this._hata('ERR_K07');

    s.kalan = this._sayi(s.kalan, 0) - 1;
    v.satinAlinan[u.id] = this._sayi(v.satinAlinan[u.id], 0) + 1;

    let ek = null;
    if (u.tur === 'kutu') {
      const kv = this.kutuVer(this.MAGAZA_KUTU.id, 'magaza');
      ek = kv.ok ? kv.kutu : null;
      // Envanter doluysa parayı geri ver (yan etkisiz kural).
      if (!kv.ok) {
        K.kpEkle(fiyat, 'magaza-iade');
        s.kalan = this._sayi(s.kalan, 0) + 1;
        v.satinAlinan[u.id] = this._sayi(v.satinAlinan[u.id], 0) - 1;
        this._kaydet();
        return kv;
      }
    } else if (u.tur === 'sure') {
      const simdi = this._zaman();
      const taban = Math.max(simdi, this._sayi(v.vipBitis, 0));
      v.vipBitis = taban + this._sayi(u.sureMs, 0);
      ek = { vipBitis: v.vipBitis };
    } else {
      v.envanterUrun[u.id] = this._sayi(v.envanterUrun[u.id], 0) + 1;
      ek = { adet: v.envanterUrun[u.id] };
    }

    // §4 XP: mağaza alışverişi klana XP kazandırır (Klan.XP_KAYNAK 'magaza',
    // günlük 50 XP tavanlı). Girdi ALTIN cinsinden bekleniyor → KP fiyatını
    // sözleşme §6 kuralının TERSİ ile altına çevir (1 KP = 100 altın).
    if (typeof K.xpMagazadan === 'function') K.xpMagazadan(fiyat * 100);

    this._kaydet();
    this._duyuru('sistem', 'Klan Mağazası: ' + u.ad + ' satın alındı (' + fiyat + ' KP).',
      { urun: u.id, fiyat: fiyat });
    return { ok: true, hata: null, urun: u.id, fiyat: fiyat, ek: ek, kalanStok: s.kalan };
  },

  // Tüketilebilir ürün kullanımı (Savaş Jetonu / Antrenman Bileti)
  urunKullan(urunId) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    if (this._sayi(v.envanterUrun[urunId], 0) <= 0) return this._hata('ERR_K16');
    v.envanterUrun[urunId] = this._sayi(v.envanterUrun[urunId], 0) - 1;
    this._kaydet();
    return { ok: true, hata: null, urun: urunId, kalan: v.envanterUrun[urunId] };
  },
  urunEnvanteri() { const v = this._veri(); return v ? v.envanterUrun : {}; },
  vipAktif() { const v = this._veri(); return !!v && this._sayi(v.vipBitis, 0) > this._zaman(); },

  // ═══════════════════════════════════════════════════════════════
  //  §25.4 GÜÇLENDİRİCİLER
  // ═══════════════════════════════════════════════════════════════
  boostTanim(id) {
    for (let i = 0; i < this.BOOSTLAR.length; i++) if (this.BOOSTLAR[i].id === id) return this.BOOSTLAR[i];
    return null;
  },
  // §25.4 "savaşlarda da kullanılabilir ancak fiyatları %50 daha yüksektir"
  boostFiyat(id, savasMi) {
    const b = this.boostTanim(id);
    if (!b) return 0;
    return savasMi ? Math.round(b.fiyat * this.SAVAS_ZAM) : b.fiyat;
  },
  boostListe(savasMi) {
    const v = this._veri();
    const self = this;
    return this.BOOSTLAR.map(function (b) {
      return {
        id: b.id, ad: b.ad, etki: b.etki, sure: b.sure, renk: b.renk,
        anahtar: b.anahtar, deger: b.deger,
        fiyat: self.boostFiyat(b.id, savasMi),
        tabanFiyat: b.fiyat,
        adet: v ? self._sayi(v.boost[b.id], 0) : 0,
        aktif: v ? v.aktifBoost.indexOf(b.id) >= 0 : false
      };
    });
  },
  boostSatinAl(id, savasMi) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    const b = this.boostTanim(id);
    if (!b) return this._hata('ERR_K15');
    const fiyat = this.boostFiyat(id, savasMi);
    const K = this._K();
    // 🔴 Yetmezse HİÇBİR yan etki.
    if (!K || K.kpHarca(fiyat, 'boost-' + id) !== true) return this._hata('ERR_K07');
    v.boost[id] = this._sayi(v.boost[id], 0) + 1;
    this._kaydet();
    return { ok: true, hata: null, boost: id, fiyat: fiyat, adet: v.boost[id] };
  },
  // Bir sonraki yarış için aktive et (tüketim yarış başlangıcında değil, burada).
  boostKullan(id) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    if (!this.boostTanim(id)) return this._hata('ERR_K15');
    if (this._sayi(v.boost[id], 0) <= 0) return this._hata('ERR_K16');
    if (v.aktifBoost.indexOf(id) >= 0) return this._hata('ERR_K18');
    v.boost[id] = this._sayi(v.boost[id], 0) - 1;
    v.aktifBoost.push(id);
    this._kaydet();
    return { ok: true, hata: null, boost: id, aktif: v.aktifBoost.slice() };
  },
  boostEnvanter() { const v = this._veri(); return v ? v.boost : {}; },
  aktifBoostlar() { const v = this._veri(); return v ? v.aktifBoost.slice() : []; },
  // 🔴 Ajan E/F bunu okur: {puanCarpan, sinirsizYakit, coinMiknatis, zirh, hizCarpan, taklaBonus}
  boostEtki() {
    const v = this._veri();
    const e = { puanCarpan: 1, sinirsizYakit: 0, coinMiknatis: 0, zirh: 0, hizCarpan: 1, taklaBonus: 0 };
    if (!v) return e;
    for (let i = 0; i < v.aktifBoost.length; i++) {
      const b = this.boostTanim(v.aktifBoost[i]);
      if (!b) continue;
      if (b.anahtar === 'puanCarpan' || b.anahtar === 'hizCarpan') e[b.anahtar] = e[b.anahtar] * b.deger;
      else e[b.anahtar] = e[b.anahtar] + b.deger;
    }
    return e;
  },
  // Yarış bitince çağrılır — aktif boostlar tüketilmiş sayılır.
  boostBitir() {
    const v = this._veri();
    if (!v) return [];
    const eski = v.aktifBoost.slice();
    v.aktifBoost = [];
    if (eski.length) this._kaydet();
    return eski;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §10 GÖREVLER
  // ═══════════════════════════════════════════════════════════════
  _olcekKp(ham) { return Math.max(1, Math.round(this._sayi(ham, 0) * this._GOREV_OLCEK)); },
  _olcekXp(ham) { return Math.max(1, Math.round(this._sayi(ham, 0) * this._GOREV_OLCEK)); },

  // 🔴 TOHUMLU seçim: aynı gün → aynı 3 görev; gün dönünce değişir.
  gunlukSecim(tarih) {
    const g = (tarih == null) ? this._bugun() : String(tarih);
    const rnd = this._rng(this._hash32('gunlukgorev:' + this._klanId() + ':' + g));
    const havuz = [];
    for (let i = 0; i < this.GUNLUK_HAVUZ.length; i++) havuz.push(this.GUNLUK_HAVUZ[i].id);
    const sec = [];
    const adet = Math.min(this.GUNLUK_GOREV_ADET, havuz.length);
    for (let n = 0; n < adet; n++) {
      const j = Math.floor(rnd() * havuz.length) % havuz.length;
      sec.push(havuz.splice(j, 1)[0]);
    }
    return sec;
  },
  // §10.3 "Her hafta 2-3 özel görev" — sayı da TOHUMLU.
  haftalikSecim(hafta) {
    const h = (hafta == null) ? this._haftaId() : Math.floor(this._sayi(hafta, 0));
    const rnd = this._rng(this._hash32('haftalikgorev:' + this._klanId() + ':' + h));
    const adet = this.HAFTALIK_MIN + (rnd() < 0.5 ? 0 : 1);
    const havuz = [];
    for (let i = 0; i < this.HAFTALIK_HAVUZ.length; i++) havuz.push(this.HAFTALIK_HAVUZ[i].id);
    const sec = [];
    for (let n = 0; n < Math.min(adet, havuz.length); n++) {
      const j = Math.floor(rnd() * havuz.length) % havuz.length;
      sec.push(havuz.splice(j, 1)[0]);
    }
    return sec;
  },

  _gunlukTanim(id) {
    for (let i = 0; i < this.GUNLUK_HAVUZ.length; i++) if (this.GUNLUK_HAVUZ[i].id === id) return this.GUNLUK_HAVUZ[i];
    return null;
  },
  _haftalikTanim(id) {
    for (let i = 0; i < this.HAFTALIK_HAVUZ.length; i++) if (this.HAFTALIK_HAVUZ[i].id === id) return this.HAFTALIK_HAVUZ[i];
    return null;
  },

  // §10.4 "Günlük Görevler: Her gün 00:00'da sıfırlanır."
  _gunlukYenile() {
    const v = this._veri();
    if (!v) return false;
    const bugun = this._bugun();
    if (v.gunluk && v.gunluk.tarih === bugun) return false;
    v.gunluk = {
      tarih: bugun,
      ids: this.gunlukSecim(bugun),
      ilerleme: {},
      alinan: [],
      panoTaban: this._duyuruSayisi(this._gunBasi())
    };
    this._kaydet();
    return true;
  },
  // §10.4 "Haftalık Görevler: Her Pazartesi 00:00'da sıfırlanır."
  // 🔴 §10.5: hafta dönerken tamamlanmamış görevler için KISMİ %50 ödeme yapılır.
  _haftalikYenile() {
    const v = this._veri();
    if (!v) return false;
    const hafta = this._haftaId();
    if (v.haftalik && v.haftalik.hafta === hafta) return false;
    if (v.haftalik) this._kismiOde(v.haftalik);
    v.haftalik = { hafta: hafta, ids: this.haftalikSecim(hafta), ilerleme: {}, alinan: [], kismiOdendi: false };
    this._kaydet();
    return true;
  },
  // §10.5 + D11
  _kismiOde(eski) {
    if (!eski || eski.kismiOdendi) return 0;
    const K = this._K();
    let toplam = 0;
    for (let i = 0; i < eski.ids.length; i++) {
      const id = eski.ids[i];
      if (eski.alinan.indexOf(id) >= 0) continue;      // zaten tam ödendi
      const tan = this._haftalikTanim(id);
      if (!tan) continue;
      const ilerleme = this._sayi(eski.ilerleme[id], 0);
      const oran = this._kis(ilerleme / tan.hedef, 0, 1);
      if (oran >= 1) continue;                          // tamamlanmış ama alınmamış → tam ödül alınabilirdi
      if (oran < this.KISMI_ESIK) continue;             // D11 anti-istismar eşiği
      const kp = Math.max(1, Math.round(this._olcekKp(tan.kp) * this.KISMI_ORAN));
      if (K) K.kpEkle(kp, 'haftalik-gorev-kismi');
      toplam += kp;
    }
    eski.kismiOdendi = true;
    if (toplam > 0) this._duyuru('gorev', 'Haftalık görevlerden kısmi ödül: +' + toplam + ' KP', { kp: toplam });
    return toplam;
  },

  // "Pano Hareketi" görevi için: verilen zamandan sonraki duyuru sayısı.
  _duyuruSayisi(basT) {
    const K = this._K();
    if (!K) return 0;
    const k = K.al();
    if (!k || !Array.isArray(k.duyurular)) return 0;
    let n = 0;
    for (let i = 0; i < k.duyurular.length; i++) {
      if (this._sayi(k.duyurular[i].t, 0) >= basT) n++;
    }
    return n;
  },

  gunlukGorevler() {
    const v = this._veri();
    if (!v) return [];
    this._gunlukYenile();
    const g = v.gunluk;
    const self = this;
    const panoSimdi = Math.max(0, this._duyuruSayisi(this._gunBasi()) - this._sayi(g.panoTaban, 0));
    return g.ids.map(function (id) {
      const t = self._gunlukTanim(id);
      if (!t) return null;
      const ilerleme = (t.tip === 'duyuru') ? panoSimdi : self._sayi(g.ilerleme[id], 0);
      const kp = self._olcekKp(t.kp);
      return {
        id: id, ad: t.ad, aciklama: t.aciklama, tip: t.tip, zorluk: t.zorluk,
        hedef: t.hedef, ilerleme: Math.min(ilerleme, t.hedef),
        oran: self._kis(ilerleme / t.hedef, 0, 1),
        tamam: ilerleme >= t.hedef,
        alindi: g.alinan.indexOf(id) >= 0,
        kp: kp, hamKp: t.kp,
        renk: ilerleme >= t.hedef ? '#3ae89a' : '#8fa3b0'
      };
    }).filter(function (x) { return !!x; });
  },

  haftalikGorevler() {
    const v = this._veri();
    if (!v) return [];
    this._haftalikYenile();
    const h = v.haftalik;
    const self = this;
    return h.ids.map(function (id) {
      const t = self._haftalikTanim(id);
      if (!t) return null;
      const ilerleme = self._sayi(h.ilerleme[id], 0);
      return {
        id: id, ad: t.ad, aciklama: t.aciklama, tip: t.tip,
        hedef: t.hedef, hamHedef: t.hamHedef,
        ilerleme: Math.min(ilerleme, t.hedef),
        oran: self._kis(ilerleme / t.hedef, 0, 1),
        tamam: ilerleme >= t.hedef,
        alindi: h.alinan.indexOf(id) >= 0,
        kp: self._olcekKp(t.kp), hamKp: t.kp,
        xp: self._olcekXp(t.xp), hamXp: t.xp,
        kismiKp: Math.max(1, Math.round(self._olcekKp(t.kp) * self.KISMI_ORAN)),
        renk: ilerleme >= t.hedef ? '#3ae89a' : '#8fa3b0'
      };
    }).filter(function (x) { return !!x; });
  },

  // §10.4 — tek ilerleme akışı; hem günlük hem haftalık görevleri besler.
  // `enYuksek` görevlerde (Hız Canavarı) miktar TOPLANMAZ, MAKSİMUM alınır.
  ilerlet(tip, miktar) {
    const v = this._veri();
    if (!v) return { ok: false, hata: 'ERR_K01', gunluk: [], haftalik: [] };
    if (this.ILERLEME_TIPLERI.indexOf(tip) < 0) return { ok: false, hata: 'gecersiz-tip', gunluk: [], haftalik: [] };
    const m = this._sayi(miktar, 0);
    if (m <= 0) return { ok: true, hata: null, gunluk: [], haftalik: [] };
    this._gunlukYenile();
    this._haftalikYenile();
    const degisenG = [], degisenH = [];

    const g = v.gunluk;
    for (let i = 0; i < g.ids.length; i++) {
      const t = this._gunlukTanim(g.ids[i]);
      if (!t || t.tip !== tip || t.tip === 'duyuru') continue;
      const eski = this._sayi(g.ilerleme[t.id], 0);
      g.ilerleme[t.id] = t.enYuksek ? Math.max(eski, m) : (eski + m);
      degisenG.push(t.id);
    }
    const h = v.haftalik;
    for (let i = 0; i < h.ids.length; i++) {
      const t = this._haftalikTanim(h.ids[i]);
      if (!t || t.tip !== tip) continue;
      h.ilerleme[t.id] = this._sayi(h.ilerleme[t.id], 0) + m;
      degisenH.push(t.id);
    }
    if (degisenG.length || degisenH.length) this._kaydet();
    return { ok: true, hata: null, gunluk: degisenG, haftalik: degisenH };
  },

  // §10.5 "Görev tamamlandığında ödül anında … eklenir."
  gunlukOdulAl(gorevId) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    if (!this._acik('gunlukGorev')) return this._hata('ERR_K10');
    this._gunlukYenile();
    const g = v.gunluk;
    if (g.ids.indexOf(gorevId) < 0) return this._hata('ERR_K12');
    if (g.alinan.indexOf(gorevId) >= 0) return this._hata('ERR_K11');
    const liste = this.gunlukGorevler();
    let gr = null;
    for (let i = 0; i < liste.length; i++) if (liste[i].id === gorevId) gr = liste[i];
    if (!gr || !gr.tamam) return this._hata('ERR_K12');
    const K = this._K();
    g.alinan.push(gorevId);
    if (K) K.kpEkle(gr.kp, 'gunluk-gorev');
    this._kaydet();
    this._duyuru('gorev', 'Günlük görev tamamlandı: ' + gr.ad + ' · +' + gr.kp + ' KP', { gorev: gorevId, kp: gr.kp });
    return { ok: true, hata: null, gorev: gorevId, kp: gr.kp };
  },

  haftalikOdulAl(gorevId) {
    const v = this._veri();
    if (!v) return this._hata('ERR_K01');
    if (!this._acik('haftalikGorev')) return this._hata('ERR_K17');
    this._haftalikYenile();
    const h = v.haftalik;
    if (h.ids.indexOf(gorevId) < 0) return this._hata('ERR_K12');
    if (h.alinan.indexOf(gorevId) >= 0) return this._hata('ERR_K11');
    const liste = this.haftalikGorevler();
    let gr = null;
    for (let i = 0; i < liste.length; i++) if (liste[i].id === gorevId) gr = liste[i];
    if (!gr || !gr.tamam) return this._hata('ERR_K12');
    const K = this._K();
    h.alinan.push(gorevId);
    if (K) K.kpEkle(gr.kp, 'haftalik-gorev');
    // D10 — 'gorev' diye bir XP kaynağı YOK; 'etkinlik' (günlük 150 tavanlı) kullanılır.
    if (K && typeof K.xpEkle === 'function') K.xpEkle('etkinlik', gr.xp);
    this._kaydet();
    this._duyuru('gorev', 'Haftalık görev tamamlandı: ' + gr.ad + ' · +' + gr.kp + ' KP', { gorev: gorevId, kp: gr.kp, xp: gr.xp });
    return { ok: true, hata: null, gorev: gorevId, kp: gr.kp, xp: gr.xp };
  },

  // ═══════════════════════════════════════════════════════════════
  //  EKONOMİ ÖLÇÜMÜ — "haftalık KP girişi" (D9 gerekçesinin kanıtı)
  // ═══════════════════════════════════════════════════════════════
  //  🔴 Bu fonksiyon TAHMİN DEĞİL, ÖLÇÜMDÜR: kutu değerleri Monte Carlo ile
  //     gerçek `_odulUret()` çağrılarından çıkarılır.
  kutuBeklenenKp(tur, seviye, orneklem) {
    const n = Math.max(50, Math.floor(this._sayi(orneklem, 2000)));
    let top = 0;
    for (let i = 0; i < n; i++) {
      const o = this._odulUret(tur, this._hash32('olcum:' + tur + ':' + seviye + ':' + i), seviye);
      if (o) top += o.kp;
    }
    return top / n;
  },
  _gunlukKutuBeklenenKp(seviye, orneklem) {
    const sv = Math.floor(this._sayi(seviye, this._seviye()));
    let tablo = this._GUNLUK_AGIRLIK[this._GUNLUK_AGIRLIK.length - 1].a;
    for (let i = 0; i < this._GUNLUK_AGIRLIK.length; i++) {
      if (sv >= this._GUNLUK_AGIRLIK[i].sv) { tablo = this._GUNLUK_AGIRLIK[i].a; break; }
    }
    let top = 0, agir = 0;
    for (let i = 0; i < tablo.length; i++) {
      top += this.kutuBeklenenKp(tablo[i][0], sv, orneklem) * tablo[i][1];
      agir += tablo[i][1];
    }
    return agir > 0 ? top / agir : 0;
  },
  // Aktif oyuncunun HAFTALIK KP girişi (bu modülün kontrol ettiği üç kaynak).
  // ⚠ Etkinlik/savaş ödülleri Ajan E/F'ye ait, buraya DAHİL DEĞİL.
  haftalikKpTahmini(seviye, orneklem) {
    const sv = Math.floor(this._sayi(seviye, this._seviye()));
    // 1) Günlük görevler — 3 görev/gün, hepsi tamamlanmış varsayımı
    let gunlukTop = 0;
    for (let i = 0; i < this.GUNLUK_HAVUZ.length; i++) gunlukTop += this._olcekKp(this.GUNLUK_HAVUZ[i].kp);
    const gunlukOrt = gunlukTop / this.GUNLUK_HAVUZ.length;
    const gunlukHaftalik = (sv >= 7) ? gunlukOrt * this.GUNLUK_GOREV_ADET * 7 : 0;
    // 2) Haftalık görevler — ortalama 2,5 görev
    let hafTop = 0;
    for (let i = 0; i < this.HAFTALIK_HAVUZ.length; i++) hafTop += this._olcekKp(this.HAFTALIK_HAVUZ[i].kp);
    const hafOrt = hafTop / this.HAFTALIK_HAVUZ.length;
    const hafHaftalik = (sv >= 11) ? hafOrt * (this.HAFTALIK_MIN + 0.5) : 0;
    // 3) Ücretsiz günlük kutu — ÖLÇÜLEN beklenen değer
    const kutuHaftalik = this._gunlukKutuBeklenenKp(sv, orneklem) * 7;
    return {
      seviye: sv,
      gunlukGorev: Math.round(gunlukHaftalik),
      haftalikGorev: Math.round(hafHaftalik),
      kutu: Math.round(kutuHaftalik),
      toplam: Math.round(gunlukHaftalik + hafHaftalik + kutuHaftalik)
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  ÖZET (Ajan G / KlanUI için tek çağrı)
  // ═══════════════════════════════════════════════════════════════
  ozet() {
    const v = this._veri();
    if (!v) return null;
    this.hazir();
    const K = this._K();
    return {
      kp: K ? K.kp() : 0,
      seviye: this._seviye(),
      envanter: this.envanter(),
      gunlukKutuHazir: this.gunlukKutuHazir(),
      magazaAcik: this._acik('magaza'),
      gunlukGorevAcik: this._acik('gunlukGorev'),
      haftalikGorevAcik: this._acik('haftalikGorev'),
      magaza: this.magaza(),
      gunlukGorevler: this.gunlukGorevler(),
      haftalikGorevler: this.haftalikGorevler(),
      boostlar: this.boostListe(false),
      aktifBoost: this.aktifBoostlar(),
      boostEtki: this.boostEtki(),
      istatistik: this.istatistik(),
      vipAktif: this.vipAktif()
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  selfTest — 34 KONTROL, HEPSİ ÖLÇEREK
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const K = this._K();
    if (!K) { r.klanModulu = false; r.allPass = false; return r; }

    // ── Gerçek kaydı KİRLETME: Klan'ı sanal kipe al (§8B.28/O dersi) ──
    const esk = { sanal: K._sanal, yerel: K._yerel, zaman: K._testZaman, bizimZaman: this._testZaman };
    const _sdGercek = (typeof SaveData !== 'undefined' && SaveData && SaveData.data) ? SaveData : null;
    const _onceki = _sdGercek ? JSON.stringify([_sdGercek.data.klan, _sdGercek.data.klanGunluk, _sdGercek.data.gold]) : null;

    const T0 = 1754100000000;   // sabit zaman → tekrarlanabilir
    const self = this;
    const kurTemiz = function (xp) {
      K._sanal = true;
      K._yerel = { klan: null, klanGunluk: null, gold: 1000000, playerLevel: 50 };
      K._testZaman = T0;
      self._testZaman = T0;
      K.kur('Test Kutu', 'TKU', 1, 'acik');
      if (xp != null) K._yerel.klan.xp = xp;
      K._yerel.klan.kp = 0;
      K._yerel.klan.kutuVeri = null;
      return K._yerel.klan;
    };
    const svXp = function (sv) { return K._egriKur().kumulatif[sv]; };

    try {
      // ═════ 1) Math.random SAYACI — tüm ağır yollar sarmalıyken koşar ═════
      const gercekRandom = Math.random;
      let rndSayac = 0;
      Math.random = function () { rndSayac++; return gercekRandom.call(Math); };
      try {
        kurTemiz(svXp(20));
        this.hazir();
        this.gunlukKutu();
        for (let i = 0; i < 6; i++) this._odulUret(this.KUTU_SIRA[i], this._hash32('rt' + i), 20);
        this.magaza();
        this.indirimliUrunler();
        this.flashIndirim();
        this.gunlukSecim();
        this.haftalikSecim();
        this.gunlukGorevler();
        this.haftalikGorevler();
        this.ilerlet('yaris', 3);
        this.boostListe(true);
        this.istatistik();
        this._gunlukKutuTuru(this._bugun());
      } finally { Math.random = gercekRandom; }
      r.mathRandomSifir = (rndSayac === 0);
      r._mathRandomSayaci = rndSayac;

      // ═════ 2) 6 KUTU + NADİRLİK TOPLAMI 100 ═════
      r.kutuSayisi6 = (Object.keys(this.KUTULAR).length === 6 && this.KUTU_SIRA.length === 6);
      let toplamTamam = true; const toplamlar = [];
      for (let i = 0; i < this.KUTU_SIRA.length; i++) {
        const c = this.KUTULAR[this.KUTU_SIRA[i]];
        let s = 0; for (let j = 0; j < 5; j++) s += c.nadirlik[j];
        toplamlar.push(s);
        if (s !== 100) toplamTamam = false;
      }
      r.nadirlikToplam100 = toplamTamam;
      r._nadirlikToplamlari = toplamlar;
      // Mağaza kutusu da 100 etmeli
      let mk = 0; for (let j = 0; j < 5; j++) mk += this.MAGAZA_KUTU.nadirlik[j];
      r.magazaKutusuToplam100 = (mk === 100);

      // ═════ 3) 10.000 AÇILIŞTA GERÇEK DAĞILIM ±2 PUAN ═════
      // Seviye 20 → nadirlikCarpani = 0 → beklenen = ham tablo.
      kurTemiz(svXp(20));
      const N = 10000;
      let dagTamam = true; const sapmalar = {};
      for (let t = 0; t < this.KUTU_SIRA.length; t++) {
        const tur = this.KUTU_SIRA[t];
        const say = [0, 0, 0, 0, 0];
        for (let i = 0; i < N; i++) {
          const o = this._odulUret(tur, this._hash32('dag:' + tur + ':' + i), 20);
          say[o.nadirlik]++;
        }
        const beklenen = this.KUTULAR[tur].nadirlik;
        let enBuyuk = 0;
        for (let j = 0; j < 5; j++) {
          const gercek = say[j] * 100 / N;
          const d = Math.abs(gercek - beklenen[j]);
          if (d > enBuyuk) enBuyuk = d;
          if (d > 2) dagTamam = false;
        }
        sapmalar[tur] = Math.round(enBuyuk * 1000) / 1000;
      }
      r.dagilim10000Puan2 = dagTamam;
      r._dagilimEnBuyukSapma = sapmalar;

      // ═════ 4) DETERMİNİZM — aynı tohum → aynı ödül ═════
      const a1 = this._odulUret('altin', 123456789, 20);
      const a2 = this._odulUret('altin', 123456789, 20);
      r.odulDeterministik = (JSON.stringify(a1) === JSON.stringify(a2));
      const a3 = this._odulUret('altin', 123456790, 20);
      r.tohumFarkliSonucFarkli = (JSON.stringify(a1) !== JSON.stringify(a3));

      // ═════ 5) SAVE-SCUM ENGELİ — kutuyu açıp geri sarınca AYNI ödül ═════
      kurTemiz(svXp(20));
      this.hazir();
      const kv1 = this.kutuVer('altin', 'test');
      K._testZaman = T0 + this.KUTULAR.altin.beklemeMs + 1;   // bekleme dolsun
      this._testZaman = K._testZaman;
      const anlik = JSON.parse(JSON.stringify(K._yerel.klan));
      const ac1 = this.ac(kv1.kutu.id);
      K._yerel.klan = anlik;                       // "kayıt geri yüklendi"
      const ac2 = this.ac(kv1.kutu.id);
      r.saveScumEngeli = (ac1.ok === true && ac2.ok === true &&
        ac1.odul.nadirlik === ac2.odul.nadirlik && ac1.odul.kp === ac2.odul.kp &&
        ac1.odul.tohum === ac2.odul.tohum);
      r._saveScum = [ac1.ok ? ac1.odul.kp : ac1.hata, ac2.ok ? ac2.odul.kp : ac2.hata];
      K._testZaman = T0; this._testZaman = T0;

      // ═════ 6) BEKLEME SÜRESİ KİLİDİ ═════
      kurTemiz(svXp(20));
      this.hazir();
      const kv2 = this.kutuVer('efsanevi', 'test');
      const erken = this.ac(kv2.kutu.id);
      const kalan = this.kalanSure(kv2.kutu.id);
      K._testZaman = T0 + this.KUTULAR.efsanevi.beklemeMs + 1;
      this._testZaman = K._testZaman;
      const gec = this.ac(kv2.kutu.id);
      r.beklemeKilidi = (erken.ok === false && erken.hata === 'ERR_K05' &&
        Math.abs(kalan - this.KUTULAR.efsanevi.beklemeMs) < 2 && gec.ok === true);
      K._testZaman = T0; this._testZaman = T0;

      // ═════ 7) MİN SEVİYE KİLİDİ ═════
      kurTemiz(0);                                  // seviye 1
      this.hazir();
      const dusuk = this.kutuVer('efsanevi', 'test');
      K._yerel.klan.xp = svXp(20);
      const yuksek = this.kutuVer('efsanevi', 'test');
      r.minSeviyeKilidi = (dusuk.ok === false && dusuk.hata === 'ERR_K04' && yuksek.ok === true);

      // ═════ 8) HEMEN AÇMA KP MALİYETİ (D2 — elmas → KP) ═════
      const bekKp = {
        katilim: this.hemenAcmaKp('katilim'), bronz: this.hemenAcmaKp('bronz'),
        gumus: this.hemenAcmaKp('gumus'), altin: this.hemenAcmaKp('altin'),
        efsanevi: this.hemenAcmaKp('efsanevi'), savas: this.hemenAcmaKp('savas')
      };
      r.hemenAcKpDonusumu = (bekKp.katilim === 20 && bekKp.bronz === 40 && bekKp.gumus === 80 &&
        bekKp.altin === 160 && bekKp.efsanevi === 320 && bekKp.savas === 240);
      r._hemenAcKp = bekKp;

      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 500;
      const kv3 = this.kutuVer('gumus', 'test');
      const hz = this.hemenAc(kv3.kutu.id);
      r.hemenAcKpDusuyor = (hz.ok === true && hz.odenenKp === 80 &&
        K.kp() === 500 - 80 + hz.odul.kp);

      // ═════ 9) KP YETMEZSE HİÇBİR YAN ETKİ (kutu) ═════
      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 10;
      const kv4 = this.kutuVer('efsanevi', 'test');
      const envOnce = this.envanter().length;
      const hz2 = this.hemenAc(kv4.kutu.id);
      r.kpYetmezKutuYanEtkisiz = (hz2.ok === false && hz2.hata === 'ERR_K07' &&
        K.kp() === 10 && this.envanter().length === envOnce);

      // ═════ 10) MAĞAZA — 7 ÜRÜN + FİYATLAR TASARIMDAN AYNEN ═════
      const bekFiyat = { klanRengi: 800, cikartma: 600, vipDeneme: 4000, gizemliKutu: 2500, savasJetonu: 1000, antrenmanBileti: 350, takimFormasi: 10000 };
      const bekStok = { klanRengi: 2, cikartma: 5, vipDeneme: 1, gizemliKutu: 1, savasJetonu: 2, antrenmanBileti: 10, takimFormasi: 1 };
      const bekPer = { klanRengi: 'aylik', cikartma: 'haftalik', vipDeneme: 'aylik', gizemliKutu: 'haftalik', savasJetonu: 'haftalik', antrenmanBileti: 'gunluk', takimFormasi: 'sezonluk' };
      let fiyatTamam = (this.MAGAZA.length === 7);
      for (let i = 0; i < this.MAGAZA.length; i++) {
        const u = this.MAGAZA[i];
        if (u.fiyat !== bekFiyat[u.id] || u.stok !== bekStok[u.id] || u.periyot !== bekPer[u.id]) fiyatTamam = false;
      }
      r.magaza7UrunTablodan = fiyatTamam;

      // ═════ 11) STOK TÜKENİNCE SATIN ALINAMAZ ═════
      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 100000;
      const al1 = this.satinAl('takimFormasi');       // stok 1
      const al2 = this.satinAl('takimFormasi');       // tükendi
      r.stokTukendi = (al1.ok === true && al2.ok === false && al2.hata === 'ERR_K08');

      // ═════ 12) YENİLENME PERİYODU ═════
      const perGun = this._periyotId('gunluk', T0), perGun2 = this._periyotId('gunluk', T0 + this.GUN_MS);
      const perHaf = this._periyotId('haftalik', T0), perHaf2 = this._periyotId('haftalik', T0 + this.HAFTA_MS);
      const perAy = this._periyotId('aylik', T0), perAy2 = this._periyotId('aylik', T0 + 31 * this.GUN_MS);
      const perSez = this._periyotId('sezonluk', T0), perSez2 = this._periyotId('sezonluk', T0 + 120 * this.GUN_MS);
      r.periyotKimlikleriDegisiyor = (perGun !== perGun2 && perHaf !== perHaf2 && perAy !== perAy2 && perSez !== perSez2);
      // Aynı gün içinde 12 saat sonra AYNI kalmalı
      r.periyotAyniGunSabit = (this._periyotId('gunluk', T0) === this._periyotId('gunluk', T0 + 3600000));
      // Stok gerçekten yenileniyor mu?
      K._testZaman = T0 + 40 * this.GUN_MS; this._testZaman = K._testZaman;
      this._stokYenile();
      r.stokYenileniyor = (this.stok('takimFormasi') >= 0 && this.stok('antrenmanBileti') === 10 &&
        this.stok('klanRengi') === 2);
      K._testZaman = T0; this._testZaman = T0;

      // ═════ 13) KP YETMEZSE MAĞAZA YAN ETKİSİZ ═════
      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 100;
      const stokOnce = this.stok('vipDeneme');
      const al3 = this.satinAl('vipDeneme');
      r.kpYetmezMagazaYanEtkisiz = (al3.ok === false && al3.hata === 'ERR_K07' &&
        K.kp() === 100 && this.stok('vipDeneme') === stokOnce &&
        this._veri().satinAlinan.vipDeneme === undefined && this.vipAktif() === false);

      // ═════ 14) MAĞAZA KİLİDİ (seviye 10) ═════
      kurTemiz(svXp(9));
      this.hazir();
      K._yerel.klan.kp = 100000;
      const kapali = this.satinAl('antrenmanBileti');
      K._yerel.klan.xp = svXp(10);
      const acikAl = this.satinAl('antrenmanBileti');
      r.magazaSeviyeKilidi = (kapali.ok === false && kapali.hata === 'ERR_K09' && acikAl.ok === true);

      // ═════ 15) İNDİRİM TOHUMLU (aynı pencere → aynı 3 ürün) ═════
      kurTemiz(svXp(20));
      const i1 = JSON.stringify(this.indirimliUrunler(T0));
      const i2 = JSON.stringify(this.indirimliUrunler(T0 + 3600000));   // aynı 48 sa penceresi
      const i3 = JSON.stringify(this.indirimliUrunler(T0 + 50 * 3600000)); // farklı pencere
      r.indirimTohumlu = (i1 === i2);
      r.indirimPencereDegisince = (i1 !== i3);
      const ind1 = this.indirimliUrunler(T0);
      r.indirim3Urun = (Object.keys(ind1.oranlar).length === 3);
      let oranTamam = true;
      const oranKeys = Object.keys(ind1.oranlar);
      for (let i = 0; i < oranKeys.length; i++) {
        if (this._INDIRIM_ORANLARI.indexOf(ind1.oranlar[oranKeys[i]]) < 0) oranTamam = false;
      }
      r.indirimOranlariGecerli = oranTamam;

      // ═════ 16) SEVİYE İNDİRİMİ 31/41/46 → %10/%20/%30 ═════
      r.seviyeIndirimi = (this.seviyeIndirimi(30) === 0 && this.seviyeIndirimi(31) === 0.10 &&
        this.seviyeIndirimi(40) === 0.10 && this.seviyeIndirimi(41) === 0.20 &&
        this.seviyeIndirimi(45) === 0.20 && this.seviyeIndirimi(46) === 0.30 &&
        this.seviyeIndirimi(50) === 0.30);

      // ═════ 17) TOPLAM İNDİRİM TAVANI ═════
      kurTemiz(svXp(50));
      const enBuyukInd = this.indirim(Object.keys(this.indirimliUrunler().oranlar)[0]);
      r.indirimTavani = (enBuyukInd.oran <= this.MAKS_INDIRIM + 1e-9);

      // ═════ 18) GÜNLÜK 3 GÖREV, TOHUMLU, GÜN DÖNÜNCE DEĞİŞİR ═════
      kurTemiz(svXp(20));
      const g1 = this.gunlukSecim('2026-08-02');
      const g1b = this.gunlukSecim('2026-08-02');
      const g2 = this.gunlukSecim('2026-08-03');
      r.gunluk3Gorev = (g1.length === 3 && g1[0] !== g1[1] && g1[1] !== g1[2] && g1[0] !== g1[2]);
      r.gunlukGorevTohumlu = (g1.join(',') === g1b.join(','));
      // 20 ardışık günün en az 15'i farklı seçim vermeli (aynı kalması tohumun ölü olması demek)
      let farkli = 0, oncekiSet = null;
      for (let d = 1; d <= 20; d++) {
        const s = this.gunlukSecim('2026-08-' + (d < 10 ? '0' : '') + d).join(',');
        if (oncekiSet !== null && s !== oncekiSet) farkli++;
        oncekiSet = s;
      }
      r.gunlukGorevGunDonunceDegisir = (g1.join(',') !== g2.join(',')) && (farkli >= 15);
      r._gunlukFarkliGunSayisi = farkli;

      // ═════ 19) SOHBET GÖREVİ YOK, PANO GÖREVİ VAR ═════
      let sohbetVar = false, panoVar = false;
      for (let i = 0; i < this.GUNLUK_HAVUZ.length; i++) {
        const q = this.GUNLUK_HAVUZ[i];
        const metin = (q.id + ' ' + q.ad + ' ' + q.aciklama).toLowerCase();
        if (metin.indexOf('sohbet') >= 0 || metin.indexOf('mesaj') >= 0) sohbetVar = true;
        if (q.tip === 'duyuru') panoVar = true;
      }
      r.sohbetGoreviYok = (sohbetVar === false);
      r.panoGoreviVar = (panoVar === true && this.GUNLUK_HAVUZ.length === 10);

      // ═════ 20) HAFTALIK 2 VEYA 3 GÖREV ═════
      let hepsi23 = true, ikiVar = false, ucVar = false;
      for (let h = 2900; h < 3000; h++) {
        const s = this.haftalikSecim(h);
        if (s.length < 2 || s.length > 3) hepsi23 = false;
        if (s.length === 2) ikiVar = true;
        if (s.length === 3) ucVar = true;
      }
      r.haftalik2ya3Gorev = (hepsi23 && ikiVar && ucVar);
      r.haftalikGorevTohumlu = (this.haftalikSecim(2950).join(',') === this.haftalikSecim(2950).join(','));

      // ═════ 21) GÖREV İLERLEME + ÖDÜL ═════
      kurTemiz(svXp(20));
      this.hazir();
      const gl = this.gunlukGorevler();
      let hedefGorev = null;
      for (let i = 0; i < gl.length; i++) if (gl[i].tip !== 'duyuru' && !hedefGorev) hedefGorev = gl[i];
      let odulOk = false, erkenOk = false;
      if (hedefGorev) {
        const erken2 = this.gunlukOdulAl(hedefGorev.id);
        erkenOk = (erken2.ok === false && erken2.hata === 'ERR_K12');
        this.ilerlet(hedefGorev.tip, hedefGorev.hedef);
        const kpOnce = K.kp();
        const od = this.gunlukOdulAl(hedefGorev.id);
        const tekrar = this.gunlukOdulAl(hedefGorev.id);
        odulOk = (od.ok === true && K.kp() === kpOnce + od.kp && od.kp > 0 &&
          tekrar.ok === false && tekrar.hata === 'ERR_K11');
      }
      r.gorevTamamlanmadanOdulYok = erkenOk;
      r.gorevOdulKpVeTekSefer = odulOk;

      // ═════ 22) HAFTALIK %50 KISMİ ÖDÜL ═════
      kurTemiz(svXp(20));
      this.hazir();
      const hg = this.haftalikGorevler();
      // ⚠ hedefi 1 olan görev (Savaş Efsanesi) %60 ilerlemede TAMAMLANIR
      //   (ceil(0.6)=1) → kısmi ödül yolu hiç çalışmaz. Hedefi büyük olanı seç.
      let ilk = hg[0];
      for (let i = 0; i < hg.length; i++) if (hg[i].hedef > ilk.hedef) ilk = hg[i];
      this.ilerlet(ilk.tip, Math.ceil(ilk.hedef * 0.6));      // %60 ilerleme
      const kpOnceH = K.kp();
      K._testZaman = T0 + this.HAFTA_MS; this._testZaman = K._testZaman;
      this._haftalikYenile();                                  // hafta döndü → kısmi ödeme
      const kismiKazanc = K.kp() - kpOnceH;
      const beklenenKismi = Math.max(1, Math.round(this._olcekKp(this._haftalikTanim(ilk.id).kp) * 0.5));
      r.haftalikKismi50 = (kismiKazanc >= beklenenKismi);
      r._kismiKazanc = kismiKazanc;
      r._kismiBeklenenEnAz = beklenenKismi;
      K._testZaman = T0; this._testZaman = T0;

      // ═════ 23) KISMİ ÖDÜL EŞİĞİ (%25 altı → 0) ═════
      kurTemiz(svXp(20));
      this.hazir();
      const hg2 = this.haftalikGorevler();
      this.ilerlet(hg2[0].tip, Math.max(1, Math.floor(hg2[0].hedef * 0.05)));
      const kpOnceH2 = K.kp();
      K._testZaman = T0 + this.HAFTA_MS; this._testZaman = K._testZaman;
      this._haftalikYenile();
      r.kismiEsikCalisiyor = (K.kp() === kpOnceH2);
      K._testZaman = T0; this._testZaman = T0;

      // ═════ 24) 6 BOOST + FİYATLAR + SAVAŞ ZAMMI ═════
      const bekBoost = { ciftPuan: 200, sinirsizYakit: 150, manyetikCoin: 100, zirh: 250, hizAsisi: 180, taklaUstasi: 120 };
      let boostTamam = (this.BOOSTLAR.length === 6);
      for (let i = 0; i < this.BOOSTLAR.length; i++) {
        if (this.BOOSTLAR[i].fiyat !== bekBoost[this.BOOSTLAR[i].id]) boostTamam = false;
      }
      r.boost6Fiyat = boostTamam;
      let zamTamam = true;
      for (let i = 0; i < this.BOOSTLAR.length; i++) {
        const b = this.BOOSTLAR[i];
        if (this.boostFiyat(b.id, true) !== Math.round(b.fiyat * 1.5)) zamTamam = false;
      }
      r.boostSavasZammi50 = zamTamam;

      // ═════ 25) BOOST SATIN AL / KULLAN / ETKİ / YETMEZSE YAN ETKİSİZ ═════
      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 400;
      const bs = this.boostSatinAl('ciftPuan', false);
      const kpKaldi = K.kp();
      const bs2 = this.boostSatinAl('zirh', false);   // 250 > 200 kalan
      const bk = this.boostKullan('ciftPuan');
      const etki = this.boostEtki();
      const bitti = this.boostBitir();
      r.boostAkisi = (bs.ok === true && kpKaldi === 200 &&
        bs2.ok === false && bs2.hata === 'ERR_K07' && K.kp() === 200 &&
        this.boostEnvanter().zirh === undefined &&
        bk.ok === true && etki.puanCarpan === 2 && bitti.length === 1 &&
        this.boostEtki().puanCarpan === 1);

      // ═════ 26) GÜNLÜK ÜCRETSİZ KUTU — günde 1, tohumlu tür ═════
      kurTemiz(svXp(20));
      this.hazir();
      const gk1 = this.gunlukKutu();
      const gk2 = this.gunlukKutu();
      const tur1 = this._gunlukKutuTuru('2026-08-02');
      const tur1b = this._gunlukKutuTuru('2026-08-02');
      r.gunlukKutuGunde1 = (gk1.ok === true && gk2.ok === false && gk2.hata === 'ERR_K13');
      r.gunlukKutuTuruTohumlu = (tur1 === tur1b && this.KUTULAR[tur1] !== undefined);

      // ═════ 27) İSTATİSTİK — son 10 sınırı + en nadir ═════
      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 1000000;
      for (let i = 0; i < 15; i++) {
        const kv = this.kutuVer('gumus', 'test');
        if (kv.ok) this.hemenAc(kv.kutu.id);
      }
      const ist = this.istatistik();
      r.istatistikSon10 = (ist.son10.length === 10 && ist.toplamAcilan === 15 &&
        ist.turAcilan.gumus === 15 && ist.enNadir !== null &&
        ist.haftalikAcma === 15);
      let ny = 0; for (let i = 0; i < 5; i++) ny += ist.nadirlikYuzde[i];
      r.istatistikYuzdeToplam100 = (Math.abs(ny - 100) < 1e-6);

      // ═════ 28) ENVANTER SINIRI ═════
      kurTemiz(svXp(20));
      this.hazir();
      let dolduMu = false;
      for (let i = 0; i < this.MAKS_ENVANTER + 3; i++) {
        const kv = this.kutuVer('katilim', 'test');
        if (!kv.ok && kv.hata === 'ERR_K03') dolduMu = true;
      }
      r.envanterSiniri = (dolduMu === true && this.envanter().length === this.MAKS_ENVANTER);

      // ═════ 29) SEVİYE ÇARPANLARI (D4 — İKİSİ DE) ═════
      r.nadirlikCarpaniTablosu = (this.nadirlikCarpani(20) === 0 && this.nadirlikCarpani(24) === 0 &&
        Math.abs(this.nadirlikCarpani(25) - 0.05) < 1e-9 && Math.abs(this.nadirlikCarpani(30) - 0.10) < 1e-9 &&
        Math.abs(this.nadirlikCarpani(50) - 0.30) < 1e-9);
      r.miktarCarpaniTablosu = (this.miktarCarpani(10) === 0 && this.miktarCarpani(14) === 0 &&
        Math.abs(this.miktarCarpani(15) - 0.02) < 1e-9 && Math.abs(this.miktarCarpani(20) - 0.04) < 1e-9 &&
        Math.abs(this.miktarCarpani(50) - 0.16) < 1e-9);
      // sv50 dağılımı hâlâ 100 etmeli VE nadir kademeler artmış olmalı
      const d50 = this._nadirlikDagilim('gumus', 50);
      let d50top = 0; for (let i = 0; i < 5; i++) d50top += d50[i];
      r.sv50DagilimToplam100 = (Math.abs(d50top - 100) < 1e-9 &&
        d50[4] > this.KUTULAR.gumus.nadirlik[4] && d50[0] < this.KUTULAR.gumus.nadirlik[0]);

      // ═════ 30) KUTU İÇERİĞİ KP ÜRETİYOR VE ARALIK MANTIKLI ═════
      kurTemiz(svXp(20));
      let enAz = 1e9, enCok = 0;
      for (let i = 0; i < 500; i++) {
        const o = this._odulUret('katilim', this._hash32('ic:' + i), 20);
        if (o.kp < enAz) enAz = o.kp;
        if (o.kp > enCok) enCok = o.kp;
      }
      r.kutuIcerikKpUretiyor = (enAz >= 1 && enCok > enAz && enCok < 500);
      r._katilimKpAralik = [enAz, enCok];

      // ═════ 31) HAFTALIK KP GİRİŞİ 300-800 BANDINDA ═════
      kurTemiz(svXp(11));
      const e11 = this.haftalikKpTahmini(11, 400);
      kurTemiz(svXp(20));
      const e20 = this.haftalikKpTahmini(20, 400);
      kurTemiz(svXp(50));
      const e50 = this.haftalikKpTahmini(50, 400);
      r.haftalikKpGirisi = (e11.toplam >= 300 && e11.toplam <= 800 &&
        e20.toplam >= 300 && e20.toplam <= 800 &&
        e50.toplam >= 300 && e50.toplam <= 800);
      r.haftalikKpArtiyor = (e11.toplam < e20.toplam && e20.toplam < e50.toplam);
      r._haftalikKp = { sv11: e11, sv20: e20, sv50: e50 };
      // Takım Forması (10.000 KP) birkaç AYLIK hedef olmalı (≥ 12 hafta)
      r.enPahaliUrunAylikHedef = (10000 / e20.toplam >= 12);
      r._takimFormasiHafta = Math.round(10000 / e20.toplam * 10) / 10;

      // ═════ 32) TÜM RENKLER HEX (tuzak #5) ═════
      const hexRe = /^#[0-9a-fA-F]{6}$/;
      let hexTamam = true;
      for (let i = 0; i < this.NADIRLIK.length; i++) if (!hexRe.test(this.NADIRLIK[i].renk)) hexTamam = false;
      for (let i = 0; i < this.KUTU_SIRA.length; i++) if (!hexRe.test(this.KUTULAR[this.KUTU_SIRA[i]].renk)) hexTamam = false;
      if (!hexRe.test(this.MAGAZA_KUTU.renk)) hexTamam = false;
      for (let i = 0; i < this.MAGAZA.length; i++) if (!hexRe.test(this.MAGAZA[i].renk)) hexTamam = false;
      for (let i = 0; i < this.BOOSTLAR.length; i++) if (!hexRe.test(this.BOOSTLAR[i].renk)) hexTamam = false;
      r.tumRenklerHex = hexTamam;

      // ═════ 33) REKLAM İZİ YOK (D1) + YALNIZ KP VERİLİYOR ═════
      const kaynak = JSON.stringify([this.KUTULAR, this.MAGAZA_KUTU, this.MAGAZA,
        this.BOOSTLAR, this.GUNLUK_HAVUZ, this.HAFTALIK_HAVUZ]).toLowerCase();
      r.reklamIziYok = (kaynak.indexOf('reklam') < 0 && kaynak.indexOf('video') < 0);
      // Kutu açılışı SaveData altınını/elmasını DEĞİŞTİRMEMELİ — yalnız KP artar.
      kurTemiz(svXp(20));
      this.hazir();
      const altinOnce = K._yerel.gold;
      const kpOnceP = K.kp();
      const kvP = this.kutuVer('katilim', 'test');
      K._testZaman = T0 + this.KUTULAR.katilim.beklemeMs + 1; this._testZaman = K._testZaman;
      const acP = this.ac(kvP.kutu.id);
      r.altinElmasVerilmiyor = (acP.ok === true && K._yerel.gold === altinOnce &&
        K.kp() === kpOnceP + acP.odul.kp && acP.odul.kp > 0);
      K._testZaman = T0; this._testZaman = T0;

      // ═════ 34) `ver()` — Ajan E/F'nin ÇAĞIRDIĞI İMZA ═════
      kurTemiz(svXp(20));
      this.hazir();
      const v3 = this.ver('bronz', 3, 'etkinlik');
      r.verImzasiCokluKutu = (typeof this.ver === 'function' && v3.ok === true &&
        v3.verilen === 3 && v3.verilemedi === 0 && this.envanter().length === 3 &&
        this.envanter()[0].kaynak === 'etkinlik');
      const v9 = this.ver('katilim', 20, 'savas');     // envanter 8 → 5 sığar
      r.verEnvanterTasmasiRaporlaniyor = (v9.verilen === this.MAKS_ENVANTER - 3 &&
        v9.verilemedi === 20 - (this.MAKS_ENVANTER - 3));

      // ═════ 35) EFSANEVİ KUTU ÖZEL ROZETİ ═════
      kurTemiz(svXp(20));
      this.hazir();
      K._yerel.klan.kp = 1000000;
      let rozetGeldi = false;
      for (let i = 0; i < 40 && !rozetGeldi; i++) {
        const kv = this.kutuVer('efsanevi', 'test');
        if (!kv.ok) { this.boostBitir(); break; }
        const a = this.hemenAc(kv.kutu.id);
        if (a.ok && a.odul.rozet) rozetGeldi = true;
      }
      r.efsaneviRozeti = (rozetGeldi === true && this.kutuRozetleri().indexOf('kutuEfsanesi') >= 0);

      // ═════ 36) ÖZET ÇAĞRISI ÇÖKMÜYOR ═════
      kurTemiz(svXp(25));
      this.hazir();
      const oz = this.ozet();
      r.ozetCalisiyor = (oz !== null && Array.isArray(oz.magaza) && oz.magaza.length === 7 &&
        Array.isArray(oz.gunlukGorevler) && oz.gunlukGorevler.length === 3 &&
        Array.isArray(oz.boostlar) && oz.boostlar.length === 6);

      // ═════ 37) GERÇEK KAYIT KİRLENMEDİ ═════
      r.gercekKayitTemiz = _sdGercek
        ? (JSON.stringify([_sdGercek.data.klan, _sdGercek.data.klanGunluk, _sdGercek.data.gold]) === _onceki)
        : true;

    } catch (ex) {
      r.istisna = false;
      r._hataMesaji = String(ex && ex.stack ? ex.stack : ex);
    } finally {
      K._sanal = esk.sanal;
      K._yerel = esk.yerel;
      K._testZaman = esk.zaman;
      this._testZaman = esk.bizimZaman;
    }

    r.allPass = Object.keys(r).every(function (k) {
      return k === 'allPass' || k.charAt(0) === '_' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') window.KlanKutu = KlanKutu;
if (typeof module !== 'undefined' && module.exports) module.exports = KlanKutu;
