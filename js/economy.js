'use strict';
const Economy = {
  UPGRADE_COSTS: {
    1:0,2:100,3:250,4:500,5:1000,6:2000,7:4000,8:8000,9:16000,10:32000,
    11:5000,12:7000,13:10000,14:14000,15:20000,16:28000,17:38000,18:52000,19:70000,20:50000
  },
  STAT_UPGRADE_MULT: { engine:1.0, suspension:0.8, tires:0.8, fuel:0.6, gravity:0.9 },

  // ⇩⇩ GEN-PARCA-BASLA — port-araclari/gen-arac-parca.js ÜRETİR · ELLE DÜZENLEME YASAK ⇩⇩
  PARTS: {
    nitro: {
      id:'nitro', name:'NITRO', icon:'🔥',
      desc:'Instant speed burst!\n2 sec boost, 15 sec cooldown',
      goldCost:8000, diamondCost:5, color:'#FF3D00', rarity:'epic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Legendary', maksSv:4,
      kisaAciklama:'Charge on perfect start and excess fuel. Activate with a button.',
      uzunAciklama:'Used in every game mode to get powerful speed boost in ground and air.',
      etkiBirimi:'mutlak (anlık itki + ust hız)',
      statAdlari:['Impulse','Top Speed'],
      seviyeler:{ etki:[4.2,5.13,6.07,7], sure:[12,14.67,17.33,20] }
    },
    wing: {
      id:'wing', name:'WING', icon:'🪂',
      desc:'Air control!\nReduces fall speed',
      goldCost:6000, diamondCost:4, color:'#00CCFF', rarity:'rare',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Common', maksSv:15,
      kisaAciklama:'Glide in air.',
      uzunAciklama:'Long jumps and/or to increase speed.',
      etkiBirimi:'mutlak itki + saniye',
      statAdlari:['Boost','Duration (Seconds)'],
      seviyeler:{ etki:[100,107,114,121,128,135,142,150,157,164,171,178,185,192,200], sure:[1.5,1.57,1.64,1.71,1.79,1.86,1.93,2,2.07,2.14,2.21,2.29,2.36,2.43,2.5] }
    },
    spring: {
      id:'spring', name:'JUMP SPRING', icon:'🌀',
      desc:'Bounce on landing!\nBig jump on flat ground',
      goldCost:7000, diamondCost:4, color:'#00CC44', rarity:'uncommon',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Rare', maksSv:10,
      kisaAciklama:'Jump up in the air. NOTE: Tap both pedals to activate!',
      uzunAciklama:'Used in every game mode to cushion or start jumps and is paired with most parts.',
      etkiBirimi:'mutlak (dikey itki)',
      statAdlari:['Boost'],
      seviyeler:{ etki:[500,555,611,666,722,777,833,888,944,1000], sure:null }
    },
    landing_boost: {
      id:'landing_boost', name:'LANDING BOOST', icon:'⚡',
      desc:'Speed boost on landing!\n+100 speed each landing',
      goldCost:5000, diamondCost:3, color:'#FFD700', rarity:'common',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Epic', maksSv:7,
      kisaAciklama:'Power boost on a perfect landing after a big air.',
      uzunAciklama:'Pushes the vehicle forward and maintains/increases speed, and is often paired with Jump Shocks.',
      etkiBirimi:'mutlak (anlık itki)',
      statAdlari:['Impulse'],
      seviyeler:{ etki:[9,10,11,12,13,14,15], sure:null }
    },
    start_boost: {
      id:'start_boost', name:'START BOOST', icon:'🚀',
      desc:'Explosive launch!\nBig speed burst at race start',
      goldCost:5500, diamondCost:3, color:'#FF5E3A', rarity:'common',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Rare', maksSv:10,
      kisaAciklama:'Active rocket booster on perfect start.',
      uzunAciklama:'Used to increase acceleration at the start of a Cup race. Can\'t be used in Adventure!',
      etkiBirimi:'mutlak itki + saniye',
      statAdlari:['Boost','Duration (Seconds)'],
      seviyeler:{ etki:[700,711,722,733,744,755,766,777,788,800], sure:[0.5,0.61,0.72,0.83,0.94,1.06,1.17,1.28,1.39,1.5] }
    },
    turbo: {
      id:'turbo', name:'TURBO', icon:'🌀',
      desc:'Higher top speed!\n+15% max speed all run',
      goldCost:9000, diamondCost:5, color:'#00E0FF', rarity:'epic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Epic', maksSv:7,
      kisaAciklama:'Charge turbo at maximum pressure for a power boost.',
      uzunAciklama:'Used in every game mode to give giant boosts over large pits/gaps/hills, or just to increase speed.',
      etkiBirimi:'mutlak (ust hız + anlık itki)',
      statAdlari:['Top speed','Impulse'],
      seviyeler:{ etki:[50,54.17,58.33,62.5,66.67,70.83,75], sure:[4,5,6,7,8,9,10] }
    },
    coin_magnet: {
      id:'coin_magnet', name:'COIN MAGNET', icon:'🧲',
      desc:'Pulls nearby coins to you!',
      goldCost:7000, diamondCost:4, color:'#FFD21E', rarity:'rare',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Common', maksSv:15,
      kisaAciklama:'Collect fuel and coins with wider radius.',
      uzunAciklama:'It helps to collect Coins and Fuel without directly going through their path. It can also collect diamonds in adventure mode when the booster is purchased and in "full frenzy" in the Cups mode.',
      etkiBirimi:'metre (yarıçap) + metre/saniye (çekme kuvveti)',
      statAdlari:['Radius (Meters)','Force (Meters per second)'],
      seviyeler:{ etki:[5,5.25,5.5,5.75,6,6.25,6.5,6.75,7,7.25,7.5,7.75,8,8.25,8.5], sure:[10,11.43,12.86,14.29,15.71,17.14,18.57,20,21.43,22.86,24.29,25.71,27.14,28.57,30] }
    },
    air_master: {
      id:'air_master', name:'AIR MASTER', icon:'🕹️',
      desc:'Sharper mid-air rotation control!',
      goldCost:6500, diamondCost:4, color:'#A04AFF', rarity:'rare',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Common', maksSv:15,
      kisaAciklama:'Turn faster in the air.',
      uzunAciklama:'Flips for tasks, moon stunt tracks to increase coin count, or on flip tracks for more time bonus.',
      etkiBirimi:'mutlak (dönme hızı katsayısı)',
      statAdlari:['Air Control'],
      seviyeler:{ etki:[13,13.5,14,14.5,15,15.5,16,16.5,17,17.5,18,18.5,19,19.5,20], sure:null }
    },
    roll_cage: {
      id:'roll_cage', name:'ROLL CAGE', icon:'🛡️',
      desc:'Survive one crash per run!',
      goldCost:12000, diamondCost:7, color:'#8A8F9A', rarity:'epic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Common', maksSv:15,
      kisaAciklama:'Protect driver from hits.',
      uzunAciklama:'For ceilings or other instances where hitting your head is common.',
      etkiBirimi:'mutlak (dayanıklılık puanı)',
      statAdlari:['Durability'],
      seviyeler:{ etki:[20,22.5,25,27.5,30,32.5,35,37.5,40,42.5,45,47.5,50,52.5,55], sure:null }
    },
    combo_master: {
      id:'combo_master', name:'COMBO MASTER', icon:'🎯',
      desc:'+50% gold from flips & combos!',
      goldCost:8500, diamondCost:5, color:'#FF9E00', rarity:'rare'
    },
    smooth_lander: {
      id:'smooth_lander', name:'SMOOTH LANDER', icon:'🪶',
      desc:'Bad landings cost less speed!\nSofter crash penalty',
      goldCost:6500, diamondCost:4, color:'#4FC3F7', rarity:'uncommon'
    },
    fuel_saver: {
      id:'fuel_saver', name:'FUEL SAVER', icon:'🛢️',
      desc:'Burns less fuel!\n-20% fuel drain all run',
      goldCost:5000, diamondCost:3, color:'#7CB342', rarity:'common'
    },
    grip_tires: {
      id:'grip_tires', name:'GRIP TIRES', icon:'🛞',
      desc:'Extra traction!\nLess wheel slip on hills',
      goldCost:6000, diamondCost:4, color:'#455A64', rarity:'uncommon',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Common', maksSv:15,
      kisaAciklama:'Increased overall grip with special bonus on snow and icy surfaces.',
      uzunAciklama:'Used on snowy adventure maps, climbing steep hills, and even improving acceleration in Cups.',
      etkiBirimi:'mutlak (kar/buz tutuşu + genel tutuş)',
      statAdlari:['Grip on Snow/Icy surfaces','Grip'],
      seviyeler:{ etki:[150,175,200,225,250,275,300,325,350,375,400,425,450,475,500], sure:[50,57.14,64.29,71.43,78.57,85.71,92.86,100,107,114,121,129,136,143,150] }
    },
    shock_absorber: {
      id:'shock_absorber', name:'SHOCK ABSORBER', icon:'🧰',
      desc:'Softer landings!\nReduces bounce damage',
      goldCost:7500, diamondCost:4, color:'#26A69A', rarity:'rare'
    },
    ghost_wheels: {
      id:'ghost_wheels', name:'GHOST WHEELS', icon:'☁️',
      desc:'Phase through small rocks!\nIgnore minor obstacles',
      goldCost:11000, diamondCost:6, color:'#B0BEC5', rarity:'epic'
    },
    diamond_finder: {
      id:'diamond_finder', name:'DIAMOND FINDER', icon:'💠',
      desc:'Bonus diamond chance\non long runs!',
      goldCost:14000, diamondCost:9, color:'#40C4FF', rarity:'epic'
    },
    air_brake: {
      id:'air_brake', name:'AIR BRAKE', icon:'🪂',
      desc:'Quick stop in mid-air!\nInstantly kills momentum on tap',
      goldCost:6000, diamondCost:4, color:'#29B6F6', rarity:'uncommon'
    },
    nitro_plus: {
      id:'nitro_plus', name:'NITRO PLUS', icon:'🔋',
      desc:'Longer nitro burst!\n+50% boost duration',
      goldCost:10000, diamondCost:6, color:'#FF6D00', rarity:'epic'
    },
    coin_doubler: {
      id:'coin_doubler', name:'COIN DOUBLER', icon:'💰',
      desc:'Worth more per coin!\n+25% coin value all run',
      goldCost:13000, diamondCost:8, color:'#FFC400', rarity:'epic'
    },
    ghost_dash: {
      id:'ghost_dash', name:'GHOST DASH', icon:'💨',
      desc:'Brief phase after big landings!\n0.5s intangible on hard impact',
      goldCost:9500, diamondCost:5, color:'#9C6BFF', rarity:'rare'
    },
    fuel_tank: {
      id:'fuel_tank', name:'FUEL TANK', icon:'⛽',
      desc:'Bigger fuel capacity!\n+30% max fuel storage',
      goldCost:6000, diamondCost:3, color:'#66BB6A', rarity:'uncommon'
    },
    heavyweight: {
      id:'heavyweight', name:'HEAVYWEIGHT', icon:'⚓',
      desc:'general description: Increase the amount of damage dealt to breakable objects. Description for the Scooter: Added weight to keep those wheelies under control.',
      goldCost:5000, diamondCost:3, color:'#8D6E63', rarity:'common',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Common', maksSv:15,
      kisaAciklama:'general description: Increase the amount of damage dealt to breakable objects. Description for the Scooter: Added weight to keep those wheelies under control.',
      uzunAciklama:'Breaking Objects for time bonus, or Air-time penalty tracks. Very rare use cases in Adventure.',
      etkiBirimi:'mutlak (ağırlık birimi)',
      statAdlari:['Weight'],
      seviyeler:{ etki:[35,39.64,44.29,48.93,53.57,58.21,62.86,67.5,72.14,76.79,81.43,86.07,90.71,95.36,100], sure:null }
    },
    wheelie_boost: {
      id:'wheelie_boost', name:'WHEELIE BOOST', icon:'🏍️',
      desc:'Power boost on wheelies.',
      goldCost:7250, diamondCost:4, color:'#90A4AE', rarity:'rare',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Rare', maksSv:10,
      kisaAciklama:'Power boost on wheelies.',
      uzunAciklama:'Wheelie Events, Adventure maps with hills, or in Time Trial maps to set up for a long airtime and/or increase speed.',
      etkiBirimi:'mutlak itki + saniye',
      statAdlari:['Boost','Duration (Seconds)'],
      seviyeler:{ etki:[300,311,322,333,344,355,366,377,388,400], sure:[0.5,0.56,0.61,0.67,0.72,0.78,0.83,0.89,0.94,1] }
    },
    fume_boost: {
      id:'fume_boost', name:'FUME BOOST', icon:'🎚️',
      desc:'Power boost when fuel is low.',
      goldCost:7250, diamondCost:4, color:'#546E7A', rarity:'rare',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Rare', maksSv:10,
      kisaAciklama:'Power boost when fuel is low.',
      uzunAciklama:'Adventure and Team Event maps with big gaps between fuels, or Time Trial maps with flat roofs, usually combined with Thrusters. Note: This part can\'t be activated when the vehicle is performing an airtime and/or while driving backwards on the map.',
      etkiBirimi:'mutlak itki',
      statAdlari:['Boost'],
      seviyeler:{ etki:[250,272,294,316,338,361,383,405,427,450], sure:null }
    },
    flip_boost: {
      id:'flip_boost', name:'FLIP BOOST', icon:'🌪️',
      desc:'Power boost after successful flips.',
      goldCost:7250, diamondCost:4, color:'#5C6BC0', rarity:'rare',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Rare', maksSv:10,
      kisaAciklama:'Power boost after successful flips.',
      uzunAciklama:'Flip or Stunt tracks where many flips are possible, or in Time Trial maps to set up for an Overcharged Turbo. Paired well with Motocross Mastery.',
      etkiBirimi:'mutlak itki + saniye',
      statAdlari:['Boost','Duration (Seconds)'],
      seviyeler:{ etki:[250,266,283,300,316,333,350,366,383,400], sure:[0.5,0.56,0.61,0.67,0.72,0.78,0.83,0.89,0.94,1] }
    },
    afterburner: {
      id:'afterburner', name:'AFTERBURNER', icon:'🧨',
      desc:'Power boost with higher fuel consumption.',
      goldCost:11000, diamondCost:6, color:'#FF7043', rarity:'epic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Epic', maksSv:7,
      kisaAciklama:'Power boost with higher fuel consumption.',
      uzunAciklama:'Used in public events, cups and Time Trials to increase power output and/or jump length. Not used in adventure as it triples fuel consumption during acceleration.',
      etkiBirimi:'mutlak itki + ust hız',
      statAdlari:['Boost','Top speed'],
      seviyeler:{ etki:[42.5,47.92,53.33,58.75,64.17,69.58,75], sure:[2.5,2.67,2.83,3,3.17,3.33,3.5] }
    },
    spoiler: {
      id:'spoiler', name:'SPOILER', icon:'🪽',
      desc:'Increased downforce while in the air. Effect is lost if part gets detached.',
      goldCost:11000, diamondCost:6, color:'#EF5350', rarity:'epic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Epic', maksSv:7,
      kisaAciklama:'Increased downforce while in the air. Effect is lost if part gets detached.',
      uzunAciklama:'Used in maps with lots of roofs, No Air-Time Public and Team Event tracks to keep the vehicle on the ground, or on Time Trial maps that allow huge airtimes to quickly reach terminal velocity.',
      etkiBirimi:'mutlak (aşağı bastırma kuvveti)',
      statAdlari:['Force'],
      seviyeler:{ etki:[350,458,566,675,783,891,1000], sure:null }
    },
    thrusters: {
      id:'thrusters', name:'THRUSTERS', icon:'🚀',
      desc:'Fly through the air (or space). NOTE: Activate by pressing both pedals down!',
      goldCost:16500, diamondCost:9, color:'#FFB300', rarity:'legendary',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Legendary', maksSv:4,
      kisaAciklama:'Fly through the air (or space). NOTE: Activate by pressing both pedals down!',
      uzunAciklama:'Used to increase jump height/length and/or to speed up vehicle, to drain fuel to activate Fume Boost on some Time Trial maps, or to avoid and fly over deadly pits in Adventure.',
      etkiBirimi:'mutlak (sürekli itki)',
      statAdlari:['Boost'],
      seviyeler:{ etki:[500,666,833,1000], sure:null }
    },
    fuel_boost: {
      id:'fuel_boost', name:'FUEL BOOST', icon:'🛢️',
      desc:'Power boost on collected fuel canister.',
      goldCost:16500, diamondCost:9, color:'#42A5F5', rarity:'legendary',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Legendary', maksSv:4,
      kisaAciklama:'Power boost on collected fuel canister.',
      uzunAciklama:'Used in Cups, Time Trials, and 2km extra fuel events to speed up the vehicle and increase jump length. It has very rare use cases in adventure because fuels are rare.',
      etkiBirimi:'mutlak itki + saniye',
      statAdlari:['Boost','Duration (Seconds)'],
      seviyeler:{ etki:[400,400,400,400], sure:[0.5,0.67,0.83,1] }
    },
    coin_boost: {
      id:'coin_boost', name:'COIN BOOST', icon:'🪙',
      desc:'Power boost when collecting coins.',
      goldCost:16500, diamondCost:9, color:'#BDBDBD', rarity:'legendary',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Legendary', maksSv:4,
      kisaAciklama:'Power boost when collecting coins.',
      uzunAciklama:'Used in every game mode to get a short speed boost to help climb hills, jump over pits, increase speed, and it can be activated when out of fuel in Adventure (although is not very effective).',
      etkiBirimi:'mutlak ust hız + saniye',
      statAdlari:['Top speed','Duration (Seconds)'],
      seviyeler:{ etki:[8,12,16,20], sure:[0.5,0.67,0.83,1] }
    },
    amplifier: {
      id:'amplifier', name:'AMPLIFIER', icon:'📢',
      desc:'Boosts the power of other equipped tuning parts.',
      goldCost:25000, diamondCost:14, color:'#FF9100', rarity:'mythic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Mythic', maksSv:3,
      kisaAciklama:'Boosts the power of other equipped tuning parts.',
      uzunAciklama:'Used in every game mode to boost the tuning parts to make them even more powerful. Can\'t be used with Echo at the same time.',
      etkiBirimi:'yüzde (diğer parçaların gücüne eklenen % - ölçek 10/15/20)',
      statAdlari:['Part Power'],
      seviyeler:{ etki:[10,15,20], sure:null }
    },
    echo: {
      id:'echo', name:'ECHO', icon:'🔉',
      desc:'Repeats the first equipped tuning part effect after a short delay.',
      goldCost:25000, diamondCost:14, color:'#AB47BC', rarity:'mythic',
      // ── wiki verisi (ölçüldü, interpolasyon YOK) ──
      nadirlik:'Mythic', maksSv:3,
      kisaAciklama:'Repeats the first equipped tuning part effect after a short delay.',
      uzunAciklama:'Used in every game mode to repeat the effects of the powerful tuning parts. Can\'t be used with Magnet, Air Control, Heavyweight, Winter Tires, Rollcage, Jumpshocks and Spoiler. Can\'t be used with Amplifier at the same time.',
      etkiBirimi:'yüzde (tekrarlanan etkinin gücü) + saniye (gecikme)',
      statAdlari:['Echo Power (Strength of Echoed Tuning Part)','Delay'],
      seviyeler:{ etki:[60,70,80], sure:[0.8,0.8,0.8] }
    }
  },
  // Maks seviye NADİRLİĞE bağlıdır (wiki ölçümü: sütun uzunluğu = nadirlik).
  PART_MAX_BY_RARITY: { common:15, rare:10, epic:7, legendary:4, mythic:3 },
  // Uyumluluk matrisi — wiki `uzunAciklama` metninden ÇIKARILDI, SİMETRİK.
  PART_INCOMPAT: {
    amplifier: ['echo'],
    echo: ['coin_magnet','air_master','heavyweight','grip_tires','roll_cage','spring','spoiler','amplifier'],
    coin_magnet: ['echo'],
    air_master: ['echo'],
    heavyweight: ['echo'],
    grip_tires: ['echo'],
    roll_cage: ['echo'],
    spring: ['echo'],
    spoiler: ['echo']
  },
  // ⇧⇧ GEN-PARCA-BITIS ⇧⇧
  RARITY_COLORS: { common:'#5fd35f', uncommon:'#4a9eff', rare:'#b266ff', epic:'#ff8c1a', legendary:'#ffd54a', mythic:'#ff4fd8' },
  RARITY_NAMES:  { common:'COMMON', uncommon:'UNCOMMON', rare:'RARE', epic:'EPIC', legendary:'LEGENDARY', mythic:'MYTHIC' },
  rarityColor(partId) { const p = this.PARTS[partId]; return (p && this.RARITY_COLORS[p.rarity]) || '#5fd35f'; },

  // ── Yükseltme tavanı: 25 ── TUNING(2 Agu): 50 → 25 ─────────────────────
  // vehicles.js UP_LEVEL_MAX ve tuning.js UP_MAX ile AYNI olmalı.
  UP_MAX: 25,

  // ── SEVİYE MALİYET TABLOSU (1 → 25, tek tek yazılı) ────────────────────
  // Anahtar = ULAŞILACAK seviye, değer = o seviyeye çıkmanın altın maliyeti.
  // TÜM ARAÇLAR için aynı tablo geçerlidir (karışıklık olmasın diye tek yer).
  // Araç/stat farkı yalnızca aşağıdaki STAT_UPGRADE_MULT ile uygulanır:
  //   motor ×1.0 · süspansiyon ×0.8 · lastik ×0.8 · yakıt ×0.6 · gravity ×0.9 (DEĞİŞMEDİ)
  // TUNING(2 Agu) TÜRETME: yeni LV n, eski 50'lik tablonun L(n)=1+49(n-1)/24.
  //   seviyesiyle AYNI GÜÇTEDİR. Yeni n'nin maliyeti = eski tabloda (L(n-1), L(n)]
  //   aralığının ağırlıklı toplamı × 0,35 (= İNDİRİM), sonra yuvarlanmış. Böylece
  //   eski eğrinin İKİ KADEMELİ şekli korunur: 2–11 ≈ +%31/sv, 12–25 ≈ +%40/sv.
  //   Tablo baştan sona MONOTON ARTAR (25/25 duman testiyle kilitli).
  // Toplam (çarpansız) 1→25: 1.688.790 altın = eskinin %35,0'i (eski: 4.821.560).
  UPGRADE_LEVEL_COSTS: {
    1:0,      2:380,    3:500,    4:650,    5:860,    6:1150,   7:1450,   8:1900,   9:2500,   10:3250,
    11:4300,
    // ↓ 12'den sonra dikleşir (~%40/sv; eski tablonun ~23,5. seviyesine denk gelir)
    12:6000,  13:8350,  14:12000, 15:16500, 16:23000,
    17:32500, 18:45500, 19:63500, 20:89500, 21:125000,
    22:175000, 23:246000, 24:345000, 25:484000
  },
  getUpgradeCost(stat, currentLevel) {
    if (currentLevel >= this.UP_MAX) return null;      // MAX → yükseltilemez
    const next = currentLevel + 1;                     // ulaşılacak seviye (2..50)
    const base = this.UPGRADE_LEVEL_COSTS[next];
    if (base == null) return null;
    return Math.floor(base * (this.STAT_UPGRADE_MULT[stat] || 1.0));
  },
  canUpgrade(vehicleId, stat) {
    const current = SaveData.getUpgrade(vehicleId, stat);
    if (current >= this.UP_MAX) return false;
    return SaveData.get('gold') >= this.getUpgradeCost(stat, current);
  },
  doUpgrade(vehicleId, stat) {
    const current = SaveData.getUpgrade(vehicleId, stat);
    if (current >= this.UP_MAX) return false;
    const cost = this.getUpgradeCost(stat, current);
    if (!SaveData.spendGold(cost)) return false;
    SaveData.setUpgrade(vehicleId, stat, current + 1);
    if (typeof Achievements !== 'undefined') Achievements.check('upgrade_done');
    return true;
  },
  buyVehicle(vehicleId) {
    const def = VehicleDefs[vehicleId];
    if (!def) return false;
    if (SaveData.get('ownedVehicles').includes(vehicleId)) return false;
    // Bazı araç tanımlarında düz price yok (alt-şema) → normalize edilmiş fiyatı kullan
    const price = (typeof def.price === 'number') ? def.price
                : (typeof buildVehicleConfig === 'function' ? buildVehicleConfig(vehicleId, {}).price : 0);
    if (!SaveData.spendGold(price)) return false;
    SaveData.unlockVehicle(vehicleId);
    if (typeof Achievements !== 'undefined') Achievements.check('vehicle_bought');
    return true;
  },
  buyPart(partId, useDiamonds) {
    const part = this.PARTS[partId];
    if (!part) return false;
    if (SaveData.ownsPart(partId)) return false;
    if (useDiamonds) { if (!SaveData.spendDiamonds(part.diamondCost)) return false; }
    else             { if (!SaveData.spendGold(part.goldCost)) return false; }
    SaveData.addPart(partId);
    return true;
  },

  // ── PARÇA YÜKSELTME (elmasla) ──────────────────────────────
  // 🔴 ESKİ TEK SABİT TAVAN. Wiki verisi olan 21 parçada ARTIK KULLANILMAZ —
  //   onların tavanı `maksSv` (nadirliğe bağlı: C15/R10/E7/L4/M3). Bu sabit
  //   yalnızca wiki karşılığı OLMAYAN 11 oyuna-özgü parça için geçerlidir.
  //   ⚠ js/ui.js:3025 hâlâ bu sabiti okuyor (o dosyaya dokunulmadı) → eski
  //     parça ekranında tavan 20 görünür; yeni garaj ekranı doğru tavanı çizer.
  PART_MAX_LEVEL: 20,
  // Parça başına GERÇEK tavan: wiki nadirliği varsa ondan, yoksa eski sabitten.
  partMaxLevel(partId) {
    const p = this.PARTS[partId];
    if (!p) return this.PART_MAX_LEVEL;
    if (p.maksSv) return p.maksSv;
    const r = (p.nadirlik || '').toLowerCase();
    if (r && this.PART_MAX_BY_RARITY[r]) return this.PART_MAX_BY_RARITY[r];
    return this.PART_MAX_LEVEL;
  },
  // Seviye başına elmas maliyeti (2.→5. seviye). 1. seviye satın almayla gelir.
  partUpgradeCost(partId, currentLevel) {
    if (currentLevel >= this.partMaxLevel(partId)) return null;
    const base = (this.PARTS[partId] && this.PARTS[partId].diamondCost) || 3;
    return base + currentLevel * 2;   // ör: 1→2 = base+2, giderek artar
  },
  upgradePart(partId) {
    if (!SaveData.ownsPart(partId)) return false;
    const lv = SaveData.getPartLevel(partId);
    if (lv >= this.partMaxLevel(partId)) return false;
    const cost = this.partUpgradeCost(partId, lv);
    if (cost == null) return false;
    if (!SaveData.spendDiamonds(cost)) return false;
    SaveData.setPartLevel(partId, lv + 1);
    return true;
  },
  // ── SEVİYE → STAT ─────────────────────────────────────────────────────────
  // Wiki'nin ÖLÇÜLEN tablosundan okur (interpolasyon YOK). lv aralık dışıysa kelepçelenir.
  getPartStat(partId, level) {
    const p = this.PARTS[partId];
    if (!p || !p.seviyeler || !p.seviyeler.etki) return null;
    const n = p.seviyeler.etki.length;
    let lv = (level == null) ? SaveData.getPartLevel(partId) : level;
    if (lv <= 0) return null;
    if (lv > n) lv = n;
    return {
      etki: p.seviyeler.etki[lv - 1],
      sure: p.seviyeler.sure ? p.seviyeler.sure[lv - 1] : null,
      adlar: p.statAdlari || null
    };
  },
  // ── PARÇA GÜCÜ ÇARPANI ────────────────────────────────────────────────────
  // 🔴 ESKİ EĞRİ ÇOK DİKTİ: 1+(lv-1)*0.25 → lv20 = 5,75×. Wiki'nin ÖLÇÜLEN
  //   artışı 1,70–2,86× arasında, yani eski eğri 2–3,4 KAT dik idi.
  //   Artık wiki tablosu varsa çarpan = etki[lv] / etki[1] (gerçek ölçüm oranı).
  //   ⚠ Fuel Boost'ta etki HER SEVİYEDE 400 SABİT (wiki notu) → çarpan 1,00 kalır,
  //     yalnız `sure` uzar. Bu bir hata değil, parçanın tasarım ilkesi.
  //   Wiki karşılığı olmayan 11 parça ESKİ eğriyi kullanmaya devam eder
  //   (uydurma tablo yazmaktansa dokunmamak doğru).
  getPartPower(partId) {
    const lv = SaveData.getPartLevel(partId);
    if (lv <= 0) return 0;
    const p = this.PARTS[partId];
    if (p && p.seviyeler && p.seviyeler.etki && p.seviyeler.etki.length) {
      const t = p.seviyeler.etki;
      const i = Math.min(lv, t.length) - 1;
      return t[0] ? (t[i] / t[0]) : 1;
    }
    return 1 + (lv - 1) * 0.25;
  },
  // ── UYUMLULUK ─────────────────────────────────────────────────────────────
  // Matris SİMETRİK okunur (iki yön de denenir) — tek yönlü yazım hatasına dayanıklı.
  partsCompatible(a, b) {
    if (!a || !b || a === b) return true;
    const M = this.PART_INCOMPAT || {};
    if (M[a] && M[a].indexOf(b) >= 0) return false;
    if (M[b] && M[b].indexOf(a) >= 0) return false;
    return true;
  },
  // Takılı parça listesine `partId` eklenebilir mi? Engelleyen parçayı döndürür.
  canEquipPart(partId, equipped) {
    const list = equipped || [];
    for (let i = 0; i < list.length; i++) {
      if (!this.partsCompatible(partId, list[i])) {
        return { ok: false, engel: list[i] };
      }
    }
    return { ok: true, engel: null };
  },
  // ── Hurda (Scrap) ile parça yükseltme — nadirlik arttıkça pahalı ──
  PART_SCRAP_MULT: { common:1, uncommon:1.6, rare:2.6, epic:4, legendary:6, mythic:9 },
  partScrapCost(partId, currentLevel) {
    if (currentLevel >= this.partMaxLevel(partId)) return null;
    const mult = this.PART_SCRAP_MULT[(this.PARTS[partId]||{}).rarity || 'common'] || 1;
    return Math.floor((50 + currentLevel * 70) * mult);
  },
  upgradePartScrap(partId) {
    if (!SaveData.ownsPart(partId)) return false;
    const lv = SaveData.getPartLevel(partId);
    if (lv >= this.partMaxLevel(partId)) return false;
    const cost = this.partScrapCost(partId, lv);
    if (cost == null || !SaveData.spendScrap(cost)) return false;
    SaveData.setPartLevel(partId, lv + 1);
    return true;
  },
  // ── Chests (offline reward boxes) ──
  CHESTS: {
    bronze: { costGold: 2000,  gold:[500,1500],   scrap:[20,60] },
    silver: { costGold: 8000,  gold:[2000,5000],  scrap:[60,150],  diamonds:[0,2] },
    gold:   { costDiamond: 8,  gold:[5000,15000], scrap:[150,400], diamonds:[2,8] },
    platinum:{ costDiamond: 20, gold:[15000,35000],scrap:[400,900], diamonds:[8,18] },
    legendary:{ costDiamond: 45, gold:[35000,80000], scrap:[900,2000],  diamonds:[20,40] },
    mythic:  { costDiamond: 90, gold:[80000,180000],scrap:[2000,4500], diamonds:[45,90] },
    wooden:  { costGold: 800,   gold:[200,700],    scrap:[8,30] },
    ruby:    { costDiamond: 30, gold:[25000,55000],scrap:[600,1300], diamonds:[12,26] },
    cosmic:  { costDiamond: 150,gold:[180000,400000],scrap:[4500,9000], diamonds:[90,180] },
    daily:  { free: true,      gold:[300,1000],   scrap:[10,40],   diamonds:[0,1] }
  },
  openChest(type) {
    const c = this.CHESTS[type]; if (!c) return null;
    if (c.costGold && !SaveData.spendGold(c.costGold)) return { error:'gold' };
    if (c.costDiamond && !SaveData.spendDiamonds(c.costDiamond)) return { error:'diamond' };
    const rnd = a => a ? (a[0] + Math.floor(Math.random() * (a[1] - a[0] + 1))) : 0;
    const r = { gold: rnd(c.gold), scrap: rnd(c.scrap), diamonds: rnd(c.diamonds) };
    if (r.gold) SaveData.addGold(r.gold);
    if (r.scrap && SaveData.addScrap) SaveData.addScrap(r.scrap);
    if (r.diamonds) SaveData.addDiamonds(r.diamonds);
    return r;
  },
  // ── Season Pass ──
  SEASON_MAX_TIER: 15,
  SEASON_XP_PER_TIER: 300,
  seasonTier(xp) { return Math.min(this.SEASON_MAX_TIER, Math.floor((xp || 0) / this.SEASON_XP_PER_TIER)); },
  seasonReward(tier, premium) {
    if (premium) {
      if (tier % 5 === 0) return { diamonds: 5 + tier };
      if (tier % 2 === 0) return { scrap: 60 + tier * 12 };
      return { gold: 1500 + tier * 300 };
    }
    if (tier % 3 === 0) return { scrap: 30 + tier * 8 };
    return { gold: 400 + tier * 120 };
  },
  claimSeasonReward(tier, premium) {
    const r = this.seasonReward(tier, premium);
    if (r.gold) SaveData.addGold(r.gold);
    if (r.scrap && SaveData.addScrap) SaveData.addScrap(r.scrap);
    if (r.diamonds) SaveData.addDiamonds(r.diamonds);
    return r;
  },
  buyPremiumPass() {
    if (SaveData.get('premiumPass')) return false;
    if (!SaveData.spendDiamonds(50)) return false;
    SaveData.set('premiumPass', true);
    return true;
  },
  calculateRunReward(distance, flips, coinsCollected) {
    // Mesafe ödülü + takla + her 1000m kilometre-taşı bonusu (daha akıcı ilerleme)
    let bonus = Math.floor(distance / 50);
    bonus += flips * 8;
    bonus += Math.floor(distance / 1000) * 50;
    let diamonds = 0;
    if (distance >= 200   && !SaveData.hasAchievement('rank_bronze'))  { SaveData.setAchievement('rank_bronze');  diamonds += 2; }
    if (distance >= 800   && !SaveData.hasAchievement('rank_silver'))  { SaveData.setAchievement('rank_silver');  diamonds += 3; }
    if (distance >= 3000  && !SaveData.hasAchievement('rank_gold'))    { SaveData.setAchievement('rank_gold');    diamonds += 5; }
    if (distance >= 10000 && !SaveData.hasAchievement('rank_diamond')) { SaveData.setAchievement('rank_diamond'); diamonds += 10; }
    if (distance >= 50000 && !SaveData.hasAchievement('rank_legend'))  { SaveData.setAchievement('rank_legend');  diamonds += 25; }
    if (diamonds > 0) SaveData.addDiamonds(diamonds);
    // 🔴 BUGFIX(28 Tmz) — ALTIN İKİ KEZ VERİLİYORDU.
    //   Toplanan sikkeler koşu SIRASINDA zaten hesaba geçiyor
    //   (js/game.js:516 → `SaveData.addGold(...)` her sikkede).
    //   Burada `coinsCollected` tekrar eklenince koşu sonunda İKİNCİ kez ödeniyordu.
    //   VIP'te daha da kötüydü: pickup'ta ×1.5, koşu sonunda `_vipMult` ile bir
    //   kez daha ×1.5 → 500 sikke = 750 + 750 = 1.500 altın.
    //   ▶ Artık yalnız BONUS (mesafe + takla + kilometre taşı) döner.
    //   ⚠ `coins` alanı bilgi amaçlı korunuyor (ekranda "💰 Coins" gösterimi
    //     game.js `coinsCollected`'ı ayrıca kullanıyor, bu alan ödemeye girmez).
    return { gold: bonus, coins: coinsCollected || 0, diamonds };
  },
  formatDistance(meters) {
    // Her zaman METRE cinsinden (binlik ayraçlı)
    return Math.floor(meters).toLocaleString('tr-TR') + ' m';
  }
,
  // ═══════════════════════════════════════════════════════════════
  // EXTENDED ECONOMY SYSTEM
  // ═══════════════════════════════════════════════════════════════

  // Shop items (consumables)
  SHOP_ITEMS: {
    fuel_can:      { name: 'Fuel Can',        icon: '⛽', goldCost: 500,  diamondCost: 0, desc: 'Full fuel refill' },
    repair_kit:    { name: 'Repair Kit',      icon: '🔧', goldCost: 800,  diamondCost: 0, desc: 'Repair vehicle' },
    magnet:        { name: 'Coin Magnet',     icon: '🧲', goldCost: 1500, diamondCost: 1, desc: 'Pull coins 60s' },
    shield:        { name: 'Shield',          icon: '🛡️', goldCost: 2000, diamondCost: 2, desc: '30s no damage' },
    double_coins:  { name: '2x Coins',        icon: '💰', goldCost: 0,    diamondCost: 3, desc: 'Double coins 60s' },
    slow_time:     { name: 'Slow Time',       icon: '⏱️', goldCost: 0,    diamondCost: 4, desc: '10s slow motion' },
    ghost:         { name: 'Ghost Mode',      icon: '👻', goldCost: 0,    diamondCost: 5, desc: '20s no damage' },
    super_nitro:   { name: 'Super Nitro',     icon: '🚀', goldCost: 3000, diamondCost: 2, desc: '3x nitro power' },
    lucky_clover:  { name: 'Lucky Clover',    icon: '🍀', goldCost: 1200, diamondCost: 1, desc: 'More coins' },
    turbo_start:   { name: 'Turbo Start',    icon: '⚡', goldCost: 800,  diamondCost: 1, desc: 'Fast start' },
    grip_boost:    { name: 'Grip Boost',      icon: '🛞', goldCost: 1000, diamondCost: 1, desc: 'Better traction 45s' },
    xp_charm:      { name: 'XP Charm',         icon: '🎓', goldCost: 0,    diamondCost: 3, desc: '2x XP this run' },
    scrap_magnet:  { name: 'Scrap Magnet',    icon: '⚙️', goldCost: 2500, diamondCost: 2, desc: '2x scrap 90s' },
    airbrake:      { name: 'Air Brake',       icon: '🪶', goldCost: 3500, diamondCost: 3, desc: 'Instant air stop' },
    phoenix_revive:{ name: 'Phoenix Revive',  icon: '🔆', goldCost: 0,    diamondCost: 6, desc: 'Auto-revive once' },
    triple_coins:  { name: '3x Coins',        icon: '🤑', goldCost: 0,    diamondCost: 5, desc: 'Triple coins 45s' },
    fuel_barrel:   { name: 'Fuel Barrel',     icon: '🛢️', goldCost: 1200, diamondCost: 0, desc: '2x fuel refills' },
    mega_repair:   { name: 'Mega Repair',     icon: '🧰', goldCost: 1800, diamondCost: 1, desc: 'Full repair + armor' },
    scrap_stash:   { name: 'Scrap Stash',     icon: '🔩', goldCost: 2000, diamondCost: 0, desc: 'Instant +200 scrap' },
    rocket_boost:  { name: 'Rocket Boost',    icon: '🎇', goldCost: 4000, diamondCost: 3, desc: 'Huge launch burst' },
    feather_fall:  { name: 'Feather Fall',    icon: '🍃', goldCost: 1600, diamondCost: 1, desc: 'Slow falls 40s' },
    time_freeze:   { name: 'Time Freeze',     icon: '❄️', goldCost: 0,    diamondCost: 4, desc: '6s full stop' },
    combo_charm:   { name: 'Combo Charm',     icon: '🎯', goldCost: 2200, diamondCost: 2, desc: '2x flip bonus run' },
    golden_ticket: { name: 'Golden Ticket',   icon: '🎟️', goldCost: 0,    diamondCost: 8, desc: 'Free chest spin' },
  },

  // Tüketilebilir item satın al → envantere ekle (gerekiyorsa hem altın hem elmas harcar)
  buyConsumable(id) {
    const it = this.SHOP_ITEMS[id]; if (!it) return { error: 'nope' };
    if (it.diamondCost > 0 && !SaveData.spendDiamonds(it.diamondCost)) return { error: 'diamond' };
    if (it.goldCost > 0 && !SaveData.spendGold(it.goldCost)) {
      if (it.diamondCost > 0) SaveData.addDiamonds(it.diamondCost); // altın yetmezse elması iade et
      return { error: 'gold' };
    }
    SaveData.addItem(id, 1);
    return { ok: true, id: id, count: SaveData.getItem(id) };
  },

  // Bundle deals
  BUNDLES: {
    starter_pack:  { name: 'Starter Pack',     items: { gold: 5000, diamonds: 10 }, diamondCost: 5,  icon: '📦' },
    racing_pack:   { name: 'Racer Pack',       items: { gold: 15000, diamonds: 25 }, diamondCost: 10, icon: '🏎️' },
    ultimate_pack: { name: 'Ultimate Pack',    items: { gold: 50000, diamonds: 100 }, diamondCost: 30, icon: '👑' },
    diamond_pack1: { name: '100 Diamonds',      items: { diamonds: 100 }, diamondCost: 0, realMoneyCost: 0.99, icon: '💎' },
    diamond_pack2: { name: '500 Diamonds',      items: { diamonds: 500 }, diamondCost: 0, realMoneyCost: 4.99, icon: '💎💎' },
    weekend_pack:  { name: 'Weekend Pack',      items: { gold: 8000, diamonds: 15 }, diamondCost: 7,  icon: '🎉' },
    pro_pack:      { name: 'Pro Racer Pack',    items: { gold: 30000, diamonds: 55 }, diamondCost: 20, icon: '🏁' },
    mega_pack:     { name: 'Mega Pack',         items: { gold: 100000, diamonds: 220 }, diamondCost: 60, icon: '💥' },
    scrap_pack:    { name: 'Scrap Pack',        items: { gold: 4000, scrap: 1500 }, diamondCost: 6,  icon: '⚙️' },
    diamond_pack3: { name: '1500 Diamonds',     items: { diamonds: 1500 }, diamondCost: 0, realMoneyCost: 12.99, icon: '💎💎💎' },
    tycoon_pack:   { name: 'Tycoon Pack',       items: { gold: 250000, diamonds: 500 }, diamondCost: 0, realMoneyCost: 24.99, icon: '🤑' },
    carnival_pack: { name: 'Carnival Pack',     items: { gold: 12000, diamonds: 20, scrap: 800 }, diamondCost: 8,  icon: '🎪' },
    festival_pack: { name: 'Festival Pack',     items: { gold: 22000, diamonds: 45 }, diamondCost: 14, icon: '🎆' },
  },

  // Gold multiplier events
  _activeMultipliers: {},

  activateMultiplier(type, duration, multiplier) {
    this._activeMultipliers[type] = {
      expiry: Date.now() + duration * 1000,
      mult: multiplier
    };
  },

  getMultiplier(type) {
    const m = this._activeMultipliers[type];
    if (!m || Date.now() > m.expiry) {
      delete this._activeMultipliers[type];
      return 1;
    }
    return m.mult;
  },

  getRemainingTime(type) {
    const m = this._activeMultipliers[type];
    if (!m) return 0;
    return Math.max(0, (m.expiry - Date.now()) / 1000);
  },

  getTotalCoinMultiplier() {
    return this.getMultiplier('coins') * this.getMultiplier('all');
  },

  // Dynamic pricing (inflation/deflation based on purchases)
  _priceModifiers: {},

  getPriceModifier(itemId) {
    return this._priceModifiers[itemId] || 1;
  },

  recordPurchase(itemId) {
    const current = this._priceModifiers[itemId] || 1;
    this._priceModifiers[itemId] = Math.min(2, current * 1.05); // 5% inflation per purchase
  },

  // Reward calculation (harita çarpanlı — alternatif, çağrılmıyor; ana ödül calculateRunReward'da)
  calculateRunRewardByMap(distance, flips, mapId, vehicleId, hasParts) {
    const baseGold = Math.floor(distance / 10);
    const flipBonus = flips * 8;
    const mapMultipliers = {
      countryside: 1.0, desert: 1.1, winter: 1.15, beach: 1.05,
      city: 1.2, jungle: 1.25, mars: 1.4, moon: 1.35,
      neon: 1.3, volcano: 1.5, underwater: 1.45, wasteland: 1.2, canyon: 1.25
    };
    const mapMult = mapMultipliers[mapId] || 1.0;
    const coinMult = this.getTotalCoinMultiplier();
    const vehicleBonus = hasParts ? 1.1 : 1.0; // parts give bonus
    const total = Math.floor((baseGold + flipBonus) * mapMult * coinMult * vehicleBonus);
    return {
      base: baseGold,
      flipBonus,
      mapBonus: Math.floor((baseGold + flipBonus) * (mapMult - 1)),
      multiplierBonus: Math.floor((baseGold + flipBonus) * mapMult * (coinMult - 1)),
      total,
      breakdown: `${baseGold} + ${flipBonus} flip + ${mapMult}x map = ${total}`
    };
  },

  // Leaderboard (local)
  _leaderboard: [],

  submitScore(playerName, distance, vehicleId, mapId) {
    this._leaderboard.push({
      name: playerName || 'Player',
      distance, vehicleId, mapId,
      date: new Date().toLocaleDateString('tr-TR')
    });
    this._leaderboard.sort((a, b) => b.distance - a.distance);
    this._leaderboard = this._leaderboard.slice(0, 100); // top 100
    return this._leaderboard.findIndex(e => e.distance === distance) + 1;
  },

  getTopScores(limit) {
    return this._leaderboard.slice(0, limit || 10);
  },

  // XP System
  XP_TABLE: [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000],

  getPlayerXP() { return SaveData.get('playerXP') || 0; },

  getPlayerLevel() {
    const xp = this.getPlayerXP();
    let level = 1;
    for (let l = 0; l < this.XP_TABLE.length; l++) {
      if (xp >= this.XP_TABLE[l]) level = l + 1;
      else break;
    }
    return Math.min(level, this.XP_TABLE.length);
  },

  getXPForNextLevel() {
    const level = this.getPlayerLevel();
    if (level >= this.XP_TABLE.length) return null;
    return this.XP_TABLE[level];
  },

  getLevelProgress() {
    const level = this.getPlayerLevel();
    const xp = this.getPlayerXP();
    if (level >= this.XP_TABLE.length) return 1;
    const currentLvlXP = this.XP_TABLE[level - 1];
    const nextLvlXP = this.XP_TABLE[level];
    return (xp - currentLvlXP) / (nextLvlXP - currentLvlXP);
  },

  addXP(amount) {
    const beforeLevel = this.getPlayerLevel();
    SaveData.data.playerXP = (SaveData.get('playerXP') || 0) + amount;
    const afterLevel = this.getPlayerLevel();
    SaveData.save();
    if (afterLevel > beforeLevel) {
      return { levelUp: true, newLevel: afterLevel, xpGained: amount };
    }
    return { levelUp: false, xpGained: amount };
  },

  calculateXPForRun(distance, flips, botWin) {
    const base = Math.floor(distance / 50);
    const flipXP = flips * 5;
    const botXP = botWin ? 50 : 0;
    return base + flipXP + botXP;
  }

};

