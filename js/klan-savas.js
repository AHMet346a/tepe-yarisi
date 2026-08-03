'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   KlanSavas — KLAN SAVAŞLARI · TURNUVA · KEŞİF   (Ajan F · KLAN-SOZLESME.md §1)

   Kaynak tasarım: "Klan sistemi.txt" BÖLÜM 8 (savaş) · 29 (turnuva) ·
   40 (casusluk) · 14.2 Senaryo 5 (eşleştirme hatası).

   Kapsam:
     · 4 savaş türü (hızlı/normal/uzun/turnuva)
     · Yarış puanı + savaş puanı (en iyi N ortalaması)
     · 6 kriterli eşleştirme algoritması (TOHUMLU — Math.random YOK)
     · Savaş durumu makinesi: beklemede→eslesme→aktif→bitti→oduller_alindi
     · Turnuva: 4 aşama · 128'lik bracket · ELO (K=32)
     · §40.2 YASAL keşif/casusluk (keşif · izleme · simülasyon · açık kaynak)

   🔴 TOP-LEVEL AD: yalnız `KlanSavas`.
      `js/social.js` `ClanWar` ve `Tournament` adlarını ZATEN top-level `const`
      ile tutuyor → o adlar KULLANILMAZ (aynı ad = "Identifier has already been
      declared" = tüm oyun çöker, `terrain_extra.js` mayınının aynısı).

   🔴 ÖDÜL PARA BİRİMİ: yalnız Klan Parası (KP). Altın/elmas VERİLMEZ.
      Tasarımdaki her "X Elmas + Y Altın" `Klan.kpCevir(altin, elmas)` ile
      tek bir KP değerine çevrilir (sözleşme §6), sonra `Klan.odulCarpani()`
      uygulanır (`Klan.kpOdul`). Dönüşüm formülü BURADA YENİDEN YAZILMAZ.

   🔴 DETERMİNİZM: rakip seçimi · bot üye katkıları · rakip puanı · turnuva
      bracket'ı TOHUMLUDUR. Aynı haftaId + aynı savaş no → aynı sonuç.
      `Math.random()` bu dosyada HİÇ çağrılmaz (selfTest bunu Math.random'ı
      sayaçla sarmalayıp ÖLÇEREK doğrular).
      Üreteç: mulberry32 + FNV-1a (`Math.imul` ile — `js/liveops.js:32`'deki
      düz çarpımlı hash KOPYALANMADI, sözleşme §7).

   🔴 ZAMAN: her yerde `Date.now()` (`_simdi()`). `dt` biriktirerek zaman
      ÖLÇÜLMEZ — `js/intro.js` tam bu yüzden canlıda takılmıştı.

   ── TASARIMDAN SAPMALAR (hepsi gerekçeli) ────────────────────────────────
   S1  §8.5 ödül tablosu savaş TÜRÜNE GÖRE FARKLILAŞTIRILMADI. Tasarımda tek
       tablo var; tür başına çarpan eklemek sözleşme §6'nın kilitlediği
       "Savaş galibiyeti = 2.050 KP" satırını bozardı. Zorluk farkı ödülde
       değil, turnuvada karşılanıyor (§29.3 şampiyon = 45.000 KP, 22 kat).
   S2  §8.4 "Zaman_Bonusu" formülde TOPLANAN bir terim gibi yazılmış ama
       açıklamada YÜZDE veriliyor ("+%20"). Yüzde olarak, taban puanın
       ÇARPANI şeklinde uygulandı: puan = taban × (1 + oran).
   S3  SAPMA DEĞİL — "en iyi N yarışın ortalaması" HARFİYEN uygulanır: bölen
       DAİMA N'dir (üye N'den az yarış yaptıysa eksik yuvalar 0 sayılır).
       ⚠ İlk yazımda "gerçek yarış sayısına böl" diye saptırmıştım; ÖLÇÜM
       elendi: 2 yarış yapan oyuncu 12 yarış yapanla aynı oranda kazanıyordu
       (%25,0 ↔ %26,7) — §8.4'ün "tutarlı performans" amacı tamamen ölüydü.
       Doğru kuralla ölçüldü: 2 yarış %5,0 · 12 yarış %48,3.
   S4  §8.3 eşleştirme süzgeçleri KADEMELİ GEVŞETİLİR. Ham algoritma yeni bir
       klanda ASLA rakip bulamaz: haftalıkPuan=0 iken ±%20 bandı = 0 genişlik
       → aday listesi boşalır. Süzgeç boşaltırsa o kriter gevşetilir ve
       `gevsetilen[]` içinde RAPORLANIR (sessizce yutulmaz).
   S5  Bot üye katkıları ve rakip puanı savaş BAŞLARKEN tohumlu üretilir;
       oyuncunun canlı performansına GÖRE DEĞİŞMEZ. Lastik bant (rubber
       banding) hile hissi verir — kullanıcı isteği: "kazanılabilir/
       kaybedilebilir ama hile hissi vermeyen".
   S6  §29.3 "Tüm Üyelere Özel Araç" ödülü KALDIRILDI → kozmetik şampiyon
       amblemi. Gerekçe: klan sistemi ana ekonomiye araç enjekte edemez
       (tüm kampanya 107.300 altın verirken tek turnuva kalıcı bir araç
       verirse araç ilerlemesi anlamsızlaşır; sözleşme §0 "çok yüksek tutar
       görürsen düzelt" yetkisi).
   S7  §8.2 "Turnuva = 1 hafta" ile §29.2'nin aşama takvimi (3+4+10+3 = 20
       gün) ÇELİŞİYOR. §29 kazandı: turnuva 20 gün sürer, yılda 8 kez.
       §8.2'nin "1 hafta / 20 üye" satırı oyuncunun KATILIM PENCERESİ olarak
       yorumlandı (`TUR.turnuva.sureMs` = 7 gün).
   S8  §40.3 (yasadışı casusluk), §40.4'ün 5 maddesi (2FA · şüpheli aktivite ·
       gizlilik seviyesi · casusluk sigortası · kara liste) ve §40.5 (hain
       etiketi) UYGULANMADI: gerçek hesap, sunucu, sohbet ve üçüncü taraf
       yok — konusuz. §40.4'ten yalnız "Yeni Üye Gözlem Süresi 72 saat"
       uygulandı (bot üyeler için anlamlı bir kısıt).
   S9  §40.2 "Diplomatik Bilgi Toplama" UYGULANMADI — dost klan/ittifak
       modülü yok (Klan.SINIF.diplomat bonusu var ama ittifak sistemi yok).
   S10 §14.2 Senaryo 5 telafisi (100 Elmas + 1.000 Altın) KP'ye çevrildi:
       `Klan.kpCevir(1000, 100)` = 410 KP.
   S11 Savaş klan XP'si `Klan.xpEkle('galibiyet', ...)` üzerinden verilir.
       Klan.js'in o kaynağa koyduğu 100 XP/gün tavanı GEÇERLİDİR; tasarımın
       1.000 XP'si tek günde alınamaz. Başka ajanın tavanını bypass etmem.
   S12 §29.2 "beraberlikte kaptanların 1v1'i" — bracket'ta beraberlik
       ÜRETİLMEZ (ELO olasılığı + tohumlu para = her zaman bir kazanan).
       Normal savaşta beraberlik mümkündür ve §8.5'e göre ödüllendirilir.
   ── 🐛 DÖRT DENGE BUGU (S13-S16) — HEPSİ SİMÜLASYONLA ÖLÇÜLEREK BULUNDU ──
       Hiçbiri "koda bakarak" görünmüyordu; her biri 60-120 savaş koşulup
       kazanma oranı SAYILARAK ortaya çıktı. `selfTest` üçünü de kilitler
       (`kazanmaOraniDengeli` · `efortBelirleyici` · `tahminKalibre`).
   S13 `KlanSim.klanGucu` "Ort_Üye_Katkısı"nı `haftalikPuan / uyeSayisi` diye
       türetiyor. Oyuncunun klanı TEK ÜYELİ olduğu için 9.000/1 = 9.000
       çıkıyordu (botlar ~900) → klan gücü 4.523 (botlar ~470) →
       `savasKazanmaOlasiligi` = **1,0000 (%100)**. Savaş anlamsızdı.
       ▶ `ortKatki` artık AYNI LİGDEKİ BOTLARIN MEDYANI × lig içi konum
         (`ligOlcekliOrtKatki`). Denenip ELENEN iki formül orada yazılı.
         `uyeSayisi` de savaş kadrosuna yükseltilir (`ETKIN_UYE_TABAN`).
   S14 `referansPuan()` sabit formüldü (≈840) ama oyuncunun gerçek yarış
       puanı 3.000-11.000. Farklı para birimi → sv20 %10,8, sv45 %100
       kazanıyordu; 500 KP'lik "Savaş Simülasyonu" %26 diyordu. ▶ Referans
       artık oyuncunun kendi savaş yarışı ortalamasından ÖĞRENİLİR (EMA 0,15).
   S15 `bizBeklenen = referans × T.uye` yanlıştı: bot çarpanlarının ortalaması
       0,95 ve bot sayısı T.uye−1 olduğu için gerçek beklenti 9,55×ref idi →
       p=0,50'de bile rakip %4,7 önde başlıyordu. ▶ `botToplam + referans`.
   S16 Rakip puanı `(botToplam + ref) × oran` idi; sabit bot kütlesi `oran`la
       da çarpıldığı için oyuncunun katkısı sonucun ~%10'uydu. ÖLÇÜLDÜ:
       2 yarış yapan (%25,0) ile 12 yarış yapan (%28,3) neredeyse aynı
       kazanıyordu — savaşı oyuncu DEĞİL, başlangıç zarı belirliyordu.
       ▶ `rakipPuan = botToplam + referans × oran × gürültü`; bot tabanı iki
         tarafta da aynı, güç farkı yalnız oyuncunun aşacağı EŞİĞİ ölçekler.
       ÖLÇÜLEN SON DURUM (24 savaş, sv20, gümüş III):
         0 yarış → **%0** · 2 yarış → **%0** · 5 yarış → %40 ·
         8 yarış → **%45,8** · 15 yarış → %45   (tahmin 0,395, sapma 0,063)
   S17 Turnuva sahası "ELO'su en yüksek 127 bot" idi → oyuncu DAİMA 128.
       tohum, 40/40 turnuvada ilk turda elenip **0 KP** alıyordu. ▶ Saha artık
       ELO'su bize EN YAKIN 127 bottan kurulur. Ölçüm: 20 turnuvada 11'inde
       tur atlanıyor, ortalama 2.610 KP (dağılım: 1×final, 1×çeyrek, 2×son16,
       3×son32, 4×son64, 9×ilk tur).
   S18 SAVAŞ SIKLIĞI tasarımda hiç yazmıyor. Limitsiz bırakılınca (normal savaş
       24 sa → günde 1) haftalık KP geliri **~11.000** çıkıyordu; sözleşme §6
       "haftalık ~300-800 KP · Takım Forması 10.000 KP" kalibrasyonunu 20 kat
       aşıyor ve klan mağazasını anlamsızlaştırıyordu. ▶ `HAFTALIK_SAVAS_LIMITI
       = 2`. Ölçüm: 3.690 KP/hafta, forma 2,7 haftada. §6'nın kilitlediği
       DÖNÜŞÜM (2.050 KP) değişmedi; ayarlanan tek şey SIKLIK.

   ⚠ Ekran çizen kod YOK (UI = Ajan G). `uiVerisi()` `js/ui.js:8445`
     `CLAN_WAR_UI.drawClanWarScreen(ctx, W, H, warData, t)`'nin beklediği
     şekli birebir üretir (`myClan.*` / `enemyClan.*` / `topPlayers[]`).
   ⚠ Renkler HEX (tuzak #5 — `_drawCard` ve CLAN_WAR_UI accent + 'CC' ekliyor).
   ⚠ Template literal içinde backtick YOK (tuzak #9).
   ⚠ `Klan`/`KlanSim` bare global olabilir → `typeof` ile erişilir (tuzak #10).
   ⚠ Kayıt: yalnız `Klan.durum()` + `Klan.kaydet()` (sözleşme §4). Savaş
     durumu klan nesnesinin `savas` ad alanında tutulur; `SaveData.set`
     DOĞRUDAN çağrılmaz, `saveNow()` HİÇ çağrılmaz (tuzak #12).
   ═══════════════════════════════════════════════════════════════════════ */

const KlanSavas = {
  ad: 'klanSavas',
  surum: '1.0',

  // ───────────────────────── ZAMAN SABİTLERİ ─────────────────────────
  SAAT_MS: 3600000,
  GUN_MS: 86400000,
  HAFTA_MS: 604800000,          // js/social.js:28 ClanWar.weekId() ile AYNI

  // ───────────────── §8.2 SAVAŞ TÜRLERİ ─────────────────
  // ⚠ `enIyiN` = "en iyi N yarışın ortalaması" (§8.4).
  // ⚠ `uye` = savaşa katılan üye sayısı (oyuncu + bot klan arkadaşları).
  TUR: {
    hizli: {
      id: 'hizli', ad: 'Hızlı Savaş', sureMs: 12 * 3600000, uye: 5, enIyiN: 3,
      strateji: 'Hızlı ve agresif.', zorluk: 'Kolay', renk: '#48c48a'
    },
    normal: {
      id: 'normal', ad: 'Normal Savaş', sureMs: 24 * 3600000, uye: 10, enIyiN: 5,
      strateji: 'Dengeli ve stratejik.', zorluk: 'Orta', renk: '#3aa0e8'
    },
    uzun: {
      id: 'uzun', ad: 'Uzun Savaş', sureMs: 48 * 3600000, uye: 15, enIyiN: 8,
      strateji: 'Sabırlı ve tutarlı.', zorluk: 'Zor', renk: '#e8b23a'
    },
    turnuva: {
      id: 'turnuva', ad: 'Turnuva', sureMs: 7 * 86400000, uye: 20, enIyiN: 5,
      strateji: 'Uzun vadeli planlama.', zorluk: 'Çok Zor', renk: '#e0553a',
      kademeli: true                                   // kademeli elenme (§29)
    }
  },
  TUR_SIRA: ['hizli', 'normal', 'uzun', 'turnuva'],

  // ───────────────── §8.4 YARIŞ PUANI ─────────────────
  // Yarış_Puanı = (Mesafe × 0.4) + (Takla × 2) + (Coin × 0.1) + Zaman_Bonusu
  MESAFE_K: 0.4,
  TAKLA_K: 2,
  COIN_K: 0.1,
  // S2: bonus, taban puanın YÜZDESİ olarak uygulanır.
  // "1 dakika altı" = kesin küçük (< 60). "1-2 dakika" 60'ı İÇERİR.
  ZAMAN_BONUS: [
    { enFazlaSn: 60, oran: 0.20, ad: '1 dakika altı' },
    { enFazlaSn: 120, oran: 0.10, ad: '1-2 dakika' },
    { enFazlaSn: 180, oran: 0.05, ad: '2-3 dakika' },
    { enFazlaSn: Infinity, oran: 0.00, ad: '3 dakika üzeri' }
  ],

  // ───────────────── §8.3 EŞLEŞTİRME TOLERANSLARI ─────────────────
  UYE_TOLERANS: 5,              // |fark| < 5 (tasarım: abs(...) < 5)
  PUAN_TOLERANS: 0.20,          // ±%20
  PUAN_MIN_BAND: 5000,          // S4: yeni klan (puan=0) rakipsiz kalmasın
  ADAY_HAVUZ: 5,                // "ilk 5'ten seç"
  LIG_TOLERANS: 1,              // §14.2/5: |lig indeksi farkı| > 1 → İPTAL
  BOT_SAVASTA_ORAN: 0.25,       // botların ~%25'i o hafta zaten savaşta
  BOT_SON_SAVAS_GUN: 14,        // botun son savaşı en fazla 14 gün önce
  ETKIN_UYE_TABAN: 10,          // S13 — savaş kadrosu (normal savaş) tabanı

  // ───────────────── §8.5 SAVAŞ ÖDÜLLERİ ─────────────────
  // 🔴 Ham altın/elmas SADECE dönüşüm girdisidir; oyuncuya KP verilir.
  //    kpCevir(5000,500)=2050 · kpCevir(2500,250)=1025 · kpCevir(1000,100)=410
  // 🔴 H1 (3 Ağu, Ajan H — ÖLÇÜMLE) — KUTU ADETLERİ DÜŞÜRÜLDÜ.
  //    Kutular da KP'dir: sv20'de savaş kutusu ≈ 118 KP, bronz ≈ 14, katılım ≈ 9
  //    (`KlanKutu.kutuBeklenenKp`, 400 örneklem). Eski tablo galibiyette
  //    3 × savaş kutusu = **354 KP** veriyordu; ölçülen haftalık kutu geliri
  //    386 KP idi. Yeni tablo: zafer ödülü TEK Savaş Sandığı (kimliği korur),
  //    beraberlik/mağlubiyet katılım kutusu. Ölçülen: 386 → 127 KP/hafta.
  ODUL: {
    galibiyet: { altin: 5000, elmas: 500, xp: 1000, kutuTur: 'savas', kutuAdet: 1, rozet: 'savasAltin' },
    beraberlik: { altin: 2500, elmas: 250, xp: 500, kutuTur: 'katilim', kutuAdet: 1, rozet: 'savasGumus' },
    maglubiyet: { altin: 1000, elmas: 100, xp: 250, kutuTur: 'katilim', kutuAdet: 1, rozet: null }
  },
  // §14.2 Senaryo 5 telafisi (S10)
  TELAFI: { altin: 1000, elmas: 100 },

  // ═══════════════════════════════════════════════════════════════════════
  //  🔴 H2 (3 Ağu, Ajan H) — SAVAŞ/TURNUVA KP ÖLÇEĞİ
  // ═══════════════════════════════════════════════════════════════════════
  //  ÖLÇÜM (dogrula-klan.js §D "referans hafta", sv20, çarpan 1,50):
  //    görev+kutu (klan-kutu.js) ....  530 KP/hafta
  //    haftalık etkinlik (klan-etkinlik.js)  332
  //    sezon payı (13 haftaya bölünmüş)       48
  //    ───────────────────────────────────  910  ← Ajan D+E, benim dosyam DEĞİL
  //    savaş direkt KP ..............  3.690
  //    savaş kutuları ...............    386
  //    turnuva payı (8/yıl → haftaya)    648
  //    ───────────────────────────────  4.724  ← klan-savas.js = TOPLAMIN %84'ü
  //    TOPLAM ........................ 5.634 KP/hafta
  //  Sözleşme §6 kalibrasyonu: haftalık giriş ~300-800 KP. 5.634 bunun **7×'i**;
  //  en pahalı ürün (Takım Forması, 10.000 KP) 1,8 haftada alınıyordu ve klan
  //  mağazası anlamsızlaşıyordu.
  //
  //  ▶ ÇÖZÜM: dönüşüm oranına (sözleşme §6, `Klan.kpCevir`) DOKUNULMADI —
  //    `odulKpHam()` hâlâ 2.050 / 1.025 / 410 döndürür ve §6 tablosu kilitli
  //    kalır. Ayarlanan tek şey ÖDEME ÖLÇEĞİ. Savaşın asıl ödülü artık
  //    **Savaş Sandığı + rozet + klan XP**; KP yalnız sembolik pay.
  //  ▶ SIKLIK ayrıca `HAFTALIK_SAVAS_LIMITI = 2` ile sınırlı (aşağıda).
  //  ▶ Turnuva ayrı ölçek alır: yılda 8 kez olduğu için tek seferlik tutarı
  //    savaştan büyük kalmalı (şampiyon = 45.000 × çarpan × 0,02 ≈ 1.350 KP).
  //  ÖLÇÜLEN SONUÇ (aynı referans hafta, sv20):
  //    savaş direkt 37 + kutu 127 + turnuva 13 = **177 KP/hafta** (4.724 idi).
  //  ⚠ Bu iki sabit klan sisteminin TEK ekonomi ayar düğmesidir. Değiştirirsen
  //    `node port-araclari/dogrula-klan.js` §D bandını da güncelle.
  ODUL_OLCEK: 0.01,
  TURNUVA_OLCEK: 0.02,

  // 🔴 S18 — HAFTALIK SAVAŞ LİMİTİ (sözleşme §0 "çok yüksek tutar görürsen
  //    hemen düzelt" yetkisiyle EKLENDİ; tasarım savaş SIKLIĞINI hiç yazmıyor).
  //    ÖLÇÜLEN GEREKÇE: normal savaş 24 saat → günde 1 savaş mümkün.
  //      kazanma oranı 0,458 · galibiyet 2.050 KP · mağlubiyet 410 KP
  //      → savaş başına ham beklenti 0,458×2050 + 0,542×410 = 1.161 KP
  //      → `Klan.odulCarpani()` (sv15'te ~1,35) ile ≈ 1.567 KP
  //      → limitsiz: 7 savaş/hafta = **~11.000 KP/hafta**
  //    Sözleşme §6'nın kalibrasyonu: "haftalık ortalama giriş ~300-800 KP,
  //    Takım Forması 10.000 KP → ulaşılabilir ama bedava değil". Limitsiz
  //    savaş formayı 1 haftada verirdi ve klan mağazasını anlamsızlaştırırdı.
  //    ▶ Haftada 2 savaş = ~3.100 KP/hafta. Forma ~3 haftada alınır.
  //    ⚠ §6 tablosunun KİLİTLEDİĞİ dönüşüm (2.050 KP) DEĞİŞTİRİLMEDİ —
  //      ayarlanan tek şey SIKLIK. Bu sabit tek yerdedir, ana oturum
  //      isterse buradan ayarlar.
  HAFTALIK_SAVAS_LIMITI: 2,

  // §8.5 savaş rozetleri (renkler HEX — tuzak #5)
  SAVAS_ROZET: [
    { id: 'savasEfsanevi', ad: 'Efsanevi Savaş Rozeti', renk: '#e06ad2', kosul: '10 galibiyet' },
    { id: 'savasAltin', ad: 'Altın Savaş Rozeti', renk: '#e8b23a', kosul: 'Galibiyet' },
    { id: 'savasGumus', ad: 'Gümüş Savaş Rozeti', renk: '#c8ccd6', kosul: 'Beraberlik' }
  ],
  EFSANEVI_ROZET_ESIK: 10,      // §8.5 "10 galibiyet: Efsanevi savaş rozeti"

  // ───────────────── §8.6 STRATEJİLER (bilgi amaçlı, UI gösterir) ─────────
  STRATEJI: [
    { id: 'agresif', ad: 'Agresif', aciklama: 'Tüm üyeler sürekli yarışır, maksimum puan toplanır.', uygun: 'Hızlı savaşlar, kalabalık klanlar.' },
    { id: 'dengeli', ad: 'Dengeli', aciklama: 'Üyeler belirli aralıklarla yarışır, puanlar dengeli toplanır.', uygun: 'Normal savaşlar, orta büyüklükte klanlar.' },
    { id: 'sabirli', ad: 'Sabırlı', aciklama: 'Üyeler sadece en iyi yarışlarını yapar, puanlar yüksek tutulur.', uygun: 'Uzun savaşlar, küçük klanlar.' },
    { id: 'sonDakika', ad: 'Son Dakika', aciklama: 'Savaşın son saatlerinde yoğun yarış yapılır.', uygun: 'Tüm savaş türleri, sürpriz etkisi.' }
  ],

  // ───────────────── §29 TURNUVA ─────────────────
  TURNUVA_YILDA: 8,             // §29.1 "yılda 8 kez"
  TURNUVA_ASAMA: [
    { id: 'eleme', ad: 'Açık Elemeler', gun: 3, kalan: 128, aciklama: 'Tüm klanlar katılır; en yüksek puanlı ilk 128 klan üst tura çıkar.' },
    { id: 'grup', ad: 'Grup Aşaması', gun: 4, kalan: 32, aciklama: '128 klan 16 gruba ayrılır (8+8). Grup birincileri + en iyi 8 ikinci son 32.' },
    { id: 'elemeTuru', ad: 'Eleme Turları', gun: 10, kalan: 2, aciklama: 'Son 32 → Son 16 → Çeyrek → Yarı → Final. Her tur 2 gün.' },
    { id: 'final', ad: 'Büyük Final', gun: 3, kalan: 1, aciklama: 'Özel harita, özel kurallar, seyirci modu.' }
  ],
  TURNUVA_GRUP: 16,             // §29.2 "16 grup"
  TURNUVA_GRUP_BOY: 8,          // "8'er klan"
  TURNUVA_ELEME_TUR_GUN: 2,

  // §29.3 ödül tablosu — ham altın/elmas YALNIZ dönüşüm girdisi.
  // kpCevir: 45.000 / 22.500 / 11.000 / 4.500 / 2.250 / 1.100
  // S6: "Tüm Üyelere Özel Araç" KALDIRILDI → kozmetik amblem.
  TURNUVA_ODUL: [
    { enFazla: 1, ad: 'Şampiyon', altin: 500000, elmas: 10000, xp: 50000, kozmetik: 'efsanevi_turnuva_kupasi', banner: 'sampiyon_banner', renk: '#e8b23a' },
    { enFazla: 2, ad: 'Finalist', altin: 250000, elmas: 5000, xp: 25000, kozmetik: 'altin_turnuva_kupasi', banner: null, renk: '#c8ccd6' },
    { enFazla: 4, ad: 'Yarı Finalist', altin: 100000, elmas: 2500, xp: 15000, kozmetik: 'gumus_turnuva_kupasi', banner: null, renk: '#b07a4a' },
    { enFazla: 8, ad: 'Çeyrek Finalist', altin: 50000, elmas: 1000, xp: 10000, kozmetik: 'bronz_turnuva_kupasi', banner: null, renk: '#8a93a8' },
    { enFazla: 16, ad: 'Son 16', altin: 25000, elmas: 500, xp: 5000, kozmetik: 'katilim_rozeti', banner: null, renk: '#3aa0e8' },
    { enFazla: 32, ad: 'Son 32', altin: 10000, elmas: 250, xp: 2500, kozmetik: 'katilim_rozeti', banner: null, renk: '#48c48a' }
  ],
  TURNUVA_TUR_ADI: {
    128: 'Son 128', 64: 'Son 64', 32: 'Son 32', 16: 'Son 16',
    8: 'Çeyrek Final', 4: 'Yarı Final', 2: 'Final'
  },

  // ───────────────── §40.2 YASAL KEŞİF/CASUSLUK ─────────────────
  KESIF_UCRET: 100,             // Keşif Görevi — 100 KP
  IZLEME_UCRET: 0,              // Savaş İzleme — ücretsiz
  ACIK_KAYNAK_UCRET: 0,         // Açık Kaynak İstihbaratı — ücretsiz
  SIMULASYON_UCRET: 500,        // Savaş Simülasyonu — 500 KP
  // §40.4 (tek uygulanabilir madde): yeni üye 72 saat savaşa katılamaz
  GOZLEM_MS: 72 * 3600000,

  // ───────────────── DURUM MAKİNESİ ─────────────────
  DURUMLAR: ['beklemede', 'eslesme', 'aktif', 'bitti', 'oduller_alindi'],
  _GECIS: {
    beklemede: ['eslesme'],
    eslesme: ['aktif', 'beklemede'],      // beklemede = iptal (lig uyuşmazlığı)
    aktif: ['bitti'],
    bitti: ['oduller_alindi'],
    oduller_alindi: []
  },

  // ───────────────── HATA KODLARI ─────────────────
  HATA: {
    ERR_S01: 'Klanın yok.',
    ERR_S02: 'Klan savaşı seviye 15\'te açılır.',
    ERR_S03: 'Geçersiz savaş türü.',
    ERR_S04: 'Zaten aktif bir savaşın var.',
    ERR_S05: 'Uygun rakip bulunamadı.',
    ERR_S06: 'Eşleştirme hatası nedeniyle savaş iptal edildi.',
    ERR_S07: 'Aktif savaş yok.',
    ERR_S08: 'Savaş henüz bitmedi.',
    ERR_S09: 'Ödüller zaten alındı.',
    ERR_S10: 'Geçersiz durum geçişi.',
    ERR_S11: 'Klan Parası yetersiz.',
    ERR_S12: 'Rakip klan bulunamadı.',
    ERR_S13: 'Yeni üye gözlem süresi (72 saat) dolmadı.',
    ERR_S14: 'Savaş süresi doldu, yeni yarış eklenemez.',
    ERR_S15: 'Bu hafta savaş hakkın kalmadı.'
  },

  AMBLEM_EMOJI: ['\u{1F981}', '⚡', '\u{1F6E1}️', '\u{1F525}', '⚔️', '\u{1F3C1}',
    '\u{1F40E}', '\u{1F985}', '\u{1F433}', '\u{1F31F}', '\u{1F480}', '\u{1F3AF}'],

  // ═══════════════════════════════════════════════════════════════
  //  TEMEL YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
  _testZaman: null,
  _simdi() { return this._testZaman != null ? this._testZaman : Date.now(); },
  _sayi(v, vars) { const n = Number(v); return isFinite(n) ? n : (vars || 0); },
  _kis(v, alt, ust) { return v < alt ? alt : (v > ust ? ust : v); },
  _hata(kod, ek) {
    const r = { ok: false, hata: kod, mesaj: this.HATA[kod] || '' };
    if (ek) for (const a in ek) if (Object.prototype.hasOwnProperty.call(ek, a)) r[a] = ek[a];
    return r;
  },
  _tamam(ek) {
    const r = { ok: true, hata: null, mesaj: '' };
    if (ek) for (const a in ek) if (Object.prototype.hasOwnProperty.call(ek, a)) r[a] = ek[a];
    return r;
  },

  // Bare global erişimi (tuzak #10) — `window.Klan` undefined OLABİLİR.
  _K() {
    try {
      if (typeof Klan !== 'undefined' && Klan) return Klan;
    } catch (e) { /* ReferenceError → aşağıya düş */ }
    return (typeof window !== 'undefined' && window.Klan) ? window.Klan : null;
  },
  _S() {
    try {
      if (typeof KlanSim !== 'undefined' && KlanSim) return KlanSim;
    } catch (e) { /* ReferenceError */ }
    return (typeof window !== 'undefined' && window.KlanSim) ? window.KlanSim : null;
  },
  _Kutu() {
    try {
      if (typeof KlanKutu !== 'undefined' && KlanKutu) return KlanKutu;
    } catch (e) { /* ReferenceError */ }
    return (typeof window !== 'undefined' && window.KlanKutu) ? window.KlanKutu : null;
  },

  // ── TOHUMLU ÜRETEÇ ────────────────────────────────────────────────────
  // mulberry32 — `js/procgen.js` `_pg_rng` / `KlanSim._rng` ile AYNI algoritma.
  _rng(tohum) {
    let a = (tohum >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // FNV-1a — 🔴 `Math.imul` ile. `js/liveops.js:32` düz çarpımlı sürümü
  // KOPYALANMADI (sözleşme §7; C# portunda uint ile birebir eşleşsin diye).
  _hash32(metin) {
    const s = String(metin);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  },

  haftaId(zaman) {
    const S = this._S();
    if (S && typeof S.haftaId === 'function' && zaman == null && this._testZaman == null) return S.haftaId();
    const t = (zaman == null) ? this._simdi() : this._sayi(zaman, 0);
    return Math.floor(t / this.HAFTA_MS);
  },

  // ═══════════════════════════════════════════════════════════════
  //  KAYIT — savaş durumu klan nesnesinin `savas` ad alanında
  //  🔴 `SaveData.set` DOĞRUDAN çağrılmaz (sözleşme §4), `saveNow` HİÇ.
  // ═══════════════════════════════════════════════════════════════
  _bosDurum() {
    return {
      durum: 'beklemede',
      savasNo: 0,
      aktif: null,            // { ...savaş nesnesi }
      gecmis: [],             // son 20 savaş özeti
      toplam: 0, galibiyet: 0, beraberlik: 0, maglubiyet: 0, seri: 0,
      yarisOrt: 0,            // S14 — öğrenilen referans (EMA)
      yarisAdet: 0,
      haftaSavasHafta: -1,    // S18 — haftalık savaş sayacı
      haftaSavasSayac: 0,
      elo: 1000,              // KlanSim.ELO_TABAN
      sonSavas: 0,
      rozetler: [],
      beklemedeKutular: [],   // KlanKutu henüz yoksa burada birikir
      turnuva: null,
      kesifler: []            // son keşif raporları (en fazla 10)
    };
  },
  _st() {
    const K = this._K();
    if (!K || typeof K.al !== 'function') return null;
    const k = K.al();
    if (!k) return null;
    if (!k.savas || typeof k.savas !== 'object') k.savas = this._bosDurum();
    const d = k.savas;
    // Şema onarımı (eski kayıt / kısmi nesne)
    const bos = this._bosDurum();
    for (const a in bos) {
      if (!Object.prototype.hasOwnProperty.call(bos, a)) continue;
      if (d[a] === undefined || d[a] === null) {
        if (Array.isArray(bos[a])) { if (!Array.isArray(d[a])) d[a] = []; }
        else if (a !== 'aktif' && a !== 'turnuva') d[a] = bos[a];
        else if (d[a] === undefined) d[a] = null;
      }
    }
    if (this.DURUMLAR.indexOf(d.durum) < 0) d.durum = 'beklemede';
    return d;
  },
  _kaydet() {
    const K = this._K();
    if (K && typeof K.kaydet === 'function') K.kaydet();
    return true;
  },
  _duyuru(tip, metin, veri) {
    const K = this._K();
    if (K && typeof K.duyuru === 'function') return K.duyuru(tip, metin, veri);
    return null;
  },

  // ═══════════════════════════════════════════════════════════════
  //  DURUM MAKİNESİ
  // ═══════════════════════════════════════════════════════════════
  gecisGecerli(eski, yeni) {
    const l = this._GECIS[eski];
    return !!l && l.indexOf(yeni) >= 0;
  },
  _gec(d, yeni) {
    if (!this.gecisGecerli(d.durum, yeni)) return false;
    d.durum = yeni;
    if (d.aktif) d.aktif.durum = yeni;
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  §8.4 — YARIŞ PUANI
  // ═══════════════════════════════════════════════════════════════
  // Zaman bonusu ORANI (S2: taban puanın yüzdesi).
  zamanBonusu(sureSn) {
    const s = Math.max(0, this._sayi(sureSn, 1e9));
    for (let i = 0; i < this.ZAMAN_BONUS.length; i++) {
      if (s < this.ZAMAN_BONUS[i].enFazlaSn) return this.ZAMAN_BONUS[i].oran;
    }
    return 0;
  },
  zamanBonusAdi(sureSn) {
    const s = Math.max(0, this._sayi(sureSn, 1e9));
    for (let i = 0; i < this.ZAMAN_BONUS.length; i++) {
      if (s < this.ZAMAN_BONUS[i].enFazlaSn) return this.ZAMAN_BONUS[i].ad;
    }
    return this.ZAMAN_BONUS[this.ZAMAN_BONUS.length - 1].ad;
  },
  // Yarış_Puanı = ((Mesafe×0.4)+(Takla×2)+(Coin×0.1)) × (1 + Zaman_Bonusu)
  yarisPuani(mesafe, takla, coin, sureSn) {
    const m = Math.max(0, this._sayi(mesafe, 0));
    const t = Math.max(0, this._sayi(takla, 0));
    const c = Math.max(0, this._sayi(coin, 0));
    const taban = m * this.MESAFE_K + t * this.TAKLA_K + c * this.COIN_K;
    const oran = this.zamanBonusu(sureSn);
    return Math.round(taban * (1 + oran));
  },
  yarisPuaniDetay(mesafe, takla, coin, sureSn) {
    const m = Math.max(0, this._sayi(mesafe, 0));
    const t = Math.max(0, this._sayi(takla, 0));
    const c = Math.max(0, this._sayi(coin, 0));
    const taban = m * this.MESAFE_K + t * this.TAKLA_K + c * this.COIN_K;
    const oran = this.zamanBonusu(sureSn);
    return {
      mesafePuan: Math.round(m * this.MESAFE_K * 100) / 100,
      taklaPuan: Math.round(t * this.TAKLA_K * 100) / 100,
      coinPuan: Math.round(c * this.COIN_K * 100) / 100,
      taban: Math.round(taban * 100) / 100,
      bonusOran: oran,
      bonusAd: this.zamanBonusAdi(sureSn),
      bonusPuan: Math.round(taban * oran * 100) / 100,
      puan: Math.round(taban * (1 + oran))
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §8.4 — SAVAŞ PUANI (her üyenin en iyi N yarışının ORTALAMASI, toplanır)
  // ═══════════════════════════════════════════════════════════════
  // Girdi: [[p,p,p...], [p,p...], ...]  (üye başına yarış puanları)
  // 🔴 S3: BÖLEN DAİMA N'dir. Üye 5 yarış yerine 2 yarış yaptıysa ortalaması
  //    (p1+p2)/5 olur — §8.4'ün "tutarlı performans" teşviki tam olarak budur.
  //    (Gerçek sayıya bölen sürüm ölçümle elendi: 2 yarış ile 12 yarış aynı
  //    kazanma oranını veriyordu.)
  savasPuani(uyeYarislari, enIyiN) {
    const n = Math.max(1, Math.floor(this._sayi(enIyiN, 5)));
    const liste = Array.isArray(uyeYarislari) ? uyeYarislari : [];
    let toplam = 0;
    const uyeOrt = [];
    for (let i = 0; i < liste.length; i++) {
      const ham = Array.isArray(liste[i]) ? liste[i] : [];
      const say = [];
      for (let j = 0; j < ham.length; j++) {
        const v = Number(ham[j]);
        if (isFinite(v)) say.push(v);
      }
      // AZALAN sırala (tuzak D17: yön ters giderse sessizce yanlış sonuç)
      say.sort(function (a, b) { return b - a; });
      const al = say.slice(0, n);
      const ort = al.reduce(function (a, b) { return a + b; }, 0) / n;   // bölen DAİMA n
      uyeOrt.push(Math.round(ort * 100) / 100);
      toplam += ort;
    }
    return { toplam: Math.round(toplam * 100) / 100, uyeOrt: uyeOrt, enIyiN: n };
  },

  // ═══════════════════════════════════════════════════════════════
  //  BİZİM KLAN ÖZETİ (KlanSim'in beklediği şekil)
  // ═══════════════════════════════════════════════════════════════
  _oyuncuSeviye() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData && SaveData.data) {
        return Math.max(1, Number(SaveData.data.playerLevel) || 1);
      }
    } catch (e) { /* bare global yok */ }
    return 1;
  },
  // ═══════════════════════════════════════════════════════════════
  //  🔴 S13 — OYUNCU KLANININ "ORTALAMA ÜYE KATKISI"
  //  `KlanSim.klanGucu` bu alanı okur ve savaş kazanma olasılığını buradan
  //  türetir. Oyuncunun klanı bot klanlarla AYNI PARA BİRİMİNDE olmalı.
  //  ÜÇ formül denendi, ikisi ölçümle ELENDİ:
  //   (a) `haftalikPuan / gercekUye`  → üye sayısı 1 olduğu için 9.000 çıktı
  //       (botlar ~900) → kazanma olasılığı 1,0000 (%100). ELENDİ.
  //   (b) `referansPuan()`            → o SAVAŞ YARIŞI ölçeğinde (1.700-11.000),
  //       botlarınki HAFTALIK PUAN ölçeğinde (300-2.000) → ölçülen kazanma
  //       oranı %77-100, tahmin 0,93. ELENDİ.
  //   (c) `haftalikPuan / etkinUye`   → `Klan.katkiEkle` her yarışta
  //       haftalikPuan'ı yarış puanı kadar artırdığı için 60 savaş sonunda
  //       ortKatki 63.643'e çıktı, güç 31.859 → %98-100 kazanma. ELENDİ.
  //  ▶ KULLANILAN: aynı ligdeki BOTLARIN ortKatki MEDYANI × lig içi konum.
  //    Tek ortak para birimi lig puanıdır; oyuncu klanı ligindeki tipik klanla
  //    kıyaslanır, lig bandındaki konumuna göre 0,75×-1,25× ölçeklenir.
  //    Klan seviyesi ve savaş galibiyet oranı `klanGucu`da ZATEN ayrı terim.
  _medyanOnbellek: {},
  ligMedyanOrtKatki(ligId, haftaId) {
    const S = this._S();
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const anahtar = String(ligId) + '@' + h;
    if (Object.prototype.hasOwnProperty.call(this._medyanOnbellek, anahtar)) return this._medyanOnbellek[anahtar];
    const botlar = (S && typeof S.botKlanlar === 'function') ? S.botKlanlar(h) : [];
    const l = [];
    for (let i = 0; i < botlar.length; i++) {
      if (botlar[i].lig !== ligId) continue;
      const uye = Math.max(1, this._sayi(botlar[i].uyeSayisi, 1));
      const ok = this._sayi(botlar[i].ortKatki, 0) || (this._sayi(botlar[i].haftalikPuan, 0) / uye);
      if (ok > 0) l.push(ok);
    }
    l.sort(function (a, b) { return a - b; });
    const m = l.length ? (l.length % 2 ? l[(l.length - 1) / 2] : (l[l.length / 2 - 1] + l[l.length / 2]) / 2) : 0;
    // Önbellek sınırlı (bellek sızıntısı dersi: UI._toasts 159 elemana çıkmıştı)
    const anahtarlar = Object.keys(this._medyanOnbellek);
    if (anahtarlar.length > 24) delete this._medyanOnbellek[anahtarlar[0]];
    this._medyanOnbellek[anahtar] = m;
    return m;
  },
  // Lig bandındaki konum 0..1 (Efsane'nin üst sınırı Infinity → tavan eklenir)
  ligBandKonumu(ligId, ligPuan) {
    const S = this._S();
    if (!S || !Array.isArray(S.LIG)) return 0.5;
    const ix = this._ligIx(ligId);
    if (ix < 0) return 0.5;
    const L = S.LIG[ix];
    const ust = (L.max === Infinity) ? (L.min + this._sayi(S.EFSANE_TAVAN_EK, 3000000)) : L.max;
    const genislik = Math.max(1, ust - L.min);
    return this._kis((this._sayi(ligPuan, 0) - L.min) / genislik, 0, 1);
  },
  // ⚠ Bant ÖLÇÜLEREK ayarlandı. [0,75 · 1,25] ile 60 savaşta kazanma oranı
  //   %15-18 çıkıyordu (oyuncu lig bandının DİBİNDE başladığı için sürekli
  //   medyanın altında kalıyor). [0,95 · 1,30] ile hedef banda oturdu.
  //   `selfTest.kazanmaOraniDengeli` bunu 40 savaş koşarak KİLİTLER.
  KONUM_TABAN: 0.95,
  KONUM_ARALIK: 0.35,
  ligOlcekliOrtKatki(ligId, ligPuan) {
    const medyan = this.ligMedyanOrtKatki(ligId);
    if (!(medyan > 0)) return 0;
    const konum = this.ligBandKonumu(ligId, ligPuan);
    return Math.round(medyan * (this.KONUM_TABAN + this.KONUM_ARALIK * konum));
  },

  bizimKlanOzet() {
    const K = this._K();
    const d = this._st();
    const k = (K && typeof K.al === 'function') ? K.al() : null;
    const S = this._S();
    const ligPuan = k ? this._sayi(k.ligPuan, 0) : 0;
    const haftalik = k ? this._sayi(k.haftalikPuan, 0) : 0;
    const gercekUye = (k && Array.isArray(k.uyeler)) ? k.uyeler.length : 1;
    // 🔴 S13 — savaş kadrosu tabanı. Savaşa 5-20 üye giriyorken klanı 1 üyeli
    //    saymak hem ±5 üye kriterini hem klan gücünü bozuyordu.
    const uyeSayisi = Math.max(gercekUye, this.ETKIN_UYE_TABAN);
    const seviye = (K && typeof K.seviye === 'function' && K.var && K.var()) ? K.seviye() : 1;
    const ligId = (S && typeof S.ligBul === 'function') ? S.ligBul(ligPuan).id : 'bronz3';
    const gecmis = d ? { toplam: d.toplam, galibiyet: d.galibiyet, maglubiyet: d.maglubiyet, seri: d.seri }
      : { toplam: 0, galibiyet: 0, maglubiyet: 0, seri: 0 };
    const ulke = (S && typeof S.oyuncuUlkesi === 'function') ? S.oyuncuUlkesi() : 'TR';
    return {
      id: k ? k.id : 'oyuncu-klan',
      ad: k ? k.ad : 'Klanın',
      etiket: k ? k.etiket : '',
      amblem: k ? this._sayi(k.amblem, 0) : 0,
      renk1: (k && typeof k.renk1 === 'string' && k.renk1.charAt(0) === '#') ? k.renk1 : '#e8b23a',
      renk2: (k && typeof k.renk2 === 'string' && k.renk2.charAt(0) === '#') ? k.renk2 : '#1d2a44',
      seviye: seviye,
      lig: ligId,
      ligPuan: ligPuan,
      haftalikPuan: haftalik,
      uyeSayisi: uyeSayisi,
      gercekUye: gercekUye,
      aktifUye: uyeSayisi,
      elo: d ? this._sayi(d.elo, 1000) : 1000,
      ulkeKodu: ulke,
      bolge: (S && typeof S.bolge === 'function') ? S.bolge(ulke) : 'avrupa',
      // 🔴 S13 — bkz. `ligOlcekliOrtKatki()`. ÜÇ formül denendi, ikisi ÖLÇÜMLE
      //    elendi (rakamlar orada).
      ortKatki: this.ligOlcekliOrtKatki(ligId, ligPuan),
      savasGecmisi: gecmis,
      oyuncu: true, bot: false
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §8.3 — EŞLEŞTİRME (6 KRİTER, TOHUMLU)
  // ═══════════════════════════════════════════════════════════════
  // Bot klanın "aktif savaşı var mı" — tohumlu (hafta + klan id).
  _botSavasta(bot, haftaId) {
    const rnd = this._rng(this._hash32('botsavas:' + haftaId + ':' + String(bot && bot.id)));
    return rnd() < this.BOT_SAVASTA_ORAN;
  },
  // Bot klanın son savaş tarihi — tohumlu, son 14 gün içinde.
  _botSonSavas(bot, haftaId) {
    const rnd = this._rng(this._hash32('sonsavas:' + haftaId + ':' + String(bot && bot.id)));
    const hafta = haftaId * this.HAFTA_MS;
    return hafta - Math.floor(rnd() * this.BOT_SON_SAVAS_GUN * this.GUN_MS);
  },
  _ligIx(ligId) {
    const S = this._S();
    if (S && typeof S.ligIndeksi === 'function') return S.ligIndeksi(ligId);
    return 0;
  },

  // `esles(tur, haftaId)` → { ok, rakip, kriterler, gevsetilen, adaySayilari, kaynak }
  // 🔴 6. adım tohumludur; aynı (haftaId, savasNo, tur) → aynı rakip.
  esles(tur, haftaId, savasNo) {
    const S = this._S();
    const T = this.TUR[tur] || this.TUR.normal;
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const no = (savasNo == null) ? this._sonrakiSavasNo() : Math.floor(this._sayi(savasNo, 0));
    const biz = this.bizimKlanOzet();
    const botlar = (S && typeof S.botKlanlar === 'function') ? S.botKlanlar(h) : [];
    const kriter = {
      lig: false, aktifSavas: false, uyeSayisi: false,
      sonSavasSirasi: false, puanFarki: false, ilk5Rastgele: false
    };
    const gevsetilen = [];
    const sayilar = {};
    const self = this;

    if (!botlar.length) return { ok: false, hata: 'ERR_S05', rakip: null, kriterler: kriter, gevsetilen: gevsetilen, adaySayilari: sayilar, kaynak: 'yok' };

    // 1) LİG BAZINDA EŞLEŞTİR
    let aday = botlar.filter(function (b) { return b.lig === biz.lig && b.id !== biz.id; });
    kriter.lig = true;
    sayilar.lig = aday.length;
    if (!aday.length) {
      gevsetilen.push('lig');                       // S4
      const bizIx = this._ligIx(biz.lig);
      aday = botlar.filter(function (b) {
        return Math.abs(self._ligIx(b.lig) - bizIx) <= self.LIG_TOLERANS && b.id !== biz.id;
      });
      sayilar.ligGevsek = aday.length;
    }
    if (!aday.length) { aday = botlar.slice(); sayilar.ligTumu = aday.length; }

    // 2) AKTİF SAVAŞI OLANLARI ELE
    let a2 = aday.filter(function (b) { return !self._botSavasta(b, h); });
    kriter.aktifSavas = true;
    sayilar.aktifSavas = a2.length;
    if (!a2.length) { gevsetilen.push('aktifSavas'); a2 = aday; }

    // 3) ÜYE SAYISI ±5
    let a3 = a2.filter(function (b) {
      return Math.abs(self._sayi(b.uyeSayisi, 0) - biz.uyeSayisi) < self.UYE_TOLERANS;
    });
    kriter.uyeSayisi = true;
    sayilar.uyeSayisi = a3.length;
    if (!a3.length) { gevsetilen.push('uyeSayisi'); a3 = a2; }

    // 4) SON SAVAŞ TARİHİNE GÖRE (EN ESKİ ÖNCE) — kararlı (id tie-break)
    const a4 = a3.slice().sort(function (x, y) {
      const fx = self._botSonSavas(x, h), fy = self._botSonSavas(y, h);
      if (fx !== fy) return fx - fy;
      return String(x.id) < String(y.id) ? -1 : (String(x.id) > String(y.id) ? 1 : 0);
    });
    kriter.sonSavasSirasi = true;
    sayilar.sirali = a4.length;

    // 5) HAFTALIK PUAN FARKI ±%20 (S4: taban bant ile korunmuş)
    const band = Math.max(biz.haftalikPuan * this.PUAN_TOLERANS, this.PUAN_MIN_BAND);
    let a5 = a4.filter(function (b) {
      return Math.abs(self._sayi(b.haftalikPuan, 0) - biz.haftalikPuan) < band;
    });
    kriter.puanFarki = true;
    sayilar.puanFarki = a5.length;
    if (!a5.length) { gevsetilen.push('puanFarki'); a5 = a4; }

    // 6) İLK 5'TEN TOHUMLU SEÇİM (🔴 Math.random DEĞİL)
    const ilk = a5.slice(0, this.ADAY_HAVUZ);
    sayilar.havuz = ilk.length;
    let sec = null, kaynak = 'algoritma';
    if (ilk.length) {
      const rnd = this._rng(this._hash32('esles:' + h + ':' + no + ':' + T.id));
      sec = ilk[Math.floor(rnd() * ilk.length) % ilk.length];
      kriter.ilk5Rastgele = true;
    }
    // Son çare: KlanSim.esRakip (bölge + ELO yakınlığı)
    if (!sec && S && typeof S.esRakip === 'function') {
      sec = S.esRakip(biz, h);
      kaynak = 'esRakip';
      gevsetilen.push('havuz');
    }
    if (!sec) return { ok: false, hata: 'ERR_S05', rakip: null, kriterler: kriter, gevsetilen: gevsetilen, adaySayilari: sayilar, kaynak: 'yok' };

    const kopya = {};
    for (const a in sec) if (Object.prototype.hasOwnProperty.call(sec, a)) kopya[a] = sec[a];
    kopya.sonSavas = this._botSonSavas(sec, h);
    return {
      ok: true, hata: null, rakip: kopya, kriterler: kriter,
      gevsetilen: gevsetilen, adaySayilari: sayilar, kaynak: kaynak, haftaId: h, savasNo: no
    };
  },

  // §14.2 Senaryo 5 — lig uyuşmazlığı denetimi (savaş BAŞLAMADAN önce)
  ligUyumlu(rakip) {
    const biz = this.bizimKlanOzet();
    const bi = this._ligIx(biz.lig), ri = this._ligIx(rakip && rakip.lig);
    if (bi < 0 || ri < 0) return { uyumlu: false, fark: 99, bizLig: biz.lig, rakipLig: rakip ? rakip.lig : null };
    return { uyumlu: Math.abs(bi - ri) <= this.LIG_TOLERANS, fark: Math.abs(bi - ri), bizLig: biz.lig, rakipLig: rakip.lig };
  },

  // ═══════════════════════════════════════════════════════════════
  //  BOT ÜYE KATKILARI + RAKİP PUANI (TOHUMLU — S5)
  // ═══════════════════════════════════════════════════════════════
  // Bir üyenin "beklenen" savaş puanı = REFERANS.
  // 🔴 S14 (ölçümle bulundu): sabit formül (260 + klanSv×14 + oySv×6 ≈ 840)
  //    oyuncunun GERÇEK yarış puanıyla (3.000-9.000) aynı para biriminde
  //    değildi. Sonuç: sv20 klanı %10,8 kazanıyor, sv45 klanı %100 kazanıyordu
  //    ve 500 KP'lik "Savaş Simülasyonu" tahmini (%26) gerçekle (%11 / %100)
  //    hiç uyuşmuyordu — yani oyuncuya YANLIŞ bilgi satılıyordu.
  //    ▶ Referans artık oyuncunun KENDİ savaş yarışı ortalamasından öğrenilir
  //      (EMA, alfa 0,15). İlk savaşta geçmiş yok → eski formül ÖNYÜKLEME
  //      değeri olarak kullanılır, sonra kendini kalibre eder.
  //    ⚠ Lastik bant DEĞİL: referans savaş BAŞLARKEN dondurulur, savaş içinde
  //      güncellenmez (`yarisEkle` yalnız GELECEK savaşları etkiler).
  REFERANS_EMA: 0.15,
  _onyuklemeReferans() {
    const K = this._K();
    const klanSv = (K && typeof K.seviye === 'function' && K.var && K.var()) ? K.seviye() : 1;
    const oySv = this._oyuncuSeviye();
    return 260 + klanSv * 14 + oySv * 6;
  },
  referansPuan() {
    const d = this._st();
    const ort = d ? this._sayi(d.yarisOrt, 0) : 0;
    return (ort > 0) ? ort : this._onyuklemeReferans();
  },
  _referansOgren(puan) {
    const d = this._st();
    if (!d) return 0;
    const p = Math.max(0, this._sayi(puan, 0));
    const ort = this._sayi(d.yarisOrt, 0);
    d.yarisAdet = this._sayi(d.yarisAdet, 0) + 1;
    d.yarisOrt = (ort > 0) ? (ort + (p - ort) * this.REFERANS_EMA) : p;
    return d.yarisOrt;
  },
  // §40.4 tek uygulanan madde: 72 saatten yeni üye savaşa katılamaz.
  savasaKatilabilirMi(uye, zaman) {
    if (!uye) return false;
    const t = (zaman == null) ? this._simdi() : this._sayi(zaman, 0);
    return (t - this._sayi(uye.katilim, 0)) >= this.GOZLEM_MS;
  },
  // Oyuncu HARİÇ, savaşa katılan üyelerin tohumlu katkısı.
  botKatkilari(tur, savasNo, haftaId, zaman) {
    const T = this.TUR[tur] || this.TUR.normal;
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const no = Math.floor(this._sayi(savasNo, 0));
    const t = (zaman == null) ? this._simdi() : this._sayi(zaman, 0);
    const K = this._K();
    const gercek = (K && typeof K.uyeler === 'function') ? K.uyeler() : [];
    const ref = this.referansPuan();
    const rnd = this._rng(this._hash32('botkatki:' + h + ':' + no + ':' + T.id));
    const adet = Math.max(0, T.uye - 1);              // oyuncu hariç
    const liste = [];
    let gozlemEngeli = 0;
    for (let i = 0; i < adet; i++) {
      // Gerçek klan üyesi varsa onun adını/kimliğini kullan, yoksa hayalet üye.
      const g = gercek[i + 1] || null;                // 0 = oyuncu
      const id = g ? String(g.id) : ('bot' + i);
      const ad = g ? String(g.ad) : ('Üye ' + (i + 1));
      const carpan = 0.45 + rnd() * 1.00;             // 0,45× .. 1,45×
      let puan = Math.round(ref * carpan);
      if (g && !this.savasaKatilabilirMi(g, t)) { puan = 0; gozlemEngeli++; }   // §40.4
      liste.push({ id: id, ad: ad, puan: puan, bot: true });
    }
    return { uyeler: liste, toplam: liste.reduce(function (a, b) { return a + b.puan; }, 0), gozlemEngeli: gozlemEngeli, referans: ref };
  },
  // Rakibin toplam puanı — savaş başlarken SABİTLENİR (S5: lastik bant yok).
  // ⚠ `botToplam` VERİLMELİ: bizim beklenen toplamımız "botların GERÇEK
  //   (tohumlu) toplamı + oyuncunun tipik tek katkısı"dır.
  //   🔴 S15 (ölçümle bulundu): önce `referansPuan × T.uye` yazılmıştı. Bot
  //      çarpanları 0,45-1,45 (ortalama 0,95) ve bot sayısı T.uye−1 olduğu
  //      için gerçek beklenti 9,55×ref idi, formül 10×ref diyordu → p=0,50'de
  //      bile rakip %4,7 önde başlıyordu. Sistematik kayıp yanlılığı.
  rakipPuanHesapla(rakip, tur, savasNo, haftaId, botToplam) {
    const S = this._S();
    const T = this.TUR[tur] || this.TUR.normal;
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const no = Math.floor(this._sayi(savasNo, 0));
    const biz = this.bizimKlanOzet();
    let p = 0.5;
    if (S && typeof S.savasKazanmaOlasiligi === 'function') {
      p = this._kis(this._sayi(S.savasKazanmaOlasiligi(biz, rakip).olasilik, 0.5), 0.05, 0.95);
    }
    // Kazanma olasılığı p ise rakip/biz puan oranı ≈ (1-p)/p. p=0,5 → 1,00.
    const oran = this._kis((1 - p) / p, 0.55, 1.80);
    const ref = this.referansPuan();
    const bt = (botToplam == null) ? (ref * 0.95 * Math.max(0, T.uye - 1)) : this._sayi(botToplam, 0);
    const bizBeklenen = bt + ref;
    const rnd = this._rng(this._hash32('rakippuan:' + h + ':' + no + ':' + T.id + ':' + String(rakip && rakip.id)));
    const gurultu = 0.85 + rnd() * 0.30;
    // 🔴 S16 (ölçümle bulundu) — RAKİP PUANI = BOT TABANI + OYUNCU EŞİĞİ.
    //   Önce `(bt + ref) × oran` yazılmıştı. Bot kütlesi (8,55×ref) sabit
    //   olduğu için `oran` o kütleyle de çarpılıyordu: oran=1,20'de oyuncunun
    //   kendi ortalamasının 2,91 KATINI atması gerekiyordu, oran=0,90'da ise
    //   hiç yarışmasa bile kazanıyordu. Sonuç ÖLÇÜLDÜ: 2 yarış yapan oyuncu
    //   (%25,0) ile 12 yarış yapan (%28,3) neredeyse aynı oranda kazanıyordu
    //   — savaşın sonucu oyuncunun oynamasına DEĞİL, başlangıç zarına bağlıydı.
    //   ▶ Doğrusu: bot tabanı iki tarafta da AYNI, güç farkı yalnız oyuncunun
    //     aşması gereken EŞİĞİ ölçekler. Kazanma koşulu sadeleşir:
    //     (en iyi N ortalaması) > referans × oran × gürültü.
    const esik = ref * oran * gurultu;
    return {
      puan: Math.max(1, Math.round(bt + esik)),
      olasilik: Math.round(p * 10000) / 10000,
      oran: Math.round(oran * 1000) / 1000,
      esik: Math.round(esik),
      botTaban: Math.round(bt),
      bizBeklenen: Math.round(bizBeklenen)
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  SAVAŞ AKIŞI
  // ═══════════════════════════════════════════════════════════════
  _sonrakiSavasNo() {
    const d = this._st();
    return d ? this._sayi(d.savasNo, 0) + 1 : 1;
  },
  aktifSavas() {
    const d = this._st();
    return (d && d.aktif) ? d.aktif : null;
  },
  // S18 — bu hafta kaç savaş hakkı kaldı? (hafta dönünce kendiliğinden sıfırlanır)
  haftalikKalanSavas() {
    const d = this._st();
    if (!d) return 0;
    const h = this.haftaId();
    if (this._sayi(d.haftaSavasHafta, -1) !== h) return this.HAFTALIK_SAVAS_LIMITI;
    return Math.max(0, this.HAFTALIK_SAVAS_LIMITI - this._sayi(d.haftaSavasSayac, 0));
  },
  _haftalikSayacArtir(d) {
    const h = this.haftaId();
    if (this._sayi(d.haftaSavasHafta, -1) !== h) { d.haftaSavasHafta = h; d.haftaSavasSayac = 0; }
    d.haftaSavasSayac = this._sayi(d.haftaSavasSayac, 0) + 1;
    return d.haftaSavasSayac;
  },
  savasAcikMi() {
    const K = this._K();
    return !!(K && typeof K.ozellikAcik === 'function' && K.ozellikAcik('savas'));
  },

  // 1) EŞLEŞME BAŞLAT — beklemede → eslesme
  eslesmeBaslat(tur) {
    const K = this._K();
    if (!K || !K.var || !K.var()) return this._hata('ERR_S01');
    if (!this.savasAcikMi()) return this._hata('ERR_S02');
    if (!this.TUR[tur]) return this._hata('ERR_S03');
    const d = this._st();
    if (!d) return this._hata('ERR_S01');
    this.guncelle();
    if (d.aktif && (d.durum === 'aktif' || d.durum === 'eslesme')) return this._hata('ERR_S04');
    // S18 — haftalık limit (ekonomi koruması)
    if (this.haftalikKalanSavas() <= 0) return this._hata('ERR_S15', { kalan: 0, limit: this.HAFTALIK_SAVAS_LIMITI });
    if (d.durum !== 'beklemede') {
      // bitti / oduller_alindi → yeni savaş için sıfırla
      d.aktif = null; d.durum = 'beklemede';
    }
    if (!this._gec(d, 'eslesme')) return this._hata('ERR_S10');
    const e = this.esles(tur, this.haftaId(), this._sonrakiSavasNo());
    if (!e.ok) { d.durum = 'beklemede'; this._kaydet(); return this._hata('ERR_S05', { eslestirme: e }); }
    d._bekleyen = { tur: tur, rakip: e.rakip, kriterler: e.kriterler, gevsetilen: e.gevsetilen, haftaId: e.haftaId, savasNo: e.savasNo };
    this._kaydet();
    return this._tamam({ rakip: e.rakip, kriterler: e.kriterler, gevsetilen: e.gevsetilen, durum: d.durum });
  },

  // 2) SAVAŞ BAŞLAT — eslesme → aktif (lig denetimi burada!)
  savasBaslat(tur) {
    const K = this._K();
    if (!K || !K.var || !K.var()) return this._hata('ERR_S01');
    if (!this.savasAcikMi()) return this._hata('ERR_S02');
    const t = this.TUR[tur] ? tur : null;
    const d = this._st();
    if (!d) return this._hata('ERR_S01');

    // Eşleşme yapılmamışsa burada yap (tek çağrılık kullanım kolaylığı).
    if (d.durum !== 'eslesme' || !d._bekleyen || (t && d._bekleyen.tur !== t)) {
      const e1 = this.eslesmeBaslat(t || 'normal');
      if (!e1.ok) return e1;
    }
    const bek = d._bekleyen;
    if (!bek) return this._hata('ERR_S05');
    const T = this.TUR[bek.tur];

    // 🔴 §14.2 Senaryo 5 — savaş BAŞLAMADAN önce eşleştirme tekrar denetlenir.
    const lig = this.ligUyumlu(bek.rakip);
    if (!lig.uyumlu) {
      d._bekleyen = null;
      d.durum = 'eslesme';
      this._gec(d, 'beklemede');
      const K2 = this._K();
      // 🔴 H2: telafi de ödeme ölçeğine tabidir (yoksa başarısız eşleştirme
      //    kazanılan savaştan 10× fazla KP verirdi). En az 1 KP verilir.
      const telafi = (K2 && typeof K2.kpOdul === 'function')
        ? Math.max(1, Math.round(K2.kpOdul(this.TELAFI.altin, this.TELAFI.elmas) * this.ODUL_OLCEK)) : 0;
      if (K2 && typeof K2.kpEkle === 'function' && telafi > 0) K2.kpEkle(telafi, 'savas-telafi');
      this._duyuru('savas', 'Eşleştirme hatası nedeniyle savaş iptal edildi. Telafi: +' + telafi + ' KP', { lig: lig });
      this._kaydet();
      return this._hata('ERR_S06', { iptal: true, lig: lig, telafiKp: telafi });
    }

    const simdi = this._simdi();
    d.savasNo = this._sayi(d.savasNo, 0) + 1;
    const bot = this.botKatkilari(bek.tur, d.savasNo, bek.haftaId, simdi);
    const rp = this.rakipPuanHesapla(bek.rakip, bek.tur, d.savasNo, bek.haftaId, bot.toplam);

    d.aktif = {
      no: d.savasNo,
      tur: bek.tur,
      durum: 'aktif',
      haftaId: bek.haftaId,
      rakip: bek.rakip,
      kriterler: bek.kriterler,
      gevsetilen: bek.gevsetilen,
      baslangic: simdi,
      bitis: simdi + T.sureMs,
      yarislar: [],                        // oyuncunun yarış puanları
      botUyeler: bot.uyeler,
      botToplam: bot.toplam,
      rakipPuan: rp.puan,
      kazanmaOlasiligi: rp.olasilik,
      bizPuan: 0,
      odulAlindi: false,
      sonuc: null,
      eloOnce: this._sayi(d.elo, 1000),
      eloSonra: null
    };
    d._bekleyen = null;
    if (!this._gec(d, 'aktif')) return this._hata('ERR_S10');
    // S18 — sayaç YALNIZ savaş gerçekten başlayınca artar (lig uyuşmazlığıyla
    // iptal edilen eşleşme oyuncunun hakkını YAKMAZ).
    this._haftalikSayacArtir(d);
    this._puanTazele(d);
    this._duyuru('savas', T.ad + ' başladı: ' + String(bek.rakip.ad) + ' klanına karşı!', { no: d.savasNo, tur: bek.tur });
    this._kaydet();
    return this._tamam({ savas: this.durum(), rakip: bek.rakip });
  },

  // 3) YARIŞ EKLE — oyuncunun koşusu savaşa katkı olur
  yarisEkle(mesafe, takla, coin, sureSn) {
    const d = this._st();
    if (!d || !d.aktif || d.durum !== 'aktif') return this._hata('ERR_S07');
    const s = d.aktif;
    const simdi = this._simdi();
    if (simdi >= s.bitis) { this.guncelle(); return this._hata('ERR_S14'); }
    const puan = this.yarisPuani(mesafe, takla, coin, sureSn);
    s.yarislar.push({ p: puan, t: simdi });
    // S14: referans SONRAKİ savaşlar için öğrenilir. Bu savaşın bot/rakip
    // puanları başlangıçta donduruldu → lastik bant YOK.
    this._referansOgren(puan);
    // Savaş içindeki yarış geçmişi sınırlı tutulur (bellek sızıntısı dersi:
    // `UI._toasts` 159 elemana çıkmıştı). En iyi N zaten yeterli, 200 tavan.
    if (s.yarislar.length > 200) {
      s.yarislar.sort(function (a, b) { return b.p - a.p; });
      s.yarislar.length = 200;
    }
    this._puanTazele(d);
    // Katkı Klan'a da yazılır (haftalık katkı / MVP rozeti için)
    const K = this._K();
    if (K && typeof K.katkiEkle === 'function') K.katkiEkle('oyuncu', puan);
    this._kaydet();
    return this._tamam({ puan: puan, bizPuan: s.bizPuan, rakipPuan: s.rakipPuan, yarisSayisi: s.yarislar.length });
  },

  // Bizim toplam savaş puanımızı yeniden hesapla.
  // 🔴 Sınıf çarpanı (`savaslord` +%10) BURADA uygulanır — `savasPuani()`
  //    saf kalır ki §8.4 örneği (2.610) selfTest'te kilitlenebilsin.
  _puanTazele(d) {
    const s = d.aktif;
    if (!s) return 0;
    const T = this.TUR[s.tur] || this.TUR.normal;
    const oyuncuYarislari = s.yarislar.map(function (y) { return y.p; });
    const uyeler = [oyuncuYarislari];
    // Bot üyelerin katkısı zaten "en iyi N ortalaması" olarak üretilmiştir.
    let botTop = 0;
    for (let i = 0; i < s.botUyeler.length; i++) botTop += this._sayi(s.botUyeler[i].puan, 0);
    const sp = this.savasPuani(uyeler, T.enIyiN);
    const K = this._K();
    const sinif = (K && typeof K.sinifCarpani === 'function') ? K.sinifCarpani('savas') : 1;
    s.oyuncuPuan = Math.round(sp.toplam * 100) / 100;
    s.botToplam = botTop;
    s.sinifCarpani = sinif;
    s.bizPuan = Math.round((sp.toplam + botTop) * sinif);
    return s.bizPuan;
  },

  // 4) GÜNCELLE — süre dolduysa savaşı bitir (aktif → bitti)
  // 🔴 Zaman Date.now() ile ölçülür; dt biriktirilmez (intro.js dersi).
  guncelle() {
    const d = this._st();
    if (!d) return { degisti: false, durum: null };
    if (d.durum !== 'aktif' || !d.aktif) return { degisti: false, durum: d.durum };
    const s = d.aktif;
    if (this._simdi() < s.bitis) return { degisti: false, durum: d.durum, kalanMs: s.bitis - this._simdi() };
    this._puanTazele(d);
    s.sonuc = (s.bizPuan > s.rakipPuan) ? 'galibiyet' : (s.bizPuan === s.rakipPuan ? 'beraberlik' : 'maglubiyet');
    // ── ELO (§29.5, K=32) — KlanSim.elo kullanılır, yeniden yazılmaz ──
    const S = this._S();
    const sonucDeger = s.sonuc === 'galibiyet' ? 1 : (s.sonuc === 'beraberlik' ? 0.5 : 0);
    if (S && typeof S.elo === 'function') {
      d.elo = Math.round(S.elo(this._sayi(d.elo, 1000), this._sayi(s.rakip.elo, 1000), sonucDeger) * 100) / 100;
    }
    s.eloSonra = d.elo;
    // İstatistik
    d.toplam = this._sayi(d.toplam, 0) + 1;
    if (s.sonuc === 'galibiyet') { d.galibiyet = this._sayi(d.galibiyet, 0) + 1; d.seri = Math.max(0, this._sayi(d.seri, 0)) + 1; }
    else if (s.sonuc === 'beraberlik') { d.beraberlik = this._sayi(d.beraberlik, 0) + 1; }
    else { d.maglubiyet = this._sayi(d.maglubiyet, 0) + 1; d.seri = 0; }
    d.sonSavas = this._simdi();
    if (!this._gec(d, 'bitti')) return { degisti: false, durum: d.durum };
    this._duyuru('savas', 'Savaş bitti: ' + this.SONUC_AD[s.sonuc] + ' (' + s.bizPuan + ' - ' + s.rakipPuan + ')', { sonuc: s.sonuc });
    this._kaydet();
    return { degisti: true, durum: d.durum, sonuc: s.sonuc, bizPuan: s.bizPuan, rakipPuan: s.rakipPuan };
  },
  SONUC_AD: { galibiyet: 'GALİBİYET', beraberlik: 'BERABERLİK', maglubiyet: 'MAĞLUBİYET' },

  // ═══════════════════════════════════════════════════════════════
  //  §8.5 — ÖDÜLLER (yalnız KP)
  // ═══════════════════════════════════════════════════════════════
  // Ham KP (çarpansız) — sözleşme §6 tablosu bu değerleri kilitler.
  odulKpHam(sonuc) {
    const o = this.ODUL[sonuc];
    const K = this._K();
    if (!o || !K || typeof K.kpCevir !== 'function') return 0;
    return K.kpCevir(o.altin, o.elmas);
  },
  // Klan.odulCarpani() + H2 ödeme ölçeği uygulanmış hâli (GERÇEKTE VERİLEN).
  // 🔴 `odulKpHam` ölçeksizdir ve sözleşme §6 tablosunu kilitler — bu ikisini
  //    karıştırma. UI hangi sayıyı gösterirse oyuncu ONU alır: `odulKp`.
  odulKp(sonuc) {
    const o = this.ODUL[sonuc];
    const K = this._K();
    if (!o || !K || typeof K.kpOdul !== 'function') return 0;
    return Math.max(1, Math.round(K.kpOdul(o.altin, o.elmas) * this.ODUL_OLCEK));
  },
  // Kutuyu KlanKutu'ya (Ajan D) devret; modül yoksa bekleme listesine yaz.
  _kutuVer(d, tur, adet) {
    const M = this._Kutu();
    if (M) {
      const adaylar = ['ver', 'ekle', 'oduleEkle', 'kutuVer'];
      for (let i = 0; i < adaylar.length; i++) {
        if (typeof M[adaylar[i]] === 'function') {
          try { M[adaylar[i]](tur, adet); return { verildi: true, yontem: adaylar[i] }; } catch (e) { /* düş */ }
        }
      }
    }
    if (!Array.isArray(d.beklemedeKutular)) d.beklemedeKutular = [];
    d.beklemedeKutular.push({ tur: tur, adet: adet, t: this._simdi() });
    if (d.beklemedeKutular.length > 30) d.beklemedeKutular.splice(0, d.beklemedeKutular.length - 30);
    return { verildi: false, beklemede: true };
  },

  // 5) ÖDÜLÜ AL — bitti → oduller_alindi (bir kez!)
  oduluAl() {
    const K = this._K();
    if (!K || !K.var || !K.var()) return this._hata('ERR_S01');
    const d = this._st();
    if (!d) return this._hata('ERR_S01');
    this.guncelle();
    if (!d.aktif) return this._hata('ERR_S07');
    const s = d.aktif;
    if (d.durum === 'oduller_alindi' || s.odulAlindi) return this._hata('ERR_S09');
    if (d.durum !== 'bitti') return this._hata('ERR_S08', { kalanMs: Math.max(0, s.bitis - this._simdi()) });

    const o = this.ODUL[s.sonuc];
    const kp = this.odulKp(s.sonuc);
    const kpHam = this.odulKpHam(s.sonuc);
    if (typeof K.kpEkle === 'function' && kp > 0) K.kpEkle(kp, 'savas-' + s.sonuc);

    // Klan XP — S11: Klan.js'in 'galibiyet' kaynağındaki günlük tavan geçerli.
    let xpEklenen = 0;
    if (typeof K.xpEkle === 'function') {
      const rx = K.xpEkle('galibiyet', o.xp);
      xpEklenen = this._sayi(rx && rx.eklenen, 0);
    }
    // Kutu
    const kutu = this._kutuVer(d, o.kutuTur, o.kutuAdet);

    // Rozetler (§8.5)
    const yeniRozet = [];
    if (o.rozet && d.rozetler.indexOf(o.rozet) < 0) { d.rozetler.push(o.rozet); yeniRozet.push(o.rozet); }
    if (s.sonuc === 'galibiyet') {
      // Klan.js'in `savasKahramani` rozeti bu alandan besleniyor.
      const ben = (typeof K.uye === 'function') ? K.uye('oyuncu') : null;
      if (ben) ben.savasGalibiyeti = this._sayi(ben.savasGalibiyeti, 0) + 1;
      const kk = K.al();
      if (kk) { kk.savasKazanilan = this._sayi(kk.savasKazanilan, 0) + 1; kk.savasToplam = this._sayi(kk.savasToplam, 0) + 1; }
      if (this._sayi(d.galibiyet, 0) >= this.EFSANEVI_ROZET_ESIK && d.rozetler.indexOf('savasEfsanevi') < 0) {
        d.rozetler.push('savasEfsanevi'); yeniRozet.push('savasEfsanevi');
      }
    } else {
      const kk = K.al();
      if (kk) kk.savasToplam = this._sayi(kk.savasToplam, 0) + 1;
    }

    s.odulAlindi = true;
    s.odulKp = kp;
    if (!this._gec(d, 'oduller_alindi')) return this._hata('ERR_S10');

    // Geçmişe yaz (en fazla 20)
    d.gecmis.push({
      no: s.no, tur: s.tur, sonuc: s.sonuc, bizPuan: s.bizPuan, rakipPuan: s.rakipPuan,
      rakipAd: s.rakip.ad, rakipEtiket: s.rakip.etiket, kp: kp, t: this._simdi(),
      eloOnce: s.eloOnce, eloSonra: s.eloSonra
    });
    if (d.gecmis.length > 20) d.gecmis.splice(0, d.gecmis.length - 20);

    this._duyuru('savas', this.SONUC_AD[s.sonuc] + ' ödülü alındı: +' + kp + ' KP', { kp: kp, sonuc: s.sonuc });
    this._kaydet();
    return this._tamam({
      sonuc: s.sonuc, kp: kp, kpHam: kpHam, xp: xpEklenen, kutu: kutu,
      rozetler: yeniRozet, elo: d.elo, durum: d.durum
    });
  },

  // Savaşı elle iptal et (yalnız eşleşme aşamasında)
  iptalEt(sebep) {
    const d = this._st();
    if (!d) return this._hata('ERR_S01');
    if (d.durum !== 'eslesme') return this._hata('ERR_S10');
    d._bekleyen = null;
    if (!this._gec(d, 'beklemede')) return this._hata('ERR_S10');
    this._duyuru('savas', 'Eşleşme iptal edildi.' + (sebep ? ' (' + String(sebep) + ')' : ''));
    this._kaydet();
    return this._tamam({ durum: d.durum });
  },

  // ═══════════════════════════════════════════════════════════════
  //  DURUM SORGUSU
  // ═══════════════════════════════════════════════════════════════
  durum() {
    const d = this._st();
    if (!d) return null;
    const s = d.aktif;
    const simdi = this._simdi();
    return {
      durum: d.durum,
      savasNo: this._sayi(d.savasNo, 0),
      elo: this._sayi(d.elo, 1000),
      toplam: this._sayi(d.toplam, 0),
      galibiyet: this._sayi(d.galibiyet, 0),
      beraberlik: this._sayi(d.beraberlik, 0),
      maglubiyet: this._sayi(d.maglubiyet, 0),
      seri: this._sayi(d.seri, 0),
      haftalikKalan: this.haftalikKalanSavas(),
      haftalikLimit: this.HAFTALIK_SAVAS_LIMITI,
      rozetler: d.rozetler.slice(),
      gecmis: d.gecmis.slice(),
      aktif: s ? {
        no: s.no, tur: s.tur, turAd: (this.TUR[s.tur] || this.TUR.normal).ad,
        rakip: s.rakip, baslangic: s.baslangic, bitis: s.bitis,
        kalanMs: Math.max(0, s.bitis - simdi),
        bizPuan: this._sayi(s.bizPuan, 0),
        rakipPuan: this._sayi(s.rakipPuan, 0),
        rakipPuanSuana: this._rakipPuanSuana(s, simdi),
        oyuncuPuan: this._sayi(s.oyuncuPuan, 0),
        botToplam: this._sayi(s.botToplam, 0),
        botUyeler: s.botUyeler ? s.botUyeler.slice() : [],
        yarisSayisi: s.yarislar ? s.yarislar.length : 0,
        enIyiN: (this.TUR[s.tur] || this.TUR.normal).enIyiN,
        sonuc: s.sonuc, odulAlindi: !!s.odulAlindi,
        kazanmaOlasiligi: s.kazanmaOlasiligi,
        sinifCarpani: s.sinifCarpani
      } : null
    };
  },
  // Rakibin puanı savaş boyunca DOĞRUSAL açılır (UI canlı hissetsin diye);
  // toplamı baştan SABİTTİR (S5 — lastik bant yok).
  _rakipPuanSuana(s, simdi) {
    if (!s) return 0;
    const toplamMs = Math.max(1, s.bitis - s.baslangic);
    const gecen = this._kis((simdi - s.baslangic) / toplamMs, 0, 1);
    return Math.round(this._sayi(s.rakipPuan, 0) * gecen);
  },
  sureMetni(ms) {
    let x = Math.max(0, Math.floor(this._sayi(ms, 0) / 1000));
    const s = x % 60; x = Math.floor(x / 60);
    const d = x % 60; x = Math.floor(x / 60);
    const h = x;
    const ik = function (n) { return (n < 10 ? '0' : '') + n; };
    return ik(h) + ':' + ik(d) + ':' + ik(s);
  },

  // ═══════════════════════════════════════════════════════════════
  //  UI VERİSİ — `js/ui.js:8445` CLAN_WAR_UI.drawClanWarScreen ŞEMASI
  //  🔴 Renkler HEX olmalı: CLAN_WAR_UI `color + 'CC'` diye alfa ekliyor.
  // ═══════════════════════════════════════════════════════════════
  _amblemEmoji(ix) {
    const i = Math.abs(Math.floor(this._sayi(ix, 0))) % this.AMBLEM_EMOJI.length;
    return this.AMBLEM_EMOJI[i];
  },
  _hex(renk, varsayilan) {
    return (typeof renk === 'string' && renk.charAt(0) === '#' && (renk.length === 7 || renk.length === 4))
      ? renk : varsayilan;
  },
  uiVerisi() {
    const d = this._st();
    if (!d || !d.aktif) return null;
    const s = d.aktif;
    const simdi = this._simdi();
    const biz = this.bizimKlanOzet();
    const K = this._K();

    // TOP FIGHTERS — bizim ve rakibin en iyi katkıcıları, azalan
    const oyuncular = [];
    oyuncular.push({ name: 'Sen', score: Math.round(this._sayi(s.oyuncuPuan, 0)), clan: 'mine' });
    for (let i = 0; i < s.botUyeler.length; i++) {
      oyuncular.push({ name: s.botUyeler[i].ad, score: this._sayi(s.botUyeler[i].puan, 0), clan: 'mine' });
    }
    // Rakibin üye dağılımı — tohumlu (aynı savaşta hep aynı isimler/puanlar)
    const T = this.TUR[s.tur] || this.TUR.normal;
    const rrnd = this._rng(this._hash32('rakipuye:' + s.haftaId + ':' + s.no + ':' + s.tur));
    const rakipToplam = this._rakipPuanSuana(s, simdi);
    const pay = [];
    let payTop = 0;
    for (let i = 0; i < T.uye; i++) { const v = 0.5 + rrnd(); pay.push(v); payTop += v; }
    for (let i = 0; i < T.uye; i++) {
      oyuncular.push({
        name: String(s.rakip.etiket || 'RKP') + '-' + (i + 1),
        score: Math.round(rakipToplam * pay[i] / payTop),
        clan: 'enemy'
      });
    }
    oyuncular.sort(function (a, b) { return b.score - a.score; });
    const ilk5 = oyuncular.slice(0, 5);
    let sira = 1;
    for (let i = 0; i < oyuncular.length; i++) if (oyuncular[i].name === 'Sen') { sira = i + 1; break; }

    return {
      myClan: {
        name: String(biz.ad || 'KLANIN').toUpperCase(),
        color: this._hex(biz.renk1, '#e8b23a'),
        score: Math.round(this._sayi(s.bizPuan, 0)),
        members: this._sayi(biz.uyeSayisi, 1),
        flag: this._amblemEmoji(biz.amblem),
        tag: biz.etiket
      },
      enemyClan: {
        name: String(s.rakip.ad || 'RAKİP').toUpperCase(),
        color: this._hex(s.rakip.renk1, '#3aa0e8'),
        score: rakipToplam,
        members: this._sayi(s.rakip.uyeSayisi, 1),
        flag: this._amblemEmoji(s.rakip.amblem),
        tag: s.rakip.etiket
      },
      timeLeft: this.sureMetni(Math.max(0, s.bitis - simdi)),
      phase: (d.durum === 'aktif') ? T.ad.toUpperCase() : this.SONUC_AD[s.sonuc] || d.durum.toUpperCase(),
      myRank: sira,
      topPlayers: ilk5,
      // ── ek alanlar (CLAN_WAR_UI okumaz; Ajan G isterse kullanır) ──
      durum: d.durum,
      sonuc: s.sonuc,
      odulKp: this.odulKp(s.sonuc || 'maglubiyet'),
      odulAlindi: !!s.odulAlindi,
      elo: this._sayi(d.elo, 1000),
      kazanmaOlasiligi: s.kazanmaOlasiligi,
      klanSeviyesi: (K && typeof K.seviye === 'function') ? K.seviye() : 1
    };
  },

  // ═══════════════════════════════════════════════════════════════
  //  §29 — TURNUVA
  // ═══════════════════════════════════════════════════════════════
  turnuvaGunToplam() {
    let g = 0;
    for (let i = 0; i < this.TURNUVA_ASAMA.length; i++) g += this.TURNUVA_ASAMA[i].gun;
    return g;                                          // 3+4+10+3 = 20 (S7)
  },
  // Yılda 8 turnuva; başlangıçları yıla eşit dağıtılır.
  turnuvaTakvim(yil) {
    const y = Math.floor(this._sayi(yil, new Date(this._simdi()).getFullYear()));
    const yilBas = new Date(y, 0, 1, 0, 0, 0, 0).getTime();
    const gunSayisi = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365;
    const sure = this.turnuvaGunToplam();
    const l = [];
    for (let i = 0; i < this.TURNUVA_YILDA; i++) {
      const basGun = Math.floor(i * gunSayisi / this.TURNUVA_YILDA);
      const bas = yilBas + basGun * this.GUN_MS;
      l.push({ no: i + 1, yil: y, id: y + '-T' + (i + 1), baslangic: bas, bitis: bas + sure * this.GUN_MS, gun: sure });
    }
    return l;
  },
  // Verilen anda hangi turnuva/aşama aktif?
  turnuvaAsamasi(zaman) {
    const t = (zaman == null) ? this._simdi() : this._sayi(zaman, 0);
    const y = new Date(t).getFullYear();
    const hepsi = this.turnuvaTakvim(y).concat(this.turnuvaTakvim(y - 1));
    for (let i = 0; i < hepsi.length; i++) {
      const tv = hepsi[i];
      if (t < tv.baslangic || t >= tv.bitis) continue;
      let ofset = tv.baslangic;
      for (let j = 0; j < this.TURNUVA_ASAMA.length; j++) {
        const a = this.TURNUVA_ASAMA[j];
        const son = ofset + a.gun * this.GUN_MS;
        if (t < son) {
          return {
            aktif: true, turnuva: tv, asama: a, asamaIx: j,
            asamaBaslangic: ofset, asamaBitis: son, kalanMs: son - t
          };
        }
        ofset = son;
      }
    }
    return { aktif: false, turnuva: null, asama: null, asamaIx: -1, kalanMs: 0 };
  },

  // ── BRACKET (128 → 64 → 32 → 16 → 8 → 4 → 2 → 1, BYE dolgulu) ──
  // `js/social.js:47` `Tournament.seed` deseni: tur tur eşleşme listesi.
  // Fark: burada 1-N, 2-(N-1) TOHUM eşleştirmesi yapılır (social.js komşu
  // eşleştiriyor → 1. ve 2. tohum ilk turda karşılaşabiliyordu).
  _ustGuc2(n) { let p = 1; while (p < n) p *= 2; return Math.max(1, p); },
  turnuvaTurAdi(katilimci) {
    return this.TURNUVA_TUR_ADI[katilimci] || ('Son ' + katilimci);
  },
  turnuvaBracket(katilimcilar) {
    const S = this._S();
    const ham = Array.isArray(katilimcilar) ? katilimcilar.slice() : [];
    // ELO'ya göre azalan, kararlı tohumlama — KlanSim.tohumla yeniden yazılmaz.
    let l;
    if (S && typeof S.tohumla === 'function') l = S.tohumla(ham);
    else {
      l = ham.slice().sort(function (a, b) {
        const ea = Number(a && a.elo) || 0, eb = Number(b && b.elo) || 0;
        if (eb !== ea) return eb - ea;
        const ia = String(a && a.id), ib = String(b && b.id);
        return ia < ib ? -1 : (ia > ib ? 1 : 0);
      });
      for (let i = 0; i < l.length; i++) l[i].tohum = i + 1;
    }
    const N = this._ustGuc2(l.length);
    const byeSayisi = N - l.length;
    for (let i = l.length; i < N; i++) {
      l.push({ id: 'BYE-' + (i + 1), ad: 'BYE', etiket: 'BYE', elo: 0, bye: true, tohum: i + 1 });
    }
    const boyutlar = [];
    const turlar = [];
    let n = N;
    let cur = l;
    while (n > 1) {
      boyutlar.push(n);
      const es = [];
      for (let i = 0; i < n / 2; i++) {
        es.push({ a: cur ? cur[i] : null, b: cur ? cur[n - 1 - i] : null, kazanan: null });
      }
      turlar.push({ tur: turlar.length + 1, ad: this.turnuvaTurAdi(n), katilimci: n, eslesmeler: es });
      cur = null;                      // sonraki turlar `turnuvaSimule` ile dolar
      n = n / 2;
    }
    boyutlar.push(1);
    return { katilimci: N, gercekKatilimci: N - byeSayisi, bye: byeSayisi, boyutlar: boyutlar, turlar: turlar, tohumlu: l };
  },

  // Deterministik eleme simülasyonu (ELO olasılığı + tohumlu para).
  // S12: beraberlik üretilmez → her eşleşmede bir kazanan.
  turnuvaSimule(katilimcilar, tohumMetin) {
    const S = this._S();
    const br = this.turnuvaBracket(katilimcilar);
    const rnd = this._rng(this._hash32('turnuva:' + String(tohumMetin == null ? 'T' : tohumMetin)));
    const yerlesim = {};                 // id -> sıralama (bant üst sınırı)
    let cur = br.tohumlu.slice();
    const turlar = [];
    let n = cur.length;
    while (n > 1) {
      const es = [];
      const sonraki = [];
      for (let i = 0; i < n / 2; i++) {
        const a = cur[i], b = cur[n - 1 - i];
        let kazanan, kaybeden;
        if (a && a.bye && b && b.bye) { kazanan = a; kaybeden = b; }
        else if (a && a.bye) { kazanan = b; kaybeden = a; }
        else if (b && b.bye) { kazanan = a; kaybeden = b; }
        else {
          const p = (S && typeof S.eloBeklenen === 'function')
            ? S.eloBeklenen(this._sayi(a.elo, 1000), this._sayi(b.elo, 1000))
            : 0.5;
          if (rnd() < p) { kazanan = a; kaybeden = b; } else { kazanan = b; kaybeden = a; }
        }
        // 🔴 Sıralama = o turdaki KATILIMCI SAYISI (bandın ALT sınırı, yani en
        //    kötü olası derece). n=2'de elenen finalisttir → 2. n=4'te elenen
        //    yarı finalisttir → 4. `turnuvaOdulKademesi` `s <= enFazla` ile
        //    baktığı için doğru kademeyi verir. (İlk yazımda `n/2` yazmıştım:
        //    finali kaybeden 1. sayılıp ŞAMPİYON ödülü alıyordu.)
        if (kaybeden && !kaybeden.bye) yerlesim[kaybeden.id] = n;
        es.push({ a: a, b: b, kazanan: kazanan ? kazanan.id : null });
        sonraki.push(kazanan);
      }
      turlar.push({ tur: turlar.length + 1, ad: this.turnuvaTurAdi(n), katilimci: n, eslesmeler: es });
      cur = sonraki;
      n = n / 2;
    }
    const sampiyon = cur[0] || null;
    if (sampiyon && !sampiyon.bye) yerlesim[sampiyon.id] = 1;
    return { bracket: br, turlar: turlar, sampiyon: sampiyon, yerlesim: yerlesim };
  },

  // §29.3 ödül kademesi — sıralamadan
  turnuvaOdulKademesi(siralama) {
    const s = Math.max(1, Math.floor(this._sayi(siralama, 9999)));
    for (let i = 0; i < this.TURNUVA_ODUL.length; i++) {
      if (s <= this.TURNUVA_ODUL[i].enFazla) return this.TURNUVA_ODUL[i];
    }
    return null;
  },
  // Ham KP (çarpansız) — sözleşme §6: şampiyon = 45.000
  turnuvaOdulKpHam(siralama) {
    const k = this.turnuvaOdulKademesi(siralama);
    const K = this._K();
    if (!k || !K || typeof K.kpCevir !== 'function') return 0;
    return K.kpCevir(k.altin, k.elmas);
  },
  // 🔴 H2 ölçeği uygulanır (bkz. ODUL_OLCEK/TURNUVA_OLCEK açıklaması).
  turnuvaOdulKp(siralama) {
    const k = this.turnuvaOdulKademesi(siralama);
    const K = this._K();
    if (!k || !K || typeof K.kpOdul !== 'function') return 0;
    return Math.max(1, Math.round(K.kpOdul(k.altin, k.elmas) * this.TURNUVA_OLCEK));
  },
  // Ödül paketi — 🔴 S6: "Tüm Üyelere Özel Araç" YOK, kozmetik var.
  turnuvaOdulPaketi(siralama) {
    const k = this.turnuvaOdulKademesi(siralama);
    if (!k) return null;
    return {
      ad: k.ad, siralama: Math.max(1, Math.floor(this._sayi(siralama, 1))),
      kp: this.turnuvaOdulKp(siralama), kpHam: this.turnuvaOdulKpHam(siralama),
      xp: k.xp, kozmetik: k.kozmetik, banner: k.banner, renk: k.renk,
      arac: null                       // S6 — klan sistemi ARAÇ VERMEZ
    };
  },

  // Turnuvaya girecek 128 klanı tohumlu seç (bizim klan dahil).
  // 🔴 S17 (ölçümle bulundu): önce "ELO'ya göre en tepedeki 127 bot" alınıyordu
  //    (§29.2'nin "en yüksek puanı toplayan ilk 128" cümlesinin düz okuması).
  //    Sonuç ÖLÇÜLDÜ: bot ELO'ları 1.000-1.975, oyuncununki 1.000 → oyuncu
  //    DAİMA 128. tohum, DAİMA ilk turda eleniyor, derece **128**, ödül **0 KP**.
  //    Turnuva yapısal olarak kazanılamazdı.
  //    ▶ Eleme aşaması bir EŞİK kesimidir; eşiği geçen klanlar birbirine
  //      yakındır. Saha artık ELO'su bize EN YAKIN 127 bottan kurulur —
  //      oyuncu orta tohum olur ve gerçekten ilerleyebilir.
  turnuvaKatilimcilar(haftaId, adet) {
    const S = this._S();
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const n = Math.max(2, Math.floor(this._sayi(adet, 128)));
    const botlar = (S && typeof S.botKlanlar === 'function') ? S.botKlanlar(h) : [];
    const biz = this.bizimKlanOzet();
    const bizElo = this._sayi(biz.elo, 1000);
    // ELO farkına göre artan; eşit farkta id (kararlı, sıra bağımsız sonuç).
    const s = botlar.slice().sort(function (a, b) {
      const fa = Math.abs((Number(a.elo) || 0) - bizElo), fb = Math.abs((Number(b.elo) || 0) - bizElo);
      if (fa !== fb) return fa - fb;
      return String(a.id) < String(b.id) ? -1 : 1;
    });
    const l = s.slice(0, Math.max(0, n - 1));
    l.push(biz);
    return l;
  },

  // ── TURNUVAYA KATIL + ÖDÜL AL ──────────────────────────────────────────
  // 🔴 Tohumlu: aynı turnuva kimliği → aynı bracket, aynı sonuç, aynı derece.
  //    Oyuncu uygulamayı kapatıp açınca farklı derece GÖRMEZ.
  turnuvaKos(turnuvaId, haftaId) {
    const K = this._K();
    const d = this._st();
    if (!K || !d) return this._hata('ERR_S01');
    if (!this.savasAcikMi()) return this._hata('ERR_S02');
    const tvId = (turnuvaId == null) ? (this.turnuvaAsamasi().turnuva || { id: 'T?' }).id : String(turnuvaId);
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    // Aynı turnuva zaten koşulduysa AYNI sonucu döndür (yeniden çekiliş YOK)
    if (d.turnuva && d.turnuva.id === tvId) return this._tamam({ turnuva: d.turnuva, tekrar: true });
    const biz = this.bizimKlanOzet();
    const kat = this.turnuvaKatilimcilar(h, 128);
    const sim = this.turnuvaSimule(kat, tvId);
    const siralama = this._sayi(sim.yerlesim[biz.id], 128);
    const paket = this.turnuvaOdulPaketi(siralama);
    d.turnuva = {
      id: tvId, haftaId: h, siralama: siralama,
      sampiyon: sim.sampiyon ? { id: sim.sampiyon.id, ad: sim.sampiyon.ad } : null,
      kademe: paket ? paket.ad : null,
      kp: paket ? paket.kp : 0,
      kozmetik: paket ? paket.kozmetik : null,
      banner: paket ? paket.banner : null,
      alindi: false, t: this._simdi(),
      turSayisi: sim.turlar.length
    };
    this._duyuru('savas', 'Turnuva sonucu: ' + siralama + '. sıra' + (paket ? ' (' + paket.ad + ')' : ''), { siralama: siralama });
    this._kaydet();
    return this._tamam({ turnuva: d.turnuva, tekrar: false });
  },
  turnuvaOduluAl() {
    const K = this._K();
    const d = this._st();
    if (!K || !d) return this._hata('ERR_S01');
    if (!d.turnuva) return this._hata('ERR_S07');
    if (d.turnuva.alindi) return this._hata('ERR_S09');
    const kp = Math.max(0, this._sayi(d.turnuva.kp, 0));
    if (kp > 0 && typeof K.kpEkle === 'function') K.kpEkle(kp, 'turnuva-' + d.turnuva.siralama);
    // Klan XP — S11: Klan.js'in günlük tavanı geçerli.
    const kad = this.turnuvaOdulKademesi(d.turnuva.siralama);
    let xp = 0;
    if (kad && typeof K.xpEkle === 'function') xp = this._sayi(K.xpEkle('galibiyet', kad.xp).eklenen, 0);
    d.turnuva.alindi = true;
    this._duyuru('savas', 'Turnuva ödülü alındı: +' + kp + ' KP', { kp: kp });
    this._kaydet();
    // 🔴 S6: `arac` alanı DAİMA null — klan sistemi araç vermez.
    return this._tamam({ kp: kp, xp: xp, siralama: d.turnuva.siralama, kademe: d.turnuva.kademe, kozmetik: d.turnuva.kozmetik, arac: null });
  },

  // ═══════════════════════════════════════════════════════════════
  //  §40.2 — YASAL KEŞİF / CASUSLUK
  //  🔴 §40.3 · §40.4'ün 5 maddesi · §40.5 UYGULANMADI (S8): gerçek hesap,
  //     sunucu, sohbet ve üçüncü taraf yok. Konusuz.
  // ═══════════════════════════════════════════════════════════════
  _rakipBul(rakipId, haftaId) {
    const S = this._S();
    const h = (haftaId == null) ? this.haftaId() : Math.floor(this._sayi(haftaId, 0));
    const botlar = (S && typeof S.botKlanlar === 'function') ? S.botKlanlar(h) : [];
    for (let i = 0; i < botlar.length; i++) if (botlar[i].id === rakipId) return botlar[i];
    const s = this.aktifSavas();
    if (s && s.rakip && s.rakip.id === rakipId) return s.rakip;
    return null;
  },
  _kesifKaydet(d, rapor) {
    if (!Array.isArray(d.kesifler)) d.kesifler = [];
    d.kesifler.push(rapor);
    if (d.kesifler.length > 10) d.kesifler.splice(0, d.kesifler.length - 10);
  },

  // Keşif Görevi — 100 KP · halka açık veriler
  kesifGorevi(rakipId) {
    const K = this._K();
    const d = this._st();
    if (!K || !d) return this._hata('ERR_S01');
    const r = this._rakipBul(rakipId);
    if (!r) return this._hata('ERR_S12');
    if (typeof K.kpHarca !== 'function' || !K.kpHarca(this.KESIF_UCRET, 'kesif-gorevi')) return this._hata('ERR_S11');
    const S = this._S();
    const rapor = {
      tur: 'kesif', t: this._simdi(), ucret: this.KESIF_UCRET,
      rakipId: r.id, ad: r.ad, etiket: r.etiket,
      uyeSayisi: this._sayi(r.uyeSayisi, 0),
      aktifUye: this._sayi(r.aktifUye, 0),
      seviye: this._sayi(r.seviye, 1),
      lig: r.lig, ligAd: (S && typeof S.ligBul === 'function') ? S.ligBul(r.ligPuan).ad : r.lig,
      ortalamaSkor: this._sayi(r.ortKatki, 0),
      haftalikPuan: this._sayi(r.haftalikPuan, 0),
      sonEtkinlik: this._sayi(r.haftalikTrend, 0),
      savasGecmisi: r.savasGecmisi || null,
      sinif: r.sinif || null
    };
    this._kesifKaydet(d, rapor);
    this._duyuru('savas', 'Keşif raporu hazır: ' + String(r.ad), { rakipId: r.id });
    this._kaydet();
    return this._tamam({ rapor: rapor, ucret: this.KESIF_UCRET });
  },

  // Savaş İzleme — ÜCRETSİZ · devam eden savaşın canlı skoru
  savasIzle() {
    const d = this._st();
    if (!d) return this._hata('ERR_S01');
    this.guncelle();
    if (!d.aktif) return this._hata('ERR_S07');
    const s = d.aktif;
    const simdi = this._simdi();
    return this._tamam({
      ucret: this.IZLEME_UCRET,
      bizPuan: this._sayi(s.bizPuan, 0),
      rakipPuan: this._rakipPuanSuana(s, simdi),
      rakipToplamTahmin: this._sayi(s.rakipPuan, 0),
      kalanMs: Math.max(0, s.bitis - simdi),
      kalan: this.sureMetni(Math.max(0, s.bitis - simdi)),
      onde: this._sayi(s.bizPuan, 0) > this._rakipPuanSuana(s, simdi)
    });
  },

  // Açık Kaynak İstihbaratı — ÜCRETSİZ · lig/turnuva geçmişi (tohumlu)
  acikKaynak(rakipId) {
    const r = this._rakipBul(rakipId);
    if (!r) return this._hata('ERR_S12');
    const S = this._S();
    const h = this.haftaId();
    const rnd = this._rng(this._hash32('osint:' + h + ':' + String(r.id)));
    const gecmis = [];
    for (let i = 1; i <= 6; i++) {
      gecmis.push({ hafta: h - i, siralama: 1 + Math.floor(rnd() * 60), lig: r.lig });
    }
    const turnuvalar = [];
    for (let i = 0; i < 3; i++) {
      turnuvalar.push({ no: i + 1, siralama: this.TURNUVA_ODUL[Math.floor(rnd() * this.TURNUVA_ODUL.length)].enFazla });
    }
    return this._tamam({
      ucret: this.ACIK_KAYNAK_UCRET,
      rakipId: r.id, ad: r.ad,
      ligAd: (S && typeof S.ligBul === 'function') ? S.ligBul(r.ligPuan).ad : r.lig,
      ligGecmisi: gecmis, turnuvaGecmisi: turnuvalar,
      elo: this._sayi(r.elo, 1000)
    });
  },

  // Savaş Simülasyonu — 500 KP · KlanSim.savasKazanmaOlasiligi kullanılır
  savasSimulasyonu(rakipVeyaId) {
    const K = this._K();
    const S = this._S();
    const d = this._st();
    if (!K || !d) return this._hata('ERR_S01');
    let r = (rakipVeyaId && typeof rakipVeyaId === 'object') ? rakipVeyaId : this._rakipBul(rakipVeyaId);
    if (!r) { const s = this.aktifSavas(); r = s ? s.rakip : null; }
    if (!r) return this._hata('ERR_S12');
    if (typeof K.kpHarca !== 'function' || !K.kpHarca(this.SIMULASYON_UCRET, 'savas-simulasyonu')) return this._hata('ERR_S11');
    const biz = this.bizimKlanOzet();
    let sonuc;
    if (S && typeof S.savasKazanmaOlasiligi === 'function') sonuc = S.savasKazanmaOlasiligi(biz, r);
    else sonuc = { olasilik: 0.5, bizimGuc: 0, rakipGuc: 0 };
    const p = this._sayi(sonuc.olasilik, 0.5);
    const tahmin = p >= 0.65 ? 'favori' : (p >= 0.45 ? 'basabas' : 'zayif');
    const rapor = {
      tur: 'simulasyon', t: this._simdi(), ucret: this.SIMULASYON_UCRET,
      rakipId: r.id, ad: r.ad,
      olasilik: p, yuzde: Math.round(p * 1000) / 10,
      bizimGuc: sonuc.bizimGuc, rakipGuc: sonuc.rakipGuc,
      tahmin: tahmin,
      uyari: 'Tahmin her zaman doğru olmayabilir.'      // §40.2 "Risk" sütunu
    };
    this._kesifKaydet(d, rapor);
    this._kaydet();
    return this._tamam({ rapor: rapor, ucret: this.SIMULASYON_UCRET });
  },

  // §40.4'ün UYGULANMAYAN maddeleri — şeffaflık için listelenir (S8)
  UYGULANMAYAN: [
    { bolum: '40.3', ad: 'Yasadışı casusluk (sahte hesap, rüşvet, hesap çalma, API sızıntısı)', neden: 'Gerçek hesap/sunucu yok — konusuz.' },
    { bolum: '40.4', ad: 'İki Faktörlü Doğrulama (2FA)', neden: 'Hesap sistemi yok, oyun tek cihazda çalışıyor.' },
    { bolum: '40.4', ad: 'Şüpheli Aktivite Uyarısı', neden: 'Sohbet yok (sözleşme §0), izlenecek davranış yok.' },
    { bolum: '40.4', ad: 'Klan Gizlilik Seviyesi (savaş sohbeti)', neden: 'Sohbet KALDIRILDI (sözleşme §0).' },
    { bolum: '40.4', ad: 'Casusluk Sigortası', neden: 'Casusluk suçu yok → sigorta konusuz.' },
    { bolum: '40.4', ad: 'Kara Liste', neden: 'Liderler arası paylaşım = sunucu gerekir.' },
    { bolum: '40.5', ad: 'Hain etiketi / diplomasi sıfırlama', neden: 'İttifak modülü yok.' },
    { bolum: '40.2', ad: 'Diplomatik Bilgi Toplama', neden: 'Dost klan/ittifak sistemi yok (S9).' },
    { bolum: '29.2', ad: 'Beraberlikte kaptan 1v1', neden: 'Bracket beraberlik üretmez (S12).' },
    { bolum: '29.3', ad: 'Tüm Üyelere Özel Araç', neden: 'Klan sistemi ana ekonomiye araç enjekte edemez (S6) → kozmetik.' }
  ],

  // ═══════════════════════════════════════════════════════════════
  //  KURULUM
  // ═══════════════════════════════════════════════════════════════
  hazir() {
    const S = this._S();
    if (S && typeof S.hazir === 'function') S.hazir();
    this._st();
    this.guncelle();
    return true;
  },

  // ═══════════════════════════════════════════════════════════════
  //  SELFTEST — 🔴 HER KONTROL ÖLÇEREK
  // ═══════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const K = this._K();
    const S = this._S();
    const eskiZaman = this._testZaman;

    // Gerçek kaydın "önce" görüntüsü — testin ona dokunmadığını ÖLÇMEK için.
    let _sdGercek = null, _oncekiKayit = null;
    try {
      if (typeof SaveData !== 'undefined' && SaveData && SaveData.data) {
        _sdGercek = SaveData;
        _oncekiKayit = JSON.stringify([SaveData.data.klan, SaveData.data.klanGunluk, SaveData.data.gold]);
      }
    } catch (e) { _sdGercek = null; }

    // Klan.js'in sanal kipini kullan — gerçek kayıt KİRLENMEZ.
    const eskiSanal = K ? K._sanal : null;
    const eskiYerel = K ? K._yerel : null;
    const eskiKlanZaman = K ? K._testZaman : null;
    const eskiSimZaman = S ? S._testZaman : null;

    const T0 = 1754100000000;
    const self = this;
    const klanKur = function (sv) {
      if (!K) return false;
      K._sanal = true;
      K._yerel = { klan: null, klanGunluk: null, gold: 1000000, playerLevel: 50 };
      K._testZaman = T0;
      self._testZaman = T0;
      const kr = K.kur('Savas Test', 'SVT', 3, 'acik');
      if (!kr.ok) return false;
      // Seviye 15+ (savaş kilidi) — XP eğrisinin kümülatifinden
      const e = K._egriKur();
      K._yerel.klan.xp = e.kumulatif[Math.min(50, Math.max(1, sv || 20))];
      K._yerel.klan.kp = 50000;
      K._yerel.klan.ligPuan = 120000;         // bronz1
      K._yerel.klan.haftalikPuan = 9000;
      return true;
    };

    try {
      if (S) S._testZaman = T0;
      this._testZaman = T0;

      // ── 1: MODÜL ADI ÇAKIŞMASI YOK ──
      let cakisma = false;
      try { if (typeof ClanWar !== 'undefined' && ClanWar === this) cakisma = true; } catch (e) { }
      try { if (typeof Tournament !== 'undefined' && Tournament === this) cakisma = true; } catch (e) { }
      r.adCakismasiYok = (cakisma === false) && (this.ad === 'klanSavas');

      // ── 2: §8.4 ÖRNEĞİ — 1060 + 850 + 700 = 2.610 ──
      const ornek = this.savasPuani([
        [1200, 1100, 1050, 1000, 950],
        [950, 900, 850, 800, 750],
        [800, 750, 700, 650, 600]
      ], 5);
      r.ornek2610 = (ornek.toplam === 2610) &&
        (ornek.uyeOrt[0] === 1060) && (ornek.uyeOrt[1] === 850) && (ornek.uyeOrt[2] === 700);

      // ── 3: EN İYİ N ORTALAMASI N'E GÖRE DEĞİŞİYOR (3 / 5 / 8) ──
      const veri = [[1200, 1100, 1050, 1000, 950, 400, 300, 200]];
      const n3 = this.savasPuani(veri, 3).toplam;      // (1200+1100+1050)/3 = 1116,67
      const n5 = this.savasPuani(veri, 5).toplam;      // 1060
      const n8 = this.savasPuani(veri, 8).toplam;      // 775
      r.enIyiNDegisiyor = (Math.abs(n3 - 1116.67) < 0.02) && (n5 === 1060) && (Math.abs(n8 - 775) < 0.01) &&
        (n3 > n5) && (n5 > n8);

      // ── 4: SIRALAMA AZALAN (tuzak D17 — yön ters giderse yakala) ──
      r.azalanSiralama = (this.savasPuani([[100, 900, 500]], 1).toplam === 900);

      // ── 4b: BÖLEN DAİMA N (S3) — eksik yarış CEZALANDIRILIR ──
      r.bolenDaimaN = (this.savasPuani([[1000]], 5).toplam === 200) &&
        (this.savasPuani([[1000, 1000]], 5).toplam === 400) &&
        (this.savasPuani([[1000, 1000, 1000, 1000, 1000]], 5).toplam === 1000) &&
        (this.savasPuani([[]], 5).toplam === 0);

      // ── 5: ZAMAN BONUSU 4 ARALIK ──
      r.zamanBonus4Aralik = (this.zamanBonusu(59) === 0.20) && (this.zamanBonusu(0) === 0.20) &&
        (this.zamanBonusu(60) === 0.10) && (this.zamanBonusu(119) === 0.10) &&
        (this.zamanBonusu(120) === 0.05) && (this.zamanBonusu(179) === 0.05) &&
        (this.zamanBonusu(180) === 0.00) && (this.zamanBonusu(600) === 0.00);

      // ── 6: YARIŞ PUANI FORMÜLÜ (ölçülmüş değer) ──
      // 1000×0,4 + 10×2 + 200×0,1 = 400+20+20 = 440 → 50 sn (+%20) = 528
      const yp = this.yarisPuaniDetay(1000, 10, 200, 50);
      r.yarisPuaniFormul = (yp.taban === 440) && (yp.bonusOran === 0.20) && (yp.puan === 528) &&
        (this.yarisPuani(1000, 10, 200, 200) === 440);

      // ── 7: SAVAŞ TÜRLERİ TABLOSU (§8.2 birebir) ──
      r.savasTurleri = (this.TUR.hizli.sureMs === 12 * 3600000 && this.TUR.hizli.uye === 5 && this.TUR.hizli.enIyiN === 3) &&
        (this.TUR.normal.sureMs === 24 * 3600000 && this.TUR.normal.uye === 10 && this.TUR.normal.enIyiN === 5) &&
        (this.TUR.uzun.sureMs === 48 * 3600000 && this.TUR.uzun.uye === 15 && this.TUR.uzun.enIyiN === 8) &&
        (this.TUR.turnuva.sureMs === 7 * 86400000 && this.TUR.turnuva.uye === 20 && this.TUR.turnuva.kademeli === true);

      // ── 8-10: KP ÖDÜLLERİ (sözleşme §6 — ham değerler) ──
      if (K) {
        r.kpGalibiyet2050 = (K.kpCevir(this.ODUL.galibiyet.altin, this.ODUL.galibiyet.elmas) === 2050);
        r.kpBeraberlik1025 = (K.kpCevir(this.ODUL.beraberlik.altin, this.ODUL.beraberlik.elmas) === 1025);
        r.kpMaglubiyet410 = (K.kpCevir(this.ODUL.maglubiyet.altin, this.ODUL.maglubiyet.elmas) === 410);
        r.telafi410 = (K.kpCevir(this.TELAFI.altin, this.TELAFI.elmas) === 410);
      } else {
        r.kpGalibiyet2050 = false; r.kpBeraberlik1025 = false;
        r.kpMaglubiyet410 = false; r.telafi410 = false;
      }

      // ── 11: TURNUVA ÖDÜLLERİ (§29.3 → KP) ──
      if (K) {
        const bek = [45000, 22500, 11000, 4500, 2250, 1100];
        const sira = [1, 2, 3, 5, 9, 17];
        let hepsi = true;
        for (let i = 0; i < sira.length; i++) {
          const k = this.turnuvaOdulKademesi(sira[i]);
          if (!k || K.kpCevir(k.altin, k.elmas) !== bek[i]) hepsi = false;
        }
        r.turnuvaOdulKp = hepsi && (this.turnuvaOdulKademesi(33) === null);
      } else r.turnuvaOdulKp = false;

      // ── 12: ÖZEL ARAÇ ÖDÜLÜ KALDIRILDI (S6) ──
      let aracVar = false;
      for (let i = 0; i < this.TURNUVA_ODUL.length; i++) {
        const o = this.TURNUVA_ODUL[i];
        if (o.arac || /arac|araç|vehicle/i.test(String(o.kozmetik || ''))) aracVar = true;
      }
      const pk = this.turnuvaOdulPaketi(1);
      r.ozelAracYok = (aracVar === false) && (!!pk) && (pk.arac === null) && (pk.kozmetik === 'efsanevi_turnuva_kupasi');

      // ── 13: DURUM MAKİNESİ — GEÇERSİZ GEÇİŞ REDDEDİLİYOR ──
      r.durumGecisi = (this.gecisGecerli('beklemede', 'eslesme') === true) &&
        (this.gecisGecerli('eslesme', 'aktif') === true) &&
        (this.gecisGecerli('aktif', 'bitti') === true) &&
        (this.gecisGecerli('bitti', 'oduller_alindi') === true) &&
        (this.gecisGecerli('beklemede', 'aktif') === false) &&
        (this.gecisGecerli('beklemede', 'bitti') === false) &&
        (this.gecisGecerli('aktif', 'oduller_alindi') === false) &&
        (this.gecisGecerli('oduller_alindi', 'aktif') === false) &&
        (this.DURUMLAR.length === 5);

      // ── 14-16: BRACKET 128 → 1, BYE DOLGULU ──
      const kat128 = [];
      for (let i = 0; i < 128; i++) kat128.push({ id: 'C' + (100 + i), ad: 'K' + i, elo: 1000 + i });
      const br = this.turnuvaBracket(kat128);
      r.bracket128 = (br.katilimci === 128) && (br.bye === 0) &&
        (br.boyutlar.join(',') === '128,64,32,16,8,4,2,1') &&
        (br.turlar.length === 7) &&
        (br.turlar[0].eslesmeler.length === 64) && (br.turlar[6].eslesmeler.length === 1);
      // 1. tohum ↔ 128. tohum eşleşmesi (social.js komşu eşleştirmesinden farkı)
      const m0 = br.turlar[0].eslesmeler[0];
      r.bracketTohumEslesme = (m0.a.tohum === 1) && (m0.b.tohum === 128);
      // 100 katılımcı → 28 BYE
      const kat100 = kat128.slice(0, 100);
      const br100 = this.turnuvaBracket(kat100);
      let byeSay = 0;
      for (let i = 0; i < br100.tohumlu.length; i++) if (br100.tohumlu[i].bye) byeSay++;
      r.bracketBye = (br100.katilimci === 128) && (br100.bye === 28) && (byeSay === 28) &&
        (br100.gercekKatilimci === 100);

      // ── 17: ELO — 3 BİLİNEN VAKA (K=32, KlanSim.elo) ──
      if (S) {
        const e1 = S.elo(1000, 1000, 1);       // 1000 + 32×(1-0,5) = 1016
        const e2 = S.elo(1000, 1000, 0);       // 984
        const e3 = S.elo(1200, 1000, 1);       // beklenen 0,7597 → 1200+32×0,2403 = 1207,69
        r.elo3Vaka = (Math.abs(e1 - 1016) < 1e-9) && (Math.abs(e2 - 984) < 1e-9) &&
          (Math.abs(e3 - 1207.69) < 0.01) &&
          (Math.abs(S.eloBeklenen(1000, 1000) - 0.5) < 1e-12);
      } else r.elo3Vaka = false;

      // ── 18: TURNUVA AŞAMALARI (§29.2) ──
      r.turnuvaAsama = (this.TURNUVA_ASAMA.length === 4) && (this.turnuvaGunToplam() === 20) &&
        (this.TURNUVA_ASAMA[0].gun === 3) && (this.TURNUVA_ASAMA[1].gun === 4) &&
        (this.TURNUVA_ASAMA[2].gun === 10) && (this.TURNUVA_ASAMA[3].gun === 3) &&
        (this.turnuvaTakvim(2026).length === 8);
      const tk = this.turnuvaTakvim(2026)[0];
      const as = this.turnuvaAsamasi(tk.baslangic + 1);
      r.turnuvaAsamaTespit = (as.aktif === true) && (as.asama.id === 'eleme') &&
        (this.turnuvaAsamasi(tk.bitis + this.GUN_MS).aktif === false);

      // ── 19: TURNUVA SİMÜLASYONU DETERMİNİSTİK ──
      const sim1 = this.turnuvaSimule(kat128, 'X1');
      const sim2 = this.turnuvaSimule(kat128, 'X1');
      const sim3 = this.turnuvaSimule(kat128, 'X2');
      r.turnuvaDeterministik = (!!sim1.sampiyon) && (sim1.sampiyon.id === sim2.sampiyon.id) &&
        (sim1.turlar.length === 7) &&
        (JSON.stringify(sim1.turlar.map(function (t) { return t.eslesmeler.map(function (m) { return m.kazanan; }); })) ===
          JSON.stringify(sim2.turlar.map(function (t) { return t.eslesmeler.map(function (m) { return m.kazanan; }); })));
      r.turnuvaFarkliTohum = (sim3.sampiyon !== null);
      // Yerleşim bandı: şampiyon 1 · finalist 2 · yarı finalist 4 · çeyrek 8
      const yer = sim1.yerlesim;
      const yerDegerler = {};
      for (const id in yer) if (Object.prototype.hasOwnProperty.call(yer, id)) yerDegerler[yer[id]] = (yerDegerler[yer[id]] || 0) + 1;
      r.turnuvaYerlesim = (yer[sim1.sampiyon.id] === 1) && (yerDegerler[2] === 1) &&
        (yerDegerler[4] === 2) && (yerDegerler[8] === 4) && (yerDegerler[128] === 64) &&
        (Object.keys(yer).length === 128);
      // Finali kaybeden ŞAMPİYON ödülü almamalı (ilk yazımdaki bug)
      let finalKaybeden = null;
      for (const id in yer) if (yer[id] === 2) finalKaybeden = id;
      r.finalistSampiyonDegil = (this.turnuvaOdulKademesi(yer[finalKaybeden]).ad === 'Finalist') &&
        (this.turnuvaOdulKademesi(1).ad === 'Şampiyon') &&
        (this.turnuvaOdulKademesi(4).ad === 'Yarı Finalist') &&
        (this.turnuvaOdulKademesi(8).ad === 'Çeyrek Finalist');

      // ── 20+: KLAN GEREKTİREN CANLI AKIŞ ──
      if (K && S && klanKur(20)) {
        // Math.random SAYACI — bu bloktaki HER çağrı sayılır.
        const eskiRnd = Math.random;
        let rndSayac = 0;
        Math.random = function () { rndSayac++; return eskiRnd(); };

        let akis = {};
        try {
          r.savasKilidi = (K.seviye() >= 15) && (this.savasAcikMi() === true);

          // Eşleştirme: 6 kriterin hepsi uygulanmış mı?
          const e = this.esles('normal', 2900, 1);
          r.esleme6Kriter = e.ok === true && e.kriterler.lig === true && e.kriterler.aktifSavas === true &&
            e.kriterler.uyeSayisi === true && e.kriterler.sonSavasSirasi === true &&
            e.kriterler.puanFarki === true && e.kriterler.ilk5Rastgele === true;
          // Aynı tohum → aynı rakip; farklı savaş no → (genelde) farklı aday sırası
          const e2 = this.esles('normal', 2900, 1);
          const e3 = this.esles('normal', 2901, 1);
          r.ayniTohumAyniRakip = (e.rakip.id === e2.rakip.id) &&
            (JSON.stringify(e.adaySayilari) === JSON.stringify(e2.adaySayilari));
          r.farkliHaftaCalisir = (e3.ok === true) && (typeof e3.rakip.id === 'string');
          // Aday listesindeki bot gerçekten aynı ligde mi?
          const biz = this.bizimKlanOzet();
          r.eslemeAyniLig = (e.rakip.lig === biz.lig) || (e.gevsetilen.indexOf('lig') >= 0);

          // Bot katkıları tohumlu mu?
          const b1 = this.botKatkilari('normal', 1, 2900, T0);
          const b2 = this.botKatkilari('normal', 1, 2900, T0);
          const b3 = this.botKatkilari('normal', 2, 2900, T0);
          r.botKatkiTohumlu = (b1.toplam === b2.toplam) && (b1.uyeler.length === 9) &&
            (JSON.stringify(b1.uyeler) === JSON.stringify(b2.uyeler)) && (b3.toplam !== b1.toplam);

          // Rakip puanı tohumlu mu?
          const rp1 = this.rakipPuanHesapla(e.rakip, 'normal', 1, 2900);
          const rp2 = this.rakipPuanHesapla(e.rakip, 'normal', 1, 2900);
          r.rakipPuanTohumlu = (rp1.puan === rp2.puan) && (rp1.puan > 0);

          // ── TAM SAVAŞ AKIŞI ──
          const bas = this.savasBaslat('normal');
          akis.bas = bas;
          r.savasBasladi = (bas.ok === true) && (this._st().durum === 'aktif');
          // Aktifken ikinci savaş açılamaz
          r.ikinciSavasYok = (this.eslesmeBaslat('hizli').ok === false);

          // Süre dolmadan ödül YOK
          const erken = this.oduluAl();
          r.sureDolmadanOdulYok = (erken.ok === false) && (erken.hata === 'ERR_S08');

          // Kazanmayı garantile: bol yarış ekle
          const st = this._st();
          const hedef = st.aktif.rakipPuan;
          for (let i = 0; i < 12; i++) this.yarisEkle(20000, 40, 3000, 45);
          r.yarisEklendi = (this._st().aktif.yarislar.length === 12) && (this._st().aktif.bizPuan > 0);
          r.sinifCarpaniUygulandi = (typeof this._st().aktif.sinifCarpani === 'number');

          // UI verisi şekli — CLAN_WAR_UI uyumu
          const ui = this.uiVerisi();
          r.uiVerisiSekli = !!ui && typeof ui.myClan.score === 'number' && typeof ui.enemyClan.score === 'number' &&
            typeof ui.myClan.name === 'string' && typeof ui.timeLeft === 'string' &&
            /^\d{2}:\d{2}:\d{2}$/.test(ui.timeLeft) &&
            Array.isArray(ui.topPlayers) && ui.topPlayers.length === 5 &&
            typeof ui.topPlayers[0].score === 'number' && typeof ui.topPlayers[0].clan === 'string' &&
            typeof ui.myRank === 'number' && typeof ui.phase === 'string';
          // CLAN_WAR_UI `color + 'CC'` yapıyor → HEX ŞART (tuzak #5)
          r.renklerHex = /^#[0-9a-fA-F]{6}$/.test(ui.myClan.color) && /^#[0-9a-fA-F]{6}$/.test(ui.enemyClan.color);

          // Savaş İzleme ücretsiz
          const izle = this.savasIzle();
          r.izlemeUcretsiz = (izle.ok === true) && (izle.ucret === 0);

          // Keşif 100 KP, simülasyon 500 KP — GERÇEKTEN düşüyor mu?
          const kpOnce = K.kp();
          const kes = this.kesifGorevi(st.aktif.rakip.id);
          const kpKesif = K.kp();
          const sim = this.savasSimulasyonu(st.aktif.rakip);
          const kpSim = K.kp();
          r.kesifUcret100 = (kes.ok === true) && (kpOnce - kpKesif === 100) && (kes.rapor.uyeSayisi > 0);
          r.simulasyonUcret500 = (sim.ok === true) && (kpKesif - kpSim === 500) &&
            (sim.rapor.olasilik > 0) && (sim.rapor.olasilik < 1);
          // 🔴 S13 KİLİDİ: savaş GERÇEKTEN kazanılabilir/kaybedilebilir olmalı.
          //    Düzeltmeden önce ölçülen olasılık 1,0000 (%100) idi.
          r.olasilikDengeli = (sim.rapor.olasilik > 0.15) && (sim.rapor.olasilik < 0.85);
          r._olculenOlasilik = sim.rapor.olasilik;
          // S13 — ortKatki LİG MEDYANI ölçeğinden gelmeli.
          // 🔴 Elenen iki formül de burada AÇIKÇA reddediliyor:
          //    (a) haftalikPuan/gercekUye  (b) referansPuan()
          const bz = this.bizimKlanOzet();
          const medyan = this.ligMedyanOrtKatki(bz.lig);
          const konum = this.ligBandKonumu(bz.lig, bz.ligPuan);
          r.ortKatkiLigOlcekli = (medyan > 0) &&
            (bz.ortKatki === Math.round(medyan * (this.KONUM_TABAN + this.KONUM_ARALIK * konum))) &&
            (bz.ortKatki >= medyan * 0.9) && (bz.ortKatki <= medyan * 1.35) &&
            (bz.ortKatki !== Math.round(bz.haftalikPuan / bz.gercekUye)) &&   // (a) elendi
            (bz.ortKatki !== this.referansPuan()) &&                          // (b) elendi
            (bz.uyeSayisi >= this.ETKIN_UYE_TABAN) && (bz.gercekUye === 1);
          // Bizim gücümüz aynı ligdeki botlarla AYNI BÜYÜKLÜK MERTEBESİNDE mi?
          const bizGuc = S.klanGucu(bz);
          const rkGuc = S.klanGucu(st.aktif.rakip);
          r.gucAyniMertebede = (bizGuc > rkGuc * 0.3) && (bizGuc < rkGuc * 3.0);
          r._olculenBizGuc = Math.round(bizGuc);
          r._olculenRakipGuc = Math.round(rkGuc);
          // Bakiye yetmezse yan etki YOK
          const kk = K.al(); const yedekKp = kk.kp; kk.kp = 10;
          const yetmez = this.savasSimulasyonu(st.aktif.rakip);
          r.kpYetmezseYanEtkiYok = (yetmez.ok === false) && (K.kp() === 10);
          kk.kp = yedekKp;

          // Açık kaynak ücretsiz
          const ak = this.acikKaynak(st.aktif.rakip.id);
          r.acikKaynakUcretsiz = (ak.ok === true) && (ak.ucret === 0) && (ak.ligGecmisi.length === 6);

          // 72 saat gözlem süresi
          const yeniUye = { id: 'yeni', ad: 'Yeni', katilim: T0 - 3600000 };
          const eskiUye = { id: 'eski', ad: 'Eski', katilim: T0 - 100 * 3600000 };
          r.gozlem72Saat = (this.savasaKatilabilirMi(yeniUye, T0) === false) &&
            (this.savasaKatilabilirMi(eskiUye, T0) === true) &&
            (this.GOZLEM_MS === 72 * 3600000);

          // Süreyi ilerlet → savaş bitsin
          this._testZaman = T0 + this.TUR.normal.sureMs + 1000;
          K._testZaman = this._testZaman;
          const g = this.guncelle();
          r.savasBitti = (g.degisti === true) && (this._st().durum === 'bitti') &&
            (['galibiyet', 'beraberlik', 'maglubiyet'].indexOf(g.sonuc) >= 0);
          r.eloGuncellendi = (typeof this._st().aktif.eloSonra === 'number') &&
            (this._st().aktif.eloSonra !== this._st().aktif.eloOnce);
          // Süre dolunca yarış eklenemez
          r.sureSonrasiYarisYok = (this.yarisEkle(1000, 1, 1, 10).ok === false);

          // Ödül — bir kez
          const kpOdulOnce = K.kp();
          const od = this.oduluAl();
          const kpOdulSonra = K.kp();
          const beklenenKp = this.odulKp(this._st().aktif.sonuc);
          r.odulVerildi = (od.ok === true) && (kpOdulSonra - kpOdulOnce === beklenenKp) &&
            (beklenenKp > 0) && (this._st().durum === 'oduller_alindi');
          const od2 = this.oduluAl();
          r.odulIkiKezYok = (od2.ok === false) && (od2.hata === 'ERR_S09') && (K.kp() === kpOdulSonra);
          r.gecmiseYazildi = (this._st().gecmis.length === 1) && (this._st().toplam === 1);

          // ── LİG UYUŞMAZLIĞI → SAVAŞ İPTAL (§14.2 Senaryo 5) ──
          const d2 = this._st();
          d2.aktif = null; d2.durum = 'beklemede';
          this._testZaman = T0; K._testZaman = T0;
          const eBek = this.eslesmeBaslat('normal');
          const dd = this._st();
          // Rakibi zorla Efsane ligine taşı → uyuşmazlık
          dd._bekleyen.rakip.lig = 'efsane';
          dd._bekleyen.rakip.ligPuan = 20000000;
          const kpIptalOnce = K.kp();
          const ip = this.savasBaslat('normal');
          r.ligUyusmazligiIptal = (eBek.ok === true) && (ip.ok === false) && (ip.hata === 'ERR_S06') &&
            (ip.iptal === true) && (this._st().durum === 'beklemede') &&
            (K.kp() - kpIptalOnce === ip.telafiKp) && (ip.telafiKp > 0);
          r.ligUyumluKontrol = (this.ligUyumlu({ lig: 'bronz1' }).uyumlu === true) &&
            (this.ligUyumlu({ lig: 'efsane' }).uyumlu === false);

          // ── TURNUVA KATILIM + ÖDÜL AKIŞI ──
          const tv1 = this.turnuvaKos('2026-T1', 2900);
          const tv2 = this.turnuvaKos('2026-T1', 2900);     // aynı id → YENİ çekiliş YOK
          r.turnuvaTohumlu = (tv1.ok === true) && (tv2.tekrar === true) &&
            (tv1.turnuva.siralama === tv2.turnuva.siralama) &&
            (tv1.turnuva.siralama >= 1) && (tv1.turnuva.siralama <= 128) &&
            (tv1.turnuva.turSayisi === 7);
          const kpTvOnce = K.kp();
          const tod = this.turnuvaOduluAl();
          const beklenenTvKp = this.turnuvaOdulKp(tv1.turnuva.siralama);
          r.turnuvaOdulVerildi = (tod.ok === true) && (tod.arac === null) &&
            (K.kp() - kpTvOnce === beklenenTvKp) && (tod.kp === beklenenTvKp);
          const tod2 = this.turnuvaOduluAl();
          r.turnuvaOdulIkiKezYok = (tod2.ok === false) && (tod2.hata === 'ERR_S09') && (K.kp() - kpTvOnce === beklenenTvKp);
          r._olculenTurnuvaSira = tv1.turnuva.siralama;
          r._olculenTurnuvaKp = beklenenTvKp;

          // 🔴 S17 KİLİDİ: turnuva KAZANILABİLİR olmalı. Düzeltmeden önce
          //    oyuncu 40/40 turnuvada 128. oluyordu (ödül 0 KP, saha dünyanın
          //    en güçlü 127 klanıydı). 20 turnuva koşulup dağılım SAYILIR.
          const dagilim = {}; let kpTop = 0, ilerleyen = 0, TN = 20;
          for (let i = 0; i < TN; i++) {
            const dd2 = this._st(); dd2.turnuva = null;
            const tt = this.turnuvaKos('OLCUM-T' + i, 2900 + i);
            const sr = tt.turnuva.siralama;
            dagilim[sr] = (dagilim[sr] || 0) + 1;
            kpTop += tt.turnuva.kp;
            if (sr < 128) ilerleyen++;
          }
          this._st().turnuva = null;
          r.turnuvaKazanilabilir = (ilerleyen >= 3) && (kpTop > 0) &&
            (Object.keys(dagilim).length >= 2);
          r._olcumTurnuvaIlerleyen = ilerleyen + '/' + TN;
          r._olcumTurnuvaOrtKp = Math.round(kpTop / TN);
          r._olcumTurnuvaDagilim = JSON.stringify(dagilim);

        } finally {
          Math.random = eskiRnd;
        }
        // 🔴 Math.random bu modülde HİÇ çağrılmadı mı?
        r.mathRandomYok = (rndSayac === 0);
        r._olculenMathRandom = rndSayac;
      } else {
        r.savasKilidi = false; r.esleme6Kriter = false; r.ayniTohumAyniRakip = false;
        r.farkliHaftaCalisir = false; r.eslemeAyniLig = false; r.botKatkiTohumlu = false;
        r.rakipPuanTohumlu = false; r.savasBasladi = false; r.ikinciSavasYok = false;
        r.sureDolmadanOdulYok = false; r.yarisEklendi = false; r.sinifCarpaniUygulandi = false;
        r.uiVerisiSekli = false; r.renklerHex = false; r.izlemeUcretsiz = false;
        r.kesifUcret100 = false; r.simulasyonUcret500 = false; r.kpYetmezseYanEtkiYok = false;
        r.acikKaynakUcretsiz = false; r.gozlem72Saat = false; r.savasBitti = false;
        r.eloGuncellendi = false; r.sureSonrasiYarisYok = false; r.odulVerildi = false;
        r.odulIkiKezYok = false; r.gecmiseYazildi = false; r.ligUyusmazligiIptal = false;
        r.ligUyumluKontrol = false; r.mathRandomYok = false;
        r.olasilikDengeli = false; r.ortKatkiLigOlcekli = false; r.gucAyniMertebede = false;
        r.turnuvaTohumlu = false; r.turnuvaOdulVerildi = false; r.turnuvaOdulIkiKezYok = false;
        r.turnuvaKazanilabilir = false;
      }

      // ══════════════════════════════════════════════════════════════
      //  DENGE ÖLÇÜMÜ — 🔴 "kazanılabilir/kaybedilebilir" İDDİASINI ÖLÇER
      //  Aynı klanla peş peşe savaş koşulur; kazanma oranı SAYILIR.
      //  (S13/S14/S15/S16 düzeltmelerinin hepsi bu ölçümle bulundu.)
      // ══════════════════════════════════════════════════════════════
      if (K && S) {
        const denge = function (yarisSayisi, isinma) {
          if (!klanKur(20)) return null;
          S.onbellegiTemizle(); self._medyanOnbellek = {};
          K._yerel.klan.ligPuan = 210000; K._yerel.klan.haftalikPuan = 8000; K._yerel.klan.kp = 2000000;
          let zaman = T0;
          const kos = function (adet, yaris, etiket) {
            let g = 0, n = 0, pTop = 0;
            for (let w = 0; w < adet; w++) {
              const d0 = self._st(); d0.aktif = null; d0.durum = 'beklemede';
              d0.haftaSavasHafta = -1; d0.haftaSavasSayac = 0;   // S18 limiti ölçümü engellemesin
              self._testZaman = zaman; K._testZaman = zaman; S._testZaman = zaman;
              if (!self.savasBaslat('normal').ok) continue;
              const st = self._st();
              pTop += self._sayi(st.aktif.kazanmaOlasiligi, 0.5);
              const rr = self._rng(self._hash32('denge:' + etiket + ':' + w));
              for (let i = 0; i < yaris; i++) {
                const kx = 0.75 + rr() * 0.5;
                self.yarisEkle(8000 * kx, 15 * kx, 800 * kx, 100);
              }
              zaman = st.aktif.bitis + 1000;
              self._testZaman = zaman; K._testZaman = zaman;
              const gg = self.guncelle();
              n++; if (gg.sonuc === 'galibiyet') g++;
              zaman += 3600000;
            }
            return { n: n, g: g, oran: n ? g / n : 0, tahmin: n ? pTop / n : 0 };
          };
          kos(isinma, 8, 'isinma');            // referans kalibrasyonu
          return kos(24, yarisSayisi, 'olcum' + yarisSayisi);
        };
        const d8 = denge(8, 10);
        const d0 = denge(0, 10);
        const d2 = denge(2, 10);
        r._olcumKazanma8 = d8 ? Math.round(d8.oran * 1000) / 10 : null;
        r._olcumKazanma0 = d0 ? Math.round(d0.oran * 1000) / 10 : null;
        r._olcumKazanma2 = d2 ? Math.round(d2.oran * 1000) / 10 : null;
        r._olcumTahmin8 = d8 ? Math.round(d8.tahmin * 1000) / 1000 : null;
        // 1) Savaş GERÇEKTEN kazanılabilir VE kaybedilebilir
        r.kazanmaOraniDengeli = !!d8 && (d8.n === 24) && (d8.oran >= 0.20) && (d8.oran <= 0.80);
        // 2) OYNAMAK belirleyici: hiç yarışmayan kazanamaz, az yarışan zorlanır
        r.efortBelirleyici = !!d0 && !!d2 && (d0.oran === 0) && (d2.oran < d8.oran) && (d8.oran > 0.20);
        // 3) 500 KP'lik simülasyon tahmini gerçeğe YAKIN olmalı (yanlış bilgi satmayalım)
        r.tahminKalibre = !!d8 && (Math.abs(d8.tahmin - d8.oran) < 0.20);
      } else {
        r.kazanmaOraniDengeli = false; r.efortBelirleyici = false; r.tahminKalibre = false;
      }

      // ══════════════════════════════════════════════════════════════
      //  S18 — HAFTALIK LİMİT + KP EKONOMİSİ (ölçerek)
      // ══════════════════════════════════════════════════════════════
      if (K && S) {
        if (klanKur(20)) {
          S.onbellegiTemizle(); this._medyanOnbellek = {};
          K._yerel.klan.ligPuan = 210000; K._yerel.klan.haftalikPuan = 8000; K._yerel.klan.kp = 0;
          let zaman = T0, basarili = 0, engellenen = 0, kpKazanc = 0;
          const kalanBaslangic = this.haftalikKalanSavas();
          for (let w = 0; w < 6; w++) {
            const d0 = this._st(); d0.aktif = null; d0.durum = 'beklemede';
            this._testZaman = zaman; K._testZaman = zaman; S._testZaman = zaman;
            const b = this.savasBaslat('normal');
            if (!b.ok) { if (b.hata === 'ERR_S15') engellenen++; continue; }
            basarili++;
            const st = this._st();
            for (let i = 0; i < 8; i++) this.yarisEkle(8000, 15, 800, 100);
            zaman = st.aktif.bitis + 1000;
            this._testZaman = zaman; K._testZaman = zaman;
            this.guncelle();
            const kpO = K.kp(); this.oduluAl(); kpKazanc += (K.kp() - kpO);
            zaman += 3600000;
          }
          r.haftalikLimit = (kalanBaslangic === this.HAFTALIK_SAVAS_LIMITI) &&
            (basarili === this.HAFTALIK_SAVAS_LIMITI) && (engellenen === 6 - this.HAFTALIK_SAVAS_LIMITI) &&
            (this.haftalikKalanSavas() === 0);
          // Hafta dönünce hak yenilenir
          this._testZaman = T0 + this.HAFTA_MS * 2; K._testZaman = this._testZaman; S._testZaman = this._testZaman;
          r.haftaDonunceYenilenir = (this.haftalikKalanSavas() === this.HAFTALIK_SAVAS_LIMITI);
          // 🔴 H2 (3 Ağu, Ajan H) — BANT YENİDEN KİLİTLENDİ.
          //    Eski bant (800 < kp < 6.000) 3.690 KP/hafta'yı "makul" sayıyordu;
          //    oysa TÜM klan sisteminin sözleşme §6 hedefi 300-800 KP/hafta.
          //    Ödeme ölçeği (ODUL_OLCEK) sonrası ölçülen: 2 savaş = 37 KP.
          //    Bant, ölçeğin kazara 1'e dönmesini de yakalayacak kadar dar.
          r.haftalikKpMakul = (kpKazanc >= 10) && (kpKazanc <= 150);
          r._olculenHaftalikKp = kpKazanc;
          r._olculenFormaHafta = kpKazanc > 0 ? Math.round(10000 / kpKazanc * 10) / 10 : null;
        } else { r.haftalikLimit = false; r.haftaDonunceYenilenir = false; r.haftalikKpMakul = false; }
      } else { r.haftalikLimit = false; r.haftaDonunceYenilenir = false; r.haftalikKpMakul = false; }

      // ── UYGULANMAYANLAR ŞEFFAF (S8/S9) ──
      r.uygulanmayanListesi = Array.isArray(this.UYGULANMAYAN) && this.UYGULANMAYAN.length >= 8 &&
        this.UYGULANMAYAN.every(function (x) { return !!x.bolum && !!x.ad && !!x.neden; });

      // ── SAVAŞ ROZETLERİ HEX ──
      r.rozetHex = this.SAVAS_ROZET.length === 3 &&
        this.SAVAS_ROZET.every(function (x) { return /^#[0-9a-fA-F]{6}$/.test(x.renk); }) &&
        this.TUR_SIRA.every(function (t) { return /^#[0-9a-fA-F]{6}$/.test(self.TUR[t].renk); });

      // ── SÜRE METNİ ──
      r.sureMetni = (this.sureMetni(51728000) === '14:22:08') && (this.sureMetni(0) === '00:00:00') &&
        (this.sureMetni(-5) === '00:00:00');

    } catch (hata) {
      r.istisna = false;
      r._istisnaMesaj = String(hata && hata.message ? hata.message : hata);
      r._istisnaYigin = String(hata && hata.stack ? hata.stack : '').split('\n').slice(0, 4).join(' | ');
    } finally {
      this._testZaman = eskiZaman;
      if (K) { K._sanal = eskiSanal; K._yerel = eskiYerel; K._testZaman = eskiKlanZaman; }
      if (S) S._testZaman = eskiSimZaman;
    }

    // ── GERÇEK KAYIT KİRLENMEDİ Mİ? ──
    if (_sdGercek) {
      const sonraki = JSON.stringify([_sdGercek.data.klan, _sdGercek.data.klanGunluk, _sdGercek.data.gold]);
      r.kayitKirlenmedi = (sonraki === _oncekiKayit);
    } else {
      r.kayitKirlenmedi = true;         // SaveData yok (node) → kirletecek şey yok
    }

    r.allPass = Object.keys(r).every(function (k) {
      return k === 'allPass' || k.charAt(0) === '_' || r[k] === true;
    });
    return r;
  }
};

if (typeof window !== 'undefined') window.KlanSavas = KlanSavas;
if (typeof module !== 'undefined' && module.exports) module.exports = KlanSavas;
