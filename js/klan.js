'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Klan — KLAN SİSTEMİ ÇEKİRDEĞİ   (Ajan B · KLAN-SOZLESME.md §4)

   Kapsam: kurma · katılma/ayrılma · 5 rol + yetki matrisi · XP/50 seviye ·
           KP cüzdanı · sağlık skoru · 6 klan sınıfı · lore · 6 rozet ·
           duyuru panosu (sohbetin YERİNE) · kayıt.

   🔴 TOP-LEVEL AD: yalnız `Klan`. `Clan`/`ClanWar` js/social.js'te zaten
      top-level `const`; onlara DOKUNULMAZ (aynı ad = "Identifier has already
      been declared" = tüm oyun çöker).

   🔴 ÖDÜL PARA BİRİMİ: yalnız Klan Parası (KP). Klan sistemi ASLA altın/elmas
      VERMEZ. Tek istisna: klan KURMA altın HARCAR (5.000).

   ── TASARIMDAN SAPMALAR (hepsi gerekçeli, "Klan sistemi.txt" referanslı) ──
   S1  §3.3 dinamik fiyatlandırma KALDIRILDI → sabit 5.000 altın.
       Gerekçe: "sunucudaki toplam klan sayısı" tek cihazda bilinemez; ayrıca
       tasarımın kendi örneği tavanını aşıyor (55.000 > 50.000 tavan).
   S2  §3.2 "benzersizlik" küresel kontrol YOK → yalnız bot klan adlarıyla
       çakışma engellenir (tek cihaz, sunucu yok).
   S3  §3.1 `player.rank >= BRONZE` ön koşulu KALDIRILDI — bu oyunda rütbe
       mesafeden türeyen bir etiket; seviye ≥ 5 zaten aynı kapıyı tutuyor.
   S4  YETKİ MATRİSİ TASARIMDA YOKTU (satır 165 ve 2125'te yalnız rol ADLARI
       geçiyor: leader/co-leader/officer/member/recruit). Matris TÜRETİLDİ.
   S5  §17 `MAX_GUNLUK_XP = 500` UYGULANMADI. Tasarım kendisiyle çelişiyor:
       §4.1 aynı sayfada teorik maksimumu 1.065 XP diye veriyor. Kaynak bazlı
       sınırlar (500/100/200/5/150/∞/50/60) uygulanır, tek bir 500 tavanı YOK.
   S6  §4.2 XP eğrisi ÖLÇEKLENDİ (sözleşme §5). Ham kümülatif 29.140.885 XP
       (= 8-9 yıl). Ölçek `_oran` ÇALIŞMA ZAMANINDA HESAPLANIR, elle yazılmaz.
   S7  §13.2 sağlık skoru faktörleri 0-100'e NORMALİZE EDİLDİ. Tasarım formülü
       birimleri karıştırıyor: kimi faktör yüzde (0-100), "Haftalık Büyüme
       Oranı" oran (0,05), "Ortalama Üye Katkısı / 5000" ise 0-1. Ağırlıklar
       1,00 topladığı için hepsi 0-100 olmalı; aksi halde skor asla 30'u geçmez.
   S8  §13.2 hiç savaş yapılmamışsa savaş faktörü 50 (nötr) kabul edilir —
       tasarım bu durumu tanımlamıyor, 0 vermek yeni klanı haksız cezalandırır.
   S9  §7 KLAN SOHBETİ TAMAMEN KALDIRILDI (kullanıcı kararı). Yerine yalnız
       sistem mesajlı DUYURU PANOSU. Bot sohbeti YASAK.
   S10 §4.3 tablosundaki sohbet temelli 7 özellik adı duyuru panosu
       karşılıklarıyla değiştirildi (seviye 2/14/24/32/37/42/47).
   S11 ERR_011..ERR_020 EKLENDİ (tasarımda yalnız ERR_001..ERR_010 var;
       katılma/ayrılma/rol/sınıf hataları kodsuzdu).
   S12 §3.4 "Klan Kurucusu" başarımı ödülü (50 Elmas + 1.000 Altın) KP'ye
       çevrildi: kpCevir(1000, 50) = 210 KP. Altın/elmas verilmez.
   S13 §30.2 Diplomat ve Mühendis bonusları ÇARPAN DEĞİL (ittifak/indirim/
       tamir) → `sinifCarpani()` onlar için 1.00 döner (sözleşme §4 imzası
       zaten yalnız 1.00 | 1.10 | 1.15 diyor). Bonuslar `sinifBonus()`'ta.

   ⚠ Template literal içinde backtick YOK (proje tuzağı #9).
   ⚠ `SaveData` bare global'dir (window'da DEĞİL) → typeof ile erişilir.
   ⚠ `SaveData.save()` kirli işaretler, `saveNow()` gerçekten yazar. Bu dosya
     ASLA `saveNow()` çağırmaz (proje tuzağı #12).
   ═══════════════════════════════════════════════════════════════════════ */

const Klan = {
  ad: 'klan',
  surum: '1.0',

  // ───────────────────────── SABİTLER ─────────────────────────
  KURMA_UCRETI: 5000,          // §3.3 — dinamik değil (bkz. S1)
  MIN_SEVIYE: 5,               // §3.1
  SOGUMA_MS: 24 * 60 * 60 * 1000,   // §3.1 — ayrılma sonrası 24 saat
  MAKS_SEVIYE: 50,
  MAKS_LORE: 500,              // §30.1
  MAKS_DUYURU: 50,             // ⚠ UI._toasts 159'a çıkıp bellek sızdırmıştı
  MAKS_DUYURU_METIN: 160,
  SINIF_SEVIYE: 15,            // §30.2
  SINIF_DEGISIM_MS: 30 * 24 * 60 * 60 * 1000,   // 30 gün
  DAGITMA_MS: 48 * 60 * 60 * 1000,              // §14.2 Senaryo 1
  KIDEM_MS: 365 * 24 * 60 * 60 * 1000,          // §30.3 — 1 yıl
  CAYLAK_MS: 30 * 24 * 60 * 60 * 1000,          // §30.3 — 1 ay
  AKTIF_PENCERE_MS: 7 * 24 * 60 * 60 * 1000,    // §13.2 — son 7 gün
  MAKS_KLAN: 1000000,          // §3.1 MAX_CLAN_LIMIT — tek cihazda ulaşılamaz
  SAVAS_KAHRAMANI_ESIK: 10,    // §30.3
  IDEAL_KATKI: 5000,           // §13.2
  IDEAL_BUYUME: 0.05,          // §13.2 — %5

  // Ödül dönüşümü — SÖZLEŞME §6 (tek merkezi kural, 4 ajan bunu çağırır)
  KP_ALTIN_BOLEN: 100,
  KP_ELMAS_CARPAN: 4,

  RE_AD: /^[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s]{3,20}$/,   // §3.2 birebir
  RE_ETIKET: /^[A-Z]{3,4}$/,                     // §3.2 birebir

  GIZLILIK: ['acik', 'kapali', 'gizli'],         // §3.4 Adım 3
  ROLLER: ['lider', 'yardimci', 'subay', 'uye', 'caylak'],
  ROL_SIRA: { lider: 5, yardimci: 4, subay: 3, uye: 2, caylak: 1 },
  ROL_AD: { lider: 'Lider', yardimci: 'Yardımcı', subay: 'Subay', uye: 'Üye', caylak: 'Çaylak' },

  DUYURU_TIP: ['sistem', 'seviye', 'savas', 'etkinlik', 'basarim', 'kutu', 'gorev', 'sezon'],

  // ───────────────── HATA KODLARI (§3.5 + S11) ─────────────────
  HATA: {
    ERR_001: 'Yeterli seviyede değilsiniz. Klan kurmak için en az Seviye 5 olmalısınız.',
    ERR_002: 'Yeterli altınınız yok. Klan kurmak 5.000 Altın gerektirir.',
    ERR_003: 'Bu isim zaten kullanılıyor. Lütfen farklı bir isim seçin.',
    ERR_004: 'Bu etiket zaten kullanılıyor. Lütfen farklı bir etiket seçin.',
    ERR_005: 'Zaten bir klana üyesiniz. Önce mevcut klanınızdan ayrılmalısınız.',
    ERR_006: 'Klan kurma bekleme süresi dolmadı. Son klanınızdan ayrılalı 24 saat olmamış.',
    ERR_007: 'Klan adı veya etiketi yasaklı kelime içeriyor. Lütfen uygun bir isim girin.',
    ERR_008: 'Klan adı çok kısa (3 karakterden az) veya çok uzun (20 karakterden fazla).',
    ERR_009: 'Klan etiketi 3 veya 4 büyük harften oluşmalıdır.',
    ERR_010: 'Sunucuda maksimum klan sayısına ulaşıldı. Daha sonra tekrar deneyin.',
    // ── S11: tasarımda kodsuz olan durumlar ──
    ERR_011: 'Klan bulunamadı.',
    ERR_012: 'Klan dolu. Şu anda yeni üye alınamıyor.',
    ERR_013: 'Bu klan gizli. Katılmak için davet gerekir.',
    ERR_014: 'Başvurunuz gönderildi. Lider onayı bekleniyor.',
    ERR_015: 'Bir klana üye değilsiniz.',
    ERR_016: 'Bu işlem için yetkiniz yok.',
    ERR_017: 'Bu özellik henüz açılmadı. Klan seviyeniz yetersiz.',
    ERR_018: 'Geçersiz rol.',
    ERR_019: 'Klan sınıfı 30 günde bir değiştirilebilir.',
    ERR_020: 'Yeterli Klan Paranız yok.'
  },

  // ───────────── YETKİ MATRİSİ (S4 — TASARIMDA YOKTU, TÜRETİLDİ) ─────────────
  // Mantık: her rol bir alttakinin TÜM yetkilerini kapsar (kümülatif hiyerarşi).
  // Klanı dağıtmak, sınıf seçmek ve özel etkinlik kurmak GERİ ALINAMAZ /
  // klan çapında etkilidir → yalnız lider.
  EYLEMLER: ['davetEt', 'basvuruOnayla', 'duyuruYaz', 'uyeAt', 'rolVer',
    'ayarDegistir', 'lorDuzenle', 'kpHarca', 'savasBaslat',
    'sinifSec', 'etkinlikKur', 'klanDagit'],
  YETKI: {
    lider: ['davetEt', 'basvuruOnayla', 'duyuruYaz', 'uyeAt', 'rolVer',
      'ayarDegistir', 'lorDuzenle', 'kpHarca', 'savasBaslat',
      'sinifSec', 'etkinlikKur', 'klanDagit'],
    yardimci: ['davetEt', 'basvuruOnayla', 'duyuruYaz', 'uyeAt', 'rolVer',
      'ayarDegistir', 'lorDuzenle', 'kpHarca', 'savasBaslat'],
    subay: ['davetEt', 'basvuruOnayla', 'duyuruYaz'],
    uye: ['davetEt'],
    caylak: []
  },

  // ───────────── XP KAYNAKLARI + GÜNLÜK SINIRLAR (§4.1) ─────────────
  // ⚠ S5: tek bir 500 tavanı YOK. Toplam teorik maks = 1.065 XP/gün.
  XP_KAYNAK: {
    yaris: { sinir: 500, ad: 'Yarış Tamamlama' },
    galibiyet: { sinir: 100, ad: 'Yarış Kazanma' },
    kupa: { sinir: 200, ad: 'Kupa Tamamlama' },
    giris: { sinir: 5, ad: 'Günlük Giriş' },
    etkinlik: { sinir: 150, ad: 'Etkinlik Yarışı' },
    basarim: { sinir: Infinity, ad: 'Başarımlar' },
    magaza: { sinir: 50, ad: 'Klan Mağazası Alışverişi' },
    davet: { sinir: 60, ad: 'Arkadaş Davet Etme' }
  },

  // ───────────── SEVİYE EĞRİSİ HAM PARAMETRELERİ (§4.2) ─────────────
  // XP(level) = floor(500 × level^2.1 + 200 × level)
  _HAM_A: 500, _HAM_B: 200, _US: 2.1,
  // Sözleşme §5 hedefi: aktif TEK oyuncu günde ~350 XP → ~180 günde seviye 50.
  _HEDEF_GUN: 180,
  _GUNLUK_ORT_XP: 350,
  _egri: null,    // { gerekli[], kumulatif[], oran, K, ham }

  // ───────────── SEVİYE FAYDA TABLOSU (§4.3, 50 satır) ─────────────
  _KAPASITE: [
    20, 20, 20, 20, 22, 22, 22, 23, 23, 25,
    25, 25, 26, 26, 27, 27, 27, 28, 28, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30
  ],
  _CARPAN: [
    1.00, 1.00, 1.00, 1.00, 1.05, 1.05, 1.05, 1.10, 1.10, 1.15,
    1.15, 1.20, 1.20, 1.25, 1.30, 1.30, 1.35, 1.40, 1.40, 1.50,
    1.50, 1.55, 1.55, 1.60, 1.60, 1.65, 1.65, 1.70, 1.70, 1.75,
    1.75, 1.80, 1.80, 1.85, 1.90, 1.90, 1.95, 1.95, 2.00, 2.00,
    2.05, 2.05, 2.10, 2.10, 2.15, 2.15, 2.20, 2.20, 2.25, 2.50
  ],
  // §4.3 "Yeni Özellik" sütunu. S10: sohbet temelli 7 satır duyuru panosuna çevrildi.
  _OZELLIK_AD: [
    'Temel Klan', 'Duyuru Panosu Aktif', 'Basit Rozet', 'Etkinlik Katılımı',
    '+2 Üye Kapasitesi', 'Klan Bildirimleri', 'Günlük Görevler', '+1 Üye Kapasitesi',
    'Klan Rengi', 'Klan Mağazası', 'Haftalık Görevler', 'Özel Amblemler',
    '+1 Üye Kapasitesi', 'Duyuru Panosu Teması', 'Klan Savaşları', '+1 Üye Kapasitesi',
    'Premium Rozet', '+1 Üye Kapasitesi', 'Klan Bannerı', 'Maksimum Üye',
    'Premium Renkler', 'Klan İstatistikleri', 'Özel Efektler', 'Katkı Grafikleri',
    'Klan Efsanesi', 'Mağaza Premium Ürünler', 'Savaş Özel Haritası', 'Klan Başarımları',
    'Rozet Özelleştirme', 'Klan Duvarı', 'Mağaza %10 İndirim', 'Panoda Canlı Skor',
    'Savaş Turnuvası', 'Klan Özel Etkinliği', 'Premium Amblemler', 'Haftada 1 Ücretsiz Ürün',
    'Özel Duyuru İkonları', 'Savaş Liderlik Tablosu', 'Animasyonlu Rozet', 'Klan Marşı',
    'Mağaza %20 İndirim', 'Klan Günlüğü Arşivi', 'Savaş Ödül Çarpanı', 'Klan Özel Amblemi',
    'Klan Duvarı Premium', 'Mağaza %30 İndirim', 'VIP Duyuru Rozeti', 'Efsane Ligi',
    'Efsanevi Rozet Işığı', 'Efsanevi Klan Statüsü'
  ],
  // 🔴 KİLİT SIRASI KORUNUR (sözleşme §5) — yalnız eğri ölçeklenir.
  KILIT: {
    etkinlik: 4,        // §4.3 sv4  "Etkinlik Katılımı"
    gunlukGorev: 7,     // §4.3 sv7
    magaza: 10,         // §4.3 sv10
    haftalikGorev: 11,  // §4.3 sv11
    savas: 15,          // §4.3 sv15
    sinif: 15,          // §30.2
    banner: 19,         // §4.3 sv19
    maksUye: 20,        // §4.3 sv20
    istatistik: 22,     // §4.3 sv22
    basarim: 28,        // §4.3 sv28
    duvar: 30,          // §4.3 sv30
    ozelEtkinlik: 34,   // §4.3 sv34
    mars: 40            // §4.3 sv40 (Efsanevi Rozet katmanı) — sözleşme §5 marş@40
  },

  // ───────────── 6 KLAN SINIFI (§30.2) ─────────────
  SINIF: {
    yarisci: { ad: 'Yarışçılar', tur: 'mesafe', carpan: 1.10, renk: '#3aa0e8', aciklama: 'Mesafe etkinliklerinde +%10 puan. Hız ve dayanıklılık odaklı.' },
    akrobat: { ad: 'Akrobatlar', tur: 'takla', carpan: 1.15, renk: '#c46ae8', aciklama: 'Takla etkinliklerinde +%15 puan. Havada geçirilen süre bonusu.' },
    hazineavcisi: { ad: 'Hazine Avcıları', tur: 'coin', carpan: 1.15, renk: '#e8b23a', aciklama: 'Coin etkinliklerinde +%15 puan. Coin çekim alanı genişler.' },
    savaslord: { ad: 'Savaş Lordları', tur: 'savas', carpan: 1.10, renk: '#e0553a', aciklama: 'Klan savaşlarında +%10 puan. Agresif oyuncular için.' },
    // S13: aşağıdaki ikisinin bonusu ÇARPAN DEĞİL → sinifCarpani() 1.00 döner.
    diplomat: { ad: 'Diplomatlar', tur: null, carpan: 1.00, renk: '#48c48a', aciklama: 'İttifak bonusu +%5, dost klan sayısı sınırı +2.', ittifakBonus: 0.05, dostSiniriEk: 2 },
    muhendis: { ad: 'Mühendisler', tur: null, carpan: 1.00, renk: '#8a93a8', aciklama: 'Araç tamir süresi %20 kısalır, mağaza indirimi +%5.', tamirKisalma: 0.20, magazaIndirim: 0.05 }
  },

  // ───────────── 6 ROZET (§30.3, hiyerarşi sırasıyla) ─────────────
  ROZET: [
    { id: 'kurucu', ad: 'Klan Kurucusu', sira: 1, renk: '#e8b23a', aciklama: 'Klanı kuran kişi. Asla kaybolmaz.' },
    { id: 'lider', ad: 'Klan Lideri', sira: 2, renk: '#e0553a', aciklama: 'Mevcut lider.' },
    { id: 'kidemli', ad: 'Kıdemli', sira: 3, renk: '#c46ae8', aciklama: '1 yıldan fazla klan üyesi.' },
    { id: 'savasKahramani', ad: 'Savaş Kahramanı', sira: 4, renk: '#3aa0e8', aciklama: '10 veya daha fazla savaş kazanmış.' },
    { id: 'mvp', ad: 'Haftanın MVP\'si', sira: 5, renk: '#48c48a', aciklama: 'Bu hafta en çok katkı yapan üye.' },
    { id: 'caylak', ad: 'Çaylak', sira: 6, renk: '#8a93a8', aciklama: '1 aydan az süredir üye.' }
  ],

  // ───────────── SAĞLIK SKORU KADEMELERİ (§13.2) ─────────────
  // ⚠ Renkler HEX olmalı — `_drawCard` accent + '33' diye alfa ekliyor (tuzak #5).
  SAGLIK_KADEME: [
    { min: 80, ad: 'Mükemmel', renk: '#48c48a', aksiyon: 'Büyümeye devam et.' },
    { min: 60, ad: 'İyi', renk: '#3aa0e8', aksiyon: 'Küçük iyileştirmeler yap.' },
    { min: 40, ad: 'Orta', renk: '#e8b23a', aksiyon: 'Strateji değişikliği düşün.' },
    { min: 20, ad: 'Zayıf', renk: '#e08a3a', aksiyon: 'Acil önlem al.' },
    { min: 0, ad: 'Kritik', renk: '#e0553a', aksiyon: 'Klan yeniden yapılandırılmalı.' }
  ],

  // ───────────── YASAKLI KELİMELER (§3.2 "50+ kelimelik liste") ─────────────
  // İki liste: PARCA yapışık metinde aranır (uzun/kesin), TAM yalnız tam
  // kelime olarak aranır (kısa/ yanlış pozitif riski yüksek — örn. "pic"
  // "kapicilar" içinde geçer, "bot" "robot" içinde geçer).
  _YASAK_PARCA: [
    'orospu', 'oruspu', 'amcik', 'amck', 'sikeyim', 'sikerim', 'siktir', 'sikik',
    'yarrak', 'yarak', 'gotveren', 'gotlek', 'ibne', 'pezevenk', 'kahpe', 'kaltak',
    'pust', 'godoss', 'ananisikeyim', 'anansikeyim', 'amina', 'aminakoy',
    'fuck', 'fuk', 'shit', 'bitch', 'asshole', 'bastard', 'wanker', 'whore',
    'nigger', 'nigga', 'faggot', 'cunt', 'dickhead', 'motherfuck', 'pussy',
    'bedavaaltin', 'bedavaelmas', 'freegold', 'freecoins', 'hilekodu', 'hilesi',
    'kumarhane', 'bahissitesi', 'casino', 'betting', 'illegalbahis',
    'hitler', 'nazizm', 'terorist', 'katliam', 'pornosu', 'pornolar'
  ],
  _YASAK_TAM: [
    'am', 'got', 'sik', 'pic', 'oc', 'aq', 'mk', 'bot', 'admin', 'mod', 'gm',
    'hack', 'cheat', 'nazi', 'sex', 'seks', 'porno', 'esrar', 'eroin', 'kokain',
    'www', 'http', 'https', 'com', 'net', 'org', 'reklam', 'spam'
  ],

  // ═══════════════════════════════════════════════════════════════
  //  ALTYAPI — depo, zaman, sanal (test) kip
  // ═══════════════════════════════════════════════════════════════

  // Sanal kip: selfTest gerçek kaydı KİRLETMEZ. _sanal=true iken tüm okuma/
  // yazma bellek içi `_yerel`e gider. (SaveData gecikmeli yazdığı için testin
  // bıraktığı kirlilik yedeğin kendisine sızabiliyordu — §8B.28/O.)
  _sanal: false,
  _yerel: null,
  _testZaman: null,

  _yerelKur() {
    if (!this._yerel) this._yerel = { klan: null, klanGunluk: null, gold: 0, playerLevel: 1 };
    return this._yerel;
  },
  _sd() {
    if (this._sanal) return null;
    return (typeof SaveData !== 'undefined' && SaveData && SaveData.data) ? SaveData : null;
  },
  _oku(anahtar) {
    const s = this._sd();
    if (s) { const v = s.get(anahtar); return (v === undefined) ? null : v; }
    return this._yerelKur()[anahtar] || null;
  },
  _yaz(anahtar, deger) {
    const s = this._sd();
    if (s) s.set(anahtar, deger);           // ⚠ set → save() (gecikmeli). saveNow YOK.
    else this._yerelKur()[anahtar] = deger;
  },
  _altin() {
    const s = this._sd();
    return s ? (Number(s.data.gold) || 0) : (Number(this._yerelKur().gold) || 0);
  },
  _altinHarca(n) {
    const s = this._sd();
    if (s) return s.spendGold(n) === true;
    const y = this._yerelKur();
    if ((Number(y.gold) || 0) < n) return false;
    y.gold = (Number(y.gold) || 0) - n;
    return true;
  },
  _oyuncuSeviye() {
    const s = this._sd();
    return s ? Math.max(1, Number(s.data.playerLevel) || 1) : Math.max(1, Number(this._yerelKur().playerLevel) || 1);
  },
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },
  _bugun() {
    const d = new Date(this._simdi());
    const ay = d.getMonth() + 1, gun = d.getDate();
    return d.getFullYear() + '-' + (ay < 10 ? '0' : '') + ay + '-' + (gun < 10 ? '0' : '') + gun;
  },
  _sayi(v, vars) { const n = Number(v); return isFinite(n) ? n : (vars || 0); },
  _hata(kod) { return { ok: false, hata: kod, mesaj: this.HATA[kod] || '' }; },
  _tamam(ek) {
    const r = { ok: true, hata: null, mesaj: '' };
    if (ek) for (const k in ek) if (Object.prototype.hasOwnProperty.call(ek, k)) r[k] = ek[k];
    return r;
  },

  // ═══════════════════════════════════════════════════════════════
  //  SEVİYE EĞRİSİ — sözleşme §5 (ÖLÇEK ÇALIŞMA ZAMANINDA TÜRETİLİR)
  // ═══════════════════════════════════════════════════════════════
  //  Ham formül (§4.2):  XP(l) = floor(500·l^2.1 + 200·l)
  //  Ham kümülatif (1→50) = 29.140.885 XP  ≈ 8-9 yıl → oyuna uygun DEĞİL.
  //  Ölçekli formül (sözleşme §5): XP(l) = floor(K·l^2.1 + 200·l/oran)
  //     oran = hamKumulatif / (HEDEF_GUN × GUNLUK_ORT_XP)
  //     K    = 500 / oran
  //  🔴 `oran` ve `K` ELLE YAZILMAZ; aşağıda hesaplanır. selfTest kümülatifi
  //     günlük ortalamaya bölüp ~180 gün çıktığını ÖLÇEREK kilitler.
  _egriKur() {
    if (this._egri) return this._egri;
    let ham = 0;
    for (let l = 1; l < this.MAKS_SEVIYE; l++) {
      ham += Math.floor(this._HAM_A * Math.pow(l, this._US) + this._HAM_B * l);
    }
    const oran = ham / (this._HEDEF_GUN * this._GUNLUK_ORT_XP);
    const K = this._HAM_A / oran;
    const B = this._HAM_B / oran;
    const gerekli = [0];            // gerekli[l] = l → l+1 için gereken XP
    const kumulatif = [0, 0];       // kumulatif[l] = seviye l'ye ulaşmak için toplam XP
    for (let l = 1; l < this.MAKS_SEVIYE; l++) {
      const x = Math.floor(K * Math.pow(l, this._US) + B * l);
      gerekli[l] = x;
      kumulatif[l + 1] = kumulatif[l] + x;
    }
    gerekli[this.MAKS_SEVIYE] = 0;  // 50'de tavan
    this._egri = { gerekli: gerekli, kumulatif: kumulatif, oran: oran, K: K, B: B, ham: ham };
    return this._egri;
  },
  _seviyeHesapla(toplamXp) {
    const k = this._egriKur().kumulatif;
    const x = Math.max(0, this._sayi(toplamXp, 0));
    for (let l = this.MAKS_SEVIYE; l >= 1; l--) if (x >= k[l]) return l;
    return 1;
  },

  // ═══════════════════════════════════════════════════════════════
  //  KURULUM
  // ═══════════════════════════════════════════════════════════════
  hazir() {
    this._egriKur();
    this._gunluk();
    this.eskidenAktar();
    return true;
  },

  _bosKlan() {
    return {
      id: null, ad: '', etiket: '', amblem: 0,
      renk1: '#e8b23a', renk2: '#1d2a44',      // ⚠ HEX zorunlu (tuzak #5)
      gizlilik: 'acik', lore: '',
      seviye: 1, xp: 0, kp: 0,
      sinif: null, sinifTarih: 0,
      uyeler: [], rozetler: [], kurulus: 0,
      ligPuan: 0, sezonPuan: 0, haftalikPuan: 0,
      duyurular: [],
      // ── ek alanlar (additive; sözleşme şemasını bozmaz) ──
      benimId: 'oyuncu', kurucuId: 'oyuncu',
      savasKazanilan: 0, savasToplam: 0,
      haftalikYeni: 0, haftalikAyrilan: 0, etkinlikKatilan: 0,
      dagitmaZamani: 0, basvurular: []
    };
  },

  // Günlük kova. `ayrilmaZamani` gün dönümünde SIFIRLANMAZ (24 saatlik soğuma
  // gece yarısını aşabilir); diğer alanlar sıfırlanır.
  _gunluk() {
    let g = this._oku('klanGunluk');
    const bugun = this._bugun();
    let degisti = false;
    if (!g || typeof g !== 'object' || Array.isArray(g)) {
      g = { tarih: bugun, xpKaynak: {}, gorevler: [], kutuAcildi: {}, ayrilmaZamani: 0 };
      degisti = true;
    } else if (g.tarih !== bugun) {
      g = { tarih: bugun, xpKaynak: {}, gorevler: [], kutuAcildi: {}, ayrilmaZamani: this._sayi(g.ayrilmaZamani, 0) };
      degisti = true;
    }
    if (!g.xpKaynak) { g.xpKaynak = {}; degisti = true; }
    if (!Array.isArray(g.gorevler)) { g.gorevler = []; degisti = true; }
    if (!g.kutuAcildi) { g.kutuAcildi = {}; degisti = true; }
    if (degisti) this._yaz('klanGunluk', g);
    return g;
  },

  // ── Eski 23 satırlık `Clan` (js/social.js #23) verisini yeni şemaya taşı ──
  // ⚠ `Clan` bare global; window'da olsa da typeof ile erişilir (tuzak #10).
  eskidenAktar() {
    if (this._oku('klan')) return false;
    let eski = null;
    try {
      const C = (typeof Clan !== 'undefined') ? Clan : null;
      if (C && typeof C.current === 'function') eski = C.current();
    } catch (e) { eski = null; }
    if (!eski || !eski.name) return false;
    const k = this._bosKlan();
    const simdi = this._simdi();
    k.id = 'K' + simdi.toString(36).toUpperCase();
    k.ad = String(eski.name).slice(0, 20);
    k.etiket = this._etiketTuret(k.ad);
    k.kurulus = simdi;
    k.ligPuan = this._sayi(eski.score, 0);
    k.haftalikPuan = this._sayi(eski.score, 0);
    const uyeAdlari = Array.isArray(eski.members) ? eski.members : ['me'];
    for (let i = 0; i < uyeAdlari.length; i++) {
      const benMi = (uyeAdlari[i] === 'me' || i === 0);
      k.uyeler.push(this._uyeYap(benMi ? 'oyuncu' : String(uyeAdlari[i]),
        benMi ? 'Sen' : String(uyeAdlari[i]),
        benMi ? 'lider' : 'uye', !benMi, simdi));
    }
    this._yaz('klan', k);
    this.duyuru('sistem', 'Eski klan kaydın yeni sisteme taşındı.');
    return true;
  },
  _etiketTuret(ad) {
    const harf = String(ad).toUpperCase().replace(/[^A-ZĞÜŞÖÇİ]/g, '')
      .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
      .replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/İ/g, 'I');
    if (harf.length >= 3) return harf.slice(0, 4);
    return (harf + 'KLN').slice(0, 3);
  },
  _uyeYap(id, ad, rol, bot, simdi) {
    return {
      id: id, ad: ad, rol: rol,
      katki: 0, haftalikKatki: 0,
      sonAktif: simdi, katilim: simdi,
      rozetler: [], bot: !!bot,
      savasGalibiyeti: 0, etkinligeKatildi: false
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  DURUM / KAYIT
  // ═══════════════════════════════════════════════════════════════
  durum() { return this._oku('klan'); },
  al() { return this._oku('klan'); },
  var() { return !!this._oku('klan'); },
  kaydet() {
    const k = this._oku('klan');
    this._yaz('klan', k);          // gecikmeli yazma; saveNow ÇAĞIRMA
    return true;
  },
  _ben() {
    const k = this.al(); if (!k) return null;
    for (let i = 0; i < k.uyeler.length; i++) if (k.uyeler[i].id === k.benimId) return k.uyeler[i];
    return null;
  },
  benimRol() { const u = this._ben(); return u ? u.rol : null; },

  // ═══════════════════════════════════════════════════════════════
  //  AD / ETİKET DOĞRULAMA + YASAKLI KELİME (§3.2)
  // ═══════════════════════════════════════════════════════════════
  _normalize(metin) {
    let s = String(metin == null ? '' : metin);
    s = s.replace(/İ/g, 'I').replace(/I/g, 'I').replace(/Ğ/g, 'G').replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S').replace(/Ö/g, 'O').replace(/Ç/g, 'C');
    s = s.toLowerCase();
    s = s.replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i');
    // leet çevirisi — "s1kt1r" gibi kaçamakları kapatır
    s = s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
      .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
      .replace(/@/g, 'a').replace(/\$/g, 's');
    return s;
  },
  yasakliMi(metin) {
    const d = this._normalize(metin);
    const yapisik = d.replace(/[^a-z]/g, '');
    for (let i = 0; i < this._YASAK_PARCA.length; i++) {
      if (yapisik.indexOf(this._YASAK_PARCA[i]) >= 0) return true;
    }
    const parcalar = d.split(/[^a-z]+/);
    for (let i = 0; i < parcalar.length; i++) {
      if (parcalar[i] && this._YASAK_TAM.indexOf(parcalar[i]) >= 0) return true;
    }
    return false;
  },
  adGecerliMi(ad) {
    const s = String(ad == null ? '' : ad);
    if (!this.RE_AD.test(s)) return false;
    // TÜRETİLDİ: tasarımın regex'i "   " (üç boşluk) gibi boş adı geçiriyor.
    return /[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/.test(s);
  },
  etiketGecerliMi(etiket) { return this.RE_ETIKET.test(String(etiket == null ? '' : etiket)); },

  // Bot klanlarıyla çakışma (S2). KlanSim (Ajan C) yoksa sessizce geçer.
  _botKlanlar() {
    try {
      const S = (typeof KlanSim !== 'undefined') ? KlanSim : ((typeof window !== 'undefined' && window.KlanSim) ? window.KlanSim : null);
      if (!S || typeof S.botKlanlar !== 'function') return [];
      const h = (typeof S.haftaId === 'function') ? S.haftaId() : Math.floor(this._simdi() / 604800000);
      const liste = S.botKlanlar(h);
      return Array.isArray(liste) ? liste : [];
    } catch (e) { return []; }
  },
  _adCakismaVar(ad) {
    const n = this._normalize(ad).replace(/\s+/g, '');
    const b = this._botKlanlar();
    for (let i = 0; i < b.length; i++) {
      if (b[i] && b[i].ad && this._normalize(b[i].ad).replace(/\s+/g, '') === n) return true;
    }
    return false;
  },
  _etiketCakismaVar(etiket) {
    const e = String(etiket).toUpperCase();
    const b = this._botKlanlar();
    for (let i = 0; i < b.length; i++) if (b[i] && b[i].etiket === e) return true;
    return false;
  },

  // ═══════════════════════════════════════════════════════════════
  //  KURMA (§3)
  // ═══════════════════════════════════════════════════════════════
  sogumaKalan() {
    const t = this._sayi(this._gunluk().ayrilmaZamani, 0);
    if (!t) return 0;
    const kalan = (t + this.SOGUMA_MS) - this._simdi();
    return kalan > 0 ? kalan : 0;
  },

  kur(ad, etiket, amblemId, gizlilik) {
    this._egriKur();
    if (this.var()) return this._hata('ERR_005');
    if (this._oyuncuSeviye() < this.MIN_SEVIYE) return this._hata('ERR_001');
    if (this.sogumaKalan() > 0) return this._hata('ERR_006');

    const adT = String(ad == null ? '' : ad).trim();
    const etT = String(etiket == null ? '' : etiket).trim().toUpperCase();
    if (!this.adGecerliMi(adT)) return this._hata('ERR_008');
    if (!this.etiketGecerliMi(etT)) return this._hata('ERR_009');
    if (this.yasakliMi(adT) || this.yasakliMi(etT)) return this._hata('ERR_007');
    if (this._adCakismaVar(adT)) return this._hata('ERR_003');
    if (this._etiketCakismaVar(etT)) return this._hata('ERR_004');
    if (this._botKlanlar().length + 1 > this.MAKS_KLAN) return this._hata('ERR_010');

    // ⚠ Altın EN SON kontrol edilir ve harcanır — geçersiz formda para gitmesin.
    if (this._altin() < this.KURMA_UCRETI) return this._hata('ERR_002');
    if (!this._altinHarca(this.KURMA_UCRETI)) return this._hata('ERR_002');

    const simdi = this._simdi();
    const k = this._bosKlan();
    k.id = 'K' + simdi.toString(36).toUpperCase() + Math.floor(this._sayi(this._altin(), 0) % 97).toString(36);
    k.ad = adT;
    k.etiket = etT;
    k.amblem = Math.max(0, Math.floor(this._sayi(amblemId, 0)));
    k.gizlilik = this.GIZLILIK.indexOf(gizlilik) >= 0 ? gizlilik : 'acik';
    k.kurulus = simdi;
    k.uyeler.push(this._uyeYap('oyuncu', 'Sen', 'lider', false, simdi));
    k.haftalikYeni = 1;
    this._yaz('klan', k);

    this.duyuru('sistem', k.ad + ' klanı kuruldu!');
    this.duyuru('sistem', 'Hoş geldiniz!');
    // S12: §3.4 "Klan Kurucusu" başarımı 50 Elmas + 1.000 Altın veriyordu.
    //      Klan sistemi altın/elmas VERMEZ → KP'ye çevrildi.
    const odul = this.kpCevir(1000, 50);      // = 210 KP
    this.kpEkle(odul, 'kurucu-basarimi');
    this.duyuru('basarim', 'Klan Kurucusu başarımı açıldı! +' + odul + ' KP');
    return this._tamam({ klan: k, kpOdul: odul });
  },

  // ═══════════════════════════════════════════════════════════════
  //  KATILMA / AYRILMA
  // ═══════════════════════════════════════════════════════════════
  // klanId: string (KlanSim'den aranır) VEYA doğrudan klan nesnesi.
  katil(klanId, davetli) {
    if (this.var()) return this._hata('ERR_005');
    if (this.sogumaKalan() > 0) return this._hata('ERR_006');

    let hedef = null;
    if (klanId && typeof klanId === 'object') hedef = klanId;
    else {
      const b = this._botKlanlar();
      for (let i = 0; i < b.length; i++) if (b[i] && b[i].id === klanId) { hedef = b[i]; break; }
    }
    if (!hedef) return this._hata('ERR_011');

    const gizlilik = this.GIZLILIK.indexOf(hedef.gizlilik) >= 0 ? hedef.gizlilik : 'acik';
    const seviye = Math.max(1, Math.min(this.MAKS_SEVIYE, Math.floor(this._sayi(hedef.seviye, 1))));
    const kapasite = this._KAPASITE[seviye - 1];
    const mevcut = Math.max(0, Math.floor(this._sayi(hedef.uyeSayisi, Array.isArray(hedef.uyeler) ? hedef.uyeler.length : 1)));
    if (mevcut >= kapasite) return this._hata('ERR_012');
    if (gizlilik === 'gizli' && !davetli) return this._hata('ERR_013');
    if (gizlilik === 'kapali' && !davetli) {
      // Kapalı klan: başvuru gönderilir, lider onayı beklenir (§17 TC-004).
      const g = this._gunluk();
      g.gorevler = g.gorevler || [];
      const basvuru = { tip: 'klanBasvuru', klanId: hedef.id || null, t: this._simdi() };
      g.gorevler.push(basvuru);
      this._yaz('klanGunluk', g);
      return { ok: false, hata: 'ERR_014', mesaj: this.HATA.ERR_014, basvuru: basvuru };
    }

    const simdi = this._simdi();
    const k = this._bosKlan();
    k.id = hedef.id || ('K' + simdi.toString(36).toUpperCase());
    k.ad = String(hedef.ad || 'Klan').slice(0, 20);
    k.etiket = String(hedef.etiket || this._etiketTuret(k.ad)).toUpperCase().slice(0, 4);
    k.amblem = Math.max(0, Math.floor(this._sayi(hedef.amblem, 0)));
    k.renk1 = (typeof hedef.renk1 === 'string' && hedef.renk1.charAt(0) === '#') ? hedef.renk1 : k.renk1;
    k.renk2 = (typeof hedef.renk2 === 'string' && hedef.renk2.charAt(0) === '#') ? hedef.renk2 : k.renk2;
    k.gizlilik = gizlilik;
    k.seviye = seviye;
    k.xp = this._egriKur().kumulatif[seviye];
    k.sinif = (hedef.sinif && this.SINIF[hedef.sinif]) ? hedef.sinif : null;
    k.kurulus = this._sayi(hedef.kurulus, simdi);
    k.ligPuan = this._sayi(hedef.ligPuan, 0);
    k.kurucuId = 'bot-kurucu';
    // Botlar + oyuncu. Oyuncu YENİ katıldığı için 'caylak'.
    if (Array.isArray(hedef.uyeler) && hedef.uyeler.length) {
      for (let i = 0; i < hedef.uyeler.length; i++) {
        const b = hedef.uyeler[i];
        k.uyeler.push(this._uyeYap(String(b.id || ('bot' + i)), String(b.ad || ('Üye ' + (i + 1))),
          this.ROLLER.indexOf(b.rol) >= 0 ? b.rol : (i === 0 ? 'lider' : 'uye'), true,
          this._sayi(b.katilim, k.kurulus)));
        k.uyeler[k.uyeler.length - 1].katki = this._sayi(b.katki, 0);
        k.uyeler[k.uyeler.length - 1].haftalikKatki = this._sayi(b.haftalikKatki, 0);
      }
    } else {
      for (let i = 0; i < mevcut; i++) {
        k.uyeler.push(this._uyeYap('bot' + i, 'Üye ' + (i + 1), i === 0 ? 'lider' : 'uye', true, k.kurulus));
      }
    }
    k.uyeler.push(this._uyeYap('oyuncu', 'Sen', 'caylak', false, simdi));
    k.benimId = 'oyuncu';
    k.haftalikYeni = this._sayi(k.haftalikYeni, 0) + 1;
    this._yaz('klan', k);
    this.duyuru('sistem', 'Klana katıldın: ' + k.ad);
    return this._tamam({ klan: k });
  },

  // §14.2 Senaryo 1 — lider ayrılırsa devir. SAF fonksiyon (test edilebilir).
  _devirHesapla(uyeler, cikanId) {
    const liste = Array.isArray(uyeler) ? uyeler : [];
    let cikan = null;
    for (let i = 0; i < liste.length; i++) if (liste[i].id === cikanId) cikan = liste[i];
    const kalan = liste.filter(function (u) { return u.id !== cikanId; });
    if (!cikan || cikan.rol !== 'lider') {
      return { yeniLiderId: null, dagitma: false, sebep: 'lider-degil', kalan: kalan.length };
    }
    // 1) En ESKİ yardımcı
    let sec = null;
    for (let i = 0; i < kalan.length; i++) {
      if (kalan[i].rol !== 'yardimci') continue;
      if (!sec || kalan[i].katilim < sec.katilim) sec = kalan[i];
    }
    if (sec) return { yeniLiderId: sec.id, dagitma: false, sebep: 'en-eski-yardimci', kalan: kalan.length };
    // 2) En çok KATKI yapan üye
    for (let i = 0; i < kalan.length; i++) {
      if (!sec || kalan[i].katki > sec.katki) sec = kalan[i];
    }
    if (sec) return { yeniLiderId: sec.id, dagitma: false, sebep: 'en-cok-katki', kalan: kalan.length };
    // 3) Hiç üye yok → 48 saat sonra dağılır
    return { yeniLiderId: null, dagitma: true, sebep: 'uye-yok', kalan: 0 };
  },

  ayril() {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    const benId = k.benimId;
    const devir = this._devirHesapla(k.uyeler, benId);
    if (devir.dagitma) k.dagitmaZamani = this._simdi() + this.DAGITMA_MS;
    if (devir.yeniLiderId) {
      for (let i = 0; i < k.uyeler.length; i++) {
        if (k.uyeler[i].id === devir.yeniLiderId) k.uyeler[i].rol = 'lider';
      }
    }
    k.uyeler = k.uyeler.filter(function (u) { return u.id !== benId; });
    k.haftalikAyrilan = this._sayi(k.haftalikAyrilan, 0) + 1;

    const g = this._gunluk();
    g.ayrilmaZamani = this._simdi();
    this._yaz('klanGunluk', g);
    this._yaz('klan', null);
    return this._tamam({ devir: devir });
  },

  // ═══════════════════════════════════════════════════════════════
  //  ROL + YETKİ
  // ═══════════════════════════════════════════════════════════════
  uyeler() { const k = this.al(); return k ? k.uyeler : []; },
  uye(uyeId) {
    const l = this.uyeler();
    for (let i = 0; i < l.length; i++) if (l[i].id === uyeId) return l[i];
    return null;
  },
  yetkiVar(rol, eylem) {
    const y = this.YETKI[rol];
    return !!y && y.indexOf(eylem) >= 0;
  },
  benimYetkim(eylem) { return this.yetkiVar(this.benimRol(), eylem); },

  rolDegistir(uyeId, rol) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    if (this.ROLLER.indexOf(rol) < 0) return this._hata('ERR_018');
    const ben = this._ben();
    if (!ben || !this.yetkiVar(ben.rol, 'rolVer')) return this._hata('ERR_016');
    const hedef = this.uye(uyeId);
    if (!hedef) return this._hata('ERR_011');
    const benS = this.ROL_SIRA[ben.rol], hedefS = this.ROL_SIRA[hedef.rol], yeniS = this.ROL_SIRA[rol];
    // Kendinden üstünü/eşidini değiştiremez, kendinden üstün rol veremez.
    // TÜRETİLDİ (S4): tasarımda kural yoktu; yoksa yardımcı kendini lider yapar.
    if (hedef.id !== ben.id && hedefS >= benS) return this._hata('ERR_016');
    if (yeniS >= benS && ben.rol !== 'lider') return this._hata('ERR_016');
    if (rol === 'lider' && ben.rol !== 'lider') return this._hata('ERR_016');
    if (rol === 'lider') {
      for (let i = 0; i < k.uyeler.length; i++) if (k.uyeler[i].rol === 'lider') k.uyeler[i].rol = 'yardimci';
    }
    hedef.rol = rol;
    this.kaydet();
    this.duyuru('sistem', hedef.ad + ' artık ' + this.ROL_AD[rol] + '.');
    return this._tamam({ uye: hedef });
  },

  uyeAt(uyeId) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    const ben = this._ben();
    if (!ben || !this.yetkiVar(ben.rol, 'uyeAt')) return this._hata('ERR_016');
    const hedef = this.uye(uyeId);
    if (!hedef) return this._hata('ERR_011');
    if (hedef.id === ben.id) return this._hata('ERR_016');
    if (this.ROL_SIRA[hedef.rol] >= this.ROL_SIRA[ben.rol]) return this._hata('ERR_016');
    k.uyeler = k.uyeler.filter(function (u) { return u.id !== uyeId; });
    k.haftalikAyrilan = this._sayi(k.haftalikAyrilan, 0) + 1;
    this.kaydet();
    this.duyuru('sistem', hedef.ad + ' klandan çıkarıldı.');
    return this._tamam();
  },

  uyeEkle(uyeObj) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    if (k.uyeler.length >= this.uyeKapasitesi()) return this._hata('ERR_012');
    const o = uyeObj || {};
    const u = this._uyeYap(String(o.id || ('u' + k.uyeler.length)), String(o.ad || 'Üye'),
      this.ROLLER.indexOf(o.rol) >= 0 ? o.rol : 'caylak', o.bot !== false,
      this._sayi(o.katilim, this._simdi()));
    u.katki = this._sayi(o.katki, 0);
    u.haftalikKatki = this._sayi(o.haftalikKatki, 0);
    k.uyeler.push(u);
    k.haftalikYeni = this._sayi(k.haftalikYeni, 0) + 1;
    this.kaydet();
    return this._tamam({ uye: u });
  },

  // ═══════════════════════════════════════════════════════════════
  //  XP / SEVİYE (§4)
  // ═══════════════════════════════════════════════════════════════
  seviye() {
    const k = this.al();
    if (!k) return 1;
    const s = this._seviyeHesapla(k.xp);
    if (k.seviye !== s) k.seviye = s;
    return s;
  },
  xp() {
    const k = this.al();
    const e = this._egriKur();
    if (!k) return { mevcut: 0, gerekli: e.gerekli[1], oran: 0, toplam: 0, seviye: 1 };
    const sv = this.seviye();
    if (sv >= this.MAKS_SEVIYE) return { mevcut: 0, gerekli: 0, oran: 1, toplam: k.xp, seviye: sv };
    const taban = e.kumulatif[sv];
    const ger = e.gerekli[sv];
    const mev = Math.max(0, this._sayi(k.xp, 0) - taban);
    return { mevcut: mev, gerekli: ger, oran: ger > 0 ? Math.min(1, mev / ger) : 1, toplam: k.xp, seviye: sv };
  },
  // Bir sonraki seviyeye kalan XP (UI kolaylığı)
  seviyeGerekli(sv) {
    const e = this._egriKur();
    const l = Math.max(1, Math.min(this.MAKS_SEVIYE, Math.floor(this._sayi(sv, 1))));
    return e.gerekli[l] || 0;
  },
  seviyeKumulatif(sv) {
    const e = this._egriKur();
    const l = Math.max(1, Math.min(this.MAKS_SEVIYE, Math.floor(this._sayi(sv, 1))));
    return e.kumulatif[l] || 0;
  },

  // Günlük sınırdan geriye ne kaldı
  xpKalan(kaynak) {
    const d = this.XP_KAYNAK[kaynak];
    if (!d) return 0;
    if (!isFinite(d.sinir)) return Infinity;
    const g = this._gunluk();
    return Math.max(0, d.sinir - this._sayi(g.xpKaynak[kaynak], 0));
  },

  xpEkle(kaynak, miktar) {
    const d = this.XP_KAYNAK[kaynak];
    if (!d) return { eklenen: 0, xp: 0, seviye: this.seviye(), seviyeAtladi: false, hata: 'gecersiz-kaynak' };
    const k = this.al();
    if (!k) return { eklenen: 0, xp: 0, seviye: 1, seviyeAtladi: false, hata: 'ERR_015' };
    let m = Math.floor(this._sayi(miktar, 0));       // NaN koruması (bug #9 dersi)
    if (m <= 0) return { eklenen: 0, xp: k.xp, seviye: this.seviye(), seviyeAtladi: false, hata: null };

    const g = this._gunluk();
    const kullanilan = this._sayi(g.xpKaynak[kaynak], 0);
    if (isFinite(d.sinir)) {
      const kalan = Math.max(0, d.sinir - kullanilan);
      if (kalan <= 0) return { eklenen: 0, xp: k.xp, seviye: this.seviye(), seviyeAtladi: false, hata: 'gunluk-sinir' };
      if (m > kalan) m = kalan;
    }
    g.xpKaynak[kaynak] = kullanilan + m;
    this._yaz('klanGunluk', g);

    const oncekiSv = this._seviyeHesapla(k.xp);
    k.xp = this._sayi(k.xp, 0) + m;
    const tavan = this._egriKur().kumulatif[this.MAKS_SEVIYE];
    if (k.xp > tavan) k.xp = tavan;
    const yeniSv = this._seviyeHesapla(k.xp);
    k.seviye = yeniSv;
    this.kaydet();

    if (yeniSv > oncekiSv) {
      for (let s = oncekiSv + 1; s <= yeniSv; s++) {
        this.duyuru('seviye', 'Klan Seviye ' + s + '! ' + this._OZELLIK_AD[s - 1] + ' açıldı.', { seviye: s });
      }
    }
    return { eklenen: m, xp: k.xp, seviye: yeniSv, seviyeAtladi: yeniSv > oncekiSv, hata: null };
  },

  // §4.1 matematiksel modeller — çağıranın hesap yapmasına gerek kalmasın.
  xpYaristan(mesafeMetre) { return this.xpEkle('yaris', Math.floor(this._sayi(mesafeMetre, 0) * 0.01)); },
  xpGalibiyetten(adet) { return this.xpEkle('galibiyet', 10 * Math.max(0, Math.floor(this._sayi(adet, 1)))); },
  xpKupadan(adet) { return this.xpEkle('kupa', 25 * Math.max(0, Math.floor(this._sayi(adet, 1)))); },
  xpGiristen() { return this.xpEkle('giris', 5); },
  xpEtkinlikten(adet) { return this.xpEkle('etkinlik', 15 * Math.max(0, Math.floor(this._sayi(adet, 1)))); },
  xpBasarimdan(adet) { return this.xpEkle('basarim', 50 * Math.max(0, Math.floor(this._sayi(adet, 1)))); },
  xpMagazadan(harcananAltin) { return this.xpEkle('magaza', Math.floor(this._sayi(harcananAltin, 0) / 100) * 2); },
  xpDavetten(adet) { return this.xpEkle('davet', 30 * Math.max(0, Math.floor(this._sayi(adet, 1)))); },

  // ── Seviye faydaları (§4.3) ──
  ozellikAcik(anahtar) {
    const gerek = this.KILIT[anahtar];
    if (gerek === undefined) return false;    // bilinmeyen anahtar → kapalı
    return this.var() && this.seviye() >= gerek;
  },
  ozellikSeviyesi(anahtar) { const g = this.KILIT[anahtar]; return g === undefined ? 0 : g; },
  uyeKapasitesi() { return this._KAPASITE[this.seviye() - 1]; },
  odulCarpani() { return this._CARPAN[this.seviye() - 1]; },
  seviyeOzelligi(sv) {
    const l = Math.max(1, Math.min(this.MAKS_SEVIYE, Math.floor(this._sayi(sv, 1))));
    return this._OZELLIK_AD[l - 1];
  },

  // ═══════════════════════════════════════════════════════════════
  //  KLAN PARASI (KP) — SÖZLEŞME §6
  // ═══════════════════════════════════════════════════════════════
  //  🔴 TEK MERKEZİ DÖNÜŞÜM. Diğer 4 ajan bunu çağırır, kendi formülünü yazmaz.
  //  KP = round(altın / 100 + elmas × 4)
  //  ⚠ Bu fonksiyon ÖDÜL ÇARPANINI UYGULAMAZ (sözleşme §6 tablosu ham değer).
  //    Çarpanlı hâli için `kpOdul()` kullan.
  kpCevir(altin, elmas) {
    const a = Math.max(0, this._sayi(altin, 0));
    const e = Math.max(0, this._sayi(elmas, 0));
    return Math.round(a / this.KP_ALTIN_BOLEN + e * this.KP_ELMAS_CARPAN);
  },
  kpOdul(altin, elmas) { return Math.round(this.kpCevir(altin, elmas) * this.odulCarpani()); },

  kp() { const k = this.al(); return k ? Math.max(0, this._sayi(k.kp, 0)) : 0; },
  kpEkle(miktar, kaynak) {
    const k = this.al();
    if (!k) return 0;
    const m = Math.floor(this._sayi(miktar, 0));      // NaN → 0 (bug #9 dersi)
    if (m <= 0) return this.kp();
    k.kp = Math.max(0, this._sayi(k.kp, 0)) + m;
    k._sonKpKaynak = String(kaynak == null ? 'bilinmiyor' : kaynak);
    this.kaydet();
    return k.kp;
  },
  kpHarca(miktar, sebep) {
    const k = this.al();
    if (!k) return false;
    const m = Math.floor(this._sayi(miktar, 0));
    if (m <= 0) return false;
    const bakiye = Math.max(0, this._sayi(k.kp, 0));
    if (bakiye < m) return false;                     // ⚠ HİÇBİR yan etki yok
    k.kp = bakiye - m;
    k._sonKpSebep = String(sebep == null ? 'bilinmiyor' : sebep);
    this.kaydet();
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  SAĞLIK SKORU (§13.2 — faktörler 0-100'e normalize, bkz. S7)
  // ═══════════════════════════════════════════════════════════════
  _kis(v) { return Math.max(0, Math.min(100, this._sayi(v, 0))); },
  saglikFaktorleri() {
    const k = this.al();
    if (!k || !k.uyeler.length) {
      return { aktifUye: 0, etkinlikKatilim: 0, buyume: 0, katki: 0, savas: 0, uyeSayisi: 0 };
    }
    const n = k.uyeler.length;
    const simdi = this._simdi();
    let aktif = 0, katilan = 0, haftalikToplam = 0;
    for (let i = 0; i < n; i++) {
      const u = k.uyeler[i];
      if (simdi - this._sayi(u.sonAktif, 0) <= this.AKTIF_PENCERE_MS) aktif++;
      if (u.etkinligeKatildi) katilan++;
      haftalikToplam += this._sayi(u.haftalikKatki, 0);
    }
    const buyumeOran = (this._sayi(k.haftalikYeni, 0) - this._sayi(k.haftalikAyrilan, 0)) / n;
    const savasTop = this._sayi(k.savasToplam, 0);
    return {
      aktifUye: this._kis(aktif / n * 100),
      etkinlikKatilim: this._kis(katilan / n * 100),
      // büyüme tasarımda ORAN (ideal 0,05); ideale normalize edilir → 0-100
      buyume: this._kis(buyumeOran / this.IDEAL_BUYUME * 100),
      katki: this._kis((haftalikToplam / n) / this.IDEAL_KATKI * 100),
      // S8: hiç savaş yoksa nötr 50
      savas: savasTop > 0 ? this._kis(this._sayi(k.savasKazanilan, 0) / savasTop * 100) : 50,
      uyeSayisi: n
    };
  },
  saglikSkoru() {
    const k = this.al();
    if (!k || !k.uyeler.length) return 0;
    const f = this.saglikFaktorleri();
    const s = f.aktifUye * 0.25 + f.etkinlikKatilim * 0.25 + f.buyume * 0.15 +
      f.katki * 0.20 + f.savas * 0.15;
    return Math.max(0, Math.min(100, Math.round(s)));
  },
  saglikDurum(skor) {
    const s = (skor == null) ? this.saglikSkoru() : this._kis(skor);
    for (let i = 0; i < this.SAGLIK_KADEME.length; i++) {
      if (s >= this.SAGLIK_KADEME[i].min) {
        const d = this.SAGLIK_KADEME[i];
        return { skor: s, ad: d.ad, renk: d.renk, aksiyon: d.aksiyon };
      }
    }
    const son = this.SAGLIK_KADEME[this.SAGLIK_KADEME.length - 1];
    return { skor: s, ad: son.ad, renk: son.renk, aksiyon: son.aksiyon };
  },

  // ═══════════════════════════════════════════════════════════════
  //  KLAN SINIFI (§30.2)
  // ═══════════════════════════════════════════════════════════════
  sinif() { const k = this.al(); return (k && k.sinif && this.SINIF[k.sinif]) ? k.sinif : null; },
  sinifCarpani(etkinlikTuru) {
    const s = this.sinif();
    if (!s) return 1.00;
    const d = this.SINIF[s];
    return (d && d.tur && d.tur === etkinlikTuru) ? d.carpan : 1.00;
  },
  sinifBonus() { const s = this.sinif(); return s ? this.SINIF[s] : null; },
  sinifDegisimKalan() {
    const k = this.al();
    if (!k || !k.sinif) return 0;
    const kalan = (this._sayi(k.sinifTarih, 0) + this.SINIF_DEGISIM_MS) - this._simdi();
    return kalan > 0 ? kalan : 0;
  },
  sinifSec(sinifId) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    if (!this.SINIF[sinifId]) return this._hata('ERR_018');
    if (!this.ozellikAcik('sinif')) return this._hata('ERR_017');
    const ben = this._ben();
    if (!ben || !this.yetkiVar(ben.rol, 'sinifSec')) return this._hata('ERR_016');
    if (k.sinif && this.sinifDegisimKalan() > 0) return this._hata('ERR_019');
    k.sinif = sinifId;
    k.sinifTarih = this._simdi();
    this.kaydet();
    this.duyuru('sistem', 'Klan sınıfı: ' + this.SINIF[sinifId].ad);
    return this._tamam({ sinif: sinifId });
  },

  // ═══════════════════════════════════════════════════════════════
  //  LORE (§30.1) + AYARLAR
  // ═══════════════════════════════════════════════════════════════
  lore() { const k = this.al(); return k ? String(k.lore || '') : ''; },
  lorAyarla(metin) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    const ben = this._ben();
    if (!ben || !this.yetkiVar(ben.rol, 'lorDuzenle')) return this._hata('ERR_016');
    const m = String(metin == null ? '' : metin).slice(0, this.MAKS_LORE);
    if (this.yasakliMi(m)) return this._hata('ERR_007');
    k.lore = m;
    this.kaydet();
    return this._tamam({ lore: m, uzunluk: m.length });
  },
  gizlilikAyarla(g) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    const ben = this._ben();
    if (!ben || !this.yetkiVar(ben.rol, 'ayarDegistir')) return this._hata('ERR_016');
    if (this.GIZLILIK.indexOf(g) < 0) return this._hata('ERR_018');
    k.gizlilik = g;
    this.kaydet();
    return this._tamam({ gizlilik: g });
  },
  renkAyarla(renk1, renk2) {
    const k = this.al();
    if (!k) return this._hata('ERR_015');
    const ben = this._ben();
    if (!ben || !this.yetkiVar(ben.rol, 'ayarDegistir')) return this._hata('ERR_016');
    // ⚠ HEX ZORUNLU — `_drawCard` accent + '33' diye alfa ekliyor (tuzak #5).
    const re = /^#[0-9a-fA-F]{6}$/;
    if (!re.test(String(renk1))) return this._hata('ERR_018');
    if (renk2 != null && !re.test(String(renk2))) return this._hata('ERR_018');
    k.renk1 = renk1;
    if (renk2 != null) k.renk2 = renk2;
    this.kaydet();
    return this._tamam({ renk1: k.renk1, renk2: k.renk2 });
  },

  // ═══════════════════════════════════════════════════════════════
  //  ROZETLER (§30.3)
  // ═══════════════════════════════════════════════════════════════
  rozetler(uyeId) {
    const k = this.al();
    if (!k) return [];
    const u = this.uye(uyeId == null ? k.benimId : uyeId);
    if (!u) return [];
    const simdi = this._simdi();
    const r = [];
    if (u.id === k.kurucuId) r.push('kurucu');
    if (u.rol === 'lider') r.push('lider');
    const uyelik = simdi - this._sayi(u.katilim, simdi);
    if (uyelik >= this.KIDEM_MS) r.push('kidemli');
    if (this._sayi(u.savasGalibiyeti, 0) >= this.SAVAS_KAHRAMANI_ESIK) r.push('savasKahramani');
    if (this._mvpId() === u.id) r.push('mvp');
    if (uyelik < this.CAYLAK_MS) r.push('caylak');
    return r;
  },
  _mvpId() {
    const k = this.al();
    if (!k || !k.uyeler.length) return null;
    let en = null;
    for (let i = 0; i < k.uyeler.length; i++) {
      const v = this._sayi(k.uyeler[i].haftalikKatki, 0);
      if (v > 0 && (!en || v > this._sayi(en.haftalikKatki, 0))) en = k.uyeler[i];
    }
    return en ? en.id : null;
  },
  rozetBilgi(id) {
    for (let i = 0; i < this.ROZET.length; i++) if (this.ROZET[i].id === id) return this.ROZET[i];
    return null;
  },

  // ═══════════════════════════════════════════════════════════════
  //  DUYURU PANOSU (§7'nin yerine — sözleşme §0: SOHBET YOK)
  // ═══════════════════════════════════════════════════════════════
  //  🔴 Yalnız SİSTEM mesajı. Bot sohbeti YASAK.
  //  ⚠ Liste MAKS_DUYURU (50) ile SINIRLI — `UI._toasts` 159 elemana çıkıp
  //    bellek sızdırmıştı (§29 Tmz perf). Aynı hataya düşme.
  duyuru(tip, metin, veri) {
    const k = this.al();
    if (!k) return null;
    if (!Array.isArray(k.duyurular)) k.duyurular = [];
    const t = this.DUYURU_TIP.indexOf(tip) >= 0 ? tip : 'sistem';
    const d = {
      t: this._simdi(),
      tip: t,
      metin: String(metin == null ? '' : metin).slice(0, this.MAKS_DUYURU_METIN),
      veri: (veri === undefined) ? null : veri
    };
    k.duyurular.push(d);
    if (k.duyurular.length > this.MAKS_DUYURU) {
      k.duyurular.splice(0, k.duyurular.length - this.MAKS_DUYURU);
    }
    this.kaydet();
    return d;
  },
  // En YENİ önce. n verilmezse 50.
  duyurular(n) {
    const k = this.al();
    if (!k || !Array.isArray(k.duyurular)) return [];
    const adet = Math.max(1, Math.min(this.MAKS_DUYURU, Math.floor(this._sayi(n, this.MAKS_DUYURU))));
    return k.duyurular.slice(-adet).reverse();
  },
  duyuruTemizle() { const k = this.al(); if (k) { k.duyurular = []; this.kaydet(); } return true; },

  // ═══════════════════════════════════════════════════════════════
  //  KATKI / AKTİVİTE (diğer modüller çağırır)
  // ═══════════════════════════════════════════════════════════════
  katkiEkle(uyeId, puan) {
    const k = this.al();
    if (!k) return 0;
    const u = this.uye(uyeId == null ? k.benimId : uyeId);
    if (!u) return 0;
    const p = Math.max(0, Math.floor(this._sayi(puan, 0)));
    u.katki = this._sayi(u.katki, 0) + p;
    u.haftalikKatki = this._sayi(u.haftalikKatki, 0) + p;
    u.sonAktif = this._simdi();
    k.haftalikPuan = this._sayi(k.haftalikPuan, 0) + p;
    this.kaydet();
    return u.katki;
  },
  haftalikSifirla() {
    const k = this.al();
    if (!k) return false;
    for (let i = 0; i < k.uyeler.length; i++) {
      k.uyeler[i].haftalikKatki = 0;
      k.uyeler[i].etkinligeKatildi = false;
    }
    k.haftalikPuan = 0; k.haftalikYeni = 0; k.haftalikAyrilan = 0;
    this.kaydet();
    return true;
  },
  savasSonucu(kazandiMi) {
    const k = this.al();
    if (!k) return false;
    k.savasToplam = this._sayi(k.savasToplam, 0) + 1;
    if (kazandiMi) {
      k.savasKazanilan = this._sayi(k.savasKazanilan, 0) + 1;
      const ben = this._ben();
      if (ben) ben.savasGalibiyeti = this._sayi(ben.savasGalibiyeti, 0) + 1;
    }
    this.kaydet();
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  ÖZET (UI için tek çağrı)
  // ═══════════════════════════════════════════════════════════════
  ozet() {
    const k = this.al();
    if (!k) return { var: false };
    const x = this.xp();
    return {
      var: true, id: k.id, ad: k.ad, etiket: k.etiket, amblem: k.amblem,
      renk1: k.renk1, renk2: k.renk2, gizlilik: k.gizlilik,
      seviye: x.seviye, xpMevcut: x.mevcut, xpGerekli: x.gerekli, xpOran: x.oran,
      kp: this.kp(), uyeSayisi: k.uyeler.length, kapasite: this.uyeKapasitesi(),
      odulCarpani: this.odulCarpani(), sinif: this.sinif(),
      saglik: this.saglikDurum(), rolum: this.benimRol(),
      ozellik: this.seviyeOzelligi(x.seviye)
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  SELF TEST — 37 kontrol, hepsi ÖLÇEREK
  //  ⚠ Sanal kipte koşar → gerçek kaydı KİRLETMEZ.
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const eskiSanal = this._sanal, eskiYerel = this._yerel, eskiZaman = this._testZaman;
    const eskiEgri = this._egri;
    // Gerçek kaydın "önce" görüntüsü — testin ona hiç dokunmadığını ÖLÇMEK için.
    const _sdGercek = (typeof SaveData !== 'undefined' && SaveData && SaveData.data) ? SaveData : null;
    const _oncekiKayit = _sdGercek ? JSON.stringify([_sdGercek.data.klan, _sdGercek.data.klanGunluk, _sdGercek.data.gold]) : null;
    this._sanal = true;
    this._yerel = { klan: null, klanGunluk: null, gold: 1000000, playerLevel: 50 };
    this._testZaman = 1754100000000;   // sabit zaman → tekrarlanabilir
    const T0 = this._testZaman;
    const self = this;
    const sifirla = function (altin, sv) {
      self._yerel = { klan: null, klanGunluk: null, gold: altin == null ? 1000000 : altin, playerLevel: sv == null ? 50 : sv };
      self._testZaman = T0;
    };

    try {
      const e = this._egriKur();

      // ── 1-6: SEVİYE EĞRİSİ ──
      r.egriUzunluk = (e.gerekli.length === this.MAKS_SEVIYE + 1) && (e.kumulatif.length === this.MAKS_SEVIYE + 1);
      let monoton = true;
      for (let l = 2; l < this.MAKS_SEVIYE; l++) if (e.gerekli[l] < e.gerekli[l - 1]) monoton = false;
      r.egriMonoton = monoton === true;
      const kum50 = e.kumulatif[this.MAKS_SEVIYE];
      const gun = kum50 / this._GUNLUK_ORT_XP;
      r.egri180Gun = (gun >= 175 && gun <= 185);
      r.egriKumulatif63k = (kum50 >= 60000 && kum50 <= 66000);
      // oran ELLE YAZILMADI, türetildi: ham/(180*350)
      r.egriOranTuretildi = Math.abs(e.oran - e.ham / (this._HEDEF_GUN * this._GUNLUK_ORT_XP)) < 1e-9 && e.oran > 1;
      r.egriHamCokBuyuk = (e.ham > 20000000);   // ham eğri 8-9 yıl = ölçekleme şart
      r.seviyeTavan = (this._seviyeHesapla(kum50 * 10) === 50) && (this._seviyeHesapla(0) === 1) &&
        (this._seviyeHesapla(e.kumulatif[2]) === 2) && (this._seviyeHesapla(e.kumulatif[2] - 1) === 1);

      // ── 7-9: KİLİT SIRASI + FAYDA TABLOLARI ──
      sifirla();
      let kur = this.kur('Test Klani', 'TST', 3, 'acik');
      const kurOk = kur.ok === true;
      let kilitTamam = true, kilitDetay = [];
      const anahtarlar = Object.keys(this.KILIT);
      for (let i = 0; i < anahtarlar.length; i++) {
        const a = anahtarlar[i], gerek = this.KILIT[a];
        this._yerel.klan.xp = e.kumulatif[gerek];
        const acik = this.ozellikAcik(a);
        this._yerel.klan.xp = e.kumulatif[Math.max(1, gerek - 1)];
        const kapali = this.ozellikAcik(a);
        if (!(acik === true && kapali === false)) { kilitTamam = false; kilitDetay.push(a); }
      }
      r.kilitSirasi = kilitTamam === true;
      r.kilitSayisi = (anahtarlar.length === 13);
      let kapMonoton = true, carpMonoton = true;
      for (let i = 1; i < 50; i++) {
        if (this._KAPASITE[i] < this._KAPASITE[i - 1]) kapMonoton = false;
        if (this._CARPAN[i] < this._CARPAN[i - 1]) carpMonoton = false;
      }
      r.kapasiteTablosu = kapMonoton && this._KAPASITE.length === 50 &&
        this._KAPASITE[0] === 20 && this._KAPASITE[19] === 30 && this._KAPASITE[49] === 30;
      r.carpanTablosu = carpMonoton && this._CARPAN.length === 50 &&
        this._CARPAN[0] === 1.00 && this._CARPAN[49] === 2.50;
      r.ozellikAdSayisi = (this._OZELLIK_AD.length === 50);
      // seviye 1 → 20 üye / 1.00x ; seviye 50 → 30 üye / 2.50x
      this._yerel.klan.xp = 0;
      const k1 = this.uyeKapasitesi(), c1 = this.odulCarpani();
      this._yerel.klan.xp = kum50;
      const k50 = this.uyeKapasitesi(), c50 = this.odulCarpani();
      r.faydaUclari = (k1 === 20 && c1 === 1.00 && k50 === 30 && c50 === 2.50);

      // ── 10-11: KP DÖNÜŞÜMÜ (sözleşme §6 — 6 örnek) ──
      const kpOrnek = [[500, 25, 105], [20000, 1000, 4200], [5000, 500, 2050],
      [100000, 5000, 21000], [500000, 10000, 45000], [50000, 2000, 8500]];
      let kpTamam = true, kpFark = [];
      for (let i = 0; i < kpOrnek.length; i++) {
        const g = this.kpCevir(kpOrnek[i][0], kpOrnek[i][1]);
        if (g !== kpOrnek[i][2]) { kpTamam = false; kpFark.push(kpOrnek[i][0] + '/' + kpOrnek[i][1] + '=' + g); }
      }
      r.kpCevir6Ornek = kpTamam === true;
      this._yerel.klan.xp = 0;
      this._yerel.klan.kp = 0;
      this.kpEkle(1000, 'test');
      const kpBas = this.kpHarca(400, 'test') === true && this.kp() === 600;
      const kpYok = this.kpHarca(99999, 'test') === false && this.kp() === 600;   // yan etki YOK
      const kpNaN = this.kpEkle(undefined, 'test') === 600 && this.kpEkle(NaN, 't') === 600;
      r.kpCuzdan = (kpBas && kpYok && kpNaN);

      // ── 12-16: AD / ETİKET / YASAKLI KELİME ──
      r.adGecerli3 = this.adGecerliMi('Türk Şahinleri') && this.adGecerliMi('ABC') && this.adGecerliMi('Klan 2026 Ekibi');
      r.adGecersiz3 = !this.adGecerliMi('AB') && !this.adGecerliMi('Cok Uzun Bir Klan Adi Burada') && !this.adGecerliMi('Klan!!!');
      r.etiketGecerli = this.etiketGecerliMi('TSH') && this.etiketGecerliMi('ABCD') &&
        !this.etiketGecerliMi('AB') && !this.etiketGecerliMi('abcd') && !this.etiketGecerliMi('ABCDE');
      r.yasakliYakalar = (this.yasakliMi('orospu cocuklari') === true) &&
        (this.yasakliMi('s1kt1r') === true) &&          // leet: 1 → i
        (this.yasakliMi('free gold') === true) &&       // boşluk kaçamağı kapalı
        (this.yasakliMi('BOT ordusu') === true) &&      // tam kelime listesi
        (this.yasakliMi('AMcIk') === true);             // büyük/küçük + Türkçe harf
      r.yasakliTemizGecer = !this.yasakliMi('Türk Şahinleri') && !this.yasakliMi('Kapicilar Ligi') &&
        !this.yasakliMi('Robot Ekibi') && !this.yasakliMi('Asla Pes Etme');
      r.yasakliListeBoyu = (this._YASAK_PARCA.length + this._YASAK_TAM.length) >= 50;

      // ── 17-21: KURMA AKIŞI ──
      sifirla(1000000, 4);
      r.kurmaSeviyeYetersiz = this.kur('Test Klani', 'TST', 0, 'acik').hata === 'ERR_001';
      sifirla(4999, 50);
      r.kurmaAltinYetersiz = this.kur('Test Klani', 'TST', 0, 'acik').hata === 'ERR_002' &&
        this._altin() === 4999;    // para GİTMEDİ
      sifirla(1000000, 50);
      r.kurmaYasakli = this.kur('Orospu Ekibi', 'TST', 0, 'acik').hata === 'ERR_007' && this._altin() === 1000000;
      r.kurmaKisaAd = this.kur('AB', 'TST', 0, 'acik').hata === 'ERR_008';
      r.kurmaKotuEtiket = this.kur('Test Klani', 'ab', 0, 'acik').hata === 'ERR_009';
      const kur2 = this.kur('Türk Şahinleri', 'TSH', 7, 'kapali');
      r.kurmaBasarili = kur2.ok === true && this._altin() === 995000 &&
        this.al().ad === 'Türk Şahinleri' && this.al().etiket === 'TSH' &&
        this.al().gizlilik === 'kapali' && this.benimRol() === 'lider' &&
        this.al().uyeler.length === 1 && this.kp() === 210;   // S12: 210 KP kurucu ödülü
      r.kurmaIkinciKez = this.kur('Baska Klan', 'BSK', 0, 'acik').hata === 'ERR_005';

      // ── 22: SOĞUMA (24 saat) ──
      const ayrildi = this.ayril();
      const hemen = this.kur('Yeni Klan', 'YNK', 0, 'acik');
      this._testZaman = T0 + this.SOGUMA_MS - 1000;
      const birazSonra = this.kur('Yeni Klan', 'YNK', 0, 'acik');
      this._testZaman = T0 + this.SOGUMA_MS + 1;
      const sonra = this.kur('Yeni Klan', 'YNK', 0, 'acik');
      r.sogumaSuresi = ayrildi.ok === true && hemen.hata === 'ERR_006' &&
        birazSonra.hata === 'ERR_006' && sonra.ok === true;
      const katilDenemesi = (function () {
        self._yerel.klan = null;
        self._testZaman = T0 + self.SOGUMA_MS + 1;
        const g = self._gunluk(); g.ayrilmaZamani = self._testZaman; self._yaz('klanGunluk', g);
        return self.katil({ id: 'X', ad: 'Bot Klan', etiket: 'BOT', gizlilik: 'acik', seviye: 5, uyeSayisi: 3 }).hata;
      })();
      r.sogumaKatilmayiDaKeser = (katilDenemesi === 'ERR_006');

      // ── 23-26: KATILMA ──
      sifirla();
      const acikK = this.katil({ id: 'B1', ad: 'Acik Klan', etiket: 'ACK', gizlilik: 'acik', seviye: 5, uyeSayisi: 3 });
      r.katilAcik = acikK.ok === true && this.al().uyeler.length === 4 && this.benimRol() === 'caylak';
      sifirla();
      const kapaliK = this.katil({ id: 'B2', ad: 'Kapali Klan', etiket: 'KPL', gizlilik: 'kapali', seviye: 5, uyeSayisi: 3 });
      r.katilKapaliBasvuru = kapaliK.ok === false && kapaliK.hata === 'ERR_014' && !this.var();
      sifirla();
      const gizliK = this.katil({ id: 'B3', ad: 'Gizli Klan', etiket: 'GZL', gizlilik: 'gizli', seviye: 5, uyeSayisi: 3 });
      const gizliDavetli = this.katil({ id: 'B3', ad: 'Gizli Klan', etiket: 'GZL', gizlilik: 'gizli', seviye: 5, uyeSayisi: 3 }, true);
      r.katilGizli = gizliK.hata === 'ERR_013' && gizliDavetli.ok === true;
      sifirla();
      const doluK = this.katil({ id: 'B4', ad: 'Dolu Klan', etiket: 'DOL', gizlilik: 'acik', seviye: 1, uyeSayisi: 20 });
      r.katilDolu = doluK.hata === 'ERR_012';

      // ── 27: LİDER DEVRİ — 3 SENARYO (§14.2 Senaryo 1) ──
      const U = function (id, rol, katilim, katki) { return { id: id, rol: rol, katilim: katilim, katki: katki }; };
      const s1 = this._devirHesapla([U('L', 'lider', 100, 0), U('Y1', 'yardimci', 500, 10), U('Y2', 'yardimci', 300, 90), U('M', 'uye', 200, 999)], 'L');
      const s2 = this._devirHesapla([U('L', 'lider', 100, 0), U('M1', 'uye', 200, 50), U('M2', 'uye', 300, 500)], 'L');
      const s3 = this._devirHesapla([U('L', 'lider', 100, 0)], 'L');
      const s4 = this._devirHesapla([U('L', 'lider', 100, 0), U('M', 'uye', 200, 5)], 'M');
      r.devirSenaryo3 = (s1.yeniLiderId === 'Y2' && s1.sebep === 'en-eski-yardimci') &&
        (s2.yeniLiderId === 'M2' && s2.sebep === 'en-cok-katki') &&
        (s3.dagitma === true && s3.sebep === 'uye-yok') &&
        (s4.sebep === 'lider-degil' && s4.dagitma === false);
      // canlı ayrılma da devri uyguluyor mu
      sifirla();
      this.kur('Devir Testi', 'DVR', 0, 'acik');
      this.uyeEkle({ id: 'y1', ad: 'Yardimci', rol: 'yardimci', katilim: T0 - 5000 });
      const canliDevir = this.ayril();
      r.devirCanli = canliDevir.ok === true && canliDevir.devir.yeniLiderId === 'y1' && !this.var();

      // ── 28-29: YETKİ MATRİSİ ──
      r.yetkiMatrisi = this.yetkiVar('lider', 'klanDagit') && !this.yetkiVar('yardimci', 'klanDagit') &&
        !this.yetkiVar('yardimci', 'sinifSec') && this.yetkiVar('yardimci', 'uyeAt') &&
        this.yetkiVar('subay', 'davetEt') && !this.yetkiVar('subay', 'uyeAt') &&
        this.yetkiVar('uye', 'davetEt') && !this.yetkiVar('uye', 'duyuruYaz') &&
        this.YETKI.caylak.length === 0 &&
        this.YETKI.lider.length === this.EYLEMLER.length;
      // kümülatif hiyerarşi: her rol bir alttakinin tüm yetkilerini kapsar
      let kumulatifOk = true;
      for (let i = 0; i < this.ROLLER.length - 1; i++) {
        const ust = this.YETKI[this.ROLLER[i]], alt = this.YETKI[this.ROLLER[i + 1]];
        for (let j = 0; j < alt.length; j++) if (ust.indexOf(alt[j]) < 0) kumulatifOk = false;
      }
      r.yetkiHiyerarsi = kumulatifOk === true;
      sifirla();
      this.kur('Rol Testi', 'ROL', 0, 'acik');
      this.uyeEkle({ id: 'a', ad: 'A', rol: 'uye' });
      const yukselt = this.rolDegistir('a', 'yardimci');
      const digerLider = (function () {
        // yardımcı kendini lider yapamaz
        const k = self.al();
        k.benimId = 'a';
        const s = self.rolDegistir('a', 'lider');
        k.benimId = 'oyuncu';
        return s.hata;
      })();
      r.rolDegistirKorumasi = yukselt.ok === true && digerLider === 'ERR_016';

      // ── 30-33: XP SİSTEMİ ──
      sifirla();
      this.kur('XP Testi', 'XPT', 0, 'acik');
      this._yerel.klan.xp = 0;
      const y1 = this.xpEkle('yaris', 400);
      const y2 = this.xpEkle('yaris', 400);      // tavan 500 → yalnız 100 girer
      const y3 = this.xpEkle('yaris', 50);       // 0 girer
      r.xpGunlukSinir = (y1.eklenen === 400 && y2.eklenen === 100 && y3.eklenen === 0 &&
        this._gunluk().xpKaynak.yaris === 500);
      // S5: TEK 500 TAVANI YOK — başka kaynaklar hâlâ XP verir
      const g1 = this.xpEkle('galibiyet', 100);
      const kp1 = this.xpEkle('kupa', 200);
      r.xpTekTavanYok = (g1.eklenen === 100 && kp1.eklenen === 200 && this.al().xp === 800);
      const b1 = this.xpEkle('basarim', 5000);
      const b2 = this.xpEkle('basarim', 5000);
      r.xpBasarimSinirsiz = (b1.eklenen === 5000 && b2.eklenen === 5000);
      // teorik günlük maksimum = 1.065 (§4.1) — sınırların toplamı
      let toplamSinir = 0;
      for (const kk in this.XP_KAYNAK) if (isFinite(this.XP_KAYNAK[kk].sinir)) toplamSinir += this.XP_KAYNAK[kk].sinir;
      r.xpTeorikMaks1065 = (toplamSinir === 1065) && (this._GUNLUK_ORT_XP < toplamSinir);
      // gün dönünce sıfırlanır
      this._testZaman = T0 + 26 * 60 * 60 * 1000;
      const y4 = this.xpEkle('yaris', 300);
      r.xpGunDonusu = (y4.eklenen === 300 && this._gunluk().xpKaynak.yaris === 300);
      this._testZaman = T0;
      r.xpGecersizKaynak = (this.xpEkle('bilinmeyen', 100).eklenen === 0);
      // seviye atlama + xp() oranı
      sifirla();
      this.kur('Seviye Testi', 'SVT', 0, 'acik');
      this._yerel.klan.xp = 0; this._yerel.klan.seviye = 1;
      const atla = this.xpEkle('basarim', e.kumulatif[10]);
      const x = this.xp();
      r.xpSeviyeAtlama = (atla.seviyeAtladi === true && atla.seviye === 10 &&
        x.mevcut === 0 && x.gerekli === e.gerekli[10] && x.oran === 0);
      this._yerel.klan.xp = e.kumulatif[10] + Math.floor(e.gerekli[10] / 2);
      const x2 = this.xp();
      r.xpOranYarim = (x2.oran > 0.45 && x2.oran < 0.55 && x2.seviye === 10);

      // ── 34-35: DUYURU PANOSU ──
      sifirla();
      this.kur('Duyuru Testi', 'DYR', 0, 'acik');
      this.duyuruTemizle();
      for (let i = 0; i < 80; i++) this.duyuru('sistem', 'mesaj ' + i);
      const dl = this.al().duyurular;
      r.duyuruSinir50 = (dl.length === this.MAKS_DUYURU && dl[dl.length - 1].metin === 'mesaj 79' &&
        dl[0].metin === 'mesaj 30');
      const son = this.duyurular(5);
      r.duyuruSirasi = (son.length === 5 && son[0].metin === 'mesaj 79' && son[4].metin === 'mesaj 75');
      const kotuTip = this.duyuru('sohbet', 'yasak');
      r.duyuruTipDogrulama = (kotuTip.tip === 'sistem' && this.DUYURU_TIP.length === 8 &&
        this.DUYURU_TIP.indexOf('sohbet') < 0);
      const uzun = this.duyuru('sistem', new Array(400).join('x'));
      r.duyuruMetinKirpma = (uzun.metin.length === this.MAKS_DUYURU_METIN);

      // ── 36-38: SINIF ──
      sifirla();
      this.kur('Sinif Testi', 'SNF', 0, 'acik');
      this._yerel.klan.xp = 0;
      const erken = this.sinifSec('yarisci');
      this._yerel.klan.xp = e.kumulatif[this.KILIT.sinif];
      const sec = this.sinifSec('yarisci');
      const hemenDegis = this.sinifSec('akrobat');
      this._testZaman = T0 + this.SINIF_DEGISIM_MS + 1;
      const gecDegis = this.sinifSec('akrobat');
      this._testZaman = T0;
      r.sinifKilidi = (erken.hata === 'ERR_017' && sec.ok === true &&
        hemenDegis.hata === 'ERR_019' && gecDegis.ok === true);
      const carp = [];
      const siniflar = ['yarisci', 'akrobat', 'hazineavcisi', 'savaslord', 'diplomat', 'muhendis'];
      const turler = ['mesafe', 'takla', 'coin', 'savas', 'ittifak', 'magaza'];
      for (let i = 0; i < siniflar.length; i++) {
        this._yerel.klan.sinif = siniflar[i];
        carp.push(this.sinifCarpani(turler[i]));
      }
      r.sinifCarpanlari = (carp[0] === 1.10 && carp[1] === 1.15 && carp[2] === 1.15 &&
        carp[3] === 1.10 && carp[4] === 1.00 && carp[5] === 1.00);
      this._yerel.klan.sinif = 'yarisci';
      r.sinifYanlisTur = (this.sinifCarpani('takla') === 1.00 && this.sinifCarpani('mesafe') === 1.10);
      this._yerel.klan.sinif = 'muhendis';
      r.sinifBonusVerisi = (this.sinifBonus().magazaIndirim === 0.05 && this.sinifBonus().tamirKisalma === 0.20 &&
        Object.keys(this.SINIF).length === 6);

      // ── 39-41: SAĞLIK SKORU ──
      sifirla();
      this.kur('Saglik Testi', 'SGL', 0, 'acik');
      const kk = this.al();
      // kötü klan: kimse aktif değil, katkı 0, büyüme 0, savaş kayıp
      for (let i = 0; i < 5; i++) this.uyeEkle({ id: 'u' + i, ad: 'U' + i, rol: 'uye', katilim: T0 - 1000 });
      for (let i = 0; i < kk.uyeler.length; i++) { kk.uyeler[i].sonAktif = T0 - 30 * 86400000; kk.uyeler[i].haftalikKatki = 0; }
      kk.haftalikYeni = 0; kk.haftalikAyrilan = 0; kk.savasToplam = 10; kk.savasKazanilan = 0;
      const kotuSkor = this.saglikSkoru();
      // mükemmel klan
      for (let i = 0; i < kk.uyeler.length; i++) { kk.uyeler[i].sonAktif = T0; kk.uyeler[i].haftalikKatki = 8000; kk.uyeler[i].etkinligeKatildi = true; }
      kk.haftalikYeni = 3; kk.haftalikAyrilan = 0; kk.savasToplam = 10; kk.savasKazanilan = 10;
      const iyiSkor = this.saglikSkoru();
      r.saglikSinirlari = (kotuSkor >= 0 && kotuSkor <= 100 && iyiSkor >= 0 && iyiSkor <= 100 &&
        kotuSkor === 0 && iyiSkor === 100);
      const f = this.saglikFaktorleri();
      let fOk = true;
      for (const fk in f) if (fk !== 'uyeSayisi' && (f[fk] < 0 || f[fk] > 100)) fOk = false;
      r.saglikFaktorNormalize = fOk === true;
      let kademeOk = (this.SAGLIK_KADEME.length === 5);
      const bekle = [[100, 'Mükemmel'], [80, 'Mükemmel'], [79, 'İyi'], [60, 'İyi'], [59, 'Orta'],
      [40, 'Orta'], [39, 'Zayıf'], [20, 'Zayıf'], [19, 'Kritik'], [0, 'Kritik']];
      for (let i = 0; i < bekle.length; i++) {
        const d = this.saglikDurum(bekle[i][0]);
        if (d.ad !== bekle[i][1] || !/^#[0-9a-f]{6}$/i.test(d.renk)) kademeOk = false;
      }
      r.saglikKademe5 = kademeOk === true;

      // ── 42-43: LORE + ROZETLER ──
      sifirla();
      this.kur('Lore Testi', 'LOR', 0, 'acik');
      const uzunLore = this.lorAyarla(new Array(900).join('a'));
      const yasakLore = this.lorAyarla('bizim klan orospu cocuklarindan olusur');
      r.loreSiniri = (uzunLore.ok === true && uzunLore.uzunluk === this.MAKS_LORE &&
        this.lore().length === this.MAKS_LORE && yasakLore.hata === 'ERR_007' &&
        this.lore().length === this.MAKS_LORE);
      const roz = this.rozetler('oyuncu');
      this.uyeEkle({ id: 'esk', ad: 'Eski', rol: 'uye', katilim: T0 - 400 * 86400000, haftalikKatki: 99999 });
      const kk2 = this.al();
      kk2.uyeler[1].savasGalibiyeti = 12;
      const roz2 = this.rozetler('esk');
      r.rozetHiyerarsi = (roz.indexOf('kurucu') >= 0 && roz.indexOf('lider') >= 0 && roz.indexOf('caylak') >= 0 &&
        roz2.indexOf('kidemli') >= 0 && roz2.indexOf('savasKahramani') >= 0 && roz2.indexOf('mvp') >= 0 &&
        roz2.indexOf('caylak') < 0 && this.ROZET.length === 6);

      // ── 44: ESKİ VERİ AKTARIMI ──
      sifirla();
      const sahteEski = { name: 'Eski Kurtlar', members: ['me', 'ali', 'veli'], score: 320 };
      const gercekClan = (typeof Clan !== 'undefined') ? Clan : null;
      let aktarOk = false;
      try {
        const yedek = gercekClan ? gercekClan.current : null;
        if (gercekClan) gercekClan.current = function () { return sahteEski; };
        this._yerel.klan = null;
        aktarOk = this.eskidenAktar();
        if (gercekClan) gercekClan.current = yedek;
      } catch (ex) { aktarOk = false; }
      r.eskidenAktar = gercekClan
        ? (aktarOk === true && this.al().ad === 'Eski Kurtlar' && this.al().uyeler.length === 3 &&
          this.al().ligPuan === 320 && this.benimRol() === 'lider')
        : true;   // social.js yoksa (izole test) kontrol atlanır

      // ── 45: ÖZET + API BÜTÜNLÜĞÜ ──
      sifirla();
      this.kur('Ozet Testi', 'OZT', 0, 'acik');
      const oz = this.ozet();
      r.ozetButun = (oz.var === true && oz.ad === 'Ozet Testi' && oz.seviye >= 1 &&
        typeof oz.kp === 'number' && typeof oz.saglik.renk === 'string' && oz.rolum === 'lider');
      const api = ['var', 'al', 'kur', 'katil', 'ayril', 'xpEkle', 'seviye', 'xp', 'ozellikAcik',
        'uyeKapasitesi', 'odulCarpani', 'kp', 'kpEkle', 'kpHarca', 'kpCevir', 'uyeler',
        'rolDegistir', 'yetkiVar', 'saglikSkoru', 'sinif', 'sinifCarpani', 'duyuru',
        'duyurular', 'durum', 'kaydet', 'eskidenAktar', 'hazir', 'selfTest'];
      let apiOk = true, eksik = [];
      for (let i = 0; i < api.length; i++) if (typeof this[api[i]] !== 'function') { apiOk = false; eksik.push(api[i]); }
      r.sozlesmeApi = apiOk === true;

      // ── 46: GERÇEK KAYIT KİRLENMEDİ Mİ (bayt bayt kıyas, ad listesiyle DEĞİL) ──
      r.gercekKayitTemiz = _sdGercek
        ? (JSON.stringify([_sdGercek.data.klan, _sdGercek.data.klanGunluk, _sdGercek.data.gold]) === _oncekiKayit)
        : true;

    } catch (ex) {
      r.istisna = false;
      r._hataMesaji = String(ex && ex.message ? ex.message : ex);
    } finally {
      this._sanal = eskiSanal;
      this._yerel = eskiYerel;
      this._testZaman = eskiZaman;
      this._egri = eskiEgri;
    }

    r.allPass = Object.keys(r).every(function (k) {
      return k === 'allPass' || k.charAt(0) === '_' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') window.Klan = Klan;
