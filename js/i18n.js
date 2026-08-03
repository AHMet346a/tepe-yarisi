'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// i18n — ÇOK DİLLİ çizim katmanı çevirisi (28 Tmz: 2 dil → 10 dil altyapısı).
//
// NASIL ÇALIŞIR
//   Oyunun tüm arayüzü canvas'a `ctx.fillText(...)` ile İngilizce yazılıyor.
//   Bu modül `CanvasRenderingContext2D.prototype.fillText/strokeText`'i sarmalayıp
//   yazılan metni seçili dile çevirir. Böylece 77 modülün hiçbirine dokunmadan
//   tüm oyun çevrilir. Sonuçlar cache'lenir → kare başına maliyet ~0.
//
// 🔴 KRİTİK: TEK GEÇİŞLİ ÇEVİRİ (28 Tmz'de düzeltildi)
//   Eski sürüm sözlükte döngüyle `split().join()` yapıyordu. Bu, ÇEVRİLMİŞ metni
//   sonraki terimlere karşı YENİDEN tarıyordu → çeviri çıktısı içinde İngilizce bir
//   anahtar geçerse ikinci kez çevriliyor ve metin sessizce bozuluyordu.
//   Örn: FUEL→"BENZIN" olsaydı ve sonra "BEN" diye bir anahtar gelseydi, "BENZIN"
//   tekrar parçalanırdı. Artık TÜM anahtarlar tek bir regex'te birleştirilip
//   `replace` ile TEK GEÇİŞTE değiştiriliyor → çıktı asla yeniden taranmaz.
//
// 🔴 KELİME SINIRI (\b)
//   Anahtarlar `\b(?:...)\b` ile sarılır. Böylece 'GOLD' → 'GOLDEN' içinde,
//   'DAY' → 'DAILY' içinde eşleşmez. Kısaltma anahtarları (SUSP, SURV) için
//   uzun biçimleri de (SUSPENSION, SURVIVAL) ayrıca sözlüğe eklendi.
//
// 🔴 EN UZUN ÖNCE
//   Regex alternasyonu soldan ilk eşleşeni alır; anahtarlar uzunluğa göre
//   sıralanır ki 'GEARBOX' 'GEAR'dan önce denensin.
//
// DİL EKLEME
//   DICT'e yeni bir dil kodu ekle + LANGS'te o dilin `ready` alanını true yap.
//   Doğrulama: `node port-araclari\dogrula-dil.js` (eksik/fazla anahtar, çakışma,
//   boş çeviri, geri-tarama riski ve alfabe kontrolü yapar).
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {

  // ── Desteklenen diller ────────────────────────────────────────────────────
  // ready:false olanlar ayarlar menüsünde SOLUK ve "YAKINDA" etiketiyle görünür,
  // seçilemez. Çevirisi eklenince ready:true yapılır, menüde kendiliğinden açılır.
  var LANGS = [
    { code: 'en', native: 'English',    ready: true  },  // temel dil — çeviri yok
    { code: 'tr', native: 'Türkçe',     ready: true  },
    { code: 'de', native: 'Deutsch',    ready: true  },
    { code: 'es', native: 'Español',    ready: false },
    { code: 'fr', native: 'Français',   ready: false },
    { code: 'it', native: 'Italiano',   ready: false },
    { code: 'pt', native: 'Português',  ready: false },
    { code: 'pl', native: 'Polski',     ready: false },
    { code: 'nl', native: 'Nederlands', ready: false },
    { code: 'ru', native: 'Русский',    ready: false }
  ];

  // ── Sözlükler ─────────────────────────────────────────────────────────────
  // Anahtar = oyunun canvas'a yazdığı İNGİLİZCE metin (büyük/küçük harf duyarlı).
  // 'en' sözlüğü YOKTUR — temel dil, hiç dokunulmaz.
  var DICT = {};

  DICT.tr = {
    // Başlıklar / ekranlar
    'SELECT VEHICLE': 'ARAÇ SEÇ', 'SELECT MAP': 'HARİTA SEÇ',
    'DAILY MISSIONS': 'GÜNLÜK GÖREVLER', 'DAILY REWARD': 'GÜNLÜK ÖDÜL',
    'SEASON LEAGUE': 'SEZON LİGİ', 'FREE BONUS': 'ÜCRETSİZ BONUS',
    'STATISTICS': 'İSTATİSTİKLER', 'ACHIEVEMENTS': 'BAŞARIMLAR',
    'CUSTOMIZE': 'ÖZELLEŞTİR', 'ENVIRONMENT': 'ORTAM', 'SETTINGS': 'AYARLAR',
    'REWARDS': 'ÖDÜLLER', 'MARKET': 'PAZAR', 'BADGES': 'ROZETLER',
    // Ana menü / navigasyon
    'TAP TO CHANGE VEHICLE': 'DEĞİŞTİRMEK İÇİN DOKUN',
    'SELECT THIS VEHICLE': 'BU ARACI SEÇ', 'GO TO MAP': 'HARİTAYA GİT',
    'PLAY AGAIN': 'TEKRAR OYNA',
    'GARAGE': 'GARAJ', 'MAPS': 'HARİTALAR', 'CUPS': 'KUPALAR',
    'CHESTS': 'SANDIKLAR', 'SHOP': 'MAĞAZA', 'RANKINGS': 'SIRALAMA',
    'RANK': 'SIRA', 'PLAY': 'OYNA', 'BUY': 'SATIN AL',
    // Araç istatistikleri
    'ENGINE': 'MOTOR', 'SUSPENSION': 'SÜSPANSİYON', 'SUSP': 'SÜSP',
    'TIRE': 'LASTİK', 'FUEL': 'YAKIT',
    // Mod seçici
    'TIME TRIAL': 'ZAMAN YARIŞI', 'BOT RACE': 'BOT YARIŞI',
    'RACE': 'YARIŞ', 'GHOST': 'HAYALET', 'SURVIVAL': 'HAYATTA KALMA',
    'SURV': 'HAYATTA', 'TIME': 'SÜRE',
    // Özelleştirme
    'PRIMARY COLOR': 'ANA RENK', 'SECONDARY COLOR': 'İKİNCİL RENK',
    'RESET COLORS': 'RENKLERİ SIFIRLA', 'TIRES': 'LASTİKLER',
    'surface grip': 'yüzey tutuşu',
    // Ayarlar
    'SOUND EFFECTS': 'SES EFEKTLERİ', 'SCREEN SHAKE': 'EKRAN SARSINTISI',
    'ON-SCREEN CONTROLS': 'EKRAN KONTROLLERİ', 'SLOW MOTION': 'AĞIR ÇEKİM',
    'DELETE ALL DATA': 'TÜM VERİYİ SİL', 'CLOUD SYNC': 'BULUT YEDEK',
    'MUSIC': 'MÜZİK', 'VIBRATION': 'TİTREŞİM', 'VOLUME': 'SES SEVİYESİ',
    'GRAPHICS': 'GRAFİK', 'CAMERA': 'KAMERA', 'TUTORIAL': 'REHBER',
    'LANGUAGE': 'DİL', 'STATS': 'İSTATİSTİK', 'ENGLISH': 'İNGİLİZCE',
    // Ortam
    'DAY / NIGHT': 'GÜNDÜZ / GECE', 'NATURAL DISASTERS': 'DOĞAL AFETLER',
    'DAMAGE / DEFORMATION': 'HASAR / DEFORMASYON', 'ENDLESS MODE': 'SONSUZ MOD',
    'OBSTACLES': 'ENGELLER', 'WEATHER': 'HAVA DURUMU',
    'NIGHT': 'GECE', 'CLEAR': 'AÇIK', 'RAIN': 'YAĞMUR', 'SNOW': 'KAR',
    'FOG': 'SİS', 'WIND': 'RÜZGAR', 'AUTO': 'OTO', 'DAY': 'GÜNDÜZ',
    // Ödüller / lig
    'SEASON': 'SEZON', 'BRONZE': 'BRONZ', 'SILVER': 'GÜMÜŞ',
    'GOLD': 'ALTIN', 'PLATINUM': 'PLATİN', 'DIAMOND': 'ELMAS', 'MASTER': 'USTA',
    // Genel
    'LOADING': 'YÜKLENİYOR', 'BEGINNER': 'ACEMİ', 'LEGEND': 'EFSANE',
    'FIND MATCH': 'RAKİP BUL', 'MATCH': 'MAÇ', 'CLAIM': 'TOPLA',
    'NEW RECORD': 'YENİ REKOR', 'DISTANCE': 'MESAFE', 'COINS': 'ALTIN',
    'FLIPS': 'TAKLA',
    // Ek ekranlar
    'SEASON PASS': 'SEZON PASI', 'MULTIPLAYER': 'ÇOK OYUNCULU',
    'RANK & RECORDS': 'SIRALAMA & REKORLAR', 'RECORDS': 'REKORLAR',
    'TEAM': 'TAKIM', 'COMING SOON': 'YAKINDA',
    // Alt navigasyon (3 Ağu) — 8 sekme. 'EVENTS' zaten yukarıda tanımlı.
    'CLAN': 'KLAN',
    // Durum / buton
    'CLAIMED': 'ALINDI', 'COMPLETED': 'TAMAMLANDI', 'EQUIPPED': 'TAKILI',
    'UNLOCKED': 'AÇILDI', 'LOCKED': 'KİLİTLİ', 'CONTINUE': 'DEVAM ET',
    'PREMIUM': 'PREMİUM', 'TIER': 'KADEME', 'LEVEL': 'SEVİYE',
    'UPGRADE': 'YÜKSELT', 'CREATE': 'OLUŞTUR', 'LEAVE': 'AYRIL',
    'FRIENDS': 'ARKADAŞLAR', 'WEEKLY': 'HAFTALIK', 'DAILY': 'GÜNLÜK',
    'DEFAULT': 'VARSAYILAN', 'PROGRESS': 'İLERLEME', 'REWARD': 'ÖDÜL',
    'LOSSES': 'MAĞLUBİYET', 'WINS': 'GALİBİYET', 'TOTAL': 'TOPLAM',
    'SCORE': 'SKOR', 'BEST': 'EN İYİ', 'OWNED': 'SAHİP', 'NONE': 'YOK',
    'JOIN': 'KATIL', 'START': 'BAŞLA', 'SELECT': 'SEÇ', 'RESET': 'SIFIRLA',
    'CLOSE': 'KAPAT', 'BACK': 'GERİ', 'MAX': 'MAKS',
    'WATCH AD': 'REKLAM İZLE', 'MASTERY': 'USTALIK', 'HANDLING': 'YÖNETİM',
    'SPEED': 'HIZ', 'POWER': 'GÜÇ', 'GRIP': 'TUTUŞ', 'FREE': 'ÜCRETSİZ',
    'READY': 'HAZIR', 'RESUME': 'DEVAM', 'CANCEL': 'İPTAL',
    'CONFIRM': 'ONAYLA', 'DELETE': 'SİL', 'DIAMONDS': 'ELMASLAR',
    'DOUBLE': 'İKİ KAT', 'VICTORY': 'ZAFER', 'DEFEAT': 'YENİLGİ',
    'WINNER': 'KAZANAN', 'TODAY': 'BUGÜN', 'SPIN': 'ÇEVİR',
    // Ek menüler
    'GAME OVER': 'OYUN BİTTİ', 'LEVEL UP': 'SEVİYE ATLA',
    'WORLD RECORD': 'DÜNYA REKORU', 'PERSONAL BEST': 'KİŞİSEL REKOR',
    'LEADERBOARD': 'LİDER TABLOSU', 'INVENTORY': 'ENVANTER',
    'PROFILE': 'PROFİL', 'MISSIONS': 'GÖREVLER', 'MISSION': 'GÖREV',
    'CHALLENGES': 'MEYDAN OKUMALAR', 'CHALLENGE': 'MEYDAN OKUMA',
    'EVENTS': 'ETKİNLİKLER', 'EVENT': 'ETKİNLİK',
    'SPECIAL OFFER': 'ÖZEL TEKLİF', 'OFFERS': 'TEKLİFLER',
    'BUNDLE': 'PAKET', 'NOTIFICATIONS': 'BİLDİRİMLER',
    // Para birimi / ödül
    'GEMS': 'MÜCEVHER', 'TROPHY': 'KUPA', 'CHAMPION': 'ŞAMPİYON',
    'GIFT': 'HEDİYE', 'CHEST': 'SANDIK', 'CRATE': 'KASA',
    'COLLECT': 'TOPLA', 'REDEEM': 'KULLAN',
    // Araç / parça
    'VEHICLES': 'ARAÇLAR', 'VEHICLE': 'ARAÇ', 'BODY': 'GÖVDE',
    'WHEELS': 'TEKERLEKLER', 'WHEEL': 'TEKERLEK',
    'BRAKES': 'FRENLER', 'BRAKE': 'FREN', 'NITRO': 'NİTRO',
    'BOOST': 'TURBO', 'GEARBOX': 'VİTES KUTUSU', 'GEARS': 'VİTESLER',
    'GEAR': 'VİTES', 'DOWNFORCE': 'BASKI KUVVETİ', 'ROOF': 'TAVAN',
    'PARTS': 'PARÇALAR', 'PART': 'PARÇA', 'UPGRADES': 'YÜKSELTMELER',
    'ACCELERATION': 'HIZLANMA', 'TOP SPEED': 'MAKS HIZ',
    'STABILITY': 'DENGE', 'TRACTION': 'ÇEKİŞ',
    // Haritalar
    'COUNTRYSIDE': 'KIRSAL', 'DESERT': 'ÇÖL', 'MOUNTAINS': 'DAĞLAR',
    'MOUNTAIN': 'DAĞ', 'FOREST': 'ORMAN', 'HIGHWAY': 'OTOYOL',
    'ARCTIC': 'KUTUP', 'CANYON': 'KANYON', 'VOLCANO': 'YANARDAĞ',
    'BEACH': 'PLAJ', 'CAVE': 'MAĞARA', 'BRIDGE': 'KÖPRÜ', 'MOON': 'AY',
    // Eksik kalan haritalar (28 Tmz — canlı ekran taramasında bulundu).
    // ⚠ Bunlar TABAN sözlükte, yani GÖMÜLÜ de eşleşirler; harita adı başka
    //   bir cümlenin içinde geçtiğinde ("… · Countryside · Hedef 1200 m")
    //   çevrilebilsin diye. i18n-src-en.js'teki kayıtlar YALNIZ TAM eşleşir.
    'NEON CITY': 'NEON ŞEHİR', 'WINTER': 'KIŞ', 'CITY': 'ŞEHİR',
    'JUNGLE': 'ORMAN', 'SWAMP': 'BATAKLIK', 'HIGHLAND': 'YAYLA',
    'UNDERWATER': 'SU ALTI', 'WASTELAND': 'ÇORAK',
    'Neon City': 'Neon Şehir', 'Countryside': 'Kırsal', 'Desert': 'Çöl',
    'Winter': 'Kış', 'Beach': 'Plaj', 'Mountains': 'Dağlar',
    'Arctic': 'Kutup', 'Jungle': 'Orman', 'Highland': 'Yayla',
    'Swamp': 'Bataklık', 'Volcano': 'Yanardağ', 'Canyon': 'Kanyon',
    'Wasteland': 'Çorak', 'Underwater': 'Su Altı',
    // Gömülü kullanılan kısa arayüz parçaları (sayı/emoji yanında geçerler →
    // tam eşleşme YETMEZ, taban sözlükte olmaları ŞART).
    ' members': ' üye', ' score': ' puan',
    'Watch & earn': 'İzle ve kazan',
    'locked': 'kilitli', 'premium': 'premium',
    'FLASH DEAL': 'ŞİMŞEK FIRSAT', 'MUSCLE CAR': 'KAS ARABA',
    'Aero / Downforce': 'Aero / Bastırma',
    'Hover Car': 'Hover Araç', 'Trophy Truck': 'Kupa Kamyoneti',
    'Moon Lander': 'Ay Modülü', 'Crop Duster': 'Tarım Uçağı',
    'Mini Copter': 'Mini Helikopter', 'Jetpack Bike': 'Jetpack Motor',
    'Volt Glider': 'Volt Planör', 'Maglev Pod': 'Maglev Kapsül',
    // Oynanış / HUD
    'CHECKPOINT': 'KONTROL NOKTASI', 'FINISH': 'BİTİŞ',
    'PAUSED': 'DURAKLATILDI', 'PAUSE': 'DURAKLAT', 'RETRY': 'TEKRAR DENE',
    'RESTART': 'YENİDEN BAŞLAT', 'NEXT': 'İLERİ', 'SKIP': 'ATLA',
    'EXIT': 'ÇIKIŞ', 'MENU': 'MENÜ', 'HOME': 'ANA SAYFA',
    'SELL': 'SAT', 'EQUIP': 'TAK', 'UNLOCK': 'AÇ', 'REVIVE': 'CANLAN',
    'COMBO': 'KOMBO', 'PERFECT': 'MÜKEMMEL', 'ALTITUDE': 'YÜKSEKLİK',
    'AIR TIME': 'HAVADA SÜRE',
    // İstatistik / sıralama
    'PLAYERS': 'OYUNCULAR', 'PLAYER': 'OYUNCU', 'GLOBAL': 'KÜRESEL',
    'LOCAL': 'YEREL', 'POSITION': 'SIRA', 'HIGH SCORE': 'YÜKSEK SKOR',
    'AVERAGE': 'ORTALAMA', 'VERSION': 'SÜRÜM', 'CONNECT': 'BAĞLAN',
    'LOGIN': 'GİRİŞ'
  };

  DICT.de = {
    // Überschriften / Bildschirme
    'SELECT VEHICLE': 'FAHRZEUG WÄHLEN', 'SELECT MAP': 'KARTE WÄHLEN',
    'DAILY MISSIONS': 'TAGESMISSIONEN', 'DAILY REWARD': 'TAGESBELOHNUNG',
    'SEASON LEAGUE': 'SAISONLIGA', 'FREE BONUS': 'GRATIS-BONUS',
    'STATISTICS': 'STATISTIKEN', 'ACHIEVEMENTS': 'ERFOLGE',
    'CUSTOMIZE': 'ANPASSEN', 'ENVIRONMENT': 'UMGEBUNG', 'SETTINGS': 'EINSTELLUNGEN',
    'REWARDS': 'BELOHNUNGEN', 'MARKET': 'MARKT', 'BADGES': 'ABZEICHEN',
    // Hauptmenü / Navigation
    'TAP TO CHANGE VEHICLE': 'TIPPEN ZUM WECHSELN',
    'SELECT THIS VEHICLE': 'DIESES FAHRZEUG WÄHLEN', 'GO TO MAP': 'ZUR KARTE',
    'PLAY AGAIN': 'NOCHMAL SPIELEN',
    'GARAGE': 'GARAGE', 'MAPS': 'KARTEN', 'CUPS': 'POKALE',
    'CHESTS': 'TRUHEN', 'SHOP': 'SHOP', 'RANKINGS': 'RANGLISTE',
    'RANK': 'RANG', 'PLAY': 'SPIELEN', 'BUY': 'KAUFEN',
    // Fahrzeugwerte
    'ENGINE': 'MOTOR', 'SUSPENSION': 'FEDERUNG', 'SUSP': 'FEDER',
    'TIRE': 'REIFEN', 'FUEL': 'BENZIN',
    // Modusauswahl
    'TIME TRIAL': 'ZEITFAHREN', 'BOT RACE': 'BOT-RENNEN',
    'RACE': 'RENNEN', 'GHOST': 'GEIST', 'SURVIVAL': 'ÜBERLEBEN',
    'SURV': 'ÜBERL', 'TIME': 'ZEIT',
    // Anpassen
    'PRIMARY COLOR': 'HAUPTFARBE', 'SECONDARY COLOR': 'ZWEITFARBE',
    'RESET COLORS': 'FARBEN ZURÜCKSETZEN', 'TIRES': 'REIFEN',
    'surface grip': 'Bodenhaftung',
    // Einstellungen
    'SOUND EFFECTS': 'SOUNDEFFEKTE', 'SCREEN SHAKE': 'BILDSCHIRMWACKELN',
    'ON-SCREEN CONTROLS': 'BILDSCHIRMTASTEN', 'SLOW MOTION': 'ZEITLUPE',
    'DELETE ALL DATA': 'ALLE DATEN LÖSCHEN', 'CLOUD SYNC': 'CLOUD-SYNC',
    'MUSIC': 'MUSIK', 'VIBRATION': 'VIBRATION', 'VOLUME': 'LAUTSTÄRKE',
    'GRAPHICS': 'GRAFIK', 'CAMERA': 'KAMERA', 'TUTORIAL': 'TUTORIAL',
    'LANGUAGE': 'SPRACHE', 'STATS': 'STATS', 'ENGLISH': 'ENGLISCH',
    // Umgebung
    'DAY / NIGHT': 'TAG / NACHT', 'NATURAL DISASTERS': 'NATURKATASTROPHEN',
    'DAMAGE / DEFORMATION': 'SCHADEN / VERFORMUNG', 'ENDLESS MODE': 'ENDLOS-MODUS',
    'OBSTACLES': 'HINDERNISSE', 'WEATHER': 'WETTER',
    'NIGHT': 'NACHT', 'CLEAR': 'KLAR', 'RAIN': 'REGEN', 'SNOW': 'SCHNEE',
    'FOG': 'NEBEL', 'WIND': 'WIND', 'AUTO': 'AUTO', 'DAY': 'TAG',
    // Belohnungen / Liga
    'SEASON': 'SAISON', 'BRONZE': 'BRONZE', 'SILVER': 'SILBER',
    'GOLD': 'GOLD', 'PLATINUM': 'PLATIN', 'DIAMOND': 'DIAMANT', 'MASTER': 'MEISTER',
    // Allgemein
    'LOADING': 'LÄDT', 'BEGINNER': 'ANFÄNGER', 'LEGEND': 'LEGENDE',
    'FIND MATCH': 'GEGNER SUCHEN', 'MATCH': 'MATCH', 'CLAIM': 'HOLEN',
    'NEW RECORD': 'NEUER REKORD', 'DISTANCE': 'DISTANZ', 'COINS': 'MÜNZEN',
    'FLIPS': 'SALTOS',
    // Weitere Bildschirme
    'SEASON PASS': 'SAISONPASS', 'MULTIPLAYER': 'MEHRSPIELER',
    'RANK & RECORDS': 'RANG & REKORDE', 'RECORDS': 'REKORDE',
    'TEAM': 'TEAM', 'COMING SOON': 'BALD',
    // Untere Navigation (3. Aug) — 8 Reiter.
    'CLAN': 'CLAN',
    // Status / Schaltflächen
    'CLAIMED': 'ABGEHOLT', 'COMPLETED': 'ERLEDIGT', 'EQUIPPED': 'AUSGERÜSTET',
    'UNLOCKED': 'FREIGESCHALTET', 'LOCKED': 'GESPERRT', 'CONTINUE': 'WEITER',
    'PREMIUM': 'PREMIUM', 'TIER': 'STUFE', 'LEVEL': 'LEVEL',
    'UPGRADE': 'VERBESSERN', 'CREATE': 'ERSTELLEN', 'LEAVE': 'VERLASSEN',
    'FRIENDS': 'FREUNDE', 'WEEKLY': 'WÖCHENTLICH', 'DAILY': 'TÄGLICH',
    'DEFAULT': 'STANDARD', 'PROGRESS': 'FORTSCHRITT', 'REWARD': 'BELOHNUNG',
    'LOSSES': 'NIEDERLAGEN', 'WINS': 'SIEGE', 'TOTAL': 'GESAMT',
    'SCORE': 'PUNKTE', 'BEST': 'BESTE', 'OWNED': 'IM BESITZ', 'NONE': 'KEINE',
    'JOIN': 'BEITRETEN', 'START': 'START', 'SELECT': 'WÄHLEN', 'RESET': 'ZURÜCKSETZEN',
    'CLOSE': 'SCHLIESSEN', 'BACK': 'ZURÜCK', 'MAX': 'MAX',
    'WATCH AD': 'WERBUNG ANSEHEN', 'MASTERY': 'MEISTERSCHAFT', 'HANDLING': 'HANDLING',
    'SPEED': 'TEMPO', 'POWER': 'LEISTUNG', 'GRIP': 'GRIP', 'FREE': 'GRATIS',
    'READY': 'BEREIT', 'RESUME': 'FORTSETZEN', 'CANCEL': 'ABBRECHEN',
    'CONFIRM': 'BESTÄTIGEN', 'DELETE': 'LÖSCHEN', 'DIAMONDS': 'DIAMANTEN',
    'DOUBLE': 'DOPPELT', 'VICTORY': 'SIEG', 'DEFEAT': 'NIEDERLAGE',
    'WINNER': 'GEWINNER', 'TODAY': 'HEUTE', 'SPIN': 'DREHEN',
    // Weitere Menüs
    'GAME OVER': 'SPIEL VORBEI', 'LEVEL UP': 'LEVELAUFSTIEG',
    'WORLD RECORD': 'WELTREKORD', 'PERSONAL BEST': 'BESTLEISTUNG',
    'LEADERBOARD': 'BESTENLISTE', 'INVENTORY': 'INVENTAR',
    'PROFILE': 'PROFIL', 'MISSIONS': 'MISSIONEN', 'MISSION': 'MISSION',
    'CHALLENGES': 'DUELLE', 'CHALLENGE': 'DUELL',
    'EVENTS': 'EVENTS', 'EVENT': 'EVENT',
    'SPECIAL OFFER': 'SONDERANGEBOT', 'OFFERS': 'ANGEBOTE',
    'BUNDLE': 'PAKET', 'NOTIFICATIONS': 'MITTEILUNGEN',
    // Währung / Belohnung
    'GEMS': 'EDELSTEINE', 'TROPHY': 'TROPHÄE', 'CHAMPION': 'CHAMPION',
    'GIFT': 'GESCHENK', 'CHEST': 'TRUHE', 'CRATE': 'KISTE',
    'COLLECT': 'SAMMELN', 'REDEEM': 'EINLÖSEN',
    // Fahrzeug / Teile
    'VEHICLES': 'FAHRZEUGE', 'VEHICLE': 'FAHRZEUG', 'BODY': 'KAROSSERIE',
    'WHEELS': 'RÄDER', 'WHEEL': 'RAD',
    'BRAKES': 'BREMSEN', 'BRAKE': 'BREMSE', 'NITRO': 'NITRO',
    'BOOST': 'BOOST', 'GEARBOX': 'GETRIEBE', 'GEARS': 'GÄNGE',
    'GEAR': 'GANG', 'DOWNFORCE': 'ABTRIEB', 'ROOF': 'DACH',
    'PARTS': 'TEILE', 'PART': 'TEIL', 'UPGRADES': 'UPGRADES',
    'ACCELERATION': 'BESCHLEUNIGUNG', 'TOP SPEED': 'SPITZENTEMPO',
    'STABILITY': 'STABILITÄT', 'TRACTION': 'TRAKTION',
    // Karten
    'COUNTRYSIDE': 'LANDSCHAFT', 'DESERT': 'WÜSTE', 'MOUNTAINS': 'BERGE',
    'MOUNTAIN': 'BERG', 'FOREST': 'WALD', 'HIGHWAY': 'AUTOBAHN',
    'ARCTIC': 'ARKTIS', 'CANYON': 'SCHLUCHT', 'VOLCANO': 'VULKAN',
    'BEACH': 'STRAND', 'CAVE': 'HÖHLE', 'BRIDGE': 'BRÜCKE', 'MOON': 'MOND',
    // Eksik kalan haritalar + gömülü arayüz parçaları (TR tarafıyla simetrik).
    'NEON CITY': 'NEON-STADT', 'WINTER': 'WINTER', 'CITY': 'STADT',
    'JUNGLE': 'DSCHUNGEL', 'SWAMP': 'SUMPF', 'HIGHLAND': 'HOCHLAND',
    'UNDERWATER': 'UNTERWASSER', 'WASTELAND': 'ÖDLAND',
    'Countryside': 'Land', 'Desert': 'Wüste',
    'Winter': 'Winter', 'Beach': 'Strand', 'Mountains': 'Berge',
    'Arctic': 'Arktis', 'Jungle': 'Dschungel', 'Highland': 'Hochland',
    'Swamp': 'Sumpf', 'Volcano': 'Vulkan', 'Canyon': 'Canyon',
    'Wasteland': 'Ödland', 'Underwater': 'Unterwasser',
    'Neon City': 'Neon City', 'Trophy Truck': 'Trophy Truck',  // Almancada Ingilizce kalir (kimlik esleme)
    ' members': ' Mitglieder', ' score': ' Punkte',
    'Watch & earn': 'Ansehen & verdienen',
    'locked': 'gesperrt', 'premium': 'Premium',
    'FLASH DEAL': 'BLITZ-ANGEBOT', 'MUSCLE CAR': 'MUSCLE CAR',
    'Aero / Downforce': 'Aero / Abtrieb',
    'Hover Car': 'Hover-Auto', 'Moon Lander': 'Mondlandefähre', 'Crop Duster': 'Sprühflugzeug',
    'Mini Copter': 'Mini-Helikopter', 'Jetpack Bike': 'Jetpack-Bike',
    'Volt Glider': 'Volt-Gleiter', 'Maglev Pod': 'Maglev-Kapsel',
    // Gameplay / HUD
    'CHECKPOINT': 'KONTROLLPUNKT', 'FINISH': 'ZIEL',
    'PAUSED': 'PAUSIERT', 'PAUSE': 'PAUSE', 'RETRY': 'NOCHMAL',
    'RESTART': 'NEU STARTEN', 'NEXT': 'WEITER', 'SKIP': 'ÜBERSPRINGEN',
    'EXIT': 'BEENDEN', 'MENU': 'MENÜ', 'HOME': 'STARTSEITE',
    'SELL': 'VERKAUFEN', 'EQUIP': 'AUSRÜSTEN', 'UNLOCK': 'FREISCHALTEN',
    'REVIVE': 'WIEDERBELEBEN',
    'COMBO': 'COMBO', 'PERFECT': 'PERFEKT', 'ALTITUDE': 'HÖHE',
    'AIR TIME': 'FLUGZEIT',
    // Statistik / Rangliste
    'PLAYERS': 'SPIELER', 'PLAYER': 'SPIELER', 'GLOBAL': 'GLOBAL',
    'LOCAL': 'LOKAL', 'POSITION': 'POSITION', 'HIGH SCORE': 'HIGHSCORE',
    'AVERAGE': 'DURCHSCHNITT', 'VERSION': 'VERSION', 'CONNECT': 'VERBINDEN',
    'LOGIN': 'ANMELDEN'
  };

  // ── TÜRKÇE KAYNAK SÖZLÜĞÜ (js/i18n-src-tr.js'ten birleştirilir) ──────────
  // Oyunun kaynak metni KARIŞIK DİLLİ: menü/HUD İngilizce, ama başarımlar,
  // görevler, kampanya, harita ayarları TÜRKÇE yazılmış (2.256 tekil metin).
  // Bu yüzden 'en' de artık bir sözlüğe ihtiyaç duyuyor (Türkçe→İngilizce),
  // 'de' ise hem İngilizce→Almanca hem Türkçe→Almanca kayıtlarını taşır.
  //
  // Biçim (js/i18n-src-tr.js):
  //     window.I18N_SRC_TR = { 'Türkçe metin': ['English', 'Deutsch'], … };
  //
  // ⚠ 'tr' sözlüğüne EKLENMEZ — Türkçe seçiliyken bu metinler zaten doğru.
  function turkceKaynagiBirlestir() {
    var src = root.I18N_SRC_TR;
    if (!src) return 0;
    if (!DICT.en) DICT.en = {};
    var n = 0;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      var v = src[k];
      if (!v) continue;
      // `!= null` — BOŞ DİZE geçerli bir çeviridir (Türkçe ekini düşürmek için;
      // bkz. i18n-src-tr.js '’e ulaş'). Sadece undefined/null "eksik" sayılır.
      if (v[0] != null) DICT.en[k] = v[0];
      if (v[1] != null) DICT.de[k] = v[1];
      n++;
    }
    _compiled = {};   // sözlük değişti → derlenmiş regex'ler geçersiz
    return n;
  }

  // ── İNGİLİZCE KAYNAK SÖZLÜĞÜ (js/i18n-src-en.js'ten birleştirilir) ───────
  //   Kaynak metnin DİĞER YARISI İngilizce (başarım katalogu, sandık/mağaza
  //   açıklamaları, takım/lig ekranları). Türk oyuncu bunları İNGİLİZCE
  //   görüyordu — DICT.tr yalnız 235 terim taşıyordu.
  //
  //   Biçim (js/i18n-src-en.js):
  //       window.I18N_SRC_EN = { 'English text': ['Türkçe', 'Deutsch'], … };
  //
  //   ⚠ 'en' sözlüğüne EKLENMEZ — İngilizce seçiliyken zaten doğru.
  //   ⚠ ÇAKIŞMA: aynı anahtar hem I18N_SRC_TR hem I18N_SRC_EN'de olmamalı;
  //     `dogrula-dil.js` bunu kontrol eder.
  //   🔴 HEPSİ "YALNIZ TAM EŞLEŞME" (28 Tmz — doğrulayıcı yakaladı):
  //      Bu sözlükteki anahtarlar TAM ETİKETLER ('Speed', 'Gold', 'Pilot',
  //      'Coin Rush'…). Gömülü eşleşmeye açılırsa BAŞKA bir çevirinin ÇIKTISINI
  //      yeniden yazarlar:
  //        "Speed-Maschine auf Eis"  →  "Geschwindigkeit-Maschine auf Eis"
  //      (i18n-src-tr.js'in Almanca çıktısı içinde 'Speed' geçiyor.)
  //      Bu, tek-geçiş garantisini kırar ve idempotens testi ÇÖKER.
  //      ▶ Anahtarlar `map`'e girer (O(1) tam eşleşme çalışır) ama regex
  //        alternasyonuna GİRMEZ.
  function ingilizceKaynagiBirlestir() {
    var src = root.I18N_SRC_EN;
    if (!src) return 0;
    if (!DICT.tr) DICT.tr = {};
    if (!DICT.de) DICT.de = {};
    var n = 0;
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      var v = src[k];
      if (!v) continue;
      if (v[0] != null) { DICT.tr[k] = v[0]; SADECE_TAM.tr[k] = 1; }
      if (v[1] != null) { DICT.de[k] = v[1]; SADECE_TAM.de[k] = 1; }
      n++;
    }
    _compiled = {};
    return n;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // KURAL SÖZLÜĞÜ — sayısı değişen metin AİLELERİ
  // ═══════════════════════════════════════════════════════════════════════
  //   `achievements.js` 1.019 farklı İngilizce metin içeriyor ama bunların
  //   334'ü yalnızca SAYISI farklı 50 aileye ait ("Go 250 meters",
  //   "Go 500 meters"…). Hepsini sözlüğe yazmak hem 334 satır hem de
  //   regex alternasyonunu 334 dal büyütmek demekti.
  //
  //   ⚠ KURALLAR TAM EŞLEŞMELİ (`^…$`). Gömülü çalıştırılırsa çıktı yeniden
  //     taranabilir ve bozulur — sözlüğün tek-geçiş garantisi kurallara da
  //     uygulanmalı.
  //   ⚠ SIRA ÖNEMLİ: daha özel kural daha genelin ÜSTÜNDE olmalı.
  //     "Go 500m in Countryside" kuralı "Go 500 meters"tan önce gelmeli.
  //   ⚠ `$1` grubu sayıyı taşır; ondalık/binlik ayırıcı da yakalanır ([\d.,]+).
  var RULES = {};

  var _SAYI = '([\\d.,]+)';
  function _k(dil, kaliplar) {
    RULES[dil] = RULES[dil] || [];
    for (var i = 0; i < kaliplar.length; i++) {
      RULES[dil].push([new RegExp('^' + kaliplar[i][0].replace(/#/g, _SAYI) + '$'), kaliplar[i][1]]);
    }
  }

  // Harita adları — Türkçe için BULUNMA HÂLİ ekini elle yazıyoruz.
  // ⚠ Ek düz `'de` DEĞİL: ünlü uyumu + ünsüz benzeşmesi var
  //   (Kış'TA, Kutup'TA, Mars'TA, Bataklık'TA…). Programatik ek üretmek
  //   Türkçede güvenilir değil; tablo elle doğru yazılır.
  var _HARITA_TR = {                       // [ad, bulunma hâli]
    Countryside: ['Kırsal', 'Kırsal\'da'], Desert: ['Çöl', 'Çöl\'de'],
    Winter: ['Kış', 'Kış\'ta'],            Beach: ['Plaj', 'Plaj\'da'],
    Mountains: ['Dağlar', 'Dağlar\'da'],   City: ['Şehir', 'Şehir\'de'],
    Arctic: ['Kutup', 'Kutup\'ta'],        Jungle: ['Orman', 'Orman\'da'],
    Mars: ['Mars', 'Mars\'ta'],            Moon: ['Ay', 'Ay\'da'],
    Cave: ['Mağara', 'Mağara\'da'],        Highland: ['Yayla', 'Yayla\'da'],
    Swamp: ['Bataklık', 'Bataklık\'ta'],   Volcano: ['Yanardağ', 'Yanardağ\'da'],
    Canyon: ['Kanyon', 'Kanyon\'da'],      Wasteland: ['Çorak', 'Çorak\'ta'],
    Underwater: ['Su Altı', 'Su Altı\'nda'], 'Neon City': ['Neon Şehir', 'Neon Şehir\'de']
  };
  var _HARITA_DE = {
    Countryside: 'Land', Desert: 'Wüste', Winter: 'Winter', Beach: 'Strand',
    Mountains: 'Berge', City: 'Stadt', Arctic: 'Arktis', Jungle: 'Dschungel',
    Mars: 'Mars', Moon: 'Mond', Cave: 'Höhle', Highland: 'Hochland',
    Swamp: 'Sumpf', Volcano: 'Vulkan', Canyon: 'Canyon',
    Wasteland: 'Ödland', Underwater: 'Unterwasser', 'Neon City': 'Neon-Stadt'
  };

  _k('tr', [
    ['Go # kilometers',                  '$1 kilometre git'],
    ['Go # meters',                      '$1 metre git'],
    ['Go #m without flipping',           'Takla atmadan $1 m git'],
    ['Go #m without running out of fuel','Yakıt bitmeden $1 m git'],
    ['Collect # coins',                  '$1 madeni para topla'],
    ['Collect # diamonds',               '$1 elmas topla'],
    ['Play # runs',                      '$1 yarış oyna'],
    ['Complete # runs',                  '$1 yarış tamamla'],
    ['Do # flips \\(total\\)',           'Toplam $1 takla at'],
    ['Do # flips in one run',            'Tek yarışta $1 takla at'],
    ['Do # flips',                       '$1 takla at'],
    ['Stay # seconds airborne',          '$1 saniye havada kal'],
    ['Reach # km/h speed',               '$1 km/s hıza ulaş'],
    ['Reach # km/h',                     '$1 km/s hıza ulaş'],
    ['Reach # gold',                     '$1 altına ulaş'],
    ['Reach XP Level #',                 'XP seviyesi $1\'e ulaş'],
    ['Reach top # globally',             'Dünya genelinde ilk $1\'e gir'],
    ['Save up # gold',                   '$1 altın biriktir'],
    ['Earn # gold total',                'Toplam $1 altın kazan'],
    ['Own # different vehicles',         '$1 farklı araca sahip ol'],
    ['Own # vehicles',                   '$1 araca sahip ol'],
    ['Win # bot races',                  '$1 bot yarışı kazan'],
    ['Travel #km distance',              '$1 km yol kat et'],
    ['Drive #km total',                  'Toplam $1 km sür'],
    ['Chain # moves at once',            'Arka arkaya $1 hareket zincirle'],
    ['Complete # levels',                '$1 bölüm tamamla'],
    ['#km Run',                          '$1 km Koşu'],
    ['Top #',                            'İlk $1']
  ]);
  _k('de', [
    ['Go # kilometers',                  'Fahre $1 Kilometer'],
    ['Go # meters',                      'Fahre $1 Meter'],
    ['Go #m without flipping',           'Fahre $1 m ohne Überschlag'],
    ['Go #m without running out of fuel','Fahre $1 m ohne Spritmangel'],
    ['Collect # coins',                  'Sammle $1 Münzen'],
    ['Collect # diamonds',               'Sammle $1 Diamanten'],
    ['Play # runs',                      'Spiele $1 Läufe'],
    ['Complete # runs',                  'Beende $1 Läufe'],
    ['Do # flips \\(total\\)',           'Mache $1 Überschläge (gesamt)'],
    ['Do # flips in one run',            'Mache $1 Überschläge in einem Lauf'],
    ['Do # flips',                       'Mache $1 Überschläge'],
    ['Stay # seconds airborne',          'Bleibe $1 Sekunden in der Luft'],
    ['Reach # km/h speed',               'Erreiche $1 km/h'],
    ['Reach # km/h',                     'Erreiche $1 km/h'],
    ['Reach # gold',                     'Erreiche $1 Gold'],
    ['Reach XP Level #',                 'Erreiche XP-Level $1'],
    ['Reach top # globally',             'Erreiche weltweit Top $1'],
    ['Save up # gold',                   'Spare $1 Gold an'],
    ['Earn # gold total',                'Verdiene insgesamt $1 Gold'],
    ['Own # different vehicles',         'Besitze $1 verschiedene Fahrzeuge'],
    ['Own # vehicles',                   'Besitze $1 Fahrzeuge'],
    ['Win # bot races',                  'Gewinne $1 Bot-Rennen'],
    ['Travel #km distance',              'Lege $1 km zurück'],
    ['Drive #km total',                  'Fahre insgesamt $1 km'],
    ['Chain # moves at once',            'Verkette $1 Moves am Stück'],
    ['Complete # levels',                'Schließe $1 Level ab'],
    ['#km Run',                          '$1 km Lauf'],
    ['Top #',                            'Top $1']
  ]);

  // ── TERS YÖN: TÜRKÇE kaynak → İngilizce/Almanca ──────────────────────────
  //   `achievements.js` katalogunun yarısı TÜRKÇE yazılmış ve orada da sayısı
  //   değişen aileler var ("15 saniye havada kal" … "7200 saniye havada kal",
  //   20 varyant). `i18n-src-tr.js` bunların yalnız birkaçını içeriyordu →
  //   İngilizce/Almanca seçiliyken 189 açıklama TÜRKÇE kalıyordu.
  _k('en', [
    ['# kilometre yol kat et',                      'Travel $1 kilometers'],
    ['Toplam # metre yol kat et',                   'Travel $1 meters total'],
    ['Toplam # kilometre yol kat et',               'Travel $1 kilometers total'],
    ['Toplam # takla at',                           'Do $1 flips (total)'],
    ['# takla at',                                  'Do $1 flips'],
    ['# saniye havada kal',                         'Stay $1 seconds airborne'],
    ['# madeni para topla',                         'Collect $1 coins'],
    ['# elmas topla',                               'Collect $1 diamonds'],
    ['#m takla atmadan git',                        'Go $1 m without flipping'],
    ['smooth_lander ile #m takla atmadan git',      'Go $1 m without flipping using smooth_lander'],
    ['Coin Rush oynayarak toplam # sikke biriktir', 'Collect $1 coins total in Coin Rush'],
    ['Tek turda #m',                                '$1 m in a single run']
  ]);
  _k('de', [
    ['# kilometre yol kat et',                      'Lege $1 Kilometer zurück'],
    ['Toplam # metre yol kat et',                   'Lege insgesamt $1 Meter zurück'],
    ['Toplam # kilometre yol kat et',               'Lege insgesamt $1 Kilometer zurück'],
    ['Toplam # takla at',                           'Mache $1 Überschläge (gesamt)'],
    ['# takla at',                                  'Mache $1 Überschläge'],
    ['# saniye havada kal',                         'Bleibe $1 Sekunden in der Luft'],
    ['# madeni para topla',                         'Sammle $1 Münzen'],
    ['# elmas topla',                               'Sammle $1 Diamanten'],
    ['#m takla atmadan git',                        'Fahre $1 m ohne Überschlag'],
    ['smooth_lander ile #m takla atmadan git',      'Fahre $1 m ohne Überschlag mit smooth_lander'],
    ['Coin Rush oynayarak toplam # sikke biriktir', 'Sammle insgesamt $1 Münzen im Coin Rush'],
    ['Tek turda #m',                                '$1 m in einem Lauf']
  ]);

  // "Go 500m in <Harita>" ailesi — harita adı da çevrilir (18 harita × 2 dil).
  // ⚠ Kural tam eşleşmeli olduğu için "Neon City"/"City" çakışması YOK
  //   (^…$ ile "Go 500m in City" yalnız City kuralına uyar). Yine de uzun adı
  //   öne alıyoruz ki ileride gömülü kullanılırsa da doğru kalsın.
  (function () {
    var adlarTR = Object.keys(_HARITA_TR).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < adlarTR.length; i++) {
      var en = adlarTR[i];
      var kacis = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      _k('tr', [['Go #m in ' + kacis, _HARITA_TR[en][1] + ' $1 m git']]);
      _k('de', [['Go #m in ' + kacis, 'Fahre $1 m in ' + (_HARITA_DE[en] || en)]]);
    }
  })();

  // ── Regex derleyici (dil başına bir kez) ─────────────────────────────────
  // ⚠ `u` (unicode) bayrağı altında GEÇERSİZ kaçışlar hata verir: `\-` ve `\/`
  //   "Invalid escape" atar. Zaten ikisi de karakter sınıfı DIŞINDA özel değil,
  //   kaçırmaya gerek yok. Yalnızca gerçek regex metakarakterleri kaçırılır.
  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 🔴 KELİME SINIRI NEDEN `\b` DEĞİL (28 Tmz, doğrulama betiği yakaladı):
  //   JavaScript'te `\b` ASCII tabanlıdır — 'Ä','ü','ş','İ' harf SAYILMAZ.
  //   Bu yüzden `\bBEST\b` Almanca "BESTÄTIGEN" içindeki BEST'i EŞLEŞTİRİR
  //   ('T' ile 'Ä' arası sınır sanılır) ve metin "BESTEÄTIGEN" olur.
  //   Aksanlı harf kullanan HER dilde sessiz bozulma demektir.
  //   Çözüm: Unicode harf/rakam sınıfıyla lookaround.
  //   Lookbehind desteklemeyen eski motorlarda `\b`'ye düşülür (Chrome 62+,
  //   Edge 79+, Safari 16.4+ destekler; hedef tarayıcılarımız kapsanır).
  var _SINIR_ONCE = '(?<![\\p{L}\\p{N}_])';
  var _SINIR_SONRA = '(?![\\p{L}\\p{N}_])';
  var _unicodeSinir = (function () {
    try { new RegExp(_SINIR_ONCE + 'a' + _SINIR_SONRA, 'gu'); return true; }
    catch (e) { return false; }
  })();

  // Yalnız TAM eşleşmede uygulanacak anahtarlar (regex'e girmez) — bkz.
  // `ingilizceKaynagiBirlestir` üstündeki uyarı.
  var SADECE_TAM = { tr: {}, de: {}, en: {} };

  var _compiled = {};   // code -> { re, map }
  function compile(code) {
    if (_compiled[code] !== undefined) return _compiled[code];
    var map = DICT[code];
    if (!map) { _compiled[code] = null; return null; }
    var tamSet = SADECE_TAM[code] || {};
    var keys = Object.keys(map).filter(function (k) { return !tamSet[k]; });
    // EN UZUN ÖNCE: regex alternasyonu soldan ilk eşleşeni alır.
    keys.sort(function (a, b) { return b.length - a.length; });

    // 🔴 KELİME SINIRI ANAHTAR BAZINDA KOŞULLU (28 Tmz, doğrulayıcı yakaladı):
    //   Kanca metni PARÇA PARÇA değil BİRLEŞMİŞ hâliyle görür:
    //       ctx.fillText('Seviye ' + 30 + '’e ulaş')  → "Seviye 30’e ulaş"
    //   Anahtar boşluk/noktalama ile başlıyorsa (' görev tamamlandı', '’e ulaş')
    //   önüne sınır koymak YANLIŞTIR: önceki karakter rakam olduğu için lookbehind
    //   başarısız olur ve anahtar HİÇ eşleşmez — sessizce çevrilmez.
    //   ▶ Sınır yalnızca anahtarın ucu HARF/RAKAM ise eklenir.
    // 🔴 PERFORMANS (28 Tmz — ölçülerek bulundu, sözlük 1.800'e çıkınca):
    //   Her alternatife lookbehind/lookahead sarmak metin başına **6,7 ms**
    //   maliyet çıkarıyordu (80 çizimlik bir karede 535 ms donma!).
    //   ▶ Lookaround'lar KALDIRILDI; sınır kontrolü `replace` geri çağrısında
    //     elle yapılıyor. Aynı sonuç, ~100× hızlı.
    //   ▶ Ayrıca `tr()` içinde önce TAM EŞLEŞME (Map araması, O(1)) denenir;
    //     oyun metinlerinin çoğu sözlükte birebir vardır ve regex'e hiç girmez.
    var parcalar = keys.map(escapeRe);
    var re = new RegExp('(' + parcalar.join('|') + ')', _unicodeSinir ? 'gu' : 'g');

    // Hangi anahtarın hangi ucunda sınır aranacağı ÖNCEDEN hesaplanır.
    var HARF = /[\p{L}\p{N}_]/u;
    var solSinir = {}, sagSinir = {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      solSinir[k] = HARF.test(k.charAt(0));
      sagSinir[k] = HARF.test(k.charAt(k.length - 1));
    }
    _compiled[code] = {
      re: re, map: map, sol: solSinir, sag: sagSinir, harf: HARF
    };
    return _compiled[code];
  }

  // ── Çeviri (TEK GEÇİŞ) ────────────────────────────────────────────────────
  var cache = new Map();

  function currentLang() {
    try {
      if (typeof Settings !== 'undefined' && Settings.get) {
        var c = Settings.get('language');
        if (typeof c === 'string' && c) return c;
      }
    } catch (e) {}
    return 'en';
  }

  function translate(s, code) {
    var c = compile(code);
    if (!c) return s;

    // ── HIZLI YOL: tam eşleşme (O(1)) ────────────────────────────────────
    // Oyun metinlerinin büyük çoğunluğu sözlükte BİREBİR var ("Isınma Turu").
    // Bunlar regex'e hiç girmez. Ölçüm: 6,7 ms → 0,001 ms.
    var tam = c.map[s];
    if (tam !== undefined) return tam;

    // ── KURAL YOLU: sayı içeren metin AİLELERİ ───────────────────────────
    // `achievements.js`'te "Go 250 meters", "Go 500 meters"… gibi yalnız
    // sayısı değişen 334 metin var. Hepsini tek tek sözlüğe yazmak yerine
    // 50 KURAL yeter. Kurallar yalnız TAM eşleşmede çalışır (^…$) — gömülü
    // eşleşme yok, çünkü çıktı yeniden taranmamalı.
    // ⚠ Kurallar tam eşleşmeden SONRA, gömülü eşleşmeden ÖNCE denenir:
    //   sözlükte birebir yazılmış bir metin varsa o KAZANIR.
    var kural = RULES[code];
    if (kural) {
      for (var ki = 0; ki < kural.length; ki++) {
        var m2 = kural[ki][0].exec(s);
        if (m2) return s.replace(kural[ki][0], kural[ki][1]);
      }
    }

    // ── YAVAŞ YOL: gömülü eşleşme (birleştirilmiş metinler) ──────────────
    // TEK replace → çıktı asla yeniden taranmaz (geri-tarama bozulması yok).
    // Sınır kontrolü burada elle: regex'e lookaround koymak 100× yavaştı.
    c.re.lastIndex = 0;
    return s.replace(c.re, function (m, g1, offset, tumu) {
      if (c.sol[m]) {
        var onceki = offset > 0 ? tumu.charAt(offset - 1) : '';
        if (onceki && c.harf.test(onceki)) return m;   // sol sınır yok → eşleşme geçersiz
      }
      if (c.sag[m]) {
        var sonraki = tumu.charAt(offset + m.length);
        if (sonraki && c.harf.test(sonraki)) return m; // sağ sınır yok → geçersiz
      }
      return c.map[m];
    });
  }

  function tr(s) {
    if (typeof s !== 'string' || s.length === 0) return s;
    var code = currentLang();
    // 'en' ARTIK ATLANMIYOR: Türkçe kaynak metinleri İngilizceye çevirmesi gerek.
    if (!DICT[code]) return s;
    var key = code + ' ' + s;
    var hit = cache.get(key);
    if (hit !== undefined) return hit;
    var out = translate(s, code);
    cache.set(key, out);
    return out;
  }

  // ── Dışa açılan arayüz ────────────────────────────────────────────────────
  var I18N = {
    LANGS: LANGS,
    // Bir dilin çevirisi hazır mı? ('en' temel dil olduğu için her zaman hazır)
    isReady: function (code) {
      for (var i = 0; i < LANGS.length; i++) {
        if (LANGS[i].code === code) return !!LANGS[i].ready;
      }
      return false;
    },
    // Yalnızca hazır olan diller
    readyLangs: function () { return LANGS.filter(function (l) { return l.ready; }); },
    // Dilin kendi adı ('tr' → 'Türkçe')
    nativeName: function (code) {
      for (var i = 0; i < LANGS.length; i++) {
        if (LANGS[i].code === code) return LANGS[i].native;
      }
      return code;
    },
    current: currentLang,
    // Dili değiştirir. Hazır değilse DEĞİŞTİRMEZ ve false döner.
    set: function (code) {
      if (!this.isReady(code)) return false;
      try {
        if (typeof Settings !== 'undefined' && Settings.set) Settings.set('language', code);
      } catch (e) { return false; }
      cache.clear();
      // DOM ile çizilen paneller kendi kendine yeniden çizilmez → burada tazele.
      try { this.dom(); } catch (e) {}
      return true;
    },
    clear: function () { cache.clear(); },
    // ── DOM ÇEVİRİSİ (28 Tmz — canlıda yakalanan eksik) ──────────────────
    // Oyunun bir kısmı canvas DEĞİL, DOM ile çiziliyor (`modeselect.js`,
    // `mobileui.js` → innerHTML/textContent). fillText kancası oraya ULAŞMAZ,
    // dolayısıyla mod seçici paneli ve MOD rozeti her dilde Türkçe kalıyordu.
    // ▶ `I18N.dom(kok)` verilen ağacın METİN DÜĞÜMLERİNİ çevirir.
    //   · Yalnız metin düğümü işlenir → HTML yapısı/öznitelikler bozulmaz.
    //   · <script>/<style> içeriği atlanır.
    //   · Her düğümün ÖZGÜN metni `data-i18n-src` olarak saklanır; dil
    //     değişince özgün metinden yeniden çevrilir (üst üste çeviri olmaz).
    dom: function (kok) {
      try {
        var k = kok || (typeof document !== 'undefined' ? document.body : null);
        if (!k || typeof document === 'undefined') return 0;
        var gez = document.createTreeWalker(k, NodeFilter.SHOW_TEXT, null, false);
        var kod = currentLang();
        var n, sayac = 0, liste = [];
        while ((n = gez.nextNode())) liste.push(n);
        for (var i = 0; i < liste.length; i++) {
          var dugum = liste[i];
          var ebeveyn = dugum.parentNode;
          if (!ebeveyn) continue;
          var etiket = ebeveyn.nodeName;
          if (etiket === 'SCRIPT' || etiket === 'STYLE') continue;
          // Özgün metni bir kez sakla — sonraki dil değişimlerinde kaynak bu olur.
          var ozgun = ebeveyn.getAttribute && ebeveyn.getAttribute('data-i18n-src');
          if (ozgun == null) {
            ozgun = dugum.nodeValue;
            if (!ozgun || !ozgun.trim()) continue;
            if (ebeveyn.setAttribute) ebeveyn.setAttribute('data-i18n-src', ozgun);
          }
          var yeni = (kod === 'tr' || !DICT[kod]) ? ozgun : translate(ozgun, kod);
          if (dugum.nodeValue !== yeni) { dugum.nodeValue = yeni; sayac++; }
        }
        return sayac;
      } catch (e) { return 0; }
    },
    translate: translate,          // test için: dilden bağımsız çeviri
    _dict: DICT,                   // doğrulama betiği için
    _rules: RULES,                 // doğrulama betiği için
    _merge: turkceKaynagiBirlestir, // i18n-src-tr.js yüklendikten sonra çağrılır
    _mergeEn: ingilizceKaynagiBirlestir
  };

  root.I18N = I18N;
  root._i18nClear = function () { cache.clear(); };   // eski çağrı noktalarıyla uyum

  // Kaynak sözlükler BU DOSYADAN ÖNCE yüklenmişse hemen birleştir.
  // (index.html sırası: i18n-src-tr.js → i18n-src-en.js → i18n.js)
  turkceKaynagiBirlestir();
  ingilizceKaynagiBirlestir();

  // ── DOM panelleri sonradan oluşturulur (modeselect/mobileui DOMContentLoaded'da
  //    kurar). Bir kez sayfa hazır olunca, bir kez de kısa gecikmeyle çevir ki
  //    geç eklenen paneller de yakalansın. Ucuz: sadece metin düğümlerini gezer.
  if (typeof document !== 'undefined') {
    var _domCevir = function () { try { I18N.dom(); } catch (e) {} };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        _domCevir(); setTimeout(_domCevir, 1200); _gozlemciKur();
      });
    } else {
      _domCevir(); setTimeout(_domCevir, 1200); _gozlemciKur();
    }
  }

  // ── DİNAMİK DOM GÖZLEMCİSİ ────────────────────────────────────────────────
  // Bazı paneller yeniden çiziliyor (`modeselect.js _paintBtn()` innerHTML'i
  // baştan yazar) → çevrilmiş metin Türkçeye geri dönerdi. Gözlemci yeni gelen
  // düğümleri yakalayıp yeniden çevirir.
  // ⚠ SONSUZ DÖNGÜ KORUMASI: kendi yazdığımız değişiklik de mutation üretir.
  //   `_cevirmede` bayrağı ve YALNIZ childList dinlemek (characterData DEĞİL)
  //   bunu keser. Ayrıca 150 ms geciktirilir → kare başına maliyet yok.
  var _cevirmede = false, _zaman = null;
  function _gozlemciKur() {
    try {
      if (typeof MutationObserver === 'undefined' || !document.body) return;
      var mo = new MutationObserver(function (kayitlar) {
        if (_cevirmede) return;
        var ilgili = false;
        for (var i = 0; i < kayitlar.length; i++) {
          if (kayitlar[i].addedNodes && kayitlar[i].addedNodes.length) { ilgili = true; break; }
        }
        if (!ilgili) return;
        if (_zaman) clearTimeout(_zaman);
        _zaman = setTimeout(function () {
          _cevirmede = true;
          try { I18N.dom(); } catch (e) {}
          _cevirmede = false;
        }, 150);
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  // ── Canvas kancası (yalnız tarayıcıda) ───────────────────────────────────
  if (typeof CanvasRenderingContext2D !== 'undefined') {
    var proto = CanvasRenderingContext2D.prototype;
    var _ft = proto.fillText, _st = proto.strokeText;
    proto.fillText = function (t, x, y, mw) {
      return (mw === undefined) ? _ft.call(this, tr(t), x, y) : _ft.call(this, tr(t), x, y, mw);
    };
    proto.strokeText = function (t, x, y, mw) {
      return (mw === undefined) ? _st.call(this, tr(t), x, y) : _st.call(this, tr(t), x, y, mw);
    };
  }

  // Node'dan doğrulama için
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18N;
  }

})(typeof window !== 'undefined' ? window : globalThis);