// ═══════════════════════════════════════════════════════════════════════════
// GÜNLÜK FIRSATLAR (DAILY DEALS)
// ═══════════════════════════════════════════════════════════════════════════
const DailyDeals = {
  _deals: null,
  _lastGenDate: null,
  _purchasedToday: [],

  DEAL_TEMPLATES: [
    { id:'speed_pack',    label:'Speed Pack',       basePrice:1000, discount:0.40, type:'bundle', items:['engine_3','tires_2'] },
    { id:'fuel_master',   label:'Fuel Master',      basePrice:800,  discount:0.35, type:'bundle', items:['fuel_3','fuel_4'] },
    { id:'suspension_up', label:'Suspension Set',   basePrice:1200, discount:0.50, type:'bundle', items:['suspension_4','suspension_5'] },
    { id:'coin_pack_s',   label:'Small Coin Pack',  basePrice:100, discount:0.20, type:'coins',  amount:500 },
    { id:'coin_pack_m',   label:'Medium Coin Pack',  basePrice:250, discount:0.25, type:'coins',  amount:1500 },
    { id:'coin_pack_l',   label:'Large Coin Pack',  basePrice:500, discount:0.30, type:'coins',  amount:4000 },
    { id:'xp_boost',      label:'XP 2x (1 day)',    basePrice:200,  discount:0.45, type:'boost',  effect:'xp_2x', duration:86400 },
    { id:'fuel_boost',    label:'Infinite Fuel (1h)', basePrice:150, discount:0.60, type:'boost',  effect:'infinite_fuel', duration:3600 },
    { id:'repair_kit',    label:'Full Repair Kit',  basePrice:300,  discount:0.30, type:'consumable', uses:5 },
    { id:'lucky_wheel',   label:'Lucky Wheel ×3',   basePrice:400,  discount:0.50, type:'special', spins:3 },
  ],

  generateDailyDeals(seed) {
    const today = new Date().toDateString();
    if (this._lastGenDate === today && this._deals) return this._deals;
    const rng = this._seededRandom(seed || today.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const shuffled = [...this.DEAL_TEMPLATES].sort(() => rng() - 0.5);
    this._deals = shuffled.slice(0, 4).map((t, i) => ({
      ...t,
      finalPrice: Math.floor(t.basePrice * (1 - t.discount)),
      savings: Math.floor(t.basePrice * t.discount),
      expiresAt: this._getTodayEnd(),
      slot: i + 1,
      purchased: false,
      featured: i === 0
    }));
    this._lastGenDate = today;
    this._purchasedToday = [];
    return this._deals;
  },

  _seededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  },

  _getTodayEnd() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  },

  getTimeRemaining() {
    const now = Date.now();
    const end = this._getTodayEnd();
    const ms = end - now;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  },

  purchaseDeal(dealId, playerCoins) {
    const deal = (this._deals || []).find(d => d.id === dealId);
    if (!deal) return { success: false, reason: 'Deal not found' };
    if (deal.purchased) return { success: false, reason: 'Already purchased' };
    if (playerCoins < deal.finalPrice) return { success: false, reason: 'Not enough coins' };
    deal.purchased = true;
    this._purchasedToday.push(dealId);
    return { success: true, cost: deal.finalPrice, deal };
  },

  getDeals() { return this._deals || this.generateDailyDeals(); },

  getLimitedTimeOffer(vehicleId) {
    const offers = [
      { label: '48-Hour Vehicle Rental', hours: 48, discountPct: 0 },
      { label: '24-Hour Free Trial', hours: 24, discountPct: 100 },
    ];
    return offers[Math.floor(Date.now() / 86400000) % offers.length];
  },

  drawDailyDealsUI(ctx, x, y) {
    const deals = this.getDeals();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath(); ctx.roundRect(x, y, 320, 200, 10); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⏰ DAILY DEALS - ' + this.getTimeRemaining(), x + 160, y + 20);
    deals.forEach((d, i) => {
      const dy = y + 35 + i * 40;
      ctx.fillStyle = d.purchased ? '#555' : (d.featured ? '#2c2c3e' : '#1a1a2e');
      ctx.beginPath(); ctx.roundRect(x + 8, dy, 304, 34, 6); ctx.fill();
      if (d.featured) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 8, dy, 304, 34);
      }
      ctx.fillStyle = d.purchased ? '#888' : '#fff';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(d.label, x + 14, dy + 14);
      ctx.fillStyle = '#888';
      ctx.font = '9px Arial';
      ctx.fillText(`-%${Math.round(d.discount * 100)} DISCOUNT`, x + 14, dy + 27);
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${d.finalPrice} 🪙`, x + 306, dy + 20);
      ctx.fillStyle = '#888';
      ctx.font = '9px Arial';
      ctx.fillText(`${d.basePrice}`, x + 306, dy + 30);
    });
    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SEZON GEÇER (SEASON PASS)
// ═══════════════════════════════════════════════════════════════════════════
const SeasonPass = {
  SEASONS: [
    { id:'s1', name:'Spring Season', theme:'spring', color:'#4CAF50', duration:30 },
    { id:'s2', name:'Summer Season', theme:'summer', color:'#FF9800', duration:30 },
    { id:'s3', name:'Autumn Season', theme:'autumn', color:'#8D6E63', duration:30 },
    { id:'s4', name:'Winter Season', theme:'winter', color:'#2196F3', duration:30 },
  ],

  SEASON_TIERS: Array.from({ length: 50 }, (_, i) => ({
    tier: i + 1,
    xpRequired: (i + 1) * 500,
    freeReward: {
      type: i % 3 === 0 ? 'coins' : i % 3 === 1 ? 'xp' : 'cosmetic',
      amount: 100 + i * 50,
      label: `Tier ${i + 1} Free Reward`
    },
    premiumReward: {
      type: i % 2 === 0 ? 'coins' : 'exclusive_cosmetic',
      amount: 500 + i * 200,
      label: `Tier ${i + 1} Premium Reward`
    }
  })),

  passState: {
    currentSeason: 's1',
    isPremium: false,
    seasonXP: 0,
    claimedTiers: [],
    startDate: Date.now(),
    endDate: Date.now() + 30 * 86400000
  },

  getCurrentTier() {
    let tier = 0;
    let xpLeft = this.passState.seasonXP;
    for (const t of this.SEASON_TIERS) {
      if (xpLeft >= t.xpRequired) { xpLeft -= t.xpRequired; tier = t.tier; }
      else break;
    }
    return Math.min(tier, 50);
  },

  addSeasonXP(amount) {
    const before = this.getCurrentTier();
    this.passState.seasonXP += amount;
    const after = this.getCurrentTier();
    if (after > before) {
      return { tierUp: true, newTier: after, reward: this.getRewardForTier(after) };
    }
    return { tierUp: false };
  },

  getRewardForTier(tier) {
    const tierDef = this.SEASON_TIERS[tier - 1];
    if (!tierDef) return null;
    return this.passState.isPremium ? tierDef.premiumReward : tierDef.freeReward;
  },

  claimTierReward(tier) {
    if (this.passState.claimedTiers.includes(tier)) return { success: false, reason: 'Already claimed' };
    if (tier > this.getCurrentTier()) return { success: false, reason: 'Tier not reached' };
    this.passState.claimedTiers.push(tier);
    return { success: true, reward: this.getRewardForTier(tier) };
  },

  purchasePremium() {
    this.passState.isPremium = true;
    return { success: true, unlockedTiers: this.getCurrentTier() };
  },

  getDaysRemaining() {
    return Math.max(0, Math.ceil((this.passState.endDate - Date.now()) / 86400000));
  },

  getProgressToNextTier() {
    const tier = this.getCurrentTier();
    if (tier >= 50) return 1;
    let xpSpent = 0;
    for (let i = 0; i < tier; i++) xpSpent += this.SEASON_TIERS[i].xpRequired;
    const xpInTier = this.passState.seasonXP - xpSpent;
    const xpNeeded = this.SEASON_TIERS[tier]?.xpRequired || 1;
    return Math.min(1, xpInTier / xpNeeded);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BAŞARIM ÖDÜLLERİ
// ═══════════════════════════════════════════════════════════════════════════
const AchievementRewards = {
  ACHIEVEMENT_REWARD_MAP: {
    first_flip:       { coins: 100,  xp: 20,   unlocks: null,           badge: '🔄' },
    flip_master:      { coins: 500,  xp: 100,  unlocks: 'flip_trails',  badge: '🌀' },
    distance_1k:      { coins: 200,  xp: 40,   unlocks: null,           badge: '📏' },
    distance_10k:     { coins: 1000, xp: 200,  unlocks: 'odometer',     badge: '🗺️' },
    first_win:        { coins: 300,  xp: 60,   unlocks: null,           badge: '🏆' },
    win_streak_5:     { coins: 2000, xp: 400,  unlocks: 'champion_frame', badge: '⭐' },
    speed_demon:      { coins: 800,  xp: 160,  unlocks: 'speed_lines',  badge: '⚡' },
    collector:        { coins: 600,  xp: 120,  unlocks: null,           badge: '💰' },
    survive_5min:     { coins: 1500, xp: 300,  unlocks: 'survivor_skin', badge: '🛡️' },
    all_vehicles:     { coins: 5000, xp: 1000, unlocks: 'garage_master', badge: '🚗' },
    max_upgrade:      { coins: 3000, xp: 600,  unlocks: 'gold_vehicle',  badge: '⚙️' },
    npc_champion:     { coins: 2500, xp: 500,  unlocks: 'rival_skin',   badge: '👑' },
    explorer:         { coins: 1200, xp: 240,  unlocks: 'map_revealer', badge: '🌍' },
    early_bird:       { coins: 400,  xp: 80,   unlocks: null,           badge: '🌅' },
    night_rider:      { coins: 400,  xp: 80,   unlocks: 'headlight_fx', badge: '🌙' },
  },

  _claimedRewards: [],

  claimReward(achievementId) {
    if (this._claimedRewards.includes(achievementId)) {
      return { success: false, reason: 'Already claimed' };
    }
    const reward = this.ACHIEVEMENT_REWARD_MAP[achievementId];
    if (!reward) return { success: false, reason: 'Unknown achievement' };
    this._claimedRewards.push(achievementId);
    return { success: true, reward, achievementId };
  },

  getUnclaimedRewards(completedAchievements) {
    return completedAchievements.filter(id =>
      this.ACHIEVEMENT_REWARD_MAP[id] && !this._claimedRewards.includes(id)
    );
  },

  getTotalRewardValue() {
    return this._claimedRewards.reduce((acc, id) => {
      const r = this.ACHIEVEMENT_REWARD_MAP[id];
      if (r) { acc.coins += r.coins; acc.xp += r.xp; }
      return acc;
    }, { coins: 0, xp: 0 });
  },

  getUnlocks() {
    return this._claimedRewards
      .map(id => this.ACHIEVEMENT_REWARD_MAP[id]?.unlocks)
      .filter(Boolean);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESTİJ SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const PrestigeSystem = {
  PRESTIGE_LEVELS: [
    { level: 1, name: 'Bronze',    color: '#CD7F32', xpRequired: 50000,  bonus: { coinMult: 1.1, xpMult: 1.05, exclusiveVehicle: null } },
    { level: 2, name: 'Silver',   color: '#C0C0C0', xpRequired: 150000, bonus: { coinMult: 1.25, xpMult: 1.10, exclusiveVehicle: 'silver_racer' } },
    { level: 3, name: 'Gold',     color: '#FFD700', xpRequired: 350000, bonus: { coinMult: 1.50, xpMult: 1.20, exclusiveVehicle: 'gold_beast' } },
    { level: 4, name: 'Platinum', color: '#E5E4E2', xpRequired: 700000, bonus: { coinMult: 1.75, xpMult: 1.30, exclusiveVehicle: 'platinum_x' } },
    { level: 5, name: 'Diamond',  color: '#B9F2FF', xpRequired: 1500000,bonus: { coinMult: 2.00, xpMult: 1.50, exclusiveVehicle: 'diamond_king' } },
    { level: 6, name: 'Championship', color: '#FF0080', xpRequired: 3000000,bonus: { coinMult: 2.50, xpMult: 1.75, exclusiveVehicle: 'champion_ultra' } },
    { level: 7, name: 'Legend',   color: '#FF4500', xpRequired: Infinity, bonus: { coinMult: 3.00, xpMult: 2.00, exclusiveVehicle: 'legend_dragon' } },
  ],

  prestigeState: {
    level: 0,
    totalXPEver: 0,
    prestigeCount: 0,
    lastPrestigeDate: null
  },

  getPrestigeLevel(totalXP) {
    let level = 0;
    for (const pl of this.PRESTIGE_LEVELS) {
      if (totalXP >= pl.xpRequired) level = pl.level;
      else break;
    }
    return level;
  },

  getPrestigeBonuses(totalXP) {
    const level = this.getPrestigeLevel(totalXP);
    if (level === 0) return { coinMult: 1, xpMult: 1, exclusiveVehicle: null };
    const def = this.PRESTIGE_LEVELS[level - 1];
    return def ? { ...def.bonus } : { coinMult: 1, xpMult: 1 };
  },

  canPrestige(currentXP, threshold = 50000) {
    return currentXP >= threshold;
  },

  doPrestige(currentXP) {
    if (!this.canPrestige(currentXP)) return { success: false, reason: 'Not enough XP' };
    this.prestigeState.prestigeCount++;
    this.prestigeState.totalXPEver += currentXP;
    this.prestigeState.level = this.getPrestigeLevel(this.prestigeState.totalXPEver);
    this.prestigeState.lastPrestigeDate = Date.now();
    return {
      success: true,
      newPrestigeLevel: this.prestigeState.level,
      bonuses: this.getPrestigeBonuses(this.prestigeState.totalXPEver),
      xpReset: true
    };
  },

  getPrestigeName(level) {
    const def = this.PRESTIGE_LEVELS[level - 1];
    return def ? def.name : 'Starter';
  },

  getPrestigeColor(level) {
    const def = this.PRESTIGE_LEVELS[level - 1];
    return def ? def.color : '#FFFFFF';
  },

  drawPrestigeBadge(ctx, x, y, level) {
    const def = this.PRESTIGE_LEVELS[level - 1];
    if (!def) return;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
    g.addColorStop(0, def.color + 'FF');
    g.addColorStop(1, def.color + '44');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P' + level, x, y);
    ctx.restore();
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ARAÇ TAKAS SİSTEMİ (TRADING)
// ═══════════════════════════════════════════════════════════════════════════
const TradingSystem = {
  _tradeOffers: [],
  _tradeHistory: [],
  _nextOfferId: 1,

  TRADE_FEE_PCT: 0.05, // %5 işlem ücreti

  createTradeOffer(fromVehicleId, toVehicleId, coinsOffset = 0) {
    const offer = {
      id: this._nextOfferId++,
      fromVehicle: fromVehicleId,
      toVehicle: toVehicleId,
      coinsOffset,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 3600000,
      fee: Math.abs(Math.floor(coinsOffset * this.TRADE_FEE_PCT))
    };
    this._tradeOffers.push(offer);
    return offer;
  },

  acceptTrade(offerId, playerVehicles, playerCoins) {
    const offer = this._tradeOffers.find(o => o.id === offerId && o.status === 'pending');
    if (!offer) return { success: false, reason: 'Offer not found' };
    if (Date.now() > offer.expiresAt) {
      offer.status = 'expired';
      return { success: false, reason: 'Offer expired' };
    }
    if (!playerVehicles.includes(offer.toVehicle)) {
      return { success: false, reason: 'Vehicle not available' };
    }
    const totalCost = offer.coinsOffset + offer.fee;
    if (totalCost > 0 && playerCoins < totalCost) {
      return { success: false, reason: 'Not enough coins' };
    }
    offer.status = 'completed';
    offer.completedAt = Date.now();
    this._tradeHistory.push(offer);
    return {
      success: true,
      receivedVehicle: offer.fromVehicle,
      givenVehicle: offer.toVehicle,
      coinsChange: -totalCost
    };
  },

  cancelTrade(offerId) {
    const offer = this._tradeOffers.find(o => o.id === offerId);
    if (offer && offer.status === 'pending') {
      offer.status = 'cancelled';
      return { success: true };
    }
    return { success: false };
  },

  getActiveOffers() {
    return this._tradeOffers.filter(o => o.status === 'pending' && Date.now() < o.expiresAt);
  },

  cleanupExpiredOffers() {
    this._tradeOffers.forEach(o => {
      if (o.status === 'pending' && Date.now() > o.expiresAt) o.status = 'expired';
    });
  },

  getTradeValue(vehicleId) {
    // Simplified trade value estimation
    const baseValues = { jeep:2000, bike:1500, truck:3000, buggy:2500, supercar:5000 };
    return baseValues[vehicleId] || 1800;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AÇIK ARTIRMA ALAĞI (AUCTION HOUSE)
// ═══════════════════════════════════════════════════════════════════════════
const AuctionHouse = {
  _auctions: [],
  _nextId: 1,
  _bidHistory: [],

  createAuction(item, startingBid, duration = 3600) {
    const auction = {
      id: this._nextId++,
      item,
      startingBid,
      currentBid: startingBid,
      highestBidder: null,
      bids: [],
      startTime: Date.now(),
      endTime: Date.now() + duration * 1000,
      status: 'active',
      buyNowPrice: startingBid * 3
    };
    this._auctions.push(auction);
    return auction;
  },

  placeBid(auctionId, bidder, amount) {
    const auction = this._auctions.find(a => a.id === auctionId && a.status === 'active');
    if (!auction) return { success: false, reason: 'Auction not found' };
    if (Date.now() > auction.endTime) {
      this.closeAuction(auctionId);
      return { success: false, reason: 'Auction ended' };
    }
    const minBid = auction.currentBid + Math.ceil(auction.currentBid * 0.05);
    if (amount < minBid) return { success: false, reason: `Minimum bid: ${minBid}` };
    auction.currentBid = amount;
    auction.highestBidder = bidder;
    auction.bids.push({ bidder, amount, time: Date.now() });
    this._bidHistory.push({ auctionId, bidder, amount, time: Date.now() });
    // Extend if bid in last 30s
    if (auction.endTime - Date.now() < 30000) {
      auction.endTime += 30000;
    }
    return { success: true, newBid: amount, outbid: auction.bids.length > 1 };
  },

  buyNow(auctionId, buyer) {
    const auction = this._auctions.find(a => a.id === auctionId && a.status === 'active');
    if (!auction) return { success: false, reason: 'Not found' };
    auction.currentBid = auction.buyNowPrice;
    auction.highestBidder = buyer;
    auction.status = 'completed';
    return { success: true, paid: auction.buyNowPrice, item: auction.item };
  },

  closeAuction(auctionId) {
    const auction = this._auctions.find(a => a.id === auctionId);
    if (!auction || auction.status !== 'active') return null;
    auction.status = auction.highestBidder ? 'completed' : 'no_sale';
    return { winner: auction.highestBidder, finalBid: auction.currentBid, item: auction.item };
  },

  getActiveAuctions() {
    const now = Date.now();
    return this._auctions.filter(a => a.status === 'active' && now < a.endTime);
  },

  simulateNPCBids(dt) {
    for (const auction of this.getActiveAuctions()) {
      if (Math.random() < 0.001 * dt) {
        const npcBid = auction.currentBid + Math.ceil(auction.currentBid * (0.06 + Math.random() * 0.1));
        this.placeBid(auction.id, 'npc_' + Math.floor(Math.random() * 100), npcBid);
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// YATIRIM SİSTEMİ
// ═══════════════════════════════════════════════════════════════════════════
const InvestmentSystem = {
  INVESTMENT_TYPES: {
    stable:     { name:'Safe Fund',       rateMin:0.02, rateMax:0.05,  risk:'low',    lockDays:7  },
    growth:     { name:'Growth Fund',     rateMin:0.05, rateMax:0.15,  risk:'medium', lockDays:14 },
    aggressive: { name:'Aggressive Fund', rateMin:-0.1, rateMax:0.30,  risk:'high',   lockDays:30 },
    vehicle:    { name:'Vehicle Investment', rateMin:0.08, rateMax:0.20,  risk:'medium', lockDays:21 },
    seasonal:   { name:'Seasonal Investment', rateMin:0.10, rateMax:0.25,  risk:'medium', lockDays:30 },
  },

  _investments: [],
  _nextId: 1,

  invest(type, amount, playerId) {
    const def = this.INVESTMENT_TYPES[type];
    if (!def) return { success: false, reason: 'Investment type not found' };
    if (amount < 100) return { success: false, reason: 'Minimum 100 coins' };
    const rate = def.rateMin + Math.random() * (def.rateMax - def.rateMin);
    const inv = {
      id: this._nextId++,
      type, amount, playerId,
      rate,
      investedAt: Date.now(),
      maturesAt: Date.now() + def.lockDays * 86400000,
      expectedReturn: Math.floor(amount * (1 + rate)),
      status: 'active',
      actualReturn: null
    };
    this._investments.push(inv);
    return { success: true, investment: inv };
  },

  checkMaturities() {
    const now = Date.now();
    const matured = [];
    for (const inv of this._investments) {
      if (inv.status === 'active' && now >= inv.maturesAt) {
        inv.status = 'matured';
        // Apply some randomness to actual return
        const variance = (Math.random() - 0.5) * 0.02;
        inv.actualReturn = Math.floor(inv.amount * (1 + inv.rate + variance));
        matured.push(inv);
      }
    }
    return matured;
  },

  claimReturn(investmentId) {
    const inv = this._investments.find(i => i.id === investmentId && i.status === 'matured');
    if (!inv) return { success: false, reason: 'Not matured or not found' };
    inv.status = 'claimed';
    return { success: true, amount: inv.actualReturn, profit: inv.actualReturn - inv.amount };
  },

  getActiveInvestments(playerId) {
    return this._investments.filter(i => i.playerId === playerId && i.status === 'active');
  },

  calculateROI(investmentId) {
    const inv = this._investments.find(i => i.id === investmentId);
    if (!inv) return null;
    const elapsed = (Date.now() - inv.investedAt) / 86400000;
    const total = inv.maturesAt - inv.investedAt;
    const progress = Math.min(1, elapsed / (total / 86400000));
    return {
      invested: inv.amount,
      expectedReturn: inv.expectedReturn,
      profit: inv.expectedReturn - inv.amount,
      roi: ((inv.expectedReturn - inv.amount) / inv.amount) * 100,
      progress,
      daysRemaining: Math.max(0, Math.ceil((inv.maturesAt - Date.now()) / 86400000))
    };
  },

  getPortfolioSummary(playerId) {
    const active = this.getActiveInvestments(playerId);
    return {
      totalInvested: active.reduce((s, i) => s + i.amount, 0),
      expectedTotalReturn: active.reduce((s, i) => s + i.expectedReturn, 0),
      count: active.length
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GELİŞMİŞ ÖDÜL HESAPLAMA
// ═══════════════════════════════════════════════════════════════════════════
const RewardCalculator = {
  calculateRunRewardAdv(stats) {
    const {
      distance = 0, flips = 0, topSpeed = 0, coinsCollected = 0,
      survivedMs = 0, obstaclesCleared = 0, comboStreak = 0,
      powerupsUsed = 0, checkpointsPassed = 0, npcsBeaten = 0,
      noDamage = false, mapId = 'default', vehicleId = 'jeep',
      dayCycleBonus = 1.0, prestigeMult = 1.0, seasonPassMult = 1.0
    } = stats;

    // Base rewards
    const distanceReward  = Math.floor(distance / 10);
    const flipReward      = flips * 15;
    const speedReward     = topSpeed > 150 ? Math.floor((topSpeed - 150) * 2) : 0;
    const coinReward      = coinsCollected * 2;
    const surviveReward   = Math.floor(survivedMs / 10000) * 20;
    const obstacleReward  = obstaclesCleared * 10;
    const comboReward     = comboStreak * 5;
    const powerupReward   = powerupsUsed * 8;
    const checkpointReward= checkpointsPassed * 25;
    const npcReward       = npcsBeaten * 50;

    // Bonus multipliers
    const noDamageMult    = noDamage ? 1.5 : 1.0;
    const mapMultipliers  = { default:1.0, mountain:1.2, desert:1.15, arctic:1.3, jungle:1.25 };
    const mapMult         = mapMultipliers[mapId] || 1.0;

    const baseCoins = distanceReward + flipReward + speedReward + coinReward +
                      surviveReward + obstacleReward + comboReward +
                      powerupReward + checkpointReward + npcReward;

    const finalCoins = Math.floor(
      baseCoins * noDamageMult * mapMult * dayCycleBonus * prestigeMult * seasonPassMult
    );

    // XP calculation
    const baseXP = Math.floor(
      (distance / 50) + (flips * 5) + (checkpointsPassed * 10) + (npcsBeaten * 20)
    );
    const finalXP = Math.floor(baseXP * prestigeMult * seasonPassMult);

    const breakdown = {
      distance: distanceReward,
      flips: flipReward,
      speed: speedReward,
      coins: coinReward,
      survive: surviveReward,
      obstacles: obstacleReward,
      combo: comboReward,
      powerups: powerupReward,
      checkpoints: checkpointReward,
      npcs: npcReward
    };

    return {
      coins: finalCoins,
      xp: finalXP,
      breakdown,
      multipliers: { noDamage: noDamageMult, map: mapMult, dayBonus: dayCycleBonus, prestige: prestigeMult, season: seasonPassMult },
      total: finalCoins
    };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ENFLASYON MODELİ
// ═══════════════════════════════════════════════════════════════════════════
const InflationModel = {
  _baseDate: Date.now(),
  _annualRate: 0.03, // %3 yıllık enflasyon

  getInflationFactor(fromTime, toTime) {
    const years = (toTime - fromTime) / (365 * 86400000);
    return Math.pow(1 + this._annualRate, years);
  },

  adjustPrice(basePrice, purchasedAt) {
    const factor = this.getInflationFactor(purchasedAt, Date.now());
    return Math.floor(basePrice * factor);
  },

  getResaleValue(purchasePrice, purchasedAt, depreciationRate = 0.15) {
    const ageYears = (Date.now() - purchasedAt) / (365 * 86400000);
    const depreciation = Math.pow(1 - depreciationRate, ageYears);
    const inflation = this.getInflationFactor(purchasedAt, Date.now());
    return Math.floor(purchasePrice * depreciation * inflation);
  },

  getPriceHistory(basePrice, days = 30) {
    const history = [];
    const now = Date.now();
    for (let i = days; i >= 0; i--) {
      const t = now - i * 86400000;
      const factor = this.getInflationFactor(this._baseDate, t);
      const noise = 1 + (Math.sin(i * 0.7) * 0.02);
      history.push({ day: days - i, price: Math.floor(basePrice * factor * noise), timestamp: t });
    }
    return history;
  },

  setAnnualRate(rate) {
    this._annualRate = Math.max(-0.5, Math.min(0.5, rate));
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HARCAMA ANALİTİĞİ
// ═══════════════════════════════════════════════════════════════════════════
const SpendingAnalytics = {
  _transactions: [],

  recordTransaction(type, amount, itemId, meta = {}) {
    this._transactions.push({
      type, amount, itemId, meta,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    });
    // Keep last 500 transactions
    if (this._transactions.length > 500) this._transactions.shift();
  },

  getSpendingByCategory() {
    const cats = {};
    for (const t of this._transactions) {
      if (t.amount < 0) {
        cats[t.type] = (cats[t.type] || 0) + Math.abs(t.amount);
      }
    }
    return cats;
  },

  getEarningsByCategory() {
    const cats = {};
    for (const t of this._transactions) {
      if (t.amount > 0) {
        cats[t.type] = (cats[t.type] || 0) + t.amount;
      }
    }
    return cats;
  },

  getNetFlow(days = 7) {
    const cutoff = Date.now() - days * 86400000;
    const recent = this._transactions.filter(t => t.timestamp >= cutoff);
    const earned = recent.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const spent  = recent.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { earned, spent, net: earned - spent, days };
  },

  getSpendingTrend(days = 30) {
    const trend = [];
    for (let i = days; i >= 0; i--) {
      const dayStart = Date.now() - i * 86400000;
      const dayEnd = dayStart + 86400000;
      const dayTx = this._transactions.filter(t => t.timestamp >= dayStart && t.timestamp < dayEnd);
      const earned = dayTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const spent  = dayTx.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      trend.push({ day: days - i, earned, spent, net: earned - spent });
    }
    return trend;
  },

  getMostSpentOn() {
    const cats = this.getSpendingByCategory();
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ category: cat, amount: amt }));
  },

  getTransactionCount(type) {
    return this._transactions.filter(t => t.type === type).length;
  },

  drawAnalyticsChart(ctx, x, y, W, H) {
    const trend = this.getSpendingTrend(14);
    if (trend.length === 0) return;
    const maxVal = Math.max(...trend.map(d => Math.max(d.earned, d.spent)), 1);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(x, y, W, H, 8); ctx.fill();
    ctx.fillStyle = '#aaa';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Spending Trend (14 Days)', x + W / 2, y + 14);
    const chartX = x + 10, chartY = y + 20, chartW = W - 20, chartH = H - 30;
    const barW = chartW / (trend.length * 2 + 1);
    trend.forEach((d, i) => {
      const bx = chartX + i * (barW * 2 + 2);
      // Earn bar (green)
      const earnH = (d.earned / maxVal) * chartH;
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(bx, chartY + chartH - earnH, barW, earnH);
      // Spend bar (red)
      const spendH = (d.spent / maxVal) * chartH;
      ctx.fillStyle = '#F44336';
      ctx.fillRect(bx + barW + 1, chartY + chartH - spendH, barW, spendH);
    });
    ctx.restore();
  }
};

/* ════════════════════════════════════════════════════════════════
   VEHICLE UPGRADE SYSTEM  —  CANLI SİSTEME KANALİZE EDİLDİ (3 Ağu)
   ----------------------------------------------------------------
   🔴 BUGFIX(3 Ağu) — BU ALT SİSTEM PARALEL BİR ÖLÜ EKONOMİYDİ.
   Ölçüm (port-araclari/duman-upgradesystem.js kilitler):
     · `UpgradeSystem.getStats()` proje genelinde **0 kez** okunuyordu →
       12 çarpanın hepsi ölüydü, fiziğe SIFIR etkisi vardı.
       (powerMult/gripMult/nitroPowerMult/damageResist adlarına başka
        dosyalarda rastlanıyor ama onlar AYRI modüllerin kendi alanları —
        cardcollection.js · MapSettings · physics.js · skilltree.js.
        Klasik "isim çakışması" tuzağı; buradan okuyan YOK.)
     · Kendi `localStorage['ahmet_upgrades_v1']` anahtarını kullanıyor,
       `SaveData.upgrades`'e HİÇ yazmıyordu → canlı garaj yükseltmeleriyle
       tamamen ayrı iki depo.
     · `purchase()` gerçekten `SaveData.spendGold` çağırıyordu (vm'de ölçüldü:
       100.000 → 97.950 altın, karşılığında hiçbir etki yok).
     · Maliyet tablosu 1 araç için **2.984.252.443 altın** istiyordu =
       canlı sistemin (6.924.039) **431 katı**.
     · UpgradeUI `Economy.getCoins()` çağırıyordu; **bu fonksiyon hiç
       tanımlanmamış** (ilk commit'ten beri) → `coins` DAİMA 0 →
       `.can-buy` butonu HİÇ çizilmiyordu → panel her kategoride
       "💰500 GOLD NEEDED" gösteriyordu. Yani oyuncu 4 ayrı görünür
       düğmeden (oyun içi HUD "⚡ YÜKSELT" · duraklat "⚡ ARAÇ YÜKSELT" ·
       garaj "⚡ ADVANCED UPGRADE" · U tuşu) BOZUK bir panele varıyordu.

   ▶ ÇÖZÜM: tabloyu fiziğe bağlamak yerine (6 kategorinin 4'ü canlı
     sistemle ÇAKIŞIYOR → engine LV25 3,28× ile LV20 6,40× ÜST ÜSTE
     binerdi = 21× güç, denge yok olurdu) bu modül **canlı sisteme
     ince bir adaptör** hâline getirildi:
       seviye  → SaveData.getUpgrade / Economy.doUpgrade
       maliyet → Economy.UPGRADE_LEVEL_COSTS × STAT_UPGRADE_MULT
       tavan   → Economy.UP_MAX
       etki    → vehicles.js getStatModifier (fiziğin GERÇEKTEN okuduğu yol)
     Tek depo kaldığı için "aynı statı iki kez yükseltme" imkânsız.

   🔴 BURAYA SABİT MALİYET/ETKİ TABLOSU YAZMA. Hepsi çalışma anında
      Economy + vehicles.js'ten TÜRETİLİR; tavan/tablo değişince
      kendini düzeltir (kalite.js `_RAMPA` kuralının aynısı).
   ════════════════════════════════════════════════════════════════ */

var UpgradeSystem = (function() {

  /* ── Yalnızca GÖRSEL üst veri. Seviye/maliyet/etki BURADA TUTULMAZ. ──
        Anahtarlar Economy.STAT_UPGRADE_MULT ile aynı olmalı; burada
        karşılığı olmayan stat panelde gösterilmez (sessizce atlanır). */
  var _META = {
    engine:     { label: 'Engine',     icon: '⚙️', desc: 'Increases horsepower and top speed' },
    suspension: { label: 'Suspension', icon: '🔧', desc: 'Improves grip and jump recovery' },
    tires:      { label: 'Tire',       icon: '🔴', desc: 'Increases grip and acceleration' },
    fuel:       { label: 'Fuel Tank',  icon: '⛽', desc: 'Increases tank capacity and fuel efficiency' },
    gravity:    { label: 'Downforce',  icon: '🧲', desc: 'Increases downforce and ground grip' }
  };

  function _eco()   { return (typeof Economy !== 'undefined' && Economy) ? Economy : null; }
  function _upMax() { var e = _eco(); return (e && e.UP_MAX) ? e.UP_MAX : 25; }

  /* Kategori listesi = canlı sistemin stat listesi (kesişim) */
  function _kategoriler() {
    var e = _eco();
    var k = (e && e.STAT_UPGRADE_MULT) ? Object.keys(e.STAT_UPGRADE_MULT) : Object.keys(_META);
    return k.filter(function(c) { return !!_META[c]; });
  }

  /* Panel tanımları — her erişimde canlı tablodan TÜRETİLİR.
     costs[i] = (i+1). seviyeden (i+2)'ye çıkmanın maliyeti  →  index = seviye-1 */
  function _defs() {
    var e = _eco(), max = _upMax(), out = {};
    _kategoriler().forEach(function(cat) {
      var costs = [];
      for (var lv = 1; lv < max; lv++) {
        var c = (e && e.getUpgradeCost) ? e.getUpgradeCost(cat, lv) : null;
        costs.push(c == null ? 0 : c);
      }
      out[cat] = {
        label: _META[cat].label, icon: _META[cat].icon, desc: _META[cat].desc,
        maxLevel: max, costs: costs
      };
    });
    return out;
  }

  function init() { /* eski localStorage yüklemesi kaldırıldı — depo artık SaveData */ }

  /* Oyuncunun altını (UpgradeUI'nin tanımsız Economy.getCoins() çağrısının yerini alır) */
  function gold() {
    if (typeof SaveData === 'undefined' || !SaveData || !SaveData.get) return 0;
    return Number(SaveData.get('gold')) || 0;
  }

  /* Belirli araç+kategori seviyesi — CANLI depodan (1 tabanlı: 1 = yükseltilmemiş) */
  function getLevel(vehicleId, cat) {
    if (typeof SaveData === 'undefined' || !SaveData || !SaveData.getUpgrade) return 1;
    var lv = Number(SaveData.getUpgrade(vehicleId, cat));
    if (!isFinite(lv)) lv = 1;
    return Math.max(1, Math.min(_upMax(), lv));
  }

  /* Stat çarpanları — artık UYDURMA DEĞİL, fiziğin okuduğu gerçek formülden.
     (vehicles.js getStatModifier / _bOf). Bilgi amaçlıdır; fizik zaten
     buildVehicleConfig üzerinden aynı formülü doğrudan uygular. */
  function getStats(vehicleId) {
    var max = _upMax();
    var st = {
      powerMult: 1, topSpeedMult: 1,
      springMult: 1, dampMult: 1,
      gripMult: 1,
      tankMult: 1, efficiencyMult: 1,
      downforceMult: 0
    };
    if (typeof getStatModifier !== 'function') return st;
    var e = getStatModifier('engine',  getLevel(vehicleId, 'engine'));
    var f = getStatModifier('fuel',    getLevel(vehicleId, 'fuel'));
    var t = getStatModifier('tires',   getLevel(vehicleId, 'tires'));
    var g = getStatModifier('gravity', getLevel(vehicleId, 'gravity'));
    st.powerMult      = e.torqueMulti   || 1;
    st.topSpeedMult   = e.maxSpeedMulti || 1;
    st.gripMult       = 1 + (t.frictionBonus || 0);
    st.tankMult       = f.fuelMulti     || 1;
    st.efficiencyMult = 1 / Math.max(0.0001, f.burnRateMult || 1);
    st.downforceMult  = g.downforceMult || 0;
    // Süspansiyon: gerçek yay suspBobK/suspBobC (vehicles.js, 28 Tmz bugfix).
    // İlerleme katsayısını vehicles.js'ten AL — burada 19/(max-1) sabitleme.
    var b = (typeof _bOf === 'function')
          ? _bOf(getLevel(vehicleId, 'suspension'))
          : (getLevel(vehicleId, 'suspension') - 1) * (19 / Math.max(1, max - 1));
    st.springMult = Math.max(0.55, 1 - b * 0.012);   // yay YUMUŞAR (darbe emer)
    st.dampMult   = 1 + b * 0.030;                   // damper GÜÇLENİR
    return st;
  }

  /* Yükseltme sat — CANLI yola devreder (altın + SaveData.upgrades + başarım) */
  function purchase(vehicleId, cat) {
    var e = _eco();
    if (!e || typeof e.doUpgrade !== 'function') return false;
    if (!_META[cat]) return false;                       // canlı sistemde yok
    if (_kategoriler().indexOf(cat) < 0) return false;
    if (getLevel(vehicleId, cat) >= _upMax()) return false;
    return !!e.doUpgrade(vehicleId, cat);
  }

  /* Toplam yatırım (bilgi amaçlı) — canlı maliyet tablosundan */
  function totalSpent(vehicleId) {
    var e = _eco();
    if (!e || typeof e.getUpgradeCost !== 'function') return 0;
    var sum = 0;
    _kategoriler().forEach(function(cat) {
      var lv = getLevel(vehicleId, cat);
      for (var i = 1; i < lv; i++) {
        var c = e.getUpgradeCost(cat, i);
        if (c) sum += c;
      }
    });
    return sum;
  }

  /* Güç skoru 0-100 — seviye 1 = %0, tavan = %100 (1 tabanlı depoya göre) */
  function powerScore(vehicleId) {
    var max = _upMax(), cats = _kategoriler();
    if (!cats.length || max <= 1) return 0;
    var cur = 0;
    cats.forEach(function(c) { cur += (getLevel(vehicleId, c) - 1); });
    return Math.round((cur / (cats.length * (max - 1))) * 100);
  }

  return {
    init: init, getLevel: getLevel, getStats: getStats,
    purchase: purchase, totalSpent: totalSpent,
    powerScore: powerScore, gold: gold,
    // DEFS her erişimde canlı tablodan türetilir (sabit tablo YOK)
    get DEFS() { return _defs(); }
  };

})();

/* ════════════════════════════════════════════════════════════════
   UPGRADE UI – Canvas üstüne DOM overlay
   ════════════════════════════════════════════════════════════════ */

var UpgradeUI = (function() {

  var _el    = null;
  var _curVehicle = 'jeep';
  var _open  = false;

  /* ── Stil enjeksiyon (bir kez) ───────────────────────────── */
  function _injectStyle() {
    if (document.getElementById('upg-style')) return;
    var s = document.createElement('style');
    s.id = 'upg-style';
    s.textContent = [
      '.upg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);',
      '-webkit-backdrop-filter:blur(10px);z-index:9000;display:flex;align-items:center;',
      'justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s ease;}',
      '.upg-overlay.upg-vis{opacity:1;pointer-events:all;}',
      '.upg-panel{background:linear-gradient(160deg,#0e0b00,#1a1500);border:1px solid rgba(255,215,0,.25);',
      'border-radius:18px;padding:24px;width:min(520px,94vw);max-height:90vh;overflow-y:auto;',
      'box-shadow:0 24px 80px rgba(0,0,0,.7),0 0 40px rgba(255,215,0,.06);',
      'transform:scale(.94);transition:transform .25s ease;}',
      '.upg-overlay.upg-vis .upg-panel{transform:scale(1);}',
      '.upg-title{font-family:"Orbitron",sans-serif;font-weight:900;font-size:20px;',
      'color:#FFD700;text-align:center;margin-bottom:18px;letter-spacing:.06em;',
      'text-shadow:0 0 20px rgba(255,215,0,.5);}',
      '.upg-score{text-align:center;margin-bottom:20px;}',
      '.upg-score-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.08);',
      'overflow:hidden;margin-top:6px;}',
      '.upg-score-fill{height:100%;border-radius:4px;',
      'background:linear-gradient(90deg,#e6b800,#FFD700,#fff176);transition:width .5s ease;}',
      '.upg-score-label{font-size:11px;color:rgba(255,215,0,.7);margin-top:4px;',
      'font-family:"Orbitron",sans-serif;letter-spacing:.08em;}',
      '.upg-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
      '@media(max-width:400px){.upg-grid{grid-template-columns:1fr;}}',
      '.upg-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);',
      'border-radius:12px;padding:14px;transition:border-color .2s,box-shadow .2s;}',
      '.upg-card:hover{border-color:rgba(255,215,0,.25);box-shadow:0 4px 20px rgba(255,215,0,.08);}',
      '.upg-cat-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;}',
      '.upg-cat-icon{font-size:20px;}',
      '.upg-cat-name{font-family:"Orbitron",sans-serif;font-size:12px;font-weight:700;',
      'color:#fff;letter-spacing:.04em;}',
      '.upg-cat-desc{font-size:10px;color:rgba(255,255,255,.45);margin-bottom:10px;line-height:1.4;}',
      '.upg-lvbar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);',
      'overflow:hidden;margin-bottom:4px;}',
      '.upg-lvfill{height:100%;border-radius:3px;',
      'background:linear-gradient(90deg,#e6b800,#FFD700);transition:width .35s ease;}',
      '.upg-lvfill.max{background:linear-gradient(90deg,#ff6b00,#FFD700);',
      'box-shadow:0 0 6px rgba(255,180,0,.5);}',
      '.upg-lvtext{font-family:"Orbitron",sans-serif;font-size:10px;letter-spacing:.06em;',
      'color:rgba(255,215,0,.75);margin-bottom:10px;}',
      '.upg-btn{width:100%;padding:9px 0;border-radius:8px;border:none;cursor:pointer;',
      'font-family:"Orbitron",sans-serif;font-size:11px;font-weight:700;letter-spacing:.06em;',
      'transition:transform .15s,box-shadow .15s;}',
      '.upg-btn.can-buy{background:linear-gradient(135deg,#c89600,#FFD700);color:#000;',
      'box-shadow:0 4px 16px rgba(255,215,0,.3);}',
      '.upg-btn.can-buy:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(255,215,0,.45);}',
      '.upg-btn.can-buy:active{transform:translateY(0);}',
      '.upg-btn.maxed{background:linear-gradient(135deg,#ff6b00,#FFD700);color:#000;cursor:default;}',
      '.upg-btn.no-cash{background:rgba(255,255,255,.07);color:rgba(255,255,255,.3);cursor:not-allowed;}',
      '.upg-close{display:block;margin:20px auto 0;padding:10px 32px;',
      'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);',
      'border-radius:8px;color:rgba(255,255,255,.6);font-family:"Orbitron",sans-serif;',
      'font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.06em;',
      'transition:background .2s,color .2s;}',
      '.upg-close:hover{background:rgba(255,255,255,.13);color:#fff;}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Overlay DOM'u oluştur ───────────────────────────────── */
  function _build() {
    if (_el) return;
    _injectStyle();
    _el = document.createElement('div');
    _el.className = 'upg-overlay';
    _el.innerHTML = '<div class="upg-panel" id="upg-panel-inner"></div>';
    document.body.appendChild(_el);
    _el.addEventListener('click', function(e) {
      if (e.target === _el) close();
    });
  }

  /* ── İçeriği render et ───────────────────────────────────── */
  function _render() {
    var panel = document.getElementById('upg-panel-inner');
    if (!panel) return;

    var score = UpgradeSystem.powerScore(_curVehicle);
    // 🔴 BUGFIX(3 Ağu): burada `Economy.getCoins()` çağrılıyordu; O FONKSİYON
    //   PROJEDE HİÇ TANIMLI DEĞİL (ilk commit'ten beri) → coins DAİMA 0 →
    //   `canBuy` daima false → satın alma butonu HİÇ ÇİZİLMİYORDU.
    //   Doğrusu tek kaynak: SaveData'daki altın (UpgradeSystem.gold()).
    var coins = UpgradeSystem.gold();
    var DEFS  = UpgradeSystem.DEFS;   // getter — bir kez al, forEach içinde yeniden türetme

    var html = '<div class="upg-title">⚡ VEHICLE UPGRADES</div>';
    html += '<div class="upg-score">';
    html += '<div style="font-size:13px;color:rgba(255,255,255,.7);">Power Score</div>';
    html += '<div class="upg-score-bar"><div class="upg-score-fill" style="width:'+score+'%"></div></div>';
    html += '<div class="upg-score-label">'+score+' / 100</div>';
    html += '<div style="margin-top:8px;font-size:12px;color:#FFD700;">💰 '+coins.toLocaleString()+' Gold</div>';
    // Koşu sırasında açıldıysa: araç ayarları koşu başında kuruluyor (buildVehicleConfig),
    // yeni seviye ancak SONRAKİ koşuda hissedilir. Sessiz kalmak "yine bozuk" izlenimi verir.
    if (typeof Main !== 'undefined' && Main && Main.mode === 'game') {
      html += '<div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,.45);">Applies on next run</div>';
    }
    html += '</div>';
    html += '<div class="upg-grid">';

    Object.keys(DEFS).forEach(function(cat) {
      var def = DEFS[cat];
      var lvl = UpgradeSystem.getLevel(_curVehicle, cat);      // 1 tabanlı: 1 = yükseltilmemiş
      var maxed = lvl >= def.maxLevel;
      var cost = maxed ? 0 : (def.costs[lvl - 1] || 0);
      var canBuy = !maxed && coins >= cost;

      html += '<div class="upg-card">';
      html += '<div class="upg-cat-header">';
      html += '<span class="upg-cat-icon">'+def.icon+'</span>';
      html += '<span class="upg-cat-name">'+def.label.toUpperCase()+'</span>';
      html += '</div>';
      html += '<div class="upg-cat-desc">'+def.desc+'</div>';
      // 🔴 25 ayrı pip dar telefonda (360 px, 2 sütun) pip başına ~2 px'e düşüyor
      //   ve gap'lerle taşıyordu → tek dolum çubuğu + sayısal seviye.
      var _pct = Math.max(0, Math.min(100, Math.round(((lvl - 1) / Math.max(1, def.maxLevel - 1)) * 100)));
      html += '<div class="upg-lvbar"><div class="upg-lvfill'+(maxed ? ' max' : '')+'" style="width:'+_pct+'%"></div></div>';
      html += '<div class="upg-lvtext">LV '+lvl+' / '+def.maxLevel+'</div>';

      if (maxed) {
        html += '<button class="upg-btn maxed">✓ MAX LEVEL</button>';
      } else if (canBuy) {
        html += '<button class="upg-btn can-buy" data-cat="'+cat+'">LEVEL '+(lvl+1)+' — 💰'+cost.toLocaleString()+'</button>';
      } else {
        html += '<button class="upg-btn no-cash">💰'+cost.toLocaleString()+' GOLD NEEDED</button>';
      }
      html += '</div>';
    });

    html += '</div>';
    html += '<button class="upg-close" id="upg-close-btn">CLOSE</button>';
    panel.innerHTML = html;

    /* Satın al butonları */
    panel.querySelectorAll('.upg-btn.can-buy').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cat = btn.getAttribute('data-cat');
        var ok = UpgradeSystem.purchase(_curVehicle, cat);
        if (ok) {
          _flashSuccess(btn);
          setTimeout(_render, 300);
        }
      });
    });
    document.getElementById('upg-close-btn').addEventListener('click', close);
  }

  function _flashSuccess(btn) {
    btn.textContent = '✓ PURCHASED!';
    btn.style.background = 'linear-gradient(135deg,#1a8a3a,#2ECC71)';
    btn.style.color = '#fff';
    btn.disabled = true;
  }

  /* ── Public API ──────────────────────────────────────────── */
  function open(vehicleId) {
    _build();
    _curVehicle = vehicleId || 'jeep';
    _render();
    requestAnimationFrame(function() { _el.classList.add('upg-vis'); });
    _open = true;
  }

  function close() {
    if (_el) _el.classList.remove('upg-vis');
    _open = false;
  }

  function isOpen() { return _open; }

  /* Escape ile kapat */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && _open) close();
  });

  return { open: open, close: close, isOpen: isOpen };

})();

/* Init on load */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', UpgradeSystem.init);
} else {
  UpgradeSystem.init();
}

// ============================================================
// DAILY_REWARDS sistemi
// ============================================================
const DAILY_REWARD_TABLE = [
  { day: 1,  type: 'gold',    amount: 200 },
  { day: 2,  type: 'gold',    amount: 350 },
  { day: 3,  type: 'diamond', amount: 5 },
  { day: 4,  type: 'gold',    amount: 500 },
  { day: 5,  type: 'part',    id: 'engine_lvl1', label: 'Engine Lvl1' },
  { day: 6,  type: 'gold',    amount: 750 },
  { day: 7,  type: 'diamond', amount: 15 },
  { day: 8,  type: 'gold',    amount: 600 },
  { day: 9,  type: 'gold',    amount: 800 },
  { day: 10, type: 'vehicle', id: 'jeep',        label: 'Jeep' },
  { day: 11, type: 'gold',    amount: 700 },
  { day: 12, type: 'diamond', amount: 20 },
  { day: 13, type: 'gold',    amount: 900 },
  { day: 14, type: 'part',    id: 'tyre_lvl2',   label: 'Tire Lvl2' },
  { day: 15, type: 'diamond', amount: 30 },
  { day: 16, type: 'gold',    amount: 1000 },
  { day: 17, type: 'gold',    amount: 1100 },
  { day: 18, type: 'part',    id: 'fuel_lvl2',   label: 'Fuel Tank Lvl2' },
  { day: 19, type: 'gold',    amount: 1300 },
  { day: 20, type: 'diamond', amount: 40 },
  { day: 21, type: 'vehicle', id: 'monster',     label: 'Monster Truck' },
  { day: 22, type: 'gold',    amount: 1500 },
  { day: 23, type: 'diamond', amount: 50 },
  { day: 24, type: 'gold',    amount: 1600 },
  { day: 25, type: 'part',    id: 'nitro_lvl3',  label: 'Nitro Lvl3' },
  { day: 26, type: 'gold',    amount: 1800 },
  { day: 27, type: 'diamond', amount: 60 },
  { day: 28, type: 'gold',    amount: 2000 },
  { day: 29, type: 'diamond', amount: 80 },
  { day: 30, type: 'vehicle', id: 'supercar',    label: 'Supercar' }
];

const DAILY_REWARDS = {
  _storageKey: 'ahmet_daily_reward',

  _getState() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this._storageKey) : null;
      return raw ? JSON.parse(raw) : { lastClaim: 0, streak: 0 };
    } catch (e) { return { lastClaim: 0, streak: 0 }; }
  },

  _saveState(state) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(this._storageKey, JSON.stringify(state));
    } catch (e) {}
  },

  getDailyRewardStatus() {
    const state = this._getState();
    const now = Date.now();
    const dayMs = 86400000;
    const hoursSinceLast = (now - state.lastClaim) / 3600000;
    const canClaim = hoursSinceLast >= 20;
    const missed = hoursSinceLast > 48;
    const streak = missed ? 0 : state.streak;
    const dayIndex = Math.min(29, streak % 30);
    return {
      canClaim,
      streak: state.streak,
      currentDay: dayIndex + 1,
      reward: DAILY_REWARD_TABLE[dayIndex],
      nextClaimIn: canClaim ? 0 : Math.ceil(20 - hoursSinceLast)
    };
  },

  claimDailyReward() {
    const status = this.getDailyRewardStatus();
    if (!status.canClaim) return { success: false, reason: 'not_ready', hoursLeft: status.nextClaimIn };
    const state = this._getState();
    const now = Date.now();
    const missed = state.lastClaim > 0 && (now - state.lastClaim) > 48 * 3600000;
    const newStreak = missed ? 1 : state.streak + 1;
    this._saveState({ lastClaim: now, streak: newStreak });
    return { success: true, reward: status.reward, newStreak };
  },

  drawDailyRewardCalendar(ctx, W, H, currentDay) {
    const panelW = Math.min(640, W - 40);
    const panelH = 380;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(8,8,20,0.96)';
    ctx.strokeStyle = '#334488';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('DAILY REWARDS', W / 2, py + 16);

    const cols = 5; const rows = 6;
    const cellW = (panelW - 32) / cols;
    const cellH = (panelH - 72) / rows;
    const startX = px + 16;
    const startY = py + 58;

    for (let i = 0; i < 30; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * cellW;
      const cy = startY + row * cellH;
      const reward = DAILY_REWARD_TABLE[i];
      const past = i < currentDay - 1;
      const active = i === currentDay - 1;

      ctx.fillStyle = past ? 'rgba(0,200,80,0.2)' : (active ? 'rgba(255,200,0,0.25)' : 'rgba(255,255,255,0.05)');
      ctx.strokeStyle = active ? '#ffcc00' : (past ? '#00aa44' : '#222244');
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(cx + 2, cy + 2, cellW - 4, cellH - 4, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = active ? '#ffdd00' : (past ? '#00ff88' : '#888aaa');
      ctx.font = `bold ${Math.round(cellH * 0.22)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`Day ${i + 1}`, cx + cellW / 2, cy + 6);

      const icon = reward.type === 'gold' ? '🪙' : reward.type === 'diamond' ? '💎' : reward.type === 'vehicle' ? '🚗' : '🔧';
      ctx.font = `${Math.round(cellH * 0.32)}px sans-serif`;
      ctx.fillText(icon, cx + cellW / 2, cy + cellH * 0.36);

      ctx.fillStyle = '#aaaacc';
      ctx.font = `${Math.round(cellH * 0.18)}px monospace`;
      const label = reward.amount ? String(reward.amount) : (reward.label || '');
      ctx.fillText(label, cx + cellW / 2, cy + cellH * 0.72);
    }
    ctx.restore();
  }
};

