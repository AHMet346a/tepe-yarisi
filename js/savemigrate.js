'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// SaveMigrate — versiyonlu kayıt göçü + bütünlük damgası (kendi kendine kurulur)
// ---------------------------------------------------------------------------
//  · Bu modül SaveData'ya (js/savedata.js) EK katmandır; onun iç yapısını
//    (localStorage anahtarı 'ahmet_save_v3', SaveData.data, SaveData.save())
//    değiştirmeden kullanır. SaveData'nın kendi _schemaVersion (3) sistemine
//    DOKUNMAZ — bunun yerine bağımsız 'saveVersion' alanını yönetir.
//  · AMAÇ:
//      (1) Güncellemeler eski kayıtları bozmasın: eksik/yeni alanları GÜVENLE
//          ekle, mevcut değerleri ASLA ezme.
//      (2) Bütünlük damgası: basit deterministik checksum ile kaydın elle
//          değişip değişmediğini SEZ (anti-hile DEĞİL — yalnızca uyarı).
//  · Kendi kendine kurulum: DOMContentLoaded'da SaveMigrate.run() çağrılır.
//    index.html'de savedata.js'den SONRA, main.js'den ÖNCE yüklendiği için bu
//    listener Main'inkinden ÖNCE kaydolur ve Main.init'ten önce koşar.
// ═══════════════════════════════════════════════════════════════════════════
const SaveMigrate = {

  // Bu modülün kayıt şeması sürümü. Yeni göç eklenince artır (_migrations'a da ekle).
  CURRENT_VERSION: 6,   // WIKI(3 Agu): 5 → 6 (parça tavanı nadirliğe bağlandı → kelepçe + iade)

  // ── v5 iadesi için ESKİ (ölü) UpgradeSystem maliyet tablosu ──────────────
  //   Bu tablo 3 Ağu'da js/economy.js'ten KALDIRILDI (o alt sistem canlı
  //   Economy yoluna kanalize edildi). Buradaki kopya YALNIZCA iade hesabı
  //   içindir — tek yaşayan kopyası budur, economy.js'te artık YOK.
  //   index = o seviyeye çıkmanın maliyeti (0 tabanlı: costs[0] = 1. seviye).
  _ESKI_UPG_COSTS: {
    engine:     [500, 1200, 2500, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1280000, 2560000, 5120000, 10240000, 20480000, 40960000, 81920000, 163840000, 327680000],
    suspension: [400, 950, 1900, 3800, 7500, 14803, 29217, 57666, 113816, 224640, 443375, 875095, 1727186, 3408969, 6728326, 13279784, 26210481, 51731964, 102104044, 201524067],
    tires:      [350, 800, 1650, 3200, 6500, 13203, 26818, 54473, 110646, 224745, 456504, 927255, 1883449, 3825679, 7770755, 15784030, 32060669, 65121930, 132276272, 268680798],
    fuel:       [300, 700, 1400, 2800, 5500, 10804, 21223, 41690, 81895, 160873, 316016, 620776, 1219441, 2395448, 4705575, 9243547, 18157858, 35668971, 70067488, 137639319],
    nitro:      [600, 1400, 2800, 5600, 11000, 21607, 42442, 83368, 163758, 321666, 631841, 1241110, 2437882, 4788672, 9406271, 18476508, 36292953, 71289360, 140031946, 275061326],
    armor:      [450, 1050, 2100, 4200, 8400, 16800, 33600, 67200, 134400, 268800, 537600, 1075200, 2150400, 4300800, 8601600, 17203200, 34406400, 68812800, 137625600, 275251200]
  },

  // Eski depodaki seviyelerin toplam altın karşılığı (saf fonksiyon — test edilebilir).
  eskiUpgToplam: function (store) {
    if (!store || typeof store !== 'object') return 0;
    var sum = 0;
    for (var vid in store) {
      if (!Object.prototype.hasOwnProperty.call(store, vid)) continue;
      var u = store[vid];
      if (!u || typeof u !== 'object') continue;
      for (var cat in u) {
        if (!Object.prototype.hasOwnProperty.call(u, cat)) continue;
        var tab = this._ESKI_UPG_COSTS[cat];
        if (!tab) continue;
        var lv = Number(u[cat]);
        if (!isFinite(lv) || lv <= 0) continue;
        lv = Math.min(tab.length, Math.floor(lv));
        for (var i = 0; i < lv; i++) sum += tab[i];
      }
    }
    return sum;
  },

  // SaveData içinde saklanan alan adları (SaveData'nın _schemaVersion'undan ayrı tutulur).
  _VERSION_FIELD: 'saveVersion',
  _SIG_FIELD: '_sig',

  // ── Sürüm sürüm göç fonksiyonları ──
  //   Anahtar = hedeflenen sürüm; fn(data) çağrıldığında data (v-1)'den v'ye taşınır.
  //   Her fonksiyon YALNIZCA eksik alanı ekler; var olan değeri KORUR.
  //   İmza sağlamlığı için sonraki sürümler { 2: fn, 3: fn, ... } biçiminde eklenir.
  _migrations: {
    // v0 → v1: gelecekteki modüllerin beklediği kapları güvenli varsayılanlarla ekle.
    1: function (data) {
      SaveMigrate._ensure(data, 'paintJobs', function () { return {}; });
      SaveMigrate._ensure(data, 'dailyQuests', function () { return null; });
      SaveMigrate._ensure(data, 'skillTree', function () { return {}; });
      SaveMigrate._ensure(data, 'blackMarket', function () { return null; });
      SaveMigrate._ensure(data, 'prestige', function () { return 0; });
    },

    // v1 → v2: yükseltme tavanı 20 → 50 oldu (vehicles.js UP_LEVEL_MAX / economy.js UP_MAX).
    // Yeni sistemde seviye ilerlemesi 0..19'a ölçekleniyor, yani 50. seviye = eski 20.
    // seviye gücü. Bu yüzden ESKİ seviyeler OLDUĞU GİBİ bırakılırsa oyuncunun gücü
    // DÜŞER (eski LV20 → yeni LV20 = tavanın ~%39'u). Burada seviyeleri güç
    // eşdeğerine taşıyoruz: yeni = 1 + (eski-1) * 49/19  →  güç birebir korunur.
    // (Örn: eski 20 → yeni 50, eski 10 → yeni ~24, eski 1 → 1.)
    2: function (data) {
      if (!data || !data.upgrades || typeof data.upgrades !== 'object') return;
      for (const vid in data.upgrades) {
        const u = data.upgrades[vid];
        if (!u || typeof u !== 'object') continue;
        for (const stat in u) {
          const old = Number(u[stat]);
          if (!isFinite(old) || old <= 1) continue;      // 1 ve altı: dokunma
          const scaled = Math.round(1 + (Math.min(20, old) - 1) * (49 / 19));
          u[stat] = Math.max(1, Math.min(50, scaled));
        }
      }
    },

    // v2 → v3: TÜM YÜKSELTMELERİ 1'E SIFIRLA (28 Tmz, kullanıcı isteği).
    // Gerekçe: yukarıdaki v2 göçü eski seviyeleri güç eşdeğerine ÖLÇEKLİYORDU
    // (eski LV10 → 24). Sonuç: oyuncu sıfırdan başladığını sanırken araçları
    // 24. seviyede görüyordu. İstenen davranış "her araç 1. seviyeden başlasın".
    // Bu göç bir kez çalışır ve kaydı istenen duruma çeker; v2 tarihsel kayıt
    // olarak yerinde bırakıldı (önce o koşsa bile sonuç yine 1 olur).
    // ⚠ Yükseltmeye harcanan altın İADE EDİLMEZ — bilinçli sadeleştirme.
    3: function (data) {
      if (!data || !data.upgrades || typeof data.upgrades !== 'object') return;
      for (const vid in data.upgrades) {
        const u = data.upgrades[vid];
        if (!u || typeof u !== 'object') continue;
        for (const stat in u) {
          u[stat] = 1;
        }
      }
    },

    // v3 → v4: TUNING(2 Agu) — YÜKSELTME TAVANI 50 → 25 (kullanıcı isteği).
    // Güç formülü normalize olduğu için (vehicles.js: b = (lv-1)*19/(UP_LEVEL_MAX-1))
    // yeni LV25 = eski LV50 = AYNI GÜÇ. Yani seviye başına etki 2,0417× arttı.
    // Eski seviyeleri OLDUĞU GİBİ bırakırsak oyuncunun gücü PATLAR (eski LV50 →
    // yeni sistemde de 50 okunur ama tavan 25'e kelepçelenir; arada kalan
    // LV26-49 değerleri ise ~2× fazla güç verir). Bu yüzden seviyeleri yarıya
    // indiriyoruz: yeni = ceil(eski / 2), [1,25] aralığına kelepçeli.
    //   eski 50 → 25 (güç birebir aynı) · eski 30 → 15 · eski 25 → 13 · eski 2 → 1
    // ⚠ 0 ve 1 DEĞİŞMEZ (v2 göçüyle aynı koruma) — 0 "hiç yükseltilmemiş" demektir,
    //   1'e çekersek yükseltme kaydı olmayan araç sahte seviye kazanır.
    // ⚠ Yükseltmeye harcanan altın İADE EDİLMEZ (v3 ile aynı bilinçli sadeleştirme).
    // 🔴 v2 ve v3 göçleri KORUNDU — silme; eski kayıtlar sırayla o basamaklardan geçer.
    4: function (data) {
      if (!data || !data.upgrades || typeof data.upgrades !== 'object') return;
      for (const vid in data.upgrades) {
        const u = data.upgrades[vid];
        if (!u || typeof u !== 'object') continue;
        for (const stat in u) {
          const old = Number(u[stat]);
          if (!isFinite(old) || old <= 1) continue;     // 0 ve 1: dokunma
          u[stat] = Math.max(1, Math.min(25, Math.ceil(old / 2)));
        }
      }
    },

    // v4 → v5: ÖLÜ `UpgradeSystem` DEPOSUNU İADE ET ve TEMİZLE (3 Ağu).
    // Gerekçe (ölçüm: port-araclari/duman-upgradesystem.js):
    //   economy.js'teki UpgradeSystem, `localStorage['ahmet_upgrades_v1']` adlı
    //   AYRI bir depoya yazıyor ve `SaveData.upgrades`'e hiç dokunmuyordu;
    //   ürettiği çarpanlar proje genelinde 0 kez okunuyordu → fiziğe sıfır etki.
    //   `purchase()` ise gerçek `SaveData.spendGold` çağırıyordu.
    //   Bu modül artık canlı Economy yoluna kanalize edildi; eski depo öksüz kaldı.
    // ▶ Öksüz depodaki seviyelerin ESKİ tablodaki karşılığı altın olarak İADE edilir,
    //   ardından anahtar `_iade_edildi` son ekiyle KENARA ALINIR (silinmez — kanıt).
    // ⚠ Seviyeler canlı `SaveData.upgrades`'e TAŞINMAZ: eski tabloda `nitro`/`armor`
    //   var, canlıda `gravity` var (6↔5 kategori uyuşmuyor) ve tavan 20↔25 farklı;
    //   eşleme uydurmak yerine parayı geri vermek tek kayıpsız yol.
    // 📏 Beklenen iade pratikte 0: `UpgradeUI` satın alma butonunu çizmek için
    //   tanımlanmamış `Economy.getCoins()` kullanıyordu (ilk commit'ten beri
    //   undefined → coins=0 → `.can-buy` hiç render edilmedi). Yine de göç,
    //   depoda ne varsa doğru hesaplar (savunmacı).
    5: function (data) {
      if (!data || typeof data !== 'object') return;
      if (data.upgV1Refund != null) return;             // ikinci kez iade YOK
      var store = null, raw = null;
      try {
        if (typeof localStorage === 'undefined' || !localStorage) return;
        raw = localStorage.getItem('ahmet_upgrades_v1');
        // ⚠ ROLLBACK DELİĞİ KAPATILDI: run() bir göç patlarsa TÜM veriyi geri sarar,
        //   ama localStorage yan etkisi geri sarılmaz. O durumda özgün anahtar
        //   taşınmış, `data.upgV1Refund` ise yok olmuştur → kenara aldığımız
        //   kopyadan devam et, iade KAYBOLMASIN.
        if (!raw) raw = localStorage.getItem('ahmet_upgrades_v1_iade_edildi');
        if (!raw) { data.upgV1Refund = 0; return; }     // depo hiç yok → iş bitti
        store = JSON.parse(raw);
      } catch (e) { return; }                            // okunamadı → SONRAKİ açılışta tekrar dene
      var iade = SaveMigrate.eskiUpgToplam(store);
      if (iade > 0) {
        var cur = Number(data.gold);
        data.gold = (isFinite(cur) ? cur : 0) + iade;
        console.warn('[SaveMigrate] Ölü yükseltme sistemi iadesi: +' + iade + ' altın.');
      }
      data.upgV1Refund = iade;
      // Anahtarı SİLME — kenara al (kanıt + kurtarma imkânı).
      try {
        localStorage.setItem('ahmet_upgrades_v1_iade_edildi', raw);
        localStorage.removeItem('ahmet_upgrades_v1');
      } catch (e2) {}
    },

    // v5 → v6: PARÇA SEVİYE TAVANI NADİRLİĞE BAĞLANDI (3 Ağu, wiki verisi).
    // Eskiden TEK sabit tavan vardı: Economy.PART_MAX_LEVEL = 20.
    // Artık wiki karşılığı olan 21 parçanın tavanı nadirliğinden gelir:
    //   Common 15 · Rare 10 · Epic 7 · Legendary 4 · Mythic 3
    // Eski kayıtta tavanı AŞAN seviyeler KELEPÇELENİR.
    // 🔴 "GÜÇ KAYBI OLMASIN" KURALI — iki katmanlı:
    //   1) Kelepçelenen parça YENİ TAVANDA kalır = o parçanın MAKSİMUM gücü.
    //      (Güç eğrisi de değişti: eski 1+(lv-1)*0,25 yerine wiki'nin ÖLÇÜLEN
    //       oranı kullanılıyor; yeni tavan = eğrinin tepesi, yani kayıp yok.)
    //   2) Silinen seviyelere ödenmiş ELMAS birebir İADE edilir
    //      (partUpgradeCost ile aynı formül: base + seviye*2).
    // ⚠ Economy yüklü değilse HİÇBİR ŞEY YAPMAZ ve sürümü yine de ilerletir;
    //   tavan bilgisi olmadan kelepçelemek veriyi bozardı. Kelepçe zaten
    //   Economy.upgradePart tarafında da uygulanır (çift emniyet).
    // ⚠ İKİNCİ KEZ ÇALIŞMAZ: `partClampRefund` alanı damga olarak kullanılır.
    6: function (data) {
      if (!data || typeof data !== 'object') return;
      if (data.partClampRefund != null) return;              // ikinci iade YOK
      var E = (typeof Economy !== 'undefined' && Economy) ? Economy : null;
      if (!E || !E.PARTS || typeof E.partMaxLevel !== 'function') return;
      var pl = data.partLevels;
      if (!pl || typeof pl !== 'object') { data.partClampRefund = 0; return; }
      var iade = 0, kelepce = 0;
      for (var id in pl) {
        if (!Object.prototype.hasOwnProperty.call(pl, id)) continue;
        var lv = Number(pl[id]);
        if (!isFinite(lv)) continue;
        var maks = E.partMaxLevel(id);
        if (!isFinite(maks) || lv <= maks) continue;
        // Silinen her seviyenin elmas bedelini geri ver (base + seviye*2).
        var base = (E.PARTS[id] && E.PARTS[id].diamondCost) || 3;
        for (var l = maks; l < lv; l++) iade += base + l * 2;
        pl[id] = maks;
        kelepce++;
      }
      if (iade > 0) {
        var cur = Number(data.diamonds);
        data.diamonds = (isFinite(cur) ? cur : 0) + iade;
        console.warn('[SaveMigrate] Parça tavanı kelepçesi: ' + kelepce +
                     ' parça, +' + iade + ' elmas iade edildi.');
      }
      data.partClampRefund = iade;
      data.partClampCount = kelepce;
    }
    // Gelecek göçler buraya: 7: function (data) { ... }
  },

  // ── Yardımcı: alan yoksa (undefined) güvenli varsayılanla ekle; varsa DOKUNMA ──
  //   null bilinçli bir değer olabileceğinden (örn dailyQuests:null), yalnızca
  //   Object.prototype.hasOwnProperty ile "hiç yok" durumunu doldururuz.
  _ensure: function (obj, key, factory) {
    if (!obj || typeof obj !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      obj[key] = factory();
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  BÜTÜNLÜK DAMGASI (checksum) — harici kütüphane YOK, kendi hash'imiz
  // ═══════════════════════════════════════════════════════════════════════════

  // Deterministik string hash (FNV-1a benzeri, 32-bit unsigned → hex string).
  // Aynı girdi her zaman aynı çıktıyı verir; JS motoru/platform farkından bağımsız.
  _hashString: function (str) {
    var h = 0x811c9dc5;               // FNV offset basis
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      // FNV prime (16777619) çarpımı — 32-bit taşmayı Math.imul ile güvene al.
      h = Math.imul(h, 0x01000193);
    }
    // İşaretsiz 32-bit'e çevir, sabit uzunlukta hex döndür.
    return (h >>> 0).toString(16).padStart(8, '0');
  },

  // Kaydın kararlı (anahtarları sıralı) JSON'unu üretir — imza alanının kendisi
  // ve oynamayan/oynak alanlar (_sig) hesaplama dışında bırakılır ki imza
  // kendi kendine bağımlı olmasın.
  _canonicalize: function (value) {
    var self = this;
    if (value === null || typeof value !== 'object') {
      // İlkel değerler: JSON.stringify undefined→undefined, sayılar/stringler stabil.
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      var parts = [];
      for (var i = 0; i < value.length; i++) {
        var pv = self._canonicalize(value[i]);
        parts.push(pv === undefined ? 'null' : pv);
      }
      return '[' + parts.join(',') + ']';
    }
    var keys = Object.keys(value).sort();
    var out = [];
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (key === self._SIG_FIELD) continue;   // imzanın kendisini hesaba katma
      var cv = self._canonicalize(value[key]);
      if (cv === undefined) continue;           // undefined alanları atla (JSON gibi)
      out.push(JSON.stringify(key) + ':' + cv);
    }
    return '{' + out.join(',') + '}';
  },

  // Verilen data objesi için imza (checksum) hesapla.
  computeSignature: function (data) {
    try {
      return this._hashString(this._canonicalize(data));
    } catch (e) {
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  ANA AKIŞ
  // ═══════════════════════════════════════════════════════════════════════════

  run: function () {
    // Guard: SaveData yoksa ya da yüklü değilse sessizce çık.
    if (typeof SaveData === 'undefined' || !SaveData) return;

    try {
      var data = SaveData.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;

      // ── 1) Bütünlük denetimi (YÜKLEME anı): mevcut imza ile yeniden hesaplananı karşılaştır ──
      //    Uyuşmazsa yalnızca uyar. Veriyi silme/engelleme YOK.
      try {
        var storedSig = data[this._SIG_FIELD];
        if (typeof storedSig === 'string' && storedSig.length > 0) {
          var recomputed = this.computeSignature(data);
          if (recomputed && recomputed !== storedSig) {
            console.warn('[SaveMigrate] Bütünlük damgası uyuşmuyor — kayıt elle değişmiş olabilir. ' +
                         '(beklenen: ' + storedSig + ', hesaplanan: ' + recomputed + ') ' +
                         'Oyun engellenmedi, veri korunuyor.');
          }
        }
      } catch (sigErr) {
        console.warn('[SaveMigrate] Bütünlük denetimi atlandı:', sigErr && sigErr.message);
      }

      // ── 2) Versiyonlu göç ──
      var fromVersion = Number(data[this._VERSION_FIELD]);
      if (!isFinite(fromVersion) || fromVersion < 0) fromVersion = 0;   // alan yoksa 0 varsay

      var applied = 0;
      if (fromVersion < this.CURRENT_VERSION) {
        // Göçleri sürüm sürüm, sıralı uygula. Bir tanesi patlarsa TÜM işlemi geri sar
        // (kaydı yarım-göç bozuk halde bırakma) — orijinali koru.
        var working;
        try {
          working = JSON.parse(JSON.stringify(data));   // güvenli çalışma kopyası
        } catch (cloneErr) {
          working = data;   // klonlanamıyorsa yerinde çalış (yine de _ensure ezmez)
        }

        for (var v = fromVersion + 1; v <= this.CURRENT_VERSION; v++) {
          var fn = this._migrations[v];
          if (typeof fn === 'function') {
            fn(working);   // her göç yalnızca EKSİK alanı ekler
            applied++;
          }
        }
        working[this._VERSION_FIELD] = this.CURRENT_VERSION;

        // Başarılıysa çalışma kopyasını canlı objeye yansıt (referansı koru).
        if (working !== data) {
          for (var key in working) {
            if (Object.prototype.hasOwnProperty.call(working, key)) {
              data[key] = working[key];
            }
          }
        }
      } else {
        // Zaten güncel; yine de sürüm alanını sabitle.
        data[this._VERSION_FIELD] = this.CURRENT_VERSION;
      }

      // ── 3) Yeni imzayı yaz (göç sonrası nihai duruma göre) ──
      var newSig = this.computeSignature(data);
      if (newSig) data[this._SIG_FIELD] = newSig;

      // ── 4) Kalıcılaştır ──
      if (typeof SaveData.save === 'function') {
        SaveData.save();
      }

      if (applied > 0) {
        console.log('[SaveMigrate] Kayıt göçü tamamlandı: v' + fromVersion + ' → v' +
                    this.CURRENT_VERSION + ' (' + applied + ' göç uygulandı).');
      }
    } catch (e) {
      // Göç hata verirse kaydı BOZMA — olduğu gibi bırak, yalnızca logla.
      console.warn('[SaveMigrate] Göç sırasında hata; kayıt değiştirilmeden bırakıldı:',
                   e && e.message ? e.message : e);
    }
  }
};

// ── KENDİ KENDİNE KURULUM ──
// savedata.js zaten yüklü olacak (bu script ondan sonra gelir). main.js'den önce
// yüklendiğimizden bu DOMContentLoaded listener'ı Main'inkinden ÖNCE kaydolur.
(function () {
  function _boot() {
    if (typeof SaveData === 'undefined' || !SaveData) return;   // guard: yoksa sessizce çık
    // SaveData.load() Main.init içinde çağrılıyorsa data henüz null olabilir;
    // o durumda burada yüklemeyi tetiklemeden, yalnızca data mevcutsa çalış.
    // Main, SaveData.load()'u DOMContentLoaded içinde bizden SONRA çağırırsa
    // data null'dır; bu yüzden data hazır değilse yükleyip öyle göç et.
    if (!SaveData.data && typeof SaveData.load === 'function') {
      try { SaveData.load(); } catch (e) { /* yükleme SaveData'nın kendi sorunu; sessiz geç */ }
    }
    SaveMigrate.run();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    // Script defer/geç yüklendiyse DOM zaten hazır — hemen koş.
    _boot();
  }
})();

window.SaveMigrate = SaveMigrate;
