'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// CAREER — Aşamalı kariyer yolculuğu. Bölümler (chapters) sırayla açılır; her
// bölümün 1-3 hedefi vardır. Tüm hedefler tamamlanınca ödül talep edilir ve
// sonraki bölüm açılır. İlerleme kendine-yeten (SaveData 'career' anahtarı).
// ═══════════════════════════════════════════════════════════════════════════
const Career = {
  // ── Bölüm tanımları ───────────────────────────────────────────────────────
  // objective.type: dist_run, dist_map, dist_total, flips_total, flips_combo,
  //   coins_total, airtime_total, own_vehicles, speed, no_damage, mode, maps_played
  STAGES: [
    { id:'c1',  name:'İlk Sürüş',        icon:'🚗', desc:'Yolculuğa başla',
      objectives:[ {type:'dist_run', target:1500, label:'Tek turda 1.500m'} ],
      reward:{ gold:800, scrap:5 } },
    { id:'c2',  name:'Takla Çırağı',      icon:'🤸', desc:'Havada dön',
      objectives:[ {type:'flips_total', target:10, label:'Toplam 10 takla'}, {type:'dist_run', target:2500, label:'Tek turda 2.500m'} ],
      reward:{ gold:1200, scrap:8 } },
    { id:'c3',  name:'Altın Avcısı',      icon:'⧆', desc:'Altın topla',
      objectives:[ {type:'coins_total', target:300, label:'Toplam 300 altın'} ],
      reward:{ gold:1500, diamonds:2 } },
    { id:'c4',  name:'Kırsal Kâşif',      icon:'🌾', desc:'Kırsalı fethet',
      objectives:[ {type:'dist_map', map:'countryside', target:4000, label:'Kırsalda 4.000m'} ],
      reward:{ gold:1800, scrap:10 } },
    { id:'c5',  name:'Garaj Sahibi',      icon:'🔧', desc:'Filonu büyüt',
      objectives:[ {type:'own_vehicles', target:3, label:'3 araca sahip ol'} ],
      reward:{ gold:2200, part:'coin_magnet' } },
    { id:'c6',  name:'Çöl Fırtınası',     icon:'🏜️', desc:'Çölü geç',
      objectives:[ {type:'dist_map', map:'desert', target:4500, label:'Çölde 4.500m'}, {type:'flips_total', target:30, label:'Toplam 30 takla'} ],
      reward:{ gold:2600, scrap:12 } },
    { id:'c7',  name:'Hava Cambazı',      icon:'🪂', desc:'Uzun uç',
      objectives:[ {type:'airtime_total', target:30, label:'Toplam 30sn havada'} ],
      reward:{ gold:3000, diamonds:3 } },
    { id:'c8',  name:'Kombo Ustası',      icon:'🎯', desc:'Zincirle',
      objectives:[ {type:'flips_combo', target:3, label:'Tek zıplamada 3 takla'} ],
      reward:{ gold:3200, part:'combo_master' } },
    { id:'c9',  name:'Kış Yolcusu',       icon:'❄️', desc:'Karda sür',
      objectives:[ {type:'dist_map', map:'winter', target:5000, label:'Kışta 5.000m'} ],
      reward:{ gold:3600, scrap:15 } },
    { id:'c10', name:'Coin Rush',         icon:'🪙', desc:'Süreyle yarış',
      objectives:[ {type:'mode', mode:'coinrush', label:'Coin Rush modunu bitir'} ],
      reward:{ gold:4000, diamonds:4 } },
    { id:'c11', name:'Hız Tutkunu',       icon:'⚡', desc:'Hızlan',
      objectives:[ {type:'speed', target:600, label:'600 hıza ulaş'}, {type:'dist_run', target:7000, label:'Tek turda 7.000m'} ],
      reward:{ gold:4500, scrap:18 } },
    { id:'c12', name:'Koleksiyoncu',      icon:'🏆', desc:'Filonu genişlet',
      objectives:[ {type:'own_vehicles', target:6, label:'6 araca sahip ol'} ],
      reward:{ gold:5000, part:'turbo' } },
    { id:'c13', name:'Şehir Kaçağı',      icon:'🏙️', desc:'Şehirde uç',
      objectives:[ {type:'dist_map', map:'city', target:5500, label:'Şehirde 5.500m'} ],
      reward:{ gold:5500, diamonds:5 } },
    { id:'c14', name:'Hasarsız Sürücü',   icon:'🛡️', desc:'Temiz sür',
      objectives:[ {type:'no_damage', target:4000, label:'Hasarsız 4.000m'} ],
      reward:{ gold:6000, scrap:22 } },
    { id:'c15', name:'Gezgin',            icon:'🗺️', desc:'Dünyayı keşfet',
      objectives:[ {type:'maps_played', target:8, label:'8 farklı harita oyna'} ],
      reward:{ gold:6500, diamonds:6 } },
    { id:'c16', name:'Kızıl Gezegen',     icon:'🔴', desc:'Mars’ta sür',
      objectives:[ {type:'dist_map', map:'mars', target:6000, label:'Mars’ta 6.000m'}, {type:'flips_combo', target:4, label:'Tek zıplamada 4 takla'} ],
      reward:{ gold:7000, part:'air_master' } },
    { id:'c17', name:'Checkpoint Şampiyonu', icon:'🚩', desc:'Kontrol noktaları',
      objectives:[ {type:'mode', mode:'checkpoint', label:'Checkpoint modunu bitir'} ],
      reward:{ gold:7500, diamonds:7 } },
    { id:'c18', name:'Milyon Takla',      icon:'🌀', desc:'Sürekli dön',
      objectives:[ {type:'flips_total', target:300, label:'Toplam 300 takla'} ],
      reward:{ gold:8000, scrap:28 } },
    { id:'c19', name:'Servet',            icon:'💰', desc:'Zengin ol',
      objectives:[ {type:'coins_total', target:5000, label:'Toplam 5.000 altın'} ],
      reward:{ gold:9000, diamonds:8 } },
    { id:'c20', name:'Ay Yürüyüşü',       icon:'🌙', desc:'Düşük yerçekimi',
      objectives:[ {type:'dist_map', map:'moon', target:7000, label:'Ay’da 7.000m'} ],
      reward:{ gold:10000, part:'fuel_tank' } },
    { id:'c21', name:'Yakıt Krizi',       icon:'⛽', desc:'İdareli sür',
      objectives:[ {type:'mode', mode:'fueltrial', label:'Fuel Trial modunu bitir'} ],
      reward:{ gold:11000, diamonds:9 } },
    { id:'c22', name:'Stratosfer',        icon:'🚀', desc:'Yükseğe uç',
      objectives:[ {type:'airtime_total', target:120, label:'Toplam 120sn havada'}, {type:'speed', target:800, label:'800 hıza ulaş'} ],
      reward:{ gold:12000, scrap:35 } },
    { id:'c23', name:'Usta Koleksiyoncu', icon:'🏅', desc:'Büyük filo',
      objectives:[ {type:'own_vehicles', target:12, label:'12 araca sahip ol'} ],
      reward:{ gold:14000, diamonds:10 } },
    { id:'c24', name:'Kargo Kaptanı',     icon:'📦', desc:'Teslim et',
      objectives:[ {type:'mode', mode:'delivery', label:'Delivery modunu bitir'} ],
      reward:{ gold:15000, part:'roll_cage' } },
    { id:'c25', name:'Yanardağ',          icon:'🌋', desc:'Lavdan geç',
      objectives:[ {type:'dist_map', map:'volcano', target:8000, label:'Yanardağda 8.000m'} ],
      reward:{ gold:16000, diamonds:12 } },
    { id:'c26', name:'Maraton',           icon:'🏁', desc:'Uzun mesafe',
      objectives:[ {type:'dist_run', target:15000, label:'Tek turda 15.000m'} ],
      reward:{ gold:18000, scrap:45 } },
    { id:'c27', name:'Sakura Ustası',     icon:'🌸', desc:'Kiraz çiçeği',
      objectives:[ {type:'dist_map', map:'sakura', target:9000, label:'Sakura’da 9.000m'}, {type:'no_damage', target:6000, label:'Hasarsız 6.000m'} ],
      reward:{ gold:20000, diamonds:14 } },
    { id:'c28', name:'Dünya Turu',        icon:'🌍', desc:'Her yeri gör',
      objectives:[ {type:'maps_played', target:20, label:'20 farklı harita oyna'} ],
      reward:{ gold:22000, diamonds:16 } },
    { id:'c29', name:'Efsane Filo',       icon:'👑', desc:'Devasa koleksiyon',
      objectives:[ {type:'own_vehicles', target:25, label:'25 araca sahip ol'} ],
      reward:{ gold:26000, diamonds:20 } },
    { id:'c30', name:'Kombo Efsanesi',    icon:'💥', desc:'Sınırı zorla',
      objectives:[ {type:'flips_combo', target:6, label:'Tek zıplamada 6 takla'}, {type:'airtime_total', target:300, label:'Toplam 300sn havada'} ],
      reward:{ gold:30000, diamonds:25, scrap:60 } },
    { id:'c31', name:'Milyoner',          icon:'🤑', desc:'Zirveye çık',
      objectives:[ {type:'coins_total', target:50000, label:'Toplam 50.000 altın'}, {type:'dist_total', target:500000, label:'Toplam 500.000m yol'} ],
      reward:{ gold:40000, diamonds:35 } },
    { id:'c32', name:'HCR Efsanesi',      icon:'🌟', desc:'Ustalığın zirvesi',
      objectives:[ {type:'own_vehicles', target:40, label:'40 araca sahip ol'}, {type:'speed', target:1000, label:'1000 hıza ulaş'}, {type:'dist_run', target:30000, label:'Tek turda 30.000m'} ],
      reward:{ gold:75000, diamonds:60, scrap:120 } }
  ],

  // ── Kalıcı durum (SaveData 'career') ──────────────────────────────────────
  _state() {
    let s = (typeof SaveData !== 'undefined' && SaveData.get) ? SaveData.get('career') : null;
    if (!s || typeof s !== 'object') s = {};
    if (typeof s.claimed !== 'object' || !s.claimed) s.claimed = {};
    s.dist       = s.dist       || 0;   // kümülatif mesafe
    s.flips      = s.flips      || 0;   // kümülatif takla
    s.coins      = s.coins      || 0;   // kümülatif altın
    s.airtime    = s.airtime    || 0;   // kümülatif hava süresi
    s.bestRun    = s.bestRun    || 0;   // en iyi tek-tur mesafe
    s.bestSpeed  = s.bestSpeed  || 0;   // en yüksek hız
    s.bestCombo  = s.bestCombo  || 0;   // en iyi kombo
    s.noDmgBest  = s.noDmgBest  || 0;   // en iyi hasarsız mesafe
    if (typeof s.modes !== 'object' || !s.modes) s.modes = {};      // tamamlanan modlar
    if (typeof s.mapBest !== 'object' || !s.mapBest) s.mapBest = {}; // harita başına en iyi
    if (typeof s.mapsPlayed !== 'object' || !s.mapsPlayed) s.mapsPlayed = {}; // oynanan haritalar
    return s;
  },
  _save(s) { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('career', s); },

  // ── Koşu sonrası ilerleme güncelle ────────────────────────────────────────
  // stats: { dist, mapId, vehicleId, flips, combo, coins, airtime, speed, noDamage, mode, modeFinished }
  checkRun(stats) {
    if (!stats) return;
    const s = this._state();
    const d = Math.max(0, stats.dist || 0);
    s.dist    += d;
    s.flips   += Math.max(0, stats.flips || 0);
    s.coins   += Math.max(0, stats.coins || 0);
    s.airtime += Math.max(0, stats.airtime || 0);
    s.bestRun   = Math.max(s.bestRun, d);
    s.bestSpeed = Math.max(s.bestSpeed, Math.max(0, stats.speed || 0));
    s.bestCombo = Math.max(s.bestCombo, Math.max(0, stats.combo || 0));
    if (stats.noDamage) s.noDmgBest = Math.max(s.noDmgBest, d);
    if (stats.mapId) {
      s.mapBest[stats.mapId] = Math.max(s.mapBest[stats.mapId] || 0, d);
      s.mapsPlayed[stats.mapId] = 1;
    }
    if (stats.mode && stats.modeFinished && stats.mode !== 'normal') s.modes[stats.mode] = 1;
    this._save(s);
  },

  _ownedCount() {
    if (typeof SaveData === 'undefined' || !SaveData.get) return 1;
    const o = SaveData.get('ownedVehicles');
    return (Array.isArray(o) ? o.length : 1);
  },

  // ── Tek bir hedefin ilerlemesi → {cur, target, done} ──────────────────────
  objProgress(obj) {
    const s = this._state();
    let cur = 0, target = obj.target || 1;
    switch (obj.type) {
      case 'dist_run':     cur = s.bestRun; break;
      case 'dist_total':   cur = s.dist; break;
      case 'dist_map':     cur = s.mapBest[obj.map] || 0; break;
      case 'flips_total':  cur = s.flips; break;
      case 'flips_combo':  cur = s.bestCombo; break;
      case 'coins_total':  cur = s.coins; break;
      case 'airtime_total':cur = s.airtime; break;
      case 'own_vehicles': cur = this._ownedCount(); break;
      case 'speed':        cur = s.bestSpeed; break;
      case 'no_damage':    cur = s.noDmgBest; break;
      case 'maps_played':  cur = Object.keys(s.mapsPlayed).length; break;
      case 'mode':         cur = s.modes[obj.mode] ? 1 : 0; target = 1; break;
      default: cur = 0;
    }
    return { cur: Math.floor(cur), target: target, done: cur >= target };
  },

  // ── Bölüm durumu ──────────────────────────────────────────────────────────
  stageObjectivesDone(stageIndex) {
    const st = this.STAGES[stageIndex]; if (!st) return false;
    return st.objectives.every(o => this.objProgress(o).done);
  },
  isClaimed(stageIndex) {
    const st = this.STAGES[stageIndex]; if (!st) return false;
    return !!this._state().claimed[st.id];
  },
  // Bir bölüm "kilitli değil" ise: ilk bölüm ya da önceki bölüm talep edilmiş
  isUnlocked(stageIndex) {
    if (stageIndex <= 0) return true;
    return this.isClaimed(stageIndex - 1);
  },
  // Oyuncunun şu an odaklandığı bölüm (ilk talep-edilmemiş açık bölüm)
  currentIndex() {
    for (let i = 0; i < this.STAGES.length; i++) {
      if (this.isUnlocked(i) && !this.isClaimed(i)) return i;
    }
    return this.STAGES.length - 1;
  },
  claimedCount() {
    const c = this._state().claimed; let n = 0;
    for (const k in c) if (c[k]) n++;
    return n;
  },
  canClaim(stageIndex) {
    return this.isUnlocked(stageIndex) && !this.isClaimed(stageIndex) && this.stageObjectivesDone(stageIndex);
  },

  // ── Ödül talep et → ödül objesini döndürür (yoksa null) ───────────────────
  claim(stageIndex) {
    if (!this.canClaim(stageIndex)) return null;
    const st = this.STAGES[stageIndex];
    const r = st.reward || {};
    const s = this._state();
    if (typeof SaveData !== 'undefined') {
      if (r.gold     && SaveData.addGold)      SaveData.addGold(r.gold);
      if (r.diamonds && SaveData.addDiamonds)  SaveData.addDiamonds(r.diamonds);
      if (r.scrap    && SaveData.addScrap)     SaveData.addScrap(r.scrap);
      if (r.vehicle  && SaveData.unlockVehicle)SaveData.unlockVehicle(r.vehicle);
      if (r.part     && SaveData.addPart)      SaveData.addPart(r.part);
    }
    s.claimed[st.id] = 1;
    this._save(s);
    return r;
  },

  // Talep edilebilir (rozet) bölüm sayısı — menü bildirimi için
  claimableCount() {
    let n = 0;
    for (let i = 0; i < this.STAGES.length; i++) if (this.canClaim(i)) n++;
    return n;
  }
};

if (typeof window !== 'undefined') window.Career = Career;
if (typeof module !== 'undefined' && module.exports) module.exports = Career;