// ============================================================
// SEASON_PASS sistemi
// ============================================================
const FREE_TIER_REWARDS = {};
const PREMIUM_TIER_REWARDS = {};
const SEASON_PASS_TIERS = [];

(function buildSeasonTiers() {
  for (let i = 1; i <= 50; i++) {
    const tier = {
      level: i,
      xpRequired: i * 1000,
      free: i % 10 === 0
        ? { type: 'gold', amount: i * 150 }
        : (i % 5 === 0 ? { type: 'diamond', amount: i * 2 } : { type: 'gold', amount: i * 60 }),
      premium: i % 10 === 0
        ? { type: 'vehicle', id: `season_vehicle_${Math.floor(i / 10)}`, label: `Season Vehicle ${Math.floor(i / 10)}` }
        : (i % 5 === 0 ? { type: 'diamond', amount: i * 5 } : { type: 'gold', amount: i * 120 })
    };
    SEASON_PASS_TIERS.push(tier);
    FREE_TIER_REWARDS[i] = tier.free;
    PREMIUM_TIER_REWARDS[i] = tier.premium;
  }
})();

const SEASON_PASS = {
  _storageKey: 'ahmet_season_pass',

  _getState() {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this._storageKey) : null;
      return raw ? JSON.parse(raw) : { xp: 0, premium: false, claimedFree: [], claimedPremium: [] };
    } catch (e) { return { xp: 0, premium: false, claimedFree: [], claimedPremium: [] }; }
  },

  _saveState(s) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(this._storageKey, JSON.stringify(s));
    } catch (e) {}
  },

  addSeasonXP(amount) {
    const s = this._getState();
    s.xp = (s.xp || 0) + amount;
    this._saveState(s);
    return s.xp;
  },

  getSeasonTier() {
    const s = this._getState();
    let cumulativeXp = 0;
    for (let i = 0; i < SEASON_PASS_TIERS.length; i++) {
      cumulativeXp += SEASON_PASS_TIERS[i].xpRequired;
      if (s.xp < cumulativeXp) return { tier: i + 1, xp: s.xp, nextAt: cumulativeXp, premium: s.premium };
    }
    return { tier: 50, xp: s.xp, nextAt: null, premium: s.premium };
  },

  claimReward(level, type) {
    const s = this._getState();
    if (type === 'free') {
      if (s.claimedFree.includes(level)) return { success: false, reason: 'already_claimed' };
      s.claimedFree.push(level);
      this._saveState(s);
      return { success: true, reward: FREE_TIER_REWARDS[level] };
    } else if (type === 'premium') {
      if (!s.premium) return { success: false, reason: 'no_premium' };
      if (s.claimedPremium.includes(level)) return { success: false, reason: 'already_claimed' };
      s.claimedPremium.push(level);
      this._saveState(s);
      return { success: true, reward: PREMIUM_TIER_REWARDS[level] };
    }
    return { success: false, reason: 'invalid_type' };
  }
};

