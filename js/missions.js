'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// MISSIONS — Günlük görevler. İlerleme oyun sırasında güncellenir, ödül alınır.
// ═══════════════════════════════════════════════════════════════════════════
const Missions = {
  defs: [
    { id:'dist',  type:'distance', goal:3000, reward:200, text:'Tek turda 3000m yol yap' },
    { id:'dist2', type:'distance', goal:6000, reward:350, text:'Tek turda 6000m yol yap' },
    { id:'flips', type:'flips',    goal:10,   reward:180, text:'10 takla at' },
    { id:'coins', type:'coins',    goal:60,   reward:150, text:'60 altın topla' },
    { id:'boost', type:'boost',    goal:8,    reward:120, text:'8 kez nitro kullan' },
    { id:'air',   type:'air',      goal:6,    reward:180, text:'Toplam 6 sn havada kal' },
    { id:'ring',  type:'ring',     goal:3,    reward:160, text:'3 altın halkadan geç' },
    { id:'dist3', type:'distance', goal:9000,  reward:500, text:'Tek turda 9000m yol yap' },
    { id:'dist4', type:'distance', goal:12000, reward:700, text:'Tek turda 12000m yol yap' },
    { id:'flips2',type:'flips',    goal:20,    reward:320, text:'20 takla at' },
    { id:'flips3',type:'flips',    goal:35,    reward:500, text:'35 takla at' },
    { id:'coins2',type:'coins',    goal:120,   reward:280, text:'120 altın topla' },
    { id:'coins3',type:'coins',    goal:200,   reward:420, text:'200 altın topla' },
    { id:'boost2',type:'boost',    goal:15,    reward:220, text:'15 kez nitro kullan' },
    { id:'boost3',type:'boost',    goal:25,    reward:360, text:'25 kez nitro kullan' },
    { id:'air2',  type:'air',      goal:12,    reward:320, text:'Toplam 12 sn havada kal' },
    { id:'air3',  type:'air',      goal:20,    reward:480, text:'Toplam 20 sn havada kal' },
    { id:'ring2', type:'ring',     goal:6,     reward:300, text:'6 altın halkadan geç' },
    { id:'ring3', type:'ring',     goal:10,    reward:480, text:'10 altın halkadan geç' },
    { id:'dist5', type:'distance', goal:4500,  reward:260, text:'Tek turda 4500m yol yap' },
    { id:'dist6', type:'distance', goal:15000, reward:850, text:'Tek turda 15000m yol yap' },
    { id:'dist7', type:'distance', goal:20000, reward:1100,text:'Tek turda 20000m yol yap' },
    { id:'flips4',type:'flips',    goal:50,    reward:700, text:'50 takla at' },
    { id:'flips5',type:'flips',    goal:75,    reward:1000,text:'75 takla at' },
    { id:'coins4',type:'coins',    goal:300,   reward:600, text:'300 altın topla' },
    { id:'coins5',type:'coins',    goal:500,   reward:900, text:'500 altın topla' },
    { id:'boost4',type:'boost',    goal:40,    reward:520, text:'40 kez nitro kullan' },
    { id:'boost5',type:'boost',    goal:60,    reward:750, text:'60 kez nitro kullan' },
    { id:'air4',  type:'air',      goal:30,    reward:700, text:'Toplam 30 sn havada kal' },
    { id:'air5',  type:'air',      goal:45,    reward:950, text:'Toplam 45 sn havada kal' },
    { id:'ring4', type:'ring',     goal:15,    reward:680, text:'15 altın halkadan geç' },
    { id:'ring5', type:'ring',     goal:20,    reward:900, text:'20 altın halkadan geç' },
    { id:'ring6', type:'ring',     goal:25,    reward:1100,text:'25 altın halkadan geç' },

    // ── Ek standart varyantlar (havuz derinliği) ──
    { id:'dist8', type:'distance', goal:2000,  reward:150, text:'Tek turda 2000m yol yap' },
    { id:'coins6',type:'coins',    goal:80,    reward:200, text:'80 altın topla' },
    { id:'flips6',type:'flips',    goal:15,    reward:260, text:'15 takla at' },
    { id:'air6',  type:'air',      goal:9,     reward:250, text:'Toplam 9 sn havada kal' },
    { id:'ring7', type:'ring',     goal:4,     reward:220, text:'4 altın halkadan geç' },
    { id:'boost6',type:'boost',    goal:10,    reward:170, text:'10 kez nitro kullan' },

    // ── Harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_cs',  type:'map', base:'distance', map:'countryside', goal:4000, reward:300, text:'Kırlarda 4000m yol yap' },
    { id:'map_des', type:'map', base:'distance', map:'desert',      goal:3500, reward:320, text:'Çölde 3500m yol yap' },
    { id:'map_city',type:'map', base:'distance', map:'city',        goal:3500, reward:320, text:'Şehirde 3500m yol yap' },
    { id:'map_arc', type:'map', base:'distance', map:'arctic',      goal:3000, reward:340, text:'Kutupta 3000m yol yap' },
    { id:'map_mars',type:'map', base:'distance', map:'mars',        goal:3000, reward:360, text:'Mars’ta 3000m yol yap' },
    { id:'map_moon',type:'map', base:'distance', map:'moon',        goal:3000, reward:360, text:'Ay’da 3000m yol yap' },
    { id:'map_vol', type:'map', base:'distance', map:'volcano',     goal:2800, reward:380, text:'Yanardağda 2800m yol yap' },

    // ── Araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_jeep', type:'vehicle', base:'distance', veh:'jeep',      goal:3000, reward:260, text:'Jip ile 3000m yol yap' },
    { id:'veh_moto', type:'vehicle', base:'distance', veh:'motocross', goal:3500, reward:300, text:'Motokros ile 3500m yol yap' },
    { id:'veh_mon',  type:'vehicle', base:'distance', veh:'monster',   goal:2500, reward:320, text:'Canavar Kamyon ile 2500m yol yap' },
    { id:'veh_sport',type:'vehicle', base:'distance', veh:'sportscar', goal:4000, reward:340, text:'Spor Araba ile 4000m yol yap' },
    { id:'veh_super',type:'vehicle', base:'distance', veh:'supercar',  goal:5000, reward:420, text:'Süper Araba ile 5000m yol yap' },

    // ── Kombo görevleri (base: flips — tek zıplamadaki takla) ──
    { id:'combo2', type:'combo', base:'flips', goal:2, reward:200, text:'Tek zıplamada 2 takla at' },
    { id:'combo3', type:'combo', base:'flips', goal:3, reward:360, text:'Tek zıplamada 3 takla at' },
    { id:'combo4', type:'combo', base:'flips', goal:4, reward:600, text:'Tek zıplamada 4 takla at' },

    // ── Hasarsız görevler (base: distance — tek turda hasar almadan) ──
    { id:'clean1', type:'nodmg', base:'distance', goal:2000, reward:340, text:'Hasar almadan 2000m yol yap' },
    { id:'clean2', type:'nodmg', base:'distance', goal:4000, reward:560, text:'Hasar almadan 4000m yol yap' },
    { id:'clean3', type:'nodmg', base:'distance', goal:6000, reward:820, text:'Hasar almadan 6000m yol yap' },
    { id:'clean4', type:'nodmg', base:'distance', goal:3000, reward:460, text:'Hasar almadan 3000m yol yap' },
    { id:'clean5', type:'nodmg', base:'distance', goal:8000, reward:1000,text:'Hasar almadan 8000m yol yap' },

    // ── Coin Rush görevleri (base: distance — yalnız Coin Rush modunda, tek turdaki en iyi sikke) ──
    { id:'cr1', type:'coinrush', base:'distance', goal:25, reward:300, text:'Coin Rush’ta tek turda 25 sikke topla' },
    { id:'cr2', type:'coinrush', base:'distance', goal:50, reward:520, text:'Coin Rush’ta tek turda 50 sikke topla' },
    { id:'cr3', type:'coinrush', base:'distance', goal:80, reward:780, text:'Coin Rush’ta tek turda 80 sikke topla' },

    // ── Sakura haritası görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_sak',  type:'map', base:'distance', map:'sakura', goal:3200, reward:340, text:'Sakura’da 3200m yol yap' },
    { id:'map_sak2', type:'map', base:'distance', map:'sakura', goal:6000, reward:560, text:'Sakura’da 6000m yol yap' },

    // ── Yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_race',  type:'vehicle', base:'distance', veh:'racecar',    goal:5000, reward:400, text:'Yarış Arabası ile 5000m yol yap' },
    { id:'veh_rally', type:'vehicle', base:'distance', veh:'rallycar',   goal:4000, reward:360, text:'Ralli Arabası ile 4000m yol yap' },
    { id:'veh_tank',  type:'vehicle', base:'distance', veh:'tank',       goal:2000, reward:360, text:'Tank ile 2000m yol yap' },
    { id:'veh_cyber', type:'vehicle', base:'distance', veh:'cybertruck', goal:4500, reward:420, text:'Cybertruck ile 4500m yol yap' },
    { id:'veh_drag',  type:'vehicle', base:'distance', veh:'dragster',   goal:6000, reward:500, text:'Dragster ile 6000m yol yap' },

    // ── Ek kombo görevi (base: flips — tek zıplamadaki takla) ──
    { id:'combo5', type:'combo', base:'flips', goal:5, reward:900, text:'Tek zıplamada 5 takla at' },

    // ── Ek nitro görevleri (wired: boost) ──
    { id:'boost7', type:'boost', goal:5,  reward:100, text:'5 kez nitro kullan' },
    { id:'boost8', type:'boost', goal:30, reward:420, text:'30 kez nitro kullan' },
    { id:'boost9', type:'boost', goal:50, reward:640, text:'50 kez nitro kullan' },

    // ── Yakıt Denemesi görevleri (base: distance — yalnız fueltrial modunda, tek turdaki en iyi mesafe) ──
    { id:'ft1', type:'fueltrial', base:'distance', goal:1500, reward:320, text:'Yakıt Denemesi’nde tek turda 1500m yol yap' },
    { id:'ft2', type:'fueltrial', base:'distance', goal:3000, reward:540, text:'Yakıt Denemesi’nde tek turda 3000m yol yap' },
    { id:'ft3', type:'fueltrial', base:'distance', goal:5000, reward:820, text:'Yakıt Denemesi’nde tek turda 5000m yol yap' },

    // ── Checkpoint görevleri (base: distance — yalnız checkpoint modunda, tek turdaki en iyi) ──
    { id:'cp1',  type:'checkpoint',     base:'distance', goal:5,    reward:340, text:'Checkpoint modunda tek turda 5 kontrol noktasına ulaş' },
    { id:'cp2',  type:'checkpoint',     base:'distance', goal:10,   reward:560, text:'Checkpoint modunda tek turda 10 kontrol noktasına ulaş' },
    { id:'cp3',  type:'checkpoint',     base:'distance', goal:20,   reward:900, text:'Checkpoint modunda tek turda 20 kontrol noktasına ulaş' },
    { id:'cpd1', type:'checkpointdist', base:'distance', goal:2500, reward:400, text:'Checkpoint modunda tek turda 2500m yol yap' },
    { id:'cpd2', type:'checkpointdist', base:'distance', goal:5000, reward:680, text:'Checkpoint modunda tek turda 5000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_bugatti', type:'vehicle', base:'distance', veh:'bugatti',     goal:6000, reward:520, text:'Bugatti ile 6000m yol yap' },
    { id:'veh_rocket',  type:'vehicle', base:'distance', veh:'rocketcar',   goal:6000, reward:540, text:'Roket Araba ile 6000m yol yap' },
    { id:'veh_bigfoot', type:'vehicle', base:'distance', veh:'bigfoot',     goal:2500, reward:360, text:'Bigfoot ile 2500m yol yap' },
    { id:'veh_hover',   type:'vehicle', base:'distance', veh:'hovercraft',  goal:4000, reward:420, text:'Hovercraft ile 4000m yol yap' },
    { id:'veh_mech',    type:'vehicle', base:'distance', veh:'mechwalker',  goal:2000, reward:400, text:'Mech Walker ile 2000m yol yap' },
    { id:'veh_trophy',  type:'vehicle', base:'distance', veh:'trophytruck', goal:5000, reward:440, text:'Trophy Truck ile 5000m yol yap' },

    // ── Yüksek kombo kademeleri (base: flips — tek zıplamadaki takla) ──
    { id:'combo6', type:'combo', base:'flips', goal:6, reward:1300, text:'Tek zıplamada 6 takla at' },
    { id:'combo7', type:'combo', base:'flips', goal:7, reward:1700, text:'Tek zıplamada 7 takla at' },

    // ── Yüksek havada kalma kademeleri (wired: air) ──
    { id:'air7', type:'air', goal:60, reward:1200, text:'Toplam 60 sn havada kal' },
    { id:'air8', type:'air', goal:80, reward:1500, text:'Toplam 80 sn havada kal' },

    // ── Kusursuz iniş görevleri (base: distance — tek turda peş peşe kusursuz iniş, en iyi) ──
    { id:'perf1', type:'perfland', base:'distance', goal:3, reward:360, text:'Tek turda peş peşe 3 kusursuz iniş yap' },
    { id:'perf2', type:'perfland', base:'distance', goal:5, reward:620, text:'Tek turda peş peşe 5 kusursuz iniş yap' },
    { id:'perf3', type:'perfland', base:'distance', goal:8, reward:980, text:'Tek turda peş peşe 8 kusursuz iniş yap' },

    // ── Tek tur altın görevleri (base: coins — tek turda toplanan altın, en iyi) ──
    { id:'coinrun1', type:'coinrun', base:'coins', goal:40,  reward:280, text:'Tek turda 40 altın topla' },
    { id:'coinrun2', type:'coinrun', base:'coins', goal:75,  reward:460, text:'Tek turda 75 altın topla' },
    { id:'coinrun3', type:'coinrun', base:'coins', goal:120, reward:720, text:'Tek turda 120 altın topla' },

    // ── Tek tur havada kalma görevleri (base: air — tek turda havada geçen süre, en iyi) ──
    { id:'airrun1', type:'airrun', base:'air', goal:5,  reward:300, text:'Tek turda 5 sn havada kal' },
    { id:'airrun2', type:'airrun', base:'air', goal:8,  reward:480, text:'Tek turda 8 sn havada kal' },
    { id:'airrun3', type:'airrun', base:'air', goal:12, reward:760, text:'Tek turda 12 sn havada kal' },

    // ── Ek yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_muscle',  type:'vehicle', base:'distance', veh:'musclecar', goal:4500, reward:380, text:'Kas Araba ile 4500m yol yap' },
    { id:'veh_formula', type:'vehicle', base:'distance', veh:'formula',   goal:6000, reward:520, text:'Formula ile 6000m yol yap' },
    { id:'veh_dune',    type:'vehicle', base:'distance', veh:'dunebuggy', goal:3500, reward:340, text:'Kum Arabası ile 3500m yol yap' },

    // ── Mezarlık haritası görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_grave',  type:'map', base:'distance', map:'graveyard', goal:3200, reward:380, text:'Mezarlıkta 3200m yol yap' },
    { id:'map_grave2', type:'map', base:'distance', map:'graveyard', goal:6000, reward:640, text:'Mezarlıkta 6000m yol yap' },

    // ── Ek Coin Rush görevleri (base: distance — yalnız Coin Rush modunda, tek turdaki en iyi sikke) ──
    { id:'cr4', type:'coinrush', base:'distance', goal:110, reward:1050, text:'Coin Rush’ta tek turda 110 sikke topla' },
    { id:'cr5', type:'coinrush', base:'distance', goal:150, reward:1400, text:'Coin Rush’ta tek turda 150 sikke topla' },

    // ── Ek Yakıt Denemesi görevi (base: distance — yalnız fueltrial modunda, tek turdaki en iyi mesafe) ──
    { id:'ft4', type:'fueltrial', base:'distance', goal:7000, reward:1100, text:'Yakıt Denemesi’nde tek turda 7000m yol yap' },

    // ── Ek Checkpoint görevleri (base: distance — yalnız checkpoint modunda, tek turdaki en iyi) ──
    { id:'cp4',  type:'checkpoint',     base:'distance', goal:30,   reward:1250, text:'Checkpoint modunda tek turda 30 kontrol noktasına ulaş' },
    { id:'cpd3', type:'checkpointdist', base:'distance', goal:8000, reward:1000, text:'Checkpoint modunda tek turda 8000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_coffin', type:'vehicle', base:'distance', veh:'coffinracer',  goal:4000, reward:420, text:'Tabut Yarışçısı ile 4000m yol yap' },
    { id:'veh_shuttle',type:'vehicle', base:'distance', veh:'spaceshuttle', goal:7000, reward:600, text:'Uzay Mekiği ile 7000m yol yap' },
    { id:'veh_hboard', type:'vehicle', base:'distance', veh:'hoverboard',   goal:3500, reward:400, text:'Hoverboard ile 3500m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist9',  type:'distance', goal:25000, reward:1400, text:'Tek turda 25000m yol yap' },
    { id:'coins7', type:'coins',    goal:750,   reward:1200, text:'750 altın topla' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_jungle', type:'map', base:'distance', map:'jungle',    goal:3000, reward:340, text:'Ormanda 3000m yol yap' },
    { id:'map_swamp',  type:'map', base:'distance', map:'swamp',     goal:3000, reward:360, text:'Bataklıkta 3000m yol yap' },
    { id:'map_canyon', type:'map', base:'distance', map:'canyon',    goal:3500, reward:340, text:'Kanyonda 3500m yol yap' },
    { id:'map_neon',   type:'map', base:'distance', map:'neon_city', goal:3500, reward:360, text:'Neon Şehirde 3500m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_sbike', type:'vehicle', base:'distance', veh:'sportsbike', goal:3500, reward:360, text:'Spor Motosiklet ile 3500m yol yap' },
    { id:'veh_hang',  type:'vehicle', base:'distance', veh:'hanglider',  goal:4000, reward:420, text:'Yamaç Paraşütü ile 4000m yol yap' },
    { id:'veh_msub',  type:'vehicle', base:'distance', veh:'minisub',    goal:3000, reward:380, text:'Mini Denizaltı ile 3000m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'coins8', type:'coins', goal:1000, reward:1600, text:'1000 altın topla' },
    { id:'flips7', type:'flips', goal:100,  reward:1300, text:'100 takla at' },
    { id:'air9',   type:'air',   goal:100,  reward:1800, text:'Toplam 100 sn havada kal' },

    // ── Teslimat modu görevleri (base: distance — yalnız Teslimat modunda kat edilen mesafe) ──
    { id:'del1', type:'delivery', base:'distance', goal:2000, reward:340, text:'Teslimat modunda 2000m yol yap' },
    { id:'del2', type:'delivery', base:'distance', goal:4000, reward:560, text:'Teslimat modunda 4000m yol yap' },
    { id:'del3', type:'delivery', base:'distance', goal:6000, reward:820, text:'Teslimat modunda 6000m yol yap' },

    // ── Lunapark haritası görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_carn',  type:'map', base:'distance', map:'carnival', goal:3200, reward:360, text:'Lunaparkta 3200m yol yap' },
    { id:'map_carn2', type:'map', base:'distance', map:'carnival', goal:6000, reward:620, text:'Lunaparkta 6000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_airship',   type:'vehicle', base:'distance', veh:'airship',     goal:5000, reward:460, text:'Zeplin ile 5000m yol yap' },
    { id:'veh_speedster', type:'vehicle', base:'distance', veh:'speedster',   goal:5000, reward:440, text:'Hız Canavarı ile 5000m yol yap' },
    { id:'veh_microcar',  type:'vehicle', base:'distance', veh:'microcar',    goal:3000, reward:340, text:'Mikro Araba ile 3000m yol yap' },
    { id:'veh_tunnel',    type:'vehicle', base:'distance', veh:'tunnelborer', goal:2500, reward:400, text:'Tünel Delici ile 2500m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist10', type:'distance', goal:30000, reward:1700, text:'Tek turda 30000m yol yap' },
    { id:'flips8', type:'flips',    goal:150,   reward:1900, text:'150 takla at' },

    // ── Yel Değirmeni haritası görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_wind',  type:'map', base:'distance', map:'windmill', goal:3200, reward:360, text:'Yel Değirmeninde 3200m yol yap' },
    { id:'map_wind2', type:'map', base:'distance', map:'windmill', goal:6000, reward:640, text:'Yel Değirmeninde 6000m yol yap' },

    // ── Ek Teslimat modu görevi (base: distance — yalnız Teslimat modunda kat edilen mesafe) ──
    { id:'del4', type:'delivery', base:'distance', goal:8000, reward:1050, text:'Teslimat modunda 8000m yol yap' },

    // ── Ek Coin Rush görevi (base: distance — yalnız Coin Rush modunda, tek turdaki en iyi sikke) ──
    { id:'cr6', type:'coinrush', base:'distance', goal:180, reward:1650, text:'Coin Rush’ta tek turda 180 sikke topla' },

    // ── Ek Yakıt Denemesi görevi (base: distance — yalnız fueltrial modunda, tek turdaki en iyi mesafe) ──
    { id:'ft5', type:'fueltrial', base:'distance', goal:9000, reward:1350, text:'Yakıt Denemesi’nde tek turda 9000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_snow',   type:'vehicle', base:'distance', veh:'snowmobile', goal:4000, reward:400, text:'Kar Motosikleti ile 4000m yol yap' },
    { id:'veh_jet',    type:'vehicle', base:'distance', veh:'jetski',     goal:4500, reward:420, text:'Jet Ski ile 4500m yol yap' },
    { id:'veh_gokart', type:'vehicle', base:'distance', veh:'gokart',     goal:3000, reward:340, text:'Go-Kart ile 3000m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist11', type:'distance', goal:35000, reward:2000, text:'Tek turda 35000m yol yap' },
    { id:'coins9', type:'coins',    goal:1500,  reward:2200, text:'1500 altın topla' },
    { id:'flips9', type:'flips',    goal:200,   reward:2400, text:'200 takla at' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_harbor',  type:'map', base:'distance', map:'beach',  goal:3200, reward:360, text:'Sahilde 3200m yol yap' },
    { id:'map_ruins',   type:'map', base:'distance', map:'ruins',   goal:3000, reward:360, text:'Harabelerde 3000m yol yap' },
    { id:'map_glacier', type:'map', base:'distance', map:'glacier', goal:3000, reward:380, text:'Buzulda 3000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_roadster', type:'vehicle', base:'distance', veh:'oldtimer', goal:5000, reward:440, text:'Vintage Roadster ile 5000m yol yap' },
    { id:'veh_atv',      type:'vehicle', base:'distance', veh:'atv',      goal:3000, reward:340, text:'ATV ile 3000m yol yap' },
    { id:'veh_chopper',  type:'vehicle', base:'distance', veh:'chopper',  goal:3500, reward:360, text:'Chopper ile 3500m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist12',  type:'distance', goal:40000, reward:2300, text:'Tek turda 40000m yol yap' },
    { id:'coins10', type:'coins',    goal:2000,  reward:2600, text:'2000 altın topla' },
    { id:'flips10', type:'flips',    goal:250,   reward:2900, text:'250 takla at' },
    { id:'air10',   type:'air',      goal:120,   reward:2100, text:'Toplam 120 sn havada kal' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_under',  type:'map', base:'distance', map:'underwater', goal:3000, reward:360, text:'Su altında 3000m yol yap' },
    { id:'map_cave',   type:'map', base:'distance', map:'cave',       goal:3000, reward:360, text:'Mağarada 3000m yol yap' },
    { id:'map_high',   type:'map', base:'distance', map:'highland',   goal:3200, reward:360, text:'Yaylada 3200m yol yap' },
    { id:'map_savanna',type:'map', base:'distance', map:'savanna',    goal:3200, reward:360, text:'Savanada 3200m yol yap' },
    { id:'map_storm',  type:'map', base:'distance', map:'stormpeak',  goal:3000, reward:380, text:'Fırtına Zirvesinde 3000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_skyferry', type:'vehicle', base:'distance', veh:'skyferry',  goal:6000, reward:600, text:'Sky Ferry ile 6000m yol yap' },
    { id:'veh_landyacht',type:'vehicle', base:'distance', veh:'landyacht', goal:5000, reward:440, text:'Land Yacht ile 5000m yol yap' },
    { id:'veh_iceboat',  type:'vehicle', base:'distance', veh:'iceboat',   goal:4000, reward:400, text:'Ice Boat ile 4000m yol yap' },
    { id:'veh_speedboat',type:'vehicle', base:'distance', veh:'speedboat', goal:5000, reward:460, text:'Speedboat ile 5000m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist13',  type:'distance', goal:45000, reward:2600, text:'Tek turda 45000m yol yap' },
    { id:'coins11', type:'coins',    goal:3000,  reward:3000, text:'3000 altın topla' },
    { id:'flips11', type:'flips',    goal:300,   reward:3400, text:'300 takla at' },
    { id:'ring8',   type:'ring',     goal:30,    reward:1300, text:'30 altın halkadan geç' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_autumn',   type:'map', base:'distance', map:'autumn',       goal:3000, reward:360, text:'Sonbaharda 3000m yol yap' },
    { id:'map_mushroom', type:'map', base:'distance', map:'mushroom',     goal:3000, reward:360, text:'Mantar Diyarında 3000m yol yap' },
    { id:'map_waste',    type:'map', base:'distance', map:'wasteland',    goal:3200, reward:360, text:'Çorak Topraklarda 3200m yol yap' },
    { id:'map_lava',     type:'map', base:'distance', map:'lava_river',   goal:2800, reward:380, text:'Lav Nehrinde 2800m yol yap' },
    { id:'map_crystal',  type:'map', base:'distance', map:'crystal_cave', goal:3000, reward:360, text:'Kristal Mağarada 3000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_solar',   type:'vehicle', base:'distance', veh:'solarcruiser', goal:6000, reward:520, text:'Solar Cruiser ile 6000m yol yap' },
    { id:'veh_maglev',  type:'vehicle', base:'distance', veh:'maglevpod',    goal:6000, reward:560, text:'Maglev Pod ile 6000m yol yap' },
    { id:'veh_dragon',  type:'vehicle', base:'distance', veh:'dragonflyer',  goal:5000, reward:540, text:'Dragon Flyer ile 5000m yol yap' },
    { id:'veh_dunecat', type:'vehicle', base:'distance', veh:'dunecat',      goal:4000, reward:420, text:'Dune Cat ile 4000m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist14',  type:'distance', goal:50000, reward:2900, text:'Tek turda 50000m yol yap' },
    { id:'coins12', type:'coins',    goal:4000,  reward:3400, text:'4000 altın topla' },
    { id:'flips12', type:'flips',    goal:400,   reward:3800, text:'400 takla at' },
    { id:'ring9',   type:'ring',     goal:40,    reward:1600, text:'40 altın halkadan geç' },

    // ── Bambu Ormanı haritası görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_bamboo',  type:'map', base:'distance', map:'bamboo', goal:3200, reward:360, text:'Bambu Ormanında 3200m yol yap' },
    { id:'map_bamboo2', type:'map', base:'distance', map:'bamboo', goal:6000, reward:640, text:'Bambu Ormanında 6000m yol yap' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_cyber', type:'map', base:'distance', map:'cyber_grid', goal:3000, reward:380, text:'Siber Izgarada 3000m yol yap' },
    { id:'map_sky',   type:'map', base:'distance', map:'skyland',    goal:3200, reward:380, text:'Gök Diyarında 3200m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_crop',      type:'vehicle', base:'distance', veh:'cropduster', goal:6000, reward:600, text:'Crop Duster ile 6000m yol yap' },
    { id:'veh_rbike',     type:'vehicle', base:'distance', veh:'rocketbike', goal:6000, reward:560, text:'Roket Motoru ile 6000m yol yap' },
    { id:'veh_gondola',   type:'vehicle', base:'distance', veh:'gondola',    goal:5000, reward:480, text:'Gondol ile 5000m yol yap' },
    { id:'veh_dumptruck', type:'vehicle', base:'distance', veh:'dumptruck',  goal:2500, reward:380, text:'Damperli Kamyon ile 2500m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist15',  type:'distance', goal:55000, reward:3200, text:'Tek turda 55000m yol yap' },
    { id:'coins13', type:'coins',    goal:5000,  reward:3800, text:'5000 altın topla' },
    { id:'flips13', type:'flips',    goal:500,   reward:4200, text:'500 takla at' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_winter', type:'map', base:'distance', map:'winter',    goal:3000, reward:360, text:'Kışta 3000m yol yap' },
    { id:'map_mount',  type:'map', base:'distance', map:'mountains', goal:3200, reward:360, text:'Dağlarda 3200m yol yap' },
    { id:'map_hot',    type:'map', base:'distance', map:'hotwheels', goal:3000, reward:380, text:'Hot Wheels Pistinde 3000m yol yap' },
    { id:'map_cand',   type:'map', base:'distance', map:'candy',     goal:3000, reward:360, text:'Şeker Diyarında 3000m yol yap' },
    { id:'map_toxic',  type:'map', base:'distance', map:'toxic',     goal:3000, reward:380, text:'Toksik Bölgede 3000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_stormjet',   type:'vehicle', base:'distance', veh:'stormjet',    goal:6000, reward:600, text:'Fırtına Jeti ile 6000m yol yap' },
    { id:'veh_partybus',   type:'vehicle', base:'distance', veh:'partybus',    goal:3000, reward:380, text:'Parti Otobüsü ile 3000m yol yap' },
    { id:'veh_icethresher',type:'vehicle', base:'distance', veh:'icethresher', goal:4000, reward:420, text:'Buz Kırıcı ile 4000m yol yap' },
    { id:'veh_roadroller', type:'vehicle', base:'distance', veh:'roadroller2', goal:2500, reward:380, text:'Yol Silindiri ile 2500m yol yap' },
    { id:'veh_sanddigger', type:'vehicle', base:'distance', veh:'sanddigger',  goal:3500, reward:400, text:'Kum Kazıcı ile 3500m yol yap' },

    // ── Ek harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_otoyol', type:'map', base:'distance', map:'otoyol',        goal:3500, reward:360, text:'Otoyolda 3500m yol yap' },
    { id:'map_dag',    type:'map', base:'distance', map:'dag',           goal:3200, reward:360, text:'Dağ Yolunda 3200m yol yap' },
    { id:'map_const',  type:'map', base:'distance', map:'construction',  goal:3000, reward:360, text:'Şantiyede 3000m yol yap' },
    { id:'map_bliz',   type:'map', base:'distance', map:'blizzard',      goal:3000, reward:380, text:'Tipide 3000m yol yap' },
    { id:'map_coaster',type:'map', base:'distance', map:'rollercoaster', goal:3000, reward:380, text:'Hız Treninde 3000m yol yap' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_voltglider', type:'vehicle', base:'distance', veh:'voltglider',  goal:6000, reward:600, text:'Volt Glider ile 6000m yol yap' },
    { id:'veh_snowgroomer',type:'vehicle', base:'distance', veh:'snowgroomer', goal:4000, reward:420, text:'Kar Ezici ile 4000m yol yap' },
    { id:'veh_steamloco',  type:'vehicle', base:'distance', veh:'steamloco',   goal:3000, reward:400, text:'Buharlı Lokomotif ile 3000m yol yap' },
    { id:'veh_swampfan',   type:'vehicle', base:'distance', veh:'swampfan',    goal:4000, reward:420, text:'Bataklık Teknesi ile 4000m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist16',  type:'distance', goal:60000, reward:3500, text:'Tek turda 60000m yol yap' },
    { id:'coins14', type:'coins',    goal:6000,  reward:4200, text:'6000 altın topla' },

    // ── En yeni araç görevleri (base: distance — yalnız o araçla sayılır) ──
    { id:'veh_skyskiff',   type:'vehicle', base:'distance', veh:'skyskiff',    goal:6000, reward:600, text:'Sky Skiff ile 6000m yol yap' },
    { id:'veh_stuntplane', type:'vehicle', base:'distance', veh:'stuntplane',  goal:6000, reward:560, text:'Stunt Plane ile 6000m yol yap' },
    { id:'veh_gyrocopter', type:'vehicle', base:'distance', veh:'gyrocopter',  goal:5000, reward:500, text:'Gyrocopter ile 5000m yol yap' },
    { id:'veh_jetpackbike',type:'vehicle', base:'distance', veh:'jetpackbike', goal:5000, reward:520, text:'Jetpack Bike ile 5000m yol yap' },
    { id:'veh_monsterbike',type:'vehicle', base:'distance', veh:'monsterbike', goal:3500, reward:380, text:'Monster Bike ile 3500m yol yap' },
    { id:'veh_sandrail',   type:'vehicle', base:'distance', veh:'sandrail',    goal:4000, reward:380, text:'Sand Rail ile 4000m yol yap' },
    { id:'veh_minitank',   type:'vehicle', base:'distance', veh:'minitank',    goal:2000, reward:400, text:'Mini Tank ile 2000m yol yap' },

    // ── Yüksek kademe harita görevleri (base: distance — yalnız o haritada sayılır) ──
    { id:'map_neon2',  type:'map', base:'distance', map:'neon_city', goal:6000, reward:640, text:'Neon Şehirde 6000m yol yap' },
    { id:'map_storm2', type:'map', base:'distance', map:'stormpeak', goal:6000, reward:680, text:'Fırtına Zirvesinde 6000m yol yap' },

    // ── Yüksek kademe standart görevler (wired) ──
    { id:'dist17', type:'distance', goal:65000, reward:3800, text:'Tek turda 65000m yol yap' }
  ],

  // Haftalık görevler — daha büyük ödül. İlerleme hafta boyunca birikir.
  weeklyDefs: [
    { id:'w_dist',  type:'distance', goal:60000,  reward:2500, text:'Bu hafta toplam 60.000m yol yap' },
    { id:'w_dist2', type:'distance', goal:100000, reward:4000, text:'Bu hafta toplam 100.000m yol yap' },
    { id:'w_coins', type:'coins',    goal:2000,   reward:2200, text:'Bu hafta 2000 altın topla' },
    { id:'w_coins2',type:'coins',    goal:4000,   reward:3800, text:'Bu hafta 4000 altın topla' },
    { id:'w_flips', type:'flips',    goal:200,    reward:2600, text:'Bu hafta 200 takla at' },
    { id:'w_boost', type:'boost',    goal:120,    reward:2000, text:'Bu hafta 120 kez nitro kullan' },
    { id:'w_air',   type:'air',      goal:150,    reward:2400, text:'Bu hafta toplam 150 sn havada kal' },
    { id:'w_ring',  type:'ring',     goal:60,     reward:2800, text:'Bu hafta 60 altın halkadan geç' },
    { id:'w_combo', type:'combo', base:'flips',    goal:5,     reward:3000, text:'Tek zıplamada 5 takla at' },
    { id:'w_clean', type:'nodmg', base:'distance', goal:10000, reward:3500, text:'Hasar almadan 10.000m yol yap' },
    { id:'w_map',   type:'map',   base:'distance', map:'desert', goal:20000, reward:3200, text:'Bu hafta çölde 20.000m yol yap' },
    { id:'w_coinrush', type:'coinrush', base:'distance', goal:70,    reward:3200, text:'Coin Rush’ta tek turda 70 sikke topla' },
    { id:'w_sakura',   type:'map', base:'distance', map:'sakura', goal:18000, reward:3200, text:'Bu hafta Sakura’da 18.000m yol yap' },
    { id:'w_boost2',   type:'boost', goal:200, reward:3000, text:'Bu hafta 200 kez nitro kullan' },
    { id:'w_fueltrial',   type:'fueltrial',     base:'distance', goal:6000, reward:3400, text:'Yakıt Denemesi’nde tek turda 6000m yol yap' },
    { id:'w_checkpoint',  type:'checkpoint',    base:'distance', goal:25,   reward:3400, text:'Checkpoint modunda tek turda 25 kontrol noktasına ulaş' },
    { id:'w_perfland',    type:'perfland',      base:'distance', goal:6,    reward:3200, text:'Tek turda peş peşe 6 kusursuz iniş yap' },
    { id:'w_coinrun',     type:'coinrun',       base:'coins',    goal:150,  reward:3000, text:'Tek turda 150 altın topla' },
    { id:'w_airrun',      type:'airrun',        base:'air',      goal:15,   reward:3000, text:'Tek turda 15 sn havada kal' },
    { id:'w_veh_formula', type:'vehicle',       base:'distance', veh:'formula', goal:25000, reward:3400, text:'Bu hafta Formula ile 25.000m yol yap' },
    { id:'w_jungle',      type:'map',           base:'distance', map:'jungle',  goal:18000, reward:3200, text:'Bu hafta ormanda 18.000m yol yap' },
    { id:'w_veh_dragster',type:'vehicle',       base:'distance', veh:'dragster',goal:25000, reward:3400, text:'Bu hafta Dragster ile 25.000m yol yap' },
    { id:'w_delivery',    type:'delivery',      base:'distance', goal:25000, reward:3400, text:'Bu hafta Teslimat modunda 25.000m yol yap' },
    { id:'w_carnival',    type:'map',           base:'distance', map:'carnival', goal:18000, reward:3200, text:'Bu hafta Lunaparkta 18.000m yol yap' },
    { id:'w_windmill',    type:'map',           base:'distance', map:'windmill', goal:18000, reward:3200, text:'Bu hafta Yel Değirmeninde 18.000m yol yap' },
    { id:'w_veh_snow',    type:'vehicle',       base:'distance', veh:'snowmobile', goal:25000, reward:3400, text:'Bu hafta Kar Motosikleti ile 25.000m yol yap' },
    { id:'w_harbor',      type:'map',           base:'distance', map:'beach',     goal:18000, reward:3200, text:'Bu hafta Sahilde 18.000m yol yap' },
    { id:'w_veh_roadster',type:'vehicle',       base:'distance', veh:'oldtimer',   goal:25000, reward:3400, text:'Bu hafta Vintage Roadster ile 25.000m yol yap' },
    { id:'w_savanna',      type:'map',           base:'distance', map:'savanna',    goal:18000, reward:3200, text:'Bu hafta Savanada 18.000m yol yap' },
    { id:'w_veh_skyferry', type:'vehicle',       base:'distance', veh:'skyferry',   goal:25000, reward:3400, text:'Bu hafta Sky Ferry ile 25.000m yol yap' },
    { id:'w_autumn',       type:'map',           base:'distance', map:'autumn',     goal:18000, reward:3200, text:'Bu hafta Sonbaharda 18.000m yol yap' },
    { id:'w_veh_maglev',   type:'vehicle',       base:'distance', veh:'maglevpod',  goal:25000, reward:3400, text:'Bu hafta Maglev Pod ile 25.000m yol yap' },
    { id:'w_bamboo',       type:'map',           base:'distance', map:'bamboo',     goal:18000, reward:3200, text:'Bu hafta Bambu Ormanında 18.000m yol yap' },
    { id:'w_veh_crop',     type:'vehicle',       base:'distance', veh:'cropduster', goal:25000, reward:3400, text:'Bu hafta Crop Duster ile 25.000m yol yap' },
    { id:'w_toxic',        type:'map',           base:'distance', map:'toxic',      goal:18000, reward:3200, text:'Bu hafta Toksik Bölgede 18.000m yol yap' },
    { id:'w_veh_stormjet', type:'vehicle',       base:'distance', veh:'stormjet',   goal:25000, reward:3400, text:'Bu hafta Fırtına Jeti ile 25.000m yol yap' },
    { id:'w_otoyol',        type:'map',           base:'distance', map:'otoyol',      goal:18000, reward:3200, text:'Bu hafta Otoyolda 18.000m yol yap' },
    { id:'w_veh_voltglider',type:'vehicle',       base:'distance', veh:'voltglider',  goal:25000, reward:3400, text:'Bu hafta Volt Glider ile 25.000m yol yap' },
    { id:'w_veh_skyskiff',  type:'vehicle',       base:'distance', veh:'skyskiff',    goal:25000, reward:3400, text:'Bu hafta Sky Skiff ile 25.000m yol yap' },
    { id:'w_stormpeak',     type:'map',           base:'distance', map:'stormpeak',   goal:18000, reward:3200, text:'Bu hafta Fırtına Zirvesinde 18.000m yol yap' }
  ],

  _today() { return new Date().toDateString(); },

  _yesterday() {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString();
  },

  _weekKey() {
    const d = new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const wk = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + wk;
  },

  _pickDaily(n) {
    return this.defs.slice().sort(() => Math.random() - 0.5).slice(0, n)
      .map(d => ({ id: d.id, prog: 0, done: false, claimed: false }));
  },

  _pickWeekly(n) {
    return this.weeklyDefs.slice().sort(() => Math.random() - 0.5).slice(0, n)
      .map(d => ({ id: d.id, prog: 0, done: false, claimed: false }));
  },

  state() {
    let s = (typeof SaveData !== 'undefined' && SaveData.get) ? SaveData.get('missions') : null;
    const today = this._today(), week = this._weekKey();
    let dirty = false;
    if (!s || typeof s !== 'object') { s = {}; dirty = true; }

    // Geriye dönük uyumluluk: eski kayıt {day, list} — bugüne aitse koru
    if (!Array.isArray(s._daily)) {
      s._daily = (Array.isArray(s.list) && s.day === today) ? s.list : null;
    }

    // Günlük görevler + gün serisi (streak)
    if (s.day !== today || !Array.isArray(s._daily)) {
      if (s.day !== today) {
        s.streak = (s.day === this._yesterday()) ? ((s.streak || 0) + 1) : 1;
        s.streakDate = today;
      }
      s._daily = this._pickDaily(3);
      s.day = today;
      dirty = true;
    }

    // Haftalık görevler (hafta değişince yenilenir, ilerleme hafta boyunca korunur)
    if (s.week !== week || !Array.isArray(s._weekly)) {
      s._weekly = this._pickWeekly(2);
      s.week = week;
      dirty = true;
    }

    // Birleşik liste: UI ve ödül akışı bunu okur (öğe referansları paylaşılır)
    s.list = s._daily.concat(s._weekly);
    if (dirty && typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('missions', s);
    return s;
  },

  // Şu anki gün serisi (streak) sayısı
  streak() { return (this.state().streak) || 0; },

  def(id) {
    for (const d of this.defs) if (d.id === id) return d;
    for (const d of this.weeklyDefs) if (d.id === id) return d;
    return null;
  },

  // ── Bağlamsal ilerleme yardımcıları (yalnız missions.js içinden okunur) ──
  _curMap()    { return (typeof Game !== 'undefined' && Game.mapId)     ? Game.mapId     : null; },
  _curVeh()    { return (typeof Game !== 'undefined' && Game.vehicleId) ? Game.vehicleId : null; },
  _curCombo()  { return (typeof Game !== 'undefined' && Game._airFlips) ? Game._airFlips : 0; },
  _curDamage() { return (typeof DamageSystem !== 'undefined' && DamageSystem.damageState) ? (DamageSystem.damageState.totalDamageReceived || 0) : 0; },
  _curMode()   { return (typeof GameModes !== 'undefined' && GameModes.mode) ? GameModes.mode : null; },
  _curCRCoins(){ return (typeof GameModes !== 'undefined' && typeof GameModes._crCoins === 'number') ? GameModes._crCoins : 0; },
  _curRunDist(){ return (typeof Game !== 'undefined' && typeof Game._missDist === 'number') ? Math.floor(Game._missDist) : 0; },
  _curCPHit()  { return (typeof GameModes !== 'undefined' && Array.isArray(GameModes.checkpoints)) ? GameModes.checkpoints.filter(c => c && c.hit).length : 0; },
  _curCoinRun(){ return Math.floor(this._coinRun || 0); },
  _curAirRun() { return Math.floor(this._airRun || 0); },
  _curPerfLand(){ return (typeof Game !== 'undefined' && Game._perfectLandingStreak) ? Game._perfectLandingStreak : 0; },

  // Tek turda toplanan altını / havada geçen süreyi izler (coinrun & airrun görevleri için)
  _trackRun(type, amount) {
    const md = (typeof Game !== 'undefined' && typeof Game._missDist === 'number') ? Game._missDist : 0;
    if (this._runMD === undefined || md < this._runMD - 1) {   // yeni tur başladı
      this._coinRun = 0;
      this._airRun  = 0;
    }
    this._runMD = md;
    if (type === 'coins')    this._coinRun = (this._coinRun || 0) + amount;
    else if (type === 'air') this._airRun  = (this._airRun  || 0) + amount;
  },

  // Tek turda hasarsız kat edilen mesafeyi izler (nodmg görevleri için)
  _trackClean(amount) {
    const md = (typeof Game !== 'undefined' && typeof Game._missDist === 'number') ? Game._missDist : 0;
    if (this._lastMD === undefined || md < this._lastMD - 1) {   // yeni tur başladı
      this._cleanRun = 0;
      this._dmgBase  = this._curDamage();
    }
    this._lastMD = md;
    if (this._dmgBase === undefined) this._dmgBase = this._curDamage();
    if (this._curDamage() <= this._dmgBase) {
      this._cleanRun = (this._cleanRun || 0) + amount;
    }
  },

  // Oyun içi ilerleme
  add(type, amount) {
    if (!amount) return;
    const s = this.state(); let changed = false;
    if (type === 'distance') this._trackClean(amount);
    else if (type === 'coins' || type === 'air') this._trackRun(type, amount);
    for (const m of s.list) {
      const d = this.def(m.id);
      if (!d || m.done) continue;
      let inc = 0, setTo = -1;
      if (d.type === type) {
        inc = amount;                                    // standart (wired) tip
      } else if (d.base === type) {
        // bağlamsal tipler — temel olay (base) bu tetiklemede geçince değerlendirilir
        if (d.type === 'map')      { if (this._curMap() === d.map) inc = amount; }
        else if (d.type === 'vehicle') { if (this._curVeh() === d.veh) inc = amount; }
        else if (d.type === 'delivery'){ if (this._curMode() === 'delivery') inc = amount; } // yalnız Teslimat modunda kat edilen mesafe
        else if (d.type === 'combo')   { setTo = this._curCombo(); }   // tek zıplama takla — en iyi
        else if (d.type === 'nodmg')   { setTo = this._cleanRun || 0; } // tek tur hasarsız — en iyi
        else if (d.type === 'coinrush'){ if (this._curMode() === 'coinrush') setTo = this._curCRCoins(); } // tek Coin Rush turu — en iyi
        else if (d.type === 'fueltrial')     { if (this._curMode() === 'fueltrial') setTo = this._curRunDist(); } // tek Yakıt Denemesi turu — en iyi mesafe
        else if (d.type === 'checkpoint')    { if (this._curMode() === 'checkpoint') setTo = this._curCPHit(); }  // tek Checkpoint turu — en çok kontrol noktası
        else if (d.type === 'checkpointdist'){ if (this._curMode() === 'checkpoint') setTo = this._curRunDist(); } // tek Checkpoint turu — en iyi mesafe
        else if (d.type === 'coinrun')  { setTo = this._curCoinRun(); }  // tek turda toplanan altın — en iyi
        else if (d.type === 'airrun')   { setTo = this._curAirRun(); }   // tek turda havada kalma — en iyi
        else if (d.type === 'perfland') { setTo = this._curPerfLand(); } // tek turda peş peşe kusursuz iniş — en iyi
      }
      if (setTo >= 0) {
        if (setTo > m.prog) { m.prog = setTo; changed = true; }
      } else if (inc > 0) {
        m.prog += inc; changed = true;
      }
      if (m.prog >= d.goal && !m.done) {
        m.prog = d.goal; m.done = true; changed = true;
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('✓ Görev tamam: ' + d.text);
        if (typeof Audio !== 'undefined' && Audio.playCoin) Audio.playCoin();
      }
    }
    if (changed && typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('missions', s);
  },

  // Gün serisi ödül bonusu (küçük): seri uzadıkça ödüle %3'lük basamaklar ekler
  _streakBonus(reward, streak) {
    const st = (typeof streak === 'number') ? streak : ((this.state().streak) || 1);
    const steps = Math.max(0, Math.min(st - 1, 10));
    return Math.round(reward * 0.03 * steps);
  },

  claim(id) {
    const s = this.state();
    let m = null; for (const x of s.list) if (x.id === id) m = x;
    const d = this.def(id);
    if (m && d && m.done && !m.claimed) {
      m.claimed = true;
      if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set('missions', s);
      const total = d.reward + this._streakBonus(d.reward, s.streak);
      if (typeof SaveData !== 'undefined' && SaveData.addGold) SaveData.addGold(total);
      return total;
    }
    return 0;
  },

  claimAll() {
    let total = 0;
    for (const m of this.state().list) total += this.claim(m.id);
    return total;
  }
};
