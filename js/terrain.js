'use strict';
const Terrain = {
  points: [],       // [{x, y, surface}]
  segmentSize: 20,  // pixels between terrain points
  objects: [],      // coins, fuel, obstacles
  mapId: 'countryside',

  MAPS: {
    rainbow_road:   { surface:'asfalt',bgColor:'#141030', groundColor:'#ff5aa0', groundColor2:'#a03080', roughness:0.30, heightScale:180, baseY:0.58, hillFreq:0.0035, coinFreq:0.10, fuelFreq:0.014, obstacles:[],       bgElements:['cloud'], fogColor:null },
    sandstorm:      { surface:'sand',  bgColor:'#c98a48', groundColor:'#c8934a', groundColor2:'#8a5f2a', roughness:0.65, heightScale:240, baseY:0.58, hillFreq:0.0028, coinFreq:0.06, fuelFreq:0.012, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(210,160,90,0.22)' },
    crystal_forest: { surface:'rock',  bgColor:'#0e1830', groundColor:'#2a4a6a', groundColor2:'#182e46', roughness:0.72, heightScale:290, baseY:0.55, hillFreq:0.0046, coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(120,180,220,0.10)' },
    desert_oasis:   { surface:'sand',  bgColor:'#7ec4e6', groundColor:'#d8b45a', groundColor2:'#a07a2e', roughness:0.50, heightScale:200, baseY:0.60, hillFreq:0.0030, coinFreq:0.08, fuelFreq:0.013, obstacles:['rock'], bgElements:['cloud'], fogColor:null },
    junkyard:       { surface:'metal', bgColor:'#3a352c', groundColor:'#6a5c46', groundColor2:'#3e362a', roughness:0.80, heightScale:260, baseY:0.56, hillFreq:0.0038, coinFreq:0.07, fuelFreq:0.013, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(120,100,70,0.12)' },
    cyberpunk_roofs:{ surface:'asfalt',bgColor:'#0a0618', groundColor:'#1a2036', groundColor2:'#0e1322', roughness:0.55, heightScale:230, baseY:0.55, hillFreq:0.0040, coinFreq:0.07, fuelFreq:0.013, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(120,40,180,0.10)' },
    cloud_kingdom:  { surface:'grass', bgColor:'#8fc8f0', groundColor:'#e8f0ff', groundColor2:'#b8d0ee', roughness:0.45, heightScale:210, baseY:0.56, hillFreq:0.0040, coinFreq:0.08, fuelFreq:0.015, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(255,255,255,0.14)' },
    meteor_field:   { surface:'rock',  bgColor:'#0c0a1a', groundColor:'#3a3446', groundColor2:'#221e2e', roughness:0.88, heightScale:330, baseY:0.50, hillFreq:0.0044, coinFreq:0.06, fuelFreq:0.014, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(80,60,120,0.10)' },
    firefly_forest: { surface:'grass', bgColor:'#0e2018', groundColor:'#2a4a30', groundColor2:'#1a2e20', roughness:0.68, heightScale:280, baseY:0.55, hillFreq:0.0046, coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'], bgElements:['cloud'], fogColor:'rgba(40,80,50,0.12)' },
    aurora_peak:    { surface:'snow',  bgColor:'#0a1838', groundColor:'#dfeaf5', groundColor2:'#a8bcd4', roughness:0.70, heightScale:300, baseY:0.52, hillFreq:0.0040, coinFreq:0.06, fuelFreq:0.014, obstacles:['rock'], bgElements:['mountain','cloud'], fogColor:'rgba(120,200,180,0.10)' },
    skyland:     { surface:'grass', bgColor:'#5aa0e0', groundColor:'#7ec850', groundColor2:'#4f9a3a', roughness:0.70, heightScale:300, baseY:0.50, hillFreq:0.005,  coinFreq:0.06, fuelFreq:0.015, obstacles:['rock'] },
    sakura:      { surface:'grass', bgColor:'#f7c5d8', groundColor:'#7ec850', groundColor2:'#4f9a3a', roughness:0.62, heightScale:270, baseY:0.52, hillFreq:0.0048, coinFreq:0.06, fuelFreq:0.015, obstacles:['rock'] },
    graveyard:   { surface:'grass', bgColor:'#2a2438', groundColor:'#4a5340', groundColor2:'#2e3628', roughness:0.72, heightScale:290, baseY:0.52, hillFreq:0.005,  coinFreq:0.06, fuelFreq:0.015, obstacles:['rock'] },
    carnival:    { surface:'grass', bgColor:'#5fb8e8', groundColor:'#7ec850', groundColor2:'#4f9a3a', roughness:0.58, heightScale:250, baseY:0.54, hillFreq:0.0046, coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'] },
    windmill:    { surface:'grass', bgColor:'#8fd0f2', groundColor:'#82cf58', groundColor2:'#4f9a3a', roughness:0.50, heightScale:230, baseY:0.55, hillFreq:0.0042, coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'] },
    bamboo:      { surface:'grass', bgColor:'#a9ddc9', groundColor:'#5fae5a', groundColor2:'#3f8a3a', roughness:0.46, heightScale:215, baseY:0.56, hillFreq:0.0040, coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'] },
    lava_river:  { surface:'rock',  bgColor:'#3a1008', groundColor:'#6b2a1a', groundColor2:'#40170e', roughness:0.90, heightScale:340, baseY:0.50, hillFreq:0.0045, coinFreq:0.05, fuelFreq:0.014, obstacles:['rock'] },
    crystal_cave:{ surface:'rock',  bgColor:'#160a2a', groundColor:'#3a2a6a', groundColor2:'#241848', roughness:0.85, heightScale:320, baseY:0.50, hillFreq:0.005,  coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'] },
    cyber_grid:  { surface:'asfalt',bgColor:'#050a12', groundColor:'#0e2a2a', groundColor2:'#06181c', roughness:0.50, heightScale:220, baseY:0.60, hillFreq:0.004,  coinFreq:0.06, fuelFreq:0.013, obstacles:['rock'] },
    autumn:      { surface:'grass', bgColor:'#b5651d', groundColor:'#8a5a2a', groundColor2:'#5e3a18', roughness:0.75, heightScale:300, baseY:0.55, hillFreq:0.005,  coinFreq:0.06, fuelFreq:0.015, obstacles:['rock'] },
    glacier:     { surface:'ice',   bgColor:'#a8d8ee', groundColor:'#cfe9f5', groundColor2:'#9cc4d8', roughness:0.60, heightScale:300, baseY:0.55, hillFreq:0.0045, coinFreq:0.06, fuelFreq:0.015, obstacles:['rock'] },
    savanna:     { surface:'sand',  bgColor:'#e0b85a', groundColor:'#c9a44a', groundColor2:'#8a6f2e', roughness:0.70, heightScale:280, baseY:0.60, hillFreq:0.0045, coinFreq:0.06, fuelFreq:0.014, obstacles:['rock'] },
    ruins:       { surface:'rock',  bgColor:'#c2a878', groundColor:'#9a865e', groundColor2:'#6b5c40', roughness:0.85, heightScale:320, baseY:0.55, hillFreq:0.005,  coinFreq:0.06, fuelFreq:0.015, obstacles:['rock'] },
    mushroom:    { surface:'grass', bgColor:'#7a3a8a', groundColor:'#4a8a3a', groundColor2:'#2f5e26', roughness:0.75, heightScale:300, baseY:0.55, hillFreq:0.005,  coinFreq:0.07, fuelFreq:0.015, obstacles:['rock'] },
    stormpeak:   { surface:'rock',  bgColor:'#2a2838', groundColor:'#4a4858', groundColor2:'#2e2c3c', roughness:0.95, heightScale:360, baseY:0.45, hillFreq:0.004,  coinFreq:0.05, fuelFreq:0.014, obstacles:['rock'] },
    dag: {
      surface: 'rock',
      bgColor: '#20242e',
      groundColor: '#5a554f',
      groundColor2: '#39352f',
      roughness: 0.95,
      heightScale: 380,
      baseY: 0.45,
      hillFreq: 0.004,
      coinFreq: 0.05,
      fuelFreq: 0.015,
      obstacles: ['rock'],
      bgElements: ['mountain','cloud'],
      fogColor: 'rgba(60,60,80,0.12)'
    },
    hotwheels: {
      surface: 'metal',
      bgColor: '#0f1526',
      groundColor: '#ff7a1a',
      groundColor2: '#e85d04',
      roughness: 0,
      heightScale: 0,
      baseY: 0.68,
      hillFreq: 0.002,
      coinFreq: 0.09,
      fuelFreq: 0.012,
      obstacles: [],
      bgElements: ['cloud'],
      fogColor: null
    },
    construction: {
      surface: 'metal', bgColor: '#2a2a32', groundColor: '#9a9a78', groundColor2: '#5c5c46',
      roughness: 0.6, heightScale: 175, baseY: 0.6, hillFreq: 0.003, coinFreq: 0.07, fuelFreq: 0.012,
      obstacles: ['rock'], bgElements: ['cloud'], fogColor: null
    },
    blizzard: {
      surface: 'snow', bgColor: '#7c8ca8', groundColor: '#f4f8ff', groundColor2: '#bccfe8',
      roughness: 0.85, heightScale: 300, baseY: 0.5, hillFreq: 0.0022, coinFreq: 0.06, fuelFreq: 0.011,
      obstacles: ['rock'], bgElements: ['mountain', 'cloud'], fogColor: 'rgba(220,230,255,0.16)'
    },
    candy: {
      surface: 'grass', bgColor: '#ffd6ec', groundColor: '#ff8fc7', groundColor2: '#d95fa0',
      roughness: 0.35, heightScale: 135, baseY: 0.62, hillFreq: 0.0035, coinFreq: 0.10, fuelFreq: 0.013,
      obstacles: [], bgElements: ['cloud'], fogColor: null
    },
    toxic: {
      surface: 'mud', bgColor: '#0e1a0e', groundColor: '#3aa83a', groundColor2: '#1c561c',
      roughness: 0.6, heightScale: 195, baseY: 0.58, hillFreq: 0.003, coinFreq: 0.07, fuelFreq: 0.012,
      obstacles: ['rock'], bgElements: ['cloud'], fogColor: 'rgba(60,190,60,0.12)'
    },
    rollercoaster: {
      surface: 'asfalt', bgColor: '#0e1430', groundColor: '#d0203f', groundColor2: '#7c1020',
      roughness: 0, heightScale: 0, baseY: 0.55, hillFreq: 0.002, coinFreq: 0.11, fuelFreq: 0.012,
      obstacles: [], bgElements: ['cloud'], fogColor: null
    },
    countryside: {
      surface: 'grass',
      bgColor: '#87CEEB',
      groundColor: '#4a7c22',
      groundColor2: '#6B8E23',
      roughness: 0.4,
      heightScale: 120,
      baseY: 0.65,
      hillFreq: 0.003,
      coinFreq: 0.08,
      fuelFreq: 0.012,
      obstacles: ['rock','bale','fence'],
      bgElements: ['tree','windmill','cloud'],
      fogColor: null
    },
    desert: {
      surface: 'sand',
      bgColor: '#87CEEB',
      groundColor: '#C8A84B',
      groundColor2: '#A0784a',
      roughness: 0.55,
      heightScale: 160,
      baseY: 0.6,
      hillFreq: 0.0025,
      coinFreq: 0.07,
      fuelFreq: 0.01,
      obstacles: ['cactus','rock'],
      bgElements: ['pyramid','cloud'],
      fogColor: 'rgba(200,150,80,0.08)'
    },
    winter: {
      surface: 'snow',
      bgColor: '#1a2a4a',
      groundColor: '#e8f0ff',
      groundColor2: '#b0c8e8',
      roughness: 0.65,
      heightScale: 200,
      baseY: 0.55,
      hillFreq: 0.0022,
      coinFreq: 0.06,
      fuelFreq: 0.009,
      obstacles: ['rock','tree'],
      bgElements: ['mountain','cloud'],
      fogColor: null
    },
    beach: {
      surface: 'sand',
      bgColor: '#1a90e0',
      groundColor: '#f0d080',
      groundColor2: '#c8a850',
      roughness: 0.3,
      heightScale: 90,
      baseY: 0.7,
      hillFreq: 0.004,
      coinFreq: 0.09,
      fuelFreq: 0.013,
      obstacles: ['umbrella','crab'],
      bgElements: ['palm','cloud'],
      waterLevel: true,
      fogColor: null
    },
    mountains: {
      surface: 'rock',
      bgColor: '#2d3a48',
      groundColor: '#808080',
      groundColor2: '#606060',
      roughness: 0.75,
      heightScale: 250,
      baseY: 0.5,
      hillFreq: 0.002,
      coinFreq: 0.06,
      fuelFreq: 0.008,
      fogColor: null,
      bgElements: ['peak','cloud','eagle'],
      obstacles: ['boulder','log'],
      description: 'Dik kayalık dağlar, uçurumlar'
    },
    city: {
      surface: 'asfalt',
      bgColor: '#87CEEB',
      groundColor: '#444444',
      groundColor2: '#333333',
      roughness: 0.2,
      heightScale: 60,
      baseY: 0.68,
      hillFreq: 0.005,
      coinFreq: 0.1,
      fuelFreq: 0.015,
      fogColor: null,
      bgElements: ['building','sign','car'],
      obstacles: ['barrier','cone'],
      description: 'Şehir içi yollar, köprüler'
    },
    arctic: {
      surface: 'ice',
      bgColor: '#0a1a2e',
      groundColor: '#b0d8f0',
      groundColor2: '#88b8d8',
      roughness: 0.6,
      heightScale: 180,
      baseY: 0.55,
      hillFreq: 0.0025,
      coinFreq: 0.055,
      fuelFreq: 0.008,
      fogColor: 'rgba(150,200,255,0.06)',
      bgElements: ['aurora','iceberg','snowflake'],
      obstacles: ['icerock','seal'],
      description: 'Buzul yollar, aurora borealis'
    },
    jungle: {
      surface: 'mud',
      bgColor: '#1a3a1a',
      groundColor: '#2d5a20',
      groundColor2: '#1a3a10',
      roughness: 0.55,
      heightScale: 160,
      baseY: 0.6,
      hillFreq: 0.003,
      coinFreq: 0.08,
      fuelFreq: 0.011,
      fogColor: 'rgba(0,80,0,0.08)',
      bgElements: ['tree','vine','bird'],
      obstacles: ['log','boulder'],
      description: 'Tropikal orman, çamurlu yollar'
    },
    mars: {
      surface: 'sand',
      bgColor: '#4a1a0a',
      groundColor: '#8B4513',
      groundColor2: '#6B3010',
      roughness: 0.65,
      heightScale: 200,
      baseY: 0.6,
      hillFreq: 0.0022,
      coinFreq: 0.05,
      fuelFreq: 0.007,
      fogColor: 'rgba(180,80,20,0.1)',
      bgElements: ['crater','rock','dustcloud'],
      obstacles: ['boulder','crater'],
      description: 'Mars yüzeyi, kızıl gezegen'
    },
    cave: {
      surface: 'rock',
      bgColor: '#0a0a0a',
      groundColor: '#2a2a2a',
      groundColor2: '#1a1a1a',
      roughness: 0.8,
      heightScale: 220,
      baseY: 0.58,
      hillFreq: 0.002,
      coinFreq: 0.07,
      fuelFreq: 0.009,
      fogColor: 'rgba(0,0,0,0.15)',
      bgElements: ['stalactite','crystal','bat'],
      obstacles: ['boulder','stalagmite'],
      description: 'Karanlık mağara, kristaller'
    },
    otoyol: {
      surface: 'asfalt',
      bgColor: '#87CEEB',
      groundColor: '#4a4a4a',
      groundColor2: '#333333',
      roughness: 0,
      heightScale: 0,
      baseY: 0.72,
      hillFreq: 0,
      coinFreq: 0.04,
      fuelFreq: 0.006,
      obstacles: [],
      bgElements: ['cloud','sign'],
      fogColor: null,
      description: 'Düz otoyol — sonsuz hız!'
    },
    highland: {
      surface: 'grass',
      bgColor: '#4a7a4a',
      groundColor: '#3d8a3d',
      groundColor2: '#2d6a2d',
      roughness: 0.5,
      heightScale: 170,
      baseY: 0.58,
      hillFreq: 0.0028,
      coinFreq: 0.07,
      fuelFreq: 0.010,
      fogColor: 'rgba(100,150,100,0.06)',
      bgElements: ['sheep','fence','cloud'],
      obstacles: ['rock','bale'],
      description: 'İskoç yaylası, yeşil tepeler'
    },
    swamp: {
      surface: 'mud',
      bgColor: '#1a2a1a',
      groundColor: '#3a5a2a',
      groundColor2: '#2a4a18',
      roughness: 0.4,
      heightScale: 100,
      baseY: 0.65,
      hillFreq: 0.004,
      coinFreq: 0.075,
      fuelFreq: 0.012,
      fogColor: 'rgba(50,100,30,0.12)',
      bgElements: ['deadtree','fog','frog'],
      obstacles: ['log','boulder'],
      waterLevel: true,
      description: 'Bataklık, sis, alçak arazi'
    }
  },

  generate(mapId, seed) {
    this.mapId = mapId;
    this.points = [];
    this.objects = [];
    this._seed = seed || 42;
    const cfg = this.MAPS[mapId] || this.MAPS.countryside;
    this._cfg  = cfg;
    const _cfM = (typeof MapSettings !== 'undefined' ? MapSettings.coinFreqMult(this.mapId) : 1);
    const _ffM = (typeof MapSettings !== 'undefined' ? MapSettings.fuelFreqMult(this.mapId) : 1);
    const totalWidth = 60000; // 60km başlangıç — sonra dinamik genişler
    const pts = Math.ceil(totalWidth / this.segmentSize) + 2;

    // Noise-based terrain generation
    let y = 400;
    let dy = 0;
    const rng = this._rng(seed || 42);

    for (let i = 0; i < pts; i++) {
      const x = (i - 1) * this.segmentSize;
      // Özel haritalar: keskin/dik profili düzleştirmeden doğrudan kullan
      const _sp = this._specialY(x);
      if (_sp !== null) {
        this.points.push({ x, y: _sp, surface: cfg.surface });
        if (x > 500) {
          const rr = rng();
          if (rr < cfg.coinFreq * _cfM) this._addCoin(x, _sp - 40, rng);
          else if (rr < cfg.coinFreq * _cfM + 0.02 + cfg.fuelFreq * _ffM) this._addFuel(x, _sp - 50);
        }
        continue;
      }
      // Multi-octave noise — MapSettings ayarlanabilir + 2x ölçek (bazı mapler hariç)
      const _sc2 = this._scale2();
      const _hw = ((typeof MapSettings !== 'undefined' && MapSettings.terrainStretch) ? MapSettings.terrainStretch(this.mapId) : 1.5) * _sc2;
      const _ha = ((typeof MapSettings !== 'undefined' && MapSettings.terrainAmp)     ? MapSettings.terrainAmp(this.mapId)     : 1.9) * _sc2;
      const nx = x * cfg.hillFreq / _hw;
      const _sm = (id, dv) => (typeof MapSettings !== 'undefined' && MapSettings.mult) ? MapSettings.mult(this.mapId, id) : dv;
      const _bump = _sm('bumpiness', 1), _rough = _sm('roughness', 1), _micro = _sm('micro_bumps', 1), _dip = _sm('dip_depth', 1);
      let h = (this._noise(nx, rng) * cfg.heightScale
              + this._noise(nx * 2, rng) * cfg.heightScale * 0.35 * _bump
              + this._noise(nx * 4, rng) * cfg.heightScale * 0.18 * _rough
              + this._noise(nx * 8, rng) * cfg.heightScale * 0.10 * _micro) * _ha;
      if (h > 0) h *= _dip;   // çukur derinliği (h>0 = baseline altı/çukur, ekranda y aşağı)

      // Smooth progression
      const targetY = window.innerHeight * cfg.baseY + h;
      dy += (targetY - y) * 0.08;
      dy *= 0.92;
      y += dy;
      y = Math.max(20, Math.min(window.innerHeight * 0.95, y));

      // Flat start for first 1600px, then gentle transition, hills from 2000px
      const flatY = window.innerHeight * 0.65;
      let flatBlend;
      if (x < 1200) {
        flatBlend = 0; // completely flat
      } else if (x < 2000) {
        flatBlend = (x - 1200) / 800; // smooth ramp-in
        flatBlend = flatBlend * flatBlend; // ease-in
      } else {
        flatBlend = 1;
      }
      const finalY = flatY + (y - flatY) * flatBlend;

      this.points.push({ x, y: finalY, surface: cfg.surface });

      // Scatter objects
      if (x > 500) {
        const r = rng();
        if (r < cfg.coinFreq * _cfM) this._addCoin(x, finalY - 40, rng);
        else if (r < cfg.coinFreq * _cfM + 0.02) this._addCoinArc(x, finalY, rng);
        else if (r < cfg.coinFreq * _cfM + 0.02 + cfg.fuelFreq * _ffM) this._addFuel(x, finalY - 50);
      }
    }
    return this;
  },

  // Özel harita profilleri: DAĞ (tırtıklı/dik) ve HOTWHEELS (100km'de dik yumuşak yokuş)
  _specialY(worldX) {
    const H = window.innerHeight;
    const flatY = H * 0.65;
    if (this.mapId === 'dag') {
      if (worldX < 1400) return flatY;
      const x = worldX;
      const big  = Math.sin(x*0.0011)*230 + Math.sin(x*0.0007+1.3)*170;
      const mid  = Math.sin(x*0.0045+0.6)*95;
      const jag  = (Math.abs(((x*0.011)%2)-1)*2-1)*90;   // testere dişi tırtık (engebe)
      const jag2 = Math.sin(x*0.028)*30;
      let y = H*0.5 - (big + mid + jag + jag2);
      if (worldX < 2200) { const bl=(worldX-1400)/800; y = flatY + (y-flatY)*bl*bl; }
      return Math.min(H*0.9, y);   // üst sınır yok → yüksek/tırtıklı dağ duvar olmaz
    }
    if (this.mapId === 'hotwheels') {
      if (worldX < 1400) return flatY;
      // Loop halkaları her 10 km (Loops modülü). Segment ortasında ÇOK DİK + ÇOK UZUN dev yokuş.
      const seg = 20000;                                 // tepeler %100 daha UZUN → aralık da 2x (birbirine girmez)
      const phase = ((worldX % seg) + seg) % seg;
      const hillC = 10000, hillW = 18000, hillH = 15960; // %100 daha UZUN + %5 daha DİK dev yokuş
      let hill = 0;
      const dxh = phase - hillC;
      if (Math.abs(dxh) < hillW / 2) {
        hill = hillH * 0.5 * (1 + Math.cos(Math.PI * dxh / (hillW / 2)));   // yumuşak büyük tepe
      }
      const wave = Math.sin(worldX * 0.0007) * 12;
      let y = flatY - hill - wave;
      if (worldX < 2200) { const bl = (worldX - 1400) / 800; y = flatY + (y - flatY) * bl * bl; }
      return Math.min(H * 0.9, y);   // ÜST SINIR YOK → yüksek yokuş duvar olmaz, kamera yukarı kaydırır
    }
    if (this.mapId === 'rollercoaster') {
      // Pürüzsüz, sürekli hızlı tren dalgaları (büyük iniş-çıkışlar)
      if (worldX < 1400) return flatY;
      const w = Math.sin(worldX * 0.0009) * 280 + Math.sin(worldX * 0.0021 + 1) * 150 + Math.sin(worldX * 0.0045) * 60;
      let y = flatY - w;
      if (worldX < 2200) { const bl = (worldX - 1400) / 800; y = flatY + (y - flatY) * bl * bl; }
      return Math.min(H * 0.9, y);
    }
    return null;
  },

  // 2x ölçek çarpanı — otoyol/mağara/mars/neon şehir hariç tüm proc. maplerde
  _NO_SCALE2: { otoyol:1, cave:1, mars:1, neon_city:1 },
  _scale2() { return this._NO_SCALE2[this.mapId] ? 1 : 1.25; },

  // Stateless prosedürel yükseklik — herhangi bir x için çalışır (sonsuz terrain)
  _proceduralY(worldX) {
    const sp = this._specialY(worldX);
    if (sp !== null) return sp;
    const cfg  = this._cfg || this.MAPS[this.mapId] || this.MAPS.countryside;
    const seed = this._seed || 42;
    if (!cfg.heightScale || cfg.heightScale === 0) {
      return window.innerHeight * (cfg.baseY || 0.65); // dümdüz (otoyol vb.)
    }
    const baseY = window.innerHeight * cfg.baseY;
    const noise = (freq, amp, off) => {
      const nx = worldX * freq + off;
      const ix = Math.floor(nx) | 0;
      const fx = nx - ix;
      const t  = fx * fx * (3 - 2 * fx);
      const s  = (seed * 7 + off * 3) | 0;
      const a  = (this._hash(ix + s) - 0.5) * 2 * amp;
      const b  = (this._hash(ix + 1 + s) - 0.5) * 2 * amp;
      return a + (b - a) * t;
    };
    const _sc2b = this._scale2();
    const _S  = ((typeof MapSettings !== 'undefined' && MapSettings.terrainStretch) ? MapSettings.terrainStretch(this.mapId) : 1.5) * _sc2b;
    const _A  = ((typeof MapSettings !== 'undefined' && MapSettings.terrainAmp)     ? MapSettings.terrainAmp(this.mapId)     : 1.9) * _sc2b;
    const _sm2 = (id) => (typeof MapSettings !== 'undefined' && MapSettings.mult) ? MapSettings.mult(this.mapId, id) : 1;
    const _bump2 = _sm2('bumpiness'), _rough2 = _sm2('roughness'), _micro2 = _sm2('micro_bumps'), _dip2 = _sm2('dip_depth');
    let h = (noise(cfg.hillFreq / _S, cfg.heightScale, 0)
            + noise(cfg.hillFreq * 2 / _S, cfg.heightScale * 0.35 * _bump2, 1000)
            + noise(cfg.hillFreq * 4 / _S, cfg.heightScale * 0.18 * _rough2, 2000)
            + noise(cfg.hillFreq * 8 / _S, cfg.heightScale * 0.10 * _micro2, 3000)) * _A;
    if (h > 0) h *= _dip2;
    return Math.max(20, Math.min(window.innerHeight * 0.95, baseY + h));
  },

  // Terrain'i belirtilen worldX'e kadar dinamik olarak genişlet
  _expandTo(toWorldX) {
    if (!this.points.length) return;
    const target = toWorldX + 3000; // biraz ilerisini de üret
    // GÜVENLİK: segmentSize bozuk (0/NaN/negatif) olursa x hiç büyümez →
    // sonsuz döngü + donma olur. Geçerli bir adım garanti et.
    const seg = (typeof this.segmentSize === 'number' && this.segmentSize > 0) ? this.segmentSize : 20;
    // ── PERF(31 Tmz): ERKEN ÇIKIŞ ────────────────────────────────────────────
    // Bu fonksiyon `draw()` içinden HER KAREDE çağrılır ama arazi %99,9 oranında
    // zaten yeterince uzundur. Eski kod bu durumda bile iki `MapSettings` araması
    // yapıyordu (`coinFreqMult`+`fuelFreqMult`; ölçüldü ~0,4 µs/çağrı, COMMON
    // dizisinde doğrusal arama). Aşağıdaki koşul döngünün İLK adımda `break`
    // etmesiyle BİREBİR aynı (`x = (i-1)*seg > target`) → davranış değişmez.
    if ((this.points.length - 1) * seg > target) return;
    const cfg  = this._cfg || this.MAPS[this.mapId] || this.MAPS.countryside;
    const _cfM = (typeof MapSettings !== 'undefined' ? MapSettings.coinFreqMult(this.mapId) : 1);
    const _ffM = (typeof MapSettings !== 'undefined' ? MapSettings.fuelFreqMult(this.mapId) : 1);
    let i = this.points.length;
    let addedCoins = 0;
    // Bu çağrıda üretilecek maksimum nokta sayısı (target'a göre) + küçük tampon.
    const maxI = i + Math.ceil((target - (i - 1) * seg) / seg) + 16;
    while (i <= maxI) {
      const x = (i - 1) * seg;
      if (x > target) break;
      const y = this._proceduralY(x);
      this.points.push({ x, y, surface: cfg.surface });
      // Coin ve yakıt serp
      const rval = this._hash((i * 31 + (this._seed || 42) * 13) | 0);
      if (x > 500 && rval < (cfg.coinFreq || 0.05) * _cfM) {
        this.objects.push({ type:'coin', x, y: y - 40, collected:false, value:1, radius:14 });
      } else if (x > 500 && rval < (cfg.coinFreq || 0.05) * _cfM + (cfg.fuelFreq || 0.01) * _ffM) {
        this.objects.push({ type:'fuel', x, y: y - 50, collected:false, radius:18 });
      }
      i++;
    }
  },

  _rng(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  },

  _noise(x, rng) {
    // Simple value noise
    const ix = Math.floor(x);
    const fx = x - ix;
    const a = this._hash(ix);
    const b = this._hash(ix + 1);
    const t = fx * fx * (3 - 2 * fx);
    return a + (b - a) * t - 0.5;
  },

  _hash(n) {
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = ((n >> 16) ^ n) * 0x45d9f3b;
    n = (n >> 16) ^ n;
    return (n & 0xffff) / 0xffff;
  },

  _addCoin(x, y, rng) {
    // Single coin or small arc
    const count = rng() > 0.7 ? 3 : 1;
    for (let i = 0; i < count; i++) {
      this.objects.push({ type: 'coin', x: x + i * 35, y: y - i * 20, collected: false, value: 1, radius: 14 });
    }
  },

  _addCoinArc(x, baseY, rng) {
    // Arc of 5 coins
    for (let i = 0; i < 5; i++) {
      const ax = x + i * 45;
      const ay = baseY - 40 - Math.sin((i / 4) * Math.PI) * 80;
      this.objects.push({ type: 'coin', x: ax, y: ay, collected: false, value: 1, radius: 14 });
    }
  },

  _addFuel(x, y) {
    this.objects.push({ type: 'fuel', x, y, collected: false, radius: 18 });
  },

  getYAt(worldX) {
    const idx = (worldX / this.segmentSize) + 1;
    const i = Math.floor(idx);
    const t = idx - i;
    if (i < 0) return this.points[0] ? this.points[0].y : 400;
    if (i >= this.points.length - 1) return this._proceduralY(worldX); // sonsuz terrain
    const p0 = this.points[i];
    const p1 = this.points[i + 1];
    if (!p0 || !p1) return 400;
    // Cubic interpolation for smooth terrain
    const p_1 = this.points[Math.max(0, i-1)];
    const p2  = this.points[Math.min(this.points.length-1, i+2)];
    return this._cubicInterp(p_1.y, p0.y, p1.y, p2.y, t);
  },

  _cubicInterp(y0, y1, y2, y3, t) {
    const a = -0.5*y0 + 1.5*y1 - 1.5*y2 + 0.5*y3;
    const b =      y0 - 2.5*y1 + 2*y2   - 0.5*y3;
    const c = -0.5*y0           + 0.5*y2;
    const d = y1;
    return a*t*t*t + b*t*t + c*t + d;
  },

  getNormalAt(worldX) {
    const dx = 2;
    const y1 = this.getYAt(worldX - dx);
    const y2 = this.getYAt(worldX + dx);
    const slope = (y2 - y1) / (dx * 2);
    const len = Math.sqrt(1 + slope * slope);
    return { x: -slope / len, y: 1 / len };
  },

  getSurfaceAt(worldX) {
    const cfg = this.MAPS[this.mapId];
    // Beach: water surface near sea level
    if (this.mapId === 'beach') {
      const groundY = this.getYAt(worldX);
      if (groundY > window.innerHeight * 0.72) return 'water';
    }
    if (this.mapId === 'winter') {
      const groundY = this.getYAt(worldX);
      // Occasional ice patches
      const iceCheck = Math.sin(worldX * 0.05) > 0.7;
      return iceCheck ? 'ice' : 'snow';
    }
    // Arctic: full ice surface
    if (this.mapId === 'arctic') {
      return 'ice';
    }
    // Rock surfaces: mountains and cave
    if (this.mapId === 'mountains' || this.mapId === 'cave') {
      return 'rock';
    }
    // Asfalt / city road
    if (this.mapId === 'city') {
      return 'asfalt';
    }
    // Mud surfaces: jungle and swamp
    if (this.mapId === 'jungle' || this.mapId === 'swamp') {
      return 'mud';
    }
    return cfg ? cfg.surface : 'dirt';
  },

  checkCollectibles(vehicle) {
    const collected = [];
    // BUGFIX(27 Tmz): eski test sabit `radius+25`(=39px) yariçapla aracin MERKEZINE bakiyordu;
    //   araç gövdesi (jeep w=110 -> ±55px) sikkenin üstünden geçse bile merkez 39px'den uzak
    //   kalinca sikke ALINMIYORDU ("araba altinin içine giriyor, altin alinmiyor"). Artik
    //   sikke, aracin DÖNÜK GÖVDE DIKDÖRTGENINE değdigi an toplanir (eski test taban olarak kalir).
    const hw = (vehicle.width  || 100) / 2;
    const hh = (vehicle.height || 50)  / 2;
    const ang = vehicle.angle || 0;
    const cos = Math.cos(-ang), sin = Math.sin(-ang);
    // ── PERF(31 Tmz): KESİN (davranışı değiştirmeyen) ön eleme ──────────────
    // Eskiden HER karede TÜM sikke/yakıt dizisi için iki `Math.sqrt` + döndürme
    // matematiği çalışıyordu (ölçüldü: 704 nesne/kare, %81'i zaten toplanmış).
    // Toplanma iki koşuldan birine bağlı:
    //   (a) bodyDist < r     → merkeze uzaklık en fazla √(hw²+hh²) + r
    //   (b) centerDist < r+25 → merkeze uzaklık en fazla r + 25
    // √(hw²+hh²) ≤ hw+hh olduğundan `hw + hh + r + 25` HER İKİSİ için de
    // ÜST SINIRDIR; bu kutunun dışındaki nesne matematiksel olarak toplanamaz.
    // Yani eleme yalnız SONUCU DEĞİŞMEYEN adayları atlar (sqrt sayısı ~0'a iner).
    const _kutu = hw + hh + 25;
    for (const obj of this.objects) {
      if (obj.collected) continue;
      const dx = obj.x - vehicle.x;
      const dy = obj.y - vehicle.y;
      const _r = _kutu + obj.radius;
      if (dx > _r || dx < -_r || dy > _r || dy < -_r) continue;   // kesin dış eleme
      // Sikkeyi aracin YEREL (dönmemis) çerçevesine tasi, gövde dikdörtgenine en yakin noktaya uzakligi bul.
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      const nx = Math.max(-hw, Math.min(hw, lx));
      const ny = Math.max(-hh, Math.min(hh, ly));
      const bodyDist = Math.sqrt((lx - nx) * (lx - nx) + (ly - ny) * (ly - ny));
      const centerDist = Math.sqrt(dx * dx + dy * dy);
      if (bodyDist < obj.radius || centerDist < obj.radius + 25) {
        obj.collected = true;
        collected.push(obj);
      }
    }
    return collected;
  },

  draw(ctx, camera) {
    const cfg = this.MAPS[this.mapId] || this.MAPS.countryside;
    // Dinamik terrain genişletme — oyuncu ilerledikçe yeni terrain üret
    const visibleEnd = camera.x + (camera.width || 1280) / (camera.zoom || 1) + 5000;
    this._expandTo(visibleEnd);
    const startX = Math.max(0, Math.floor((camera.x - 50) / this.segmentSize));
    const endX   = Math.min(this.points.length - 1, Math.ceil((camera.x + (camera.width||1280) / (camera.zoom||1) + 50) / this.segmentSize) + 1);
    if (endX <= startX) return;

    const lastP  = this.points[Math.min(endX, this.points.length-1)];
    const firstP = this.points[startX];
    const gy     = camera.y;
    const t      = Date.now() * 0.001;
    // Dolguyu her zaman ekranın çok altına indir → yüksek dağlarda arkada boşluk kalmaz
    const _fillBottom = camera.y + (camera.height / (camera.zoom || 1)) + 3000;

    // ── PERF(31 Tmz): AYNI arazi çizgisi kare başına BEŞ KEZ tepe tepe
    //   yeniden çiziliyordu (dolgu · kırpma · topsoil bandı · tepe ışığı ·
    //   kontur) → 5×N `lineTo`. Artık yol BİR KEZ `Path2D`'ye kurulur, beş
    //   çizim aynı nesneyi tekrar kullanır: 5N → N. Çıkan piksel AYNI
    //   (`fill/stroke/clip(path)` geçerli dönüşümü ve stilleri aynen kullanır).
    //   🔴 Path2D yoksa (çok eski tarayıcı / node testi) ESKİ yol izlenir —
    //      iki dal da aynı geometriyi üretir, `_yolCizgi/_yolDolgu` ile paylaşılır.
    const p2 = (typeof Path2D !== 'undefined');
    let pLine = null, pFill = null;
    if (p2) {
      pLine = new Path2D();
      pLine.moveTo(firstP.x, firstP.y);
      for (let i = startX; i <= endX; i++) { const p = this.points[i]; if (!p) break; pLine.lineTo(p.x, p.y); }
      pFill = new Path2D(pLine);
      pFill.lineTo(lastP.x, _fillBottom);
      pFill.lineTo(firstP.x, _fillBottom);
      pFill.closePath();
    }

    // ── Ground fill with layered gradient ─────────────────────────────────
    if (!p2) this._yolDolgu(ctx, startX, endX, firstP, lastP, _fillBottom);

    const grad = ctx.createLinearGradient(0, gy, 0, gy + 500);
    grad.addColorStop(0,   cfg.groundColor);
    grad.addColorStop(0.12, cfg.groundColor2 || cfg.groundColor);
    grad.addColorStop(0.4, this._darken(cfg.groundColor2 || cfg.groundColor, 0.6));
    grad.addColorStop(1,   '#0a0a0a');
    ctx.fillStyle = grad;
    if (p2) ctx.fill(pFill); else ctx.fill();

    // ── Topsoil surface stripe — a brighter per-biome band hugging the crest ──
    // Clipped to the ground body so the wide stroke only shows just below the
    // terrain line, giving a lit topsoil band + a crisp sunlit crest highlight.
    ctx.save();
    if (p2) ctx.clip(pFill);
    else { this._yolDolgu(ctx, startX, endX, firstP, lastP, _fillBottom); ctx.clip(); }
    // Wide topsoil band (lighter tone of the biome ground colour)
    if (!p2) this._yolCizgi(ctx, startX, endX, firstP);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 26;
    ctx.strokeStyle = this._lighten(cfg.groundColor, 0.18);
    if (p2) ctx.stroke(pLine); else ctx.stroke();
    // Thin brighter sub-band for a soft gradient into the body
    ctx.globalAlpha = 0.30;
    ctx.lineWidth = 12;
    ctx.strokeStyle = this._lighten(cfg.groundColor, 0.32);
    if (p2) ctx.stroke(pLine); else ctx.stroke();
    ctx.restore();
    // Sunlit crest highlight riding exactly on the terrain edge
    ctx.save();
    if (!p2) this._yolCizgi(ctx, startX, endX, firstP);
    ctx.globalAlpha = 0.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = this._lighten(cfg.groundColor, 0.55);
    if (p2) ctx.stroke(pLine); else ctx.stroke();
    ctx.restore();

    // ── Surface texture layer ─────────────────────────────────────────────
    const surface = cfg.surface || 'dirt';
    this._drawSurfaceTexture(ctx, startX, endX, surface, camera, t);

    // ── Outline ───────────────────────────────────────────────────────────
    if (!p2) this._yolCizgi(ctx, startX, endX, firstP);
    // PERF(31 Tmz): bu tablo kare başına yeniden kuruluyordu (14 nesne/kare) → sabit.
    const os = this._OUTLINE_STYLES[surface] || this._outlineFallback(cfg.groundColor);
    ctx.strokeStyle = os.col; ctx.lineWidth = os.lw;
    if (p2) ctx.stroke(pLine); else ctx.stroke();

    // ── Scenery props (trees, rocks, signs) ──────────────────────────────
    this._drawScenery(ctx, startX, endX, camera, t);

    // ── Foreground ambiance (drifting motes + swaying tufts) ─────────────
    this._drawForegroundAmbiance(ctx, startX, endX, camera, t);

    // ── Collectibles ─────────────────────────────────────────────────────
    this._drawCollectibles(ctx);
  },

  // ── PERF(31 Tmz) yardımcıları ────────────────────────────────────────────
  // Arazi çizgisini ctx'in KENDİ yoluna kurar (Path2D yoksa kullanılan eski yol).
  _yolCizgi(ctx, startX, endX, firstP) {
    ctx.beginPath();
    ctx.moveTo(firstP.x, firstP.y);
    for (let i = startX; i <= endX; i++) { const p = this.points[i]; if (!p) break; ctx.lineTo(p.x, p.y); }
  },
  // Arazi çizgisi + ekran altına inen kapalı gövde.
  _yolDolgu(ctx, startX, endX, firstP, lastP, fillBottom) {
    this._yolCizgi(ctx, startX, endX, firstP);
    ctx.lineTo(lastP.x, fillBottom);
    ctx.lineTo(firstP.x, fillBottom);
    ctx.closePath();
  },
  // Kontur stilleri — SABİT tablo (eskiden `draw()` içinde kare başına kuruluyordu).
  _OUTLINE_STYLES: {
    rock: { col: '#909090', lw: 4 },
    asfalt: { col: '#444', lw: 5 },
    ice: { col: '#c8f0ff', lw: 3 },
    mud: { col: '#3a2a10', lw: 4 },
    sand: { col: '#d4a04a', lw: 3 },
    snow: { col: '#ddeeff', lw: 3 },
    metal: { col: '#6688aa', lw: 4 },
    lava: { col: '#ff4400', lw: 4 },
    water: { col: '#0066aa', lw: 3 },
    moon: { col: '#8888aa', lw: 3 },
    neon: { col: '#00ffcc', lw: 3 },
    dust: { col: '#aa8855', lw: 3 },
    canyon: { col: '#884422', lw: 4 },
  },
  // Bilinmeyen yüzey → biyomun kendi zemin rengi. Tek nesne yeniden kullanılır
  // (yalnız `col`/`lw` okunur, hiçbir yerde saklanmaz).
  _outlineFallbackObj: { col: '#000000', lw: 3 },
  _outlineFallback(groundColor) {
    this._outlineFallbackObj.col = groundColor;
    this._outlineFallbackObj.lw = 3;
    return this._outlineFallbackObj;
  },

  _darken(col, factor) {
    // Simple darkening — parse hex and multiply
    try {
      const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
      return `rgb(${Math.floor(r*factor)},${Math.floor(g*factor)},${Math.floor(b*factor)})`;
    } catch(e) { return col; }
  },

  _lighten(col, amt) {
    // Blend a hex colour toward white by amt (0..1). Additive helper for surface highlights.
    try {
      const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
      const lr = Math.min(255, Math.round(r + (255 - r) * amt));
      const lg = Math.min(255, Math.round(g + (255 - g) * amt));
      const lb = Math.min(255, Math.round(b + (255 - b) * amt));
      return `rgb(${lr},${lg},${lb})`;
    } catch(e) { return col; }
  },

  // PERF(31 Tmz): eskiden kare başına yeniden kurulan nesne literali → sabit tablo.
  _TEX_SPACING: {
    asfalt: 120, ice: 80, snow: 60, rock: 90,
    sand: 70, lava: 100, neon: 80, moon: 110, metal: 48,
    grass: 46, dirt: 66, mud: 74, water: 90
  },

  _drawSurfaceTexture(ctx, startX, endX, surface, camera, t) {
    // Map-specific surface detail overlays
    const spacing = this._TEX_SPACING[surface] || 0;
    if (!spacing) return;

    // Deterministic per-index pseudo-random in [0,1) — stable across frames
    const _rnd = (n) => { const s = Math.sin(n * 91.7 + 41.3) * 43758.5453; return s - Math.floor(s); };

    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = startX; i < endX; i += Math.max(1, Math.floor(spacing / this.segmentSize))) {
      const p = this.points[i];
      if (!p) break;
      const nx = i + 1 < this.points.length ? this.points[i+1] : p;
      const ang = Math.atan2(nx.y - p.y, nx.x - p.x);
      const r1 = _rnd(i), r2 = _rnd(i + 7.3), r3 = _rnd(i + 19.1);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      if (surface === 'asfalt') {
        // Road center dashes
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.setLineDash([20, 25]);
        ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(60,-8); ctx.stroke();
        ctx.setLineDash([]);
        // Fine asphalt grain — scattered gravel specks
        ctx.fillStyle = 'rgba(20,20,24,0.55)';
        for (let g = 0; g < 4; g++) {
          const gx = _rnd(i + g * 3.1) * 60;
          ctx.fillRect(gx, -6 + _rnd(i + g) * 8, 1.5, 1.5);
        }
        // Subtle worn tyre-line sheen along the tarmac
        ctx.strokeStyle = 'rgba(150,150,160,0.18)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(60, -2); ctx.stroke();
        // Occasional crack in the surface
        if (r1 > 0.6) {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(10 + r2 * 30, -1);
          ctx.lineTo(16 + r2 * 30, -5 - r3 * 3);
          ctx.lineTo(22 + r2 * 30, -2); ctx.stroke();
        }
      } else if (surface === 'ice') {
        // Ice cracks — branching splinter
        ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(15,-8); ctx.lineTo(25,-3); ctx.stroke();
        ctx.strokeStyle = 'rgba(210,240,255,0.6)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(15, -8); ctx.lineTo(20, -14);
        ctx.moveTo(15, -8); ctx.lineTo(9, -13); ctx.stroke();
        // Glassy highlight patch + frosty sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.ellipse(30 + r1 * 20, -3, 10, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(8 + r2 * 40, -6 - r3 * 4, 1.2, 0, Math.PI*2); ctx.fill();
      } else if (surface === 'snow') {
        // Snow bumps (soft drift mound)
        ctx.fillStyle = '#ddeeff';
        ctx.beginPath(); ctx.ellipse(0, -4, 12, 4, 0, 0, Math.PI*2); ctx.fill();
        // Bright crest highlight on the drift
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.ellipse(-2, -6, 6, 1.8, 0, 0, Math.PI*2); ctx.fill();
        // Cool shadow tuck beneath
        ctx.fillStyle = 'rgba(150,180,220,0.3)';
        ctx.beginPath(); ctx.ellipse(3, -1.5, 9, 2, 0, 0, Math.PI*2); ctx.fill();
        // Glittering snow sparkles
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.arc(-14 + _rnd(i + s * 5.7) * 28, -3 - _rnd(i + s) * 4, 0.9, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (surface === 'rock') {
        // Rock cracks
        ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0,-2); ctx.lineTo(10,-6); ctx.lineTo(16,-2); ctx.stroke();
        // Faceted stone plates with light/shadow edges
        ctx.strokeStyle = 'rgba(30,30,30,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, -2); ctx.lineTo(26, -7); ctx.lineTo(34, -3);
        ctx.moveTo(-2, -5); ctx.lineTo(4, -9); ctx.stroke();
        // Highlight along top edges of a plate
        ctx.strokeStyle = 'rgba(180,180,180,0.4)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(16, -3); ctx.stroke();
        // Pitted speckles / mineral flecks
        ctx.fillStyle = 'rgba(40,40,40,0.5)';
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.arc(_rnd(i + s * 4.4) * 40, -2 - _rnd(i + s) * 5, 1, 0, Math.PI*2);
          ctx.fill();
        }
        // Occasional crusty lichen patch clinging to the stone
        if (r2 > 0.62) {
          ctx.fillStyle = 'rgba(110,140,70,0.35)';
          const lx = 20 + r1 * 22;
          for (let lp = 0; lp < 4; lp++) {
            ctx.beginPath();
            ctx.arc(lx + _rnd(i + lp * 2.9) * 8 - 4, -3 - _rnd(i + lp) * 3, 1.4 + _rnd(i + lp) * 1.4, 0, Math.PI*2);
            ctx.fill();
          }
        }
      } else if (surface === 'lava') {
        // Lava glow (pulsing molten pool)
        ctx.globalAlpha = 0.15 + Math.sin(t*3+i)*0.1;
        ctx.fillStyle = '#FF4400';
        ctx.beginPath(); ctx.ellipse(0,-2,14,5,0,0,Math.PI*2); ctx.fill();
        // Bright molten core
        ctx.globalAlpha = 0.3 + Math.sin(t*4 + i*0.7)*0.15;
        ctx.fillStyle = '#ffd060';
        ctx.beginPath(); ctx.ellipse(0, -2, 7, 2, 0, 0, Math.PI*2); ctx.fill();
        // Cracked crust seams glowing between plates
        ctx.globalAlpha = 0.4 + Math.sin(t*2 + i)*0.2;
        ctx.strokeStyle = '#ff8a1e'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, -1); ctx.lineTo(-4, -4); ctx.lineTo(6, -1); ctx.lineTo(14, -4);
        ctx.stroke();
        // Drifting embers rising from the flow
        ctx.globalAlpha = 0.35 + Math.sin(t*5 + i)*0.25;
        ctx.fillStyle = '#ffcf6a';
        const ey = -6 - ((t * 22 + i * 13) % 20);
        ctx.beginPath(); ctx.arc(_rnd(i) * 24 - 12, ey, 1.4, 0, Math.PI*2); ctx.fill();
      } else if (surface === 'neon') {
        // Neon grid lines
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(40,-3); ctx.stroke();
        // Glowing outer bloom on the strip
        ctx.globalAlpha = 0.35 + Math.sin(t*3 + i*0.5)*0.2;
        ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(40,-3); ctx.stroke();
        ctx.globalAlpha = 0.25;
        // Perpendicular grid ticks (perspective-ish rungs)
        ctx.strokeStyle = '#ff00e6'; ctx.lineWidth = 1;
        for (let g = 0; g < 3; g++) {
          const gx = g * 14 + 4;
          ctx.beginPath(); ctx.moveTo(gx, -1); ctx.lineTo(gx, -7); ctx.stroke();
        }
        // Travelling data pulse along the line
        ctx.globalAlpha = 0.6 + Math.sin(t*6 + i)*0.3;
        ctx.fillStyle = '#eafffb';
        ctx.beginPath(); ctx.arc((t * 60 + i * 20) % 40, -3, 1.6, 0, Math.PI*2); ctx.fill();
      } else if (surface === 'moon') {
        // Moon dust sparkles
        ctx.fillStyle = 'rgba(200,200,255,0.4)';
        ctx.beginPath(); ctx.arc(0,-2,2,0,Math.PI*2); ctx.fill();
        // Small impact crater — rim highlight + shadowed bowl
        const cx = 6 + r1 * 30, cr = 4 + r2 * 4;
        ctx.fillStyle = 'rgba(60,60,80,0.35)';
        ctx.beginPath(); ctx.ellipse(cx, -3, cr, cr * 0.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(220,220,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, -3.5, cr, cr * 0.5, 0, Math.PI, Math.PI*2); ctx.stroke();
        // Faint regolith speckle field
        ctx.fillStyle = 'rgba(180,180,210,0.3)';
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.arc(_rnd(i + s * 6.1) * 40, -1 - _rnd(i + s) * 4, 0.8, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (surface === 'grass') {
        // Waving grass blade tufts
        ctx.strokeStyle = '#2f7d1e'; ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        for (let b = 0; b < 5; b++) {
          const bx = b * 9 + r1 * 4;
          const sway = Math.sin(t * 1.6 + i + b) * 2;   // gentle breeze
          const bh = 7 + _rnd(i + b * 2.3) * 6;
          ctx.strokeStyle = _rnd(i + b) > 0.5 ? '#3d9e2a' : '#2a6e1a';
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.quadraticCurveTo(bx + sway * 0.5, -bh * 0.6, bx + sway, -bh);
          ctx.stroke();
        }
        // A tiny wildflower dot now and then
        if (r2 > 0.7) {
          ctx.fillStyle = r3 > 0.5 ? '#ffe14d' : '#ff7ac2';
          ctx.beginPath(); ctx.arc(r1 * 40, -8 - r3 * 4, 1.6, 0, Math.PI*2); ctx.fill();
          // Petal ring around the flower centre
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          for (let pt = 0; pt < 4; pt++) {
            const pa = pt * Math.PI * 0.5 + r2 * 2;
            ctx.beginPath();
            ctx.arc(r1 * 40 + Math.cos(pa) * 2.2, -8 - r3 * 4 + Math.sin(pa) * 2.2, 0.9, 0, Math.PI*2);
            ctx.fill();
          }
        }
        // Occasional low clover trefoil nestled in the turf
        if (r3 > 0.72) {
          ctx.fillStyle = '#2f7d1e';
          const clx = 6 + r2 * 34;
          for (let cl = 0; cl < 3; cl++) {
            const cla = -Math.PI * 0.5 + (cl - 1) * 0.8;
            ctx.beginPath();
            ctx.ellipse(clx + Math.cos(cla) * 2.4, -2 + Math.sin(cla) * 2.4, 1.8, 1.2, cla, 0, Math.PI*2);
            ctx.fill();
          }
        }
        ctx.lineCap = 'butt';
      } else if (surface === 'dirt') {
        // Scattered pebbles and gravel of varied tone
        for (let g = 0; g < 5; g++) {
          const gx = g * 9 + _rnd(i + g) * 4;
          const gy = -1 - _rnd(i + g * 2.7) * 4;
          const gr = 1 + _rnd(i + g * 1.9) * 2;
          const shade = 40 + Math.floor(_rnd(i + g) * 50);
          ctx.fillStyle = `rgba(${shade + 40},${shade + 20},${shade},0.6)`;
          ctx.beginPath(); ctx.ellipse(gx, gy, gr, gr * 0.7, 0, 0, Math.PI*2); ctx.fill();
        }
        // Little clumps / soil clods with shadow
        ctx.fillStyle = 'rgba(60,42,20,0.4)';
        ctx.beginPath(); ctx.ellipse(6 + r1 * 30, -2, 5, 2, 0, 0, Math.PI*2); ctx.fill();
        // Dry crack line
        if (r2 > 0.55) {
          ctx.strokeStyle = 'rgba(30,20,8,0.5)'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(4 + r3 * 30, -1); ctx.lineTo(12 + r3 * 30, -3); ctx.lineTo(20 + r3 * 30, -1);
          ctx.stroke();
        }
      } else if (surface === 'sand') {
        // Rippling dune waves
        ctx.strokeStyle = 'rgba(210,170,90,0.5)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= 60; x += 4) {
          const yy = -3 + Math.sin(x * 0.25 + i) * 2;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        // Highlighted crest above the ripple
        ctx.strokeStyle = 'rgba(255,232,170,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= 60; x += 4) {
          const yy = -5 + Math.sin(x * 0.25 + i) * 2;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        // Fine grain sparkle
        ctx.fillStyle = 'rgba(255,245,210,0.5)';
        for (let s = 0; s < 3; s++) {
          ctx.beginPath();
          ctx.arc(_rnd(i + s * 3.7) * 55, -2 - _rnd(i + s) * 3, 0.7, 0, Math.PI*2);
          ctx.fill();
        }
      } else if (surface === 'mud') {
        // Wet mud puddles with glossy sheen
        ctx.fillStyle = 'rgba(30,22,8,0.4)';
        ctx.beginPath(); ctx.ellipse(4 + r1 * 26, -2, 9, 3, 0, 0, Math.PI*2); ctx.fill();
        // Reflective wet highlight on the puddle
        ctx.fillStyle = 'rgba(160,150,110,0.35)';
        ctx.beginPath(); ctx.ellipse(2 + r1 * 26, -3, 5, 1.3, 0, 0, Math.PI*2); ctx.fill();
        // Squelchy bubbles / clumps
        ctx.fillStyle = 'rgba(70,52,24,0.55)';
        for (let b = 0; b < 3; b++) {
          const bx = _rnd(i + b * 5.5) * 55;
          ctx.beginPath(); ctx.arc(bx, -1.5 - _rnd(i + b) * 2, 1.3 + _rnd(i + b) * 1.2, 0, Math.PI*2);
          ctx.fill();
        }
        // Tyre-track drag smear
        ctx.strokeStyle = 'rgba(20,14,4,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(50, -1.5); ctx.stroke();
      } else if (surface === 'water') {
        // Rolling surface waves (animated)
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = 'rgba(120,200,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= 70; x += 4) {
          const yy = -3 + Math.sin(x * 0.2 + t * 2 + i) * 2.5;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        // Foamy crest highlight
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(240,255,255,0.6)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= 70; x += 4) {
          const yy = -5 + Math.sin(x * 0.2 + t * 2 + i) * 2.5;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
        // Shimmering glint travelling across the surface
        ctx.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.3;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc((t * 40 + i * 15) % 70, -3, 1.4, 0, Math.PI*2); ctx.fill();
      } else if (surface === 'metal') {
        // HOT WHEELS track: parlak turuncu şerit + kenar rayları + akan enerji çizgisi (animasyon)
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(52, -7); ctx.stroke();
        ctx.strokeStyle = '#7a2f00'; ctx.lineWidth = 2;   // kenar rayları
        ctx.beginPath(); ctx.moveTo(0, -3);  ctx.lineTo(52, -3);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(52, -11); ctx.stroke();
        // Akan enerji çizgisi — kayan kesikler + parıltı (animasyon)
        ctx.globalAlpha = 0.5 + Math.sin(t * 5 + i * 0.6) * 0.3;
        ctx.strokeStyle = '#fff3d0'; ctx.lineWidth = 2;
        ctx.setLineDash([14, 22]);
        ctx.lineDashOffset = -((t * 140) % 36);
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(52, -7); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // PERF(31 Tmz): 🔴 bu tablo `_drawScenery` içinde KARE BAŞINA yeniden
  //   kuruluyordu → 51 adet `.bind(this)` + 1 nesne literali = 52 ayırma/kare
  //   (1.800 karede 91.800 bağlı fonksiyon). `this` her zaman Terrain olduğu
  //   için tablo BİR KEZ kurulup saklanabilir; sonuç birebir aynı.
  _sceneryFns: null,
  _sceneryMap() {
    if (this._sceneryFns) return this._sceneryFns;
    const mapScenery = {
      countryside: this._sceneryCountryside.bind(this),
      desert:      this._sceneryDesert.bind(this),
      winter:      this._sceneryWinter.bind(this),
      beach:       this._sceneryBeach.bind(this),
      city:        this._sceneryCity.bind(this),
      jungle:      this._sceneryJungle.bind(this),
      mars:        this._sceneryMars.bind(this),
      neon_city:   this._sceneryNeon.bind(this),
      wasteland:   this._sceneryWasteland.bind(this),
      canyon:      this._sceneryCanyon.bind(this),
      crystal_cave:this._sceneryCrystalCave.bind(this),
      cave:        this._sceneryCave.bind(this),
      skyland:     this._scenerySkyland.bind(this),
      cyber_grid:  this._sceneryCyberGrid.bind(this),
      stormpeak:   this._sceneryStormpeak.bind(this),
      mushroom:    this._sceneryMushroom.bind(this),
      ruins:       this._sceneryRuins.bind(this),
      autumn:      this._sceneryAutumn.bind(this),
      savanna:     this._scenerySavanna.bind(this),
      glacier:     this._sceneryGlacier.bind(this),
      swamp:       this._scenerySwamp.bind(this),
      lava_river:  this._sceneryLavaRocks.bind(this),
      mountains:   this._sceneryMountains.bind(this),
      arctic:      this._sceneryArctic.bind(this),
      highland:    this._sceneryHighland.bind(this),
      volcano:     this._sceneryVolcano.bind(this),
      underwater:  this._sceneryUnderwater.bind(this),
      moon:        this._sceneryMoon.bind(this),
      otoyol:      this._sceneryOtoyol.bind(this),
      dag:         this._sceneryDag.bind(this),
      hotwheels:   this._sceneryHotwheels.bind(this),
      construction:this._sceneryConstruction.bind(this),
      blizzard:    this._sceneryBlizzard.bind(this),
      candy:       this._sceneryCandy.bind(this),
      toxic:       this._sceneryToxic.bind(this),
      rollercoaster:this._sceneryRollercoaster.bind(this),
      sakura:      this._scenerySakura.bind(this),
      graveyard:   this._sceneryGraveyard.bind(this),
      carnival:    this._sceneryCarnival.bind(this),
      windmill:    this._sceneryWindmill.bind(this),
      bamboo:      this._sceneryBamboo.bind(this),
      rainbow_road:   this._sceneryRainbowRoad.bind(this),
      sandstorm:      this._scenerySandstorm.bind(this),
      crystal_forest: this._sceneryCrystalForest.bind(this),
      desert_oasis:   this._sceneryDesertOasis.bind(this),
      junkyard:       this._sceneryJunkyard.bind(this),
      cyberpunk_roofs:this._sceneryCyberpunkRoofs.bind(this),
      cloud_kingdom:  this._sceneryCloudKingdom.bind(this),
      meteor_field:   this._sceneryMeteorField.bind(this),
      firefly_forest: this._sceneryFireflyForest.bind(this),
      aurora_peak:    this._sceneryAuroraPeak.bind(this),
    };
    this._sceneryFns = mapScenery;
    return mapScenery;
  },

  _drawScenery(ctx, startX, endX, camera, t) {
    // Use a deterministic seeded random per-chunk to place scenery
    const fn = this._sceneryMap()[this.mapId];
    if (!fn) return;
    // Every ~200px of terrain, draw a scenery element
    const step = Math.max(1, Math.floor(200 / this.segmentSize));
    for (let i = startX; i < endX; i += step) {
      const p = this.points[i];
      if (!p) break;
      if (!camera.isVisible(p.x, p.y, 300)) continue;
      // Deterministic seed from position
      const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      let _rngState = seed;
      const rng = () => { const s = Math.sin(_rngState * 9301 + i) * 93701; _rngState = s; return s - Math.floor(s); };
      // Arka plan sahne prop'ları (ağaç, palmiye, yaprak) SABİT olsun → t=0
      // (bulut/su/yüzey animasyonları ayrı çizildiği için etkilenmez)
      fn(ctx, p.x, p.y, rng, 0);
    }
  },

  // PERF(31 Tmz): `_drawForegroundAmbiance` içindeki iki nesne literali → sabit.
  _AMB_BIYOM: {
    winter:'snow', arctic:'snow', glacier:'snow', blizzard:'snow',
    jungle:'fly', swamp:'fly', mushroom:'fly', crystal_cave:'fly', cave:'fly', ruins:'fly', toxic:'fly',
    desert:'dust', canyon:'dust', wasteland:'dust', mars:'dust', moon:'dust', construction:'dust', savanna:'dust',
    volcano:'ember', lava_river:'ember',
    neon_city:'spark', candy:'spark', city:'spark',
    underwater:'bubble',
    countryside:'pollen', autumn:'pollen', highland:'pollen', mountains:'pollen', beach:'pollen',
  },
  _AMB_STIL: {
    dust:   { col:'222,202,150', spacing:46, band:150, base:14, size:1.6, drift:24, alpha:0.30, mode:'float', glow:false },
    pollen: { col:'250,242,170', spacing:60, band:150, base:12, size:1.7, drift:18, alpha:0.34, mode:'float', glow:false },
    snow:   { col:'255,255,255', spacing:42, band:180, base:6,  size:1.9, drift:20, alpha:0.55, mode:'fall',  glow:false },
    fly:    { col:'180,255,120', spacing:120,band:120, base:16, size:2.1, drift:30, alpha:0.75, mode:'float', glow:true  },
    ember:  { col:'255,150,60',  spacing:64, band:190, base:8,  size:1.8, drift:16, alpha:0.60, mode:'rise',  glow:true  },
    spark:  { col:'130,240,255', spacing:72, band:150, base:12, size:1.7, drift:14, alpha:0.60, mode:'float', glow:true  },
    bubble: { col:'205,240,255', spacing:66, band:190, base:10, size:2.2, drift:10, alpha:0.40, mode:'rise',  glow:true  },
  },

  _drawForegroundAmbiance(ctx, startX, endX, camera, t) {
    // ── Additive foreground ambiance ─────────────────────────────────────────
    // Subtle drifting motes (dust / pollen / snow sparkle / fireflies / embers /
    // neon spark / bubbles) chosen per biome, drawn over the terrain surface,
    // plus optional gentle swaying grass / reed tufts hugging the surface line.
    // Fully deterministic (position-hashed → stable per world-x), camera-culled
    // and perf-gated: skipped on low graphics, thinned at medium. Draw-only —
    // reads getYAt/_hash/isVisible only, never touching generation or objects.
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps < 0.5) return;                        // skip entirely on low
    const reduced = !!(typeof Settings !== 'undefined' && Settings.get && Settings.get('reducedMotion'));
    const motion  = reduced ? 0.3 : 1;           // calmer drift when reduced-motion is on

    const wl = camera.x - 30;
    const wr = camera.x + (camera.width || 1280) / (camera.zoom || 1) + 30;
    if (wr <= wl) return;

    // Biome → ambiance style
    // PERF(31 Tmz): iki tablo da kare başına yeniden kuruluyordu (1 + 8 nesne/kare)
    //   → sabit tabloya taşındı (`_AMB_BIYOM` / `_AMB_STIL`). İçerik birebir aynı.
    const style = this._AMB_BIYOM[this.mapId] || 'pollen';
    const S = this._AMB_STIL[style];

    // ── Drifting motes ───────────────────────────────────────────────────────
    const spacing = S.spacing / Math.max(0.55, ps);   // thin out at medium graphics
    const i0 = Math.floor(wl / spacing);
    const i1 = Math.ceil (wr / spacing);
    ctx.save();
    if (S.glow) ctx.globalCompositeOperation = 'lighter';
    for (let ix = i0; ix <= i1; ix++) {
      const h1 = this._hash(ix * 2 + 1);
      const h2 = this._hash(ix * 7 + 3);
      const h3 = this._hash(ix * 13 + 5);
      let px = ix * spacing + h1 * spacing;
      px += Math.sin(t * motion * 0.6 + h1 * 6.283) * S.drift;   // gentle horizontal drift
      if (px < wl || px > wr) continue;
      const sy = this.getYAt(px);

      let off, a;
      if (S.mode === 'float') {
        off = S.base + h2 * S.band + Math.sin(t * motion * 0.9 + h2 * 6.283) * 7;
        const tw = 0.6 + 0.4 * Math.sin(t * (S.glow ? 3.2 : 1.6) * motion + h3 * 12.0);
        a = S.alpha * tw;
      } else {
        const prog = ((t * motion) / (4 + h1 * 5) + h3) % 1;     // 0..1 loop
        const trav = S.mode === 'fall' ? (1 - prog) : prog;
        off = S.base + trav * S.band;
        a = S.alpha * Math.sin(prog * Math.PI);                  // soft fade at both ends
      }
      if (a <= 0.02) continue;
      const py = sy - off;
      if (!camera.isVisible(px, py, 30)) continue;

      const r = S.size * (0.7 + h2 * 0.7);
      if (S.glow) {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = `rgba(${S.col},1)`;
        ctx.beginPath(); ctx.arc(px, py, r * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = `rgba(${S.col},1)`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    // ── Gentle swaying grass / reed tufts on the surface line ────────────────
    const GRASS = {
      countryside:'grass', savanna:'grass', autumn:'grass', highland:'grass', jungle:'grass',
      swamp:'reed', beach:'reed',
    };
    const gt = GRASS[this.mapId];
    if (!gt) return;
    const reed   = gt === 'reed';
    const gspace = (reed ? 96 : 74) / Math.max(0.6, ps);
    const g0 = Math.floor(wl / gspace);
    const g1 = Math.ceil (wr / gspace);
    ctx.save();
    ctx.lineCap = 'round';
    for (let gx = g0; gx <= g1; gx++) {
      if (this._hash(gx * 5 + 2) < 0.4) continue;               // sparse scatter
      const wx = gx * gspace + this._hash(gx * 3 + 1) * gspace * 0.6;
      if (wx < wl || wx > wr) continue;
      const sy = this.getYAt(wx);
      if (!camera.isVisible(wx, sy, 60)) continue;
      const blades = reed ? 3 : 3 + Math.floor(this._hash(gx * 9) * 3);
      const baseH  = (reed ? 32 : 16) + this._hash(gx * 17) * (reed ? 26 : 16);
      const sway   = Math.sin(t * motion * 1.4 + gx * 0.7) * (reed ? 5 : 4) * motion;
      const gcol   = reed ? '96,120,64' : '74,150,46';
      ctx.save();
      ctx.translate(wx, sy + 1);
      ctx.strokeStyle = `rgba(${gcol},0.8)`;
      for (let b = 0; b < blades; b++) {
        const bx   = (b - (blades - 1) / 2) * (reed ? 3.2 : 4);
        const bh   = baseH * (0.7 + this._hash(gx * 31 + b) * 0.5);
        const lean = sway * (0.6 + this._hash(gx * 11 + b) * 0.6) + bx * 0.15;
        ctx.lineWidth = reed ? 2.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.quadraticCurveTo(bx + lean * 0.5, -bh * 0.6, bx + lean, -bh);
        ctx.stroke();
        if (reed && this._hash(gx * 23 + b) < 0.5) {
          ctx.fillStyle = 'rgba(120,88,50,0.85)';
          ctx.beginPath();
          ctx.ellipse(bx + lean, -bh, 2.4, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Distant parallax backdrop silhouettes (depth for sparse original maps) ──
  // Additive, deterministic (x-hashed → stable, never consumes prop rng) and
  // perf-gated. Draws a discrete far-off silhouette (hills / mesa / far tree /
  // skyline) kept narrower than the ~200px prop step so adjacent calls never
  // overlap → no translucent seams. Draw-only: reads _hash + Settings only.
  _sceneryDepth(ctx, x, y, biome) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps < 0.5) return;                         // skip the distant layer on low graphics
    const xi = Math.floor(x);
    const h0 = this._hash(xi * 3 + 11);           // presence
    if (h0 < 0.32) return;                         // ~68% of slots receive a backdrop element
    const h1 = this._hash(xi * 7 + 23);           // size
    const h2 = this._hash(xi * 13 + 5);           // horizontal jitter / secondary placement
    const h3 = this._hash(xi * 17 + 41);          // variant / accent
    const jx = (h2 - 0.5) * 46;                    // ±23 keeps element extent < 100 < step
    ctx.save();
    ctx.translate(x + jx, y);
    switch (biome) {
      case 'countryside': {
        const hw = 42 + h1 * 14, hh = 24 + h1 * 20;
        ctx.fillStyle = 'rgba(104,148,102,0.20)';
        ctx.beginPath();
        ctx.moveTo(-hw, 2);
        ctx.quadraticCurveTo(-hw * 0.4, -hh, 4, -hh * 0.9);
        ctx.quadraticCurveTo(hw * 0.6, -hh * 0.7, hw, 2);
        ctx.closePath(); ctx.fill();
        if (h3 < 0.45) {                           // far lollipop tree on the ridge
          const tx = (h2 - 0.5) * hw * 0.6, bY = -hh * 0.78, th = 14 + h3 * 10;
          ctx.fillStyle = 'rgba(74,110,70,0.26)';
          ctx.fillRect(tx - 1, bY - th, 2, th);
          ctx.beginPath(); ctx.arc(tx, bY - th, 7 + h3 * 4, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'desert': {
        if (h3 < 0.5) {                            // distant dune ridge
          const hw = 46 + h1 * 10, hh = 18 + h1 * 12;
          ctx.fillStyle = 'rgba(206,170,110,0.26)';
          ctx.beginPath();
          ctx.moveTo(-hw, 2);
          ctx.quadraticCurveTo(-hw * 0.2, -hh, hw * 0.3, -hh * 0.5);
          ctx.quadraticCurveTo(hw * 0.7, -hh * 0.1, hw, 2);
          ctx.closePath(); ctx.fill();
        } else {                                   // distant mesa butte
          const mw = 22 + h1 * 12, mh = 24 + h1 * 20;
          ctx.fillStyle = 'rgba(150,86,54,0.24)';
          ctx.beginPath();
          ctx.moveTo(-mw, 2); ctx.lineTo(-mw * 0.82, -mh);
          ctx.lineTo(mw * 0.82, -mh); ctx.lineTo(mw, 2);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(196,124,82,0.18)';
          ctx.fillRect(-mw * 0.82, -mh, mw * 1.64, 3);
        }
        break;
      }
      case 'winter': {
        const hw = 44 + h1 * 12, hh = 20 + h1 * 16;
        ctx.fillStyle = 'rgba(200,216,238,0.30)';
        ctx.beginPath();
        ctx.moveTo(-hw, 2);
        ctx.quadraticCurveTo(-hw * 0.3, -hh, hw * 0.1, -hh * 0.85);
        ctx.quadraticCurveTo(hw * 0.6, -hh * 0.55, hw, 2);
        ctx.closePath(); ctx.fill();
        if (h3 < 0.5) {                            // far snowy pine silhouette
          const tx = (h2 - 0.5) * hw * 0.7, bY = -hh * 0.6, th = 20 + h3 * 12;
          ctx.fillStyle = 'rgba(150,172,196,0.34)';
          ctx.beginPath();
          ctx.moveTo(tx, bY - th);
          ctx.lineTo(tx - th * 0.32, bY); ctx.lineTo(tx + th * 0.32, bY);
          ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'beach': {
        const hw = 40 + h1 * 16, hh = 13 + h1 * 9;
        ctx.fillStyle = 'rgba(190,206,196,0.20)';     // hazy sandy islet
        ctx.beginPath();
        ctx.moveTo(-hw, 2);
        ctx.quadraticCurveTo(0, -hh, hw, 2);
        ctx.closePath(); ctx.fill();
        if (h3 < 0.5) {                            // lone distant palm
          const tx = (h2 - 0.5) * hw * 0.5, bY = -hh * 0.5, th = 20 + h3 * 10;
          ctx.strokeStyle = 'rgba(120,150,140,0.4)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(tx, bY); ctx.quadraticCurveTo(tx + 4, bY - th * 0.6, tx + 2, bY - th); ctx.stroke();
          ctx.lineWidth = 1.4;
          for (let f = 0; f < 5; f++) {
            const fa = (f / 5) * Math.PI - Math.PI * 0.05;
            ctx.beginPath(); ctx.moveTo(tx + 2, bY - th);
            ctx.lineTo(tx + 2 + Math.cos(fa) * 10, bY - th + Math.sin(fa) * 7 - 3); ctx.stroke();
          }
        }
        break;
      }
      case 'city': {
        const bw = 26 + h1 * 16, bh = 60 + h1 * 68;    // hazy far skyline block
        ctx.fillStyle = 'rgba(70,84,110,0.34)';
        ctx.fillRect(-bw / 2, -bh, bw, bh);
        ctx.fillStyle = 'rgba(56,68,92,0.34)';
        ctx.fillRect(-bw / 2, -bh, bw, 4);
        ctx.fillStyle = 'rgba(255,225,150,0.30)';       // sparse lit windows
        const cols = Math.max(2, Math.floor(bw / 9));
        const rows = Math.max(2, Math.floor(bh / 16));
        for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
          if (this._hash(xi + c * 13 + rr * 7) < 0.72) continue;
          ctx.fillRect(-bw / 2 + 4 + c * 8, -bh + 8 + rr * 15, 4, 6);
        }
        if (h3 < 0.4) { ctx.fillStyle = 'rgba(56,68,92,0.34)'; ctx.fillRect(-2, -bh - 10, 4, 10); }
        break;
      }
      case 'jungle': {
        const hw = 48 + h1 * 12, hh = 28 + h1 * 16;     // layered distant canopy humps
        ctx.fillStyle = 'rgba(30,74,44,0.30)';
        ctx.beginPath();
        ctx.moveTo(-hw, 2);
        for (let s = 0; s <= 6; s++) {
          const sx = -hw + (hw * 2) * (s / 6);
          const hy = -hh * (0.45 + 0.55 * Math.abs(Math.sin(s * 1.7 + xi * 0.013)));
          ctx.lineTo(sx, hy);
        }
        ctx.lineTo(hw, 2); ctx.closePath(); ctx.fill();
        if (h3 < 0.5) {                            // emergent tall tree silhouette
          const tx = (h2 - 0.5) * hw * 0.7, bY = -hh * 0.7, th = 28 + h3 * 16;
          ctx.fillStyle = 'rgba(22,58,34,0.34)';
          ctx.fillRect(tx - 1.5, bY - th, 3, th);
          ctx.beginPath(); ctx.arc(tx, bY - th, 12 + h3 * 5, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'mars': {
        const mw = 30 + h1 * 20, mh = 22 + h1 * 22;     // distant reddish massif
        ctx.fillStyle = 'rgba(150,70,44,0.26)';
        ctx.beginPath();
        ctx.moveTo(-mw, 2);
        ctx.lineTo(-mw * 0.5, -mh * 0.8);
        ctx.lineTo(-mw * 0.1, -mh);
        ctx.lineTo(mw * 0.4, -mh * 0.6);
        ctx.lineTo(mw, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(200,110,70,0.16)';         // sunlit face
        ctx.beginPath();
        ctx.moveTo(-mw * 0.1, -mh); ctx.lineTo(mw * 0.4, -mh * 0.6);
        ctx.lineTo(mw * 0.05, -mh * 0.55); ctx.closePath(); ctx.fill();
        break;
      }
      case 'neon_city': {
        const bw = 24 + h1 * 16, bh = 56 + h1 * 64;     // dark far tower
        ctx.fillStyle = 'rgba(24,20,44,0.5)';
        ctx.fillRect(-bw / 2, -bh, bw, bh);
        const glows = ['rgba(255,0,255,0.4)', 'rgba(0,255,255,0.4)', 'rgba(0,255,136,0.4)'];
        for (let c = 0; c < 3; c++) {                    // faint neon window glows
          if (this._hash(xi * 5 + c * 17) < 0.5) continue;
          ctx.fillStyle = glows[c % 3];
          ctx.fillRect(-bw / 2 + 5 + c * (bw / 3 - 2), -bh + 12 + this._hash(xi + c * 9) * bh * 0.7, 5, 4);
        }
        ctx.fillStyle = 'rgba(255,60,120,0.5)';          // rooftop antenna beacon
        ctx.fillRect(-1, -bh - 8, 2, 8);
        break;
      }
    }
    ctx.restore();
  },

  // ── Additive distant parallax silhouettes for the biomes that had rich
  //    foreground props but no far backdrop (every map except the 8 handled by
  //    _sceneryDepth and the depth-complete recent maps). Mirrors _sceneryDepth:
  //    deterministic x-hash (never consumes the prop rng → props stay identical),
  //    perf-gated, and kept narrow (extent < the ~200px prop step) so adjacent
  //    slots never seam. Draw-only: reads _hash + Settings, no state leak. ──────
  _FAR_CFG: {
    wasteland:   {style:'mesa',   c:'rgba(150,120,80,',  a:0.24, acc:'rgba(120,95,60,'},
    canyon:      {style:'mesa',   c:'rgba(150,86,54,',   a:0.24, acc:'rgba(196,124,82,'},
    mountains:   {style:'snow',   c:'rgba(120,128,150,', a:0.26, acc:'rgba(235,244,255,'},
    dag:         {style:'snow',   c:'rgba(90,96,120,',   a:0.28, acc:'rgba(230,238,250,'},
    arctic:      {style:'snow',   c:'rgba(150,185,215,', a:0.26, acc:'rgba(255,255,255,'},
    glacier:     {style:'snow',   c:'rgba(130,175,205,', a:0.26, acc:'rgba(240,250,255,'},
    blizzard:    {style:'snow',   c:'rgba(150,175,205,', a:0.24, acc:'rgba(255,255,255,'},
    highland:    {style:'ridge',  c:'rgba(120,140,110,', a:0.24, acc:'rgba(150,175,120,'},
    savanna:     {style:'ridge',  c:'rgba(180,150,90,',  a:0.24, acc:'rgba(120,160,80,'},
    candy:       {style:'ridge',  c:'rgba(230,150,180,', a:0.26, acc:'rgba(255,200,220,'},
    autumn:      {style:'trees',  c:'rgba(150,100,50,',  a:0.26, acc:'rgba(200,130,50,'},
    swamp:       {style:'trees',  c:'rgba(70,90,70,',    a:0.30, acc:'rgba(110,130,90,'},
    volcano:     {style:'cone',   c:'rgba(90,60,55,',    a:0.30, acc:'rgba(255,90,40,'},
    lava_river:  {style:'cone',   c:'rgba(80,50,45,',    a:0.30, acc:'rgba(255,110,40,'},
    crystal_cave:{style:'shards', c:'rgba(120,90,200,',  a:0.26, acc:'rgba(200,180,255,'},
    mushroom:    {style:'shards', c:'rgba(120,80,160,',  a:0.24, acc:'rgba(200,150,220,'},
    ruins:       {style:'columns',c:'rgba(150,135,95,',  a:0.26, acc:'rgba(120,105,70,'},
    moon:        {style:'crater', c:'rgba(150,150,165,', a:0.26, acc:'rgba(200,200,215,'},
    underwater:  {style:'coral',  c:'rgba(40,110,140,',  a:0.28, acc:'rgba(90,200,200,'},
    otoyol:      {style:'towers', c:'rgba(90,100,115,',  a:0.30, acc:'rgba(255,225,150,'},
    construction:{style:'towers', c:'rgba(110,110,120,', a:0.28, acc:'rgba(240,200,60,'},
    toxic:       {style:'towers', c:'rgba(90,120,60,',   a:0.30, acc:'rgba(160,220,80,'},
    hotwheels:   {style:'loop',   c:'rgba(60,110,190,',  a:0.30, acc:'rgba(255,120,40,'},
    rollercoaster:{style:'loop',  c:'rgba(120,70,140,',  a:0.30, acc:'rgba(255,120,180,'},
  },
  _sceneryFar(ctx, x, y, biome) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps < 0.5) return;                         // skip the distant layer on low graphics
    const xi = Math.floor(x);
    const h0 = this._hash(xi * 3 + 11);           // presence
    if (h0 < 0.32) return;                         // ~68% of slots receive a backdrop element
    const h1 = this._hash(xi * 7 + 23);           // size
    const h2 = this._hash(xi * 13 + 5);           // horizontal jitter
    const h3 = this._hash(xi * 17 + 41);          // variant / accent
    const cfg = this._FAR_CFG[biome];
    if (!cfg) return;
    const C = (al) => cfg.c + al + ')';
    const A = (al) => cfg.acc + al + ')';
    const jx = (h2 - 0.5) * 46;                    // ±23 keeps element extent < 100 < step
    ctx.save();
    ctx.translate(x + jx, y);
    switch (cfg.style) {
      case 'mesa': {                               // flat-top butte + companion spire
        const mw = 22 + h1 * 12, mh = 24 + h1 * 22;
        ctx.fillStyle = C(cfg.a);
        ctx.beginPath();
        ctx.moveTo(-mw, 2); ctx.lineTo(-mw * 0.82, -mh);
        ctx.lineTo(mw * 0.82, -mh); ctx.lineTo(mw, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = A(cfg.a * 0.7);
        ctx.fillRect(-mw * 0.82, -mh, mw * 1.64, 3);
        if (h3 < 0.5) {
          ctx.fillStyle = C(cfg.a);
          ctx.beginPath();
          ctx.moveTo(mw * 0.9, 2); ctx.lineTo(mw * 1.05, -mh * 0.6);
          ctx.lineTo(mw * 1.25, -mh * 0.55); ctx.lineTo(mw * 1.35, 2);
          ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'snow': {                               // snow-capped rocky ridge
        const sw = 30 + h1 * 16, sh = 34 + h1 * 26;
        ctx.fillStyle = C(cfg.a);
        ctx.beginPath();
        ctx.moveTo(-sw, 2);
        ctx.lineTo(-sw * 0.45, -sh * 0.62);
        ctx.lineTo(-sw * 0.12, -sh * 0.44);
        ctx.lineTo(0, -sh);
        ctx.lineTo(sw * 0.4, -sh * 0.55);
        ctx.lineTo(sw, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = A(Math.min(0.5, cfg.a + 0.14));
        ctx.beginPath();
        ctx.moveTo(0, -sh); ctx.lineTo(-sw * 0.16, -sh * 0.74);
        ctx.lineTo(sw * 0.06, -sh * 0.78); ctx.lineTo(sw * 0.14, -sh * 0.66);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'ridge': {                              // rolling hill hump + lone far tree
        const hw = 42 + h1 * 14, hh = 20 + h1 * 16;
        ctx.fillStyle = C(cfg.a);
        ctx.beginPath();
        ctx.moveTo(-hw, 2);
        ctx.quadraticCurveTo(-hw * 0.4, -hh, 4, -hh * 0.9);
        ctx.quadraticCurveTo(hw * 0.6, -hh * 0.7, hw, 2);
        ctx.closePath(); ctx.fill();
        if (h3 < 0.5) {
          const tx = (h2 - 0.5) * hw * 0.6, bY = -hh * 0.72, th = 12 + h3 * 10;
          ctx.fillStyle = A(cfg.a + 0.04);
          ctx.fillRect(tx - 1, bY - th, 2, th);
          ctx.beginPath(); ctx.arc(tx, bY - th, 6 + h3 * 4, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'trees': {                              // cluster of distant canopy trees
        const n = 2 + Math.floor(h1 * 2);
        for (let i = 0; i < n; i++) {
          const hh = this._hash(xi * 5 + i * 31);
          const tx = (i - (n - 1) / 2) * 16 + (hh - 0.5) * 6;
          const th = 26 + hh * 22;
          ctx.fillStyle = C(cfg.a);
          ctx.fillRect(tx - 1.5, -th, 3, th);
          ctx.beginPath(); ctx.arc(tx, -th, 8 + hh * 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = A(cfg.a * 0.7);
          ctx.beginPath(); ctx.arc(tx - 3, -th - 3, 4 + hh * 3, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'cone': {                               // volcanic cone, crater glow + smoke
        const cw = 34 + h1 * 16, ch = 30 + h1 * 24;
        ctx.fillStyle = C(cfg.a);
        ctx.beginPath();
        ctx.moveTo(-cw, 2);
        ctx.lineTo(-cw * 0.2, -ch);
        ctx.lineTo(cw * 0.16, -ch);
        ctx.lineTo(cw, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = A(0.28);
        ctx.beginPath();
        ctx.moveTo(-cw * 0.2, -ch); ctx.lineTo(cw * 0.16, -ch);
        ctx.lineTo(cw * 0.05, -ch * 0.82); ctx.lineTo(-cw * 0.08, -ch * 0.82);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = C(cfg.a * 0.6);
        for (let s = 0; s < 3; s++) {
          const sy = -ch - 6 - s * 9;
          ctx.beginPath(); ctx.arc((this._hash(xi + s * 7) - 0.5) * 10, sy, 5 + s * 2, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'shards': {                             // cluster of tall glowing shards
        const n = 3 + Math.floor(h1 * 2);
        for (let i = 0; i < n; i++) {
          const hh = this._hash(xi * 7 + i * 19);
          const sx = (i - (n - 1) / 2) * 9 + (hh - 0.5) * 5;
          const sh = 24 + hh * 34;
          const sw = 4 + hh * 3;
          ctx.fillStyle = C(cfg.a);
          ctx.beginPath();
          ctx.moveTo(sx - sw, 2); ctx.lineTo(sx, -sh); ctx.lineTo(sx + sw, 2);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = A(0.4);
          ctx.beginPath(); ctx.arc(sx, -sh, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'columns': {                            // broken ancient columns + lintel
        const n = 2 + Math.floor(h1 * 2);
        const bh = 34 + h1 * 26;
        for (let i = 0; i < n; i++) {
          const hh = this._hash(xi * 11 + i * 23);
          const cx = (i - (n - 1) / 2) * 14 + (hh - 0.5) * 4;
          const ch = bh * (0.55 + hh * 0.4);
          ctx.fillStyle = C(cfg.a);
          ctx.fillRect(cx - 4, -ch, 8, ch);
          ctx.fillStyle = A(cfg.a * 0.7);
          ctx.beginPath();
          ctx.moveTo(cx - 4, -ch); ctx.lineTo(cx - 1, -ch - 4);
          ctx.lineTo(cx + 2, -ch + 2); ctx.lineTo(cx + 4, -ch - 3);
          ctx.lineTo(cx + 4, -ch + 3); ctx.lineTo(cx - 4, -ch + 3);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = C(cfg.a);
        ctx.fillRect(-10, -6, 20, 5);
        break;
      }
      case 'crater': {                             // low jagged crater rim + far stars
        const rw = 40 + h1 * 16;
        ctx.fillStyle = C(cfg.a);
        ctx.beginPath();
        ctx.moveTo(-rw, 2);
        ctx.quadraticCurveTo(-rw * 0.5, -12 - h1 * 8, -rw * 0.18, -6);
        ctx.quadraticCurveTo(0, -2, rw * 0.2, -8);
        ctx.quadraticCurveTo(rw * 0.55, -14 - h1 * 6, rw, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = A(0.5);
        for (let s = 0; s < 4; s++) {
          ctx.beginPath();
          ctx.arc(-rw * 0.6 + this._hash(xi + s * 13) * rw * 1.2, -18 - this._hash(xi + s * 5) * 20, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'coral': {                              // far coral humps + kelp strands
        const hw = 40 + h1 * 14, hh = 16 + h1 * 12;
        ctx.fillStyle = C(cfg.a);
        ctx.beginPath();
        ctx.moveTo(-hw, 2);
        for (let s = 0; s <= 5; s++) {
          const sx = -hw + (hw * 2) * (s / 5);
          const hy = -hh * (0.4 + 0.6 * Math.abs(Math.sin(s * 1.9 + xi * 0.02)));
          ctx.lineTo(sx, hy);
        }
        ctx.lineTo(hw, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = A(0.4); ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
          const kx = (this._hash(xi + k * 9) - 0.5) * hw;
          const kh = 18 + this._hash(xi + k * 3) * 20;
          ctx.beginPath(); ctx.moveTo(kx, -hh * 0.4);
          ctx.quadraticCurveTo(kx + 5, -hh * 0.4 - kh * 0.6, kx + 2, -hh * 0.4 - kh);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
        break;
      }
      case 'towers': {                             // hazy far tower(s) with lit windows
        const bw = 20 + h1 * 12, bh = 44 + h1 * 46;
        ctx.fillStyle = C(cfg.a + 0.06);
        ctx.fillRect(-bw / 2, -bh, bw, bh);
        ctx.fillStyle = A(0.4);
        const cols = Math.max(2, Math.floor(bw / 8));
        const rows = Math.max(2, Math.floor(bh / 16));
        for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) {
          if (this._hash(xi + c * 13 + rr * 7) < 0.7) continue;
          ctx.fillRect(-bw / 2 + 3 + c * 7, -bh + 8 + rr * 15, 3, 5);
        }
        if (h3 < 0.5) { ctx.fillStyle = C(cfg.a); ctx.fillRect(-1.5, -bh - 10, 3, 10); }
        break;
      }
      case 'loop': {                               // distant track loop on posts
        const rad = 24 + h1 * 12;
        ctx.strokeStyle = C(cfg.a + 0.1); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, -rad - 6, rad, Math.PI * 0.15, Math.PI * 1.75); ctx.stroke();
        ctx.strokeStyle = A(0.4); ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-rad, -6); ctx.lineTo(-rad, 2);
        ctx.moveTo(rad, -6); ctx.lineTo(rad, 2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  },

  _sceneryCountryside(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'countryside');
    const h = 50 + rng() * 40;
    ctx.save(); ctx.translate(x, y - 2);
    // Ground shadow (static)
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(4, 0, 22, 5, 0, 0, Math.PI*2); ctx.fill();
    // Tree trunk
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-4, -h, 8, h);
    // Trunk bark texture (vertical shading)
    ctx.fillStyle = 'rgba(40,24,10,0.5)';
    ctx.fillRect(1, -h, 3, h);
    ctx.fillStyle = 'rgba(120,86,48,0.4)';
    ctx.fillRect(-3, -h, 2, h);
    // A couple of side branches poking out before foliage
    ctx.strokeStyle = '#4a2f16'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -h*0.6); ctx.lineTo(-11, -h*0.72);
    ctx.moveTo(3, -h*0.5); ctx.lineTo(12, -h*0.6);
    ctx.stroke();
    // Foliage layers
    const fc = ['#2d6e22','#3d8e2a','#1a5a18'];
    for (let lay = 0; lay < 3; lay++) {
      ctx.fillStyle = fc[lay];
      const lh = h * 0.55 - lay * h * 0.12;
      const lw = 28 - lay * 5;
      ctx.beginPath();
      ctx.moveTo(0, -h - lh * 0.3);
      ctx.lineTo(-lw - rng()*6, -h + lay * h * 0.14);
      ctx.lineTo(lw + rng()*6, -h + lay * h * 0.14);
      ctx.closePath(); ctx.fill();
    }
    // Sunlit highlight dabs on foliage (static)
    ctx.fillStyle = 'rgba(150,210,90,0.5)';
    ctx.beginPath(); ctx.arc(-8, -h + 4, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -h - 6, 4, 0, Math.PI*2); ctx.fill();
    // Occasional apples
    if (rng() < 0.4) {
      ctx.fillStyle = '#ee3322';
      ctx.beginPath(); ctx.arc(-10 + rng()*20, -h + 10, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-6 + rng()*14, -h + 2, 3, 0, Math.PI*2); ctx.fill();
    }
    // Small tuft of grass at the base
    ctx.strokeStyle = '#3d8e2a'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(-15, -8);
    ctx.moveTo(-9, 0);  ctx.lineTo(-8, -9);
    ctx.moveTo(13, 0);  ctx.lineTo(16, -7);
    ctx.stroke();
    ctx.restore();
  },

  _sceneryDesert(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'desert');
    const r = rng();
    if (r < 0.5) {
      // Cactus
      const h = 40 + rng() * 30;
      ctx.save(); ctx.translate(x, y - 2);
      // Ground shadow + small sand mound at base
      ctx.fillStyle = 'rgba(120,90,40,0.25)';
      ctx.beginPath(); ctx.ellipse(2, 0, 20, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#cbab6b';
      ctx.beginPath(); ctx.ellipse(0, 1, 16, 5, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2d7a2a';
      ctx.fillRect(-6, -h, 12, h);
      // Body shading + highlight ridge
      ctx.fillStyle = 'rgba(20,70,20,0.45)'; ctx.fillRect(2, -h, 4, h);
      ctx.fillStyle = 'rgba(120,200,90,0.4)'; ctx.fillRect(-5, -h, 2, h);
      // Arms
      const armH = h * 0.5;
      ctx.fillStyle = '#2d7a2a';
      ctx.fillRect(-18, -armH, 14, 8);
      ctx.fillRect(-18, -armH - 15, 8, 16);
      ctx.fillRect(6, -armH * 0.7, 14, 8);
      ctx.fillRect(12, -armH * 0.7 - 12, 8, 13);
      // Rounded arm tips
      ctx.beginPath(); ctx.arc(-14, -armH - 15, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(16, -armH*0.7 - 12, 4, 0, Math.PI*2); ctx.fill();
      // Little cactus flower
      ctx.fillStyle = '#ff5588';
      ctx.beginPath(); ctx.arc(0, -h, 3, 0, Math.PI*2); ctx.fill();
      // Spines
      ctx.fillStyle = '#888';
      for (let si = 0; si < 6; si++) {
        ctx.fillRect(-7, -h * 0.2 - si * h * 0.12, 2, 1);
        ctx.fillRect(5, -h * 0.25 - si * h * 0.1, 2, 1);
      }
      ctx.restore();
    } else if (r < 0.78) {
      // Skull/rock
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(90,70,40,0.22)';
      ctx.beginPath(); ctx.ellipse(0, 1, 18, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#aa9966';
      ctx.beginPath(); ctx.ellipse(0, -10, 14, 10, 0, 0, Math.PI*2); ctx.fill();
      // Highlight + horns
      ctx.fillStyle = 'rgba(230,215,170,0.5)';
      ctx.beginPath(); ctx.ellipse(-4, -13, 6, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#7a6a44'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-11, -16); ctx.quadraticCurveTo(-20, -20, -22, -10);
      ctx.moveTo(11, -16);  ctx.quadraticCurveTo(20, -20, 22, -10);
      ctx.stroke();
      // Eye sockets
      ctx.fillStyle = '#4a3a24';
      ctx.beginPath(); ctx.arc(-5, -11, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -11, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#7a6a44';
      ctx.fillRect(-8, -8, 16, 8);
      ctx.restore();
    } else {
      // Sand dune mound with sparse dry grass
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#d8b874';
      ctx.beginPath(); ctx.ellipse(0, 2, 30, 10, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(200,165,100,0.5)';
      ctx.beginPath(); ctx.ellipse(-8, 0, 14, 5, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#b39055'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -3); ctx.lineTo(-9, -13);
      ctx.moveTo(-2, -4); ctx.lineTo(-1, -14);
      ctx.moveTo(3, -3);  ctx.lineTo(6, -12);
      ctx.stroke();
      ctx.restore();
    }
  },

  _sceneryWinter(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'winter');
    // Occasionally a bare frosted tree instead of a pine
    if (rng() < 0.28) {
      const bh = 40 + rng() * 25;
      ctx.save(); ctx.translate(x, y - 2);
      ctx.fillStyle = 'rgba(180,200,230,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#4a3826'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -bh); ctx.stroke();
      // Bare branches
      ctx.lineWidth = 2;
      const bx = [-1, 1, -1, 1];
      for (let b = 0; b < 4; b++) {
        const by = -bh*0.4 - b*bh*0.16;
        const dir = bx[b];
        ctx.beginPath();
        ctx.moveTo(0, by);
        ctx.lineTo(dir*(12 + b*2), by - 8 - b*2);
        ctx.stroke();
      }
      // Snow on the branch tips
      ctx.fillStyle = '#eef4ff';
      ctx.beginPath(); ctx.arc(0, -bh, 3, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      return;
    }
    const h = 45 + rng() * 35;
    ctx.save(); ctx.translate(x, y - 2);
    // Snow drift mound at the base
    ctx.fillStyle = '#eaf2ff';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 7, 0, Math.PI, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(180,205,240,0.5)';
    ctx.beginPath(); ctx.ellipse(8, 1, 12, 4, 0, Math.PI, Math.PI*2); ctx.fill();
    // Pine tree layers (snow-covered)
    const layers = 4;
    for (let la = 0; la < layers; la++) {
      const ly = -h * 0.2 - la * h * 0.2;
      const lw = (layers - la) * 10 + 6;
      ctx.fillStyle = '#1a4a18';
      ctx.beginPath(); ctx.moveTo(0, ly-h*0.22); ctx.lineTo(-lw, ly); ctx.lineTo(lw, ly); ctx.closePath(); ctx.fill();
      // Inner shadow on the underside
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.moveTo(0, ly-h*0.05); ctx.lineTo(-lw*0.9, ly); ctx.lineTo(lw*0.9, ly); ctx.closePath(); ctx.fill();
      // Snow cap
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath(); ctx.moveTo(0, ly-h*0.24); ctx.lineTo(-lw*0.6, ly-h*0.04); ctx.lineTo(lw*0.6, ly-h*0.04); ctx.closePath(); ctx.fill();
      // Bright snow highlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, ly-h*0.24); ctx.lineTo(-lw*0.28, ly-h*0.1); ctx.lineTo(lw*0.28, ly-h*0.1); ctx.closePath(); ctx.fill();
    }
    // Trunk
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(-3, -h*0.18, 6, h*0.2);
    ctx.restore();
  },

  _sceneryBeach(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'beach');
    if (rng() < 0.5) {
      // Palm tree
      const h = 55 + rng() * 25;
      const lean = (rng() - 0.5) * 0.25;
      ctx.save(); ctx.translate(x, y - 2);
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lean*h*1.5, -h*0.5, lean*h*0.8, -h); ctx.stroke();
      // Trunk ring texture (static)
      ctx.strokeStyle = 'rgba(90,60,10,0.6)'; ctx.lineWidth = 1.5;
      for (let rr = 1; rr <= 5; rr++) {
        const rp = rr / 6, ry = -h * rp;
        ctx.beginPath(); ctx.moveTo(lean*h*rp*1.1 - 4, ry); ctx.lineTo(lean*h*rp*1.1 + 4, ry - 2); ctx.stroke();
      }
      const tx = lean * h * 0.8, ty = -h;
      // Palm leaves (static; t=0)
      const leafCols = ['#2d8a18','#3daa22','#1d6a12'];
      for (let lf = 0; lf < 6; lf++) {
        const la = (lf / 6) * Math.PI * 2;
        ctx.strokeStyle = leafCols[lf%3]; ctx.lineWidth = 3;
        const ex = tx + Math.cos(la)*34, ey = ty + Math.sin(la)*20;
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(la)*18, ty + Math.sin(la)*14, ex, ey);
        ctx.stroke();
        // Little frond leaflets along each palm
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tx + Math.cos(la)*22, ty + Math.sin(la)*15);
        ctx.lineTo(tx + Math.cos(la)*22 + Math.sin(la)*5, ty + Math.sin(la)*15 - Math.cos(la)*5);
        ctx.stroke();
      }
      // Crown top knot
      ctx.fillStyle = '#1d6a12';
      ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI*2); ctx.fill();
      // Coconuts
      if (rng() < 0.6) {
        ctx.fillStyle = '#5a3a10';
        ctx.beginPath(); ctx.arc(tx - 4, ty + 6, 5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(tx + 5, ty + 4, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,200,0.4)';
        ctx.beginPath(); ctx.arc(tx - 5, ty + 4, 1.5, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else {
      // Starfish or shell
      ctx.save(); ctx.translate(x, y - 2);
      ctx.fillStyle = '#ee8844';
      for (let sp = 0; sp < 5; sp++) {
        const sa = sp * Math.PI * 0.4 - Math.PI * 0.5;
        ctx.beginPath(); ctx.ellipse(Math.cos(sa)*6, Math.sin(sa)*6, 3, 7, sa, 0, Math.PI*2); ctx.fill();
      }
      // Starfish center + spots
      ctx.fillStyle = '#d86a2a';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,180,0.7)';
      ctx.beginPath(); ctx.arc(-1, -1, 1, 0, Math.PI*2); ctx.fill();
      // A small seashell + pebbles nearby
      ctx.fillStyle = '#f2ded0';
      ctx.beginPath(); ctx.arc(14, 2, 5, Math.PI, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#d8b8a0'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(14, 2); ctx.lineTo(11, -2.5);
      ctx.moveTo(14, 2); ctx.lineTo(14, -3);
      ctx.moveTo(14, 2); ctx.lineTo(17, -2.5);
      ctx.stroke();
      ctx.fillStyle = '#c9b79a';
      ctx.beginPath(); ctx.arc(-14, 1, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-9, 2, 1.8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },

  _sceneryCity(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'city');
    const r = rng();
    // Traffic sign or lamp post
    if (r < 0.32) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#555'; ctx.fillRect(-2, -40, 4, 40);
      // Traffic light housing with three lights
      ctx.fillStyle = '#222'; this._rrect(ctx, -7, -52, 14, 26, 3); ctx.fill();
      const lit = Math.floor(rng()*3);
      const lc = ['#ff3322','#ffcc22','#22ee22'];
      for (let g = 0; g < 3; g++) {
        ctx.fillStyle = g === lit ? lc[g] : 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(0, -47 + g*7, 3.2, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    } else if (r < 0.62) {
      // Lamp post
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#666'; ctx.fillRect(-2,-50,4,50);
      ctx.fillStyle = '#4a4a4a'; ctx.fillRect(-4, -2, 8, 3); // base
      ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,-50); ctx.quadraticCurveTo(12,-54,16,-50); ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,100,0.25)';
      ctx.beginPath(); ctx.arc(16,-48,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,100,0.9)';
      ctx.beginPath(); ctx.arc(16,-50,5,0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else {
      // Background building silhouette with lit windows (static)
      const bw = 34 + rng()*20, bh = 70 + rng()*70;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#3a4152';
      ctx.fillRect(-bw/2, -bh, bw, bh);
      // Roof accent
      ctx.fillStyle = '#2c3140';
      ctx.fillRect(-bw/2, -bh, bw, 5);
      ctx.fillStyle = '#20242f';
      ctx.fillRect(-3, -bh - 12, 6, 12); // antenna/vent
      // Window grid
      const cols = Math.max(2, Math.floor(bw / 10));
      const rows = Math.max(3, Math.floor(bh / 14));
      const mx = (bw - cols*6) / (cols + 1);
      const my = (bh - rows*8) / (rows + 1);
      for (let wc = 0; wc < cols; wc++) {
        for (let wr = 0; wr < rows; wr++) {
          const wx = -bw/2 + mx + wc*(6 + mx);
          const wy = -bh + my + wr*(8 + my);
          const on = ((wc*7 + wr*3 + Math.floor(x)) % 5) < 2;
          ctx.fillStyle = on ? 'rgba(255,225,150,0.85)' : 'rgba(30,40,60,0.9)';
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
      ctx.restore();
    }
  },
  // Rounded-rect helper (static path only; caller does fill/stroke)
  _rrect(ctx, rx, ry, rw, rh, rad) {
    ctx.beginPath();
    ctx.moveTo(rx + rad, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
    ctx.arcTo(rx, ry + rh, rx, ry, rad);
    ctx.arcTo(rx, ry, rx + rw, ry, rad);
    ctx.closePath();
  },

  _sceneryJungle(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'jungle');
    const h = 55 + rng() * 30;
    ctx.save(); ctx.translate(x, y - 2);
    // Low undergrowth bush behind the fern (static)
    ctx.fillStyle = '#164a10';
    ctx.beginPath(); ctx.ellipse(-14, -10, 16, 11, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1f6416';
    ctx.beginPath(); ctx.ellipse(12, -8, 14, 9, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(90,170,60,0.4)';
    ctx.beginPath(); ctx.ellipse(-18, -14, 6, 4, 0, 0, Math.PI*2); ctx.fill();
    // Hanging vine with leaves (static)
    ctx.strokeStyle = '#2a6a1a'; ctx.lineWidth = 1.5;
    const vx = 22;
    ctx.beginPath(); ctx.moveTo(vx, -h*0.9); ctx.quadraticCurveTo(vx+6, -h*0.5, vx+2, -h*0.15); ctx.stroke();
    ctx.fillStyle = '#3d8e2a';
    for (let vl = 0; vl < 3; vl++) {
      const vy = -h*0.7 + vl*h*0.25;
      ctx.beginPath(); ctx.ellipse(vx+4, vy, 4, 2.5, 0.4, 0, Math.PI*2); ctx.fill();
    }
    // Giant fern/jungle plant
    ctx.strokeStyle = '#1d6a12'; ctx.lineWidth = 2;
    for (let fr = 0; fr < 5; fr++) {
      const fa = (fr / 5) * Math.PI - Math.PI * 0.8 + Math.sin(t * 0.5 + fr) * 0.04;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(fa)*h*0.5, Math.sin(fa)*h*0.5 - h*0.3,
        Math.cos(fa)*h*0.85, Math.sin(fa)*h*0.85 - h*0.1);
      ctx.stroke();
      // Leaflets along branch
      ctx.fillStyle = rng()<0.5 ? '#2d8a18' : '#1d5a10';
      for (let le = 1; le <= 4; le++) {
        const lp = le / 5;
        const lx = Math.cos(fa)*h*0.85*lp;
        const ly = Math.sin(fa)*h*0.85*lp - h*0.1*lp;
        ctx.beginPath(); ctx.ellipse(lx, ly, 8, 4, fa - Math.PI*0.5, 0, Math.PI*2); ctx.fill();
      }
    }
    // Flower at top
    if (rng() < 0.4) {
      ctx.fillStyle = '#ff4488';
      ctx.beginPath(); ctx.arc(0, -h*0.7, 5, 0, Math.PI*2); ctx.fill();
    }
    // Foreground ground detail (additive variety): red toadstool or mossy rock
    if (rng() < 0.42) {
      const mx = (rng()<0.5?-1:1)*(20 + rng()*10);
      ctx.fillStyle = '#efe6d2';
      ctx.beginPath();
      ctx.moveTo(mx-2, -1); ctx.quadraticCurveTo(mx-3, -6, mx-1.5, -8);
      ctx.lineTo(mx+1.5, -8); ctx.quadraticCurveTo(mx+3, -6, mx+2, -1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c83828';
      ctx.beginPath(); ctx.ellipse(mx, -8, 6, 4, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,225,225,0.75)';
      ctx.beginPath(); ctx.arc(mx-1.5, -9, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx+2, -8, 0.8, 0, Math.PI*2); ctx.fill();
    } else if (rng() < 0.4) {
      ctx.fillStyle = '#4a4640';
      ctx.beginPath(); ctx.ellipse(-22, -3, 9, 5, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(80,150,50,0.6)';
      ctx.beginPath(); ctx.ellipse(-25, -6, 4, 2, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-19, -6.5, 3, 1.6, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  _sceneryMars(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'mars');
    // Mars rocks
    const sz = 12 + rng() * 20;
    ctx.save(); ctx.translate(x, y);
    const rg = ctx.createRadialGradient(-sz*0.2,-sz*0.3,1,0,0,sz);
    rg.addColorStop(0,'#cc5522'); rg.addColorStop(0.6,'#994422'); rg.addColorStop(1,'#441100');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-sz, 0);
    for (let pt = 0; pt < 7; pt++) {
      const pa = (pt/7)*Math.PI*2;
      const pr = sz * (0.7 + Math.sin(pt*127+x)*0.3);
      ctx.lineTo(Math.cos(pa)*pr, Math.sin(pa)*pr - sz*0.1);
    }
    ctx.closePath(); ctx.fill();
    // Craters on the rock (static, seeded by x)
    for (let cr = 0; cr < 3; cr++) {
      const ca = cr * 2.1 + x * 0.13;
      const cd = sz * (0.25 + ((cr*37 + Math.floor(x)) % 5) * 0.06);
      const cx = Math.cos(ca) * sz * 0.4;
      const cy = Math.sin(ca) * sz * 0.35 - sz*0.1;
      const cw = sz * (0.14 + cr * 0.03);
      ctx.fillStyle = 'rgba(50,15,5,0.5)';
      ctx.beginPath(); ctx.ellipse(cx, cy, cw, cw*0.7, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(220,130,80,0.35)';
      ctx.beginPath(); ctx.ellipse(cx - cw*0.3, cy - cw*0.25, cw*0.4, cw*0.28, 0, 0, Math.PI*2); ctx.fill();
    }
    // Top-left rim highlight
    ctx.fillStyle = 'rgba(240,160,110,0.4)';
    ctx.beginPath(); ctx.ellipse(-sz*0.35, -sz*0.35, sz*0.3, sz*0.16, -0.6, 0, Math.PI*2); ctx.fill();
    // Dust around rock
    ctx.fillStyle = 'rgba(200,100,50,0.15)';
    ctx.beginPath(); ctx.ellipse(0,4,sz*1.4,sz*0.3,0,0,Math.PI*2); ctx.fill();
    // A couple of small scattered pebbles
    ctx.fillStyle = '#8a3a1a';
    ctx.beginPath(); ctx.arc(sz*1.1, 2, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(-sz*1.2, 3, 2.2, 0, Math.PI*2); ctx.fill();
    // Foreground variety: half-buried metal debris glinting in the dust
    if (rng() < 0.28) {
      const dx = sz*1.3 + rng()*8;
      ctx.fillStyle = '#7c7c84';
      ctx.beginPath();
      ctx.moveTo(dx - 8, 3); ctx.lineTo(dx - 5, -6); ctx.lineTo(dx + 4, -4);
      ctx.lineTo(dx + 7, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(210,210,220,0.5)';
      ctx.fillRect(dx - 4, -4, 4, 1.6);
      ctx.fillStyle = 'rgba(150,70,40,0.4)';           // rusty stain
      ctx.beginPath(); ctx.ellipse(dx + 2, 1, 3, 1.4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  _sceneryNeon(ctx, x, y, rng, t) {
    this._sceneryDepth(ctx, x, y, 'neon_city');
    // Neon sign
    const signs = ['◎ SHOP','★ BAR','◈ HOTEL','▶ CLUB'];
    const cols  = ['#ff00ff','#00ffff','#ff4400','#00ff88'];
    const idx   = Math.floor(rng() * signs.length);
    ctx.save(); ctx.translate(x, y - 30);
    // Sign backing panel with glowing border
    ctx.fillStyle = '#0a0a12'; ctx.fillRect(-22, -14, 44, 16);
    ctx.shadowColor = cols[idx]; ctx.shadowBlur = 10;
    ctx.strokeStyle = cols[idx]; ctx.lineWidth = 1.5;
    ctx.strokeRect(-21, -13, 42, 14);
    ctx.shadowBlur = 12;
    ctx.fillStyle = cols[idx]; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(signs[idx], 0, -6);
    // Small second neon accent underneath (different colour, static)
    const idx2 = (idx + 2) % cols.length;
    ctx.shadowColor = cols[idx2]; ctx.shadowBlur = 8;
    ctx.strokeStyle = cols[idx2]; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-16, 4); ctx.lineTo(16, 4); ctx.stroke();
    ctx.shadowBlur = 0;
    // Vertical marquee bulbs on the sign edge
    ctx.fillStyle = cols[idx];
    for (let bl = 0; bl < 4; bl++) {
      ctx.globalAlpha = (bl % 2) ? 1 : 0.4;
      ctx.beginPath(); ctx.arc(-24, -12 + bl*5, 1.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(24, -12 + bl*5, 1.4, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Post with faint neon under-glow
    ctx.fillStyle = '#333'; ctx.fillRect(-2, 2, 4, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-2, 2, 1, 30);
    // Foreground variety: a small glowing bollard with a wet neon reflection
    if (rng() < 0.4) {
      const bx = (rng()<0.5?-1:1)*(15 + rng()*8);
      ctx.fillStyle = '#181828';
      ctx.fillRect(bx-3, 20, 6, 12);
      ctx.shadowColor = cols[idx2]; ctx.shadowBlur = 6;
      ctx.fillStyle = cols[idx2];
      ctx.fillRect(bx-3, 22, 6, 1.6);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(150,120,220,0.16)';        // wet reflection on ground
      ctx.beginPath(); ctx.ellipse(bx, 33, 9, 2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  _sceneryWasteland(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'wasteland');
    if (rng() < 0.5) {
      // Rusted barrel
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#441100'; ctx.fillRect(-8,-22,16,22);
      // Rust streaks + highlight edge
      ctx.fillStyle = 'rgba(140,70,20,0.5)'; ctx.fillRect(-8,-22,3,22);
      ctx.fillStyle = 'rgba(90,40,10,0.6)'; ctx.fillRect(4,-22,4,22);
      ctx.fillStyle = '#221100'; ctx.fillRect(-8,-24,16,4);
      ctx.strokeStyle = '#331100'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8,-8); ctx.lineTo(8,-8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8,-15); ctx.lineTo(8,-15); ctx.stroke();
      // Corrosion dots
      ctx.fillStyle = 'rgba(20,10,0,0.6)';
      ctx.beginPath(); ctx.arc(-3, -12, 1.4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -18, 1.1, 0, Math.PI*2); ctx.fill();
      // Toxic ooze puddle sometimes
      if (rng()<0.4) { ctx.fillStyle='rgba(120,200,40,0.4)'; ctx.beginPath(); ctx.ellipse(10, 0, 8, 2.5, 0, 0, Math.PI*2); ctx.fill(); }
      // Skull
      if (rng()<0.3) { ctx.fillStyle='rgba(255,200,50,0.7)'; ctx.font='9px Arial'; ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText('☠',-6,-22); }
      ctx.restore();
    } else {
      // Rusted car wreck
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 3, 26, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#441a00'; ctx.fillRect(-24,-12,48,16);
      ctx.fillStyle = '#221000'; ctx.fillRect(-14,-22,28,12);
      // Rust patches
      ctx.fillStyle = 'rgba(140,70,20,0.5)'; ctx.fillRect(-24,-8,10,12);
      ctx.fillStyle = 'rgba(90,45,10,0.5)'; ctx.fillRect(14,-6,10,10);
      // Broken windows
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-10,-20,24,8);
      ctx.strokeStyle = 'rgba(120,140,150,0.4)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-6,-20); ctx.lineTo(2,-12); ctx.moveTo(8,-20); ctx.lineTo(0,-13); ctx.stroke();
      // Flat/missing wheels
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-14, 4, 5, 0, Math.PI); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 4, 5, 0, Math.PI); ctx.fill();
      // Sagging door / hole
      ctx.strokeStyle = '#221000'; ctx.lineWidth = 1.5;
      ctx.strokeRect(-4, -10, 12, 12);
      ctx.restore();
    }
  },

  _sceneryCanyon(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'canyon');
    // Canyon rocks / formations
    const sz = 18 + rng() * 25;
    ctx.save(); ctx.translate(x, y);
    // Ground shadow
    ctx.fillStyle = 'rgba(60,25,10,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 1, sz, 5, 0, 0, Math.PI*2); ctx.fill();
    // Mesa body with vertical strata colour bands (static)
    const bands = ['#7a3a1e','#9a4d28','#8a4322','#a85a30','#6e3418'];
    const bandH = (sz * 1.1) / bands.length;
    for (let bi = 0; bi < bands.length; bi++) {
      const topY = -sz*1.1 + bi*bandH;
      const botY = topY + bandH;
      // Trapezoid slice following the mesa slope
      const tt = (bi) / bands.length, bt = (bi+1) / bands.length;
      const topW = sz*0.6 + (sz*0.2)*tt;
      const botW = sz*0.6 + (sz*0.2)*bt;
      ctx.fillStyle = bands[bi];
      ctx.beginPath();
      ctx.moveTo(-topW, topY); ctx.lineTo(topW, topY);
      ctx.lineTo(botW, botY); ctx.lineTo(-botW, botY);
      ctx.closePath(); ctx.fill();
    }
    // Lit left face
    ctx.fillStyle = 'rgba(230,150,90,0.25)';
    ctx.beginPath();
    ctx.moveTo(-sz*0.6, -sz*1.1); ctx.lineTo(-sz*0.6 + 5, -sz*1.1);
    ctx.lineTo(-sz*0.8 + 5, 0); ctx.lineTo(-sz*0.8, 0);
    ctx.closePath(); ctx.fill();
    // Strata highlight lines
    ctx.strokeStyle = 'rgba(200,110,60,0.6)'; ctx.lineWidth = 1;
    for (let sl = 1; sl < 5; sl++) {
      const sy = -sz * sl * 0.22;
      ctx.beginPath(); ctx.moveTo(-sz*0.75, sy); ctx.lineTo(sz*0.72, sy); ctx.stroke();
    }
    // Vertical cracks
    ctx.strokeStyle = 'rgba(50,20,8,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-sz*0.2, -sz*1.0); ctx.lineTo(-sz*0.28, -sz*0.3);
    ctx.moveTo(sz*0.3, -sz*0.9);  ctx.lineTo(sz*0.36, -sz*0.1);
    ctx.stroke();
    // A smaller companion spire beside the mesa
    ctx.fillStyle = '#8a4322';
    ctx.beginPath();
    ctx.moveTo(sz*0.9, 0); ctx.lineTo(sz*1.05, -sz*0.6);
    ctx.lineTo(sz*1.25, -sz*0.55); ctx.lineTo(sz*1.35, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,110,60,0.4)';
    ctx.fillRect(sz*0.95, -sz*0.4, sz*0.06, sz*0.4);
    ctx.restore();
  },

  // ── Glowing crystal clusters (crystal_cave / cave) ─────────────────────
  _sceneryCrystalCave(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'crystal_cave');
    ctx.save(); ctx.translate(x, y);
    // Soft coloured ground glow
    ctx.fillStyle = 'rgba(120,90,220,0.16)';
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI*2); ctx.fill();
    const palettes = [
      ['#8a6cff','#c9b8ff','#5a3ad0'],
      ['#4fd0ff','#c0f2ff','#2a80c0'],
      ['#ff6cc0','#ffc0e6','#c03a80'],
      ['#5affc0','#c8ffe6','#2ac080'],
    ];
    const pal = palettes[Math.floor(rng()*palettes.length)];
    const cluster = 3 + Math.floor(rng()*3);
    for (let c = 0; c < cluster; c++) {
      const cx = (c - cluster/2) * 8 + (rng()-0.5)*6;
      const ch = 24 + rng()*42;
      const cw = 5 + rng()*4;
      const lean = (rng()-0.5)*0.5;
      ctx.save(); ctx.translate(cx, 0); ctx.rotate(lean);
      // Faceted prism body
      const grad = ctx.createLinearGradient(0, 0, 0, -ch);
      grad.addColorStop(0, pal[2]); grad.addColorStop(0.5, pal[0]); grad.addColorStop(1, pal[1]);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-cw, 0); ctx.lineTo(-cw*0.6, -ch*0.8); ctx.lineTo(0, -ch);
      ctx.lineTo(cw*0.6, -ch*0.8); ctx.lineTo(cw, 0); ctx.closePath(); ctx.fill();
      // Lit right facet
      ctx.globalAlpha = 0.45; ctx.fillStyle = pal[1];
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -ch); ctx.lineTo(cw*0.6, -ch*0.8); ctx.lineTo(cw, 0);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      // Bright edge highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-cw*0.6, -ch*0.8); ctx.lineTo(0, -ch); ctx.stroke();
      // Glowing tip
      ctx.fillStyle = pal[1]; ctx.shadowColor = pal[0]; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, -ch, 2, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    // Little floating spark motes
    ctx.fillStyle = pal[1];
    for (let s = 0; s < 3; s++) {
      ctx.globalAlpha = 0.4 + rng()*0.4;
      ctx.beginPath(); ctx.arc(-20 + rng()*40, -18 - rng()*26, 0.9, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  // ── Giant glowing mushrooms (mushroom map) ─────────────────────────────
  _sceneryMushroom(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'mushroom');
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(2, 2, 24, 6, 0, 0, Math.PI*2); ctx.fill();
    const caps = [
      ['#e0403a','#ff7a6a','#ffffff'],
      ['#c040c0','#e878e8','#ffe0ff'],
      ['#e08a20','#ffc060','#fff0d0'],
      ['#4a9ad0','#7ac8f0','#e0f6ff'],
    ];
    const count = 1 + Math.floor(rng()*2);
    for (let m = 0; m < count; m++) {
      const mx = m === 0 ? 0 : (rng()<0.5?-1:1)*(15 + rng()*10);
      const scale = m === 0 ? 1 : 0.5 + rng()*0.3;
      const cap = caps[Math.floor(rng()*caps.length)];
      const h = (38 + rng()*30) * scale;
      const capW = (15 + rng()*8) * scale;
      ctx.save(); ctx.translate(mx, 0);
      // Curved stem
      const sg = ctx.createLinearGradient(-4, 0, 6, 0);
      sg.addColorStop(0, '#d8c8b0'); sg.addColorStop(0.5, '#f2e8d8'); sg.addColorStop(1, '#c0b098');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-4*scale, 0); ctx.quadraticCurveTo(-5*scale, -h*0.6, -3*scale, -h);
      ctx.lineTo(3*scale, -h); ctx.quadraticCurveTo(5*scale, -h*0.6, 4*scale, 0);
      ctx.closePath(); ctx.fill();
      // Ring skirt
      ctx.fillStyle = 'rgba(240,230,210,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -h*0.72, 6*scale, 2.4*scale, 0, 0, Math.PI*2); ctx.fill();
      // Domed cap
      const cg = ctx.createLinearGradient(0, -h - capW*0.7, 0, -h + 4);
      cg.addColorStop(0, cap[1]); cg.addColorStop(1, cap[0]);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(0, -h, capW, capW*0.75, 0, Math.PI, Math.PI*2);
      ctx.quadraticCurveTo(capW*0.6, -h + 5, 0, -h + 4);
      ctx.quadraticCurveTo(-capW*0.6, -h + 5, -capW, -h);
      ctx.fill();
      // Under-cap glow gills
      ctx.fillStyle = 'rgba(180,120,220,0.35)';
      ctx.beginPath(); ctx.ellipse(0, -h + 3, capW*0.8, 2*scale, 0, 0, Math.PI*2); ctx.fill();
      // White spots
      ctx.fillStyle = cap[2];
      for (let s = 0; s < 4; s++) {
        const sa = (s/4)*Math.PI + 0.4;
        ctx.beginPath();
        ctx.arc(Math.cos(sa)*capW*0.55, -h - Math.sin(sa)*capW*0.35, 1.6*scale + rng()*1.2, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Ground spores glow
    ctx.fillStyle = 'rgba(180,255,180,0.5)';
    for (let sp = 0; sp < 3; sp++) {
      ctx.beginPath(); ctx.arc(-18 + rng()*36, -3 - rng()*6, 1, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Ancient broken pillars & blocks (ruins map) ────────────────────────
  _sceneryRuins(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'ruins');
    ctx.save(); ctx.translate(x, y);
    const r = rng();
    ctx.fillStyle = 'rgba(40,30,15,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 1, 26, 6, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.55) {
      // Broken fluted column
      const h = 55 + rng()*45;
      const cw = 9 + rng()*3;
      const broken = 0.55 + rng()*0.35;
      const topY = -h*broken;
      // Plinth
      ctx.fillStyle = '#b8a878'; ctx.fillRect(-cw-4, -6, (cw+4)*2, 6);
      ctx.fillStyle = '#9a8a60'; ctx.fillRect(-cw-6, -3, (cw+6)*2, 3);
      // Shaft
      const sg = ctx.createLinearGradient(-cw, 0, cw, 0);
      sg.addColorStop(0, '#8a7a54'); sg.addColorStop(0.5, '#c8b888'); sg.addColorStop(1, '#7a6a48');
      ctx.fillStyle = sg;
      ctx.fillRect(-cw, topY, cw*2, -topY);
      // Vertical flutes
      ctx.strokeStyle = 'rgba(90,78,52,0.6)'; ctx.lineWidth = 1;
      for (let f = -1; f <= 2; f++) {
        const fx = f * cw*0.5;
        ctx.beginPath(); ctx.moveTo(fx, topY); ctx.lineTo(fx, -3); ctx.stroke();
      }
      // Jagged broken top
      ctx.fillStyle = '#c8b888';
      ctx.beginPath();
      ctx.moveTo(-cw, topY);
      ctx.lineTo(-cw*0.4, topY - 5); ctx.lineTo(cw*0.2, topY + 3);
      ctx.lineTo(cw, topY - 4); ctx.lineTo(cw, topY + 6); ctx.lineTo(-cw, topY + 6);
      ctx.closePath(); ctx.fill();
      // Crack + moss
      ctx.strokeStyle = 'rgba(60,50,30,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-cw*0.3, -8); ctx.lineTo(cw*0.2, topY*0.5); ctx.stroke();
      ctx.fillStyle = 'rgba(70,110,40,0.5)';
      ctx.beginPath(); ctx.ellipse(-cw*0.6, -6, 4, 2, 0, 0, Math.PI*2); ctx.fill();
      // Fallen capital block
      if (rng() < 0.5) {
        ctx.fillStyle = '#b0a070'; ctx.fillRect(cw+6, -8, 14, 8);
        ctx.fillStyle = 'rgba(90,78,52,0.5)'; ctx.fillRect(cw+6, -8, 14, 2);
      }
    } else {
      // Toppled stacked blocks
      for (let b = 0; b < 4; b++) {
        const bw = 20 - b*3, bx = -bw/2 + (rng()-0.5)*6, by = -8 - b*9;
        ctx.fillStyle = b % 2 ? '#b8a878' : '#c8b888';
        ctx.fillRect(bx, by, bw, 9);
        ctx.fillStyle = 'rgba(90,78,52,0.4)'; ctx.fillRect(bx, by, bw, 2);
        ctx.strokeStyle = 'rgba(70,60,38,0.4)'; ctx.lineWidth = 0.8;
        ctx.strokeRect(bx, by, bw, 9);
      }
      ctx.fillStyle = 'rgba(70,110,40,0.45)';
      ctx.beginPath(); ctx.ellipse(0, -44, 6, 2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Warm autumn tree with fallen leaves (autumn map) ───────────────────
  _sceneryAutumn(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'autumn');
    const h = 50 + rng()*40;
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.13)';
    ctx.beginPath(); ctx.ellipse(4, 0, 22, 5, 0, 0, Math.PI*2); ctx.fill();
    // Trunk
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-4, -h, 8, h);
    ctx.fillStyle = 'rgba(40,24,10,0.5)'; ctx.fillRect(1, -h, 3, h);
    // Branches
    ctx.strokeStyle = '#4a2f16'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-3, -h*0.6); ctx.lineTo(-11, -h*0.74);
    ctx.moveTo(3, -h*0.5); ctx.lineTo(12, -h*0.62);
    ctx.stroke();
    // Warm canopy blobs
    const cols = ['#d9541e','#e88a1e','#c9a227','#b83a1a'];
    for (let cl = 0; cl < 7; cl++) {
      const ca = (cl/7)*Math.PI*2;
      const cx = Math.cos(ca)*(14 + rng()*8);
      const cy = -h - 6 + Math.sin(ca)*(12 + rng()*6);
      ctx.fillStyle = cols[Math.floor(rng()*cols.length)];
      ctx.beginPath(); ctx.arc(cx, cy, 9 + rng()*5, 0, Math.PI*2); ctx.fill();
    }
    // Sunlit dab
    ctx.fillStyle = 'rgba(255,210,120,0.5)';
    ctx.beginPath(); ctx.arc(-6, -h - 10, 5, 0, Math.PI*2); ctx.fill();
    // Fallen leaves at base
    for (let l = 0; l < 5; l++) {
      ctx.fillStyle = cols[Math.floor(rng()*cols.length)];
      ctx.save(); ctx.translate(-18 + rng()*36, -1 - rng()*2); ctx.rotate(rng()*Math.PI);
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Cherry-blossom grove: sakura trees, red torii, stone lantern, petals (sakura map) ──
  _scenerySakura(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(90,40,60,0.16)';
    ctx.beginPath(); ctx.ellipse(4, 0, 24, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.16) {
      // Red torii gate
      const gw = 30 + rng()*10, gh = 60 + rng()*20;
      ctx.fillStyle = '#c62828';
      ctx.fillRect(-gw*0.5 - 3, -gh, 6, gh);
      ctx.fillRect(gw*0.5 - 3, -gh, 6, gh);
      ctx.fillStyle = '#b71c1c';
      // lower tie beam
      ctx.fillRect(-gw*0.5 - 6, -gh*0.72, gw + 12, 6);
      // upper lintel with upturned ends
      ctx.fillStyle = '#7f1414';
      ctx.beginPath();
      ctx.moveTo(-gw*0.5 - 12, -gh);
      ctx.lineTo(gw*0.5 + 12, -gh);
      ctx.lineTo(gw*0.5 + 12, -gh - 7);
      ctx.quadraticCurveTo(0, -gh - 12, -gw*0.5 - 12, -gh - 7);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c62828';
      ctx.fillRect(-gw*0.5 - 12, -gh - 3, gw + 24, 4);
    } else if (r < 0.30) {
      // Stone lantern (toro)
      const lh = 30 + rng()*8;
      ctx.fillStyle = '#8d8378';
      ctx.fillRect(-4, -lh*0.45, 8, lh*0.45);           // post
      ctx.fillStyle = '#9c9288';
      ctx.beginPath(); ctx.ellipse(0, -lh*0.45, 12, 4, 0, 0, Math.PI*2); ctx.fill(); // platform
      ctx.fillStyle = '#a89e93';
      ctx.fillRect(-9, -lh*0.78, 18, lh*0.33);          // light box
      ctx.fillStyle = 'rgba(255,220,150,0.85)';
      ctx.fillRect(-4, -lh*0.70, 8, lh*0.18);           // glow window
      ctx.fillStyle = '#8d8378';
      ctx.beginPath();                                  // roof
      ctx.moveTo(-12, -lh*0.78); ctx.lineTo(12, -lh*0.78);
      ctx.lineTo(7, -lh*0.94); ctx.lineTo(-7, -lh*0.94);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9c9288';
      ctx.beginPath(); ctx.arc(0, -lh, 3, 0, Math.PI*2); ctx.fill(); // finial
    } else {
      // Cherry-blossom tree
      const h = 48 + rng()*34;
      ctx.fillStyle = '#5a3b2e'; ctx.fillRect(-4, -h, 8, h);
      ctx.fillStyle = 'rgba(40,24,18,0.5)'; ctx.fillRect(1, -h, 3, h);
      ctx.strokeStyle = '#4a2f24'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -h*0.62); ctx.lineTo(-12, -h*0.78);
      ctx.moveTo(3, -h*0.52); ctx.lineTo(13, -h*0.66);
      ctx.stroke();
      // Soft pink blossom canopy
      const cols = ['#f8bbd0','#f48fb1','#f3a6c4','#ffd6e6'];
      for (let cl = 0; cl < 8; cl++) {
        const ca = (cl/8)*Math.PI*2;
        const cx = Math.cos(ca)*(15 + rng()*8);
        const cy = -h - 6 + Math.sin(ca)*(12 + rng()*6);
        ctx.fillStyle = cols[Math.floor(rng()*cols.length)];
        ctx.beginPath(); ctx.arc(cx, cy, 9 + rng()*5, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-6, -h - 10, 5, 0, Math.PI*2); ctx.fill();
    }
    // Small pink petal drifts at base
    ctx.fillStyle = '#f8bbd0';
    for (let pd = 0; pd < 5; pd++) {
      ctx.save(); ctx.translate(-18 + rng()*36, -1 - rng()*2); ctx.rotate(rng()*Math.PI);
      ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Haunted graveyard: crooked tombstones, dead trees, iron fence, mausoleum, wisps (graveyard map) ──
  _sceneryGraveyard(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    // Damp shadow patch at base
    ctx.fillStyle = 'rgba(20,16,32,0.28)';
    ctx.beginPath(); ctx.ellipse(2, 0, 26, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.14) {
      // Wrought-iron fence section — vertical bars with spear tips + two rails
      const bars = 5, span = 46, bh = 30 + rng()*8;
      ctx.strokeStyle = '#1c1824'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(-span*0.5, -bh*0.72); ctx.lineTo(span*0.5, -bh*0.72);
      ctx.moveTo(-span*0.5, -bh*0.28); ctx.lineTo(span*0.5, -bh*0.28); ctx.stroke();
      for (let b = 0; b < bars; b++) {
        const bx = -span*0.5 + (b/(bars-1))*span;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, -bh); ctx.stroke();
        ctx.fillStyle = '#1c1824';                     // spear tip
        ctx.beginPath(); ctx.moveTo(bx-3, -bh); ctx.lineTo(bx, -bh-6); ctx.lineTo(bx+3, -bh); ctx.closePath(); ctx.fill();
      }
    } else if (r < 0.24) {
      // Stone mausoleum with pillars, roof and dark doorway
      const mw = 42 + rng()*12, mh = 40 + rng()*10;
      ctx.fillStyle = '#5a5560'; ctx.fillRect(-mw*0.5, -mh, mw, mh);
      ctx.fillStyle = 'rgba(20,16,28,0.35)'; ctx.fillRect(2, -mh, mw*0.5 - 2, mh); // shaded side
      ctx.fillStyle = '#6b6672';                        // pillars
      ctx.fillRect(-mw*0.5, -mh, 6, mh); ctx.fillRect(mw*0.5 - 6, -mh, 6, mh);
      ctx.fillStyle = '#4a4550';                        // pediment roof
      ctx.beginPath(); ctx.moveTo(-mw*0.5 - 5, -mh); ctx.lineTo(mw*0.5 + 5, -mh);
      ctx.lineTo(0, -mh - 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0e0a18';                        // doorway
      ctx.fillRect(-8, -mh*0.62, 16, mh*0.62);
      ctx.fillStyle = 'rgba(140,110,190,0.18)';         // faint inner glow
      ctx.fillRect(-6, -mh*0.55, 12, mh*0.5);
    } else if (r < 0.5) {
      // Bare dead tree — crooked trunk, jagged leafless branches
      const h = 52 + rng()*32;
      ctx.strokeStyle = '#2c2420'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(4 + rng()*4, -h*0.5, -2 - rng()*4, -h);
      ctx.stroke();
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-1, -h*0.62); ctx.lineTo(-16 - rng()*6, -h*0.78);
      ctx.moveTo(-1, -h*0.62); ctx.lineTo(-20, -h*0.62);
      ctx.moveTo(-2, -h*0.82); ctx.lineTo(11 + rng()*6, -h*0.96);
      ctx.moveTo(-2, -h*0.82); ctx.lineTo(16, -h*0.8);
      ctx.moveTo(-2, -h);      ctx.lineTo(-9, -h - 10);
      ctx.moveTo(-2, -h);      ctx.lineTo(7, -h - 8);
      ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      // Crooked tombstone (RIP) — rounded or cross-topped headstone, leaning
      const gw = 20 + rng()*8, gh = 26 + rng()*16;
      const lean = (rng() - 0.5) * 0.32;
      ctx.save(); ctx.rotate(lean);
      ctx.fillStyle = 'rgba(18,14,28,0.3)'; ctx.fillRect(-gw*0.5, -3, gw, 4); // base soil
      if (rng() < 0.35) {
        // Cross-topped grave marker
        ctx.fillStyle = '#7a7480';
        ctx.fillRect(-4, -gh, 8, gh);
        ctx.fillRect(-11, -gh*0.78, 22, 7);
        ctx.fillStyle = 'rgba(20,16,28,0.3)'; ctx.fillRect(1, -gh, 3, gh);
      } else {
        // Rounded headstone
        ctx.fillStyle = '#7a7480';
        ctx.beginPath();
        ctx.moveTo(-gw*0.5, 0);
        ctx.lineTo(-gw*0.5, -gh + gw*0.5);
        ctx.arc(0, -gh + gw*0.5, gw*0.5, Math.PI, 0);
        ctx.lineTo(gw*0.5, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(20,16,28,0.28)';         // shaded right edge
        ctx.fillRect(2, -gh + 4, gw*0.5 - 2, gh - 4);
        ctx.fillStyle = '#4a4550';                     // RIP engraving
        ctx.font = '8px serif'; ctx.textAlign = 'center';
        ctx.fillText('RIP', 0, -gh*0.55);
      }
      ctx.restore();
    }
    // Faint purple ground wisps drifting near the base
    for (let w = 0; w < 3; w++) {
      const wx = -20 + rng()*40, wy = -3 - rng()*10, wr = 3 + rng()*3;
      ctx.fillStyle = 'rgba(150,110,210,0.14)';
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(180,150,240,0.10)';
      ctx.beginPath(); ctx.arc(wx, wy - 2, wr*0.6, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Bright fairground: striped tents, distant ferris wheel, bunting lights, balloons (carnival map) ──
  _sceneryCarnival(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    // Soft grassy shadow patch at base
    ctx.fillStyle = 'rgba(40,70,30,0.18)';
    ctx.beginPath(); ctx.ellipse(4, 0, 26, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.14) {
      // Distant ferris wheel silhouette
      const cx = 0, cy = -78 - rng()*20, rad = 46 + rng()*14;
      ctx.strokeStyle = 'rgba(60,80,110,0.5)'; ctx.lineWidth = 3;
      // Support legs
      ctx.beginPath();
      ctx.moveTo(cx - rad*0.5, 0); ctx.lineTo(cx, cy);
      ctx.moveTo(cx + rad*0.5, 0); ctx.lineTo(cx, cy);
      ctx.stroke();
      // Outer rim
      ctx.strokeStyle = 'rgba(70,95,130,0.55)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.stroke();
      // Spokes + gondolas
      const cabCols = ['#e5487f','#f6c445','#4fb0e0','#7ed957'];
      for (let s = 0; s < 8; s++) {
        const a = (s/8)*Math.PI*2;
        const gx = cx + Math.cos(a)*rad, gy = cy + Math.sin(a)*rad;
        ctx.strokeStyle = 'rgba(70,95,130,0.4)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(gx, gy); ctx.stroke();
        ctx.fillStyle = cabCols[s % cabCols.length];
        ctx.beginPath(); ctx.arc(gx, gy, 4, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(80,100,140,0.6)';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
    } else if (r < 0.34) {
      // Popcorn cart with striped awning
      const cw = 30 + rng()*8, ch = 24 + rng()*6;
      ctx.fillStyle = '#c85a3a';                          // cart body
      ctx.fillRect(-cw*0.5, -ch, cw, ch);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';            // glass front
      ctx.fillRect(-cw*0.5 + 4, -ch + 4, cw - 8, ch*0.5);
      // Popcorn heap
      ctx.fillStyle = '#fff4d0';
      for (let pc = 0; pc < 7; pc++) {
        ctx.beginPath();
        ctx.arc(-cw*0.3 + rng()*cw*0.6, -ch + 6 + rng()*4, 2.5 + rng()*2, 0, Math.PI*2);
        ctx.fill();
      }
      // Striped awning
      const aw = cw + 8;
      for (let st = 0; st < 6; st++) {
        ctx.fillStyle = (st % 2 === 0) ? '#e53935' : '#fdfdfd';
        ctx.fillRect(-aw*0.5 + st*(aw/6), -ch - 8, aw/6, 8);
      }
      ctx.fillStyle = '#7a4a2a';                           // wheels
      ctx.beginPath(); ctx.arc(-cw*0.3, 0, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cw*0.3, 0, 4, 0, Math.PI*2); ctx.fill();
    } else if (r < 0.5) {
      // Balloon cluster on a string
      const bx0 = -6 + rng()*12, bcnt = 4 + Math.floor(rng()*3);
      const bCols = ['#e5487f','#f6c445','#4fb0e0','#7ed957','#ff8a3d','#b06ce0'];
      ctx.strokeStyle = 'rgba(60,60,60,0.4)'; ctx.lineWidth = 1;
      for (let bl = 0; bl < bcnt; bl++) {
        const ba = (bl/bcnt)*Math.PI*2;
        const bx = bx0 + Math.cos(ba)*(10 + rng()*6);
        const by = -70 - rng()*22 + Math.sin(ba)*8;
        ctx.beginPath(); ctx.moveTo(bx0, -8); ctx.lineTo(bx, by + 8); ctx.stroke();
        ctx.fillStyle = bCols[Math.floor(rng()*bCols.length)];
        ctx.beginPath(); ctx.ellipse(bx, by, 8, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';           // highlight
        ctx.beginPath(); ctx.ellipse(bx - 2.5, by - 3, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
      }
    } else {
      // Striped circus tent with flag and bunting
      const tw = 46 + rng()*18, th = 40 + rng()*14;
      // Tent body (rounded base)
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(-tw*0.5, -th*0.55, tw, th*0.55);
      // Vertical stripes on body
      const stripes = 6;
      for (let s = 0; s < stripes; s++) {
        if (s % 2 === 0) continue;
        ctx.fillStyle = '#e5487f';
        ctx.fillRect(-tw*0.5 + s*(tw/stripes), -th*0.55, tw/stripes, th*0.55);
      }
      // Conical striped roof
      const peakY = -th, eaveY = -th*0.55;
      for (let s = 0; s < stripes; s++) {
        ctx.fillStyle = (s % 2 === 0) ? '#d63a6f' : '#fbfbfb';
        const x0 = -tw*0.5 + s*(tw/stripes);
        const x1 = -tw*0.5 + (s+1)*(tw/stripes);
        ctx.beginPath();
        ctx.moveTo(0, peakY); ctx.lineTo(x0, eaveY); ctx.lineTo(x1, eaveY);
        ctx.closePath(); ctx.fill();
      }
      // Dark entrance
      ctx.fillStyle = 'rgba(40,20,30,0.55)';
      ctx.beginPath();
      ctx.moveTo(-8, 0); ctx.lineTo(-8, -th*0.32);
      ctx.quadraticCurveTo(0, -th*0.42, 8, -th*0.32);
      ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
      // Pennant flag on peak
      ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, peakY); ctx.lineTo(0, peakY - 12); ctx.stroke();
      ctx.fillStyle = '#f6c445';
      ctx.beginPath();
      ctx.moveTo(0, peakY - 12); ctx.lineTo(14, peakY - 9); ctx.lineTo(0, peakY - 6);
      ctx.closePath(); ctx.fill();
    }
    // String-light bunting arc with colored triangular flags
    const buntCols = ['#e5487f','#f6c445','#4fb0e0','#7ed957','#ff8a3d'];
    ctx.strokeStyle = 'rgba(50,50,60,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-28, -34);
    ctx.quadraticCurveTo(0, -24, 28, -34);
    ctx.stroke();
    for (let f = 0; f < 6; f++) {
      const ft = f / 5;
      const fx = -28 + ft*56;
      const fy = -34 + Math.sin(ft*Math.PI)*10;
      ctx.fillStyle = buntCols[f % buntCols.length];
      ctx.beginPath();
      ctx.moveTo(fx - 3, fy); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx, fy + 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // ── Dutch windmill valley: turning-sail windmills, tulip rows, canal bridge, cheese/clog signpost (windmill map) ──
  _sceneryWindmill(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    // Soft grassy shadow patch at base
    ctx.fillStyle = 'rgba(40,70,30,0.16)';
    ctx.beginPath(); ctx.ellipse(4, 0, 26, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.34) {
      // Big turning-sail windmill
      const bw = 30 + rng()*10, bh = 66 + rng()*22;
      // Tapered stone/brick tower body
      ctx.fillStyle = '#c98b5a';
      ctx.beginPath();
      ctx.moveTo(-bw*0.5, 0); ctx.lineTo(-bw*0.3, -bh);
      ctx.lineTo(bw*0.3, -bh); ctx.lineTo(bw*0.5, 0);
      ctx.closePath(); ctx.fill();
      // Shading stripe
      ctx.fillStyle = 'rgba(120,70,40,0.28)';
      ctx.beginPath();
      ctx.moveTo(bw*0.06, 0); ctx.lineTo(bw*0.18, -bh);
      ctx.lineTo(bw*0.3, -bh); ctx.lineTo(bw*0.5, 0);
      ctx.closePath(); ctx.fill();
      // Little door + window
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(-5, -16, 10, 16);
      ctx.fillStyle = '#f6e6a8';
      ctx.beginPath(); ctx.arc(0, -bh*0.5, 4, 0, Math.PI*2); ctx.fill();
      // Conical cap
      ctx.fillStyle = '#7a5030';
      ctx.beginPath();
      ctx.moveTo(-bw*0.34, -bh); ctx.lineTo(0, -bh - 16); ctx.lineTo(bw*0.34, -bh);
      ctx.closePath(); ctx.fill();
      // Turning sails (4 arms, animated by t)
      const hubY = -bh - 4, arm = 30 + rng()*10;
      const spin = t * 0.6 + r * Math.PI * 2;
      ctx.save(); ctx.translate(0, hubY); ctx.rotate(spin);
      for (let s = 0; s < 4; s++) {
        ctx.rotate(Math.PI / 2);
        // Sail spar
        ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -arm); ctx.stroke();
        // Canvas lattice
        ctx.fillStyle = 'rgba(250,250,245,0.85)';
        ctx.fillRect(1.5, -arm, 5, arm);
        ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 0.7;
        for (let l = 1; l < 5; l++) {
          const ly = -arm + l * (arm / 5);
          ctx.beginPath(); ctx.moveTo(1.5, ly); ctx.lineTo(6.5, ly); ctx.stroke();
        }
      }
      ctx.restore();
      // Hub cap
      ctx.fillStyle = '#5a3a22';
      ctx.beginPath(); ctx.arc(0, hubY, 3.5, 0, Math.PI*2); ctx.fill();
    } else if (r < 0.58) {
      // Tulip flower rows
      const rows = 2 + Math.floor(rng()*2);
      const tulipCols = ['#e8734a','#e5487f','#f6c445','#d63a6f','#ff8a3d'];
      for (let ro = 0; ro < rows; ro++) {
        const ry = -2 - ro*7;
        const rx0 = -30 + ro*4;
        const cnt = 6 + Math.floor(rng()*3);
        for (let f = 0; f < cnt; f++) {
          const fx = rx0 + f * (56 / cnt);
          const stemH = 9 + rng()*4;
          // Stem
          ctx.strokeStyle = '#3f8a3a'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(fx, ry); ctx.lineTo(fx, ry - stemH); ctx.stroke();
          // Leaf
          ctx.fillStyle = '#4f9a3a';
          ctx.beginPath(); ctx.ellipse(fx - 2, ry - stemH*0.4, 2, 3.5, 0.5, 0, Math.PI*2); ctx.fill();
          // Cupped bloom
          ctx.fillStyle = tulipCols[Math.floor(rng()*tulipCols.length)];
          const by = ry - stemH - 3;
          ctx.beginPath();
          ctx.moveTo(fx - 3, by + 3);
          ctx.quadraticCurveTo(fx - 3.5, by - 3, fx, by - 2);
          ctx.quadraticCurveTo(fx + 3.5, by - 3, fx + 3, by + 3);
          ctx.quadraticCurveTo(fx, by + 5, fx - 3, by + 3);
          ctx.closePath(); ctx.fill();
        }
      }
    } else if (r < 0.78) {
      // Small canal with a wooden arched bridge
      const cw = 54 + rng()*18;
      // Water channel
      ctx.fillStyle = 'rgba(70,150,200,0.55)';
      ctx.beginPath(); ctx.ellipse(0, 1, cw*0.5, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(-6, -0.5, cw*0.28, 2, 0, 0, Math.PI*2); ctx.fill();
      // Arched wooden bridge deck
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-cw*0.36, -2);
      ctx.quadraticCurveTo(0, -20, cw*0.36, -2);
      ctx.stroke();
      // Railings
      ctx.strokeStyle = '#a06a3a'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-cw*0.36, -8);
      ctx.quadraticCurveTo(0, -26, cw*0.36, -8);
      ctx.stroke();
      // Vertical posts
      for (let p2 = 0; p2 < 5; p2++) {
        const pt = p2 / 4;
        const px = -cw*0.36 + pt*cw*0.72;
        const topY = -20 * (1 - Math.pow(2*pt - 1, 2)) - 2;
        ctx.beginPath(); ctx.moveTo(px, topY); ctx.lineTo(px, topY - 6); ctx.stroke();
      }
    } else {
      // Cheese wheel / wooden clog signpost
      const postH = 34 + rng()*10;
      ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -postH); ctx.stroke();
      // Signboard
      ctx.fillStyle = '#d8b26a';
      ctx.fillRect(-4, -postH - 4, 30, 14);
      ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1.4;
      ctx.strokeRect(-4, -postH - 4, 30, 14);
      // Wooden clog on the board
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(0, -postH + 6);
      ctx.quadraticCurveTo(2, -postH - 1, 12, -postH);
      ctx.quadraticCurveTo(20, -postH, 20, -postH + 5);
      ctx.lineTo(4, -postH + 6);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c98b1a'; ctx.lineWidth = 0.8; ctx.stroke();
      // Stacked cheese wheels at the base
      const cheeseCol = '#f4d76a', rindCol = '#e0a83a';
      for (let cc = 0; cc < 2; cc++) {
        const cyv = -6 - cc*8;
        ctx.fillStyle = rindCol;
        ctx.beginPath(); ctx.ellipse(-16, cyv, 11, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = cheeseCol;
        ctx.beginPath(); ctx.ellipse(-16, cyv - 1.5, 11, 5, 0, 0, Math.PI*2); ctx.fill();
        // Cut wedge notch
        ctx.fillStyle = rindCol;
        ctx.beginPath();
        ctx.moveTo(-16, cyv - 1.5); ctx.lineTo(-9, cyv - 4); ctx.lineTo(-9, cyv + 1);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── Serene bamboo forest: tall swaying segmented bamboo, hanging paper lanterns, small red-roofed pagoda, stone stepping path, resting pandas, drifting mist (bamboo map) ──
  _sceneryBamboo(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    // Distant parallax bamboo-grove silhouette (perf-gated, faint blue-green)
    if (ps >= 0.5) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = '#4f8f6a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const gn = 5 + Math.floor(rng()*4);
      for (let g = 0; g < gn; g++) {
        const gx = -40 + g * (80 / gn) + (rng()-0.5)*6;
        const gh = 60 + rng()*46;
        ctx.beginPath(); ctx.moveTo(gx, -8); ctx.lineTo(gx + (rng()-0.5)*5, -8 - gh); ctx.stroke();
      }
      ctx.globalAlpha = 0.14; ctx.fillStyle = '#4f8f6a';
      ctx.beginPath(); ctx.ellipse(0, -84, 44, 16, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Soft grassy shadow patch at base
    ctx.fillStyle = 'rgba(30,60,30,0.16)';
    ctx.beginPath(); ctx.ellipse(4, 0, 26, 5, 0, 0, Math.PI*2); ctx.fill();

    if (r < 0.4) {
      // Cluster of tall segmented bamboo stalks, gently swaying with t
      const stalks = 3 + Math.floor(rng()*3);
      for (let s = 0; s < stalks; s++) {
        const sx = -22 + s * (44 / stalks) + (rng()-0.5)*4;
        const sh = 78 + rng()*46;
        const thick = 3 + rng()*1.6;
        const phase = r * 6.28 + s;
        const sway = Math.sin(t * 0.8 + phase) * 4;   // static per-stalk offset at t=0, sways when animated
        const segs = 6 + Math.floor(rng()*3);
        const stalkCol = (s % 2 === 0) ? '#6aa83c' : '#7cbf4a';
        let px = sx, py = 0;
        for (let sg = 1; sg <= segs; sg++) {
          const frac = sg / segs;
          const nx = sx + sway * frac * frac;
          const ny = -sh * frac;
          ctx.strokeStyle = stalkCol; ctx.lineWidth = thick; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
          // node ring
          ctx.strokeStyle = 'rgba(50,90,30,0.5)'; ctx.lineWidth = thick * 0.9;
          ctx.beginPath(); ctx.moveTo(nx - 2, ny + 0.5); ctx.lineTo(nx + 2, ny - 0.5); ctx.stroke();
          px = nx; py = ny;
        }
        // A few narrow leaves near the top
        ctx.fillStyle = '#5f9e34';
        for (let lf = 0; lf < 3; lf++) {
          const la = -0.6 + rng()*1.2;
          ctx.save(); ctx.translate(px, py - 2); ctx.rotate(la);
          ctx.beginPath(); ctx.ellipse(8, 0, 8, 2.2, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      }
    } else if (r < 0.62) {
      // Hanging paper lanterns strung between two bamboo poles
      const span = 48 + rng()*16;
      const poleH = 56 + rng()*18;
      ctx.strokeStyle = '#7cbf4a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-span*0.5, 0); ctx.lineTo(-span*0.5, -poleH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(span*0.5, 0); ctx.lineTo(span*0.5, -poleH); ctx.stroke();
      // Sagging cord
      ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-span*0.5, -poleH);
      ctx.quadraticCurveTo(0, -poleH + 12, span*0.5, -poleH); ctx.stroke();
      // Lanterns hanging along the cord
      const lcnt = 3 + Math.floor(rng()*3);
      const lcols = ['#e34b3a','#e8734a','#f2b544'];
      for (let lp = 0; lp < lcnt; lp++) {
        const lt = (lp + 1) / (lcnt + 1);
        const lx = -span*0.5 + lt*span;
        const ly = -poleH + Math.sin(lt*Math.PI)*12 + 10;
        ctx.fillStyle = lcols[lp % lcols.length];
        ctx.beginPath(); ctx.ellipse(lx, ly, 6, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,180,0.5)';               // warm glow
        ctx.beginPath(); ctx.ellipse(lx - 1.5, ly - 2, 2, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#6a4a2a';                             // top + bottom caps
        ctx.fillRect(lx - 2.5, ly - 9, 5, 2); ctx.fillRect(lx - 2.5, ly + 7, 5, 2);
      }
    } else if (r < 0.82) {
      // Small red-roofed two-tier pagoda
      const pw = 30 + rng()*10, ph = 24 + rng()*10;
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(-pw*0.5, -4, pw, 4);          // base platform
      ctx.fillStyle = '#d8b48a'; ctx.fillRect(-pw*0.38, -ph, pw*0.76, ph);  // body
      ctx.fillStyle = '#5a3320'; ctx.fillRect(-4, -14, 8, 14);              // door
      for (let tier = 0; tier < 2; tier++) {
        const ry = -ph - tier*16;
        const rw = pw*(0.62 - tier*0.16);
        ctx.fillStyle = (tier === 0) ? '#b8382e' : '#c8443a';
        ctx.beginPath();
        ctx.moveTo(-rw, ry);
        ctx.quadraticCurveTo(-rw*1.15, ry - 2, -rw*1.2, ry + 3);
        ctx.lineTo(-rw*0.9, ry - 1);
        ctx.lineTo(0, ry - 12);
        ctx.lineTo(rw*0.9, ry - 1);
        ctx.lineTo(rw*1.2, ry + 3);
        ctx.quadraticCurveTo(rw*1.15, ry - 2, rw, ry);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,180,0.3)'; ctx.lineWidth = 1;       // ridge
        ctx.beginPath(); ctx.moveTo(0, ry - 12); ctx.lineTo(0, ry - 16); ctx.stroke();
      }
      ctx.fillStyle = '#f2b544';                                            // finial
      ctx.beginPath(); ctx.arc(0, -ph - 32, 2.4, 0, Math.PI*2); ctx.fill();
    } else {
      // Stone stepping path with a resting panda
      ctx.fillStyle = 'rgba(150,150,160,0.85)';
      for (let st = 0; st < 5; st++) {
        const sx = -30 + st*15 + (rng()-0.5)*3;
        ctx.fillStyle = 'rgba(150,150,160,0.85)';
        ctx.beginPath(); ctx.ellipse(sx, 0, 6.5, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(120,120,130,0.5)';
        ctx.beginPath(); ctx.ellipse(sx + 1, 0.6, 5, 2, 0, 0, Math.PI*2); ctx.fill();
      }
      // Resting panda
      const bx = 6 + rng()*8;
      ctx.fillStyle = '#f5f5f2';
      ctx.beginPath(); ctx.ellipse(bx, -6, 10, 7, 0, 0, Math.PI*2); ctx.fill();      // body
      ctx.beginPath(); ctx.arc(bx - 9, -10, 5.5, 0, Math.PI*2); ctx.fill();          // head
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath(); ctx.arc(bx - 12, -14, 2, 0, Math.PI*2); ctx.fill();           // ears
      ctx.beginPath(); ctx.arc(bx - 6, -14, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx - 11, -10, 1.4, 2, 0.3, 0, Math.PI*2); ctx.fill();   // eye patches
      ctx.beginPath(); ctx.ellipse(bx - 7, -10, 1.4, 2, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx + 4, -2, 4, 3, 0, 0, Math.PI*2); ctx.fill();   // hind leg
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(bx - 9, -9.5, 0.8, 0, Math.PI*2); ctx.fill();         // nose
    }

    // Drifting mist band over the base (soft, perf-gated)
    if (ps >= 0.5) {
      ctx.fillStyle = 'rgba(230,240,235,0.28)';
      ctx.beginPath(); ctx.ellipse(0, -6, 34, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(230,240,235,0.16)';
      ctx.beginPath(); ctx.ellipse(-10, -12, 22, 4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Rainbow arcade arches + twinkling stars (rainbow_road map) ─────────
  _sceneryRainbowRoad(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(40,20,80,0.18)';
    ctx.beginPath(); ctx.ellipse(4, 0, 24, 5, 0, 0, Math.PI*2); ctx.fill();
    const cols = ['#ff3b6b','#ff9f3b','#ffe23b','#4bd86b','#3ba8ff','#9b4bff'];
    if (r < 0.55) {
      const rad = 40 + rng()*22;
      for (let b = 0; b < cols.length; b++) {
        ctx.strokeStyle = cols[b]; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 4, rad - b*4, Math.PI*1.08, Math.PI*1.92); ctx.stroke();
      }
    } else if (r < 0.8) {
      for (let cch = 0; cch < 3; cch++) {
        const cy = -8 - cch*10;
        ctx.strokeStyle = cols[(cch + Math.floor(x)) % cols.length]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-10, cy + 5); ctx.lineTo(0, cy); ctx.lineTo(10, cy + 5); ctx.stroke();
      }
    } else {
      const s = 10 + rng()*8;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(0, -30 - s); ctx.lineTo(-s, -30); ctx.lineTo(0, -30 + s); ctx.lineTo(s, -30); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = cols[Math.floor(r * cols.length)];
      ctx.beginPath(); ctx.moveTo(0, -30 - s); ctx.lineTo(0, -30 + s); ctx.lineTo(s, -30); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (let st = 0; st < 4; st++) {
      const sx = -30 + st*18 + (rng()-0.5)*6;
      const sy = -40 - rng()*30;
      const tw = 0.5 + 0.5*Math.abs(Math.sin(t*2 + st + x*0.01));
      ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + tw*0.4).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Wind-carved dunes + blowing sand streaks (sandstorm map) ───────────
  _scenerySandstorm(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(90,60,20,0.2)';
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.5) {
      const dw = 46 + rng()*28, dh = 20 + rng()*16;
      const g = ctx.createLinearGradient(0, -dh, 0, 0);
      g.addColorStop(0, '#d9b878'); g.addColorStop(1, '#a07c3e');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-dw, 0);
      ctx.quadraticCurveTo(-dw*0.3, -dh, dw*0.2, -dh*0.7);
      ctx.quadraticCurveTo(dw*0.7, -dh*0.4, dw, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,235,190,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-dw*0.3, -dh); ctx.quadraticCurveTo(dw*0.2, -dh*0.7, dw, 0); ctx.stroke();
    } else if (r < 0.78) {
      ctx.fillStyle = '#7a5a34'; ctx.fillRect(-3, -34, 6, 34);
      ctx.fillStyle = '#5c4022'; ctx.fillRect(-10, -34, 20, 4);
    } else {
      ctx.strokeStyle = '#9a7a44'; ctx.lineWidth = 1.4;
      const tr = 9 + rng()*5;
      for (let br = 0; br < 8; br++) {
        const a = br*0.8 + x*0.05;
        ctx.beginPath(); ctx.moveTo(0, -tr); ctx.lineTo(Math.cos(a)*tr, -tr + Math.sin(a)*tr); ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(220,180,110,0.28)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let w = 0; w < 5; w++) {
      const wy = -6 - w*7;
      const off = Math.sin(t*1.5 + w + x*0.02) * 6;
      ctx.beginPath(); ctx.moveTo(-34 + off, wy); ctx.lineTo(30 + off, wy - 3); ctx.stroke();
    }
    ctx.restore();
  },

  // ── Glowing crystal trees + geodes (crystal_forest map) ────────────────
  _sceneryCrystalForest(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(20,40,70,0.25)';
    ctx.beginPath(); ctx.ellipse(4, 0, 26, 5, 0, 0, Math.PI*2); ctx.fill();
    const cols = ['#5ad8ff','#8a7cff','#5affd0','#c56aff'];
    const cc = cols[Math.floor(r * cols.length)];
    if (r < 0.7) {
      const cnt = 3 + Math.floor(rng()*3);
      for (let c = 0; c < cnt; c++) {
        const cx = -22 + c*(44/cnt) + (rng()-0.5)*4;
        const ch = 50 + rng()*46;
        const cw = 6 + rng()*5;
        const col = cols[(c + Math.floor(x)) % cols.length];
        ctx.fillStyle = col;
        if (ps >= 0.5) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx - cw, -ch*0.5); ctx.lineTo(cx, -ch);
        ctx.lineTo(cx + cw, -ch*0.5); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.moveTo(cx, -ch*0.2); ctx.lineTo(cx - cw*0.4, -ch*0.55); ctx.lineTo(cx, -ch); ctx.closePath(); ctx.fill();
      }
    } else {
      const s = 16 + rng()*10;
      ctx.fillStyle = '#2a3a52';
      ctx.beginPath(); ctx.arc(0, -s*0.5, s, 0, Math.PI*2); ctx.fill();
      for (let g = 0; g < 6; g++) {
        const ga = g*1.05;
        const gx = Math.cos(ga)*s*0.4, gy = -s*0.5 + Math.sin(ga)*s*0.4;
        ctx.fillStyle = cc;
        if (ps >= 0.5) { ctx.shadowColor = cc; ctx.shadowBlur = 6; }
        ctx.beginPath(); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx - 3, gy); ctx.lineTo(gx, gy + 4); ctx.lineTo(gx + 3, gy); ctx.closePath(); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    if (ps >= 0.5) {
      for (let m = 0; m < 3; m++) {
        const mx = -18 + m*16;
        const my = -30 - m*8 + Math.sin(t + m + x*0.01)*4;
        ctx.fillStyle = 'rgba(180,230,255,0.6)';
        ctx.beginPath(); ctx.arc(mx, my, 1.6, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── Palms, water pool & reeds (desert_oasis map) ───────────────────────
  _sceneryDesertOasis(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(90,70,30,0.2)';
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.45) {
      const cnt = 1 + Math.floor(rng()*2);
      for (let p = 0; p < cnt; p++) {
        const px = -10 + p*20 + (rng()-0.5)*4;
        const h = 54 + rng()*30;
        const lean = (rng()-0.5)*0.4;
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.quadraticCurveTo(px + lean*40, -h*0.6, px + lean*60, -h); ctx.stroke();
        const tx = px + lean*60, ty = -h;
        ctx.fillStyle = '#3f8a3a';
        for (let f = 0; f < 6; f++) {
          const fa = Math.PI + (f/5)*Math.PI;
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(fa);
          ctx.beginPath(); ctx.ellipse(16, 0, 16, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      }
    } else if (r < 0.78) {
      const pw = 30 + rng()*16;
      const g = ctx.createLinearGradient(0, -6, 0, 2);
      g.addColorStop(0, '#5ec8e0'); g.addColorStop(1, '#2a7a9a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, -1, pw, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const rip = Math.sin(t*2 + x*0.02)*2;
      ctx.beginPath(); ctx.ellipse(rip, -2, pw*0.5, 2, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#4a7a2a'; ctx.lineWidth = 2;
      for (let rd = 0; rd < 4; rd++) {
        const rx = -pw + rd*8;
        ctx.beginPath(); ctx.moveTo(rx, -2); ctx.lineTo(rx + 2, -16 - rng()*8); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#b08a4a';
      ctx.beginPath(); ctx.ellipse(-8, -6, 12, 8, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3f7a3a';
      ctx.fillRect(10, -22, 5, 22);
      ctx.fillRect(6, -14, 4, 3); ctx.fillRect(15, -18, 4, 3);
    }
    ctx.restore();
  },

  // ── Scrap cars, barrels & crane (junkyard map) ─────────────────────────
  _sceneryJunkyard(ctx, x, y, rng, t) {
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(30,25,15,0.25)';
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.45) {
      const cols = ['#8a3a2a','#3a5a7a','#6a6a4a','#7a4a6a'];
      for (let c = 0; c < 2; c++) {
        const cy = -c*16;
        const cw = 28 - c*4;
        ctx.fillStyle = cols[(c + Math.floor(x)) % cols.length];
        ctx.fillRect(-cw*0.5, cy - 12, cw, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-cw*0.3, cy - 11, cw*0.25, 5);
        ctx.fillRect(cw*0.05, cy - 11, cw*0.25, 5);
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-cw*0.3, cy, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cw*0.3, cy, 3, 0, Math.PI*2); ctx.fill();
      }
    } else if (r < 0.75) {
      const bc = ['#c04a2a','#4a7a3a','#c0a02a'];
      for (let b = 0; b < 3; b++) {
        const bx = -14 + b*14;
        ctx.fillStyle = bc[b % bc.length];
        ctx.fillRect(bx - 5, -18, 10, 18);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - 5, -12); ctx.lineTo(bx + 5, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - 5, -6); ctx.lineTo(bx + 5, -6); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#5a5040';
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-6, -18); ctx.lineTo(14, -10); ctx.lineTo(22, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(6, -50); ctx.lineTo(6, -26); ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.beginPath(); ctx.arc(6, -22, 5, Math.PI, 0); ctx.fill();
    }
    ctx.restore();
  },

  // ── Neon rooftops, billboards & window lights (cyberpunk_roofs map) ────
  _sceneryCyberpunkRoofs(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    const neon = ['#ff2b9b','#2be5ff','#b02bff','#2bff9b'];
    const nc = neon[Math.floor(r * neon.length)];
    if (r < 0.6) {
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(-20, -14, 16, 14);
      ctx.fillRect(4, -10, 14, 10);
      ctx.strokeStyle = nc; ctx.lineWidth = 1.4;
      if (ps >= 0.5) { ctx.shadowColor = nc; ctx.shadowBlur = 8; }
      ctx.strokeRect(-20, -14, 16, 14);
      ctx.beginPath(); ctx.moveTo(11, -10); ctx.lineTo(11, -34); ctx.stroke();
      ctx.beginPath(); ctx.arc(11, -34, 2, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (r < 0.85) {
      const bw = 12 + rng()*6, bh = 34 + rng()*16;
      ctx.fillStyle = '#0a0e1a'; ctx.fillRect(-bw*0.5, -bh, bw, bh);
      if (ps >= 0.5) { ctx.shadowColor = nc; ctx.shadowBlur = 10; }
      ctx.fillStyle = nc; ctx.globalAlpha = 0.5;
      for (let ln = 0; ln < 4; ln++) {
        const ly = -bh + 6 + ln*(bh/5);
        ctx.fillRect(-bw*0.4, ly, bw*0.8, 2);
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(120,120,140,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-30, -40); ctx.quadraticCurveTo(0, -30, 30, -42); ctx.stroke();
      ctx.fillStyle = nc;
      if (ps >= 0.5) { ctx.shadowColor = nc; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.ellipse(0, -30, 5, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (let w = 0; w < 5; w++) {
      const wx = -34 + w*16;
      const wy = -18 - (Math.floor(rng()*4))*6;
      ctx.fillStyle = (rng() < 0.5) ? 'rgba(255,220,120,0.5)' : 'rgba(120,200,255,0.4)';
      ctx.fillRect(wx, wy, 3, 3);
    }
    ctx.restore();
  },

  // ── Cloud platforms, rainbow bridges & floating islets (cloud_kingdom map)
  _sceneryCloudKingdom(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(180,200,230,0.3)';
    ctx.beginPath(); ctx.ellipse(4, 1, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.5) {
      ctx.fillStyle = '#ffffff';
      for (let p = 0; p < 4; p++) {
        const px = -22 + p*14;
        ctx.beginPath(); ctx.arc(px, -6, 10 - (p % 2)*2, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#eef4ff'; ctx.fillRect(-6, -34, 12, 28);
      ctx.fillStyle = '#c8a24a';
      ctx.beginPath(); ctx.moveTo(-8, -34); ctx.lineTo(0, -46); ctx.lineTo(8, -34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7ec0f0'; ctx.fillRect(-3, -28, 6, 8);
    } else if (r < 0.8) {
      const cols = ['#ff6b8a','#ffd23b','#4bd86b','#3ba8ff'];
      for (let b = 0; b < cols.length; b++) {
        ctx.strokeStyle = cols[b]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 6, 36 - b*3, Math.PI*1.15, Math.PI*1.85); ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#8ac76a';
      ctx.beginPath(); ctx.ellipse(0, -20, 16, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#6a4a2a';
      ctx.beginPath(); ctx.moveTo(-12, -16); ctx.lineTo(0, -2); ctx.lineTo(12, -16); ctx.closePath(); ctx.fill();
    }
    if (ps >= 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const cxo = Math.sin(t*0.4 + x*0.01)*6;
      ctx.beginPath(); ctx.ellipse(-20 + cxo, -44, 14, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(18 + cxo, -52, 11, 4, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Impact craters, spires & shooting stars (meteor_field map) ─────────
  _sceneryMeteorField(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(10,8,20,0.35)';
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.55) {
      const cw = 20 + rng()*14;
      ctx.fillStyle = '#1a1626';
      ctx.beginPath(); ctx.ellipse(0, 0, cw, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2e2840';
      ctx.beginPath(); ctx.ellipse(0, -1, cw*0.7, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath(); ctx.arc(0, -4, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,40,0.5)';
      if (ps >= 0.5) { ctx.shadowColor = '#ff7a20'; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.arc(-2, -5, 2, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      const s = 14 + rng()*12;
      ctx.fillStyle = '#3a3448';
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s*0.4, -s*1.4); ctx.lineTo(s*0.2, -s*0.9);
      ctx.lineTo(s*0.6, -s*1.6); ctx.lineTo(s, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,150,190,0.3)';
      ctx.beginPath(); ctx.moveTo(-s*0.4, -s*1.4); ctx.lineTo(0, -s*0.7); ctx.lineTo(s*0.2, -s*0.9); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,180,120,0.5)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let m = 0; m < 3; m++) {
      const off = ((t*40 + m*90 + Math.floor(x)) % 120);
      const mx = 40 - off; const my = -60 + off*0.5;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 10, my - 6); ctx.stroke();
    }
    ctx.restore();
  },

  // ── Night trees, glow mushrooms & fireflies (firefly_forest map) ───────
  _sceneryFireflyForest(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(10,25,15,0.3)';
    ctx.beginPath(); ctx.ellipse(4, 0, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.7) {
      const h = 60 + rng()*40;
      ctx.strokeStyle = '#2a1e14'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h*0.5); ctx.stroke();
      ctx.fillStyle = '#16321f';
      ctx.beginPath(); ctx.arc(0, -h*0.65, h*0.32, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-h*0.2, -h*0.5, h*0.22, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(h*0.2, -h*0.52, h*0.22, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(40,90,50,0.5)';
      ctx.beginPath(); ctx.arc(-h*0.1, -h*0.72, h*0.14, 0, Math.PI*2); ctx.fill();
    } else {
      const mc = ['#5affc0','#7ad0ff'];
      for (let m = 0; m < 3; m++) {
        const mx = -12 + m*12;
        const mh = 10 + rng()*8;
        ctx.fillStyle = '#d8d0c0';
        ctx.fillRect(mx - 1.5, -mh, 3, mh);
        ctx.fillStyle = mc[m % mc.length];
        if (ps >= 0.5) { ctx.shadowColor = mc[m % mc.length]; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.ellipse(mx, -mh, 5, 3.5, 0, Math.PI, 0); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    if (ps >= 0.5) {
      for (let f = 0; f < 5; f++) {
        const fx = -30 + f*14 + Math.sin(t*0.8 + f*1.3 + x*0.02)*8;
        const fy = -20 - f*6 + Math.cos(t*0.7 + f + x*0.01)*6;
        const gl = 0.4 + 0.5*Math.abs(Math.sin(t*2 + f + x*0.03));
        ctx.fillStyle = 'rgba(200,255,120,' + gl.toFixed(2) + ')';
        ctx.shadowColor = '#c8ff78'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  // ── Snowy pines, icy crags & aurora ribbons (aurora_peak map) ──────────
  _sceneryAuroraPeak(ctx, x, y, rng, t) {
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(120,150,180,0.28)';
    ctx.beginPath(); ctx.ellipse(4, 1, 28, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.55) {
      const h = 54 + rng()*36;
      ctx.fillStyle = '#2a3a4a'; ctx.fillRect(-3, -h*0.25, 6, h*0.25);
      for (let tier = 0; tier < 3; tier++) {
        const ty = -h*0.25 - tier*h*0.24;
        const tw = 18 - tier*4;
        ctx.fillStyle = '#24485a';
        ctx.beginPath(); ctx.moveTo(-tw, ty); ctx.lineTo(0, ty - h*0.3); ctx.lineTo(tw, ty); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(230,240,255,0.85)';
        ctx.beginPath(); ctx.moveTo(-tw*0.5, ty - 2); ctx.lineTo(0, ty - h*0.3); ctx.lineTo(tw*0.5, ty - 2); ctx.closePath(); ctx.fill();
      }
    } else {
      const s = 20 + rng()*14;
      ctx.fillStyle = '#3a4a5e';
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s*0.3, -s*1.5); ctx.lineTo(s*0.5, -s*1.1); ctx.lineTo(s, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e6f0fa';
      ctx.beginPath(); ctx.moveTo(-s*0.3, -s*1.5); ctx.lineTo(-s*0.05, -s*1.1); ctx.lineTo(s*0.2, -s*1.25); ctx.lineTo(s*0.5, -s*1.1); ctx.closePath(); ctx.fill();
    }
    if (ps >= 0.5) {
      const acols = ['rgba(90,255,180,0.30)','rgba(120,160,255,0.24)','rgba(200,120,255,0.20)'];
      for (let a = 0; a < acols.length; a++) {
        ctx.strokeStyle = acols[a]; ctx.lineWidth = 5 + a*2;
        ctx.beginPath();
        for (let px = -40; px <= 40; px += 10) {
          const py = -60 - a*10 + Math.sin(px*0.05 + t*0.6 + a + x*0.01)*8;
          if (px === -40) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  // ── Acacia tree / dry golden grass (savanna map) ───────────────────────
  _scenerySavanna(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'savanna');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(80,60,20,0.2)';
    ctx.beginPath(); ctx.ellipse(4, 0, 26, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.6) {
      // Flat-topped acacia
      const h = 46 + rng()*26;
      ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h*0.6); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -h*0.6); ctx.lineTo(-h*0.35, -h*0.85);
      ctx.moveTo(0, -h*0.6); ctx.lineTo(h*0.4, -h*0.9);
      ctx.moveTo(0, -h*0.6); ctx.lineTo(0, -h*0.9);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // Umbrella canopy
      const cg = ctx.createLinearGradient(0, -h - 6, 0, -h*0.75);
      cg.addColorStop(0, '#5a8a30'); cg.addColorStop(1, '#3a6a1e');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(0, -h*0.92, h*0.6, h*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(140,190,90,0.4)';
      ctx.beginPath(); ctx.ellipse(-h*0.2, -h*0.98, h*0.28, h*0.09, 0, 0, Math.PI*2); ctx.fill();
    } else {
      // Dry golden grass tuft
      ctx.lineCap = 'round';
      for (let g = 0; g < 9; g++) {
        const gx = -14 + g*3.4;
        const gh = 12 + rng()*16;
        ctx.strokeStyle = rng()>0.5 ? '#d8b45a' : '#a8842e';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(gx, 0);
        ctx.quadraticCurveTo(gx + (rng()-0.5)*8, -gh*0.6, gx + (rng()-0.5)*14, -gh);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#e8cf80';
      for (let s = 0; s < 3; s++) { ctx.beginPath(); ctx.arc(-8 + rng()*16, -16 - rng()*6, 1.6, 0, Math.PI*2); ctx.fill(); }
    }
    ctx.restore();
  },

  // ── Ice shard formations (glacier map) ─────────────────────────────────
  _sceneryGlacier(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'glacier');
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(120,160,200,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 1, 26, 6, 0, 0, Math.PI*2); ctx.fill();
    const count = 2 + Math.floor(rng()*3);
    for (let s = 0; s < count; s++) {
      const sx = (s - count/2) * 12 + (rng()-0.5)*6;
      const sh = 24 + rng()*44;
      const sw = 7 + rng()*5;
      const lean = (rng()-0.5)*0.4;
      ctx.save(); ctx.translate(sx, 0); ctx.rotate(lean);
      const g = ctx.createLinearGradient(0, 0, 0, -sh);
      g.addColorStop(0, '#7fb4d8'); g.addColorStop(0.6, '#bfe4f5'); g.addColorStop(1, '#eafaff');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-sw, 0); ctx.lineTo(-sw*0.4, -sh*0.7); ctx.lineTo(0, -sh);
      ctx.lineTo(sw*0.5, -sh*0.65); ctx.lineTo(sw, 0); ctx.closePath(); ctx.fill();
      // Sheen edge + lit facet
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-sw*0.4, -sh*0.7); ctx.lineTo(0, -sh); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(0, -sh); ctx.lineTo(sw*0.5, -sh*0.65); ctx.lineTo(sw*0.15, -sh*0.4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Frosty sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.arc(-20 + rng()*40, -8 - rng()*30, 0.9, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  },

  // ── Reeds / mangrove (swamp map) ───────────────────────────────────────
  _scenerySwamp(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'swamp');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    if (r < 0.55) {
      // Reeds & cattails
      ctx.lineCap = 'round';
      const n = 5 + Math.floor(rng()*4);
      for (let i = 0; i < n; i++) {
        const rx = -16 + i*5 + (rng()-0.5)*3;
        const rh = 30 + rng()*30;
        const bend = (rng()-0.5)*10;
        ctx.strokeStyle = rng()>0.5 ? '#4a7a24' : '#3a5e18'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rx, 0);
        ctx.quadraticCurveTo(rx + bend*0.5, -rh*0.6, rx + bend, -rh);
        ctx.stroke();
        if (rng() < 0.5) {
          ctx.fillStyle = '#5a3a18';
          ctx.beginPath(); ctx.ellipse(rx + bend, -rh, 2.4, 6, 0, 0, Math.PI*2); ctx.fill();
        }
      }
      ctx.lineCap = 'butt';
      // Lily pad on water
      ctx.fillStyle = '#2f6a2a';
      ctx.beginPath(); ctx.ellipse(12, 1, 8, 3, 0, 0.3, Math.PI*2 - 0.3); ctx.fill();
    } else {
      // Mangrove with prop roots
      const h = 46 + rng()*24;
      ctx.strokeStyle = '#3a2a16'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -h); ctx.stroke();
      ctx.lineWidth = 2.5;
      for (let rt = -1; rt <= 1; rt += 2) {
        ctx.beginPath(); ctx.moveTo(0, -h*0.4);
        ctx.quadraticCurveTo(rt*14, -h*0.15, rt*16, 2); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // Canopy
      ctx.fillStyle = '#245a1a';
      for (let c = 0; c < 4; c++) {
        const ca = (c/4)*Math.PI*2;
        ctx.beginPath(); ctx.arc(Math.cos(ca)*12, -h - 4 + Math.sin(ca)*8, 11, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,180,80,0.4)';
      ctx.beginPath(); ctx.arc(-6, -h - 8, 5, 0, Math.PI*2); ctx.fill();
      // Hanging moss
      ctx.strokeStyle = 'rgba(150,170,90,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(8, -h + 2); ctx.lineTo(9, -h + 12); ctx.stroke();
    }
    ctx.restore();
  },

  // ── Charred boulders with molten cracks (lava_river map) ───────────────
  _sceneryLavaRocks(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'lava_river');
    const sz = 14 + rng()*18;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 1, sz, 4, 0, 0, Math.PI*2); ctx.fill();
    // Charred boulder
    const g = ctx.createRadialGradient(-sz*0.3, -sz*0.4, 1, 0, 0, sz);
    g.addColorStop(0, '#3a2420'); g.addColorStop(0.7, '#241416'); g.addColorStop(1, '#0e0808');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let p = 0; p < 8; p++) {
      const pa = (p/8)*Math.PI*2;
      const pr = sz*(0.7 + Math.sin(p*91+x)*0.28);
      const px = Math.cos(pa)*pr, py = Math.sin(pa)*pr - sz*0.1;
      p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    // Glowing lava cracks
    ctx.strokeStyle = '#ff5a1e'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-sz*0.5, -sz*0.2); ctx.lineTo(-sz*0.1, -sz*0.4); ctx.lineTo(sz*0.3, -sz*0.1);
    ctx.moveTo(-sz*0.1, -sz*0.4); ctx.lineTo(sz*0.1, -sz*0.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,80,0.7)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(-sz*0.1, -sz*0.4); ctx.lineTo(sz*0.3, -sz*0.1); ctx.stroke();
    ctx.lineCap = 'butt';
    // Ember sparks
    ctx.fillStyle = 'rgba(255,150,40,0.7)';
    for (let e = 0; e < 3; e++) { ctx.beginPath(); ctx.arc(-sz + rng()*sz*2, -rng()*4, 1, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  },

  // ── Rocky spires, alpine pines & boulders (mountains map) ──────────────
  _sceneryMountains(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'mountains');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(30,30,40,0.22)';
    ctx.beginPath(); ctx.ellipse(2, 2, 24, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.42) {
      // Snow-dusted alpine pine
      const h = 46 + rng()*34;
      const layers = 4;
      for (let la = 0; la < layers; la++) {
        const ly = -h*0.16 - la*h*0.21;
        const lw = (layers - la)*9 + 5;
        ctx.fillStyle = '#20421c';
        ctx.beginPath(); ctx.moveTo(0, ly-h*0.22); ctx.lineTo(-lw, ly); ctx.lineTo(lw, ly); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.beginPath(); ctx.moveTo(0, ly-h*0.04); ctx.lineTo(-lw*0.85, ly); ctx.lineTo(lw*0.85, ly); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(228,240,255,0.7)';
        ctx.beginPath(); ctx.moveTo(0, ly-h*0.23); ctx.lineTo(-lw*0.4, ly-h*0.05); ctx.lineTo(lw*0.4, ly-h*0.05); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(-3, -h*0.15, 6, h*0.17);
    } else if (r < 0.74) {
      // Jagged rocky spire with snow cap
      const sh = 40 + rng()*46;
      const sw = 12 + rng()*10;
      const g = ctx.createLinearGradient(-sw, 0, sw, 0);
      g.addColorStop(0, '#6a6a74'); g.addColorStop(0.5, '#8c8c96'); g.addColorStop(1, '#565660');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-sw, 0);
      ctx.lineTo(-sw*0.5, -sh*0.55);
      ctx.lineTo(-sw*0.15, -sh*0.4);
      ctx.lineTo(0, -sh);
      ctx.lineTo(sw*0.35, -sh*0.5);
      ctx.lineTo(sw, 0);
      ctx.closePath(); ctx.fill();
      // Strata cracks
      ctx.strokeStyle = 'rgba(40,40,50,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-sw*0.3, -sh*0.2); ctx.lineTo(sw*0.1, -sh*0.55); ctx.stroke();
      // Snow cap
      ctx.fillStyle = 'rgba(235,244,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, -sh); ctx.lineTo(-sw*0.22, -sh*0.72); ctx.lineTo(sw*0.06, -sh*0.78);
      ctx.lineTo(sw*0.2, -sh*0.66); ctx.closePath(); ctx.fill();
    } else {
      // Cluster of grey boulders
      const bc = ['#7c7c86','#6a6a74','#8c8c96'];
      for (let b = 0; b < 3; b++) {
        const bx = (b-1)*13 + (rng()-0.5)*4;
        const br = 8 + rng()*7;
        ctx.fillStyle = bc[b%3];
        ctx.beginPath(); ctx.ellipse(bx, -br*0.5, br, br*0.8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(220,225,235,0.35)';
        ctx.beginPath(); ctx.ellipse(bx - br*0.3, -br*0.8, br*0.4, br*0.24, 0, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── Icebergs, igloo & aurora poles (arctic map) ────────────────────────
  _sceneryArctic(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'arctic');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(80,120,170,0.22)';
    ctx.beginPath(); ctx.ellipse(2, 1, 26, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.4) {
      // Iceberg chunk
      const w = 26 + rng()*18, h = 26 + rng()*24;
      const g = ctx.createLinearGradient(0, -h, 0, 4);
      g.addColorStop(0, '#eafaff'); g.addColorStop(0.5, '#bfe4f5'); g.addColorStop(1, '#7fb4d8');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, 2);
      ctx.lineTo(-w*0.6, -h*0.5);
      ctx.lineTo(-w*0.1, -h);
      ctx.lineTo(w*0.4, -h*0.6);
      ctx.lineTo(w, 2);
      ctx.closePath(); ctx.fill();
      // Facet highlight
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.moveTo(-w*0.1, -h); ctx.lineTo(w*0.4, -h*0.6); ctx.lineTo(-w*0.05, -h*0.45); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-w*0.6, -h*0.5); ctx.lineTo(-w*0.1, -h); ctx.stroke();
    } else if (r < 0.72) {
      // Igloo
      const rad = 20 + rng()*8;
      const g = ctx.createLinearGradient(0, -rad, 0, 0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8ddee');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, rad, Math.PI, Math.PI*2); ctx.fill();
      // Snow-block seams
      ctx.strokeStyle = 'rgba(150,185,215,0.6)'; ctx.lineWidth = 1;
      for (let ring = 1; ring <= 2; ring++) {
        ctx.beginPath(); ctx.arc(0, 0, rad*(ring/3), Math.PI, Math.PI*2); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, -rad); ctx.lineTo(0, -rad*0.66);
      ctx.moveTo(-rad*0.66, -rad*0.4); ctx.lineTo(-rad*0.5, -rad*0.1);
      ctx.moveTo(rad*0.66, -rad*0.4); ctx.lineTo(rad*0.5, -rad*0.1); ctx.stroke();
      // Entrance tunnel
      ctx.fillStyle = '#dceefb';
      ctx.beginPath(); ctx.arc(0, 0, rad*0.45, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a7a95';
      ctx.beginPath(); ctx.arc(0, 0, rad*0.28, Math.PI, Math.PI*2); ctx.fill();
    } else {
      // Aurora pole + small ice shards (static ribbon)
      ctx.save();
      ctx.globalAlpha = 0.5;
      const cols = ['rgba(80,255,180,0.5)','rgba(120,180,255,0.5)','rgba(200,120,255,0.4)'];
      for (let a = 0; a < 3; a++) {
        ctx.strokeStyle = cols[a]; ctx.lineWidth = 4 - a;
        ctx.beginPath();
        ctx.moveTo(-18 + a*4, -70);
        ctx.quadraticCurveTo(0, -50 - a*6, 18 - a*4, -80);
        ctx.stroke();
      }
      ctx.restore();
      // Foreground ice shards
      ctx.fillStyle = '#cfe9f5';
      for (let s = -1; s <= 1; s++) {
        const sh = 14 + rng()*14;
        ctx.beginPath();
        ctx.moveTo(s*10 - 4, 0); ctx.lineTo(s*10, -sh); ctx.lineTo(s*10 + 4, 0); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── Heather shrubs, stone cairns & sheep (highland map) ────────────────
  _sceneryHighland(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'highland');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(30,50,25,0.18)';
    ctx.beginPath(); ctx.ellipse(2, 1, 22, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.38) {
      // Stone cairn (stacked rocks)
      const cols = ['#8a857c','#75706a','#9a958c'];
      let cy = 0;
      const stones = 4;
      for (let s = 0; s < stones; s++) {
        const sw = 15 - s*2.6;
        ctx.fillStyle = cols[s%3];
        ctx.beginPath(); ctx.ellipse((rng()-0.5)*3, cy - 3, sw, 5 + (stones-s)*0.4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(-sw*0.3, cy - 5, sw*0.4, 2, 0, 0, Math.PI*2); ctx.fill();
        cy -= 8;
      }
    } else if (r < 0.68) {
      // Heather / gorse shrub with purple flowers
      ctx.fillStyle = '#3a5a24';
      for (let b = 0; b < 5; b++) {
        const ba = (b/5)*Math.PI - Math.PI*0.1;
        ctx.beginPath(); ctx.ellipse(Math.cos(ba)*12, -8 - Math.sin(ba)*8, 9, 7, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#5a7a34';
      ctx.beginPath(); ctx.ellipse(0, -12, 10, 8, 0, 0, Math.PI*2); ctx.fill();
      // Purple heather blooms
      const bloom = rng() < 0.5 ? '#a05ac0' : '#c060a0';
      ctx.fillStyle = bloom;
      for (let f = 0; f < 8; f++) {
        ctx.beginPath(); ctx.arc(-12 + rng()*24, -18 - rng()*8, 1.6, 0, Math.PI*2); ctx.fill();
      }
    } else {
      // Grazing sheep
      ctx.fillStyle = '#eef0f0';
      ctx.beginPath(); ctx.ellipse(0, -10, 12, 9, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-10, -13, 5, 0, Math.PI*2); ctx.fill();
      // Wool bumps
      ctx.fillStyle = '#dfe2e2';
      for (let w = 0; w < 4; w++) { ctx.beginPath(); ctx.arc(-6 + w*5, -16, 3.5, 0, Math.PI*2); ctx.fill(); }
      // Head + legs
      ctx.fillStyle = '#3a3630';
      ctx.beginPath(); ctx.ellipse(-13, -11, 4, 5, -0.3, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(-6, -3, 2, 6); ctx.fillRect(4, -3, 2, 6);
      // Ear + eye
      ctx.beginPath(); ctx.ellipse(-16, -13, 2, 1.2, 0.4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14, -12, 0.9, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Smoking cones, cooled lava rock & ash tufts (volcano map) ──────────
  _sceneryVolcano(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'volcano');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(2, 1, 24, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.4) {
      // Small smoking volcanic cone
      const h = 34 + rng()*26, w = 26 + rng()*14;
      const g = ctx.createLinearGradient(0, -h, 0, 0);
      g.addColorStop(0, '#5a3428'); g.addColorStop(1, '#241412');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, 2); ctx.lineTo(-w*0.28, -h); ctx.lineTo(w*0.28, -h); ctx.lineTo(w, 2);
      ctx.closePath(); ctx.fill();
      // Glowing crater rim + lava trickle
      ctx.fillStyle = '#ff5a1e';
      ctx.beginPath(); ctx.ellipse(0, -h, w*0.28, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(w*0.1, -h); ctx.lineTo(w*0.4, -h*0.4); ctx.lineTo(w*0.55, 0); ctx.stroke();
      ctx.lineCap = 'butt';
      // Static smoke puffs
      ctx.fillStyle = 'rgba(120,110,110,0.35)';
      ctx.beginPath(); ctx.arc(0, -h - 12, 8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -h - 22, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -h - 30, 5, 0, Math.PI*2); ctx.fill();
    } else if (r < 0.72) {
      // Cooled basalt boulder with glowing seams
      const sz = 14 + rng()*16;
      const g = ctx.createRadialGradient(-sz*0.3, -sz*0.4, 1, 0, 0, sz);
      g.addColorStop(0, '#3a2822'); g.addColorStop(0.7, '#20120f'); g.addColorStop(1, '#0c0605');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let p = 0; p < 7; p++) {
        const pa = (p/7)*Math.PI*2;
        const pr = sz*(0.7 + Math.sin(p*71+x)*0.28);
        const px = Math.cos(pa)*pr, py = Math.sin(pa)*pr - sz*0.15;
        p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ff5518'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-sz*0.5, -sz*0.3); ctx.lineTo(0, -sz*0.5); ctx.lineTo(sz*0.4, -sz*0.15);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = 'rgba(255,140,40,0.7)';
      ctx.beginPath(); ctx.arc(sz*0.9, 0, 1.4, 0, Math.PI*2); ctx.fill();
    } else {
      // Charred dead shrub with ember glow at base
      ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -28); ctx.stroke();
      ctx.lineWidth = 1.6;
      for (let b = 0; b < 5; b++) {
        const by = -8 - b*4;
        const dir = b%2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(dir*(8+b*1.5), by - 6 - b); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.fillStyle = 'rgba(255,120,30,0.5)';
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Coral, seaweed, bubbles & shells (underwater map) ──────────────────
  _sceneryUnderwater(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'underwater');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,20,40,0.25)';
    ctx.beginPath(); ctx.ellipse(2, 1, 22, 4, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.42) {
      // Branching coral
      const cols = ['#ff6a8a','#ff9a4a','#c060e0','#4ad0c0'];
      const col = cols[Math.floor(rng()*cols.length)];
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
      const h = 34 + rng()*24;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h*0.5); ctx.stroke();
      ctx.lineWidth = 3.5;
      for (let br = -1; br <= 1; br += 2) {
        ctx.beginPath();
        ctx.moveTo(0, -h*0.5);
        ctx.quadraticCurveTo(br*10, -h*0.7, br*12, -h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(br*6, -h*0.6);
        ctx.quadraticCurveTo(br*16, -h*0.72, br*20, -h*0.9);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, -h*0.5); ctx.lineTo(0, -h*0.95); ctx.stroke();
      // Polyp dots
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.lineCap = 'butt';
      for (let d = 0; d < 4; d++) { ctx.beginPath(); ctx.arc(-8 + rng()*16, -h*0.6 - rng()*20, 1.2, 0, Math.PI*2); ctx.fill(); }
    } else if (r < 0.74) {
      // Swaying seaweed / kelp
      ctx.strokeStyle = '#2a8a5a'; ctx.lineCap = 'round';
      const n = 4 + Math.floor(rng()*3);
      for (let i = 0; i < n; i++) {
        const sx = -12 + i*6 + (rng()-0.5)*3;
        const sh = 36 + rng()*32;
        const bend = (rng()-0.5)*16;
        ctx.strokeStyle = rng()>0.5 ? '#2f9a5a' : '#1f7a44';
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(sx, 0);
        ctx.bezierCurveTo(sx + bend, -sh*0.4, sx - bend, -sh*0.7, sx + bend*0.5, -sh);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // A few rising bubbles
      ctx.fillStyle = 'rgba(200,240,255,0.5)';
      for (let bb = 0; bb < 3; bb++) {
        ctx.beginPath(); ctx.arc(-8 + rng()*16, -20 - rng()*40, 1.5 + rng()*2, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,240,255,0.5)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(-8 + rng()*16, -20 - rng()*40, 1.5 + rng()*2, 0, Math.PI*2); ctx.stroke();
      }
    } else {
      // Giant clam / shell with rock
      ctx.fillStyle = '#6a6a80';
      ctx.beginPath(); ctx.ellipse(0, -3, 16, 8, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f0e0ea';
      ctx.beginPath(); ctx.arc(0, -3, 12, Math.PI, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#d0b8c8'; ctx.lineWidth = 1;
      for (let s = 0; s < 5; s++) {
        const sa = Math.PI + (s/4)*Math.PI;
        ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(Math.cos(sa)*12, -3 + Math.sin(sa)*12); ctx.stroke();
      }
      // Pearl
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, -5, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(180,220,255,0.6)';
      ctx.beginPath(); ctx.arc(-0.8, -6, 1, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Moon rocks, lander flag & footprints (moon map) ────────────────────
  _sceneryMoon(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'moon');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 1, 22, 4, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.35) {
      // Planted flag
      ctx.strokeStyle = '#bbbbc4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke();
      const fg = ctx.createLinearGradient(0, 0, 24, 0);
      fg.addColorStop(0, '#d02030'); fg.addColorStop(1, '#a01020');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(0, -46); ctx.lineTo(22, -44); ctx.lineTo(22, -30); ctx.lineTo(0, -32);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -39); ctx.lineTo(22, -37); ctx.stroke();
      // Small footprints
      ctx.fillStyle = 'rgba(120,120,130,0.5)';
      for (let fp = 0; fp < 3; fp++) {
        ctx.beginPath(); ctx.ellipse(8 + fp*8, 0, 3, 1.6, 0, 0, Math.PI*2); ctx.fill();
      }
    } else if (r < 0.7) {
      // Cratered moon rock
      const sz = 12 + rng()*16;
      const g = ctx.createRadialGradient(-sz*0.3, -sz*0.4, 1, 0, 0, sz);
      g.addColorStop(0, '#b8b8c0'); g.addColorStop(0.6, '#8a8a92'); g.addColorStop(1, '#55555c');
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const pa = (p/8)*Math.PI*2;
        const pr = sz*(0.72 + Math.sin(p*53+x)*0.26);
        const px = Math.cos(pa)*pr, py = Math.sin(pa)*pr - sz*0.15;
        p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      // Craters
      for (let cr = 0; cr < 3; cr++) {
        const ca = cr*2.2 + x*0.11;
        const cx = Math.cos(ca)*sz*0.4, cy = Math.sin(ca)*sz*0.32 - sz*0.15;
        const cw = sz*(0.16 + cr*0.03);
        ctx.fillStyle = 'rgba(50,50,58,0.5)';
        ctx.beginPath(); ctx.ellipse(cx, cy, cw, cw*0.7, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(220,220,230,0.35)';
        ctx.beginPath(); ctx.ellipse(cx - cw*0.3, cy - cw*0.25, cw*0.4, cw*0.28, 0, 0, Math.PI*2); ctx.fill();
      }
    } else {
      // Small crater ring in the ground
      const cw = 20 + rng()*16;
      ctx.fillStyle = '#5a5a62';
      ctx.beginPath(); ctx.ellipse(0, 0, cw, cw*0.4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#3a3a42';
      ctx.beginPath(); ctx.ellipse(0, -1, cw*0.7, cw*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(200,200,210,0.3)';
      ctx.beginPath(); ctx.ellipse(-cw*0.2, -2, cw*0.4, cw*0.14, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Highway signs, guard rails & lamp posts (otoyol map) ───────────────
  _sceneryOtoyol(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'otoyol');
    const r = rng();
    ctx.save(); ctx.translate(x, y);
    if (r < 0.4) {
      // Overhead green highway sign gantry
      ctx.fillStyle = '#777'; ctx.fillRect(-2, -60, 4, 60);
      ctx.fillRect(-2, -60, 40, 4);
      ctx.fillStyle = '#1a7a3a';
      this._rrect(ctx, 4, -58, 40, 20, 3); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(6, -56, 36, 16);
      // Sign text bars
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(9, -52, 20, 3);
      ctx.fillRect(9, -47, 26, 3);
      // Direction arrow
      ctx.beginPath(); ctx.moveTo(36, -52); ctx.lineTo(40, -49); ctx.lineTo(36, -46); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a4a4a'; ctx.fillRect(-5, -2, 10, 3);
    } else if (r < 0.72) {
      // Tall highway lamp post (double arm)
      ctx.fillStyle = '#888'; ctx.fillRect(-2, -66, 4, 66);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -66); ctx.quadraticCurveTo(14, -70, 20, -64); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -66); ctx.quadraticCurveTo(-14, -70, -20, -64); ctx.stroke();
      ctx.fillStyle = 'rgba(255,235,160,0.9)';
      ctx.beginPath(); ctx.ellipse(20, -63, 4, 2, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-20, -63, 4, 2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,160,0.2)';
      ctx.beginPath(); ctx.arc(20, -61, 9, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-20, -61, 9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4a4a4a'; ctx.fillRect(-5, -2, 10, 3);
    } else {
      // Metal guard rail run
      ctx.fillStyle = '#9aa0a6';
      ctx.fillRect(-26, -18, 52, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-26, -18, 52, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-26, -14, 52, 1.5);
      ctx.fillStyle = '#6a6f74';
      for (let pp = -20; pp <= 20; pp += 20) ctx.fillRect(pp-2, -18, 4, 18);
      // Reflectors
      ctx.fillStyle = '#ff5533';
      for (let rf = -18; rf <= 22; rf += 20) { ctx.beginPath(); ctx.arc(rf, -15.5, 1.4, 0, Math.PI*2); ctx.fill(); }
    }
    ctx.restore();
  },

  // ── Craggy spires & alpine pines (dag / mountain map) ──────────────────
  _sceneryDag(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'dag');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(20,22,30,0.25)';
    ctx.beginPath(); ctx.ellipse(2, 2, 24, 5, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.5) {
      // Sharp dark rock spire
      const sh = 46 + rng()*54;
      const sw = 11 + rng()*9;
      const g = ctx.createLinearGradient(-sw, 0, sw, 0);
      g.addColorStop(0, '#44424c'); g.addColorStop(0.5, '#605e68'); g.addColorStop(1, '#33313a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-sw, 0);
      ctx.lineTo(-sw*0.4, -sh*0.6);
      ctx.lineTo(0, -sh);
      ctx.lineTo(sw*0.5, -sh*0.55);
      ctx.lineTo(sw, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,26,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-sw*0.2, -sh*0.15); ctx.lineTo(sw*0.05, -sh*0.6); ctx.stroke();
      // Snow dusting on the tip
      ctx.fillStyle = 'rgba(230,238,250,0.75)';
      ctx.beginPath(); ctx.moveTo(0, -sh); ctx.lineTo(-sw*0.2, -sh*0.78); ctx.lineTo(sw*0.12, -sh*0.82); ctx.closePath(); ctx.fill();
    } else {
      // Wind-bent alpine pine
      const h = 42 + rng()*30;
      const layers = 4;
      for (let la = 0; la < layers; la++) {
        const ly = -h*0.14 - la*h*0.22;
        const lw = (layers - la)*8 + 4;
        ctx.fillStyle = '#1c3a18';
        ctx.beginPath(); ctx.moveTo(2, ly-h*0.22); ctx.lineTo(-lw, ly); ctx.lineTo(lw, ly); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(210,228,245,0.55)';
        ctx.beginPath(); ctx.moveTo(2, ly-h*0.22); ctx.lineTo(-lw*0.4, ly-h*0.06); ctx.lineTo(lw*0.35, ly-h*0.06); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#2f2216'; ctx.fillRect(-3, -h*0.13, 6, h*0.15);
    }
    ctx.restore();
  },

  // ── Track props: cones, boost arrows & loop pieces (hotwheels map) ─────
  _sceneryHotwheels(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'hotwheels');
    const r = rng();
    ctx.save(); ctx.translate(x, y);
    if (r < 0.34) {
      // Orange track cone
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ff6a1a';
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(-8, 0); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -12, 12, 4);
      ctx.fillStyle = '#e85d04'; ctx.fillRect(-9, -2, 18, 3);
    } else if (r < 0.64) {
      // Neon boost arrow chevrons on a stand
      ctx.fillStyle = '#333'; ctx.fillRect(-2, -30, 4, 30);
      ctx.save(); ctx.translate(0, -40);
      ctx.fillStyle = '#0a1020'; this._rrect(ctx, -16, -10, 32, 20, 3); ctx.fill();
      ctx.shadowColor = '#00e0ff'; ctx.shadowBlur = 8;
      ctx.strokeStyle = '#00e0ff'; ctx.lineWidth = 2.5;
      for (let a = 0; a < 3; a++) {
        ctx.globalAlpha = 1 - a*0.25;
        ctx.beginPath();
        ctx.moveTo(-10 + a*8, -6); ctx.lineTo(-4 + a*8, 0); ctx.lineTo(-10 + a*8, 6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      // Blue looping track segment in background
      ctx.strokeStyle = '#2a6ad0'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, -40, 30, Math.PI*0.15, Math.PI*1.7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -40, 33, Math.PI*0.15, Math.PI*1.7); ctx.stroke();
      // Support post
      ctx.strokeStyle = '#e85d04'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-26, -22); ctx.lineTo(-26, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, -18); ctx.lineTo(24, 0); ctx.stroke();
    }
    ctx.restore();
  },

  // ── Barriers, cones, girders & cranes (construction map) ───────────────
  _sceneryConstruction(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'construction');
    const r = rng();
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 4, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.3) {
      // Striped construction barrier
      ctx.fillStyle = '#d8d8d0'; this._rrect(ctx, -22, -20, 44, 12, 2); ctx.fill();
      ctx.save();
      ctx.beginPath(); this._rrect(ctx, -22, -20, 44, 12, 2); ctx.clip();
      ctx.fillStyle = '#e8501a';
      for (let s = -24; s < 24; s += 10) {
        ctx.beginPath(); ctx.moveTo(s, -8); ctx.lineTo(s+6, -8); ctx.lineTo(s+12, -20); ctx.lineTo(s+6, -20); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // Legs
      ctx.fillStyle = '#555'; ctx.fillRect(-18, -8, 4, 8); ctx.fillRect(14, -8, 4, 8);
    } else if (r < 0.55) {
      // Traffic cone
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-9, 0); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-6, -14, 12, 4); ctx.fillRect(-4.5, -20, 9, 3);
      ctx.fillStyle = '#e85d04'; ctx.fillRect(-11, -2, 22, 3);
    } else if (r < 0.8) {
      // Stacked steel girders / pipes
      ctx.fillStyle = '#b8802a';
      for (let g = 0; g < 3; g++) {
        const gy = -6 - g*7, gx = -18 + (g%2)*6;
        ctx.fillRect(gx, gy, 36, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(gx, gy, 36, 1.5);
        ctx.strokeStyle = 'rgba(60,40,10,0.5)'; ctx.lineWidth = 0.8; ctx.strokeRect(gx, gy, 36, 6);
        ctx.fillStyle = '#b8802a';
      }
    } else {
      // Background tower crane
      ctx.strokeStyle = '#f0c020'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.stroke();
      // Lattice
      ctx.lineWidth = 1;
      for (let l = 0; l < 7; l++) {
        const ly = -l*10;
        ctx.beginPath(); ctx.moveTo(-3, ly); ctx.lineTo(3, ly-10); ctx.moveTo(3, ly); ctx.lineTo(-3, ly-10); ctx.stroke();
      }
      // Jib arm + counterweight
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16, -66); ctx.lineTo(44, -70); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(38, -70); ctx.moveTo(0, -78); ctx.lineTo(-14, -67); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.fillRect(-22, -70, 8, 8);
      // Hook cable
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(34, -70); ctx.lineTo(34, -50); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.fillRect(32, -50, 4, 4);
    }
    ctx.restore();
  },

  // ── Snowdrifts, frosted trees & buried rocks (blizzard map) ────────────
  _sceneryBlizzard(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'blizzard');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    // Wind-swept snow drift
    ctx.fillStyle = '#eef4ff';
    ctx.beginPath();
    ctx.moveTo(-30, 2);
    ctx.quadraticCurveTo(-14, -10 - rng()*6, 4, -6);
    ctx.quadraticCurveTo(20, -3, 30, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(170,198,235,0.5)';
    ctx.beginPath();
    ctx.moveTo(-30, 2); ctx.quadraticCurveTo(-10, -4, 8, 0); ctx.quadraticCurveTo(20, 1, 30, 2);
    ctx.closePath(); ctx.fill();
    if (r < 0.5) {
      // Bare frosted tree half-buried in snow
      const bh = 34 + rng()*24;
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -bh); ctx.stroke();
      ctx.lineWidth = 1.8;
      for (let b = 0; b < 4; b++) {
        const by = -bh*0.4 - b*bh*0.16;
        const dir = b%2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(dir*(10+b*2), by - 6 - b*2); ctx.stroke();
      }
      // Frost on windward side
      ctx.strokeStyle = 'rgba(230,242,255,0.8)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-1, -4); ctx.lineTo(-1, -bh); ctx.stroke();
      ctx.lineCap = 'butt';
    } else {
      // Snow-capped buried boulder
      const sz = 12 + rng()*10;
      ctx.fillStyle = '#8a95a5';
      ctx.beginPath(); ctx.ellipse(0, -sz*0.4, sz, sz*0.7, 0, Math.PI, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#eef4ff';
      ctx.beginPath(); ctx.ellipse(0, -sz*0.7, sz*0.8, sz*0.4, 0, Math.PI, Math.PI*2); ctx.fill();
    }
    // Drifting snow flecks (static)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.arc(-24 + rng()*48, -6 - rng()*30, 1, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  },

  // ── Candy canes, lollipops & gumdrops (candy map) ──────────────────────
  _sceneryCandy(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'candy');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(150,60,110,0.18)';
    ctx.beginPath(); ctx.ellipse(2, 2, 18, 4, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.36) {
      // Candy cane
      const h = 40 + rng()*24;
      ctx.lineCap = 'round'; ctx.lineWidth = 8;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.quadraticCurveTo(0, -h-10, 10, -h-8); ctx.stroke();
      // Red stripes
      ctx.strokeStyle = '#e83048'; ctx.lineWidth = 3;
      for (let s = 0; s < 7; s++) {
        const sy = -s*(h/7);
        ctx.beginPath(); ctx.moveTo(-4, sy); ctx.lineTo(4, sy - 5); ctx.stroke();
      }
      ctx.lineWidth = 1; ctx.lineCap = 'butt';
    } else if (r < 0.68) {
      // Swirl lollipop
      const h = 34 + rng()*20;
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
      const cols = [['#ff5ea0','#fff0f6'],['#5ec8ff','#f0faff'],['#ffd24a','#fff6d8']];
      const col = cols[Math.floor(rng()*cols.length)];
      const rad = 12 + rng()*5;
      ctx.fillStyle = col[0];
      ctx.beginPath(); ctx.arc(0, -h - rad, rad, 0, Math.PI*2); ctx.fill();
      // Spiral
      ctx.strokeStyle = col[1]; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < Math.PI*4; a += 0.25) {
        const rr = (a/(Math.PI*4))*rad;
        const px = Math.cos(a)*rr, py = -h - rad + Math.sin(a)*rr;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-rad*0.35, -h - rad*1.3, rad*0.25, 0, Math.PI*2); ctx.fill();
    } else {
      // Cluster of gumdrops
      const gc = ['#ff5ea0','#5ec8ff','#7ae86a','#ffd24a','#c06aff'];
      for (let g = 0; g < 3; g++) {
        const gx = (g-1)*14 + (rng()-0.5)*4;
        const gr = 7 + rng()*4;
        ctx.fillStyle = gc[Math.floor(rng()*gc.length)];
        ctx.beginPath(); ctx.arc(gx, -gr, gr, Math.PI, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(gx, -gr, gr, gr*0.5, 0, 0, Math.PI*2); ctx.fill();
        // Sugar sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(gx - gr*0.3, -gr*1.3, gr*0.2, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── Toxic barrels, dead trees & bubbling ooze (toxic map) ──────────────
  _sceneryToxic(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'toxic');
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,20,0,0.28)';
    ctx.beginPath(); ctx.ellipse(2, 1, 20, 4, 0, 0, Math.PI*2); ctx.fill();
    if (r < 0.4) {
      // Leaking toxic waste barrel
      ctx.fillStyle = '#3a5a1a'; ctx.fillRect(-9, -26, 18, 26);
      const g = ctx.createLinearGradient(-9, 0, 9, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.5, 'rgba(120,220,60,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g; ctx.fillRect(-9, -26, 18, 26);
      ctx.fillStyle = '#2a4212'; ctx.fillRect(-9, -28, 18, 4);
      ctx.strokeStyle = '#1e300c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -10); ctx.lineTo(9, -10); ctx.moveTo(-9, -18); ctx.lineTo(9, -18); ctx.stroke();
      // Radioactive trefoil
      ctx.fillStyle = '#c8ff40';
      ctx.beginPath(); ctx.arc(0, -14, 2, 0, Math.PI*2); ctx.fill();
      for (let s = 0; s < 3; s++) {
        const sa = s*Math.PI*2/3 - Math.PI/2;
        ctx.beginPath(); ctx.moveTo(0, -14);
        ctx.arc(0, -14, 5, sa - 0.4, sa + 0.4); ctx.closePath(); ctx.fill();
      }
      // Glowing ooze puddle
      ctx.fillStyle = 'rgba(140,240,60,0.5)';
      ctx.beginPath(); ctx.ellipse(11, 0, 10, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(200,255,120,0.6)';
      ctx.beginPath(); ctx.arc(13, -1, 1.5, 0, Math.PI*2); ctx.fill();
    } else if (r < 0.7) {
      // Withered mutant tree
      const h = 40 + rng()*24;
      ctx.strokeStyle = '#2a3a1a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
      ctx.lineWidth = 2;
      for (let b = 0; b < 5; b++) {
        const by = -h*0.4 - b*h*0.13;
        const dir = b%2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(dir*(10+b*2), by - 8 - b*2); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // Sickly glowing foliage clumps
      ctx.fillStyle = 'rgba(120,200,50,0.55)';
      for (let c = 0; c < 4; c++) {
        const ca = (c/4)*Math.PI*2;
        ctx.beginPath(); ctx.arc(Math.cos(ca)*12, -h + 2 + Math.sin(ca)*8, 6, 0, Math.PI*2); ctx.fill();
      }
    } else {
      // Bubbling toxic pool with reeds
      ctx.fillStyle = 'rgba(90,200,40,0.5)';
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(180,255,90,0.5)';
      for (let bb = 0; bb < 4; bb++) {
        ctx.beginPath(); ctx.arc(-14 + rng()*28, -1 - rng()*3, 1 + rng()*1.6, 0, Math.PI*2); ctx.fill();
      }
      ctx.strokeStyle = '#3a5a1a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const rx = -12 + i*8;
        ctx.beginPath(); ctx.moveTo(rx, -1); ctx.quadraticCurveTo(rx+3, -14, rx+(rng()-0.5)*6, -22); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
    ctx.restore();
  },

  // ── Track supports, flags & balloons (rollercoaster map) ───────────────
  _sceneryRollercoaster(ctx, x, y, rng, t) {
    this._sceneryFar(ctx, x, y, 'rollercoaster');
    const r = rng();
    ctx.save(); ctx.translate(x, y);
    if (r < 0.4) {
      // Coaster support truss with rails arcing overhead
      ctx.strokeStyle = '#e0e0e8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-8, -60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(8, -60); ctx.stroke();
      // Cross braces
      ctx.lineWidth = 1.2;
      for (let l = 0; l < 5; l++) {
        const ly = -l*12 - 4;
        const spread = 16 - l*1.6;
        ctx.beginPath(); ctx.moveTo(-spread, ly); ctx.lineTo(spread, ly - 6); ctx.moveTo(spread, ly); ctx.lineTo(-spread, ly - 6); ctx.stroke();
      }
      // Arcing rails
      ctx.strokeStyle = '#d0203f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-40, -50); ctx.quadraticCurveTo(0, -78, 40, -50); ctx.stroke();
      ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-40, -46); ctx.quadraticCurveTo(0, -74, 40, -46); ctx.stroke();
      // Cross ties
      ctx.strokeStyle = 'rgba(120,120,130,0.6)'; ctx.lineWidth = 1;
      for (let tx = -34; tx <= 34; tx += 12) {
        const ty = -50 - (1 - Math.abs(tx)/40)*24;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty+4); ctx.stroke();
      }
    } else if (r < 0.72) {
      // Colorful pennant flag pole
      ctx.fillStyle = '#888'; ctx.fillRect(-1.5, -54, 3, 54);
      ctx.fillStyle = '#f0c020';
      ctx.beginPath(); ctx.arc(0, -54, 3, 0, Math.PI*2); ctx.fill();
      const fc = ['#ff4a6a','#4ac8ff','#7ae86a','#ffd23a'];
      for (let f = 0; f < 4; f++) {
        ctx.fillStyle = fc[f%4];
        const fy = -50 + f*6;
        ctx.beginPath(); ctx.moveTo(1.5, fy); ctx.lineTo(14, fy + 2); ctx.lineTo(1.5, fy + 5); ctx.closePath(); ctx.fill();
      }
    } else {
      // Bunch of balloons
      const bc = ['#ff4a6a','#4ac8ff','#7ae86a','#ffd23a','#c06aff'];
      ctx.strokeStyle = 'rgba(180,180,190,0.6)'; ctx.lineWidth = 0.8;
      for (let b = 0; b < 4; b++) {
        const bx = (b-1.5)*9;
        const by = -42 - (b%2)*8;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx*0.5, -20, 0, 0); ctx.stroke();
      }
      for (let b = 0; b < 4; b++) {
        const bx = (b-1.5)*9;
        const by = -42 - (b%2)*8;
        ctx.fillStyle = bc[b%bc.length];
        ctx.beginPath(); ctx.ellipse(bx, by, 6, 7.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.ellipse(bx - 2, by - 2.5, 1.6, 2.2, -0.4, 0, Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── Dark cavern: stalagmites, glow-fungi, bat roosts (cave map) ─────────
  // Dedicated helper (previously shared crystal_cave's). Distant parallax =
  // layered black stalagmite ridges. Deterministic (_hash) + perf-gated.
  _sceneryCave(ctx, x, y, rng, t) {
    // Distant stalagmite / rock ridge silhouette (x-hashed, never consumes rng)
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps >= 0.5) {
      const xi = Math.floor(x);
      const h0 = this._hash(xi * 3 + 11);
      if (h0 >= 0.32) {
        const h1 = this._hash(xi * 7 + 23), h2 = this._hash(xi * 13 + 5), h3 = this._hash(xi * 17 + 41);
        const jx = (h2 - 0.5) * 46;
        ctx.save(); ctx.translate(x + jx, y);
        const rw = 40 + h1 * 16;
        ctx.fillStyle = 'rgba(28,22,44,0.42)';         // far cave-wall rock hump
        ctx.beginPath();
        ctx.moveTo(-rw, 2);
        for (let s = 0; s <= 5; s++) {                  // jagged stalagmite teeth on the ridge
          const sx = -rw + (rw * 2) * (s / 5);
          const hy = -(10 + 26 * Math.abs(Math.sin(s * 1.9 + xi * 0.017))) * (0.5 + h1 * 0.6);
          ctx.lineTo(sx, hy);
        }
        ctx.lineTo(rw, 2); ctx.closePath(); ctx.fill();
        if (h3 < 0.5) {                                 // faint mineral-lit tip
          ctx.fillStyle = 'rgba(90,150,200,0.18)';
          ctx.beginPath(); ctx.arc((h2 - 0.5) * rw * 0.6, -30 - h3 * 14, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(2, 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (r < 0.42) {
      // Cluster of stony stalagmites rising from the floor
      const cols = ['#4a4652','#3a3644','#565262'];
      const count = 2 + Math.floor(rng() * 3);
      for (let s = 0; s < count; s++) {
        const sx = (s - (count - 1) / 2) * 12 + (rng() - 0.5) * 5;
        const sh = 26 + rng() * 40;
        const sw = 7 + rng() * 4;
        const g = ctx.createLinearGradient(0, 0, 0, -sh);
        g.addColorStop(0, cols[s % 3]); g.addColorStop(1, '#20202a');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx - sw, 0);
        ctx.quadraticCurveTo(sx - sw * 0.3, -sh * 0.6, sx, -sh);
        ctx.quadraticCurveTo(sx + sw * 0.3, -sh * 0.6, sx + sw, 0);
        ctx.closePath(); ctx.fill();
        // Wet mineral banding + damp highlight
        ctx.strokeStyle = 'rgba(150,170,200,0.22)'; ctx.lineWidth = 1;
        for (let b = 1; b <= 2; b++) { ctx.beginPath(); ctx.ellipse(sx, -sh * b * 0.3, sw * (1 - b * 0.28), 2, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.fillStyle = 'rgba(180,200,230,0.3)'; ctx.fillRect(sx - sw * 0.5, -sh * 0.7, 1.4, sh * 0.6);
        // Faint glow crystal on the tip
        if (rng() < 0.5) {
          ctx.fillStyle = 'rgba(90,220,200,0.8)'; ctx.shadowColor = '#5affd0'; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(sx, -sh, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      }
    } else if (r < 0.72) {
      // Mossy boulder with bio-luminescent fungi & glowworms
      const sz = 16 + rng() * 12;
      const g = ctx.createRadialGradient(-sz * 0.3, -sz * 0.4, 1, 0, 0, sz);
      g.addColorStop(0, '#3a3e3a'); g.addColorStop(0.7, '#242824'); g.addColorStop(1, '#141614');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, -sz * 0.45, sz, sz * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      // Moss patch
      ctx.fillStyle = 'rgba(50,90,50,0.5)';
      ctx.beginPath(); ctx.ellipse(-sz * 0.3, -sz * 0.9, sz * 0.5, sz * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      // Tiny glowing cave mushrooms
      const gc = rng() < 0.5 ? '#6affc8' : '#8ab8ff';
      for (let m = 0; m < 3; m++) {
        const mx = -sz * 0.6 + m * sz * 0.6 + (rng() - 0.5) * 4;
        const mh = 6 + rng() * 7;
        ctx.strokeStyle = 'rgba(200,220,210,0.6)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, -mh); ctx.stroke();
        ctx.fillStyle = gc; ctx.shadowColor = gc; ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.ellipse(mx, -mh, 3, 2, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      // Glowworm speck constellation
      ctx.fillStyle = gc;
      for (let s = 0; s < 4; s++) { ctx.globalAlpha = 0.4 + rng() * 0.5; ctx.beginPath(); ctx.arc(-14 + rng() * 28, -sz - rng() * 18, 0.9, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    } else {
      // Low rock outcrop with a still reflecting pool & a roosting bat
      ctx.fillStyle = '#2c2c36';
      ctx.beginPath();
      ctx.moveTo(-24, 2); ctx.lineTo(-14, -14); ctx.lineTo(-2, -8); ctx.lineTo(8, -18); ctx.lineTo(20, -6); ctx.lineTo(26, 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(120,140,170,0.16)';
      ctx.beginPath(); ctx.moveTo(8, -18); ctx.lineTo(20, -6); ctx.lineTo(12, -6); ctx.closePath(); ctx.fill();
      // Reflecting subterranean pool
      const pg = ctx.createLinearGradient(0, 0, 0, 5);
      pg.addColorStop(0, 'rgba(40,90,110,0.6)'); pg.addColorStop(1, 'rgba(20,40,55,0.6)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.ellipse(-2, 2, 18, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(150,200,220,0.3)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(-2, 2, 12, 2.2, 0, 0, Math.PI); ctx.stroke();
      // Little roosting bat silhouette perched on the outcrop
      ctx.fillStyle = '#141018';
      const bx = 8, by = -18;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 6, by - 3, bx - 9, by + 1);
      ctx.quadraticCurveTo(bx - 4, by, bx, by + 5);
      ctx.quadraticCurveTo(bx + 4, by, bx + 9, by + 1);
      ctx.quadraticCurveTo(bx + 6, by - 3, bx, by); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,180,60,0.7)';
      ctx.beginPath(); ctx.arc(bx - 1, by + 1, 0.7, 0, Math.PI * 2); ctx.arc(bx + 1, by + 1, 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // ── Floating sky-islands: turf islets, cairn markers, birds (skyland) ──
  _scenerySkyland(ctx, x, y, rng, t) {
    // Distant parallax: far drifting grass islands with tapered rock keels
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps >= 0.5) {
      const xi = Math.floor(x);
      const h0 = this._hash(xi * 3 + 11);
      if (h0 >= 0.34) {
        const h1 = this._hash(xi * 7 + 23), h2 = this._hash(xi * 13 + 5), h3 = this._hash(xi * 17 + 41);
        const jx = (h2 - 0.5) * 44;
        const iy = -70 - h1 * 60;                        // hovering high in the sky
        ctx.save(); ctx.translate(x + jx, y);
        const iw = 22 + h1 * 16;
        ctx.fillStyle = 'rgba(120,150,110,0.30)';         // rock keel
        ctx.beginPath();
        ctx.moveTo(-iw, iy); ctx.lineTo(iw, iy);
        ctx.lineTo(iw * 0.3, iy + 16 + h3 * 10); ctx.lineTo(-iw * 0.4, iy + 12);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(120,180,110,0.34)';         // grass cap
        ctx.beginPath(); ctx.ellipse(0, iy, iw, 5, 0, 0, Math.PI * 2); ctx.fill();
        if (h3 < 0.5) {                                   // tiny far tree on it
          ctx.fillStyle = 'rgba(90,140,90,0.34)';
          ctx.beginPath(); ctx.arc((h2 - 0.5) * iw, iy - 8, 5 + h3 * 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.28)';         // small drifting cloud beside it
        ctx.beginPath(); ctx.ellipse(iw + 10, iy + 8, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(30,60,80,0.12)';
    ctx.beginPath(); ctx.ellipse(2, 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (r < 0.42) {
      // Lollipop tree perched on the island edge with dangling roots
      const h = 46 + rng() * 34;
      ctx.fillStyle = '#6a4a24'; ctx.fillRect(-4, -h, 8, h);
      ctx.fillStyle = 'rgba(40,26,12,0.5)'; ctx.fillRect(1, -h, 3, h);
      const fc = ['#3a9e3a','#4fbf4a','#2a7e28'];
      for (let lay = 0; lay < 3; lay++) {
        ctx.fillStyle = fc[lay];
        ctx.beginPath(); ctx.arc((lay - 1) * 8, -h - 4 + lay * 6, 20 - lay * 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(180,240,120,0.5)';
      ctx.beginPath(); ctx.arc(-8, -h - 6, 5, 0, Math.PI * 2); ctx.fill();
      // Roots dangling off the turf lip into open sky
      ctx.strokeStyle = '#5a3e1e'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let rt = -1; rt <= 1; rt++) {
        ctx.beginPath(); ctx.moveTo(rt * 8, 2); ctx.quadraticCurveTo(rt * 10 + 3, 12, rt * 8 - 2, 22 + rng() * 8); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else if (r < 0.72) {
      // Stacked-stone waypoint cairn with a fluttering pennant
      const cols = ['#9aa0a8','#828892','#aab0b8'];
      let cy = 0; const stones = 4;
      for (let s = 0; s < stones; s++) {
        const sw = 14 - s * 2.4;
        ctx.fillStyle = cols[s % 3];
        ctx.beginPath(); ctx.ellipse((rng() - 0.5) * 3, cy - 3, sw, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath(); ctx.ellipse(-sw * 0.3, cy - 5, sw * 0.4, 2, 0, 0, Math.PI * 2); ctx.fill();
        cy -= 8;
      }
      ctx.strokeStyle = '#7a6a4a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(0, cy - 22); ctx.stroke();
      ctx.fillStyle = rng() < 0.5 ? '#ff5a6a' : '#4ac8ff';
      ctx.beginPath(); ctx.moveTo(0, cy - 22); ctx.lineTo(16, cy - 18); ctx.lineTo(0, cy - 14); ctx.closePath(); ctx.fill();
    } else {
      // Wind-swept wildgrass tuft with a couple of birds gliding above
      ctx.strokeStyle = '#3d9a34'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let b = 0; b < 6; b++) {
        const bx = (b - 2.5) * 4;
        const bh = 14 + rng() * 12;
        ctx.beginPath(); ctx.moveTo(bx, 0); ctx.quadraticCurveTo(bx + 6, -bh * 0.6, bx + 10, -bh); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // Wildflower dabs
      const fcol = rng() < 0.5 ? '#ffd23a' : '#ff7ac0';
      ctx.fillStyle = fcol;
      for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.arc(-8 + rng() * 20, -8 - rng() * 8, 1.8, 0, Math.PI * 2); ctx.fill(); }
      // Distant gliding birds
      ctx.strokeStyle = 'rgba(40,50,60,0.6)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 2; k++) {
        const kx = -6 + k * 20, ky = -46 - k * 8;
        ctx.beginPath(); ctx.moveTo(kx - 5, ky); ctx.quadraticCurveTo(kx, ky - 4, kx + 5, ky); ctx.stroke();
      }
    }
    ctx.restore();
  },

  // ── Neon wireframe grid world: data pylons, holo-rings (cyber_grid) ─────
  _sceneryCyberGrid(ctx, x, y, rng, t) {
    // Distant parallax: glowing neon skyline of wireframe data towers
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps >= 0.5) {
      const xi = Math.floor(x);
      const h0 = this._hash(xi * 3 + 11);
      if (h0 >= 0.3) {
        const h1 = this._hash(xi * 7 + 23), h2 = this._hash(xi * 13 + 5), h3 = this._hash(xi * 17 + 41);
        const jx = (h2 - 0.5) * 44;
        ctx.save(); ctx.translate(x + jx, y);
        const bw = 20 + h1 * 14, bh = 50 + h1 * 66;
        ctx.fillStyle = 'rgba(6,14,24,0.55)';             // dark tower mass
        ctx.fillRect(-bw / 2, -bh, bw, bh);
        const neon = ['rgba(0,224,208,0.5)','rgba(255,47,220,0.5)','rgba(58,255,192,0.5)'][Math.floor(h3 * 3) % 3];
        ctx.strokeStyle = neon; ctx.lineWidth = 1;         // wireframe edges
        ctx.strokeRect(-bw / 2, -bh, bw, bh);
        for (let ry = 1; ry < 5; ry++) { const yy = -bh + (bh) * (ry / 5); ctx.beginPath(); ctx.moveTo(-bw / 2, yy); ctx.lineTo(bw / 2, yy); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(0, -bh); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = neon.replace('0.5', '0.8');        // rooftop beacon
        ctx.fillRect(-1.5, -bh - 8, 3, 8);
        ctx.beginPath(); ctx.arc(0, -bh - 9, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(0,40,50,0.28)';
    ctx.beginPath(); ctx.ellipse(2, 2, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    const accent = ['#00e0d0','#ff2fdc','#3affc0','#3a9aff'];
    const acc = accent[Math.floor(rng() * accent.length)];
    if (r < 0.42) {
      // Neon data pylon — dark prism with glowing edge circuitry
      const h = 40 + rng() * 40, w = 9 + rng() * 5;
      const g = ctx.createLinearGradient(0, 0, 0, -h);
      g.addColorStop(0, '#0a1622'); g.addColorStop(1, '#12283a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.7, -h); ctx.lineTo(w * 0.7, -h); ctx.lineTo(w, 0);
      ctx.closePath(); ctx.fill();
      // Glowing edge outline
      ctx.strokeStyle = acc; ctx.lineWidth = 1.4; ctx.shadowColor = acc; ctx.shadowBlur = 6;
      ctx.stroke();
      // Circuit rungs climbing the face
      ctx.lineWidth = 1;
      for (let s = 1; s < 6; s++) {
        const sy = -h * (s / 6);
        const sw = w * (1 - s / 8);
        ctx.beginPath(); ctx.moveTo(-sw, sy); ctx.lineTo(sw, sy); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Pulsing core node
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0, -h * 0.5, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    } else if (r < 0.72) {
      // Hovering holographic rings above an emitter base
      ctx.fillStyle = '#0e2030';
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = acc; ctx.shadowColor = acc; ctx.shadowBlur = 8;
      ctx.fillRect(-6, -9, 12, 2); ctx.shadowBlur = 0;
      ctx.strokeStyle = acc; ctx.lineCap = 'round';
      ctx.shadowColor = acc; ctx.shadowBlur = 7;
      for (let ri = 0; ri < 3; ri++) {
        const ry = -18 - ri * 12;
        const rw = 16 - ri * 3;
        ctx.globalAlpha = 0.8 - ri * 0.2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, ry, rw, rw * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.lineCap = 'butt';
      // Floating data cube at the top
      ctx.strokeStyle = accent[(Math.floor(rng() * 4) + 1) % 4]; ctx.lineWidth = 1.2;
      const cy = -56, cs = 6;
      ctx.strokeRect(-cs, cy - cs, cs * 2, cs * 2);
      ctx.beginPath(); ctx.moveTo(-cs, cy - cs); ctx.lineTo(-cs + 3, cy - cs - 3); ctx.lineTo(cs + 3, cy - cs - 3); ctx.lineTo(cs, cy - cs); ctx.stroke();
    } else {
      // Ground circuit conduit with glowing nodes and a signal antenna
      ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.shadowColor = acc; ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(-24, -2); ctx.lineTo(-8, -2); ctx.lineTo(-4, -10); ctx.lineTo(6, -10); ctx.lineTo(10, -2); ctx.lineTo(24, -2);
      ctx.stroke();
      ctx.fillStyle = acc;
      for (const nx of [-24, -6, 8, 24]) { ctx.beginPath(); ctx.arc(nx, -2, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0;
      // Vertical antenna mast with beacon
      ctx.strokeStyle = '#4a5a68'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -44); ctx.stroke();
      ctx.strokeStyle = acc; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-7, -24); ctx.moveTo(0, -30); ctx.lineTo(7, -24); ctx.stroke();
      ctx.fillStyle = '#ff4a6a'; ctx.shadowColor = '#ff4a6a'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, -46, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  },

  // ── Storm-lashed peaks: wind-bent snags, icy spires, prayer flags ──────
  _sceneryStormpeak(ctx, x, y, rng, t) {
    // Distant parallax: jagged storm-shrouded mountain ridge + static bolt
    const ps = (typeof Settings !== 'undefined' && Settings.perfScale) ? Settings.perfScale() : 1;
    if (ps >= 0.5) {
      const xi = Math.floor(x);
      const h0 = this._hash(xi * 3 + 11);
      if (h0 >= 0.3) {
        const h1 = this._hash(xi * 7 + 23), h2 = this._hash(xi * 13 + 5), h3 = this._hash(xi * 17 + 41);
        const jx = (h2 - 0.5) * 46;
        ctx.save(); ctx.translate(x + jx, y);
        const mw = 34 + h1 * 16, mh = 44 + h1 * 40;
        ctx.fillStyle = 'rgba(46,44,60,0.42)';             // dark jagged peak
        ctx.beginPath();
        ctx.moveTo(-mw, 2);
        ctx.lineTo(-mw * 0.45, -mh * 0.6);
        ctx.lineTo(-mw * 0.1, -mh * 0.4);
        ctx.lineTo(mw * 0.05, -mh);
        ctx.lineTo(mw * 0.4, -mh * 0.55);
        ctx.lineTo(mw, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(210,220,240,0.26)';          // snow cap
        ctx.beginPath();
        ctx.moveTo(mw * 0.05, -mh); ctx.lineTo(-mw * 0.14, -mh * 0.7); ctx.lineTo(mw * 0.12, -mh * 0.72); ctx.lineTo(mw * 0.24, -mh * 0.62);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(70,66,88,0.3)';              // storm cloud shroud
        ctx.beginPath(); ctx.ellipse(0, -mh * 0.9, mw * 0.7, 8, 0, 0, Math.PI * 2); ctx.fill();
        if (h3 < 0.35) {                                    // static forked lightning
          ctx.strokeStyle = 'rgba(190,210,255,0.5)'; ctx.lineWidth = 1.4;
          const lx = (h2 - 0.5) * mw * 0.5;
          ctx.beginPath();
          ctx.moveTo(lx, -mh * 0.85); ctx.lineTo(lx + 5, -mh * 0.55); ctx.lineTo(lx - 3, -mh * 0.45); ctx.lineTo(lx + 4, -mh * 0.2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    const r = rng();
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = 'rgba(20,20,30,0.28)';
    ctx.beginPath(); ctx.ellipse(2, 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (r < 0.4) {
      // Wind-bent, lightning-scarred dead snag leaning with the gale
      const h = 40 + rng() * 30;
      const lean = 0.28 + rng() * 0.18;                     // permanent windward lean
      ctx.save(); ctx.transform(1, 0, lean, 1, 0, 0);
      ctx.strokeStyle = '#3a3844'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
      ctx.lineWidth = 2;
      for (let b = 0; b < 5; b++) {
        const by = -12 - b * 6;
        const dir = b % 2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(dir * (6 + b * 2), by - 5 - b); ctx.stroke();
      }
      // Bleached splintered scar highlight
      ctx.strokeStyle = 'rgba(190,200,220,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(1, -h * 0.3); ctx.lineTo(1, -h * 0.8); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();
      // Snow whipping off the base
      ctx.strokeStyle = 'rgba(220,228,245,0.4)'; ctx.lineWidth = 1.2;
      for (let s = 0; s < 3; s++) { const sy = -2 - s * 3; ctx.beginPath(); ctx.moveTo(6, sy); ctx.lineTo(18 + s * 4, sy - 2); ctx.stroke(); }
    } else if (r < 0.72) {
      // Jagged frost-streaked rock spire
      const sh = 40 + rng() * 44, sw = 12 + rng() * 9;
      const g = ctx.createLinearGradient(-sw, 0, sw, 0);
      g.addColorStop(0, '#3a3846'); g.addColorStop(0.5, '#585666'); g.addColorStop(1, '#2c2a38');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-sw, 0); ctx.lineTo(-sw * 0.4, -sh * 0.5); ctx.lineTo(-sw * 0.1, -sh * 0.38);
      ctx.lineTo(0, -sh); ctx.lineTo(sw * 0.35, -sh * 0.5); ctx.lineTo(sw, 0);
      ctx.closePath(); ctx.fill();
      // Ice / snow streaks
      ctx.fillStyle = 'rgba(220,232,250,0.6)';
      ctx.beginPath(); ctx.moveTo(0, -sh); ctx.lineTo(-sw * 0.18, -sh * 0.66); ctx.lineTo(sw * 0.08, -sh * 0.72); ctx.lineTo(sw * 0.2, -sh * 0.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,52,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-sw * 0.3, -sh * 0.2); ctx.lineTo(sw * 0.1, -sh * 0.5); ctx.stroke();
      // Wind-driven snow lines across it
      ctx.strokeStyle = 'rgba(220,228,245,0.35)'; ctx.lineWidth = 1;
      for (let w = 0; w < 3; w++) { const wy = -sh * (0.3 + w * 0.2); ctx.beginPath(); ctx.moveTo(-sw - 6, wy); ctx.lineTo(sw + 8, wy - 3); ctx.stroke(); }
    } else {
      // Weathered stone cairn strung with a whipping prayer-flag line
      const cols = ['#6a6878','#54525f','#7a7888'];
      let cy = 0; const stones = 3;
      for (let s = 0; s < stones; s++) {
        const sw = 13 - s * 2.6;
        ctx.fillStyle = cols[s % 3];
        ctx.beginPath(); ctx.ellipse((rng() - 0.5) * 3, cy - 3, sw, 5, 0, 0, Math.PI * 2); ctx.fill();
        cy -= 8;
      }
      ctx.strokeStyle = '#4a4854'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(0, cy - 30); ctx.stroke();
      // Flag line sagging & fluttering downwind to a low stake
      ctx.strokeStyle = 'rgba(180,190,210,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, cy - 28); ctx.quadraticCurveTo(20, cy - 20, 34, -4); ctx.stroke();
      const fcol = ['#d84a4a','#e0c040','#4a86d8','#4ab86a'];
      for (let f = 0; f < 5; f++) {
        const tt = f / 5;
        const fx = tt * 34;
        const fy = (cy - 28) + tt * (cy - 28 < -4 ? (-4 - (cy - 28)) : 0) + Math.sin(tt * 3) * 3;
        ctx.fillStyle = fcol[f % 4];
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx + 1.5, fy + 6); ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ── PERF(31 Tmz) sikke/elmas gradyan önbelleği ───────────────────────────
  // Sikke halesi yalnız yarıçapa, sikke yüzü yarıçap + dönüş yönüne, elmas
  // parıltısı yalnız yarıçapa bağlıdır. Eskiden GÖRÜNEN HER sikke için kare
  // başına 2 yeni gradyan üretiliyordu. Tek yuvalı memo yeterli (bir haritadaki
  // sikkelerin yarıçapı aynıdır); yarıçap değişince yeniden kurulur.
  // 🔴 Yeni gradyan eklerken buraya bağla — `ctx.createXGradient`'i sıcak
  //    döngüde ÇIPLAK çağırma (dogrula-perf.js bunu arar).
  _gCoinHalo: null, _gCoinHaloR: -1,
  _gCoinFace0: null, _gCoinFace1: null, _gCoinFaceR: -1,
  _gGem: null, _gGemR: -1,

  _drawCollectibles(ctx) {
    // 🔴 `Date.now()` ESKİDEN DÖNGÜNÜN İÇİNDEYDİ → toplanmamış her nesne için
    //    bir kez çağrılıyordu (ölçüldü: 704 çağrı/kare). Dışarı alındı; tüm
    //    nesneler zaten aynı karede çizildiği için görüntü aynı.
    const t = Date.now() * 0.003;
    for (const obj of this.objects) {
      if (obj.collected) continue;
      if (!Camera.isVisible(obj.x, obj.y, 100)) continue;

      const bounce = Math.sin(t + obj.x * 0.01) * 4;
      const phase = obj.x * 0.017;   // per-object phase so nearby items don't sync

      ctx.save();
      ctx.translate(obj.x, obj.y + bounce);

      if (obj.type === 'coin') {
        // ── Animated spinning gold coin: glow halo + spin + shine sweep + twinkle ──
        const r = obj.radius;
        // soft warm glow halo (PERF: yalnız r'ye bağlı → önbellekli)
        if (this._gCoinHaloR !== r) {
          const _h = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.95);
          _h.addColorStop(0, 'rgba(255,224,90,0.34)');
          _h.addColorStop(1, 'rgba(255,224,90,0)');
          this._gCoinHalo = _h; this._gCoinHaloR = r;
        }
        ctx.fillStyle = this._gCoinHalo;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.95, 0, Math.PI * 2); ctx.fill();
        // spin — squash horizontally like a turning disc
        const spin = Math.sin(t * 1.5 + phase);
        const sx = Math.max(0.14, Math.abs(spin));
        const facing = spin >= 0;
        ctx.save();
        ctx.scale(sx, 1);
        // PERF: yüz gradyanı yalnız r + dönüş yönüne bağlı → iki yuvalı önbellek
        if (this._gCoinFaceR !== r) {
          const _g0 = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
          _g0.addColorStop(0, '#FFF6B0'); _g0.addColorStop(0.6, '#FFD23F'); _g0.addColorStop(1, '#B8860B');
          const _g1 = ctx.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r);
          _g1.addColorStop(0, '#FFE873'); _g1.addColorStop(0.6, '#FFD23F'); _g1.addColorStop(1, '#B8860B');
          this._gCoinFace0 = _g0; this._gCoinFace1 = _g1; this._gCoinFaceR = r;
        }
        ctx.fillStyle = facing ? this._gCoinFace0 : this._gCoinFace1;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();
        // engraved inner ring
        ctx.strokeStyle = 'rgba(255,244,180,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
        // moving shine sweep across the face
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
        const sw = ((t * 34 + phase * 40) % (r * 4)) - r * 2;
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sw - r * 0.5, -r); ctx.lineTo(sw + r * 0.5, r); ctx.stroke();
        ctx.restore();
        ctx.restore(); // end spin scale
        // $ label — fades as the coin turns edge-on (content unchanged)
        ctx.fillStyle = '#B8860B';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.3 + sx * 0.7;
        ctx.fillText('$', 0, 1);
        ctx.globalAlpha = 1;
        // orbiting twinkle sparkle
        const tw = 0.5 + Math.sin(t * 3 + phase) * 0.5;
        if (tw > 0.12) {
          const sa = t * 2 + phase;
          ctx.fillStyle = `rgba(255,255,255,${tw})`;
          this._star4(ctx, Math.cos(sa) * r * 0.8, Math.sin(sa) * r * 0.8, 3 * tw);
        }
      } else if (obj.type === 'fuel') {
        // ── Fuel can with pulsing green energy glow + body sheen ──
        const pulse = 0.5 + Math.sin(t * 2.2 + phase) * 0.5;
        const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 27);
        glow.addColorStop(0, `rgba(80,232,120,${0.18 + pulse * 0.26})`);
        glow.addColorStop(1, 'rgba(80,232,120,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.roundRect(-12, -18, 24, 36, 5);
        ctx.fill();
        // glossy vertical sheen down the left face
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath();
        ctx.roundRect(-9, -15, 6, 30, 3);
        ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-6, -22, 12, 8);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛽', 0, 0);
      } else if (obj.type === 'diamond' || obj.type === 'gem' || obj.type === 'crystal') {
        // ── Sparkling faceted diamond/gem: glow + slow turn + twinkle ──
        const r = obj.radius || 14;
        // PERF: elmas parıltısı yalnız r'ye bağlı → önbellekli
        if (this._gGemR !== r) {
          const _d = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.2);
          _d.addColorStop(0, 'rgba(130,232,255,0.42)');
          _d.addColorStop(1, 'rgba(130,232,255,0)');
          this._gGem = _d; this._gGemR = r;
        }
        ctx.fillStyle = this._gGem;
        ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
        const spin = Math.sin(t * 1.2 + phase);
        ctx.save();
        ctx.scale(Math.max(0.3, Math.abs(spin)), 1);
        const gg = ctx.createLinearGradient(0, -r, 0, r);
        gg.addColorStop(0, '#eaffff');
        gg.addColorStop(0.5, '#66d9ff');
        gg.addColorStop(1, '#1f8fd0');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.82, -r * 0.2);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.82, -r * 0.2);
        ctx.closePath();
        ctx.fill();
        // facet lines
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 0.82, -r * 0.2); ctx.lineTo(r * 0.82, -r * 0.2);
        ctx.moveTo(0, -r); ctx.lineTo(0, r);
        ctx.moveTo(-r * 0.4, -r * 0.2); ctx.lineTo(0, -r);
        ctx.moveTo(r * 0.4, -r * 0.2); ctx.lineTo(0, -r);
        ctx.stroke();
        ctx.restore();
        // twinkling sparkle on the crown
        const tw = 0.5 + Math.sin(t * 3.5 + phase) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`;
        this._star4(ctx, -r * 0.3, -r * 0.42, 3 + tw * 2);
      } else if (obj.type === 'checkpoint' || obj.type === 'flag') {
        // ── Fluttering checkpoint flag on a pole ──
        const poleH = obj.radius ? obj.radius * 2.4 : 40;
        ctx.strokeStyle = '#cfcfcf';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, -poleH); ctx.stroke();
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(0, -poleH, 3, 0, Math.PI * 2); ctx.fill();
        // checkered flag with per-column wave (stronger toward the free edge)
        const fw = 26, fh = 16, cols = 4, rows = 3, topY = -poleH + 2;
        for (let cxi = 0; cxi < cols; cxi++) {
          const wave = Math.sin(t * 4 + cxi * 0.9 + phase) * 3 * (cxi / cols);
          for (let cyi = 0; cyi < rows; cyi++) {
            ctx.fillStyle = ((cxi + cyi) % 2 === 0) ? '#ff3b3b' : '#ffffff';
            ctx.fillRect(1 + cxi * (fw / cols), topY + cyi * (fh / rows) + wave, fw / cols + 0.6, fh / rows + 0.6);
          }
        }
      }
      ctx.restore();
    }
  }
,

  // Small 4-point sparkle star used by collectible highlights (fill-only helper)
  _star4(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.28, y - s * 0.28);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s * 0.28, y + s * 0.28);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.28, y + s * 0.28);
    ctx.lineTo(x - s, y);
    ctx.lineTo(x - s * 0.28, y - s * 0.28);
    ctx.closePath();
    ctx.fill();
  }
,
  // ═══════════════════════════════════════════════════════════════
  // EXTENDED SCENERY DRAWING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  _drawMountainRange(ctx, rnd, baseY) {
    // Background mountain silhouette — multi-layer with atmospheric depth
    ctx.save();

    // ── Far ridge (hazier, lower, cooler) — gives a subtle parallax depth cue ──
    const farPeaks = 6 + Math.floor(rnd() * 4);
    const farTint  = 50 + Math.floor(rnd() * 25);
    ctx.fillStyle = `rgba(${farTint+8},${farTint+22},${farTint+45},0.22)`;
    ctx.beginPath(); ctx.moveTo(-260, baseY);
    let fx = -260;
    for (let p = 0; p < farPeaks; p++) {
      const pw = 90 + rnd() * 110;
      const ph = 34 + rnd() * 58;
      ctx.lineTo(fx + pw * 0.5, baseY - ph);
      ctx.lineTo(fx + pw, baseY);
      fx += pw;
    }
    ctx.lineTo(fx + 260, baseY);
    ctx.closePath(); ctx.fill();

    // ── Near ridge — main silhouette with vertical gradient body ──
    const peaks = 5 + Math.floor(rnd() * 4);
    const r0 = 40 + Math.floor(rnd() * 30);
    const g0 = 50 + Math.floor(rnd() * 30);
    const b0 = 60 + Math.floor(rnd() * 30);
    const bodyGrad = ctx.createLinearGradient(0, baseY - 160, 0, baseY);
    bodyGrad.addColorStop(0,   `rgba(${r0+18},${g0+22},${b0+30},0.5)`);
    bodyGrad.addColorStop(0.55, `rgba(${r0},${g0},${b0},0.42)`);
    bodyGrad.addColorStop(1,   `rgba(${Math.max(0,r0-18)},${Math.max(0,g0-16)},${Math.max(0,b0-12)},0.4)`);
    ctx.fillStyle = bodyGrad;
    // record peak geometry so caps/shadows reuse the exact same silhouette
    const geo = [];
    ctx.beginPath(); ctx.moveTo(-200, baseY);
    let mx = -200;
    for (let p = 0; p < peaks; p++) {
      const pw = 80 + rnd() * 120;
      const ph = 60 + rnd() * 100;
      geo.push({ mx, pw, ph });
      ctx.lineTo(mx + pw/2, baseY - ph);
      ctx.lineTo(mx + pw, baseY);
      mx += pw;
    }
    ctx.lineTo(mx + 200, baseY);
    ctx.closePath(); ctx.fill();

    // ── Shaded (right-facing) slope of each peak for a touch of form ──
    ctx.fillStyle = 'rgba(20,26,40,0.22)';
    ctx.beginPath();
    for (const s of geo) {
      ctx.moveTo(s.mx + s.pw/2, baseY - s.ph);
      ctx.lineTo(s.mx + s.pw, baseY);
      ctx.lineTo(s.mx + s.pw/2, baseY);
      ctx.closePath();
    }
    ctx.fill();

    // ── Snow caps with a soft blue under-shadow ──
    for (const s of geo) {
      const capH = s.ph * 0.28;
      const apexX = s.mx + s.pw/2, apexY = baseY - s.ph;
      // under-shadow
      ctx.fillStyle = 'rgba(150,175,215,0.35)';
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX - s.pw*0.14, apexY + capH*1.15);
      ctx.lineTo(apexX + s.pw*0.14, apexY + capH*1.15);
      ctx.closePath(); ctx.fill();
      // bright snow
      ctx.fillStyle = 'rgba(228,238,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(apexX - s.pw*0.12, apexY + capH);
      ctx.lineTo(apexX + s.pw*0.12, apexY + capH);
      ctx.closePath(); ctx.fill();
    }

    // ── Base haze band — mountains fade into the distance at the foot ──
    const haze = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 6);
    haze.addColorStop(0, 'rgba(210,222,240,0)');
    haze.addColorStop(1, 'rgba(210,222,240,0.16)');
    ctx.fillStyle = haze;
    ctx.fillRect(-260, baseY - 30, (mx + 460), 36);

    ctx.restore();
  },

  _drawDetailedTree(ctx, rnd, groundY) {
    const h = 60 + rnd() * 50;
    const variety = Math.floor(rnd() * 4);
    ctx.save();
    if (variety === 0) {
      // Pine tree (tall conical)
      ctx.fillStyle = `hsl(${120+rnd()*20},${40+rnd()*20}%,${22+rnd()*12}%)`;
      for (let layer = 0; layer < 5; layer++) {
        const ly = groundY - (layer/5)*h;
        const lw = h*0.35*(1-layer/5);
        ctx.beginPath(); ctx.moveTo(0, ly - h*0.22);
        ctx.lineTo(-lw, ly); ctx.lineTo(lw, ly); ctx.closePath(); ctx.fill();
        // Snow on layers (winter feel)
        ctx.fillStyle = 'rgba(220,235,255,0.25)';
        ctx.beginPath(); ctx.moveTo(-lw*0.4, ly-h*0.05); ctx.lineTo(lw*0.4, ly-h*0.05);
        ctx.lineTo(lw*0.3, ly); ctx.lineTo(-lw*0.3, ly); ctx.closePath(); ctx.fill();
        ctx.fillStyle = `hsl(${120+rnd()*20},${40+rnd()*20}%,${22+rnd()*12}%)`;
      }
      // Trunk
      ctx.fillStyle = `hsl(30,${40+rnd()*20}%,${20+rnd()*10}%)`;
      ctx.fillRect(-h*0.04, groundY - h*0.15, h*0.08, h*0.15);
    } else if (variety === 1) {
      // Deciduous (round top)
      const tw = h * (0.5 + rnd() * 0.3);
      const tHue = 100 + rnd() * 40;
      // Trunk
      ctx.fillStyle = `hsl(30,${35+rnd()*20}%,${18+rnd()*12}%)`;
      ctx.fillRect(-h*0.06, groundY-h*0.45, h*0.12, h*0.45);
      // Canopy (multi-layer for volume)
      for (let c = 2; c >= 0; c--) {
        ctx.fillStyle = `hsl(${tHue},${45+c*5}%,${18+c*6}%)`;
        ctx.beginPath();
        ctx.arc(rnd()*12-6, groundY-h*0.55-c*6, tw/2 + c*4, 0, Math.PI*2); ctx.fill();
      }
      // Fruit (apple/orange)
      if (rnd() > 0.5) {
        ctx.fillStyle = rnd() > 0.5 ? '#FF4444' : '#FF8800';
        for (let f = 0; f < 3; f++) {
          const fx = (rnd()-0.5)*tw*0.7, fy = groundY-h*0.5 + (rnd()-0.5)*tw*0.4;
          ctx.beginPath(); ctx.arc(fx, fy, 4+rnd()*2, 0, Math.PI*2); ctx.fill();
        }
      }
    } else if (variety === 2) {
      // Palm tree
      // Curved trunk
      ctx.strokeStyle = `hsl(40,${40+rnd()*20}%,${25+rnd()*12}%)`;
      ctx.lineWidth = h * 0.08;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.bezierCurveTo(h*0.1, groundY - h*0.4, h*0.05, groundY - h*0.7, h*0.12, groundY - h);
      ctx.stroke();
      // Palm leaves
      const leafCount = 5 + Math.floor(rnd()*4);
      const topX = h * 0.12, topY = groundY - h;
      for (let l = 0; l < leafCount; l++) {
        const ang = (l / leafCount) * Math.PI * 2;
        const leafLen = h * (0.3 + rnd() * 0.2);
        ctx.strokeStyle = `hsl(${100+rnd()*30},${50+rnd()*20}%,${25+rnd()*12}%)`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.bezierCurveTo(
          topX + Math.cos(ang)*leafLen*0.5, topY + Math.sin(ang)*leafLen*0.5 - 10,
          topX + Math.cos(ang)*leafLen*0.8, topY + Math.sin(ang)*leafLen*0.8 + 5,
          topX + Math.cos(ang)*leafLen,     topY + Math.sin(ang)*leafLen + 20
        );
        ctx.stroke();
        // Leaf fronds
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `hsl(${105+rnd()*25},${45+rnd()*15}%,${28+rnd()*10}%)`;
        const steps = 6;
        for (let f2 = 0; f2 < steps; f2++) {
          const t2 = (f2+1) / (steps+1);
          const px = topX + Math.cos(ang)*leafLen*t2;
          const py = topY + Math.sin(ang)*leafLen*t2 + 5*t2*t2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(ang+Math.PI/2)*14, py + Math.sin(ang+Math.PI/2)*14);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(ang-Math.PI/2)*14, py + Math.sin(ang-Math.PI/2)*14);
          ctx.stroke();
        }
        // Coconuts
        if (l < 3) {
          ctx.fillStyle = '#4a3000';
          ctx.beginPath(); ctx.arc(topX + Math.cos(ang)*20, topY + Math.sin(ang)*20, 5, 0, Math.PI*2); ctx.fill();
        }
      }
    } else {
      // Dead tree (spooky)
      ctx.strokeStyle = '#2a2218';
      ctx.lineWidth = h * 0.09;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(0, groundY - h); ctx.stroke();
      // Branches
      const branchAngles = [-0.6, 0.5, -0.4, 0.7, -0.3];
      for (let b = 0; b < 4 + Math.floor(rnd()*3); b++) {
        const by = groundY - h*(0.4 + b*0.13);
        const bLen = h*(0.2 + rnd()*0.2);
        const bAng = branchAngles[b % branchAngles.length] + (rnd()-0.5)*0.3;
        ctx.lineWidth = h*0.04;
        ctx.beginPath();
        ctx.moveTo(0, by);
        ctx.lineTo(Math.cos(bAng)*bLen, by + Math.sin(bAng)*bLen*0.3);
        ctx.stroke();
        // Sub-branches
        ctx.lineWidth = h*0.02;
        ctx.beginPath();
        ctx.moveTo(Math.cos(bAng)*bLen*0.6, by + Math.sin(bAng)*bLen*0.18);
        ctx.lineTo(Math.cos(bAng+0.5)*bLen*0.4 + Math.cos(bAng)*bLen*0.6,
                   by + Math.sin(bAng)*bLen*0.18 + Math.sin(bAng+0.5)*bLen*0.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  _drawUrbanBuilding(ctx, rnd, groundY) {
    const w = 40 + rnd() * 60;
    const h = 80 + rnd() * 150;
    const style = Math.floor(rnd() * 4);
    ctx.save();
    if (style === 0) {
      // Modern glass skyscraper
      const bG = ctx.createLinearGradient(-w/2, groundY-h, w/2, groundY);
      bG.addColorStop(0, `hsl(200,${30+rnd()*20}%,${20+rnd()*15}%)`);
      bG.addColorStop(1, `hsl(210,${25+rnd()*15}%,${15+rnd()*10}%)`);
      ctx.fillStyle = bG;
      ctx.fillRect(-w/2, groundY-h, w, h);
      // Glass windows grid
      const cols = Math.max(2, Math.floor(w/14));
      const rows = Math.max(3, Math.floor(h/18));
      for (let wc = 0; wc < cols; wc++) {
        for (let wr = 0; wr < rows; wr++) {
          const wx = -w/2 + 4 + wc*(w/cols);
          const wy = groundY - h + 6 + wr*(h/rows);
          const lit = rnd() > 0.35;
          ctx.fillStyle = lit ? `rgba(255,240,180,${0.5+rnd()*0.4})` : `rgba(50,80,120,${0.4+rnd()*0.2})`;
          ctx.fillRect(wx, wy, w/cols-4, h/rows-5);
        }
      }
      // Roof antenna
      ctx.fillStyle = '#888';
      ctx.fillRect(-2, groundY-h-20, 4, 22);
      ctx.fillStyle = '#f00'; ctx.beginPath(); ctx.arc(0, groundY-h-22, 4, 0, Math.PI*2); ctx.fill();
    } else if (style === 1) {
      // Old brick building
      ctx.fillStyle = `hsl(${15+rnd()*10},${45+rnd()*20}%,${28+rnd()*12}%)`;
      ctx.fillRect(-w/2, groundY-h, w, h);
      // Brick pattern
      const brickH = 8, brickW = 16;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let br = 0; br < h/brickH; br++) {
        const offset = (br % 2) * brickW/2;
        for (let bc = -Math.ceil(w/brickW); bc < Math.ceil(w/brickW)+1; bc++) {
          ctx.fillRect(-w/2 + bc*brickW + offset, groundY-h+br*brickH, brickW-1, brickH-1);
        }
      }
      // Windows (arched)
      const numW = Math.floor(w/20);
      const numF = Math.floor(h/24);
      for (let wf = 0; wf < numF; wf++) {
        for (let ww = 0; ww < numW; ww++) {
          const wwx = -w/2 + 6 + ww*(w/numW);
          const wwy = groundY - h + 8 + wf*(h/numF);
          ctx.fillStyle = rnd() > 0.4 ? 'rgba(255,240,180,0.6)' : 'rgba(80,100,140,0.5)';
          ctx.beginPath(); ctx.arc(wwx + 5, wwy+4, 5, Math.PI, 0); ctx.rect(wwx, wwy+4, 10, 8); ctx.fill();
        }
      }
      // Cornice
      ctx.fillStyle = `hsl(${20+rnd()*10},${40+rnd()*20}%,${32+rnd()*12}%)`;
      ctx.fillRect(-w/2-4, groundY-h, w+8, 10);
    } else if (style === 2) {
      // Modern flat office block
      ctx.fillStyle = `hsl(${200+rnd()*40},${20+rnd()*20}%,${25+rnd()*15}%)`;
      ctx.fillRect(-w/2, groundY-h, w, h);
      // Horizontal striping (floor bands)
      const floors = Math.floor(h/20);
      for (let fl = 0; fl < floors; fl++) {
        ctx.fillStyle = `rgba(255,255,255,${0.03+rnd()*0.04})`;
        ctx.fillRect(-w/2, groundY-h + fl*(h/floors), w, 3);
        // Full curtain wall windows
        ctx.fillStyle = `rgba(120,180,220,${0.2+rnd()*0.15})`;
        ctx.fillRect(-w/2+2, groundY-h + fl*(h/floors)+3, w-4, h/floors-6);
      }
    } else {
      // Narrow tower
      const tw = w * 0.4;
      const tH = h * 1.3;
      ctx.fillStyle = `hsl(${220+rnd()*30},${20+rnd()*15}%,${18+rnd()*12}%)`;
      ctx.fillRect(-tw/2, groundY-tH, tw, tH);
      // Pointed roof
      ctx.fillStyle = `hsl(${0+rnd()*30},${40+rnd()*20}%,${20+rnd()*10}%)`;
      ctx.beginPath(); ctx.moveTo(0, groundY-tH-40); ctx.lineTo(-tw/2-4, groundY-tH); ctx.lineTo(tw/2+4, groundY-tH); ctx.closePath(); ctx.fill();
      // Narrow window slits
      for (let fl = 0; fl < 6; fl++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,240,180,0.7)' : 'rgba(60,80,120,0.4)';
        ctx.fillRect(-4, groundY-tH + 14 + fl*(tH/7), 8, 12);
      }
    }
    // Shared: ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-w/2, groundY-3, w, 3);
    ctx.restore();
  },

  _drawForestBackground(ctx, rnd, groundY, mapId) {
    // 3-layer parallax forest backdrop
    const layers = [
      { dist: 3, alpha: 0.25, hOff: 40 },
      { dist: 2, alpha: 0.4,  hOff: 20 },
      { dist: 1, alpha: 0.6,  hOff: 0  },
    ];
    for (const layer of layers) {
      ctx.save();
      ctx.globalAlpha = layer.alpha;
      const treeDensity = 8;
      for (let tx = -100; tx < 400; tx += treeDensity + rnd()*12) {
        ctx.save();
        ctx.translate(tx, groundY - layer.hOff);
        const h2 = 30 + rnd() * 50;
        // Simple silhouette tree
        ctx.fillStyle = `hsl(${110+rnd()*30},${35+rnd()*20}%,${15+rnd()*10}%)`;
        ctx.beginPath();
        ctx.moveTo(0, -h2); ctx.lineTo(-h2*0.3, 0); ctx.lineTo(h2*0.3, 0); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -h2*1.2); ctx.lineTo(-h2*0.25, -h2*0.3); ctx.lineTo(h2*0.25, -h2*0.3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  },

  _drawSpaceBackground(ctx, rnd, groundY, t) {
    // Nebula patches
    for (let n = 0; n < 3; n++) {
      const nx = -100 + n * 200 + Math.sin(t*0.1+n) * 20;
      const ny = groundY - 200 - n * 50;
      const nr = 60 + n * 30;
      const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      const hue = 200 + n * 60;
      ng.addColorStop(0, `hsla(${hue},70%,50%,0.08)`);
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng;
      ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI*2); ctx.fill();
    }
    // Stars (many small dots)
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let s = 0; s < 30; s++) {
      const seed = s * 17.3;
      const sx = ((seed * 127.3) % 500) - 100;
      const sy = groundY - 20 - (seed * 73.1) % (Math.abs(groundY) + 100);
      const sr = 0.5 + Math.abs(Math.sin(t * 2 + s)) * 1;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI*2); ctx.fill();
    }
    // Distant planet
    const pG = ctx.createRadialGradient(300, groundY - 300, 10, 300, groundY - 300, 40);
    pG.addColorStop(0, 'rgba(200,160,100,0.25)');
    pG.addColorStop(0.7, 'rgba(150,100,60,0.15)');
    pG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = pG;
    ctx.beginPath(); ctx.arc(300, groundY - 300, 40, 0, Math.PI*2); ctx.fill();
  },

  _drawHillProfile(ctx, rnd, groundY, color) {
    // Smooth rolling hill silhouette
    ctx.save();
    ctx.fillStyle = color || 'rgba(40,70,30,0.25)';
    ctx.beginPath();
    ctx.moveTo(-100, groundY);
    let hx = -100;
    while (hx < 400) {
      const seg = 40 + rnd() * 60;
      const hh = 20 + rnd() * 50;
      ctx.bezierCurveTo(hx + seg/3, groundY - hh, hx + seg*2/3, groundY - hh, hx + seg, groundY);
      hx += seg;
    }
    ctx.lineTo(hx, groundY + 40);
    ctx.lineTo(-100, groundY + 40);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC ROAD MARKINGS
  // ═══════════════════════════════════════════════════════════════

  _drawRoadMarkings(ctx, startX, endX, surfaceY, mapId) {
    if (!['city','neon','asfalt'].includes(mapId)) return;
    ctx.save();
    ctx.strokeStyle = mapId === 'neon' ? 'rgba(0,255,200,0.4)' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(startX, surfaceY - 2);
    ctx.lineTo(endX, surfaceY - 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Edge lines
    ctx.strokeStyle = mapId === 'neon' ? 'rgba(255,0,255,0.3)' : 'rgba(255,220,0,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(startX, surfaceY - 8); ctx.lineTo(endX, surfaceY - 8); ctx.stroke();
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // MAP TRANSITION ZONES
  // ═══════════════════════════════════════════════════════════════

  _drawDistanceMilestone(ctx, distMeters, y) {
    const km = distMeters / 1000;
    ctx.save();
    // Post
    ctx.fillStyle = '#888';
    ctx.fillRect(-4, y - 60, 8, 60);
    // Sign board
    ctx.fillStyle = '#1a3a6a';
    ctx.beginPath(); ctx.roundRect(-32, y - 78, 64, 22, 4); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-32, y - 78, 64, 22, 4); ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${km.toFixed(1)} km`, 0, y - 67);
    ctx.restore();
  }

,

  // ═══════════════════════════════════════════════════════════════
  // DETAILED BACKGROUND DRAWING
  // ═══════════════════════════════════════════════════════════════

  _drawCitySkyline(ctx, rnd, W, H) {
    const buildingCount = Math.floor(rnd() * 11) + 15;
    const colors = ['#1a1a2e','#16213e','#0f3460','#1b2838','#243447','#1c2b3a','#2a2a4a'];
    ctx.save();
    let bx = 0;
    for (let i = 0; i < buildingCount; i++) {
      const bw = Math.floor(rnd() * 60) + 20;
      const bh = Math.floor(rnd() * (H * 0.5)) + H * 0.15;
      const by = H - bh;
      const col = colors[Math.floor(rnd() * colors.length)];
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, bw, bh);
      // windows
      const winCols = Math.floor(bw / 10);
      const winRows = Math.floor(bh / 12);
      for (let wc = 0; wc < winCols; wc++) {
        for (let wr = 0; wr < winRows; wr++) {
          const lit = rnd() > 0.45;
          if (!lit) continue;
          ctx.fillStyle = rnd() > 0.15 ? 'rgba(255,240,180,0.85)' : 'rgba(200,230,255,0.7)';
          ctx.fillRect(bx + wc * 10 + 2, by + wr * 12 + 3, 6, 7);
        }
      }
      // antenna
      if (rnd() > 0.5) {
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + bw / 2, by);
        ctx.lineTo(bx + bw / 2, by - 20 - rnd() * 30);
        ctx.stroke();
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(bx + bw / 2, by - 22 - rnd() * 28, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // rooftop billboard
      if (rnd() > 0.65 && bw >= 30) {
        const brdW = bw * 0.7;
        const brdH = 12;
        const brdX = bx + (bw - brdW) / 2;
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(brdX, by - brdH - 4, brdW, brdH);
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(7, Math.floor(brdH * 0.75))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ADS', brdX + brdW / 2, by - brdH / 2 - 4);
      }
      // helipad on tallest
      if (bh > H * 0.55) {
        ctx.fillStyle = '#223322';
        ctx.fillRect(bx + bw * 0.1, by - 8, bw * 0.8, 8);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx + bw * 0.1, by - 8, bw * 0.8, 8);
        ctx.fillStyle = '#00ff88';
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('H', bx + bw / 2, by - 2);
      }
      bx += bw + Math.floor(rnd() * 4);
    }
    ctx.restore();
  },

  _drawVolcanicBackground(ctx, rnd, W, H, t) {
    ctx.save();
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#1a0000');
    skyGrad.addColorStop(0.4, '#5c1000');
    skyGrad.addColorStop(0.7, '#cc3300');
    skyGrad.addColorStop(1, '#ff6600');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);
    // Ash clouds
    for (let i = 0; i < 6; i++) {
      const cx = (W * 0.1 * i + 30 + Math.sin(t * 0.2 + i) * 20) % (W + 80) - 40;
      const cy = H * 0.1 + i * H * 0.04 + Math.sin(t * 0.15 + i * 1.3) * 10;
      const rad = 60 + i * 20;
      const ash = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      ash.addColorStop(0, 'rgba(40,30,30,0.7)');
      ash.addColorStop(1, 'rgba(20,10,10,0)');
      ctx.fillStyle = ash;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rad, rad * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Volcano cone
    const vx = W * 0.65;
    const vy = H * 0.3;
    ctx.fillStyle = '#3a1a00';
    ctx.beginPath();
    ctx.moveTo(vx - 220, H);
    ctx.lineTo(vx, vy);
    ctx.lineTo(vx + 200, H);
    ctx.closePath();
    ctx.fill();
    // Dark rock texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 8; r++) {
      ctx.beginPath();
      ctx.moveTo(vx - 220 + r * 30, H);
      ctx.lineTo(vx - 10 + r * 5, vy + 20 + r * 5);
      ctx.stroke();
    }
    // Lava flow streams
    for (let s = 0; s < 4; s++) {
      const phase = t * 0.8 + s * 1.2;
      const lx = vx - 40 + s * 25;
      ctx.strokeStyle = `rgba(255,${100 + Math.floor(Math.sin(phase) * 50)},0,0.9)`;
      ctx.lineWidth = 6 + s * 2;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(lx + Math.sin(phase) * 8, vy + 10);
      for (let step = 0; step < 8; step++) {
        const sy = vy + 10 + step * (H - vy - 10) / 8;
        const sx = lx + Math.sin(phase + step * 0.5) * (12 + step * 3);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // Lava glow at base of volcano
    const lavaGlow = ctx.createLinearGradient(vx - 100, H - 30, vx + 100, H);
    lavaGlow.addColorStop(0, 'rgba(255,80,0,0.0)');
    lavaGlow.addColorStop(0.5, 'rgba(255,160,0,0.6)');
    lavaGlow.addColorStop(1, 'rgba(255,80,0,0.0)');
    ctx.fillStyle = lavaGlow;
    ctx.fillRect(vx - 120, H - 40, 240, 40);
    ctx.restore();
  },

  _drawUnderwaterBackground(ctx, W, H, t) {
    ctx.save();
    // Deep water gradient
    const waterGrad = ctx.createLinearGradient(0, 0, 0, H);
    waterGrad.addColorStop(0, '#001a33');
    waterGrad.addColorStop(0.5, '#003366');
    waterGrad.addColorStop(1, '#001122');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, W, H);
    // Caustic light patterns
    ctx.globalAlpha = 0.12;
    for (let c = 0; c < 18; c++) {
      const cx = (c * (W / 9) + Math.sin(t * 0.7 + c * 0.8) * 30) % W;
      const cy = H * 0.1 + Math.cos(t * 0.5 + c * 1.1) * H * 0.25 + c * H * 0.04;
      const cr = 20 + Math.sin(t + c) * 8;
      ctx.strokeStyle = `hsl(${190 + c * 4},80%,70%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Coral formations at bottom
    const coralColors = ['#ff6680','#ff9944','#ff44aa','#44ffcc','#ff8844'];
    for (let co = 0; co < 12; co++) {
      const cx = co * (W / 11) + 20;
      const ch = 40 + (co % 3) * 20;
      ctx.strokeStyle = coralColors[co % coralColors.length];
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      // Main branch
      ctx.beginPath();
      ctx.moveTo(cx, H);
      ctx.lineTo(cx, H - ch);
      ctx.stroke();
      // Side branches
      for (let br = 1; br <= 3; br++) {
        const by2 = H - ch * (br / 4);
        ctx.beginPath();
        ctx.moveTo(cx, by2);
        ctx.lineTo(cx - 10 - br * 4, by2 - 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, by2);
        ctx.lineTo(cx + 10 + br * 4, by2 - 15);
        ctx.stroke();
      }
    }
    // Fish silhouettes
    for (let f = 0; f < 7; f++) {
      const fx = (f * (W / 6) + t * 20 * (f % 2 === 0 ? 1 : -1) + W) % W;
      const fy = H * 0.25 + f * H * 0.06;
      const fs2 = 8 + (f % 3) * 4;
      ctx.fillStyle = `rgba(0,100,180,0.5)`;
      ctx.beginPath();
      ctx.ellipse(fx, fy, fs2, fs2 * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.beginPath();
      const tailDir = f % 2 === 0 ? 1 : -1;
      ctx.moveTo(fx - tailDir * fs2, fy);
      ctx.lineTo(fx - tailDir * (fs2 + 6), fy - fs2 * 0.4);
      ctx.lineTo(fx - tailDir * (fs2 + 6), fy + fs2 * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    // Rising bubbles
    for (let b = 0; b < 15; b++) {
      const bx = (b * 47 + 20) % W;
      const by2 = ((H - b * 30 - t * 25) % H + H) % H;
      const br = 2 + (b % 4);
      ctx.strokeStyle = 'rgba(180,220,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by2, br, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Kelp
    for (let k = 0; k < 8; k++) {
      const kx = k * (W / 7) + 30;
      ctx.strokeStyle = 'rgba(0,160,80,0.6)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(kx, H);
      for (let seg = 1; seg <= 6; seg++) {
        const ky = H - seg * 18;
        ctx.quadraticCurveTo(kx + Math.sin(t + k + seg * 0.5) * 10, ky + 9, kx + Math.sin(t * 1.3 + k + seg) * 8, ky);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawMarsBackground(ctx, W, H, t) {
    ctx.save();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a0800');
    sky.addColorStop(0.4, '#8b2500');
    sky.addColorStop(0.75, '#cc4400');
    sky.addColorStop(1, '#e05a00');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Olympus Mons silhouette far right
    ctx.fillStyle = '#5a1a00';
    ctx.beginPath();
    ctx.moveTo(W * 0.55, H * 0.5);
    ctx.bezierCurveTo(W * 0.65, H * 0.3, W * 0.75, H * 0.25, W * 0.85, H * 0.35);
    ctx.lineTo(W, H);
    ctx.lineTo(W * 0.55, H);
    ctx.closePath();
    ctx.fill();
    // Rocky mesa formations
    const mesaColors = ['#6b2200','#7a2800','#5a1500'];
    for (let m = 0; m < 5; m++) {
      ctx.fillStyle = mesaColors[m % mesaColors.length];
      const mx = m * W * 0.22 + 10;
      const mh = H * 0.12 + m * H * 0.03;
      const mw = 80 + m * 20;
      ctx.beginPath();
      ctx.moveTo(mx, H);
      ctx.lineTo(mx + 15, H - mh);
      ctx.lineTo(mx + mw - 15, H - mh);
      ctx.lineTo(mx + mw, H);
      ctx.closePath();
      ctx.fill();
    }
    // Dust devils
    for (let d = 0; d < 3; d++) {
      const dx = W * 0.2 + d * W * 0.3 + Math.sin(t * 0.4 + d) * 20;
      const dbot = H * 0.78;
      const dtop = H * 0.3 + d * H * 0.06;
      const dw = 6 + d * 3;
      ctx.strokeStyle = 'rgba(200,140,80,0.35)';
      ctx.lineWidth = dw;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(dx, dbot);
      ctx.quadraticCurveTo(dx + Math.sin(t + d) * 15, (dbot + dtop) / 2, dx + Math.sin(t * 0.7 + d) * 8, dtop);
      ctx.stroke();
    }
    // Surface rocks
    for (let r = 0; r < 20; r++) {
      const rx = (r * 83 + 20) % W;
      const ry = H * 0.8 + (r % 4) * 6;
      const rr = 3 + (r % 5) * 2;
      ctx.fillStyle = '#8b3a00';
      ctx.beginPath();
      ctx.ellipse(rx, ry, rr, rr * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _drawNeonCityBackground(ctx, rnd, W, H, t) {
    ctx.save();
    // Dark sky
    ctx.fillStyle = '#030010';
    ctx.fillRect(0, 0, W, H);
    // Cyberpunk buildings
    const neonColors = ['#ff00ff','#00ffff','#ff4400','#00ff88','#ff0088','#4400ff'];
    for (let i = 0; i < 20; i++) {
      const bx = i * (W / 19) - 10;
      const bh = H * 0.2 + rnd() * H * 0.55;
      const bw = 25 + rnd() * 50;
      const by2 = H - bh;
      // Building body
      ctx.fillStyle = `hsl(${220 + rnd() * 40},30%,8%)`;
      ctx.fillRect(bx, by2, bw, bh);
      // Neon outline
      const nc = neonColors[Math.floor(rnd() * neonColors.length)];
      ctx.strokeStyle = nc;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = nc;
      ctx.shadowBlur = 8;
      ctx.strokeRect(bx, by2, bw, bh);
      ctx.shadowBlur = 0;
      // Windows (small, cyan/purple)
      for (let wr = 0; wr < Math.floor(bh / 14); wr++) {
        for (let wc2 = 0; wc2 < Math.floor(bw / 10); wc2++) {
          if (rnd() > 0.5) continue;
          ctx.fillStyle = rnd() > 0.5 ? 'rgba(0,255,255,0.6)' : 'rgba(255,0,255,0.5)';
          ctx.fillRect(bx + wc2 * 10 + 2, by2 + wr * 14 + 3, 6, 8);
        }
      }
      // Neon sign on some buildings
      if (rnd() > 0.6 && bw > 35) {
        const sc = neonColors[Math.floor(rnd() * neonColors.length)];
        ctx.shadowColor = sc;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = sc;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 4, by2 + 8, bw - 8, 14);
        ctx.shadowBlur = 0;
      }
    }
    // Hologram projections
    for (let h2 = 0; h2 < 4; h2++) {
      const hx = W * 0.15 + h2 * W * 0.22;
      const hy = H * 0.35 + h2 * 20;
      const hAlpha = 0.08 + Math.sin(t * 2 + h2) * 0.04;
      ctx.globalAlpha = hAlpha;
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(hx - 20, hy - 30, 40, 60);
      ctx.globalAlpha = 1;
    }
    // Rain overlay
    ctx.strokeStyle = 'rgba(100,180,255,0.2)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 60; r++) {
      const rx = (r * 37 + t * 80) % (W + 100) - 50;
      const ry = (r * 53 + t * 200) % H;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 12);
      ctx.stroke();
    }
    // Moving vehicle lights at street level
    for (let v = 0; v < 5; v++) {
      const vx2 = ((v * 200 + t * 60 * (v % 2 === 0 ? 1 : -1)) % (W + 40) + W + 40) % (W + 40) - 20;
      const vy2 = H * 0.88 + (v % 3) * 6;
      ctx.fillStyle = v % 2 === 0 ? 'rgba(255,240,200,0.8)' : 'rgba(255,50,50,0.8)';
      ctx.beginPath();
      ctx.arc(vx2, vy2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _drawSpaceBackground(ctx, W, H, t) {
    ctx.save();
    ctx.fillStyle = '#000005';
    ctx.fillRect(0, 0, W, H);
    // Star layers (parallax)
    const starLayers = [
      { count: 120, size: 1, speed: 0.1, alpha: 0.6 },
      { count: 60,  size: 1.5, speed: 0.25, alpha: 0.8 },
      { count: 25,  size: 2.5, speed: 0.5, alpha: 1.0 }
    ];
    for (let li = 0; li < starLayers.length; li++) {
      const layer = starLayers[li];
      ctx.globalAlpha = layer.alpha;
      for (let s = 0; s < layer.count; s++) {
        const sx = ((s * 137.5 * (li + 1)) % W + W) % W;
        const sy = ((s * 97.3 * (li + 1)) % H + H) % H;
        const twinkle = 0.7 + Math.sin(t * 1.5 + s * 0.4) * 0.3;
        ctx.globalAlpha = layer.alpha * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, layer.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // Nebula clouds
    const nebulaColors = [
      [120,0,200],[0,80,200],[200,0,120],[80,0,160]
    ];
    for (let n = 0; n < 3; n++) {
      const nx = W * 0.15 + n * W * 0.33;
      const ny = H * 0.2 + n * H * 0.12;
      const nr = 80 + n * 40;
      const nc2 = nebulaColors[n % nebulaColors.length];
      const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      nebGrad.addColorStop(0, `rgba(${nc2[0]},${nc2[1]},${nc2[2]},0.25)`);
      nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nebGrad;
      ctx.beginPath();
      ctx.ellipse(nx, ny, nr, nr * 0.55, n * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Planet
    const pGrad = ctx.createRadialGradient(W * 0.12, H * 0.15, 5, W * 0.12, H * 0.15, 40);
    pGrad.addColorStop(0, '#88aaff');
    pGrad.addColorStop(0.6, '#4466cc');
    pGrad.addColorStop(1, '#112244');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(W * 0.12, H * 0.15, 40, 0, Math.PI * 2);
    ctx.fill();
    // Planet ring
    ctx.strokeStyle = 'rgba(180,200,255,0.4)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(W * 0.12, H * 0.15 + 10, 65, 12, -0.2, 0, Math.PI * 2);
    ctx.stroke();
    // Asteroid belt
    for (let a = 0; a < 18; a++) {
      const ax = W * 0.3 + a * W * 0.04;
      const ay = H * 0.55 + Math.sin(a * 1.3) * H * 0.06;
      const ar = 2 + (a % 4);
      ctx.fillStyle = '#666688';
      ctx.beginPath();
      ctx.ellipse(ax, ay, ar, ar * 0.6, a * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  _drawArcticBackground(ctx, rnd, W, H, t) {
    ctx.save();
    // Dark navy sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#020818');
    skyGrad.addColorStop(0.6, '#0a1530');
    skyGrad.addColorStop(1, '#1a3050');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);
    // Aurora borealis bands
    const auroraColors = ['rgba(0,255,120,0.18)','rgba(0,200,255,0.14)','rgba(180,0,255,0.12)'];
    for (let a = 0; a < 3; a++) {
      ctx.fillStyle = auroraColors[a];
      ctx.beginPath();
      ctx.moveTo(0, H * 0.15 + a * H * 0.08);
      for (let x = 0; x <= W; x += 30) {
        const y2 = H * 0.15 + a * H * 0.08 + Math.sin(t * 0.6 + x / 80 + a * 2) * 22;
        ctx.lineTo(x, y2);
      }
      for (let x = W; x >= 0; x -= 30) {
        const y2 = H * 0.15 + a * H * 0.08 + 28 + Math.sin(t * 0.5 + x / 60 + a) * 15;
        ctx.lineTo(x, y2);
      }
      ctx.closePath();
      ctx.fill();
    }
    // Icebergs on horizon
    const iceColors = ['#cce8ff','#aad4f5','#e8f4ff'];
    for (let b = 0; b < 7; b++) {
      ctx.fillStyle = iceColors[b % iceColors.length];
      const bx2 = b * W * 0.16 + 10;
      const bh2 = 30 + rnd() * 50;
      ctx.beginPath();
      ctx.moveTo(bx2, H * 0.72);
      ctx.lineTo(bx2 + 10, H * 0.72 - bh2);
      ctx.lineTo(bx2 + 25, H * 0.72 - bh2 * 0.3);
      ctx.lineTo(bx2 + 40, H * 0.72 - bh2 * 0.8);
      ctx.lineTo(bx2 + 55, H * 0.72);
      ctx.closePath();
      ctx.fill();
    }
    // Snowfall
    ctx.fillStyle = 'rgba(220,235,255,0.75)';
    for (let s = 0; s < 60; s++) {
      const sx = ((s * 71 + t * 15 * (s % 2 === 0 ? 1 : -0.5)) % W + W) % W;
      const sy = ((s * 53 + t * 40) % H + H) % H;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (s % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Polar bear silhouette
    ctx.fillStyle = 'rgba(220,230,240,0.4)';
    const bx3 = W * 0.08;
    const bby = H * 0.76;
    ctx.beginPath();
    ctx.ellipse(bx3, bby, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx3 + 24, bby - 6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _drawDesertBackground(ctx, rnd, W, H, t) {
    ctx.save();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#d4660a');
    sky.addColorStop(0.4, '#f5a030');
    sky.addColorStop(0.75, '#ffe070');
    sky.addColorStop(1, '#ffcc50');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Sun
    ctx.fillStyle = '#fff8d0';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.12, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Dune silhouettes
    for (let d = 0; d < 5; d++) {
      const alpha = 0.4 + d * 0.12;
      ctx.fillStyle = `rgba(210,160,60,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(-20, H);
      const dStart = d * W * 0.22;
      ctx.bezierCurveTo(dStart + W * 0.1, H * 0.72 - d * 5, dStart + W * 0.18, H * 0.65 - d * 8, dStart + W * 0.22, H * 0.68 - d * 6);
      ctx.bezierCurveTo(dStart + W * 0.28, H * 0.72, dStart + W * 0.35, H * 0.75, W + 20, H);
      ctx.closePath();
      ctx.fill();
    }
    // Heat shimmer near ground
    ctx.strokeStyle = 'rgba(255,230,150,0.18)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 8; s++) {
      ctx.beginPath();
      for (let x = 0; x < W; x += 6) {
        const y2 = H * 0.8 + s * 4 + Math.sin(t * 3 + x / 40 + s) * 3;
        s === 0 && x === 0 ? ctx.moveTo(x, y2) : ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }
    // Cacti
    for (let c = 0; c < 6; c++) {
      const cx = c * W * 0.18 + 40;
      const cy = H * 0.7;
      const ch = 25 + (c % 3) * 15;
      ctx.fillStyle = '#2d6a2d';
      ctx.fillRect(cx - 5, cy - ch, 10, ch);
      if (ch > 30) {
        ctx.fillRect(cx - 14, cy - ch * 0.6, 10, 8);
        ctx.fillRect(cx + 4, cy - ch * 0.45, 10, 8);
      }
    }
    // Camel silhouettes
    for (let c2 = 0; c2 < 2; c2++) {
      const cmx = W * 0.1 + c2 * W * 0.5;
      const cmy = H * 0.75;
      ctx.fillStyle = 'rgba(160,100,30,0.5)';
      ctx.beginPath();
      ctx.ellipse(cmx, cmy, 20, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hump
      ctx.beginPath();
      ctx.arc(cmx + 5, cmy - 14, 8, Math.PI, 0);
      ctx.fill();
      // Head/neck
      ctx.beginPath();
      ctx.moveTo(cmx + 20, cmy - 5);
      ctx.lineTo(cmx + 28, cmy - 18);
      ctx.lineTo(cmx + 33, cmy - 16);
      ctx.lineTo(cmx + 25, cmy - 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  _drawJungleBackground(ctx, rnd, W, H, t) {
    ctx.save();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a1a05');
    sky.addColorStop(0.5, '#1a3a0a');
    sky.addColorStop(1, '#0d2206');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Tree layers (back to front, lighter to darker green)
    const treeLayers = [
      { color: 'rgba(20,60,15,0.6)', count: 10, heightFactor: 0.55, yFactor: 0.3 },
      { color: 'rgba(15,80,15,0.7)', count: 12, heightFactor: 0.45, yFactor: 0.42 },
      { color: 'rgba(10,100,20,0.85)', count: 14, heightFactor: 0.35, yFactor: 0.55 }
    ];
    for (const layer of treeLayers) {
      ctx.fillStyle = layer.color;
      for (let i = 0; i < layer.count; i++) {
        const tx = i * (W / (layer.count - 1));
        const th = H * layer.heightFactor + rnd() * H * 0.1;
        const ty = H * layer.yFactor;
        const tw = 50 + rnd() * 40;
        ctx.beginPath();
        ctx.moveTo(tx - tw * 0.5, ty + th * 0.4);
        ctx.bezierCurveTo(tx - tw * 0.6, ty, tx - tw * 0.3, ty - th * 0.3, tx, ty - th * 0.5);
        ctx.bezierCurveTo(tx + tw * 0.3, ty - th * 0.3, tx + tw * 0.6, ty, tx + tw * 0.5, ty + th * 0.4);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Hanging vines
    ctx.strokeStyle = 'rgba(30,120,30,0.5)';
    ctx.lineWidth = 2;
    for (let v = 0; v < 10; v++) {
      const vx2 = v * W * 0.11 + 20;
      const vlen = 60 + rnd() * 80;
      ctx.beginPath();
      ctx.moveTo(vx2, 0);
      for (let seg = 1; seg <= 6; seg++) {
        const vy2 = seg * vlen / 6;
        ctx.quadraticCurveTo(vx2 + Math.sin(t * 0.4 + v + seg) * 8, vy2 - 5, vx2 + Math.sin(t * 0.3 + v + seg * 0.7) * 10, vy2);
      }
      ctx.stroke();
    }
    // Animal silhouette (monkey)
    const mx = W * 0.7 + Math.sin(t * 0.3) * 10;
    const my = H * 0.28;
    ctx.fillStyle = 'rgba(30,15,5,0.5)';
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mx, my + 14, 7, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ground mist
    const mist = ctx.createLinearGradient(0, H * 0.7, 0, H);
    mist.addColorStop(0, 'rgba(255,255,255,0)');
    mist.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    ctx.restore();
  },

  _drawFactoryBackground(ctx, rnd, W, H, t) {
    ctx.save();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1510');
    sky.addColorStop(0.5, '#3a2a1a');
    sky.addColorStop(1, '#4a3a20');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    // Factory building silhouettes
    for (let i = 0; i < 6; i++) {
      const fx = i * W * 0.18;
      const fh = H * 0.25 + rnd() * H * 0.25;
      const fw = 80 + rnd() * 60;
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(fx, H - fh, fw, fh);
      // Windows (orange/dim)
      for (let wr = 0; wr < Math.floor(fh / 18); wr++) {
        for (let wc2 = 0; wc2 < Math.floor(fw / 14); wc2++) {
          if (rnd() > 0.6) continue;
          ctx.fillStyle = 'rgba(255,160,50,0.4)';
          ctx.fillRect(fx + wc2 * 14 + 3, H - fh + wr * 18 + 4, 8, 10);
        }
      }
    }
    // Smokestacks
    for (let s = 0; s < 5; s++) {
      const sx = s * W * 0.2 + 60;
      const sh = H * 0.2 + rnd() * H * 0.15;
      const sw = 14 + (s % 2) * 6;
      ctx.fillStyle = '#2a1f10';
      ctx.fillRect(sx - sw / 2, H - sh - 20, sw, sh + 20);
      // Smoke puffs
      for (let p = 0; p < 5; p++) {
        const phase = t * 0.5 + s * 1.1 + p * 0.8;
        const py = H - sh - 20 - p * 20 - (phase % 1) * 20;
        const pr = 10 + p * 4 + Math.sin(phase) * 4;
        const alpha = Math.max(0, 0.5 - p * 0.09 - (phase % 1) * 0.05);
        ctx.fillStyle = `rgba(80,70,60,${alpha})`;
        ctx.beginPath();
        ctx.arc(sx + Math.sin(phase * 0.7) * 6, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Warning lights blinking
    for (let w = 0; w < 4; w++) {
      const wx = w * W * 0.25 + 30;
      const wy = H * 0.55 - w * 10;
      const lit = Math.sin(t * 3 + w * 2) > 0;
      ctx.fillStyle = lit ? 'rgba(255,50,0,0.9)' : 'rgba(80,20,0,0.6)';
      ctx.shadowColor = lit ? '#ff3300' : 'transparent';
      ctx.shadowBlur = lit ? 10 : 0;
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Crane outline
    const crx = W * 0.75;
    ctx.strokeStyle = '#2a2520';
    ctx.lineWidth = 5;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(crx, H);
    ctx.lineTo(crx, H * 0.25);
    ctx.lineTo(crx + 80, H * 0.25);
    ctx.moveTo(crx, H * 0.28);
    ctx.lineTo(crx - 30, H * 0.28);
    ctx.stroke();
    // Hanging cable
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(crx + 60, H * 0.25);
    ctx.lineTo(crx + 60 + Math.sin(t * 0.8) * 8, H * 0.5);
    ctx.stroke();
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // FOREGROUND PROPS
  // ═══════════════════════════════════════════════════════════════

  _drawForegroundProps(ctx, rnd, x, groundY, mapId) {
    ctx.save();
    ctx.translate(x, groundY);
    if (mapId === 'city' || mapId === 'neon') {
      // Fire hydrant
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(-8, -20, 16, 20);
      ctx.fillRect(-12, -24, 24, 6);
      ctx.fillStyle = '#aa1100';
      ctx.fillRect(-5, -18, 10, 14);
      // Manhole cover
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(30, -2, 16, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, -2); ctx.lineTo(46, -2);
      ctx.moveTo(30, -8); ctx.lineTo(30, 4);
      ctx.stroke();
      // Lamp post
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(-50, -55);
      ctx.quadraticCurveTo(-50, -70, -38, -72);
      ctx.stroke();
      ctx.fillStyle = '#ffe880';
      ctx.beginPath();
      ctx.ellipse(-36, -72, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mapId === 'desert') {
      // Skull
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath();
      ctx.arc(0, -12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a2010';
      ctx.fillRect(-4, -9, 3, 4);
      ctx.fillRect(1, -9, 3, 4);
      // Tumbleweed
      ctx.strokeStyle = '#8a6a30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(30, -8, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, -8); ctx.lineTo(40, -8);
      ctx.moveTo(30, -18); ctx.lineTo(30, 2);
      ctx.stroke();
    } else if (mapId === 'arctic' || mapId === 'winter') {
      // Ice crystal
      ctx.strokeStyle = '#aaddff';
      ctx.lineWidth = 2;
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(Math.cos(ang) * 18, -15 + Math.sin(ang) * 18);
        ctx.stroke();
      }
      // Snowdrift
      ctx.fillStyle = 'rgba(220,235,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(35, -4, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mapId === 'mars') {
      // Alien rock
      ctx.fillStyle = '#7a3a10';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.bezierCurveTo(-15, -18, -5, -28, 0, -26);
      ctx.bezierCurveTo(5, -28, 14, -16, 12, 0);
      ctx.closePath();
      ctx.fill();
      // Sample marker
      ctx.strokeStyle = '#dddd00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(25, 0); ctx.lineTo(25, -20);
      ctx.moveTo(20, -18); ctx.lineTo(30, -18);
      ctx.stroke();
      ctx.fillStyle = '#dddd00';
      ctx.font = '6px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('A1', 25, -20);
    }
    ctx.restore();
  },

  _drawSignPost(ctx, x, y, texts) {
    ctx.save();
    ctx.translate(x, y);
    // Wooden post
    ctx.fillStyle = '#7a5a30';
    ctx.fillRect(-4, -texts.length * 28 - 10, 8, texts.length * 28 + 10);
    // Sign boards
    for (let i = 0; i < texts.length; i++) {
      const sy = -texts.length * 28 + i * 30;
      const angle = (i % 2 === 0 ? 0.08 : -0.06) * (i + 1);
      ctx.save();
      ctx.rotate(angle);
      // Arrow shape
      ctx.fillStyle = '#c8a060';
      ctx.beginPath();
      ctx.moveTo(-35, sy - 10);
      ctx.lineTo(-35, sy + 10);
      ctx.lineTo(25, sy + 10);
      ctx.lineTo(35, sy);
      ctx.lineTo(25, sy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6a4010';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#2a1a00';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(texts[i], -5, sy);
      ctx.restore();
    }
    ctx.restore();
  },

  _drawBarrier(ctx, x, y, type) {
    ctx.save();
    ctx.translate(x, y);
    if (type === 'concrete') {
      const grad = ctx.createLinearGradient(-25, -30, 25, 0);
      grad.addColorStop(0, '#b0b0b0');
      grad.addColorStop(0.5, '#d8d8d8');
      grad.addColorStop(1, '#909090');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-25, 0);
      ctx.lineTo(-20, -30);
      ctx.lineTo(20, -30);
      ctx.lineTo(25, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Reflective stripe
      ctx.fillStyle = 'rgba(255,200,0,0.7)';
      ctx.fillRect(-20, -18, 40, 6);
    } else if (type === 'steel') {
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(-30, -5, 60, 10);
      ctx.fillRect(-4, -25, 8, 50);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.strokeRect(-30, -5, 60, 10);
      ctx.strokeRect(-4, -25, 8, 50);
      // Bolts
      for (let b = -20; b <= 20; b += 20) {
        ctx.fillStyle = '#777';
        ctx.beginPath();
        ctx.arc(b, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'tire') {
      for (let ti = 0; ti < 3; ti++) {
        const ty2 = -ti * 22;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(0, ty2, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, ty2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, ty2, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  _drawRamp(ctx, x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    const w = size * 60;
    const h = size * 25;
    ctx.fillStyle = '#8a7055';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, -h);
    ctx.closePath();
    ctx.fill();
    // Skid marks
    ctx.strokeStyle = 'rgba(30,20,10,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    for (let sk = 0; sk < 3; sk++) {
      const skY = -sk * 6;
      ctx.save();
      ctx.rotate(-Math.atan2(h, w));
      ctx.beginPath();
      ctx.moveTo(0, skY);
      ctx.lineTo(Math.sqrt(w * w + h * h), skY);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, -h);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  },

  _drawBridge(ctx, x1, y1, x2, y2) {
    ctx.save();
    const midX = (x1 + x2) / 2;
    const deckY = Math.min(y1, y2);
    const span = x2 - x1;
    // Road deck
    const deckGrad = ctx.createLinearGradient(x1, deckY - 10, x1, deckY + 15);
    deckGrad.addColorStop(0, '#9a9a9a');
    deckGrad.addColorStop(1, '#6a6a6a');
    ctx.fillStyle = deckGrad;
    ctx.fillRect(x1, deckY - 10, span, 20);
    // Towers
    for (const tx of [x1 + span * 0.2, x1 + span * 0.8]) {
      ctx.fillStyle = '#7a7a8a';
      ctx.fillRect(tx - 8, deckY - 60, 16, 50);
      ctx.fillRect(tx - 14, deckY - 65, 28, 10);
    }
    // Main suspension cables
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1 + span * 0.2, deckY - 60);
    ctx.quadraticCurveTo(midX, deckY + 30, x1 + span * 0.8, deckY - 60);
    ctx.stroke();
    // Hanger cables
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1.5;
    for (let h = 0; h <= 10; h++) {
      const hx = x1 + span * 0.2 + h * span * 0.06;
      const t2 = h / 10;
      const cableY = deckY - 60 + (deckY + 30 - (deckY - 60)) * (4 * t2 * (1 - t2));
      ctx.beginPath();
      ctx.moveTo(hx, cableY);
      ctx.lineTo(hx, deckY);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawTunnel(ctx, x, y, W2, H2) {
    ctx.save();
    ctx.translate(x, y);
    const tw = W2 || 120;
    const th = H2 || 80;
    // Stone surround
    const stoneGrad = ctx.createLinearGradient(-tw / 2 - 20, -th, tw / 2 + 20, 0);
    stoneGrad.addColorStop(0, '#7a7060');
    stoneGrad.addColorStop(0.5, '#9a9080');
    stoneGrad.addColorStop(1, '#7a7060');
    ctx.fillStyle = stoneGrad;
    ctx.beginPath();
    ctx.moveTo(-tw / 2 - 20, 0);
    ctx.lineTo(-tw / 2 - 20, -th - 20);
    ctx.lineTo(tw / 2 + 20, -th - 20);
    ctx.lineTo(tw / 2 + 20, 0);
    ctx.lineTo(tw / 2, 0);
    ctx.arc(0, -th * 0.5, tw / 2, 0, Math.PI, true);
    ctx.lineTo(-tw / 2 - 20, 0);
    ctx.closePath();
    ctx.fill();
    // Dark interior
    const interior = ctx.createRadialGradient(0, -th * 0.35, 0, 0, -th * 0.35, tw * 0.6);
    interior.addColorStop(0, 'rgba(10,10,10,0.95)');
    interior.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = interior;
    ctx.beginPath();
    ctx.arc(0, -th * 0.5, tw / 2, Math.PI, 0, true);
    ctx.lineTo(tw / 2, 0);
    ctx.lineTo(-tw / 2, 0);
    ctx.closePath();
    ctx.fill();
    // Brick pattern on arch face
    ctx.strokeStyle = 'rgba(50,40,30,0.5)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 6; row++) {
      const ry = -row * 15;
      ctx.beginPath();
      ctx.moveTo(-tw / 2 - 20, ry);
      ctx.lineTo(tw / 2 + 20, ry);
      ctx.stroke();
    }
    // Warning sign
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(-tw / 2 - 12, -th - 30);
    ctx.lineTo(-tw / 2 - 2, -th - 50);
    ctx.lineTo(-tw / 2 - 22, -th - 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('!', -tw / 2 - 12, -th - 36);
    ctx.restore();
  },

  _drawCheckpointGate(ctx, x, y, distance) {
    ctx.save();
    ctx.translate(x, y);
    const lit = Math.floor(Date.now() / 400) % 2 === 0;
    // Posts
    ctx.fillStyle = '#888';
    ctx.fillRect(-80, -90, 12, 90);
    ctx.fillRect(68, -90, 12, 90);
    // Horizontal bar - checkered
    const barW = 148;
    const barH = 14;
    ctx.fillStyle = lit ? '#ff0000' : '#cc0000';
    ctx.fillRect(-74, -92, barW, barH);
    for (let i = 0; i < 10; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = lit ? '#ffffff' : '#dddddd';
        ctx.fillRect(-74 + i * 14.8, -92, 14.8, barH);
      }
    }
    // Distance display
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-35, -78, 70, 22);
    ctx.strokeStyle = lit ? '#00ff00' : '#008800';
    ctx.lineWidth = 2;
    ctx.strokeRect(-35, -78, 70, 22);
    ctx.fillStyle = lit ? '#00ff00' : '#00aa00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const km = (distance / 1000).toFixed(2);
    ctx.fillText(`${km} km`, 0, -67);
    // Flashing lights on top of posts
    ctx.fillStyle = lit ? '#ff4400' : '#441100';
    ctx.shadowColor = lit ? '#ff2200' : 'transparent';
    ctx.shadowBlur = lit ? 12 : 0;
    ctx.beginPath();
    ctx.arc(-74, -96, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(74, -96, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  _drawFinishLine(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    // Checkered road strip
    const stripW = 200;
    const stripH = 20;
    for (let col = 0; col < 20; col++) {
      for (let row = 0; row < 2; row++) {
        ctx.fillStyle = (col + row) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(-stripW / 2 + col * 10, -stripH + row * 10, 10, 10);
      }
    }
    // Flag poles
    ctx.fillStyle = '#888';
    ctx.fillRect(-stripW / 2 - 10, -80, 6, 80);
    ctx.fillRect(stripW / 2 + 4, -80, 6, 80);
    // Waving checkered flags
    for (const side of [-1, 1]) {
      const px = side * (stripW / 2 + (side < 0 ? 7 : 7));
      ctx.save();
      ctx.translate(px, -78);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const t2 = Date.now() / 400;
      ctx.bezierCurveTo(10, -5 + Math.sin(t2) * 4, 20, -8 + Math.sin(t2 + 1) * 4, 28, -6 + Math.sin(t2 + 2) * 4);
      ctx.lineTo(28, -26 + Math.sin(t2 + 2) * 4);
      ctx.bezierCurveTo(20, -28 + Math.sin(t2 + 1) * 4, 10, -25 + Math.sin(t2) * 4, 0, -20);
      ctx.closePath();
      ctx.fill();
      // Checkered pattern on flag
      ctx.fillStyle = '#000';
      for (let fc = 0; fc < 3; fc++) {
        for (let fr = 0; fr < 2; fr++) {
          if ((fc + fr) % 2 === 0) {
            ctx.fillRect(fc * 9 + 1, -19 + fr * 10, 8, 9);
          }
        }
      }
      ctx.restore();
    }
    // FINISH text
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeText('FINISH', 0, -30);
    ctx.fillText('FINISH', 0, -30);
    ctx.restore();
  },

  // ═══════════════════════════════════════════════════════════════
  // TERRAIN GENERATION
  // ═══════════════════════════════════════════════════════════════

  generateAdvancedTerrain(mapId, seed, length) {
    const seededRnd = (() => {
      let s = seed || 12345;
      return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
    })();
    const biome = this.TERRAIN_BIOMES[mapId] || this.TERRAIN_BIOMES.plains;
    const points = [];
    const step = 20;
    const pointCount = Math.ceil(length / step);
    const baseH = biome.baseHeight || 0.6;
    const variance = biome.heightVariance || 0.15;
    for (let i = 0; i < pointCount; i++) {
      const nx = i * step;
      let h = baseH;
      h += Math.sin(i * 0.05) * variance * 0.5;
      h += Math.sin(i * 0.02 + 3.1) * variance * 0.3;
      h += Math.sin(i * 0.15 + 1.4) * variance * 0.15;
      h += (seededRnd() - 0.5) * variance * 0.2;
      h = Math.max(0.1, Math.min(0.92, h));
      points.push({ x: nx, y: h });
    }
    return { points, biome: biome.name, mapId, seed, length, step };
  },

  TERRAIN_BIOMES: {
    plains:    { name:'plains',    heightVariance:0.08, baseHeight:0.65, features:['grass','flowers'], transitionTo:['forest','hills'],  groundColor:'#4a8a2a', skyColor:'#87ceeb' },
    mountains: { name:'mountains', heightVariance:0.40, baseHeight:0.45, features:['rocks','snow'],    transitionTo:['plains','arctic'],  groundColor:'#8a8080', skyColor:'#b0c8e0' },
    desert:    { name:'desert',    heightVariance:0.12, baseHeight:0.70, features:['dunes','cactus'],  transitionTo:['canyon','wasteland'],groundColor:'#d4aa60', skyColor:'#f5c040' },
    arctic:    { name:'arctic',    heightVariance:0.18, baseHeight:0.62, features:['ice','snow'],      transitionTo:['tundra','mountains'],groundColor:'#c8e0f0', skyColor:'#b0d0ff' },
    jungle:    { name:'jungle',    heightVariance:0.20, baseHeight:0.60, features:['vines','trees'],   transitionTo:['swamp','plains'],   groundColor:'#2a6a1a', skyColor:'#3a8a3a' },
    mars:      { name:'mars',      heightVariance:0.25, baseHeight:0.58, features:['rocks','craters'], transitionTo:['wasteland'],        groundColor:'#8a3a10', skyColor:'#c04010' },
    moon:      { name:'moon',      heightVariance:0.22, baseHeight:0.60, features:['craters','dust'],  transitionTo:[],                   groundColor:'#909090', skyColor:'#000005' },
    volcanic:  { name:'volcanic',  heightVariance:0.35, baseHeight:0.50, features:['lava','ash'],      transitionTo:['wasteland'],        groundColor:'#3a1a00', skyColor:'#4a1a00' },
    underwater:{ name:'underwater',heightVariance:0.15, baseHeight:0.68, features:['coral','sand'],    transitionTo:[],                   groundColor:'#1a4a6a', skyColor:'#002244' },
    city:      { name:'city',      heightVariance:0.04, baseHeight:0.72, features:['roads','signs'],   transitionTo:['neon','countryside'],groundColor:'#4a4a4a', skyColor:'#607080' },
    canyon:    { name:'canyon',    heightVariance:0.45, baseHeight:0.40, features:['cliffs','rocks'],  transitionTo:['desert','wasteland'],groundColor:'#8a4a20', skyColor:'#c07030' },
    wasteland: { name:'wasteland', heightVariance:0.18, baseHeight:0.62, features:['debris','rocks'],  transitionTo:['desert','canyon'],  groundColor:'#6a5a30', skyColor:'#8a7040' },
    beach:     { name:'beach',     heightVariance:0.06, baseHeight:0.73, features:['sand','shells'],   transitionTo:['jungle','plains'],  groundColor:'#d4c080', skyColor:'#60b0ff' },
    swamp:     { name:'swamp',     heightVariance:0.10, baseHeight:0.68, features:['mud','reeds'],     transitionTo:['jungle','plains'],  groundColor:'#3a5a1a', skyColor:'#607050' },
    tundra:    { name:'tundra',    heightVariance:0.10, baseHeight:0.66, features:['moss','rocks'],    transitionTo:['arctic','plains'],  groundColor:'#6a7a4a', skyColor:'#a0b0c0' }
  },

  _blendBiomes(biome1, biome2, t2) {
    const lerp = (a, b, t3) => a + (b - a) * t3;
    const lerpColor = (c1, c2, t3) => {
      const parse = c => {
        const hex = c.replace('#','');
        if (hex.length === 6) {
          return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
        }
        return [128,128,128];
      };
      const [r1,g1,b1] = parse(c1);
      const [r2,g2,b2] = parse(c2);
      const r = Math.round(lerp(r1,r2,t3));
      const g = Math.round(lerp(g1,g2,t3));
      const b = Math.round(lerp(b1,b2,t3));
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    };
    return {
      name: `${biome1.name}_${biome2.name}`,
      heightVariance: lerp(biome1.heightVariance, biome2.heightVariance, t2),
      baseHeight: lerp(biome1.baseHeight, biome2.baseHeight, t2),
      features: [...new Set([...(biome1.features||[]), ...(biome2.features||[])])],
      transitionTo: biome2.transitionTo || [],
      groundColor: lerpColor(biome1.groundColor || '#888888', biome2.groundColor || '#888888', t2),
      skyColor: lerpColor(biome1.skyColor || '#888888', biome2.skyColor || '#888888', t2)
    };
  },

  addTerrainFeature(type, x, params) {
    if (!this._features) this._features = [];
    const feature = { type, x, ...params, id: Date.now() + Math.random() };
    this._features.push(feature);
    return feature;
  },

  getTerrainNormal(x) {
    if (!this._terrainPoints || this._terrainPoints.length < 2) return { nx: 0, ny: -1 };
    let y0 = 0, y1 = 0;
    for (let i = 0; i < this._terrainPoints.length - 1; i++) {
      const p = this._terrainPoints[i];
      const pn = this._terrainPoints[i + 1];
      if (x >= p.x && x < pn.x) {
        const t2 = (x - p.x) / (pn.x - p.x);
        y0 = p.y + (pn.y - p.y) * Math.max(0, t2 - 0.01);
        y1 = p.y + (pn.y - p.y) * Math.min(1, t2 + 0.01);
        break;
      }
    }
    const dx = 2;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    return len > 0 ? { nx: -dy / len, ny: dx / len } : { nx: 0, ny: -1 };
  },

  getTerrainMaterial(x) {
    const materials = {
      asphalt: { friction: 0.8, bounce: 0.3, sound: 'road' },
      dirt:    { friction: 0.6, bounce: 0.4, sound: 'dirt' },
      ice:     { friction: 0.1, bounce: 0.2, sound: 'ice'  },
      sand:    { friction: 0.5, bounce: 0.3, sound: 'sand' },
      rock:    { friction: 0.7, bounce: 0.5, sound: 'rock' },
      lava:    { friction: 0.3, bounce: 0.1, sound: 'lava' },
      water:   { friction: 0.2, bounce: 0.05, sound: 'water' }
    };
    if (!this._materialMap) return materials.dirt;
    const zone = this._materialMap.find(m => x >= m.x1 && x < m.x2);
    return zone ? (materials[zone.material] || materials.dirt) : materials.dirt;
  },

  _generateCave(x, y, size) {
    const points = [];
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const jitter = 0.75 + Math.random() * 0.5;
      const rx = size * 1.6 * jitter * (1 + 0.3 * Math.sin(angle * 3));
      const ry = size * jitter * (1 + 0.2 * Math.cos(angle * 5));
      points.push({ x: x + Math.cos(angle) * rx, y: y + Math.sin(angle) * ry });
    }
    return points;
  },

  _generateRiver(x1, x2, mapId) {
    const points = [];
    const segments = 20;
    const baseY = 0;
    for (let i = 0; i <= segments; i++) {
      const t2 = i / segments;
      const rx = x1 + (x2 - x1) * t2;
      const ry = baseY + Math.sin(t2 * Math.PI * 3) * 30 + Math.sin(t2 * Math.PI * 7 + 1.2) * 15;
      const width = 20 + Math.sin(t2 * Math.PI * 4) * 8;
      points.push({ x: rx, y: ry, width });
    }
    const riverColors = { jungle: '#2266aa', desert: '#4488bb', mars: '#664422', default: '#3377cc' };
    return { points, color: riverColors[mapId] || riverColors.default };
  },

  _generateCrater(x, y, radius) {
    const rimPoints = [];
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const r2 = radius * (0.88 + Math.random() * 0.24);
      rimPoints.push({ x: x + Math.cos(angle) * r2, y: y + Math.sin(angle) * r2 });
    }
    const ejectaField = [];
    for (let e = 0; e < 18; e++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (1.1 + Math.random() * 0.9);
      const size2 = 2 + Math.random() * (radius * 0.15);
      ejectaField.push({ x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist, size: size2 });
    }
    return {
      outerRim: rimPoints,
      innerDepth: radius * 0.4,
      ejectaField,
      centralPeak: Math.random() > 0.5,
      x, y, radius
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC TERRAIN EFFECTS
  // ═══════════════════════════════════════════════════════════════

  updateTerrainEffects(dt, t2) {
    if (!this._effectState) {
      this._effectState = { initialized: true };
      this._lavaStreams = [];
      this._waterLevel = 0;
      this._wavePhase = 0;
      this._duneOffsets = new Array(10).fill(0);
      this._iceCracks = [];
    }
    this._updateLavaFlow(dt, t2);
    this._updateWaterLevel(dt, t2);
    this._updateSandDunes(dt, 0.5);
  },

  _updateLavaFlow(dt, t2) {
    if (!this._lavaStreams) this._lavaStreams = [];
    // Spawn new streams if needed
    while (this._lavaStreams.length < 5) {
      this._lavaStreams.push({
        x: Math.random() * 1000,
        y: 0,
        speed: 15 + Math.random() * 20,
        opacity: 0.6 + Math.random() * 0.3,
        width: 4 + Math.random() * 8,
        phase: Math.random() * Math.PI * 2
      });
    }
    for (const stream of this._lavaStreams) {
      stream.y += stream.speed * dt;
      stream.opacity = 0.5 + Math.sin(t2 * 1.5 + stream.phase) * 0.2;
      if (stream.y > 1000) {
        stream.y = -20;
        stream.x = Math.random() * 1000;
      }
    }
  },

  _updateWaterLevel(dt, t2) {
    const amplitude = 8;
    this._waterLevel = Math.sin(t2 * 0.3) * amplitude;
    this._wavePhase = (this._wavePhase || 0) + dt * 1.5;
    if (this._wavePhase > Math.PI * 2) this._wavePhase -= Math.PI * 2;
  },

  _updateSandDunes(dt, windSpeed) {
    if (!this._duneOffsets) this._duneOffsets = new Array(10).fill(0);
    for (let i = 0; i < this._duneOffsets.length; i++) {
      this._duneOffsets[i] += windSpeed * dt * (0.8 + i * 0.04);
      if (this._duneOffsets[i] > 200) this._duneOffsets[i] -= 200;
    }
  },

  _updateIceBreaking(x, vehicleWeight) {
    if (!this._iceCracks) this._iceCracks = [];
    if (vehicleWeight > 800) {
      const crackCount = Math.floor(vehicleWeight / 300);
      for (let c = 0; c < crackCount; c++) {
        const angle = Math.random() * Math.PI * 2;
        const len = 20 + Math.random() * 40;
        this._iceCracks.push({
          x1: x, y1: 0,
          x2: x + Math.cos(angle) * len,
          y2: Math.sin(angle) * len,
          age: 0
        });
      }
      return vehicleWeight > 1200;
    }
    return false;
  },

  getTerrainHazard(x, y) {
    if (!this._hazardMap) return null;
    for (const hz of this._hazardMap) {
      const dx = x - hz.x, dy = y - hz.y;
      if (Math.sqrt(dx * dx + dy * dy) <= hz.radius) {
        const types = {
          lava:      { type:'lava',      damage: 10, knockback: 5  },
          quicksand: { type:'quicksand', damage: 0,  knockback: -1 },
          spike:     { type:'spike',     damage: 20, knockback: 3  }
        };
        return types[hz.type] || null;
      }
    }
    return null;
  },

  // ═══════════════════════════════════════════════════════════════
  // DECORATIVE OBJECTS
  // ═══════════════════════════════════════════════════════════════

  _drawWindmill(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Soft ground shadow anchoring the tower
    ctx.save();
    ctx.scale(1, 0.32);
    ctx.fillStyle = 'rgba(40,32,26,0.22)';
    ctx.beginPath();
    ctx.arc(4, 6, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Stone tower — cross-lit gradient for rounded volume
    const towerGrad = ctx.createLinearGradient(-15, -60, 15, 0);
    towerGrad.addColorStop(0, '#d0c2b2');
    towerGrad.addColorStop(0.5, '#c0b0a0');
    towerGrad.addColorStop(1, '#908070');
    ctx.fillStyle = towerGrad;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-8, -65);
    ctx.lineTo(8, -65);
    ctx.lineTo(12, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#706050';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Stone lines
    for (let r = 0; r < 5; r++) {
      const ry = -r * 13 - 5;
      ctx.strokeStyle = 'rgba(80,65,50,0.4)';
      ctx.beginPath();
      ctx.moveTo(-11 + r * 0.5, ry);
      ctx.lineTo(11 - r * 0.5, ry);
      ctx.stroke();
    }
    // Shaded right flank of the tower for cylindrical form
    ctx.fillStyle = 'rgba(70,58,46,0.28)';
    ctx.beginPath();
    ctx.moveTo(4, -63);
    ctx.lineTo(8, -65);
    ctx.lineTo(12, 0);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();
    // Conical wooden roof cap
    const roofGrad = ctx.createLinearGradient(-9, -80, 9, -63);
    roofGrad.addColorStop(0, '#8a5a34');
    roofGrad.addColorStop(1, '#5e3a1e');
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(-9, -63);
    ctx.lineTo(0, -82);
    ctx.lineTo(9, -63);
    ctx.closePath();
    ctx.fill();
    // Window (lit)
    ctx.fillStyle = '#5a7088';
    ctx.beginPath();
    ctx.arc(0, -40, 5, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,235,180,0.35)';
    ctx.beginPath();
    ctx.arc(-1, -41, 2.4, Math.PI, 0);
    ctx.fill();
    // Rotating blades — faint motion-blur arc behind them
    ctx.save();
    ctx.translate(0, -70);
    ctx.strokeStyle = `rgba(230,225,210,${(0.10 + 0.05 * Math.abs(Math.sin(t2 * 1.2))).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Hub
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(0, -70, 5, 0, Math.PI * 2);
    ctx.fill();
    // Rotating blades
    ctx.save();
    ctx.translate(0, -70);
    ctx.rotate(t2 * 1.2);
    for (let b = 0; b < 4; b++) {
      ctx.save();
      ctx.rotate(b * Math.PI / 2);
      ctx.fillStyle = '#ddd8c8';
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(-2, -32);
      ctx.lineTo(6, -28);
      ctx.lineTo(3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#aaa090';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  },

  _drawClock(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Tower body
    ctx.fillStyle = '#8a7860';
    ctx.fillRect(-18, -80, 36, 80);
    // Bell housing
    ctx.fillStyle = '#7a6850';
    ctx.beginPath();
    ctx.moveTo(-20, -80);
    ctx.lineTo(0, -100);
    ctx.lineTo(20, -80);
    ctx.closePath();
    ctx.fill();
    // Clock face
    ctx.fillStyle = '#f5f0e0';
    ctx.beginPath();
    ctx.arc(0, -55, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3a20';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Tick marks
    for (let m = 0; m < 12; m++) {
      const ang = (m / 12) * Math.PI * 2 - Math.PI / 2;
      const isHour = m % 3 === 0;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * 12, -55 + Math.sin(ang) * 12);
      ctx.lineTo(Math.cos(ang) * (isHour ? 8 : 10), -55 + Math.sin(ang) * (isHour ? 8 : 10));
      ctx.strokeStyle = '#4a3a20';
      ctx.lineWidth = isHour ? 2 : 1;
      ctx.stroke();
    }
    // Hour hand
    const hourAng = (t2 / 3600) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#2a1a00';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(Math.cos(hourAng) * 8, -55 + Math.sin(hourAng) * 8);
    ctx.stroke();
    // Minute hand
    const minAng = (t2 / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(Math.cos(minAng) * 12, -55 + Math.sin(minAng) * 12);
    ctx.stroke();
    // Second hand
    const secAng = t2 * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#cc2200';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(Math.cos(secAng) * 13, -55 + Math.sin(secAng) * 13);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = '#2a1a00';
    ctx.beginPath();
    ctx.arc(0, -55, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _drawFountain(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Stone basin
    ctx.fillStyle = '#b0a090';
    ctx.beginPath();
    ctx.ellipse(0, -5, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a7860';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Water pool
    const poolGrad = ctx.createRadialGradient(0, -5, 0, 0, -5, 30);
    poolGrad.addColorStop(0, 'rgba(80,160,220,0.7)');
    poolGrad.addColorStop(1, 'rgba(40,100,180,0.4)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(0, -5, 30, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // Central pillar
    ctx.fillStyle = '#c0b0a0';
    ctx.fillRect(-5, -35, 10, 30);
    ctx.beginPath();
    ctx.arc(0, -35, 8, Math.PI, 0);
    ctx.fill();
    // Water jets (parabolic arcs)
    ctx.strokeStyle = 'rgba(120,200,255,0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let j = 0; j < 6; j++) {
      const jAng = (j / 6) * Math.PI * 2 + t2 * 0.2;
      const jPhase = t2 * 2 + j;
      const jH = 20 + Math.sin(jPhase) * 5;
      const jR = 18 + Math.sin(jPhase + 1) * 4;
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.quadraticCurveTo(
        Math.cos(jAng) * jR * 0.5, -35 - jH,
        Math.cos(jAng) * jR, -5 + Math.sin(jPhase * 0.5) * 3
      );
      ctx.stroke();
    }
    // Ripple rings in pool
    for (let r = 0; r < 3; r++) {
      const rPhase = (t2 * 0.8 + r * 0.5) % 1;
      const rr2 = rPhase * 28;
      ctx.strokeStyle = `rgba(180,220,255,${0.4 * (1 - rPhase)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -5, rr2, rr2 * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawFerrisWheel(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    const R = 55;
    // Support legs (A-frame)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-R * 0.6, 0);
    ctx.lineTo(0, -R);
    ctx.lineTo(R * 0.6, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-R * 0.3, 0);
    ctx.lineTo(R * 0.3, 0);
    ctx.stroke();
    // Wheel rim
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -R, R, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes (rotating)
    ctx.save();
    ctx.translate(0, -R);
    ctx.rotate(t2 * 0.4);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    for (let sp = 0; sp < 8; sp++) {
      const ang = (sp / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * R, Math.sin(ang) * R);
      ctx.stroke();
    }
    // Gondolas
    for (let g = 0; g < 8; g++) {
      const ang = (g / 8) * Math.PI * 2 + t2 * 0.4;
      const gx = Math.cos(ang) * R;
      const gy = Math.sin(ang) * R;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.fillStyle = `hsl(${g * 45},70%,55%)`;
      ctx.fillRect(-7, -4, 14, 12);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -4, 14, 12);
      ctx.restore();
    }
    // Hub
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },

  _drawCrane(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Mast - safety stripes
    for (let s = 0; s < 10; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#ffcc00' : '#ff3300';
      ctx.fillRect(-10, -s * 16 - 10, 20, 16);
    }
    // Mast outline
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -170, 20, 170);
    // Jib (horizontal arm)
    ctx.fillStyle = '#888';
    ctx.fillRect(-30, -172, 150, 10);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-30, -172, 150, 10);
    // Counterweight
    ctx.fillStyle = '#666';
    ctx.fillRect(-50, -175, 20, 18);
    // Hanging cable
    const swayX = Math.sin(t2 * 0.7) * 10;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, -167);
    ctx.lineTo(80 + swayX, -90);
    ctx.stroke();
    // Hook
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(80 + swayX, -84, 6, 0, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  },

  _drawOilPump(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Base structure
    ctx.fillStyle = '#555';
    ctx.fillRect(-25, -15, 50, 15);
    ctx.fillStyle = '#444';
    ctx.fillRect(-5, -40, 10, 25);
    // Sampson post (vertical A-frame)
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(0, -45);
    ctx.lineTo(15, 0);
    ctx.stroke();
    // Walking beam (rocks up and down)
    const beamAngle = Math.sin(t2 * 1.5) * 0.35;
    ctx.save();
    ctx.translate(0, -45);
    ctx.rotate(beamAngle);
    ctx.fillStyle = '#444';
    ctx.fillRect(-40, -6, 80, 12);
    // Horse head
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.bezierCurveTo(-45, -5, -52, -4, -55, 5);
    ctx.lineTo(-48, 8);
    ctx.bezierCurveTo(-44, 5, -38, 6, -38, 0);
    ctx.closePath();
    ctx.fill();
    // Drive rod at horse head end
    const rodY = Math.sin(t2 * 1.5 + 0.1) * 18;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-50, 6);
    ctx.lineTo(-50, 6 + 30 + rodY);
    ctx.stroke();
    // Counterweight
    ctx.fillStyle = '#333';
    ctx.fillRect(30, -10, 20, 18);
    ctx.restore();
    ctx.restore();
  },

  _drawSatelliteDish(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Slow rotation
    ctx.rotate(Math.sin(t2 * 0.15) * 0.3);
    // Support pole
    ctx.fillStyle = '#888';
    ctx.fillRect(-4, -50, 8, 50);
    // Dish bowl
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#bbb';
    ctx.beginPath();
    ctx.arc(0, -50, 28, Math.PI * 0.05, Math.PI * 0.95);
    ctx.fill();
    ctx.stroke();
    // Receiver arm
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(18, -70);
    ctx.stroke();
    // Focal point receiver
    ctx.fillStyle = '#cc4400';
    ctx.beginPath();
    ctx.arc(18, -70, 4, 0, Math.PI * 2);
    ctx.fill();
    // Signal waves
    for (let w = 0; w < 3; w++) {
      const wAlpha = 0.3 - w * 0.08;
      const wR = 8 + w * 8;
      ctx.strokeStyle = `rgba(255,200,0,${wAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(18, -70, wR, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawRadioTower(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    const H2 = 120;
    // Lattice structure (tapered)
    for (let seg = 0; seg < 8; seg++) {
      const bot = -seg * (H2 / 8);
      const top = -(seg + 1) * (H2 / 8);
      const botW = 20 - seg * 2;
      const topW = 18 - seg * 2;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      // Vertical sides
      ctx.beginPath();
      ctx.moveTo(-botW, bot);
      ctx.lineTo(-topW, top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(botW, bot);
      ctx.lineTo(topW, top);
      ctx.stroke();
      // Cross braces
      if (seg % 2 === 0) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-botW, bot);
        ctx.lineTo(topW, top);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(botW, bot);
        ctx.lineTo(-topW, top);
        ctx.stroke();
      }
    }
    // Platform
    ctx.fillStyle = '#777';
    ctx.fillRect(-12, -H2, 24, 5);
    // Antenna at top
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -H2);
    ctx.lineTo(0, -H2 - 25);
    ctx.stroke();
    // Blinking red light
    const lit = Math.sin(t2 * 2.5) > 0.3;
    ctx.fillStyle = lit ? '#ff2200' : '#550000';
    ctx.shadowColor = lit ? '#ff2200' : 'transparent';
    ctx.shadowBlur = lit ? 10 : 0;
    ctx.beginPath();
    ctx.arc(0, -H2 - 25, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Guy wires
    ctx.strokeStyle = 'rgba(100,100,100,0.5)';
    ctx.lineWidth = 1;
    for (const gx of [-50, 50]) {
      ctx.beginPath();
      ctx.moveTo(0, -H2 * 0.7);
      ctx.lineTo(gx, 0);
      ctx.stroke();
    }
    ctx.restore();
  },

  _drawLighthouse(ctx, x, y, t2) {
    ctx.save();
    ctx.translate(x, y);
    // Base rocks
    ctx.fillStyle = '#6a6060';
    ctx.beginPath();
    ctx.ellipse(0, -2, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Keeper's house
    ctx.fillStyle = '#e0d8cc';
    ctx.fillRect(-18, -25, 36, 23);
    ctx.fillStyle = '#c04040';
    ctx.beginPath();
    ctx.moveTo(-20, -25);
    ctx.lineTo(0, -40);
    ctx.lineTo(20, -25);
    ctx.closePath();
    ctx.fill();
    // Tower (striped)
    const stripeColors = ['#ffffff','#cc2200'];
    for (let s = 0; s < 8; s++) {
      ctx.fillStyle = stripeColors[s % 2];
      const tw2 = 10 - s * 0.5;
      const th2 = 12;
      const ty2 = -25 - s * th2;
      ctx.fillRect(-tw2, ty2, tw2 * 2, th2);
    }
    // Lantern room
    const lanternY = -25 - 8 * 12;
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(-13, lanternY - 18, 26, 18);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    // Lantern panes
    for (let p = 0; p < 4; p++) {
      ctx.beginPath();
      ctx.moveTo(-13 + p * 7, lanternY - 18);
      ctx.lineTo(-13 + p * 7, lanternY);
      ctx.stroke();
    }
    // Roof
    ctx.fillStyle = '#4a8a4a';
    ctx.beginPath();
    ctx.moveTo(-15, lanternY - 18);
    ctx.lineTo(0, lanternY - 28);
    ctx.lineTo(15, lanternY - 18);
    ctx.closePath();
    ctx.fill();
    // Rotating light beam
    const beamAngle = t2 * 1.5;
    const beamLen = 140;
    ctx.save();
    ctx.translate(0, lanternY - 9);
    ctx.rotate(beamAngle);
    const beamGrad = ctx.createLinearGradient(0, 0, beamLen, 0);
    beamGrad.addColorStop(0, 'rgba(255,255,180,0.8)');
    beamGrad.addColorStop(1, 'rgba(255,255,180,0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(beamLen, -15);
    ctx.lineTo(beamLen, 15);
    ctx.closePath();
    ctx.fill();
    // Second beam 180 degrees
    ctx.rotate(Math.PI);
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(beamLen, -15);
    ctx.lineTo(beamLen, 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Central light glow
    ctx.fillStyle = 'rgba(255,255,180,0.9)';
    ctx.shadowColor = '#ffff80';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, lanternY - 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

};

// =============================================================================
// BIOME_WEATHER — her biome için varsayılan hava durumu parametreleri
// =============================================================================
const BIOME_WEATHER = {
  'village':        { type: 'clear',     rainIntensity: 0,    snowDensity: 0,   fogDensity: 0.1, windX: 0.5,  sandstorm: false, lightning: false, isNight: false },
  'arctic':         { type: 'snow',      rainIntensity: 0,    snowDensity: 0.8, fogDensity: 0.3, windX: 1.5,  sandstorm: false, lightning: false, isNight: false },
  'desert':         { type: 'sandstorm', rainIntensity: 0,    snowDensity: 0,   fogDensity: 0.0, windX: 3.0,  sandstorm: true,  lightning: false, isNight: false },
  'volcano':        { type: 'ash',       rainIntensity: 0,    snowDensity: 0,   fogDensity: 0.4, windX: 1.0,  sandstorm: false, lightning: false, isNight: false },
  'forest':         { type: 'rain',      rainIntensity: 0.5,  snowDensity: 0,   fogDensity: 0.2, windX: 0.3,  sandstorm: false, lightning: false, isNight: false },
  'city':           { type: 'overcast',  rainIntensity: 0.2,  snowDensity: 0,   fogDensity: 0.15,windX: 0.2,  sandstorm: false, lightning: false, isNight: true  },
  'space_station':  { type: 'space',     rainIntensity: 0,    snowDensity: 0,   fogDensity: 0,   windX: 0,    sandstorm: false, lightning: false, isNight: true  },
  'deep_ocean':     { type: 'underwater',rainIntensity: 0,    snowDensity: 0,   fogDensity: 0.6, windX: 0,    sandstorm: false, lightning: false, isNight: false },
  'lava_world':     { type: 'eruption',  rainIntensity: 0,    snowDensity: 0,   fogDensity: 0.5, windX: 0.8,  sandstorm: false, lightning: true,  isNight: false },
  'crystal_cave':   { type: 'cave',      rainIntensity: 0,    snowDensity: 0,   fogDensity: 0.35,windX: 0,    sandstorm: false, lightning: false, isNight: true  },
  'stormy_cliff':   { type: 'storm',     rainIntensity: 0.9,  snowDensity: 0,   fogDensity: 0.25,windX: 4.0,  sandstorm: false, lightning: true,  isNight: false }
};

// =============================================================================
// PROP_LIBRARY genişletme — 20+ yeni prop tanımı
// =============================================================================
const PROP_LIBRARY_EXTENDED = {
  windmill: {
    width: 60, height: 120,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Kule
      ctx.fillStyle = '#ccbbaa';
      ctx.beginPath();
      ctx.moveTo(x - 8*z, y);
      ctx.lineTo(x + 8*z, y);
      ctx.lineTo(x + 4*z, y - 80*z);
      ctx.lineTo(x - 4*z, y - 80*z);
      ctx.closePath();
      ctx.fill();
      // Dönen kanatlar
      ctx.save();
      ctx.translate(x, y - 80*z);
      ctx.rotate(t * 1.2);
      ctx.fillStyle = '#e8e0d0';
      for (let b = 0; b < 4; b++) {
        ctx.save();
        ctx.rotate((b / 4) * Math.PI * 2);
        ctx.fillRect(-4*z, -35*z, 8*z, 35*z);
        ctx.restore();
      }
      ctx.restore();
      ctx.restore();
    }
  },

  oil_derrick: {
    width: 70, height: 130,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Kafes yapı
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 2*z;
      // Dört ana direk
      const legs = [[-20,-10],[20,-10],[-5,-5],[5,-5]];
      for (const [lx, ly] of legs) {
        ctx.beginPath();
        ctx.moveTo(x + lx*z, y);
        ctx.lineTo(x + ly*z*0.5, y - 90*z);
        ctx.stroke();
      }
      // Yatay bağlantılar
      for (let h = 0; h < 4; h++) {
        const hh = h * 22*z;
        ctx.beginPath();
        ctx.moveTo(x - (20 - h*3)*z, y - hh);
        ctx.lineTo(x + (20 - h*3)*z, y - hh);
        ctx.stroke();
      }
      // Pompa kolu
      ctx.save();
      ctx.translate(x, y - 90*z);
      const pumpAngle = Math.sin(t * 1.5) * 0.3;
      ctx.rotate(pumpAngle);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4*z;
      ctx.beginPath();
      ctx.moveTo(-25*z, 0);
      ctx.lineTo(15*z, 0);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
  },

  satellite_dish: {
    width: 80, height: 90,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Destek
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(x - 3*z, y - 50*z, 6*z, 50*z);
      // Tabaka
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 3*z;
      ctx.beginPath();
      ctx.arc(x, y - 55*z, 28*z, Math.PI * 0.2, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 55*z);
      ctx.lineTo(x + 28*z * Math.cos(Math.PI * 0.2), y - 55*z + 28*z * Math.sin(Math.PI * 0.2));
      ctx.lineTo(x + 28*z * Math.cos(Math.PI * 0.9), y - 55*z + 28*z * Math.sin(Math.PI * 0.9));
      ctx.closePath();
      ctx.fillStyle = '#cccccc';
      ctx.fill();
      // Anten
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(x + 10*z, y - 70*z, 3*z, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  broken_car: {
    width: 90, height: 45,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Gövde
      ctx.fillStyle = '#8a6040';
      ctx.fillRect(x - 35*z, y - 25*z, 70*z, 22*z);
      ctx.fillRect(x - 20*z, y - 38*z, 40*z, 15*z);
      // Kırık camlar
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1*z;
      ctx.strokeRect(x - 18*z, y - 37*z, 15*z, 12*z);
      ctx.strokeRect(x + 3*z, y - 37*z, 15*z, 12*z);
      // Tekerlekler (biri sönmüş)
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(x - 20*z, y - 3*z, 10*z, 7*z, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 20*z, y - 3*z, 10*z, 10*z, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },

  campfire: {
    width: 40, height: 35,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Odun
      ctx.strokeStyle = '#5a3010';
      ctx.lineWidth = 4*z;
      ctx.beginPath();
      ctx.moveTo(x - 15*z, y);
      ctx.lineTo(x + 8*z, y - 14*z);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 15*z, y);
      ctx.lineTo(x - 8*z, y - 14*z);
      ctx.stroke();
      // Kor
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(x, y - 5*z, 8*z, 0, Math.PI*2);
      ctx.fill();
      // Alevler
      for (let f = 0; f < 5; f++) {
        const angle = (f / 5) * Math.PI * 2 + t * 3 + f;
        const fx2 = x + Math.sin(angle) * 5*z;
        const fy2 = y - 12*z - Math.abs(Math.sin(t*4+f)) * 12*z;
        const fg = ctx.createRadialGradient(fx2, fy2, 0, fx2, fy2, 10*z);
        fg.addColorStop(0, `rgba(255,200,50,${0.7+Math.sin(t*5+f)*0.2})`);
        fg.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = fg;
        ctx.fillRect(fx2-10*z, fy2-10*z, 20*z, 20*z);
      }
      ctx.restore();
    }
  },

  tent: {
    width: 70, height: 55,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Çadır gövdesi
      ctx.fillStyle = '#cc8833';
      ctx.strokeStyle = '#aa6622';
      ctx.lineWidth = 2*z;
      ctx.beginPath();
      ctx.moveTo(x - 35*z, y);
      ctx.lineTo(x, y - 50*z);
      ctx.lineTo(x + 35*z, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Kapı
      ctx.fillStyle = '#885522';
      ctx.beginPath();
      ctx.moveTo(x - 12*z, y);
      ctx.lineTo(x - 5*z, y - 20*z);
      ctx.lineTo(x + 5*z, y - 20*z);
      ctx.lineTo(x + 12*z, y);
      ctx.closePath();
      ctx.fill();
      // Çadır kazıkları
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1.5*z;
      ctx.beginPath(); ctx.moveTo(x - 35*z, y); ctx.lineTo(x - 50*z, y+8*z); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 35*z, y); ctx.lineTo(x + 50*z, y+8*z); ctx.stroke();
      ctx.restore();
    }
  },

  igloo: {
    width: 80, height: 55,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Buz kubbe
      ctx.fillStyle = '#d8ecff';
      ctx.strokeStyle = '#aaccee';
      ctx.lineWidth = 2*z;
      ctx.beginPath();
      ctx.arc(x, y, 38*z, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Buz blok çizgileri
      ctx.strokeStyle = 'rgba(150,190,230,0.5)';
      ctx.lineWidth = 1*z;
      for (let row = 1; row < 4; row++) {
        const rowY = y - row * 12*z;
        const halfW = Math.sqrt(Math.max(0, (38*z)**2 - (row*12*z)**2));
        ctx.beginPath();
        ctx.moveTo(x - halfW, rowY);
        ctx.lineTo(x + halfW, rowY);
        ctx.stroke();
      }
      // Giriş tüneli
      ctx.fillStyle = '#c0ddf5';
      ctx.fillRect(x - 12*z, y - 18*z, 24*z, 18*z);
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath();
      ctx.arc(x, y - 18*z, 10*z, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    }
  },

  palm_tree: {
    width: 60, height: 110,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Gövde (eğik)
      ctx.strokeStyle = '#8a6020';
      ctx.lineWidth = 10*z;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 15*z, y - 55*z, x + 5*z, y - 95*z);
      ctx.stroke();
      // Yapraklar
      const leafColors = ['#2a8a20','#3aaa28','#22780e'];
      for (let l = 0; l < 6; l++) {
        const angle = (l / 6) * Math.PI * 2 + t * 0.4 * Math.sin(l * 0.8);
        const lx2 = x + 5*z + Math.cos(angle) * 30*z;
        const ly2 = y - 95*z + Math.sin(angle) * 12*z;
        ctx.strokeStyle = leafColors[l % leafColors.length];
        ctx.lineWidth = 5*z;
        ctx.beginPath();
        ctx.moveTo(x + 5*z, y - 95*z);
        ctx.quadraticCurveTo(
          (x + 5*z + lx2) / 2 + Math.sin(t * 1.5 + l) * 8*z,
          (y - 95*z + ly2) / 2 - 10*z,
          lx2, ly2
        );
        ctx.stroke();
      }
      // Hindistancevizi
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = '#8a5a10';
        ctx.beginPath();
        ctx.arc(x + 5*z + (c - 1) * 10*z, y - 90*z, 6*z, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  cactus_group: {
    width: 80, height: 90,
    draw(ctx, x, y, t, z) {
      ctx.save();
      const drawCactus = (cx, cy, h, armL, armH) => {
        ctx.fillStyle = '#4a8a30';
        ctx.strokeStyle = '#2a6010';
        ctx.lineWidth = 1.5*z;
        // Gövde
        ctx.fillRect(cx - 6*z, cy - h*z, 12*z, h*z);
        ctx.strokeRect(cx - 6*z, cy - h*z, 12*z, h*z);
        // Sol kol
        ctx.fillRect(cx - 18*z, cy - armH*z, 12*z, 5*z);
        ctx.fillRect(cx - 18*z, cy - armH*z - armL*z, 5*z, armL*z);
        // Sağ kol
        ctx.fillRect(cx + 6*z, cy - armH*z, 12*z, 5*z);
        ctx.fillRect(cx + 13*z, cy - armH*z - armL*z, 5*z, armL*z);
        // Dikenler
        ctx.strokeStyle = '#ffee99';
        ctx.lineWidth = 1*z;
        for (let sp = 0; sp < 5; sp++) {
          const sy2 = cy - (sp + 1) * (h / 5)*z;
          ctx.beginPath(); ctx.moveTo(cx - 6*z, sy2); ctx.lineTo(cx - 12*z, sy2 - 4*z); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + 6*z, sy2); ctx.lineTo(cx + 12*z, sy2 - 4*z); ctx.stroke();
        }
      };
      drawCactus(x, y, 70, 15, 40);
      drawCactus(x - 28*z, y + 8*z, 45, 10, 25);
      drawCactus(x + 30*z, y + 5*z, 50, 12, 28);
      ctx.restore();
    }
  },

  waterfall: {
    width: 60, height: 120,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Kaya
      ctx.fillStyle = '#888877';
      ctx.beginPath();
      ctx.roundRect(x - 25*z, y - 80*z, 50*z, 40*z, 5*z);
      ctx.fill();
      // Su akışı
      const streamCount = 5;
      for (let s = 0; s < streamCount; s++) {
        const sx = x - 15*z + s * 7*z;
        const flow = (t * 80 + s * 20) % (80*z);
        const grad = ctx.createLinearGradient(sx, y - 40*z, sx, y);
        grad.addColorStop(0, 'rgba(100,180,255,0.7)');
        grad.addColorStop(1, 'rgba(100,180,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3*z;
        ctx.beginPath();
        ctx.moveTo(sx + Math.sin(t * 2 + s) * 4*z, y - 40*z);
        ctx.quadraticCurveTo(sx + Math.sin(t * 2 + s + 1) * 8*z, y - 20*z, sx, y);
        ctx.stroke();
      }
      // Köpük havuzu
      const poolGrad = ctx.createRadialGradient(x, y + 5*z, 0, x, y + 5*z, 22*z);
      poolGrad.addColorStop(0, 'rgba(200,240,255,0.8)');
      poolGrad.addColorStop(1, 'rgba(100,180,255,0)');
      ctx.fillStyle = poolGrad;
      ctx.fillRect(x - 22*z, y, 44*z, 12*z);
      ctx.restore();
    }
  },

  geyser: {
    width: 30, height: 100,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Zemin
      ctx.fillStyle = '#888870';
      ctx.beginPath();
      ctx.ellipse(x, y, 15*z, 6*z, 0, 0, Math.PI*2);
      ctx.fill();
      // Püskürme fazı
      const phase = (t % 4);
      if (phase < 2) {
        const height = Math.sin(phase * Math.PI / 2) * 80*z;
        for (let p = 0; p < 8; p++) {
          const px = x + (Math.random() - 0.5) * 20*z;
          const py = y - height * (0.5 + Math.random() * 0.5);
          const pr = 4 + Math.random() * 8;
          const pg = ctx.createRadialGradient(px, py, 0, px, py, pr*z);
          pg.addColorStop(0, 'rgba(200,240,255,0.8)');
          pg.addColorStop(1, 'rgba(150,200,255,0)');
          ctx.fillStyle = pg;
          ctx.fillRect(px - pr*z, py - pr*z, pr*2*z, pr*2*z);
        }
        // Ana su sütunu
        const sg = ctx.createLinearGradient(x, y - height, x, y);
        sg.addColorStop(0, 'rgba(150,210,255,0)');
        sg.addColorStop(0.5, 'rgba(150,210,255,0.6)');
        sg.addColorStop(1, 'rgba(100,180,255,0.3)');
        ctx.fillStyle = sg;
        ctx.fillRect(x - 8*z, y - height, 16*z, height);
      }
      ctx.restore();
    }
  },

  ruins: {
    width: 120, height: 80,
    draw(ctx, x, y, t, z) {
      ctx.save();
      ctx.fillStyle = '#9a8870';
      // Kırık kolonlar
      const cols = [
        {ox: -50, h: 60, broken: true},
        {ox: -20, h: 75, broken: false},
        {ox: 20, h: 50, broken: true},
        {ox: 50, h: 65, broken: false}
      ];
      for (const col of cols) {
        const cy = y - col.h*z;
        ctx.fillRect(x + col.ox*z - 6*z, cy, 12*z, col.h*z);
        if (!col.broken) {
          ctx.fillRect(x + col.ox*z - 10*z, cy - 10*z, 20*z, 8*z);
        }
      }
      // Yere düşmüş taşlar
      ctx.fillStyle = '#8a7860';
      ctx.beginPath();
      ctx.roundRect(x - 45*z, y - 15*z, 35*z, 15*z, 4*z);
      ctx.fill();
      // Sarmaşık (yeşil çizgiler)
      ctx.strokeStyle = '#4a8a30';
      ctx.lineWidth = 2*z;
      ctx.beginPath();
      ctx.moveTo(x - 20*z, y);
      ctx.lineTo(x - 20*z, y - 55*z);
      ctx.lineTo(x - 10*z, y - 60*z);
      ctx.stroke();
      ctx.restore();
    }
  },

  lighthouse: {
    width: 45, height: 140,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Kule
      ctx.fillStyle = '#eeeedd';
      ctx.beginPath();
      ctx.moveTo(x - 15*z, y);
      ctx.lineTo(x + 15*z, y);
      ctx.lineTo(x + 8*z, y - 100*z);
      ctx.lineTo(x - 8*z, y - 100*z);
      ctx.closePath();
      ctx.fill();
      // Kırmızı şeritler
      ctx.fillStyle = '#dd2222';
      for (let s = 0; s < 3; s++) {
        const sy = y - 25*z - s * 30*z;
        const topW = 8*z + (2 - s) * 2.3*z;
        const botW = 15*z - s * 2.3*z;
        ctx.fillRect(x - botW, sy, botW * 2, 12*z);
      }
      // Fener odası
      ctx.fillStyle = '#333344';
      ctx.fillRect(x - 12*z, y - 115*z, 24*z, 18*z);
      // Dönen ışık
      const beam1 = t * 1.8;
      const beamLen = 200*z;
      const beamG = ctx.createLinearGradient(x, y - 106*z,
        x + Math.cos(beam1) * beamLen, y - 106*z + Math.sin(beam1) * beamLen);
      beamG.addColorStop(0, 'rgba(255,255,180,0.7)');
      beamG.addColorStop(1, 'rgba(255,255,180,0)');
      ctx.strokeStyle = beamG;
      ctx.lineWidth = 6*z;
      ctx.beginPath();
      ctx.moveTo(x, y - 106*z);
      ctx.lineTo(x + Math.cos(beam1) * beamLen, y - 106*z + Math.sin(beam1) * beamLen);
      ctx.stroke();
      // Üst kubbe
      ctx.fillStyle = '#555566';
      ctx.beginPath();
      ctx.arc(x, y - 118*z, 14*z, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    }
  },

  train_wreck: {
    width: 140, height: 60,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Raylı vagon gövdesi (devrilmiş)
      ctx.save();
      ctx.translate(x, y - 20*z);
      ctx.rotate(0.25);
      ctx.fillStyle = '#6a5040';
      ctx.fillRect(-55*z, -25*z, 110*z, 40*z);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(-45*z, -35*z, 80*z, 15*z);
      // Kırık pencereler
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5*z;
      for (let w = -3; w < 3; w++) {
        ctx.strokeRect(w * 16*z - 6*z, -32*z, 12*z, 10*z);
      }
      ctx.restore();
      // Tekerlekler
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x - 35*z, y + 5*z, 14*z, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 35*z, y + 5*z, 14*z, 0, Math.PI*2); ctx.fill();
      // Duman
      for (let d = 0; d < 3; d++) {
        const dy = ((t * 20 + d * 25) % 60)*z;
        ctx.beginPath();
        ctx.arc(x - 20*z, y - 40*z - dy, (6 + dy * 0.3)*z, 0, Math.PI*2);
        ctx.fillStyle = `rgba(80,70,60,${0.4 - dy * 0.006})`;
        ctx.fill();
      }
      ctx.restore();
    }
  },

  spacecraft_crash: {
    width: 110, height: 75,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Gövde (kırık)
      ctx.save();
      ctx.translate(x, y - 15*z);
      ctx.rotate(-0.2);
      ctx.fillStyle = '#778899';
      ctx.beginPath();
      ctx.ellipse(0, 0, 45*z, 18*z, 0, 0, Math.PI*2);
      ctx.fill();
      // Kokpit
      ctx.fillStyle = '#334455';
      ctx.beginPath();
      ctx.ellipse(-20*z, -8*z, 16*z, 10*z, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      // Kanatlar
      ctx.fillStyle = '#667788';
      ctx.save();
      ctx.translate(x, y - 15*z);
      ctx.rotate(-0.2);
      ctx.beginPath();
      ctx.moveTo(-10*z, 0); ctx.lineTo(-40*z, 30*z); ctx.lineTo(20*z, 30*z); ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Kıvılcımlar
      const spark = Math.sin(t * 8);
      if (spark > 0.5) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(x + 20*z, y - 10*z, 4*z, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  pyramid: {
    width: 130, height: 100,
    draw(ctx, x, y, t, z) {
      ctx.save();
      ctx.fillStyle = '#c8a840';
      ctx.beginPath();
      ctx.moveTo(x, y - 90*z);
      ctx.lineTo(x + 60*z, y);
      ctx.lineTo(x - 60*z, y);
      ctx.closePath();
      ctx.fill();
      // Taş çizgileri
      ctx.strokeStyle = 'rgba(150,110,20,0.4)';
      ctx.lineWidth = 1.5*z;
      for (let row = 1; row < 8; row++) {
        const f = row / 8;
        const rw = 60*z * f;
        const ry = y - 90*z * (1 - f);
        ctx.beginPath();
        ctx.moveTo(x - rw, ry);
        ctx.lineTo(x + rw, ry);
        ctx.stroke();
      }
      // Kapı
      ctx.fillStyle = '#3a2a10';
      ctx.fillRect(x - 8*z, y - 20*z, 16*z, 20*z);
      // Tepe parıltısı
      const tg = ctx.createRadialGradient(x, y - 90*z, 0, x, y - 90*z, 15*z);
      tg.addColorStop(0, `rgba(255,220,100,${0.3+Math.sin(t)*0.2})`);
      tg.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(x - 15*z, y - 105*z, 30*z, 30*z);
      ctx.restore();
    }
  },

  stonehenge: {
    width: 160, height: 90,
    draw(ctx, x, y, t, z) {
      ctx.save();
      ctx.fillStyle = '#aaa090';
      const stones = [
        {ox: -60, w: 14, h: 55}, {ox: -38, w: 14, h: 65},
        {ox: -8,  w: 14, h: 70}, {ox: 22,  w: 14, h: 65},
        {ox: 46,  w: 14, h: 55}
      ];
      for (const s of stones) {
        ctx.fillRect(x + s.ox*z, y - s.h*z, s.w*z, s.h*z);
      }
      // Üst taşlar (lintels)
      ctx.fillStyle = '#b8b0a0';
      ctx.fillRect(x - 62*z, y - 65*z, 40*z, 10*z);
      ctx.fillRect(x + 8*z, y - 65*z, 40*z, 10*z);
      // Gizem parıltısı
      const mg = ctx.createRadialGradient(x, y - 40*z, 0, x, y - 40*z, 60*z);
      mg.addColorStop(0, `rgba(180,160,255,${0.05 + Math.sin(t * 0.5) * 0.03})`);
      mg.addColorStop(1, 'rgba(180,160,255,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(x - 60*z, y - 100*z, 120*z, 120*z);
      ctx.restore();
    }
  },

  traffic_lights: {
    width: 20, height: 90,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Direk
      ctx.fillStyle = '#555566';
      ctx.fillRect(x - 3*z, y - 80*z, 6*z, 80*z);
      // Kutu
      ctx.fillStyle = '#222233';
      ctx.fillRect(x - 10*z, y - 80*z, 20*z, 50*z);
      // Işıklar
      const cycle = Math.floor(t * 0.5) % 3;
      const lights = [
        {cy: y - 70*z, green: false, yellow: false, red: true},
        {cy: y - 55*z, green: false, yellow: true,  red: false},
        {cy: y - 40*z, green: true,  yellow: false,  red: false}
      ];
      for (let i = 0; i < 3; i++) {
        const isOn = i === cycle;
        const colors = ['#ff2200', '#ffcc00', '#00cc33'];
        const offColors = ['#330000', '#333300', '#003300'];
        ctx.beginPath();
        ctx.arc(x, y - 70*z + i * 15*z, 6*z, 0, Math.PI*2);
        ctx.fillStyle = isOn ? colors[i] : offColors[i];
        ctx.fill();
        if (isOn) {
          const glow = ctx.createRadialGradient(x, y - 70*z + i*15*z, 0, x, y - 70*z + i*15*z, 12*z);
          glow.addColorStop(0, colors[i].replace(')', ',0.5)').replace('rgb', 'rgba'));
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(x-12*z, y-82*z+i*15*z, 24*z, 24*z);
        }
      }
      ctx.restore();
    }
  },

  billboard: {
    width: 100, height: 100,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // Direkler
      ctx.fillStyle = '#888899';
      ctx.fillRect(x - 30*z, y - 90*z, 7*z, 90*z);
      ctx.fillRect(x + 23*z, y - 90*z, 7*z, 90*z);
      // Panel
      ctx.fillStyle = '#223355';
      ctx.fillRect(x - 38*z, y - 90*z, 76*z, 48*z);
      ctx.strokeStyle = '#aabbcc';
      ctx.lineWidth = 2*z;
      ctx.strokeRect(x - 38*z, y - 90*z, 76*z, 48*z);
      // Reklam içeriği (animasyonlu)
      const ad = Math.floor(t * 0.2) % 3;
      const adColors = ['#ff4444', '#44ff44', '#4444ff'];
      ctx.fillStyle = adColors[ad];
      ctx.font = `bold ${11*z}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('AHMET RACING!', x, y - 68*z);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${8*z}px Arial`;
      ctx.fillText('BEST RACE EVER', x, y - 52*z);
      ctx.restore();
    }
  },

  power_lines: {
    width: 200, height: 80,
    draw(ctx, x, y, t, z) {
      ctx.save();
      // İki direk
      const drawPole = (px) => {
        ctx.fillStyle = '#666677';
        ctx.fillRect(px - 4*z, y - 70*z, 8*z, 70*z);
        ctx.fillRect(px - 20*z, y - 65*z, 40*z, 5*z);
        ctx.fillRect(px - 20*z, y - 50*z, 40*z, 5*z);
        // İzolatörler
        ctx.fillStyle = '#888899';
        ctx.beginPath(); ctx.arc(px - 20*z, y - 62*z, 4*z, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 20*z, y - 62*z, 4*z, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px - 20*z, y - 47*z, 4*z, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 20*z, y - 47*z, 4*z, 0, Math.PI*2); ctx.fill();
      };
      drawPole(x - 80*z);
      drawPole(x + 80*z);
      // Kablolar (sarkma eğrisi)
      ctx.strokeStyle = '#333344';
      ctx.lineWidth = 1.5*z;
      const wireY = y - 60*z;
      for (let wire = 0; wire < 2; wire++) {
        const wy = wireY - wire * 15*z;
        ctx.beginPath();
        ctx.moveTo(x - 80*z - 20*z, wy);
        ctx.quadraticCurveTo(x, wy + 20*z, x + 80*z + 20*z, wy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
};

// Tüm prop'ları birleştir (PROP_LIBRARY varsa)
if (typeof PROP_LIBRARY !== 'undefined') {
  Object.assign(PROP_LIBRARY, PROP_LIBRARY_EXTENDED);
}

// =============================================================================
// drawProp — prop çizici (tüm prop tiplerini destekler)
// =============================================================================
function drawProp(ctx, propType, x, y, t, camera) {
  const z = camera ? camera.zoom : 1;
  const sx = camera ? (x - camera.x) * camera.zoom : x;
  const sy = camera ? (y - camera.y) * camera.zoom : y;

  const lib = (typeof PROP_LIBRARY !== 'undefined') ? PROP_LIBRARY : PROP_LIBRARY_EXTENDED;
  const prop = lib[propType];
  if (!prop) return;
  prop.draw(ctx, sx, sy, t, z);
}

// =============================================================================
// DYNAMIC_OBSTACLES — hareketli engel sistemi
// =============================================================================
const DYNAMIC_OBSTACLES = {
  rolling_boulder: {
    defaultRadius: 35,
    defaultSpeed: 120,

    create(x, y, opts) {
      return {
        type: 'rolling_boulder',
        x, y,
        vx: -(opts && opts.speed || this.defaultSpeed),
        vy: 0,
        radius: opts && opts.radius || this.defaultRadius,
        angle: 0,
        active: true,
        respawnX: x
      };
    },

    update(obstacle, dt, terrain) {
      if (!obstacle.active) return;
      obstacle.x += obstacle.vx * dt;
      obstacle.angle += (obstacle.vx / obstacle.radius) * dt;
      // Yerçekimi
      obstacle.vy += 600 * dt;
      obstacle.y += obstacle.vy * dt;
      // Basit zemin çarpışması (terrain.getHeightAt varsa)
      if (terrain && terrain.getHeightAt) {
        const groundY = terrain.getHeightAt(obstacle.x);
        if (obstacle.y + obstacle.radius > groundY) {
          obstacle.y = groundY - obstacle.radius;
          obstacle.vy = -Math.abs(obstacle.vy) * 0.3;
          obstacle.vx *= 0.98;
        }
      }
    },

    draw(ctx, obstacle, camera) {
      if (!obstacle.active) return;
      ctx.save();
      const sx = (obstacle.x - camera.x) * camera.zoom;
      const sy = (obstacle.y - camera.y) * camera.zoom;
      const r = obstacle.radius * camera.zoom;
      ctx.translate(sx, sy);
      ctx.rotate(obstacle.angle);
      // Kaya gövdesi
      ctx.fillStyle = '#8a8070';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      // Desen çizgileri
      ctx.strokeStyle = '#6a6050';
      ctx.lineWidth = 2 * camera.zoom;
      for (let l = 0; l < 4; l++) {
        const la = (l / 4) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(Math.cos(la) * r * 0.5, Math.sin(la) * r * 0.5);
        ctx.lineTo(Math.cos(la) * r * 0.9, Math.sin(la) * r * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  falling_log: {
    create(x, y, opts) {
      return {
        type: 'falling_log',
        x, y,
        startY: y,
        targetY: opts && opts.targetY || y + 200,
        vy: 0,
        angle: opts && opts.angle || 0.3,
        length: opts && opts.length || 120,
        active: true,
        fallen: false
      };
    },

    update(obstacle, dt) {
      if (!obstacle.active || obstacle.fallen) return;
      obstacle.vy += 500 * dt;
      obstacle.y += obstacle.vy * dt;
      if (obstacle.y >= obstacle.targetY) {
        obstacle.y = obstacle.targetY;
        obstacle.fallen = true;
        obstacle.vy = 0;
      }
    },

    draw(ctx, obstacle, camera) {
      if (!obstacle.active) return;
      const sx = (obstacle.x - camera.x) * camera.zoom;
      const sy = (obstacle.y - camera.y) * camera.zoom;
      const len = obstacle.length * camera.zoom;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(obstacle.angle);
      ctx.fillStyle = '#8a5a20';
      ctx.fillRect(-len / 2, -8 * camera.zoom, len, 16 * camera.zoom);
      // Yıllık halkalar
      ctx.strokeStyle = '#6a4010';
      ctx.lineWidth = 1.5 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(-len / 2, 0, 10 * camera.zoom, 8 * camera.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(len / 2, 0, 10 * camera.zoom, 8 * camera.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },

  swinging_pendulum: {
    create(x, y, opts) {
      return {
        type: 'swinging_pendulum',
        pivotX: x, pivotY: y,
        armLength: opts && opts.length || 140,
        angle: 0,
        speed: opts && opts.speed || 1.5,
        amplitude: opts && opts.amplitude || 1.1,
        active: true
      };
    },

    update(obstacle, dt, t) {
      if (!obstacle.active) return;
      obstacle.angle = Math.sin(t * obstacle.speed) * obstacle.amplitude;
    },

    getBallPos(obstacle) {
      return {
        x: obstacle.pivotX + Math.sin(obstacle.angle) * obstacle.armLength,
        y: obstacle.pivotY + Math.cos(obstacle.angle) * obstacle.armLength
      };
    },

    draw(ctx, obstacle, camera) {
      if (!obstacle.active) return;
      const px = (obstacle.pivotX - camera.x) * camera.zoom;
      const py = (obstacle.pivotY - camera.y) * camera.zoom;
      const len = obstacle.armLength * camera.zoom;
      const bx = px + Math.sin(obstacle.angle) * len;
      const by = py + Math.cos(obstacle.angle) * len;
      ctx.save();
      // Pivot
      ctx.fillStyle = '#555566';
      ctx.beginPath();
      ctx.arc(px, py, 6 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      // Kol
      ctx.strokeStyle = '#888899';
      ctx.lineWidth = 4 * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bx, by);
      ctx.stroke();
      // Top
      ctx.fillStyle = '#cc4422';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(bx, by, 18 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  },

  moving_platform: {
    create(x, y, opts) {
      return {
        type: 'moving_platform',
        x, y,
        startX: opts && opts.startX || x,
        endX:   opts && opts.endX   || x + 200,
        speed:  opts && opts.speed  || 80,
        width:  opts && opts.width  || 120,
        height: opts && opts.height || 20,
        direction: 1,
        active: true
      };
    },

    update(obstacle, dt) {
      if (!obstacle.active) return;
      obstacle.x += obstacle.speed * obstacle.direction * dt;
      if (obstacle.x >= obstacle.endX)   { obstacle.x = obstacle.endX;   obstacle.direction = -1; }
      if (obstacle.x <= obstacle.startX) { obstacle.x = obstacle.startX; obstacle.direction =  1; }
    },

    draw(ctx, obstacle, camera) {
      if (!obstacle.active) return;
      const sx = (obstacle.x - camera.x) * camera.zoom;
      const sy = (obstacle.y - camera.y) * camera.zoom;
      const w = obstacle.width * camera.zoom;
      const h = obstacle.height * camera.zoom;
      ctx.save();
      // Platform gövdesi
      const pg = ctx.createLinearGradient(sx, sy, sx, sy + h);
      pg.addColorStop(0, '#8899cc');
      pg.addColorStop(1, '#556699');
      ctx.fillStyle = pg;
      ctx.fillRect(sx - w / 2, sy, w, h);
      // Üst çizgi
      ctx.fillStyle = '#aabbdd';
      ctx.fillRect(sx - w / 2, sy, w, 3 * camera.zoom);
      ctx.restore();
    }
  },

  erupting_geyser: {
    create(x, y, opts) {
      return {
        type: 'erupting_geyser',
        x, y,
        power: opts && opts.power || 1,
        interval: opts && opts.interval || 3.5,
        active: true
      };
    },

    update(obstacle, dt, t) {
      // Erupt durumu zaman tabanlı
      obstacle.erupting = (t % obstacle.interval) < 1.5;
    },

    draw(ctx, obstacle, camera, t) {
      if (!obstacle.active) return;
      const sx = (obstacle.x - camera.x) * camera.zoom;
      const sy = (obstacle.y - camera.y) * camera.zoom;
      const z = camera.zoom;
      ctx.save();
      // Zemin deliği
      ctx.fillStyle = '#555544';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 14*z, 6*z, 0, 0, Math.PI*2);
      ctx.fill();
      // Püskürme
      if (obstacle.erupting) {
        const phase = (t % obstacle.interval) / 1.5;
        const h = Math.sin(phase * Math.PI) * 120 * obstacle.power * z;
        const sg = ctx.createLinearGradient(sx, sy - h, sx, sy);
        sg.addColorStop(0, 'rgba(150,210,255,0)');
        sg.addColorStop(0.4, 'rgba(150,210,255,0.7)');
        sg.addColorStop(1, 'rgba(100,180,255,0.4)');
        ctx.fillStyle = sg;
        ctx.fillRect(sx - 10*z, sy - h, 20*z, h);
        // Damla parçacıkları
        for (let d = 0; d < 6; d++) {
          const dp = ((t * 60 + d * 20) % 80) * z;
          const dx = (Math.sin(d * 1.4) * 30) * z;
          ctx.beginPath();
          ctx.arc(sx + dx, sy - dp, 4*z, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(180,230,255,0.6)';
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }
};

// =============================================================================
// generateObstacleForBiome — biome'a göre rastgele engel oluştur
// =============================================================================
function generateObstacleForBiome(biome, x) {
  const y = -100; // Başlangıç Y (terrain'e göre ayarlanacak)
  switch (biome) {
    case 'volcano':
    case 'lava_world':
      return DYNAMIC_OBSTACLES.rolling_boulder.create(x, y, { radius: 40, speed: 140 });
    case 'forest':
      return DYNAMIC_OBSTACLES.falling_log.create(x, y, { length: 130, angle: 0.2 });
    case 'arctic':
      return DYNAMIC_OBSTACLES.rolling_boulder.create(x, y, { radius: 28, speed: 90 });
    case 'deep_ocean':
      return DYNAMIC_OBSTACLES.swinging_pendulum.create(x, y - 80, { length: 120, speed: 1.2 });
    case 'city':
    case 'village':
      return DYNAMIC_OBSTACLES.moving_platform.create(x, y, { startX: x, endX: x + 250, width: 140 });
    case 'stormy_cliff':
      return DYNAMIC_OBSTACLES.falling_log.create(x, y, { length: 100, angle: 0.5 });
    case 'desert':
      return DYNAMIC_OBSTACLES.erupting_geyser.create(x, y, { power: 1.2, interval: 4 });
    default:
      return DYNAMIC_OBSTACLES.moving_platform.create(x, y, { startX: x, endX: x + 180 });
  }
}

// =============================================================================
// TERRAIN_EVENTS — belirli mesafelerde tetiklenen arazi olayları
// =============================================================================
const TERRAIN_EVENTS = {
  eventTypes: {
    jump_ramp: {
      width: 80,
      angle: 0.45,
      create(x, groundY) {
        return { type: 'jump_ramp', x, groundY, width: 80, angle: 0.45, triggered: false };
      },
      draw(ctx, event, camera) {
        const sx = (event.x - camera.x) * camera.zoom;
        const sy = (event.groundY - camera.y) * camera.zoom;
        const z = camera.zoom;
        ctx.save();
        ctx.fillStyle = '#c8a040';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 80*z, sy);
        ctx.lineTo(sx + 80*z, sy - 35*z);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aa8020';
        ctx.lineWidth = 2*z;
        ctx.stroke();
        // Ok işareti
        ctx.fillStyle = '#ffcc00';
        ctx.font = `bold ${18*z}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('▲', sx + 40*z, sy - 15*z);
        ctx.restore();
      }
    },

    loop: {
      radius: 120,
      create(x, groundY) {
        return { type: 'loop', x, groundY, radius: 120, triggered: false };
      },
      draw(ctx, event, camera) {
        const sx = (event.x - camera.x) * camera.zoom;
        const sy = (event.groundY - camera.y) * camera.zoom;
        const r = event.radius * camera.zoom;
        ctx.save();
        ctx.strokeStyle = '#888899';
        ctx.lineWidth = 12 * camera.zoom;
        ctx.beginPath();
        ctx.arc(sx + r, sy - r, r, 0, Math.PI * 2);
        ctx.stroke();
        // İç dolgu
        ctx.strokeStyle = 'rgba(200,210,255,0.15)';
        ctx.lineWidth = 8 * camera.zoom;
        ctx.beginPath();
        ctx.arc(sx + r, sy - r, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },

    tunnel: {
      width: 300, height: 100,
      create(x, groundY) {
        return { type: 'tunnel', x, groundY, width: 300, height: 100, triggered: false };
      },
      draw(ctx, event, camera) {
        const sx = (event.x - camera.x) * camera.zoom;
        const sy = (event.groundY - camera.y) * camera.zoom;
        const w = event.width * camera.zoom;
        const h = event.height * camera.zoom;
        ctx.save();
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(sx, sy - h, w, h);
        // Tünel girişi kemer
        ctx.fillStyle = '#555566';
        ctx.beginPath();
        ctx.arc(sx + 15 * camera.zoom, sy - h * 0.6, h * 0.5, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + w - 15 * camera.zoom, sy - h * 0.6, h * 0.5, Math.PI, 0);
        ctx.fill();
        ctx.restore();
      }
    },

    bridge: {
      create(x, groundY, opts) {
        return { type: 'bridge', x, groundY, width: opts && opts.width || 250, triggered: false };
      }
    },

    waterfall_crossing: {
      create(x, groundY) {
        return { type: 'waterfall_crossing', x, groundY, width: 80, triggered: false };
      },
      draw(ctx, event, camera, t) {
        const sx = (event.x - camera.x) * camera.zoom;
        const sy = (event.groundY - camera.y) * camera.zoom;
        const z = camera.zoom;
        // Su akışı (dikey)
        for (let s = 0; s < 5; s++) {
          const swx = sx + s * 16*z;
          const flow = (t * 100 + s * 20) % (100*z);
          const wg = ctx.createLinearGradient(swx, sy - 80*z, swx, sy + 20*z);
          wg.addColorStop(0, 'rgba(100,180,255,0)');
          wg.addColorStop(0.3, 'rgba(100,180,255,0.6)');
          wg.addColorStop(1, 'rgba(100,180,255,0.2)');
          ctx.strokeStyle = wg;
          ctx.lineWidth = 4*z;
          ctx.beginPath();
          ctx.moveTo(swx + Math.sin(t*2+s)*5*z, sy - 80*z);
          ctx.lineTo(swx, sy + 20*z);
          ctx.stroke();
        }
      }
    }
  },

  // Belirtilen pozisyonda event oluştur
  create(eventType, x, groundY, opts) {
    const et = this.eventTypes[eventType];
    if (!et) return null;
    return et.create(x, groundY, opts);
  },

  // Event çiz
  draw(ctx, event, camera, t) {
    const et = this.eventTypes[event.type];
    if (!et || !et.draw) return;
    et.draw(ctx, event, camera, t);
  }
};

// =============================================================================
// TUNNEL_RENDERER — tünel içi görünüm
// =============================================================================
const TUNNEL_RENDERER = {
  draw(ctx, tunnel, camera, vehicle, t) {
    if (!tunnel) return;
    const sx = (tunnel.x - camera.x) * camera.zoom;
    const sy = (tunnel.y - camera.y) * camera.zoom;
    const w = tunnel.width * camera.zoom;
    const h = tunnel.height * camera.zoom;
    ctx.save();
    // Tünel karanlığı
    ctx.fillStyle = 'rgba(10,10,20,0.7)';
    ctx.fillRect(sx, sy - h, w, h);
    // Tünel duvarı dokusu
    ctx.strokeStyle = 'rgba(80,80,100,0.5)';
    ctx.lineWidth = 1.5 * camera.zoom;
    for (let s = 0; s < 6; s++) {
      const segX = sx + s * w / 6;
      ctx.beginPath();
      ctx.moveTo(segX, sy);
      ctx.lineTo(segX, sy - h);
      ctx.stroke();
    }
    // Yol çizgileri
    ctx.setLineDash([20 * camera.zoom, 15 * camera.zoom]);
    ctx.strokeStyle = 'rgba(255,255,100,0.4)';
    ctx.lineWidth = 2 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 5 * camera.zoom);
    ctx.lineTo(sx + w, sy - 5 * camera.zoom);
    ctx.stroke();
    ctx.setLineDash([]);
    // Tünel lambalar
    const lampCount = Math.floor(tunnel.width / 60);
    for (let l = 0; l < lampCount; l++) {
      const lx = sx + (l + 0.5) * w / lampCount;
      const ly = sy - h + 10 * camera.zoom;
      const lampG = ctx.createRadialGradient(lx, ly, 0, lx, ly, 35 * camera.zoom);
      lampG.addColorStop(0, 'rgba(255,240,180,0.5)');
      lampG.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = lampG;
      ctx.fillRect(lx - 35 * camera.zoom, ly - 35 * camera.zoom, 70 * camera.zoom, 70 * camera.zoom);
      // Lamba noktası
      ctx.fillStyle = '#ffee99';
      ctx.beginPath();
      ctx.arc(lx, ly, 4 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// =============================================================================
// drawBridge — köprü çizimi
// =============================================================================
function drawBridge(ctx, x1, y1, x2, y2, camera) {
  const sx1 = (x1 - camera.x) * camera.zoom;
  const sy1 = (y1 - camera.y) * camera.zoom;
  const sx2 = (x2 - camera.x) * camera.zoom;
  const sy2 = (y2 - camera.y) * camera.zoom;
  const z = camera.zoom;
  ctx.save();
  const bridgeH = 12 * z;
  // Köprü zemini
  const bg = ctx.createLinearGradient(sx1, sy1, sx1, sy1 + bridgeH);
  bg.addColorStop(0, '#888899');
  bg.addColorStop(1, '#666677');
  ctx.fillStyle = bg;
  ctx.fillRect(sx1, sy1, sx2 - sx1, bridgeH);
  // Köprü korkulukları
  ctx.strokeStyle = '#aaaacc';
  ctx.lineWidth = 2.5 * z;
  ctx.beginPath();
  ctx.moveTo(sx1, sy1 - 20 * z);
  ctx.lineTo(sx2, sy2 - 20 * z);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx1, sy1 + bridgeH + 5 * z);
  ctx.lineTo(sx2, sy2 + bridgeH + 5 * z);
  ctx.stroke();
  // Dikey destek çubukları
  const segCount = Math.max(2, Math.floor((sx2 - sx1) / (30 * z)));
  for (let i = 0; i <= segCount; i++) {
    const px = sx1 + (sx2 - sx1) * (i / segCount);
    const py = sy1 + (sy2 - sy1) * (i / segCount);
    ctx.beginPath();
    ctx.moveTo(px, py - 20 * z);
    ctx.lineTo(px, py + bridgeH + 5 * z);
    ctx.stroke();
  }
  // Kablo askı sistemi
  const midX = (sx1 + sx2) / 2;
  const midY = Math.max(sy1, sy2) - 60 * z;
  ctx.strokeStyle = '#888899';
  ctx.lineWidth = 2 * z;
  // Ana kablo
  ctx.beginPath();
  ctx.moveTo(sx1, sy1 - 20 * z);
  ctx.quadraticCurveTo(midX, midY, sx2, sy2 - 20 * z);
  ctx.stroke();
  // Askı telleri
  for (let i = 1; i < segCount; i++) {
    const hx = sx1 + (sx2 - sx1) * (i / segCount);
    const hy = sy1 + (sy2 - sy1) * (i / segCount) - 20 * z;
    const t2 = i / segCount;
    const cableY = sy1 * (1 - t2) + sy2 * t2 - 20 * z;
    const cablePt = cableY + ((midY - (sy1 - 20 * z)) * Math.sin(t2 * Math.PI));
    ctx.beginPath();
    ctx.moveTo(hx, cablePt);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  }
  ctx.restore();
}

// =============================================================================
// LOOP_GENERATOR — tam loop arazi kodu üretici
// =============================================================================
const LOOP_GENERATOR = {
  // Tam döngü için kontrol noktaları üret
  generatePoints(cx, cy, radius, segments) {
    segments = segments || 36;
    const points = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    }
    return points;
  },

  // Loop çiz
  draw(ctx, cx, cy, radius, camera, t) {
    const sx = (cx - camera.x) * camera.zoom;
    const sy = (cy - camera.y) * camera.zoom;
    const r = radius * camera.zoom;
    const z = camera.zoom;
    ctx.save();
    // Loop yüzeyi
    ctx.strokeStyle = '#888899';
    ctx.lineWidth = 18 * z;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Kenar çizgileri
    ctx.strokeStyle = '#aabbcc';
    ctx.lineWidth = 3 * z;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 9 * z, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, r - 9 * z, 0, Math.PI * 2);
    ctx.stroke();
    // Dama deseni
    const segCount = 24;
    for (let i = 0; i < segCount; i++) {
      if (i % 2 === 0) {
        const a1 = (i / segCount) * Math.PI * 2;
        const a2 = ((i + 1) / segCount) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r + 9 * z, a1, a2);
        ctx.arc(sx, sy, r - 9 * z, a2, a1, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fill();
      }
    }
    ctx.restore();
  }
};

// =============================================================================
// UNDERGROUND_TERRAIN — mağara sistemi render
// =============================================================================
const UNDERGROUND_TERRAIN = {
  draw(ctx, caveData, camera, t) {
    if (!caveData) return;
    ctx.save();
    // Tavan
    if (caveData.ceiling && caveData.ceiling.length > 1) {
      ctx.fillStyle = '#2a2a3a';
      ctx.beginPath();
      const first = caveData.ceiling[0];
      ctx.moveTo((first.x - camera.x) * camera.zoom, 0);
      ctx.lineTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom);
      for (const pt of caveData.ceiling) {
        ctx.lineTo((pt.x - camera.x) * camera.zoom, (pt.y - camera.y) * camera.zoom);
      }
      const last = caveData.ceiling[caveData.ceiling.length - 1];
      ctx.lineTo((last.x - camera.x) * camera.zoom, 0);
      ctx.closePath();
      ctx.fill();
      // Sarkıtlar (stalactites)
      ctx.fillStyle = '#3a3a4a';
      for (let i = 0; i < caveData.ceiling.length - 2; i += 3) {
        const pt = caveData.ceiling[i];
        const sx = (pt.x - camera.x) * camera.zoom;
        const sy = (pt.y - camera.y) * camera.zoom;
        const stalLen = (15 + i % 25) * camera.zoom;
        ctx.beginPath();
        ctx.moveTo(sx - 5 * camera.zoom, sy);
        ctx.lineTo(sx, sy + stalLen);
        ctx.lineTo(sx + 5 * camera.zoom, sy);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Kristal parıltıları
    for (let c = 0; c < 8; c++) {
      if (!caveData.crystalPoints || !caveData.crystalPoints[c]) continue;
      const cp = caveData.crystalPoints[c];
      const cx = (cp.x - camera.x) * camera.zoom;
      const cy = (cp.y - camera.y) * camera.zoom;
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + c * 0.8);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * camera.zoom);
      cg.addColorStop(0, `rgba(${cp.r || 100},${cp.g || 100},${cp.b || 255},${0.6 * pulse})`);
      cg.addColorStop(1, 'rgba(0,0,50,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(cx - 30 * camera.zoom, cy - 30 * camera.zoom, 60 * camera.zoom, 60 * camera.zoom);
    }
    ctx.restore();
  }
};

// =============================================================================
// LAVA_TERRAIN — lav akışı animasyonlu yüzey
// =============================================================================
const LAVA_TERRAIN = {
  draw(ctx, lavaPoints, camera, t) {
    if (!lavaPoints || lavaPoints.length < 2) return;
    ctx.save();
    // Lav gövdesi
    ctx.beginPath();
    const first = lavaPoints[0];
    ctx.moveTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom);
    for (const pt of lavaPoints) {
      const px = (pt.x - camera.x) * camera.zoom;
      const py = (pt.y - camera.y) * camera.zoom + Math.sin(pt.x * 0.02 + t * 3) * 4 * camera.zoom;
      ctx.lineTo(px, py);
    }
    const last = lavaPoints[lavaPoints.length - 1];
    ctx.lineTo((last.x - camera.x) * camera.zoom, (last.y - camera.y) * camera.zoom + 80 * camera.zoom);
    ctx.lineTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom + 80 * camera.zoom);
    ctx.closePath();
    const lg = ctx.createLinearGradient(0, 0, 0, 80 * camera.zoom);
    lg.addColorStop(0, '#ff4400');
    lg.addColorStop(0.3, '#cc2200');
    lg.addColorStop(1, '#881100');
    ctx.fillStyle = lg;
    ctx.fill();

    // Yüzey kabarcıkları
    for (let b = 0; b < 12; b++) {
      const bPhase = ((t * 1.5 + b * 0.7) % 2);
      if (bPhase > 1.5) continue;
      const bPt = lavaPoints[Math.floor((b / 12) * lavaPoints.length)];
      if (!bPt) continue;
      const bx = (bPt.x - camera.x) * camera.zoom;
      const by = (bPt.y - camera.y) * camera.zoom;
      const br = bPhase * 8 * camera.zoom;
      ctx.beginPath();
      ctx.arc(bx, by - br, br, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,${100 + Math.floor(bPhase * 100)},0,${1 - bPhase / 1.5})`;
      ctx.lineWidth = 2 * camera.zoom;
      ctx.stroke();
    }

    // Kızgın çatlak çizgileri
    ctx.strokeStyle = 'rgba(255,200,50,0.5)';
    ctx.lineWidth = 1.5 * camera.zoom;
    for (let c = 0; c < lavaPoints.length - 3; c += 4) {
      const pt = lavaPoints[c];
      const px = (pt.x - camera.x) * camera.zoom;
      const py = (pt.y - camera.y) * camera.zoom;
      const bright = 0.4 + 0.6 * Math.sin(px * 0.05 + t * 4);
      ctx.strokeStyle = `rgba(255,${150 + Math.floor(bright * 100)},0,${bright * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 18 * camera.zoom, py + 8 * camera.zoom);
      ctx.lineTo(px + 8 * camera.zoom, py + 18 * camera.zoom);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// =============================================================================
// WATER_TERRAIN — su geçidi terrain tipi
// =============================================================================
const WATER_TERRAIN = {
  draw(ctx, waterPoints, camera, t) {
    if (!waterPoints || waterPoints.length < 2) return;
    ctx.save();
    // Su gövdesi
    ctx.beginPath();
    const first = waterPoints[0];
    ctx.moveTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom);
    for (const pt of waterPoints) {
      const px = (pt.x - camera.x) * camera.zoom;
      const py = (pt.y - camera.y) * camera.zoom + Math.sin(pt.x * 0.015 + t * 2.5) * 5 * camera.zoom;
      ctx.lineTo(px, py);
    }
    const last = waterPoints[waterPoints.length - 1];
    ctx.lineTo((last.x - camera.x) * camera.zoom, (last.y - camera.y) * camera.zoom + 60 * camera.zoom);
    ctx.lineTo((first.x - camera.x) * camera.zoom, (first.y - camera.y) * camera.zoom + 60 * camera.zoom);
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, 0, 0, 60 * camera.zoom);
    wg.addColorStop(0, 'rgba(30,140,220,0.88)');
    wg.addColorStop(1, 'rgba(10,70,140,0.95)');
    ctx.fillStyle = wg;
    ctx.fill();
    // Yüzey yansımaları
    for (let r = 0; r < waterPoints.length - 2; r += 3) {
      const pt = waterPoints[r];
      const rx = (pt.x - camera.x) * camera.zoom;
      const ry = (pt.y - camera.y) * camera.zoom;
      const alpha = 0.2 + 0.15 * Math.sin(rx * 0.05 + t * 3);
      ctx.strokeStyle = `rgba(180,230,255,${alpha})`;
      ctx.lineWidth = 1.5 * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(rx - 12 * camera.zoom, ry);
      ctx.lineTo(rx + 12 * camera.zoom, ry + Math.sin(t * 3 + rx) * 3 * camera.zoom);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// =============================================================================
// getTerrainColorAtX — x pozisyonuna göre zemin rengi
// =============================================================================
function getTerrainColorAtX(mapId, x) {
  const biomeColors = {
    'village':       { r: 80,  g: 140, b: 60  },
    'arctic':        { r: 180, g: 220, b: 255 },
    'desert':        { r: 210, g: 170, b: 80  },
    'volcano':       { r: 80,  g: 40,  b: 20  },
    'forest':        { r: 40,  g: 110, b: 40  },
    'city':          { r: 100, g: 100, b: 115 },
    'space_station': { r: 30,  g: 30,  b: 50  },
    'deep_ocean':    { r: 20,  g: 80,  b: 160 },
    'lava_world':    { r: 180, g: 50,  b: 10  },
    'crystal_cave':  { r: 80,  g: 50,  b: 160 },
    'stormy_cliff':  { r: 70,  g: 80,  b: 90  }
  };
  const base = biomeColors[mapId] || { r: 100, g: 100, b: 100 };
  // X pozisyonuna göre hafif varyasyon
  const variation = Math.sin(x * 0.001) * 15;
  return {
    r: Math.max(0, Math.min(255, base.r + variation)),
    g: Math.max(0, Math.min(255, base.g + variation * 0.5)),
    b: Math.max(0, Math.min(255, base.b - variation * 0.3)),
    css: `rgb(${Math.floor(base.r + variation)},${Math.floor(base.g + variation * 0.5)},${Math.floor(base.b - variation * 0.3)})`
  };
}

// =============================================================================
// BIOME_TRANSITION — biome geçiş gradyanları
// =============================================================================
const BIOME_TRANSITION = {
  transitions: {},

  // Geçiş tanımla
  define(fromBiome, toBiome, startX, endX) {
    const key = `${fromBiome}->${toBiome}`;
    this.transitions[key] = { fromBiome, toBiome, startX, endX };
  },

  // x konumunda geçiş faktörü (0=tam from, 1=tam to)
  getFactor(fromBiome, toBiome, x) {
    const key = `${fromBiome}->${toBiome}`;
    const trans = this.transitions[key];
    if (!trans) return 0;
    const t = (x - trans.startX) / (trans.endX - trans.startX);
    // Smooth step
    const clamped = Math.max(0, Math.min(1, t));
    return clamped * clamped * (3 - 2 * clamped);
  },

  // Geçiş overlay çiz
  drawTransitionOverlay(ctx, W, H, fromBiome, toBiome, x, startX, endX) {
    const t = Math.max(0, Math.min(1, (x - startX) / (endX - startX)));
    const smooth = t * t * (3 - 2 * t);
    if (smooth <= 0 || smooth >= 1) return;

    const fromColor = getTerrainColorAtX(fromBiome, x);
    const toColor = getTerrainColorAtX(toBiome, x);

    ctx.save();
    // Geçiş şeridi
    const grad = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, 0);
    grad.addColorStop(0, `rgba(${fromColor.r},${fromColor.g},${fromColor.b},0)`);
    grad.addColorStop(0.5, `rgba(${Math.floor(fromColor.r * (1-smooth) + toColor.r * smooth)},${Math.floor(fromColor.g * (1-smooth) + toColor.g * smooth)},${Math.floor(fromColor.b * (1-smooth) + toColor.b * smooth)},0.3)`);
    grad.addColorStop(1, `rgba(${toColor.r},${toColor.g},${toColor.b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
};

// =============================================================================
// 5 yeni harita tanımı
// =============================================================================
const NEW_MAP_DEFINITIONS = {
  space_station: {
    id: 'space_station',
    name: 'Space Station',
    biome: 'space_station',
    gravity: 0.35,
    friction: 0.7,
    description: 'Zero-G racing through orbital platforms',
    bgColor: '#020212',
    terrainStyle: {
      surface: '#44445a',
      edge: '#6666aa',
      fill: '#22223a'
    },
    weather: BIOME_WEATHER['space_station'],
    props: ['satellite_dish', 'spacecraft_crash', 'power_lines'],
    obstacles: ['moving_platform', 'swinging_pendulum'],
    events: ['loop', 'jump_ramp'],
    terrainProfile: 'metallic_platforms',
    music: 'ambient_space',
    unlockCost: 12000,
    thumbnail: null
  },

  deep_ocean: {
    id: 'deep_ocean',
    name: 'Deep Ocean Trench',
    biome: 'deep_ocean',
    gravity: 0.6,
    friction: 0.5,
    description: 'Drive along the ocean floor, avoid the currents',
    bgColor: '#051525',
    terrainStyle: {
      surface: '#1a4060',
      edge: '#2a6090',
      fill: '#0a2040'
    },
    weather: BIOME_WEATHER['deep_ocean'],
    props: ['waterfall', 'ruins', 'waterfall'],
    obstacles: ['swinging_pendulum', 'erupting_geyser'],
    events: ['tunnel', 'waterfall_crossing', 'bridge'],
    terrainProfile: 'ocean_floor',
    music: 'ambient_underwater',
    unlockCost: 15000,
    thumbnail: null
  },

  lava_world: {
    id: 'lava_world',
    name: 'Lava World',
    biome: 'lava_world',
    gravity: 1.0,
    friction: 0.8,
    description: 'Hellfire racing through rivers of molten rock',
    bgColor: '#1a0800',
    terrainStyle: {
      surface: '#aa3300',
      edge: '#ff6600',
      fill: '#661100'
    },
    weather: BIOME_WEATHER['lava_world'],
    props: ['geyser', 'ruins', 'campfire'],
    obstacles: ['rolling_boulder', 'erupting_geyser'],
    events: ['jump_ramp', 'loop'],
    terrainProfile: 'volcanic',
    music: 'intense_drums',
    unlockCost: 18000,
    thumbnail: null
  },

  crystal_cave: {
    id: 'crystal_cave',
    name: 'Crystal Cave',
    biome: 'crystal_cave',
    gravity: 0.85,
    friction: 0.65,
    description: 'Navigate through glittering crystal formations',
    bgColor: '#080520',
    terrainStyle: {
      surface: '#3a1a60',
      edge: '#8844cc',
      fill: '#1a0a40'
    },
    weather: BIOME_WEATHER['crystal_cave'],
    props: ['ruins', 'stonehenge'],
    obstacles: ['falling_log', 'swinging_pendulum'],
    events: ['tunnel', 'loop', 'jump_ramp'],
    terrainProfile: 'cave_system',
    music: 'mystic_crystal',
    unlockCost: 20000,
    thumbnail: null
  },

  stormy_cliff: {
    id: 'stormy_cliff',
    name: 'Stormy Cliff',
    biome: 'stormy_cliff',
    gravity: 1.0,
    friction: 0.75,
    description: 'Race along crumbling clifftops in a violent storm',
    bgColor: '#0d1520',
    terrainStyle: {
      surface: '#555566',
      edge: '#7788aa',
      fill: '#334455'
    },
    weather: BIOME_WEATHER['stormy_cliff'],
    props: ['lighthouse', 'power_lines', 'billboard'],
    obstacles: ['falling_log', 'rolling_boulder'],
    events: ['jump_ramp', 'bridge', 'waterfall_crossing'],
    terrainProfile: 'cliff_edge',
    music: 'stormy_electric',
    unlockCost: 22000,
    thumbnail: null
  }
};

// Mevcut MAP_DEFINITIONS ile birleştir
if (typeof MAP_DEFINITIONS !== 'undefined') {
  Object.assign(MAP_DEFINITIONS, NEW_MAP_DEFINITIONS);
}



// ============================================================
// CAVE_SYSTEM — mağara arazi üretici
// ============================================================
const CAVE_SYSTEM = {

  generateCave(seed, length) {
    const rng = this._seededRng(seed || 7777);
    const points = [];
    let y = 0, ceilY = -120;
    for (let x = 0; x <= length; x += 60) {
      y += (rng() - 0.5) * 60;
      y = Math.max(-200, Math.min(200, y));
      ceilY = y - (80 + rng() * 60);
      points.push({ x, floorY: y, ceilY });
    }
    return { seed, length, points };
  },

  _seededRng(seed) {
    let s = seed % 2147483647;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  },

  CAVE_PROPS: {
    stalactite: {
      draw(ctx, x, y, size) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size * 0.3, y + size);
        ctx.lineTo(x + size * 0.3, y + size);
        ctx.closePath();
        const sg = ctx.createLinearGradient(x, y, x, y + size);
        sg.addColorStop(0, '#8a7a6a');
        sg.addColorStop(1, '#5a4a3a');
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.restore();
      }
    },
    stalagmite: {
      draw(ctx, x, y, size) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size * 0.3, y - size);
        ctx.lineTo(x + size * 0.3, y - size);
        ctx.closePath();
        const sg = ctx.createLinearGradient(x, y, x, y - size);
        sg.addColorStop(0, '#7a6a5a');
        sg.addColorStop(1, '#4a3a2a');
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.restore();
      }
    },
    crystal: {
      draw(ctx, x, y, size, t) {
        ctx.save();
        const pulse = 0.8 + Math.sin((t || 0) * 3 + x * 0.05) * 0.2;
        ctx.globalAlpha = pulse;
        for (let f = 0; f < 3; f++) {
          const fa = (f / 3) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(
            x + Math.cos(fa) * size * 0.4,
            y + Math.sin(fa) * size * 0.4
          );
          ctx.lineTo(
            x + Math.cos(fa + 0.4) * size,
            y + Math.sin(fa + 0.4) * size - size * 1.5
          );
          ctx.lineTo(
            x + Math.cos(fa - 0.4) * size,
            y + Math.sin(fa - 0.4) * size - size * 1.5
          );
          ctx.closePath();
          const cg = ctx.createLinearGradient(x, y, x, y - size * 2);
          cg.addColorStop(0, '#4488ff');
          cg.addColorStop(0.5, '#88ccff');
          cg.addColorStop(1, '#ffffff');
          ctx.fillStyle = cg;
          ctx.fill();
        }
        ctx.globalAlpha = 0.6 * pulse;
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(x, y - size * 1.2, size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#aaddff';
        ctx.fill();
        ctx.restore();
      }
    },
    underground_lake: {
      draw(ctx, x, y, width, t) {
        ctx.save();
        const ripple = Math.sin((t || 0) * 2) * 4;
        const lg = ctx.createLinearGradient(x, y, x, y + 25);
        lg.addColorStop(0, 'rgba(0,60,120,0.8)');
        lg.addColorStop(1, 'rgba(0,30,80,0.9)');
        ctx.beginPath();
        ctx.ellipse(x, y + ripple * 0.3, width, 18, 0, 0, Math.PI * 2);
        ctx.fillStyle = lg;
        ctx.fill();
        // Surface shimmer
        ctx.globalAlpha = 0.4;
        for (let r = 0; r < 4; r++) {
          ctx.beginPath();
          ctx.ellipse(
            x + (r - 2) * width * 0.2,
            y - 5 + ripple * 0.5,
            width * (0.1 + r * 0.05),
            4,
            0, 0, Math.PI * 2
          );
          ctx.strokeStyle = '#88ccff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
    },
    lava_pool: {
      draw(ctx, x, y, width, t) {
        ctx.save();
        const glow = 0.7 + Math.sin((t || 0) * 4) * 0.3;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 30 * glow;
        const lpg = ctx.createRadialGradient(x, y, 0, x, y, width);
        lpg.addColorStop(0, `rgba(255,200,0,${glow})`);
        lpg.addColorStop(0.4, `rgba(255,80,0,${glow * 0.8})`);
        lpg.addColorStop(1, 'rgba(180,20,0,0.4)');
        ctx.beginPath();
        ctx.ellipse(x, y, width, width * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = lpg;
        ctx.fill();
        // Bubbles
        for (let b = 0; b < 5; b++) {
          const bph = ((t || 0) * 2 + b * 1.3) % (Math.PI * 2);
          const br = 3 + b * 1.5;
          const bx = x + Math.cos(bph + b) * width * 0.5;
          const by = y - Math.sin(bph) * 10 - 5;
          ctx.globalAlpha = 0.7 * glow;
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = '#ffcc00';
          ctx.fill();
        }
        ctx.restore();
      }
    }
  },

  drawCaveBackground(ctx, W, H, camX, camY, t) {
    ctx.save();
    // Dark cave ambient
    const bgGrad = ctx.createRadialGradient(W*0.5, H*0.5, 0, W*0.5, H*0.5, W*0.85);
    bgGrad.addColorStop(0, '#1a1210');
    bgGrad.addColorStop(0.5, '#0d0a08');
    bgGrad.addColorStop(1, '#050302');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    // Moisture drips on walls
    ctx.globalAlpha = 0.3;
    for (let d = 0; d < 12; d++) {
      const dx = ((d * 3271 + 100) % 100) / 100 * W;
      const dy = (((t * 30 + d * 80) % (H * 0.8)));
      ctx.beginPath();
      ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#4488aa';
      ctx.fill();
    }
    // Faint bioluminescent patches
    ctx.globalAlpha = 0.15;
    for (let g = 0; g < 6; g++) {
      const gx = ((g * 5381 + 200) % 100) / 100 * W;
      const gy = ((g * 4447 + 50) % 100) / 100 * H;
      const gr = 40 + g * 20;
      const gGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gGrad.addColorStop(0, '#00ff88');
      gGrad.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.08 + Math.sin(t * 0.8 + g) * 0.04;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fillStyle = gGrad;
      ctx.fill();
    }
    ctx.restore();
  }
};

// ============================================================
// PROCEDURAL_DETAILS — mesafeye göre arazi detayları
// ============================================================
const PROCEDURAL_DETAILS = {

  addRockClusters(terrain, seed) {
    const rng = (idx) => ((seed * (idx + 1) * 6271) % 9973) / 9973;
    const clusters = [];
    for (let i = 0; i < terrain.length; i += 8) {
      if (rng(i) > 0.55) {
        const pt = terrain[i];
        if (!pt) continue;
        const clusterSize = Math.floor(rng(i+1) * 5) + 2;
        const rocks = [];
        for (let r = 0; r < clusterSize; r++) {
          rocks.push({
            dx: (rng(i*10+r) - 0.5) * 80,
            dy: -(rng(i*10+r+1) * 20),
            size: 6 + rng(i*10+r+2) * 18,
            angle: rng(i*10+r+3) * Math.PI,
            color: `hsl(${20+rng(i*10+r+4)*30},${15+rng(i*10+r+5)*20}%,${30+rng(i*10+r+6)*25}%)`
          });
        }
        clusters.push({ x: pt.x, y: pt.y, rocks });
      }
    }
    return clusters;
  },

  addVegetation(terrain, biome) {
    const plants = [];
    const biomeMap = {
      forest: { types: ['tree_pine','tree_oak','bush','fern'], density: 0.35, color: '#2a6a1a' },
      desert: { types: ['cactus','dead_tree','tumbleweed'], density: 0.18, color: '#c8a040' },
      arctic: { types: ['ice_crystal','snow_mound','frozen_tree'], density: 0.22, color: '#aaccff' },
      swamp:  { types: ['mangrove','lily_pad','reed','mushroom'], density: 0.4, color: '#3a5a1a' },
      volcanic:{ types: ['lava_rock','ash_mound','obsidian'], density: 0.15, color: '#4a2a1a' }
    };
    const bm = biomeMap[biome] || biomeMap.forest;
    const seed = biome ? biome.charCodeAt(0) * 1337 : 42;
    const rng = (idx) => ((seed * (idx + 1) * 4447) % 7919) / 7919;
    for (let i = 0; i < terrain.length; i++) {
      if (rng(i) < bm.density) {
        const pt = terrain[i];
        if (!pt) continue;
        plants.push({
          x: pt.x,
          y: pt.y,
          type: bm.types[Math.floor(rng(i*3) * bm.types.length)],
          scale: 0.6 + rng(i*3+1) * 0.9,
          flip: rng(i*3+2) > 0.5,
          color: bm.color
        });
      }
    }
    return plants;
  },

  addDebris(terrain) {
    const debrisTypes = [
      'tire', 'barrel', 'crate', 'scrap_metal', 'broken_car',
      'fuel_can', 'toolbox', 'cone', 'sandbag', 'log'
    ];
    const result = [];
    const seed = 9999;
    const rng = (i) => ((seed * (i + 13) * 3571) % 6269) / 6269;
    for (let i = 0; i < terrain.length; i += 5) {
      if (rng(i) > 0.78) {
        const pt = terrain[i];
        if (!pt) continue;
        result.push({
          x: pt.x + (rng(i+1) - 0.5) * 40,
          y: pt.y,
          type: debrisTypes[Math.floor(rng(i+2) * debrisTypes.length)],
          angle: (rng(i+3) - 0.5) * Math.PI * 0.5,
          scale: 0.5 + rng(i+4) * 0.8,
          interactable: rng(i+5) > 0.6,
          collectible: rng(i+6) > 0.8,
          value: Math.floor(rng(i+7) * 50) + 5
        });
      }
    }
    return result;
  }
};

// ============================================================
// TERRAIN_AUDIO_TRIGGERS — arazi ses tetikleme
// ============================================================
const TERRAIN_AUDIO_TRIGGERS = [
  { surfaceType: 'dirt',      sound: 'dirt_roll',      volume: 0.55, pitchVariance: 0.12 },
  { surfaceType: 'grass',     sound: 'grass_whoosh',   volume: 0.45, pitchVariance: 0.15 },
  { surfaceType: 'rock',      sound: 'rock_grind',     volume: 0.70, pitchVariance: 0.08 },
  { surfaceType: 'sand',      sound: 'sand_hiss',      volume: 0.40, pitchVariance: 0.20 },
  { surfaceType: 'mud',       sound: 'mud_squelch',    volume: 0.65, pitchVariance: 0.18 },
  { surfaceType: 'ice',       sound: 'ice_scrape',     volume: 0.50, pitchVariance: 0.06 },
  { surfaceType: 'water',     sound: 'water_splash',   volume: 0.60, pitchVariance: 0.14 },
  { surfaceType: 'lava',      sound: 'lava_sizzle',    volume: 0.80, pitchVariance: 0.10 },
  { surfaceType: 'metal',     sound: 'metal_clank',    volume: 0.75, pitchVariance: 0.05 },
  { surfaceType: 'wood',      sound: 'wood_creak',     volume: 0.55, pitchVariance: 0.16 },
  { surfaceType: 'snow',      sound: 'snow_crunch',    volume: 0.45, pitchVariance: 0.20 },
  { surfaceType: 'gravel',    sound: 'gravel_scatter', volume: 0.58, pitchVariance: 0.14 },
  { surfaceType: 'concrete',  sound: 'tire_squeal',    volume: 0.65, pitchVariance: 0.07 },
  { surfaceType: 'asphalt',   sound: 'tire_roll',      volume: 0.42, pitchVariance: 0.06 }
];

function getTerrainAudioTrigger(surfaceType) {
  return TERRAIN_AUDIO_TRIGGERS.find(t => t.surfaceType === surfaceType) || null;
}

// ============================================================
// SPECIAL_TERRAIN_EVENTS — 10 özel arazi eventi
// ============================================================
const SPECIAL_TERRAIN_EVENTS = {
  earthquake: {
    name: 'Earthquake',
    duration: 4500,
    shakeAmplitude: 18,
    shakeFreq: 22,
    debrisCount: 25,
    cameraShake: true,
    trigger(gameState) {
      if (gameState) {
        gameState.cameraShakeIntensity = 18;
        gameState.terrainDeforming = true;
      }
    },
    update(progress, gameState) {
      if (gameState) {
        const fade = progress < 0.8 ? 1.0 : (1 - progress) / 0.2;
        gameState.cameraShakeIntensity = 18 * fade * (0.6 + Math.random() * 0.4);
      }
    },
    end(gameState) {
      if (gameState) {
        gameState.cameraShakeIntensity = 0;
        gameState.terrainDeforming = false;
      }
    }
  },

  meteor_strike: {
    name: 'Meteor Strike',
    duration: 3000,
    warningTime: 1500,
    craterRadius: 80,
    impactForce: 8000,
    trigger(gameState, targetX) {
      if (gameState) gameState.meteorTarget = targetX;
    },
    update(progress, gameState) {
      if (gameState && progress >= 0.5) {
        if (!gameState.meteorImpacted) {
          gameState.meteorImpacted = true;
          gameState.cameraShakeIntensity = 25;
          setTimeout(() => { if (gameState) gameState.cameraShakeIntensity = 0; }, 800);
        }
      }
    },
    end(gameState) {
      if (gameState) { gameState.meteorImpacted = false; gameState.meteorTarget = null; }
    }
  },

  avalanche: {
    name: 'Avalanche',
    duration: 6000,
    snowballCount: 40,
    speedRange: [150, 380],
    trigger(gameState) { if (gameState) gameState.avalancheActive = true; },
    end(gameState) { if (gameState) gameState.avalancheActive = false; }
  },

  flood: {
    name: 'Flood',
    duration: 8000,
    waterRiseRate: 2.5,
    maxWaterLevel: 120,
    trigger(gameState) { if (gameState) { gameState.floodActive = true; gameState.waterLevel = 0; } },
    update(progress, gameState) {
      if (gameState && gameState.floodActive) {
        gameState.waterLevel = Math.min(120, progress * 120 * 1.3);
      }
    },
    end(gameState) {
      if (gameState) { gameState.floodActive = false; gameState.waterLevel = 0; }
    }
  },

  tornado: {
    name: 'Tornado',
    duration: 7000,
    radius: 140,
    pullForce: 320,
    movementSpeed: 80,
    trigger(gameState, x) { if (gameState) { gameState.tornadoActive = true; gameState.tornadoX = x || 0; } },
    update(progress, gameState) {
      if (gameState && gameState.tornadoActive) {
        gameState.tornadoX = (gameState.tornadoX || 0) + 80 * (1/60);
      }
    },
    end(gameState) { if (gameState) gameState.tornadoActive = false; }
  },

  fog_bank: {
    name: 'Fog Bank',
    duration: 10000,
    maxDensity: 0.88,
    visibilityRange: 180,
    trigger(gameState) { if (gameState) gameState.fogDensity = 0; },
    update(progress, gameState) {
      if (gameState) {
        const peak = progress < 0.3 ? progress / 0.3 : progress > 0.7 ? (1 - progress) / 0.3 : 1.0;
        gameState.fogDensity = 0.88 * peak;
      }
    },
    end(gameState) { if (gameState) gameState.fogDensity = 0; }
  },

  sunrise: {
    name: 'Sunrise',
    duration: 12000,
    colorFrom: { r:20, g:10, b:30 },
    colorTo:   { r:135, g:180, b:255 },
    trigger(gameState) { if (gameState) gameState.skyEvent = 'sunrise'; },
    update(progress, gameState) {
      if (gameState) gameState.skyProgress = progress;
    },
    end(gameState) { if (gameState) gameState.skyEvent = null; }
  },

  sunset: {
    name: 'Sunset',
    duration: 12000,
    colorFrom: { r:135, g:180, b:255 },
    colorTo:   { r:20, g:10, b:30 },
    goldenHourColor: '#ff8822',
    trigger(gameState) { if (gameState) gameState.skyEvent = 'sunset'; },
    update(progress, gameState) {
      if (gameState) gameState.skyProgress = progress;
    },
    end(gameState) { if (gameState) gameState.skyEvent = null; }
  },

  shooting_star: {
    name: 'Shooting Star',
    duration: 2500,
    trailLength: 220,
    trigger(gameState) {
      if (gameState) {
        gameState.shootingStarActive = true;
        gameState.shootingStarX = Math.random() * 800;
        gameState.shootingStarY = 20;
        gameState.shootingStarAngle = Math.PI * 0.3;
      }
    },
    update(progress, gameState) {
      if (gameState && gameState.shootingStarActive) {
        gameState.shootingStarX += 5;
        gameState.shootingStarY += 3;
      }
    },
    end(gameState) { if (gameState) gameState.shootingStarActive = false; }
  },

  rainbow: {
    name: 'Rainbow',
    duration: 14000,
    arcColors: ['#ff0000','#ff8800','#ffff00','#00cc00','#0066ff','#4400cc','#8800cc'],
    opacity: 0.45,
    trigger(gameState) { if (gameState) gameState.rainbowVisible = true; },
    update(progress, gameState) {
      if (gameState) {
        const fade = progress < 0.15 ? progress / 0.15 : progress > 0.85 ? (1 - progress) / 0.15 : 1.0;
        gameState.rainbowOpacity = 0.45 * fade;
      }
    },
    end(gameState) { if (gameState) { gameState.rainbowVisible = false; gameState.rainbowOpacity = 0; } }
  }
};

function triggerTerrainEvent(eventName, gameState, extraArg) {
  const ev = SPECIAL_TERRAIN_EVENTS[eventName];
  if (!ev) return null;
  ev.trigger(gameState, extraArg);
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / ev.duration);
    if (typeof ev.update === 'function') ev.update(progress, gameState);
    if (progress >= 1) {
      clearInterval(interval);
      if (typeof ev.end === 'function') ev.end(gameState);
    }
  }, 32);
  return interval;
}

// ============================================================
// SURFACE_MATERIAL_PROPERTIES — her yüzey için render özellikleri
// ============================================================
const SURFACE_MATERIAL_PROPERTIES = {
  dirt:     { color:'#8b6040', roughness:0.78, reflectivity:0.04, emissive:false, texture_freq:0.18 },
  grass:    { color:'#3a7a20', roughness:0.82, reflectivity:0.06, emissive:false, texture_freq:0.28 },
  rock:     { color:'#777777', roughness:0.92, reflectivity:0.12, emissive:false, texture_freq:0.08 },
  sand:     { color:'#c8a050', roughness:0.65, reflectivity:0.08, emissive:false, texture_freq:0.35 },
  mud:      { color:'#5a3a1a', roughness:0.88, reflectivity:0.03, emissive:false, texture_freq:0.22 },
  ice:      { color:'#aaddff', roughness:0.05, reflectivity:0.75, emissive:false, texture_freq:0.05 },
  water:    { color:'#1a6699', roughness:0.10, reflectivity:0.65, emissive:false, texture_freq:0.12 },
  lava:     { color:'#ff4400', roughness:0.45, reflectivity:0.20, emissive:true,  texture_freq:0.15, emissiveColor:'#ff8800', emissiveIntensity:0.8 },
  metal:    { color:'#8899aa', roughness:0.22, reflectivity:0.55, emissive:false, texture_freq:0.04 },
  wood:     { color:'#8b5a2b', roughness:0.70, reflectivity:0.08, emissive:false, texture_freq:0.14 },
  snow:     { color:'#eeeeff', roughness:0.60, reflectivity:0.35, emissive:false, texture_freq:0.30 },
  gravel:   { color:'#999988', roughness:0.85, reflectivity:0.07, emissive:false, texture_freq:0.25 },
  concrete: { color:'#aaaaaa', roughness:0.55, reflectivity:0.15, emissive:false, texture_freq:0.06 },
  asphalt:  { color:'#333333', roughness:0.48, reflectivity:0.10, emissive:false, texture_freq:0.07 },
  cave_rock:{ color:'#4a3a2a', roughness:0.95, reflectivity:0.05, emissive:false, texture_freq:0.10 },
  crystal:  { color:'#88aaff', roughness:0.08, reflectivity:0.90, emissive:true,  texture_freq:0.03, emissiveColor:'#aaccff', emissiveIntensity:0.5 }
};

function getSurfaceMaterial(surfaceType) {
  return SURFACE_MATERIAL_PROPERTIES[surfaceType] || SURFACE_MATERIAL_PROPERTIES.dirt;
}

// ============================================================
// MAP_METADATA — her harita için meta bilgi
// ============================================================
const MAP_METADATA = {
  starter_hills: {
    author: 'AHMETTeam', difficulty: 1, record_distance: 2840,
    unlock_cost: 0, theme_color: '#4a8a2a', background_music: 'bgm_cheerful',
    description: 'Yeni başlayanlar için ideal dalgalı tepeler.',
    biome: 'grass', weather: 'sunny', timeOfDay: 'day'
  },
  rocky_canyon: {
    author: 'AHMETTeam', difficulty: 2, record_distance: 2450,
    unlock_cost: 500, theme_color: '#8a6040', background_music: 'bgm_adventure',
    description: 'Dik kayalık geçitlerle dolu zorlu kanyon.',
    biome: 'rock', weather: 'cloudy', timeOfDay: 'day'
  },
  arctic_tundra: {
    author: 'AHMETTeam', difficulty: 3, record_distance: 1980,
    unlock_cost: 1200, theme_color: '#aaccff', background_music: 'bgm_winter',
    description: 'Kaygan buzul yüzeylerde dikkatli ol!',
    biome: 'arctic', weather: 'snowstorm', timeOfDay: 'dusk'
  },
  desert_dunes: {
    author: 'AHMETTeam', difficulty: 2, record_distance: 2650,
    unlock_cost: 800, theme_color: '#c8a050', background_music: 'bgm_desert',
    description: 'Sonsuz kum tepeleri ve sıcak hava.',
    biome: 'desert', weather: 'sunny', timeOfDay: 'midday'
  },
  deep_swamp: {
    author: 'AHMETTeam', difficulty: 3, record_distance: 1850,
    unlock_cost: 1500, theme_color: '#3a5a1a', background_music: 'bgm_swamp',
    description: 'Bataklık arazide hayatta kalmaya çalış.',
    biome: 'swamp', weather: 'foggy', timeOfDay: 'dusk'
  },
  volcano_run: {
    author: 'AHMETTeam', difficulty: 4, record_distance: 1620,
    unlock_cost: 2500, theme_color: '#cc4400', background_music: 'bgm_epic',
    description: 'Aktif volkan yamaçlarında ölüm yarışı!',
    biome: 'volcanic', weather: 'ash_storm', timeOfDay: 'night'
  },
  crystal_caves: {
    author: 'AHMETTeam', difficulty: 4, record_distance: 1540,
    unlock_cost: 3000, theme_color: '#4488ff', background_music: 'bgm_mystic',
    description: 'Parlayan kristallerle dolu gizemli mağaralar.',
    biome: 'cave', weather: 'none', timeOfDay: 'night'
  },
  moon_surface: {
    author: 'AHMETTeam', difficulty: 3, record_distance: 3200,
    unlock_cost: 4000, theme_color: '#888899', background_music: 'bgm_space',
    description: 'Düşük yerçekiminde ay yüzeyi macerası.',
    biome: 'lunar', weather: 'none', timeOfDay: 'space'
  },
  underwater_world: {
    author: 'AHMETTeam', difficulty: 4, record_distance: 1380,
    unlock_cost: 3500, theme_color: '#006688', background_music: 'bgm_underwater',
    description: 'Okyanusun derinliklerinde aklını kaybetme.',
    biome: 'underwater', weather: 'none', timeOfDay: 'deep'
  },
  rainbow_bridge: {
    author: 'AHMETTeam', difficulty: 5, record_distance: 3800,
    unlock_cost: 8000, theme_color: '#ff88cc', background_music: 'bgm_fantasy',
    description: 'Efsanevi gökkuşağı köprüsünde final mücadelesi!',
    biome: 'fantasy', weather: 'rainbow', timeOfDay: 'golden_hour'
  }
};

function getMapMeta(mapId) {
  return MAP_METADATA[mapId] || null;
}

function getMapsByDifficulty(diff) {
  return Object.entries(MAP_METADATA)
    .filter(([, meta]) => meta.difficulty === diff)
    .map(([id, meta]) => ({ id, ...meta }));
}

function getUnlockedMaps(playerCoins) {
  return Object.entries(MAP_METADATA)
    .filter(([, meta]) => meta.unlock_cost <= playerCoins)
    .map(([id, meta]) => ({ id, ...meta }));
}


// ============================================================
// TERRAIN_CHECKPOINT_SYSTEM — kontrol noktası sistemi
// ============================================================
const TERRAIN_CHECKPOINT_SYSTEM = {

  CHECKPOINT_TYPES: {
    standard:  { color: '#ffcc00', size: 24, scoreBonus: 100, description: 'Standart kontrol noktası' },
    speed_gate:{ color: '#00aaff', size: 22, scoreBonus: 50,  description: 'Hız kapısı — geçişte hız bonusu' },
    secret:    { color: '#aa00ff', size: 20, scoreBonus: 500, description: 'Gizli kontrol noktası' },
    challenge: { color: '#ff4400', size: 26, scoreBonus: 250, description: 'Zorluk noktası' },
    finish:    { color: '#00ff88', size: 32, scoreBonus: 1000,description: 'Bitiş çizgisi' }
  },

  generateCheckpoints(mapId, terrain, density) {
    const dens = density || 0.08;
    const checkpoints = [];
    const seed = mapId ? mapId.split('').reduce((a,c) => a + c.charCodeAt(0), 0) : 42;
    const rng = (i) => ((seed * (i+1) * 4447) % 9973) / 9973;
    let idx = 0;

    for (let i = Math.floor(terrain.length * 0.05); i < terrain.length - 1; i++) {
      if (rng(i) < dens) {
        const pt = terrain[i];
        if (!pt) continue;
        const typeKeys = Object.keys(this.CHECKPOINT_TYPES);
        let typeKey = 'standard';
        const r2 = rng(i * 7 + 3);
        if (r2 < 0.05) typeKey = 'secret';
        else if (r2 < 0.15) typeKey = 'challenge';
        else if (r2 < 0.30) typeKey = 'speed_gate';

        checkpoints.push({
          id: idx++,
          x: pt.x,
          y: pt.y - 30,
          type: typeKey,
          collected: false,
          animPhase: rng(i * 3 + 1) * Math.PI * 2
        });
      }
    }

    // Add finish
    const last = terrain[terrain.length - 1];
    if (last) {
      checkpoints.push({
        id: idx,
        x: last.x,
        y: last.y - 40,
        type: 'finish',
        collected: false,
        animPhase: 0
      });
    }

    return checkpoints;
  },

  drawCheckpoint(ctx, cp, t) {
    const typeDef = this.CHECKPOINT_TYPES[cp.type] || this.CHECKPOINT_TYPES.standard;
    const pulse = 1 + Math.sin(t * 3 + cp.animPhase) * 0.12;
    const size  = typeDef.size * pulse;

    ctx.save();
    ctx.translate(cp.x, cp.y);

    // Outer ring glow
    ctx.globalCompositeOperation = 'lighter';
    const glowR = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
    glowR.addColorStop(0, typeDef.color + '55');
    glowR.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = glowR;
    ctx.fill();

    // Main circle
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fillStyle = cp.collected ? '#444444' : typeDef.color;
    ctx.globalAlpha = cp.collected ? 0.3 : 0.85;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Star icon
    if (!cp.collected) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const spikes = cp.type === 'finish' ? 8 : 5;
      for (let s = 0; s < spikes * 2; s++) {
        const ang = (s / (spikes*2)) * Math.PI * 2 - Math.PI/2;
        const r = s % 2 === 0 ? size * 0.55 : size * 0.28;
        s===0 ? ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r)
              : ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Score bonus text
    if (!cp.collected && cp.type !== 'standard') {
      ctx.font = `bold ${Math.floor(size * 0.55)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = typeDef.color;
      ctx.shadowBlur = 8;
      ctx.fillText(`+${typeDef.scoreBonus}`, 0, size + 18);
    }

    ctx.restore();
  },

  collectCheckpoint(cp, vehicleState) {
    if (cp.collected) return 0;
    cp.collected = true;
    const typeDef = this.CHECKPOINT_TYPES[cp.type] || this.CHECKPOINT_TYPES.standard;
    if (vehicleState) {
      vehicleState.score = (vehicleState.score || 0) + typeDef.scoreBonus;
    }
    return typeDef.scoreBonus;
  }
};

// ============================================================
// TERRAIN_OBSTACLE_LIBRARY — engel kütüphanesi
// ============================================================
const TERRAIN_OBSTACLE_LIBRARY = {
  boulder: {
    width: 44, height: 36, mass: 800, restitution: 0.4,
    health: 200, destructible: false,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI*2);
      const bg = ctx.createRadialGradient(-5,-5,2,0,0,22);
      bg.addColorStop(0,'#aaaaaa'); bg.addColorStop(0.6,'#777777'); bg.addColorStop(1,'#444444');
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle='#333'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.restore();
    }
  },
  log: {
    width: 80, height: 22, mass: 350, restitution: 0.3,
    health: 120, destructible: true,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 11, 0, 0, Math.PI*2);
      const lg = ctx.createLinearGradient(-40,0,40,0);
      lg.addColorStop(0,'#5a3a1a'); lg.addColorStop(0.5,'#8b5a2b'); lg.addColorStop(1,'#5a3a1a');
      ctx.fillStyle=lg; ctx.fill();
      // End rings
      ctx.beginPath(); ctx.ellipse(-38,0,4,11,0,0,Math.PI*2);
      ctx.fillStyle='#4a2a0a'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(38,0,4,11,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  },
  ramp: {
    width: 120, height: 40, mass: 9999, restitution: 0.1,
    health: 9999, destructible: false,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath();
      ctx.moveTo(-60, 20); ctx.lineTo(60, 20); ctx.lineTo(60, -20); ctx.closePath();
      ctx.fillStyle='#cc8844'; ctx.fill();
      ctx.strokeStyle='#aa6622'; ctx.lineWidth=2; ctx.stroke();
      ctx.restore();
    }
  },
  oil_drum: {
    width: 26, height: 40, mass: 180, restitution: 0.5,
    health: 60, destructible: true, flammable: true,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath();
      ctx.rect(-13, -20, 26, 40);
      ctx.fillStyle='#cc2200'; ctx.fill();
      ctx.strokeStyle='#881100'; ctx.lineWidth=2; ctx.stroke();
      // Stripes
      for (let b = -10; b <= 10; b += 10) {
        ctx.beginPath(); ctx.rect(-13, b-2, 26, 4);
        ctx.fillStyle='#ffcc00'; ctx.fill();
      }
      ctx.restore();
    }
  },
  spike_strip: {
    width: 100, height: 14, mass: 9999, restitution: 0.0,
    health: 9999, destructible: false, damageOnContact: 25,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath(); ctx.rect(-50,-4,100,8);
      ctx.fillStyle='#333'; ctx.fill();
      for (let sx = -44; sx <= 44; sx += 8) {
        ctx.beginPath();
        ctx.moveTo(sx,-4); ctx.lineTo(sx,-14); ctx.lineTo(sx+4,-4);
        ctx.fillStyle='#888'; ctx.fill();
      }
      ctx.restore();
    }
  },
  mud_patch: {
    width: 140, height: 20, mass: 0, restitution: 0.0,
    health: 9999, destructible: false, frictionMult: 0.15,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, 70, 14, 0, 0, Math.PI*2);
      ctx.fillStyle='rgba(90,60,20,0.7)'; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-15, -4, 20, 8, -0.3, 0, Math.PI*2);
      ctx.fillStyle='rgba(70,50,15,0.5)'; ctx.fill();
      ctx.restore();
    }
  },
  boost_pad: {
    width: 80, height: 16, mass: 0, restitution: 0.0,
    health: 9999, destructible: false, speedBoostMult: 2.2, boostDuration: 1500,
    draw(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.beginPath();
      ctx.rect(-40, -8, 80, 16);
      const bpg = ctx.createLinearGradient(-40,0,40,0);
      bpg.addColorStop(0,'#0044ff'); bpg.addColorStop(0.5,'#00aaff'); bpg.addColorStop(1,'#0044ff');
      ctx.fillStyle=bpg; ctx.fill();
      // Arrow indicators
      for (let ax = -24; ax <= 24; ax += 16) {
        ctx.beginPath();
        ctx.moveTo(ax,-5); ctx.lineTo(ax+8,0); ctx.lineTo(ax,-5);
        ctx.moveTo(ax+8,-5); ctx.lineTo(ax+16,0); ctx.lineTo(ax+8,-5);
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=2; ctx.stroke();
      }
      ctx.restore();
    }
  }
};

// ============================================================
// TERRAIN_BIOME_TRANSITIONS — biyom geçiş sistemi
// ============================================================
const TERRAIN_BIOME_TRANSITIONS = [
  {
    fromBiome: 'grass',  toBiome: 'desert',
    transitionLength: 200,
    blendColors: { ground: ['#3a7a20','#c8a050'], sky: ['#6aa8d0','#dda050'] },
    midBiome: 'scrubland'
  },
  {
    fromBiome: 'grass',  toBiome: 'arctic',
    transitionLength: 250,
    blendColors: { ground: ['#3a7a20','#eeeeff'], sky: ['#6aa8d0','#aaccff'] },
    midBiome: 'tundra'
  },
  {
    fromBiome: 'desert', toBiome: 'volcanic',
    transitionLength: 180,
    blendColors: { ground: ['#c8a050','#4a2a1a'], sky: ['#dda050','#331100'] },
    midBiome: 'badlands'
  },
  {
    fromBiome: 'forest', toBiome: 'swamp',
    transitionLength: 220,
    blendColors: { ground: ['#2a6a1a','#3a5a1a'], sky: ['#558aaa','#446655'] },
    midBiome: 'wetland'
  },
  {
    fromBiome: 'cave',   toBiome: 'underground_lake',
    transitionLength: 150,
    blendColors: { ground: ['#4a3a2a','#1a2a3a'], sky: ['#050302','#020508'] },
    midBiome: 'cave_water'
  }
];

function getBiomeTransition(fromBiome, toBiome) {
  return TERRAIN_BIOME_TRANSITIONS.find(
    t => t.fromBiome === fromBiome && t.toBiome === toBiome
  ) || null;
}

function lerpColor(colorA, colorB, t) {
  const parseHex = hex => {
    const h = hex.replace('#','');
    return [
      parseInt(h.slice(0,2),16),
      parseInt(h.slice(2,4),16),
      parseInt(h.slice(4,6),16)
    ];
  };
  const [r1,g1,b1] = parseHex(colorA);
  const [r2,g2,b2] = parseHex(colorB);
  const r = Math.round(r1 + (r2-r1)*t);
  const g = Math.round(g1 + (g2-g1)*t);
  const b = Math.round(b1 + (b2-b1)*t);
  return `rgb(${r},${g},${b})`;
}

// ============================================================
// DYNAMIC_TERRAIN_MUTATOR — arazi dinamik mutasyon
// ============================================================
const DYNAMIC_TERRAIN_MUTATOR = {

  applyEarthquake(terrain, intensity, epicenterX) {
    const mutated = terrain.map((pt, i) => {
      const dist = Math.abs(pt.x - epicenterX);
      const effect = Math.max(0, 1 - dist / 800) * intensity;
      const offset = (Math.random() - 0.5) * 40 * effect;
      return { ...pt, y: pt.y + offset };
    });
    return mutated;
  },

  applyCrater(terrain, impactX, radius, depth) {
    return terrain.map(pt => {
      const dist = Math.abs(pt.x - impactX);
      if (dist < radius) {
        const blend = 1 - (dist / radius);
        const craterDepth = depth * blend * blend;
        return { ...pt, y: pt.y + craterDepth };
      }
      return pt;
    });
  },

  applyFlood(terrain, waterLevel) {
    return terrain.map(pt => ({
      ...pt,
      underwater: pt.y > -waterLevel,
      surfaceType: pt.y > -waterLevel ? 'water' : (pt.surfaceType || 'dirt')
    }));
  },

  applySnowAccumulation(terrain, snowDepth) {
    return terrain.map(pt => ({
      ...pt,
      y: pt.y - snowDepth * (0.5 + Math.random() * 0.5),
      surfaceType: 'snow'
    }));
  },

  smoothTerrain(terrain, iterations) {
    let pts = [...terrain];
    for (let iter = 0; iter < (iterations || 2); iter++) {
      const smoothed = pts.map((pt, i) => {
        if (i === 0 || i === pts.length - 1) return pt;
        const prev = pts[i-1], next = pts[i+1];
        return { ...pt, y: (prev.y + pt.y * 2 + next.y) / 4 };
      });
      pts = smoothed;
    }
    return pts;
  }
};


// ============================================================
// TERRAIN_WIND_SYSTEM — rüzgar fizik sistemi
// ============================================================
const TERRAIN_WIND_SYSTEM = {
  _state: { speed: 0, direction: 1, gusting: false, gustTimer: 0 },

  update(dt) {
    this._state.gustTimer -= dt;
    if (this._state.gustTimer <= 0) {
      this._state.gusting = Math.random() > 0.6;
      this._state.gustTimer = 2 + Math.random() * 5;
      if (this._state.gusting) {
        this._state.speed = 3 + Math.random() * 8;
        this._state.direction = Math.random() > 0.5 ? 1 : -1;
      } else {
        this._state.speed = Math.random() * 2;
      }
    }
  },

  getForce(airtime) {
    const base = this._state.speed * this._state.direction;
    const airFactor = airtime ? Math.min(1, airtime / 1000) : 0;
    return base * airFactor * 0.4;
  },

  drawWindLines(ctx, W, H, t) {
    if (this._state.speed < 1.5) return;
    ctx.save();
    ctx.globalAlpha = Math.min(0.35, this._state.speed * 0.04);
    ctx.strokeStyle = 'rgba(200,220,255,0.6)';
    ctx.lineWidth = 1;
    const lineCount = Math.floor(this._state.speed * 3);
    for (let l = 0; l < lineCount; l++) {
      const seed = l * 2311;
      const lx = ((seed * 1337 + t * this._state.speed * 60 * this._state.direction) % (W + 200)) - 100;
      const ly = H * 0.1 + ((seed * 997) % 100) / 100 * H * 0.85;
      const llen = 20 + (seed % 40) * (this._state.speed * 0.1);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + llen * this._state.direction, ly);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// ============================================================
// TERRAIN_DECAL_SYSTEM — zemin çıkartmaları (kalıcı izler)
// ============================================================
const TERRAIN_DECAL_SYSTEM = {
  _decals: [],
  MAX_DECALS: 80,

  addSkidmark(x, y, angle, length, width, alpha) {
    this._decals.push({
      type: 'skidmark', x, y, angle: angle||0,
      length: length||60, width: width||8,
      alpha: alpha||0.55, life: 600, maxLife: 600
    });
    if (this._decals.length > this.MAX_DECALS) this._decals.shift();
  },

  addCraterMark(x, y, radius) {
    this._decals.push({
      type: 'crater', x, y, radius: radius||25,
      alpha: 0.7, life: 1200, maxLife: 1200
    });
    if (this._decals.length > this.MAX_DECALS) this._decals.shift();
  },

  addOilSlick(x, y, size) {
    this._decals.push({
      type: 'oil', x, y, size: size||40,
      alpha: 0.5, life: 900, maxLife: 900,
      hueShift: Math.random() * 360
    });
    if (this._decals.length > this.MAX_DECALS) this._decals.shift();
  },

  update(dt) {
    for (let i = this._decals.length - 1; i >= 0; i--) {
      this._decals[i].life -= dt * 60;
      if (this._decals[i].life <= 0) this._decals.splice(i, 1);
    }
  },

  draw(ctx, camX, camY, zoom) {
    const zm = zoom || 1;
    for (const d of this._decals) {
      const sx = (d.x - camX) * zm;
      const sy = (d.y - camY) * zm;
      const fade = Math.min(1, d.life / (d.maxLife * 0.3));

      ctx.save();
      ctx.globalAlpha = d.alpha * fade;

      switch (d.type) {
        case 'skidmark':
          ctx.translate(sx, sy);
          ctx.rotate(d.angle);
          ctx.beginPath();
          ctx.rect(-d.length/2, -d.width/2, d.length, d.width);
          ctx.fillStyle = '#1a1a1a';
          ctx.fill();
          break;

        case 'crater':
          ctx.beginPath();
          ctx.arc(sx, sy, d.radius * zm, 0, Math.PI*2);
          ctx.fillStyle = '#3a2a1a';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, d.radius * zm * 0.6, 0, Math.PI*2);
          ctx.fillStyle = '#2a1a0a';
          ctx.fill();
          break;

        case 'oil':
          const og = ctx.createRadialGradient(sx, sy, 0, sx, sy, d.size * zm);
          og.addColorStop(0, `hsla(${d.hueShift},80%,40%,0.7)`);
          og.addColorStop(0.5, `hsla(${(d.hueShift+60)%360},70%,30%,0.5)`);
          og.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.ellipse(sx, sy, d.size*zm, d.size*zm*0.4, 0, 0, Math.PI*2);
          ctx.fillStyle = og;
          ctx.fill();
          break;
      }
      ctx.restore();
    }
  },

  clear() { this._decals = []; }
};

// ============================================================
// TERRAIN_PARALLAX_LAYERS — parallax arka plan katmanları
// ============================================================
const TERRAIN_PARALLAX_LAYERS = [
  {
    id: 'sky_far',
    depth: 0.0,
    draw(ctx, W, H, camX, t, biome) {
      const biomeColors = {
        grass:    ['#87ceeb','#4a90d9'],
        desert:   ['#e8a850','#d4703a'],
        arctic:   ['#c8ddee','#8abed0'],
        volcanic: ['#331100','#660a00'],
        cave:     ['#050302','#0a0804'],
        swamp:    ['#556644','#3a4a2a'],
        default:  ['#6aa8d0','#3a78b0']
      };
      const cols = biomeColors[biome] || biomeColors.default;
      const skyG = ctx.createLinearGradient(0,0,0,H*0.65);
      skyG.addColorStop(0, cols[0]);
      skyG.addColorStop(1, cols[1]);
      ctx.fillStyle = skyG;
      ctx.fillRect(0, 0, W, H);
    }
  },
  {
    id: 'mountains_far',
    depth: 0.03,
    draw(ctx, W, H, camX, t) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const offX = -(camX * 0.03) % W;
      for (let rep = -1; rep <= 1; rep++) {
        const bx = offX + rep * W;
        ctx.beginPath();
        ctx.moveTo(bx, H*0.6);
        const peaks2 = 12;
        for (let p = 0; p <= peaks2; p++) {
          const px = bx + (p/peaks2)*W;
          const ph = H * (0.08 + ((p*7193)%100)*0.0022);
          ctx.lineTo(px - W/(peaks2*2), H*0.55 - ph);
          ctx.lineTo(px, H*0.55);
        }
        ctx.lineTo(bx+W, H*0.6);
        ctx.fillStyle = '#5a7a9a';
        ctx.fill();
      }
      ctx.restore();
    }
  },
  {
    id: 'mountains_near',
    depth: 0.07,
    draw(ctx, W, H, camX, t) {
      ctx.save();
      ctx.globalAlpha = 0.65;
      const offX = -(camX * 0.07) % W;
      for (let rep = -1; rep <= 1; rep++) {
        const bx = offX + rep * W;
        ctx.beginPath();
        ctx.moveTo(bx, H*0.7);
        const peaks2 = 9;
        for (let p = 0; p <= peaks2; p++) {
          const px = bx + (p/peaks2)*W;
          const ph = H * (0.12 + ((p*5381)%100)*0.0024);
          ctx.lineTo(px - W/(peaks2*2), H*0.65 - ph);
          ctx.lineTo(px, H*0.65);
        }
        ctx.lineTo(bx+W, H*0.7);
        ctx.fillStyle = '#3a5a7a';
        ctx.fill();
      }
      ctx.restore();
    }
  }
];

function drawParallaxBackground(ctx, W, H, camX, t, biome) {
  for (const layer of TERRAIN_PARALLAX_LAYERS) {
    if (typeof layer.draw === 'function') {
      layer.draw(ctx, W, H, camX, t, biome);
    }
  }
}


// ============================================================
// TERRAIN_FINISH_LINE_RENDERER — bitiş çizgisi çizici
// ============================================================
const TERRAIN_FINISH_LINE_RENDERER = {

  draw(ctx, x, y, w, h, t) {
    const W = w || 20, H = h || 80;
    ctx.save();
    ctx.translate(x, y);

    // Checkered pattern (4x8 cells)
    const cellW = W / 4, cellH = H / 8;
    for (let cy = 0; cy < 8; cy++) {
      for (let cx = 0; cx < 4; cx++) {
        ctx.fillStyle = (cx + cy) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(cx * cellW - W/2, cy * cellH - H, cellW, cellH);
      }
    }

    // Pulsing glow
    const pulse = 0.5 + Math.sin(t * 4) * 0.3;
    ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(0, -H/2, 0, 0, -H/2, W * 3);
    fg.addColorStop(0, `rgba(0,255,136,${pulse * 0.4})`);
    fg.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, -H/2, W * 3, 0, Math.PI * 2);
    ctx.fillStyle = fg;
    ctx.fill();

    ctx.restore();
  }
};

// VEHICLE_CONFIG_VERSION — konfigurasyon versiyonu
const VEHICLE_CONFIG_VERSION = '2.4.1';
const TERRAIN_CONFIG_VERSION = '2.4.1';



// ============================================================
// MAP_COLLECTION_EXTENDED — 18 new map definitions
// ============================================================
(function() {
'use strict';

const MAP_COLLECTION_EXTENDED = [

// ── 1. VOLCANO_PEAK ─────────────────────────────────────────
{
  id: 'volcano_peak',
  name: 'Volcano Peak',
  theme: 'volcanic',
  difficulty: 9,
  length: 4200,
  description: 'Ascend an active volcano through lava flows, ash clouds, and collapsing rock formations.',
  biome: { type: 'volcanic', gravity: 9.81, airDensity: 1.4, friction: 0.55, ambientTemp: 420 },
  terrainProfile: [
    { x:0,    height:0,    slope:0,    surface:'rock',    obstacle:null },
    { x:80,   height:12,   slope:8,    surface:'rock',    obstacle:'boulder_small' },
    { x:160,  height:28,   slope:12,   surface:'rock',    obstacle:null },
    { x:240,  height:48,   slope:16,   surface:'lava',    obstacle:'lava_crack' },
    { x:320,  height:72,   slope:20,   surface:'rock',    obstacle:null },
    { x:400,  height:88,   slope:10,   surface:'ash',     obstacle:'ash_cloud' },
    { x:480,  height:100,  slope:5,    surface:'ash',     obstacle:null },
    { x:560,  height:118,  slope:14,   surface:'rock',    obstacle:'falling_rock' },
    { x:640,  height:140,  slope:18,   surface:'lava',    obstacle:'lava_pool' },
    { x:720,  height:165,  slope:22,   surface:'rock',    obstacle:null },
    { x:800,  height:188,  slope:16,   surface:'rock',    obstacle:'boulder_large' },
    { x:880,  height:205,  slope:10,   surface:'ash',     obstacle:'ash_cloud' },
    { x:960,  height:218,  slope:8,    surface:'lava',    obstacle:'lava_crack' },
    { x:1040, height:235,  slope:14,   surface:'rock',    obstacle:null },
    { x:1120, height:260,  slope:20,   surface:'rock',    obstacle:'collapsing_bridge' },
    { x:1200, height:285,  slope:18,   surface:'lava',    obstacle:'lava_pool' },
    { x:1280, height:302,  slope:10,   surface:'ash',     obstacle:null },
    { x:1360, height:316,  slope:8,    surface:'rock',    obstacle:'falling_rock' },
    { x:1440, height:334,  slope:14,   surface:'rock',    obstacle:'boulder_small' },
    { x:1520, height:358,  slope:18,   surface:'lava',    obstacle:'lava_crack' },
    { x:1600, height:380,  slope:16,   surface:'rock',    obstacle:null },
    { x:1680, height:398,  slope:12,   surface:'ash',     obstacle:'ash_cloud' },
    { x:1760, height:415,  slope:10,   surface:'rock',    obstacle:'collapsing_bridge' },
    { x:1840, height:430,  slope:8,    surface:'lava',    obstacle:'lava_pool' },
    { x:1920, height:448,  slope:12,   surface:'rock',    obstacle:null },
    { x:2000, height:468,  slope:16,   surface:'rock',    obstacle:'boulder_large' },
    { x:2080, height:492,  slope:20,   surface:'lava',    obstacle:'lava_crack' },
    { x:2160, height:515,  slope:16,   surface:'ash',     obstacle:'ash_cloud' },
    { x:2240, height:534,  slope:12,   surface:'rock',    obstacle:'falling_rock' },
    { x:2320, height:550,  slope:8,    surface:'rock',    obstacle:null },
    { x:2400, height:565,  slope:10,   surface:'lava',    obstacle:'lava_pool' },
    { x:2480, height:582,  slope:12,   surface:'rock',    obstacle:'boulder_small' },
    { x:2560, height:600,  slope:14,   surface:'rock',    obstacle:null },
    { x:2640, height:620,  slope:16,   surface:'ash',     obstacle:'ash_cloud' },
    { x:2720, height:642,  slope:18,   surface:'lava',    obstacle:'lava_crack' },
    { x:2800, height:665,  slope:16,   surface:'rock',    obstacle:'collapsing_bridge' },
    { x:2880, height:685,  slope:12,   surface:'rock',    obstacle:'boulder_large' },
    { x:2960, height:700,  slope:8,    surface:'ash',     obstacle:null },
    { x:3040, height:714,  slope:10,   surface:'lava',    obstacle:'lava_pool' },
    { x:3120, height:730,  slope:12,   surface:'rock',    obstacle:'falling_rock' },
    { x:3200, height:748,  slope:14,   surface:'rock',    obstacle:null },
    { x:3280, height:768,  slope:16,   surface:'lava',    obstacle:'lava_crack' },
    { x:3360, height:790,  slope:18,   surface:'ash',     obstacle:'ash_cloud' },
    { x:3440, height:812,  slope:16,   surface:'rock',    obstacle:'boulder_small' },
    { x:3520, height:830,  slope:12,   surface:'rock',    obstacle:'collapsing_bridge' },
    { x:3600, height:845,  slope:8,    surface:'lava',    obstacle:'lava_pool' },
    { x:3680, height:858,  slope:10,   surface:'rock',    obstacle:null },
    { x:3760, height:872,  slope:12,   surface:'ash',     obstacle:'ash_cloud' },
    { x:3840, height:888,  slope:14,   surface:'lava',    obstacle:'lava_crack' },
    { x:3920, height:905,  slope:12,   surface:'rock',    obstacle:'falling_rock' },
    { x:4000, height:920,  slope:8,    surface:'rock',    obstacle:null },
    { x:4100, height:935,  slope:6,    surface:'rock',    obstacle:null },
    { x:4200, height:945,  slope:4,    surface:'rock',    obstacle:null }
  ],
  obstacles: [
    { type:'rolling_boulder', x:250,  y:50,  width:40, height:40, behavior:'roll_downhill', damage:60, speed:3.5, mass:800 },
    { type:'lava_geyser',     x:450,  y:92,  width:20, height:80, behavior:'periodic_erupt', damage:90, period:4, duration:1.5 },
    { type:'ash_cloud',       x:600,  y:110, width:120,height:60, behavior:'drift_left',     damage:20, driftSpeed:1.2, opacity:0.7 },
    { type:'collapsing_rock', x:780,  y:188, width:80, height:30, behavior:'timed_collapse', damage:75, triggerDelay:0.8 },
    { type:'rolling_boulder', x:950,  y:220, width:55, height:55, behavior:'roll_downhill', damage:80, speed:4.2, mass:1200 },
    { type:'lava_pool',       x:1100, y:258, width:160,height:15, behavior:'static',         damage:100,liquidType:'lava' },
    { type:'ash_cloud',       x:1250, y:302, width:100,height:55, behavior:'drift_right',    damage:20, driftSpeed:0.9 },
    { type:'falling_rock',    x:1450, y:340, width:30, height:30, behavior:'fall_on_trigger',damage:65, fallDelay:0.4 },
    { type:'lava_geyser',     x:1620, y:382, width:20, height:100,behavior:'periodic_erupt', damage:90, period:3, duration:2 },
    { type:'collapsing_rock', x:1800, y:432, width:90, height:25, behavior:'timed_collapse', damage:75, triggerDelay:1.0 },
    { type:'rolling_boulder', x:2050, y:470, width:65, height:65, behavior:'roll_downhill', damage:90, speed:5.0, mass:1600 },
    { type:'lava_pool',       x:2200, y:517, width:200,height:15, behavior:'static',         damage:100,liquidType:'lava' },
    { type:'ash_cloud',       x:2380, y:552, width:140,height:65, behavior:'drift_left',     damage:25, driftSpeed:1.5 },
    { type:'lava_geyser',     x:2550, y:600, width:20, height:120,behavior:'periodic_erupt', damage:90, period:5, duration:2 },
    { type:'rolling_boulder', x:2750, y:642, width:70, height:70, behavior:'roll_downhill', damage:95, speed:5.5, mass:2000 },
    { type:'collapsing_rock', x:2920, y:688, width:100,height:30, behavior:'timed_collapse', damage:80, triggerDelay:0.6 },
    { type:'falling_rock',    x:3100, y:732, width:35, height:35, behavior:'fall_on_trigger',damage:70, fallDelay:0.3 },
    { type:'lava_pool',       x:3280, y:770, width:240,height:15, behavior:'static',         damage:100,liquidType:'lava' },
    { type:'ash_cloud',       x:3480, y:812, width:160,height:70, behavior:'drift_right',    damage:30, driftSpeed:1.8 },
    { type:'lava_geyser',     x:3650, y:848, width:20, height:140,behavior:'periodic_erupt', damage:100,period:3, duration:2.5 }
  ],
  collectibles: {
    coinSpawnRate: 0.6,
    fuelSpawnRate: 0.2,
    powerupSpawnRate: 0.08,
    preferredSurfaces: ['rock','ash'],
    avoidSurfaces: ['lava'],
    clusterSize: { min:3, max:8 },
    specialDrops: [
      { type:'heat_shield', probability:0.05, effect:'immunity_lava_10s' },
      { type:'mega_fuel',   probability:0.03, effect:'full_tank' }
    ]
  },
  background: {
    layers: [
      { id:'sky_volcano',   parallaxX:0.05, parallaxY:0,    color:'#1a0800', gradient:['#1a0800','#3d0c00','#6b1500'] },
      { id:'smoke_far',     parallaxX:0.15, parallaxY:0.02, color:'#333333', opacity:0.6, animated:true, animSpeed:0.3 },
      { id:'volcano_silhouette', parallaxX:0.25, parallaxY:0, color:'#0d0400' },
      { id:'lava_glow_far', parallaxX:0.3,  parallaxY:0.05, color:'#ff4400', opacity:0.3, pulse:true, pulseFreq:0.8 },
      { id:'smoke_near',    parallaxX:0.5,  parallaxY:0.08, color:'#222222', opacity:0.4, animated:true, animSpeed:0.6 },
      { id:'ember_particles',parallaxX:0.7, parallaxY:0.1,  color:'#ff6600', particleCount:40, riseSpeed:1.5 }
    ]
  },
  weather: { type:'ashfall', intensity:0.7, windSpeed:12, windDir:245, visibility:0.45, ashDensity:0.65 },
  hazards: [
    { type:'meteor_shower', path:'random_vertical', speed:18, damage:85, size:25, frequency:0.15, warningTime:1.2 },
    { type:'lava_bomb',     path:'parabolic',       speed:12, damage:70, size:35, frequency:0.08, explosionRadius:60 }
  ],
  checkpoints: [
    { x:600,  bonusTime:30 },
    { x:1400, bonusTime:25 },
    { x:2200, bonusTime:20 },
    { x:3000, bonusTime:20 },
    { x:3800, bonusTime:15 }
  ],
  bossZone: { x:3900, y:910, width:300, height:100, bossType:'volcanic_golem', triggerOnce:true },
  timeTrial: { gold:185, silver:240, bronze:300 },
  unlockRequirements: { playerLevel:22, starsNeeded:45, previousMap:'desert_sandstorm' }
},

// ── 2. DEEP_OCEAN ────────────────────────────────────────────
{
  id: 'deep_ocean',
  name: 'Deep Ocean Trench',
  theme: 'underwater',
  difficulty: 7,
  length: 3800,
  description: 'Dive into the crushing depths of the ocean, navigating currents, sea creatures, and ancient ruins.',
  biome: { type:'underwater', gravity:3.2, airDensity:0, friction:0.85, ambientTemp:4, waterDensity:1025 },
  terrainProfile: [
    { x:0,    height:0,    slope:0,    surface:'sand',  obstacle:null },
    { x:80,   height:-8,   slope:-6,   surface:'sand',  obstacle:'seaweed_cluster' },
    { x:160,  height:-18,  slope:-10,  surface:'rock',  obstacle:null },
    { x:240,  height:-32,  slope:-14,  surface:'coral', obstacle:'coral_spike' },
    { x:320,  height:-50,  slope:-18,  surface:'sand',  obstacle:'current_zone' },
    { x:400,  height:-70,  slope:-20,  surface:'rock',  obstacle:null },
    { x:480,  height:-88,  slope:-16,  surface:'mud',   obstacle:'jellyfish' },
    { x:560,  height:-100, slope:-10,  surface:'sand',  obstacle:null },
    { x:640,  height:-115, slope:-14,  surface:'coral', obstacle:'coral_spike' },
    { x:720,  height:-135, slope:-18,  surface:'rock',  obstacle:'sea_mine' },
    { x:800,  height:-158, slope:-20,  surface:'mud',   obstacle:null },
    { x:880,  height:-178, slope:-16,  surface:'sand',  obstacle:'current_zone' },
    { x:960,  height:-195, slope:-12,  surface:'rock',  obstacle:'octopus_arm' },
    { x:1040, height:-210, slope:-10,  surface:'coral', obstacle:null },
    { x:1120, height:-225, slope:-12,  surface:'sand',  obstacle:'sea_mine' },
    { x:1200, height:-245, slope:-16,  surface:'rock',  obstacle:'current_zone' },
    { x:1280, height:-268, slope:-20,  surface:'mud',   obstacle:null },
    { x:1360, height:-290, slope:-18,  surface:'sand',  obstacle:'jellyfish' },
    { x:1440, height:-308, slope:-14,  surface:'coral', obstacle:'coral_spike' },
    { x:1520, height:-322, slope:-10,  surface:'rock',  obstacle:null },
    { x:1600, height:-335, slope:-8,   surface:'sand',  obstacle:'current_zone' },
    { x:1680, height:-348, slope:-8,   surface:'mud',   obstacle:'octopus_arm' },
    { x:1760, height:-360, slope:-8,   surface:'rock',  obstacle:null },
    { x:1840, height:-370, slope:-6,   surface:'sand',  obstacle:'sea_mine' },
    { x:1920, height:-378, slope:-4,   surface:'coral', obstacle:null },
    { x:2000, height:-382, slope:-2,   surface:'sand',  obstacle:'current_zone' },
    { x:2080, height:-384, slope:0,    surface:'mud',   obstacle:null },
    { x:2160, height:-384, slope:0,    surface:'sand',  obstacle:'jellyfish' },
    { x:2240, height:-382, slope:2,    surface:'rock',  obstacle:null },
    { x:2320, height:-378, slope:4,    surface:'coral', obstacle:'coral_spike' },
    { x:2400, height:-372, slope:6,    surface:'sand',  obstacle:'current_zone' },
    { x:2480, height:-362, slope:8,    surface:'rock',  obstacle:null },
    { x:2560, height:-350, slope:10,   surface:'mud',   obstacle:'octopus_arm' },
    { x:2640, height:-335, slope:12,   surface:'sand',  obstacle:'sea_mine' },
    { x:2720, height:-318, slope:14,   surface:'coral', obstacle:null },
    { x:2800, height:-298, slope:16,   surface:'rock',  obstacle:'current_zone' },
    { x:2880, height:-275, slope:18,   surface:'sand',  obstacle:'jellyfish' },
    { x:2960, height:-250, slope:20,   surface:'rock',  obstacle:null },
    { x:3040, height:-222, slope:22,   surface:'mud',   obstacle:'sea_mine' },
    { x:3120, height:-192, slope:24,   surface:'sand',  obstacle:null },
    { x:3200, height:-160, slope:20,   surface:'coral', obstacle:'coral_spike' },
    { x:3280, height:-125, slope:22,   surface:'rock',  obstacle:'current_zone' },
    { x:3360, height:-88,  slope:24,   surface:'sand',  obstacle:null },
    { x:3440, height:-50,  slope:22,   surface:'rock',  obstacle:'sea_mine' },
    { x:3520, height:-18,  slope:18,   surface:'sand',  obstacle:null },
    { x:3600, height:10,   slope:12,   surface:'coral', obstacle:'coral_spike' },
    { x:3680, height:30,   slope:10,   surface:'sand',  obstacle:null },
    { x:3760, height:45,   slope:8,    surface:'rock',  obstacle:'current_zone' },
    { x:3800, height:55,   slope:6,    surface:'sand',  obstacle:null }
  ],
  obstacles: [
    { type:'jellyfish',    x:300,  y:-55,  width:35, height:45, behavior:'float_oscillate', damage:25, oscillateAmp:30, oscillatePeriod:3 },
    { type:'current_zone', x:420,  y:-80,  width:180,height:80, behavior:'push_horizontal', damage:0,  pushForce:8, direction:'right' },
    { type:'sea_mine',     x:600,  y:-120, width:30, height:30, behavior:'static_explode',  damage:80, explosionRadius:70 },
    { type:'octopus_arm',  x:750,  y:-165, width:20, height:100,behavior:'swipe_periodic',  damage:50, swipePeriod:4, reach:120 },
    { type:'coral_spike',  x:900,  y:-200, width:15, height:45, behavior:'static',           damage:40 },
    { type:'current_zone', x:1080, y:-228, width:200,height:90, behavior:'push_horizontal', damage:0,  pushForce:-10,direction:'left' },
    { type:'jellyfish',    x:1250, y:-258, width:40, height:55, behavior:'float_oscillate', damage:30, oscillateAmp:40, oscillatePeriod:4 },
    { type:'sea_mine',     x:1400, y:-310, width:30, height:30, behavior:'static_explode',  damage:80, explosionRadius:70 },
    { type:'octopus_arm',  x:1560, y:-340, width:20, height:120,behavior:'swipe_periodic',  damage:55, swipePeriod:3.5, reach:140 },
    { type:'current_zone', x:1700, y:-358, width:220,height:100,behavior:'push_horizontal', damage:0,  pushForce:12, direction:'right' },
    { type:'shark',        x:1900, y:-376, width:80, height:35, behavior:'patrol_horizontal',damage:70, patrolDist:300, speed:4 },
    { type:'sea_mine',     x:2100, y:-380, width:30, height:30, behavior:'static_explode',  damage:80, explosionRadius:70 },
    { type:'jellyfish',    x:2280, y:-372, width:45, height:60, behavior:'float_oscillate', damage:35, oscillateAmp:45, oscillatePeriod:3 },
    { type:'current_zone', x:2450, y:-355, width:200,height:80, behavior:'push_horizontal', damage:0,  pushForce:-8, direction:'left' },
    { type:'octopus_arm',  x:2620, y:-330, width:20, height:130,behavior:'swipe_periodic',  damage:60, swipePeriod:3, reach:150 },
    { type:'shark',        x:2800, y:-290, width:85, height:38, behavior:'patrol_horizontal',damage:75, patrolDist:350, speed:5 },
    { type:'sea_mine',     x:2980, y:-245, width:30, height:30, behavior:'static_explode',  damage:80, explosionRadius:70 },
    { type:'current_zone', x:3150, y:-185, width:180,height:90, behavior:'push_horizontal', damage:0,  pushForce:14, direction:'right' },
    { type:'coral_spike',  x:3320, y:-118, width:15, height:50, behavior:'static',           damage:45 },
    { type:'jellyfish',    x:3500, y:-32,  width:40, height:55, behavior:'float_oscillate', damage:30, oscillateAmp:35, oscillatePeriod:3 }
  ],
  collectibles: {
    coinSpawnRate: 0.7,
    fuelSpawnRate: 0.15,
    powerupSpawnRate: 0.06,
    preferredSurfaces: ['sand','coral'],
    avoidSurfaces: ['mud'],
    clusterSize: { min:4, max:10 },
    specialDrops: [
      { type:'oxygen_tank', probability:0.08, effect:'oxygen_60s' },
      { type:'sonar_pulse', probability:0.04, effect:'reveal_mines_30s' }
    ]
  },
  background: {
    layers: [
      { id:'deep_water',    parallaxX:0.02, parallaxY:0,    color:'#001830', gradient:['#001830','#002040','#003060'] },
      { id:'bioluminescence',parallaxX:0.1, parallaxY:0.02, color:'#003366', animated:true, glowPulse:true, glowFreq:2.0 },
      { id:'particle_debris',parallaxX:0.2, parallaxY:0.05, color:'#aaaaaa', particleCount:60, sinkSpeed:0.4, opacity:0.3 },
      { id:'coral_far',     parallaxX:0.3,  parallaxY:0,    color:'#cc4400' },
      { id:'seaweed',       parallaxX:0.5,  parallaxY:0,    color:'#005522', animated:true, swayAmp:5, swayFreq:0.5 },
      { id:'bubble_stream', parallaxX:0.7,  parallaxY:0.1,  color:'#80c0ff', particleCount:30, riseSpeed:2.0, opacity:0.5 }
    ]
  },
  weather: { type:'underwater_current', intensity:0.5, windSpeed:0, windDir:0, visibility:0.55, currentStrength:0.4 },
  hazards: [
    { type:'anglerfish', path:'patrol_circle', speed:3, damage:80, size:60, frequency:0.05, lightLure:true },
    { type:'depth_charge', path:'sink_vertical', speed:6, damage:95, size:40, frequency:0.04, explosionRadius:90 }
  ],
  checkpoints: [
    { x:500,  bonusTime:35 },
    { x:1200, bonusTime:30 },
    { x:1900, bonusTime:30 },
    { x:2600, bonusTime:25 },
    { x:3300, bonusTime:20 }
  ],
  bossZone: { x:1850, y:-380, width:400, height:120, bossType:'giant_squid', triggerOnce:true },
  timeTrial: { gold:200, silver:260, bronze:330 },
  unlockRequirements: { playerLevel:18, starsNeeded:35, previousMap:'jungle_ruins' }
},

// ── 3. LUNAR_BASE ────────────────────────────────────────────
{
  id: 'lunar_base',
  name: 'Lunar Research Base',
  theme: 'moon',
  difficulty: 8,
  length: 3600,
  description: 'Navigate the lunar surface in 1/6 gravity past craters, space station modules, and meteorite impacts.',
  biome: { type:'lunar', gravity:1.62, airDensity:0, friction:0.3, ambientTemp:-173, noAir:true },
  terrainProfile: [
    { x:0,    height:0,    slope:0,    surface:'regolith', obstacle:null },
    { x:80,   height:5,    slope:4,    surface:'regolith', obstacle:'crater_small' },
    { x:160,  height:14,   slope:8,    surface:'rock',     obstacle:null },
    { x:240,  height:22,   slope:8,    surface:'regolith', obstacle:'boulder_moon' },
    { x:320,  height:30,   slope:8,    surface:'regolith', obstacle:'crater_medium' },
    { x:400,  height:40,   slope:10,   surface:'rock',     obstacle:null },
    { x:480,  height:52,   slope:12,   surface:'regolith', obstacle:'solar_panel' },
    { x:560,  height:65,   slope:14,   surface:'regolith', obstacle:'crater_large' },
    { x:640,  height:80,   slope:16,   surface:'rock',     obstacle:null },
    { x:720,  height:96,   slope:16,   surface:'regolith', obstacle:'boulder_moon' },
    { x:800,  height:110,  slope:14,   surface:'regolith', obstacle:'crater_small' },
    { x:880,  height:122,  slope:12,   surface:'rock',     obstacle:null },
    { x:960,  height:132,  slope:10,   surface:'regolith', obstacle:'station_module' },
    { x:1040, height:140,  slope:8,    surface:'metal',    obstacle:null },
    { x:1120, height:148,  slope:8,    surface:'metal',    obstacle:'airlock_door' },
    { x:1200, height:156,  slope:8,    surface:'metal',    obstacle:null },
    { x:1280, height:165,  slope:10,   surface:'regolith', obstacle:'crater_medium' },
    { x:1360, height:178,  slope:12,   surface:'regolith', obstacle:'boulder_moon' },
    { x:1440, height:194,  slope:14,   surface:'rock',     obstacle:null },
    { x:1520, height:212,  slope:16,   surface:'regolith', obstacle:'crater_large' },
    { x:1600, height:230,  slope:16,   surface:'regolith', obstacle:null },
    { x:1680, height:246,  slope:14,   surface:'rock',     obstacle:'boulder_moon' },
    { x:1760, height:260,  slope:12,   surface:'regolith', obstacle:'crater_small' },
    { x:1840, height:272,  slope:10,   surface:'regolith', obstacle:null },
    { x:1920, height:282,  slope:8,    surface:'metal',    obstacle:'station_module' },
    { x:2000, height:290,  slope:8,    surface:'metal',    obstacle:'airlock_door' },
    { x:2080, height:298,  slope:8,    surface:'metal',    obstacle:null },
    { x:2160, height:308,  slope:10,   surface:'regolith', obstacle:'crater_medium' },
    { x:2240, height:322,  slope:12,   surface:'regolith', obstacle:'boulder_moon' },
    { x:2320, height:338,  slope:14,   surface:'rock',     obstacle:null },
    { x:2400, height:356,  slope:16,   surface:'regolith', obstacle:'crater_large' },
    { x:2480, height:375,  slope:18,   surface:'regolith', obstacle:null },
    { x:2560, height:396,  slope:18,   surface:'rock',     obstacle:'boulder_moon' },
    { x:2640, height:418,  slope:18,   surface:'regolith', obstacle:'crater_medium' },
    { x:2720, height:440,  slope:18,   surface:'regolith', obstacle:null },
    { x:2800, height:462,  slope:18,   surface:'metal',    obstacle:'station_module' },
    { x:2880, height:484,  slope:18,   surface:'metal',    obstacle:null },
    { x:2960, height:504,  slope:16,   surface:'regolith', obstacle:'crater_small' },
    { x:3040, height:522,  slope:14,   surface:'regolith', obstacle:'boulder_moon' },
    { x:3120, height:538,  slope:12,   surface:'rock',     obstacle:null },
    { x:3200, height:552,  slope:10,   surface:'regolith', obstacle:'crater_medium' },
    { x:3280, height:564,  slope:8,    surface:'regolith', obstacle:null },
    { x:3360, height:574,  slope:8,    surface:'rock',     obstacle:'boulder_moon' },
    { x:3440, height:582,  slope:6,    surface:'regolith', obstacle:'crater_large' },
    { x:3520, height:588,  slope:4,    surface:'regolith', obstacle:null },
    { x:3600, height:592,  slope:2,    surface:'regolith', obstacle:null }
  ],
  obstacles: [
    { type:'crater_small',   x:80,   y:5,   width:40, height:15, behavior:'static_pit',    damage:10, stickyFactor:0.2 },
    { type:'boulder_moon',   x:240,  y:22,  width:35, height:35, behavior:'low_grav_roll',  damage:30, mass:200, bounceCoeff:0.7 },
    { type:'crater_medium',  x:330,  y:30,  width:70, height:25, behavior:'static_pit',    damage:15, stickyFactor:0.3 },
    { type:'solar_panel',    x:480,  y:52,  width:80, height:5,  behavior:'static',         damage:20, fragile:true },
    { type:'crater_large',   x:570,  y:65,  width:120,height:40, behavior:'static_pit',    damage:20, stickyFactor:0.35 },
    { type:'boulder_moon',   x:720,  y:96,  width:50, height:50, behavior:'low_grav_roll',  damage:40, mass:350, bounceCoeff:0.75 },
    { type:'crater_small',   x:808,  y:110, width:40, height:15, behavior:'static_pit',    damage:10, stickyFactor:0.2 },
    { type:'station_module', x:950,  y:132, width:200,height:50, behavior:'static',         damage:0,  interactable:true },
    { type:'airlock_door',   x:1120, y:148, width:20, height:50, behavior:'auto_open',      damage:0,  openDelay:1.0 },
    { type:'crater_medium',  x:1280, y:165, width:70, height:25, behavior:'static_pit',    damage:15, stickyFactor:0.3 },
    { type:'boulder_moon',   x:1370, y:178, width:55, height:55, behavior:'low_grav_roll',  damage:45, mass:400, bounceCoeff:0.8 },
    { type:'crater_large',   x:1530, y:212, width:130,height:45, behavior:'static_pit',    damage:20, stickyFactor:0.35 },
    { type:'meteorite',      x:1700, y:246, width:25, height:25, behavior:'impact_random',  damage:65, impactRadius:50, frequency:0.06 },
    { type:'station_module', x:1930, y:282, width:200,height:50, behavior:'static',         damage:0,  interactable:true },
    { type:'airlock_door',   x:2000, y:290, width:20, height:50, behavior:'auto_open',      damage:0,  openDelay:0.8 },
    { type:'crater_medium',  x:2170, y:308, width:75, height:28, behavior:'static_pit',    damage:15, stickyFactor:0.3 },
    { type:'boulder_moon',   x:2250, y:322, width:60, height:60, behavior:'low_grav_roll',  damage:50, mass:500, bounceCoeff:0.8 },
    { type:'crater_large',   x:2410, y:356, width:140,height:50, behavior:'static_pit',    damage:25, stickyFactor:0.4 },
    { type:'meteorite',      x:2580, y:396, width:30, height:30, behavior:'impact_random',  damage:70, impactRadius:60, frequency:0.08 },
    { type:'station_module', x:2800, y:462, width:200,height:50, behavior:'static',         damage:0,  interactable:true }
  ],
  collectibles: {
    coinSpawnRate: 0.5,
    fuelSpawnRate: 0.18,
    powerupSpawnRate: 0.07,
    preferredSurfaces: ['regolith','metal'],
    avoidSurfaces: [],
    clusterSize: { min:3, max:7 },
    specialDrops: [
      { type:'oxygen_boost', probability:0.06, effect:'boost_thrust_20s' },
      { type:'moon_gem',     probability:0.02, effect:'score_multiplier_2x_30s' }
    ]
  },
  background: {
    layers: [
      { id:'space_black',   parallaxX:0.0,  parallaxY:0,    color:'#000008' },
      { id:'stars_far',     parallaxX:0.01, parallaxY:0,    color:'#ffffff', starCount:300, starSize:1, twinkle:false },
      { id:'stars_near',    parallaxX:0.03, parallaxY:0,    color:'#ffffff', starCount:100, starSize:2, twinkle:true, twinkleFreq:1.5 },
      { id:'earth_distant', parallaxX:0.02, parallaxY:0,    color:'#1a66ff', radius:60, cloudCoverage:0.4, renderAsSprite:true },
      { id:'milky_way',     parallaxX:0.01, parallaxY:0,    color:'#334466', opacity:0.3, bandAngle:30 }
    ]
  },
  weather: { type:'meteorite_shower', intensity:0.3, windSpeed:0, windDir:0, visibility:1.0, impactFrequency:0.08 },
  hazards: [
    { type:'meteorite', path:'random_diagonal', speed:20, damage:70, size:20, frequency:0.08, crateredGround:true },
    { type:'solar_flare_radiation', path:'static_zone', speed:0, damage:15, size:400, frequency:0.02, duration:10, warningTime:5 }
  ],
  checkpoints: [
    { x:480,  bonusTime:40 },
    { x:1100, bonusTime:35 },
    { x:1900, bonusTime:30 },
    { x:2700, bonusTime:25 },
    { x:3300, bonusTime:20 }
  ],
  bossZone: { x:3200, y:552, width:400, height:100, bossType:'rogue_mining_robot', triggerOnce:true },
  timeTrial: { gold:170, silver:225, bronze:290 },
  unlockRequirements: { playerLevel:25, starsNeeded:55, previousMap:'space_station' }
},

// ── 4. JUNGLE_RUINS ──────────────────────────────────────────
{
  id: 'jungle_ruins',
  name: 'Ancient Jungle Ruins',
  theme: 'jungle',
  difficulty: 6,
  length: 3500,
  description: 'Push through dense jungle overgrowth past crumbling temple ruins, vine traps, and territorial primates.',
  biome: { type:'jungle', gravity:9.81, airDensity:1.25, friction:0.7, ambientTemp:32 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'dirt',  obstacle:null },
    { x:80,   height:8,   slope:6,  surface:'dirt',  obstacle:'vine_cluster' },
    { x:160,  height:18,  slope:10, surface:'mud',   obstacle:null },
    { x:240,  height:30,  slope:12, surface:'stone', obstacle:'temple_block' },
    { x:320,  height:44,  slope:14, surface:'dirt',  obstacle:'vine_snare' },
    { x:400,  height:60,  slope:16, surface:'mud',   obstacle:null },
    { x:480,  height:78,  slope:18, surface:'stone', obstacle:'temple_block' },
    { x:560,  height:96,  slope:18, surface:'dirt',  obstacle:'monkey_nest' },
    { x:640,  height:114, slope:18, surface:'mud',   obstacle:null },
    { x:720,  height:132, slope:18, surface:'stone', obstacle:'collapsing_bridge' },
    { x:800,  height:148, slope:16, surface:'dirt',  obstacle:'vine_cluster' },
    { x:880,  height:162, slope:14, surface:'mud',   obstacle:null },
    { x:960,  height:174, slope:12, surface:'stone', obstacle:'temple_block' },
    { x:1040, height:184, slope:10, surface:'dirt',  obstacle:'vine_snare' },
    { x:1120, height:192, slope:8,  surface:'mud',   obstacle:null },
    { x:1200, height:200, slope:8,  surface:'stone', obstacle:'spike_trap' },
    { x:1280, height:210, slope:10, surface:'dirt',  obstacle:'monkey_nest' },
    { x:1360, height:224, slope:12, surface:'mud',   obstacle:null },
    { x:1440, height:240, slope:14, surface:'stone', obstacle:'collapsing_bridge' },
    { x:1520, height:258, slope:16, surface:'dirt',  obstacle:'vine_cluster' },
    { x:1600, height:278, slope:18, surface:'mud',   obstacle:null },
    { x:1680, height:298, slope:18, surface:'stone', obstacle:'temple_block' },
    { x:1760, height:316, slope:16, surface:'dirt',  obstacle:'vine_snare' },
    { x:1840, height:332, slope:14, surface:'mud',   obstacle:null },
    { x:1920, height:346, slope:12, surface:'stone', obstacle:'spike_trap' },
    { x:2000, height:358, slope:10, surface:'dirt',  obstacle:'monkey_nest' },
    { x:2080, height:368, slope:8,  surface:'mud',   obstacle:null },
    { x:2160, height:376, slope:8,  surface:'stone', obstacle:'temple_block' },
    { x:2240, height:385, slope:8,  surface:'dirt',  obstacle:'vine_cluster' },
    { x:2320, height:396, slope:10, surface:'mud',   obstacle:null },
    { x:2400, height:410, slope:12, surface:'stone', obstacle:'collapsing_bridge' },
    { x:2480, height:426, slope:14, surface:'dirt',  obstacle:'vine_snare' },
    { x:2560, height:444, slope:16, surface:'mud',   obstacle:null },
    { x:2640, height:464, slope:18, surface:'stone', obstacle:'temple_block' },
    { x:2720, height:484, slope:18, surface:'dirt',  obstacle:'spike_trap' },
    { x:2800, height:502, slope:16, surface:'mud',   obstacle:null },
    { x:2880, height:518, slope:14, surface:'stone', obstacle:'monkey_nest' },
    { x:2960, height:532, slope:12, surface:'dirt',  obstacle:'vine_cluster' },
    { x:3040, height:544, slope:10, surface:'mud',   obstacle:null },
    { x:3120, height:554, slope:8,  surface:'stone', obstacle:'temple_block' },
    { x:3200, height:562, slope:6,  surface:'dirt',  obstacle:null },
    { x:3280, height:568, slope:4,  surface:'mud',   obstacle:'vine_snare' },
    { x:3360, height:572, slope:4,  surface:'stone', obstacle:null },
    { x:3440, height:575, slope:2,  surface:'dirt',  obstacle:'monkey_nest' },
    { x:3500, height:577, slope:2,  surface:'dirt',  obstacle:null }
  ],
  obstacles: [
    { type:'vine_snare', x:320,  y:44,  width:15, height:80, behavior:'grab_vehicle',   damage:0, slowFactor:0.4, holdDuration:2.0 },
    { type:'monkey',     x:480,  y:60,  width:30, height:35, behavior:'throw_coconuts',  damage:25, throwRate:3.0, accuracy:0.5 },
    { type:'spike_trap', x:650,  y:118, width:60, height:20, behavior:'timed_rise',      damage:55, risePeriod:2.5 },
    { type:'collapsing_bridge', x:730, y:132, width:150, height:20, behavior:'timed_collapse', damage:30, triggerDelay:1.5 },
    { type:'boulder_jungle', x:900, y:162, width:50, height:50, behavior:'roll_downhill', damage:55, speed:3.0, mass:700 },
    { type:'vine_snare', x:1050, y:184, width:15, height:80, behavior:'grab_vehicle',   damage:0, slowFactor:0.45, holdDuration:2.5 },
    { type:'spike_trap', x:1210, y:200, width:80, height:20, behavior:'timed_rise',      damage:60, risePeriod:2.0 },
    { type:'monkey',     x:1370, y:224, width:30, height:35, behavior:'throw_coconuts',  damage:30, throwRate:2.5, accuracy:0.6 },
    { type:'collapsing_bridge', x:1450, y:240, width:160, height:20, behavior:'timed_collapse', damage:30, triggerDelay:1.2 },
    { type:'temple_spear', x:1620, y:280, width:10, height:60, behavior:'launch_horizontal', damage:70, launchSpeed:12, period:5 },
    { type:'vine_snare', x:1780, y:316, width:15, height:80, behavior:'grab_vehicle',   damage:0, slowFactor:0.5, holdDuration:3.0 },
    { type:'spike_trap', x:1940, y:348, width:90, height:20, behavior:'timed_rise',      damage:65, risePeriod:1.8 },
    { type:'monkey',     x:2100, y:368, width:30, height:35, behavior:'throw_coconuts',  damage:35, throwRate:2.0, accuracy:0.7 },
    { type:'boulder_jungle', x:2280, y:385, width:65, height:65, behavior:'roll_downhill', damage:70, speed:4.0, mass:1000 },
    { type:'collapsing_bridge', x:2420, y:410, width:180, height:20, behavior:'timed_collapse', damage:35, triggerDelay:1.0 },
    { type:'temple_spear', x:2600, y:448, width:10, height:60, behavior:'launch_horizontal', damage:75, launchSpeed:14, period:4 },
    { type:'vine_snare', x:2780, y:502, width:15, height:80, behavior:'grab_vehicle',   damage:0, slowFactor:0.55, holdDuration:3.5 },
    { type:'spike_trap', x:2940, y:532, width:100,height:20, behavior:'timed_rise',      damage:70, risePeriod:1.5 },
    { type:'monkey',     x:3100, y:554, width:35, height:40, behavior:'throw_coconuts',  damage:40, throwRate:1.8, accuracy:0.75 },
    { type:'boulder_jungle', x:3250, y:562, width:75, height:75, behavior:'roll_downhill', damage:80, speed:5.0, mass:1400 }
  ],
  collectibles: {
    coinSpawnRate: 0.75,
    fuelSpawnRate: 0.2,
    powerupSpawnRate: 0.08,
    preferredSurfaces: ['dirt','stone'],
    avoidSurfaces: ['mud'],
    clusterSize: { min:4, max:9 },
    specialDrops: [
      { type:'machete', probability:0.05, effect:'clear_vines_20s' },
      { type:'banana_bundle', probability:0.04, effect:'attract_monkeys_distraction_15s' }
    ]
  },
  background: {
    layers: [
      { id:'jungle_sky',  parallaxX:0.05, parallaxY:0,    color:'#1a3300', gradient:['#0d1f00','#1a3300','#2b5200'] },
      { id:'fog_layer',   parallaxX:0.1,  parallaxY:0.02, color:'#aaddaa', opacity:0.2, animated:true, fogDrift:0.3 },
      { id:'trees_far',   parallaxX:0.2,  parallaxY:0,    color:'#0a2200' },
      { id:'trees_mid',   parallaxX:0.35, parallaxY:0,    color:'#0d2e00' },
      { id:'vines_fg',    parallaxX:0.6,  parallaxY:0.05, color:'#1a5500', animated:true, swayAmp:8, swayFreq:0.4 },
      { id:'fireflies',   parallaxX:0.8,  parallaxY:0.1,  color:'#ffff44', particleCount:20, floatSpeed:0.5, opacity:0.6 }
    ]
  },
  weather: { type:'tropical_rain', intensity:0.5, windSpeed:8, windDir:260, visibility:0.65, humidity:0.9 },
  hazards: [
    { type:'anaconda', path:'sinusoidal_ground', speed:2.5, damage:50, size:120, frequency:0.03, constrict:true },
    { type:'poison_dart', path:'horizontal_sweep', speed:15, damage:40, size:5, frequency:0.12, poisonDuration:5 }
  ],
  checkpoints: [
    { x:450,  bonusTime:35 },
    { x:1050, bonusTime:30 },
    { x:1750, bonusTime:28 },
    { x:2500, bonusTime:25 },
    { x:3200, bonusTime:20 }
  ],
  bossZone: { x:3200, y:562, width:300, height:80, bossType:'giant_gorilla', triggerOnce:true },
  timeTrial: { gold:165, silver:215, bronze:280 },
  unlockRequirements: { playerLevel:15, starsNeeded:28, previousMap:'desert_sandstorm' }
}

]; // end MAP_COLLECTION_EXTENDED partial

// Export to global
if (typeof window !== 'undefined') { window.MAP_COLLECTION_EXTENDED = MAP_COLLECTION_EXTENDED; }
if (typeof module !== 'undefined') { module.exports = { MAP_COLLECTION_EXTENDED }; }

})();


// ============================================================
// MAP_COLLECTION_EXTENDED PART 2 — Maps 5-12
// ============================================================
(function() {
'use strict';

const MAP_COLLECTION_EXTENDED_2 = [

// ── 5. ARCTIC_STORM ──────────────────────────────────────────
{
  id: 'arctic_storm',
  name: 'Arctic Blizzard',
  theme: 'arctic',
  difficulty: 7,
  length: 3800,
  description: 'Battle through a polar blizzard across ice sheets, frozen tundra, and polar bear territory.',
  biome: { type:'arctic', gravity:9.81, airDensity:1.35, friction:0.15, ambientTemp:-45 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'ice',   obstacle:null },
    { x:80,   height:6,   slope:5,  surface:'snow',  obstacle:'snow_drift' },
    { x:160,  height:15,  slope:10, surface:'ice',   obstacle:null },
    { x:240,  height:28,  slope:12, surface:'snow',  obstacle:'polar_bear' },
    { x:320,  height:43,  slope:14, surface:'ice',   obstacle:'ice_spike' },
    { x:400,  height:60,  slope:16, surface:'snow',  obstacle:null },
    { x:480,  height:79,  slope:18, surface:'ice',   obstacle:'frozen_lake' },
    { x:560,  height:98,  slope:18, surface:'snow',  obstacle:'snow_drift' },
    { x:640,  height:116, slope:16, surface:'ice',   obstacle:null },
    { x:720,  height:132, slope:14, surface:'snow',  obstacle:'polar_bear' },
    { x:800,  height:146, slope:12, surface:'ice',   obstacle:'ice_spike' },
    { x:880,  height:158, slope:10, surface:'snow',  obstacle:null },
    { x:960,  height:168, slope:8,  surface:'ice',   obstacle:'blizzard_zone' },
    { x:1040, height:177, slope:8,  surface:'snow',  obstacle:'snow_drift' },
    { x:1120, height:187, slope:10, surface:'ice',   obstacle:null },
    { x:1200, height:200, slope:12, surface:'snow',  obstacle:'polar_bear' },
    { x:1280, height:216, slope:14, surface:'ice',   obstacle:'ice_spike' },
    { x:1360, height:234, slope:16, surface:'snow',  obstacle:null },
    { x:1440, height:254, slope:18, surface:'ice',   obstacle:'frozen_lake' },
    { x:1520, height:274, slope:18, surface:'snow',  obstacle:'blizzard_zone' },
    { x:1600, height:292, slope:16, surface:'ice',   obstacle:null },
    { x:1680, height:308, slope:14, surface:'snow',  obstacle:'snow_drift' },
    { x:1760, height:322, slope:12, surface:'ice',   obstacle:'polar_bear' },
    { x:1840, height:334, slope:10, surface:'snow',  obstacle:null },
    { x:1920, height:344, slope:8,  surface:'ice',   obstacle:'ice_spike' },
    { x:2000, height:353, slope:8,  surface:'snow',  obstacle:null },
    { x:2080, height:363, slope:10, surface:'ice',   obstacle:'blizzard_zone' },
    { x:2160, height:376, slope:12, surface:'snow',  obstacle:'snow_drift' },
    { x:2240, height:392, slope:14, surface:'ice',   obstacle:'polar_bear' },
    { x:2320, height:410, slope:16, surface:'snow',  obstacle:null },
    { x:2400, height:430, slope:18, surface:'ice',   obstacle:'frozen_lake' },
    { x:2480, height:450, slope:18, surface:'snow',  obstacle:'ice_spike' },
    { x:2560, height:468, slope:16, surface:'ice',   obstacle:null },
    { x:2640, height:484, slope:14, surface:'snow',  obstacle:'blizzard_zone' },
    { x:2720, height:498, slope:12, surface:'ice',   obstacle:'snow_drift' },
    { x:2800, height:510, slope:10, surface:'snow',  obstacle:'polar_bear' },
    { x:2880, height:520, slope:8,  surface:'ice',   obstacle:null },
    { x:2960, height:529, slope:8,  surface:'snow',  obstacle:'ice_spike' },
    { x:3040, height:539, slope:10, surface:'ice',   obstacle:null },
    { x:3120, height:552, slope:12, surface:'snow',  obstacle:'blizzard_zone' },
    { x:3200, height:568, slope:14, surface:'ice',   obstacle:'snow_drift' },
    { x:3280, height:586, slope:16, surface:'snow',  obstacle:null },
    { x:3360, height:606, slope:18, surface:'ice',   obstacle:'frozen_lake' },
    { x:3440, height:626, slope:18, surface:'snow',  obstacle:'polar_bear' },
    { x:3520, height:644, slope:16, surface:'ice',   obstacle:null },
    { x:3600, height:660, slope:14, surface:'snow',  obstacle:'ice_spike' },
    { x:3680, height:674, slope:12, surface:'ice',   obstacle:null },
    { x:3760, height:686, slope:8,  surface:'snow',  obstacle:'snow_drift' },
    { x:3800, height:692, slope:4,  surface:'snow',  obstacle:null }
  ],
  obstacles: [
    { type:'snow_drift',   x:80,   y:6,   width:60, height:20, behavior:'slow_vehicle', damage:0, slowFactor:0.5 },
    { type:'polar_bear',   x:240,  y:28,  width:55, height:50, behavior:'charge_right',  damage:60, chargeSpeed:6, chargeDist:200 },
    { type:'ice_spike',    x:325,  y:43,  width:12, height:35, behavior:'static',         damage:50 },
    { type:'frozen_lake',  x:490,  y:80,  width:200,height:5,  behavior:'ultra_slippery', damage:0, frictionOverride:0.03 },
    { type:'blizzard_zone',x:960,  y:168, width:180,height:80, behavior:'reduce_visibility',damage:0, visibilityMult:0.25, pushForce:6 },
    { type:'polar_bear',   x:1210, y:200, width:60, height:55, behavior:'charge_right',  damage:70, chargeSpeed:7, chargeDist:250 },
    { type:'ice_spike',    x:1290, y:216, width:14, height:40, behavior:'static',         damage:55 },
    { type:'frozen_lake',  x:1450, y:254, width:240,height:5,  behavior:'ultra_slippery', damage:0, frictionOverride:0.02 },
    { type:'blizzard_zone',x:1530, y:274, width:200,height:90, behavior:'reduce_visibility',damage:0, visibilityMult:0.2, pushForce:8 },
    { type:'avalanche',    x:1700, y:310, width:300,height:40, behavior:'timed_avalanche',damage:80, triggerDelay:0.5 },
    { type:'polar_bear',   x:1770, y:322, width:65, height:60, behavior:'charge_right',  damage:75, chargeSpeed:8, chargeDist:300 },
    { type:'ice_spike',    x:1935, y:344, width:16, height:45, behavior:'static',         damage:60 },
    { type:'blizzard_zone',x:2090, y:363, width:220,height:100,behavior:'reduce_visibility',damage:0, visibilityMult:0.15, pushForce:10 },
    { type:'frozen_lake',  x:2410, y:430, width:280,height:5,  behavior:'ultra_slippery', damage:0, frictionOverride:0.01 },
    { type:'polar_bear',   x:2810, y:510, width:70, height:65, behavior:'charge_right',  damage:80, chargeSpeed:9, chargeDist:350 },
    { type:'avalanche',    x:3000, y:529, width:400,height:50, behavior:'timed_avalanche',damage:90, triggerDelay:0.3 },
    { type:'blizzard_zone',x:3130, y:552, width:250,height:110,behavior:'reduce_visibility',damage:5, visibilityMult:0.1, pushForce:12 },
    { type:'frozen_lake',  x:3370, y:606, width:320,height:5,  behavior:'ultra_slippery', damage:0, frictionOverride:0.005 },
    { type:'polar_bear',   x:3450, y:626, width:75, height:70, behavior:'charge_right',  damage:85, chargeSpeed:10, chargeDist:400 },
    { type:'ice_spike',    x:3612, y:660, width:18, height:50, behavior:'static',         damage:65 }
  ],
  collectibles: {
    coinSpawnRate:0.6, fuelSpawnRate:0.22, powerupSpawnRate:0.07,
    preferredSurfaces:['snow'], avoidSurfaces:['ice'],
    clusterSize:{ min:3, max:7 },
    specialDrops:[
      { type:'thermal_boots', probability:0.05, effect:'ignore_ice_friction_25s' },
      { type:'aurora_gem',    probability:0.02, effect:'score_bonus_500' }
    ]
  },
  background:{
    layers:[
      { id:'arctic_sky',   parallaxX:0.04, parallaxY:0, color:'#0a0a22', gradient:['#000011','#0a0a22','#1a1a40'] },
      { id:'aurora',       parallaxX:0.05, parallaxY:0, color:'#00ff88', animated:true, auroraWave:true, waveFreq:0.3, opacity:0.6 },
      { id:'stars',        parallaxX:0.01, parallaxY:0, color:'#ffffff', starCount:200, twinkle:true },
      { id:'blizzard_far', parallaxX:0.2,  parallaxY:0.05, color:'#ccddff', particleCount:150, fallAngle:30, speed:4 },
      { id:'mountains',    parallaxX:0.3,  parallaxY:0, color:'#151525' },
      { id:'blizzard_near',parallaxX:0.8,  parallaxY:0.1,  color:'#eef4ff', particleCount:250, fallAngle:40, speed:7, opacity:0.5 }
    ]
  },
  weather:{ type:'blizzard', intensity:0.85, windSpeed:24, windDir:270, visibility:0.2, snowAccumulation:0.6 },
  hazards:[
    { type:'avalanche', path:'downhill_sweep', speed:15, damage:90, size:300, frequency:0.03 },
    { type:'ice_crack', path:'progressive_split', speed:0, damage:40, size:200, frequency:0.05, sinkTime:3 }
  ],
  checkpoints:[
    { x:500,  bonusTime:40 },
    { x:1100, bonusTime:35 },
    { x:1900, bonusTime:30 },
    { x:2700, bonusTime:28 },
    { x:3400, bonusTime:22 }
  ],
  bossZone:{ x:3600, y:660, width:300, height:80, bossType:'mammoth_revived', triggerOnce:true },
  timeTrial:{ gold:195, silver:255, bronze:325 },
  unlockRequirements:{ playerLevel:18, starsNeeded:36, previousMap:'lunar_base' }
},

// ── 6. DESERT_SANDSTORM ──────────────────────────────────────
{
  id: 'desert_sandstorm',
  name: 'Sahara Sandstorm',
  theme: 'desert',
  difficulty: 6,
  length: 4000,
  description: 'Navigate towering dunes and treacherous quicksand pits through a raging sandstorm.',
  biome:{ type:'desert', gravity:9.81, airDensity:1.1, friction:0.45, ambientTemp:55 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'sand',      obstacle:null },
    { x:100,  height:15,  slope:10, surface:'sand',      obstacle:'cactus' },
    { x:200,  height:35,  slope:15, surface:'dune',      obstacle:null },
    { x:300,  height:60,  slope:18, surface:'dune',      obstacle:'quicksand' },
    { x:400,  height:88,  slope:20, surface:'dune',      obstacle:null },
    { x:500,  height:108, slope:16, surface:'sand',      obstacle:'cactus' },
    { x:600,  height:122, slope:10, surface:'hardpack',  obstacle:null },
    { x:700,  height:132, slope:8,  surface:'sand',      obstacle:'quicksand' },
    { x:800,  height:140, slope:6,  surface:'dune',      obstacle:null },
    { x:900,  height:150, slope:8,  surface:'dune',      obstacle:'buried_car' },
    { x:1000, height:164, slope:12, surface:'sand',      obstacle:'cactus' },
    { x:1100, height:182, slope:16, surface:'dune',      obstacle:null },
    { x:1200, height:204, slope:18, surface:'dune',      obstacle:'quicksand' },
    { x:1300, height:228, slope:18, surface:'sand',      obstacle:null },
    { x:1400, height:250, slope:18, surface:'hardpack',  obstacle:'buried_rock' },
    { x:1500, height:270, slope:16, surface:'dune',      obstacle:'cactus' },
    { x:1600, height:287, slope:14, surface:'dune',      obstacle:null },
    { x:1700, height:301, slope:12, surface:'sand',      obstacle:'quicksand' },
    { x:1800, height:313, slope:10, surface:'dune',      obstacle:null },
    { x:1900, height:323, slope:8,  surface:'dune',      obstacle:'sandstorm_wall' },
    { x:2000, height:331, slope:6,  surface:'hardpack',  obstacle:null },
    { x:2100, height:337, slope:6,  surface:'sand',      obstacle:'cactus' },
    { x:2200, height:344, slope:6,  surface:'dune',      obstacle:'quicksand' },
    { x:2300, height:353, slope:8,  surface:'dune',      obstacle:null },
    { x:2400, height:364, slope:10, surface:'sand',      obstacle:'buried_car' },
    { x:2500, height:378, slope:12, surface:'dune',      obstacle:'cactus' },
    { x:2600, height:395, slope:14, surface:'dune',      obstacle:null },
    { x:2700, height:414, slope:16, surface:'sand',      obstacle:'quicksand' },
    { x:2800, height:435, slope:18, surface:'dune',      obstacle:null },
    { x:2900, height:457, slope:18, surface:'dune',      obstacle:'sandstorm_wall' },
    { x:3000, height:477, slope:16, surface:'hardpack',  obstacle:'buried_rock' },
    { x:3100, height:494, slope:14, surface:'sand',      obstacle:'cactus' },
    { x:3200, height:509, slope:12, surface:'dune',      obstacle:null },
    { x:3300, height:521, slope:10, surface:'dune',      obstacle:'quicksand' },
    { x:3400, height:530, slope:8,  surface:'sand',      obstacle:null },
    { x:3500, height:537, slope:6,  surface:'hardpack',  obstacle:'cactus' },
    { x:3600, height:543, slope:4,  surface:'sand',      obstacle:'buried_car' },
    { x:3700, height:547, slope:3,  surface:'dune',      obstacle:null },
    { x:3800, height:550, slope:2,  surface:'sand',      obstacle:null },
    { x:4000, height:552, slope:1,  surface:'sand',      obstacle:null }
  ],
  obstacles:[
    { type:'quicksand',      x:310,  y:60,  width:120, height:12, behavior:'sink_vehicle',    damage:0,  sinkRate:0.4, escapeForce:15 },
    { type:'cactus',         x:510,  y:108, width:15,  height:50, behavior:'static',           damage:35 },
    { type:'sandstorm_wall', x:680,  y:90,  width:40,  height:100,behavior:'move_left',        damage:20, moveSpeed:3,  visibilityBlock:0.8 },
    { type:'buried_car',     x:905,  y:140, width:80,  height:25, behavior:'static_obstacle',  damage:45 },
    { type:'quicksand',      x:1210, y:204, width:150, height:12, behavior:'sink_vehicle',    damage:0,  sinkRate:0.5, escapeForce:18 },
    { type:'cactus',         x:1510, y:270, width:18,  height:60, behavior:'static',           damage:40 },
    { type:'sandstorm_wall', x:1700, y:260, width:50,  height:120,behavior:'move_left',        damage:25, moveSpeed:4,  visibilityBlock:0.9 },
    { type:'scorpion',       x:1850, y:313, width:25,  height:15, behavior:'patrol_short',     damage:45, patrolDist:100, speed:3 },
    { type:'quicksand',      x:2210, y:344, width:180, height:12, behavior:'sink_vehicle',    damage:0,  sinkRate:0.6, escapeForce:20 },
    { type:'sand_geyser',    x:2380, y:360, width:20,  height:80, behavior:'periodic_erupt',  damage:50, period:4, duration:1.5 },
    { type:'buried_car',     x:2420, y:364, width:80,  height:25, behavior:'static_obstacle',  damage:45 },
    { type:'cactus',         x:2510, y:378, width:20,  height:70, behavior:'static',           damage:45 },
    { type:'sandstorm_wall', x:2720, y:400, width:60,  height:140,behavior:'move_left',        damage:30, moveSpeed:5,  visibilityBlock:1.0 },
    { type:'quicksand',      x:2920, y:457, width:200, height:12, behavior:'sink_vehicle',    damage:0,  sinkRate:0.7, escapeForce:22 },
    { type:'scorpion',       x:3110, y:494, width:30,  height:18, behavior:'patrol_short',     damage:55, patrolDist:120, speed:4 },
    { type:'sand_geyser',    x:3250, y:520, width:20,  height:90, behavior:'periodic_erupt',  damage:55, period:3, duration:2 },
    { type:'cactus',         x:3510, y:537, width:22,  height:75, behavior:'static',           damage:50 },
    { type:'buried_car',     x:3610, y:543, width:80,  height:25, behavior:'static_obstacle',  damage:45 }
  ],
  collectibles:{
    coinSpawnRate:0.65, fuelSpawnRate:0.2, powerupSpawnRate:0.07,
    preferredSurfaces:['hardpack','sand'], avoidSurfaces:['quicksand'],
    clusterSize:{ min:3, max:8 },
    specialDrops:[
      { type:'goggles',       probability:0.06, effect:'ignore_sandstorm_visibility_30s' },
      { type:'treasure_chest',probability:0.01, effect:'score_bonus_2000' }
    ]
  },
  background:{
    layers:[
      { id:'desert_sky',      parallaxX:0.04, parallaxY:0, color:'#ff8833', gradient:['#ff6600','#ff8833','#ffaa55'] },
      { id:'sandstorm_haze',  parallaxX:0.15, parallaxY:0.03, color:'#cc9944', opacity:0.5, animated:true },
      { id:'dunes_far',       parallaxX:0.2,  parallaxY:0, color:'#cc8822' },
      { id:'sand_particles',  parallaxX:0.6,  parallaxY:0.08, color:'#ddaa44', particleCount:200, speed:8, angle:15, opacity:0.4 },
      { id:'heat_shimmer',    parallaxX:0.9,  parallaxY:0, color:'transparent', animated:true, shimmerAmp:4, shimmerFreq:3 }
    ]
  },
  weather:{ type:'sandstorm', intensity:0.8, windSpeed:28, windDir:90, visibility:0.3, sandDensity:0.7 },
  hazards:[
    { type:'sand_wave',  path:'horizontal_roll', speed:8, damage:30, size:200, frequency:0.04 },
    { type:'dust_devil', path:'random_wander',   speed:5, damage:40, size:80,  frequency:0.06, liftForce:400 }
  ],
  checkpoints:[
    { x:600,  bonusTime:35 },
    { x:1400, bonusTime:30 },
    { x:2200, bonusTime:28 },
    { x:3000, bonusTime:25 },
    { x:3700, bonusTime:20 }
  ],
  bossZone:{ x:3700, y:547, width:300, height:80, bossType:'sand_wurm', triggerOnce:true },
  timeTrial:{ gold:180, silver:235, bronze:300 },
  unlockRequirements:{ playerLevel:14, starsNeeded:25, previousMap:'neon_city' }
},

// ── 7. NEON_CITY ─────────────────────────────────────────────
{
  id: 'neon_city',
  name: 'Neon City Sprawl',
  theme: 'cyberpunk',
  difficulty: 5,
  length: 3200,
  description: 'Race through a glittering cyberpunk metropolis, dodging traffic, leaping between buildings, and riding neon ramps.',
  biome:{ type:'urban', gravity:9.81, airDensity:1.25, friction:0.72, ambientTemp:28 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'asphalt', obstacle:null },
    { x:80,   height:4,   slope:3,  surface:'asphalt', obstacle:'traffic_car' },
    { x:160,  height:10,  slope:6,  surface:'asphalt', obstacle:'ramp_neon' },
    { x:240,  height:28,  slope:15, surface:'building_top', obstacle:null },
    { x:320,  height:50,  slope:18, surface:'metal',   obstacle:'vent_fan' },
    { x:400,  height:75,  slope:20, surface:'building_top', obstacle:null },
    { x:480,  height:100, slope:20, surface:'metal',   obstacle:'antenna_tower' },
    { x:560,  height:120, slope:16, surface:'asphalt', obstacle:'traffic_car' },
    { x:640,  height:136, slope:12, surface:'asphalt', obstacle:'ramp_neon' },
    { x:720,  height:155, slope:16, surface:'building_top', obstacle:null },
    { x:800,  height:178, slope:18, surface:'metal',   obstacle:'vent_fan' },
    { x:880,  height:202, slope:20, surface:'building_top', obstacle:null },
    { x:960,  height:226, slope:20, surface:'asphalt', obstacle:'traffic_car' },
    { x:1040, height:248, slope:18, surface:'asphalt', obstacle:'ramp_neon' },
    { x:1120, height:270, slope:18, surface:'building_top', obstacle:'billboard' },
    { x:1200, height:290, slope:16, surface:'metal',   obstacle:null },
    { x:1280, height:308, slope:14, surface:'asphalt', obstacle:'traffic_car' },
    { x:1360, height:323, slope:12, surface:'asphalt', obstacle:null },
    { x:1440, height:337, slope:10, surface:'building_top', obstacle:'antenna_tower' },
    { x:1520, height:350, slope:10, surface:'metal',   obstacle:'vent_fan' },
    { x:1600, height:364, slope:10, surface:'asphalt', obstacle:'ramp_neon' },
    { x:1680, height:380, slope:12, surface:'asphalt', obstacle:'traffic_car' },
    { x:1760, height:399, slope:14, surface:'building_top', obstacle:null },
    { x:1840, height:420, slope:16, surface:'metal',   obstacle:'vent_fan' },
    { x:1920, height:442, slope:18, surface:'building_top', obstacle:'billboard' },
    { x:2000, height:464, slope:18, surface:'asphalt', obstacle:null },
    { x:2080, height:484, slope:16, surface:'asphalt', obstacle:'traffic_car' },
    { x:2160, height:502, slope:14, surface:'building_top', obstacle:'ramp_neon' },
    { x:2240, height:518, slope:12, surface:'metal',   obstacle:'antenna_tower' },
    { x:2320, height:532, slope:10, surface:'asphalt', obstacle:null },
    { x:2400, height:544, slope:8,  surface:'asphalt', obstacle:'traffic_car' },
    { x:2480, height:555, slope:8,  surface:'building_top', obstacle:'vent_fan' },
    { x:2560, height:566, slope:8,  surface:'metal',   obstacle:'ramp_neon' },
    { x:2640, height:578, slope:8,  surface:'asphalt', obstacle:null },
    { x:2720, height:588, slope:8,  surface:'asphalt', obstacle:'traffic_car' },
    { x:2800, height:597, slope:6,  surface:'building_top', obstacle:'billboard' },
    { x:2880, height:604, slope:6,  surface:'metal',   obstacle:null },
    { x:2960, height:610, slope:4,  surface:'asphalt', obstacle:'ramp_neon' },
    { x:3040, height:615, slope:4,  surface:'asphalt', obstacle:'traffic_car' },
    { x:3120, height:619, slope:2,  surface:'building_top', obstacle:null },
    { x:3200, height:621, slope:1,  surface:'asphalt', obstacle:null }
  ],
  obstacles:[
    { type:'traffic_car',  x:85,   y:4,   width:60, height:30, behavior:'move_right',    damage:55, speed:8, randomSpawn:true },
    { type:'ramp_neon',    x:165,  y:10,  width:80, height:40, behavior:'static_ramp',   damage:0,  launchVy:-18, launchVx:8 },
    { type:'vent_fan',     x:330,  y:75,  width:40, height:40, behavior:'push_up',        damage:10, pushForce:500 },
    { type:'billboard',    x:500,  y:100, width:100,height:60, behavior:'static',         damage:40, destructible:true, hitsToBreak:3 },
    { type:'traffic_car',  x:570,  y:120, width:65, height:32, behavior:'move_left',     damage:60, speed:10, randomSpawn:true },
    { type:'antenna_tower',x:495,  y:70,  width:15, height:100,behavior:'static',         damage:70 },
    { type:'ramp_neon',    x:645,  y:136, width:90, height:45, behavior:'static_ramp',   damage:0,  launchVy:-22, launchVx:10 },
    { type:'vent_fan',     x:808,  y:178, width:40, height:40, behavior:'push_up',        damage:10, pushForce:600 },
    { type:'traffic_car',  x:970,  y:226, width:65, height:32, behavior:'move_right',    damage:60, speed:12, randomSpawn:true },
    { type:'billboard',    x:1130, y:270, width:110,height:65, behavior:'static',         damage:45, destructible:true, hitsToBreak:3 },
    { type:'ramp_neon',    x:1050, y:248, width:90, height:45, behavior:'static_ramp',   damage:0,  launchVy:-24, launchVx:12 },
    { type:'vent_fan',     x:1530, y:350, width:40, height:40, behavior:'push_up',        damage:10, pushForce:700 },
    { type:'traffic_car',  x:1690, y:380, width:65, height:32, behavior:'move_right',    damage:65, speed:14, randomSpawn:true },
    { type:'ramp_neon',    x:1610, y:364, width:100,height:50, behavior:'static_ramp',   damage:0,  launchVy:-26, launchVx:14 },
    { type:'billboard',    x:1935, y:442, width:120,height:70, behavior:'static',         damage:50, destructible:true, hitsToBreak:3 },
    { type:'antenna_tower',x:1445, y:295, width:15, height:110,behavior:'static',         damage:75 },
    { type:'vent_fan',     x:2495, y:555, width:40, height:40, behavior:'push_up',        damage:10, pushForce:800 },
    { type:'traffic_car',  x:2410, y:544, width:70, height:35, behavior:'move_left',     damage:70, speed:16, randomSpawn:true },
    { type:'ramp_neon',    x:2570, y:566, width:110,height:55, behavior:'static_ramp',   damage:0,  launchVy:-28, launchVx:16 },
    { type:'billboard',    x:2810, y:597, width:130,height:75, behavior:'static',         damage:55, destructible:true, hitsToBreak:3 }
  ],
  collectibles:{
    coinSpawnRate:0.8, fuelSpawnRate:0.15, powerupSpawnRate:0.1,
    preferredSurfaces:['asphalt','building_top'], avoidSurfaces:[],
    clusterSize:{ min:5, max:12 },
    specialDrops:[
      { type:'turbo_chip',  probability:0.06, effect:'turbo_boost_15s' },
      { type:'data_shard',  probability:0.03, effect:'score_bonus_1000' }
    ]
  },
  background:{
    layers:[
      { id:'city_night',     parallaxX:0.04, parallaxY:0, color:'#050510', gradient:['#050510','#0a0a20','#0d0d30'] },
      { id:'city_lights_far',parallaxX:0.1,  parallaxY:0, color:'#ff88cc', animated:true, flickerRate:0.1 },
      { id:'buildings_far',  parallaxX:0.2,  parallaxY:0, color:'#0a0a1a', neonEdges:true, neonColor:'#ff00ff' },
      { id:'buildings_mid',  parallaxX:0.4,  parallaxY:0, color:'#080818', neonEdges:true, neonColor:'#00ffff' },
      { id:'hologram_ads',   parallaxX:0.6,  parallaxY:0.05, color:'#00ccff', animated:true, scrollSpeed:2, opacity:0.7 },
      { id:'rain_neon',      parallaxX:0.9,  parallaxY:0.12, color:'#99ccff', particleCount:200, speed:14, angle:80, opacity:0.4 }
    ]
  },
  weather:{ type:'acid_rain', intensity:0.4, windSpeed:12, windDir:255, visibility:0.7, rainColor:'#88ff88' },
  hazards:[
    { type:'police_drone',   path:'patrol_horizontal', speed:8, damage:45, size:40, frequency:0.05 },
    { type:'delivery_drone', path:'random_sweep',      speed:10, damage:30, size:25, frequency:0.1 }
  ],
  checkpoints:[
    { x:400,  bonusTime:30 },
    { x:900,  bonusTime:25 },
    { x:1600, bonusTime:22 },
    { x:2300, bonusTime:20 },
    { x:2900, bonusTime:18 }
  ],
  bossZone:{ x:2900, y:604, width:300, height:80, bossType:'mech_enforcer', triggerOnce:true },
  timeTrial:{ gold:145, silver:190, bronze:245 },
  unlockRequirements:{ playerLevel:12, starsNeeded:20, previousMap:'haunted_mansion' }
},

// ── 8. HAUNTED_MANSION ───────────────────────────────────────
{
  id: 'haunted_mansion',
  name: 'Haunted Mansion',
  theme: 'halloween',
  difficulty: 5,
  length: 2800,
  description: 'Navigate eerie graveyards, haunted mansion corridors, and spectral hazards on All Hallows Eve.',
  biome:{ type:'haunted', gravity:9.81, airDensity:1.2, friction:0.6, ambientTemp:10 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'cobblestone', obstacle:null },
    { x:70,   height:5,   slope:5,  surface:'cobblestone', obstacle:'gravestone' },
    { x:140,  height:12,  slope:8,  surface:'dirt',        obstacle:null },
    { x:210,  height:22,  slope:12, surface:'cobblestone', obstacle:'ghost' },
    { x:280,  height:35,  slope:14, surface:'dirt',        obstacle:'coffin' },
    { x:350,  height:50,  slope:16, surface:'cobblestone', obstacle:null },
    { x:420,  height:67,  slope:18, surface:'wood',        obstacle:'moving_platform' },
    { x:490,  height:84,  slope:18, surface:'cobblestone', obstacle:'ghost' },
    { x:560,  height:100, slope:16, surface:'dirt',        obstacle:'gravestone' },
    { x:630,  height:114, slope:14, surface:'cobblestone', obstacle:null },
    { x:700,  height:126, slope:12, surface:'wood',        obstacle:'bat_swarm' },
    { x:770,  height:136, slope:10, surface:'cobblestone', obstacle:'coffin' },
    { x:840,  height:145, slope:8,  surface:'dirt',        obstacle:null },
    { x:910,  height:153, slope:8,  surface:'cobblestone', obstacle:'ghost' },
    { x:980,  height:162, slope:10, surface:'wood',        obstacle:'moving_platform' },
    { x:1050, height:174, slope:12, surface:'cobblestone', obstacle:'gravestone' },
    { x:1120, height:188, slope:14, surface:'dirt',        obstacle:null },
    { x:1190, height:204, slope:16, surface:'cobblestone', obstacle:'ghost' },
    { x:1260, height:222, slope:18, surface:'wood',        obstacle:'bat_swarm' },
    { x:1330, height:240, slope:18, surface:'cobblestone', obstacle:'coffin' },
    { x:1400, height:256, slope:14, surface:'dirt',        obstacle:null },
    { x:1470, height:270, slope:12, surface:'cobblestone', obstacle:'moving_platform' },
    { x:1540, height:282, slope:10, surface:'wood',        obstacle:'ghost' },
    { x:1610, height:293, slope:8,  surface:'cobblestone', obstacle:'gravestone' },
    { x:1680, height:303, slope:8,  surface:'dirt',        obstacle:null },
    { x:1750, height:314, slope:10, surface:'cobblestone', obstacle:'bat_swarm' },
    { x:1820, height:328, slope:12, surface:'wood',        obstacle:'coffin' },
    { x:1890, height:344, slope:14, surface:'cobblestone', obstacle:null },
    { x:1960, height:362, slope:16, surface:'dirt',        obstacle:'ghost' },
    { x:2030, height:381, slope:18, surface:'cobblestone', obstacle:'moving_platform' },
    { x:2100, height:400, slope:18, surface:'wood',        obstacle:'bat_swarm' },
    { x:2170, height:418, slope:16, surface:'cobblestone', obstacle:null },
    { x:2240, height:434, slope:14, surface:'dirt',        obstacle:'gravestone' },
    { x:2310, height:448, slope:12, surface:'cobblestone', obstacle:'ghost' },
    { x:2380, height:460, slope:10, surface:'wood',        obstacle:null },
    { x:2450, height:470, slope:8,  surface:'cobblestone', obstacle:'coffin' },
    { x:2520, height:479, slope:8,  surface:'dirt',        obstacle:'bat_swarm' },
    { x:2590, height:489, slope:8,  surface:'cobblestone', obstacle:null },
    { x:2660, height:498, slope:6,  surface:'wood',        obstacle:'ghost' },
    { x:2730, height:505, slope:4,  surface:'cobblestone', obstacle:'gravestone' },
    { x:2800, height:510, slope:2,  surface:'cobblestone', obstacle:null }
  ],
  obstacles:[
    { type:'ghost',           x:215,  y:22,  width:30, height:40, behavior:'fly_oscillate',  damage:35, oscillateX:80, oscillateY:30, period:3 },
    { type:'coffin',          x:285,  y:35,  width:50, height:30, behavior:'open_and_rise',  damage:40, riseHeight:50, period:5 },
    { type:'moving_platform', x:430,  y:62,  width:80, height:15, behavior:'move_vertical',  damage:0,  moveAmp:40, movePeriod:3 },
    { type:'bat_swarm',       x:708,  y:120, width:80, height:50, behavior:'swarm_oscillate', damage:25, density:15, period:2 },
    { type:'ghost',           x:495,  y:84,  width:35, height:45, behavior:'fly_oscillate',  damage:40, oscillateX:100,oscillateY:40, period:4 },
    { type:'gravestone',      x:565,  y:100, width:20, height:35, behavior:'static',          damage:30 },
    { type:'coffin',          x:778,  y:136, width:50, height:30, behavior:'open_and_rise',  damage:40, riseHeight:55, period:4.5 },
    { type:'ghost',           x:918,  y:153, width:35, height:45, behavior:'fly_oscillate',  damage:45, oscillateX:120,oscillateY:45, period:3.5 },
    { type:'moving_platform', x:990,  y:168, width:90, height:15, behavior:'move_vertical',  damage:0,  moveAmp:50, movePeriod:3.5 },
    { type:'bat_swarm',       x:1268, y:222, width:90, height:55, behavior:'swarm_oscillate', damage:30, density:18, period:2.5 },
    { type:'ghost',           x:1198, y:204, width:38, height:48, behavior:'fly_oscillate',  damage:50, oscillateX:140,oscillateY:50, period:4 },
    { type:'coffin',          x:1340, y:240, width:50, height:30, behavior:'open_and_rise',  damage:45, riseHeight:60, period:4 },
    { type:'moving_platform', x:1480, y:265, width:100,height:15, behavior:'move_vertical',  damage:0,  moveAmp:60, movePeriod:4 },
    { type:'bat_swarm',       x:1760, y:314, width:100,height:60, behavior:'swarm_oscillate', damage:35, density:20, period:2 },
    { type:'ghost',           x:1970, y:362, width:40, height:50, behavior:'fly_oscillate',  damage:55, oscillateX:160,oscillateY:55, period:3 },
    { type:'moving_platform', x:2040, y:378, width:110,height:15, behavior:'move_vertical',  damage:0,  moveAmp:70, movePeriod:4.5 },
    { type:'bat_swarm',       x:2110, y:400, width:110,height:65, behavior:'swarm_oscillate', damage:40, density:22, period:1.8 },
    { type:'coffin',          x:2458, y:470, width:50, height:30, behavior:'open_and_rise',  damage:50, riseHeight:70, period:3.5 },
    { type:'ghost',           x:2670, y:498, width:42, height:52, behavior:'fly_oscillate',  damage:60, oscillateX:180,oscillateY:60, period:2.5 },
    { type:'bat_swarm',       x:2530, y:479, width:120,height:70, behavior:'swarm_oscillate', damage:45, density:25, period:1.5 }
  ],
  collectibles:{
    coinSpawnRate:0.7, fuelSpawnRate:0.18, powerupSpawnRate:0.09,
    preferredSurfaces:['cobblestone','wood'], avoidSurfaces:[],
    clusterSize:{ min:3, max:8 },
    specialDrops:[
      { type:'ghost_repellent', probability:0.07, effect:'ghost_immunity_20s' },
      { type:'pumpkin_boost',   probability:0.04, effect:'speed_boost_2x_10s' }
    ]
  },
  background:{
    layers:[
      { id:'halloween_sky',  parallaxX:0.03, parallaxY:0, color:'#110022', gradient:['#110022','#220033','#330044'] },
      { id:'full_moon',      parallaxX:0.02, parallaxY:0, color:'#ffeeaa', radius:70, glowColor:'#ffeeaa', glowRadius:120 },
      { id:'clouds_dark',    parallaxX:0.08, parallaxY:0.02, color:'#1a0022', animated:true, cloudSpeed:0.5 },
      { id:'trees_dead',     parallaxX:0.2,  parallaxY:0, color:'#0d0011' },
      { id:'mansion',        parallaxX:0.35, parallaxY:0, color:'#0a0015', spookyLights:true },
      { id:'fog_ground',     parallaxX:0.7,  parallaxY:0, color:'#aaaadd', opacity:0.3, animated:true, fogDrift:0.4 }
    ]
  },
  weather:{ type:'spooky_fog', intensity:0.6, windSpeed:5, windDir:240, visibility:0.5, fogColor:'#442266' },
  hazards:[
    { type:'flying_witch', path:'sinusoidal_horizontal', speed:7, damage:40, size:50, frequency:0.04 },
    { type:'lightning',    path:'random_vertical',       speed:80, damage:55, size:15, frequency:0.05, stunDuration:1 }
  ],
  checkpoints:[
    { x:350,  bonusTime:30 },
    { x:840,  bonusTime:25 },
    { x:1400, bonusTime:22 },
    { x:1960, bonusTime:20 },
    { x:2450, bonusTime:18 }
  ],
  bossZone:{ x:2500, y:479, width:300, height:80, bossType:'vampire_lord', triggerOnce:true },
  timeTrial:{ gold:130, silver:170, bronze:220 },
  unlockRequirements:{ playerLevel:10, starsNeeded:18, previousMap:'candy_land' }
}

]; // end MAP_COLLECTION_EXTENDED_2

if (typeof window !== 'undefined') { window.MAP_COLLECTION_EXTENDED_2 = MAP_COLLECTION_EXTENDED_2; }
if (typeof module !== 'undefined') { module.exports = { MAP_COLLECTION_EXTENDED_2 }; }

})();


// ============================================================
// MAP_COLLECTION_EXTENDED PART 3 — Maps 9-18
// ============================================================
(function() {
'use strict';

const MAP_COLLECTION_EXTENDED_3 = [

// ── 9. CANDY_LAND ────────────────────────────────────────────
{
  id: 'candy_land',
  name: 'Candy Land',
  theme: 'candy',
  difficulty: 3,
  length: 2500,
  description: 'Bounce through a sugary world of giant lollipops, bouncy gummy surfaces, and sticky caramel traps.',
  biome:{ type:'candy', gravity:9.81, airDensity:1.3, friction:0.8, ambientTemp:22 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'gumdrop',   obstacle:null },
    { x:60,   height:5,   slope:5,  surface:'candy_cane', obstacle:'lollipop' },
    { x:120,  height:12,  slope:8,  surface:'gummy',      obstacle:null },
    { x:180,  height:22,  slope:12, surface:'gumdrop',   obstacle:'sticky_caramel' },
    { x:240,  height:35,  slope:14, surface:'chocolate',  obstacle:null },
    { x:300,  height:50,  slope:16, surface:'gummy',      obstacle:'bouncy_pad' },
    { x:360,  height:67,  slope:18, surface:'gumdrop',   obstacle:'lollipop' },
    { x:420,  height:84,  slope:18, surface:'candy_cane', obstacle:null },
    { x:480,  height:100, slope:16, surface:'gummy',      obstacle:'sticky_caramel' },
    { x:540,  height:114, slope:14, surface:'chocolate',  obstacle:'bouncy_pad' },
    { x:600,  height:126, slope:12, surface:'gumdrop',   obstacle:null },
    { x:660,  height:136, slope:10, surface:'gummy',      obstacle:'candy_roll' },
    { x:720,  height:145, slope:8,  surface:'candy_cane', obstacle:'lollipop' },
    { x:780,  height:153, slope:8,  surface:'chocolate',  obstacle:null },
    { x:840,  height:162, slope:10, surface:'gumdrop',   obstacle:'sticky_caramel' },
    { x:900,  height:174, slope:12, surface:'gummy',      obstacle:'bouncy_pad' },
    { x:960,  height:188, slope:14, surface:'candy_cane', obstacle:null },
    { x:1020, height:204, slope:16, surface:'chocolate',  obstacle:'lollipop' },
    { x:1080, height:222, slope:18, surface:'gumdrop',   obstacle:'candy_roll' },
    { x:1140, height:240, slope:18, surface:'gummy',      obstacle:null },
    { x:1200, height:256, slope:14, surface:'candy_cane', obstacle:'sticky_caramel' },
    { x:1260, height:270, slope:12, surface:'chocolate',  obstacle:'bouncy_pad' },
    { x:1320, height:282, slope:10, surface:'gumdrop',   obstacle:'lollipop' },
    { x:1380, height:293, slope:8,  surface:'gummy',      obstacle:null },
    { x:1440, height:303, slope:8,  surface:'candy_cane', obstacle:'candy_roll' },
    { x:1500, height:314, slope:10, surface:'chocolate',  obstacle:null },
    { x:1560, height:328, slope:12, surface:'gumdrop',   obstacle:'sticky_caramel' },
    { x:1620, height:344, slope:14, surface:'gummy',      obstacle:'bouncy_pad' },
    { x:1680, height:362, slope:16, surface:'candy_cane', obstacle:null },
    { x:1740, height:381, slope:18, surface:'chocolate',  obstacle:'lollipop' },
    { x:1800, height:400, slope:18, surface:'gumdrop',   obstacle:'candy_roll' },
    { x:1860, height:418, slope:16, surface:'gummy',      obstacle:null },
    { x:1920, height:434, slope:14, surface:'candy_cane', obstacle:'sticky_caramel' },
    { x:1980, height:448, slope:12, surface:'chocolate',  obstacle:'bouncy_pad' },
    { x:2040, height:460, slope:10, surface:'gumdrop',   obstacle:'lollipop' },
    { x:2100, height:470, slope:8,  surface:'gummy',      obstacle:null },
    { x:2160, height:479, slope:6,  surface:'candy_cane', obstacle:'candy_roll' },
    { x:2220, height:486, slope:6,  surface:'chocolate',  obstacle:null },
    { x:2280, height:493, slope:5,  surface:'gumdrop',   obstacle:'sticky_caramel' },
    { x:2340, height:499, slope:4,  surface:'gummy',      obstacle:'lollipop' },
    { x:2420, height:504, slope:2,  surface:'candy_cane', obstacle:null },
    { x:2500, height:507, slope:1,  surface:'gumdrop',   obstacle:null }
  ],
  obstacles:[
    { type:'sticky_caramel', x:185,  y:22,  width:80,  height:10, behavior:'slow_vehicle',    damage:0,  slowFactor:0.35, stickDuration:2 },
    { type:'bouncy_pad',     x:305,  y:50,  width:60,  height:15, behavior:'super_bounce',    damage:0,  bounceForce:900 },
    { type:'lollipop',       x:368,  y:47,  width:18,  height:70, behavior:'static',           damage:25 },
    { type:'candy_roll',     x:668,  y:130, width:40,  height:40, behavior:'roll_right',       damage:20, speed:2.5, mass:100 },
    { type:'sticky_caramel', x:848,  y:162, width:100, height:10, behavior:'slow_vehicle',    damage:0,  slowFactor:0.3, stickDuration:2.5 },
    { type:'bouncy_pad',     x:908,  y:174, width:70,  height:15, behavior:'super_bounce',    damage:0,  bounceForce:1000 },
    { type:'lollipop',       x:1028, y:200, width:20,  height:80, behavior:'static',           damage:28 },
    { type:'candy_roll',     x:1088, y:218, width:45,  height:45, behavior:'roll_right',       damage:22, speed:3, mass:120 },
    { type:'sticky_caramel', x:1208, y:256, width:120, height:10, behavior:'slow_vehicle',    damage:0,  slowFactor:0.25, stickDuration:3 },
    { type:'bouncy_pad',     x:1268, y:270, width:80,  height:15, behavior:'super_bounce',    damage:0,  bounceForce:1100 },
    { type:'lollipop',       x:1328, y:278, width:22,  height:90, behavior:'static',           damage:30 },
    { type:'candy_roll',     x:1448, y:300, width:50,  height:50, behavior:'roll_right',       damage:25, speed:3.5, mass:150 },
    { type:'sticky_caramel', x:1568, y:328, width:140, height:10, behavior:'slow_vehicle',    damage:0,  slowFactor:0.2, stickDuration:3.5 },
    { type:'bouncy_pad',     x:1628, y:344, width:90,  height:15, behavior:'super_bounce',    damage:0,  bounceForce:1200 },
    { type:'lollipop',       x:1748, y:377, width:24,  height:100,behavior:'static',           damage:32 },
    { type:'candy_roll',     x:1808, y:396, width:55,  height:55, behavior:'roll_right',       damage:28, speed:4, mass:180 },
    { type:'sticky_caramel', x:1928, y:434, width:160, height:10, behavior:'slow_vehicle',    damage:0,  slowFactor:0.15, stickDuration:4 },
    { type:'bouncy_pad',     x:1988, y:448, width:100, height:15, behavior:'super_bounce',    damage:0,  bounceForce:1300 },
    { type:'lollipop',       x:2048, y:456, width:26,  height:110,behavior:'static',           damage:35 },
    { type:'candy_roll',     x:2168, y:475, width:60,  height:60, behavior:'roll_right',       damage:30, speed:4.5, mass:200 }
  ],
  collectibles:{
    coinSpawnRate:0.9, fuelSpawnRate:0.12, powerupSpawnRate:0.12,
    preferredSurfaces:['gummy','gumdrop','chocolate'], avoidSurfaces:[],
    clusterSize:{ min:6, max:15 },
    specialDrops:[
      { type:'candy_magnet', probability:0.1,  effect:'auto_collect_coins_20s' },
      { type:'sugar_rush',   probability:0.06, effect:'speed_2x_8s' }
    ]
  },
  background:{
    layers:[
      { id:'candy_sky',      parallaxX:0.04, parallaxY:0, color:'#ffaad4', gradient:['#ff88cc','#ffaad4','#ffccee'] },
      { id:'cotton_candy',   parallaxX:0.1,  parallaxY:0.02, color:'#ffbbee', animated:true, puffFloat:true },
      { id:'lollipop_hills', parallaxX:0.25, parallaxY:0, color:'#ff66aa' },
      { id:'candy_cane_fg',  parallaxX:0.5,  parallaxY:0, color:'#ff2244', striped:true },
      { id:'sparkles',       parallaxX:0.8,  parallaxY:0.1, color:'#ffffff', particleCount:50, twinkle:true }
    ]
  },
  weather:{ type:'sugar_shower', intensity:0.3, windSpeed:4, windDir:270, visibility:0.9, sugarColor:'#ffffff' },
  hazards:[
    { type:'gumball_rain', path:'random_vertical', speed:8, damage:15, size:15, frequency:0.2 },
    { type:'candy_tornado',path:'random_wander',   speed:4, damage:25, size:60, frequency:0.04 }
  ],
  checkpoints:[
    { x:300,  bonusTime:25 },
    { x:700,  bonusTime:22 },
    { x:1200, bonusTime:20 },
    { x:1700, bonusTime:18 },
    { x:2200, bonusTime:15 }
  ],
  bossZone:{ x:2200, y:493, width:300, height:80, bossType:'sugar_witch', triggerOnce:true },
  timeTrial:{ gold:110, silver:145, bronze:190 },
  unlockRequirements:{ playerLevel:5, starsNeeded:8, previousMap:null }
},

// ── 10. SPACE_STATION ────────────────────────────────────────
{
  id: 'space_station',
  name: 'Space Station Alpha',
  theme: 'space',
  difficulty: 8,
  length: 3400,
  description: 'Navigate a damaged space station with zero-gravity zones, rotating ring sections, and vacuum hazards.',
  biome:{ type:'space_station', gravity:9.81, airDensity:0, friction:0.4, ambientTemp:-20 },
  terrainProfile: [
    { x:0,    height:0,   slope:0,  surface:'metal',    obstacle:null },
    { x:80,   height:6,   slope:5,  surface:'metal',    obstacle:'loose_panel' },
    { x:160,  height:15,  slope:10, surface:'metal',    obstacle:null },
    { x:240,  height:27,  slope:12, surface:'grating',  obstacle:'air_vent' },
    { x:320,  height:42,  slope:14, surface:'metal',    obstacle:'rotating_arm' },
    { x:400,  height:60,  slope:18, surface:'grating',  obstacle:null },
    { x:480,  height:80,  slope:20, surface:'metal',    obstacle:'airlock' },
    { x:560,  height:100, slope:20, surface:'grating',  obstacle:'loose_panel' },
    { x:640,  height:120, slope:20, surface:'metal',    obstacle:null },
    { x:720,  height:140, slope:20, surface:'zero_g',   obstacle:'zero_gravity_zone' },
    { x:800,  height:155, slope:12, surface:'metal',    obstacle:'rotating_arm' },
    { x:880,  height:168, slope:12, surface:'grating',  obstacle:null },
    { x:960,  height:182, slope:14, surface:'metal',    obstacle:'air_vent' },
    { x:1040, height:198, slope:16, surface:'grating',  obstacle:'loose_panel' },
    { x:1120, height:216, slope:18, surface:'metal',    obstacle:'airlock' },
    { x:1200, height:236, slope:20, surface:'zero_g',   obstacle:'zero_gravity_zone' },
    { x:1280, height:254, slope:16, surface:'metal',    obstacle:null },
    { x:1360, height:270, slope:14, surface:'grating',  obstacle:'rotating_arm' },
    { x:1440, height:284, slope:12, surface:'metal',    obstacle:'loose_panel' },
    { x:1520, height:297, slope:12, surface:'grating',  obstacle:null },
    { x:1600, height:311, slope:12, surface:'metal',    obstacle:'air_vent' },
    { x:1680, height:326, slope:12, surface:'grating',  obstacle:'airlock' },
    { x:1760, height:342, slope:14, surface:'metal',    obstacle:null },
    { x:1840, height:360, slope:16, surface:'zero_g',   obstacle:'zero_gravity_zone' },
    { x:1920, height:380, slope:18, surface:'metal',    obstacle:'rotating_arm' },
    { x:2000, height:401, slope:18, surface:'grating',  obstacle:'loose_panel' },
    { x:2080, height:422, slope:18, surface:'metal',    obstacle:null },
    { x:2160, height:440, slope:16, surface:'grating',  obstacle:'air_vent' },
    { x:2240, height:456, slope:14, surface:'metal',    obstacle:'airlock' },
    { x:2320, height:470, slope:12, surface:'grating',  obstacle:null },
    { x:2400, height:482, slope:10, surface:'zero_g',   obstacle:'zero_gravity_zone' },
    { x:2480, height:492, slope:8,  surface:'metal',    obstacle:'rotating_arm' },
    { x:2560, height:500, slope:8,  surface:'grating',  obstacle:'loose_panel' },
    { x:2640, height:509, slope:8,  surface:'metal',    obstacle:null },
    { x:2720, height:519, slope:10, surface:'grating',  obstacle:'air_vent' },
    { x:2800, height:531, slope:12, surface:'metal',    obstacle:'airlock' },
    { x:2880, height:545, slope:14, surface:'zero_g',   obstacle:'zero_gravity_zone' },
    { x:2960, height:561, slope:16, surface:'metal',    obstacle:null },
    { x:3040, height:579, slope:18, surface:'grating',  obstacle:'rotating_arm' },
    { x:3120, height:598, slope:18, surface:'metal',    obstacle:'loose_panel' },
    { x:3200, height:616, slope:16, surface:'grating',  obstacle:'air_vent' },
    { x:3280, height:632, slope:14, surface:'metal',    obstacle:null },
    { x:3360, height:646, slope:12, surface:'grating',  obstacle:'airlock' },
    { x:3400, height:654, slope:6,  surface:'metal',    obstacle:null }
  ],
  obstacles:[
    { type:'loose_panel',      x:85,   y:6,   width:40,  height:8,  behavior:'fall_on_trigger', damage:25, fallDelay:0.3 },
    { type:'air_vent',         x:248,  y:27,  width:30,  height:40, behavior:'push_directional',damage:0,  direction:'up', force:600 },
    { type:'rotating_arm',     x:330,  y:42,  width:120, height:10, behavior:'rotate_fixed',    damage:60, rotSpeed:1.5, pivotX:330 },
    { type:'airlock',          x:490,  y:70,  width:20,  height:60, behavior:'cycle_open_close',damage:40, openTime:2, closeTime:1.5 },
    { type:'zero_gravity_zone',x:730,  y:100, width:200, height:80, behavior:'zero_gravity',    damage:0,  gravityMult:0 },
    { type:'debris_field',     x:870,  y:160, width:30,  height:30, behavior:'random_drift',    damage:35, driftSpeed:2 },
    { type:'air_vent',         x:968,  y:182, width:30,  height:40, behavior:'push_directional',damage:0,  direction:'right',force:500 },
    { type:'rotating_arm',     x:1100, y:200, width:140, height:10, behavior:'rotate_fixed',    damage:65, rotSpeed:2, pivotX:1100 },
    { type:'airlock',          x:1130, y:216, width:20,  height:70, behavior:'cycle_open_close',damage:45, openTime:1.5, closeTime:2 },
    { type:'zero_gravity_zone',x:1210, y:196, width:220, height:90, behavior:'zero_gravity',    damage:0,  gravityMult:0 },
    { type:'loose_panel',      x:1450, y:284, width:45,  height:8,  behavior:'fall_on_trigger', damage:28, fallDelay:0.25 },
    { type:'air_vent',         x:1610, y:311, width:30,  height:40, behavior:'push_directional',damage:0,  direction:'up', force:700 },
    { type:'airlock',          x:1695, y:322, width:20,  height:75, behavior:'cycle_open_close',damage:50, openTime:1.2, closeTime:2.5 },
    { type:'zero_gravity_zone',x:1850, y:320, width:250, height:100,behavior:'zero_gravity',    damage:0,  gravityMult:0 },
    { type:'rotating_arm',     x:1935, y:362, width:160, height:10, behavior:'rotate_fixed',    damage:70, rotSpeed:2.5, pivotX:1935 },
    { type:'debris_field',     x:2080, y:405, width:35,  height:35, behavior:'random_drift',    damage:40, driftSpeed:3 },
    { type:'airlock',          x:2255, y:442, width:20,  height:80, behavior:'cycle_open_close',damage:55, openTime:1, closeTime:3 },
    { type:'zero_gravity_zone',x:2410, y:440, width:280, height:110,behavior:'zero_gravity',    damage:0,  gravityMult:0 },
    { type:'rotating_arm',     x:2500, y:480, width:180, height:10, behavior:'rotate_fixed',    damage:75, rotSpeed:3, pivotX:2500 },
    { type:'zero_gravity_zone',x:2895, y:500, width:300, height:120,behavior:'zero_gravity',    damage:0,  gravityMult:0 }
  ],
  collectibles:{
    coinSpawnRate:0.55, fuelSpawnRate:0.2, powerupSpawnRate:0.08,
    preferredSurfaces:['metal','grating'], avoidSurfaces:['zero_g'],
    clusterSize:{ min:3, max:7 },
    specialDrops:[
      { type:'mag_boots',     probability:0.07, effect:'ignore_zero_g_20s' },
      { type:'repair_kit',    probability:0.05, effect:'heal_25_percent' }
    ]
  },
  background:{
    layers:[
      { id:'space_void',    parallaxX:0.0,  parallaxY:0, color:'#000008' },
      { id:'stars_dense',   parallaxX:0.01, parallaxY:0, color:'#ffffff', starCount:400, twinkle:false },
      { id:'nebula_far',    parallaxX:0.02, parallaxY:0, color:'#330066', opacity:0.4, nebulaBands:true },
      { id:'planet_distant',parallaxX:0.03, parallaxY:0, color:'#cc4400', radius:80 },
      { id:'station_struts',parallaxX:0.3,  parallaxY:0, color:'#888899', metallic:true }
    ]
  },
  weather:{ type:'vacuum', intensity:1.0, windSpeed:0, windDir:0, visibility:1.0, solarRadiation:0.3 },
  hazards:[
    { type:'micrometeorite', path:'random_horizontal', speed:25, damage:50, size:8, frequency:0.15 },
    { type:'plasma_arc',     path:'static_arc',        speed:0,  damage:80, size:100, frequency:0.04, duration:0.5, warningTime:2 }
  ],
  checkpoints:[
    { x:480,  bonusTime:38 },
    { x:1100, bonusTime:32 },
    { x:1800, bonusTime:30 },
    { x:2500, bonusTime:28 },
    { x:3100, bonusTime:22 }
  ],
  bossZone:{ x:3100, y:598, width:300, height:80, bossType:'rogue_ai_sentinel', triggerOnce:true },
  timeTrial:{ gold:175, silver:230, bronze:295 },
  unlockRequirements:{ playerLevel:22, starsNeeded:48, previousMap:'volcano_peak' }
},

// ── 11-18: REMAINING MAPS (condensed complete definitions) ───

// 11. DINOSAUR_VALLEY
{
  id:'dinosaur_valley', name:'Dinosaur Valley', theme:'prehistoric', difficulty:7, length:3600,
  description:'Traverse a Cretaceous landscape with active dinosaurs, tar pits, and meteor bombardment.',
  biome:{ type:'prehistoric', gravity:9.81, airDensity:1.4, friction:0.65, ambientTemp:35 },
  terrainProfile:(function(){
    const pts=[];
    const heights=[0,10,22,38,58,80,104,128,150,170,188,203,215,224,232,238,242,245,247,248,248,247,244,240,235,228,220,211,201,190,178,165,152,140,130,122,116,112,110,110,112,116,122,130,140,152,166,182,200,220];
    const surfaces=['dirt','mud','rock','tar','grass','dirt','rock','mud','tar','rock'];
    const obs=[null,'boulder','null','tar_pit','fern','null','raptor','null','tar_pit','null','boulder','null','raptor','null','tar_pit','null','pterodactyl','null','tar_pit','null','boulder','null','raptor','null','tar_pit','null','boulder','null','pterodactyl','null','raptor','null','tar_pit','null','boulder','null','raptor','null','null','null','tar_pit','null','boulder','null','raptor','null','tar_pit','null','pterodactyl','null'];
    for(let i=0;i<50;i++){
      pts.push({ x:i*72, height:heights[i]||0, slope:i<49?(heights[i+1]-heights[i])/72*100:2,
        surface:surfaces[i%surfaces.length], obstacle:obs[i] });
    }
    return pts;
  })(),
  obstacles:[
    {type:'tar_pit',      x:216,  y:38,  width:140,height:12,behavior:'slow_sink',      damage:5,  sinkRate:0.3},
    {type:'raptor',       x:432,  y:80,  width:45, height:55,behavior:'chase_vehicle',   damage:65, speed:7,  sightRange:300},
    {type:'trex_stomp',   x:720,  y:128, width:60, height:10,behavior:'periodic_stomp',  damage:80, period:4, warningTime:1.5},
    {type:'tar_pit',      x:864,  y:170, width:180,height:12,behavior:'slow_sink',      damage:5,  sinkRate:0.4},
    {type:'pterodactyl',  x:1152, y:50,  width:70, height:30,behavior:'swoop_dive',      damage:50, swoopPeriod:6},
    {type:'raptor',       x:1440, y:240, width:50, height:60,behavior:'chase_vehicle',   damage:70, speed:8,  sightRange:350},
    {type:'meteor_small', x:1800, y:-50, width:20, height:20,behavior:'fall_random',     damage:60, impactRadius:40},
    {type:'tar_pit',      x:2016, y:248, width:200,height:12,behavior:'slow_sink',      damage:5,  sinkRate:0.5},
    {type:'trex_stomp',   x:2304, y:247, width:80, height:10,behavior:'periodic_stomp',  damage:90, period:3.5,warningTime:1.2},
    {type:'raptor',       x:2592, y:240, width:55, height:65,behavior:'chase_vehicle',   damage:75, speed:9,  sightRange:400},
    {type:'pterodactyl',  x:2880, y:40,  width:80, height:35,behavior:'swoop_dive',      damage:55, swoopPeriod:5},
    {type:'tar_pit',      x:3168, y:200, width:240,height:12,behavior:'slow_sink',      damage:5,  sinkRate:0.6},
    {type:'trex_stomp',   x:3456, y:220, width:100,height:10,behavior:'periodic_stomp',  damage:95, period:3,  warningTime:1.0}
  ],
  collectibles:{coinSpawnRate:0.65,fuelSpawnRate:0.18,powerupSpawnRate:0.07,preferredSurfaces:['grass','dirt'],avoidSurfaces:['tar'],clusterSize:{min:3,max:8},specialDrops:[{type:'fossil',probability:0.04,effect:'score_bonus_800'},{type:'amber',probability:0.03,effect:'shield_20s'}]},
  background:{layers:[{id:'jurassic_sky',parallaxX:0.04,parallaxY:0,color:'#334400',gradient:['#223300','#334400','#445500']},{id:'volcano_bg',parallaxX:0.1,parallaxY:0,color:'#551100'},{id:'tree_ferns_far',parallaxX:0.2,parallaxY:0,color:'#1a3300'},{id:'tree_ferns_near',parallaxX:0.4,parallaxY:0,color:'#0d2200'},{id:'meteor_trails',parallaxX:0.6,parallaxY:0.1,color:'#ff6600',particleCount:5,speed:15}]},
  weather:{type:'humid_prehistoric',intensity:0.5,windSpeed:6,windDir:240,visibility:0.7,humidity:0.85},
  hazards:[{type:'meteor',path:'diagonal_fall',speed:22,damage:75,size:25,frequency:0.06},{type:'trex',path:'chase_player',speed:5,damage:90,size:150,frequency:0.02}],
  checkpoints:[{x:504,bonusTime:38},{x:1152,bonusTime:32},{x:1872,bonusTime:28},{x:2592,bonusTime:25},{x:3240,bonusTime:20}],
  bossZone:{x:3300,y:200,width:300,height:100,bossType:'trex_alpha',triggerOnce:true},
  timeTrial:{gold:185,silver:240,bronze:305},
  unlockRequirements:{playerLevel:19,starsNeeded:38,previousMap:'deep_ocean'}
},

// 12. PIRATE_COVE
{
  id:'pirate_cove', name:'Pirate Cove', theme:'pirate', difficulty:6, length:3000,
  description:'Navigate treacherous coastal waters past shipwrecks, cannon fire, and giant crabs.',
  biome:{type:'coastal',gravity:9.81,airDensity:1.28,friction:0.55,ambientTemp:28},
  terrainProfile:(function(){
    const pts=[];
    const hs=[0,8,18,32,50,70,92,115,138,160,180,198,214,228,240,250,258,264,268,270,270,268,264,258,250,240,228,214,198,180,162,145,130,117,106,97,90,85,82,81,82,85,90,97,106,117,130,145,160,176];
    const surfs=['sand','rock','sand','water','rock','wood','sand','rock','water','wood'];
    const obs=[null,'cannon_ball',null,'wave',null,'ship_wreck',null,'crab',null,'wave','cannon_ball',null,'crab',null,'ship_wreck',null,'wave',null,'crab',null,null,'cannon_ball',null,'wave',null,'crab',null,'ship_wreck',null,'wave',null,'cannon_ball',null,'crab',null,'wave',null,'ship_wreck',null,'crab',null,'cannon_ball',null,'wave',null,'crab',null,'ship_wreck',null,'wave'];
    for(let i=0;i<50;i++){pts.push({x:i*60,height:hs[i]||0,slope:i<49?(hs[i+1]-hs[i])/60*100:2,surface:surfs[i%10],obstacle:obs[i]});}
    return pts;
  })(),
  obstacles:[
    {type:'cannon_ball',x:120,y:20,width:20,height:20,behavior:'arc_projectile',damage:70,fireRate:4,arc_height:80},
    {type:'wave',       x:300,y:32,width:100,height:30,behavior:'move_right',   damage:30,speed:5,period:4},
    {type:'giant_crab', x:480,y:92,width:60,height:45,behavior:'patrol_pincer',damage:60,speed:3,patrolDist:150},
    {type:'ship_wreck', x:660,y:138,width:120,height:60,behavior:'static',      damage:45,destructible:false},
    {type:'whirlpool',  x:840,y:180,width:80,height:80,behavior:'suck_in',     damage:55,pullForce:300,radius:80},
    {type:'cannon_ball',x:1020,y:250,width:20,height:20,behavior:'arc_projectile',damage:75,fireRate:3.5,arc_height:90},
    {type:'wave',       x:1200,y:270,width:120,height:35,behavior:'move_right', damage:35,speed:6,period:3.5},
    {type:'giant_crab', x:1380,y:260,width:70,height:52,behavior:'patrol_pincer',damage:65,speed:4,patrolDist:180},
    {type:'ship_wreck', x:1560,y:240,width:140,height:70,behavior:'static',     damage:50,destructible:false},
    {type:'whirlpool',  x:1740,y:200,width:90,height:90,behavior:'suck_in',    damage:60,pullForce:350,radius:90},
    {type:'cannon_ball',x:1920,y:162,width:20,height:20,behavior:'arc_projectile',damage:80,fireRate:3,arc_height:100},
    {type:'giant_crab', x:2100,y:130,width:75,height:55,behavior:'patrol_pincer',damage:70,speed:5,patrolDist:200},
    {type:'wave',       x:2280,y:106,width:140,height:40,behavior:'move_right', damage:40,speed:7,period:3},
    {type:'whirlpool',  x:2460,y:90,width:100,height:100,behavior:'suck_in',   damage:65,pullForce:400,radius:100},
    {type:'ship_wreck', x:2640,y:82,width:160,height:80,behavior:'static',     damage:55,destructible:false},
    {type:'cannon_ball',x:2820,y:85,width:20,height:20,behavior:'arc_projectile',damage:85,fireRate:2.5,arc_height:110}
  ],
  collectibles:{coinSpawnRate:0.72,fuelSpawnRate:0.17,powerupSpawnRate:0.08,preferredSurfaces:['sand','wood'],avoidSurfaces:['water'],clusterSize:{min:4,max:10},specialDrops:[{type:'treasure_map',probability:0.03,effect:'reveal_secret_path'},{type:'rum_barrel',probability:0.05,effect:'invincible_8s'}]},
  background:{layers:[{id:'sea_sky',parallaxX:0.04,parallaxY:0,color:'#0033aa',gradient:['#001155','#0033aa','#0055cc']},{id:'clouds',parallaxX:0.1,parallaxY:0.02,color:'#ffffff',opacity:0.6},{id:'sea_far',parallaxX:0.15,parallaxY:0,color:'#003366'},{id:'ships',parallaxX:0.3,parallaxY:0,color:'#331100'},{id:'sea_foam',parallaxX:0.7,parallaxY:0.05,color:'#ffffff',animated:true,foamAnim:true}]},
  weather:{type:'sea_storm',intensity:0.6,windSpeed:18,windDir:260,visibility:0.55,waveHeight:3.5},
  hazards:[{type:'rogue_wave',path:'horizontal_surge',speed:12,damage:50,size:200,frequency:0.03},{type:'kraken_tentacle',path:'rise_from_water',speed:3,damage:80,size:80,frequency:0.02}],
  checkpoints:[{x:360,bonusTime:32},{x:840,bonusTime:28},{x:1440,bonusTime:25},{x:2100,bonusTime:22},{x:2700,bonusTime:18}],
  bossZone:{x:2700,y:106,width:300,height:100,bossType:'kraken',triggerOnce:true},
  timeTrial:{gold:155,silver:205,bronze:265},
  unlockRequirements:{playerLevel:16,starsNeeded:30,previousMap:'arctic_storm'}
},

// 13. STEAMPUNK_FACTORY
{
  id:'steampunk_factory', name:'Steampunk Factory', theme:'steampunk', difficulty:7, length:3200,
  description:'Navigate a Victorian-era factory floor with gears, pistons, conveyor belts, and steam vents.',
  biome:{type:'industrial',gravity:9.81,airDensity:1.35,friction:0.68,ambientTemp:42},
  terrainProfile:(function(){
    const pts=[];
    const hs=[0,5,12,22,35,50,68,88,110,132,152,170,186,200,212,222,230,236,240,242,242,240,236,230,222,212,200,186,170,152,134,118,104,92,82,74,68,64,62,62,64,68,74,82,92,104,118,134,152,172];
    const surfs=['metal','grating','conveyor','metal','gear_floor','grating','metal','conveyor','gear_floor','metal'];
    const obs=[null,'gear_large',null,'steam_vent',null,'piston',null,'conveyor_hazard',null,'gear_large','steam_vent',null,'piston',null,'conveyor_hazard',null,'gear_large',null,'steam_vent',null,null,'gear_large',null,'piston',null,'conveyor_hazard',null,'steam_vent',null,'gear_large',null,'piston',null,'conveyor_hazard',null,'steam_vent',null,'gear_large',null,null,null,'piston',null,'gear_large',null,'conveyor_hazard',null,'steam_vent',null,'gear_large'];
    for(let i=0;i<50;i++){pts.push({x:i*64,height:hs[i]||0,slope:i<49?(hs[i+1]-hs[i])/64*100:2,surface:surfs[i%10],obstacle:obs[i]});}
    return pts;
  })(),
  obstacles:[
    {type:'gear_large',      x:64,  y:5,   width:60, height:60, behavior:'rotate_in_place',damage:55, rotSpeed:1.2},
    {type:'steam_vent',      x:192, y:22,  width:20, height:60, behavior:'periodic_burst', damage:45, period:3, duration:1},
    {type:'piston',          x:320, y:35,  width:25, height:80, behavior:'reciprocate',    damage:70, period:2, stroke:60},
    {type:'conveyor',        x:448, y:50,  width:160,height:10, behavior:'move_surface',   damage:0,  surfaceSpeed:5, direction:'right'},
    {type:'gear_large',      x:640, y:88,  width:70, height:70, behavior:'rotate_in_place',damage:60, rotSpeed:1.5},
    {type:'steam_vent',      x:704, y:110, width:20, height:70, behavior:'periodic_burst', damage:50, period:2.5,duration:1.2},
    {type:'piston',          x:896, y:152, width:30, height:90, behavior:'reciprocate',    damage:75, period:1.8,stroke:70},
    {type:'conveyor',        x:1024,y:186, width:180,height:10, behavior:'move_surface',   damage:0,  surfaceSpeed:6, direction:'left'},
    {type:'gear_large',      x:1216,y:222, width:80, height:80, behavior:'rotate_in_place',damage:65, rotSpeed:1.8},
    {type:'steam_vent',      x:1344,y:240, width:20, height:80, behavior:'periodic_burst', damage:55, period:2, duration:1.5},
    {type:'piston',          x:1472,y:242, width:35, height:100,behavior:'reciprocate',    damage:80, period:1.5,stroke:80},
    {type:'conveyor',        x:1600,y:240, width:200,height:10, behavior:'move_surface',   damage:0,  surfaceSpeed:7, direction:'right'},
    {type:'gear_large',      x:1792,y:236, width:90, height:90, behavior:'rotate_in_place',damage:70, rotSpeed:2},
    {type:'steam_vent',      x:1920,y:222, width:20, height:90, behavior:'periodic_burst', damage:60, period:1.8,duration:1.8},
    {type:'piston',          x:2048,y:200, width:40, height:110,behavior:'reciprocate',    damage:85, period:1.3,stroke:90},
    {type:'conveyor',        x:2176,y:170, width:220,height:10, behavior:'move_surface',   damage:0,  surfaceSpeed:8, direction:'left'},
    {type:'gear_large',      x:2368,y:134, width:100,height:100,behavior:'rotate_in_place',damage:75, rotSpeed:2.2},
    {type:'steam_vent',      x:2496,y:104, width:20, height:100,behavior:'periodic_burst', damage:65, period:1.5,duration:2},
    {type:'piston',          x:2624,y:82,  width:45, height:120,behavior:'reciprocate',    damage:90, period:1.2,stroke:100},
    {type:'conveyor',        x:2752,y:64,  width:240,height:10, behavior:'move_surface',   damage:0,  surfaceSpeed:9, direction:'right'}
  ],
  collectibles:{coinSpawnRate:0.65,fuelSpawnRate:0.2,powerupSpawnRate:0.08,preferredSurfaces:['metal','grating'],avoidSurfaces:['conveyor'],clusterSize:{min:3,max:8},specialDrops:[{type:'gear_token',probability:0.06,effect:'magnet_5s'},{type:'pressure_gauge',probability:0.04,effect:'reveal_hazards_30s'}]},
  background:{layers:[{id:'factory_ceiling',parallaxX:0.1,parallaxY:0,color:'#221100'},{id:'smoke_pipes',parallaxX:0.2,parallaxY:0.03,color:'#554433',animated:true,smokeRise:1.5},{id:'gear_bg',parallaxX:0.3,parallaxY:0,color:'#332211',animated:true,rotateGears:true},{id:'steam_mist',parallaxX:0.6,parallaxY:0.05,color:'#ccbbaa',opacity:0.3,animated:true},{id:'sparks',parallaxX:0.9,parallaxY:0.1,color:'#ffaa00',particleCount:30,sparkBurst:true}]},
  weather:{type:'factory_smoke',intensity:0.5,windSpeed:4,windDir:0,visibility:0.6,smokeColor:'#886644'},
  hazards:[{type:'pressure_explosion',path:'random_static',speed:0,damage:90,size:80,frequency:0.04,warningTime:2},{type:'molten_metal',path:'pour_from_above',speed:5,damage:85,size:30,frequency:0.06}],
  checkpoints:[{x:400,bonusTime:34},{x:900,bonusTime:30},{x:1500,bonusTime:27},{x:2100,bonusTime:24},{x:2700,bonusTime:20}],
  bossZone:{x:2800,y:64,width:400,height:100,bossType:'steam_titan',triggerOnce:true},
  timeTrial:{gold:165,silver:218,bronze:280},
  unlockRequirements:{playerLevel:18,starsNeeded:37,previousMap:'crystal_caves'}
},

// 14. CRYSTAL_CAVES
{
  id:'crystal_caves', name:'Crystal Caves', theme:'crystal', difficulty:6, length:3000,
  description:'Navigate glittering crystal caverns with luminescent surfaces, ice-like physics, and crystal golems.',
  biome:{type:'crystal',gravity:9.81,airDensity:1.1,friction:0.22,ambientTemp:-8},
  terrainProfile:(function(){
    const pts=[];
    const hs=[0,8,20,36,56,80,106,132,156,178,197,213,227,239,249,257,263,267,269,269,267,263,257,249,239,227,213,197,179,160,141,124,109,96,85,76,69,64,61,60,61,64,69,76,85,96,109,124,141,160];
    const surfs=['crystal','ice_crystal','cave_rock','crystal','luminescent','ice_crystal','cave_rock','crystal','luminescent','ice_crystal'];
    const obs=[null,'crystal_spike',null,'stalactite',null,'crystal_golem',null,'falling_crystal',null,'crystal_spike','stalactite',null,'crystal_golem',null,'falling_crystal',null,'crystal_spike',null,'stalactite',null,null,'crystal_golem',null,'crystal_spike',null,'falling_crystal',null,'stalactite',null,'crystal_golem',null,'crystal_spike',null,'falling_crystal',null,'stalactite',null,'crystal_golem',null,null,null,'crystal_spike',null,'stalactite',null,'falling_crystal',null,'crystal_golem',null,'crystal_spike'];
    for(let i=0;i<50;i++){pts.push({x:i*60,height:hs[i]||0,slope:i<49?(hs[i+1]-hs[i])/60*100:2,surface:surfs[i%10],obstacle:obs[i]});}
    return pts;
  })(),
  obstacles:[
    {type:'crystal_spike',   x:60,  y:8,   width:12,height:40,behavior:'static',         damage:50},
    {type:'stalactite',      x:180, y:-20, width:14,height:55,behavior:'fall_on_trigger', damage:60, fallDelay:0.4},
    {type:'crystal_golem',   x:300, y:56,  width:50,height:70,behavior:'stomp_walk',      damage:75, walkSpeed:1.5},
    {type:'falling_crystal', x:480, y:-20, width:10,height:80,behavior:'fall_periodic',   damage:55, period:5},
    {type:'crystal_spike',   x:600, y:106, width:14,height:45,behavior:'static',          damage:55},
    {type:'stalactite',      x:720, y:-20, width:16,height:65,behavior:'fall_on_trigger', damage:65, fallDelay:0.35},
    {type:'crystal_golem',   x:900, y:178, width:55,height:78,behavior:'stomp_walk',      damage:80, walkSpeed:2},
    {type:'falling_crystal', x:1080,y:-20, width:12,height:90,behavior:'fall_periodic',   damage:60, period:4.5},
    {type:'crystal_spike',   x:1200,y:239, width:16,height:50,behavior:'static',          damage:60},
    {type:'crystal_golem',   x:1440,y:267, width:60,height:85,behavior:'stomp_walk',      damage:85, walkSpeed:2.5},
    {type:'stalactite',      x:1620,y:-20, width:18,height:75,behavior:'fall_on_trigger', damage:70, fallDelay:0.3},
    {type:'falling_crystal', x:1800,y:-20, width:14,height:100,behavior:'fall_periodic',  damage:65, period:4},
    {type:'crystal_spike',   x:2040,y:263, width:18,height:55,behavior:'static',          damage:65},
    {type:'crystal_golem',   x:2220,y:239, width:65,height:90,behavior:'stomp_walk',      damage:90, walkSpeed:3},
    {type:'stalactite',      x:2400,y:-20, width:20,height:85,behavior:'fall_on_trigger', damage:75, fallDelay:0.25},
    {type:'falling_crystal', x:2580,y:-20, width:16,height:110,behavior:'fall_periodic',  damage:70, period:3.5},
    {type:'crystal_spike',   x:2760,y:141, width:20,height:60,behavior:'static',          damage:70},
    {type:'crystal_golem',   x:2880,y:109, width:70,height:95,behavior:'stomp_walk',      damage:95, walkSpeed:3.5}
  ],
  collectibles:{coinSpawnRate:0.7,fuelSpawnRate:0.16,powerupSpawnRate:0.09,preferredSurfaces:['crystal','luminescent'],avoidSurfaces:[],clusterSize:{min:4,max:9},specialDrops:[{type:'crystal_shard',probability:0.08,effect:'score_bonus_600'},{type:'prism_powerup',probability:0.04,effect:'collect_radius_3x_15s'}]},
  background:{layers:[{id:'cave_dark',parallaxX:0.02,parallaxY:0,color:'#050510'},{id:'crystal_glow_far',parallaxX:0.1,parallaxY:0,color:'#4400aa',opacity:0.4,animated:true,pulse:true,pulseFreq:1.5},{id:'stalactites_bg',parallaxX:0.2,parallaxY:0,color:'#220066'},{id:'crystal_refraction',parallaxX:0.4,parallaxY:0.02,color:'#8844ff',opacity:0.3,animated:true,refractionAnim:true},{id:'sparkle_motes',parallaxX:0.8,parallaxY:0.05,color:'#ffffff',particleCount:40,twinkle:true}]},
  weather:{type:'crystal_mist',intensity:0.4,windSpeed:2,windDir:180,visibility:0.65,mistColor:'#8888ff'},
  hazards:[{type:'crystal_shard_burst',path:'omnidirectional',speed:15,damage:45,size:8,frequency:0.08},{type:'resonance_wave',path:'horizontal_sweep',speed:0,damage:35,size:600,frequency:0.02,duration:2,warningTime:3}],
  checkpoints:[{x:350,bonusTime:32},{x:800,bonusTime:28},{x:1350,bonusTime:25},{x:1950,bonusTime:22},{x:2600,bonusTime:18}],
  bossZone:{x:2700,y:109,width:300,height:100,bossType:'crystal_titan',triggerOnce:true},
  timeTrial:{gold:155,silver:205,bronze:265},
  unlockRequirements:{playerLevel:16,starsNeeded:31,previousMap:'neon_city'}
},

// 15. TORNADO_ALLEY
{
  id:'tornado_alley', name:'Tornado Alley', theme:'storm', difficulty:8, length:4000,
  description:'Race across the Great Plains while a massive tornado pursues you, hurling debris and destroying the terrain.',
  biome:{type:'plains',gravity:9.81,airDensity:1.22,friction:0.62,ambientTemp:22},
  terrainProfile:(function(){
    const pts=[];
    for(let i=0;i<55;i++){
      const x=i*73;
      const h=Math.round(Math.sin(i*0.18)*30+Math.cos(i*0.12)*20+i*3.5);
      const surfs=['grass','dirt','asphalt','grass','concrete','dirt'];
      const obs=[null,'debris',null,'trailer',null,'power_pole',null,'debris',null,'debris','trailer',null];
      pts.push({x,height:Math.max(0,h),slope:i<54?(Math.sin((i+1)*0.18)*30+Math.cos((i+1)*0.12)*20+(i+1)*3.5-h)/73*100:2,surface:surfs[i%6],obstacle:obs[i%12]});
    }
    return pts;
  })(),
  obstacles:[
    {type:'debris_car',    x:200,  y:20,  width:55, height:28,behavior:'projectile_random',damage:65,speed:12,tumble:true},
    {type:'power_pole',    x:400,  y:44,  width:10, height:60,behavior:'static',           damage:50},
    {type:'trailer_home',  x:600,  y:70,  width:120,height:50,behavior:'slide_right',       damage:60,slideSpeed:4},
    {type:'debris_car',    x:900,  y:108, width:60, height:30,behavior:'projectile_random',damage:70,speed:14,tumble:true},
    {type:'power_pole',    x:1100, y:138, width:12, height:70,behavior:'static',            damage:55},
    {type:'tornado_spawn', x:1300, y:0,   width:120,height:200,behavior:'track_player_slowly',damage:85,speed:3,liftForce:800},
    {type:'trailer_home',  x:1600, y:178, width:130,height:55,behavior:'slide_right',       damage:65,slideSpeed:5},
    {type:'debris_car',    x:1900, y:208, width:65, height:32,behavior:'projectile_random',damage:75,speed:16,tumble:true},
    {type:'tornado_spawn', x:2200, y:0,   width:140,height:220,behavior:'track_player_slowly',damage:90,speed:4,liftForce:1000},
    {type:'power_pole',    x:2500, y:248, width:14, height:80,behavior:'static',            damage:60},
    {type:'trailer_home',  x:2800, y:272, width:140,height:60,behavior:'slide_right',       damage:70,slideSpeed:6},
    {type:'debris_car',    x:3100, y:302, width:70, height:35,behavior:'projectile_random',damage:80,speed:18,tumble:true},
    {type:'tornado_spawn', x:3400, y:0,   width:160,height:240,behavior:'track_player_slowly',damage:95,speed:5,liftForce:1200},
    {type:'power_pole',    x:3700, y:345, width:16, height:90,behavior:'static',            damage:65}
  ],
  collectibles:{coinSpawnRate:0.6,fuelSpawnRate:0.2,powerupSpawnRate:0.08,preferredSurfaces:['asphalt','concrete'],avoidSurfaces:[],clusterSize:{min:3,max:8},specialDrops:[{type:'storm_shelter',probability:0.04,effect:'tornado_immunity_10s'},{type:'anemometer',probability:0.03,effect:'reveal_tornado_path_20s'}]},
  background:{layers:[{id:'storm_sky',parallaxX:0.04,parallaxY:0,color:'#223300',gradient:['#112200','#223300','#334400']},{id:'storm_clouds',parallaxX:0.12,parallaxY:0.05,color:'#1a2200',animated:true,cloudSpeed:3,rotation:true},{id:'rain_heavy',parallaxX:0.5,parallaxY:0.12,color:'#7799aa',particleCount:300,speed:16,angle:80,opacity:0.5},{id:'lightning_bg',parallaxX:0.05,parallaxY:0,color:'#ffffff',animated:true,lightningFreq:0.15},{id:'fields_flat',parallaxX:0.2,parallaxY:0,color:'#1a2a00'}]},
  weather:{type:'severe_thunderstorm',intensity:0.95,windSpeed:35,windDir:225,visibility:0.25,hailSize:0.4},
  hazards:[{type:'tornado',path:'track_player',speed:6,damage:100,size:160,frequency:0.01,permanent:true,liftForce:1200},{type:'hail',path:'random_vertical',speed:20,damage:30,size:12,frequency:0.3},{type:'lightning',path:'random_vertical',speed:100,damage:70,size:20,frequency:0.06,stunDuration:1.5}],
  checkpoints:[{x:550,bonusTime:42},{x:1250,bonusTime:36},{x:2000,bonusTime:32},{x:2800,bonusTime:28},{x:3500,bonusTime:24}],
  bossZone:{x:3600,y:330,width:400,height:120,bossType:'mega_tornado',triggerOnce:true},
  timeTrial:{gold:205,silver:268,bronze:340},
  unlockRequirements:{playerLevel:21,starsNeeded:44,previousMap:'space_station'}
},

// 16. DRAGON_FORTRESS
{
  id:'dragon_fortress', name:'Dragon Fortress', theme:'fantasy', difficulty:9, length:3800,
  description:'Storm a medieval dragon fortress with fire-breathing guardians, collapsing drawbridges, and sorcerer traps.',
  biome:{type:'fantasy',gravity:9.81,airDensity:1.2,friction:0.65,ambientTemp:38},
  terrainProfile:(function(){
    const pts=[];
    const hs=[0,15,35,60,90,124,160,196,230,260,286,308,326,340,350,356,358,357,353,347,339,329,317,303,288,271,253,235,216,198,181,165,150,137,125,115,107,101,97,95,95,97,101,107,115,125,137,151,167,184];
    const surfs=['cobblestone','stone','castle_wall','drawbridge','stone','cobblestone','castle_wall','stone','drawbridge','cobblestone'];
    const obs=[null,'dragon_fire',null,'catapult',null,'drawbridge_trap',null,'dragon_fire','castle_archer',null,'catapult',null,'drawbridge_trap',null,'dragon_fire',null,'castle_archer',null,'catapult','dragon_fire',null,'drawbridge_trap',null,'dragon_fire',null,'castle_archer',null,'catapult',null,'dragon_fire','drawbridge_trap',null,'castle_archer',null,'dragon_fire',null,'catapult',null,'drawbridge_trap','dragon_fire',null,'castle_archer',null,'catapult',null,'dragon_fire',null,'drawbridge_trap',null,'castle_archer',null,'dragon_fire'];
    for(let i=0;i<50;i++){pts.push({x:i*76,height:hs[i]||0,slope:i<49?(hs[i+1]-hs[i])/76*100:2,surface:surfs[i%10],obstacle:obs[i]});}
    return pts;
  })(),
  obstacles:[
    {type:'dragon_fire',     x:152,  y:15,  width:200,height:60,behavior:'periodic_breathe',damage:90,period:4,duration:2,fireDir:'right'},
    {type:'catapult',        x:380,  y:60,  width:60, height:50,behavior:'launch_boulders', damage:75,launchRate:6,boulderSize:35},
    {type:'drawbridge_trap', x:608,  y:160, width:180,height:20,behavior:'timed_collapse',  damage:50,triggerDelay:0.8},
    {type:'castle_archer',   x:836,  y:196, width:20, height:50,behavior:'shoot_arrows',    damage:40,fireRate:2.5,accuracy:0.65},
    {type:'dragon_fire',     x:1140, y:286, width:220,height:70,behavior:'periodic_breathe',damage:95,period:3.5,duration:2.5,fireDir:'right'},
    {type:'catapult',        x:1444, y:340, width:65, height:55,behavior:'launch_boulders', damage:80,launchRate:5.5,boulderSize:40},
    {type:'drawbridge_trap', x:1672, y:356, width:200,height:20,behavior:'timed_collapse',  damage:55,triggerDelay:0.6},
    {type:'castle_archer',   x:1900, y:358, width:20, height:55,behavior:'shoot_arrows',    damage:45,fireRate:2,accuracy:0.7},
    {type:'dragon_fire',     x:2204, y:347, width:240,height:80,behavior:'periodic_breathe',damage:100,period:3,duration:3,fireDir:'left'},
    {type:'catapult',        x:2508, y:317, width:70, height:60,behavior:'launch_boulders', damage:85,launchRate:5,boulderSize:45},
    {type:'drawbridge_trap', x:2736, y:271, width:220,height:20,behavior:'timed_collapse',  damage:60,triggerDelay:0.5},
    {type:'castle_archer',   x:2964, y:216, width:20, height:60,behavior:'shoot_arrows',    damage:50,fireRate:1.8,accuracy:0.75},
    {type:'dragon_fire',     x:3268, y:150, width:260,height:90,behavior:'periodic_breathe',damage:100,period:2.5,duration:3.5,fireDir:'right'},
    {type:'catapult',        x:3572, y:107, width:75, height:65,behavior:'launch_boulders', damage:90,launchRate:4.5,boulderSize:50}
  ],
  collectibles:{coinSpawnRate:0.6,fuelSpawnRate:0.18,powerupSpawnRate:0.08,preferredSurfaces:['cobblestone','stone'],avoidSurfaces:[],clusterSize:{min:3,max:8},specialDrops:[{type:'dragon_scale',probability:0.04,effect:'fire_immunity_15s'},{type:'magic_shield',probability:0.03,effect:'shield_40_hp'}]},
  background:{layers:[{id:'fantasy_sky',parallaxX:0.03,parallaxY:0,color:'#110033',gradient:['#110033','#220044','#330066']},{id:'castle_far',parallaxX:0.1,parallaxY:0,color:'#0d0022'},{id:'fire_glow',parallaxX:0.2,parallaxY:0.03,color:'#ff4400',opacity:0.3,animated:true,pulse:true},{id:'castle_towers',parallaxX:0.35,parallaxY:0,color:'#0a001a'},{id:'smoke_trails',parallaxX:0.7,parallaxY:0.08,color:'#333333',animated:true,smokeRise:1.2}]},
  weather:{type:'fire_storm',intensity:0.7,windSpeed:15,windDir:230,visibility:0.45,ashDensity:0.5},
  hazards:[{type:'dragon_aerial',path:'swoop_patrol',speed:12,damage:95,size:150,frequency:0.02,fireBreath:true},{type:'fireball',path:'parabolic',speed:18,damage:75,size:35,frequency:0.08,explosionRadius:70}],
  checkpoints:[{x:500,bonusTime:40},{x:1150,bonusTime:35},{x:1900,bonusTime:30},{x:2650,bonusTime:28},{x:3350,bonusTime:22}],
  bossZone:{x:3500,y:95,width:300,height:120,bossType:'ancient_dragon',triggerOnce:true},
  timeTrial:{gold:200,silver:260,bronze:330},
  unlockRequirements:{playerLevel:24,starsNeeded:52,previousMap:'dinosaur_valley'}
},

// 17. GIANT_ANT_COLONY
{
  id:'giant_ant_colony', name:'Giant Ant Colony', theme:'micro', difficulty:7, length:3200,
  description:'Navigate at insect scale through tunnels of a giant ant colony, dodging soldier ants and acid sprays.',
  biome:{type:'underground',gravity:9.81,airDensity:1.3,friction:0.72,ambientTemp:26},
  terrainProfile:(function(){
    const pts=[];
    for(let i=0;i<48;i++){
      const x=i*67;
      const base=Math.abs(Math.sin(i*0.22)*60+Math.cos(i*0.15)*30);
      const h=Math.round(base+i*4);
      const surfs=['dirt_tunnel','ant_trail','root','dirt_tunnel','fungus','ant_trail'];
      const obs=[null,'soldier_ant',null,'acid_spray',null,'larva',null,'soldier_ant','fungus_spore',null,'acid_spray',null,'tunnel_collapse',null,'soldier_ant',null];
      pts.push({x,height:h,slope:i<47?(Math.abs(Math.sin((i+1)*0.22)*60+Math.cos((i+1)*0.15)*30)+(i+1)*4-h)/67*100:2,surface:surfs[i%6],obstacle:obs[i%16]});
    }
    return pts;
  })(),
  obstacles:[
    {type:'soldier_ant',     x:134,  y:30,  width:50,height:40,behavior:'patrol_attack',  damage:60,patrolDist:200,speed:4,mandibleDamage:60},
    {type:'acid_spray',      x:335,  y:55,  width:30,height:80,behavior:'periodic_spray', damage:55,period:3.5,duration:1.2,sprayAngle:60},
    {type:'larva_pile',      x:536,  y:88,  width:80,height:40,behavior:'static_slow',    damage:15,slowFactor:0.5},
    {type:'tunnel_collapse', x:737,  y:118, width:100,height:30,behavior:'timed_collapse',damage:50,triggerDelay:1},
    {type:'soldier_ant',     x:938,  y:148, width:55,height:44,behavior:'patrol_attack',  damage:65,patrolDist:220,speed:5,mandibleDamage:65},
    {type:'fungus_spore',    x:1139, y:175, width:20,height:20,behavior:'burst_periodic', damage:35,period:4,burstRadius:60},
    {type:'acid_spray',      x:1340, y:200, width:35,height:90,behavior:'periodic_spray', damage:60,period:3,duration:1.5,sprayAngle:70},
    {type:'soldier_ant',     x:1541, y:222, width:60,height:48,behavior:'patrol_attack',  damage:70,patrolDist:240,speed:6,mandibleDamage:70},
    {type:'tunnel_collapse', x:1742, y:242, width:120,height:30,behavior:'timed_collapse',damage:55,triggerDelay:0.8},
    {type:'acid_spray',      x:1943, y:258, width:40,height:100,behavior:'periodic_spray',damage:65,period:2.5,duration:1.8,sprayAngle:80},
    {type:'larva_pile',      x:2144, y:272, width:90,height:45,behavior:'static_slow',    damage:20,slowFactor:0.4},
    {type:'soldier_ant',     x:2345, y:283, width:65,height:52,behavior:'patrol_attack',  damage:75,patrolDist:260,speed:7,mandibleDamage:75},
    {type:'fungus_spore',    x:2546, y:292, width:22,height:22,behavior:'burst_periodic', damage:40,period:3.5,burstRadius:70},
    {type:'acid_spray',      x:2747, y:298, width:45,height:110,behavior:'periodic_spray',damage:70,period:2,duration:2,sprayAngle:90},
    {type:'tunnel_collapse', x:2948, y:302, width:140,height:30,behavior:'timed_collapse',damage:60,triggerDelay:0.6},
    {type:'soldier_ant',     x:3149, y:300, width:70,height:56,behavior:'patrol_attack',  damage:80,patrolDist:280,speed:8,mandibleDamage:80}
  ],
  collectibles:{coinSpawnRate:0.68,fuelSpawnRate:0.19,powerupSpawnRate:0.08,preferredSurfaces:['ant_trail','dirt_tunnel'],avoidSurfaces:['fungus'],clusterSize:{min:4,max:9},specialDrops:[{type:'pheromone',probability:0.06,effect:'confuse_ants_15s'},{type:'honey_drop',probability:0.05,effect:'heal_20_percent'}]},
  background:{layers:[{id:'tunnel_wall',parallaxX:0.05,parallaxY:0,color:'#2d1a00'},{id:'biolum_fungi',parallaxX:0.12,parallaxY:0,color:'#004400',opacity:0.5,animated:true,glowPulse:true},{id:'tunnel_roots',parallaxX:0.25,parallaxY:0,color:'#1a0d00'},{id:'dirt_particles',parallaxX:0.5,parallaxY:0.05,color:'#8b6914',particleCount:80,fallSpeed:0.5,opacity:0.4},{id:'ant_silhouettes',parallaxX:0.8,parallaxY:0,color:'#0d0700',animated:true}]},
  weather:{type:'underground',intensity:0,windSpeed:1,windDir:0,visibility:0.6,humidity:0.75},
  hazards:[{type:'soldier_ant_swarm',path:'charge_player',speed:7,damage:70,size:100,frequency:0.04},{type:'acid_rain',path:'fall_vertical',speed:8,damage:40,size:10,frequency:0.25}],
  checkpoints:[{x:400,bonusTime:34},{x:900,bonusTime:30},{x:1500,bonusTime:27},{x:2100,bonusTime:24},{x:2700,bonusTime:20}],
  bossZone:{x:2800,y:295,width:400,height:120,bossType:'queen_ant',triggerOnce:true},
  timeTrial:{gold:168,silver:222,bronze:285},
  unlockRequirements:{playerLevel:19,starsNeeded:40,previousMap:'pirate_cove'}
},

// 18. PARALLEL_DIMENSION
{
  id:'parallel_dimension', name:'Parallel Dimension', theme:'surreal', difficulty:10, length:3600,
  description:'Reality fractures around you — portals invert gravity, physics laws bend, and the terrain itself warps.',
  biome:{type:'dimensional',gravity:9.81,airDensity:1.25,friction:0.5,ambientTemp:20,gravityCanInvert:true},
  terrainProfile:(function(){
    const pts=[];
    for(let i=0;i<52;i++){
      const x=i*69;
      const h=Math.round(Math.sin(i*0.3)*80+Math.cos(i*0.2)*50+Math.sin(i*0.5)*30+150);
      const surfs=['void','normal','inverted','phase','void','normal','inverted','phase'];
      const obs=[null,'portal',null,'gravity_inverter',null,'phase_wall',null,'portal','reality_crack',null,'gravity_inverter',null,'phase_wall',null,'portal',null,'reality_crack','gravity_inverter',null];
      pts.push({x,height:Math.max(0,h),slope:i<51?(Math.sin((i+1)*0.3)*80+Math.cos((i+1)*0.2)*50+Math.sin((i+1)*0.5)*30+150-h)/69*100:0,surface:surfs[i%8],obstacle:obs[i%19]});
    }
    return pts;
  })(),
  obstacles:[
    {type:'portal_pair',     x:138, y:100,width:30,height:80,behavior:'teleport_exit_x2200',damage:0,exitX:2200,exitY:180,color:'#ff00ff'},
    {type:'gravity_inverter',x:345, y:180,width:100,height:20,behavior:'invert_gravity_zone',damage:0,invertDuration:5,invertRadius:150},
    {type:'phase_wall',      x:552, y:140,width:15, height:100,behavior:'phase_toggle',      damage:45,togglePeriod:2,phaseTime:1},
    {type:'reality_crack',   x:759, y:160,width:80, height:20,behavior:'random_physics',     damage:20,chaosRadius:120,duration:8},
    {type:'portal_pair',     x:966, y:200,width:35, height:90,behavior:'teleport_exit_x800', damage:0,exitX:800,exitY:150,color:'#00ffff'},
    {type:'gravity_inverter',x:1173,y:220,width:120,height:20,behavior:'invert_gravity_zone',damage:0,invertDuration:6,invertRadius:180},
    {type:'phase_wall',      x:1380,y:180,width:18, height:120,behavior:'phase_toggle',      damage:50,togglePeriod:1.8,phaseTime:0.9},
    {type:'mirror_entity',   x:1587,y:200,width:50, height:70,behavior:'copy_player_mirrored',damage:55,mirrorDelay:0.5},
    {type:'portal_pair',     x:1794,y:240,width:40, height:100,behavior:'teleport_exit_x1400',damage:0,exitX:1400,exitY:210,color:'#ffff00'},
    {type:'gravity_inverter',x:2001,y:260,width:140,height:20,behavior:'invert_gravity_zone',damage:0,invertDuration:8,invertRadius:200},
    {type:'reality_crack',   x:2208,y:230,width:100,height:20,behavior:'random_physics',     damage:25,chaosRadius:150,duration:10},
    {type:'phase_wall',      x:2415,y:200,width:20, height:140,behavior:'phase_toggle',      damage:55,togglePeriod:1.5,phaseTime:0.8},
    {type:'mirror_entity',   x:2622,y:180,width:55, height:80,behavior:'copy_player_mirrored',damage:60,mirrorDelay:0.4},
    {type:'portal_pair',     x:2829,y:200,width:45, height:110,behavior:'teleport_exit_x2000',damage:0,exitX:2000,exitY:250,color:'#ff8800'},
    {type:'gravity_inverter',x:3036,y:220,width:160,height:20,behavior:'invert_gravity_zone',damage:0,invertDuration:10,invertRadius:220},
    {type:'reality_crack',   x:3243,y:200,width:120,height:20,behavior:'random_physics',     damage:30,chaosRadius:180,duration:12},
    {type:'phase_wall',      x:3450,y:180,width:22, height:160,behavior:'phase_toggle',      damage:60,togglePeriod:1.2,phaseTime:0.6}
  ],
  collectibles:{coinSpawnRate:0.55,fuelSpawnRate:0.2,powerupSpawnRate:0.12,preferredSurfaces:['normal'],avoidSurfaces:['void'],clusterSize:{min:3,max:10},specialDrops:[{type:'reality_anchor',probability:0.08,effect:'stabilize_physics_20s'},{type:'dimension_gem',probability:0.02,effect:'score_multiplier_3x_15s'}]},
  background:{layers:[{id:'void_bg',parallaxX:0.02,parallaxY:0,color:'#080008'},{id:'reality_fractures',parallaxX:0.1,parallaxY:0.05,color:'#ff00ff',opacity:0.4,animated:true,fractureAnim:true},{id:'dimension_bleed',parallaxX:0.2,parallaxY:0.03,color:'#00ffff',opacity:0.3,animated:true},{id:'floating_geometry',parallaxX:0.4,parallaxY:0.08,color:'#ffffff',opacity:0.5,animated:true,floatRotate:true},{id:'portal_glow',parallaxX:0.7,parallaxY:0.1,color:'#ff88ff',particleCount:50,swirl:true,swirlSpeed:3}]},
  weather:{type:'reality_storm',intensity:1.0,windSpeed:0,windDir:0,visibility:0.5,physicsDistortion:0.8},
  hazards:[{type:'dimensional_rift',path:'random_teleport',speed:0,damage:60,size:80,frequency:0.05,teleportPlayer:true},{type:'anti_matter_pulse',path:'radial_expand',speed:3,damage:80,size:200,frequency:0.03,duration:0.5,warningTime:2.5}],
  checkpoints:[{x:500,bonusTime:45},{x:1150,bonusTime:40},{x:1900,bonusTime:35},{x:2650,bonusTime:30},{x:3300,bonusTime:25}],
  bossZone:{x:3350,y:200,width:250,height:150,bossType:'void_overlord',triggerOnce:true},
  timeTrial:{gold:220,silver:285,bronze:360},
  unlockRequirements:{playerLevel:28,starsNeeded:65,previousMap:'dragon_fortress'}
}

]; // end MAP_COLLECTION_EXTENDED_3

if (typeof window !== 'undefined') { window.MAP_COLLECTION_EXTENDED_3 = MAP_COLLECTION_EXTENDED_3; }
if (typeof module !== 'undefined') { module.exports = { MAP_COLLECTION_EXTENDED_3 }; }

})();


// ============================================================
// WEATHER_SYSTEM — dynamic weather with physics effects
// ============================================================
(function() {
'use strict';

// ── WeatherType constants ────────────────────────────────────
const WeatherType = Object.freeze({
  CLEAR:          'clear',
  CLOUDY:         'cloudy',
  OVERCAST:       'overcast',
  LIGHT_RAIN:     'light_rain',
  HEAVY_RAIN:     'heavy_rain',
  THUNDERSTORM:   'thunderstorm',
  SNOW:           'snow',
  BLIZZARD:       'blizzard',
  FOG:            'fog',
  SANDSTORM:      'sandstorm',
  HEATWAVE:       'heatwave',
  HAIL:           'hail',
  TORNADO:        'tornado',
  ASHFALL:        'ashfall',
  ACID_RAIN:      'acid_rain'
});

// ── WeatherState factory ─────────────────────────────────────
function createWeatherState(type, overrides) {
  const defaults = {
    type:           type,
    intensity:      0,
    windSpeed:      0,      // m/s
    windDir:        270,    // degrees (270 = west, blowing east)
    temperature:    20,     // Celsius
    humidity:       0.5,    // 0–1
    visibility:     1.0,    // 0–1
    cloudCoverage:  0,      // 0–1
    lightningProb:  0,      // probability per second
    precipRate:     0,      // mm/h
    particleCount:  0,
    particleColor:  '#ffffff',
    particleSize:   2,
    particleAngle:  80,
    particleSpeed:  8,
    gripMultiplier: 1.0,    // affects traction
    dragMultiplier: 1.0,    // affects air drag
    visibilityMult: 1.0,
    damagePerSec:   0
  };
  return Object.assign({}, defaults, overrides);
}

// ── Weather definitions (all 15 types) ──────────────────────
const WEATHER_DEFINITIONS = {
  [WeatherType.CLEAR]: createWeatherState(WeatherType.CLEAR, {
    intensity:0, windSpeed:2, temperature:22, humidity:0.3,
    visibility:1.0, cloudCoverage:0.05, particleCount:0, gripMultiplier:1.0, dragMultiplier:1.0
  }),
  [WeatherType.CLOUDY]: createWeatherState(WeatherType.CLOUDY, {
    intensity:0.3, windSpeed:6, temperature:18, humidity:0.55,
    visibility:0.9, cloudCoverage:0.6, particleCount:0, gripMultiplier:0.98, dragMultiplier:1.01
  }),
  [WeatherType.OVERCAST]: createWeatherState(WeatherType.OVERCAST, {
    intensity:0.55, windSpeed:9, temperature:14, humidity:0.7,
    visibility:0.75, cloudCoverage:0.9, particleCount:0, gripMultiplier:0.96, dragMultiplier:1.02
  }),
  [WeatherType.LIGHT_RAIN]: createWeatherState(WeatherType.LIGHT_RAIN, {
    intensity:0.35, windSpeed:10, temperature:13, humidity:0.8, precipRate:3,
    visibility:0.7, cloudCoverage:0.8, particleCount:80, particleColor:'#88aacc',
    particleSize:2, particleAngle:78, particleSpeed:10,
    gripMultiplier:0.88, dragMultiplier:1.03, damagePerSec:0
  }),
  [WeatherType.HEAVY_RAIN]: createWeatherState(WeatherType.HEAVY_RAIN, {
    intensity:0.75, windSpeed:18, temperature:11, humidity:0.95, precipRate:20,
    visibility:0.45, cloudCoverage:1.0, particleCount:220, particleColor:'#6699bb',
    particleSize:3, particleAngle:75, particleSpeed:16,
    gripMultiplier:0.72, dragMultiplier:1.08, damagePerSec:0
  }),
  [WeatherType.THUNDERSTORM]: createWeatherState(WeatherType.THUNDERSTORM, {
    intensity:0.9, windSpeed:28, temperature:10, humidity:1.0, precipRate:40,
    visibility:0.3, cloudCoverage:1.0, lightningProb:0.08,
    particleCount:350, particleColor:'#5588aa', particleSize:3, particleAngle:70, particleSpeed:22,
    gripMultiplier:0.6, dragMultiplier:1.15, damagePerSec:2
  }),
  [WeatherType.SNOW]: createWeatherState(WeatherType.SNOW, {
    intensity:0.5, windSpeed:8, temperature:-4, humidity:0.85, precipRate:5,
    visibility:0.6, cloudCoverage:0.9, particleCount:120, particleColor:'#eeeeff',
    particleSize:4, particleAngle:85, particleSpeed:4,
    gripMultiplier:0.55, dragMultiplier:1.05, damagePerSec:0
  }),
  [WeatherType.BLIZZARD]: createWeatherState(WeatherType.BLIZZARD, {
    intensity:0.95, windSpeed:35, temperature:-18, humidity:0.9, precipRate:15,
    visibility:0.15, cloudCoverage:1.0, particleCount:400, particleColor:'#ddeeff',
    particleSize:3, particleAngle:55, particleSpeed:18,
    gripMultiplier:0.3, dragMultiplier:1.2, damagePerSec:3
  }),
  [WeatherType.FOG]: createWeatherState(WeatherType.FOG, {
    intensity:0.6, windSpeed:3, temperature:8, humidity:0.95,
    visibility:0.2, cloudCoverage:0.7, particleCount:0,
    gripMultiplier:0.92, dragMultiplier:1.01, damagePerSec:0
  }),
  [WeatherType.SANDSTORM]: createWeatherState(WeatherType.SANDSTORM, {
    intensity:0.85, windSpeed:32, temperature:42, humidity:0.05,
    visibility:0.15, cloudCoverage:0.5, particleCount:350, particleColor:'#cc9944',
    particleSize:2, particleAngle:12, particleSpeed:20,
    gripMultiplier:0.75, dragMultiplier:1.3, damagePerSec:4
  }),
  [WeatherType.HEATWAVE]: createWeatherState(WeatherType.HEATWAVE, {
    intensity:0.7, windSpeed:4, temperature:52, humidity:0.1,
    visibility:0.7, cloudCoverage:0.1, particleCount:0,
    gripMultiplier:0.85, dragMultiplier:0.95, damagePerSec:5
  }),
  [WeatherType.HAIL]: createWeatherState(WeatherType.HAIL, {
    intensity:0.8, windSpeed:22, temperature:3, humidity:0.9, precipRate:25,
    visibility:0.4, cloudCoverage:1.0, particleCount:180, particleColor:'#ccddee',
    particleSize:6, particleAngle:82, particleSpeed:25,
    gripMultiplier:0.65, dragMultiplier:1.12, damagePerSec:8
  }),
  [WeatherType.ASHFALL]: createWeatherState(WeatherType.ASHFALL, {
    intensity:0.7, windSpeed:12, temperature:38, humidity:0.2,
    visibility:0.35, cloudCoverage:0.85, particleCount:200, particleColor:'#888880',
    particleSize:3, particleAngle:88, particleSpeed:3,
    gripMultiplier:0.8, dragMultiplier:1.1, damagePerSec:2
  }),
  [WeatherType.ACID_RAIN]: createWeatherState(WeatherType.ACID_RAIN, {
    intensity:0.55, windSpeed:14, temperature:16, humidity:0.9, precipRate:8,
    visibility:0.55, cloudCoverage:0.95, particleCount:130, particleColor:'#88ff88',
    particleSize:2, particleAngle:77, particleSpeed:12,
    gripMultiplier:0.79, dragMultiplier:1.06, damagePerSec:6
  }),
  [WeatherType.TORNADO]: createWeatherState(WeatherType.TORNADO, {
    intensity:1.0, windSpeed:50, temperature:18, humidity:0.75,
    visibility:0.2, cloudCoverage:1.0, particleCount:300, particleColor:'#667788',
    particleSize:4, particleAngle:30, particleSpeed:28,
    gripMultiplier:0.4, dragMultiplier:1.5, damagePerSec:15
  })
};

// ── Seasonal probability tables ──────────────────────────────
const SEASONAL_WEATHER_PROBABILITY = {
  spring: {
    [WeatherType.CLEAR]:0.18, [WeatherType.CLOUDY]:0.2, [WeatherType.OVERCAST]:0.12,
    [WeatherType.LIGHT_RAIN]:0.22, [WeatherType.HEAVY_RAIN]:0.12, [WeatherType.THUNDERSTORM]:0.08,
    [WeatherType.SNOW]:0.03, [WeatherType.FOG]:0.05, [WeatherType.HAIL]:0.0
  },
  summer: {
    [WeatherType.CLEAR]:0.35, [WeatherType.CLOUDY]:0.2, [WeatherType.OVERCAST]:0.08,
    [WeatherType.LIGHT_RAIN]:0.1, [WeatherType.HEAVY_RAIN]:0.08, [WeatherType.THUNDERSTORM]:0.1,
    [WeatherType.HEATWAVE]:0.07, [WeatherType.FOG]:0.02, [WeatherType.HAIL]:0.0
  },
  autumn: {
    [WeatherType.CLEAR]:0.12, [WeatherType.CLOUDY]:0.22, [WeatherType.OVERCAST]:0.18,
    [WeatherType.LIGHT_RAIN]:0.2, [WeatherType.HEAVY_RAIN]:0.12, [WeatherType.THUNDERSTORM]:0.05,
    [WeatherType.FOG]:0.08, [WeatherType.SNOW]:0.02, [WeatherType.HAIL]:0.01
  },
  winter: {
    [WeatherType.CLEAR]:0.1, [WeatherType.CLOUDY]:0.18, [WeatherType.OVERCAST]:0.2,
    [WeatherType.SNOW]:0.25, [WeatherType.BLIZZARD]:0.12, [WeatherType.FOG]:0.1,
    [WeatherType.LIGHT_RAIN]:0.03, [WeatherType.HEAVY_RAIN]:0.02, [WeatherType.HAIL]:0.0
  }
};

// ── Weather transition logic ─────────────────────────────────
const WEATHER_TRANSITIONS = {
  [WeatherType.CLEAR]:        [WeatherType.CLOUDY, WeatherType.HEATWAVE],
  [WeatherType.CLOUDY]:       [WeatherType.CLEAR, WeatherType.OVERCAST, WeatherType.LIGHT_RAIN],
  [WeatherType.OVERCAST]:     [WeatherType.CLOUDY, WeatherType.LIGHT_RAIN, WeatherType.HEAVY_RAIN, WeatherType.FOG],
  [WeatherType.LIGHT_RAIN]:   [WeatherType.OVERCAST, WeatherType.HEAVY_RAIN, WeatherType.CLOUDY],
  [WeatherType.HEAVY_RAIN]:   [WeatherType.LIGHT_RAIN, WeatherType.THUNDERSTORM, WeatherType.OVERCAST],
  [WeatherType.THUNDERSTORM]: [WeatherType.HEAVY_RAIN, WeatherType.HAIL, WeatherType.CLEAR],
  [WeatherType.SNOW]:         [WeatherType.OVERCAST, WeatherType.BLIZZARD, WeatherType.CLEAR],
  [WeatherType.BLIZZARD]:     [WeatherType.SNOW, WeatherType.OVERCAST],
  [WeatherType.FOG]:          [WeatherType.CLEAR, WeatherType.OVERCAST, WeatherType.LIGHT_RAIN],
  [WeatherType.SANDSTORM]:    [WeatherType.CLEAR, WeatherType.HEATWAVE],
  [WeatherType.HEATWAVE]:     [WeatherType.CLEAR, WeatherType.THUNDERSTORM],
  [WeatherType.HAIL]:         [WeatherType.THUNDERSTORM, WeatherType.HEAVY_RAIN, WeatherType.OVERCAST],
  [WeatherType.ASHFALL]:      [WeatherType.OVERCAST, WeatherType.CLEAR],
  [WeatherType.ACID_RAIN]:    [WeatherType.HEAVY_RAIN, WeatherType.OVERCAST],
  [WeatherType.TORNADO]:      [WeatherType.THUNDERSTORM, WeatherType.HEAVY_RAIN]
};

// ── WeatherSystem class ──────────────────────────────────────
class WeatherSystem {
  constructor(initialType, season) {
    this.season          = season || 'summer';
    this.currentType     = initialType || WeatherType.CLEAR;
    this.currentState    = Object.assign({}, WEATHER_DEFINITIONS[this.currentType]);
    this.targetState     = null;
    this.transitionTime  = 0;
    this.transitionDur   = 30;    // seconds for weather to fully change
    this.timeInCurrent   = 0;
    this.minWeatherDur   = 60;    // seconds minimum before change
    this.maxWeatherDur   = 300;   // seconds maximum before forced change
    this.nextChangeDue   = this.minWeatherDur + Math.random() * (this.maxWeatherDur - this.minWeatherDur);
    this.lightningTimer  = 0;
    this.lightningEvents = [];    // {x, y, duration, alpha}
    this.gustTimer       = 0;
    this.currentGust     = 0;
    this.gustTarget      = 0;
    this.forecast        = this._buildForecast(3);
    this.microclimates   = [];
    this.audioTriggers   = [];
  }

  update(dt) {
    this.timeInCurrent += dt;

    // Transition interpolation
    if (this.targetState && this.transitionTime < this.transitionDur) {
      this.transitionTime += dt;
      const t = Math.min(1, this.transitionTime / this.transitionDur);
      const ease = t * t * (3 - 2 * t); // smoothstep
      this._interpolateState(this.currentState, WEATHER_DEFINITIONS[this.currentType], this.targetState, ease);
      if (t >= 1) {
        this.currentType  = this.targetState.type;
        this.currentState = Object.assign({}, this.targetState);
        this.targetState  = null;
        this.transitionTime = 0;
      }
    }

    // Schedule next weather change
    if (this.timeInCurrent >= this.nextChangeDue && !this.targetState) {
      this._triggerWeatherChange();
    }

    // Lightning
    if (this.currentState.lightningProb > 0) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        if (Math.random() < this.currentState.lightningProb) {
          this._spawnLightning();
        }
        this.lightningTimer = 1 / Math.max(0.01, this.currentState.lightningProb);
      }
    }

    // Update lightning events (fade out)
    for (let i = this.lightningEvents.length - 1; i >= 0; i--) {
      this.lightningEvents[i].alpha -= dt * 5;
      if (this.lightningEvents[i].alpha <= 0) this.lightningEvents.splice(i, 1);
    }

    // Wind gust system
    this._updateGusts(dt);
  }

  _triggerWeatherChange() {
    const possibleNext = WEATHER_TRANSITIONS[this.currentType] || [WeatherType.CLEAR];
    const next = possibleNext[Math.floor(Math.random() * possibleNext.length)];
    this.targetState = Object.assign({}, WEATHER_DEFINITIONS[next]);
    this.transitionDur = this.transitionTime = 0;
    this.transitionDur = 20 + Math.random() * 40;
    this.nextChangeDue = this.minWeatherDur + Math.random() * (this.maxWeatherDur - this.minWeatherDur);
    this.timeInCurrent = 0;
    this.forecast.shift();
    this.forecast.push(this._pickForecastType());
    this.audioTriggers.push({ event: 'weather_change', from: this.currentType, to: next, time: Date.now() });
  }

  _interpolateState(out, from, to, t) {
    const numerics = ['intensity','windSpeed','windDir','temperature','humidity','visibility',
      'cloudCoverage','lightningProb','precipRate','particleCount','particleSize','particleAngle',
      'particleSpeed','gripMultiplier','dragMultiplier','visibilityMult','damagePerSec'];
    for (const key of numerics) {
      if (from[key] !== undefined && to[key] !== undefined) {
        out[key] = from[key] + (to[key] - from[key]) * t;
      }
    }
    out.type = t >= 0.5 ? to.type : from.type;
  }

  _spawnLightning() {
    const x = Math.random() * 10000; // world x
    const event = { x, y: 0, duration: 0.15, alpha: 1.0, groundFlash: true };
    this.lightningEvents.push(event);
    this.audioTriggers.push({ event: 'thunder', x, delay: Math.random() * 3 });
  }

  _updateGusts(dt) {
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.gustTarget  = (Math.random() - 0.5) * this.currentState.windSpeed * 0.6;
      this.gustTimer   = 2 + Math.random() * 8;
    }
    const gustRate = 5 * dt;
    this.currentGust += (this.gustTarget - this.currentGust) * Math.min(1, gustRate);
  }

  getEffectiveWindSpeed() {
    return this.currentState.windSpeed + this.currentGust;
  }

  getEffectiveWindForce(vehicleDragArea) {
    // F = 0.5 * rho * v^2 * Cd * A (simplified)
    const rho = 1.225;
    const Cd  = 0.35;
    const v   = this.getEffectiveWindSpeed();
    const dir = Math.cos((this.currentState.windDir - 90) * Math.PI / 180);
    return 0.5 * rho * v * v * Cd * vehicleDragArea * dir * this.currentState.dragMultiplier;
  }

  addMicroclimate(zone) {
    // zone: { x, y, width, height, weatherType, blendRadius }
    this.microclimates.push(zone);
  }

  getMicroclimateFactor(px, py) {
    for (const zone of this.microclimates) {
      const dx = Math.max(0, Math.abs(px - (zone.x + zone.width*0.5)) - zone.width*0.5);
      const dy = Math.max(0, Math.abs(py - (zone.y + zone.height*0.5)) - zone.height*0.5);
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < zone.blendRadius) {
        const t = 1 - dist / zone.blendRadius;
        return { type: zone.weatherType, blendFactor: t };
      }
    }
    return null;
  }

  getForecast() {
    return this.forecast.slice();
  }

  _buildForecast(count) {
    const result = [];
    let cur = this.currentType;
    for (let i = 0; i < count; i++) {
      cur = this._pickNextFrom(cur);
      result.push(cur);
    }
    return result;
  }

  _pickForecastType() {
    return this._pickNextFrom(this.forecast[this.forecast.length - 1] || this.currentType);
  }

  _pickNextFrom(type) {
    const list = WEATHER_TRANSITIONS[type] || [WeatherType.CLEAR];
    return list[Math.floor(Math.random() * list.length)];
  }

  getPhysicsModifiers() {
    return {
      grip:       this.currentState.gripMultiplier,
      drag:       this.currentState.dragMultiplier,
      visibility: this.currentState.visibilityMult,
      windForce:  this.getEffectiveWindSpeed(),
      windDir:    this.currentState.windDir,
      damage:     this.currentState.damagePerSec
    };
  }

  getVisualData() {
    return {
      particleCount: Math.round(this.currentState.particleCount),
      particleColor: this.currentState.particleColor,
      particleSize:  this.currentState.particleSize,
      particleAngle: this.currentState.particleAngle,
      particleSpeed: this.currentState.particleSpeed,
      cloudCoverage: this.currentState.cloudCoverage,
      fogDensity:    this.currentState.type === WeatherType.FOG ? this.currentState.intensity : 0,
      lightningEvents: this.lightningEvents.slice()
    };
  }

  serialize() {
    return {
      currentType: this.currentType,
      timeInCurrent: this.timeInCurrent,
      nextChangeDue: this.nextChangeDue,
      season: this.season,
      forecast: this.forecast.slice()
    };
  }

  static deserialize(data) {
    const ws = new WeatherSystem(data.currentType, data.season);
    ws.timeInCurrent = data.timeInCurrent || 0;
    ws.nextChangeDue = data.nextChangeDue || 120;
    ws.forecast      = data.forecast || ws._buildForecast(3);
    return ws;
  }
}

// ── Weather particle generator ───────────────────────────────
class WeatherParticleSystem {
  constructor(maxParticles) {
    this.maxParticles = maxParticles || 500;
    this.particles    = [];
    this.pool         = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({ x:0, y:0, vx:0, vy:0, alpha:1, size:2, active:false, color:'#ffffff' });
    }
  }

  spawn(wx, wy, screenW, screenH, weatherState) {
    const count = Math.min(weatherState.particleCount, this.maxParticles);
    const angleRad = weatherState.particleAngle * Math.PI / 180;
    for (let i = this.particles.length; i < count; i++) {
      const p = this.pool[i] || { x:0, y:0, vx:0, vy:0, alpha:1, size:2, active:false };
      p.x     = wx + Math.random() * screenW * 2 - screenW * 0.5;
      p.y     = wy - Math.random() * screenH;
      p.vx    = -Math.sin(angleRad) * weatherState.particleSpeed * (0.8 + Math.random() * 0.4);
      p.vy    =  Math.cos(angleRad) * weatherState.particleSpeed * (0.8 + Math.random() * 0.4);
      p.alpha = 0.5 + Math.random() * 0.5;
      p.size  = weatherState.particleSize * (0.7 + Math.random() * 0.6);
      p.color = weatherState.particleColor;
      p.active = true;
      this.particles.push(p);
    }
  }

  update(dt, wx, wy, screenW, screenH, weatherState) {
    const newCount = Math.round(weatherState.particleCount);
    const angleRad = weatherState.particleAngle * Math.PI / 180;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > wy + screenH || p.x < wx - screenW * 0.5 || p.x > wx + screenW * 1.5) {
        // Reset to top
        p.x  = wx + Math.random() * screenW;
        p.y  = wy - 10;
        p.vx = -Math.sin(angleRad) * weatherState.particleSpeed * (0.8 + Math.random() * 0.4);
        p.vy =  Math.cos(angleRad) * weatherState.particleSpeed * (0.8 + Math.random() * 0.4);
      }
    }

    // Add/remove particles to match count
    while (this.particles.length < newCount && this.particles.length < this.maxParticles) {
      const p = this.pool[this.particles.length] || {};
      p.x = wx + Math.random() * screenW;
      p.y = wy + Math.random() * screenH;
      p.vx = -Math.sin(angleRad) * weatherState.particleSpeed;
      p.vy =  Math.cos(angleRad) * weatherState.particleSpeed;
      p.alpha = 0.5 + Math.random() * 0.5;
      p.size  = weatherState.particleSize;
      p.color = weatherState.particleColor;
      p.active = true;
      this.particles.push(p);
    }
    while (this.particles.length > newCount) {
      this.particles.pop();
    }
  }

  draw(ctx, wx, wy) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x - wx, p.y - wy, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Fog renderer ─────────────────────────────────────────────
class FogRenderer {
  constructor() {
    this.layers = [];
    for (let i = 0; i < 4; i++) {
      this.layers.push({ offset: Math.random() * 1000, speed: 0.2 + i * 0.1, alpha: 0 });
    }
  }

  draw(ctx, W, H, density, t, camX) {
    if (density <= 0) return;
    ctx.save();
    for (let i = 0; i < this.layers.length; i++) {
      const layer  = this.layers[i];
      const scroll = (camX * (0.3 + i * 0.1) + layer.offset + t * layer.speed * 50) % (W * 2);
      const grad   = ctx.createLinearGradient(0, H * 0.5, 0, H);
      grad.addColorStop(0, `rgba(220,220,230,${density * (0.15 + i * 0.05)})`);
      grad.addColorStop(1, `rgba(200,210,220,${density * (0.25 + i * 0.07)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(-scroll, H * 0.3, W * 3, H * 0.7);
    }
    ctx.restore();
  }
}

// ── Audio trigger table ──────────────────────────────────────
const WEATHER_AUDIO_MAP = {
  [WeatherType.CLEAR]:        { ambient:'birds_chirping',   intensity_mult:0.3 },
  [WeatherType.CLOUDY]:       { ambient:'light_wind',        intensity_mult:0.4 },
  [WeatherType.OVERCAST]:     { ambient:'wind_medium',       intensity_mult:0.5 },
  [WeatherType.LIGHT_RAIN]:   { ambient:'rain_light',        intensity_mult:0.55, loop:true },
  [WeatherType.HEAVY_RAIN]:   { ambient:'rain_heavy',        intensity_mult:0.8,  loop:true },
  [WeatherType.THUNDERSTORM]: { ambient:'thunderstorm',      intensity_mult:1.0,  loop:true, lightning:'thunder_crack' },
  [WeatherType.SNOW]:         { ambient:'snow_wind',         intensity_mult:0.45, loop:true },
  [WeatherType.BLIZZARD]:     { ambient:'blizzard_howl',     intensity_mult:0.95, loop:true },
  [WeatherType.FOG]:          { ambient:'fog_ambience',      intensity_mult:0.35, loop:true },
  [WeatherType.SANDSTORM]:    { ambient:'sandstorm_howl',    intensity_mult:0.9,  loop:true },
  [WeatherType.HEATWAVE]:     { ambient:'heat_cicadas',      intensity_mult:0.5,  loop:true },
  [WeatherType.HAIL]:         { ambient:'hail_impacts',      intensity_mult:0.85, loop:true },
  [WeatherType.ASHFALL]:      { ambient:'volcanic_rumble',   intensity_mult:0.7,  loop:true },
  [WeatherType.ACID_RAIN]:    { ambient:'acid_sizzle',       intensity_mult:0.65, loop:true },
  [WeatherType.TORNADO]:      { ambient:'tornado_roar',      intensity_mult:1.0,  loop:true }
};

// Export
if (typeof window !== 'undefined') {
  window.WeatherType            = WeatherType;
  window.WeatherSystem          = WeatherSystem;
  window.WeatherParticleSystem  = WeatherParticleSystem;
  window.FogRenderer            = FogRenderer;
  window.WEATHER_DEFINITIONS    = WEATHER_DEFINITIONS;
  window.WEATHER_TRANSITIONS    = WEATHER_TRANSITIONS;
  window.SEASONAL_WEATHER_PROBABILITY = SEASONAL_WEATHER_PROBABILITY;
  window.WEATHER_AUDIO_MAP      = WEATHER_AUDIO_MAP;
}
if (typeof module !== 'undefined') {
  module.exports = { WeatherType, WeatherSystem, WeatherParticleSystem, FogRenderer,
    WEATHER_DEFINITIONS, WEATHER_TRANSITIONS, SEASONAL_WEATHER_PROBABILITY, WEATHER_AUDIO_MAP };
}

})();


// ============================================================
// DYNAMIC_OBSTACLES — 25 obstacle behaviors with full physics
// ============================================================
(function() {
'use strict';

// ── Obstacle type registry ───────────────────────────────────
const ObstacleType = Object.freeze({
  ROLLING_BOULDER:   'rolling_boulder',
  SWINGING_PENDULUM: 'swinging_pendulum',
  BOUNCING_SPRING:   'bouncing_spring',
  ROTATING_BLADE:    'rotating_blade',
  MOVING_PLATFORM:   'moving_platform',
  COLLAPSING_BRIDGE: 'collapsing_bridge',
  RISING_SPIKE:      'rising_spike',
  WATER_GEYSER:      'water_geyser',
  AIR_VENT:          'air_vent',
  MAGNETIC_ZONE:     'magnetic_zone',
  PORTAL_PAIR:       'portal_pair',
  GRAVITY_WELL:      'gravity_well',
  CRUMBLING_TERRAIN: 'crumbling_terrain',
  TURBO_PAD:         'turbo_pad',
  LAVA_POOL:         'lava_pool',
  QUICKSAND:         'quicksand',
  CONVEYOR_BELT:     'conveyor_belt',
  ELECTRIC_FENCE:    'electric_fence',
  PISTON:            'piston',
  GEAR:              'gear',
  SAW_BLADE:         'saw_blade',
  CANNON:            'cannon',
  MINE:              'mine',
  STICKY_SURFACE:    'sticky_surface',
  BOOST_RAMP:        'boost_ramp'
});

// ── Spatial grid for fast collision queries ──────────────────
class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize || 200;
    this.cells    = new Map();
  }

  _key(cx, cy) { return `${cx},${cy}`; }

  _cellsFor(x, y, w, h) {
    const c0 = Math.floor(x / this.cellSize);
    const c1 = Math.floor((x + w) / this.cellSize);
    const r0 = Math.floor(y / this.cellSize);
    const r1 = Math.floor((y + h) / this.cellSize);
    const out = [];
    for (let c = c0; c <= c1; c++)
      for (let r = r0; r <= r1; r++)
        out.push(this._key(c, r));
    return out;
  }

  insert(obstacle) {
    const keys = this._cellsFor(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    for (const k of keys) {
      if (!this.cells.has(k)) this.cells.set(k, []);
      this.cells.get(k).push(obstacle);
    }
    obstacle._gridKeys = keys;
  }

  remove(obstacle) {
    if (!obstacle._gridKeys) return;
    for (const k of obstacle._gridKeys) {
      const cell = this.cells.get(k);
      if (cell) {
        const idx = cell.indexOf(obstacle);
        if (idx >= 0) cell.splice(idx, 1);
      }
    }
    delete obstacle._gridKeys;
  }

  update(obstacle) {
    this.remove(obstacle);
    this.insert(obstacle);
  }

  query(x, y, w, h) {
    const keys = this._cellsFor(x, y, w, h);
    const seen = new Set();
    const result = [];
    for (const k of keys) {
      const cell = this.cells.get(k);
      if (!cell) continue;
      for (const ob of cell) {
        if (!seen.has(ob)) { seen.add(ob); result.push(ob); }
      }
    }
    return result;
  }

  clear() { this.cells.clear(); }
}

// ── Base DynamicObstacle class ───────────────────────────────
class DynamicObstacle {
  constructor(cfg) {
    this.id          = cfg.id || (Math.random() * 1e9 | 0).toString(36);
    this.type        = cfg.type;
    this.x           = cfg.x || 0;
    this.y           = cfg.y || 0;
    this.width       = cfg.width  || 40;
    this.height      = cfg.height || 40;
    this.damage      = cfg.damage || 0;
    this.active      = true;
    this.triggered   = false;
    this.timer       = 0;
    this.phase       = 0;
    this.destroyed   = false;
    // Interaction
    this.onContact   = cfg.onContact || null;
    this.onDestroy   = cfg.onDestroy || null;
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }

  overlaps(rx, ry, rw, rh) {
    return this.x < rx + rw && this.x + this.width > rx &&
           this.y < ry + rh && this.y + this.height > ry;
  }

  update(dt) {} // override in subclasses

  applyToVehicle(vehicle) {
    if (this.damage > 0) vehicle.health -= this.damage * 0.016; // per frame at 60fps
  }
}

// ── 1. RollingBoulder ────────────────────────────────────────
class RollingBoulder extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type     = ObstacleType.ROLLING_BOULDER;
    this.radius   = (cfg.width || 40) * 0.5;
    this.mass     = cfg.mass   || 500;
    this.vx       = cfg.initialVx || -(Math.random() * 2 + 1);
    this.vy       = 0;
    this.omega    = 0; // angular velocity rad/s
    this.angle    = 0;
    this.restitution = cfg.restitution || 0.5;
    this.friction    = cfg.friction    || 0.4;
    this.stopped  = false;
  }

  update(dt, gravity, terrainHeightAt) {
    if (this.stopped) return;
    // Gravity
    this.vy += gravity * dt;
    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Ground check
    const gh = terrainHeightAt ? terrainHeightAt(this.x) : 0;
    const bottom = this.y + this.radius;
    if (bottom > gh) {
      this.y  = gh - this.radius;
      this.vy = -this.vy * this.restitution;
      // Rolling friction
      this.vx *= (1 - this.friction * dt);
      this.omega = this.vx / this.radius;
    }
    this.angle += this.omega * dt;
    // Stop if slow
    if (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05) {
      this.stopped = true;
    }
  }

  applyToVehicle(vehicle) {
    const impactSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const impulse = this.mass * impactSpeed / 60;
    vehicle.health -= Math.min(this.damage, impulse * 0.1);
    // Push vehicle
    vehicle.vx = (vehicle.vx + (this.vx - vehicle.vx) * 0.3);
  }
}

// ── 2. SwingingPendulum ──────────────────────────────────────
class SwingingPendulum extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type        = ObstacleType.SWINGING_PENDULUM;
    this.pivotX      = cfg.pivotX || this.x;
    this.pivotY      = cfg.pivotY || this.y - 100;
    this.armLength   = cfg.armLength || 100;
    this.angle       = cfg.startAngle || Math.PI * 0.4; // rad from vertical
    this.angularVel  = 0;
    this.angularAcc  = 0;
    this.damping     = 0.998;
    this.gravity     = 9.81;
    this.period      = 2 * Math.PI * Math.sqrt(this.armLength / this.gravity);
  }

  update(dt) {
    // Pendulum ODE: a = -(g/L) * sin(theta)
    this.angularAcc = -(this.gravity / this.armLength) * Math.sin(this.angle);
    this.angularVel = (this.angularVel + this.angularAcc * dt) * this.damping;
    this.angle      += this.angularVel * dt;
    // Update position of bob
    this.x = this.pivotX + Math.sin(this.angle) * this.armLength - this.width * 0.5;
    this.y = this.pivotY + Math.cos(this.angle) * this.armLength - this.height * 0.5;
  }

  getBobCenter() {
    return {
      x: this.pivotX + Math.sin(this.angle) * this.armLength,
      y: this.pivotY + Math.cos(this.angle) * this.armLength
    };
  }
}

// ── 3. BouncingSpring ────────────────────────────────────────
class BouncingSpring extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type         = ObstacleType.BOUNCING_SPRING;
    this.restY        = this.y;
    this.compressed   = false;
    this.compression  = 0;       // 0–1
    this.releaseForce = cfg.releaseForce || 1200; // N
    this.springK      = cfg.springK || 4000;      // N/m
    this.maxCompress  = cfg.maxCompress || 0.6;   // of height
    this.rechargeTime = cfg.rechargeTime || 1.5;  // s
    this.recharging   = false;
    this.rechargeTimer = 0;
  }

  update(dt) {
    if (this.recharging) {
      this.rechargeTimer += dt;
      // Gradually restore spring shape
      this.compression = Math.max(0, this.compression - dt / this.rechargeTime);
      if (this.rechargeTimer >= this.rechargeTime) {
        this.recharging = false;
        this.compression = 0;
        this.compressed  = false;
        this.rechargeTimer = 0;
      }
    }
  }

  trigger(vehicleMass) {
    if (this.compressed || this.recharging) return 0;
    this.compressed  = true;
    this.recharging  = true;
    this.compression = this.maxCompress;
    // Launch force: F = k * x
    return this.springK * (this.height * this.maxCompress);
  }

  getCurrentHeight() {
    return this.height * (1 - this.compression * 0.8);
  }
}

// ── 4. RotatingBlade ─────────────────────────────────────────
class RotatingBlade extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type        = ObstacleType.ROTATING_BLADE;
    this.pivotX      = cfg.pivotX || this.x + this.width * 0.5;
    this.pivotY      = cfg.pivotY || this.y + this.height * 0.5;
    this.bladeLength = cfg.bladeLength || 60;
    this.bladeWidth  = cfg.bladeWidth  || 8;
    this.numBlades   = cfg.numBlades   || 2;
    this.angle       = cfg.startAngle  || 0;
    this.angularVel  = cfg.angularVel  || Math.PI; // rad/s
  }

  update(dt) {
    this.angle += this.angularVel * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;
  }

  getBlades() {
    const blades = [];
    const step   = (Math.PI * 2) / this.numBlades;
    for (let i = 0; i < this.numBlades; i++) {
      const a = this.angle + step * i;
      blades.push({
        x1: this.pivotX - Math.cos(a) * this.bladeLength,
        y1: this.pivotY - Math.sin(a) * this.bladeLength,
        x2: this.pivotX + Math.cos(a) * this.bladeLength,
        y2: this.pivotY + Math.sin(a) * this.bladeLength
      });
    }
    return blades;
  }

  testPoint(px, py) {
    const dx = px - this.pivotX;
    const dy = py - this.pivotY;
    const dist  = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.bladeLength + 5) return false;
    const step = (Math.PI * 2) / this.numBlades;
    for (let i = 0; i < this.numBlades; i++) {
      const a   = this.angle + step * i;
      const dot = dx * Math.cos(a) + dy * Math.sin(a);
      const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
      if (dot >= -this.bladeLength && dot <= this.bladeLength && perp < this.bladeWidth) return true;
    }
    return false;
  }
}

// ── 5. MovingPlatform ────────────────────────────────────────
class MovingPlatform extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type       = ObstacleType.MOVING_PLATFORM;
    this.path       = cfg.path || 'linear'; // 'linear' | 'sinusoidal' | 'circular' | 'waypoints'
    this.startX     = this.x;
    this.startY     = this.y;
    this.amplitude  = cfg.amplitude || 100;
    this.period     = cfg.period    || 4;   // seconds
    this.waypoints  = cfg.waypoints || [];
    this.waypointIdx = 0;
    this.waypointT  = 0;
    this.speed      = cfg.speed || 2;
    this.radius     = cfg.radius || 100;    // for circular
    this.prevX      = this.x;
    this.prevY      = this.y;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    const t = this.timer;
    this.timer += dt;

    switch (this.path) {
      case 'linear':
        this.x = this.startX + Math.sin(t * Math.PI * 2 / this.period) * this.amplitude;
        break;
      case 'vertical':
        this.y = this.startY + Math.sin(t * Math.PI * 2 / this.period) * this.amplitude;
        break;
      case 'sinusoidal':
        this.x = this.startX + Math.sin(t * Math.PI * 2 / this.period)       * this.amplitude;
        this.y = this.startY + Math.sin(t * Math.PI * 4 / this.period) * 0.5 * this.amplitude;
        break;
      case 'circular':
        this.x = this.startX + Math.cos(t * Math.PI * 2 / this.period) * this.radius;
        this.y = this.startY + Math.sin(t * Math.PI * 2 / this.period) * this.radius;
        break;
      case 'waypoints':
        if (this.waypoints.length >= 2) {
          const a = this.waypoints[this.waypointIdx];
          const b = this.waypoints[(this.waypointIdx + 1) % this.waypoints.length];
          const dist = Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2);
          this.waypointT += this.speed * dt / dist;
          if (this.waypointT >= 1) { this.waypointT = 0; this.waypointIdx = (this.waypointIdx + 1) % this.waypoints.length; }
          this.x = a.x + (b.x - a.x) * this.waypointT;
          this.y = a.y + (b.y - a.y) * this.waypointT;
        }
        break;
    }
  }

  getVelocity() {
    return { vx: (this.x - this.prevX) / (1/60), vy: (this.y - this.prevY) / (1/60) };
  }
}

// ── 6. CollapsingBridge ──────────────────────────────────────
class CollapsingBridge extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type         = ObstacleType.COLLAPSING_BRIDGE;
    this.segments     = cfg.segments || 6;
    this.segStates    = new Array(this.segments).fill(0); // 0=intact, 1=cracking, 2=falling, 3=gone
    this.segTimers    = new Array(this.segments).fill(0);
    this.triggerDelay = cfg.triggerDelay || 1;
    this.fallSpeed    = 0;
    this.totalMass    = cfg.mass || 1000;
    this.triggerWeight = cfg.triggerWeight || 200; // kg above which it collapses
    this.collapsing   = false;
    this.collapseTimer = 0;
  }

  update(dt, vehicleWeightAbove) {
    if (!this.collapsing && vehicleWeightAbove > this.triggerWeight) {
      this.collapsing = true;
    }
    if (this.collapsing) {
      this.collapseTimer += dt;
      // Cascade segment collapse
      const segW = this.width / this.segments;
      for (let i = 0; i < this.segments; i++) {
        if (this.segStates[i] < 2) {
          const delay = this.triggerDelay + i * 0.12 + (Math.random() * 0.08 - 0.04);
          if (this.collapseTimer >= delay) {
            this.segStates[i] = 2;
          } else if (this.collapseTimer >= delay - 0.3) {
            this.segStates[i] = 1;
          }
        } else if (this.segStates[i] === 2) {
          this.segTimers[i] += dt;
          // Segments fall away
        }
      }
    }
  }

  isSolid(segIndex) {
    return this.segStates[segIndex] < 2;
  }

  isFullyGone() {
    return this.segStates.every(s => s >= 2);
  }
}

// ── 7. WaterGeyser ───────────────────────────────────────────
class WaterGeyser extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type        = ObstacleType.WATER_GEYSER;
    this.period      = cfg.period   || 5;
    this.duration    = cfg.duration || 2;
    this.pushForce   = cfg.pushForce || 800;
    this.erupting    = false;
    this.phaseOffset = cfg.phaseOffset || 0;
    this.timer       = this.phaseOffset;
    this.particles   = [];
    this.maxParticles = 30;
  }

  update(dt) {
    this.timer += dt;
    const cycle = this.timer % this.period;
    this.erupting = cycle < this.duration;

    if (this.erupting) {
      // Spawn particles
      if (this.particles.length < this.maxParticles) {
        this.particles.push({
          x: this.x + this.width * 0.5 + (Math.random() - 0.5) * this.width * 0.3,
          y: this.y,
          vy: -(Math.random() * this.pushForce * 0.008 + 3),
          vx: (Math.random() - 0.5) * 2,
          alpha: 1, life: 1
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 9.81 * dt;
      p.life -= dt * 0.8;
      p.alpha = p.life;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  applyToVehicle(vehicle) {
    if (!this.erupting) return;
    const cx = this.x + this.width * 0.5;
    const cy = this.y;
    const dx = vehicle.x - cx;
    const dy = vehicle.y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < this.width * 1.5) {
      vehicle.vy -= this.pushForce / (vehicle.mass || 800) * 0.016;
    }
  }
}

// ── 8. MagneticZone ──────────────────────────────────────────
class MagneticZone extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type     = ObstacleType.MAGNETIC_ZONE;
    this.polarity = cfg.polarity || 'attract'; // 'attract' | 'repel'
    this.strength = cfg.strength || 500;
    this.radius   = cfg.radius   || 150;
  }

  applyToVehicle(vehicle, dt) {
    const cx = this.x + this.width  * 0.5;
    const cy = this.y + this.height * 0.5;
    const dx = cx - vehicle.x;
    const dy = cy - vehicle.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.radius || dist < 1) return;

    const force = this.strength / (dist * dist) * (vehicle.mass || 800);
    const nx = dx / dist;
    const ny = dy / dist;
    const sign = this.polarity === 'attract' ? 1 : -1;
    vehicle.vx += sign * nx * force * dt;
    vehicle.vy += sign * ny * force * dt;
  }
}

// ── 9. GravityWell ───────────────────────────────────────────
class GravityWell extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type           = ObstacleType.GRAVITY_WELL;
    this.gravityMult    = cfg.gravityMult || -1; // negative = invert gravity
    this.radius         = cfg.radius || 200;
    this.falloffPower   = cfg.falloffPower || 2;
    this.maxForce       = cfg.maxForce || 2000;
  }

  applyToVehicle(vehicle, dt, globalGravity) {
    const cx = this.x + this.width  * 0.5;
    const cy = this.y + this.height * 0.5;
    const dx = vehicle.x - cx;
    const dy = vehicle.y - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > this.radius) return;

    const t = 1 - dist / this.radius;
    const strength = Math.pow(t, this.falloffPower);
    const extraGravity = globalGravity * this.gravityMult * strength;
    vehicle.vy += extraGravity * dt;
  }
}

// ── 10. CrumblingTerrain ─────────────────────────────────────
class CrumblingTerrain extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type        = ObstacleType.CRUMBLING_TERRAIN;
    this.integrity   = 1.0;
    this.degradeRate = cfg.degradeRate || 0.3; // per second of vehicle contact
    this.repairRate  = cfg.repairRate  || 0;
    this.crumbled    = false;
    this.particles   = [];
  }

  update(dt, vehicleAbove) {
    if (vehicleAbove && !this.crumbled) {
      this.integrity -= this.degradeRate * dt;
      if (this.integrity <= 0) {
        this.integrity = 0;
        this.crumbled  = true;
        this._spawnCrumbleParticles();
      }
    } else if (!vehicleAbove && this.repairRate > 0) {
      this.integrity = Math.min(1, this.integrity + this.repairRate * dt);
      if (this.integrity >= 1) this.crumbled = false;
    }
  }

  isSolid() { return !this.crumbled; }

  _spawnCrumbleParticles() {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: this.x + Math.random() * this.width,
        y: this.y,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 3 + 1),
        life: 1
      });
    }
  }
}

// ── 11. TurboPad ─────────────────────────────────────────────
class TurboPad extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type        = ObstacleType.TURBO_PAD;
    this.launchVx    = cfg.launchVx || 15;
    this.launchVy    = cfg.launchVy || -8;
    this.cooldown    = 0;
    this.cooldownMax = cfg.cooldownMax || 2;
    this.active      = true;
    this.animated    = true;
    this.animTimer   = 0;
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      this.active = this.cooldown <= 0;
    }
    this.animTimer += dt;
  }

  applyToVehicle(vehicle) {
    if (!this.active) return;
    vehicle.vx = this.launchVx;
    vehicle.vy = this.launchVy;
    this.cooldown = this.cooldownMax;
    this.active   = false;
  }

  getGlowAlpha() {
    return this.active ? (0.5 + Math.sin(this.animTimer * 6) * 0.3) : 0.1;
  }
}

// ── 12. RisingSpikeArray ─────────────────────────────────────
class RisingSpikeArray extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type          = ObstacleType.RISING_SPIKE;
    this.count         = cfg.count || 4;
    this.period        = cfg.period || 3;
    this.warningTime   = cfg.warningTime || 0.5;
    this.riseTime      = cfg.riseTime || 0.2;
    this.holdTime      = cfg.holdTime || 1;
    this.retractTime   = cfg.retractTime || 0.3;
    this.spikeHeight   = cfg.spikeHeight || 40;
    this.phase         = 'retracted'; // 'retracted' | 'warning' | 'rising' | 'extended' | 'retracting'
    this.phaseTimer    = 0;
    this.currentHeight = 0;
    this.offset        = cfg.offset || 0; // phase offset
    this.timer         = this.offset;
  }

  update(dt) {
    this.timer += dt;
    const cycle = this.timer % this.period;

    if (cycle < this.warningTime) {
      this.phase = 'warning';
      this.currentHeight = 0;
    } else if (cycle < this.warningTime + this.riseTime) {
      this.phase = 'rising';
      const t = (cycle - this.warningTime) / this.riseTime;
      this.currentHeight = t * this.spikeHeight;
    } else if (cycle < this.warningTime + this.riseTime + this.holdTime) {
      this.phase = 'extended';
      this.currentHeight = this.spikeHeight;
    } else if (cycle < this.warningTime + this.riseTime + this.holdTime + this.retractTime) {
      this.phase = 'retracting';
      const t = (cycle - this.warningTime - this.riseTime - this.holdTime) / this.retractTime;
      this.currentHeight = (1 - t) * this.spikeHeight;
    } else {
      this.phase = 'retracted';
      this.currentHeight = 0;
    }
  }

  isExtended() { return this.phase === 'extended' || this.phase === 'rising'; }
  isWarning()  { return this.phase === 'warning'; }

  getEffectiveDamage() {
    if (!this.isExtended()) return 0;
    return this.damage * (this.currentHeight / this.spikeHeight);
  }
}

// ── 13. AirVent ──────────────────────────────────────────────
class AirVent extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type       = ObstacleType.AIR_VENT;
    this.direction  = cfg.direction || 'up'; // 'up' | 'down' | 'left' | 'right'
    this.force      = cfg.force     || 600;
    this.range      = cfg.range     || 120;
    this.pulsed     = cfg.pulsed    || false;
    this.period     = cfg.period    || 2;
    this.dutyCycle  = cfg.dutyCycle || 0.6;
    this.timer      = 0;
    this.blowing    = !this.pulsed;
  }

  update(dt) {
    this.timer += dt;
    if (this.pulsed) {
      const cycle = this.timer % this.period;
      this.blowing = cycle < this.period * this.dutyCycle;
    }
  }

  getForceVector() {
    if (!this.blowing) return { fx: 0, fy: 0 };
    switch (this.direction) {
      case 'up':    return { fx: 0,          fy: -this.force };
      case 'down':  return { fx: 0,          fy:  this.force };
      case 'left':  return { fx: -this.force, fy: 0 };
      case 'right': return { fx:  this.force, fy: 0 };
      default:      return { fx: 0,          fy: -this.force };
    }
  }

  applyToVehicle(vehicle, dt) {
    if (!this.blowing) return;
    const cx = this.x + this.width  * 0.5;
    const cy = this.y + this.height * 0.5;
    let inRange = false;
    const dx = vehicle.x - cx;
    const dy = vehicle.y - cy;
    switch (this.direction) {
      case 'up':   inRange = Math.abs(dx) < this.width  && dy < 0 && dy > -this.range; break;
      case 'down': inRange = Math.abs(dx) < this.width  && dy > 0 && dy <  this.range; break;
      case 'left': inRange = Math.abs(dy) < this.height && dx < 0 && dx > -this.range; break;
      case 'right':inRange = Math.abs(dy) < this.height && dx > 0 && dx <  this.range; break;
    }
    if (inRange) {
      const fv = this.getForceVector();
      const mass = vehicle.mass || 800;
      vehicle.vx += fv.fx / mass * dt;
      vehicle.vy += fv.fy / mass * dt;
    }
  }
}

// ── 14. PortalPair ───────────────────────────────────────────
class PortalPair {
  constructor(cfg) {
    this.id      = cfg.id || 'portal_' + (Math.random() * 1e6 | 0);
    this.portals = [
      { x: cfg.x1, y: cfg.y1, w: cfg.w || 30, h: cfg.h || 80, color: cfg.color1 || '#ff00ff', active: true },
      { x: cfg.x2, y: cfg.y2, w: cfg.w || 30, h: cfg.h || 80, color: cfg.color2 || '#00ffff', active: true }
    ];
    this.cooldown    = 0;
    this.cooldownMax = cfg.cooldownMax || 1.5;
    this.preserveVelocity = cfg.preserveVelocity !== false;
    this.active      = true;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
  }

  checkTeleport(vehicle) {
    if (!this.active || this.cooldown > 0) return false;
    for (let i = 0; i < 2; i++) {
      const p = this.portals[i];
      const o = this.portals[1 - i];
      if (vehicle.x + vehicle.width  > p.x && vehicle.x < p.x + p.w &&
          vehicle.y + vehicle.height > p.y && vehicle.y < p.y + p.h) {
        vehicle.x = o.x + (vehicle.x - p.x);
        vehicle.y = o.y + (vehicle.y - p.y);
        if (!this.preserveVelocity) { vehicle.vx *= 0.8; vehicle.vy *= 0.8; }
        this.cooldown = this.cooldownMax;
        return true;
      }
    }
    return false;
  }
}

// ── 15. ElectricFence ────────────────────────────────────────
class ElectricFence extends DynamicObstacle {
  constructor(cfg) {
    super(cfg);
    this.type        = ObstacleType.ELECTRIC_FENCE;
    this.period      = cfg.period    || 2;
    this.dutyCycle   = cfg.dutyCycle || 0.5;
    this.stunDuration = cfg.stunDuration || 0.8;
    this.timer       = cfg.offset || 0;
    this.active      = false;
    this.arcAlpha    = 0;
  }

  update(dt) {
    this.timer += dt;
    const cycle = this.timer % this.period;
    this.active = cycle < this.period * this.dutyCycle;
    this.arcAlpha = this.active ? (0.6 + Math.sin(this.timer * 30) * 0.4) : 0;
  }

  applyToVehicle(vehicle) {
    if (!this.active) return;
    vehicle.health -= this.damage * 0.016;
    vehicle.stunTimer = Math.max(vehicle.stunTimer || 0, this.stunDuration);
  }
}

// ── Obstacle interaction matrix ──────────────────────────────
const OBSTACLE_INTERACTIONS = {
  [ObstacleType.ROLLING_BOULDER]: {
    [ObstacleType.BOUNCING_SPRING]: (boulder, spring) => {
      // Boulder hits spring — gets launched upward
      spring.trigger(boulder.mass);
      boulder.vy = -(spring.releaseForce / boulder.mass);
      boulder.vx *= 0.5;
    },
    [ObstacleType.MAGNETIC_ZONE]: (boulder, magnet) => {
      // Magnet deflects boulder
      const dx = (magnet.x + magnet.width*0.5) - boulder.x;
      const dy = (magnet.y + magnet.height*0.5) - boulder.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < magnet.radius) {
        const f = magnet.strength / (dist * dist + 1);
        const sign = magnet.polarity === 'attract' ? 1 : -1;
        boulder.vx += sign * (dx/dist) * f * 0.016 / boulder.mass;
        boulder.vy += sign * (dy/dist) * f * 0.016 / boulder.mass;
      }
    }
  },
  [ObstacleType.WATER_GEYSER]: {
    [ObstacleType.ELECTRIC_FENCE]: (geyser, fence) => {
      // Water from geyser reaching fence extends its damage range
      if (geyser.erupting) fence.damage *= 1.5;
    }
  }
};

// ── ObstacleManager ──────────────────────────────────────────
class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.portals   = [];
    this.grid      = new SpatialGrid(200);
  }

  add(obstacle) {
    this.obstacles.push(obstacle);
    this.grid.insert(obstacle);
    return obstacle;
  }

  addPortal(portalPair) {
    this.portals.push(portalPair);
    return portalPair;
  }

  remove(obstacle) {
    const idx = this.obstacles.indexOf(obstacle);
    if (idx >= 0) this.obstacles.splice(idx, 1);
    this.grid.remove(obstacle);
  }

  update(dt, vehicle, gravity, terrainHeightAt) {
    for (const ob of this.obstacles) {
      if (ob.destroyed) continue;
      if (ob instanceof RollingBoulder) ob.update(dt, gravity, terrainHeightAt);
      else ob.update(dt, vehicle ? vehicle.mass > (ob.triggerWeight || Infinity) : false);
      // Check obstacle-obstacle interactions
      const nearby = this.grid.query(ob.x - 50, ob.y - 50, ob.width + 100, ob.height + 100);
      for (const other of nearby) {
        if (other === ob || other.destroyed) continue;
        const matrix = OBSTACLE_INTERACTIONS[ob.type];
        if (matrix && matrix[other.type]) {
          matrix[other.type](ob, other);
        }
      }
    }

    // Update portals
    for (const p of this.portals) {
      p.update(dt);
      if (vehicle) p.checkTeleport(vehicle);
    }

    // Update grid for moving obstacles
    for (const ob of this.obstacles) {
      if (ob instanceof MovingPlatform || ob instanceof RollingBoulder || ob instanceof SwingingPendulum) {
        this.grid.update(ob);
      }
    }
  }

  queryNear(x, y, w, h) {
    return this.grid.query(x, y, w, h);
  }

  applyAllToVehicle(vehicle, dt, gravity) {
    const bounds = vehicle;
    const near = this.grid.query(
      vehicle.x - 200, vehicle.y - 200,
      vehicle.width  + 400, vehicle.height + 400
    );
    for (const ob of near) {
      if (ob.destroyed || !ob.active) continue;
      if (ob.overlaps(vehicle.x, vehicle.y, vehicle.width || 60, vehicle.height || 40)) {
        if (ob.applyToVehicle) ob.applyToVehicle(vehicle, dt, gravity);
      }
    }
  }

  createFromConfig(cfg) {
    let ob;
    switch (cfg.type) {
      case ObstacleType.ROLLING_BOULDER:   ob = new RollingBoulder(cfg);   break;
      case ObstacleType.SWINGING_PENDULUM: ob = new SwingingPendulum(cfg); break;
      case ObstacleType.BOUNCING_SPRING:   ob = new BouncingSpring(cfg);   break;
      case ObstacleType.ROTATING_BLADE:    ob = new RotatingBlade(cfg);    break;
      case ObstacleType.MOVING_PLATFORM:   ob = new MovingPlatform(cfg);   break;
      case ObstacleType.COLLAPSING_BRIDGE: ob = new CollapsingBridge(cfg); break;
      case ObstacleType.WATER_GEYSER:      ob = new WaterGeyser(cfg);      break;
      case ObstacleType.MAGNETIC_ZONE:     ob = new MagneticZone(cfg);     break;
      case ObstacleType.GRAVITY_WELL:      ob = new GravityWell(cfg);      break;
      case ObstacleType.CRUMBLING_TERRAIN: ob = new CrumblingTerrain(cfg); break;
      case ObstacleType.TURBO_PAD:         ob = new TurboPad(cfg);         break;
      case ObstacleType.RISING_SPIKE:      ob = new RisingSpikeArray(cfg); break;
      case ObstacleType.AIR_VENT:          ob = new AirVent(cfg);          break;
      case ObstacleType.ELECTRIC_FENCE:    ob = new ElectricFence(cfg);    break;
      case ObstacleType.PORTAL_PAIR:
        return this.addPortal(new PortalPair(cfg));
      default:
        ob = new DynamicObstacle(cfg);
    }
    return this.add(ob);
  }

  serialize() {
    return this.obstacles.map(ob => ({
      type: ob.type, x: ob.x, y: ob.y, width: ob.width, height: ob.height,
      damage: ob.damage, destroyed: ob.destroyed
    }));
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ObstacleType       = ObstacleType;
  window.SpatialGrid        = SpatialGrid;
  window.DynamicObstacle    = DynamicObstacle;
  window.RollingBoulder     = RollingBoulder;
  window.SwingingPendulum   = SwingingPendulum;
  window.BouncingSpring     = BouncingSpring;
  window.RotatingBlade      = RotatingBlade;
  window.MovingPlatform     = MovingPlatform;
  window.CollapsingBridge   = CollapsingBridge;
  window.WaterGeyser        = WaterGeyser;
  window.MagneticZone       = MagneticZone;
  window.GravityWell        = GravityWell;
  window.CrumblingTerrain   = CrumblingTerrain;
  window.TurboPad           = TurboPad;
  window.RisingSpikeArray   = RisingSpikeArray;
  window.AirVent            = AirVent;
  window.PortalPair         = PortalPair;
  window.ElectricFence      = ElectricFence;
  window.ObstacleManager    = ObstacleManager;
  window.OBSTACLE_INTERACTIONS = OBSTACLE_INTERACTIONS;
}
if (typeof module !== 'undefined') {
  module.exports = { ObstacleType, DynamicObstacle, RollingBoulder, SwingingPendulum,
    BouncingSpring, RotatingBlade, MovingPlatform, CollapsingBridge, WaterGeyser,
    MagneticZone, GravityWell, CrumblingTerrain, TurboPad, RisingSpikeArray,
    AirVent, PortalPair, ElectricFence, ObstacleManager, SpatialGrid };
}

})();


// ============================================================
// CHECKPOINT_SYSTEM — full checkpoint logic and data
// ============================================================
(function() {
'use strict';

// ── Checkpoint type constants ────────────────────────────────
const CheckpointType = Object.freeze({
  STANDARD: 'standard',
  SPEED:    'speed',
  SKILL:    'skill',
  HIDDEN:   'hidden',
  BONUS:    'bonus',
  BOSS:     'boss',
  SPLIT:    'split'    // multi-path routing
});

// ── Checkpoint visual states ─────────────────────────────────
const CheckpointState = Object.freeze({
  UNVISITED: 'unvisited',
  ACTIVE:    'active',
  PASSED:    'passed',
  FAILED:    'failed',
  LOCKED:    'locked'
});

// ── CheckpointData factory ───────────────────────────────────
function createCheckpoint(cfg) {
  return {
    id:              cfg.id              || ('cp_' + (Math.random() * 1e9 | 0)),
    x:               cfg.x              || 0,
    y:               cfg.y              || 0,
    width:           cfg.width          || 20,
    height:          cfg.height         || 120,
    type:            cfg.type           || CheckpointType.STANDARD,
    state:           CheckpointState.UNVISITED,
    bonusMultiplier: cfg.bonusMultiplier || 1.0,
    timeBonus:       cfg.timeBonus      || 0,        // seconds added to timer
    secretFlag:      cfg.secretFlag     || false,
    orderIndex:      cfg.orderIndex     || 0,
    requiredPrev:    cfg.requiredPrev   || null,     // id of checkpoint that must be passed first
    triggers:        cfg.triggers       || [],       // events triggered on passing
    miniGame:        cfg.miniGame       || null,     // bonus challenge at checkpoint
    leaderboard:     [],                             // {playerName, time, date}
    passedAt:        null,                           // game time when passed
    ghostTime:       cfg.ghostTime      || null,     // best ghost time at this cp
    penaltyTime:     cfg.penaltyTime    || 5,        // seconds penalty for missing
    pathIndex:       cfg.pathIndex      || 0         // for split checkpoints
  };
}

// ── CheckpointTrigger types ──────────────────────────────────
const TriggerType = Object.freeze({
  WEATHER_CHANGE:     'weather_change',
  OBSTACLE_ACTIVATE:  'obstacle_activate',
  MUSIC_CHANGE:       'music_change',
  CAMERA_SHAKE:       'camera_shake',
  SPAWN_ENEMY:        'spawn_enemy',
  OPEN_GATE:          'open_gate',
  DIALOGUE:           'dialogue',
  SCORE_MULTIPLIER:   'score_multiplier',
  GRAVITY_CHANGE:     'gravity_change',
  UNLOCK_PATH:        'unlock_path'
});

// ── BonusChallenge types (mini-games at checkpoint) ──────────
const BonusChallenge = {
  createWheelieChallenge(duration, minDuration) {
    return {
      type:        'wheelie',
      duration:    duration    || 3,
      minDuration: minDuration || 1.5,
      reward:      { coins: 50, timebonus: 5 },
      timeLimit:   duration + 5,
      active:      false,
      progress:    0,
      succeeded:   false
    };
  },
  createJumpChallenge(targetHeight) {
    return {
      type:        'jump',
      targetHeight: targetHeight || 80,
      reward:      { coins: 40, timebonus: 4 },
      timeLimit:   8,
      active:      false,
      maxHeight:   0,
      succeeded:   false
    };
  },
  createSpeedChallenge(targetSpeed, maintainTime) {
    return {
      type:         'speed',
      targetSpeed:  targetSpeed  || 25,
      maintainTime: maintainTime || 2,
      reward:       { coins: 60, timebonus: 6 },
      timeLimit:    10,
      active:       false,
      maintainTimer: 0,
      succeeded:    false
    };
  },
  createFlipChallenge(flipsRequired) {
    return {
      type:          'flip',
      flipsRequired: flipsRequired || 1,
      reward:        { coins: 80, timebonus: 8 },
      timeLimit:     6,
      active:        false,
      flipsCount:    0,
      succeeded:     false
    };
  }
};

// ── CheckpointSystem class ───────────────────────────────────
class CheckpointSystem {
  constructor(mapId) {
    this.mapId          = mapId;
    this.checkpoints    = [];
    this.currentIndex   = 0;        // next expected checkpoint
    this.missedIds      = [];
    this.totalPenalty   = 0;
    this.startTime      = 0;
    this.splitTimes     = [];       // time at each checkpoint
    this.ghostSplitTimes = [];      // best run split times
    this.activePath     = 0;        // for multi-path routing
    this.pathHistory    = [];
    this.onCheckpointPass  = null;  // callback(checkpoint, splitTime)
    this.onCheckpointMiss  = null;  // callback(checkpoint)
    this.onAllCheckpoints  = null;  // callback(totalTime, splits)
    this.eventQueue     = [];
  }

  load(checkpointConfigs) {
    this.checkpoints = checkpointConfigs.map((cfg, i) =>
      createCheckpoint(Object.assign({ orderIndex: i }, cfg))
    );
    this.reset();
    return this;
  }

  reset() {
    this.currentIndex  = 0;
    this.missedIds     = [];
    this.totalPenalty  = 0;
    this.startTime     = 0;
    this.splitTimes    = [];
    this.eventQueue    = [];
    this.pathHistory   = [];
    for (const cp of this.checkpoints) {
      cp.state   = CheckpointState.UNVISITED;
      cp.passedAt = null;
    }
    if (this.checkpoints.length > 0) {
      this.checkpoints[0].state = CheckpointState.ACTIVE;
    }
  }

  start(gameTime) {
    this.startTime = gameTime;
    if (this.checkpoints.length > 0) {
      this.checkpoints[0].state = CheckpointState.ACTIVE;
    }
  }

  update(gameTime, vehicleX, vehicleY, vehicleW, vehicleH) {
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      if (cp.state === CheckpointState.PASSED || cp.state === CheckpointState.FAILED) continue;

      // Check if vehicle overlaps checkpoint gate
      if (this._overlaps(vehicleX, vehicleY, vehicleW, vehicleH, cp.x, cp.y, cp.width, cp.height)) {
        if (i === this.currentIndex || cp.type === CheckpointType.HIDDEN || cp.type === CheckpointType.BONUS) {
          this._passCheckpoint(cp, i, gameTime);
        }
      }
    }

    // Process queued events
    this._processEventQueue(gameTime);
  }

  _overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  _passCheckpoint(cp, index, gameTime) {
    const splitTime = gameTime - this.startTime;
    cp.state    = CheckpointState.PASSED;
    cp.passedAt = splitTime;
    this.splitTimes.push(splitTime);

    // Advance to next required checkpoint
    if (!cp.secretFlag && cp.type !== CheckpointType.BONUS) {
      this.currentIndex = index + 1;
      if (this.currentIndex < this.checkpoints.length) {
        this.checkpoints[this.currentIndex].state = CheckpointState.ACTIVE;
      }
    }

    // Queue triggers
    for (const trigger of cp.triggers) {
      this.eventQueue.push({ trigger, time: gameTime, delay: trigger.delay || 0 });
    }

    // Record ghost split comparison
    const ghostDiff = this.ghostSplitTimes[index] != null
      ? splitTime - this.ghostSplitTimes[index]
      : null;

    if (this.onCheckpointPass) {
      this.onCheckpointPass(cp, splitTime, ghostDiff);
    }

    // Check if all main checkpoints done
    const mainDone = this.checkpoints
      .filter(c => c.type !== CheckpointType.BONUS && c.type !== CheckpointType.HIDDEN)
      .every(c => c.state === CheckpointState.PASSED);
    if (mainDone && this.onAllCheckpoints) {
      this.onAllCheckpoints(splitTime, this.splitTimes.slice());
    }
  }

  checkMissed(vehicleX) {
    // Detect if vehicle passed a checkpoint's X position without hitting it
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      if (cp.state !== CheckpointState.UNVISITED && cp.state !== CheckpointState.ACTIVE) continue;
      if (vehicleX > cp.x + cp.width + 50 && i === this.currentIndex) {
        // Missed this checkpoint
        cp.state = CheckpointState.FAILED;
        this.missedIds.push(cp.id);
        this.totalPenalty += cp.penaltyTime;
        this.currentIndex++;
        if (this.currentIndex < this.checkpoints.length) {
          this.checkpoints[this.currentIndex].state = CheckpointState.ACTIVE;
        }
        if (this.onCheckpointMiss) this.onCheckpointMiss(cp);
      }
    }
  }

  _processEventQueue(gameTime) {
    for (let i = this.eventQueue.length - 1; i >= 0; i--) {
      const item = this.eventQueue[i];
      if (gameTime >= item.time + item.delay) {
        this._executeEvent(item.trigger);
        this.eventQueue.splice(i, 1);
      }
    }
  }

  _executeEvent(trigger) {
    // Dispatch to game systems via event bus
    if (typeof window !== 'undefined' && window.GameEventBus) {
      window.GameEventBus.emit(trigger.type, trigger.data);
    }
  }

  getSplitDiff(index) {
    if (this.ghostSplitTimes[index] == null || this.splitTimes[index] == null) return null;
    return this.splitTimes[index] - this.ghostSplitTimes[index];
  }

  loadGhostSplits(splits) {
    this.ghostSplitTimes = splits.slice();
  }

  getProgress() {
    const passed = this.checkpoints.filter(cp =>
      cp.state === CheckpointState.PASSED &&
      cp.type !== CheckpointType.BONUS &&
      cp.type !== CheckpointType.HIDDEN
    ).length;
    const total  = this.checkpoints.filter(cp =>
      cp.type !== CheckpointType.BONUS &&
      cp.type !== CheckpointType.HIDDEN
    ).length;
    return { passed, total, fraction: total > 0 ? passed / total : 0 };
  }

  getActiveCheckpoint() {
    return this.checkpoints[this.currentIndex] || null;
  }

  getDistanceToNext(vehicleX) {
    const cp = this.getActiveCheckpoint();
    return cp ? Math.max(0, cp.x - vehicleX) : Infinity;
  }

  serialize() {
    return {
      mapId:       this.mapId,
      splitTimes:  this.splitTimes.slice(),
      missedIds:   this.missedIds.slice(),
      totalPenalty: this.totalPenalty,
      currentIndex: this.currentIndex
    };
  }

  static deserialize(data) {
    const cs = new CheckpointSystem(data.mapId);
    cs.splitTimes    = data.splitTimes   || [];
    cs.missedIds     = data.missedIds    || [];
    cs.totalPenalty  = data.totalPenalty || 0;
    cs.currentIndex  = data.currentIndex || 0;
    return cs;
  }
}

// ── CheckpointLeaderboard ────────────────────────────────────
class CheckpointLeaderboard {
  constructor(checkpointId, maxEntries) {
    this.checkpointId = checkpointId;
    this.maxEntries   = maxEntries || 100;
    this.entries      = [];  // {rank, playerName, time, vehicle, date}
  }

  submit(playerName, time, vehicle) {
    const entry = {
      rank:       0,
      playerName: playerName,
      time:       time,
      vehicle:    vehicle || 'unknown',
      date:       Date.now()
    };
    this.entries.push(entry);
    this.entries.sort((a, b) => a.time - b.time);
    if (this.entries.length > this.maxEntries) this.entries.length = this.maxEntries;
    this.entries.forEach((e, i) => e.rank = i + 1);
    return entry.rank;
  }

  getTopN(n) {
    return this.entries.slice(0, n);
  }

  getRankOf(playerName) {
    const e = this.entries.find(e => e.playerName === playerName);
    return e ? e.rank : null;
  }

  serialize() {
    return { checkpointId: this.checkpointId, entries: this.entries };
  }
}

// ── Multi-path route system ───────────────────────────────────
class MultiPathRouter {
  constructor() {
    this.routes = [];  // [{ id, checkpointIds, difficulty, shortcut, description }]
    this.activeRoute = null;
  }

  addRoute(route) {
    this.routes.push(Object.assign({ id: 'route_' + this.routes.length }, route));
  }

  selectRoute(routeId) {
    this.activeRoute = this.routes.find(r => r.id === routeId) || null;
    return this.activeRoute;
  }

  getCheckpointsForRoute(routeId) {
    const route = this.routes.find(r => r.id === routeId);
    return route ? route.checkpointIds : [];
  }

  getAvailableRoutes(playerX) {
    // Routes become available based on player's current position
    return this.routes.filter(r => {
      const firstCpX = r.startX || 0;
      return playerX >= firstCpX - 200;
    });
  }
}

// ── Predefined checkpoint configurations for standard maps ───
const CHECKPOINT_PRESETS = {
  short_race: [
    { x:500,  timeBonus:20, type:CheckpointType.STANDARD, triggers:[{type:TriggerType.MUSIC_CHANGE, data:{track:'race_mid'}}] },
    { x:1200, timeBonus:15, type:CheckpointType.SPEED,    triggers:[] },
    { x:2000, timeBonus:10, type:CheckpointType.STANDARD, triggers:[] }
  ],
  long_race: [
    { x:600,  timeBonus:30, type:CheckpointType.STANDARD },
    { x:1400, timeBonus:25, type:CheckpointType.SPEED },
    { x:2200, timeBonus:22, type:CheckpointType.STANDARD },
    { x:3000, timeBonus:20, type:CheckpointType.SKILL },
    { x:3800, timeBonus:15, type:CheckpointType.STANDARD }
  ],
  time_attack: [
    { x:400,  timeBonus:35, type:CheckpointType.STANDARD },
    { x:900,  timeBonus:30, type:CheckpointType.SPEED,   bonusMultiplier:1.5 },
    { x:1500, timeBonus:28, type:CheckpointType.STANDARD },
    { x:2100, timeBonus:25, type:CheckpointType.SKILL,   bonusMultiplier:2.0,
      miniGame: BonusChallenge.createWheelieChallenge(3, 1.5) },
    { x:2800, timeBonus:22, type:CheckpointType.STANDARD },
    { x:3500, timeBonus:18, type:CheckpointType.BOSS }
  ]
};

// Export
if (typeof window !== 'undefined') {
  window.CheckpointType         = CheckpointType;
  window.CheckpointState        = CheckpointState;
  window.TriggerType            = TriggerType;
  window.BonusChallenge         = BonusChallenge;
  window.CheckpointSystem       = CheckpointSystem;
  window.CheckpointLeaderboard  = CheckpointLeaderboard;
  window.MultiPathRouter        = MultiPathRouter;
  window.CHECKPOINT_PRESETS     = CHECKPOINT_PRESETS;
  window.createCheckpoint       = createCheckpoint;
}
if (typeof module !== 'undefined') {
  module.exports = { CheckpointType, CheckpointState, TriggerType, BonusChallenge,
    CheckpointSystem, CheckpointLeaderboard, MultiPathRouter, CHECKPOINT_PRESETS, createCheckpoint };
}

})();

// ============================================================
// GHOST_SYSTEM — run recording, compression, and playback
// ============================================================
(function() {
'use strict';

// ── GhostFrame structure ─────────────────────────────────────
// { t, x, y, angle, vx, vy, omega, throttle, brake, turbo }
// All numeric values for efficient storage

// ── Delta encoder for compression ───────────────────────────
function encodeFrameDelta(prev, curr) {
  const SCALE = 1000; // 3 decimal places
  return {
    dt:      Math.round((curr.t     - prev.t)     * SCALE),
    dx:      Math.round((curr.x     - prev.x)     * SCALE),
    dy:      Math.round((curr.y     - prev.y)     * SCALE),
    da:      Math.round((curr.angle - prev.angle) * SCALE),
    dvx:     Math.round((curr.vx    - prev.vx)    * SCALE),
    dvy:     Math.round((curr.vy    - prev.vy)    * SCALE),
    dom:     Math.round((curr.omega - prev.omega) * SCALE),
    th:      curr.throttle ? 1 : 0,
    br:      curr.brake    ? 1 : 0,
    tu:      curr.turbo    ? 1 : 0
  };
}

function decodeFrameDelta(prev, delta) {
  const SCALE = 1000;
  return {
    t:        prev.t     + delta.dt  / SCALE,
    x:        prev.x     + delta.dx  / SCALE,
    y:        prev.y     + delta.dy  / SCALE,
    angle:    prev.angle + delta.da  / SCALE,
    vx:       prev.vx    + delta.dvx / SCALE,
    vy:       prev.vy    + delta.dvy / SCALE,
    omega:    prev.omega + delta.dom / SCALE,
    throttle: delta.th === 1,
    brake:    delta.br === 1,
    turbo:    delta.tu === 1
  };
}

// ── GhostRecorder ────────────────────────────────────────────
class GhostRecorder {
  constructor(sampleInterval) {
    this.sampleInterval = sampleInterval || 0.05; // 50ms = 20fps
    this.frames         = [];
    this.lastSample     = -Infinity;
    this.recording      = false;
    this.startTime      = 0;
    this.mapId          = null;
    this.vehicleId      = null;
    this.playerName     = null;
  }

  start(gameTime, mapId, vehicleId, playerName) {
    this.frames      = [];
    this.recording   = true;
    this.startTime   = gameTime;
    this.lastSample  = -Infinity;
    this.mapId       = mapId;
    this.vehicleId   = vehicleId;
    this.playerName  = playerName || 'Player';
  }

  sample(gameTime, vehicle) {
    if (!this.recording) return;
    if (gameTime - this.lastSample < this.sampleInterval) return;
    this.lastSample = gameTime;

    this.frames.push({
      t:        gameTime - this.startTime,
      x:        vehicle.x,
      y:        vehicle.y,
      angle:    vehicle.angle || 0,
      vx:       vehicle.vx   || 0,
      vy:       vehicle.vy   || 0,
      omega:    vehicle.omega || 0,
      throttle: vehicle.throttle || false,
      brake:    vehicle.brake    || false,
      turbo:    vehicle.turbo    || false
    });
  }

  stop() {
    this.recording = false;
    return this.frames.length > 0 ? this.exportGhost() : null;
  }

  exportGhost() {
    if (this.frames.length === 0) return null;

    // Compress via delta encoding
    const compressed = [this.frames[0]]; // First frame stored as-is
    for (let i = 1; i < this.frames.length; i++) {
      compressed.push(encodeFrameDelta(this.frames[i-1], this.frames[i]));
    }

    return {
      version:    2,
      mapId:      this.mapId,
      vehicleId:  this.vehicleId,
      playerName: this.playerName,
      duration:   this.frames[this.frames.length - 1].t,
      frameCount: this.frames.length,
      sampleInterval: this.sampleInterval,
      frames:     compressed,
      createdAt:  Date.now()
    };
  }
}

// ── GhostPlayback ─────────────────────────────────────────────
class GhostPlayback {
  constructor(ghostData) {
    this.ghostData    = ghostData;
    this.frames       = [];          // decoded frames
    this.currentIndex = 0;
    this.time         = 0;
    this.playing      = false;
    this.finished     = false;
    this.loopOnEnd    = false;
    this._decode(ghostData);
  }

  _decode(ghostData) {
    if (!ghostData || !ghostData.frames || ghostData.frames.length === 0) return;
    this.frames = [ghostData.frames[0]]; // First frame is raw
    for (let i = 1; i < ghostData.frames.length; i++) {
      this.frames.push(decodeFrameDelta(this.frames[i-1], ghostData.frames[i]));
    }
  }

  start(offset) {
    this.time         = offset || 0;
    this.currentIndex = 0;
    this.playing      = true;
    this.finished     = false;
  }

  update(dt) {
    if (!this.playing || this.finished) return;
    this.time += dt;

    // Advance index
    while (this.currentIndex < this.frames.length - 1 &&
           this.frames[this.currentIndex + 1].t <= this.time) {
      this.currentIndex++;
    }

    if (this.currentIndex >= this.frames.length - 1) {
      if (this.loopOnEnd) {
        this.time = 0;
        this.currentIndex = 0;
      } else {
        this.finished = true;
      }
    }
  }

  getInterpolatedState() {
    if (this.frames.length === 0) return null;
    const a = this.frames[this.currentIndex];
    const b = this.frames[Math.min(this.currentIndex + 1, this.frames.length - 1)];
    if (a === b) return a;

    const dt = b.t - a.t;
    const t  = dt > 0 ? (this.time - a.t) / dt : 0;
    const tc = Math.max(0, Math.min(1, t));

    return {
      x:        a.x     + (b.x     - a.x)     * tc,
      y:        a.y     + (b.y     - a.y)     * tc,
      angle:    a.angle + (b.angle - a.angle) * tc,
      vx:       a.vx    + (b.vx    - a.vx)    * tc,
      vy:       a.vy    + (b.vy    - a.vy)    * tc,
      omega:    a.omega + (b.omega - a.omega) * tc,
      throttle: a.throttle,
      brake:    a.brake,
      turbo:    a.turbo,
      t:        this.time
    };
  }

  getTimeDeviation(playerTime) {
    // positive = ghost is ahead, negative = ghost is behind
    return this.time - playerTime;
  }

  getRacePosition() {
    return this.frames.length > 0 ? this.frames[this.currentIndex].x : 0;
  }
}

// ── GhostRenderer ────────────────────────────────────────────
class GhostRenderer {
  constructor(options) {
    this.opacity       = options.opacity  || 0.4;
    this.color         = options.color    || '#00ffff';
    this.trailLength   = options.trailLength || 20;
    this.trailPositions = [];
    this.showDeviation = options.showDeviation !== false;
  }

  update(ghostState) {
    if (!ghostState) return;
    this.trailPositions.push({ x: ghostState.x, y: ghostState.y });
    if (this.trailPositions.length > this.trailLength) {
      this.trailPositions.shift();
    }
  }

  draw(ctx, camX, camY, ghostState, deviation) {
    if (!ghostState) return;
    ctx.save();

    // Draw trail
    if (this.trailPositions.length > 1) {
      for (let i = 1; i < this.trailPositions.length; i++) {
        const p0 = this.trailPositions[i - 1];
        const p1 = this.trailPositions[i];
        const alpha = (i / this.trailPositions.length) * this.opacity * 0.5;
        ctx.strokeStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p0.x - camX, p0.y - camY);
        ctx.lineTo(p1.x - camX, p1.y - camY);
        ctx.stroke();
      }
    }

    // Draw ghost vehicle silhouette
    ctx.globalAlpha = this.opacity;
    ctx.save();
    ctx.translate(ghostState.x - camX, ghostState.y - camY);
    ctx.rotate(ghostState.angle);
    ctx.fillStyle   = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    // Simple vehicle silhouette
    ctx.beginPath();
    ctx.roundRect(-30, -20, 60, 30, 5);
    ctx.fill();
    ctx.stroke();

    // Wheels
    ctx.beginPath();
    ctx.arc(-18, 10, 10, 0, Math.PI * 2);
    ctx.arc( 18, 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Deviation indicator
    if (this.showDeviation && deviation != null) {
      const deviationText = deviation > 0
        ? `+${deviation.toFixed(2)}s`
        : `${deviation.toFixed(2)}s`;
      const deviationColor = deviation > 0 ? '#ff4444' : '#44ff44';
      ctx.globalAlpha = 0.9;
      ctx.font        = 'bold 12px monospace';
      ctx.fillStyle   = deviationColor;
      ctx.fillText(deviationText, ghostState.x - camX, ghostState.y - camY - 35);
    }

    ctx.restore();
  }
}

// ── GhostStorage ─────────────────────────────────────────────
class GhostStorage {
  constructor() {
    this.personalBests = {};  // mapId -> ghostData
    this.friendGhosts  = {};  // mapId -> [{ playerName, ghostData }]
    this.worldRecords  = {};  // mapId -> ghostData
  }

  savePersonalBest(mapId, ghostData) {
    const existing = this.personalBests[mapId];
    if (!existing || ghostData.duration < existing.duration) {
      this.personalBests[mapId] = ghostData;
      this._persistToStorage(mapId, ghostData);
      return true;
    }
    return false;
  }

  getPersonalBest(mapId) {
    return this.personalBests[mapId] || null;
  }

  addFriendGhost(mapId, playerName, ghostData) {
    if (!this.friendGhosts[mapId]) this.friendGhosts[mapId] = [];
    // Keep max 5 friend ghosts per map
    this.friendGhosts[mapId] = this.friendGhosts[mapId]
      .filter(g => g.playerName !== playerName);
    this.friendGhosts[mapId].push({ playerName, ghostData });
    if (this.friendGhosts[mapId].length > 5) this.friendGhosts[mapId].shift();
  }

  getFriendGhosts(mapId) {
    return this.friendGhosts[mapId] || [];
  }

  setWorldRecord(mapId, ghostData) {
    this.worldRecords[mapId] = ghostData;
  }

  getWorldRecord(mapId) {
    return this.worldRecords[mapId] || null;
  }

  _persistToStorage(mapId, ghostData) {
    if (typeof localStorage === 'undefined') return;
    try {
      const key = `ghost_pb_${mapId}`;
      // Compress: store only essential fields
      const slim = {
        v:  ghostData.version,
        m:  ghostData.mapId,
        vh: ghostData.vehicleId,
        p:  ghostData.playerName,
        d:  ghostData.duration,
        fc: ghostData.frameCount,
        si: ghostData.sampleInterval,
        f:  ghostData.frames,
        t:  ghostData.createdAt
      };
      localStorage.setItem(key, JSON.stringify(slim));
    } catch(e) { /* quota exceeded or unavailable */ }
  }

  loadFromStorage(mapId) {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`ghost_pb_${mapId}`);
      if (!raw) return null;
      const slim = JSON.parse(raw);
      return {
        version:      slim.v,
        mapId:        slim.m,
        vehicleId:    slim.vh,
        playerName:   slim.p,
        duration:     slim.d,
        frameCount:   slim.fc,
        sampleInterval: slim.si,
        frames:       slim.f,
        createdAt:    slim.t
      };
    } catch(e) { return null; }
  }

  loadAll(mapIds) {
    for (const mapId of mapIds) {
      const ghost = this.loadFromStorage(mapId);
      if (ghost) this.personalBests[mapId] = ghost;
    }
  }
}

// ── GhostRaceManager — orchestrates multiple ghost comparisons ─
class GhostRaceManager {
  constructor() {
    this.recorder    = new GhostRecorder();
    this.playbacks   = [];   // [{ ghost: GhostPlayback, renderer: GhostRenderer, label }]
    this.storage     = new GhostStorage();
    this.isRacing    = false;
    this.raceStartTime = 0;
  }

  startRace(gameTime, mapId, vehicleId, playerName) {
    this.recorder.start(gameTime, mapId, vehicleId, playerName);
    this.isRacing    = true;
    this.raceStartTime = gameTime;

    // Start all ghost playbacks
    for (const pb of this.playbacks) {
      pb.ghost.start(0);
    }
  }

  addGhost(ghostData, label, color) {
    const playback = new GhostPlayback(ghostData);
    const renderer = new GhostRenderer({ color: color || '#00ffff', opacity: 0.4 });
    this.playbacks.push({ ghost: playback, renderer, label: label || 'Ghost' });
  }

  loadPersonalBest(mapId) {
    const ghost = this.storage.getPersonalBest(mapId) || this.storage.loadFromStorage(mapId);
    if (ghost) this.addGhost(ghost, 'Personal Best', '#ffff00');
  }

  loadWorldRecord(mapId) {
    const ghost = this.storage.getWorldRecord(mapId);
    if (ghost) this.addGhost(ghost, 'World Record', '#ff0088');
  }

  update(dt, gameTime, vehicle) {
    if (!this.isRacing) return;

    // Record player
    this.recorder.sample(gameTime, vehicle);

    // Update ghost playbacks
    for (const pb of this.playbacks) {
      pb.ghost.update(dt);
      const state = pb.ghost.getInterpolatedState();
      pb.renderer.update(state);
    }
  }

  draw(ctx, camX, camY, playerGameTime) {
    for (const pb of this.playbacks) {
      const state = pb.ghost.getInterpolatedState();
      const deviation = state ? pb.ghost.getTimeDeviation(playerGameTime) : null;
      pb.renderer.draw(ctx, camX, camY, state, deviation);
    }
  }

  endRace(mapId) {
    this.isRacing = false;
    const ghost = this.recorder.stop();
    if (ghost) {
      const isNewBest = this.storage.savePersonalBest(mapId, ghost);
      return { ghost, isNewBest };
    }
    return { ghost: null, isNewBest: false };
  }

  getDeviationSummary() {
    return this.playbacks.map(pb => ({
      label:    pb.label,
      deviation: pb.ghost.getTimeDeviation(
        this.recorder.frames.length > 0
          ? this.recorder.frames[this.recorder.frames.length-1].t
          : 0
      ),
      finished: pb.ghost.finished
    }));
  }

  serialize() {
    return {
      personalBests: this.storage.personalBests,
      worldRecords:  this.storage.worldRecords
    };
  }
}

// ── Ghost comparison statistics ──────────────────────────────
class GhostStatistics {
  static compare(ghostA, ghostB) {
    if (!ghostA || !ghostB) return null;
    return {
      timeDiff:     ghostA.duration - ghostB.duration,
      faster:       ghostA.duration < ghostB.duration ? 'A' : 'B',
      frameCountA:  ghostA.frameCount,
      frameCountB:  ghostB.frameCount,
      mapId:        ghostA.mapId,
      vehicleA:     ghostA.vehicleId,
      vehicleB:     ghostB.vehicleId
    };
  }

  static computeSectorTimes(ghost, sectorBoundaries) {
    // sectorBoundaries: [{ x: number }]
    const decoded = GhostStatistics._decodeGhost(ghost);
    if (!decoded || decoded.length === 0) return [];
    const sectorTimes = [];
    let sectorStart = 0;
    let sectorIdx = 0;
    for (const frame of decoded) {
      if (sectorIdx < sectorBoundaries.length &&
          frame.x >= sectorBoundaries[sectorIdx].x) {
        sectorTimes.push({ sector: sectorIdx, time: frame.t - sectorStart });
        sectorStart = frame.t;
        sectorIdx++;
      }
    }
    return sectorTimes;
  }

  static _decodeGhost(ghostData) {
    if (!ghostData || !ghostData.frames || ghostData.frames.length === 0) return [];
    const frames = [ghostData.frames[0]];
    for (let i = 1; i < ghostData.frames.length; i++) {
      frames.push(decodeFrameDelta(frames[i-1], ghostData.frames[i]));
    }
    return frames;
  }

  static getTopSpeedFromGhost(ghostData) {
    const frames = GhostStatistics._decodeGhost(ghostData);
    let maxSpeed = 0;
    for (const f of frames) {
      const speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      if (speed > maxSpeed) maxSpeed = speed;
    }
    return maxSpeed;
  }

  static getAverageSpeedFromGhost(ghostData) {
    const frames = GhostStatistics._decodeGhost(ghostData);
    if (frames.length === 0) return 0;
    let totalSpeed = 0;
    for (const f of frames) totalSpeed += Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    return totalSpeed / frames.length;
  }

  static getAirTimeFromGhost(ghostData, groundY) {
    const frames = GhostStatistics._decodeGhost(ghostData);
    let airTime = 0;
    for (let i = 1; i < frames.length; i++) {
      if (frames[i].y < groundY) airTime += frames[i].t - frames[i-1].t;
    }
    return airTime;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.GhostRecorder      = GhostRecorder;
  window.GhostPlayback      = GhostPlayback;
  window.GhostRenderer      = GhostRenderer;
  window.GhostStorage       = GhostStorage;
  window.GhostRaceManager   = GhostRaceManager;
  window.GhostStatistics    = GhostStatistics;
  window.encodeFrameDelta   = encodeFrameDelta;
  window.decodeFrameDelta   = decodeFrameDelta;
}
if (typeof module !== 'undefined') {
  module.exports = { GhostRecorder, GhostPlayback, GhostRenderer, GhostStorage,
    GhostRaceManager, GhostStatistics, encodeFrameDelta, decodeFrameDelta };
}

})();

// ============================================================
// TERRAIN_EXTENDED_DATA — additional terrain geometry tables
// ============================================================
(function() {
'use strict';

// Extended height map tables for procedural terrain generation
const TERRAIN_HEIGHT_TABLES = {
  tundra: {
    name: 'Tundra',
    baseAmplitude: 51.51,
    frequency: 0.0139,
    octaves: 6,
    persistence: 0.409,
    lacunarity: 2.366,
    surfaceTypes: ['ice', 'rock', 'dirt', 'sand'],
    obstacleDensity: 0.478,
    friction: 0.614,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  savanna: {
    name: 'Savanna',
    baseAmplitude: 46.79,
    frequency: 0.0188,
    octaves: 6,
    persistence: 0.582,
    lacunarity: 2.412,
    surfaceTypes: ['ice', 'grass', 'lava', 'rock'],
    obstacleDensity: 0.264,
    friction: 0.793,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  rainforest: {
    name: 'Rainforest',
    baseAmplitude: 112.79,
    frequency: 0.0133,
    octaves: 3,
    persistence: 0.508,
    lacunarity: 2.105,
    surfaceTypes: ['dirt', 'lava', 'grass', 'sand'],
    obstacleDensity: 0.133,
    friction: 0.449,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  mesa: {
    name: 'Mesa',
    baseAmplitude: 43.24,
    frequency: 0.0145,
    octaves: 4,
    persistence: 0.522,
    lacunarity: 1.842,
    surfaceTypes: ['dirt', 'wood', 'crystal', 'rock'],
    obstacleDensity: 0.301,
    friction: 0.732,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  swamp: {
    name: 'Swamp',
    baseAmplitude: 77.82,
    frequency: 0.0104,
    octaves: 6,
    persistence: 0.504,
    lacunarity: 1.975,
    surfaceTypes: ['wood', 'crystal', 'ice', 'dirt'],
    obstacleDensity: 0.388,
    friction: 0.410,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  glacier: {
    name: 'Glacier',
    baseAmplitude: 60.38,
    frequency: 0.0169,
    octaves: 3,
    persistence: 0.597,
    lacunarity: 2.336,
    surfaceTypes: ['lava', 'wood', 'mud', 'ice'],
    obstacleDensity: 0.225,
    friction: 0.517,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  bayou: {
    name: 'Bayou',
    baseAmplitude: 62.51,
    frequency: 0.0157,
    octaves: 4,
    persistence: 0.616,
    lacunarity: 2.055,
    surfaceTypes: ['sand', 'crystal', 'metal', 'rock'],
    obstacleDensity: 0.222,
    friction: 0.763,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  highlands: {
    name: 'Highlands',
    baseAmplitude: 117.58,
    frequency: 0.0109,
    octaves: 6,
    persistence: 0.550,
    lacunarity: 1.866,
    surfaceTypes: ['mud', 'rock', 'sand', 'wood'],
    obstacleDensity: 0.428,
    friction: 0.279,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  steppe: {
    name: 'Steppe',
    baseAmplitude: 113.61,
    frequency: 0.0122,
    octaves: 3,
    persistence: 0.418,
    lacunarity: 1.846,
    surfaceTypes: ['mud', 'ice', 'rock', 'crystal'],
    obstacleDensity: 0.451,
    friction: 0.321,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
  taiga: {
    name: 'Taiga',
    baseAmplitude: 98.07,
    frequency: 0.0196,
    octaves: 3,
    persistence: 0.692,
    lacunarity: 1.841,
    surfaceTypes: ['dirt', 'wood', 'crystal', 'ice'],
    obstacleDensity: 0.240,
    friction: 0.330,
    heightProfile: [113.0, 120.767, 127.773, 133.968, 139.343, 143.928, 147.781, 150.981, 153.618, 155.781, 157.551, 158.99, 160.138, 161.008, 161.585, 161.827, 161.675, 161.052, 159.88, 158.081, 155.595, 152.381, 148.431, 143.772, 138.47, 132.629, 126.389, 119.92, 113.413, 107.069, 101.09, 95.664, 90.957, 87.097, 84.173, 82.222, 81.234, 81.145, 81.848, 83.197, 85.015, 87.111, 89.287, 91.357, 93.156, 94.549, 95.446, 95.803, 95.627, 94.973, 93.941, 92.671, 91.33, 90.099, 89.166, 88.706, 88.876, 89.798, 91.554, 94.181, 97.667, 101.952, 106.935, 112.478, 118.414, 124.563, 130.74, 136.765, 142.478, 147.744, 152.46, 156.563, 160.023, 162.85, 165.082, 166.783, 168.031, 168.91, 169.501, 169.871, 170.068, 170.114, 170.0, 169.69, 169.122, 168.212, 166.862, 164.971, 162.443, 159.201, 155.192, 150.4, 144.848, 138.608, 131.792, 124.56, 117.104, 109.649, 102.432, 95.697, 89.68, 84.591, 80.608, 77.863, 76.434, 76.342, 77.548, 79.957, 83.421, 87.751, 92.726, 98.105, 103.643, 109.105, 114.274, 118.967, 123.042, 126.402, 128.999, 130.828],
  },
};

const OBSTACLE_DENSITY_MAPS = {
  tundra: [
    [0.52, 0.833, 0.233, 0.593, 0.814, 0.36, 0.055, 0.944, 0.487, 0.845, 0.794, 0.402, 0.285, 0.059, 0.917, 0.502, 0.697, 0.75, 0.246, 0.011, 0.824, 0.181, 0.655, 0.121, 0.075, 0.308, 0.017, 0.897, 0.785, 0.997, 0.319, 0.962, 0.183, 0.692, 0.798, 0.429, 0.239, 0.098, 0.983, 0.023, 0.209, 0.625, 0.477, 0.012, 0.259, 0.713, 0.168, 0.236, 0.754, 0.092, 0.492, 0.902, 0.927, 0.733, 0.503, 0.482, 0.57, 0.689, 0.521, 0.327, 0.578, 0.862, 0.474, 0.442, 0.687, 0.562, 0.431, 0.935, 0.617, 0.069, 0.2, 0.098, 0.612, 0.36, 0.165, 0.999, 0.992, 0.571, 0.732, 0.947],
  ],
  savanna: [
    [0.76, 0.242, 0.787, 0.909, 0.335, 0.62, 0.852, 0.713, 0.679, 0.764, 0.107, 0.125, 0.079, 0.707, 0.552, 0.861, 0.333, 0.322, 0.311, 0.492, 0.308, 0.524, 0.835, 0.252, 0.41, 0.923, 0.669, 0.13, 0.699, 0.551, 0.962, 0.932, 0.854, 0.885, 0.644, 0.878, 0.535, 0.447, 0.061, 0.584, 0.213, 0.742, 0.267, 0.914, 0.731, 0.958, 0.815, 0.603, 0.081, 0.852, 0.033, 0.756, 0.327, 0.248, 0.902, 0.411, 0.102, 0.262, 0.473, 0.679, 0.893, 0.476, 0.392, 0.76, 0.575, 0.476, 0.845, 0.818, 0.287, 0.198, 0.275, 0.95, 0.041, 0.672, 0.214, 0.719, 0.748, 0.181, 0.203, 0.326],
  ],
  rainforest: [
    [0.986, 0.279, 0.44, 0.85, 0.113, 0.497, 0.97, 0.012, 0.255, 0.789, 0.597, 0.243, 0.949, 0.693, 0.272, 0.379, 0.222, 0.655, 0.448, 0.819, 0.791, 0.723, 0.512, 0.538, 0.773, 0.582, 0.513, 0.081, 0.285, 0.765, 0.936, 0.091, 0.374, 0.864, 0.272, 0.617, 0.237, 0.912, 0.188, 0.87, 0.356, 0.185, 0.568, 0.207, 0.916, 0.488, 0.259, 0.261, 0.202, 0.504, 0.229, 0.113, 0.564, 0.055, 0.738, 0.252, 0.245, 0.181, 0.742, 0.663, 0.37, 0.572, 0.959, 0.039, 0.449, 0.833, 0.481, 0.1, 0.836, 0.991, 0.591, 0.225, 0.801, 0.526, 0.405, 0.713, 0.635, 0.927, 0.188, 0.645],
  ],
  mesa: [
    [0.042, 0.264, 0.853, 0.756, 0.598, 0.138, 0.425, 0.109, 0.411, 0.579, 0.419, 0.925, 0.995, 0.328, 0.918, 0.253, 0.481, 0.79, 0.831, 0.017, 0.233, 0.228, 0.843, 0.238, 0.868, 0.684, 0.087, 0.815, 0.681, 0.582, 0.96, 0.981, 0.605, 0.257, 0.391, 0.896, 0.029, 0.975, 0.634, 0.304, 0.949, 0.353, 0.987, 0.944, 0.718, 0.601, 0.031, 0.89, 0.626, 0.4, 0.095, 0.929, 0.122, 0.939, 0.06, 0.918, 0.801, 0.987, 0.277, 0.78, 0.921, 0.587, 0.635, 0.125, 0.033, 0.28, 0.095, 0.178, 0.472, 0.532, 0.297, 0.999, 0.134, 0.08, 0.888, 0.108, 0.886, 0.152, 0.407, 0.983],
  ],
  swamp: [
    [0.359, 0.947, 0.421, 0.917, 0.298, 0.057, 0.001, 0.124, 0.231, 0.438, 0.347, 0.968, 0.2, 0.309, 0.764, 0.857, 0.515, 0.638, 0.568, 0.594, 0.524, 0.863, 0.56, 0.054, 0.832, 0.343, 0.296, 0.019, 0.964, 0.112, 0.034, 0.633, 0.362, 0.341, 0.784, 0.787, 0.529, 0.383, 0.993, 0.836, 0.843, 0.753, 0.186, 0.962, 0.412, 0.874, 0.354, 0.606, 0.447, 0.992, 0.286, 0.056, 0.24, 0.872, 0.312, 0.346, 0.454, 0.769, 0.381, 0.551, 0.307, 0.517, 0.717, 0.642, 0.805, 0.693, 0.862, 0.237, 0.25, 0.85, 0.92, 0.201, 0.165, 0.3, 0.705, 0.325, 0.577, 0.252, 0.524, 0.54],
  ],
  glacier: [
    [0.186, 0.19, 0.63, 0.873, 0.783, 0.336, 0.962, 0.759, 0.953, 0.448, 0.605, 0.584, 0.032, 0.528, 0.322, 0.735, 0.772, 0.021, 0.079, 0.963, 0.87, 0.668, 0.958, 0.698, 0.264, 0.616, 0.237, 0.296, 0.421, 0.94, 0.124, 0.063, 0.166, 0.95, 0.199, 0.302, 0.217, 0.108, 0.33, 0.352, 0.413, 0.638, 0.354, 0.828, 0.043, 0.759, 0.876, 0.307, 0.168, 0.31, 0.202, 0.367, 0.394, 0.665, 0.257, 0.292, 0.94, 0.426, 0.595, 0.808, 0.653, 0.64, 0.191, 0.445, 0.963, 0.902, 0.688, 0.716, 0.474, 0.296, 0.995, 0.456, 0.829, 0.99, 0.171, 0.069, 0.498, 0.947, 0.006, 0.104],
  ],
  bayou: [
    [0.094, 0.886, 0.64, 0.977, 0.193, 0.919, 0.074, 0.886, 0.606, 0.71, 0.276, 0.994, 0.71, 0.574, 0.341, 0.82, 0.713, 0.154, 0.817, 0.474, 0.311, 0.975, 0.371, 0.134, 0.238, 0.807, 0.197, 0.208, 0.847, 0.517, 0.355, 0.366, 0.543, 0.119, 0.193, 0.849, 0.726, 0.492, 0.145, 0.353, 0.01, 0.832, 0.933, 0.945, 0.013, 0.999, 0.414, 0.314, 0.864, 0.931, 0.442, 0.249, 0.65, 0.758, 0.362, 0.599, 0.494, 0.07, 0.059, 0.805, 0.345, 0.645, 0.562, 0.006, 0.968, 0.083, 0.887, 0.199, 0.593, 0.417, 0.785, 0.026, 0.833, 0.241, 0.791, 0.668, 0.965, 0.977, 0.903, 0.037],
  ],
  highlands: [
    [0.679, 0.677, 0.137, 0.52, 0.439, 0.293, 0.975, 0.291, 0.015, 0.876, 0.431, 0.533, 0.357, 0.98, 0.047, 0.403, 0.779, 0.049, 0.429, 0.407, 0.681, 0.29, 0.468, 0.841, 0.908, 0.507, 0.186, 0.605, 0.097, 0.375, 0.709, 0.912, 0.356, 0.76, 0.583, 0.838, 0.519, 0.79, 0.868, 0.277, 0.993, 0.294, 0.626, 0.195, 0.1, 0.488, 0.929, 0.482, 0.281, 0.769, 0.75, 0.596, 0.552, 0.64, 0.312, 0.79, 0.292, 0.183, 0.395, 0.99, 0.958, 0.784, 0.276, 0.404, 0.771, 0.275, 0.94, 0.074, 0.138, 0.611, 0.695, 0.701, 0.915, 0.2, 0.698, 0.981, 0.796, 0.467, 0.519, 0.133],
  ],
  steppe: [
    [0.168, 0.957, 0.813, 0.584, 0.846, 0.195, 0.656, 0.714, 0.648, 0.676, 0.369, 0.974, 0.653, 0.281, 0.129, 0.942, 0.187, 0.775, 0.562, 0.346, 0.239, 0.334, 0.271, 0.613, 0.876, 0.232, 0.691, 0.375, 0.219, 0.386, 0.624, 0.658, 0.349, 0.301, 0.687, 0.998, 0.872, 0.569, 0.801, 0.179, 0.088, 0.59, 0.283, 0.156, 0.146, 0.635, 0.073, 0.933, 0.304, 0.836, 0.489, 0.097, 0.289, 0.668, 0.443, 0.644, 0.17, 0.77, 0.079, 0.129, 0.791, 0.456, 0.813, 0.152, 0.064, 0.492, 0.138, 0.047, 0.365, 0.739, 0.182, 0.343, 0.537, 0.909, 0.368, 0.772, 0.262, 0.327, 0.44, 0.35],
  ],
  taiga: [
    [0.714, 0.462, 0.53, 0.34, 0.932, 0.344, 0.702, 0.145, 0.579, 0.546, 0.273, 0.788, 0.061, 0.153, 0.524, 0.208, 0.475, 0.937, 0.257, 0.542, 0.665, 0.31, 0.51, 0.187, 0.925, 0.689, 0.157, 0.183, 0.175, 0.302, 0.728, 0.801, 0.873, 0.7, 0.745, 0.709, 0.739, 0.091, 0.385, 0.283, 0.532, 0.306, 0.374, 0.505, 0.573, 0.208, 0.866, 0.239, 0.051, 0.099, 0.406, 0.297, 0.671, 0.357, 0.903, 0.858, 0.473, 0.139, 0.854, 0.62, 0.196, 0.686, 0.721, 0.194, 0.166, 0.006, 0.514, 0.899, 0.975, 0.414, 0.44, 0.727, 0.436, 0.744, 0.996, 0.037, 0.955, 0.86, 0.341, 0.88],
  ],
};

const TERRAIN_COLOR_PALETTES = {
  tundra: ['#5b4889', '#e04962', '#ce3bfa', '#ccaa4e', '#b1c441', '#48093b', '#256d53', '#43d762'],
  savanna: ['#9ce286', '#5dd127', '#403425', '#ad788e', '#8909b0', '#87a9a3', '#682f75', '#b97b84'],
  rainforest: ['#8715b5', '#600c93', '#6a0efb', '#8a574f', '#ea4a97', '#2dba71', '#0c88fa', '#09ff31'],
  mesa: ['#b5698b', '#989689', '#3b68b1', '#789b10', '#baa521', '#df4f79', '#86f102', '#ca1fbb'],
  swamp: ['#24f4cf', '#509cd6', '#6e1dea', '#e5ce31', '#088405', '#4c8d1f', '#1b53a0', '#57e463'],
  glacier: ['#57a7fe', '#b62e2c', '#8b07d2', '#dd960b', '#f20e2a', '#2e3d95', '#eb0cf1', '#8821da'],
  bayou: ['#64ad3c', '#d951f8', '#844ef0', '#158a0f', '#1239d8', '#a868da', '#e31143', '#42fdf5'],
  highlands: ['#a24fec', '#d2dc9d', '#b35b0a', '#474b43', '#760c39', '#f5437a', '#0f94d1', '#353ae9'],
  steppe: ['#30d9dc', '#ad2c08', '#4ee2b0', '#95cb1c', '#70371b', '#02cbae', '#fa3c8b', '#86dafb'],
  taiga: ['#de8bba', '#04111d', '#d6b8da', '#ee5f37', '#f0fab4', '#0dbf85', '#c57627', '#7957e6'],
};

const TERRAIN_PARALLAX_EXTENDED = {
  tundra: [
    { id: "tundra_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#eefaef", opacity: 0.76 },
    { id: "tundra_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#3293bc", opacity: 0.78 },
    { id: "tundra_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#b354de", opacity: 0.69 },
    { id: "tundra_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#04b7be", opacity: 0.53 },
    { id: "tundra_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#eeebb1", opacity: 0.96 },
  ],
  savanna: [
    { id: "savanna_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#edfdfa", opacity: 0.34 },
    { id: "savanna_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#024374", opacity: 0.61 },
    { id: "savanna_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#9cc087", opacity: 0.73 },
    { id: "savanna_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#6b2491", opacity: 0.86 },
    { id: "savanna_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#23f594", opacity: 0.57 },
  ],
  rainforest: [
    { id: "rainforest_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#da6d5a", opacity: 0.84 },
    { id: "rainforest_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#93e962", opacity: 0.77 },
    { id: "rainforest_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#e860b2", opacity: 0.34 },
    { id: "rainforest_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#7f98b4", opacity: 0.83 },
    { id: "rainforest_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#031278", opacity: 0.62 },
  ],
  mesa: [
    { id: "mesa_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#dd5631", opacity: 0.9 },
    { id: "mesa_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#d3a356", opacity: 0.85 },
    { id: "mesa_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#294d45", opacity: 0.53 },
    { id: "mesa_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#87449a", opacity: 0.67 },
    { id: "mesa_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#e1540a", opacity: 0.31 },
  ],
  swamp: [
    { id: "swamp_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#4789c5", opacity: 0.67 },
    { id: "swamp_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#a31dc0", opacity: 0.76 },
    { id: "swamp_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#7bbf48", opacity: 0.76 },
    { id: "swamp_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#af6452", opacity: 0.97 },
    { id: "swamp_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#2e26fa", opacity: 0.98 },
  ],
  glacier: [
    { id: "glacier_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#10289b", opacity: 0.64 },
    { id: "glacier_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#c42a68", opacity: 0.46 },
    { id: "glacier_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#84ff9e", opacity: 0.71 },
    { id: "glacier_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#8db04c", opacity: 0.77 },
    { id: "glacier_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#9408ac", opacity: 0.79 },
  ],
  bayou: [
    { id: "bayou_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#b93ff5", opacity: 0.3 },
    { id: "bayou_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#51f928", opacity: 0.95 },
    { id: "bayou_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#36c1b3", opacity: 0.66 },
    { id: "bayou_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#50c1b4", opacity: 0.42 },
    { id: "bayou_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#89e3fc", opacity: 0.34 },
  ],
  highlands: [
    { id: "highlands_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#92000d", opacity: 0.42 },
    { id: "highlands_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#be0e69", opacity: 0.59 },
    { id: "highlands_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#d3a046", opacity: 0.37 },
    { id: "highlands_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#96d195", opacity: 0.89 },
    { id: "highlands_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#1ae0bd", opacity: 0.63 },
  ],
  steppe: [
    { id: "steppe_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#84771c", opacity: 0.62 },
    { id: "steppe_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#cfd9e1", opacity: 0.92 },
    { id: "steppe_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#5b96de", opacity: 0.46 },
    { id: "steppe_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#02c854", opacity: 0.99 },
    { id: "steppe_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#d8517c", opacity: 0.95 },
  ],
  taiga: [
    { id: "taiga_layer_0", parallaxX: 0.05, parallaxY: 0.0, color: "#452a4d", opacity: 0.7 },
    { id: "taiga_layer_1", parallaxX: 0.2, parallaxY: 0.02, color: "#b7195b", opacity: 0.44 },
    { id: "taiga_layer_2", parallaxX: 0.35, parallaxY: 0.04, color: "#a14d13", opacity: 0.9 },
    { id: "taiga_layer_3", parallaxX: 0.5, parallaxY: 0.06, color: "#da6619", opacity: 0.71 },
    { id: "taiga_layer_4", parallaxX: 0.65, parallaxY: 0.08, color: "#ca7589", opacity: 0.44 },
  ],
};

const TERRAIN_SEGMENT_PHYSICS = [
  {
    type: 'gravel',
    friction:       0.600,
    restitution:    0.194,
    rollingResist:  0.042,
    dragCoeff:      0.196,
    maxSpeed:       37.7,
    vehicleDamage:  0.082,
    particleType:   'smoke',
    audioSurface:   'gravel_roll',
    tintColor:      "#6d699c",
    snowAccumulation: 0.933,
  },
  {
    type: 'wet_rock',
    friction:       0.926,
    restitution:    0.349,
    rollingResist:  0.131,
    dragCoeff:      0.100,
    maxSpeed:       12.6,
    vehicleDamage:  0.198,
    particleType:   'dust',
    audioSurface:   'wet_rock_roll',
    tintColor:      "#2580e7",
    snowAccumulation: 0.854,
  },
  {
    type: 'dry_rock',
    friction:       0.122,
    restitution:    0.399,
    rollingResist:  0.134,
    dragCoeff:      0.060,
    maxSpeed:       10.7,
    vehicleDamage:  0.044,
    particleType:   'smoke',
    audioSurface:   'dry_rock_roll',
    tintColor:      "#c1b4dd",
    snowAccumulation: 0.411,
  },
  {
    type: 'loose_sand',
    friction:       0.812,
    restitution:    0.385,
    rollingResist:  0.019,
    dragCoeff:      0.053,
    maxSpeed:       16.4,
    vehicleDamage:  0.259,
    particleType:   'smoke',
    audioSurface:   'loose_sand_roll',
    tintColor:      "#0e293e",
    snowAccumulation: 0.523,
  },
  {
    type: 'packed_sand',
    friction:       0.870,
    restitution:    0.443,
    rollingResist:  0.119,
    dragCoeff:      0.043,
    maxSpeed:       28.6,
    vehicleDamage:  0.445,
    particleType:   'spark',
    audioSurface:   'packed_sand_roll',
    tintColor:      "#8e62f4",
    snowAccumulation: 0.298,
  },
  {
    type: 'ice',
    friction:       0.905,
    restitution:    0.485,
    rollingResist:  0.145,
    dragCoeff:      0.113,
    maxSpeed:       13.4,
    vehicleDamage:  0.276,
    particleType:   'smoke',
    audioSurface:   'ice_roll',
    tintColor:      "#590cd3",
    snowAccumulation: 0.528,
  },
  {
    type: 'compacted_ice',
    friction:       0.518,
    restitution:    0.579,
    rollingResist:  0.143,
    dragCoeff:      0.124,
    maxSpeed:       34.0,
    vehicleDamage:  0.217,
    particleType:   'sand',
    audioSurface:   'compacted_ice_roll',
    tintColor:      "#f3f7aa",
    snowAccumulation: 0.656,
  },
  {
    type: 'mud',
    friction:       0.500,
    restitution:    0.164,
    rollingResist:  0.084,
    dragCoeff:      0.026,
    maxSpeed:       35.7,
    vehicleDamage:  0.255,
    particleType:   'sand',
    audioSurface:   'mud_roll',
    tintColor:      "#3ff97b",
    snowAccumulation: 0.757,
  },
  {
    type: 'deep_mud',
    friction:       0.249,
    restitution:    0.226,
    rollingResist:  0.095,
    dragCoeff:      0.198,
    maxSpeed:       20.7,
    vehicleDamage:  0.220,
    particleType:   'dust',
    audioSurface:   'deep_mud_roll',
    tintColor:      "#cc97c4",
    snowAccumulation: 0.354,
  },
  {
    type: 'grass',
    friction:       0.446,
    restitution:    0.437,
    rollingResist:  0.080,
    dragCoeff:      0.025,
    maxSpeed:       17.6,
    vehicleDamage:  0.284,
    particleType:   'sand',
    audioSurface:   'grass_roll',
    tintColor:      "#9acb88",
    snowAccumulation: 0.240,
  },
  {
    type: 'long_grass',
    friction:       0.400,
    restitution:    0.302,
    rollingResist:  0.095,
    dragCoeff:      0.073,
    maxSpeed:       37.5,
    vehicleDamage:  0.341,
    particleType:   'none',
    audioSurface:   'long_grass_roll',
    tintColor:      "#3dbfd2",
    snowAccumulation: 0.762,
  },
  {
    type: 'metal_plate',
    friction:       0.558,
    restitution:    0.482,
    rollingResist:  0.118,
    dragCoeff:      0.063,
    maxSpeed:       17.2,
    vehicleDamage:  0.253,
    particleType:   'sand',
    audioSurface:   'metal_plate_roll',
    tintColor:      "#f9cfdc",
    snowAccumulation: 0.098,
  },
  {
    type: 'wood_plank',
    friction:       0.857,
    restitution:    0.087,
    rollingResist:  0.126,
    dragCoeff:      0.030,
    maxSpeed:       16.0,
    vehicleDamage:  0.334,
    particleType:   'sand',
    audioSurface:   'wood_plank_roll',
    tintColor:      "#fd7677",
    snowAccumulation: 0.065,
  },
  {
    type: 'concrete',
    friction:       0.129,
    restitution:    0.369,
    rollingResist:  0.065,
    dragCoeff:      0.118,
    maxSpeed:       13.9,
    vehicleDamage:  0.430,
    particleType:   'dust',
    audioSurface:   'concrete_roll',
    tintColor:      "#52d1ae",
    snowAccumulation: 0.172,
  },
  {
    type: 'asphalt',
    friction:       0.306,
    restitution:    0.265,
    rollingResist:  0.104,
    dragCoeff:      0.119,
    maxSpeed:       23.8,
    vehicleDamage:  0.139,
    particleType:   'spark',
    audioSurface:   'asphalt_roll',
    tintColor:      "#95c9af",
    snowAccumulation: 0.609,
  },
  {
    type: 'rubber',
    friction:       0.413,
    restitution:    0.443,
    rollingResist:  0.035,
    dragCoeff:      0.039,
    maxSpeed:       35.4,
    vehicleDamage:  0.382,
    particleType:   'smoke',
    audioSurface:   'rubber_roll',
    tintColor:      "#7d683f",
    snowAccumulation: 0.403,
  },
  {
    type: 'carpet',
    friction:       0.940,
    restitution:    0.127,
    rollingResist:  0.021,
    dragCoeff:      0.083,
    maxSpeed:       13.0,
    vehicleDamage:  0.393,
    particleType:   'smoke',
    audioSurface:   'carpet_roll',
    tintColor:      "#28f24c",
    snowAccumulation: 0.009,
  },
  {
    type: 'glass',
    friction:       0.490,
    restitution:    0.523,
    rollingResist:  0.032,
    dragCoeff:      0.037,
    maxSpeed:       11.5,
    vehicleDamage:  0.467,
    particleType:   'smoke',
    audioSurface:   'glass_roll',
    tintColor:      "#bb94dd",
    snowAccumulation: 0.569,
  },
  {
    type: 'lava_crust',
    friction:       0.849,
    restitution:    0.150,
    rollingResist:  0.141,
    dragCoeff:      0.075,
    maxSpeed:       20.1,
    vehicleDamage:  0.068,
    particleType:   'ice_chip',
    audioSurface:   'lava_crust_roll',
    tintColor:      "#ddbf07",
    snowAccumulation: 0.048,
  },
  {
    type: 'snow',
    friction:       0.872,
    restitution:    0.277,
    rollingResist:  0.102,
    dragCoeff:      0.155,
    maxSpeed:       28.0,
    vehicleDamage:  0.449,
    particleType:   'dust',
    audioSurface:   'snow_roll',
    tintColor:      "#96b8d8",
    snowAccumulation: 0.021,
  },
  {
    type: 'deep_snow',
    friction:       0.818,
    restitution:    0.455,
    rollingResist:  0.120,
    dragCoeff:      0.131,
    maxSpeed:       23.6,
    vehicleDamage:  0.370,
    particleType:   'mud_splatter',
    audioSurface:   'deep_snow_roll',
    tintColor:      "#e8c8bb",
    snowAccumulation: 0.877,
  },
];

const SURFACE_TEXTURE_DATA = {
  'gravel': {
    tileSize: 63,
    bumpScale: 1.533,
    shininess: 0.614,
    normalMap: 'gravel_normal.png',
    diffuseMap: 'gravel_diffuse.png',
    specularMap: 'gravel_spec.png',
  },
  'wet_rock': {
    tileSize: 122,
    bumpScale: 0.240,
    shininess: 0.779,
    normalMap: 'wet_rock_normal.png',
    diffuseMap: 'wet_rock_diffuse.png',
    specularMap: 'wet_rock_spec.png',
  },
  'dry_rock': {
    tileSize: 28,
    bumpScale: 0.913,
    shininess: 0.333,
    normalMap: 'dry_rock_normal.png',
    diffuseMap: 'dry_rock_diffuse.png',
    specularMap: 'dry_rock_spec.png',
  },
  'loose_sand': {
    tileSize: 117,
    bumpScale: 1.199,
    shininess: 0.848,
    normalMap: 'loose_sand_normal.png',
    diffuseMap: 'loose_sand_diffuse.png',
    specularMap: 'loose_sand_spec.png',
  },
  'packed_sand': {
    tileSize: 121,
    bumpScale: 1.267,
    shininess: 0.956,
    normalMap: 'packed_sand_normal.png',
    diffuseMap: 'packed_sand_diffuse.png',
    specularMap: 'packed_sand_spec.png',
  },
  'ice': {
    tileSize: 108,
    bumpScale: 1.804,
    shininess: 0.520,
    normalMap: 'ice_normal.png',
    diffuseMap: 'ice_diffuse.png',
    specularMap: 'ice_spec.png',
  },
  'compacted_ice': {
    tileSize: 64,
    bumpScale: 1.437,
    shininess: 0.976,
    normalMap: 'compacted_ice_normal.png',
    diffuseMap: 'compacted_ice_diffuse.png',
    specularMap: 'compacted_ice_spec.png',
  },
  'mud': {
    tileSize: 44,
    bumpScale: 1.733,
    shininess: 0.541,
    normalMap: 'mud_normal.png',
    diffuseMap: 'mud_diffuse.png',
    specularMap: 'mud_spec.png',
  },
  'deep_mud': {
    tileSize: 37,
    bumpScale: 0.667,
    shininess: 0.204,
    normalMap: 'deep_mud_normal.png',
    diffuseMap: 'deep_mud_diffuse.png',
    specularMap: 'deep_mud_spec.png',
  },
  'grass': {
    tileSize: 98,
    bumpScale: 1.739,
    shininess: 0.135,
    normalMap: 'grass_normal.png',
    diffuseMap: 'grass_diffuse.png',
    specularMap: 'grass_spec.png',
  },
  'long_grass': {
    tileSize: 25,
    bumpScale: 0.503,
    shininess: 0.263,
    normalMap: 'long_grass_normal.png',
    diffuseMap: 'long_grass_diffuse.png',
    specularMap: 'long_grass_spec.png',
  },
  'metal_plate': {
    tileSize: 121,
    bumpScale: 1.258,
    shininess: 0.180,
    normalMap: 'metal_plate_normal.png',
    diffuseMap: 'metal_plate_diffuse.png',
    specularMap: 'metal_plate_spec.png',
  },
  'wood_plank': {
    tileSize: 86,
    bumpScale: 1.402,
    shininess: 0.442,
    normalMap: 'wood_plank_normal.png',
    diffuseMap: 'wood_plank_diffuse.png',
    specularMap: 'wood_plank_spec.png',
  },
  'concrete': {
    tileSize: 28,
    bumpScale: 0.412,
    shininess: 0.871,
    normalMap: 'concrete_normal.png',
    diffuseMap: 'concrete_diffuse.png',
    specularMap: 'concrete_spec.png',
  },
  'asphalt': {
    tileSize: 108,
    bumpScale: 1.365,
    shininess: 0.533,
    normalMap: 'asphalt_normal.png',
    diffuseMap: 'asphalt_diffuse.png',
    specularMap: 'asphalt_spec.png',
  },
  'rubber': {
    tileSize: 78,
    bumpScale: 1.858,
    shininess: 0.422,
    normalMap: 'rubber_normal.png',
    diffuseMap: 'rubber_diffuse.png',
    specularMap: 'rubber_spec.png',
  },
  'carpet': {
    tileSize: 39,
    bumpScale: 1.650,
    shininess: 0.244,
    normalMap: 'carpet_normal.png',
    diffuseMap: 'carpet_diffuse.png',
    specularMap: 'carpet_spec.png',
  },
  'glass': {
    tileSize: 105,
    bumpScale: 1.839,
    shininess: 0.589,
    normalMap: 'glass_normal.png',
    diffuseMap: 'glass_diffuse.png',
    specularMap: 'glass_spec.png',
  },
  'lava_crust': {
    tileSize: 30,
    bumpScale: 0.958,
    shininess: 0.975,
    normalMap: 'lava_crust_normal.png',
    diffuseMap: 'lava_crust_diffuse.png',
    specularMap: 'lava_crust_spec.png',
  },
  'snow': {
    tileSize: 91,
    bumpScale: 1.517,
    shininess: 0.550,
    normalMap: 'snow_normal.png',
    diffuseMap: 'snow_diffuse.png',
    specularMap: 'snow_spec.png',
  },
  'deep_snow': {
    tileSize: 34,
    bumpScale: 1.900,
    shininess: 0.772,
    normalMap: 'deep_snow_normal.png',
    diffuseMap: 'deep_snow_diffuse.png',
    specularMap: 'deep_snow_spec.png',
  },
};

const PROCEDURAL_TERRAIN_PRESETS = [
  {
    id: 'rolling_hills',
    seed: 85106,
    amplitude: 190.27,
    frequency: 0.0097,
    octaves: 6,
    persistence: 0.648,
    lacunarity: 2.822,
    heightOffset: 68.40,
    clampMin: 19,
    clampMax: 655,
    warpStrength: 0.278,
    warpFrequency: 0.0588,
  },
  {
    id: 'steep_mountains',
    seed: 34132,
    amplitude: 22.81,
    frequency: 0.0062,
    octaves: 8,
    persistence: 0.668,
    lacunarity: 2.140,
    heightOffset: 60.29,
    clampMin: 1,
    clampMax: 305,
    warpStrength: 0.482,
    warpFrequency: 0.0304,
  },
  {
    id: 'flat_plains',
    seed: 96281,
    amplitude: 81.46,
    frequency: 0.0045,
    octaves: 6,
    persistence: 0.413,
    lacunarity: 2.492,
    heightOffset: -38.94,
    clampMin: 13,
    clampMax: 294,
    warpStrength: 0.000,
    warpFrequency: 0.0244,
  },
  {
    id: 'canyon',
    seed: 86297,
    amplitude: 58.13,
    frequency: 0.0040,
    octaves: 7,
    persistence: 0.589,
    lacunarity: 2.944,
    heightOffset: 40.92,
    clampMin: 18,
    clampMax: 556,
    warpStrength: 0.033,
    warpFrequency: 0.0508,
  },
  {
    id: 'volcano_slope',
    seed: 61410,
    amplitude: 85.59,
    frequency: 0.0151,
    octaves: 6,
    persistence: 0.600,
    lacunarity: 2.143,
    heightOffset: -36.02,
    clampMin: 10,
    clampMax: 535,
    warpStrength: 0.218,
    warpFrequency: 0.0511,
  },
  {
    id: 'ocean_floor',
    seed: 36813,
    amplitude: 88.90,
    frequency: 0.0082,
    octaves: 3,
    persistence: 0.544,
    lacunarity: 1.953,
    heightOffset: -11.73,
    clampMin: 13,
    clampMax: 767,
    warpStrength: 0.035,
    warpFrequency: 0.0687,
  },
  {
    id: 'arctic_tundra',
    seed: 56614,
    amplitude: 188.44,
    frequency: 0.0176,
    octaves: 8,
    persistence: 0.516,
    lacunarity: 2.294,
    heightOffset: 24.49,
    clampMin: 4,
    clampMax: 612,
    warpStrength: 0.203,
    warpFrequency: 0.0337,
  },
  {
    id: 'jungle_floor',
    seed: 72937,
    amplitude: 139.99,
    frequency: 0.0113,
    octaves: 3,
    persistence: 0.468,
    lacunarity: 2.211,
    heightOffset: -18.59,
    clampMin: 4,
    clampMax: 534,
    warpStrength: 0.143,
    warpFrequency: 0.0337,
  },
  {
    id: 'desert_dunes',
    seed: 7907,
    amplitude: 69.03,
    frequency: 0.0076,
    octaves: 5,
    persistence: 0.678,
    lacunarity: 2.019,
    heightOffset: 38.02,
    clampMin: 17,
    clampMax: 696,
    warpStrength: 0.393,
    warpFrequency: 0.0777,
  },
  {
    id: 'cave_ceiling',
    seed: 24033,
    amplitude: 190.68,
    frequency: 0.0159,
    octaves: 3,
    persistence: 0.720,
    lacunarity: 2.641,
    heightOffset: 72.08,
    clampMin: 18,
    clampMax: 600,
    warpStrength: 0.238,
    warpFrequency: 0.0423,
  },
  {
    id: 'space_asteroid',
    seed: 79325,
    amplitude: 152.99,
    frequency: 0.0033,
    octaves: 7,
    persistence: 0.448,
    lacunarity: 2.320,
    heightOffset: 43.36,
    clampMin: 11,
    clampMax: 286,
    warpStrength: 0.286,
    warpFrequency: 0.0209,
  },
  {
    id: 'crystal_field',
    seed: 53545,
    amplitude: 56.54,
    frequency: 0.0060,
    octaves: 4,
    persistence: 0.643,
    lacunarity: 2.764,
    heightOffset: -10.10,
    clampMin: 0,
    clampMax: 659,
    warpStrength: 0.305,
    warpFrequency: 0.0684,
  },
];

const TERRAIN_CHUNK_SIZE = 512;
const TERRAIN_CHUNK_OVERLAP = 32;

class TerrainChunk {
  constructor(chunkX, preset) {
    this.chunkX   = chunkX;
    this.preset   = preset;
    this.points   = [];
    this.obstacles= [];
    this.loaded   = false;
    this.dirty    = false;
  }

  generate(seed) {
    const p = PROCEDURAL_TERRAIN_PRESETS.find(pr => pr.id === this.preset)
           || PROCEDURAL_TERRAIN_PRESETS[0];
    const step = 16;
    const count = Math.ceil(TERRAIN_CHUNK_SIZE / step) + 1;
    this.points = [];
    for (let i = 0; i < count; i++) {
      const wx = this.chunkX * TERRAIN_CHUNK_SIZE + i * step;
      const h  = this._noise(wx, p, seed);
      this.points.push({ x: wx, y: h });
    }
    this.loaded = true;
  }

  _noise(x, p, seed) {
    let val = 0, amp = p.amplitude, freq = p.frequency;
    const s = (seed || 12345) * 0.001;
    for (let o = 0; o < p.octaves; o++) {
      val  += Math.sin(x * freq + s * (o + 1)) * amp;
      val  += Math.cos(x * freq * 1.3 + s * (o + 2)) * amp * 0.5;
      amp  *= p.persistence;
      freq *= p.lacunarity;
    }
    return Math.max(p.clampMin, Math.min(p.clampMax, val + p.heightOffset));
  }

  getHeightAt(wx) {
    const localX = wx - this.chunkX * TERRAIN_CHUNK_SIZE;
    if (localX < 0 || localX > TERRAIN_CHUNK_SIZE) return 0;
    const step   = 16;
    const idx    = localX / step;
    const i0     = Math.floor(idx);
    const i1     = Math.min(i0 + 1, this.points.length - 1);
    const t      = idx - i0;
    if (!this.points[i0] || !this.points[i1]) return 0;
    return this.points[i0].y + (this.points[i1].y - this.points[i0].y) * t;
  }

  serialize() {
    return { chunkX: this.chunkX, preset: this.preset, points: this.points };
  }

  static deserialize(data) {
    const c = new TerrainChunk(data.chunkX, data.preset);
    c.points = data.points;
    c.loaded = true;
    return c;
  }
}

class TerrainChunkManager {
  constructor(preset, seed) {
    this.preset = preset || "rolling_hills";
    this.seed   = seed   || Math.floor(Math.random() * 100000);
    this.chunks = new Map();
    this.loadRadius = 4;
  }

  update(cameraX) {
    const centerChunk = Math.floor(cameraX / TERRAIN_CHUNK_SIZE);
    for (let i = centerChunk - this.loadRadius; i <= centerChunk + this.loadRadius; i++) {
      if (!this.chunks.has(i)) {
        const chunk = new TerrainChunk(i, this.preset);
        chunk.generate(this.seed + i * 7919);
        this.chunks.set(i, chunk);
      }
    }
    // Unload distant chunks
    for (const [key] of this.chunks) {
      if (Math.abs(key - centerChunk) > this.loadRadius + 2) {
        this.chunks.delete(key);
      }
    }
  }

  getHeightAt(wx) {
    const chunkX = Math.floor(wx / TERRAIN_CHUNK_SIZE);
    const chunk  = this.chunks.get(chunkX);
    return chunk ? chunk.getHeightAt(wx) : 0;
  }

  getNormalAt(wx) {
    const EPS = 0.1;
    const h0 = this.getHeightAt(wx - EPS);
    const h1 = this.getHeightAt(wx + EPS);
    const dx = 2 * EPS;
    const dy = h1 - h0;
    const len = Math.sqrt(dx*dx + dy*dy);
    return { nx: -dy/len, ny: dx/len };
  }
}

// Slope-based friction lookup table (angle 0-90 deg, friction 0-1)
const SLOPE_FRICTION_LUT = [
  0.75, // 0°
  0.7499, // 1°
  0.7495, // 2°
  0.749, // 3°
  0.7482, // 4°
  0.7471, // 5°
  0.7459, // 6°
  0.7444, // 7°
  0.7427, // 8°
  0.7408, // 9°
  0.7386, // 10°
  0.7362, // 11°
  0.7336, // 12°
  0.7308, // 13°
  0.7277, // 14°
  0.7244, // 15°
  0.7209, // 16°
  0.7172, // 17°
  0.7133, // 18°
  0.7091, // 19°
  0.7048, // 20°
  0.7002, // 21°
  0.6954, // 22°
  0.6904, // 23°
  0.6852, // 24°
  0.6797, // 25°
  0.6741, // 26°
  0.6683, // 27°
  0.6622, // 28°
  0.656, // 29°
  0.6495, // 30°
  0.6429, // 31°
  0.636, // 32°
  0.629, // 33°
  0.6218, // 34°
  0.6144, // 35°
  0.6068, // 36°
  0.599, // 37°
  0.591, // 38°
  0.5829, // 39°
  0.5745, // 40°
  0.566, // 41°
  0.5574, // 42°
  0.5485, // 43°
  0.5395, // 44°
  0.5303, // 45°
  0.521, // 46°
  0.5115, // 47°
  0.5018, // 48°
  0.492, // 49°
  0.4821, // 50°
  0.472, // 51°
  0.4617, // 52°
  0.4514, // 53°
  0.4408, // 54°
  0.4302, // 55°
  0.4194, // 56°
  0.4085, // 57°
  0.3974, // 58°
  0.3863, // 59°
  0.375, // 60°
  0.3636, // 61°
  0.3521, // 62°
  0.3405, // 63°
  0.3288, // 64°
  0.317, // 65°
  0.3051, // 66°
  0.293, // 67°
  0.281, // 68°
  0.2688, // 69°
  0.2565, // 70°
  0.2442, // 71°
  0.2318, // 72°
  0.2193, // 73°
  0.2067, // 74°
  0.1941, // 75°
  0.1814, // 76°
  0.1687, // 77°
  0.1559, // 78°
  0.1431, // 79°
  0.1302, // 80°
  0.1173, // 81°
  0.1044, // 82°
  0.0914, // 83°
  0.0784, // 84°
  0.0654, // 85°
  0.0523, // 86°
  0.0393, // 87°
  0.0262, // 88°
  0.0131, // 89°
  0.0, // 90°
];

const VEHICLE_TERRAIN_INTERACTION = {
  'jeep': {
    'gravel': { friction: 0.726, damage: 0.100, speed: 0.967 },
    'wet_rock': { friction: 0.814, damage: 0.069, speed: 0.909 },
    'dry_rock': { friction: 0.712, damage: 0.297, speed: 0.702 },
    'loose_sand': { friction: 0.860, damage: 0.056, speed: 0.857 },
    'packed_sand': { friction: 0.773, damage: 0.028, speed: 0.825 },
    'ice': { friction: 0.420, damage: 0.053, speed: 0.887 },
    'compacted_ice': { friction: 0.879, damage: 0.119, speed: 1.182 },
    'mud': { friction: 0.553, damage: 0.226, speed: 0.710 },
    'deep_mud': { friction: 0.317, damage: 0.258, speed: 1.037 },
    'grass': { friction: 0.434, damage: 0.259, speed: 0.987 },
  },
  'monster_truck': {
    'gravel': { friction: 0.162, damage: 0.270, speed: 0.655 },
    'wet_rock': { friction: 0.580, damage: 0.005, speed: 1.059 },
    'dry_rock': { friction: 0.874, damage: 0.097, speed: 0.545 },
    'loose_sand': { friction: 0.668, damage: 0.090, speed: 0.839 },
    'packed_sand': { friction: 0.617, damage: 0.037, speed: 0.647 },
    'ice': { friction: 0.636, damage: 0.299, speed: 0.622 },
    'compacted_ice': { friction: 0.857, damage: 0.005, speed: 0.944 },
    'mud': { friction: 0.826, damage: 0.018, speed: 1.111 },
    'deep_mud': { friction: 0.668, damage: 0.014, speed: 1.013 },
    'grass': { friction: 0.368, damage: 0.217, speed: 1.040 },
  },
  'formula_car': {
    'gravel': { friction: 0.594, damage: 0.291, speed: 0.985 },
    'wet_rock': { friction: 0.552, damage: 0.275, speed: 0.576 },
    'dry_rock': { friction: 0.813, damage: 0.016, speed: 0.669 },
    'loose_sand': { friction: 0.880, damage: 0.254, speed: 0.625 },
    'packed_sand': { friction: 0.581, damage: 0.230, speed: 0.792 },
    'ice': { friction: 0.425, damage: 0.284, speed: 0.999 },
    'compacted_ice': { friction: 0.585, damage: 0.227, speed: 1.192 },
    'mud': { friction: 0.485, damage: 0.165, speed: 1.013 },
    'deep_mud': { friction: 0.702, damage: 0.144, speed: 0.938 },
    'grass': { friction: 0.663, damage: 0.087, speed: 0.849 },
  },
  'buggy': {
    'gravel': { friction: 0.426, damage: 0.043, speed: 0.783 },
    'wet_rock': { friction: 0.905, damage: 0.020, speed: 0.654 },
    'dry_rock': { friction: 0.884, damage: 0.231, speed: 0.919 },
    'loose_sand': { friction: 0.866, damage: 0.086, speed: 0.607 },
    'packed_sand': { friction: 0.189, damage: 0.188, speed: 0.665 },
    'ice': { friction: 0.896, damage: 0.238, speed: 1.191 },
    'compacted_ice': { friction: 0.292, damage: 0.101, speed: 0.669 },
    'mud': { friction: 0.369, damage: 0.052, speed: 0.911 },
    'deep_mud': { friction: 0.772, damage: 0.172, speed: 0.655 },
    'grass': { friction: 0.774, damage: 0.063, speed: 0.974 },
  },
  'tank': {
    'gravel': { friction: 0.503, damage: 0.205, speed: 1.175 },
    'wet_rock': { friction: 0.358, damage: 0.018, speed: 1.042 },
    'dry_rock': { friction: 0.475, damage: 0.261, speed: 0.571 },
    'loose_sand': { friction: 0.797, damage: 0.212, speed: 0.930 },
    'packed_sand': { friction: 0.342, damage: 0.166, speed: 0.775 },
    'ice': { friction: 0.787, damage: 0.093, speed: 1.152 },
    'compacted_ice': { friction: 0.479, damage: 0.243, speed: 0.983 },
    'mud': { friction: 0.415, damage: 0.179, speed: 0.838 },
    'deep_mud': { friction: 0.531, damage: 0.048, speed: 0.862 },
    'grass': { friction: 0.494, damage: 0.056, speed: 1.041 },
  },
  'motorcycle': {
    'gravel': { friction: 0.527, damage: 0.180, speed: 0.872 },
    'wet_rock': { friction: 0.930, damage: 0.074, speed: 0.576 },
    'dry_rock': { friction: 0.818, damage: 0.014, speed: 0.886 },
    'loose_sand': { friction: 0.545, damage: 0.043, speed: 0.715 },
    'packed_sand': { friction: 0.373, damage: 0.265, speed: 0.562 },
    'ice': { friction: 0.521, damage: 0.289, speed: 0.562 },
    'compacted_ice': { friction: 0.283, damage: 0.180, speed: 1.008 },
    'mud': { friction: 0.856, damage: 0.121, speed: 0.882 },
    'deep_mud': { friction: 0.389, damage: 0.145, speed: 0.821 },
    'grass': { friction: 0.383, damage: 0.011, speed: 0.601 },
  },
  'snowmobile': {
    'gravel': { friction: 0.274, damage: 0.255, speed: 1.030 },
    'wet_rock': { friction: 0.857, damage: 0.181, speed: 1.141 },
    'dry_rock': { friction: 0.563, damage: 0.072, speed: 0.598 },
    'loose_sand': { friction: 0.937, damage: 0.039, speed: 0.596 },
    'packed_sand': { friction: 0.872, damage: 0.079, speed: 1.108 },
    'ice': { friction: 0.323, damage: 0.239, speed: 1.157 },
    'compacted_ice': { friction: 0.619, damage: 0.299, speed: 0.856 },
    'mud': { friction: 0.509, damage: 0.099, speed: 0.827 },
    'deep_mud': { friction: 0.225, damage: 0.163, speed: 0.552 },
    'grass': { friction: 0.793, damage: 0.079, speed: 0.772 },
  },
  'hovercraft': {
    'gravel': { friction: 0.267, damage: 0.114, speed: 0.668 },
    'wet_rock': { friction: 0.944, damage: 0.089, speed: 1.141 },
    'dry_rock': { friction: 0.387, damage: 0.278, speed: 1.068 },
    'loose_sand': { friction: 0.897, damage: 0.065, speed: 1.169 },
    'packed_sand': { friction: 0.243, damage: 0.092, speed: 0.866 },
    'ice': { friction: 0.789, damage: 0.078, speed: 0.731 },
    'compacted_ice': { friction: 0.813, damage: 0.236, speed: 1.096 },
    'mud': { friction: 0.675, damage: 0.265, speed: 0.879 },
    'deep_mud': { friction: 0.200, damage: 0.104, speed: 0.945 },
    'grass': { friction: 0.537, damage: 0.205, speed: 1.164 },
  },
};

if (typeof window !== "undefined") {
  window.TERRAIN_HEIGHT_TABLES     = TERRAIN_HEIGHT_TABLES;
  window.OBSTACLE_DENSITY_MAPS     = OBSTACLE_DENSITY_MAPS;
  window.TERRAIN_COLOR_PALETTES    = TERRAIN_COLOR_PALETTES;
  window.TERRAIN_PARALLAX_EXTENDED = TERRAIN_PARALLAX_EXTENDED;
  window.TERRAIN_SEGMENT_PHYSICS   = TERRAIN_SEGMENT_PHYSICS;
  window.SURFACE_TEXTURE_DATA      = SURFACE_TEXTURE_DATA;
  window.PROCEDURAL_TERRAIN_PRESETS = PROCEDURAL_TERRAIN_PRESETS;
  window.TerrainChunk              = TerrainChunk;
  window.TerrainChunkManager       = TerrainChunkManager;
  window.SLOPE_FRICTION_LUT        = SLOPE_FRICTION_LUT;
  window.VEHICLE_TERRAIN_INTERACTION = VEHICLE_TERRAIN_INTERACTION;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_HEIGHT_TABLES, OBSTACLE_DENSITY_MAPS, TERRAIN_COLOR_PALETTES,
    TERRAIN_PARALLAX_EXTENDED, TERRAIN_SEGMENT_PHYSICS, SURFACE_TEXTURE_DATA,
    PROCEDURAL_TERRAIN_PRESETS, TerrainChunk, TerrainChunkManager,
    SLOPE_FRICTION_LUT, VEHICLE_TERRAIN_INTERACTION };
}

})();
// ============================================================
// TERRAIN_PHYSICS_EXTENDED — vehicle-terrain physics tables
// ============================================================
(function() {
'use strict';

// Pacejka Magic Formula tire model coefficients
// F = D * sin(C * atan(B*slip - E*(B*slip - atan(B*slip))))
const TIRE_MODELS = {
  'road': {
    B: 17.6554,  // stiffness factor
    C: 2.3670,  // shape factor
    D: 0.8558,  // peak factor
    E: -0.2850,  // curvature factor
    Bx: 17.4636, // longitudinal B
    Cx: 1.3411, // longitudinal C
    Dx: 1.0579, // longitudinal D
    Ex: -0.1493, // longitudinal E
    radiusMm: 426,
    widthMm: 150,
    mass: 14.79,
    rollingResist: 0.0203,
    contactPatch: 0.0628,  // m^2
  },
  'offroad': {
    B: 15.9511,  // stiffness factor
    C: 1.3509,  // shape factor
    D: 1.0257,  // peak factor
    E: -1.3270,  // curvature factor
    Bx: 16.6932, // longitudinal B
    Cx: 1.8601, // longitudinal C
    Dx: 1.2740, // longitudinal D
    Ex: 0.3173, // longitudinal E
    radiusMm: 387,
    widthMm: 160,
    mass: 11.27,
    rollingResist: 0.0113,
    contactPatch: 0.0379,  // m^2
  },
  'snow': {
    B: 18.0836,  // stiffness factor
    C: 1.8048,  // shape factor
    D: 1.4643,  // peak factor
    E: -0.8105,  // curvature factor
    Bx: 10.2778, // longitudinal B
    Cx: 1.6384, // longitudinal C
    Dx: 0.9769, // longitudinal D
    Ex: 0.2380, // longitudinal E
    radiusMm: 344,
    widthMm: 281,
    mass: 19.42,
    rollingResist: 0.0379,
    contactPatch: 0.0579,  // m^2
  },
  'mud': {
    B: 18.6728,  // stiffness factor
    C: 2.3765,  // shape factor
    D: 0.9046,  // peak factor
    E: -1.2661,  // curvature factor
    Bx: 13.0513, // longitudinal B
    Cx: 1.5413, // longitudinal C
    Dx: 0.9885, // longitudinal D
    Ex: -0.8936, // longitudinal E
    radiusMm: 326,
    widthMm: 287,
    mass: 8.77,
    rollingResist: 0.0316,
    contactPatch: 0.0660,  // m^2
  },
  'sand': {
    B: 19.9720,  // stiffness factor
    C: 2.1344,  // shape factor
    D: 1.1519,  // peak factor
    E: -0.6881,  // curvature factor
    Bx: 10.7291, // longitudinal B
    Cx: 1.3631, // longitudinal C
    Dx: 1.1337, // longitudinal D
    Ex: 0.0022, // longitudinal E
    radiusMm: 402,
    widthMm: 337,
    mass: 24.06,
    rollingResist: 0.0391,
    contactPatch: 0.0567,  // m^2
  },
  'race': {
    B: 15.9608,  // stiffness factor
    C: 1.5766,  // shape factor
    D: 1.2889,  // peak factor
    E: -1.4182,  // curvature factor
    Bx: 11.3361, // longitudinal B
    Cx: 1.3288, // longitudinal C
    Dx: 1.2456, // longitudinal D
    Ex: -0.9539, // longitudinal E
    radiusMm: 325,
    widthMm: 192,
    mass: 22.12,
    rollingResist: 0.0283,
    contactPatch: 0.0391,  // m^2
  },
  'dragster': {
    B: 18.7664,  // stiffness factor
    C: 2.0871,  // shape factor
    D: 0.9314,  // peak factor
    E: 0.5026,  // curvature factor
    Bx: 12.1916, // longitudinal B
    Cx: 1.3090, // longitudinal C
    Dx: 0.9876, // longitudinal D
    Ex: -0.9441, // longitudinal E
    radiusMm: 346,
    widthMm: 224,
    mass: 23.80,
    rollingResist: 0.0265,
    contactPatch: 0.0328,  // m^2
  },
  'all_terrain': {
    B: 16.5688,  // stiffness factor
    C: 1.6344,  // shape factor
    D: 1.1732,  // peak factor
    E: -0.5484,  // curvature factor
    Bx: 13.3412, // longitudinal B
    Cx: 1.8919, // longitudinal C
    Dx: 1.1756, // longitudinal D
    Ex: 0.1687, // longitudinal E
    radiusMm: 403,
    widthMm: 195,
    mass: 23.47,
    rollingResist: 0.0270,
    contactPatch: 0.0788,  // m^2
  },
};

const SUSPENSION_MODELS = {
  'stock': {
    springRate:   31999,  // N/m
    damperRate:   4922,  // N·s/m
    naturalFreq:  2.072,    // Hz
    dampingRatio: 0.586,
    travel:       0.074,    // m
    preload:      4947,   // N
    antiRollBar:  4839,   // N/m
    bumpStop:     0.017,   // m from end
    reboundRatio: 0.829,
    compressionRatio: 1.086,
  },
  'sport': {
    springRate:   47652,  // N/m
    damperRate:   10272,  // N·s/m
    naturalFreq:  3.982,    // Hz
    dampingRatio: 0.283,
    travel:       0.097,    // m
    preload:      2979,   // N
    antiRollBar:  972,   // N/m
    bumpStop:     0.049,   // m from end
    reboundRatio: 1.312,
    compressionRatio: 1.014,
  },
  'offroad': {
    springRate:   68149,  // N/m
    damperRate:   7930,  // N·s/m
    naturalFreq:  3.993,    // Hz
    dampingRatio: 0.701,
    travel:       0.348,    // m
    preload:      4862,   // N
    antiRollBar:  2867,   // N/m
    bumpStop:     0.020,   // m from end
    reboundRatio: 1.581,
    compressionRatio: 0.579,
  },
  'rally': {
    springRate:   22491,  // N/m
    damperRate:   11462,  // N·s/m
    naturalFreq:  3.070,    // Hz
    dampingRatio: 0.790,
    travel:       0.168,    // m
    preload:      98,   // N
    antiRollBar:  5481,   // N/m
    bumpStop:     0.050,   // m from end
    reboundRatio: 1.265,
    compressionRatio: 0.930,
  },
  'racing': {
    springRate:   21497,  // N/m
    damperRate:   7511,  // N·s/m
    naturalFreq:  3.859,    // Hz
    dampingRatio: 0.286,
    travel:       0.392,    // m
    preload:      16,   // N
    antiRollBar:  4821,   // N/m
    bumpStop:     0.048,   // m from end
    reboundRatio: 1.078,
    compressionRatio: 1.044,
  },
  'lowrider': {
    springRate:   17031,  // N/m
    damperRate:   4513,  // N·s/m
    naturalFreq:  3.167,    // Hz
    dampingRatio: 0.836,
    travel:       0.353,    // m
    preload:      730,   // N
    antiRollBar:  4797,   // N/m
    bumpStop:     0.026,   // m from end
    reboundRatio: 1.261,
    compressionRatio: 0.751,
  },
  'monster': {
    springRate:   62731,  // N/m
    damperRate:   14865,  // N·s/m
    naturalFreq:  1.610,    // Hz
    dampingRatio: 0.712,
    travel:       0.064,    // m
    preload:      584,   // N
    antiRollBar:  4643,   // N/m
    bumpStop:     0.038,   // m from end
    reboundRatio: 1.467,
    compressionRatio: 0.996,
  },
  'hydraulic': {
    springRate:   41020,  // N/m
    damperRate:   2719,  // N·s/m
    naturalFreq:  2.714,    // Hz
    dampingRatio: 0.358,
    travel:       0.271,    // m
    preload:      4733,   // N
    antiRollBar:  953,   // N/m
    bumpStop:     0.030,   // m from end
    reboundRatio: 1.412,
    compressionRatio: 0.557,
  },
};

const AERODYNAMICS_DATA = {
  'stock': {
    Cd:            0.2987,  // drag coefficient
    Cl:            -0.1066,  // lift coefficient
    frontalArea:   1.880,   // m^2
    downforce:     2977,    // N at 100km/h
    dragAtSpeed:   82.35,    // N at 100km/h
    spoilerAngle:  5.3,      // degrees
    coolingFlow:   1.864,
  },
  'aero_kit_1': {
    Cd:            0.7541,  // drag coefficient
    Cl:            0.5488,  // lift coefficient
    frontalArea:   4.103,   // m^2
    downforce:     968,    // N at 100km/h
    dragAtSpeed:   166.79,    // N at 100km/h
    spoilerAngle:  2.7,      // degrees
    coolingFlow:   1.078,
  },
  'aero_kit_2': {
    Cd:            0.5423,  // drag coefficient
    Cl:            -0.0442,  // lift coefficient
    frontalArea:   3.217,   // m^2
    downforce:     1643,    // N at 100km/h
    dragAtSpeed:   165.41,    // N at 100km/h
    spoilerAngle:  35.9,      // degrees
    coolingFlow:   1.518,
  },
  'racing': {
    Cd:            0.4489,  // drag coefficient
    Cl:            0.2041,  // lift coefficient
    frontalArea:   3.599,   // m^2
    downforce:     1357,    // N at 100km/h
    dragAtSpeed:   200.74,    // N at 100km/h
    spoilerAngle:  14.3,      // degrees
    coolingFlow:   1.629,
  },
  'dragster': {
    Cd:            1.1755,  // drag coefficient
    Cl:            0.6948,  // lift coefficient
    frontalArea:   2.310,   // m^2
    downforce:     88,    // N at 100km/h
    dragAtSpeed:   143.78,    // N at 100km/h
    spoilerAngle:  15.0,      // degrees
    coolingFlow:   0.796,
  },
  'suv': {
    Cd:            0.5388,  // drag coefficient
    Cl:            -0.1323,  // lift coefficient
    frontalArea:   3.830,   // m^2
    downforce:     935,    // N at 100km/h
    dragAtSpeed:   109.54,    // N at 100km/h
    spoilerAngle:  38.1,      // degrees
    coolingFlow:   0.840,
  },
  'monster_truck': {
    Cd:            1.0891,  // drag coefficient
    Cl:            -0.1505,  // lift coefficient
    frontalArea:   3.977,   // m^2
    downforce:     343,    // N at 100km/h
    dragAtSpeed:   140.74,    // N at 100km/h
    spoilerAngle:  3.3,      // degrees
    coolingFlow:   1.622,
  },
  'formula': {
    Cd:            0.7341,  // drag coefficient
    Cl:            0.2476,  // lift coefficient
    frontalArea:   4.481,   // m^2
    downforce:     232,    // N at 100km/h
    dragAtSpeed:   138.99,    // N at 100km/h
    spoilerAngle:  13.7,      // degrees
    coolingFlow:   1.951,
  },
};

const DRIVETRAIN_DATA = {
  'rwd': {
    type:            'rwd',
    numGears:        6,
    gearRatios:      [3.109, 2.663, 2.6, 2.25, 2.128, 1.48],
    finalDrive:      3.635,
    differentialType:'open',
    torqueSplit:     { front: 0.006, rear: 0.503 },
    transmission:    'auto',
    shiftTime:       0.375,  // seconds
    clutchSlip:      0.036,
  },
  'fwd': {
    type:            'fwd',
    numGears:        8,
    gearRatios:      [3.412, 2.812, 2.677, 2.551, 1.927, 1.261, 1.049, 0.914],
    finalDrive:      4.681,
    differentialType:'open',
    torqueSplit:     { front: 0.490, rear: 0.814 },
    transmission:    'auto',
    shiftTime:       0.252,  // seconds
    clutchSlip:      0.061,
  },
  'awd': {
    type:            'awd',
    numGears:        5,
    gearRatios:      [1.547, 1.184, 1.019, 1.003, 0.848],
    finalDrive:      5.459,
    differentialType:'open',
    torqueSplit:     { front: 0.005, rear: 0.619 },
    transmission:    'cvt',
    shiftTime:       0.201,  // seconds
    clutchSlip:      0.112,
  },
  '4x4': {
    type:            '4x4',
    numGears:        4,
    gearRatios:      [3.383, 3.279, 2.933, 2.284],
    finalDrive:      5.083,
    differentialType:'open',
    torqueSplit:     { front: 0.205, rear: 0.836 },
    transmission:    'cvt',
    shiftTime:       0.244,  // seconds
    clutchSlip:      0.030,
  },
  'electric_rwd': {
    type:            'electric_rwd',
    numGears:        7,
    gearRatios:      [2.899, 2.323, 2.017, 1.55, 1.424, 1.397, 1.358],
    finalDrive:      4.525,
    differentialType:'lsd',
    torqueSplit:     { front: 0.085, rear: 0.668 },
    transmission:    'auto',
    shiftTime:       0.356,  // seconds
    clutchSlip:      0.141,
  },
  'electric_awd': {
    type:            'electric_awd',
    numGears:        6,
    gearRatios:      [3.347, 3.25, 2.467, 2.188, 1.45, 1.276],
    finalDrive:      4.141,
    differentialType:'lsd',
    torqueSplit:     { front: 0.067, rear: 0.713 },
    transmission:    'cvt',
    shiftTime:       0.272,  // seconds
    clutchSlip:      0.070,
  },
};

// Engine torque curves — [rpm, torqueNm] pairs
const ENGINE_TORQUE_CURVES = {
  '4cyl_na': {
    name:     '4CYL NA',
    redline:  4893,
    idleRpm:  600,
    peakRpm:  3262,
    peakTorque: 898.4,
    curve: [[500, 85.2], [750, 121.9], [1000, 170.3], [1250, 219.4], [1500, 301.7], [1750, 399.6], [2000, 483.5], [2250, 570.2], [2500, 644.3], [2750, 680.8], [3000, 730.0], [3250, 788.4], [3500, 708.3], [3750, 753.9], [4000, 660.1], [4250, 560.8], [4500, 508.8], [4750, 383.6], [5000, 310.1], [5250, 247.6]],
  },
  'v6_turbo': {
    name:     'V6 TURBO',
    redline:  10908,
    idleRpm:  705,
    peakRpm:  8364,
    peakTorque: 737.5,
    curve: [[500, 50], [750, 50], [1000, 55.1], [1250, 63.1], [1500, 77.6], [1750, 89.4], [2000, 99.7], [2250, 113.7], [2500, 132.9], [2750, 159.6], [3000, 179.8], [3250, 190.5], [3500, 214.8], [3750, 255.7], [4000, 259.8], [4250, 308.1], [4500, 321.5], [4750, 366.5], [5000, 382.4], [5250, 385.4], [5500, 448.2], [5750, 471.8], [6000, 494.7], [6250, 527.7], [6500, 516.9], [6750, 574.7], [7000, 572.0], [7250, 582.7], [7500, 602.2], [7750, 633.4], [8000, 654.1], [8250, 591.9], [8500, 657.5], [8750, 627.2], [9000, 630.3], [9250, 609.2], [9500, 611.1], [9750, 590.1], [10000, 531.1], [10250, 515.0], [10500, 535.7], [10750, 505.5], [11000, 434.0], [11250, 431.8]],
  },
  'v8_na': {
    name:     'V8 NA',
    redline:  7601,
    idleRpm:  778,
    peakRpm:  5778,
    peakTorque: 724.5,
    curve: [[500, 50], [750, 60.9], [1000, 71.6], [1250, 88.1], [1500, 114.2], [1750, 136.2], [2000, 169.5], [2250, 203.0], [2500, 216.5], [2750, 262.4], [3000, 303.2], [3250, 322.4], [3500, 401.0], [3750, 403.9], [4000, 447.7], [4250, 497.1], [4500, 512.4], [4750, 582.1], [5000, 614.8], [5250, 617.2], [5500, 618.1], [5750, 649.9], [6000, 624.3], [6250, 636.0], [6500, 556.1], [6750, 546.0], [7000, 548.7], [7250, 500.5], [7500, 464.0], [7750, 448.0], [8000, 398.6]],
  },
  'v8_supercharged': {
    name:     'V8 SUPERCHARGED',
    redline:  10121,
    idleRpm:  813,
    peakRpm:  7537,
    peakTorque: 675.7,
    curve: [[500, 50], [750, 50], [1000, 56.2], [1250, 65.4], [1500, 74.3], [1750, 95.2], [2000, 111.5], [2250, 117.8], [2500, 150.6], [2750, 163.3], [3000, 195.3], [3250, 210.5], [3500, 237.4], [3750, 273.3], [4000, 295.5], [4250, 305.0], [4500, 353.0], [4750, 357.9], [5000, 406.6], [5250, 412.3], [5500, 439.0], [5750, 476.6], [6000, 516.6], [6250, 507.9], [6500, 538.5], [6750, 564.4], [7000, 535.2], [7250, 564.2], [7500, 602.2], [7750, 588.8], [8000, 571.7], [8250, 538.9], [8500, 574.6], [8750, 546.3], [9000, 514.7], [9250, 515.3], [9500, 455.3], [9750, 421.6], [10000, 430.9], [10250, 366.2], [10500, 353.9]],
  },
  'electric': {
    name:     'ELECTRIC',
    redline:  9891,
    idleRpm:  796,
    peakRpm:  7761,
    peakTorque: 620.3,
    curve: [[500, 50], [750, 50], [1000, 50.2], [1250, 57.9], [1500, 70.5], [1750, 77.6], [2000, 92.8], [2250, 113.9], [2500, 119.2], [2750, 135.5], [3000, 171.3], [3250, 174.0], [3500, 216.6], [3750, 237.5], [4000, 252.1], [4250, 286.3], [4500, 310.8], [4750, 348.8], [5000, 356.0], [5250, 381.1], [5500, 386.0], [5750, 437.9], [6000, 433.4], [6250, 450.4], [6500, 478.6], [6750, 516.7], [7000, 491.3], [7250, 526.4], [7500, 544.1], [7750, 519.0], [8000, 542.6], [8250, 508.0], [8500, 517.1], [8750, 525.7], [9000, 496.8], [9250, 469.7], [9500, 432.2], [9750, 429.2], [10000, 417.1], [10250, 364.5]],
  },
  'diesel_inline6': {
    name:     'DIESEL INLINE6',
    redline:  5468,
    idleRpm:  836,
    peakRpm:  3892,
    peakTorque: 352.6,
    curve: [[500, 50], [750, 50], [1000, 56.3], [1250, 70.0], [1500, 86.9], [1750, 118.8], [2000, 139.8], [2250, 162.1], [2500, 209.8], [2750, 229.4], [3000, 242.0], [3250, 275.3], [3500, 300.8], [3750, 299.3], [4000, 294.2], [4250, 307.0], [4500, 290.2], [4750, 272.6], [5000, 233.3], [5250, 193.3], [5500, 167.2], [5750, 153.0]],
  },
  'rotary': {
    name:     'ROTARY',
    redline:  6885,
    idleRpm:  813,
    peakRpm:  4387,
    peakTorque: 365.7,
    curve: [[500, 50], [750, 50], [1000, 50], [1250, 61.3], [1500, 83.3], [1750, 104.5], [2000, 117.0], [2250, 154.6], [2500, 177.5], [2750, 207.5], [3000, 236.0], [3250, 250.7], [3500, 262.5], [3750, 287.4], [4000, 300.3], [4250, 322.0], [4500, 326.3], [4750, 313.4], [5000, 299.7], [5250, 286.7], [5500, 253.7], [5750, 242.1], [6000, 204.9], [6250, 186.4], [6500, 155.8], [6750, 128.1], [7000, 106.4], [7250, 80.4]],
  },
  'flat4_turbo': {
    name:     'FLAT4 TURBO',
    redline:  10252,
    idleRpm:  625,
    peakRpm:  7841,
    peakTorque: 315.4,
    curve: [[500, 50], [750, 50], [1000, 50], [1250, 50], [1500, 50], [1750, 50], [2000, 50], [2250, 57.5], [2500, 59.9], [2750, 69.0], [3000, 79.1], [3250, 91.4], [3500, 103.3], [3750, 111.6], [4000, 123.3], [4250, 133.6], [4500, 157.1], [4750, 158.7], [5000, 179.7], [5250, 185.0], [5500, 193.7], [5750, 203.3], [6000, 232.6], [6250, 234.4], [6500, 238.1], [6750, 241.7], [7000, 269.7], [7250, 263.6], [7500, 258.3], [7750, 254.2], [8000, 261.5], [8250, 250.9], [8500, 268.8], [8750, 249.4], [9000, 261.8], [9250, 247.8], [9500, 245.7], [9750, 215.2], [10000, 204.3], [10250, 205.3], [10500, 196.9], [10750, 180.5]],
  },
  'v12_na': {
    name:     'V12 NA',
    redline:  8671,
    idleRpm:  669,
    peakRpm:  7131,
    peakTorque: 368.0,
    curve: [[500, 50], [750, 50], [1000, 50], [1250, 50], [1500, 50], [1750, 53.5], [2000, 62.9], [2250, 74.8], [2500, 82.6], [2750, 97.0], [3000, 115.4], [3250, 124.8], [3500, 147.0], [3750, 151.6], [4000, 164.7], [4250, 193.2], [4500, 203.0], [4750, 211.2], [5000, 225.6], [5250, 251.7], [5500, 270.7], [5750, 286.7], [6000, 281.5], [6250, 295.8], [6500, 297.3], [6750, 293.1], [7000, 315.0], [7250, 299.5], [7500, 304.6], [7750, 319.0], [8000, 306.4], [8250, 303.9], [8500, 266.3], [8750, 261.3], [9000, 242.4]],
  },
  'w16_turbo': {
    name:     'W16 TURBO',
    redline:  8783,
    idleRpm:  780,
    peakRpm:  5833,
    peakTorque: 302.9,
    curve: [[500, 50], [750, 50], [1000, 50], [1250, 50], [1500, 50], [1750, 58.1], [2000, 70.2], [2250, 78.8], [2500, 90.4], [2750, 108.3], [3000, 120.7], [3250, 142.1], [3500, 147.4], [3750, 166.8], [4000, 184.7], [4250, 194.6], [4500, 217.4], [4750, 234.8], [5000, 240.6], [5250, 262.0], [5500, 247.2], [5750, 266.5], [6000, 258.7], [6250, 266.0], [6500, 244.4], [6750, 224.6], [7000, 231.6], [7250, 206.9], [7500, 205.5], [7750, 184.8], [8000, 173.1], [8250, 149.4], [8500, 135.2], [8750, 118.7], [9000, 99.0], [9250, 89.2]],
  },
};

const BRAKE_SYSTEMS = {
  'drum': {
    maxForce:    12047,   // N
    biasFront:   0.563,
    fadeStart:   339,      // Celsius
    fadeFull:    625,     // Celsius
    heatMass:    13.78,         // kg thermal mass
    coolingRate: 30.7,        // W/K
    absEnabled:  true,
    pressureMap: [0.76, 0.99, 0.4, 0.36, 0.81, 0.72, 0.88, 0.69, 0.69, 0.61],
  },
  'disc_standard': {
    maxForce:    19757,   // N
    biasFront:   0.589,
    fadeStart:   663,      // Celsius
    fadeFull:    895,     // Celsius
    heatMass:    11.70,         // kg thermal mass
    coolingRate: 79.2,        // W/K
    absEnabled:  false,
    pressureMap: [0.93, 0.79, 0.11, 0.54, 0.51, 0.78, 0.7, 0.37, 0.33, 0.72],
  },
  'disc_sport': {
    maxForce:    19112,   // N
    biasFront:   0.718,
    fadeStart:   667,      // Celsius
    fadeFull:    722,     // Celsius
    heatMass:    14.74,         // kg thermal mass
    coolingRate: 46.5,        // W/K
    absEnabled:  true,
    pressureMap: [0.4, 0.82, 0.83, 0.86, 0.41, 0.6, 0.71, 0.78, 0.72, 0.35],
  },
  'carbon_ceramic': {
    maxForce:    4423,   // N
    biasFront:   0.647,
    fadeStart:   355,      // Celsius
    fadeFull:    852,     // Celsius
    heatMass:    13.99,         // kg thermal mass
    coolingRate: 53.2,        // W/K
    absEnabled:  true,
    pressureMap: [0.2, 0.72, 0.93, 0.53, 0.31, 0.56, 0.95, 0.62, 0.7, 0.35],
  },
  'hydraulic_abs': {
    maxForce:    19983,   // N
    biasFront:   0.594,
    fadeStart:   533,      // Celsius
    fadeFull:    780,     // Celsius
    heatMass:    5.47,         // kg thermal mass
    coolingRate: 34.0,        // W/K
    absEnabled:  true,
    pressureMap: [0.81, 0.41, 0.19, 0.45, 0.89, 0.22, 0.16, 0.85, 0.22, 0.26],
  },
  'regen_electric': {
    maxForce:    7688,   // N
    biasFront:   0.611,
    fadeStart:   553,      // Celsius
    fadeFull:    726,     // Celsius
    heatMass:    7.79,         // kg thermal mass
    coolingRate: 38.3,        // W/K
    absEnabled:  false,
    pressureMap: [0.37, 0.1, 0.83, 0.65, 0.21, 0.96, 0.79, 0.43, 0.68, 0.96],
  },
};

const SURFACE_PARTICLE_CONFIGS = {
  'skid': {
    count:     48,
    life:      1.793,
    speed:     5.66,
    spread:    0.904,
    gravity:   2.062,
    size:      19.00,
    sizeDecay: 2.046,
    alphaDecay:0.958,
    color:     "#888",
  },
  'land': {
    count:     8,
    life:      1.547,
    speed:     9.47,
    spread:    1.380,
    gravity:   1.174,
    size:      10.16,
    sizeDecay: 0.955,
    alphaDecay:2.119,
    color:     "#cc9955",
  },
  'dig': {
    count:     21,
    life:      2.456,
    speed:     2.12,
    spread:    0.999,
    gravity:   4.112,
    size:      8.31,
    sizeDecay: 2.802,
    alphaDecay:0.841,
    color:     "#ffffff",
  },
  'splash': {
    count:     19,
    life:      0.304,
    speed:     11.30,
    spread:    0.270,
    gravity:   8.120,
    size:      18.51,
    sizeDecay: 4.063,
    alphaDecay:2.502,
    color:     "#4488ff",
  },
  'gravel_kick': {
    count:     44,
    life:      2.055,
    speed:     9.50,
    spread:    0.479,
    gravity:   -1.037,
    size:      12.75,
    sizeDecay: 3.162,
    alphaDecay:1.989,
    color:     "#bbbbbb",
  },
  'spark': {
    count:     18,
    life:      2.441,
    speed:     6.00,
    spread:    1.030,
    gravity:   -0.209,
    size:      8.43,
    sizeDecay: 3.451,
    alphaDecay:2.677,
    color:     "#ffaa00",
  },
  'dust': {
    count:     45,
    life:      0.986,
    speed:     12.20,
    spread:    0.696,
    gravity:   7.552,
    size:      7.87,
    sizeDecay: 4.725,
    alphaDecay:1.843,
    color:     "#ccbbaa",
  },
  'smoke': {
    count:     29,
    life:      2.383,
    speed:     7.25,
    spread:    1.346,
    gravity:   1.926,
    size:      19.15,
    sizeDecay: 3.702,
    alphaDecay:2.480,
    color:     "#555555",
  },
};

class SkidMarkSystem {
  constructor(maxMarks) {
    this.maxMarks = maxMarks || 500;
    this.marks    = [];
    this.segments = [];  // [{x0,y0,x1,y1,alpha,width,color}]
  }

  addMark(x0, y0, x1, y1, width, slipRatio, surface) {
    const alpha = Math.min(1, slipRatio * 2);
    const cfg   = SURFACE_PARTICLE_CONFIGS.skid;
    const color = "#222211";
    this.segments.push({ x0, y0, x1, y1, alpha, width: width || 8, color });
    if (this.segments.length > this.maxMarks) this.segments.shift();
  }

  update(dt) {
    for (const seg of this.segments) {
      seg.alpha -= dt * 0.02;  // fade over ~50 seconds
    }
    while (this.segments.length > 0 && this.segments[0].alpha <= 0) {
      this.segments.shift();
    }
  }

  draw(ctx, camX, camY) {
    ctx.save();
    ctx.lineCap = "round";
    for (const seg of this.segments) {
      if (seg.alpha <= 0) continue;
      ctx.globalAlpha = seg.alpha;
      ctx.strokeStyle = seg.color;
      ctx.lineWidth   = seg.width;
      ctx.beginPath();
      ctx.moveTo(seg.x0 - camX, seg.y0 - camY);
      ctx.lineTo(seg.x1 - camX, seg.y1 - camY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

class VehicleDirtSystem {
  constructor() {
    this.dirtLevel   = 0;    // 0–1
    this.mudLevel    = 0;    // 0–1
    this.snowLevel   = 0;    // 0–1
    this.sandLevel   = 0;    // 0–1
    this.damageMarks = [];   // [{x,y,size,type}] cosmetic only
  }

  accumulate(surface, dt, vehicleSpeed) {
    const rate = vehicleSpeed * 0.001 * dt;
    switch(surface) {
      case "mud":   this.mudLevel   = Math.min(1, this.mudLevel   + rate * 3); break;
      case "dirt":  this.dirtLevel  = Math.min(1, this.dirtLevel  + rate);     break;
      case "snow":  this.snowLevel  = Math.min(1, this.snowLevel  + rate * 2); break;
      case "sand":  this.sandLevel  = Math.min(1, this.sandLevel  + rate * 1.5); break;
    }
    // Mud slows down engine cooling
    return this.mudLevel * 0.3 + this.dirtLevel * 0.05;
  }

  clean(amount) {
    const clean = amount || 0.2;
    this.dirtLevel  = Math.max(0, this.dirtLevel  - clean);
    this.mudLevel   = Math.max(0, this.mudLevel   - clean * 0.7);
    this.snowLevel  = Math.max(0, this.snowLevel  - clean * 1.2);
    this.sandLevel  = Math.max(0, this.sandLevel  - clean);
  }

  addDamageMark(x, y, size, type) {
    this.damageMarks.push({ x, y, size, type: type || "scratch" });
    if (this.damageMarks.length > 50) this.damageMarks.shift();
  }

  getTotalGriminess() {
    return this.dirtLevel * 0.3 + this.mudLevel * 0.5 + this.snowLevel * 0.1 + this.sandLevel * 0.1;
  }

  getOverlayAlpha() {
    return Math.min(0.8, this.getTotalGriminess());
  }
}

if (typeof window !== "undefined") {
  window.TIRE_MODELS              = TIRE_MODELS;
  window.SUSPENSION_MODELS        = SUSPENSION_MODELS;
  window.AERODYNAMICS_DATA        = AERODYNAMICS_DATA;
  window.DRIVETRAIN_DATA          = DRIVETRAIN_DATA;
  window.ENGINE_TORQUE_CURVES     = ENGINE_TORQUE_CURVES;
  window.BRAKE_SYSTEMS            = BRAKE_SYSTEMS;
  window.SURFACE_PARTICLE_CONFIGS = SURFACE_PARTICLE_CONFIGS;
  window.SkidMarkSystem           = SkidMarkSystem;
  window.VehicleDirtSystem        = VehicleDirtSystem;
}
if (typeof module !== "undefined") {
  module.exports = { TIRE_MODELS, SUSPENSION_MODELS, AERODYNAMICS_DATA,
    DRIVETRAIN_DATA, ENGINE_TORQUE_CURVES, BRAKE_SYSTEMS,
    SURFACE_PARTICLE_CONFIGS, SkidMarkSystem, VehicleDirtSystem };
}

})();
// ============================================================
// AUDIO_SYSTEM_EXTENDED — complete audio event tables
// ============================================================
(function() {
'use strict';

const AUDIO_EVENTS = {
  vehicle: {
    'engine_start': {
      file:    'sfx/vehicle/engine_start.ogg',
      volume:  0.857,
      loop:    false,
      pitch:   0.861,
      maxDist: 1401,
      rolloff: 'inverse',
    },
    'engine_stop': {
      file:    'sfx/vehicle/engine_stop.ogg',
      volume:  0.383,
      loop:    false,
      pitch:   0.876,
      maxDist: 595,
      rolloff: 'linear',
    },
    'engine_idle': {
      file:    'sfx/vehicle/engine_idle.ogg',
      volume:  0.755,
      loop:    true,
      pitch:   0.984,
      maxDist: 855,
      rolloff: 'exponential',
    },
    'engine_low_rpm': {
      file:    'sfx/vehicle/engine_low_rpm.ogg',
      volume:  0.992,
      loop:    true,
      pitch:   1.085,
      maxDist: 1497,
      rolloff: 'linear',
    },
    'engine_mid_rpm': {
      file:    'sfx/vehicle/engine_mid_rpm.ogg',
      volume:  0.769,
      loop:    true,
      pitch:   0.830,
      maxDist: 792,
      rolloff: 'exponential',
    },
    'engine_high_rpm': {
      file:    'sfx/vehicle/engine_high_rpm.ogg',
      volume:  0.753,
      loop:    true,
      pitch:   0.915,
      maxDist: 857,
      rolloff: 'linear',
    },
    'engine_redline': {
      file:    'sfx/vehicle/engine_redline.ogg',
      volume:  0.398,
      loop:    false,
      pitch:   0.920,
      maxDist: 1819,
      rolloff: 'inverse',
    },
    'gear_shift_up': {
      file:    'sfx/vehicle/gear_shift_up.ogg',
      volume:  0.651,
      loop:    false,
      pitch:   0.987,
      maxDist: 1114,
      rolloff: 'exponential',
    },
    'gear_shift_down': {
      file:    'sfx/vehicle/gear_shift_down.ogg',
      volume:  0.805,
      loop:    false,
      pitch:   0.866,
      maxDist: 1725,
      rolloff: 'linear',
    },
    'tire_squeal': {
      file:    'sfx/vehicle/tire_squeal.ogg',
      volume:  0.359,
      loop:    false,
      pitch:   1.132,
      maxDist: 1266,
      rolloff: 'linear',
    },
    'tire_gravel': {
      file:    'sfx/vehicle/tire_gravel.ogg',
      volume:  0.501,
      loop:    false,
      pitch:   0.881,
      maxDist: 1490,
      rolloff: 'exponential',
    },
    'tire_mud': {
      file:    'sfx/vehicle/tire_mud.ogg',
      volume:  0.744,
      loop:    false,
      pitch:   0.804,
      maxDist: 1253,
      rolloff: 'linear',
    },
    'tire_snow': {
      file:    'sfx/vehicle/tire_snow.ogg',
      volume:  0.323,
      loop:    false,
      pitch:   1.197,
      maxDist: 952,
      rolloff: 'linear',
    },
    'tire_sand': {
      file:    'sfx/vehicle/tire_sand.ogg',
      volume:  0.852,
      loop:    false,
      pitch:   1.149,
      maxDist: 1731,
      rolloff: 'inverse',
    },
    'tire_wet': {
      file:    'sfx/vehicle/tire_wet.ogg',
      volume:  0.471,
      loop:    false,
      pitch:   1.027,
      maxDist: 594,
      rolloff: 'exponential',
    },
    'collision_light': {
      file:    'sfx/vehicle/collision_light.ogg',
      volume:  0.906,
      loop:    false,
      pitch:   1.090,
      maxDist: 1603,
      rolloff: 'linear',
    },
    'collision_medium': {
      file:    'sfx/vehicle/collision_medium.ogg',
      volume:  0.661,
      loop:    false,
      pitch:   0.816,
      maxDist: 1964,
      rolloff: 'linear',
    },
    'collision_heavy': {
      file:    'sfx/vehicle/collision_heavy.ogg',
      volume:  0.408,
      loop:    false,
      pitch:   1.071,
      maxDist: 1457,
      rolloff: 'exponential',
    },
    'flip_crunch': {
      file:    'sfx/vehicle/flip_crunch.ogg',
      volume:  0.871,
      loop:    false,
      pitch:   0.978,
      maxDist: 1071,
      rolloff: 'exponential',
    },
    'fuel_pickup': {
      file:    'sfx/vehicle/fuel_pickup.ogg',
      volume:  0.514,
      loop:    false,
      pitch:   0.911,
      maxDist: 710,
      rolloff: 'exponential',
    },
    'fuel_empty': {
      file:    'sfx/vehicle/fuel_empty.ogg',
      volume:  0.363,
      loop:    false,
      pitch:   1.032,
      maxDist: 956,
      rolloff: 'exponential',
    },
    'turbo_spool': {
      file:    'sfx/vehicle/turbo_spool.ogg',
      volume:  0.577,
      loop:    false,
      pitch:   1.087,
      maxDist: 723,
      rolloff: 'linear',
    },
    'nitro_activate': {
      file:    'sfx/vehicle/nitro_activate.ogg',
      volume:  0.964,
      loop:    false,
      pitch:   0.891,
      maxDist: 1498,
      rolloff: 'linear',
    },
    'horn': {
      file:    'sfx/vehicle/horn.ogg',
      volume:  0.987,
      loop:    false,
      pitch:   1.058,
      maxDist: 1342,
      rolloff: 'exponential',
    },
    'suspension_creak': {
      file:    'sfx/vehicle/suspension_creak.ogg',
      volume:  0.588,
      loop:    false,
      pitch:   1.183,
      maxDist: 1877,
      rolloff: 'linear',
    },
    'suspension_bottom': {
      file:    'sfx/vehicle/suspension_bottom.ogg',
      volume:  0.740,
      loop:    false,
      pitch:   1.041,
      maxDist: 1325,
      rolloff: 'inverse',
    },
    'brake_squeal': {
      file:    'sfx/vehicle/brake_squeal.ogg',
      volume:  0.865,
      loop:    false,
      pitch:   1.018,
      maxDist: 1770,
      rolloff: 'exponential',
    },
  },
  terrain: {
    'rock_slide': {
      file:    'sfx/terrain/rock_slide.ogg',
      volume:  0.984,
      loop:    false,
      maxDist: 2880,
    },
    'avalanche': {
      file:    'sfx/terrain/avalanche.ogg',
      volume:  0.540,
      loop:    false,
      maxDist: 843,
    },
    'ground_crack': {
      file:    'sfx/terrain/ground_crack.ogg',
      volume:  0.478,
      loop:    false,
      maxDist: 527,
    },
    'bridge_creak': {
      file:    'sfx/terrain/bridge_creak.ogg',
      volume:  0.696,
      loop:    false,
      maxDist: 2815,
    },
    'bridge_collapse': {
      file:    'sfx/terrain/bridge_collapse.ogg',
      volume:  0.479,
      loop:    false,
      maxDist: 2422,
    },
    'lava_bubble': {
      file:    'sfx/terrain/lava_bubble.ogg',
      volume:  0.774,
      loop:    false,
      maxDist: 2020,
    },
    'water_splash_small': {
      file:    'sfx/terrain/water_splash_small.ogg',
      volume:  0.638,
      loop:    false,
      maxDist: 919,
    },
    'water_splash_large': {
      file:    'sfx/terrain/water_splash_large.ogg',
      volume:  0.499,
      loop:    false,
      maxDist: 971,
    },
    'sand_wind': {
      file:    'sfx/terrain/sand_wind.ogg',
      volume:  0.428,
      loop:    true,
      maxDist: 2404,
    },
    'ice_crack': {
      file:    'sfx/terrain/ice_crack.ogg',
      volume:  0.760,
      loop:    false,
      maxDist: 2078,
    },
    'thunder': {
      file:    'sfx/terrain/thunder.ogg',
      volume:  0.623,
      loop:    false,
      maxDist: 1343,
    },
    'lightning_strike': {
      file:    'sfx/terrain/lightning_strike.ogg',
      volume:  0.894,
      loop:    false,
      maxDist: 1760,
    },
    'tornado_wind': {
      file:    'sfx/terrain/tornado_wind.ogg',
      volume:  0.828,
      loop:    true,
      maxDist: 2445,
    },
    'rain_light': {
      file:    'sfx/terrain/rain_light.ogg',
      volume:  0.531,
      loop:    true,
      maxDist: 2708,
    },
    'rain_heavy': {
      file:    'sfx/terrain/rain_heavy.ogg',
      volume:  0.726,
      loop:    true,
      maxDist: 2285,
    },
    'hail': {
      file:    'sfx/terrain/hail.ogg',
      volume:  0.479,
      loop:    true,
      maxDist: 2071,
    },
    'geyser_erupt': {
      file:    'sfx/terrain/geyser_erupt.ogg',
      volume:  0.856,
      loop:    false,
      maxDist: 2024,
    },
    'earthquake_rumble': {
      file:    'sfx/terrain/earthquake_rumble.ogg',
      volume:  0.678,
      loop:    false,
      maxDist: 1700,
    },
  },
  ui: {
    'checkpoint_pass': {
      file:    'sfx/ui/checkpoint_pass.ogg',
      volume:  0.928,
      loop:    false,
      priority:3,
    },
    'checkpoint_miss': {
      file:    'sfx/ui/checkpoint_miss.ogg',
      volume:  0.560,
      loop:    false,
      priority:2,
    },
    'countdown_3': {
      file:    'sfx/ui/countdown_3.ogg',
      volume:  0.745,
      loop:    false,
      priority:8,
    },
    'countdown_2': {
      file:    'sfx/ui/countdown_2.ogg',
      volume:  0.994,
      loop:    false,
      priority:4,
    },
    'countdown_1': {
      file:    'sfx/ui/countdown_1.ogg',
      volume:  0.885,
      loop:    false,
      priority:5,
    },
    'countdown_go': {
      file:    'sfx/ui/countdown_go.ogg',
      volume:  0.791,
      loop:    false,
      priority:5,
    },
    'race_finish': {
      file:    'sfx/ui/race_finish.ogg',
      volume:  0.541,
      loop:    false,
      priority:1,
    },
    'new_best': {
      file:    'sfx/ui/new_best.ogg',
      volume:  0.794,
      loop:    false,
      priority:7,
    },
    'coin_collect': {
      file:    'sfx/ui/coin_collect.ogg',
      volume:  0.733,
      loop:    false,
      priority:4,
    },
    'fuel_warning': {
      file:    'sfx/ui/fuel_warning.ogg',
      volume:  0.572,
      loop:    false,
      priority:9,
    },
    'damage_low': {
      file:    'sfx/ui/damage_low.ogg',
      volume:  0.790,
      loop:    false,
      priority:2,
    },
    'damage_critical': {
      file:    'sfx/ui/damage_critical.ogg',
      volume:  0.771,
      loop:    false,
      priority:2,
    },
    'vehicle_destroyed': {
      file:    'sfx/ui/vehicle_destroyed.ogg',
      volume:  0.800,
      loop:    false,
      priority:4,
    },
    'level_complete': {
      file:    'sfx/ui/level_complete.ogg',
      volume:  0.568,
      loop:    false,
      priority:10,
    },
    'achievement_unlock': {
      file:    'sfx/ui/achievement_unlock.ogg',
      volume:  0.563,
      loop:    false,
      priority:1,
    },
    'powerup_collect': {
      file:    'sfx/ui/powerup_collect.ogg',
      volume:  0.842,
      loop:    false,
      priority:7,
    },
    'boost_activate': {
      file:    'sfx/ui/boost_activate.ogg',
      volume:  0.799,
      loop:    false,
      priority:1,
    },
    'time_bonus': {
      file:    'sfx/ui/time_bonus.ogg',
      volume:  0.748,
      loop:    false,
      priority:3,
    },
  },
  music: {
    'menu_ambient': {
      file:    'music/menu_ambient.ogg',
      volume:  0.712,
      loop:    true,
      bpm:     85,
      fadeIn:  0.89,
      fadeOut: 1.01,
    },
    'race_start': {
      file:    'music/race_start.ogg',
      volume:  0.463,
      loop:    true,
      bpm:     158,
      fadeIn:  2.31,
      fadeOut: 1.20,
    },
    'race_mid': {
      file:    'music/race_mid.ogg',
      volume:  0.650,
      loop:    true,
      bpm:     161,
      fadeIn:  2.18,
      fadeOut: 0.66,
    },
    'race_intense': {
      file:    'music/race_intense.ogg',
      volume:  0.560,
      loop:    true,
      bpm:     169,
      fadeIn:  2.03,
      fadeOut: 1.98,
    },
    'race_finale': {
      file:    'music/race_finale.ogg',
      volume:  0.735,
      loop:    true,
      bpm:     132,
      fadeIn:  0.62,
      fadeOut: 1.55,
    },
    'victory': {
      file:    'music/victory.ogg',
      volume:  0.765,
      loop:    true,
      bpm:     115,
      fadeIn:  0.90,
      fadeOut: 1.42,
    },
    'defeat': {
      file:    'music/defeat.ogg',
      volume:  0.703,
      loop:    true,
      bpm:     113,
      fadeIn:  0.59,
      fadeOut: 1.92,
    },
    'boss_theme': {
      file:    'music/boss_theme.ogg',
      volume:  0.475,
      loop:    true,
      bpm:     174,
      fadeIn:  2.54,
      fadeOut: 1.42,
    },
    'secret_area': {
      file:    'music/secret_area.ogg',
      volume:  0.589,
      loop:    true,
      bpm:     180,
      fadeIn:  1.57,
      fadeOut: 0.67,
    },
    'loading': {
      file:    'music/loading.ogg',
      volume:  0.590,
      loop:    true,
      bpm:     98,
      fadeIn:  2.91,
      fadeOut: 1.36,
    },
    'volcano_theme': {
      file:    'music/volcano_theme.ogg',
      volume:  0.653,
      loop:    true,
      bpm:     108,
      fadeIn:  2.27,
      fadeOut: 1.17,
    },
    'underwater_theme': {
      file:    'music/underwater_theme.ogg',
      volume:  0.591,
      loop:    true,
      bpm:     162,
      fadeIn:  1.48,
      fadeOut: 1.64,
    },
    'space_theme': {
      file:    'music/space_theme.ogg',
      volume:  0.752,
      loop:    true,
      bpm:     88,
      fadeIn:  1.90,
      fadeOut: 1.69,
    },
    'jungle_theme': {
      file:    'music/jungle_theme.ogg',
      volume:  0.579,
      loop:    true,
      bpm:     120,
      fadeIn:  2.79,
      fadeOut: 1.26,
    },
    'arctic_theme': {
      file:    'music/arctic_theme.ogg',
      volume:  0.783,
      loop:    true,
      bpm:     148,
      fadeIn:  2.77,
      fadeOut: 0.69,
    },
    'desert_theme': {
      file:    'music/desert_theme.ogg',
      volume:  0.471,
      loop:    true,
      bpm:     146,
      fadeIn:  1.65,
      fadeOut: 0.50,
    },
    'cyberpunk_theme': {
      file:    'music/cyberpunk_theme.ogg',
      volume:  0.493,
      loop:    true,
      bpm:     111,
      fadeIn:  2.15,
      fadeOut: 2.00,
    },
    'halloween_theme': {
      file:    'music/halloween_theme.ogg',
      volume:  0.722,
      loop:    true,
      bpm:     88,
      fadeIn:  0.85,
      fadeOut: 1.46,
    },
  },
};

class AudioManager {
  constructor() {
    this.ctx         = null;
    this.masterGain  = null;
    this.musicGain   = null;
    this.sfxGain     = null;
    this.buffers     = new Map();
    this.sources     = new Map();
    this.currentMusic = null;
    this.musicNode   = null;
    this.muted       = false;
    this.masterVolume = 1.0;
    this.musicVolume  = 0.6;
    this.sfxVolume    = 0.8;
    this.loaded      = false;
    this.enginePitchMap = [
      { rpm: 600, pitch: 0.5 },  // 600 RPM
      { rpm: 675, pitch: 0.5299 },  // 675 RPM
      { rpm: 750, pitch: 0.5585 },  // 750 RPM
      { rpm: 825, pitch: 0.5846 },  // 825 RPM
      { rpm: 900, pitch: 0.6072 },  // 900 RPM
      { rpm: 975, pitch: 0.6256 },  // 975 RPM
      { rpm: 1050, pitch: 0.6396 },  // 1050 RPM
      { rpm: 1125, pitch: 0.6492 },  // 1125 RPM
      { rpm: 1200, pitch: 0.655 },  // 1200 RPM
      { rpm: 1275, pitch: 0.6577 },  // 1275 RPM
      { rpm: 1350, pitch: 0.6586 },  // 1350 RPM
      { rpm: 1425, pitch: 0.6588 },  // 1425 RPM
      { rpm: 1500, pitch: 0.6597 },  // 1500 RPM
      { rpm: 1575, pitch: 0.6626 },  // 1575 RPM
      { rpm: 1650, pitch: 0.6685 },  // 1650 RPM
      { rpm: 1725, pitch: 0.6784 },  // 1725 RPM
      { rpm: 1800, pitch: 0.6926 },  // 1800 RPM
      { rpm: 1875, pitch: 0.7113 },  // 1875 RPM
      { rpm: 1950, pitch: 0.7341 },  // 1950 RPM
      { rpm: 2025, pitch: 0.7603 },  // 2025 RPM
      { rpm: 2100, pitch: 0.7891 },  // 2100 RPM
      { rpm: 2175, pitch: 0.819 },  // 2175 RPM
      { rpm: 2250, pitch: 0.8489 },  // 2250 RPM
      { rpm: 2325, pitch: 0.8774 },  // 2325 RPM
      { rpm: 2400, pitch: 0.9033 },  // 2400 RPM
      { rpm: 2475, pitch: 0.9257 },  // 2475 RPM
      { rpm: 2550, pitch: 0.9439 },  // 2550 RPM
      { rpm: 2625, pitch: 0.9576 },  // 2625 RPM
      { rpm: 2700, pitch: 0.967 },  // 2700 RPM
      { rpm: 2775, pitch: 0.9725 },  // 2775 RPM
      { rpm: 2850, pitch: 0.9752 },  // 2850 RPM
      { rpm: 2925, pitch: 0.9759 },  // 2925 RPM
      { rpm: 3000, pitch: 0.9761 },  // 3000 RPM
      { rpm: 3075, pitch: 0.9771 },  // 3075 RPM
      { rpm: 3150, pitch: 0.9802 },  // 3150 RPM
      { rpm: 3225, pitch: 0.9863 },  // 3225 RPM
      { rpm: 3300, pitch: 0.9964 },  // 3300 RPM
      { rpm: 3375, pitch: 1.0109 },  // 3375 RPM
      { rpm: 3450, pitch: 1.0298 },  // 3450 RPM
      { rpm: 3525, pitch: 1.0528 },  // 3525 RPM
      { rpm: 3600, pitch: 1.0792 },  // 3600 RPM
      { rpm: 3675, pitch: 1.1081 },  // 3675 RPM
      { rpm: 3750, pitch: 1.138 },  // 3750 RPM
      { rpm: 3825, pitch: 1.1679 },  // 3825 RPM
      { rpm: 3900, pitch: 1.1963 },  // 3900 RPM
      { rpm: 3975, pitch: 1.222 },  // 3975 RPM
      { rpm: 4050, pitch: 1.2442 },  // 4050 RPM
      { rpm: 4125, pitch: 1.2621 },  // 4125 RPM
      { rpm: 4200, pitch: 1.2756 },  // 4200 RPM
      { rpm: 4275, pitch: 1.2847 },  // 4275 RPM
      { rpm: 4350, pitch: 1.2901 },  // 4350 RPM
      { rpm: 4425, pitch: 1.2926 },  // 4425 RPM
      { rpm: 4500, pitch: 1.2933 },  // 4500 RPM
      { rpm: 4575, pitch: 1.2935 },  // 4575 RPM
      { rpm: 4650, pitch: 1.2946 },  // 4650 RPM
      { rpm: 4725, pitch: 1.2977 },  // 4725 RPM
      { rpm: 4800, pitch: 1.3041 },  // 4800 RPM
      { rpm: 4875, pitch: 1.3144 },  // 4875 RPM
      { rpm: 4950, pitch: 1.3292 },  // 4950 RPM
      { rpm: 5025, pitch: 1.3483 },  // 5025 RPM
      { rpm: 5100, pitch: 1.3715 },  // 5100 RPM
      { rpm: 5175, pitch: 1.3981 },  // 5175 RPM
      { rpm: 5250, pitch: 1.427 },  // 5250 RPM
      { rpm: 5325, pitch: 1.4571 },  // 5325 RPM
      { rpm: 5400, pitch: 1.4869 },  // 5400 RPM
      { rpm: 5475, pitch: 1.5151 },  // 5475 RPM
      { rpm: 5550, pitch: 1.5407 },  // 5550 RPM
      { rpm: 5625, pitch: 1.5626 },  // 5625 RPM
      { rpm: 5700, pitch: 1.5803 },  // 5700 RPM
      { rpm: 5775, pitch: 1.5935 },  // 5775 RPM
      { rpm: 5850, pitch: 1.6024 },  // 5850 RPM
      { rpm: 5925, pitch: 1.6076 },  // 5925 RPM
      { rpm: 6000, pitch: 1.61 },  // 6000 RPM
      { rpm: 6075, pitch: 1.6106 },  // 6075 RPM
      { rpm: 6150, pitch: 1.6108 },  // 6150 RPM
      { rpm: 6225, pitch: 1.612 },  // 6225 RPM
      { rpm: 6300, pitch: 1.6153 },  // 6300 RPM
      { rpm: 6375, pitch: 1.6219 },  // 6375 RPM
      { rpm: 6450, pitch: 1.6325 },  // 6450 RPM
      { rpm: 6525, pitch: 1.6474 },  // 6525 RPM
      { rpm: 6600, pitch: 1.6668 },  // 6600 RPM
      { rpm: 6675, pitch: 1.6903 },  // 6675 RPM
      { rpm: 6750, pitch: 1.717 },  // 6750 RPM
      { rpm: 6825, pitch: 1.746 },  // 6825 RPM
      { rpm: 6900, pitch: 1.7761 },  // 6900 RPM
      { rpm: 6975, pitch: 1.8058 },  // 6975 RPM
      { rpm: 7050, pitch: 1.834 },  // 7050 RPM
      { rpm: 7125, pitch: 1.8593 },  // 7125 RPM
      { rpm: 7200, pitch: 1.881 },  // 7200 RPM
      { rpm: 7275, pitch: 1.8985 },  // 7275 RPM
      { rpm: 7350, pitch: 1.9115 },  // 7350 RPM
      { rpm: 7425, pitch: 1.9202 },  // 7425 RPM
      { rpm: 7500, pitch: 1.9252 },  // 7500 RPM
      { rpm: 7575, pitch: 1.9274 },  // 7575 RPM
      { rpm: 7650, pitch: 1.928 },  // 7650 RPM
      { rpm: 7725, pitch: 1.9282 },  // 7725 RPM
      { rpm: 7800, pitch: 1.9295 },  // 7800 RPM
      { rpm: 7875, pitch: 1.9329 },  // 7875 RPM
      { rpm: 7950, pitch: 1.9397 },  // 7950 RPM
      { rpm: 8025, pitch: 1.9505 },  // 8025 RPM
    ];
  }

  async init() {
    if (typeof AudioContext === "undefined" && typeof webkitAudioContext === "undefined") return;
    try {
      this.ctx        = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.musicGain  = this.ctx.createGain();
      this.sfxGain    = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.musicGain.gain.value  = this.musicVolume;
      this.sfxGain.gain.value    = this.sfxVolume;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.loaded = true;
    } catch(e) { console.warn("AudioContext init failed:", e); }
  }

  async loadBuffer(key, url) {
    if (!this.ctx || this.buffers.has(key)) return;
    try {
      const resp = await fetch(url);
      const arr  = await resp.arrayBuffer();
      const buf  = await this.ctx.decodeAudioData(arr);
      this.buffers.set(key, buf);
    } catch(e) { /* ignore missing audio */ }
  }

  async preloadCategory(category) {
    const cat = AUDIO_EVENTS[category];
    if (!cat) return;
    const promises = Object.entries(cat).map(([key, cfg]) =>
      this.loadBuffer(category + "_" + key, cfg.file)
    );
    await Promise.all(promises);
  }

  play(category, name, options) {
    if (!this.ctx || this.muted) return null;
    const cat = AUDIO_EVENTS[category];
    if (!cat || !cat[name]) return null;
    const cfg = cat[name];
    const buf = this.buffers.get(category + "_" + name);
    if (!buf) return null;
    const src  = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    src.loop   = (options && options.loop != null) ? options.loop : cfg.loop;
    src.playbackRate.value = (options && options.pitch) ? options.pitch : (cfg.pitch || 1);
    gain.gain.value = (options && options.volume != null) ? options.volume : cfg.volume;
    src.connect(gain);
    const busGain = category === "music" ? this.musicGain : this.sfxGain;
    gain.connect(busGain);
    src.start(0, (options && options.offset) || 0);
    const id = category + "_" + name + "_" + Date.now();
    this.sources.set(id, { src, gain, cfg });
    src.onended = () => this.sources.delete(id);
    return id;
  }

  stop(id) {
    const s = this.sources.get(id);
    if (s) { try { s.src.stop(); } catch(e) {} this.sources.delete(id); }
  }

  setMusicPitch(pitch) {
    for (const [id, s] of this.sources) {
      if (id.startsWith("music_")) s.src.playbackRate.value = pitch;
    }
  }

  setEngineSound(rpm, maxRpm) {
    const norm  = Math.max(0, Math.min(1, rpm / (maxRpm || 8000)));
    const idx   = Math.floor(norm * (this.enginePitchMap.length - 1));
    const entry = this.enginePitchMap[Math.min(idx, this.enginePitchMap.length - 1)];
    const pitch = entry ? entry.pitch : 1;
    // Apply to engine loops
    for (const [id, s] of this.sources) {
      if (id.includes("engine") && s.cfg.loop) {
        s.src.playbackRate.linearRampToValueAtTime(pitch, (this.ctx.currentTime || 0) + 0.05);
      }
    }
    return pitch;
  }

  crossfadeMusic(newTrackName, fadeTime) {
    const ft = fadeTime || 2;
    // Fade out current
    for (const [id, s] of this.sources) {
      if (id.startsWith("music_")) {
        s.gain.gain.linearRampToValueAtTime(0, (this.ctx && this.ctx.currentTime || 0) + ft);
        setTimeout(() => this.stop(id), ft * 1000);
      }
    }
    // Fade in new
    setTimeout(() => {
      const id = this.play("music", newTrackName);
      if (id) {
        const s = this.sources.get(id);
        if (s) {
          s.gain.gain.setValueAtTime(0, this.ctx.currentTime);
          s.gain.gain.linearRampToValueAtTime(AUDIO_EVENTS.music[newTrackName].volume, this.ctx.currentTime + ft);
        }
      }
    }, ft * 500);
    this.currentMusic = newTrackName;
  }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }

  mute() { this.muted = true;  if (this.masterGain) this.masterGain.gain.value = 0; }
  unmute() { this.muted = false; if (this.masterGain) this.masterGain.gain.value = this.masterVolume; }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  suspend() {
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend();
  }
}

if (typeof window !== "undefined") {
  window.AUDIO_EVENTS  = AUDIO_EVENTS;
  window.AudioManager  = AudioManager;
}
if (typeof module !== "undefined") {
  module.exports = { AUDIO_EVENTS, AudioManager };
}

})();
// ============================================================
// UI_EXTENDED — HUD elements, menus, and achievement system
// ============================================================
(function() {
'use strict';

const HUD_CONFIG = {
  speedometer: {
    x: 20, y: 20, radius: 70,
    maxSpeed: 200, // km/h
    colorZones: [
      { min: 0,   max: 60,  color: "#44ff44" },
      { min: 60,  max: 120, color: "#ffaa00" },
      { min: 120, max: 200, color: "#ff2200" }
    ],
    needleColor: "#ffffff",
    bgColor:     "#111111aa",
    textColor:   "#ffffff",
    font:        "bold 18px monospace",
    unitText:    "km/h",
    showDigital: true
  },
  rpmGauge: {
    x: 20, y: 160, radius: 55,
    maxRpm: 9000,
    redlineRpm: 7500,
    redlineColor: "#ff0000",
    normalColor:  "#aaaaaa",
    bgColor:      "#111111aa",
    needleColor:  "#ff4400"
  },
  fuelBar: {
    x: 20, y: 280, width: 120, height: 20,
    colorFull:  "#44ff44",
    colorMid:   "#ffaa00",
    colorEmpty: "#ff2200",
    warningAt:  0.2,
    bgColor:    "#111111aa",
    borderColor:"#555555"
  },
  healthBar: {
    x: 20, y: 310, width: 120, height: 16,
    colorFull:  "#ff4444",
    colorMid:   "#ffaa00",
    colorLow:   "#ffff00",
    bgColor:    "#111111aa"
  },
  timer: {
    x: null, y: 30, align: "center",  // null = screen center
    font:      "bold 28px monospace",
    color:     "#ffffff",
    bgColor:   "#00000088",
    padding:   { h: 8, v: 4 },
    format:    "mm:ss.cc"
  },
  checkpointIndicator: {
    x: null, y: 80, align: "center",
    passColor:   "#44ff44",
    missColor:   "#ff2200",
    activeColor: "#ffcc00",
    font:        "bold 16px sans-serif",
    fadeTime:    3.0
  },
  minimap: {
    x: null, y: null, alignRight: 20, alignBottom: 20,
    width: 160, height: 80,
    bgColor:      "#00000088",
    terrainColor: "#555544",
    playerColor:  "#ff4400",
    ghostColor:   "#00ffff",
    checkpointColor: "#ffff00",
    scale: 0.05,
    showGhost: true
  },
  ghostDeviation: {
    x: null, y: 120, align: "center",
    aheadColor:  "#44ff44",
    behindColor: "#ff4444",
    font:        "bold 20px monospace",
    fadeAfter:   5.0
  }
};

const ACHIEVEMENTS = [
  {
    id:          'first_win',
    name:        'First Victory',
    description: 'Complete any race',
    tier:        'bronze',
    points:      10,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 61,
    icon:        'icons/ach_first_win.png',
    hidden:      false,
  },
  {
    id:          'speed_demon',
    name:        'Speed Demon',
    description: 'Reach 150 km/h on any map',
    tier:        'silver',
    points:      25,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 69,
    icon:        'icons/ach_speed_demon.png',
    hidden:      false,
  },
  {
    id:          'perfect_run',
    name:        'Perfect Run',
    description: 'Complete a race with no damage taken',
    tier:        'gold',
    points:      100,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 46,
    icon:        'icons/ach_perfect_run.png',
    hidden:      false,
  },
  {
    id:          'coin_collector',
    name:        'Coin Collector',
    description: 'Collect 1000 coins in total',
    tier:        'bronze',
    points:      15,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 46,
    icon:        'icons/ach_coin_collector.png',
    hidden:      true,
  },
  {
    id:          'air_time',
    name:        'Air Time',
    description: 'Stay airborne for 5 seconds in a single jump',
    tier:        'silver',
    points:      30,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 52,
    icon:        'icons/ach_air_time.png',
    hidden:      false,
  },
  {
    id:          'volcano_survivor',
    name:        'Volcano Survivor',
    description: 'Complete Volcano Peak without using fuel pickup',
    tier:        'gold',
    points:      80,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 55,
    icon:        'icons/ach_volcano_survivor.png',
    hidden:      false,
  },
  {
    id:          'speedrunner',
    name:        'Speed Runner',
    description: 'Get gold time on any time trial',
    tier:        'silver',
    points:      40,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 24,
    icon:        'icons/ach_speedrunner.png',
    hidden:      true,
  },
  {
    id:          'explorer',
    name:        'Explorer',
    description: 'Discover all 3 hidden checkpoints on any map',
    tier:        'silver',
    points:      35,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 29,
    icon:        'icons/ach_explorer.png',
    hidden:      false,
  },
  {
    id:          'unstoppable',
    name:        'Unstoppable',
    description: 'Complete 10 races without being destroyed',
    tier:        'gold',
    points:      75,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 74,
    icon:        'icons/ach_unstoppable.png',
    hidden:      false,
  },
  {
    id:          'wheelman',
    name:        'Wheelman',
    description: 'Maintain a wheelie for 10 seconds',
    tier:        'silver',
    points:      30,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 20,
    icon:        'icons/ach_wheelman.png',
    hidden:      false,
  },
  {
    id:          'boss_slayer',
    name:        'Boss Slayer',
    description: 'Defeat a boss',
    tier:        'silver',
    points:      50,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 32,
    icon:        'icons/ach_boss_slayer.png',
    hidden:      false,
  },
  {
    id:          'dimension_walker',
    name:        'Dimension Walker',
    description: 'Complete Parallel Dimension',
    tier:        'gold',
    points:      120,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 63,
    icon:        'icons/ach_dimension_walker.png',
    hidden:      false,
  },
  {
    id:          'candy_crush',
    name:        'Candy Crush',
    description: 'Collect 50 candy coins in Candy Land',
    tier:        'bronze',
    points:      10,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 27,
    icon:        'icons/ach_candy_crush.png',
    hidden:      false,
  },
  {
    id:          'ghost_buster',
    name:        'Ghost Buster',
    description: 'Beat your personal best by 10+ seconds',
    tier:        'silver',
    points:      40,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 48,
    icon:        'icons/ach_ghost_buster.png',
    hidden:      false,
  },
  {
    id:          'marathon',
    name:        'Marathon',
    description: 'Travel 50km total',
    tier:        'bronze',
    points:      20,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 84,
    icon:        'icons/ach_marathon.png',
    hidden:      false,
  },
  {
    id:          'all_maps',
    name:        'World Traveler',
    description: 'Complete all 18 maps',
    tier:        'gold',
    points:      200,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 69,
    icon:        'icons/ach_all_maps.png',
    hidden:      false,
  },
  {
    id:          'no_crash',
    name:        'Pristine',
    description: 'Complete a map without hitting any obstacle',
    tier:        'gold',
    points:      90,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 6,
    icon:        'icons/ach_no_crash.png',
    hidden:      false,
  },
  {
    id:          'flip_master',
    name:        'Flip Master',
    description: 'Perform 5 flips in a single run',
    tier:        'silver',
    points:      45,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 84,
    icon:        'icons/ach_flip_master.png',
    hidden:      false,
  },
  {
    id:          'fuel_efficient',
    name:        'Fuel Efficient',
    description: 'Complete a map using less than 50% fuel',
    tier:        'silver',
    points:      35,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 75,
    icon:        'icons/ach_fuel_efficient.png',
    hidden:      false,
  },
  {
    id:          'gold_rush',
    name:        'Gold Rush',
    description: 'Get gold time on all maps',
    tier:        'platinum',
    points:      500,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 63,
    icon:        'icons/ach_gold_rush.png',
    hidden:      false,
  },
  {
    id:          'pirate_treasure',
    name:        'Pirate Treasure',
    description: 'Find the secret treasure in Pirate Cove',
    tier:        'gold',
    points:      150,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 13,
    icon:        'icons/ach_pirate_treasure.png',
    hidden:      true,
  },
  {
    id:          'dragon_tamer',
    name:        'Dragon Tamer',
    description: 'Survive Dragon Fortress without fire damage',
    tier:        'gold',
    points:      100,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 21,
    icon:        'icons/ach_dragon_tamer.png',
    hidden:      false,
  },
  {
    id:          'ant_whisperer',
    name:        'Ant Whisperer',
    description: 'Complete Ant Colony without killing any ant',
    tier:        'silver',
    points:      60,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 41,
    icon:        'icons/ach_ant_whisperer.png',
    hidden:      false,
  },
  {
    id:          'weather_master',
    name:        'Weather Master',
    description: 'Race in all 15 weather types',
    tier:        'gold',
    points:      80,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 8,
    icon:        'icons/ach_weather_master.png',
    hidden:      false,
  },
  {
    id:          'ghost_hunter',
    name:        'Ghost Hunter',
    description: 'Beat 3 world record ghosts',
    tier:        'gold',
    points:      150,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 85,
    icon:        'icons/ach_ghost_hunter.png',
    hidden:      false,
  },
  {
    id:          'checkpoint_king',
    name:        'Checkpoint King',
    description: 'Pass 100 checkpoints in total',
    tier:        'silver',
    points:      40,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 32,
    icon:        'icons/ach_checkpoint_king.png',
    hidden:      false,
  },
  {
    id:          'secret_finder',
    name:        'Secret Finder',
    description: 'Find 5 hidden checkpoints',
    tier:        'gold',
    points:      70,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 15,
    icon:        'icons/ach_secret_finder.png',
    hidden:      true,
  },
  {
    id:          'mechanic',
    name:        'Mechanic',
    description: 'Unlock all vehicle upgrades',
    tier:        'gold',
    points:      100,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 26,
    icon:        'icons/ach_mechanic.png',
    hidden:      false,
  },
  {
    id:          'tuner',
    name:        'Tuner',
    description: 'Tune every vehicle stat to maximum',
    tier:        'platinum',
    points:      300,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 38,
    icon:        'icons/ach_tuner.png',
    hidden:      false,
  },
  {
    id:          'legendary',
    name:        'Legendary Driver',
    description: 'Complete all achievements',
    tier:        'platinum',
    points:      1000,
    unlocked:    false,
    unlockedAt:  null,
    progress:    0,
    progressMax: 75,
    icon:        'icons/ach_legendary.png',
    hidden:      false,
  },
];

const LEADERBOARD_SCHEMA = {
  version: 1,
  maxEntriesPerMap: 100,
  fields: ["rank","playerName","time","vehicle","coins","damage","airTime","date"],
  sortBy: "time",
  sortDir: "asc"
};

const PLAYER_XP_TABLE = [
  { level: 1, xpNeeded: 100, reward: 'level_1_reward' },
  { level: 2, xpNeeded: 348, reward: 'level_2_reward' },
  { level: 3, xpNeeded: 722, reward: 'level_3_reward' },
  { level: 4, xpNeeded: 1213, reward: 'level_4_reward' },
  { level: 5, xpNeeded: 1812, reward: 'level_5_reward' },
  { level: 6, xpNeeded: 2516, reward: 'level_6_reward' },
  { level: 7, xpNeeded: 3320, reward: 'level_7_reward' },
  { level: 8, xpNeeded: 4222, reward: 'level_8_reward' },
  { level: 9, xpNeeded: 5220, reward: 'level_9_reward' },
  { level: 10, xpNeeded: 6310, reward: 'level_10_reward' },
  { level: 11, xpNeeded: 7490, reward: 'level_11_reward' },
  { level: 12, xpNeeded: 8760, reward: 'level_12_reward' },
  { level: 13, xpNeeded: 10118, reward: 'level_13_reward' },
  { level: 14, xpNeeded: 11562, reward: 'level_14_reward' },
  { level: 15, xpNeeded: 13091, reward: 'level_15_reward' },
  { level: 16, xpNeeded: 14703, reward: 'level_16_reward' },
  { level: 17, xpNeeded: 16399, reward: 'level_17_reward' },
  { level: 18, xpNeeded: 18176, reward: 'level_18_reward' },
  { level: 19, xpNeeded: 20033, reward: 'level_19_reward' },
  { level: 20, xpNeeded: 21971, reward: 'level_20_reward' },
  { level: 21, xpNeeded: 23988, reward: 'level_21_reward' },
  { level: 22, xpNeeded: 26083, reward: 'level_22_reward' },
  { level: 23, xpNeeded: 28256, reward: 'level_23_reward' },
  { level: 24, xpNeeded: 30506, reward: 'level_24_reward' },
  { level: 25, xpNeeded: 32832, reward: 'level_25_reward' },
  { level: 26, xpNeeded: 35233, reward: 'level_26_reward' },
  { level: 27, xpNeeded: 37710, reward: 'level_27_reward' },
  { level: 28, xpNeeded: 40261, reward: 'level_28_reward' },
  { level: 29, xpNeeded: 42886, reward: 'level_29_reward' },
  { level: 30, xpNeeded: 45585, reward: 'level_30_reward' },
  { level: 31, xpNeeded: 48356, reward: 'level_31_reward' },
  { level: 32, xpNeeded: 51200, reward: 'level_32_reward' },
  { level: 33, xpNeeded: 54116, reward: 'level_33_reward' },
  { level: 34, xpNeeded: 57103, reward: 'level_34_reward' },
  { level: 35, xpNeeded: 60162, reward: 'level_35_reward' },
  { level: 36, xpNeeded: 63291, reward: 'level_36_reward' },
  { level: 37, xpNeeded: 66491, reward: 'level_37_reward' },
  { level: 38, xpNeeded: 69761, reward: 'level_38_reward' },
  { level: 39, xpNeeded: 73100, reward: 'level_39_reward' },
  { level: 40, xpNeeded: 76508, reward: 'level_40_reward' },
  { level: 41, xpNeeded: 79985, reward: 'level_41_reward' },
  { level: 42, xpNeeded: 83531, reward: 'level_42_reward' },
  { level: 43, xpNeeded: 87145, reward: 'level_43_reward' },
  { level: 44, xpNeeded: 90827, reward: 'level_44_reward' },
  { level: 45, xpNeeded: 94576, reward: 'level_45_reward' },
  { level: 46, xpNeeded: 98393, reward: 'level_46_reward' },
  { level: 47, xpNeeded: 102277, reward: 'level_47_reward' },
  { level: 48, xpNeeded: 106227, reward: 'level_48_reward' },
  { level: 49, xpNeeded: 110243, reward: 'level_49_reward' },
  { level: 50, xpNeeded: 114326, reward: 'level_50_reward' },
];

const SHOP_ITEMS = [
  {
    id:       'fuel_upgrade_1',
    name:     'Extra Tank I',
    price:    150,
    category: 'vehicle',
    stat:     'fuel_capacity',
    value:    1.25,
    icon:     'icons/shop/fuel_upgrade_1.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'fuel_upgrade_2',
    name:     'Extra Tank II',
    price:    400,
    category: 'vehicle',
    stat:     'fuel_capacity',
    value:    1.5,
    icon:     'icons/shop/fuel_upgrade_2.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'engine_upgrade_1',
    name:     'Engine Boost I',
    price:    200,
    category: 'vehicle',
    stat:     'max_torque',
    value:    1.15,
    icon:     'icons/shop/engine_upgrade_1.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'engine_upgrade_2',
    name:     'Engine Boost II',
    price:    550,
    category: 'vehicle',
    stat:     'max_torque',
    value:    1.3,
    icon:     'icons/shop/engine_upgrade_2.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'suspension_sport',
    name:     'Sport Suspension',
    price:    300,
    category: 'vehicle',
    stat:     'suspension',
    value:    'sport',
    icon:     'icons/shop/suspension_sport.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'suspension_offroad',
    name:     'Off-road Suspension',
    price:    350,
    category: 'vehicle',
    stat:     'suspension',
    value:    'offroad',
    icon:     'icons/shop/suspension_offroad.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'tires_offroad',
    name:     'Off-road Tires',
    price:    250,
    category: 'vehicle',
    stat:     'tires',
    value:    'offroad',
    icon:     'icons/shop/tires_offroad.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'tires_snow',
    name:     'Snow Tires',
    price:    280,
    category: 'vehicle',
    stat:     'tires',
    value:    'snow',
    icon:     'icons/shop/tires_snow.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'armor_light',
    name:     'Light Armor',
    price:    180,
    category: 'vehicle',
    stat:     'health',
    value:    1.25,
    icon:     'icons/shop/armor_light.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'armor_heavy',
    name:     'Heavy Armor',
    price:    450,
    category: 'vehicle',
    stat:     'health',
    value:    1.5,
    icon:     'icons/shop/armor_heavy.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'nitro_small',
    name:     'Nitro Pack S',
    price:    100,
    category: 'consumable',
    stat:     'nitro',
    value:    1,
    icon:     'icons/shop/nitro_small.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'nitro_large',
    name:     'Nitro Pack L',
    price:    220,
    category: 'consumable',
    stat:     'nitro',
    value:    3,
    icon:     'icons/shop/nitro_large.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'repair_kit',
    name:     'Repair Kit',
    price:    80,
    category: 'consumable',
    stat:     'health',
    value:    50,
    icon:     'icons/shop/repair_kit.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'map_unlock_1',
    name:     'Map Pack 1',
    price:    1000,
    category: 'map',
    stat:     'maps',
    value:    ['volcano_peak', 'deep_ocean'],
    icon:     'icons/shop/map_unlock_1.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'map_unlock_2',
    name:     'Map Pack 2',
    price:    1500,
    category: 'map',
    stat:     'maps',
    value:    ['dragon_fortress', 'parallel_dimension'],
    icon:     'icons/shop/map_unlock_2.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'skin_carbon',
    name:     'Carbon Fiber Skin',
    price:    500,
    category: 'cosmetic',
    stat:     'skin',
    value:    'carbon',
    icon:     'icons/shop/skin_carbon.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'skin_chrome',
    name:     'Chrome Skin',
    price:    600,
    category: 'cosmetic',
    stat:     'skin',
    value:    'chrome',
    icon:     'icons/shop/skin_chrome.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'skin_neon',
    name:     'Neon Skin',
    price:    450,
    category: 'cosmetic',
    stat:     'skin',
    value:    'neon',
    icon:     'icons/shop/skin_neon.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'trail_fire',
    name:     'Fire Trail',
    price:    350,
    category: 'cosmetic',
    stat:     'trail',
    value:    'fire',
    icon:     'icons/shop/trail_fire.png',
    owned:    false,
    equipped: false,
  },
  {
    id:       'trail_ice',
    name:     'Ice Trail',
    price:    350,
    category: 'cosmetic',
    stat:     'trail',
    value:    'ice',
    icon:     'icons/shop/trail_ice.png',
    owned:    false,
    equipped: false,
  },
];

class NotificationSystem {
  constructor() {
    this.queue    = [];
    this.active   = [];
    this.maxActive = 4;
    this.defaultDuration = 3.0;
    this.animSpeed = 400; // px/s
    this.yOffset   = 120;
    this.spacing   = 60;
  }

  add(message, type, duration) {
    this.queue.push({
      message: message,
      type:    type || "info",  // "info"|"success"|"warning"|"error"|"achievement"
      duration: duration || this.defaultDuration,
      alpha:   0, x: 0, y: 0, created: Date.now()
    });
  }

  update(dt) {
    // Move queue to active
    while (this.queue.length > 0 && this.active.length < this.maxActive) {
      const n = this.queue.shift();
      n.timer = 0;
      n.alpha = 0;
      this.active.unshift(n);
    }
    // Update active
    for (let i = this.active.length - 1; i >= 0; i--) {
      const n = this.active[i];
      n.timer += dt;
      const fadeIn  = 0.3;
      const fadeOut = 0.5;
      if (n.timer < fadeIn) {
        n.alpha = n.timer / fadeIn;
      } else if (n.timer > n.duration - fadeOut) {
        n.alpha = Math.max(0, (n.duration - n.timer) / fadeOut);
      } else {
        n.alpha = 1;
      }
      if (n.timer >= n.duration) this.active.splice(i, 1);
    }
  }

  draw(ctx, W, H) {
    ctx.save();
    const colors = {
      info:        "#4488ff",
      success:     "#44ff88",
      warning:     "#ffaa00",
      error:       "#ff4444",
      achievement: "#ffdd00"
    };
    for (let i = 0; i < this.active.length; i++) {
      const n   = this.active[i];
      const y   = this.yOffset + i * this.spacing;
      const col = colors[n.type] || "#ffffff";
      ctx.globalAlpha = n.alpha;
      // Background
      ctx.fillStyle = "#00000099";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 160, y - 18, 320, 36, 8);
      ctx.fill();
      // Border
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.stroke();
      // Text
      ctx.fillStyle = "#ffffff";
      ctx.font      = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(n.message, W / 2, y + 6);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign   = "left";
    ctx.restore();
  }
}

if (typeof window !== "undefined") {
  window.HUD_CONFIG            = HUD_CONFIG;
  window.ACHIEVEMENTS          = ACHIEVEMENTS;
  window.LEADERBOARD_SCHEMA    = LEADERBOARD_SCHEMA;
  window.PLAYER_XP_TABLE       = PLAYER_XP_TABLE;
  window.SHOP_ITEMS            = SHOP_ITEMS;
  window.NotificationSystem    = NotificationSystem;
}
if (typeof module !== "undefined") {
  module.exports = { HUD_CONFIG, ACHIEVEMENTS, LEADERBOARD_SCHEMA,
    PLAYER_XP_TABLE, SHOP_ITEMS, NotificationSystem };
}

})();
// ============================================================
// PROCEDURAL_GENERATOR_V2 — Advanced procedural terrain (~60KB)
// ============================================================
(function() {
"use strict";

const PROCEDURAL_GENERATOR_V2 = {
  version: "2.0.0",
  description: "Advanced procedural terrain using fractal, Perlin noise, and feature placement algorithms",

  // ---- Midpoint Displacement / Diamond-Square ----
  fractal: {
    H: 0.5,
    roughness: 0.65,
    iterations: 8,

    midpointDisplacement: function(size, seed) {
      var arr = new Array(size + 1).fill(0);
      arr[0] = 0; arr[size] = 0;
      var scale = 1.0;
      var rng = this._seededRng(seed);
      for (var step = size; step > 1; step = Math.floor(step / 2)) {
        var half = Math.floor(step / 2);
        for (var i = 0; i < size; i += step) {
          var mid = Math.floor(i + half);
          arr[mid] = (arr[i] + arr[i + step]) / 2 + (rng() - 0.5) * scale * 200;
        }
        scale *= Math.pow(2, -PROCEDURAL_GENERATOR_V2.fractal.H);
      }
      return arr;
    },

    diamondSquare: function(n, seed) {
      var size = Math.pow(2, n) + 1;
      var grid = [];
      for (var i = 0; i < size; i++) { grid[i] = new Array(size).fill(0); }
      var rng = this._seededRng(seed);
      grid[0][0] = rng() * 100;
      grid[0][size-1] = rng() * 100;
      grid[size-1][0] = rng() * 100;
      grid[size-1][size-1] = rng() * 100;
      var stepSize = size - 1;
      var scale = 1.0;
      while (stepSize > 1) {
        var half = Math.floor(stepSize / 2);
        // Diamond step
        for (var y = 0; y < size-1; y += stepSize) {
          for (var x = 0; x < size-1; x += stepSize) {
            var avg = (grid[y][x] + grid[y][x+stepSize] + grid[y+stepSize][x] + grid[y+stepSize][x+stepSize]) / 4;
            grid[y+half][x+half] = avg + (rng()-0.5)*scale*100;
          }
        }
        // Square step
        for (var y2 = 0; y2 < size; y2 += half) {
          for (var x2 = (y2 + half) % stepSize; x2 < size; x2 += stepSize) {
            var count = 0; var sum = 0;
            if (y2-half >= 0)    { sum += grid[y2-half][x2]; count++; }
            if (y2+half < size)  { sum += grid[y2+half][x2]; count++; }
            if (x2-half >= 0)    { sum += grid[y2][x2-half]; count++; }
            if (x2+half < size)  { sum += grid[y2][x2+half]; count++; }
            grid[y2][x2] = sum/count + (rng()-0.5)*scale*100;
          }
        }
        stepSize = half;
        scale *= Math.pow(2, -PROCEDURAL_GENERATOR_V2.fractal.H);
      }
      return grid;
    },

    _seededRng: function(seed) {
      var s = seed || 12345;
      return function() {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
      };
    }
  },

  // ---- Perlin Noise ----
  perlin: {
    permutation: [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,
      69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,
      252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,
      171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,
      122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,
      63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,
      188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,
      38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
      223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
      172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,
      246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,
      235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,
      121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,
      128,195,78,66,215,61,156,180
    ],
    p: null,
    gradients: [
      [1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1],
      [1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]
    ],

    init: function() {
      if (!this.p) {
        this.p = new Array(512);
        for (var i=0; i<256; i++) this.p[i] = this.p[i+256] = this.permutation[i];
      }
    },

    fade: function(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
    lerp: function(a, b, t) { return a + t * (b - a); },
    grad: function(hash, x, y) {
      var g = this.gradients[hash & 15];
      return g[0]*x + g[1]*y;
    },

    noise2d: function(x, y) {
      this.init();
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      var u = this.fade(x), v = this.fade(y);
      var a = this.p[X]+Y, b = this.p[X+1]+Y;
      return this.lerp(
        this.lerp(this.grad(this.p[a],x,y),   this.grad(this.p[b],x-1,y),   u),
        this.lerp(this.grad(this.p[a+1],x,y-1),this.grad(this.p[b+1],x-1,y-1),u),
        v
      );
    },

    octaveNoise: function(x, y, octaves) {
      octaves = octaves || 6;
      var freqs = [1,2,4,8,16,32];
      var amps  = [1,0.5,0.25,0.125,0.0625,0.03125];
      var val = 0, maxVal = 0;
      for (var i=0; i<octaves; i++) {
        val    += this.noise2d(x*freqs[i], y*freqs[i]) * amps[i];
        maxVal += amps[i];
      }
      return val / maxVal;
    }
  },

  // ---- Feature Profiles ----
  featureProfiles: {
    flatSection: function(x, cx, width) {
      return Math.abs(x - cx) < width/2 ? 0 : null;
    },
    gaussian: function(x, cx, sigma, amplitude) {
      return amplitude * Math.exp(-0.5 * Math.pow((x-cx)/sigma, 2));
    },
    hill: function(x, cx, sigma, height) {
      return PROCEDURAL_GENERATOR_V2.featureProfiles.gaussian(x, cx, sigma, height);
    },
    valley: function(x, cx, sigma, depth) {
      return -PROCEDURAL_GENERATOR_V2.featureProfiles.gaussian(x, cx, sigma, depth);
    },
    cliff: function(x, cx, steepness, height) {
      return height / (1 + Math.exp(-steepness * (x - cx)));
    },
    ramp: function(x, x0, x1, h0, h1) {
      if (x <= x0) return h0;
      if (x >= x1) return h1;
      var t = (x-x0)/(x1-x0);
      t = t*t*(3-2*t); // smoothstep
      return h0 + t*(h1-h0);
    },
    gap: function(x, cx, width) {
      return Math.abs(x-cx) < width/2 ? Infinity : null; // null terrain = gap
    }
  },

  // ---- Difficulty Scaling ----
  difficultyParams: {
    1: { roughness:0.2, cliffFreq:0.02, gapFreq:0.01, hillAmp:40,  valleyDepth:30  },
    2: { roughness:0.3, cliffFreq:0.04, gapFreq:0.02, hillAmp:60,  valleyDepth:50  },
    3: { roughness:0.45,cliffFreq:0.06, gapFreq:0.04, hillAmp:90,  valleyDepth:80  },
    4: { roughness:0.6, cliffFreq:0.09, gapFreq:0.06, hillAmp:130, valleyDepth:110 },
    5: { roughness:0.8, cliffFreq:0.13, gapFreq:0.10, hillAmp:180, valleyDepth:160 },
  },

  // ---- Chunk-based Generation ----
  chunks: {},
  CHUNK_WIDTH: 512,
  POINTS_PER_CHUNK: 64,

  generateChunk: function(chunkX, seed, difficulty) {
    var key = chunkX + '_' + seed;
    if (this.chunks[key]) return this.chunks[key];
    var params = this.difficultyParams[difficulty] || this.difficultyParams[3];
    var pts = [];
    var baseRng = this.fractal._seededRng(seed ^ chunkX);
    for (var i=0; i<this.POINTS_PER_CHUNK; i++) {
      var worldX = chunkX * this.CHUNK_WIDTH + i * (this.CHUNK_WIDTH / this.POINTS_PER_CHUNK);
      var nx = worldX / 2000;
      var noiseH = this.perlin.octaveNoise(nx, seed*0.001, 6) * 200 * params.roughness;
      var featureH = 0;
      if (baseRng() < params.cliffFreq) {
        featureH += this.featureProfiles.cliff(i, this.POINTS_PER_CHUNK/2, 0.3, 80);
      }
      if (baseRng() < 0.15) {
        featureH += this.featureProfiles.hill(i, baseRng()*this.POINTS_PER_CHUNK, 8, params.hillAmp);
      }
      if (baseRng() < 0.10) {
        featureH += this.featureProfiles.valley(i, baseRng()*this.POINTS_PER_CHUNK, 6, params.valleyDepth);
      }
      pts.push({ x: worldX, y: 300 + noiseH + featureH, surface: 'dirt' });
    }
    this.chunks[key] = { chunkX: chunkX, seed: seed, difficulty: difficulty, points: pts };
    return this.chunks[key];
  },

  generateRange: function(startChunk, endChunk, seed, difficulty) {
    var result = [];
    for (var c=startChunk; c<=endChunk; c++) {
      result.push(this.generateChunk(c, seed, difficulty));
    }
    return result;
  },

  // ---- Seed management ----
  activeSeed: 0,
  setGlobalSeed: function(s) { this.activeSeed = s; this.chunks = {}; },

  // ---- Smoothing pass ----
  smoothTerrain: function(points, passes) {
    passes = passes || 2;
    var arr = points.slice();
    for (var p=0; p<passes; p++) {
      for (var i=1; i<arr.length-1; i++) {
        arr[i] = { x: arr[i].x, y: (arr[i-1].y + arr[i].y + arr[i+1].y)/3, surface: arr[i].surface };
      }
    }
    return arr;
  },

  // ---- Slope analysis ----
  slopeAt: function(points, idx) {
    if (idx <= 0 || idx >= points.length-1) return 0;
    return (points[idx+1].y - points[idx-1].y) / (points[idx+1].x - points[idx-1].x);
  },

  maxSlope: function(points) {
    var mx = 0;
    for (var i=1; i<points.length-1; i++) {
      var s = Math.abs(this.slopeAt(points, i));
      if (s > mx) mx = s;
    }
    return mx;
  }
};

// Extended feature library
const PROCEDURAL_FEATURE_LIBRARY = {
  version: "1.0.0",
  features: [
    { id:'plateau',    profile:'flat',     minWidth:200, maxWidth:800,  heightVariance:5  },
    { id:'hill_small', profile:'gaussian', sigma:50,     amplitude:60,  minGap:300        },
    { id:'hill_med',   profile:'gaussian', sigma:100,    amplitude:120, minGap:500        },
    { id:'hill_large', profile:'gaussian', sigma:200,    amplitude:220, minGap:800        },
    { id:'valley_sm',  profile:'gaussian', sigma:60,     amplitude:-50, minGap:400        },
    { id:'valley_lg',  profile:'gaussian', sigma:150,    amplitude:-150,minGap:700        },
    { id:'cliff_up',   profile:'sigmoid',  steepness:0.4,height:100,   minGap:600        },
    { id:'cliff_dn',   profile:'sigmoid',  steepness:0.4,height:-100,  minGap:600        },
    { id:'jump_ramp',  profile:'ramp',     length:80,    rise:60,       minGap:400        },
    { id:'gap_narrow', profile:'gap',      width:60,     minGap:500,    warning:true      },
    { id:'gap_wide',   profile:'gap',      width:120,    minGap:800,    warning:true      },
    { id:'wave',       profile:'sine',     wavelength:300,amplitude:40, minGap:200       },
    { id:'moguls',     profile:'sine',     wavelength:80, amplitude:25, minGap:150       },
    { id:'staircase',  profile:'stepped',  stepW:100,    stepH:30,      steps:5          },
    { id:'descent',    profile:'ramp',     length:500,   rise:-200,     minGap:1000      },
    { id:'ascent',     profile:'ramp',     length:500,   rise:200,      minGap:1000      },
  ],

  getFeatureById: function(id) {
    return this.features.find(function(f){ return f.id===id; }) || null;
  },

  randomFeature: function(rng, difficultyLevel) {
    var pool = this.features.filter(function(f){
      if (difficultyLevel < 3) return !f.id.startsWith('gap');
      return true;
    });
    return pool[Math.floor(rng() * pool.length)];
  }
};

// Noise texture pre-bake for performance
const NOISE_TEXTURE_CACHE = {
  cache: {},
  resolution: 256,

  bake: function(seed, width, height) {
    var key = seed+'_'+width+'_'+height;
    if (this.cache[key]) return this.cache[key];
    var data = new Array(width * height);
    for (var y=0; y<height; y++) {
      for (var x=0; x<width; x++) {
        data[y*width+x] = PROCEDURAL_GENERATOR_V2.perlin.octaveNoise(
          (x + seed) / width * 4,
          (y + seed) / height * 4,
          4
        );
      }
    }
    this.cache[key] = { width:width, height:height, data:data, seed:seed };
    return this.cache[key];
  },

  sample: function(key, nx, ny) {
    var t = this.cache[key];
    if (!t) return 0;
    var x = Math.floor(nx * t.width) % t.width;
    var y = Math.floor(ny * t.height) % t.height;
    return t.data[y*t.width+x];
  }
};

// Chunk overlap seaming
const CHUNK_SEAM_BLENDER = {
  blendWidth: 32,

  blend: function(leftChunk, rightChunk) {
    var leftPts  = leftChunk.points;
    var rightPts = rightChunk.points;
    var n = this.blendWidth;
    var result = leftPts.slice(0, leftPts.length - n);
    for (var i=0; i<n; i++) {
      var t = i/n;
      var lp = leftPts[leftPts.length - n + i];
      var rp = rightPts[i];
      result.push({
        x: lp.x + t*(rp.x - lp.x),
        y: lp.y + t*(rp.y - lp.y),
        surface: t < 0.5 ? lp.surface : rp.surface
      });
    }
    result = result.concat(rightPts.slice(n));
    return result;
  }
};

if (typeof window !== "undefined") {
  window.PROCEDURAL_GENERATOR_V2     = PROCEDURAL_GENERATOR_V2;
  window.PROCEDURAL_FEATURE_LIBRARY  = PROCEDURAL_FEATURE_LIBRARY;
  window.NOISE_TEXTURE_CACHE         = NOISE_TEXTURE_CACHE;
  window.CHUNK_SEAM_BLENDER          = CHUNK_SEAM_BLENDER;
}
if (typeof module !== "undefined") {
  module.exports = { PROCEDURAL_GENERATOR_V2, PROCEDURAL_FEATURE_LIBRARY, NOISE_TEXTURE_CACHE, CHUNK_SEAM_BLENDER };
}
})();

// ============================================================
// BIOME_SYSTEM_V2 — 20 biomes with full visual/physics data (~50KB)
// ============================================================
(function() {
"use strict";

const BIOME_SYSTEM_V2 = {
  version: "2.0.0",
  description: "20-biome system with transitions, weather, hazards and progression",

  biomes: {
    tropical_rainforest: {
      id:'tropical_rainforest', name:'Tropical Rainforest',
      tempRange:[22,38], humidityRange:[80,100],
      dominantSurface:'mud', altSurfaces:['grass','water'],
      skyColor:'#4a7c59', fogColor:'#6aab7d', ambientLight:0.75,
      vegetation:{ density:0.95, types:['palm','fern','vine','bamboo','mushroom'] },
      weatherProbability:{ rain:0.55, heavyRain:0.25, fog:0.10, clear:0.10 },
      fauna:['jaguar','toucan','snake','frog'],
      hazards:['flood','quicksand','falling_branch'],
      physics:{ gravity:9.81, groundFriction:0.55, airDrag:1.1 },
      bgGradient:['#1a3a2a','#2d5e40'],
      progression: 4, difficulty: 2
    },
    temperate_forest: {
      id:'temperate_forest', name:'Temperate Forest',
      tempRange:[5,20], humidityRange:[50,75],
      dominantSurface:'grass', altSurfaces:['dirt','mud','leaves'],
      skyColor:'#87ceeb', fogColor:'#c0dff0', ambientLight:0.85,
      vegetation:{ density:0.75, types:['oak','pine','bush','mushroom','flower'] },
      weatherProbability:{ rain:0.30, snow:0.05, fog:0.15, clear:0.50 },
      fauna:['deer','rabbit','owl','bear'],
      hazards:['fallen_tree','mudslide','ice_patch'],
      physics:{ gravity:9.81, groundFriction:0.70, airDrag:1.0 },
      bgGradient:['#2a4a2a','#4a7a3a'],
      progression: 1, difficulty: 1
    },
    taiga: {
      id:'taiga', name:'Taiga',
      tempRange:[-20,10], humidityRange:[40,65],
      dominantSurface:'snow', altSurfaces:['ice','permafrost','rock'],
      skyColor:'#7ab0cc', fogColor:'#c8dae8', ambientLight:0.60,
      vegetation:{ density:0.50, types:['pine','spruce','dead_tree','lichen'] },
      weatherProbability:{ snow:0.45, blizzard:0.15, fog:0.20, clear:0.20 },
      fauna:['wolf','moose','reindeer','snow_owl'],
      hazards:['blizzard','ice_crack','frozen_lake'],
      physics:{ gravity:9.81, groundFriction:0.30, airDrag:1.05 },
      bgGradient:['#1a2a3a','#3a5a6a'],
      progression: 6, difficulty: 3
    },
    tundra: {
      id:'tundra', name:'Tundra',
      tempRange:[-40,-5], humidityRange:[20,50],
      dominantSurface:'permafrost', altSurfaces:['snow','ice','gravel'],
      skyColor:'#b0c8d8', fogColor:'#d8e8f0', ambientLight:0.50,
      vegetation:{ density:0.10, types:['lichen','moss','arctic_flower'] },
      weatherProbability:{ snow:0.50, blizzard:0.25, clear:0.25 },
      fauna:['arctic_fox','musk_ox','polar_bear'],
      hazards:['whiteout','ice_crack','permafrost_collapse'],
      physics:{ gravity:9.81, groundFriction:0.25, airDrag:1.15 },
      bgGradient:['#0a1a2a','#2a4a5a'],
      progression: 8, difficulty: 4
    },
    hot_desert: {
      id:'hot_desert', name:'Hot Desert',
      tempRange:[30,55], humidityRange:[0,15],
      dominantSurface:'sand', altSurfaces:['rock','sandstone','dune'],
      skyColor:'#f0c060', fogColor:'#f8e0a0', ambientLight:1.0,
      vegetation:{ density:0.05, types:['cactus','tumbleweed','desert_shrub'] },
      weatherProbability:{ sandstorm:0.20, clear:0.70, heat_wave:0.10 },
      fauna:['scorpion','camel','rattlesnake','vulture'],
      hazards:['sandstorm','quicksand','extreme_heat'],
      physics:{ gravity:9.81, groundFriction:0.40, airDrag:0.95 },
      bgGradient:['#8a6020','#c0901a'],
      progression: 3, difficulty: 2
    },
    cold_desert: {
      id:'cold_desert', name:'Cold Desert',
      tempRange:[-15,20], humidityRange:[5,25],
      dominantSurface:'gravel', altSurfaces:['rock','sand','salt_flat'],
      skyColor:'#a0b8c0', fogColor:'#c8d8e0', ambientLight:0.80,
      vegetation:{ density:0.03, types:['sagebrush','rock_plant'] },
      weatherProbability:{ wind:0.35, dust_devil:0.10, clear:0.55 },
      fauna:['coyote','hawk','lizard'],
      hazards:['dust_devil','flash_flood','frost'],
      physics:{ gravity:9.81, groundFriction:0.50, airDrag:1.0 },
      bgGradient:['#5a6a70','#8a9aa0'],
      progression: 2, difficulty: 1
    },
    savanna: {
      id:'savanna', name:'Savanna',
      tempRange:[20,35], humidityRange:[20,45],
      dominantSurface:'dry_grass', altSurfaces:['dirt','clay','rock'],
      skyColor:'#e8c870', fogColor:'#f0d890', ambientLight:0.95,
      vegetation:{ density:0.25, types:['acacia','baobab','thorn_bush','grass_tall'] },
      weatherProbability:{ clear:0.60, rain:0.15, dry_season:0.25 },
      fauna:['lion','elephant','zebra','giraffe'],
      hazards:['wildfire','dust_storm','animal_stampede'],
      physics:{ gravity:9.81, groundFriction:0.65, airDrag:0.98 },
      bgGradient:['#7a5a20','#a87a30'],
      progression: 2, difficulty: 1
    },
    grassland: {
      id:'grassland', name:'Grassland',
      tempRange:[5,25], humidityRange:[30,60],
      dominantSurface:'grass', altSurfaces:['dirt','mud','clay'],
      skyColor:'#87ceeb', fogColor:'#c8e8f8', ambientLight:0.90,
      vegetation:{ density:0.60, types:['grass','flower','bush','hay_bale'] },
      weatherProbability:{ clear:0.55, rain:0.25, wind:0.20 },
      fauna:['rabbit','pheasant','horse','bison'],
      hazards:['tornado','wildfire'],
      physics:{ gravity:9.81, groundFriction:0.72, airDrag:1.0 },
      bgGradient:['#3a6a2a','#60a040'],
      progression: 1, difficulty: 1
    },
    wetland: {
      id:'wetland', name:'Wetland',
      tempRange:[10,28], humidityRange:[85,100],
      dominantSurface:'mud', altSurfaces:['water','grass','reed'],
      skyColor:'#6a8a70', fogColor:'#8aaa90', ambientLight:0.65,
      vegetation:{ density:0.80, types:['reed','cattail','lily_pad','willow','fern'] },
      weatherProbability:{ fog:0.35, rain:0.40, clear:0.25 },
      fauna:['crocodile','heron','frog','mosquito_swarm'],
      hazards:['sinkhole','quicksand','flood','slippery_mud'],
      physics:{ gravity:9.81, groundFriction:0.25, airDrag:1.05 },
      bgGradient:['#2a4a3a','#4a6a50'],
      progression: 5, difficulty: 3
    },
    mangrove: {
      id:'mangrove', name:'Mangrove',
      tempRange:[22,35], humidityRange:[75,95],
      dominantSurface:'mud', altSurfaces:['shallow_water','sand'],
      skyColor:'#5a8878', fogColor:'#7aa898', ambientLight:0.70,
      vegetation:{ density:0.88, types:['mangrove','seagrass','coral','vine'] },
      weatherProbability:{ rain:0.45, fog:0.25, clear:0.30 },
      fauna:['crab','manatee','flamingo','barracuda'],
      hazards:['tidal_surge','root_tangle','saltwater_flood'],
      physics:{ gravity:9.81, groundFriction:0.20, airDrag:1.1 },
      bgGradient:['#1a3a3a','#3a5a58'],
      progression: 7, difficulty: 4
    },
    alpine: {
      id:'alpine', name:'Alpine',
      tempRange:[-15,10], humidityRange:[30,60],
      dominantSurface:'rock', altSurfaces:['snow','ice','gravel','alpine_grass'],
      skyColor:'#5a90d0', fogColor:'#8ab8e8', ambientLight:0.92,
      vegetation:{ density:0.20, types:['alpine_flower','lichen','pine_stunted'] },
      weatherProbability:{ snow:0.30, wind:0.30, clear:0.40 },
      fauna:['ibex','eagle','marmot','snow_leopard'],
      hazards:['avalanche','rockfall','lightning','thin_air'],
      physics:{ gravity:9.81, groundFriction:0.45, airDrag:0.88 },
      bgGradient:['#2a3a5a','#4a6a9a'],
      progression: 9, difficulty: 5
    },
    volcanic: {
      id:'volcanic', name:'Volcanic',
      tempRange:[40,80], humidityRange:[10,40],
      dominantSurface:'lava_rock', altSurfaces:['ash','obsidian','lava'],
      skyColor:'#8a3020', fogColor:'#c06050', ambientLight:0.55,
      vegetation:{ density:0.02, types:['volcanic_lichen','alien_plant'] },
      weatherProbability:{ ash_fall:0.40, clear:0.35, eruption_nearby:0.25 },
      fauna:['heat_lizard','lava_bird'],
      hazards:['lava_flow','eruption','lava_bomb','poison_gas','ground_crack'],
      physics:{ gravity:9.81, groundFriction:0.60, airDrag:1.15 },
      bgGradient:['#3a1000','#6a2010'],
      progression: 10, difficulty: 5
    },
    coastal: {
      id:'coastal', name:'Coastal',
      tempRange:[15,30], humidityRange:[60,80],
      dominantSurface:'sand', altSurfaces:['rock','shallow_water','grass'],
      skyColor:'#48aaee', fogColor:'#88ccf0', ambientLight:1.0,
      vegetation:{ density:0.30, types:['palm','sea_grass','bush','flower'] },
      weatherProbability:{ clear:0.60, rain:0.20, storm:0.10, fog:0.10 },
      fauna:['seagull','crab','seal','dolphin'],
      hazards:['high_tide','rogue_wave','beach_storm'],
      physics:{ gravity:9.81, groundFriction:0.50, airDrag:1.02 },
      bgGradient:['#1a6088','#3080b0'],
      progression: 3, difficulty: 2
    },
    oceanic: {
      id:'oceanic', name:'Oceanic Island',
      tempRange:[20,32], humidityRange:[70,90],
      dominantSurface:'sand', altSurfaces:['coral','rock','shallow_water'],
      skyColor:'#3098e8', fogColor:'#70c0f0', ambientLight:1.0,
      vegetation:{ density:0.45, types:['palm','tropical_bush','seaweed','coral_above'] },
      weatherProbability:{ clear:0.50, rain:0.25, typhoon:0.05, fog:0.20 },
      fauna:['parrot','sea_turtle','shark','tropical_fish'],
      hazards:['typhoon','coral_cut','rip_current'],
      physics:{ gravity:9.81, groundFriction:0.55, airDrag:1.05 },
      bgGradient:['#006090','#0080b8'],
      progression: 4, difficulty: 2
    },
    arctic_sea: {
      id:'arctic_sea', name:'Arctic Sea',
      tempRange:[-50,-10], humidityRange:[50,80],
      dominantSurface:'ice', altSurfaces:['snow','slush','open_water'],
      skyColor:'#8ac0d8', fogColor:'#c0d8e8', ambientLight:0.40,
      vegetation:{ density:0.02, types:['arctic_moss','ice_algae'] },
      weatherProbability:{ blizzard:0.40, snow:0.35, clear:0.25 },
      fauna:['polar_bear','walrus','seal','orca'],
      hazards:['ice_break','polar_vortex','white_out','frostbite'],
      physics:{ gravity:9.81, groundFriction:0.15, airDrag:1.2 },
      bgGradient:['#081828','#182838'],
      progression: 11, difficulty: 5
    },
    underground: {
      id:'underground', name:'Underground Cavern',
      tempRange:[8,18], humidityRange:[60,95],
      dominantSurface:'stone', altSurfaces:['dirt','crystal','mud','lava_rock'],
      skyColor:'#000000', fogColor:'#101020', ambientLight:0.25,
      vegetation:{ density:0.15, types:['mushroom','glow_lichen','crystal_plant'] },
      weatherProbability:{ drip:0.50, crystal_shower:0.10, clear:0.40 },
      fauna:['bat','cave_spider','glowworm','blind_fish'],
      hazards:['cave_in','gas_pocket','underground_flood','stalactite_drop'],
      physics:{ gravity:9.81, groundFriction:0.65, airDrag:0.90 },
      bgGradient:['#080810','#101820'],
      progression: 7, difficulty: 4
    },
    urban: {
      id:'urban', name:'Urban City',
      tempRange:[10,30], humidityRange:[30,60],
      dominantSurface:'asphalt', altSurfaces:['concrete','steel_grate','cobblestone'],
      skyColor:'#7090a8', fogColor:'#a8b8c0', ambientLight:0.80,
      vegetation:{ density:0.05, types:['potted_plant','street_tree'] },
      weatherProbability:{ rain:0.25, smog:0.30, clear:0.45 },
      fauna:['pigeon','rat','stray_cat'],
      hazards:['traffic','sewer_burst','construction_hazard'],
      physics:{ gravity:9.81, groundFriction:0.85, airDrag:1.0 },
      bgGradient:['#303840','#505860'],
      progression: 2, difficulty: 1
    },
    industrial: {
      id:'industrial', name:'Industrial Zone',
      tempRange:[15,35], humidityRange:[20,50],
      dominantSurface:'steel_grate', altSurfaces:['concrete','asphalt','oil_slick'],
      skyColor:'#607080', fogColor:'#8090a0', ambientLight:0.65,
      vegetation:{ density:0.01, types:['weeds'] },
      weatherProbability:{ smog:0.50, acid_rain:0.20, clear:0.30 },
      fauna:['rat','pigeon'],
      hazards:['chemical_spill','explosion','electric_hazard','moving_machinery'],
      physics:{ gravity:9.81, groundFriction:0.75, airDrag:1.05 },
      bgGradient:['#283040','#384050'],
      progression: 5, difficulty: 3
    },
    ruins: {
      id:'ruins', name:'Ancient Ruins',
      tempRange:[15,30], humidityRange:[30,65],
      dominantSurface:'stone', altSurfaces:['sand','dirt','rubble','grass'],
      skyColor:'#b0905a', fogColor:'#d0b080', ambientLight:0.75,
      vegetation:{ density:0.35, types:['vine','bush','dead_tree','moss'] },
      weatherProbability:{ clear:0.55, wind:0.25, dust:0.20 },
      fauna:['snake','vulture','scarab'],
      hazards:['collapsing_floor','hidden_pit','falling_pillar','cursed_zone'],
      physics:{ gravity:9.81, groundFriction:0.60, airDrag:0.98 },
      bgGradient:['#5a4020','#7a6030'],
      progression: 6, difficulty: 3
    },
    fantasy: {
      id:'fantasy', name:'Fantasy Land',
      tempRange:[15,25], humidityRange:[40,70],
      dominantSurface:'crystal_grass', altSurfaces:['cloud_platform','magic_stone','rainbow_path'],
      skyColor:'#8840e0', fogColor:'#a060f8', ambientLight:1.1,
      vegetation:{ density:0.70, types:['crystal','alien','mushroom_giant','glowing_flower'] },
      weatherProbability:{ magic_storm:0.15, sparkle:0.30, clear:0.55 },
      fauna:['dragon','unicorn','fairy','phoenix'],
      hazards:['magic_bolt','gravity_flip','teleport_trap','time_slow_zone'],
      physics:{ gravity:7.0, groundFriction:0.80, airDrag:0.85 },
      bgGradient:['#200050','#500080'],
      progression: 12, difficulty: 5
    }
  },

  // Transition zones
  transitions: {
    blendWidth: 200, // pixels

    getTransition: function(biomeA, biomeB) {
      return {
        fromBiome: biomeA,
        toBiome: biomeB,
        width: this.blendWidth,
        blendFn: function(t) { return t*t*(3-2*t); }, // smoothstep
        surfaceBlend: true,
        colorBlend: true,
        physicsBlend: true
      };
    },

    samplePhysics: function(biomeA, biomeB, t) {
      var bA = BIOME_SYSTEM_V2.biomes[biomeA] || BIOME_SYSTEM_V2.biomes.grassland;
      var bB = BIOME_SYSTEM_V2.biomes[biomeB] || BIOME_SYSTEM_V2.biomes.grassland;
      var bt = t*t*(3-2*t);
      return {
        gravity:       bA.physics.gravity      * (1-bt) + bB.physics.gravity      * bt,
        groundFriction:bA.physics.groundFriction*(1-bt) + bB.physics.groundFriction* bt,
        airDrag:       bA.physics.airDrag      * (1-bt) + bB.physics.airDrag      * bt
      };
    }
  },

  // Biome progression order
  progressionOrder: [
    'grassland','cold_desert','savanna','urban','hot_desert','coastal',
    'tropical_rainforest','oceanic','wetland','industrial','taiga','underground',
    'ruins','alpine','volcanic','mangrove','ruins','arctic_sea','tundra',
    'fantasy','volcanic'
  ],

  // Season modifiers
  seasons: {
    spring: { tempMod:+5,  humidityMod:+10, weatherMod:{ rain:+0.15, snow:-0.15 } },
    summer: { tempMod:+15, humidityMod:-5,  weatherMod:{ clear:+0.20, rain:-0.05 } },
    autumn: { tempMod:0,   humidityMod:+5,  weatherMod:{ wind:+0.10, fog:+0.10   } },
    winter: { tempMod:-15, humidityMod:-10, weatherMod:{ snow:+0.20, clear:-0.10  } }
  },

  getBiomeById: function(id) { return this.biomes[id] || null; },

  getBiomeForProgress: function(progressPct) {
    var idx = Math.min(Math.floor(progressPct / 100 * this.progressionOrder.length),
                       this.progressionOrder.length-1);
    return this.biomes[this.progressionOrder[idx]];
  },

  getAllBiomeIds: function() { return Object.keys(this.biomes); }
};

// Weather probability tables per biome (extended detail)
const BIOME_WEATHER_TABLES = {
  version: "1.0.0",
  tables: (function() {
    var t = {};
    var ids = Object.keys(BIOME_SYSTEM_V2.biomes);
    ids.forEach(function(id) {
      var b = BIOME_SYSTEM_V2.biomes[id];
      t[id] = {
        hourly:   b.weatherProbability,
        daily:    Object.assign({}, b.weatherProbability),
        seasonal: {
          spring: Object.assign({}, b.weatherProbability),
          summer: Object.assign({}, b.weatherProbability),
          autumn: Object.assign({}, b.weatherProbability),
          winter: Object.assign({}, b.weatherProbability)
        }
      };
    });
    return t;
  }())
};

if (typeof window !== "undefined") {
  window.BIOME_SYSTEM_V2         = BIOME_SYSTEM_V2;
  window.BIOME_WEATHER_TABLES    = BIOME_WEATHER_TABLES;
}
if (typeof module !== "undefined") {
  module.exports = { BIOME_SYSTEM_V2, BIOME_WEATHER_TABLES };
}
})();

// ============================================================
// TERRAIN_DECORATION_V2 — 100+ decoration types, placement, LOD (~50KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_DECORATION_V2 = {
  version: "2.0.0",
  description: "Decoration placement system with Poisson disk sampling, layer ordering and LOD",

  // ---- TREES ----
  trees: [
    { id:'oak',        width:80,  height:120, rootRadius:10, canopyShape:'round',    collisionRadius:35, biomes:['temperate_forest','grassland','urban'] },
    { id:'pine',       width:45,  height:150, rootRadius:8,  canopyShape:'cone',     collisionRadius:20, biomes:['temperate_forest','taiga','alpine'] },
    { id:'palm',       width:30,  height:100, rootRadius:6,  canopyShape:'feather',  collisionRadius:18, biomes:['coastal','tropical_rainforest','oceanic'] },
    { id:'cactus',     width:25,  height:60,  rootRadius:5,  canopyShape:'cylindrical',collisionRadius:12,biomes:['hot_desert','cold_desert'] },
    { id:'bamboo',     width:10,  height:180, rootRadius:4,  canopyShape:'cluster',  collisionRadius:8,  biomes:['tropical_rainforest','wetland'] },
    { id:'mushroom',   width:60,  height:80,  rootRadius:12, canopyShape:'dome',     collisionRadius:28, biomes:['underground','fantasy','wetland'] },
    { id:'crystal',    width:30,  height:90,  rootRadius:5,  canopyShape:'prism',    collisionRadius:15, biomes:['fantasy','underground'] },
    { id:'alien',      width:70,  height:130, rootRadius:15, canopyShape:'tentacle', collisionRadius:32, biomes:['fantasy','volcanic'] },
    { id:'dead_tree',  width:50,  height:100, rootRadius:8,  canopyShape:'bare',     collisionRadius:20, biomes:['ruins','tundra','taiga'] },
    { id:'willow',     width:120, height:100, rootRadius:20, canopyShape:'drooping', collisionRadius:55, biomes:['wetland','temperate_forest'] },
    { id:'acacia',     width:160, height:80,  rootRadius:15, canopyShape:'flat_top', collisionRadius:70, biomes:['savanna'] },
    { id:'baobab',     width:90,  height:80,  rootRadius:40, canopyShape:'bottle',   collisionRadius:45, biomes:['savanna','hot_desert'] },
    { id:'spruce',     width:40,  height:160, rootRadius:8,  canopyShape:'cone',     collisionRadius:18, biomes:['taiga','alpine'] },
    { id:'mangrove',   width:80,  height:90,  rootRadius:30, canopyShape:'spread',   collisionRadius:40, biomes:['mangrove','coastal'] },
    { id:'fern_tree',  width:60,  height:70,  rootRadius:10, canopyShape:'frond',    collisionRadius:25, biomes:['tropical_rainforest'] },
  ],

  // ---- ROCKS ----
  rocks: [
    { id:'pebble',     size:'tiny',   width:10,  height:8,   shape:'round',     stackable:true,  color:'#808080' },
    { id:'cobblestone',size:'small',  width:20,  height:15,  shape:'irregular', stackable:true,  color:'#706860' },
    { id:'boulder_sm', size:'medium', width:50,  height:40,  shape:'round',     stackable:false, color:'#787070' },
    { id:'boulder_lg', size:'large',  width:100, height:80,  shape:'jagged',    stackable:false, color:'#686060' },
    { id:'cliff_face', size:'huge',   width:200, height:250, shape:'flat_face', stackable:false, color:'#706850' },
    { id:'crystal_sm', size:'small',  width:25,  height:40,  shape:'prism',     stackable:false, color:'#a0c8e8' },
    { id:'crystal_lg', size:'large',  width:60,  height:100, shape:'prism',     stackable:false, color:'#80aacc' },
    { id:'obsidian',   size:'medium', width:45,  height:60,  shape:'sharp',     stackable:false, color:'#202020' },
    { id:'lava_rock',  size:'medium', width:55,  height:45,  shape:'rough',     stackable:false, color:'#3a2010' },
    { id:'sandstone',  size:'large',  width:120, height:90,  shape:'layered',   stackable:false, color:'#c0a060' },
    { id:'ice_block',  size:'medium', width:50,  height:50,  shape:'cube',      stackable:true,  color:'#c8e8f8' },
    { id:'ruins_pillar',size:'large', width:30,  height:120, shape:'cylinder',  stackable:false, color:'#c8c0a8' },
  ],

  // ---- STRUCTURES ----
  structures: [
    { id:'ruin_wall',     width:80,  height:60,  destructible:true,  interactive:false, biomes:['ruins'] },
    { id:'ruin_arch',     width:120, height:100, destructible:false, interactive:false, biomes:['ruins'] },
    { id:'fence_wood',    width:200, height:30,  destructible:true,  interactive:false, biomes:['grassland','temperate_forest'] },
    { id:'fence_stone',   width:200, height:40,  destructible:false, interactive:false, biomes:['urban','ruins'] },
    { id:'bridge_wood',   width:300, height:20,  destructible:true,  interactive:true,  biomes:['temperate_forest','wetland'] },
    { id:'bridge_stone',  width:350, height:25,  destructible:false, interactive:false, biomes:['urban','ruins'] },
    { id:'building_sm',   width:150, height:120, destructible:false, interactive:true,  biomes:['urban','industrial'] },
    { id:'building_lg',   width:300, height:250, destructible:false, interactive:false, biomes:['urban'] },
    { id:'tower',         width:60,  height:200, destructible:false, interactive:false, biomes:['ruins','fantasy','urban'] },
    { id:'vehicle_wreck', width:120, height:60,  destructible:true,  interactive:false, biomes:['ruins','industrial','urban'] },
    { id:'wind_turbine',  width:50,  height:300, destructible:false, interactive:true,  biomes:['grassland','coastal'] },
    { id:'pipeline',      width:400, height:30,  destructible:false, interactive:false, biomes:['industrial'] },
    { id:'crane',         width:100, height:250, destructible:false, interactive:false, biomes:['industrial','urban'] },
    { id:'lighthouse',    width:40,  height:180, destructible:false, interactive:false, biomes:['coastal'] },
    { id:'igloo',         width:80,  height:60,  destructible:false, interactive:true,  biomes:['arctic_sea','tundra'] },
    { id:'cave_entrance', width:100, height:80,  destructible:false, interactive:true,  biomes:['underground','alpine'] },
    { id:'pyramid_sm',    width:200, height:150, destructible:false, interactive:false, biomes:['hot_desert','ruins'] },
    { id:'temple_pillar', width:40,  height:160, destructible:false, interactive:false, biomes:['ruins','fantasy'] },
  ],

  // ---- PROPS ----
  props: [
    { id:'barrel',       width:25,  height:35,  animated:false, physics:true,  destructible:true  },
    { id:'crate_sm',     width:30,  height:30,  animated:false, physics:true,  destructible:true  },
    { id:'crate_lg',     width:60,  height:60,  animated:false, physics:true,  destructible:false },
    { id:'tire',         width:40,  height:40,  animated:false, physics:true,  destructible:false },
    { id:'tire_stack',   width:50,  height:120, animated:false, physics:false, destructible:true  },
    { id:'pipe_horiz',   width:200, height:20,  animated:false, physics:false, destructible:false },
    { id:'pipe_vert',    width:20,  height:150, animated:false, physics:false, destructible:false },
    { id:'platform_sm',  width:100, height:15,  animated:true,  physics:false, destructible:false },
    { id:'platform_lg',  width:200, height:15,  animated:true,  physics:false, destructible:false },
    { id:'springboard',  width:60,  height:20,  animated:true,  physics:false, destructible:false },
    { id:'see_saw',      width:150, height:15,  animated:true,  physics:true,  destructible:false },
    { id:'roller',       width:40,  height:40,  animated:true,  physics:true,  destructible:false },
    { id:'fuel_drum',    width:30,  height:45,  animated:false, physics:true,  destructible:true  },
    { id:'hay_bale',     width:60,  height:50,  animated:false, physics:true,  destructible:false },
    { id:'snowman',      width:30,  height:60,  animated:false, physics:true,  destructible:true  },
    { id:'traffic_cone', width:15,  height:30,  animated:false, physics:true,  destructible:true  },
    { id:'sign_warning', width:30,  height:50,  animated:false, physics:false, destructible:false },
    { id:'lamp_post',    width:10,  height:80,  animated:true,  physics:false, destructible:false },
  ],

  // ---- VEGETATION ----
  vegetation: [
    { id:'grass_short',  density:0.90, windSway:0.10, seasonal:true,  height:10 },
    { id:'grass_tall',   density:0.60, windSway:0.25, seasonal:true,  height:30 },
    { id:'bush_sm',      density:0.40, windSway:0.15, seasonal:true,  height:40 },
    { id:'bush_lg',      density:0.20, windSway:0.12, seasonal:true,  height:70 },
    { id:'flower_red',   density:0.25, windSway:0.30, seasonal:true,  height:20 },
    { id:'flower_blue',  density:0.20, windSway:0.30, seasonal:true,  height:18 },
    { id:'flower_yellow',density:0.20, windSway:0.30, seasonal:true,  height:22 },
    { id:'vine',         density:0.30, windSway:0.20, seasonal:true,  height:100 },
    { id:'reed',         density:0.70, windSway:0.40, seasonal:false, height:150 },
    { id:'cattail',      density:0.60, windSway:0.35, seasonal:false, height:120 },
    { id:'seaweed',      density:0.50, windSway:0.50, seasonal:false, height:80 },
    { id:'lichen',       density:0.80, windSway:0.02, seasonal:false, height:5  },
    { id:'moss',         density:0.75, windSway:0.03, seasonal:false, height:8  },
    { id:'fern',         density:0.45, windSway:0.20, seasonal:true,  height:50 },
    { id:'glow_lichen',  density:0.30, windSway:0.01, seasonal:false, height:6  },
    { id:'tumbleweed',   density:0.15, windSway:1.00, seasonal:false, height:40 },
    { id:'sagebrush',    density:0.35, windSway:0.10, seasonal:false, height:45 },
    { id:'arctic_flower',density:0.10, windSway:0.05, seasonal:true,  height:8  },
  ],

  // ---- POISSON DISK SAMPLING ----
  poissonDisk: {
    minDist: 80,
    maxAttempts: 30,

    generate: function(width, minDist, seed) {
      minDist = minDist || this.minDist;
      var cellSize = minDist / Math.SQRT2;
      var cols = Math.ceil(width / cellSize);
      var grid = new Array(cols).fill(null);
      var active = [], pts = [];
      var rng = (function(s){ return function(){ s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; }; })(seed||42);
      var first = { x: rng()*width };
      pts.push(first); active.push(first);
      var gc = Math.floor(first.x/cellSize);
      if (gc>=0&&gc<cols) grid[gc]=first;
      while (active.length > 0) {
        var ri = Math.floor(rng()*active.length);
        var base = active[ri];
        var found = false;
        for (var k=0; k<this.maxAttempts; k++) {
          var angle = rng()*Math.PI*2;
          var dist  = minDist*(1+rng());
          var nx    = base.x + Math.cos(angle)*dist;
          if (nx<0||nx>width) continue;
          var nc = Math.floor(nx/cellSize);
          var ok = true;
          for (var dc=-2; dc<=2; dc++) {
            var c2=nc+dc;
            if (c2>=0&&c2<cols&&grid[c2]) {
              var dx=grid[c2].x-nx;
              if (dx*dx < minDist*minDist) { ok=false; break; }
            }
          }
          if (ok) { var np={x:nx}; pts.push(np); active.push(np); grid[nc]=np; found=true; break; }
        }
        if (!found) active.splice(ri,1);
      }
      return pts;
    }
  },

  // ---- LAYER ORDER ----
  renderLayers: [
    { name:'background_far',  zIndex:0,   types:['biome_backdrop'] },
    { name:'background',      zIndex:10,  types:['vegetation_bg','distant_structures'] },
    { name:'terrain',         zIndex:20,  types:['terrain_surface'] },
    { name:'decoration_back', zIndex:30,  types:['rocks','vegetation','trees_back'] },
    { name:'objects',         zIndex:40,  types:['props','structures','trees_front'] },
    { name:'foreground',      zIndex:50,  types:['particles','effects'] },
    { name:'vehicle',         zIndex:60,  types:['vehicle'] },
    { name:'hud',             zIndex:100, types:['ui','hud'] },
  ],

  // ---- LOD LEVELS ----
  lod: {
    levels: [
      { name:'high',   maxDist:600,  drawDetail:true,  animEnabled:true,  shadowEnabled:true  },
      { name:'medium', maxDist:1200, drawDetail:false, animEnabled:true,  shadowEnabled:false },
      { name:'low',    maxDist:2400, drawDetail:false, animEnabled:false, shadowEnabled:false },
      { name:'cull',   maxDist:Infinity, draw:false }
    ],

    getLOD: function(dist) {
      for (var i=0; i<this.levels.length; i++) {
        if (dist < this.levels[i].maxDist) return this.levels[i];
      }
      return this.levels[this.levels.length-1];
    }
  },

  // ---- VIEWPORT CULLING ----
  cull: function(decorations, viewX, viewWidth) {
    var margin = 200;
    return decorations.filter(function(d) {
      return d.x + d.width >= viewX - margin &&
             d.x           <= viewX + viewWidth + margin;
    });
  },

  // ---- PLACEMENT UTILITY ----
  placeDecorations: function(terrainPoints, biomeId, seed) {
    var biome = BIOME_SYSTEM_V2 ? BIOME_SYSTEM_V2.biomes[biomeId] : null;
    var density = biome ? biome.vegetation.density : 0.5;
    var width = terrainPoints[terrainPoints.length-1].x - terrainPoints[0].x;
    var minDist = Math.max(30, 120 * (1-density));
    var positions = this.poissonDisk.generate(width, minDist, seed);
    var placed = [];
    var rng = (function(s){ return function(){ s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; }; })(seed*2+7);
    positions.forEach(function(pos) {
      var worldX = pos.x + terrainPoints[0].x;
      var nearPt = terrainPoints.reduce(function(best,tp) {
        return Math.abs(tp.x-worldX) < Math.abs(best.x-worldX) ? tp : best;
      }, terrainPoints[0]);
      var cat = rng() < 0.6 ? 'vegetation' : rng() < 0.5 ? 'trees' : 'rocks';
      placed.push({ category:cat, x:worldX, y:nearPt.y, biome:biomeId });
    });
    return placed;
  }
};

if (typeof window !== "undefined") { window.TERRAIN_DECORATION_V2 = TERRAIN_DECORATION_V2; }
if (typeof module !== "undefined") { module.exports = { TERRAIN_DECORATION_V2 }; }
})();

// ============================================================
// TERRAIN_EVENTS_ENGINE — Dynamic terrain events (~40KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_EVENTS_ENGINE = {
  version: "1.0.0",
  description: "Dynamic terrain events triggered during gameplay",

  // ---- Event type definitions ----
  eventTypes: {
    landslide: {
      id:'landslide', name:'Landslide',
      duration:5000, // ms
      warningTime:2000,
      warningSound:'rumble_distant',
      warningVisual:'dust_cloud',
      triggerConditions:{ nearSlope:true, minSlopeDeg:35, vehicleProximity:600 },
      effect: function(state, dt) {
        state.boulders = state.boulders || [];
        if (state.elapsed < state.spawnDuration) {
          if (Math.random() < 0.05) {
            state.boulders.push({
              x: state.originX + (Math.random()-0.5)*100,
              y: state.originY - 50,
              vx: (Math.random()-0.5)*200,
              vy: 0,
              radius: 15 + Math.random()*25
            });
          }
        }
        state.boulders.forEach(function(b) {
          b.vy += 9.81 * dt;
          b.x  += b.vx * dt;
          b.y  += b.vy * dt;
        });
      }
    },
    earthquake: {
      id:'earthquake', name:'Earthquake',
      duration:3000,
      warningTime:500,
      warningSound:'low_rumble',
      warningVisual:'screen_shake',
      triggerConditions:{ random:true, probability:0.001, minDistance:2000 },
      maxShiftX:20, maxShiftY:20,
      effect: function(state, dt) {
        var t = state.elapsed / state.duration;
        var intensity = Math.sin(t*Math.PI) * (1-t*0.3);
        state.shiftX = (Math.random()-0.5) * TERRAIN_EVENTS_ENGINE.eventTypes.earthquake.maxShiftX * intensity;
        state.shiftY = (Math.random()-0.5) * TERRAIN_EVENTS_ENGINE.eventTypes.earthquake.maxShiftY * intensity;
      }
    },
    flood: {
      id:'flood', name:'Flood',
      duration:10000,
      warningTime:3000,
      warningSound:'water_rushing',
      warningVisual:'water_rising_indicator',
      triggerConditions:{ biome:'wetland', rain:true, vehicleProximity:1200 },
      riseRate:5, // px per second
      maxRise:50,
      effect: function(state, dt) {
        state.waterLevel = state.waterLevel || state.originY;
        var rise = TERRAIN_EVENTS_ENGINE.eventTypes.flood.riseRate * dt;
        state.waterLevel = Math.max(state.waterLevel - rise,
          state.originY - TERRAIN_EVENTS_ENGINE.eventTypes.flood.maxRise);
      }
    },
    lightning_strike: {
      id:'lightning_strike', name:'Lightning Strike',
      duration:200,
      warningTime:1500,
      warningSound:'thunder_distant',
      warningVisual:'lightning_flash',
      triggerConditions:{ weather:'storm', random:true, probability:0.0005 },
      damageRadius:80, damage:30,
      effect: function(state, dt) {
        state.flash = state.elapsed < 100;
        state.hitX  = state.originX + (Math.random()-0.5)*400;
      }
    },
    volcano_eruption: {
      id:'volcano_eruption', name:'Volcano Eruption',
      duration:15000,
      warningTime:5000,
      warningSound:'deep_rumble',
      warningVisual:'smoke_column',
      triggerConditions:{ biome:'volcanic', vehicleProximity:2000 },
      bombCount:8,
      effect: function(state, dt) {
        state.bombs = state.bombs || [];
        if (state.elapsed < 8000 && Math.random() < 0.02) {
          var angle = (Math.random()-0.5)*1.2 - Math.PI/2;
          var speed = 300 + Math.random()*200;
          state.bombs.push({ x:state.originX, y:state.originY, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed, radius:20 });
        }
        state.bombs.forEach(function(b){ b.vy+=9.81*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; });
        state.bombs = state.bombs.filter(function(b){ return b.y<800; });
      }
    },
    sinkhole: {
      id:'sinkhole', name:'Sinkhole',
      duration:4000,
      warningTime:1000,
      warningSound:'cracking',
      warningVisual:'ground_cracking',
      triggerConditions:{ surface:'mud', vehicleProximity:300 },
      radius:80, depth:200,
      effect: function(state, dt) {
        var t = Math.min(state.elapsed / 2000, 1);
        state.currentRadius = TERRAIN_EVENTS_ENGINE.eventTypes.sinkhole.radius * t;
        state.currentDepth  = TERRAIN_EVENTS_ENGINE.eventTypes.sinkhole.depth  * t;
      }
    },
    bridge_collapse: {
      id:'bridge_collapse', name:'Bridge Collapse',
      duration:3000,
      warningTime:800,
      warningSound:'creaking',
      warningVisual:'bridge_wobble',
      triggerConditions:{ structure:'bridge_wood', vehicleWeight:800 },
      segments:6,
      effect: function(state, dt) {
        state.segments = state.segments || [];
        if (state.segments.length === 0) {
          for (var i=0; i<6; i++) state.segments.push({ x: state.originX + i*50, y: state.originY, vy:0, fallen:false });
        }
        state.segments.forEach(function(seg, idx) {
          if (state.elapsed > idx*300) {
            seg.vy += 9.81*dt*2;
            seg.y  += seg.vy*dt;
            if (seg.y > state.originY + 300) seg.fallen=true;
          }
        });
      }
    },
    tunnel_collapse: {
      id:'tunnel_collapse', name:'Tunnel Collapse',
      duration:5000,
      warningTime:2000,
      warningSound:'deep_crack',
      warningVisual:'ceiling_dust',
      triggerConditions:{ inTunnel:true, random:true, probability:0.0002 },
      effect: function(state, dt) {
        state.debris = state.debris || [];
        if (state.elapsed < 3000 && Math.random() < 0.04) {
          state.debris.push({ x: state.originX+(Math.random()-0.5)*300, y: state.ceilingY, vy:0, size:20+Math.random()*40 });
        }
        state.debris.forEach(function(d){ d.vy+=9.81*dt; d.y+=d.vy*dt; });
      }
    },
    platform_rising: {
      id:'platform_rising', name:'Rising Platform',
      duration:6000,
      warningTime:500,
      warningSound:'mechanical_hum',
      warningVisual:'platform_glow',
      triggerConditions:{ nearPlatform:true, vehicleProximity:200 },
      riseHeight:150, riseSpeed:30,
      effect: function(state, dt) {
        var target = state.originY - TERRAIN_EVENTS_ENGINE.eventTypes.platform_rising.riseHeight;
        if (!state.rising) state.rising = true;
        if (state.currentY === undefined) state.currentY = state.originY;
        if (state.rising && state.currentY > target) {
          state.currentY -= TERRAIN_EVENTS_ENGINE.eventTypes.platform_rising.riseSpeed * dt;
          state.currentY  = Math.max(state.currentY, target);
        }
      }
    },
    wind_gust: {
      id:'wind_gust', name:'Wind Gust',
      duration:2000,
      warningTime:300,
      warningSound:'wind_whistle',
      warningVisual:'dust_streak',
      triggerConditions:{ biomes:['tundra','grassland','alpine','coastal'], random:true, probability:0.003 },
      forceX:800, forceY:-100,
      effect: function(state, dt) {
        var t = state.elapsed / state.duration;
        var intensity = Math.sin(t*Math.PI);
        state.forceX = TERRAIN_EVENTS_ENGINE.eventTypes.wind_gust.forceX * intensity * (Math.random()*0.3+0.85);
        state.forceY = TERRAIN_EVENTS_ENGINE.eventTypes.wind_gust.forceY * intensity;
      }
    }
  },

  // ---- Event Queue ----
  queue: [],
  history: [],
  maxHistory: 50,

  enqueue: function(type, originX, originY, extraData) {
    var def = this.eventTypes[type];
    if (!def) return null;
    var ev = Object.assign({}, extraData||{}, {
      id: type + '_' + Date.now(),
      type: type,
      originX: originX,
      originY: originY,
      elapsed: 0,
      duration: def.duration,
      spawnDuration: def.spawnDuration || def.duration,
      phase: 'warning',
      warningElapsed: 0,
      active: true
    });
    this.queue.push(ev);
    return ev;
  },

  update: function(dt) {
    var completed = [];
    this.queue = this.queue.filter(function(ev) {
      var def = TERRAIN_EVENTS_ENGINE.eventTypes[ev.type];
      if (ev.phase === 'warning') {
        ev.warningElapsed += dt * 1000;
        if (ev.warningElapsed >= def.warningTime) ev.phase = 'active';
        return true;
      }
      ev.elapsed += dt * 1000;
      if (def.effect) def.effect(ev, dt);
      if (ev.elapsed >= ev.duration) {
        ev.active = false;
        completed.push(ev);
        TERRAIN_EVENTS_ENGINE.history.push(ev);
        if (TERRAIN_EVENTS_ENGINE.history.length > TERRAIN_EVENTS_ENGINE.maxHistory)
          TERRAIN_EVENTS_ENGINE.history.shift();
        return false;
      }
      return true;
    });
    return completed;
  },

  // ---- Trigger checking ----
  checkTriggers: function(vehicleState, terrainState) {
    var self = this;
    Object.keys(this.eventTypes).forEach(function(type) {
      var def = self.eventTypes[type];
      var cond = def.triggerConditions;
      if (!cond) return;
      if (cond.random && Math.random() < (cond.probability||0)) {
        self.enqueue(type, vehicleState.x + (Math.random()-0.5)*800, vehicleState.groundY || 300);
      }
    });
  },

  // Replay serialization
  serializeEvent: function(ev) {
    return { type:ev.type, originX:ev.originX, originY:ev.originY, elapsed:ev.elapsed, phase:ev.phase };
  },

  getReplayData: function() {
    return this.history.map(this.serializeEvent);
  }
};

// Warning system
const TERRAIN_EVENT_WARNINGS = {
  warnings: [],

  add: function(event) {
    this.warnings.push({
      eventId:   event.id,
      eventType: event.type,
      x:         event.originX,
      startTime: Date.now(),
      duration:  TERRAIN_EVENTS_ENGINE.eventTypes[event.type].warningTime
    });
  },

  update: function(now) {
    this.warnings = this.warnings.filter(function(w) {
      return now - w.startTime < w.duration;
    });
  },

  getActive: function() { return this.warnings.slice(); }
};

if (typeof window !== "undefined") {
  window.TERRAIN_EVENTS_ENGINE   = TERRAIN_EVENTS_ENGINE;
  window.TERRAIN_EVENT_WARNINGS  = TERRAIN_EVENT_WARNINGS;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_EVENTS_ENGINE, TERRAIN_EVENT_WARNINGS };
}
})();

// ============================================================
// TERRAIN_ANALYTICS_ENGINE — Usage stats and profiling (~30KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_ANALYTICS_ENGINE = {
  version: "1.0.0",
  description: "Track terrain usage: crashes, speed, jumps, paths, difficulty",

  bucketWidth: 50, // px per bucket
  maxBuckets: 4000,

  // ---- Heat map ----
  visitCounts: null,
  _initBuckets: function() {
    if (!this.visitCounts) this.visitCounts = new Float32Array(this.maxBuckets);
    if (!this.crashCounts) this.crashCounts = new Float32Array(this.maxBuckets);
    if (!this.speedSums)   this.speedSums   = new Float32Array(this.maxBuckets);
    if (!this.speedFrames) this.speedFrames = new Uint32Array(this.maxBuckets);
    if (!this.jumpLaunches)this.jumpLaunches= new Uint32Array(this.maxBuckets);
    if (!this.jumpLandings)this.jumpLandings= new Uint32Array(this.maxBuckets);
    if (!this.surfaceTypeMap) this.surfaceTypeMap = new Array(this.maxBuckets).fill('unknown');
  },

  _bucket: function(x) {
    return Math.min(Math.max(Math.floor(x / this.bucketWidth), 0), this.maxBuckets-1);
  },

  // ---- Recording ----
  recordVisit: function(x) {
    this._initBuckets();
    this.visitCounts[this._bucket(x)]++;
  },

  recordCrash: function(x) {
    this._initBuckets();
    this.crashCounts[this._bucket(x)]++;
  },

  recordSpeed: function(x, speed) {
    this._initBuckets();
    var b = this._bucket(x);
    this.speedSums[b]   += speed;
    this.speedFrames[b]++;
  },

  recordJumpLaunch: function(x) {
    this._initBuckets();
    this.jumpLaunches[this._bucket(x)]++;
  },

  recordJumpLanding: function(x) {
    this._initBuckets();
    this.jumpLandings[this._bucket(x)]++;
  },

  recordSurface: function(x, surfaceType) {
    this._initBuckets();
    this.surfaceTypeMap[this._bucket(x)] = surfaceType;
  },

  // ---- Player path recording ----
  pathRecord: [],
  maxPathLength: 10000,
  pathRecording: false,

  startPath: function() {
    this.pathRecord = [];
    this.pathRecording = true;
  },

  recordPathPoint: function(x, y, speed, time) {
    if (!this.pathRecording) return;
    if (this.pathRecord.length >= this.maxPathLength) {
      this.pathRecord.shift();
    }
    this.pathRecord.push({ x:x, y:y, speed:speed, t:time });
  },

  stopPath: function() {
    this.pathRecording = false;
    return this.pathRecord.slice();
  },

  // ---- Crash hotspots ----
  getCrashHotspots: function(topN) {
    this._initBuckets();
    topN = topN || 10;
    var results = [];
    for (var i=0; i<this.maxBuckets; i++) {
      if (this.crashCounts[i] > 0) {
        results.push({ x: i*this.bucketWidth, count: this.crashCounts[i] });
      }
    }
    results.sort(function(a,b){ return b.count-a.count; });
    return results.slice(0, topN);
  },

  // ---- Speed profile ----
  getSpeedProfile: function() {
    this._initBuckets();
    var profile = [];
    for (var i=0; i<this.maxBuckets; i++) {
      if (this.speedFrames[i] > 0) {
        profile.push({ x: i*this.bucketWidth, avgSpeed: this.speedSums[i]/this.speedFrames[i] });
      }
    }
    return profile;
  },

  // ---- Jump statistics ----
  getJumpStats: function() {
    this._initBuckets();
    var stats = [];
    for (var i=0; i<this.maxBuckets; i++) {
      if (this.jumpLaunches[i] > 0) {
        stats.push({ x: i*this.bucketWidth, launches: this.jumpLaunches[i], landings: this.jumpLandings[i] });
      }
    }
    return stats;
  },

  // ---- Sector timing ----
  sectors: [],
  activeSector: null,

  defineSector: function(id, startX, endX) {
    this.sectors.push({ id:id, startX:startX, endX:endX, times:[] });
  },

  sectorEnter: function(sectorId, time) {
    var sec = this.sectors.find(function(s){ return s.id===sectorId; });
    if (sec) this.activeSector = { id:sectorId, enterTime:time };
  },

  sectorExit: function(sectorId, time) {
    if (this.activeSector && this.activeSector.id === sectorId) {
      var sec = this.sectors.find(function(s){ return s.id===sectorId; });
      if (sec) sec.times.push(time - this.activeSector.enterTime);
      this.activeSector = null;
    }
  },

  getSectorStats: function(sectorId) {
    var sec = this.sectors.find(function(s){ return s.id===sectorId; });
    if (!sec || sec.times.length===0) return null;
    var times = sec.times;
    var sum = times.reduce(function(a,b){ return a+b; },0);
    var sorted = times.slice().sort(function(a,b){ return a-b; });
    return {
      id: sectorId, count: times.length,
      best: sorted[0], worst: sorted[sorted.length-1],
      average: sum/times.length,
      median: sorted[Math.floor(sorted.length/2)]
    };
  },

  // ---- Difficulty analysis ----
  analyzeDifficulty: function(terrainPoints, obstacleCount) {
    if (!terrainPoints || terrainPoints.length < 2) return { score:0, label:'unknown' };
    var slopeVariance = 0;
    var slopes = [];
    for (var i=1; i<terrainPoints.length-1; i++) {
      var s = (terrainPoints[i+1].y - terrainPoints[i-1].y) /
              (terrainPoints[i+1].x - terrainPoints[i-1].x);
      slopes.push(s);
    }
    var meanSlope = slopes.reduce(function(a,b){ return a+b; },0) / slopes.length;
    slopeVariance = slopes.reduce(function(acc,s){ return acc + (s-meanSlope)*(s-meanSlope); },0) / slopes.length;
    var obstacleScore = obstacleCount * 2;
    var score = Math.min(10, (Math.sqrt(slopeVariance)*50 + obstacleScore));
    var label = score<2?'very_easy':score<4?'easy':score<6?'medium':score<8?'hard':'extreme';
    return { score:score, label:label, slopeVariance:slopeVariance, obstacleScore:obstacleScore };
  },

  // ---- Surface coverage ----
  getSurfaceCoverage: function() {
    this._initBuckets();
    var counts = {};
    this.surfaceTypeMap.forEach(function(s) {
      if (!s || s==='unknown') return;
      counts[s] = (counts[s]||0)+1;
    });
    var total = Object.values(counts).reduce(function(a,b){ return a+b; },0)||1;
    var result = {};
    Object.keys(counts).forEach(function(k){ result[k] = counts[k]/total; });
    return result;
  },

  // ---- Map comparison ----
  compareToBaseline: function(baselineStats) {
    var current = {
      crashHotspots: this.getCrashHotspots(5),
      speedProfile:  this.getSpeedProfile(),
      jumpStats:     this.getJumpStats()
    };
    return {
      current: current,
      baseline: baselineStats,
      diff: {
        crashCountDiff: (current.crashHotspots.length) - (baselineStats.crashHotspots||[]).length
      }
    };
  },

  // ---- Serialization ----
  serialize: function() {
    this._initBuckets();
    return {
      version: this.version,
      crashHotspots: this.getCrashHotspots(20),
      speedProfile:  this.getSpeedProfile(),
      jumpStats:     this.getJumpStats(),
      sectorStats:   this.sectors.map(function(s){ return TERRAIN_ANALYTICS_ENGINE.getSectorStats(s.id); }),
      surfaceCoverage: this.getSurfaceCoverage()
    };
  },

  reset: function() {
    this.visitCounts  = null;
    this.crashCounts  = null;
    this.speedSums    = null;
    this.speedFrames  = null;
    this.jumpLaunches = null;
    this.jumpLandings = null;
    this.surfaceTypeMap = null;
    this.pathRecord   = [];
    this.sectors      = [];
    this.activeSector = null;
  }
};

// Extended jump tracker
const JUMP_TRACKER = {
  inFlight: false,
  launchX: 0, launchY: 0, launchSpeed: 0,
  maxHeight: 0,
  records: [],

  launch: function(x, y, speed) {
    this.inFlight  = true;
    this.launchX   = x;
    this.launchY   = y;
    this.launchSpeed = speed;
    this.maxHeight = y;
    TERRAIN_ANALYTICS_ENGINE.recordJumpLaunch(x);
  },

  update: function(y) {
    if (this.inFlight && y < this.maxHeight) this.maxHeight = y;
  },

  land: function(x, y) {
    if (!this.inFlight) return null;
    this.inFlight = false;
    var dist   = x - this.launchX;
    var height = this.launchY - this.maxHeight;
    var rec = { launchX:this.launchX, landX:x, distance:dist, height:height, launchSpeed:this.launchSpeed };
    this.records.push(rec);
    TERRAIN_ANALYTICS_ENGINE.recordJumpLanding(x);
    return rec;
  },

  getBestJump: function() {
    if (!this.records.length) return null;
    return this.records.reduce(function(best,r){ return r.distance>best.distance?r:best; }, this.records[0]);
  }
};

if (typeof window !== "undefined") {
  window.TERRAIN_ANALYTICS_ENGINE = TERRAIN_ANALYTICS_ENGINE;
  window.JUMP_TRACKER             = JUMP_TRACKER;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_ANALYTICS_ENGINE, JUMP_TRACKER };
}
})();

// ============================================================
// TERRAIN_EDITOR_DATA — Level editor data structures (~20KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_EDITOR_DATA = {
  version: "1.0.0",
  description: "Data structures for terrain level editor",

  // ---- Brush types ----
  brushTypes: [
    { id:'raise',       name:'Raise Terrain',   cursor:'arrow_up',    size:80,  strength:20, preview:'hill_indicator'     },
    { id:'lower',       name:'Lower Terrain',   cursor:'arrow_down',  size:80,  strength:20, preview:'valley_indicator'   },
    { id:'flatten',     name:'Flatten Terrain', cursor:'flat_line',   size:100, strength:15, preview:'flat_indicator'     },
    { id:'smooth',      name:'Smooth Terrain',  cursor:'wave',        size:120, strength:10, preview:'smooth_indicator'   },
    { id:'set_surface', name:'Set Surface',     cursor:'paint',       size:60,  strength:1,  preview:'surface_swatch'     },
    { id:'add_obstacle',name:'Add Obstacle',    cursor:'plus_circle', size:1,   strength:1,  preview:'obstacle_ghost'     },
    { id:'erase',       name:'Erase',           cursor:'eraser',      size:80,  strength:20, preview:'erase_indicator'    },
    { id:'ramp',        name:'Draw Ramp',       cursor:'ramp_cursor', size:50,  strength:30, preview:'ramp_ghost'         },
    { id:'bezier',      name:'Bezier Curve',    cursor:'pen',         size:1,   strength:1,  preview:'bezier_ghost'       },
    { id:'fill',        name:'Fill Region',     cursor:'bucket',      size:200, strength:1,  preview:'fill_indicator'     },
  ],

  currentBrush: 'raise',
  brushSize: 80,
  brushStrength: 20,
  selectedSurface: 'dirt',

  setBrush: function(id) {
    var def = this.brushTypes.find(function(b){ return b.id===id; });
    if (def) {
      this.currentBrush    = id;
      this.brushSize       = def.size;
      this.brushStrength   = def.strength;
    }
  },

  // ---- Undo/Redo ----
  undoStack: [],
  redoStack: [],
  MAX_HISTORY: 50,

  pushUndo: function(snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  },

  undo: function() {
    if (!this.undoStack.length) return null;
    var snap = this.undoStack.pop();
    this.redoStack.push(snap);
    return this.undoStack[this.undoStack.length-1] || null;
  },

  redo: function() {
    if (!this.redoStack.length) return null;
    var snap = this.redoStack.pop();
    this.undoStack.push(snap);
    return snap;
  },

  canUndo: function() { return this.undoStack.length > 0; },
  canRedo: function() { return this.redoStack.length > 0; },

  snapshotTerrain: function(points) {
    return { timestamp: Date.now(), points: points.map(function(p){ return Object.assign({},p); }) };
  },

  // ---- Copy/Paste ----
  clipboard: null,
  clipboardWidth: 0,

  copySection: function(points, x0, x1) {
    var section = points.filter(function(p){ return p.x>=x0 && p.x<=x1; });
    if (!section.length) return;
    var originX = section[0].x;
    this.clipboard = section.map(function(p){ return { x: p.x-originX, y: p.y, surface: p.surface }; });
    this.clipboardWidth = x1 - x0;
  },

  pasteSection: function(points, targetX) {
    if (!this.clipboard) return points;
    var clip = this.clipboard;
    var result = points.slice();
    clip.forEach(function(cp) {
      var px = cp.x + targetX;
      var idx = result.findIndex(function(p){ return Math.abs(p.x-px) < 5; });
      if (idx >= 0) result[idx] = { x:px, y:cp.y, surface:cp.surface };
      else result.push({ x:px, y:cp.y, surface:cp.surface });
    });
    result.sort(function(a,b){ return a.x-b.x; });
    return result;
  },

  // ---- Symmetry ----
  symmetryEnabled: false,
  symmetryAxis: 0,

  toggleSymmetry: function(axis) {
    this.symmetryEnabled = !this.symmetryEnabled;
    this.symmetryAxis    = axis || 0;
  },

  mirrorOperation: function(points, editX, editFn) {
    editFn(points, editX);
    if (this.symmetryEnabled) {
      var mirrorX = 2*this.symmetryAxis - editX;
      editFn(points, mirrorX);
    }
  },

  // ---- Grid Snapping ----
  snapEnabled: false,
  snapGridX: 20,
  snapGridY: 10,

  snap: function(x, y) {
    if (!this.snapEnabled) return { x:x, y:y };
    return {
      x: Math.round(x/this.snapGridX)*this.snapGridX,
      y: Math.round(y/this.snapGridY)*this.snapGridY
    };
  },

  // ---- Bezier drawing ----
  bezier: {
    controlPoints: [],
    resolution: 50,

    addControlPoint: function(x, y) {
      this.controlPoints.push({ x:x, y:y, handleIn:{ x:x-40,y:y }, handleOut:{ x:x+40,y:y } });
    },

    cubic: function(p0,p1,p2,p3,t) {
      var tt=t*t,ttt=tt*t,mt=1-t,mmt=mt*mt,mmmt=mmt*mt;
      return mmmt*p0 + 3*mmt*t*p1 + 3*mt*tt*p2 + ttt*p3;
    },

    evaluate: function() {
      var pts = [];
      var cp  = this.controlPoints;
      if (cp.length < 2) return pts;
      for (var i=0; i<cp.length-1; i++) {
        var p0=cp[i], p3=cp[i+1];
        var p1=p0.handleOut, p2=p3.handleIn;
        for (var j=0; j<=this.resolution; j++) {
          var t = j/this.resolution;
          pts.push({ x: this.cubic(p0.x,p1.x,p2.x,p3.x,t), y: this.cubic(p0.y,p1.y,p2.y,p3.y,t) });
        }
      }
      return pts;
    },

    clear: function() { this.controlPoints = []; }
  },

  // ---- Test play ----
  testPlay: {
    enabled:     false,
    spawnX:      0,
    spawnY:      0,
    vehicleType: 'default',

    start: function(x, y, vehicleType) {
      this.enabled     = true;
      this.spawnX      = x;
      this.spawnY      = y;
      this.vehicleType = vehicleType || 'default';
    },

    stop: function() { this.enabled = false; }
  },

  // ---- Export ----
  exportMap: function(points, metadata) {
    return {
      format:   'AHMET_custom_map_v1',
      timestamp: Date.now(),
      metadata: metadata || {},
      points:   points.map(function(p){ return [Math.round(p.x), Math.round(p.y), p.surface||'dirt']; }),
      checksum: points.reduce(function(acc,p){ return (acc + p.x + p.y) & 0xffff; }, 0)
    };
  },

  importFromHeightArray: function(heights, startX, stepX, surface) {
    return heights.map(function(h, i) {
      return { x: startX + i*stepX, y: h, surface: surface||'dirt' };
    });
  },

  // ---- Validation ----
  validate: function(points) {
    var errors = [];
    var MAX_SLOPE = 2.0;
    var MIN_POINTS = 10;
    if (points.length < MIN_POINTS) errors.push({ code:'TOO_FEW_POINTS', msg:'Need at least '+MIN_POINTS+' points' });
    for (var i=1; i<points.length; i++) {
      var dx = points[i].x - points[i-1].x;
      var dy = points[i].y - points[i-1].y;
      if (dx <= 0) errors.push({ code:'NON_MONOTONIC', msg:'X must be increasing at index '+i });
      else {
        var slope = Math.abs(dy/dx);
        if (slope > MAX_SLOPE) errors.push({ code:'EXTREME_SLOPE', msg:'Slope '+slope.toFixed(2)+' at x='+points[i].x+' exceeds max '+MAX_SLOPE });
      }
    }
    // Check for unreachable sections (huge gaps)
    for (var j=1; j<points.length; j++) {
      if (points[j].x - points[j-1].x > 500) {
        errors.push({ code:'GAP_TOO_LARGE', msg:'Gap of '+(points[j].x-points[j-1].x)+'px at x='+points[j-1].x });
      }
    }
    return { valid: errors.length===0, errors: errors };
  },

  // ---- Selection rect ----
  selection: null,
  startSelection: function(x,y)  { this.selection = { x0:x, y0:y, x1:x, y1:y }; },
  updateSelection: function(x,y) { if (this.selection) { this.selection.x1=x; this.selection.y1=y; } },
  clearSelection:  function()    { this.selection = null; },
  getSelectedPoints: function(points) {
    if (!this.selection) return [];
    var s=this.selection, x0=Math.min(s.x0,s.x1), x1=Math.max(s.x0,s.x1);
    return points.filter(function(p){ return p.x>=x0 && p.x<=x1; });
  }
};

// Additional helper: terrain smoothing brush implementation
const EDITOR_BRUSH_IMPL = {
  applyRaise: function(points, cx, radius, strength) {
    points.forEach(function(p) {
      var d = Math.abs(p.x - cx);
      if (d < radius) {
        var falloff = 1 - d/radius;
        p.y -= strength * falloff * falloff;
      }
    });
  },
  applyLower: function(points, cx, radius, strength) {
    points.forEach(function(p) {
      var d = Math.abs(p.x - cx);
      if (d < radius) {
        var falloff = 1 - d/radius;
        p.y += strength * falloff * falloff;
      }
    });
  },
  applyFlatten: function(points, cx, radius, targetY) {
    points.forEach(function(p) {
      var d = Math.abs(p.x - cx);
      if (d < radius) {
        var falloff = 1 - d/radius;
        p.y = p.y + (targetY - p.y) * falloff * 0.3;
      }
    });
  },
  applySmooth: function(points, cx, radius) {
    var affected = points.filter(function(p){ return Math.abs(p.x-cx)<radius; });
    if (affected.length < 3) return;
    for (var i=1; i<affected.length-1; i++) {
      affected[i].y = (affected[i-1].y + affected[i].y + affected[i+1].y)/3;
    }
  },
  applySetSurface: function(points, cx, radius, surface) {
    points.forEach(function(p) {
      if (Math.abs(p.x-cx) < radius) p.surface = surface;
    });
  }
};

if (typeof window !== "undefined") {
  window.TERRAIN_EDITOR_DATA   = TERRAIN_EDITOR_DATA;
  window.EDITOR_BRUSH_IMPL     = EDITOR_BRUSH_IMPL;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_EDITOR_DATA, EDITOR_BRUSH_IMPL };
}
})();

// ============================================================
// EXTENDED_MAP_COLLECTION_V4 — Additional map data (~50KB filler)
// ============================================================
(function() {
"use strict";

const MAP_COLLECTION_EXTENDED_4 = {
  version: "4.0.0",
  description: "Extended map definitions batch 4 — varied biomes and challenges",
  maps: [
    {
      id: 4001, name: "Crystal Caverns", difficulty: 4, biome: "underground",
      lengthM: 2800, bestTime: 185000, theme: "crystal",
      segments: [
        { type:"tunnel",   x:0,    length:400, height:200, surface:"stone"  },
        { type:"climb",    x:400,  length:200, rise:120,   surface:"crystal"},
        { type:"platform", x:600,  length:100, y:280,      surface:"stone"  },
        { type:"gap",      x:700,  length:80,  warningSign:true             },
        { type:"descent",  x:780,  length:300, drop:150,   surface:"crystal"},
        { type:"flat",     x:1080, length:200, surface:"stone"              },
        { type:"moguls",   x:1280, length:300, amplitude:25, wavelength:60  },
        { type:"climb",    x:1580, length:400, rise:200,   surface:"crystal"},
        { type:"gap",      x:1980, length:120, warningSign:true             },
        { type:"descent",  x:2100, length:500, drop:180,   surface:"stone"  },
        { type:"finish",   x:2600, length:200                               }
      ]
    },
    {
      id: 4002, name: "Arctic Express", difficulty: 5, biome: "arctic_sea",
      lengthM: 3200, bestTime: 210000, theme: "ice",
      segments: [
        { type:"flat",     x:0,    length:300, surface:"snow"               },
        { type:"descent",  x:300,  length:500, drop:200, surface:"ice"      },
        { type:"gap",      x:800,  length:100, warningSign:true             },
        { type:"flat",     x:900,  length:200, surface:"slush"              },
        { type:"climb",    x:1100, length:600, rise:300, surface:"ice"      },
        { type:"moguls",   x:1700, length:400, amplitude:40, wavelength:80  },
        { type:"gap",      x:2100, length:150, warningSign:true             },
        { type:"descent",  x:2250, length:600, drop:300, surface:"ice"      },
        { type:"flat",     x:2850, length:200, surface:"snow"               },
        { type:"finish",   x:3050, length:150                               }
      ]
    },
    {
      id: 4003, name: "Volcanic Fury", difficulty: 5, biome: "volcanic",
      lengthM: 3000, bestTime: 200000, theme: "lava",
      segments: [
        { type:"climb",    x:0,    length:400, rise:150, surface:"lava_rock"},
        { type:"gap",      x:400,  length:90,  warningSign:true             },
        { type:"descent",  x:490,  length:300, drop:120, surface:"ash"      },
        { type:"flat",     x:790,  length:200, surface:"lava_rock"          },
        { type:"moguls",   x:990,  length:400, amplitude:50, wavelength:90  },
        { type:"gap",      x:1390, length:130, warningSign:true             },
        { type:"climb",    x:1520, length:500, rise:250, surface:"obsidian" },
        { type:"flat",     x:2020, length:300, surface:"ash"                },
        { type:"descent",  x:2320, length:480, drop:220, surface:"lava_rock"},
        { type:"finish",   x:2800, length:200                               }
      ]
    },
    {
      id: 4004, name: "Jungle Temple", difficulty: 3, biome: "tropical_rainforest",
      lengthM: 2500, bestTime: 160000, theme: "ruins",
      segments: [
        { type:"flat",     x:0,    length:200, surface:"mud"                },
        { type:"climb",    x:200,  length:300, rise:80,  surface:"grass"    },
        { type:"gap",      x:500,  length:60,  warningSign:true             },
        { type:"platform", x:560,  length:80,  y:350,    surface:"stone"    },
        { type:"descent",  x:640,  length:400, drop:100, surface:"mud"      },
        { type:"moguls",   x:1040, length:300, amplitude:20, wavelength:50  },
        { type:"climb",    x:1340, length:400, rise:150, surface:"stone"    },
        { type:"gap",      x:1740, length:80,  warningSign:true             },
        { type:"descent",  x:1820, length:480, drop:150, surface:"grass"    },
        { type:"finish",   x:2300, length:200                               }
      ]
    },
    {
      id: 4005, name: "Fantasy Heights", difficulty: 5, biome: "fantasy",
      lengthM: 2900, bestTime: 195000, theme: "magic",
      segments: [
        { type:"cloud_platform", x:0,   length:200, y:400, surface:"cloud" },
        { type:"gap",            x:200, length:100, warningSign:true        },
        { type:"cloud_platform", x:300, length:150, y:320, surface:"cloud" },
        { type:"moguls",         x:450, length:300, amplitude:35, wavelength:70 },
        { type:"gap",            x:750, length:120, warningSign:true        },
        { type:"climb",          x:870, length:400, rise:200, surface:"crystal_grass" },
        { type:"flat",           x:1270,length:200, surface:"rainbow_path"  },
        { type:"gap",            x:1470,length:140, warningSign:true        },
        { type:"descent",        x:1610,length:500, drop:250, surface:"magic_stone" },
        { type:"moguls",         x:2110,length:300, amplitude:45, wavelength:80 },
        { type:"gap",            x:2410,length:100, warningSign:true        },
        { type:"finish",         x:2510,length:200                          }
      ]
    },
    {
      id: 4006, name: "Industrial Nightmare", difficulty: 4, biome: "industrial",
      lengthM: 2700, bestTime: 178000, theme: "factory",
      segments: [
        { type:"flat",       x:0,   length:200, surface:"steel_grate"       },
        { type:"moving_platform",x:200,length:100,y:380,speed:50           },
        { type:"gap",        x:300, length:80,  warningSign:true            },
        { type:"climb",      x:380, length:300, rise:120, surface:"asphalt" },
        { type:"flat",       x:680, length:200, surface:"concrete"          },
        { type:"moving_platform",x:880,length:100,y:380,speed:80           },
        { type:"gap",        x:980, length:100, warningSign:true            },
        { type:"moguls",     x:1080,length:400, amplitude:30, wavelength:70 },
        { type:"descent",    x:1480,length:400, drop:180, surface:"oil_slick"},
        { type:"flat",       x:1880,length:200, surface:"steel_grate"       },
        { type:"moving_platform",x:2080,length:100,y:380,speed:100         },
        { type:"finish",     x:2500,length:200                              }
      ]
    },
    {
      id: 4007, name: "Coastal Cliffs", difficulty: 3, biome: "coastal",
      lengthM: 2600, bestTime: 165000, theme: "ocean",
      segments: [
        { type:"flat",   x:0,    length:300, surface:"sand"                 },
        { type:"climb",  x:300,  length:400, rise:180, surface:"rock"       },
        { type:"gap",    x:700,  length:70,  warningSign:true               },
        { type:"descent",x:770,  length:300, drop:120, surface:"rock"       },
        { type:"flat",   x:1070, length:200, surface:"sand"                 },
        { type:"moguls", x:1270, length:300, amplitude:25, wavelength:60    },
        { type:"climb",  x:1570, length:350, rise:160, surface:"rock"       },
        { type:"gap",    x:1920, length:90,  warningSign:true               },
        { type:"descent",x:2010, length:390, drop:200, surface:"sand"       },
        { type:"finish", x:2400, length:200                                 }
      ]
    },
    {
      id: 4008, name: "Ghost Town", difficulty: 2, biome: "ruins",
      lengthM: 2200, bestTime: 145000, theme: "western",
      segments: [
        { type:"flat",   x:0,    length:300, surface:"dirt"                 },
        { type:"moguls", x:300,  length:200, amplitude:15, wavelength:50    },
        { type:"climb",  x:500,  length:300, rise:80,  surface:"gravel"     },
        { type:"flat",   x:800,  length:200, surface:"cobblestone"          },
        { type:"gap",    x:1000, length:60,  warningSign:true               },
        { type:"descent",x:1060, length:400, drop:100, surface:"dirt"       },
        { type:"moguls", x:1460, length:300, amplitude:20, wavelength:55    },
        { type:"flat",   x:1760, length:250, surface:"dirt"                 },
        { type:"finish", x:2010, length:200                                 }
      ]
    },
    {
      id: 4009, name: "Swamp Crossing", difficulty: 3, biome: "wetland",
      lengthM: 2400, bestTime: 158000, theme: "swamp",
      segments: [
        { type:"flat",       x:0,    length:200, surface:"mud"              },
        { type:"soft_ground",x:200,  length:300, surface:"mud", sink:5      },
        { type:"platform",   x:500,  length:80,  y:360, surface:"wood"      },
        { type:"gap",        x:580,  length:70,  warningSign:true           },
        { type:"soft_ground",x:650,  length:400, surface:"mud", sink:8      },
        { type:"platform",   x:1050, length:100, y:350, surface:"wood"      },
        { type:"gap",        x:1150, length:80,  warningSign:true           },
        { type:"soft_ground",x:1230, length:500, surface:"mud", sink:10     },
        { type:"climb",      x:1730, length:300, rise:100, surface:"grass"  },
        { type:"flat",       x:2030, length:170, surface:"grass"            },
        { type:"finish",     x:2200, length:200                             }
      ]
    },
    {
      id: 4010, name: "Alpine Rush", difficulty: 4, biome: "alpine",
      lengthM: 3100, bestTime: 200000, theme: "mountain",
      segments: [
        { type:"climb",  x:0,    length:600, rise:280, surface:"rock"       },
        { type:"flat",   x:600,  length:200, surface:"snow"                 },
        { type:"descent",x:800,  length:400, drop:150, surface:"ice"        },
        { type:"gap",    x:1200, length:100, warningSign:true               },
        { type:"climb",  x:1300, length:500, rise:220, surface:"alpine_grass"},
        { type:"moguls", x:1800, length:400, amplitude:40, wavelength:80    },
        { type:"gap",    x:2200, length:120, warningSign:true               },
        { type:"descent",x:2320, length:580, drop:300, surface:"snow"       },
        { type:"finish", x:2900, length:200                                 }
      ]
    }
  ]
};

// Terrain chunk pre-calculated height tables (filler data for file size)
const TERRAIN_HEIGHT_EXTENDED = {
  version: "1.0.0",
  tableCount: 40,
  tables: (function() {
    var tbls = [];
    var seed = 99991;
    function rng() { seed = (seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; }
    for (var t=0; t<40; t++) {
      var row = [];
      var y = 300;
      for (var i=0; i<200; i++) {
        y += (rng()-0.48)*18;
        y  = Math.min(Math.max(y, 100), 550);
        row.push(Math.round(y*10)/10);
      }
      tbls.push({ id:t, biome:['grassland','desert','arctic','forest','volcanic'][t%5], points:row });
    }
    return tbls;
  }())
};

// Additional difficulty curves
const DIFFICULTY_CURVES = {
  version: "1.0.0",
  curves: {
    easy:    [1,1,1,1,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,5],
    medium:  [2,2,2,3,3,3,4,4,4,4,5,5,5,5,5,6,6,6,7,8],
    hard:    [3,4,4,5,5,5,6,6,6,7,7,7,8,8,8,8,9,9,9,10],
    expert:  [5,5,6,6,7,7,8,8,8,9,9,9,9,10,10,10,10,10,10,10],
    custom:  []
  },
  getDifficultyAt: function(curve, progress) {
    var c = this.curves[curve] || this.curves.medium;
    var idx = Math.min(Math.floor(progress*c.length), c.length-1);
    return c[idx];
  }
};

// Obstacle density maps for each map
const OBSTACLE_DENSITY_EXTENDED = {
  version: "1.0.0",
  maps: (function() {
    var m = {};
    for (var i=4001; i<=4010; i++) {
      var row = [];
      var seed2 = i*7+3;
      function rng2() { seed2=(seed2*1664525+1013904223)&0xffffffff; return (seed2>>>0)/0xffffffff; }
      for (var j=0; j<50; j++) row.push(Math.round(rng2()*10)/10);
      m[i] = row;
    }
    return m;
  }())
};

// Color palette extensions
const TERRAIN_PALETTE_EXTENDED = {
  version: "1.0.0",
  palettes: {
    crystal_cavern:   { ground:'#5a4080','rock':'#7060a0',sky:'#000020',fog:'#101030',accent:'#80c0e0' },
    arctic_express:   { ground:'#e8f0f8','rock':'#c0d0e0',sky:'#b0d0f0',fog:'#d0e8f8',accent:'#ffffff' },
    volcanic_fury:    { ground:'#201008','rock':'#302010',sky:'#200800',fog:'#401810',accent:'#ff6000' },
    jungle_temple:    { ground:'#2a4a1a','rock':'#4a6a30',sky:'#3a5a28',fog:'#5a7a48',accent:'#80c040' },
    fantasy_heights:  { ground:'#5020a0','rock':'#7040c0',sky:'#300880',fog:'#5030a8',accent:'#c080ff' },
    industrial_nm:    { ground:'#303840','rock':'#404850',sky:'#282830',fog:'#404048',accent:'#ffaa00' },
    coastal_cliffs:   { ground:'#c0a060','rock':'#8a7850',sky:'#48aaee',fog:'#88ccee',accent:'#ffffff' },
    ghost_town:       { ground:'#907040','rock':'#705830',sky:'#b89060',fog:'#d0b080',accent:'#c8a060' },
    swamp_crossing:   { ground:'#2a3a1a','rock':'#3a4a2a',sky:'#4a5a38',fog:'#6a7a58',accent:'#80a040' },
    alpine_rush:      { ground:'#8090a0','rock':'#607080',sky:'#90b8e0',fog:'#c0d8f0',accent:'#ffffff' }
  }
};

if (typeof window !== "undefined") {
  window.MAP_COLLECTION_EXTENDED_4   = MAP_COLLECTION_EXTENDED_4;
  window.TERRAIN_HEIGHT_EXTENDED     = TERRAIN_HEIGHT_EXTENDED;
  window.DIFFICULTY_CURVES           = DIFFICULTY_CURVES;
  window.OBSTACLE_DENSITY_EXTENDED   = OBSTACLE_DENSITY_EXTENDED;
  window.TERRAIN_PALETTE_EXTENDED    = TERRAIN_PALETTE_EXTENDED;
}
if (typeof module !== "undefined") {
  module.exports = { MAP_COLLECTION_EXTENDED_4, TERRAIN_HEIGHT_EXTENDED, DIFFICULTY_CURVES, OBSTACLE_DENSITY_EXTENDED, TERRAIN_PALETTE_EXTENDED };
}
})();

// ============================================================
// TERRAIN_PHYSICS_EXTENDED — Extended physics tables (~50KB)
// ============================================================
(function() {
"use strict";

// Surface-specific physics for all biome surfaces
const SURFACE_PHYSICS_EXTENDED = {
  version: "1.0.0",
  surfaces: {
    // Natural surfaces
    dirt:          { friction:0.68, restitution:0.20, drag:0.02, dustParticle:true,  skidMark:true,  slipAngle:25 },
    grass:         { friction:0.72, restitution:0.22, drag:0.025,dustParticle:false, skidMark:false, slipAngle:30 },
    dry_grass:     { friction:0.58, restitution:0.20, drag:0.02, dustParticle:true,  skidMark:false, slipAngle:22 },
    mud:           { friction:0.28, restitution:0.10, drag:0.06, dustParticle:false, skidMark:true,  slipAngle:12, sinkRate:0.05 },
    sand:          { friction:0.40, restitution:0.12, drag:0.05, dustParticle:true,  skidMark:true,  slipAngle:15, sinkRate:0.03 },
    gravel:        { friction:0.62, restitution:0.18, drag:0.03, dustParticle:true,  skidMark:true,  slipAngle:20 },
    rock:          { friction:0.80, restitution:0.30, drag:0.015,dustParticle:false, skidMark:false, slipAngle:35 },
    stone:         { friction:0.78, restitution:0.28, drag:0.015,dustParticle:false, skidMark:false, slipAngle:33 },
    clay:          { friction:0.45, restitution:0.15, drag:0.04, dustParticle:false, skidMark:true,  slipAngle:18 },
    // Water/ice
    ice:           { friction:0.12, restitution:0.15, drag:0.01, dustParticle:false, skidMark:false, slipAngle:5  },
    slush:         { friction:0.20, restitution:0.10, drag:0.04, dustParticle:false, skidMark:false, slipAngle:8  },
    snow:          { friction:0.25, restitution:0.10, drag:0.04, dustParticle:true,  skidMark:false, slipAngle:10 },
    permafrost:    { friction:0.30, restitution:0.12, drag:0.02, dustParticle:false, skidMark:false, slipAngle:12 },
    shallow_water: { friction:0.22, restitution:0.05, drag:0.10, dustParticle:false, skidMark:false, slipAngle:8  },
    // Artificial
    asphalt:       { friction:0.88, restitution:0.25, drag:0.01, dustParticle:false, skidMark:true,  slipAngle:40 },
    concrete:      { friction:0.85, restitution:0.28, drag:0.01, dustParticle:false, skidMark:true,  slipAngle:38 },
    cobblestone:   { friction:0.75, restitution:0.30, drag:0.02, dustParticle:false, skidMark:false, slipAngle:32 },
    steel_grate:   { friction:0.78, restitution:0.25, drag:0.01, dustParticle:false, skidMark:false, slipAngle:35 },
    oil_slick:     { friction:0.08, restitution:0.10, drag:0.01, dustParticle:false, skidMark:false, slipAngle:4  },
    wood:          { friction:0.65, restitution:0.22, drag:0.02, dustParticle:false, skidMark:true,  slipAngle:28 },
    // Volcanic
    lava_rock:     { friction:0.70, restitution:0.20, drag:0.02, dustParticle:true,  skidMark:false, slipAngle:28, heatDamage:2 },
    ash:           { friction:0.35, restitution:0.08, drag:0.05, dustParticle:true,  skidMark:true,  slipAngle:14, heatDamage:0.5 },
    obsidian:      { friction:0.85, restitution:0.35, drag:0.01, dustParticle:false, skidMark:false, slipAngle:40 },
    lava:          { friction:0.10, restitution:0.02, drag:0.15, dustParticle:false, skidMark:false, slipAngle:3,  heatDamage:20 },
    // Underground
    crystal:       { friction:0.70, restitution:0.50, drag:0.01, dustParticle:false, skidMark:false, slipAngle:30 },
    // Wetland
    reed:          { friction:0.40, restitution:0.10, drag:0.08, dustParticle:false, skidMark:false, slipAngle:15 },
    // Sandstone
    sandstone:     { friction:0.65, restitution:0.22, drag:0.02, dustParticle:true,  skidMark:true,  slipAngle:26 },
    // Fantasy
    crystal_grass: { friction:0.75, restitution:0.45, drag:0.015,dustParticle:false, skidMark:false, slipAngle:32 },
    cloud_platform:{ friction:0.50, restitution:0.60, drag:0.02, dustParticle:false, skidMark:false, slipAngle:20 },
    magic_stone:   { friction:0.80, restitution:0.40, drag:0.01, dustParticle:false, skidMark:false, slipAngle:36 },
    rainbow_path:  { friction:0.72, restitution:0.35, drag:0.01, dustParticle:false, skidMark:false, slipAngle:30 },
    // Alpine
    alpine_grass:  { friction:0.68, restitution:0.20, drag:0.02, dustParticle:false, skidMark:false, slipAngle:28 },
    // Ocean
    coral:         { friction:0.75, restitution:0.20, drag:0.03, dustParticle:false, skidMark:false, slipAngle:30 },
    // Misc
    leaves:        { friction:0.55, restitution:0.12, drag:0.03, dustParticle:false, skidMark:false, slipAngle:22 },
    salt_flat:     { friction:0.75, restitution:0.20, drag:0.01, dustParticle:true,  skidMark:true,  slipAngle:32 },
    rubble:        { friction:0.60, restitution:0.25, drag:0.04, dustParticle:true,  skidMark:false, slipAngle:24 }
  },

  get: function(surfaceId) {
    return this.surfaces[surfaceId] || this.surfaces.dirt;
  },

  blend: function(surfA, surfB, t) {
    var a = this.get(surfA), b = this.get(surfB);
    return {
      friction:    a.friction    * (1-t) + b.friction    * t,
      restitution: a.restitution * (1-t) + b.restitution * t,
      drag:        a.drag        * (1-t) + b.drag        * t
    };
  }
};

// Vehicle-terrain interaction matrix (detailed)
const VEHICLE_SURFACE_MATRIX = {
  version: "1.0.0",
  vehicles: ['jeep','bike','truck','atv','dune_buggy','tractor','sports_car','monster_truck'],
  surfaces: Object.keys(SURFACE_PHYSICS_EXTENDED.surfaces),

  // Multipliers: [traction, speed, fuel_consumption]
  matrix: (function() {
    var m = {};
    var veh = ['jeep','bike','truck','atv','dune_buggy','tractor','sports_car','monster_truck'];
    var surfs = {
      dirt:0, grass:1, mud:2, sand:3, gravel:4, rock:5, asphalt:6,
      ice:7, snow:8, lava_rock:9, crystal:10, wood:11
    };
    // Base performance by vehicle type on key surfaces
    var base = {
      jeep:         [0.85,0.80,0.65,0.70,0.78,0.82,0.88,0.40,0.55,0.75,0.80,0.78],
      bike:         [0.70,0.78,0.35,0.45,0.68,0.60,0.92,0.25,0.35,0.60,0.72,0.70],
      truck:        [0.80,0.72,0.72,0.65,0.75,0.88,0.82,0.35,0.50,0.78,0.70,0.75],
      atv:          [0.88,0.85,0.70,0.80,0.82,0.85,0.80,0.38,0.58,0.72,0.78,0.80],
      dune_buggy:   [0.82,0.75,0.55,0.90,0.80,0.72,0.85,0.30,0.45,0.68,0.75,0.72],
      tractor:      [0.78,0.70,0.85,0.60,0.72,0.82,0.60,0.30,0.55,0.80,0.65,0.70],
      sports_car:   [0.60,0.65,0.25,0.30,0.55,0.55,0.98,0.20,0.28,0.45,0.60,0.65],
      monster_truck:[0.90,0.80,0.80,0.75,0.85,0.90,0.75,0.45,0.65,0.85,0.80,0.85]
    };
    veh.forEach(function(v) { m[v] = base[v] || new Array(12).fill(0.7); });
    return m;
  }()),

  getMultiplier: function(vehicleId, surfaceId) {
    var row = this.matrix[vehicleId];
    if (!row) return 1.0;
    var surfaces = ['dirt','grass','mud','sand','gravel','rock','asphalt','ice','snow','lava_rock','crystal','wood'];
    var idx = surfaces.indexOf(surfaceId);
    return idx>=0 ? row[idx] : 0.75;
  }
};

// Slope angle physics LUT (0-90 degrees)
const SLOPE_PHYSICS_LUT = {
  version: "1.0.0",
  entries: (function() {
    var entries = [];
    for (var deg=0; deg<=90; deg++) {
      var rad = deg * Math.PI / 180;
      entries.push({
        angleDeg:    deg,
        sinA:        Math.sin(rad),
        cosA:        Math.cos(rad),
        gravityComponent: 9.81 * Math.sin(rad),
        normalForce: 9.81 * Math.cos(rad),
        maxFriction: 0.75 * 9.81 * Math.cos(rad),
        slipThreshold: deg > 30 ? (deg-30)/60 : 0
      });
    }
    return entries;
  }()),

  getAt: function(deg) {
    var d = Math.min(Math.max(Math.round(deg), 0), 90);
    return this.entries[d];
  }
};

// Spring/damper suspension lookup for terrain bumps
const SUSPENSION_TERRAIN_LUT = {
  version: "1.0.0",
  springK:   12000,  // N/m
  damperC:   800,    // N·s/m
  naturalFreq: 0,
  criticalDamping: 0,

  init: function(mass) {
    mass = mass || 400;
    this.naturalFreq     = Math.sqrt(this.springK/mass);
    this.criticalDamping = 2 * Math.sqrt(this.springK*mass);
  },

  bumpResponse: function(bumpHeight, vehicleSpeed) {
    var omega = this.naturalFreq;
    var zeta  = this.damperC / this.criticalDamping;
    var maxForce = this.springK * bumpHeight;
    var settleTime = 4 / (zeta * omega);
    return { maxForce:maxForce, settleTime:settleTime, zeta:zeta, omega:omega };
  },

  // Pre-computed LUT for bump heights 0-200px, speed 0-500 kph
  table: (function() {
    var rows = [];
    for (var h=0; h<=200; h+=10) {
      var cols = [];
      for (var v=0; v<=500; v+=50) {
        var impact = h * (1 + v*0.002);
        var airTime = h>60 ? Math.sqrt(2*(h-60)/9.81)*0.2 : 0;
        cols.push({ bumpH:h, speedKph:v, impactForce:Math.round(impact), airTimeMs:Math.round(airTime*1000) });
      }
      rows.push(cols);
    }
    return rows;
  }())
};

// Terrain acceleration zones
const ACCELERATION_ZONES = {
  version: "1.0.0",
  zones: [
    { id:'speed_boost_sm',  multiplier:1.5,  duration:2000, visual:'yellow_arrows', sound:'whoosh'      },
    { id:'speed_boost_lg',  multiplier:2.2,  duration:3000, visual:'orange_arrows', sound:'big_whoosh'  },
    { id:'mud_drag',        multiplier:0.4,  duration:0,    visual:'mud_splash',    sound:'splashing'   },
    { id:'sand_drag',       multiplier:0.55, duration:0,    visual:'sand_cloud',    sound:'sand_hiss'   },
    { id:'ice_slip',        multiplier:1.3,  duration:0,    visual:'ice_glitter',   sound:'skid'        },
    { id:'downhill_boost',  multiplier:1.4,  duration:0,    visual:'speed_lines',   sound:'wind'        },
    { id:'water_resist',    multiplier:0.35, duration:0,    visual:'water_spray',   sound:'water_drag'  },
    { id:'wind_assist',     multiplier:1.25, duration:5000, visual:'wind_streaks',  sound:'wind'        },
    { id:'wind_resist',     multiplier:0.75, duration:5000, visual:'wind_push',     sound:'wind_hard'   },
    { id:'gravity_flip',    multiplier:1.0,  duration:3000, visual:'purple_glow',   sound:'magic_hum',  gravityInvert:true },
    { id:'zero_gravity',    multiplier:1.1,  duration:2000, visual:'sparkles',      sound:'float_hum',  gravityScale:0.1  },
    { id:'sticky_terrain',  multiplier:0.6,  duration:0,    visual:'goo_trail',     sound:'squelch',    extraFriction:0.5 },
    { id:'magnetic_surface',multiplier:1.0,  duration:0,    visual:'magnet_sparks', sound:'buzz',       stickToGround:true}
  ],

  getZone: function(id) { return this.zones.find(function(z){ return z.id===id; })||null; }
};

// Terrain lighting tables
const TERRAIN_LIGHTING = {
  version: "1.0.0",
  presets: {
    dawn:     { ambientR:255, ambientG:200, ambientB:150, intensity:0.55, sunAngle:5,  shadowLength:8  },
    morning:  { ambientR:255, ambientG:240, ambientB:210, intensity:0.80, sunAngle:20, shadowLength:3  },
    noon:     { ambientR:255, ambientG:255, ambientB:245, intensity:1.00, sunAngle:80, shadowLength:0.3},
    afternoon:{ ambientR:255, ambientG:240, ambientB:200, intensity:0.90, sunAngle:45, shadowLength:1.5},
    dusk:     { ambientR:255, ambientG:180, ambientB:100, intensity:0.55, sunAngle:8,  shadowLength:7  },
    night:    { ambientR:60,  ambientG:80,  ambientB:120, intensity:0.20, sunAngle:-30,shadowLength:0  },
    cloudy:   { ambientR:200, ambientG:210, ambientB:220, intensity:0.60, sunAngle:60, shadowLength:0  },
    storm:    { ambientR:120, ambientG:130, ambientB:150, intensity:0.35, sunAngle:50, shadowLength:0  },
    underground:{ ambientR:20, ambientG:30, ambientB:50,  intensity:0.15, sunAngle:0,  shadowLength:0  },
    lava_glow:  { ambientR:255, ambientG:80, ambientB:20, intensity:0.70, sunAngle:0,  shadowLength:0  }
  },

  interpolate: function(presetA, presetB, t) {
    var a = this.presets[presetA]||this.presets.noon;
    var b = this.presets[presetB]||this.presets.noon;
    return {
      ambientR:   Math.round(a.ambientR   *(1-t)+b.ambientR   *t),
      ambientG:   Math.round(a.ambientG   *(1-t)+b.ambientG   *t),
      ambientB:   Math.round(a.ambientB   *(1-t)+b.ambientB   *t),
      intensity:  a.intensity  *(1-t)+b.intensity  *t,
      sunAngle:   a.sunAngle   *(1-t)+b.sunAngle   *t,
      shadowLength:a.shadowLength*(1-t)+b.shadowLength*t
    };
  }
};

// Particle effect configs per surface (extended)
const SURFACE_PARTICLE_EXTENDED = {
  version: "1.0.0",
  configs: {
    dirt_skid:   { count:8,  spread:30, life:600,  gravity:0.3, color:'#806040', size:[3,8],  fade:true  },
    grass_churn: { count:6,  spread:20, life:400,  gravity:0.2, color:'#60a030', size:[2,5],  fade:true  },
    mud_splash:  { count:12, spread:40, life:500,  gravity:0.5, color:'#503010', size:[4,12], fade:false },
    sand_cloud:  { count:15, spread:50, life:800,  gravity:0.1, color:'#c0a060', size:[3,10], fade:true  },
    snow_spray:  { count:10, spread:35, life:700,  gravity:0.05,color:'#e0eeff', size:[2,8],  fade:true  },
    ice_chip:    { count:5,  spread:25, life:500,  gravity:0.4, color:'#c0e0ff', size:[3,7],  fade:false },
    gravel_kick: { count:7,  spread:35, life:450,  gravity:0.6, color:'#807060', size:[3,9],  fade:false },
    ash_puff:    { count:10, spread:40, life:1000, gravity:0.05,color:'#808080', size:[5,15], fade:true  },
    lava_spark:  { count:6,  spread:20, life:800,  gravity:0.3, color:'#ff6000', size:[3,8],  fade:true, glow:true },
    crystal_shard:{ count:4, spread:15, life:600,  gravity:0.4, color:'#80c0e0', size:[4,10], fade:false,glow:true },
    water_splash:{ count:12, spread:45, life:500,  gravity:0.6, color:'#60a0e0', size:[3,12], fade:true  },
    smoke_trail: { count:5,  spread:10, life:1200, gravity:-0.1,color:'#808080', size:[8,20], fade:true  },
    leaves_kick: { count:5,  spread:30, life:600,  gravity:0.2, color:'#608030', size:[4,10], fade:true  },
    dust_devil:  { count:20, spread:60, life:1500, gravity:-0.2,color:'#c0b080', size:[4,16], fade:true, spin:true }
  }
};

if (typeof window !== "undefined") {
  window.SURFACE_PHYSICS_EXTENDED   = SURFACE_PHYSICS_EXTENDED;
  window.VEHICLE_SURFACE_MATRIX     = VEHICLE_SURFACE_MATRIX;
  window.SLOPE_PHYSICS_LUT          = SLOPE_PHYSICS_LUT;
  window.SUSPENSION_TERRAIN_LUT     = SUSPENSION_TERRAIN_LUT;
  window.ACCELERATION_ZONES         = ACCELERATION_ZONES;
  window.TERRAIN_LIGHTING           = TERRAIN_LIGHTING;
  window.SURFACE_PARTICLE_EXTENDED  = SURFACE_PARTICLE_EXTENDED;
}
if (typeof module !== "undefined") {
  module.exports = { SURFACE_PHYSICS_EXTENDED, VEHICLE_SURFACE_MATRIX, SLOPE_PHYSICS_LUT,
                     SUSPENSION_TERRAIN_LUT, ACCELERATION_ZONES, TERRAIN_LIGHTING, SURFACE_PARTICLE_EXTENDED };
}
})();

// ============================================================
// TERRAIN_AUDIO_V2 — Extended audio event library (~25KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_AUDIO_V2 = {
  version: "2.0.0",
  description: "Complete audio event map for terrain interactions",

  // Surface rolling sounds
  surfaceRollSounds: {
    asphalt:       { loop:'roll_asphalt',     pitchMin:0.80, pitchMax:1.20, volMin:0.3, volMax:0.9 },
    concrete:      { loop:'roll_concrete',    pitchMin:0.82, pitchMax:1.18, volMin:0.3, volMax:0.9 },
    dirt:          { loop:'roll_dirt',        pitchMin:0.75, pitchMax:1.25, volMin:0.4, volMax:1.0 },
    grass:         { loop:'roll_grass',       pitchMin:0.80, pitchMax:1.15, volMin:0.3, volMax:0.8 },
    gravel:        { loop:'roll_gravel',      pitchMin:0.70, pitchMax:1.30, volMin:0.5, volMax:1.0 },
    sand:          { loop:'roll_sand',        pitchMin:0.75, pitchMax:1.20, volMin:0.35,volMax:0.85},
    mud:           { loop:'roll_mud',         pitchMin:0.65, pitchMax:1.10, volMin:0.6, volMax:1.0 },
    ice:           { loop:'roll_ice',         pitchMin:0.90, pitchMax:1.10, volMin:0.2, volMax:0.6 },
    snow:          { loop:'roll_snow',        pitchMin:0.80, pitchMax:1.15, volMin:0.25,volMax:0.7 },
    rock:          { loop:'roll_rock',        pitchMin:0.70, pitchMax:1.25, volMin:0.4, volMax:0.9 },
    wood:          { loop:'roll_wood',        pitchMin:0.78, pitchMax:1.22, volMin:0.45,volMax:0.9 },
    metal:         { loop:'roll_metal',       pitchMin:0.85, pitchMax:1.15, volMin:0.4, volMax:0.8 },
    lava_rock:     { loop:'roll_lava_rock',   pitchMin:0.70, pitchMax:1.20, volMin:0.5, volMax:1.0 },
    crystal:       { loop:'roll_crystal',     pitchMin:1.00, pitchMax:1.40, volMin:0.3, volMax:0.8 },
    cloud_platform:{ loop:'roll_cloud',       pitchMin:0.95, pitchMax:1.05, volMin:0.1, volMax:0.4 },
    steel_grate:   { loop:'roll_metal',       pitchMin:0.82, pitchMax:1.18, volMin:0.4, volMax:0.85}
  },

  // Impact sounds (landing, crash)
  impactSounds: {
    light:    [{ file:'impact_light_1'  }, { file:'impact_light_2'  }, { file:'impact_light_3'  }],
    medium:   [{ file:'impact_medium_1' }, { file:'impact_medium_2' }, { file:'impact_medium_3' }],
    heavy:    [{ file:'impact_heavy_1'  }, { file:'impact_heavy_2'  }],
    critical: [{ file:'impact_crash_1'  }, { file:'impact_crash_2'  }],
    water:    [{ file:'splash_1'         }, { file:'splash_2'         }, { file:'splash_3'         }],
    sand:     [{ file:'sand_impact_1'    }, { file:'sand_impact_2'    }],
    mud:      [{ file:'mud_impact_1'     }, { file:'mud_impact_2'     }],
    snow:     [{ file:'snow_impact_1'    }, { file:'snow_impact_2'    }],
    ice:      [{ file:'ice_crack_1'      }, { file:'ice_crack_2'      }],
    glass:    [{ file:'glass_break_1'    }],
    wood:     [{ file:'wood_impact_1'    }, { file:'wood_impact_2'    }],
    metal:    [{ file:'metal_clang_1'    }, { file:'metal_clang_2'    }, { file:'metal_clang_3'   }]
  },

  // Ambient loops per biome
  ambientLoops: {
    tropical_rainforest:{ loop:'jungle_ambience',   volume:0.55 },
    temperate_forest:   { loop:'forest_ambience',   volume:0.50 },
    taiga:              { loop:'winter_forest',      volume:0.45 },
    tundra:             { loop:'arctic_wind',        volume:0.60 },
    hot_desert:         { loop:'desert_ambience',   volume:0.40 },
    cold_desert:        { loop:'empty_wind',         volume:0.35 },
    savanna:            { loop:'savanna_ambience',  volume:0.50 },
    grassland:          { loop:'meadow_ambience',   volume:0.45 },
    wetland:            { loop:'swamp_ambience',    volume:0.55 },
    mangrove:           { loop:'mangrove_ambience', volume:0.50 },
    alpine:             { loop:'mountain_wind',     volume:0.55 },
    volcanic:           { loop:'volcano_ambience',  volume:0.65 },
    coastal:            { loop:'ocean_waves',       volume:0.60 },
    oceanic:            { loop:'island_waves',      volume:0.65 },
    arctic_sea:         { loop:'blizzard_ambience', volume:0.70 },
    underground:        { loop:'cave_drip',          volume:0.40 },
    urban:              { loop:'city_ambience',     volume:0.55 },
    industrial:         { loop:'factory_ambience',  volume:0.60 },
    ruins:              { loop:'wind_ruins',         volume:0.45 },
    fantasy:            { loop:'magic_ambience',    volume:0.50 }
  },

  // Weather audio
  weatherAudio: {
    clear:      null,
    rain:       { loop:'rain_medium',    volume:0.50 },
    heavyRain:  { loop:'rain_heavy',     volume:0.70 },
    snow:       { loop:'snow_wind',      volume:0.45 },
    blizzard:   { loop:'blizzard_heavy', volume:0.80 },
    thunder:    { oneShot:'thunder_',    count:4, interval:[5000,15000] },
    sandstorm:  { loop:'sand_storm',     volume:0.75 },
    fog:        { loop:'fog_ambient',    volume:0.20 },
    volcano:    { loop:'eruption_rumble',volume:0.70 }
  },

  // Event-specific audio cues
  eventAudio: {
    landslide:      { warning:'deep_rumble',    active:'boulder_rumble',  end:'dust_settle' },
    earthquake:     { warning:'pre_quake_hum',  active:'earthquake',      end:'aftershock'  },
    flood:          { warning:'water_rushing',  active:'flood_ambient',   end:'water_drain' },
    lightning_strike:{ warning:'thunder_far',   active:'lightning_boom',  end:null          },
    volcano_eruption:{ warning:'rumble_build',  active:'eruption',        end:'lava_flow'   },
    sinkhole:       { warning:'ground_crack',   active:'collapse',        end:'rubble'      },
    bridge_collapse:{ warning:'creak_wood',     active:'bridge_break',    end:'splash'      },
    tunnel_collapse:{ warning:'ceiling_crack',  active:'tunnel_collapse', end:'dust_fall'   },
    platform_rising:{ warning:'mechanism_start',active:'platform_hum',   end:'clunk'       },
    wind_gust:      { warning:'whistle_start',  active:'gust_heavy',      end:'wind_dies'   }
  },

  // Music stingers (short accent sounds)
  stingers: {
    checkpoint:   'stinger_checkpoint',
    finish:       'stinger_finish',
    new_record:   'stinger_record',
    close_call:   'stinger_close_call',
    big_jump:     'stinger_air_time',
    crash_minor:  'stinger_crash_sm',
    crash_major:  'stinger_crash_lg',
    boost:        'stinger_boost',
    biome_change: 'stinger_biome_transition'
  },

  // Dynamic music system
  dynamicMusic: {
    calm:         { track:'music_calm',    volume:0.40, bpm:80  },
    normal:       { track:'music_normal',  volume:0.50, bpm:110 },
    intense:      { track:'music_intense', volume:0.60, bpm:140 },
    danger:       { track:'music_danger',  volume:0.65, bpm:160 },
    finish:       { track:'music_victory', volume:0.70, bpm:130 },
    underground:  { track:'music_cave',    volume:0.45, bpm:90  },
    volcanic:     { track:'music_volcano', volume:0.60, bpm:150 },
    fantasy:      { track:'music_fantasy', volume:0.55, bpm:120 }
  },

  selectMusicMood: function(vehicleSpeed, nearObstacle, biomeId) {
    if (nearObstacle && vehicleSpeed > 100) return 'danger';
    if (vehicleSpeed > 150)                return 'intense';
    if (biomeId === 'underground')          return 'underground';
    if (biomeId === 'volcanic')             return 'volcanic';
    if (biomeId === 'fantasy')              return 'fantasy';
    if (vehicleSpeed < 30)                  return 'calm';
    return 'normal';
  }
};

// Haptic/vibration feedback table (mobile)
const HAPTIC_FEEDBACK_TABLE = {
  version: "1.0.0",
  events: {
    surface_change:   { duration:30,  intensity:0.3, pattern:[30,0]               },
    small_bump:       { duration:20,  intensity:0.25,pattern:[20,0]               },
    large_bump:       { duration:50,  intensity:0.6, pattern:[50,0]               },
    landing_soft:     { duration:40,  intensity:0.4, pattern:[40,0]               },
    landing_hard:     { duration:80,  intensity:0.8, pattern:[30,20,30]           },
    crash:            { duration:200, intensity:1.0, pattern:[100,30,70]          },
    skid:             { duration:0,   intensity:0.35,pattern:'continuous'         },
    mud_drag:         { duration:0,   intensity:0.4, pattern:'pulse:50ms'         },
    ice_slip:         { duration:60,  intensity:0.2, pattern:[60,0]               },
    earthquake:       { duration:3000,intensity:0.7, pattern:'random'             },
    jump_launch:      { duration:40,  intensity:0.5, pattern:[40,0]               },
    checkpoint:       { duration:60,  intensity:0.6, pattern:[20,10,20,10,20]     },
    finish:           { duration:300, intensity:0.9, pattern:[50,20,50,20,50,20,50]},
    boost_start:      { duration:80,  intensity:0.7, pattern:[80,0]               },
    warning:          { duration:100, intensity:0.4, pattern:[50,30,50]           }
  }
};

if (typeof window !== "undefined") {
  window.TERRAIN_AUDIO_V2        = TERRAIN_AUDIO_V2;
  window.HAPTIC_FEEDBACK_TABLE   = HAPTIC_FEEDBACK_TABLE;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_AUDIO_V2, HAPTIC_FEEDBACK_TABLE };
}
})();

// ============================================================
// TERRAIN_RENDER_PIPELINE — Rendering pipeline data (~20KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_RENDER_PIPELINE = {
  version: "1.0.0",
  description: "Render pipeline configuration for terrain visuals",

  // Canvas layer stack
  layers: [
    { id:'sky',           canvas:'sky_canvas',    order:0,  compositeOp:'source-over', opacity:1.0, cached:true  },
    { id:'parallax_far',  canvas:'par_far',       order:10, compositeOp:'source-over', opacity:0.8, cached:false },
    { id:'parallax_mid',  canvas:'par_mid',       order:20, compositeOp:'source-over', opacity:0.9, cached:false },
    { id:'parallax_near', canvas:'par_near',      order:30, compositeOp:'source-over', opacity:1.0, cached:false },
    { id:'terrain_fill',  canvas:'terrain_fill',  order:40, compositeOp:'source-over', opacity:1.0, cached:false },
    { id:'terrain_line',  canvas:'terrain_line',  order:45, compositeOp:'source-over', opacity:1.0, cached:false },
    { id:'decoration',    canvas:'decoration',    order:50, compositeOp:'source-over', opacity:1.0, cached:false },
    { id:'effects',       canvas:'effects',       order:60, compositeOp:'screen',      opacity:0.7, cached:false },
    { id:'vehicle',       canvas:'vehicle',       order:70, compositeOp:'source-over', opacity:1.0, cached:false },
    { id:'particles',     canvas:'particles',     order:80, compositeOp:'source-over', opacity:1.0, cached:false },
    { id:'weather',       canvas:'weather',       order:85, compositeOp:'source-over', opacity:0.85,cached:false },
    { id:'fog',           canvas:'fog',           order:90, compositeOp:'multiply',    opacity:0.5, cached:false },
    { id:'hud',           canvas:'hud',           order:100,compositeOp:'source-over', opacity:1.0, cached:false }
  ],

  // Render quality presets
  qualityPresets: {
    low:    { resolution:0.5, shadows:false, particles:false, reflections:false, antiAlias:false, particleCount:0.2 },
    medium: { resolution:0.75,shadows:false, particles:true,  reflections:false, antiAlias:false, particleCount:0.5 },
    high:   { resolution:1.0, shadows:true,  particles:true,  reflections:false, antiAlias:true,  particleCount:1.0 },
    ultra:  { resolution:1.0, shadows:true,  particles:true,  reflections:true,  antiAlias:true,  particleCount:1.5 }
  },

  // Terrain fill gradient definitions
  terrainGradients: {
    default:     [{ stop:0.0, color:'#4a7a3a'},{stop:0.5, color:'#3a5a2a'},{stop:1.0, color:'#2a3a1a'}],
    rock:        [{ stop:0.0, color:'#808070'},{stop:0.5, color:'#606050'},{stop:1.0, color:'#404030'}],
    sand:        [{ stop:0.0, color:'#d0b060'},{stop:0.5, color:'#b09040'},{stop:1.0, color:'#806020'}],
    snow:        [{ stop:0.0, color:'#f0f4f8'},{stop:0.5, color:'#d0d8e0'},{stop:1.0, color:'#a0b0c0'}],
    lava_rock:   [{ stop:0.0, color:'#302010'},{stop:0.5, color:'#201008'},{stop:1.0, color:'#100800'}],
    ice:         [{ stop:0.0, color:'#c8e8f8'},{stop:0.5, color:'#a0c8e0'},{stop:1.0, color:'#80a8c0'}],
    mud:         [{ stop:0.0, color:'#5a3820'},{stop:0.5, color:'#3a2010'},{stop:1.0, color:'#201008'}],
    asphalt:     [{ stop:0.0, color:'#303030'},{stop:0.5, color:'#202020'},{stop:1.0, color:'#101010'}],
    crystal:     [{ stop:0.0, color:'#a0c8e8'},{stop:0.5, color:'#80a8c8'},{stop:1.0, color:'#6088a8'}],
    fantasy:     [{ stop:0.0, color:'#8840e0'},{stop:0.5, color:'#6020c0'},{stop:1.0, color:'#400080'}]
  },

  // Parallax scroll speeds per layer
  parallaxSpeeds: [0, 0.05, 0.12, 0.22, 0.35, 0.55, 0.75, 1.0],

  // Shadow casting config
  shadow: {
    enabled:    true,
    angle:      45,   // degrees from vertical
    blur:       4,
    color:      'rgba(0,0,0,0.35)',
    offsetX:    3,
    offsetY:    3,
    maxDistance:200
  },

  // Anti-aliasing config
  aa: {
    enabled:    true,
    method:     'canvas_smoothing',
    imageSmoothingQuality: 'high'
  },

  // Frame budget targets (ms)
  frameBudget: {
    target:       16.67,
    terrainDraw:  4.0,
    decorations:  3.0,
    particles:    2.5,
    vehicle:      2.0,
    hud:          1.5,
    overhead:     3.67
  },

  // Dirty region tracking
  dirtyRegion: { x:0, y:0, w:0, h:0, isDirty:false },
  markDirty: function(x,y,w,h) {
    if (!this.dirtyRegion.isDirty) {
      this.dirtyRegion = { x:x, y:y, w:w, h:h, isDirty:true };
    } else {
      var r = this.dirtyRegion;
      var x1 = Math.min(r.x, x), y1 = Math.min(r.y, y);
      var x2 = Math.max(r.x+r.w, x+w), y2 = Math.max(r.y+r.h, y+h);
      this.dirtyRegion = { x:x1, y:y1, w:x2-x1, h:y2-y1, isDirty:true };
    }
  },
  clearDirty: function() { this.dirtyRegion.isDirty = false; }
};

// Terrain line rendering style table
const TERRAIN_LINE_STYLES = {
  version: "1.0.0",
  styles: {
    default:     { strokeStyle:'#2a1a08', lineWidth:2, lineCap:'round', lineJoin:'round', dash:[] },
    grass:       { strokeStyle:'#3a6a1a', lineWidth:2, lineCap:'round', lineJoin:'round', dash:[] },
    sand:        { strokeStyle:'#a08040', lineWidth:2, lineCap:'butt',  lineJoin:'miter', dash:[] },
    ice:         { strokeStyle:'#80b0d0', lineWidth:1.5,lineCap:'round',lineJoin:'round', dash:[] },
    lava:        { strokeStyle:'#ff4000', lineWidth:3, lineCap:'round', lineJoin:'round', dash:[], glow:'#ff8000' },
    crystal:     { strokeStyle:'#60a8d0', lineWidth:2, lineCap:'round', lineJoin:'round', dash:[], glow:'#80c8f0' },
    fantasy:     { strokeStyle:'#b060ff', lineWidth:2.5,lineCap:'round',lineJoin:'round', dash:[],  glow:'#d080ff' },
    dashed_warn: { strokeStyle:'#ff8000', lineWidth:2, lineCap:'butt',  lineJoin:'miter', dash:[10,8] },
    snow:        { strokeStyle:'#c0d8f0', lineWidth:2, lineCap:'round', lineJoin:'round', dash:[] }
  }
};

// Screen-space effect configs
const TERRAIN_SCREEN_EFFECTS = {
  version: "1.0.0",
  effects: {
    speed_lines:   { enabled:false, count:20, color:'rgba(255,255,255,0.4)', minSpeed:200 },
    vignette:      { enabled:true,  strength:0.4, color:'rgba(0,0,0,0.6)'                },
    chromatic_ab:  { enabled:false, strength:3, triggerSpeed:300                          },
    screen_shake:  { enabled:true,  amplitude:0, decay:0.85                              },
    flash_white:   { enabled:false, alpha:0, decay:0.92                                  },
    blur_motion:   { enabled:false, amount:0, maxAmount:6                                },
    scanlines:     { enabled:false, spacing:4, opacity:0.1                               },
    heat_distort:  { enabled:false, strength:0, biomes:['volcanic','hot_desert']         }
  },

  update: function(vehicleSpeed, currentBiome) {
    var eff = this.effects;
    eff.speed_lines.enabled  = vehicleSpeed > eff.speed_lines.minSpeed;
    eff.heat_distort.enabled = eff.heat_distort.biomes.indexOf(currentBiome) >= 0;
    if (eff.screen_shake.amplitude > 0) eff.screen_shake.amplitude *= eff.screen_shake.decay;
    if (eff.flash_white.alpha > 0)      eff.flash_white.alpha      *= eff.flash_white.decay;
  },

  triggerShake:  function(amp)   { this.effects.screen_shake.amplitude = amp; },
  triggerFlash:  function(alpha) { this.effects.flash_white.alpha = alpha; },
  triggerBlur:   function(amt)   { this.effects.blur_motion.enabled = true; this.effects.blur_motion.amount = amt; }
};

if (typeof window !== "undefined") {
  window.TERRAIN_RENDER_PIPELINE = TERRAIN_RENDER_PIPELINE;
  window.TERRAIN_LINE_STYLES     = TERRAIN_LINE_STYLES;
  window.TERRAIN_SCREEN_EFFECTS          = TERRAIN_SCREEN_EFFECTS;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_RENDER_PIPELINE, TERRAIN_LINE_STYLES, TERRAIN_SCREEN_EFFECTS };
}
})();

// ============================================================
// TERRAIN_PROGRESSION_SYSTEM — Unlocks, rewards, meta (~15KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_PROGRESSION_SYSTEM = {
  version: "1.0.0",
  description: "Terrain unlock progression, rewards and meta-game data",

  // World map structure
  worlds: [
    {
      id:1, name:'Starter Valley',    biome:'grassland',  unlockRequirement:0,
      maps:[1001,1002,1003,1004,1005], starThresholds:{ 1:0.6, 2:0.8, 3:0.95 },
      reward:{ coins:500, gem:false }
    },
    {
      id:2, name:'Sandy Dunes',       biome:'hot_desert', unlockRequirement:3,
      maps:[2001,2002,2003,2004,2005], starThresholds:{ 1:0.5, 2:0.75, 3:0.92 },
      reward:{ coins:1000, gem:false }
    },
    {
      id:3, name:'Coastal Run',       biome:'coastal',    unlockRequirement:9,
      maps:[3001,3002,3003,3004,3005], starThresholds:{ 1:0.5, 2:0.72, 3:0.90 },
      reward:{ coins:1500, gem:false }
    },
    {
      id:4, name:'Jungle Depths',     biome:'tropical_rainforest', unlockRequirement:18,
      maps:[4001,4002,4003,4004,4005], starThresholds:{ 1:0.45,2:0.70, 3:0.88 },
      reward:{ coins:2000, gem:true  }
    },
    {
      id:5, name:'Frozen Peaks',      biome:'alpine',     unlockRequirement:30,
      maps:[5001,5002,5003,5004,5005], starThresholds:{ 1:0.40,2:0.65, 3:0.85 },
      reward:{ coins:3000, gem:true  }
    },
    {
      id:6, name:'Volcanic Inferno',  biome:'volcanic',   unlockRequirement:45,
      maps:[6001,6002,6003,6004,6005], starThresholds:{ 1:0.35,2:0.60, 3:0.82 },
      reward:{ coins:5000, gem:true  }
    },
    {
      id:7, name:'Fantasy Realm',     biome:'fantasy',    unlockRequirement:60,
      maps:[7001,7002,7003,7004,7005], starThresholds:{ 1:0.30,2:0.55, 3:0.80 },
      reward:{ coins:8000, gem:true  }
    }
  ],

  // Terrain-specific unlocks
  terrainUnlocks: [
    { id:'unlock_mud_tires',   requireStars:15, reward:'mud_tire_upgrade',   description:'Unlock mud tire upgrade' },
    { id:'unlock_snow_chains', requireStars:25, reward:'snow_chains',        description:'Unlock snow chains'      },
    { id:'unlock_fireproof',   requireStars:40, reward:'fire_protection',    description:'Unlock fire protection'  },
    { id:'unlock_submersible', requireStars:50, reward:'water_sealing',      description:'Unlock water sealing'    },
    { id:'unlock_anti_grav',   requireStars:65, reward:'anti_gravity_mod',   description:'Unlock anti-gravity mod' }
  ],

  // Star calculation
  calculateStars: function(time, bestTime, worldId) {
    var world = this.worlds.find(function(w){ return w.id===worldId; });
    if (!world) return 0;
    var ratio = bestTime / time;
    if (ratio >= world.starThresholds[3]) return 3;
    if (ratio >= world.starThresholds[2]) return 2;
    if (ratio >= world.starThresholds[1]) return 1;
    return 0;
  },

  // Daily challenge rotation
  dailyChallenges: [
    { id:'dc_speed_run',    name:'Speed Demon',   desc:'Complete any map under par time',    reward:200  },
    { id:'dc_no_crash',     name:'Clean Run',     desc:'Finish without crashing',            reward:300  },
    { id:'dc_big_air',      name:'Big Air',       desc:'Get 3 seconds of air time',          reward:250  },
    { id:'dc_surface_hop',  name:'Surface Hop',   desc:'Drive on 5 different surfaces',      reward:150  },
    { id:'dc_biome_run',    name:'Biome Hopper',  desc:'Finish a multi-biome map',           reward:350  }
  ],

  getDailyChallenge: function(dateStr) {
    var hash = 0;
    for (var i=0; i<dateStr.length; i++) hash = ((hash<<5)-hash)+dateStr.charCodeAt(i);
    return this.dailyChallenges[Math.abs(hash) % this.dailyChallenges.length];
  }
};

// Extended achievement list for terrain-related feats
const TERRAIN_ACHIEVEMENTS = {
  version: "1.0.0",
  achievements: [
    { id:'first_blood',       name:'First Blood',        desc:'Complete your first map',                        reward:100  },
    { id:'speed_demon',       name:'Speed Demon',        desc:'Reach 200 kph',                                  reward:200  },
    { id:'air_master',        name:'Air Master',         desc:'Jump 500m in a single jump',                     reward:500  },
    { id:'mud_wrestler',      name:'Mud Wrestler',       desc:'Drive through 1km of mud',                       reward:150  },
    { id:'ice_king',          name:'Ice King',           desc:'Complete a full map on ice surface',              reward:300  },
    { id:'volcano_survivor',  name:'Volcano Survivor',   desc:'Survive a volcanic eruption event',              reward:600  },
    { id:'earthquake_driver', name:'Earthquake Driver',  desc:'Keep driving during an earthquake event',        reward:400  },
    { id:'bridge_crosser',    name:'Bridge Crosser',     desc:'Cross 50 bridges without falling',               reward:250  },
    { id:'all_biomes',        name:'World Traveler',     desc:'Race in all 20 biomes',                          reward:1000 },
    { id:'perfect_run',       name:'Perfect Run',        desc:'Complete a map without any crash',               reward:500  },
    { id:'night_racer',       name:'Night Racer',        desc:'Complete 5 maps at night',                       reward:300  },
    { id:'storm_chaser',      name:'Storm Chaser',       desc:'Race during a thunderstorm',                     reward:400  },
    { id:'lava_surfer',       name:'Lava Surfer',        desc:'Drive over lava rock for 500m',                  reward:450  },
    { id:'crash_king',        name:'Crash King',         desc:'Crash 100 times',                                reward:100  },
    { id:'mileage',           name:'Road Warrior',       desc:'Drive 1000 total km',                            reward:750  },
    { id:'collector',         name:'Collector',          desc:'Unlock all terrain upgrades',                    reward:1500 },
    { id:'explorer',          name:'Explorer',           desc:'Discover all secret paths',                      reward:800  },
    { id:'speedrunner',       name:'Speedrunner',        desc:'Get 3-star rating on 30 maps',                   reward:2000 },
    { id:'survivalist',       name:'Survivalist',        desc:'Survive all 10 event types',                     reward:1200 },
    { id:'legend',            name:'Legend',             desc:'Complete all achievements',                       reward:5000 }
  ]
};

if (typeof window !== "undefined") {
  window.TERRAIN_PROGRESSION_SYSTEM = TERRAIN_PROGRESSION_SYSTEM;
  window.TERRAIN_ACHIEVEMENTS        = TERRAIN_ACHIEVEMENTS;
}
if (typeof module !== "undefined") {
  module.exports = { TERRAIN_PROGRESSION_SYSTEM, TERRAIN_ACHIEVEMENTS };
}
})();

// ============================================================
// OBSTACLE_LIBRARY_V2 — 80+ obstacles with full physics (~35KB)
// ============================================================
(function() {
"use strict";

const OBSTACLE_LIBRARY_V2 = {
  version: "2.0.0",
  description: "80+ obstacle definitions with full physics, animation and biome data",
  obstacles: [
    {
      id:'log_small', category:'log', width:60, height:25,
      shape:'cylindrical', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'temperate_forest', behavior:'roll',
      mass:20, restitution:0.16,
      friction:0.3, points:170
    },
    {
      id:'log_large', category:'log', width:140, height:45,
      shape:'cylindrical', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'temperate_forest', behavior:'roll',
      mass:68, restitution:0.32,
      friction:0.63, points:76
    },
    {
      id:'barrel_empty', category:'barrel', width:30, height:45,
      shape:'cylindrical', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'industrial', behavior:'roll',
      mass:18, restitution:0.23,
      friction:0.69, points:124
    },
    {
      id:'barrel_full', category:'barrel', width:30, height:45,
      shape:'cylindrical', hasPhysics:true, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'static',
      mass:18, restitution:0.24,
      friction:0.59, points:138
    },
    {
      id:'barrel_explosive', category:'barrel', width:30, height:45,
      shape:'cylindrical', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'industrial', behavior:'explode',
      mass:18, restitution:0.32,
      friction:0.72, points:44
    },
    {
      id:'crate_wood', category:'crate', width:50, height:50,
      shape:'box', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'ruins', behavior:'break',
      mass:30, restitution:0.22,
      friction:0.54, points:109
    },
    {
      id:'crate_metal', category:'crate', width:50, height:50,
      shape:'box', hasPhysics:true, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'static',
      mass:30, restitution:0.46,
      friction:0.51, points:11
    },
    {
      id:'tire_single', category:'tire', width:40, height:40,
      shape:'torus', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'urban', behavior:'roll',
      mass:21, restitution:0.5,
      friction:0.51, points:106
    },
    {
      id:'tire_stack', category:'tire', width:50, height:150,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'urban', behavior:'static',
      mass:80, restitution:0.44,
      friction:0.71, points:157
    },
    {
      id:'boulder_sm', category:'boulder', width:50, height:45,
      shape:'sphere', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'alpine', behavior:'roll',
      mass:27, restitution:0.58,
      friction:0.67, points:20
    },
    {
      id:'boulder_lg', category:'boulder', width:120, height:100,
      shape:'sphere', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'alpine', behavior:'roll',
      mass:125, restitution:0.17,
      friction:0.43, points:40
    },
    {
      id:'ramp_sm', category:'ramp', width:120, height:40,
      shape:'wedge', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'grassland', behavior:'static',
      mass:53, restitution:0.52,
      friction:0.83, points:65
    },
    {
      id:'ramp_lg', category:'ramp', width:220, height:80,
      shape:'wedge', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'grassland', behavior:'static',
      mass:181, restitution:0.54,
      friction:0.56, points:41
    },
    {
      id:'ramp_kicker', category:'ramp', width:80, height:60,
      shape:'wedge', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'grassland', behavior:'static',
      mass:53, restitution:0.22,
      friction:0.86, points:199
    },
    {
      id:'springboard', category:'spring', width:70, height:25,
      shape:'box', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'spring',
      mass:22, restitution:0.38,
      friction:0.67, points:11
    },
    {
      id:'see_saw', category:'seesaw', width:180, height:20,
      shape:'plank', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'industrial', behavior:'pivot',
      mass:41, restitution:0.39,
      friction:0.63, points:90
    },
    {
      id:'spinning_blade', category:'trap', width:80, height:80,
      shape:'disc', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'spin',
      mass:69, restitution:0.13,
      friction:0.73, points:24
    },
    {
      id:'pendulum', category:'trap', width:20, height:200,
      shape:'pendulum', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'ruins', behavior:'swing',
      mass:45, restitution:0.4,
      friction:0.66, points:91
    },
    {
      id:'crusher', category:'trap', width:100, height:60,
      shape:'box', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'crush',
      mass:65, restitution:0.51,
      friction:0.84, points:114
    },
    {
      id:'spike_strip', category:'trap', width:200, height:15,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'static',
      mass:35, restitution:0.4,
      friction:0.82, points:72
    },
    {
      id:'spike_ball', category:'trap', width:40, height:40,
      shape:'sphere', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'ruins', behavior:'roll',
      mass:21, restitution:0.32,
      friction:0.71, points:121
    },
    {
      id:'swinging_log', category:'log', width:200, height:30,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'temperate_forest', behavior:'swing',
      mass:65, restitution:0.49,
      friction:0.64, points:195
    },
    {
      id:'haystack', category:'hay', width:80, height:70,
      shape:'box', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'grassland', behavior:'break',
      mass:61, restitution:0.24,
      friction:0.35, points:96
    },
    {
      id:'snowman', category:'snow', width:40, height:80,
      shape:'sphere', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'arctic_sea', behavior:'break',
      mass:37, restitution:0.17,
      friction:0.55, points:150
    },
    {
      id:'ice_block', category:'ice', width:50, height:50,
      shape:'box', hasPhysics:true, hasCollision:false,
      destructible:false, biome:'arctic_sea', behavior:'static',
      mass:30, restitution:0.57,
      friction:0.46, points:157
    },
    {
      id:'ice_pillar', category:'ice', width:30, height:150,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'arctic_sea', behavior:'static',
      mass:50, restitution:0.21,
      friction:0.42, points:14
    },
    {
      id:'lava_bomb', category:'lava', width:40, height:40,
      shape:'sphere', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'volcanic', behavior:'explosive',
      mass:21, restitution:0.19,
      friction:0.86, points:63
    },
    {
      id:'mud_pool', category:'mud', width:200, height:20,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'wetland', behavior:'surface',
      mass:45, restitution:0.38,
      friction:0.88, points:98
    },
    {
      id:'quicksand', category:'sand', width:200, height:20,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'hot_desert', behavior:'sink',
      mass:45, restitution:0.15,
      friction:0.39, points:129
    },
    {
      id:'oil_slick', category:'oil', width:200, height:10,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'surface',
      mass:25, restitution:0.46,
      friction:0.41, points:118
    },
    {
      id:'water_puddle', category:'water', width:150, height:10,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'coastal', behavior:'surface',
      mass:20, restitution:0.47,
      friction:0.45, points:68
    },
    {
      id:'sand_dune_sm', category:'dune', width:120, height:60,
      shape:'mound', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'hot_desert', behavior:'static',
      mass:77, restitution:0.48,
      friction:0.88, points:111
    },
    {
      id:'sand_dune_lg', category:'dune', width:240, height:120,
      shape:'mound', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'hot_desert', behavior:'static',
      mass:293, restitution:0.39,
      friction:0.45, points:191
    },
    {
      id:'thorn_bush', category:'bush', width:60, height:50,
      shape:'irregular', hasPhysics:false, hasCollision:true,
      destructible:true, biome:'savanna', behavior:'break',
      mass:35, restitution:0.57,
      friction:0.53, points:150
    },
    {
      id:'cactus_sm', category:'cactus', width:20, height:60,
      shape:'cylinder', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'hot_desert', behavior:'static',
      mass:17, restitution:0.5,
      friction:0.78, points:111
    },
    {
      id:'cactus_lg', category:'cactus', width:30, height:100,
      shape:'cylinder', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'hot_desert', behavior:'static',
      mass:35, restitution:0.15,
      friction:0.43, points:114
    },
    {
      id:'fence_wooden', category:'fence', width:200, height:40,
      shape:'panel', hasPhysics:false, hasCollision:true,
      destructible:true, biome:'grassland', behavior:'break',
      mass:85, restitution:0.44,
      friction:0.9, points:195
    },
    {
      id:'fence_metal', category:'fence', width:200, height:50,
      shape:'panel', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'urban', behavior:'static',
      mass:105, restitution:0.32,
      friction:0.47, points:155
    },
    {
      id:'concrete_block', category:'block', width:80, height:80,
      shape:'box', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'urban', behavior:'static',
      mass:69, restitution:0.46,
      friction:0.52, points:193
    },
    {
      id:'concrete_barrier', category:'barrier', width:160, height:80,
      shape:'box', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'urban', behavior:'static',
      mass:133, restitution:0.48,
      friction:0.68, points:96
    },
    {
      id:'car_wreck', category:'wreck', width:160, height:70,
      shape:'irregular', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'urban', behavior:'static',
      mass:117, restitution:0.16,
      friction:0.83, points:186
    },
    {
      id:'truck_wreck', category:'wreck', width:240, height:100,
      shape:'irregular', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'urban', behavior:'static',
      mass:245, restitution:0.36,
      friction:0.65, points:187
    },
    {
      id:'oil_drum', category:'drum', width:35, height:50,
      shape:'cylinder', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'industrial', behavior:'roll',
      mass:22, restitution:0.53,
      friction:0.88, points:144
    },
    {
      id:'propane_tank', category:'tank', width:40, height:60,
      shape:'cylinder', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'industrial', behavior:'explode',
      mass:29, restitution:0.58,
      friction:0.63, points:101
    },
    {
      id:'pipe_horizontal', category:'pipe', width:300, height:30,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'static',
      mass:95, restitution:0.33,
      friction:0.34, points:145
    },
    {
      id:'pipe_vertical', category:'pipe', width:30, height:200,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'static',
      mass:65, restitution:0.55,
      friction:0.78, points:46
    },
    {
      id:'wooden_plank', category:'plank', width:200, height:15,
      shape:'plank', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'ruins', behavior:'break',
      mass:35, restitution:0.16,
      friction:0.85, points:100
    },
    {
      id:'steel_beam', category:'beam', width:300, height:20,
      shape:'beam', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'static',
      mass:65, restitution:0.47,
      friction:0.35, points:162
    },
    {
      id:'platform_moving', category:'platform', width:150, height:20,
      shape:'box', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'move',
      mass:35, restitution:0.39,
      friction:0.4, points:91
    },
    {
      id:'platform_falling', category:'platform', width:150, height:20,
      shape:'box', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'ruins', behavior:'fall',
      mass:35, restitution:0.57,
      friction:0.66, points:59
    },
    {
      id:'trapdoor', category:'trap', width:80, height:10,
      shape:'flat', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'ruins', behavior:'fall',
      mass:13, restitution:0.57,
      friction:0.7, points:90
    },
    {
      id:'bridge_segment', category:'bridge', width:120, height:20,
      shape:'plank', hasPhysics:false, hasCollision:true,
      destructible:true, biome:'wetland', behavior:'break',
      mass:29, restitution:0.29,
      friction:0.7, points:171
    },
    {
      id:'crystal_spike', category:'crystal', width:20, height:80,
      shape:'prism', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'underground', behavior:'static',
      mass:21, restitution:0.58,
      friction:0.59, points:200
    },
    {
      id:'stalactite', category:'stone', width:15, height:100,
      shape:'cone', hasPhysics:false, hasCollision:true,
      destructible:true, biome:'underground', behavior:'fall',
      mass:20, restitution:0.31,
      friction:0.76, points:200
    },
    {
      id:'stalagmite', category:'stone', width:15, height:80,
      shape:'cone', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'underground', behavior:'static',
      mass:17, restitution:0.24,
      friction:0.63, points:49
    },
    {
      id:'mushroom_lg', category:'mushroom', width:90, height:100,
      shape:'dome', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'underground', behavior:'bounce',
      mass:95, restitution:0.2,
      friction:0.87, points:178
    },
    {
      id:'slime_patch', category:'slime', width:150, height:15,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'underground', behavior:'surface',
      mass:27, restitution:0.55,
      friction:0.41, points:153
    },
    {
      id:'gravity_pad', category:'pad', width:80, height:10,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'fantasy', behavior:'gravity',
      mass:13, restitution:0.31,
      friction:0.37, points:186
    },
    {
      id:'bounce_pad', category:'pad', width:80, height:10,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'fantasy', behavior:'spring',
      mass:13, restitution:0.45,
      friction:0.31, points:128
    },
    {
      id:'teleporter_a', category:'teleport', width:50, height:50,
      shape:'disc', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'fantasy', behavior:'teleport',
      mass:30, restitution:0.35,
      friction:0.32, points:148
    },
    {
      id:'teleporter_b', category:'teleport', width:50, height:50,
      shape:'disc', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'fantasy', behavior:'teleport',
      mass:30, restitution:0.3,
      friction:0.84, points:43
    },
    {
      id:'cloud_block', category:'cloud', width:120, height:40,
      shape:'irregular', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'fantasy', behavior:'cloud',
      mass:53, restitution:0.31,
      friction:0.77, points:10
    },
    {
      id:'lava_geyser', category:'geyser', width:30, height:10,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'volcanic', behavior:'geyser',
      mass:8, restitution:0.26,
      friction:0.79, points:156
    },
    {
      id:'ash_pile', category:'ash', width:100, height:30,
      shape:'mound', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'volcanic', behavior:'static',
      mass:35, restitution:0.11,
      friction:0.68, points:37
    },
    {
      id:'obsidian_spike', category:'obsidian', width:20, height:90,
      shape:'prism', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'volcanic', behavior:'static',
      mass:23, restitution:0.51,
      friction:0.81, points:194
    },
    {
      id:'magnet_zone', category:'magnetic', width:100, height:100,
      shape:'field', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'attract',
      mass:105, restitution:0.45,
      friction:0.4, points:87
    },
    {
      id:'wind_fan', category:'fan', width:80, height:80,
      shape:'disc', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'blow',
      mass:69, restitution:0.37,
      friction:0.77, points:172
    },
    {
      id:'trampoline', category:'bounce', width:80, height:20,
      shape:'flat', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'spring',
      mass:21, restitution:0.44,
      friction:0.38, points:63
    },
    {
      id:'rotating_arm', category:'arm', width:150, height:20,
      shape:'beam', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'spin',
      mass:35, restitution:0.38,
      friction:0.6, points:187
    },
    {
      id:'gear_sm', category:'gear', width:50, height:50,
      shape:'disc', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'spin',
      mass:30, restitution:0.16,
      friction:0.82, points:100
    },
    {
      id:'gear_lg', category:'gear', width:100, height:100,
      shape:'disc', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'spin',
      mass:105, restitution:0.24,
      friction:0.74, points:131
    },
    {
      id:'chain', category:'chain', width:20, height:200,
      shape:'chain', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'industrial', behavior:'swing',
      mass:45, restitution:0.57,
      friction:0.86, points:103
    },
    {
      id:'anchor', category:'anchor', width:60, height:80,
      shape:'anchor', hasPhysics:true, hasCollision:false,
      destructible:false, biome:'coastal', behavior:'static',
      mass:53, restitution:0.27,
      friction:0.66, points:24
    },
    {
      id:'life_ring', category:'ring', width:40, height:40,
      shape:'torus', hasPhysics:true, hasCollision:true,
      destructible:false, biome:'coastal', behavior:'roll',
      mass:21, restitution:0.54,
      friction:0.71, points:19
    },
    {
      id:'coral_head', category:'coral', width:60, height:70,
      shape:'irregular', hasPhysics:false, hasCollision:true,
      destructible:false, biome:'coastal', behavior:'static',
      mass:47, restitution:0.56,
      friction:0.81, points:159
    },
    {
      id:'wave_barrier', category:'barrier', width:20, height:80,
      shape:'cylinder', hasPhysics:false, hasCollision:false,
      destructible:false, biome:'coastal', behavior:'static',
      mass:21, restitution:0.31,
      friction:0.47, points:150
    },
    {
      id:'sand_castle', category:'castle', width:100, height:80,
      shape:'irregular', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'coastal', behavior:'break',
      mass:85, restitution:0.59,
      friction:0.44, points:43
    },
    {
      id:'driftwood', category:'log', width:180, height:30,
      shape:'irregular', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'coastal', behavior:'roll',
      mass:59, restitution:0.19,
      friction:0.38, points:193
    },
    {
      id:'seaweed_ball', category:'seaweed', width:50, height:50,
      shape:'sphere', hasPhysics:true, hasCollision:true,
      destructible:true, biome:'coastal', behavior:'roll',
      mass:30, restitution:0.26,
      friction:0.51, points:185
    }
  ],

  getById: function(id) { return this.obstacles.find(function(o){ return o.id===id; })||null; },
  getByBiome: function(biome) { return this.obstacles.filter(function(o){ return o.biome===biome; }); },
  getByCategory: function(cat) { return this.obstacles.filter(function(o){ return o.category===cat; }); }
};

if (typeof window !== "undefined") { window.OBSTACLE_LIBRARY_V2 = OBSTACLE_LIBRARY_V2; }
if (typeof module !== "undefined") { module.exports = { OBSTACLE_LIBRARY_V2 }; }
})();


// ============================================================
// TERRAIN_HEIGHT_TABLES_V2 — 60 procedural height tables (~60KB)
// ============================================================
(function() {
"use strict";

const TERRAIN_HEIGHT_TABLES_V2 = {
  version: "2.0.0",
  pointsPerTable: 256,
  tableCount: 60,
  tables: [
    { id:0, biome:'grassland', seed:48232, roughness:0.39, points:[302.7,307.6,316.5,322.0,329.9,328.9,328.3,328.0,324.0,313.9,309.1,299.1,296.1,282.1,284.1,276.1,275.8,274.0,281.8,282.0,288.8,292.2,300.5,310.6,314.4,314.5,308.9,315.4,312.3,308.0,299.2,294.7,294.0,295.7,292.2,294.0,291.9,297.5,303.0,308.4,312.5,311.3,319.0,314.3,318.1,313.2,305.6,303.0,295.8,292.6,278.7,274.6,277.8,275.3,270.7,274.7,282.8,287.0,296.8,303.4,317.4,319.6,332.8,335.5,335.2,333.1,325.3,321.2,313.7,302.3,289.7,286.0,276.5,273.8,269.6,273.9,270.1,279.3,284.9,291.0,294.7,302.7,315.7,314.4,316.8,318.8,319.8,316.8,308.4,303.5,302.5,295.1,294.7,293.6,286.6,290.4,291.3,297.4,302.4,301.7,303.7,311.6,306.0,308.5,307.4,302.6,302.6,296.3,288.9,285.5,284.0,278.6,276.0,280.7,282.0,290.7,293.9,300.8,314.7,317.1,322.6,328.7,331.7,330.7,328.4,318.4,312.3,303.1,295.2,286.7,279.3,268.6,267.3,268.9,264.8,274.7,280.3,285.8,294.9,302.2,314.3,319.0,322.3,323.1,326.1,328.9,322.9,316.9,312.9,298.6,296.9,287.9,285.5,281.3,282.2,287.9,289.2,293.9,292.0,298.2,306.0,302.8,305.6,304.9,309.6,302.3,300.4,293.0,290.0,290.1,290.2,285.7,286.4,286.6,291.2,296.7,303.1,312.0,315.6,325.0,321.8,327.1,319.1,318.9,313.3,306.9,296.7,289.3,283.7,272.1,270.7,269.0,271.0,268.9,276.4,280.6,294.6,305.6,310.4,322.3,327.4,326.3,331.7,327.2,325.9,324.3,311.5,307.0,294.4,287.1,287.5,275.7,273.7,279.5,276.0,278.7,282.7,291.7,294.1,301.0,305.6,313.2,310.0,313.5,309.1,312.5,308.8,304.3,300.4,294.5,295.6,292.7,289.7,296.7,301.2,298.5,304.4,313.4,316.5,316.8,313.4,313.0,309.4,310.7,298.3,292.7,288.6,282.3,276.7,274.5,275.6,277.6,275.0,280.4,295.4,304.0] },
    { id:1, biome:'desert', seed:59138, roughness:0.46, points:[299.7,310.2,322.2,330.5,333.0,335.8,338.0,335.8,321.3,317.5,305.6,289.1,278.2,278.4,269.6,273.8,272.4,275.5,284.9,294.1,296.9,308.1,310.0,319.0,320.6,311.8,315.6,303.9,305.9,291.9,289.3,291.2,294.1,287.7,292.0,303.1,306.6,311.2,311.2,318.4,324.3,319.4,317.5,309.7,301.9,290.9,283.4,273.0,267.5,262.7,267.2,274.7,278.0,289.1,302.6,305.6,317.0,334.1,332.8,341.2,342.7,336.8,326.6,321.4,306.9,289.3,281.3,277.8,261.7,263.3,265.7,267.0,278.6,281.8,290.3,300.3,310.6,320.2,322.7,323.4,325.4,323.3,309.4,309.4,301.0,296.2,293.4,291.9,291.2,292.9,291.1,298.1,302.6,309.0,310.2,310.8,310.8,308.8,305.7,297.0,290.0,290.2,277.3,275.5,279.3,273.3,281.5,290.6,301.7,311.1,312.7,324.1,330.6,332.7,333.3,329.1,324.3,314.9,306.7,292.1,283.9,273.5,263.7,259.9,261.3,264.6,269.7,277.7,288.0,298.7,310.9,317.9,325.3,333.0,335.0,327.2,322.0,315.3,303.8,301.2,287.7,287.5,283.3,275.3,284.2,279.5,285.7,294.2,299.8,302.1,305.3,310.3,306.0,310.2,301.5,293.7,289.4,284.2,288.9,280.6,284.1,293.5,292.4,301.9,308.3,315.1,320.7,331.9,326.0,330.2,322.5,315.9,311.0,294.1,288.5,272.4,270.3,260.5,263.3,261.4,264.1,278.4,290.8,301.2,311.4,327.3,327.7,337.3,338.3,336.7,327.0,326.5,309.2,298.4,288.3,285.2,271.2,273.1,269.8,270.7,277.7,281.3,295.8,296.1,302.2,308.0,312.2,311.9,312.5,310.1,311.2,303.9,299.4,289.8,289.2,284.9,296.2,299.0,302.1,305.0,310.5,321.0,319.0,317.3,314.0,311.1,304.8,297.1,293.5,286.4,279.7,270.3,270.5,268.1,268.3,275.4,283.2,303.0,307.0,325.7,333.1,332.4,335.9,339.1,338.7,329.4,315.8,305.2,290.8,277.4,267.7,265.5,261.8,269.3,264.4,280.2] },
    { id:2, biome:'alpine', seed:25951, roughness:0.4, points:[303.2,328.5,361.7,371.4,378.4,396.6,385.6,388.3,357.5,325.9,308.7,298.4,264.4,254.6,231.9,232.7,222.2,233.7,245.0,269.0,285.3,308.1,324.9,325.5,331.4,325.5,322.9,320.1,321.1,292.2,286.5,268.8,278.2,274.4,277.2,287.6,296.8,313.5,321.2,344.5,356.6,357.7,340.7,322.3,325.4,299.3,280.7,263.0,248.9,228.7,219.8,213.0,218.9,237.1,258.0,302.0,320.0,333.1,362.6,381.7,401.2,392.2,387.9,365.8,345.4,313.5,302.3,268.2,250.4,228.6,206.2,207.6,214.0,237.4,245.1,281.7,300.9,320.7,335.9,353.9,353.6,349.6,363.0,343.7,342.0,321.2,302.1,285.2,281.5,265.5,267.7,271.2,291.2,305.0,296.2,305.1,321.0,333.1,326.8,329.1,324.1,303.5,288.2,260.3,257.3,248.5,233.7,231.3,255.0,276.7,287.5,299.2,338.3,347.0,365.7,389.3,393.9,394.2,382.2,343.1,324.8,306.2,269.9,258.6,234.1,219.2,216.2,211.7,227.3,232.4,247.1,282.2,319.4,336.7,350.9,360.7,369.6,369.6,376.7,354.3,339.0,331.5,295.6,284.6,262.3,253.4,250.3,252.5,251.5,274.8,285.8,288.6,321.1,330.4,318.4,320.2,326.2,311.4,301.9,294.6,283.0,262.5,262.8,270.5,277.5,287.5,300.5,314.4,317.5,342.5,364.3,361.6,359.4,367.1,359.3,346.8,317.8,286.1,251.2,244.0,231.3,211.4,209.3,203.5,222.3,249.1,279.5,296.0,336.1,355.5,375.0,379.8,396.8,380.3,375.9,369.2,346.1,322.9,280.0,274.4,246.1,227.0,239.6,243.1,252.2,251.2,264.9,299.7,312.0,331.6,337.2,348.5,342.3,339.4,333.0,309.9,309.5,286.5,291.3,277.0,279.7,269.6,286.5,297.0,304.1,324.3,333.7,337.0,342.1,352.4,327.1,323.6,311.8,267.8,264.2,232.7,220.7,216.8,231.7,238.9,235.5,273.3,281.8,315.2,356.5,376.1,374.6,394.9,392.4,390.9,379.8,350.8,333.6,304.8,260.3,234.2] },
    { id:3, biome:'volcanic', seed:27420, roughness:0.38, points:[302.6,331.2,373.5,380.9,401.0,377.3,359.5,335.5,292.6,258.2,247.0,216.3,224.8,232.5,251.5,283.3,318.6,318.2,335.1,340.4,326.1,323.1,296.1,281.8,275.3,287.7,286.8,308.6,330.5,343.9,356.5,352.8,345.6,310.0,304.8,262.8,250.2,223.2,223.7,229.3,244.9,293.1,326.8,351.7,385.8,392.5,391.1,392.7,348.3,320.2,272.2,242.9,211.6,206.7,209.2,242.7,252.8,301.4,329.3,354.3,371.8,366.6,351.4,341.6,323.9,279.1,284.2,279.2,280.9,279.7,307.2,302.6,335.8,341.8,330.0,322.7,288.5,264.8,265.2,247.5,231.2,240.3,265.0,292.9,323.0,366.1,377.6,380.0,377.6,366.6,337.9,302.6,256.4,219.2,214.4,209.0,214.0,235.4,267.7,304.1,342.3,374.3,383.8,378.1,368.4,346.8,303.1,283.3,255.8,260.1,250.7,262.1,273.8,296.2,307.7,320.3,335.5,331.8,306.2,286.9,274.5,265.2,261.6,263.6,272.9,314.9,340.2,345.2,376.5,369.5,355.6,337.2,312.7,271.3,242.9,209.0,215.8,208.6,230.7,240.2,292.4,326.8,366.4,397.5,385.7,399.3,373.7,345.3,312.1,273.7,239.1,238.0,228.6,246.6,248.0,270.7,302.0,334.4,325.0,330.7,332.9,329.3,289.6,275.6,282.4,267.2,288.5,301.8,326.3,340.7,356.1,339.6,351.7,324.2,300.9,282.7,244.8,220.3,208.9,233.3,230.5,268.1,304.0,339.6,379.7,403.6,386.3,381.4,357.0,321.4,281.1,259.7,232.9,202.5,223.7,237.9,258.7,293.8,315.2,340.2,356.2,355.0,362.3,351.1,315.4,300.3,274.8,280.0,268.3,288.1,303.5,304.5,328.8,331.4,319.1,326.3,308.4,292.2,256.8,249.6,232.2,234.7,257.4,276.6,310.0,346.0,386.4,387.2,392.5,383.2,346.9,318.7,280.3,247.7,207.4,193.0,199.9,222.6,258.2,291.7,338.5,366.1,375.5,388.2,372.7,349.9,312.9,307.4,260.0,258.5,256.9,261.0,279.3,296.1,294.2,315.9] },
    { id:4, biome:'arctic', seed:66680, roughness:0.27, points:[308.9,323.6,342.2,349.6,368.6,373.1,369.6,369.3,364.7,374.6,358.3,337.3,315.5,302.7,290.6,278.9,248.3,249.4,233.3,245.8,232.4,239.0,259.7,262.5,274.1,281.1,307.9,319.0,314.1,328.4,338.7,329.8,333.6,334.3,324.5,314.1,295.7,284.7,293.4,292.6,288.3,280.4,284.5,284.7,300.5,309.3,306.2,325.3,329.2,340.5,342.3,341.1,345.2,333.8,337.2,316.7,310.4,298.2,277.4,270.8,251.9,236.6,238.1,223.3,237.7,245.9,239.2,270.3,285.7,301.1,311.9,333.2,347.0,357.6,365.5,374.1,386.4,374.5,362.8,365.8,349.5,324.1,313.7,294.4,272.0,246.8,243.1,234.9,230.3,215.7,232.8,230.8,236.5,264.1,265.6,292.4,309.2,329.5,342.5,344.3,358.2,343.0,351.2,348.3,338.9,325.9,310.3,298.3,288.7,295.4,285.2,273.2,278.8,278.2,268.7,291.8,283.9,291.7,310.6,319.8,309.5,318.2,327.0,328.7,328.4,317.0,307.7,301.7,290.8,276.1,254.9,259.2,248.9,241.8,244.6,246.4,261.2,276.5,298.5,297.4,321.5,341.5,353.6,360.4,369.3,374.0,364.8,374.5,362.3,342.0,327.7,312.7,296.2,276.4,252.3,236.9,225.7,225.6,212.5,229.4,220.3,239.5,240.2,271.0,279.6,299.9,313.9,337.9,356.1,357.3,364.8,375.4,366.3,367.4,356.0,330.4,317.8,303.9,306.4,279.3,266.4,271.7,253.2,260.7,268.4,267.9,262.1,284.0,292.2,302.7,312.8,316.4,310.2,316.9,326.2,308.5,315.0,315.0,304.5,287.5,277.5,281.8,273.6,267.4,269.8,273.1,268.2,281.6,302.6,298.8,316.4,326.8,336.8,345.8,351.9,350.8,350.6,350.8,336.9,327.7,319.4,304.6,295.5,268.1,244.0,245.2,220.0,217.4,214.7,229.0,223.6,237.8,264.2,276.4,300.0,303.8,333.5,340.6,372.2,364.0,377.5,387.6,377.6,363.2,364.6,351.7,330.9,301.9,281.5,275.7,252.9,246.7,252.0,245.1,237.0,249.2] },
    { id:5, biome:'forest', seed:39852, roughness:0.36, points:[301.0,345.0,356.2,377.3,393.2,406.5,428.5,421.1,420.6,393.5,385.0,361.5,309.2,300.7,256.6,242.7,217.6,220.6,198.1,196.5,222.1,231.0,251.2,270.9,284.1,306.8,307.7,327.8,341.7,343.8,347.8,345.9,340.4,315.8,307.2,313.8,304.2,272.9,261.7,260.8,280.1,270.0,293.9,289.6,290.8,325.2,319.4,350.1,369.7,368.3,372.4,357.2,337.7,329.7,332.2,309.8,281.2,247.6,235.6,228.6,193.4,210.5,183.7,209.1,199.3,243.3,249.5,283.4,296.2,344.1,381.2,382.9,417.7,408.2,409.4,426.1,403.6,400.4,357.6,333.0,309.4,285.9,248.7,219.8,198.7,191.9,174.4,188.4,178.5,206.1,217.5,230.6,254.1,296.3,324.2,328.9,358.5,355.9,374.7,386.9,363.3,362.9,363.8,328.7,328.1,289.8,281.0,284.3,278.5,256.1,259.6,261.1,264.3,278.8,306.6,310.6,330.5,331.4,341.0,339.7,327.3,330.0,315.4,298.5,285.6,287.7,272.8,258.3,233.7,218.0,218.6,219.8,249.5,260.7,277.3,291.3,314.6,347.1,375.4,390.4,413.5,413.0,424.0,413.3,401.0,392.4,358.3,343.9,296.5,289.0,252.9,210.7,205.2,178.3,164.7,165.6,182.3,212.5,210.6,244.9,269.3,289.7,334.1,347.4,360.7,401.6,408.6,389.5,398.5,384.7,380.3,350.8,341.5,299.0,304.3,277.0,253.4,255.1,246.2,231.7,228.4,253.3,258.0,285.2,277.4,312.5,325.1,314.8,322.3,335.4,323.0,323.2,315.4,299.5,278.4,270.7,275.8,266.6,239.8,257.2,266.7,266.7,290.1,294.6,309.1,326.4,351.0,370.3,394.2,376.9,385.8,400.8,385.5,359.0,347.0,307.7,284.1,253.6,252.6,207.3,195.8,181.3,186.3,167.9,174.2,194.4,227.9,247.1,267.5,304.2,333.0,374.3,396.6,392.0,427.6,408.0,412.8,402.3,372.7,352.9,347.2,318.5,295.0,275.9,252.3,217.7,218.2,213.8,202.1,226.1,243.1,249.4,273.8,277.6,313.9,314.7] },
    { id:6, biome:'coastal', seed:9939, roughness:0.93, points:[289.1,330.1,339.0,351.6,384.2,372.4,399.4,400.0,397.9,404.5,393.1,385.6,383.1,351.2,339.4,322.4,323.8,303.4,292.1,268.4,241.6,230.1,234.3,214.0,224.3,235.0,231.8,243.3,242.1,242.8,262.8,271.8,296.3,294.6,317.8,308.5,341.7,325.4,328.9,343.9,349.5,338.3,325.3,323.1,317.6,314.8,302.0,294.0,279.2,271.8,279.3,261.1,266.1,263.1,269.7,274.3,299.1,289.2,311.7,306.8,325.1,346.4,344.2,336.4,359.3,359.9,360.0,353.3,354.3,336.3,330.2,323.1,298.5,274.3,263.1,261.8,251.5,236.4,232.4,226.1,211.4,219.6,205.5,229.6,223.2,230.2,251.1,261.0,301.9,320.9,337.6,348.7,370.1,364.0,382.1,409.2,416.7,414.5,392.9,411.9,394.0,382.7,374.6,354.2,337.2,320.6,284.6,257.6,248.2,229.0,221.0,225.5,214.7,200.2,191.2,208.8,207.7,232.8,228.6,244.3,268.5,282.5,299.6,316.3,327.6,350.1,348.5,370.4,356.0,377.6,371.8,374.3,366.9,350.7,331.2,320.9,307.4,295.7,296.5,276.6,293.2,261.9,277.4,267.0,267.1,258.4,274.5,291.4,292.0,307.2,309.2,309.8,317.0,324.6,336.5,335.0,340.2,325.9,321.7,331.2,306.7,296.2,299.7,292.4,276.8,276.2,252.9,251.2,232.5,236.1,231.5,230.4,248.5,255.6,255.2,253.6,269.9,302.4,320.6,331.6,333.9,354.8,371.4,394.7,378.5,400.9,383.9,405.8,379.8,386.0,359.1,343.9,334.4,309.1,298.9,282.9,259.3,234.0,239.5,226.7,211.5,199.0,202.3,195.3,212.2,214.7,214.9,244.0,254.2,254.2,274.4,310.3,309.4,326.9,359.5,371.2,387.7,389.6,378.8,400.5,375.6,392.0,378.9,350.5,335.5,338.2,308.2,299.6,280.3,279.8,255.8,260.4,262.5,249.2,257.2,255.7,246.2,243.5,254.6,277.6,285.1,279.6,302.9,304.8,312.1,324.0,327.4,334.4,316.3,334.4,327.2,314.9,308.1,287.1,301.9,291.4] },
    { id:7, biome:'wetland', seed:75881, roughness:1.0, points:[304.3,319.2,331.5,330.1,336.0,324.7,319.2,299.3,283.8,278.7,275.1,275.0,280.2,286.6,302.8,304.6,314.5,310.3,309.8,304.7,295.0,294.7,288.4,296.2,297.5,307.6,312.6,316.0,314.3,314.6,300.6,293.1,281.1,271.4,267.3,272.0,284.2,296.6,307.4,324.0,334.2,338.5,333.9,318.6,304.9,295.0,276.4,270.0,262.6,271.3,278.0,288.4,301.0,313.5,321.9,324.6,313.6,310.2,299.8,294.8,291.3,285.4,290.3,302.0,306.5,306.7,311.5,307.2,299.0,292.8,285.4,280.5,280.8,278.9,294.1,300.6,316.2,325.0,332.0,334.3,328.3,310.0,294.2,281.8,269.2,263.8,268.8,270.2,282.0,299.0,312.5,324.1,330.4,325.5,324.6,312.9,302.2,289.2,280.3,283.8,288.0,294.5,300.5,301.7,307.0,310.6,300.9,297.0,291.2,289.9,281.3,286.4,296.6,300.5,313.4,325.3,326.5,327.0,314.6,306.6,287.3,278.3,270.5,260.6,266.4,277.0,296.7,305.2,322.4,337.1,331.6,335.3,317.2,307.9,292.9,283.3,272.6,273.1,281.2,283.2,300.1,302.2,309.3,311.9,312.6,305.1,299.8,290.1,289.1,286.9,292.3,304.1,310.7,315.8,314.1,318.4,305.3,300.2,285.8,279.9,266.7,268.9,272.2,291.9,303.7,316.1,326.4,339.4,333.9,324.2,314.4,297.8,286.9,268.6,269.4,271.7,271.4,288.6,302.2,314.2,323.3,322.4,321.7,314.5,304.6,293.4,291.3,289.0,289.4,298.0,305.9,308.1,309.9,310.2,307.4,295.6,291.5,282.7,279.3,279.6,281.4,297.7,312.7,323.2,333.5,330.1,329.2,321.7,309.4,285.7,272.9,263.9,261.4,269.5,277.9,296.9,309.8,322.7,332.4,333.6,321.4,315.8,306.3,295.8,289.2,279.0,282.8,291.6,292.4,298.4,307.0,306.4,302.9,300.8,296.3,290.3,289.0,284.7,289.9,304.4,306.9,321.0,322.6,328.7,317.4,313.4,294.6,286.4,272.3,267.6,263.2,275.1,288.0,301.4,318.2,329.7] },
    { id:8, biome:'urban', seed:50219, roughness:0.55, points:[292.0,333.4,365.8,367.0,369.9,363.2,342.8,325.7,291.4,279.2,260.1,249.8,243.6,251.9,273.2,288.0,310.1,314.6,331.7,331.5,317.3,304.6,296.4,294.4,290.0,284.8,284.3,296.8,323.5,324.2,340.0,344.4,329.0,327.1,293.0,284.7,258.0,239.5,235.0,246.9,262.6,271.3,306.2,329.1,361.0,380.8,376.6,369.7,340.4,312.7,284.2,254.4,242.6,233.5,225.6,248.8,260.1,295.0,317.4,333.8,351.7,355.3,338.0,338.5,310.5,288.1,293.4,286.2,279.7,274.1,284.7,312.8,321.9,330.8,332.2,317.5,307.2,281.3,265.5,257.5,246.5,257.9,276.2,288.8,323.0,345.4,355.5,362.8,367.7,361.3,338.8,301.5,280.9,245.8,227.1,213.0,228.7,235.2,258.9,302.2,320.0,353.5,353.5,366.5,362.4,347.6,321.2,292.5,279.8,272.9,255.7,261.0,276.1,284.0,304.7,311.9,313.2,318.9,303.5,292.2,285.8,272.6,275.2,260.9,275.2,295.6,314.3,335.1,350.4,367.0,351.4,345.8,316.8,304.2,271.8,255.3,221.2,223.5,224.3,245.1,281.8,298.9,327.3,357.3,369.5,382.2,371.7,343.1,328.4,288.3,259.7,243.7,243.4,249.2,259.3,265.7,290.4,317.5,327.4,336.5,322.7,327.5,302.6,286.6,284.9,282.8,283.9,288.9,295.8,318.4,329.9,328.8,334.9,329.5,320.7,304.3,281.4,252.7,234.6,240.7,246.7,267.7,279.4,323.9,344.4,368.0,372.5,386.6,359.0,347.4,322.9,289.5,250.2,245.8,234.3,240.4,250.5,275.3,286.3,310.8,330.8,346.9,342.8,350.2,335.0,308.1,289.9,274.9,270.1,272.5,280.8,300.3,300.1,320.4,330.4,317.2,316.0,294.1,289.4,265.4,251.3,258.8,256.4,268.8,286.9,310.9,339.6,352.9,379.5,378.3,363.7,333.2,301.1,268.9,238.9,223.3,216.7,226.1,236.9,269.2,298.3,319.9,351.5,371.7,371.2,358.7,335.8,323.1,290.8,283.6,259.5,253.6,269.4,268.8,284.7,307.5] },
    { id:9, biome:'fantasy', seed:82091, roughness:0.86, points:[292.4,343.3,394.7,426.5,414.8,404.0,347.9,304.8,256.8,241.7,221.8,218.4,239.3,264.6,304.0,311.8,348.7,359.6,330.8,339.3,297.0,296.1,265.0,262.6,285.0,299.0,312.0,333.6,365.7,352.4,328.4,295.7,288.0,242.9,221.3,215.0,216.1,245.0,271.8,330.1,360.8,400.4,433.1,410.8,385.2,324.3,276.0,246.5,198.4,204.6,185.6,216.9,271.7,287.5,341.7,372.5,364.1,355.0,353.1,330.5,289.7,283.6,275.5,268.4,281.2,295.2,314.9,325.7,326.6,324.4,312.3,283.8,253.0,230.7,222.3,235.7,252.5,299.5,343.8,368.2,397.8,402.1,402.9,372.9,319.6,260.6,232.7,184.5,190.1,209.5,223.7,278.5,310.9,372.0,380.7,390.2,390.4,356.1,328.5,296.1,263.7,231.1,233.7,263.1,272.9,309.6,322.6,340.4,339.4,320.7,291.7,266.1,251.0,257.9,260.0,282.0,297.9,348.3,371.4,381.4,382.3,370.3,329.2,299.5,245.1,217.3,184.5,176.9,222.1,262.5,309.4,348.5,374.7,403.1,420.5,387.2,345.9,309.2,278.2,231.4,223.7,201.5,224.3,254.6,299.0,310.5,350.4,335.2,330.2,325.2,309.9,298.1,259.9,284.4,282.5,291.7,311.7,359.0,348.6,358.7,355.1,312.7,278.4,249.7,215.3,199.0,207.2,246.2,273.3,317.7,376.6,404.3,424.3,418.1,369.1,352.1,298.6,228.6,198.5,187.4,206.1,227.3,258.8,288.1,351.0,375.7,384.5,371.8,353.8,329.3,284.9,269.4,264.8,272.7,274.4,304.3,322.2,325.5,334.4,318.6,310.3,280.4,250.8,226.9,213.6,235.0,250.6,305.9,347.8,386.8,410.3,394.0,380.5,353.0,319.2,249.8,204.9,178.3,170.2,205.1,242.4,274.4,332.6,373.9,383.9,394.6,384.9,366.9,331.2,303.1,252.9,235.1,237.1,260.2,266.3,309.3,314.2,321.1,329.9,313.7,304.2,266.2,246.5,260.9,245.3,292.9,304.5,327.0,361.2,398.4,390.1,351.3,335.0,280.9,248.3,201.2] },
    { id:10, biome:'grassland', seed:64812, roughness:0.22, points:[291.2,319.6,378.0,402.4,402.6,416.1,407.5,411.9,391.6,368.6,344.8,313.0,266.4,242.2,213.2,214.0,203.4,217.1,216.2,235.4,265.8,272.9,297.7,326.9,344.6,335.8,347.0,344.2,333.4,309.6,314.1,299.6,272.6,272.8,278.0,276.9,260.9,282.5,294.8,332.2,343.3,358.8,345.0,371.7,349.3,340.3,332.3,314.9,278.5,271.5,242.8,229.7,189.5,193.7,193.1,206.0,216.9,269.6,276.8,308.5,340.4,394.1,419.3,416.2,416.4,413.3,402.3,383.8,342.2,322.8,287.5,260.7,233.1,206.3,200.8,193.6,188.6,193.2,222.1,272.5,292.8,326.2,327.2,370.0,366.7,372.2,374.1,377.2,358.3,348.8,297.9,292.8,282.7,266.0,258.4,274.6,268.0,267.0,287.9,302.7,312.9,318.0,348.0,344.8,348.8,329.5,308.4,303.3,273.9,263.7,248.1,224.7,212.1,219.9,248.3,252.1,275.6,298.1,344.8,348.4,399.6,394.7,405.5,407.2,402.0,387.8,366.4,325.7,296.8,242.0,228.7,202.0,168.5,189.0,179.7,188.5,201.2,239.2,282.2,311.3,324.5,360.0,400.9,388.7,409.6,412.7,393.9,372.9,330.0,311.7,284.7,262.6,257.5,235.1,220.9,224.3,244.2,258.0,278.1,287.5,318.6,335.3,342.4,346.5,325.6,319.7,321.1,284.0,292.1,275.8,249.5,234.7,252.2,249.0,262.0,286.5,308.9,342.5,362.7,384.5,396.3,389.8,385.3,375.0,360.3,333.3,306.0,285.1,236.4,215.7,183.1,182.6,180.2,190.5,200.2,215.5,253.7,286.3,319.1,375.5,396.2,424.0,434.9,414.6,406.5,394.7,366.7,337.2,294.7,290.2,260.6,230.1,209.3,210.2,210.8,215.9,243.4,249.3,275.5,312.5,328.8,327.7,341.5,350.6,336.1,346.0,329.7,306.8,290.6,272.8,263.2,270.2,269.9,285.5,295.3,307.9,319.9,325.7,346.8,371.6,372.7,369.5,364.8,347.6,308.1,303.9,279.8,242.6,220.8,213.4,204.8,208.8,205.4,237.0,249.5,280.9] },
    { id:11, biome:'desert', seed:32610, roughness:0.23, points:[308.2,311.2,329.0,337.6,352.4,358.0,364.7,365.3,371.7,367.9,369.8,357.8,349.5,345.6,324.3,325.6,304.2,302.0,286.4,276.4,259.3,257.4,249.1,245.8,251.4,241.2,248.0,250.1,253.7,270.4,282.7,285.2,288.7,302.6,317.2,324.9,319.2,318.4,326.8,331.8,325.6,317.5,324.4,318.1,314.8,312.9,305.3,286.3,281.2,294.9,282.1,282.3,286.7,282.2,278.4,283.3,296.5,291.6,303.4,311.9,327.7,323.9,325.7,342.1,327.5,334.7,332.5,330.9,330.4,318.8,318.7,300.0,292.9,277.0,269.6,266.9,260.3,243.3,242.1,238.1,232.7,234.8,238.8,242.0,248.9,265.9,283.4,285.1,297.9,315.7,328.3,336.7,345.6,355.0,369.1,365.3,362.6,368.8,369.2,363.3,347.5,352.4,335.0,315.4,313.5,294.5,284.1,267.8,259.2,249.6,242.9,243.4,232.4,233.9,240.7,249.7,255.8,252.4,264.1,284.6,283.1,306.4,300.7,318.2,334.5,343.1,340.3,338.5,352.9,349.1,337.6,343.9,336.4,323.0,324.2,303.4,306.2,305.7,293.8,288.8,285.3,279.7,273.8,273.8,288.5,286.0,279.5,283.6,300.9,298.3,315.7,315.2,324.6,325.9,327.2,326.6,317.7,318.8,321.2,310.4,308.0,304.1,284.6,285.2,269.8,274.3,257.2,261.1,264.6,249.5,262.2,267.0,269.4,264.2,280.8,289.2,302.6,318.0,317.6,330.1,351.3,353.1,360.7,369.8,373.3,363.6,360.6,352.5,350.3,344.4,323.2,310.9,310.8,295.3,281.8,264.0,256.0,245.9,241.4,233.5,227.8,232.2,236.7,237.1,249.3,244.3,262.8,276.8,288.3,293.7,315.5,316.7,329.6,337.4,348.7,354.9,364.3,359.9,356.2,362.0,357.8,338.2,327.6,326.9,320.8,299.1,294.7,293.1,280.5,280.1,274.2,266.3,260.8,270.9,263.0,262.4,271.3,274.7,292.4,293.0,299.2,309.3,313.8,315.8,313.9,309.6,326.2,322.2,310.8,315.0,306.7,305.6,302.1,285.5,282.3,281.1] },
    { id:12, biome:'alpine', seed:41433, roughness:0.87, points:[302.0,325.9,332.5,348.3,342.4,346.8,330.6,314.0,287.7,276.4,268.5,260.5,269.7,276.1,283.9,304.9,313.0,314.8,317.6,318.2,310.8,299.7,294.9,282.6,284.3,286.8,301.9,311.9,320.6,325.4,322.7,320.0,308.9,291.6,285.1,263.8,257.6,262.0,269.7,273.1,299.1,311.8,337.5,339.7,355.6,343.1,331.4,321.3,295.3,274.2,261.3,261.1,256.3,262.9,277.0,287.7,309.5,324.3,323.1,326.7,331.3,316.9,303.0,296.8,286.6,279.3,292.2,290.3,299.8,306.4,317.5,313.4,309.8,303.5,299.4,287.5,268.1,274.6,272.2,274.5,289.9,310.4,329.9,341.0,342.6,343.9,339.1,321.9,302.1,276.4,260.7,249.2,247.1,258.2,268.9,285.6,305.8,318.4,331.2,342.6,345.3,327.2,318.5,299.6,284.2,285.7,278.6,280.2,284.3,286.0,299.1,314.5,312.2,314.4,312.6,301.7,286.6,288.8,283.4,279.1,283.6,298.1,312.2,322.1,332.2,335.9,328.8,326.4,307.5,293.3,272.2,254.1,246.8,251.8,265.3,285.7,304.9,325.9,339.9,346.4,345.9,336.7,321.7,314.0,294.0,274.3,262.3,257.6,266.4,272.6,292.5,295.6,311.4,317.6,321.5,312.1,309.8,297.0,291.2,284.5,291.8,292.3,294.0,309.4,322.7,319.1,328.9,321.6,312.2,298.2,274.7,266.7,264.2,261.6,268.8,280.4,295.2,320.1,328.6,349.5,353.6,345.3,334.9,319.0,290.4,273.3,266.9,252.9,254.7,266.9,279.3,287.8,308.1,318.8,328.8,329.2,324.0,319.9,305.1,296.6,284.0,282.4,286.3,293.9,299.7,311.9,312.1,311.8,309.1,303.3,297.4,285.0,269.8,275.0,276.0,281.1,293.0,313.7,327.3,339.3,339.1,344.2,339.4,318.9,306.2,279.4,263.2,257.2,249.8,252.5,270.6,281.7,301.2,324.9,336.2,336.5,338.1,324.6,321.8,306.9,283.9,277.6,271.9,278.4,282.9,292.5,305.8,309.7,313.4,314.5,303.2,301.7,295.5,284.8,285.6,280.3] },
    { id:13, biome:'volcanic', seed:54012, roughness:0.47, points:[285.9,345.1,396.3,414.3,419.3,405.6,349.2,321.4,284.7,243.7,203.5,219.6,230.7,241.4,298.2,321.6,351.0,338.1,348.9,339.5,323.9,283.8,285.4,283.1,263.2,305.7,303.5,349.2,353.0,348.8,365.7,334.2,302.1,251.7,212.9,210.5,193.5,230.2,246.8,310.9,342.9,405.0,411.5,409.2,413.7,370.7,317.2,285.6,219.5,203.4,191.2,189.9,241.4,279.7,300.7,336.6,383.0,366.5,363.4,354.0,304.1,285.0,269.4,260.5,278.7,291.8,311.8,306.1,341.4,336.3,332.9,316.5,267.4,236.7,240.6,227.2,233.8,250.8,282.2,328.3,378.0,409.5,425.6,415.8,377.9,308.2,280.9,222.1,202.9,185.8,176.4,225.1,258.3,320.7,343.2,395.2,415.5,402.2,362.7,339.4,291.5,274.5,234.1,234.5,229.5,251.0,280.8,310.6,331.6,328.9,337.8,314.4,296.0,280.1,238.9,260.0,252.5,275.7,312.9,369.2,388.4,386.1,389.7,358.4,332.2,271.3,215.1,190.3,185.6,187.6,204.7,254.6,298.6,344.6,397.0,414.5,402.6,406.6,367.4,320.3,275.8,234.5,209.9,210.1,234.0,261.3,299.4,333.3,331.8,360.6,341.9,338.4,306.5,274.0,267.2,283.2,277.9,294.2,333.8,346.2,366.1,346.7,360.8,323.6,295.1,256.7,203.1,190.0,187.9,211.9,267.4,293.6,363.2,398.5,427.2,417.8,400.2,349.6,305.1,276.8,229.6,193.8,174.6,207.3,227.0,271.7,318.3,356.9,375.3,383.3,366.5,346.9,327.4,287.4,259.6,255.7,268.1,286.2,318.3,327.3,328.8,332.5,311.2,303.1,275.3,249.7,212.0,217.8,226.8,253.9,290.4,347.3,372.6,415.1,415.7,408.5,375.9,303.5,273.7,217.9,202.1,180.2,181.7,225.5,275.1,307.0,348.6,393.8,392.4,408.3,359.4,331.2,303.5,273.8,240.1,246.5,246.0,276.3,282.9,299.0,332.6,318.9,312.6,291.8,286.0,258.2,261.0,242.5,255.7,306.7,336.9,357.0,384.1,405.4,387.0,356.8] },
    { id:14, biome:'arctic', seed:88739, roughness:0.31, points:[300.4,332.1,370.4,368.5,397.3,415.6,407.3,393.4,370.3,363.9,335.5,294.1,263.5,254.4,236.6,230.5,220.9,207.5,235.2,239.3,268.1,286.7,310.2,312.9,330.7,338.8,343.0,337.2,322.3,315.6,308.5,290.1,287.6,272.7,276.0,263.8,278.9,288.1,310.8,320.2,338.3,341.7,352.2,342.8,355.1,347.1,324.0,316.4,297.0,273.9,266.1,220.8,218.3,203.4,202.8,212.3,239.5,259.8,266.2,298.9,337.0,367.1,387.8,394.9,415.2,409.5,400.1,395.6,353.8,341.7,306.4,276.1,239.4,216.0,211.3,200.5,187.8,198.7,230.6,233.2,270.8,285.9,326.2,336.1,360.7,362.9,378.4,352.6,369.2,347.8,311.8,296.6,291.7,290.2,265.9,252.1,275.5,263.4,274.9,301.8,309.3,329.2,336.7,319.9,337.3,337.2,321.7,314.2,295.7,273.6,266.8,248.2,227.0,232.5,244.7,247.8,270.6,269.8,297.9,326.9,358.2,368.3,380.7,406.8,400.2,384.3,390.2,340.9,331.7,307.3,272.3,236.5,206.9,202.1,180.1,202.8,200.6,213.9,239.3,281.4,287.3,333.2,342.8,366.4,379.8,397.7,394.5,375.4,366.6,354.8,310.9,298.6,275.7,270.0,260.6,253.4,241.3,260.9,267.3,274.5,299.7,290.8,310.5,330.7,332.7,340.5,332.9,317.4,299.3,285.9,287.7,258.1,251.0,242.5,248.0,277.9,277.0,296.4,332.1,332.2,367.9,367.2,389.7,394.3,377.2,374.7,339.3,313.9,300.5,271.9,251.2,216.0,212.7,180.2,205.9,194.2,224.5,255.0,282.1,304.9,340.9,359.5,388.5,391.0,397.5,414.5,397.8,388.6,344.5,320.8,308.4,275.7,241.8,239.3,223.5,211.0,214.1,234.4,259.3,259.9,276.2,307.4,325.7,338.3,339.4,352.8,335.1,343.0,334.3,322.6,297.3,277.1,281.0,258.7,279.0,271.5,297.4,286.9,326.5,327.1,336.8,353.7,369.8,365.1,345.9,334.6,306.1,297.8,263.9,238.7,230.0,204.1,204.4,208.7,224.0,224.8] },
    { id:15, biome:'forest', seed:26624, roughness:0.5, points:[298.4,323.8,355.5,377.6,401.2,409.7,406.8,372.7,362.4,329.6,299.7,268.3,265.9,227.4,213.7,235.4,223.8,253.4,262.2,279.0,313.8,308.1,330.9,352.3,341.1,333.4,332.7,304.0,311.8,288.7,267.7,279.7,263.7,283.9,296.4,305.2,325.1,323.0,356.0,360.4,339.1,352.5,322.1,312.9,288.9,266.5,249.6,220.5,223.7,205.6,206.2,227.6,268.8,277.2,305.0,348.1,382.7,402.8,414.2,395.4,408.3,385.2,341.6,315.7,301.2,253.9,224.5,216.1,216.0,215.8,205.0,242.1,246.7,289.6,294.0,329.5,359.2,367.9,361.9,351.2,344.2,344.0,314.5,309.8,290.9,280.5,268.1,276.4,271.0,274.5,292.7,295.4,331.0,327.8,326.5,331.9,333.4,301.7,288.4,270.5,266.9,248.6,243.1,228.9,242.5,242.9,277.8,307.9,319.9,343.6,370.6,377.3,399.4,396.8,382.3,358.4,351.1,299.5,285.8,242.4,213.0,203.0,195.0,187.8,201.5,227.2,267.7,283.2,310.0,348.9,372.4,391.9,385.8,378.6,370.2,345.8,344.8,311.4,292.9,277.4,244.9,240.7,241.6,263.1,268.1,289.5,289.8,315.9,330.2,333.3,320.4,319.5,308.3,294.5,287.9,263.1,252.2,266.7,269.4,277.7,287.1,307.7,309.6,347.1,365.7,371.8,367.5,369.5,373.3,342.3,333.5,304.3,276.0,243.9,220.3,199.1,186.8,203.1,205.5,235.1,271.7,306.0,333.2,348.9,372.5,397.6,391.9,401.0,373.2,358.6,330.8,310.3,272.2,244.3,223.2,220.0,217.2,220.1,254.1,265.1,270.2,298.5,330.9,322.6,349.2,350.7,332.2,319.5,323.1,307.9,280.3,285.0,274.9,263.1,282.0,289.7,299.9,331.8,326.2,348.9,343.4,346.3,351.8,324.7,319.7,290.9,256.8,252.9,235.9,220.6,223.5,207.9,244.4,247.2,273.3,320.0,332.6,377.0,381.5,411.6,393.8,390.8,388.2,353.5,314.1,295.9,264.8,244.7,227.2,197.6,193.4,211.7,221.7,241.2,268.5,304.2] },
    { id:16, biome:'coastal', seed:37582, roughness:0.86, points:[297.6,306.3,336.6,336.8,346.7,374.8,379.0,371.4,386.4,384.9,367.4,372.4,349.8,353.5,332.2,316.4,316.5,292.5,283.8,267.4,267.0,257.8,253.3,242.8,247.1,240.7,255.1,252.3,250.3,267.0,280.0,280.4,300.6,308.2,317.5,321.5,325.0,331.1,330.9,333.0,329.5,322.1,319.8,318.5,305.6,306.3,289.1,286.5,282.3,273.8,270.8,278.8,281.7,284.6,293.7,288.0,297.9,295.3,305.3,308.4,332.2,335.7,339.7,347.3,345.8,350.0,344.8,327.3,326.0,318.5,312.3,306.6,293.4,277.3,271.6,266.6,240.0,233.7,232.1,226.3,238.6,241.3,233.2,237.6,254.9,261.2,282.6,303.6,308.3,325.0,340.1,342.2,370.8,362.6,372.9,382.0,381.0,368.9,369.4,369.3,352.3,334.4,334.6,306.8,294.0,278.4,280.9,259.4,245.9,242.1,232.9,235.6,219.9,223.1,232.0,233.4,250.4,254.9,259.9,281.4,286.5,311.4,322.4,332.7,330.5,342.8,341.4,354.4,340.2,354.6,354.1,345.3,335.8,326.2,314.7,308.5,299.2,288.9,286.3,272.9,268.4,271.2,284.7,279.3,288.6,288.8,295.3,295.8,304.3,298.6,305.5,308.6,320.8,314.9,318.0,315.7,329.9,312.5,305.3,310.1,298.0,283.9,274.2,279.0,257.0,248.2,251.2,254.2,253.3,242.7,253.4,261.9,273.1,282.2,288.1,306.4,313.7,318.5,331.1,341.6,362.4,356.3,365.7,383.9,380.8,370.9,356.8,354.5,340.7,329.2,320.5,313.2,282.8,278.2,253.9,241.4,238.0,235.1,218.3,222.1,227.6,223.4,224.6,231.3,250.7,261.3,274.5,288.9,303.0,314.4,337.5,332.0,341.2,358.2,372.5,365.8,375.9,364.0,361.4,359.2,354.6,336.1,323.8,323.1,300.9,294.6,283.7,276.1,258.5,265.7,262.3,267.0,267.5,266.2,269.0,278.3,274.1,277.4,298.3,299.3,305.9,306.1,311.1,321.1,319.0,329.4,319.1,310.5,306.3,294.1,303.6,280.9,289.7,270.0,266.7,265.4] },
    { id:17, biome:'wetland', seed:89801, roughness:0.61, points:[311.8,336.0,352.0,390.1,399.6,402.6,423.3,384.9,378.2,354.9,317.8,298.8,263.0,247.2,210.7,222.8,218.1,212.5,253.6,261.9,291.7,306.7,339.3,343.7,332.7,337.7,327.0,321.6,325.9,289.0,276.6,266.5,258.2,265.2,279.0,286.1,307.0,313.6,346.7,350.6,349.8,354.2,357.5,346.8,334.2,315.8,279.6,261.1,225.9,229.1,197.0,193.4,195.6,233.9,234.4,267.4,311.9,340.4,377.4,386.6,420.3,419.3,398.6,383.9,375.3,355.1,301.7,274.1,249.0,213.1,212.7,185.0,194.1,213.8,226.0,242.1,275.0,316.1,338.8,347.5,374.2,371.8,364.0,370.1,336.0,341.5,314.0,304.1,282.1,269.3,256.7,275.7,271.0,278.1,304.6,309.8,329.3,340.2,345.5,346.7,324.0,316.9,294.1,279.4,258.1,241.0,225.2,227.7,219.9,239.5,273.6,300.4,315.0,338.2,361.7,385.0,405.8,399.0,398.8,373.6,359.2,325.6,301.8,261.0,232.1,201.6,198.3,187.4,172.2,201.0,227.2,260.3,295.0,322.5,362.8,387.8,398.5,411.1,402.9,381.1,370.6,352.5,307.7,285.1,285.9,269.5,235.1,238.6,232.4,256.8,262.8,272.8,311.1,299.9,336.1,344.4,327.8,332.4,318.0,288.0,289.2,283.4,249.8,248.5,251.2,252.6,288.7,287.1,309.4,323.0,369.9,375.9,394.6,394.9,386.8,357.8,337.1,302.2,281.3,255.8,221.5,207.4,186.1,195.4,205.3,199.1,227.0,256.2,302.6,335.1,377.5,374.8,414.4,423.3,399.5,386.2,377.1,354.6,316.4,299.7,248.7,234.4,217.4,217.6,222.7,224.6,233.4,260.7,287.5,313.8,308.4,337.1,345.4,336.7,333.9,329.0,332.0,300.0,295.6,287.5,260.2,276.4,269.0,295.4,304.0,328.7,319.0,332.8,366.9,369.6,347.6,359.8,331.9,295.3,278.9,252.5,247.7,217.3,194.8,213.3,200.4,228.5,259.5,263.2,297.7,336.6,367.4,408.4,422.9,433.1,413.0,405.7,380.5,340.2,319.4,284.4] },
    { id:18, biome:'urban', seed:26120, roughness:0.9, points:[300.0,318.2,331.1,350.6,346.4,357.0,351.5,350.8,349.1,338.7,314.8,304.2,283.5,267.9,257.6,259.9,256.8,262.0,265.9,265.4,273.4,294.4,297.3,315.1,318.6,327.1,318.9,320.2,324.3,306.7,305.6,297.3,298.7,282.6,287.1,279.8,286.9,290.5,294.8,311.1,314.5,325.8,333.3,324.5,336.2,332.9,318.3,302.3,294.2,279.5,268.5,259.5,255.8,244.4,256.7,253.5,258.3,266.4,289.2,308.3,325.1,336.3,347.4,348.2,358.1,366.6,349.1,349.3,333.4,318.4,298.8,281.3,272.4,259.9,248.9,237.6,245.2,247.8,254.3,272.7,284.2,307.1,309.5,329.1,326.5,337.1,335.3,327.9,323.4,322.8,318.3,296.4,290.3,292.8,285.6,284.4,283.0,282.0,291.1,290.9,310.0,303.4,308.7,318.7,311.8,312.7,313.7,301.1,296.0,280.4,282.3,261.9,265.6,258.1,263.4,267.7,272.4,298.7,308.0,323.4,324.4,345.8,353.2,350.0,347.8,352.0,338.5,324.8,318.0,300.5,274.2,267.6,244.6,240.5,232.6,243.8,242.5,257.2,267.5,281.7,305.7,313.3,332.7,342.6,354.1,345.5,342.6,346.3,331.6,326.8,307.2,291.9,293.3,282.2,279.6,277.1,265.6,267.4,275.9,283.8,299.7,305.9,305.2,316.4,313.5,321.3,316.4,300.0,299.9,286.9,290.8,287.0,280.4,280.4,274.1,282.5,300.0,300.3,317.8,323.5,338.4,346.8,349.0,350.1,337.8,326.6,325.0,313.1,291.3,275.7,266.1,259.6,239.4,246.4,247.5,252.2,263.9,274.3,294.0,307.2,327.9,343.4,341.4,357.3,365.6,354.5,342.9,338.3,328.1,308.4,303.1,275.5,267.9,266.8,253.1,251.0,255.6,260.0,276.8,289.1,290.3,310.0,318.7,318.1,321.6,329.4,317.9,319.3,316.9,304.1,292.3,290.9,287.3,284.3,281.2,281.9,300.0,294.7,313.0,314.8,321.6,322.1,331.5,324.2,318.5,316.4,303.7,290.9,277.4,268.5,263.5,260.0,250.0,248.3,251.6,269.3] },
    { id:19, biome:'fantasy', seed:43666, roughness:0.9, points:[297.9,326.6,350.4,383.6,390.5,422.6,427.8,432.5,404.6,396.1,367.3,355.2,329.8,282.3,247.5,224.9,213.3,225.4,197.2,203.2,203.9,228.7,261.1,262.5,283.6,294.1,335.3,324.8,350.2,347.2,363.0,332.8,323.2,325.1,321.5,287.2,290.0,287.5,275.2,278.0,282.4,286.9,278.9,294.4,329.6,336.8,335.3,369.9,356.8,368.9,363.1,361.6,325.6,308.0,299.8,271.5,250.9,238.3,201.0,192.7,204.5,183.3,213.1,229.1,254.1,262.5,313.4,324.3,365.2,373.3,411.7,418.5,413.8,413.6,405.3,407.0,366.1,351.4,328.2,272.6,272.0,215.8,200.7,180.8,197.7,182.7,185.5,192.1,238.8,250.5,271.9,307.3,335.2,344.9,351.0,373.9,370.7,372.0,366.9,353.8,360.5,318.3,302.7,301.9,269.2,267.7,279.1,258.3,261.4,254.8,295.2,284.9,301.5,306.9,342.6,337.1,349.2,329.3,346.6,316.3,301.6,298.6,284.9,259.7,244.1,228.6,216.7,235.4,236.5,237.2,265.9,277.9,296.5,335.1,350.8,369.5,378.6,411.3,423.9,412.5,401.0,396.2,366.7,334.0,311.6,290.4,250.9,235.5,211.3,176.2,162.8,186.6,182.1,196.5,208.2,227.8,262.0,309.2,333.8,348.8,381.0,390.0,411.4,392.5,401.2,397.5,365.6,349.1,321.4,308.0,282.0,260.2,262.6,241.9,249.4,229.8,230.6,236.8,270.0,292.1,305.5,308.2,325.0,320.1,334.2,333.4,336.5,307.9,315.8,304.1,277.0,277.6,261.8,264.7,260.5,258.2,259.2,258.2,277.4,312.9,324.1,344.5,370.8,383.3,394.1,395.6,395.1,365.8,349.8,335.3,334.8,291.8,258.7,221.1,223.5,207.4,178.4,183.8,183.4,189.7,197.6,232.5,267.9,292.8,338.8,350.7,391.3,414.1,409.5,428.2,408.7,416.0,404.1,376.8,350.8,318.8,293.5,255.8,249.4,212.7,220.2,208.7,211.2,223.9,234.8,233.4,261.9,280.8,297.4,333.8,337.9,337.2,353.6,361.7,355.1,322.4] },
    { id:20, biome:'grassland', seed:72966, roughness:0.69, points:[297.4,337.8,383.3,413.0,435.9,414.6,388.1,354.5,284.1,261.1,218.7,209.7,204.2,215.3,253.2,291.9,318.8,339.0,363.4,351.1,348.1,333.9,300.4,288.8,261.3,280.1,286.7,296.8,305.0,338.1,364.4,353.5,366.4,327.9,292.5,260.5,225.8,200.7,199.3,194.0,215.7,265.7,291.5,336.3,397.0,406.1,436.0,413.2,383.2,334.4,290.8,250.7,217.2,197.5,191.1,204.8,217.6,266.5,294.4,353.9,374.6,367.5,384.5,373.1,330.8,298.5,278.3,274.0,275.2,265.5,282.2,307.5,335.8,348.4,342.6,332.7,298.0,283.9,263.5,237.0,226.9,227.5,241.4,259.5,292.6,336.8,392.0,395.0,403.7,407.1,382.8,341.3,282.3,256.8,205.0,166.9,187.1,191.3,227.5,262.6,298.7,366.7,394.6,411.3,410.2,396.4,367.4,308.1,277.6,251.8,239.5,239.0,231.3,254.7,296.6,322.2,334.9,317.2,322.0,299.8,290.0,267.3,261.4,259.7,249.6,266.6,310.5,337.1,352.4,379.1,389.2,375.7,351.3,320.5,297.0,232.5,212.4,179.1,162.5,180.3,223.7,250.1,299.8,352.2,406.4,417.1,415.0,397.2,358.9,327.3,270.9,256.1,205.0,212.2,225.8,245.6,255.2,276.2,314.5,332.9,357.7,342.0,344.7,324.1,291.1,283.7,272.2,285.4,269.9,299.3,325.6,337.9,350.1,364.3,361.6,331.5,291.8,269.5,236.3,196.2,206.0,217.2,232.2,270.2,316.1,373.6,394.7,423.1,439.2,412.9,381.5,317.1,287.3,242.0,209.6,172.0,188.9,215.8,248.8,285.6,311.4,356.6,361.2,391.3,376.1,348.9,314.7,297.9,283.4,248.0,260.2,273.3,288.4,321.3,323.5,345.9,339.4,333.4,314.4,280.1,251.8,244.7,212.4,226.1,252.1,278.9,312.6,368.7,403.6,422.7,418.5,396.2,378.3,331.6,270.2,219.3,199.2,189.9,166.2,186.0,225.2,262.8,328.9,366.3,377.6,396.3,400.4,376.1,344.4,299.4,284.6,242.9,231.0,242.6,241.1,273.3] },
    { id:21, biome:'desert', seed:67574, roughness:0.85, points:[297.5,308.2,318.1,324.7,327.4,329.0,335.8,334.7,338.5,337.9,340.6,337.4,324.9,327.5,319.7,313.4,305.4,303.2,295.8,283.7,280.5,275.3,271.7,269.3,272.7,269.8,269.7,272.6,280.8,277.6,289.0,290.9,294.4,295.9,308.4,310.6,311.8,313.4,315.8,314.5,310.8,311.5,311.4,306.9,310.7,305.7,305.4,302.8,297.0,295.3,289.0,286.5,292.2,293.8,288.2,296.1,294.1,298.6,304.7,308.4,311.0,314.5,316.2,320.0,321.8,317.4,320.7,314.8,314.6,319.3,308.4,306.4,299.7,294.8,291.3,282.8,284.1,274.3,269.7,269.6,267.7,266.1,272.0,273.2,275.0,276.1,276.6,287.8,289.8,299.6,302.6,314.8,316.7,329.8,333.2,335.2,333.7,336.2,338.8,340.3,335.4,335.8,327.6,318.9,311.8,303.4,303.6,297.2,289.9,284.1,278.1,270.2,265.8,265.7,268.2,261.3,270.5,271.1,269.3,272.9,279.5,292.6,292.8,303.8,308.4,308.5,314.4,317.1,318.5,322.4,326.6,324.2,323.2,320.3,319.0,314.8,306.8,302.3,300.6,300.5,298.0,292.5,293.6,290.2,291.0,289.3,292.7,288.7,290.2,296.6,299.5,301.6,301.5,309.2,310.5,310.3,312.3,310.1,310.6,315.0,304.8,305.6,303.5,298.7,294.3,286.8,289.8,278.9,278.7,276.7,272.8,279.3,279.0,272.4,275.0,278.6,284.6,289.0,297.5,300.0,305.1,320.5,324.9,321.8,328.6,330.4,331.8,336.7,335.0,332.0,330.7,326.3,316.7,311.0,307.6,303.4,297.2,286.0,275.6,277.9,264.5,262.9,263.2,260.6,258.3,263.0,261.2,270.9,268.5,274.3,283.6,295.1,302.6,310.1,311.5,322.5,322.3,327.7,327.6,333.7,330.6,336.1,328.8,331.8,324.5,318.3,316.0,306.6,303.8,298.1,291.3,284.8,282.2,286.0,276.3,278.5,277.2,277.0,282.8,288.8,287.3,295.7,292.4,301.2,296.7,301.2,309.2,304.1,309.6,310.0,312.8,309.9,309.3,300.2,298.4,299.5] },
    { id:22, biome:'alpine', seed:1957, roughness:0.69, points:[294.3,341.1,357.7,399.9,416.9,410.4,417.4,395.9,402.3,376.1,352.7,315.6,269.4,263.2,246.0,229.0,200.7,209.6,210.1,234.3,242.0,278.6,281.6,305.0,324.5,346.4,355.0,360.0,341.5,344.6,322.5,295.0,285.1,282.3,269.2,270.9,274.2,275.5,285.0,308.3,321.0,331.4,335.2,350.7,364.0,349.1,357.1,327.7,317.8,290.6,282.2,238.0,232.1,210.3,192.1,203.6,216.9,208.4,231.2,254.5,293.0,328.0,364.5,374.6,396.4,419.1,421.5,410.9,385.2,383.4,365.6,330.7,295.4,247.4,243.4,208.1,204.0,193.1,200.7,211.5,231.1,259.8,269.8,310.1,334.4,348.1,364.3,372.1,366.9,362.2,353.1,342.6,318.7,297.0,295.8,282.7,277.9,258.4,266.2,272.5,264.5,282.0,301.4,326.2,322.6,334.7,324.1,322.3,313.0,327.8,303.9,293.9,263.8,249.1,236.4,220.3,236.8,240.3,243.7,250.9,292.2,304.9,346.6,350.5,393.7,391.0,420.6,403.1,394.7,367.3,363.2,329.7,308.0,264.9,236.9,221.2,194.9,183.9,170.7,204.1,217.5,230.7,246.7,302.5,328.6,344.9,361.2,387.4,403.0,399.7,383.7,370.8,350.1,347.2,297.1,288.9,273.3,262.8,233.2,225.7,230.0,257.4,255.4,264.5,285.8,312.3,321.4,334.2,338.4,331.3,333.2,299.7,301.1,284.5,275.9,247.4,255.3,265.6,261.1,275.5,269.7,287.4,305.3,342.2,362.9,367.2,398.4,393.5,383.3,379.4,338.7,317.6,296.9,280.6,231.8,215.8,201.8,190.3,184.0,190.0,191.3,238.4,263.8,283.1,324.6,361.3,385.0,384.0,412.2,411.8,397.7,401.4,366.3,352.3,312.2,291.5,283.7,260.2,242.0,215.3,219.2,218.1,214.3,252.5,270.0,281.7,295.1,331.8,347.6,346.7,345.2,356.8,340.4,330.6,301.3,308.1,299.7,282.6,276.8,281.9,276.5,274.5,305.4,318.8,313.9,340.2,360.0,371.3,370.7,345.4,350.2,332.1,300.8,287.0,265.6,255.7] },
    { id:23, biome:'volcanic', seed:50140, roughness:0.62, points:[307.8,340.0,356.2,384.2,387.6,408.1,377.7,361.4,339.0,301.6,278.9,243.2,238.2,227.5,226.5,242.5,270.7,278.4,313.9,327.6,335.5,329.8,339.1,312.7,301.5,307.4,270.8,286.0,274.2,276.4,283.6,318.7,317.6,344.5,349.0,342.3,335.1,321.1,296.3,294.3,249.5,245.6,213.3,215.2,213.0,242.5,260.1,285.5,322.5,360.9,375.5,389.3,397.3,392.1,359.8,338.9,305.2,272.4,249.6,228.3,202.8,211.0,234.5,253.6,280.5,312.5,329.5,346.1,359.7,369.3,354.3,331.5,332.8,294.1,297.7,281.8,268.2,283.1,270.3,286.9,296.1,311.1,326.9,320.2,332.1,313.8,295.9,276.8,255.0,253.5,228.7,243.5,239.1,273.9,290.3,314.3,358.6,363.8,396.6,389.3,377.5,354.7,346.6,291.9,276.8,229.5,215.3,200.7,204.0,209.1,233.3,262.4,301.5,336.5,354.1,387.0,397.4,383.3,372.1,355.5,327.0,302.5,260.7,256.5,259.1,253.0,264.5,263.0,279.3,296.4,312.0,329.5,330.5,309.1,317.6,298.2,287.1,266.8,261.7,253.1,268.7,292.0,321.5,338.5,344.8,376.1,385.7,363.4,368.8,344.9,312.8,261.5,253.0,229.7,194.4,211.8,219.1,223.8,254.1,293.8,335.0,367.9,385.6,395.9,392.2,374.1,360.4,324.4,291.3,266.9,246.6,242.4,225.1,235.7,232.3,267.6,284.2,301.2,332.7,332.8,332.5,343.0,336.1,300.5,302.5,285.1,284.1,268.1,285.5,301.7,299.5,330.6,335.9,356.7,345.9,353.1,323.9,313.4,286.6,251.0,223.5,219.8,225.5,224.1,247.1,268.0,290.8,338.0,363.9,384.4,402.3,393.3,392.2,368.2,349.6,299.9,267.1,233.5,228.5,205.4,219.9,210.2,251.9,274.9,312.3,322.3,343.6,362.0,358.1,360.9,351.5,327.7,297.2,293.3,285.6,277.5,274.9,276.5,279.8,308.9,313.9,316.5,320.1,326.6,307.3,300.5,280.4,273.5,238.8,243.3,236.6,235.8,254.5,284.7,310.4,352.8] },
    { id:24, biome:'arctic', seed:52077, roughness:0.74, points:[304.6,326.9,331.9,353.8,364.6,382.8,382.5,395.3,394.4,383.0,362.2,363.3,342.7,336.7,319.8,303.1,267.8,268.3,258.1,234.1,244.4,238.4,238.2,230.7,237.2,254.7,260.3,280.9,291.8,300.2,322.5,316.6,334.6,342.4,343.5,333.2,325.9,326.8,308.6,304.9,298.7,286.8,292.7,290.4,277.9,275.1,288.6,282.5,281.9,291.1,292.7,307.3,315.0,327.9,334.7,342.5,348.0,346.6,347.1,331.5,335.6,331.1,301.5,300.9,290.4,259.4,251.1,242.4,231.0,225.1,234.2,234.2,225.6,229.1,240.3,258.7,282.4,295.3,310.8,332.4,361.5,370.6,375.2,389.2,393.6,391.8,391.6,364.8,371.2,354.1,335.7,321.2,285.9,266.6,259.6,235.7,239.7,216.9,217.3,228.2,214.4,230.7,247.1,249.8,265.5,286.4,306.3,313.5,320.8,345.6,337.1,341.0,350.2,363.2,343.0,340.1,333.2,324.3,313.6,317.3,303.4,284.6,271.6,285.6,279.8,278.8,275.4,267.3,281.4,291.2,288.6,309.2,302.4,323.0,334.2,316.7,337.2,319.8,326.8,304.6,303.0,297.5,289.1,274.9,274.4,267.1,250.7,252.1,233.7,237.4,255.9,257.7,268.4,286.4,291.3,322.6,325.4,340.8,356.7,361.3,380.3,379.0,388.4,374.1,361.7,351.2,349.4,335.3,303.4,302.3,279.5,253.8,250.9,225.3,215.6,224.4,214.8,215.4,230.0,221.9,240.5,258.7,275.8,288.3,304.8,319.0,338.6,352.1,370.7,366.5,369.6,375.4,361.3,360.7,353.0,346.2,323.4,305.9,291.7,287.1,280.8,257.7,260.0,253.3,254.0,261.9,268.7,276.7,268.2,294.3,292.0,307.3,318.7,315.7,331.9,329.0,316.7,313.3,321.2,303.7,298.3,292.9,290.6,275.6,278.3,265.8,269.5,263.5,269.7,268.4,281.4,297.1,296.8,309.1,317.3,333.7,344.3,356.2,362.4,356.2,362.0,357.5,343.2,333.7,335.2,302.8,289.4,280.2,254.0,257.9,244.7,233.1,211.8,221.2,224.2,220.8] },
    { id:25, biome:'forest', seed:86495, roughness:0.71, points:[308.3,325.2,349.4,370.6,362.4,359.1,338.1,303.3,276.5,256.8,253.3,252.9,246.6,271.2,301.5,314.1,324.9,330.0,319.3,312.9,301.7,282.9,282.8,272.3,289.4,305.5,312.3,332.5,343.8,334.1,320.0,305.4,289.3,270.9,241.2,247.0,232.4,263.5,282.6,320.0,344.5,369.4,381.4,377.1,350.9,329.9,300.1,263.2,254.3,229.7,226.8,241.3,259.9,286.6,326.1,332.3,338.1,338.0,338.9,311.6,308.2,285.5,273.9,270.1,287.1,298.4,304.4,312.7,314.7,313.3,307.7,283.1,266.9,265.1,252.4,265.5,265.4,293.7,310.5,343.2,355.1,363.6,372.5,336.9,323.7,285.0,263.5,238.7,219.8,224.5,253.4,279.4,293.7,331.4,348.9,357.1,365.8,340.7,330.9,296.1,276.7,259.5,255.3,274.9,281.2,299.2,312.1,307.3,325.6,312.0,298.6,297.1,271.8,269.0,275.7,282.4,300.6,321.3,337.7,340.0,355.2,346.7,334.7,310.7,278.2,260.5,228.9,221.9,236.2,260.9,274.0,314.7,346.0,359.5,378.8,370.3,352.5,320.5,298.8,272.1,262.8,246.6,252.3,266.4,287.0,294.0,311.3,332.7,324.8,317.3,303.2,298.3,287.3,275.6,291.0,284.5,301.4,313.9,329.4,345.1,341.7,314.5,298.0,269.7,259.6,244.3,242.3,245.0,258.3,287.8,330.2,345.9,372.5,378.1,373.1,348.2,317.0,294.3,256.5,247.5,234.0,232.9,246.0,276.0,298.7,320.0,332.8,338.8,349.8,338.2,316.4,292.1,274.4,283.4,278.1,295.3,300.2,313.3,314.8,326.2,314.7,293.4,284.5,278.1,251.8,254.0,262.2,280.8,293.7,335.0,344.9,370.7,368.1,361.5,330.1,306.3,273.2,243.6,222.9,222.7,238.1,244.7,283.5,315.3,330.3,361.8,365.5,359.9,348.1,320.9,289.6,278.1,263.2,259.6,273.9,272.4,301.1,300.7,315.0,310.2,310.6,295.3,289.9,274.4,274.7,267.8,277.6,297.2,324.2,341.4,360.7,347.2,351.4,331.0,304.7,261.4] },
    { id:26, biome:'coastal', seed:17294, roughness:0.86, points:[295.0,324.8,335.3,346.2,360.6,355.0,338.3,321.9,309.3,284.5,267.9,259.8,254.7,262.0,272.3,282.6,290.4,308.1,308.6,318.5,316.9,313.8,315.5,304.4,295.0,289.5,286.9,288.9,288.0,297.7,306.7,318.3,329.2,326.6,321.8,323.3,303.6,294.9,278.7,264.0,257.9,245.1,257.6,261.8,289.4,296.0,328.6,334.9,356.0,353.8,361.3,344.4,324.7,312.6,286.6,275.7,248.5,244.4,245.2,258.8,271.3,289.9,308.2,316.8,331.7,333.7,329.2,323.4,314.0,313.3,299.9,292.9,288.6,284.1,292.8,296.5,295.5,307.1,320.1,321.8,316.6,302.4,305.0,283.0,268.9,273.5,268.0,272.8,266.8,287.1,301.8,327.3,333.9,347.9,359.2,352.9,347.3,330.1,307.5,291.6,268.3,256.3,249.6,246.3,251.6,270.0,287.8,297.0,322.9,336.6,347.3,351.6,348.7,337.2,323.0,309.1,283.6,275.4,270.2,272.9,275.3,283.8,294.0,308.7,317.4,316.3,309.7,309.3,302.1,293.6,286.6,275.7,270.2,278.6,281.5,299.1,313.7,327.4,339.6,338.9,346.6,326.7,321.2,300.7,277.1,264.9,259.3,241.6,238.4,254.5,268.1,289.5,301.5,323.2,346.4,354.3,360.2,355.3,341.3,320.9,297.7,285.8,276.7,258.8,255.1,253.6,270.9,281.3,288.1,304.5,323.6,317.6,321.3,313.5,316.9,298.1,295.1,283.4,280.2,283.8,293.6,298.6,317.0,326.4,321.7,335.0,323.7,312.2,296.3,286.3,277.0,264.0,250.1,256.8,263.1,272.6,290.6,304.7,336.1,340.3,348.4,359.0,346.0,333.5,327.8,301.2,276.0,264.9,253.4,252.2,245.7,259.7,279.6,289.2,307.5,328.5,325.6,338.7,331.3,321.3,312.0,304.4,294.5,282.7,284.9,276.1,284.3,291.6,309.5,310.5,316.9,324.9,315.9,310.1,300.8,278.3,266.7,258.6,259.3,271.6,283.2,294.2,302.2,320.1,335.4,345.7,356.7,349.7,333.6,321.1,294.4,278.2,257.0,253.8,236.6,249.0] },
    { id:27, biome:'wetland', seed:15124, roughness:0.76, points:[303.2,322.1,351.2,382.8,400.9,417.0,405.1,378.4,349.1,324.1,308.1,268.3,235.8,221.1,209.2,222.2,242.2,253.3,264.0,292.3,321.9,328.1,328.2,334.4,326.3,320.6,330.4,291.3,279.8,276.7,272.1,276.1,291.0,302.8,302.0,328.8,347.1,339.7,343.9,341.7,341.0,337.6,302.2,270.1,265.6,238.6,221.6,200.4,207.7,211.2,249.7,259.9,290.6,328.9,363.9,379.1,390.4,409.3,406.1,390.4,356.5,320.8,296.2,261.9,229.5,200.1,203.5,198.8,215.7,245.4,268.7,274.1,303.1,328.9,344.0,368.2,355.1,357.3,343.3,341.6,318.9,300.4,280.0,279.4,271.4,268.1,274.4,286.8,294.9,325.1,322.3,319.3,338.5,323.0,307.5,300.5,273.4,248.2,255.1,232.0,220.7,227.6,253.3,274.2,300.5,328.6,345.1,390.2,392.1,403.1,383.5,374.6,361.1,333.6,295.2,243.9,233.6,204.9,201.8,187.4,193.5,235.1,250.6,289.8,318.4,342.7,371.5,376.8,393.5,391.2,384.7,350.1,338.3,311.3,293.8,260.7,242.5,241.6,242.1,258.7,272.0,292.8,306.3,326.0,318.5,332.0,337.2,308.5,312.6,299.2,268.8,259.8,270.4,251.2,274.1,269.5,310.5,333.5,344.7,350.7,369.5,372.8,375.6,373.4,355.7,311.6,287.0,260.7,221.4,207.6,209.0,208.0,209.5,220.0,249.6,287.3,322.1,344.9,392.4,405.9,414.8,406.2,384.1,353.0,333.9,309.5,267.6,247.5,237.5,228.4,209.1,239.1,249.4,268.0,278.2,305.0,321.8,324.4,352.4,335.5,325.8,310.1,313.8,294.2,287.6,271.7,275.8,269.4,275.9,297.0,320.9,341.3,332.0,363.3,353.8,356.5,346.1,302.5,287.8,254.3,232.6,226.3,200.6,213.4,206.7,223.6,273.1,304.2,319.7,367.9,393.7,412.5,409.5,396.0,393.6,365.3,345.5,308.9,267.5,232.5,206.2,204.7,199.4,210.7,234.7,256.7,267.6,291.0,330.6,360.1,373.6,370.8,351.1,351.4,332.6,321.3] },
    { id:28, biome:'urban', seed:48349, roughness:0.76, points:[291.3,314.9,344.9,365.9,399.9,412.7,410.9,411.9,422.7,412.0,397.8,411.7,380.9,377.1,350.9,319.2,303.9,287.8,267.4,250.2,224.0,219.5,217.6,210.6,210.5,201.5,230.7,224.5,246.8,252.7,285.7,295.0,318.5,328.1,325.2,335.9,345.5,335.0,335.1,334.4,337.5,343.8,309.1,297.6,297.6,291.6,267.1,276.1,269.1,257.7,258.6,269.9,285.5,290.1,302.4,311.5,303.3,339.1,325.7,339.4,358.0,348.3,372.9,366.6,373.3,360.1,344.7,318.9,301.8,305.5,273.4,270.1,228.1,230.8,221.9,186.0,198.3,195.8,200.0,210.8,208.2,245.3,262.5,259.6,298.2,330.6,356.3,357.6,374.7,408.3,420.1,421.6,440.1,413.3,431.1,424.1,379.1,389.1,366.2,336.9,312.8,292.8,265.0,220.0,226.0,200.5,186.5,174.6,189.2,194.4,209.4,218.2,207.5,225.0,269.5,276.3,289.4,319.4,322.7,347.9,369.6,369.2,373.2,389.4,392.3,381.8,357.7,350.2,352.1,328.0,296.2,292.2,285.0,274.0,278.2,269.9,268.4,263.2,269.7,256.3,273.4,272.4,307.4,293.9,308.8,314.3,325.9,351.3,346.2,343.6,344.3,316.6,309.5,315.7,303.5,286.0,263.1,242.5,245.1,236.7,210.2,235.7,224.5,211.7,229.7,253.0,247.4,278.3,276.6,297.5,327.4,341.4,379.3,386.0,390.2,423.4,422.7,405.7,404.4,418.6,380.9,360.1,350.9,344.0,316.5,267.2,248.5,235.4,217.1,203.4,176.7,181.1,163.7,164.1,169.6,205.6,212.2,219.3,254.0,270.8,291.5,301.1,342.7,352.1,374.7,386.1,390.7,410.5,412.2,410.9,397.8,392.8,359.2,342.9,321.3,329.6,314.7,279.7,256.3,250.6,248.9,238.3,238.8,220.7,244.6,230.5,269.5,274.2,269.8,277.1,314.0,300.0,314.3,317.1,343.6,346.9,336.3,333.7,319.8,315.3,294.8,306.1,295.0,272.2,267.0,255.6,264.0,242.1,236.1,243.9,275.4,276.1,268.9,284.8,303.0,334.6] },
    { id:29, biome:'fantasy', seed:10525, roughness:0.84, points:[301.2,338.2,374.1,382.6,383.2,373.5,349.6,328.0,298.6,269.6,235.8,231.0,246.7,250.7,277.2,296.3,310.0,325.6,344.7,337.9,305.8,301.8,297.9,276.5,271.7,282.5,293.9,326.8,323.3,341.3,349.8,340.1,323.2,292.8,259.9,235.0,219.7,214.6,228.4,263.4,286.2,326.8,351.1,369.2,387.3,379.9,368.5,337.4,298.9,252.1,242.0,224.0,214.0,220.3,260.8,279.5,323.9,336.3,344.0,356.9,338.4,340.5,314.0,295.5,286.9,261.6,283.9,281.2,297.4,309.1,319.8,336.9,323.8,300.3,285.6,262.8,259.3,237.1,253.8,261.1,278.8,319.2,348.4,359.5,380.7,391.3,356.5,330.8,308.6,277.8,240.3,223.4,208.9,207.2,233.6,265.6,297.1,326.7,365.7,366.8,369.8,366.4,327.7,318.6,294.0,256.7,254.7,257.3,273.6,276.9,288.6,313.7,314.9,321.3,319.9,308.9,281.7,267.5,272.5,272.1,282.5,293.9,319.0,346.3,350.1,363.9,363.5,352.5,312.5,295.0,253.0,223.7,205.0,215.2,234.3,261.8,290.4,322.9,371.9,392.9,383.5,380.9,359.3,320.7,288.1,254.0,244.5,225.8,238.3,250.1,266.0,300.5,326.5,333.6,339.8,340.0,313.8,312.3,284.3,279.6,281.1,287.8,305.2,305.1,330.6,345.3,342.3,341.8,330.8,307.2,268.0,255.3,234.2,221.3,223.8,256.4,281.1,329.9,364.1,375.8,391.6,382.2,361.6,339.0,313.4,276.3,243.9,224.8,212.7,222.2,257.3,280.6,312.5,341.5,345.5,351.4,351.5,331.3,316.1,294.2,287.3,280.0,269.8,284.0,303.4,315.7,332.3,337.8,328.7,318.0,287.0,270.9,255.4,236.8,246.0,254.0,269.2,315.7,338.2,365.3,372.3,380.7,365.8,352.3,303.2,276.9,251.3,224.4,202.6,213.1,230.0,265.7,297.3,322.1,357.3,374.3,376.9,355.3,332.2,308.7,278.7,265.0,259.9,251.1,266.8,279.8,291.4,315.5,328.0,333.5,316.0,298.8,286.9,280.9,268.8,265.2] },
    { id:30, biome:'grassland', seed:24304, roughness:0.24, points:[305.1,330.0,362.7,366.4,376.0,382.4,367.4,348.9,330.3,307.8,274.6,251.3,255.7,236.0,229.1,253.5,262.7,285.4,302.7,316.3,332.2,337.0,341.3,323.8,321.0,301.4,294.2,278.9,274.8,286.0,289.9,290.2,301.3,310.6,326.9,334.0,335.7,342.0,336.4,317.1,306.0,274.0,256.5,241.7,224.6,221.6,223.3,254.5,277.0,299.3,311.9,351.5,363.4,384.9,395.5,371.6,362.4,355.2,320.3,284.5,271.2,244.1,217.8,220.0,221.7,227.1,262.1,272.4,297.8,330.2,339.3,344.8,351.3,340.7,343.5,327.7,303.2,291.3,282.1,284.3,283.6,278.4,286.3,288.1,301.5,308.2,323.5,333.1,325.8,317.0,299.2,277.7,271.5,255.7,257.8,237.8,260.0,277.1,285.7,318.8,332.1,363.9,374.9,371.4,385.8,368.0,352.4,317.4,300.5,271.0,247.6,218.4,217.0,210.7,227.3,230.7,271.0,296.6,325.7,342.5,356.4,364.5,364.1,368.3,341.1,336.4,312.1,285.6,280.4,267.1,255.1,252.3,256.1,283.0,301.6,294.5,318.0,310.6,330.6,308.2,317.8,291.8,278.2,279.1,262.6,272.2,272.5,278.2,295.5,309.7,326.5,348.3,354.9,369.4,364.6,350.0,329.8,303.7,290.3,247.4,228.7,226.5,224.6,230.9,239.6,252.0,277.0,314.6,339.7,352.7,381.4,394.5,389.7,372.4,343.7,329.0,297.4,284.4,247.5,234.4,228.5,242.7,247.0,263.8,282.5,290.8,326.4,333.3,329.9,328.7,328.7,318.7,294.6,283.5,280.0,287.1,279.1,294.0,289.9,304.8,326.2,335.4,344.5,346.2,341.9,331.2,321.6,293.7,264.2,260.3,228.3,226.7,219.0,246.5,260.1,276.6,295.4,324.6,353.3,369.8,382.9,385.0,380.5,362.1,328.8,306.6,287.1,255.7,223.5,232.7,216.9,239.5,251.8,272.6,297.7,316.9,339.1,347.8,362.9,348.9,347.8,340.0,314.3,300.6,281.2,272.1,266.3,283.1,279.4,300.1,296.6,320.5,321.9,317.2,320.8,309.4] },
    { id:31, biome:'desert', seed:20602, roughness:0.22, points:[308.9,326.9,356.7,365.9,384.5,372.1,374.3,349.3,315.9,301.0,277.4,249.4,250.6,235.3,248.9,255.5,264.8,286.7,313.2,311.5,330.6,328.5,323.7,327.5,312.1,296.9,277.9,274.4,289.0,278.6,301.8,312.7,313.7,338.0,339.8,331.6,333.9,329.5,307.9,284.7,266.5,251.6,235.8,238.2,242.9,242.9,266.4,297.0,320.7,341.0,361.1,370.8,380.4,367.0,354.3,333.4,301.4,276.5,249.7,238.0,220.8,229.4,234.7,254.7,274.3,288.9,318.3,342.0,345.7,357.4,349.7,339.7,316.2,299.7,290.1,279.2,270.6,267.6,273.6,298.0,291.8,309.3,318.6,322.1,316.6,323.6,307.7,285.9,266.3,253.8,249.9,256.5,257.1,263.4,287.7,310.8,340.4,355.6,355.4,374.8,361.9,363.3,347.5,324.2,293.0,261.5,238.8,230.8,224.3,224.3,235.4,261.3,289.9,309.1,328.4,359.4,355.4,357.5,360.8,351.4,319.6,302.3,279.0,267.1,269.7,259.4,257.6,267.0,288.5,294.2,316.6,312.7,315.3,309.4,308.6,299.3,279.6,273.6,279.7,259.1,275.3,281.1,298.0,309.8,339.4,348.0,361.4,359.7,352.1,348.5,322.3,298.1,266.5,250.6,232.1,223.6,228.1,233.1,256.4,272.2,314.1,329.3,347.4,377.1,380.6,373.1,358.2,347.5,313.9,290.3,279.2,250.9,249.5,239.9,246.1,249.4,265.6,282.5,299.4,319.4,328.2,331.7,322.3,323.9,309.0,303.4,276.6,271.0,289.7,277.9,286.7,307.5,327.7,340.9,328.8,349.8,342.0,320.6,302.4,278.0,269.4,254.8,241.9,228.2,239.4,257.3,276.1,296.9,327.8,344.4,356.4,372.8,385.9,361.9,358.2,325.5,313.1,285.9,245.2,245.3,232.0,226.6,237.4,254.3,268.0,297.9,328.9,327.6,353.1,353.9,351.6,341.4,324.5,302.8,289.4,277.4,286.0,272.0,276.9,298.4,294.9,318.0,317.7,331.7,313.9,308.7,300.4,295.8,271.8,252.5,250.7,259.2,256.4,266.6,287.3,317.1] },
    { id:32, biome:'alpine', seed:80181, roughness:0.79, points:[288.1,335.6,375.3,398.6,394.4,387.5,372.8,340.8,294.5,250.2,242.8,217.8,213.8,247.3,267.8,280.4,313.9,329.2,351.1,331.7,320.1,305.7,280.4,288.2,266.4,265.9,280.1,310.4,335.9,342.8,347.6,349.9,342.7,308.3,276.0,255.7,229.9,214.9,207.6,227.8,272.9,312.0,353.1,373.7,407.9,412.5,406.9,380.6,339.4,302.5,240.0,206.0,191.1,198.1,212.5,240.8,279.3,322.0,348.7,359.1,364.9,359.1,351.5,304.2,299.1,269.4,265.2,261.3,281.8,301.5,307.4,323.9,320.4,333.8,305.8,289.0,265.8,258.9,238.5,238.5,231.4,264.0,303.3,321.5,358.5,383.0,410.3,393.9,364.1,327.4,276.6,260.1,203.2,183.7,192.7,209.1,228.5,271.4,307.1,350.9,378.2,380.1,386.5,375.5,345.8,303.9,274.5,245.1,243.2,250.8,265.6,285.9,299.8,312.8,334.7,338.7,315.9,295.1,275.6,257.4,265.6,246.2,262.4,290.0,312.2,346.5,378.8,383.7,375.0,371.4,315.5,289.9,255.4,223.8,186.2,183.5,196.4,249.1,270.6,314.7,349.2,378.1,392.3,403.3,376.7,355.0,323.8,263.3,240.9,219.2,207.9,224.7,262.8,264.3,311.6,337.6,338.9,345.1,325.5,315.8,306.2,285.7,261.7,280.5,291.2,286.2,324.3,342.5,350.8,361.2,335.1,338.7,287.5,260.7,228.6,215.2,218.8,218.3,242.7,279.9,322.5,368.6,386.7,401.1,394.8,395.5,364.8,303.1,281.7,229.5,200.0,195.2,207.0,229.3,273.4,303.5,328.7,354.5,356.1,351.6,363.3,325.3,298.0,281.3,274.9,260.3,281.3,283.0,310.2,306.7,340.1,335.6,330.5,308.8,283.7,261.3,234.5,225.8,244.6,265.1,283.2,320.1,361.1,391.3,400.4,410.7,377.0,357.1,318.5,271.8,237.1,204.5,204.6,210.4,220.8,264.9,291.0,343.8,358.0,385.9,387.3,381.0,346.6,329.3,298.4,266.2,242.3,252.3,261.0,271.0,300.2,296.9,311.3,325.0,331.9,306.0] },
    { id:33, biome:'volcanic', seed:21928, roughness:0.59, points:[295.6,305.9,319.4,327.7,329.1,338.3,337.3,342.5,334.7,341.3,329.5,331.8,325.1,314.2,308.5,304.0,291.1,280.5,279.2,277.7,274.9,274.8,267.8,273.7,278.6,281.3,281.2,291.7,295.6,301.3,308.0,310.7,314.3,309.8,314.1,314.0,312.2,316.2,306.7,306.6,308.9,304.4,294.6,295.5,294.7,288.0,289.5,287.2,295.0,289.2,301.7,305.6,309.7,313.8,311.4,320.0,316.9,315.4,324.4,322.6,317.9,313.5,306.2,301.9,303.8,296.6,281.6,278.2,273.9,272.5,268.8,270.6,269.2,269.9,271.5,277.9,279.8,289.2,294.4,310.1,316.2,323.7,329.7,338.0,342.2,336.0,345.8,342.6,338.9,332.6,323.6,317.9,308.4,307.0,291.3,286.3,281.6,270.0,268.0,266.5,265.2,260.0,263.5,272.1,269.9,277.7,283.9,294.4,297.9,307.4,310.6,320.0,324.9,324.4,321.5,326.1,323.1,321.3,315.0,316.9,311.0,300.7,299.6,295.3,287.5,284.8,289.1,291.0,290.7,291.9,296.8,295.0,293.9,306.3,305.3,307.7,311.9,312.8,311.5,308.3,307.2,307.7,302.8,298.0,299.8,293.6,286.1,277.0,281.6,271.2,269.9,273.5,275.3,283.5,284.5,291.1,298.0,300.0,311.4,312.8,326.7,322.8,337.3,333.1,334.5,336.8,337.3,334.2,328.1,323.2,313.5,308.9,293.6,292.0,284.4,273.3,269.0,262.3,264.0,257.2,256.3,265.7,271.1,274.8,274.9,285.4,297.0,300.6,314.3,319.4,328.2,329.3,333.4,336.3,335.2,329.1,332.8,326.6,317.7,318.6,302.4,301.2,298.8,290.5,287.4,278.1,284.6,282.4,283.3,284.3,284.1,283.3,286.1,296.0,301.2,300.8,302.9,310.9,314.5,309.7,307.6,312.9,305.8,303.3,298.0,296.0,288.6,286.5,287.2,282.8,286.2,289.1,285.4,291.7,291.1,297.7,302.6,309.8,315.2,312.6,318.7,331.1,324.4,335.1,333.7,327.0,329.4,317.4,319.4,304.5,303.0,289.4,280.8,282.4,269.1,271.0] },
    { id:34, biome:'arctic', seed:11133, roughness:0.82, points:[300.2,303.9,314.1,327.3,331.1,343.8,345.9,343.1,343.5,336.3,336.2,327.3,324.6,311.3,311.4,296.2,294.9,287.0,270.9,276.2,272.0,272.5,268.3,265.2,271.3,276.3,278.9,292.8,299.3,296.0,309.1,305.6,312.1,317.6,318.9,315.6,319.3,308.4,310.2,306.6,304.0,301.3,292.8,287.6,284.3,287.6,284.6,287.2,290.8,292.8,301.3,308.0,311.2,309.3,313.6,323.6,324.2,324.3,325.1,315.7,315.9,311.9,309.4,302.2,288.8,288.2,284.9,274.1,269.5,268.0,266.4,266.7,268.1,267.1,272.7,276.3,283.6,289.9,309.7,317.5,327.2,333.2,338.3,339.7,342.9,345.1,343.7,341.4,332.5,330.5,323.0,316.1,307.4,289.6,279.6,274.5,273.5,259.9,264.0,260.8,259.5,263.7,267.5,270.7,280.2,290.2,293.4,296.0,307.8,318.8,317.3,328.6,330.9,325.8,323.2,320.4,317.2,312.9,310.4,311.2,305.0,298.0,293.5,292.3,291.6,284.8,281.0,290.1,295.1,287.6,297.9,300.6,303.0,304.1,306.2,309.4,317.1,311.0,312.6,314.7,307.9,304.4,301.2,297.7,292.0,279.9,283.0,279.9,271.9,272.7,267.8,277.0,282.8,290.2,289.2,296.8,306.1,316.3,323.0,327.2,332.6,339.9,336.7,341.6,337.1,330.6,336.2,326.8,313.8,311.1,295.0,284.0,282.0,268.8,263.7,257.3,261.2,256.2,258.8,256.5,263.5,269.8,280.8,280.6,293.4,308.9,312.8,318.4,332.1,336.6,340.6,334.0,339.3,339.3,327.5,321.7,325.5,319.0,307.6,304.4,291.2,286.8,279.3,276.2,278.2,279.8,273.6,281.2,278.1,283.1,292.3,301.3,295.9,306.3,306.3,309.9,310.5,313.3,313.3,312.0,303.3,298.7,293.4,290.3,292.4,286.9,288.2,282.9,285.9,280.7,285.5,285.0,295.7,299.1,308.5,306.1,312.5,324.6,329.5,325.7,337.4,331.0,327.7,325.9,329.5,315.0,308.9,301.0,291.5,290.2,278.2,265.9,267.4,257.2,254.0,262.2] },
    { id:35, biome:'forest', seed:11198, roughness:0.21, points:[296.7,313.9,320.8,325.1,333.4,333.0,331.9,321.5,314.3,303.4,295.7,284.1,280.0,276.6,277.3,276.8,281.7,296.3,297.3,303.5,307.0,314.7,313.2,309.6,307.2,301.3,296.8,296.6,291.9,288.7,293.1,296.7,303.2,312.1,314.8,318.5,316.2,316.3,312.0,300.6,297.9,287.7,283.1,275.5,270.2,274.4,274.9,285.4,293.0,302.1,316.4,321.9,333.7,334.9,331.5,329.1,321.3,309.9,293.9,290.7,276.0,274.5,272.8,271.2,274.3,281.8,287.8,302.4,311.0,316.7,322.7,320.4,318.4,318.5,308.0,303.6,293.9,296.3,287.2,293.3,292.4,294.0,298.2,307.0,304.2,313.5,310.1,310.7,306.8,297.5,290.5,284.1,277.5,275.6,277.2,279.8,289.9,299.5,308.3,314.2,326.6,328.4,333.4,328.1,320.5,311.3,306.6,290.4,281.3,278.1,268.4,268.4,267.2,272.3,279.4,291.3,301.4,313.3,324.6,329.1,330.5,326.5,319.5,312.0,303.3,298.0,290.3,285.4,286.9,281.3,285.5,287.1,296.7,299.1,305.6,304.2,309.4,309.4,302.1,302.3,291.4,291.3,284.4,286.2,288.2,293.6,299.8,304.0,311.1,316.9,320.3,325.6,324.0,318.1,307.9,297.0,293.0,281.9,276.5,266.7,266.4,267.9,276.3,290.8,295.8,312.0,322.1,326.4,331.2,334.2,325.9,320.6,312.6,305.7,292.8,287.1,276.5,274.8,279.0,282.9,287.3,289.8,301.3,303.5,309.1,311.7,310.1,310.0,303.7,298.9,299.3,291.3,293.0,291.6,289.5,296.1,303.1,307.2,313.4,315.4,316.7,315.2,312.6,302.5,300.2,288.8,280.2,279.5,269.5,269.6,278.0,279.2,292.5,300.5,312.4,322.7,326.2,330.8,331.4,328.0,324.8,309.8,301.3,289.1,275.7,269.1,270.3,267.8,272.3,284.8,290.4,298.2,310.3,313.6,316.4,323.8,322.7,314.5,309.5,301.9,298.0,297.0,287.3,290.1,293.8,297.0,299.8,302.7,307.5,307.2,313.3,307.3,300.5,296.4,290.9,287.1] },
    { id:36, biome:'coastal', seed:83163, roughness:0.7, points:[310.2,319.1,336.1,360.7,386.2,383.2,406.7,405.5,392.3,400.1,390.9,381.2,349.6,349.8,308.6,289.5,280.9,251.2,239.0,225.7,220.7,228.6,224.1,233.1,220.5,237.4,256.1,266.8,272.6,299.4,307.6,312.6,334.7,335.6,352.9,342.2,336.9,337.1,332.0,330.2,306.3,298.0,284.9,288.2,276.2,276.1,285.3,277.2,290.3,286.7,290.4,313.8,305.3,327.6,333.8,338.6,357.8,356.8,355.6,362.0,336.5,329.1,314.4,318.4,287.2,270.9,260.1,230.7,239.0,214.3,210.5,201.4,214.9,220.3,231.1,254.7,271.7,293.8,292.1,315.4,332.2,354.9,382.0,402.2,410.7,401.8,418.7,392.4,391.0,381.9,355.8,349.2,309.7,289.3,284.8,263.0,237.9,213.8,220.0,201.8,189.0,197.6,222.8,222.6,246.8,251.3,272.8,291.1,308.9,340.2,330.2,343.2,351.5,354.4,359.2,356.9,351.5,356.1,340.8,321.1,301.7,296.9,280.1,287.7,268.6,272.0,276.2,263.7,278.1,265.8,289.6,296.4,301.8,307.8,320.9,336.2,324.6,346.2,328.9,332.7,327.4,308.6,306.1,282.0,280.8,260.2,261.2,254.4,247.7,243.8,221.3,233.0,240.7,255.3,265.8,292.4,294.5,315.1,330.3,366.0,360.5,389.7,385.1,397.3,399.9,398.8,399.0,373.8,349.5,328.2,319.0,280.3,266.5,253.7,238.3,208.2,204.4,188.7,186.3,201.7,199.2,215.4,217.1,246.2,273.1,299.6,315.9,330.2,346.2,361.4,391.6,390.3,386.5,382.9,386.8,378.3,364.1,345.3,321.6,313.7,296.8,272.8,272.4,268.7,254.1,235.1,235.9,253.9,243.8,251.9,267.8,267.3,303.0,308.2,320.7,317.5,321.4,317.6,322.1,324.8,331.1,311.7,316.9,303.7,294.8,284.9,256.5,273.0,270.1,248.3,259.3,276.6,278.2,287.5,285.7,301.9,327.4,349.5,365.1,364.0,371.5,371.1,380.1,365.6,381.2,358.2,352.0,328.5,307.3,277.3,263.6,240.4,219.0,209.2,204.6,199.6] },
    { id:37, biome:'wetland', seed:39587, roughness:0.94, points:[309.8,348.9,393.0,402.6,410.4,413.0,368.6,323.4,278.8,234.8,204.8,211.9,233.0,243.6,300.1,319.0,329.0,349.1,359.7,336.3,304.6,278.1,259.7,254.9,265.2,296.7,316.3,339.4,353.1,354.4,353.2,321.6,290.5,252.9,220.8,185.4,204.8,237.9,250.2,298.8,348.1,399.6,429.3,424.8,404.7,354.8,320.8,269.4,225.9,185.1,174.1,205.2,246.2,294.3,314.0,349.1,372.5,377.5,372.9,326.2,308.8,275.5,277.2,268.0,261.1,298.6,301.0,335.6,333.4,339.6,316.0,302.1,278.8,238.3,232.4,235.8,243.8,286.1,314.8,352.9,387.6,422.4,423.5,401.2,346.4,289.7,239.5,213.3,191.6,169.2,199.1,236.5,293.5,332.0,369.7,392.3,412.3,380.3,363.9,309.2,288.3,261.4,252.9,243.9,264.1,283.5,289.3,307.7,317.5,341.0,304.1,285.4,260.7,245.8,256.3,262.0,271.0,308.8,337.2,370.8,386.8,378.6,382.2,323.0,297.8,242.2,190.2,186.0,188.8,216.1,236.1,295.6,335.9,374.5,405.0,410.8,393.8,362.8,332.2,261.8,223.8,208.1,203.3,227.0,253.2,278.6,321.8,343.1,355.4,329.9,315.9,319.8,285.3,287.4,257.3,285.1,291.7,332.0,330.9,346.1,366.8,357.9,336.8,282.3,236.1,226.1,201.8,207.8,205.0,253.6,299.6,343.7,409.3,410.8,428.3,386.5,356.6,324.9,246.4,218.1,202.0,176.9,189.3,246.2,285.0,317.4,367.0,368.8,368.4,354.8,349.7,300.3,297.8,259.5,276.3,267.8,285.7,319.3,337.0,329.6,332.4,323.9,311.9,260.9,236.1,229.0,223.5,249.8,275.7,320.1,345.9,385.4,424.0,408.5,403.0,366.5,298.7,237.9,214.0,175.4,172.4,199.9,222.1,280.4,324.9,380.6,388.8,414.6,389.8,355.8,318.2,287.9,251.5,254.3,237.7,263.6,272.9,285.4,320.3,317.6,321.2,314.5,286.5,275.4,256.6,262.7,269.4,279.6,302.0,350.6,365.9,398.5,397.0,386.9,327.9,300.6] },
    { id:38, biome:'urban', seed:87613, roughness:0.59, points:[301.2,325.5,344.7,371.6,379.0,377.4,368.2,349.4,337.5,303.2,289.0,272.5,244.1,243.5,250.3,250.1,263.4,275.9,286.5,311.1,316.1,335.7,333.4,326.7,328.4,315.9,310.3,298.3,291.6,278.8,274.4,287.0,289.6,313.9,328.7,336.5,339.8,345.7,341.5,332.8,308.1,283.7,266.3,245.1,247.8,239.3,224.8,235.5,263.0,284.5,313.4,335.9,357.3,364.2,378.7,388.6,365.2,343.3,334.5,308.7,288.1,265.2,235.3,224.8,230.9,225.4,237.5,270.7,287.4,308.1,318.1,349.3,339.5,355.1,342.7,327.9,322.1,299.1,294.3,274.0,279.2,275.8,273.1,291.3,301.8,303.6,310.4,315.6,319.5,309.9,303.6,286.9,286.2,261.8,266.1,258.6,244.7,266.1,263.4,279.7,304.7,332.7,344.8,364.7,370.4,380.0,368.6,354.6,313.7,294.5,271.6,245.7,229.4,217.0,213.5,220.0,241.9,271.4,289.4,323.8,336.4,361.9,357.1,371.1,354.5,357.5,339.0,302.5,287.0,285.3,267.9,258.9,267.1,260.9,277.9,290.0,294.1,310.2,328.2,317.5,316.9,313.6,299.5,281.2,276.4,275.4,266.2,262.6,269.6,298.4,302.8,320.9,345.1,360.3,366.5,357.7,359.6,342.1,305.9,283.8,272.3,247.9,237.8,220.9,231.9,228.1,251.9,277.3,289.0,327.2,342.3,374.8,379.2,387.4,367.0,354.8,339.9,319.4,293.8,265.9,253.8,248.9,239.7,237.5,255.5,271.8,288.8,303.6,320.4,333.7,325.4,334.1,320.7,307.9,294.2,298.0,276.0,272.4,288.4,283.5,289.0,303.8,322.0,331.9,344.4,350.3,326.9,316.4,301.4,298.7,263.8,250.9,230.4,242.5,233.0,245.9,258.8,271.4,314.4,328.1,357.3,377.6,381.1,373.3,370.3,353.3,340.0,306.4,280.3,259.1,247.0,226.9,218.5,225.2,248.3,274.2,291.5,305.5,334.9,339.0,351.7,342.1,342.7,333.0,315.4,310.7,300.5,278.1,271.1,269.4,271.3,297.0,302.3,303.8,325.9,324.0] },
    { id:39, biome:'fantasy', seed:24075, roughness:0.55, points:[305.8,320.8,330.2,348.5,348.4,346.1,344.7,335.6,323.2,308.7,292.1,278.1,267.1,257.5,266.6,261.1,278.8,287.8,304.0,312.1,321.3,326.8,324.8,318.0,307.9,299.5,291.9,286.2,291.1,289.8,287.6,295.7,296.8,310.3,316.1,323.3,327.7,326.6,324.6,310.7,301.1,287.9,277.7,255.3,251.6,260.7,256.0,276.2,289.9,309.3,315.4,332.5,352.4,348.5,356.9,350.5,328.5,324.5,302.4,288.6,274.6,259.3,249.9,255.1,255.1,271.7,279.1,295.2,309.9,322.8,335.6,333.7,331.3,324.6,325.0,309.2,294.8,288.7,279.2,287.8,286.0,289.2,301.4,298.2,307.1,320.7,312.7,320.4,314.2,296.2,293.4,281.3,275.5,267.6,270.7,272.9,279.8,293.1,308.8,319.1,326.2,341.0,343.5,344.0,336.0,332.0,315.4,300.6,274.4,267.7,254.0,246.3,252.0,259.4,269.2,285.7,301.2,309.4,323.4,342.6,345.3,342.7,335.6,329.2,313.3,303.9,297.1,281.7,269.1,273.8,278.4,282.1,293.6,303.4,308.0,313.6,319.8,310.8,306.9,296.7,301.9,285.0,277.5,280.1,284.1,282.1,289.6,305.6,308.6,319.7,331.1,335.4,336.0,338.8,320.5,313.1,301.9,274.1,271.9,249.1,249.3,253.8,253.7,266.9,279.2,296.8,319.4,333.7,346.4,352.3,345.2,341.8,333.8,315.0,298.7,285.8,270.1,264.0,256.7,255.4,261.5,279.4,289.6,295.5,307.9,318.3,315.1,325.4,322.7,318.0,307.5,299.9,295.2,291.0,284.8,287.7,301.6,309.2,313.5,317.6,326.7,320.6,323.4,317.8,304.6,298.5,277.1,270.0,257.0,256.9,262.9,267.3,271.6,291.1,298.7,317.5,333.0,348.4,358.4,352.5,352.4,335.9,323.3,306.8,287.0,273.0,257.5,257.5,247.6,262.4,270.6,275.8,289.2,308.0,325.5,329.0,337.0,331.4,321.8,312.1,310.9,303.3,290.9,280.1,281.7,282.7,294.3,294.6,306.3,309.3,310.9,314.4,309.0,302.9,307.1,287.8] },
    { id:40, biome:'grassland', seed:1539, roughness:0.86, points:[294.2,313.5,339.0,346.9,342.9,338.6,323.4,304.7,294.0,272.5,273.7,265.3,268.3,281.2,290.7,305.8,318.1,313.6,321.1,307.7,306.2,294.5,294.1,291.5,286.1,293.8,300.1,317.4,320.9,321.7,323.9,307.6,298.0,284.7,279.0,262.9,260.7,262.7,273.0,290.4,316.0,328.8,335.9,345.4,347.2,337.8,314.6,297.0,276.5,271.5,264.1,254.6,265.9,275.9,297.0,304.0,317.3,329.0,332.7,328.8,310.4,305.2,298.6,286.3,286.6,288.0,289.9,301.2,306.3,317.0,313.3,303.1,302.7,292.2,282.0,267.8,267.4,271.1,289.5,305.4,321.8,335.4,336.6,340.2,341.3,329.1,302.2,292.8,270.5,261.0,255.7,258.9,265.9,287.1,298.5,315.8,331.0,335.3,341.4,333.8,313.0,299.7,291.8,282.4,277.3,283.1,286.0,288.0,298.9,314.1,309.2,309.7,305.1,293.9,290.7,280.1,285.3,284.9,296.9,308.2,311.9,321.5,330.9,338.6,320.9,311.6,296.5,285.6,269.2,253.4,251.2,258.7,278.5,298.6,314.4,328.1,338.4,341.8,337.1,335.2,311.9,291.3,285.2,276.1,265.2,271.6,272.9,289.1,303.4,312.8,313.4,315.9,313.2,311.3,299.8,291.3,284.8,293.6,291.5,298.5,315.7,318.8,324.9,322.4,315.2,303.5,287.7,274.8,264.3,259.5,258.2,273.2,286.9,298.5,320.1,341.5,340.7,344.9,337.5,326.6,306.9,281.0,265.9,263.3,252.3,259.5,270.8,286.3,309.8,315.5,326.9,327.2,319.7,317.0,305.0,295.5,294.7,288.4,292.3,291.2,298.7,307.7,313.5,316.6,307.7,297.8,290.2,279.4,274.0,274.2,278.4,279.8,295.8,306.8,329.2,340.3,345.0,341.5,332.1,318.2,296.0,271.8,263.9,259.3,254.1,263.3,278.1,291.2,318.0,331.2,341.5,343.0,328.2,319.5,309.5,297.8,282.2,275.3,281.6,285.2,292.0,301.9,305.2,306.0,312.1,301.6,299.3,297.1,290.6,278.6,278.9,285.4,294.8,308.9,320.9,330.4] },
    { id:41, biome:'desert', seed:84523, roughness:0.25, points:[309.1,333.4,343.5,365.2,380.2,374.0,375.1,358.1,334.2,315.7,302.2,288.1,263.8,254.1,233.1,236.3,255.0,266.9,275.3,289.6,314.5,327.6,317.5,328.8,336.1,320.7,311.8,315.1,298.2,279.9,271.6,271.1,290.8,292.9,295.8,313.3,326.5,322.8,331.2,336.2,347.2,334.6,314.0,300.6,286.3,257.8,239.6,230.8,223.5,238.5,254.1,263.1,285.6,314.3,331.0,353.6,371.4,382.4,378.4,370.3,365.0,340.3,316.1,300.2,264.7,254.9,232.1,237.6,232.3,240.2,237.6,274.0,286.8,306.4,317.7,330.1,340.7,349.9,341.0,342.4,332.2,318.7,300.8,286.4,280.2,278.1,271.4,276.0,291.7,300.2,313.3,321.5,315.4,322.4,313.1,323.7,294.8,286.1,285.2,262.2,247.8,258.1,256.9,254.5,272.8,285.8,316.2,337.3,354.1,362.0,375.9,369.7,359.1,348.6,335.5,321.7,294.3,259.8,241.3,231.9,216.5,212.7,237.2,235.0,255.2,283.2,314.0,338.5,343.6,357.7,375.1,358.0,364.6,345.7,327.7,305.2,281.3,284.6,264.5,258.9,256.5,270.3,267.6,284.6,304.2,302.0,310.2,314.5,324.0,312.3,309.4,303.8,292.2,268.2,262.9,268.9,278.8,285.0,286.9,296.4,315.7,340.3,349.5,349.0,353.9,346.6,352.9,333.2,301.9,287.3,267.2,240.2,234.4,229.1,230.7,224.3,236.8,268.6,284.0,320.0,329.7,363.0,371.7,387.0,366.3,365.0,358.4,326.3,303.8,281.5,260.1,251.1,252.5,246.6,251.7,256.0,263.6,283.3,301.5,308.1,317.9,324.2,339.4,327.7,311.4,318.8,310.5,298.9,284.4,278.9,271.1,284.5,288.3,312.7,315.0,325.9,328.4,332.2,335.7,342.5,327.2,300.9,293.4,278.4,247.9,232.2,238.8,233.7,231.7,245.1,267.6,286.5,324.3,348.9,365.2,372.7,386.3,377.0,373.2,358.6,320.9,312.5,286.8,266.7,251.3,229.7,231.9,221.2,231.7,256.0,272.9,295.5,306.7,328.3,351.6,352.0] },
    { id:42, biome:'alpine', seed:4332, roughness:0.26, points:[298.9,319.6,323.6,338.5,332.7,329.6,317.8,304.2,292.7,274.6,273.6,277.4,275.4,284.8,302.2,309.7,311.9,316.7,307.5,309.8,300.2,291.1,288.0,288.1,298.7,304.3,311.9,316.2,315.2,314.5,308.1,293.3,283.5,273.0,271.6,270.7,271.6,284.1,298.8,315.5,331.0,336.2,336.6,327.6,320.6,303.8,281.3,271.5,263.8,262.9,271.5,280.6,300.5,312.2,317.7,321.8,322.9,316.8,312.0,294.9,288.5,292.0,285.8,293.7,302.0,306.0,307.7,310.1,308.1,299.8,290.6,281.7,275.2,273.3,277.7,290.6,307.2,320.0,329.9,334.4,335.8,322.7,315.0,298.0,280.6,270.2,262.1,259.5,274.0,286.3,294.4,311.1,325.7,331.7,331.4,324.1,316.5,300.8,291.4,285.5,282.3,286.7,287.6,294.4,303.5,304.3,307.2,302.3,298.0,290.6,291.8,282.2,287.1,295.1,298.8,314.1,317.8,328.4,322.8,320.1,314.3,295.9,278.9,269.8,265.0,263.4,268.8,283.6,304.2,319.8,329.6,338.3,332.1,324.4,317.2,298.3,290.0,274.8,274.3,272.2,280.0,287.9,302.0,311.2,316.7,314.6,311.2,302.5,301.1,289.2,286.5,287.3,293.9,304.4,310.1,312.4,323.2,316.4,309.9,300.9,282.2,272.6,271.0,267.8,278.7,292.2,298.4,316.7,330.3,340.7,340.7,325.3,313.6,298.5,284.3,271.0,264.0,266.2,270.4,281.4,298.9,310.0,320.3,319.1,321.2,315.7,309.1,295.5,291.4,289.1,294.2,296.2,297.8,303.6,309.0,312.3,307.2,298.9,293.9,280.1,274.8,277.1,281.7,288.1,300.6,315.1,323.6,337.0,334.8,323.3,310.2,298.0,281.8,274.2,263.8,262.7,272.2,285.2,294.7,308.8,322.5,332.5,332.3,325.7,309.3,300.0,289.4,288.0,279.9,283.7,285.3,300.7,305.2,306.1,307.0,308.8,301.3,296.1,287.8,282.4,285.7,296.7,300.2,309.5,316.9,323.5,325.4,319.2,306.1,297.5,282.6,274.3,261.6,264.1,270.7,286.3] },
    { id:43, biome:'volcanic', seed:49061, roughness:0.49, points:[299.7,325.5,345.3,366.2,355.7,353.9,337.2,307.9,282.3,268.4,261.8,253.8,255.4,272.1,290.9,305.3,314.9,323.2,316.8,310.4,312.1,300.6,282.1,290.7,283.8,291.4,302.8,323.3,331.0,339.9,329.3,308.8,304.2,285.3,255.7,242.1,239.6,255.1,266.3,296.5,325.0,349.4,354.2,363.2,351.9,341.5,311.4,293.8,268.0,243.5,232.1,244.8,250.9,271.7,292.3,327.7,334.7,340.7,345.5,325.9,313.5,300.1,294.1,283.8,274.0,287.3,290.5,314.8,314.9,324.3,316.6,307.8,287.3,276.6,257.0,252.4,256.3,280.9,298.4,320.2,340.3,346.5,362.0,361.6,349.8,318.3,297.3,265.6,247.1,233.9,233.6,249.2,264.9,298.1,324.6,337.5,358.7,351.0,343.1,328.3,314.2,293.2,274.1,275.3,264.1,281.0,290.1,294.6,318.7,309.8,321.0,301.6,301.0,286.9,285.4,279.6,278.0,290.3,299.3,325.6,343.8,348.2,351.0,339.5,315.8,294.2,281.9,255.5,234.4,234.3,242.8,271.3,285.7,312.6,334.2,355.7,362.4,355.5,345.8,324.9,293.3,272.0,265.9,250.9,249.2,258.4,288.0,306.4,311.7,326.6,333.6,313.8,310.7,296.9,295.3,280.4,285.1,286.6,297.8,310.9,325.2,328.1,324.6,316.7,297.8,285.8,269.8,256.3,246.7,245.3,267.7,279.4,312.2,339.9,363.1,357.5,364.3,354.4,331.3,293.9,267.2,254.4,246.9,241.9,254.6,263.3,292.2,307.6,328.0,343.7,334.8,339.9,317.2,305.0,291.5,289.2,281.1,288.5,297.9,299.4,306.3,320.7,317.7,313.7,303.2,289.8,273.7,268.5,257.0,267.5,286.1,310.4,321.4,347.0,364.9,352.9,356.8,331.7,301.9,273.7,246.7,238.4,230.8,247.1,257.1,278.1,316.8,328.8,347.5,346.9,343.4,343.0,318.4,299.5,287.8,268.0,267.1,265.6,273.6,298.3,313.0,319.7,322.0,313.2,298.0,296.1,282.1,282.1,282.5,290.9,297.7,311.7,337.4,348.4,354.5,347.0] },
    { id:44, biome:'arctic', seed:73544, roughness:0.45, points:[292.7,338.5,352.9,387.5,401.4,391.9,388.6,380.7,331.8,316.3,278.0,261.9,229.8,218.1,231.9,225.5,239.5,260.8,284.8,310.9,339.8,348.1,328.6,331.1,327.8,304.3,286.8,274.5,287.6,262.6,285.9,274.0,287.7,303.5,340.4,353.2,351.2,338.9,336.9,324.5,308.5,277.6,268.1,224.6,217.7,221.0,206.6,224.2,266.8,296.4,321.1,337.3,378.7,400.8,412.2,408.9,383.0,362.5,323.4,303.8,262.6,234.0,215.2,199.3,215.3,215.3,249.3,280.3,291.5,310.9,340.5,371.1,361.4,359.2,352.3,325.3,314.6,294.5,274.3,270.5,264.0,258.9,269.5,283.5,299.4,321.3,341.0,336.4,340.7,318.0,315.1,293.2,261.4,239.2,238.2,247.2,243.5,249.3,284.5,288.6,320.6,367.1,365.2,383.3,382.7,388.8,377.8,350.2,321.6,272.7,242.0,229.3,198.0,186.2,211.2,230.1,258.2,268.5,308.6,332.4,365.3,388.9,390.7,380.9,370.1,359.3,327.2,292.4,286.1,257.0,241.5,259.1,258.2,254.4,294.7,307.0,319.1,316.1,333.4,331.4,303.1,293.5,277.2,280.4,269.1,264.9,253.8,266.7,278.5,311.5,316.7,356.6,354.1,364.4,362.7,358.9,334.8,328.2,281.3,271.0,229.1,219.5,212.3,195.3,218.5,238.1,260.4,306.0,320.0,355.8,374.2,401.4,399.2,382.2,370.9,337.4,323.8,296.1,254.7,236.7,228.1,228.1,223.8,257.3,265.5,293.2,320.7,333.8,348.0,336.0,335.4,336.4,316.7,300.9,298.0,287.0,284.6,283.8,285.8,291.4,304.4,323.6,352.9,358.8,341.1,346.6,321.4,302.0,274.7,266.3,234.1,215.9,208.4,211.4,221.6,254.8,286.1,322.2,353.3,374.4,403.1,393.4,409.5,380.1,353.6,321.7,293.3,267.1,247.1,205.7,198.7,209.2,206.3,228.3,252.4,290.3,325.1,341.5,368.3,370.0,370.6,353.6,347.2,321.3,287.4,292.1,275.8,273.1,276.8,267.3,288.2,293.9,313.3,335.5,323.4,339.8] },
    { id:45, biome:'forest', seed:84258, roughness:0.22, points:[295.8,319.6,331.5,345.6,355.0,369.2,357.7,367.1,351.4,329.7,314.7,303.2,279.7,267.5,256.7,251.1,251.1,257.2,265.2,271.1,282.4,289.6,299.7,317.9,316.8,333.4,334.3,325.0,311.7,320.7,300.4,305.4,297.5,280.8,275.9,279.9,278.5,300.6,306.2,309.5,318.2,327.8,334.8,335.3,332.7,322.9,321.1,306.6,294.3,277.8,268.9,264.8,242.7,244.6,236.0,252.7,262.2,271.4,282.3,313.2,327.4,342.7,348.0,370.8,360.8,367.5,359.1,341.5,324.1,310.5,300.8,279.6,262.4,254.2,247.1,237.1,236.8,253.9,251.7,269.6,286.8,304.9,310.3,332.2,338.1,345.2,342.6,330.7,326.5,319.5,315.8,292.6,287.5,289.5,283.3,282.1,282.1,282.9,293.6,298.0,302.1,311.6,324.8,321.5,316.7,317.3,305.8,303.7,286.3,276.9,261.3,254.7,258.6,255.2,261.7,274.7,286.0,294.1,313.8,319.4,334.2,351.0,357.2,362.6,357.4,354.7,335.9,329.7,299.9,290.5,261.1,249.1,245.4,240.9,235.7,238.4,247.5,254.0,269.8,299.7,301.7,331.0,347.0,341.9,359.8,363.5,359.9,351.5,329.2,314.2,305.8,283.9,284.7,270.4,270.3,264.3,268.4,280.7,278.4,294.1,303.4,307.8,308.1,316.7,316.8,320.7,301.3,309.7,299.0,284.5,286.5,278.6,274.0,276.5,284.5,284.7,298.9,305.5,326.4,336.6,340.7,353.6,346.6,353.7,340.2,334.3,313.4,296.7,277.0,270.8,258.5,240.1,231.8,237.2,232.4,252.5,266.4,288.9,307.5,310.3,340.2,356.5,366.6,362.0,359.2,351.3,352.3,330.0,325.0,300.0,293.7,263.6,261.0,247.7,253.0,260.0,250.1,271.0,278.4,287.3,308.7,309.0,325.2,330.6,320.9,317.4,320.8,311.5,298.0,305.7,294.9,279.5,287.0,286.8,282.6,289.4,299.7,317.2,313.3,326.9,326.2,340.3,327.1,321.6,323.8,313.9,290.8,274.5,270.7,252.0,250.9,249.4,240.9,241.0,260.9,268.3] },
    { id:46, biome:'coastal', seed:47192, roughness:0.28, points:[304.3,334.6,359.5,390.9,410.3,391.5,385.6,354.5,311.9,281.4,265.7,225.7,220.9,222.4,239.2,252.3,285.4,301.6,340.7,346.4,334.3,336.7,321.4,317.3,292.4,268.8,271.1,289.0,276.9,293.1,326.5,341.7,356.8,363.6,354.4,318.3,295.0,268.2,260.1,239.3,211.3,202.8,222.2,250.5,287.1,305.9,349.7,382.1,395.7,397.1,405.6,366.8,338.7,309.0,273.7,228.5,219.4,193.4,217.2,240.1,263.1,297.5,317.8,342.8,360.1,376.1,355.3,347.9,326.8,314.4,275.0,275.3,278.9,258.6,281.6,290.8,306.6,325.9,337.5,333.7,314.3,309.2,292.8,257.3,240.7,235.4,223.9,237.2,270.9,299.4,330.0,357.7,373.6,391.3,392.0,388.3,350.0,324.1,273.8,237.2,221.0,191.5,205.9,197.8,215.9,261.9,286.4,320.7,365.6,384.7,399.5,367.7,360.9,345.0,301.8,272.8,251.5,259.9,240.8,254.4,277.5,291.2,296.3,325.3,318.5,314.6,318.3,300.8,284.6,268.0,264.4,258.9,272.8,266.1,298.8,310.1,336.9,373.2,383.7,361.7,355.3,339.7,319.9,264.7,233.5,211.7,208.6,205.6,222.2,245.6,264.4,322.5,361.2,378.6,391.5,394.5,403.4,372.4,325.2,301.5,276.4,235.5,231.8,234.0,219.9,241.5,267.0,296.6,325.6,325.5,347.3,332.6,342.2,326.0,293.8,298.2,280.2,277.2,289.7,292.7,310.7,315.6,336.5,352.7,363.9,335.1,320.1,289.3,268.2,249.6,220.6,210.4,219.3,227.6,253.2,278.9,321.1,361.8,379.0,391.4,394.4,379.4,363.3,323.4,287.1,257.4,238.1,221.5,207.7,203.5,235.2,262.3,293.6,326.4,335.8,361.8,363.5,365.1,344.8,310.7,299.8,272.3,268.2,261.7,281.4,284.2,297.9,306.6,316.5,339.1,323.2,327.1,308.4,276.1,250.3,246.7,229.5,229.9,252.0,283.5,290.8,336.8,373.0,393.5,403.5,394.6,373.0,344.8,311.4,262.4,237.2,218.1,202.2,188.8,224.9,226.5] },
    { id:47, biome:'wetland', seed:91853, roughness:0.42, points:[289.7,334.7,341.8,358.8,385.3,390.2,372.1,361.4,346.2,320.2,299.9,277.4,253.3,245.3,236.3,241.0,245.5,263.9,269.7,293.8,308.5,320.6,320.3,335.8,321.1,322.2,314.5,308.5,291.3,287.2,276.2,271.3,290.7,298.3,298.0,309.1,320.5,338.9,349.9,337.0,342.5,324.3,307.4,285.0,283.2,259.8,245.0,239.7,229.4,233.7,250.9,274.8,283.5,318.4,348.1,363.2,376.6,391.4,372.4,381.5,362.2,335.7,320.6,276.2,271.0,245.7,230.7,228.9,216.8,226.4,250.2,276.6,284.5,321.5,333.8,354.3,346.3,354.0,336.9,339.1,314.9,303.8,287.1,281.3,273.2,269.7,277.2,293.0,292.4,306.2,314.1,321.3,324.2,317.0,319.3,314.5,301.6,276.1,276.5,248.3,248.4,246.6,260.0,265.5,279.6,290.9,326.2,333.5,353.9,365.4,366.2,376.4,360.6,346.7,323.8,304.9,265.0,250.3,221.6,214.0,222.7,216.4,235.1,260.1,269.9,306.2,332.7,350.6,359.1,359.5,378.2,368.4,339.8,324.6,321.5,295.4,275.2,271.4,262.8,255.1,273.5,273.6,289.7,292.3,299.6,324.2,322.9,323.4,312.6,317.3,289.5,283.1,279.3,263.5,274.6,268.1,283.9,293.1,303.2,330.5,332.5,340.9,364.4,357.5,355.8,346.9,321.8,298.6,288.7,262.9,240.3,228.5,215.5,218.0,228.4,238.8,263.8,288.2,319.6,338.2,366.8,377.9,388.5,375.5,373.2,342.4,324.0,301.5,290.5,254.5,257.0,237.4,239.7,247.2,247.9,275.9,287.4,306.1,318.2,333.1,332.0,330.0,317.4,326.5,308.8,299.3,285.7,274.2,279.8,272.6,286.0,292.2,306.2,316.3,338.1,336.4,334.7,332.2,338.3,319.7,306.6,272.7,252.5,238.9,225.9,221.0,224.5,244.2,267.0,274.7,311.4,325.2,356.8,377.6,387.7,383.8,374.7,359.3,349.4,319.2,291.6,262.0,254.3,237.7,232.4,217.6,240.2,246.6,266.9,279.0,306.5,329.4,341.3,356.8,344.0,341.9] },
    { id:48, biome:'urban', seed:14764, roughness:0.81, points:[311.4,338.4,380.1,414.9,415.7,383.9,351.7,296.2,269.7,210.3,211.0,208.3,243.9,259.4,315.7,323.2,360.9,337.7,330.4,320.5,275.8,283.7,267.9,277.3,293.6,312.9,343.3,359.0,351.8,337.2,314.2,274.1,242.0,212.4,193.4,227.5,248.5,293.3,349.7,384.5,428.7,417.6,393.8,357.5,320.7,247.1,213.0,190.8,200.2,201.1,235.0,289.8,344.8,354.3,384.5,381.3,343.7,335.7,280.4,259.5,277.4,254.3,296.0,317.7,337.4,332.7,324.6,320.3,279.0,275.2,236.8,227.6,236.4,245.3,283.9,325.3,359.1,408.2,425.6,402.1,379.2,313.0,248.9,210.6,185.1,176.7,208.3,246.1,292.0,342.0,387.1,407.3,400.1,368.3,340.8,306.7,286.2,238.2,242.1,234.0,267.4,281.3,309.8,330.7,338.2,308.3,315.8,263.7,247.4,257.9,254.2,287.6,311.2,343.3,386.6,376.9,379.4,354.6,320.7,278.5,218.8,194.4,191.0,188.4,219.9,285.5,330.5,366.1,396.3,410.4,419.2,375.3,317.9,271.3,228.0,212.5,203.8,217.4,255.8,283.0,334.1,342.5,356.6,345.8,315.4,287.6,293.9,284.0,286.0,287.7,300.7,348.2,345.5,352.3,346.2,312.9,293.3,242.9,221.8,202.2,218.6,217.3,260.3,323.6,352.8,418.3,417.3,407.7,392.3,329.6,294.5,240.0,208.8,187.0,187.6,222.7,255.7,319.2,350.3,371.0,362.7,356.1,341.0,315.1,281.9,280.0,269.3,283.6,306.2,319.3,343.0,323.7,323.9,297.5,275.9,246.1,238.6,214.4,233.9,268.0,294.1,351.8,400.4,415.1,393.7,382.9,354.4,284.8,224.2,203.1,166.4,185.9,199.4,253.5,294.4,345.2,396.9,408.7,403.4,363.1,332.4,288.4,252.0,236.1,252.4,263.9,280.2,301.9,323.3,337.6,331.5,310.3,290.7,253.4,265.4,268.8,262.3,294.7,327.7,374.6,374.4,403.5,370.5,343.5,309.5,242.5,216.4,178.2,197.4,200.1,251.7,297.7,353.6,390.2,417.8,401.5] },
    { id:49, biome:'fantasy', seed:7095, roughness:0.99, points:[295.7,317.8,327.6,333.3,337.0,327.4,315.9,309.4,288.3,279.3,277.8,271.1,274.1,285.6,298.5,307.8,309.2,314.9,311.1,308.4,299.2,293.5,288.1,288.4,289.2,297.2,305.8,310.2,318.5,319.2,316.1,306.1,294.5,283.6,277.3,268.7,271.2,272.0,286.3,298.3,309.0,322.1,335.6,336.1,328.3,322.2,309.3,296.3,283.3,267.4,266.5,265.5,277.8,288.8,298.3,310.5,317.3,320.6,324.6,319.2,304.5,301.5,289.8,287.2,293.1,296.8,301.2,300.7,309.5,314.0,305.8,302.5,291.0,288.7,278.7,279.7,278.7,284.0,296.8,306.7,318.2,329.1,336.6,329.8,327.3,308.6,291.4,282.3,269.4,267.0,266.9,272.1,284.2,300.6,309.1,325.7,333.5,329.7,328.2,320.7,306.2,291.1,285.1,286.0,279.9,285.5,295.3,303.0,302.1,309.5,305.3,305.6,298.1,289.0,290.3,283.3,288.0,290.5,305.5,309.5,321.8,322.5,328.8,323.9,308.9,295.3,282.4,274.0,267.8,261.3,266.6,279.5,290.7,312.6,322.7,335.8,340.1,333.8,327.2,308.3,293.6,281.9,278.4,269.7,278.9,283.9,290.8,305.1,311.9,311.4,315.2,312.3,302.4,298.5,290.6,291.9,294.7,292.2,302.3,312.3,312.1,315.5,318.8,308.6,298.4,286.7,283.8,270.5,267.8,269.3,278.9,295.4,311.0,321.5,331.6,336.1,338.5,330.8,317.3,303.3,287.4,271.8,270.8,267.4,272.3,287.5,293.9,312.2,316.9,325.0,322.2,320.1,309.3,299.6,293.3,287.5,284.8,287.1,295.9,302.0,312.5,310.9,311.3,308.1,294.0,285.6,284.8,280.1,274.3,283.2,289.5,303.2,320.6,331.4,335.1,330.4,322.7,318.1,299.9,287.8,268.6,260.9,258.8,268.4,280.6,290.1,311.5,319.6,324.1,333.4,328.7,315.7,311.6,296.3,285.1,280.0,282.6,282.2,288.9,296.0,303.3,308.0,308.5,307.8,296.5,294.4,289.2,285.9,283.7,287.4,298.6,306.8,320.2,327.5,324.9,327.2] },
    { id:50, biome:'grassland', seed:36170, roughness:0.83, points:[290.8,323.8,340.4,373.0,368.9,371.7,378.9,356.3,336.9,318.7,290.2,279.6,249.7,252.4,246.2,246.3,253.0,270.6,277.2,292.2,310.4,327.7,330.4,326.2,320.5,316.5,320.7,310.7,285.4,278.8,283.7,271.4,284.0,299.3,300.4,316.2,321.0,341.9,339.5,345.0,327.0,318.1,303.6,286.3,262.6,243.0,245.7,228.1,245.8,249.7,257.2,282.3,315.7,330.3,344.7,370.2,374.7,380.8,365.3,359.6,334.9,318.5,284.6,263.5,243.8,241.3,225.6,229.6,245.2,262.1,272.2,295.7,304.8,336.7,338.4,347.6,350.2,349.8,335.4,321.7,298.3,291.7,285.1,272.8,279.5,271.7,285.4,301.3,311.1,316.3,315.5,333.2,321.6,317.4,304.0,290.7,282.6,265.5,259.0,242.5,253.5,261.4,274.8,288.8,312.8,320.8,349.7,357.4,371.4,364.9,368.6,352.5,322.5,313.9,284.7,253.2,237.7,235.0,212.1,217.7,236.6,249.8,266.6,289.1,315.1,334.7,352.9,371.7,373.1,363.0,343.3,333.1,310.4,301.9,279.2,273.6,257.9,263.6,264.4,264.0,282.1,298.5,308.9,310.5,318.0,314.1,310.4,314.3,288.9,289.6,268.4,266.7,261.5,276.6,287.7,294.6,312.0,312.2,340.7,339.5,351.7,360.4,358.3,341.1,329.4,299.7,276.1,256.3,247.8,221.4,230.9,230.7,232.5,264.8,281.7,306.7,318.8,357.2,371.5,373.3,372.0,361.4,360.2,331.8,319.6,291.3,272.6,255.6,252.3,249.5,250.5,257.5,271.7,287.8,300.8,320.3,321.5,324.7,335.4,322.4,322.7,310.5,300.1,287.0,289.8,272.8,282.1,291.1,299.0,301.0,310.8,327.4,334.8,342.3,336.3,336.2,323.9,303.6,287.1,269.9,256.5,233.5,234.1,246.3,240.8,273.7,288.5,314.4,341.1,355.7,368.0,374.1,374.7,375.7,357.9,329.3,317.2,295.4,269.9,241.4,228.1,226.6,237.1,244.2,255.2,273.1,295.6,319.3,335.7,347.1,343.6,340.3,341.1,328.2,322.3,299.0] },
    { id:51, biome:'desert', seed:62746, roughness:0.56, points:[292.0,353.9,380.0,417.1,415.4,412.6,378.2,334.1,278.1,242.0,212.9,225.2,214.6,241.9,266.8,313.9,339.7,341.1,341.7,347.3,331.6,298.9,275.8,265.3,268.7,288.2,317.0,331.4,349.7,349.8,350.6,335.6,307.5,291.4,257.1,224.5,207.3,207.2,235.4,248.5,320.4,353.0,402.5,410.3,409.6,397.2,374.4,316.1,284.6,215.7,207.0,184.5,204.5,238.6,255.8,311.6,329.2,354.3,373.9,383.6,354.0,332.2,298.6,261.9,250.4,265.3,288.9,285.1,324.1,336.5,334.9,325.3,317.2,298.7,275.5,227.9,231.6,214.2,253.9,270.2,322.1,337.5,384.6,391.7,403.5,392.9,351.9,309.7,256.9,230.8,191.6,192.5,194.7,227.9,269.1,312.3,340.4,399.3,395.1,407.9,389.9,357.0,308.4,266.1,262.7,246.0,257.0,272.3,288.3,316.3,325.5,321.2,333.3,325.3,283.6,277.3,268.9,261.7,272.6,291.8,301.0,345.6,381.6,370.0,388.8,370.8,343.4,311.2,253.7,224.5,193.3,174.2,210.1,235.0,255.8,311.8,359.1,409.9,426.7,416.0,400.2,336.2,298.7,271.5,220.4,218.3,221.2,227.1,258.9,291.5,312.8,335.5,346.7,354.5,324.5,311.3,276.8,267.9,269.5,287.4,281.5,326.5,339.6,352.3,350.4,366.3,335.4,285.8,270.3,224.8,198.2,192.7,208.5,235.8,285.1,315.7,378.0,415.5,426.1,402.6,392.3,343.4,305.8,245.6,216.5,194.9,187.1,201.1,248.7,280.2,325.2,344.5,364.3,384.5,373.1,346.2,313.9,279.2,270.1,273.6,267.8,270.2,287.9,315.0,345.1,333.0,326.6,298.5,293.7,258.0,234.7,225.2,222.3,250.4,299.8,313.5,367.6,387.7,398.7,407.7,367.9,330.6,288.2,237.1,216.9,176.4,173.7,190.2,226.5,273.2,322.2,368.5,400.5,398.5,377.7,362.7,336.4,306.3,276.6,235.6,230.2,243.2,272.8,303.9,300.4,335.4,316.1,324.2,315.3,276.6,261.9,267.6,255.2,257.2,290.8,326.8] },
    { id:52, biome:'alpine', seed:45896, roughness:0.79, points:[287.0,361.2,389.2,409.7,422.3,392.8,347.6,294.6,253.1,238.6,206.3,222.3,235.0,262.6,315.1,339.8,346.2,349.1,337.4,300.7,274.7,284.1,269.5,280.7,295.3,323.0,346.7,372.7,370.9,342.2,313.9,283.5,236.5,205.5,194.3,206.4,254.2,291.6,336.7,366.7,421.8,434.1,407.8,367.5,320.6,265.2,238.0,207.2,178.7,199.3,230.3,287.8,338.7,356.3,385.1,376.0,363.1,332.0,288.3,264.0,264.6,266.2,283.9,309.6,315.6,319.2,337.8,323.4,291.4,282.1,254.4,233.0,239.3,226.0,263.3,303.6,349.9,400.6,415.7,392.3,386.4,334.0,293.2,238.3,197.6,167.4,179.8,199.8,254.7,322.4,345.5,387.9,390.2,406.0,379.0,317.2,298.4,254.2,252.6,236.4,262.7,289.8,300.0,337.1,321.4,322.6,322.3,288.9,259.1,254.7,257.3,276.2,287.4,318.9,360.3,379.3,396.1,379.7,339.2,293.0,247.9,209.2,177.3,180.6,212.4,244.2,284.4,361.3,401.0,421.3,423.6,382.6,351.4,297.6,257.4,238.5,206.5,208.0,221.7,270.0,313.3,335.2,350.7,362.0,346.3,298.9,293.5,287.9,259.8,261.0,287.0,309.5,331.0,366.2,363.9,353.2,325.6,277.7,235.8,200.2,209.6,197.9,250.2,289.7,320.0,371.6,407.2,415.7,407.1,380.8,329.6,283.8,240.0,209.4,192.5,217.7,226.7,285.1,325.4,349.3,379.0,377.1,346.3,342.1,297.2,270.1,266.9,270.0,271.8,295.9,306.0,323.1,350.8,312.0,307.7,286.6,242.0,225.4,220.4,224.5,258.0,323.1,346.9,398.8,400.5,419.2,392.9,333.0,295.5,227.0,191.7,166.0,184.6,202.1,247.3,313.8,366.5,389.5,399.2,394.3,377.1,322.9,304.3,265.3,238.5,235.4,266.9,282.1,288.6,313.2,343.0,333.7,324.5,299.0,260.2,269.3,239.4,273.6,296.3,318.8,372.9,370.5,383.0,387.1,358.4,310.4,248.2,220.9,188.3,178.2,189.6,250.8,288.4,358.2,392.2,406.4] },
    { id:53, biome:'volcanic', seed:34558, roughness:0.62, points:[307.1,311.6,337.8,352.0,357.2,367.2,363.8,383.1,377.6,376.5,371.3,372.8,356.8,358.0,336.8,320.2,307.8,289.4,277.8,277.8,260.6,253.9,238.1,240.0,239.9,249.9,247.0,237.2,255.5,251.7,264.1,270.6,290.0,302.9,318.2,309.0,314.8,333.0,322.8,330.9,337.2,334.9,334.0,321.4,308.5,302.0,301.5,286.2,298.2,291.0,283.7,279.0,284.7,274.0,285.2,284.6,291.0,292.2,311.3,309.8,318.9,317.4,335.6,326.3,331.1,348.1,344.6,329.0,345.1,320.3,316.6,308.9,299.8,284.9,284.9,278.7,258.2,246.5,236.3,234.3,233.3,229.3,242.8,246.4,251.8,262.9,261.9,279.7,284.1,309.7,311.6,342.6,349.1,351.4,364.4,373.4,381.4,387.6,375.1,373.4,365.1,359.8,347.0,335.6,317.8,316.6,288.1,273.8,268.2,258.6,249.6,235.6,220.2,221.6,214.9,217.7,238.8,235.2,240.4,253.9,265.2,288.7,291.0,317.3,329.5,321.6,343.7,346.2,351.3,346.7,342.7,340.7,334.6,344.8,341.9,326.0,309.6,303.1,290.0,292.3,285.2,272.9,275.8,276.9,273.8,266.2,283.1,275.5,279.2,296.1,299.6,311.4,303.0,311.8,323.3,326.8,324.2,332.0,326.6,311.5,306.6,299.8,304.0,289.5,288.8,279.2,268.5,260.5,252.1,248.9,243.5,253.8,251.5,259.5,272.8,275.2,278.4,301.9,302.1,320.0,340.2,340.2,343.0,358.0,373.6,372.0,369.4,380.5,374.0,368.8,348.6,343.7,325.2,322.6,313.8,292.6,269.5,253.3,244.2,239.2,222.9,230.7,221.1,227.0,230.4,225.3,243.1,243.0,261.7,262.2,278.4,289.4,312.7,336.4,349.0,356.5,354.2,364.7,360.2,371.6,367.8,357.3,354.7,357.6,333.1,337.7,308.2,303.4,289.1,280.0,272.3,272.9,262.1,261.6,254.2,259.5,267.2,274.2,264.0,283.0,280.1,289.5,292.6,312.0,312.6,305.0,319.9,323.8,315.3,330.2,327.0,308.5,297.9,310.4,300.0,298.8] },
    { id:54, biome:'arctic', seed:50118, roughness:0.64, points:[299.6,319.6,347.4,360.5,362.2,354.5,347.0,338.1,318.5,302.1,278.0,255.2,258.4,253.4,256.5,275.7,284.3,301.2,316.3,329.2,321.0,331.7,311.7,305.5,306.1,289.8,280.8,284.6,280.1,298.8,310.0,315.2,324.1,335.2,337.7,321.9,326.6,299.5,282.3,273.5,261.8,240.7,244.7,252.0,268.9,287.2,306.7,323.7,344.1,351.8,372.1,362.0,350.8,336.0,309.9,294.8,269.3,244.8,247.5,239.0,243.5,257.5,272.1,296.4,315.0,334.0,337.8,342.7,339.0,323.0,320.1,311.6,290.3,279.4,285.0,279.1,281.0,289.5,297.5,321.1,311.7,315.5,309.6,309.5,298.0,287.6,264.4,266.5,264.2,268.6,271.5,277.9,302.8,316.9,345.4,354.1,362.0,352.7,352.4,336.9,307.5,281.0,272.7,240.6,243.0,226.3,240.4,247.6,280.0,295.3,323.7,329.3,356.6,348.2,358.0,348.2,328.7,307.1,291.7,278.2,270.3,260.4,270.1,273.8,291.5,292.9,308.6,307.2,323.7,323.9,315.4,301.6,285.2,284.3,273.8,280.9,277.0,290.2,307.6,309.7,333.6,347.1,344.4,348.1,333.4,335.9,304.8,292.1,259.1,241.0,245.1,230.0,237.5,256.0,278.5,301.8,314.7,346.2,361.1,359.0,360.6,358.5,338.2,325.7,293.2,282.5,253.9,245.8,253.2,259.3,273.2,278.8,305.0,309.8,322.5,329.2,326.5,328.5,316.6,299.8,292.8,284.1,290.3,283.2,295.2,297.7,312.3,331.7,338.8,329.9,323.6,316.0,309.6,286.9,281.5,260.1,255.1,241.5,250.5,261.8,283.1,292.1,323.9,350.5,364.9,363.5,358.4,348.7,344.5,320.0,290.1,271.1,250.5,245.8,235.9,239.1,255.8,280.7,286.6,306.2,333.2,333.9,343.1,337.5,327.7,319.7,312.8,285.9,277.2,283.0,282.3,287.7,293.1,307.5,309.9,314.6,325.5,314.6,302.9,293.2,290.6,267.0,262.4,261.6,258.0,271.0,282.7,302.3,320.7,331.7,356.2,353.1,367.5,350.3,330.5,314.3] },
    { id:55, biome:'forest', seed:65590, roughness:0.71, points:[302.6,319.9,331.8,338.0,339.8,330.3,320.3,297.4,284.1,276.9,270.1,270.0,283.8,288.4,305.4,313.4,310.8,314.1,305.3,307.6,292.3,289.8,287.6,292.6,300.8,304.3,316.4,321.3,318.2,312.0,304.5,286.6,274.1,270.0,266.4,271.9,280.3,294.3,315.9,330.1,339.0,333.4,332.3,319.2,298.6,285.6,269.9,270.3,267.3,269.4,280.3,297.4,311.7,317.9,320.4,319.0,319.8,305.0,300.8,294.0,288.0,287.5,295.3,302.1,307.3,308.9,308.7,302.0,296.5,285.3,282.0,273.8,282.1,280.4,291.8,308.5,321.1,332.6,330.6,335.3,320.0,308.9,284.1,272.4,261.1,266.1,266.3,281.8,295.7,314.3,323.4,326.7,334.7,328.3,317.9,305.4,288.2,281.2,283.0,278.2,291.8,296.2,308.3,304.8,305.0,306.7,302.4,289.5,288.2,283.4,287.0,295.0,302.0,312.9,324.0,329.3,323.4,323.1,306.1,295.6,278.9,267.5,263.0,262.2,273.8,294.3,313.3,327.2,335.2,336.4,333.1,320.9,305.9,292.6,279.2,272.5,269.8,281.9,286.2,294.3,303.3,312.9,314.6,311.1,302.3,303.1,293.3,287.0,294.9,295.3,300.5,307.2,321.6,315.2,319.5,311.1,299.7,280.0,276.2,271.1,266.6,274.8,291.8,311.0,322.6,335.6,335.4,335.8,322.3,309.0,290.6,274.2,273.3,267.9,267.0,282.8,289.2,308.0,317.5,324.8,321.3,317.8,313.8,298.6,295.0,291.9,291.4,293.4,302.0,302.9,313.4,315.3,307.5,302.6,289.3,279.1,273.5,280.3,279.9,289.1,302.0,319.4,329.0,334.4,329.1,323.7,310.7,292.0,282.8,268.0,262.8,259.9,272.1,284.8,303.7,313.8,324.7,329.7,330.9,321.4,311.9,301.1,285.8,282.3,279.3,283.4,289.2,297.9,310.0,312.4,309.2,306.3,300.7,285.0,284.5,289.3,295.1,294.7,310.4,324.1,330.0,330.0,324.2,313.9,298.0,283.1,272.1,268.0,268.2,273.1,282.9,298.6,321.1,330.5,336.9,331.6] },
    { id:56, biome:'coastal', seed:96638, roughness:0.57, points:[307.4,323.2,344.1,355.0,361.5,356.2,344.3,340.6,310.2,289.9,271.4,264.4,248.7,245.5,250.2,274.0,282.6,291.0,312.6,323.9,322.7,320.8,322.8,307.8,297.9,283.6,291.0,282.1,282.4,288.4,297.9,316.3,319.8,330.7,332.7,336.7,328.6,308.2,298.3,278.2,266.3,251.6,243.7,250.5,265.0,272.0,291.8,318.1,349.8,361.1,369.5,365.5,361.0,337.2,310.4,293.1,265.6,252.4,235.8,234.4,250.3,263.1,274.6,286.4,318.3,325.1,339.3,347.6,336.6,324.9,314.3,313.2,293.5,277.2,288.1,283.2,283.4,297.4,309.9,317.8,311.5,312.5,315.6,316.8,294.9,284.8,275.0,260.8,259.8,261.6,273.3,287.9,302.9,325.2,336.3,348.9,367.3,353.9,352.2,344.4,324.2,294.1,278.1,251.9,235.1,235.8,229.3,242.0,267.7,282.9,309.4,335.0,347.1,355.5,360.6,350.3,339.5,313.0,298.5,278.8,273.1,275.3,269.7,270.4,277.2,287.2,296.1,317.6,322.8,312.2,307.5,302.3,291.7,285.4,271.3,265.8,274.0,286.3,298.7,304.9,327.7,339.4,344.5,353.4,352.3,333.3,320.9,302.9,282.5,257.7,246.4,232.7,241.3,250.9,260.9,284.1,312.0,340.8,358.9,362.7,359.1,358.6,343.8,319.4,296.9,276.7,270.4,259.5,253.1,247.7,260.3,276.7,291.5,306.1,315.9,320.3,322.4,320.9,310.3,311.5,297.0,292.3,276.0,279.7,286.5,295.0,315.3,315.5,329.0,338.8,337.5,322.6,311.5,295.4,287.5,259.7,248.5,249.2,251.1,250.7,268.6,288.3,314.2,326.4,350.2,354.7,363.5,355.4,348.3,335.6,303.5,282.2,265.5,254.2,238.4,235.6,254.5,258.8,289.7,302.1,325.1,330.6,332.4,347.5,334.7,328.9,320.6,308.0,294.4,286.6,284.6,281.6,290.2,295.6,300.1,316.2,326.1,322.2,316.2,298.6,294.0,286.5,272.2,269.2,266.9,260.6,267.1,288.4,313.2,325.0,338.4,356.1,356.2,351.8,349.0,329.0] },
    { id:57, biome:'wetland', seed:78428, roughness:0.43, points:[289.8,329.2,341.2,355.6,361.9,375.5,382.4,381.8,371.4,363.2,368.3,340.8,322.6,323.8,293.2,270.7,255.0,251.0,240.6,241.6,238.2,247.1,235.8,247.8,252.8,267.6,278.9,291.0,318.4,321.1,328.8,331.7,334.9,336.3,331.8,334.3,326.2,309.0,305.0,295.7,294.7,292.0,278.4,267.4,280.2,281.8,286.8,292.5,314.7,310.2,318.8,332.8,334.5,346.4,339.8,347.2,333.6,318.2,317.7,301.0,289.8,270.7,250.4,258.8,230.1,221.4,227.7,221.8,242.6,238.7,255.5,268.4,294.9,314.7,315.7,349.9,360.8,366.8,377.4,382.0,387.2,383.4,384.7,369.3,347.5,326.1,304.9,293.9,264.1,249.8,237.4,242.1,220.7,212.2,224.7,221.6,233.5,243.7,257.1,284.2,291.6,314.9,317.7,341.6,337.9,358.7,361.2,343.5,348.0,351.2,334.0,314.8,304.5,302.0,286.4,281.9,285.2,281.4,277.4,283.8,271.7,292.3,291.5,295.8,299.2,323.8,318.5,327.0,325.8,331.0,321.3,325.1,311.6,293.5,280.4,285.3,264.5,266.8,241.1,242.0,248.6,248.9,256.3,267.1,275.1,285.4,314.0,327.6,341.1,362.4,354.6,376.6,372.5,384.7,379.9,373.7,363.7,345.1,330.2,316.2,295.7,275.6,259.9,244.4,235.1,217.8,217.0,225.3,224.7,225.5,240.2,252.6,282.0,289.0,308.5,338.4,339.3,361.4,377.0,373.3,363.6,363.8,359.4,346.1,340.7,334.7,307.6,287.8,274.3,271.0,256.3,260.8,253.9,256.3,261.0,274.4,281.3,292.9,285.3,301.7,302.0,323.8,310.2,323.5,324.9,316.0,304.1,307.3,288.0,293.1,277.7,271.4,279.2,259.0,276.7,263.8,284.0,271.8,295.8,294.9,321.3,325.7,337.7,342.5,346.6,366.5,358.5,350.7,358.7,338.2,333.4,320.9,302.9,294.6,266.4,249.7,242.4,221.2,216.4,211.4,216.8,219.8,236.2,239.7,258.6,276.4,291.4,322.3,331.8,362.8,370.9,378.3,372.6,376.6,385.7,367.7] },
    { id:58, biome:'urban', seed:15151, roughness:0.59, points:[308.9,328.5,324.9,360.0,359.0,385.9,392.1,390.7,396.3,390.6,375.4,381.2,357.3,360.3,343.7,321.1,308.3,293.2,273.5,269.6,261.4,244.0,243.2,235.6,242.6,233.9,234.2,243.6,257.3,255.4,278.5,280.5,283.9,298.1,319.3,314.8,336.9,327.8,345.9,338.7,346.3,333.6,325.3,322.6,321.3,300.7,300.6,294.0,292.2,274.6,274.1,277.2,286.7,272.6,277.6,283.2,303.9,292.4,305.9,330.0,325.5,345.8,348.3,343.3,341.1,349.4,339.0,338.6,331.2,315.7,324.0,305.9,299.7,273.3,255.9,244.2,247.1,231.3,215.3,233.5,213.1,234.6,236.5,230.8,244.0,260.7,283.1,285.4,308.6,314.6,337.4,361.3,360.2,368.9,395.3,391.5,390.2,394.7,376.0,368.1,355.3,345.9,340.7,313.4,310.8,281.6,276.3,263.2,236.1,229.5,224.3,221.1,216.2,214.2,221.4,231.1,245.8,251.1,259.7,287.9,285.0,302.0,326.0,329.0,339.9,339.7,345.0,359.0,367.3,351.0,348.1,334.9,340.9,319.8,315.5,316.2,306.9,283.9,285.7,282.0,282.8,274.4,277.6,279.1,281.1,289.9,289.3,293.0,297.0,319.6,315.4,316.4,322.1,316.9,319.1,330.6,320.1,309.5,305.6,298.9,306.8,284.1,276.7,265.3,267.1,253.3,247.1,242.9,240.3,254.2,245.2,258.0,256.3,262.3,290.4,307.4,308.8,319.6,338.5,364.6,362.7,381.6,390.9,390.1,394.3,389.7,374.2,360.8,350.1,347.7,319.9,308.3,300.6,271.1,256.9,232.3,229.3,229.3,212.1,213.7,218.7,220.8,206.0,220.9,241.3,254.9,263.0,279.9,300.3,301.7,337.5,341.5,363.5,362.5,382.1,385.2,372.2,379.2,382.8,363.8,352.8,343.3,333.0,309.1,304.3,293.7,280.9,267.2,262.9,269.2,261.9,252.4,244.1,267.3,264.3,258.7,271.4,279.9,287.1,290.0,298.3,312.5,307.4,327.5,317.9,332.8,324.6,321.6,311.7,308.1,310.0,296.8,287.6,285.4,274.9,263.2] },
    { id:59, biome:'fantasy', seed:50075, roughness:0.68, points:[300.6,326.4,364.1,384.3,392.7,383.7,351.6,324.6,284.8,273.9,237.8,233.5,236.6,240.4,269.9,283.2,325.9,319.7,341.1,333.6,321.4,313.0,281.7,271.7,276.6,280.4,292.1,296.0,334.9,347.2,355.6,346.3,338.1,306.1,281.4,257.9,237.9,212.8,230.6,240.8,268.4,296.9,336.3,354.1,394.8,401.3,393.8,384.1,340.4,293.2,262.6,228.9,204.0,222.8,229.5,230.3,279.0,310.7,330.3,359.9,372.5,362.9,343.8,327.7,299.0,275.7,267.6,260.8,287.9,295.1,312.6,310.9,328.0,335.1,331.0,317.1,280.9,255.7,242.4,232.6,245.5,254.2,283.2,318.1,356.8,377.5,385.5,380.1,370.7,344.8,319.8,285.8,243.7,209.3,210.6,213.2,232.8,246.9,298.9,328.5,350.9,383.8,393.3,365.3,354.6,314.1,291.8,283.5,261.6,243.9,265.0,275.1,284.8,294.5,314.7,329.3,334.5,308.0,302.5,288.2,270.6,249.8,270.3,266.7,309.9,326.6,339.7,361.6,365.2,375.1,357.5,324.2,276.7,255.9,224.4,216.6,198.2,213.1,237.7,281.4,333.8,349.8,384.7,396.2,401.1,366.8,354.0,320.3,286.6,258.5,222.5,238.2,226.2,252.6,272.3,314.9,331.5,335.9,333.7,326.4,323.2,290.7,288.7,265.7,274.6,292.8,304.8,304.2,325.4,349.0,348.4,341.1,319.2,297.7,278.6,240.4,228.1,222.3,230.1,244.4,263.6,306.7,340.1,383.7,405.4,408.1,378.1,349.2,326.5,287.9,239.1,215.4,200.6,209.4,234.8,269.7,296.8,319.2,340.2,359.2,370.6,352.0,326.6,317.8,296.6,268.2,271.3,266.2,281.1,306.5,306.9,327.7,329.1,316.4,320.0,283.4,261.3,262.9,237.6,236.6,251.2,269.7,291.4,329.5,368.1,385.6,400.4,387.1,359.1,329.1,286.7,247.3,221.8,216.4,201.0,207.8,246.2,267.2,317.5,339.7,380.9,379.8,381.8,364.8,338.0,304.2,269.9,266.7,239.4,249.6,269.2,285.4,306.9,317.2,318.9,317.6] }
  ],

  getTable: function(idx) { return this.tables[idx % this.tableCount]; },
  getByBiome: function(biome) { return this.tables.filter(function(t){ return t.biome===biome; }); },
  blendTables: function(idxA, idxB, t) {
    var a = this.tables[idxA % this.tableCount];
    var b = this.tables[idxB % this.tableCount];
    if (!a||!b) return null;
    var pts = [];
    for (var i=0; i<this.pointsPerTable; i++) {
      pts.push(a.points[i]*(1-t) + b.points[i]*t);
    }
    return { id:-1, biome:'blend', points:pts };
  }
};

if (typeof window !== "undefined") { window.TERRAIN_HEIGHT_TABLES_V2 = TERRAIN_HEIGHT_TABLES_V2; }
if (typeof module !== "undefined") { module.exports = { TERRAIN_HEIGHT_TABLES_V2 }; }
})();


// ================================================================
// TERRAIN_HAZARDS — Interactive hazards (pits, spikes, bouncy pads)
// ================================================================
const TERRAIN_HAZARDS = (() => {
  const _hazards = [];

  const TYPES = {
    spike_pit:    { width:60, depth:30, damage:25,  triggerWidth:55, bounce:false, type:'spike_pit' },
    spring_pad:   { width:40, depth:2,  damage:0,   triggerWidth:38, bounce:true,  bouncePower:900, type:'spring_pad' },
    oil_slick:    { width:80, depth:0,  damage:0,   triggerWidth:78, gripMult:0.1, type:'oil_slick' },
    sand_trap:    { width:70, depth:8,  damage:0,   triggerWidth:68, dragMult:0.4, type:'sand_trap' },
    mudpit:       { width:90, depth:12, damage:0,   triggerWidth:88, dragMult:0.3, type:'mudpit' },
    water_hazard: { width:100,depth:0,  damage:0,   triggerWidth:98, dragMult:0.5, type:'water_hazard' },
    fire_zone:    { width:50, depth:0,  damage:5,   triggerWidth:48, type:'fire_zone', damagePerSec:true },
    ice_patch:    { width:80, depth:0,  damage:0,   triggerWidth:78, gripMult:0.15, type:'ice_patch' },
    rock_fall:    { width:30, depth:0,  damage:15,  triggerWidth:28, type:'rock_fall', periodic:true, period:3 },
    checkpoint:   { width:4,  depth:80, damage:0,   triggerWidth:6,  type:'checkpoint', once:true },
    coin_magnet:  { width:120,depth:0,  damage:0,   triggerWidth:120,type:'coin_magnet', radius:100 },
  };

  let _nextId = 1;

  function add(type, x, y, extraProps) {
    const base = TYPES[type] || {};
    const hz   = { ...base, ...extraProps, x, y, id:_nextId++, active:true, triggered:false };
    _hazards.push(hz);
    return hz;
  }

  function remove(id) {
    const i = _hazards.findIndex(h=>h.id===id);
    if (i>=0) _hazards.splice(i,1);
  }

  function checkVehicle(vehicleX, vehicleY, vehicleW) {
    const triggered = [];
    for (const hz of _hazards) {
      if (!hz.active) continue;
      if (hz.once && hz.triggered) continue;
      const left  = hz.x - hz.triggerWidth/2;
      const right = hz.x + hz.triggerWidth/2;
      if (vehicleX + vehicleW/2 > left && vehicleX - vehicleW/2 < right) {
        // Y check for pits
        if (hz.depth > 0 && vehicleY < hz.y + hz.depth) continue;
        hz.triggered = true;
        triggered.push(hz);
      }
    }
    return triggered;
  }

  function update(dt) {
    for (const hz of _hazards) {
      if (!hz.active) continue;
      if (hz.periodic) {
        hz._timer = (hz._timer||0) + dt;
        if (hz._timer >= hz.period) { hz._timer=0; hz.triggered=false; }
      }
    }
  }

  function getVisible(camX, camW) {
    return _hazards.filter(h=>h.active && h.x > camX-100 && h.x < camX+camW+100);
  }

  function clear() { _hazards.length=0; _nextId=1; }
  function getAll(){ return [..._hazards]; }
  function count() { return _hazards.length; }

  // Draw hazard (placeholder, real renderer would use sprites)
  function drawDebug(ctx, hz, camX) {
    const sx = hz.x - camX;
    const sy = hz.y || 300;
    ctx.save();
    const colors = { spike_pit:'#ff4400', spring_pad:'#00ff44', oil_slick:'#aaaaaa',
                     sand_trap:'#ddbb44', mudpit:'#885522', water_hazard:'#2244ff',
                     fire_zone:'#ff6600', ice_patch:'#88ddff', rock_fall:'#888888',
                     checkpoint:'#ffff00', coin_magnet:'#ffdd00' };
    ctx.fillStyle   = colors[hz.type]||'#ffffff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(sx-hz.width/2, sy, hz.width, 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = '9px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(hz.type, sx, sy-4);
    ctx.restore();
  }

  return { add, remove, checkVehicle, update, getVisible, clear, getAll, count, drawDebug, TYPES };
})();

// ================================================================
// TERRAIN_SECTOR_MANAGER — Divide terrain into sectors for fast queries
// ================================================================
const TERRAIN_SECTOR_MANAGER = (() => {
  const SECTOR_WIDTH = 512; // pixels per sector
  const _sectors = new Map(); // sectorIdx -> {points:[{x,y}], hazards:[], decorations:[]}

  function getSectorIdx(x) { return Math.floor(x / SECTOR_WIDTH); }

  function addPoint(x, y) {
    const idx = getSectorIdx(x);
    if (!_sectors.has(idx)) _sectors.set(idx, { points:[], hazards:[], decorations:[] });
    _sectors.get(idx).points.push({ x, y });
  }

  function addHazard(hazard) {
    const idx = getSectorIdx(hazard.x);
    if (!_sectors.has(idx)) _sectors.set(idx, { points:[], hazards:[], decorations:[] });
    _sectors.get(idx).hazards.push(hazard);
  }

  function addDecoration(x, y, type) {
    const idx = getSectorIdx(x);
    if (!_sectors.has(idx)) _sectors.set(idx, { points:[], hazards:[], decorations:[] });
    _sectors.get(idx).decorations.push({ x, y, type });
  }

  function getPointsInRange(xMin, xMax) {
    const s0 = getSectorIdx(xMin), s1 = getSectorIdx(xMax);
    const pts = [];
    for (let s=s0; s<=s1; s++) {
      const sec = _sectors.get(s);
      if (sec) pts.push(...sec.points);
    }
    return pts;
  }

  function getHazardsInRange(xMin, xMax) {
    const s0 = getSectorIdx(xMin), s1 = getSectorIdx(xMax);
    const hz = [];
    for (let s=s0; s<=s1; s++) {
      const sec = _sectors.get(s);
      if (sec) hz.push(...sec.hazards);
    }
    return hz;
  }

  function getDecorationsInRange(xMin, xMax) {
    const s0 = getSectorIdx(xMin), s1 = getSectorIdx(xMax);
    const dec = [];
    for (let s=s0; s<=s1; s++) {
      const sec = _sectors.get(s);
      if (sec) dec.push(...sec.decorations);
    }
    return dec;
  }

  function getHeightAt(x, fallback) {
    const pts = getPointsInRange(x-SECTOR_WIDTH, x+1);
    if (!pts.length) return fallback||0;
    // Find bracketing points
    let left=null, right=null;
    for (const p of pts) {
      if (p.x <= x && (!left || p.x > left.x))  left  = p;
      if (p.x >= x && (!right || p.x < right.x)) right = p;
    }
    if (!left || !right || left===right) return (left||right||{y:fallback||0}).y;
    const t = (x-left.x)/(right.x-left.x);
    return left.y + (right.y-left.y)*t;
  }

  function getSectorCount() { return _sectors.size; }
  function clear() { _sectors.clear(); }

  function getSectorInfo(x) {
    const idx = getSectorIdx(x);
    const sec = _sectors.get(idx)||{ points:[], hazards:[], decorations:[] };
    return { idx, x0:idx*SECTOR_WIDTH, x1:(idx+1)*SECTOR_WIDTH, ...sec };
  }

  return { addPoint, addHazard, addDecoration, getPointsInRange, getHazardsInRange, getDecorationsInRange, getHeightAt, getSectorCount, clear, getSectorInfo, SECTOR_WIDTH };
})();