// ============================================================
// LUCKY_WHEEL sistemi
// ============================================================
const WHEEL_PRIZES = [
  { label: 'Gold x500',    type: 'gold',    amount: 500,  weight: 30, color: '#ffcc00' },
  { label: 'Diamond x5',   type: 'diamond', amount: 5,    weight: 15, color: '#44ccff' },
  { label: 'Vehicle Box',  type: 'vehicle', id: 'random', weight: 5,  color: '#ff44ff' },
  { label: 'Nitro x3',     type: 'nitro',   amount: 3,    weight: 20, color: '#00aaff' },
  { label: 'Fuel x5',      type: 'fuel',    amount: 5,    weight: 20, color: '#00ff88' },
  { label: 'Part Box',     type: 'part',    id: 'random', weight: 15, color: '#ff8800' },
  { label: '2X Multiplier',type: 'multiplier', value: 2,  weight: 8,  color: '#ff4444' },
  { label: 'Missed!',      type: 'miss',    amount: 0,    weight: 12, color: '#555566' }
];

const LUCKY_WHEEL = {
  _lastSpin: 0,
  _cooldownMs: 8 * 3600 * 1000,

  canSpin() {
    return Date.now() - this._lastSpin >= this._cooldownMs;
  },

  spinWheel() {
    if (!this.canSpin()) {
      return { success: false, reason: 'cooldown', nextSpinIn: Math.ceil((this._cooldownMs - (Date.now() - this._lastSpin)) / 60000) };
    }
    const totalWeight = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * totalWeight;
    let chosen = WHEEL_PRIZES[WHEEL_PRIZES.length - 1];
    for (const prize of WHEEL_PRIZES) {
      r -= prize.weight;
      if (r <= 0) { chosen = prize; break; }
    }
    this._lastSpin = Date.now();
    const prizeIndex = WHEEL_PRIZES.indexOf(chosen);
    const sliceAngle = (Math.PI * 2) / WHEEL_PRIZES.length;
    const targetAngle = Math.PI * 2 * 3 + (prizeIndex * sliceAngle) + sliceAngle / 2;
    return { success: true, prize: chosen, prizeIndex, spinAngle: targetAngle };
  },

  drawLuckyWheel(ctx, x, y, r, spinAngle, t) {
    const sliceAngle = (Math.PI * 2) / WHEEL_PRIZES.length;
    ctx.save();

    // Dış gölge
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dilimler
    for (let i = 0; i < WHEEL_PRIZES.length; i++) {
      const startA = spinAngle + i * sliceAngle;
      const endA = startA + sliceAngle;
      const prize = WHEEL_PRIZES[i];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Etiket
      const midA = startA + sliceAngle / 2;
      const labelDist = r * 0.62;
      ctx.save();
      ctx.translate(x + Math.cos(midA) * labelDist, y + Math.sin(midA) * labelDist);
      ctx.rotate(midA + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(r * 0.09)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(prize.label, 0, 0);
      ctx.restore();
    }

    // Merkez daire
    const cGrad = ctx.createRadialGradient(x, y, 0, x, y, r * 0.15);
    cGrad.addColorStop(0, '#ffffff');
    cGrad.addColorStop(1, '#888888');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Üst ok (gösterge)
    ctx.fillStyle = '#ff2200';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, y - r - 4);
    ctx.lineTo(x - 14, y - r - 28);
    ctx.lineTo(x + 14, y - r - 28);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
};

// ============================================================
// AUCTION_HOUSE sistemi
// ============================================================
const AUCTION_ITEMS = [
  { id: 'auc_001', name: 'Rare Supercar',        type: 'vehicle', basePrice: 5000,  endTime: Date.now() + 3600000,  topBid: 5000,  topBidder: null },
  { id: 'auc_002', name: 'Engine Turbo Lvl5',    type: 'part',    basePrice: 2000,  endTime: Date.now() + 7200000,  topBid: 2000,  topBidder: null },
  { id: 'auc_003', name: 'Monster Wheel',        type: 'part',    basePrice: 1500,  endTime: Date.now() + 5400000,  topBid: 1500,  topBidder: null },
  { id: 'auc_004', name: 'Gold Nitro Tank',      type: 'part',    basePrice: 3000,  endTime: Date.now() + 10800000, topBid: 3000,  topBidder: null },
  { id: 'auc_005', name: 'Legendary Vehicle Skin', type: 'skin',  basePrice: 800,   endTime: Date.now() + 1800000,  topBid: 800,   topBidder: null },
  { id: 'auc_006', name: 'Rally Champion',       type: 'vehicle', basePrice: 8000,  endTime: Date.now() + 86400000, topBid: 8000,  topBidder: null },
  { id: 'auc_007', name: 'Super Gearbox',        type: 'part',    basePrice: 1200,  endTime: Date.now() + 3000000,  topBid: 1200,  topBidder: null },
  { id: 'auc_008', name: 'Gold Frame',           type: 'part',    basePrice: 2500,  endTime: Date.now() + 14400000, topBid: 2500,  topBidder: null },
  { id: 'auc_009', name: 'Supersonic Wing',      type: 'part',    basePrice: 4000,  endTime: Date.now() + 18000000, topBid: 4000,  topBidder: null },
  { id: 'auc_010', name: 'Legendary Racer',      type: 'vehicle', basePrice: 12000, endTime: Date.now() + 172800000,topBid: 12000, topBidder: null }
];

const AUCTION_HOUSE = {
  getAuctionItems() {
    const now = Date.now();
    return AUCTION_ITEMS.filter(item => item.endTime > now);
  },

  getTopBid(itemId) {
    const item = AUCTION_ITEMS.find(i => i.id === itemId);
    if (!item) return null;
    return { amount: item.topBid, bidder: item.topBidder };
  },

  placeBid(itemId, amount, bidderId = 'player') {
    const item = AUCTION_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, reason: 'item_not_found' };
    if (Date.now() >= item.endTime) return { success: false, reason: 'auction_ended' };
    const minBid = Math.ceil(item.topBid * 1.05);
    if (amount < minBid) return { success: false, reason: 'bid_too_low', minimumBid: minBid };
    item.topBid = amount;
    item.topBidder = bidderId;
    return { success: true, newTopBid: amount, item };
  },

  getRemainingTime(itemId) {
    const item = AUCTION_ITEMS.find(i => i.id === itemId);
    if (!item) return 0;
    return Math.max(0, item.endTime - Date.now());
  }
};

// ============================================================
// BUNDLE_DEALS objesi
// ============================================================
const BUNDLES = {
  starter: {
    id: 'starter', name: 'Starter Pack', price: 99, currency: 'diamond',
    items: [{ type: 'gold', amount: 5000 }, { type: 'fuel', amount: 10 }, { type: 'nitro', amount: 5 }],
    originalValue: 180, tag: 'STARTER'
  },
  racer: {
    id: 'racer', name: 'Racer Pack', price: 299, currency: 'diamond',
    items: [{ type: 'gold', amount: 15000 }, { type: 'vehicle', id: 'rally_car', label: 'Rally Car' }, { type: 'part', id: 'engine_lvl3', label: 'Engine Lvl3' }],
    originalValue: 550, tag: 'POPULAR'
  },
  champion: {
    id: 'champion', name: 'Champion Pack', price: 599, currency: 'diamond',
    items: [{ type: 'gold', amount: 35000 }, { type: 'diamond', amount: 200 }, { type: 'vehicle', id: 'supercar', label: 'Supercar' }, { type: 'part', id: 'nitro_lvl4', label: 'Nitro Lvl4' }],
    originalValue: 1200, tag: 'VALUE'
  },
  legend: {
    id: 'legend', name: 'Legend Pack', price: 999, currency: 'diamond',
    items: [{ type: 'gold', amount: 80000 }, { type: 'diamond', amount: 500 }, { type: 'vehicle', id: 'legend_truck', label: 'Legend Truck' }, { type: 'part', id: 'engine_lvl5', label: 'Engine Lvl5' }, { type: 'season_pass', label: 'Premium Season Pass' }],
    originalValue: 2500, tag: 'LEGEND'
  },
  ultimate: {
    id: 'ultimate', name: 'Ultimate Pack', price: 1999, currency: 'diamond',
    items: [{ type: 'gold', amount: 200000 }, { type: 'diamond', amount: 1500 }, { type: 'vehicle', id: 'ultra_vehicle', label: 'Ultra Vehicle' }, { type: 'all_parts', label: 'All Parts Max' }, { type: 'season_pass', label: 'Premium Season Pass' }, { type: 'vip', duration: 30, label: 'VIP 30 Days' }],
    originalValue: 6000, tag: 'BEST VALUE'
  }
};

