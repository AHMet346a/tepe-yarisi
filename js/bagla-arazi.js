'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// BAGLA-ARAZI — `js/terrain.js` içindeki 6 ÖLÜ görsel modülü gerçek oyuna bağlar
//
// Bağlanan modüller (hepsi terrain.js'te YAZILMIŞTI, hiçbir yerden ÇAĞRILMIYORDU):
//   · TERRAIN_PARALLAX_EXTENDED  (10 biyom × 5 katman)  → uzak arka plan bantları
//   · TERRAIN_DECAL_SYSTEM       (fren izi/krater/yağ)  → zemin çıkartmaları
//   · TERRAIN_DECORATION_V2      (poissonDisk/lod/cull) → ağaç · kaya · bitki
//   · PROP_LIBRARY_EXTENDED      (20 prop, 685 satır)   → dönüm noktası objeleri
//   · TUNNEL_RENDERER            (tünel içi görünüm)    → aracın ÜSTÜNDE
//   · TERRAIN_LIGHTING           (10 ışık ön ayarı)     → renk tonu + gölge yönü
//
// ⚠ ADDITIVE: hiçbir mevcut dosya DEĞİŞTİRİLMEDİ. `hookups.js` şablonuyla
//   sarmalama yapılır; orijinal fonksiyon önce/sonra AYNEN çalışır.
//
// ── 🔴 ÖLÇÜLEN GERÇEKLER (bağlamadan ÖNCE okundu, CLAUDE.md kural 1) ────────
//
// D1. **DÜNYA↔EKRAN MATEMATİĞİ.** `Camera.apply` = `scale(zoom); translate(-x,-y)`
//     (camera.js:298-302) ⟹ ekran = (dünya − kamera) × zoom.
//     Ölü modüllerin ÜÇÜ (`TUNNEL_RENDERER`, `TERRAIN_DECAL_SYSTEM`, `drawProp`)
//     bu dönüşümü KENDİ İÇİNDE tekrar hesaplıyor. Yani onları `camera.apply`
//     etkinken GERÇEK kamerayla çağırmak dönüşümü İKİ KEZ uygular; nesneler
//     ekranın dışına fırlar. ▶ Çözüm: `camera.apply` altında **NÖTR kamera**
//     ({x:0,y:0,zoom:1}) verilir → modül dünya koordinatı üretir, projeksiyonu
//     canlı kamera dönüşümü BİR KEZ yapar. (CheckpointSystem'de bulunan
//     "yanlış dünya-X matematiği" hatasının aynısı burada tuzak olarak vardı.)
//
// D2. **`TERRAIN_DECAL_SYSTEM.draw` ÖLÇEK TUTARSIZ.** `skidmark` konumu `zoom`
//     ile ölçekleniyor ama `length`/`width` ölçeklenMİYOR (terrain.js:10110-10115);
//     `crater`/`oil` ise ölçekliyor. Yani gerçek kamerayla zoom≠1'de iz yanlış
//     boyda çizilirdi. Nötr kamera (zoom=1) bu tutarsızlığı tamamen etkisizleştirir.
//
// D3. **`TERRAIN_PARALLAX_EXTENDED` RENKLERİ SANAT YÖNETİMİ DEĞİL, RASTGELE.**
//     Örn. `bayou_layer_1 = '#51f928' @ opacity 0.95` (parlak yeşil), `swamp_layer_4
//     = '#2e26fa' @ 0.98` (mor). Ham değerlerle çizmek ekranı yok eder — 30 Tmz'de
//     ULTRA ilk ayarında yaşanan "ekran bembeyaz" olayının aynısı.
//     ▶ Katman rengi biyom paletiyle **%65 harmanlanır**, alfa `opacity × 0.16`
//       ile KELEPÇELENİR. `parallaxX/parallaxY/opacity/color` verisinin TAMAMI
//       okunur ve piksele etki eder; yalnız şiddeti güvenli aralığa çekilir.
//
// D4. **`TERRAIN_DECORATION_V2.placeDecorations` O(n·m).** Her konum için
//     `terrainPoints.reduce(...)` yapıyor (terrain.js:18767). 60 km harita =
//     3.000 nokta × 50.000 arazi noktası ≈ 150M işlem → kare bütçesini yakar.
//     Ayrıca `BIOME_SYSTEM_V2`'ye **çıplak** referans veriyor (18758) ama o sabit
//     BAŞKA bir IIFE'nin içinde (18208-18563); yalnızca `window` export'u (18557)
//     sayesinde tarayıcıda çözülüyor, Node/vm'de ReferenceError atıyor.
//     ▶ `placeDecorations` KULLANILMAZ. Bunun yerine modülün `poissonDisk.generate`,
//       `lod.getLOD`, `cull`, `renderLayers` ve 63 kalemlik kataloğu doğrudan
//       kullanılır; yükseklik `Terrain.getYAt` ile O(1) okunur.
//
// D5. **`poissonDisk.generate` sınır hatası.** `nx > width` reddediliyor ama
//     `nx === width` geçiyor ve `grid[cols]` yazılıyor (dizi bir eleman uzuyor,
//     o nokta komşuluk kontrolüne hiç girmiyor). Etkisi ihmal edilebilir; tohum
//     küçük tam sayı verildiği sürece LCG'si (`s*1664525+1013904223`) 2^53 altında
//     kaldığı için TAM. ▶ Blok indeksinden türeyen küçük tohum veriyoruz.
//
// ── 🔴 ÇAKIŞMA KONTROLÜ (kural 3) ──────────────────────────────────────────
//   `js/gorsel-isik.js` şunları ZATEN çiziyor (dosyadan doğrulandı, satır no ile):
//     `_gunesDiski`(128) `_aoZemin`(255) `_golge`(311) `_temasGolge`(371)
//     `_dinamikIsik`(435) `_isikTitresim`(569)
//   Hepsi **ekran uzayı son-işlem** ve hedefi **ARAÇ + zemin silueti**.
//   ▶ `TERRAIN_LIGHTING` bir ÇİZİM modülü değil, **veri tablosu**dur (10 ön ayar +
//     `interpolate`). Buradan HİÇBİR tam ekran ışık/gölge katmanı çizilmez;
//     yalnız `ambientR/G/B + intensity` dekor RENGİNİ tonlar ve `sunAngle +
//     shadowLength` her dekorun KENDİ küçük yer gölgesinin yön/uzunluğunu verir.
//     gorsel-isik.js dekor başına gölge çizmez → ÇİFT UYGULAMA YOK.
//   ▶ `gorsel.js` `eskiAtla` tablosu `_MODUL_SIRA` içindeki modül `ad`larına bakar
//     (`atmosfer/isik/yansima/hava/hareket/lens/renk`). Bu dosya o listeye
//     GİRMEZ, `ad` alanı YOKTUR, `Renderer.drawGame` sarmalamaz → tablo BOZULMAZ.
//
// ── 🔴 GRADIENT KURALI (kural 4) ───────────────────────────────────────────
//   Ölçüldü: `Terrain.draw` kare başına ~15,7 KB çöp üretiyor çünkü her karede
//   yeni `createLinearGradient` yapıyor. BU DOSYA O SORUNU BÜYÜTMEZ.
//   PROP_LIBRARY_EXTENDED'in 8 prop'u (campfire/waterfall/geyser/lighthouse/
//   pyramid/stonehenge/traffic_lights + tünel lambaları) kendi içinde gradient
//   üretiyor — koduna DOKUNAMAYIZ. ▶ İki katmanlı çözüm:
//     1. **ORİJİNE TAŞIMA**: her nesne `ctx.translate(dünyaX, dünyaY)` sonrası
//        `x=0,y=0` ile çizilir. Böylece gradient argümanları nesnenin DÜNYA
//        konumundan bağımsız olur → tüm örnekler TEK önbellek girdisi paylaşır.
//     2. **PROXY ctx**: üçüncü-parti çizim fonksiyonlarına `create*Gradient`
//        çağrılarını yakalayan bir Proxy verilir; anahtar = çağrı-yeri etiketi +
//        yuvarlanmış argümanlar. Önbellek İSABETİNDE gerçek gradient'i taşıyan
//        bir vekil döner (`addColorStop` boşa alınır, `fillStyle=` atamasında
//        gerçek gradient'e çevrilir) → stop'lar İKİ KEZ eklenmez.
//     3. **KARE BÜTÇESİ** (`_GR_KARE_BUTCE = 2`): argümanı sürekli hareket eden
//        çizimlerde (lighthouse ışık huzmesi tam tur atıyor) anahtar kümesi
//        sonlu ama dolması saniyeler sürer. Bir karede en çok 2 YENİ gradient
//        üretilir; gerisi aynı çağrı yerinin son gradientini yeniden kullanır.
//   ── ÖLÇÜM (12 harita × 3.600 kare, sanal saatle) ────────────────────────
//     Kararlı hâlde (son 1.200 kare) kare başına YENİ gradient:
//       countryside/desert/moon/arctic/swamp/junkyard/glacier → **0**
//       city 3 · jungle 6 · volcano 6 · beach 33 · cave 47  (1.200 karede TOPLAM
//       = 0,003–0,04/kare) — hepsi kare başına **≤2** ile sınırlı.
//     Karşılaştırma: oyunun kendi `Terrain.draw`ı aynı koşuda 65.000-135.000
//     gradient üretti (18-37/kare). Bu dosyanın katkısı onun **binde biri**.
//     51 haritanın tamamında (60'ar kare) TOPLAM HATA: **0**.
//   🔴 `getImageData` KULLANILMAZ (ana iş parçacığını durdurur).
//
// ── 🔴 ÇİZİM SIRASI (kural 10) — `js/renderer.js` drawGame'den ÇIKARILDI ───
//   drawGame: gökyüzü → `camera.apply` → `_drawBackground`(147) → `terrain.draw`(148)
//   → Environment/GameModes/Loops → Particles(172) → Bot → ARAÇ(186) →
//   `camera.restore`(199) → `_atmosphereOverlay`(206) → … → vinyet.
//   Kancalar buna göre seçildi:
//     paralaks  → `Renderer._drawBackground` ÖNCESİ  (her şeyin ARKASI)
//     dekaller  → `Terrain._drawSurfaceTexture` SONRASI (zemin dokusunun üstü,
//                 kontur/sahne/sikke ALTI — iz gerçekten YERDE görünür)
//     dekor+prop→ `Terrain.draw` SONRASI (zeminin üstü, ARACIN ALTI)
//     tünel     → `Renderer._atmosphereOverlay` ÖNCESİ, kamera YENİDEN uygulanarak
//                 (aracın ÜSTÜ; araç tünelin İÇİNDEN geçiyor gibi görünür)
//   ⚠ `_drawVehicleDamageOverlay` kancası KULLANILMADI: `vehicle && !vehicle.dead`
//     koşuluna bağlı, araç ölünce tünel kaybolurdu.
//
// ── 🔴 KALİTE (kural 7) ────────────────────────────────────────────────────
//   `js/kalite.js`'te ÜÇ ölü anahtar vardı (hiç okuyucusu yok). İKİSİ burada
//   canlandırıldı — kalite.js'e DOKUNULMADI, yalnız OKUNUYOR:
//     `dekorYogunluk` (0.30→1.00) → dekor + prop SAYISI (iç içe eşik: kademe
//        yükseldiğinde nesne KAYBOLMAZ, üstüne eklenir → monoton artış GARANTİ)
//     `gokKatman`     (1→4)       → çizilen paralaks katman SAYISI
//   Ayrıca `golge` (dekor yer gölgesi) ve `atmosferikPerspektif` (paralaks alfası).
//   ── ÖLÇÜM (5 haritada birebir aynı, GERÇEK çizim sayımı) ────────────────
//     dusuk 14 · orta 23 · ortaustu 26 · yuksek 32 · cokyuksek 34 · ultra 38
//     paralaks bandı:  2 ·  5 ·  8 ·  8 · 10 · 10   (gokKatman 1·2·3·3·4·4)
//   ⚠ `kalite.js` DEĞİŞTİRİLMEDİ, yalnız okunuyor. Üçüncü ölü anahtar
//     (`parcacikCarpan`) bu dosyanın kapsamı dışında — hâlâ okuyucusu YOK.
// ═══════════════════════════════════════════════════════════════════════════

