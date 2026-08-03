'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN — Hikaye / Kampanya sistemi (kendi kendine yeten modül)
// ---------------------------------------------------------------------------
//  · 10 BÖLÜM (chapter). Her bölümde 3-5 GÖREV + sonunda bir BOSS meydan okuması.
//  · Her görevin bir HEDEFİ (mesafe / takla / altın / hava süresi / hız) ve bir
//    ÖDÜLÜ (altın / elmas / araç / parça / scrap) + kısa HİKAYE metni vardır.
//  · İlerleme SaveData'da ('campaign' anahtarı) saklanır — localStorage KULLANILMAZ.
//  · Bölüm kilidi: bir önceki bölümün TÜM görevleri + boss'u bitince açılır.
//  · Görev/boss tamamlanınca ödül OTOMATİK verilir (koşu-sonu checkRun içinde).
//
//  Genel API (main.js / ui.js buna bağlanır):
//    Campaign.draw(ctx, W, H)     — kampanya ekranını çizer (bölüm listesi + detay)
//    Campaign.handleClick(x, y)   — tıklama (kendi buton kutularıyla); handled → true
//    Campaign.checkRun(stats)     — koşu sonunda ilerlemeyi günceller & ödül verir
//    Campaign.startMission(ci,mi) — Game ile görevi başlatır (mi='boss' → boss)
//    Campaign.completedCount()    — tamamlanan görev sayısı (menü rozeti için)
//    Campaign.totalMissions()     — toplam görev sayısı
// ═══════════════════════════════════════════════════════════════════════════
const Campaign = {

  // ── Tema renkleri (oyunun koyu / turuncu paleti) ──────────────────────────
  C: {
    accent:  '#ff7a1a',   // ana vurgu turuncu
    accent2: '#ffb020',   // ikincil turuncu / altın
    gold:    '#ffcf3f',
    cyan:    '#4fd0ff',
    green:   '#7cf39a',
    diamond: '#4fd0ff',
    dim:     'rgba(190,200,225,0.62)',
    lock:    'rgba(120,130,170,0.55)',
    panelHi: 'rgba(30,24,14,0.94)',
    panelLo: 'rgba(15,12,7,0.94)'
  },

  // ── BÖLÜM & GÖREV TANIMLARI ───────────────────────────────────────────────
  //   obj.type: dist | flips | coins | airtime | speed  (tek koşuda hedef)
  //   m.map: oynanacak harita id'si  ·  m.mode: oyun modu (varsayılan 'normal')
  //   reward: { gold, diamonds, scrap, vehicle, part }
  CHAPTERS: [
    {
      id:'ch1', name:'İlk Kıvılcım', icon:'🌾', accent:'#8bd66a',
      story:'Tozlu kırsal yollarda motorunu ilk kez çalıştırıyorsun. Efsane olmak için herkes gibi buradan başladı.',
      missions:[
        { id:'m1_1', name:'İlk Turlar', map:'countryside', story:'Gaza bas ve tekerleklerin dönsün.',
          obj:{type:'dist', target:800}, reward:{ gold:400, scrap:3 } },
        { id:'m1_2', name:'Havalan', map:'countryside', story:'İlk tepeden atla, biraz hava al.',
          obj:{type:'flips', target:2}, reward:{ gold:500, scrap:4 } },
        { id:'m1_3', name:'Bozuk Para', map:'countryside', story:'Yol boyunca saçılan altınları topla.',
          obj:{type:'coins', target:18}, reward:{ gold:600, part:'coin_magnet' } }
      ],
      boss:{ id:'m1_boss', name:'BOSS: Kırsal Kralı', map:'countryside',
        story:'Köyün en hızlısı sana meydan okuyor. Onu geçmek için sonuna kadar git.',
        obj:{type:'dist', target:1600}, reward:{ gold:1200, diamonds:2, vehicle:'tractor' } }
    },
    {
      id:'ch2', name:'Çöl Geçidi', icon:'🏜️', accent:'#e8b25a',
      story:'Kavurucu kum tepeleri seni bekliyor. Motor ısınıyor, ama pes etmek yok.',
      missions:[
        { id:'m2_1', name:'Kum Sörfü', map:'desert', story:'Yumuşak kumda dengeni koru.',
          obj:{type:'dist', target:1500}, reward:{ gold:700, scrap:5 } },
        { id:'m2_2', name:'Çöl Akrobatı', map:'desert', story:'Dev dünlerden uçarak takla at.',
          obj:{type:'flips', target:4}, reward:{ gold:800, scrap:6 } },
        { id:'m2_3', name:'Uçuş Zamanı', map:'desert', story:'Havada olabildiğince uzun kal.',
          obj:{type:'airtime', target:4}, reward:{ gold:900, part:'spring' } }
      ],
      boss:{ id:'m2_boss', name:'BOSS: Kum Fırtınası', map:'desert',
        story:'Ufukta bir toz bulutu... İçinden geçip 2.400m ötedeki vahaya ulaş.',
        obj:{type:'dist', target:2400}, reward:{ gold:1600, diamonds:3, vehicle:'dunebuggy' } }
    },
    {
      id:'ch3', name:'Karlı Zirveler', icon:'❄️', accent:'#8ad4ef',
      story:'Buz gibi rüzgar yüzünü kesiyor. Kaygan yollar en usta sürücüleri bile sınar.',
      missions:[
        { id:'m3_1', name:'Buzda Tutunma', map:'winter', story:'Kaymadan mesafe kat et.',
          obj:{type:'dist', target:2000}, reward:{ gold:900, scrap:6 } },
        { id:'m3_2', name:'Kar Bulutu', map:'winter', story:'Karları savurarak altın topla.',
          obj:{type:'coins', target:30}, reward:{ gold:1000, scrap:7 } },
        { id:'m3_3', name:'Çığ Kaçışı', map:'winter', story:'Hız kesme — zirveden hızla in.',
          obj:{type:'speed', target:420}, reward:{ gold:1100, part:'nitro' } }
      ],
      boss:{ id:'m3_boss', name:'BOSS: Zirve Bekçisi', map:'winter',
        story:'Dağın tepesinde seni bekleyen efsaneyi geçmek için 3.000m sür.',
        obj:{type:'dist', target:3000}, reward:{ gold:2000, diamonds:4, vehicle:'snowmobile' } }
    },
    {
      id:'ch4', name:'Sahil Rüzgarı', icon:'🏖️', accent:'#ffd76a',
      story:'Dalgaların sesi ve sıcak kum... Ama rehavete kapılma, rakiplerin uyumuyor.',
      missions:[
        { id:'m4_1', name:'Sahil Turu', map:'beach', story:'Islak kumda hızını koru.',
          obj:{type:'dist', target:2500}, reward:{ gold:1100, scrap:7 } },
        { id:'m4_2', name:'Dalga Atlayışı', map:'beach', story:'Kayalardan atlayıp takla at.',
          obj:{type:'flips', target:6}, reward:{ gold:1200, scrap:8 } },
        { id:'m4_3', name:'Martı Dansı', map:'beach', story:'Uzun süre havada süzül.',
          obj:{type:'airtime', target:6}, reward:{ gold:1300, part:'wing' } }
      ],
      boss:{ id:'m4_boss', name:'BOSS: Gelgit Efendisi', map:'beach',
        story:'Yükselen sular seni kovalıyor — 3.400m öteye kaçmadan yakalanma.',
        obj:{type:'dist', target:3400}, reward:{ gold:2600, diamonds:4, vehicle:'rallycar' } }
    },
    {
      id:'ch5', name:'Dağ Tırmanışı', icon:'⛰️', accent:'#b9a07a',
      story:'Sarp kayalıklar ve nefes kesen uçurumlar. Bir hata pahalıya patlar.',
      missions:[
        { id:'m5_1', name:'Sarp Yamaç', map:'mountains', story:'Dik yokuşta motorunu zorla.',
          obj:{type:'dist', target:3000}, reward:{ gold:1400, scrap:9 } },
        { id:'m5_2', name:'Uçurum Atlayışı', map:'mountains', story:'Boşlukları uçarak geç.',
          obj:{type:'airtime', target:8}, reward:{ gold:1500, scrap:10 } },
        { id:'m5_3', name:'Zirve Serveti', map:'mountains', story:'Yolun üstündeki altınları kap.',
          obj:{type:'coins', target:45}, reward:{ gold:1600, part:'turbo' } }
      ],
      boss:{ id:'m5_boss', name:'BOSS: Dağ Devi', map:'mountains',
        story:'Zirvedeki dev, aşağı bakıp gülüyor. 4.000m sür ve onu sustur.',
        obj:{type:'dist', target:4000}, reward:{ gold:3200, diamonds:5, vehicle:'monster' } }
    },
    {
      id:'ch6', name:'Şehir Kaçışı', icon:'🏙️', accent:'#7fb0ff',
      story:'Neon ışıklar ve dar sokaklar. Şehir gece hızlı sürenleri sever.',
      missions:[
        { id:'m6_1', name:'Gece Sürüşü', map:'city', story:'Trafiği yararak ilerle.',
          obj:{type:'dist', target:3500}, reward:{ gold:1700, scrap:10 } },
        { id:'m6_2', name:'Çatı Atlayışı', map:'city', story:'Rampalardan uçup takla at.',
          obj:{type:'flips', target:8}, reward:{ gold:1800, scrap:11 } },
        { id:'m6_3', name:'Hız Tuzağı', map:'city', story:'Radarları hızınla geç.',
          obj:{type:'speed', target:520}, reward:{ gold:1900, part:'air_master' } }
      ],
      boss:{ id:'m6_boss', name:'BOSS: Sokak Efsanesi', map:'city',
        story:'Şehrin gölge sürücüsü ışıkları söndürdü. 4.600m git ve fenerlerini yak.',
        obj:{type:'dist', target:4600}, reward:{ gold:3800, diamonds:6, vehicle:'racecar' } }
    },
    {
      id:'ch7', name:'Vahşi Orman', icon:'🌴', accent:'#66c07a',
      story:'Sarmaşıklar, çamur ve gizli patikalar. Doğa burada kuralları koyar.',
      missions:[
        { id:'m7_1', name:'Çamur Savaşı', map:'jungle', story:'Batak yolda momentumu kaybetme.',
          obj:{type:'dist', target:4000}, reward:{ gold:2000, scrap:12 } },
        { id:'m7_2', name:'Liana Uçuşu', map:'jungle', story:'Ağaç köprülerinden atla.',
          obj:{type:'airtime', target:10}, reward:{ gold:2100, scrap:13 } },
        { id:'m7_3', name:'Hazine Avı', map:'jungle', story:'Kayıp altınları topla.',
          obj:{type:'coins', target:60}, reward:{ gold:2300, part:'roll_cage' } }
      ],
      boss:{ id:'m7_boss', name:'BOSS: Orman Bekçisi', map:'jungle',
        story:'Devasa kökler yolu kapatıyor. 5.200m sür ve ormanın kalbine ulaş.',
        obj:{type:'dist', target:5200}, reward:{ gold:4400, diamonds:7, vehicle:'tank' } }
    },
    {
      id:'ch8', name:'Buz Krallığı', icon:'🧊', accent:'#7ee6ff',
      story:'Sonsuz beyazlık ve çatlayan buz. Burada hata affetmez, ısı sıfırın altında.',
      missions:[
        { id:'m8_1', name:'Buzul Geçidi', map:'arctic', story:'Çatlayan buzda hızlı ol.',
          obj:{type:'dist', target:4500}, reward:{ gold:2400, scrap:14 } },
        { id:'m8_2', name:'Kutup Akrobasisi', map:'arctic', story:'Buz rampalarında takla at.',
          obj:{type:'flips', target:10}, reward:{ gold:2600, scrap:15 } },
        { id:'m8_3', name:'Donmuş Hız', map:'arctic', story:'Kaygan zeminde hıza ulaş.',
          obj:{type:'speed', target:600}, reward:{ gold:2800, part:'nitro' } }
      ],
      boss:{ id:'m8_boss', name:'BOSS: Buz Kraliçesi', map:'arctic',
        story:'Buzdan taht seni izliyor. 6.000m sür ve krallığı fethet.',
        obj:{type:'dist', target:6000}, reward:{ gold:5200, diamonds:9, vehicle:'formula' } }
    },
    {
      id:'ch9', name:'Yanardağ Çukuru', icon:'🌋', accent:'#ff6a3a',
      story:'Lav akıyor, yer sarsılıyor. Cehennemin kapısında gaz pedalı tek dostun.',
      missions:[
        { id:'m9_1', name:'Lav Kaçışı', map:'volcano', story:'Yükselen lavdan önce geç.',
          obj:{type:'dist', target:5000}, reward:{ gold:3000, scrap:16 } },
        { id:'m9_2', name:'Ateş Sıçraması', map:'volcano', story:'Lav gölleri üstünden uç.',
          obj:{type:'airtime', target:12}, reward:{ gold:3200, scrap:18 } },
        { id:'m9_3', name:'Kızgın Altın', map:'volcano', story:'Erimiş altınları topla.',
          obj:{type:'coins', target:75}, reward:{ gold:3400, part:'turbo' } }
      ],
      boss:{ id:'m9_boss', name:'BOSS: Magma Titanı', map:'volcano',
        story:'Lavdan yükselen titan yolunu kesti. 7.000m sür ve onu geride bırak.',
        obj:{type:'dist', target:7000}, reward:{ gold:6500, diamonds:11, vehicle:'supercar' } }
    },
    {
      id:'ch10', name:'Kızıl Gezegen', icon:'🔴', accent:'#ff4d4d',
      story:'Son durak: Mars. Düşük yerçekimi, kızıl fırtınalar ve efsanenin zirvesi. Kara Sürücü seni bekliyor.',
      missions:[
        { id:'m10_1', name:'Düşük Yerçekimi', map:'mars', story:'Uzayda uçarcasına sür.',
          obj:{type:'dist', target:6000}, reward:{ gold:3800, scrap:20 } },
        { id:'m10_2', name:'Yıldız Taklası', map:'mars', story:'Sonsuz havada takla üstüne takla.',
          obj:{type:'flips', target:14}, reward:{ gold:4200, scrap:22 } },
        { id:'m10_3', name:'Kozmik Hız', map:'mars', story:'Işık gibi hızlan.',
          obj:{type:'speed', target:700}, reward:{ gold:4600, diamonds:6 } },
        { id:'m10_4', name:'Gezegen Serveti', map:'mars', story:'Marslı altınları süpür.',
          obj:{type:'coins', target:90}, reward:{ gold:5000, part:'air_master' } }
      ],
      boss:{ id:'m10_boss', name:'BOSS: Kara Sürücü', map:'mars',
        story:'Yolculuğunun sonu. Kara Sürücü’yü geçmek için 9.000m sür ve EFSANE ol.',
        obj:{type:'dist', target:9000}, reward:{ gold:15000, diamonds:25, vehicle:'bugatti' } }
    }
  ],

  // ── Kalıcı durum (SaveData 'campaign') ────────────────────────────────────
  _state() {
    let s = (typeof SaveData !== 'undefined' && SaveData.get) ? SaveData.get('campaign') : null;
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
    if (!s.done || typeof s.done !== 'object' || Array.isArray(s.done)) s.done = {};   // { missionId: 1 }
    if (!s.best || typeof s.best !== 'object' || Array.isArray(s.best)) s.best = {};   // { missionId: enIyiDeger }
    return s;
  },
  _save(s) { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('campaign', s); },

  // ── Tüm görevleri (boss dahil) düz liste olarak döndür ────────────────────
  _missionsOf(ci) {
    const ch = this.CHAPTERS[ci];
    if (!ch) return [];
    const list = (ch.missions || []).slice();
    if (ch.boss) list.push(ch.boss);
    return list;
  },

  // ── Durum sorguları ───────────────────────────────────────────────────────
  isMissionDone(id) { return !!this._state().done[id]; },

  chapterComplete(ci) {
    const list = this._missionsOf(ci);
    if (!list.length) return false;
    for (let i = 0; i < list.length; i++) if (!this.isMissionDone(list[i].id)) return false;
    return true;
  },

  // Bölüm kilidi: ilk bölüm daima açık; sonrası önceki bölüm tamamlanınca açılır.
  isChapterUnlocked(ci) {
    if (ci <= 0) return true;
    return this.chapterComplete(ci - 1);
  },

  // Boss kilidi: bölümün tüm normal görevleri bitince açılır.
  isBossUnlocked(ci) {
    const ch = this.CHAPTERS[ci];
    if (!ch) return false;
    const ms = ch.missions || [];
    for (let i = 0; i < ms.length; i++) if (!this.isMissionDone(ms[i].id)) return false;
    return true;
  },

  // Bir görevin oynanabilir olması: bölüm açık + (boss ise boss kilidi de açık).
  isMissionPlayable(ci, isBoss) {
    if (!this.isChapterUnlocked(ci)) return false;
    if (isBoss) return this.isBossUnlocked(ci);
    return true;
  },

  // Tek bir görev için ilerleme → { cur, target, done }
  missionProgress(m) {
    if (!m || !m.obj) return { cur:0, target:1, done:false };
    const target = m.obj.target || 1;
    const cur = Math.max(0, Number(this._state().best[m.id]) || 0);
    const done = this.isMissionDone(m.id);
    return { cur: Math.floor(cur), target: target, done: done };
  },

  // Koşu istatistiğinden ilgili hedef değerini çek.
  _statValue(type, stats) {
    switch (type) {
      case 'dist':    return Math.max(0, stats.dist    || 0);
      case 'flips':   return Math.max(0, stats.flips   || 0);
      case 'coins':   return Math.max(0, stats.coins   || 0);
      case 'airtime': return Math.max(0, stats.airtime || 0);
      case 'speed':   return Math.max(0, stats.speed   || 0);
      default:        return 0;
    }
  },

  // ── Koşu sonrası ilerleme güncelle + ödül ver ─────────────────────────────
  //   stats: { dist, flips, coins, airtime, speed, mapId, mode, ... }
  //   Döndürür: tamamlanan görevlerin listesi (varsa) — yoksa boş dizi.
  checkRun(stats) {
    if (!stats || typeof stats !== 'object') return [];
    const s = this._state();
    const completed = [];
    const mapId = stats.mapId;

    for (let ci = 0; ci < this.CHAPTERS.length; ci++) {
      if (!this.isChapterUnlocked(ci)) continue;
      const list = this._missionsOf(ci);
      for (let mi = 0; mi < list.length; mi++) {
        const m = list[mi];
        const isBoss = (this.CHAPTERS[ci].boss && m.id === this.CHAPTERS[ci].boss.id);
        if (!this.isMissionPlayable(ci, isBoss)) continue;   // henüz açılmamış görevi sayma
        if (m.map && mapId && m.map !== mapId) continue;     // yanlış harita → bu koşu saymaz
        if (m.mode && stats.mode && m.mode !== stats.mode) continue;

        const val = this._statValue(m.obj.type, stats);
        // En iyi denemeyi kaydet (ilerleme çubuğu için)
        if (val > (Number(s.best[m.id]) || 0)) s.best[m.id] = val;

        if (!s.done[m.id] && val >= (m.obj.target || 1)) {
          s.done[m.id] = 1;
          this._grantReward(m.reward);
          completed.push(m);
        }
      }
    }

    this._save(s);

    // Geri bildirim (guarded)
    if (completed.length) {
      try {
        if (typeof Audio !== 'undefined') {
          if (Audio.playModeWin) Audio.playModeWin();
          else if (Audio.playTierUp) Audio.playTierUp();
        }
        if (typeof UI !== 'undefined' && UI.showToast) {
          const last = completed[completed.length - 1];
          UI.showToast('📖 Görev tamam: ' + (last.name || 'Kampanya') + '!');
        }
      } catch (e) {}
    }
    return completed;
  },

  _grantReward(r) {
    if (!r || typeof SaveData === 'undefined') return;
    try {
      if (r.gold     && SaveData.addGold)       SaveData.addGold(r.gold);
      if (r.diamonds && SaveData.addDiamonds)   SaveData.addDiamonds(r.diamonds);
      if (r.scrap    && SaveData.addScrap)      SaveData.addScrap(r.scrap);
      if (r.vehicle  && SaveData.unlockVehicle) SaveData.unlockVehicle(r.vehicle);
      if (r.part     && SaveData.addPart)       SaveData.addPart(r.part);
    } catch (e) {}
  },

  // Menü rozeti / özet için sayaçlar
  totalMissions() {
    let n = 0;
    for (let ci = 0; ci < this.CHAPTERS.length; ci++) n += this._missionsOf(ci).length;
    return n;
  },
  completedCount() {
    const done = this._state().done;
    let n = 0;
    for (const k in done) if (done[k]) n++;
    return n;
  },

  // ── Görevi başlat (Game ile) ──────────────────────────────────────────────
  //   startMission(ci, mi)  ·  mi = görev indeksi  ·  mi === 'boss' → boss.
  startMission(ci, mi) {
    const ch = this.CHAPTERS[ci];
    if (!ch) return false;
    const isBoss = (mi === 'boss' || mi === -1);
    const m = isBoss ? ch.boss : (ch.missions || [])[mi];
    if (!m) return false;
    if (!this.isMissionPlayable(ci, isBoss)) {
      if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🔒 Bu görev henüz kilitli.');
      return false;
    }
    this._active = { ci: ci, id: m.id };   // koşu sonrası bağlam (bilgi amaçlı)

    const veh  = (typeof SaveData !== 'undefined' && SaveData.get('selectedVehicle')) || 'jeep';
    const map  = m.map || 'countryside';
    const mode = m.mode || 'normal';

    // Game.gameMode string olarak modu tutar; startRun bunu korur.
    if (typeof Game !== 'undefined') Game.gameMode = mode;

    // Tercihen Main._startGame (setMode('game') + Game.startRun + oyuncu kaydı).
    if (typeof Main !== 'undefined' && Main._startGame) {
      Main._startGame(veh, map, false);
    } else if (typeof Game !== 'undefined' && Game.startRun) {
      if (typeof Main !== 'undefined' && Main.setMode) Main.setMode('game');
      // startRun'ın 3. argümanı botMode (boolean); mod zaten Game.gameMode ile ayarlandı.
      Game.startRun(veh, map, mode === 'race');
    }
    return true;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GÖRÜNÜM  (kendi çizimi + kendi buton kutuları + kendi kaydırması)
  //   İki alt-görünüm:  'list'   → bölüm listesi
  //                     'detail' → seçili bölümün görevleri + boss
  // ═══════════════════════════════════════════════════════════════════════════
  _view: 'list',      // 'list' | 'detail'
  _openChapter: 0,    // detay görünümündeki bölüm
  _scroll: 0,         // dikey kaydırma ofseti
  _maxScroll: 0,
  _btns: [],          // { id, x, y, w, h }
  _inputHooked: false,

  draw(ctx, W, H) {
    this._ensureInput();
    this._btns = [];

    // ── Arka plan (koyu dikey gradyan + hafif turuncu ışıma) ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#141017');
    bg.addColorStop(0.5, '#0d0b12');
    bg.addColorStop(1, '#08070c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 60, 10, W / 2, 60, W * 0.7);
    glow.addColorStop(0, 'rgba(255,122,26,0.12)');
    glow.addColorStop(1, 'rgba(255,122,26,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    if (this._view === 'detail') this._drawDetail(ctx, W, H);
    else                         this._drawList(ctx, W, H);

    // ── Üst başlık şeridi + geri butonu (her iki görünümde) ──
    this._drawHeader(ctx, W);
    // ── Kaydırma göstergesi ──
    this._drawScrollbar(ctx, W, H);
  },

  _drawHeader(ctx, W) {
    // Başlık paneli
    const hb = ctx.createLinearGradient(0, 0, 0, 52);
    hb.addColorStop(0, 'rgba(20,16,10,0.96)');
    hb.addColorStop(1, 'rgba(20,16,10,0)');
    ctx.fillStyle = hb;
    ctx.fillRect(0, 0, W, 56);

    // Geri butonu
    this._roundRect(ctx, 8, 8, 44, 40, 10);
    ctx.fillStyle = 'rgba(30,24,14,0.95)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,122,26,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = this.C.accent2; ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹', 30, 27);
    this._btns.push({ id: 'back', x: 8, y: 8, w: 44, h: 40 });

    // Başlık metni
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 17px Arial';
    const title = this._view === 'detail'
      ? (this.CHAPTERS[this._openChapter] ? this.CHAPTERS[this._openChapter].name : 'Bölüm')
      : '📖  KAMPANYA';
    ctx.fillText(title, W / 2, 28);
  },

  // ── BÖLÜM LİSTESİ ──────────────────────────────────────────────────────────
  _drawList(ctx, W, H) {
    const total = this.CHAPTERS.length;
    const doneMissions = this.completedCount();
    const allMissions  = this.totalMissions();

    // Üst özet çipi
    const sy = 62, sh = 30;
    this._card(ctx, 12, sy, W - 24, sh, this.C.accent, true);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.C.accent2; ctx.font = 'bold 11px Arial';
    ctx.fillText('📖 ' + doneMissions + ' / ' + allMissions + ' görev tamamlandı', 24, sy + sh / 2);
    // ilerleme çubuğu
    const pbx = W - 12 - 120, pbw = 108, pby = sy + sh / 2 - 4;
    this._roundRect(ctx, pbx, pby, pbw, 8, 4); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
    const frac = allMissions > 0 ? doneMissions / allMissions : 0;
    this._roundRect(ctx, pbx, pby, Math.max(4, pbw * frac), 8, 4);
    ctx.fillStyle = this.C.accent; ctx.fill();

    // Liste alanı (kırpma + kaydırma)
    const viewTop = sy + sh + 8;
    const viewH = Math.max(60, H - viewTop - 6);
    const rowH = 74, gap = 10;
    const contentH = total * (rowH + gap);
    this._maxScroll = Math.max(0, contentH - viewH);
    this._scroll = Math.max(0, Math.min(this._maxScroll, this._scroll || 0));
    this._scrollView = { top: viewTop, h: viewH };

    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();

    for (let ci = 0; ci < total; ci++) {
      const ch = this.CHAPTERS[ci];
      const y = viewTop + ci * (rowH + gap) - this._scroll;
      if (y + rowH <= viewTop || y >= viewTop + viewH) continue;   // ekran dışını atla

      const unlocked = this.isChapterUnlocked(ci);
      const complete = this.chapterComplete(ci);
      const acc = complete ? this.C.green : unlocked ? (ch.accent || this.C.accent) : this.C.lock;

      this._card(ctx, 12, y, W - 24, rowH, acc, unlocked, complete);

      // İkon rozeti
      ctx.save();
      ctx.globalAlpha = unlocked ? 1 : 0.4;
      this._roundRect(ctx, 22, y + 15, 44, 44, 11);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
      ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText(ch.icon || '📖', 44, y + 37);
      ctx.restore();

      // Başlık + görev sayısı
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = unlocked ? '#fff' : 'rgba(170,180,220,0.5)';
      ctx.font = 'bold 14px Arial';
      ctx.fillText((ci + 1) + '. ' + (ch.name || 'Bölüm'), 78, y + 20);

      // Kısa hikaye
      ctx.fillStyle = 'rgba(190,200,225,0.6)'; ctx.font = '9px Arial';
      ctx.fillText(this._clip(ctx, ch.story || '', W - 24 - 78 - 44), 78, y + 37);

      if (!unlocked) {
        ctx.textAlign = 'right'; ctx.font = '18px Arial'; ctx.fillStyle = this.C.lock;
        ctx.fillText('🔒', W - 26, y + 37);
        // önceki bölümü bitir ipucu
        ctx.textAlign = 'left'; ctx.font = '8px Arial'; ctx.fillStyle = 'rgba(170,180,220,0.45)';
        ctx.fillText('Önceki bölümü tamamla', 78, y + 52);
        continue;
      }

      // Bölüm ilerleme çubuğu (görev bazlı)
      const list = this._missionsOf(ci);
      let dn = 0;
      for (let k = 0; k < list.length; k++) if (this.isMissionDone(list[k].id)) dn++;
      const bx = 78, bw = W - 24 - 78 - 74, by = y + 50;
      this._roundRect(ctx, bx, by, bw, 7, 3); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      this._roundRect(ctx, bx, by, Math.max(4, bw * (dn / list.length)), 7, 3);
      ctx.fillStyle = acc; ctx.fill();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = complete ? this.C.green : this.C.accent2; ctx.font = 'bold 9px Arial';
      ctx.fillText(dn + '/' + list.length, bx + bw + 6, by + 4);

      // "AÇ" oku / tamamlandı işareti
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      if (complete) { ctx.fillStyle = this.C.green; ctx.font = 'bold 16px Arial'; ctx.fillText('✓', W - 28, y + 22); }
      else          { ctx.fillStyle = acc;         ctx.font = 'bold 20px Arial'; ctx.fillText('›', W - 28, y + 22); }

      // Tüm kart tıklanabilir → detay
      this._btns.push({ id: 'open|' + ci, x: 12, y: y, w: W - 24, h: rowH });
    }
    ctx.restore();

    if (total === 0) {
      ctx.fillStyle = this.C.dim; ctx.font = '13px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Kampanya yükleniyor...', W / 2, H / 2);
    }
  },

  // ── BÖLÜM DETAYI (görevler + boss) ──────────────────────────────────────────
  _drawDetail(ctx, W, H) {
    const ci = this._openChapter;
    const ch = this.CHAPTERS[ci];
    if (!ch) { this._view = 'list'; return; }

    const viewTop = 58;
    const viewH = Math.max(60, H - viewTop - 6);
    this._scrollView = { top: viewTop, h: viewH };

    // İçerik yüksekliğini önce ölç (kaydırma için)
    const missions = ch.missions || [];
    const storyH = 46;
    const missH = 78, gap = 9, bossH = 96;
    const contentH = storyH + missions.length * (missH + gap) + gap + bossH + 12;
    this._maxScroll = Math.max(0, contentH - viewH);
    this._scroll = Math.max(0, Math.min(this._maxScroll, this._scroll || 0));

    ctx.save();
    ctx.beginPath(); ctx.rect(0, viewTop, W, viewH); ctx.clip();
    let y = viewTop - this._scroll + 4;

    // Bölüm hikaye kartı
    this._card(ctx, 12, y, W - 24, storyH, ch.accent || this.C.accent, true);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = this.C.accent2; ctx.font = 'bold 10px Arial';
    ctx.fillText((ch.icon || '📖') + '  HİKAYE', 22, y + 8);
    ctx.fillStyle = 'rgba(210,215,235,0.8)'; ctx.font = '9px Arial';
    this._wrap(ctx, ch.story || '', 22, y + 22, W - 44, 12, 2);
    y += storyH + gap;

    // Görevler
    for (let mi = 0; mi < missions.length; mi++) {
      y = this._drawMissionCard(ctx, W, y, missH, ci, missions[mi], mi, false);
      y += gap;
    }

    // Boss
    y += 3;
    if (ch.boss) y = this._drawMissionCard(ctx, W, y, bossH, ci, ch.boss, 'boss', true);

    ctx.restore();
  },

  // Tek görev / boss kartı çizer → yeni y döndürür
  _drawMissionCard(ctx, W, y, h, ci, m, mi, isBoss) {
    const done = this.isMissionDone(m.id);
    const playable = this.isMissionPlayable(ci, isBoss);
    const pr = this.missionProgress(m);
    const acc = done ? this.C.green
              : !playable ? this.C.lock
              : isBoss ? '#ff5a3a'
              : (this.CHAPTERS[ci].accent || this.C.accent);

    this._card(ctx, 12, y, W - 24, h, acc, playable, done, isBoss && playable && !done);

    // İkon / etiket
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = acc; ctx.font = 'bold 9px Arial';
    ctx.fillText(isBoss ? '👑 BOSS' : ('GÖREV ' + (mi + 1)), 22, y + 9);

    // Başlık
    ctx.fillStyle = playable ? '#fff' : 'rgba(170,180,220,0.5)';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(this._clip(ctx, m.name || 'Görev', W - 44 - 60), 22, y + 21);

    if (!playable) {
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '17px Arial'; ctx.fillStyle = this.C.lock;
      ctx.fillText('🔒', W - 26, y + 22);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '8px Arial'; ctx.fillStyle = 'rgba(170,180,220,0.45)';
      ctx.fillText(isBoss ? 'Önce tüm görevleri bitir' : 'Kilitli', 22, y + 40);
      return y + h;
    }

    // Hikaye satırı
    ctx.fillStyle = 'rgba(200,208,230,0.62)'; ctx.font = '8.5px Arial';
    ctx.fillText(this._clip(ctx, m.story || '', W - 44), 22, y + 39);

    // Hedef + ilerleme
    const label = this._objLabel(m.obj);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = done ? this.C.green : 'rgba(215,222,245,0.85)'; ctx.font = 'bold 9.5px Arial';
    ctx.fillText((done ? '✓ ' : '🎯 ') + label, 22, y + 52);
    ctx.textAlign = 'right';
    ctx.fillStyle = done ? this.C.green : this.C.accent2; ctx.font = 'bold 9.5px Arial';
    ctx.fillText(pr.cur + ' / ' + pr.target, W - 22, y + 52);
    const bx = 22, bw = W - 44, by = y + 65;
    this._roundRect(ctx, bx, by, bw, 6, 3); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
    const p = Math.max(0, Math.min(1, pr.target > 0 ? pr.cur / pr.target : 0));
    this._roundRect(ctx, bx, by, Math.max(3, bw * p), 6, 3);
    ctx.fillStyle = done ? this.C.green : acc; ctx.fill();

    // Ödül metni
    const rw = this._rewardText(m.reward);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,207,63,0.6)'; ctx.font = 'bold 8px Arial';
    ctx.fillText('ÖDÜL', 22, y + (isBoss ? 78 : 74) - (isBoss ? 0 : 0));

    if (isBoss) {
      ctx.fillStyle = this.C.gold; ctx.font = 'bold 10px Arial';
      ctx.fillText(rw, 56, y + 78);
    } else {
      ctx.fillStyle = this.C.gold; ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(this._clip(ctx, rw, 140), W - 100, y + 74 + 3);
    }

    // OYNA / MEYDAN OKU butonu
    if (!done) {
      const bw2 = isBoss ? 130 : 76, bh2 = isBoss ? 30 : 26;
      const bx2 = W - 22 - bw2, by2 = isBoss ? (y + h - bh2 - 8) : (y + 46);
      this._pill(ctx, bx2, by2, bw2, bh2, isBoss ? '⚔ MEYDAN OKU' : '▶ OYNA', acc);
      this._btns.push({ id: 'play|' + ci + '|' + mi, x: bx2, y: by2, w: bw2, h: bh2 });
    } else {
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillStyle = this.C.green; ctx.font = 'bold 10px Arial';
      ctx.fillText('✓ TAMAM', W - 22, y + (isBoss ? 78 : 20));
    }

    return y + h;
  },

  // ── Tıklama işleme (kendi buton kutularıyla) ──────────────────────────────
  //   handled ise true döner. (Sürükleme yapıldıysa tıklamayı yutar.)
  handleClick(x, y) {
    if (this._dragMoved) { this._dragMoved = false; return true; }
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this._onButton(b.id);
        return true;
      }
    }
    return false;
  },

  _onButton(id) {
    if (id === 'back') {
      if (this._view === 'detail') { this._view = 'list'; this._scroll = 0; }
      else if (typeof UI !== 'undefined' && UI.goTo) UI.goTo('menu');
      return;
    }
    if (id.indexOf('open|') === 0) {
      const ci = parseInt(id.slice(5), 10) || 0;
      if (!this.isChapterUnlocked(ci)) {
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('🔒 Önce önceki bölümü tamamla.');
        return;
      }
      this._openChapter = ci; this._view = 'detail'; this._scroll = 0;
      return;
    }
    if (id.indexOf('play|') === 0) {
      const parts = id.split('|');
      const ci = parseInt(parts[1], 10) || 0;
      const mi = (parts[2] === 'boss') ? 'boss' : (parseInt(parts[2], 10) || 0);
      this.startMission(ci, mi);
      return;
    }
  },

  // ── Girdi: fare tekerleği + sürükleyerek kaydırma (kendi listener'ları) ────
  _ensureInput() {
    if (this._inputHooked) return;
    const cv = (typeof UI !== 'undefined' && UI.canvas) ? UI.canvas
             : (typeof Main !== 'undefined' && Main.canvas) ? Main.canvas : null;
    if (!cv) return;
    this._inputHooked = true;
    const active = () => (typeof UI !== 'undefined' && UI.currentScreen === 'campaign');
    const pt = (e, touch) => {
      const r = cv.getBoundingClientRect();
      const src = touch ? (e.touches[0] || e.changedTouches[0]) : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };

    cv.addEventListener('wheel', (e) => {
      if (!active() || this._maxScroll <= 0) return;
      e.preventDefault();
      const step = Math.max(50, Math.round((this._scrollView ? this._scrollView.h : 300) * 0.32));
      this._scroll = Math.max(0, Math.min(this._maxScroll, (this._scroll || 0) + (e.deltaY > 0 ? step : -step)));
    }, { passive: false });

    const down = (e, touch) => {
      if (!active()) return;
      const p = pt(e, touch);
      this._drag = { y: p.y, start: this._scroll || 0 };
      this._dragMoved = false;
    };
    const move = (e, touch) => {
      if (!active() || !this._drag) return;
      const p = pt(e, touch);
      const dy = p.y - this._drag.y;
      if (Math.abs(dy) > 6) this._dragMoved = true;
      if (this._maxScroll > 0) {
        if (touch) e.preventDefault();
        this._scroll = Math.max(0, Math.min(this._maxScroll, this._drag.start - dy));
      }
    };
    const up = () => { this._drag = null; };

    cv.addEventListener('mousedown', (e) => down(e, false));
    cv.addEventListener('mousemove', (e) => move(e, false));
    window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', (e) => down(e, true), { passive: false });
    cv.addEventListener('touchmove', (e) => move(e, true), { passive: false });
    window.addEventListener('touchend', up);
  },

  // ── Küçük çizim yardımcıları (tamamen self-contained) ─────────────────────
  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  _card(ctx, x, y, w, h, accent, active, complete, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = accent; ctx.shadowBlur = 12; }
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, active ? this.C.panelHi : 'rgba(22,24,34,0.9)');
    g.addColorStop(1, active ? this.C.panelLo : 'rgba(12,13,20,0.9)');
    this._roundRect(ctx, x, y, w, h, 11);
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    // sol vurgu şeridi
    ctx.save();
    this._roundRect(ctx, x, y, w, h, 11); ctx.clip();
    ctx.fillStyle = accent; ctx.globalAlpha = complete ? 0.95 : (active ? 0.9 : 0.4);
    ctx.fillRect(x, y, 4, h);
    ctx.restore();
    // kenarlık
    this._roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 11);
    ctx.strokeStyle = active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1; ctx.stroke();
  },

  _pill(ctx, x, y, w, h, label, accent) {
    ctx.save();
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, accent);
    g.addColorStop(1, this._shade(accent, -0.28));
    this._roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#1a1206'; ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    ctx.restore();
  },

  _drawScrollbar(ctx, W, H) {
    if (!this._scrollView || this._maxScroll <= 0) return;
    const v = this._scrollView;
    const trackX = W - 5, trackY = v.top + 2, trackH = v.h - 4;
    this._roundRect(ctx, trackX, trackY, 3, trackH, 2);
    ctx.fillStyle = 'rgba(20,18,26,0.6)'; ctx.fill();
    const frac = Math.max(0.08, Math.min(1, v.h / (v.h + this._maxScroll)));
    const thumbH = Math.max(22, trackH * frac);
    const thumbY = trackY + (trackH - thumbH) * (this._scroll / this._maxScroll);
    this._roundRect(ctx, trackX, thumbY, 3, thumbH, 2);
    ctx.fillStyle = 'rgba(255,122,26,0.75)'; ctx.fill();
  },

  _objLabel(obj) {
    if (!obj) return 'Hedef';
    const t = obj.target || 0;
    switch (obj.type) {
      case 'dist':    return 'Tek turda ' + t.toLocaleString() + 'm git';
      case 'flips':   return t + ' takla at';
      case 'coins':   return t + ' altın topla';
      case 'airtime': return t + ' sn havada kal';
      case 'speed':   return t + ' hıza ulaş';
      default:        return 'Hedefe ulaş';
    }
  },

  _rewardText(r) {
    if (!r) return '—';
    const parts = [];
    if (r.gold)     parts.push('⧆ ' + r.gold.toLocaleString());
    if (r.diamonds) parts.push('◆ ' + r.diamonds);
    if (r.scrap)    parts.push('◈ ' + r.scrap);
    if (r.vehicle)  parts.push('🚗 ' + r.vehicle);
    if (r.part)     parts.push('🔩 ' + r.part);
    return parts.join('  ') || '—';
  },

  // Metni verilen genişliğe sığacak şekilde kırp (…)
  _clip(ctx, text, maxW) {
    text = String(text || '');
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  },

  // Basit kelime sarma (en fazla maxLines satır)
  _wrap(ctx, text, x, y, maxW, lineH, maxLines) {
    const words = String(text || '').split(' ');
    let line = '', ln = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line ? (line + ' ' + words[i]) : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y + ln * lineH);
        ln++; line = words[i];
        if (ln >= maxLines - 1) {
          // kalan metni son satıra kırparak yaz
          let rest = words.slice(i).join(' ');
          ctx.fillText(this._clip(ctx, rest, maxW), x, y + ln * lineH);
          return;
        }
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, y + ln * lineH);
  },

  // Bir hex rengi koyulaştır / açar (factor: -1..1)
  _shade(hex, factor) {
    hex = String(hex || '#ff7a1a').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    const adj = (c) => {
      c = factor < 0 ? c * (1 + factor) : c + (255 - c) * factor;
      return Math.max(0, Math.min(255, Math.round(c)));
    };
    r = adj(r); g = adj(g); b = adj(b);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
};

if (typeof window !== 'undefined') window.Campaign = Campaign;
if (typeof module !== 'undefined' && module.exports) module.exports = Campaign;