const BUNDLE_DEALS = {
  purchaseBundle(bundleId) {
    const bundle = BUNDLES[bundleId];
    if (!bundle) return { success: false, reason: 'bundle_not_found' };
    return { success: true, bundle, items: bundle.items };
  },
  getBundleValue(bundleId) {
    const bundle = BUNDLES[bundleId];
    if (!bundle) return 0;
    return bundle.originalValue;
  },
  getSavingsPercent(bundleId) {
    const bundle = BUNDLES[bundleId];
    if (!bundle) return 0;
    return Math.round((1 - bundle.price / bundle.originalValue) * 100);
  },
  getAllBundles() { return Object.values(BUNDLES); }
};

// ============================================================
// REFERRAL_SYSTEM
// ============================================================
const REFERRAL_REWARDS = {
  referrer: { gold: 1000, diamond: 10 },
  referee:  { gold: 500,  diamond: 5 }
};

const REFERRAL_SYSTEM = {
  _usedCodes: new Set(),

  generateReferralCode(playerId = 'player') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = playerId.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
    while (code.length < 4) code += 'X';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  },

  applyReferralCode(code, currentPlayerId = 'player') {
    if (!code || code.length < 8) return { success: false, reason: 'invalid_code' };
    if (this._usedCodes.has(currentPlayerId)) return { success: false, reason: 'already_used' };
    const referrerId = code.slice(0, 4);
    if (referrerId.toUpperCase() === currentPlayerId.slice(0, 4).toUpperCase()) {
      return { success: false, reason: 'own_code' };
    }
    this._usedCodes.add(currentPlayerId);
    return {
      success: true,
      referrerId,
      refereeReward: REFERRAL_REWARDS.referee,
      referrerReward: REFERRAL_REWARDS.referrer
    };
  }
};

// ============================================================
// ECONOMY_STATS objesi
// ============================================================
const SPENDING_CATEGORIES = ['vehicle', 'upgrade', 'fuel', 'nitro', 'bundle', 'auction', 'cosmetic', 'other'];
const EARNING_SOURCES = ['race_win', 'daily_reward', 'season_pass', 'achievement', 'lucky_wheel', 'referral', 'ad_watch', 'iap'];

const ECONOMY_STATS = (function () {
  const spendLog = {};
  const earnLog = {};
  SPENDING_CATEGORIES.forEach(c => { spendLog[c] = 0; });
  EARNING_SOURCES.forEach(s => { earnLog[s] = 0; });

  return {
    trackSpend(category, amount) {
      if (!SPENDING_CATEGORIES.includes(category)) category = 'other';
      spendLog[category] = (spendLog[category] || 0) + amount;
    },
    trackEarn(source, amount) {
      if (!EARNING_SOURCES.includes(source)) source = 'other';
      earnLog[source] = (earnLog[source] || 0) + amount;
    },
    getSpendingReport() {
      const totalSpend = Object.values(spendLog).reduce((a, b) => a + b, 0);
      const totalEarn = Object.values(earnLog).reduce((a, b) => a + b, 0);
      return {
        totalSpend,
        totalEarn,
        netBalance: totalEarn - totalSpend,
        byCategory: { ...spendLog },
        bySource: { ...earnLog },
        topCategory: Object.entries(spendLog).sort((a, b) => b[1] - a[1])[0],
        topSource: Object.entries(earnLog).sort((a, b) => b[1] - a[1])[0]
      };
    },
    resetStats() {
      SPENDING_CATEGORIES.forEach(c => { spendLog[c] = 0; });
      EARNING_SOURCES.forEach(s => { earnLog[s] = 0; });
    }
  };
})();

// ============================================================
// PRICE_CATALOG — merkezi fiyat tablosu
// ============================================================
const PRICE_CATALOG = {
  // Araçlar
  vehicles: {
    jeep:          { gold: 2500,  diamond: 0 },
    buggy:         { gold: 4000,  diamond: 0 },
    monster_truck: { gold: 8000,  diamond: 0 },
    rally_car:     { gold: 0,     diamond: 150 },
    supercar:      { gold: 0,     diamond: 300 },
    formula:       { gold: 0,     diamond: 500 },
    legend_truck:  { gold: 0,     diamond: 800 },
    tank:          { gold: 15000, diamond: 0 }
  },
  // Yükseltmeler (seviye başına)
  upgrades: {
    engine:    [500, 1000, 2000, 4000, 8000],
    suspension:[400,  800, 1600, 3200, 6400],
    tyre:      [300,  600, 1200, 2400, 4800],
    fuel_tank: [350,  700, 1400, 2800, 5600],
    nitro:     [600, 1200, 2400, 4800, 9600],
    grip:      [250,  500, 1000, 2000, 4000]
  },
  // Sarf malzeme
  consumables: {
    fuel_refill:  { gold: 150 },
    nitro_pack:   { gold: 200 },
    repair_kit:   { gold: 100 },
    shield:       { gold: 300 },
    coin_magnet:  { gold: 180 }
  },
  // Kozmetik
  cosmetics: {
    paint_basic:   { gold: 500 },
    paint_premium: { diamond: 50 },
    decal_set:     { gold: 1000 },
    wheel_skin:    { diamond: 30 },
    driver_skin:   { diamond: 80 },
    // ── Carnival / Festive cosmetics (additive) ──
    paint_carnival:    { gold: 1800 },
    paint_confetti:    { diamond: 45 },
    paint_neon_fiesta: { gold: 2600 },
    trail_confetti:    { gold: 2200 },
    trail_fireworks:   { diamond: 40 },
    trail_streamers:   { gold: 1900 },
    aura_carnival:     { diamond: 60 },
    aura_festive_glow: { diamond: 75 },
    aura_sparkler:     { gold: 3200 },
    decal_carnival:    { gold: 1300 },
    wheel_festive:     { diamond: 48 }
  },
  // Premium para birimi
  iap: {
    diamond_80:   { usd: 0.99,  diamonds: 80 },
    diamond_200:  { usd: 1.99,  diamonds: 200 },
    diamond_550:  { usd: 4.99,  diamonds: 550 },
    diamond_1200: { usd: 9.99,  diamonds: 1200 },
    diamond_2600: { usd: 19.99, diamonds: 2600 },
    diamond_7000: { usd: 49.99, diamonds: 7000 }
  },

  getVehiclePrice(id) { return this.vehicles[id] || null; },
  getUpgradePrice(type, level) {
    const list = this.upgrades[type];
    if (!list) return null;
    const idx = Math.max(0, Math.min(list.length - 1, level - 1));
    return { gold: list[idx] };
  },
  getConsumablePrice(id) { return this.consumables[id] || null; },
  getCosmeticPrice(id) { return this.cosmetics[id] || null; },
  getDiamondPackage(id) { return this.iap[id] || null; },
  getAllVehicleIds() { return Object.keys(this.vehicles); }
};


// =============================================================================
// BATTLE_PASS_SYSTEM MODULE
// =============================================================================
(function() {
    'use strict';

    var BATTLE_PASS_SYSTEM = (function() {

        var CURRENT_SEASON = {
            id: 'S2024_01',
            name: 'Season 1: Mountain Rush',
            startDate: new Date('2024-01-01T00:00:00Z'),
            endDate: new Date('2024-03-31T23:59:59Z'),
            maxTier: 50,
            premiumPrice: 950,
            premiumPlusBundlePrice: 2800
        };

        var XP_SOURCES = {
            matches:      { xp: 10,  label: 'Match Completed' },
            distance_km:  { xp: 5,   label: 'Per KM Traveled' },
            tricks:       { xp: 2,   label: 'Trick Performed' },
            dailyBonus:   { xp: 100, label: 'Daily Login Bonus' },
            weeklyBonus:  { xp: 500, label: 'Weekly Challenge' },
            achievementSm:{ xp: 50,  label: 'Small Achievement' },
            achievementMd:{ xp: 150, label: 'Medium Achievement' },
            achievementLg:{ xp: 300, label: 'Large Achievement' },
            eventBonus:   { xp: 200, label: 'Event Participation' }
        };

        var TIER_XP_CURVE = (function() {
            var tiers = [];
            var cumulative = 0;
            for (var i = 1; i <= 50; i++) {
                var xpNeeded = 1000 + (i - 1) * 150;
                cumulative += xpNeeded;
                tiers.push({ tier: i, xpFromPrev: xpNeeded, cumulativeXp: cumulative });
            }
            return tiers;
        })();

        var FREE_REWARDS = [
            { tier: 1,  type: 'coins',     qty: 100,   label: '100 Coins' },
            { tier: 2,  type: 'booster',   id: 'xp_boost_sm', label: 'XP Boost (30min)' },
            { tier: 3,  type: 'coins',     qty: 150,   label: '150 Coins' },
            { tier: 4,  type: 'cosmetic',  id: 'decal_star', label: 'Star Decal' },
            { tier: 5,  type: 'coins',     qty: 200,   label: '200 Coins' },
            { tier: 6,  type: 'material',  id: 'mat_iron', qty: 5, label: '5x Iron' },
            { tier: 7,  type: 'coins',     qty: 200,   label: '200 Coins' },
            { tier: 8,  type: 'booster',   id: 'coin_boost_sm', label: 'Coin Boost (1hr)' },
            { tier: 9,  type: 'coins',     qty: 250,   label: '250 Coins' },
            { tier: 10, type: 'vehicle_part', id: 'engine_t1', label: 'T1 Engine Upgrade' },
            { tier: 11, type: 'coins',     qty: 250,   label: '250 Coins' },
            { tier: 12, type: 'material',  id: 'mat_steel', qty: 3, label: '3x Steel' },
            { tier: 13, type: 'coins',     qty: 300,   label: '300 Coins' },
            { tier: 14, type: 'booster',   id: 'xp_boost_md', label: 'XP Boost (1hr)' },
            { tier: 15, type: 'coins',     qty: 300,   label: '300 Coins' },
            { tier: 16, type: 'cosmetic',  id: 'paint_silver', label: 'Silver Paint' },
            { tier: 17, type: 'coins',     qty: 350,   label: '350 Coins' },
            { tier: 18, type: 'material',  id: 'mat_rubber', qty: 4, label: '4x Rubber' },
            { tier: 19, type: 'coins',     qty: 350,   label: '350 Coins' },
            { tier: 20, type: 'vehicle_part', id: 'suspension_t1', label: 'T1 Suspension' },
            { tier: 21, type: 'coins',     qty: 400,   label: '400 Coins' },
            { tier: 22, type: 'material',  id: 'mat_carbon', qty: 2, label: '2x Carbon Fiber' },
            { tier: 23, type: 'coins',     qty: 400,   label: '400 Coins' },
            { tier: 24, type: 'booster',   id: 'fuel_refill', label: 'Fuel Refill' },
            { tier: 25, type: 'coins',     qty: 500,   label: '500 Coins' },
            { tier: 26, type: 'cosmetic',  id: 'wheel_chrome', label: 'Chrome Wheels' },
            { tier: 27, type: 'coins',     qty: 500,   label: '500 Coins' },
            { tier: 28, type: 'material',  id: 'mat_titanium', qty: 2, label: '2x Titanium' },
            { tier: 29, type: 'coins',     qty: 550,   label: '550 Coins' },
            { tier: 30, type: 'vehicle_part', id: 'tires_t2', label: 'T2 Tires' },
            { tier: 31, type: 'coins',     qty: 550,   label: '550 Coins' },
            { tier: 32, type: 'booster',   id: 'xp_boost_lg', label: 'XP Boost (2hr)' },
            { tier: 33, type: 'coins',     qty: 600,   label: '600 Coins' },
            { tier: 34, type: 'material',  id: 'mat_gem_frag', qty: 3, label: '3x Gem Fragment' },
            { tier: 35, type: 'coins',     qty: 600,   label: '600 Coins' },
            { tier: 36, type: 'cosmetic',  id: 'livery_flames', label: 'Flame Livery' },
            { tier: 37, type: 'coins',     qty: 650,   label: '650 Coins' },
            { tier: 38, type: 'material',  id: 'mat_alloy', qty: 3, label: '3x Alloy' },
            { tier: 39, type: 'coins',     qty: 650,   label: '650 Coins' },
            { tier: 40, type: 'vehicle_part', id: 'engine_t2', label: 'T2 Engine Upgrade' },
            { tier: 41, type: 'coins',     qty: 700,   label: '700 Coins' },
            { tier: 42, type: 'diamonds',  qty: 5,     label: '5 Diamonds' },
            { tier: 43, type: 'coins',     qty: 700,   label: '700 Coins' },
            { tier: 44, type: 'booster',   id: 'nitro_boost', label: 'Nitro Boost Pack' },
            { tier: 45, type: 'coins',     qty: 800,   label: '800 Coins' },
            { tier: 46, type: 'cosmetic',  id: 'decal_season1', label: 'Season 1 Decal' },
            { tier: 47, type: 'coins',     qty: 800,   label: '800 Coins' },
            { tier: 48, type: 'diamonds',  qty: 10,    label: '10 Diamonds' },
            { tier: 49, type: 'coins',     qty: 1000,  label: '1000 Coins' },
            { tier: 50, type: 'vehicle',   id: 'vehicle_mountain_king', label: 'MOUNTAIN KING Vehicle (FREE)' }
        ];

        var PREMIUM_REWARDS = [
            { tier: 1,  type: 'diamonds',  qty: 10,    label: '10 Diamonds' },
            { tier: 2,  type: 'coins',     qty: 500,   label: '500 Coins' },
            { tier: 3,  type: 'cosmetic',  id: 'paint_gold_s1', label: 'Season Gold Paint' },
            { tier: 4,  type: 'diamonds',  qty: 15,    label: '15 Diamonds' },
            { tier: 5,  type: 'vehicle_part', id: 'engine_t2_prem', label: 'Premium T2 Engine' },
            { tier: 6,  type: 'coins',     qty: 750,   label: '750 Coins' },
            { tier: 7,  type: 'diamonds',  qty: 20,    label: '20 Diamonds' },
            { tier: 8,  type: 'cosmetic',  id: 'livery_lightning', label: 'Lightning Livery' },
            { tier: 9,  type: 'coins',     qty: 1000,  label: '1000 Coins' },
            { tier: 10, type: 'vehicle',   id: 'vehicle_thunder_buggy_skin', label: 'Thunder Buggy Exclusive Skin' },
            { tier: 11, type: 'diamonds',  qty: 25,    label: '25 Diamonds' },
            { tier: 12, type: 'coins',     qty: 1000,  label: '1000 Coins' },
            { tier: 13, type: 'cosmetic',  id: 'exhaust_flame', label: 'Flame Exhaust Effect' },
            { tier: 14, type: 'diamonds',  qty: 30,    label: '30 Diamonds' },
            { tier: 15, type: 'vehicle_part', id: 'suspension_t3', label: 'T3 Suspension' },
            { tier: 16, type: 'coins',     qty: 1250,  label: '1250 Coins' },
            { tier: 17, type: 'diamonds',  qty: 35,    label: '35 Diamonds' },
            { tier: 18, type: 'cosmetic',  id: 'trail_sparkle', label: 'Sparkle Trail Effect' },
            { tier: 19, type: 'coins',     qty: 1250,  label: '1250 Coins' },
            { tier: 20, type: 'vehicle',   id: 'vehicle_forest_racer_excl', label: 'Forest Racer Exclusive' },
            { tier: 21, type: 'diamonds',  qty: 40,    label: '40 Diamonds' },
            { tier: 22, type: 'coins',     qty: 1500,  label: '1500 Coins' },
            { tier: 23, type: 'cosmetic',  id: 'horn_beast', label: 'Beast Horn' },
            { tier: 24, type: 'diamonds',  qty: 50,    label: '50 Diamonds' },
            { tier: 25, type: 'vehicle_part', id: 'all_parts_t3', label: 'Full T3 Parts Bundle' },
            { tier: 26, type: 'coins',     qty: 1500,  label: '1500 Coins' },
            { tier: 27, type: 'diamonds',  qty: 50,    label: '50 Diamonds' },
            { tier: 28, type: 'cosmetic',  id: 'paint_chrome', label: 'Chrome Paint' },
            { tier: 29, type: 'coins',     qty: 1750,  label: '1750 Coins' },
            { tier: 30, type: 'vehicle',   id: 'vehicle_desert_hawk', label: 'Desert Hawk Vehicle' },
            { tier: 31, type: 'diamonds',  qty: 60,    label: '60 Diamonds' },
            { tier: 32, type: 'coins',     qty: 2000,  label: '2000 Coins' },
            { tier: 33, type: 'cosmetic',  id: 'wheel_neon', label: 'Neon Wheel Rims' },
            { tier: 34, type: 'diamonds',  qty: 75,    label: '75 Diamonds' },
            { tier: 35, type: 'vehicle_part', id: 'engine_t4', label: 'T4 Engine' },
            { tier: 36, type: 'coins',     qty: 2000,  label: '2000 Coins' },
            { tier: 37, type: 'diamonds',  qty: 80,    label: '80 Diamonds' },
            { tier: 38, type: 'cosmetic',  id: 'livery_dragon', label: 'Dragon Livery' },
            { tier: 39, type: 'coins',     qty: 2500,  label: '2500 Coins' },
            { tier: 40, type: 'vehicle',   id: 'vehicle_glacier_beast', label: 'Glacier Beast Vehicle' },
            { tier: 41, type: 'diamonds',  qty: 100,   label: '100 Diamonds' },
            { tier: 42, type: 'coins',     qty: 3000,  label: '3000 Coins' },
            { tier: 43, type: 'cosmetic',  id: 'aura_season1', label: 'Season 1 Vehicle Aura' },
            { tier: 44, type: 'diamonds',  qty: 100,   label: '100 Diamonds' },
            { tier: 45, type: 'vehicle_part', id: 'allparts_t4', label: 'Full T4 Parts Bundle' },
            { tier: 46, type: 'coins',     qty: 3000,  label: '3000 Coins' },
            { tier: 47, type: 'diamonds',  qty: 150,   label: '150 Diamonds' },
            { tier: 48, type: 'cosmetic',  id: 'title_champion', label: '"Champion" Title' },
            { tier: 49, type: 'diamonds',  qty: 200,   label: '200 Diamonds' },
            { tier: 50, type: 'vehicle',   id: 'vehicle_apex_predator', label: 'APEX PREDATOR Exclusive Vehicle' }
        ];

        var playerPassState = {
            season: CURRENT_SEASON.id,
            currentXp: 0,
            currentTier: 0,
            isPremium: false,
            claimedFreeTiers: [],
            claimedPremiumTiers: [],
            purchasedAt: null,
            xpBoostMultiplier: 1.0
        };

        function getTierForXp(xp) {
            var tier = 0;
            for (var i = 0; i < TIER_XP_CURVE.length; i++) {
                if (xp >= TIER_XP_CURVE[i].cumulativeXp) {
                    tier = TIER_XP_CURVE[i].tier;
                } else {
                    break;
                }
            }
            return tier;
        }

        function getXpToNextTier(xp) {
            var currentTier = getTierForXp(xp);
            if (currentTier >= 50) return 0;
            var nextTierData = TIER_XP_CURVE[currentTier];
            var currentTierData = currentTier > 0 ? TIER_XP_CURVE[currentTier - 1] : { cumulativeXp: 0 };
            return nextTierData.cumulativeXp - xp;
        }

        function addXp(source, quantity) {
            quantity = quantity || 1;
            var xpSource = XP_SOURCES[source];
            if (!xpSource) { console.warn('[BattlePass] Unknown XP source: ' + source); return; }
            var gained = xpSource.xp * quantity * playerPassState.xpBoostMultiplier;
            playerPassState.currentXp += gained;
            var newTier = getTierForXp(playerPassState.currentXp);
            if (newTier > playerPassState.currentTier) {
                var oldTier = playerPassState.currentTier;
                playerPassState.currentTier = newTier;
                onTierUp(oldTier, newTier);
            }
            return gained;
        }

        function onTierUp(oldTier, newTier) {
            console.log('[BattlePass] Tier up! ' + oldTier + ' -> ' + newTier);
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('battlepass:tierup', {
                    detail: { oldTier: oldTier, newTier: newTier }
                }));
            }
        }

        function claimRewards(tier) {
            var results = [];
            if (tier > playerPassState.currentTier) {
                return { success: false, reason: 'Tier not yet reached' };
            }
            var freeReward = FREE_REWARDS.find(function(r) { return r.tier === tier; });
            if (freeReward && playerPassState.claimedFreeTiers.indexOf(tier) === -1) {
                playerPassState.claimedFreeTiers.push(tier);
                results.push({ track: 'free', reward: freeReward });
            }
            if (playerPassState.isPremium) {
                var premReward = PREMIUM_REWARDS.find(function(r) { return r.tier === tier; });
                if (premReward && playerPassState.claimedPremiumTiers.indexOf(tier) === -1) {
                    playerPassState.claimedPremiumTiers.push(tier);
                    results.push({ track: 'premium', reward: premReward });
                }
            }
            return { success: true, rewards: results };
        }

        function claimAllAvailable() {
            var allResults = [];
            for (var t = 1; t <= playerPassState.currentTier; t++) {
                var r = claimRewards(t);
                if (r.success && r.rewards.length > 0) {
                    allResults = allResults.concat(r.rewards);
                }
            }
            return allResults;
        }

        function purchasePremium(bundleType) {
            if (playerPassState.isPremium) return { success: false, reason: 'Already premium' };
            var cost = bundleType === 'bundle' ? CURRENT_SEASON.premiumPlusBundlePrice : CURRENT_SEASON.premiumPrice;
            playerPassState.isPremium = true;
            playerPassState.purchasedAt = Date.now();
            if (bundleType === 'bundle') {
                playerPassState.xpBoostMultiplier = 1.5;
            }
            return { success: true, cost: cost, bundleType: bundleType };
        }

        function isSeasonExpired() {
            return Date.now() > CURRENT_SEASON.endDate.getTime();
        }

        function getPassSummary() {
            return {
                season: CURRENT_SEASON,
                tier: playerPassState.currentTier,
                xp: playerPassState.currentXp,
                xpToNext: getXpToNextTier(playerPassState.currentXp),
                isPremium: playerPassState.isPremium,
                expired: isSeasonExpired(),
                unclaimedFree: FREE_REWARDS.filter(function(r) {
                    return r.tier <= playerPassState.currentTier && playerPassState.claimedFreeTiers.indexOf(r.tier) === -1;
                }).length,
                unclaimedPremium: playerPassState.isPremium ? PREMIUM_REWARDS.filter(function(r) {
                    return r.tier <= playerPassState.currentTier && playerPassState.claimedPremiumTiers.indexOf(r.tier) === -1;
                }).length : 0
            };
        }

        return {
            addXp: addXp,
            claimRewards: claimRewards,
            claimAllAvailable: claimAllAvailable,
            purchasePremium: purchasePremium,
            isSeasonExpired: isSeasonExpired,
            getPassSummary: getPassSummary,
            getTierForXp: getTierForXp,
            getXpToNextTier: getXpToNextTier,
            XP_SOURCES: XP_SOURCES,
            TIER_XP_CURVE: TIER_XP_CURVE,
            FREE_REWARDS: FREE_REWARDS,
            PREMIUM_REWARDS: PREMIUM_REWARDS,
            CURRENT_SEASON: CURRENT_SEASON,
            playerPassState: playerPassState
        };
    })();

    if (typeof window !== 'undefined') window.BATTLE_PASS_SYSTEM = BATTLE_PASS_SYSTEM;
    if (typeof module !== 'undefined' && module.exports) module.exports.BATTLE_PASS_SYSTEM = BATTLE_PASS_SYSTEM;
})();