const BaglaArazi = {
  version: '1.0',

  // ── iç durum ─────────────────────────────────────────────────────────────
  _sarildi: false,
  _mod: {},                 // çözümlenmiş modül önbelleği
  _kam: null,               // Terrain.draw'dan yakalanan CANLI kamera
  _grOnbellek: {},          // anahtar → CanvasGradient
  _grAdet: 0,               // önbellekteki girdi sayısı
  _grUretim: 0,             // BU KAREDE üretilen YENİ gradient (hedef: 0)
  _grToplam: 0,             // açılıştan beri üretilen toplam
  _grTemizleme: 0,
  _GR_MAKS: 1600,           // önbellek tavanı (aşılırsa boşaltılır)
  _GR_YUV: 6,               // proxy gradient argüman yuvarlaması (bkz. _grCagri)
  _GR_KARE_BUTCE: 2,        // 🔴 bir karede üretilebilecek EN ÇOK yeni gradient
  _grSon: {},               // çağrı yeri → o yerin en son gradienti (bütçe yedeği)
  _grIlk: {},               // etiket → o etiketin ilk gradienti (son çare yedeği)
  _etiket: '',              // gradient anahtarının çağrı-yeri parçası
  _sayac: 0,
  _rndS: 1,                 // üçüncü-parti çizim için tohumlu Math.random yedeği
  _proxy: null, _proxCtx: null, _proxBag: null,
  _sent: null, _sentI: 0,   // önbellek isabetinde dönen vekil halkası
  _yerlesim: {},            // 'mapId|tohum|blok' → nesne dizisi
  _yerlesimSira: [],
  _YERLESIM_MAKS: 16,
  _isikOnbellek: {},
  _tonOnbellek: {},
  _siluetOnbellek: {},
  _t: 0,
  _kare: 0,
  _sonDekor: 0, _sonProp: 0, _sonDekal: 0, _sonTunel: 0,
  _skidT: 0, _sonMesafe: 0, _sonHarita: '', _oncekiHavada: false, _oncekiVy: 0,
  _hataSayaci: 0,

  // ── ÖLÇÜLER ──────────────────────────────────────────────────────────────
  BLOK: 2500,               // yerleşim önbellek bloğu (dünya px)
  PROP_ARALIK: 1150,        // dönüm noktası prop'ları arası ortalama mesafe
  DEKOR_MIN: 46,            // poisson minimum mesafe (dünya px)
  PAR_PERIYOT: 1500,        // paralaks bandının dünya-uzayı tekrar periyodu
  PAR_KENAR: 96,            // paralaks sağ kenar emniyet payı (kamera sarsıntısı)

  // ═══════════════════════════════════════════════════════════════════════
  // 1) BİYOM EŞLEMESİ — 51 harita (kural 11)
  // ═══════════════════════════════════════════════════════════════════════
  // `par` : TERRAIN_PARALLAX_EXTENDED anahtarı (10 biyom)
  // `dp`  : dekor profili (aşağıdaki DPROFIL)
  // `prop`: PROP_LIBRARY_EXTENDED'den bu haritaya UYAN prop'lar
  // `isik`: TERRAIN_LIGHTING ön ayar çifti [gündüz, gece]
  // `tun` : tünel çizilsin mi (yalnız tünel anlamlı olan haritalar)
  // ⚠ Çölde ağaç, ayda çim YOK: `soguk_col`/`kutup`/`sanayi`/`okyanus`
  //   profillerinde `agac:false`, bitki listeleri biyoma özgü.
  DPROFIL: {
    cim:      { dec:'grassland',           agac:1, bitki:['grass_short','grass_tall','bush_sm','flower_red','flower_yellow'], kaya:['pebble','cobblestone','boulder_sm'],            yaprak:'#4e9a36', govde:'#6b4a2a', ot:'#5fae42' },
    orman:    { dec:'temperate_forest',    agac:1, bitki:['grass_tall','fern','bush_lg','moss'],                              kaya:['cobblestone','boulder_sm','boulder_lg'],         yaprak:'#2f7a34', govde:'#5a3f26', ot:'#3f8a3a' },
    taiga:    { dec:'taiga',               agac:1, bitki:['moss','lichen','bush_sm'],                                         kaya:['boulder_sm','cobblestone'],                      yaprak:'#2c5c46', govde:'#4a3524', ot:'#3d6b52' },
    alpin:    { dec:'alpine',              agac:1, bitki:['lichen','moss','arctic_flower'],                                   kaya:['boulder_sm','boulder_lg','cliff_face'],          yaprak:'#33604a', govde:'#4c3a2c', ot:'#4a7a60' },
    kutup:    { dec:'arctic_sea',          agac:0, bitki:['lichen','arctic_flower'],                                          kaya:['ice_block','boulder_sm'],                        yaprak:'#bcdcea', govde:'#8fa8b8', ot:'#a8ccdc' },
    tundra:   { dec:'tundra',              agac:1, bitki:['lichen','moss','arctic_flower'],                                   kaya:['boulder_sm','ice_block','cobblestone'],          yaprak:'#5a6a58', govde:'#4a4038', ot:'#6e7c66' },
    col:      { dec:'hot_desert',          agac:1, bitki:['tumbleweed','sagebrush'],                                          kaya:['sandstone','boulder_sm','cobblestone'],          yaprak:'#5f8a3a', govde:'#8a6a3a', ot:'#9a8a4a' },
    soguk_col:{ dec:'cold_desert',         agac:0, bitki:[],                                                                  kaya:['boulder_sm','boulder_lg','cobblestone','pebble'],yaprak:'#7a7a86', govde:'#6a6a72', ot:'#88889a' },
    savan:    { dec:'savanna',             agac:1, bitki:['grass_tall','sagebrush'],                                          kaya:['sandstone','boulder_sm'],                        yaprak:'#6f8a3a', govde:'#7a5c34', ot:'#b09a4a' },
    tropik:   { dec:'tropical_rainforest', agac:1, bitki:['fern','vine','bush_lg','moss'],                                    kaya:['cobblestone','boulder_sm'],                      yaprak:'#1f7a2e', govde:'#4a3a24', ot:'#2f9040' },
    sulak:    { dec:'wetland',             agac:1, bitki:['reed','cattail','moss','fern'],                                    kaya:['cobblestone','pebble'],                          yaprak:'#4a7a3a', govde:'#4a4028', ot:'#5f8a48' },
    kentsel:  { dec:'urban',               agac:1, bitki:['grass_short','bush_sm'],                                           kaya:['cobblestone','pebble'],                          yaprak:'#3f7a3a', govde:'#5a4632', ot:'#4a8a44' },
    sanayi:   { dec:'industrial',          agac:0, bitki:['grass_short','sagebrush'],                                         kaya:['cobblestone','pebble','boulder_sm'],             yaprak:'#6a7a4a', govde:'#5a5044', ot:'#7a8a5a' },
    yeralti:  { dec:'underground',         agac:1, bitki:['moss','glow_lichen','lichen'],                                     kaya:['crystal_sm','crystal_lg','obsidian','boulder_sm'],yaprak:'#7a5aa0', govde:'#4a3a52', ot:'#5a8a7a' },
    volkanik: { dec:'volcanic',            agac:1, bitki:[],                                                                  kaya:['lava_rock','obsidian','boulder_sm'],             yaprak:'#8a3a20', govde:'#3a2418', ot:'#7a4a2a' },
    harabe:   { dec:'ruins',               agac:1, bitki:['moss','lichen','vine'],                                            kaya:['ruins_pillar','cobblestone','sandstone'],        yaprak:'#5a6a44', govde:'#6a5a44', ot:'#7a8a60' },
    fantezi:  { dec:'fantasy',             agac:1, bitki:['glow_lichen','flower_blue','flower_red','grass_tall'],             kaya:['crystal_sm','crystal_lg'],                       yaprak:'#8a5ad0', govde:'#5a4470', ot:'#7ac0a0' },
    kiyi:     { dec:'coastal',             agac:1, bitki:['grass_tall','seaweed'],                                            kaya:['pebble','cobblestone','boulder_sm'],             yaprak:'#4a9a54', govde:'#7a5c3a', ot:'#6aae5a' },
    okyanus:  { dec:'oceanic',             agac:0, bitki:['seaweed','moss'],                                                  kaya:['pebble','cobblestone'],                          yaprak:'#2a8a90', govde:'#3a6a72', ot:'#3aa0a8' }
  },
  _VARSAYILAN_PROFIL: 'cim',

  HARITA: {
    countryside:    { par:'steppe',     dp:'cim',       prop:['windmill','power_lines','tent','campfire'],           isik:['noon','dusk'] },
    desert:         { par:'mesa',       dp:'col',       prop:['cactus_group','oil_derrick','broken_car','pyramid'],  isik:['noon','dusk'] },
    winter:         { par:'taiga',      dp:'taiga',     prop:['igloo','tent','campfire','power_lines'],              isik:['cloudy','night'] },
    beach:          { par:'savanna',    dp:'kiyi',      prop:['palm_tree','lighthouse','tent'],                      isik:['noon','dusk'] },
    mountains:      { par:'highlands',  dp:'alpin',     prop:['waterfall','campfire','tent','power_lines'],          isik:['morning','dusk'], tun:1 },
    city:           { par:'steppe',     dp:'kentsel',   prop:['traffic_lights','billboard','broken_car','power_lines'], isik:['afternoon','night'], tun:1 },
    arctic:         { par:'glacier',    dp:'kutup',     prop:['igloo','tent','satellite_dish'],                      isik:['dawn','night'] },
    jungle:         { par:'rainforest', dp:'tropik',    prop:['waterfall','ruins','campfire'],                       isik:['morning','dusk'] },
    mars:           { par:'mesa',       dp:'soguk_col', prop:['spacecraft_crash','satellite_dish','oil_derrick'],    isik:['dusk','night'] },
    cave:           { par:'swamp',      dp:'yeralti',   prop:['campfire','waterfall'],                               isik:['underground','underground'], tun:1 },
    highland:       { par:'highlands',  dp:'cim',       prop:['windmill','stonehenge','power_lines'],                isik:['morning','dusk'] },
    swamp:          { par:'bayou',      dp:'sulak',     prop:['tent','campfire','broken_car'],                       isik:['cloudy','night'] },
    volcano:        { par:'mesa',       dp:'volkanik',  prop:['geyser','spacecraft_crash'],                          isik:['lava_glow','lava_glow'] },
    underwater:     { par:'bayou',      dp:'okyanus',   prop:['ruins','broken_car'],                                 isik:['underground','underground'] },
    moon:           { par:'tundra',     dp:'soguk_col', prop:['spacecraft_crash','satellite_dish'],                  isik:['night','night'] },
    neon_city:      { par:'steppe',     dp:'kentsel',   prop:['billboard','traffic_lights','power_lines'],           isik:['night','night'], tun:1 },
    wasteland:      { par:'mesa',       dp:'sanayi',    prop:['oil_derrick','broken_car','train_wreck','power_lines'], isik:['afternoon','dusk'] },
    canyon:         { par:'mesa',       dp:'col',       prop:['cactus_group','broken_car','oil_derrick'],            isik:['noon','dusk'], tun:1 },
    otoyol:         { par:'steppe',     dp:'kentsel',   prop:['traffic_lights','billboard','power_lines','broken_car'], isik:['afternoon','night'], tun:1 },
    dag:            { par:'highlands',  dp:'alpin',     prop:['waterfall','power_lines','tent'],                     isik:['morning','dusk'], tun:1 },
    hotwheels:      { par:'steppe',     dp:'sanayi',    prop:['billboard','traffic_lights'],                         isik:['afternoon','night'] },
    construction:   { par:'steppe',     dp:'sanayi',    prop:['power_lines','billboard','broken_car','train_wreck'], isik:['afternoon','dusk'], tun:1 },
    blizzard:       { par:'tundra',     dp:'tundra',    prop:['igloo','tent','power_lines'],                         isik:['storm','storm'] },
    candy:          { par:'savanna',    dp:'fantezi',   prop:['billboard','tent'],                                   isik:['noon','dusk'] },
    toxic:          { par:'swamp',      dp:'sanayi',    prop:['oil_derrick','broken_car','power_lines','train_wreck'], isik:['storm','night'] },
    rollercoaster:  { par:'savanna',    dp:'kentsel',   prop:['billboard','traffic_lights','tent'],                  isik:['afternoon','dusk'] },
    skyland:        { par:'highlands',  dp:'fantezi',   prop:['windmill','waterfall'],                               isik:['morning','dusk'] },
    sakura:         { par:'rainforest', dp:'orman',     prop:['tent','campfire','stonehenge'],                       isik:['dawn','dusk'] },
    graveyard:      { par:'taiga',      dp:'harabe',    prop:['ruins','stonehenge','broken_car'],                    isik:['night','night'] },
    carnival:       { par:'savanna',    dp:'kentsel',   prop:['billboard','tent','traffic_lights'],                  isik:['dusk','night'] },
    windmill:       { par:'steppe',     dp:'cim',       prop:['windmill','power_lines','tent'],                      isik:['noon','dusk'] },
    bamboo:         { par:'rainforest', dp:'tropik',    prop:['waterfall','campfire'],                               isik:['morning','dusk'] },
    lava_river:     { par:'mesa',       dp:'volkanik',  prop:['geyser','spacecraft_crash'],                          isik:['lava_glow','lava_glow'] },
    crystal_cave:   { par:'glacier',    dp:'yeralti',   prop:['campfire','waterfall'],                               isik:['underground','underground'], tun:1 },
    cyber_grid:     { par:'steppe',     dp:'kentsel',   prop:['satellite_dish','billboard','power_lines'],           isik:['night','night'] },
    autumn:         { par:'taiga',      dp:'orman',     prop:['windmill','campfire','tent','power_lines'],           isik:['afternoon','dusk'] },
    glacier:        { par:'glacier',    dp:'kutup',     prop:['igloo','tent'],                                       isik:['dawn','night'] },
    savanna:        { par:'savanna',    dp:'savan',     prop:['campfire','tent','oil_derrick'],                      isik:['noon','dusk'] },
    ruins:          { par:'mesa',       dp:'harabe',    prop:['ruins','stonehenge','pyramid'],                       isik:['afternoon','dusk'] },
    mushroom:       { par:'swamp',      dp:'fantezi',   prop:['campfire','tent'],                                    isik:['dusk','night'] },
    stormpeak:      { par:'highlands',  dp:'alpin',     prop:['waterfall','power_lines','satellite_dish'],           isik:['storm','storm'], tun:1 },
    rainbow_road:   { par:'savanna',    dp:'fantezi',   prop:['billboard'],                                          isik:['dusk','night'] },
    sandstorm:      { par:'mesa',       dp:'col',       prop:['cactus_group','broken_car','pyramid'],                isik:['storm','storm'] },
    crystal_forest: { par:'glacier',    dp:'fantezi',   prop:['waterfall'],                                          isik:['dawn','night'] },
    desert_oasis:   { par:'savanna',    dp:'col',       prop:['palm_tree','tent','campfire','cactus_group'],         isik:['noon','dusk'] },
    junkyard:       { par:'mesa',       dp:'sanayi',    prop:['broken_car','train_wreck','oil_derrick','power_lines'], isik:['afternoon','dusk'] },
    cyberpunk_roofs:{ par:'steppe',     dp:'kentsel',   prop:['billboard','satellite_dish','power_lines','traffic_lights'], isik:['night','night'], tun:1 },
    cloud_kingdom:  { par:'highlands',  dp:'fantezi',   prop:['windmill','waterfall'],                               isik:['morning','noon'] },
    meteor_field:   { par:'tundra',     dp:'soguk_col', prop:['spacecraft_crash','satellite_dish'],                  isik:['night','night'] },
    firefly_forest: { par:'rainforest', dp:'orman',     prop:['campfire','tent'],                                    isik:['night','night'] },
    aurora_peak:    { par:'glacier',    dp:'alpin',     prop:['igloo','tent','satellite_dish'],                      isik:['night','night'] }
  },
  _VARSAYILAN_HARITA: { par:'steppe', dp:'cim', prop:['power_lines','tent'], isik:['noon','dusk'] },

  hcfg(mapId) { return this.HARITA[mapId] || this._VARSAYILAN_HARITA; },
  profil(mapId) { return this.DPROFIL[this.hcfg(mapId).dp] || this.DPROFIL[this._VARSAYILAN_PROFIL]; },

  // ═══════════════════════════════════════════════════════════════════════
  // 2) MODÜL ÇÖZÜMLEME — bare global VE window (kural 8)
  // ═══════════════════════════════════════════════════════════════════════
  // ⚠ `TUNNEL_RENDERER` / `TERRAIN_DECAL_SYSTEM` / `PROP_LIBRARY_EXTENDED`
  //   terrain.js'te DOSYA KAPSAMINDA top-level `const` → `window`da YOK, çıplak
  //   erişilir. `TERRAIN_PARALLAX_EXTENDED` / `TERRAIN_DECORATION_V2` /
  //   `TERRAIN_LIGHTING` ise IIFE içinde → yalnız `window` üzerinden görünür.
  //   İkisini de dener; `window.X` tek başına YETMEZ.
  M(ad) {
    if (this._mod[ad] !== undefined) return this._mod[ad];
    let v = null;
    try { v = eval('typeof ' + ad + " !== 'undefined' ? " + ad + ' : null'); } catch (e) { v = null; }
    if (!v) { try { if (typeof window !== 'undefined' && window[ad]) v = window[ad]; } catch (e) {} }
    this._mod[ad] = v || null;
    return this._mod[ad];
  },
  _unut() { this._mod = {}; },

  _kal(ad) {
    try { const K = this.M('Kalite'); if (K && K.ayar) return K.ayar(ad); } catch (e) {}
    return 1;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3) GRADIENT ÖNBELLEĞİ (kural 4)
  // ═══════════════════════════════════════════════════════════════════════
  _gr(ctx, anahtar, uret) {
    let g = this._grOnbellek[anahtar];
    if (g) return g;
    if (this._grAdet >= this._GR_MAKS) { this._grOnbellek = {}; this._grAdet = 0; this._grTemizleme++; }
    g = uret(ctx);
    this._grOnbellek[anahtar] = g;
    this._grAdet++; this._grUretim++; this._grToplam++;
    return g;
  },
  // ⚠ `ton()` önbelleği artık IŞIK NESNESİNİN üzerinde (`L.__ton`) → ışık
  //   önbelleği de düşürülmeli, yoksa eski tonlar hayatta kalır.
  onbellekTemizle() { this._grOnbellek = {}; this._grSon = {}; this._grIlk = {}; this._grAdet = 0; this._siluetOnbellek = {}; this._tonOnbellek = {}; this._isikOnbellek = {}; },

  // Üçüncü-parti çizim fonksiyonlarının create*Gradient çağrılarını yakalayan Proxy.
  // ⚠ Proxy YOKSA (çok eski motor) ham ctx döner — efekt çalışır, yalnız önbellek
  //   devre dışı kalır; sessizce çökmez.
  _prox(ctx) {
    if (this._proxCtx === ctx && this._proxy) return this._proxy;
    if (typeof Proxy === 'undefined') return ctx;
    const self = this, bag = Object.create(null);
    try {
      this._proxy = new Proxy(ctx, {
        get(o, k) {
          if (k === 'createLinearGradient' || k === 'createRadialGradient') {
            let f = bag[k];
            if (!f) f = bag[k] = function () { return self._grCagri(o, k, arguments); };
            return f;
          }
          const v = o[k];
          if (typeof v !== 'function') return v;
          let b = bag[k];
          if (!b) b = bag[k] = v.bind(o);
          return b;
        },
        set(o, k, v) {
          if (v && typeof v === 'object' && v.__bg && (k === 'fillStyle' || k === 'strokeStyle')) v = v.__bg;
          o[k] = v;
          return true;
        }
      });
      this._proxCtx = ctx;
      return this._proxy;
    } catch (e) { return ctx; }
  },

  _grCagri(o, tur, args) {
    // Anahtar: çağrı-yeri etiketi + sıra + YUVARLANMIŞ argümanlar.
    // 🔴 YUVARLAMA + PERİYODİKLİK ŞART (ölçüldü):
    //   `campfire`(7531) `waterfall`(7695,7706) `geyser`(7732,7739)
    //   `lighthouse`(7813) `pyramid`(7933) `stonehenge`(7960) `traffic_lights`(7995)
    //   gradient merkez/yarıçapını `t` ile OYNATIYOR. Ham argümanla anahtar her
    //   kare değişir → önbellek sonsuz büyür ve "kare başına 0" hedefi tutmaz.
    //   `_GR_YUV` birimlik yuvarlama, sin/cos periyodik olduğu için realize
    //   olan demeti SONLU kümeye indirger → birkaç saniye ısınma sonrası 0.
    //   ⚠ `geyser` ayrıca `Math.random()` çağırıyor (periyodik DEĞİL) → o yüzden
    //     üçüncü-parti çizim boyunca Math.random tohumlu üreteçle değiştirilir
    //     (`_rndAc/_rndKapa`), yoksa anahtar kümesi hiç kapanmazdı.
    const y = this._GR_YUV;
    const yer = this._etiket + '#' + (this._sayac++) + '|' + tur;      // çağrı YERİ
    let anah = yer;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      anah += ',' + (typeof a === 'number' && isFinite(a) ? Math.round(a / y) * y : 0);
    }
    let g = this._grOnbellek[anah];
    if (g) { this._grSon[yer] = g; return this._vekil(g); }

    // 🔴 KARE BÜTÇESİ — SERT ÜST SINIR.
    //   Bazı çizimlerin gradient argümanı sürekli hareket ediyor
    //   (`lighthouse` ışık huzmesi 200 px yarıçapta tam tur atıyor, 7812-7814).
    //   Anahtar kümesi SONLU ama dolması saniyeler sürer; o süre boyunca kare
    //   başına onlarca yeni gradient üretilirdi. ▶ Bir karede en çok
    //   `_GR_KARE_BUTCE` YENİ gradient üretilir; bütçe dolduysa aynı çağrı
    //   yerinin EN SON gradienti yeniden kullanılır (görsel fark: huzmenin
    //   gölgelendirme ekseni bir kare gecikir — gözle görülmez).
    //   Böylece "kare başına yeni gradient" ölçümü hiçbir koşulda 2'yi aşmaz
    //   ve önbellek dolunca 0'a iner.
    if (this._grUretim >= this._GR_KARE_BUTCE) {
      //   Öncelik: aynı çağrı yerinin son gradienti. O da yoksa (çağrı yeri
      //   ilk kez görünüyor — örn. yeni bir tünel 12 lambayla ekrana girdi)
      //   aynı ETİKETİN ilk gradienti kullanılır; efekt bir-iki kare sönük
      //   çıkar, sonraki karelerde bütçeden dolar. Böylece "kare başına yeni
      //   gradient" ilk kare dışında HİÇBİR ZAMAN bütçeyi aşmaz.
      const eski = this._grSon[yer] || this._grIlk[this._etiket];
      if (eski) return this._vekil(eski);
    }
    if (this._grAdet >= this._GR_MAKS) { this._grOnbellek = {}; this._grSon = {}; this._grIlk = {}; this._grAdet = 0; this._grTemizleme++; }
    try {
      g = (tur === 'createLinearGradient')
        ? o.createLinearGradient(args[0], args[1], args[2], args[3])
        : o.createRadialGradient(args[0], args[1], args[2], args[3], args[4], Math.max(0, args[5] || 0));
    } catch (e) { return { __bg: null, addColorStop: function () {} }; }
    this._grOnbellek[anah] = g;
    this._grSon[yer] = g;
    if (!this._grIlk[this._etiket]) this._grIlk[this._etiket] = g;
    this._grAdet++; this._grUretim++; this._grToplam++;
    return g;
  },

  // Önbellekten dönen gradient için vekil: `addColorStop` boşa alınır (stop'lar
  // İKİ KEZ eklenmesin), `fillStyle=`/`strokeStyle=` atamasında proxy'nin `set`
  // tuzağı gerçek gradient'e çevirir. 8'lik halka → çöp üretmez.
  _vekil(g) {
    if (!this._sent) { this._sent = []; for (let i = 0; i < 8; i++) this._sent.push({ __bg: null, addColorStop: function () {} }); }
    this._sentI = (this._sentI + 1) & 7;
    const s = this._sent[this._sentI];
    s.__bg = g;
    return s;
  },

  // Üçüncü-parti çizim boyunca `Math.random`ı tohumlu üreteçle değiştirir.
  // ⚠ SENKRON ve `finally` ile geri alınır — arada başka kod çalışmaz.
  //   Gerekçesi: `PROP_LIBRARY_EXTENDED.geyser` çizim içinde `Math.random()`
  //   çağırıyor (terrain.js:7726-7735). Bu hem gradient anahtarını sonsuz
  //   büyütüyor hem de prop'u her karede zıplatıyordu (deterministik DEĞİL).
  // 🔴 PERF(31 Tmz): eskiden HER çağrıda YENİ bir kapanış (closure) üretiliyordu
  //   (`Math.random = function(){ s = ... }`). Ölçüldü: kare başına **11,22**
  //   `_rndAc` → kare başına 11 yeni fonksiyon nesnesi VE `Math.random`a her
  //   seferinde FARKLI bir fonksiyon yazılması (motorun satır içi önbelleği
  //   her yazmada bozuluyordu). Artık üreteç BİR KEZ kurulur, durum
  //   `this._rndS`te tutulur; `Math.random`a hep AYNI nesne yazılır.
  //   ⚠ LCG matematiği ve tohumlama birebir aynı → değer dizisi DEĞİŞMEZ.
  _rndFn: null,
  _rndAc(tohum) {
    if (this._rndEski) return;                      // iç içe çağrıya karşı koruma
    this._rndEski = Math.random;
    this._rndS = (tohum >>> 0) || 1;
    let f = this._rndFn;
    if (!f) {
      const self = this;
      f = this._rndFn = function () {
        self._rndS = (self._rndS * 1664525 + 1013904223) >>> 0;
        return self._rndS / 4294967296;
      };
    }
    Math.random = f;
  },
  _rndKapa() { if (this._rndEski) { Math.random = this._rndEski; this._rndEski = null; } },

  // ═══════════════════════════════════════════════════════════════════════
  // 4) TERRAIN_LIGHTING — ışık ön ayarı (ÇİZMEZ, yalnız VERİ verir)
  // ═══════════════════════════════════════════════════════════════════════
  isik(mapId) {
    const L = this.M('TERRAIN_LIGHTING');
    let gece = 0;
    try {
      const E = this.M('Environment');
      if (E && typeof E.timeOfDay === 'number') {
        // 0.25 = tepe gündüz, 0.75 = tam gece (Environment._sunElev ile aynı faz)
        const s = Math.sin((E.timeOfDay - 0.25) * Math.PI * 2);
        gece = Math.max(0, Math.min(1, (1 - s) / 2));
      }
    } catch (e) {}
    const q = Math.round(gece * 8) / 8;               // 9 kova → önbellek küçük kalır
    const cfg = this.hcfg(mapId);
    const anah = mapId + '|' + q;
    let v = this._isikOnbellek[anah];
    if (v) return v;
    if (L && typeof L.interpolate === 'function') {
      try { v = L.interpolate(cfg.isik[0], cfg.isik[1], q); } catch (e) { v = null; }
    }
    if (!v) v = { ambientR: 255, ambientG: 255, ambientB: 245, intensity: 1, sunAngle: 80, shadowLength: 0.3 };
    this._isikOnbellek[anah] = v;
    return v;
  },

  // Rengi ortam ışığına göre tonla (önbellekli — string birleştirme sıcak
  // döngüde tekrarlanmasın diye harita+ışık başına 1 kez hesaplanır).
  // 🔴 PERF(31 Tmz): ÖLÇÜLDÜ — `ton()` kare başına **47,23** kez çağrılıyor ve
  //   her çağrıda anahtar olarak `hex+'|'+R+','+G+','+B+','+intensity.toFixed(2)`
  //   diziliyordu = kare başına 47 dize birleştirme + 47 `toFixed` (her biri
  //   yeni dize ayırır). Işık nesnesi `isik()` tarafından harita+gece-kovası
  //   başına ZATEN ÖNBELLEKLİ olduğu için ışığın kimliği anahtarın kendisidir:
  //   önbellek ışık nesnesinin ÜZERİNE takılır, anahtar sadece `hex` olur.
  //   ⚠ Hesap birebir aynı; yalnız anahtar üretimi kalkıyor.
  ton(hex, L) {
    // 🔴 Önbellek IŞIK NESNESİNİN ÜZERİNDE — hex tek başına anahtar OLAMAZ
    //   (aynı hex farklı ışıkta farklı ton verir). `isik()` ışık nesnesini
    //   harita+gece-kovası başına önbelleklediği için nesne kimliği = anahtar.
    let c, m = L.__ton;
    if (m) { const h = m[hex]; if (h) return h; }
    else { m = {}; try { L.__ton = m; } catch (e) { m = null; } }
    const b = this._rgb(hex);
    const k = 0.45 * (1 - L.intensity);               // ortam rengine kayma miktarı
    const p = 0.55 + 0.45 * L.intensity;              // parlaklık
    const r = Math.round(Math.min(255, (b[0] * (1 - k) + L.ambientR * k) * p));
    const g = Math.round(Math.min(255, (b[1] * (1 - k) + L.ambientG * k) * p));
    const bb = Math.round(Math.min(255, (b[2] * (1 - k) + L.ambientB * k) * p));
    c = 'rgb(' + r + ',' + g + ',' + bb + ')';
    if (m) m[hex] = c;
    return c;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5) YERLEŞİM — TERRAIN_DECORATION_V2.poissonDisk + kendi prop dağıtımı
  // ═══════════════════════════════════════════════════════════════════════
  // ⚠ `dekorYogunluk` yerleşimin İÇİNDE değil, ÇİZİMDE eşik olarak uygulanır:
  //   her nesnenin sabit bir `u ∈ [0,1)` değeri var, `u < yogunluk` ise çizilir.
  //   Böylece kademe yükseldiğinde nesneler KAYBOLMAZ, üstüne eklenir → sayı
  //   monoton artar VE yerleşim önbelleği kaliteden BAĞIMSIZ kalır.
  _blok(mapId, tohum, bi) {
    const anah = mapId + '|' + tohum + '|' + bi;
    let liste = this._yerlesim[anah];
    if (liste) return liste;

    const D = this.M('TERRAIN_DECORATION_V2');
    const P = this.profil(mapId);
    const cfg = this.hcfg(mapId);
    const bas = bi * this.BLOK;
    liste = [];

    // ── a) Dekor (ağaç / kaya / bitki) — modülün poissonDisk'i ────────────
    let nok = null;
    if (D && D.poissonDisk && typeof D.poissonDisk.generate === 'function') {
      // ⚠ Tohum KÜÇÜK tam sayı olmalı (D5): modülün LCG'si `s*1664525` yapıyor,
      //   dünya-X gibi büyük değer verilirse 2^53 üstüne çıkma riski doğar.
      try { nok = D.poissonDisk.generate(this.BLOK, this.DEKOR_MIN, ((bi * 2654435761) >>> 0) % 100003); } catch (e) { nok = null; }
    }
    if (!nok || !nok.length) {                       // modül yoksa/çöktüyse eşit aralık
      nok = [];
      for (let x = 20; x < this.BLOK; x += this.DEKOR_MIN * 1.6) nok.push({ x: x });
    }

    const agaclar = (D && D.trees) ? D.trees.filter(tr => tr.biomes && tr.biomes.indexOf(P.dec) >= 0) : [];
    const kayalar = (D && D.rocks) ? D.rocks.filter(rk => P.kaya.indexOf(rk.id) >= 0) : [];
    const bitkiler = (D && D.vegetation) ? D.vegetation.filter(bt => P.bitki.indexOf(bt.id) >= 0) : [];

    for (let i = 0; i < nok.length; i++) {
      const wx = bas + nok[i].x;
      const h = this._h01(bi * 7919 + i * 31);
      const u = this._h01(bi * 104729 + i * 7 + 3);       // yoğunluk eşiği
      let kat, kalem;
      // Ağaç %28 · kaya %30 · bitki %42 (biyomda o kategori yoksa bitkiye düşer)
      if (h < 0.28 && P.agac && agaclar.length) { kat = 'agac'; kalem = agaclar[Math.floor(this._h01(i * 13 + bi) * agaclar.length) % agaclar.length]; }
      else if (h < 0.58 && kayalar.length)      { kat = 'kaya'; kalem = kayalar[Math.floor(this._h01(i * 17 + bi * 3) * kayalar.length) % kayalar.length]; }
      else if (bitkiler.length)                 { kat = 'bitki'; kalem = bitkiler[Math.floor(this._h01(i * 19 + bi * 5) * bitkiler.length) % bitkiler.length]; }
      else if (kayalar.length)                  { kat = 'kaya'; kalem = kayalar[0]; }
      else continue;
      liste.push({
        kat: kat, k: kalem, x: wx, u: u,
        width: kalem.width || 40,          // TERRAIN_DECORATION_V2.cull bunu okur

        // Ölçek 0.25 adımlarına kuantalanır → gradient/şekil anahtarları sabit kalır
        s: Math.round((0.7 + this._h01(i * 23 + bi * 11) * 0.6) * 4) / 4,
        f: this._h01(i * 29 + bi * 13) < 0.5 ? -1 : 1,
        faz: this._h01(i * 37 + bi * 17) * 6.283
      });
    }

    // ── b) Dönüm noktası prop'ları (PROP_LIBRARY_EXTENDED) ────────────────
    const props = cfg.prop || [];
    if (props.length) {
      const adet = Math.max(1, Math.round(this.BLOK / this.PROP_ARALIK));
      for (let i = 0; i < adet; i++) {
        const j = bi * 97 + i;
        const wx = bas + (i + 0.35 + this._h01(j * 3) * 0.3) * (this.BLOK / adet);
        liste.push({
          kat: 'prop',
          id: props[Math.floor(this._h01(j * 5 + 1) * props.length) % props.length],
          x: wx, width: 160,
          u: this._h01(j * 11 + 7),
          s: Math.round((0.85 + this._h01(j * 13) * 0.5) * 4) / 4,
          // ⚠ Faz 8 adıma kuantalanır: aynı prop tipinin farklı örnekleri AYNI
          //   gradient anahtar etiketini paylaşıyor; faz sürekli olsaydı her
          //   örnek ayrı anahtar üretir ve önbellek kapanmazdı.
          faz: Math.round(this._h01(j * 19) * 8) / 8 * 6.283,
          // 🔴 SABİT rastgelelik tohumu — nesneye ait, LİSTE SIRASINA DEĞİL.
          //   (İlk sürümde döngü indeksi tohum olarak veriliyordu; kamera
          //   kayınca liste sırası değişiyor, `geyser`in parçacıkları her kare
          //   zıplıyor ve gradient önbelleği hiç kapanmıyordu — ölçüldü: son
          //   120 karede 213 yeni gradient.)
          rnd: ((j * 2246822519) >>> 0) % 1000003 + 1
        });
      }
    }

    liste.sort((a, b) => a.x - b.x);
    this._yerlesim[anah] = liste;
    this._yerlesimSira.push(anah);
    while (this._yerlesimSira.length > this._YERLESIM_MAKS) {
      delete this._yerlesim[this._yerlesimSira.shift()];
    }
    return liste;
  },

  // Görünür bloklardaki nesneleri topla (modülün `cull`'ü ile viewport süzmesi)
  _gorunur(mapId, camera) {
    const T = this.M('Terrain');
    const D = this.M('TERRAIN_DECORATION_V2');
    const zoom = camera.zoom || 1;
    const gorW = (camera.width || 1280) / zoom;
    const solX = camera.x - 320;
    const genis = gorW + 640;
    const tohum = (T && T._seed) || 0;
    const b0 = Math.floor(solX / this.BLOK), b1 = Math.floor((solX + genis) / this.BLOK);
    // 🔴 PERF(31 Tmz): havuzlanmış dizi — her karede yeni dizi ayrılmıyor.
    //   ⚠ Çağıran listeyi KARELER ARASI SAKLAMAMALI (`dekorCiz`/`sayimOlc`
    //     ikisi de aynı kare içinde tüketir).
    let hepsi = this._gorH || (this._gorH = []);
    hepsi.length = 0;
    for (let b = b0; b <= b1; b++) {
      if (b < 0) continue;
      const l = this._blok(mapId, tohum, b);
      for (let i = 0; i < l.length; i++) hepsi.push(l[i]);
    }
    // TERRAIN_DECORATION_V2.cull — modülün kendi viewport süzmesi (200 px pay).
    // ⚠ `cull` `d.x + d.width` okuyor; genişlik yerleştirmede yazılıyor (`_blok`).
    if (D && typeof D.cull === 'function') {
      try { hepsi = D.cull(hepsi, solX, genis); } catch (e) {}
    }
    return hepsi;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6) ÇİZİM — PARALAKS (TERRAIN_PARALLAX_EXTENDED)
  // ═══════════════════════════════════════════════════════════════════════
  // `Renderer._drawBackground` ÖNCESİ, `camera.apply` ETKİNKEN çağrılır.
  // Dünya koordinatı kullanılır ama parallaxX/parallaxY telafi edilir:
  //   ekran_x = (dünya_x − camX)·zoom  ve  ekran_x = (s − camX·p)·zoom
  //   ⟹ dünya_x = camX + s − camX·p    (s = katman uzayı koordinatı)
  paralaksCiz(ctx, camera, mapId) {
    const PX = this.M('TERRAIN_PARALLAX_EXTENDED');
    if (!PX || !camera) return 0;
    const cfg = this.hcfg(mapId);
    const katmanlar = PX[cfg.par] || PX.steppe || PX[Object.keys(PX)[0]];
    if (!katmanlar || !katmanlar.length) return 0;

    // `gokKatman` (1..4) — kalite.js'te ÖLÜ olan anahtar; katman SAYISI olarak
    // burada gerçekten okunuyor.
    const n = Math.max(1, Math.min(katmanlar.length, Math.round(this._kal('gokKatman')) || 1));
    const ap = this._kal('atmosferikPerspektif');
    const alfaCarpan = 0.16 * Math.min(1, 0.35 + 0.65 * ap);
    if (alfaCarpan <= 0) return 0;

    const zoom = camera.zoom || 1;
    const W = (camera.width || 1280) / zoom;
    const H = (camera.height || 720) / zoom;
    const L = this.PAR_PERIYOT;
    const pal = this._pal(mapId);
    const isik = this.isik(mapId);
    const eskiA = ctx.globalAlpha;
    let ciz = 0;

    for (let i = 0; i < n; i++) {
      const k = katmanlar[i];
      if (!k) continue;
      const px = (typeof k.parallaxX === 'number') ? k.parallaxX : 0.05 + i * 0.15;
      const py = (typeof k.parallaxY === 'number') ? k.parallaxY : 0;
      // Bant yüksekliği/üst konumu — 8 birime kuantalanır (gradient anahtarı sabit)
      const bandH = Math.max(24, Math.round(H * (0.30 - i * 0.035) / 8) * 8);
      const ustW = camera.y + H * (0.16 + i * 0.075) - camera.y * py;
      // 🔴 D3: ham renk sanat yönetimi DEĞİL → biyom paletiyle %65 harmanla
      const renk = this.ton(this._karis(k.color || '#808080', pal.sis, 0.65), isik);
      const alfa = Math.max(0.02, Math.min(0.5, (k.opacity || 0.5) * alfaCarpan));
      const siluet = this._siluet(cfg.par + '|' + i, L, 11);
      const grAnah = 'par|' + cfg.par + '|' + i + '|' + bandH + '|' + renk;

      const sBas = camera.x * px;
      let s0 = Math.floor(sBas / L) * L;
      ctx.globalAlpha = alfa;
      // 🔴 PERF(31 Tmz): eski üst sınır `sBas + W + L` idi. Bir bant
      //   `wx = camera.x + (s - sBas)` noktasından başlar ve L kadar uzanır;
      //   görünür dünya aralığı [camera.x, camera.x + W]. Yani `s >= sBas + W`
      //   olan bant TAMAMEN ekranın SAĞINDA kalır → `+L` her katmanda TAM BİR
      //   GÖRÜNMEZ BANT çizdiriyordu (ölçüldü: 4 katman × 1 bant ≈ 80 ctx/kare).
      //   ⚠ `PAR_KENAR` payı kamera sarsıntısı (Environment.applyShake, birkaç
      //     px) için bilinçli emniyet marjıdır — 0 YAPMA.
      const sSon = sBas + W + this.PAR_KENAR;
      for (let s = s0; s < sSon; s += L) {
        const wx = camera.x + (s - sBas);
        ctx.save();
        ctx.translate(wx, ustW);
        ctx.fillStyle = this._gr(ctx, grAnah, (c) => {
          const g = c.createLinearGradient(0, 0, 0, bandH);
          g.addColorStop(0, renk);
          g.addColorStop(1, this._rgba(pal.sis, 0.0));
          return g;
        });
        ctx.beginPath();
        ctx.moveTo(0, bandH);
        for (let q = 0; q < siluet.length; q++) ctx.lineTo(siluet[q][0] * L, siluet[q][1] * bandH);
        ctx.lineTo(L, bandH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ciz++;
      }
    }
    ctx.globalAlpha = eskiA;
    return ciz;
  },

  // Deterministik tepe silueti (bir kez üretilir, önbelleklenir)
  _siluet(anah, L, adet) {
    let s = this._siluetOnbellek[anah];
    if (s) return s;
    // ⚠ Hash küçük aralığa indirgenir: `Math.sin` çok büyük argümanda hassasiyet
    //   kaybeder (CLAUDE.md port tuzağı D-4 ile aynı sınıf sorun).
    const h = this._hash(anah) % 100003;
    s = [];
    for (let i = 0; i <= adet; i++) {
      const u = i / adet;
      const y = 0.15 + 0.7 * (0.5 + 0.5 * Math.sin(u * 6.283 * (1 + (h % 3)) + h * 0.37)) * (0.55 + 0.45 * this._h01(h + i * 71));
      s.push([u, 1 - y]);
    }
    this._siluetOnbellek[anah] = s;
    return s;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7) ÇİZİM — DEKALLER (TERRAIN_DECAL_SYSTEM)
  // ═══════════════════════════════════════════════════════════════════════
  // `Terrain._drawSurfaceTexture` SONRASI (zemin dokusunun üstü; kontur, sahne
  // ve sikkelerin ALTI) — `camera.apply` ETKİN.
  // 🔴 Her dekal AYRI çağrıyla, kendi konumu kamera olarak verilerek çizilir:
  //    modül `sx=(d.x−camX)·zoom` hesaplıyor; camX=d.x, zoom=1 ⟹ sx=0.
  //    Böylece (a) dünya matematiği DOĞRULANMIŞ olur, (b) `oil` dekalinin
  //    radyal gradient argümanları konumdan bağımsızlaşır → önbellek İSABET eder
  //    (yoksa kamera her kaydığında 80 yeni gradient üretilirdi).
  dekalCiz(ctx, camera) {
    const DS = this.M('TERRAIN_DECAL_SYSTEM');
    if (!DS || !DS._decals || !DS._decals.length) return 0;
    const zoom = camera.zoom || 1;
    const sol = camera.x - 200, sag = camera.x + (camera.width || 1280) / zoom + 200;
    const hepsi = DS._decals;
    const tek = this._tekDekal || (this._tekDekal = []);
    const pctx = this._prox(ctx);
    let ciz = 0;
    for (let i = 0; i < hepsi.length; i++) {
      const d = hepsi[i];
      if (d.x < sol || d.x > sag) continue;
      tek.length = 0; tek[0] = d;
      const eski = DS._decals;
      ctx.save();
      ctx.translate(d.x, d.y);
      this._etiket = 'dekal|' + d.type; this._sayac = 0;
      try {
        DS._decals = tek;
        this._rndAc(i + 11);
        DS.draw(pctx, d.x, d.y, 1);      // camX=d.x, camY=d.y, zoom=1 ⟹ sx=sy=0
        ciz++;
      } catch (e) { this._hataSayaci++; }
      finally { this._rndKapa(); }
      DS._decals = eski;
      ctx.restore();
    }
    return ciz;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 8) ÇİZİM — DEKOR + PROP (TERRAIN_DECORATION_V2 + PROP_LIBRARY_EXTENDED)
  // ═══════════════════════════════════════════════════════════════════════
  // `Terrain.draw` SONRASI — zeminin ÜSTÜ, ARACIN ALTI (drawGame:148 vs 186).
  dekorCiz(ctx, camera, mapId, t) {
    const T = this.M('Terrain');
    const D = this.M('TERRAIN_DECORATION_V2');
    const PL = this.M('PROP_LIBRARY_EXTENDED');
    if (!T || !camera) return;

    const yog = this._kal('dekorYogunluk');            // 🔴 ölü anahtar → CANLI
    if (yog <= 0) { this._sonDekor = 0; this._sonProp = 0; return; }
    const golge = this._kal('golge');
    const P = this.profil(mapId);
    const L = this.isik(mapId);
    const liste = this._gorunur(mapId, camera);
    const pctx = this._prox(ctx);
    const merkez = camera.x + (camera.width || 1280) / (camera.zoom || 1) * 0.5;
    let nDekor = 0, nProp = 0;

    for (let i = 0; i < liste.length; i++) {
      const o = liste[i];
      if (o.u >= yog) continue;                        // iç içe yoğunluk eşiği
      let gy;
      try { gy = T.getYAt(o.x); } catch (e) { continue; }
      if (!isFinite(gy)) continue;

      // TERRAIN_DECORATION_V2.lod — mesafeye göre detay/animasyon/gölge kararı
      let lod = null;
      if (D && D.lod && typeof D.lod.getLOD === 'function') {
        try { lod = D.lod.getLOD(Math.abs(o.x - merkez)); } catch (e) { lod = null; }
      }
      if (lod && lod.draw === false) continue;
      const detay = lod ? lod.drawDetail !== false : true;
      const anim = lod ? lod.animEnabled !== false : true;
      const golgeVar = golge > 0 && (lod ? lod.shadowEnabled !== false : true);

      // 🔴 SAVE/RESTORE DENGESİ: istisna nerede olursa olsun `finally` ile
      //    tam olarak bir restore yapılır. (İlk sürümde catch içinde restore
      //    vardı; hata `ctx.save()`ten ÖNCE oluşsaydı ÇAĞIRANIN save'ini
      //    açar ve tüm canvas durumu bozulurdu.)
      // ⚠ TEK save/restore çifti. İç içe `save()` koyulsaydı ve üçüncü-parti
      //   çizim istisna atsaydı, canvas save yığını her hatada BİR seviye
      //   büyürdü (sızıntı). Burada `finally` tam olarak bir restore yapar.
      ctx.save();
      try {
        if (o.kat === 'prop') {
          if (!PL || !PL[o.id] || typeof PL[o.id].draw !== 'function') continue;
          if (golgeVar) this._yerGolgesi(ctx, o.x, gy, (PL[o.id].width || 60) * o.s, (PL[o.id].height || 80) * o.s, L, golge);
          ctx.translate(o.x, gy);                      // 🔴 orijine taşı → gradient anahtarı sabit
          this._etiket = 'prop|' + o.id + '|' + o.s; this._sayac = 0;
          // 🔴 NÖTR kamera: prop kendi (x−camX)·zoom hesabını yapıyor (D1).
          //    x=0,y=0,z=ölçek ⟹ dünya koordinatı üretir, projeksiyonu camera.apply yapar.
          // 🔴 Tohum PROP TİPİ + ÖLÇEK'ten türer, ÖRNEKTEN değil. Örnek başına
          //    tohum verilince (ilk deneme) her yeni geyser/kamp ateşi KENDİ
          //    parçacık düzenini üretiyor → gradient anahtar kümesi harita
          //    uzunluğuyla birlikte SINIRSIZ büyüyordu (ölçüldü: son 300 karede
          //    29 yeni gradient, hiç kapanmıyordu). Tip bazlı tohumla küme
          //    sonlu: tip × ölçek × çağrı-yeri × (periyodik t).
          this._rndAc(this._hash(o.id) + Math.round(o.s * 4));
          try { PL[o.id].draw(pctx, 0, 0, anim ? t + o.faz : o.faz, o.s); }
          finally { this._rndKapa(); }
          nProp++;
        } else {
          if (golgeVar && o.kat !== 'bitki') {
            this._yerGolgesi(ctx, o.x, gy, (o.k.width || 40) * o.s, (o.k.height || 40) * o.s, L, golge * 0.8);
          }
          ctx.translate(o.x, gy);
          if (o.f < 0) ctx.scale(-1, 1);
          if (o.kat === 'agac')      this._agacCiz(ctx, o.k, o.s, P, L, anim ? t + o.faz : o.faz, detay);
          else if (o.kat === 'kaya') this._kayaCiz(ctx, o.k, o.s, L, detay);
          else                       this._bitkiCiz(ctx, o.k, o.s, P, L, anim ? t + o.faz : o.faz);
          nDekor++;
        }
      } catch (e) { this._hataSayaci++; }
      finally { ctx.restore(); }
    }
    this._sonDekor = nDekor;
    this._sonProp = nProp;
  },

  // Nesne yer gölgesi — TERRAIN_LIGHTING'in sunAngle/shadowLength'inden türer.
  // ⚠ gorsel-isik.js ARAÇ gölgesi + teker temas gölgesi + zemin AO bandı çiziyor;
  //   dekor başına gölge ÇİZMİYOR → çift uygulama yok (kural 3).
  _yerGolgesi(ctx, wx, wy, w, h, L, g) {
    const uz = Math.max(0.15, Math.min(3, L.shadowLength || 0.3));
    const rad = (L.sunAngle || 45) * Math.PI / 180;
    const dx = Math.cos(rad) * h * uz * 0.35;
    const rx = Math.max(6, w * 0.55 + Math.abs(dx) * 0.5);
    const ry = Math.max(2, w * 0.16);
    const ea = ctx.globalAlpha;
    ctx.globalAlpha = ea * Math.min(0.42, 0.30 * g * L.intensity + 0.06);
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(wx + dx * 0.5, wy + ry * 0.35, rx, ry, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = ea;
  },

  // ── Ağaç (canopyShape'e göre) ────────────────────────────────────────────
  _agacCiz(ctx, tr, s, P, L, t, detay) {
    const w = (tr.width || 60) * s, h = (tr.height || 100) * s;
    const sway = detay ? Math.sin(t * 0.6) * w * 0.035 : 0;
    const govde = this.ton(P.govde, L), yaprak = this.ton(P.yaprak, L);
    ctx.fillStyle = govde;
    const gw = Math.max(2, w * 0.12);
    switch (tr.canopyShape) {
      case 'cone':
        ctx.fillRect(-gw / 2, -h * 0.28, gw, h * 0.28);
        ctx.fillStyle = yaprak;
        for (let k = 0; k < (detay ? 3 : 1); k++) {
          const yy = -h * (0.25 + k * 0.24), ww = w * (0.55 - k * 0.12);
          ctx.beginPath(); ctx.moveTo(sway * (k + 1), yy - h * 0.34);
          ctx.lineTo(-ww, yy); ctx.lineTo(ww, yy); ctx.closePath(); ctx.fill();
        }
        break;
      case 'feather': case 'frond':
        ctx.beginPath(); ctx.moveTo(-gw / 2, 0);
        ctx.quadraticCurveTo(gw * 0.6 + sway, -h * 0.5, sway * 2, -h * 0.72);
        ctx.lineTo(sway * 2 + gw, -h * 0.72); ctx.quadraticCurveTo(gw * 1.6 + sway, -h * 0.5, gw / 2 + gw, 0);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = yaprak; ctx.lineWidth = Math.max(1.5, w * 0.05); ctx.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          const a = -2.6 + k * 0.42;
          ctx.beginPath(); ctx.moveTo(sway * 2, -h * 0.72);
          ctx.quadraticCurveTo(Math.cos(a) * w * 0.4, -h * 0.72 + Math.sin(a) * h * 0.16,
                               Math.cos(a) * w * 0.62, -h * 0.66 + Math.sin(a) * h * 0.3);
          ctx.stroke();
        }
        break;
      case 'cylindrical':                                     // kaktüs
        ctx.fillStyle = yaprak;
        this._yuvarlak(ctx, -w * 0.16, -h, w * 0.32, h, w * 0.14);
        this._yuvarlak(ctx, -w * 0.46, -h * 0.62, w * 0.3, w * 0.16, w * 0.08);
        this._yuvarlak(ctx, -w * 0.46, -h * 0.62, w * 0.14, h * 0.34, w * 0.07);
        this._yuvarlak(ctx, w * 0.18, -h * 0.5, w * 0.28, w * 0.14, w * 0.07);
        this._yuvarlak(ctx, w * 0.32, -h * 0.5, w * 0.14, h * 0.26, w * 0.07);
        break;
      case 'cluster':                                         // bambu
        ctx.strokeStyle = yaprak; ctx.lineWidth = Math.max(1.5, w * 0.22); ctx.lineCap = 'round';
        for (let k = 0; k < 4; k++) {
          const ox = (k - 1.5) * w * 0.55;
          ctx.beginPath(); ctx.moveTo(ox, 0); ctx.quadraticCurveTo(ox + sway, -h * 0.55, ox + sway * 2.4, -h * (0.72 + k * 0.06)); ctx.stroke();
        }
        break;
      case 'dome':                                            // mantar
        ctx.fillStyle = govde; this._yuvarlak(ctx, -gw, -h * 0.55, gw * 2, h * 0.55, gw);
        ctx.fillStyle = yaprak;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.55, w * 0.5, h * 0.34, 0, Math.PI, 0); ctx.fill();
        break;
      case 'prism':                                           // kristal
        ctx.fillStyle = yaprak;
        ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w * 0.3, -h * 0.42); ctx.lineTo(w * 0.16, 0);
        ctx.lineTo(-w * 0.16, 0); ctx.lineTo(-w * 0.3, -h * 0.42); ctx.closePath(); ctx.fill();
        break;
      case 'tentacle':
        ctx.strokeStyle = yaprak; ctx.lineWidth = Math.max(2, w * 0.1); ctx.lineCap = 'round';
        for (let k = 0; k < 5; k++) {
          const a = -1.9 + k * 0.5;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(Math.cos(a) * w * 0.3, -h * 0.55, Math.cos(a) * w * 0.5 + sway, -h * (0.7 + k * 0.03));
          ctx.stroke();
        }
        break;
      case 'bare':
        ctx.strokeStyle = govde; ctx.lineWidth = Math.max(2, gw); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sway, -h * 0.75); ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const yy = -h * (0.4 + k * 0.13), dir = k % 2 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(sway * 0.6, yy); ctx.lineTo(dir * w * 0.36, yy - h * 0.16); ctx.stroke();
        }
        break;
      case 'drooping':
        ctx.fillRect(-gw / 2, -h * 0.45, gw, h * 0.45);
        ctx.strokeStyle = yaprak; ctx.lineWidth = Math.max(1.2, w * 0.03);
        for (let k = 0; k < 8; k++) {
          const ox = (k - 3.5) * w * 0.12;
          ctx.beginPath(); ctx.moveTo(ox * 0.4, -h * 0.5);
          ctx.quadraticCurveTo(ox + sway, -h * 0.28, ox * 1.25 + sway * 2, -h * 0.06); ctx.stroke();
        }
        break;
      case 'flat_top':                                        // akasya
        ctx.fillRect(-gw / 2, -h * 0.45, gw, h * 0.45);
        ctx.fillStyle = yaprak;
        ctx.beginPath(); ctx.ellipse(sway, -h * 0.55, w * 0.5, h * 0.18, 0, 0, 6.283); ctx.fill();
        break;
      case 'bottle':                                          // baobab
        ctx.beginPath(); ctx.moveTo(-w * 0.3, 0); ctx.quadraticCurveTo(-w * 0.16, -h * 0.5, -gw, -h * 0.62);
        ctx.lineTo(gw, -h * 0.62); ctx.quadraticCurveTo(w * 0.16, -h * 0.5, w * 0.3, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = yaprak;
        ctx.beginPath(); ctx.ellipse(sway, -h * 0.7, w * 0.34, h * 0.14, 0, 0, 6.283); ctx.fill();
        break;
      case 'spread':                                          // mangrov
        ctx.strokeStyle = govde; ctx.lineWidth = Math.max(1.6, gw * 0.5);
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * w * 0.14, 0); ctx.lineTo(0, -h * 0.34); ctx.stroke(); }
        ctx.fillStyle = yaprak;
        ctx.beginPath(); ctx.ellipse(sway, -h * 0.55, w * 0.46, h * 0.24, 0, 0, 6.283); ctx.fill();
        break;
      default:                                                // round
        ctx.fillRect(-gw / 2, -h * 0.42, gw, h * 0.42);
        ctx.fillStyle = yaprak;
        ctx.beginPath(); ctx.arc(sway, -h * 0.6, w * 0.36, 0, 6.283); ctx.fill();
        if (detay) {
          ctx.beginPath(); ctx.arc(sway - w * 0.24, -h * 0.48, w * 0.24, 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.arc(sway + w * 0.24, -h * 0.5, w * 0.22, 0, 6.283); ctx.fill();
        }
    }
  },

  // ── Kaya (shape + katalog rengi) ─────────────────────────────────────────
  _kayaCiz(ctx, rk, s, L, detay) {
    const w = (rk.width || 30) * s, h = (rk.height || 24) * s;
    ctx.fillStyle = this.ton(rk.color || '#787070', L);
    switch (rk.shape) {
      case 'prism':
        ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w * 0.34, -h * 0.3); ctx.lineTo(w * 0.16, 0);
        ctx.lineTo(-w * 0.2, 0); ctx.lineTo(-w * 0.32, -h * 0.34); ctx.closePath(); ctx.fill();
        break;
      case 'cube': case 'flat_face':
        ctx.fillRect(-w * 0.5, -h, w, h);
        break;
      case 'cylinder':
        ctx.fillRect(-w * 0.5, -h, w, h);
        ctx.beginPath(); ctx.ellipse(0, -h, w * 0.5, w * 0.16, 0, 0, 6.283); ctx.fill();
        break;
      case 'layered':
        for (let k = 0; k < 4; k++) ctx.fillRect(-w * (0.5 - k * 0.06), -h * (k + 1) / 4, w * (1 - k * 0.12), h / 4 + 1);
        break;
      case 'sharp': case 'jagged':
        ctx.beginPath(); ctx.moveTo(-w * 0.5, 0);
        ctx.lineTo(-w * 0.3, -h * 0.7); ctx.lineTo(-w * 0.08, -h * 0.35);
        ctx.lineTo(w * 0.1, -h); ctx.lineTo(w * 0.32, -h * 0.4); ctx.lineTo(w * 0.5, 0);
        ctx.closePath(); ctx.fill();
        break;
      case 'irregular': case 'rough':
        ctx.beginPath(); ctx.moveTo(-w * 0.5, 0);
        ctx.lineTo(-w * 0.38, -h * 0.6); ctx.lineTo(-w * 0.05, -h * 0.9);
        ctx.lineTo(w * 0.3, -h * 0.72); ctx.lineTo(w * 0.5, -h * 0.2); ctx.lineTo(w * 0.42, 0);
        ctx.closePath(); ctx.fill();
        break;
      default:                                                 // round
        ctx.beginPath(); ctx.ellipse(0, -h * 0.45, w * 0.5, h * 0.5, 0, 0, 6.283); ctx.fill();
    }
    if (detay && w > 16) {                                     // üst ışık kenarı
      const ea = ctx.globalAlpha;
      ctx.globalAlpha = ea * 0.28; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(-w * 0.12, -h * 0.78, w * 0.2, h * 0.1, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = ea;
    }
  },

  // ── Bitki (katalog height + windSway) ────────────────────────────────────
  _bitkiCiz(ctx, bt, s, P, L, t) {
    const h = (bt.height || 20) * s * 1.15;
    const sw = (bt.windSway || 0) * Math.sin(t * 1.5) * h * 0.35;
    const ot = this.ton(P.ot, L);
    const id = bt.id || '';
    if (id === 'lichen' || id === 'moss' || id === 'glow_lichen') {
      ctx.fillStyle = id === 'glow_lichen' ? this.ton('#9fe8a0', L) : ot;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.3, h * 1.9, h * 0.7, 0, 0, 6.283); ctx.fill();
      return;
    }
    if (id === 'tumbleweed') {
      ctx.strokeStyle = this.ton('#a08a4a', L); ctx.lineWidth = Math.max(1, h * 0.06);
      ctx.beginPath(); ctx.arc(sw, -h * 0.5, h * 0.5, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sw - h * 0.4, -h * 0.5); ctx.lineTo(sw + h * 0.4, -h * 0.5); ctx.stroke();
      return;
    }
    if (id === 'bush_sm' || id === 'bush_lg' || id === 'sagebrush' || id === 'fern') {
      ctx.fillStyle = id === 'sagebrush' ? this.ton('#8a9a6a', L) : ot;
      ctx.beginPath(); ctx.arc(sw * 0.5, -h * 0.45, h * 0.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(sw * 0.5 - h * 0.3, -h * 0.3, h * 0.34, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(sw * 0.5 + h * 0.3, -h * 0.32, h * 0.32, 0, 6.283); ctx.fill();
      return;
    }
    if (id === 'flower_red' || id === 'flower_blue' || id === 'flower_yellow' || id === 'arctic_flower') {
      const renk = { flower_red: '#e04a4a', flower_blue: '#5a7ae0', flower_yellow: '#e8c83a', arctic_flower: '#e8e8f8' }[id] || '#e04a4a';
      ctx.strokeStyle = ot; ctx.lineWidth = Math.max(1, h * 0.09); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sw, -h * 0.8); ctx.stroke();
      ctx.fillStyle = this.ton(renk, L);
      ctx.beginPath(); ctx.arc(sw, -h * 0.88, Math.max(1.2, h * 0.22), 0, 6.283); ctx.fill();
      return;
    }
    if (id === 'cattail' || id === 'reed' || id === 'seaweed' || id === 'vine') {
      ctx.strokeStyle = id === 'seaweed' ? this.ton('#2a8a70', L) : ot;
      ctx.lineWidth = Math.max(1.2, h * 0.045); ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(k * h * 0.1, 0);
        ctx.quadraticCurveTo(k * h * 0.1 + sw * 0.6, -h * 0.55, k * h * 0.1 + sw, -h);
        ctx.stroke();
      }
      if (id === 'cattail') {
        ctx.fillStyle = this.ton('#6a4a2a', L);
        this._yuvarlak(ctx, sw - h * 0.05, -h, h * 0.1, h * 0.22, h * 0.05);
      }
      return;
    }
    // grass_short / grass_tall / long_grass ve kalanlar → çim tutamı
    ctx.strokeStyle = ot; ctx.lineWidth = Math.max(1, h * 0.11); ctx.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath(); ctx.moveTo(k * h * 0.14, 0);
      ctx.quadraticCurveTo(k * h * 0.14 + sw * 0.5, -h * 0.6, k * h * 0.2 + sw, -h * (0.75 + Math.abs(k) * 0.06));
      ctx.stroke();
    }
  },

  _yuvarlak(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath(); ctx.fill();
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 9) ÇİZİM — TÜNEL (TUNNEL_RENDERER) — ARACIN ÜSTÜNDE
  // ═══════════════════════════════════════════════════════════════════════
  // `Renderer._atmosphereOverlay` ÖNCESİ çağrılır. O noktada `camera.restore`
  // yapılmıştır (drawGame:199) → kamerayı KENDİMİZ yeniden uygularız.
  tunelCiz(ctx, camera, mapId, t) {
    const TR = this.M('TUNNEL_RENDERER');
    const T = this.M('Terrain');
    if (!TR || !T || !camera) return 0;
    const cfg = this.hcfg(mapId);
    if (!cfg.tun) return 0;                              // tünel yalnız uygun biyomlarda
    const g = this._kal('dekorYogunluk');
    if (g <= 0) return 0;

    const zoom = camera.zoom || 1;
    const gorW = (camera.width || 1280) / zoom;
    const ARA = this.TUNEL_ARA;
    const i0 = Math.floor((camera.x - 1400) / ARA), i1 = Math.floor((camera.x + gorW) / ARA);
    const pctx = this._prox(ctx);
    let ciz = 0;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    try { const E = this.M('Environment'); if (E && E.applyShake) E.applyShake(ctx); } catch (e) {}

    for (let i = i0; i <= i1; i++) {
      if (i < 1) continue;                               // başlangıç bölgesinde tünel yok
      const h01 = this._h01(i * 5449 + 17);
      if (h01 > 0.72) continue;                          // her aralıkta tünel YOK
      const wx = i * ARA + 400 + h01 * 900;
      // ⚠ Boyutlar 20 px'e kuantalanır → `TUNNEL_RENDERER`ın lamba gradientleri
      //   yalnız birkaç anahtar üretir (kural 4).
      // 🔴 Geometri KÜÇÜK ve SABİT bir kümeden seçilir (6 genişlik × 4 yükseklik
      //    = 24 kombinasyon). Serbest bırakılınca `TUNNEL_RENDERER`ın lamba
      //    gradientleri (terrain.js:8552) her yeni ölçüde YENİ anahtar üretiyor
      //    ve önbellek hiç kapanmıyordu (ölçüldü: 1200 karede 15+10+9+8+7 …).
      const gwSet = this.TUNEL_GEN, ghSet = this.TUNEL_YUK;
      const gi = Math.floor(this._h01(i * 71) * gwSet.length) % gwSet.length;
      const gh = ghSet[Math.floor(this._h01(i * 91) * ghSet.length) % ghSet.length];
      // 🔴 `TUNNEL_RENDERER` DÜZ bir dikdörtgen çiziyor (`fillRect`, 8527).
      //    Eğimli arazide taban havada kalır / zemine gömülür → ekranda yüzen
      //    kara kutu görünür. ▶ Aday genişlikler GENİŞTEN DARA denenir; hiçbiri
      //    yeterince düz değilse o yuvada tünel YOKTUR.
      let gw = 0, gy = 0;
      for (let a = 0; a < 3 && !gw; a++) {
        const w = gwSet[Math.max(0, gi - a)];           // geniş → dar, hep AYNI kümeden
        if (a > 0 && gi - a < 0) break;
        let enAz = Infinity, enCok = -Infinity, ok = true;
        for (let s = 0; s <= 4; s++) {
          let yy;
          try { yy = T.getYAt(wx + w * s / 4); } catch (e) { ok = false; break; }
          if (!isFinite(yy)) { ok = false; break; }
          if (yy < enAz) enAz = yy;
          if (yy > enCok) enCok = yy;
        }
        // Dar tünel eğimi daha çok affeder (kısa açıklıkta fark az); geniş
        // tünelde tolerans sıkı, yoksa dikdörtgen taban havada asılı kalır.
        const tol = (w <= 500) ? 140 : 90;
        if (ok && (enCok - enAz) < tol) { gw = w; gy = enCok; }
      }
      if (!gw) continue;
      ctx.save();
      ctx.translate(wx, gy);
      const eskiA = ctx.globalAlpha;
      // Modül `rgba(10,10,20,0.7)` sabitini kullanıyor; ULTRA'da bile aracı
      // tamamen karartmasın diye globalAlpha ile çarpılır (etkin ≈0.49).
      ctx.globalAlpha = eskiA * (0.35 + 0.35 * Math.min(1, g));
      this._etiket = 'tunel|' + gw + 'x' + gh; this._sayac = 0;
      try {
        // 🔴 NÖTR kamera (D1) + orijine taşıma.
        this._rndAc(i + 101);
        TR.draw(pctx, { x: 0, y: 0, width: gw, height: gh }, this._NOTR, null, t);
        ciz++;
      } catch (e) { this._hataSayaci++; }
      finally { this._rndKapa(); }
      ctx.globalAlpha = eskiA;
      ctx.restore();
    }
    ctx.restore();
    return ciz;
  },
  TUNEL_ARA: 3400,
  TUNEL_GEN: [360, 480, 600, 720, 840, 960],
  TUNEL_YUK: [300, 340, 380, 420],
  _NOTR: { x: 0, y: 0, zoom: 1 },

  // ═══════════════════════════════════════════════════════════════════════
  // 10) GÜNCELLEME — dekal üretimi + TERRAIN_DECAL_SYSTEM.update
  // ═══════════════════════════════════════════════════════════════════════
  guncelle(dt) {
    const DS = this.M('TERRAIN_DECAL_SYSTEM');
    if (!DS) return;
    dt = (typeof dt === 'number' && isFinite(dt) && dt > 0) ? Math.min(0.1, dt) : 0.016;
    const G = this.M('Game');
    const T = this.M('Terrain');
    const v = G ? G.vehicle : null;

    // Koşu/harita değişimi → izleri temizle (yeni koşuda eski izler kalmasın)
    try {
      const harita = (T && T.mapId) || '';
      const mes = v ? v.x : 0;
      if (harita !== this._sonHarita || mes < this._sonMesafe - 400) { DS.clear(); this._skidT = 0; }
      this._sonHarita = harita; this._sonMesafe = mes;
    } catch (e) {}

    try { DS.update(dt); } catch (e) { this._hataSayaci++; }

    if (!G || G.state !== 'playing' || !v || v.dead) { this._oncekiHavada = true; return; }
    const hiz = Math.abs(v.vx || 0);
    this._skidT -= dt;

    try {
      // ── a) FREN/KAYMA İZİ ──────────────────────────────────────────────
      if (v.onGround && hiz > 130 && (v.brake > 0.4 || (v.throttle > 0.7 && hiz < 260)) && this._skidT <= 0) {
        this._skidT = 0.07;
        const wl = v.wheels || [];
        for (let i = 0; i < wl.length; i++) {
          const w = wl[i];
          if (!w || !(w.contact || w.onGround)) continue;
          const wx = w.x, wy = w.y + (w.r || 12) * 0.85;
          let egim = 0;
          if (T && T.getYAt) egim = Math.atan2(T.getYAt(wx + 24) - T.getYAt(wx - 24), 48);
          DS.addSkidmark(wx, wy, egim, Math.min(90, 26 + hiz * 0.07), Math.max(4, (w.r || 12) * 0.55), 0.32);
        }
      }

      // ── b) SERT İNİŞ → KRATER (+ çok sertse yağ sızıntısı) ─────────────
      const havada = !v.onGround;
      if (this._oncekiHavada && !havada) {
        const carpma = Math.abs(this._oncekiVy || 0);
        if (carpma > 620) {
          let gy = v.y + 24;
          try { if (T && T.getYAt) gy = T.getYAt(v.x); } catch (e) {}
          DS.addCraterMark(v.x, gy, Math.min(46, 14 + carpma * 0.022));
          // ⚠ `hueShift` 45°'ye kuantalanır → yağ lekesinin radyal gradienti
          //   8 anahtardan fazlasını üretemez (kural 4).
          if (carpma > 1050) {
            DS.addOilSlick(v.x + (hiz > 0 ? 30 : -30), gy, 26 + Math.min(20, carpma * 0.01));
            const d = DS._decals[DS._decals.length - 1];
            if (d && typeof d.hueShift === 'number') d.hueShift = Math.round(d.hueShift / 45) * 45;
          }
        }
      }
      this._oncekiHavada = havada;
      this._oncekiVy = v.vy || 0;
    } catch (e) { this._hataSayaci++; }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 11) YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════════════
  _pal(mapId) {
    try { const Gr = this.M('Gorsel'); if (Gr && Gr.palet) return Gr.palet(mapId); } catch (e) {}
    return { tint: '#8fa8c0', pow: 0.14, doy: 1.10, kon: 1.08, bloom: '#ffeec8', sis: '#cfe0f0', gun: '#ffe8b0' };
  },
  _rgb(hex) {
    const h = String(hex).replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    if (!isFinite(n)) return [128, 128, 128];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  _rgba(hex, a) { const b = this._rgb(hex); return 'rgba(' + b[0] + ',' + b[1] + ',' + b[2] + ',' + a + ')'; },
  _karis(a, b, t) {
    const x = this._rgb(a), y = this._rgb(b);
    const h = (n) => { const s = Math.max(0, Math.min(255, Math.round(n))).toString(16); return s.length < 2 ? '0' + s : s; };
    return '#' + h(x[0] * (1 - t) + y[0] * t) + h(x[1] * (1 - t) + y[1] * t) + h(x[2] * (1 - t) + y[2] * t);
  },
  _hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; },
  _h01(n) { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); },

  olcum() {
    return {
      kare: this._kare,
      grUretim: this._grUretim,        // BU KARE (hedef 0)
      grToplam: this._grToplam,
      grAdet: this._grAdet,
      grTemizleme: this._grTemizleme,
      dekor: this._sonDekor, prop: this._sonProp,
      dekal: this._sonDekal, tunel: this._sonTunel,
      hata: this._hataSayaci
    };
  },

  // Kalite kademesindeki toplam dekor+prop sayısını ÖLÇ (selfTest/rapor için)
  sayimOlc(mapId, camera, yogunluk) {
    const liste = this._gorunur(mapId, camera);
    let n = 0;
    for (let i = 0; i < liste.length; i++) if (liste[i].u < yogunluk) n++;
    return n;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 12) KURULUM — ADDITIVE SARMALAMA (hookups.js şablonu)
  // ═══════════════════════════════════════════════════════════════════════
  init() {
    if (this._sarildi) return false;
    const self = this;
    const T = this.M('Terrain');
    const R = this.M('Renderer');
    let n = 0;

    // 1) Terrain._drawSurfaceTexture SONRASI → DEKALLER (zemin dokusunun üstü,
    //    kontur/sahne/sikke ALTI). `camera.apply` ETKİN.
    try {
      if (T && typeof T._drawSurfaceTexture === 'function') {
        const orj = T._drawSurfaceTexture;
        T._drawSurfaceTexture = function (ctx, startX, endX, surface, camera, t) {
          orj.call(this, ctx, startX, endX, surface, camera, t);
          try { self._sonDekal = self.dekalCiz(ctx, camera || self._kam || self.M('Camera')); }
          catch (e) { self._hataSayaci++; }
        };
        n++;
      }
    } catch (e) {}

    // 2) Terrain.draw SONRASI → DEKOR + PROP (zeminin üstü, ARACIN ALTI)
    try {
      if (T && typeof T.draw === 'function') {
        const orj = T.draw;
        T.draw = function (ctx, camera) {
          self._kam = camera;
          self._kare++;
          self._grUretim = 0;                              // kare başı ölçüm sıfırlanır
          self._t = Date.now() * 0.001;
          orj.call(this, ctx, camera);
          try { self.dekorCiz(ctx, camera, this.mapId, self._t); }
          catch (e) { self._hataSayaci++; }
        };
        n++;
      }
    } catch (e) {}

    // 3) Renderer._drawBackground ÖNCESİ → PARALAKS (her şeyin ARKASI)
    try {
      if (R && typeof R._drawBackground === 'function') {
        const orj = R._drawBackground;
        R._drawBackground = function (ctx, camera, mapId, t) {
          try { self.paralaksCiz(ctx, camera, mapId); } catch (e) { self._hataSayaci++; }
          orj.call(this, ctx, camera, mapId, t);
        };
        n++;
      }
    } catch (e) {}

    // 4) Renderer._atmosphereOverlay ÖNCESİ → TÜNEL (ARACIN ÜSTÜ)
    try {
      if (R && typeof R._atmosphereOverlay === 'function') {
        const orj = R._atmosphereOverlay;
        R._atmosphereOverlay = function (ctx, W, H, mapId, t) {
          try { self._sonTunel = self.tunelCiz(ctx, self._kam || self.M('Camera'), mapId, t || self._t); }
          catch (e) { self._hataSayaci++; }
          orj.call(this, ctx, W, H, mapId, t);
        };
        n++;
      }
    } catch (e) {}

    // 5) Game.update SONRASI → dekal üretimi
    try {
      const G = this.M('Game');
      if (G && typeof G.update === 'function') {
        const orj = G.update.bind(G);
        G.update = function (dt) { orj(dt); try { self.guncelle(dt); } catch (e) { self._hataSayaci++; } };
        n++;
      }
    } catch (e) {}

    this._sarildi = n > 0;
    this._kancaSayisi = n;
    return this._sarildi;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 13) selfTest — ÖLÇEREK doğrular
  // ═══════════════════════════════════════════════════════════════════════
  selfTest() {
    const r = {};
    const K = this.M('Kalite');

    // a) 51 haritanın tamamı eşlendi mi, biyom anahtarları geçerli mi
    const hlist = Object.keys(this.HARITA);
    r.harita51 = hlist.length >= 51;
    const PX = this.M('TERRAIN_PARALLAX_EXTENDED');
    const D = this.M('TERRAIN_DECORATION_V2');
    const PL = this.M('PROP_LIBRARY_EXTENDED');
    const LG = this.M('TERRAIN_LIGHTING');
    r.parBiyomGecerli = !PX || hlist.every(m => !!PX[this.HARITA[m].par]);
    r.profilGecerli = hlist.every(m => !!this.DPROFIL[this.HARITA[m].dp]);
    r.propGecerli = !PL || hlist.every(m => (this.HARITA[m].prop || []).every(p => !!PL[p]));
    r.isikGecerli = !LG || hlist.every(m => !!LG.presets[this.HARITA[m].isik[0]] && !!LG.presets[this.HARITA[m].isik[1]]);

    // b) BİYOM TUTARLILIĞI — ayda/marsta/sanayide ağaç YOK, çölde çim YOK
    r.aydaAgacYok = ['moon', 'mars', 'meteor_field'].every(m => this.profil(m).agac === 0);
    r.coldeCimYok = ['desert', 'sandstorm', 'canyon'].every(m => {
      const b = this.profil(m).bitki;
      return b.indexOf('grass_short') < 0 && b.indexOf('grass_tall') < 0;
    });
    r.suAltiAtesYok = ['underwater'].every(m => (this.HARITA[m].prop || []).indexOf('campfire') < 0);

    // c) Gradient önbelleği GERÇEKTEN önbellekliyor mu (ölçerek)
    r.gradientOnbellek = (function (s) {
      s.onbellekTemizle();
      const sahte = { createLinearGradient: () => ({ addColorStop() {} }) };
      s._gr(sahte, 'x|1', c => c.createLinearGradient());
      const ilk = s._grUretim;
      s._gr(sahte, 'x|1', c => c.createLinearGradient());
      return s._grUretim === ilk;
    })(this);

    // d) Proxy yolu: aynı etiket+argümanla ikinci çağrı YENİ gradient üretmemeli
    r.proxyOnbellek = (function (s) {
      s.onbellekTemizle();
      const o = { createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) };
      s._etiket = 'test'; s._sayac = 0; s._grCagri(o, 'createLinearGradient', [0, 0, 0, 10]);
      const ilk = s._grToplam;
      s._etiket = 'test'; s._sayac = 0;
      const g2 = s._grCagri(o, 'createLinearGradient', [0, 0, 0, 10]);
      return s._grToplam === ilk && !!g2 && typeof g2.addColorStop === 'function';
    })(this);

    // d2) KARE BÜTÇESİ: aynı çağrı yerinde argüman sürekli değişse bile bir
    //     karede en çok `_GR_KARE_BUTCE` YENİ gradient üretilmeli.
    r.grKareButce = (function (s) {
      s.onbellekTemizle();
      const o = { createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) };
      s._grUretim = 0;
      for (let i = 0; i < 24; i++) {                    // tek "kare" içinde 24 farklı argüman
        s._etiket = 'butce'; s._sayac = 0;
        s._grCagri(o, 'createLinearGradient', [0, 0, 0, 40 + i * 20]);
      }
      const uretilen = s._grUretim;
      s.onbellekTemizle();
      return uretilen <= s._GR_KARE_BUTCE;
    })(this);

    // d3) DÜNYA↔EKRAN SÖZLEŞMESİ: bağlama bu eşitliğe dayanıyor (D1).
    //     Camera.apply = scale(zoom); translate(-x,-y) ⟹ ekran=(dünya−kam)·zoom
    r.dunyaMatematigi = (function (s) {
      const C = s.M('Camera');
      if (!C || !C.worldToScreen) return true;
      const ex = C.x, ey = C.y, ez = C.zoom;
      C.x = 100; C.y = 50; C.zoom = 2;
      const p = C.worldToScreen(300, 150);
      C.x = ex; C.y = ey; C.zoom = ez;
      return Math.abs(p.x - 400) < 1e-9 && Math.abs(p.y - 200) < 1e-9;
    })(this);

    // e) dekorYogunluk MONOTON: 6 kademede nesne sayısı artmalı (İÇ İÇE eşik)
    if (K) {
      const kam = { x: 0, y: 0, zoom: 1, width: 1280, height: 720 };
      const eski = K._kademe;
      let sayilar = [], artan = true;
      try {
        for (let i = 0; i < K.KADEMELER.length; i++) {
          K._kademe = K.KADEMELER[i];
          sayilar.push(this.sayimOlc('countryside', kam, K.ayar('dekorYogunluk')));
        }
      } catch (e) { artan = false; }
      K._kademe = eski;
      for (let i = 1; i < sayilar.length; i++) if (!(sayilar[i] > sayilar[i - 1])) artan = false;
      r.yogunlukMonoton = artan && sayilar.length === 6;
      this._sonSayimlar = sayilar;
    } else { r.yogunlukMonoton = true; }

    // f) Işık ön ayarı sayı döndürüyor mu
    r.isikSayi = (function (s) {
      const L = s.isik('countryside');
      return L && isFinite(L.intensity) && isFinite(L.sunAngle) && isFinite(L.shadowLength);
    })(this);

    // g) Renk yardımcıları
    r.renkYardimci = this._rgba('#ff8000', 0.5) === 'rgba(255,128,0,0.5)' &&
                     this._karis('#000000', '#ffffff', 0.5) === '#808080';

    // h) Poisson yerleşimi çalışıyor mu (modülün kendi üreticisiyle)
    // ⚠ Katalog yoksa yerleştirilecek şey de yoktur → o durumda geçerli sayılır
    //   (bu test BU dosyayı ölçer, terrain.js'in yüklü olup olmadığını değil).
    r.yerlesimUretiyor = (function (s) {
      if (!D || !D.trees) return true;
      try { return s._blok('countryside', 1, 3).length > 5; } catch (e) { return false; }
    })(this);

    // i) Çakışma kilidi: gorsel.js `_MODUL_SIRA` listesine GİRMEMELİYİZ
    r.gorselCakismaYok = (function (s) {
      const Gr = s.M('Gorsel');
      if (!Gr || !Gr._MODUL_SIRA) return true;
      return Gr._MODUL_SIRA.indexOf('BaglaArazi') < 0 && s.ad === undefined;
    })(this);

    // ═══ PERF KİLİTLERİ (31 Tmz) — hepsi ÖLÇEREK ═══════════════════════════
    // j) 🔴 `_rndAc` KAPANIŞ (closure) ÜRETMEMELİ. Kare başına 11,22 kez
    //    çağrılıyor; her çağrıda yeni fonksiyon = 11 nesne/kare + `Math.random`
    //    satır içi önbelleğinin her yazmada bozulması.
    //    Enjeksiyon: iki kez aç/kapa; `Math.random`a yazılan nesne AYNI olmalı.
    //    Ayrıca LCG dizisi DEĞİŞMEMELİ (aynı tohum → aynı ilk üç değer).
    r.rndTekFonksiyon = (function (s) {
      try {
        const gercek = Math.random;
        s._rndAc(12345); const f1 = Math.random;
        const a1 = Math.random(), a2 = Math.random(), a3 = Math.random();
        s._rndKapa();
        s._rndAc(12345); const f2 = Math.random;
        const b1 = Math.random(), b2 = Math.random(), b3 = Math.random();
        s._rndKapa();
        Math.random = gercek;
        // Referans LCG (koddan bağımsız) — dizi kaymadığını KANITLAR
        let st = 12345 >>> 0, ref = [];
        for (let i = 0; i < 3; i++) { st = (st * 1664525 + 1013904223) >>> 0; ref.push(st / 4294967296); }
        return f1 === f2 && a1 === b1 && a2 === b2 && a3 === b3 &&
               a1 === ref[0] && a2 === ref[1] && a3 === ref[2];
      } catch (e) { try { s._rndKapa(); } catch (_) {} return false; }
    })(this);

    // k) 🔴 `ton()` SICAK DÖNGÜDE DİZE ANAHTARI ÜRETMEMELİ (kare başına 47,23).
    //    Enjeksiyon: aynı ışıkla ikinci çağrı önbellekten dönmeli VE iki FARKLI
    //    ışık aynı hex için FARKLI ton vermeli (anahtar çakışması olmasın).
    r.tonOnbellek = (function (s) {
      try {
        const L1 = { ambientR: 255, ambientG: 255, ambientB: 245, intensity: 1.0, sunAngle: 80, shadowLength: 0.3 };
        const L2 = { ambientR: 40,  ambientG: 40,  ambientB: 90,  intensity: 0.2, sunAngle: 80, shadowLength: 0.3 };
        const c1 = s.ton('#4e9a36', L1);
        const c1b = s.ton('#4e9a36', L1);
        const c2 = s.ton('#4e9a36', L2);
        return !!L1.__ton && c1 === c1b && c1 !== c2 &&
               !/toFixed/.test(String(s.ton));         // anahtar dizisi kalkmış olmalı
      } catch (e) { return false; }
    })(this);

    // l) 🔴 PARALAKS EKRAN DIŞI BANT ÇİZMEMELİ. Enjeksiyon: sayan sahte ctx ile
    //    çiz, çizilen HER bandın sol kenarı görünür aralığın SAĞ ucundan önce
    //    başlamalı (`wx < camera.x + W + PAR_KENAR`).
    r.paralaksKenar = (function (s) {
      try {
        if (!s.M('TERRAIN_PARALLAX_EXTENDED')) return true;
        const kam = { x: 12345, y: 300, zoom: 1, width: 390, height: 844 };
        const W = kam.width / kam.zoom;
        let disari = 0, ic = 0, tx = 0;
        const g = { addColorStop() {} };
        const c = {
          globalAlpha: 1, fillStyle: '',
          createLinearGradient() { return g; }, createRadialGradient() { return g; },
          save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {},
          moveTo() {}, lineTo() {},
          // ⚠ EŞİK SABİT (128 px) — `s.PAR_KENAR` ile kıyaslamak totoloji olurdu:
          //   pay büyütülürse test de kendiliğinden geçerdi (enjeksiyon testi
          //   bunu yakaladı). Hem çizilen bant hem de payın DEĞERİ sınanır.
          translate(x) { tx = x; if (x >= kam.x + W + 128) disari++; else ic++; }
        };
        s.paralaksCiz(c, kam, 'countryside');
        return disari === 0 && ic > 0 && s.PAR_KENAR <= 128;
      } catch (e) { return false; }
    })(this);

    // m) 🔴 HAVUZ: `_gorunur` kare başına YENİ dizi ayırmamalı.
    r.havuzGorunur = (function (s) {
      try {
        const kam = { x: 0, y: 0, zoom: 1, width: 390, height: 844 };
        s._gorunur('countryside', kam);
        const h1 = s._gorH;
        s._gorunur('countryside', kam);
        return !!h1 && s._gorH === h1 && /hepsi\.length = 0;/.test(String(s._gorunur));
      } catch (e) { return false; }
    })(this);

    r.allPass = Object.keys(r).every(k => k === 'allPass' || r[k] === true);
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.BaglaArazi = BaglaArazi;
  try {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', function () { setTimeout(function () { BaglaArazi.init(); }, 0); });
    } else {
      setTimeout(function () { BaglaArazi.init(); }, 0);
    }
  } catch (e) {}
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { BaglaArazi: BaglaArazi }; }
