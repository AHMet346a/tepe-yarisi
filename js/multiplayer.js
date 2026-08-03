'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLAYER — Async HAYALET çok oyunculu (yerel havuz katmanı)
// Her tur bir hayalet olarak saklanır; sonraki turda rakip hayaletlere yarışırsın.
// (Firebase adaptörü sonradan eklenince aynı arayüzle gerçek oyunculara açılır.)
// ═══════════════════════════════════════════════════════════════════════════
const Multiplayer = {
  KEY: 'ahmet_ghost_pool_v1',
  MAX_PER_MAP: 12,
  GHOST_COLORS: ['#ff5bd0', '#5bd0ff', '#a0ff5b', '#ffb05b', '#c05bff', '#ff5b6e'],
  NAMES: ['Kaan','Zeynep','Mert','Elif','Burak','Deniz','Ada','Emir','Ceren','Arda',
          'Yusuf','Ece','Baran','Nil','Toprak','Su','Poyraz','Defne','Aras','Mira',
          'Kerem','İpek','Sarp','Lara','Efe','Nehir','Bora','Yağmur','Doruk','Melis',
          'Alp','Sena','Kuzey','Duru','Çınar','Ela','Tuna','Beren','Ozan','Zümra'],

  // İsimlere karakter katan takı/lakaplar (yerel havuza çeşitlilik) ──
  TAGS: ['', '', '', '_TR', 'X', 'Pro', '99', '_07', 'GG', 'HD', '.exe', '_v2', 'YT'],
  // Rütbeler — hayaletin mesafesine göre gösterilecek seviye rozeti
  RANKS: [
    { min: 0,     name: 'Çaylak',   tier: 'bronze', icon: '🔰' },
    { min: 1500,  name: 'Sürücü',   tier: 'bronze', icon: '🚗' },
    { min: 3000,  name: 'Usta',     tier: 'silver', icon: '⭐' },
    { min: 6000,  name: 'Uzman',    tier: 'silver', icon: '🥈' },
    { min: 10000, name: 'Şampiyon', tier: 'gold',   icon: '🏆' },
    { min: 18000, name: 'Efsane',   tier: 'gold',   icon: '👑' }
  ],
  // Renk paletiyle eşleşen okunur etiketler (arayüz/rozet için)
  COLOR_NAMES: ['Pembe','Mavi','Yeşil','Turuncu','Mor','Kırmızı'],

  // Ek isim havuzu — yerel hayalet çeşitliliğini büyütür (özgün, tekrarsız)
  NAMES2: ['Rüzgar','Kartal','Işık','Gökçe','Barış','Selin','Tunç','Deren','Ferhat','Yaren',
           'Meriç','Sinan','Gizem','Onur','Berkay','Aylin','Kağan','Simge','Volkan','Naz',
           'Emre','Damla','Serkan','Pelin','Cem','Aslı','Umut','Ceyda','Sarper','Öykü',
           'Tolga','Ilgın','Batu','Şeyma','Kayra','Derin','Atlas','Roda','Egemen','Yankı'],
  // Üçüncü isim havuzu — hayalet çeşitliliğini iyice büyütür (özgün, tekrarsız) ──
  NAMES3: ['Alperen','Bade','Cansu','Doğa','Ekin','Ferda','Gökhan','Hazal','Iraz','Jülide',
           'Kağan','Lidya','Miraç','Nazlı','Oğuz','Pınar','Reyhan','Sıla','Tarık','Ulaş',
           'Vural','Yaman','Zeliha','Aybars','Bilge','Cömert','Dilara','Erdem','Filiz','Görkem',
           'Halit','Işıl','Kıvanç','Levent','Metehan','Nevra','Orkun','Petek','Rüya','Savaş',
           'Tümer','Utku','Varol','Yıldız','Zafer','Aycan','Berkin','Cengiz','Devrim','Ege'],
  // Dördüncü isim havuzu — hayalet çeşitliliğini en geniş hâline taşır (özgün, tekrarsız) ──
  NAMES4: ['Aytaç','Bahadır','Cihan','Demir','Ediz','Fikret','Gürkan','Hakan','İlke','Kadir',
           'Lokman','Murat','Necati','Okan','Ömer','Rıdvan','Sadık','Şahin','Taner','Uğur',
           'Ünal','Vedat','Yavuz','Zeki','Aysu','Buse','Cemre','Dide','Esra','Feryal',
           'Gonca','Hande','İrem','Jale','Kübra','Leyla','Merve','Nisan','Oya','Perihan'],
  // Beşinci isim havuzu — çeşitliliği en geniş sınıra taşır (özgün, tüm havuzlara göre tekrarsız) ──
  NAMES5: ['Akın','Bulut','Ceylan','Dağhan','Ergün','Fırat','Gökberk','Handan','İlkay','Kaya',
           'Lale','Mavi','Neva','Oktay','Pusat','Rojin','Sedef','Turgay','Ufuk','Vefa',
           'Yağız','Zerrin','Asena','Berk','Civan','Doğan','Eylül','Ferit','Güneş','Hakkı'],
  // Altıncı isim havuzu — çeşitliliği daha da genişletir (özgün, tüm havuzlara göre tekrarsız) ──
  NAMES6: ['Tan','Sami','Bengü','Erk','Ferhan','Gülce','Hilal','Işın','Kutay','Melih',
           'Nazan','Selim','Tuğçe','Uras','Yılmaz','Zeynel','Aybüke','Berfin','Ceyhun','Derya',
           'Ekrem','Fadıl','Gökay','Halil','İlkin','Kemal','Latif','Mete','Nedim','Sanem'],
  // Yedinci isim havuzu — çeşitliliği en geniş sınıra taşır (özgün, tüm havuzlara göre tekrarsız) ──
  NAMES7: ['Altay','Boran','Çağan','Devran','Erhan','Fethi','Günay','Hümeyra','İnci','Korhan',
           'Lütfü','Mazlum','Nuray','Orhan','Pamir','Reşat','Seçkin','Tayfun','Uzay','Veli',
           'Yalçın','Zülal','Asaf','Beste','Coşkun','Dilek','Ecrin','Fahri','Gökdeniz','Haluk',
           'Kıraç','Sezai'],
  // Hayaletlere kişilik/beceriye göre atanan simge (emoji) süsleri — yerel gösteriş ──
  FLAIR_BY_PROFILE: {
    caylak:   '🐣', dengeli:  '🎯', atak:     '⚡', metronom: '⏱️',
    delidolu: '🎲', usta:     '🎖️', kaplan:   '🐅', kurt:     '🐺',
    simsek:   '🌩️', kaya:     '🪨', roket:    '🚀', tilki:    '🦊',
    // Ek kişilik simgeleri (yeni profillerle eşleşir) ──
    kobra:    '🐍', boga:     '🐂', panter:   '🐆', sahin:    '🦅',
    // Üç ek kişilik simgesi (en son eklenen profillerle eşleşir) ──
    aslan:    '🦁', ejder:    '🐉', kasirga:  '🌀',
    // Üç yeni kişilik simgesi (en son eklenen profillerle eşleşir) ──
    yildirim: '🌠', ayi:      '🐻', akrep:    '🦂',
    // Üç en yeni kişilik simgesi (en son eklenen profillerle eşleşir) ──
    yunus:    '🐬', ceylan:   '🦌', yarasa:   '🦇'
  },
  // Beceri kademesine göre yedek simge havuzu (profil eşleşmezse) ──
  FLAIR_TIERS: ['🐢', '🚗', '🏁', '🔥', '💫', '👑'],
  // Bazı hayaletlere önek (klan/rol havası) — çoğunlukla boş kalır
  PREFIXES: ['', '', '', '', '', '', 'Kral', 'Hız', 'Turbo', 'Nitro', 'Gece', 'Fırtına'],
  // Sürücü kişilikleri — beceri eğilimi + tempo imzası (özgün yerel çeşitlilik).
  // paceAmp: hız dalgalanma genliği (0..1), paceHz: dalgalanma sıklığı, colorHint: tercih rengi.
  PROFILES: [
    { id: 'caylak',   label: 'Acemi',      skillBias: -0.28, paceAmp: 0.17, paceHz: 0.55, colorHint: 0 },
    { id: 'dengeli',  label: 'İstikrarlı', skillBias:  0.00, paceAmp: 0.07, paceHz: 0.40, colorHint: 1 },
    { id: 'atak',     label: 'Atak',       skillBias:  0.14, paceAmp: 0.23, paceHz: 0.90, colorHint: 5 },
    { id: 'metronom', label: 'Metronom',   skillBias:  0.06, paceAmp: 0.04, paceHz: 0.28, colorHint: 2 },
    { id: 'delidolu', label: 'Deli-Dolu',  skillBias:  0.20, paceAmp: 0.31, paceHz: 1.20, colorHint: 3 },
    { id: 'usta',     label: 'Usta',       skillBias:  0.27, paceAmp: 0.10, paceHz: 0.62, colorHint: 4 },
    // Ek kişilikler — daha geniş tempo/beceri yelpazesi (özgün yerel çeşitlilik) ──
    { id: 'kaplan',   label: 'Kaplan',     skillBias:  0.22, paceAmp: 0.26, paceHz: 1.05, colorHint: 5 },
    { id: 'kurt',     label: 'Yalnız Kurt',skillBias:  0.18, paceAmp: 0.12, paceHz: 0.50, colorHint: 1 },
    { id: 'simsek',   label: 'Şimşek',     skillBias:  0.31, paceAmp: 0.20, paceHz: 1.45, colorHint: 3 },
    { id: 'kaya',     label: 'Kaya',       skillBias: -0.10, paceAmp: 0.05, paceHz: 0.22, colorHint: 2 },
    { id: 'roket',    label: 'Roket',      skillBias:  0.34, paceAmp: 0.18, paceHz: 0.98, colorHint: 5 },
    { id: 'tilki',    label: 'Tilki',      skillBias:  0.10, paceAmp: 0.15, paceHz: 0.74, colorHint: 4 },
    // Dört ek kişilik — tempo/beceri yelpazesini iyice genişletir (özgün yerel çeşitlilik) ──
    { id: 'kobra',    label: 'Kobra',      skillBias:  0.16, paceAmp: 0.28, paceHz: 1.30, colorHint: 5 },
    { id: 'boga',     label: 'Boğa',       skillBias:  0.05, paceAmp: 0.09, paceHz: 0.35, colorHint: 4 },
    { id: 'panter',   label: 'Panter',     skillBias:  0.24, paceAmp: 0.16, paceHz: 0.88, colorHint: 1 },
    { id: 'sahin',    label: 'Şahin',      skillBias:  0.29, paceAmp: 0.22, paceHz: 1.15, colorHint: 3 },
    // Üç ek kişilik — tempo/beceri yelpazesini en geniş hâline taşır (özgün yerel çeşitlilik) ──
    { id: 'aslan',    label: 'Aslan',      skillBias:  0.26, paceAmp: 0.14, paceHz: 0.80, colorHint: 3 },
    { id: 'ejder',    label: 'Ejderha',    skillBias:  0.33, paceAmp: 0.24, paceHz: 1.10, colorHint: 5 },
    { id: 'kasirga',  label: 'Kasırga',    skillBias:  0.19, paceAmp: 0.30, paceHz: 1.38, colorHint: 0 },
    // Üç yeni kişilik — tempo/beceri yelpazesini daha da genişletir (özgün yerel çeşitlilik) ──
    { id: 'yildirim', label: 'Yıldırım',   skillBias:  0.30, paceAmp: 0.21, paceHz: 1.25, colorHint: 3 },
    { id: 'ayi',      label: 'Ayı',        skillBias: -0.05, paceAmp: 0.08, paceHz: 0.30, colorHint: 4 },
    { id: 'akrep',    label: 'Akrep',      skillBias:  0.17, paceAmp: 0.19, paceHz: 0.95, colorHint: 5 },
    // Üç en yeni kişilik — tempo/beceri yelpazesini en uca genişletir (özgün yerel çeşitlilik) ──
    { id: 'yunus',    label: 'Yunus',      skillBias:  0.21, paceAmp: 0.13, paceHz: 1.02, colorHint: 1 },
    { id: 'ceylan',   label: 'Ceylan',     skillBias:  0.28, paceAmp: 0.11, paceHz: 0.70, colorHint: 2 },
    { id: 'yarasa',   label: 'Yarasa',     skillBias:  0.12, paceAmp: 0.27, paceHz: 1.33, colorHint: 0 }
  ],

  // Determinist-dostu tohum PRNG (mulberry32) — aynı tohum → aynı hayalet ritmi.
  // Bir kapanış döndürür; ardışık çağrılar 0..1 arası üretir.
  _rng(seed) {
    let a = (seed | 0) ^ 0x9e3779b9;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // Beceriye/indekse göre bir sürücü kişiliği seç (determinist-dostu)
  _pickProfile(i, skill) {
    const P = this.PROFILES;
    // Beceri yüksekse usta/atak eğilimli, düşükse çaylak eğilimli bir dilim seç
    let idx = ((i | 0) + Math.round((typeof skill === 'number' ? skill : 0.5) * (P.length - 1))) % P.length;
    if (idx < 0) idx += P.length;
    return P[idx] || P[0];
  },

  // ── Backend (yerel varsayılan; config varsa Firebase) ──
  backend: 'local',
  _db: null,
  _remote: {},     // mapId → uzak hayaletler (Firebase'den önceden getirilir)
  _fetching: {},

  // Uygulama açılışında çağrılır. Firebase config + SDK varsa Firestore'a bağlanır.
  init() {
    try {
      if (typeof window !== 'undefined' && window.MP_FIREBASE_CONFIG && window.firebase && window.firebase.initializeApp) {
        if (!window._mpFbApp) window._mpFbApp = window.firebase.initializeApp(window.MP_FIREBASE_CONFIG);
        this._db = window.firebase.firestore();
        this.backend = 'firebase';
        console.log('[MP] Firebase bağlandı — gerçek oyuncu hayaletleri aktif');
      } else {
        this.backend = 'local';
      }
    } catch (e) { this.backend = 'local'; }
    return this.backend;
  },

  // Bir haritanın uzak hayaletlerini önceden getir (mapselect'te tetiklenir)
  prefetch(mapId) {
    if (this.backend !== 'firebase' || !this._db || this._fetching[mapId]) return;
    this._fetching[mapId] = true;
    try {
      this._db.collection('ghosts').where('mapId', '==', mapId).orderBy('dist', 'desc').limit(this.MAX_PER_MAP).get()
        .then(snap => { const out = []; snap.forEach(d => { const g = d.data(); if (g && g.points && g.points.length) out.push(g); }); this._remote[mapId] = out; })
        .catch(() => {})
        .then(() => { this._fetching[mapId] = false; });
    } catch (e) { this._fetching[mapId] = false; }
  },

  _uploadGhost(g) {
    if (this.backend !== 'firebase' || !this._db) return;
    try {
      const pts = g.points.map(p => ({ t: +(+p.t).toFixed(2), x: Math.round(p.x), y: Math.round(p.y), a: +(+p.a).toFixed(3) }));
      this._db.collection('ghosts').add({
        mapId: g.mapId, name: g.name, vehicleId: g.vehicleId,
        dist: g.dist | 0, time: g.time, points: pts, ts: Date.now()
      }).catch(() => {});
    } catch (e) {}
  },

  _pool() { try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch (e) { return {}; } },
  _savePool(p) { try { localStorage.setItem(this.KEY, JSON.stringify(p)); } catch (e) {} },

  // Oyuncunun turunu hayalet olarak kaydet
  saveGhost(g) {
    if (!g || !g.mapId || !g.points || g.points.length < 3) return;
    g.mine = true;                       // kendi turlarını işaretle (skor tablosu için)
    if (g.time != null && g.skill == null) g.skill = this.skillOf(g);
    const p = this._pool();
    const arr = p[g.mapId] || [];
    arr.push(g);
    arr.sort((a, b) => (b.dist || 0) - (a.dist || 0));
    p[g.mapId] = arr.slice(0, this.MAX_PER_MAP);
    this._savePool(p);
    // Firebase varsa gerçek oyunculara da yükle
    this._uploadGhost(g);
  },

  // Yarış için n hayalet getir (uzak + yerel + tohum)
  getGhosts(mapId, n, terrain) {
    let arr = [];
    if (this._remote[mapId] && this._remote[mapId].length) arr = arr.concat(this._remote[mapId]);   // gerçek oyuncular
    arr = arr.concat(this._pool()[mapId] || []);                                                    // kendi turların
    let seedI = 0;
    while (arr.length < n) arr.push(this._seedGhost(mapId, seedI++, terrain));
    // Çeşitlilik: rastgele karıştır, ilk n
    for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    const sel = arr.slice(0, n);
    sel.forEach((g, i) => {
      const ci = i % this.GHOST_COLORS.length;
      g.color = this.GHOST_COLORS[ci];
      g.colorName = this.COLOR_NAMES[ci];
      this.decorate(g);
    });
    return sel;
  },

  // Eşleştirme: oyuncunun beceri/mesafesine yakın hayaletlerden bir kadro seç.
  // playerDist verilmezse getGhosts'a düşer (geriye uyumlu davranış).
  findMatch(mapId, n, terrain, playerDist) {
    n = n || 4;
    if (typeof playerDist !== 'number') return this.getGhosts(mapId, n, terrain);
    const target = Math.max(0, Math.min(1, playerDist / 18000));
    // Aday havuzu: uzak + yerel; yetmezse becerisi hedefe yakın tohumlarla doldur
    let pool = [];
    if (this._remote[mapId] && this._remote[mapId].length) pool = pool.concat(this._remote[mapId]);
    pool = pool.concat(this._pool()[mapId] || []);
    let guard = 0;
    while (pool.length < n * 3 && guard++ < 40) pool.push(this._seedGhost(mapId, pool.length, terrain, target));
    // Hedef beceriye yakınlığa göre sırala, en yakın n taneyi al
    pool.sort((a, b) => Math.abs(this.skillOf(a) - target) - Math.abs(this.skillOf(b) - target));
    const sel = pool.slice(0, n);
    sel.forEach((g, i) => {
      const ci = i % this.GHOST_COLORS.length;
      g.color = this.GHOST_COLORS[ci];
      g.colorName = this.COLOR_NAMES[ci];
      this.decorate(g);
    });
    return sel;
  },

  // Bir haritanın sıralamalı skor tablosu (yerel + uzak turlar, mesafeye göre)
  leaderboard(mapId, limit) {
    let arr = [];
    if (this._remote[mapId] && this._remote[mapId].length) arr = arr.concat(this._remote[mapId]);
    arr = arr.concat(this._pool()[mapId] || []);
    arr = arr.filter(g => g && !g.seed);                       // yalnızca gerçek turlar
    arr.sort((a, b) => (b.dist || 0) - (a.dist || 0));
    if (limit) arr = arr.slice(0, limit);
    return arr.map((g, i) => ({
      rank: i + 1,
      name: g.name || 'Oyuncu',
      vehicleId: g.vehicleId,
      dist: g.dist | 0,
      distStr: this.fmtDist(g.dist),
      time: g.time,
      timeStr: g.time != null ? this.fmtTime(g.time) : '',
      badge: this.rankFor(g.dist),
      mine: !!g.mine
    }));
  },

  // Oyuncunun bu haritadaki en iyi mesafesi (kişisel rekor)
  personalBest(mapId) {
    const arr = this._pool()[mapId] || [];
    let best = 0;
    for (let k = 0; k < arr.length; k++) if (!arr[k].seed && (arr[k].dist || 0) > best) best = arr[k].dist | 0;
    return best;
  },

  // Bir haritada kayıtlı hayalet sayısı (tohumlar hariç)
  count(mapId) {
    return (this._pool()[mapId] || []).filter(g => g && !g.seed).length;
  },

  // Bir haritanın yerel hayalet havuzunu temizle (uzak/tohumları etkilemez)
  clearMap(mapId) {
    const p = this._pool();
    if (p[mapId]) { delete p[mapId]; this._savePool(p); }
  },

  // Sentetik tohum hayalet — sabit-ish hızla terrain'i takip eder.
  // skillHint (0..1) verilirse hayalet o beceri seviyesine yakın üretilir (eşleştirme).
  _seedGhost(mapId, i, terrain, skillHint) {
    // Tohuma bağlı ritim üreteci — aynı indeks → aynı tempo imzası (determinist-dostu)
    const rnd = this._rng(((i | 0) * 2654435761) ^ 0x5f356495);
    // Beceri: 0 = yavaş çaylak, 1 = hızlı efsane. Verilmemişse dağıtılmış rastgele.
    let baseSkill = (typeof skillHint === 'number')
      ? Math.max(0, Math.min(1, skillHint + (Math.random() - 0.5) * 0.35))
      : Math.random();
    // Kişilik: beceri eğilimini ve tempo imzasını belirler
    const prof = this._pickProfile(i, baseSkill);
    let skill = Math.max(0, Math.min(1, baseSkill + prof.skillBias * 0.5 + (rnd() - 0.5) * 0.12));
    const speed = 210 + skill * 360 + Math.random() * 60;     // px/s (beceriyle ölçekli)
    const dur   = (900 + skill * 16000 + Math.random() * 1800) * 2 / speed;  // süre (m→px→s)
    const wobble = (1 - skill) * 22;                            // acemi = daha titrek çizgi
    // Tempo imzası: her hayalete özgü hafif hızlanma/yavaşlama ritmi (surge/lull)
    const pAmp = prof.paceAmp * (0.7 + rnd() * 0.6);           // dalgalanma genliği
    const pHz  = prof.paceHz  * (0.8 + rnd() * 0.5);           // dalgalanma sıklığı
    const pPh  = rnd() * 6.283;                                 // faz kayması
    const wHz  = 2.4 + prof.paceHz * 1.4;                       // titreşim sıklığı kişilikle
    const pts = [];
    let x = 200;
    for (let t = 0; t <= dur; t += 0.12) {
      // pace çarpanı daima pozitif kalır (pAmp<1) → x monoton artar, posAt güvenli
      const pace = 1 + pAmp * Math.sin(t * pHz + pPh);
      let y = (terrain && terrain.getYAt) ? (terrain.getYAt(x) - 40) : 400;
      if (wobble) y += Math.sin(t * wHz) * wobble;
      pts.push({ t: t, x: x, y: y, a: 0 });
      x += speed * pace * 0.12;
    }
    const last = pts.length ? pts[pts.length - 1] : { x: 200 };
    const dist = Math.max(0, Math.floor((last.x - 200) / 2));   // gerçek bitiş noktasından mesafe
    const g = {
      name: this._makeName(i, rnd),
      vehicleId: this._pickVehicle(skill, rnd),
      mapId: mapId, dist: dist, time: dur, points: pts, seed: true,
      skill: +skill.toFixed(3), profile: prof.id, colorHint: prof.colorHint
    };
    return this.decorate(g);
  },

  // Kişiliğe/beceriye göre bir araç seç (VehicleDefs yoksa 'jeep')
  _pickVehicle(skill, rng) {
    const vids = (typeof VehicleDefs !== 'undefined') ? Object.keys(VehicleDefs) : ['jeep'];
    const n = Math.min(vids.length, 20);
    if (n <= 1) return vids[0] || 'jeep';
    const r = (typeof rng === 'function') ? rng() : Math.random();
    const s = Math.max(0, Math.min(1, (typeof skill === 'number' ? skill : 0.5)));
    // becerili hayaletler listenin ilerisindeki (çoğu zaman daha hızlı) araçlara meyleder
    let idx = Math.floor((r * 0.6 + s * 0.4) * n);
    if (idx >= n) idx = n - 1;
    return vids[idx] || 'jeep';
  },

  // Rastgele ama okunur bir oyuncu adı (önek + isim + opsiyonel lakap) üret.
  // rng verilirse determinist-dostu (tohum hayaletleri için); yoksa Math.random.
  _makeName(i, rng) {
    const r = (typeof rng === 'function') ? rng : Math.random;
    // Yedi isim havuzundan biri seçilir → en geniş, tekrarsız hayalet çeşitliliği
    const pools = [this.NAMES, this.NAMES2, this.NAMES3 || this.NAMES,
                   this.NAMES4 || this.NAMES, this.NAMES5 || this.NAMES,
                   this.NAMES6 || this.NAMES, this.NAMES7 || this.NAMES];
    const pool = pools[(r() * pools.length) | 0] || this.NAMES;
    const base = pool[((i | 0) * 7 + ((r() * pool.length) | 0)) % pool.length];
    const pre  = this.PREFIXES[(r() * this.PREFIXES.length) | 0] || '';
    const tag  = this.TAGS[(r() * this.TAGS.length) | 0] || '';
    return (pre ? pre + base : base) + tag;
  },

  // Bir mesafeye karşılık gelen rütbe rozetini döndür
  rankFor(dist) {
    const d = dist | 0; let r = this.RANKS[0];
    for (let k = 0; k < this.RANKS.length; k++) if (d >= this.RANKS[k].min) r = this.RANKS[k];
    return r;
  },

  // Beceri tahmini (0..1) — mesafeyi normalize eder; eşleştirmede kullanılır
  skillOf(g) {
    if (g && typeof g.skill === 'number') return g.skill;
    const d = (g && g.dist) || 0;
    return Math.max(0, Math.min(1, d / 18000));
  },

  // Hayalete arayüz/çizim için ekstra alanlar ekle (mutasyon + döndürür)
  decorate(g) {
    if (!g) return g;
    if (!g.rankInfo) g.rankInfo = this.rankFor(g.dist);
    if (typeof g.skill !== 'number') g.skill = this.skillOf(g);
    if (g.time != null && !g.timeStr) g.timeStr = this.fmtTime(g.time);
    if (g.dist != null && !g.distStr) g.distStr = this.fmtDist(g.dist);
    if (!g.flair) g.flair = this._flairFor(g);        // kişiliğe/beceriye göre simge süsü
    return g;
  },

  // ── Hayalet simge süsü (additive): profil → emoji, yoksa beceri kademesine düş ──
  _flairFor(g) {
    if (!g) return '🏎️';
    const byProf = g.profile && this.FLAIR_BY_PROFILE && this.FLAIR_BY_PROFILE[g.profile];
    if (byProf) return byProf;
    const t = this.FLAIR_TIERS || ['🏎️'];
    let idx = Math.floor(this.skillOf(g) * t.length);
    if (idx >= t.length) idx = t.length - 1;
    if (idx < 0) idx = 0;
    return t[idx] || '🏎️';
  },

  // ── "Günün Rakibi" (additive): tarihe bağlı determinist tek hayalet seçimi ──
  // Aynı gün + aynı harita → aynı rakip. Tamamen çevrimdışı; ağ gerektirmez.
  _dayIndex(d) {
    const dt = (d instanceof Date) ? d : new Date();
    // UTC gün sayacı — saat diliminden bağımsız kararlı bir tam sayı
    return Math.floor(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()) / 86400000);
  },

  // mapId için günün rakibini üretir (yerel havuzdan seçer, yoksa determinist tohum).
  // Süslenmiş hayalet nesnesi döndürür; imza eklemeli, mevcut API'yi değiştirmez.
  rivalOfDay(mapId, terrain, date) {
    const day = this._dayIndex(date);
    // Harita adı + gün → sabit tohum (mulberry32 ile kararlı seçim)
    let h = 0; const key = String(mapId || '') + '#' + day;
    for (let k = 0; k < key.length; k++) h = (Math.imul(h, 31) + key.charCodeAt(k)) | 0;
    const rnd = this._rng(h ^ 0x1b873593);
    // Önce yerel/uzak gerçek turlardan aday havuzu; determinist bir tanesini seç
    let pool = [];
    if (this._remote[mapId] && this._remote[mapId].length) pool = pool.concat(this._remote[mapId]);
    pool = pool.concat((this._pool()[mapId] || []).filter(g => g && !g.seed));
    let g;
    if (pool.length) {
      g = pool[(rnd() * pool.length) | 0] || pool[0];
    } else {
      // Havuz boşsa güne özgü determinist bir tohum hayalet üret
      g = this._seedGhost(mapId, (day % 97) + 3, terrain);
    }
    g = this.decorate(g);
    g.isRival = true;                                  // arayüz "Günün Rakibi" rozeti için
    if (!g.rivalTag) g.rivalTag = '🎯 Günün Rakibi';
    return g;
  },

  // ── "Günlük Meydan Okuma" (additive): gün + harita tohumlu tek determinist hayalet ──
  // Aynı gün + aynı harita → aşılması gereken sabit bir "bu süreyi geç" hedefi.
  // Her zaman determinist tohumdan üretilir (yerel havuza bakmaz) → kararlı hedef.
  // Süslenmiş hayalet nesnesi döndürür; imza eklemeli, mevcut API'yi değiştirmez.
  // Perf koruması: tek tohum çağrısı, ağ yok, tamamen çevrimdışı.
  dailyChallengeGhost(mapId, terrain) {
    const day = this._dayIndex();
    // Harita adı + gün → sabit tohum (mulberry32 ile kararlı meydan okuma)
    let h = 0; const key = String(mapId || '') + '#DC' + day;
    for (let k = 0; k < key.length; k++) h = (Math.imul(h, 31) + key.charCodeAt(k)) | 0;
    const rnd = this._rng(h ^ 0x3c6ef372);
    // Güne özgü hedef beceri: orta-üst bantta dalgalanan tek zorlu rakip
    const skillHint = Math.max(0.35, Math.min(0.95, 0.6 + (rnd() - 0.5) * 0.5));
    let g = this._seedGhost(mapId, (h & 4095) + (day % 89) + 7, terrain, skillHint);
    g = this.decorate(g);
    g.isDaily = true;                                  // arayüz "Günlük Meydan" rozeti için
    g.challengeDay = day;
    g.targetTime = g.time;                             // aşılması gereken süre
    g.targetDist = g.dist | 0;                         // aşılması gereken mesafe
    if (g.time != null) g.targetTimeStr = this.fmtTime(g.time);
    if (!g.challengeTag) g.challengeTag = '🏅 Günlük Meydan Okuma';
    return g;
  },

  // ── ISO 8601 hafta numarası (additive): yıl + hafta → kararlı tam sayı çifti ──
  // Saat diliminden bağımsız; aynı takvim haftası → aynı sonuç (determinist).
  _isoWeek(date) {
    const src = (date instanceof Date) ? date : new Date();
    // UTC tabanlı çalış: haftanın Perşembesi yılı ve hafta numarasını belirler
    const t = new Date(Date.UTC(src.getUTCFullYear(), src.getUTCMonth(), src.getUTCDate()));
    const day = (t.getUTCDay() + 6) % 7;               // Pazartesi=0 .. Pazar=6
    t.setUTCDate(t.getUTCDate() - day + 3);            // o haftanın Perşembesi
    const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    const fday = (firstThu.getUTCDay() + 6) % 7;
    firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
    const week = 1 + Math.round((t - firstThu) / 604800000);
    return { year: t.getUTCFullYear(), week: week };
  },

  // ── "Haftalık Turnuva" (additive): ISO haftasına bağlı 8 hayaletlik determinist braket ──
  // Aynı hafta + aynı harita → aynı 8 rakip ve aynı yerleşim. Tamamen çevrimdışı.
  // Süslenmiş hayalet dizisi döndürür; imza eklemeli, mevcut API'yi değiştirmez.
  weeklyBracket(mapId, terrain, date) {
    const iso = this._isoWeek(date);
    // Harita + yıl + hafta → kararlı tohum (mulberry32 ile sabit braket)
    let h = 0; const key = String(mapId || '') + '#' + iso.year + 'W' + iso.week;
    for (let k = 0; k < key.length; k++) h = (Math.imul(h, 31) + key.charCodeAt(k)) | 0;
    const rnd = this._rng(h ^ 0x27d4eb2f);
    const N = 8;                                        // perf koruması: sabit 8 hayalet
    const out = [];
    for (let s = 0; s < N; s++) {
      // Üst sıralar daha becerili (1 numara favori) → dengeli braket eğrisi
      const skillHint = Math.max(0, Math.min(1, 0.92 - s * 0.10 + (rnd() - 0.5) * 0.08));
      const g = this._seedGhost(mapId, (h & 1023) + s * 17 + 1, terrain, skillHint);
      g.seedNo = s + 1;                                 // braket seri başı (1 = favori)
      g.bracketWeek = iso.week; g.bracketYear = iso.year;
      // Tek eleme yerleşimi: 1-8, 2-7, 3-6, 4-5 → eşleşme numarası (1..4)
      g.matchPair = Math.min(g.seedNo, (N + 1) - g.seedNo);
      if (!g.tourTag) g.tourTag = '🏟️ Haftalık Turnuva';
      out.push(this.decorate(g));
    }
    // Renk/etiket ata (getGhosts ile tutarlı görünüm)
    out.forEach((g, i) => {
      const ci = i % this.GHOST_COLORS.length;
      g.color = this.GHOST_COLORS[ci];
      g.colorName = this.COLOR_NAMES[ci];
    });
    return out;
  },

  // ── Ay indeksi (additive): yıl*12 + ay → kararlı tam sayı (sezon tohumu) ──
  // Saat diliminden bağımsız; aynı takvim ayı → aynı sonuç (determinist).
  _monthIndex(date) {
    const dt = (date instanceof Date) ? date : new Date();
    return dt.getUTCFullYear() * 12 + dt.getUTCMonth();
  },

  // ── "Sezon Skor Tablosu" (additive): aya bağlı ~20 hayaletlik determinist sıralama ──
  // Aynı ay + aynı harita → aynı 20 rakip ve aynı sıralama. Tamamen çevrimdışı.
  // Sıralanmış (rank/place içeren) süslenmiş hayalet dizisi döndürür; imza eklemeli,
  // mevcut API'yi değiştirmez. Perf koruması: sabit N ve tek geçişli üretim.
  seasonLeaderboard(mapId, terrain, date) {
    const month = this._monthIndex(date);
    // Harita + ay → kararlı tohum (mulberry32 ile sabit sezon panosu)
    let h = 0; const key = String(mapId || '') + '#S' + month;
    for (let k = 0; k < key.length; k++) h = (Math.imul(h, 31) + key.charCodeAt(k)) | 0;
    const rnd = this._rng(h ^ 0x85ebca6b);
    const N = 20;                                       // perf koruması: sabit 20 hayalet
    const out = [];
    for (let s = 0; s < N; s++) {
      // Sezon boyunca beceri dağılımı: üst dilim güçlü, alt dilim çaylak eğilimli
      const skillHint = Math.max(0, Math.min(1, 0.96 - (s / (N - 1)) * 0.82 + (rnd() - 0.5) * 0.10));
      const g = this._seedGhost(mapId, (h & 2047) + s * 29 + 5, terrain, skillHint);
      g.seasonMonth = month;
      if (!g.seasonTag) g.seasonTag = '🗓️ Sezon Panosu';
      out.push(g);
    }
    // Mesafeye göre determinist sıralama (eşitlikte tohum indeksine göre kararlı)
    out.sort((a, b) => (b.dist || 0) - (a.dist || 0));
    out.forEach((g, i) => {
      const ci = i % this.GHOST_COLORS.length;
      g.color = this.GHOST_COLORS[ci];
      g.colorName = this.COLOR_NAMES[ci];
      g.seasonRank = i + 1;                             // sezon sırası (1 = lider)
      this.decorate(g);
    });
    return out;
  },

  // Rütbe kademesine karşılık gelen künye rengi (bronz/gümüş/altın)
  _tierColor(tier) {
    return tier === 'gold' ? '#ffd24a' : tier === 'silver' ? '#dfe7ef' : '#d0955b';
  },

  // ── Çizim yardımcısı (additive/opsiyonel): hayalet için isim + rütbe künyesi ──
  // Oyun çizim döngüsü isterse çağırır. Künye = renk noktası + isim + rütbe rozeti.
  // opts: { alpha, rank(true), place } — düşük grafik ayarında gölge/parıltı atlanır.
  drawNameplate(ctx, g, x, y, opts) {
    if (!ctx || !g || typeof ctx.fillText !== 'function') return;
    opts = opts || {};
    const lowFX = (typeof Settings !== 'undefined' && Settings.get)
      ? (Settings.get('graphics') === 'low') : false;
    const rank = g.rankInfo || this.rankFor(g.dist);
    const name = g.name || 'Ghost';
    const col  = g.color || '#5bd0ff';
    const label = (opts.rank !== false)
      ? (name + '  ' + (rank.icon || '') + ' ' + rank.name)
      : name;
    ctx.save();
    ctx.font = 'bold 12px Arial';
    ctx.textBaseline = 'middle';
    const padX = 8, dot = 5, gap = 6, h = 18;
    const tw = ctx.measureText ? ctx.measureText(label).width : label.length * 7;
    const w = padX * 2 + dot * 2 + gap + tw + (opts.place ? 22 : 0);
    const bx = x - w / 2, by = y - h;
    // arka pano
    ctx.globalAlpha = (opts.alpha != null ? opts.alpha : 0.82);
    if (!lowFX) { ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 1; }
    ctx.fillStyle = 'rgba(14,18,28,0.72)';
    ctx.beginPath(); ctx.roundRect(bx, by, w, h, 6); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // sol kenar rütbe şeridi (kademe rengi)
    ctx.fillStyle = this._tierColor(rank.tier);
    ctx.beginPath(); ctx.roundRect(bx, by, 3, h, 6); ctx.fill();
    // renk noktası (aracın rengi)
    ctx.globalAlpha = 1;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(bx + padX + dot, by + h / 2, dot, 0, 6.283); ctx.fill();
    if (!lowFX) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke(); }
    // isim + rütbe metni
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eef3f8';
    ctx.fillText(label, bx + padX + dot * 2 + gap, by + h / 2 + 0.5);
    // opsiyonel yer/derece rozeti (künyenin sağ ucu)
    if (opts.place) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 10px Arial';
      ctx.fillStyle = this._tierColor(rank.tier);
      ctx.fillText('#' + opts.place, bx + w - padX, by + h / 2 + 0.5);
    }
    ctx.restore();
  },

  // ── Biçimleyiciler (arayüz yardımcıları) ──
  fmtTime(sec) {
    sec = Math.max(0, +sec || 0);
    const m = (sec / 60) | 0, s = sec - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  },
  fmtDist(m) {
    m = Math.max(0, m | 0);
    return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : m + ' m';
  },

  // Bir hayaletin t anındaki konumu (interpolasyon)
  posAt(g, t) {
    const pts = g.points; if (!pts || !pts.length) return null;
    if (t <= pts[0].t) return { x: pts[0].x, y: pts[0].y, a: pts[0].a, done: false };
    const last = pts[pts.length - 1];
    if (t >= last.t) return { x: last.x, y: last.y, a: last.a, done: true };
    let i = g._i || 0;
    if (pts[i].t > t) i = 0;
    while (i < pts.length - 1 && pts[i + 1].t < t) i++;
    g._i = i;
    const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
    const seg = Math.max(1e-4, b.t - a.t), f = Math.max(0, Math.min(1, (t - a.t) / seg));
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, a: a.a + (b.a - a.a) * f, done: false };
  }
};

// Açılışta backend'i belirle (Firebase config varsa bağlan, yoksa yerel)
if (typeof window !== 'undefined') { try { Multiplayer.init(); } catch (e) {} }