// =============================================================================
// CRAFTING_SYSTEM MODULE
// =============================================================================
(function() {
    'use strict';

    var CRAFTING_SYSTEM = (function() {

        var MATERIALS = [
            { id: 'mat_iron',       name: 'Iron',          rarity: 'common',    stackLimit: 999, description: 'Basic structural metal.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_steel',      name: 'Steel',         rarity: 'common',    stackLimit: 999, description: 'Processed iron alloy.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_rubber',     name: 'Rubber',        rarity: 'common',    stackLimit: 500, description: 'Used for tires and seals.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_copper',     name: 'Copper',        rarity: 'common',    stackLimit: 999, description: 'Electrical conductor.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_wood',       name: 'Wood',          rarity: 'common',    stackLimit: 999, description: 'Basic organic material.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_glass',      name: 'Glass',         rarity: 'uncommon',  stackLimit: 200, description: 'Transparent silicate.', obtainMethod: 'salvage' },
            { id: 'mat_alloy',      name: 'Alloy',         rarity: 'uncommon',  stackLimit: 200, description: 'Mixed metal composite.', obtainMethod: 'salvage' },
            { id: 'mat_carbon',     name: 'Carbon Fiber',  rarity: 'uncommon',  stackLimit: 100, description: 'Lightweight, strong.', obtainMethod: 'event_reward' },
            { id: 'mat_silicon',    name: 'Silicon',       rarity: 'uncommon',  stackLimit: 200, description: 'Semiconductor material.', obtainMethod: 'salvage' },
            { id: 'mat_magnet',     name: 'Rare Magnet',   rarity: 'uncommon',  stackLimit: 100, description: 'High-strength magnet.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_titanium',   name: 'Titanium',      rarity: 'rare',      stackLimit: 50,  description: 'Ultra-strong light metal.', obtainMethod: 'event_reward' },
            { id: 'mat_kevlar',     name: 'Kevlar',        rarity: 'rare',      stackLimit: 50,  description: 'Ballistic fiber weave.', obtainMethod: 'event_reward' },
            { id: 'mat_ceramic',    name: 'Ceramic',       rarity: 'rare',      stackLimit: 50,  description: 'Heat-resistant compound.', obtainMethod: 'salvage' },
            { id: 'mat_fuel_cell',  name: 'Fuel Cell',     rarity: 'rare',      stackLimit: 25,  description: 'High-energy cell.', obtainMethod: 'purchase' },
            { id: 'mat_gem_frag',   name: 'Gem Fragment',  rarity: 'rare',      stackLimit: 50,  description: 'Fractured gemstone.', obtainMethod: 'gameplay_drop' },
            { id: 'mat_nanofiber',  name: 'Nanofiber',     rarity: 'epic',      stackLimit: 20,  description: 'Molecular-scale fiber.', obtainMethod: 'event_reward' },
            { id: 'mat_plasma',     name: 'Plasma Core',   rarity: 'epic',      stackLimit: 10,  description: 'Contained plasma energy.', obtainMethod: 'event_reward' },
            { id: 'mat_diamond_dust',name:'Diamond Dust',  rarity: 'epic',      stackLimit: 10,  description: 'Ground diamond powder.', obtainMethod: 'purchase' },
            { id: 'mat_dark_alloy', name: 'Dark Alloy',    rarity: 'legendary', stackLimit: 5,   description: 'Mysterious composite.', obtainMethod: 'event_reward' },
            { id: 'mat_stardust',   name: 'Stardust',      rarity: 'legendary', stackLimit: 3,   description: 'Celestial material.', obtainMethod: 'event_reward' }
        ];

        var RECIPES = [
            { id: 'rec_tire_basic',     result: 'item_tire_basic',     resultQty: 1, craftTime: 30,   unlockLevel: 1,  materials: [{ id: 'mat_rubber', qty: 5 }, { id: 'mat_steel', qty: 2 }] },
            { id: 'rec_tire_offroad',   result: 'item_tire_offroad',   resultQty: 1, craftTime: 60,   unlockLevel: 5,  materials: [{ id: 'mat_rubber', qty: 8 }, { id: 'mat_alloy', qty: 3 }] },
            { id: 'rec_tire_racing',    result: 'item_tire_racing',    resultQty: 1, craftTime: 120,  unlockLevel: 10, materials: [{ id: 'mat_rubber', qty: 10 }, { id: 'mat_carbon', qty: 2 }, { id: 'mat_kevlar', qty: 1 }] },
            { id: 'rec_engine_boost_sm',result: 'item_engine_boost_sm',resultQty: 1, craftTime: 45,   unlockLevel: 3,  materials: [{ id: 'mat_copper', qty: 5 }, { id: 'mat_silicon', qty: 3 }, { id: 'mat_fuel_cell', qty: 1 }] },
            { id: 'rec_engine_boost_md',result: 'item_engine_boost_md',resultQty: 1, craftTime: 90,   unlockLevel: 8,  materials: [{ id: 'mat_copper', qty: 10 }, { id: 'mat_silicon', qty: 5 }, { id: 'mat_fuel_cell', qty: 2 }, { id: 'mat_titanium', qty: 1 }] },
            { id: 'rec_engine_boost_lg',result: 'item_engine_boost_lg',resultQty: 1, craftTime: 180,  unlockLevel: 15, materials: [{ id: 'mat_copper', qty: 15 }, { id: 'mat_silicon', qty: 10 }, { id: 'mat_fuel_cell', qty: 3 }, { id: 'mat_plasma', qty: 1 }] },
            { id: 'rec_suspension_basic',result:'item_suspension_basic',resultQty:1, craftTime: 60,   unlockLevel: 4,  materials: [{ id: 'mat_steel', qty: 8 }, { id: 'mat_rubber', qty: 4 }, { id: 'mat_alloy', qty: 2 }] },
            { id: 'rec_suspension_adv', result: 'item_suspension_adv', resultQty: 1, craftTime: 120,  unlockLevel: 12, materials: [{ id: 'mat_titanium', qty: 3 }, { id: 'mat_carbon', qty: 5 }, { id: 'mat_alloy', qty: 5 }] },
            { id: 'rec_nitro_sm',       result: 'item_nitro_sm',       resultQty: 3, craftTime: 20,   unlockLevel: 2,  materials: [{ id: 'mat_fuel_cell', qty: 1 }, { id: 'mat_copper', qty: 2 }] },
            { id: 'rec_nitro_lg',       result: 'item_nitro_lg',       resultQty: 2, craftTime: 60,   unlockLevel: 7,  materials: [{ id: 'mat_fuel_cell', qty: 3 }, { id: 'mat_copper', qty: 5 }, { id: 'mat_plasma', qty: 1 }] },
            { id: 'rec_shield',         result: 'item_shield',         resultQty: 1, craftTime: 90,   unlockLevel: 9,  materials: [{ id: 'mat_kevlar', qty: 4 }, { id: 'mat_steel', qty: 5 }, { id: 'mat_ceramic', qty: 2 }] },
            { id: 'rec_magnet',         result: 'item_coin_magnet',    resultQty: 1, craftTime: 45,   unlockLevel: 6,  materials: [{ id: 'mat_magnet', qty: 3 }, { id: 'mat_copper', qty: 5 }, { id: 'mat_silicon', qty: 2 }] },
            { id: 'rec_paint_chrome',   result: 'cosm_paint_chrome',   resultQty: 1, craftTime: 30,   unlockLevel: 10, materials: [{ id: 'mat_diamond_dust', qty: 1 }, { id: 'mat_silicon', qty: 5 }] },
            { id: 'rec_paint_neon_g',   result: 'cosm_paint_neon_green',resultQty:1, craftTime: 20,   unlockLevel: 5,  materials: [{ id: 'mat_silicon', qty: 3 }, { id: 'mat_glass', qty: 3 }] },
            { id: 'rec_decal_flames',   result: 'cosm_decal_flames',   resultQty: 1, craftTime: 15,   unlockLevel: 3,  materials: [{ id: 'mat_glass', qty: 2 }, { id: 'mat_copper', qty: 2 }] },
            { id: 'rec_wheel_gold',     result: 'cosm_wheel_gold',     resultQty: 1, craftTime: 60,   unlockLevel: 15, materials: [{ id: 'mat_alloy', qty: 5 }, { id: 'mat_diamond_dust', qty: 2 }] },
            { id: 'rec_xp_boost',       result: 'boost_xp_2hr',        resultQty: 1, craftTime: 10,   unlockLevel: 1,  materials: [{ id: 'mat_gem_frag', qty: 3 }] },
            { id: 'rec_coin_boost',     result: 'boost_coins_1hr',     resultQty: 1, craftTime: 10,   unlockLevel: 1,  materials: [{ id: 'mat_gem_frag', qty: 2 }, { id: 'mat_gold_dust', qty: 1 }] },
            { id: 'rec_armor_plate',    result: 'item_armor_plate',    resultQty: 1, craftTime: 180,  unlockLevel: 20, materials: [{ id: 'mat_nanofiber', qty: 2 }, { id: 'mat_titanium', qty: 5 }, { id: 'mat_kevlar', qty: 5 }] },
            { id: 'rec_legendary_part', result: 'item_legendary_part', resultQty: 1, craftTime: 600,  unlockLevel: 30, materials: [{ id: 'mat_dark_alloy', qty: 2 }, { id: 'mat_stardust', qty: 1 }, { id: 'mat_plasma', qty: 3 }, { id: 'mat_nanofiber', qty: 5 }] },
            { id: 'rec_rare_chest',     result: 'item_rare_chest',     resultQty: 1, craftTime: 120,  unlockLevel: 10, materials: [{ id: 'mat_gem_frag', qty: 10 }, { id: 'mat_iron', qty: 20 }] },
            { id: 'rec_epic_chest',     result: 'item_epic_chest',     resultQty: 1, craftTime: 240,  unlockLevel: 20, materials: [{ id: 'mat_gem_frag', qty: 25 }, { id: 'mat_dark_alloy', qty: 1 }] },
            { id: 'rec_brake_basic',    result: 'item_brake_basic',    resultQty: 1, craftTime: 40,   unlockLevel: 2,  materials: [{ id: 'mat_steel', qty: 6 }, { id: 'mat_rubber', qty: 3 }] },
            { id: 'rec_brake_carbon',   result: 'item_brake_carbon',   resultQty: 1, craftTime: 90,   unlockLevel: 11, materials: [{ id: 'mat_carbon', qty: 4 }, { id: 'mat_ceramic', qty: 3 }] },
            { id: 'rec_fuel_tank_ext',  result: 'item_fuel_tank_ext',  resultQty: 1, craftTime: 75,   unlockLevel: 8,  materials: [{ id: 'mat_steel', qty: 10 }, { id: 'mat_alloy', qty: 5 }] },
            { id: 'rec_turbo_kit',      result: 'item_turbo_kit',      resultQty: 1, craftTime: 200,  unlockLevel: 18, materials: [{ id: 'mat_titanium', qty: 4 }, { id: 'mat_plasma', qty: 2 }, { id: 'mat_silicon', qty: 8 }] },
            { id: 'rec_exhaust_sport',  result: 'item_exhaust_sport',  resultQty: 1, craftTime: 50,   unlockLevel: 6,  materials: [{ id: 'mat_steel', qty: 5 }, { id: 'mat_alloy', qty: 3 }, { id: 'mat_copper', qty: 4 }] },
            { id: 'rec_exhaust_race',   result: 'item_exhaust_race',   resultQty: 1, craftTime: 100,  unlockLevel: 13, materials: [{ id: 'mat_titanium', qty: 2 }, { id: 'mat_carbon', qty: 3 }, { id: 'mat_ceramic', qty: 2 }] },
            { id: 'rec_rollcage',       result: 'item_rollcage',       resultQty: 1, craftTime: 150,  unlockLevel: 16, materials: [{ id: 'mat_steel', qty: 15 }, { id: 'mat_alloy', qty: 8 }, { id: 'mat_kevlar', qty: 2 }] },
            { id: 'rec_spoiler_basic',  result: 'cosm_spoiler_basic',  resultQty: 1, craftTime: 30,   unlockLevel: 4,  materials: [{ id: 'mat_carbon', qty: 2 }, { id: 'mat_iron', qty: 5 }] },
            { id: 'rec_spoiler_dragon', result: 'cosm_spoiler_dragon', resultQty: 1, craftTime: 180,  unlockLevel: 22, materials: [{ id: 'mat_dark_alloy', qty: 1 }, { id: 'mat_carbon', qty: 5 }, { id: 'mat_nanofiber', qty: 2 }] },
            { id: 'rec_headlights_halo',result:'cosm_headlights_halo', resultQty: 1, craftTime: 60,   unlockLevel: 9,  materials: [{ id: 'mat_glass', qty: 5 }, { id: 'mat_copper', qty: 5 }, { id: 'mat_silicon', qty: 3 }] },
            { id: 'rec_underglow',      result: 'cosm_underglow',      resultQty: 1, craftTime: 45,   unlockLevel: 7,  materials: [{ id: 'mat_copper', qty: 6 }, { id: 'mat_silicon', qty: 4 }] },
            { id: 'rec_seat_racing',    result: 'cosm_seat_racing',    resultQty: 1, craftTime: 50,   unlockLevel: 5,  materials: [{ id: 'mat_kevlar', qty: 2 }, { id: 'mat_rubber', qty: 4 }, { id: 'mat_alloy', qty: 2 }] },
            { id: 'rec_steering_wheel', result: 'cosm_steering_sport', resultQty: 1, craftTime: 35,   unlockLevel: 4,  materials: [{ id: 'mat_rubber', qty: 3 }, { id: 'mat_leather', qty: 2 }, { id: 'mat_steel', qty: 2 }] },
            { id: 'rec_roll_bar',       result: 'item_roll_bar',       resultQty: 1, craftTime: 80,   unlockLevel: 10, materials: [{ id: 'mat_steel', qty: 12 }, { id: 'mat_alloy', qty: 4 }] },
            { id: 'rec_drift_kit',      result: 'item_drift_kit',      resultQty: 1, craftTime: 160,  unlockLevel: 17, materials: [{ id: 'mat_rubber', qty: 12 }, { id: 'mat_carbon', qty: 4 }, { id: 'mat_alloy', qty: 6 }] },
            { id: 'rec_jump_kit',       result: 'item_jump_kit',       resultQty: 1, craftTime: 140,  unlockLevel: 14, materials: [{ id: 'mat_titanium', qty: 3 }, { id: 'mat_nanofiber', qty: 2 }, { id: 'mat_alloy', qty: 5 }] },
            { id: 'rec_repair_kit',     result: 'item_repair_kit',     resultQty: 2, craftTime: 25,   unlockLevel: 1,  materials: [{ id: 'mat_iron', qty: 5 }, { id: 'mat_rubber', qty: 2 }] },
            { id: 'rec_paint_legendary',result:'cosm_paint_legendary', resultQty: 1, craftTime: 480,  unlockLevel: 35, materials: [{ id: 'mat_stardust', qty: 1 }, { id: 'mat_diamond_dust', qty: 3 }, { id: 'mat_nanofiber', qty: 3 }, { id: 'mat_plasma', qty: 2 }] }
        ];

        var MAX_QUEUE_SLOTS = 3;
        var craftingQueue = [];
        var playerMaterials = {};

        function getMaterialCount(materialId) {
            return playerMaterials[materialId] || 0;
        }

        function addMaterial(materialId, qty) {
            var mat = MATERIALS.find(function(m) { return m.id === materialId; });
            if (!mat) return false;
            playerMaterials[materialId] = Math.min((playerMaterials[materialId] || 0) + qty, mat.stackLimit);
            return true;
        }

        function canCraft(recipeId) {
            var recipe = RECIPES.find(function(r) { return r.id === recipeId; });
            if (!recipe) return { can: false, reason: 'Recipe not found' };
            for (var i = 0; i < recipe.materials.length; i++) {
                var m = recipe.materials[i];
                if (getMaterialCount(m.id) < m.qty) {
                    return { can: false, reason: 'Not enough ' + m.id, need: m.qty, have: getMaterialCount(m.id) };
                }
            }
            return { can: true };
        }

        function startCraft(recipeId) {
            if (craftingQueue.length >= MAX_QUEUE_SLOTS) {
                return { success: false, reason: 'Crafting queue full' };
            }
            var check = canCraft(recipeId);
            if (!check.can) return { success: false, reason: check.reason };
            var recipe = RECIPES.find(function(r) { return r.id === recipeId; });
            recipe.materials.forEach(function(m) {
                playerMaterials[m.id] = (playerMaterials[m.id] || 0) - m.qty;
            });
            var job = {
                id: 'craft_' + Date.now(),
                recipeId: recipeId,
                startTime: Date.now(),
                endTime: Date.now() + recipe.craftTime * 1000,
                done: false
            };
            craftingQueue.push(job);
            return { success: true, job: job };
        }

        function speedUpCraft(jobId, diamonds) {
            var job = craftingQueue.find(function(j) { return j.id === jobId; });
            if (!job) return { success: false, reason: 'Job not found' };
            var remaining = job.endTime - Date.now();
            var minutesRemaining = Math.ceil(remaining / 60000);
            var costPerMinute = 1;
            var cost = Math.ceil(minutesRemaining * costPerMinute);
            if (diamonds < cost) return { success: false, reason: 'Not enough diamonds', cost: cost };
            job.endTime = Date.now();
            return { success: true, cost: cost };
        }

        function collectCraft(jobId) {
            var idx = craftingQueue.findIndex(function(j) { return j.id === jobId; });
            if (idx === -1) return { success: false, reason: 'Job not found' };
            var job = craftingQueue[idx];
            if (Date.now() < job.endTime) return { success: false, reason: 'Not ready yet', remaining: job.endTime - Date.now() };
            var recipe = RECIPES.find(function(r) { return r.id === job.recipeId; });
            craftingQueue.splice(idx, 1);
            return { success: true, result: recipe.result, qty: recipe.resultQty };
        }

        function salvageItem(itemId, itemRarity) {
            var rarityYield = {
                common:    { mat_iron: 3, mat_rubber: 2 },
                uncommon:  { mat_alloy: 2, mat_glass: 2, mat_silicon: 1 },
                rare:      { mat_titanium: 1, mat_carbon: 2, mat_gem_frag: 2 },
                epic:      { mat_nanofiber: 1, mat_plasma: 1, mat_gem_frag: 5 },
                legendary: { mat_dark_alloy: 1, mat_stardust: 1, mat_nanofiber: 2 }
            };
            var yield_ = rarityYield[itemRarity] || rarityYield.common;
            Object.keys(yield_).forEach(function(matId) {
                addMaterial(matId, yield_[matId]);
            });
            return { success: true, materials: yield_ };
        }

        function getQueueStatus() {
            var now = Date.now();
            return craftingQueue.map(function(job) {
                var recipe = RECIPES.find(function(r) { return r.id === job.recipeId; });
                return {
                    id: job.id,
                    recipe: recipe,
                    timeRemaining: Math.max(0, job.endTime - now),
                    isReady: now >= job.endTime
                };
            });
        }

        return {
            MATERIALS: MATERIALS,
            RECIPES: RECIPES,
            MAX_QUEUE_SLOTS: MAX_QUEUE_SLOTS,
            getMaterialCount: getMaterialCount,
            addMaterial: addMaterial,
            canCraft: canCraft,
            startCraft: startCraft,
            speedUpCraft: speedUpCraft,
            collectCraft: collectCraft,
            salvageItem: salvageItem,
            getQueueStatus: getQueueStatus,
            playerMaterials: playerMaterials
        };
    })();

    if (typeof window !== 'undefined') window.CRAFTING_SYSTEM = CRAFTING_SYSTEM;
    if (typeof module !== 'undefined' && module.exports) module.exports.CRAFTING_SYSTEM = CRAFTING_SYSTEM;
})();

// =============================================================================
// SHOP_EXTENDED MODULE
// =============================================================================
(function() {
    'use strict';

    var SHOP_EXTENDED = (function() {

        var purchaseHistory = [];
        var wishlist = [];
        var flashSales = [];
        var dailyDeals = [];
        var lastDailyRefresh = null;

        var SHOP_INVENTORY = [
            { id: 'shop_nitro_pack',    name: 'Nitro Pack',         price: 50,   currency: 'coins',    category: 'consumable',  rarity: 'common' },
            { id: 'shop_repair_kit',    name: 'Repair Kit',         price: 30,   currency: 'coins',    category: 'consumable',  rarity: 'common' },
            { id: 'shop_xp_boost_1hr',  name: 'XP Boost 1hr',       price: 10,   currency: 'diamonds', category: 'booster',     rarity: 'uncommon' },
            { id: 'shop_coin_boost_2hr',name: 'Coin Boost 2hr',     price: 15,   currency: 'diamonds', category: 'booster',     rarity: 'uncommon' },
            { id: 'shop_paint_red',     name: 'Crimson Paint',      price: 200,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_blue',    name: 'Ocean Paint',        price: 200,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_gold',    name: 'Gold Paint',         price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_chrome',  name: 'Chrome Wheels',      price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_decal_racing',  name: 'Racing Stripe Decal',price: 150,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_dragon',  name: 'Dragon Decal',       price: 800,  currency: 'coins',    category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_engine_t2',     name: 'T2 Engine Upgrade',  price: 1200, currency: 'coins',    category: 'part',        rarity: 'rare' },
            { id: 'shop_suspension_t2', name: 'T2 Suspension',      price: 1000, currency: 'coins',    category: 'part',        rarity: 'rare' },
            { id: 'shop_tire_offroad',  name: 'Off-Road Tires',     price: 800,  currency: 'coins',    category: 'part',        rarity: 'uncommon' },
            { id: 'shop_vehicle_buggy', name: 'Desert Buggy',       price: 5000, currency: 'coins',    category: 'vehicle',     rarity: 'rare' },
            { id: 'shop_vehicle_bike',  name: 'Dirt Bike',          price: 4500, currency: 'coins',    category: 'vehicle',     rarity: 'uncommon' },
            { id: 'shop_gems_100',      name: '100 Diamonds',       price: 0.99, currency: 'real',     category: 'currency',    rarity: 'common' },
            { id: 'shop_gems_550',      name: '550 Diamonds',       price: 4.99, currency: 'real',     category: 'currency',    rarity: 'uncommon' },
            { id: 'shop_gems_1200',     name: '1200 Diamonds',      price: 9.99, currency: 'real',     category: 'currency',    rarity: 'rare' },
            { id: 'shop_gems_6500',     name: '6500 Diamonds',      price: 49.99,currency: 'real',     category: 'currency',    rarity: 'epic' },
            { id: 'shop_starter_pack',  name: 'Starter Pack',       price: 1.99, currency: 'real',     category: 'bundle',      rarity: 'special', oneTimePurchase: true },
            // ── Additional Cosmetics: Paint Colors ──
            { id: 'shop_paint_emerald', name: 'Emerald Paint',      price: 200,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_violet',  name: 'Violet Paint',       price: 200,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_sunset',  name: 'Sunset Fade Paint',  price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_carbon',  name: 'Carbon Black Paint', price: 450,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_chrome2', name: 'Liquid Chrome Paint',price: 700,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_galaxy',  name: 'Galaxy Paint',       price: 40,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_lava',    name: 'Molten Lava Paint',  price: 55,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_prism',   name: 'Prism Holo Paint',   price: 90,   currency: 'diamonds', category: 'cosmetic',    rarity: 'special' },
            // ── Additional Cosmetics: Trail Effects ──
            { id: 'shop_trail_flame',   name: 'Flame Trail',        price: 400,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_petal',   name: 'Petal Trail',        price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_sparkle', name: 'Sparkle Trail',      price: 600,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_ghost',   name: 'Ghost Trail',        price: 25,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_rainbow', name: 'Rainbow Trail',      price: 45,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_trail_lightning',name:'Lightning Trail',     price: 50,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            // ── Additional Cosmetics: Horn & SFX Skins ──
            { id: 'shop_horn_classic',  name: 'Classic Horn',       price: 150,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_horn_air',      name: 'Air Horn',           price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_beast',    name: 'Beast Roar Horn',    price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_horn_musical',  name: 'Musical Horn',       price: 20,   currency: 'diamonds', category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_sfx_siren',     name: 'Siren SFX',          price: 35,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_sfx_v8',        name: 'V8 Engine SFX',      price: 40,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_sfx_electric',  name: 'Electric Whir SFX',  price: 30,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            // ── Additional Cosmetics: Wheels, Decals & Auras ──
            { id: 'shop_wheel_gold',    name: 'Gold Rims',          price: 650,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_neon',    name: 'Neon Rims',          price: 30,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_flames',  name: 'Flame Decal',        price: 400,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_decal_skull',   name: 'Skull Decal',        price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_stars',   name: 'Star Field Decal',   price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_aura_champion', name: 'Champion Aura',      price: 75,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            // ── Additional Cosmetics: Gap-Fill Set (paints / trails / decals) ──
            { id: 'shop_paint_pearl',   name: 'Pearl White Paint',  price: 200,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_checker_b',name:'Matte Slate Paint',   price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_camo',    name: 'Army Camo Paint',    price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_neon_g',  name: 'Neon Green Paint',   price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_aurora',  name: 'Aurora Paint',       price: 60,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_trail_smoke',   name: 'Smoke Trail',        price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_bubble',  name: 'Bubble Trail',       price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_star',    name: 'Stardust Trail',     price: 35,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_checker', name: 'Checkered Flag Decal',price: 200, currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_tribal',  name: 'Tribal Decal',       price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_wheel_carbon',  name: 'Carbon Fiber Rims',  price: 550,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            // ── Additional Cosmetics: Expansion Set (paints / trails / decals / horns) ──
            { id: 'shop_paint_obsidian', name: 'Obsidian Paint',    price: 400,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_gilded',  name: 'Gilded Bronze Paint',price: 550,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_mint',    name: 'Mint Cream Paint',   price: 200,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_nebula',  name: 'Nebula Paint',       price: 65,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_trail_comet',   name: 'Comet Trail',        price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_leaf',    name: 'Autumn Leaf Trail',  price: 320,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_aurora',  name: 'Aurora Wave Trail',  price: 55,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_decal_phoenix', name: 'Phoenix Decal',      price: 700,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_circuit', name: 'Circuit Board Decal',price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_decal_lightning',name:'Lightning Bolt Decal',price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_horn_foghorn',  name: 'Fog Horn',           price: 280,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_orchestra',name: 'Orchestra Fanfare Horn',price: 28,currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            // ── Additional Cosmetics: Elemental Set (paints / trails / decals / horns / auras) ──
            { id: 'shop_paint_frost',   name: 'Frost Blue Paint',   price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_magma',   name: 'Magma Vein Paint',   price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_voidx',   name: 'Void Black Paint',   price: 70,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_wheel_spectrum',name: 'Spectrum Rims',      price: 600,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_neon',    name: 'Neon Pulse Trail',   price: 450,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_glacier', name: 'Glacier Trail',      price: 40,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_wolf',    name: 'Wolf Pack Decal',    price: 550,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_wave',    name: 'Retro Wave Decal',   price: 280,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_train',    name: 'Train Whistle Horn', price: 320,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_thunder',  name: 'Thunderclap Horn',   price: 45,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_inferno',  name: 'Inferno Aura',       price: 80,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_frostbite',name: 'Frostbite Aura',     price: 65,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            // ── Additional Cosmetics: Cosmic Set (paints / trails) ──
            { id: 'shop_paint_titanium',name: 'Titanium Paint',     price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_rosegold', name:'Rose Gold Paint',     price: 600,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_solarflare',name:'Solar Flare Paint',  price: 75,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_trail_confetti', name:'Confetti Trail',      price: 380,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_emberwave',name:'Ember Wave Trail',    price: 550,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_stardust2',name:'Cosmic Dust Trail',   price: 60,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            // ── Additional Cosmetics: Ascendant Endgame Set (paints / trails / decals / horns / auras) ──
            { id: 'shop_paint_royalgold', name:'Royal Gold Paint',   price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_mirage',  name: 'Mirage Shift Paint',  price: 85,   currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            { id: 'shop_trail_meteor',  name: 'Meteor Trail',        price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_phantom', name: 'Phantom Trail',       price: 50,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_decal_serpent', name: 'Serpent Coil Decal',  price: 450,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_decal_royalcrest',name:'Royal Crest Decal',   price: 32,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_horn_kraken',   name: 'Kraken Bellow Horn',  price: 380,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_symphony', name: 'Symphony Horn',       price: 42,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_celestial',name: 'Celestial Aura',      price: 120,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            { id: 'shop_aura_storm',    name: 'Storm Aura',          price: 85,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            // ── Additional Cosmetics: Spooky / Graveyard Set (paints / trails / auras / decal / horn) ──
            { id: 'shop_paint_tombstone', name:'Tombstone Grey Paint', price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_bloodmoon', name:'Blood Moon Paint',     price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_witching', name: 'Witching Hour Paint',  price: 70,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_trail_bones',   name: 'Bone Rattle Trail',    price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_wraith',  name: 'Wraith Mist Trail',    price: 40,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_soul',    name: 'Soul Ember Trail',     price: 55,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_decal_grave',   name: 'Gravestone Decal',     price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_banshee',  name: 'Banshee Wail Horn',    price: 45,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_haunt',    name: 'Haunted Aura',         price: 80,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_reaper',   name: "Reaper's Shroud Aura", price: 120,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Cosmetics: Prismatic / Radiant Set (paints / trails / decals / horns / auras) ──
            { id: 'shop_paint_prismchrome',name:'Prismatic Chrome Paint', price: 240,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_hexgrid', name: 'Hex Grid Decal',      price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_verdant', name: 'Verdant Jade Paint',  price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_starlace',name: 'Starlace Trail',      price: 360,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_decal_griffin', name: 'Griffin Crest Decal', price: 480,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_crimsontide',name:'Crimson Tide Paint', price: 620,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_horn_maestro',  name: 'Maestro Fanfare Horn',price: 38,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_prismbeam',name:'Prism Beam Trail',     price: 58,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_radiant',  name: 'Radiant Halo Aura',   price: 78,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_prismatic',name: 'Prismatic Sovereign Aura', price: 125, currency: 'diamonds', category: 'cosmetic', rarity: 'legendary' },
            // ── Additional Cosmetics: Abyssal / Deep Sea Set (paints / trails / decals / horns / wheels / auras) ──
            { id: 'shop_paint_abyss',   name: 'Abyssal Teal Paint',  price: 260,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_coral',   name: 'Coral Reef Paint',    price: 380,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_maelstrom',name:'Maelstrom Blue Paint', price: 640,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_tide',    name: 'Tidal Foam Trail',    price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_biolume', name: 'Bioluminescent Trail',price: 48,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_decal_anchor',  name: 'Anchor Crest Decal',  price: 220,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_krakenink',name:'Kraken Ink Decal',     price: 520,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_horn_conch',    name: 'Conch Shell Horn',    price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_sonar',    name: 'Sonar Ping Horn',     price: 34,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_tidal',   name: 'Tidal Chrome Rims',   price: 580,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_aura_leviathan',name: 'Leviathan Aura',      price: 90,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_abyssal',  name: 'Abyssal Sovereign Aura', price: 128, currency: 'diamonds', category: 'cosmetic', rarity: 'legendary' },
            // ── Additional Cosmetics: Cyberpunk / Neon City Set (paints / trails / decals / horn / wheels / auras) ──
            { id: 'shop_paint_synthwave',name:'Synthwave Paint',       price: 260,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_circuitcity',name:'Circuit City Decal',   price: 240,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_horn_synthbass', name:'Synth Bass Horn',       price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_datastream',name:'Data Stream Trail',     price: 360,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_hologram', name:'Hologram Paint',        price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_decal_neondragon',name:'Neon Dragon Decal',     price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_hoverneon',name:'Hover Neon Rims',        price: 600,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_lasergrid',name:'Laser Grid Trail',       price: 44,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_glitchcore',name:'Glitch Core Paint',     price: 68,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_cyberpulse',name:'Cyber Pulse Aura',       price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_neonsovereign',name:'Neon Sovereign Aura', price: 130,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Consumables & Boosters ──
            { id: 'shop_fuel_can',      name: 'Fuel Can',           price: 40,   currency: 'coins',    category: 'consumable',  rarity: 'common' },
            { id: 'shop_shield_bubble', name: 'Shield Bubble',      price: 80,   currency: 'coins',    category: 'consumable',  rarity: 'common' },
            { id: 'shop_lucky_charm',   name: 'Lucky Charm',        price: 60,   currency: 'coins',    category: 'consumable',  rarity: 'common' },
            { id: 'shop_mega_nitro',    name: 'Mega Nitro',         price: 120,  currency: 'coins',    category: 'consumable',  rarity: 'uncommon' },
            { id: 'shop_revive_token',  name: 'Revive Token',       price: 12,   currency: 'diamonds', category: 'consumable',  rarity: 'uncommon' },
            { id: 'shop_slowmo_vial',   name: 'Slow-Mo Vial',       price: 8,    currency: 'diamonds', category: 'consumable',  rarity: 'uncommon' },
            { id: 'shop_scrap_boost_2hr',name:'Scrap Boost 2hr',     price: 12,   currency: 'diamonds', category: 'booster',     rarity: 'uncommon' },
            { id: 'shop_diamond_luck_1hr',name:'Diamond Luck 1hr',   price: 20,   currency: 'diamonds', category: 'booster',     rarity: 'rare' },
            { id: 'shop_flip_boost_1hr',name:'Flip Bonus 1hr',       price: 10,   currency: 'diamonds', category: 'booster',     rarity: 'uncommon' },
            // ── Additional Cosmetics: Steampunk / Clockwork Set (paints / trails / decals / horn / wheels / auras) ──
            { id: 'shop_paint_brass',   name: 'Brass Patina Paint',  price: 240,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_gears',   name: 'Clockwork Gears Decal',price: 230, currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_copperpipe',name:'Copper Pipe Paint',   price: 360,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_steam',   name: 'Steam Vent Trail',    price: 350,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_wheel_cog',     name: 'Cog Wheel Rims',      price: 590,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_riveted', name: 'Riveted Iron Paint',  price: 620,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_horn_steamwhistle',name:'Steam Whistle Horn', price: 36,   currency: 'diamonds', category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_forgeember',name:'Forge Ember Trail',   price: 52,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_goldgear', name:'Golden Gearwork Paint',price: 66,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_clockwork', name:'Clockwork Aura',       price: 84,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_chronosovereign',name:'Chrono Sovereign Aura', price: 126, currency: 'diamonds', category: 'cosmetic', rarity: 'legendary' },
            // ── Additional Cosmetics: Sakura / Zen Garden Set (paints / trails / decal / horn / auras) ──
            { id: 'shop_paint_sakura',  name: 'Sakura Bloom Paint',   price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_torii',   name: 'Torii Gate Decal',     price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_bamboo',  name: 'Bamboo Grove Paint',   price: 380,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_petalfall',name:'Petal Fall Trail',      price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_templebell',name:'Temple Bell Horn',      price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_koi',     name: 'Koi Pond Paint',       price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_inkbrush',name: 'Ink Brush Trail',      price: 520,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_lotus',   name: 'Lotus Radiance Paint', price: 72,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_zen',      name: 'Zen Serenity Aura',    price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_shogun',   name: 'Shogun Sovereign Aura',price: 124,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Cosmetics: Aztec / Golden Empire Set (paints / trails / decals / horn / auras) ──
            { id: 'shop_paint_jadeidol', name:'Jade Idol Paint',      price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_glyph',   name: 'Aztec Glyph Decal',   price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_terracotta',name:'Terracotta Paint',    price: 360,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_sandveil', name:'Sand Veil Trail',      price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_warcry',   name: 'War Cry Horn',        price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_decal_sunstone', name:'Sun Stone Decal',      price: 500,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_paint_goldmask', name:'Golden Mask Paint',    price: 620,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_solareclipse',name:'Solar Eclipse Trail',price: 50,  currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_quetzal', name: 'Quetzal Plume Paint', price: 70,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_sunemperor',name:'Sun Emperor Aura',     price: 124,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Cosmetics: Crystalline / Gemstone Set (paints / trails / decal / horn / wheels / auras) ──
            { id: 'shop_paint_amethyst', name:'Amethyst Paint',       price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_facet',   name: 'Faceted Gem Decal',   price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_sapphire', name:'Sapphire Gleam Paint', price: 380,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_crystal', name: 'Crystal Shard Trail', price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_chime',    name: 'Crystal Chime Horn',  price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_ruby',    name: 'Ruby Luster Paint',   price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_diamond', name: 'Diamond Cut Rims',    price: 590,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_geode',   name: 'Geode Sparkle Trail', price: 50,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_gemstone', name: 'Gemstone Glow Aura',  price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_diamondcrown',name:'Diamond Crown Aura', price: 126,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Cosmetics: Galactic / Cosmic Voyager Set (paints / trails / decal / horn / wheels / auras) ──
            { id: 'shop_paint_starlight', name:'Starlight Paint',       price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_constellation',name:'Constellation Decal', price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_cosmos',  name: 'Cosmos Drift Paint',   price: 380,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_warpdrive',name:'Warp Drive Trail',      price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_pulsar',   name: 'Pulsar Beacon Horn',   price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_supernova',name:'Supernova Paint',       price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_orbit',   name: 'Orbital Ring Rims',    price: 590,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_wormhole',name: 'Wormhole Trail',       price: 50,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_galaxy',   name: 'Galactic Halo Aura',   price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_cosmicsovereign',name:'Cosmic Sovereign Aura', price: 128, currency: 'diamonds', category: 'cosmetic', rarity: 'legendary' },
            // ── Additional Cosmetics: Regal / Royal Court Set (paints / trails / decal / horn / wheels / auras) ──
            { id: 'shop_paint_velvet',  name: 'Royal Velvet Paint',   price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_heraldry',name: 'Heraldic Crest Decal', price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_ivory',   name: 'Ivory Throne Paint',   price: 360,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_banner',  name: 'Banner Flourish Trail',price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_fanfare',  name: 'Royal Fanfare Horn',   price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_regalpurple',name:'Regal Purple Paint',  price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_scepter', name: 'Scepter Gold Rims',    price: 590,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_crownjewel',name:'Crown Jewel Trail',    price: 50,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_monarch', name: "Monarch's Majesty Paint",price: 72, currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_royalcourt',name:'Royal Court Aura',      price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_sovereignking',name:'Sovereign King Aura', price: 126, currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Cosmetics: Pirate / Buccaneer Set (paints / trails / decal / horn / wheels / auras) ──
            { id: 'shop_paint_blackflag', name:'Black Flag Paint',      price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_jollyroger',name:'Jolly Roger Decal',     price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_seasalt',   name:'Sea Salt Weathered Paint',price: 360,currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_cannonsmoke',name:'Cannon Smoke Trail',    price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_shipbell',   name:'Ship Bell Horn',        price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_krakenhide',name:'Kraken Hide Paint',     price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_helm',      name:"Ship's Helm Rims",      price: 590,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_grog',      name:'Grog Splash Trail',     price: 46,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_cursedgold',name:'Cursed Gold Paint',     price: 72,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_buccaneer',  name:'Buccaneer Aura',        price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_davyjones',  name:"Davy Jones' Aura",      price: 126,  currency: 'diamonds', category: 'cosmetic',    rarity: 'legendary' },
            // ── Additional Cosmetics: Candy / Carnival Sweets Set (paints / trails / decal / horn / wheels / auras) ──
            { id: 'shop_paint_bubblegum', name:'Bubblegum Pink Paint',  price: 250,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_decal_candystripe',name:'Candy Stripe Decal',    price: 230,  currency: 'coins',    category: 'cosmetic',    rarity: 'common' },
            { id: 'shop_paint_lollipop',  name:'Lollipop Swirl Paint',  price: 360,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_trail_gumdrop',   name:'Gumdrop Trail',         price: 340,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_horn_icecream',   name:'Ice Cream Truck Horn',  price: 300,  currency: 'coins',    category: 'cosmetic',    rarity: 'uncommon' },
            { id: 'shop_paint_caramel',   name:'Caramel Glaze Paint',   price: 560,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_wheel_peppermint',name:'Peppermint Rims',       price: 590,  currency: 'coins',    category: 'cosmetic',    rarity: 'rare' },
            { id: 'shop_trail_sprinkles', name:'Sprinkle Burst Trail',  price: 50,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_paint_cottoncandy',name:'Cotton Candy Cloud Paint',price: 72,currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_sugarrush',  name:'Sugar Rush Aura',       price: 82,   currency: 'diamonds', category: 'cosmetic',    rarity: 'epic' },
            { id: 'shop_aura_candysovereign',name:'Candy Sovereign Aura', price: 126, currency: 'diamonds', category: 'cosmetic',   rarity: 'legendary' }
        ];

        var BUNDLES = [
            {
                id: 'bundle_speed_demons',
                name: 'Speed Demons Pack',
                items: ['shop_nitro_pack', 'shop_engine_t2', 'shop_tire_offroad', 'shop_xp_boost_1hr'],
                originalPrice: 1800,
                bundlePrice: 1200,
                currency: 'coins',
                discountPct: 33,
                description: 'Everything a speed racer needs.',
                expiresAt: null
            },
            {
                id: 'bundle_cosmetics_racer',
                name: 'Racer Cosmetics Pack',
                items: ['shop_paint_red', 'shop_decal_racing', 'shop_wheel_chrome'],
                originalPrice: 700,
                bundlePrice: 450,
                currency: 'coins',
                discountPct: 36,
                description: 'Look fast, go faster.',
                expiresAt: null
            },
            {
                id: 'bundle_diamond_starter',
                name: 'Diamond Starter',
                items: ['shop_gems_550', 'shop_xp_boost_1hr', 'shop_coin_boost_2hr'],
                originalPrice: 5.99,
                bundlePrice: 4.99,
                currency: 'real',
                discountPct: 17,
                description: 'Best first purchase value.',
                expiresAt: null
            },
            {
                id: 'bundle_paint_collection',
                name: 'Paint Collection',
                items: ['shop_paint_emerald', 'shop_paint_violet', 'shop_paint_sunset', 'shop_paint_carbon'],
                originalPrice: 1150,
                bundlePrice: 750,
                currency: 'coins',
                discountPct: 35,
                description: 'Four fresh coats for your ride.',
                expiresAt: null
            },
            {
                id: 'bundle_sound_system',
                name: 'Sound System Pack',
                items: ['shop_horn_classic', 'shop_horn_air', 'shop_horn_beast'],
                originalPrice: 900,
                bundlePrice: 600,
                currency: 'coins',
                discountPct: 33,
                description: 'Announce your arrival, loudly.',
                expiresAt: null
            },
            {
                id: 'bundle_decal_pack',
                name: 'Decal Pack',
                items: ['shop_decal_flames', 'shop_decal_skull', 'shop_decal_stars'],
                originalPrice: 1150,
                bundlePrice: 750,
                currency: 'coins',
                discountPct: 35,
                description: 'Slap on some attitude.',
                expiresAt: null
            },
            {
                id: 'bundle_survival_kit',
                name: 'Survival Kit',
                items: ['shop_fuel_can', 'shop_shield_bubble', 'shop_lucky_charm', 'shop_mega_nitro'],
                originalPrice: 300,
                bundlePrice: 200,
                currency: 'coins',
                discountPct: 33,
                description: 'Stay in the race longer.',
                expiresAt: null
            },
            {
                id: 'bundle_premium_fx',
                name: 'Premium FX Pack',
                items: ['shop_trail_rainbow', 'shop_trail_lightning', 'shop_paint_galaxy', 'shop_aura_champion'],
                originalPrice: 210,
                bundlePrice: 149,
                currency: 'diamonds',
                discountPct: 29,
                description: 'Turn every run into a light show.',
                expiresAt: null
            },
            {
                id: 'bundle_sfx_premium',
                name: 'Premium Sound Pack',
                items: ['shop_sfx_v8', 'shop_sfx_electric', 'shop_horn_musical', 'shop_sfx_siren'],
                originalPrice: 125,
                bundlePrice: 89,
                currency: 'diamonds',
                discountPct: 29,
                description: 'Signature engine and horn skins.',
                expiresAt: null
            },
            {
                id: 'bundle_frost_pack',
                name: 'Frostbound Pack',
                items: ['shop_paint_frost', 'shop_trail_neon', 'shop_decal_wave', 'shop_horn_train'],
                originalPrice: 1300,
                bundlePrice: 850,
                currency: 'coins',
                discountPct: 35,
                description: 'Cool looks for the coldest tracks.',
                expiresAt: null
            },
            {
                id: 'bundle_beast_pack',
                name: 'Beast Mode Pack',
                items: ['shop_paint_magma', 'shop_decal_wolf', 'shop_wheel_spectrum'],
                originalPrice: 1650,
                bundlePrice: 1100,
                currency: 'coins',
                discountPct: 33,
                description: 'Unleash the beast on every hill.',
                expiresAt: null
            },
            {
                id: 'bundle_shadow_fx',
                name: 'Shadow FX Pack',
                items: ['shop_paint_voidx', 'shop_trail_glacier', 'shop_aura_frostbite'],
                originalPrice: 175,
                bundlePrice: 125,
                currency: 'diamonds',
                discountPct: 29,
                description: 'Ride the dark side in style.',
                expiresAt: null
            },
            {
                id: 'bundle_inferno_fx',
                name: 'Inferno FX Pack',
                items: ['shop_aura_inferno', 'shop_horn_thunder', 'shop_paint_voidx'],
                originalPrice: 195,
                bundlePrice: 139,
                currency: 'diamonds',
                discountPct: 29,
                description: 'Blaze a trail nobody forgets.',
                expiresAt: null
            },
            {
                id: 'bundle_ascendant_cosmetics',
                name: 'Ascendant Cosmetics Pack',
                items: ['shop_paint_royalgold', 'shop_trail_meteor', 'shop_decal_serpent', 'shop_horn_kraken'],
                originalPrice: 1630,
                bundlePrice: 1100,
                currency: 'coins',
                discountPct: 33,
                description: 'Rise above the pack in full style.',
                expiresAt: null
            },
            {
                id: 'bundle_legendary_elite',
                name: 'Legendary Elite Pack',
                items: ['shop_paint_mirage', 'shop_aura_celestial', 'shop_aura_storm'],
                originalPrice: 290,
                bundlePrice: 199,
                currency: 'diamonds',
                discountPct: 31,
                description: 'Endgame legends deserve legendary flair.',
                expiresAt: null
            },
            {
                id: 'bundle_storm_fx',
                name: 'Storm FX Pack',
                items: ['shop_trail_phantom', 'shop_horn_symphony', 'shop_decal_royalcrest'],
                originalPrice: 124,
                bundlePrice: 89,
                currency: 'diamonds',
                discountPct: 28,
                description: 'Roll in with thunder and shadow.',
                expiresAt: null
            },
            {
                id: 'bundle_graveyard_shift',
                name: 'Graveyard Shift Pack',
                items: ['shop_paint_tombstone', 'shop_trail_bones', 'shop_decal_grave'],
                originalPrice: 900,
                bundlePrice: 600,
                currency: 'coins',
                discountPct: 33,
                description: 'Haunt the hills after dark.',
                expiresAt: null
            },
            {
                id: 'bundle_haunted_fx',
                name: 'Haunted FX Pack',
                items: ['shop_aura_haunt', 'shop_trail_wraith', 'shop_trail_soul'],
                originalPrice: 175,
                bundlePrice: 125,
                currency: 'diamonds',
                discountPct: 29,
                description: 'Wrap your ride in restless spirits.',
                expiresAt: null
            },
            {
                id: 'bundle_prismatic_cosmetics',
                name: 'Prismatic Cosmetics Pack',
                items: ['shop_paint_prismchrome', 'shop_paint_crimsontide', 'shop_trail_starlace', 'shop_decal_griffin'],
                originalPrice: 1700,
                bundlePrice: 1150,
                currency: 'coins',
                discountPct: 32,
                description: 'Paint the track in every color of the spectrum.',
                expiresAt: null
            },
            {
                id: 'bundle_radiant_fx',
                name: 'Radiant FX Pack',
                items: ['shop_trail_prismbeam', 'shop_horn_maestro', 'shop_aura_radiant', 'shop_aura_prismatic'],
                originalPrice: 299,
                bundlePrice: 209,
                currency: 'diamonds',
                discountPct: 30,
                description: 'Shine like a sovereign on every hill.',
                expiresAt: null
            },
            {
                id: 'bundle_abyssal_cosmetics',
                name: 'Abyssal Cosmetics Pack',
                items: ['shop_paint_coral', 'shop_paint_maelstrom', 'shop_decal_krakenink', 'shop_wheel_tidal'],
                originalPrice: 2120,
                bundlePrice: 1400,
                currency: 'coins',
                discountPct: 34,
                description: 'Drag the deep-sea look up to the hills.',
                expiresAt: null
            },
            {
                id: 'bundle_deepsea_fx',
                name: 'Deep Sea FX Pack',
                items: ['shop_trail_biolume', 'shop_horn_sonar', 'shop_aura_leviathan', 'shop_aura_abyssal'],
                originalPrice: 300,
                bundlePrice: 209,
                currency: 'diamonds',
                discountPct: 30,
                description: 'Glow, ping and prowl like a leviathan.',
                expiresAt: null
            },
            {
                id: 'bundle_neon_cosmetics',
                name: 'Neon City Cosmetics Pack',
                items: ['shop_paint_synthwave', 'shop_paint_hologram', 'shop_decal_neondragon', 'shop_wheel_hoverneon'],
                originalPrice: 1920,
                bundlePrice: 1290,
                currency: 'coins',
                discountPct: 33,
                description: 'Light up the hills with retro-future neon.',
                expiresAt: null
            },
            {
                id: 'bundle_cyber_fx',
                name: 'Cyber FX Pack',
                items: ['shop_trail_lasergrid', 'shop_paint_glitchcore', 'shop_aura_cyberpulse', 'shop_aura_neonsovereign'],
                originalPrice: 324,
                bundlePrice: 229,
                currency: 'diamonds',
                discountPct: 29,
                description: 'Glitch, pulse and reign over the grid.',
                expiresAt: null
            },
            {
                id: 'bundle_steampunk_cosmetics',
                name: 'Steampunk Cosmetics Pack',
                items: ['shop_paint_copperpipe', 'shop_paint_riveted', 'shop_trail_steam', 'shop_wheel_cog'],
                originalPrice: 1920,
                bundlePrice: 1290,
                currency: 'coins',
                discountPct: 33,
                description: 'Gears, rivets and steam for the industrial racer.',
                expiresAt: null
            },
            {
                id: 'bundle_clockwork_fx',
                name: 'Clockwork FX Pack',
                items: ['shop_trail_forgeember', 'shop_horn_steamwhistle', 'shop_aura_clockwork', 'shop_aura_chronosovereign'],
                originalPrice: 298,
                bundlePrice: 209,
                currency: 'diamonds',
                discountPct: 30,
                description: 'Wind up the works and reign over time.',
                expiresAt: null
            },
            {
                id: 'bundle_sakura_cosmetics',
                name: 'Sakura Garden Cosmetics Pack',
                items: ['shop_paint_sakura', 'shop_paint_koi', 'shop_trail_inkbrush', 'shop_decal_torii'],
                originalPrice: 1560,
                bundlePrice: 1050,
                currency: 'coins',
                discountPct: 33,
                description: 'Bring the calm of a blossom garden to the hills.',
                expiresAt: null
            },
            {
                id: 'bundle_zen_fx',
                name: 'Zen FX Pack',
                items: ['shop_paint_lotus', 'shop_aura_zen', 'shop_aura_shogun'],
                originalPrice: 278,
                bundlePrice: 199,
                currency: 'diamonds',
                discountPct: 28,
                description: 'Serene glow and sovereign flair for the master racer.',
                expiresAt: null
            },
            {
                id: 'bundle_aztec_cosmetics',
                name: 'Aztec Empire Cosmetics Pack',
                items: ['shop_paint_terracotta', 'shop_paint_goldmask', 'shop_decal_sunstone', 'shop_trail_sandveil'],
                originalPrice: 1820,
                bundlePrice: 1220,
                currency: 'coins',
                discountPct: 33,
                description: 'Race in the gold and jade of a lost empire.',
                expiresAt: null
            },
            {
                id: 'bundle_solar_fx',
                name: 'Solar FX Pack',
                items: ['shop_trail_solareclipse', 'shop_paint_quetzal', 'shop_aura_sunemperor'],
                originalPrice: 244,
                bundlePrice: 169,
                currency: 'diamonds',
                discountPct: 31,
                description: 'Blaze across the hills like a sun god.',
                expiresAt: null
            },
            {
                id: 'bundle_crystalline_cosmetics',
                name: 'Crystalline Cosmetics Pack',
                items: ['shop_paint_sapphire', 'shop_paint_ruby', 'shop_wheel_diamond', 'shop_trail_crystal'],
                originalPrice: 1870,
                bundlePrice: 1250,
                currency: 'coins',
                discountPct: 33,
                description: 'Deck your ride in polished jewels and gemstone shine.',
                expiresAt: null
            },
            {
                id: 'bundle_gemstone_fx',
                name: 'Gemstone FX Pack',
                items: ['shop_trail_geode', 'shop_aura_gemstone', 'shop_aura_diamondcrown'],
                originalPrice: 258,
                bundlePrice: 179,
                currency: 'diamonds',
                discountPct: 31,
                description: 'Sparkle, glow and reign in crystalline splendor.',
                expiresAt: null
            },
            {
                id: 'bundle_galactic_cosmetics',
                name: 'Galactic Voyager Cosmetics Pack',
                items: ['shop_paint_supernova', 'shop_wheel_orbit', 'shop_decal_constellation', 'shop_trail_warpdrive'],
                originalPrice: 1720,
                bundlePrice: 1150,
                currency: 'coins',
                discountPct: 33,
                description: 'Chart the stars and race across the cosmos.',
                expiresAt: null
            },
            {
                id: 'bundle_cosmic_fx',
                name: 'Cosmic FX Pack',
                items: ['shop_trail_wormhole', 'shop_aura_galaxy', 'shop_aura_cosmicsovereign'],
                originalPrice: 260,
                bundlePrice: 179,
                currency: 'diamonds',
                discountPct: 31,
                description: 'Warp, glow and reign across the galaxy.',
                expiresAt: null
            },
            {
                id: 'bundle_regal_cosmetics',
                name: 'Royal Court Cosmetics Pack',
                items: ['shop_paint_regalpurple', 'shop_paint_ivory', 'shop_wheel_scepter', 'shop_decal_heraldry'],
                originalPrice: 1740,
                bundlePrice: 1170,
                currency: 'coins',
                discountPct: 33,
                description: 'Rule the hills in the colors of the crown.',
                expiresAt: null
            },
            {
                id: 'bundle_royalcourt_fx',
                name: 'Royal Court FX Pack',
                items: ['shop_trail_crownjewel', 'shop_paint_monarch', 'shop_aura_royalcourt', 'shop_aura_sovereignking'],
                originalPrice: 330,
                bundlePrice: 229,
                currency: 'diamonds',
                discountPct: 31,
                description: 'Glow, flourish and reign like a sovereign king.',
                expiresAt: null
            },
            {
                id: 'bundle_pirate_cosmetics',
                name: 'Buccaneer Cosmetics Pack',
                items: ['shop_paint_krakenhide', 'shop_wheel_helm', 'shop_decal_jollyroger', 'shop_trail_cannonsmoke'],
                originalPrice: 1720,
                bundlePrice: 1150,
                currency: 'coins',
                discountPct: 33,
                description: 'Hoist the colors and raid the hills like a pirate king.',
                expiresAt: null
            },
            {
                id: 'bundle_buccaneer_fx',
                name: 'Buccaneer FX Pack',
                items: ['shop_trail_grog', 'shop_paint_cursedgold', 'shop_aura_buccaneer', 'shop_aura_davyjones'],
                originalPrice: 326,
                bundlePrice: 229,
                currency: 'diamonds',
                discountPct: 30,
                description: 'Cursed gold, grog and the wrath of Davy Jones.',
                expiresAt: null
            },
            {
                id: 'bundle_candy_cosmetics',
                name: 'Candy Carnival Cosmetics Pack',
                items: ['shop_paint_caramel', 'shop_wheel_peppermint', 'shop_decal_candystripe', 'shop_trail_gumdrop'],
                originalPrice: 1720,
                bundlePrice: 1150,
                currency: 'coins',
                discountPct: 33,
                description: 'Deck your ride in sweet carnival colors.',
                expiresAt: null
            },
            {
                id: 'bundle_sweets_fx',
                name: 'Sweet Rush FX Pack',
                items: ['shop_trail_sprinkles', 'shop_paint_cottoncandy', 'shop_aura_sugarrush', 'shop_aura_candysovereign'],
                originalPrice: 330,
                bundlePrice: 229,
                currency: 'diamonds',
                discountPct: 31,
                description: 'Sprinkle, glow and reign in a sugar high.',
                expiresAt: null
            }
        ];

        var DAILY_POOL = ['shop_nitro_pack','shop_repair_kit','shop_paint_red','shop_paint_blue',
                          'shop_wheel_chrome','shop_decal_racing','shop_xp_boost_1hr','shop_coin_boost_2hr',
                          'shop_engine_t2','shop_suspension_t2','shop_tire_offroad',
                          'shop_paint_emerald','shop_paint_sunset','shop_paint_carbon','shop_trail_flame',
                          'shop_trail_petal','shop_horn_classic','shop_horn_air','shop_decal_flames',
                          'shop_decal_stars','shop_fuel_can','shop_shield_bubble','shop_mega_nitro','shop_wheel_gold'];

        function refreshDailyDeals() {
            var now = new Date();
            var todayKey = now.toISOString().slice(0, 10);
            if (lastDailyRefresh === todayKey && dailyDeals.length === 5) return dailyDeals;
            var shuffled = DAILY_POOL.slice().sort(function() { return Math.random() - 0.5; });
            dailyDeals = shuffled.slice(0, 5).map(function(itemId) {
                var item = SHOP_INVENTORY.find(function(i) { return i.id === itemId; });
                var discount = [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)];
                return {
                    itemId: itemId,
                    item: item,
                    discountPct: discount,
                    salePrice: Math.floor(item.price * (1 - discount / 100)),
                    refreshesAt: getNextMidnightUTC()
                };
            });
            lastDailyRefresh = todayKey;
            return dailyDeals;
        }

        function getNextMidnightUTC() {
            var d = new Date();
            d.setUTCHours(24, 0, 0, 0);
            return d.getTime();
        }

        function createFlashSale(itemId, discountPct, durationMs) {
            durationMs = durationMs || 2 * 60 * 60 * 1000;
            var item = SHOP_INVENTORY.find(function(i) { return i.id === itemId; });
            if (!item) return null;
            var sale = {
                id: 'flash_' + Date.now(),
                itemId: itemId,
                item: item,
                discountPct: discountPct,
                salePrice: Math.floor(item.price * (1 - discountPct / 100)),
                startsAt: Date.now(),
                endsAt: Date.now() + durationMs
            };
            flashSales.push(sale);
            return sale;
        }

        function getActiveFlashSales() {
            var now = Date.now();
            flashSales = flashSales.filter(function(s) { return s.endsAt > now; });
            return flashSales;
        }

        function purchaseItem(itemId, source) {
            source = source || 'shop';
            var item = SHOP_INVENTORY.find(function(i) { return i.id === itemId; });
            if (!item) return { success: false, reason: 'Item not found' };
            if (item.oneTimePurchase) {
                var alreadyBought = purchaseHistory.some(function(h) { return h.itemId === itemId; });
                if (alreadyBought) return { success: false, reason: 'Already purchased' };
            }
            var record = {
                id: 'pur_' + Date.now(),
                itemId: itemId,
                item: item,
                source: source,
                timestamp: Date.now(),
                refundEligible: true,
                refundDeadline: Date.now() + 24 * 60 * 60 * 1000
            };
            purchaseHistory.push(record);
            return { success: true, purchase: record };
        }

        function refundPurchase(purchaseId) {
            var rec = purchaseHistory.find(function(p) { return p.id === purchaseId; });
            if (!rec) return { success: false, reason: 'Purchase not found' };
            if (!rec.refundEligible) return { success: false, reason: 'Not refundable' };
            if (Date.now() > rec.refundDeadline) return { success: false, reason: 'Refund window expired' };
            rec.refundEligible = false;
            rec.refunded = true;
            rec.refundedAt = Date.now();
            return { success: true, refund: rec };
        }

        function addToWishlist(itemId) {
            if (wishlist.indexOf(itemId) === -1) {
                wishlist.push(itemId);
                return true;
            }
            return false;
        }

        function removeFromWishlist(itemId) {
            var idx = wishlist.indexOf(itemId);
            if (idx !== -1) { wishlist.splice(idx, 1); return true; }
            return false;
        }

        function getWishlistItems() {
            return wishlist.map(function(id) {
                return SHOP_INVENTORY.find(function(i) { return i.id === id; });
            }).filter(Boolean);
        }

        function giftItem(itemId, recipientId, message) {
            var result = purchaseItem(itemId, 'gift');
            if (!result.success) return result;
            return {
                success: true,
                gift: {
                    purchaseId: result.purchase.id,
                    from: 'player_self',
                    to: recipientId,
                    message: message || '',
                    itemId: itemId,
                    sentAt: Date.now()
                }
            };
        }

        function getFeaturedItem() {
            var featurable = SHOP_INVENTORY.filter(function(i) {
                return i.rarity === 'rare' || i.rarity === 'epic';
            });
            var idx = Math.floor((Date.now() / (24 * 60 * 60 * 1000)) % featurable.length);
            var item = featurable[idx];
            return {
                item: item,
                discount: 25,
                salePrice: Math.floor(item.price * 0.75),
                label: 'Featured Deal',
                expiresAt: getNextMidnightUTC()
            };
        }

        function getNewArrivals() {
            var oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            return SHOP_INVENTORY.filter(function(i) {
                return i.addedAt && i.addedAt >= oneWeekAgo;
            });
        }

        return {
            SHOP_INVENTORY: SHOP_INVENTORY,
            BUNDLES: BUNDLES,
            refreshDailyDeals: refreshDailyDeals,
            createFlashSale: createFlashSale,
            getActiveFlashSales: getActiveFlashSales,
            purchaseItem: purchaseItem,
            refundPurchase: refundPurchase,
            addToWishlist: addToWishlist,
            removeFromWishlist: removeFromWishlist,
            getWishlistItems: getWishlistItems,
            giftItem: giftItem,
            getFeaturedItem: getFeaturedItem,
            getNewArrivals: getNewArrivals,
            purchaseHistory: purchaseHistory,
            wishlist: wishlist
        };
    })();

    if (typeof window !== 'undefined') window.SHOP_EXTENDED = SHOP_EXTENDED;
    if (typeof module !== 'undefined' && module.exports) module.exports.SHOP_EXTENDED = SHOP_EXTENDED;
})();


// ================================================================
// ECONOMY_ANALYTICS — Track spending and earning patterns
// ================================================================
const ECONOMY_ANALYTICS = (() => {
  const _log = [];

  function record(type, amount, currency, source) {
    _log.push({ type, amount, currency: currency||'coin', source: source||'unknown', t: Date.now() });
    if (_log.length > 500) _log.shift();
  }

  function earn(amount, currency, source) { record('earn', amount, currency, source); }
  function spend(amount, currency, source){ record('spend', amount, currency, source); }

  function summary(lastN) {
    const entries = lastN ? _log.slice(-lastN) : _log;
    const result  = { earned:{coin:0,diamond:0}, spent:{coin:0,diamond:0}, netCoin:0, netDiamond:0, transactions: entries.length };
    for (const e of entries) {
      if (e.type==='earn') { result.earned[e.currency]=(result.earned[e.currency]||0)+e.amount; }
      else                 { result.spent[e.currency] =(result.spent[e.currency] ||0)+e.amount; }
    }
    result.netCoin    = (result.earned.coin    ||0) - (result.spent.coin    ||0);
    result.netDiamond = (result.earned.diamond ||0) - (result.spent.diamond ||0);
    return result;
  }

  function topSources(currency, topN) {
    const bySource = {};
    for (const e of _log) {
      if (e.currency !== (currency||'coin')) continue;
      bySource[e.source] = (bySource[e.source]||0) + e.amount;
    }
    return Object.entries(bySource).sort((a,b)=>b[1]-a[1]).slice(0,topN||5);
  }

  function getLog() { return _log.slice(); }
  function clear()  { _log.length=0; }

  const COIN_SOURCES = {
    race_finish:    { base:100,  perMeter:0.5 },
    trick_perform:  { base:10,   perPoint:0.01 },
    achievement:    { base:0,    direct:true   },
    daily_mission:  { base:200,  direct:true   },
    ad_reward:      { base:500,  direct:true   },
    iap_small:      { base:2500, direct:true   },
    iap_medium:     { base:7000, direct:true   },
    iap_large:      { base:20000,direct:true   }
  };

  function calcRaceReward(distance, trickScore, bonusMultiplier) {
    const base = Math.floor(distance * COIN_SOURCES.race_finish.perMeter) + COIN_SOURCES.race_finish.base;
    const trick= Math.floor(trickScore * COIN_SOURCES.trick_perform.perPoint);
    return Math.floor((base + trick) * (bonusMultiplier || 1));
  }

  return { earn, spend, record, summary, topSources, getLog, clear, calcRaceReward, COIN_SOURCES };
})();

// ================================================================
// ECONOMY_PRICE_TABLE — All item prices and currency rates
// ================================================================
const ECONOMY_PRICE_TABLE = (() => {
  const VEHICLE_PRICES = {
    common:    { coin:2000,  diamond:0   },
    rare:      { coin:8000,  diamond:0   },
    epic:      { coin:0,     diamond:50  },
    legendary: { coin:0,     diamond:200 },
    secret:    { coin:0,     diamond:500 }
  };

  const UPGRADE_COSTS = Array.from({length:12}, (_,i) => ({
    tier: i+1,
    coin: Math.round(500 * Math.pow(1.6, i)),
    diamond: i >= 8 ? Math.round(10 * Math.pow(1.5, i-8)) : 0
  }));

  const COSMETIC_PRICES = {
    paint_common:   { coin:500 },
    paint_rare:     { coin:2000 },
    paint_epic:     { diamond:20 },
    paint_legendary:{ diamond:80 },
    livery_common:  { coin:1000 },
    livery_rare:    { coin:4000 },
    livery_epic:    { diamond:30 },
    decal:          { coin:200 },
    wheel_common:   { coin:800 },
    wheel_rare:     { coin:3000 },
    wheel_epic:     { diamond:25 }
  };

  const BATTLE_PASS_PRICE = { coin:0, diamond:950, usdCents:499 };
  const COIN_PACKAGES = [
    { id:'coin_s',  coins:2500,  bonus:0,    diamond:0, usdCents:99  },
    { id:'coin_m',  coins:7000,  bonus:400,  diamond:0, usdCents:249 },
    { id:'coin_l',  coins:20000, bonus:2000, diamond:0, usdCents:499 },
    { id:'coin_xl', coins:50000, bonus:10000,diamond:0, usdCents:999 }
  ];
  const DIAMOND_PACKAGES = [
    { id:'gem_s',  diamonds:100,  bonus:0,   usdCents:99  },
    { id:'gem_m',  diamonds:320,  bonus:20,  usdCents:299 },
    { id:'gem_l',  diamonds:900,  bonus:100, usdCents:799 },
    { id:'gem_xl', diamonds:2500, bonus:400, usdCents:1999}
  ];

  function getVehiclePrice(rarity) { return VEHICLE_PRICES[rarity] || VEHICLE_PRICES.common; }
  function getUpgradeCost(tier)    { return UPGRADE_COSTS[Math.min(tier-1, 11)] || UPGRADE_COSTS[0]; }
  function getCosmeticPrice(type)  { return COSMETIC_PRICES[type] || { coin:500 }; }
  function canAfford(wallet, cost) {
    if (cost.coin    && (wallet.coin    || 0) < cost.coin)    return false;
    if (cost.diamond && (wallet.diamond || 0) < cost.diamond) return false;
    return true;
  }

  return { VEHICLE_PRICES, UPGRADE_COSTS, COSMETIC_PRICES, BATTLE_PASS_PRICE, COIN_PACKAGES, DIAMOND_PACKAGES,
           getVehiclePrice, getUpgradeCost, getCosmeticPrice, canAfford };
})();


// ================================================================
// ECONOMY_BUNDLE_SYSTEM — Bundle deals and limited-time offers
// ================================================================
const ECONOMY_BUNDLE_SYSTEM = (() => {
  const _bundles = [
    { id:'starter_pack',    name:'Starter Pack',       price_gems:99,   contents:[{type:'coins',amount:5000},{type:'vehicle','id':'jeep'},{type:'gems',amount:20}],              limited:false, hot:true },
    { id:'speed_pack',      name:'Speed Pack',         price_gems:299,  contents:[{type:'coins',amount:20000},{type:'vehicle','id':'sport_car'},{type:'boost',amount:10}],        limited:false, hot:false },
    { id:'weekend_deal',    name:'Weekend Special',    price_gems:499,  contents:[{type:'coins',amount:50000},{type:'vehicle','id':'monster_truck'},{type:'gems',amount:100}],    limited:true,  hot:true },
    { id:'vip_bundle',      name:'VIP Bundle',         price_gems:999,  contents:[{type:'coins',amount:100000},{type:'vehicle','id':'f1_car'},{type:'gems',amount:250},{type:'battle_pass',amount:1}], limited:true, hot:true },
    { id:'fuel_pack',       name:'Fuel Pack',          price_gems:49,   contents:[{type:'fuel',amount:30}],                                                                       limited:false, hot:false },
    { id:'gem_pack_small',  name:'Gem Pack (Small)',   price_real:0.99, contents:[{type:'gems',amount:50}],                                                                       limited:false, hot:false },
    { id:'gem_pack_medium', name:'Gem Pack (Medium)',  price_real:4.99, contents:[{type:'gems',amount:300}],                                                                      limited:false, hot:true },
    { id:'gem_pack_large',  name:'Gem Pack (Large)',   price_real:9.99, contents:[{type:'gems',amount:700}],                                                                      limited:false, hot:false },
    { id:'gem_pack_xl',     name:'Gem Pack (XL)',      price_real:19.99,contents:[{type:'gems',amount:1600}],                                                                     limited:false, hot:false },
    { id:'gem_pack_mega',   name:'Gem Pack (Mega)',    price_real:49.99,contents:[{type:'gems',amount:4500}],                                                                     limited:false, hot:true },
  ];

  const _activeBundles = new Map(); // id -> {bundle, expiresAt, purchaseCount}

  function loadBundles() {
    _activeBundles.clear();
    const now = Date.now();
    for (const b of _bundles) {
      const expiry = b.limited ? now + (b.id==='weekend_deal' ? 48*3600000 : 72*3600000) : null;
      _activeBundles.set(b.id, { bundle:b, expiresAt:expiry, purchaseCount:0 });
    }
  }

  function getAvailable() {
    const now = Date.now();
    const result = [];
    for (const [id, entry] of _activeBundles) {
      if (entry.expiresAt && now > entry.expiresAt) continue;
      result.push({ ...entry.bundle, timeLeft: entry.expiresAt ? entry.expiresAt-now : null });
    }
    return result;
  }

  function getBundle(id) {
    const e = _activeBundles.get(id);
    if (!e) return null;
    if (e.expiresAt && Date.now() > e.expiresAt) return null;
    return e.bundle;
  }

  function purchase(id, playerData) {
    const bundle = getBundle(id);
    if (!bundle) return { ok:false, reason:'Bundle not available' };
    const currency = bundle.price_gems ? 'gems' : 'real';
    if (currency === 'gems') {
      if ((playerData.gems||0) < bundle.price_gems) return { ok:false, reason:'Not enough gems' };
      playerData.gems = (playerData.gems||0) - bundle.price_gems;
    }
    // Apply contents
    for (const item of bundle.contents) {
      if (item.type==='coins')  playerData.coins  = (playerData.coins||0)  + item.amount;
      if (item.type==='gems')   playerData.gems   = (playerData.gems||0)   + item.amount;
      if (item.type==='fuel')   playerData.fuel   = Math.min(playerData.maxFuel||50, (playerData.fuel||0)+item.amount);
      if (item.type==='vehicle') { playerData.vehicles = playerData.vehicles||[]; if(!playerData.vehicles.includes(item.id)) playerData.vehicles.push(item.id); }
      if (item.type==='boost')  playerData.boosts = (playerData.boosts||0) + item.amount;
      if (item.type==='battle_pass') playerData.hasBattlePass = true;
    }
    const e = _activeBundles.get(id);
    if (e) e.purchaseCount++;
    return { ok:true, contents:bundle.contents, newData:playerData };
  }

  function formatTimeLeft(ms) {
    const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
    if (h>=24) return `${Math.floor(h/24)}d ${h%24}h`;
    return `${h}h ${m}m`;
  }

  loadBundles();
  return { loadBundles, getAvailable, getBundle, purchase, formatTimeLeft };
})();

// ================================================================
// ECONOMY_REWARD_ENGINE — Centralized reward calculation
// ================================================================
const ECONOMY_REWARD_ENGINE = (() => {
  // Base rewards per game mode
  const BASE_REWARDS = {
    adventure:   { coins_per_meter:0.8,  coins_per_flip:20,  coins_per_second:0.5, xp_base:50  },
    cup_race:    { coins_per_meter:1.2,  coins_per_flip:30,  coins_per_second:0.8, xp_base:80  },
    tournament:  { coins_per_meter:2.0,  coins_per_flip:50,  coins_per_second:1.5, xp_base:150 },
    daily:       { coins_per_meter:1.5,  coins_per_flip:40,  coins_per_second:1.0, xp_base:100 },
    survival:    { coins_per_meter:1.0,  coins_per_flip:25,  coins_per_second:0.6, xp_base:60  },
    ghost_race:  { coins_per_meter:1.8,  coins_per_flip:45,  coins_per_second:1.2, xp_base:120 },
    free_play:   { coins_per_meter:0.5,  coins_per_flip:10,  coins_per_second:0.3, xp_base:20  },
  };

  // Multipliers
  const RANK_MULT  = [1.0, 1.2, 1.5, 2.0, 2.5, 3.0]; // ranks 0-5
  const STREAK_MULT = (s) => Math.min(1+s*0.1, 2.5);
  const VIP_MULT   = 1.5;
  const BP_MULT    = 1.25;
  const EVENT_MULT = 2.0;

  function calculate(params) {
    // params: {mode, distance, flips, time, rank, streak, isVip, hasBP, isEvent, vehicleBonus}
    const base = BASE_REWARDS[params.mode] || BASE_REWARDS.adventure;
    let coins = 0;
    coins += (params.distance||0) * base.coins_per_meter;
    coins += (params.flips||0)    * base.coins_per_flip;
    coins += (params.time||0)     * base.coins_per_second;

    // Rank bonus
    coins *= (RANK_MULT[params.rank||0] || 1.0);
    // Streak bonus
    coins *= STREAK_MULT(params.streak||0);
    // Premium bonuses
    if (params.isVip) coins *= VIP_MULT;
    if (params.hasBP) coins *= BP_MULT;
    if (params.isEvent) coins *= EVENT_MULT;
    // Vehicle bonus (from vehicle stats)
    coins *= (1 + (params.vehicleBonus||0)/100);

    // XP
    let xp = base.xp_base;
    xp += (params.distance||0) * 0.05;
    xp += (params.flips||0) * 2;
    if (params.rank === 0) xp *= 1.5; // win bonus
    if (params.isEvent) xp *= 1.3;

    // Gems (rare, only for big achievements)
    let gems = 0;
    if ((params.distance||0) >= 2000) gems += 1;
    if ((params.flips||0)    >= 20)   gems += 1;
    if (params.rank === 0 && params.mode === 'tournament') gems += 3;

    coins = Math.round(coins);
    xp    = Math.round(xp);

    return {
      coins, xp, gems,
      breakdown: {
        fromDistance: Math.round((params.distance||0)*base.coins_per_meter),
        fromFlips:    Math.round((params.flips||0)   *base.coins_per_flip),
        fromTime:     Math.round((params.time||0)    *base.coins_per_second),
        rankMult:     RANK_MULT[params.rank||0]||1,
        streakMult:   STREAK_MULT(params.streak||0),
        vipMult:      params.isVip ? VIP_MULT : 1,
        bpMult:       params.hasBP ? BP_MULT : 1,
        eventMult:    params.isEvent ? EVENT_MULT : 1,
      }
    };
  }

  function applyRewards(playerData, rewards) {
    playerData.coins = (playerData.coins||0) + rewards.coins;
    playerData.xp    = (playerData.xp||0)    + rewards.xp;
    playerData.gems  = (playerData.gems||0)  + rewards.gems;
    // Level up check
    const XP_PER_LEVEL = 500;
    const newLevel = Math.floor(playerData.xp / XP_PER_LEVEL) + 1;
    const leveledUp = newLevel > (playerData.level||1);
    playerData.level = newLevel;
    return { ...rewards, leveledUp, newLevel: playerData.level };
  }

  function dailyLoginReward(dayStreak) {
    const rewards = [
      { coins:200,  gems:0,  special:null },
      { coins:300,  gems:0,  special:null },
      { coins:500,  gems:1,  special:null },
      { coins:700,  gems:1,  special:null },
      { coins:1000, gems:2,  special:null },
      { coins:1500, gems:3,  special:'rare_chest' },
      { coins:2500, gems:5,  special:'epic_chest' },
    ];
    const idx = Math.min(dayStreak-1, rewards.length-1) % rewards.length;
    return { ...rewards[idx], day:dayStreak };
  }

  return { calculate, applyRewards, dailyLoginReward, BASE_REWARDS, RANK_MULT, STREAK_MULT, VIP_MULT, BP_MULT, EVENT_MULT };
})();

// ================================================================
// ECONOMY_SEASON_PASS — Battle pass economy layer
// ================================================================
const ECONOMY_SEASON_PASS = (() => {
  const TIERS = 100;
  const XP_PER_TIER = 200;
  const SEASON_DURATION_DAYS = 60;

  function buildRewardTable() {
    const table = [];
    for (let i=1; i<=TIERS; i++) {
      const isMilestone = i % 10 === 0;
      const free = {
        tier:i,
        type: isMilestone ? 'vehicle_skin' : (i%5===0 ? 'gems' : 'coins'),
        amount: isMilestone ? 1 : (i%5===0 ? Math.floor(i/5)*5 : i*100)
      };
      const premium = {
        tier:i,
        type: isMilestone ? 'vehicle' : (i%3===0 ? 'gems' : (i%2===0 ? 'coins' : 'boost')),
        amount: isMilestone ? 1 : (i%3===0 ? Math.floor(i/3)*10 : (i%2===0 ? i*200 : 3))
      };
      table.push({ tier:i, free, premium, isMilestone });
    }
    return table;
  }

  const _rewardTable = buildRewardTable();

  function getProgress(playerXP) {
    const tier   = Math.min(TIERS, Math.floor(playerXP / XP_PER_TIER) + 1);
    const xpInto = playerXP % XP_PER_TIER;
    const pct    = xpInto / XP_PER_TIER;
    return { tier, xpInto, pct, xpToNext: XP_PER_TIER-xpInto };
  }

  function getRewardsForTier(tier) {
    return _rewardTable[tier-1] || null;
  }

  function getUnclaimedRewards(playerXP, claimedTiers, isPremium) {
    const { tier } = getProgress(playerXP);
    const unclaimed = [];
    for (let t=1; t<=tier; t++) {
      if (claimedTiers.includes(t)) continue;
      const row = _rewardTable[t-1];
      if (!row) continue;
      unclaimed.push(isPremium ? row.premium : row.free);
    }
    return unclaimed;
  }

  function claimTier(tier, playerData, isPremium) {
    const row = _rewardTable[tier-1];
    if (!row) return { ok:false, reason:'Invalid tier' };
    const reward = isPremium ? row.premium : row.free;
    if (reward.type === 'coins')  playerData.coins  = (playerData.coins||0)  + reward.amount;
    if (reward.type === 'gems')   playerData.gems   = (playerData.gems||0)   + reward.amount;
    if (reward.type === 'boost')  playerData.boosts = (playerData.boosts||0) + reward.amount;
    if (reward.type === 'vehicle' || reward.type==='vehicle_skin') {
      playerData.vehicles = playerData.vehicles||[];
      playerData.vehicles.push({ id:'bp_t'+tier, tier, isPremium });
    }
    playerData.claimedBPTiers = playerData.claimedBPTiers||[];
    playerData.claimedBPTiers.push(tier);
    return { ok:true, reward };
  }

  function daysLeft() {
    // Placeholder — in real game tied to season end date
    return SEASON_DURATION_DAYS;
  }

  return { TIERS, XP_PER_TIER, SEASON_DURATION_DAYS, buildRewardTable, getProgress, getRewardsForTier, getUnclaimedRewards, claimTier, daysLeft, _rewardTable };
})();

// ================================================================
// ECONOMY_COIN_SINK — Ways to spend coins (coin sinks)
// ================================================================
const ECONOMY_COIN_SINK = (() => {
  const SINKS = {
    upgrade_engine:   { baseCost:500,  scaleFactor:1.4, maxLevel:20, description:'Engine upgrade' },
    upgrade_grip:     { baseCost:400,  scaleFactor:1.35,maxLevel:20, description:'Grip upgrade' },
    upgrade_suspension:{ baseCost:600, scaleFactor:1.45,maxLevel:15, description:'Suspension upgrade' },
    upgrade_nitro:    { baseCost:800,  scaleFactor:1.5, maxLevel:10, description:'Nitro upgrade' },
    unlock_map:       { baseCost:2000, scaleFactor:2.0, maxLevel:1,  description:'Map unlock' },
    paint_job:        { baseCost:1000, scaleFactor:1.0, maxLevel:999,description:'Paint job' },
    sticker_pack:     { baseCost:500,  scaleFactor:1.0, maxLevel:999,description:'Sticker pack' },
    chest_coin:       { baseCost:3000, scaleFactor:1.0, maxLevel:999,description:'Coin chest' },
  };

  function getCost(sinkId, currentLevel) {
    const s = SINKS[sinkId];
    if (!s) return Infinity;
    if (currentLevel >= s.maxLevel) return Infinity;
    return Math.round(s.baseCost * Math.pow(s.scaleFactor, currentLevel));
  }

  function canAfford(sinkId, currentLevel, playerCoins) {
    return playerCoins >= getCost(sinkId, currentLevel);
  }

  function spend(sinkId, currentLevel, playerData) {
    const cost = getCost(sinkId, currentLevel);
    if ((playerData.coins||0) < cost) return { ok:false, reason:'Not enough coins', cost };
    playerData.coins -= cost;
    return { ok:true, cost, newCoins:playerData.coins };
  }

  function getNextUpgradeCosts(playerData) {
    const result = {};
    for (const [id, sink] of Object.entries(SINKS)) {
      const level = (playerData.upgrades||{})[id] || 0;
      if (level < sink.maxLevel) {
        result[id] = { cost:getCost(id,level), level, maxLevel:sink.maxLevel, description:sink.description };
      }
    }
    return result;
  }

  return { SINKS, getCost, canAfford, spend, getNextUpgradeCosts };
})();


// ================================================================
// ECONOMY_SEASONAL_EVENTS — Limited-time event economy
// ================================================================
const ECONOMY_SEASONAL_EVENTS = (() => {
  const EVENTS = [
    {
      id: 'halloween_2025', name: 'Halloween Race', icon: '🎃',
      startDate: '2025-10-24', endDate: '2025-11-03',
      coinMult: 1.5, gemMult: 1.0, xpMult: 2.0,
      exclusiveItems: ['pumpkin_kart', 'ghost_trail', 'bat_horn'],
      challengeTasks: [
        { id:'ht_1', label:'Race 5 Halloween maps', target:5,  reward:{coins:1000, gems:5}  },
        { id:'ht_2', label:'Collect 666 coins',    target:666, reward:{coins:500,  gems:3}  },
        { id:'ht_3', label:'Do 13 backflips',       target:13,  reward:{coins:800,  gems:8}  },
      ],
      backgroundColor: '#1a0a00', accentColor: '#ff6600',
    },
    {
      id: 'winter_2025', name: 'Winter Championship', icon: '❄️',
      startDate: '2025-12-15', endDate: '2026-01-05',
      coinMult: 1.3, gemMult: 1.5, xpMult: 1.5,
      exclusiveItems: ['snowmobile', 'ice_trail', 'jingle_horn'],
      challengeTasks: [
        { id:'wt_1', label:'Complete 10 snow maps',  target:10,  reward:{coins:2000, gems:10} },
        { id:'wt_2', label:'Earn 5000 winter coins', target:5000,reward:{coins:1000, gems:15} },
        { id:'wt_3', label:'Win 5 races in a row',   target:5,   reward:{coins:1500, gems:20} },
      ],
      backgroundColor: '#001830', accentColor: '#88ddff',
    },
    {
      id: 'spring_2026', name: 'Spring Rally',      icon: '🌸',
      startDate: '2026-03-20', endDate: '2026-04-05',
      coinMult: 1.2, gemMult: 1.2, xpMult: 1.8,
      exclusiveItems: ['flower_buggy', 'petal_trail', 'bird_horn'],
      challengeTasks: [
        { id:'sp_1', label:'Drive 10km total',      target:10000,reward:{coins:1500, gems:8}  },
        { id:'sp_2', label:'Collect 50 spring gems',target:50,   reward:{coins:2000, gems:25} },
        { id:'sp_3', label:'Land 20 flips',         target:20,   reward:{coins:1000, gems:10} },
      ],
      backgroundColor: '#0a1a00', accentColor: '#88ff44',
    },
    {
      id: 'summer_2026', name: 'Summer Beach Bash', icon: '🏖️',
      startDate: '2026-06-21', endDate: '2026-07-06',
      coinMult: 2.0, gemMult: 1.0, xpMult: 1.5,
      exclusiveItems: ['beach_buggy', 'splash_trail', 'surf_horn'],
      challengeTasks: [
        { id:'su_1', label:'Race on 5 beach maps',  target:5,    reward:{coins:1000, gems:5}  },
        { id:'su_2', label:'Earn 10000 coins',      target:10000,reward:{coins:2000, gems:10} },
        { id:'su_3', label:'Longest jump over 50m', target:50,   reward:{coins:3000, gems:20} },
      ],
      backgroundColor: '#1a1000', accentColor: '#ffdd44',
    },
  ];

  function getActive(dateStr) {
    const d = dateStr || new Date().toISOString().slice(0,10);
    return EVENTS.filter(e => d >= e.startDate && d <= e.endDate);
  }

  function getUpcoming(dateStr, count) {
    const d = dateStr || new Date().toISOString().slice(0,10);
    return EVENTS.filter(e => e.startDate > d).slice(0, count||3);
  }

  function getMultipliers(dateStr) {
    const active = getActive(dateStr);
    if (!active.length) return { coin:1, gem:1, xp:1 };
    // Take max from all active events
    return {
      coin: Math.max(...active.map(e=>e.coinMult)),
      gem:  Math.max(...active.map(e=>e.gemMult)),
      xp:   Math.max(...active.map(e=>e.xpMult)),
    };
  }

  function getDaysLeft(eventId, dateStr) {
    const d = dateStr || new Date().toISOString().slice(0,10);
    const ev = EVENTS.find(e=>e.id===eventId);
    if (!ev || d > ev.endDate) return 0;
    const diff = new Date(ev.endDate) - new Date(d);
    return Math.ceil(diff/86400000);
  }

  function getEventById(id) { return EVENTS.find(e=>e.id===id)||null; }
  function getAll()         { return [...EVENTS]; }

  function getChallengeProgress(eventId, playerStats) {
    const ev = getEventById(eventId);
    if (!ev) return [];
    return ev.challengeTasks.map(task=>{
      const progress = (playerStats||{})[task.id]||0;
      return { ...task, progress, pct:Math.min(1,progress/task.target), done:progress>=task.target };
    });
  }

  return { EVENTS, getActive, getUpcoming, getMultipliers, getDaysLeft, getEventById, getAll, getChallengeProgress };
})();

